"use client";

import { Fragment, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { compressAndResize } from "@/lib/compress-image";
import { isValidIndonesianPhone } from "@/lib/phone";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";

/** Compress to max 500KB for onboarding KTM uploads */
const compressImage = (f: File) => compressAndResize(f, 1200, 1200, 500);
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

const salesSystemOptions = ["ready-stock", "pre-order", "lainnya"] as const;
const deliveryMethodOptions = ["cod-kampus", "digital-delivery", "lainnya"] as const;
const SALES_SYSTEM_LABELS: Record<(typeof salesSystemOptions)[number], string> = {
  "ready-stock": "Ready Stock",
  "pre-order": "Pre-Order",
  lainnya: "Lainnya",
};
const DELIVERY_METHOD_LABELS: Record<(typeof deliveryMethodOptions)[number], string> = {
  "cod-kampus": "COD Kampus",
  "digital-delivery": "Digital Delivery",
  lainnya: "Lainnya",
};
const allowedKtmMimeTypes = ["image/png", "image/jpeg"] as const;
const maxKtmFileSizeBytes = 1 * 1024 * 1024;

// Canonical category list — must match TabEditProfile.tsx and explore filter chips
const CATEGORY_OPTIONS = [
  "Makanan & Minuman",
  "Jasa & Layanan",
  "Fashion",
  "Kreatif & Desain",
  "Elektronik",
  "Kesehatan & Kecantikan",
  "Lainnya",
] as const;

function isFileList(value: unknown): value is FileList {
  return typeof FileList !== "undefined" && value instanceof FileList;
}

const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 17 }, (_, i) => CURRENT_YEAR + 8 - i); // +8 … −8

const vendorOnboardingSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap wajib diisi").max(100, "Nama terlalu panjang"),
  university: z.string().min(2, "Asal universitas wajib diisi").max(120, "Asal universitas terlalu panjang"),
  major: z.string().min(2, "Jurusan wajib diisi").max(80, "Jurusan terlalu panjang"),
  graduationYear: z
    .number({ message: "Pilih tahun kelulusan" })
    .int()
    .min(CURRENT_YEAR - 8, "Tahun tidak valid")
    .max(CURRENT_YEAR + 8, "Tahun tidak valid"),
  whatsappNumber: z
    .string()
    .min(1, "Nomor WhatsApp wajib diisi — ini kontak utama pembeli")
    .refine(isValidIndonesianPhone, "Nomor WhatsApp tidak valid (contoh: 0812xxxxxxx)"),
  ktmFile: z
    .custom<File>((value): value is File => typeof File !== "undefined" && value instanceof File, {
      message: "Upload KTM wajib diisi",
    })
    .refine((file) => allowedKtmMimeTypes.includes(file.type as (typeof allowedKtmMimeTypes)[number]), "Format KTM harus PNG atau JPG")
    .refine((file) => file.size <= maxKtmFileSizeBytes, "Ukuran KTM maksimal 1 MB"),
  businessName: z.string().min(2, "Nama bisnis wajib diisi").max(120, "Nama bisnis terlalu panjang"),
  category: z.enum(CATEGORY_OPTIONS, {
    message: "Pilih kategori bisnis",
  }),
  description: z.string().min(10, "Deskripsi minimal 10 karakter").max(150, "Deskripsi maksimal 150 karakter"),
  salesSystem: z.enum(salesSystemOptions, {
    message: "Pilih sistem penjualan",
  }),
  deliveryMethod: z
    .array(z.enum(deliveryMethodOptions))
    .min(1, "Pilih minimal satu metode pengiriman"),
});

type VendorOnboardingValues = z.infer<typeof vendorOnboardingSchema>;

type VendorOnboardingWizardProps = {
  initialStep?: 1 | 2 | 3;
  initialValues?: Partial<VendorOnboardingValues>;
  onComplete?: (values: VendorOnboardingValues) => Promise<void> | void;
};

const stepFields: Record<1 | 2 | 3, (keyof VendorOnboardingValues)[]> = {
  1: ["fullName", "university", "major", "graduationYear", "whatsappNumber", "ktmFile"],
  2: ["businessName", "category", "description"],
  3: ["salesSystem", "deliveryMethod"],
};

const stepLabels = ["Verifikasi", "Profil Bisnis", "Operasional"];

const defaultValues: VendorOnboardingValues = {
  fullName: "",
  university: "",
  major: "",
  graduationYear: CURRENT_YEAR,
  whatsappNumber: "",
  ktmFile: undefined as unknown as File,
  businessName: "",
  category: "Makanan & Minuman",
  description: "",
  salesSystem: "ready-stock",
  deliveryMethod: [],
};

// Shared editorial field styling so labels/inputs/errors stay consistent with
// the rest of the dashboard forms (design tokens, not Tailwind utilities).
const labelStyle = { fontWeight: 600, fontSize: "0.88rem", color: "var(--muted)" } as const;
const inputStyle = { marginTop: "0.35rem", width: "100%" } as const;
const errStyle = { fontSize: "0.8rem", marginTop: "0.3rem" } as const;

export default function VendorOnboardingWizard({ initialStep = 1, initialValues, onComplete }: VendorOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(initialStep);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionMessage, setCompressionMessage] = useState<string | null>(null);
  // Track compression outcome explicitly instead of sniffing the message string.
  const [compressionOk, setCompressionOk] = useState(false);

  const mergedDefaultValues: VendorOnboardingValues = {
    ...defaultValues,
    ...initialValues,
    ktmFile: initialValues?.ktmFile ?? (undefined as unknown as File),
  };

  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VendorOnboardingValues>({
    resolver: zodResolver(vendorOnboardingSchema),
    defaultValues: mergedDefaultValues,
    mode: "onTouched",
  });

  async function handleNext() {
    const fields = stepFields[currentStep];
    const isStepValid = await trigger(fields, { shouldFocus: true });

    if (!isStepValid) {
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 3) as 1 | 2 | 3);
  }

  function handleBack() {
    setCurrentStep((prev) => Math.max(prev - 1, 1) as 1 | 2 | 3);
  }

  async function handleKtmFileChange(event: React.ChangeEvent<HTMLInputElement>, onChange: (value: File | undefined) => void) {
    setCompressionMessage(null);
    setCompressionOk(false);
    const file = event.target.files?.[0];
    if (!file) {
      onChange(undefined);
      return;
    }

    setIsCompressing(true);
    try {
      const originalSize = formatFileSize(file.size);
      if (file.size > 500 * 1024) {
        setCompressionMessage(`Mengompres file (${originalSize})...`);
        const compressedFile = await compressImage(file);
        const compressedSize = formatFileSize(compressedFile.size);
        const reduction = Math.round(((file.size - compressedFile.size) / file.size) * 100);
        setCompressionMessage(`File dikompres: ${originalSize} → ${compressedSize} (${reduction}% lebih kecil)`);
        setCompressionOk(true);
        onChange(compressedFile);
      } else {
        onChange(file);
      }
    } catch (error) {
      console.error("Compression error:", error);
      setCompressionMessage("Gagal mengompres file, menggunakan file asli.");
      setCompressionOk(false);
      onChange(file);
    } finally {
      setIsCompressing(false);
    }
  }

  const onSubmit = async (values: VendorOnboardingValues) => {
    await onComplete?.(values);
    setIsSubmitted(true);
    console.log("Vendor onboarding values:", values);
  };

  const descriptionValue = watch("description");
  const ktmFileValue = watch("ktmFile");

  return (
    <div>
      {/* Stepper */}
      <div style={{ marginBottom: "1.5rem" }}>
        <span className="kicker">
          <Icon name="store" size={14} strokeWidth={2.6} /> Langkah {currentStep} dari 3
        </span>
        <h2 className="display" style={{ fontSize: "var(--fs-h3)", margin: "0.4rem 0 1rem" }}>
          {stepLabels[currentStep - 1]}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {stepLabels.map((label, index) => {
            const stepNumber = (index + 1) as 1 | 2 | 3;
            const isActive = stepNumber === currentStep;
            const isComplete = stepNumber < currentStep;
            const on = isActive || isComplete;
            return (
              <Fragment key={label}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{
                    width: 30, height: 30, borderRadius: "50%",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.8rem", fontWeight: 800,
                    background: on ? "var(--pacific)" : "#fff",
                    color: on ? "#fff" : "var(--muted)",
                    border: `1.5px solid ${on ? "var(--pacific)" : "var(--border)"}`,
                    transition: "all 0.2s ease",
                  }}>
                    {isComplete ? <Icon name="check" size={15} strokeWidth={3} /> : stepNumber}
                  </span>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: isActive ? "var(--pacific-dark)" : "var(--muted)" }}>{label}</span>
                </div>
                {index < stepLabels.length - 1 && (
                  <span style={{ flex: 1, minWidth: "0.75rem", height: 2, background: "var(--border)" }} aria-hidden="true" />
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="stack" style={{ gap: "1.25rem" }}>
        <div className="stack" style={{ gap: "1rem", minHeight: "20rem" }}>
          {currentStep === 1 && (
            <div className="stack" style={{ gap: "0.9rem" }}>
              <label>
                <span style={labelStyle}>Nama Lengkap</span>
                <input id="fullName" {...register("fullName")} placeholder="Nama lengkap" style={inputStyle} />
                {errors.fullName && <p className="err" style={errStyle}>{errors.fullName.message}</p>}
              </label>

              <label>
                <span style={labelStyle}>Asal Universitas</span>
                <input id="university" {...register("university")} placeholder="Universitas" style={inputStyle} />
                {errors.university && <p className="err" style={errStyle}>{errors.university.message}</p>}
              </label>

              <label>
                <span style={labelStyle}>Jurusan / Program Studi</span>
                <input id="major" {...register("major")} placeholder="cth. Manajemen, Informatika" style={inputStyle} />
                {errors.major && <p className="err" style={errStyle}>{errors.major.message}</p>}
              </label>

              <label>
                <span style={labelStyle}>Tahun Kelulusan (perkiraan)</span>
                <select id="graduationYear" {...register("graduationYear", { valueAsNumber: true })} style={inputStyle}>
                  {GRAD_YEARS.map((y) => (
                    <option key={y} value={y}>{y}{y <= CURRENT_YEAR ? " (sudah/alumni)" : ""}</option>
                  ))}
                </select>
                <p style={{ marginTop: "0.3rem", fontSize: "0.78rem", color: "var(--muted)" }}>Boleh lulus tahun ini — kamu tetap bisa berjualan sebagai alumni.</p>
                {errors.graduationYear && <p className="err" style={errStyle}>{errors.graduationYear.message}</p>}
              </label>

              <label>
                <span style={labelStyle}>Nomor WhatsApp</span>
                <input id="whatsappNumber" {...register("whatsappNumber")} placeholder="08xxxxxxxxxx" style={inputStyle} />
                {errors.whatsappNumber && <p className="err" style={errStyle}>{errors.whatsappNumber.message}</p>}
              </label>

              <label>
                <span style={labelStyle}>Upload KTM</span>
                <Controller
                  control={control}
                  name="ktmFile"
                  render={({ field }) => (
                    <input
                      id="ktmFile"
                      type="file"
                      accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                      onChange={(event) => handleKtmFileChange(event, field.onChange)}
                      disabled={isCompressing}
                      style={{ ...inputStyle, padding: "0.6rem 0.75rem" }}
                    />
                  )}
                />
                {isCompressing && <p style={{ ...errStyle, color: "var(--pacific-dark)" }}>Sedang mengompres file...</p>}
                {compressionMessage && !isCompressing && (
                  <p style={{ ...errStyle, display: "flex", alignItems: "center", gap: "0.3rem", color: compressionOk ? "#16a34a" : "var(--orange-dark)" }}>
                    {compressionOk && <Icon name="check" size={13} strokeWidth={3} />} {compressionMessage}
                  </p>
                )}
                {ktmFileValue && (
                  <p style={{ marginTop: "0.3rem", fontSize: "0.8rem", color: "var(--muted)" }}>File terpilih: {ktmFileValue.name} ({formatFileSize(ktmFileValue.size)})</p>
                )}
                {errors.ktmFile && <p className="err" style={errStyle}>{errors.ktmFile.message as string}</p>}
                <p style={{ marginTop: "0.4rem", fontSize: "0.8rem", color: "var(--muted)" }}>
                  File KTM akan dipakai sebagai verifikasi mahasiswa. Pastikan file yang diunggah jelas dan sesuai dengan ketentuan (PNG/JPG, maksimal 1 MB).
                </p>
              </label>
            </div>
          )}

          {currentStep === 2 && (
            <div className="stack" style={{ gap: "0.9rem" }}>
              <label>
                <span style={labelStyle}>Nama Bisnis</span>
                <input id="businessName" {...register("businessName")} placeholder="Nama usaha" style={inputStyle} />
                {errors.businessName && <p className="err" style={errStyle}>{errors.businessName.message}</p>}
              </label>

              <label>
                <span style={labelStyle}>Kategori</span>
                <select id="category" {...register("category")} style={inputStyle}>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {errors.category && <p className="err" style={errStyle}>{errors.category.message}</p>}
              </label>

              <label>
                <span style={labelStyle}>Deskripsi</span>
                <textarea id="description" {...register("description")} maxLength={150} rows={4}
                  placeholder="Jelaskan bisnis kamu secara singkat" style={inputStyle} />
                <div style={{ marginTop: "0.3rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", fontSize: "0.8rem", color: "var(--muted)" }}>
                  {errors.description ? <span className="err" style={{ margin: 0 }}>{errors.description.message}</span> : <span>Maks 150 karakter</span>}
                  <span>{descriptionValue.length}/150</span>
                </div>
              </label>
            </div>
          )}

          {currentStep === 3 && (
            <div className="stack" style={{ gap: "1.25rem" }}>
              <div>
                <p style={{ ...labelStyle, marginBottom: "0.6rem" }}>Sistem Penjualan</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.6rem" }}>
                  {salesSystemOptions.map((option) => (
                    <label key={option} style={{ display: "flex", alignItems: "center", gap: "0.6rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", padding: "0.7rem 0.9rem", cursor: "pointer" }}>
                      <input type="radio" value={option} {...register("salesSystem")} style={{ width: "1rem", height: "1rem", accentColor: "var(--pacific)" }} />
                      <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{SALES_SYSTEM_LABELS[option]}</span>
                    </label>
                  ))}
                </div>
                {errors.salesSystem && <p className="err" style={errStyle}>{errors.salesSystem.message}</p>}
              </div>

              <div>
                <p style={{ ...labelStyle, marginBottom: "0.6rem" }}>Metode Pengiriman</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.6rem" }}>
                  {deliveryMethodOptions.map((option) => (
                    <label key={option} style={{ display: "flex", alignItems: "center", gap: "0.6rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", padding: "0.7rem 0.9rem", cursor: "pointer" }}>
                      <Controller
                        control={control}
                        name="deliveryMethod"
                        render={({ field }) => (
                          <input
                            type="checkbox"
                            checked={field.value.includes(option)}
                            onChange={(event) => {
                              if (event.target.checked) {
                                field.onChange([...field.value, option]);
                              } else {
                                field.onChange(field.value.filter((item) => item !== option));
                              }
                            }}
                            style={{ width: "1rem", height: "1rem", accentColor: "var(--pacific)" }}
                          />
                        )}
                      />
                      <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{DELIVERY_METHOD_LABELS[option]}</span>
                    </label>
                  ))}
                </div>
                {errors.deliveryMethod && <p className="err" style={errStyle}>{errors.deliveryMethod.message}</p>}
              </div>
            </div>
          )}
        </div>

        {isSubmitted && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", borderRadius: "var(--radius-md)", border: "1px solid #bbf7d0", background: "#f0fdf4", padding: "0.75rem 1rem", fontSize: "0.88rem", fontWeight: 600, color: "#166534" }}>
            <Icon name="check-circle" size={16} strokeWidth={2.4} /> Pendaftaran vendor berhasil dikirim.
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <Button type="button" variant="ghost" icon="arrow-left" onClick={handleBack} disabled={currentStep === 1 || isSubmitting}>
            Kembali
          </Button>

          {currentStep < 3 ? (
            <Button type="button" iconRight="arrow-right" onClick={() => void handleNext()} disabled={isSubmitting}>
              Selanjutnya
            </Button>
          ) : (
            <Button type="submit" icon="check" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Selesai"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
