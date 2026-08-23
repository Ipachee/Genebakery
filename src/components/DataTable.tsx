import { useState, type ReactNode } from 'react';

export function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="table-wrap">
      <table className="data-table">{children}</table>
    </div>
  );
}

export type Orden<T extends string> = { col: T; dir: 'asc' | 'desc' };

// Estado de orden reusado por toda tabla que se ordena clickeando el
// título de la columna (en vez de un <select> aparte) -- clickear nombra
// esa columna como la ordenada; clickearla de nuevo invierte A-Z/Z-A.
export function useOrdenTabla<T extends string>(colInicial: T, dirInicial: Orden<T>['dir'] = 'asc') {
  const [orden, setOrden] = useState<Orden<T>>({ col: colInicial, dir: dirInicial });
  function alClickear(col: T) {
    setOrden((o) => (o.col === col ? { col, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));
  }
  return { orden, alClickear, setOrden };
}

export function ThOrdenable<T extends string>({
  col,
  orden,
  onOrdenar,
  children,
  align,
}: {
  col: T;
  orden: Orden<T>;
  onOrdenar: (col: T) => void;
  children: ReactNode;
  align?: 'right';
}) {
  const activo = orden.col === col;
  return (
    <th
      className="th-ordenable"
      onClick={() => onOrdenar(col)}
      aria-sort={activo ? (orden.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      style={align === 'right' ? { textAlign: 'right' } : undefined}
    >
      {children}
      <span className={`th-ordenable-flecha ${activo ? 'activa' : ''}`}>{activo && orden.dir === 'desc' ? '▼' : '▲'}</span>
    </th>
  );
}
