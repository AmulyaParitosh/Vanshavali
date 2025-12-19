import React, { useState, useRef } from "react";
import { storage } from "../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from "./ToastSystem";

interface ImageUploadProps {
  imageUrl?: string;
  onImageChange: (url: string, path: string) => void;
  onImageRemove: () => void;
  canEdit: boolean;
  storagePath?: string | undefined;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ imageUrl, onImageChange, onImageRemove, canEdit, storagePath }) => {
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

    // Create a storage reference from our storage service
    const storageRef = ref(storage, `${finalStoragePath}/${Date.now()}_${file.name}`);

    try {
      // Upload the file to Firebase Storage
      const snapshot = await uploadBytes(storageRef, file);

      // Get the public URL of the uploaded file
      const publicUrl = await getDownloadURL(snapshot.ref);

      // Pass the new URL and the path to the parent component
      onImageChange(publicUrl, snapshot.ref.fullPath);
      toast.success("Image uploaded successfully!"); // Toast system doesn't support updating loading toasts yet, simple success message
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
