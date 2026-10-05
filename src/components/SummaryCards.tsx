import React from 'react';
import { FolderGit2, HardDrive, Clock, ArrowUpRight } from 'lucide-react';
import type { DashboardStats } from '../lib/api.ts';

interface SummaryCardsProps {
  stats: DashboardStats | null;
  isLoading: boolean;
}

export function SummaryCards({ stats, isLoading }: SummaryCardsProps) {
  const cards = [
    {
      title: 'Total Project Files',
      value: stats ? stats.total_files.toString() : '0',
      subtitle: 'Currently stored in your vault',
      icon: FolderGit2,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-100 dark:border-indigo-900/60',
    },
    {
      title: 'Total Uploaded Projects',
      value: stats ? stats.total_files.toString() : '0',
      subtitle: 'Persisted in TiDB database',
      icon: ArrowUpRight,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-100 dark:border-emerald-900/60',
    },
    {
      title: 'Storage Used',
      value: stats ? stats.storage_formatted : '0 B',
      subtitle: 'Calculated from disk storage',
      icon: HardDrive,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-100 dark:border-blue-900/60',
    },
    {
      title: 'Recent Projects',
      value: stats ? `${stats.files_today} today` : '0 today',
      subtitle: stats?.recent_uploads?.length 
        ? `Last: ${stats.recent_uploads[0].project_title || stats.recent_uploads[0].file_name}` 
        : 'No uploads today',
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-100 dark:border-amber-900/60',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-2 rounded-lg border ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div>
              {isLoading ? (
                <div className="h-8 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mb-1" />
              ) : (
                <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
                  {card.value}
                </div>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                {card.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
