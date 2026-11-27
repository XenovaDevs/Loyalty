"use client";

import { useEffect, useId } from "react";
import { buttonCls } from "./ui";

type Props = {
  open: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  /** null = diálogo informativo (solo el botón de confirmar, ej. "Entendido"). */
  cancelLabel?: string | null;
  /** "danger": acción destructiva (borrar, invalidar). */
  tone?: "danger" | "default";
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Diálogo de confirmación del sistema (reemplaza a window.confirm/alert).
 * Escape o click afuera cancelan; el foco arranca en "Cancelar" cuando la
 * acción es destructiva, para que un Enter apurado no borre nada.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "default",
  pending = false,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  const msgId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onCancel]);

  if (!open) return null;
  const danger = tone === "danger";

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-ink/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !pending) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? msgId : undefined}
        className="w-full max-w-sm border border-ink bg-paper p-5 text-left sm:p-6"
      >
        <h2 id={titleId} className="font-display text-xl font-semibold leading-snug">
          {title}
        </h2>
        {message && (
          <div id={msgId} className="mt-2 text-sm leading-relaxed text-ink-2">
            {message}
          </div>
        )}
        {error && <p className="mt-3 text-sm text-spot">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-2.5">
          {cancelLabel !== null && (
            <button
              type="button"
              autoFocus={danger}
              disabled={pending}
              onClick={onCancel}
              className={buttonCls("ghost")}
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            autoFocus={!danger || cancelLabel === null}
            disabled={pending}
            onClick={onConfirm}
            className={buttonCls(danger ? "ink" : "spot")}
          >
            {pending ? "Un momento…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
