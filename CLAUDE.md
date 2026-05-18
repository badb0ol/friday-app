# Friday — Personal AI Command Centre
## Project context for Claude Code

---

## What this is

Friday is a personal AI dashboard built for one user (Clément Venot). It is an Iron Man–inspired HUD — a dark interface centred on an animated SVG orb, with data panels that slide in from the right. Friday is an autonomous AI agent (Claude Sonnet 4) with tools she calls proactively without being asked. She addresses the user exclusively as **"sir"**.

This is a **static Next.js app** (no server, no backend, no database). Everything runs in the browser. Data lives in localStorage. The Anthropic API is called directly from the browser using the `anthropic-dangerous-direct-browser-access: true` header.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14.2.3, `output: 'export'` (static) |
| UI | React 18, all inline styles — no CSS framework |
| Fonts | Orbitron (HUD headers), Rajdhani (body), JetBrains Mono (data) |
| AI | Anthropic API direct from browser, claude-sonnet-4-20250514 |
| Maps | Leaflet (loaded via CDN, dynamic import) |
| PWA | manifest.json + network-first service worker |
| Deploy | Netlify manual drag-drop of `out/` folder |
| Storage | localStorage only (keys: fri_rides, fri_goals, fri_projects, fri_transactions, fri_learnings, fri_body, fri_training_plan, fri_memory, friday_api_key, fri_gh_token, fri_gh_user, strava_client_id, strava_client_secret, strava_token, fri_tone) |

---

## File structure

```
friday/
├── pages/
│   ├── index.js        ← ENTIRE app (1600 lines, all components in one file)
│   └── _app.js         ← registers service worker, imports globals.css
├── styles/
│   └── globals.css     ← CSS reset + all @keyframes animations
├── public/
│   ├── manifest.json   ← PWA manifest
│   └── sw.js           ← network-first service worker
├── next.config.js      ← output: 'export', trailingSlash: true
└── CLAUDE.md           ← this file
```

**Important:** Everything is in `pages/index.js`. There are no separate component files. When making changes, edit that one file and run `npm run build` to produce the `out/` folder for deployment.

---

## Architecture: the design token system

All colours are defined in the `C` object at the top of `index.js`:

```js
const C = {
  bg, surface, card, card2,           // backgrounds (darkest to lightest)
  primary,   // #00d4ff — cyan, main accent
  gold,      // #ffb700 — warm accent
  success,   // #00e5a0 — green
  danger,    // #ff3d5a — red
  purple,    // #a78bfa — purple
  teal,      // #2dd4bf — teal (body metrics)
  secondary, // #ff6b35 — orange
  text, muted, dim,                   // text levels
  border, glow,                       // subtle borders/glows
}
```

Never use hex literals in component code. Always reference `C.primary`, `C.muted`, etc.

---

## Architecture: layout

```
[56px icon nav] | [flex-1 orb area] | [400px slide-in panel when active]
                     ↑
              central SVG orb
              + DataBadges floating around it
              + status text below
─────────────────────────────────────────────────────
[fixed bottom chat bar: suggested prompts | input row]
```

- **Nav** (`NAV` array): icon-only strip, clicking toggles the `panel` state
- **Orb area**: the central visual, always visible, orb reacts to `isSpeaking / isLoading / isListening`
- **Panels**: `Panel` wrapper component + individual `*Panel` components per section
- **Chat bar**: fixed to the bottom, expands upward with message history, collapses with ▲/▼

---

## Architecture: data flow

All data state lives in the main `Friday()` component with a **dual ref pattern** to avoid stale closures during async tool-use loops:

```js
const [rides, setRidesS] = useState(INIT.rides)   // React state (drives re-renders)
const rRef = useRef(INIT.rides)                      // mutable ref (used in tool callbacks)

const setRides = v => {
  const n = typeof v === 'function' ? v(rRef.current) : v
  rRef.current = n
  setRidesS(n)
}
```

**Always use `setRides(...)` not `setRidesS(...)`.** The same pattern applies to goals (`gRef`), projects (`pRef`), transactions (`tRef`), learnings (`lRef`), bodyMetrics (`bRef`), trainingPlan (`tpRef`), memFacts (`memRef`).

Data persists via `useEffect` → `localStorage.setItem` for each data type.

---

## Architecture: AI agent loop

The `processMessage(text)` function runs a multi-turn tool-use loop:

1. Add user message to `convRef.current` (the full API conversation history)
2. Call `callClaude(messages)` — includes the `TOOLS` array and Google Calendar MCP server
3. If `stop_reason === 'tool_use'`: execute each tool via `executeTool(name, input)`, show gold action badge in chat, append `tool_result` blocks, call Claude again
4. Loop max 6 times, then take the final text response and call `speak(text)`

The `processMessageRef` is a ref pointing to `processMessage` so that voice callbacks (which are created once) can call the latest version without stale closures.

**callClaude includes Google Calendar MCP:**
```js
mcp_servers: [{ type:'url', url:'https://calendarmcp.googleapis.com/mcp/v1', name:'google-calendar' }]
```

---

## The 9 tools Friday has

| Tool | Trigger |
|---|---|
| `log_ride` | Sir mentions completing a ride |
| `manage_goal` | Create / update_current / update_target / delete |
| `manage_project` | Create or update status |
| `log_transaction` | Sir mentions spending or earning money |
| `update_learning` | Add topic or update progress |
| `log_body_metric` | Sir mentions weight, sleep hours, or HRV |
| `create_training_plan` | Generates 7-day plan array (calls get_analytics first) |
| `remember` | Save any preference/pattern/achievement to localStorage memory |
| `get_analytics` | Computes cycling/goals/finance/body/training_load stats |

---

## Components map

| Component | Purpose |
|---|---|
| `FridayOrb` | Central SVG with rotating rings, scanning arc, waveform bars |
| `DataBadge` | Single floating stat (label + value + unit) orbiting the orb |
| `Panel` | Slide-in wrapper with title bar and close button |
| `CyclingPanel` | Ride list, sparklines, GPX import with Leaflet map |
| `TrainingPanel` | ATL/CTL/TSB gauges, 7-day training plan grid |
| `BodyPanel` | Weight + sleep trend charts, sleep×speed correlation |
| `GoalsPanel` | Goal cards with inline editable current value |
| `ProjectsPanel` | Project cards + GitHub commit heatmap |
| `FinancePanel` | Income/expense/balance + transaction list |
| `CalendarPanel` | Riding day suggestions (Friday uses Google Calendar MCP) |
| `StravaPanel` | Full OAuth flow: credentials → authorise → token exchange → sync |
| `LearningPanel` | Topics with range slider for progress |
| `MemoryPanel` | Shows learnedFacts array from localStorage with delete |
| `GPXMap` | Leaflet map loaded dynamically via CDN script injection |

---

## Voice system

- **`startListening(autoSend=true)`** — Web Speech API (Chrome/Edge only). On `onresult`, calls `processMessageRef.current(transcript)` directly — **auto-sends, no button click needed**. Error messages are specific per error type (`network`, `not-allowed`, `audio-capture`, `no-speech`).
- **`toggleWakeWord()`** — continuous SR, detects "hey friday" / "okay friday" / "hi friday", speaks "Yes, sir?", then starts a second SR instance to capture the actual command and auto-sends it.
- **`speak(text)`** — Web Speech Synthesis, prefers Google UK English Female → Serena → Martha → any en-GB voice. Pitch 1.15, rate 1.05.

---

## Training load algorithm

Exponential weighted average (standard cycling PMC model):
- **CTL** (fitness): 42-day decay = `exp(-1/42)`
- **ATL** (fatigue): 7-day decay = `exp(-1/7)`
- **TSB** (form) = CTL − ATL
- Per-ride TSS estimate: `km × (avgSpeed/22)^1.2`
- Status thresholds: >15 peak, 5–15 primed, −5 to 5 neutral, −20 to −5 building, <−20 fatigued

---

## Strava OAuth flow

Pure browser-based, no backend:
1. User enters Client ID + Secret (stored in localStorage)
2. Click "Authorise" → redirect to `strava.com/oauth/authorize`
3. Strava redirects back with `?code=xxx`
4. On mount, app detects `code` in URL params → exchanges for token via `POST strava.com/oauth/token`
5. Access token stored in localStorage → "Sync Rides" calls `GET strava.com/api/v3/athlete/activities`

---

## Build & deploy

```bash
npm run build     # produces out/ folder
# deploy: drag out/ folder to netlify.com/drop
# or: create new Netlify site and drag-drop
```

The service worker is **network-first** — deployments show up immediately on reload. No need to clear cache.

After changing `pages/index.js`, always rebuild before deploying. Never edit files in `out/` directly.

---

## Known issues & rough edges

1. **Single large file**: `pages/index.js` is ~1600 lines. All components are colocated. This was intentional for simplicity but makes large refactors harder. Consider splitting into `components/` if the file exceeds 2000 lines.
2. **DataBadge positioning**: Badges float around the orb using `position:absolute` with `left:50%, top:50%, transform:translate(-50%,-50%)` on the container. If badges overlap the panel, reduce `orbDist`.
3. **No TypeScript**: All vanilla JS. Props are not typed.
4. **localStorage only**: No cross-device sync. A Supabase backend would fix this.
5. **Google Calendar MCP**: Passed as `mcp_servers` in the API body. Works when the user's Claude.ai account has Google Calendar connected. May silently fail if not connected.
6. **Strava token refresh**: Access tokens expire after 6 hours. Refresh logic is not implemented — user must re-authorise. Add refresh token exchange for production use.
7. **Mobile**: Layout is desktop-first. The chat bar and orb work on mobile but panels are 400px fixed width and may overflow.

---

## Tone & personality

- Friday addresses the user as **"sir"** exclusively — never by name, never "you"
- British, female, dry wit, direct
- Never says "Certainly!", "Great question!", or any sycophantic opener
- Responds under 80 words unless detail is explicitly requested
- Uses tools proactively without being asked
- Tone is configurable via sidebar (direct / balanced / encouraging) — stored in `fri_tone` localStorage key

---

## Suggested next refinements

- Split `index.js` into component files under `components/`
- Add Supabase backend for cross-device data sync
- Strava token auto-refresh using the refresh token
- Proper GitHub Actions CI/CD pipeline to auto-deploy on push
- Mobile-responsive layout (stack panels below orb on small screens)
- HRV trend chart in BodyPanel (currently logs HRV but only shows in the entry list)
- Animated number counters when data updates after a tool call
- Confetti or celebratory orb animation when a goal is achieved
- Nutrition tracking section (Friday logs meals, tracks macros)
- Dark/light mode toggle (currently always dark)
