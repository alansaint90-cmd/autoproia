import type { Role } from "@/lib/auth/rbac";

export type Session = {
  userId: string;
  role: Role;
  name: string;
};

export async function getSession(): Promise<Session> {
  return {
    userId: "00000000-0000-0000-0000-000000000001",
    role: "admin",
    name: "Administrador"
  };
}
