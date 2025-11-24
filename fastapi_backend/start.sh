#!/bin/bash

if [ -f /.dockerenv ]; then
    echo "Running in Docker (production mode)"
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000
else
    echo "Running locally with uv (dev mode)"
    uv run fastapi dev app/main.py --reload --host 0.0.0.0 --port 8000
fi