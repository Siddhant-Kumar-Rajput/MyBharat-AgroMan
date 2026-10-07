import {
  BookOpen,
  MapPin,
  MessageCircle,
  Radio,
  Sprout,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { Copy } from "../lib/i18n";

type Props = {
  copy: Copy;
  farmer: boolean;
  onClose: () => void;
  onFinish: () => void;
};
export function Onboarding({ copy: t, farmer, onClose, onFinish }: Props) {
  const [step, setStep] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const steps = farmer
    ? ([
        [MapPin, t.tourLocationTitle, t.tourLocationCopy],
        [Sprout, t.tourAdviceTitle, t.tourAdviceCopy],
        [BookOpen, t.tourDiaryTitle, t.tourDiaryCopy],
        [Radio, t.tourCommunityTitle, t.tourCommunityCopy],
      ] as const)
    : ([
        [MessageCircle, t.tourGuestTitle, t.tourGuestCopy],
        [Radio, t.tourCommunityTitle, t.tourCommunityCopy],
        [Sprout, t.tourAccountTitle, t.tourAccountCopy],
      ] as const);
  const [Icon, title, text] = steps[step];
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    root.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const buttons = [
        ...(root.current?.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
        ) ?? []),
      ];
      const first = buttons[0],
        last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keyboard);
      if (previous?.isConnected) previous.focus();
      else
        document.querySelector<HTMLButtonElement>(".site-menu-toggle")?.focus();
    };
  }, []);
  useGSAP(
    () => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        ".onboarding-step > *",
        { y: 10, opacity: 0.3 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.035,
          duration: 0.25,
          clearProps: "transform,opacity",
        },
      );
    },
    { scope: root, dependencies: [step], revertOnUpdate: true },
  );
  return (
    <div className="onboarding-backdrop">
      <div
        ref={root}
        className="onboarding-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <header>
          <strong>{t.quickTour}</strong>
          <button type="button" aria-label={t.closeTour} onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        <div
          className="onboarding-progress"
          aria-label={t.tourProgress
            .replace("{step}", String(step + 1))
            .replace("{total}", String(steps.length))}
        >
          {steps.map((_, index) => (
            <span key={index} className={index <= step ? "done" : ""} />
          ))}
        </div>
        <section className="onboarding-step" aria-live="polite">
          <Icon size={42} aria-hidden="true" />
          <h2 id="onboarding-title">{title}</h2>
          <p>{text}</p>
        </section>
        <div className="onboarding-controls">
          <button
            className="secondary"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          >
            {t.tourPrevious}
          </button>
          <button
            className="primary"
            onClick={() =>
              step < steps.length - 1 ? setStep(step + 1) : onFinish()
            }
          >
            {step < steps.length - 1
              ? t.tourNext
              : farmer
                ? t.tourStartField
                : t.tourDone}
          </button>
        </div>
        <button type="button" className="tour-later" onClick={onClose}>
          {t.tourLater}
        </button>
      </div>
    </div>
  );
}
