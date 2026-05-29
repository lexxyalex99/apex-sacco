import { loadDatabase, saveDatabase } from '../db';
import { Member, Loan } from '../../src/types';

export interface CreditScoreResult {
  score: number; // 300 to 850
  trustLevel: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  loanLimitMultiplier: number; // e.g. 3x to 6x savings
  recommendedRate: number; // monthly interest rate, e.g., 1.2% base
  status: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Risk Lock';
  metrics: {
    repaymentRate: number; // percentage of installments paid on time
    savingsConsistencyScore: number; // frequent weekly/monthly deposits
    transactionFrequency: number;
    daysActive: number;
    overdueLoansCount: number;
    avgGuarantorSavings: number;
  };
}

export class CreditScoringEngine {
  /**
   * Evaluates a member's complete portfolio activity to output an authoritative credit score.
   */
  static evaluateMember(memberId: string): CreditScoreResult {
    const db = loadDatabase();
    
    // Find member
    const member = db.members.find(m => m.memberId === memberId);
    if (!member) {
      return this.getDefaultScore();
    }

    // 1. Core Variables Acquisition
    const allTransactions = db.transactions.filter(t => t.memberId === memberId);
    const memberLoans = db.loans.filter(l => l.memberId === memberId);
    
    // Calculate Days Active
    const joined = new Date(member.joinedDate);
    const now = new Date();
    const daysActive = Math.max(1, Math.ceil((now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24)));

    // 2. Metrics Compounding
    // A. Repayment Rate (Ratio of on-time paid installments vs total installments due)
    let totalInstallmentsCount = 0;
    let paidInstallmentsCount = 0;
    let overdueCount = 0;

    for (const loan of memberLoans) {
      for (const inst of loan.repaymentSchedule || []) {
        totalInstallmentsCount++;
        if (inst.status === 'Paid') {
          paidInstallmentsCount++;
        } else if (inst.status === 'Overdue') {
          overdueCount++;
        }
      }
    }

    const repaymentRate = totalInstallmentsCount > 0 
      ? Math.round((paidInstallmentsCount / totalInstallmentsCount) * 100) 
      : 100; // Perfect score if no loans yet

    // B. Savings Consistency (deposits count over last 3 months)
    const deposits = allTransactions.filter(t => t.type === 'Deposit' && t.status === 'Completed');
    const transactionFrequency = allTransactions.length;
    
    // Savings consistency points
    let savingsConsistencyScore = 0;
    if (deposits.length >= 10) savingsConsistencyScore = 100;
    else if (deposits.length >= 5) savingsConsistencyScore = 75;
    else if (deposits.length >= 2) savingsConsistencyScore = 50;
    else if (deposits.length >= 1) savingsConsistencyScore = 25;

    // C. Guarantor Quality Analysis
    // Let's inspect other loans where this member is referenced or check their own loans co-signers
    let totalGuarantorSavings = 0;
    let guarantorCount = 0;
    for (const loan of memberLoans) {
      if (loan.guarantors && Array.isArray(loan.guarantors)) {
        for (const gId of loan.guarantors) {
          const gMem = db.members.find(m => m.memberId === gId);
          if (gMem) {
            totalGuarantorSavings += gMem.savingsBalance;
            guarantorCount++;
          }
        }
      }
    }
    const avgGuarantorSavings = guarantorCount > 0 ? totalGuarantorSavings / guarantorCount : 0;

    // 3. Score Compounding (Scale out from base 300, max 850)
    let baseScore = 450; // Neutral starting score

    // Repayment Influence (Max 200 pts)
    if (overdueCount > 0) {
      baseScore -= (overdueCount * 60); // Heavy penalty for overdue debts
    } else {
      baseScore += Math.round((repaymentRate / 100) * 150);
    }

    // Savings Portfolio Influence (Max 100 pts)
    const savingsRatioPoints = Math.min(100, Math.round((member.savingsBalance / 50000) * 50));
    baseScore += savingsRatioPoints;
    baseScore += Math.round((savingsConsistencyScore / 100) * 50);

    // Activity Duration Influence (Max 50 pts)
    const activePoints = Math.min(50, Math.round((daysActive / 180) * 50));
    baseScore += activePoints;

    // Cap Score boundaries
    const finalScore = Math.max(300, Math.min(850, baseScore));

    // 4. Derive Trust levels & Limit adjustments
    let trustLevel: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' = 'Bronze';
    let status: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Risk Lock' = 'Fair';
    let loanLimitMultiplier = 3.0; // Base multiplier from SACCO policy
    let recommendedRate = db.settings.baseInterestRateLoans || 1.2;

    if (finalScore >= 780) {
      trustLevel = 'Platinum';
      status = 'Excellent';
      loanLimitMultiplier = 6.0; // Platinum members get 6x savings
      recommendedRate = Math.max(0.6, recommendedRate - 0.4); // 0.4% interest discount
    } else if (finalScore >= 680) {
      trustLevel = 'Gold';
      status = 'Good';
      loanLimitMultiplier = 5.0; // 5x savings
      recommendedRate = Math.max(0.8, recommendedRate - 0.2); // 0.2% discount
    } else if (finalScore >= 580) {
      trustLevel = 'Silver';
      status = 'Good';
      loanLimitMultiplier = 4.0; // 4x savings
    } else if (finalScore < 450) {
      trustLevel = 'Bronze';
      status = 'Poor';
      loanLimitMultiplier = 1.5; // Restricted limits
      recommendedRate = recommendedRate + 0.3; // Interest premium
    }

    if (member.status === 'Suspended' || overdueCount > 2) {
      status = 'Risk Lock';
      loanLimitMultiplier = 0.0; // Complete credit freeze
    }

    // Automatic Tier sync in DB
    if (member.tier !== trustLevel) {
      member.tier = trustLevel;
      saveDatabase(db);
    }

    return {
      score: finalScore,
      trustLevel,
      loanLimitMultiplier,
      recommendedRate,
      status,
      metrics: {
        repaymentRate,
        savingsConsistencyScore,
        transactionFrequency,
        daysActive,
        overdueLoansCount: overdueCount,
        avgGuarantorSavings
      }
    };
  }

  private static getDefaultScore(): CreditScoreResult {
    return {
      score: 550,
      trustLevel: 'Bronze',
      loanLimitMultiplier: 3.0,
      recommendedRate: 1.2,
      status: 'Fair',
      metrics: {
        repaymentRate: 100,
        savingsConsistencyScore: 0,
        transactionFrequency: 0,
        daysActive: 1,
        overdueLoansCount: 0,
        avgGuarantorSavings: 0
      }
    };
  }
}
