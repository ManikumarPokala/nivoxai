export const APP_URL =
  (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/$/, "");

export const AI_API_URL =
  (process.env.NEXT_PUBLIC_AI_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
