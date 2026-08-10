import { useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { useElaboradoMutations, useElaborados, useProductosSinElaborado } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/Button';
import { Select, TextInput } from '../../../components/Field';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';
import { Card } from '../../../components/Card';
import { fmtMoneyDecimal as fmt } from '../../../lib/format';

export function ElaboradosView() {
  const { session } = useAuth();
  const { data: elaborados, isLoading } = useElaborados();
  const { data: productosDisponibles } = useProductosSinElaborado();
  const mutations = useElaboradoMutations();

  const [form, setForm] = useState({ nombre: '', productoId: '', porcionesPorUnidad: '', porcionesMin: '' });
  const [producciones, setProducciones] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  function crear() {
    if (!form.nombre || !form.productoId || !form.porcionesPorUnidad) return;
    mutations.crear.mutate({
      nombre: form.nombre,
      productoId: Number(form.productoId),
      porcionesPorUnidad: Number(form.porcionesPorUnidad),
      porcionesMin: Number(form.porcionesMin) || 0,
    });
    setForm({ nombre: '', productoId: '', porcionesPorUnidad: '', porcionesMin: '' });
  }

  async function producir(elaboradoId: number) {
    if (!session) return;
    const cantidad = Number(producciones[elaboradoId]);
    if (!cantidad) return;
    setError(null);
    try {
      await mutations.producir.mutateAsync({ elaboradoId, cantidadUnidades: cantidad, usuarioId: session.user.id });
      setProducciones({ ...producciones, [elaboradoId]: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la producción');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Elaborados" subtitle="Se producen en unidades (ej. una torta entera) y se venden por porción." />

      <div className="toolbar-form">
        <TextInput placeholder="Nombre (ej: Torta de chocolate)" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} style={{ minWidth: 200 }} />
        <Select value={form.productoId} onChange={(e) => setForm({ ...form, productoId: e.target.value })} style={{ minWidth: 200 }}>
          <option value="">Producto del menú vinculado…</option>
          {productosDisponibles?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </Select>
        <TextInput placeholder="Porciones por unidad" type="number" value={form.porcionesPorUnidad} onChange={(e) => setForm({ ...form, porcionesPorUnidad: e.target.value })} style={{ width: 150 }} />
        <TextInput placeholder="Porciones mínimas" type="number" value={form.porcionesMin} onChange={(e) => setForm({ ...form, porcionesMin: e.target.value })} style={{ width: 140 }} />
        <Button variant="primary" onClick={crear}>
          + Agregar
        </Button>
      </div>

      {error && (
        <p style={{ color: 'var(--red)', fontSize: 13, background: 'var(--red-soft)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>{error}</p>
      )}

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !elaborados?.length ? (
        <EmptyState>Todavía no cargaste elaborados.</EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {elaborados.map((e) => {
            const bajo = Number(e.stock_porciones) <= Number(e.porciones_min);
            return (
              <Card key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <div>
                  <strong>{e.nombre}</strong>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', margin: '2px 0 4px' }}>
                    {e.productos?.nombre} · {e.porciones_por_unidad} porciones/unidad · costo/porción {fmt.format(Number(e.costo_unit_porcion))}
                  </div>
                  <div style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                    Stock: <strong>{e.stock_porciones}</strong> porciones {bajo && <Badge tone="warn">bajo</Badge>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <TextInput
                    placeholder="Unidades hechas"
                    type="number"
                    value={producciones[e.id] ?? ''}
                    onChange={(ev) => setProducciones({ ...producciones, [e.id]: ev.target.value })}
                    style={{ width: 120 }}
                  />
                  <Button variant="success" size="sm" onClick={() => producir(e.id)}>
                    Registrar producción
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => mutations.borrar.mutate(e.id)}>
                    🗑
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
