import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTelegramMessage } from "@/lib/telegram";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ELEVENLABS_VOICE_ID = "iuCOanGou5VLdjsVzuSj";
const HIGGSFIELD_SOUL_ID  = "411e8819-11a2-447f-b8dc-305e70b7c679";
const HIGGSFIELD_VOICE_ID = "04271a7e-4d23-49e3-871f-1d71228db051";

// ── helpers ───────────────────────────────────────────────────────────────────

function buildHiggsfieldPrompt(
  tema: string,
  pilar: string,
  formato: string,
  recentPrompts: string[]
): string {
  const isProducto = pilar.includes("Catálogo");
  const isMito     = pilar.includes("Mito");
  const isEduc     = pilar.includes("Educación");

  const mood = isProducto
    ? "editorial de lujo oscuro, fondo negro carbón, producto en primer plano con luz dorada lateral"
    : isMito
    ? "plano dramático Netflix, fondo negro, texto en pantalla efecto glitch, iluminación fría azul-blanca"
    : isEduc
    ? "laboratorio editorial oscuro, microscopio, frascos de ingredientes, luz verde esmeralda lateral"
    : "interior oscuro cinematic, mujer de espaldas frente a espejo retroiluminado, luz dorada tenue";

  const base = `Cinematic dark editorial reel, 9:16 vertical, ${mood}. Topic: ${tema}. Style: premium skincare documentary, no logos, no text overlays, no product labels, ultra-sharp 4K, shallow depth of field, moody shadows with warm gold accents. Atmosphere: investigative, luxurious, scientific.`;

  // Ensure uniqueness vs last 30
  const suffix = recentPrompts.some((p) => p.includes(tema))
    ? ` Scene variant ${Date.now()}.`
    : "";

  return base + suffix;
}

async function getRecentPrompts(): Promise<string[]> {
  const { data } = await supabase
    .from("content_history")
    .select("prompt_usado")
    .order("fecha_generacion", { ascending: false })
    .limit(30);
  return (data ?? []).map((r) => r.prompt_usado ?? "");
}

async function findTodayEntry() {
  const today = new Date().toISOString().split("T")[0];

  // Primary: today's date
  const { data: primary } = await supabase
    .from("content_calendar")
    .select("*")
    .eq("fecha_publicacion", today)
    .eq("status", "pendiente")
    .single();

  if (primary) return { entry: primary, motivo: null };

  // Anti-repetition fallback: next pending with unique tema+formato+rrss
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

// ── ElevenLabs ────────────────────────────────────────────────────────────────

async function generateAudio(guion: string): Promise<ArrayBuffer> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: guion,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.85,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!res.ok) throw new Error(`ElevenLabs error ${res.status}: ${await res.text()}`);
  return res.arrayBuffer();
}

async function uploadAudioToSupabase(
  audioBuffer: ArrayBuffer,
  dia: number
): Promise<string> {
  const filename = `dia-${dia}-${Date.now()}.mp3`;
  const { error } = await supabase.storage
    .from("content-audio")
    .upload(filename, audioBuffer, { contentType: "audio/mpeg", upsert: true });

  if (error) throw new Error(`Supabase storage error: ${error.message}`);

  const { data } = supabase.storage.from("content-audio").getPublicUrl(filename);
  return data.publicUrl;
}

// ── Higgsfield ────────────────────────────────────────────────────────────────

async function uploadAudioToHiggsfield(audioBuffer: ArrayBuffer): Promise<string> {
  // Step 1: get upload URL
  const initRes = await fetch("https://api.higgsfield.ai/v1/media/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HIGGSFIELD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ media_type: "audio", file_extension: "mp3" }),
  });
  if (!initRes.ok)
    throw new Error(`Higgsfield upload init error: ${await initRes.text()}`);

  const { upload_url, media_id } = await initRes.json();

  // Step 2: PUT the bytes
  const putRes = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": "audio/mpeg" },
    body: audioBuffer,
  });
  if (!putRes.ok)
    throw new Error(`Higgsfield PUT error: ${putRes.status}`);

  // Step 3: confirm
  const confirmRes = await fetch("https://api.higgsfield.ai/v1/media/confirm", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HIGGSFIELD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ media_id }),
  });
  if (!confirmRes.ok)
    throw new Error(`Higgsfield confirm error: ${await confirmRes.text()}`);

  return media_id;
}

async function generateHiggsfieldVideo(
  prompt: string,
  audioMediaId: string
): Promise<string> {
  const res = await fetch("https://api.higgsfield.ai/v1/generate/video", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HIGGSFIELD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "cinematic_studio_video",
      soul_id: HIGGSFIELD_SOUL_ID,
      voice_id: HIGGSFIELD_VOICE_ID,
      voice_type: "element",
      audio_media_id: audioMediaId,
      prompt,
      aspect_ratio: "9:16",
      duration: 30,
    }),
  });

  if (!res.ok)
    throw new Error(`Higgsfield generate error ${res.status}: ${await res.text()}`);

  const { job_id } = await res.json();
  return job_id;
}

// ── Telegram notification ─────────────────────────────────────────────────────

async function sendApprovalNotification(
  dia: number,
  tema: string,
  pilar: string,
  audioUrl: string,
  jobId: string
): Promise<string | null> {
  const text =
    `🎬 <b>Contenido listo para revisión — Día ${dia}</b>\n\n` +
    `<b>Tema:</b> ${tema}\n` +
    `<b>Pilar:</b> ${pilar}\n\n` +
    `🔊 <a href="${audioUrl}">Escuchar audio</a>\n` +
    `⏳ Video generándose (job: <code>${jobId}</code>)\n\n` +
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

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Simple cron-secret auth
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];

  // 1. Find today's entry
  const { entry, motivo } = await findTodayEntry();

  if (!entry) {
    await supabase.from("cron_log").insert({
      fecha: today,
      status: "sin_contenido",
      motivo_cambio: motivo,
    });
    return NextResponse.json({ ok: false, message: motivo });
  }

  // 2. Mark as generating
  await supabase
    .from("content_calendar")
    .update({ status: "generando" })
    .eq("id", entry.id);

  await supabase.from("cron_log").insert({
    fecha: today,
    dia_seleccionado: entry.dia,
    motivo_cambio: motivo,
    status: "iniciado",
  });

  try {
    // 3. Get recent prompts for uniqueness check
    const recentPrompts = await getRecentPrompts();
    const prompt = buildHiggsfieldPrompt(
      entry.tema,
      entry.pilar,
      entry.formato,
      recentPrompts
    );

    // 4. Register in history before generating
    await supabase.from("content_history").insert({
      dia: entry.dia,
      tema: entry.tema,
      formato: entry.formato,
      rrss: entry.rrss ?? "instagram",
      prompt_usado: prompt,
      status_final: "generando",
    });

    // 5. Generate audio via ElevenLabs
    const guion = entry.guion || entry.tema;
    const audioBuffer = await generateAudio(guion);
    const audioUrl = await uploadAudioToSupabase(audioBuffer, entry.dia);

    // 6. Upload audio to Higgsfield
    const audioMediaId = await uploadAudioToHiggsfield(audioBuffer);

    // 7. Trigger Higgsfield video generation
    const jobId = await generateHiggsfieldVideo(prompt, audioMediaId);

    // 8. Update calendar with audio URL and job ID
    await supabase
      .from("content_calendar")
      .update({
        audio_url: audioUrl,
        higgsfield_job_id: jobId,
        status: "listo",
      })
      .eq("id", entry.id);

    // 9. Send Telegram approval notification
    const telegramMsgId = await sendApprovalNotification(
      entry.dia,
      entry.tema,
      entry.pilar,
      audioUrl,
      jobId
    );

    if (telegramMsgId) {
      await supabase
        .from("content_calendar")
        .update({ telegram_message_id: telegramMsgId })
        .eq("id", entry.id);
    }

    // 10. Update history status
    await supabase
      .from("content_history")
      .update({ status_final: "listo" })
      .eq("dia", entry.dia)
      .eq("status_final", "generando");

    await supabase.from("cron_log").insert({
      fecha: today,
      dia_seleccionado: entry.dia,
      status: "completado",
    });

    return NextResponse.json({
      ok: true,
      dia: entry.dia,
      tema: entry.tema,
      audioUrl,
      higgsfieldJobId: jobId,
      telegramMsgId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate-daily] Error:", msg);

    await supabase
      .from("content_calendar")
      .update({ status: "pendiente", notas: `Error: ${msg}` })
      .eq("id", entry.id);

    await supabase.from("cron_log").insert({
      fecha: today,
      dia_seleccionado: entry.dia,
      status: "error",
      motivo_cambio: msg,
    });

    await sendTelegramMessage(
      `⚠️ <b>Error generando contenido — Día ${entry.dia}</b>\n\n<code>${msg}</code>`
    );

    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
