import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WorkspaceController,
  type DraftStorage,
} from "../src/services/workspaceController";
import {
  type Change,
  emptyWorkspace,
  type Workspace,
} from "../src/services/workspaceModel";
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
function storage() {
  let saved: Change[] = [];
  return {
    read: () => structuredClone(saved),
    write: (v: Change[]) => {
      saved = structuredClone(v);
    },
    peek: () => saved,
  };
}
const plan = (nombre = "Original") =>
  ({ id: "p1", nombre }) as Workspace["planes"][number];

test("no confirma sincronización al iniciar y rechaza edición antes de leer el servidor", () => {
  const c = new WorkspaceController(
    "a",
    "administrador",
    { commit: async (v) => v },
    storage(),
  );
  assert.equal(c.getSnapshot().ready, false);
  assert.throws(() => c.update("planes", [plan()]));
  c.receive(emptyWorkspace(), false);
  assert.equal(c.getSnapshot().state, "offline");
});
test("agrupa cambios del plan, actuación y papelera en un solo envío; confirma después del servidor", async () => {
  const st = storage();
  let finish!: (v: Change[]) => void;
  let batch: Change[] = [];
  const c = new WorkspaceController(
    "a",
    "administrador",
    {
      commit: async (v) => {
        batch = v;
        return new Promise((r) => (finish = r));
      },
    },
    st,
  );
  const initial = emptyWorkspace();
  initial.planes = [plan()];
  c.receive(initial, true);
  c.action(() => {
    c.update("planes", []);
    c.update("papeleraPlanes", [{ idCopia: "backup", plan: plan() } as any]);
  });
  assert.equal(c.getSnapshot().state, "guardando");
  assert.equal(st.peek().length, 2);
  await tick();
  assert.equal(batch.length, 2);
  finish(batch);
  await tick();
  assert.equal(c.getSnapshot().state, "sincronizado");
  assert.equal(st.peek().length, 0);
});
test("un conflicto conserva el borrador y los cambios remotos en otros registros", async () => {
  const st = storage();
  const c = new WorkspaceController(
    "a",
    "administrador",
    {
      commit: async () => {
        throw new Error("Conflicto");
      },
    },
    st,
  );
  const initial = emptyWorkspace();
  initial.planes = [plan()];
  c.receive(initial, true);
  c.update("planes", [plan("Mi edición")]);
  await tick();
  assert.equal(c.getSnapshot().state, "error");
  assert.equal(st.peek().length, 1);
  const remote = emptyWorkspace();
  remote.planes = [
    plan("Otra edición"),
    { id: "p2", nombre: "Otro plan" } as any,
  ];
  c.receive(remote, true);
  assert.equal(
    c.getSnapshot().data.planes.find((p) => p.id === "p1")?.nombre,
    "Mi edición",
  );
  assert.equal(c.getSnapshot().data.planes.length, 2);
});
test("si falla la copia durable no se acepta ni envía una edición", async () => {
  let commits = 0;
  const bad: DraftStorage = {
    read: () => [],
    write: () => {
      throw new Error("QuotaExceededError");
    },
  };
  const c = new WorkspaceController(
    "a",
    "administrador",
    {
      commit: async (v) => {
        commits++;
        return v;
      },
    },
    bad,
  );
  c.receive(emptyWorkspace(), true);
  assert.throws(() => c.update("planes", [plan()]));
  await tick();
  assert.equal(c.getSnapshot().data.planes.length, 0);
  assert.equal(commits, 0);
});
test("una operación con permisos insuficientes revierte todos sus cambios locales", async () => {
  let commits = 0;
  const c = new WorkspaceController(
    "a",
    "tecnico",
    {
      commit: async (v) => {
        commits++;
        return v;
      },
    },
    storage(),
  );
  const initial = emptyWorkspace();
  initial.actuaciones = [{ id: "act", titulo: "Original" } as any];
  c.receive(initial, true);
  assert.throws(() =>
    c.action(() => {
      c.update("actuaciones", [{ id: "act", titulo: "Cambio" } as any]);
      c.update("planes", [plan()]);
    }),
  );
  await tick();
  assert.equal(commits, 0);
  assert.equal(c.getSnapshot().data.actuaciones[0].titulo, "Original");
});
test("una edición durante el envío conserva su orden y parte de la versión propia confirmada", async () => {
  const seen: Change[][] = [];
  let finish!: (v: Change[]) => void;
  const c = new WorkspaceController(
    "a",
    "administrador",
    {
      commit: async (v) => {
        seen.push(v);
        if (seen.length === 1) return new Promise((r) => (finish = r));
        return v;
      },
    },
    storage(),
  );
  const initial = emptyWorkspace();
  initial.planes = [plan()];
  c.receive(initial, true);
  c.update("planes", [plan("Uno")]);
  await tick();
  c.update("planes", [plan("Dos")]);
  finish(
    seen[0].map((v) => ({ ...v, after: { ...v.after, revisionSync: 1 } })),
  );
  await tick();
  await tick();
  assert.equal(seen.length, 2);
  assert.equal(seen[1][0].before?.revisionSync, 1);
  assert.equal(c.getSnapshot().data.planes[0].nombre, "Dos");
  assert.equal(c.getSnapshot().state, "sincronizado");
});
test("un borrador se recupera en la misma identidad y no se descarta al recibir una base vacía", async () => {
  const st = storage();
  st.write([
    { collection: "planes", id: "p1", before: null, after: plan("Pendiente") },
  ]);
  const c = new WorkspaceController(
    "a",
    "administrador",
    {
      commit: async () => {
        throw new Error("Sin red");
      },
    },
    st,
  );
  c.receive(emptyWorkspace(), true);
  await tick();
  assert.equal(c.getSnapshot().data.planes[0].nombre, "Pendiente");
  c.stop();
  c.receive(emptyWorkspace(), true);
  assert.equal(c.getSnapshot().state, "error");
});
test("los callbacks tardíos no restauran una sesión cerrada y StrictMode puede reactivar la escucha", async () => {
  let finish!: (v: Change[]) => void;
  const c = new WorkspaceController(
    "a",
    "administrador",
    { commit: async () => new Promise((r) => (finish = r)) },
    storage(),
  );
  c.receive(emptyWorkspace(), true);
  c.update("planes", [plan()]);
  await tick();
  c.stop();
  finish([]);
  await tick();
  assert.equal(c.getSnapshot().error, "La sesión se ha cerrado.");
  const other = new WorkspaceController(
    "a",
    "consulta",
    { commit: async (v) => v },
    storage(),
  );
  other.stop();
  other.activate();
  other.receive(emptyWorkspace(), true);
  assert.equal(other.getSnapshot().state, "sincronizado");
});

test("una versión remota posterior recibida durante el envío prevalece sobre nuestra confirmación anterior", async () => {
  let finish!: (v: Change[]) => void;
  const c = new WorkspaceController(
    "a",
    "administrador",
    { commit: async () => new Promise((r) => (finish = r)) },
    storage(),
  );
  const initial = emptyWorkspace();
  initial.planes = [plan()];
  c.receive(initial, true);
  c.update("planes", [plan("Mi edición")]);
  await tick();
  const later = emptyWorkspace();
  later.planes = [
    { ...plan("Edición posterior de otra persona"), revisionSync: 2 } as any,
  ];
  c.receive(later, true);
  finish([
    {
      collection: "planes",
      id: "p1",
      before: plan(),
      after: { ...plan("Mi edición"), revisionSync: 1 },
    },
  ]);
  await tick();
  assert.equal(
    c.getSnapshot().data.planes[0].nombre,
    "Edición posterior de otra persona",
  );
});
test("la conciliación posterior al commit conserva una restauración de otro usuario", async () => {
  const c = new WorkspaceController(
    "a",
    "administrador",
    {
      commit: async (changes) =>
        changes.map((change) => ({
          ...change,
          latest: { ...plan("Restaurado por otra persona"), revisionSync: 1 },
        })),
    },
    storage(),
  );
  const initial = emptyWorkspace();
  initial.planes = [plan()];
  c.receive(initial, true);
  c.update("planes", []);
  await tick();
  assert.equal(
    c.getSnapshot().data.planes[0].nombre,
    "Restaurado por otra persona",
  );
});

test("un checkpoint corrupto no se reintenta ni se borra sin conservar el contenido original", async () => {
  let sends = 0,
    backups = 0;
  let raw = "corrupto";
  const c = new WorkspaceController(
    "a",
    "administrador",
    {
      commit: async (v) => {
        sends++;
        return v;
      },
    },
    {
      read() {
        throw new Error("Borrador corrupto");
      },
      backup() {
        backups++;
      },
      write() {
        raw = "[]";
      },
    },
  );
  c.receive(emptyWorkspace(), true);
  c.retry();
  await tick();
  assert.equal(c.getSnapshot().state, "error");
  assert.equal(raw, "corrupto");
  assert.equal(sends, 0);
  c.discard();
  assert.equal(backups, 1);
  assert.equal(raw, "[]");
});
