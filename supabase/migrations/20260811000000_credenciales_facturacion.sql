-- Credenciales para facturación electrónica (AFIP/ARCA, directo o vía un
-- intermediario tipo Tusfacturas) -- todavía sin definir cuál exactamente,
-- así que los campos son genéricos. Lo importante es CÓMO se guardan: la
-- tabla no tiene ninguna policy de select/insert/update para ningún rol,
-- ni siquiera admin. Todo el acceso pasa por dos funciones security
-- definer: una devuelve solo METADATOS (¿está configurado? ¿con qué
-- proveedor? ¿cuándo?) sin exponer el valor, y la otra permite
-- ACTUALIZAR sin nunca leer el valor anterior. Así, aunque alguien
-- comprometa una sesión de admin (o encuentre un agujero de RLS), no hay
-- ninguna consulta posible que devuelva la clave en texto plano.
create table credenciales_facturacion (
  id bigint primary key default 1,
  proveedor text,
  usuario text,
  clave_secreta text,
  token_api text,
  actualizado_at timestamptz not null default now(),
  actualizado_por uuid references profiles(id),
  constraint credenciales_facturacion_singleton check (id = 1)
);

alter table credenciales_facturacion enable row level security;
-- Sin policies: RLS deniega todo por default, incluso para admin.

create or replace function public.fn_estado_credenciales_facturacion()
returns table(configurado boolean, proveedor text, actualizado_at timestamptz, actualizado_por_nombre text)
language plpgsql
security definer
set search_path = public
stable
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
    v_row.actualizado_at,
    (select trim(concat(p.nombre, ' ', p.apellido)) from profiles p where p.id = v_row.actualizado_por);
end;
$$;

revoke execute on function public.fn_estado_credenciales_facturacion() from public;
grant execute on function public.fn_estado_credenciales_facturacion() to authenticated;

-- Los parámetros en blanco/null NO borran lo que ya había cargado (para
-- poder cambiar solo el proveedor sin tener que volver a tipear la clave,
-- por ejemplo). Para borrar un campo puntual habría que ir directo a la
-- base -- no hay botón de "borrar" en la UI a propósito.
create or replace function public.fn_guardar_credenciales_facturacion(
  p_proveedor text,
  p_usuario text default null,
  p_clave_secreta text default null,
  p_token_api text default null
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

  insert into credenciales_facturacion (id, proveedor, usuario, clave_secreta, token_api, actualizado_at, actualizado_por)
  values (1, p_proveedor, nullif(p_usuario, ''), nullif(p_clave_secreta, ''), nullif(p_token_api, ''), now(), auth.uid())
  on conflict (id) do update set
    proveedor = p_proveedor,
    usuario = coalesce(nullif(p_usuario, ''), credenciales_facturacion.usuario),
    clave_secreta = coalesce(nullif(p_clave_secreta, ''), credenciales_facturacion.clave_secreta),
    token_api = coalesce(nullif(p_token_api, ''), credenciales_facturacion.token_api),
    actualizado_at = now(),
    actualizado_por = auth.uid();
end;
$$;

revoke execute on function public.fn_guardar_credenciales_facturacion(text, text, text, text) from public;
grant execute on function public.fn_guardar_credenciales_facturacion(text, text, text, text) to authenticated;
