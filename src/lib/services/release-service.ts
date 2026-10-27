// ============================================================================
// Sakshya — Security Deposit Release / Refund Workflow Service
// Enforces complete lifecycle from submission, scrutiny review, to Senior Officer decision
// ============================================================================

import {
  ReleaseRequest, ReleaseRequestStatus, Instrument, DemoSession
} from '../types';
import * as store from '../store';
import { canPerformAction } from '../permissions';

export interface SubmitReleaseRequestInput {
  instrumentId: string;
  reason: string;
  supportingDocuments: string[];
}

export class ReleaseService {
  /**
   * Institution submits release/refund request with mandatory grounds and supporting evidence
   */
  static submitRequest(
    input: SubmitReleaseRequestInput,
    session: DemoSession
  ): ReleaseRequest {
    if (session.role !== 'institution') {
      throw new Error('Unauthorized: Only Institution Users can initiate FDR release requests.');
    }

    const instrument = store.getInstrument(input.instrumentId, session);
    if (!instrument) {
      throw new Error(`Instrument ${input.instrumentId} not found or inaccessible.`);
    }

    // Check institutional ownership
    if (session.institutionId && instrument.institutionId !== session.institutionId) {
      throw new Error('Forbidden: Cannot request release for another institution\'s instrument.');
    }

    // Release requests require non-empty reason
    if (!input.reason || input.reason.trim().length < 10) {
      throw new Error('Mandatory justification: Please provide detailed grounds for the release request (minimum 10 characters).');
    }

    // Must have at least one supporting document (e.g. NOC, completion certificate)
    if (!input.supportingDocuments || input.supportingDocuments.length === 0) {
      throw new Error('Supporting documentation required: At least one document (NOC, audit clearance, or closure proof) must accompany the release request.');
    }

    const request = store.createReleaseRequest({
      instrumentId: input.instrumentId,
      institutionId: instrument.institutionId,
      requestDate: new Date().toISOString(),
      reason: input.reason.trim(),
      supportingDocuments: input.supportingDocuments,
      createdBy: session.userId,
    });

    // Update instrument status to release_requested
    store.updateInstrumentStatus(
      instrument.id,
      'release_requested',
      `Release request ${request.id} submitted by institution: ${input.reason}`,
      session
    );

    return request;
  }

  /**
   * Scrutiny Officer records scrutiny observations and completeness check
   */
  static recordScrutinyReview(
    requestId: string,
    observation: string,
    requiresAdditionalDocs: boolean,
    session: DemoSession
  ): ReleaseRequest {
    if (session.role !== 'scrutiny_officer' && session.role !== 'senior_officer') {
      throw new Error('Unauthorized: Only Scrutiny or Senior Officers can review release requests.');
    }

    const request = store.getReleaseRequest(requestId, session);
    if (!request) {
      throw new Error(`Release request ${requestId} not found.`);
    }

    const newStatus: ReleaseRequestStatus = requiresAdditionalDocs
      ? 'additional_documents_required'
      : 'pending_senior_decision';

    const updated = store.updateReleaseRequest(
      requestId,
      {
        scrutinyObservation: observation,
        scrutinyOfficerId: session.userId,
        status: newStatus,
      },
      session
    );

    if (!updated) {
      throw new Error('Failed to update release request.');
    }

    return updated;
  }

  /**
   * Senior Officer records final decision (Approved / Declined / Returned)
   * Mandatory decision reason is strictly enforced.
   * Auditor and Administrator CANNOT call this.
   */
  static recordSeniorDecision(
    requestId: string,
    decision: 'approved' | 'declined' | 'returned',
    reason: string,
    session: DemoSession
  ): ReleaseRequest {
    if (!canPerformAction(session, 'make_release_decision')) {
      throw new Error('Unauthorized: Only Senior Officers possess legal authority to approve or decline FDR release requests.');
    }

    if (!reason || reason.trim().length < 5) {
      throw new Error('Mandatory decision reason: A detailed rationale must be recorded for audit compliance.');
    }

    const result = store.makeReleaseDecision(requestId, decision, reason.trim(), session);
    if (!result) {
      throw new Error(`Release request ${requestId} not found or could not be updated.`);
    }

    return result;
  }

  /**
   * List release requests with RBAC scoping
   */
  static getReleaseRequests(session?: DemoSession | null): ReleaseRequest[] {
    return store.getReleaseRequests({}, session);
  }

  /**
   * Get release request by ID
   */
  static getReleaseRequestById(id: string, session?: DemoSession | null): ReleaseRequest | undefined {
    return store.getReleaseRequest(id, session);
  }
}
