# Architecture

## Overview
The EduPulse Project consists of a React SPA (Single-Page Application) and a Python REST API (FastAPI) backend and utilizes a locally hosted PostgreSQL database for storage.

EduPulse is an interactive scenario-based video learning platform that enables instructors to create engaging video lessons with dialogue, breakpoints, branching scenarios, and character voices. The system generates videos by combining images with AI-synthesized speech and processes them using FFmpeg.

---

## Table of Contents

<!-- TOC -->
* [Architecture](#architecture)
  * [Overview](#overview)
  * [Table of Contents](#table-of-contents)
  * [System Architecture](#system-architecture)
    * [High-Level Architecture](#high-level-architecture)
    * [Technology Stack](#technology-stack)
    * [Deployment Architecture](#deployment-architecture)
  * [Component Architecture](#component-architecture)
    * [Frontend (Next.js)](#frontend-nextjs)
    * [Backend (FastAPI)](#backend-fastapi)
    * [Database (PostgreSQL)](#database-postgresql)
  * [Data Flow](#data-flow)
    * [Lesson Creation Flow](#lesson-creation-flow)
    * [Video Generation Flow](#video-generation-flow)
    * [Authentication Flow](#authentication-flow)
  * [API Architecture](#api-architecture)
    * [REST API Endpoints](#rest-api-endpoints)
    * [OpenAPI Schema](#openapi-schema)
    * [Type Safety](#type-safety)
  * [External Services Integration](#external-services-integration)
    * [AI Services](#ai-services)
    * [Email Service](#email-service)
  * [Data Models](#data-models)
    * [Core Entities](#core-entities)
    * [Relationships](#relationships)
  * [Security Architecture](#security-architecture)
    * [Authentication](#authentication)
    * [Authorization](#authorization)
    * [Data Protection](#data-protection)
  * [Performance Considerations](#performance-considerations)
    * [Video Processing](#video-processing)
    * [Database Optimization](#database-optimization)
    * [Frontend Optimization](#frontend-optimization)
  * [Scalability & Future Improvements](#scalability--future-improvements)
<!-- TOC -->

---

## System Architecture

### High-Level Architecture

```
┌─────────────────┐
│   Next.js       │
│   Frontend      │◄──────┐
│   (Port 3000)   │       │
└────────┬────────┘       │
         │ HTTP/REST      │
         │                │
         ▼                │
┌─────────────────┐       │
│   FastAPI       │       │
│   Backend       │       │
│   (Port 8000)   │       │
└────────┬────────┘       │
         │                │
    ┌────┴────┐           │
    │         │           │
    ▼         ▼           │
┌────────┐ ┌──────────┐  │
│Postgres│ │  FFmpeg  │  │
│   DB   │ │ Processing│ │
└────────┘ └──────────┘  │
                          │
         ┌────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────┐
│OpenAI  │ │ Hume.ai │
│(Script)│ │  (TTS)  │
└────────┘ └──────────┘
```

### Technology Stack

#### Frontend
- **Framework**: Next.js (React-based)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui
- **API Client**: OpenAPI-fetch (auto-generated from OpenAPI schema)
- **State Management**: React hooks and context
- **Build Tool**: Next.js built-in bundler

#### Backend
- **Framework**: FastAPI (Python)
- **Language**: Python 3.10+
- **Database ORM**: SQLAlchemy (async)
- **Database Migrations**: Alembic
- **Video Processing**: FFmpeg
- **Dependency Management**: UV
- **Authentication**: fastapi-users
- **API Documentation**: OpenAPI/Swagger

#### Database
- **Type**: PostgreSQL 17
- **Connection**: asyncpg (async PostgreSQL driver)

#### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Deployment**: Vercel (frontend & backend serverless)
- **File Storage**: Local filesystem (future: AWS S3)

### Deployment Architecture

The application is containerized using Docker Compose with the following services:

1. **Frontend Container** (`nextjs-frontend`)
   - Serves the Next.js application
   - Production build mode
   - Connected to backend via internal network

2. **Backend Container** (`fastapi_backend`)
   - Runs FastAPI application
   - Handles API requests and video processing
   - Connected to database and frontend

3. **Database Container** (`db`)
   - PostgreSQL 17 instance
   - Persistent data storage via volumes
   - Health checks enabled

4. **Test Database Container** (`db_test`)
   - Separate PostgreSQL instance for testing
   - Isolated from production data

**Network**: All services communicate via a Docker bridge network (`my_network`)

**Volumes**:
- `postgres_data`: Persistent database storage
- `nextjs-node-modules`: Cached node modules
- `fastapi-venv`: Cached Python virtual environment
- `local-shared-data`: Shared OpenAPI schema between frontend and backend

---

## Component Architecture

### Frontend (Next.js)

#### Directory Structure
```
nextjs-frontend/
├── app/                    # Next.js App Router
│   ├── dashboard/          # Dashboard pages
│   ├── login/              # Authentication pages
│   ├── watch-lesson/       # Student lesson viewing
│   ├── openapi-client/     # Auto-generated API client
│   └── layout.tsx          # Root layout
├── components/             # Reusable React components
│   ├── ui/                 # shadcn/ui components
│   ├── modals/             # Modal components
│   └── actions/            # Action components
├── lib/                    # Utility libraries
│   ├── auth-utils.ts       # Authentication helpers
│   ├── clientConfig.ts     # API client configuration
│   └── script-editor.ts    # Script editing utilities
└── middleware.ts           # Next.js middleware (auth)
```

#### Key Features
- **Server-Side Rendering (SSR)**: Initial page loads
- **Client-Side Navigation**: Fast transitions between pages
- **Type-Safe API Calls**: Auto-generated TypeScript client from OpenAPI schema
- **Authentication**: JWT token management and protected routes
- **Real-time Updates**: Hot-reload during development

### Backend (FastAPI)

#### Directory Structure
```
fastapi_backend/
├── app/
│   ├── main.py             # FastAPI application entry point
│   ├── config.py           # Configuration settings
│   ├── database.py         # Database connection & session management
│   ├── models.py           # SQLAlchemy database models
│   ├── schemas.py          # Pydantic schemas for API
│   ├── users.py            # User authentication setup
│   ├── routes/             # API route handlers
│   │   ├── lesson.py       # Lesson CRUD operations
│   │   ├── videos.py       # Video upload & generation
│   │   ├── tts.py          # Text-to-speech synthesis
│   │   ├── ttimage.py      # Image generation
│   │   └── generate_script.py  # Script generation
│   ├── scenario/           # Scenario generation logic
│   └── ffmpeg_cmds.py      # FFmpeg video processing
├── alembic_migrations/     # Database migration scripts
└── tests/                  # Test suite
```

#### Key Features
- **Async/Await**: Fully asynchronous request handling
- **Dependency Injection**: FastAPI's dependency system for database sessions, auth
- **OpenAPI Generation**: Automatic API documentation
- **Type Validation**: Pydantic models for request/response validation
- **CORS Middleware**: Configured for frontend communication

### Database (PostgreSQL)

#### Key Characteristics
- **ACID Compliance**: Transactional integrity
- **JSONB Support**: Flexible storage for lesson scripts and metadata
- **UUID Primary Keys**: Distributed ID generation
- **Async Queries**: Non-blocking database operations
- **Migrations**: Version-controlled schema changes via Alembic

---

## Data Flow

### Lesson Creation Flow

```
User Input (Script/File)
    │
    ▼
Frontend: Script Editor
    │
    ▼
POST /generate_script (OpenAI)
    │
    ▼
Backend: Generate Script
    │
    ▼
Frontend: Edit Script & Add Segments
    │
    ▼
POST /lessons (Create Lesson)
    │
    ▼
Backend: Save to Database
    │
    ▼
Frontend: Configure Voices
    │
    ▼
POST /tts (Hume.ai) → Generate Audio
    │
    ▼
POST /videos/generate (FFmpeg) → Generate Video
    │
    ▼
Backend: Save Video & Link to Lesson
    │
    ▼
Frontend: Preview & Save
```

### Video Generation Flow

```
Lesson Script (JSON)
    │
    ▼
For each segment:
    │
    ├─→ POST /ttimage → Generate Image
    │
    ├─→ POST /tts → Generate Audio (Hume.ai)
    │
    └─→ FFmpeg: Combine Image + Audio
    │
    ▼
Concatenate all segments
    │
    ▼
Add breakpoints & overlays
    │
    ▼
Final Video File
    │
    ▼
Save to filesystem & database
```

### Authentication Flow

```
User Registration/Login
    │
    ▼
POST /auth/jwt/login
    │
    ▼
Backend: Validate Credentials
    │
    ▼
Generate JWT Token
    │
    ▼
Frontend: Store Token
    │
    ▼
Include Token in API Requests (Authorization Header)
    │
    ▼
Backend: Validate Token → current_active_user dependency
```

---

## API Architecture

### REST API Endpoints

#### Authentication (`/auth`)
- `POST /auth/jwt/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/forgot-password` - Password reset request
- `POST /auth/reset-password` - Password reset confirmation
- `GET /auth/verify` - Email verification

#### Users (`/users`)
- `GET /users/me` - Get current user
- `PATCH /users/me` - Update current user

#### Lessons (`/lessons`)
- `GET /lessons` - List lessons (paginated)
- `POST /lessons` - Create lesson
- `GET /lessons/{id}` - Get lesson details
- `PATCH /lessons/{id}` - Update lesson
- `DELETE /lessons/{id}` - Delete lesson

#### Videos (`/videos`)
- `GET /videos` - List videos (paginated)
- `POST /videos/upload` - Upload video file
- `POST /videos/generate` - Generate video from script
- `GET /videos/{id}` - Get video details
- `GET /videos/{id}/stream` - Stream video file

#### Text-to-Speech (`/tts`)
- `POST /tts` - Synthesize speech (Hume.ai)

#### Image Generation (`/ttimage`)
- `POST /ttimage` - Generate image

#### Script Generation (`/generate_script`)
- `POST /generate_script` - Generate lesson script (OpenAI)

### OpenAPI Schema

- **Location**: `/openapi.json` (generated automatically)
- **Documentation**: Available at `/docs` or `/api/docs`
- **Schema Sharing**: Shared between frontend and backend via `local-shared-data/`
- **Auto-Generation**: Frontend TypeScript client generated from schema

### Type Safety

- **Backend**: Pydantic models ensure request/response validation
- **Frontend**: TypeScript types auto-generated from OpenAPI schema
- **End-to-End**: Type-safe API calls with compile-time checking

---

## External Services Integration

### AI Services

#### OpenAI
- **Purpose**: Script generation from user input
- **Endpoint**: `/generate_script`
- **Usage**: Converts user prompts or uploaded files into structured lesson scripts
- **Response Format**: JSON script with segments, dialogue, and metadata

#### Hume.ai
- **Purpose**: Text-to-speech synthesis
- **Endpoint**: `/tts`
- **Usage**: Converts text dialogue into natural-sounding speech
- **Features**: Character voice customization, emotion control
- **Output**: Audio files (format: determined by Hume API)

### Email Service

- **Purpose**: Password reset and email verification
- **Configuration**: SMTP settings in `config.py`
- **Templates**: HTML email templates in `email_templates/`
- **Features**: 
  - Password reset emails
  - Email verification
  - Customizable from address and branding

---

## Data Models

### Core Entities

#### User
- **Primary Key**: `id` (UUID)
- **Fields**: 
  - `email` (unique)
  - `hashed_password`
  - `is_active`, `is_verified`, `is_superuser`
  - `created_at`, `updated_at`
- **Relationships**: One-to-many with `Lesson`

#### Lesson
- **Primary Key**: `id` (UUID)
- **Fields**:
  - `title` (string)
  - `script` (JSONB) - Structured lesson content
  - `created_at` (datetime)
  - `user_id` (UUID, foreign key)
- **Relationships**: 
  - Many-to-one with `User`
  - Many-to-many with `Video` (via `LessonVideo`)

#### Video
- **Primary Key**: `id` (UUID)
- **Fields**:
  - `title` (string)
  - `description` (optional string)
  - `filename` (string)
  - `file_path` (string) - Filesystem path
  - `file_size` (integer)
  - `created_at` (datetime)
- **Relationships**: Many-to-many with `Lesson` (via `LessonVideo`)

#### LessonVideo (Join Table)
- **Primary Key**: Composite (`lesson_id`, `video_id`)
- **Fields**: Links lessons to videos
- **Purpose**: Allows videos to be reused across multiple lessons

### Relationships

```
User
  │
  │ (1:N)
  ▼
Lesson ──┐
         │
         │ (N:M via LessonVideo)
         │
         ▼
      Video
```

---

## Security Architecture

### Authentication

- **Method**: JWT (JSON Web Tokens)
- **Library**: fastapi-users
- **Token Storage**: HTTP-only cookies or Authorization header
- **Token Expiration**: Configurable (default: 3600 seconds)
- **Algorithm**: HS256 (HMAC-SHA256)
- **Secret Keys**: Environment variables (`ACCESS_SECRET_KEY`)

### Authorization

- **User Roles**: 
  - Regular users: Can create/manage their own lessons
  - Superusers: Admin access (if implemented)
- **Resource Ownership**: Users can only access their own lessons
- **Dependency Injection**: `current_active_user` dependency enforces authentication

### Data Protection

- **Password Hashing**: bcrypt (via fastapi-users)
- **CORS Configuration**: Restricted origins (configurable)
- **Input Validation**: Pydantic models validate all API inputs
- **SQL Injection Prevention**: SQLAlchemy ORM with parameterized queries
- **File Upload Limits**: Maximum file size validation (500MB default)

---

## Performance Considerations

### Video Processing

- **Current Limitation**: FFmpeg processing is synchronous and resource-intensive
- **Impact**: Blocks other requests during video generation
- **Future Improvements**:
  - Parallelize FFmpeg operations
  - Move to background job queue (Celery, RQ)
  - Use AWS Lambda for video processing
  - Incremental updates (only re-render changed segments)

### Database Optimization

- **Async Queries**: Non-blocking database operations
- **Connection Pooling**: Managed by SQLAlchemy
- **Indexing**: Primary keys and foreign keys are indexed
- **Future Improvements**:
  - Add indexes on frequently queried fields
  - Move large binary data (images) to blob storage (S3)
  - Implement database query caching

### Frontend Optimization

- **Code Splitting**: Next.js automatic code splitting
- **Static Assets**: Optimized image loading
- **API Client Caching**: OpenAPI-fetch caching strategies
- **Future Improvements**:
  - Implement service worker for offline support
  - Add request debouncing for search
  - Optimize bundle size

---

## Scalability & Future Improvements

### Current Limitations

1. **Video Storage**: Local filesystem (not scalable, risk of data loss)
2. **Video Processing**: Synchronous, blocks other operations
3. **Image Storage**: Stored in PostgreSQL (slow writes, database bloat)
4. **Single Server**: No horizontal scaling capability

### Recommended Improvements

#### Infrastructure
- **Cloud Storage**: Migrate videos and images to AWS S3
- **CDN**: Use CloudFront or similar for video delivery
- **Load Balancing**: Multiple backend instances behind load balancer
- **Database Replication**: Read replicas for scaling reads

#### Processing
- **Job Queue**: Implement Celery or AWS SQS for async video processing
- **Worker Pool**: Separate workers for video processing
- **Incremental Updates**: Only re-render changed video segments
- **Caching**: Redis for frequently accessed data

#### Monitoring & Observability
- **Logging**: Structured logging (e.g., ELK stack)
- **Metrics**: Application performance monitoring (APM)
- **Error Tracking**: Sentry or similar
- **Health Checks**: Endpoint monitoring

#### Development
- **CI/CD Pipeline**: Automated testing and deployment
- **Test Coverage**: Increase test coverage (currently limited)
- **Documentation**: API documentation improvements
- **Development/Production Split**: Separate pipelines for dev and prod

---

## Additional Notes

- **Development Mode**: See `dev_patches/devMode.patch` for development configuration
- **Database Migrations**: Run via Alembic (`alembic upgrade head`)
- **OpenAPI Schema**: Regenerated automatically, shared via `local-shared-data/`
- **Environment Variables**: Configured via `.env` files (not in version control)

---
