import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { ShieldCheck, HardDrive, Calendar, Mail, User, LogOut, CheckCircle2, Database, Server } from 'lucide-react';
import type { DashboardStats } from '../lib/api.ts';

interface ProfileSectionProps {
  stats: DashboardStats | null;
}

export function ProfileSection({ stats }: ProfileSectionProps) {
  const { user, logout } = useAuth();

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

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Account & Vault Profile</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal credentials, storage allocation, and account security.
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900/60 shrink-0">
              <img
                src="/src/assets/images/avatar_default_user_1791175879569.jpg"
                alt="User Avatar"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{user?.name}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <Mail className="w-3.5 h-3.5" />
                <span>{user?.email}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                <Calendar className="w-3 h-3" />
                <span>Member since {formatDate(user?.created_at)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="self-start sm:self-center flex items-center gap-2 px-4 py-2 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
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
                <dt className="text-slate-500 dark:text-slate-400">Storage Tenant</dt>
                <dd className="text-slate-700 dark:text-slate-300 font-medium">Isolated User Storage</dd>
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
    </div>
  );
}
