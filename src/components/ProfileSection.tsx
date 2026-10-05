import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from './Toast.tsx';
import { 
  ShieldCheck, 
  HardDrive, 
  Calendar, 
  Mail, 
  User, 
  LogOut, 
  CheckCircle2, 
  Database, 
  Pencil, 
  X, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Check, 
  Camera,
  Trash2,
  Upload,
  Sparkles
} from 'lucide-react';
import type { DashboardStats } from '../lib/api.ts';

interface ProfileSectionProps {
  stats: DashboardStats | null;
}

export function ProfileSection({ stats }: ProfileSectionProps) {
  const { user, logout, updateProfile, uploadAvatar, removeAvatar } = useAuth();
  const { success, error } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const formatDate = (isoString?: string): string => {
    if (!isoString) return 'Active';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const handleOpenEdit = () => {
    setEditName(user?.name || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordChange(false);
    setEditError(null);
    setIsEditing(true);
  };

  const handleCloseEdit = () => {
    setIsEditing(false);
    setEditError(null);
  };

  const handleAvatarFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error('Please select an image file (PNG, JPG, WEBP, or GIF).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      error('Image size must be less than 10 MB.');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const res = await uploadAvatar(file);
      success(res.message || 'Profile picture updated successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload profile picture';
      error(msg);
    } finally {
      setIsUploadingAvatar(false);
      // Reset input value
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      const res = await removeAvatar();
      success(res.message || 'Profile picture removed.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove picture';
      error(msg);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (!editName.trim() || editName.trim().length < 2) {
      setEditError('Full name must be at least 2 characters long.');
      return;
    }

    if (showPasswordChange) {
      if (!currentPassword) {
        setEditError('Please enter your current password to authorize this change.');
        return;
      }
      if (newPassword.length < 6) {
        setEditError('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setEditError('New password and confirmation do not match.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await updateProfile({
        name: editName.trim() !== user?.name ? editName.trim() : undefined,
        currentPassword: showPasswordChange ? currentPassword : undefined,
        newPassword: showPasswordChange ? newPassword : undefined,
      });
      success(res.message || 'Profile updated successfully!');
      setIsEditing(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      setEditError(msg);
      error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Hidden file input for fast avatar upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarFileSelected}
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        className="hidden"
      />

      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Account & Vault Profile</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal credentials, profile picture, storage allocation, and account security.
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            
            {/* Avatar container with direct Camera upload button */}
            <div className="relative group shrink-0">
              {user?.avatar_url ? (
                <div className="w-18 h-18 rounded-2xl overflow-hidden border-2 border-indigo-100 dark:border-indigo-900/60 shadow-md bg-slate-100 dark:bg-slate-800">
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="w-18 h-18 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white font-extrabold text-2xl flex items-center justify-center shadow-md border border-indigo-200/40 dark:border-indigo-800">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'VF'}
                </div>
              )}

              {/* Uploading Spinner or Camera Trigger Overlay */}
              {isUploadingAvatar ? (
                <div className="absolute inset-0 rounded-2xl bg-slate-900/70 flex items-center justify-center text-white">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload / Change Profile Picture"
                  className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md border-2 border-white dark:border-slate-900 transition-transform active:scale-95 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{user?.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
                  Active
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <Mail className="w-3.5 h-3.5" />
                <span>{user?.email}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                <Calendar className="w-3 h-3" />
                <span>Member since {formatDate(user?.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Edit Profile, Change Picture & Sign Out */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{user?.avatar_url ? 'Change Photo' : 'Add Photo'}</span>
            </button>

            <button
              onClick={handleOpenEdit}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>

            <button
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Account Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Identity & Security</span>
            </div>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Account ID</dt>
                <dd className="font-mono text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[180px]">{user?.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Authentication</dt>
                <dd className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Bcrypt Hashed Password
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Profile Picture</dt>
                <dd className="text-slate-700 dark:text-slate-300 font-medium">
                  {user?.avatar_url ? (
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Custom Photo Active
                    </span>
                  ) : (
                    'Default Initials Badge'
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              <HardDrive className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Storage Metrics</span>
            </div>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Total Files Stored</dt>
                <dd className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                  {stats ? stats.total_files : 0} files
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Used Storage</dt>
                <dd className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                  {stats ? stats.storage_formatted : '0 B'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Files Uploaded Today</dt>
                <dd className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                  {stats ? stats.files_today : 0}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Database Connection Card (TiDB Cloud parameters) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Database Connection</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">TiDB Cloud (AWS ap-southeast-1) configuration parameters</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Connected
          </span>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[10px] block mb-1">
              HOST
            </span>
            <span className="font-mono text-slate-800 dark:text-slate-200 break-all select-all font-medium">
              gateway01.ap-southeast-1.prod.aws.tidbcloud.com
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[10px] block mb-1">
              PORT
            </span>
            <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
              4000
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[10px] block mb-1">
              USERNAME
            </span>
            <span className="font-mono text-slate-800 dark:text-slate-200 select-all font-semibold">
              nPuPUNYSvuZ2bUe.root
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[10px] block mb-1">
              DATABASE
            </span>
            <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
              test (sys cluster)
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[10px] block mb-1">
              SSL / TLS
            </span>
            <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
              TLSv1.2 (AWS ap-southeast-1)
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider text-[10px] block mb-1">
              ENGINE
            </span>
            <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
              TiDB Serverless / MySQL
            </span>
          </div>
        </div>
      </div>

      {/* Security note card */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Protected Cloud Vault</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            All files uploaded by this account are securely stored on disk and linked specifically to your user ID in TiDB. Other registered users cannot view, download, or delete your files.
          </p>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Pencil className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Edit Profile Details</h3>
              </div>
              <button
                onClick={handleCloseEdit}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 font-medium">
                  {editError}
                </div>
              )}

              {/* Profile Picture Management within Modal */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                      {user?.name ? user.name.slice(0, 2).toUpperCase() : 'VF'}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">Profile Photo</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">PNG, JPG, or WEBP up to 10MB</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={modalFileInputRef}
                    onChange={handleAvatarFileSelected}
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => modalFileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </button>

                  {user?.avatar_url && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                      className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Remove custom picture"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  placeholder="e.g. Alex Morgan"
                />
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="flex items-center justify-between px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 dark:text-slate-400">
                  <span>{user?.email}</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Primary ID</span>
                </div>
              </div>

              {/* Toggle Change Password Section */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{showPasswordChange ? 'Cancel Password Change' : 'Change Password'}</span>
                </button>
              </div>

              {showPasswordChange && (
                <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPw ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-3 pr-9 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showCurrentPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full pl-3 pr-9 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  disabled={isSaving}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
