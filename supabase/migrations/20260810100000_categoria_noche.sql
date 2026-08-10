-- Suma "noche" como categoria de producto (menu de cena, viernes/sabado).
alter table productos drop constraint productos_categoria_check;
alter table productos add constraint productos_categoria_check
  check (categoria in ('bebida', 'comida', 'pasteleria', 'noche'));
