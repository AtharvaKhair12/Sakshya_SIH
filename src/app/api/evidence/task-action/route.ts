import { NextResponse } from 'next/server';
import { logAuditEvent, DemoSession } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { taskId, instrumentId, action, notes, session } = body;

    if (!taskId || !instrumentId || !action) {
      return NextResponse.json(
        { success: false, error: 'taskId, instrumentId, and action are required.' },
        { status: 400 }
      );
    }

    const demoSession: DemoSession = session || {
      userId: 'user-003',
      role: 'scrutiny_officer',
      loginAt: new Date().toISOString(),
    };

    // Log the Task Action in Audit Trail
    logAuditEvent({
      userId: demoSession.userId,
      userName: demoSession.userId,
      userRole: demoSession.role,
      entityType: 'instrument',
      entityId: instrumentId,
      action: 'status_changed',
      previousValue: 'task_pending',
      newValue: `task_${action}`,
      reason: notes || `Next-action task ${taskId} updated to ${action}`,
    });

    return NextResponse.json({
      success: true,
      message: `Task ${taskId} updated to ${action}.`,
      task: {
        id: taskId,
        instrumentId,
        status: action === 'resolve' ? 'resolved' : action === 'waive' ? 'waived' : 'in_progress',
        resolvedAt: new Date().toISOString(),
        resolvedBy: demoSession.userId,
        resolutionNotes: notes,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Task action failed.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
