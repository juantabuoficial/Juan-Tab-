import React from "react";
import { create, act } from "react-test-renderer";
import assert from "node:assert/strict";
import { test } from "node:test";
import { AppProvider, useApp } from "../src/context/AppContext";

test("un perfil local manipulado no inicia sesión ni sobrescribe datos al montar", async () => {
  const datos = new Map([
    [
      "adl_cadiz_usuario_activo_v2",
      JSON.stringify({
        id: "usr-jefe-1",
        rol: "administrador",
        email: "juan@example.com",
      }),
    ],
    ["adl_cadiz_actuaciones_v2", "[]"],
    [
      "adl_cadiz_planes_v2",
      '[{"id":"plan-existente","nombre":"Plan original"}]',
    ],
    [
      "adl_cadiz_planes_papelera_v2",
      '[{"idCopia":"copia-1","fechaBorrado":"2020-01-01","fechaExpiracion":"2020-02-01"}]',
    ],
    [
      "adl_cadiz_usuarios_v2",
      '[{"id":"usr-jefe-1","rol":"jefe_servicio","nombre":"Nombre original"}]',
    ],
    ["adl_cadiz_planes_v1", '[{"id":"expediente-heredado"}]'],
  ]);
  const original = new Map(datos);
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    localStorage: {
      getItem: (key: string) => datos.get(key) ?? null,
      setItem: (key: string, value: string) => datos.set(key, value),
      removeItem: (key: string) => datos.delete(key),
    },
    window: { addEventListener() {}, removeEventListener() {} },
    document: { documentElement: { classList: { add() {}, remove() {} } } },
  });
  let contexto: ReturnType<typeof useApp>;
  function Probe() {
    contexto = useApp();
    return null;
  }
  let tree: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      React.createElement(AppProvider, null, React.createElement(Probe)),
    );
  });
  assert.equal(contexto!.usuarioActual, null);
  assert.equal(contexto!.estadoSincronizacion, "offline");
  assert.equal(contexto!.datosCompartidosListos, false);
  await act(async () => {
    contexto!.cambiarUsuarioActivo("usr-jefe-1");
  });
  assert.equal(contexto!.usuarioActual, null);
  assert.deepEqual(datos, original);
  await act(async () => {
    tree!.unmount();
  });
});
