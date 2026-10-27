# Thurst

**Right Now. Right Here.** A location-based hookup app for gay and bi men (18+). You go available, get one match at a time, have 2 minutes to decide, then 5 minutes to chat and sort things out.

This repo is the Phase 1 MVP from the product spec.

## Stack

| Part | What |
|---|---|
| `app/` | Expo (SDK 58) + React Native + Expo Router, TypeScript. Runs on iOS, Android and web. |
| `server/` | Node 22 + Express 5 + Socket.IO, TypeScript (run with `tsx`). SQLite via the built-in `node:sqlite`. |
| `shared/` | Profile options, types, timers and socket event names used by both. |

## Running it

```bash
npm install
cp server/.env.example server/.env   # optional; defaults work for local dev
npm run server                       # API + sockets on :4000
npm run app                          # Expo dev server; open in Expo Go or a simulator
```

Without SMTP settings, email verification codes are printed in the server log.

The app talks to port 4000 on the machine running the Expo dev server, so a phone on the same Wi-Fi works with no setup. Set `EXPO_PUBLIC_API_URL` to point it elsewhere.

```bash
npm test          # server: matching unit tests + full two-user flow over real sockets
npm run typecheck
```

## What's in the MVP

- **Sign-up** in three steps: email + 6 digit code, username/password/birthdate (18+ enforced, terms accepted), home city/zip + location permission. Passwords are scrypt-hashed; sessions are 30 day JWTs kept in the device keychain.
- **Profile** with every field in the spec (basics, health & wellness, the good stuff), blank by default, plus up to 5 photos you can reorder.
- **Match filters**: distance, age range, body type, position, habits, HIV status, host/travel, must-have likes. All optional.
- **I'm Available** toggle. Your profile only exists to others while you're available, and only your current match can load your photos.
- **Matching**: every 2 seconds the server scores every pair of available users. Filters are hard and mutual (both must fit each other's); then a weighted score of distance, position fit, shared likes, host/travel fit, rating history and wait time. Best pairs are taken first. Pairs are skipped if either blocked the other, one passed in the last hour, or either rated "wouldn't match again".
- **2 minute review**: both see the full profile. Hook Me Up / Not Right Now. No answer counts as a pass, and both go back in the queue.
- **5 minute chat**: real-time messages and location sharing, a visible timer, a "1 minute remaining" warning, hard stop, no extensions. Messages live only in server memory and are gone when the chat ends.
- **Rating**: 1 to 5 stars, would you match again, optional feedback. Feeds the matcher.
- **Safety**: block or report from the review or chat screen; account deletion in Settings.

## Not in Phase 1 yet

These are in the spec for later phases, or need accounts/services to be set up:

- Push notifications (FCM/APNs). Matches and warnings arrive in-app with haptics while the app is open.
- Photo sharing in chat, automated photo moderation, profile verification.
- End-to-end encryption of chat (today it's TLS in transit, never stored).
- A learned ("AI") model. The current matcher is a transparent scoring function; ratings are stored so a model can be trained on them later.
- Admin tools for reviewing reports, analytics.
- Production hosting: the server keeps live presence in memory, so it runs as a single instance. Scaling out needs Redis for presence and the Socket.IO adapter, and Postgres instead of SQLite.
