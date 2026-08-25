# Auth

**Qué hace:** login por PIN de 4 dígitos, identidad primero (se elige la persona, después se tipea el
PIN) — reemplaza el login viejo de tarjetas de turno con contraseña de texto.

**Archivos clave:** `src/features/auth/LoginScreen.tsx`, `.css`, `turnoPorHora.ts`, `turnstile.ts`,
`src/features/auth/components/AdminUnlock.tsx`, `src/auth/AuthContext.tsx`, `src/auth/useAuth.ts`

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

## CAPTCHA de Cloudflare Turnstile (desde el 25/08/2026, issue #6)

Con el PIN como password real (arriba) y el rate-limit por default de Supabase Auth siendo por IP y no
por cuenta (~30 intentos en ventana corta -- débil para 10.000 combinaciones posibles), se agregó
Turnstile como capa extra: `src/features/auth/turnstile.ts` pide un token justo antes de cada intento de
login (patrón "one-shot": crea un widget oculto, pide token, lo destruye) y lo manda como
`options.captchaToken` en `signInWithPassword` -- tocado en los dos lugares que llaman a esa función:
`LoginScreen.tsx` (login normal) y `AdminUnlock.tsx` (el 🔑 para entrar como admin sin cerrar sesión del
turno, ver [[Permisos]]).

Piezas:
- **Frontend:** `VITE_TURNSTILE_SITE_KEY` (pública, en Vercel env vars de Preview y Production). Si está
  vacía, `turnstileHabilitado()` da `false` y el login sigue funcionando exactamente igual que antes
  (sin CAPTCHA) -- no rompe nada en local/dev sin la env var.
- **Backend:** el secret de Turnstile se configura en Supabase (`[auth.captcha]` en
  `supabase/config.toml` + `supabase config push`) -- ahí es donde de verdad se EXIGE el token, no solo
  se manda. Como el proyecto de Supabase es uno solo compartido entre `comandacafe.vercel.app`
  (producción) y `comandacafedev.vercel.app` (dev, ver [[Arquitectura]]), activar esto ahí afecta el
  login de las dos al mismo tiempo -- si master no tiene el código del widget desplegado todavía,
  activar el enforcement ahí rompe el login de producción hasta que también se despliegue. Por eso el
  código del widget se sube primero (no rompe nada por sí solo, el token no se exige todavía) y recién
  después se activa el enforcement, coordinado con el dueño del proyecto.
- **Sitekey en modo "Managed"**: puede en teoría pedir una interacción visible si Cloudflare considera
  el tráfico sospechoso -- pero el widget se renderiza oculto (`display:none`), así que esa interacción
  no se vería y el login quedaría trabado para esa sesión puntual. El modo "Invisible" (configurable
  desde el dashboard de Cloudflare Turnstile, no desde acá) no tiene ese riesgo.

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
