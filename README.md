# Peer-to-Peer Skill Swap Web Application

A mini project with:
- **Backend:** Node.js, Express, MongoDB, Mongoose, JWT auth
- **Frontend:** React (CRA), Axios, basic hooks

## Features
- User register/login with JWT
- Profile view/update
- Skill-based user search
- Skill swap request flow (send, accept, reject)
- Chat/messaging (only for accepted requests)
- Ratings & reviews (after completed session)
- User reporting
- Notifications for requests/messages
- Admin dashboard APIs (users + reports)

## Project Structure
- `backend/` Express API + MongoDB models
- `frontend/` React app

## Prerequisites
- Node.js (LTS recommended)
- npm
- MongoDB (local or cloud URI)

## Backend Setup
1. Go to backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` in `backend/`:
   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/skill-swap
   JWT_SECRET=your_super_secret_key_here
   JWT_EXPIRES_IN=7d
   PORT=5000
   CLIENT_URL=http://localhost:3000
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-gmail@gmail.com
   SMTP_PASS=your-16-digit-app-password
   EMAIL_FROM=your-gmail@gmail.com
   EMAIL_MODE=smtp
   ```
4. Start backend:
   ```bash
   node server.js
   ```

## Frontend Setup
1. Go to frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. (Optional) Create `.env` in `frontend/`:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```
4. Start frontend:
   ```bash
   npm start
   ```

## API Base URL
- `http://localhost:5000/api`

## Main API Endpoints

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `PUT /auth/reset-password/:token`
- `GET /auth/profile` (protected)
- `PUT /auth/profile` (protected)

### Users
- `GET /users/search?keyword=...`

### Skill Swap Requests
- `POST /swap-requests` (protected)
- `PATCH /swap-requests/:id/accept` (protected)
- `PATCH /swap-requests/:id/reject` (protected)

### Messages
- `POST /messages` (protected)
- `GET /messages/:swapRequestId` (protected)

### Reviews
- `POST /reviews` (protected)
- `GET /reviews/user/:userId`

### Reports
- `POST /reports/user` (protected)

### Notifications
- `GET /notifications` (protected)
- `PATCH /notifications/:id/read` (protected)
- `PATCH /notifications/read-all` (protected)

### Admin
- `GET /admin/users` (admin)
- `PATCH /admin/users/:userId/block` (admin)
- `PATCH /admin/users/:userId/unblock` (admin)
- `GET /admin/reports` (admin)
- `PATCH /admin/reports/:reportId/action` (admin)

## Frontend Pages
- Login
- Register
- Forgot Password
- Reset Password (from email link)
- Profile
- Skill Search
- Requests
- Chat
- Admin Dashboard

## Notes
- Backend requires `MONGO_URI` and `JWT_SECRET`; app exits if missing.
- Protected routes require header:
  - `Authorization: Bearer <token>`
- To test admin APIs, set a user role to `admin` in DB.
- Forgot/reset emails use SMTP config.
- Brevo example:
  - `SMTP_HOST=smtp-relay.brevo.com`
  - `SMTP_PORT=587`
  - `SMTP_SECURE=false`
  - `SMTP_USER=<brevo smtp login>`
  - `SMTP_PASS=<brevo smtp key>`
  - `EMAIL_FROM=<verified sender in Brevo>`
- SendGrid example:
  - `SMTP_HOST=smtp.sendgrid.net`
  - `SMTP_PORT=587`
  - `SMTP_SECURE=false`
  - `SMTP_USER=apikey`
  - `SMTP_PASS=<sendgrid api key>`
  - `EMAIL_FROM=<verified sender in SendGrid>`
