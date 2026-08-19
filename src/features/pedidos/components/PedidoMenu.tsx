import { fmtMoney as fmt } from '../../../lib/format';
import { useCategorias } from '../../categorias/hooks';
import type { Database } from '../../../lib/supabase/types';

type Producto = Database['public']['Tables']['productos']['Row'];

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
  const { data: categorias } = useCategorias();
  return (
    <div className="pedido-menu">
      <div className="pedido-cat-tabs">
        {categorias?.map((c) => (
          <button key={c.id} className={`pedido-cat-tab ${categoria === c.nombre ? 'active' : ''}`} onClick={() => onCategoria(c.nombre)}>
            {c.nombre}
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
