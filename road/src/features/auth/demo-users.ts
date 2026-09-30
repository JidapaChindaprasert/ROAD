import { AuthUser, UserRole } from "./types";

export const DEMO_USERS: Record<UserRole, AuthUser> = {
  reporter: {
    id: "demo-user-reporter",
    email: "somchai.citizen@road.bkk",
    displayName: "Somchai Prasert",
    avatarUrl: "",
    role: "reporter",
    roles: ["reporter"],
    isStaff: false,
    isAdmin: false,
    createdAt: "2026-01-15T08:00:00Z",
  },
  staff: {
    id: "demo-user-staff",
    email: "staff.somkiat@bma.go.th",
    displayName: "Somkiat Rattana",
    avatarUrl: "",
    role: "staff",
    roles: ["reporter", "staff"],
    isStaff: true,
    isAdmin: false,
    createdAt: "2026-01-10T08:00:00Z",
  },
  admin: {
    id: "demo-user-admin",
    email: "admin.chatchai@bma.go.th",
    displayName: "Chatchai V.",
    avatarUrl: "",
    role: "admin",
    roles: ["reporter", "staff", "admin"],
    isStaff: true,
    isAdmin: true,
    createdAt: "2026-01-01T08:00:00Z",
  },
};

export function getDemoUser(roleOrId: string): AuthUser {
  if (roleOrId === "staff" || roleOrId === "demo-user-staff") {
    return DEMO_USERS.staff;
  }
  if (roleOrId === "admin" || roleOrId === "demo-user-admin") {
    return DEMO_USERS.admin;
  }
  return DEMO_USERS.reporter;
}

export function getAllDemoUsers(): AuthUser[] {
  return [DEMO_USERS.reporter, DEMO_USERS.staff, DEMO_USERS.admin];
}
