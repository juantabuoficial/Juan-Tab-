import { test } from "node:test";
import assert from "node:assert/strict";
import { perfilAutorizado } from "../src/services/authProfile";

const base = {
  nombre: "Persona",
  apellidos: "Autorizada",
  email: "persona@example.com",
  activo: true,
};

test("rechaza perfiles desactivados, sin rol o con rol inventado", () => {
  for (const extra of [
    { rol: "administrador", activo: false },
    { rol: "superadmin" },
    {},
    { rol: null },
  ]) {
    assert.throws(() => perfilAutorizado("uid-real", { ...base, ...extra }));
  }
});
test("rechaza perfiles incompletos", () => {
  assert.throws(() =>
    perfilAutorizado("uid-real", { ...base, rol: "consulta", nombre: null }),
  );
  assert.throws(() =>
    perfilAutorizado("uid-real", { ...base, rol: "consulta", email: null }),
  );
});
test("el UID de Auth prevalece sobre un ID guardado y el correo no otorga privilegios", () => {
  const perfil = perfilAutorizado("firebase-uid", {
    ...base,
    id: "usr-jefe-1",
    email: "juan.tabu.oficial@gmail.com",
    rol: "consulta",
    permisos: { puedeGestionarUsuarios: true, puedeEditarPlanes: true },
  });
  assert.equal(perfil.id, "firebase-uid");
  assert.equal(perfil.rol, "consulta");
  assert.equal(perfil.permisos?.puedeGestionarUsuarios, false);
  assert.equal(perfil.permisos?.puedeEditarPlanes, false);
  assert.equal(perfil.permisos?.puedeCalificarDocumentos, false);
});
test("matriz de capacidades para los seis roles autorizados", () => {
  for (const rol of [
    "administrador",
    "jefe_servicio",
    "tecnico",
    "administrativo",
    "auditor",
    "consulta",
  ]) {
    const perfil = perfilAutorizado("uid-real", { ...base, rol });
    assert.equal(
      perfil.permisos?.puedeGestionarUsuarios,
      rol === "administrador",
    );
    assert.equal(
      perfil.permisos?.puedeEditarPlanes,
      ["administrador", "jefe_servicio"].includes(rol),
    );
    assert.equal(
      perfil.permisos?.puedeCalificarDocumentos,
      ["administrador", "jefe_servicio", "tecnico", "administrativo"].includes(
        rol,
      ),
    );
  }
});
