/**
 * Facts the bot may tell students. Public-facing — so:
 *  - NO partner university names (they are confidential). Say "hamkor universitetlarimiz".
 *  - NO invented numbers. If a fact isn't here, the bot says a consultant will confirm.
 */
export const UPNEX_KNOWLEDGE = `
━━━ UPNEX — FAKTLAR ━━━
- Upnex — xorijda o'qish bo'yicha konsalting agentligi. 2025-yilda tashkil topgan. Asosiy yo'nalish — AQSh.
- Ofis: Andijon shahri, Milliy Tiklanish ko'chasi.
- Sayt: upnexuz.com
- Upnex'ning o'z ingliz tili markazi ham bor: hozir 100+ o'quvchi, jami 500+ o'quvchi bilan ishlagan.
- Rahbarlar: Nurislom (O'zbekistonda — mijozlar, shartnomalar, viza, ofis), Oyatillo (AQShda — universitet arizalari, grant hujjatlari, admission).

━━━ AQSh STANDART PAKETI — $4,000 ━━━
To'lov 2 bosqichda:
- $1,000 — shartnoma imzolanganda
- $3,000 — grant va universitet qabul hujjatlari tayyor bo'lganda
Ichiga kiradi:
- Talaba nomidan 10 ta universitetga ariza topshirish
- Qabul va grant/stipendiya bo'yicha to'liq yordam
- F-1 viza suhbatiga tayyorgarlik (haftasiga 3 kun) — qo'shimcha to'lovsiz
- Immigratsiya hujjatlari
- Zoom treninglar
- AQShga borgandan keyin yordam
Eng kuchli tomoni: hamkor universitetlarimiz orqali IELTS'siz qabul imkoniyati bor (universitetning ichki ingliz tili testi yoki Duolingo orqali). O'zi mustaqil topshirgan talabaga odatda taxminan IELTS 6.5 va SAT 1450 kerak bo'ladi.
Boshqa davlatlar (Yevropa, Osiyo) narxi — individual, konsultant aytadi.

━━━ TEZ-TEZ BERILADIGAN SAVOLLAR ━━━
• Narxi qancha? → To'g'ridan-to'g'ri ayt: AQSh paketi $4,000, $1,000 shartnomada, $3,000 qabul va grant hujjatlari tayyor bo'lganda. Ichiga nima kirishini 1–2 jumlada ayt. Keyin suhbatni davom ettir.
• IELTS'siz bo'ladimi? → Ha bo'ladi. Hamkor universitetlarimiz orqali IELTS talab qilinmaydi — ichki ingliz tili testi yoki Duolingo yetarli. Bu UPNEX'ning asosiy ustunliklaridan biri.
• 100% grant bo'ladimi? → Ba'zi hollarda katta grantlar bo'ladi, lekin bu baholar, til darajasi va universitetga bog'liq. Aniq foizni profil ko'rilgandan keyin aytamiz. Hech qachon summa yoki foiz va'da qilma.
• Maktab baholari muhimmi? → Ha, baholar grant miqdoriga ta'sir qiladi. Lekin o'rtacha baho bilan ham variantlar bor.
• O'qib ishlash mumkinmi? → AQShda F-1 talaba semestr davomida kampus ichida haftasiga 20 soatgacha ishlay oladi. Boshqa davlatlar qoidasini konsultant aytadi.
• Viza kafolatlanadimi? → Yo'q. Upnex hujjatlar va suhbatga maksimal tayyorlaydi, yakuniy qarorni faqat elchixona qiladi.
• Bank hisobida pul kerakmi? → Ha, viza uchun moliyaviy imkoniyatni ko'rsatish kerak; summasi universitet va grantga bog'liq — konsultant aniq hisoblab beradi.
• Sizga ishonsa bo'ladimi? / Aldov emasmi? → Xotirjam javob ber: rasmiy shartnoma asosida ishlaymiz, to'lovning katta qismi ($3,000) faqat qabul va grant hujjatlari tayyor bo'lgandan keyin to'lanadi, Andijondagi ofisimizga kelib gaplashish mumkin.
• Ofis qayerda? → Andijon shahri, Milliy Tiklanish ko'chasi. Kelishdan oldin vaqtni kelishib olish uchun jamoamiz bog'lanadi.
• Oyatillo kim? → Upnex asoschisi, hozir AQShda o'qiydi va talabalarning universitet arizalari bilan shug'ullanadi.
• Qaysi universitetlar? → Nomlarini chatda aytmaymiz. "Profilingizga qarab hamkor universitetlarimizdan mos variantlarni konsultatsiyada ko'rsatamiz" de.

━━━ JARAYON VA INTERVYULAR ━━━
- UPNEX talabalar AQSh universitetlariga "UPNEX studenti" sifatida kiradi — hamkor universitetlar orqali.
- Jarayon davomida 2 ta intervyu bo'ladi: 1-si bahorda (mart–aprel), 2-si may oxiri yoki iyun boshida.
- Sinfga qarab jadval:
  • 11-sinf: bahorda 1-intervyu, may oxiri/iyun boshida 2-intervyu
  • 10-sinf: 10-sinf oxirida universitet intervyusi, 11-sinfda viza intervyusi
  • 9-sinf: 9-sinf oxirida 1-intervyu, 10-sinf oxirida universitet intervyusi

━━━ DARSLAR VA TAYYORGARLIK ━━━
- Darslar Zoom orqali (UPNEX jamoasi Nyu-Yorkda), haftada 3 kun, 1,5 soatdan.
- Darslar ingliz tilida — Amerika viza intervyusi ingliz tilida bo'ladi.
- Amerika aksenti bilan ingliz tili rivojlantirish darslar davomida bo'ladi.
- Akademik portfolio: Harvard, MIT, Stanford kabi top universitetlarning sohaviy sertifikatlari. Ro'yxatdan o'tish darsda o'rgatiladi.
- UPNEX ichki imtihoni: imtihondan o'tgandan keyin viza intervyusiga kiritiladi.
- Oyatillo o'zi har bir talabani viza intervyusiga tayyorlaydi.
- "Hujjat keldi, boring" degan narsa yo'q — tayyorgarligi yetarli bo'lganda kiritiladi.

━━━ MOLIYAVIY HUJJATLAR ━━━
- Viza uchun bank hisobi: 35,000$–45,000$ ko'rsatilishi kerak.
- Agar bu summani o'z hisobida ko'rsata olmasa, UPNEX homiylik (sponsorship) qila oladi.

━━━ GRANT VA UNIVERSITETLAR ━━━
- Grant miqdori odatda 125,000$–145,000$ (to'liq o'qish + yashash xarajatlari).
- 10 ta universitetga ariza topshiriladi, eng yaxshi grant berganiga ketiladi.
- Universitetlar joylashgan shtatlar: Nyu-York, Nyu-York Upstate, Los-Anjeles, Kaliforniya, Mayami, Indiana, Chikago, Pensilvaniya, Ogayo, Orlando.

━━━ VIZA INTERVYUSI ━━━
- Amerika viza intervyusida 75 ta savol bor, 10–15 tasi beriladi.
- Namunaviy savollar: "Nimaga Amerikaga ketyapsiz?", "Amerikada nima qilasiz?", "Grantingizni qayerdan oldingiz?"
- Bu savollarga javob berishni darslar davomida o'rgatiladi.
`;
