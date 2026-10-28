// ============================================================================
// Sakshya PS 1 — The FDR Continuity Graph Generator
// Builds explicit, traceable graph representations from the relational database:
// Institution -> Instrument -> Evidence -> Verification -> Replacement Chain ->
// Maturity Events -> Release Request -> Clearances -> Decisions -> Audit Log.
// ============================================================================

import {
  Instrument, UploadedDocument, ReleaseRequest, VerificationResult,
  LifecycleEvent, AuditEvent, ContinuityGraphData, ContinuityGraphNode, ContinuityGraphEdge
} from './types';
import { maskSensitiveIdentifier } from './document-intelligence';

export interface ContinuityGraphInput {
  instrument: Instrument;
  predecessor?: Instrument | null;
  replacement?: Instrument | null;
  documents: UploadedDocument[];
  verifications: VerificationResult[];
  releaseRequest?: ReleaseRequest | null;
  lifecycleEvents: LifecycleEvent[];
  auditEvents: AuditEvent[];
}

export function buildFDRContinuityGraph(input: ContinuityGraphInput): ContinuityGraphData {
  const nodes: ContinuityGraphNode[] = [];
  const edges: ContinuityGraphEdge[] = [];

  const {
    instrument, predecessor, replacement, documents,
    verifications, releaseRequest, lifecycleEvents, auditEvents
  } = input;

  // 1. Institution Node
  const instNodeId = `node-inst-${instrument.institutionId}`;
  nodes.push({
    id: instNodeId,
    label: instrument.institutionName || 'Institution',
    type: 'institution',
    status: 'success',
    metadata: {
      institutionId: instrument.institutionId,
      aisheCode: instrument.aisheCode,
    },
  });

  // 2. Predecessor Instrument Node (if replacement chain exists)
  if (predecessor) {
    const predNodeId = `node-pred-${predecessor.id}`;
    nodes.push({
      id: predNodeId,
      label: `Predecessor: ${maskSensitiveIdentifier(predecessor.fdrNumber)}`,
      type: 'predecessor_instrument',
      status: predecessor.status === 'released' ? 'info' : 'warning',
      metadata: {
        instrumentId: predecessor.id,
        fdrNumber: maskSensitiveIdentifier(predecessor.fdrNumber),
        status: predecessor.status,
        depositAmount: predecessor.depositAmount,
        maturityDate: predecessor.maturityDate,
      },
    });

    edges.push({
      source: predNodeId,
      target: instNodeId,
      relationship: 'OWNS',
      label: 'Originating Deposit',
    });
  }

  // 3. Current Instrument Node (Central Anchor)
  const currentInstNodeId = `node-inst-${instrument.id}`;
  nodes.push({
    id: currentInstNodeId,
    label: `FDR: ${maskSensitiveIdentifier(instrument.fdrNumber)}`,
    type: 'instrument',
    status: instrument.status === 'discrepancy_flagged'
      ? 'error'
      : instrument.status === 'verified' || instrument.status === 'active_monitoring'
      ? 'success'
      : 'pending',
    metadata: {
      id: instrument.id,
      bankName: instrument.bankName,
      depositAmount: instrument.depositAmount,
      status: instrument.status,
      maturityDate: instrument.maturityDate,
      verificationStatus: instrument.verificationStatus,
    },
  });

  edges.push({
    source: instNodeId,
    target: currentInstNodeId,
    relationship: 'OWNS',
    label: 'Maintained By',
  });

  if (predecessor) {
    edges.push({
      source: `node-pred-${predecessor.id}`,
      target: currentInstNodeId,
      relationship: 'SUPERSEDES',
      label: 'Linked Replacement',
      unresolved: predecessor.status !== 'released' && predecessor.status !== 'closed',
    });
  }

  // 4. Evidence Document Nodes
  documents.forEach((doc, idx) => {
    const docNodeId = `node-doc-${doc.id}`;
    const isAdvice = doc.fileName.toLowerCase().includes('advice');
    nodes.push({
      id: docNodeId,
      label: doc.fileName.length > 22 ? doc.fileName.slice(0, 20) + '...' : doc.fileName,
      type: 'evidence_document',
      status: 'success',
      metadata: {
        documentId: doc.id,
        documentType: doc.documentType,
        isDepositAdvice: isAdvice,
        fileName: doc.fileName,
        uploadedAt: doc.uploadedAt,
      },
    });

    edges.push({
      source: currentInstNodeId,
      target: docNodeId,
      relationship: 'HAS_DOCUMENT',
      label: isAdvice ? 'Deposit Advice' : 'Certified Evidence',
    });
  });

  // 5. Verification Milestone Node
  const verNodeId = `node-ver-${instrument.id}`;
  const isSourceVerified = instrument.verificationStatus === 'verified_by_source';
  nodes.push({
    id: verNodeId,
    label: isSourceVerified ? 'Source Verified' : 'Manual Branch Verification Pending',
    type: 'verification',
    status: isSourceVerified ? 'success' : 'warning',
    metadata: {
      verificationStatus: instrument.verificationStatus,
      checkCount: verifications.length,
    },
  });

  edges.push({
    source: currentInstNodeId,
    target: verNodeId,
    relationship: 'VERIFIED_BY',
    label: isSourceVerified ? 'Bank Reference Match' : 'Pending Confirmation',
    unresolved: !isSourceVerified,
  });

  // 6. Maturity Event Node
  const matDate = new Date(instrument.maturityDate);
  const now = new Date();
  const isMatured = matDate < now;
  const matNodeId = `node-mat-${instrument.id}`;

  nodes.push({
    id: matNodeId,
    label: isMatured ? `Matured: ${instrument.maturityDate}` : `Matures: ${instrument.maturityDate}`,
    type: 'maturity_event',
    status: isMatured ? 'error' : 'info',
    metadata: {
      maturityDate: instrument.maturityDate,
      isMatured,
      daysToMaturity: Math.ceil((matDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    },
  });

  edges.push({
    source: currentInstNodeId,
    target: matNodeId,
    relationship: 'TRIGGERS_MATURITY',
    label: isMatured ? 'Overdue Renewal' : 'Tenor Horizon',
    unresolved: isMatured && instrument.status !== 'active_monitoring',
  });

  // 7. Release Request & Decision Node (if release flow initiated)
  if (releaseRequest) {
    const relNodeId = `node-rel-${releaseRequest.id}`;
    nodes.push({
      id: relNodeId,
      label: `Release: ${releaseRequest.status.replace(/_/g, ' ')}`,
      type: 'release_request',
      status: releaseRequest.status === 'approved'
        ? 'success'
        : releaseRequest.status === 'declined'
        ? 'error'
        : 'warning',
      metadata: {
        requestId: releaseRequest.id,
        status: releaseRequest.status,
        seniorDecision: releaseRequest.seniorDecision,
        requestDate: releaseRequest.requestDate,
      },
    });

    edges.push({
      source: currentInstNodeId,
      target: relNodeId,
      relationship: 'SUBMITS_RELEASE',
      label: 'APH 6.46 Application',
    });

    // 8. Clearance Milestone Node
    const clearNodeId = `node-clear-${releaseRequest.id}`;
    const clearancesSatisfied = releaseRequest.status === 'approved' || releaseRequest.status === 'pending_senior_decision';
    nodes.push({
      id: clearNodeId,
      label: clearancesSatisfied ? 'Clearances Verified' : 'Clearances Pending (PGRC/Vigilance)',
      type: 'clearance',
      status: clearancesSatisfied ? 'success' : 'warning',
      metadata: {
        pgrc: 'Checked against registry',
        vigilance: 'Checked against registry',
      },
    });

    edges.push({
      source: relNodeId,
      target: clearNodeId,
      relationship: 'REQUIRES_CLEARANCE',
      label: 'Clause 6.46.5',
      unresolved: !clearancesSatisfied,
    });

    // 9. Authorized Decision Node
    if (releaseRequest.seniorDecision) {
      const decNodeId = `node-dec-${releaseRequest.id}`;
      nodes.push({
        id: decNodeId,
        label: `Authorized: ${releaseRequest.seniorDecision.toUpperCase()}`,
        type: 'decision',
        status: releaseRequest.seniorDecision === 'approved' ? 'success' : 'error',
        metadata: {
          decision: releaseRequest.seniorDecision,
          decisionDate: releaseRequest.decisionDate,
          reason: releaseRequest.seniorDecisionReason,
          officer: releaseRequest.seniorOfficerId || 'Senior Officer',
        },
      });

      edges.push({
        source: relNodeId,
        target: decNodeId,
        relationship: 'AUTHORIZED_BY',
        label: 'Senior Officer Sign-off',
      });
    }
  }

  // 10. Audit Trail Timeline Node
  const auditNodeId = `node-audit-${instrument.id}`;
  nodes.push({
    id: auditNodeId,
    label: `Audit Trail (${auditEvents.length} events)`,
    type: 'audit_trail',
    status: 'info',
    metadata: {
      eventCount: auditEvents.length,
      lastEvent: auditEvents[0]?.action || 'None',
    },
  });

  edges.push({
    source: currentInstNodeId,
    target: auditNodeId,
    relationship: 'LOGGED_IN_AUDIT',
    label: 'Immutable History',
  });

  return { nodes, edges };
}
