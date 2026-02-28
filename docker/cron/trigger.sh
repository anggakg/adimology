#!/bin/sh
# Trigger the analyze-watchlist background job
# This runs daily at 11:00 UTC, replacing the Netlify scheduled function

APP_URL="${APP_INTERNAL_URL:-http://web:3000}"
SECRET="${CRON_SECRET}"

echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Triggering analyze-watchlist..."

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SECRET}" \
  --max-time 300 \
  "${APP_URL}/api/analyze-watchlist")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Response HTTP $HTTP_CODE: $BODY"

if [ "$HTTP_CODE" = "200" ]; then
  echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Job completed successfully"
else
  echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Job failed with HTTP $HTTP_CODE"
  exit 1
fi
