# RepoPilot 🚀

**AI-Powered Repository Analysis & Security Scanner**

RepoPilot is a comprehensive web application that analyzes GitHub repositories or uploaded ZIP files to provide:
- 📝 Auto-generated README documentation
- 🔒 Vulnerability scanning (npm audit, semgrep, gitleaks)
- 🐛 Bug and code quality analysis (eslint, ruff, pattern scanning)
- 💡 Suggested fixes and recommendations
- 📊 Downloadable Markdown reports

## Features

- **Multi-Language Support**: Analyzes Node.js, Python, and mixed-language repositories
- **Comprehensive Security Scanning**: Detects vulnerabilities, secrets, and security issues
- **Code Quality Analysis**: Identifies bugs, code smells, and complexity issues
- **Dependency Inventory**: Lists all dependencies with version information
- **License Compliance**: Scans and flags problematic licenses
- **Test Coverage Analysis**: Evaluates test infrastructure
- **Public Access**: Exposed via Tailscale Funnel for hackathon demos

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast builds
- React Router for navigation
- Tailwind CSS for styling
- Axios for API calls

### Backend
- Node.js with Express and TypeScript
- Multer for file uploads
- Simple-git for repository cloning
- Rate limiting and security middleware

### Middleware & Agents
- JavaScript-based orchestration layer
- Modular agent architecture
- Timeout management and retry logic
- Comprehensive error handling

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git
- Security tools: semgrep, gitleaks, bandit (optional, will fallback)

### Local Development (Without Docker)

1. **Clone and Install**
```bash
git clone <your-repo-url>
cd repopilot
```

2. **Setup Backend**
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

3. **Setup Frontend** (in new terminal)
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

4. **Access the app**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

### Docker Deployment

1. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your settings
```

2. **Start Services**
```bash
docker compose up -d
```

3. **Check Status**
```bash
docker compose ps
docker compose logs -f
```

4. **Access the app**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api/health

### Public Access with Tailscale Funnel

See [tailscale-setup.md](./tailscale-setup.md) for detailed instructions on exposing RepoPilot publicly for hackathon demos.

## Project Structure

```
repopilot/
├── frontend/          # React + TypeScript UI
├── backend/           # Express + TypeScript API
├── middleware/        # JavaScript orchestration layer
├── agents/            # JavaScript analysis agents
├── docker-compose.yml # Container orchestration
└── tailscale-setup.md # Public access guide
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Start Scan
```
POST /api/scan
Body: { type: "github", repoUrl: "..." } or { type: "zip", file: <binary> }
```

### Get Scan Result
```
GET /api/scan/:scanId
```

### Download Report
```
GET /api/scan/:scanId/report
```

### List Recent Scans
```
GET /api/scans
```

## Security Tools Used

- **npm audit**: Node.js dependency vulnerabilities
- **pip-audit**: Python dependency vulnerabilities
- **semgrep**: Static analysis for multiple languages
- **gitleaks**: Secret detection
- **bandit**: Python security linting
- **eslint**: JavaScript/TypeScript linting
- **ruff**: Python linting

## Architecture

RepoPilot uses a modular agent-based architecture:

1. **Scan Orchestrator**: Coordinates all analysis agents
2. **Repo Analyzer**: Detects languages and frameworks
3. **README Generator**: Creates comprehensive documentation
4. **Vulnerability Scanner**: Runs security tools
5. **Bug Scanner**: Detects code quality issues
6. **Report Generator**: Formats final Markdown report
7. **Additional Agents**: Dependencies, secrets, licenses, complexity, test coverage

## Storage

- No database required
- Results stored in `/tmp/repopilot/` as JSON and Markdown
- Automatic cleanup of old scans
- Scan results persist for the session

## Configuration

All configuration via environment variables. See `.env.example` for available options.

Key settings:
- `MAX_ZIP_SIZE_MB`: Maximum upload size (default: 25MB)
- `SCAN_TIMEOUT_MS`: Overall scan timeout (default: 90s)
- `AGENT_TIMEOUT_MS`: Per-agent timeout (default: 30s)
- `ALLOWED_ORIGIN`: CORS origin (set to Tailscale URL in production)

## Development

### Running Tests
```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
npm test
```

### Building for Production
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm run build
```

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000 or 5000
lsof -ti:3000 | xargs kill -9
lsof -ti:5000 | xargs kill -9
```

### Docker Issues
```bash
# Clean restart
docker compose down -v
docker compose up -d --build
```

### Missing Security Tools
RepoPilot will fallback to pattern-based scanning if tools are unavailable. Install tools for best results:
```bash
# Semgrep
pip install semgrep

# Gitleaks
brew install gitleaks  # macOS
# or download from https://github.com/gitleaks/gitleaks/releases

# Bandit
pip install bandit
```

## Contributing

This is a hackathon project. Contributions welcome!

## License

MIT License - see LICENSE file for details

## Hackathon Demo

For judges and evaluators:
1. Access the public URL provided (via Tailscale Funnel)
2. Paste a GitHub repository URL or upload a ZIP file
3. Click "Scan Repository"
4. View comprehensive analysis results
5. Download the full Markdown report

## Support

For issues or questions during the hackathon, contact the team.

---

Built with ❤️ for [Hackathon Name]