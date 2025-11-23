import React, { Suspense } from 'react';
import { HashRouter, MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import CV from './pages/CV';
import Research from './pages/Research';
import ResearchDetail from './pages/ResearchDetail';

// Utility to detect if we are running in a restricted environment (like a Blob URL)
// where modifying window.location (which HashRouter does) throws a SecurityError.
const isRestrictedEnvironment = () => {
  try {
    return window.location.protocol === 'blob:';
  } catch (e) {
    return true;
  }
};

const App: React.FC = () => {
  // Use MemoryRouter for preview environments to prevent crashes.
  // Use HashRouter for production (GitHub Pages) as requested.
  const Router = isRestrictedEnvironment() ? MemoryRouter : HashRouter;

  return (
    <Router>
      <Layout>
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-neutral-500">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cv" element={<CV />} />
            <Route path="/research" element={<Research />} />
            <Route path="/research/:id" element={<ResearchDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
};

export default App;