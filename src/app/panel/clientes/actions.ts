"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/tenant";
import { phoneKey } from "@/lib/phone";
import { createCustomerWithMemberships, findByPhoneKey } from "@/lib/customers";

export type FormResult = { error?: string; ok?: boolean; code?: string } | undefined;

export async function createCustomer(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const { businessId } = await requireBusiness();

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40);
  const programId = String(formData.get("programId") ?? "").trim();

  if (!name) return { error: "El nombre es obligatorio." };
  if (!phone) return { error: "El teléfono es obligatorio." };
  const key = phoneKey(phone);
  if (!key) return { error: "Teléfono inválido. Escribilo con código de área (ej. 280 415-2290)." };

  // Una tarjeta por cliente por comercio: si el teléfono ya está, no se crea otra.
  const existing = await findByPhoneKey(businessId, key);
  if (existing) return duplicateError(existing);

  const customer = await createCustomerWithMemberships(
    { businessId, name, phone, phoneKey: key },
    programId ? [programId] : [],
  );
  if (!customer) {
    // Dos altas simultáneas con el mismo teléfono: la base frena la segunda.
    const dup = await findByPhoneKey(businessId, key);
    if (dup) return duplicateError(dup);
    return { error: "No se pudo crear el cliente. Probá de nuevo." };
  }

  revalidatePath("/panel/clientes");
  revalidatePath("/panel");
  return { ok: true, code: customer.code };
}

function duplicateError(c: { name: string; code: string }): FormResult {
  return {
    error: `Ya existe un cliente con ese teléfono: ${c.name} (#${c.code}). Cada cliente tiene una sola tarjeta por comercio.`,
  };
}
