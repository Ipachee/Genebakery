import { useState } from 'react';
import { InsumosView } from '../insumos/components/InsumosView';
import { RecetasView } from '../recetas/components/RecetasView';
import { ElaboradosView } from '../elaborados/components/ElaboradosView';
import { GastosView } from '../gastos/components/GastosView';

const TABS = [
  { id: 'insumos', label: 'Insumos', Componente: InsumosView },
  { id: 'recetas', label: 'Recetas', Componente: RecetasView },
  { id: 'elaborados', label: 'Elaborados', Componente: ElaboradosView },
  { id: 'gastos', label: 'Gastos', Componente: GastosView },
] as const;

export function AdminPanel() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('insumos');
  const Activo = TABS.find((t) => t.id === tab)!.Componente;

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '7px 14px',
              borderRadius: 5,
              border: '1px solid var(--border)',
              background: tab === t.id ? 'var(--brown-dark)' : 'var(--surface)',
              color: tab === t.id ? '#fff' : 'var(--text)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Activo />
    </div>
  );
}
