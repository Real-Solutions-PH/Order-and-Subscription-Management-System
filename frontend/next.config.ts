import path from "path";
import dotenv from "dotenv";
import type { NextConfig } from "next";

// Load shared env vars from the repository root .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
