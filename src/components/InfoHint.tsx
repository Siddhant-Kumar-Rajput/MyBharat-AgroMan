import { Info, X } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { Copy } from "../lib/i18n";

/** Keep the last word and its superscript together without resizing the heading. */
export function InfoHint({
  copy: t,
  title,
  label,
  children,
}: {
  copy: Copy;
  title: string;
  label?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 16, left: 16 });
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const split = label?.lastIndexOf(" ") ?? -1;
  function close() {
    setOpen(false);
    button.current?.focus({ preventScroll: true });
  }
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      if (!button.current || !panel.current) return;
      const anchor = button.current.getBoundingClientRect();
      const box = panel.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const width = viewport?.width ?? innerWidth;
      const height = viewport?.height ?? innerHeight;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const below = anchor.bottom + 10;
      setPosition({
        left: Math.max(
          left + 12,
          Math.min(anchor.left, left + width - box.width - 12),
        ),
        top: Math.max(
          top + 12,
          Math.min(
            below + box.height <= top + height - 12
              ? below
              : anchor.top - box.height - 10,
            top + height - box.height - 12,
          ),
        ),
      });
    }
    place();
    const observer = new ResizeObserver(place);
    observer.observe(panel.current!);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.visualViewport?.removeEventListener("resize", place);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    panel.current?.focus({ preventScroll: true });
    function dismiss(event: PointerEvent) {
      if (
        !panel.current?.contains(event.target as Node) &&
        !button.current?.contains(event.target as Node)
      )
        setOpen(false);
    }
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <span className="info-label">
      {split >= 0 && label!.slice(0, split + 1)}
      <span className="info-hint-anchor">
        {label?.slice(split + 1)}
        <span className="info-hint">
          <button
            ref={button}
            type="button"
            className="info-hint-toggle"
            aria-label={t.informationAbout.replace("{topic}", title)}
            aria-expanded={open}
            aria-controls={open ? id : undefined}
            onClick={() => setOpen(!open)}
          >
            <Info size={14} aria-hidden="true" />
          </button>
        </span>
      </span>
      {open &&
        createPortal(
          <div
            ref={panel}
            id={id}
            className="info-hint-panel"
            style={position}
            role="region"
            aria-label={t.informationAbout.replace("{topic}", title)}
            tabIndex={-1}
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
          </div>,
          document.body,
        )}
    </span>
  );
}
