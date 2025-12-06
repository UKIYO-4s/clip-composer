import React from 'react';

function App() {
  return (
    <div className="h-full w-full bg-bg-primary text-text-primary flex flex-col">
      {/* Header */}
      <header className="h-12 bg-bg-secondary border-b border-border-color flex items-center px-4">
        <h1 className="text-lg font-semibold">Clip Composer</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-accent-blue mb-4">Hello World</h2>
          <p className="text-text-secondary">
            ShortVideo Generator - Development Environment Ready
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-8 bg-bg-secondary border-t border-border-color flex items-center justify-center">
        <span className="text-xs text-text-secondary">v1.0.0</span>
      </footer>
    </div>
  );
}

export default App;
