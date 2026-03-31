---
name: Calgary Oaths project context
description: Key facts about the calgaryoaths.com rebuild project
type: project
---

This is a Next.js 14 (App Router) rebuild of calgaryoaths.com deployed on Netlify.

**Logo URL:** https://ogxklbdjffbhtlabwonl.supabase.co/storage/v1/object/public/assets/Cethos%20Logo%20Blue%20-%20High%20Res.png

**Why:** Logo is hosted on Supabase storage. The domain is already in `next.config.js` remotePatterns so next/image can use it.

**How to apply:** Replace the SVG seal placeholder in Navbar and Footer with `<Image>` using this URL when adding the real logo.

**Stack:** Next.js 14.2.x, React 18, Tailwind CSS 3.4, Framer Motion 11, Resend (forms), Netlify deploy.

**Phases completed:** All 8 phases — scaffold, layout, homepage, service pages, location pages, info pages, forms/blog, SEO. Build is clean at 31 static pages.
