import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { isDemoMode } from "@/lib/env";
import { AuthUser, UserRole } from "@/features/auth/types";
import { getDemoUser, DEMO_USERS } from "@/features/auth/demo-users";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const DEMO_AUTH_COOKIE = "road_demo_role";

/**
 * Get authenticated user with verified database roles.
 * Works seamlessly in both demo and production modes.
 */
export async function getAuthenticatedUser(req?: Request | NextRequest): Promise<AuthUser | null> {
  // 1. Demo Mode
  if (isDemoMode) {
    let roleOrId: string | null = null;

    if (req) {
      roleOrId = req.headers.get("x-demo-user-id") || req.headers.get("x-demo-role");
    }

    if (!roleOrId) {
      try {
        const cookieStore = await cookies();
        roleOrId = cookieStore.get(DEMO_AUTH_COOKIE)?.value || null;
      } catch {
        // Ignored if outside request context
      }
    }

    return getDemoUser(roleOrId || "reporter");
  }

  // 2. Production Mode (Supabase Auth)
  try {
    const supabase = await createServerSupabaseClient();
    let authUser = (await supabase.auth.getUser()).data.user;

    // Check Bearer token from header if cookie session is missing
    if (!authUser && req) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        const serviceClient = createServiceRoleClient();
        const { data: tokenUser } = await serviceClient.auth.getUser(token);
        if (tokenUser?.user) {
          authUser = tokenUser.user;
        }
      }
    }

    if (!authUser) {
      return null;
    }

    // Query verified database roles from public.user_roles using service role
    const admin = createServiceRoleClient();
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", authUser.id);

    const roles: UserRole[] = (roleRows || []).map((r: { role: string }) => r.role as UserRole);
    if (roles.length === 0) {
      roles.push("reporter");
    }

    // Determine primary role by priority: admin > staff > reporter
    let primaryRole: UserRole = "reporter";
    if (roles.includes("admin")) {
      primaryRole = "admin";
    } else if (roles.includes("staff")) {
      primaryRole = "staff";
    }

    // Query profile for display name and avatar
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", authUser.id)
      .maybeSingle();

    const displayName =
      profile?.display_name ||
      authUser.user_metadata?.display_name ||
      authUser.email?.split("@")[0] ||
      "Citizen Reporter";

    return {
      id: authUser.id,
      email: authUser.email || "",
      displayName,
      avatarUrl: profile?.avatar_url || authUser.user_metadata?.avatar_url,
      role: primaryRole,
      roles,
      isStaff: roles.includes("staff") || roles.includes("admin"),
      isAdmin: roles.includes("admin"),
      createdAt: authUser.created_at,
    };
  } catch (err) {
    console.error("Authentication verification error:", err);
    return null;
  }
}

/**
 * Enforce that the request is authenticated and has one of the allowed roles.
 * Throws an explicit error object with status code if unauthorized.
 */
export async function requireRole(
  allowedRoles: UserRole[],
  req?: Request | NextRequest
): Promise<AuthUser> {
  const user = await getAuthenticatedUser(req);

  if (!user) {
    const error: Error & { status?: number; code?: string } = new Error(
      "Authentication required to access this resource."
    );
    error.status = 401;
    error.code = "UNAUTHORIZED";
    throw error;
  }

  const hasRole = user.roles.some((r) => allowedRoles.includes(r));
  if (!hasRole) {
    const error: Error & { status?: number; code?: string } = new Error(
      `Access denied: required role (${allowedRoles.join(" or ")}). Current user role: ${user.role}`
    );
    error.status = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  return user;
}
