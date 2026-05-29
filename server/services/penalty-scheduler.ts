import { loadDatabase, saveDatabase, appendAuditLog } from '../db';
import { NotificationService } from './notification';
import logger from './logger';

export class PenaltyEngine {
  /**
   * Scans all active loans to check for overdue repayment deadlines.
   * Runs lazily on dashboard loadings or dedicated request checks.
   */
  static runWeeklyVigilanceScans(): { scanned: number; penalized: number; revenuePenalties: number } {
    const db = loadDatabase();
    const now = new Date();
    
    let scanned = 0;
    let penalized = 0;
    let revenuePenalties = 0;

    const penaltyRate = db.settings.penaltyOverdueRate || 5.0; // 5% base penalty

    for (const loan of db.loans) {
      if (loan.status === 'Fully Paid' || loan.status === 'Rejected') continue;
      scanned++;

      let hasOverdueInstallment = false;
      const originalOutstanding = loan.outstandingBalance;

      for (const inst of loan.repaymentSchedule || []) {
        const dueDate = new Date(inst.dueDate);
        
        // Check if current date has passed the due date and installment is unpaid
        if (now > dueDate && inst.status === 'Unpaid') {
          // Grace Period of 3 days
          const gracePeriodEnd = new Date(dueDate.getTime() + (3 * 24 * 60 * 60 * 1000));
          
          if (now > gracePeriodEnd) {
            inst.status = 'Overdue';
            hasOverdueInstallment = true;

            // Apply 5% penalty on amountDue
            const penaltyAmount = Math.round((inst.amountDue - inst.amountPaid) * (penaltyRate / 100));
            if (penaltyAmount > 0) {
              inst.amountDue += penaltyAmount;
              loan.outstandingBalance += penaltyAmount;
              revenuePenalties += penaltyAmount;
              penalized++;

              logger.warn(`[Vigilance Check] Applied Late Penalty of ${penaltyAmount} KES on Member ${loan.memberId} for missed installment.`);
            }
          }
        }
      }

      // If any installment is overdue, update overall loan status to 'Overdue'
      if (hasOverdueInstallment && loan.status !== 'Overdue') {
        loan.status = 'Overdue';
        const member = db.members.find(m => m.memberId === loan.memberId);
        if (member) {
          member.status = 'Suspended'; // Strict credit policy: suspend non-paying member accounts
          
          // Send automated SMS / Email Overdue Warning push
          NotificationService.send({
            to: member.email,
            subject: `CRITICAL NOTICE: Overdue Loan Portfolio ${loan.loanId}`,
            message: `Emergency Alert: Your loan repayment is late by over 3 days. A late penalty of ${penaltyRate}% has been charged. Your SACCO membership account is temporarily Suspended until outstanding balances are cleared.`,
            type: "email"
          }).catch(console.error);
        }

        appendAuditLog(
          "Loan Portfolio Overdue State",
          "system-vigilance@apexsacco.co.ke",
          "Admin",
          `Loan ${loan.loanId} for Member ${loan.memberName} flagged Overdue. Penalties compiled.`
        );
      }
    }

    if (penalized > 0) {
      saveDatabase(db);
    }

    return {
      scanned,
      penalized,
      revenuePenalties
    };
  }
}
