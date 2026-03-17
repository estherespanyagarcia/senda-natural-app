"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ADMIN_PASSWORD = "SendaNatural2026";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (password === ADMIN_PASSWORD) {
      localStorage.setItem("sn_admin_auth", "true");
      router.push("/dashboard");
      return;
    }

    setError("Clave incorrecta");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f7f3ee",
        padding: 20,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          border: "1px solid #e8e2d9",
          borderRadius: 20,
          padding: 24,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "#7a6f63",
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          Acceso interno
        </p>

        <h1 style={{ margin: "8px 0 12px", fontSize: 30 }}>
          Entrar al panel
        </h1>

        <p style={{ color: "#5f574f", lineHeight: 1.6 }}>
          Introduce la clave para acceder al dashboard y a la gestión de leads.
        </p>

        <form onSubmit={handleLogin} style={{ display: "grid", gap: 12 }}>
          <input
            type="password"
            placeholder="Clave de acceso"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid #d8cec2",
              fontSize: 16,
              boxSizing: "border-box",
            }}
          />

          <button
            type="submit"
            style={{
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid #2f5d50",
              background: "#2f5d50",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Entrar
          </button>
        </form>

        {error && (
          <p style={{ marginTop: 12, color: "#9c2f2f", fontWeight: 600 }}>
            {error}
          </p>
        )}
      </div>
    </main>
  );
}