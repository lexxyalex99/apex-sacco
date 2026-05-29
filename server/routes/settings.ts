import { Router, Response } from 'express';
import { loadDatabase, saveDatabase, appendAuditLog } from '../db';
import { authenticateToken, requireRoles } from '../middlewares/security';
import { settingsModificationLimiter } from '../middlewares/rateLimiter';
import crypto from 'crypto';

const router = Router();

// GET /api/settings
router.get('/', authenticateToken, (req: any, res: Response) => {
  const db = loadDatabase();
  res.json(db.settings);
});

// PUT /api/settings
router.put('/', authenticateToken, requireRoles(['Admin']), settingsModificationLimiter, (req: any, res: Response) => {
  const db = loadDatabase();
  db.settings = { ...db.settings, ...req.body };
  saveDatabase(db);
  appendAuditLog("Administrative Settings Change", req.user.email, "Admin", "Updated SACCO business rule boundaries and parameters.");
  res.json({ message: "Settings updated successfully.", settings: db.settings });
});

// GET /api/settings/backup
router.get('/backup', authenticateToken, requireRoles(['Admin']), (req: any, res: Response) => {
  try {
    const db = loadDatabase();
    // Serialize and encrypt simple backup using a standard static key for simulation
    const serialized = JSON.stringify(db);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.alloc(32, 'sacco-core-secure-aes-key-32-bytes'), Buffer.alloc(16, 0));
    let encrypted = cipher.update(serialized, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    appendAuditLog("Database Backup Created", req.user.email, req.user.role, "Admin compiled and encrypted a safe snapshot of full system data tables.");
    
    res.json({
      timestamp: new Date().toISOString(),
      backupHash: crypto.createHash('sha256').update(serialized).digest('hex'),
      backupPayload: encrypted
    });
  } catch (err: any) {
    res.status(500).json({ error: `Backup packaging failure: ${err.message}` });
  }
});

// POST /api/settings/restore
router.post('/restore', authenticateToken, requireRoles(['Admin']), (req: any, res: Response) => {
  const { backupPayload } = req.body;
  if (!backupPayload) {
    res.status(400).json({ error: "No backupPayload provided for recovery." });
    return;
  }

  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.alloc(32, 'sacco-core-secure-aes-key-32-bytes'), Buffer.alloc(16, 0));
    let decrypted = decipher.update(backupPayload, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    const restoredDb = JSON.parse(decrypted);

    // Validate schema integrity
    if (!restoredDb.users || !restoredDb.members || !restoredDb.loans || !restoredDb.transactions) {
      res.status(400).json({ error: "Backup integrity check failed. Core schema models are missing." });
      return;
    }

    saveDatabase(restoredDb);
    appendAuditLog("Database State Restored", req.user.email, req.user.role, "Admin performed database restoration from encrypted backup file container.");

    res.json({ success: true, message: "Database ledger reverted and restored successfully." });
  } catch (err: any) {
    res.status(400).json({ error: `Decryption or validation failure: ${err.message}` });
  }
});

export default router;
