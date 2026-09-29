import { describe, it, expect } from "vitest";
import { createClient } from "@/lib/supabase/client";

describe("Supabase Production Configuration & Guardrails", () => {
  it("fails clearly when Supabase credentials are missing instead of silently proceeding", () => {
    // Save original env
    const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const origKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(() => {
      createClient();
    }).toThrow(/NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be provided/i);

    // Restore env
    if (origUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    if (origKey) process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = origKey;
  });
});
