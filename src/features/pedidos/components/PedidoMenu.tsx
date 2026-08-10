import { fmtMoney as fmt } from '../../../lib/format';
import type { Database } from '../../../lib/supabase/types';

type Producto = Database['public']['Tables']['productos']['Row'];

const CATEGORIAS: { id: Producto['categoria']; label: string }[] = [
  { id: 'bebida', label: 'Bebidas' },
  { id: 'comida', label: 'Comidas' },
  { id: 'pasteleria', label: 'Pastelería' },
  { id: 'noche', label: 'Noche' },
];

export function PedidoMenu({
  productos,
  categoria,
  onCategoria,
  onAgregar,
}: {
  productos: Producto[] | undefined;
  categoria: Producto['categoria'];
  onCategoria: (c: Producto['categoria']) => void;
  onAgregar: (p: Producto) => void;
}) {
  return (
    <div className="pedido-menu">
      <div className="pedido-cat-tabs">
        {CATEGORIAS.map((c) => (
          <button key={c.id} className={`pedido-cat-tab ${categoria === c.id ? 'active' : ''}`} onClick={() => onCategoria(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="pedido-producto-list">
        {productos
          ?.filter((p) => p.categoria === categoria)
          .map((p) => (
            <button key={p.id} className="pedido-producto-btn" onClick={() => onAgregar(p)}>
              <span>{p.nombre}</span>
              <span className="pedido-producto-precio">{fmt.format(p.precio)}</span>
            </button>
          ))}
      </div>
    </div>
  );
}
