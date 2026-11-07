import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Check, Compass, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLang } from '@/i18n/LanguageProvider';
import { useJourney } from './JourneyProvider';
import { activeQuestions, profiles, getInterestProfile, answerLabel, type Question } from '@/lib/journey';
import { copy } from '@/i18n/journey-copy';
import hero from '@/assets/hero-haram.jpg';
export function QuestionChoices({ question }: { question: Question }) {
 const { lang } = useLang(); const { draft, answer } = useJourney();
 const selected = draft.answers[question.id] ?? [];
 return <div className="space-y-3">
  <h3 className="text-2xl font-bold leading-relaxed text-teal" tabIndex={-1}>{question.title[lang]}</h3>
  {question.multi && <p className="text-sm text-muted-foreground">{copy.multi[lang]}</p>}
  <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label={question.title[lang]}>
   {question.options.map(o => <Button key={o.id} type="button" variant="outline" aria-pressed={selected.includes(o.id)} onClick={() => answer(question.id, question.multi ? selected.includes(o.id) ? selected.filter(v => v !== o.id) : [...selected, o.id] : [o.id])} className={`h-auto min-h-20 justify-start whitespace-normal p-4 text-start leading-relaxed ${selected.includes(o.id) ? 'border-primary bg-primary/10 text-teal ring-1 ring-primary' : 'bg-card'}`}>
    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${selected.includes(o.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}>{selected.includes(o.id) && <Check />}</span>{o.label[lang]}
   </Button>)}
  </div>
 </div>;
}
export function InterestResult({ registration = false }: { registration?: boolean }) {
 const { lang, t } = useLang(); const { draft } = useJourney(); const profile = profiles[getInterestProfile(draft.answers)];
 return <div className="space-y-6">
  <div className="flex items-center gap-3 text-primary"><Compass className="h-10 w-10" /><h3 className="text-3xl font-bold text-teal">{profile.title[lang]}</h3></div>
  <p className="leading-relaxed">{profile.text[lang]}</p>
  <div className="grid gap-6 sm:grid-cols-2">{(['motivation','training_priorities'] as const).map(key => <div key={key}><h4 className="mb-2 font-semibold text-primary">{key === 'motivation' ? copy.motivations[lang] : copy.priorities[lang]}</h4><p className="text-sm leading-relaxed">{answerLabel(key, draft.answers[key], lang)}</p></div>)}</div>
  <ol className="grid gap-3 sm:grid-cols-3">{t.stages.items.map((s,i) => <li key={s.title} className={`border-t-2 pt-3 ${profile.stage === i+1 ? 'border-gold text-teal' : 'border-border text-muted-foreground'}`}><span className="text-sm font-semibold">0{i+1}</span><p className="mt-2 text-sm">{s.title}</p></li>)}</ol>
  <p className="text-sm font-medium text-primary">{t.stages.note}</p><p className="text-xs text-muted-foreground">{copy.informative[lang]}</p>
  {!registration && <Button asChild className="h-12"><Link to="/register">{copy.continueRegister[lang]}</Link></Button>}
 </div>;
}
export function DiscoveryQuestionnaire() {
 const { lang, dir } = useLang(); const { draft, ready } = useJourney(); const [step,setStep] = useState(0); const [done,setDone] = useState(false);
 const list = activeQuestions(draft.answers); const current = list[Math.min(step,list.length-1)]; const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
 if (!current) return null;
 return <section id="discovery" className="scroll-mt-24 bg-mist py-16 md:py-20"><div className="mx-auto max-w-5xl px-4">
  <p className="mb-3 text-sm font-semibold text-primary">01 — {lang === 'ar' ? 'اكتشف اهتماماتك' : 'Explorez vos intérêts'}</p>
  <h2 className="max-w-3xl text-3xl font-bold leading-relaxed text-teal">{done ? copy.result[lang] : copy.discovery[lang]}</h2>
  <p className="mt-3 max-w-2xl text-muted-foreground">{copy.intro[lang]}</p>
  <div className="mt-8 border-t border-border pt-8">
   {done ? <><InterestResult /><Button variant="ghost" className="mt-6" onClick={() => {setStep(0);setDone(false);}}>{copy.edit[lang]}</Button></> : <>
    <div className="mb-7 flex items-center justify-between gap-4"><progress className="journey-progress w-full" value={step+1} max={list.length} aria-label={copy.discovery[lang]} /><span className="shrink-0 text-sm text-primary" dir="ltr">{step+1} / {list.length}</span></div>
    <div key={current.id} className="step-enter">{current.id === 'visited_haram' && <img src={hero} loading="lazy" width={1600} height={1008} alt={lang === 'ar' ? 'الكعبة المشرفة' : 'La Kaaba'} className="mb-5 h-40 w-full rounded-lg object-cover object-center" />}<QuestionChoices question={current} /></div>
    <div className="mt-7 flex justify-between"><Button variant="ghost" disabled={step === 0} onClick={() => setStep(s=>s-1)}>{copy.back[lang]}</Button><Button disabled={!ready || !draft.answers[current.id]?.length} className="h-12" onClick={() => step >= list.length-1 ? setDone(true) : setStep(s=>s+1)}>{step === list.length-1 ? copy.finish[lang] : copy.next[lang]}<Arrow /></Button></div>
   </>}
  </div>
 </div></section>;
}
