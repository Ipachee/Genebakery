import { useState } from 'react';
import {
  useActualizarActivoProducto,
  useActualizarDestinoProducto,
  useCrearProducto,
  useInsumos,
  useProductos,
  useRecetaDeProducto,
  useRecetaMutations,
} from '../hooks';
import { useCategorias } from '../../categorias/hooks';
import { usePuedeEditar } from '../../permisos/hooks';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { Field, Select, TextInput } from '../../../components/Field';
import { EmptyState } from '../../../components/EmptyState';
import { Card } from '../../../components/Card';

export function RecetasView() {
  const puedeEditar = usePuedeEditar('recetas');
  const { data: productos } = useProductos();
  const { data: insumos } = useInsumos();
  const { data: categorias } = useCategorias();
  const [productoId, setProductoId] = useState<number | null>(null);
  const { data: receta } = useRecetaDeProducto(productoId);
  const mutations = useRecetaMutations(productoId);
  const crearProducto = useCrearProducto();
  const actualizarActivo = useActualizarActivoProducto();
  const actualizarDestino = useActualizarDestinoProducto();
  const productoSeleccionado = productos?.find((p) => p.id === productoId) ?? null;
  const destinoCategoria = categorias?.find((c) => c.nombre === productoSeleccionado?.categoria)?.destino ?? 'cocina';

  const [insumoId, setInsumoId] = useState<number | ''>('');
  const [cantidad, setCantidad] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [cantidadEditada, setCantidadEditada] = useState('');

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
              {p.nombre} ({p.categoria}){!p.activo ? ' — pausado' : ''}
            </option>
          ))}
        </Select>
        {puedeEditar && (
          <Button variant="secondary" onClick={() => setCreandoProducto((v) => !v)}>
            {creandoProducto ? 'cancelar' : '+ Nuevo producto'}
          </Button>
        )}
      </div>

      {puedeEditar && creandoProducto && (
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

      {productoId && productoSeleccionado && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="field-label" style={{ margin: 0 }}>
                {productoSeleccionado.nombre}
              </span>
              <Badge tone={productoSeleccionado.activo ? 'good' : 'warn'}>
                {productoSeleccionado.activo ? 'En carta' : 'Pausado'}
              </Badge>
            </div>
            {puedeEditar && (
              <Button
                variant="secondary"
                size="sm"
                disabled={actualizarActivo.isPending}
                onClick={() => actualizarActivo.mutate({ id: productoSeleccionado.id, activo: !productoSeleccionado.activo })}
              >
                {productoSeleccionado.activo ? '⏸️ Pausar (sacar de la carta)' : '▶️ Volver a la carta'}
              </Button>
            )}
          </div>
          {!productoSeleccionado.activo && (
            <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>
              Pausado: no aparece en el menú de Comandar pedidos hasta que se reactive. La receta sigue acá, intacta.
            </p>
          )}

          <Field label="A qué ticket sale">
            {puedeEditar ? (
              <Select
                value={productoSeleccionado.destino ?? destinoCategoria}
                onChange={(e) => actualizarDestino.mutate({ id: productoSeleccionado.id, destino: e.target.value as 'cocina' | 'barra' })}
                style={{ maxWidth: 160 }}
              >
                <option value="cocina">Cocina</option>
                <option value="barra">Barra</option>
              </Select>
            ) : (
              <span style={{ fontSize: 13.5 }}>{(productoSeleccionado.destino ?? destinoCategoria) === 'barra' ? 'Barra' : 'Cocina'}</span>
            )}
          </Field>
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
              {editandoId === r.id ? (
                <>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {r.insumos?.nombre} —
                    <TextInput
                      type="number"
                      autoFocus
                      value={cantidadEditada}
                      onChange={(e) => setCantidadEditada(e.target.value)}
                      style={{ width: 80 }}
                    />
                    {r.insumos?.unidad}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button
                      variant="success"
                      size="sm"
                      aria-label="Guardar cantidad"
                      disabled={!cantidadEditada || Number(cantidadEditada) <= 0}
                      onClick={() => {
                        mutations.agregar.mutate({ insumoId: r.insumo_id, cantidad: Number(cantidadEditada) });
                        setEditandoId(null);
                      }}
                    >
                      ✓
                    </Button>
                    <Button variant="secondary" size="sm" aria-label="Cancelar edición" onClick={() => setEditandoId(null)}>
                      ✕
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <span>
                    {r.insumos?.nombre} — <strong>{r.cantidad}</strong> {r.insumos?.unidad}
                  </span>
                  {puedeEditar && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-label={`Editar cantidad de ${r.insumos?.nombre}`}
                        onClick={() => {
                          setEditandoId(r.id);
                          setCantidadEditada(String(r.cantidad));
                        }}
                      >
                        ✏️
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        aria-label={`Quitar ${r.insumos?.nombre} de la receta`}
                        onClick={() => mutations.quitar.mutate(r.id)}
                      >
                        🗑
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {puedeEditar && (
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
          )}
        </Card>
      )}
    </div>
  );
}
