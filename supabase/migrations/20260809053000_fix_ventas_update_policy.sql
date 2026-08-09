-- Faltaba la policy de UPDATE en ventas: solo existian insert (mozo cobra)
-- y select. Sin esto, ni "editar metodo de pago post-cobro" (funcionalidad
-- explicita del prototipo) ni el soft-delete a la papelera podian escribir
-- -RLS devolvia 403 en silencio para cualquier UPDATE.
create policy "admin edita y borra ventas" on ventas for update
  using (public.is_admin())
  with check (public.is_admin());
