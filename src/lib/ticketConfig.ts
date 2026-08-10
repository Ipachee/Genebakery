export type TicketConfig = {
  fuente: 'mono' | 'sans';
  tamano: number;
  ancho: 58 | 80;
  nombreLocal: string;
  pie: string;
};

const KEY = 'comandacafe-ticket-config';

export const TICKET_CONFIG_DEFAULT: TicketConfig = {
  fuente: 'mono',
  tamano: 13,
  ancho: 80,
  nombreLocal: 'ComandaCafé',
  pie: '¡Gracias por tu visita!',
};

export function getTicketConfig(): TicketConfig {
  try {
    const guardado = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return { ...TICKET_CONFIG_DEFAULT, ...guardado };
  } catch {
    return TICKET_CONFIG_DEFAULT;
  }
}

export function setTicketConfig(cfg: TicketConfig) {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}
