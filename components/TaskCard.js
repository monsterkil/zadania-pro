"use client";

const QUOTE_STATUS = {
  pending: { label: "Oczekuje", color: "#f59e0b", icon: "⏳" },
  accepted: { label: "Zaakceptowana", color: "#10b981", icon: "✓" },
  rejected: { label: "Odrzucona", color: "#ef4444", icon: "✗" },
  not_required: { label: "—", color: "#6b7280", icon: "" },
};

const STATUS_COLORS = {
  new: "#f59e0b",
  in_progress: "#3b82f6",
  done: "#10b981",
};

const ROLE_COLORS = {
  admin: "#3b82f6",
  collaborator: "#7c3aed",
  client: "#059669",
};

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
}

export default function TaskCard({ task, onClick }) {
  const qs = QUOTE_STATUS[task.quoteStatus] || QUOTE_STATUS.pending;
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "done";
  const fileCount = task.files?.length || 0;
  const commentCount = task.comments?.length || 0;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-lg transition-all hover:-translate-y-px"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderLeft: `3px solid ${STATUS_COLORS[task.status]}`,
        padding: "8px 10px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.025)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
      }}
    >
      {/* Title */}
      <div className="text-[13px] font-semibold text-slate-200 leading-tight mb-1.5 truncate">
        {task.title}
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Quote badge */}
        {task.requiresQuote && task.quoteStatus !== "not_required" && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ color: qs.color, background: `${qs.color}12` }}
          >
            {qs.icon}{task.quoteAmount ? ` ${Number(task.quoteAmount).toLocaleString("pl-PL")} zł` : ""}
          </span>
        )}

        {/* Deadline */}
        {task.deadline && (
          <span className={`text-[10px] ${isOverdue ? "text-red-400" : "text-slate-500"}`}>
            📅{formatDate(task.deadline)}
          </span>
        )}

        <span className="flex-1" />

        {/* Indicators */}
        <div className="flex items-center gap-1.5">
          {fileCount > 0 && (
            <span className="text-[10px] text-slate-600">📎{fileCount}</span>
          )}
          {commentCount > 0 && (
            <span className="text-[10px] text-slate-600">💬{commentCount}</span>
          )}
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: ROLE_COLORS[task.createdBy] || "#64748b" }}
          />
        </div>
      </div>
    </div>
  );
}
