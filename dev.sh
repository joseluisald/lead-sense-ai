#!/usr/bin/env bash

set -euo pipefail

bun --cwd frontend run dev &
frontend_pid=$!

bun --cwd backend run dev &
backend_pid=$!

cleanup() {
  kill "$frontend_pid" "$backend_pid" 2>/dev/null || true
  wait "$frontend_pid" "$backend_pid" 2>/dev/null || true
}

trap cleanup EXIT INT TERM
wait "$frontend_pid" "$backend_pid"
