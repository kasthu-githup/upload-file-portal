import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  FolderGit2, 
  X, 
  Sparkles,
  Layers,
  FileCode2
} from 'lucide-react';
import { api, type FileItem } from '../lib/api.ts';
import { useToast } from './Toast.tsx';

interface FileUploadSectionProps {
  onUploadSuccess: (newFile: FileItem) => void;
  title?: string;
  onNavigateToProjects?: () => void;
}

const PROJECT_CATEGORIES = [
  'Web Application',
  'Mobile App',
  'Full Repository (.zip)',
  'Backend & API',
  'AI / Machine Learning',
  'UI/UX Design Package',
  'Project Documentation',
  'Software Deliverable',
];

export function FileUploadSection({ 
  onUploadSuccess, 
  title = 'Upload Project Files',
  onNavigateToProjects 
}: FileUploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectCategory, setProjectCategory] = useState(PROJECT_CATEGORIES[0]);
  const [projectDescription, setProjectDescription] = useState('');

  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'configuring' | 'uploading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [uploadedRecord, setUploadedRecord] = useState<FileItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error } = useToast();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileSelected = (file: File) => {
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadStatus('error');
      setStatusMessage('File size exceeds the 100 MB limit.');
      error('File is too large (max 100 MB).');
      return;
    }

    setSelectedFile(file);
    // Auto-generate clean project title from filename
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const formattedTitle = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    setProjectTitle(formattedTitle);

    // Auto-suggest category if archive or code
    if (file.name.endsWith('.zip') || file.name.endsWith('.tar') || file.name.endsWith('.gz')) {
      setProjectCategory('Full Repository (.zip)');
    } else if (file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.name.endsWith('.md')) {
      setProjectCategory('Project Documentation');
    }

    setUploadStatus('configuring');
    setStatusMessage('Review project details and confirm upload');
  };

  const triggerUpload = async () => {
    if (!selectedFile) return;

    setUploadStatus('uploading');
    setUploadProgress(0);
    setStatusMessage('Uploading project files...');

    try {
      const response = await api.uploadFileWithProgress(
        selectedFile,
        (percentage) => {
          setUploadProgress(percentage);
        },
        {
          project_title: projectTitle || selectedFile.name,
          project_category: projectCategory,
          project_description: projectDescription,
        }
      );

      setUploadProgress(100);
      setUploadStatus('success');
      setStatusMessage('Upload Complete ✓');
      setUploadedRecord(response.file);
      success(`Project "${projectTitle || selectedFile.name}" uploaded successfully!`);
      onUploadSuccess(response.file);
    } catch (err: unknown) {
      setUploadStatus('error');
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setStatusMessage(msg);
      error(`Upload failed: ${msg}`);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setProjectTitle('');
    setProjectDescription('');
    setUploadProgress(0);
    setUploadStatus('idle');
    setStatusMessage('');
    setUploadedRecord(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h2>
            <span className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              Project Vault
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload source code archives, deliverables, documentation, and project assets.
          </p>
        </div>
        {selectedFile && uploadStatus === 'success' && (
          <button
            onClick={resetUpload}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
          >
            Upload Another Project
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* State 1: Drop Zone */}
      {(!selectedFile || uploadStatus === 'idle') && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
              : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/60'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-xs">
            <FolderGit2 className="w-6 h-6" />
          </div>

          <h3 className="text-sm font-semibold text-slate-800 mb-1">
            Drag & Drop Your Project File
          </h3>
          <p className="text-xs text-slate-500 max-w-md mb-5 leading-relaxed">
            Drop project archives (.zip, .tar), source packages, design assets, or documentation here, or click to choose from your computer.
          </p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Choose Project File
          </button>

          <div className="mt-4 text-[11px] text-slate-400 flex items-center gap-2">
            <span>Supports .zip, .tar, .pdf, .docx, images & all source formats</span>
            <span>·</span>
            <span>Max 100 MB</span>
          </div>
        </div>
      )}

      {/* State 2: Configuration & Details before upload */}
      {selectedFile && uploadStatus === 'configuring' && (
        <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/50 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-xs">
                <FileCode2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 truncate">
                  {selectedFile.name}
                </h4>
                <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                  {formatFileSize(selectedFile.size)} · Ready to configure
                </p>
              </div>
            </div>
            <button
              onClick={resetUpload}
              className="text-slate-400 hover:text-slate-600 p-1 rounded"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Project Title
              </label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="e.g. Next.js SaaS Storefront"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Project Category
              </label>
              <select
                value={projectCategory}
                onChange={(e) => setProjectCategory(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer"
              >
                {PROJECT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Project Description / Release Notes (Optional)
            </label>
            <input
              type="text"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="e.g. Production build v1.0 with full documentation"
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetUpload}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={triggerUpload}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Start Project Upload</span>
            </button>
          </div>
        </div>
      )}

      {/* State 3: Active Uploading / Completed Progress Display */}
      {selectedFile && (uploadStatus === 'uploading' || uploadStatus === 'success' || uploadStatus === 'error') && (
        <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/50">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-slate-900 truncate">
                  {projectTitle || selectedFile.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="font-mono tabular-nums">{formatFileSize(selectedFile.size)}</span>
                  <span>·</span>
                  <span className="truncate">{selectedFile.name}</span>
                  <span>·</span>
                  <span>{projectCategory}</span>
                </div>
              </div>
            </div>

            {uploadStatus !== 'uploading' && (
              <button
                onClick={resetUpload}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                title="Clear"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium flex items-center gap-1.5 ${
                uploadStatus === 'success' ? 'text-emerald-700 font-semibold' :
                uploadStatus === 'error' ? 'text-rose-600 font-semibold' :
                'text-slate-600'
              }`}>
                {uploadStatus === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                {uploadStatus === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                {statusMessage}
              </span>
              <span className="font-mono text-slate-600 font-semibold tabular-nums">
                {uploadProgress}%
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ease-out rounded-full ${
                  uploadStatus === 'success'
                    ? 'bg-emerald-600'
                    : uploadStatus === 'error'
                    ? 'bg-rose-500'
                    : 'bg-indigo-600'
                }`}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>

          {/* Outcome Actions */}
          {uploadStatus === 'success' && (
            <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-600">
                Project securely saved to your database and ready in Project Files.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetUpload}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Upload Another File
                </button>
                {onNavigateToProjects && (
                  <button
                    type="button"
                    onClick={() => {
                      resetUpload();
                      onNavigateToProjects();
                    }}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>View in Project Files</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between gap-2 text-xs">
              <span className="text-rose-600">
                {statusMessage || 'An error occurred during upload. Please try again.'}
              </span>
              <button
                type="button"
                onClick={triggerUpload}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors cursor-pointer"
              >
                Retry Upload
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
