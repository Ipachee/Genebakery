-- Modo testing vs producción para la facturación electrónica -- separa
-- las credenciales de prueba (que hoy se están cargando) de las reales,
-- así el día que se conecte con la cuenta real del local alcanza con
-- cambiar este selector (y la clave), sin tocar código ni mezclar
-- comprobantes de prueba con comprobantes reales.
alter table public.credenciales_facturacion
  add column modo text not null default 'dev' check (modo in ('dev', 'prod'));

drop function if exists public.fn_estado_credenciales_facturacion();

create function public.fn_estado_credenciales_facturacion()
returns table (configurado boolean, proveedor text, modo text, actualizado_at timestamptz, actualizado_por_nombre text)
language plpgsql
stable security definer
set search_path = public
as $$
declare
  v_row credenciales_facturacion;
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  select * into v_row from credenciales_facturacion where id = 1;

  return query select
    coalesce(v_row.clave_secreta is not null or v_row.token_api is not null, false),
    v_row.proveedor,
    coalesce(v_row.modo, 'dev'),
    v_row.actualizado_at,
    (select trim(concat(p.nombre, ' ', p.apellido)) from profiles p where p.id = v_row.actualizado_por);
end;
$$;

create or replace function public.fn_guardar_credenciales_facturacion(
  p_proveedor text,
  p_usuario text default null,
  p_clave_secreta text default null,
  p_token_api text default null,
  p_modo text default 'dev'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;
  if p_modo not in ('dev', 'prod') then
    raise exception 'modo inválido';
  end if;

  insert into credenciales_facturacion (id, proveedor, usuario, clave_secreta, token_api, modo, actualizado_at, actualizado_por)
  values (1, p_proveedor, nullif(p_usuario, ''), nullif(p_clave_secreta, ''), nullif(p_token_api, ''), p_modo, now(), auth.uid())
  on conflict (id) do update set
    proveedor = p_proveedor,
    usuario = coalesce(nullif(p_usuario, ''), credenciales_facturacion.usuario),
    clave_secreta = coalesce(nullif(p_clave_secreta, ''), credenciales_facturacion.clave_secreta),
    token_api = coalesce(nullif(p_token_api, ''), credenciales_facturacion.token_api),
    modo = p_modo,
    actualizado_at = now(),
    actualizado_por = auth.uid();
end;
$$;
