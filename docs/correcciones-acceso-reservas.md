# Correcciones de acceso y reservas — 9 de octubre de 2026

## Cambios implementados

- Registro con `firstName` y `lastName`, persistidos como `first_name` y `last_name`. `name` se conserva para las pantallas existentes. Los nombres históricos no se dividen automáticamente.
- Contraseñas con bcrypt y sal individual (10 rondas); mínimo 8 caracteres en registros nuevos y máximo 72 bytes UTF-8 para evitar truncamiento silencioso.
- Nuevas cuentas en `PENDING_VERIFICATION`, sin inicio de sesión automático. Se envía un enlace firmado de 30 minutos. Una cuenta deshabilitada no puede reactivarse con ese enlace. Existe reenvío y límite de intentos por IP.
- Cada acceso protegido comprueba firma, expiración y propósito del JWT, además del estado y rol actuales en la base. Las sesiones emitidas por la versión anterior requieren volver a iniciar sesión.
- Las páginas operativas, el catálogo y el detalle de cancha requieren sesión; inicio, registro, login y verificación son públicos. La API del catálogo conserva sus consultas públicas, pero los datos de reservas y pagos requieren sesión y propiedad o rol de personal.
- URLs de pago y confirmación con token firmado de una hora ligado al usuario. El token no sustituye al JWT de sesión. Los importes y horarios se consultan al servidor; no se aceptan desde parámetros de navegación.
- Reservas en bloques consecutivos de 30 minutos, incluidos 30 y 90 minutos, con precios proporcionales. API, interfaz y restricción SQL aplican la misma regla.
- Cronómetro calculado desde `expiresAt`, que no se reinicia al recargar. Aviso permanente de cancelación, aviso urgente durante el último minuto y mensaje al vencer. El servidor mantiene la transición `TEMPORAL → EXPIRED`; enviar un comprobante aceptado detiene el contador y pasa a validación.
- Códigos visibles de 8 caracteres; el UUID completo sigue siendo el identificador interno. Pendientes de validación en amarillo; confirmadas en verde.
- Mis reservas permite buscar cancha/código, filtrar fechas y estados, validar rangos y ordenar por próximas, fecha descendente, creación o importe. Los pendientes de pago se distinguen de los pendientes de validación.
- Bandeja de comprobantes con «Ver detalles»: cliente, contacto, reserva, cancha, importes, saldo y movimientos/comprobantes asociados.

## Activación en un entorno existente

1. Aplicar `supabase/migrations/20261009161546_email_verification_and_half_hour_bookings.sql` y después `supabase/migrations/20261009161634_bounded_types_and_table_audit.sql` sobre una base que ya tenga la inspección formal y el endurecimiento de acceso. Ejecutar antes de desplegar el backend actualizado. Ambas se probaron en PostgreSQL local y se aplicaron el 9 de octubre de 2026 al proyecto Supabase Canchas Deportivas mediante el conector. La segunda permite registrar usuarios sin CI y agrega auditoría; ver [detalle de tipos y auditoría](correcciones-auditoria-tipos.md).
2. Configurar en el `.env` del backend las variables de `.env.verification.example`: `RESEND_API_KEY`, `MAIL_FROM`, `FRONTEND_URL` y un `JWT_SECRET` aleatorio. El secreto existente se conserva; ya no existe una clave de respaldo en el código. `FRONTEND_URL` debe ser la URL pública HTTPS en producción.
3. Configurar un dominio remitente verificado en Resend. La integración usa su [API oficial de envío](https://resend.com/docs/api-reference/emails/send-email). No se necesita una dependencia adicional: el backend usa `fetch` de Node.
4. Reiniciar el backend y publicar/reiniciar el frontend. Abrir `/register`, crear una cuenta de prueba, comprobar que no inicia sesión antes de verificar, abrir el correo, pulsar «Confirmar mi correo» y luego iniciar sesión.

El entorno local revisado no tiene configurados `RESEND_API_KEY`, `MAIL_FROM` ni `FRONTEND_URL`. Por eso no se enviaron correos reales. Las pruebas de entrega simulan el proveedor y validan destinatario, firma, vencimiento y manejo de fallos. Si el proveedor falla después de crear una cuenta, esta permanece pendiente y puede solicitar un nuevo enlace desde `/verify-email`.

Las cuentas históricas con estado `ACTIVE` mantienen su estado. Para exigir una nueva verificación a esos clientes se necesitaría una transición operativa explícita; no se deshabilitaron cuentas existentes.

El límite de intentos se mantiene por proceso. Para varias instancias, aplicar además un límite compartido en el proxy de entrada. El almacenamiento de secretos y las restricciones de acceso directo a Supabase se mantienen en el servidor; véase la [guía oficial de seguridad de API](https://supabase.com/docs/guides/api/securing-your-api).

## Base y compilación

Se restauró `20260924185608_formal_database_integrity.sql` a partir del bloque idéntico incluido en `database/schema.sql`: faltaba el archivo que referenciaban los scripts de reconstrucción y pruebas. No se creó una migración remota nueva para ese bloque histórico. El esquema consolidado y el diccionario se regeneraron con `npm run db:schema`.

El compilador de Nest usa `isolatedModules: false`, compatible con las importaciones de interfaces decoradas existentes. El chequeo completo de tipos permanece activo; esto corrige los errores TS1272 de la configuración anterior.

## Verificación

Resultado final: ambas compilaciones correctas, 101 pruebas del backend, 94 pruebas del frontend y 25 verificaciones de PostgreSQL local aprobadas. Quedan avisos no bloqueantes de Sass por `@import` y de ts-jest por la configuración NodeNext.

- Backend: `npm run build` y `npm test -- --runInBand`.
- Frontend: `npm run build` y `npm test -- --watch=false --browsers=ChromeHeadless`.
- Base local: `npm run db:schema` y `npm run test:database` (PGlite, sin conexión a producción).
- Pruebas nuevas cubren registro y verificación HTTP, cuentas deshabilitadas, roles actuales, acceso a reservas ajenas, tokens falsificados/vencidos/ajenos, bcrypt, entrega simulada de correo, medias horas y contador de pago.
