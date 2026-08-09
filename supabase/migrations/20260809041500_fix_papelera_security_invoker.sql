-- La vista papelera corría con los permisos de su dueño (SECURITY DEFINER
-- implícito), saltándose el RLS de las tablas que une. Con security_invoker
-- se ejecuta con los permisos de quien consulta, así que el RLS de cada
-- tabla (insumos, empleados, gastos, etc. = solo admin) vuelve a aplicar.
alter view public.papelera set (security_invoker = on);
