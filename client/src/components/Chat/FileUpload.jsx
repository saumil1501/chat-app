// client/src/components/Chat/FileUpload.jsx
import { useRef } from 'react';
import { api } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { useState } from 'react';

const FileUpload = ({ onFileUpload, roomId }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          // You can use this for progress bar
        },
      });

      onFileUpload(data.file);
      toast.success('File uploaded successfully!');
      fileInputRef.current.value = '';
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        className="hidden"
        disabled={uploading}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="text-2xl text-gray-400 hover:text-white transition shrink-0 
                   mb-1 disabled:opacity-50"
        title="Upload file"
      >
        {uploading ? '⏳' : '📎'}
      </button>
    </>
  );
};

export default FileUpload;