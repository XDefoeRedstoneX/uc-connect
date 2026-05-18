import type { SupabaseClient } from "@supabase/supabase-js";

const avatarBucket = "avatars";
const MAX_FILE_SIZE = 500 * 1024; // 500KB in bytes
const COMPRESSION_QUALITY = 0.8; // 80% quality

function buildAvatarPath(userId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `${userId}/${crypto.randomUUID()}-${safeName}`;
}

export async function compressImage(file: File): Promise<File> {
  if (file.size <= MAX_FILE_SIZE) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Scale down if image is very large
        const maxDimension = 1200;
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Unable to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Unable to compress image"));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          COMPRESSION_QUALITY,
        );
      };
      img.onerror = () => reject(new Error("Unable to load image"));
    };
    reader.onerror = () => reject(new Error("Unable to read file"));
  });
}

export async function uploadProfileAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<string> {
  const path = buildAvatarPath(userId, file.name);
  const { error: uploadError } = await supabase.storage.from(avatarBucket).upload(path, file, {
    upsert: false,
    cacheControl: "3600",
    contentType: file.type,
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(avatarBucket).getPublicUrl(path);
  if (!data.publicUrl) {
    throw new Error("Unable to resolve public avatar URL.");
  }

  return data.publicUrl;
}
