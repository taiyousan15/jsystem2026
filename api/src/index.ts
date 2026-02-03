import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

import { authRouter } from './routes/auth.js';
import { accountRouter } from './routes/accounts.js';
import { analyticsRouter } from './routes/analytics.js';
import { jobsRouter } from './routes/jobs.js';
import { reportsRouter } from './routes/reports.js';
import { usersRouter } from './routes/users.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { startWorkers } from './workers/index.js';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json());

// Static file serving for reports
app.use('/reports', express.static(path.join(process.cwd(), 'reports')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/v1/auth', authRouter);

// Protected routes
app.use('/api/v1/accounts', authMiddleware, accountRouter);
app.use('/api/v1/analytics', authMiddleware, analyticsRouter);
app.use('/api/v1/jobs', authMiddleware, jobsRouter);
app.use('/api/v1/reports', authMiddleware, reportsRouter);
app.use('/api/v1/users', authMiddleware, usersRouter);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);

  // Start workers if enabled
  if (process.env.ENABLE_WORKERS !== 'false') {
    startWorkers();
  }
});

export default app;
