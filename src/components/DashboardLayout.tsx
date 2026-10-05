import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { Sidebar, type ActiveTab } from './Sidebar.tsx';
import { SummaryCards } from './SummaryCards.tsx';
import { FileUploadSection } from './FileUploadSection.tsx';
import { UploadedFilesList } from './UploadedFilesList.tsx';
import { ReportsSection } from './ReportsSection.tsx';
import { ProfileSection } from './ProfileSection.tsx';
import { api, type FileItem, type DashboardStats } from '../lib/api.ts';
import { useToast } from './Toast.tsx';
import { Menu, RefreshCw, UploadCloud, FolderGit2, ArrowRight, BarChart3, Sun, Moon } from 'lucide-react';

export function DashboardLayout() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { error } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load files and stats from database
  const loadDashboardData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      const [filesRes, statsRes] = await Promise.all([
        api.getFiles(),
        api.getStats(),
      ]);
      setFiles(filesRes.files);
      setStats(statsRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not fetch data';
      error(msg);
    } finally {
      setIsLoadingData(false);
      setIsRefreshing(false);
    }
  }, [error]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Callback when a project file is uploaded
  const handleUploadSuccess = (newFile: FileItem) => {
    setFiles((prev) => [newFile, ...prev.filter((f) => f.id !== newFile.id)]);
    loadDashboardData();
  };

  // Callback when a project file is deleted
  const handleFileDeleted = (deletedId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== deletedId));
    loadDashboardData();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header Bar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 rounded-lg"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Contextual Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="text-slate-400 dark:text-slate-500">VaultFlow</span>
              <span>/</span>
              <span className="text-slate-900 dark:text-white font-semibold">
                {activeTab === 'dashboard'
                  ? 'Dashboard'
                  : activeTab === 'upload'
                  ? 'Upload Files'
                  : activeTab === 'projects'
                  ? 'Project Files'
                  : activeTab === 'reports'
                  ? 'Reports'
                  : 'Profile'}
              </span>
            </div>
          </div>

          {/* Right Header Zone */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dark / Light Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label="Toggle dark/light theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Refresh Data Button */}
            <button
              onClick={() => loadDashboardData(true)}
              disabled={isRefreshing}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh Data from Database"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
            </button>

            {/* Logged in user info indicator */}
            <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-800 text-xs">
              <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-semibold text-slate-800 dark:text-white leading-tight truncate max-w-[130px]">
                  {user?.name}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight truncate max-w-[130px]">
                  {user?.email}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* TAB 1: DASHBOARD (ONLY COUNT / SUMMARY CARDS) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Dashboard Overview
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Live dynamic counts, storage usage, and metrics loaded from your TiDB database vault.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload New Files</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('reports')}
                    className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>View Reports</span>
                  </button>
                </div>
              </div>

              {/* ONLY SUMMARY CARDS */}
              <SummaryCards stats={stats} isLoading={isLoadingData} />

              {/* Quick Jump Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div
                  onClick={() => setActiveTab('upload')}
                  className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Upload Files</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Add project archives, source packages, or documents.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                </div>

                <div
                  onClick={() => setActiveTab('projects')}
                  className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:scale-105 transition-transform">
                      <FolderGit2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Project Files</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Browse, view, download, or delete your {files.length} files.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                </div>

                <div
                  onClick={() => setActiveTab('reports')}
                  className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Reports & Audit</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Export CSV, view format charts, and print summaries.
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD FILES */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Upload Files
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Select or drag project archives, deliverables, and assets into your vault.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('projects')}
                  className="self-start sm:self-auto text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Go to Project Files</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* ONLY FILE UPLOAD SECTION */}
              <FileUploadSection
                title="Upload Project Files"
                onUploadSuccess={(newFile) => {
                  handleUploadSuccess(newFile);
                }}
                onNavigateToProjects={() => setActiveTab('projects')}
              />
            </div>
          )}

          {/* TAB 3: PROJECT FILES */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Project Files
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Search, filter, view, download, or delete project files stored in your user vault.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="self-start sm:self-auto px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload More Files</span>
                </button>
              </div>

              {/* ONLY UPLOADED FILES LIST */}
              <UploadedFilesList
                files={files}
                isLoading={isLoadingData}
                onFileDeleted={handleFileDeleted}
                onTriggerUpload={() => setActiveTab('upload')}
              />
            </div>
          )}

          {/* TAB 4: REPORTS */}
          {activeTab === 'reports' && (
            <ReportsSection files={files} stats={stats} />
          )}

          {/* TAB 5: PROFILE */}
          {activeTab === 'profile' && (
            <ProfileSection stats={stats} />
          )}
        </main>
      </div>
    </div>
  );
}
