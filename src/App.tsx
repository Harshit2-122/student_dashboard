import { useState } from 'react';
import Header from './components/Header';
import StreamView from './views/StreamView';
import SummaryView from './views/SummaryView';
import { ThemeProvider } from './context/ThemeContext';

type Tab = 'stream' | 'summary';

function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>('stream');

  return (
    <div className="flex flex-col min-h-svh bg-[var(--bg)] text-[var(--text)] transition-colors duration-200">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 flex flex-col">
        {/* Stream tab */}
        <div role="tabpanel" aria-label="Stream" hidden={activeTab !== 'stream'} className="flex-1 flex flex-col">
          {activeTab === 'stream' && <StreamView />}
        </div>

        {/* Summary tab */}
        <div role="tabpanel" aria-label="Summary" hidden={activeTab !== 'summary'}>
          <SummaryView active={activeTab === 'summary'} />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
