# ScholarSwarm frontend

React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui + React Flow.

```bash
npm install
npm run dev        # http://localhost:5173 (proxies /api to :8000)
npm run build      # writes dist/ for FastAPI to serve
npm test           # Vitest
npx playwright test
npm run gen:api    # regenerate src/api/schema.d.ts from a running backend
```

The backend README at the repository root covers the full setup and architecture.
