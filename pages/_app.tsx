import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { LanguageProvider } from "@/lib/language-context";
import { AuthProvider } from "@/lib/auth-context";
import ToastProvider from "@/components/ToastProvider";
import ConfirmProvider from "@/components/ConfirmProvider";
import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <div className={plusJakartaSans.variable}>
              <Component {...pageProps} />
            </div>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
