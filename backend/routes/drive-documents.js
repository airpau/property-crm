const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Get Drive folders for a property
router.get('/properties/:propertyId/folders', async (req, res) => {
  try {
    const { data: folders, error } = await supabase
      .from('property_drive_folders')
      .select('*')
      .eq('property_id', req.params.propertyId)
      .order('is_default', { ascending: false });

    if (error) throw error;
    res.json(folders || []);
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create/update Drive folder mapping
router.post('/properties/:propertyId/folders', async (req, res) => {
  try {
    const { folder_id, folder_name, folder_path, is_default } = req.body;
    
    // If this is default, unset other defaults
    if (is_default) {
      await supabase
        .from('property_drive_folders')
        .update({ is_default: false })
        .eq('property_id', req.params.propertyId);
    }

    const { data, error } = await supabase
      .from('property_drive_folders')
      .upsert({
        property_id: req.params.propertyId,
        folder_id,
        folder_name,
        folder_path,
        is_default: is_default || false
      }, {
        onConflict: 'property_id,folder_id'
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error saving folder:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get documents for a property
router.get('/properties/:propertyId/documents', async (req, res) => {
  try {
    const { data: documents, error } = await supabase
      .from('property_documents')
      .select(`
        *,
        tenancy:tenancy_id (
          id,
          room_number
        ),
        tenant:tenant_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq('property_id', req.params.propertyId)
      .order('upload_date', { ascending: false });

    if (error) throw error;
    res.json(documents || []);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save document reference (after Drive upload)
router.post('/properties/:propertyId/documents', async (req, res) => {
  try {
    const {
      drive_file_id,
      drive_file_name,
      drive_file_url,
      drive_folder_id,
      file_type,
      file_size,
      description,
      category,
      tenancy_id,
      tenant_id
    } = req.body;

    // Get user from auth
    const userId = req.user?.id; // Set by auth middleware

    const { data, error } = await supabase
      .from('property_documents')
      .insert({
        property_id: req.params.propertyId,
        tenancy_id,
        tenant_id,
        drive_file_id,
        drive_file_name,
        drive_file_url,
        drive_folder_id,
        file_type,
        file_size,
        upload_date: new Date().toISOString(),
        description,
        category,
        uploaded_by: userId
      })
      .select()`
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error saving document:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete document reference (keeps file in Drive)
router.delete('/documents/:documentId', async (req, res) => {
  try {
    const { error } = await supabase
      .from('property_documents')
      .delete()
      .eq('id', req.params.documentId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Drive token for user (if exists)
router.get('/drive-token', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    const { data: token, error } = await supabase
      .from('google_drive_tokens')
      .select('*')
      .eq('landlord_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    if (token && new Date(token.token_expires_at) > new Date()) {
      res.json({ connected: true, email: token.drive_email });
    } else {
      res.json({ connected: false });
    }
  } catch (error) {
    console.error('Error checking Drive token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save Drive token after OAuth
router.post('/drive-token', async (req, res) => {
  try {
    const { access_token, refresh_token, expires_in, email } = req.body;
    const userId = req.user?.id;
    
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

    const { data, error } = await supabase
      .from('google_drive_tokens')
      .upsert({
        landlord_id: userId,
        access_token,
        refresh_token,
        token_expires_at: expiresAt.toISOString(),
        drive_email: email
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, email });
  } catch (error) {
    console.error('Error saving Drive token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Revoke Drive access
router.delete('/drive-token', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    await supabase
      .from('google_drive_tokens')
      .delete()
      .eq('landlord_id', userId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error revoking Drive token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a folder mapping
router.delete('/drive-folders/:folderId', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    // Verify user owns this folder mapping
    const { data: folder, error: fetchError } = await supabase
      .from('property_drive_folders')
      .select('property_id')
      .eq('id', req.params.folderId)
      .single();

    if (fetchError || !folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Verify user owns the property
    const { data: property } = await supabase
      .from('properties')
      .select('landlord_id')
      .eq('id', folder.property_id)
      .single();

    if (!property || property.landlord_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await supabase
      .from('property_drive_folders')
      .delete()
      .eq('id', req.params.folderId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
