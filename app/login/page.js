"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = [
  { key: "admin", label: "Admin 1", color: "#3b82f6" },
  { key: "admin2", label: "Admin 2", color: "#2563eb" },
  { key: "collaborator", label: "Współpracownik", color: "#7c3aed" },
  { key: "client", label: "Paweł", color: "#059669" },
];

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!selectedRole || !password) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(data.error || "Błąd logowania");
      }
    } catch {
      setError("Błąd połączenia");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
      <div className="w-full max-w-sm">
        <div className="rounded-2xl p-10"
          style={{
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
          {/* Logo */}
          <div className="text-center mb-9">
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-brand-400">Zadania</span>{" "}
              <span className="text-slate-100">Pro</span>
            </h1>
            <p className="text-sm text-slate-500 mt-2">Panel zarządzania zadaniami</p>
          </div>

          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-xs text-slate-500 font-semibold mb-2 tracking-wider">
              WYBIERZ ROLĘ
            </label>
            <div className="flex flex-col gap-2">
              {ROLES.map((role) => (
                <button
                  key={role.key}
                  onClick={() => { setSelectedRole(role.key); setError(""); }}
                  className="w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition-all"
                  style={{
                    border: selectedRole === role.key
                      ? `2px solid ${role.color}`
                      : "2px solid rgba(255,255,255,0.06)",
                    background: selectedRole === role.key
                      ? `${role.color}15`
                      : "rgba(255,255,255,0.02)",
                    color: selectedRole === role.key ? role.color : "#94a3b8",
                  }}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          {/* Password */}
          {selectedRole && (
            <div className="flex flex-col gap-3 animate-fade-in">
              <input
                type="password"
                placeholder="Hasło"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full px-4 py-3 rounded-xl text-sm text-slate-100 outline-none placeholder:text-slate-600"
                style={{
                  border: "2px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                }}
                autoFocus
              />
              <button
                onClick={handleLogin}
                disabled={loading || !password}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50"
                style={{
                  background: ROLES.find((r) => r.key === selectedRole)?.color || "#3b82f6",
                }}
              >
                {loading ? "Logowanie..." : "Zaloguj się"}
              </button>
              {error && (
                <p className="text-red-400 text-sm text-center animate-slide-down">{error}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
