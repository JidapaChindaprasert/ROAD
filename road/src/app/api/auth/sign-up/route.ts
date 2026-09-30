import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isDemoMode, env } from "@/lib/env";
import { DEMO_AUTH_COOKIE, getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { AuthUser, UserRole } from "@/features/auth/types";

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signUpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid input",
          },
        },
        { status: 400 }
      );
    }

    const { email, password, displayName } = parsed.data;
    // Public sign-up is strictly citizen/reporter. Staff and admin privileges are granted in the backend.
    const defaultRole: UserRole = "reporter";

    // Demo Mode Sign-Up
    if (isDemoMode) {
      const demoUser: AuthUser = {
        id: `demo-${Date.now()}`,
        email,
        displayName,
        role: defaultRole,
        roles: [defaultRole],
        isStaff: false,
        isAdmin: false,
        createdAt: new Date().toISOString(),
      };

      const res = NextResponse.json({ data: { user: demoUser } });
      res.cookies.set(DEMO_AUTH_COOKIE, defaultRole, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    }

    // Production Mode Sign-Up
    const supabase = await createServerSupabaseClient();
    const appUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
        emailRedirectTo: `${appUrl}/auth/callback`,
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          error: {
            code: "SIGN_UP_FAILED",
            message: authError?.message || "Failed to create account",
          },
        },
        { status: 400 }
      );
    }

    const newUserId = authData.user.id;
    const admin = createServiceRoleClient();

    // 1. Insert Profile
    await admin
      .from("profiles")
      .upsert({
        id: newUserId,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      })
      .select();

    // 2. Insert User Role (Always 'reporter' for public sign-ups)
    await admin
      .from("user_roles")
      .upsert(
        {
          user_id: newUserId,
          role: defaultRole,
          assigned_at: new Date().toISOString(),
        },
        { onConflict: "user_id,role" }
      );

    const isConfirmed = Boolean(authData.session || authData.user.confirmed_at);

    if (!isConfirmed) {
      return NextResponse.json({
        data: {
          requiresEmailConfirmation: true,
          email,
          displayName,
          message: "A verification email has been sent. Please check your inbox.",
        },
      });
    }

    const verifiedUser = await getAuthenticatedUser();
    return NextResponse.json({
      data: {
        requiresEmailConfirmation: false,
        user: verifiedUser || {
          id: newUserId,
          email,
          displayName,
          role: defaultRole,
          roles: [defaultRole],
          isStaff: false,
          isAdmin: false,
          createdAt: authData.user.created_at,
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to sign up";
    return NextResponse.json(
      { error: { code: "SIGN_UP_FAILED", message } },
      { status: 500 }
    );
  }
}
