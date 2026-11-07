import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useLang } from "@/i18n/LanguageProvider";
import { copy } from "@/i18n/journey-copy";
import { packageLabels, profiles } from "@/lib/journey";
import { readLastRegistration, type RegistrationRecord } from "@/services/registrationService";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/registration-success")({
  head: () => ({
    meta: [
      { title: "طلبك التجريبي | الرفقة الطيبة" },
      { name: "description", content: "ملخص طلب التسجيل التجريبي المحلي في برنامج الرفقة الطيبة." },
      { property: "og:title", content: "ملخص التسجيل | الرفقة الطيبة" },
      {
        property: "og:description",
        content: "Votre inscription de démonstration Al-Rifqa Al-Tayyiba.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Success,
});
function Success() {
  const { lang } = useLang();
  const [record, setRecord] = useState<RegistrationRecord | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setRecord(readLastRegistration());
    setReady(true);
  }, []);
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 md:py-24">
      <CheckCircle2 className="mb-6 h-14 w-14 text-primary" />
      <h1 className="text-3xl font-bold leading-relaxed text-teal">{copy.success[lang]}</h1>
      {ready &&
        (record ? (
          <>
            <p className="mt-4 text-xl font-semibold text-primary">
              {record.full_name.split(" ")[0]}
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">{copy.successText[lang]}</p>
            <dl className="my-8 grid gap-6 border-y border-border py-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">{copy.result[lang]}</dt>
                <dd className="mt-2 font-bold">{profiles[record.interest_profile].title[lang]}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">{copy.details[lang]}</dt>
                <dd className="mt-2 font-bold">{packageLabels[record.package_type][lang]}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">{copy.reference[lang]}</dt>
                <dd className="mt-2 font-mono" dir="ltr">
                  {record.reference}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="my-6">{copy.empty[lang]}</p>
        ))}
      <Button asChild className="mt-6 h-12">
        <Link to="/">{copy.home[lang]}</Link>
      </Button>
    </section>
  );
}
