export type Answer = { text: string; points: number };
export type Question = { question: string; answers: Answer[] };
export type Catalog = { title: string; questions: Question[] };

const pad = (answers: Answer[]): Answer[] => {
  const a = [...answers];
  while (a.length < 8) a.push({ text: "", points: 0 });
  return a.slice(0, 8);
};

const mk = (title: string, qs: Question[]): Catalog => ({
  title,
  questions: qs.map((q) => ({ ...q, answers: pad(q.answers) })),
});

export const premadeCatalogs: Catalog[] = [
  mk("🏠 الحياة العائلية واليومية", [
    { question: "شيء تفعله بمجرد استيقاظك من النوم؟", answers: [{ text: "أغسل وجهي", points: 40 }, { text: "أتفقد هاتفي", points: 25 }, { text: "أشرب ماء", points: 15 }, { text: "أفرش أسناني", points: 10 }, { text: "أصلي", points: 5 }, { text: "أرتب السرير", points: 5 }] },
    { question: "شيء يضيع دائماً في المنزل؟", answers: [{ text: "الريموت كنترول", points: 35 }, { text: "المفاتيح", points: 25 }, { text: "الجوارب/الشرابات", points: 15 }, { text: "شاحن الجوال", points: 10 }, { text: "قلم", points: 8 }, { text: "نظارات", points: 4 }, { text: "ربطة شعر", points: 3 }] },
    { question: "شيء تجده في ثلاجة كل بيت عربي؟", answers: [{ text: "ماء بارد", points: 30 }, { text: "حليب/لبن", points: 20 }, { text: "بيض", points: 15 }, { text: "جبن", points: 12 }, { text: "طماطم/خيار", points: 10 }, { text: "بقايا أكل", points: 8 }, { text: "ليمون", points: 5 }] },
    { question: "أول شيء تفعله عند العودة للمنزل من الخارج؟", answers: [{ text: "أخلع حذائي", points: 40 }, { text: "أغسل يدي", points: 20 }, { text: "أغير ملابسي", points: 15 }, { text: "أشغل المكيف", points: 10 }, { text: "أشرب ماء", points: 8 }, { text: "أستلقي/أرتاح", points: 7 }] },
    { question: "عذر شائع للتأخر عن العمل أو المدرسة؟", answers: [{ text: "زحمة الطريق", points: 45 }, { text: "نمت متأخراً", points: 25 }, { text: "سيارتي تعطلت", points: 12 }, { text: "مرض مفاجئ", points: 8 }, { text: "المنبه لم يرن", points: 6 }, { text: "توصيل الأطفال", points: 4 }] },
    { question: "شيء تفعله قبل النوم مباشرة؟", answers: [{ text: "أتصفح الجوال", points: 40 }, { text: "أفرش أسناني", points: 20 }, { text: "أضبط المنبه", points: 15 }, { text: "أطفئ النور", points: 10 }, { text: "أشرب ماء", points: 8 }, { text: "أقرأ/أدعو", points: 7 }] },
    { question: "شيء لا تحب القيام به من أعمال المنزل؟", answers: [{ text: "غسيل المواعين", points: 35 }, { text: "الكوي", points: 25 }, { text: "الكنس/التنظيف", points: 15 }, { text: "الطبخ", points: 10 }, { text: "ترتيب الغرفة", points: 8 }, { text: "رمي القمامة", points: 7 }] },
    { question: "شيء تشتريه دائماً من السوبر ماركت؟", answers: [{ text: "خبز", points: 35 }, { text: "حليب/لبن", points: 20 }, { text: "بيض", points: 15 }, { text: "ماء", points: 10 }, { text: "شيبس/حلويات", points: 10 }, { text: "جبن", points: 5 }, { text: "مناديل", points: 5 }] },
    { question: "شيء تفعله عندما تشعر بالملل؟", answers: [{ text: "أتصفح الجوال", points: 35 }, { text: "أنام", points: 20 }, { text: "آكل", points: 15 }, { text: "أتابع مسلسل", points: 15 }, { text: "أخرج من البيت", points: 10 }, { text: "أكلم صديق", points: 5 }] },
    { question: "هدية شائعة للنجاح أو التخرج؟", answers: [{ text: "مبلغ مالي/فلوس", points: 40 }, { text: "جوال ذكي", points: 25 }, { text: "ساعة", points: 15 }, { text: "سيارة", points: 10 }, { text: "باقة ورد", points: 5 }, { text: "لابتوب", points: 5 }] },
  ]),
  mk("🍔 أطعمة ومشروبات", [
    { question: "أكلة شعبية عربية مشهورة جداً؟", answers: [{ text: "كبسة", points: 30 }, { text: "شاورما", points: 25 }, { text: "فلافل", points: 15 }, { text: "كشري", points: 12 }, { text: "مندي", points: 8 }, { text: "منسف", points: 5 }, { text: "برياني", points: 5 }] },
    { question: "طعام يؤكل باليد (بدون ملعقة أو شوكة)؟", answers: [{ text: "برجر", points: 30 }, { text: "بيتزا", points: 25 }, { text: "شاورما", points: 20 }, { text: "بطاطس مقلية", points: 10 }, { text: "بروستد", points: 8 }, { text: "تمر", points: 7 }] },
    { question: "مشروب ساخن مشهور؟", answers: [{ text: "قهوة", points: 35 }, { text: "شاي", points: 30 }, { text: "كرك", points: 15 }, { text: "نسكافيه", points: 10 }, { text: "هوت شوكليت", points: 5 }, { text: "نعناع/بابونج", points: 5 }] },
    { question: "فاكهة صيفية منعشة؟", answers: [{ text: "بطيخ / حبحب", points: 45 }, { text: "مانجو", points: 25 }, { text: "عنب", points: 15 }, { text: "شمام", points: 5 }, { text: "خوخ", points: 5 }, { text: "كرز", points: 5 }] },
    { question: "شيء يوضع فوق البيتزا؟", answers: [{ text: "جبنة", points: 40 }, { text: "زيتون", points: 20 }, { text: "بيبروني/نقانق", points: 15 }, { text: "فطر/مشروم", points: 10 }, { text: "فلفل رومي", points: 8 }, { text: "بصل", points: 7 }] },
    { question: "طعام تفضله في الفطور الصباحي؟", answers: [{ text: "بيض", points: 35 }, { text: "فول", points: 20 }, { text: "جبن/لبنة", points: 15 }, { text: "خبز/تميس", points: 10 }, { text: "كورن فليكس", points: 10 }, { text: "بان كيك", points: 5 }, { text: "مربى", points: 5 }] },
    { question: "نوع من الحلويات المشهورة؟", answers: [{ text: "كنافة", points: 30 }, { text: "بقلاوة", points: 20 }, { text: "بسبوسة", points: 15 }, { text: "كيك / تشيزكيك", points: 15 }, { text: "آيس كريم", points: 10 }, { text: "شوكولاتة", points: 10 }] },
    { question: "خضار مفيد جداً؟", answers: [{ text: "سبانخ", points: 35 }, { text: "بروكلي", points: 25 }, { text: "جزر", points: 15 }, { text: "طماطم", points: 10 }, { text: "خيار", points: 8 }, { text: "خس", points: 7 }] },
    { question: "مشروب يقدم للضيوف دائماً؟", answers: [{ text: "قهوة عربية", points: 45 }, { text: "شاي", points: 25 }, { text: "عصير", points: 15 }, { text: "ماء", points: 10 }, { text: "مشروبات غازية", points: 5 }] },
    { question: "أكل أو تسالي تؤكل في السينما؟", answers: [{ text: "فشار/بوب كورن", points: 50 }, { text: "ناتشوز", points: 20 }, { text: "شوكولاتة", points: 15 }, { text: "مشروب غازي", points: 10 }, { text: "شيبس", points: 5 }] },
  ]),
  mk("🏃 شخصيات ومواقف", [
    { question: "صفة تبحث عنها في الصديق المفضل؟", answers: [{ text: "الصدق", points: 40 }, { text: "الوفاء", points: 25 }, { text: "خفة الدم", points: 15 }, { text: "الاحترام", points: 10 }, { text: "الكرم", points: 5 }, { text: "الوقوف وقت الشدة", points: 5 }] },
    { question: "مهنة يتمناها الأطفال عندما يكبرون؟", answers: [{ text: "طبيب", points: 35 }, { text: "طيار", points: 20 }, { text: "ضابط/شرطي", points: 15 }, { text: "مهندس", points: 10 }, { text: "لاعب كرة قدم", points: 10 }, { text: "معلم", points: 5 }, { text: "رائد فضاء", points: 5 }] },
    { question: "شيء يزعجك جداً في الأماكن العامة؟", answers: [{ text: "الإزعاج/الصوت العالي", points: 35 }, { text: "التدخين", points: 25 }, { text: "رمي القمامة", points: 15 }, { text: "الزحام الشديد", points: 10 }, { text: "تخطي الطابور", points: 10 }, { text: "التحديق/النظرات", points: 5 }] },
    { question: "كلمة نقولها عند الوداع؟", answers: [{ text: "مع السلامة", points: 40 }, { text: "باي", points: 25 }, { text: "إلى اللقاء", points: 15 }, { text: "أشوفك على خير", points: 10 }, { text: "في أمان الله", points: 5 }, { text: "فمان الله", points: 5 }] },
    { question: "مادة دراسية لا يحبها أغلب الطلاب؟", answers: [{ text: "الرياضيات", points: 45 }, { text: "الفيزياء", points: 20 }, { text: "الكيمياء", points: 15 }, { text: "التاريخ", points: 10 }, { text: "الإنجليزية", points: 5 }, { text: "القواعد/النحو", points: 5 }] },
    { question: "شيء يجعلك تبتسم فوراً؟", answers: [{ text: "نكتة/موقف مضحك", points: 30 }, { text: "طفل صغير/رضيع", points: 25 }, { text: "هدية", points: 20 }, { text: "خبر سعيد", points: 10 }, { text: "رسالة من شخص عزيز", points: 10 }, { text: "الراتب", points: 5 }] },
    { question: "حيوان أليف يحب الناس تربيته؟", answers: [{ text: "قطة", points: 45 }, { text: "كلب", points: 20 }, { text: "عصفور/طير", points: 15 }, { text: "سمك زينة", points: 10 }, { text: "أرنب", points: 5 }, { text: "سلحفاة", points: 5 }] },
    { question: "رياضة عالمية مشهورة؟", answers: [{ text: "كرة القدم", points: 50 }, { text: "كرة السلة", points: 15 }, { text: "التنس", points: 10 }, { text: "السباحة", points: 10 }, { text: "الجري/ألعاب القوى", points: 10 }, { text: "الملاكمة", points: 5 }] },
    { question: "شيء تخاف منه النساء أكثر من الرجال؟", answers: [{ text: "الحشرات/الصراصير", points: 45 }, { text: "الفئران", points: 25 }, { text: "الظلام", points: 15 }, { text: "التقدم في العمر", points: 10 }, { text: "زيادة الوزن", points: 5 }] },
    { question: "موقف يجعلك تتعرق من الإحراج؟", answers: [{ text: "السقوط أمام الناس", points: 35 }, { text: "نسيان اسم شخص", points: 25 }, { text: "تمزق الملابس", points: 20 }, { text: "الرد الخطأ", points: 10 }, { text: "خروج صوت غريب", points: 10 }] },
  ]),
  mk("🌍 أشياء وأماكن ومنوعات", [
    { question: "شيء تأخذه معك إلى البحر؟", answers: [{ text: "منشفة", points: 30 }, { text: "واقي شمس", points: 25 }, { text: "ملابس سباحة", points: 15 }, { text: "مظلة/كراسي", points: 15 }, { text: "نظارات شمسية", points: 10 }, { text: "ماء/أكل", points: 5 }] },
    { question: "شيء تجده في كل سيارة؟", answers: [{ text: "دركسون", points: 35 }, { text: "كفرات/إطارات", points: 20 }, { text: "مراتب", points: 15 }, { text: "مرايا", points: 10 }, { text: "مسجل/راديو", points: 10 }, { text: "بنزين", points: 5 }, { text: "مكيف", points: 5 }] },
    { question: "دولة تتمنى السفر إليها للسياحة؟", answers: [{ text: "المالديف", points: 25 }, { text: "اليابان", points: 20 }, { text: "سويسرا", points: 15 }, { text: "باريس/فرنسا", points: 15 }, { text: "تركيا", points: 10 }, { text: "لندن/بريطانيا", points: 10 }, { text: "إيطاليا", points: 5 }] },
    { question: "لون مفضل وشائع في السيارات؟", answers: [{ text: "أبيض", points: 40 }, { text: "أسود", points: 25 }, { text: "فضي/رصاصي", points: 15 }, { text: "أحمر", points: 10 }, { text: "أزرق", points: 5 }, { text: "كحلي", points: 5 }] },
    { question: "شيء موجود في السماء؟", answers: [{ text: "نجوم", points: 30 }, { text: "شمس", points: 25 }, { text: "غيوم/سحاب", points: 20 }, { text: "قمر", points: 15 }, { text: "طيور", points: 5 }, { text: "طائرة", points: 5 }] },
    { question: "جهاز إلكتروني لا يمكن الاستغناء عنه؟", answers: [{ text: "الجوال/الموبايل", points: 60 }, { text: "التلفزيون", points: 15 }, { text: "الكمبيوتر/اللابتوب", points: 10 }, { text: "الآيباد", points: 5 }, { text: "المكيف", points: 5 }, { text: "الثلاجة", points: 5 }] },
    { question: "مكان تذهب إليه في عطلة نهاية الأسبوع؟", answers: [{ text: "المول/السوق", points: 35 }, { text: "المطعم/المقهى", points: 25 }, { text: "المنتزه/الحديقة", points: 15 }, { text: "البحر/الشاليه", points: 10 }, { text: "بيت العائلة", points: 10 }, { text: "البر/المخيم", points: 5 }] },
    { question: "شيء نستخدمه لتنظيف المنزل؟", answers: [{ text: "مكنسة", points: 40 }, { text: "ممسحة", points: 20 }, { text: "صابون/منظفات", points: 15 }, { text: "كلوركس", points: 10 }, { text: "فوطة/خرقة", points: 10 }, { text: "ماء", points: 5 }] },
    { question: "وسيلة مواصلات؟", answers: [{ text: "سيارة", points: 40 }, { text: "طائرة", points: 25 }, { text: "قطار", points: 15 }, { text: "حافلة/باص", points: 10 }, { text: "سفينة/قارب", points: 5 }, { text: "دراجة", points: 5 }] },
    { question: "شيء يذوب بالحرارة؟", answers: [{ text: "الثلج", points: 45 }, { text: "الآيس كريم", points: 25 }, { text: "الشوكولاتة", points: 15 }, { text: "الزبدة", points: 10 }, { text: "الشمع", points: 5 }] },
  ]),
  mk("🎉 مناسبات وأعياد", [
    { question: "شيء نجهزه قبل العيد؟", answers: [{ text: "ملابس جديدة", points: 40 }, { text: "حلويات/معمول", points: 30 }, { text: "عيدية/نقود", points: 15 }, { text: "تنظيف المنزل", points: 10 }, { text: "صالون/حلاقة", points: 5 }] },
    { question: "أين يذهب الناس في أول أيام العيد؟", answers: [{ text: "صلاة العيد", points: 40 }, { text: "بيت العائلة/الجد", points: 30 }, { text: "زيارة الأقارب", points: 15 }, { text: "المطعم", points: 10 }, { text: "النوم/الراحة", points: 5 }] },
    { question: "هدية مناسبة للأم في يوم ميلادها؟", answers: [{ text: "مجوهرات/ذهب", points: 35 }, { text: "عطر", points: 25 }, { text: "ملابس/شنطة", points: 20 }, { text: "مبلغ مالي", points: 10 }, { text: "ورد", points: 10 }] },
    { question: "شيء تراه بكثرة في حفلات الزفاف؟", answers: [{ text: "كيكة الزفاف", points: 30 }, { text: "فستان أبيض", points: 25 }, { text: "ورود/زينة", points: 20 }, { text: "بوفيه طعام", points: 15 }, { text: "معازيم/ضيوف", points: 10 }] },
    { question: "شيء يفعله الناس في شهر رمضان؟", answers: [{ text: "صيام", points: 40 }, { text: "قراءة قرآن", points: 25 }, { text: "صلاة التراويح", points: 20 }, { text: "عزائم/فطور جماعي", points: 10 }, { text: "مشاهدة مسلسلات", points: 5 }] },
    { question: "كلمة تقال في المناسبات السعيدة؟", answers: [{ text: "مبروك/ألف مبروك", points: 45 }, { text: "كل عام وأنت بخير", points: 25 }, { text: "عقبالك", points: 15 }, { text: "بالتوفيق", points: 10 }, { text: "قرة عينك", points: 5 }] },
    { question: "شيء يحبه الأطفال في أعياد الميلاد؟", answers: [{ text: "الكيك", points: 40 }, { text: "الهدايا", points: 30 }, { text: "الألعاب/المهرج", points: 15 }, { text: "البالونات", points: 10 }, { text: "الأصدقاء", points: 5 }] },
    { question: "كيف تحتفل باليوم الوطني؟", answers: [{ text: "أعلام/زينة", points: 35 }, { text: "أغاني وطنية", points: 25 }, { text: "مشاهدة الألعاب النارية", points: 20 }, { text: "مسيرة بالسيارات", points: 15 }, { text: "لبس خاص", points: 5 }] },
    { question: "شيء ضروري في حقيبة السفر؟", answers: [{ text: "ملابس", points: 40 }, { text: "جواز سفر", points: 30 }, { text: "شاحن جوال", points: 15 }, { text: "فرشاة أسنان", points: 10 }, { text: "نقود/فيزا", points: 5 }] },
    { question: "تجهيزات العودة للمدارس؟", answers: [{ text: "حقيبة/شنطة", points: 35 }, { text: "دفاتر/أقلام", points: 30 }, { text: "ملابس/مريول", points: 20 }, { text: "حذاء جديد", points: 10 }, { text: "نوم مبكر", points: 5 }] },
  ]),
];

export const emptyQuestion = (): Question => ({
  question: "سؤال جديد",
  answers: Array.from({ length: 8 }, () => ({ text: "", points: 0 })),
});
