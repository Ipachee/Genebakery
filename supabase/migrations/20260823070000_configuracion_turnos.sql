-- Qué turnos (Mañana/Tarde/Noche) existen cada día de la semana. La
-- pantalla de login la necesita ANTES de autenticar (para decidir qué
-- tarjetas de turno mostrar hoy), por eso el select es público, igual
-- que roles_personalizados -- no hay nada sensible acá.
create table configuracion_turnos (
  id bigint generated always as identity primary key,
  -- 1 = lunes ... 7 = domingo, mismo criterio que extract(isodow from ...)
  dia_isodow smallint not null check (dia_isodow between 1 and 7),
  etiqueta text not null check (etiqueta in ('Mañana', 'Tarde', 'Noche')),
  activo boolean not null default true,
  unique (dia_isodow, etiqueta)
);

alter table configuracion_turnos enable row level security;

create policy "cualquiera lee configuracion_turnos" on configuracion_turnos for select
  using (true);

create policy "admin edita configuracion_turnos" on configuracion_turnos for update
  using (public.is_admin()) with check (public.is_admin());

-- Seed con el horario real pedido: lunes a jueves mañana/tarde, viernes y
-- sábado los 3 turnos, domingo solo tarde.
insert into configuracion_turnos (dia_isodow, etiqueta, activo)
select dia, etiqueta, case
  when dia between 1 and 4 then etiqueta in ('Mañana', 'Tarde')
  when dia in (5, 6) then true
  else etiqueta = 'Tarde' -- domingo (7)
end
from generate_series(1, 7) as dia
cross join (values ('Mañana'), ('Tarde'), ('Noche')) as t(etiqueta);
