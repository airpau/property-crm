import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DriveFolderMapping.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function DriveFolderMapping({ propertyId, propertyName, onFolderMapped }) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [folderUrl, setFolderUrl] = useState('');
  const [folderName, setFolderName] = useState('');

  useEffect(() => {
    if (showModal) {
      loadFolders();
    }
  }, [showModal]);

  const loadFolders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/properties/${propertyId}/folders`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFolders(response.data || []);
    } catch (error) {
      console.error('Error loading folders:', error);
      alert('Error loading folders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const extractFolderId = (url) => {
    // Handle various Google Drive folder URL formats
    const patterns = [
      /\/folders\/([a-zA-Z0-9_-]+)/,
      /\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /^([a-zA-Z0-9_-]{20,})$/ // Just the raw ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  };

  const handleAddFolder = async (e) => {
    e.preventDefault();
    
    const folderId = extractFolderId(folderUrl);
    if (!folderId) {
      alert('Could not extract folder ID from URL. Please check the link.');
      return;
    }

    const displayName = folderName || `Property Documents`;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/properties/${propertyId}/folders`,
        {
          folder_id: folderId,
          folder_name: displayName,
          folder_path: folderUrl,
          is_default: folders.length === 0 // First folder becomes default
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setFolderUrl('');
      setFolderName('');
      loadFolders();
      onFolderMapped?.();
    } catch (error) {
      console.error('Error adding folder:', error);
      alert('Error saving folder mapping. Please try again.');
    }
  };

  const setAsDefault = async (folderId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/properties/${propertyId}/folders`,
        {
          folder_id: folderId,
          is_default: true
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadFolders();
    } catch (error) {
      console.error('Error setting default:', error);
      alert('Error updating default folder. Please try again.');
    }
  };

  const removeFolder = async (folderId) => {
    if (!window.confirm('Remove this folder mapping?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/api/drive-folders/${folderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadFolders();
    } catch (error) {
      console.error('Error removing folder:', error);
      alert('Error removing folder. Please try again.');
    }
  };

  const defaultFolder = folders.find(f => f.is_default);

  return (
    <>
      <button 
        className="map-folder-trigger-btn"
        onClick={() => setShowModal(true)}
      >
        {defaultFolder ? '📁 Change Folder' : '🔗 Map Drive Folder'}
      </button>

      {showModal && (
        <div className="folder-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="folder-modal-content" onClick={e => e.stopPropagation()}>
            <div className="folder-modal-header">
              <h3>📁 Google Drive Folder</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="folder-modal-body">
              {defaultFolder && (
                <div className="current-folder">
                  <h4>Current Default Folder</h4>
                  <div className="folder-card default">
                    <span className="folder-icon">📁</span>
                    <div className="folder-details">
                      <span className="folder-name">{defaultFolder.folder_name}</span>
                      <a 
                        href={`https://drive.google.com/drive/folders/${defaultFolder.folder_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="open-link"
                      >
                        Open in Drive →
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {folders.length > 0 && (
                <div className="mapped-folders">
                  <h4>Mapped Folders</h4>
                  {folders.map(folder => (
                    <div key={folder.id} className={`folder-card ${folder.is_default ? 'default' : ''}`}>
                      <span className="folder-icon">{folder.is_default ? '📁' : '📂'}</span>
                      <div className="folder-details">
                        <span className="folder-name">{folder.folder_name}</span>
                      </div>
                      <div className="folder-actions">
                        {!folder.is_default && (
                          <button 
                            className="set-default-btn"
                            onClick={() => setAsDefault(folder.folder_id)}
                          >
                            Set Default
                          </button>
                        )}
                        <button 
                          className="remove-btn"
                          onClick={() => removeFolder(folder.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="add-folder-section">
                <h4>Add New Folder</h4>
                <form onSubmit={handleAddFolder}>
                  <div className="form-group">
                    <label>Google Drive Folder URL</label>
                    <input
                      type="text"
                      value={folderUrl}
                      onChange={(e) => setFolderUrl(e.target.value)}
                      placeholder="https://drive.google.com/drive/folders/..."
                      required
                    />
                    <span className="help-text">
                      Copy the folder URL from your Google Drive
                    </span>
                  </div>

                  <div className="form-group">
                    <label>Folder Name (optional)</label>
                    <input
                      type="text"
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      placeholder={`${propertyName} Documents`}
                    />
                  </div>

                  <button type="submit" className="add-folder-btn" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Folder'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DriveFolderMapping;
