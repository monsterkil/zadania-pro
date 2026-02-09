"use client";

export default function Notification({ message }) {
  if (!message) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] animate-slide-down">
      <div className="px-5 py-3 rounded-xl text-sm text-slate-200 max-w-[90vw] text-center whitespace-nowrap"
        style={{
          background: "#1e293b",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
        }}>
        {message}
      </div>
    </div>
  );
}
