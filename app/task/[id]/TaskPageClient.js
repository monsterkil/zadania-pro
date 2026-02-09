"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TaskDetail from "@/components/TaskDetail";

export default function TaskPageClient({ taskId, role }) {
  const router = useRouter();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tasks/${taskId}`)
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        if (!r.ok) { router.push("/dashboard"); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) setTask(data);
        setLoading(false);
      })
      .catch(() => {
        router.push("/dashboard");
      });
  }, [taskId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(180deg, #0f172a 0%, #1a2332 100%)" }}>
        <div className="text-slate-500 text-sm">Ładowanie...</div>
      </div>
    );
  }

  if (!task) return null;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #0f172a 0%, #1a2332 100%)" }}>
      <TaskDetail
        task={task}
        role={role}
        onClose={() => router.push("/dashboard")}
        onUpdate={(updated) => setTask(updated)}
        onRefresh={() => {}}
      />
    </div>
  );
}
