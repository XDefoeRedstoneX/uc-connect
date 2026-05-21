import { useState, type InputHTMLAttributes } from "react";

type FormFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  error?: string | null;
  helpText?: string | null;
};

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  );
}

export default function FormField({ id, label, error, helpText, type, ...props }: FormFieldProps) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword && reveal ? "text" : type;

  return (
    <label htmlFor={id}>
      <span>{label}</span>
      {isPassword ? (
        <span style={{ position: "relative", display: "block" }}>
          <input id={id} type={effectiveType} {...props} style={{ ...props.style, paddingRight: "2.5rem" }} />
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            title={reveal ? "Sembunyikan" : "Tampilkan"}
            style={{
              position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", padding: 0, cursor: "pointer",
              color: "var(--muted)", display: "flex", alignItems: "center",
            }}
          >
            <EyeIcon off={reveal} />
          </button>
        </span>
      ) : (
        <input id={id} type={type} {...props} />
      )}
      {error && <p className="err">{error}</p>}
      {helpText && <p className="inline-note">{helpText}</p>}
    </label>
  );
}
