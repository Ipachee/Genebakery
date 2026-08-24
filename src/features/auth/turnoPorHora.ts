// Solo informativo (el badge de "turno en curso" del login) -- las
// franjas horarias reales que SÍ se hacen cumplir viven en
// fn_resolver_turno_horario (hoy desactivada a propósito, ver
// docs/Auth.md). Ventanas iguales, sin el solape de 20:00-20:30 entre
// Tarde/Noche que tiene esa función -- acá no hace falta, es solo texto.
export function turnoPorHora(fecha: Date = new Date()): 'Mañana' | 'Tarde' | 'Noche' {
  const minutos = fecha.getHours() * 60 + fecha.getMinutes();
  if (minutos >= 7 * 60 && minutos < 13 * 60 + 30) return 'Mañana';
  if (minutos >= 13 * 60 + 30 && minutos < 20 * 60 + 30) return 'Tarde';
  return 'Noche';
}
