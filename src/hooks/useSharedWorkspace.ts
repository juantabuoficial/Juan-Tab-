import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { User } from "../types";
import { FIRESTORE_DATABASE_ID } from "../services/firebasePublicConfig";
import { inicializarFirebase } from "../services/firebaseConfig";
import {
  WorkspaceController,
  type DraftStorage,
} from "../services/workspaceController";
import {
  createWorkspaceTransport,
  listenWorkspace,
} from "../services/workspaceFirestore";
import {
  type Change,
  type CollectionName,
  type Workspace,
  emptyWorkspace,
} from "../services/workspaceModel";

const loggedOut = {
  data: emptyWorkspace(),
  state: "offline" as const,
  error: "",
  pending: 0,
  ready: false,
};
function draftStorage(scope: string): DraftStorage {
  return {
    read() {
      const raw = localStorage.getItem(scope);
      if (!raw) return [];
      const changes = JSON.parse(raw);
      if (!Array.isArray(changes))
        throw new Error(
          "El borrador pendiente no es válido. Conserva una copia antes de continuar.",
        );
      return changes as Change[];
    },
    backup() {
      const raw = localStorage.getItem(scope);
      if (raw !== null)
        localStorage.setItem(`${scope}:respaldo:${Date.now()}`, raw);
    },
    write(changes) {
      // Mantener un checkpoint propio; nunca reescribir las claves heredadas.
      localStorage.setItem(scope, JSON.stringify(changes));
    },
  };
}
export function useSharedWorkspace(
  user: User | null,
  runtime?: ReturnType<typeof inicializarFirebase>,
) {
  const controller = useMemo(() => {
    if (!user) return null;
    const { db, auth, status } = runtime ?? inicializarFirebase();
    if (!db || !auth) return null;
    const scope = `planifica_pending_v3:${status.projectId}:${FIRESTORE_DATABASE_ID}:${user.id}`;
    return new WorkspaceController(
      user.id,
      user.rol,
      createWorkspaceTransport(db, auth, user.id),
      draftStorage(scope),
    );
  }, [user?.id, user?.rol, runtime?.db, runtime?.auth]);
  useEffect(() => {
    if (!user || !controller) return;
    const { db, auth } = runtime ?? inicializarFirebase();
    if (!db || !auth) return;
    controller.activate();
    const close = listenWorkspace(
      db,
      auth,
      user,
      (data, server) => controller.receive(data, server),
      (error) => controller.fail(error),
    );
    const online = () => controller.retry();
    window.addEventListener("online", online);
    return () => {
      close();
      controller.stop();
      window.removeEventListener("online", online);
    };
  }, [controller]);
  const view = useSyncExternalStore(
    controller?.subscribe ?? (() => () => {}),
    controller?.getSnapshot ?? (() => loggedOut),
  );
  const set =
    <C extends CollectionName>(c: C) =>
    (action: Workspace[C] | ((prev: Workspace[C]) => Workspace[C])) => {
      if (!controller) throw new Error("No hay sesión autorizada.");
      controller.update(c, action);
    };
  const protect = <T extends (...args: any[]) => any>(fn: T): T =>
    ((...args: Parameters<T>) => {
      if (!controller) throw new Error("No hay sesión autorizada.");
      return controller.action(() => fn(...args));
    }) as T;
  return {
    ...view,
    set,
    protect,
    retry: () => controller?.retry(),
    discard: () => {
      try {
        controller?.discard();
      } catch (error) {
        controller?.fail(error);
      }
    },
    wait: () =>
      controller
        ? controller.waitForSettled()
        : Promise.reject(new Error("No hay sesión autorizada.")),
  };
}
