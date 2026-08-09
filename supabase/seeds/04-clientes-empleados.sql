-- Clientes y empleados reales del prototipo (reemplaza cualquier dato de prueba).
truncate table clientes restart identity cascade;
truncate table empleados restart identity cascade;

insert into clientes (nombre, apellido, dni, cuit, direccion, condicion_fiscal, email, descuento_pct) values
  ('Carlos', 'Fernández', '25123456', '20-25123456-3', 'Av. Corrientes 1234', 'Responsable Inscripto', '', 0),
  ('Lucía', 'Fernández', '32456789', null, 'Av. Santa Fe 500', 'Consumidor Final', '', 10);

insert into empleados (nombre, apellido, dni, puesto, ingreso, descuento_pct) values
  ('María', 'Gómez', '28456123', 'Mesera', '2024-03-01', 20);
