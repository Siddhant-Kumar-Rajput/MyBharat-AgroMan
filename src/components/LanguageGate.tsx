import { ArrowRight, Languages } from "lucide-react";
import { languages } from "../../shared/domain";
import type { Copy } from "../lib/i18n";
import { SiteFooter, SiteHeader } from "./SiteChrome";

type Props = {
  copy: Copy;
  locale: string;
  busy: boolean;
  onChoose: (locale: string) => void;
  onContinue: () => void;
};

export function LanguageGate({ copy: t, locale, busy, onChoose, onContinue }: Props) {
  return (
    <main className="language-gate">
      <SiteHeader copy={t} locale={locale} onLocaleChange={onChoose} onHome={() => undefined} />
      <section className="language-gate-card" aria-labelledby="language-gate-title">
        <div className="language-gate-heading">
          <span className="language-gate-icon"><Languages /></span>
          <p>{t.languageGateEyebrow}</p>
          <h1 id="language-gate-title">{t.languageGateTitle}</h1>
          <span>{t.languageGateCopy}</span>
        </div>
        <div className="language-grid" role="radiogroup" aria-label={t.language}>
          {languages.map(([code, name]) => (
            <button type="button" role="radio" aria-checked={locale === code} className={locale === code ? "selected" : ""} key={code} onClick={() => onChoose(code)}>
              <strong>{name}</strong>
              <small>{code === "en" ? "English" : code === "hi" ? "Hindi" : code.toUpperCase()}</small>
            </button>
          ))}
        </div>
        <button className="language-continue" type="button" disabled={busy} onClick={onContinue}>
          {busy ? t.translationWorking : t.continueInLanguage}<ArrowRight size={18} />
        </button>
        <p className="language-voice-note">{t.voiceLanguageNote}</p>
      </section>
      <SiteFooter copy={t} />
    </main>
  );
}
