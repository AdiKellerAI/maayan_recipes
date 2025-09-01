## 🚀 Run Locally

### Option 1: Quick Start (Recommended)
1. **Open [Cursor](https://cursor.sh/)**
2. **Run the startup script:**
   ```bash
   ./start-dev.sh
   ```
   This script will:
   - Check dependencies and install if needed
   - Test PostgreSQL connection
   - Start both frontend and backend servers
   - Handle port conflicts automatically

### Option 2: Manual Start
1. **Open the terminal** in Cursor and run:
   ```bash
   npm run dev
   ```
2. **Open your browser** and navigate to:
   http://localhost:5173/

✅ You should now see the app running locally!

### 🔍 Troubleshooting Database Connection

If you see "לא מחובר למאגר המידע" (Not connected to database):

1. **Check if backend server is running:**
   - Backend should be available at `http://localhost:3001`
   - Frontend is at `http://localhost:5173`

2. **Use the Database Status Widget:**
   - Press `Ctrl+Shift+D` to toggle the database status widget
   - It shows real-time connection status and detailed error information
   - Click 🔄 to reconnect or 🧹 to clear cache and refresh

3. **Common Issues:**
   - **Backend server not running:** The widget will show "השרת לא פועל" 
   - **Database connection failed:** Shows PostgreSQL connection errors
   - **Network issues:** Check internet connection for database access

4. **Fallback Mode:**
   - The app works offline using localStorage when database is unavailable
   - All recipes are saved locally and will sync when connection is restored

## ✨ Smart Image Search Feature

The app includes a **robust Smart Image Search** feature that automatically finds relevant food images for your recipes using multiple reliable APIs with comprehensive fallback mechanisms.

### 🔧 How It Works
1. **Primary Method**: Unsplash API - High-quality food images with proper attribution
2. **Fallback 1**: Source Unsplash - No API key required, direct image URLs
3. **Fallback 2**: TheMealDB - Recipe-specific images from meal database
4. **Final Fallback**: Curated food images from Lorem Picsum

### 🎯 Smart Search Logic
- **Recipe Name**: Uses `recipeName + "food recipe cooking"` keywords
- **Ingredients Only**: Uses `top 3 ingredients + "food dish cooking"` 
- **Optimization**: Landscape orientation, food-related content prioritization
- **Error Handling**: Comprehensive try-catch blocks with graceful degradation

### ⚙️ Setup (Optional)
For production use with higher rate limits:
1. Get free API key from [Unsplash Developers](https://unsplash.com/developers)
2. Add to your `.env` file:
   ```env
   VITE_UNSPLASH_ACCESS_KEY=your_access_key_here
   ```
3. The feature works without API key using fallback methods

### 🎨 UI Features
- ✨ Sparkle icon for visual appeal
- 🖼️ 4-image grid layout with hover effects
- 📱 Mobile-optimized touch interactions
- 🔄 One-click refresh for different images
- ⚡ Fast loading with progressive fallbacks


## 🚀 Publish to Production

1. **Commit everything to `dev` branch**
    ```
    git add .
    git commit -m "update last features"
    git push origin dev
    ```

2. **Merge with `main` branch**
    ```
    git checkout main
    git merge dev
    git add .
    git commit -m "get all dev new commits into main"
    git push origin main
    ```

3. **Deploy to production**
    ```
    vercel --prod
    git checkout dev
    ```

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

