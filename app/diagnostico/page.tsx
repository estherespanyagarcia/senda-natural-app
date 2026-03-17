"use client";

import { useMemo, useState } from "react";

type StepKey =
  | "gender"
  | "age_range"
  | "skin_type"
  | "concern"
  | "name"
  | "phone"
  | "consent";

type FormState = {
  gender: string;
  age_range: string;
  skin_type: string;
  concern: string;
  name: string;
  phone: string;
  consent: boolean;
};

const STEPS: {
  key: StepKey;
  title: string;
  subtitle: string;
  options?: { value: string; label: string }[];
  inputType?: "text" | "tel";
  placeholder?: string;
}[] = [
  {
    key: "gender",
    title: "¿Para quién es la recomendación?",
    subtitle: "Esto nos ayuda a orientar mejor la guía.",
    options: [
      { value: "women", label: "Mujer" },
      { value: "men", label: "Hombre" },
    ],
  },
  {
    key: "age_range",
    title: "¿En qué rango de edad estás?",
    subtitle: "La piel cambia con el tiempo y eso influye en la orientación.",
    options: [
      { value: "13-18", label: "13-18" },
      { value: "18-25", label: "18-25" },
      { value: "25-35", label: "25-35" },
      { value: "35-50", label: "35-50" },
      { value: "50+", label: "50+" },
    ],
  },
  {
    key: "skin_type",
    title: "¿Cómo describirías tu piel?",
    subtitle: "Elige la opción que mejor encaje contigo hoy.",
    options: [
      { value: "oily", label: "Grasa" },
      { value: "combination", label: "Mixta" },
      { value: "normal", label: "Normal" },
      { value: "dry", label: "Seca" },
    ],
  },
  {
    key: "concern",
    title: "¿Qué te gustaría priorizar ahora mismo?",
    subtitle: "Elige la necesidad principal que quieres trabajar.",
    options: [
      { value: "dehydration", label: "Deshidratación" },
      { value: "wrinkles", label: "Líneas / arrugas" },
      { value: "balance", label: "Equilibrio / brillo" },
    ],
  },
  {
    key: "name",
    title: "¿Cómo te llamas?",
    subtitle: "Así podremos personalizar mejor tu acompañamiento.",
    inputType: "text",
    placeholder: "Tu nombre",
  },
  {
    key: "phone",
    title: "Déjanos tu WhatsApp",
    subtitle:
      "Te enviaremos la recomendación final ajustada a tu caso por WhatsApp.",
    inputType: "tel",
    placeholder: "Ejemplo: +34639858320",
  },
  {
    key: "consent",
    title: "Antes de ver tu guía",
    subtitle:
      "Necesitamos tu autorización para guardar tus datos y poder contactarte por WhatsApp.",
  },
];

const LABELS: Record<string, string> = {
  women: "Mujer",
  men: "Hombre",
  "13-18": "13-18",
  "18-25": "18-25",
  "25-35": "25-35",
  "35-50": "35-50",
  "50+": "50+",
  oily: "Grasa",
  combination: "Mixta",
  normal: "Normal",
  dry: "Seca",
  dehydration: "Deshidratación",
  wrinkles: "Líneas / arrugas",
  balance: "Equilibrio / brillo",
};

export default function DiagnosticoPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>({
    gender: "",
    age_range: "",
    skin_type: "",
    concern: "",
    name: "",
    phone: "",
    consent: false,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const canContinue = useMemo(() => {
    const value = form[currentStep.key];

    if (currentStep.key === "phone") {
      return String(value).trim().length >= 8;
    }

    if (currentStep.key === "name") {
      return String(value).trim().length >= 2;
    }

    if (currentStep.key === "consent") {
      return form.consent === true;
    }

    return Boolean(value);
  }, [form, currentStep.key]);

  function setValue(key: StepKey, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function goNext() {
    if (!canContinue) return;
    if (!isLastStep) setStepIndex((prev) => prev + 1);
  }

  function goBack() {
    if (stepIndex > 0) setStepIndex((prev) => prev - 1);
  }

  async function handleFinish() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      setResult({
        error: "Ha ocurrido un error obteniendo tu guía personalizada.",
      });
    } finally {
      setLoading(false);
    }
  }

  function restartQuiz() {
    setForm({
      gender: "",
      age_range: "",
      skin_type: "",
      concern: "",
      name: "",
      phone: "",
      consent: false,
    });
    setResult(null);
    setStepIndex(0);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f3ee",
        padding: "32px 16px",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div
          style={{
            background: "#fff",
            border: "1px solid #e8e2d9",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "#7a6f63",
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              Diagnóstico Senda Natural
            </p>

            <h1
              style={{
                margin: "8px 0 10px",
                fontSize: 32,
                lineHeight: 1.1,
                color: "#1f1a17",
              }}
            >
              Encuentra una guía más alineada con tu piel
            </h1>

            <p
              style={{
                margin: 0,
                color: "#5f574f",
                lineHeight: 1.6,
                fontSize: 16,
              }}
            >
              Responde unas preguntas rápidas y te orientaremos con una guía
              personalizada. Después podrás continuar por WhatsApp para recibir
              la recomendación final ajustada a tu caso.
            </p>
          </div>

          {!result && (
            <>
              <div style={{ marginBottom: 22 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8,
                    fontSize: 14,
                    color: "#6a6259",
                  }}
                >
                  <span>
                    Paso {stepIndex + 1} de {STEPS.length}
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>

                <div
                  style={{
                    width: "100%",
                    height: 10,
                    borderRadius: 999,
                    background: "#eee6dc",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      background: "#2f5d50",
                      borderRadius: 999,
                      transition: "width 200ms ease",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #eee6dc",
                  borderRadius: 18,
                  padding: 22,
                  background: "#fcfaf7",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#8a7f74",
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {currentStep.key === "gender" && "Perfil"}
                  {currentStep.key === "age_range" && "Edad"}
                  {currentStep.key === "skin_type" && "Tipo de piel"}
                  {currentStep.key === "concern" && "Prioridad"}
                  {currentStep.key === "name" && "Datos de contacto"}
                  {currentStep.key === "phone" && "WhatsApp"}
                  {currentStep.key === "consent" && "Consentimiento"}
                </p>

                <h2
                  style={{
                    margin: "8px 0 8px",
                    fontSize: 28,
                    lineHeight: 1.15,
                    color: "#211b17",
                  }}
                >
                  {currentStep.title}
                </h2>

                <p
                  style={{
                    margin: "0 0 20px",
                    color: "#5f574f",
                    lineHeight: 1.6,
                  }}
                >
                  {currentStep.subtitle}
                </p>

                {currentStep.options && (
                  <div style={{ display: "grid", gap: 12 }}>
                    {currentStep.options.map((option) => {
                      const selected = form[currentStep.key] === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setValue(currentStep.key, option.value)}
                          style={{
                            textAlign: "left",
                            padding: "16px 18px",
                            borderRadius: 14,
                            border: selected
                              ? "2px solid #2f5d50"
                              : "1px solid #ddd4c8",
                            background: selected ? "#eef6f3" : "#fff",
                            color: "#1f1a17",
                            cursor: "pointer",
                            fontSize: 16,
                            fontWeight: selected ? 700 : 500,
                            transition: "all 150ms ease",
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {!currentStep.options && currentStep.key !== "consent" && (
                  <div>
                    <input
                      type={currentStep.inputType}
                      placeholder={currentStep.placeholder}
                      value={String(form[currentStep.key] ?? "")}
                      onChange={(e) =>
                        setValue(currentStep.key, e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "16px 18px",
                        borderRadius: 14,
                        border: "1px solid #ddd4c8",
                        background: "#fff",
                        color: "#1f1a17",
                        fontSize: 16,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    {currentStep.key === "phone" && (
                      <p
                        style={{
                          marginTop: 10,
                          marginBottom: 0,
                          fontSize: 13,
                          color: "#7a6f63",
                          lineHeight: 1.5,
                        }}
                      >
                        Usa tu número con prefijo internacional si lo prefieres.
                        Ejemplo: +34639858320
                      </p>
                    )}
                  </div>
                )}

                {currentStep.key === "consent" && (
                  <div
                    style={{
                      border: "1px solid #ddd4c8",
                      borderRadius: 14,
                      padding: 16,
                      background: "#fff",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                        cursor: "pointer",
                        color: "#2a241f",
                        lineHeight: 1.6,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.consent}
                        onChange={(e) => setValue("consent", e.target.checked)}
                        style={{ marginTop: 4 }}
                      />
                      <span>
                        Acepto que Senda Natural guarde mis datos para enviarme
                        mi guía personalizada y contactarme por WhatsApp en
                        relación con mi diagnóstico.
                      </span>
                    </label>

                    <p
                      style={{
                        marginTop: 12,
                        marginBottom: 0,
                        fontSize: 13,
                        color: "#7a6f63",
                        lineHeight: 1.5,
                      }}
                    >
                      Puedes solicitar la modificación o eliminación de tus datos
                      cuando quieras.
                    </p>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 24,
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={stepIndex === 0}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 12,
                      border: "1px solid #d7cec3",
                      background: stepIndex === 0 ? "#f2eee9" : "#fff",
                      color: stepIndex === 0 ? "#a59a8d" : "#2c251f",
                      cursor: stepIndex === 0 ? "not-allowed" : "pointer",
                      minWidth: 120,
                    }}
                  >
                    Atrás
                  </button>

                  {!isLastStep ? (
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!canContinue}
                      style={{
                        padding: "12px 18px",
                        borderRadius: 12,
                        border: "1px solid #2f5d50",
                        background: canContinue ? "#2f5d50" : "#95afa7",
                        color: "#fff",
                        cursor: canContinue ? "pointer" : "not-allowed",
                        minWidth: 140,
                        fontWeight: 600,
                      }}
                    >
                      Continuar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFinish}
                      disabled={!canContinue || loading}
                      style={{
                        padding: "12px 18px",
                        borderRadius: 12,
                        border: "1px solid #2f5d50",
                        background:
                          canContinue && !loading ? "#2f5d50" : "#95afa7",
                        color: "#fff",
                        cursor:
                          canContinue && !loading ? "pointer" : "not-allowed",
                        minWidth: 180,
                        fontWeight: 600,
                      }}
                    >
                      {loading ? "Preparando guía..." : "Ver mi guía"}
                    </button>
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: 18,
                  padding: 16,
                  borderRadius: 16,
                  background: "#f8f4ee",
                  border: "1px solid #eee6dc",
                }}
              >
                <p
                  style={{
                    margin: "0 0 10px",
                    fontWeight: 700,
                    color: "#2a241f",
                  }}
                >
                  Tu resumen hasta ahora
                </p>

                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    color: "#5f574f",
                    fontSize: 15,
                  }}
                >
                  <span>
                    Sexo: {form.gender ? LABELS[form.gender] : "Sin responder"}
                  </span>
                  <span>
                    Edad:{" "}
                    {form.age_range ? LABELS[form.age_range] : "Sin responder"}
                  </span>
                  <span>
                    Tipo de piel:{" "}
                    {form.skin_type ? LABELS[form.skin_type] : "Sin responder"}
                  </span>
                  <span>
                    Prioridad:{" "}
                    {form.concern ? LABELS[form.concern] : "Sin responder"}
                  </span>
                  <span>
                    Nombre: {form.name ? form.name : "Sin responder"}
                  </span>
                  <span>
                    WhatsApp: {form.phone ? form.phone : "Sin responder"}
                  </span>
                  <span>
                    Consentimiento: {form.consent ? "Aceptado" : "Pendiente"}
                  </span>
                </div>
              </div>
            </>
          )}

          {result?.guide && (
            <div style={{ marginTop: 8 }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "#edf5f2",
                  color: "#2f5d50",
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                Tu resultado
              </div>

              <h2
                style={{
                  fontSize: 30,
                  lineHeight: 1.15,
                  margin: "0 0 16px",
                  color: "#1f1a17",
                }}
              >
                {result.guide.title}
              </h2>

              <div
                style={{
                  border: "1px solid #e6ddd2",
                  borderRadius: 18,
                  padding: 24,
                  background: "#fcfaf7",
                }}
              >
                <p
                  style={{
                    fontSize: 18,
                    lineHeight: 1.7,
                    color: "#2b241f",
                    marginTop: 0,
                    marginBottom: 20,
                  }}
                >
                  {result.guide.summary}
                </p>

                <p
                  style={{
                    marginBottom: 12,
                    fontWeight: 700,
                    color: "#2a241f",
                  }}
                >
                  Qué priorizar en tu cuidado
                </p>

                <ul
                  style={{
                    paddingLeft: 20,
                    lineHeight: 1.9,
                    color: "#4f483f",
                    marginTop: 0,
                  }}
                >
                  {result.guide.focus.map((item: string) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                <a
                  href={`https://wa.me/34639858320?text=${result.guide.whatsappText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    marginTop: 24,
                    padding: "14px 20px",
                    borderRadius: 14,
                    background: "#111",
                    color: "#fff",
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  {result.guide.cta_label}
                </a>

                <p
                  style={{
                    marginTop: 14,
                    fontSize: 14,
                    color: "#6d6257",
                    lineHeight: 1.6,
                  }}
                >
                  La recomendación final se ajusta contigo según sensibilidad,
                  textura preferida y momento actual de tu piel.
                </p>
              </div>

              <button
                type="button"
                onClick={restartQuiz}
                style={{
                  marginTop: 18,
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: "1px solid #d7cec3",
                  background: "#fff",
                  color: "#2c251f",
                  cursor: "pointer",
                }}
              >
                Hacer el diagnóstico otra vez
              </button>
            </div>
          )}

          {result?.error && !result?.guide && (
            <div
              style={{
                marginTop: 20,
                border: "1px solid #ead8d8",
                background: "#fff5f5",
                color: "#6f2d2d",
                borderRadius: 14,
                padding: 16,
              }}
            >
              <h2 style={{ marginTop: 0 }}>No pudimos generar tu guía</h2>
              <p style={{ marginBottom: 0 }}>{result.error}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}