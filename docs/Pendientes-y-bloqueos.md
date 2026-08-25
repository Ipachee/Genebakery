# Pendientes y bloqueos

Estado al **25/08/2026**. Todo lo que quedó a medias, bloqueado esperando algo, o que puede volver a
romper. Ordenado por lo que más conviene resolver primero.

**Ya resuelto en esta tanda:** el merge a `master` (producción corre el código nuevo), los textos
descriptivos sacados de la interfaz, y "Torta del día" desactivada — tenía stock 0 y desde el issue #2
eso **trababa el cobro en el bar**, porque las migraciones aplicadas desde dev ya están vivas en
producción (ver punto 4). La impresora quedó decidida: se usa `print-bridge`.

---

## 🔴 Bloqueado esperando una decisión o una acción tuya

### 1. Turnstile: falta el último paso, en el dashboard de Supabase (issue #6)

El widget **ya está desplegado en las dos puntas** (dev y producción, verificado: el bundle de
`comandacafe.vercel.app` incluye el script y la site key). Lo único que falta es **activar el
enforcement**, que vive del lado de Supabase — hasta que se active, el login manda el token y Supabase lo
ignora.

**Son 3 clicks en el dashboard:** Authentication → Attack Protection → activar "Enable Captcha
protection", proveedor **Cloudflare Turnstile**, y pegar la **secret key**.

**Por qué no lo hice por CLI:** la única vía del CLI es `supabase config push`, que sube el
`config.toml` **entero**, no sólo el captcha. Y ese archivo tiene los valores por defecto de desarrollo:
`site_url = "http://127.0.0.1:3000"`, `additional_redirect_urls` a localhost, y secretos de proveedores
externos (Apple, Twilio) que apuntan a variables de entorno vacías. Pushear eso pisaría la configuración
de auth de un negocio en vivo para ahorrar tres clicks. No existe `--dry-run` ni forma de pushear sólo
una sección.

**El orden ya está resuelto:** antes había que mergear a `master` primero (si no, activar el enforcement
tumbaba el login de producción, que no tenía el widget). Eso ya se hizo el 25/08/2026, así que activarlo
ahora es seguro.

**Ojo con el sitekey:** el widget se renderiza en un contenedor oculto. Eso funciona bien si el sitekey
está en modo **Invisible** en el dashboard de Cloudflare. Si quedó en **Managed** (el default), Cloudflare
puede decidir pedir una interacción visible para tráfico que le parezca sospechoso — y al estar oculto el
contenedor, esa interacción no se vería y **el login quedaría trabado** para esa persona. Conviene
confirmarlo antes de activar el enforcement.

**Sobre la secret key:** no la guardé en ningún lado (va en la config de Supabase, que es justamente el
paso que no hice). Como pasó por el chat, si querés máxima prolijidad se puede regenerar el widget en
Cloudflare cuando lo vayamos a activar — cuesta dos minutos.

### 2. Los tests E2E consumen stock real, y ahora corren solos en cada push

**Ya rompió una vez hoy.** Cada corrida cobra un pedido con "Agua mineral", y cobrar descuenta stock de
verdad. Antes pasaba desapercibido (el stock se iba a negativo en silencio); desde el issue #2
(`fn_cobrar_pedido` valida stock antes de cobrar) cuando llega a 0 el cobro corta y **la suite entera se
pone en rojo**.

Pasó exactamente eso: 39 corridas dejaron "Agua mineral" en 0 y fallaron `pedido-cobro`, `anular-venta` y
`facturacion`. Lo repuse con `fn_ajustar_stock` dejando el motivo escrito, así el historial no miente.

**Por qué va a volver a pasar:** con el CI del issue #7, **cada push consume stock**, sin que nadie lo
pida a mano.

**Opciones, ninguna gratis:**
- Reponer a mano cada tanto (lo que hice hoy) — simple pero se olvida.
- Que el helper reponga stock en el setup del test — ojo, estaría **escribiendo inventario en la misma
  base que usa el bar**.
- Mover los tests a un producto sin receta, que no descuente nada.
- Sacar `pedido-cobro`/`facturacion` del CI y dejarlos manuales.

Es una decisión tuya porque toca datos reales del negocio.

### 3. ~~Papelera: sin expiración automática~~ — resuelto el 25/08/2026

Se definió el plazo (60 días) y ya está andando sola, todos los días a las 3am Argentina. Ver
[[Papelera#Expiración automática]].

---

### 4. Proyecto de Supabase para dev/testing — creado, pausado esperando el plan Pro

`comandacafe-dev` (ref `lycyfxxyfexvpjutiyai`) ya existe, con las 47 migraciones aplicadas, las 5 cuentas
reales (PIN 1234) y datos mínimos de prueba. Verificado de punta a punta por API (login → resolver turno
→ crear pedido → cobrar → stock descontado bien).

**Queda pausado a propósito**, como pediste: el free tier sólo permite 2 proyectos activos, y ya estaban
ocupados por el real y por "stash" (que pausamos para hacer lugar -- avisame si lo necesitás activo de
nuevo antes del plan Pro). Credenciales completas guardadas en la memoria de Claude, no en este repo.
Ver [[Arquitectura#Segundo proyecto de Supabase]].

**Cuando actives el plan Pro:** decime y activo comandacafe-dev (y stash si querés), y termino de
conectarlo -- cambiar las env vars de Vercel Preview para que dev deje de compartir base con producción.

---

## 🟡 Cosas que conviene tener presentes

### 3.b El test de facturación falla de vez en cuando

`facturacion.spec.ts` llama **de verdad** a AfipSDK, un servicio externo. El 25/08/2026 falló una vez en
la suite completa y pasó sola al reintentar, sin ningún cambio de código en el medio. Si falla suelto en
CI y el resto está verde, reintentar antes de buscar un bug — es la causa más probable. Si se vuelve
molesto, ese test puede ir a un job aparte que corra menos seguido.

### 4. Dev y producción comparten la MISMA base de datos

No es algo que rompió hoy, pero es la causa de la mitad de esta lista: cualquier migración aplicada desde
dev **ya está viva en producción**, y cualquier dato que dejen los tests es dato real. Por eso las
migraciones de esta tanda no necesitaron deploy de Vercel para tener efecto, y por eso el punto 1 y el 2
son problemas.

### 5. La caja del turno Tarde quedó en $0

El helper de los tests clickea "Registrar" en el modal de Fondo de caja (no "Omitir", que es puro estado
de React y reaparece en cada test). Eso persiste `efectivo_apertura = $0` en el turno real del día. Ver
[[E2E-tests]].

### 6. La herramienta de navegador rompía la app

Cuando intentaba verificar cosas clickeando en el navegador integrado, la aplicación se cerraba. Lo
salteé y verifiqué por otros dos caminos, que resultaron mejores igual: **tests E2E** contra el sitio
desplegado y **llamadas SQL directas** a las funciones con una sesión autenticada simulada. Todo lo de
esta tanda quedó verificado así, no "a ojo".

---

## 📋 Los 15 issues que quedan abiertos

Ninguno está bloqueado técnicamente — todos necesitan que decidas **cómo querés que funcionen**, porque
son decisiones de tu negocio y no del código.

**Necesitan que definas reglas del negocio:**
- **#9 Propinas** — ¿porcentaje sugerido? ¿se reparte entre los mozos o va a cada uno? ¿entra al arqueo
  de caja? ¿se imprime en el ticket?
- **#10 Delivery** — ¿zonas y costo de envío? ¿repartidores propios? ¿se integra con alguna app?
- **#22 Recurrencia de gastos fijos** — ¿qué gastos? ¿se generan solos cada mes o hay que confirmarlos?
- **#21 Permisos granulares por acción** — hoy es Ver/Editar por sección; separar crear/borrar/exportar
  cambia el modelo de permisos entero.

**Modelo de datos nuevo, conviene charlarlo antes:**
- **#13 Conversión de unidades** (comprás en kg, la receta usa gramos)
- **#14 Lotes y vencimientos**
- **#17 Auditoría de cambios** — ¿qué se audita y por cuánto tiempo se guarda?
- **#20 Multi-sucursal** — el más grande de todos, toca prácticamente todo el schema.

**Los más directos, si querés que siga por acá:**
- **#15 Costeo y margen visibles** — el motor de costeo ya funciona, falta mostrarlo. Poco riesgo.
- **#18 Exportación (CSV/PDF)** — `jspdf` ya está en el proyecto.
- **#19 Rentabilidad y rango de fechas custom** — extiende Reportes, que ya toqué.
- **#24 Conectar Proveedores con la compra de insumos**
- **#23 Vincular legajo de empleado con la cuenta de login**
- **#25 Ruteo real por URL (React Router)** — refactor grande pero mecánico; hoy la navegación es estado
  de React, así que no se puede compartir un link a una pantalla ni funciona el botón "atrás".

**Relacionado:** [[Index]], [[E2E-tests]], [[Auth]], [[Papelera]], [[Arquitectura]]
