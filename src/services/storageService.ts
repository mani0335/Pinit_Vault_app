import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://whrahermnqovrupvvxtw.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndocmFoZXJtbnFvdnJ1cHZ2eHR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjMzMzAsImV4cCI6MjA5MzYzOTMzMH0.RuIv0u6YW-Pp6rdogFgAFXFZ4dTS2DhQhM8BxzoQ_tk';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface PortfolioDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  file_url: string;
  uploaded_at: string;
  user_id: string;
}

export class StorageService {
  private static BUCKET_NAME = 'portfolio-files';

  /**
   * Upload a file to Supabase Storage
   */
  static async uploadFile(
    file: File,
    userId: string,
    portfolioId?: string
  ): Promise<PortfolioDocument> {
    console.log('📤 Starting file upload to Supabase Storage...');
    console.log('📁 File:', file.name, 'Size:', file.size, 'Type:', file.type);
    console.log('👤 User ID:', userId);
    console.log('📂 Portfolio ID:', portfolioId || 'N/A');

    try {
      // Generate unique file path
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || '';
      const fileName = `${userId}/${portfolioId || 'temp'}/${timestamp}_${file.name}`;
      
      console.log('🔗 Generated file path:', fileName);

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        console.error('❌ Upload failed:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('✅ File uploaded successfully:', uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      console.log('🔗 Public URL generated:', publicUrl);

      // Create document metadata
      const document: PortfolioDocument = {
        id: uploadData.path.split('/').pop() || timestamp.toString(),
        name: file.name,
        type: file.type,
        size: file.size,
        file_url: publicUrl,
        uploaded_at: new Date().toISOString(),
        user_id: userId
      };

      console.log('📄 Document metadata created:', document);
      return document;

    } catch (error) {
      console.error('❌ Storage upload error:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  static async uploadFiles(
    files: File[],
    userId: string,
    portfolioId?: string
  ): Promise<PortfolioDocument[]> {
    console.log('📤 Starting batch upload of', files.length, 'files');
    
    const uploadPromises = files.map(file => 
      this.uploadFile(file, userId, portfolioId)
    );

    try {
      const results = await Promise.all(uploadPromises);
      console.log('✅ All files uploaded successfully');
      return results;
    } catch (error) {
      console.error('❌ Batch upload failed:', error);
      throw error;
    }
  }

  /**
   * Delete a file from Supabase Storage
   */
  static async deleteFile(filePath: string): Promise<void> {
    console.log('🗑️ Deleting file:', filePath);

    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('❌ Delete failed:', error);
        throw new Error(`Delete failed: ${error.message}`);
      }

      console.log('✅ File deleted successfully');
    } catch (error) {
      console.error('❌ Storage delete error:', error);
      throw error;
    }
  }

  /**
   * Get signed URL for secure file access
   */
  static async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    console.log('🔐 Generating signed URL for:', filePath);

    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('❌ Signed URL generation failed:', error);
        throw new Error(`Signed URL generation failed: ${error.message}`);
      }

      console.log('✅ Signed URL generated successfully');
      return data.signedUrl;
    } catch (error) {
      console.error('❌ Signed URL error:', error);
      throw error;
    }
  }

  /**
   * Check if bucket exists, create if not
   */
  static async ensureBucketExists(): Promise<void> {
    console.log('🪣 Checking if portfolio-files bucket exists...');

    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error('❌ Failed to list buckets:', error);
        return;
      }

      const bucketExists = buckets?.some(bucket => bucket.name === this.BUCKET_NAME);
      
      if (!bucketExists) {
        console.log('🪣 Creating portfolio-files bucket...');
        const { error: createError } = await supabase.storage.createBucket(this.BUCKET_NAME, {
          public: true,
          allowedMimeTypes: [
            'image/jpeg',
            'image/png', 
            'image/gif',
            'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain'
          ],
          fileSizeLimit: 10485760 // 10MB
        });

        if (createError) {
          console.error('❌ Failed to create bucket:', createError);
        } else {
          console.log('✅ Bucket created successfully');
        }
      } else {
        console.log('✅ Bucket already exists');
      }
    } catch (error) {
      console.error('❌ Bucket check error:', error);
    }
  }

  /**
   * Convert vault document to portfolio document
   */
  static async convertVaultDocument(
    vaultDoc: any,
    userId: string,
    portfolioId: string
  ): Promise<PortfolioDocument | null> {
    console.log('🔄 Converting vault document to portfolio document...');
    console.log('📄 Vault doc:', vaultDoc.name);

    try {
      // Check if vault document has encrypted data that can be converted
      if (!vaultDoc.encryptedData && !vaultDoc.encryptedImage) {
        console.log('❌ No encrypted data found in vault document');
        return null;
      }

      // Convert base64 data to blob
      let base64Data = vaultDoc.encryptedImage || vaultDoc.encryptedData;
      
      // Remove data URL prefix if present
      if (base64Data.startsWith('data:')) {
        base64Data = base64Data.split(',')[1];
      }

      // Decode base64 to binary
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create blob from binary data
      const mimeType = this.getMimeTypeFromFileName(vaultDoc.name);
      const blob = new Blob([bytes], { type: mimeType });
      const file = new File([blob], vaultDoc.name, { type: mimeType });

      console.log('🔄 Created file from vault data:', file.name, file.size);

      // Upload to Supabase Storage
      const portfolioDoc = await this.uploadFile(file, userId, portfolioId);
      console.log('✅ Vault document converted successfully');
      
      return portfolioDoc;

    } catch (error) {
      console.error('❌ Vault document conversion failed:', error);
      return null;
    }
  }

  /**
   * Get MIME type from file name
   */
  private static getMimeTypeFromFileName(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain'
    };

    return mimeTypes[extension || ''] || 'application/octet-stream';
  }
}

export default StorageService;
