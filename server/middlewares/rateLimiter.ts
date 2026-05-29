import rateLimit from 'express-rate-limit';
import { appendAuditLog } from '../db';
import { UserRole } from '../../src/types';

// Standard logger helper for suspicious attempts
const logSuspiciousActivity = (action: string, ip: string, details: string) => {
  console.warn(`[🚨 Security Alert] IP: ${ip} - Action: ${action} - Details: ${details}`);
  try {
    appendAuditLog(
      "Intrusion/BruteForce Alert",
      `IP_${ip}`,
      "Member" as UserRole,
      `Rate limit exceeded for action: ${action}. Details: ${details}`
    );
  } catch (err) {
    // Fail silently to avoid interrupting server response
  }
};

// 1. Strict authentication limiter (Anti-Brute-Force)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins block
  max: 5, // Limit to 5 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  handler: (req, res, next, options) => {
    logSuspiciousActivity("Login Rate Limit Exceeded", req.ip || "unknown", `Failed login spike from client.`);
    res.status(429).json({
      error: "Too many login attempts. Brute-force block activated. Try again in 15 minutes."
    });
  }
});

// 2. OTP Verification Rate Limiter
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins block
  max: 5, // Limit to 5 OTP entries per window
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  handler: (req, res, next, options) => {
    logSuspiciousActivity("OTP Throttle Exceeded", req.ip || "unknown", `Spike on OTP verification endpoints.`);
    res.status(429).json({
      error: "Too many incorrect OTP attempts. Anti-spam throttle engaged. Please retry in 10 minutes."
    });
  }
});

// 3. Sensitive Loan Submission Limiter (Anti-Spam)
export const loanSubmissionLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 mins window
  max: 3, // Limit to 3 loan applications per half hour
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  handler: (req, res, next, options) => {
    logSuspiciousActivity("Loan Velocity Shield", req.ip || "unknown", "Repeated loan submission requests detected.");
    res.status(429).json({
      error: "Loan request rate limit exceeded. Please wait 30 minutes before submitting another application."
    });
  }
});

// 4. Admin Settings Modification Limiter
export const settingsModificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10, // Max 10 settings saves
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  handler: (req, res, next, options) => {
    logSuspiciousActivity("Settings Policy Gating", req.ip || "unknown", "Rapid admin settings write operations.");
    res.status(429).json({
      error: "Settings modification safety lock engaged. Rate of updates exceeded policy bounds."
    });
  }
});

// 5. Global API Generic Standard Limiter (Spam Protection)
export const globalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Max 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  skip: (req) => process.env.NODE_ENV !== 'production' && req.path.startsWith('/src/'), // Don't block vite compilation assets during development
  handler: (req, res, next, options) => {
    res.status(429).json({
      error: "Global request capacity breached. Slow down requests on this connection."
    });
  }
});
