#!/bin/bash

# Property CRM Deployment Script
# This builds frontend, commits, and triggers Render deploy

echo "========================================="
echo "Property CRM Deployment to Render"
echo "========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "render.yaml" ]; then
    echo -e "${RED}Error: render.yaml not found. Are you in the property-crm directory?${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Building frontend locally...${NC}"
cd frontend
npm install
npm run build

if [ ! -d "build" ]; then
    echo -e "${RED}Error: Frontend build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Frontend built successfully${NC}"

cd ..

echo -e "${YELLOW}Step 2: Committing build to Git...${NC}"
git add -A
git commit -m "Build frontend for deployment $(date +%Y-%m-%d-%H:%M)"
git push

echo -e "${GREEN}✓ Code pushed to GitHub${NC}"

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Go to https://dashboard.render.com"
echo "2. Click 'property-crm-api'"
echo "3. Click 'Manual Deploy' → 'Deploy latest commit'"
echo ""
echo "After deploy, test: https://property-crm-api-8t0r.onrender.com/login"
echo ""
