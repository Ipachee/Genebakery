-- Los turno_asignado eran una sola fila con fecha_inicio/fecha_fin
-- abarcando varios días (ej: "Caro Luengo, Tarde, 25 al 30"), y el
-- calendario la dibujaba repetida en cada día del rango -- pero seguía
-- siendo UNA sola fila, así que arrastrar la "copia" de un día movía o
-- intercambiaba el rango entero (toda la semana saltaba de una),
-- rompiendo el caso real de "hoy este empleado cambia el turno con un
-- compañero" sin tocar el resto de la semana.
--
-- Se parte cada turno_asignado multi-día en una fila por día (mismo
-- empleado_id/turno_etiqueta/nota), dejando la fila original con
-- deleted_at para que quede en la papelera como registro. De acá en
-- más, crearEntrada (api.ts) ya inserta un turno_asignado por día --
-- esta migración es solo para arreglar los datos que ya existían.
insert into public.calendario_equipo (tipo, fecha_inicio, fecha_fin, empleado_id, turno_etiqueta, titulo, nota, creado_por)
select
  c.tipo,
  d::date as fecha_inicio,
  d::date as fecha_fin,
  c.empleado_id,
  c.turno_etiqueta,
  c.titulo,
  c.nota,
  c.creado_por
from public.calendario_equipo c
cross join lateral generate_series(c.fecha_inicio, c.fecha_fin, interval '1 day') as d
where c.tipo = 'turno_asignado'
  and c.fecha_inicio <> c.fecha_fin
  and c.deleted_at is null;

update public.calendario_equipo
set deleted_at = now()
where tipo = 'turno_asignado'
  and fecha_inicio <> fecha_fin
  and deleted_at is null;
