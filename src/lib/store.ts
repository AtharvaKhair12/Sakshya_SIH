// ============================================================================
// Sakshya — Local Storage Service
// Browser-local persistence layer for demo mode.
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  User, Institution, Instrument, UploadedDocument, VerificationResult,
  ComplianceFinding, LifecycleEvent, ReleaseRequest, Notification,
  AuditEvent, RegulatoryRule, SourceAdapter, Role, InstrumentStatus,
  VerificationStatus, ReleaseRequestStatus, AuditAction, ROLE_PERMISSIONS,
  ALLOWED_TRANSITIONS,
} from './types';
import { generateAllDemoData } from './demo-data';

const STORAGE_KEY = 'sakshya_demo_data';
const SESSION_KEY = 'sakshya_session';

interface DemoStore {
  institutions: Institution[];
  users: User[];
  instruments: Instrument[];
  documents: UploadedDocument[];
  verifications: VerificationResult[];
  findings: ComplianceFinding[];
  lifecycleEvents: LifecycleEvent[];
  releaseRequests: ReleaseRequest[];
  notifications: Notification[];
  auditEvents: AuditEvent[];
  rules: RegulatoryRule[];
  sources: SourceAdapter[];
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function loadStore(): DemoStore {
  if (!isBrowser()) return generateAllDemoData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as DemoStore;
    }
  } catch {
    // corrupted data — reset
  }
  const data = generateAllDemoData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

function saveStore(store: DemoStore): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    console.warn('Sakshya: localStorage save failed');
  }
}

// ── Session ──
export interface DemoSession {
  userId: string;
  role: Role;
  institutionId?: string;
  loginAt: string;
}

export function getSession(): DemoSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(session: DemoSession): void {
  if (!isBrowser()) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(SESSION_KEY);
}

import { canPerformAction, canAccessInstrument } from './permissions';

// ── Data Access ──
export function getInstitutions(): Institution[] { return loadStore().institutions; }
export function getInstitution(id: string): Institution | undefined { return loadStore().institutions.find(i => i.id === id); }

export function getUsers(): User[] { return loadStore().users; }
export function getUser(id: string): User | undefined { return loadStore().users.find(u => u.id === id); }
export function addUser(user: User): User {
  const s = loadStore();
  const existing = s.users.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
  if (existing >= 0) {
    s.users[existing] = user;
  } else {
    s.users.push(user);
  }
  saveStore(s);
  return user;
}

export function getInstruments(
  filter?: { institutionId?: string; status?: InstrumentStatus; verificationStatus?: VerificationStatus; assignedReviewer?: string },
  session?: DemoSession | null
): Instrument[] {
  let items = loadStore().instruments;
  // Enforce institution scoping
  if (session?.role === 'institution' && session.institutionId) {
    items = items.filter(i => i.institutionId === session.institutionId);
  } else if (filter?.institutionId) {
    items = items.filter(i => i.institutionId === filter.institutionId);
  }
  if (filter?.status) items = items.filter(i => i.status === filter.status);
  if (filter?.verificationStatus) items = items.filter(i => i.verificationStatus === filter.verificationStatus);
  if (filter?.assignedReviewer) items = items.filter(i => i.assignedReviewer === filter.assignedReviewer);
  return items;
}

export function getInstrument(id: string, session?: DemoSession | null): Instrument | undefined {
  const inst = loadStore().instruments.find(i => i.id === id);
  if (!inst) return undefined;
  if (session && !canAccessInstrument(session, inst)) {
    return undefined; // Block unauthorized institution cross-access
  }
  return inst;
}

export function getDocuments(instrumentId?: string, session?: DemoSession | null): UploadedDocument[] {
  let docs = loadStore().documents;
  if (instrumentId) docs = docs.filter(d => d.instrumentId === instrumentId);
  if (session?.role === 'institution' && session.institutionId) {
    const instIds = new Set(loadStore().instruments.filter(i => i.institutionId === session.institutionId).map(i => i.id));
    docs = docs.filter(d => instIds.has(d.instrumentId));
  }
  return docs;
}

export function getVerifications(instrumentId?: string, session?: DemoSession | null): VerificationResult[] {
  let v = loadStore().verifications;
  if (instrumentId) v = v.filter(r => r.instrumentId === instrumentId);
  if (session?.role === 'institution' && session.institutionId) {
    const instIds = new Set(loadStore().instruments.filter(i => i.institutionId === session.institutionId).map(i => i.id));
    v = v.filter(r => instIds.has(r.instrumentId));
  }
  return v;
}

export function getFindings(instrumentId?: string, session?: DemoSession | null): ComplianceFinding[] {
  let f = loadStore().findings;
  if (instrumentId) f = f.filter(r => r.instrumentId === instrumentId);
  if (session?.role === 'institution' && session.institutionId) {
    const instIds = new Set(loadStore().instruments.filter(i => i.institutionId === session.institutionId).map(i => i.id));
    f = f.filter(r => instIds.has(r.instrumentId));
  }
  return f;
}

export function getLifecycleEvents(instrumentId?: string): LifecycleEvent[] {
  const e = loadStore().lifecycleEvents;
  return instrumentId ? e.filter(r => r.instrumentId === instrumentId) : e;
}

export function getReleaseRequests(
  filter?: { instrumentId?: string; institutionId?: string; status?: ReleaseRequestStatus },
  session?: DemoSession | null
): ReleaseRequest[] {
  let items = loadStore().releaseRequests;
  if (session?.role === 'institution' && session.institutionId) {
    items = items.filter(r => r.institutionId === session.institutionId);
  } else if (filter?.institutionId) {
    items = items.filter(r => r.institutionId === filter.institutionId);
  }
  if (filter?.instrumentId) items = items.filter(r => r.instrumentId === filter.instrumentId);
  if (filter?.status) items = items.filter(r => r.status === filter.status);
  return items;
}

export function getReleaseRequest(id: string, session?: DemoSession | null): ReleaseRequest | undefined {
  const req = loadStore().releaseRequests.find(r => r.id === id);
  if (!req) return undefined;
  if (session?.role === 'institution' && session.institutionId && req.institutionId !== session.institutionId) {
    return undefined;
  }
  return req;
}

export function getNotifications(userId?: string): Notification[] {
  const n = loadStore().notifications;
  return userId ? n.filter(x => x.userId === userId) : n;
}

export function getAuditEvents(filter?: { entityId?: string; userId?: string; action?: AuditAction }): AuditEvent[] {
  let items = loadStore().auditEvents;
  if (filter?.entityId) items = items.filter(e => e.entityId === filter.entityId);
  if (filter?.userId) items = items.filter(e => e.userId === filter.userId);
  if (filter?.action) items = items.filter(e => e.action === filter.action);
  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getRules(): RegulatoryRule[] { return loadStore().rules; }
export function getRule(id: string): RegulatoryRule | undefined { return loadStore().rules.find(r => r.id === id); }

export function getSources(): SourceAdapter[] { return loadStore().sources; }

// ── Mutations ──

function addAuditEvent(store: DemoStore, event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
  const ae: AuditEvent = { ...event, id: `aud-${uuidv4().slice(0, 8)}`, timestamp: new Date().toISOString() };
  store.auditEvents.unshift(ae);
  return ae;
}

export function createInstrument(
  data: Omit<Instrument, 'id' | 'status' | 'verificationStatus' | 'updatedAt' | 'documents'> & {
    status?: InstrumentStatus;
    verificationStatus?: VerificationStatus;
  },
  session: DemoSession
): Instrument {
  if (!canPerformAction(session, 'create_instrument')) {
    throw new Error('Unauthorized: Role is not authorized to register new FDR instruments.');
  }
  const store = loadStore();
  const id = `FDR-${new Date().getFullYear()}-${String(store.instruments.length + 1).padStart(4, '0')}`;
  const instrument: Instrument = {
    ...data,
    id,
    status: data.status || 'submitted',
    verificationStatus: data.verificationStatus || 'not_started',
    updatedAt: new Date().toISOString(),
    documents: [],
  };
  store.instruments.push(instrument);
  addAuditEvent(store, {
    userId: session.userId, userName: getUser(session.userId)?.name || 'Unknown',
    userRole: session.role, entityType: 'instrument', entityId: id,
    action: 'instrument_created', reason: 'New FDR registration',
  });
  // Add notification for officers
  store.notifications.push({
    id: `notif-${uuidv4().slice(0, 8)}`, userId: 'user-003', type: 'new_submission',
    title: 'New FDR Submitted', message: `${id} submitted by ${data.institutionName}.`,
    entityType: 'instrument', entityId: id, read: false, createdAt: new Date().toISOString(),
  });
  saveStore(store);
  return instrument;
}

export function updateInstrumentStatus(
  instrumentId: string,
  newStatus: InstrumentStatus,
  reason: string,
  session?: DemoSession
): Instrument | null {
  if (
    session &&
    !canPerformAction(session, 'verify_source') &&
    session.role !== 'admin' &&
    session.role !== 'system_admin'
  ) {
    // Allow automated system preliminary validation check transitions upon submission
    if (session.role === 'institution' && (newStatus === 'discrepancy_flagged' || newStatus === 'preliminary_validation')) {
      // Allowed system automated check outcome
    } else {
      return null;
    }
  }
  const store = loadStore();
  const idx = store.instruments.findIndex(i => i.id === instrumentId);
  if (idx === -1) return null;
  const inst = store.instruments[idx];
  const allowed = ALLOWED_TRANSITIONS[inst.status];
  if (!allowed.includes(newStatus)) return null;
  const oldStatus = inst.status;
  inst.status = newStatus;
  inst.updatedAt = new Date().toISOString();
  store.lifecycleEvents.push({
    id: `lc-${uuidv4().slice(0, 8)}`, instrumentId, fromStatus: oldStatus, toStatus: newStatus,
    reason, performedBy: session?.userId || 'system', performedAt: new Date().toISOString(),
  });
  addAuditEvent(store, {
    userId: session?.userId || 'system', userName: session ? (getUser(session.userId)?.name || 'Unknown') : 'System Rule Engine',
    userRole: session?.role || 'admin', entityType: 'instrument', entityId: instrumentId,
    action: 'status_changed', previousValue: oldStatus, newValue: newStatus, reason,
  });
  saveStore(store);
  return inst;
}

export function updateVerificationStatus(instrumentId: string, verStatus: VerificationStatus, session: DemoSession): void {
  if (!canPerformAction(session, 'verify_source')) {
    return;
  }
  const store = loadStore();
  const inst = store.instruments.find(i => i.id === instrumentId);
  if (!inst) return;
  inst.verificationStatus = verStatus;
  inst.updatedAt = new Date().toISOString();
  addAuditEvent(store, {
    userId: session.userId, userName: getUser(session.userId)?.name || 'Unknown',
    userRole: session.role, entityType: 'instrument', entityId: instrumentId,
    action: 'verification_completed', newValue: verStatus, reason: `Verification status updated to ${verStatus}`,
  });
  saveStore(store);
}

export function addDocument(doc: Omit<UploadedDocument, 'id'>): UploadedDocument {
  const store = loadStore();
  const newDoc: UploadedDocument = { ...doc, id: `doc-${uuidv4().slice(0, 8)}` };
  store.documents.push(newDoc);
  const inst = store.instruments.find(i => i.id === doc.instrumentId);
  if (inst) {
    inst.documents.push(newDoc.id);
    inst.updatedAt = new Date().toISOString();
  }
  addAuditEvent(store, {
    userId: doc.uploadedBy, userName: getUser(doc.uploadedBy)?.name || 'Unknown',
    userRole: getUser(doc.uploadedBy)?.role || 'institution', entityType: 'document',
    entityId: newDoc.id, action: 'document_uploaded', reason: `${doc.fileName} uploaded`,
  });
  saveStore(store);
  return newDoc;
}

export function addVerificationResult(result: Omit<VerificationResult, 'id' | 'createdAt'>): VerificationResult {
  const store = loadStore();
  const newResult: VerificationResult = { ...result, id: `ver-${uuidv4().slice(0, 8)}`, createdAt: new Date().toISOString() };
  store.verifications.push(newResult);
  saveStore(store);
  return newResult;
}

export function addFinding(finding: Omit<ComplianceFinding, 'id' | 'createdAt'>): ComplianceFinding {
  const store = loadStore();
  const newFinding: ComplianceFinding = { ...finding, id: `find-${uuidv4().slice(0, 8)}`, createdAt: new Date().toISOString() };
  store.findings.push(newFinding);
  saveStore(store);
  return newFinding;
}

export function resolveFinding(findingId: string, resolution: string, session: DemoSession): void {
  if (!canPerformAction(session, 'resolve_finding')) {
    throw new Error('Unauthorized: Role is not authorized to resolve compliance findings.');
  }
  const store = loadStore();
  const finding = store.findings.find(f => f.id === findingId);
  if (!finding) return;
  finding.resolved = true;
  finding.resolvedBy = session.userId;
  finding.resolvedAt = new Date().toISOString();
  finding.resolution = resolution;
  addAuditEvent(store, {
    userId: session.userId, userName: getUser(session.userId)?.name || 'Unknown',
    userRole: session.role, entityType: 'instrument', entityId: finding.instrumentId,
    action: 'finding_resolved', reason: resolution,
  });
  saveStore(store);
}

export function createReleaseRequest(data: Omit<ReleaseRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>): ReleaseRequest {
  const store = loadStore();
  const req: ReleaseRequest = {
    ...data,
    id: `rel-${uuidv4().slice(0, 8)}`,
    status: 'submitted',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.releaseRequests.push(req);
  addAuditEvent(store, {
    userId: data.createdBy, userName: getUser(data.createdBy)?.name || 'Unknown',
    userRole: getUser(data.createdBy)?.role || 'institution', entityType: 'release_request',
    entityId: req.id, action: 'release_request_created', reason: data.reason,
  });
  // Notify scrutiny officer
  store.notifications.push({
    id: `notif-${uuidv4().slice(0, 8)}`, userId: 'user-003', type: 'release_update',
    title: 'New Release Request', message: `Release request ${req.id} for ${data.instrumentId} submitted.`,
    entityType: 'release_request', entityId: req.id, read: false, createdAt: new Date().toISOString(),
  });
  saveStore(store);
  return req;
}

export function updateReleaseRequest(id: string, updates: Partial<ReleaseRequest>, session: DemoSession): ReleaseRequest | null {
  const store = loadStore();
  const idx = store.releaseRequests.findIndex(r => r.id === id);
  if (idx === -1) return null;
  const req = { ...store.releaseRequests[idx], ...updates, updatedAt: new Date().toISOString() };
  store.releaseRequests[idx] = req;
  addAuditEvent(store, {
    userId: session.userId, userName: getUser(session.userId)?.name || 'Unknown',
    userRole: session.role, entityType: 'release_request', entityId: id,
    action: 'release_request_updated', reason: updates.scrutinyObservation || updates.seniorDecisionReason || 'Updated',
  });
  saveStore(store);
  return req;
}

export function makeReleaseDecision(id: string, decision: 'approved' | 'declined' | 'returned', reason: string, session: DemoSession): ReleaseRequest | null {
  if (!canPerformAction(session, 'make_release_decision')) {
    throw new Error('Unauthorized: Only Senior Officers possess final release/refund decision authority.');
  }
  if (!reason || !reason.trim()) {
    throw new Error('Mandatory decision reason is required.');
  }
  const store = loadStore();
  const idx = store.releaseRequests.findIndex(r => r.id === id);
  if (idx === -1) return null;
  const statusMap = { approved: 'approved' as ReleaseRequestStatus, declined: 'declined' as ReleaseRequestStatus, returned: 'under_scrutiny' as ReleaseRequestStatus };
  store.releaseRequests[idx] = {
    ...store.releaseRequests[idx],
    seniorDecision: decision,
    seniorDecisionReason: reason,
    seniorOfficerId: session.userId,
    decisionDate: new Date().toISOString(),
    status: statusMap[decision],
    updatedAt: new Date().toISOString(),
  };
  addAuditEvent(store, {
    userId: session.userId, userName: getUser(session.userId)?.name || 'Unknown',
    userRole: session.role, entityType: 'release_request', entityId: id,
    action: 'release_decision', newValue: decision, reason,
  });
  // If approved, update instrument status
  if (decision === 'approved') {
    const instId = store.releaseRequests[idx].instrumentId;
    const inst = store.instruments.find(i => i.id === instId);
    if (inst && inst.status === 'release_requested') {
      const oldStatus = inst.status;
      inst.status = 'released';
      inst.updatedAt = new Date().toISOString();
      store.lifecycleEvents.push({
        id: `lc-${uuidv4().slice(0, 8)}`, instrumentId: instId, fromStatus: oldStatus, toStatus: 'released',
        reason: `Release approved: ${reason}`, performedBy: session.userId, performedAt: new Date().toISOString(),
      });
    }
  }
  saveStore(store);
  return store.releaseRequests[idx];
}

export function markNotificationRead(notifId: string): void {
  const store = loadStore();
  const n = store.notifications.find(x => x.id === notifId);
  if (n) { n.read = true; saveStore(store); }
}

export function markAllNotificationsRead(userId: string): void {
  const store = loadStore();
  store.notifications.filter(n => n.userId === userId).forEach(n => { n.read = true; });
  saveStore(store);
}

export function addNotification(data: Omit<Notification, 'id' | 'createdAt'>): Notification {
  const store = loadStore();
  const n: Notification = { ...data, id: `notif-${uuidv4().slice(0, 8)}`, createdAt: new Date().toISOString() };
  store.notifications.push(n);
  saveStore(store);
  return n;
}

export function updateRule(ruleId: string, updates: Partial<RegulatoryRule>, session: DemoSession): RegulatoryRule | null {
  if (!canPerformAction(session, 'manage_rules')) {
    throw new Error('Unauthorized: Only System Administrators can configure regulatory rules.');
  }
  const store = loadStore();
  const idx = store.rules.findIndex(r => r.id === ruleId);
  if (idx === -1) return null;
  const rule = store.rules[idx];
  const newVersion = rule.version + 1;
  store.rules[idx] = {
    ...rule,
    ...updates,
    version: newVersion,
    lastReviewedDate: new Date().toISOString(),
    reviewedBy: session.userId,
    changeHistory: [...rule.changeHistory, { version: newVersion, changedBy: session.userId, changedAt: new Date().toISOString(), description: 'Rule updated (demo)' }],
  };
  addAuditEvent(store, {
    userId: session.userId, userName: getUser(session.userId)?.name || 'Unknown',
    userRole: session.role, entityType: 'rule', entityId: ruleId,
    action: 'rule_updated', reason: 'Rule configuration updated',
  });
  saveStore(store);
  return store.rules[idx];
}

export function updateUser(userId: string, updates: Partial<User>, session: DemoSession): User | null {
  if (!canPerformAction(session, 'manage_users')) {
    throw new Error('Unauthorized: Only System Administrators can update user accounts.');
  }
  const store = loadStore();
  const idx = store.users.findIndex(u => u.id === userId);
  if (idx === -1) return null;
  store.users[idx] = { ...store.users[idx], ...updates };
  addAuditEvent(store, {
    userId: session.userId, userName: getUser(session.userId)?.name || 'Unknown',
    userRole: session.role, entityType: 'user', entityId: userId,
    action: 'user_updated', reason: 'User details updated',
  });
  saveStore(store);
  return store.users[idx];
}

export function createUser(data: Omit<User, 'id' | 'createdAt'>, session: DemoSession): User {
  if (!canPerformAction(session, 'manage_users')) {
    throw new Error('Unauthorized: Only System Administrators can create new accounts.');
  }
  const store = loadStore();
  const user: User = { ...data, id: `user-${uuidv4().slice(0, 8)}`, createdAt: new Date().toISOString() };
  store.users.push(user);
  addAuditEvent(store, {
    userId: session.userId, userName: getUser(session.userId)?.name || 'Unknown',
    userRole: session.role, entityType: 'user', entityId: user.id,
    action: 'user_created', reason: 'New user created',
  });
  saveStore(store);
  return user;
}

export function assignReviewer(instrumentId: string, reviewerId: string, session: DemoSession): void {
  const store = loadStore();
  const inst = store.instruments.find(i => i.id === instrumentId);
  if (!inst) return;
  const prev = inst.assignedReviewer;
  inst.assignedReviewer = reviewerId;
  inst.updatedAt = new Date().toISOString();
  addAuditEvent(store, {
    userId: session.userId, userName: getUser(session.userId)?.name || 'Unknown',
    userRole: session.role, entityType: 'instrument', entityId: instrumentId,
    action: 'instrument_updated', previousValue: prev, newValue: reviewerId,
    reason: `Reviewer assigned: ${getUser(reviewerId)?.name || reviewerId}`,
  });
  saveStore(store);
}

export function addObservation(instrumentId: string, observation: string, session: DemoSession): void {
  if (!canPerformAction(session, 'record_observation')) {
    throw new Error('Unauthorized: Role is not authorized to record scrutiny observations.');
  }
  const store = loadStore();
  addAuditEvent(store, {
    userId: session.userId, userName: getUser(session.userId)?.name || 'Unknown',
    userRole: session.role, entityType: 'instrument', entityId: instrumentId,
    action: 'observation_added', reason: observation,
  });
  saveStore(store);
}

export function escalateInstrument(instrumentId: string, reason: string, session: DemoSession): void {
  if (!canPerformAction(session, 'escalate_case')) {
    throw new Error('Unauthorized: Role is not authorized to escalate cases.');
  }
  const store = loadStore();
  addAuditEvent(store, {
    userId: session.userId, userName: getUser(session.userId)?.name || 'Unknown',
    userRole: session.role, entityType: 'instrument', entityId: instrumentId,
    action: 'escalation', reason,
  });
  // Notify senior officer
  store.notifications.push({
    id: `notif-${uuidv4().slice(0, 8)}`, userId: 'user-005', type: 'escalation',
    title: 'Case Escalated', message: `${instrumentId} escalated: ${reason}`,
    entityType: 'instrument', entityId: instrumentId, read: false, createdAt: new Date().toISOString(),
  });
  saveStore(store);
}

export function resetDemoData(session?: DemoSession): void {
  if (session && !canPerformAction(session, 'reset_demo_data')) {
    throw new Error('Unauthorized: Only System Administrators can trigger demo data reset.');
  }
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SESSION_KEY);
  loadStore(); // re-seed
}

// ── Helpers ──
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

export function daysUntilMaturity(maturityDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mat = new Date(maturityDate);
  mat.setHours(0, 0, 0, 0);
  return Math.ceil((mat.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = String(row[h] ?? '');
      return val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
