import { useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import { usePuedeEditar } from '../../permisos/hooks';
import { useElaboradoMutations, useElaborados } from '../hooks';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/Button';
import { TextInput } from '../../../components/Field';
import { Badge } from '../../../components/Badge';
import { EmptyState } from '../../../components/EmptyState';
import { useConfirm } from '../../../components/ConfirmDialog';
import { Card } from '../../../components/Card';
import { fmtMoneyDecimal as fmt } from '../../../lib/format';
import { NuevoElaboradoModal } from './NuevoElaboradoModal';

type Elaborado = NonNullable<ReturnType<typeof useElaborados>['data']>[number];

export function ElaboradosView() {
  const puedeEditar = usePuedeEditar('elaborados');
  const { session } = useAuth();
  const { data: elaborados, isLoading } = useElaborados();
  const mutations = useElaboradoMutations();

  const [producciones, setProducciones] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Elaborado | null>(null);
  const { confirm, dialog } = useConfirm();

  async function producir(elaboradoId: number) {
    if (!session) return;
    const cantidad = Number(producciones[elaboradoId]);
    if (!cantidad) return;
    setError(null);
    try {
      await mutations.producir.mutateAsync({ elaboradoId, cantidadUnidades: cantidad, usuarioId: session.user.id });
      setProducciones({ ...producciones, [elaboradoId]: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la producción');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader
        title="Elaborados"
        subtitle="Se producen en unidades (ej. una torta entera) y se venden por porción."
        action={
          puedeEditar ? (
            <Button variant="primary" onClick={() => setModalAbierto(true)}>
              + Nuevo elaborado
            </Button>
          ) : undefined
        }
      />

      {error && (
        <p style={{ color: 'var(--red)', fontSize: 13, background: 'var(--red-soft)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>{error}</p>
      )}

      {isLoading ? (
        <EmptyState>Cargando…</EmptyState>
      ) : !elaborados?.length ? (
        <EmptyState>Todavía no cargaste elaborados.</EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {elaborados.map((e) => {
            const bajo = Number(e.stock_porciones) <= Number(e.porciones_min);
            return (
              <Card key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <div>
                  <strong>{e.nombre}</strong>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', margin: '2px 0 4px' }}>
                    {e.productos?.nombre} · {e.porciones_por_unidad} porciones/unidad · costo/porción {fmt.format(Number(e.costo_unit_porcion))}
                  </div>
                  <div style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                    Stock: <strong>{e.stock_porciones}</strong> porciones {bajo && <Badge tone="warn">bajo</Badge>}
                  </div>
                </div>
                {puedeEditar && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <TextInput
                      placeholder="Unidades hechas"
                      type="number"
                      value={producciones[e.id] ?? ''}
                      onChange={(ev) => setProducciones({ ...producciones, [e.id]: ev.target.value })}
                      style={{ width: 120 }}
                    />
                    <Button variant="success" size="sm" onClick={() => producir(e.id)}>
                      Registrar producción
                    </Button>
                    <Button variant="secondary" size="sm" aria-label={`Editar ${e.nombre}`} onClick={() => setEditando(e)}>
                      ✏️
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      aria-label={`Borrar ${e.nombre}`}
                      onClick={async () => {
                        if (await confirm(`¿Borrar el elaborado "${e.nombre}"?`)) mutations.borrar.mutate(e.id);
                      }}
                    >
                      🗑
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {modalAbierto && <NuevoElaboradoModal onClose={() => setModalAbierto(false)} />}
      {editando && <NuevoElaboradoModal elaborado={editando} onClose={() => setEditando(null)} />}
      {dialog}
    </div>
  );
}
