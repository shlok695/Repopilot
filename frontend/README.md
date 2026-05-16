# RepoPilot Frontend

Modern, responsive React frontend for RepoPilot - an AI-powered GitHub repository analyzer.

## 🚀 Features

- **Dual Input Modes**: Analyze repositories via GitHub URL or ZIP file upload
- **Real-time Scanning**: Live progress updates during repository analysis
- **Comprehensive Dashboard**: View vulnerabilities, bugs, README feedback, and suggested fixes
- **Mock API Support**: Develop independently from backend with realistic mock data
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Type-Safe**: Built with TypeScript for enhanced developer experience
- **Tested**: Comprehensive test coverage with Vitest and React Testing Library

## 📋 Tech Stack

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Axios** - HTTP client for API calls
- **Vitest** - Unit testing framework
- **React Testing Library** - Component testing

## 🛠️ Installation

### Prerequisites

- Node.js 18+ and npm

### Setup Steps

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd RepoPilot/frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   ```env
   # API Configuration
   VITE_API_BASE_URL=http://localhost:8000
   
   # Mock API for development/testing
   VITE_MOCK_API=false
   
   # Application Configuration
   VITE_APP_TITLE=RepoPilot
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:3000`

## 📦 Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload

# Building
npm run build        # Build for production
npm run preview      # Preview production build locally

# Testing
npm test            # Run tests in watch mode
npm run test:ui     # Run tests with UI

# Linting
npm run lint        # Run ESLint
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8000` |
| `VITE_MOCK_API` | Enable mock API mode | `false` |
| `VITE_APP_TITLE` | Application title | `RepoPilot` |

### Mock API Mode

For frontend development without a running backend:

1. Set `VITE_MOCK_API=true` in `.env`
2. Start the dev server: `npm run dev`
3. All API calls will return mock data from `src/api/mockData.ts`

This allows you to:
- Develop UI independently
- Test different scenarios
- Demo the application without backend setup

## 📁 Project Structure

```
frontend/
├── src/
│   ├── api/                 # API client and mock data
│   │   ├── scanApi.ts      # API functions
│   │   └── mockData.ts     # Mock scan results
│   ├── components/          # Reusable React components
│   │   ├── Navbar.tsx
│   │   ├── ScanForm.tsx
│   │   ├── LoadingProgress.tsx
│   │   ├── ErrorBanner.tsx
│   │   ├── ResultsDashboard.tsx
│   │   ├── VulnTable.tsx
│   │   ├── BugTable.tsx
│   │   └── DownloadButton.tsx
│   ├── pages/               # Page components
│   │   ├── Home.tsx
│   │   └── Results.tsx
│   ├── types/               # TypeScript type definitions
│   │   └── scan.ts
│   ├── utils/               # Utility functions
│   │   └── severity.ts
│   ├── __tests__/           # Test files
│   ├── App.tsx              # Root component
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── .env.example             # Environment variables template
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── vitest.setup.ts          # Test setup
└── package.json             # Dependencies and scripts
```

## 🎨 Key Components

### ScanForm
Handles repository input (GitHub URL or ZIP upload) with validation.

### ResultsDashboard
Main results view with 6 tabs:
1. **Overview** - Repository metadata and summary
2. **README** - Quality feedback with score and suggestions
3. **Vulnerabilities** - Security issues sorted by severity
4. **Bugs** - Code quality issues
5. **Suggested Fixes** - Actionable recommendations
6. **Full Report** - Complete analysis report

### Severity Normalization
Supports both severity formats:
- Uppercase: `HIGH`, `MEDIUM`, `LOW`, `INFO`
- Capitalized: `Critical`, `High`, `Medium`, `Low`

Color coding:
- 🔴 Critical/High - Red
- 🟠 Medium - Orange/Yellow
- 🟢 Low - Green
- 🔵 Info - Blue

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests with UI
npm run test:ui
```

Test files are located in `src/__tests__/` and cover:
- Component rendering
- User interactions
- Form validation
- API integration
- Error handling

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

### Docker Deployment

A `Dockerfile` is included for containerized deployment:

```bash
# Build image
docker build -t repopilot-frontend .

# Run container
docker run -p 3000:3000 repopilot-frontend
```

## 🔗 API Integration

The frontend expects the following API endpoints:

### POST /api/scan
Start a new scan.

**Request (GitHub)**:
```json
{
  "type": "github",
  "repoUrl": "https://github.com/user/repo"
}
```

**Request (ZIP)**:
```
FormData with:
- type: "zip"
- file: <zip file>
```

**Response**:
```json
{
  "scanId": "scan_123_abc",
  "status": "completed",
  "repoMetadata": { ... },
  "readmeFeedback": { ... },
  "vulnerabilities": [ ... ],
  "bugs": [ ... ],
  "suggestedFixes": [ ... ],
  "warnings": [ ... ],
  "fullReport": "...",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### GET /api/scan/:scanId
Get scan results by ID.

### GET /api/scan/:scanId/report
Download full report as markdown file.

## 🐛 Troubleshooting

### Port Already in Use
If port 3000 is occupied, modify `vite.config.ts`:
```typescript
server: {
  port: 3001, // Change to available port
}
```

### API Connection Issues
1. Verify backend is running on correct port
2. Check `VITE_API_BASE_URL` in `.env`
3. Enable mock mode for testing: `VITE_MOCK_API=true`

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📝 License

This project is part of RepoPilot and follows the same license.

## 🤝 Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting

## 📧 Support

For issues or questions, please open an issue in the repository.

---

**Made with ❤️ for the RepoPilot Hackathon Project**