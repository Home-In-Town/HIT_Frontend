# HomeInTown Frontend

Next.js frontend for the HomeInTown real estate platform. Deployed on Vercel.

**Live:** `https://www.homeintown.in`  
**Repo:** `Home-In-Town/HIT_Frontend` (auto-deploys on push to `main`)

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Real-time:** Socket.io-client
- **Animation:** Framer Motion

---

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`

Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

---

## Features

- **Project Management** — create, edit, publish real estate projects with media uploads
- **Public Sales Pages** — `/visit/:slug` — dynamic project pages with gallery, pricing, maps
- **Analytics Dashboard** — track visits, time spent, CTA clicks per project
- **CRM Pipeline** — lead management for builders/agents
- **Chat** — real-time Socket.io chat with sessions, typing indicators, read receipts
- **Employee Tracking** — GPS location tracking for field employees
- **Marketplace** — property listings marketplace
- **Multi-CTA** — Call, WhatsApp, and Enquiry Form on project pages

---

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/dashboard` | Projects list + analytics |
| `/dashboard/projects/new` | Create project |
| `/dashboard/projects/:id/edit` | Edit project |
| `/dashboard/chat` | Real-time chat |
| `/dashboard/analytics` | Analytics overview |
| `/visit/:slug` | Public project sales page |

---

## Media Upload Flow

Projects use a 3-step upload flow:
1. `POST /api/projects` — create project record, get MongoDB ID
2. `POST /api/files/proxy-upload` × N — upload each file to Cloudflare R2, saved to DB via `$push`
3. `PUT /api/projects/:id` — sync text metadata + link media

Key file: `src/lib/api.ts` → `transformFrontendToBackend()` — maps frontend form state to backend schema. Do NOT send empty media arrays — that would overwrite media saved in step 2.

---

## User Roles

`admin` | `builder` | `agent` | `employee` | `user`

Auth: Phone + MPIN, OTP via MSG91 SMS (DLT registration pending — see SESSION_CONTEXT).
