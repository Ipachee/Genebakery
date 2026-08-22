import { useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { useEmpleados } from '../../empleados/hooks';
import { useCalendarioMutations } from '../hooks';
import { FormModal } from '../../../components/FormModal';
import { Field, Select, TextInput } from '../../../components/Field';

type Tipo = 'turno_asignado' | 'vacaciones' | 'evento';

export function NuevaEntradaCalendarioModal({ fechaInicial, onClose }: { fechaInicial: string; onClose: () => void }) {
  const { session } = useAuth();
  const { data: empleados } = useEmpleados();
  const { crear } = useCalendarioMutations();

  const [tipo, setTipo] = useState<Tipo>('turno_asignado');
  const [empleadoId, setEmpleadoId] = useState('');
  const [turnoEtiqueta, setTurnoEtiqueta] = useState('Mañana');
  const [titulo, setTitulo] = useState('');
  const [nota, setNota] = useState('');
  const [fechaInicio, setFechaInicio] = useState(fechaInicial);
  const [fechaFin, setFechaFin] = useState(fechaInicial);

  const valido =
    fechaInicio &&
    fechaFin &&
    fechaFin >= fechaInicio &&
    (tipo === 'evento' ? titulo.trim() !== '' : empleadoId !== '');

  async function submit() {
    if (!session || !valido) return;
    await crear.mutateAsync({
      tipo,
      fechaInicio,
      fechaFin,
      empleadoId: tipo === 'evento' ? null : Number(empleadoId),
      turnoEtiqueta: tipo === 'turno_asignado' ? turnoEtiqueta : null,
      titulo: tipo === 'evento' ? titulo.trim() : null,
      nota: nota.trim() || null,
      creadoPor: session.user.id,
    });
    onClose();
  }

  return (
    <FormModal
      title="📅 Agregar al calendario"
      onClose={onClose}
      onSubmit={submit}
      submitLabel={crear.isPending ? 'Guardando…' : '+ Agregar'}
      submitDisabled={!valido || crear.isPending}
      error={crear.isError ? crear.error?.message : null}
    >
      <Field label="Tipo">
        <Select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
          <option value="turno_asignado">🕐 Turno asignado</option>
          <option value="vacaciones">🌴 Vacaciones</option>
          <option value="evento">📌 Evento (feriado, reunión, etc.)</option>
        </Select>
      </Field>

      <div style={{ display: 'flex', gap: 8 }}>
        <Field label="Desde" style={{ flex: 1 }}>
          <TextInput type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
        </Field>
        <Field label="Hasta" style={{ flex: 1 }}>
          <TextInput type="date" value={fechaFin} min={fechaInicio} onChange={(e) => setFechaFin(e.target.value)} />
        </Field>
      </div>

      {tipo === 'evento' ? (
        <Field label="Título del evento">
          <TextInput autoFocus placeholder="Ej: Feriado, Reunión de equipo…" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </Field>
      ) : (
        <Field label="Empleado">
          <Select value={empleadoId} onChange={(e) => setEmpleadoId(e.target.value)}>
            <option value="">Elegir empleado…</option>
            {empleados?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre} {e.apellido}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {tipo === 'turno_asignado' && (
        <Field label="Turno">
          <Select value={turnoEtiqueta} onChange={(e) => setTurnoEtiqueta(e.target.value)}>
            <option value="Mañana">☀️ Mañana</option>
            <option value="Tarde">🌙 Tarde</option>
            <option value="Noche">🍽️ Noche</option>
          </Select>
        </Field>
      )}

      <Field label="Nota (opcional)">
        <TextInput placeholder="Alguna aclaración…" value={nota} onChange={(e) => setNota(e.target.value)} />
      </Field>
    </FormModal>
  );
}
