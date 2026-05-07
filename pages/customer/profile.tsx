
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

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
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
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex items-center gap-4 text-gray-700">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 shadow-sm">
              <UserIcon />
            </span>
          </div>

          <div className="flex items-center gap-4">
            {!isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Edit Profil
                </button>
              </>
            ) : (
              <>
                <button
                  type="submit"
                  form="profile-settings-form"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? t("pages.editProfile.savingProfile") : t("pages.editProfile.saveBtn")}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                  {t("pages.editProfile.cancelBtn") || "Cancel"}
                </button>
              </>) }
              <button type="button" className="inline-flex items-center gap-2 rounded-md bg-red-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-700" onClick={logout}><ExitIcon /> {t("pages.profile.logout")}</button>
          </div>
        </header>

        <section className="rounded-lg border border-gray-200 bg-white px-6 py-6 shadow-sm sm:px-10 sm:py-8">
          <form id="profile-settings-form" onSubmit={onSubmit} className="space-y-6">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

              <div className="mx-auto h-36 w-36 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100 shadow-md sm:mx-0">
                {displayAvatarUrl ? (
                  <img
                    src={displayAvatarUrl}
                    alt={`${profile?.full_name ?? t("pages.profile.notSet")} avatar`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-gray-400">
                    {(profile?.full_name ?? "U").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

                <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
                <h2 className="text-3xl font-semibold text-gray-900">{profile?.full_name ?? t("pages.profile.notSet")}</h2>
                <p className="text-base text-blue-600">{userEmail || profile?.username || t("pages.profile.notSet")}</p>
                <p className="text-base text-gray-500">{currentTitle === "vendor" ? t("pages.editProfile.vendorAccount") : t("pages.editProfile.customerAccount")}</p>

                  {isEditing && (
                    <>
                      <p className="mt-2 text-sm text-gray-400">{t("pages.editProfile.avatarHint")}</p>

                      <div
                      role="button"
                      tabIndex={0}
                      onClick={() => { openFilePicker(); }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openFilePicker();
                        }
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setDragActive(false);
                        handleAvatarChange(event.dataTransfer.files?.[0] ?? null);
                      }}
                      className={[
                        "mt-3 flex min-h-28 w-full cursor-pointer items-center justify-center rounded-md border-2 border-dashed px-6 py-8 text-center transition",
                        dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50",
                      ].join(" ")}
                    >
                      <span className="text-sm font-medium text-gray-500 sm:text-base">{t("pages.editProfile.dropzone")}</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(event) => handleAvatarChange(event.target.files?.[0] ?? null)}
                      />
                    </div>

                      {avatarFile && <p className="mt-2 text-sm font-medium text-blue-600">{avatarFile.name}</p>}
                    </>
                  )}
              </div>
            </div>

            <div className="pt-4">
              <h3 className="text-xl font-semibold text-gray-800">{t("pages.editProfile.accountTitle")}</h3>
              <hr className="mt-4 border-gray-200" />
            </div>

            <div className="space-y-5 pt-2">
              <div className="grid gap-3 lg:grid-cols-[25%_1fr] lg:items-center lg:gap-8 pb-4">
                <label className="text-sm font-medium text-gray-700" htmlFor="username">
                  {t("pages.editProfile.username")}
                </label>
                <input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  readOnly={!isEditing}
                  className={`w-full rounded-md border border-gray-300 px-4 py-2.5 outline-none transition ${
                    isEditing ? "focus:border-blue-500 focus:ring-2 focus:ring-blue-100" : "bg-gray-50 text-gray-500"
                  }`}
                />
              </div>

              <div className="grid gap-3 lg:grid-cols-[25%_1fr] lg:items-center lg:gap-8 pb-4">
                <label className="text-sm font-medium text-gray-700" htmlFor="email">
                  {t("pages.editProfile.email")}
                </label>
                <input
                  id="email"
                  value={userEmail}
                  readOnly
                  className="w-full rounded-md border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-500 outline-none"
                />
              </div>

              <div className="grid gap-3 lg:grid-cols-[25%_1fr] lg:items-center lg:gap-8 pb-4">
                <label className="text-sm font-medium text-gray-700" htmlFor="fullName">
                  {t("pages.editProfile.fullName")}
                </label>
                <input
                  id="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  readOnly={!isEditing}
                  className={`w-full rounded-md border border-gray-300 px-4 py-2.5 outline-none transition ${
                    isEditing ? "focus:border-blue-500 focus:ring-2 focus:ring-blue-100" : "bg-gray-50 text-gray-500"
                  }`}
                />
              </div>

              <div className="grid gap-2 lg:grid-cols-[25%_1fr] lg:gap-8 lg:items-center pb-4">
                <label className="text-sm font-medium text-gray-700" htmlFor="language">
                  {t("pages.editProfile.language")}
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as "id" | "en")}
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="id">{t("pages.editProfile.languageOptions.id")}</option>
                  <option value="en">{t("pages.editProfile.languageOptions.en")}</option>
                </select>
              </div>
            </div>
          </form>

          {message && <p className="mt-4 text-sm font-medium text-green-700">{message}</p>}
          {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
        </section>

        {profile?.role !== "vendor" && (
          <div className="flex justify-start pl-1 pt-2">
            <button
              type="button"
              onClick={() => void router.push("/vendor/onboarding")}
              className="inline-flex rounded-md bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
            >
              {t("pages.editProfile.becomeVendor")}
            </button>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};
