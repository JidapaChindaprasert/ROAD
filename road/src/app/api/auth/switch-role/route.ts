
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDemoUser } from "@/features/auth/demo-users";
import { DEMO_AUTH_COOKIE } from "@/lib/auth/server-auth";
import { UserRole } from "@/features/auth/types";
import { isDemoMode } from "@/lib/env";

const switchRoleSchema = z.object({
  role: z.enum(["reporter", "staff", "admin"]),
});

export async function POST(req: NextRequest) {
  try {
    if (!isDemoMode) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Role switching is disabled in production mode. Staff and admin privileges are verified by database and granted via Admin Console.",
          },
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = switchRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid role specified" } },
        { status: 400 }
      );
    }

    const { role } = parsed.data;
    const switchedUser = getDemoUser(role as UserRole);

    const res = NextResponse.json({
      data: {
        user: switchedUser,
        message: `Active identity switched to ${switchedUser.displayName} (${switchedUser.role.toUpperCase()})`,
      },
    });

    res.cookies.set(DEMO_AUTH_COOKIE, role, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to switch role";
    return NextResponse.json(
      { error: { code: "SWITCH_ROLE_FAILED", message } },
      { status: 500 }
    );
  }
}
