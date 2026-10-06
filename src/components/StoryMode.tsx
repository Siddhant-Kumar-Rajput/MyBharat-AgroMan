import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, CloudRain, Leaf, MapPin, Sprout, WalletCards } from "lucide-react";
import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { Copy } from "../lib/i18n";
import { SiteFooter, SiteHeader } from "./SiteChrome";

type Props = { copy: Copy; locale: string; onLocaleChange: (locale: string) => void; onExit: () => void };

export function StoryMode({ copy: t, locale, onLocaleChange, onExit }: Props) {
  const root = useRef<HTMLElement>(null);
  const [chapter, setChapter] = useState(0);
  const chapters = [
    { day: t.storyDay0, title: t.storyChapter1, body: t.storyChapter1Copy, icon: MapPin, result: t.storyLandReady, fields: [[t.farmerName, t.storyFarmerName], [t.location, "Moga, Punjab"], [t.storyFarmSize, "5.2 ha"]] },
    { day: t.storyDay0, title: t.storyFormCropTitle, body: t.storyFormCropCopy, icon: Sprout, result: t.storyCropStarted, fields: [[t.plotName, t.storyPlotName], [t.crop, t.cropWheat], [t.sowingDate, "08 Nov 2026"]] },
    { day: t.storyDay45, title: t.storyChapter2, body: t.storyChapter2Copy, icon: CloudRain, result: t.storyCropGrowing, fields: [[t.eventTitle, t.storyIrrigation], [t.weatherTitle, t.storyWeatherEstimate], [t.eventDate, "23 Dec 2026"]] },
    { day: t.storyDay75, title: t.storyChapter3, body: t.storyChapter3Copy, icon: Leaf, result: t.storyActionLogged, fields: [[t.healthCase, t.storyLeafConcern], [t.aiConfidence, t.confidenceModerate], [t.pendingReview, t.storyExpertQueued]] },
    { day: t.storyDay140, title: t.storyMoneyTitle, body: t.storyMoneyCopy, icon: WalletCards, result: t.storyMoneyResult, fields: [[t.totalExpenses, "₹18,450"], [t.recordedYield, "28 quintal"], [t.totalRevenue, "₹64,400"]] },
    { day: t.storyDay140, title: t.storyChapter4, body: t.storyChapter4Copy, icon: CheckCircle2, result: t.storyHarvestRecorded, fields: [[t.harvestDate, "28 Mar 2027"], [t.outcome7, t.resolved], [t.exportRecord, t.storyRecordReady]] },
  ];
  const item = chapters[chapter];
  const Icon = item.icon;

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(".story-autofill-row", { opacity: 0, x: 18 }, { opacity: 1, x: 0, duration: 0.45, stagger: 0.1, ease: "power2.out" });
    gsap.fromTo(".story-result", { scale: 0.96, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, delay: 0.25 });
  }, { scope: root, dependencies: [chapter], revertOnUpdate: true });

  return (
    <main className="story-mode" ref={root}>
      <SiteHeader copy={t} locale={locale} onLocaleChange={onLocaleChange} onHome={onExit} menuActions={[{ label: t.backToIntro, onClick: onExit }]} />
      <div className="story-context"><span>{t.syntheticStoryBadge}</span></div>
      <section className="story-shell interactive-story">
        <aside className="story-intro">
          <p className="eyebrow">{t.storyMode}</p><h1>{t.storyFarmerName}</h1><p>{t.storyFarmerProfile}</p>
          <div className="story-timeline">{chapters.map((entry, index) => <button key={`${entry.day}-${index}`} className={index === chapter ? "active" : index < chapter ? "complete" : ""} onClick={() => setChapter(index)}><span>{index < chapter ? <CheckCircle2 /> : index + 1}</span><div><strong>{entry.day}</strong><small>{entry.title}</small></div></button>)}</div>
        </aside>
        <article className="story-chapter" aria-live="polite">
          <div className="story-chapter-top"><span className="story-icon"><Icon /></span><div><p>{item.day}</p><h2>{item.title}</h2></div></div>
          <p className="story-body">{item.body}</p>
          <div className="story-autofill" aria-label={t.storyAutoFilled}>{item.fields.map(([label, value]) => <div className="story-autofill-row" key={label}><label>{label}</label><strong>{value}</strong><CheckCircle2 size={17} /></div>)}</div>
          <div className="story-result"><CheckCircle2 size={18} /><span>{item.result}</span></div>
          <div className="story-controls"><button type="button" disabled={chapter === 0} onClick={() => setChapter((value) => value - 1)}><ArrowLeft />{t.previous}</button>{chapter < chapters.length - 1 ? <button className="primary" type="button" onClick={() => setChapter((value) => value + 1)}><CalendarDays />{t.skipTime}<ArrowRight /></button> : <button className="primary" type="button" onClick={onExit}>{t.finishStory}<ArrowRight /></button>}</div>
          <small className="story-disclosure">{t.syntheticCase}</small>
        </article>
      </section>
      <SiteFooter copy={t} />
    </main>
  );
}
