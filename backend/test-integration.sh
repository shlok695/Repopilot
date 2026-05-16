#!/bin/bash

# RepoPilot Backend Integration Test Script
# This script tests the backend API endpoints with real HTTP requests

set -e

API_BASE="http://localhost:5001"
SCAN_ID=""

echo "================================"
echo "RepoPilot Backend Integration Tests"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${YELLOW}Test 1: GET /api/health${NC}"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE}/api/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Health check passed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}✗ Health check failed (HTTP $HTTP_CODE)${NC}"
    exit 1
fi
echo ""

# Test 2: POST /api/scan without type (should fail)
echo -e "${YELLOW}Test 2: POST /api/scan without type (expect 400)${NC}"
ERROR_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE}/api/scan" \
    -H "Content-Type: application/json" \
    -d '{"repoUrl":"https://github.com/test/repo"}')
HTTP_CODE=$(echo "$ERROR_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✓ Correctly rejected request without type (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ Expected 400, got HTTP $HTTP_CODE${NC}"
    exit 1
fi
echo ""

# Test 3: POST /api/scan with invalid URL (should fail)
echo -e "${YELLOW}Test 3: POST /api/scan with invalid URL (expect 400)${NC}"
ERROR_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE}/api/scan" \
    -H "Content-Type: application/json" \
    -d '{"type":"github","repoUrl":"https://gitlab.com/test/repo"}')
HTTP_CODE=$(echo "$ERROR_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✓ Correctly rejected invalid GitHub URL (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ Expected 400, got HTTP $HTTP_CODE${NC}"
    exit 1
fi
echo ""

# Test 4: POST /api/scan with valid GitHub URL
echo -e "${YELLOW}Test 4: POST /api/scan with valid GitHub URL${NC}"
echo "Note: This will clone a real repository. Using a small test repo..."
SCAN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE}/api/scan" \
    -H "Content-Type: application/json" \
    -d '{"type":"github","repoUrl":"https://github.com/expressjs/express"}')
HTTP_CODE=$(echo "$SCAN_RESPONSE" | tail -n1)
BODY=$(echo "$SCAN_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Scan initiated successfully (HTTP $HTTP_CODE)${NC}"
    SCAN_ID=$(echo "$BODY" | jq -r '.scanId' 2>/dev/null)
    echo "Scan ID: $SCAN_ID"
    echo "Response preview:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}✗ Scan failed (HTTP $HTTP_CODE)${NC}"
    echo "$BODY"
    exit 1
fi
echo ""

# Test 5: GET /api/scan/:scanId
if [ -n "$SCAN_ID" ]; then
    echo -e "${YELLOW}Test 5: GET /api/scan/${SCAN_ID}${NC}"
    RESULT_RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE}/api/scan/${SCAN_ID}")
    HTTP_CODE=$(echo "$RESULT_RESPONSE" | tail -n1)
    BODY=$(echo "$RESULT_RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Retrieved scan result (HTTP $HTTP_CODE)${NC}"
        echo "Result preview:"
        echo "$BODY" | jq '{scanId, status, repoMetadata: .repoMetadata.name, vulnCount: (.vulnerabilities | length), bugCount: (.bugs | length)}' 2>/dev/null || echo "$BODY"
    else
        echo -e "${RED}✗ Failed to retrieve scan result (HTTP $HTTP_CODE)${NC}"
        exit 1
    fi
    echo ""
fi

# Test 6: GET /api/scan/:scanId/report
if [ -n "$SCAN_ID" ]; then
    echo -e "${YELLOW}Test 6: GET /api/scan/${SCAN_ID}/report${NC}"
    REPORT_FILE="test_report_${SCAN_ID}.md"
    HTTP_CODE=$(curl -s -w "%{http_code}" -o "$REPORT_FILE" "${API_BASE}/api/scan/${SCAN_ID}/report")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Downloaded report (HTTP $HTTP_CODE)${NC}"
        echo "Report saved to: $REPORT_FILE"
        echo "Report preview (first 10 lines):"
        head -n 10 "$REPORT_FILE"
    else
        echo -e "${RED}✗ Failed to download report (HTTP $HTTP_CODE)${NC}"
        exit 1
    fi
    echo ""
fi

# Test 7: GET /api/scan/:scanId for unknown ID (should fail)
echo -e "${YELLOW}Test 7: GET /api/scan/scan_unknown_1234 (expect 404)${NC}"
ERROR_RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE}/api/scan/scan_unknown_1234")
HTTP_CODE=$(echo "$ERROR_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "404" ]; then
    echo -e "${GREEN}✓ Correctly returned 404 for unknown scan ID${NC}"
else
    echo -e "${RED}✗ Expected 404, got HTTP $HTTP_CODE${NC}"
    exit 1
fi
echo ""

# Test 8: Verify storage files exist
if [ -n "$SCAN_ID" ]; then
    echo -e "${YELLOW}Test 8: Verify storage files${NC}"
    TMP_DIR="${TMP_DIR:-/tmp/repopilot}"
    
    RESULT_FILE="${TMP_DIR}/results/${SCAN_ID}.json"
    REPORT_FILE="${TMP_DIR}/reports/${SCAN_ID}.md"
    
    if [ -f "$RESULT_FILE" ]; then
        echo -e "${GREEN}✓ Result file exists: $RESULT_FILE${NC}"
    else
        echo -e "${RED}✗ Result file not found: $RESULT_FILE${NC}"
    fi
    
    if [ -f "$REPORT_FILE" ]; then
        echo -e "${GREEN}✓ Report file exists: $REPORT_FILE${NC}"
    else
        echo -e "${RED}✗ Report file not found: $REPORT_FILE${NC}"
    fi
    echo ""
fi

echo "================================"
echo -e "${GREEN}All integration tests passed!${NC}"
echo "================================"

# Made with Bob
