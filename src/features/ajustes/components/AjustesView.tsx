import { useState } from 'react';
import { TipografiaTicketView } from './TipografiaTicketView';
import { ReportesView } from '../../reportes/components/ReportesView';

const TABS = [
  { id: 'tipografia', label: 'Tipografía del ticket', Componente: TipografiaTicketView },
  { id: 'reportes', label: 'Reportes', Componente: ReportesView },
] as const;

export function AjustesView() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('tipografia');
  const Activo = TABS.find((t) => t.id === tab)!.Componente;

  return (
    <div>
      <div className="tabs" style={{ marginBottom: 'var(--space-5)' }}>
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <Activo />
    </div>
  );
}
