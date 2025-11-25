#!/bin/bash

pnpm run build && pnpm run start &

node watcher.js

wait