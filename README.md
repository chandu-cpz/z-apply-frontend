# Z-Apply Command Deck

Desktop-first React cockpit for starting, observing, and approving local
Z-Apply runs. It uses Tailwind, shadcn-style local primitives, Cult/AI-inspired
operational components, TanStack Query/SSE, noVNC, motion, and virtualized
timelines.

## Run locally

Start the backend first, then:

```bash
pnpm install --store-dir=/tmp/pnpm-store
pnpm dev
```

Open `http://127.0.0.1:5173`. Vite forwards `/api` to the local FastAPI server.
