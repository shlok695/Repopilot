import React from 'react';
import { Link } from 'react-router-dom';
import DarkModeToggle from './DarkModeToggle';

const Navbar: React.FC = () => {
  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700 no-print">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link
            to="/"
            className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded-md"
            aria-label="RepoPilot Home"
          >
            <span className="text-2xl" aria-hidden="true">🚀</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">RepoPilot</span>
          </Link>
          
          <div className="flex items-center space-x-3">
            <DarkModeToggle />
            <Link
              to="/"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              aria-label="Start a new scan"
            >
              New Scan
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

// Made with Bob
