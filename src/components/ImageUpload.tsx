"use client";

import React, { useState, useRef } from "react";
import { useToast } from "./ToastSystem";
import { useAppContext } from "../context/AppContext";
import { resizeForUpload } from "../lib/images";

/** A Blob as a File, so the multipart upload keeps a filename and type. */
function asFile(blob: Blob, name: string, type: string): File {
  return blob instanceof File ? blob : new File([blob], name, { type: blob.type || type });
}

/** What one upload produces: the display copy and its thumbnail. */
export interface UploadedImage {
  url: string;
  path: string;
  thumbUrl: string;
  thumbPath: string;
}

interface ImageUploadProps {
  imageUrl?: string;
  onImageChange: (image: UploadedImage) => void;
  onImageRemove: () => void;
  canEdit: boolean;
  storagePath?: string | undefined;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  imageUrl,
  onImageChange,
  onImageRemove,
  canEdit,
  storagePath,
}) => {
  const { storageProvider } = useAppContext();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // This function will be triggered when the user selects a file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading("Uploading image...");

    let finalStoragePath = storagePath;
    if (!finalStoragePath) {
      // Fallback for backward compatibility or when no specific path is provided
      const userId = "user_placeholder_id";
      finalStoragePath = `images/${userId}`;
    }

    try {
      // Resize before uploading, not after: the original never leaves the
      // device, so the upload is quick on a phone connection and every later
      // read is small. Two copies — one for the record panel, one for the
      // avatars (see lib/images.ts).
      const { display, thumb } = await resizeForUpload(file);
      const base = `${finalStoragePath}/${Date.now()}_${file.name}`;
      const [full, small] = await Promise.all([
        storageProvider.uploadImage(asFile(display, file.name, file.type), base),
        storageProvider.uploadImage(asFile(thumb, `t_${file.name}`, file.type), `${base}.thumb`),
      ]);

      onImageChange({
        url: full.url,
        path: full.fullPath,
        thumbUrl: small.url,
        thumbPath: small.fullPath,
      });
      toast.success("Image uploaded successfully!");
      toast.dismiss(toastId);
    } catch (error: unknown) {
      console.error("Error uploading file:", error);
      toast.dismiss(toastId);
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Upload failed: ${message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // This function triggers the hidden file input
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    toast.confirm("Are you sure you want to remove this image?", () => {
      onImageRemove();
      toast.success("Image removed.");
    });
  };

  return (
    <div className="image-upload-container">
      <div className="image-preview">
        {imageUrl ? (
          <img src={imageUrl} alt="Upload preview" />
        ) : (
          <span className="absent no-photograph">no photograph</span>
        )}

        {canEdit && (
          <div className="overlay-actions">
            <button
              type="button"
              className="btn-icon-overlay upload-btn"
              onClick={handleFileSelect}
              disabled={isUploading}
              aria-label={isUploading ? "Uploading image" : "Upload image"}
              title={isUploading ? "Uploading…" : "Upload a photograph"}
            >
              Change
            </button>
            {imageUrl && (
              <button
                type="button"
                className="btn-icon-overlay remove-btn"
                onClick={handleRemove}
                disabled={isUploading}
                aria-label="Remove image"
                title="Remove image"
              >
                &times;
              </button>
            )}
          </div>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
        accept="image/*"
        disabled={isUploading || !canEdit}
      />
    </div>
  );
};

export default ImageUpload;
