#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Manual test script for AI endpoints (works around vitest timeout)

.DESCRIPTION
    Tests AI endpoints without requiring the full test suite to run.
    Requires the backend server to be running on localhost:4000.

.EXAMPLE
    # Start backend in another terminal first:
    # cd apps/api && npm run dev

    # Then run this script:
    ./manual-test-ai.ps1
#>

param(
    [string]$BaseUrl = "http://localhost:4000",
    [string]$Token = ""
)

Write-Host "=== AI Endpoints Manual Test ===" -ForegroundColor Cyan
Write-Host ""

# Check if server is running
try {
    $healthCheck = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get -ErrorAction Stop
    Write-Host "✅ Backend server is running" -ForegroundColor Green
    Write-Host "   Environment: $($healthCheck.environment)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Backend server not reachable at $BaseUrl" -ForegroundColor Red
    Write-Host "   Start server with: cd apps/api && npm run dev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# If no token provided, prompt for one
if ([string]::IsNullOrWhiteSpace($Token)) {
    Write-Host "⚠️  No JWT token provided" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To get a token:" -ForegroundColor Gray
    Write-Host "  1. Open frontend in browser and login" -ForegroundColor Gray
    Write-Host "  2. Open DevTools Console" -ForegroundColor Gray
    Write-Host "  3. Run: localStorage.getItem('supabase.auth.token')" -ForegroundColor Gray
    Write-Host "  4. Copy the JWT token value" -ForegroundColor Gray
    Write-Host ""
    $Token = Read-Host "Enter JWT token (or press Enter to test unauthenticated)"
}

$headers = @{
    "Content-Type" = "application/json"
}

if (![string]::IsNullOrWhiteSpace($Token)) {
    $headers["Authorization"] = "Bearer $Token"
}

Write-Host "=== Test 1: Unauthenticated Request ===" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/ai/quota" -Method Get -Headers @{"Content-Type"="application/json"} -ErrorAction Stop
    Write-Host "❌ FAIL: Should have rejected unauthenticated request" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ PASS: Correctly rejected with 401 Unauthorized" -ForegroundColor Green
    } else {
        Write-Host "⚠️  UNEXPECTED: Got status $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

Write-Host ""

if ([string]::IsNullOrWhiteSpace($Token)) {
    Write-Host "⚠️  Skipping authenticated tests (no token provided)" -ForegroundColor Yellow
    exit 0
}

Write-Host "=== Test 2: GET /api/ai/quota ===" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/ai/quota" -Method Get -Headers $headers -ErrorAction Stop
    Write-Host "✅ PASS: Quota endpoint accessible" -ForegroundColor Green
    Write-Host "   Limit: $($response.rateLimit.limit)" -ForegroundColor Gray
    Write-Host "   Remaining: $($response.rateLimit.remaining)" -ForegroundColor Gray
    Write-Host "   Resets at: $($response.rateLimit.resetAt)" -ForegroundColor Gray
} catch {
    Write-Host "❌ FAIL: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""

Write-Host "=== Test 3: POST /api/ai/analyze (missing body) ===" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/ai/analyze" -Method Post -Headers $headers -Body "{}" -ErrorAction Stop
    Write-Host "❌ FAIL: Should have rejected empty body" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ PASS: Correctly rejected with 400 Bad Request" -ForegroundColor Green
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd() | ConvertFrom-Json
        Write-Host "   Error: $($responseBody.error)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  UNEXPECTED: Got status $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

Write-Host ""

Write-Host "=== Test 4: POST /api/ai/analyze (valid request) ===" -ForegroundColor Cyan
$body = @{
    prediction = @{
        instrument = "BTCUSDT"
        direction = "LONG"
        strategy = "Breakout"
        timeframe = "1H"
        buyingZone = 94000
        stopLoss = 93000
        takeProfit = 97000
        analysis = "Testing AI analysis endpoint"
    }
} | ConvertTo-Json

try {
    Write-Host "⏳ Calling Gemini API (may take 5-10 seconds)..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/ai/analyze" -Method Post -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "✅ PASS: Analysis completed successfully" -ForegroundColor Green
    Write-Host "   Verdict: $($response.analysis.verdict)" -ForegroundColor Gray
    Write-Host "   Overview: $($response.analysis.overview.Substring(0, [Math]::Min(100, $response.analysis.overview.Length)))..." -ForegroundColor Gray
    Write-Host "   Rate Limit Remaining: $($response.rateLimit.remaining)" -ForegroundColor Gray
} catch {
    $statusCode = $_.Exception.Response.StatusCode
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()

    if ($statusCode -eq 500) {
        $errorObj = $responseBody | ConvertFrom-Json
        if ($errorObj.message -like "*GEMINI_API_KEY*") {
            Write-Host "⚠️  EXPECTED FAILURE: GEMINI_API_KEY not configured in backend .env" -ForegroundColor Yellow
            Write-Host "   Add GEMINI_API_KEY to apps/api/.env to enable AI features" -ForegroundColor Gray
        } else {
            Write-Host "❌ FAIL: $($errorObj.message)" -ForegroundColor Red
        }
    } elseif ($statusCode -eq 429) {
        Write-Host "⚠️  Rate limit exceeded (this is correct behavior)" -ForegroundColor Yellow
    } else {
        Write-Host "❌ FAIL: Unexpected error" -ForegroundColor Red
        Write-Host "   Status: $statusCode" -ForegroundColor Red
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Tests completed. Check results above." -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Add GEMINI_API_KEY to apps/api/.env" -ForegroundColor Gray
Write-Host "  2. Restart backend server" -ForegroundColor Gray
Write-Host "  3. Run this script again to verify AI endpoints work" -ForegroundColor Gray
