import { randomBytes, randomUUID, scrypt } from "node:crypto";
import { promisify } from "node:util";
import postgres from "postgres";

const scryptAsync = promisify(scrypt);
const keyLength = 64;
const databaseUrl = process.env.DATABASE_URL ?? "postgres://auto_pro_ia:auto_pro_ia@localhost:5432/auto_pro_ia";

const systemUserId = "00000000-0000-0000-0000-000000000001";
const now = new Date();

const seedUsers = [
  {
    id: systemUserId,
    name: "Superadmin",
    email: process.env.SUPERADMIN_EMAIL ?? "admin@autopro.ia",
    role: "super_admin",
    password: "AutoPro@2026Admin"
  },
  {
    name: "Carla Vendas",
    email: "carla@autopro.ia",
    role: "gerente",
    password: "AutoPro@2026Carla"
  },
  {
    name: "Marcos Closer",
    email: "marcos@autopro.ia",
    role: "gerente",
    password: "AutoPro@2026Marcos"
  },
  {
    name: "Julio Operador",
    email: "julio@autopro.ia",
    role: "atendente",
    password: "AutoPro@2026Julio"
  },
  {
    name: "Ana Consultora",
    email: "ana@autopro.ia",
    role: "atendente",
    password: "AutoPro@2026Ana"
  },
  {
    name: "Beatriz SDR",
    email: "beatriz@autopro.ia",
    role: "atendente",
    password: "AutoPro@2026Beatriz"
  },
  {
    name: "Ricardo IA",
    email: "ia@autopro.ia",
    role: "ia",
    password: "AutoPro@2026IA"
  }
];

async function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const derived = await scryptAsync(password, salt, keyLength);

  return `scrypt:${salt}:${Buffer.from(derived).toString("base64url")}`;
}

async function main() {
  const sql = postgres(databaseUrl, { prepare: false });

  try {
    for (const user of seedUsers) {
      const passwordHash = await hashPassword(user.password);
      const email = user.email.trim().toLowerCase();

      await sql`
        insert into users (
          id,
          name,
          email,
          role,
          password_hash,
          password_set_at,
          email_verified_at,
          invite_token_hash,
          invite_expires_at,
          invited_at,
          updated_at,
          is_deleted,
          modified_by
        )
        values (
          ${user.id ?? randomUUID()},
          ${user.name},
          ${email},
          ${user.role},
          ${passwordHash},
          ${now},
          ${now},
          null,
          null,
          null,
          ${now},
          false,
          ${systemUserId}
        )
        on conflict (email) do update set
          name = excluded.name,
          role = excluded.role,
          password_hash = excluded.password_hash,
          password_set_at = excluded.password_set_at,
          email_verified_at = excluded.email_verified_at,
          invite_token_hash = null,
          invite_expires_at = null,
          invited_at = null,
          updated_at = excluded.updated_at,
          is_deleted = false,
          modified_by = excluded.modified_by
      `;
    }

    const rows = await sql`
      select name, email, role
      from users
      where email in ${sql(seedUsers.map((user) => user.email.trim().toLowerCase()))}
      order by
        case role
          when 'super_admin' then 1
          when 'gerente' then 2
          when 'atendente' then 3
          when 'ia' then 4
          else 5
        end,
        name
    `;

    console.log(JSON.stringify({ seeded: rows, credentials: seedUsers }, null, 2));
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("[seed-users] failed", error);
  process.exitCode = 1;
});
