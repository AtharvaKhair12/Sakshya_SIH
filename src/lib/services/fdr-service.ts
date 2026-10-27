// ============================================================================
// Sakshya — FDR Management Service
// Full administrative lifecycle for Security Deposits & Fixed Deposit Receipts
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  Instrument, InstrumentStatus, VerificationStatus, ComplianceFinding,
  AuditEvent, DemoSession
} from '../types';
import * as store from '../store';
import { isSupabaseConfigured } from '../supabase/config';
import { getServerSupabase } from '../supabase/server';
import { getAdminSupabase } from '../supabase/admin';

export interface CreateInstrumentInput {
  institutionId: string;
  institutionName: string;
  aisheCode: string;
  applicationRef?: string;
  bankName: string;
  branch: string;
  fdrNumber: string;
  depositAmount: number;
  issueDate: string;
  maturityDate: string;
  linkedPredecessorId?: string;
  remarks?: string;
  documentIds?: string[];
}

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export class FDRService {
  /**
   * Validate FDR submission inputs strictly according to AICTE standards
   */
  static validateSubmission(input: CreateInstrumentInput): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!input.institutionId || !input.institutionId.trim()) {
      issues.push({ field: 'institutionId', message: 'Institution identifier is required.', severity: 'error' });
    }
    if (!input.bankName || !input.bankName.trim()) {
      issues.push({ field: 'bankName', message: 'Issuing bank name is mandatory.', severity: 'error' });
    }
    if (!input.branch || !input.branch.trim()) {
      issues.push({ field: 'branch', message: 'Bank branch is mandatory.', severity: 'error' });
    }
    if (!input.fdrNumber || !input.fdrNumber.trim()) {
      issues.push({ field: 'fdrNumber', message: 'FDR receipt number is mandatory.', severity: 'error' });
    }

    const amount = Number(input.depositAmount);
    if (isNaN(amount) || amount <= 0) {
      issues.push({ field: 'depositAmount', message: 'Deposit amount must be a positive numeric value.', severity: 'error' });
    }

    if (!input.issueDate) {
      issues.push({ field: 'issueDate', message: 'Issue date is mandatory.', severity: 'error' });
    }
    if (!input.maturityDate) {
      issues.push({ field: 'maturityDate', message: 'Maturity date is mandatory.', severity: 'error' });
    }

    if (input.issueDate && input.maturityDate) {
      const issue = new Date(input.issueDate).getTime();
      const maturity = new Date(input.maturityDate).getTime();
      if (maturity <= issue) {
        issues.push({
          field: 'maturityDate',
          message: 'Maturity date must strictly be after the issue date.',
          severity: 'error',
        });
      }
    }

    return issues;
  }

  /**
   * Check for duplicate FDRs within existing records
   */
  static async checkDuplicateFDR(
    fdrNumber: string,
    bankName: string,
    excludeId?: string
  ): Promise<Instrument | null> {
    const cleanFDR = fdrNumber.trim().toLowerCase();
    const cleanBank = bankName.trim().toLowerCase();

    // Check store records
    const instruments = store.getInstruments();
    const match = instruments.find(
      (inst) =>
        inst.fdrNumber.trim().toLowerCase() === cleanFDR &&
        inst.bankName.trim().toLowerCase() === cleanBank &&
        inst.id !== excludeId
    );

    return match || null;
  }

  /**
   * Register a new FDR instrument with institutional validation, duplicate checks,
   * preliminary findings generation, and audit logging.
   */
  static async registerFDR(
    input: CreateInstrumentInput,
    session: DemoSession
  ): Promise<{ instrument: Instrument; findings: ComplianceFinding[]; validationErrors?: ValidationIssue[] }> {
    // 1. Role validation
    if (session.role !== 'institution' && session.role !== 'admin' && session.role !== 'system_admin') {
      throw new Error('Unauthorized: Only Institution Users or Administrators can register FDR instruments.');
    }

    // 2. Ownership check: Institution user can only submit for their own institution
    if (session.role === 'institution' && session.institutionId && input.institutionId !== session.institutionId) {
      throw new Error('Forbidden: Institution users cannot submit FDRs on behalf of another institution.');
    }

    // 3. Structural validation
    const validationErrors = this.validateSubmission(input);
    const fatalErrors = validationErrors.filter((e) => e.severity === 'error');
    if (fatalErrors.length > 0) {
      throw new Error(`Validation failed: ${fatalErrors.map((e) => e.message).join(' ')}`);
    }

    // 4. Duplicate FDR detection
    const existingDuplicate = await this.checkDuplicateFDR(input.fdrNumber, input.bankName);
    const preliminaryFindings: ComplianceFinding[] = [];

    const newInstrument = store.createInstrument(
      {
        institutionId: input.institutionId,
        institutionName: input.institutionName,
        aisheCode: input.aisheCode,
        applicationRef: input.applicationRef,
        bankName: input.bankName,
        branch: input.branch,
        fdrNumber: input.fdrNumber,
        depositAmount: Number(input.depositAmount),
        issueDate: input.issueDate,
        maturityDate: input.maturityDate,
        linkedPredecessorId: input.linkedPredecessorId,
        remarks: input.remarks,
        submittedBy: session.userId,
        submittedAt: new Date().toISOString(),
      },
      session
    );

    // If duplicate found, create preliminary discrepancy finding
    if (existingDuplicate) {
      const finding = store.addFinding({
        instrumentId: newInstrument.id,
        ruleId: 'RULE-DUP-01',
        ruleName: 'Duplicate Instrument Identifier Verification',
        severity: 'critical',
        description: `Potential duplicate FDR identifier detected. FDR Number '${input.fdrNumber}' at '${input.bankName}' matches existing record ${existingDuplicate.id} belonging to '${existingDuplicate.institutionName}'.`,
        fieldName: 'fdrNumber',
        expectedValue: 'Unique FDR identifier across all institutions',
        actualValue: input.fdrNumber,
        resolved: false,
      });
      preliminaryFindings.push(finding);

      // Flag instrument as discrepancy flagged
      store.updateInstrumentStatus(
        newInstrument.id,
        'discrepancy_flagged',
        'Duplicate FDR identifier detected against record ' + existingDuplicate.id,
        session
      );
    }

    // If replacement FDR, link with predecessor
    if (input.linkedPredecessorId) {
      const predecessor = store.getInstrument(input.linkedPredecessorId);
      if (predecessor) {
        // Log linking lifecycle event
        store.getLifecycleEvents().push({
          id: `lc-link-${uuidv4().slice(0, 8)}`,
          instrumentId: predecessor.id,
          fromStatus: predecessor.status,
          toStatus: 'renewal_pending',
          reason: `Replacement FDR ${newInstrument.id} submitted by institution. Predecessor retained for verification history.`,
          performedBy: session.userId,
          performedAt: new Date().toISOString(),
        });
      }
    }

    return {
      instrument: newInstrument,
      findings: preliminaryFindings,
      validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
    };
  }

  /**
   * Retrieve instruments scoped by role and user permissions
   */
  static getInstruments(session?: DemoSession | null): Instrument[] {
    return store.getInstruments({}, session);
  }

  /**
   * Retrieve single instrument by ID with permission enforcement
   */
  static getInstrumentById(id: string, session?: DemoSession | null): Instrument | undefined {
    return store.getInstrument(id, session);
  }
}
