import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Results from './pages/Results';
import MockModeBanner from './components/MockModeBanner';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <MockModeBanner />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/results/:scanId" element={<Results />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

// Made with Bob
