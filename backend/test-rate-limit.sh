#!/bin/bash

# Test Rate Limiting with curl
# This script tests the rate limiter by making 10 rapid requests

echo "🧪 Testing Rate Limiting on POST /api/scan"
echo "==========================================="
echo ""
echo "Making 10 rapid requests to test 5 per minute limit..."
echo ""

API_URL="http://localhost:5001/api/scan"

for i in {1..10}; do
  echo "Request #$i:"
  
  response=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
    -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d '{"type":"github","repoUrl":"https://github.com/expressjs/express"}' \
    2>&1)
  
  http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
  body=$(echo "$response" | grep -v "HTTP_STATUS")
  
  echo "  Status: $http_status"
  
  if [ "$http_status" = "429" ]; then
    echo "  ✅ Rate limited (expected after 5 requests)"
    echo "  Response: $body"
  elif [ "$http_status" = "200" ] || [ "$http_status" = "202" ]; then
    echo "  ✅ Request accepted"
  else
    echo "  ⚠️  Unexpected status: $http_status"
    echo "  Response: $body"
  fi
  
  echo ""
  sleep 0.5
done

echo ""
echo "==========================================="
echo "✅ Rate limit test complete!"
echo ""
echo "Expected behavior:"
echo "  - First 5 requests: 200/202 (accepted)"
echo "  - Requests 6-10: 429 (rate limited)"
echo ""
echo "To verify security headers, run:"
echo "  curl -I http://localhost:5001/api/health"

# Made with Bob
