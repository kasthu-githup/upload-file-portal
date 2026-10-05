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
}

export interface DashboardStats {
  total_files: number;
  total_storage_bytes: number;
  storage_formatted: string;
  files_today: number;
  recent_uploads: FileItem[];
}

const TOKEN_KEY = 'vaultflow_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
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
  }

  return response.json();
}

export const api = {
  // Authentication
  async signup(data: { name: string; email: string; password: string }): Promise<{ user: User; token: string }> {
    const res = await request<{ user: User; token: string }>('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setStoredToken(res.token);
    return res;
  },

  async login(data: { email: string; password: string }): Promise<{ user: User; token: string }> {
    const res = await request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setStoredToken(res.token);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      clearStoredToken();
    }
  },

  async getProfile(): Promise<{ user: User; stats: DashboardStats }> {
    return request<{ user: User; stats: DashboardStats }>('/api/profile');
  },

  async updateProfile(data: { name?: string; currentPassword?: string; newPassword?: string }): Promise<{ user: User; token: string; message: string }> {
    const res = await request<{ user: User; token: string; message: string }>('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.token) {
      setStoredToken(res.token);
    }
    return res;
  },

  async uploadAvatar(file: File): Promise<{ user: User; avatar_url: string; message: string }> {
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

    if (!response.ok) {
      let errorMsg = 'Failed to upload profile picture';
      try {
        const data = await response.json();
        errorMsg = data.error || data.message || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    return response.json();
  },

  async removeAvatar(): Promise<{ user: User; message: string }> {
    return request<{ user: User; message: string }>('/api/profile/avatar', {
      method: 'DELETE',
    });
  },

  // Files
  async getFiles(): Promise<{ files: FileItem[] }> {
    return request<{ files: FileItem[] }>('/api/files');
  },

  async getStats(): Promise<DashboardStats> {
    return request<DashboardStats>('/api/files/stats');
  },

  async deleteFile(id: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/api/files/${id}`, {
      method: 'DELETE',
    });
  },

  // Real upload with progress reporting via XMLHttpRequest
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

      const token = getStoredToken();

      xhr.open('POST', '/api/files/upload', true);
      xhr.withCredentials = true;

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch {
            reject(new Error('Invalid response from server'));
          }
        } else {
          let errorMessage = `Upload failed with status ${xhr.status}`;
          try {
            const errorData = JSON.parse(xhr.responseText);
            errorMessage = errorData.error || errorMessage;
          } catch {
            // Ignore parse error
          }
          reject(new Error(errorMessage));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error occurred during file upload.'));
      };

      xhr.send(formData);
    });
  },

  getDownloadUrl(id: string): string {
    const token = getStoredToken();
    return `/api/files/${id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  getViewUrl(id: string): string {
    const token = getStoredToken();
    return `/api/files/${id}/view${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
};
