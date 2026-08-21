import { useState } from 'react';
import { TipografiaTicketView } from './TipografiaTicketView';
import { PerfilNegocioView } from '../../negocio/components/PerfilNegocioView';
import { FacturacionView } from '../../facturacion/components/FacturacionView';

// Reportes vivía acá adentro como pestaña porque todavía no existía un
// lugar propio en la navegación -- con el sidebar nuevo pasó a ser su
// propia sección (grupo Finanzas), así que se saca de acá para no
// duplicarla.
const TABS = [
  { id: 'negocio', label: 'Perfil del negocio', Componente: PerfilNegocioView },
  { id: 'facturacion', label: 'Facturación electrónica', Componente: FacturacionView },
  { id: 'tipografia', label: 'Tipografía del ticket', Componente: TipografiaTicketView },
] as const;

export function AjustesView() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('negocio');
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
