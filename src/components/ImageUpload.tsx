import React, { useState, useRef, useMemo } from "react";
import { useToast } from "./ToastSystem";
import { useAppContext } from "../context/AppContext";

interface ImageUploadProps {
  imageUrl?: string;
  onImageChange: (url: string, path: string) => void;
  onImageRemove: () => void;
  canEdit: boolean;
  storagePath?: string | undefined;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ imageUrl, onImageChange, onImageRemove, canEdit, storagePath }) => {
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
      // Upload the file using StorageProvider
      const { url, fullPath } = await storageProvider.uploadImage(file, `${finalStoragePath}/${Date.now()}_${file.name}`);

      // Pass the new URL and the path to the parent component
      onImageChange(url, fullPath);
      toast.success("Image uploaded successfully!");
      toast.dismiss(toastId);
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast.dismiss(toastId);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // This function triggers the hidden file input
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
      toast.confirm(
          "Are you sure you want to remove this image?",
          () => {
             onImageRemove();
             toast.success("Image removed.");
          }
      );
  };

  return (
    <div className="image-upload-container">
      <div className="image-preview">
        {imageUrl ? (
          <img src={imageUrl} alt="Upload preview" />
        ) : (
          <div className="no-image-placeholder">
            <span>No Image</span>
          </div>
        )}
        
        {canEdit && (
          <div className="overlay-actions">
            <button
              type="button"
              className="btn-icon-overlay upload-btn"
              onClick={handleFileSelect}
              disabled={isUploading}
              title={isUploading ? "Uploading..." : "Upload Image"}
            >
              ✎
            </button>
            {imageUrl && (
              <button
                type="button"
                className="btn-icon-overlay remove-btn"
                onClick={handleRemove}
                disabled={isUploading}
                title="Remove Image"
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
