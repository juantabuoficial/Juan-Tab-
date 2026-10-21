import React from "react";
import { create, act } from "react-test-renderer";
import { test } from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, doc, getDocFromServer, disableNetwork, enableNetwork, setLogLevel } from "firebase/firestore";
import { AppProvider, useApp } from "../../src/context/AppContext";
import { FIRESTORE_DATABASE_ID } from "../../src/services/firebasePublicConfig";

setLogLevel("silent");
const projectId = "demo-planifica";
const tick = () => new Promise(r => setTimeout(r, 20));

// Endpoint fijo local: las identidades y el contenido de esta prueba nunca salen del emulador.
async function seedProfile(uid: string, email: string, rol: string) {
  const data = { id: uid, nombre: "Persona", apellidos: "Prueba", email, rol, activo: true, cargo: "Pruebas", departamento: "Pruebas", biometriaHabilitada: false, dosFactoresHabilitado: false };
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, typeof v === "boolean" ? { booleanValue: v } : { stringValue: v }]));
  const response = await fetch(`http://127.0.0.1:8085/v1/projects/${projectId}/databases/${FIRESTORE_DATABASE_ID}/documents/usuarios/${uid}`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer owner" }, body: JSON.stringify({ fields }),
  });
  assert.equal(response.ok, true, `No se ha podido preparar el perfil local: ${response.status}`);
}
function runtime(name: string) {
  const app = initializeApp({ projectId, apiKey: "demo-only", appId: name }, name);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = getFirestore(app, FIRESTORE_DATABASE_ID);
  connectFirestoreEmulator(db, "127.0.0.1", 8085);
  return { app, auth, db, storage: null, status: { configurada: true, conectada: false, projectId, error: null } };
}
type Client = ReturnType<typeof runtime>;
function screen(firebase: Client) {
  const result = { current: null as unknown as ReturnType<typeof useApp>, tree: null as unknown as ReturnType<typeof create> };
  function Probe() { result.current = useApp(); return null; }
  result.tree = create(React.createElement(AppProvider, { firebase, children: React.createElement(Probe) }));
  return result;
}
async function until(check: () => boolean, message: string) {
  const deadline = Date.now() + 15000;
  while (!check() && Date.now() < deadline) await act(async () => { await tick(); });
  assert.ok(check(), message);
}

test("dos sesiones React: alta visible sin recargar, reconexión, reapertura y borrado/restauración en la base nombrada", { timeout: 60000 }, async t => {
  const saved = new Map<string, string>();
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    window: { addEventListener() {}, removeEventListener() {} },
    document: { documentElement: { classList: { add() {}, remove() {} } } },
    localStorage: { getItem: (k: string) => saved.get(k) ?? null, setItem: (k: string, v: string) => saved.set(k, v), removeItem: (k: string) => saved.delete(k) },
  });
  const a = runtime("dispositivo-a"), b = runtime("dispositivo-b"), anonymous = runtime("sin-sesion");
  let viewA: ReturnType<typeof screen> | undefined, viewB: ReturnType<typeof screen> | undefined;
  try {
    // Impide que una base nombrada abierta por error haga pasar la prueba de sincronización.
    await assert.rejects(getDocFromServer(doc(anonymous.db, "planes", "sin-permiso")), (error: any) => error.code === "permission-denied");
    for (const [client, role] of [[a, "administrador"], [b, "consulta"]] as const) {
      const email = `${client.app.name}-${Date.now()}@example.test`;
      const { user } = await createUserWithEmailAndPassword(client.auth, email, "Prueba-local-2026!");
      await seedProfile(user.uid, email, role);
    }
    await act(async () => { viewA = screen(a); viewB = screen(b); });
    await until(() => !!viewA?.current.datosCompartidosListos && !!viewB?.current.datosCompartidosListos, "Ambas sesiones deben validar su perfil y cargar desde servidor");
    const payload = { codigo: "MULTI", nombre: "Proyecto entre dispositivos", ejercicio: 2026, presupuestoTotal: 1000, activo: true, plazoEjecucionMaximo: "2026-12-31", plazoJustificacionMaximo: "2027-01-31", eellBeneficiarias: [], actuacionesPrevistas: [] };
    let id = "";
    const started = performance.now();
    await act(async () => {
      const plan = await viewA!.current.guardarOperacion(() => viewA!.current.crearPlan(payload));
      id = plan.id;
    });
    await until(() => viewB!.current.planes.some(p => p.id === id), "El proyecto debe aparecer en la segunda sesión sin recargar");
    t.diagnostic(`Alta → visible en la otra sesión: ${Math.round(performance.now() - started)} ms (emulador local; no es una medición de producción).`);
    const stored = (await getDocFromServer(doc(a.db, "planes", id))).data()!;
    assert.equal(stored.nombre, payload.nombre);
    assert.equal(stored.actualizadoPorUid, a.auth.currentUser!.uid);
    assert.ok(stored.actualizadoEnServidor);

    await act(async () => { await disableNetwork(b.db); });
    await act(async () => {
      await viewA!.current.guardarOperacion(() => viewA!.current.actualizarPlan({ ...viewA!.current.planes.find(p => p.id === id)!, nombre: "Modificado durante desconexión" }));
    });
    assert.equal(viewB!.current.planes.find(p => p.id === id)?.nombre, payload.nombre);
    await act(async () => { await enableNetwork(b.db); });
    await until(() => viewB!.current.planes.find(p => p.id === id)?.nombre === "Modificado durante desconexión", "La reconexión debe recuperar la modificación");

    await act(async () => { viewB!.tree.unmount(); viewB = screen(b); });
    await until(() => !!viewB?.current.datosCompartidosListos && viewB.current.planes.some(p => p.id === id), "Reabrir debe recuperar el proyecto confirmado");
    await act(async () => { await viewA!.current.guardarOperacion(() => viewA!.current.eliminarPlan(id, true)); });
    await until(() => !viewB!.current.planes.some(p => p.id === id), "El borrado debe propagarse sin recargar");
    const copy = viewA!.current.planesPapelera.find(p => p.plan.id === id)!;
    assert.ok(copy);
    await act(async () => { await viewA!.current.guardarOperacion(() => viewA!.current.restaurarPlan(copy.idCopia)); });
    await until(() => viewB!.current.planes.some(p => p.id === id), "La restauración debe propagarse sin recargar");
    await act(async () => {
      await assert.rejects(viewB!.current.guardarOperacion(() => viewB!.current.crearPlan({ ...payload, nombre: "Alta prohibida" })));
    });
    assert.equal((await getDocFromServer(doc(a.db, "planes", id))).data()?.nombre, "Modificado durante desconexión");
  } finally {
    await act(async () => { viewA?.tree.unmount(); viewB?.tree.unmount(); });
    await Promise.all([a, b, anonymous].map(client => deleteApp(client.app)));
  }
});
