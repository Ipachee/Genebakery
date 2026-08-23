import { useState } from 'react';
import { useEstadoCredenciales, useGuardarCredenciales } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { Field, TextInput, Select } from '../../../components/Field';
import { Button } from '../../../components/Button';

const VACIO = { proveedor: '', usuario: '', claveSecreta: '', tokenApi: '', modo: 'dev' as 'dev' | 'prod' };

export function FacturacionView() {
  const { data: estado, isLoading } = useEstadoCredenciales();
  const guardar = useGuardarCredenciales();
  const [form, setForm] = useState(VACIO);
  const [guardado, setGuardado] = useState(false);

  function actualizar<K extends keyof typeof VACIO>(campo: K, valor: (typeof VACIO)[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setGuardado(false);
  }

  async function onGuardar() {
    if (!form.proveedor) return;
    await guardar.mutateAsync(form);
    // Se limpian los campos sensibles apenas se guardan -- no tiene sentido
    // que queden tipeados en pantalla (ni se podrían volver a mostrar de
    // todos modos, porque el servidor nunca los devuelve). El modo elegido
    // sí se mantiene en el formulario, no es sensible.
    setForm((f) => ({ ...VACIO, modo: f.modo }));
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--green)', fontWeight: 700 }}>✅ Configurado</span>
              {estado.proveedor && <span style={{ color: 'var(--text-dim)' }}>· {estado.proveedor}</span>}
              <span className={`badge ${estado.modo === 'prod' ? 'badge-warn' : 'badge-info'}`}>
                {estado.modo === 'prod' ? '🔴 Producción (real)' : '🧪 Prueba'}
              </span>
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

      <Field label="Modo">
        <Select value={form.modo} onChange={(e) => actualizar('modo', e.target.value as 'dev' | 'prod')}>
          <option value="dev">🧪 Prueba (testing) -- no emite comprobantes reales</option>
          <option value="prod">🔴 Producción -- emite facturas reales, cuenta ante ARCA</option>
        </Select>
      </Field>

      <Field label="Proveedor">
        <Select value={form.proveedor} onChange={(e) => actualizar('proveedor', e.target.value)}>
          <option value="">Elegí uno…</option>
          <option value="afip_directo">AFIP/ARCA directo (Clave Fiscal)</option>
          <option value="afipsdk">AfipSDK</option>
          <option value="tusfacturas">Tusfacturas.app</option>
          <option value="otro">Otro intermediario</option>
        </Select>
      </Field>

      {form.proveedor === 'afipsdk' && (
        <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0, background: 'var(--surface-sunken)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
          Con AfipSDK: el <strong>access_token</strong> de tu cuenta va en "Token / API key" de abajo. En modo Prueba
          dejá "Usuario / CUIT" vacío (se usa el CUIT de demo de AfipSDK); en Producción poné el CUIT real del
          negocio ahí.
        </p>
      )}

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
        Con AfipSDK configurado, "🧾 Generar factura" en Ventas ya llama de verdad a ARCA (real o de prueba según el
        modo de arriba) y trae el CAE. Los demás proveedores todavía dejan el pedido en "pendiente" nomás.
      </p>
    </div>
  );
}
