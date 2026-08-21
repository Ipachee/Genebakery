import { useState } from 'react';
import { useCrearProducto, useInsumos, useProductos, useRecetaDeProducto, useRecetaMutations } from '../hooks';
import { useCategorias } from '../../categorias/hooks';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/Button';
import { Field, Select, TextInput } from '../../../components/Field';
import { EmptyState } from '../../../components/EmptyState';
import { Card } from '../../../components/Card';

export function RecetasView() {
  const { data: productos } = useProductos();
  const { data: insumos } = useInsumos();
  const { data: categorias } = useCategorias();
  const [productoId, setProductoId] = useState<number | null>(null);
  const { data: receta } = useRecetaDeProducto(productoId);
  const mutations = useRecetaMutations(productoId);
  const crearProducto = useCrearProducto();

  const [insumoId, setInsumoId] = useState<number | ''>('');
  const [cantidad, setCantidad] = useState('');

  const [creandoProducto, setCreandoProducto] = useState(false);
  const [nuevoProducto, setNuevoProducto] = useState({ nombre: '', categoria: '', precio: '' });

  const insumosUsados = new Set(receta?.map((r) => r.insumo_id));

  async function crearYSeleccionar() {
    if (!nuevoProducto.nombre || !nuevoProducto.categoria || !nuevoProducto.precio) return;
    const creado = await crearProducto.mutateAsync({
      nombre: nuevoProducto.nombre,
      categoria: nuevoProducto.categoria,
      precio: Number(nuevoProducto.precio),
    });
    setProductoId(creado.id);
    setNuevoProducto({ nombre: '', categoria: '', precio: '' });
    setCreandoProducto(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: 520 }}>
      <PageHeader title="Recetas" subtitle="Qué insumos y en qué cantidad lleva cada producto. Para un elaborado, es la receta de UNA unidad completa." />

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <Select value={productoId ?? ''} onChange={(e) => setProductoId(e.target.value ? Number(e.target.value) : null)} style={{ flex: 1 }}>
          <option value="">Elegí un producto…</option>
          {productos?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} ({p.categoria})
            </option>
          ))}
        </Select>
        <Button variant="secondary" onClick={() => setCreandoProducto((v) => !v)}>
          {creandoProducto ? 'cancelar' : '+ Nuevo producto'}
        </Button>
      </div>

      {creandoProducto && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Field label="Nombre del plato/producto">
            <TextInput
              placeholder="Ej: Tarta de jamón y queso"
              value={nuevoProducto.nombre}
              onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })}
            />
          </Field>
          <Field label="Categoría">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {categorias?.map((c) => (
                <Button
                  key={c.id}
                  size="sm"
                  variant={nuevoProducto.categoria === c.nombre ? 'primary' : 'secondary'}
                  onClick={() => setNuevoProducto({ ...nuevoProducto, categoria: c.nombre })}
                >
                  {c.nombre}
                </Button>
              ))}
            </div>
          </Field>
          <Field label="Precio de venta">
            <TextInput
              type="number"
              placeholder="0"
              value={nuevoProducto.precio}
              onChange={(e) => setNuevoProducto({ ...nuevoProducto, precio: e.target.value })}
            />
          </Field>
          <Button variant="primary" onClick={crearYSeleccionar}>
            Crear y cargar receta
          </Button>
        </Card>
      )}

      {productoId && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {receta?.length === 0 && <EmptyState>Sin receta cargada todavía.</EmptyState>}
          {receta?.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                fontSize: 13.5,
                background: 'var(--surface-sunken)',
              }}
            >
              <span>
                {r.insumos?.nombre} — <strong>{r.cantidad}</strong> {r.insumos?.unidad}
              </span>
              <Button variant="danger" size="sm" aria-label={`Quitar ${r.insumos?.nombre} de la receta`} onClick={() => mutations.quitar.mutate(r.id)}>
                🗑
              </Button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <Select value={insumoId} onChange={(e) => setInsumoId(e.target.value ? Number(e.target.value) : '')} style={{ flex: 1 }}>
              <option value="">Insumo…</option>
              {insumos
                ?.filter((i) => !insumosUsados.has(i.id))
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre} ({i.unidad})
                  </option>
                ))}
            </Select>
            <TextInput placeholder="Cantidad" type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} style={{ width: 100 }} />
            <Button
              variant="primary"
              onClick={() => {
                if (!insumoId || !cantidad) return;
                mutations.agregar.mutate({ insumoId, cantidad: Number(cantidad) });
                setInsumoId('');
                setCantidad('');
              }}
            >
              + Agregar
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
