# Maayan Recipes - Full Stack Recipe Management Application

A personal recipe management website built for Hebrew-speaking users with full CRUD operations, built using React + TypeScript frontend and Express.js + PostgreSQL backend.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database access
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd maayan_recipes
npm install
```

2. **Start both servers concurrently:**
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## 🏗️ Architecture

### Frontend (Port 5173)
- **React 18.3.1** + **TypeScript 5.5.3**
- **Vite 7.1.2** for build tooling
- **Tailwind CSS 3.4.1** for styling
- **React Router DOM 7.7.0** for routing
- **Context API** for state management

### Backend (Port 3001)
- **Express.js** REST API server
- **PostgreSQL** database connection
- **CORS** enabled for frontend communication
- **Automatic table creation** and schema management

### Database
- **PostgreSQL** hosted at `34.132.167.99:5432`
- **Database**: `recipes`
- **User**: `postgres`
- **Automatic table creation** with triggers and indexes

## 📁 Project Structure

```
maayan_recipes/
├── src/                    # Frontend React source
│   ├── components/        # React components
│   ├── pages/            # Page components
│   ├── services/         # API service layer
│   ├── contexts/         # React contexts
│   └── types/            # TypeScript type definitions
├── server/               # Backend Express server
│   ├── server.js         # Main server file
│   └── package.json      # Server dependencies
├── supabase/             # Database migrations
├── package.json          # Root package.json
└── vite.config.ts        # Vite configuration
```

## 🔧 Configuration

### Environment Variables
The application uses the following PostgreSQL connection string:
```
postgres://postgres:MaayanRecipes2025@34.132.167.99:5432/recipes
```

### Database Schema
The `recipes` table is automatically created with the following structure:
- `id`: UUID primary key
- `title`: Recipe title (required)
- `description`: Recipe description
- `category`: Recipe category (required)
- `ingredients`: JSONB array of ingredients (required)
- `directions`: JSONB array of cooking steps (required)
- `additional_instructions`: JSONB object for extra notes
- `prep_time`: Preparation time
- `difficulty`: Difficulty level (קל/בינוני/קשה)
- `is_favorite`: Boolean favorite status
- `images`: JSONB array of image URLs
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp (auto-updated)

## 🚀 Available Scripts

### Root Package.json
- `npm run dev` - Start both frontend and backend concurrently
- `npm run dev:frontend` - Start only frontend (Vite dev server)
- `npm run dev:backend` - Start only backend (Express server)
- `npm run build` - Build frontend for production
- `npm run start` - Start production backend server

### Server Package.json
- `npm start` - Start the Express server
- `npm run dev` - Start the Express server in development mode

## 🌐 API Endpoints

### Connection Testing
- `GET /api/test-connection` - Test PostgreSQL connection

### Recipe Management
- `GET /api/recipes` - Get all recipes
- `GET /api/recipes/:id` - Get recipe by ID
- `POST /api/recipes` - Create new recipe
- `PUT /api/recipes/:id` - Update recipe
- `DELETE /api/recipes/:id` - Delete recipe

### Health Check
- `GET /api/health` - Server health status

## 🔄 Frontend-Backend Communication

The frontend communicates with the backend through:
1. **Vite Proxy**: API calls to `/api/*` are proxied to `http://localhost:3001`
2. **Fallback System**: If backend is unavailable, frontend falls back to localStorage
3. **Automatic Sync**: When backend becomes available, data is automatically synced

## 🛡️ Error Handling & Fallbacks

### Connection Failures
- **API Timeouts**: 5-15 second timeouts prevent hanging requests
- **Graceful Degradation**: Falls back to localStorage when API is unavailable
- **Automatic Recovery**: Resumes API communication when connection is restored

### Data Persistence
- **LocalStorage Backup**: All data is backed up locally
- **Cache Management**: Intelligent caching with automatic invalidation
- **Conflict Resolution**: Handles data conflicts between local and remote storage

## 🎨 Features

### Recipe Management
- ✅ Create, Read, Update, Delete recipes
- ✅ Multiple view modes (large, medium, list)
- ✅ Advanced filtering and search
- ✅ Category organization
- ✅ Favorite recipes
- ✅ Image management with compression

### User Experience
- ✅ **RTL Hebrew Support** - Full right-to-left layout
- ✅ **Mobile-First Design** - Touch-friendly interface
- ✅ **Offline Capability** - Works without internet
- ✅ **Cooking Timer** - Global timer with notifications
- ✅ **Responsive Design** - Works on all screen sizes

### Technical Features
- ✅ **TypeScript** - Full type safety
- ✅ **Error Boundaries** - Comprehensive error handling
- ✅ **Performance Optimization** - React.memo, useCallback
- ✅ **Accessibility** - Semantic HTML, keyboard navigation

## 🚨 Troubleshooting

### Common Issues

1. **Backend won't start:**
   - Check if port 3001 is available
   - Verify PostgreSQL connection string
   - Check server logs for database connection errors

2. **Frontend can't connect to backend:**
   - Ensure backend is running on port 3001
   - Check Vite proxy configuration
   - Verify CORS settings

3. **Database connection issues:**
   - Verify PostgreSQL server is accessible
   - Check firewall settings for port 5432
   - Verify database credentials

### Debug Mode
Enable detailed logging by checking browser console and server logs. The application provides comprehensive logging for all operations.

## 🔒 Security Notes

- Database credentials are hardcoded for development
- CORS is enabled for local development
- Consider environment variables for production deployment
- Input validation is implemented on both frontend and backend

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome!

## 📄 License

Personal project - All rights reserved.
