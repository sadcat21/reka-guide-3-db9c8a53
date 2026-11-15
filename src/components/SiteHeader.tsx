import { Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { createTapCounter } from "@/lib/admin";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LanguageProvider";
import { copy } from "@/i18n/journey-copy";
import logo from "@/assets/refka-logo.jpg";
export function SiteHeader() {
  const { t, lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const tapRef = useRef(createTapCounter(4, 1500));
  const links = [
    { id: "program", label: t.nav.program },
    { id: "stages", label: t.nav.stages },
    { id: "team", label: t.nav.team },
    { id: "benefits", label: copy.benefits[lang] },
    { id: "pricing", label: t.nav.pricing },
    { id: "faq", label: copy.faq[lang] },
  ];
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2"
            onClick={(e) => {
              if (tapRef.current()) {
                e.preventDefault();
                void navigate({ to: "/admin-login" });
              }
            }}
          >
            <img
              src={logo}
              width={1024}
              height={1024}
              alt={lang === "ar" ? "شعار الرفقة الطيبة" : "Logo Al-Rifqa Al-Tayyiba"}
              className="h-12 w-12 shrink-0 object-contain"
            />
            <span className="max-w-44 text-sm font-bold leading-snug text-teal sm:max-w-none sm:text-base">
              {t.brand}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <div role="group" aria-label="Language" className="flex gap-1">
              {(["ar", "fr"] as const).map((l) => (
                <Button
                  key={l}
                  size="sm"
                  variant={lang === l ? "default" : "ghost"}
                  aria-pressed={lang === l}
                  onClick={() => setLang(l)}
                >
                  {l === "ar" ? "العربية" : "Français"}
                </Button>
              ))}
            </div>
            <Button asChild className="hidden sm:inline-flex">
              <Link to="/register">{t.nav.register}</Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={lang === "ar" ? "القائمة" : "Menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        {open && (
          <nav className="mx-auto flex max-w-6xl flex-wrap gap-5 border-t border-border px-4 py-4 text-sm">
            {links.map((l) => (
              <a
                key={l.id}
                href={`/#${l.id}`}
                onClick={() => setOpen(false)}
                className="text-teal hover:text-primary"
              >
                {l.label}
              </a>
            ))}
          </nav>
        )}
      </header>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 sm:hidden">
        <Button asChild className="h-11 w-full">
          <Link to="/register">{t.nav.register}</Link>
        </Button>
      </div>
    </>
  );
}
export function SiteFooter() {
  const { t, lang } = useLang();
  return (
    <footer className="bg-teal px-4 py-10 pb-24 text-center text-sm text-teal-foreground sm:pb-10">
      <img
        src={logo}
        loading="lazy"
        width={1024}
        height={1024}
        alt={lang === "ar" ? "شعار الرفقة الطيبة" : "Logo Al-Rifqa Al-Tayyiba"}
        className="mx-auto mb-4 h-16 w-16 rounded-lg object-contain"
      />
      <p className="font-semibold text-gold">الرفقة الطيبة | AL-RIFQA AL-TAYYIBA</p>
      <p className="mt-3">
        {lang === "ar"
          ? "برنامج تكويني لإعداد مرشدي ومرافقي الحج والعمرة."
          : "Programme de formation des guides et accompagnateurs du Hajj et de la Omra."}
      </p>
      <p className="mt-5 opacity-75">
        © {new Date().getFullYear()} — {t.footer}
      </p>
    </footer>
  );
}
