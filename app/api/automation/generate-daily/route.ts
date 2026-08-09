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

const STYLE_BLOCKS: Record<string, string> = {
  "dramático-investigativo": `STYLE — SHADOW CUT (Hillmann): Deep blacks, cold greys + blood red accent.
Sharp angular text. Heavy shadow. Slow creeping push-ins.
Hard cuts to black. Film noir tension.`,
  "educativo-directo": `STYLE — CONTACT SHEET (Brodovitch): High contrast B&W, desaturated accents.
Photo-editorial framing. Bold sans-serif annotations. Raw grain.
Hard cuts on beat. Snap-zooms.`,
  "editorial-producto": `STYLE — VELVET STANDARD (Vignelli): Black, white, one accent: gold #c9a84c.
Thin ALL CAPS, wide spacing. Generous negative space.
Slow elegant cross-dissolves.`,
  "provocador-revelador": `STYLE — DECONSTRUCTED (Brody): Dark grey #1a1a1a, rust orange #D4501E.
Type at angles, overlapping. Gritty textures, scan-line glitch.
Smash cuts with flash frames.`,
};

const MEDIA_GUIDANCE: Record<string, string> = {
  "dramático-investigativo": `Use stock footage of real human skin, close-up facial expressions of concern or realization, and atmospheric dramatic visuals. Motion graphics for key data or statistics. AI-generated visuals for abstract cellular or molecular concepts. Make it feel urgent and emotionally heavy.`,
  "educativo-directo": `Use motion graphics to display INCI ingredient lists, chemical diagrams, and scientific labels. Stock footage of everyday cosmetic product usage. Photo-editorial framing with bold text overlays for key facts. Clear and authoritative visual rhythm.`,
  "editorial-producto": `Use cinematic macro product close-ups and texture shots. Lifestyle stock footage of clean, minimal bathroom scenes with natural light. Gold and black color grading. Elegant, aspirational aesthetic throughout.`,
  "provocador-revelador": `Use bold motion graphics to display the MYTH statement prominently, then dramatically strike it through. Stock footage of people applying conventional products. Energetic, confrontational visual rhythm that feels like a revelation.`,
};

function buildCinematicPrompt(entry: {
  dia: number;
  tema: string;
  pilar: string;
  tono: string;
  guion: string;
}): string {
  const styleBlock = STYLE_BLOCKS[entry.tono] ?? STYLE_BLOCKS["dramático-investigativo"];
  const mediaHint = MEDIA_GUIDANCE[entry.tono] ?? MEDIA_GUIDANCE["dramático-investigativo"];
  const guionContent = entry.guion || entry.tema;

  return `The selected presenter delivers a cinematic short-form vertical video in Spanish about: ${entry.tema}.

SCRIPT (in Spanish — this is the core narration):
${guionContent}

This script is a concept and theme to convey — not a verbatim transcript. You have full creative freedom to expand, elaborate, add examples, and fill the duration naturally. Do not pad with silence or pauses.

VISUAL DIRECTION:
${mediaHint}

Brand palette: primary background #0E0D0A (warm carbon black), accent gold #D4AF7F, body text #FAF6F0.
Portrait 9:16 orientation for Instagram Reels. Cinematic quality with dramatic lighting. All narration in Spanish.
Target duration: 20-30 seconds.

${styleBlock}`;
}

async function createVideoAgent(
  entry: { dia: number; tema: string; pilar: string; tono: string; guion: string }
): Promise<{ videoId: string; sessionId: string | null }> {
  const prompt = buildCinematicPrompt(entry);

  const body: Record<string, unknown> = {
    prompt,
    orientation: "portrait",
    title: `Senda Natural — Día ${entry.dia} — ${entry.tema}`,
  };

  if (process.env.HEYGEN_AVATAR_ID) body.avatar_id = process.env.HEYGEN_AVATAR_ID;
  if (process.env.HEYGEN_VOICE_ID) body.voice_id = process.env.HEYGEN_VOICE_ID;

  const res = await fetch("https://api.heygen.com/v3/video-agents", {
    method: "POST",
    headers: {
      "X-Api-Key": process.env.HEYGEN_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HeyGen Video Agent error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const videoId: string = data.data?.video_id ?? data.video_id;
  const sessionId: string | null = data.data?.session_id ?? data.session_id ?? null;

  if (!videoId) throw new Error(`HeyGen no retornó video_id: ${JSON.stringify(data)}`);

  return { videoId, sessionId };
}

async function sendApprovalNotification(
  dia: number,
  tema: string,
  pilar: string,
  videoId: string,
  sessionId: string | null
): Promise<string | null> {
  const sessionLink = sessionId
    ? `\n<a href="https://app.heygen.com/video-agent/${sessionId}">🎬 Ver sesión en HeyGen</a>`
    : "";

  const text =
    `🎬 <b>Contenido generándose — Día ${dia}</b>\n\n` +
    `<b>Tema:</b> ${tema}\n` +
    `<b>Pilar:</b> ${pilar}\n\n` +
    `⏳ Vídeo cinemático en proceso (20-45 min)\n` +
    `ID: <code>${videoId}</code>${sessionLink}\n\n` +
    `Recibirás otro mensaje cuando esté listo para revisar.`;

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
    await supabase.from("content_history").insert({ dia: entry.dia, tema: entry.tema, formato: entry.formato, rrss: entry.rrss ?? "instagram", status_final: "generando" });

    const { videoId, sessionId } = await createVideoAgent(entry);

    const updatePayload: Record<string, unknown> = { higgsfield_job_id: videoId, status: "generando_video" };
    if (sessionId) updatePayload.notas = `session_id: ${sessionId}`;
    await supabase.from("content_calendar").update(updatePayload).eq("id", entry.id);

    const telegramMsgId = await sendApprovalNotification(entry.dia, entry.tema, entry.pilar, videoId, sessionId);
    if (telegramMsgId) await supabase.from("content_calendar").update({ telegram_message_id: telegramMsgId }).eq("id", entry.id);

    await supabase.from("cron_log").insert({ fecha: today, dia_seleccionado: entry.dia, status: "completado" });
    return NextResponse.json({ ok: true, dia: entry.dia, tema: entry.tema, heygenVideoId: videoId, sessionId, telegramMsgId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate-daily] Error:", msg);
    await supabase.from("content_calendar").update({ status: "pendiente", notas: `Error: ${msg}` }).eq("id", entry.id);
    await supabase.from("cron_log").insert({ fecha: today, dia_seleccionado: entry.dia, status: "error", motivo_cambio: msg });
    await sendTelegramMessage(`⚠️ <b>Error generando contenido — Día ${entry.dia}</b>\n\n<code>${msg}</code>`);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
