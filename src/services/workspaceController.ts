import type { UserRole } from "../types";
import {
  type Workspace,
  type CollectionName,
  type Row,
  type Change,
  emptyWorkspace,
  diffRows,
  overlay,
  changeKey,
  canChange,
  equalRows,
  rowId,
  collectionNames,
} from "./workspaceModel";

export type SyncState =
  "cargando" | "sincronizado" | "guardando" | "offline" | "error";
export interface WorkspaceView {
  data: Workspace;
  state: SyncState;
  error: string;
  pending: number;
  ready: boolean;
}
export interface WorkspaceTransport {
  commit(changes: Change[]): Promise<Change[]>;
}
export interface DraftStorage {
  read(): Change[];
  write(changes: Change[]): void;
  backup?(): void;
}

/** Cola por identidad. Las lecturas remotas nunca borran una edición pendiente. */
export class WorkspaceController {
  private base = emptyWorkspace();
  private deferred: Workspace | null = null;
  private pending = new Map<string, Change>();
  private inFlight: Change[] = [];
  private listeners = new Set<() => void>();
  private stopped = false;
  private flushing = false;
  private scheduled = false;
  private groupDepth = 0;
  private eventBase: Map<string, Change> | null = null;
  private state: SyncState = "cargando";
  private error = "";
  private ready = false;
  private corruptDraft = false;
  private view: WorkspaceView = {
    data: this.base,
    state: this.state,
    error: "",
    pending: 0,
    ready: false,
  };
  constructor(
    private uid: string,
    private role: UserRole,
    private transport: WorkspaceTransport,
    private storage: DraftStorage,
  ) {
    // Se revisan al recibir una lectura del servidor; nunca se atribuyen a otra cuenta.
    try {
      for (const c of storage.read()) {
        if (
          !c ||
          !collectionNames.includes(c.collection) ||
          typeof c.id !== "string" ||
          !("before" in c) ||
          !("after" in c) ||
          [c.before, c.after].some(
            (row) =>
              row !== null &&
              (typeof row !== "object" ||
                Array.isArray(row) ||
                rowId(c.collection, row) !== c.id),
          )
        )
          throw new Error(
            "Borrador pendiente no válido. Conserva una copia antes de recargar.",
          );
        this.pending.set(changeKey(c), c);
      }
    } catch (error) {
      this.pending.clear();
      this.corruptDraft = true;
      this.error = error instanceof Error ? error.message : String(error);
      this.state = "error";
    }
    this.publish();
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.view;
  private changes() {
    return [...this.inFlight, ...this.pending.values()];
  }
  private publish() {
    this.view = {
      data: overlay(this.base, this.changes()),
      state: this.state,
      error: this.error,
      pending: this.changes().length,
      ready: this.ready,
    };
    for (const l of this.listeners) l();
  }
  private checkpoint(changes = this.changes()) {
    this.storage.write(changes);
  }
  receive(data: Workspace, fromServer: boolean) {
    if (this.stopped) return;
    // Durante una escritura se conserva una base coherente hasta confirmar la transacción.
    if (this.flushing) {
      this.deferred = data;
      return;
    }
    this.base = data;
    if (fromServer) {
      this.ready = true;
      if (!this.error)
        this.state = this.pending.size ? "guardando" : "sincronizado";
    } else if (!this.error) this.state = "offline";
    this.publish();
    if (fromServer && !this.error) this.schedule();
  }
  update<C extends CollectionName>(
    collection: C,
    action: Workspace[C] | ((prev: Workspace[C]) => Workspace[C]),
  ) {
    if (this.stopped || !this.ready)
      throw new Error(
        "Espera a que termine la lectura del servidor antes de editar.",
      );
    if (this.error)
      throw new Error(
        "Hay cambios pendientes con error. Reintenta o conserva una copia y recarga.",
      );
    const prev = this.view.data[collection];
    const next = typeof action === "function" ? action(prev) : action;
    const changes = diffRows(collection, prev as Row[], next as Row[]);
    if (!changes.length) return;
    if (!this.eventBase) this.eventBase = new Map(this.pending);
    if (changes.some((c) => !canChange(c, this.uid, this.role)))
      throw new Error("Tu perfil no tiene permisos para esta operación.");
    const pending = new Map(this.pending);
    for (const c of changes) {
      const key = changeKey(c),
        prior = pending.get(key);
      const merged = { ...c, before: prior ? prior.before : c.before };
      if (equalRows(merged.before, merged.after)) pending.delete(key);
      else pending.set(key, merged);
    }
    // El borrador debe estar protegido antes de reconocerlo en la interfaz.
    this.checkpoint([...this.inFlight, ...pending.values()]);
    this.pending = pending;
    if (changes.length) this.state = "guardando";
    this.publish();
    this.schedule();
  }
  fail(error: unknown) {
    if (this.stopped) return;
    this.error = error instanceof Error ? error.message : String(error);
    this.state = "error";
    this.publish();
  }
  action<T>(fn: () => T): T {
    const before = new Map(this.pending);
    this.groupDepth++;
    try {
      return fn();
    } catch (error) {
      this.pending = this.eventBase ?? before;
      this.eventBase = null;
      try {
        this.checkpoint();
      } catch {}
      this.fail(error);
      throw error;
    } finally {
      this.groupDepth--;
      this.schedule();
    }
  }
  private schedule() {
    if (
      this.groupDepth ||
      this.scheduled ||
      this.flushing ||
      this.stopped ||
      !this.ready ||
      this.error ||
      !this.pending.size
    )
      return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      this.eventBase = null;
      void this.flush();
    });
  }
  async flush(): Promise<void> {
    if (
      this.flushing ||
      this.stopped ||
      !this.ready ||
      this.error ||
      !this.pending.size
    )
      return;
    this.flushing = true;
    this.inFlight = [...this.pending.values()];
    this.pending.clear();
    const batch = this.inFlight;
    this.state = "guardando";
    this.publish();
    try {
      const committed = await this.transport.commit(batch);
      if (this.stopped) return;
      const latestBase = this.deferred ?? this.base;
      const stamp = (row: Row | null) => {
        const value = row?.actualizadoEnServidor;
        return value?.seconds !== undefined
          ? value.seconds * 1000 + (value.nanoseconds ?? 0) / 1e6
          : 0;
      };
      const authoritative = committed.map((c) => {
        let after = "latest" in c ? c.latest! : c.after;
        const remote =
          (latestBase[c.collection] as Row[]).find(
            (r) => rowId(c.collection, r) === c.id,
          ) ?? null;
        if (this.deferred && remote) {
          const newer = after
            ? stamp(remote) > stamp(after) ||
              (stamp(remote) === stamp(after) &&
                (remote.revisionSync ?? 0) > (after.revisionSync ?? 0))
            : stamp(remote) > stamp(c.before) ||
              (remote.revisionSync ?? 0) > (c.before?.revisionSync ?? 0);
          if (newer) after = remote;
        }
        return { ...c, after };
      });
      this.base = overlay(latestBase, authoritative);
      this.deferred = null;
      // Una edición nueva en el mismo registro parte de nuestra versión confirmada.
      for (const c of committed) {
        const key = changeKey(c),
          p = this.pending.get(key);
        if (p && equalRows(p.before, c.after))
          this.pending.set(key, { ...p, before: c.after });
      }
      this.inFlight = [];
      this.checkpoint();
      this.state = this.pending.size ? "guardando" : "sincronizado";
    } catch (error) {
      if (this.stopped) return;
      for (const c of batch) {
        const key = changeKey(c),
          p = this.pending.get(key);
        this.pending.set(key, p ? { ...p, before: c.before } : c);
      }
      this.inFlight = [];
      if (this.deferred) {
        this.base = this.deferred;
        this.deferred = null;
      }
      try {
        this.checkpoint();
      } catch {}
      this.error = error instanceof Error ? error.message : String(error);
      this.state = "error";
    } finally {
      this.flushing = false;
      if (!this.stopped) {
        this.publish();
        this.schedule();
      }
    }
  }
  retry() {
    if (this.stopped || this.corruptDraft) return;
    this.error = "";
    this.state = this.pending.size
      ? "guardando"
      : this.ready
        ? "sincronizado"
        : "cargando";
    this.publish();
    this.schedule();
  }
  /** El llamante debe exportar antes la copia de this.view.data. */
  discard() {
    if (this.flushing) throw new Error("Espera a que termine el envío actual.");
    this.storage.backup?.();
    this.storage.write([]);
    this.pending.clear();
    this.corruptDraft = false;
    this.error = "";
    this.state = this.ready ? "sincronizado" : "cargando";
    this.publish();
  }
  activate() {
    if (this.stopped && this.error === "La sesión se ha cerrado.")
      this.error = "";
    this.stopped = false;
  }
  waitForSettled(): Promise<void> {
    if (this.stopped)
      return Promise.reject(new Error("La sesión se ha cerrado."));
    if (this.error) return Promise.reject(new Error(this.error));
    if (this.ready && !this.pending.size && !this.flushing)
      return Promise.resolve();
    return new Promise((resolve, reject) => {
      const close = this.subscribe(() => {
        if (this.stopped || this.error) {
          close();
          reject(new Error(this.error || "La sesión se ha cerrado."));
        } else if (this.ready && !this.pending.size && !this.flushing) {
          close();
          resolve();
        }
      });
    });
  }
  stop() {
    this.stopped = true;
    this.error = "La sesión se ha cerrado.";
    this.publish();
  }
}
