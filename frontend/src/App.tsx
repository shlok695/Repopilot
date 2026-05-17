import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Home from './pages/Home';
import Results from './pages/Results';
import MockModeBanner from './components/MockModeBanner';
import ErrorBanner from './components/ErrorBanner';
import Footer from './components/Footer';

const basename = '/repopilot';

function App() {
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      setGlobalError('Unexpected error occurred. Please try again.');
      event.preventDefault();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape key dismisses global error
      if (event.key === 'Escape' && globalError) {
        setGlobalError(null);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [globalError]);

  return (
    <Router basename={basename}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <MockModeBanner />
        {globalError && (
          <div className="container mx-auto px-4 pt-4">
            <ErrorBanner message={globalError} onDismiss={() => setGlobalError(null)} />
          </div>
        )}
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/results/:scanId" element={<Results />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;

// Made with Bob
