# Testing AI Endpoints

## Prerequisites

1. **Backend .env configured** with `GEMINI_API_KEY`
2. **Backend server running**: `cd apps/api && npm run dev`
3. **Valid JWT token** from Supabase authentication

## Getting a Test JWT Token

### Option 1: From Frontend (Easiest)
1. Start frontend: `cd frontend && npm run dev`
2. Login to the application
3. Open DevTools → Console
4. Run: `localStorage.getItem('supabase.auth.token')`
5. Copy the JWT token

### Option 2: Using get-token.ts Script
```powershell
cd apps/api
npx tsx get-token.ts
```

## Test Endpoints

### 1. Check AI Quota

```powershell
$token = "YOUR_JWT_TOKEN_HERE"

curl http://localhost:4000/api/ai/quota `
  -H "Authorization: Bearer $token"
```

**Expected Response:**
```json
{
  "rateLimit": {
    "limit": 10,
    "remaining": 10,
    "resetAt": "2026-10-18T15:00:00.000Z"
  }
}
```

### 2. Test Signal Analysis

```powershell
$token = "YOUR_JWT_TOKEN_HERE"

$body = @{
  prediction = @{
    instrument = "BTCUSDT"
    direction = "LONG"
    strategy = "Breakout"
    timeframe = "1H"
    buyingZone = 94000
    sellingZone = 95000
    stopLoss = 93000
    takeProfit = 97000
    riskRewardRatio = 2.5
    analysis = "Strong support at 94k, bullish momentum building"
  }
} | ConvertTo-Json

curl http://localhost:4000/api/ai/analyze `
  -X POST `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d $body
```

**Expected Response:**
```json
{
  "analysis": {
    "overview": "The trader identifies strong support...",
    "riskReward": "The 2.5:1 R:R ratio is attractive...",
    "sentiment": "Market sentiment appears bullish...",
    "verdict": "BULLISH",
    "keyPoints": [
      "Strong support zone at 94,000",
      "Bullish momentum confirmed",
      "Good risk-reward setup",
      "Clear invalidation at stop loss"
    ]
  },
  "rateLimit": {
    "limit": 10,
    "remaining": 9,
    "resetAt": "2026-10-18T15:00:00.000Z"
  }
}
```

### 3. Test Copilot Chat

```powershell
$token = "YOUR_JWT_TOKEN_HERE"

$body = @{
  messages = @(
    @{
      role = "user"
      parts = @( @{ text = "What's your analysis on Bitcoin right now?" } )
    }
  )
  priceContext = "Bitcoin: $94,250 (+2.3% 24h), Ethereum: $3,120 (+1.8% 24h)"
} | ConvertTo-Json -Depth 5

curl http://localhost:4000/api/ai/copilot `
  -X POST `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d $body
```

### 4. Test Voice Mode

```powershell
$token = "YOUR_JWT_TOKEN_HERE"

$body = @{
  messages = @(
    @{
      role = "user"
      parts = @( @{ text = "Is Bitcoin bullish?" } )
    }
  )
  priceContext = "Bitcoin: $94,250"
} | ConvertTo-Json -Depth 5

curl http://localhost:4000/api/ai/voice `
  -X POST `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d $body
```

**Expected Response (voice-optimized):**
```json
{
  "response": "Bitcoin is trading at ninety-four thousand two hundred fifty dollars with positive momentum. The short-term trend shows bullish characteristics with recent higher lows. However, always watch for resistance near ninety-five thousand.",
  "rateLimit": { ... }
}
```

## Rate Limit Testing

### Test Exceeding Quota

Run the quota check multiple times (11+ times for FREE tier):

```powershell
$token = "YOUR_JWT_TOKEN_HERE"

for ($i=1; $i -le 12; $i++) {
  Write-Host "Request $i"
  curl http://localhost:4000/api/ai/quota `
    -H "Authorization: Bearer $token"
  Start-Sleep -Seconds 1
}
```

**Expected on 11th request:**
```json
{
  "error": "Rate Limit Exceeded",
  "message": "AI request limit reached. Resets at 2026-10-18T15:00:00.000Z",
  "rateLimit": {
    "limit": 10,
    "remaining": 0,
    "resetAt": "2026-10-18T15:00:00.000Z"
  }
}
```

## Error Cases

### Missing Authorization Header
```powershell
curl http://localhost:4000/api/ai/quota
```
**Response:** `401 Unauthorized`

### Invalid Token
```powershell
curl http://localhost:4000/api/ai/quota `
  -H "Authorization: Bearer invalid_token"
```
**Response:** `401 Unauthorized`

### Missing Required Fields
```powershell
$token = "YOUR_JWT_TOKEN_HERE"

curl http://localhost:4000/api/ai/analyze `
  -X POST `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{}'
```
**Response:** `400 Bad Request - prediction object required`

## Frontend Integration Testing

### Test from Browser Console

1. Open browser to your running frontend
2. Login to the application
3. Open DevTools → Console
4. Run:

```javascript
// Test quota check
const checkQuota = async () => {
  const { getAIQuota } = await import('./src/services/api/geminiService.ts');
  const quota = await getAIQuota();
  console.log('Quota:', quota);
};
checkQuota();

// Test analysis
const testAnalysis = async () => {
  const { analyzeTraderSetup } = await import('./src/services/api/geminiService.ts');
  const result = await analyzeTraderSetup({
    instrument: 'BTCUSDT',
    direction: 'LONG',
    strategy: 'Breakout',
    timeframe: '1H',
    buyingZone: 94000,
    stopLoss: 93000,
    takeProfit: 97000,
  });
  console.log('Analysis:', result);
};
testAnalysis();
```

## Troubleshooting

### "GEMINI_API_KEY is not set"
- Check `apps/api/.env` contains `GEMINI_API_KEY=your_key`
- Restart backend server after adding the key

### "Cannot find module './routes/ai.routes.js'"
- Ensure all new files are in correct locations:
  - `apps/api/src/services/ai.service.ts`
  - `apps/api/src/controllers/ai.controller.ts`
  - `apps/api/src/routes/ai.routes.ts`
- Restart backend server

### Rate limit not resetting
- Rate limits are in-memory (reset on server restart)
- For production, migrate to Redis

### Network tab shows calls to generativelanguage.googleapis.com
- Frontend still has old `geminiService.ts`
- Ensure frontend file is updated to proxy through backend
- Hard refresh browser (Ctrl+Shift+R)

## Verification Checklist

- [ ] Backend starts without errors
- [ ] `/api/ai/quota` returns rate limit info
- [ ] `/api/ai/analyze` returns structured analysis
- [ ] `/api/ai/copilot` returns text response
- [ ] `/api/ai/voice` returns voice-optimized response
- [ ] Rate limiting enforced after quota exceeded
- [ ] 401 error when no auth token provided
- [ ] DevTools network tab shows `/api/ai/*` calls only
- [ ] No calls to `generativelanguage.googleapis.com` in network tab
