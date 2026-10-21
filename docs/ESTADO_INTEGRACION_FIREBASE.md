# PLANIFICA — estado de integración, 21/10/2026

Repositorio original: https://github.com/juantabuoficial/Juan-Tab-
Rama: `integracion-firebase-segura-20261021`
Solicitud de cambios: https://github.com/juantabuoficial/Juan-Tab-/pull/1
Base revisada: `d569e1ed43cfa9701192104adf6658e592ecf94b`.

## Entrega de desarrollo para revisión

La integración está implementada y probada con Firebase Authentication y Firestore emulados. No está desplegada ni validada de extremo a extremo en producción. No se ha publicado, fusionado, migrado datos reales ni desplegado reglas.

El acceso de desarrollo a Firebase se ha desbloqueado mediante su CLI oficial. Las consultas remotas realizadas han sido de lectura. Destino existente confirmado:

| Recurso | Identificador |
| --- | --- |
| Proyecto | `gen-lang-client-0654384720` |
| Base compartida | `ai-studio-planificav10-bf0d6c5c-18d0-4bc9-aace-c233a72b8db9` |
| Edición / tipo | ENTERPRISE / FIRESTORE_NATIVE |
| Aplicación Web | `1:251691628270:web:1553acf1581dff3afc25ff` |

No se han creado aplicaciones, proyectos ni bases remotas. La configuración pública del SDK corresponde a la aplicación original; no incluye credenciales de administración. `.env.local` y los registros del emulador están excluidos de Git. El modo emulador requiere una opción explícita en desarrollo; no se activa en producción.

## Comportamiento implementado

- Acceso real mediante Google o correo/contraseña de Firebase Authentication, sujeto a los proveedores habilitados en el proyecto. El UID autenticado y un perfil activo del servidor determinan el acceso. Se eliminan la entrada automática como Juan, la selección local de identidad y la biometría/2FA simuladas.
- Revocar o desactivar el perfil cierra el acceso y las suscripciones. Un perfil local manipulado o una coincidencia de correo no conceden permisos. David participa exclusivamente como desarrollador: no se ha creado un perfil funcional ni asignado ningún rol a su cuenta.
- El contexto compartido persiste planes, actuaciones y sus documentos/checklists/liquidaciones, perfiles autorizados, directorio profesional, comentarios, auditoría, notificaciones, preferencias y papelera.
- Las operaciones relacionadas se agrupan en transacciones. Los formularios principales esperan confirmación antes de mostrar éxito o cerrarse; muestran errores y cambios pendientes. Sus botones de guardado se desactivan mientras hay cambios pendientes.
- Las escuchas actualizan los datos entre cuentas. Se mantienen consultas y escuchas estándar por el requisito explícito de tiempo real en esta base Enterprise.
- Una revisión por registro detecta conflictos: se conserva el borrador y se informa al usuario, sin sobrescribir silenciosamente otra edición. La conciliación contempla cambios remotos durante y después del envío.
- Los borradores pendientes se conservan por proyecto, base y UID; si no se puede guardar el checkpoint local, no se acepta la edición. Un checkpoint corrupto requiere conservar su contenido antes de descartarlo. Salir de sesión no muestra los datos de la cuenta anterior.
- Los avisos de vencimiento son idempotentes. Cada cuenta guarda sus lecturas en sus propias preferencias; marcar todos como leídos no elimina avisos compartidos. Los comentarios no se copian en el texto de avisos globales.
- Los perfiles privados se limitan al propietario y a administración. El directorio profesional compartido excluye correo, teléfono y NIF. Los usuarios antiguos sin entrada de directorio siguen visibles para administración; será necesario conciliar el directorio para habilitar su selección por otros empleados.
- La auditoría nueva usa identidad verificada y fecha de servidor y no admite modificación ni borrado. La colección anterior `registrosAuditoria` sigue visible con lectura autorizada; no se reescribe ni se transforma en eventos nuevos.
- No hay envío de correo configurado: se elimina la confirmación simulada de entrega y se deshabilita el recordatorio diario ficticio. Los avisos nativos dependen del permiso y soporte del navegador mientras la aplicación está abierta.

## Conservación y migración

Las claves locales originales permanecen intactas; no se importan automáticamente ni se usan como credenciales. El restablecimiento local conserva una copia antes de recargar y no borra la base compartida.

La importación explícita de planes, actuaciones y papelera es atómica y solo crea registros ausentes. Omite registros idénticos y aborta toda la operación si encuentra un contenido distinto con el mismo ID. No sobrescribe datos existentes. Admite hasta 400 registros por operación, además de los límites de tamaño y permisos de Firestore.

Los perfiles/roles, comentarios, avisos y auditorías locales históricos permanecen en su copia original para conciliación. No se convierten automáticamente en identidades o eventos autenticados. La migración de datos reales y la conciliación completa aún no se han ejecutado.

## Verificación ejecutada

```sh
npm ci --ignore-scripts
npm test
npm run lint
npm run build
# Con Java 21 o posterior disponible en PATH:
npm run test:integration
```

- 16 pruebas unitarias aprobadas: validación de identidad y capacidades de seis roles, preservación de datos locales sin sesión, agrupación de escrituras, conflictos, recuperación de borradores, errores de almacenamiento, cierre de sesión y conciliación de respuestas tardías.
- 14 pruebas de integración aprobadas con emuladores oficiales de Authentication y Firestore en edición Enterprise. Incluyen matriz de seis roles, acceso anónimo/desactivado, escalada y suplantación rechazadas, tipos/rangos/campos, auditoría inmutable, privacidad de perfiles y preferencias, dos clientes con escuchas reales del SDK, reapertura, conflictos y atomicidad de borrado/restauración.
- La integración React monta el contexto bajo StrictMode con una cuenta Auth emulada: crea/edita plan y actuación, añade factura, persiste comentario y configuración, marca avisos propios, conserva auditoría existente, borra/restaura y comprueba revocación y salida. No sustituye una prueba visual de cada pantalla.
- TypeScript y compilación de producción aprobados. Persisten avisos de tamaño del bundle y de futura compatibilidad del cargador de configuración de Vite. `react-test-renderer` advierte su deprecación.

Los tests usan exclusivamente identidades ficticias y servicios locales. El script de fixtures se niega a actuar sin el host de emulador esperado. No prueban Google OAuth real, correo real, navegador móvil ni la base remota.

## Seguridad y condiciones previas a publicar

Las reglas locales niegan por defecto, exigen perfiles activos y roles, bloquean la creación del propio rol, restringen datos personales y validan campos, revisiones, autor y hora de servidor. No se han desplegado. La lectura de las reglas actualmente desplegadas detectó que permiten crear el propio perfil sin limitar el rol: ese riesgo sigue en producción hasta revisar y desplegar la corrección.

Las reglas son un prototipo con cobertura automatizada, no una garantía completa de seguridad. Las listas anidadas de documentos/actuaciones y ciertos mapas heredados tienen límites de tamaño, pero aún necesitan validación más profunda de cada elemento. No se ha auditado la seguridad completa del servidor de IA, el servicio de certificados o las exportaciones históricas.

> I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for authenticated access with active role profiles, private user records, immutable audit entries, and server-validated write metadata. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

Antes de publicar/fusionar quedan:

1. Revisar/endurecer las reglas anidadas y validar compatibilidad con una copia íntegra de los datos existentes. No relajar permisos para aceptar datos históricos sin conciliarlos.
2. Preparar los perfiles autorizados de usuarios finales de Juan y su directorio, con UID de Auth reales. No dar un rol funcional a David para desbloquear desarrollo. La cuenta de desarrollo consultada carece de perfil de aplicación y no debe recibirlo automáticamente.
3. Respaldar y conciliar los datos originales antes de cualquier importación; revisar registros excluidos del importador automático.
4. Verificar proveedores y dominios de Auth y ejecutar el recorrido completo con dos usuarios finales sobre el destino original y las reglas revisadas.
5. Ejecutar las pruebas visuales de formularios, documentos, importaciones, exportaciones y dispositivos. El navegador de esta sesión no logró alcanzar el servidor local y la política del entorno bloqueó la navegación posterior; no se ha eludido esa restricción.

La rama remota se ha vuelto a consultar y conserva la misma base de trabajo. Esta entrega se conserva localmente para revisión; no se ha enviado a GitHub ni desplegado.

## Verificación específica de sincronización entre dispositivos

Se ha añadido `tests/emulator/multidevice.integration.test.ts`. Utiliza dos instancias independientes de Firebase Auth, Firestore y AppProvider, con roles administrador y consulta, y la base nombrada configurada para la aplicación dentro del emulador. Una tercera instancia anónima comprueba que esa base rechaza accesos sin sesión, evitando aprobar una prueba sobre una base emulada con reglas abiertas.

Resultado: aprobado. El alta desde la primera sesión aparece automáticamente en la segunda sin recarga; la edición durante una desconexión se recupera al reconectar; reabrir el contexto recupera el proyecto confirmado; el borrado y la restauración se propagan; una cuenta de consulta no puede crear proyectos. La lectura directa del servidor confirma el UID autor y la fecha de servidor. La propagación del alta tardó 77 ms en esta ejecución local; no representa la latencia de una red o dispositivo real.

Total actualizado: 16 pruebas unitarias y 13 de integración aprobadas (29). TypeScript y compilación de producción aprobados de nuevo. Esta comprobación usa el SDK y contexto reales con emuladores, no una simulación de mensajes entre pantallas. Sigue pendiente la comprobación visual y del despliegue público, con usuarios finales autorizados; no se ha publicado ni modificado la base real.

### Comprobación del alojamiento existente

La consulta oficial de Firebase Hosting devuelve el sitio predeterminado `gen-lang-client-0654384720` y su canal `live`. La apertura de su URL `https://gen-lang-client-0654384720.web.app/` en navegador muestra **Site Not Found**. La consulta oficial de Firebase App Hosting devuelve una lista vacía de backends. Estas consultas no alteran el alojamiento y no descartan que la app se publique en otra plataforma o dirección.

No se puede verificar un recorrido de usuario en ese alojamiento porque no muestra PLANIFICA. Para comprobar la versión que usa Juan se necesita su enlace de acceso real y una sesión autorizada de usuario final, sin compartir contraseñas ni códigos por el chat. No se ha iniciado sesión, creado perfiles, publicado ni modificado datos remotos durante esta verificación.

### Inspección de la dirección facilitada por el usuario

URL verificada en navegador: `https://planifica.ai.studio/`. La página carga con título `PLANIFICA · Diputación Provincial de Cádiz`.

Observaciones de la versión servida:

- Al abrirla, sin completar ningún inicio de sesión, muestra a Juan Hinojo García como `CONECTADO` y con su cargo funcional.
- El panel Seguridad ofrece `Autenticar Automáticamente (Juan Hinojo García)`, afirma habilitar todos los permisos y muestra los controles de biometría anteriores. No se ha pulsado ninguna opción de autenticación.
- Ajustes conserva las opciones anteriores de cifrado extremo a extremo, biometría, 2FA y correo diario marcadas como activas; no se ha cambiado ninguna opción.
- Muestra cero planes y cero actuaciones en esta sesión. Esto no prueba que los registros originales se hayan perdido ni que la base remota esté vacía.
- `Gestionar Firebase` no produjo un cambio visible ni un diagnóstico en esta inspección. No se pulsó `Sincronizar Ya`, migración ni restablecimiento.

Conclusión: esta dirección sigue sirviendo la interfaz anterior a los cambios locales de autenticación y persistencia compartida. Las 29 pruebas aprobadas corresponden al código local de la rama, no a esta versión publicada. No se puede afirmar que un proyecto introducido aquí se replique entre dispositivos. Para certificarlo es necesario terminar la revisión de seguridad, entregar/desplegar la versión corregida y repetir el recorrido con sesiones autorizadas de usuarios finales.

La inspección fue de lectura y navegación: no se han creado proyectos, modificado expedientes, autenticado como Juan, migrado datos ni publicado cambios.

## Preparación de fusión y despliegue solicitada

Verificación repetida tras cerrar la modificación global del estado de lectura de avisos: **30 pruebas aprobadas** (16 unitarias y 14 de integración), TypeScript y compilación de producción correctos. Los avisos compartidos ahora son inmutables; las lecturas se guardan exclusivamente en preferencias del UID. La prueba nueva intenta alterar el aviso desde los seis roles y confirma que el servidor lo rechaza.

Se ha localizado el servicio existente `projects/gen-lang-client-0654384720/locations/us-east1/services/planifica`, administrado por Google AI Studio. La cuenta de desarrollo tiene `run.services.get`, `run.services.update` y `run.routes.invoke`. Esto acredita acceso al servicio, sin garantizar por sí solo los permisos de compilación o de su cuenta de servicio. No se ha creado otro servicio ni cambiado tráfico/revisiones.

Firebase tiene Google y correo/contraseña habilitados y autoriza `planifica.ai.studio`. La nueva consulta de identidades confirma una cuenta Auth y **cero perfiles de aplicación** para las identidades existentes. La cuenta existente es la de desarrollo de David; no se le ha asignado un rol funcional. Publicar el acceso estricto en este estado impediría entrar a usuarios finales.

Antes de fusionar/publicar se requiere identificar las cuentas reales de Juan y de administración, crear/conciliar sus perfiles autorizados y verificar el acceso con ellas, además de resolver la revisión de datos anidados descrita en `REVISION_REGLAS_FIRESTORE.json`. No se deben obtener credenciales de usuarios por chat ni promover la cuenta de desarrollo. No se han desplegado reglas, importado datos ni modificado usuarios de producción.

La entrega de código y resultados se prepara para la rama y PR originales, que deben seguir en borrador mientras falten estas comprobaciones. Las notas anteriores de «solo local» describen el estado anterior al envío de esta entrega.
