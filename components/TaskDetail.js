"use client";
import { useState, useRef, useEffect } from "react";

const STATUS_CONFIG = {
  new: { label: "Nowe", color: "#f59e0b" },
  in_progress: { label: "W realizacji", color: "#3b82f6" },
  done: { label: "Gotowe", color: "#047857" },
};
const QUOTE_STATUS = {
  pending: { label: "Oczekuje", color: "#f59e0b", icon: "⏳" },
  accepted: { label: "Zaakceptowana", color: "#10b981", icon: "✓" },
  rejected: { label: "Odrzucona", color: "#ef4444", icon: "✗" },
  not_required: { label: "Bez wyceny", color: "#6b7280", icon: "—" },
};
const ROLE_CFG = {
  admin: { label: "Admin 1", color: "#3b82f6" },
  admin2: { label: "Admin 2", color: "#2563eb" },
  collaborator: { label: "Współpracownik", color: "#7c3aed" },
  client: { label: "Paweł", color: "#059669" },
};

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtSize(b) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(0) + " KB";
  return (b / 1048576).toFixed(1) + " MB";
}
function timeAgo(s) {
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (diff < 60) return "teraz";
  if (diff < 3600) return Math.floor(diff / 60) + " min";
  if (diff < 86400) return Math.floor(diff / 3600) + "h";
  if (diff < 604800) return Math.floor(diff / 86400) + "d";
  return fmtDate(s);
}

function Section({ label, action, children }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3 py-2">
        <span className="text-sm text-slate-500 font-semibold uppercase tracking-wider">{label}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function TaskDetail({ task, role, onClose, onUpdate, onRefresh, onDeleted }) {
  const [lt, setLt] = useState(task);
  const [comment, setComment] = useState("");
  const [showQI, setShowQI] = useState(false);
  const [qi, setQi] = useState(task.quoteAmount || "");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const cRef = useRef(null);
  const fRef = useRef(null);

  const canEdit = role === "admin" || role === "admin2" || role === "collaborator";
  const canDelete = canEdit;
  const canEditTitleDesc = canEdit || (role === "client" && lt.createdBy === "client");
  const canAccept = role === "client" && lt.quoteStatus === "pending" && lt.quoteAmount;
  const blocked = lt.requiresQuote && lt.quoteStatus === "pending" && lt.status === "new";

  const [editTitle, setEditTitle] = useState(false);
  const [editDescription, setEditDescription] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [descriptionDraft, setDescriptionDraft] = useState(task.description || "");

  useEffect(() => {
    setLt(task);
    setTitleDraft(task.title);
    setDescriptionDraft(task.description || "");
    setEditTitle(false);
    setEditDescription(false);
  }, [task.id]);

  const patch = async (url, body) => {
    const r = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return r;
  };
  const update = (changes) => {
    const u = { ...lt, ...changes };
    setLt(u);
    onUpdate(u);
  };

  const changeStatus = async (s) => {
    if (!canEdit || s === lt.status) return;
    if (s === "in_progress" && blocked) return;
    const r = await patch(`/api/tasks/${lt.id}`, { status: s });
    if (r.ok) update({ status: s });
  };

  const setQuote = async () => {
    const a = parseFloat(qi);
    if (isNaN(a) || a <= 0) return;
    const r = await patch(`/api/tasks/${lt.id}`, { quoteAmount: a });
    if (r.ok) { update({ quoteAmount: a, quoteStatus: "pending" }); setShowQI(false); }
  };

  const quoteAction = async (action) => {
    const r = await patch(`/api/tasks/${lt.id}/quote`, { action });
    if (r.ok) update({ quoteStatus: action });
  };

  const setQuoteStatus = async (v) => {
    if (!canEdit || v === lt.quoteStatus) return;
    const r = await patch(`/api/tasks/${lt.id}`, { quoteStatus: v });
    if (r.ok) update({ quoteStatus: v });
  };

  const setDeadline = async (v) => {
    const r = await patch(`/api/tasks/${lt.id}`, { deadline: v || null });
    if (r.ok) update({ deadline: v || null });
  };

  const saveTitle = async () => {
    const t = titleDraft.trim();
    if (!t || t === lt.title) { setEditTitle(false); return; }
    const r = await patch(`/api/tasks/${lt.id}`, { title: t });
    if (r.ok) { update({ title: t }); setEditTitle(false); }
  };

  const saveDescription = async () => {
    const d = descriptionDraft.trim() || null;
    if (d === (lt.description || "")) { setEditDescription(false); return; }
    const r = await patch(`/api/tasks/${lt.id}`, { description: d });
    if (r.ok) { update({ description: d }); setEditDescription(false); }
  };

  const setRequiresQuote = async (v) => {
    const r = await patch(`/api/tasks/${lt.id}`, { requiresQuote: v });
    if (r.ok) update({ requiresQuote: v, quoteStatus: v ? "pending" : "not_required" });
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    const r = await fetch(`/api/tasks/${lt.id}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment.trim() }),
    });
    if (r.ok) {
      const c = await r.json();
      update({ comments: [...(lt.comments || []), c] });
      setComment("");
      setTimeout(() => cRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  const uploadFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 30 * 1024 * 1024) { alert("Max 30 MB"); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", f);
    try {
      const r = await fetch(`/api/tasks/${lt.id}/files`, { method: "POST", body: fd });
      if (r.ok) {
        const sf = await r.json();
        update({ files: [...(lt.files || []), sf] });
      }
    } catch {}
    setUploading(false);
    if (fRef.current) fRef.current.value = "";
  };

  const deleteTask = async () => {
    if (!canDelete || deleting) return;
    if (!confirm("Czy na pewno chcesz całkowicie usunąć to zadanie? Tej operacji nie można cofnąć.")) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/tasks/${lt.id}`, { method: "DELETE" });
      if (r.ok) {
        onDeleted?.(lt.id);
        onClose();
      } else {
        const data = await r.json().catch(() => ({}));
        alert(data?.error || "Nie udało się usunąć zadania.");
      }
    } catch {
      alert("Błąd połączenia.");
    } finally {
      setDeleting(false);
    }
  };

  const qs = QUOTE_STATUS[lt.quoteStatus] || QUOTE_STATUS.pending;
  const inputStyle = "px-3 py-2 rounded-lg text-sm text-slate-100 outline-none bg-white/[0.03] border border-white/[0.08]";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[600px] max-h-[90vh] overflow-auto rounded-2xl animate-scale-in"
        style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>

        {/* Header */}
        <div className="flex justify-between items-start p-5 pb-4 border-b border-white/5 sticky top-0 z-10" style={{ background: "#1e293b" }}>
          <div className="flex-1 mr-4 min-w-0">
            {canEditTitleDesc && editTitle ? (
              <div className="flex gap-2 items-center">
                <input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} onBlur={saveTitle}
                  onKeyDown={(e) => { e.key === "Enter" && saveTitle(); e.key === "Escape" && (setTitleDraft(lt.title), setEditTitle(false)); }}
                  className={inputStyle + " flex-1 text-lg font-bold"} autoFocus />
                <button onClick={saveTitle} className="px-2 py-1.5 rounded text-xs font-semibold text-white bg-brand-600">Zapisz</button>
                <button onClick={() => { setTitleDraft(lt.title); setEditTitle(false); }} className="px-2 py-1.5 rounded text-xs text-slate-500 bg-white/5">✕</button>
              </div>
            ) : (
              <h2 className="text-xl font-bold text-slate-50 leading-tight">
                {lt.title}
                {canEditTitleDesc && (
                  <button type="button" onClick={() => { setTitleDraft(lt.title); setEditTitle(true); }} className="ml-2 text-slate-500 hover:text-slate-300 text-sm font-normal">Edytuj</button>
                )}
              </h2>
            )}
            <p className="text-xs text-slate-500 mt-1">{ROLE_CFG[lt.createdBy]?.label} · {fmtDate(lt.createdAt)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 bg-white/5 flex-shrink-0">✕</button>
        </div>

        <div className="p-5 pt-4 space-y-5">
          {/* Status — ręczna zmiana (dropdown, 3 opcje) */}
          <Section label="Status">
            <select
              value={lt.status}
              onChange={(e) => {
                const s = e.target.value;
                if (s === "in_progress" && blocked) return;
                changeStatus(s);
              }}
              disabled={!canEdit}
              className="w-full max-w-[220px] py-2 px-3 rounded-lg text-sm font-medium bg-white/[0.04] border border-white/[0.08] text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: STATUS_CONFIG[lt.status]?.color || "#94a3b8" }}
            >
              {Object.entries(STATUS_CONFIG).map(([k, c]) => {
                const blk = k === "in_progress" && blocked;
                return (
                  <option key={k} value={k} disabled={blk} style={{ color: c.color }}>
                    {c.label}
                  </option>
                );
              })}
            </select>
          </Section>

          {blocked && (
            <div className="px-3 py-2 rounded-lg text-xs" style={{ background: "#f59e0b12", border: "1px solid #f59e0b25", color: "#fbbf24" }}>
              ⚠️ Wycena musi być zaakceptowana przed przeniesieniem
            </div>
          )}

          {/* Description */}
          <Section label="Opis" action={canEditTitleDesc && !editDescription && <button type="button" onClick={() => { setDescriptionDraft(lt.description || ""); setEditDescription(true); }} className="text-xs text-brand-400 font-semibold hover:text-brand-200">Edytuj</button>}>
            {canEditTitleDesc && editDescription ? (
              <div className="space-y-2">
                <textarea value={descriptionDraft} onChange={(e) => setDescriptionDraft(e.target.value)} rows={5}
                  className={inputStyle + " w-full resize-y font-[inherit]"}
                  placeholder="Opis zadania..." />
                <div className="flex gap-2">
                  <button onClick={saveDescription} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-600">Zapisz</button>
                  <button onClick={() => { setDescriptionDraft(lt.description || ""); setEditDescription(false); }} className="px-3 py-1.5 rounded-lg text-xs text-slate-500 bg-white/5">Anuluj</button>
                </div>
              </div>
            ) : lt.description ? (
              <div className="text-sm text-slate-300 leading-relaxed p-3 rounded-lg whitespace-pre-wrap bg-white/[0.015] border border-white/[0.03]">
                {lt.description}
              </div>
            ) : canEditTitleDesc ? (
              <button type="button" onClick={() => { setDescriptionDraft(""); setEditDescription(true); }} className="text-sm text-slate-500 hover:text-slate-400 p-3 rounded-lg border border-dashed border-white/[0.06] w-full text-left">
                + Dodaj opis
              </button>
            ) : (
              <div className="text-sm text-slate-600 p-2">Brak opisu</div>
            )}
          </Section>

          {/* Wymaga wyceny (admin/collaborator) */}
          {canEdit && (
            <Section label="Wymaga wyceny">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setRequiresQuote(!lt.requiresQuote)}
                  className="w-10 h-[22px] rounded-full relative cursor-pointer transition-colors flex-shrink-0"
                  style={{ background: lt.requiresQuote ? "#3b82f6" : "rgba(255,255,255,0.1)" }}>
                  <div className="w-[18px] h-[18px] rounded-full bg-white absolute top-[2px] transition-[left]" style={{ left: lt.requiresQuote ? 20 : 2 }} />
                </button>
                <span className="text-sm text-slate-400">{lt.requiresQuote ? "Tak" : "Nie"}</span>
              </div>
            </Section>
          )}

          {/* Quote */}
          <Section label="Wycena">
            {lt.requiresQuote && lt.quoteStatus !== "not_required" ? (
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    {lt.quoteAmount ? (
                      <div className="text-xl font-bold text-slate-50">
                        {Number(lt.quoteAmount).toLocaleString("pl-PL")} <span className="text-sm font-normal text-slate-400">PLN</span>
                      </div>
                    ) : <div className="text-sm text-slate-500">Brak wyceny</div>}
                    <div className="flex items-center gap-1 mt-1 text-xs font-semibold" style={{ color: qs.color }}>{qs.icon} {qs.label}</div>
                  </div>
                  <div className="flex gap-2">
                    {canEdit && !showQI && (
                      <button onClick={() => setShowQI(true)} className="px-3 py-1.5 rounded-md text-xs text-slate-400 border border-white/10 hover:text-slate-200">
                        {lt.quoteAmount ? "Zmień" : "Wyceniaj"}
                      </button>
                    )}
                    {canAccept && (
                      <>
                        <button onClick={() => quoteAction("accepted")} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500">Akceptuj</button>
                        <button onClick={() => quoteAction("rejected")} className="px-3 py-1.5 rounded-md text-xs font-semibold text-red-400 border border-red-500/50 hover:bg-red-500/10">Odrzuć</button>
                      </>
                    )}
                  </div>
                </div>
                {/* Admin: ręczna zmiana stanu wyceny (Wycenione / Wycena zaakceptowana) */}
                {canEdit && (
                  <div>
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-2">Stan wyceny</span>
                    <select
                      value={lt.quoteStatus}
                      onChange={(e) => setQuoteStatus(e.target.value)}
                      className="w-full max-w-[200px] py-2 px-3 rounded-lg text-sm font-medium bg-white/[0.04] border border-white/[0.08] text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                      style={{ color: QUOTE_STATUS[lt.quoteStatus]?.color || "#94a3b8" }}
                    >
                      <option value="pending" style={{ color: QUOTE_STATUS.pending.color }}>Wycenione (oczekuje)</option>
                      <option value="accepted" style={{ color: QUOTE_STATUS.accepted.color }}>Wycena zaakceptowana</option>
                      <option value="rejected" style={{ color: QUOTE_STATUS.rejected.color }}>Odrzucona</option>
                    </select>
                  </div>
                )}
                {showQI && (
                  <div className="flex gap-2 mt-3 items-center">
                    <input type="number" value={qi} onChange={(e) => setQi(e.target.value)} placeholder="Kwota PLN"
                      className={inputStyle + " flex-1"} onKeyDown={(e) => e.key === "Enter" && setQuote()} autoFocus />
                    <button onClick={setQuote} className="px-3 py-2 rounded-md text-xs font-semibold text-white bg-brand-600">OK</button>
                    <button onClick={() => setShowQI(false)} className="px-2 py-2 rounded-md text-xs text-slate-500 bg-white/5">✕</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-500 p-2">Zadanie bez wyceny</div>
            )}
          </Section>

          {/* Deadline */}
          <Section label="Termin">
            {canEdit ? (
              <input type="date" value={lt.deadline ? new Date(lt.deadline).toISOString().split("T")[0] : ""}
                onChange={(e) => setDeadline(e.target.value)}
                className={inputStyle} style={{ colorScheme: "dark" }} />
            ) : (
              <div className="text-sm text-slate-400">{lt.deadline ? fmtDate(lt.deadline) : "Nie ustalono"}</div>
            )}
          </Section>

          {/* Files */}
          <Section label={`Pliki (${lt.files?.length || 0})`}
            action={
              <label className="text-xs text-brand-400 font-semibold cursor-pointer hover:text-brand-200">
                {uploading ? "Wysyłanie..." : "+ Dodaj"}
                <input ref={fRef} type="file" className="hidden" onChange={uploadFile} disabled={uploading} />
              </label>
            }>
            {(lt.files?.length || 0) > 0 ? (
              <div className="flex flex-col gap-1">
                {lt.files.map((f) => (
                  <a key={f.id} href={f.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-white/[0.03] border border-white/[0.03]">
                    <span className="text-sm">📄</span>
                    <span className="text-xs text-slate-300 flex-1 truncate">{f.fileName}</span>
                    <span className="text-[10px] text-slate-600">{fmtSize(f.fileSize)}</span>
                  </a>
                ))}
              </div>
            ) : <div className="text-xs text-slate-600">Brak plików</div>}
          </Section>

          {/* Usuń zadanie (admin i współpracownik) */}
          {canDelete && (
            <div className="pt-2 border-t border-white/5">
              <button onClick={deleteTask} disabled={deleting}
                className="w-full py-2.5 rounded-lg text-xs font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 transition-colors disabled:opacity-50">
                {deleting ? "Usuwanie..." : "Usuń zadanie całkowicie"}
              </button>
            </div>
          )}

          {/* Comments */}
          <Section label={`Komentarze (${lt.comments?.length || 0})`}>
            <div className="max-h-[200px] overflow-y-auto flex flex-col gap-1.5 mb-2.5">
              {(lt.comments?.length || 0) === 0 && <div className="text-xs text-slate-600 p-2">Brak komentarzy</div>}
              {(lt.comments || []).map((c) => (
                <div key={c.id} className="px-3 py-2 rounded-lg border border-white/[0.03]"
                  style={{ background: c.authorRole === role ? "rgba(59,130,246,0.06)" : "rgba(255,255,255,0.015)" }}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[11px] font-semibold" style={{ color: ROLE_CFG[c.authorRole]?.color }}>
                      {ROLE_CFG[c.authorRole]?.label}
                    </span>
                    <span className="text-[10px] text-slate-600">{timeAgo(c.createdAt)}</span>
                  </div>
                  <div className="text-[13px] text-slate-300 leading-snug">{c.content}</div>
                </div>
              ))}
              <div ref={cRef} />
            </div>
            <div className="flex gap-2">
              <input value={comment} onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addComment()}
                placeholder="Napisz komentarz..."
                className={inputStyle + " flex-1"} />
              <button onClick={addComment}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 whitespace-nowrap">
                Wyślij
              </button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
