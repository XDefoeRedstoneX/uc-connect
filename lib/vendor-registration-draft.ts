export type VendorRegistrationDraft = {
  fullName: string;
  university: string;
  whatsappNumber: string;
  ktmFile: File;
};

type SerializedVendorRegistrationDraft = {
  fullName: string;
  university: string;
  whatsappNumber: string;
  ktmFile: {
    name: string;
    type: string;
    dataUrl: string;
  };
};

const STORAGE_KEY = "uc-connect-vendor-registration-draft";

function isBrowser() {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to serialize file."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to serialize file."));
    reader.readAsDataURL(file);
  });
}

async function dataUrlToFile(dataUrl: string, name: string, type: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], name, { type });
}

export async function saveVendorRegistrationDraft(draft: VendorRegistrationDraft) {
  if (!isBrowser()) {
    return;
  }

  const payload: SerializedVendorRegistrationDraft = {
    fullName: draft.fullName,
    university: draft.university,
    whatsappNumber: draft.whatsappNumber,
    ktmFile: {
      name: draft.ktmFile.name,
      type: draft.ktmFile.type,
      dataUrl: await fileToDataUrl(draft.ktmFile),
    },
  };

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export async function loadVendorRegistrationDraft(): Promise<VendorRegistrationDraft | null> {
  if (!isBrowser()) {
    return null;
  }

  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SerializedVendorRegistrationDraft;
    if (
      !parsed ||
      typeof parsed.fullName !== "string" ||
      typeof parsed.university !== "string" ||
      typeof parsed.whatsappNumber !== "string" ||
      !parsed.ktmFile ||
      typeof parsed.ktmFile.name !== "string" ||
      typeof parsed.ktmFile.type !== "string" ||
      typeof parsed.ktmFile.dataUrl !== "string"
    ) {
      return null;
    }

    const file = await dataUrlToFile(parsed.ktmFile.dataUrl, parsed.ktmFile.name, parsed.ktmFile.type);

    return {
      fullName: parsed.fullName,
      university: parsed.university,
      whatsappNumber: parsed.whatsappNumber,
      ktmFile: file,
    };
  } catch {
    return null;
  }
}

export function clearVendorRegistrationDraft() {
  if (!isBrowser()) {
    return;
  }

  sessionStorage.removeItem(STORAGE_KEY);
}
