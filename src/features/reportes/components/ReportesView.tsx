import { useState } from 'react';
import { useGastosPorRango, useProductoMasVendido, useVentasPorRango } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState } from '../../../components/EmptyState';
import { fmtMoney as fmt } from '../../../lib/format';

export function ReportesView() {
  const [rango, setRango] = useState<'semana' | 'mes'>('semana');
  const { data: ventas, isLoading } = useVentasPorRango(rango);
  const { data: itemsVendidos } = useProductoMasVendido(rango);
  const { data: gastosRango } = useGastosPorRango(rango);
  const totalGastos = (gastosRango ?? []).reduce((s, g) => s + Number(g.monto), 0);

  const porDia = new Map<string, number>();
  for (const v of ventas ?? []) {
    const dia = new Date(v.created_at).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
    porDia.set(dia, (porDia.get(dia) ?? 0) + Number(v.total));
  }
  const dias = [...porDia.entries()];
  const maxDia = Math.max(1, ...dias.map(([, total]) => total));
  const totalPeriodo = dias.reduce((s, [, t]) => s + t, 0);

  const porMetodo = new Map<string, number>();
  for (const v of ventas ?? []) {
    porMetodo.set(v.metodo_pago, (porMetodo.get(v.metodo_pago) ?? 0) + Number(v.total));
  }

  const resumenTipo = { mesaCant: 0, mesaTotal: 0, takeAwayCant: 0, takeAwayTotal: 0 };
  for (const v of ventas ?? []) {
    if (v.mesas?.es_take_away) {
      resumenTipo.takeAwayCant++;
      resumenTipo.takeAwayTotal += Number(v.total);
    } else {
      resumenTipo.mesaCant++;
      resumenTipo.mesaTotal += Number(v.total);
    }
  }

  const porProducto = new Map<string, { cantidad: number; facturado: number }>();
  // dia -> (nombre de producto -> cantidad), para poder sacar el más
  // vendido de CADA día en vez de solo el del período entero.
  const porProductoYDia = new Map<string, Map<string, number>>();
  type ItemVendido = {
    cantidad: number | string;
    precio_unitario: number | string;
    productos: { nombre: string } | { nombre: string }[] | null;
    pedidos: { created_at: string } | { created_at: string }[] | null;
  };
  for (const it of (itemsVendidos as ItemVendido[] | undefined) ?? []) {
    const nombre = Array.isArray(it.productos) ? it.productos[0]?.nombre : it.productos?.nombre;
    if (!nombre) continue;
    const actual = porProducto.get(nombre) ?? { cantidad: 0, facturado: 0 };
    actual.cantidad += Number(it.cantidad);
    actual.facturado += Number(it.cantidad) * Number(it.precio_unitario);
    porProducto.set(nombre, actual);

    const pedido = Array.isArray(it.pedidos) ? it.pedidos[0] : it.pedidos;
    if (pedido?.created_at) {
      const dia = new Date(pedido.created_at).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
      const mapaDia = porProductoYDia.get(dia) ?? new Map<string, number>();
      mapaDia.set(nombre, (mapaDia.get(nombre) ?? 0) + Number(it.cantidad));
      porProductoYDia.set(dia, mapaDia);
    }
  }
  const topProductos = [...porProducto.entries()].sort((a, b) => b[1].cantidad - a[1].cantidad).slice(0, 10);
  const maxCantidad = Math.max(1, ...topProductos.map(([, v]) => v.cantidad));
  const MEDALLAS = ['🥇', '🥈', '🥉'];

  const topPorDia = dias.map(([dia]) => {
    const mapaDia = porProductoYDia.get(dia);
    if (!mapaDia || mapaDia.size === 0) return { dia, nombre: null, cantidad: 0 };
    const [nombre, cantidad] = [...mapaDia.entries()].sort((a, b) => b[1] - a[1])[0];
    return { dia, nombre, cantidad };
  });
  const maxCantidadDia = Math.max(1, ...topPorDia.map((d) => d.cantidad));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader
        title="Reportes"
        subtitle="Ventas de los últimos 7 o 30 días."
        action={
          <div className="tabs">
            <button className={`tab ${rango === 'semana' ? 'active' : ''}`} onClick={() => setRango('semana')}>
              Semanal
            </button>
            <button className={`tab ${rango === 'mes' ? 'active' : ''}`} onClick={() => setRango('mes')}>
              Mensual
            </button>
          </div>
        }
      />

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !dias.length ? (
        <EmptyState>Todavía no hay ventas en este período.</EmptyState>
      ) : (
        <>
          <div className="card card-pad">
            <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 2 }}>Total facturado</div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>{fmt.format(totalPeriodo)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 2 }}>Gastos del período</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--red)' }}>-{fmt.format(totalGastos)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 2 }}>Neto</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: totalPeriodo - totalGastos >= 0 ? 'var(--terracota-dark)' : 'var(--red)' }}>
                  {fmt.format(totalPeriodo - totalGastos)}
                </div>
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <div className="field-label" style={{ marginBottom: 10 }}>
              Mesa vs. take away
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, minWidth: 160, fontSize: 13 }}>
                <span>🪑 Mesa ({resumenTipo.mesaCant})</span>
                <strong>{fmt.format(resumenTipo.mesaTotal)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, minWidth: 160, fontSize: 13 }}>
                <span>🛍️ Take away ({resumenTipo.takeAwayCant})</span>
                <strong>{fmt.format(resumenTipo.takeAwayTotal)}</strong>
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <div className="field-label" style={{ marginBottom: 12 }}>
              Ventas por día
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, overflowX: 'auto' }}>
              {dias.map(([dia, total]) => (
                <div key={dia} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 44 }}>
                  <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{fmt.format(total).replace('ARS', '').trim()}</span>
                  <div
                    style={{
                      width: 26,
                      height: Math.max(4, (total / maxDia) * 100),
                      background: 'var(--terracota)',
                      borderRadius: 4,
                    }}
                  />
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'center' }}>{dia}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <div className="field-label" style={{ marginBottom: 12 }}>
              Lo más vendido por día
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150, overflowX: 'auto' }}>
              {topPorDia.map(({ dia, nombre, cantidad }) => (
                <div key={dia} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 72 }}>
                  <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{nombre ? `${cantidad} un.` : '—'}</span>
                  <div
                    style={{
                      width: 26,
                      height: Math.max(4, (cantidad / maxCantidadDia) * 90),
                      background: 'var(--terracota)',
                      borderRadius: 4,
                    }}
                  />
                  <span
                    title={nombre ?? ''}
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: 'var(--brown-dark)',
                      textAlign: 'center',
                      maxWidth: 72,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {nombre ?? '—'}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'center' }}>{dia}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-pad">
            <div className="field-label" style={{ marginBottom: 10 }}>
              Por método de pago
            </div>
            {[...porMetodo.entries()].map(([metodo, total]) => (
              <div key={metodo} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span>{metodo}</span>
                <strong>{fmt.format(total)}</strong>
              </div>
            ))}
          </div>

          <div className="card card-pad">
            <div className="field-label" style={{ marginBottom: 12 }}>
              🏆 Ranking de productos
            </div>
            {topProductos.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: 0 }}>Sin datos todavía.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topProductos.map(([nombre, v], i) => (
                  <div key={nombre} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 22, textAlign: 'center', fontSize: i < 3 ? 16 : 12.5, color: 'var(--text-dim)' }}>
                      {MEDALLAS[i] ?? i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombre}</span>
                        <span style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 8 }}>
                          <strong>{v.cantidad} un.</strong>
                          <span style={{ color: 'var(--text-dim)' }}>{fmt.format(v.facturado)}</span>
                        </span>
                      </div>
                      <div style={{ height: 5, borderRadius: 3, background: 'var(--surface-sunken)', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${(v.cantidad / maxCantidad) * 100}%`,
                            background: 'var(--terracota)',
                            borderRadius: 3,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
