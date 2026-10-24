# NEXORA · Linux Bridge HMAC

واجهة الإدارة العربية وBridge API تعملان على خدمة NEXORA نفسها والنطاق نفسه. يحافظ التطبيق على بروتوكول heartbeat/event القديم، ويضيف مسار وظائف HMAC موقّعة. لا يوجد في المستودع أو Render مضيف Linux خارجي مؤكد الاتصال؛ المشغّل المضاف يعمل محليًا داخل خدمة Render فقط.

## أسرار التشغيل

- استخدم `NEXORA_BRIDGE_HMAC_SECRET` الموجود على الخادم فقط، بطول 32 بايت على الأقل. لا تضعه في Git أو ملفات الواجهة أو السجلات، ولا تغيّره عند نشر هذا التحديث.
- يحافظ متغير `NEXORA_KEYS_JSON` على مفاتيح الطرفيات الأخرى. إذا استُخدم السر المنفرد الحالي للـ heartbeat/event، يكون معرّف المفتاح الثابت `nexora-linux-bridge-prod`.
- لا يحتاج بروتوكول الوظائف إلى متغير سر جديد أو مفتاح داخل المتصفح. يوقّع الخادم الطلب الداخلي باستخدام السر الموجود على الخادم.

## التوافق: heartbeat وevent الواردان

تستقبل المسارات التالية صيغة HMAC القديمة كما هي:

- `POST /api/terminal/heartbeat`
- `POST /api/terminal/event`

الترويسات:

```text
x-nexora-key: nexora-linux-bridge-prod
x-nexora-timestamp: <unix-seconds>
x-nexora-signature: sha256=<hex-signature>
```

التوقيع القديم:

```text
HMAC-SHA256(secret, timestamp + "." + rawRequestBody)
```

لا تُعدّل هذه الصيغة عند ترقية عميل طرفية قائم. يقبل الخادم افتراضيًا انحرافًا يصل إلى 300 ثانية (`HMAC_CLOCK_SKEW_SECONDS`) ويحسب حالة الاتصال من آخر heartbeat موثق.

### نبضة ذاتية من خدمة Render

يمكن للخدمة نفسها إرسال heartbeat موثق إلى نقطة التحكم بعد ضبط `NEXORA_SELF_HEARTBEAT_ENABLED=true` و`NEXORA_SELF_HEARTBEAT_URL` على عنوان `POST /api/terminal/heartbeat`. تستخدم الحلقة `NEXORA_BRIDGE_HMAC_SECRET` ومعرّف `nexora-linux-bridge-prod`، وترسل نبضة فور بدء العملية ثم كل 120 ثانية افتراضيًا (`NEXORA_SELF_HEARTBEAT_INTERVAL_SECONDS`). لا تُسجل قيمة السر أو التوقيع، وتبقى الحلقة متوقفة افتراضيًا. تعود تلقائيًا بعد إعادة تشغيل العملية، لكنها لا تعمل أثناء توقف خدمة Render بالكامل.

## البروتوكول الجديد: وظائف داخل NEXORA

التدفق:

1. تعرض لوحة NEXORA عناصر المهام التي أعادها `/api/control/jobs/commands` فقط.
2. بعد ضغط المشغّل على زر الإرسال، يرسل المتصفح إلى `POST /api/control/jobs` الحقلين `jobId` و`commandId` فقط. لا يرسل `exec` أو args أو shell أو env أو السر.
3. يرفض الخادم غير المدير، ويشتق `requestedBy` داخليًا، ويولّد timestamp وnonce جديدين، ثم يوقّع الجسم الخام الذي سيُرسل إلى `POST /internal/jobs`.
4. يتحقق المسار الداخلي من التوقيع والوقت والـ nonce والمخطط وملف allowlist على الخادم، ثم ينفذ الأمر الثابت فقط عبر `spawn` دون shell، بمهلة وخرج محدودين.

### شكل الجسم والترويسات

الجسم الدقيق بعد تسلسل JSON، من دون إعادة تنسيق بعد التوقيع:

```json
{"jobId":"0123456789abcdef0123456789abcdef","commandId":"health_check","requestedBy":"nexora-control-center"}
```

```text
x-nexora-timestamp: <10-digit Unix seconds>
x-nexora-nonce: <18 random bytes encoded as base64url>
x-nexora-signature: <64 lowercase hexadecimal characters>
```

`jobId` يجب أن يتكون من **32 محرفًا سداسيًا عشريًا**، ويُنتج عادةً من UUID بعد إزالة الشرطات. الـ nonce بطول 24 محرف base64url. لا يرسل العميل هذه الترويسات؛ ينشئها الخادم.

### التوقيع canonical

استخدم الطريقة والمسار الفعليين، بالترتيب التالي، وبفواصل newline حرفية `\n`:

```text
METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + NONCE + "\n" + RAW_BODY
```

للطلب الحالي:

```text
POST\n/internal/jobs\n<TIMESTAMP>\n<NONCE>\n<بايتات JSON الخام>
```

والتوقيع:

```text
HMAC-SHA256(NEXORA_BRIDGE_HMAC_SECRET, canonicalPayload) -> lowercase hex
```

يفك الخادم الجسم من بايتاته بعد التحقق من التوقيع؛ لذلك يجب أن تكون بايتات الجسم مطابقة تمامًا لما وُقّع. يستخدم `express.raw` للمسار الداخلي قبل محلل JSON العام.

## حماية إعادة الإرسال والقيود

- انحراف الوقت الافتراضي 60 ثانية، قابل للضبط عبر `NEXORA_JOB_CLOCK_SKEW_SECONDS` ضمن 1–300 ثانية؛ تعود القيمة غير الصحيحة إلى الافتراضي الآمن.
- nonce أحادي الاستخدام، يحتفظ به دقيقتين؛ يُرفض تكراره بحالة `409`.
- `jobId` idempotency لمدة 24 ساعة؛ تكرار jobId بجسم مطابق وتوقيع/nonce جديدين يعيد الحالة السابقة ولا ينفذ الأمر مرة ثانية. ربط المعرّف بأمر/مرسل آخر يُرفض.
- حد الجسم 8 KiB، مجموع stdout/stderr ‏16 KiB، مدة 30 ثانية، ومعدل 30 طلبًا في الدقيقة لكل عنوان عميل.
- حدود الذاكرة: حتى 10,000 nonce و1,000 job. السجلات تكتب jobId وcommandId وexecutor والحالة فقط؛ لا تسجل السر أو التوقيع أو الجسم الخام.
- لا ترث عملية التنفيذ `CONTROL_API_KEY` أو `NEXORA_KEYS_JSON` أو `NEXORA_BRIDGE_HMAC_SECRET` أو `RENDER_API_KEY` أو `MANUS_API_KEY`؛ تستخدم بيئة فرعية صغيرة فقط.

## تفعيل المشغّل المحلي

يظل التنفيذ معطلًا افتراضيًا. يفعّل `NEXORA_BRIDGE_JOBS_MODE=single_instance_memory` المسار فقط إذا وُجد السر الصالح أيضًا. استخدمه فقط بعد تأكيد نسخة واحدة وإيقاف autoscaling في Render. تخزين nonce والوظائف محدود داخل ذاكرة العملية الحالية؛ إعادة تشغيلها تمسح dedupe والسجل، والنسخ المتعددة لا تتشارك الذاكرة. يلزم مخزن مشترك ذري مع TTL، مثل Redis، قبل التوسع أو أي اعتماد يتطلب dedupe دائمًا.

المشغّل المعلن `local_render`. فحص `health_check` المدمج يقرأ إصدار Node ومدة تشغيل عملية NEXORA؛ لا ينفذ أمر نظام ولا يتصل بمضيف Linux آخر. لا تضف أمرًا إلى واجهة الوظائف إلا بعد وضع `internalJob: true` في ملف أوامر خادمي ومراجعة `exec` والمعاملات الثابتة بعناية. تُرفض أوامر shell وserviceAction والمدخلات النائبة لمسار الوظائف. `COMMANDS_FILE` منفصل عن واجهة `/api/run` العادية، التي تحتفظ بسلوكها الحالي.

## مسارات لوحة التحكم

تتطلب المسارات التالية جلسة مدير HttpOnly أو ترويسة إدارة موثوقة:

- `GET /api/control/jobs` — الإعداد الآمن وسجل آخر 50 وظيفة.
- `GET /api/control/jobs/commands` — قائمة فحص الخدمة المدمج وعناصر `internalJob` المعتمدة.
- `POST /api/control/jobs` — يقبل `jobId` و`commandId` فقط، مع Same-Origin.
- `POST /internal/jobs` — مسار توقيع داخلي على الجسم الخام؛ لا يقبل الوصول المجهول أو shell حرًا.
- تظل مسارات `/api/terminal/heartbeat` و`/api/terminal/event` متاحة بصيغتها القديمة.

لا تُشغّل الاختبارات إلا على خادم محلي وهمي وبسر اختبار فقط. لا ترسل وظيفة إلى Render أثناء التحقق من الشيفرة.
