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

    const userId = req.user?.id;

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
      .select()
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

// Delete a folder mapping
router.delete('/folders/:folderId', async (req, res) => {
  try {
    const { error } = await supabase
      .from('property_drive_folders')
      .delete()
      .eq('id', req.params.folderId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
