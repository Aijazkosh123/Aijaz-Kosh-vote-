import express from "express";
import path from "path";
import { Database } from "sqlite";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";