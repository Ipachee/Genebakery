import { useState } from 'react';
import { usePapelera, usePapeleraMutations } from '../hooks';
import { useAuth } from '../../../auth/useAuth';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';
import { useConfirm } from '../../../components/ConfirmDialog';

const TIPO_LABEL: Record<string, string> = {
  insumo: 'Insumo',
  producto: 'Producto',
  mesa: 'Mesa',
  salon: 'Salón',
  cliente: 'Cliente',
  empleado: 'Empleado',
  elaborado: 'Elaborado',
  produccion: 'Producción',
  pedido: 'Pedido',
  venta: 'Venta',
  gasto: 'Gasto',
  proveedor: 'Proveedor',
  factura_proveedor: 'Factura',
  categoria: 'Categoría',
  elemento_decorativo: 'Elemento del plano',
  factura_electronica: 'Factura',
  calendario_equipo: 'Calendario',
  pago_empleado: 'Pago a empleado',
};

export function PapeleraView() {
  const { data: papelera, isLoading } = usePapelera();
  const { restaurar, purgar } = usePapeleraMutations();
  const { profile } = useAuth();
  const { confirm, dialog } = useConfirm();
  const [errorPurga, setErrorPurga] = useState<string | null>(null);

  // Restaurar lo puede hacer cualquiera que llegue a esta pantalla; eliminar
  // definitivamente NO tiene vuelta atrás, así que va sólo para admin -- la
  // función fn_purgar_papelera lo exige igual del lado del servidor, esto
  // es para no mostrar un botón que después rebota. Ver docs/Papelera.md.
  const puedePurgar = profile?.rol === 'admin';

  async function eliminarDefinitivo(tipo: string, id: number, resumen: string) {
    setErrorPurga(null);
    const ok = await confirm(`¿Eliminar definitivamente "${resumen}"? Esto no se puede deshacer.`);
    if (!ok) return;
    purgar.mutate({ tipo, id }, { onError: (e: unknown) => setErrorPurga(e instanceof Error ? e.message : 'No se pudo eliminar') });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Papelera" />

      {errorPurga && (
        <div className="card card-pad" style={{ color: 'var(--red)', fontSize: 13 }}>
          {errorPurga}
        </div>
      )}

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !papelera?.length ? (
        <EmptyState>La papelera está vacía.</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Resumen</th>
              <th>Borrado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {papelera.map((p) => (
              <tr key={`${p.tipo}-${p.id}`}>
                <td>
                  <Badge tone="neutral">{TIPO_LABEL[p.tipo ?? ''] ?? p.tipo}</Badge>
                </td>
                <td>{p.resumen}</td>
                <td style={{ color: 'var(--text-dim)' }}>{p.deleted_at ? new Date(p.deleted_at).toLocaleString('es-AR') : '—'}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <Button variant="secondary" size="sm" onClick={() => p.tipo && p.id && restaurar.mutate({ tipo: p.tipo, id: p.id })}>
                    ↺ Restaurar
                  </Button>
                  {puedePurgar && (
                    <Button
                      variant="danger"
                      size="sm"
                      aria-label={`Eliminar definitivamente ${p.resumen ?? ''}`}
                      onClick={() => p.tipo && p.id && eliminarDefinitivo(p.tipo, p.id, p.resumen ?? `#${p.id}`)}
                    >
                      🗑 Eliminar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      {dialog}
    </div>
  );
}
