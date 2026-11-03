import { Link } from "@tanstack/react-router";
import { useLang } from "@/i18n/LanguageProvider";

export function SiteHeader() {
  const { t, lang, setLang } = useLang();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-teal font-bold text-gold">ر</span>
          <span className="text-lg font-bold text-teal">{t.brand}</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <a href="/#program" className="hover:text-primary">{t.nav.program}</a>
          <a href="/#stages" className="hover:text-primary">{t.nav.stages}</a>
          <a href="/#team" className="hover:text-primary">{t.nav.team}</a>
          <a href="/#pricing" className="hover:text-primary">{t.nav.pricing}</a>
        </nav>
        <div className="flex items-center gap-3">
          <div className="flex rounded-full border border-border p-0.5 text-sm" role="group" aria-label="Language">
            <button onClick={() => setLang("ar")} aria-pressed={lang === "ar"} className={`rounded-full px-3 py-1 font-arabic ${lang === "ar" ? "bg-teal text-teal-foreground" : "text-muted-foreground"}`}>العربية</button>
            <button onClick={() => setLang("fr")} aria-pressed={lang === "fr"} className={`rounded-full px-3 py-1 ${lang === "fr" ? "bg-teal text-teal-foreground" : "text-muted-foreground"}`}>Français</button>
          </div>
          <Link to="/register" className="hidden rounded-full bg-gold-gradient px-4 py-2 text-sm font-semibold text-gold-foreground sm:inline-flex">{t.nav.register}</Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useLang();
  return (
    <footer className="bg-teal py-8 text-center text-sm text-teal-foreground/80">
      <p className="font-semibold text-gold">الرفقة الطيبة | AL-RIFQA AL-TAYYIBA</p>
      <p className="mt-1">© {new Date().getFullYear()} — {t.footer}</p>
    </footer>
  );
}
