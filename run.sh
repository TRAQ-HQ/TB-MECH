#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

# Start the TB-MECH full-stack application (Vite + Express backend)
export PORT="${PORT:-3000}"
exec npm run dev
