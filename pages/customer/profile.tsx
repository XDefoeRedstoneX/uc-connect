
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import SiteLayout from "@/components/SiteLayout";
import { useLanguage } from "@/lib/language-context";
import { toPublicPageErrorMessage } from "@/lib/public-errors";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { uploadProfileAvatar, compressImage } from "@/lib/profile-image-upload";
import { UserProfile } from "@/types/domain";

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ExitIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function CustomerProfilePage() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [major, setMajor] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const currentTitle = profile?.role ?? "customer";
  const displayAvatarUrl = useMemo(() => avatarPreviewUrl ?? profile?.avatar_url ?? null, [avatarPreviewUrl, profile?.avatar_url]);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleAvatarChange(file: File | null) {
    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl(null);
    }

    if (file) {
      const processFile = async () => {
        try {
          const compressedFile = await compressImage(file);
          setAvatarFile(compressedFile);
          setAvatarPreviewUrl(URL.createObjectURL(compressedFile));
        } catch (error) {
          setError(error instanceof Error ? error.message : "Failed to process image");
        }
      };
      void processFile();
    } else {
      setAvatarFile(null);
    }
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreviewUrl(null);
    setUsername(profile?.username ?? "");
    setFullName(profile?.full_name ?? "");
    setMessage(null);
    setError(null);
  }

  useEffect(() => {
    const load = async () => {
      setError(null);
      setLoading(true);

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        window.location.href = "/auth/login";
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        window.location.href = "/auth/login";
        return;
      }

      const { data: userData } = await supabase.auth.getUser(token);
      const currentEmail = userData.user?.email ?? "";
      setUserEmail(currentEmail);
      setUserId(userData.user?.id ?? null);

      const response = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.profile) {
        window.location.href = "/auth/login";
        return;
      }

      setProfile(data.profile);
      setUsername(data.profile.username ?? "");
      setFullName(data.profile.full_name ?? "");
      setMajor(data.profile.major ?? "");
      setGraduationYear(data.profile.graduation_year ? String(data.profile.graduation_year) : "");
      setLoading(false);
    };

    void load();
  }, [t]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setIsSaving(true);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      window.location.href = "/auth/login";
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }

    let avatarUrl = profile?.avatar_url ?? null;
    if (avatarFile) {
      const currentUserId = userId ?? (await supabase.auth.getUser(token)).data.user?.id ?? null;
      if (!currentUserId) {
        setError(t("errors.sessionExpired"));
        setIsSaving(false);
        return;
      }

      try {
        avatarUrl = await uploadProfileAvatar(supabase, currentUserId, avatarFile);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Gagal mengunggah foto profil.");
        setIsSaving(false);
        return;
      }
    }

    const normalizedUsername = username.trim();
    const normalizedFullName = fullName.trim();

    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username: normalizedUsername,
        full_name: normalizedFullName,
        phone: profile?.phone ?? "",
        avatar_url: avatarUrl ?? "",
        major: major.trim() || null,
        graduation_year: graduationYear ? Number(graduationYear) : null,
      }),
    });

    const json = await response.json();
    if (!response.ok) {
      setError(toPublicPageErrorMessage(json.error));
      setIsSaving(false);
      return;
    }

    setProfile(json.profile ?? profile);
    setAvatarFile(null);
    setMessage(t("pages.editProfile.successMsg"));
    setIsSaving(false);
  }

  function normalizeIndonesianPhoneToLocal(phoneRaw: string): { phone: string | null; error: string | null } {
    const trimmed = phoneRaw.trim();
    if (!trimmed) return { phone: null, error: null };

    let cleaned = trimmed.replace(/[\s\-()]/g, "");
    cleaned = cleaned.replace(/[^0-9+]/g, "");

    if (cleaned.startsWith("+")) {
      if (!cleaned.startsWith("+62")) {
        return { phone: null, error: t("pages.register.errors.phoneRequired") };
      }
      cleaned = `0${cleaned.slice(3)}`;
    } else if (cleaned.startsWith("62")) {
      cleaned = `0${cleaned.slice(2)}`;
    } else if (cleaned.startsWith("8")) {
      cleaned = `0${cleaned}`;
    } else if (!cleaned.startsWith("0")) {
      return { phone: null, error: t("pages.register.errors.phoneInvalidFormat") };
    }

    if (!/^\d+$/.test(cleaned)) {
      return { phone: null, error: t("pages.register.errors.phoneOnlyDigits") };
    }

    if (cleaned.length < 10 || cleaned.length > 13) {
      return { phone: null, error: t("pages.register.errors.phoneInvalidLength") };
    }

    return { phone: cleaned, error: null };
  }

  const phonePreview = normalizeIndonesianPhoneToLocal(profile?.phone ?? "");
  const languageLabel = language === "id" ? t("pages.editProfile.languageOptions.id") : t("pages.editProfile.languageOptions.en");

  async function logout() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  return (
    <SiteLayout title={`${t("pages.editProfile.pageTitle")} | UC Connect`}>
      <div className="stack" style={{ gap: '1.25rem', maxWidth: '52rem', margin: '0 auto', marginTop: 0 }}>
        {/* Header bar */}
        <header className="profile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '2.75rem', height: '2.75rem', borderRadius: '50%', background: 'var(--pacific-soft)', color: 'var(--pacific-dark)' }}>
              <UserIcon />
            </span>
          </div>

          <div className="row-wrap" style={{ gap: '0.5rem' }}>
            {!isEditing ? (
              <button type="button" onClick={() => setIsEditing(true)}>
                Edit Profil
              </button>
            ) : (
              <>
                <button type="submit" form="profile-settings-form" disabled={isSaving}>
                  {isSaving ? t("pages.editProfile.savingProfile") : t("pages.editProfile.saveBtn")}
                </button>
                <button type="button" className="ghost" onClick={handleCancelEdit}>
                  {t("pages.editProfile.cancelBtn") || "Cancel"}
                </button>
              </>
            )}
            <button type="button" style={{ background: 'var(--error)' }} onClick={logout}>
              <ExitIcon /> {t("pages.profile.logout")}
            </button>
          </div>
        </header>

        {/* Profile form */}
        <section className="profile-form">
          <form id="profile-settings-form" onSubmit={onSubmit}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
              <div className="profile-avatar">
                {displayAvatarUrl ? (
                  <img
                    src={displayAvatarUrl}
                    alt={`${profile?.full_name ?? t("pages.profile.notSet")} avatar`}
                  />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {(profile?.full_name ?? "U").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

              <div style={{ flex: 1, textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>{profile?.full_name ?? t("pages.profile.notSet")}</h2>
                <p style={{ color: 'var(--pacific-dark)', fontWeight: 500 }}>{userEmail || profile?.username || t("pages.profile.notSet")}</p>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                  {currentTitle === "vendor" ? t("pages.editProfile.vendorAccount") : t("pages.editProfile.customerAccount")}
                </p>

                {isEditing && (
                  <>
                    <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--muted)' }}>{t("pages.editProfile.avatarHint")}</p>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={openFilePicker}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openFilePicker();
                        }
                      }}
                      onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={(event) => { event.preventDefault(); setDragActive(false); handleAvatarChange(event.dataTransfer.files?.[0] ?? null); }}
                      className={`dropzone${dragActive ? ' active' : ''}`}
                      style={{ marginTop: '0.75rem' }}
                    >
                      <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--muted)' }}>{t("pages.editProfile.dropzone")}</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                        style={{ display: 'none' }}
                        onChange={(event) => handleAvatarChange(event.target.files?.[0] ?? null)}
                      />
                    </div>
                    {avatarFile && <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--pacific-dark)' }}>{avatarFile.name}</p>}
                  </>
                )}
              </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>{t("pages.editProfile.accountTitle")}</h3>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.75rem 0' }} />
            </div>

            <div className="stack" style={{ gap: '0.25rem', marginTop: '0.5rem' }}>
              <div className="profile-field">
                <label htmlFor="username">{t("pages.editProfile.username")}</label>
                <input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  readOnly={!isEditing}
                  style={!isEditing ? { background: 'var(--bg)', color: 'var(--muted)' } : {}}
                />
              </div>

              <div className="profile-field">
                <label htmlFor="email">{t("pages.editProfile.email")}</label>
                <input id="email" value={userEmail} readOnly style={{ background: 'var(--bg)', color: 'var(--muted)' }} />
              </div>

              <div className="profile-field">
                <label htmlFor="fullName">{t("pages.editProfile.fullName")}</label>
                <input
                  id="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  readOnly={!isEditing}
                  style={!isEditing ? { background: 'var(--bg)', color: 'var(--muted)' } : {}}
                />
              </div>

              <div className="profile-field">
                <label htmlFor="major">Jurusan / Program Studi</label>
                <input
                  id="major"
                  value={major}
                  onChange={(event) => setMajor(event.target.value)}
                  readOnly={!isEditing}
                  placeholder="cth. Manajemen"
                  style={!isEditing ? { background: 'var(--bg)', color: 'var(--muted)' } : {}}
                />
              </div>

              <div className="profile-field">
                <label htmlFor="graduationYear">Tahun Kelulusan</label>
                <input
                  id="graduationYear"
                  type="number"
                  value={graduationYear}
                  onChange={(event) => setGraduationYear(event.target.value)}
                  readOnly={!isEditing}
                  placeholder="cth. 2026"
                  style={!isEditing ? { background: 'var(--bg)', color: 'var(--muted)' } : {}}
                />
              </div>

              <div className="profile-field">
                <label htmlFor="language">{t("pages.editProfile.language")}</label>
                <select
                  id="language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as "id" | "en")}
                >
                  <option value="id">{t("pages.editProfile.languageOptions.id")}</option>
                  <option value="en">{t("pages.editProfile.languageOptions.en")}</option>
                </select>
              </div>
            </div>
          </form>

          {message && <p className="ok">{message}</p>}
          {error && <p className="err">{error}</p>}
        </section>

        {profile?.role !== "vendor" && (
          <div style={{ paddingLeft: '0.25rem' }}>
            <button type="button" onClick={() => void router.push("/vendor/onboarding")}>
              {t("pages.editProfile.becomeVendor")}
            </button>
          </div>
        )}

        {/* Quick links */}
        <div style={{ paddingLeft: '0.25rem', marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" className="ghost" onClick={() => void router.push("/customer/favorites")}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            ❤️ Vendor Favorit
          </button>
          <button type="button" className="ghost" onClick={() => void router.push("/customer/reviews")}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            ⭐ Ulasan Saya
          </button>
          <button type="button" className="ghost" onClick={() => void router.push("/customer/threads")}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            💬 Diskusi Saya
          </button>
        </div>

        <DangerZone />
      </div>
    </SiteLayout>
  );
}

function DangerZone() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function deleteAccount() {
    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Layanan tidak tersedia");
      const { data: sd } = await supabase.auth.getSession();
      const token = sd.session?.access_token;
      if (!token) throw new Error("Sesi tidak ditemukan");

      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirm: "HAPUS" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Gagal menghapus akun");
      }
      await supabase.auth.signOut();
      await router.replace("/");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menghapus akun");
      setSubmitting(false);
    }
  }

  return (
    <section style={{ marginTop: "2rem", padding: "1rem", border: "1.5px solid var(--error)", borderRadius: "var(--radius-md)", background: "rgba(239,68,68,0.04)" }}>
      <h3 style={{ margin: "0 0 0.35rem", color: "var(--error)", fontSize: "1rem" }}>⚠️ Zona Bahaya</h3>
      <p className="muted" style={{ margin: "0 0 0.75rem", fontSize: "0.85rem" }}>
        Menghapus akun bersifat permanen. Semua thread forum, balasan, ulasan, dan toko yang kamu miliki akan dihapus.
      </p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          style={{ background: "var(--error)", fontSize: "0.85rem" }}>
          🗑 Hapus Akun
        </button>
      ) : (
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <p style={{ margin: 0, fontSize: "0.85rem" }}>Ketik <strong>HAPUS</strong> untuk konfirmasi:</p>
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="HAPUS" />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="ghost" onClick={() => { setOpen(false); setConfirmText(""); }}>Batal</button>
            <button type="button" disabled={submitting || confirmText !== "HAPUS"} onClick={() => void deleteAccount()}
              style={{ background: "var(--error)" }}>
              {submitting ? "Menghapus…" : "Hapus Permanen"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
