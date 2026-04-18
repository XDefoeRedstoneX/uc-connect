import { FormEvent, useState } from "react";
import SiteLayout from "@/components/SiteLayout";

export default function SupportPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent("UC Connect Support Request");
    const body = encodeURIComponent(`From: ${email}\n\n${message}`);
    window.location.href = `mailto:support@uc-connect.local?subject=${subject}&body=${body}`;
    setStatus("Your email client has been opened.");
  }

  return (
    <SiteLayout title="Support | UC Connect">
      <section className="card">
        <h1>Support</h1>
        <form onSubmit={onSubmit} className="stack">
          <label>
            Contact email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label>
            Message
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} required />
          </label>
          <button type="submit">Contact support</button>
        </form>
        {status && <p className="ok">{status}</p>}
      </section>
    </SiteLayout>
  );
}
