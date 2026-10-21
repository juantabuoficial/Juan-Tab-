import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  setLogLevel,
  type Firestore,
} from "firebase/firestore";
import {
  createWorkspaceTransport,
  ensureSystemNotifications,
  listenWorkspace,
} from "../../src/services/workspaceFirestore";
import { type Workspace, type Row } from "../../src/services/workspaceModel";
import type { User, UserRole } from "../../src/types";
setLogLevel("silent");
let env: RulesTestEnvironment;
const projectId = "demo-planifica";
const roles: UserRole[] = [
  "administrador",
  "jefe_servicio",
  "tecnico",
  "administrativo",
  "auditor",
  "consulta",
];
const profile = (
  id: string,
  rol: UserRole = "administrador",
  activo = true,
): User => ({
  id,
  nombre: id,
  apellidos: "Prueba",
  email: `${id}@example.test`,
  rol,
  activo,
  departamento: "Pruebas",
  cargo: "Personal",
  biometriaHabilitada: false,
  dosFactoresHabilitado: false,
});
const plan = (id = "p1") => ({
  id,
  codigo: "P-2026",
  nombre: "Plan compartido",
  ejercicio: 2026,
  presupuestoTotal: 100,
  activo: true,
  fechaCreacion: "2026-10-21T00:00:00Z",
  plazoEjecucionMaximo: "2026-12-31",
  plazoJustificacionMaximo: "2027-01-31",
  eellBeneficiarias: ["Cádiz"],
  actuacionesPrevistas: [],
});
const act = (id = "a1") => ({
  id,
  numero: "01",
  plan: "Plan compartido",
  entidadLocal: "Cádiz",
  titulo: "Actuación",
  plazos: { plazoEjecucion: "2026-12-31", plazoJustificacion: "2027-01-31" },
  importes: {
    importeActuacion: 100,
    importeConcesion: 100,
    importeAdjudicacion: 100,
  },
  documentos: [],
  liquidacion: {
    adjudicacion: 100,
    justificadoEnPlazo: 0,
    justificadoEnPlazoConDeficiencias: 0,
    justificadoFueraDePlazo: 0,
    justificadoFueraDePlazoConDeficiencias: 0,
    noJustificado: 0,
    observacionesLiquidacion: "",
  },
  estadoGeneral: "pendiente",
  tecnicoAsignadoId: "tecnico",
  tecnicoAsignadoNombre: "Persona",
  fechaCreacion: "2026-10-21T00:00:00Z",
  fechaModificacion: "2026-10-21T00:00:00Z",
});
const meta = (uid: string, revision = 1) => ({
  revisionSync: revision,
  actualizadoPorUid: uid,
  actualizadoEnServidor: serverTimestamp(),
});
const db = (uid?: string) =>
  (uid
    ? env.authenticatedContext(uid)
    : env.unauthenticatedContext()
  ).firestore() as unknown as Firestore;
const transport = (uid: string, d: Firestore) =>
  createWorkspaceTransport(d, { currentUser: { uid } as any }, uid);
const trusted = async (path: string, data: Row) =>
  env.withSecurityRulesDisabled(async (c) =>
    setDoc(doc(c.firestore() as unknown as Firestore, path), data),
  );
before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: "127.0.0.1",
      port: 8085,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});
beforeEach(async () => {
  await env.clearFirestore();
  for (const role of roles)
    await trusted(`usuarios/${role}`, profile(role, role));
  await trusted(
    "usuarios/desactivado",
    profile("desactivado", "tecnico", false),
  );
  await trusted("planes/p1", plan());
});
after(async () => {
  await env?.cleanup();
});

test("anónimos, perfiles ausentes y desactivados no pueden consultar planes ni crear su rol", async () => {
  for (const uid of [undefined, "sinperfil", "desactivado"]) {
    await assertFails(getDocs(collection(db(uid), "planes")));
    await assertFails(
      setDoc(doc(db(uid), "usuarios", uid || "anonimo"), {
        ...profile(uid || "anonimo"),
        ...meta(uid || "anonimo"),
      }),
    );
  }
});
test("matriz real de seis roles: lectura, alta, actualización y borrado de planes", async () => {
  for (const role of roles) {
    const d = db(role);
    await assertSucceeds(getDocs(collection(d, "planes")));
    const write = setDoc(doc(d, "planes", `new-${role}`), {
      ...plan(`new-${role}`),
      ...meta(role),
    });
    await (role === "administrador"
      ? assertSucceeds(write)
      : assertFails(write));
    const update = updateDoc(doc(d, "planes", "p1"), {
      nombre: `Editado ${role}`,
      ...meta(role, 1),
    });
    await (["administrador", "jefe_servicio"].includes(role)
      ? assertSucceeds(update)
      : assertFails(update));
    if (["administrador", "jefe_servicio"].includes(role))
      await trusted("planes/p1", plan());
    await trusted(`planes/delete-${role}`, plan(`delete-${role}`));
    const remove = deleteDoc(doc(d, "planes", `delete-${role}`));
    await (role === "administrador"
      ? assertSucceeds(remove)
      : assertFails(remove));
  }
});
test("validación tanto en alta como en actualización: tipos, valores, campos, identidad, revisión y tiempo", async () => {
  const d = db("administrador");
  for (const extra of [
    { presupuestoTotal: -1 },
    { presupuestoTotal: "100" },
    { nombre: 1 },
    { nombre: "x".repeat(501) },
    { extraInyectado: true },
    { revisionSync: 99 },
    { actualizadoPorUid: "otra-persona" },
    { actualizadoEnServidor: new Date("2020-01-01") },
  ]) {
    await assertFails(
      setDoc(doc(d, "planes", "bad"), {
        ...plan("bad"),
        ...meta("administrador"),
        ...extra,
      }),
    );
    await assertFails(
      updateDoc(doc(d, "planes", "p1"), { ...meta("administrador"), ...extra }),
    );
  }
  await assertFails(
    updateDoc(doc(d, "planes", "p1"), {
      fechaCreacion: "2030-01-01",
      ...meta("administrador"),
    }),
  );
  await assertFails(
    setDoc(doc(d, "planes", "other"), {
      ...plan("spoof"),
      ...meta("administrador"),
    }),
  );
});
test("solo administración gestiona perfiles; un técnico no lee datos personales ajenos ni se asciende", async () => {
  await assertFails(getDoc(doc(db("tecnico"), "usuarios", "administrador")));
  await assertFails(
    updateDoc(doc(db("tecnico"), "usuarios", "tecnico"), {
      rol: "administrador",
      ...meta("tecnico"),
    }),
  );
  await assertFails(getDocs(collection(db("consulta"), "usuarios")));
  await assertSucceeds(getDoc(doc(db("tecnico"), "usuarios", "tecnico")));
  const pub = {
    id: "tecnico",
    nombre: "Persona",
    apellidos: "Técnica",
    cargo: "Técnico",
    departamento: "Servicio",
    rol: "tecnico",
    activo: true,
    ...meta("administrador"),
  };
  await assertFails(
    setDoc(doc(db("administrador"), "directorioPersonal", "tecnico"), {
      ...pub,
      email: "privado@example.test",
    }),
  );
  await assertSucceeds(
    setDoc(doc(db("administrador"), "directorioPersonal", "tecnico"), pub),
  );
  await assertSucceeds(
    getDocs(collection(db("consulta"), "directorioPersonal")),
  );
});
test("la auditoría es inmutable y no permite suplantar autor ni escribir con un perfil desactivado", async () => {
  const d = db("tecnico");
  const event = {
    id: "e1",
    fechaHora: "2026-10-21",
    usuarioId: "tecnico",
    usuarioNombre: "tecnico Prueba",
    rol: "tecnico",
    actuacionId: "a1",
    documentoId: "d1",
    documentoTitulo: "Documento",
    accion: "acceso_pestana",
    ...meta("tecnico"),
  };
  await assertSucceeds(setDoc(doc(d, "auditoria", "e1"), event));
  await assertFails(
    updateDoc(doc(d, "auditoria", "e1"), {
      detalles: "Alterado",
      ...meta("tecnico", 2),
    }),
  );
  await assertFails(deleteDoc(doc(db("administrador"), "auditoria", "e1")));
  await assertFails(
    setDoc(doc(d, "auditoria", "e2"), {
      ...event,
      id: "e2",
      usuarioId: "administrador",
    }),
  );
  await assertFails(
    setDoc(doc(db("desactivado"), "auditoria", "e3"), {
      ...event,
      id: "e3",
      usuarioId: "desactivado",
      ...meta("desactivado"),
    }),
  );
});
test("dos usuarios reciben cambios confirmados y la reapertura conserva los datos", async () => {
  const d1 = db("administrador"),
    d2 = db("jefe_servicio");
  const user = profile("jefe_servicio", "jefe_servicio");
  const received: Workspace[] = [];
  const errors: Error[] = [];
  let resolve!: () => void;
  const ready = new Promise<void>((r) => (resolve = r));
  const close = listenWorkspace(
    d2,
    { currentUser: { uid: user.id } as any },
    user,
    (data, server) => {
      if (server) {
        received.push(data);
        if (data.planes.some((p) => p.nombre === "Actualizado")) resolve();
      }
    },
    (e) => {
      errors.push(e);
      resolve();
    },
  );
  try {
    const before = (await getDoc(doc(d1, "planes", "p1"))).data()!;
    await transport("administrador", d1).commit([
      {
        collection: "planes",
        id: "p1",
        before,
        after: { ...before, nombre: "Actualizado" },
      },
    ]);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        ready,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("No llegó el snapshot entre usuarios")),
            12000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
    assert.deepEqual(errors, []);
    assert.ok(
      received.some((w) => w.planes.some((p) => p.nombre === "Actualizado")),
    );
    const reopened = db("administrador");
    assert.equal(
      (await getDoc(doc(reopened, "planes", "p1"))).data()?.nombre,
      "Actualizado",
    );
  } finally {
    close();
  }
});
test("ediciones concurrentes del mismo registro: una gana y la otra informa conflicto", async () => {
  const d1 = db("administrador"),
    d2 = db("jefe_servicio");
  const original = plan();
  const results = await Promise.allSettled([
    transport("administrador", d1).commit([
      {
        collection: "planes",
        id: "p1",
        before: original,
        after: { ...original, nombre: "Uno" },
      },
    ]),
    transport("jefe_servicio", d2).commit([
      {
        collection: "planes",
        id: "p1",
        before: original,
        after: { ...original, nombre: "Dos" },
      },
    ]),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.match(
    (results.find((r) => r.status === "rejected") as PromiseRejectedResult)
      .reason.message,
    /Conflicto/,
  );
  assert.equal((await getDoc(doc(d1, "planes", "p1"))).data()?.revisionSync, 1);
});
test("plan, actuación y papelera se confirman de forma atómica y se restauran sin perder contenido", async () => {
  const d = db("administrador");
  await trusted("actuaciones/a1", act());
  const copy = {
    idCopia: "copy",
    fechaBorrado: "2026-10-21",
    fechaExpiracion: "2026-11-21",
    diasRetencion: 30,
    borradoPorUsuario: "Administrador",
    plan: plan(),
    actuacionesAsociadas: [act()],
  };
  const deleted = await transport("administrador", d).commit([
    { collection: "planes", id: "p1", before: plan(), after: null },
    { collection: "actuaciones", id: "a1", before: act(), after: null },
    { collection: "papeleraPlanes", id: "copy", before: null, after: copy },
  ]);
  assert.equal((await getDoc(doc(d, "planes", "p1"))).exists(), false);
  const saved = (await getDoc(doc(d, "papeleraPlanes", "copy"))).data()!;
  assert.deepEqual(saved.actuacionesAsociadas, [act()]);
  await transport("administrador", d).commit([
    { collection: "planes", id: "p1", before: null, after: copy.plan },
    {
      collection: "actuaciones",
      id: "a1",
      before: null,
      after: copy.actuacionesAsociadas[0],
    },
    { collection: "papeleraPlanes", id: "copy", before: saved, after: null },
  ]);
  assert.equal(
    (await getDoc(doc(d, "actuaciones", "a1"))).data()?.titulo,
    "Actuación",
  );
  assert.equal(deleted.length, 3);
});
test("si una escritura del grupo se deniega, no se confirma ninguna", async () => {
  const d = db("tecnico");
  await assert.rejects(
    transport("tecnico", d).commit([
      {
        collection: "actuaciones",
        id: "new-act",
        before: null,
        after: act("new-act"),
      },
      {
        collection: "planes",
        id: "new-plan",
        before: null,
        after: plan("new-plan"),
      },
    ]),
  );
  assert.equal(
    (await getDoc(doc(d, "actuaciones", "new-act"))).exists(),
    false,
  );
});
test("preferencias propias persisten; otro usuario no puede leerlas ni cambiarlas", async () => {
  const d = db("tecnico");
  const settings = {
    id: "tecnico",
    notificacionesPush: false,
    recordatoriosEmailDiarios: false,
    alertasVencimientoDias: 30,
    sincronizacionNubeAutomatica: true,
    cifradoExtremoAExtremo: false,
    modoOscuro: "light",
    autenticacionBiometrica: false,
    autenticacion2FA: false,
  };
  await transport("tecnico", d).commit([
    {
      collection: "configuracionesUsuario",
      id: "tecnico",
      before: null,
      after: settings,
    },
  ]);
  await assertFails(
    getDoc(doc(db("consulta"), "configuracionesUsuario", "tecnico")),
  );
  await assertFails(
    updateDoc(doc(db("consulta"), "configuracionesUsuario", "tecnico"), {
      modoOscuro: "dark",
      ...meta("consulta", 2),
    }),
  );
  await assertSucceeds(
    getDocs(
      query(
        collection(d, "configuracionesUsuario"),
        where("__name__", "==", "tecnico"),
      ),
    ),
  );
});

test("avisos idempotentes: dos usuarios no duplican ni reinician un aviso existente", async () => {
  const note = { id: "vence-a1", titulo: "Próximo vencimiento", mensaje: "Revisar actuación", tipo: "vencimiento", fechaHora: "2026-10-21T00:00:00Z", leida: false, actuacionId: "a1" };
  const first = await ensureSystemNotifications(db("tecnico"), { currentUser: { uid: "tecnico" } as any }, "tecnico", [note]);
  assert.equal(first.length, 1);
  const before = (await getDoc(doc(db("administrador"), "notificaciones", note.id))).data();
  const second = await ensureSystemNotifications(db("administrador"), { currentUser: { uid: "administrador" } as any }, "administrador", [{ ...note, mensaje: "No sustituir el original" }]);
  assert.equal(second.length, 0);
  assert.deepEqual((await getDoc(doc(db("tecnico"), "notificaciones", note.id))).data(), before);
  await assert.rejects(ensureSystemNotifications(db("consulta"), { currentUser: { uid: "consulta" } as any }, "consulta", [note]));
});

test("el estado de lectura ajeno no puede alterarse en un aviso compartido", async () => {
  const note = { id: "aviso-inmutable", titulo: "Aviso", mensaje: "Contenido compartido", tipo: "info", fechaHora: "2026-10-21T00:00:00Z", leida: false };
  await ensureSystemNotifications(db("administrador"), { currentUser: { uid: "administrador" } as any }, "administrador", [note]);
  for (const uid of roles) {
    await assertFails(updateDoc(doc(db(uid), "notificaciones", note.id), { leida: true, ...meta(uid, 2) }));
  }
  assert.equal((await getDoc(doc(db("administrador"), "notificaciones", note.id))).data()?.leida, false);
});
