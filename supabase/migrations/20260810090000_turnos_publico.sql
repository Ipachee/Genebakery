-- Estado de los turnos (abierto/cerrado) visible SIN login, para mostrar en
-- la pantalla de inicio de sesion cual turno esta abierto. Expone solo
-- etiqueta + estado -- nada de quien lo abrio ni datos de facturacion.
create view turnos_publico as
  select distinct on (etiqueta) etiqueta, estado
  from turnos
  order by etiqueta, abierto_at desc;

grant select on turnos_publico to anon, authenticated;
