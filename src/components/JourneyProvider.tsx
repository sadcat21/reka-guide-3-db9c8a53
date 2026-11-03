import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { emptyDraft, questions, updateAnswer, groupIds, packageIds, accommodationLabels, type Draft, type AnswerKey } from '@/lib/journey';
type Context = { draft: Draft; ready: boolean; patch: (v: Partial<Draft>) => void; answer: (key: AnswerKey, values: string[]) => void };
const JourneyContext = createContext<Context | null>(null);
export function JourneyProvider({ children }: { children: ReactNode }) {
 const [draft, setDraft] = useState<Draft>(emptyDraft);
 const [ready, setReady] = useState(false);
 useEffect(() => {
  try {
   const raw = JSON.parse(window.localStorage.getItem('rifqa-journey') || 'null');
   if (raw && typeof raw === 'object') {
    const safe = { ...emptyDraft };
    for (const key of ['full_name','phone','wilaya','notes'] as const) if (typeof raw[key] === 'string') safe[key] = raw[key].slice(0, key === 'notes' ? 1000 : 100);
    if (groupIds.includes(raw.group_type)) safe.group_type = raw.group_type;
    if (packageIds.includes(raw.package_type)) safe.package_type = raw.package_type;
    if (Object.keys(accommodationLabels).includes(raw.accommodation)) safe.accommodation = raw.accommodation;
    if (['','male','female'].includes(raw.gender)) safe.gender = raw.gender;
    if (['','under18','18-25','26-35','36-50','over50'].includes(raw.age_range)) safe.age_range = raw.age_range;
    safe.has_companion = raw.has_companion === true;
    safe.companion_transport = safe.has_companion && raw.companion_transport === true;
    safe.answers = {};
    for (const q of questions) {
     const values = raw.answers?.[q.id];
     if (Array.isArray(values)) safe.answers[q.id] = [...new Set(values.filter((v: unknown): v is string => typeof v === 'string' && q.options.some(o => o.id === v)))].slice(0, q.multi ? q.options.length : 1);
    }
    if (safe.answers.hajj_umrah_experience?.[0] === 'none') delete safe.answers.trip_highlight;
    setDraft(safe);
   }
  } catch { /* Invalid or unavailable storage starts a clean journey. */ }
  setReady(true);
 }, []);
 useEffect(() => { if (ready) { try { window.localStorage.setItem('rifqa-journey', JSON.stringify(draft)); } catch { /* Final submission reports storage failure. */ } } }, [draft, ready]);
 const patch = (v: Partial<Draft>) => setDraft(d => ({ ...d, ...v }));
 const answer = (key: AnswerKey, values: string[]) => setDraft(d => ({ ...d, answers: updateAnswer(d.answers, key, values), ...(key === 'group_type' && groupIds.some(id => id === values[0]) ? { group_type: groupIds.find(id => id === values[0]) ?? d.group_type } : {}) }));
 return <JourneyContext.Provider value={{ draft, ready, patch, answer }}>{children}</JourneyContext.Provider>;
}
export function useJourney() {
 const ctx = useContext(JourneyContext);
 if (!ctx) throw new Error('Journey provider missing');
 return ctx;
}
