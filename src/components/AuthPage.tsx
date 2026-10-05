import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { useToast } from './Toast.tsx';
import { ShieldCheck, Eye, EyeOff, ArrowRight, HardDrive, Lock, Mail, User as UserIcon, Sun, Moon } from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
}

export function AuthPage({ initialMode = 'login' }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login, signup } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { success, error } = useToast();

  const validate = (): boolean => {
    setErrorMessage(null);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }

    if (mode === 'signup') {
      if (!name.trim() || name.trim().length < 2) {
        setErrorMessage('Full name must be at least 2 characters long.');
        return false;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return false;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please verify.');
        return false;
      }
    } else {
      if (!password) {
        setErrorMessage('Please enter your password.');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (mode === 'signup') {
        await signup(name, email, password);
        success('Account created! Welcome to VaultFlow.');
      } else {
        await login(email, password);
        success('Logged in successfully!');
      }
    } catch (err: unknown) {
      let msg = 'Authentication failed. Please check your credentials and try again.';
      if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === 'string') {
        msg = err;
      } else if (err && typeof err === 'object') {
        const obj = err as Record<string, any>;
        if (typeof obj.message === 'string' && obj.message && obj.message !== '[object Object]') {
          msg = obj.message;
        } else if (typeof obj.error === 'string' && obj.error && obj.error !== '[object Object]') {
          msg = obj.error;
        }
      }
      if (!msg || msg === '[object Object]' || msg.toLowerCase().includes('could not be found') || msg.toLowerCase().includes('page not found')) {
        msg = mode === 'signup' 
          ? 'An account with this email address already exists or server connection failed. Please sign in.' 
          : 'Invalid email or password. Please verify and try again.';
      }
      setErrorMessage(msg);
      error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200 relative">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-2 text-xs font-medium"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>
      </div>

      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        
        {/* Left branding & showcase banner (desktop) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between bg-slate-900 p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                <HardDrive className="w-5 h-5" />
              </div>
              <span className="font-semibold text-lg tracking-tight text-white">VaultFlow</span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-white mb-3">
              Secure Cloud File Storage & Management
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Store, organize, and access your critical documents with instant TiDB Cloud database persistence and real-time reports.
            </p>
          </div>

          <div className="relative z-10 my-6 rounded-xl overflow-hidden border border-slate-800 bg-slate-950/40">
            <img
              src="/src/assets/images/auth_workspace_showcase_1791175869000.jpg"
              alt="VaultFlow Workspace"
              referrerPolicy="no-referrer"
              className="w-full h-44 object-cover object-center"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <div className="relative z-10 pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              TiDB Cloud Connected
            </span>
            <span className="font-mono text-slate-500 tabular-nums">v2.6</span>
          </div>
        </div>

        {/* Right authentication form */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 lg:hidden mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <HardDrive className="w-4 h-4" />
                </div>
                <span className="font-semibold text-base text-slate-900 dark:text-white">VaultFlow</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {mode === 'login'
                ? 'Enter your credentials to access your protected file vault.'
                : 'Get started with your personal secure file management portal.'}
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/80 text-xs text-rose-700 dark:text-rose-300 font-medium flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              {errorMessage.toLowerCase().includes('already exists') && mode === 'signup' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                  }}
                  className="self-start text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
                >
                  <span>Click here to sign in with your password →</span>
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="block w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-10 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60 cursor-pointer mt-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to Dashboard' : 'Create Free Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Mode Switcher */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div>
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setErrorMessage(null);
                }}
                className="ml-1.5 text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 hover:underline cursor-pointer"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
