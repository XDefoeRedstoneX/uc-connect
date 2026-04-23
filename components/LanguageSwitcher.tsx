import { useLanguage } from "@/lib/language-context";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="language-switcher" role="group" aria-label="Language selection">
      <button
        type="button"
        className={`lang-btn ${language === "en" ? "active" : ""}`}
        onClick={() => setLanguage("en")}
        aria-label="Switch to English"
        aria-pressed={language === "en"}
        title="English"
      >
        🌐 EN
      </button>
      <button
        type="button"
        className={`lang-btn ${language === "id" ? "active" : ""}`}
        onClick={() => setLanguage("id")}
        aria-label="Beralih ke Bahasa Indonesia"
        aria-pressed={language === "id"}
        title="Bahasa Indonesia"
      >
        🌐 ID
      </button>
    </div>
  );
}
