// La estrella "sello de goma". Marca única para los sellos llenos.
export function StampMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2l2.6 6.3L21 9l-5 4.2L17.5 20 12 16.4 6.5 20 8 13.2 3 9l6.4-.7z" />
    </svg>
  );
}
