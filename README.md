# Family Feud Fun

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>لعبة صراع العائلات - التفاعلية</title>
    
    <!-- مكتبة Tailwind للتصميم -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- مكتبات React للتشغيل كملف واحد -->
    <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        
        .bg-dots-start {
            background-color: #0b1a47;
            background-image: radial-gradient(#2b4b96 15%, transparent 16%);
            background-size: 30px 30px;
        }
        .bg-dots-board {
            background-color: #0c1844;
            background-image: radial-gradient(#dca34b 18%, transparent 19%);
            background-size: 24px 24px;
            background-position: 0 0, 12px 12px;
        }
        .bg-host { background-color: #0d152a; }
        .host-card { background-color: #131d36; border: 1px solid #1f2d4f; }
        .host-input { background-color: #0a0f1d; border: 1px solid #3a6bdc; color: #ffffff !important; }
        
        .board-outer {
            border-radius: 90px; border: 6px solid #ff9900;
            box-shadow: 0 0 0 4px #000, inset 0 0 20px rgba(0,0,0,0.8); position: relative;
        }
        .board-inner {
            border: 4px solid #e09633; border-radius: 20px;
            background: linear-gradient(to bottom, #1b3f88, #0d2254);
            box-shadow: 0 0 15px rgba(0,0,0,0.9), inset 0 0 30px rgba(0,0,0,0.8);
        }
        .slot-bg {
            background: linear-gradient(to bottom, #2c60cc, #143685); border: 2px solid #000;
            box-shadow: inset 0 3px 6px rgba(255,255,255,0.2), inset 0 -3px 6px rgba(0,0,0,0.5);
        }
        .slot-revealed { background: linear-gradient(to bottom, #2652b3, #112c6e); border: 2px solid #000; }
        .score-box {
            background: linear-gradient(to bottom, #143a99, #081a4d); border-right: 2px solid #000;
            box-shadow: inset -5px 0 10px rgba(0,0,0,0.5);
        }
        .big-x-frame {
            background: linear-gradient(135deg, #b30000 0%, #4a0000 100%);
            border-radius: 10px; border: 8px solid #990000;
            box-shadow: 0 10px 20px rgba(0,0,0,0.8), inset 0 0 15px rgba(0,0,0,0.9);
            display: flex; justify-content: center; align-items: center; position: relative;
        }
        .big-x-frame::before {
            content: ''; position: absolute; inset: 8px; border: 6px solid #800000; border-radius: 5px;
            background: linear-gradient(to bottom, #660000, #330000); box-shadow: inset 0 0 10px rgba(0,0,0,0.9);
        }
        .big-x-text {
            position: relative; font-size: 140px; font-family: Arial, sans-serif; font-weight: 900;
            color: #ff3333; text-shadow: 0 5px 15px rgba(0,0,0,0.8); -webkit-text-stroke: 3px #4a0000; z-index: 10; line-height: 1;
        }
        .logo-text {
            font-family: 'Arial Black', Impact, sans-serif; text-transform: uppercase;
            background: linear-gradient(to bottom, #ffed99, #f2a611); -webkit-background-clip: text;
            -webkit-text-fill-color: transparent; filter: drop-shadow(0px 3px 2px rgba(0,0,0,0.8)); -webkit-text-stroke: 1px #592d00;
        }
        .side-score {
            background: linear-gradient(to bottom, #3967d6, #123080); border: 4px solid #000;
            border-bottom: none; border-radius: 12px 12px 0 0; box-shadow: 0 0 15px rgba(0,0,0,0.8), inset 0 0 15px rgba(255,255,255,0.3);
        }
        .team-badge {
            background: #000; border: 4px solid #e09633; border-top: none;
            border-radius: 0 0 12px 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.8);
        }
    </style>
</head>
<body>
    <div id="root"></div>

    <script type="text/babel">
        const { useState, useEffect } = React;

        // --- الأصوات ---
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        const playDing = () => {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.connect(gainNode); gainNode.connect(audioCtx.destination);
            osc.type = 'sine'; osc.frequency.setValueAtTime(900, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);
            osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 1.2);
        };

        const playBuzzer = () => {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const osc1 = audioCtx.createOscillator(); const osc2 = audioCtx.createOscillator(); const osc3 = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc1.connect(gainNode); osc2.connect(gainNode); osc3.connect(gainNode); gainNode.connect(audioCtx.destination);
            osc1.type = 'sawtooth'; osc2.type = 'square'; osc3.type = 'sawtooth';
            osc1.frequency.setValueAtTime(150, audioCtx.currentTime); osc2.frequency.setValueAtTime(155, audioCtx.currentTime); osc3.frequency.setValueAtTime(145, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime); gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.6); gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
            osc1.start(audioCtx.currentTime); osc2.start(audioCtx.currentTime); osc3.start(audioCtx.currentTime);
            osc1.stop(audioCtx.currentTime + 0.8); osc2.stop(audioCtx.currentTime + 0.8); osc3.stop(audioCtx.currentTime + 0.8);
        };

        // --- كتالوج الأسئلة الجاهزة (50 سؤال) ---
        const premadeCatalogs = [
            {
                title: "🏠 الحياة العائلية واليومية",
                questions: [
                    { question: "شيء تفعله بمجرد استيقاظك من النوم؟", answers: [ { text: "أغسل وجهي", points: 40 }, { text: "أتفقد هاتفي", points: 25 }, { text: "أشرب ماء", points: 15 }, { text: "أفرش أسناني", points: 10 }, { text: "أصلي", points: 5 }, { text: "أرتب السرير", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "شيء يضيع دائماً في المنزل؟", answers: [ { text: "الريموت كنترول", points: 35 }, { text: "المفاتيح", points: 25 }, { text: "الجوارب/الشرابات", points: 15 }, { text: "شاحن الجوال", points: 10 }, { text: "قلم", points: 8 }, { text: "نظارات", points: 4 }, { text: "ربطة شعر", points: 3 }, { text: "", points: 0 } ] },
                    { question: "شيء تجده في ثلاجة كل بيت عربي؟", answers: [ { text: "ماء بارد", points: 30 }, { text: "حليب/لبن", points: 20 }, { text: "بيض", points: 15 }, { text: "جبن", points: 12 }, { text: "طماطم/خيار", points: 10 }, { text: "بقايا أكل", points: 8 }, { text: "ليمون", points: 5 }, { text: "", points: 0 } ] },
                    { question: "أول شيء تفعله عند العودة للمنزل من الخارج؟", answers: [ { text: "أخلع حذائي", points: 40 }, { text: "أغسل يدي", points: 20 }, { text: "أغير ملابسي", points: 15 }, { text: "أشغل المكيف", points: 10 }, { text: "أشرب ماء", points: 8 }, { text: "أستلقي/أرتاح", points: 7 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "عذر شائع للتأخر عن العمل أو المدرسة؟", answers: [ { text: "زحمة الطريق", points: 45 }, { text: "نمت متأخراً", points: 25 }, { text: "سيارتي تعطلت", points: 12 }, { text: "مرض مفاجئ", points: 8 }, { text: "المنبه لم يرن", points: 6 }, { text: "توصيل الأطفال", points: 4 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "شيء تفعله قبل النوم مباشرة؟", answers: [ { text: "أتصفح الجوال", points: 40 }, { text: "أفرش أسناني", points: 20 }, { text: "أضبط المنبه", points: 15 }, { text: "أطفئ النور", points: 10 }, { text: "أشرب ماء", points: 8 }, { text: "أقرأ/أدعو", points: 7 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "شيء لا تحب القيام به من أعمال المنزل؟", answers: [ { text: "غسيل المواعين", points: 35 }, { text: "الكوي", points: 25 }, { text: "الكنس/التنظيف", points: 15 }, { text: "الطبخ", points: 10 }, { text: "ترتيب الغرفة", points: 8 }, { text: "رمي القمامة", points: 7 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "شيء تشتريه دائماً من السوبر ماركت؟", answers: [ { text: "خبز", points: 35 }, { text: "حليب/لبن", points: 20 }, { text: "بيض", points: 15 }, { text: "ماء", points: 10 }, { text: "شيبس/حلويات", points: 10 }, { text: "جبن", points: 5 }, { text: "مناديل", points: 5 }, { text: "", points: 0 } ] },
                    { question: "شيء تفعله عندما تشعر بالملل؟", answers: [ { text: "أتصفح الجوال", points: 35 }, { text: "أنام", points: 20 }, { text: "آكل", points: 15 }, { text: "أتابع مسلسل", points: 15 }, { text: "أخرج من البيت", points: 10 }, { text: "أكلم صديق", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "هدية شائعة للنجاح أو التخرج؟", answers: [ { text: "مبلغ مالي/فلوس", points: 40 }, { text: "جوال ذكي", points: 25 }, { text: "ساعة", points: 15 }, { text: "سيارة", points: 10 }, { text: "باقة ورد", points: 5 }, { text: "لابتوب", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 } ] }
                ]
            },
            {
                title: "🍔 أطعمة ومشروبات",
                questions: [
                    { question: "أكلة شعبية عربية مشهورة جداً؟", answers: [ { text: "كبسة", points: 30 }, { text: "شاورما", points: 25 }, { text: "فلافل", points: 15 }, { text: "كشري", points: 12 }, { text: "مندي", points: 8 }, { text: "منسف", points: 5 }, { text: "برياني", points: 5 }, { text: "", points: 0 } ] },
                    { question: "طعام يؤكل باليد (بدون ملعقة أو شوكة)؟", answers: [ { text: "برجر", points: 30 }, { text: "بيتزا", points: 25 }, { text: "شاورما", points: 20 }, { text: "بطاطس مقلية", points: 10 }, { text: "بروستد", points: 8 }, { text: "تمر", points: 7 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "مشروب ساخن مشهور؟", answers: [ { text: "قهوة", points: 35 }, { text: "شاي", points: 30 }, { text: "كرك", points: 15 }, { text: "نسكافيه", points: 10 }, { text: "هوت شوكليت", points: 5 }, { text: "نعناع/بابونج", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "فاكهة صيفية منعشة؟", answers: [ { text: "بطيخ / حبحب", points: 45 }, { text: "مانجو", points: 25 }, { text: "عنب", points: 15 }, { text: "شمام", points: 5 }, { text: "خوخ", points: 5 }, { text: "كرز", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "شيء يوضع فوق البيتزا؟", answers: [ { text: "جبنة", points: 40 }, { text: "زيتون", points: 20 }, { text: "بيبروني/نقانق", points: 15 }, { text: "فطر/مشروم", points: 10 }, { text: "فلفل رومي", points: 8 }, { text: "بصل", points: 7 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "طعام تفضله في الفطور الصباحي؟", answers: [ { text: "بيض", points: 35 }, { text: "فول", points: 20 }, { text: "جبن/لبنة", points: 15 }, { text: "خبز/تميس", points: 10 }, { text: "كورن فليكس", points: 10 }, { text: "بان كيك", points: 5 }, { text: "مربى", points: 5 }, { text: "", points: 0 } ] },
                    { question: "نوع من الحلويات المشهورة؟", answers: [ { text: "كنافة", points: 30 }, { text: "بقلاوة", points: 20 }, { text: "بسبوسة", points: 15 }, { text: "كيك / تشيزكيك", points: 15 }, { text: "آيس كريم", points: 10 }, { text: "شوكولاتة", points: 10 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "خضار مفيد جداً؟", answers: [ { text: "سبانخ", points: 35 }, { text: "بروكلي", points: 25 }, { text: "جزر", points: 15 }, { text: "طماطم", points: 10 }, { text: "خيار", points: 8 }, { text: "خس", points: 7 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "مشروب يقدم للضيوف دائماً؟", answers: [ { text: "قهوة عربية", points: 45 }, { text: "شاي", points: 25 }, { text: "عصير", points: 15 }, { text: "ماء", points: 10 }, { text: "مشروبات غازية", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "أكل أو تسالي تؤكل في السينما؟", answers: [ { text: "فشار/بوب كورن", points: 50 }, { text: "ناتشوز", points: 20 }, { text: "شوكولاتة", points: 15 }, { text: "مشروب غازي", points: 10 }, { text: "شيبس", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 }, { text: "", points: 0 } ] }
                ]
            },
            {
                title: "🏃‍♂️ شخصيات ومواقف",
                questions: [
                    { question: "صفة تبحث عنها في الصديق المفضل؟", answers: [ { text: "الصدق", points: 40 }, { text: "الوفاء", points: 25 }, { text: "خفة الدم", points: 15 }, { text: "الاحترام", points: 10 }, { text: "الكرم", points: 5 }, { text: "الوقوف وقت الشدة", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "مهنة يتمناها الأطفال عندما يكبرون؟", answers: [ { text: "طبيب", points: 35 }, { text: "طيار", points: 20 }, { text: "ضابط/شرطي", points: 15 }, { text: "مهندس", points: 10 }, { text: "لاعب كرة قدم", points: 10 }, { text: "معلم", points: 5 }, { text: "رائد فضاء", points: 5 }, { text: "", points: 0 } ] },
                    { question: "شيء يزعجك جداً في الأماكن العامة؟", answers: [ { text: "الإزعاج/الصوت العالي", points: 35 }, { text: "التدخين", points: 25 }, { text: "رمي القمامة", points: 15 }, { text: "الزحام الشديد", points: 10 }, { text: "تخطي الطابور", points: 10 }, { text: "التحديق/النظرات", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "كلمة نقولها عند الوداع؟", answers: [ { text: "مع السلامة", points: 40 }, { text: "باي", points: 25 }, { text: "إلى اللقاء", points: 15 }, { text: "أشوفك على خير", points: 10 }, { text: "في أمان الله", points: 5 }, { text: "فمان الله", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "مادة دراسية لا يحبها أغلب الطلاب؟", answers: [ { text: "الرياضيات", points: 45 }, { text: "الفيزياء", points: 20 }, { text: "الكيمياء", points: 15 }, { text: "التاريخ", points: 10 }, { text: "الإنجليزية", points: 5 }, { text: "القواعد/النحو", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "شيء يجعلك تبتسم فوراً؟", answers: [ { text: "نكتة/موقف مضحك", points: 30 }, { text: "طفل صغير/رضيع", points: 25 }, { text: "هدية", points: 20 }, { text: "خبر سعيد", points: 10 }, { text: "رسالة من شخص عزيز", points: 10 }, { text: "الراتب", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "حيوان أليف يحب الناس تربيته؟", answers: [ { text: "قطة", points: 45 }, { text: "كلب", points: 20 }, { text: "عصفور/طير", points: 15 }, { text: "سمك زينة", points: 10 }, { text: "أرنب", points: 5 }, { text: "سلحفاة", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "رياضة عالمية مشهورة؟", answers: [ { text: "كرة القدم", points: 50 }, { text: "كرة السلة", points: 15 }, { text: "التنس", points: 10 }, { text: "السباحة", points: 10 }, { text: "الجري/ألعاب القوى", points: 10 }, { text: "الملاكمة", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "شيء تخاف منه النساء أكثر من الرجال؟", answers: [ { text: "الحشرات/الصراصير", points: 45 }, { text: "الفئران", points: 25 }, { text: "الظلام", points: 15 }, { text: "التقدم في العمر", points: 10 }, { text: "زيادة الوزن", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "موقف يجعلك تتعرق من الإحراج؟", answers: [ { text: "السقوط أمام الناس", points: 35 }, { text: "نسيان اسم شخص", points: 25 }, { text: "تمزق الملابس", points: 20 }, { text: "الرد الخطأ", points: 10 }, { text: "خروج صوت غريب", points: 10 }, { text: "", points: 0 }, { text: "", points: 0 }, { text: "", points: 0 } ] }
                ]
            },
            {
                title: "🌍 أشياء وأماكن ومنوعات",
                questions: [
                    { question: "شيء تأخذه معك إلى البحر؟", answers: [ { text: "منشفة", points: 30 }, { text: "واقي شمس", points: 25 }, { text: "ملابس سباحة", points: 15 }, { text: "مظلة/كراسي", points: 15 }, { text: "نظارات شمسية", points: 10 }, { text: "ماء/أكل", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "شيء تجده في كل سيارة؟", answers: [ { text: "دركسون", points: 35 }, { text: "كفرات/إطارات", points: 20 }, { text: "مراتب", points: 15 }, { text: "مرايا", points: 10 }, { text: "مسجل/راديو", points: 10 }, { text: "بنزين", points: 5 }, { text: "مكيف", points: 5 }, { text: "", points: 0 } ] },
                    { question: "دولة تتمنى السفر إليها للسياحة؟", answers: [ { text: "المالديف", points: 25 }, { text: "اليابان", points: 20 }, { text: "سويسرا", points: 15 }, { text: "باريس/فرنسا", points: 15 }, { text: "تركيا", points: 10 }, { text: "لندن/بريطانيا", points: 10 }, { text: "إيطاليا", points: 5 }, { text: "", points: 0 } ] },
                    { question: "لون مفضل وشائع في السيارات؟", answers: [ { text: "أبيض", points: 40 }, { text: "أسود", points: 25 }, { text: "فضي/رصاصي", points: 15 }, { text: "أحمر", points: 10 }, { text: "أزرق", points: 5 }, { text: "كحلي", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "شيء موجود في السماء؟", answers: [ { text: "نجوم", points: 30 }, { text: "شمس", points: 25 }, { text: "غيوم/سحاب", points: 20 }, { text: "قمر", points: 15 }, { text: "طيور", points: 5 }, { text: "طائرة", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "جهاز إلكتروني لا يمكن الاستغناء عنه؟", answers: [ { text: "الجوال/الموبايل", points: 60 }, { text: "التلفزيون", points: 15 }, { text: "الكمبيوتر/اللابتوب", points: 10 }, { text: "الآيباد", points: 5 }, { text: "المكيف", points: 5 }, { text: "الثلاجة", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "مكان تذهب إليه في عطلة نهاية الأسبوع؟", answers: [ { text: "المول/السوق", points: 35 }, { text: "المطعم/المقهى", points: 25 }, { text: "المنتزه/الحديقة", points: 15 }, { text: "البحر/الشاليه", points: 10 }, { text: "بيت العائلة", points: 10 }, { text: "البر/المخيم", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "شيء نستخدمه لتنظيف المنزل؟", answers: [ { text: "مكنسة", points: 40 }, { text: "ممسحة", points: 20 }, { text: "صابون/منظفات", points: 15 }, { text: "كلوركس", points: 10 }, { text: "فوطة/خرقة", points: 10 }, { text: "ماء", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "وسيلة مواصلات؟", answers: [ { text: "سيارة", points: 40 }, { text: "طائرة", points: 25 }, { text: "قطار", points: 15 }, { text: "حافلة/باص", points: 10 }, { text: "سفينة/قارب", points: 5 }, { text: "دراجة", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "شيء يذوب بالحرارة؟", answers: [ { text: "الثلج", points: 45 }, { text: "الآيس كريم", points: 25 }, { text: "الشوكولاتة", points: 15 }, { text: "الزبدة", points: 10 }, { text: "الشمع", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 }, { text: "", points: 0 } ] }
                ]
            },
            {
                title: "🎉 مناسبات وأعياد",
                questions: [
                    { question: "شيء نجهزه قبل العيد؟", answers: [ { text: "ملابس جديدة", points: 40 }, { text: "حلويات/معمول", points: 30 }, { text: "عيدية/نقود", points: 15 }, { text: "تنظيف المنزل", points: 10 }, { text: "صالون/حلاقة", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "أين يذهب الناس في أول أيام العيد؟", answers: [ { text: "صلاة العيد", points: 40 }, { text: "بيت العائلة/الجد", points: 30 }, { text: "زيارة الأقارب", points: 15 }, { text: "المطعم", points: 10 }, { text: "النوم/الراحة", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "هدية مناسبة للأم في يوم ميلادها؟", answers: [ { text: "مجوهرات/ذهب", points: 35 }, { text: "عطر", points: 25 }, { text: "ملابس/شنطة", points: 20 }, { text: "مبلغ مالي", points: 10 }, { text: "ورد", points: 10 }, { text: "", points: 0 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "شيء تراه بكثرة في حفلات الزفاف؟", answers: [ { text: "كيكة/كعكة الزفاف", points: 30 }, { text: "فستان أبيض", points: 25 }, { text: "ورود/زينة", points: 20 }, { text: "بوفيه طعام", points: 15 }, { text: "معازيم/ضيوف", points: 10 }, { text: "", points: 0 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "شيء يفعله الناس في شهر رمضان؟", answers: [ { text: "صيام", points: 40 }, { text: "قراءة قرآن", points: 25 }, { text: "صلاة التراويح", points: 20 }, { text: "عزائم/فطور جماعي", points: 10 }, { text: "مشاهدة مسلسلات", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "كلمة تقال في المناسبات السعيدة؟", answers: [ { text: "مبروك/ألف مبروك", points: 45 }, { text: "كل عام وأنت بخير", points: 25 }, { text: "عقبالك", points: 15 }, { text: "بالتوفيق", points: 10 }, { text: "قرة عينك", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "شيء يحبه الأطفال في أعياد الميلاد؟", answers: [ { text: "الكيك", points: 40 }, { text: "الهدايا", points: 30 }, { text: "الألعاب/المهرج", points: 15 }, { text: "البالونات", points: 10 }, { text: "الأصدقاء", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "كيف تحتفل باليوم الوطني؟", answers: [ { text: "أعلام/زينة", points: 35 }, { text: "أغاني وطنية", points: 25 }, { text: "مشاهدة الألعاب النارية", points: 20 }, { text: "مسيرة بالسيارات", points: 15 }, { text: "لبس خاص", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "شيء ضروري في حقيبة السفر؟", answers: [ { text: "ملابس", points: 40 }, { text: "جواز سفر", points: 30 }, { text: "شاحن جوال", points: 15 }, { text: "فرشاة أسنان", points: 10 }, { text: "نقود/فيزا", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 }, { text: "", points: 0 } ] },
                    { question: "تجهيزات العودة للمدارس؟", answers: [ { text: "حقيبة/شنطة", points: 35 }, { text: "دفاتر/أقلام", points: 30 }, { text: "ملابس/مريول", points: 20 }, { text: "حذاء جديد", points: 10 }, { text: "نوم مبكر", points: 5 }, { text: "", points: 0 }, { text: "", points: 0 }, { text: "", points: 0 } ] }
                ]
            }
        ];

        function App() {
            const [screen, setScreen] = useState('start'); 
            const [hostTab, setHostTab] = useState('catalog'); 
            const [confirmModal, setConfirmModal] = useState(null); 
            
            const [questions, setQuestions] = useState(() => {
                const saved = localStorage.getItem('familyFeudQuestions');
                return saved ? JSON.parse(saved) : premadeCatalogs[0].questions;
            });
            const [team1Name, setTeam1Name] = useState(() => localStorage.getItem('familyFeudTeam1') || 'فريق 1');
            const [team2Name, setTeam2Name] = useState(() => localStorage.getItem('familyFeudTeam2') || 'فريق 2');

            useEffect(() => { localStorage.setItem('familyFeudQuestions', JSON.stringify(questions)); }, [questions]);
            useEffect(() => { localStorage.setItem('familyFeudTeam1', team1Name); }, [team1Name]);
            useEffect(() => { localStorage.setItem('familyFeudTeam2', team2Name); }, [team2Name]);

            const [currentQIndex, setCurrentQIndex] = useState(0);
            const [revealedAnswers, setRevealedAnswers] = useState(Array(8).fill(false));
            const [team1Score, setTeam1Score] = useState(0);
            const [team2Score, setTeam2Score] = useState(0);
            const [roundPoints, setRoundPoints] = useState(0);
            const [strikes, setStrikes] = useState(0);
            const [showBigX, setShowBigX] = useState(0); 
            const [showQuestion, setShowQuestion] = useState(true);

            // دوال تعديل الأسئلة
            const handleQuestionChange = (qIndex, value) => {
                const newQuestions = [...questions];
                newQuestions[qIndex] = { ...newQuestions[qIndex], question: value };
                setQuestions(newQuestions);
            };

            const handleAnswerChange = (qIndex, aIndex, field, value) => {
                const newQuestions = [...questions];
                newQuestions[qIndex].answers[aIndex][field] = value;
                setQuestions(newQuestions);
            };

            const addNewQuestion = () => {
                setQuestions([...questions, { question: "سؤال جديد", answers: Array.from({ length: 8 }, () => ({ text: "", points: 0 })) }]);
            };

            const loadCatalog = (catalog) => {
                const newQuestions = JSON.parse(JSON.stringify(catalog.questions));
                setQuestions(newQuestions);
                setConfirmModal(null);
                setHostTab('custom'); 
            };

            // دوال اللعب
            const handleReveal = (index) => {
                if (!revealedAnswers[index] && questions[currentQIndex]?.answers[index]?.text !== "") {
                    const newRevealed = [...revealedAnswers];
                    newRevealed[index] = true;
                    setRevealedAnswers(newRevealed);
                    setRoundPoints(prev => prev + Number(questions[currentQIndex].answers[index].points || 0));
                    playDing();
                }
            };

            const handleStrike = (count) => {
                playBuzzer(); setStrikes(count); setShowBigX(count);
                setTimeout(() => { setShowBigX(0); }, 1500);
            };

            const awardPoints = (team) => {
                if (team === 1) setTeam1Score(prev => prev + roundPoints);
                if (team === 2) setTeam2Score(prev => prev + roundPoints);
                setRoundPoints(0); setStrikes(0);
            };

            const nextQuestion = () => {
                if (currentQIndex < questions.length - 1) {
                    setCurrentQIndex(prev => prev + 1);
                    setRevealedAnswers(Array(8).fill(false));
                    setRoundPoints(0); setStrikes(0); setShowQuestion(true);
                }
            };

            const currentQ = questions[currentQIndex] || { question: "", answers: Array.from({ length: 8 }, () => ({ text: "", points: 0 })) };

            if (screen === 'host') {
                return (
                    <div className="min-h-screen bg-host text-white p-4 md:p-8 overflow-y-auto" dir="rtl">
                        <div className="max-w-4xl mx-auto flex justify-between items-center mb-6">
                            <button onClick={() => setScreen('start')} className="bg-[#1d3d8f] hover:bg-blue-600 text-white font-bold py-2 px-6 rounded shadow-lg">العودة للعبة</button>
                            <h2 className="text-2xl font-bold text-[#e09633]">الإعدادات والأسئلة</h2>
                        </div>

                        <div className="max-w-4xl mx-auto flex bg-gray-900 rounded-lg p-1 border border-gray-700 mb-6 shadow-lg">
                            <button 
                                onClick={() => setHostTab('catalog')} 
                                className={`flex-1 py-3 text-lg font-bold rounded-md transition-colors ${hostTab === 'catalog' ? 'bg-[#1d3d8f] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                الكتالوج (50 سؤال جاهز)
                            </button>
                            <button 
                                onClick={() => setHostTab('custom')} 
                                className={`flex-1 py-3 text-lg font-bold rounded-md transition-colors ${hostTab === 'custom' ? 'bg-[#1e8b3b] text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                أسئلتي الخاصة (تعديل)
                            </button>
                        </div>

                        {hostTab === 'catalog' && (
                            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                                {premadeCatalogs.map((cat, idx) => (
                                    <div key={idx} className="host-card p-6 rounded-xl shadow-xl border-t-4 border-[#4774d6] flex flex-col items-start">
                                        <h3 className="text-2xl font-bold text-white mb-2">{cat.title}</h3>
                                        <p className="text-gray-400 mb-6 text-sm">يحتوي على {cat.questions.length} أسئلة ممتعة وجاهزة للعب.</p>
                                        <button 
                                            onClick={() => setConfirmModal(cat)}
                                            className="mt-auto w-full py-3 bg-[#4774d6] hover:bg-blue-600 rounded-lg font-bold text-white shadow-md transition-transform active:scale-95"
                                        >
                                            استخدام هذه الأسئلة
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {hostTab === 'custom' && (
                            <div className="max-w-4xl mx-auto pb-20">
                                <div className="host-card p-4 md:p-6 rounded-xl mb-6 shadow-xl border-t-4 border-[#e09633]">
                                    <h3 className="text-xl font-bold text-white mb-4">أسماء الفرق</h3>
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="flex-1">
                                            <label className="block text-gray-400 mb-1 text-sm">الفريق الأول (يمين)</label>
                                            <input type="text" value={team1Name} onChange={e => setTeam1Name(e.target.value)} className="w-full host-input p-3 rounded font-bold" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-gray-400 mb-1 text-sm">الفريق الثاني (يسار)</label>
                                            <input type="text" value={team2Name} onChange={e => setTeam2Name(e.target.value)} className="w-full host-input p-3 rounded font-bold" />
                                        </div>
                                    </div>
                                </div>
                                
                                {questions.map((q, qIndex) => (
                                    <div key={qIndex} className="host-card p-4 md:p-6 rounded-xl mb-6 shadow-xl relative animate-[fadeIn_0.3s]">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-xl font-bold text-[#4774d6]">السؤال {qIndex + 1}</h3>
                                            <button onClick={() => { const newQ = [...questions]; newQ.splice(qIndex, 1); setQuestions(newQ); }} className="text-red-400 hover:text-white font-bold text-sm bg-red-900/40 hover:bg-red-700 px-3 py-1 rounded transition-colors">حذف السؤال</button>
                                        </div>
                                        <input type="text" value={q.question} onChange={(e) => handleQuestionChange(qIndex, e.target.value)} className="w-full host-input p-4 rounded mb-6 text-lg md:text-xl focus:outline-none focus:border-[#e09633] font-bold text-right text-white placeholder-gray-500" placeholder="اكتب السؤال هنا..." />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                                            {q.answers.map((ans, aIndex) => (
                                                <div key={aIndex} className="flex flex-row-reverse md:flex-row gap-3 items-center justify-between">
                                                    <input type="number" value={ans.points || ''} onChange={(e) => handleAnswerChange(qIndex, aIndex, 'points', e.target.value)} className="w-16 host-input p-2 text-center text-yellow-400 font-bold rounded outline-none focus:border-[#e09633]" placeholder="0" />
                                                    <div className="flex-1 flex items-center gap-2">
                                                        <input type="text" value={ans.text} onChange={(e) => handleAnswerChange(qIndex, aIndex, 'text', e.target.value)} className="w-full host-input p-2 text-white outline-none rounded focus:border-[#e09633] text-right font-bold" placeholder={`إجابة ${aIndex + 1}`} />
                                                    </div>
                                                    <span className="text-gray-400 w-6 text-center font-bold text-sm md:text-base">{aIndex + 1}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <button onClick={addNewQuestion} className="w-full py-4 bg-[#1e8b3b] rounded-lg font-bold hover:bg-[#166d2e] text-white text-xl shadow-lg transition-colors mt-2 border-2 border-green-400">+ إضافة سؤال جديد</button>
                            </div>
                        )}

                        {confirmModal && (
                            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                                <div className="bg-[#131d36] border-2 border-[#e09633] rounded-2xl p-6 max-w-md w-full text-center shadow-2xl transform scale-100 transition-transform">
                                    <h3 className="text-2xl font-bold text-white mb-3">تأكيد الاستبدال</h3>
                                    <p className="text-gray-300 mb-6 leading-relaxed">
                                        هل تريد تفعيل <b>"{confirmModal.title}"</b>؟<br/>
                                        <span className="text-red-400 font-bold text-sm">تنبيه: سيتم مسح أسئلتك الحالية واستبدالها بهذه المجموعة.</span>
                                    </p>
                                    <div className="flex gap-4">
                                        <button onClick={() => loadCatalog(confirmModal)} className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-lg font-bold text-white transition-colors">نعم، استخدمها</button>
                                        <button onClick={() => setConfirmModal(null)} className="flex-1 bg-gray-600 hover:bg-gray-500 py-3 rounded-lg font-bold text-white transition-colors">إلغاء</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            }

            if (screen === 'start') {
                return (
                    <div className="min-h-screen bg-dots-start flex flex-col items-center justify-center p-4 relative" dir="rtl">
                        <div className="relative flex flex-col items-center justify-center mb-16 md:scale-125 scale-100">
                            <div className="w-[320px] h-[160px] md:w-[500px] md:h-[250px] bg-gradient-to-b from-[#4774d6] to-[#1d4199] rounded-[100%] border-[4px] md:border-[6px] border-white shadow-[0_0_20px_rgba(0,0,0,0.8),inset_0_0_30px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center relative z-10 outline outline-4 outline-[#dca34b]">
                                <h1 className="logo-text text-[50px] md:text-[75px] leading-[0.9] text-center mt-2 md:mt-4">FAMILY<br/>FEUD</h1>
                                <p className="text-[#f2a611] font-black text-sm md:text-xl mt-1 drop-shadow-md" style={{ WebkitTextStroke: '1px #592d00' }}>Mefatihy.com</p>
                            </div>
                        </div>
                        <button onClick={() => { setCurrentQIndex(0); setRevealedAnswers(Array(8).fill(false)); setTeam1Score(0); setTeam2Score(0); setRoundPoints(0); setStrikes(0); setShowQuestion(true); setScreen('game'); }} className="w-full max-w-xs py-3 bg-black text-white rounded-full font-bold text-xl border-2 border-[#1f1f1f] hover:bg-gray-800 transition-colors shadow-2xl z-20 mb-6">ابدأ اللعبة</button>
                        <button onClick={() => setScreen('host')} className="w-full max-w-xs py-2 bg-transparent text-gray-400 rounded-full font-bold text-sm border border-gray-600 hover:text-white hover:border-white transition-colors shadow-xl z-20">لوحة التحكم والكتالوج</button>
                    </div>
                );
            }

            return (
                <div className="min-h-screen flex flex-col font-sans overflow-hidden bg-[#051024]" dir="rtl">
                    <div className="flex-1 relative flex items-center justify-center p-2 md:p-6 w-full mx-auto" style={{ background: 'linear-gradient(90deg, #943d00 0%, #943d00 15%, #051024 15%, #051024 85%, #943d00 85%, #943d00 100%)' }}>
                        <div className="board-outer bg-dots-board w-full max-w-[1200px] relative pt-16 pb-8 px-4 md:px-16 md:py-16 flex flex-col items-center justify-center z-10 mt-8 md:mt-0">
                            <div className="absolute -top-12 md:-top-16 flex flex-col items-center z-30">
                                <div className="w-40 h-20 md:w-56 md:h-24 bg-gradient-to-b from-[#4774d6] to-[#1d4199] rounded-[100%] border-[2px] md:border-[3px] border-[#dca34b] shadow-xl flex flex-col items-center justify-center">
                                    <span className="logo-text text-base md:text-2xl leading-tight text-center">FAMILY<br/>FEUD</span>
                                </div>
                                <div className="mt-1 bg-gradient-to-b from-[#3a6bdc] to-[#15347a] border-2 border-white rounded-full px-8 md:px-12 py-1 md:py-2 shadow-lg z-40">
                                    <span className="text-white text-xl md:text-3xl font-bold">{roundPoints}</span>
                                </div>
                            </div>
                            <div className="absolute -right-6 md:-right-12 top-1/2 transform -translate-y-1/2 z-30 flex flex-col">
                                <div className="side-score w-16 h-20 md:w-28 md:h-32 flex items-center justify-center relative">
                                    <span className="text-white text-3xl md:text-5xl font-bold drop-shadow-md">{team1Score}</span>
                                    <div className="absolute -left-5 md:-left-8 top-1/2 -translate-y-1/2 text-white font-black text-xl md:text-3xl drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">«</div>
                                </div>
                                <div className="team-badge w-16 md:w-28 py-1 flex items-center justify-center">
                                    <span className="text-yellow-400 font-bold text-[10px] md:text-sm truncate px-1 text-center w-full">{team1Name}</span>
                                </div>
                            </div>
                            <div className="absolute -left-6 md:-left-12 top-1/2 transform -translate-y-1/2 z-30 flex flex-col">
                                <div className="side-score w-16 h-20 md:w-28 md:h-32 flex items-center justify-center relative">
                                    <span className="text-white text-3xl md:text-5xl font-bold drop-shadow-md">{team2Score}</span>
                                    <div className="absolute -right-5 md:-right-8 top-1/2 -translate-y-1/2 text-white font-black text-xl md:text-3xl drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">»</div>
                                </div>
                                <div className="team-badge w-16 md:w-28 py-1 flex items-center justify-center">
                                    <span className="text-yellow-400 font-bold text-[10px] md:text-sm truncate px-1 text-center w-full">{team2Name}</span>
                                </div>
                            </div>

                            <div className="board-inner w-full flex flex-col relative z-20 mt-6 md:mt-4 px-2 py-4 md:p-6 bg-[#0a1f52]">
                                {showQuestion && (
                                    <div className="w-full mb-4 z-30 relative">
                                        <div className="bg-gradient-to-r from-[#000000] via-[#1a1a1a] to-[#000000] border-2 border-[#e09633] text-white text-center p-3 md:p-5 rounded-lg shadow-[0_5px_15px_rgba(0,0,0,0.8)] mx-auto w-[98%]">
                                            <h2 className="text-lg md:text-3xl font-black leading-relaxed drop-shadow-lg text-white" style={{ textShadow: '2px 2px 4px #000' }}>
                                                {currentQ.question || "انتهت الأسئلة في هذا القسم!"}
                                            </h2>
                                        </div>
                                    </div>
                                )}
                                <div className="w-full flex flex-col md:flex-row gap-2 md:gap-4 relative z-20">
                                    <div className="flex-1 flex flex-col gap-2 md:gap-3">
                                        {[0, 1, 2, 3].map(i => <AnswerRow key={i} index={i} answer={currentQ.answers ? currentQ.answers[i] : null} isRevealed={revealedAnswers[i]} onClick={() => handleReveal(i)} />)}
                                    </div>
                                    <div className="flex-1 flex flex-col gap-2 md:gap-3">
                                        {[4, 5, 6, 7].map(i => <AnswerRow key={i} index={i} answer={currentQ.answers ? currentQ.answers[i] : null} isRevealed={revealedAnswers[i]} onClick={() => handleReveal(i)} />)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-black border-t-2 border-gray-800 flex justify-between items-center px-2 py-2 md:px-6 md:py-3 text-gray-300 text-xs md:text-sm z-40 overflow-x-auto gap-2">
                        <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => setShowQuestion(!showQuestion)} className={`px-3 py-2 rounded border font-bold ${showQuestion ? 'bg-green-900 border-green-600 text-white' : 'bg-gray-900 border-gray-700 hover:text-white'}`}>
                                {showQuestion ? 'إخفاء السؤال' : 'عرض السؤال'}
                            </button>
                            <button onClick={() => setScreen('host')} className="hover:text-white px-3 py-2 bg-gray-900 rounded border border-gray-700 font-bold">الإعدادات</button>
                            <button onClick={nextQuestion} className="hover:text-white px-3 py-2 bg-[#1d3d8f] text-white rounded border border-blue-600 shadow-md font-bold">السؤال التالي »</button>
                        </div>
                        <div className="hidden lg:flex px-6 py-1 bg-[#1a1a1a] rounded-full border border-[#333] text-gray-400 flex-shrink-0">3 :مؤقت</div>
                        <div className="flex gap-4 items-center flex-shrink-0">
                            <div className="flex bg-gray-900 rounded border border-gray-700 overflow-hidden">
                                <button onClick={() => awardPoints(1)} className="px-3 py-2 hover:bg-gray-800 border-l border-gray-700 text-yellow-500 font-bold whitespace-nowrap truncate max-w-[100px]">فوز {team1Name}</button>
                                <button onClick={() => awardPoints(2)} className="px-3 py-2 hover:bg-gray-800 text-yellow-500 font-bold whitespace-nowrap truncate max-w-[100px]">فوز {team2Name}</button>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => handleStrike(1)} className="text-red-500 hover:text-red-300 font-black px-3 py-2 bg-[#1a0000] rounded border border-red-900 text-sm md:text-base">X</button>
                                <button onClick={() => handleStrike(2)} className="text-red-500 hover:text-red-300 font-black px-3 py-2 bg-[#1a0000] rounded border border-red-900 text-sm md:text-base">XX</button>
                                <button onClick={() => handleStrike(3)} className="text-red-500 hover:text-red-300 font-black px-3 py-2 bg-[#1a0000] rounded border border-red-900 text-sm md:text-base">XXX</button>
                            </div>
                        </div>
                    </div>

                    {showBigX > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/60 pointer-events-none">
                            <div className="flex gap-4 md:gap-8 animate-[bounce_0.2s_ease-out]">
                                {[...Array(showBigX)].map((_, i) => (
                                    <div key={i} className="big-x-frame w-40 h-40 md:w-64 md:h-64"><span className="big-x-text">X</span></div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        function AnswerRow({ index, answer, isRevealed, onClick }) {
            const hasText = answer && answer.text && answer.text.trim() !== "";
            if (!hasText) return <div className="flex-1 slot-bg rounded flex items-center justify-center w-full min-h-[50px] md:min-h-[65px] opacity-70 cursor-default"></div>;

            return (
                <div onClick={onClick} className={`flex-1 rounded flex overflow-hidden w-full min-h-[50px] md:min-h-[65px] cursor-pointer transition-transform hover:scale-[1.01] ${isRevealed ? 'slot-revealed' : 'slot-bg'}`}>
                    {isRevealed ? (
                        <React.Fragment>
                            <div className="flex-1 flex items-center justify-start px-3 md:px-5 text-white font-black text-lg md:text-3xl leading-tight text-right w-full truncate" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}>{answer.text}</div>
                            <div className="score-box w-16 md:w-20 flex items-center justify-center text-white font-black text-xl md:text-3xl border-r-2 border-black" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}>{answer.points || 0}</div>
                        </React.Fragment>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="w-12 h-10 md:w-20 md:h-14 bg-gradient-to-b from-[#113280] to-[#0a1f52] border border-[#3a6bdc] rounded-[50%] flex items-center justify-center text-white text-xl md:text-3xl font-bold shadow-[inset_0_0_15px_rgba(0,0,0,0.9)]">{index + 1}</div>
                        </div>
                    )}
                </div>
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
    </script>
</body>
</html>


```

	•	➕ إضافة أسئلة من عندك

	•	تطوير التصميم والكود بشكل كامل

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://family-feud-plus.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/49be904d-f545-451a-bacf-08f3fc485fa0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
