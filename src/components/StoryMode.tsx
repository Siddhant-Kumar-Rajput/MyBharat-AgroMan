import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, CloudRain, Leaf, Sprout } from "lucide-react";
import { useState } from "react";
import type { Copy } from "../lib/i18n";

type Props = { copy: Copy; onExit: () => void };

export function StoryMode({ copy: t, onExit }: Props) {
  const [chapter, setChapter] = useState(0);
  const chapters = [
    { day: t.storyDay0, title: t.storyChapter1, body: t.storyChapter1Copy, icon: CheckCircle2, stat: t.storyLandReady },
    { day: t.storyDay45, title: t.storyChapter2, body: t.storyChapter2Copy, icon: Sprout, stat: t.storyCropGrowing },
    { day: t.storyDay75, title: t.storyChapter3, body: t.storyChapter3Copy, icon: CloudRain, stat: t.storyActionLogged },
    { day: t.storyDay140, title: t.storyChapter4, body: t.storyChapter4Copy, icon: Leaf, stat: t.storyHarvestRecorded },
  ];
  const item = chapters[chapter];
  const Icon = item.icon;

  return (
    <main className="story-mode">
      <header className="story-nav">
        <button type="button" onClick={onExit}><ArrowLeft size={17} />{t.backToIntro}</button>
        <span>{t.syntheticStoryBadge}</span>
      </header>
      <section className="story-shell">
        <div className="story-intro">
          <p className="eyebrow">{t.storyMode}</p>
          <h1>{t.storyFarmerName}</h1>
          <p>{t.storyFarmerProfile}</p>
          <dl>
            <div><dt>{t.storyFarmSize}</dt><dd>5.2 ha</dd></div>
            <div><dt>{t.location}</dt><dd>Ludhiana, Punjab</dd></div>
            <div><dt>{t.recentCrop}</dt><dd>{t.cropRice}</dd></div>
          </dl>
        </div>
        <article className="story-chapter" aria-live="polite">
          <div className="story-chapter-top">
            <span className="story-icon"><Icon /></span>
            <div><p>{item.day}</p><h2>{item.title}</h2></div>
          </div>
          <p className="story-body">{item.body}</p>
          <div className="story-result"><CheckCircle2 size={18} /><span>{item.stat}</span></div>
          <div className="story-progress" aria-label={t.storyProgress}>
            {chapters.map((_, index) => <span key={index} className={index <= chapter ? "active" : ""} />)}
          </div>
          <div className="story-controls">
            <button type="button" disabled={chapter === 0} onClick={() => setChapter((value) => value - 1)}><ArrowLeft />{t.previous}</button>
            {chapter < chapters.length - 1
              ? <button className="primary" type="button" onClick={() => setChapter((value) => value + 1)}><CalendarDays />{t.skipTime}<ArrowRight /></button>
              : <button className="primary" type="button" onClick={onExit}>{t.finishStory}<ArrowRight /></button>}
          </div>
        </article>
      </section>
    </main>
  );
}
