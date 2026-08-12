import { useState } from 'react';
import { useProductoMasVendido, useVentasPorRango } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { EmptyState } from '../../../components/EmptyState';
import { fmtMoney as fmt } from '../../../lib/format';

export function ReportesView() {
  const [rango, setRango] = useState<'semana' | 'mes'>('semana');
  const { data: ventas, isLoading } = useVentasPorRango(rango);
  const { data: itemsVendidos } = useProductoMasVendido(rango);

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

  const porProducto = new Map<string, { cantidad: number; facturado: number }>();
  type ItemVendido = {
    cantidad: number | string;
    precio_unitario: number | string;
    productos: { nombre: string } | { nombre: string }[] | null;
  };
  for (const it of (itemsVendidos as ItemVendido[] | undefined) ?? []) {
    const nombre = Array.isArray(it.productos) ? it.productos[0]?.nombre : it.productos?.nombre;
    if (!nombre) continue;
    const actual = porProducto.get(nombre) ?? { cantidad: 0, facturado: 0 };
    actual.cantidad += Number(it.cantidad);
    actual.facturado += Number(it.cantidad) * Number(it.precio_unitario);
    porProducto.set(nombre, actual);
  }
  const topProductos = [...porProducto.entries()].sort((a, b) => b[1].cantidad - a[1].cantidad).slice(0, 10);
  const maxCantidad = Math.max(1, ...topProductos.map(([, v]) => v.cantidad));
  const MEDALLAS = ['🥇', '🥈', '🥉'];

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
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 2 }}>Total facturado</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{fmt.format(totalPeriodo)}</div>
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
