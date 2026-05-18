/**
 * Compress + resize an image file using canvas.
 * @param file Source image file
 * @param maxW Max width in pixels
 * @param maxH Max height in pixels  
 * @param maxKB Max output size in kilobytes
 */
export async function compressAndResize(
  file: File,
  maxW: number,
  maxH: number,
  maxKB: number,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        // Calculate dimensions keeping aspect ratio
        let { width, height } = img;
        const ratio = Math.min(maxW / width, maxH / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("No canvas context")); return; }
        ctx.drawImage(img, 0, 0, width, height);

        // Iteratively reduce quality until under maxKB
        const tryCompress = (quality: number) => {
          canvas.toBlob((blob) => {
            if (!blob) { reject(new Error("Blob creation failed")); return; }
            if (blob.size <= maxKB * 1024 || quality <= 0.3) {
              resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
                type: "image/jpeg",
                lastModified: Date.now(),
              }));
            } else {
              tryCompress(quality - 0.1);
            }
          }, "image/jpeg", quality);
        };
        tryCompress(0.85);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Banner: 1200×400, max 300 KB */
export const compressBanner = (f: File) => compressAndResize(f, 1200, 400, 300);
/** Avatar/logo: 400×400, max 150 KB */
export const compressAvatar = (f: File) => compressAndResize(f, 400, 400, 150);
/** Generic item image: 800×600, max 200 KB */
export const compressItemImage = (f: File) => compressAndResize(f, 800, 600, 200);
