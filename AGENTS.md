# Trading Platform Engineering Rules

## Product

This is a trading-intelligence and signal platform.

The trading desk is the source of trading decisions.

AI is NOT the source of trading decisions.

## Architecture

Frontend:
React + TypeScript

Backend:
Node.js + TypeScript

Database:
PostgreSQL

Realtime:
WebSocket/SSE

Market Data:
Provider adapter

AI:
Provider/tool adapter

## Critical Rules

1. Never implement real-money execution in V1.

2. Never implement automated copy trading in V1.

3. Never expose exchange secrets to frontend code.

4. Never call Delta directly from React components.

5. All exchange integrations must be behind provider adapters.

6. A Signal is a domain object, not a chat message.

7. Published signals must preserve immutable history.

8. Amendments create new SignalVersions.

9. Material signal changes create SignalEvents and AuditLogs.

10. Authorization must be enforced server-side.

11. Financial calculations must be deterministic backend code.

12. AI must never invent trader reasoning.

13. AI must not perform financial arithmetic.

14. Do not overwrite historical performance.

15. Do not delete losing signals to improve performance.

16. Every important feature requires tests.

17. Do not change architecture without review.

18. Do not implement features outside the current phase without approval.

19. Use decimal-safe representations for financial values.

20. Treat market data, trader decisions and AI commentary as separate sources of truth.