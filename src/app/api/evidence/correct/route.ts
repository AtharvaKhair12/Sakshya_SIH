import { NextResponse } from 'next/server';
import { logAuditEvent, DemoSession } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { documentId, instrumentId, fieldName, originalValue, correctedValue, reason, session } = body;

    if (!documentId || !fieldName || correctedValue === undefined) {
      return NextResponse.json(
        { success: false, error: 'documentId, fieldName, and correctedValue are required.' },
        { status: 400 }
      );
    }

    const demoSession: DemoSession = session || {
      userId: 'user-003',
      role: 'scrutiny_officer',
      loginAt: new Date().toISOString(),
    };

    // Log Consequential State Change in Immutable Audit Trail
    logAuditEvent({
      userId: demoSession.userId,
      userName: demoSession.userId,
      userRole: demoSession.role,
      entityType: 'document',
      entityId: documentId,
      action: 'instrument_updated',
      previousValue: String(originalValue || 'none'),
      newValue: String(correctedValue),
      reason: reason || `Human reviewer correction for field ${fieldName}`,
    });

    return NextResponse.json({
      success: true,
      message: `Field ${fieldName} successfully corrected by authorized reviewer.`,
      correction: {
        documentId,
        fieldName,
        originalValue,
        correctedValue,
        correctedAt: new Date().toISOString(),
        correctedBy: demoSession.userId,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Correction recording failed.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
