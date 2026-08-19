# Fikirizm Cloud Auth Testing Playbook

Auth: Email/Password (JWT httpOnly cookies) + Emergent Google OAuth (session_token cookie).
Both resolve through `get_current_user` in `/app/backend/deps.py`. Bearer token also accepted.

## Test accounts (see /app/memory/test_credentials.md)
- Owner: ingobiosport@gmail.com / Fikirizm2025!
- Members: elif@fikirizm.com, mert@fikirizm.com, zeynep@fikirizm.com — all Demo2025!

## API test
```
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ingobiosport@gmail.com","password":"Fikirizm2025!"}'
curl -b cookies.txt http://localhost:8001/api/auth/me
curl -b cookies.txt http://localhost:8001/api/bootstrap
```
Login returns `{user, token}` and sets access_token + refresh_token cookies.
`token` can be used as `Authorization: Bearer <token>` on protected endpoints.

## Google OAuth
- Frontend redirects to https://auth.emergentagent.com/?redirect=<origin>/panel
- Returns to /panel#session_id=... ; AuthCallback POSTs session_id to /api/auth/session
- Backend exchanges via demobackend.emergentagent.com and sets session_token cookie.

## Browser cookie for testing protected pages
Use the `token` from login as Bearer, or set access_token cookie.
