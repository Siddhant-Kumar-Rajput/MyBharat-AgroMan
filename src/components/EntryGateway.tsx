import { useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, Globe2, ShieldCheck, Sprout, UserRound } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { Copy } from "../lib/i18n";
import { SiteFooter, SiteHeader } from "./SiteChrome";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = {
  copy: Copy;
  error: string;
  onGuest: () => Promise<void>;
  onGoogle: () => Promise<void>;
  onError: (message: string) => void;
  onDismissError: () => void;
  locale: string;
  onLocaleChange: (locale: string) => void;
  onStory: () => void;
  onTour: () => void;
  languageNotice?: ReactNode;
};

export function EntryGateway({ copy: t, error, onGuest, onGoogle, onError, onDismissError, locale, onLocaleChange, onStory, onTour, languageNotice }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"guest" | "google" | "">("");

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const entrance = gsap.timeline({ defaults: { ease: "power3.out", duration: 1.1 } });
        entrance.from(".entry-kicker", { y: 12, opacity: .5 })
          .from(".entry-headline-line", { yPercent: 24, opacity: .6, stagger: .14 }, .12)
          .from(".entry-lead, .entry-hero-copy .entry-actions, .entry-story-link, .entry-consent", { y: 16, opacity: .6, stagger: .09, clearProps: "transform,opacity" }, .32)
          .from(".entry-hero-visual", { y: 28, opacity: .65, clearProps: "transform,opacity" }, .16);
        gsap.fromTo(".entry-sunlight", { xPercent: -65, opacity: 0 }, { xPercent: 65, opacity: .75, duration: 3.5, ease: "sine.inOut" });
        gsap.fromTo(".entry-field-lines path", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.2, stagger: .16, delay: .3, ease: "power2.out" });
        gsap.fromTo(".entry-hero-image", { backgroundPosition: "50% 48%" }, {
          backgroundPosition: "50% 58%", ease: "none",
          scrollTrigger: { trigger: ".entry-hero-visual", start: "top bottom", end: "bottom top", scrub: 1 },
        });
        gsap.fromTo(".entry-reveal span", { opacity: .55 }, {
          opacity: 1, stagger: .08,
          scrollTrigger: { trigger: ".entry-reveal", start: "top 85%", end: "bottom 60%", scrub: 1 },
        });
        gsap.utils.toArray<HTMLElement>(".entry-proof-card").forEach((card) => {
          gsap.from(card, { y: 24, opacity: .6, duration: .65, clearProps: "transform,opacity",
            scrollTrigger: { trigger: card, start: "top 94%", once: true },
          });
        });
      });
      return () => media.revert();
    },
    { scope: root, dependencies: [locale], revertOnUpdate: true },
  );

  async function run(kind: "guest" | "google", action: () => Promise<void>) {
    setBusy(kind);
    try {
      await action();
    } catch (error) {
      onError(error instanceof Error ? error.message : t.error);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="entry" ref={root}>
      <SiteHeader copy={t} locale={locale} onLocaleChange={onLocaleChange} onHome={() => window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })} primaryAction={{ label: t.googleAccess, disabled: Boolean(busy), onClick: () => void run("google", onGoogle) }} menuActions={[{ label: t.continueGuest, disabled: Boolean(busy), onClick: () => void run("guest", onGuest) }, { label: t.quickTour, onClick: onTour }]} />
      {error && <div className="entry-error" role="alert"><span>{error}</span><button onClick={onDismissError}>{t.dismiss}</button></div>}
      {languageNotice}

      <main className="entry-main">
        <section className="entry-hero">
          <div className="entry-hero-copy">
            <p className="entry-kicker"><Sprout size={15} />{t.entryBrandLine}</p>
            <h1><span className="entry-headline-line">{t.entryHeadlineA}</span><span className="entry-headline-line entry-headline-accent">{t.entryHeadlineB}</span></h1>
            <p className="entry-lead">{t.entryCopy}</p>
            <div className="entry-actions">
              <button className="entry-primary" disabled={Boolean(busy)} onClick={() => void run("guest", onGuest)}>{t.continueGuest}<ArrowUpRight size={18} /></button>
              <button className="entry-secondary google-entry" disabled={Boolean(busy)} onClick={() => void run("google", onGoogle)}><span className="google-mark">G</span>{t.googleAccess}</button>
            </div>
            <button className="entry-story-link" type="button" onClick={onStory}>{t.openStory}<ArrowUpRight size={16} /><small>{t.openStoryCopy}</small></button>
            <p className="entry-consent"><ShieldCheck size={15} />{t.entryConsent}</p>
          </div>
          <div className="entry-hero-visual">
            <div className="entry-hero-image" role="img" aria-label={t.entryImageAlt}>
              <span className="entry-sunlight" aria-hidden="true" />
              <svg className="entry-field-lines" viewBox="0 0 500 540" preserveAspectRatio="none" aria-hidden="true">
                <path pathLength="1" d="M-30 470 Q170 250 540 340" />
                <path pathLength="1" d="M-30 505 Q180 285 540 375" />
                <path pathLength="1" d="M-30 540 Q190 320 540 410" />
              </svg>
            </div>
            <div className="entry-visual-note"><strong>{t.entryFarmerOwned}</strong><span>{t.entryFarmerOwnedCopy}</span></div>
          </div>
        </section>

        <div className="entry-marquee" aria-hidden="true"><div>{t.entryMarquee} · {t.entryMarquee} · {t.entryMarquee} · {t.entryMarquee}</div></div>

        <section className="entry-interest">
          <div className="entry-interest-heading">
            <h2>{t.entryChoiceTitle}</h2>
            <p>{t.entryChoiceCopy}</p>
          </div>
          <div className="entry-bento">
            <article className="entry-path guest-path entry-proof-card"><UserRound /><h3>{t.continueGuest}</h3><p>{t.guestDescription}</p><button onClick={() => void run("guest", onGuest)} disabled={Boolean(busy)}>{t.enterGuest}<ArrowUpRight size={16} /></button></article>
            <article className="entry-path farmer-path entry-proof-card"><span className="google-mark large">G</span><h3>{t.verifiedFarmerTitle}</h3><p>{t.farmerDescription}</p><button disabled={Boolean(busy)} onClick={() => void run("google", onGoogle)}>{t.googleAccess}<ArrowUpRight size={16} /></button></article>
            <article className="entry-proof-card"><ShieldCheck /><h3>{t.phoneRequiredTitle}</h3><p>{t.phoneRequiredCopy}</p></article>
            <article className="entry-proof-card"><Globe2 /><h3>{t.languageFirstTitle}</h3><p>{t.languageFirstCopy}</p></article>
            <article className="entry-proof-card"><ShieldCheck /><h3>{t.privacyFirstTitle}</h3><p>{t.privacyFirstCopy}</p></article>
          </div>
        </section>

        <section className="entry-desire">
          <p className="entry-reveal">{t.entryReveal.split(" ").map((word, index) => <span key={`${word}-${index}`}>{word} </span>)}</p>
        </section>

        <section className="entry-action">
          <h2>{t.entryActionTitle}</h2>
          <div className="entry-actions"><button className="entry-primary light" disabled={Boolean(busy)} onClick={() => void run("google", onGoogle)}>{t.googleAccess}<ArrowUpRight size={18} /></button><button className="entry-secondary light-outline" disabled={Boolean(busy)} onClick={() => void run("guest", onGuest)}>{t.continueGuest}</button></div>
        </section>
      </main>

      <SiteFooter copy={t} />

    </div>
  );
}
