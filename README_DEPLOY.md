# KoSh Vote Software - Deployment Guide

This guide explains how to deploy this full-stack React + Express + SQLite application.

---

## 🚀 Option 1: Render.com (Highly Recommended! ⭐⭐⭐⭐⭐)
Since this application uses an **Express backend** and a **local SQLite database (`data.db`)**, hosting it on a platform like **Render** or **Railway** is the best choice.
* **Why?** Vercel is a stateless serverless platform, meaning any data stored in your SQLite database (user accounts, balances, admin settings, and orders) will be **permanently deleted or reset** every few minutes. Render keeps your server running 24/7 and supports persistent local databases with zero code changes.
* **Cost:** Free Tier available.

### Steps to Deploy on Render:
1. Push your code to your **GitHub** repository.
2. Sign up / Log in to [Render.com](https://render.com).
3. Click **New** -> **Web Service**.
4. Connect your GitHub repository.
5. Configure the service:
   * **Name:** `kosh-vote-software`
   * **Language/Runtime:** `Node`
   * **Build Command:** `npm run build`
   * **Start Command:** `npm run start`
6. Add your Environment Variables under the **Environment** tab:
   * `JWT_SECRET`: A secure random password key (e.g. `your-random-secret-key-123`)
   * `GEMINI_API_KEY`: (Optional) Your Gemini API Key if using AI features.
7. Click **Deploy Web Service**! Your site is live!

---

## ⚡ Option 2: Vercel (Stateless/Read-only Only ⚠️)
If you strictly want to use **Vercel**, please note that **Vercel Serverless Functions do not support persistent SQLite databases**. Any registered user, balance, or order will be lost when the Vercel function goes to sleep.

To deploy on Vercel, you need to configure `vercel.json` to route API requests to serverless functions, and ideally use a cloud-hosted database (like Supabase PostgreSQL, Neon, or MongoDB) instead of SQLite.

### Steps to Deploy on Vercel:
1. Push your code to your **GitHub** repository.
2. Log in to [Vercel.com](https://vercel.com) and click **Add New Project**.
3. Import your GitHub repository.
4. Set the build settings:
   * **Framework Preset:** `Vite` (or Other)
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
5. Click **Deploy**.

*Note: For the full-stack server to run as serverless functions on Vercel, you must use a database like Supabase or MongoDB and create serverless endpoints inside an `api/` directory.*
