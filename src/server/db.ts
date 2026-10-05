import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { tidb } from './tidb.ts';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password: string; // bcrypt hashed
  avatar_url?: string;
  created_at: string;
}

export interface FileRecord {
  id: string;
  user_id: string;
  file_name: string;
  project_title?: string;
  project_category?: string;
  project_description?: string;
  file_type: string;
  file_size: number;
  file_url: string;
  upload_status: string;
  created_at: string;
  storage_path: string;
}

interface DatabaseSchema {
  users: UserRecord[];
  files: FileRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

// Ensure data and upload directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

class Database {
  private data: DatabaseSchema = { users: [], files: [] };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        if (!Array.isArray(this.data.users)) this.data.users = [];
        if (!Array.isArray(this.data.files)) this.data.files = [];
      } else {
        this.data = { users: [], files: [] };
        this.save();
      }
    } catch (err) {
      console.error('Error loading database, initializing fresh state:', err);
      this.data = { users: [], files: [] };
      this.save();
    }
  }

  private save() {
    try {
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to save database atomically:', err);
    }
  }

  // --- Users Operations ---
  public findUserByEmail(email: string): UserRecord | undefined {
    const normalized = email.trim().toLowerCase();
    return this.data.users.find(u => u.email.toLowerCase() === normalized);
  }

  public findUserById(id: string): UserRecord | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public createUser(userData: { name: string; email: string; password: string }): UserRecord {
    const newUser: UserRecord = {
      id: crypto.randomUUID(),
      name: userData.name.trim(),
      email: userData.email.trim().toLowerCase(),
      password: userData.password,
      created_at: new Date().toISOString(),
    };
    this.data.users.push(newUser);
    this.save();

    // Sync to TiDB if connected
    if (tidb.isConnected && tidb.getPool()) {
      tidb.getPool()?.query(
        'INSERT INTO users (id, name, email, password, created_at) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)',
        [newUser.id, newUser.name, newUser.email, newUser.password, newUser.created_at]
      ).catch((err: unknown) => console.warn('[TiDB] User sync warning:', err));
    }

    return newUser;
  }

  public updateUser(id: string, updates: { name?: string; password?: string; avatar_url?: string | null }): UserRecord | null {
    const userIndex = this.data.users.findIndex(u => u.id === id);
    if (userIndex === -1) return null;

    const user = this.data.users[userIndex];
    if (updates.name && updates.name.trim().length >= 2) {
      user.name = updates.name.trim();
    }
    if (updates.password) {
      user.password = updates.password;
    }
    if (updates.avatar_url !== undefined) {
      user.avatar_url = updates.avatar_url === null ? undefined : updates.avatar_url;
    }
    this.save();

    // Sync to TiDB if connected
    if (tidb.isConnected && tidb.getPool()) {
      tidb.getPool()?.query(
        'UPDATE users SET name = ?, password = ?, avatar_url = ? WHERE id = ?',
        [user.name, user.password, user.avatar_url || null, user.id]
      ).catch((err: unknown) => console.warn('[TiDB] User update sync warning:', err));
    }

    return user;
  }

  // --- Files Operations ---
  public createFile(fileData: {
    user_id: string;
    file_name: string;
    project_title?: string;
    project_category?: string;
    project_description?: string;
    file_type: string;
    file_size: number;
    upload_status?: string;
    storage_path: string;
  }): FileRecord {
    const id = crypto.randomUUID();
    const cleanProjectTitle = fileData.project_title?.trim() || fileData.file_name.replace(/\.[^/.]+$/, "");
    const newFile: FileRecord = {
      id,
      user_id: fileData.user_id,
      file_name: fileData.file_name,
      project_title: cleanProjectTitle,
      project_category: fileData.project_category?.trim() || 'Software Project',
      project_description: fileData.project_description?.trim() || '',
      file_type: fileData.file_type,
      file_size: fileData.file_size,
      file_url: `/api/files/${id}/download`,
      upload_status: fileData.upload_status || 'Uploaded',
      created_at: new Date().toISOString(),
      storage_path: fileData.storage_path,
    };
    this.data.files.push(newFile);
    this.save();

    // Sync to TiDB if connected
    if (tidb.isConnected && tidb.getPool()) {
      tidb.getPool()?.query(
        `INSERT INTO files (id, user_id, file_name, project_title, project_category, project_description, file_type, file_size, file_url, upload_status, created_at, storage_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newFile.id,
          newFile.user_id,
          newFile.file_name,
          newFile.project_title,
          newFile.project_category,
          newFile.project_description,
          newFile.file_type,
          newFile.file_size,
          newFile.file_url,
          newFile.upload_status,
          newFile.created_at,
          newFile.storage_path,
        ]
      ).catch((err: unknown) => console.warn('[TiDB] File sync warning:', err));
    }

    return newFile;
  }

  public getFilesByUserId(userId: string): FileRecord[] {
    return this.data.files
      .filter(f => f.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getFileById(fileId: string): FileRecord | undefined {
    return this.data.files.find(f => f.id === fileId);
  }

  public deleteFile(fileId: string, userId: string): { success: boolean; file?: FileRecord; error?: string } {
    const index = this.data.files.findIndex(f => f.id === fileId);
    if (index === -1) {
      return { success: false, error: 'File not found' };
    }

    const file = this.data.files[index];
    if (file.user_id !== userId) {
      return { success: false, error: 'Unauthorized to delete this file' };
    }

    // Remove physical file
    try {
      if (fs.existsSync(file.storage_path)) {
        fs.unlinkSync(file.storage_path);
      }
    } catch (e) {
      console.warn('Physical file deletion warning:', e);
    }

    // Remove from database
    this.data.files.splice(index, 1);
    this.save();

    // Sync deletion to TiDB if connected
    if (tidb.isConnected && tidb.getPool()) {
      tidb.getPool()?.query('DELETE FROM files WHERE id = ? AND user_id = ?', [fileId, userId])
        .catch((err: unknown) => console.warn('[TiDB] Delete sync warning:', err));
    }

    return { success: true, file };
  }

  public getStatsForUser(userId: string) {
    const userFiles = this.getFilesByUserId(userId);
    const total_files = userFiles.length;
    const total_storage_bytes = userFiles.reduce((acc, f) => acc + (f.file_size || 0), 0);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const files_today = userFiles.filter(f => {
      const fileTime = new Date(f.created_at).getTime();
      return fileTime >= startOfToday;
    }).length;

    const recent_uploads = userFiles.slice(0, 5);

    return {
      total_files,
      total_storage_bytes,
      storage_formatted: formatBytes(total_storage_bytes),
      files_today,
      recent_uploads,
    };
  }
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const db = new Database();
export { UPLOADS_DIR };
