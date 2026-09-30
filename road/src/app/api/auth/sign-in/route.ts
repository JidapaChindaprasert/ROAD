import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isDemoMode } from "@/lib/env";
import { DEMO_USERS, getDemoUser } from "@/features/auth/demo-users";
import { DEMO_AUTH_COOKIE, getAuthenticatedUser } from "@/lib/auth/server-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signInSchema.safeParse(body);
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

    const { email, password } = parsed.data;

    // Demo Mode Sign-In
    if (isDemoMode) {
      let matchedRole: "reporter" | "staff" | "admin" = "reporter";
      const normalizedEmail = email.toLowerCase().trim();

      if (normalizedEmail.includes("staff") || normalizedEmail === DEMO_USERS.staff.email) {
        matchedRole = "staff";
      } else if (normalizedEmail.includes("admin") || normalizedEmail === DEMO_USERS.admin.email) {
        matchedRole = "admin";
      }

      const user = getDemoUser(matchedRole);
      const res = NextResponse.json({ data: { user } });
      res.cookies.set(DEMO_AUTH_COOKIE, matchedRole, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    }

    // Production Mode Sign-In
    const supabase = await createServerSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      const errMsg = authError?.message || "Invalid email or password";
      const isUnconfirmed = errMsg.toLowerCase().includes("email not confirmed");

      // If user had unconfirmed status, auto-confirm them now and sign them in!
      if (isUnconfirmed) {
        try {
          const admin = createServiceRoleClient();
          const { data: usersList } = await admin.auth.admin.listUsers();
          const target = usersList?.users?.find(
            (u) => u.email?.toLowerCase() === email.toLowerCase()
          );
          if (target) {
            await admin.auth.admin.updateUserById(target.id, { email_confirm: true });
            const retry = await supabase.auth.signInWithPassword({ email, password });
            if (!retry.error && retry.data.user) {
              const verifiedUser = await getAuthenticatedUser();
              return NextResponse.json({
                data: {
                  user: verifiedUser,
                },
              });
            }
          }
        } catch (confirmErr) {
          console.error("Auto-confirm error during sign-in:", confirmErr);
        }
      }

      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: errMsg,
          },
        },
        { status: 401 }
      );
    }

    const verifiedUser = await getAuthenticatedUser();
    return NextResponse.json({
      data: {
        user: verifiedUser,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to sign in";
    return NextResponse.json(
      { error: { code: "SIGN_IN_FAILED", message } },
      { status: 500 }
    );
  }
}
