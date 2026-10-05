import React, { useState, useMemo } from 'react';
import type { FileItem, DashboardStats } from '../lib/api.ts';
import { 
  BarChart3, 
  Download, 
  Printer, 
  FileText, 
  Image as ImageIcon, 
  FileArchive, 
  Code2, 
  HardDrive, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { formatBytes } from '../lib/format.ts';

interface ReportsSectionProps {
  files: FileItem[];
  stats: DashboardStats | null;
}

export function ReportsSection({ files, stats }: ReportsSectionProps) {
  const [timeRange, setTimeRange] = useState<'all' | '30d' | '7d' | 'today'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter files based on time range and category
  const filteredFiles = useMemo(() => {
    const now = Date.now();
    return files.filter((f) => {
      // Category filter
      if (selectedCategory !== 'all' && (f.project_category || 'Software Project') !== selectedCategory) {
        return false;
      }

      // Time filter
      const fileDate = new Date(f.created_at).getTime();
      if (timeRange === 'today') {
        const startOfToday = new Date().setHours(0, 0, 0, 0);
        return fileDate >= startOfToday;
      }
      if (timeRange === '7d') {
        return now - fileDate <= 7 * 24 * 60 * 60 * 1000;
      }
      if (timeRange === '30d') {
        return now - fileDate <= 30 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }, [files, timeRange, selectedCategory]);

  // Aggregate file types
  const typeMetrics = useMemo(() => {
    let pdfCount = 0;
    let pdfSize = 0;
    let imageCount = 0;
    let imageSize = 0;
    let archiveCount = 0;
    let archiveSize = 0;
    let codeCount = 0;
    let codeSize = 0;
    let otherCount = 0;
    let otherSize = 0;

    for (const file of filteredFiles) {
      const ext = (file.file_name.split('.').pop() || '').toLowerCase();
      const mime = (file.file_type || '').toLowerCase();

      if (ext === 'pdf' || mime.includes('pdf')) {
        pdfCount++;
        pdfSize += file.file_size;
      } else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext) || mime.includes('image')) {
        imageCount++;
        imageSize += file.file_size;
      } else if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext) || mime.includes('zip') || mime.includes('compressed')) {
        archiveCount++;
        archiveSize += file.file_size;
      } else if (['ts', 'tsx', 'js', 'jsx', 'json', 'py', 'java', 'cpp', 'c', 'html', 'css'].includes(ext)) {
        codeCount++;
        codeSize += file.file_size;
      } else {
        otherCount++;
        otherSize += file.file_size;
      }
    }

    const totalSize = filteredFiles.reduce((acc, f) => acc + f.file_size, 0);

    return {
      pdf: { count: pdfCount, size: pdfSize, pct: totalSize > 0 ? (pdfSize / totalSize) * 100 : 0 },
      image: { count: imageCount, size: imageSize, pct: totalSize > 0 ? (imageSize / totalSize) * 100 : 0 },
      archive: { count: archiveCount, size: archiveSize, pct: totalSize > 0 ? (archiveSize / totalSize) * 100 : 0 },
      code: { count: codeCount, size: codeSize, pct: totalSize > 0 ? (codeSize / totalSize) * 100 : 0 },
      other: { count: otherCount, size: otherSize, pct: totalSize > 0 ? (otherSize / totalSize) * 100 : 0 },
      totalSize,
      totalCount: filteredFiles.length,
    };
  }, [filteredFiles]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    files.forEach((f) => {
      if (f.project_category) set.add(f.project_category);
    });
    return Array.from(set);
  }, [files]);

  // Export CSV Report
  const handleExportCSV = () => {
    if (filteredFiles.length === 0) return;

    const headers = ['ID', 'Project Title', 'File Name', 'Category', 'Size (Bytes)', 'Size Formatted', 'Type', 'Upload Status', 'Uploaded Date'];
    const rows = filteredFiles.map((f) => [
      `"${f.id}"`,
      `"${(f.project_title || '').replace(/"/g, '""')}"`,
      `"${f.file_name.replace(/"/g, '""')}"`,
      `"${(f.project_category || 'Software Project').replace(/"/g, '""')}"`,
      f.file_size,
      `"${formatBytes(f.file_size)}"`,
      `"${f.file_type || ''}"`,
      `"${f.upload_status || 'Uploaded'}"`,
      `"${new Date(f.created_at).toLocaleString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vaultflow_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Storage & Project Reports
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time analytics, format breakdown, and audit logs of your cloud vault.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={filteredFiles.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/70 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Period:</span>
          <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-xs font-medium">
            <button
              onClick={() => setTimeRange('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                timeRange === 'all'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                timeRange === '30d'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                timeRange === '7d'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setTimeRange('today')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                timeRange === 'today'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Today
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Filtered Files
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            {typeMetrics.totalCount}
          </p>
          <p className="text-xs text-slate-400 mt-1">Out of {files.length} vault entries</p>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Selected Storage
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            {formatBytes(typeMetrics.totalSize)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Aggregated physical size</p>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Database Sync
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            TiDB Cloud
          </p>
          <p className="text-xs text-slate-400 mt-1">gateway01.ap-southeast-1</p>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Avg Project Size
            </span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/60">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            {typeMetrics.totalCount > 0
              ? formatBytes(Math.round(typeMetrics.totalSize / typeMetrics.totalCount))
              : '0 B'}
          </p>
          <p className="text-xs text-slate-400 mt-1">Per uploaded archive / document</p>
        </div>
      </div>

      {/* Storage Distribution by Format */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Format & Type Distribution</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Detailed breakdown of stored assets</p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">
            {formatBytes(typeMetrics.totalSize)} total
          </span>
        </div>

        {/* Visual Multi-Segment Bar */}
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex mb-6">
          <div
            style={{ width: `${typeMetrics.pdf.pct}%` }}
            className="bg-rose-500 transition-all duration-300"
            title={`PDF: ${typeMetrics.pdf.pct.toFixed(1)}%`}
          />
          <div
            style={{ width: `${typeMetrics.image.pct}%` }}
            className="bg-emerald-500 transition-all duration-300"
            title={`Images: ${typeMetrics.image.pct.toFixed(1)}%`}
          />
          <div
            style={{ width: `${typeMetrics.archive.pct}%` }}
            className="bg-amber-500 transition-all duration-300"
            title={`Archives: ${typeMetrics.archive.pct.toFixed(1)}%`}
          />
          <div
            style={{ width: `${typeMetrics.code.pct}%` }}
            className="bg-blue-500 transition-all duration-300"
            title={`Code: ${typeMetrics.code.pct.toFixed(1)}%`}
          />
          <div
            style={{ width: `${typeMetrics.other.pct}%` }}
            className="bg-purple-500 transition-all duration-300"
            title={`Other: ${typeMetrics.other.pct.toFixed(1)}%`}
          />
        </div>

        {/* Cards Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* PDF */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-xs font-semibold mb-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>PDF Documents</span>
            </div>
            <p className="text-base font-bold font-mono text-slate-900 dark:text-white">
              {typeMetrics.pdf.count} <span className="text-xs text-slate-400 font-sans font-normal">files</span>
            </p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              {formatBytes(typeMetrics.pdf.size)} ({typeMetrics.pdf.pct.toFixed(1)}%)
            </p>
          </div>

          {/* Images */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Images & Media</span>
            </div>
            <p className="text-base font-bold font-mono text-slate-900 dark:text-white">
              {typeMetrics.image.count} <span className="text-xs text-slate-400 font-sans font-normal">files</span>
            </p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              {formatBytes(typeMetrics.image.size)} ({typeMetrics.image.pct.toFixed(1)}%)
            </p>
          </div>

          {/* Archives */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Zip / Archives</span>
            </div>
            <p className="text-base font-bold font-mono text-slate-900 dark:text-white">
              {typeMetrics.archive.count} <span className="text-xs text-slate-400 font-sans font-normal">files</span>
            </p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              {formatBytes(typeMetrics.archive.size)} ({typeMetrics.archive.pct.toFixed(1)}%)
            </p>
          </div>

          {/* Code */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Source Code</span>
            </div>
            <p className="text-base font-bold font-mono text-slate-900 dark:text-white">
              {typeMetrics.code.count} <span className="text-xs text-slate-400 font-sans font-normal">files</span>
            </p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              {formatBytes(typeMetrics.code.size)} ({typeMetrics.code.pct.toFixed(1)}%)
            </p>
          </div>

          {/* Other */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 text-xs font-semibold mb-1">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span>Other Formats</span>
            </div>
            <p className="text-base font-bold font-mono text-slate-900 dark:text-white">
              {typeMetrics.other.count} <span className="text-xs text-slate-400 font-sans font-normal">files</span>
            </p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              {formatBytes(typeMetrics.other.size)} ({typeMetrics.other.pct.toFixed(1)}%)
            </p>
          </div>
        </div>
      </div>

      {/* Audit Log / Detail Report Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Project Vault Audit Log
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {filteredFiles.length} recorded items
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-lg">
            Live Records
          </span>
        </div>

        {filteredFiles.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No files match the selected period and category filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-5">Project Name</th>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Uploaded At</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-5 font-semibold text-slate-900 dark:text-white">
                      {file.project_title || file.file_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {file.file_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {file.project_category || 'Software Project'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {formatBytes(file.file_size)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(file.created_at).toLocaleDateString()} {new Date(file.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{file.upload_status || 'Uploaded'}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
