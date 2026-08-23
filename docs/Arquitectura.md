# Arquitectura

**Stack:** React + Vite + TypeScript, Supabase (Postgres + Auth + Edge Functions), desplegado en Vercel.

**Repo:** `Ipachee/Genebakery`, carpeta de trabajo `P:\Claude\Genebakery`.

## Entornos

- **Producción**: rama `master` → `https://comandacafe.vercel.app`
- **Preview / desarrollo**: rama `feat/rediseno-navegacion` → `https://comandacafedev.vercel.app`

Ver [[Convenciones#Flujo de git]] para cuándo pasa código de una rama a la otra.

## Deploy — es manual, `git push` NO alcanza

Vercel no redespliega solo con el push. Después de pushear hace falta:

```bash
npx vercel deploy --yes
npx vercel alias set <url-que-devuelve-el-deploy> comandacafedev.vercel.app
```

Si algún día no se ve un cambio reciente en `comandacafedev.vercel.app`, la causa más probable es que
faltó este paso, no un bug real.

## Cambios de base de datos

Todo cambio de schema sigue el mismo orden, siempre:

1. Migración nueva en `supabase/migrations/` (nombre `YYYYMMDDHHMMSS_descripcion.sql`)
2. `npx supabase db push --linked`
3. `npx supabase gen types typescript --linked` (regenera `src/lib/supabase/types.ts`)
4. `npx tsc -b` (tiene que quedar limpio)
5. `npm run lint` (oxlint — hoy hay 3 warnings cosméticos preexistentes, no deberían sumarse más)
6. commit + push + deploy

Si una función de Postgres cambia el tipo de retorno, `create or replace function` falla — hay que hacer
`drop function if exists ...()` antes de recrearla.

## `print-bridge` es un programa aparte

Vive en `print-bridge/` pero **no** es parte del build de Vite ni pasa por `tsc`/`lint` del proyecto
principal. Se corre por separado (`node index.js`) en la compu que tiene la impresora conectada. Ver
[[Print-bridge]].
