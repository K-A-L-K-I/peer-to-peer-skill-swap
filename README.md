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
- Git

---

## 🚀 How to Run After Pulling (For Team Members)

If you just cloned or pulled this repository from GitHub, follow these exact steps to get the app running on your machine:

### 1. Start MongoDB
Ensure your local MongoDB service is running (if using a local database).
- On Windows: Open Services and start `MongoDB Server`
- On Linux/Mac: `sudo systemctl start mongod` or run `mongod`

*(If you or your team members don't have MongoDB installed, please see the [MongoDB Installation Guide](MONGODB_SETUP.md) for step-by-step instructions for Windows, Mac, and Linux).*

### 2. Set Up the Backend
Open a terminal and navigate to the backend folder:
```bash
cd backend
# Install all required packages (only needed once or when package.json changes)
npm install
```

**Configure `.env`:**
You must create a `.env` file in the `backend/` directory. Git ignores this file for security.
Copy the configuration below and replace the SMTP details with your own (See `backend/SMTP_SETUP.md` for Gmail instructions):
```env
MONGO_URI=mongodb://127.0.0.1:27017/skill-swap
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d
PORT=5000
CLIENT_URL=https://localhost:3000
HOST=0.0.0.0

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your.email@gmail.com
SMTP_PASS=your_16_character_app_password
EMAIL_FROM=your.email@gmail.com
EMAIL_MODE=smtp
```

**Start the Backend Server:**
```bash
npm start
```
*Leave this terminal window open!*

### 3. Set Up the Frontend
Open a **new** terminal window and navigate to the frontend folder:
```bash
cd frontend
# Install all required packages
npm install
```

**Configure HTTPS Certificates (Mandatory for Video Calling):**
Because the Video Call system utilizes WebRTC to stream camera data, the application MUST run in a Secure Context (HTTPS mode), or standard browsers will automatically block it. See the [**SSL Local Setup Guide**](SSL_SETUP.md) for instructions on generating the required `cert.pem` and `key.pem` files using `mkcert`.

**Configure `.env` (Optional but recommended):**
Create a `.env` file in the `frontend/` directory:
```env
REACT_APP_API_URL=https://localhost:5000/api
HTTPS=true
```

**Start the Frontend Development Server:**
```bash
npm start
```
*Your browser should automatically open to `https://localhost:3000`.*

---

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
