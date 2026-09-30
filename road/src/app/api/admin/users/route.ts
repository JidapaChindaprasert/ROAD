import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isDemoMode } from "@/lib/env";
import { requireRole } from "@/lib/auth/server-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { DEMO_USERS, getAllDemoUsers } from "@/features/auth/demo-users";
import { UserRole } from "@/features/auth/types";

// In-memory demo role overrides for interactive testing
const demoRoleOverrides: Record<string, UserRole[]> = {
  "demo-user-reporter": ["reporter"],
  "demo-user-staff": ["reporter", "staff"],
  "demo-user-admin": ["reporter", "staff", "admin"],
};

const assignRoleSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["reporter", "staff", "admin"]),
  action: z.enum(["assign", "remove"]).default("assign"),
});

/**
 * GET /api/admin/users
 * Lists users and their verified database roles.
 * Protected: requires 'admin' role.
 */
export async function GET(req: NextRequest) {
  try {
    const adminUser = await requireRole(["admin"], req);

    // 1. Demo Mode
    if (isDemoMode) {
      const demoList = getAllDemoUsers().map((u) => {
        const customRoles = demoRoleOverrides[u.id] || u.roles;
        let primaryRole: UserRole = "reporter";
        if (customRoles.includes("admin")) primaryRole = "admin";
        else if (customRoles.includes("staff")) primaryRole = "staff";

        return {
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl,
          roles: customRoles,
          primaryRole,
          isStaff: customRoles.includes("staff") || customRoles.includes("admin"),
          isAdmin: customRoles.includes("admin"),
          createdAt: u.createdAt,
        };
      });

      return NextResponse.json({
        data: {
          users: demoList,
          actor: { id: adminUser.id, role: adminUser.role },
        },
      });
    }

    // 2. Production Mode (Supabase Service Client)
    const admin = createServiceRoleClient();

    // Fetch auth users to get emails securely
    const { data: authUsersResult, error: authListError } = await admin.auth.admin.listUsers({
      perPage: 100,
    });

    if (authListError) {
      console.error("Failed to list auth users:", authListError);
    }

    const authUsers = authUsersResult?.users || [];
    const emailMap = new Map<string, string>();
    authUsers.forEach((u) => {
      if (u.email) emailMap.set(u.id, u.email);
    });

    // Fetch profiles
    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id, display_name, avatar_url, created_at")
      .order("created_at", { ascending: false });

    if (profileError) {
      console.error("Failed to list profiles:", profileError);
    }

    // Fetch roles
    const { data: roleRows, error: roleError } = await admin
      .from("user_roles")
      .select("user_id, role, assigned_at");

    if (roleError) {
      console.error("Failed to list roles:", roleError);
    }

    const rolesByUserId = new Map<string, UserRole[]>();
    (roleRows || []).forEach((r: { user_id: string; role: string }) => {
      const existing = rolesByUserId.get(r.user_id) || [];
      existing.push(r.role as UserRole);
      rolesByUserId.set(r.user_id, existing);
    });

    // Merge into structured user items
    const allUserIds = new Set<string>();
    (profiles || []).forEach((p: { id: string }) => allUserIds.add(p.id));
    authUsers.forEach((u) => allUserIds.add(u.id));

    const users = Array.from(allUserIds).map((userId) => {
      const profile = (profiles || []).find((p: { id: string }) => p.id === userId);
      const authUser = authUsers.find((u) => u.id === userId);
      const roles = rolesByUserId.get(userId) || ["reporter"];

      let primaryRole: UserRole = "reporter";
      if (roles.includes("admin")) primaryRole = "admin";
      else if (roles.includes("staff")) primaryRole = "staff";

      const email = emailMap.get(userId) || authUser?.email || "unknown@user";
      const displayName =
        profile?.display_name ||
        authUser?.user_metadata?.display_name ||
        email.split("@")[0] ||
        "Citizen Reporter";

      return {
        id: userId,
        email,
        displayName,
        avatarUrl: profile?.avatar_url,
        roles,
        primaryRole,
        isStaff: roles.includes("staff") || roles.includes("admin"),
        isAdmin: roles.includes("admin"),
        createdAt: profile?.created_at || authUser?.created_at || new Date().toISOString(),
      };
    });

    return NextResponse.json({
      data: {
        users,
        actor: { id: adminUser.id, role: adminUser.role },
      },
    });
  } catch (err: unknown) {
    const errorObj = err as { status?: number; code?: string; message?: string };
    const status = errorObj.status || 500;
    return NextResponse.json(
      {
        error: {
          code: errorObj.code || "ADMIN_USERS_ERROR",
          message: errorObj.message || "Failed to list users",
        },
      },
      { status }
    );
  }
}

/**
 * POST /api/admin/users
 * Grants or revokes roles (staff / admin) for a user in the backend.
 * Protected: requires 'admin' role.
 */
export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireRole(["admin"], req);

    const body = await req.json();
    const parsed = assignRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: parsed.error.issues[0]?.message || "Invalid role assignment request",
          },
        },
        { status: 400 }
      );
    }

    const { userId, role, action } = parsed.data;

    // Safety: Prevent admin from removing their own admin role
    if (userId === adminUser.id && role === "admin" && action === "remove") {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Cannot revoke your own admin permissions.",
          },
        },
        { status: 403 }
      );
    }

    // 1. Demo Mode
    if (isDemoMode) {
      const current = demoRoleOverrides[userId] || ["reporter"];
      if (action === "assign") {
        if (!current.includes(role)) {
          demoRoleOverrides[userId] = [...current, role];
        }
      } else {
        if (role !== "reporter") {
          demoRoleOverrides[userId] = current.filter((r) => r !== role);
        }
      }

      return NextResponse.json({
        data: {
          success: true,
          message: `Successfully ${action === "assign" ? "granted" : "revoked"} role '${role}' for user.`,
          userId,
          roles: demoRoleOverrides[userId],
        },
      });
    }

    // 2. Production Mode (Supabase Service Client)
    const admin = createServiceRoleClient();

    if (action === "assign") {
      const { error: upsertError } = await admin.from("user_roles").upsert(
        {
          user_id: userId,
          role,
          assigned_at: new Date().toISOString(),
          assigned_by: adminUser.id,
        },
        { onConflict: "user_id,role" }
      );

      if (upsertError) {
        console.error("Failed to assign role:", upsertError);
        return NextResponse.json(
          {
            error: {
              code: "ROLE_ASSIGN_FAILED",
              message: upsertError.message || "Failed to grant role in database.",
            },
          },
          { status: 500 }
        );
      }
    } else {
      // Cannot remove base reporter role
      if (role === "reporter") {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_OPERATION",
              message: "Cannot revoke citizen reporter base status.",
            },
          },
          { status: 400 }
        );
      }

      const { error: deleteError } = await admin
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (deleteError) {
        console.error("Failed to revoke role:", deleteError);
        return NextResponse.json(
          {
            error: {
              code: "ROLE_REVOKE_FAILED",
              message: deleteError.message || "Failed to revoke role in database.",
            },
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      data: {
        success: true,
        message: `Successfully ${action === "assign" ? "granted" : "revoked"} role '${role}'.`,
        userId,
      },
    });
  } catch (err: unknown) {
    const errorObj = err as { status?: number; code?: string; message?: string };
    const status = errorObj.status || 500;
    return NextResponse.json(
      {
        error: {
          code: errorObj.code || "ROLE_MUTATION_FAILED",
          message: errorObj.message || "Failed to update user role",
        },
      },
      { status }
    );
  }
}
