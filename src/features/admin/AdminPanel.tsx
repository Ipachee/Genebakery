import { useState } from 'react';
import { InsumosView } from '../insumos/components/InsumosView';
import { RecetasView } from '../recetas/components/RecetasView';
import { ElaboradosView } from '../elaborados/components/ElaboradosView';
import { GastosView } from '../gastos/components/GastosView';
import { VentasView } from '../ventas/components/VentasView';
import { MovimientosView } from '../movimientos/components/MovimientosView';
import { ClientesView } from '../clientes/components/ClientesView';
import { EmpleadosView } from '../empleados/components/EmpleadosView';
import { PapeleraView } from '../papelera/components/PapeleraView';

const TABS = [
  { id: 'insumos', label: 'Insumos', Componente: InsumosView },
  { id: 'recetas', label: 'Recetas', Componente: RecetasView },
  { id: 'elaborados', label: 'Elaborados', Componente: ElaboradosView },
  { id: 'gastos', label: 'Gastos', Componente: GastosView },
  { id: 'ventas', label: 'Ventas', Componente: VentasView },
  { id: 'movimientos', label: 'Movimientos', Componente: MovimientosView },
  { id: 'clientes', label: 'Clientes', Componente: ClientesView },
  { id: 'empleados', label: 'Empleados', Componente: EmpleadosView },
  { id: 'papelera', label: 'Papelera', Componente: PapeleraView },
] as const;

export function AdminPanel() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('insumos');
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
