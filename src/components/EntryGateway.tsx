import { useRef, useState } from "react";
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
};

export function EntryGateway({ copy: t, error, onGuest, onGoogle, onError, onDismissError, locale, onLocaleChange, onStory }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"guest" | "google" | "">("");

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.from(".entry-kicker, .entry-hero-copy h1, .entry-lead, .entry-actions", {
        y: 32,
        opacity: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: "power3.out",
      });
      gsap.fromTo(
        ".entry-hero-image",
        { scale: 0.84, opacity: 0.65 },
        {
          scale: 1,
          opacity: 1,
          ease: "none",
          scrollTrigger: { trigger: ".entry-hero", start: "top top", end: "bottom top", scrub: 1 },
        },
      );
      gsap.fromTo(
        ".entry-reveal span",
        { opacity: 0.12 },
        {
          opacity: 1,
          stagger: 0.08,
          scrollTrigger: { trigger: ".entry-reveal", start: "top 85%", end: "bottom 60%", scrub: 1 },
        },
      );
      gsap.utils.toArray<HTMLElement>(".entry-proof-card").forEach((card, index) => {
        gsap.from(card, {
          y: 60 + index * 18,
          opacity: 0,
          scrollTrigger: { trigger: card, start: "top 92%", end: "top 68%", scrub: 0.8 },
        });
      });
    },
    { scope: root },
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
      <SiteHeader copy={t} locale={locale} onLocaleChange={onLocaleChange} onHome={() => window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })} primaryAction={{ label: t.googleAccess, disabled: Boolean(busy), onClick: () => void run("google", onGoogle) }} menuActions={[{ label: t.continueGuest, disabled: Boolean(busy), onClick: () => void run("guest", onGuest) }]} />
      {error && <div className="entry-error" role="alert"><span>{error}</span><button onClick={onDismissError}>{t.dismiss}</button></div>}

      <main className="entry-main">
        <section className="entry-hero">
          <div className="entry-hero-copy">
            <p className="entry-kicker"><Sprout size={15} />{t.entryBrandLine}</p>
            <h1>{t.entryHeadlineA}<br /><span>{t.entryHeadlineB}</span></h1>
            <p className="entry-lead">{t.entryCopy}</p>
            <div className="entry-actions">
              <button className="entry-primary" disabled={Boolean(busy)} onClick={() => void run("guest", onGuest)}>{t.continueGuest}<ArrowUpRight size={18} /></button>
              <button className="entry-secondary google-entry" disabled={Boolean(busy)} onClick={() => void run("google", onGoogle)}><span className="google-mark">G</span>{t.googleAccess}</button>
            </div>
            <button className="entry-story-link" type="button" onClick={onStory}>{t.openStory}<ArrowUpRight size={16} /><small>{t.openStoryCopy}</small></button>
            <p className="entry-consent"><ShieldCheck size={15} />{t.entryConsent}</p>
          </div>
          <div className="entry-hero-visual">
            <div className="entry-hero-image" role="img" aria-label={t.entryImageAlt} />
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
