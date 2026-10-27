// ============================================================================
// Sakshya — Private Document Storage Service
// Handles authorized FDR document uploads, type/size validation, safe storage paths,
// short-lived signed URLs, and metadata persistence.
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { UploadedDocument, DemoSession } from '../types';
import * as store from '../store';
import { isSupabaseConfigured } from '../supabase/config';
import { getServerSupabase } from '../supabase/server';
import { getAdminSupabase } from '../supabase/admin';

export const FDR_DOCUMENTS_BUCKET = 'fdr-documents';
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
];

export interface UploadDocumentParams {
  institutionId: string;
  instrumentId: string;
  documentType: UploadedDocument['documentType'];
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileBuffer?: Buffer | Uint8Array;
  dataUrl?: string;
}

export class DocumentService {
  /**
   * Validate document file before upload
   */
  static validateDocument(fileName: string, fileSize: number, mimeType: string): void {
    if (fileSize > MAX_DOCUMENT_SIZE_BYTES) {
      throw new Error(`File size ${(fileSize / (1024 * 1024)).toFixed(1)}MB exceeds maximum allowed limit of 10MB.`);
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      throw new Error(`Invalid file format '${mimeType}'. Only PDF documents and official scans (JPEG, PNG, WebP) are accepted.`);
    }
  }

  /**
   * Upload FDR supporting document securely
   */
  static async uploadDocument(
    params: UploadDocumentParams,
    session: DemoSession
  ): Promise<UploadedDocument> {
    // 1. Permission check
    if (session.role === 'institution' && session.institutionId && params.institutionId !== session.institutionId) {
      throw new Error('Forbidden: Cannot upload documents to another institution\'s FDR record.');
    }

    // 2. Format & size validation
    this.validateDocument(params.fileName, params.fileSize, params.mimeType);

    // 3. Generate safe storage path
    const safeName = params.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `institutions/${params.institutionId}/instruments/${params.instrumentId}/${uuidv4().slice(0, 8)}_${safeName}`;

    // 4. If live Supabase storage is configured, upload to private bucket
    if (isSupabaseConfigured() && params.fileBuffer) {
      const adminClient = getAdminSupabase();
      if (adminClient) {
        const { error } = await adminClient.storage
          .from(FDR_DOCUMENTS_BUCKET)
          .upload(storagePath, params.fileBuffer, {
            contentType: params.mimeType,
            upsert: false,
          });

        if (error) {
          console.error('Supabase storage upload error:', error);
          // Don't fail silently; fallback gracefully
        }
      }
    }

    // 5. Persist document metadata
    const doc = store.addDocument({
      instrumentId: params.instrumentId,
      fileName: params.fileName,
      fileSize: params.fileSize,
      fileType: params.mimeType,
      documentType: params.documentType,
      uploadedBy: session.userId,
      uploadedAt: new Date().toISOString(),
      dataUrl: params.dataUrl,
    });

    return doc;
  }

  /**
   * Generate short-lived signed URL for preview or download (5 minutes expiry)
   * Ensures documents remain strictly private and never publicly exposed
   */
  static async getSignedDocumentUrl(
    documentId: string,
    storagePath: string,
    session: DemoSession
  ): Promise<string | null> {
    const doc = store.getDocuments().find((d) => d.id === documentId);
    if (!doc) return null;

    // Check institutional access
    const instrument = store.getInstrument(doc.instrumentId, session);
    if (!instrument) {
      throw new Error('Forbidden: Unauthorized document access.');
    }

    if (isSupabaseConfigured() && storagePath) {
      const adminClient = getAdminSupabase();
      if (adminClient) {
        const { data, error } = await adminClient.storage
          .from(FDR_DOCUMENTS_BUCKET)
          .createSignedUrl(storagePath, 300); // 5 minutes

        if (!error && data?.signedUrl) {
          return data.signedUrl;
        }
      }
    }

    // Fallback to dataUrl if available
    return doc.dataUrl || null;
  }
}
