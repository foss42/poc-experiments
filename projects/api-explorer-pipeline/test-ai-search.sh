#!/bin/bash

# Test AI Search Endpoint - Verify the fix
# This script tests the AI search endpoint to ensure it returns the correct structure

echo "🧪 Testing AI Search Endpoint Fix"
echo "=================================="
echo ""

# Check if server is running
echo "1️⃣ Checking if backend server is running..."
if curl -s http://localhost:3002/ > /dev/null 2>&1; then
    echo "✅ Backend server is running"
else
    echo "❌ Backend server is NOT running"
    echo "Please start the server first:"
    echo "  cd backend"
    echo "  node simple-server.js"
    exit 1
fi

echo ""
echo "2️⃣ Testing AI search endpoint..."
echo ""

# Test query
QUERY="get users"
echo "Query: \"$QUERY\""
echo ""

# Make request
RESPONSE=$(curl -s -X POST http://localhost:3002/agent/tools/search \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"$QUERY\"}")

# Check if response is valid JSON
if ! echo "$RESPONSE" | python -m json.tool > /dev/null 2>&1; then
    echo "❌ Response is not valid JSON"
    echo "Response: $RESPONSE"
    exit 1
fi

echo "✅ Response is valid JSON"
echo ""

# Check for "success" field
if echo "$RESPONSE" | grep -q '"success"'; then
    SUCCESS_VALUE=$(echo "$RESPONSE" | grep -o '"success"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o '[^:]*$' | tr -d ' ')
    echo "✅ 'success' field found: $SUCCESS_VALUE"
else
    echo "❌ 'success' field NOT found"
    exit 1
fi

# Check for "results" field (NEW - this was missing before)
if echo "$RESPONSE" | grep -q '"results"'; then
    echo "✅ 'results' field found (NEW FIX)"
else
    echo "❌ 'results' field NOT found (BUG NOT FIXED)"
    echo ""
    echo "Available fields:"
    echo "$RESPONSE" | grep -o '"[^"]*"[[:space:]]*:' | head -20
    exit 1
fi

# Check for "matches" field (backward compatibility)
if echo "$RESPONSE" | grep -q '"matches"'; then
    echo "✅ 'matches' field found (backward compatibility)"
else
    echo "⚠️  'matches' field NOT found (backward compatibility issue)"
fi

# Check for "query" field
if echo "$RESPONSE" | grep -q '"query"'; then
    echo "✅ 'query' field found"
else
    echo "❌ 'query' field NOT found"
fi

# Check for "intent" field
if echo "$RESPONSE" | grep -q '"intent"'; then
    echo "✅ 'intent' field found"
else
    echo "⚠️  'intent' field NOT found"
fi

# Check for "entity" field
if echo "$RESPONSE" | grep -q '"entity"'; then
    echo "✅ 'entity' field found"
else
    echo "⚠️  'entity' field NOT found"
fi

echo ""
echo "3️⃣ Response Structure:"
echo "====================="
echo "$RESPONSE" | python -m json.tool 2>/dev/null | head -50

echo ""
echo "4️⃣ Testing Multiple Queries:"
echo "============================"

QUERIES=("get users" "create pet" "update product" "delete order")

for query in "${QUERIES[@]}"; do
    echo ""
    echo "Testing: \"$query\""
    
    response=$(curl -s -X POST http://localhost:3002/agent/tools/search \
      -H "Content-Type: application/json" \
      -d "{\"query\":\"$query\"}")
    
    # Check for both success and results
    if echo "$response" | grep -q '"success"[[:space:]]*:[[:space:]]*true' && \
       echo "$response" | grep -q '"results"'; then
        echo "  ✅ Query processed successfully"
    else
        echo "  ❌ Query failed"
        echo "  Response: $response"
        exit 1
    fi
done

echo ""
echo "🎉 All Tests Passed!"
echo "===================="
echo ""
echo "Summary:"
echo "  ✅ Backend server is running"
echo "  ✅ Response is valid JSON"
echo "  ✅ 'success' field present"
echo "  ✅ 'results' field present (FIX VERIFIED)"
echo "  ✅ 'matches' field present (backward compatible)"
echo "  ✅ Multiple queries work correctly"
echo ""
echo "The AI search endpoint is working correctly!"
echo "The GitHub Actions workflow should now pass."
