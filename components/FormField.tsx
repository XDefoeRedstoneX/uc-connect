import type { InputHTMLAttributes } from "react";

type FormFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  error?: string | null;
  helpText?: string | null;
};

export default function FormField({ id, label, error, helpText, ...props }: FormFieldProps) {
  return (
    <label htmlFor={id}>
      <span>{label}</span>
      <input id={id} {...props} />
      {error && <p className="err">{error}</p>}
      {helpText && <p className="inline-note">{helpText}</p>}
    </label>
  );
}
