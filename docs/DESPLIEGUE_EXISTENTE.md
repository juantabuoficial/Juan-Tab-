# Despliegue sobre el servicio existente

Destino: servicio `planifica`, región `us-east1`, proyecto `gen-lang-client-0654384720`. No crear otra aplicación ni otra base.

La aplicación se compila con `npm run build` y arranca con `npm start` sin depender de tsx. Respeta la variable PORT de Cloud Run. Dockerfile incluye solo dependencias de ejecución y archivos compilados; .dockerignore y .gcloudignore excluyen credenciales, archivos .env, logs y el repositorio Git.

Comprobación del artefacto:

```sh
npm ci --ignore-scripts
npm run build
npm run lint
npm test
npm run test:production
# Java 21 disponible:
npm run test:integration
```

El siguiente paso autorizado es preparar una revisión candidata sin tráfico público en el mismo servicio:

```sh
gcloud run deploy planifica --source . --project gen-lang-client-0654384720 --region us-east1 --no-traffic --tag validacion-planifica --quiet
```

Este comando requiere una sesión Google Cloud vigente del colaborador de desarrollo. No requiere ni concede un rol funcional de PLANIFICA. La instalación del CLI no equivale a disponer de esa sesión.

Antes de trasladar tráfico público deben verificarse el arranque de la revisión, el control de acceso y los datos existentes. La comprobación previa de Firebase devolvió cero perfiles para las identidades Auth existentes; no se debe sustituir el acceso simulado por una pantalla que ningún usuario final pueda superar sin preparar antes las identidades autorizadas. La cuenta de David permanece exclusivamente como colaborador de desarrollo.

La fusión en GitHub no acredita un despliegue ni una comprobación de producción. Los resultados y pendientes de datos/reglas figuran en ESTADO_INTEGRACION_FIREBASE.md y REVISION_REGLAS_FIRESTORE.json.
