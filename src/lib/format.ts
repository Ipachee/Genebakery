// Formateadores compartidos -- estaban redefinidos (copiados y pegados)
// en 10 archivos distintos.
export const fmtMoney = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
export const fmtMoneyDecimal = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
