import { AppSidebar } from "@/components/app-sidebar";
import { getOptionalSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function CrmLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getOptionalSession();

  if (!session) {
    redirect("/");
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);

  if (!user || user.is_deleted || !user.password_set_at) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
