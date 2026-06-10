## الخطة: سحب وإفلات صور الفرق (Drag & Drop) على الشاشتين

نظام رفع الصور موجود حالياً في `/controller`. سأضيف دعم السحب والإفلات في المكانين المطلوبين، مع إعادة استخدام نفس منطق الرفع (Supabase Storage + بث Realtime عبر `SET_TEAM_PHOTO`).

---

### 1) على وحدة التحكم `/controller` — `src/components/FeudController.tsx`

- إضافة منطقة إفلات حول دائرة كل فريق في قسم «إعدادات الفرق».
- إضافة حالة `dragOverTeam: 0 | 1 | 2` لإظهار حلقة زرقاء متقطعة (`ring-4 ring-blue-500 ring-dashed`) عند السحب فوق الفريق.
- معالجات:
  - `onDragEnter` / `onDragOver` → `preventDefault()` + تحديث `dragOverTeam`.
  - `onDragLeave` → مسح الحالة.
  - `onDrop` → استخراج أول ملف من `e.dataTransfer.files` وتمريره إلى نفس دالة `uploadTeamPhoto` الحالية (نفس التحقق من النوع/الحجم).
- زر «📷 رفع صورة» يبقى كما هو للهواتف (لا تدعم السحب).

### 2) على الشاشة الرئيسية `/` — `src/components/FamilyFeud.tsx`

- إضافة سحب وإفلات على مستوى صفحة العرض كاملة (للسماح للمضيف بسحب صورة من سطح المكتب على iPad/جهاز عرض).
- عند الإفلات: عرض حوار صغير «أيّ فريق؟ → فريق 1 / فريق 2 / إلغاء» (لأن صورة قد تُسحب من أي مكان على الشاشة).
- إعادة استخدام نفس منطق `cropToSquareJpeg` + رفع إلى bucket `team-photos` + بث `SET_TEAM_PHOTO` عبر `feudSync`.
- نقل دالة الرفع/القص إلى ملف مشترك صغير `src/lib/team-photo-upload.ts` لتجنّب تكرار الكود بين الملفين.

### 3) ملف مشترك جديد — `src/lib/team-photo-upload.ts`

يصدّر:
- `cropToSquareJpeg(file: File): Promise<Blob>`
- `uploadTeamPhoto(team: 1 | 2, file: File): Promise<string>` — يتحقق من النوع (JPG/PNG) والحجم (≤2MB)، يقصّ، يرفع إلى Supabase Storage `team-photos/team{n}.jpg` مع `upsert`, يعيد رابط عام مع `?v=timestamp`، ثم يبثّ `SET_TEAM_PHOTO`.
- يستخدمه كل من `FeudController.tsx` و`FamilyFeud.tsx`.

### نطاق غير مشمول

- لا تغييرات على القاعدة أو الـ bucket (موجود).
- لا تغيير على منطق المزامنة، فقط استدعاء نفس الأكشن.
- لا شريط تقدم ولا معرض صور جاهزة (لم تُطلب).

### الملفات

- `src/lib/team-photo-upload.ts` (جديد)
- `src/components/FeudController.tsx` (إضافة handlers للسحب + استبدال منطق الرفع بالاستيراد من الملف المشترك)
- `src/components/FamilyFeud.tsx` (إضافة drop overlay + حوار اختيار الفريق)
