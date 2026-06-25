#!/usr/bin/env bash

echo "=================================================="
echo "          COOK2CART SYSTEM DIAGNOSTICS            "
echo "=================================================="
echo ""

# 1. Check Docker Containers
echo ">>> [1/5] Checking Docker containers..."
if command -v docker >/dev/null 2>&1; then
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo "ERROR: docker command not found."
fi
echo ""

# 2. Check Service Registry & Spring Boot Ports
echo ">>> [2/5] Checking local port listeners..."
for port in 8761 8080 8085 8086 8089; do
    if command -v nc >/dev/null 2>&1; then
        nc -z localhost $port >/dev/null 2>&1 && echo "  - Port $port is LISTENING" || echo "  - Port $port is CLOSED/NOT RUNNING"
    elif command -v bash >/dev/null 2>&1; then
        (exec 3<>/dev/tcp/127.0.0.1/$port) >/dev/null 2>&1 && echo "  - Port $port is LISTENING" || echo "  - Port $port is CLOSED/NOT RUNNING" && exec 3>&-
    else
        echo "  - Cannot check port $port (no netcat or bash dev/tcp)"
    fi
done
echo ""

# 3. Test Connection to Video Service
echo ">>> [3/5] Testing connection to Video Service (Port 8086)..."
curl -s -o /dev/null -w "  HTTP Status Code: %{http_code}\n" http://localhost:8086/video/process -X POST -H "Content-Type: application/json" -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' || echo "  Failed to connect to Video Service."
echo ""

# 4. Extract and Test Gemini API Key from application.properties
echo ">>> [4/5] Testing Gemini API Key..."
PROP_FILE="backend/ai-service/src/main/resources/application.properties"
if [ -f "$PROP_FILE" ]; then
    GEMINI_KEY=$(grep "^gemini.api.key=" "$PROP_FILE" | cut -d'=' -f2 | tr -d '\r\n ')
    
    if [ -z "$GEMINI_KEY" ]; then
        echo "  ERROR: No Gemini API key found in $PROP_FILE"
    else
        # Mask key for safety
        MASKED_KEY="${GEMINI_KEY:0:8}...${GEMINI_KEY: -5}"
        echo "  Testing key: $MASKED_KEY"
        
        # Test Gemini 2.0 Flash
        echo "  --- Model: gemini-2.0-flash ---"
        RESPONSE_20=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}" \
            -H "Content-Type: application/json" \
            -d '{"contents": [{"parts":[{"text": "Hello"}]}]}')
        STATUS_20=$(echo "$RESPONSE_20" | grep "HTTP_STATUS:" | cut -d':' -f2)
        BODY_20=$(echo "$RESPONSE_20" | sed '/HTTP_STATUS:/d')
        echo "  Status: $STATUS_20"
        
        # Test List Models
        echo "  --- Querying Available Models via API ---"
        RESPONSE_LIST=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}")
        STATUS_LIST=$(echo "$RESPONSE_LIST" | grep "HTTP_STATUS:" | cut -d':' -f2)
        BODY_LIST=$(echo "$RESPONSE_LIST" | sed '/HTTP_STATUS:/d')
        echo "  Status ListModels: $STATUS_LIST"
        
        if [ "$STATUS_LIST" = "200" ]; then
            echo "  Available Models in your API key:"
            echo "$BODY_LIST" | grep -o '"name": "models/[^"]*' | cut -d'/' -f2
        else
            echo "  Failed to list models. Error:"
            echo "$BODY_LIST"
        fi
    fi
else
    echo "  ERROR: $PROP_FILE not found."
fi
echo ""

# 5. Check logs of Video Service
echo ">>> [5/5] Checking last 10 lines of Video Service logs..."
if command -v docker >/dev/null 2>&1; then
    docker logs cook2cart-video-service-8086 --tail 15 || echo "  Could not retrieve video-service container logs."
else
    echo "  Docker not available."
fi
echo ""
echo "=================================================="
echo "          DIAGNOSTICS COMPLETED                   "
echo "=================================================="
