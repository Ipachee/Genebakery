import { useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { useGastoMutations, useInsumos } from '../hooks';
import { useProveedores } from '../../proveedores/hooks';
import { Button } from '../../../components/Button';
import { Select, TextInput } from '../../../components/Field';

type Fila = { insumoId: string; cantidad: string; costoTotal: string };

const FILA_VACIA: Fila = { insumoId: '', cantidad: '', costoTotal: '' };

// Un proveedor típico trae varios productos juntos (ej. la distribuidora de
// bebidas) -- cargar cada uno como un gasto aparte, repitiendo el mismo
// proveedor cada vez, era tedioso. Este modal elige el proveedor UNA vez y
// permite agregar tantas filas de producto como haga falta; al confirmar,
// se registra un gasto por fila (mismo proveedor y fecha en todas), no un
// único gasto agrupado -- cada insumo recalcula su costo promedio por
// separado vía fn_registrar_gasto.
export function RegistrarGastoModal({ onClose }: { onClose: () => void }) {
  const { session } = useAuth();
  const { data: insumos } = useInsumos();
  const { data: proveedores } = useProveedores();
  const { registrar, registrarServicio } = useGastoMutations();

  const [tipo, setTipo] = useState<'insumo' | 'servicio'>('insumo');
  const [proveedor, setProveedor] = useState('');
  const [filas, setFilas] = useState<Fila[]>([{ ...FILA_VACIA }]);
  const [concepto, setConcepto] = useState('');
  const [costoServicio, setCostoServicio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function actualizarFila(i: number, campo: keyof Fila, valor: string) {
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, [campo]: valor } : f)));
  }

  function agregarFila() {
    setFilas((prev) => [...prev, { ...FILA_VACIA }]);
  }

  function quitarFila(i: number) {
    setFilas((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  const filasValidas = filas.filter((f) => f.insumoId && Number(f.cantidad) > 0 && Number(f.costoTotal) > 0);
  const servicioValido = concepto.trim() !== '' && Number(costoServicio) > 0;
  const puedeConfirmar = tipo === 'insumo' ? filasValidas.length > 0 : servicioValido;

  async function confirmar() {
    if (!session || !puedeConfirmar) return;
    setError(null);
    setGuardando(true);
    try {
      if (tipo === 'servicio') {
        await registrarServicio.mutateAsync({
          concepto: concepto.trim(),
          costoTotal: Number(costoServicio),
          proveedor,
          usuarioId: session.user.id,
        });
      } else {
        // Secuencial, no Promise.all: si dos filas repiten el mismo insumo (dos
        // entregas distintas del mismo pedido), el costo promedio ponderado de
        // ese insumo tiene que recalcularse una compra a la vez, en orden.
        for (const f of filasValidas) {
          await registrar.mutateAsync({
            insumoId: Number(f.insumoId),
            cantidad: Number(f.cantidad),
            costoTotal: Number(f.costoTotal),
            proveedor,
            usuarioId: session.user.id,
          });
        }
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el gasto');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="pedido-overlay" onClick={onClose}>
      <div className="pedido-modal" style={{ width: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="pedido-modal-header">
          <h3>🧾 Registrar gasto</h3>
          <button className="pedido-close" aria-label="Cerrar" onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ padding: 'var(--space-5)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>
              Tipo de gasto
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button variant={tipo === 'insumo' ? 'primary' : 'secondary'} size="sm" onClick={() => setTipo('insumo')}>
                📦 Insumo
              </Button>
              <Button variant={tipo === 'servicio' ? 'primary' : 'secondary'} size="sm" onClick={() => setTipo('servicio')}>
                💡 Servicio (luz, gas, alquiler…)
              </Button>
            </div>
          </div>

          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>
              Proveedor {tipo === 'servicio' && '(opcional)'}
            </div>
            <Select value={proveedor} onChange={(e) => setProveedor(e.target.value)}>
              <option value="">Proveedor…</option>
              {proveedores?.map((p) => (
                <option key={p.id} value={p.nombre}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </div>

          <div style={{ borderTop: '1px solid var(--border)' }} />

          {tipo === 'servicio' ? (
            <div>
              <div className="field-label" style={{ marginBottom: 8 }}>
                Servicio
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <TextInput
                  placeholder="Concepto (ej: Luz agosto, Alquiler)"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  style={{ flex: 2, minWidth: 0 }}
                  autoFocus
                />
                <TextInput
                  type="number"
                  min={0}
                  placeholder="Monto $"
                  value={costoServicio}
                  onChange={(e) => setCostoServicio(e.target.value)}
                  style={{ flex: 1, minWidth: 0 }}
                />
              </div>
            </div>
          ) : (
          <div>
            <div className="field-label" style={{ marginBottom: 8 }}>
              Productos
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filas.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Select
                    value={f.insumoId}
                    onChange={(e) => actualizarFila(i, 'insumoId', e.target.value)}
                    style={{ flex: 2, minWidth: 0 }}
                  >
                    <option value="">Insumo comprado…</option>
                    {insumos?.map((ins) => (
                      <option key={ins.id} value={ins.id}>
                        {ins.nombre} ({ins.unidad})
                      </option>
                    ))}
                  </Select>
                  <TextInput
                    type="number"
                    min={0}
                    placeholder="Cantidad"
                    value={f.cantidad}
                    onChange={(e) => actualizarFila(i, 'cantidad', e.target.value)}
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  <TextInput
                    type="number"
                    min={0}
                    placeholder="Costo total $"
                    value={f.costoTotal}
                    onChange={(e) => actualizarFila(i, 'costoTotal', e.target.value)}
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => quitarFila(i)}
                    disabled={filas.length === 1}
                    title="Quitar producto"
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={agregarFila} style={{ marginTop: 8 }}>
              + Agregar producto
            </Button>
          </div>
          )}

          {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={confirmar} disabled={guardando || !puedeConfirmar}>
              {guardando
                ? 'Guardando…'
                : tipo === 'servicio'
                  ? '+ Registrar gasto'
                  : `+ Registrar gasto${filasValidas.length > 1 ? ` (${filasValidas.length})` : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
