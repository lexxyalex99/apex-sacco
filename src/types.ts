export type UserRole = 'Admin' | 'Loan Officer' | 'Accountant' | 'Member';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  memberId?: string; // Links to member profile if Member role
  status: 'Active' | 'Suspended';
  avatarUrl?: string;
  lastLogin?: string;
}

export interface Member {
  id: string;
  memberId: string; // Formatting e.g. "SACCO-1021"
  fullName: string;
  email: string;
  phone: string;
  nationalId: string;
  joinedDate: string;
  status: 'Active' | 'Suspended';
  savingsBalance: number;
  activeLoansCount: number;
  totalBorrowed: number;
  totalRepaid: number;
  dividendsPaid: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  avatarUrl: string;
  kycStatus?: 'Unverified' | 'Pending' | 'Approved' | 'Rejected';
  kycIdUrl?: string;
  kycSelfieUrl?: string;
  kycProofUrl?: string;
  kycComments?: string;
}

export interface RepaymentInstallment {
  installmentNumber: number;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  status: 'Unpaid' | 'Paid' | 'Overdue';
}

export interface Loan {
  id: string;
  loanId: string; // e.g. "LN-5291"
  memberId: string;
  memberName: string;
  amount: number;
  interestRate: number; // e.g. 1.2% per month
  tenureMonths: number;
  purpose: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Overdue' | 'Fully Paid';
  guarantors: string[];
  applicationDate: string;
  approvalDate?: string;
  outstandingBalance: number;
  monthlyInstallment: number;
  dueDate: string;
  riskScore: 'Low' | 'Medium' | 'High';
  riskReason: string;
  repaymentSchedule: RepaymentInstallment[];
}

export interface Transaction {
  id: string;
  reference: string; // e.g. "TXN-83921021"
  memberId: string;
  memberName: string;
  type: 'Deposit' | 'Withdrawal' | 'Loan Disbursement' | 'Repayment' | 'Dividend Credit';
  amount: number;
  paymentMethod: 'M-Pesa' | 'Bank Transfer' | 'Card' | 'SACCO Balance';
  fee: number;
  timestamp: string;
  status: 'Completed' | 'Pending' | 'Failed';
  description: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  performedByEmail: string;
  performedByRole: UserRole;
  details: string;
  hash: string;
  prevHash: string;
  isIntegrityOk?: boolean;
}

export interface SACCOSettings {
  saccoName: string;
  baseInterestRateSavings: number; // APY %
  baseInterestRateLoans: number; // Monthly %
  maxLoanMultiplier: number; // e.g. 3x savings
  minGuarantorsRequired: number;
  mpesaShortcode: string;
  mpesaCallbackUrl: string;
  registrationFee: number;
  penaltyOverdueRate: number; // % fee added to late installments
  strictKycLoanApproval?: boolean; // When active, restricts loans to Admins or Verified members only
}

export interface DashboardStats {
  totalMembers: number;
  totalSavings: number;
  activeLoansAmount: number;
  loanRepaymentRate: number; // %
  pendingLoansCount: number;
  monthlyRevenue: number;
  recentTransactions: Transaction[];
  recentAuditLogs: AuditLog[];
}
