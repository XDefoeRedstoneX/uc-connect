import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Language } from "@/lib/translations";
import { translations } from "@/lib/translations";

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ mounted: boolean; language: Language }>({
    mounted: false,
    language: "id",
  });

  useEffect(() => {
    const stored = localStorage.getItem("language") as Language | null;
    const language = stored === "en" || stored === "id" ? stored : "id";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ mounted: true, language });
  }, []);

  const setLanguage = (lang: Language) => {
    setState((prev) => ({ ...prev, language: lang }));
    localStorage.setItem("language", lang);
  };

  const t = (path: string): string => {
    const parts = path.split(".");
    let current: unknown = translations[state.language];
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return path;
      }
    }
    return typeof current === "string" ? current : path;
  };

  if (!state.mounted) {
    return <>{children}</>;
  }

  return (
    <LanguageContext.Provider value={{ language: state.language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
