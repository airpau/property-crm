#!/bin/bash
# Render Auto-Deploy Script for Property CRM
# Usage: ./deploy-render.sh [frontend|backend|both]

RENDER_API_KEY="rnd_rZl4LHfiUZwjYIdBQ11R8xjyQPSW"
FRONTEND_SERVICE="srv-d67o8ep5pdvs73ej92bg"
BACKEND_SERVICE="srv-d67niav5r7bs73dg9tl0"

deploy_service() {
    local service_id=$1
    local service_name=$2
    
    echo "🚀 Deploying $service_name..."
    
    response=$(curl -s -X POST \
        "https://api.render.com/v1/services/$service_id/deploys" \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{
            "clearCache": false
        }')
    
    if [ $? -eq 0 ]; then
        echo "✅ $service_name deploy triggered successfully"
        echo "Response: $response"
    else
        echo "❌ Failed to deploy $service_name"
        return 1
    fi
}

case "${1:-both}" in
    frontend)
        deploy_service "$FRONTEND_SERVICE" "Property CRM Frontend"
        ;;
    backend)
        deploy_service "$BACKEND_SERVICE" "Property CRM Backend"
        ;;
    both)
        deploy_service "$FRONTEND_SERVICE" "Property CRM Frontend"
        deploy_service "$BACKEND_SERVICE" "Property CRM Backend"
        ;;
    *)
        echo "Usage: $0 [frontend|backend|both]"
        exit 1
        ;;
esac
