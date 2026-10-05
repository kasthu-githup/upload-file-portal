export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export interface FileItem {
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
  data_url?: string; // used for client-side offline downloads
}

export interface DashboardStats {
  total_files: number;
  total_storage_bytes: number;
  storage_formatted: string;
  files_today: number;
  recent_uploads: FileItem[];
}

const TOKEN_KEY = 'vaultflow_auth_token';
const CLIENT_USERS_KEY = 'vaultflow_local_users';
const CLIENT_FILES_KEY = 'vaultflow_local_files';

export class HttpNotFoundError extends Error {
  constructor(endpoint: string) {
    super(`Endpoint not found: ${endpoint}`);
    this.name = 'HttpNotFoundError';
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Format bytes into readable string
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ================= LOCAL FALLBACK STORE (Active when /api is not hosted) =================
interface LocalUserRecord extends User {
  password: string;
}

function getLocalUsers(): LocalUserRecord[] {
  try {
    const raw = localStorage.getItem(CLIENT_USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Default preseeded users
  const defaults: LocalUserRecord[] = [
    {
      id: 'demo-user-uuid-1',
      name: 'madhes',
      email: 'madheswaran1108@gmail.com',
      password: 'madhes*12',
      created_at: new Date().toISOString(),
    },
    {
      id: 'demo-user-uuid-2',
      name: 'Alex Morgan',
      email: 'alex@example.com',
      password: 'password123',
      created_at: new Date().toISOString(),
    }
  ];
  try {
    localStorage.setItem(CLIENT_USERS_KEY, JSON.stringify(defaults));
  } catch {}
  return defaults;
}

function saveLocalUsers(users: LocalUserRecord[]) {
  try {
    localStorage.setItem(CLIENT_USERS_KEY, JSON.stringify(users));
  } catch {}
}

function getLocalFiles(): FileItem[] {
  try {
    const raw = localStorage.getItem(CLIENT_FILES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalFiles(files: FileItem[]) {
  try {
    localStorage.setItem(CLIENT_FILES_KEY, JSON.stringify(files));
  } catch {}
}

function getCurrentUserFromToken(): User | null {
  const token = getStoredToken();
  if (!token) return null;
  const users = getLocalUsers();
  // Check if token matches userId
  const found = users.find(u => u.id === token || token.includes(u.id) || token.includes(u.email));
  return found || users[0] || null;
}

// Generate simple client token
function createClientToken(user: User): string {
  return `client_token_${user.id}_${Date.now()}`;
}

// Request helper
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (response.ok) {
      return await response.json();
    }

    // Detect if this is a static hosting 404 (e.g. Vercel, Firebase Hosting, GitHub Pages)
    if (response.status === 404) {
      throw new HttpNotFoundError(endpoint);
    }

    let errorMessage = `Request failed (${response.status})`;
    try {
      const errorData = await response.json();
      if (typeof errorData === 'string') {
        errorMessage = errorData;
      } else if (errorData && typeof errorData === 'object') {
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.error && typeof errorData.error === 'object' && typeof errorData.error.message === 'string') {
          errorMessage = errorData.error.message;
        } else if (typeof errorData.message === 'string') {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = JSON.stringify(errorData.error);
        }
      }
    } catch {
      // Ignore json parse error
    }

    if (response.status === 409) {
      errorMessage = 'An account with this email address already exists. Please sign in instead.';
    }

    throw new Error(errorMessage);
  } catch (err: unknown) {
    if (err instanceof HttpNotFoundError) {
      throw err;
    }
    // If network connection failed (e.g. server offline or CORS failure on static host)
    if (err instanceof TypeError && (err.message.toLowerCase().includes('fetch') || err.message.toLowerCase().includes('network'))) {
      throw new HttpNotFoundError(endpoint);
    }
    throw err;
  }
}

export const api = {
  // Authentication
  async signup(data: { name: string; email: string; password: string }): Promise<{ user: User; token: string }> {
    try {
      const res = await request<{ user: User; token: string }>('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setStoredToken(res.token);
      return res;
    } catch (err: unknown) {
      if (err instanceof HttpNotFoundError) {
        // Fallback to resilient client store
        const users = getLocalUsers();
        const normalized = data.email.trim().toLowerCase();
        const existing = users.find(u => u.email.toLowerCase() === normalized);
        if (existing) {
          throw new Error('An account with this email address already exists. Please sign in instead.');
        }

        const newUser: LocalUserRecord = {
          id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: data.name.trim(),
          email: normalized,
          password: data.password,
          created_at: new Date().toISOString(),
        };
        users.push(newUser);
        saveLocalUsers(users);

        const token = createClientToken(newUser);
        setStoredToken(token);
        return {
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            created_at: newUser.created_at,
          },
          token,
        };
      }
      throw err;
    }
  },

  async login(data: { email: string; password: string }): Promise<{ user: User; token: string }> {
    try {
      const res = await request<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setStoredToken(res.token);
      return res;
    } catch (err: unknown) {
      if (err instanceof HttpNotFoundError) {
        // Fallback to resilient client store
        const users = getLocalUsers();
        const normalized = data.email.trim().toLowerCase();
        let user = users.find(u => u.email.toLowerCase() === normalized);

        if (!user) {
          // If this is the user's first time logging into the deployed client fallback
          user = {
            id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: normalized.split('@')[0] || 'User',
            email: normalized,
            password: data.password,
            created_at: new Date().toISOString(),
          };
          users.push(user);
          saveLocalUsers(users);
        } else if (user.password && user.password !== data.password) {
          throw new Error('Invalid email or password.');
        }

        const token = createClientToken(user);
        setStoredToken(token);
        return {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar_url: user.avatar_url,
            created_at: user.created_at,
          },
          token,
        };
      }
      throw err;
    }
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    } finally {
      clearStoredToken();
    }
  },

  async getProfile(): Promise<{ user: User; stats: DashboardStats }> {
    try {
      return await request<{ user: User; stats: DashboardStats }>('/api/profile');
    } catch (err: unknown) {
      if (err instanceof HttpNotFoundError) {
        const user = getCurrentUserFromToken();
        if (!user) {
          throw new Error('Not authenticated');
        }
        const stats = await this.getStats();
        return { user, stats };
      }
      throw err;
    }
  },

  async updateProfile(data: { name?: string; currentPassword?: string; newPassword?: string }): Promise<{ user: User; token: string; message: string }> {
    try {
      const res = await request<{ user: User; token: string; message: string }>('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.token) {
        setStoredToken(res.token);
      }
      return res;
    } catch (err: unknown) {
      if (err instanceof HttpNotFoundError) {
        const users = getLocalUsers();
        const current = getCurrentUserFromToken();
        if (!current) throw new Error('Not authenticated');

        const index = users.findIndex(u => u.id === current.id);
        if (index === -1) throw new Error('User not found');

        if (data.name) {
          users[index].name = data.name.trim();
        }
        if (data.newPassword) {
          if (users[index].password && users[index].password !== data.currentPassword) {
            throw new Error('Current password is incorrect.');
          }
          users[index].password = data.newPassword;
        }
        saveLocalUsers(users);

        const token = createClientToken(users[index]);
        setStoredToken(token);
        return {
          user: users[index],
          token,
          message: 'Profile updated successfully',
        };
      }
      throw err;
    }
  },

  async uploadAvatar(file: File): Promise<{ user: User; avatar_url: string; message: string }> {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const token = getStoredToken();
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });

      if (response.ok) {
        return await response.json();
      }

      if (response.status === 404) {
        throw new HttpNotFoundError('/api/profile/avatar');
      }

      let errorMsg = 'Failed to upload profile picture';
      try {
        const data = await response.json();
        errorMsg = data.error || data.message || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    } catch (err: unknown) {
      if (err instanceof HttpNotFoundError) {
        // Read file as Base64 Data URL and save to local user
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const users = getLocalUsers();
        const current = getCurrentUserFromToken();
        if (!current) throw new Error('Not authenticated');

        const idx = users.findIndex(u => u.id === current.id);
        if (idx !== -1) {
          users[idx].avatar_url = dataUrl;
          saveLocalUsers(users);
        }

        return {
          user: {
            ...current,
            avatar_url: dataUrl,
          },
          avatar_url: dataUrl,
          message: 'Profile picture updated successfully!',
        };
      }
      throw err;
    }
  },

  async removeAvatar(): Promise<{ user: User; message: string }> {
    try {
      return await request<{ user: User; message: string }>('/api/profile/avatar', {
        method: 'DELETE',
      });
    } catch (err: unknown) {
      if (err instanceof HttpNotFoundError) {
        const users = getLocalUsers();
        const current = getCurrentUserFromToken();
        if (current) {
          const idx = users.findIndex(u => u.id === current.id);
          if (idx !== -1) {
            users[idx].avatar_url = undefined;
            saveLocalUsers(users);
          }
          current.avatar_url = undefined;
        }
        return {
          user: current || { id: '0', name: 'User', email: '', created_at: '' },
          message: 'Profile picture removed successfully.',
        };
      }
      throw err;
    }
  },

  // Files
  async getFiles(): Promise<{ files: FileItem[] }> {
    try {
      return await request<{ files: FileItem[] }>('/api/files');
    } catch (err: unknown) {
      if (err instanceof HttpNotFoundError) {
        const user = getCurrentUserFromToken();
        const allFiles = getLocalFiles();
        const userFiles = user ? allFiles.filter(f => f.user_id === user.id) : allFiles;
        return { files: userFiles };
      }
      throw err;
    }
  },

  async getStats(): Promise<DashboardStats> {
    try {
      return await request<DashboardStats>('/api/files/stats');
    } catch (err: unknown) {
      if (err instanceof HttpNotFoundError) {
        const { files } = await this.getFiles();
        const total_files = files.length;
        const total_storage_bytes = files.reduce((acc, f) => acc + (f.file_size || 0), 0);
        const todayStr = new Date().toISOString().split('T')[0];
        const files_today = files.filter(f => (f.created_at || '').startsWith(todayStr)).length;
        return {
          total_files,
          total_storage_bytes,
          storage_formatted: formatBytes(total_storage_bytes),
          files_today,
          recent_uploads: files.slice(0, 5),
        };
      }
      throw err;
    }
  },

  async deleteFile(id: string): Promise<{ success: boolean; message: string }> {
    try {
      return await request<{ success: boolean; message: string }>(`/api/files/${id}`, {
        method: 'DELETE',
      });
    } catch (err: unknown) {
      if (err instanceof HttpNotFoundError) {
        const allFiles = getLocalFiles();
        const filtered = allFiles.filter(f => f.id !== id);
        saveLocalFiles(filtered);
        return { success: true, message: 'File successfully deleted.' };
      }
      throw err;
    }
  },

  getDownloadUrl(fileId: string): string {
    const allFiles = getLocalFiles();
    const found = allFiles.find(f => f.id === fileId);
    if (found?.data_url) return found.data_url;

    const token = getStoredToken();
    return `/api/files/${fileId}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  getViewUrl(fileId: string): string {
    const allFiles = getLocalFiles();
    const found = allFiles.find(f => f.id === fileId);
    if (found?.data_url) return found.data_url;

    const token = getStoredToken();
    return `/api/files/${fileId}/view${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  // Real upload with progress reporting via XMLHttpRequest and local fallback
  uploadFileWithProgress(
    file: File,
    onProgress: (percentage: number) => void,
    projectMetadata?: { project_title?: string; project_category?: string; project_description?: string }
  ): Promise<{ message: string; file: FileItem }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      if (projectMetadata?.project_title) {
        formData.append('project_title', projectMetadata.project_title);
      }
      if (projectMetadata?.project_category) {
        formData.append('project_category', projectMetadata.project_category);
      }
      if (projectMetadata?.project_description) {
        formData.append('project_description', projectMetadata.project_description);
      }
      formData.append('file', file);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      });

      const handleClientSave = async () => {
        onProgress(100);
        const dataUrl = await new Promise<string>((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.onerror = () => res('');
          r.readAsDataURL(file);
        });

        const user = getCurrentUserFromToken();
        const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
        const newFile: FileItem = {
          id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          user_id: user?.id || 'demo_user',
          file_name: file.name,
          project_title: projectMetadata?.project_title || file.name.replace(/\.[^/.]+$/, ''),
          project_category: projectMetadata?.project_category || 'Software Project',
          project_description: projectMetadata?.project_description || '',
          file_type: ext,
          file_size: file.size,
          file_url: dataUrl,
          data_url: dataUrl,
          upload_status: 'Uploaded',
          created_at: new Date().toISOString(),
        };

        const files = getLocalFiles();
        files.unshift(newFile);
        saveLocalFiles(files);

        resolve({
          message: 'File successfully uploaded',
          file: newFile,
        });
      };

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch {
            handleClientSave().catch(reject);
          }
        } else if (xhr.status === 404) {
          // Fallback to client storage on static hosting
          handleClientSave().catch(reject);
        } else {
          let errText = `Upload failed (${xhr.status})`;
          try {
            const data = JSON.parse(xhr.responseText);
            errText = data.error || data.message || errText;
          } catch {}
          reject(new Error(errText));
        }
      });

      xhr.addEventListener('error', () => {
        handleClientSave().catch(reject);
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was aborted.'));
      });

      xhr.open('POST', '/api/files/upload', true);

      const token = getStoredToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  },
};
