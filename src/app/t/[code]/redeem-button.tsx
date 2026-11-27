"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { redeemOwn } from "./redeem-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { buttonCls } from "@/components/ui";

type Props = {
  code: string;
  membershipId: string;
  kind: "coupon" | "reward";
  reward: string;
};

const COPY = {
  coupon: {
    button: "Usar cupón",
    title: "¿Usar el cupón ahora?",
    confirm: "Sí, usar ahora",
  },
  reward: {
    button: "Canjear premio",
    title: "¿Canjear tu premio ahora?",
    confirm: "Sí, canjear ahora",
  },
} as const;

/** Botón de autogestión para quemar un cupón o canjear el premio de sellos. */
export function RedeemButton({ code, membershipId, kind, reward }: Props) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const c = COPY[kind];

  function confirm() {
    setError(null);
    start(async () => {
      const r = await redeemOwn(code, membershipId);
      if (!r.ok) {
        setError(r.message ?? "No se pudo. Probá de nuevo.");
        return;
      }
      setAsk(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAsk(true)}
        className={`${buttonCls("spot")} mt-3 w-full py-3`}
      >
        {c.button}
      </button>
      <ConfirmDialog
        open={ask}
        tone="danger"
        title={c.title}
        message={
          <>
            <strong className="text-ink">{reward}</strong>
            <br />
            Hacelo en el local, al momento de pagar, y mostrale la pantalla al
            personal. Es de un solo uso: después no se puede deshacer.
          </>
        }
        confirmLabel={c.confirm}
        cancelLabel="Todavía no"
        pending={pending}
        error={error}
        onConfirm={confirm}
        onCancel={() => setAsk(false)}
      />
    </>
  );
}
