import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("ROAD"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_MODE: z.enum(["demo", "production"]).default("demo"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_MAP_STYLE_URL: z.string().optional(),
  NEXT_PUBLIC_MAP_ATTRIBUTION: z.string().optional(),
  NEXT_PUBLIC_DEFAULT_MAP_LAT: z.coerce.number().default(13.7563),
  NEXT_PUBLIC_DEFAULT_MAP_LNG: z.coerce.number().default(100.5018),
  NEXT_PUBLIC_DEFAULT_MAP_ZOOM: z.coerce.number().default(12),
  
  // Server-only variables
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(["roboflow", "custom_yolo", "openai", "demo"]).default("roboflow"),
  YOLO_API_URL: z.string().default("http://127.0.0.1:7860"),
  YOLO_API_TOKEN: z.string().optional(),
  ROBOFLOW_API_KEY: z.string().optional(),
  ROBOFLOW_MODEL_ID: z.string().optional(),
  ROBOFLOW_VERSION: z.string().optional(),
  ROBOFLOW_CONFIDENCE_THRESHOLD: z.coerce.number().default(0.4),
  OPENAI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("gpt-4o-mini"),
  WORKER_SECRET: z.string().optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_MODE: process.env.NEXT_PUBLIC_APP_MODE,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_MAP_STYLE_URL: process.env.NEXT_PUBLIC_MAP_STYLE_URL,
  NEXT_PUBLIC_MAP_ATTRIBUTION: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION,
  NEXT_PUBLIC_DEFAULT_MAP_LAT: process.env.NEXT_PUBLIC_DEFAULT_MAP_LAT,
  NEXT_PUBLIC_DEFAULT_MAP_LNG: process.env.NEXT_PUBLIC_DEFAULT_MAP_LNG,
  NEXT_PUBLIC_DEFAULT_MAP_ZOOM: process.env.NEXT_PUBLIC_DEFAULT_MAP_ZOOM,
  
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  AI_PROVIDER: process.env.AI_PROVIDER,
  YOLO_API_URL: process.env.YOLO_API_URL,
  YOLO_API_TOKEN: process.env.YOLO_API_TOKEN,
  ROBOFLOW_API_KEY: process.env.ROBOFLOW_API_KEY,
  ROBOFLOW_MODEL_ID: process.env.ROBOFLOW_MODEL_ID,
  ROBOFLOW_VERSION: process.env.ROBOFLOW_VERSION,
  ROBOFLOW_CONFIDENCE_THRESHOLD: process.env.ROBOFLOW_CONFIDENCE_THRESHOLD,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  AI_MODEL: process.env.AI_MODEL,
  WORKER_SECRET: process.env.WORKER_SECRET,
});

export const isDemoMode = env.NEXT_PUBLIC_APP_MODE === "demo";
export const isProductionMode = env.NEXT_PUBLIC_APP_MODE === "production";
