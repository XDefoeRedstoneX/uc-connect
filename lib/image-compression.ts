/**
 * Compresses an image file if it exceeds the specified size threshold.
 * Uses canvas API to reduce quality while maintaining aspect ratio.
 *
 * @param file - The image file to compress
 * @param maxSizeBytes - Maximum file size before compression (default: 500KB)
 * @param targetQuality - JPEG quality (0-1, default: 0.8)
 * @returns Promise resolving to the compressed file or original if below threshold
 */
export async function compressImage(
  file: File,
  maxSizeBytes = 500 * 1024, // 500KB default
  targetQuality = 0.8,
): Promise<File> {
  // If file is already small enough, return as-is
  if (file.size <= maxSizeBytes) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to compress image"));
              return;
            }

            // If compressed file is still too large, reduce quality and try again
            if (blob.size > maxSizeBytes && targetQuality > 0.1) {
              void compressImage(
                new File([blob], file.name, { type: "image/jpeg" }),
                maxSizeBytes,
                targetQuality - 0.1,
              ).then(resolve).catch(reject);
            } else {
              // Create new File object from blob
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: file.lastModified,
              });
              resolve(compressedFile);
            }
          },
          "image/jpeg",
          targetQuality,
        );
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      const result = event.target?.result;
      if (typeof result === "string") {
        img.src = result;
      } else {
        reject(new Error("FileReader result is not a string"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Formats file size to human-readable string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
