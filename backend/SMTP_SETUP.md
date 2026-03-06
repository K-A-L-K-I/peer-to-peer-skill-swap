# Gmail SMTP Setup Guide for Skill Swap Backend

Because Node.js needs to send real emails (like Password Resets or OTP Verification codes) using Nodemailer, each developer on the team will need to provide their own email credentials in their local `backend/.env` file.

Since Google disabled "Less Secure Apps" a few years ago, **you cannot just use your normal Gmail password**. You must generate a special 16-character **"App Password"**.

Follow this complete step-by-step guide to set it up:

---

## Step 1: Add the variables to your `.env` file
Inside the `backend` folder, create a file named `.env` (if you don't have one) and paste this email/SMTP configuration at the bottom:

```env
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your.email@gmail.com
SMTP_PASS=your_16_character_app_password
EMAIL_FROM=your.email@gmail.com
EMAIL_MODE=smtp
```

## Step 2: Enable 2-Step Verification on Gmail
*(You cannot generate an App Password unless 2-Step Verification is turned on).*
1. Go to your **Google Account Manage page** (https://myaccount.google.com).
2. Click on **Security** in the left sidebar.
3. Scroll down to the "How you sign in to Google" section.
4. Ensure **2-Step Verification** is turned **ON** (if it isn't, follow the prompts to add your phone number and enable it).

## Step 3: Generate the Google App Password
1. While still on the **Security** page, search for **App Passwords** in the search bar at the very top of the screen (or go to `Security -> 2-Step Verification -> App Passwords` at the bottom).
2. It might ask you to sign in to your Google Account again.
3. On the App Passwords page, give it a custom name like "Skill Swap Local Server" and click **Create**.
4. Google will show you a yellow box with a **16-character password** (it looks like: `wycx ency kjcg mtgo`).

## Step 4: Update the `.env` file
1. Copy that 16-character password (without any spaces).
2. Paste it as your `SMTP_PASS` variable in your `.env` file.
3. Put your Gmail address in both the `SMTP_USER` and `EMAIL_FROM` variables.

**Example of how it should look when finished:**
```env
SMTP_USER=johndoe123@gmail.com
SMTP_PASS=abcdabcdabcdabcd
EMAIL_FROM=johndoe123@gmail.com
```

## Step 5: Restart the Server
Any time you modify the `.env` file, Node.js needs to be restarted for the changes to take effect.
Go to your terminal running the backend and press `Ctrl+C` to stop it, then run:

```bash
npm start
```
*(If you are running `node server.js` directly, use that instead).*

---
> ⚠️ **Important Security Note:** 
> **Never** commit your `.env` file to GitHub! All generated App Passwords give direct sending-access to your personal Gmail account. Make sure `.env` is listed in your `.gitignore` file.
