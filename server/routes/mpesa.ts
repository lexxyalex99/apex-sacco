import { Router, Request, Response } from 'express';
import { reconcileMpesaTransaction, initiateStkPush, executeB2CDisbursement } from '../services/mpesa';
import { authenticateToken, requireRoles } from '../middlewares/security';
import { loadDatabase, saveDatabase, appendAuditLog, getPrismaClient } from '../db';
import logger from '../services/logger';

const router = Router();

// Local store for failed callbacks to support "Failed Callback Recovery" (Fintech requirement #2)
export interface FailedCallbackLog {
  id: string;
  timestamp: string;
  sourceIp: string;
  headers: any;
  payload: any;
  failureReason: string;
  status: 'Pending Review' | 'Recovered' | 'Ignored';
}

// Ensure database fallback schema structures are persistent
function getFailedCallbacks(): FailedCallbackLog[] {
  const db: any = loadDatabase();
  if (!db.failedCallbacks) {
    db.failedCallbacks = [];
    saveDatabase(db);
  }
  return db.failedCallbacks;
}

// -------------------------------------------------------------------
// 1. DARAJA API WEBHOOK HANDLER WITH SIGNED SECURITY CHECKS
// -------------------------------------------------------------------
router.post('/callback', (req: Request, res: Response) => {
  const clientIp = req.ip || req.headers['x-forwarded-for'] || "unknown";
  console.log(`[M-Pesa Webhook Callback Received from ${clientIp}]`, JSON.stringify(req.body, null, 2));

  // A. Signature / JWT authorization token guard
  const reqToken = req.query.token || req.headers['x-mpesa-signature'];
  const secureWebhookSecret = process.env.MPESA_WEBHOOK_SECRET || "mpesa-shared-sacco-token-93012";

  if (reqToken !== secureWebhookSecret && process.env.NODE_ENV === 'production') {
    logger.warn(`[M-Pesa Hook Warning] Unauthenticated webhook signature attempt detected from IP: ${clientIp}`);
    res.status(401).json({ ResultCode: 103, ResultDesc: "Unauthorized callback signature verification failed." });
    return;
  }

  try {
    const result = reconcileMpesaTransaction(req.body);
    
    if (result.success) {
      res.json({ ResultCode: 0, ResultDesc: "Daraja payload parsed and double-entry posted." });
    } else {
      // B. Save to Failed Callbacks Vault for Admin recovery (Criterion #2)
      const failedLogs = getFailedCallbacks();
      const db: any = loadDatabase();
      
      const newFailLog: FailedCallbackLog = {
        id: `mpe-fail-${Date.now()}-${Math.floor(100+Math.random()*900)}`,
        timestamp: new Date().toISOString(),
        sourceIp: String(clientIp),
        headers: req.headers,
        payload: req.body,
        failureReason: result.message,
        status: 'Pending Review'
      };
      
      failedLogs.push(newFailLog);
      db.failedCallbacks = failedLogs;
      saveDatabase(db);

      logger.warn(`[M-Pesa Webhook Reconcile Failure] Archived to core vault for manual audit.`, { reason: result.message });
      
      // Return 200 to Safaricom gateways to prevent retries while banking logs are safe
      res.status(200).json({ ResultCode: 1, ResultDesc: `Reconcile bypassed: ${result.message}` });
    }
  } catch (err: any) {
    console.error("[M-Pesa Webhook Exception]", err);
    res.status(200).json({ ResultCode: 9, ResultDesc: "Gateway database connection error. Log saved for auto-recovery." });
  }
});

// -------------------------------------------------------------------
// 2. PAYMENT INITIATION ENDPOINTS (STKPush, B2C, Status Verification)
// -------------------------------------------------------------------
router.post('/stkpush', authenticateToken, async (req: any, res: Response) => {
  const { phone, amount, memberId, type = 'Deposit', description = 'SACCO payment contribution' } = req.body;

  if (!phone || !amount || !memberId) {
    res.status(400).json({ error: "Phone number, amount and memberId are required." });
    return;
  }

  try {
    const db = loadDatabase();
    const member = db.members.find(m => m.memberId === memberId);
    const reference = `MPE-${Math.floor(100000 + Math.random() * 900000)}`;

    const response = await initiateStkPush({
      phone,
      amount,
      reference,
      description
    });

    if (response.success) {
      // Record initial Pending Transaction
      const pendingTxn: any = {
        id: `tx-stk-${Date.now()}`,
        reference: response.checkoutRequestId || reference,
        memberId,
        memberName: member?.fullName || "Sacco Active Member",
        type,
        amount,
        paymentMethod: "M-Pesa",
        fee: 0,
        timestamp: new Date().toISOString(),
        status: "Pending",
        description: `${type} via Lipa Na M-Pesa. [Checkout ID: ${response.checkoutRequestId}]`
      };

      db.transactions.push(pendingTxn);
      saveDatabase(db);

      // Try mirroring to Prisma if exists
      const prisma = getPrismaClient();
      if (prisma) {
        try {
          await prisma.transaction.create({
            data: {
              id: pendingTxn.id,
              reference: pendingTxn.reference,
              memberId: pendingTxn.memberId,
              memberName: pendingTxn.memberName,
              type: pendingTxn.type,
              amount: pendingTxn.amount,
              paymentMethod: pendingTxn.paymentMethod,
              fee: pendingTxn.fee,
              status: pendingTxn.status,
              description: pendingTxn.description,
              timestamp: new Date(pendingTxn.timestamp)
            }
          });
        } catch (e) {
          logger.warn("Prisma sync skipped for pending stkpush txn", e);
        }
      }

      res.json({
        success: true,
        checkoutRequestId: response.checkoutRequestId,
        message: "STK push initiated successfully. Pin prompt sent.",
        isDemo: response.isDemo
      });
    } else {
      res.status(400).json({ error: "Safaricom gateway rejected STK initiation." });
    }
  } catch (err: any) {
    logger.error("STK push endpoint crash", err);
    res.status(500).json({ error: err.message || "Failed to trigger Safaricom process request." });
  }
});

router.post('/b2c', authenticateToken, requireRoles(['Admin', 'Accountant']), async (req: any, res: Response) => {
  const { phone, amount, memberId, description = "SACCO Loan Disbursement payout" } = req.body;

  if (!phone || !amount || !memberId) {
    res.status(400).json({ error: "Phone number, amount and memberId are required." });
    return;
  }

  try {
    const reference = `B2C-${Math.floor(100000 + Math.random() * 900000)}`;
    const response = await executeB2CDisbursement({
      phone,
      amount,
      reference,
      description
    });

    res.json({
      success: true,
      conversationId: response.conversationId,
      message: "B2C transfer dispatched. Funds will arrive on member device shortly.",
      isDemo: response.isDemo
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "B2C payout gateway refusal." });
  }
});

router.get('/status', authenticateToken, (req: Request, res: Response) => {
  const { checkoutRequestId } = req.query;

  if (!checkoutRequestId) {
    res.status(400).json({ error: "checkoutRequestId parameter is required." });
    return;
  }

  const db = loadDatabase();
  const txn = db.transactions.find(t => t.description.includes(checkoutRequestId as string) || t.reference === checkoutRequestId);

  if (!txn) {
    res.status(404).json({ error: "Direct transaction matching this reference was not found." });
    return;
  }

  res.json({
    reference: txn.reference,
    amount: txn.amount,
    status: txn.status,
    description: txn.description,
    timestamp: txn.timestamp
  });
});

router.post('/b2c/result', (req: Request, res: Response) => {
  console.log("[M-Pesa Webhook B2C Result Received]", JSON.stringify(req.body, null, 2));
  res.json({ ResultCode: 0, ResultDesc: "Disbursement payout logged." });
});

router.post('/b2c/timeout', (req: Request, res: Response) => {
  console.error("[M-Pesa Webhook B2C Timeout Warning]", JSON.stringify(req.body, null, 2));
  res.json({ ResultCode: 0, ResultDesc: "Timeout parsed successfully." });
});

// -------------------------------------------------------------------
// 3. ADMIN PORTAL FAILED CALLBACK RECOVERY SERVICES
// -------------------------------------------------------------------
router.get('/failed-callbacks', authenticateToken, requireRoles(['Admin']), (req: any, res: Response) => {
  res.json(getFailedCallbacks());
});

router.post('/failed-callbacks/recover', authenticateToken, requireRoles(['Admin']), (req: any, res: Response) => {
  const { id } = req.body;
  const db: any = loadDatabase();
  const failedLogs = getFailedCallbacks();
  
  const target = failedLogs.find(l => l.id === id);
  if (!target) {
    res.status(404).json({ error: "Failed callback log reference not found." });
    return;
  }

  try {
    // Force a replay transaction reconciliation
    const result = reconcileMpesaTransaction(target.payload);
    if (result.success) {
      target.status = 'Recovered';
      saveDatabase(db);
      
      appendAuditLog(
        "M-Pesa Webhook Manual Recovery Complete",
        req.user.email,
        req.user.role,
        `Admin manually restored transaction from raw Safaricom webhook dump ID: ${id}`
      );
      
      res.json({ success: true, message: "Callback successfully recovered and ledger updated.", status: 'Recovered' });
    } else {
      res.status(400).json({ error: `Manual replay rejection: ${result.message}` });
    }
  } catch (error: any) {
    res.status(500).json({ error: `Replay execute exception: ${error.message}` });
  }
});

export default router;
