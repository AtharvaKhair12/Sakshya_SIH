import { NextResponse } from 'next/server';
import { processUploadedEvidence } from '@/lib/document-intelligence';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    // Handle Multipart Form Data (Real File Upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const instrumentId = (formData.get('instrumentId') as string) || 'unassigned';

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file uploaded in form data' }, { status: 400 });
      }

      // Security Check: File Size Limit (10MB max)
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ success: false, error: 'File size exceeds maximum permitted 10MB limit.' }, { status: 400 });
      }

      // Read array buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Process document with native pure-TS PDF extractor & intelligence adapter
      const extraction = processUploadedEvidence({
        fileName: file.name,
        fileBuffer: buffer,
        instrumentId,
        fileSize: file.size,
      });

      return NextResponse.json({
        success: true,
        data: extraction,
      });
    }

    // Handle JSON Payload (Text or simulated document)
    const body = await req.json();
    const { fileName, textContent, instrumentId, documentId } = body;

    if (!fileName && !textContent) {
      return NextResponse.json({ success: false, error: 'File name or text content is required.' }, { status: 400 });
    }

    const extraction = processUploadedEvidence({
      fileName: fileName || 'document.pdf',
      textContent: textContent || '',
      instrumentId: instrumentId || 'unassigned',
      documentId: documentId,
    });

    return NextResponse.json({
      success: true,
      data: extraction,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Document processing failed.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
