import { useState } from 'react';
import { BookOpen, Radio, Sparkles, Sun, Moon, Settings, Server, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getApiBaseUrl, getWsViewerUrl, setStudentConnectionUrls } from '../services/api';

type Tab = 'stream' | 'summary';

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
}

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [apiUrl] = useState(() => getApiBaseUrl());
  const [wsUrl, setWsUrl] = useState(() => getWsViewerUrl());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setStudentConnectionUrls(apiUrl, wsUrl);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      window.location.reload();
    }, 1000);
  };

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--header-bg)] border-b border-[var(--border)] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Brand / Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
              <BookOpen className="w-5 h-5 text-white" strokeWidth={2.2} aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--text)] font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  SARTHI
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  <Sparkles className="w-3 h-3" />
                  Student
                </span>
              </div>
              <p className="text-[var(--text-muted)] text-xs font-medium tracking-tight">
                Your Classroom Learning Companion
              </p>
            </div>
          </div>

          {/* Middle Navigation Tabs */}
          <nav aria-label="Main navigation" className="flex items-center p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
            <button
              onClick={() => onTabChange('stream')}
              aria-current={activeTab === 'stream' ? 'page' : undefined}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                ${activeTab === 'stream'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
                }`}
            >
              <Radio className={`w-3.5 h-3.5 ${activeTab === 'stream' ? 'animate-pulse' : ''}`} />
              <span>Stream</span>
            </button>

            <button
              onClick={() => onTabChange('summary')}
              aria-current={activeTab === 'summary' ? 'page' : undefined}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                ${activeTab === 'summary'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
                }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Summary</span>
            </button>
          </nav>

          {/* Right Action: Theme Switcher & Settings */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettings(s => !s)}
              title="Configure Backend & WebSocket URL"
              className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-indigo-500 hover:border-indigo-500/50 hover:bg-[var(--surface-2)] shadow-sm transition-all duration-200"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-indigo-500/50 hover:bg-[var(--surface-2)] shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline text-xs font-medium">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span className="hidden sm:inline text-xs font-medium">Dark</span>
                </>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* Backend Settings Drawer */}
      {showSettings && (
        <div className="bg-[var(--surface-2)] border-b border-[var(--border)] px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
                <Server className="w-4 h-4 text-indigo-500" />
                <span>Backend Settings:</span>
              </div>
              <div className="flex-1 min-w-[220px]">
                <input
                  type="text"
                  value={wsUrl}
                  onChange={(e) => setWsUrl(e.target.value)}
                  placeholder="wss://.../ws/viewer"
                  className="w-full px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors text-xs shadow-sm"
            >
              {saved ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{saved ? 'Saved & Reloading...' : 'Save & Reconnect'}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
