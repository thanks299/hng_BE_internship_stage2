# Stage 1 Backend API - Data Persistence & API Design

## Overview
This API integrates with three external APIs (Genderize, Agify, Nationalize) to create and manage name-based profiles with data persistence.

## Features
- Create profiles with automatic external API integration
- Idempotent profile creation (duplicate names return existing profile)
- Retrieve single or all profiles with filtering
- Delete profiles
- SQLite database for data persistence
- UUID v7 for unique identifiers
- CORS enabled for all origins

## API Endpoints

### Base URL
`https://your-app-url.com/api`

### Endpoints

#### 1. Create Profile
- **POST** `/profiles`
- **Body:** `{ "name": "ella" }`
- **Response:** 201 Created (or 200 if exists)

#### 2. Get Single Profile
- **GET** `/profiles/{id}`
- **Response:** 200 OK

#### 3. Get All Profiles
- **GET** `/profiles`
- **Query Params:** `gender`, `country_id`, `age_group` (case-insensitive)
- **Response:** 200 OK with count and data

#### 4. Delete Profile
- **DELETE** `/profiles/{id}`
- **Response:** 204 No Content

## Setup Instructions

### Local Development
```bash
# Clone repository
git clone <your-repo-url>
cd stage1

# Install dependencies
npm install

# Run development server
npm run dev

# Run production server
npm start