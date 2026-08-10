import { useState } from 'react';
import { getTicketConfig, setTicketConfig, type TicketConfig } from '../../../lib/ticketConfig';
import { PageHeader } from '../../../components/PageHeader';
import { Button } from '../../../components/Button';
import { Field, TextInput } from '../../../components/Field';

const MOCK_PEDIDO = {
  id: 0,
  mesa_id: 5,
  enviado_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  pedido_items: [
    { id: 1, cantidad: '2.00', nota: 'sin azúcar', productos: { nombre: 'Café con leche' } },
    { id: 2, cantidad: '1.00', nota: '', productos: { nombre: 'Medialunas (2)' } },
  ],
} as never;

export function TipografiaTicketView() {
  const [cfg, setCfg] = useState<TicketConfig>(getTicketConfig());
  const [guardado, setGuardado] = useState(false);

  function actualizar<K extends keyof TicketConfig>(campo: K, valor: TicketConfig[K]) {
    setCfg((c) => ({ ...c, [campo]: valor }));
    setGuardado(false);
  }

  function guardar() {
    setTicketConfig(cfg);
    setGuardado(true);
  }

  const anchoPx = cfg.ancho === 58 ? 210 : 280;
  const fontFamily = cfg.fuente === 'mono' ? 'ui-monospace, Consolas, monospace' : 'Arial, sans-serif';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader title="Tipografía del ticket" subtitle="Cómo se ve el ticket que se imprime desde la Comandera." />

      <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', minWidth: 260 }}>
          <Field label="Nombre del local (encabezado)">
            <TextInput value={cfg.nombreLocal} onChange={(e) => actualizar('nombreLocal', e.target.value)} />
          </Field>
          <Field label="Fuente">
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant={cfg.fuente === 'mono' ? 'primary' : 'secondary'} size="sm" onClick={() => actualizar('fuente', 'mono')}>
                Monoespaciada
              </Button>
              <Button variant={cfg.fuente === 'sans' ? 'primary' : 'secondary'} size="sm" onClick={() => actualizar('fuente', 'sans')}>
                De palo
              </Button>
            </div>
          </Field>
          <Field label={`Tamaño de letra (${cfg.tamano}px)`}>
            <input
              type="range"
              min={10}
              max={18}
              value={cfg.tamano}
              onChange={(e) => actualizar('tamano', Number(e.target.value))}
            />
          </Field>
          <Field label="Ancho de papel">
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant={cfg.ancho === 58 ? 'primary' : 'secondary'} size="sm" onClick={() => actualizar('ancho', 58)}>
                58mm
              </Button>
              <Button variant={cfg.ancho === 80 ? 'primary' : 'secondary'} size="sm" onClick={() => actualizar('ancho', 80)}>
                80mm
              </Button>
            </div>
          </Field>
          <Field label="Pie del ticket">
            <TextInput value={cfg.pie} onChange={(e) => actualizar('pie', e.target.value)} />
          </Field>
          <Button variant="primary" onClick={guardar}>
            {guardado ? '✓ Guardado' : 'Guardar'}
          </Button>
          <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: 0 }}>
            Se guarda en esta computadora — es la que va a estar conectada a la impresora.
          </p>
        </div>

        <div>
          <div className="field-label" style={{ marginBottom: 8 }}>
            Preview
          </div>
          <div
            style={{
              width: anchoPx + 24,
              padding: 12,
              background: '#fff',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ width: anchoPx, fontFamily, fontSize: cfg.tamano, color: '#000' }}>
              <div style={{ textAlign: 'center', fontWeight: 700, fontSize: cfg.tamano + 3, marginBottom: 4 }}>{cfg.nombreLocal}</div>
              <div style={{ textAlign: 'center', marginBottom: 6 }}>COMANDA — COCINA/BARRA</div>
              <hr style={{ border: 'none', borderTop: '1px dashed #000' }} />
              <div style={{ margin: '6px 0' }}>
                <div>
                  <strong>Mesa:</strong> 5
                </div>
                <div>
                  <strong>Hora:</strong> {new Date().toLocaleTimeString('es-AR')}
                </div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px dashed #000' }} />
              <div style={{ margin: '6px 0' }}>
                {(MOCK_PEDIDO as { pedido_items: { id: number; cantidad: string; nota: string; productos: { nombre: string } }[] }).pedido_items.map((it) => (
                  <div key={it.id} style={{ marginBottom: 4 }}>
                    <div>
                      {it.cantidad.replace('.00', '')}x {it.productos.nombre}
                    </div>
                    {it.nota && <div style={{ paddingLeft: 12, fontStyle: 'italic' }}>· {it.nota}</div>}
                  </div>
                ))}
              </div>
              <hr style={{ border: 'none', borderTop: '1px dashed #000' }} />
              <div style={{ textAlign: 'center', marginTop: 6 }}>{cfg.pie}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
