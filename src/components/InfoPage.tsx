import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import type { Copy } from "../lib/i18n";

export type InfoPageKind = "terms" | "privacyPolicy" | "dataConsent" | "features" | "aboutProject" | "aboutCreator";
type Props = { copy: Copy; kind: InfoPageKind; onBack: () => void };

const contentKeys: Record<InfoPageKind, { title: keyof Copy; intro: keyof Copy; sections: Array<[keyof Copy, keyof Copy]> }> = {
  terms: { title: "termsTitle", intro: "termsIntro", sections: [["termsUseTitle", "termsUseCopy"], ["termsSafetyTitle", "termsSafetyCopy"], ["termsAvailabilityTitle", "termsAvailabilityCopy"]] },
  privacyPolicy: { title: "privacyTitle", intro: "privacyIntro", sections: [["privacyStoredTitle", "privacyStoredCopy"], ["privacyNotStoredTitle", "privacyNotStoredCopy"], ["privacyControlTitle", "privacyControlCopy"]] },
  dataConsent: { title: "dataTitle", intro: "dataIntro", sections: [["dataProvidersTitle", "dataProvidersCopy"], ["dataPurposeTitle", "dataPurposeCopy"], ["dataRightsTitle", "dataRightsCopy"]] },
  features: { title: "featuresTitle", intro: "featuresIntro", sections: [["featuresGuestTitle", "featuresGuestCopy"], ["featuresFarmerTitle", "featuresFarmerCopy"], ["featuresLimitsTitle", "featuresLimitsCopy"]] },
  aboutProject: { title: "aboutProjectTitle", intro: "aboutProjectIntro", sections: [["aboutMissionTitle", "aboutMissionCopy"], ["aboutApproachTitle", "aboutApproachCopy"], ["aboutStatusTitle", "aboutStatusCopy"]] },
  aboutCreator: { title: "aboutCreatorTitle", intro: "aboutCreatorIntro", sections: [["creatorNameTitle", "creatorNameCopy"], ["creatorBuildTitle", "creatorBuildCopy"], ["creatorContactTitle", "creatorContactCopy"]] },
};

export function InfoPage({ copy: t, kind, onBack }: Props) {
  const content = contentKeys[kind];
  return (
    <main className="info-page">
      <nav className="info-nav"><button onClick={onBack}><ArrowLeft size={17} />{t.back}</button><a href="/" className="brand"><img src="/mark.svg" alt="" /><span>agroman.</span></a></nav>
      <header><ShieldCheck size={28} /><h1>{t[content.title]}</h1><p>{t[content.intro]}</p><time>{t.policyUpdated}</time></header>
      <section>{content.sections.map(([title, body]) => <article key={String(title)}><h2>{t[title]}</h2><p>{t[body]}</p></article>)}</section>
      <aside><strong>{t.policyNoticeTitle}</strong><p>{t.policyNoticeCopy}</p></aside>
      <footer><span>MyBharat AgroMan</span><a href="https://github.com/Siddhant-Kumar-Rajput/MyBharat-AgroMan" target="_blank" rel="noreferrer">GitHub <ExternalLink size={13} /></a></footer>
    </main>
  );
}
