import { Router, Response } from 'express';
import { loadDatabase, verifyLedgerIntegrity } from '../db';
import { authenticateToken, requireRoles } from '../middlewares/security';

const router = Router();

// GET /api/audit
router.get('/', authenticateToken, requireRoles(['Admin', 'Loan Officer', 'Accountant']), (req: any, res: Response) => {
  const db = loadDatabase();
  res.json(db.auditLogs);
});

// POST /api/audit/verify
router.post('/verify', authenticateToken, (req: any, res: Response) => {
  const integrity = verifyLedgerIntegrity();
  res.json({
    success: true,
    isValid: integrity.isValid,
    brokenAtIndex: integrity.brokenAtIndex,
    timestamp: new Date().toISOString()
  });
});

export default router;
