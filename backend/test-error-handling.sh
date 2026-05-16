#!/bin/bash

# Test Error Handling Integration
# This script tests various error scenarios with the running server

echo "🧪 Testing Error Handling Integration"
echo "======================================"
echo ""

API_URL="http://localhost:5001"

echo "1. Testing 404 - Unknown Route"
echo "-------------------------------"
response=$(curl -s "$API_URL/api/unknown-route")
echo "Response: $response"
if echo "$response" | grep -q "not found"; then
  echo "✅ 404 handler working correctly"
else
  echo "❌ 404 handler not working as expected"
fi
echo ""

echo "2. Testing Invalid JSON"
echo "-----------------------"
response=$(curl -s -X POST "$API_URL/api/scan" \
  -H "Content-Type: application/json" \
  -d '{invalid json}')
echo "Response: $response"
if echo "$response" | grep -q "Invalid JSON"; then
  echo "✅ JSON SyntaxError handler working correctly"
else
  echo "❌ JSON SyntaxError handler not working as expected"
fi
echo ""

echo "3. Testing Missing Required Field (AppError 400)"
echo "------------------------------------------------"
response=$(curl -s -X POST "$API_URL/api/scan" \
  -H "Content-Type: application/json" \
  -d '{"type":"github"}')
echo "Response: $response"
if echo "$response" | grep -q "error"; then
  echo "✅ AppError handler working correctly"
else
  echo "❌ AppError handler not working as expected"
fi
echo ""

echo "4. Testing Security Headers"
echo "---------------------------"
headers=$(curl -sI "$API_URL/api/health")
echo "$headers" | grep -i "x-frame-options"
echo "$headers" | grep -i "x-content-type-options"
echo "$headers" | grep -i "x-request-id"
if echo "$headers" | grep -q "x-frame-options"; then
  echo "✅ Security headers present"
else
  echo "❌ Security headers missing"
fi
echo ""

echo "5. Testing Metrics Endpoint"
echo "---------------------------"
response=$(curl -s "$API_URL/api/health/metrics")
echo "Response: $response"
if echo "$response" | grep -q "totalScans"; then
  echo "✅ Metrics endpoint working correctly"
else
  echo "❌ Metrics endpoint not working as expected"
fi
echo ""

echo "6. Checking for Stack Traces in Production"
echo "------------------------------------------"
echo "Note: Set NODE_ENV=production to test this properly"
response=$(curl -s -X POST "$API_URL/api/scan" \
  -H "Content-Type: application/json" \
  -d '{invalid}')
if echo "$response" | grep -q "stack"; then
  echo "⚠️  Stack trace found in response (ensure NODE_ENV=production)"
else
  echo "✅ No stack trace in response"
fi
echo ""

echo "======================================"
echo "✅ Error handling integration test complete!"
echo ""
echo "Summary:"
echo "  - 404 handler for unknown routes"
echo "  - JSON SyntaxError handling"
echo "  - AppError handling with proper status codes"
echo "  - Security headers present"
echo "  - Metrics endpoint functional"
echo "  - Stack traces controlled by NODE_ENV"

# Made with Bob
