import { BookOpen, ExternalLink, Globe2, LayoutDashboard, Menu, Radio, Sprout, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { languages } from "../../shared/domain";
import type { Copy } from "../lib/i18n";

export type HeaderItem = { label: string; active?: boolean; disabled?: boolean; onClick: () => void };
type HeaderProps = {
  copy: Copy;
  locale: string;
  onLocaleChange: (locale: string) => void;
  onHome: () => void;
  items?: HeaderItem[];
  primaryAction?: HeaderItem;
  menuActions?: HeaderItem[];
};

export function SiteHeader({ copy: t, locale, onLocaleChange, onHome, items = [], primaryAction, menuActions = [] }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
    };
    root.current?.querySelector<HTMLButtonElement>(".site-menu button")?.focus();
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", keyboard);
    };
  }, [open]);
  useGSAP(() => {
    if (!open || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(".site-menu", { y: -8, opacity: 0 }, { y: 0, opacity: 1, duration: .2 });
    gsap.fromTo(".site-menu nav > *", { x: -6, opacity: 0 }, { x: 0, opacity: 1, stagger: .025, duration: .2 });
  }, { scope: root, dependencies: [open], revertOnUpdate: true });
  const run = (action: () => void) => { setOpen(false); action(); };
  return (
    <header className="site-header" ref={root}>
      <button className="site-brand" type="button" onClick={() => run(onHome)} aria-label={t.homeLabel}><img src="/mark.svg" alt="" /><span>MyBharat AgroMan</span></button>
      <nav className="site-desktop-nav" aria-label={t.navigation}>{items.map((item) => <button className={item.active ? "active" : ""} key={item.label} onClick={() => run(item.onClick)}>{item.label}</button>)}</nav>
      <div className="site-header-tools">
        <label className="site-language"><Globe2 size={16} /><span className="visually-hidden">{t.language}</span><select aria-label={t.language} value={locale} onChange={(event) => onLocaleChange(event.target.value)}>{languages.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
        {primaryAction && <button className="site-primary-action" disabled={primaryAction.disabled} onClick={() => run(primaryAction.onClick)}>{primaryAction.label}</button>}
        <button ref={toggle} className="site-menu-toggle" aria-label={open ? t.closeMenu : t.menu} aria-expanded={open} aria-controls="site-navigation-menu" onClick={() => setOpen((value) => !value)}>{open ? <X /> : <Menu />}<span className="site-menu-label">{t.menuShort}</span></button>
      </div>
      {open && <div id="site-navigation-menu" className="site-menu" role="dialog" aria-label={t.navigation}><nav>{items.map((item) => <button className={item.active ? "active" : ""} aria-current={item.active ? "page" : undefined} key={item.label} disabled={item.disabled} onClick={() => run(item.onClick)}>{item.label}</button>)}{primaryAction && <button className="site-menu-signin" disabled={primaryAction.disabled} onClick={() => run(primaryAction.onClick)}>{primaryAction.label}</button>}{menuActions.map((item) => <button className="site-menu-action" key={item.label} disabled={item.disabled} onClick={() => run(item.onClick)}>{item.label}</button>)}</nav><div className="site-menu-information"><strong>{t.informationPages}</strong><a href="/features">{t.featuresTitle}</a><a href="/about">{t.aboutProjectTitle}</a><a href="/privacy">{t.privacyTitle}</a><a href="/data-and-consent">{t.dataTitle}</a></div></div>}
    </header>
  );
}

export function MobileNavigation({ copy: t, items }: { copy: Copy; items: HeaderItem[] }) {
  const icons = [LayoutDashboard, Sprout, BookOpen, Radio];
  return <nav className="mobile-main-nav" aria-label={t.primaryDestinations}>{items.map((item, index) => {
    const Icon = icons[index];
    return <button type="button" key={item.label} className={item.active ? "active" : ""} aria-current={item.active ? "page" : undefined} onClick={item.onClick}><Icon size={21} aria-hidden="true" /><span>{item.label}</span></button>;
  })}</nav>;
}

export function SiteFooter({ copy: t }: { copy: Copy }) {
  return (
    <footer className="site-footer">
      <div><strong>MyBharat AgroMan</strong><p>{t.footer}</p></div>
      <nav aria-label={t.informationPages}><a href="/terms">{t.termsTitle}</a><a href="/privacy">{t.privacyTitle}</a><a href="/data-and-consent">{t.dataTitle}</a><a href="/features">{t.featuresTitle}</a><a href="/about">{t.aboutProjectTitle}</a><a href="/creator">{t.aboutCreatorTitle}</a></nav>
      <a className="site-footer-github" href="https://github.com/Siddhant-Kumar-Rajput/MyBharat-AgroMan" target="_blank" rel="noreferrer">GitHub <ExternalLink size={13} /></a>
    </footer>
  );
}
