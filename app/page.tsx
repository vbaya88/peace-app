"use client";

import { useState, useEffect } from "react";

// Translations
const translations = {
  en: {
    title: "Pay $1 to see how many people paid $1",
    subtitle: "to see how many people paid $1",
    brand: "Universe of Kindness 🌌",
    peopleCount: "People who paid $1",
    countDescription: "See how many people joined the universe of kindness",
    paySee: " Pay $1 - Pay & See",
    leaveMessage: "✨ Leave Message - $2",
    paySeeDesc: "$1 - Pay & see the count",
    leaveMessageDesc: "$2 - Leave your name & message",
    paySeeModal: "Pay & See",
    paySeeModalDesc: "Pay $1 to see how many people joined the universe",
    leaveMessageModal: "Leave Your Message",
    leaveMessageModalDesc: "Pay $2 and share your kind wish with the world",
    namePlaceholder: "Your name or nickname",
    messagePlaceholder: "Your kind message...",
    cancel: "Cancel",
    pay: "Pay",
    footer: "© 2024 Universe of Kindness. Spreading love around the world.",
  },
  es: {
    title: "Paga $1 para ver cuántas personas pagaron $1",
    subtitle: "para ver cuántas personas pagaron $1",
    brand: "Universo de Bondad 🌌",
    peopleCount: "Personas que pagaron $1",
    countDescription: "Mira cuántas personas se unieron al universo de bondad",
    paySee: "💙 Pagar $1 - Ver",
    leaveMessage: "✨ Dejar Mensaje - $2",
    paySeeDesc: "$1 - Ver el contador",
    leaveMessageDesc: "$2 - Dejar tu nombre y mensaje",
    paySeeModal: "Pagar y Ver",
    paySeeModalDesc: "Paga $1 para ver cuántas personas se unieron al universo",
    leaveMessageModal: "Deja tu Mensaje",
    leaveMessageModalDesc: "Paga $2 y comparte tu deseo de bondad con el mundo",
    namePlaceholder: "Tu nombre o apodo",
    messagePlaceholder: "Tu mensaje de bondad...",
    cancel: "Cancelar",
    pay: "Pagar",
    footer: "© 2024 Universo de Bondad. Difundiendo amor por todo el mundo.",
  },
  pt: {
    title: "Pague $1 para ver quantas pessoas pagaram $1",
    subtitle: "para ver quantas pessoas pagaram $1",
    brand: "Universo da Bondade 🌌",
    peopleCount: "Pessoas que pagaram $1",
    countDescription: "Veja quantas pessoas se juntaram ao universo da bondade",
    paySee: "💙 Pagar $1 - Ver",
    leaveMessage: "✨ Deixar Mensagem - $2",
    paySeeDesc: "$1 - Ver o contador",
    leaveMessageDesc: "$2 - Deixar seu nome e mensagem",
    paySeeModal: "Pagar e Ver",
    paySeeModalDesc: "Pague $1 para ver quantas pessoas se juntaram ao universo",
    leaveMessageModal: "Deixe sua Mensagem",
    leaveMessageModalDesc: "Pague $2 e compartilhe seu desejo de bondade com o mundo",
    namePlaceholder: "Seu nome ou apelido",
    messagePlaceholder: "Sua mensagem de bondade...",
    cancel: "Cancelar",
    pay: "Pagar",
    footer: "© 2024 Universo da Bondade. Espalhando amor por todo o mundo.",
  },
  fr: {
    title: "Payez $1 pour voir combien de personnes ont payé $1",
    subtitle: "pour voir combien de personnes ont payé $1",
    brand: "Univers de Bonté ",
    peopleCount: "Personnes ayant payé $1",
    countDescription: "Voyez combien de personnes ont rejoint l'univers de bonté",
    paySee: "💙 Payer $1 - Voir",
    leaveMessage: "✨ Laisser un Message - $2",
    paySeeDesc: "$1 - Voir le compteur",
    leaveMessageDesc: "$2 - Laisser votre nom et message",
    paySeeModal: "Payer et Voir",
    paySeeModalDesc: "Payez $1 pour voir combien de personnes ont rejoint l'univers",
    leaveMessageModal: "Laissez votre Message",
    leaveMessageModalDesc: "Payez $2 et partagez votre vœu de bonté avec le monde",
    namePlaceholder: "Votre nom ou pseudo",
    messagePlaceholder: "Votre message de bonté...",
    cancel: "Annuler",
    pay: "Payer",
    footer: "© 2024 Univers de Bonté. Répandre l'amour dans le monde entier.",
  },
  de: {
    title: "Zahle $1 um zu sehen, wie viele Personen $1 zahlten",
    subtitle: "um zu sehen, wie viele Personen $1 zahlten",
    brand: "Universum der Güte 🌌",
    peopleCount: "Personen, die $1 zahlten",
    countDescription: "Siehe, wie viele Personen dem Universum der Güte beitraten",
    paySee: "💙 $1 Zahlen - Sehen",
    leaveMessage: "✨ Nachricht Hinterlassen - $2",
    paySeeDesc: "$1 - Zähler ansehen",
    leaveMessageDesc: "$2 - Name und Nachricht hinterlassen",
    paySeeModal: "Zahlen & Sehen",
    paySeeModalDesc: "Zahle $1 um zu sehen, wie viele Personen dem Universum beitraten",
    leaveMessageModal: "Hinterlasse deine Nachricht",
    leaveMessageModalDesc: "Zahle $2 und teile deinen guten Wunsch mit der Welt",
    namePlaceholder: "Dein Name oder Spitzname",
    messagePlaceholder: "Deine gute Botschaft...",
    cancel: "Abbrechen",
    pay: "Zahlen",
    footer: "© 2024 Universum der Güte. Liebe auf der ganzen Welt verbreiten.",
  },
  zh: {
    title: "支付1美元，看看有多少人支付了1美元",
    subtitle: "看看有多少人支付了1美元",
    brand: "善良宇宙 🌌",
    peopleCount: "支付1美元的人们",
    countDescription: "看看有多少人加入了善良宇宙",
    paySee: "💙 支付1美元 - 查看",
    leaveMessage: "✨ 留言 - 2美元",
    paySeeDesc: "1美元 - 查看计数器",
    leaveMessageDesc: "2美元 - 留下您的姓名和留言",
    paySeeModal: "支付并查看",
    paySeeModalDesc: "支付1美元，看看有多少人加入了这个宇宙",
    leaveMessageModal: "留下您的留言",
    leaveMessageModalDesc: "支付2美元，与世界分享您的善良祝愿",
    namePlaceholder: "您的姓名或昵称",
    messagePlaceholder: "您的善良祝愿...",
    cancel: "取消",
    pay: "支付",
    footer: "© 2024 善良宇宙。将爱传播到全世界。",
  },
  hi: {
    title: "$1 भुगतान करें और देखें कितने लोगों ने $1 का भुगतान किया",
    subtitle: "देखें कितने लोगों ने $1 का भुगतान किया",
    brand: "दयालुता ब्रह्मांड ",
    peopleCount: "लोगों ने $1 का भुगतान किया",
    countDescription: "देखें कितने लोग दयालुता ब्रह्मांड में शामिल हुए",
    paySee: "💙 $1 का भुगतान - देखें",
    leaveMessage: "✨ संदेश छोड़ें - $2",
    paySeeDesc: "$1 - काउंटर देखें",
    leaveMessageDesc: "$2 - अपना नाम और संदेश छोड़ें",
    paySeeModal: "भुगतान करें और देखें",
    paySeeModalDesc: "$1 का भुगतान करें और देखें कितने लोग शामिल हुए",
    leaveMessageModal: "अपना संदेश छोड़ें",
    leaveMessageModalDesc: "$2 का भुगतान करें और अपनी शुभकामना साझा करें",
    namePlaceholder: "आपका नाम या उपनाम",
    messagePlaceholder: "आपकी दयालु संदेश...",
    cancel: "रद्द करें",
    pay: "भुगतान",
    footer: "© 2024 दयालुता ब्रह्मांड। दुनिया भर में प्रेम फैलाना।",
  },
  ar: {
    title: "ادفع دولارًا واحدًا لترى كم شخص دفع دولارًا واحدًا",
    subtitle: "لترى كم شخص دفع دولارًا واحدًا",
    brand: "كون اللطف 🌌",
    peopleCount: "الأشخاص الذين دفعوا دولارًا واحدًا",
    countDescription: "انظر كم شخص انضم إلى كون اللطف",
    paySee: " ادفع $1 - اعرض",
    leaveMessage: "✨ اترك رسالة - $2",
    paySeeDesc: "$1 - اعرض العداد",
    leaveMessageDesc: "$2 - اترك اسمك ورسالتك",
    paySeeModal: "ادفع واعرض",
    paySeeModalDesc: "ادفع دولارًا واحدًا لترى كم شخص انضم إلى الكون",
    leaveMessageModal: "اترك رسالتك",
    leaveMessageModalDesc: "ادفع دولارين وشارك أمنيتك اللطيفة مع العالم",
    namePlaceholder: "اسمك أو لقبك",
    messagePlaceholder: "رسالتك اللطيفة...",
    cancel: "إلغاء",
    pay: "ادفع",
    footer: "© 2024 كون اللطف. ننشر الحب في جميع أنحاء العالم.",
  },
};

// Language flags
const languageFlags = {
  en: "🇬",
  es: "🇪🇸",
  pt: "🇧🇷",
  fr: "🇫🇷",
  de: "🇩🇪",
  zh: "🇨",
  hi: "",
  ar: "🇸",
};

export default function Home() {
  const [count, setCount] = useState(2);
  const [messages, setMessages] = useState<string[]>([
    "Peace and love! 🌍",
    "Kindness matters! ❤️",
    "Spread the light! ✨",
    "Together we shine! 🌟",
    "Be the change! 🦋",
  ]);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [name, setName] = useState("");
  const [messageName, setMessageName] = useState("");
  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState("en");

  // Auto-detect language on mount
  useEffect(() => {
    const userLang = navigator.language || (navigator as any).userLanguage;
    const langCode = userLang.split("-")[0].toLowerCase();
    
    // Check if language is supported
    if (translations[langCode as keyof typeof translations]) {
      setLanguage(langCode);
    } else {
      setLanguage("en"); // Default to English
    }
  }, []);

  const t = translations[language as keyof typeof translations] || translations.en;

  const handleNameSubmit = () => {
    if (name.trim()) {
      alert(`Thank you ${name}! Payment system will be connected soon! 💚`);
      setShowNameModal(false);
      setName("");
    }
  };

  const handleMessageSubmit = () => {
    if (messageName.trim() && message.trim()) {
      alert(`Thank you ${messageName}! Your message will be added soon! ✨`);
      setShowMessageModal(false);
      setMessageName("");
      setMessage("");
    }
  };

  const switchLanguage = (lang: string) => {
    setLanguage(lang);
  };

  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Cosmic Background - Dark Space */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950">
        {/* Subtle cosmic glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-indigo-900/20 via-transparent to-purple-900/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Language Switcher - Visible */}
        <div className="absolute top-6 right-6 z-50 bg-white/10 backdrop-blur-lg rounded-full px-4 py-2 border border-white/20 shadow-lg">
          <div className="flex gap-3 items-center">
            <span className="text-white text-sm font-medium">Language:</span>
            <div className="flex gap-2">
              {Object.keys(translations).map((lang) => (
                <button
                  key={lang}
                  onClick={() => switchLanguage(lang)}
                  className={`text-xl transition-all duration-200 hover:scale-125 ${
                    language === lang ? "opacity-100 scale-125" : "opacity-40 hover:opacity-70"
                  }`}
                  title={lang.toUpperCase()}
                >
                  {languageFlags[lang as keyof typeof languageFlags]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Header - Viral Phrase */}
        <header className="text-center py-6 px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            {t.title}
          </h1>
          <p className="text-xl md:text-2xl text-white mb-2">
            {t.subtitle}
          </p>
          <p className="text-lg text-gray-300 mt-4">
            {t.brand}
          </p>
        </header>

        {/* Scrolling Messages */}
        <div className="bg-black/40 backdrop-blur-md py-3 overflow-hidden border-y border-white/10">
          <div className="flex animate-scroll whitespace-nowrap">
            {[...messages, ...messages].map((msg, index) => (
              <span key={index} className="mx-8 text-lg text-white font-medium">
                {msg}
              </span>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <section className="flex-grow flex flex-col justify-center items-center py-8 px-4">
          {/* Counter */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 text-center border border-white/30 shadow-2xl mb-6 w-full max-w-md">
            <p className="text-lg text-white mb-2 font-medium">{t.peopleCount}</p>
            <div className="text-6xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
              {count}
            </div>
            <p className="text-sm text-gray-300">
              {t.countDescription}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={() => setShowNameModal(true)}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-full text-base shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              {t.paySee}
            </button>
            <button
              onClick={() => setShowMessageModal(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-full text-base shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              {t.leaveMessage}
            </button>
          </div>

          {/* Explanation */}
          <div className="text-center text-sm text-gray-300 mt-6 max-w-md">
            <p className="mb-2">
              <span className="text-blue-400 font-bold">{t.paySeeDesc}</span>
            </p>
            <p>
              <span className="text-purple-400 font-bold">{t.leaveMessageDesc}</span>
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-3 text-gray-400 text-xs">
          <p>{t.footer}</p>
        </footer>
      </div>

      {/* Modal for Name */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-indigo-900 to-purple-900 rounded-2xl p-8 max-w-md w-full border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-center text-white">{t.paySeeModal}</h2>
            <p className="text-gray-300 mb-6 text-center">
              {t.paySeeModalDesc}
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowNameModal(false)}
                className="flex-1 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 transition-colors text-white"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleNameSubmit}
                className="flex-1 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-colors font-bold text-white"
              >
                {t.pay} $1
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Message */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-purple-900 to-pink-900 rounded-2xl p-8 max-w-md w-full border border-white/20 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-center text-white">{t.leaveMessageModal}</h2>
            <p className="text-gray-300 mb-6 text-center">
              {t.leaveMessageModalDesc}
            </p>
            
            {/* Name field */}
            <input
              type="text"
              value={messageName}
              onChange={(e) => setMessageName(e.target.value)}
              placeholder={t.namePlaceholder}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 mb-4 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            
            {/* Message field */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.messagePlaceholder}
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 mb-4 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowMessageModal(false)}
                className="flex-1 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 transition-colors text-white"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleMessageSubmit}
                className="flex-1 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 transition-colors font-bold text-white"
              >
                {t.pay} $2
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}