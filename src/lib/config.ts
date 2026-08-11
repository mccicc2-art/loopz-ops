// ============================================================
//  حقائقُ البنية التحتية — منقولةٌ حرفياً من 18_Project_Context.md
//  هذا هو المصدرُ الوحيد للحدود والخطط. لا تُكرَّر في مكانٍ آخر.
// ============================================================

export type Provider = {
  id: string;
  name: string;
  plan: string;
  planTone: "free" | "paid" | "domain";
  what: string;          // ماذا يقدّم لنا
  risk: string;          // ما الذي يهدّدنا من جهته
  dashboard: string;
  limits: { label: string; value: string }[];
};

// الحدودُ الرقمية التي نقيس عليها. لو تغيّرت الخطة، تُغيَّر هنا فقط.
export const LIMITS = {
  supabaseFree: {
    dbBytes: 500 * 1024 * 1024,        // 500 MB
    storageBytes: 1 * 1024 * 1024 * 1024, // 1 GB
    egressBytes: 5 * 1024 * 1024 * 1024,  // 5 GB / شهر
    mau: 50_000,
  },
  vercelPro: {
    deploymentsPerDay: 6_000,
    bandwidthBytes: 1024 * 1024 * 1024 * 1024, // 1 TB مشمولة
  },
  githubApiAnon: 60,   // نداء/ساعة لكل IP بلا توكن
  tmdbPerSecond: 50,   // حدُّ TMDB العملي
} as const;

export const PROVIDERS: Provider[] = [
  {
    id: "vercel",
    name: "Vercel",
    plan: "Pro — مدفوع",
    planTone: "paid",
    what: "الاستضافة والنشر وشبكة التوصيل. كلُّ كوميت يبني.",
    risk: "تجاوزُ الباندويث أو الدوال يتحوّل إلى فاتورة، لا إلى توقّف. والأخطرُ عملياً: نشرةٌ تنتهي بعد ابنتها فتبقى الأقدمُ إنتاجاً.",
    dashboard: "https://vercel.com/mccicc2-arts-projects/meshahed",
    limits: [
      { label: "نشرات/يوم", value: "6,000" },
      { label: "باندويث مشمول", value: "1 TB" },
      { label: "المنطقة", value: "bom1" },
    ],
  },
  {
    id: "supabase",
    name: "Supabase",
    plan: "Free — مجاني",
    planTone: "free",
    what: "قاعدة البيانات والمصادقة والمخزن ووظيفة pg_cron اليومية.",
    risk: "هذا هو السقفُ الحقيقي. 500MB قاعدة و1GB مخزن و5GB خروج شهرياً — وتجاوزُها يوقف الخدمة لا يفوترها. والمشروعُ المجاني يُوقَف بعد سبعة أيام خمول.",
    dashboard: "https://supabase.com/dashboard/project/uvgmvrdrxzpudoldjxaa",
    limits: [
      { label: "قاعدة البيانات", value: "500 MB" },
      { label: "المخزن", value: "1 GB" },
      { label: "الخروج الشهري", value: "5 GB" },
      { label: "MAU", value: "50,000" },
    ],
  },
  {
    id: "github",
    name: "GitHub",
    plan: "Free — مستودع عام",
    planTone: "free",
    what: "الشيفرة، والمصدرُ الذي تبني منه Vercel.",
    risk: "لا يهدّد الاستقرار عملياً. المستودعُ عام، فلا حصّةَ دقائق ولا CI.",
    dashboard: "https://github.com/mccicc2-art/meshahed",
    limits: [{ label: "حجم موصى به", value: "< 1 GB" }],
  },
  {
    id: "tmdb",
    name: "TMDB",
    plan: "مفتاح مجاني — غير تجاري",
    planTone: "free",
    what: "الكتالوج كلّه: الأعمال والصور والمقاطع.",
    risk: "⚠️ الشرطُ رخصةٌ تجارية عند تحقيق دخل — وفنُّ الأعمال الشخصي (D-131) مبنيٌّ على صورهم حرفياً. وTMDB تشترط إظهار رابط JustWatch مع الأسعار (D-150).",
    dashboard: "https://www.themoviedb.org/settings/api",
    limits: [{ label: "معدّل عملي", value: "~50 طلب/ثانية" }],
  },
  {
    id: "google",
    name: "Google OAuth",
    plan: "مجاني — In production",
    planTone: "free",
    what: "طريقةُ الدخول الوحيدة. لا بديلَ لها في التطبيق.",
    risk: "أخطرُ نقطةٍ مفردة: لو تعطّلت لا أحدَ يدخل. ولا شعارَ مرفوعاً عمداً — رفعُه يفرض تحقّق علامة.",
    dashboard: "https://console.cloud.google.com/apis/credentials?project=utility-league-504219-j4",
    limits: [{ label: "النطاقات", value: "غير حسّاسة — لا تحقّق مطلوب" }],
  },
  {
    id: "godaddy",
    name: "GoDaddy",
    plan: "نطاق مدفوع — loopztv.com",
    planTone: "domain",
    what: "النطاقُ نفسه وسجلّاته (A على @ وCNAME على www).",
    risk: "انتهاءُ التجديد يُسقط الموقع كلَّه بلا إنذارٍ من Vercel. ⚠️ تاريخُ التجديد غيرُ مسجَّل في وثائق المشروع — سجّله.",
    dashboard: "https://dcc.godaddy.com/control/portfolio",
    limits: [{ label: "التجديد", value: "غير موثّق — راجعه" }],
  },
  {
    id: "gsc",
    name: "Google Search Console",
    plan: "مجاني",
    planTone: "free",
    what: "الفهرسة والظهور في البحث.",
    risk: "ملفُّ التحقّق public/google3d0e328e26c2ca31.html — حذفُه يُلغي الملكية. ولا يهدّد الاستقرار، يهدّد النموّ.",
    dashboard: "https://search.google.com/search-console",
    limits: [{ label: "خريطة الموقع", value: "مُقدَّمة ومقبولة" }],
  },
];

export const REPO = { owner: "mccicc2-art", name: "meshahed", branch: "main" };
export const SITE = "https://loopztv.com";
