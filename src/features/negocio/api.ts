import { supabase } from '../../lib/supabase/client';

export async function fetchPerfilNegocio() {
  const { data, error } = await supabase.from('perfil_negocio').select('*').eq('id', 1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function guardarPerfilNegocio(v: {
  nombreFiscal: string;
  cuit: string;
  direccion: string;
  telefono: string;
  email: string;
  condicionIva: string;
}) {
  const { error } = await supabase.from('perfil_negocio').upsert({
    id: 1,
    nombre_fiscal: v.nombreFiscal,
    cuit: v.cuit || null,
    direccion: v.direccion || null,
    telefono: v.telefono || null,
    email: v.email || null,
    condicion_iva: v.condicionIva || null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
