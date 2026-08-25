-- Bug encontrado el 25/08/2026 al crear un proyecto de Supabase nuevo
-- (comandacafe-dev) y correrle todas las migraciones de punta a punta:
-- `20260821020000_take_away.sql` inserta la mesa "Take away" asumiendo que
-- ya existe al menos un salón (`select id from salones order by id limit
-- 1`) -- cierto en producción (ya tenía salones cargados a mano desde
-- antes), pero rompe en cualquier base nueva sin salones todavía.
--
-- Fechada A PROPÓSITO justo antes de esa migración (que ya está aplicada
-- en producción, no se toca la historia) para que en cualquier proyecto
-- nuevo se aplique en el orden correcto: primero existe un salón, después
-- take_away puede usarlo. `where not exists` la hace inofensiva en
-- producción (ya tiene salones cargados, no hace nada ahí).
insert into salones (nombre, x, y, w, h)
select 'Salón 1', 0, 0, 800, 600
where not exists (select 1 from salones);
