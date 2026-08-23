import { useState } from 'react';
import { useEstadoCredenciales, useGuardarCredenciales } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { Field, TextInput, Select } from '../../../components/Field';
import { Button } from '../../../components/Button';

const VACIO = { proveedor: '', usuario: '', claveSecreta: '', tokenApi: '' };

export function FacturacionView() {
  const { data: estado, isLoading } = useEstadoCredenciales();
  const guardar = useGuardarCredenciales();
  const [form, setForm] = useState(VACIO);
  const [guardado, setGuardado] = useState(false);

  function actualizar<K extends keyof typeof VACIO>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setGuardado(false);
  }

  async function onGuardar() {
    if (!form.proveedor) return;
    await guardar.mutateAsync(form);
    // Se limpian los campos sensibles apenas se guardan -- no tiene sentido
    // que queden tipeados en pantalla (ni se podrían volver a mostrar de
    // todos modos, porque el servidor nunca los devuelve).
    setForm(VACIO);
    setGuardado(true);
  }

  if (isLoading) return <p>Cargando…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: 480 }}>
      <PageHeader
        title="Facturación electrónica"
        subtitle="Credenciales para AFIP/ARCA (directo o vía un intermediario). Se guardan de forma write-only: una vez cargadas, ni siquiera un admin puede volver a leerlas desde acá -- solo actualizarlas."
      />

      <div className="card card-pad" style={{ fontSize: 13 }}>
        {estado?.configurado ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ color: 'var(--green)', fontWeight: 700 }}>✅ Configurado</span>
              {estado.proveedor && <span style={{ color: 'var(--text-dim)' }}>· {estado.proveedor}</span>}
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>
              {estado.actualizado_at &&
                `Última actualización: ${new Date(estado.actualizado_at).toLocaleString('es-AR')}`}
              {estado.actualizado_por_nombre && ` · ${estado.actualizado_por_nombre}`}
            </div>
          </>
        ) : (
          <span style={{ color: 'var(--text-dim)' }}>⚠️ Todavía no se cargó ninguna credencial.</span>
        )}
      </div>

      <Field label="Proveedor">
        <Select value={form.proveedor} onChange={(e) => actualizar('proveedor', e.target.value)}>
          <option value="">Elegí uno…</option>
          <option value="afip_directo">AFIP/ARCA directo (Clave Fiscal)</option>
          <option value="afipsdk">AfipSDK</option>
          <option value="tusfacturas">Tusfacturas.app</option>
          <option value="otro">Otro intermediario</option>
        </Select>
      </Field>
      <Field label="Usuario / CUIT de acceso">
        <TextInput
          value={form.usuario}
          onChange={(e) => actualizar('usuario', e.target.value)}
          placeholder={estado?.configurado ? 'Dejar en blanco para no cambiarlo' : '20-12345678-9'}
        />
      </Field>
      <Field label="Clave Fiscal / contraseña">
        <TextInput
          type="password"
          value={form.claveSecreta}
          onChange={(e) => actualizar('claveSecreta', e.target.value)}
          placeholder={estado?.configurado ? 'Dejar en blanco para no cambiarla' : '••••••••'}
          autoComplete="new-password"
        />
      </Field>
      <Field label="Token / API key (si el proveedor usa uno)">
        <TextInput
          type="password"
          value={form.tokenApi}
          onChange={(e) => actualizar('tokenApi', e.target.value)}
          placeholder={estado?.configurado ? 'Dejar en blanco para no cambiarlo' : 'Opcional'}
          autoComplete="new-password"
        />
      </Field>

      <Button variant="primary" onClick={onGuardar} disabled={guardar.isPending || !form.proveedor}>
        {guardado ? '✓ Guardado' : 'Guardar'}
      </Button>
      {guardar.isError && (
        <p style={{ color: 'var(--red)', fontSize: 12, margin: 0 }}>{guardar.error?.message}</p>
      )}

      <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: 0 }}>
        Esto todavía no factura nada automáticamente -- es solo el lugar seguro donde queda guardada la credencial
        para cuando se conecte la emisión real de comprobantes.
      </p>
    </div>
  );
}
