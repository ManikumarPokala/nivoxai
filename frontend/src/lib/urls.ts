// frontend/src/lib/urls.ts

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:4000";

export const AI_BASE_URL =
  process.env.NEXT_PUBLIC_AI_BASE_URL ||
  "http://localhost:8000";

export const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL || "http://backend-api:4000";

export const BACKEND_AI_BASE_URL =
  process.env.BACKEND_AI_BASE_URL || "http://backend-ai:8000";
