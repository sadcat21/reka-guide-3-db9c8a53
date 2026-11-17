/**
 * Call Copilot content and rules, taken from «دليل فريق الاتصال الهاتفي — الرفقة الطيبة».
 * Long scripts stay in Arabic, exactly as the guide gives them; labels are bilingual.
 */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { bi, groupLabels, packageLabels, pricing, formatPrice, type Bilingual, type GroupId, type PackageId } from "@/lib/journey";

export type CallLogRow = Database["public"]["Tables"]["rifqa_call_logs"]["Row"];
export type RegistrationRow = Database["public"]["Tables"]["murshid_rifqa_registrations"]["Row"];

/* ---------------- Personalities ---------------- */
export const personaIds = ["enthusiastic", "neutral", "skeptic", "indifferent"] as const;
export type PersonaId = (typeof personaIds)[number];

export const personas: Record<PersonaId, {
  icon: string; title: Bilingual; signals: string[]; share: string[]; avoid: string[]; rule: string;
}> = {
  enthusiastic: {
    icon: "⚡",
    title: bi("الإيجابي والمتحمس", "Enthousiaste"),
    signals: ["نبرة صوت حماسية ويرحب بالاتصال", "يطرح أسئلة عملية مباشرة حول موعد الدورة ومكانها وكيفية التسجيل"],
    share: ["خطوات تثبيت المقعد فورًا", "الفروق العملية بين الباقتين الذهبية والماسية", "ميزة تخفيض التسجيل الثنائي أو الثلاثي"],
    avoid: ["الإطالة في المقدمات النظرية", "فتح نقاشات جانبية قد تؤخر قراره الجاهز للتسجيل"],
    rule: "سرّع الإغلاق وثبّت الحجز.",
  },
  neutral: {
    icon: "⚖️",
    title: bi("الحيادي والمقارن", "Neutre / comparateur"),
    signals: ["نبرة هادئة ويكتفي بكلمات مقتضبة («نعم»، «أكمل»)", "يجمع المعلومات ليقارنها بدورات أو خيارات أخرى"],
    share: ["نقاط القوة الملموسة: 6 مدربين مختصين (طبيب، حماية مدنية، إرشاد ميداني)", "طبيعة الورشات التطبيقية والمحاكاة خلال 5 أيام"],
    avoid: ["الضغط عليه لاتخاذ قرار فوري", "التقليل من شأن أي جهة تدريبية أخرى"],
    rule: "قدّم الدليل والمنهجية.",
  },
  skeptic: {
    icon: "🛡️",
    title: bi("المعارض والمتشكك", "Sceptique"),
    signals: ["نبرة حذرة أو دفاعية، يبدأ بانتقاد أو شك («كل الدورات مجرد كلام نظري»)", "يسأل: «هل هناك عمل مضمون فعلًا؟»"],
    share: ["الشفافية التامة: لا يوجد ضمان توظيف آلي", "المحاكاة تتم في القاعة وليس في مكة", "إبراز القيمة العملية الحقيقية"],
    avoid: ["الجدال الحاد", "المبالغة في الوعود لإرضائه", "تقديم أي ضمانات غير معتمدة من الإدارة"],
    rule: "قدّم المصداقية والحدود الواضحة.",
  },
  indifferent: {
    icon: "⏳",
    title: bi("اللامبالي والمستعجل", "Pressé / peu intéressé"),
    signals: ["نبرة فاترة أو يقول «سجّلت بالخطأ»", "يطلب: «أرسل لي التفاصيل في رسالة فقط»", "يبدو مشغولًا أثناء المكالمة"],
    share: ["جملة خطّافة واحدة: «5 أيام تطبيقية لإتقان مرافقة المعتمرين»", "طلب الإذن لإرسال ملخص مختصر عبر واتساب"],
    avoid: ["سرد تفاصيل الباقات والأسعار والشروط الطويلة؛ ذهنه غير مهيأ للاستيعاب حاليًا"],
    rule: "اختصر الكلام وانتقل للمتابعة عبر واتساب في وقت أنسب.",
  },
};

/** Signals the caller shows during the call; each points to one personality. */
export const callSignals = personaIds.flatMap((p) =>
  personas[p].signals.map((text, i) => ({ id: `${p}-${i}`, persona: p, text })),
);

/** Picks the personality with the most ticked signals; ties or nothing ticked → null. */
export function scorePersona(ticked: string[]): { persona: PersonaId | null; scores: Record<PersonaId, number> } {
  const scores = Object.fromEntries(personaIds.map((p) => [p, 0])) as Record<PersonaId, number>;
  for (const s of callSignals) if (ticked.includes(s.id)) scores[s.persona]++;
  const top = Math.max(...Object.values(scores));
  const leaders = personaIds.filter((p) => scores[p] === top);
  return { persona: top > 0 && leaders.length === 1 ? (leaders[0] ?? null) : null, scores };
}

/* ---------------- Fixed guidance ---------------- */
export const redLines = [
  "لا تذكر جولة المطار ولا زيارة الوكالة؛ أُلغيتا من البرنامج.",
  "لا وظيفة مضمونة ولا عمرة مجانية للجميع: التوظيف حسب احتياج الوكالات، والعمرة عبر قرعة بشروط معلنة.",
  "لا خصم خارج التسعيرة المعتمدة (فردي / ثنائي / ثلاثي).",
  "بطاقات التخفيض ميزة إضافية بشروطها، وليست خصمًا يُطرح من رسوم التسجيل.",
  "لا تؤكد موعد الفوج أو العنوان أو المقاعد المتبقية أو آخر أجل إلا بعد مراجعة بيانات الإدارة اليومية.",
  "لا تبدأ المكالمة بذكر السعر؛ القيمة التدريبية أولًا.",
];

export const callStages = [
  { title: "الترحيب والتعريف", time: "15 ثانية", text: "التحية باسم البرنامج، التأكد من هوية المتصل، وربط الاتصال بالاستمارة." },
  { title: "اكتشاف الدافع", time: "دقيقة", text: "سؤال مفتوح عن خلفيته وسبب اهتمامه بالإرشاد ومرافقة المعتمرين." },
  { title: "تقديم القيمة التدريبية", time: "دقيقتان", text: "5 أيام نظرية وتطبيقية، المحاور الستة وفريق المختصين حسب ما يهمه." },
  { title: "عرض الباقات", time: "دقيقة", text: "الفضية والذهبية والماسية، بطاقات التخفيض، وتخفيض الثنائي والثلاثي بالتسعيرة المعتمدة." },
  { title: "الإغلاق والخطوة التالية", time: "30 ثانية", text: "تأكيد الحجز وآلية الدفع، أو تحديد موعد واضح للمتابعة." },
];

export const discoveryQuestions = [
  {
    q: "هل سبق لك مرافقة معتمرين أو العمل في السياحة الدينية؟",
    reveals: "مستوى خبرته: مبتدئ يبحث عن الانطلاقة أم صاحب تجربة يريد تطوير أدائه.",
    focus: "للمبتدئ: أساسيات الفقه والإرشاد الميداني. لصاحب الخبرة: إدارة المواقف الصعبة والتنظيم الاحترافي.",
  },
  {
    q: "ما أكثر جانب يهمك في عمل المرشد: التنظيم، أم التعامل مع كبار السن والطوارئ؟",
    reveals: "نقطة الاهتمام العاطفية أو المهنية التي تحفّزه على التسجيل.",
    focus: "إبراز عون الحماية المدنية والطبيب ضمن المدربين، والتركيز على الورشات التطبيقية والمحاكاة.",
  },
  {
    q: "هل تفكر في الالتحاق بمفردك أم مع صديق أو زميل مهتم بالمجال؟",
    reveals: "يفتح باب التسجيل الثنائي أو الثلاثي مبكرًا ويقلل اعتراض السعر لاحقًا.",
    focus: "توضيح ميزة التخفيض الجماعي عند التسجيل لشخصين أو ثلاثة.",
  },
];

export const objections = [
  { q: "هل تضمنون لي عملًا مع وكالة سياحية بعد الدورة؟", a: "«نحن نؤهلك عمليًا لتكون جاهزًا للعمل ومطلوبًا لدى الوكالات، وقد تتاح فرص عمل جزئي للمتدربين المتميزين والمؤهلين حسب احتياجات الوكالة والفرص المتوفرة، لكننا بكل شفافية لا نقدم ضمان توظيف آلي لكل مشارك.»" },
  { q: "هل يحصل كل متدرب على عمرة مجانية؟", a: "«العمرة المجانية ليست مضمونة للجميع، بل هناك قرعة رسمية تُجرى في كل فوج بين المتدربين وفق شروط واضحة ومعلنة من الإدارة.»" },
  { q: "هل التطبيق الميداني يكون في مكة المكرمة؟", a: "«التكوين يمتد لخمسة أيام محليًا في قاعة التدريب، ويتضمن ورشات محاكاة عملية وتمارين ميدانية تحاكي مواقف الحج والعمرة بدقة، ولا يشمل سفرًا إلى البقاع المقدسة.»" },
  { q: "السعر مرتفع / أحتاج للتفكير", a: "«أتفهم حرصك. تذكّر أن البرنامج يجمع 6 مدربين مختصين على مدار 5 أيام تطبيقية كاملة، ويمكنك تخفيض التكلفة عبر التسجيل الثنائي أو الثلاثي مع زملائك، أو الاستفادة من بطاقات التخفيض في الباقتين الذهبية والماسية.»" },
  { q: "هل الشهادة معتمدة؟", a: "«يُمنح المتدرب شهادة مشاركة وتأهيل في ختام الدورة توثّق اجتيازه للمحاور التدريبية الستة، ونوضح لك طبيعتها والجهة المانحة بدقة [حسب اعتماد الإدارة].»" },
  { q: "هل تشمل الباقة الإقامة والطعام؟", a: "«أسعار الباقات تخص البرنامج التدريبي، أما الإقامة فتُحسب كبند مستقل لمن يقطن خارج الولاية عند توفرها وتأكيد تفاصيلها من الإدارة.»" },
];

export const closingChecklist = [
  "عرف أن مدة الدورة 5 أيام وتجمع بين النظري والتطبيقي.",
  "وضّحت الفروق ومزايا الباقات الثلاث (الفضية، الذهبية، الماسية).",
  "أبلغته بقيمة التسجيل المعتمدة وآلية الدفع وتثبيت الحجز.",
  "سأرسل له رسالة ملخصة عبر واتساب (الموقع، الموعد، تفاصيل التسجيل).",
];

export const openingScript =
  "«السلام عليكم ورحمة الله، معك [اسمك] من فريق برنامج الرفقة الطيبة لإعداد مرشدي ومرافقي الحج والعمرة. تواصلنا معك بخصوص تسجيلك في استمارة الدورة القادمة. هل وقتك مناسب الآن لدقيقتين حتى نشرح لك التفاصيل؟ ... ممتاز. قبل أن نبدأ، أخبرني ما الذي شدّك أكثر للبرنامج؟ هل لديك تجربة سابقة في مرافقة المعتمرين أم تبحث عن اكتساب مهارات جديدة للدخول في هذا المجال؟»";

export const groupScript =
  "«بما أنك متحمس للالتحاق بالدورة، هل لديك صديق أو زميل في العمل أو الدراسة يهتم بمجال الحج والعمرة؟ خصصنا تسعيرة مخفّضة عند التسجيل الثنائي أو الثلاثي، بحيث يستفيد كل فرد منكم من تخفيض معتبر على رسوم الباقة، كما أن التعلم والتطبيق العملي مع زميل يكون أكثر متعة وفائدة.»";

export const followUpScripts = [
  { title: "المكالمة الثانية (بعد 24–48 ساعة)", avoid: "لا تسأل: «هل قررت التسجيل أم لا؟»", text: "«السلام عليكم ورحمة الله أستاذ/ة [الاسم]، معك [اسمك] من برنامج الرفقة الطيبة. تواصلت معك بخصوص دورة إعداد مرشدي ومرافقي الحج والعمرة، وأردت فقط التأكد من وصول رسالة التفاصيل عبر واتساب، وهل بقي لديك أي استفسار حول المحاور التطبيقية أو نظام الباقات حتى أوضحه لك؟»" },
  { title: "المكالمة الثالثة (بعد 3–4 أيام)", avoid: "لا تعاتبه على التأخر ولا تكرر كلام المكالمة الأولى حرفيًا.", text: "«مرحبًا أستاذ/ة [الاسم]، معك [اسمك] من فريق الرفقة الطيبة. بما أنك أبديت اهتمامًا بالدورة القادمة، أحببت إبلاغك أن المقاعد المتبقية لهذا الفوج أوشكت على الاكتمال، وأردت أن أعطيك الأولوية قبل غلق القائمة. هل تمكنت من التنسيق مع زميل للاستفادة من التسجيل الثنائي، أم نثبت لك مقعدًا فرديًا الآن؟»" },
  { title: "الإغلاق اللبق (اعتذار أو تأجيل)", avoid: "لا تغلق الملف دون ترك انطباع إيجابي.", text: "«لا بأس إطلاقًا أستاذ/ة [الاسم]، نقدّر ظروفك ونتمنى لك كل التوفيق. سنحتفظ ببياناتك ضمن قائمة الأولوية للفوج القادم إن شاء الله، وسنكون سعداء بخدمتك متى ما كان وقتك مناسبًا. في أمان الله.»" },
];

/* ---------------- Call results & follow-up ---------------- */
export const outcomeIds = ["confirmed", "hot", "hesitant", "no_answer", "declined"] as const;
export type OutcomeId = (typeof outcomeIds)[number];

export const outcomes: Record<OutcomeId, { title: Bilingual; action: string; status: "confirmed" | "contacted" | "cancelled" | null }> = {
  confirmed: { title: bi("مسجل مؤكد", "Inscrit confirmé"), action: "إرسال تفاصيل الدفع والموقع فورًا عبر واتساب، وتأكيد الاستلام خلال 24 ساعة.", status: "confirmed" },
  hot: { title: bi("مهتم جدًا (ساخن)", "Très intéressé"), action: "إرسال ملخص الباقات عبر واتساب، وإعادة الاتصال خلال 24 إلى 48 ساعة.", status: "contacted" },
  hesitant: { title: bi("متردد / يفكر", "Hésitant"), action: "إرسال مقطع تعريفي قصير لأحد المدربين عبر واتساب، والمتابعة بعد 3 أيام.", status: "contacted" },
  no_answer: { title: bi("لم يرد / مشغول", "Pas de réponse"), action: "إرسال رسالة واتساب تعريفية، وإعادة المحاولة في فترة مختلفة (صباحًا/مساءً) بحد أقصى 3 محاولات.", status: null },
  declined: { title: bi("غير مؤهل / معتذر", "Désisté"), action: "شكره بلباقة وتسجيله في قائمة المهتمين بالدورات القادمة في ولايته.", status: "cancelled" },
};

export const MAX_NO_ANSWER_ATTEMPTS = 3;
const HOUR = 3_600_000;

/**
 * Next follow-up time for a call result, per the guide's cadence.
 * `noAnswerAttempts` counts unanswered calls including this one.
 */
export function nextFollowUp(outcome: OutcomeId, now: Date, noAnswerAttempts = 1): Date | null {
  switch (outcome) {
    case "confirmed": return new Date(now.getTime() + 24 * HOUR);
    case "hot": return new Date(now.getTime() + 24 * HOUR);
    case "hesitant": return new Date(now.getTime() + 72 * HOUR);
    case "no_answer": return noAnswerAttempts >= MAX_NO_ANSWER_ATTEMPTS ? null : new Date(now.getTime() + 12 * HOUR);
    case "declined": return null;
  }
}

/** Latest call per registration (logs must be newest first). */
export function latestCallByRegistration(logs: CallLogRow[]) {
  const map = new Map<string, CallLogRow>();
  for (const l of logs) if (!map.has(l.registration_id)) map.set(l.registration_id, l);
  return map;
}

/** Registrations whose latest call has a follow-up time that has arrived. */
export function dueFollowUps(logs: CallLogRow[], now = new Date()) {
  const due = new Set<string>();
  for (const [id, l] of latestCallByRegistration(logs)) {
    if (l.follow_up_at && new Date(l.follow_up_at).getTime() <= now.getTime()) due.add(id);
  }
  return due;
}

/* ---------------- Before the call: read the questionnaire ---------------- */
export function preCallInsights(r: Pick<RegistrationRow, "previous_group_experience" | "training_priorities" | "group_type" | "has_companion" | "motivation" | "package_type">): string[] {
  const tips: string[] = [];
  const exp = r.previous_group_experience ?? [];
  if (exp.includes("none") || exp.length === 0) tips.push("مبتدئ: ركّز على أساسيات الفقه والإرشاد الميداني، وطمئنه أن البرنامج يبدأ من الصفر.");
  else tips.push("لديه خبرة: ركّز على إدارة المواقف الصعبة والتنظيم الاحترافي للمجموعات.");
  const pr = r.training_priorities ?? [];
  if (pr.includes("safety")) tips.push("يهتم بالسلامة: أبرز عون الحماية المدنية والطبيب المختص بكبار السن.");
  if (pr.includes("religion")) tips.push("يهتم بالفقه: أبرز محور فقه الحج والعمرة.");
  if (pr.includes("field") || pr.includes("leadership")) tips.push("يهتم بالميدان والقيادة: أبرز الإرشاد الميداني وإدارة المجموعات والمحاكاة.");
  if (pr.includes("communication")) tips.push("يهتم بالتواصل: أبرز محور مهارات التواصل وإدارة المواقف الصعبة.");
  if (pr.includes("digital")) tips.push("يهتم بالمحتوى: أبرز ورشة التصوير وصناعة المحتوى بالهاتف.");
  const mot = r.motivation ?? [];
  if (mot.includes("career") || mot.includes("business")) tips.push("دافعه مهني: كن شفافًا — تأهيل عملي وفرص حسب احتياج الوكالات، دون ضمان توظيف.");
  if (r.group_type === "individual" && !r.has_companion) tips.push("سجّل بمفرده: اسأل عن صديق أو زميل لتفعيل تخفيض الثنائي/الثلاثي.");
  else if (r.group_type === "pair" || r.group_type === "group3") tips.push("اختار تسجيلًا جماعيًا: تأكد من أسماء وأرقام بقية أفراد المجموعة.");
  if (r.package_type === "gold" || r.package_type === "diamond") tips.push("اختار باقة ببطاقات تخفيض: وضّح أنها ميزة بشروطها وليست خصمًا من الرسوم.");
  return tips;
}

/* ---------------- WhatsApp ---------------- */
/** Algerian local numbers (0XXXXXXXXX) become 213XXXXXXXXX for wa.me links. */
export function toWhatsAppNumber(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0") && d.length === 10) d = `213${d.slice(1)}`;
  return d;
}

export function officialPrice(pkg: string, group: string): string {
  const p = pricing[pkg as PackageId]?.[group as GroupId];
  return p ? `${formatPrice(p)} دج` : "[المبلغ]";
}

export function whatsappTemplate(kind: "serious" | "hesitant" | "no_answer", r: Pick<RegistrationRow, "full_name" | "package_type" | "group_type">) {
  const name = r.full_name.trim().split(/\s+/)[0] || "[الاسم]";
  if (kind === "serious") {
    const pkg = packageLabels[r.package_type as PackageId]?.ar ?? "[اسم الباقة]";
    const grp = groupLabels[r.group_type as GroupId]?.ar ?? "";
    return `السلام عليكم ورحمة الله أستاذ/ة ${name}، سعدنا بالتواصل معك بخصوص برنامج الرفقة الطيبة لإعداد مرشدي ومرافقي الحج والعمرة.
• مدة التكوين: 5 أيام نظرية وتطبيقية (6 محاور متكاملة).
• الباقة المختارة: ${pkg}${grp ? ` (${grp})` : ""} — التسعيرة المعتمدة: ${officialPrice(r.package_type, r.group_type)} للفرد.
• موعد ومكان الدورة: [التاريخ والعنوان المعتمد].
لتثبيت مقعدك نهائيًا، يرجى إتمام إجراء التأكيد عبر: [آلية الدفع / الحضور للمقر]. لأي استفسار نحن في خدمتك.`;
  }
  if (kind === "hesitant") {
    return `السلام عليكم أستاذ/ة ${name}، تشرفت بالحديث معك اليوم حول برنامج الرفقة الطيبة. للتذكير، الدورة تمنحك تأهيلًا عمليًا حقيقيًا عبر محاكاة ميدانية مع 6 مدربين مختصين (فقه، إرشاد ميداني، حماية مدنية، طبيب، تواصل، وصناعة محتوى).
ملاحظة: يمكنك الاستفادة من تخفيض خاص عند التسجيل مع صديق أو ضمن مجموعة من 3 أشخاص. يسعدنا تواصلك معنا متى قررت حجز مقعدك.`;
  }
  return `السلام عليكم أستاذ/ة ${name}، حاولنا الاتصال بك من فريق برنامج الرفقة الطيبة بخصوص استمارة تسجيلك في دورة إعداد مرشدي ومرافقي الحج والعمرة. يسعدنا تزويدك بكافة التفاصيل والباقات المتاحة؛ ما هو الوقت المناسب لنعاود الاتصال بك؟`;
}

export const templateForOutcome: Record<OutcomeId, "serious" | "hesitant" | "no_answer" | null> = {
  confirmed: "serious", hot: "serious", hesitant: "hesitant", no_answer: "no_answer", declined: null,
};

/* ---------------- Data ---------------- */
export const callLogsQuery = queryOptions({
  queryKey: ["admin", "call-logs"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("rifqa_call_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw error;
    return data;
  },
});
