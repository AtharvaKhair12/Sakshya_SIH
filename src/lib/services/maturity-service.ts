// ============================================================================
// Sakshya — Maturity Monitoring & Follow-Up Service
// Dynamic days-to-maturity calculations, configurable reminder horizons (T-30, T-15, T-7),
// and persistent in-app follow-up tracking.
// ============================================================================

import { Instrument, Notification, DemoSession } from '../types';
import * as store from '../store';

export interface MaturityStatusSummary {
  daysUntilMaturity: number;
  category: 'overdue' | 'critical_7d' | 'approaching_15d' | 'approaching_30d' | 'healthy';
  label: string;
  badgeVariant: 'destructive' | 'warning' | 'default' | 'secondary' | 'outline';
}

export interface MaturityOverview {
  totalActive: number;
  overdueCount: number;
  approaching30dCount: number;
  healthyCount: number;
  items: Array<{
    instrument: Instrument;
    maturity: MaturityStatusSummary;
  }>;
}

export class MaturityService {
  /**
   * Calculate exact days until maturity from stored maturityDate string
   */
  static calculateDaysToMaturity(maturityDateStr: string, referenceDate: Date = new Date()): number {
    const maturity = new Date(maturityDateStr);
    // Strip time components to compare calendar days
    const utcMaturity = Date.UTC(maturity.getFullYear(), maturity.getMonth(), maturity.getDate());
    const utcRef = Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    const diffMs = utcMaturity - utcRef;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Determine maturity status category and presentation attributes
   */
  static getMaturityStatus(maturityDateStr: string, referenceDate: Date = new Date()): MaturityStatusSummary {
    const days = this.calculateDaysToMaturity(maturityDateStr, referenceDate);

    if (days < 0) {
      return {
        daysUntilMaturity: days,
        category: 'overdue',
        label: `Matured ${Math.abs(days)} days ago (Overdue Action)`,
        badgeVariant: 'destructive',
      };
    } else if (days <= 7) {
      return {
        daysUntilMaturity: days,
        category: 'critical_7d',
        label: `Matures in ${days} days (Urgent T-7 Horizon)`,
        badgeVariant: 'destructive',
      };
    } else if (days <= 15) {
      return {
        daysUntilMaturity: days,
        category: 'approaching_15d',
        label: `Matures in ${days} days (T-15 Horizon)`,
        badgeVariant: 'warning',
      };
    } else if (days <= 30) {
      return {
        daysUntilMaturity: days,
        category: 'approaching_30d',
        label: `Matures in ${days} days (T-30 Horizon)`,
        badgeVariant: 'warning',
      };
    } else {
      return {
        daysUntilMaturity: days,
        category: 'healthy',
        label: `Healthy (${Math.round(days / 30)} months remaining)`,
        badgeVariant: 'secondary',
      };
    }
  }

  /**
   * Process in-app reminders for upcoming or overdue instruments
   * Executed dynamically on authorized access without claiming background email deliveries
   */
  static evaluateAndGenerateReminders(session: DemoSession): number {
    const instruments = store.getInstruments({}, session);
    const existingNotifs = store.getNotifications(session.userId);
    let generatedCount = 0;

    for (const inst of instruments) {
      if (inst.status === 'released' || inst.status === 'closed') continue;

      const maturity = this.getMaturityStatus(inst.maturityDate);

      // Only notify for overdue or <= 30 days
      if (maturity.category !== 'healthy') {
        const notifKey = `${inst.id}-${maturity.category}`;
        const alreadyNotified = existingNotifs.some(
          (n) => n.entityId === inst.id && n.message.includes(maturity.category)
        );

        if (!alreadyNotified) {
          store.addNotification({
            userId: session.userId,
            type: maturity.category === 'overdue' ? 'overdue_action' : 'maturity_approaching',
            title: maturity.category === 'overdue' ? 'Overdue FDR Renewal' : 'Upcoming Maturity Horizon',
            message: `Instrument ${inst.id} (${inst.bankName} - ₹${inst.depositAmount.toLocaleString('en-IN')}) requires action: ${maturity.label}. [${maturity.category}]`,
            entityType: 'instrument',
            entityId: inst.id,
            read: false,
          });
          generatedCount++;
        }
      }
    }

    return generatedCount;
  }

  /**
   * Get complete maturity overview for dashboard presentation
   */
  static getMaturityOverview(session?: DemoSession | null): MaturityOverview {
    const instruments = store.getInstruments({}, session);
    let overdueCount = 0;
    let approaching30dCount = 0;
    let healthyCount = 0;

    const items = instruments.map((inst) => {
      const maturity = this.getMaturityStatus(inst.maturityDate);
      if (maturity.category === 'overdue') overdueCount++;
      else if (maturity.category === 'healthy') healthyCount++;
      else approaching30dCount++;

      return {
        instrument: inst,
        maturity,
      };
    });

    return {
      totalActive: instruments.filter((i) => i.status !== 'released' && i.status !== 'closed').length,
      overdueCount,
      approaching30dCount,
      healthyCount,
      items,
    };
  }
}
