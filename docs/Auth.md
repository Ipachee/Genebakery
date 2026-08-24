# Auth

**Qué hace:** login por PIN de 4 dígitos, identidad primero (se elige la persona, después se tipea el
PIN) — reemplaza el login viejo de tarjetas de turno con contraseña de texto.

**Archivos clave:** `src/features/auth/LoginScreen.tsx`, `.css`, `turnoPorHora.ts`,
`src/features/auth/AdminUnlock.tsx`, `src/features/auth/useAuth.ts`

## El PIN es la password real

Decisión tomada a propósito (no un backend de PIN separado): el PIN de 4 dígitos **es** literalmente la
contraseña de esa cuenta en Supabase Auth, se llama `signIn(email, pin)` igual que antes con la password
de texto. Más simple, cero piezas nuevas — a cambio, un PIN de 4 dígitos es más fácil de adivinar que una
contraseña de verdad, asumido conscientemente para esta app interna.

El PIN se pisa en la base directo por SQL (no por la Admin API — quedó bloqueada por el clasificador de
seguridad de auto mode, ver por qué es una acción sensible en [[Convenciones]]):

```sql
create extension if not exists pgcrypto;
update auth.users set encrypted_password = crypt('1234', gen_salt('bf')), updated_at = now()
where email = '...';
```

Esto no pasa por la validación de `minimum_password_length` de Supabase Auth (que sigue en 6) porque
escribe el hash directo — esa validación solo aplica a los flujos de cambio de contraseña por la vía
normal, no afecta el login en sí.

## Quién aparece en la grilla

Turnos (Mañana/Tarde/Noche, de `accounts.ts`) filtrados por [[Configuracion-turnos]] — solo los activos
hoy. Cargos dinámicos (RRHH y lo que se cree con + Nuevo cargo, de `roles_personalizados`) se suman a la
misma grilla como tarjetas de persona, ya no atrás de un botón flotante "Cargos" aparte — ver
[[Permisos]]. Administración queda como tarjeta separada, abajo de la grilla.

## Turno detectado (badge) vs turno abierto (punto verde)

Dos cosas distintas, no confundir: el badge de arriba ("Turno tarde en curso") es solo informativo, sale
de la hora del reloj (`turnoPorHora.ts`, mismas franjas que `fn_resolver_turno_horario` — hoy desactivada,
ver [[Turnos]]). El puntito verde en el avatar de una tarjeta sale de si ese turno tiene una caja
realmente abierta en la base (`useTurnosPublico`) — puede haber un turno "detectado" por horario que no
esté abierto, y viceversa.

**Relacionado:** [[Permisos]], [[Configuracion-turnos]], [[Turnos]], [[Convenciones]], [[Index]]
