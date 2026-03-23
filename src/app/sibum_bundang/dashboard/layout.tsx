import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ok = await getSession();
  if (!ok) redirect("/sibum_bundang?reason=nosession");
  return <>{children}</>;
}
