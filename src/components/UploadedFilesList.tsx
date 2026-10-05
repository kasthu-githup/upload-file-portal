import React, { useState, useMemo } from 'react';
import { 
  Eye,
  Download, 
  Trash2, 
  Search, 
  FileText, 
  FileArchive, 
  FileImage, 
  Film, 
  FileSpreadsheet, 
  FileCode,
  FolderGit2,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  X,
  ExternalLink,
  Layers
} from 'lucide-react';
import { api, type FileItem } from '../lib/api.ts';
import { useToast } from './Toast.tsx';

interface UploadedFilesListProps {
  files: FileItem[];
  isLoading: boolean;
  onFileDeleted: (deletedId: string) => void;
  onTriggerUpload?: () => void;
}

export function UploadedFilesList({
  files,
  isLoading,
  onFileDeleted,
  onTriggerUpload,
}: UploadedFilesListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'repositories' | 'pdf' | 'document' | 'image'>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'size-desc' | 'size-asc' | 'name-asc'>('date-desc');
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [fileToPreview, setFileToPreview] = useState<FileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { success, error } = useToast();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const getFileIcon = (file: FileItem) => {
    const t = (file.file_type || '').toLowerCase();
    const cat = (file.project_category || '').toLowerCase();
    const name = file.file_name.toLowerCase();

    if (t.includes('archive') || t.includes('zip') || t.includes('rar') || name.endsWith('.zip') || name.endsWith('.tar')) {
      return <FileArchive className="w-4 h-4 text-indigo-600" />;
    }
    if (t.includes('pdf') || name.endsWith('.pdf')) return <FileText className="w-4 h-4 text-rose-600" />;
    if (t.includes('image') || t.includes('jpeg') || t.includes('png') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg')) {
      return <FileImage className="w-4 h-4 text-blue-600" />;
    }
    if (t.includes('video')) return <Film className="w-4 h-4 text-purple-600" />;
    if (t.includes('sheet') || t.includes('csv') || t.includes('excel')) return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
    if (t.includes('code') || cat.includes('web') || cat.includes('app') || name.endsWith('.ts') || name.endsWith('.js')) {
      return <FileCode className="w-4 h-4 text-cyan-600" />;
    }
    return <FolderGit2 className="w-4 h-4 text-slate-500" />;
  };

  const isImageFile = (file: FileItem): boolean => {
    const name = file.file_name.toLowerCase();
    const type = (file.file_type || '').toLowerCase();
    return (
      name.endsWith('.png') ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.webp') ||
      name.endsWith('.gif') ||
      name.endsWith('.svg') ||
      type.includes('image') ||
      type.includes('jpeg') ||
      type.includes('png')
    );
  };

  const isPdfFile = (file: FileItem): boolean => {
    const name = file.file_name.toLowerCase();
    const type = (file.file_type || '').toLowerCase();
    return name.endsWith('.pdf') || type.includes('pdf');
  };

  const isTextOrCodeFile = (file: FileItem): boolean => {
    const name = file.file_name.toLowerCase();
    return (
      name.endsWith('.txt') ||
      name.endsWith('.md') ||
      name.endsWith('.json') ||
      name.endsWith('.js') ||
      name.endsWith('.ts') ||
      name.endsWith('.html') ||
      name.endsWith('.css')
    );
  };

  const filteredAndSortedFiles = useMemo(() => {
    let result = [...files];

    // Search query filter (matches project title, file name, or category)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.file_name.toLowerCase().includes(query) ||
          (f.project_title && f.project_title.toLowerCase().includes(query)) ||
          (f.project_category && f.project_category.toLowerCase().includes(query)) ||
          (f.project_description && f.project_description.toLowerCase().includes(query))
      );
    }

    // Category filter: All Projects, Repositories (.zip), PDF, Document, Image
    if (selectedFilter !== 'all') {
      result = result.filter((f) => {
        const ft = (f.file_type || '').toLowerCase();
        const cat = (f.project_category || '').toLowerCase();
        const fn = f.file_name.toLowerCase();

        if (selectedFilter === 'repositories') {
          return (
            ft.includes('archive') ||
            fn.endsWith('.zip') ||
            fn.endsWith('.tar') ||
            fn.endsWith('.gz') ||
            fn.endsWith('.rar') ||
            fn.endsWith('.7z') ||
            cat.includes('repository') ||
            cat.includes('archive')
          );
        }

        if (selectedFilter === 'pdf') {
          return ft.includes('pdf') || fn.endsWith('.pdf') || cat.includes('pdf');
        }

        if (selectedFilter === 'document') {
          return (
            ft.includes('doc') ||
            ft.includes('text') ||
            ft.includes('sheet') ||
            ft.includes('presentation') ||
            fn.endsWith('.doc') ||
            fn.endsWith('.docx') ||
            fn.endsWith('.txt') ||
            fn.endsWith('.md') ||
            fn.endsWith('.csv') ||
            fn.endsWith('.xlsx') ||
            fn.endsWith('.xls') ||
            fn.endsWith('.ppt') ||
            fn.endsWith('.pptx') ||
            cat.includes('document') ||
            cat.includes('doc')
          );
        }

        if (selectedFilter === 'image') {
          return (
            ft.includes('image') ||
            ft.includes('jpeg') ||
            ft.includes('png') ||
            ft.includes('gif') ||
            ft.includes('webp') ||
            ft.includes('svg') ||
            fn.endsWith('.png') ||
            fn.endsWith('.jpg') ||
            fn.endsWith('.jpeg') ||
            fn.endsWith('.svg') ||
            fn.endsWith('.webp') ||
            fn.endsWith('.gif') ||
            cat.includes('image') ||
            cat.includes('design')
          );
        }

        return true;
      });
    }

    // Sort order
    result.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'date-asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'size-desc') {
        return b.file_size - a.file_size;
      }
      if (sortBy === 'size-asc') {
        return a.file_size - b.file_size;
      }
      if (sortBy === 'name-asc') {
        const nameA = a.project_title || a.file_name;
        const nameB = b.project_title || b.file_name;
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

    return result;
  }, [files, searchQuery, selectedFilter, sortBy]);

  const handleDownload = (file: FileItem) => {
    const downloadUrl = api.getDownloadUrl(file.id);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = file.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success(`Downloading "${file.file_name}"`);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;

    setIsDeleting(true);
    try {
      await api.deleteFile(fileToDelete.id);
      success(`Project file "${fileToDelete.project_title || fileToDelete.file_name}" deleted.`);
      onFileDeleted(fileToDelete.id);
      setFileToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete file';
      error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
      {/* Header & Controls */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">Project Files</h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                ({files.length} {files.length === 1 ? 'project file' : 'project files'})
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Source code archives, deliverables, and project assets stored in your database.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects or files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              />
            </div>

            {/* Sort Selector */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="size-desc">Largest Size</option>
                <option value="size-asc">Smallest Size</option>
                <option value="name-asc">Name (A-Z)</option>
              </select>
              <ArrowUpDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Category Tabs: All Projects, Repositories (.zip), PDF, Document, Image */}
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
          {[
            { id: 'all', label: 'All Projects' },
            { id: 'repositories', label: 'Repositories (.zip)' },
            { id: 'pdf', label: 'PDF' },
            { id: 'document', label: 'Document' },
            { id: 'image', label: 'Image' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id as any)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                selectedFilter === tab.id
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="p-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : files.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">No project files uploaded yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
            Upload your project repositories, documents, PDFs, or images to start managing your project vault.
          </p>
          {onTriggerUpload && (
            <button
              onClick={onTriggerUpload}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Upload Project Now
            </button>
          )}
        </div>
      ) : filteredAndSortedFiles.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs">
          No files found matching the "{selectedFilter}" category filter.
        </div>
      ) : (
        /* Responsive Table */
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-5">Project & File Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Uploaded Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredAndSortedFiles.map((file) => (
                <tr
                  key={file.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                >
                  {/* Project & File Name */}
                  <td className="py-3 px-5">
                    <div className="flex items-start gap-3 max-w-xs md:max-w-md">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md shrink-0 mt-0.5">
                        {getFileIcon(file)}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 dark:text-white block truncate" title={file.project_title || file.file_name}>
                          {file.project_title || file.file_name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 truncate">
                          <span className="font-mono text-slate-500 dark:text-slate-400 truncate" title={file.file_name}>{file.file_name}</span>
                          {file.project_description && (
                            <>
                              <span>·</span>
                              <span className="truncate max-w-[200px]" title={file.project_description}>
                                {file.project_description}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                    {file.project_category || file.file_type}
                  </td>

                  {/* Size */}
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono tabular-nums whitespace-nowrap">
                    {formatFileSize(file.file_size)}
                  </td>

                  {/* Date */}
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono tabular-nums whitespace-nowrap">
                    {formatDate(file.created_at)}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{file.upload_status || 'Uploaded'}</span>
                    </div>
                  </td>

                  {/* Action Buttons: View, Download, Delete */}
                  <td className="py-3 px-5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* VIEW ACTION BUTTON - Opens full browser reader directly (like Image 2) */}
                      <a
                        href={api.getViewUrl(file.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md font-medium transition-colors cursor-pointer"
                        title="View file in browser reader"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">View</span>
                      </a>

                      {/* DOWNLOAD ACTION BUTTON */}
                      <button
                        onClick={() => handleDownload(file)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-md font-medium transition-colors cursor-pointer"
                        title="Download project package"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Download</span>
                      </button>

                      {/* DELETE ACTION BUTTON */}
                      <button
                        onClick={() => setFileToDelete(file)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md font-medium transition-colors cursor-pointer"
                        title="Delete project file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW / PREVIEW MODAL */}
      {fileToPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-left">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-xs shrink-0">
                  {getFileIcon(fileToPreview)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {fileToPreview.project_title || fileToPreview.file_name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                    <span className="truncate">{fileToPreview.file_name}</span>
                    <span>·</span>
                    <span>{formatFileSize(fileToPreview.file_size)}</span>
                    <span>·</span>
                    <span className="text-indigo-600 font-semibold">{fileToPreview.project_category || fileToPreview.file_type}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={api.getViewUrl(fileToPreview.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Open in new window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full</span>
                </a>

                <button
                  onClick={() => handleDownload(fileToPreview)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                <button
                  onClick={() => setFileToPreview(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Dynamic Viewer */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-100/50 flex flex-col items-center justify-center">
              {/* IMAGE PREVIEW */}
              {isImageFile(fileToPreview) && (
                <div className="max-w-full flex flex-col items-center justify-center">
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-white p-2 shadow-sm">
                    <img
                      src={api.getViewUrl(fileToPreview.id)}
                      alt={fileToPreview.file_name}
                      className="max-h-[65vh] max-w-full object-contain rounded-lg"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 text-center">
                    {fileToPreview.file_name} ({formatFileSize(fileToPreview.file_size)})
                  </p>
                </div>
              )}

              {/* PDF PREVIEW */}
              {isPdfFile(fileToPreview) && (
                <div className="w-full h-[68vh] flex flex-col rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                  <div className="p-3 bg-slate-800 text-white flex items-center justify-between text-xs">
                    <span className="font-semibold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-rose-400" />
                      <span>{fileToPreview.file_name}</span>
                    </span>
                    <a
                      href={api.getViewUrl(fileToPreview.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded transition-colors flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open Full Browser Viewer</span>
                    </a>
                  </div>
                  <object
                    data={api.getViewUrl(fileToPreview.id)}
                    type="application/pdf"
                    className="w-full flex-1"
                  >
                    <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                      <FileText className="w-12 h-12 text-rose-500 mb-3" />
                      <p className="text-sm font-semibold text-slate-800 mb-2">View PDF Document</p>
                      <a
                        href={api.getViewUrl(fileToPreview.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                      >
                        Open in Full Browser PDF Viewer
                      </a>
                    </div>
                  </object>
                </div>
              )}

              {/* ARCHIVE / ZIP / OTHER PROJECTS */}
              {!isImageFile(fileToPreview) && !isPdfFile(fileToPreview) && (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full shadow-sm text-center">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-4 shadow-xs">
                    <FileArchive className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-1">
                    {fileToPreview.project_title || fileToPreview.file_name}
                  </h4>
                  <p className="text-xs text-slate-500 mb-4 font-mono">
                    {fileToPreview.file_name} · {formatFileSize(fileToPreview.file_size)}
                  </p>

                  {fileToPreview.project_description && (
                    <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 text-left mb-6 border border-slate-100">
                      <strong className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Release Notes / Description
                      </strong>
                      {fileToPreview.project_description}
                    </div>
                  )}

                  <div className="space-y-2">
                    <button
                      onClick={() => handleDownload(fileToPreview)}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download File ({formatFileSize(fileToPreview.file_size)})</span>
                    </button>
                    <a
                      href={api.getViewUrl(fileToPreview.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Direct Stream</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
              <span>Uploaded on {formatDate(fileToPreview.created_at)}</span>
              <button
                onClick={() => setFileToPreview(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Project File?</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to permanently delete <strong className="text-slate-900 font-semibold">{fileToDelete.project_title || fileToDelete.file_name}</strong>? It will be removed from your database and physical storage vault.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setFileToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
