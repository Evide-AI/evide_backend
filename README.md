# Evide Backend

Backend system for GPS tracking with Express API server and TCP server for device communication


### Prerequisites
- Docker and Docker Compose

### Setup
- git clone evide_backend
- cd evide_backend
- set up the .env file (See template below)

# Server Configuration
NODE_ENV=
API_PORT=
TCP_PORT=

# Database Configuration
DB_EXTERNAL_PORT=5432 # Change this if port 5432 is already in use
DB_NAME=
DB_USER=
DB_PASSWORD=

#Note: DB_HOST is fixed to 'postgres' (Docker service name)

-npm run docker:up

### 🔷 API
**Responsibility:** Bus management CRUD operations and user authentication

**Work Area:** `/api/` directory
- `api/routes/` - Define API endpoints
- `api/controllers/` - Business logic implementation  
- `api/middlewares/` - Custom middleware functions
- `api/models/` - Database models (will be created)

### 🔷 TCP
**Responsibility:** GPS device communication and data parsing

**Work Area:** `/tcp/` directory
- `tcp/server.js` - TCP server implementation
- `tcp/handlers/` - Device protocol handlers (to be created)
- `tcp/models/` - GPS data models (to be created)

### 🔷 Shared Resources
- `config/db.js` - Database configuration (already setup)
- `.env` - Environment configuration


