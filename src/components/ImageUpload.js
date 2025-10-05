import React, { useState, useRef } from 'react';
import { supabase } from '../supabaseClient'; // Assuming you have this file

const ImageUpload = ({ imageUrl, onImageChange, onImageRemove }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // This function will be triggered when the user selects a file
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);

    // In a real app, you would get the user ID from your authentication system
    // For now, we'll use a placeholder or a static ID.
    const userId = 'user_placeholder_id'; // Replace with actual user ID
    const filePath = `${userId}/${Date.now()}_${file.name}`;

    try {
      // Upload the file to the 'profile-pictures' bucket
      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file);

      if (error) {
        throw error;
      }

      // Get the public URL of the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      // Pass the new URL and the path to the parent component
      onImageChange(publicUrl, data.path);

    } catch (error) {
      console.error('Error uploading file:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // This function triggers the hidden file input
  const handleFileSelect = () => {
    fileInputRef.current.click();
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
        style={{ display: 'none' }}
        accept="image/*"
        disabled={isUploading}
      />
      <div className="image-actions">
        <button type="button" className="btn btn-secondary" onClick={handleFileSelect} disabled={isUploading}>
          {isUploading ? 'Uploading...' : 'Change / Upload'}
        </button>
        {imageUrl && (
          <button type="button" className="btn btn-danger" onClick={onImageRemove} disabled={isUploading}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
