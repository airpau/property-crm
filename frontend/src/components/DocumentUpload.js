import React, { useState, useRef } from 'react';
import './DocumentUpload.css';

const GOOGLE_DRIVE_API_KEY = process.env.REACT_APP_GOOGLE_DRIVE_API_KEY;
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

function DocumentUpload({ tenancyId, tenantId, onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [documentType, setDocumentType] = useState('tenancy_agreement');
  const fileInputRef = useRef(null);

  const documentTypes = [
    { value: 'tenancy_agreement', label: 'Tenancy Agreement', icon: '📄' },
    { value: 'inventory', label: 'Inventory Checklist', icon: '📋' },
    { value: 'right_to_rent', label: 'Right to Rent Documents', icon: '🛂' },
    { value: 'deposit_protection', label: 'Deposit Protection Certificate', icon: '🔒' },
    { value: 'gas_safety', label: 'Gas Safety Certificate', icon: '🔥' },
    { value: 'electrical_safety', label: 'Electrical Safety Certificate', icon: '⚡' },
    { value: 'epc', label: 'EPC Certificate', icon: '🌱' },
    { value: 'insurance', label: 'Insurance Documents', icon: '🛡️' },
    { value: 'other', label: 'Other Documents', icon: '📎' }
  ];

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const uploadToGoogleDrive = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // For now, simulate upload with progress
      // In production, this would use Google Drive API
      const totalFiles = selectedFiles.length;
      
      for (let i = 0; i < totalFiles; i++) {
        const file = selectedFiles[i];
        
        // Simulate upload delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const progress = ((i + 1) / totalFiles) * 100;
        setUploadProgress(progress);

        // Store file metadata (in production, this would be the Drive file ID)
        const documentData = {
          id: `doc_${Date.now()}_${i}`,
          file_name: file.name,
          document_type: documentType,
          file_size: file.size,
          uploaded_at: new Date().toISOString(),
          tenancy_id: tenancyId,
          tenant_id: tenantId,
          drive_url: `https://drive.google.com/file/${Date.now()}/view` // Simulated
        };

        // Call API to save document metadata
        // await axios.post(`${API_URL}/api/documents`, documentData);
        console.log('Uploaded document:', documentData);
      }

      setUploading(false);
      setSelectedFiles([]);
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploading(false);
      alert('Upload failed. Please try again.');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(files);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="document-upload">
      <div className="upload-header">
        <h3>📁 Upload Documents</h3>
        <p className="upload-description">
          Upload tenancy documents to Google Drive for secure storage
        </p>
      </div>

      {/* Document Type Selector */}
      <div className="document-type-selector">
        <label>Document Type:</label>
        <select 
          value={documentType} 
          onChange={(e) => setDocumentType(e.target.value)}
          className="type-select"
        >
          {documentTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.icon} {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Drop Zone */}
      <div 
        className="drop-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        {selectedFiles.length === 0 ? (
          <>
            <div className="drop-icon">📤</div>
            <div className="drop-text">
              <strong>Drop files here</strong> or click to browse
            </div>
            <div className="drop-hint">
              Supports: PDF, Word, Images (Max 50MB per file)
            </div>
          </>
        ) : (
          <div className="selected-files">
            <h4>Selected Files ({selectedFiles.length}):</h4>
            <div className="file-list">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="file-item">
                  <div className="file-icon">📄</div>
                  <div className="file-info">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{formatFileSize(file.size)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <div className="progress-text">
            Uploading... {Math.round(uploadProgress)}%
          </div>
        </div>
      )}

      {/* Upload Button */}
      {selectedFiles.length > 0 && !uploading && (
        <div className="upload-actions">
          <button 
            className="upload-btn primary"
            onClick={uploadToGoogleDrive}
          >
            Upload to Google Drive
          </button>
          <button 
            className="upload-btn secondary"
            onClick={() => setSelectedFiles([])}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Connected Account Info */}
      <div className="drive-info">
        <div className="drive-badge">
          <span className="drive-icon">📦</span>
          <span>Documents stored in Google Drive</span>
        </div>
        <p className="drive-hint">
          Files are securely uploaded to your connected Google Drive account
          and linked to this tenancy for easy access.
        </p>
      </div>
    </div>
  );
}

export default DocumentUpload;
