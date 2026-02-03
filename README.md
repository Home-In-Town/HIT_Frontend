# Dynamic Sales Website - Frontend

Next.js frontend for the Dynamic Sales Website & Trackable Link Generation system.

## Features

- **Admin Dashboard** - Create, edit, publish, and manage real estate projects
- **Public Sales Pages** - Dynamic, responsive project pages with premium UI
- **Multi-CTA Support** - Call, WhatsApp, and Enquiry Form buttons
- **Lead Capture Form** - Modal form collecting name, phone, and requirements
- **Analytics Dashboard** - Track visits, time spent, and CTA interactions
- **Trackable Links** - Generate shareable links with source/lead attribution

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Environment Variables

Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

---

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/dashboard` | Projects list with analytics |
| `/dashboard/projects/new` | Create new project |
| `/dashboard/projects/:id/edit` | Edit existing project |
| `/visit/:slug` | Public sales page |

---

## Public Sales Page

The visitor-facing project page (`/visit/:slug`) includes:

- **Hero Section** - Cover image with project highlights
- **Gallery** - Image gallery with lightbox
- **About** - Project specifications
- **Amenities** - Visual amenities grid
- **Pricing** - Price details and payment plans
- **Location** - Google Maps integration
- **CTA Section** - Three contact options:
  - 📞 **Call** - Direct phone call
  - 💬 **WhatsApp** - Pre-filled message
  - 📋 **Enquiry Form** - Lead capture modal

---

## Trackable Links

```
/visit/project-name?source=whatsapp&leadId=XYZ123
```

Query params are optional and used for analytics attribution.

---

## Tracking Integration

The frontend automatically handles analytics tracking via the `useTracking` hook:

- **Page Views**: Triggered on page load
- **Time Spent**: Updates every 30s and on page unload
- **CTA Clicks**: Tracks usage of contact options
  - `call`: Phone button clicks
  - `whatsapp`: WhatsApp button clicks
  - `form`: Enquiry form submissions (sends `ctaType: 'form'`)

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
