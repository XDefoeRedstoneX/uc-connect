import { useLanguage } from "@/lib/language-context";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="language-switcher" style={{ display: 'flex', alignItems: 'center' }}>
      <span className="switcher-icon" aria-hidden="true" style={{marginRight: '4px'}}>🌐</span>
      <select 
        value={language} 
        onChange={(e) => setLanguage(e.target.value as "en" | "id")}
        aria-label="Select language"
        className="language-select"
        style={{ border: 'none', background: 'transparent', cursor: 'pointer', outline: 'none', appearance: 'none', padding: '0 4px', fontWeight: 'bold' }}
      >
        <option value="id">ID</option>
        <option value="en">EN</option>
      </select>
    </div>
  );
}
