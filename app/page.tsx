"use client";

import { useState, useEffect, useCallback } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Translations
const translations = {
  en: {
    title: "Pay $1 to see how many people paid $1",
    subtitle: "to see how many people joined the universe",
    brand: "Universe of Kindness 🌌",
    peopleCount: "People who paid $1",
    countDescription: "See how many kind souls are spreading goodness",
    paySee: " Pay $1 - Pay & See",
    leaveMessage: "✨ Leave Message - $2",
    buyStar: "⭐ Buy a Star - $5",
    paySeeDesc: "$1 — Pay & See the kindness counter",
    leaveMessageDesc: "$2 — Add your name & message to the cosmic ticker",
    buyStarDesc: "$5 — Name your own star on the 3D globe",
    paySeeModal: "Pay & See",
    paySeeModalDesc: "Pay $1 and unlock the kindness counter",
    leaveMessageModal: "Leave Your Message",
    leaveMessageModalDesc: "Pay $2 and add your kind wish to the cosmic ticker",
    buyStarModal: "Buy Your Star",
    buyStarModalDesc: "Name a star and add it to our 3D globe!",
    namePlaceholder: "Your name or nickname",
    messagePlaceholder: "Your kind message...",
    starNamePlaceholder: "Name your star (e.g. Star of Hope)",
    cancel: "Cancel",
    pay: "Pay",
    login: "Login / Register",
    logout: "Logout",
    footer: "© 2025 Universe of Kindness. Spreading love around the world.",
    loading: "Loading...",
    error: "Something went wrong. Please try again.",
    success: "Payment initiated! Check your Volet app to complete.",
  },
  es: {
    title: "Paga $1 para ver cuántas personas pagaron $1",
    subtitle: "para ver cuántas personas se unieron al universo",
    brand: "Universo de Bondad 🌌",
    peopleCount: "Personas que pagaron $1",
    countDescription: "Mira cuántas almas bondadosas están propagando bondad",
    paySee: "💙 Pagar $1 - Ver",
    leaveMessage: "✨ Dejar Mensaje - $2",
    buyStar: "⭐ Comprar Estrella - $5",
    paySeeDesc: "$1 — Ver el contador de bondad",
    leaveMessageDesc: "$2 — Agrega tu nombre y mensaje al ticker cósmico",
    buyStarDesc: "$5 — Nombra tu propia estrella en el globo 3D",
    paySeeModal: "Pagar y Ver",
    paySeeModalDesc: "Paga $1 y desbloquea el contador de bondad",
    leaveMessageModal: "Deja tu Mensaje",
    leaveMessageModalDesc: "Paga $2 y agrega tu deseo al ticker cósmico",
    buyStarModal: "Compra tu Estrella",
    buyStarModalDesc: "¡Nombra una estrella y agrégala a nuestro globo 3D!",
    namePlaceholder: "Tu nombre o apodo",
    messagePlaceholder: "Tu mensaje de bondad...",
    starNamePlaceholder: "Nombra tu estrella (ej. Estrella de Esperanza)",
    cancel: "Cancelar",
    pay: "Pagar",
    login: "Entrar / Registrarse",
    logout: "Salir",
    footer: "© 2025 Universo de Bondad. Difundiendo amor por todo el mundo.",
    loading: "Cargando...",
    error: "Algo salió mal. Intenta de nuevo.",
    success: "¡Pago iniciado! Completa en tu app Volet.",
  },
  pt: {
    title: "Pague $1 para ver quantas pessoas pagaram $1",
    subtitle: "para ver quantas pessoas se juntaram ao universo",
    brand: "Universo da Bondade 🌌",
    peopleCount: "Pessoas que pagaram $1",
    countDescription: "Veja quantas almas bondosas estão espalhando bondade",
    paySee: "💙 Pagar $1 - Ver",
    leaveMessage: "✨ Deixar Mensagem - $2",
    buyStar: "⭐ Comprar Estrela - $5",
    paySeeDesc: "$1 — Ver o contador de bondade",
    leaveMessageDesc: "$2 — Adicione seu nome e mensagem ao ticker cósmico",
    buyStarDesc: "$5 — Nomeie sua própria estrela no globo 3D",
    paySeeModal: "Pagar e Ver",
    paySeeModalDesc: "Pague $1 e desbloqueie o contador de bondade",
    leaveMessageModal: "Deixe sua Mensagem",
    leaveMessageModalDesc: "Pague $2 e adicione seu desejo ao ticker cósmico",
    buyStarModal: "Compre sua Estrela",
    buyStarModalDesc: "Nomeie uma estrela e adicione ao nosso globo 3D!",
    namePlaceholder: "Seu nome ou apelido",
    messagePlaceholder: "Sua mensagem de bondade...",
    starNamePlaceholder: "Nomeie sua estrela (ex. Estrela da Esperança)",
    cancel: "Cancelar",
    pay: "Pagar",
    login: "Entrar / Registrar",
    logout: "Sair",
    footer: "© 2025 Universo da Bondade. Espalhando amor pelo mundo.",
    loading: "Carregando...",
    error: "Algo deu errado. Tente novamente.",
    success: "Pagamento iniciado! Complete no app Volet.",
  },
  fr: {
    title: "Payez $1 pour voir combien de personnes ont payé $1",
    subtitle: "pour voir combien de personnes ont rejoint l'univers",
    brand: "Univers de Bonté 🌌",
    peopleCount: "Personnes ayant payé $1",
    countDescription: "Voyez combien d'âmes bienveillantes propagent la bonté",
    paySee: "💙 Payer $1 - Voir",
    leaveMessage: "✨ Laisser un Message - $2",
    buyStar: "⭐ Acheter une Étoile - $5",
    paySeeDesc: "$1 — Voir le compteur de bonté",
    leaveMessageDesc: "$2 — Ajoutez votre nom et message au ticker cosmique",
    buyStarDesc: "$5 — Nommez votre propre étoile sur le globe 3D",
    paySeeModal: "Payer et Voir",
    paySeeModalDesc: "Payez $1 et débloquez le compteur de bonté",
    leaveMessageModal: "Laissez votre Message",
    leaveMessageModalDesc: "Payez $2 et ajoutez votre vœu au ticker cosmique",
    buyStarModal: "Achetez votre Étoile",
    buyStarModalDesc: "Nommez une étoile et ajoutez-la à notre globe 3D!",
    namePlaceholder: "Votre nom ou pseudo",
    messagePlaceholder: "Votre message de bonté...",
    starNamePlaceholder: "Nommez votre étoile (ex. Étoile de l'Espoir)",
    cancel: "Annuler",
    pay: "Payer",
    login: "Connexion / S'inscrire",
    logout: "Déconnexion",
    footer: "© 2025 Univers de Bonté. Répandre l'amour dans le monde.",
    loading: "Chargement...",
    error: "Une erreur est survenue. Veuillez réessayer.",
    success: "Paiement initié! Complétez dans l'app Volet.",
  },
  de: {
    title: "Zahle $1 um zu sehen, wie viele Personen $1 zahlten",
    subtitle: "um zu sehen, wie viele Personen dem Universum beitraten",
    brand: "Universum der Güte 🌌",
    peopleCount: "Personen, die $1 zahlten",
    countDescription: "Siehe, wie viele gute Seelen Güte verbreiten",
    paySee: "💙 $1 Zahlen - Sehen",
    leaveMessage: "✨ Nachricht Hinterlassen - $2",
    buyStar: "⭐ Stern Kaufen - $5",
    paySeeDesc: "$1 — Zähler der Güte ansehen",
    leaveMessageDesc: "$2 — Name und Nachricht zum kosmischen Ticker hinzufügen",
    buyStarDesc: "$5 — Nennen Sie Ihren eigenen Stern auf dem 3D-Globus",
    paySeeModal: "Zahlen & Sehen",
    paySeeModalDesc: "Zahle $1 und entsperre den Güte-Zähler",
    leaveMessageModal: "Hinterlasse deine Nachricht",
    leaveMessageModalDesc: "Zahle $2 und füge deinen guten Wunsch hinzu",
    buyStarModal: "Kaufe deinen Stern",
    buyStarModalDesc: "Nennen Sie einen Stern und fügen Sie ihn zum 3D-Globus hinzu!",
    namePlaceholder: "Dein Name oder Spitzname",
    messagePlaceholder: "Deine gute Botschaft...",
    starNamePlaceholder: "Nenne deinen Stern (z.B. Stern der Hoffnung)",
    cancel: "Abbrechen",
    pay: "Zahlen",
    login: "Anmelden / Registrieren",
    logout: "Abmelden",
    footer: "© 2025 Universum der Güte. Liebe auf der ganzen Welt verbreiten.",
    loading: "Laden...",
    error: "Etwas ist schiefgelaufen. Bitte erneut versuchen.",
    success: "Zahlung eingeleitet! In der Volet-App abschließen.",
  },
  zh: {
    title: "支付1美元，看看有多少人支付了1美元",
    subtitle: "看看有多少人加入了这个善良宇宙",
    brand: "善良宇宙 🌌",
    peopleCount: "支付1美元的人们",
    countDescription: "看看有多少善良的灵魂在传播美好",
    paySee: "💙 支付1美元 - 查看",
    leaveMessage: "✨ 留言 - 2美元",
    buyStar: "⭐ 购买星星 - 5美元",
    paySeeDesc: "1美元 — 查看善良计数器",
    leaveMessageDesc: "2美元 — 将您的姓名和留言添加到宇宙滚动栏",
    buyStarDesc: "5美元 — 在3D地球仪上命名您的星星",
    paySeeModal: "支付并查看",
    paySeeModalDesc: "支付1美元，解锁善良计数器",
    leaveMessageModal: "留下您的留言",
    leaveMessageModalDesc: "支付2美元，与世界分享您的善良祝愿",
    buyStarModal: "购买您的星星",
    buyStarModalDesc: "命名一颗星星并添加到我们的3D地球仪上！",
    namePlaceholder: "您的姓名或昵称",
    messagePlaceholder: "您的善良祝愿...",
    starNamePlaceholder: "为您的星星命名（例如：希望之星）",
    cancel: "取消",
    pay: "支付",
    login: "登录 / 注册",
    logout: "退出",
    footer: "© 2025 善良宇宙。将爱传播到全世界。",
    loading: "加载中...",
    error: "出了点问题，请重试。",
    success: "支付已启动！请在Volet应用中完成。",
  },
  hi: {
    title: "$1 भुगतान करें और देखें कितने लोगों ने $1 का भुगतान किया",
    subtitle: "देखें कितने लोगों ने दयालुता ब्रह्मांड में शामिल हुए",
    brand: "दयालुता ब्रह्मांड 🌌",
    peopleCount: "लोगों ने $1 का भुगतान किया",
    countDescription: "देखें कितने दयालु आत्माएं दया फैला रही हैं",
    paySee: "💙 $1 का भुगतान - देखें",
    leaveMessage: "✨ संदेश छोड़ें - $2",
    buyStar: "⭐ सितारा खरीदें - $5",
    paySeeDesc: "$1 — दया काउंटर देखें",
    leaveMessageDesc: "$2 — अपना नाम और संदेश कॉस्मिक टिकर में जोड़ें",
    buyStarDesc: "$5 — 3D ग्लोब पर अपना सितारा नाम दें",
    paySeeModal: "भुगतान करें और देखें",
    paySeeModalDesc: "$1 का भुगतान करें और दया काउंटर अनलॉक करें",
    leaveMessageModal: "अपना संदेश छोड़ें",
    leaveMessageModalDesc: "$2 का भुगतान करें और अपनी शुभकामना साझा करें",
    buyStarModal: "अपना सितारा खरीदें",
    buyStarModalDesc: "एक सितारे का नाम रखें और 3D ग्लोब में जोड़ें!",
    namePlaceholder: "आपका नाम या उपनाम",
    messagePlaceholder: "आपकी दयालु संदेश...",
    starNamePlaceholder: "अपने सितारे का नाम (जैसे आशा का सितारा)",
    cancel: "रद्द करें",
    pay: "भुगतान",
    login: "लॉगिन / रजिस्टर",
    logout: "लॉगआउट",
    footer: "© 2025 दयालुता ब्रह्मांड। दुनिया भर में प्रेम फैलाना।",
    loading: "लोड हो रहा है...",
    error: "कुछ गलत हुआ। कृपया पुनः प्रयास करें।",
    success: "भुगतान शुरू! Volet ऐप में पूरा करें।",
  },
  ar: {
    title: "ادفع دولارًا واحدًا لترى كم شخص دفع دولارًا واحدًا",
    subtitle: "لترى كم شخص انضم إلى كون اللطف",
    brand: "كون اللطف 🌌",
    peopleCount: "الأشخاص الذين دفعوا دولارًا واحدًا",
    countDescription: "انظر كم روح لطيفة تشارك اللطف",
    paySee: "💙 ادفع $1 - اعرض",
    leaveMessage: "✨ اترك رسالة - $2",
    buyStar: "⭐ اشترِ نجمة - $5",
    paySeeDesc: "$1 — اعرض عداد اللطف",
    leaveMessageDesc: "$2 — أضف اسمك ورسالتك إلى شريط الأخبار الكوني",
    buyStarDesc: "$5 — سمِّ نجمتك الخاصة على الكرة الأرضية ثلاثية الأبعاد",
    paySeeModal: "ادفع واعرض",
    paySeeModalDesc: "ادفع دولارًا واحدًا وافتح عداد اللطف",
    leaveMessageModal: "اترك رسالتك",
    leaveMessageModalDesc: "ادفع دولارين وشارك أمنيتك اللطيفة مع العالم",
    buyStarModal: "اشترِ نجمتك",
    buyStarModalDesc: "سمِّ نجمة وأضفها إلى كرتنا الأرضية ثلاثية الأبعاد!",
    namePlaceholder: "اسمك أو لقبك",
    messagePlaceholder: "رسالتك اللطيفة...",
    starNamePlaceholder: "سمِّ نجمتك (مثال: نجمة الأمل)",
    cancel: "إلغاء",
    pay: "ادفع",
    login: "دخول / تسجيل",
    logout: "خروج",
    footer: "© 2025 كون اللطف. ننشر الحب في جميع أنحاء العالم.",
    loading: "جارٍ التحميل...",
    error: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    success: "بدأ الدفع! أكمل في تطبيق Volet.",
  },
};

// Language options: flag + label
const languageOptions: { code: string; flag: string; label: string }[] = [
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "es", flag: "🇪🇸", label: "Español" },
  { code: "pt", flag: "🇧🇷", label: "Português" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
  { code: "zh", flag: "🇨🇳", label: "中文" },
  { code: "hi", flag: "🇮🇳", label: "हिन्दी" },
  { code: "ar", flag: "🇸🇦", label: "العربية" },
];

type ProductType = "PAY_SEE" | "LEAVE_MESSAGE" | "BUY_STAR";
type ModalType = ProductType | null;

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  // State
  const [count, setCount] = useState<number>(0);
  const [messages, setMessages] = useState<string[]>([]);
  const [language, setLanguage] = useState("en");
  const [langOpen, setLangOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [messageText, setMessageText] = useState("");
  const [starName, setStarName] = useState("");

  const t = translations[language as keyof typeof translations] ?? translations.en;

  // Fetch counter from DB
  const fetchCounter = useCallback(async () => {
    try {
      const res = await fetch("/api/counter");
      if (res.ok) {
        const data = await res.json();
        setCount(data.count);
      }
    } catch {
      // fallback to 0
    }
  }, []);

  // Fetch messages for ticker
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        if (data.messages?.length > 0) {
          setMessages(
            data.messages.map(
              (m: { name: string; text: string }) => `${m.name}: ${m.text}`
            )
          );
        } else {
          // fallback default messages
          setMessages([
            "Peace and love! 🌍",
            "Kindness matters! ❤️",
            "Spread the light! ✨",
            "Together we shine! 🌟",
            "Be the change! 🦋",
          ]);
        }
      }
    } catch {
      setMessages([
        "Peace and love! 🌍",
        "Kindness matters! ❤️",
        "Spread the light! ✨",
        "Together we shine! 🌟",
        "Be the change! 🦋",
      ]);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    const userLang = navigator.language?.split("-")[0].toLowerCase() ?? "en";
    if (userLang in translations) {
      setLanguage(userLang);
    }

    Promise.all([fetchCounter(), fetchMessages()]).finally(() => {
      setIsLoading(false);
    });
  }, [fetchCounter, fetchMessages]);

  // Poll counter every 30 seconds for live updates
  useEffect(() => {
    const interval = setInterval(fetchCounter, 30_000);
    return () => clearInterval(interval);
  }, [fetchCounter]);

  // Auto-detect language
  const switchLanguage = (lang: string) => setLanguage(lang);

  // Open modal and pre-fill name from session
  const openModal = (type: ModalType) => {
    if (session?.user?.name && !name) setName(session.user.name);
    setActiveModal(type);
    setError(null);
  };

  // Create payment via Volet
  const handlePayment = async () => {
    if (!activeModal) return;

    if (activeModal === "LEAVE_MESSAGE" && (!name.trim() || !messageText.trim())) {
      setError("Please fill in your name and message.");
      return;
    }
    if (activeModal === "BUY_STAR" && !starName.trim()) {
      setError("Please enter a name for your star.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType: activeModal,
          name: name.trim() || undefined,
          message: messageText.trim() || undefined,
          starName: starName.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Payment creation failed");
      }

      setPaymentSuccess(t.success);

      // Redirect to Volet payment page
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        // Fallback: show success and close modal after 3s
        setTimeout(() => {
          closeModal();
          fetchCounter();
          fetchMessages();
        }, 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setIsProcessing(false);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setName("");
    setMessageText("");
    setStarName("");
    setError(null);
    setPaymentSuccess(null);
  };

  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Cosmic Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-indigo-900/20 via-transparent to-purple-900/20" />
        {/* Stars background */}
        <div className="absolute inset-0 opacity-60" style={{
          backgroundImage: `radial-gradient(1px 1px at 10% 20%, white 1px, transparent 0),
            radial-gradient(1px 1px at 30% 60%, white 1px, transparent 0),
            radial-gradient(1.5px 1.5px at 50% 10%, white 1px, transparent 0),
            radial-gradient(1px 1px at 70% 80%, white 1px, transparent 0),
            radial-gradient(1px 1px at 90% 40%, white 1px, transparent 0),
            radial-gradient(1.5px 1.5px at 20% 90%, white 1px, transparent 0),
            radial-gradient(1px 1px at 60% 30%, white 1px, transparent 0),
            radial-gradient(1px 1px at 80% 60%, white 1px, transparent 0)`,
          backgroundSize: "200px 200px",
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Language Switcher — compact dropdown */}
        <div className="absolute top-6 right-6 z-50">
          <div className="relative">
            <button
              onClick={() => setLangOpen((o) => !o)}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-lg rounded-full px-3 py-1.5 border border-white/20 shadow-lg text-white text-sm hover:bg-white/20 transition-all"
            >
              <span className="text-base">
                {languageOptions.find((l) => l.code === language)?.flag ?? "🌐"}
              </span>
              <span className="hidden sm:inline">
                {languageOptions.find((l) => l.code === language)?.label ?? "English"}
              </span>
              <span className="text-xs opacity-60">▾</span>
            </button>

            {langOpen && (
              <>
                {/* Backdrop to close on click outside */}
                <div className="fixed inset-0 z-0" onClick={() => setLangOpen(false)} />
                <div className="absolute right-0 mt-2 bg-slate-900/95 backdrop-blur-lg rounded-xl border border-white/20 shadow-2xl overflow-hidden z-10 min-w-[140px]">
                  {languageOptions.map((opt) => (
                    <button
                      key={opt.code}
                      onClick={() => {
                        setLanguage(opt.code);
                        setLangOpen(false);
                      }}
                      className={`flex items-center gap-2 w-full px-4 py-2 text-sm text-left hover:bg-white/10 transition-colors ${
                        language === opt.code ? "bg-white/10 text-yellow-300" : "text-white"
                      }`}
                    >
                      <span className="text-base">{opt.flag}</span>
                      <span>{opt.label}</span>
                      {language === opt.code && <span className="ml-auto text-yellow-400">✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Auth Button */}
        <div className="absolute top-6 left-6 z-50">
          {session ? (
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-lg rounded-full px-4 py-2 border border-white/20">
              <span className="text-white text-sm">
                {session.user?.name ?? session.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="text-xs text-gray-300 hover:text-white transition-colors"
              >
                {t.logout}
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="bg-white/10 backdrop-blur-lg rounded-full px-4 py-2 border border-white/20 text-white text-sm hover:bg-white/20 transition-colors"
            >
              {t.login}
            </button>
          )}
        </div>

        {/* Header */}
        <header className="text-center py-6 px-4 pt-20">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            {t.title}
          </h1>
          <p className="text-xl md:text-2xl text-white mb-2">{t.subtitle}</p>
          <p className="text-lg text-gray-300 mt-4">{t.brand}</p>
        </header>

        {/* Scrolling Messages Ticker */}
        <div className="bg-black/40 backdrop-blur-md py-3 overflow-hidden border-y border-white/10">
          {messages.length > 0 ? (
            <div className="flex animate-scroll whitespace-nowrap">
              {[...messages, ...messages].map((msg, index) => (
                <span key={index} className="mx-8 text-lg text-white font-medium">
                  {msg} ✨
                </span>
              ))}
            </div>
          ) : (
            <div className="flex animate-scroll whitespace-nowrap">
              {[1, 2].flatMap((i) =>
                ["Peace and love! 🌍", "Kindness matters! ❤️", "Spread the light! ✨", "Together we shine! 🌟", "Be the change! 🦋"].map((msg, j) => (
                  <span key={`${i}-${j}`} className="mx-8 text-lg text-white font-medium">
                    {msg}
                  </span>
                ))
              )}
            </div>
          )}
        </div>

        {/* Main Content */}
        <section className="flex-grow flex flex-col justify-center items-center py-8 px-4">
          {/* Counter */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center border border-white/30 shadow-2xl mb-6 w-full max-w-md">
            <p className="text-lg text-white mb-2 font-medium">{t.peopleCount}</p>
            {isLoading ? (
              <div className="text-6xl font-bold text-gray-500 animate-pulse">···</div>
            ) : (
              <div className="text-6xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
                {count.toLocaleString()}
              </div>
            )}
            <p className="text-sm text-gray-300">{t.countDescription}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={() => openModal("PAY_SEE")}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-full text-base shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              {t.paySee}
            </button>
            <button
              onClick={() => openModal("LEAVE_MESSAGE")}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-full text-base shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              {t.leaveMessage}
            </button>
            <button
              onClick={() => openModal("BUY_STAR")}
              className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-full text-base shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              {t.buyStar}
            </button>
          </div>

          {/* Tier explanation */}
          <div className="text-center text-sm text-gray-300 mt-6 max-w-md space-y-1">
            <p><span className="text-blue-400 font-bold">{t.paySeeDesc}</span></p>
            <p><span className="text-purple-400 font-bold">{t.leaveMessageDesc}</span></p>
            <p><span className="text-yellow-400 font-bold">{t.buyStarDesc}</span></p>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-3 text-gray-400 text-xs">
          <p>{t.footer}</p>
        </footer>
      </div>

      {/* ── Payment Modal (Pay & See) ─────────────────────────────────────── */}
      {activeModal === "PAY_SEE" && (
        <ModalOverlay onClose={closeModal}>
          <div className="bg-gradient-to-b from-blue-900 to-indigo-900 rounded-2xl p-8 max-w-md w-full border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-center text-white">{t.paySeeModal}</h2>
            <p className="text-gray-300 mb-6 text-center">{t.paySeeModalDesc}</p>

            {paymentSuccess ? (
              <div className="text-center text-green-400 font-bold mb-4">{paymentSuccess}</div>
            ) : (
              <>
                {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
                <button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-colors font-bold text-white disabled:opacity-60"
                >
                  {isProcessing ? t.loading : `${t.pay} $1`}
                </button>
              </>
            )}

            <button
              onClick={closeModal}
              className="w-full mt-3 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 transition-colors text-white"
            >
              {t.cancel}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* ── Payment Modal (Leave Message) ─────────────────────────────────── */}
      {activeModal === "LEAVE_MESSAGE" && (
        <ModalOverlay onClose={closeModal}>
          <div className="bg-gradient-to-b from-purple-900 to-pink-900 rounded-2xl p-8 max-w-md w-full border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-center text-white">{t.leaveMessageModal}</h2>
            <p className="text-gray-300 mb-6 text-center">{t.leaveMessageModalDesc}</p>

            {paymentSuccess ? (
              <div className="text-center text-green-400 font-bold mb-4">{paymentSuccess}</div>
            ) : (
              <>
                {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.namePlaceholder}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 mb-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  maxLength={80}
                />
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={t.messagePlaceholder}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 mb-4 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                  maxLength={200}
                />
                <button
                  onClick={handlePayment}
                  disabled={isProcessing || !name.trim() || !messageText.trim()}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 transition-colors font-bold text-white disabled:opacity-60"
                >
                  {isProcessing ? t.loading : `${t.pay} $2`}
                </button>
              </>
            )}

            <button
              onClick={closeModal}
              className="w-full mt-3 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 transition-colors text-white"
            >
              {t.cancel}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* ── Payment Modal (Buy Star) ───────────────────────────────────────── */}
      {activeModal === "BUY_STAR" && (
        <ModalOverlay onClose={closeModal}>
          <div className="bg-gradient-to-b from-yellow-900 to-orange-900 rounded-2xl p-8 max-w-md w-full border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-center text-white">{t.buyStarModal}</h2>
            <p className="text-gray-300 mb-6 text-center">{t.buyStarModalDesc}</p>

            {paymentSuccess ? (
              <div className="text-center text-green-400 font-bold mb-4">{paymentSuccess}</div>
            ) : (
              <>
                {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
                <input
                  type="text"
                  value={starName}
                  onChange={(e) => setStarName(e.target.value)}
                  placeholder={t.starNamePlaceholder}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 mb-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  maxLength={60}
                />
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={t.messagePlaceholder}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 mb-4 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                  maxLength={200}
                />
                <button
                  onClick={handlePayment}
                  disabled={isProcessing || !starName.trim()}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 transition-colors font-bold text-white disabled:opacity-60"
                >
                  {isProcessing ? t.loading : `${t.pay} $5`}
                </button>
              </>
            )}

            <button
              onClick={closeModal}
              className="w-full mt-3 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 transition-colors text-white"
            >
              {t.cancel}
            </button>
          </div>
        </ModalOverlay>
      )}
    </main>
  );
}

// ─── Modal Overlay Component ─────────────────────────────────────────────────
function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  );
}
