-- Arqueo de caja: cuánto efectivo hay al abrir el turno (fondo inicial) y
-- cuánto se contó al cerrar. Ambas son opcionales (numeric nullable) -- no
-- se obliga a nadie a contar la plata, pero si lo hacen queda guardado para
-- poder comparar contra lo que dice el sistema (fondo + efectivo cobrado).
alter table turnos
  add column efectivo_apertura numeric(10, 2),
  add column efectivo_cierre_contado numeric(10, 2);
