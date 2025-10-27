#!/bin/bash
# ==============================
# 🚀 EduPulse Easy Start Script
# ==============================

cd "$(dirname "$0")"

echo "🔁 Pulling latest from GitHub..."
git fetch origin feature/instructor-upload
git reset --hard origin/feature/instructor-upload

echo "🐳 Rebuilding and starting Docker containers..."
docker compose down
docker compose up --build -d

echo ""
echo "✅ EduPulse is running!"
echo "Frontend → http://localhost:3000"
echo "Backend  → http://localhost:8000/docs"
echo ""
echo "🧠 To view logs, run: docker compose logs -f"
