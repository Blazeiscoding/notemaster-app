import { useState, useCallback } from "react";
import { generateId } from "@/components/note-app/util";
import type { Attachment } from "@/types/note";

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

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    setIsUploading(true);
    try {
      const fileArray = Array.from(files).filter((file) =>
        file.type.startsWith("image/")
      );

      if (fileArray.length === 0) return [];

      // Fetch auth parameters once for the batch
      const authResponse = await fetch("/api/auth/imagekit");
      if (!authResponse.ok) {
        throw new Error("Failed to fetch authentication parameters");
      }
      const authData = await authResponse.json();
      const { token, signature, expire } = authData;

      const ImageKit = (await import("imagekit-javascript")).default;
      const imagekit = new ImageKit({
        publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
        urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
      });

      const uploadPromises = fileArray.map((file) => {
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
      return attachments;
    } catch (error) {
      console.error("Failed to upload files:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return {
    uploadFiles,
    isUploading,
  };
}
