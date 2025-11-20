#!/bin/bash

# Railway / Production environment
if [ ! -z "$PORT" ]; then
    echo "Running on Railway (production mode)"
    exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
fi

# Inside Docker (dev)
if [ -f /.dockerenv ]; then
    echo "Running in Docker (dev mode)"
    fastapi dev app/main.py --host 0.0.0.0 --port 8000 --reload &
    python watcher.py
else
    # Local dev
    echo "Running locally with uv (dev mode)"
    uv run fastapi dev app/main.py --host 0.0.0.0 --port 8000 --reload &
    uv run python watcher.py
fi

wait