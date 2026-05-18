"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { compressAndResize } from "@/lib/compress-image";

/** Compress to max 500KB for onboarding KTM uploads */
const compressImage = (f: File) => compressAndResize(f, 1200, 1200, 500);
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

const salesSystemOptions = ["ready-stock", "pre-order"] as const;
const deliveryMethodOptions = ["cod-kampus", "digital-delivery"] as const;
const allowedKtmMimeTypes = ["image/png", "image/jpeg"] as const;
const maxKtmFileSizeBytes = 1 * 1024 * 1024;

function isFileList(value: unknown): value is FileList {
  return typeof FileList !== "undefined" && value instanceof FileList;
}

const vendorOnboardingSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap wajib diisi").max(100, "Nama terlalu panjang"),
  university: z.string().min(2, "Asal universitas wajib diisi").max(120, "Asal universitas terlalu panjang"),
  whatsappNumber: z
    .string()
    .min(8, "Nomor WhatsApp tidak valid")
    .max(20, "Nomor WhatsApp terlalu panjang")
    .regex(/^[0-9+()\-\s]+$/, "Nomor WhatsApp tidak valid"),
  ktmFile: z
    .custom<File>((value): value is File => typeof File !== "undefined" && value instanceof File, {
      message: "Upload KTM wajib diisi",
    })
    .refine((file) => allowedKtmMimeTypes.includes(file.type as (typeof allowedKtmMimeTypes)[number]), "Format KTM harus PNG atau JPG")
    .refine((file) => file.size <= maxKtmFileSizeBytes, "Ukuran KTM maksimal 1 MB"),
  businessName: z.string().min(2, "Nama bisnis wajib diisi").max(120, "Nama bisnis terlalu panjang"),
  category: z.enum(["Makanan", "Jasa", "Kebutuhan"], {
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
  1: ["fullName", "university", "whatsappNumber", "ktmFile"],
  2: ["businessName", "category", "description"],
  3: ["salesSystem", "deliveryMethod"],
};

const stepLabels = ["Verifikasi", "Profil Bisnis", "Operasional"];

const defaultValues: VendorOnboardingValues = {
  fullName: "",
  university: "",
  whatsappNumber: "",
  ktmFile: undefined as unknown as File,
  businessName: "",
  category: "Makanan",
  description: "",
  salesSystem: "ready-stock",
  deliveryMethod: [],
};

export default function VendorOnboardingWizard({ initialStep = 1, initialValues, onComplete }: VendorOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(initialStep);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionMessage, setCompressionMessage] = useState<string | null>(null);

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
        setCompressionMessage(`✓ File dikompres: ${originalSize} → ${compressedSize} (${reduction}% lebih kecil)`);
        onChange(compressedFile);
      } else {
        onChange(file);
      }
    } catch (error) {
      console.error("Compression error:", error);
      setCompressionMessage("Gagal mengompres file, menggunakan file asli.");
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
    <section className="w-full max-w-3xl mx-auto">
      <div className="rounded-xl bg-white p-6 shadow-md transition-all duration-300">
        <div className="mb-6 space-y-3">
          <p className="text-sm font-semibold text-gray-500">
            Step {currentStep} of 3: {stepLabels[currentStep - 1]}
          </p>
          <div className="flex items-center gap-3 text-sm font-medium">
            {stepLabels.map((label, index) => {
              const stepNumber = (index + 1) as 1 | 2 | 3;
              const isActive = stepNumber === currentStep;
              const isComplete = stepNumber < currentStep;

              return (
                <div key={label} className="flex items-center gap-2">
                  <span
                    className={[
                      "inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-colors",
                      isActive
                        ? "border-(--brand-orange) bg-(--brand-orange) text-white"
                        : isComplete
                          ? "border-(--brand-orange) bg-orange-50 text-(--brand-orange)"
                          : "border-gray-300 bg-white text-gray-400",
                    ].join(" ")}
                  >
                    {stepNumber}
                  </span>
                  <span
                    className={[
                      "transition-colors",
                      isActive ? "text-(--brand-orange)" : "text-gray-400",
                    ].join(" ")}
                  >
                    {label}
                  </span>
                  {index < stepLabels.length - 1 && (
                    <span className="h-px w-8 bg-gray-200" aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="min-h-80 space-y-5 transition-all duration-300">
            {currentStep === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="fullName">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    {...register("fullName")}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-(--brand-orange) focus:ring-2 focus:ring-orange-100"
                    placeholder="Nama lengkap"
                  />
                  {errors.fullName && <p className="mt-2 text-sm text-red-600">{errors.fullName.message}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="university">
                    Asal Universitas
                  </label>
                  <input
                    id="university"
                    {...register("university")}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-(--brand-orange) focus:ring-2 focus:ring-orange-100"
                    placeholder="Universitas"
                  />
                  {errors.university && <p className="mt-2 text-sm text-red-600">{errors.university.message}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="whatsappNumber">
                    WhatsApp Number
                  </label>
                  <input
                    id="whatsappNumber"
                    {...register("whatsappNumber")}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-(--brand-orange) focus:ring-2 focus:ring-orange-100"
                    placeholder="08xxxxxxxxxx"
                  />
                  {errors.whatsappNumber && (
                    <p className="mt-2 text-sm text-red-600">{errors.whatsappNumber.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="ktmFile">
                    Upload KTM
                  </label>
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
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-md file:border-0 file:bg-orange-50 file:px-4 file:py-2 file:font-semibold file:text-(--brand-orange) focus:border-(--brand-orange) focus:ring-2 focus:ring-orange-100 disabled:opacity-50"
                      />
                    )}
                  />
                  {isCompressing && <p className="mt-2 text-sm text-blue-600">Sedang mengompres file...</p>}
                  {compressionMessage && !isCompressing && (
                    <p className={`mt-2 text-sm ${compressionMessage.includes("✓") ? "text-green-600" : "text-orange-600"}`}>
                      {compressionMessage}
                    </p>
                  )}
                  {ktmFileValue && (
                    <p className="mt-2 text-sm text-gray-500">File terpilih: {ktmFileValue.name} ({formatFileSize(ktmFileValue.size)})</p>
                  )}
                  {errors.ktmFile && <p className="mt-2 text-sm text-red-600">{errors.ktmFile.message as string}</p>}
                  <p className="mt-2 text-sm text-gray-500">
                    File KTM akan dipakai sebagai verifikasi mahasiswa. Pastikan file yang diunggah jelas dan sesuai dengan ketentuan (PNG/JPG, maksimal 1 MB).
                  </p>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="businessName">
                    Business Name
                  </label>
                  <input
                    id="businessName"
                    {...register("businessName")}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-(--brand-orange) focus:ring-2 focus:ring-orange-100"
                    placeholder="Nama usaha"
                  />
                  {errors.businessName && (
                    <p className="mt-2 text-sm text-red-600">{errors.businessName.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="category">
                    Category
                  </label>
                  <select
                    id="category"
                    {...register("category")}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-(--brand-orange) focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="Makanan">Makanan</option>
                    <option value="Jasa">Jasa</option>
                    <option value="Kebutuhan">Kebutuhan</option>
                  </select>
                  {errors.category && <p className="mt-2 text-sm text-red-600">{errors.category.message}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="description">
                    Description
                  </label>
                  <textarea
                    id="description"
                    {...register("description")}
                    maxLength={150}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-(--brand-orange) focus:ring-2 focus:ring-orange-100"
                    placeholder="Jelaskan bisnis kamu secara singkat"
                  />
                  <div className="mt-2 flex items-center justify-between gap-4 text-sm text-gray-500">
                    {errors.description ? (
                      <p className="text-red-600">{errors.description.message}</p>
                    ) : (
                      <p>Max 150 characters</p>
                    )}
                    <p>{descriptionValue.length}/150</p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <p className="mb-3 block text-sm font-semibold text-gray-700">Sales System</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {salesSystemOptions.map((option) => (
                      <label
                        key={option}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 transition hover:border-(--brand-orange)"
                      >
                        <input
                          type="radio"
                          value={option}
                          {...register("salesSystem")}
                          className="h-4 w-4 accent-(--brand-orange)"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {option === "ready-stock" ? "Ready Stock" : "Pre-Order"}
                        </span>
                      </label>
                    ))}
                  </div>
                  {errors.salesSystem && <p className="mt-2 text-sm text-red-600">{errors.salesSystem.message}</p>}
                </div>

                <div>
                  <p className="mb-3 block text-sm font-semibold text-gray-700">Delivery Method</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {deliveryMethodOptions.map((option) => {
                      return (
                        <label
                          key={option}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 transition hover:border-(--brand-orange)"
                        >
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
                                className="h-4 w-4 rounded border-gray-300 text-(--brand-orange) focus:ring-(--brand-orange)"
                              />
                            )}
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {option === "cod-kampus" ? "COD Kampus" : "Digital Delivery"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {errors.deliveryMethod && (
                    <p className="mt-2 text-sm text-red-600">{errors.deliveryMethod.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {isSubmitted && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              Pendaftaran vendor berhasil dikirim.
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1 || isSubmitting}
              className="rounded-lg px-4 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Kembali
            </button>

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => void handleNext()}
                disabled={isSubmitting}
                className="rounded-lg bg-(--brand-orange) px-5 py-3 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Selanjutnya
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-(--brand-orange) px-5 py-3 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Menyimpan..." : "Selesai"}
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
