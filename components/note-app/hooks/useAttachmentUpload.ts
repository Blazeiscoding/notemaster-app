import { useState, useCallback } from "react";
import { toast } from "sonner";
import { generateId } from "@/components/note-app/util";
import { compressImage, needsCompression } from "@/lib/image-utils";
import type { Attachment } from "@/types/note";
import type { ApiResponse } from "@/lib/api-middleware";

interface ImageKitUploadResult {
  fileId: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  height: number;
  width: number;
  size: number;
  filePath: string;
  tags?: string[];
  isPrivateFile?: boolean;
  customCoordinates?: string | null;
  metadata?: unknown;
  fileType: string;
}

export function useAttachmentUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileArray = Array.from(files).filter((file) =>
        file.type.startsWith("image/")
      );

      if (fileArray.length === 0) return [];

      // Step 1: Compress images that need compression
      setIsCompressing(true);
      const compressedFiles: File[] = [];
      let totalOriginalSize = 0;
      let totalCompressedSize = 0;

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        totalOriginalSize += file.size;

        if (needsCompression(file)) {
          try {
            const compressed = await compressImage(file, {
              maxWidth: 1920,
              maxHeight: 1920,
              quality: 0.8,
              mimeType: "image/jpeg",
            });
            compressedFiles.push(compressed);
            totalCompressedSize += compressed.size;
          } catch {
            // If compression fails, use original
            compressedFiles.push(file);
            totalCompressedSize += file.size;
          }
        } else {
          compressedFiles.push(file);
          totalCompressedSize += file.size;
        }

        setUploadProgress(((i + 1) / fileArray.length) * 30); // Compression is 30% of progress
      }

      setIsCompressing(false);

      // Show compression stats if significant reduction
      const savedBytes = totalOriginalSize - totalCompressedSize;
      if (savedBytes > 100 * 1024) {
        const savedMB = (savedBytes / (1024 * 1024)).toFixed(1);
        toast.info(`Compressed images: saved ${savedMB}MB`);
      }

      // Step 2: Fetch auth parameters
      const authResponse = await fetch("/api/auth/imagekit");
      if (!authResponse.ok) {
        if (authResponse.status === 401) {
          throw new Error("Sign in to upload images");
        }
        throw new Error("Failed to fetch authentication parameters");
      }
      const authData = (await authResponse.json()) as ApiResponse<{
        token: string;
        signature: string;
        expire: number;
      }>;
      const { token, signature, expire } = authData.data ?? {};
      if (!token || !signature || !expire) {
        throw new Error("Upload authentication is unavailable");
      }

      // Step 3: Upload compressed files
      const ImageKit = (await import("imagekit-javascript")).default;
      const imagekit = new ImageKit({
        publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
        urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
      });

      const uploadPromises = compressedFiles.map((file, index) => {
        return new Promise<Attachment>((resolve, reject) => {
          imagekit.upload(
            {
              file,
              fileName: file.name,
              tags: ["note-attachment"],
              token,
              signature,
              expire,
            },
            (err: Error | null, result: ImageKitUploadResult | null) => {
              // Update progress (uploads are 70% of total)
              const uploadProgress = 30 + ((index + 1) / compressedFiles.length) * 70;
              setUploadProgress(Math.round(uploadProgress));

              if (err) {
                reject(err);
              } else if (result) {
                resolve({
                  id: generateId(),
                  name: file.name,
                  type: file.type,
                  size: file.size,
                  data: result.url,
                });
              } else {
                reject(new Error("Upload failed"));
              }
            }
          );
        });
      });

      const attachments = await Promise.all(uploadPromises);
      setUploadProgress(100);
      return attachments;
    } catch (error) {
      console.error("Failed to upload files:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload files"
      );
      throw error;
    } finally {
      setIsUploading(false);
      setIsCompressing(false);
      setUploadProgress(0);
    }
  }, []);

  return {
    uploadFiles,
    isUploading,
    isCompressing,
    uploadProgress,
  };
}
