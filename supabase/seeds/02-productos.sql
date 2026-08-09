-- Carga el menú real (calcado del prototipo) en la tabla productos.
truncate table productos restart identity cascade;

insert into productos (nombre, categoria, precio) values
  ('Café espresso', 'bebida', 2500),
  ('Café con leche', 'bebida', 3000),
  ('Capuccino', 'bebida', 3500),
  ('Latte', 'bebida', 3500),
  ('Té / infusión', 'bebida', 2500),
  ('Chocolate caliente', 'bebida', 3600),
  ('Jugo de naranja', 'bebida', 3200),
  ('Licuado de fruta', 'bebida', 3800),
  ('Gaseosa', 'bebida', 2800),
  ('Agua mineral', 'bebida', 2000),
  ('Tostado J&Q', 'comida', 4500),
  ('Sandwich de miga', 'comida', 4000),
  ('Bagel', 'comida', 4200),
  ('Ensalada', 'comida', 5200),
  ('Medialunas (2)', 'pasteleria', 2200),
  ('Croissant', 'pasteleria', 2800),
  ('Torta del día', 'pasteleria', 3800),
  ('Tarta salada', 'pasteleria', 4800),
  ('Alfajor', 'pasteleria', 2000),
  ('Budín', 'pasteleria', 3000);
