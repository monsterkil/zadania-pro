"use client";
import { useState, useRef } from "react";

const DEFAULT_DRAFT = { title: "", description: "", requiresQuote: false, quoteAmount: "" };

export default function NewTaskModal({ role, draft = DEFAULT_DRAFT, setDraft, onClose, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const backdropMousedownRef = useRef(false);

  const title = draft.title ?? "";
  const description = draft.description ?? "";
  const requiresQuote = draft.requiresQuote ?? false;
  const quoteAmount = draft.quoteAmount ?? "";
  const updateDraft = (changes) => setDraft?.((prev) => ({ ...prev, ...changes })) ?? (() => {});

  const canSetQuote = role === "admin" || role === "admin2" || role === "collaborator";

  const handleSubmit = async () => {
    if (!title.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          requiresQuote,
          quoteAmount: canSetQuote && quoteAmount ? parseFloat(quoteAmount) : null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        const task = data;
        onCreated(normalizeTask(task));
        setDraft?.(DEFAULT_DRAFT);
        onClose();
        return;
      }

      if (res.status === 401) {
        setError("Sesja wygasła. Zaloguj się ponownie.");
        return;
      }
      setError(data?.error || `Błąd (${res.status}). Spróbuj ponownie.`);
    } catch (e) {
      setError("Błąd połączenia. Sprawdź internet i spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  };

  function normalizeTask(t) {
    return {
      ...t,
      quoteAmount: t.quoteAmount != null ? parseFloat(t.quoteAmount) : null,
      files: t.files ?? [],
      comments: t.comments ?? [],
    };
  }

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm text-slate-100 outline-none placeholder:text-slate-600 bg-white/[0.03] border border-white/[0.07] focus:border-white/[0.15] transition-colors";

  const handleBackdropClick = (e) => {
    if (e.target !== e.currentTarget) return;
    if (backdropMousedownRef.current) onClose();
    backdropMousedownRef.current = false;
  };
  const handleBackdropMouseDown = (e) => {
    if (e.target === e.currentTarget) backdropMousedownRef.current = true;
  };
  const handleBackdropMouseUp = (e) => {
    if (e.target !== e.currentTarget) backdropMousedownRef.current = false;
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={handleBackdropClick}
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] rounded-2xl p-6 animate-scale-in"
        style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>

        <div className="flex justify-between items-center mb-6 py-1">
          <h2 className="text-xl font-bold text-slate-50">Nowe zadanie</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 bg-white/5">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-500 font-semibold mb-2">Tytuł *</label>
            <input value={title} onChange={(e) => updateDraft({ title: e.target.value })}
              placeholder="Np. Nowy landing page"
              className={inputCls} autoFocus />
          </div>

          <div>
            <label className="block text-sm text-slate-500 font-semibold mb-2">Opis</label>
            <textarea value={description} onChange={(e) => updateDraft({ description: e.target.value })}
              placeholder="Szczegółowy opis zadania..."
              rows={4}
              className={inputCls + " resize-y font-[inherit]"} />
          </div>

          {/* Quote toggle */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div onClick={() => updateDraft({ requiresQuote: !requiresQuote })}
              className="w-10 h-[22px] rounded-full relative cursor-pointer transition-colors flex-shrink-0"
              style={{ background: requiresQuote ? "#3b82f6" : "rgba(255,255,255,0.1)" }}>
              <div className="w-[18px] h-[18px] rounded-full bg-white absolute top-[2px] transition-[left]"
                style={{ left: requiresQuote ? 20 : 2 }} />
            </div>
            <span className="text-sm text-slate-300">Wymaga wyceny</span>
          </div>

          {requiresQuote && canSetQuote && (
            <div className="animate-fade-in">
              <label className="block text-sm text-slate-500 font-semibold mb-2">Kwota wyceny (PLN)</label>
              <input type="number" value={quoteAmount} onChange={(e) => updateDraft({ quoteAmount: e.target.value })}
                placeholder="Opcjonalne — dodaj później"
                className={inputCls} />
            </div>
          )}

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={!title.trim() || loading}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40 mt-2"
            style={{ background: title.trim() ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "#1e3a5f" }}>
            {loading ? "Tworzenie..." : "Dodaj zadanie"}
          </button>
        </div>
      </div>
    </div>
  );
}
