-- Carga el plano real del local (calcado del layout que ya tenías en el
-- prototipo), para que el salón no arranque vacío en la demo.
--
-- Las mesas se insertan una por una (no con INSERT...SELECT...JOIN) para
-- garantizar que el id autoincremental respete el mismo orden/numeración
-- que tenían en el prototipo original.
truncate table mesas restart identity cascade;
truncate table salones restart identity cascade;

insert into salones (nombre, x, y, w, h, tag, orden) values
  ('Salón 3', 10, 10, 290, 195, null, 3),
  ('Salón 2', 305, 10, 345, 280, null, 2),
  ('Salón 1', 655, 10, 460, 280, 'Salida →', 1),
  ('Cuartito', 10, 210, 290, 110, null, 4),
  ('Baño', 120, 325, 95, 105, null, 5),
  ('Baño', 10, 410, 105, 75, null, 6),
  ('Cocina', 655, 195, 65, 95, null, 7);

insert into mesas (salon_id, x, y, w, h, shape) values ((select id from salones where nombre = 'Salón 1'), 1030, 100, 55, 55, 'square');
insert into mesas (salon_id, x, y, w, h, shape) values ((select id from salones where nombre = 'Salón 1'), 900,  20,  55, 55, 'square');
insert into mesas (salon_id, x, y, w, h, shape) values ((select id from salones where nombre = 'Salón 1'), 712,  95,  55, 55, 'square');
insert into mesas (salon_id, x, y, w, h, shape) values ((select id from salones where nombre = 'Salón 2'), 555,  40,  68, 46, 'square');
insert into mesas (salon_id, x, y, w, h, shape) values ((select id from salones where nombre = 'Salón 2'), 310,  35,  55, 55, 'square');
insert into mesas (salon_id, x, y, w, h, shape) values ((select id from salones where nombre = 'Salón 2'), 310,  105, 68, 46, 'square');
insert into mesas (salon_id, x, y, w, h, shape) values ((select id from salones where nombre = 'Salón 2'), 505,  215, 55, 55, 'square');
insert into mesas (salon_id, x, y, w, h, shape) values ((select id from salones where nombre = 'Salón 2'), 370,  215, 55, 55, 'square');
insert into mesas (salon_id, x, y, w, h, shape) values ((select id from salones where nombre = 'Salón 3'), 215,  78,  68, 46, 'square');
insert into mesas (salon_id, x, y, w, h, shape) values ((select id from salones where nombre = 'Salón 3'), 25,   45,  68, 46, 'square');
insert into mesas (salon_id, x, y, w, h, shape) values ((select id from salones where nombre = 'Salón 3'), 30,   128, 68, 46, 'square');
insert into mesas (salon_id, x, y, w, h, shape) values ((select id from salones where nombre = 'Cuartito'), 165, 240, 55, 55, 'square');
