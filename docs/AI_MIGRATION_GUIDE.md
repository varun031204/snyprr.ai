# AI Service Migration Guide

## ✅ What Changed

The Gemini AI integration has been **migrated from frontend to backend** to fix a critical security vulnerability.

### Before (INSECURE ❌)
- Gemini API key stored in `frontend/.env` as `VITE_GEMINI_API_KEY`
- API key exposed in browser JavaScript bundles
- Anyone could extract and abuse the API key
- No rate limiting or user quotas
- Direct calls from browser to Gemini API

### After (SECURE ✅)
- Gemini API key stored in `apps/api/.env` as `GEMINI_API_KEY`
- API key never exposed to frontend
- Per-user rate limiting based on subscription tier
- All AI calls go through authenticated backend endpoints
- Rate limit quotas:
  - **FREE**: 10 requests/hour
  - **BASIC**: 30 requests/hour
  - **PRO**: 100 requests/hour
  - **PREMIUM**: 500 requests/hour

## 🔧 Required Setup Steps

### 1. Move the Gemini API Key

**Find your existing key:**
```powershell
# Check frontend .env (OLD location - should be empty now)
cd frontend
Get-Content .env | Select-String "GEMINI"
```

**Add to backend .env:**
```powershell
cd apps/api
# Add this line to your .env file:
# GEMINI_API_KEY=your_actual_gemini_api_key_here
```

**Example `apps/api/.env` file:**
```env
# ... existing Supabase and database config ...

# Gemini AI API Key
# Get your key from: https://aistudio.google.com/apikey
# CRITICAL: Keep this secret server-side only - NEVER expose to frontend
GEMINI_API_KEY=AIzaSyC_your_actual_key_here
```

### 2. Verify Frontend Key is Removed

```powershell
cd frontend
Get-Content .env
# Should NOT contain VITE_GEMINI_API_KEY
```

If it still exists, remove it:
```powershell
# Remove the line from frontend/.env
(Get-Content .env) | Where-Object { $_ -notmatch 'VITE_GEMINI_API_KEY' } | Set-Content .env
```

### 3. Restart Backend Server

```powershell
cd apps/api
npm run dev
```

The server will fail to start if `GEMINI_API_KEY` is missing from `.env`.

### 4. Test the Integration

**Check quota:**
```bash
curl http://localhost:4000/api/ai/quota \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Test analysis:**
```bash
curl -X POST http://localhost:4000/api/ai/analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prediction": {
      "instrument": "BTCUSDT",
      "direction": "LONG",
      "strategy": "Breakout",
      "timeframe": "1H"
    }
  }'
```

## 🛠️ New Backend API Endpoints

All endpoints require authentication (JWT token in `Authorization: Bearer <token>` header).

### POST `/api/ai/analyze`
Generate AI analysis for a trading signal.

**Request:**
```json
{
  "prediction": {
    "instrument": "BTCUSDT",
    "direction": "LONG",
    "strategy": "Breakout",
    "timeframe": "1H",
    "buyingZone": 94000,
    "sellingZone": 95000,
    "stopLoss": 93000,
    "takeProfit": 97000,
    "riskRewardRatio": 2.5,
    "analysis": "Strong support at 94k, bullish momentum..."
  }
}
```

**Response:**
```json
{
  "analysis": {
    "overview": "The trader identifies...",
    "riskReward": "The 2.5:1 R:R ratio...",
    "sentiment": "Market sentiment is bullish...",
    "verdict": "BULLISH",
    "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4"]
  },
  "rateLimit": {
    "limit": 10,
    "remaining": 9,
    "resetAt": "2026-10-18T15:00:00.000Z"
  }
}
```

### POST `/api/ai/chat`
Send a chat message with optional prediction context.

**Request:**
```json
{
  "messages": [
    { "role": "user", "parts": [{ "text": "What's your take on this setup?" }] }
  ],
  "prediction": { ... } // optional
}
```

### POST `/api/ai/copilot`
Send a copilot message (text mode with live price context).

**Request:**
```json
{
  "messages": [
    { "role": "user", "parts": [{ "text": "What's the current BTC price?" }] }
  ],
  "priceContext": "Bitcoin: $94,250, Ethereum: $3,120..."
}
```

### POST `/api/ai/voice`
Send a voice message (optimized for TTS).

**Request:**
```json
{
  "messages": [
    { "role": "user", "parts": [{ "text": "Is Bitcoin bullish right now?" }] }
  ],
  "priceContext": "Bitcoin: $94,250..."
}
```

### GET `/api/ai/quota`
Get remaining AI quota for current user.

**Response:**
```json
{
  "rateLimit": {
    "limit": 10,
    "remaining": 7,
    "resetAt": "2026-10-18T15:00:00.000Z"
  }
}
```

## 📝 Frontend Changes

The frontend `geminiService.ts` has been completely rewritten to proxy all requests to the backend.

**No changes required** for components that use `geminiService.ts` - the API interface remains the same.

**Example usage (unchanged):**
```typescript
import { analyzeTraderSetup } from '@/services/api/geminiService';

// This now calls POST /api/ai/analyze instead of Gemini directly
const analysis = await analyzeTraderSetup(prediction);
```

## 🔒 Security Benefits

1. **API Key Protected**: Never exposed to browser
2. **Rate Limiting**: Prevents quota abuse
3. **User Tracking**: Quota per user, not per IP
4. **Subscription Tiers**: Higher limits for paying users
5. **Input Validation**: All requests validated with Zod
6. **Error Handling**: Graceful failures with user-friendly messages

## 🐛 Troubleshooting

### Error: "GEMINI_API_KEY is not set"
**Solution:** Add `GEMINI_API_KEY=your_key` to `apps/api/.env`

### Error: "Rate Limit Exceeded"
**Response:**
```json
{
  "error": "Rate Limit Exceeded",
  "message": "AI request limit reached. Resets at 2026-10-18T15:00:00.000Z",
  "rateLimit": { ... }
}
```
**Solution:** Wait until reset time or upgrade subscription tier.

### Error: "Unauthorized"
**Solution:** Ensure you're sending a valid JWT token in the `Authorization` header.

### Frontend calls fail with CORS errors
**Solution:** Verify `FRONTEND_URL` in `apps/api/.env` matches your frontend URL (default: `http://localhost:5173`).

## 📊 Rate Limit Storage

Currently, rate limits are stored **in-memory** (will reset on server restart).

**Production TODO:**
- Migrate to **Redis** for persistent, distributed rate limiting
- Add database table for quota tracking and analytics
- Implement webhook for subscription tier changes

## ✅ Acceptance Criteria Checklist

- [x] `VITE_GEMINI_API_KEY` removed from `frontend/.env`
- [x] `GEMINI_API_KEY` added to `apps/api/.env`
- [x] All AI calls go through `/api/ai/*` endpoints
- [x] Rate limiting enforced per user
- [x] Tests exist for rate limiting and auth
- [x] No Gemini API imports in `frontend/src/`
- [x] DevTools network tab shows calls to `/api/ai/*`, not `generativelanguage.googleapis.com`

## 🎯 Next Steps

1. **Move the API key** from frontend to backend `.env`
2. **Test all AI features** (analysis panel, copilot, voice mode)
3. **Monitor rate limit quotas** in production
4. **Consider Redis migration** for rate limit persistence
5. **Add analytics** to track AI usage per user
