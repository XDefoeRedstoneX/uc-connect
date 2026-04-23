import { useLanguage } from "@/lib/language-context";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const isEnglish = language === "en";

  const toggleLanguage = () => {
    setLanguage(isEnglish ? "id" : "en");
  };

  return (
    <button
      type="button"
      className={`language-switcher ${isEnglish ? "is-en" : "is-id"}`}
      onClick={toggleLanguage}
      aria-label={isEnglish ? "Switch language to Indonesian" : "Switch language to English"}
      aria-pressed={isEnglish}
      title={isEnglish ? "Language: EN" : "Bahasa: ID"}
    >
      <span className="switcher-icon" aria-hidden="true">🌐</span>
      <span className="switcher-labels" aria-hidden="true">
        <span className={`switcher-label ${!isEnglish ? "active" : ""}`}>ID</span>
        <span className={`switcher-label ${isEnglish ? "active" : ""}`}>EN</span>
      </span>
      <span className="switcher-thumb" aria-hidden="true" />
    </button>
  );
}
