# Comandera

**Qué hace:** pantalla de cocina/barra para el staff (marcar rondas entregadas) + botón de impresión
manual vía `window.print()` -- **no** es lo mismo que [[Print-bridge]] (que imprime automático por
ESC/POS mirando la base). Esta es una vía manual aparte, un fallback si no hay print-bridge corriendo.

**Archivos clave:** `src/features/comandera/components/ComanderaView.tsx`, `TicketImprimible.tsx`

## Diseño del ticket impreso

`TicketImprimible.tsx` sigue el mismo criterio de las otras dos tickets imprimibles ([[Ventas]] tiene
`TicketCobro`/`FacturaTicket`): todo en negro puro sobre blanco (`#000`, sin colores de marca) porque la
impresora térmica solo imprime blanco y negro -- los tonos terracota/marrón de la app no marcan en el
papel. Header "COCINA/BARRA" en bloque sólido negro con texto blanco; jerarquía tipográfica marcada, no
color. Ancho/fuente vienen de `ticketConfig.ts` (Ajustes → Tipografía del ticket), no hardcodeados acá.

**No** recibe destino (cocina/barra) para dividir el contenido -- a diferencia de print-bridge, esta
pantalla siempre muestra todos los items juntos de una ronda.

**Relacionado:** [[Print-bridge]], [[Categorias-y-Recetas]], [[Index]]
