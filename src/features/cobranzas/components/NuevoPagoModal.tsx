import { useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { useEmpleados } from '../../empleados/hooks';
import { usePagosEmpleadosMutations } from '../hooks';
import { FormModal } from '../../../components/FormModal';
import { Field, Select, TextInput } from '../../../components/Field';
import { METODOS_PAGO } from '../../../lib/pedidoConstantes';
import type { Database } from '../../../lib/supabase/types';

type Pago = Database['public']['Tables']['pagos_empleados']['Row'];

// Mismo modal para cargar y para editar -- si viene `pago`, arranca con
// esos valores y guarda con actualizar() en vez de crear().
export function NuevoPagoModal({ pago, onClose }: { pago?: Pago; onClose: () => void }) {
  const editando = !!pago;
  const { session } = useAuth();
  const { data: empleados } = useEmpleados();
  const { crear, actualizar } = usePagosEmpleadosMutations();

  const [empleadoId, setEmpleadoId] = useState(pago ? String(pago.empleado_id) : '');
  const [monto, setMonto] = useState(pago ? String(pago.monto) : '');
  const [fecha, setFecha] = useState(pago?.fecha ?? new Date().toISOString().slice(0, 10));
  const [concepto, setConcepto] = useState(pago?.concepto ?? '');
  const [metodoPago, setMetodoPago] = useState<string>(pago?.metodo_pago ?? METODOS_PAGO[0]);

  const valido = empleadoId !== '' && Number(monto) > 0 && fecha !== '';
  const guardando = editando ? actualizar.isPending : crear.isPending;
  const mutacionActiva = editando ? actualizar : crear;

  async function submit() {
    if (!session || !valido) return;
    if (editando) {
      await actualizar.mutateAsync({ id: pago.id, empleadoId: Number(empleadoId), monto: Number(monto), fecha, concepto, metodoPago });
    } else {
      await crear.mutateAsync({ empleadoId: Number(empleadoId), monto: Number(monto), fecha, concepto, metodoPago, creadoPor: session.user.id });
    }
    onClose();
  }

  return (
    <FormModal
      title={editando ? '✏️ Editar pago' : '💵 Registrar pago'}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={guardando ? 'Guardando…' : editando ? 'Guardar cambios' : '+ Registrar pago'}
      submitDisabled={!valido || guardando}
      error={mutacionActiva.isError ? mutacionActiva.error?.message : null}
    >
      <Field label="Empleado">
        <Select autoFocus value={empleadoId} onChange={(e) => setEmpleadoId(e.target.value)}>
          <option value="">Elegir empleado…</option>
          {empleados?.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre} {e.apellido}
            </option>
          ))}
        </Select>
      </Field>

      <div style={{ display: 'flex', gap: 8 }}>
        <Field label="Monto" style={{ flex: 1 }}>
          <TextInput type="number" min={0} value={monto} onChange={(e) => setMonto(e.target.value)} />
        </Field>
        <Field label="Fecha" style={{ flex: 1 }}>
          <TextInput type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Field>
      </div>

      <Field label="Método de pago">
        <Select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
          {METODOS_PAGO.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Concepto (opcional)">
        <TextInput placeholder="Ej: Sueldo agosto, Adelanto…" value={concepto} onChange={(e) => setConcepto(e.target.value)} />
      </Field>
    </FormModal>
  );
}
