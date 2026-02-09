import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import TaskPageClient from "./TaskPageClient";

export default async function TaskPage({ params }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  return <TaskPageClient taskId={id} role={session.role} />;
}
