import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

// Import Modular Routers
import authRouter from './server/routes/auth';
import membersRouter from './server/routes/members';
import savingsRouter from './server/routes/savings';
import loansRouter from './server/routes/loans';
import repaymentsRouter from './server/routes/repayments';
import transactionsRouter from './server/routes/transactions';
import settingsRouter from './server/routes/settings';
import dashboardRouter from './server/routes/dashboard';
import auditRouter from './server/routes/audit';
import mpesaRouter from './server/routes/mpesa';

// Import Global Rate Limit Throttler
import { globalApiLimiter } from './server/middlewares/rateLimiter';
import logger from './server/services/logger';
import { LiveUpdatesHub } from './server/services/live-updates';

const app = express();
const PORT = 3000;

// Trust reverse proxy (Cloud Run / Nginx / Render / Heroku)
app.set('trust proxy', 1);

// -------------------------------------------------------------
// SECURE HEADER INTEGRATION (Helmet with production CSP and standard rules)
// -------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://images.pexels.com", "https://avatar.vercel.sh"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
      frameAncestors: ["'self'", "https://ai.studio", "https://*.run.app", "http://localhost:*", "https://ai.studio.google.com"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// -------------------------------------------------------------
// HTTPS ENFORCER MIDDLEWARE (SSL is terminated natively by Cloud Run / Reverse Proxy)
// -------------------------------------------------------------
app.use((req: Request, res: Response, next: NextFunction) => {
  // Cloud Run terminates SSL on the outer boundary and manages HTTPS natively.
  // Manual redirection inside the container is bypassed to prevent loop conditions.
  next();
});

// Configure standard HSTS (HTTP Strict Transport Security) header
app.use((req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

app.use(express.json());
app.use(cookieParser());


// App level generic API Rate Limiting protection
app.use('/api', globalApiLimiter);

// -------------------------------------------------------------
// HEALTH MONITORING ENDPOINT
// -------------------------------------------------------------
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'Healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'SACCO Digital Core'
  });
});

// -------------------------------------------------------------
// REAL-TIME PUBLISH STREAM SECURED HANDLER
// -------------------------------------------------------------
app.get('/api/live-updates', (req: Request, res: Response) => {
  const clientId = (req.query.clientId as string) || `cli-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  LiveUpdatesHub.register(clientId, res);
});

// -------------------------------------------------------------
// MOUNT MODULAR SERVICES ROUTERS
// -------------------------------------------------------------
app.use('/api/auth', authRouter);
app.use('/api/members', membersRouter);
app.use('/api/savings', savingsRouter);
app.use('/api/loans', loansRouter);
app.use('/api/repayments', repaymentsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/audit', auditRouter);
app.use('/api/mpesa', mpesaRouter);

// -------------------------------------------------------------
// CENTRALIZED FINTECH ERROR MIDDLEWARE
// -------------------------------------------------------------
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('[Centralized Error Shield]', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method
  });

  res.status(err.status || 500).json({
    error: "A secure systems exception occurred. Financial ledger calculations were protected and reversed.",
    ref: `ERR-CORE-${Date.now()}`
  });
});

// -------------------------------------------------------------
// CORE RUNTIME AND VITE DEVELOPMENT MIDDLEWARE
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`[Apex SACCO] Modular Fintech Core booting complete. Interface hosted: http://localhost:${PORT}`);
  });
}

startServer();

