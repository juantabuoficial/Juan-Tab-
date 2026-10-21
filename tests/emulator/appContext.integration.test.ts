import React from "react";
import { create, act } from "react-test-renderer";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  setLogLevel,
} from "firebase/firestore";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { AppProvider, useApp } from "../../src/context/AppContext";
setLogLevel("silent");
const tick = () => new Promise((r) => setTimeout(r, 20));

test("React: sesión real emulada, formularios, configuración, papelera, restauración y cierre sin tocar datos heredados", async () => {
  const projectId = "demo-planifica-context";
  const legacy = new Map([
    ["adl_cadiz_planes_v2", '[{"id":"antiguo","nombre":"Conservar"}]'],
    ["adl_cadiz_usuario_activo_v2", '{"rol":"administrador","id":"falso"}'],
  ]);
  const original = new Map(legacy);
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    window: { addEventListener() {}, removeEventListener() {} },
    document: { documentElement: { classList: { add() {}, remove() {} } } },
    localStorage: {
      getItem: (k: string) => legacy.get(k) ?? null,
      setItem: (k: string, v: string) => legacy.set(k, v),
      removeItem: (k: string) => legacy.delete(k),
    },
  });
  const app = initializeApp(
    { projectId, apiKey: "demo-only", appId: "context-test" },
    "context-test",
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", 8085);
  const rules = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: "127.0.0.1",
      port: 8085,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
  const identity = (
    await createUserWithEmailAndPassword(
      auth,
      `ctx-${Date.now()}@example.test`,
      "Prueba-local-2026!",
    )
  ).user;
  const profile = {
    id: identity.uid,
    nombre: "Persona",
    apellidos: "Prueba",
    email: identity.email!,
    rol: "administrador",
    activo: true,
    cargo: "Administrador de prueba",
    departamento: "Pruebas",
    biometriaHabilitada: false,
    dosFactoresHabilitado: false,
  };
  await rules.withSecurityRulesDisabled((c) =>
    setDoc(doc(c.firestore() as any, "usuarios", identity.uid), profile),
  );
  await rules.withSecurityRulesDisabled((c) =>
    setDoc(doc(c.firestore() as any, "registrosAuditoria", "historial-existente"), {
      id: "historial-existente", usuarioId: identity.uid, usuarioNombre: "Persona Prueba", rol: "administrador",
      fechaHora: "2026-01-01T00:00:00Z", actuacionId: "antigua", documentoId: "general", documentoTitulo: "Historial", accion: "acceso_pestana",
    }),
  );
  let current!: ReturnType<typeof useApp>;
  function Probe() {
    current = useApp();
    return null;
  }
  const firebase = {
    app,
    db,
    auth,
    storage: null,
    status: { configurada: true, conectada: false, projectId, error: null },
  };
  let tree!: ReturnType<typeof create>;
  try {
    await act(async () => {
      tree = create(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(AppProvider, {
            firebase,
            children: React.createElement(Probe),
          }),
        ),
      );
    });
    const deadline = Date.now() + 12000;
    while (!current?.datosCompartidosListos && Date.now() < deadline)
      await act(async () => {
        await tick();
      });
    assert.equal(
      current.datosCompartidosListos,
      true,
      current.errorAutenticacion || current.errorSincronizacion,
    );
    assert.equal(current.usuarioActual?.id, identity.uid);
    assert.equal(
      current.planes.length,
      0,
      "No importar datos heredados automáticamente",
    );
    assert.ok(current.registrosAuditoria.some(r => r.documentoTitulo === "Historial"), "Conservar visible la auditoría existente");
    let planId = "";
    await act(async () => {
      const plan = current.crearPlan({
        codigo: "CTX",
        nombre: "Plan React",
        ejercicio: 2026,
        presupuestoTotal: 1000,
        activo: true,
        plazoEjecucionMaximo: "2026-12-31",
        plazoJustificacionMaximo: "2027-01-31",
        eellBeneficiarias: [],
        actuacionesPrevistas: [],
      });
      planId = plan.id;
      assert.equal(
        current.estadoSincronizacion === "sincronizado" &&
          current.cambiosPendientes > 0,
        false,
      );
      await current.esperarGuardado();
    });
    assert.equal(
      (await getDoc(doc(db, "planes", planId))).data()?.nombre,
      "Plan React",
    );
    let actId = "";
    await act(async () => {
      const item = current.agregarActuacionAlPlan(planId, {
        numero: "01",
        entidadLocal: "Cádiz",
        titulo: "Obra React",
        aplicacionPresupuestaria: "2026-TEST",
        subvencionSolicitada: 1000,
      });
      actId = item.id;
      await current.esperarGuardado();
    });
    assert.equal(
      (await getDoc(doc(db, "actuaciones", actId))).data()?.titulo,
      "Obra React",
    );
    await act(async () => {
      current.actualizarActuacion(actId, { titulo: "Obra editada" });
      await current.esperarGuardado();
    });
    let facturaId = "";
    await act(async () => {
      facturaId = current.agregarFacturaAActuacion(actId)!.id;
      await current.esperarGuardado();
    });
    assert.ok((await getDoc(doc(db, "actuaciones", actId))).data()?.documentos.some((d: any) => d.id === facturaId));
    await act(async () => {
      const comment = await current.enviarComentarioActuacion(actId, identity.uid, "Comentario persistido");
      assert.equal((await getDoc(doc(db, "comentarios", comment.id))).data()?.mensaje, "Comentario persistido");
      assert.equal(comment.enviadoPorEmail, false);
    });
    await act(async () => {
      current.actualizarConfiguracion({ alertasVencimientoDias: 45 });
      await current.esperarGuardado();
    });
    assert.equal(
      (await getDoc(doc(db, "configuracionesUsuario", identity.uid))).data()
        ?.alertasVencimientoDias,
      45,
    );
    await act(async () => {
      current.marcarNotificacionLeida("aviso-propio");
      await current.esperarGuardado();
    });
    assert.deepEqual((await getDoc(doc(db, "configuracionesUsuario", identity.uid))).data()?.notificacionesLeidas, ["aviso-propio"]);
    await act(async () => {
      current.eliminarPlan(planId, true);
      await current.esperarGuardado();
    });
    assert.equal((await getDoc(doc(db, "planes", planId))).exists(), false);
    assert.equal(current.planesPapelera.length, 1);
    assert.equal(
      current.planesPapelera[0].actuacionesAsociadas[0].titulo,
      "Obra editada",
    );
    await act(async () => {
      assert.equal(
        current.restaurarPlan(current.planesPapelera[0].idCopia),
        true,
      );
      await current.esperarGuardado();
    });
    assert.equal(
      (await getDoc(doc(db, "actuaciones", actId))).data()?.titulo,
      "Obra editada",
    );
    for (const [key, value] of original) assert.equal(legacy.get(key), value);
    await act(async () => {
      await rules.withSecurityRulesDisabled((c) =>
        updateDoc(doc(c.firestore() as any, "usuarios", identity.uid), {
          activo: false,
        }),
      );
      await tick();
    });
    assert.equal(
      current.usuarioActual,
      null,
      "Un perfil revocado debe cerrar el acceso",
    );
    await act(async () => {
      await signOut(auth);
      await tick();
    });
    assert.equal(current.usuarioActual, null);
    assert.equal(
      current.planes.length,
      0,
      "No mostrar datos de la sesión cerrada",
    );
  } finally {
    if (tree) await act(async () => tree.unmount());
    await rules.cleanup();
    await deleteApp(app);
  }
});
