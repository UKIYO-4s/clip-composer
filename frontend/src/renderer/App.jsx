import React from 'react';
import Timeline from './components/Timeline/Timeline';

function App() {
  return (
    <div className="h-full w-full bg-bg-primary text-text-primary flex flex-col">
      {/* Header */}
      <header className="h-12 bg-bg-secondary border-b border-border-color flex items-center px-4">
        <h1 className="text-lg font-semibold">Clip Composer</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-400 mb-2">Preview Area</h2>
          <p className="text-gray-500 text-sm">
            動画プレビューエリア（後で実装）
          </p>
        </div>
      </main>

      {/* Timeline */}
      <Timeline />

      {/* Footer */}
      <footer className="h-6 bg-bg-secondary border-t border-border-color flex items-center justify-center">
        <span className="text-xs text-text-secondary">Clip Composer v1.0.0</span>
      </footer>
    </div>
  );
}

export default App;
