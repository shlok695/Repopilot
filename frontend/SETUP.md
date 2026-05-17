# RepoPilot Frontend - Quick Setup Guide

## 🚀 Quick Start (5 minutes)

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` if needed (defaults work for local development):
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_MOCK_API=false
```

### 3. Start Development Server
```bash
npm run dev
```

Visit: **http://localhost:3000/repopilot**

---

## 🎭 Development Modes

### Mode 1: With Backend (Full Integration)
```bash
# Terminal 1: Start backend (from backend directory)
cd ../backend
npm run dev

# Terminal 2: Start frontend
cd ../frontend
npm run dev
```

**Environment:**
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_MOCK_API=false
```

### Mode 2: Without Backend (Mock Mode)
```bash
# Only need frontend
npm run dev
```

**Environment:**
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_MOCK_API=true
```

Mock mode returns realistic data from `src/api/mockData.ts` - perfect for:
- UI development
- Frontend testing
- Demo presentations
- Working offline

---

## 📦 Installation Commands

### Fresh Install
```bash
npm install
```

### Add Missing Dependencies
```bash
npm install @testing-library/user-event jsdom --save-dev
```

### Clean Install (if issues)
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 🧪 Testing

### Run Tests
```bash
npm test                 # Watch mode
npm test -- --run        # Single run
npm test -- --coverage   # With coverage
npm run test:ui          # Visual UI
```

### Test Files Location
```
src/__tests__/
├── ScanForm.test.tsx
├── ErrorBanner.test.tsx
├── VulnTable.test.tsx
└── DownloadButton.test.tsx
```

---

## 🏗️ Building

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
```
Output: `dist/` directory

### Preview Production Build
```bash
npm run preview
```

---

## 🐛 Common Issues & Solutions

### Issue: Port 3000 already in use
**Solution:** Change port in `vite.config.ts`:
```typescript
server: {
  port: 3001,
}
```

### Issue: Cannot connect to backend
**Solutions:**
1. Verify backend is running: `curl http://localhost:8000/api/health`
2. Check `.env` has correct `VITE_API_BASE_URL`
3. Enable mock mode: `VITE_MOCK_API=true`

### Issue: TypeScript errors
**Solution:**
```bash
npm run build  # Check for real errors
# Dev server shows some expected type warnings
```

### Issue: Tests failing
**Solution:**
```bash
npm install @testing-library/user-event jsdom --save-dev
npm test
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root component with routing |
| `src/pages/Home.tsx` | Landing page with scan form |
| `src/pages/Results.tsx` | Results page with dashboard |
| `src/api/scanApi.ts` | API client functions |
| `src/api/mockData.ts` | Mock data for development |
| `src/types/scan.ts` | TypeScript type definitions |
| `vite.config.ts` | Vite & Vitest configuration |
| `.env` | Environment variables |

---

## 🎨 Customization

### Change API Port
Edit `.env`:
```env
VITE_API_BASE_URL=http://localhost:9000
```

### Modify Mock Data
Edit `src/api/mockData.ts` to change:
- Vulnerability examples
- Bug examples
- README feedback
- Suggested fixes

### Update Styling
- Global styles: `src/index.css`
- Tailwind config: `tailwind.config.js`
- Component styles: Inline Tailwind classes

---

## 🚢 Deployment

### Docker
```bash
docker build -t repopilot-frontend .
docker run -p 3000:3000 repopilot-frontend
```

### Static Hosting (Vercel, Netlify, etc.)
```bash
npm run build
# Upload dist/ directory
```

### Environment Variables for Production
Set in your hosting platform:
```
VITE_API_BASE_URL=https://your-backend-api.com
VITE_MOCK_API=false
```

---

## 📚 Additional Resources

- **Full Documentation:** See `README.md`
- **API Contract:** See `src/types/scan.ts`
- **Component Examples:** See `src/components/`
- **Test Examples:** See `src/__tests__/`

---

## ✅ Verification Checklist

After setup, verify:

- [ ] `npm install` completed without errors
- [ ] `.env` file exists with correct values
- [ ] `npm run dev` starts server on port 3000
- [ ] Can access http://localhost:3000/repopilot
- [ ] Can toggle between GitHub URL and ZIP upload
- [ ] Form validation works (try invalid URL)
- [ ] Mock mode works (set `VITE_MOCK_API=true`)
- [ ] Tests run successfully (`npm test -- --run`)

---

**Need Help?** Check the main README.md or open an issue!
