import { NextResponse } from 'next/server';
import { processUploadedEvidenceAsync } from '@/lib/document-intelligence';
import { checkCredentialsAgainstExtraction, FormCredentials } from '@/lib/credential-checker';

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

      // Security Check: File Size Limit (15MB max)
      const MAX_SIZE = 15 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ success: false, error: 'File size exceeds maximum permitted 15MB limit.' }, { status: 400 });
      }

      // Read array buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Process document with async engine (native PDF stream inflation + Tesseract.js OCR)
      const extraction = await processUploadedEvidenceAsync({
        fileName: file.name,
        fileBuffer: buffer,
        instrumentId,
        fileSize: file.size,
      });

      // Optional credential check if form values passed
      const formFdr = formData.get('fdrNumber') as string | null;
      const formBank = formData.get('bankName') as string | null;
      const formAmount = formData.get('depositAmount') as string | null;
      const formIssue = formData.get('issueDate') as string | null;
      const formMaturity = formData.get('maturityDate') as string | null;
      const formInst = formData.get('institutionName') as string | null;
      const formAishe = formData.get('aisheCode') as string | null;

      let credentialCheck = null;
      if (formFdr || formBank || formAmount || formIssue || formMaturity) {
        credentialCheck = checkCredentialsAgainstExtraction({
          fdrNumber: formFdr || '',
          bankName: formBank || '',
          depositAmount: formAmount ? Number(formAmount) : '',
          issueDate: formIssue || '',
          maturityDate: formMaturity || '',
          institutionName: formInst || '',
          aisheCode: formAishe || '',
        }, extraction);
      }

      return NextResponse.json({
        success: true,
        data: extraction,
        credentialCheck,
      });
    }

    // Handle JSON Payload (Text, base64 or simulated document)
    const body = await req.json();
    const { fileName, textContent, fileBase64, instrumentId, documentId, formCredentials } = body;

    if (!fileName && !textContent && !fileBase64) {
      return NextResponse.json({ success: false, error: 'File name, text content, or base64 file is required.' }, { status: 400 });
    }

    const fileBuffer = fileBase64 ? Buffer.from(fileBase64, 'base64') : undefined;

    const extraction = await processUploadedEvidenceAsync({
      fileName: fileName || 'document.pdf',
      textContent: textContent || '',
      fileBuffer,
      instrumentId: instrumentId || 'unassigned',
      documentId: documentId,
    });

    let credentialCheck = null;
    if (formCredentials) {
      credentialCheck = checkCredentialsAgainstExtraction(formCredentials as FormCredentials, extraction);
    }

    return NextResponse.json({
      success: true,
      data: extraction,
      credentialCheck,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Document processing failed.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
