// ============================================================================
// Sakshya PS 1 — Native Pure TypeScript PDF Stream & Text Extractor
// Extracts clean text streams and metadata without external native binary dependencies.
// Compatible with Next.js Turbopack, Node.js and Serverless.
// ============================================================================

import zlib from 'zlib';

export interface PdfExtractionResult {
  text: string;
  pages: string[];
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
  };
  hasTextStream: boolean;
  extractionMethod: 'pdf_stream_inflate' | 'ascii_stream_scan' | 'trailer_metadata';
  error?: string;
}

/**
 * Clean and unescape PDF string literal content.
 */
function decodePdfLiteralString(str: string): string {
  let res = '';
  let i = 0;
  while (i < str.length) {
    const c = str[i];
    if (c === '\\' && i + 1 < str.length) {
      const next = str[i + 1];
      if (next === 'n') { res += '\n'; i += 2; continue; }
      if (next === 'r') { res += '\r'; i += 2; continue; }
      if (next === 't') { res += '\t'; i += 2; continue; }
      if (next === 'b') { res += '\b'; i += 2; continue; }
      if (next === 'f') { res += '\f'; i += 2; continue; }
      if (next === '(' || next === ')' || next === '\\') { res += next; i += 2; continue; }
      // Octal escape \ddd
      if (/[0-7]/.test(next)) {
        let octal = next;
        if (i + 2 < str.length && /[0-7]/.test(str[i + 2])) octal += str[i + 2];
        if (i + 3 < str.length && /[0-7]/.test(str[i + 3])) octal += str[i + 3];
        res += String.fromCharCode(parseInt(octal, 8));
        i += 1 + octal.length;
        continue;
      }
      res += next;
      i += 2;
    } else {
      res += c;
      i++;
    }
  }
  return res;
}

/**
 * Extracts text from PDF text operators (Tj, TJ, ', ") inside a stream buffer.
 */
function extractTextFromContentStream(streamContent: string): string {
  const textPieces: string[] = [];

  // Match text objects between BT and ET
  const textObjectRegex = /BT\s*([\s\S]*?)\s*ET/g;
  let match: RegExpExecArray | null;

  while ((match = textObjectRegex.exec(streamContent)) !== null) {
    const btContent = match[1];

    // 1. Array text operator: [(string) -10 (string)] TJ
    const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let arrMatch: RegExpExecArray | null;
    while ((arrMatch = tjArrayRegex.exec(btContent)) !== null) {
      const inner = arrMatch[1];
      const stringLiteralRegex = /\(([\s\S]*?)\)/g;
      let litMatch: RegExpExecArray | null;
      let combined = '';
      while ((litMatch = stringLiteralRegex.exec(inner)) !== null) {
        combined += decodePdfLiteralString(litMatch[1]);
      }
      if (combined.trim()) textPieces.push(combined);
    }

    // 2. Simple text operator: (string) Tj or ' or "
    const tjSingleRegex = /\(([\s\S]*?)\)\s*(?:Tj|'|")/g;
    let singleMatch: RegExpExecArray | null;
    while ((singleMatch = tjSingleRegex.exec(btContent)) !== null) {
      const decoded = decodePdfLiteralString(singleMatch[1]);
      if (decoded.trim()) textPieces.push(decoded);
    }

    // 3. Hex string text operator: <48656c6c6f> Tj
    const hexTjRegex = /<([0-9a-fA-F]+)>\s*(?:Tj|'|")/g;
    let hexMatch: RegExpExecArray | null;
    while ((hexMatch = hexTjRegex.exec(btContent)) !== null) {
      const hex = hexMatch[1];
      let decoded = '';
      for (let k = 0; k < hex.length; k += 2) {
        decoded += String.fromCharCode(parseInt(hex.slice(k, k + 2), 16));
      }
      if (decoded.trim()) textPieces.push(decoded);
    }
  }

  return textPieces.join(' ');
}

/**
 * Decodes Adobe ASCII85 (btoa) encoded stream data.
 */
export function decodeAscii85(input: string | Buffer): Buffer {
  let str = typeof input === 'string' ? input : input.toString('binary');
  const startIdx = str.indexOf('<~');
  if (startIdx !== -1) str = str.slice(startIdx + 2);
  const endIdx = str.indexOf('~>');
  if (endIdx !== -1) str = str.slice(0, endIdx);

  str = str.replace(/\s+/g, '');
  const out: number[] = [];
  let tuple = 0;
  let count = 0;

  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === 'z' && count === 0) {
      out.push(0, 0, 0, 0);
      continue;
    }
    const code = c.charCodeAt(0);
    if (code >= 33 && code <= 117) {
      tuple = tuple * 85 + (code - 33);
      count++;
      if (count === 5) {
        out.push(
          (tuple >>> 24) & 0xff,
          (tuple >>> 16) & 0xff,
          (tuple >>> 8) & 0xff,
          tuple & 0xff
        );
        tuple = 0;
        count = 0;
      }
    }
  }

  if (count > 1) {
    for (let i = count; i < 5; i++) {
      tuple = tuple * 85 + 84;
    }
    for (let i = 0; i < count - 1; i++) {
      out.push((tuple >>> (24 - i * 8)) & 0xff);
    }
  }

  return Buffer.from(out);
}

/**
 * Extracts text and metadata from a PDF buffer natively.
 */
export function extractTextFromPdfBuffer(pdfBuffer: Buffer): PdfExtractionResult {
  try {
    const bufferStr = pdfBuffer.toString('binary');
    const pages: string[] = [];
    const streamRegex = /stream[\r\n]+([\s\S]*?)(?:\r?\n)?endstream/g;

    let match: RegExpExecArray | null;
    let streamIndex = 0;
    let extractedCount = 0;

    // Search for stream headers before each stream
    while ((match = streamRegex.exec(bufferStr)) !== null) {
      const rawStream = match[1];
      const streamStart = match.index;
      const precedingChunk = bufferStr.slice(Math.max(0, streamStart - 350), streamStart);

      const isAscii85 = precedingChunk.includes('/ASCII85Decode');
      const isFlate = precedingChunk.includes('/FlateDecode');
      let streamText = '';

      let rawBytes: Buffer = Buffer.from(rawStream, 'binary') as any;
      if (isAscii85) {
        try {
          rawBytes = decodeAscii85(rawBytes) as any;
        } catch {
          // Fall back to raw stream bytes if ascii85 decode errors
        }
      }

      if (isFlate) {
        try {
          const decompressed = zlib.inflateSync(rawBytes);
          streamText = extractTextFromContentStream(decompressed.toString('utf-8'));
        } catch {
          // If pure inflate fails (e.g. raw deflate without zlib header)
          try {
            const decompressed = zlib.inflateRawSync(rawBytes);
            streamText = extractTextFromContentStream(decompressed.toString('utf-8'));
          } catch {
            // Fallback to text inside raw stream
            streamText = extractTextFromContentStream(rawBytes.toString('utf-8'));
          }
        }
      } else {
        streamText = extractTextFromContentStream(rawBytes.toString('utf-8'));
      }

      if (streamText.trim()) {
        pages.push(streamText.trim());
        extractedCount++;
      }
      streamIndex++;
    }

    // Extract metadata from trailer/info dictionary
    const metadata: PdfExtractionResult['metadata'] = {};
    const titleMatch = bufferStr.match(/\/Title\s*\(([\s\S]*?)\)/);
    if (titleMatch) metadata.title = decodePdfLiteralString(titleMatch[1]);
    const authorMatch = bufferStr.match(/\/Author\s*\(([\s\S]*?)\)/);
    if (authorMatch) metadata.author = decodePdfLiteralString(authorMatch[1]);
    const creatorMatch = bufferStr.match(/\/Creator\s*\(([\s\S]*?)\)/);
    if (creatorMatch) metadata.creator = decodePdfLiteralString(creatorMatch[1]);

    const combinedText = pages.join('\n\n');

    // If streams had no text (e.g. ASCII format or scanned PDF), scan plain text chunks
    if (!combinedText.trim()) {
      const plainTextMatches: string[] = [];
      const literalScan = /\(([\w\s.,;:/\-₹&@()]{4,})\)/g;
      let lit: RegExpExecArray | null;
      while ((lit = literalScan.exec(bufferStr)) !== null) {
        const decoded = decodePdfLiteralString(lit[1]);
        if (decoded.length > 3 && !decoded.includes('/')) {
          plainTextMatches.push(decoded);
        }
      }

      const fallbackText = plainTextMatches.slice(0, 50).join(' ');
      return {
        text: fallbackText,
        pages: fallbackText ? [fallbackText] : [],
        pageCount: fallbackText ? 1 : 0,
        metadata,
        hasTextStream: false,
        extractionMethod: 'ascii_stream_scan',
      };
    }

    return {
      text: combinedText,
      pages,
      pageCount: pages.length || 1,
      metadata,
      hasTextStream: true,
      extractionMethod: 'pdf_stream_inflate',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      text: '',
      pages: [],
      pageCount: 0,
      metadata: {},
      hasTextStream: false,
      extractionMethod: 'pdf_stream_inflate',
      error: errorMsg,
    };
  }
}
