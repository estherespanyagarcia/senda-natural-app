import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTelegramMessage } from "@/lib/telegram";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findTodayEntry() {
  const today = new Date().toISOString().split("T")[0];

  const { data: primary } = await supabase
    .from("content_calendar")
    .select("*")
    .eq("fecha_publicacion", today)
    .eq("status", "pendiente")
    .single();

  if (primary) return { entry: primary, motivo: null };

  const { data: history } = await supabase
    .from("content_history")
    .select("tema, formato, rrss")
    .gte("fecha_generacion", new Date(Date.now() - 60 * 86400 * 1000).toISOString());

  const usedCombos = new Set(
    (history ?? []).map((h) => `${h.tema}|${h.formato}|${h.rrss}`)
  );

  const { data: pending } = await supabase
    .from("content_calendar")
    .select("*")
    .eq("status", "pendiente")
    .order("dia", { ascending: true });

  const fallback = (pending ?? []).find(
    (r) => !usedCombos.has(`${r.tema}|${r.formato}|${r.rrss}`)
  );

  if (fallback)
    return {
      entry: fallback,
      motivo: `Fecha original sin pendientes. Seleccionado día ${fallback.dia} por combinación única.`,
    };

  return { entry: null, motivo: "No hay entradas pendientes disponibles." };
}

async function generateHeyGenVideo(guion: string): Promise<string> {
  const res = await fetch("https://api.heygen.com/v2/video/generate", {
    method: "POST",
    headers: {
      "X-Api-Key": process.env.HEYGEN_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: process.env.HEYGEN_AVATAR_ID!,
            avatar_style: "normal",
          },
          voice: {
            type: "text",
            input_text: guion,
            voice_id: process.env.HEYGEN_VOICE_ID ?? undefined,
          },
          background: {
            type: "color",
            value: "#0E0D0A",
          },
        },
      ],
      dimension: { width: 1080, height: 1920 },
    }),
  });

  if (!res.ok)
    throw new Error(`HeyGen generate error ${res.status}: ${await res.text()}`);

  const data = await res.json();
  return data.data?.video_id ?? data.video_id;
}

async function sendApprovalNotification(
  dia: number,
  tema: string,
  pilar: string,
  videoId: string
): Promise<string | null> {
  const text =
    `🎬 <b>Contenido generándose — Día ${dia}</b>\n\n` +
    `<b>Tema:</b> ${tema}\n` +
    `<b>Pilar:</b> ${pilar}\n\n` +
    `⏳ Vídeo en proceso (ID: <code>${videoId}</code>)\n` +
    `Recibirás otro mensaje cuando esté listo para revisar.\n\n` +
    `¿Apruebas este contenido para publicar?`;

  const keyboard = [
    [
      { text: "✅ Aprobar", callback_data: `approve_${dia}` },
      { text: "❌ Rechazar", callback_data: `reject_${dia}` },
    ],
    [{ text: "✏️ Ver guion completo", callback_data: `script_${dia}` }],
  ];

  return sendTelegramMessage(text, keyboard);
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];
  const { entry, motivo } = await findTodayEntry();

  if (!entry) {
    await supabase.from("cron_log").insert({ fecha: today, status: "sin_contenido", motivo_cambio: motivo });
    return NextResponse.json({ ok: false, message: motivo });
  }

  await supabase.from("content_calendar").update({ status: "generando" }).eq("id", entry.id);
  await supabase.from("cron_log").insert({ fecha: today, dia_seleccionado: entry.dia, motivo_cambio: motivo, status: "iniciado" });

  try {
    const guion = entry.guion || entry.tema;
    await supabase.from("content_history").insert({ dia: entry.dia, tema: entry.tema, formato: entry.formato, rrss: entry.rrss ?? "instagram", status_final: "generando" });

    const videoId = await generateHeyGenVideo(guion);
    await supabase.from("content_calendar").update({ higgsfield_job_id: videoId, status: "generando_video" }).eq("id", entry.id);

    const telegramMsgId = await sendApprovalNotification(entry.dia, entry.tema, entry.pilar, videoId);
    if (telegramMsgId) await supabase.from("content_calendar").update({ telegram_message_id: telegramMsgId }).eq("id", entry.id);

    await supabase.from("cron_log").insert({ fecha: today, dia_seleccionado: entry.dia, status: "completado" });
    return NextResponse.json({ ok: true, dia: entry.dia, tema: entry.tema, heygenVideoId: videoId, telegramMsgId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate-daily] Error:", msg);
    await supabase.from("content_calendar").update({ status: "pendiente", notas: `Error: ${msg}` }).eq("id", entry.id);
    await supabase.from("cron_log").insert({ fecha: today, dia_seleccionado: entry.dia, status: "error", motivo_cambio: msg });
    await sendTelegramMessage(`⚠️ <b>Error generando contenido — Día ${entry.dia}</b>\n\n<code>${msg}</code>`);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
