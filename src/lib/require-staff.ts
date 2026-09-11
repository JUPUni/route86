import "server-only";
import { redirect } from "next/navigation";
import { getStaffSession, type StaffSession } from "./auth";

export async function requireStaff(): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  return session;
}
