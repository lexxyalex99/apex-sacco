import { Router, Response } from 'express';
import { loadDatabase } from '../db';
import { authenticateToken } from '../middlewares/security';
import { PenaltyEngine } from '../services/penalty-scheduler';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', authenticateToken, (req: any, res: Response) => {
  // First run weekly compliance vigilance sweeps lazily
  try {
    PenaltyEngine.runWeeklyVigilanceScans();
  } catch (err) {
    console.error("Penalty vigilance scan exception ignored lazily", err);
  }

  const db = loadDatabase();
  const currentUser = req.user;

  // Global aggregate metrics calculation
  const totalMembers = db.members.length;
  const totalSavings = db.members.reduce((sum, m) => sum + m.savingsBalance, 0);

  const activeLoans = db.loans.filter(l => l.status === 'Approved' || l.status === 'Overdue');
  const activeLoansAmount = activeLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);

  const totalRepayments = db.transactions.filter(t => t.type === 'Repayment' && t.status === 'Completed').reduce((sum, t) => sum + t.amount, 0);
  const totalDisbursedLoans = db.loans.reduce((sum, l) => sum + l.amount, 0);

  const loanRepaymentRate = totalDisbursedLoans > 0
    ? Math.round((totalRepayments / totalDisbursedLoans) * 100)
    : 100;

  const pendingLoansCount = db.loans.filter(l => l.status === 'Pending').length;

  const baseMonthlyAdminFee = totalMembers * 200; // 200 KES admin charges
  const txFeesTotal = db.transactions.reduce((sum, t) => sum + t.fee, 0);
  const loanMonthlyInterestRevenue = activeLoans.reduce((sum, l) => sum + (l.outstandingBalance * (l.interestRate / 100)), 0);
  const monthlyRevenue = Math.round(baseMonthlyAdminFee + txFeesTotal + loanMonthlyInterestRevenue);

  // Sorting
  let recentTransactions = [...db.transactions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  let recentAuditLogs = [...db.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (currentUser.role === 'Member') {
    recentTransactions = recentTransactions.filter(t => t.memberId === currentUser.memberId);
    recentAuditLogs = recentAuditLogs.filter(l => l.performedByEmail === currentUser.email);
  }

  res.json({
    totalMembers,
    totalSavings,
    activeLoansAmount,
    loanRepaymentRate,
    pendingLoansCount,
    monthlyRevenue,
    recentTransactions: recentTransactions.slice(0, 5),
    recentAuditLogs: recentAuditLogs.slice(0, 5)
  });
});

export default router;
