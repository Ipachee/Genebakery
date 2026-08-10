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

  const porProducto = new Map<string, number>();
  type ItemVendido = { cantidad: number | string; productos: { nombre: string } | { nombre: string }[] | null };
  for (const it of (itemsVendidos as ItemVendido[] | undefined) ?? []) {
    const nombre = Array.isArray(it.productos) ? it.productos[0]?.nombre : it.productos?.nombre;
    if (!nombre) continue;
    porProducto.set(nombre, (porProducto.get(nombre) ?? 0) + Number(it.cantidad));
  }
  const topProductos = [...porProducto.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

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

          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <div className="card card-pad" style={{ flex: '1 1 220px' }}>
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

            <div className="card card-pad" style={{ flex: '1 1 220px' }}>
              <div className="field-label" style={{ marginBottom: 10 }}>
                Más vendidos
              </div>
              {topProductos.length === 0 ? (
                <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: 0 }}>Sin datos todavía.</p>
              ) : (
                topProductos.map(([nombre, cantidad]) => (
                  <div key={nombre} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span>{nombre}</span>
                    <strong>{cantidad}</strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
