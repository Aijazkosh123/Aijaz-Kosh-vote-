import express from "express";
import path from "path";
import { Database } from "sqlite";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";

// Dynamically load sqlite3 to prevent crashes in environments without binary support (like Vercel)
let sqlite3: any = null;

const JWT_SECRET = process.env.JWT_SECRET || "kosh-vote-jwt-secret-key-123456";
const PORT = 3000;

interface AuthRequest extends express.Request {
  user?: {
    id: number;
    email: string;
    is_admin: number;
  };
}

// Global DB Connection Reference
let db: any;
