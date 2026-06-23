# Universe of Kindness — MessageChat v3

## Objective
Fix MessageChat per user feedback from screenshot: make background fully transparent, add live demo message activity, and auto-growing counter.

## Key Changes

### 1. Transparent chat background
- Changed `background` to `transparent` (was `rgba(0,0,0,0.12)` with blur)
- Header kept subtle dark bg (`rgba(10,12,30,0.35)`) for readability
- Messages now appear directly on starfield/globe background

### 2. Live demo messages (active simulation)
- 30 demo messages in a pool
- On mount: show 10 immediately
- Then every 3–6 seconds (random): new message pushed to top, old ones shift down
- Capped at 30 visible messages
- Real messages (from DB) always appear above demo messages

### 3. Counter auto-growth (demo mode)
- If DB returns count=0 or fetch fails → `simulateCounterGrowth()` kicks in after 3s
- Counter increments by +1 every 10–30 seconds (random interval)
- Simulates real user activity during development

## Files Modified
- `components/MessageChat/MessageChat.tsx` — full rewrite for transparency + live demo
- `app/page.tsx` — added `simulateCounterGrowth()`, moved before initial data load effect

## Commits
- `835f072`: fix: transparent chat bg, live demo messages (3-6s interval), counter auto-growth 10-30s

## Status
Pushed and deployed. Awaiting user feedback.
