"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/AdminGuard";

type LeadStatus = "new" | "contacted" | "sold" | "discarded";

type Lead = {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  status: LeadStatus;
  assigned_promocode: string | null;
};

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const total = leads.length;
    const newCount = leads.filter((l) => l.status === "new").length;
    const contactedCount = leads.filter((l) => l.status === "contacted").length;
    const soldCount = leads.filter((l) => l.status === "sold").length;
    const discardedCount = leads.filter((l) => l.status === "discarded").length;

    const today = new Date();
    const isSameDay = (dateStr: string) => {
      const d = new Date(dateStr);
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    };

    const leadsToday = leads.filter((l) => isSameDay(l.created_at)).length;
    const soldToday = leads.filter(
      (l) => l.status === "sold" && isSameDay(l.created_at)
    ).length;

    const conversion =
      total > 0 ? Math.round((soldCount / total) * 100) : 0;

    return {
      total,
      newCount,
      contactedCount,
      soldCount,
      discardedCount,
      leadsToday,
      soldToday,
      conversion,
    };
  }, [leads]);

  const latestLeads = useMemo(() => leads.slice(0, 5), [leads]);

  return (
    <AdminGuard>
      <main
        style={{
          minHeight: "100vh",
          background: "#f7f3ee",
          padding: 32,
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 24,
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#7a6f63",
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                Panel interno
              </p>

              <h1
                style={{
                  margin: "8px 0 8px",
                  fontSize: 34,
                  color: "#1f1a17",
                }}
              >
                Dashboard comercial
              </h1>

              <p
                style={{
                  margin: 0,
                  color: "#5f574f",
                  lineHeight: 1.6,
                }}
              >
                Resumen rápido de leads, seguimiento y conversión.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/leads" style={buttonSecondaryStyle}>
                Ver leads
              </Link>

              <Link href="/diagnostico" style={buttonPrimaryStyle}>
                Ir al diagnóstico
              </Link>

              {/* BOTÓN LOGOUT */}
              <button
                onClick={() => {
                  localStorage.removeItem("sn_admin_auth");
                  window.location.href = "/admin";
                }}
                style={buttonSecondaryStyle}
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          {loading ? (
            <p>Cargando dashboard...</p>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gap: 16,
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  marginBottom: 24,
                }}
              >
                <MetricCard label="Leads totales" value={stats.total} />
                <MetricCard label="Leads hoy" value={stats.leadsToday} />
                <MetricCard label="Nuevos" value={stats.newCount} />
                <MetricCard label="Contactados" value={stats.contactedCount} />
                <MetricCard label="Vendidos" value={stats.soldCount} />
                <MetricCard label="Conversión" value={`${stats.conversion}%`} />
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 20,
                  gridTemplateColumns: "1.2fr 0.8fr",
                }}
              >
                {/* ÚLTIMOS LEADS */}
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e8e2d9",
                    borderRadius: 18,
                    padding: 20,
                  }}
                >
                  <h2 style={{ marginTop: 0, marginBottom: 16 }}>
                    Últimos leads
                  </h2>

                  {latestLeads.length === 0 ? (
                    <p style={{ color: "#5f574f" }}>
                      Todavía no hay leads.
                    </p>
                  ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                      {latestLeads.map((lead) => (
                        <div
                          key={lead.id}
                          style={{
                            border: "1px solid #eee6dc",
                            borderRadius: 14,
                            padding: 14,
                            background: "#fcfaf7",
                          }}
                        >
                          <p style={{ margin: 0, fontWeight: 700 }}>
                            {lead.name || "Sin nombre"}
                          </p>
                          <p style={{ margin: "4px 0", color: "#5f574f" }}>
                            {lead.phone}
                          </p>
                          <p style={{ fontSize: 13, color: "#7a6f63" }}>
                            {new Date(lead.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* EMBUDO */}
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e8e2d9",
                    borderRadius: 18,
                    padding: 20,
                  }}
                >
                  <h2 style={{ marginTop: 0, marginBottom: 16 }}>
                    Estado del embudo
                  </h2>

                  <FunnelRow label="Nuevos" value={stats.newCount} />
                  <FunnelRow label="Contactados" value={stats.contactedCount} />
                  <FunnelRow label="Vendidos" value={stats.soldCount} />
                  <FunnelRow label="Descartados" value={stats.discardedCount} />
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}

function MetricCard({ label, value }: { label: string; value: any }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e8e2d9",
        borderRadius: 16,
        padding: 18,
      }}
    >
      <p style={{ fontSize: 13, color: "#7a6f63" }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700 }}>{value}</p>
    </div>
  );
}

function FunnelRow({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: "1px solid #eee",
      }}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const buttonPrimaryStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 12,
  background: "#2f5d50",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 700,
};

const buttonSecondaryStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid #111",
  background: "#fff",
  color: "#111",
  textDecoration: "none",
  fontWeight: 700,
};