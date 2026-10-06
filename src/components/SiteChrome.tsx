import { ExternalLink, Globe2, Menu, X } from "lucide-react";
import { useState } from "react";
import { languages } from "../../shared/domain";
import type { Copy } from "../lib/i18n";

type HeaderItem = { label: string; active?: boolean; onClick: () => void };
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
  const run = (action: () => void) => { setOpen(false); action(); };
  return (
    <header className="site-header">
      <button className="site-brand" type="button" onClick={onHome} aria-label={t.homeLabel}><img src="/mark.svg" alt="" /><span>MyBharat AgroMan</span></button>
      <nav className="site-desktop-nav" aria-label={t.navigation}>{items.map((item) => <button className={item.active ? "active" : ""} key={item.label} onClick={() => run(item.onClick)}>{item.label}</button>)}</nav>
      <div className="site-header-tools">
        <label className="site-language"><Globe2 size={16} /><span className="visually-hidden">{t.language}</span><select aria-label={t.language} value={locale} onChange={(event) => onLocaleChange(event.target.value)}>{languages.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
        {primaryAction && <button className="site-primary-action" onClick={() => run(primaryAction.onClick)}>{primaryAction.label}</button>}
        {(items.length > 0 || menuActions.length > 0) && <button className="site-menu-toggle" aria-label={open ? t.closeMenu : t.menu} aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? <X /> : <Menu />}</button>}
      </div>
      {open && <div className="site-menu" role="dialog" aria-label={t.navigation}><nav>{items.map((item) => <button className={item.active ? "active" : ""} key={item.label} onClick={() => run(item.onClick)}>{item.label}</button>)}{menuActions.map((item) => <button className="site-menu-action" key={item.label} onClick={() => run(item.onClick)}>{item.label}</button>)}</nav></div>}
    </header>
  );
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
