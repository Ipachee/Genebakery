# Auth

Estado: stub — completar cuando se trabaje acá.

**Archivos:** `src/features/auth/AdminUnlock.tsx`, `src/features/auth/useAuth.ts`

Login por cargo, email calculado como `${clave}@comandacafe.local` (ver [[Permisos]]). Qué tarjetas de
turno se muestran depende del día — ver [[Configuracion-turnos]].

Pendiente (handoff recibido, no implementado todavía): rediseño completo a login por PIN de 4 dígitos
con tarjetas de persona en vez de contraseña de texto por turno. Decisión ya tomada: el PIN va a
reemplazar la password real de cada cuenta en Supabase Auth (no un backend de PIN separado) — hace falta
bajar `minimum_password_length` en la config de Auth (hoy en 6) antes de poder usar PINs de 4 dígitos.

**Relacionado:** [[Permisos]], [[Configuracion-turnos]], [[Index]]
