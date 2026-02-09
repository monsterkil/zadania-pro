"use client";
import { useState } from "react";

export default function NewTaskModal({ role, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiresQuote, setRequiresQuote] = useState(true);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const canSetQuote = role === "admin" || role === "collaborator";

  const handleSubmit = async () => {
    if (!title.trim() || loading) return;
    setLoading(true);

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

      if (res.ok) {
        const task = await res.json();
        onCreated(task);
        onClose();
      }
    } catch {}
    setLoading(false);
  };

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm text-slate-100 outline-none placeholder:text-slate-600 bg-white/[0.03] border border-white/[0.07] focus:border-white/[0.15] transition-colors";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] rounded-2xl p-6 animate-scale-in"
        style={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>

        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-slate-50">Nowe zadanie</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 bg-white/5">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-500 font-semibold mb-1.5">Tytuł *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Np. Nowy landing page"
              className={inputCls} autoFocus />
          </div>

          <div>
            <label className="block text-xs text-slate-500 font-semibold mb-1.5">Opis</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Szczegółowy opis zadania..."
              rows={4}
              className={inputCls + " resize-y font-[inherit]"} />
          </div>

          {/* Quote toggle */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div onClick={() => setRequiresQuote(!requiresQuote)}
              className="w-10 h-[22px] rounded-full relative cursor-pointer transition-colors flex-shrink-0"
              style={{ background: requiresQuote ? "#3b82f6" : "rgba(255,255,255,0.1)" }}>
              <div className="w-[18px] h-[18px] rounded-full bg-white absolute top-[2px] transition-[left]"
                style={{ left: requiresQuote ? 20 : 2 }} />
            </div>
            <span className="text-sm text-slate-300">Wymaga wyceny</span>
          </div>

          {requiresQuote && canSetQuote && (
            <div className="animate-fade-in">
              <label className="block text-xs text-slate-500 font-semibold mb-1.5">Kwota wyceny (PLN)</label>
              <input type="number" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)}
                placeholder="Opcjonalne — dodaj później"
                className={inputCls} />
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
