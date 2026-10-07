import { ShieldCheck } from "lucide-react";
import type { Copy } from "../lib/i18n";
import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "./SiteChrome";

export type InfoPageKind = "terms" | "privacyPolicy" | "dataConsent" | "features" | "aboutProject" | "aboutCreator";
type Props = { copy: Copy; locale: string; onLocaleChange: (locale: string) => void; kind: InfoPageKind; onBack: () => void; onHome: () => void; header?: ReactNode; navigation?: ReactNode; error?: string; onDismissError?: () => void; languageNotice?: ReactNode };

const contentKeys: Record<InfoPageKind, { title: keyof Copy; intro: keyof Copy; sections: Array<[keyof Copy, keyof Copy]> }> = {
  terms: { title: "termsTitle", intro: "termsIntro", sections: [["termsUseTitle", "termsUseCopy"], ["termsSafetyTitle", "termsSafetyCopy"], ["termsAvailabilityTitle", "termsAvailabilityCopy"]] },
  privacyPolicy: { title: "privacyTitle", intro: "privacyIntro", sections: [["privacyStoredTitle", "privacyStoredCopy"], ["privacyNotStoredTitle", "privacyNotStoredCopy"], ["privacyControlTitle", "privacyControlCopy"]] },
  dataConsent: { title: "dataTitle", intro: "dataIntro", sections: [["dataProvidersTitle", "dataProvidersCopy"], ["planningTitle", "planningConsent"], ["dataPurposeTitle", "dataPurposeCopy"], ["dataRightsTitle", "dataRightsCopy"]] },
  features: { title: "featuresTitle", intro: "featuresIntro", sections: [["featuresGuestTitle", "featuresGuestCopy"], ["featuresFarmerTitle", "featuresFarmerCopy"], ["featuresLimitsTitle", "featuresLimitsCopy"]] },
  aboutProject: { title: "aboutProjectTitle", intro: "aboutProjectIntro", sections: [["aboutMissionTitle", "aboutMissionCopy"], ["aboutApproachTitle", "aboutApproachCopy"], ["aboutStatusTitle", "aboutStatusCopy"]] },
  aboutCreator: { title: "aboutCreatorTitle", intro: "aboutCreatorIntro", sections: [["creatorNameTitle", "creatorNameCopy"], ["creatorBuildTitle", "creatorBuildCopy"], ["creatorContactTitle", "creatorContactCopy"]] },
};

export function InfoPage({ copy: t, locale, onLocaleChange, kind, onBack, onHome, header, navigation, error, onDismissError, languageNotice }: Props) {
  const content = contentKeys[kind];
  return (
    <div className="info-page">
      <a className="skip" href="#content">{t.skip}</a>
      {header ?? <SiteHeader copy={t} locale={locale} onLocaleChange={onLocaleChange} onHome={onHome} menuActions={[{ label: t.back, onClick: onBack }]} />}
      {error && <div className="entry-error" role="alert"><span>{error}</span><button onClick={onDismissError}>{t.dismiss}</button></div>}
      {languageNotice}
      <main id="content">
        <header className="info-hero"><h1>{t[content.title]}</h1><p>{t[content.intro]}</p><time>{t.policyUpdated}</time></header>
        <div className="info-layout">
          <nav className="info-contents" aria-label={t.pageContents}><strong>{t.pageContents}</strong>{content.sections.map(([title], index) => <a key={title} href={`#${kind}-${index}`}>{t[title]}</a>)}</nav>
          <section className="info-sections" aria-label={t[content.title]}>{content.sections.map(([title, body], index) => <article id={`${kind}-${index}`} key={String(title)}><h2>{t[title]}</h2><p>{t[body]}</p></article>)}</section>
        </div>
        <aside className="info-notice"><ShieldCheck size={22} aria-hidden="true" /><div><strong>{t.policyNoticeTitle}</strong><p>{t.policyNoticeCopy}</p></div></aside>
      </main>
      <SiteFooter copy={t} />
      {navigation}
    </div>
  );
}
