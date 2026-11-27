"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCustomer, deleteCustomer, type FormResult } from "./actions";
import { Field, buttonCls } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";

type Props = {
  id: string;
  name: string;
  phone: string;
  code: string;
  owner: boolean;
  compact?: boolean; // botón chico (lista del celular)
  asButton?: boolean; // botón con borde (detalle del cliente)
  /** Adónde ir después de borrar (el detalle del cliente deja de existir). */
  afterDeleteHref?: string;
};

export function EditCustomer(p: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          p.asButton
            ? buttonCls("ghost")
            : p.compact
              ? "-my-2 shrink-0 py-2 font-mono text-[12px] text-ink-2 hover:text-spot"
              : "font-mono text-[11px] text-ink-2 hover:text-spot"
        }
      >
        {p.asButton ? "Editar datos" : "editar"}
      </button>
      {/* Se monta al abrir: cada apertura arranca con el estado limpio. */}
      {open && <EditModal {...p} onClose={() => setOpen(false)} />}
    </>
  );
}

function EditModal({
  id,
  name,
  phone,
  code,
  owner,
  afterDeleteHref,
  onClose,
}: Props & { onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormResult, FormData>(
    async (prev, fd) => {
      const r = await updateCustomer(prev, fd);
      if (r?.ok) onClose();
      return r;
    },
    undefined,
  );
  // Controlados: React resetea el <form action> tras cada envío y, con un
  // error (ej. teléfono repetido), se perdía lo que se había escrito.
  const [v, setV] = useState({ name, phone });
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [askDelete, setAskDelete] = useState(false);

  function onDelete() {
    setDeleteError(null);
    startDelete(async () => {
      const r = await deleteCustomer(id);
      if (r?.error) setDeleteError(r.error);
      else if (afterDeleteHref) router.replace(afterDeleteHref);
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto border border-ink bg-paper p-5 text-left sm:p-6">
        <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
          <h2 className="font-display text-xl font-semibold">
            Editar cliente <span className="font-mono text-sm text-faint">#{code}</span>
          </h2>
          <button
            onClick={onClose}
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint hover:text-spot"
          >
            Cerrar
          </button>
        </div>

        <form action={action} className="flex flex-col gap-5">
          <input type="hidden" name="id" value={id} />
          <Field
            label="Nombre y apellido"
            name="name"
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
            required
          />
          <Field
            label="Teléfono"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            value={v.phone}
            onChange={(e) => setV({ ...v, phone: e.target.value })}
            required
          />
          <p className="-mt-2 text-[12px] text-faint">
            El cliente recupera su tarjeta en otro celular con este teléfono y su
            apellido.
          </p>
          {state?.error && <p className="text-sm text-spot">{state.error}</p>}
          <button disabled={pending || deleting} className={`${buttonCls("spot")} mt-1`}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>

        {owner && (
          <div className="mt-6 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => setAskDelete(true)}
              disabled={pending || deleting}
              className={`${buttonCls("ghost")} w-full`}
            >
              Borrar cliente
            </button>
          </div>
        )}

        <ConfirmDialog
          open={askDelete}
          tone="danger"
          title={`¿Borrar a ${name}?`}
          message={
            <>
              Se pierden su tarjeta <span className="font-mono">#{code}</span>, sus
              sellos y cupones. No se puede deshacer.
            </>
          }
          confirmLabel="Sí, borrar"
          pending={deleting}
          error={deleteError}
          onConfirm={onDelete}
          onCancel={() => setAskDelete(false)}
        />
      </div>
    </div>
  );
}
