#!/bin/bash

# PHASE 4 — TEST DRIVE SCRIPT
# Test generate DERIVATIVE article dengan outline K1-TURUNAN-3

echo "🚀 PHASE 4 — TEST DRIVE"
echo "========================="
echo ""

# Check if API key is set
if [ -z "$OPENAI_API_KEY" ] && [ -z "$AI_API_KEY" ]; then
    echo "❌ ERROR: OPENAI_API_KEY or AI_API_KEY must be set"
    echo "   Set it with: export OPENAI_API_KEY=your_key_here"
    exit 1
fi

# Check if server is running
echo "🔍 Checking if Go engine server is running on :8080..."
if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "⚠️  Server not running. Please start it with:"
    echo "   cd engine-hub"
    echo "   go run cmd/server/main.go"
    exit 1
fi

echo "✅ Server is running"
echo ""

# Read outline from file
OUTLINE_FILE="../docs/OUTLINE-K1-TURUNAN-3-KESALAHAN-UMUM.md"
if [ ! -f "$OUTLINE_FILE" ]; then
    echo "❌ ERROR: Outline file not found: $OUTLINE_FILE"
    exit 1
fi

# Extract outline content (from line 28 to line 232)
OUTLINE_CONTENT=$(sed -n '28,232p' "$OUTLINE_FILE")

# Prepare JSON payload
PAYLOAD=$(cat <<EOF
{
  "contentType": "DERIVATIVE",
  "category": "K1",
  "outline": $(echo "$OUTLINE_CONTENT" | jq -Rs .),
  "language": "id-ID"
}
EOF
)

echo "📝 Sending generate request..."
echo "   Content Type: DERIVATIVE"
echo "   Category: K1"
echo "   Language: id-ID"
echo ""

# Make API call
RESPONSE=$(curl -s -X POST http://localhost:8080/api/engine/ai/generate \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

# Check if request succeeded
if echo "$RESPONSE" | jq -e '.status' > /dev/null 2>&1; then
    STATUS=$(echo "$RESPONSE" | jq -r '.status')
    
    if [ "$STATUS" = "DRAFT_AI" ]; then
        echo "✅ GENERATION SUCCESS"
        echo "   Status: $STATUS"
        echo ""
        
        # Extract content
        TITLE=$(echo "$RESPONSE" | jq -r '.content.title')
        BODY=$(echo "$RESPONSE" | jq -r '.content.body')
        META_TITLE=$(echo "$RESPONSE" | jq -r '.content.metaTitle')
        META_DESC=$(echo "$RESPONSE" | jq -r '.content.metaDesc')
        
        echo "📄 GENERATED CONTENT:"
        echo "===================="
        echo "Title: $TITLE"
        echo "Meta Title: $META_TITLE"
        echo "Meta Description: $META_DESC"
        echo ""
        echo "Body (first 500 chars):"
        echo "$BODY" | head -c 500
        echo "..."
        echo ""
        
        # Save to file for review
        OUTPUT_FILE="test-drive-result-$(date +%Y%m%d-%H%M%S).json"
        echo "$RESPONSE" | jq '.' > "$OUTPUT_FILE"
        echo "💾 Full response saved to: $OUTPUT_FILE"
        echo ""
        echo "📖 MANUAL REVIEW REQUIRED:"
        echo "   Read the full content and evaluate:"
        echo "   1. Does it feel like human-written article?"
        echo "   2. Does it flow naturally, not stiff?"
        echo "   3. Can you detect AI template patterns?"
        echo "   4. Is it comfortable to read for 5-7 minutes?"
        
    elif [ "$STATUS" = "FAILED_VALIDATION" ]; then
        echo "❌ GENERATION FAILED: VALIDATION ERROR"
        echo "   Status: $STATUS"
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.message // .error')
        echo "   Error: $ERROR_MSG"
        
    else
        echo "⚠️  GENERATION FAILED"
        echo "   Status: $STATUS"
        echo "$RESPONSE" | jq '.'
    fi
else
    echo "❌ ERROR: Invalid response from server"
    echo "$RESPONSE"
fi
