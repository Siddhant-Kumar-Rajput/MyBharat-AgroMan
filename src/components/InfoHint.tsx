import { Info, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Copy } from "../lib/i18n";

/** Inline disclosure: mobile content never depends on hover or a tooltip. */
export function InfoHint({
  copy: t,
  title,
  children,
}: {
  copy: Copy;
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);
  function close() {
    setOpen(false);
    button.current?.focus();
  }
  return (
    <div className="info-hint">
      <button
        ref={button}
        type="button"
        className="info-hint-toggle"
        aria-label={t.informationAbout.replace("{topic}", title)}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <Info size={15} aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={panel}
          id={id}
          className="info-hint-panel"
          role="region"
          aria-label={t.informationAbout.replace("{topic}", title)}
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close();
            }
          }}
        >
          <div className="info-hint-heading">
            <strong>{title}</strong>
            <button
              type="button"
              aria-label={t.closeInformation}
              onClick={close}
            >
              <X size={16} />
            </button>
          </div>
          <div className="info-hint-content">{children}</div>
        </div>
      )}
    </div>
  );
}
