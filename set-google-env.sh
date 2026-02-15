#!/bin/bash
# Set Google OAuth environment variables on Render
# Usage: GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy ./set-google-env.sh

RENDER_API_KEY="$1"
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-$2}"
GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-$3}"

if [ -z "$RENDER_API_KEY" ] || [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
    echo "Usage: GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy ./set-google-env.sh <render_api_key>"
    exit 1
fi

BACKEND_SERVICE="srv-d67niav5r7bs73dg9tl0"

echo "Setting Google OAuth environment variables on Render..."

# Set Google Client ID
curl -s -X PATCH "https://api.render.com/v1/services/$BACKEND_SERVICE/env-vars" \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Content-Type: application/json" \
    -d "[{\"key\":\"GOOGLE_CLIENT_ID\",\"value\":\"$GOOGLE_CLIENT_ID\"}]"

# Set Google Client Secret
curl -s -X PATCH "https://api.render.com/v1/services/$BACKEND_SERVICE/env-vars" \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Content-Type: application/json" \
    -d "[{\"key\":\"GOOGLE_CLIENT_SECRET\",\"value\":\"$GOOGLE_CLIENT_SECRET\"}]"

# Set Redirect URI
curl -s -X PATCH "https://api.render.com/v1/services/$BACKEND_SERVICE/env-vars" \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Content-Type: application/json" \
    -d '[{"key":"GOOGLE_REDIRECT_URI","value":"https://property-crm-live.onrender.com/auth/callback"}]'

echo ""
echo "Environment variables set."
