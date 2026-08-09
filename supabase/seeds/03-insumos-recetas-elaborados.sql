-- Carga los insumos, recetas y el elaborado reales del prototipo.
truncate table insumos restart identity cascade;
truncate table elaborados restart identity cascade;

insert into insumos (nombre, unidad, stock, stock_inicial, costo_unit, stock_min) values
  ('Café en grano', 'kg', 5, 5, 9000, 1),
  ('Leche', 'L', 12, 12, 1200, 3),
  ('Azúcar', 'kg', 6, 6, 1500, 1),
  ('Pan de miga', 'unid', 40, 40, 150, 10),
  ('Jamón', 'kg', 3, 3, 8000, 0.5),
  ('Queso', 'kg', 3, 3, 9000, 0.5),
  ('Harina', 'kg', 10, 10, 1000, 2),
  ('Manteca', 'kg', 2, 2, 4500, 0.5),
  ('Huevos', 'unid', 30, 30, 200, 6),
  ('Naranjas', 'kg', 8, 8, 1200, 2),
  ('Gaseosa (botella)', 'unid', 24, 24, 1200, 6),
  ('Agua mineral (botella)', 'unid', 24, 24, 800, 6),
  ('Chocolate taza', 'kg', 2, 2, 6000, 0.3),
  ('Medialunas (masa)', 'unid', 60, 60, 250, 12),
  ('Croissant', 'unid', 20, 20, 600, 5),
  ('Bagel', 'unid', 15, 15, 700, 5),
  ('Torta (porción)', 'unid', 12, 12, 1200, 3),
  ('Tarta (porción)', 'unid', 10, 10, 1500, 3),
  ('Mix ensalada', 'kg', 4, 4, 3500, 1),
  ('Alfajor', 'unid', 30, 30, 800, 6),
  ('Budín (porción)', 'unid', 15, 15, 900, 3),
  ('Té (saquitos)', 'unid', 50, 50, 150, 10);

insert into recetas (producto_id, insumo_id, cantidad)
select p.id, i.id, r.cantidad from (values
  ('Café espresso', 'Café en grano', 0.02),
  ('Café con leche', 'Café en grano', 0.018),
  ('Café con leche', 'Leche', 0.15),
  ('Capuccino', 'Café en grano', 0.018),
  ('Capuccino', 'Leche', 0.12),
  ('Latte', 'Café en grano', 0.018),
  ('Latte', 'Leche', 0.2),
  ('Té / infusión', 'Té (saquitos)', 1),
  ('Chocolate caliente', 'Chocolate taza', 0.03),
  ('Chocolate caliente', 'Leche', 0.15),
  ('Jugo de naranja', 'Naranjas', 0.3),
  ('Licuado de fruta', 'Leche', 0.15),
  ('Licuado de fruta', 'Naranjas', 0.2),
  ('Gaseosa', 'Gaseosa (botella)', 1),
  ('Agua mineral', 'Agua mineral (botella)', 1),
  ('Medialunas (2)', 'Medialunas (masa)', 2),
  ('Tostado J&Q', 'Pan de miga', 2),
  ('Tostado J&Q', 'Jamón', 0.05),
  ('Tostado J&Q', 'Queso', 0.05),
  ('Sandwich de miga', 'Pan de miga', 3),
  ('Sandwich de miga', 'Jamón', 0.04),
  ('Sandwich de miga', 'Queso', 0.04),
  ('Croissant', 'Croissant', 1),
  ('Bagel', 'Bagel', 1),
  ('Tarta salada', 'Tarta (porción)', 1),
  ('Ensalada', 'Mix ensalada', 0.25),
  ('Alfajor', 'Alfajor', 1),
  ('Budín', 'Budín (porción)', 1)
) as r(producto_nombre, insumo_nombre, cantidad)
join productos p on p.nombre = r.producto_nombre
join insumos i on i.nombre = r.insumo_nombre;

insert into elaborados (nombre, producto_id, porciones_por_unidad, porciones_min)
select 'Torta de chocolate', p.id, 8, 4 from productos p where p.nombre = 'Torta del día';
