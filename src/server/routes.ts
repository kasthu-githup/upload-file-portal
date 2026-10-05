import express, { type Router, type Response } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import { db, UPLOADS_DIR } from './db.ts';
import { tidb } from './tidb.ts';
import { requireAuth, generateToken, type AuthenticatedRequest } from './auth.ts';

const router: Router = express.Router();

// Configure Multer storage to keep files safely on disk
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    // Generate safe unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitized}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max file size
  },
});

// Helper to determine clean file category / label
function getSimplifiedFileType(mimeType: string, filename: string): string {
  const ext = path.extname(filename).toLowerCase().replace('.', '').toUpperCase();
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('zip') || mimeType.includes('compressed') || ext === 'ZIP' || ext === 'RAR' || ext === '7Z' || ext === 'TAR' || ext === 'GZ') return 'Archive';
  if (mimeType.startsWith('image/')) return ext ? ext : 'Image';
  if (mimeType.startsWith('video/')) return ext ? ext : 'Video';
  if (mimeType.startsWith('audio/')) return ext ? ext : 'Audio';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || ext === 'XLSX' || ext === 'CSV' || ext === 'XLS') return 'Spreadsheet';
  if (mimeType.includes('word') || ext === 'DOC' || ext === 'DOCX') return 'Document';
  if (mimeType.includes('presentation') || ext === 'PPT' || ext === 'PPTX') return 'Presentation';
  if (mimeType.includes('text') || ext === 'TXT' || ext === 'MD' || ext === 'JSON') return 'Text';
  return ext || 'File';
}

// ================= AUTHENTICATION ROUTES =================

// POST /api/auth/signup
router.post('/auth/signup', async (req, res): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Name must be at least 2 characters long.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const existingUser = db.findUserByEmail(email);
    if (existingUser) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = db.createUser({
      name: name.trim(),
      email: email.trim(),
      password: hashedPassword,
    });

    const token = generateToken(user);

    // Set secure HTTP-only cookie
    res.cookie('vault_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/auth/login', async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Please enter both email and password.' });
      return;
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = generateToken(user);

    res.cookie('vault_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// POST /api/auth/logout
router.post('/auth/logout', (_req, res) => {
  res.clearCookie('vault_token');
  res.status(200).json({ message: 'Logged out successfully' });
});

// GET /api/profile
router.get('/profile', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const stats = db.getStatsForUser(user.id);

  res.status(200).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    },
    stats,
  });
});

// ================= FILE MANAGEMENT ROUTES =================

// POST /api/files/upload
router.post('/files/upload', requireAuth, upload.single('file'), (req: AuthenticatedRequest, res: Response): void => {
  try {
    const user = req.user!;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No file uploaded. Please select a valid file.' });
      return;
    }

    const fileType = getSimplifiedFileType(file.mimetype, file.originalname);
    const { project_title, project_category, project_description } = req.body;

    const createdRecord = db.createFile({
      user_id: user.id,
      file_name: file.originalname,
      project_title: typeof project_title === 'string' ? project_title : undefined,
      project_category: typeof project_category === 'string' ? project_category : undefined,
      project_description: typeof project_description === 'string' ? project_description : undefined,
      file_type: fileType,
      file_size: file.size,
      upload_status: 'Uploaded',
      storage_path: file.path,
    });

    res.status(201).json({
      message: 'File successfully uploaded',
      file: createdRecord,
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload and store file.' });
  }
});

// GET /api/files
router.get('/files', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const files = db.getFilesByUserId(user.id);
  res.status(200).json({ files });
});

// GET /api/files/stats
router.get('/files/stats', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const stats = db.getStatsForUser(user.id);
  res.status(200).json(stats);
});

// GET /api/database/status
router.get('/database/status', (_req, res): void => {
  res.status(200).json({
    connected: tidb.isConnected,
    host: tidb.config.host,
    port: tidb.config.port,
    user: tidb.config.user,
    database: tidb.config.database,
    status: tidb.isConnected ? 'Connected to TiDB Cloud' : 'Configured (gateway01.ap-southeast-1.prod.aws.tidbcloud.com)',
    error: tidb.lastError,
  });
});

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.pdf': return 'application/pdf';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.webp': return 'image/webp';
    case '.svg': return 'image/svg+xml';
    case '.txt': return 'text/plain';
    case '.html': return 'text/html';
    case '.css': return 'text/css';
    case '.js': return 'application/javascript';
    case '.ts': return 'text/plain';
    case '.json': return 'application/json';
    case '.zip': return 'application/zip';
    case '.mp4': return 'video/mp4';
    default: return 'application/octet-stream';
  }
}

// GET /api/files/:id/download
router.get('/files/:id/download', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const { id } = req.params;

  const file = db.getFileById(id);
  if (!file) {
    res.status(404).json({ error: 'File not found.' });
    return;
  }

  // Security: Prevent accessing another user's files
  if (file.user_id !== user.id) {
    res.status(403).json({ error: 'Access denied: You do not have permission to download this file.' });
    return;
  }

  if (!fs.existsSync(file.storage_path)) {
    res.status(404).json({ error: 'Underlying file is missing on server storage.' });
    return;
  }

  // Set appropriate headers and send file
  res.download(file.storage_path, file.file_name, (err) => {
    if (err && !res.headersSent) {
      console.error('Error during file download stream:', err);
      res.status(500).json({ error: 'Could not stream file.' });
    }
  });
});

// GET /api/files/:id/view (Inline stream for previewing PDFs, Images, text documents)
router.get('/files/:id/view', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const { id } = req.params;

  const file = db.getFileById(id);
  if (!file) {
    res.status(404).json({ error: 'File not found.' });
    return;
  }

  if (file.user_id !== user.id) {
    res.status(403).json({ error: 'Access denied: You do not have permission to view this file.' });
    return;
  }

  const absolutePath = path.resolve(file.storage_path);
  if (!fs.existsSync(absolutePath)) {
    res.status(404).json({ error: 'Underlying file is missing on server storage.' });
    return;
  }

  const mime = getMimeType(file.file_name);
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.file_name)}"`);
  res.sendFile(absolutePath, (err) => {
    if (err && !res.headersSent) {
      console.error('Error streaming file view:', err);
      res.status(500).json({ error: 'Failed to display file.' });
    }
  });
});

// DELETE /api/files/:id
router.delete('/files/:id', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const { id } = req.params;

  const result = db.deleteFile(id, user.id);
  if (!result.success) {
    if (result.error === 'File not found') {
      res.status(404).json({ error: 'File not found.' });
      return;
    }
    if (result.error === 'Unauthorized to delete this file') {
      res.status(403).json({ error: 'Access denied: You cannot delete another user\'s file.' });
      return;
    }
    res.status(400).json({ error: result.error || 'Failed to delete file.' });
    return;
  }

  res.status(200).json({
    message: 'File deleted successfully',
    fileId: id,
  });
});

export default router;
