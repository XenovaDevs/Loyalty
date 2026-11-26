// Normalización de teléfonos para detectar al mismo cliente aunque el número
// se escriba distinto. Regla del producto: UNA tarjeta por cliente por comercio,
// y el teléfono es lo que identifica al cliente.
//
//   "280 415-2290" · "2804152290" · "+54 9 280 415-2290" · "0280 4152290"
//   → todos dan la misma clave "2804152290".
//
// OJO: la migración 20261126030000_customer_phone_key replica esta misma regla
// en SQL para los clientes existentes. Si se cambia acá, cambiarla allá también.

export function phoneKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let d = raw.replace(/\D/g, "");
  d = d.replace(/^00/, ""); // prefijo internacional "00"
  if (d.startsWith("549") && d.length >= 12) d = d.slice(3); // +54 9 (celular AR)
  else if (d.startsWith("54") && d.length >= 11) d = d.slice(2); // +54
  d = d.replace(/^0+/, ""); // 0 de larga distancia
  return d.length >= 6 && d.length <= 15 ? d : null;
}
