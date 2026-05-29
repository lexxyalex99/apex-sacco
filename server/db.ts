import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { Member, Loan, Transaction, AuditLog, SACCOSettings, User, UserRole, RepaymentInstallment } from '../src/types';

// Configuration file path for sandbox fallback
const DB_FILE = path.join(process.cwd(), 'sacco_db.json');

// Interface for database structure
export interface LocalOTPSession {
  id: string;
  userId: string;
  userEmail: string;
  otpCode: string;
  expiresAt: string;
  isVerified: boolean;
  attempts: number;
}

export interface LocalRefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  revoked: boolean;
}

export interface DatabaseSchema {
  users: Array<User & { passwordHash: string; otpCode?: string; otpExpires?: string }>;
  members: Member[];
  loans: Loan[];
  transactions: Transaction[];
  auditLogs: AuditLog[];
  settings: SACCOSettings;
  otpSessions?: LocalOTPSession[];
  refreshTokens?: LocalRefreshToken[];
}

const DEFAULT_SETTINGS: SACCOSettings = {
  saccoName: "Apex Co-operative SACCO",
  baseInterestRateSavings: 8.5,
  baseInterestRateLoans: 1.2,
  maxLoanMultiplier: 3.0,
  minGuarantorsRequired: 2,
  mpesaShortcode: "721900",
  mpesaCallbackUrl: "https://api.apexsacco.co.ke/v1/mpesa-callback",
  registrationFee: 1000,
  penaltyOverdueRate: 5
};

// Lazy loaded Prisma Client wrapper
let prismaClientInstance: PrismaClient | null = null;
let isPrismaConnected = false;

function handlePrismaFallback(context: string, e: any) {
  if (isPrismaConnected) {
    console.log(`[Apex DB Engine] Link offline during ${context}, routing via Local storage fallback.`);
    isPrismaConnected = false;
  }
}

export function getPrismaClient(): PrismaClient | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  if (!prismaClientInstance) {
    try {
      prismaClientInstance = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });
      isPrismaConnected = true;
      console.log("[Apex DB] Engine initialized successfully.");
    } catch (e) {
      console.log("[Apex DB] Fallback storage routing active.");
      prismaClientInstance = null;
      isPrismaConnected = false;
    }
  }
  return prismaClientInstance;
}

// Global variable for our active JSON database
let activeDb: DatabaseSchema;

export function loadDatabase(): DatabaseSchema {
  if (activeDb) {
    return activeDb;
  }

  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (parsed.users && parsed.members && parsed.loans && parsed.transactions && parsed.auditLogs) {
        activeDb = parsed;
        if (!activeDb.otpSessions) activeDb.otpSessions = [];
        if (!activeDb.refreshTokens) activeDb.refreshTokens = [];
        return activeDb;
      }
    }
  } catch (error) {
    console.error("[Apex JSON DB] Parsing error, seeding fresh file...", error);
  }

  activeDb = generateSeedData();
  saveDatabase(activeDb);
  return activeDb;
}

export function saveDatabase(db: DatabaseSchema): void {
  activeDb = db;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error("[Apex JSON DB] Could not write database state to file system:", error);
  }
}

// Helper: Seed initial data
function generateSeedData(): DatabaseSchema {
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync("password123", salt);

  const initialUsers = [
    {
      id: "usr-1",
      email: "admin@sacco.co.ke",
      role: "Admin" as const,
      fullName: "Grace Kendi",
      status: "Active" as const,
      passwordHash: defaultPasswordHash,
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      lastLogin: new Date().toISOString()
    },
    {
      id: "usr-2",
      email: "officer@sacco.co.ke",
      role: "Loan Officer" as const,
      fullName: "Paul Omwamba",
      status: "Active" as const,
      passwordHash: defaultPasswordHash,
      avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
      lastLogin: new Date().toISOString()
    },
    {
      id: "usr-3",
      email: "accountant@sacco.co.ke",
      role: "Accountant" as const,
      fullName: "Mercy Chepngetich",
      status: "Active" as const,
      passwordHash: defaultPasswordHash,
      avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
      lastLogin: new Date().toISOString()
    },
    {
      id: "usr-4",
      email: "member@sacco.co.ke",
      role: "Member" as const,
      fullName: "Joshua Mwangi",
      memberId: "SACCO-1021",
      status: "Active" as const,
      passwordHash: defaultPasswordHash,
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      lastLogin: new Date().toISOString()
    },
    {
      id: "usr-5",
      email: "tabitha@gmail.com",
      role: "Member" as const,
      fullName: "Tabitha Kamau",
      memberId: "SACCO-1022",
      status: "Active" as const,
      passwordHash: defaultPasswordHash,
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
      lastLogin: new Date().toISOString()
    }
  ];

  const initialMembers: Member[] = [
    {
      id: "mem-1",
      memberId: "SACCO-1021",
      fullName: "Joshua Mwangi",
      email: "member@sacco.co.ke",
      phone: "+254 712 345 678",
      nationalId: "30291845",
      joinedDate: "2024-01-12T08:30:00Z",
      status: "Active",
      savingsBalance: 145000,
      activeLoansCount: 1,
      totalBorrowed: 180000,
      totalRepaid: 120000,
      dividendsPaid: 12500,
      tier: "Gold",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "mem-2",
      memberId: "SACCO-1022",
      fullName: "Tabitha Kamau",
      email: "tabitha@gmail.com",
      phone: "+254 722 987 654",
      nationalId: "29384756",
      joinedDate: "2024-03-05T10:15:00Z",
      status: "Active",
      savingsBalance: 85000,
      activeLoansCount: 0,
      totalBorrowed: 50000,
      totalRepaid: 50000,
      dividendsPaid: 4200,
      tier: "Silver",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "mem-3",
      memberId: "SACCO-1023",
      fullName: "Abel Kiprop",
      email: "kiprop@hotmail.com",
      phone: "+254 701 444 333",
      nationalId: "31829302",
      joinedDate: "2024-05-19T14:45:00Z",
      status: "Active",
      savingsBalance: 310000,
      activeLoansCount: 1,
      totalBorrowed: 450000,
      totalRepaid: 150000,
      dividendsPaid: 28000,
      tier: "Platinum",
      avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "mem-4",
      memberId: "SACCO-1024",
      fullName: "Cynthia Wambui",
      email: "cynthia_w@yahoo.com",
      phone: "+254 733 888 999",
      nationalId: "32948102",
      joinedDate: "2024-06-01T09:00:00Z",
      status: "Active",
      savingsBalance: 42000,
      activeLoansCount: 1,
      totalBorrowed: 30000,
      totalRepaid: 15000,
      dividendsPaid: 1500,
      tier: "Bronze",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
    },
    {
      id: "mem-5",
      memberId: "SACCO-1025",
      fullName: "Dennis Ochieng",
      email: "ochienge_dennis@gmail.com",
      phone: "+254 711 222 111",
      nationalId: "27384910",
      joinedDate: "2023-11-20T11:20:00Z",
      status: "Suspended",
      savingsBalance: 12500,
      activeLoansCount: 1,
      totalBorrowed: 80000,
      totalRepaid: 30000,
      dividendsPaid: 800,
      tier: "Bronze",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
    }
  ];

  const initialLoans: Loan[] = [
    {
      id: "loan-1",
      loanId: "LN-5291",
      memberId: "SACCO-1021",
      memberName: "Joshua Mwangi",
      amount: 180000,
      interestRate: 1.2,
      tenureMonths: 12,
      purpose: "Agricultural Equipment Expansion",
      status: "Approved",
      guarantors: ["SACCO-1022", "SACCO-1023"],
      applicationDate: "2026-01-15T12:00:00Z",
      approvalDate: "2026-01-16T09:30:00Z",
      outstandingBalance: 60000,
      monthlyInstallment: 16800,
      dueDate: "2026-06-16T00:00:00Z",
      riskScore: "Low",
      riskReason: "High savings ratio and verified credit history of guarantors.",
      repaymentSchedule: [
        { installmentNumber: 1, dueDate: "2026-02-16T00:00:00Z", amountDue: 16800, amountPaid: 16800, status: "Paid" },
        { installmentNumber: 2, dueDate: "2026-03-16T00:00:00Z", amountDue: 16800, amountPaid: 16800, status: "Paid" },
        { installmentNumber: 3, dueDate: "2026-04-16T00:00:00Z", amountDue: 16800, amountPaid: 16800, status: "Paid" },
        { installmentNumber: 4, dueDate: "2026-05-16T00:00:00Z", amountDue: 16800, amountPaid: 16800, status: "Paid" },
        { installmentNumber: 5, dueDate: "2026-06-16T00:00:00Z", amountDue: 16800, amountPaid: 0, status: "Unpaid" },
        { installmentNumber: 6, dueDate: "2026-07-16T00:00:00Z", amountDue: 16800, amountPaid: 0, status: "Unpaid" }
      ]
    },
    {
      id: "loan-2",
      loanId: "LN-5292",
      memberId: "SACCO-1023",
      memberName: "Abel Kiprop",
      amount: 450000,
      interestRate: 1.2,
      tenureMonths: 24,
      purpose: "Commercial Truck Importation Mortgage",
      status: "Approved",
      guarantors: ["SACCO-1021", "SACCO-1022"],
      applicationDate: "2025-08-10T10:00:00Z",
      approvalDate: "2025-08-12T14:00:00Z",
      outstandingBalance: 300000,
      monthlyInstallment: 24150,
      dueDate: "2026-06-12T00:00:00Z",
      riskScore: "Medium",
      riskReason: "High loan amount, but mitigated by massive gold-tier collateral and multiple guarantors.",
      repaymentSchedule: [
        { installmentNumber: 1, dueDate: "2025-09-12T00:00:00Z", amountDue: 24150, amountPaid: 24150, status: "Paid" },
        { installmentNumber: 2, dueDate: "2025-10-12T00:00:00Z", amountDue: 24150, amountPaid: 24150, status: "Paid" },
        { installmentNumber: 3, dueDate: "2025-11-12T00:00:00Z", amountDue: 24150, amountPaid: 24150, status: "Paid" },
        { installmentNumber: 4, dueDate: "2025-12-12T00:00:00Z", amountDue: 24150, amountPaid: 24150, status: "Paid" },
        { installmentNumber: 5, dueDate: "2026-01-12T00:00:00Z", amountDue: 24150, amountPaid: 24150, status: "Paid" },
        { installmentNumber: 6, dueDate: "2026-02-12T00:00:00Z", amountDue: 24150, amountPaid: 24150, status: "Paid" },
        { installmentNumber: 7, dueDate: "2026-03-12T00:00:00Z", amountDue: 24150, amountPaid: 0, status: "Unpaid" },
        { installmentNumber: 8, dueDate: "2026-04-12T00:00:00Z", amountDue: 24150, amountPaid: 0, status: "Unpaid" }
      ]
    },
    {
      id: "loan-3",
      loanId: "LN-5293",
      memberId: "SACCO-1025",
      memberName: "Dennis Ochieng",
      amount: 80000,
      interestRate: 1.2,
      tenureMonths: 6,
      purpose: "Emergency Retail Store Restocking",
      status: "Overdue",
      guarantors: ["SACCO-1021"],
      applicationDate: "2025-10-11T16:00:00Z",
      approvalDate: "2025-10-12T11:00:00Z",
      outstandingBalance: 50000,
      monthlyInstallment: 14200,
      dueDate: "2026-03-12T00:00:00Z",
      riskScore: "High",
      riskReason: "Savings balance depleted, overdue status on installment #4. Suspended member account.",
      repaymentSchedule: [
        { installmentNumber: 1, dueDate: "2025-11-12T00:00:00Z", amountDue: 14200, amountPaid: 14200, status: "Paid" },
        { installmentNumber: 2, dueDate: "2025-12-12T00:00:00Z", amountDue: 14200, amountPaid: 14200, status: "Paid" },
        { installmentNumber: 3, dueDate: "2026-01-12T00:00:00Z", amountDue: 14200, amountPaid: 1600, status: "Paid" },
        { installmentNumber: 4, dueDate: "2026-02-12T00:00:00Z", amountDue: 14200, amountPaid: 0, status: "Overdue" },
        { installmentNumber: 5, dueDate: "2026-03-12T00:00:00Z", amountDue: 14200, amountPaid: 0, status: "Overdue" }
      ]
    },
    {
      id: "loan-4",
      loanId: "LN-5294",
      memberId: "SACCO-1024",
      memberName: "Cynthia Wambui",
      amount: 30000,
      interestRate: 1.2,
      tenureMonths: 6,
      purpose: "Medical Bills Settlement Assistance",
      status: "Approved",
      guarantors: ["SACCO-1021", "SACCO-1023"],
      applicationDate: "2026-04-10T11:00:00Z",
      approvalDate: "2026-04-12T09:00:00Z",
      outstandingBalance: 15000,
      monthlyInstallment: 5360,
      dueDate: "2026-06-12T00:00:00Z",
      riskScore: "Low",
      riskReason: "Guaranteed by platinum members Abel and Joshua.",
      repaymentSchedule: [
        { installmentNumber: 1, dueDate: "2026-05-12T00:00:00Z", amountDue: 5360, amountPaid: 5360, status: "Paid" },
        { installmentNumber: 2, dueDate: "2026-06-12T00:00:00Z", amountDue: 5360, amountPaid: 0, status: "Unpaid" }
      ]
    },
    {
      id: "loan-5",
      loanId: "LN-5295",
      memberId: "SACCO-1022",
      memberName: "Tabitha Kamau",
      amount: 120000,
      interestRate: 1.2,
      tenureMonths: 12,
      purpose: "SME Food Truck Launching Capital",
      status: "Pending",
      guarantors: ["SACCO-1021", "SACCO-1023"],
      applicationDate: "2026-05-25T11:45:00Z",
      outstandingBalance: 120000,
      monthlyInstallment: 11140,
      dueDate: "2026-06-30T00:00:00Z",
      riskScore: "Low",
      riskReason: "Tabitha has clean savings growth and no current outstanding debts.",
      repaymentSchedule: []
    }
  ];

  const initialTransactions: Transaction[] = [
    {
      id: "tx-1",
      reference: "TXN-MP-7918",
      memberId: "SACCO-1021",
      memberName: "Joshua Mwangi",
      type: "Deposit",
      amount: 25000,
      paymentMethod: "M-Pesa",
      fee: 0,
      timestamp: "2026-05-24T08:12:00Z",
      status: "Completed",
      description: "Monthly savings regular check-in contribution"
    },
    {
      id: "tx-2",
      reference: "TXN-OT-8120",
      memberId: "SACCO-1022",
      memberName: "Tabitha Kamau",
      type: "Deposit",
      amount: 15000,
      paymentMethod: "Bank Transfer",
      fee: 100,
      timestamp: "2026-05-25T14:30:00Z",
      status: "Completed",
      description: "Additional flexible savings deposit"
    },
    {
      id: "tx-3",
      reference: "TXN-MP-9021",
      memberId: "SACCO-1021",
      memberName: "Joshua Mwangi",
      type: "Repayment",
      amount: 16800,
      paymentMethod: "M-Pesa",
      fee: 0,
      timestamp: "2026-05-16T10:00:00Z",
      status: "Completed",
      description: "Installment #4 payment for active agricultural expansion loan"
    },
    {
      id: "tx-4",
      reference: "TXN-MD-0294",
      memberId: "SACCO-1024",
      memberName: "Cynthia Wambui",
      type: "Loan Disbursement",
      amount: 30000,
      paymentMethod: "Bank Transfer",
      fee: 0,
      timestamp: "2026-04-12T10:00:00Z",
      status: "Completed",
      description: "Disbursement of emergency medical bill loan"
    },
    {
      id: "tx-5",
      reference: "TXN-MP-1102",
      memberId: "SACCO-1023",
      memberName: "Abel Kiprop",
      type: "Deposit",
      amount: 50000,
      paymentMethod: "M-Pesa",
      fee: 0,
      timestamp: "2026-05-20T11:40:00Z",
      status: "Completed",
      description: "Regular savings credit"
    },
    {
      id: "tx-6",
      reference: "TXN-MP-4921",
      memberId: "SACCO-1025",
      memberName: "Dennis Ochieng",
      type: "Withdrawal",
      amount: 8000,
      paymentMethod: "M-Pesa",
      fee: 150,
      timestamp: "2026-02-15T09:20:00Z",
      status: "Completed",
      description: "Emergency partial savings withdrawal"
    },
    {
      id: "tx-7",
      reference: "TXN-MP-9381",
      memberId: "SACCO-1021",
      memberName: "Joshua Mwangi",
      type: "Withdrawal",
      amount: 30000,
      paymentMethod: "Card",
      fee: 250,
      timestamp: "2026-05-26T15:45:00Z",
      status: "Completed",
      description: "ATM Cash point withdrawal"
    }
  ];

  const initialLogsToGenerate = [
    {
      id: "aud-1",
      timestamp: "2026-05-20T08:00:00Z",
      action: "Genesis Block Initialized",
      performedByEmail: "admin@sacco.co.ke",
      performedByRole: "Admin" as const,
      details: "System successfully initialized with default security credentials, SACCO policies, and secure encryption constants."
    },
    {
      id: "aud-2",
      timestamp: "2026-05-21T09:30:00Z",
      action: "Policy Settings Update",
      performedByEmail: "admin@sacco.co.ke",
      performedByRole: "Admin" as const,
      details: "Updated base savings APY to 8.5% and checked limits for max multiplier."
    },
    {
      id: "aud-3",
      timestamp: "2026-05-24T10:15:00Z",
      action: "Savings Deposit Registered",
      performedByEmail: "accountant@sacco.co.ke",
      performedByRole: "Accountant" as const,
      details: "Registered 25,000 KES savings deposit for member Joshua Mwangi (SACCO-1021) via M-Pesa."
    },
    {
      id: "aud-4",
      timestamp: "2026-05-25T11:47:00Z",
      action: "Loan Application Logged",
      performedByEmail: "tabitha@gmail.com",
      performedByRole: "Member" as const,
      details: "Member Tabitha Kamau (SACCO-1022) submitted application LN-5295 for 120,000 KES."
    }
  ];

  const chainedLogs: AuditLog[] = [];
  let prevHash = "0000000000000000000000000000000000000000000000000000000000000000";

  for (const log of initialLogsToGenerate) {
    const dataToHash = `${log.id}-${log.timestamp}-${log.action}-${log.performedByEmail}-${log.details}-${prevHash}`;
    const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');

    chainedLogs.push({
      ...log,
      hash,
      prevHash,
      isIntegrityOk: true
    });
    prevHash = hash;
  }

  return {
    users: initialUsers,
    members: initialMembers,
    loans: initialLoans,
    transactions: initialTransactions,
    auditLogs: chainedLogs,
    settings: DEFAULT_SETTINGS,
    otpSessions: [],
    refreshTokens: []
  };
}

// -------------------------------------------------------------
// SECURE AUDIT LEDGER WRITER WITH BLOCKCHAIN CRYPTO CHAINS
// -------------------------------------------------------------
export function appendAuditLog(
  action: string,
  userEmail: string,
  userRole: UserRole,
  details: string
): AuditLog {
  const db = loadDatabase();
  const nextId = "aud-" + (db.auditLogs.length + 1) + "-" + Math.floor(1000 + Math.random() * 9000);
  const timestamp = new Date().toISOString();

  const lastLog = db.auditLogs[db.auditLogs.length - 1];
  const prevHash = lastLog ? lastLog.hash : "0000000000000000000000000000000000000000000000000000000000000000";

  const dataToHash = `${nextId}-${timestamp}-${action}-${userEmail}-${details}-${prevHash}`;
  const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');

  const newLog: AuditLog = {
    id: nextId,
    timestamp,
    action,
    performedByEmail: userEmail,
    performedByRole: userRole,
    details,
    hash,
    prevHash,
    isIntegrityOk: true
  };

  db.auditLogs.push(newLog);
  saveDatabase(db);

  // Programmatically mirror to Prisma in production if configured
  const p = getPrismaClient();
  if (p && isPrismaConnected) {
    p.auditLog.create({
      data: {
        id: nextId,
        timestamp: new Date(timestamp),
        action,
        performedByEmail: userEmail,
        performedByRole: userRole,
        details,
        hash,
        prevHash,
        isIntegrityOk: true
      }
    }).catch(e => {
      handlePrismaFallback("audit mirroring", e);
    });
  }

  return newLog;
}

export function verifyLedgerIntegrity(): { isValid: boolean; brokenAtIndex: number | null } {
  const db = loadDatabase();
  let prevHash = "0000000000000000000000000000000000000000000000000000000000000000";

  for (let i = 0; i < db.auditLogs.length; i++) {
    const log = db.auditLogs[i];

    if (log.prevHash !== prevHash) {
      return { isValid: false, brokenAtIndex: i };
    }

    const dataToVerify = `${log.id}-${log.timestamp}-${log.action}-${log.performedByEmail}-${log.details}-${prevHash}`;
    const calculatedHash = crypto.createHash('sha256').update(dataToVerify).digest('hex');

    if (log.hash !== calculatedHash) {
      return { isValid: false, brokenAtIndex: i };
    }

    prevHash = log.hash;
  }

  return { isValid: true, brokenAtIndex: null };
}

// -------------------------------------------------------------
// ADVANCED REFRESH TOKEN ENGINE
// -------------------------------------------------------------
export async function createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<any> {
  const p = getPrismaClient();
  if (p && isPrismaConnected) {
    try {
      return await p.refreshToken.create({
        data: {
          userId,
          token,
          expiresAt
        }
      });
    } catch (e) {
      handlePrismaFallback("createRefreshToken", e);
    }
  }

  const db = loadDatabase();
  if (!db.refreshTokens) db.refreshTokens = [];
  const localToken: LocalRefreshToken = {
    id: "rt-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
    userId,
    token,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
    revoked: false
  };
  db.refreshTokens.push(localToken);
  saveDatabase(db);
  return localToken;
}

export async function findRefreshToken(token: string): Promise<any> {
  const p = getPrismaClient();
  if (p && isPrismaConnected) {
    try {
      return await p.refreshToken.findUnique({
        where: { token },
        include: { user: true }
      });
    } catch (e) {
      handlePrismaFallback("findRefreshToken", e);
    }
  }

  const db = loadDatabase();
  if (!db.refreshTokens) db.refreshTokens = [];
  const found = db.refreshTokens.find(t => t.token === token && !t.revoked);
  if (found) {
    const user = db.users.find(u => u.id === found.userId);
    return {
      ...found,
      expiresAt: new Date(found.expiresAt),
      createdAt: new Date(found.createdAt),
      user
    };
  }
  return null;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const p = getPrismaClient();
  if (p && isPrismaConnected) {
    try {
      await p.refreshToken.update({
        where: { token },
        data: { revoked: true }
      });
      return;
    } catch (e) {
      handlePrismaFallback("revokeRefreshToken", e);
    }
  }

  const db = loadDatabase();
  if (!db.refreshTokens) db.refreshTokens = [];
  const found = db.refreshTokens.find(t => t.token === token);
  if (found) {
    found.revoked = true;
    saveDatabase(db);
  }
}

// -------------------------------------------------------------
// ANTI BRUTE FORCE LOGIN OTP SESSION ENGINE
// -------------------------------------------------------------
export async function createOTPSession(userId: string, email: string, code: string, expiresAt: Date): Promise<any> {
  const p = getPrismaClient();
  if (p && isPrismaConnected) {
    try {
      return await p.oTPSession.create({
        data: {
          userId,
          userEmail: email,
          otpCode: code,
          expiresAt
        }
      });
    } catch (e) {
      handlePrismaFallback("createOTPSession", e);
    }
  }

  const db = loadDatabase();
  if (!db.otpSessions) db.otpSessions = [];
  
  // Clear any existing active OTP sessions for user as standard anti-bloat best practice
  db.otpSessions = db.otpSessions.filter(s => s.userId !== userId);

  const newSession: LocalOTPSession = {
    id: "otp-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
    userId,
    userEmail: email,
    otpCode: code,
    expiresAt: expiresAt.toISOString(),
    isVerified: false,
    attempts: 0
  };
  db.otpSessions.push(newSession);
  saveDatabase(db);
  return newSession;
}

export async function verifyOTPSession(userEmail: string, code: string): Promise<{ success: boolean; error?: string }> {
  const p = getPrismaClient();
  const emailLower = userEmail.toLowerCase();

  if (p && isPrismaConnected) {
    try {
      const session = await p.oTPSession.findFirst({
        where: { userEmail: emailLower, isVerified: false },
        orderBy: { expiresAt: 'desc' }
      });

      if (!session) return { success: false, error: "No active verification session found." };
      if (new Date() > session.expiresAt) return { success: false, error: "Verification code expired. Please request a new OTP." };
      if (session.attempts >= 3) return { success: false, error: "Too many failed verification attempts. Account locked temporarily." };

      if (session.otpCode !== code) {
        await p.oTPSession.update({
          where: { id: session.id },
          data: { attempts: { increment: 1 } }
        });
        return { success: false, error: `Incorrect code. ${2 - session.attempts} standard attempts remaining.` };
      }

      await p.oTPSession.update({
        where: { id: session.id },
        data: { isVerified: true }
      });
      return { success: true };
    } catch (e) {
      handlePrismaFallback("verifyOTPSession", e);
    }
  }

  const db = loadDatabase();
  if (!db.otpSessions) db.otpSessions = [];
  
  const found = db.otpSessions.find(s => s.userEmail.toLowerCase() === emailLower && !s.isVerified);
  if (!found) return { success: false, error: "No active verification session found." };
  if (new Date() > new Date(found.expiresAt)) return { success: false, error: "Verification code expired. Please request a new OTP." };
  if (found.attempts >= 3) return { success: false, error: "Too many failed verification attempts. Try again later." };

  if (found.otpCode !== code) {
    found.attempts += 1;
    saveDatabase(db);
    return { success: false, error: `Incorrect code. ${3 - found.attempts} verification attempts remaining.` };
  }

  found.isVerified = true;
  saveDatabase(db);
  return { success: true };
}
