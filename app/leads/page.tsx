"use client";

import { useEffect, useMemo, useState } from "react";

type LeadStatus = "new" | "contacted" | "sold" | "discarded";

type Lead = {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  status: LeadStatus;
  assigned_promocode: string | null;
};

type LeadActivity = {
  id: string;
  lead_id: string;
  activity_type: string;
  message_text: string | null;
  promocode: string | null;
  created_at: string;
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  sold: "Vendido",
  discarded: "Descartado",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      const [leadsRes, activitiesRes] = await Promise.all([
        fetch("/api/leads"),
        fetch("/api/lead-activity-list"),
      ]);

      const leadsData = await leadsRes.json();
      const activitiesData = await activitiesRes.json();

      setLeads(leadsData.leads || []);
      setActivities(activitiesData.activities || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function openWhatsApp(phone: string, message: string) {
    const cleanPhone = phone.replace(/\D/g, "");
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  async function logActivity(
    leadId: string,
    activityType: string,
    messageText?: string,
    promocode?: string
  ) {
    await fetch("/api/lead-activity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        leadId,
        activityType,
        messageText,
        promocode,
      }),
    });
  }

  function buildFirstContactMessage(lead: Lead) {
    return `Hola ${lead.name} 😊

Gracias por completar el diagnóstico de Senda Natural.

Ya he visto tu perfil y te puedo ayudar a elegir la opción más adecuada para tu piel.

Antes de recomendarte nada, quiero hacerte una pregunta rápida para afinar mejor 👇`;
  }

  function buildFollowUpMessage(lead: Lead) {
    return `Hola ${lead.name} 😊

Solo paso por aquí para retomar tu diagnóstico.

Si quieres, te ayudo a aterrizar la opción que mejor encaja contigo según lo que necesita tu piel ahora mismo.`;
  }

  function buildClosingMessage(lead: Lead) {
    return `Hola ${lead.name} 😊

Por lo que hemos visto, ya tengo bastante claro qué opción puede encajar mejor contigo.

Si quieres, te preparo la recomendación final y te explico cómo usarla paso a paso.`;
  }

  async function sendMessage(
    lead: Lead,
    kind: "first_contact" | "follow_up" | "closing"
  ) {
    let message = "";

    if (kind === "first_contact") message = buildFirstContactMessage(lead);
    if (kind === "follow_up") message = buildFollowUpMessage(lead);
    if (kind === "closing") message = buildClosingMessage(lead);

    openWhatsApp(lead.phone, message);
    await logActivity(lead.id, kind, message);
    await fetchAll();
  }

  async function sendWithCode(lead: Lead) {
    try {
      const res = await fetch("/api/promocode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leadId: lead.id }),
      });

      const data = await res.json();

      if (!data.code) {
        alert("Error generando código");
        return;
      }

      const message = `Hola ${lead.name} 😊

Ya tengo tu recomendación personalizada.

Te asigno tu código para aplicar el beneficio:

Código: ${data.code}

Si quieres te explico cómo usarlo paso a paso.`;

      openWhatsApp(lead.phone, message);
      await logActivity(lead.id, "code_sent", message, data.code);
      await fetchAll();
    } catch (error) {
      console.error(error);
      alert("Error enviando mensaje");
    }
  }

  async function updateStatus(leadId: string, status: LeadStatus) {
    try {
      await fetch("/api/leads", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leadId, status }),
      });

      await fetchAll();
    } catch (error) {
      console.error(error);
    }
  }

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesStatus =
        statusFilter === "all" ? true : lead.status === statusFilter;

      const q = search.trim().toLowerCase();
      const matchesSearch =
        q === ""
          ? true
          : lead.name?.toLowerCase().includes(q) ||
            lead.phone?.toLowerCase().includes(q) ||
            (lead.assigned_promocode || "").toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [leads, statusFilter, search]);

  function activitiesForLead(leadId: string) {
    return activities.filter((a) => a.lead_id === leadId);
  }

  return (
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
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 34, color: "#1f1a17" }}>Leads captados</h1>
          <p style={{ color: "#5f574f", lineHeight: 1.6 }}>
            Gestiona contactos, asigna promocodes y revisa el historial de cada lead.
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e8e2d9",
            borderRadius: 18,
            padding: 16,
            marginBottom: 24,
            display: "grid",
            gap: 12,
            gridTemplateColumns: "1fr 220px",
          }}
        >
          <input
            type="text"
            placeholder="Buscar por nombre, WhatsApp o promocode"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #d8cec2",
              fontSize: 15,
              boxSizing: "border-box",
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as LeadStatus | "all")
            }
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #d8cec2",
              fontSize: 15,
              boxSizing: "border-box",
            }}
          >
            <option value="all">Todos los estados</option>
            <option value="new">Nuevos</option>
            <option value="contacted">Contactados</option>
            <option value="sold">Vendidos</option>
            <option value="discarded">Descartados</option>
          </select>
        </div>

        {loading && <p>Cargando...</p>}

        {!loading && filteredLeads.length === 0 && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #e8e2d9",
              borderRadius: 18,
              padding: 24,
              color: "#5f574f",
            }}
          >
            No hay leads para este filtro.
          </div>
        )}

        {!loading && filteredLeads.length > 0 && (
          <div style={{ display: "grid", gap: 16 }}>
            {filteredLeads.map((lead) => {
              const leadActivities = activitiesForLead(lead.id);
              const isOpen = openLeadId === lead.id;

              return (
                <div
                  key={lead.id}
                  style={{
                    background: "#fff",
                    border: "1px solid #e8e2d9",
                    borderRadius: 18,
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      flexWrap: "wrap",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 20,
                          fontWeight: 700,
                          color: "#1f1a17",
                        }}
                      >
                        {lead.name || "Sin nombre"}
                      </p>

                      <p style={{ margin: "6px 0 0", color: "#5f574f" }}>
                        {lead.phone}
                      </p>
                    </div>

                    <div>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: getStatusBg(lead.status),
                          color: getStatusColor(lead.status),
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        {STATUS_LABELS[lead.status || "new"]}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 8,
                      color: "#5f574f",
                      marginBottom: 16,
                    }}
                  >
                    <p style={{ margin: 0 }}>
                      <strong>Promocode:</strong>{" "}
                      {lead.assigned_promocode || "Sin asignar"}
                    </p>
                    <p style={{ margin: 0, fontSize: 13 }}>
                      <strong>Fecha:</strong>{" "}
                      {new Date(lead.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() => sendMessage(lead, "first_contact")}
                      style={buttonSecondaryStyle}
                    >
                      Primer contacto
                    </button>

                    <button
                      onClick={() => sendMessage(lead, "follow_up")}
                      style={buttonSecondaryStyle}
                    >
                      Seguimiento
                    </button>

                    <button
                      onClick={() => sendMessage(lead, "closing")}
                      style={buttonSecondaryStyle}
                    >
                      Cierre
                    </button>

                    <button
                      onClick={() => sendWithCode(lead)}
                      style={buttonPrimaryStyle}
                    >
                      Enviar con código
                    </button>

                    <select
                      value={lead.status || "new"}
                      onChange={(e) =>
                        updateStatus(lead.id, e.target.value as LeadStatus)
                      }
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #d8cec2",
                        background: "#fff",
                      }}
                    >
                      <option value="new">Nuevo</option>
                      <option value="contacted">Contactado</option>
                      <option value="sold">Vendido</option>
                      <option value="discarded">Descartado</option>
                    </select>

                    <button
                      onClick={() => setOpenLeadId(isOpen ? null : lead.id)}
                      style={buttonSecondaryStyle}
                    >
                      {isOpen ? "Ocultar historial" : "Ver historial"}
                    </button>
                  </div>

                  {isOpen && (
                    <div
                      style={{
                        marginTop: 18,
                        borderTop: "1px solid #eee6dc",
                        paddingTop: 14,
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 10px",
                          fontWeight: 700,
                          color: "#1f1a17",
                        }}
                      >
                        Historial del lead
                      </p>

                      {leadActivities.length === 0 ? (
                        <p style={{ color: "#6d6257", margin: 0 }}>
                          Todavía no hay actividad registrada.
                        </p>
                      ) : (
                        <div style={{ display: "grid", gap: 10 }}>
                          {leadActivities.map((activity) => (
                            <div
                              key={activity.id}
                              style={{
                                border: "1px solid #eee6dc",
                                borderRadius: 12,
                                padding: 12,
                                background: "#fcfaf7",
                              }}
                            >
                              <p style={{ margin: 0, fontWeight: 700 }}>
                                {activity.activity_type}
                              </p>

                              {activity.promocode && (
                                <p style={{ margin: "6px 0 0", color: "#5f574f" }}>
                                  Código: {activity.promocode}
                                </p>
                              )}

                              {activity.message_text && (
                                <p
                                  style={{
                                    margin: "6px 0 0",
                                    color: "#5f574f",
                                    whiteSpace: "pre-wrap",
                                  }}
                                >
                                  {activity.message_text}
                                </p>
                              )}

                              <p
                                style={{
                                  margin: "8px 0 0",
                                  fontSize: 12,
                                  color: "#7a6f63",
                                }}
                              >
                                {new Date(activity.created_at).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function getStatusBg(status: LeadStatus) {
  if (status === "new") return "#eef4ff";
  if (status === "contacted") return "#fff7e8";
  if (status === "sold") return "#eaf7ee";
  return "#f4f4f4";
}

function getStatusColor(status: LeadStatus) {
  if (status === "new") return "#2458a6";
  if (status === "contacted") return "#a56a00";
  if (status === "sold") return "#1f7a3d";
  return "#666";
}

const buttonPrimaryStyle: React.CSSProperties = {
  padding: "10px 14px",
  border: "1px solid #2f5d50",
  borderRadius: 10,
  background: "#2f5d50",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

const buttonSecondaryStyle: React.CSSProperties = {
  padding: "10px 14px",
  border: "1px solid #111",
  borderRadius: 10,
  background: "#fff",
  color: "#111",
  cursor: "pointer",
  fontWeight: 600,
};