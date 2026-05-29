import { Router, Response } from 'express';
import { loadDatabase } from '../db';
import { authenticateToken } from '../middlewares/security';

const router = Router();

// GET /api/transactions
router.get('/', authenticateToken, (req: any, res: Response) => {
  const db = loadDatabase();
  const currentUser = req.user;

  if (currentUser.role === 'Member') {
    const userTxns = db.transactions.filter(t => t.memberId === currentUser.memberId);
    res.json(userTxns);
  } else {
    res.json(db.transactions);
  }
});

export default router;
