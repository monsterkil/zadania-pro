"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import TaskCard from "@/components/TaskCard";
import TaskDetail from "@/components/TaskDetail";
import NewTaskModal from "@/components/NewTaskModal";
import Notification from "@/components/Notification";

const STATUS_CONFIG = {
  new: { label: "Nowe", color: "#f59e0b" },
  in_progress: { label: "W realizacji", color: "#3b82f6" },
  done: { label: "Gotowe", color: "#10b981" },
};

const ROLE_CONFIG = {
  admin: { label: "Admin 1", color: "#3b82f6" },
  admin2: { label: "Admin 2", color: "#2563eb" },
  collaborator: { label: "Współpracownik", color: "#7c3aed" },
  client: { label: "Paweł", color: "#059669" },
};

export default function DashboardClient({ role }) {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskDraft, setNewTaskDraft] = useState({ title: "", description: "", requiresQuote: false, quoteAmount: "" });
  const [notification, setNotification] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const showNotif = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const handleTaskCreated = (newTask) => {
    setTasks((prev) => [newTask, ...prev]);
    if (newTask.emailSent) {
      showNotif("📧 Zadanie dodane. Email wysłany.");
    } else {
      const reason = newTask.emailError;
      const detail = newTask.emailErrorMessage || "";
      const senderInvalid = /sender address|nadawc|from.*valid|nieprawidłow/i.test(detail);
      const msg =
        reason === "no_api_keys"
          ? "Zadanie dodane. Email: dodaj EMAILLABS_APP_KEY i EMAILLABS_SECRET_KEY w Vercel (Settings → Environment Variables)."
          : reason === "no_smtp_account"
            ? "Zadanie dodane. Email: dodaj EMAILLABS_SMTP_ACCOUNT w Vercel (np. 1.biostima.smtp)."
            : reason === "api_error" && senderInvalid
              ? "Zadanie dodane. Email: ustaw EMAIL_FROM w Vercel na adres zweryfikowany w EmailLabs (np. nazwa@twoja-domena.pl)."
              : reason === "api_error"
                ? `Zadanie dodane. Email: błąd EmailLabs${detail ? ` (${detail})` : " — sprawdź klucze API i konto SMTP w panelu EmailLabs."}`
                : reason === "network_error"
                  ? "Zadanie dodane. Email: błąd połączenia z EmailLabs."
                  : "Zadanie dodane. Powiadomienie email nie wysłane — ustaw EMAILLABS_APP_KEY, EMAILLABS_SECRET_KEY, EMAILLABS_SMTP_ACCOUNT w Vercel.";
      showNotif(msg);
    }
  };

  const handleTaskUpdated = (updatedTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    setSelectedTask(updatedTask);
  };

  const handleTaskDeleted = (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTask(null);
    showNotif("Zadanie zostało usunięte.");
  };

  const handleDrop = async (taskId, newStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    if (
      newStatus === "in_progress" &&
      task.requiresQuote &&
      task.quoteStatus !== "accepted" &&
      task.quoteStatus !== "not_required"
    ) {
      showNotif("⚠️ Klient musi zaakceptować wycenę!");
      return;
    }

    // Optimistic update
    const oldStatus = task.status;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        // Revert
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: oldStatus } : t))
        );
        const err = await res.json();
        showNotif(`❌ ${err.error || "Błąd"}`);
        return;
      }

      if (newStatus === "in_progress") {
        showNotif("📧 Email → biuro@biostima.pl — w realizacji");
      } else if (newStatus === "done") {
        showNotif("📧 Email → biuro@biostima.pl — ukończone");
      }
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: oldStatus } : t))
      );
    }
  };

  const canDrag = role === "admin" || role === "admin2" || role === "collaborator";

  const grouped = {
    new: tasks.filter((t) => t.status === "new"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    done: tasks.filter((t) => t.status === "done"),
  };

  const totalAccepted = tasks
    .filter((t) => t.requiresQuote && t.quoteStatus === "accepted")
    .reduce((sum, t) => sum + (t.quoteAmount || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500 text-sm">Ładowanie...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #0f172a 0%, #1a2332 100%)" }}>
      <Notification message={notification} />

      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/5 sticky top-0 z-50"
        style={{ background: "rgba(15,23,42,0.85)", backdropFilter: "blur(12px)" }}>
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-brand-400">Zadania</span>{" "}
          <span className="text-slate-100">Pro</span>
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{
              background: `${ROLE_CONFIG[role].color}15`,
              border: `1px solid ${ROLE_CONFIG[role].color}30`,
              color: ROLE_CONFIG[role].color,
            }}>
            <span className="w-2 h-2 rounded-full" style={{ background: ROLE_CONFIG[role].color }} />
            {ROLE_CONFIG[role].label}
          </div>
          <button onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-500 border border-white/5 hover:text-slate-300 hover:border-white/10 transition-colors">
            Wyloguj
          </button>
        </div>
      </header>

      {/* Summary Bar */}
      <div className="flex gap-3 px-4 sm:px-6 py-4 overflow-x-auto">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg min-w-fit"
            style={{ background: `${cfg.color}08`, border: `1px solid ${cfg.color}20` }}>
            <span className="text-lg font-bold" style={{ color: cfg.color }}>{grouped[key].length}</span>
            <span className="text-xs text-slate-500">{cfg.label}</span>
          </div>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg min-w-fit"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-lg font-bold text-slate-100">
            {totalAccepted.toLocaleString("pl-PL")}
          </span>
          <span className="text-xs text-slate-500">PLN</span>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 px-4 sm:px-6 pb-24 overflow-x-auto min-h-[calc(100vh-140px)]">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
          <div
            key={status}
            className="flex-1 min-w-[280px] flex flex-col rounded-xl transition-colors"
            style={{
              background: dragOverColumn === status ? "rgba(255,255,255,0.02)" : "transparent",
              padding: dragOverColumn === status ? 4 : 0,
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (canDrag) setDragOverColumn(status);
            }}
            onDragLeave={() => setDragOverColumn(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverColumn(null);
              const taskId = e.dataTransfer.getData("taskId");
              if (taskId && canDrag) handleDrop(taskId, status);
            }}
          >
            {/* Column Header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
              <span className="text-xs font-bold text-slate-200 tracking-wide">{cfg.label}</span>
              <span className="text-xs text-slate-600 bg-white/[0.03] px-2 py-0.5 rounded-full font-semibold">
                {grouped[status].length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-1.5 flex-1 min-h-[100px]">
              {grouped[status].map((task) => (
                <div
                  key={task.id}
                  draggable={canDrag}
                  onDragStart={(e) => e.dataTransfer.setData("taskId", task.id)}
                >
                  <TaskCard task={task} onClick={() => setSelectedTask(task)} />
                </div>
              ))}
              {grouped[status].length === 0 && (
                <div className="py-8 text-center text-xs text-slate-700 border-2 border-dashed border-white/[0.03] rounded-xl">
                  Brak zadań
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* FAB — wszyscy zalogowani mogą dodawać zadania */}
      <button
        onClick={() => setShowNewTask(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl text-white text-2xl font-light flex items-center justify-center z-40 transition-all hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #3b82f6, #2563eb)",
          boxShadow: "0 8px 24px rgba(37,99,235,0.4)",
        }}
      >
        +
      </button>

      {/* Modals */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          role={role}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdated}
          onRefresh={fetchTasks}
          onDeleted={handleTaskDeleted}
        />
      )}

      {showNewTask && (
        <NewTaskModal
          role={role}
          draft={newTaskDraft}
          setDraft={setNewTaskDraft}
          onClose={() => setShowNewTask(false)}
          onCreated={handleTaskCreated}
        />
      )}
    </div>
  );
}
