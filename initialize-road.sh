#!/usr/bin/env bash

set -euo pipefail

PROJECT_NAME="road"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required."
  exit 1
fi

if [ -e "$PROJECT_NAME" ]; then
  echo "Directory '$PROJECT_NAME' already exists."
  echo "Choose another name or move the existing directory."
  exit 1
fi

npx -y create-next-app@latest "$PROJECT_NAME" \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-npm \
  --yes

cd "$PROJECT_NAME"

npm install \
  @supabase/supabase-js \
  @supabase/ssr \
  @tanstack/react-query \
  maplibre-gl \
  lucide-react \
  motion \
  zod \
  react-hook-form \
  @hookform/resolvers \
  clsx \
  tailwind-merge \
  sonner \
  ai \
  @ai-sdk/openai

npm install --save-dev \
  vitest \
  @vitejs/plugin-react \
  jsdom \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  @playwright/test \
  @axe-core/playwright \
  prettier \
  prettier-plugin-tailwindcss \
  supabase \
  tsx

mkdir -p \
  docs \
  scripts \
  public/demo \
  src/components/ui \
  src/components/layout \
  src/features/dashboard/components \
  src/features/reports/components \
  src/features/reports/hooks \
  src/features/map/components \
  src/features/map/hooks \
  src/features/location \
  src/features/ai \
  src/features/auth \
  src/features/operations \
  src/lib/supabase \
  src/lib/repositories \
  src/lib/demo \
  src/lib/server \
  src/lib/validation \
  src/types \
  tests/unit \
  tests/integration \
  tests/e2e \
  supabase/migrations \
  supabase/functions/process-media \
  supabase/functions/classify-damage \
  supabase/tests

node <<'NODE'
const fs = require("node:fs");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

packageJson.name = "road";
packageJson.scripts = {
  ...packageJson.scripts,
  lint: "eslint .",
  typecheck: "tsc --noEmit",
  format: "prettier --write .",
  "format:check": "prettier --check .",
  test: "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "db:start": "supabase start",
  "db:stop": "supabase stop",
  "db:reset": "supabase db reset",
  "db:types": "supabase gen types typescript --local > src/types/database.ts",
  verify: "npm run lint && npm run typecheck && npm run test && npm run build"
};

fs.writeFileSync(
  "package.json",
  JSON.stringify(packageJson, null, 2) + "\n"
);
NODE

cat > .env.example <<'ENV'
NEXT_PUBLIC_APP_NAME=ROAD
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Explicit application mode. Never silently fall back from production to demo.
NEXT_PUBLIC_APP_MODE=demo

# Required only in production mode.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Server-only. Never expose through NEXT_PUBLIC_*.
SUPABASE_SERVICE_ROLE_KEY=

# Server/worker-only AI configuration.
OPENAI_API_KEY=
AI_MODEL=

# Public browser map configuration.
# Use a licensed provider or an approved self-hosted style.
NEXT_PUBLIC_MAP_STYLE_URL=
NEXT_PUBLIC_MAP_ATTRIBUTION=

# Private worker configuration.
WORKER_SECRET=

# Default demo view: Bangkok.
NEXT_PUBLIC_DEFAULT_MAP_LAT=13.7563
NEXT_PUBLIC_DEFAULT_MAP_LNG=100.5018
NEXT_PUBLIC_DEFAULT_MAP_ZOOM=12
ENV

cp .env.example .env.local

cat > docs/IMPLEMENTATION_STATUS.md <<'DOC'
# Implementation status

## Completed
- Next.js project scaffold
- Initial dependencies
- Base folder structure
- Environment template

## Not implemented
- Product interface
- Demo repository
- Production repository
- Supabase migrations and policies
- Upload processing
- AI classification
- Map integration
- Realtime subscriptions
- Operations console
- Automated tests

## Verification
Not run yet.
DOC

echo ""
echo "ROAD scaffold created successfully."
