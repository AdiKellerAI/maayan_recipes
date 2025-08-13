## 🚀 Run Locally

1. **Open [Cursor](https://cursor.sh/)**
2. **Open the terminal** in Cursor and run:
npm run dev
3. **Open your browser** and navigate to:
http://localhost:5173/

✅ You should now see the app running locally!


## 🚀 Publish to production
1. **Commit everything to dev branch**
git add .
git commit -m 'update last features'
git push origin dev
2. **Merge with main branch**
git checkout main
git merge dev
3. **Deploy to production**
   vercel --prod

---
---


## Context Prompt

### Project Overview
This is a personal **recipe management website** built for my wife — designed as a dynamic **full-stack application** with complete **CRUD** operations.  
Originally created using **Bolt.new** and later developed locally with **Cursor**.

## Technology Stack

**Frontend**
- React `18.3.1` + TypeScript `5.5.3` + Vite `7.1.2`
- Tailwind CSS `3.4.1` — custom Base44-inspired color palette
- React Router DOM `7.7.0`

**Backend**
- Node.js + Express.js API server  
- PostgreSQL (direct connection via `pg`, not Supabase)

**Tooling**
- ESLint `9.9.1`
- Vite (TypeScript compilation)

## Architecture & Structure

**Frontend**
- Component-based React with **Context API** for state management
- Global state via `RecipeContext`

**Backend**
- RESTful Express.js server  
- Direct PostgreSQL connection  
- LocalStorage fallback when database is unavailable

**General**
- Comprehensive **error boundaries** & fallback mechanisms  
- Mobile-first, **RTL Hebrew** support

## Key Features
- **Recipe Management:** Create, Read, Update & Delete recipes
- **Multi-view Modes:** Large, medium, and list views
- **Advanced Filtering:**  
  - By category, difficulty, favorites, recent  
  - Image presence & flour content
- **Search:** Real-time search across titles & content
- **Cooking Timer:** Global timer with sound & floating display
- **Image Management:** Multiple images with compression
- **Category System:** 10 predefined Hebrew categories
- **Responsive Design:** Mobile-first, touch-friendly, RTL support
- **Offline Capability:** Works with LocalStorage when offline

## Key Implementation Details
- **RTL & Hebrew:** Full `dir="rtl"` layout support
- **Image Compression:** Client-side before uploads
- **Caching Strategy:** LocalStorage fallback if DB is down
- **Progressive Enhancement:** Offline-ready with DB sync
- **Mobile Optimization:** Touch-friendly UI
- **Audio Integration:** Web Audio API for timer notifications

## Development Notes
- **DB Fallback:** Graceful degradation to localStorage
- **Error Handling:** Extensive error boundaries  
- **Performance:** `React.memo`, `useCallback`, optimal renders
- **Accessibility:** Semantic HTML, keyboard nav
- **Debugging:** Console logs for DB/API troubleshooting

**Summary:**  
This project is a production-ready **recipe management system** with a robust full-stack architecture, advanced error handling, and a user experience tailored for **Hebrew-speaking users**.

