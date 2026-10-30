// ============================================================================
// Sakshya PS 1 — Real Document Understanding & Intelligence Adapter
// Classifies FDR-related documents, extracts structured fields with provenance,
// computes suitability assessments, and separates document suitability from bank authenticity.
// ============================================================================

import {
  DocumentClassificationType, DocumentExtractionData, ExtractedFieldMap,
  ExtractedFieldItem, DocumentSuitabilityAssessment, InstrumentAuthenticityAssessment
} from './types';
import { extractTextFromPdfBuffer } from './pdf-extractor';

export interface RawExtractionInput {
  fileName: string;
  fileBuffer?: Buffer;
  textContent?: string;
  documentId?: string;
  instrumentId?: string;
  fileSize?: number;
}

// Known Indian Commercial Banks for High-Confidence Extraction
const KNOWN_BANKS = [
  'State Bank of India', 'Bank of Baroda', 'Punjab National Bank',
  'Canara Bank', 'Union Bank of India', 'Bank of India',
  'Bank of Maharashtra', 'Central Bank of India', 'Indian Bank',
  'Indian Overseas Bank', 'UCO Bank', 'Punjab & Sind Bank',
  'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank',
  'Federal Bank', 'IndusInd Bank', 'IDBI Bank'
];

/**
 * Mask sensitive account/instrument identifiers for privacy preservation.
 * e.g., "SBI-FDR-90001234" -> "SBI-FDR-XXXX1234"
 * e.g., "450067891234" -> "XXXXXXXX1234"
 */
export function maskSensitiveIdentifier(identifier?: string): string {
  if (!identifier) return 'XXXX';
  const clean = String(identifier).trim();
  if (clean.length <= 4) return clean;
  const lastFour = clean.slice(-4);
  const prefix = clean.includes('-') ? clean.slice(0, clean.lastIndexOf('-') + 1) : '';
  return `${prefix}XXXX${lastFour}`;
}

/**
 * Classifies document based on text content and filename.
 * Notice: A document titled "Deposit Advice" is explicitly classified as `deposit_advice`
 * and NEVER rejected merely because it does not say "FDR".
 */
export function classifyDocument(text: string, fileName: string = ''): { type: DocumentClassificationType; confidence: number; rationale: string } {
  const t = (text || '').toLowerCase();
  const fn = (fileName || '').toLowerCase();

  // 1. Bank Deposit Advice / Term Deposit Advice
  if (
    t.includes('deposit advice') || t.includes('term deposit advice') ||
    t.includes('fixed deposit advice') || t.includes('fdr advice') ||
    fn.includes('deposit_advice') || fn.includes('deposit advice') ||
    fn.includes('advice')
  ) {
    return {
      type: 'deposit_advice',
      confidence: 0.94,
      rationale: 'Identified as Bank Deposit Advice / Term Deposit Advice containing deposit terms and maturity instructions.',
    };
  }

  // 2. Affidavit 6
  if (
    t.includes('affidavit 6') || t.includes('affidavit no. 6') ||
    t.includes('affidavit-6') || (t.includes('affidavit') && t.includes('aicte') && t.includes('release')) ||
    fn.includes('affidavit')
  ) {
    return {
      type: 'affidavit_6',
      confidence: 0.96,
      rationale: 'Identified as Statutory Affidavit 6 sworn under AICTE Approval Process Handbook guidelines.',
    };
  }

  // 3. FDR / Term Deposit Certificate
  if (
    t.includes('fixed deposit receipt') || t.includes('term deposit receipt') ||
    t.includes('fdr certificate') || t.includes('special term deposit receipt') ||
    fn.includes('fdr') || fn.includes('receipt')
  ) {
    return {
      type: 'fdr_certificate',
      confidence: 0.95,
      rationale: 'Identified as an official Fixed Deposit Receipt (FDR) / Term Deposit Certificate.',
    };
  }

  // 4. Formal Release Application Letter
  if (
    t.includes('release of fdr') || t.includes('refund of security deposit') ||
    t.includes('application for release') || t.includes('request letter') ||
    fn.includes('request') || fn.includes('release_letter')
  ) {
    return {
      type: 'release_request_letter',
      confidence: 0.91,
      rationale: 'Identified as a formal institutional application requesting release of security deposit.',
    };
  }

  // 5. Letter of Approval / Extension of Approval
  if (
    t.includes('extension of approval') || t.includes('letter of approval') ||
    t.includes('approval process handbook') || fn.includes('eoa') || fn.includes('loa')
  ) {
    return {
      type: 'eoa_loa',
      confidence: 0.93,
      rationale: 'Identified as an official AICTE Letter of Approval (LoA) or Extension of Approval (EoA).',
    };
  }

  // 6. Cell / Bureau Clearance or NOC
  if (
    t.includes('no objection certificate') || t.includes('pgrc clearance') ||
    t.includes('vigilance clearance') || fn.includes('noc') || fn.includes('clearance')
  ) {
    return {
      type: 'clearance_noc',
      confidence: 0.90,
      rationale: 'Identified as an administrative No Objection Certificate or Cell Clearance record.',
    };
  }

  // 7. Payment Proof / RTGS Challan
  if (
    t.includes('rtgs') || t.includes('neft') || t.includes('counterfoil') ||
    t.includes('payment receipt') || fn.includes('payment') || fn.includes('challan')
  ) {
    return {
      type: 'payment_proof',
      confidence: 0.88,
      rationale: 'Identified as RTGS/NEFT payment evidence or security deposit creation transaction proof.',
    };
  }

  return {
    type: 'other',
    confidence: 0.65,
    rationale: 'Document classification indeterminate based on available text patterns.',
  };
}

/**
 * Extracts structured key-value fields from document text with provenance and confidence.
 */
export function extractFieldsFromText(text: string): ExtractedFieldMap {
  const fields: ExtractedFieldMap = {};
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // 1. Bank Name Extraction
  for (const bank of KNOWN_BANKS) {
    if (new RegExp(`\\b${bank}\\b`, 'i').test(text)) {
      const matchIdx = text.search(new RegExp(`\\b${bank}\\b`, 'i'));
      fields.bankName = {
        value: bank,
        confidence: 0.95,
        sourceSnippet: text.slice(Math.max(0, matchIdx - 20), Math.min(text.length, matchIdx + bank.length + 30)),
        extractionMethod: 'structured_regex',
      };
      break;
    }
  }

  // 2. FDR / Receipt / Account Number Extraction
  const fdrRegexes = [
    /(SBI-FDR-[0-9]{6,12}|BOB-FDR-[0-9]{6,12}|PNB-FDR-[0-9]{6,12}|FDR-[0-9]{6,12}|TEST-FDR-[0-9]{3,8})/i,
    /(?:Deposit\s*Reference|FDR\s*(?:No|Ref|#)|Receipt\s*(?:No|#)|Certificate\s*(?:No|#))[.\s:#-]+([A-Z0-9/-]{6,25})/i,
    /(?:Account\s*(?:Number|No)|A\/c\s*No\.?)[.\s:#-]+([0-9]{9,18})/i,
    /(?:FDR|Receipt|Certificate)[.\s:#-]+([0-9]{6,20})/i,
    /\b([0-9]{13,18})\b/,
  ];

  for (const regex of fdrRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const rawVal = match[1].trim();
      if (/^(?:NUMBER|AMOUNT|HOLDER|BRANCH|DETAILS)$/i.test(rawVal)) continue;
      if (rawVal.toLowerCase().includes('http') || rawVal.toLowerCase().includes('.html') || rawVal.toLowerCase().includes('mailers')) continue;
      fields.fdrNumber = {
        value: rawVal,
        confidence: 0.92,
        sourceSnippet: match[0],
        extractionMethod: 'structured_regex',
        isMasked: true,
        maskedValue: maskSensitiveIdentifier(rawVal),
      };
      break;
    }
  }

  // 3. Deposit Principal Amount Extraction
  const amountRegexes = [
    /(?:Deposit\s*Amount|Principal\s*Amount|Principal|Sum\s*of\s*Rs\.?|Amount)[.\s:₹RsINR-]+([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{2})?)/i,
    /(?:INR|Rs\.?|₹)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{2})?)/i,
    /₹\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{2})?)/,
    /Rs\.?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{2})?)/i,
  ];

  for (const regex of amountRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      const rawNum = match[1].replace(/,/g, '');
      const parsed = parseFloat(rawNum);
      if (!isNaN(parsed) && parsed >= 1000) {
        fields.depositAmount = {
          value: parsed,
          confidence: 0.91,
          sourceSnippet: match[0],
          extractionMethod: 'structured_regex',
        };
        break;
      }
    }
  }

  // 3b. Fallback Crore / Lakh word representation (e.g. "Rs. 1 Crore", "50 Lakh")
  if (!fields.depositAmount) {
    const croreMatch = text.match(/(?:Rs\.?|INR|₹)?\s*([0-9]+(?:\.[0-9]+)?)\s*Crore/i);
    const lakhMatch = text.match(/(?:Rs\.?|INR|₹)?\s*([0-9]+(?:\.[0-9]+)?)\s*Lakh/i);
    if (croreMatch && croreMatch[1]) {
      fields.depositAmount = {
        value: Math.round(parseFloat(croreMatch[1]) * 10000000),
        confidence: 0.92,
        sourceSnippet: croreMatch[0],
        extractionMethod: 'structured_regex',
      };
    } else if (lakhMatch && lakhMatch[1]) {
      fields.depositAmount = {
        value: Math.round(parseFloat(lakhMatch[1]) * 100000),
        confidence: 0.90,
        sourceSnippet: lakhMatch[0],
        extractionMethod: 'structured_regex',
      };
    }
  }

  // 4. Interest Rate Extraction
  const rateMatch = text.match(/(?:Rate\s*of\s*Interest|Interest\s*Rate|ROI)[.\s:%]*([0-9]{1,2}(?:\.[0-9]{1,3})?)\s*%/i) ||
                    text.match(/([0-9]{1,2}\.[0-9]{1,2})\s*(?:%|INR|[0-9]{2}-[0-9]{2}-[0-9]{4})/);
  if (rateMatch && rateMatch[1]) {
    fields.interestRate = {
      value: parseFloat(rateMatch[1]),
      confidence: 0.88,
      sourceSnippet: rateMatch[0],
      extractionMethod: 'structured_regex',
    };
  }

  // 5. Issue / Start Date Extraction
  const issueMatch = text.match(/(?:Date\s*of\s*Issue|Issue\s*Date|Start\s*Date|Date\s*of\s*Deposit|Deposit\s*Date)[.\s:]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  if (issueMatch && issueMatch[1]) {
    fields.issueDate = {
      value: normalizeDateString(issueMatch[1]),
      confidence: 0.90,
      sourceSnippet: issueMatch[0],
      extractionMethod: 'structured_regex',
    };
  }

  // 6. Maturity Date Extraction
  const maturityMatch = text.match(/(?:Maturity\s*Date|Due\s*Date|Date\s*of\s*Maturity)[.\s:]*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i);
  if (maturityMatch && maturityMatch[1]) {
    fields.maturityDate = {
      value: normalizeDateString(maturityMatch[1]),
      confidence: 0.94,
      sourceSnippet: maturityMatch[0],
      extractionMethod: 'structured_regex',
    };
  }

  // Tabular Date Pair Fallback (Handles table row format: "Start Date Maturity Date ... 14-01-2025 15-06-2026")
  if (!fields.issueDate || !fields.maturityDate) {
    const datePairMatch = text.match(/(?:Start\s*Date[\s\S]{0,100}?Maturity\s*Date[\s\S]{0,200}?)([0-9]{2}-[0-9]{2}-[0-9]{4})\s+([0-9]{2}-[0-9]{2}-[0-9]{4})/i) ||
                          text.match(/([0-9]{2}-[0-9]{2}-[0-9]{4})\s+([0-9]{2}-[0-9]{2}-[0-9]{4})/);
    if (datePairMatch) {
      if (!fields.issueDate) {
        fields.issueDate = {
          value: normalizeDateString(datePairMatch[1]),
          confidence: 0.92,
          sourceSnippet: `Tabular Start Date: ${datePairMatch[1]}`,
          extractionMethod: 'structured_regex',
        };
      }
      if (!fields.maturityDate) {
        fields.maturityDate = {
          value: normalizeDateString(datePairMatch[2]),
          confidence: 0.94,
          sourceSnippet: `Tabular Maturity Date: ${datePairMatch[2]}`,
          extractionMethod: 'structured_regex',
        };
      }
    }
  }

  // 7. Maturity Instruction Extraction (Auto-Renewal vs Credit)
  const renewMatch = text.match(/Maturity\s*Instruction\s*:\s*([A-Za-z0-9\s]{4,30}?)(?=\s*(?:Note|Premature|\*|\n|\r|$))/i) ||
                    text.match(/(Auto[-\s]Renewal(?:\s+for\s+same\s+period)?|Auto\s+Renewal\s+Mode|Renew\s+automatically|Do\s+not\s+renew|Credit\s+to\s+account|Pay\s+on\s+maturity)/i);
  if (renewMatch) {
    fields.maturityInstruction = {
      value: renewMatch[1].trim(),
      confidence: 0.89,
      sourceSnippet: renewMatch[0],
      extractionMethod: 'structured_regex',
    };
  }

  // 8. Joint Holder & Lien / Pledge Status
  const jointMatch = text.match(/Joint\s*Holder\s*:\s*([A-Za-z\s]{3,30}?)(?=\s*(?:Account|Deposit|FDR|Pincode|Phone|\n|\r|$))/i) ||
                     text.match(/(?:Jointly\s*with|Joint\s*Holder|In\s*Joint\s*Names\s*of)[.\s:]*([^\n\r;]{5,80})/i) ||
                     text.match(/(Regional\s*Officer,\s*AICTE[^\n\r;]*|AICTE,\s*New\s*Delhi)/i);
  if (jointMatch) {
    fields.jointHolder = {
      value: jointMatch[1].trim(),
      confidence: 0.92,
      sourceSnippet: jointMatch[0],
      extractionMethod: 'structured_regex',
    };
  }

  const lienMatch = text.match(/(Lien\s*marked(?:\s+in\s+favour\s+of\s+AICTE)?|Pledged\s+to\s+AICTE|Non-transferable|Not\s+transferable|Under\s+lien)/i);
  if (lienMatch) {
    fields.lienPledgeStatus = {
      value: lienMatch[1].trim(),
      confidence: 0.91,
      sourceSnippet: lienMatch[0],
      extractionMethod: 'structured_regex',
    };
  }

  // 9. Branch Name Extraction
  const branchMatch = text.match(/(?:Branch|Branch\s*Name)[.\s:]*([A-Za-z0-9\s,-]{4,40})(?:\s+IFSC|\s+Pin|\n|\r)/i);
  if (branchMatch && branchMatch[1]) {
    fields.branchName = {
      value: branchMatch[1].trim(),
      confidence: 0.85,
      sourceSnippet: branchMatch[0],
      extractionMethod: 'heuristic',
    };
  }

  // 10. Depositor / Institutional Account Holder Name Extraction
  const depositorMatch = text.match(/(?:Depositor\s*Name|Name\s*of\s*Depositor|Customer\s*Name|Account\s*Name|Holder\s*Text|Trust\s*\/\s*Society|Institution)[.\s:#-]+([A-Za-z0-9\s.,&'()-]{4,60})(?=\s*(?:Address|Joint|A\/c|FDR|Account|CIF|\n|\r|$))/i);
  if (depositorMatch && depositorMatch[1]) {
    const rawDep = depositorMatch[1].trim();
    if (!/^(?:NUMBER|AMOUNT|DETAILS|ADDRESS|DATE|BRANCH|HOLDER)$/i.test(rawDep)) {
      fields.depositorName = {
        value: rawDep,
        confidence: 0.88,
        sourceSnippet: depositorMatch[0],
        extractionMethod: 'structured_regex',
      };
    }
  }

  return fields;
}

const MONTH_MAP: Record<string, string> = {
  jan: '01', january: '01', feb: '02', february: '02', mar: '03', march: '03',
  apr: '04', april: '04', may: '05', jun: '06', june: '06',
  jul: '07', july: '07', aug: '08', august: '08', sep: '09', sept: '09', september: '09',
  oct: '10', october: '10', nov: '11', november: '11', dec: '12', december: '12'
};

/**
 * Standardizes common Indian and international date formats to YYYY-MM-DD.
 */
function normalizeDateString(raw: string): string {
  const clean = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  // Handle textual months, e.g. "14 Jan 2025" or "14-January-2025"
  const textMonthMatch = clean.match(/^(\d{1,2})[\s/-]+([A-Za-z]+)[\s/-]+(\d{2,4})$/);
  if (textMonthMatch) {
    const day = textMonthMatch[1].padStart(2, '0');
    const mStr = textMonthMatch[2].toLowerCase();
    const month = MONTH_MAP[mStr] || '01';
    let year = textMonthMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  const parts = clean.split(/[/-]/);
  if (parts.length === 3) {
    let day = parts[0].padStart(2, '0');
    let monthPart = parts[1].toLowerCase();
    let month = MONTH_MAP[monthPart] || parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) year = `20${year}`;
    if (parseInt(month, 10) > 12 && parseInt(day, 10) <= 12) {
      // Swapped format
      const temp = day;
      day = month;
      month = temp;
    }
    return `${year}-${month}-${day}`;
  }
  return clean;
}

/**
 * Evaluates document suitability (Assessment A) without confusing it with bank authenticity.
 */
export function assessDocumentSuitability(
  type: DocumentClassificationType,
  fields: ExtractedFieldMap
): DocumentSuitabilityAssessment {
  if (type === 'deposit_advice') {
    const hasAmount = Boolean(fields.depositAmount?.value);
    const hasMaturity = Boolean(fields.maturityDate?.value);
    const rawJoint = fields.jointHolder?.value ? String(fields.jointHolder.value).trim().toLowerCase() : '';
    const isJointNotApplicable = rawJoint === 'not applicable' || rawJoint === 'n/a';
    const hasExplicitAiCtePledge = Boolean(
      (rawJoint && !isJointNotApplicable && (rawJoint.includes('aicte') || rawJoint.includes('regional officer'))) ||
      (fields.lienPledgeStatus?.value && String(fields.lienPledgeStatus.value).toLowerCase().includes('aicte'))
    );

    let rationale = '';
    if (hasExplicitAiCtePledge) {
      rationale = 'Document is classified as Bank Deposit Advice with explicit joint AICTE pledge endorsement. Classified as candidate supporting document requiring review against Clause 6.46(a)(iii) and independent branch verification, rather than an explicit statutory FDR equivalent.';
    } else if (isJointNotApplicable) {
      rationale = 'Document is classified as Bank Deposit Advice (candidate supporting document requiring review against Clause 6.46(a)(iii) rather than statutory equivalence). Note: Advice face indicates Joint Holder as "Not Applicable". This is retained as an operational manual-review check to reference Appendix 8 / Affidavit 6 for the joint-name declaration, not as an automated fraud determination or conclusive violation.';
    } else {
      rationale = 'Document is classified as Bank Deposit Advice (candidate supporting document requiring scrutiny review against Clause 6.46(a)(iii) and independent branch verification).';
    }

    return {
      status: hasAmount && hasMaturity ? 'conditionally_suitable' : 'pending_review',
      documentCategory: 'deposit_advice',
      meetsChecklistCriteria: hasAmount && hasMaturity,
      rationale,
      distinctionNote: 'Assessment A (Suitability): Verifies document structure and checklist presence. It does NOT constitute independent bank authenticity verification.',
    };
  }

  if (type === 'fdr_certificate') {
    return {
      status: 'suitable',
      documentCategory: 'fdr_certificate',
      meetsChecklistCriteria: true,
      rationale: 'Official Fixed Deposit Receipt (FDR) structure meets primary evidence standard under AICTE APH Appendix 8.',
      distinctionNote: 'Assessment A (Suitability): Meets primary evidence criteria. Assessment B (Bank Authenticity) remains subject to independent confirmation.',
    };
  }

  if (type === 'affidavit_6') {
    return {
      status: 'suitable',
      documentCategory: 'affidavit_6',
      meetsChecklistCriteria: true,
      rationale: 'Statutory Affidavit 6 declaration corresponds to AICTE APH Appendix 8 format.',
      distinctionNote: 'Assessment A (Suitability): Legal undertaking presence confirmed.',
    };
  }

  return {
    status: 'pending_review',
    documentCategory: type,
    meetsChecklistCriteria: false,
    rationale: 'Document classification requires authorized officer confirmation of checklist suitability.',
    distinctionNote: 'Reviewer manual confirmation required.',
  };
}

/**
 * Provides the explicit Assessment B (Instrument Authenticity) baseline.
 */
export function assessInstrumentAuthenticity(
  verificationResult?: { verifiedBySource: boolean; method?: string; officerName?: string }
): InstrumentAuthenticityAssessment {
  if (verificationResult?.verifiedBySource) {
    return {
      status: 'authorized_source_verified',
      method: 'direct_bank_api',
      verifiedBy: verificationResult.officerName || 'Authorized Financial Channel',
      verifiedAt: new Date().toISOString(),
      rationale: 'Underlying financial instrument verified through direct authorized banking channel.',
    };
  }

  return {
    status: 'manual_confirmation_pending',
    method: 'unverified_pending',
    rationale: 'Document extracted from uploaded PDF; instrument authenticity remains pending independent bank verification or authorized officer branch confirmation.',
  };
}

/**
 * Main entrance: processes an uploaded document buffer or text into a full extraction bundle.
 */
export function processUploadedEvidence(input: RawExtractionInput): DocumentExtractionData {
  let extractedText = input.textContent || '';
  let pageCount = 1;

  if (input.fileBuffer) {
    const pdfRes = extractTextFromPdfBuffer(input.fileBuffer);
    if (pdfRes.text) {
      extractedText = pdfRes.text;
      pageCount = pdfRes.pageCount;
    }
  }

  // 1. Classification
  const classification = classifyDocument(extractedText, input.fileName);

  // 2. Field Extraction
  const fields = extractFieldsFromText(extractedText);

  // 3. Suitability Assessment (Assessment A)
  const suitability = assessDocumentSuitability(classification.type, fields);

  return {
    documentId: input.documentId || `doc-${Date.now().toString().slice(-6)}`,
    instrumentId: input.instrumentId || 'unassigned',
    fileName: input.fileName,
    fileSize: input.fileSize || (input.fileBuffer ? input.fileBuffer.length : 1024),
    classification: classification.type,
    classificationConfidence: classification.confidence,
    fields,
    suitabilityAssessment: suitability,
    pageCount,
    rawTextSnippet: extractedText.slice(0, 500),
  };
}

/**
 * Asynchronously processes an uploaded document buffer or text into a full extraction bundle.
 * Supports native PDF text stream inflation AND Tesseract.js OCR for images or scanned PDFs.
 */
export async function processUploadedEvidenceAsync(input: RawExtractionInput): Promise<DocumentExtractionData> {
  let extractedText = input.textContent || '';
  let pageCount = 1;
  let ocrUsed = false;

  if (input.fileBuffer) {
    const isPdf =
      input.fileName.toLowerCase().endsWith('.pdf') ||
      (input.fileBuffer.length > 4 && input.fileBuffer.slice(0, 4).toString('ascii') === '%PDF');

    if (isPdf) {
      const pdfRes = extractTextFromPdfBuffer(input.fileBuffer);
      if (pdfRes.text && pdfRes.text.trim().length > 25) {
        extractedText = pdfRes.text;
        pageCount = pdfRes.pageCount;
      }
    }

    // If still no text or very short (< 25 chars), and file is an image or scanned document:
    if (!extractedText.trim() || extractedText.trim().length < 25) {
      const isImage = /\.(jpe?g|png|webp|bmp|tiff?)$/i.test(input.fileName);
      if (isImage || !isPdf) {
        try {
          const { createWorker } = await import('tesseract.js');
          const worker = await createWorker('eng');
          const res = await worker.recognize(input.fileBuffer);
          await worker.terminate();
          if (res?.data?.text && res.data.text.trim()) {
            extractedText = res.data.text.trim();
            ocrUsed = true;
          }
        } catch (ocrErr) {
          console.warn('Tesseract OCR image recognition skipped or failed:', ocrErr);
        }
      }
    }
  }

  // 1. Classification
  const classification = classifyDocument(extractedText, input.fileName);

  // 2. Field Extraction
  const fields = extractFieldsFromText(extractedText);
  if (ocrUsed) {
    Object.keys(fields).forEach(k => {
      if (fields[k] && fields[k]?.extractionMethod === 'structured_regex') {
        fields[k]!.extractionMethod = 'ocr';
      }
    });
  }

  // 3. Suitability Assessment (Assessment A)
  const suitability = assessDocumentSuitability(classification.type, fields);

  return {
    documentId: input.documentId || `doc-${Date.now().toString().slice(-6)}`,
    instrumentId: input.instrumentId || 'unassigned',
    fileName: input.fileName,
    fileSize: input.fileSize || (input.fileBuffer ? input.fileBuffer.length : 1024),
    classification: classification.type,
    classificationConfidence: classification.confidence,
    fields,
    suitabilityAssessment: suitability,
    pageCount,
    rawTextSnippet: extractedText.slice(0, 500),
  };
}

