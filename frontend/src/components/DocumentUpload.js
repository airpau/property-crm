import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DocumentUpload.css';

const API_URL = process.env.REACT_APP_API_URL || '';

// Load Google Drive Picker API
const loadGoogleDriveAPI = () => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.picker) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      window.gapi.load('client:picker', () => {
        resolve();
      });
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

function DocumentUpload({ propertyId, tenancyId, tenantId, category, allowedTypes, onUploadComplete }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [folderMapped, setFolderMapped] = useState(false);
  const [defaultFolder, setDefaultFolder] = useState(null);
  const [googleAuth, setGoogleAuth] = useState(null);
  const [showConnectModal, setShowConnectModal] = useState(false);

  useEffect(() => {
    loadDocuments();
    checkFolderMapping();
    loadGoogleDriveAPI();
  }, [propertyId]);

  const loadDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/drive/properties/${propertyId}/documents`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDocuments(response.data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFolderMapping = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/drive/properties/${propertyId}/folders`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const folders = response.data || [];
      const defaultFolder = folders.find(f => f.is_default);
      setFolderMapped(folders.length > 0);
      setDefaultFolder(defaultFolder);
    } catch (error) {
      console.error('Error checking folder mapping:', error);
    }
  };

  const handleConnectGoogle = async () => {
    alert('BUTTON CLICKED! Token check starting...');
    try {
      const token = localStorage.getItem('token');
      alert('Token found: ' + (token ? 'YES' : 'NO'));
      if (!token) {
        alert('Please log in first');
        return;
      }
      
      alert('Fetching auth URL...');
      // Get auth URL from backend
      const response = await axios.get(`${API_URL}/api/google/auth-url`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Auth URL received: ' + (response.data.authUrl ? 'YES' : 'NO'));
      
      if (!response.data.authUrl) {
        alert('Could not get Google auth URL');
        return;
      }
      
      // Open Google OAuth in popup
      const width = 500;
      const height = 600;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      const popup = window.open(
        response.data.authUrl,
        'GoogleAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Poll for popup closure and reload status
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          checkFolderMapping();
        }
      }, 500);
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const openDrivePicker = async () => {
    if (!defaultFolder) {
      alert('Please map a Google Drive folder for this property first');
      return;
    }

    try {
      setUploading(true);
      
      // Create picker
      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        .addView(window.google.picker.ViewId.FOLDERS)
        .setOAuthToken(googleAuth?.access_token)
        .setDeveloperKey(process.env.REACT_APP_GOOGLE_API_KEY)
        .setOrigin(window.location.protocol + '//' + window.location.host)
        .setCallback(async (data) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const doc = data.docs[0];
            
            // Save document reference to backend
            const token = localStorage.getItem('token');
            await axios.post(
              `${API_URL}/api/drive/properties/${propertyId}/documents`,
              {
                drive_file_id: doc.id,
                drive_file_name: doc.name,
                drive_file_url: doc.url,
                drive_folder_id: doc.parentId || defaultFolder?.folder_id,
                file_type: doc.mimeType,
                tenancy_id: tenancyId,
                tenant_id: tenantId,
                category: category || 'other'
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            loadDocuments();
            onUploadComplete?.();
          }
          setUploading(false);
        })
        .build();
      
      picker.setVisible(true);
    } catch (error) {
      console.error('Error opening picker:', error);
      alert('Error opening Google Drive picker. Please try again.');
      setUploading(false);
    }
  };

  const uploadFromLocal = async (e) => {
    const files = e.target.files;
    if (!files.length) return;

    setUploading(true);
    const file = files[0];
    
    try {
      // Upload to Drive via backend
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder_id', defaultFolder?.folder_id || '');
      formData.append('property_id', propertyId);
      if (tenancyId) formData.append('tenancy_id', tenancyId);
      if (tenantId) formData.append('tenant_id', tenantId);
      if (category) formData.append('category', category);

      const response = await axios.post(
        `${API_URL}/api/drive/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        loadDocuments();
        onUploadComplete?.();
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="document-upload-container">Loading documents...</div>;
  }

  return (
    <div className="document-upload-container">
      <div className="document-header">
        <h4>📁 Documents</h4>
        <div className="upload-actions">
          {!folderMapped ? (
            <button 
              className="map-folder-btn"
              onClick={() => setShowConnectModal(true)}
            >
              🔗 Map Drive Folder
            </button>
          ) : (
            <>
              <input
                type="file"
                id={`file-upload-${propertyId}`}
                onChange={uploadFromLocal}
                style={{ display: 'none' }}
              />
              <label 
                htmlFor={`file-upload-${propertyId}`}
                className="upload-btn"
              >
                📎 Upload File
              </label>
              <button 
                className="picker-btn"
                onClick={openDrivePicker}
                disabled={uploading}
              >
                {uploading ? '⏳ Opening...' : '📂 Pick from Drive'}
              </button>
            </>
          )}
        </div>
      </div>

      {defaultFolder && (
        <div className="folder-info">
          <span className="folder-icon">📁</span>
          <span className="folder-name">{defaultFolder.folder_name}</span>
          <a 
            href={`https://drive.google.com/drive/folders/${defaultFolder.folder_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="open-folder-link"
          >
            Open in Drive →
          </a>
        </div>
      )}

      <div className="document-list">
        {documents.length === 0 ? (
          <div className="no-documents">
            <span className="no-docs-icon">📄</span>
            <p>No documents yet</p>
            <span className="no-docs-hint">
              Upload files or pick from Google Drive
            </span>
          </div>
        ) : (
          documents.map(doc => (
            <div key={doc.id} className="document-item">
              <div className="document-icon">
                {getFileIcon(doc.file_type)}
              </div>
              <div className="document-info">
                <span className="document-name">{doc.drive_file_name}</span>
                <span className="document-meta">
                  {doc.category && <span className="doc-category">{doc.category}</span>}
                  {doc.tenant && (
                    <span className="doc-tenant">
                      {doc.tenant.first_name} {doc.tenant.last_name}
                    </span>
                  )}
                  <span className="doc-date">
                    {new Date(doc.upload_date).toLocaleDateString('en-GB')}
                  </span>
                </span>
              </div>
              <div className="document-actions">
                <a 
                  href={doc.drive_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="view-btn"
                >
                  👁️ View
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Connect Google Drive Modal */}
      {showConnectModal && (
        <div className="modal-overlay" onClick={() => setShowConnectModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>🔗 Connect Google Drive</h3>
            <p>
              Link your Google Drive account to upload and manage documents 
              directly from Property CRM.
            </p>
            <div className="modal-actions">
              <button className="connect-btn" onClick={handleConnectGoogle}>
                Connect Google Drive
              </button>
              <button className="cancel-btn" onClick={() => setShowConnectModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {uploading && (
        <div className="upload-overlay">
          <div className="upload-spinner">⏳ Uploading...</div>
        </div>
      )}
    </div>
  );
}

// Helper to get icon based on file type
function getFileIcon(mimeType) {
  if (!mimeType) return '📄';
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('folder')) return '📁';
  return '📄';
}

export default DocumentUpload;
