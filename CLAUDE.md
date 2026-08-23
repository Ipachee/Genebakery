# ComandaCafé

POS de café hecho a medida — React + Vite + TypeScript + Supabase, desplegado en Vercel.

## Documentación del proyecto (Obsidian)

Hay un vault de Obsidian en `docs/` — abrilo como carpeta en Obsidian para navegar los links. Punto de
entrada: `docs/Index.md`.

**Regla fija: al terminar una feature o migración, actualizar la nota de `docs/` correspondiente al área
tocada**, como un paso más del checklist de cierre (junto con regenerar tipos, `tsc -b`, `lint`, commit y
deploy — ver `docs/Arquitectura.md`). Si el área tocada todavía es un stub, pasarla a nota real con lo
aprendido; si ya tiene contenido, sumar lo nuevo sin borrar lo que sigue siendo cierto. Si se crea una
sección completamente nueva, sumarla a `docs/Index.md` y crearle su nota (aunque sea un stub).

No hace falta que el usuario lo pida cada vez — es parte del flujo normal de cerrar un cambio en este
repo.

## Deploy — manual, `git push` no alcanza

Ver `docs/Arquitectura.md`. Resumen: después del push, `npx vercel deploy --yes` +
`npx vercel alias set <url> comandacafedev.vercel.app` (preview) o el alias de producción según
corresponda.
