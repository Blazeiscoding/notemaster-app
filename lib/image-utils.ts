/**
 * Image utilities for client-side image compression and processing.
 * Uses the Canvas API for resizing and compression without external dependencies.
 */

export type CompressOptions = {
  /** Maximum width in pixels. Default: 1920 */
  maxWidth?: number;
  /** Maximum height in pixels. Default: 1920 */
  maxHeight?: number;
  /** JPEG quality (0-1). Default: 0.8 */
  quality?: number;
  /** Output MIME type. Default: image/jpeg */
  mimeType?: "image/jpeg" | "image/webp" | "image/png";
};

const DEFAULT_OPTIONS: Required<CompressOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  mimeType: "image/jpeg",
};

/**
 * Compresses an image file using the Canvas API.
 *
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise resolving to compressed file
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Skip non-image files
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // Skip if already small enough (< 100KB)
  if (file.size < 100 * 1024) {
    return file;
  }

  // Skip GIFs (to preserve animation)
  if (file.type === "image/gif") {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate new dimensions while maintaining aspect ratio
          let { width, height } = img;

          if (width > opts.maxWidth) {
            height = (height * opts.maxWidth) / width;
            width = opts.maxWidth;
          }

          if (height > opts.maxHeight) {
            width = (width * opts.maxHeight) / height;
            height = opts.maxHeight;
          }

          // Round to integers
          width = Math.round(width);
          height = Math.round(height);

          // Create canvas and draw resized image
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            throw new Error("Could not get canvas context");
          }

          // Use high-quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // Draw the image
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                // If compression failed, return original
                resolve(file);
                return;
              }

              // If compressed file is larger than original, use original
              if (blob.size >= file.size) {
                resolve(file);
                return;
              }

              // Create new file with compressed data
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^.]+$/, getExtension(opts.mimeType)),
                {
                  type: opts.mimeType,
                  lastModified: Date.now(),
                }
              );

              console.log(
                `Compressed ${file.name}: ${formatSize(file.size)} → ${formatSize(compressedFile.size)} (${Math.round((1 - compressedFile.size / file.size) * 100)}% reduction)`
              );

              resolve(compressedFile);
            },
            opts.mimeType,
            opts.quality
          );
        } catch (error) {
          console.error("Compression error:", error);
          resolve(file); // Return original on error
        }
      };

      img.onerror = () => {
        console.error("Failed to load image for compression");
        resolve(file); // Return original on error
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Compresses multiple image files in parallel.
 *
 * @param files - Array of files to compress
 * @param options - Compression options
 * @returns Promise resolving to array of compressed files
 */
export async function compressImages(
  files: File[],
  options: CompressOptions = {}
): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file, options)));
}

/**
 * Gets the file extension for a MIME type.
 */
function getExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/png":
      return ".png";
    default:
      return ".jpg";
  }
}

/**
 * Formats a file size in bytes to a human-readable string.
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Estimates image dimensions without fully loading the image.
 * Useful for quick validation before upload.
 */
export function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Not an image file"));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Checks if a file needs compression based on size and type.
 */
export function needsCompression(file: File): boolean {
  // Not an image
  if (!file.type.startsWith("image/")) return false;

  // GIFs should not be compressed (preserves animation)
  if (file.type === "image/gif") return false;

  // Small files don't need compression
  if (file.size < 100 * 1024) return false;

  return true;
}
