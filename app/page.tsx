"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f3ee",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* HERO */}
      <section
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "80px 20px 60px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 13,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: "#7a6f63",
            marginBottom: 12,
          }}
        >
          Senda Natural
        </p>

        <h1
          style={{
            fontSize: 42,
            lineHeight: 1.2,
            marginBottom: 20,
            color: "#1f1a17",
          }}
        >
          Descubre qué necesita realmente tu piel
        </h1>

        <p
          style={{
            fontSize: 18,
            color: "#5f574f",
            maxWidth: 600,
            margin: "0 auto 30px",
            lineHeight: 1.6,
          }}
        >
          Responde unas preguntas rápidas y recibe una guía personalizada según
          tu tipo de piel, edad y necesidades actuales.
        </p>

        <Link href="/diagnostico">
          <button
            style={{
              padding: "16px 28px",
              borderRadius: 14,
              background: "#2f5d50",
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Hacer diagnóstico gratuito
          </button>
        </Link>
      </section>

      {/* BENEFICIOS */}
      <section
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: "40px 20px",
          display: "grid",
          gap: 20,
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          {[
            {
              title: "100% personalizado",
              text: "Adaptado a tu tipo de piel, edad y necesidad principal.",
            },
            {
              title: "Sin complicaciones",
              text: "Te guiamos de forma simple, sin rutinas complejas.",
            },
            {
              title: "Acompañamiento real",
              text: "Te ayudamos personalmente por WhatsApp.",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: "#fff",
                padding: 20,
                borderRadius: 16,
                border: "1px solid #e8e2d9",
              }}
            >
              <h3 style={{ marginBottom: 8 }}>{item.title}</h3>
              <p style={{ color: "#5f574f", lineHeight: 1.6 }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "60px 20px",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: 32, marginBottom: 30 }}>
          ¿Cómo funciona?
        </h2>

        <div
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {[
            "Respondes unas preguntas rápidas",
            "Analizamos tu perfil de piel",
            "Recibes una guía personalizada",
            "Te acompañamos por WhatsApp",
          ].map((text, i) => (
            <div
              key={i}
              style={{
                background: "#fcfaf7",
                padding: 20,
                borderRadius: 16,
                border: "1px solid #eee6dc",
              }}
            >
              <p style={{ fontWeight: 600 }}>{i + 1}</p>
              <p style={{ color: "#5f574f" }}>{text}</p>
            </div>
          ))}
        </div>

        <Link href="/diagnostico">
          <button
            style={{
              marginTop: 40,
              padding: "16px 28px",
              borderRadius: 14,
              background: "#111",
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Empezar ahora
          </button>
        </Link>
      </section>

      {/* CTA FINAL */}
      <section
        style={{
          background: "#2f5d50",
          color: "#fff",
          textAlign: "center",
          padding: "60px 20px",
          marginTop: 40,
        }}
      >
        <h2 style={{ fontSize: 30, marginBottom: 20 }}>
          Tu piel cambia. Tu rutina también debería hacerlo.
        </h2>

        <p style={{ marginBottom: 30, opacity: 0.9 }}>
          Descubre qué necesita tu piel ahora mismo y déjate guiar.
        </p>

        <Link href="/diagnostico">
          <button
            style={{
              padding: "16px 28px",
              borderRadius: 14,
              background: "#fff",
              color: "#2f5d50",
              fontSize: 16,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Hacer diagnóstico
          </button>
        </Link>
      </section>
    </main>
  );
}