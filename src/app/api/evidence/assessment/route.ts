import { NextResponse } from 'next/server';
import { computeCaseAssessment } from '@/lib/case-assessment';
import {
  getInstrument, getInstruments, getDocuments, getVerifications,
  getReleaseRequests, getLifecycleEvents, getAuditEvents
} from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const instrumentId = searchParams.get('instrumentId');

    if (!instrumentId) {
      return NextResponse.json({ success: false, error: 'instrumentId query parameter is required.' }, { status: 400 });
    }

    const instrument = getInstrument(instrumentId);
    if (!instrument) {
      return NextResponse.json({ success: false, error: `Instrument ${instrumentId} not found.` }, { status: 404 });
    }

    const allInstruments = getInstruments();
    const documents = getDocuments(instrumentId);
    const verifications = getVerifications(instrumentId);
    const releaseRequests = getReleaseRequests({ instrumentId });
    const releaseRequest = releaseRequests[0] || null;
    const lifecycleEvents = getLifecycleEvents(instrumentId);
    const auditEvents = getAuditEvents({ entityId: instrumentId });

    const predecessor = instrument.linkedPredecessorId
      ? getInstrument(instrument.linkedPredecessorId)
      : null;

    const replacement = instrument.linkedReplacementId
      ? getInstrument(instrument.linkedReplacementId)
      : null;

    const assessment = computeCaseAssessment({
      instrument,
      documents,
      predecessor,
      replacement,
      releaseRequest,
      verifications,
      lifecycleEvents,
      auditEvents,
      allInstruments,
    });

    return NextResponse.json({
      success: true,
      data: assessment,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to compute case assessment.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
