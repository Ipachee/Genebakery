import { useEffect, useState } from 'react';
import { usePerfilNegocio, useGuardarPerfilNegocio } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { Field, TextInput } from '../../../components/Field';
import { Button } from '../../../components/Button';

const VACIO = { nombreFiscal: '', cuit: '', direccion: '', telefono: '', email: '', condicionIva: '' };

export function PerfilNegocioView() {
  const { data: perfil, isLoading } = usePerfilNegocio();
  const guardar = useGuardarPerfilNegocio();
  const [form, setForm] = useState(VACIO);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (perfil) {
      setForm({
        nombreFiscal: perfil.nombre_fiscal ?? '',
        cuit: perfil.cuit ?? '',
        direccion: perfil.direccion ?? '',
        telefono: perfil.telefono ?? '',
        email: perfil.email ?? '',
        condicionIva: perfil.condicion_iva ?? '',
      });
    }
  }, [perfil]);

  function actualizar<K extends keyof typeof VACIO>(campo: K, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setGuardado(false);
  }

  async function onGuardar() {
    await guardar.mutateAsync(form);
    setGuardado(true);
  }

  if (isLoading) return <p>Cargando…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: 480 }}>
      <PageHeader
        title="Perfil del negocio"
        subtitle="Datos fiscales y de contacto — no son secretos, son los mismos que van en cualquier factura. Se usan como membrete en el PDF de cierre de turno."
      />

      <Field label="Nombre fiscal / razón social">
        <TextInput value={form.nombreFiscal} onChange={(e) => actualizar('nombreFiscal', e.target.value)} placeholder="Ej: Café de Nacho SRL" />
      </Field>
      <Field label="CUIT">
        <TextInput value={form.cuit} onChange={(e) => actualizar('cuit', e.target.value)} placeholder="20-12345678-9" />
      </Field>
      <Field label="Condición frente al IVA">
        <TextInput value={form.condicionIva} onChange={(e) => actualizar('condicionIva', e.target.value)} placeholder="Responsable Inscripto / Monotributo" />
      </Field>
      <Field label="Dirección">
        <TextInput value={form.direccion} onChange={(e) => actualizar('direccion', e.target.value)} placeholder="Av. Siempre Viva 123" />
      </Field>
      <Field label="Teléfono">
        <TextInput value={form.telefono} onChange={(e) => actualizar('telefono', e.target.value)} placeholder="011 1234-5678" />
      </Field>
      <Field label="Email de contacto">
        <TextInput type="email" value={form.email} onChange={(e) => actualizar('email', e.target.value)} placeholder="contacto@cafe.com" />
      </Field>

      <Button variant="primary" onClick={onGuardar} disabled={guardar.isPending}>
        {guardado ? '✓ Guardado' : 'Guardar'}
      </Button>

      <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: 0 }}>
        Las credenciales de AFIP o Mercado Pago no van acá — esas se configuran aparte, como secretos de servidor, para
        que ni siquiera queden visibles dentro de la app.
      </p>
    </div>
  );
}
