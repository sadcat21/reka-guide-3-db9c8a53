import { z } from 'zod';
import type { Lang } from '@/i18n/translations';
export type Bilingual = { ar: string; fr: string };
export const bi = (ar: string, fr: string): Bilingual => ({ ar, fr });
export const groupIds = ['individual', 'pair', 'group3'] as const;
export const packageIds = ['silver', 'gold', 'diamond'] as const;
export type GroupId = typeof groupIds[number];
export type PackageId = typeof packageIds[number];
export const pricing: Record<PackageId, Record<GroupId, number>> = {
 silver: { individual: 45000, pair: 44000, group3: 43000 },
 gold: { individual: 48000, pair: 47000, group3: 46000 },
 diamond: { individual: 53000, pair: 52000, group3: 51000 },
};
export const accommodationRates = { hotelDuring: 2500, hotelOutside: 3000, dormMen: 500, dormWomen: 500, companionTransport: 2000 };
export const groupLabels = { individual: bi('بمفردي', 'Seul'), pair: bi('مع شخص واحد', 'En binôme'), group3: bi('مجموعة من 3 أشخاص', 'Groupe de 3') };
export const packageLabels = { silver: bi('فضية', 'Argent'), gold: bi('ذهبية', 'Or'), diamond: bi('ماسية', 'Diamant') };
export const accommodationLabels = {
 none: bi('بدون إقامة', 'Sans hébergement'), hotel: bi('فندق', 'Hôtel'), dormMen: bi('جناح الرجال', 'Dortoir hommes'), dormWomen: bi('جناح النساء', 'Dortoir femmes'),
};
export const formatPrice = (n: number) => n.toLocaleString('en-US');
export type AnswerKey = 'visited_haram' | 'hajj_umrah_experience' | 'trip_highlight' | 'previous_group_experience' | 'motivation' | 'professional_ambition' | 'knowledge_level' | 'training_priorities' | 'group_type';
export type Answers = Partial<Record<AnswerKey, string[]>>;
type Option = { id: string; label: Bilingual };
export type Question = { id: AnswerKey; title: Bilingual; options: Option[]; multi?: boolean };
const opts = (items: [string, string, string][]): Option[] => items.map(([id, ar, fr]) => ({ id, label: bi(ar, fr) }));
export const questions: Question[] = [
 { id: 'visited_haram', title: bi('هل سبق لك زيارة المسجد الحرام؟', 'Avez-vous déjà visité la Mosquée sacrée de La Mecque ?'), options: opts([
 ['many','نعم، زرت الحرم أكثر من مرة.','Oui, plusieurs fois.'], ['once','نعم، زرته مرة واحدة.','Oui, une seule fois.'], ['dream','لم أزره بعد، لكنه من أمنياتي.','Pas encore, mais c’est un rêve.'], ['not_yet','لم تتح لي الفرصة بعد.','Je n’en ai pas encore eu l’occasion.']]) },
 { id: 'hajj_umrah_experience', title: bi('هل سبق لك أداء العمرة أو الحج؟', 'Avez-vous déjà accompli la Omra ou le Hajj ?'), options: opts([['umrah','العمرة فقط.','La Omra uniquement.'], ['hajj','الحج فقط.','Le Hajj uniquement.'], ['both','العمرة والحج.','Les deux.'], ['none','لم أؤدِّ أيًا منهما بعد.','Aucun des deux pour le moment.']]) },
 { id: 'trip_highlight', title: bi('ما أكثر شيء لفت انتباهك خلال الرحلة؟', 'Qu’est-ce qui vous a le plus marqué pendant le voyage ?'), options: opts([['organization','تنظيم المجموعة ومرافقتها.','L’organisation et l’accompagnement du groupe.'], ['guide','دور المرشد والمرافق.','Le rôle du guide.'], ['religion','الجوانب الشرعية.','Les aspects religieux.'], ['services','الخدمات والتنقلات.','Les services et les déplacements.'], ['journey','تجربة الرحلة بشكل عام.','L’expérience du voyage dans son ensemble.']]) },
 { id: 'previous_group_experience', title: bi('هل لديك تجربة سابقة في مرافقة المجموعات أو تنظيم الرحلات؟', 'Avez-vous déjà accompagné des groupes ou organisé des voyages ?'), options: opts([['pilgrimage','نعم، لدي تجربة في الحج أو العمرة.','Oui, dans le Hajj ou la Omra.'], ['tourism','نعم، لدي تجربة في السياحة أو تنظيم الرحلات.','Oui, dans le tourisme ou l’organisation de voyages.'], ['groups','لدي تجربة في العمل مع المجموعات.','J’ai travaillé avec des groupes.'], ['none','لا، أبدأ من الصفر.','Non, je pars de zéro.']]) },
 { id: 'motivation', multi: true, title: bi('ما الذي يجذبك إلى مجال الإرشاد في الحج والعمرة؟', 'Qu’est-ce qui vous attire dans le métier de guide du Hajj et de la Omra ?'), options: opts([['service','خدمة الحجاج والمعتمرين.','Servir les pèlerins.'], ['career','العمل في مجال الحج والعمرة.','Travailler dans le Hajj et la Omra.'], ['skills','اكتساب مهنة ومهارات جديدة.','Acquérir un métier et de nouvelles compétences.'], ['religion','تطوير خبرتي الدينية والميدانية.','Développer mes connaissances religieuses et de terrain.'], ['leadership','قيادة الفرق وتنظيم الرحلات.','Diriger des équipes et organiser des voyages.'], ['business','بناء مشروع أو نشاط مهني.','Créer un projet ou une activité professionnelle.'], ['digital','تطوير حضوري الرقمي وصناعة المحتوى.','Développer ma présence numérique et créer du contenu.']]) },
 { id: 'professional_ambition', title: bi('كيف تتخيل دورك في هذا المجال مستقبلًا؟', 'Comment imaginez-vous votre rôle dans ce domaine à l’avenir ?'), options: opts([['guide','مرشد ومرافق للحجاج والمعتمرين.','Guide et accompagnateur des pèlerins.'], ['leader','قائد فريق من المرشدين.','Chef d’une équipe de guides.'], ['operations','مسؤول عن تنظيم العمليات والرحلات.','Responsable des opérations et des voyages.'], ['digital','صانع محتوى ومتخصص في التسويق السياحي.','Créateur de contenu et spécialiste du marketing touristique.'], ['explorer','أريد اكتشاف المجال أولًا.','Je souhaite d’abord découvrir ce domaine.']]) },
 { id: 'knowledge_level', title: bi('كيف تقيّم معرفتك بمهام المرشد؟', 'Comment évaluez-vous vos connaissances du métier de guide ?'), options: opts([['beginner','مبتدئ تمامًا.','Débutant complet.'], ['general','لدي معلومات عامة.','J’ai des connaissances générales.'], ['experienced','لدي تجربة ومعرفة جيدة.','J’ai de l’expérience et de bonnes connaissances.'], ['practicing','أمارس بعض المهام وأريد تطوير نفسي.','J’exerce certaines missions et souhaite progresser.']]) },
 { id: 'training_priorities', multi: true, title: bi('ما المهارة التي ترغب في تطويرها أكثر؟', 'Quelle compétence souhaitez-vous le plus développer ?'), options: opts([['religion','فقه الحج والعمرة.','Jurisprudence du Hajj et de la Omra.'], ['field','المرافقة والتعامل مع المواقف الميدانية.','Accompagnement et situations de terrain.'], ['leadership','القيادة وإدارة العمليات.','Leadership et gestion des opérations.'], ['safety','الإسعافات والسلامة.','Premiers secours et sécurité.'], ['communication','التواصل وخدمة العملاء.','Communication et service client.'], ['digital','التصوير وصناعة المحتوى.','Photographie et création de contenu.']]) },
 { id: 'group_type', title: bi('هل تفكر في التسجيل بمفردك أم مع آخرين؟', 'Envisagez-vous de vous inscrire seul ou avec d’autres personnes ?'), options: [...groupIds.map(id => ({ id, label: groupLabels[id] })), { id: 'undecided', label: bi('لم أحدد بعد.', 'Je n’ai pas encore décidé.') }] },
];
export function activeQuestions(answers: Answers) {
 const performed = answers.hajj_umrah_experience?.[0];
 return questions.filter(q => q.id !== 'trip_highlight' || (performed !== undefined && performed !== 'none'));
}
export function updateAnswer(answers: Answers, key: AnswerKey, value: string[]): Answers {
 const next = { ...answers, [key]: value };
 if (key === 'hajj_umrah_experience' && value[0] === 'none') delete next.trip_highlight;
 return next;
}
export function answerLabel(key: AnswerKey, values: string[] | undefined, lang: Lang) {
 const q = questions.find(item => item.id === key);
 return (values ?? []).map(value => q?.options.find(o => o.id === value)?.label[lang]).filter(Boolean).join(' · ');
}
export type ProfileId = 'guide' | 'leader' | 'digital' | 'explorer';
export const profiles: Record<ProfileId, { title: Bilingual; text: Bilingual; stage: number }> = {
 guide: { title: bi('المرشد الطموح', 'Le guide de demain'), stage: 1, text: bi('اهتمامك بخدمة الحجاج ومرافقتهم يفتح لك باب تطوير المعرفة الشرعية ومهارات الخدمة والتطبيق الميداني.', 'Votre intérêt pour le service et l’accompagnement des pèlerins vous invite à développer vos connaissances religieuses et vos compétences de terrain.') },
 leader: { title: bi('القائد المنظم', 'Le leader organisé'), stage: 2, text: bi('اهتمامك بتنظيم الرحلات وقيادة الفرق يجعل التخطيط وإدارة العمليات والقيادة محاور مهمة في رحلتك التدريبية.', 'Votre intérêt pour les équipes et l’organisation des voyages fait du leadership, de la planification et des opérations des axes importants de votre parcours.') },
 digital: { title: bi('المرشد الرقمي', 'Le guide digital'), stage: 3, text: bi('اهتمامك بصناعة المحتوى والحضور الرقمي يمنحك فرصة لتطوير التصوير والتواصل والهوية المهنية، إلى جانب أساسيات الإرشاد.', 'Votre intérêt pour le contenu et la présence numérique vous invite à développer la photographie, la communication et votre identité professionnelle, avec les bases du métier de guide.') },
 explorer: { title: bi('المستكشف الجديد', 'Le nouvel explorateur'), stage: 1, text: bi('ابدأ باكتشاف أساسيات الإرشاد والمرافقة، ثم تطور عبر المراحل الثلاث المتكاملة وفق اهتماماتك.', 'Découvrez les bases du métier et de l’accompagnement, puis progressez dans les trois étapes intégrées selon vos intérêts.') },
};
export function getInterestProfile(a: Answers): ProfileId {
 const ambition = a.professional_ambition?.[0];
 if (ambition === 'leader' || ambition === 'operations') return 'leader';
 if (ambition === 'digital') return 'digital';
 if (ambition === 'guide') return 'guide';
 const scores: Record<'guide' | 'leader' | 'digital', number> = { guide: 0, leader: 0, digital: 0 };
 for (const value of a.motivation ?? []) {
  if (['service','career','religion'].includes(value)) scores.guide += 1;
  if (['leadership','business'].includes(value)) scores.leader += 1;
  if (value === 'digital') scores.digital += 1;
 }
 for (const value of a.training_priorities ?? []) {
  if (['field','religion','safety','communication'].includes(value)) scores.guide += 1;
  if (value === 'leadership') scores.leader += 1;
  if (value === 'digital') scores.digital += 1;
 }
 if (ambition === 'explorer' && a.previous_group_experience?.[0] === 'none') return 'explorer';
 const ids = ['guide','leader','digital'] as const;
 let result: typeof ids[number] = 'guide';
 for (const id of ids) if (scores[id] > scores[result]) result = id;
 return scores[result] === 0 ? 'explorer' : result;
}
const answerShape: Record<string, z.ZodTypeAny> = {};
for (const q of questions) {
 const allowed = new Set(q.options.map(o => o.id));
 let field = z.array(z.string().refine(v => allowed.has(v))).min(1).max(q.multi ? q.options.length : 1).refine(v => new Set(v).size === v.length);
 answerShape[q.id] = q.id === 'trip_highlight' ? field.optional() : field;
}
export const answersSchema = z.object(answerShape).superRefine((value, ctx) => {
 if (value['hajj_umrah_experience']?.[0] !== 'none' && !value['trip_highlight']?.length) ctx.addIssue({ code: 'custom', path: ['trip_highlight'], message: 'Required' });
});
export const personalSchema = z.object({
 full_name: z.string().trim().min(2).max(100),
 phone: z.string().trim().max(30).transform(v => v.replace(/[\s().-]/g, '')).refine(v => /^(?:0[1-9]\d{8}|(?:\+213|00213)[1-9]\d{8})$/.test(v)),
 wilaya: z.string().trim().min(2).max(80), gender: z.enum(['','male','female']), age_range: z.enum(['','under18','18-25','26-35','36-50','over50']),
});
export const registrationSchema = personalSchema.extend({
 answers: answersSchema, group_type: z.enum(groupIds), package_type: z.enum(packageIds), accommodation: z.enum(['none','hotel','dormMen','dormWomen']),
 has_companion: z.boolean(), companion_transport: z.boolean(), notes: z.string().trim().max(1000), preferred_language: z.enum(['ar','fr']), consent: z.literal(true),
});
export type Personal = z.infer<typeof personalSchema>;
export type Draft = Personal & { answers: Answers; group_type: GroupId; package_type: PackageId; accommodation: keyof typeof accommodationLabels; has_companion: boolean; companion_transport: boolean; notes: string; consent: boolean };
export const emptyDraft: Draft = { full_name: '', phone: '', wilaya: '', gender: '', age_range: '', answers: {}, group_type: 'individual', package_type: 'gold', accommodation: 'none', has_companion: false, companion_transport: false, notes: '', consent: false };
