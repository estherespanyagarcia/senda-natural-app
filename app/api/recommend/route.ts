import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function buildGuide(input: {
  gender: string;
  age_range: string;
  skin_type: string;
  concern: string;
  name?: string;
  phone?: string;
}) {
  const { gender, age_range, skin_type, concern, name, phone } = input;

  let summary =
    "Tu piel necesita una orientación personalizada que combine equilibrio, confort y constancia.";
  let focus: string[] = [
    "rutina sencilla y constante",
    "texturas agradables",
    "cuidado adaptado a tu momento de piel",
    "seguimiento personalizado",
  ];

  let whatsappText = `Hola, acabo de completar el diagnóstico de Senda Natural.%0A%0A`;
  if (name) whatsappText += `Mi nombre es: ${name}%0A`;
  if (phone) whatsappText += `Mi WhatsApp es: ${phone}%0A`;
  whatsappText += `%0AMi perfil es:%0A`;
  whatsappText += `- Sexo: ${gender}%0A`;
  whatsappText += `- Edad: ${age_range}%0A`;
  whatsappText += `- Tipo de piel: ${skin_type}%0A`;
  whatsappText += `- Necesidad principal: ${concern}%0A%0A`;
  whatsappText += `Quiero que me ayudes a elegir la opción más adecuada para mí.`;

  if (skin_type === "oily" && concern === "dehydration") {
    summary =
      "Tu piel necesita mantener el equilibrio sin renunciar a la hidratación. En este momento conviene priorizar fórmulas ligeras, frescas y cómodas que ayuden a aportar confort sin aumentar el brillo.";
    focus = [
      "hidratación ligera",
      "texturas frescas",
      "equilibrio del sebo",
      "rutina fácil de mantener",
    ];
  } else if (skin_type === "dry" && concern === "dehydration") {
    summary =
      "Tu piel necesita más confort, nutrición e hidratación sostenida. Lo ideal es reforzar la barrera cutánea y evitar rutinas demasiado ligeras que se queden cortas.";
    focus = [
      "hidratación profunda",
      "nutrición",
      "confort duradero",
      "refuerzo de barrera",
    ];
  } else if (skin_type === "combination" && concern === "wrinkles") {
    summary =
      "Tu piel necesita una orientación que combine tratamiento de líneas visibles con equilibrio general. La clave está en mejorar textura y elasticidad sin saturar la piel.";
    focus = [
      "mejorar textura",
      "suavizar líneas",
      "mantener elasticidad",
      "equilibrio y confort",
    ];
  } else if (concern === "wrinkles") {
    summary =
      "Tu piel necesita una rutina enfocada en prevención o tratamiento de líneas visibles, manteniendo al mismo tiempo hidratación y confort.";
    focus = [
      "mejorar textura",
      "suavizar líneas",
      "mantener elasticidad",
      "apoyar hidratación diaria",
    ];
  } else if (concern === "balance") {
    summary =
      "Tu piel necesita una rutina que ayude a mantener el equilibrio, controlar el exceso de brillo y mejorar la sensación general de estabilidad.";
    focus = [
      "regular brillo",
      "textura más uniforme",
      "limpieza respetuosa",
      "cuidado equilibrante",
    ];
  } else if (skin_type === "combination" && concern === "dehydration") {
    summary =
      "Tu piel necesita equilibrio e hidratación a la vez. Conviene cuidar las zonas que se deshidratan sin sobrecargar las áreas con más tendencia a brillo.";
    focus = [
      "hidratación equilibrada",
      "confort en zonas secas",
      "texturas ligeras pero eficaces",
      "estabilidad general",
    ];
  }

  return {
    title: name
      ? `${name}, esta es tu guía personalizada`
      : "Guía personalizada para tu piel",
    summary,
    focus,
    cta_label: "Quiero mi recomendación por WhatsApp",
    whatsappText,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { gender, age_range, skin_type, concern, name, phone, consent } =
      body;

    if (
      !gender ||
      !age_range ||
      !skin_type ||
      !concern ||
      !name ||
      !phone ||
      consent !== true
    ) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios o no se ha aceptado el consentimiento." },
        { status: 400 }
      );
    }

    const { data: rule, error: ruleError } = await supabase
      .from("recommendation_rules")
      .select("*")
      .eq("gender", gender)
      .eq("age_range", age_range)
      .eq("skin_type", skin_type)
      .eq("concern", concern)
      .eq("active", true)
      .order("priority", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (ruleError) {
      return NextResponse.json(
        { error: `Error buscando regla: ${ruleError.message}` },
        { status: 500 }
      );
    }

    if (!rule) {
      return NextResponse.json(
        { error: "No encontramos una guía para este perfil." },
        { status: 404 }
      );
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        name,
        phone,
        consent: true,
      })
      .select("id")
      .maybeSingle();

    if (leadError) {
      return NextResponse.json(
        { error: `Error guardando lead: ${leadError.message}` },
        { status: 500 }
      );
    }

    const guide = buildGuide({
      gender,
      age_range,
      skin_type,
      concern,
      name,
      phone,
    });

    const { error: diagnosticError } = await supabase.from("diagnostics").insert(
      {
        lead_id: lead?.id ?? null,
        gender,
        age_range,
        skin_type,
        concern,
      }
    );

    if (diagnosticError) {
      return NextResponse.json(
        { error: `Error guardando diagnóstico: ${diagnosticError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ guide });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error interno del servidor.",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }
}