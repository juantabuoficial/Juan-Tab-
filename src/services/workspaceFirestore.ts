import {
  collection,
  doc,
  getDocFromServer,
  onSnapshot,
  or,
  query,
  runTransaction,
  serverTimestamp,
  where,
  documentId,
  type Query,
  type DocumentData,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import type { Auth } from "firebase/auth";
import type { User } from "../types";
import {
  type Workspace,
  type CollectionName,
  type Change,
  type Row,
  collectionNames,
  emptyWorkspace,
  businessData,
  equalRows,
  rowId,
  clean,
} from "./workspaceModel";
import type { WorkspaceTransport } from "./workspaceController";

function withId(c: CollectionName, id: string, data: Row): Row {
  return { ...data, [c === "papeleraPlanes" ? "idCopia" : "id"]: id };
}

export function createWorkspaceTransport(
  db: Firestore,
  auth: Pick<Auth, "currentUser">,
  uid: string,
): WorkspaceTransport {
  return {
    async commit(changes: Change[]) {
      if (auth.currentUser?.uid !== uid)
        throw new Error("La sesión ha cambiado. Vuelve a acceder.");
      if (changes.length > 400)
        throw new Error(
          "La operación afecta a más de 400 registros. Divide la importación antes de guardar.",
        );
      const unique = new Set(changes.map((c) => `${c.collection}/${c.id}`));
      if (unique.size !== changes.length)
        throw new Error("Operación duplicada en el envío.");
      try {
        const committed = await runTransaction(db, async (tx) => {
          if (auth.currentUser?.uid !== uid)
            throw new Error("Sesión cerrada durante el guardado.");
          const profile = await tx.get(doc(db, "usuarios", uid));
          if (!profile.exists() || profile.data().activo !== true)
            throw new Error("Tu perfil está desactivado.");
          const refs = changes.map((c) => {
            if (
              !collectionNames.includes(c.collection) ||
              !/^[A-Za-z0-9_-]{1,128}$/.test(c.id)
            )
              throw new Error("Ruta no válida.");
            if (c.after && rowId(c.collection, c.after) !== c.id)
              throw new Error("Identidad de registro no válida.");
            return doc(db, c.collection, c.id);
          });
          // Leer todos los registros antes de escribir: borrado + papelera son una transacción.
          const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
          const result: Change[] = [];
          for (let i = 0; i < changes.length; i++) {
            const c = changes[i],
              snap = snapshots[i];
            const current = snap.exists()
              ? withId(c.collection, c.id, snap.data())
              : null;
            if (
              !equalRows(current, c.before) ||
              (current?.revisionSync ?? 0) !== (c.before?.revisionSync ?? 0)
            ) {
              throw new Error(
                `Conflicto en ${c.collection}/${c.id}: otro usuario modificó el registro. Conserva tu copia y recarga antes de conciliar.`,
              );
            }
            if (!c.after) {
              tx.delete(refs[i]);
              result.push({ ...c, after: null });
              continue;
            }
            const data = clean({
              ...businessData(c.after),
              revisionSync: (current?.revisionSync ?? 0) + 1,
              actualizadoPorUid: uid,
            });
            tx.set(refs[i], {
              ...data,
              actualizadoEnServidor: serverTimestamp(),
            });
            result.push({ ...c, after: data });
          }
          return result;
        });
        // Confirmar únicamente las rutas afectadas, sin recargar colecciones enteras.
        // Una segunda escritura puede llegar entre nuestro commit y su respuesta.
        try {
          const latest = await Promise.all(
            committed.map((c) => getDocFromServer(doc(db, c.collection, c.id))),
          );
          return committed.map((c, i) => ({
            ...c,
            latest: latest[i].exists()
              ? withId(c.collection, c.id, latest[i].data()!)
              : null,
          }));
        } catch {
          // La transacción ya está confirmada. Las escuchas conciliaran la vista;
          // un fallo de esta lectura no convierte el commit en un nuevo envío.
          return committed;
        }
      } catch (error) {
        // Las reglas de revisión pueden rechazar una carrera como permission-denied
        // antes del reintento del SDK. Comprobar el estado actual sin ocultar una
        // revocación real de permisos ni atribuir guardados sin confirmación.
        if (
          (error as any)?.code === "permission-denied" &&
          auth.currentUser?.uid === uid
        ) {
          let conflict = false;
          try {
            const snapshots = await Promise.all(
              changes.map((c) => getDocFromServer(doc(db, c.collection, c.id))),
            );
            conflict = snapshots.some((snap, i) => {
              const c = changes[i];
              const current = snap.exists()
                ? withId(c.collection, c.id, snap.data())
                : null;
              return (
                !equalRows(current, c.before) ||
                (current?.revisionSync ?? 0) !== (c.before?.revisionSync ?? 0)
              );
            });
          } catch {
            /* Un error de acceso real conserva su significado. */
          }
          if (conflict)
            throw new Error(
              "Conflicto de versión: otro usuario modificó el registro. Conserva tu copia y recarga antes de conciliar.",
            );
        }
        throw error;
      }
    },
  };
}

/** Consultas estándar por el requisito explícito de sincronización en tiempo real. */
export function listenWorkspace(
  db: Firestore,
  auth: Pick<Auth, "currentUser">,
  user: User,
  onData: (data: Workspace, fromServer: boolean) => void,
  onError: (e: Error) => void,
): () => void {
  const data = emptyWorkspace();
  const server = new Map<CollectionName, boolean>();
  const unsubscribes: Unsubscribe[] = [];
  let closed = false;
  const manager = user.rol === "administrador" || user.rol === "jefe_servicio";
  const allowed = collectionNames.filter(
    (c) => c !== "papeleraPlanes" || user.rol === "administrador",
  );
  const fail = (error: Error) => {
    if (!closed) onError(error);
  };
  for (const c of allowed) {
    let source: Query<DocumentData> = collection(db, c);
    if (c === "usuarios" && user.rol !== "administrador")
      source = query(source, where(documentId(), "==", user.id));
    if (c === "configuracionesUsuario")
      source = query(source, where(documentId(), "==", user.id));
    if (c === "comentarios" && !manager)
      source = query(
        source,
        or(
          where("autorId", "==", user.id),
          where("destinatarioId", "==", user.id),
        ),
      );
    if ((c === "auditoria" || c === "registrosAuditoria") && !manager && user.rol !== "auditor")
      source = query(source, where("usuarioId", "==", user.id));
    const off = onSnapshot(
      source,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (closed) return;
        if (auth.currentUser?.uid !== user.id) {
          fail(new Error("La identidad ha cambiado."));
          return;
        }
        if (snapshot.metadata.hasPendingWrites) return;
        (data[c] as Row[]) = snapshot.docs.map((d) =>
          withId(c, d.id, d.data() as Row),
        );
        server.set(c, !snapshot.metadata.fromCache);
        if (server.size === allowed.length)
          onData({ ...data }, [...server.values()].every(Boolean));
      },
      fail,
    );
    unsubscribes.push(off);
  }
  return () => {
    closed = true;
    unsubscribes.forEach((off) => off());
  };
}

export async function checkServerAccess(db: Firestore, uid: string) {
  const p = await getDocFromServer(doc(db, "usuarios", uid));
  if (!p.exists() || p.data().activo !== true)
    throw new Error("El perfil no está autorizado.");
}

/** Avisos deterministas: dos supervisores no duplican ni reinician una alerta leída. */
export async function ensureSystemNotifications(db: Firestore, auth: Pick<Auth, 'currentUser'>, uid: string, notes: Row[]): Promise<Row[]> {
  if (auth.currentUser?.uid !== uid) throw new Error('La sesión ha cambiado.');
  const pending = notes.slice(0, 50);
  return runTransaction(db, async tx => {
    const actor = await tx.get(doc(db, 'usuarios', uid));
    if (!actor.exists() || actor.data().activo !== true || !['administrador', 'jefe_servicio', 'tecnico', 'administrativo'].includes(actor.data().rol)) throw new Error('El perfil no puede generar avisos.');
    const refs = pending.map(row => doc(db, 'notificaciones', rowId('notificaciones', row)));
    const snapshots = await Promise.all(refs.map(ref => tx.get(ref)));
    const created: Row[] = [];
    pending.forEach((row, i) => {
      if (snapshots[i].exists()) return;
      tx.set(refs[i], { ...clean(row), revisionSync: 1, actualizadoPorUid: uid, actualizadoEnServidor: serverTimestamp() });
      created.push(row);
    });
    return created;
  });
}
