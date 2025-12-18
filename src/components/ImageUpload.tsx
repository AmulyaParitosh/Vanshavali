import React, { useState, useRef } from "react";
// @ts-ignore
import { supabase } from "../lib/supabaseClient";

interface ImageUploadProps {
  imageUrl?: string;
  onImageChange: (url: string, path: string) => void;
  onImageRemove: () => void;
  canEdit: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ imageUrl, onImageChange, onImageRemove, canEdit }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // This function will be triggered when the user selects a file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    // In a real app, you would get the user ID from your authentication system
    // For now, we'll use a placeholder or a static ID.
    const userId = "user_placeholder_id"; // Replace with actual user ID
    const filePath = `${userId}/${Date.now()}_${file.name}`;

    try {
      // Upload the file to the 'profile-pictures' bucket
      const { data, error } = await supabase.storage
        .from("profile-pictures")
        .upload(filePath, file);

      if (error) {
        throw error;
      }

      // Get the public URL of the uploaded file
      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-pictures").getPublicUrl(filePath);

      // Pass the new URL and the path to the parent component
      onImageChange(publicUrl, data.path);
    } catch (error: any) {
      console.error("Error uploading file:", error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // This function triggers the hidden file input
  const handleFileSelect = () => {
    fileInputRef.current?.click();
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
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
        accept="image/*"
        disabled={isUploading || !canEdit}
      />
      {canEdit && (
        <div className="image-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleFileSelect}
            disabled={isUploading || !canEdit}
          >
            {isUploading ? "Uploading..." : "Change / Upload"}
          </button>
          {imageUrl && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={onImageRemove}
              disabled={isUploading || !canEdit}
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
