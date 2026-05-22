export type Role = "super_admin" | "admin" | "operador" | "visualizador";

const roleLevel: Record<Role, number> = {
  super_admin: 0,
  admin: 1,
  operador: 2,
  visualizador: 3
};

export function can(currentRole: Role, minimumRole: Role) {
  return roleLevel[currentRole] <= roleLevel[minimumRole];
}

export function assertCan(currentRole: Role, minimumRole: Role) {
  if (!can(currentRole, minimumRole)) {
    throw new Error("Sem permissao para executar esta acao.");
  }
}
