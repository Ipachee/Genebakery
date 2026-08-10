-- Datos fiscales/de contacto del negocio (no son secretos -- es lo mismo que
-- ya figura en cualquier factura tuya). Se usan como membrete en el PDF de
-- cierre de turno. Las credenciales realmente sensibles (AFIP, Mercado Pago)
-- NO van aca -- van como secretos de servidor en las Edge Functions.
create table perfil_negocio (
  id bigint primary key default 1,
  nombre_fiscal text not null default '',
  cuit text,
  direccion text,
  telefono text,
  email text,
  condicion_iva text,
  updated_at timestamptz not null default now(),
  constraint perfil_negocio_singleton check (id = 1)
);

alter table perfil_negocio enable row level security;

create policy "solo admin ve y edita el perfil del negocio" on perfil_negocio for all
  using (public.is_admin())
  with check (public.is_admin());
