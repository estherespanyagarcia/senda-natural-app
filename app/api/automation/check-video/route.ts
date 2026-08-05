import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTelegramMessage } from "@/lib/telegram";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: pending } = await supabase
    .from("content_calendar")
    .select("*")
    .eq("status", "generando_video")
    .not("higgsfield_job_id", "is", null);

  if (!pending?.length) return NextResponse.json({ ok: true, message: "No hay vídeos pendientes" });

  const results = [];

  for (const entry of pending) {
    try {
      const res = await fetch(
        `https://api.heygen.com/v1/video_status.get?video_id=${entry.higgsfield_job_id}`,
        { headers: { "X-Api-Key": process.env.HEYGEN_API_KEY! } }
      );
      if (!res.ok) continue;

      const data = await res.json();
      const status = data.data?.status;
      const videoUrl = data.data?.video_url;

      if (status === "completed" && videoUrl) {
        await supabase.from("content_calendar").update({ video_url: videoUrl, status: "listo" }).eq("id", entry.id);
        await supabase.from("content_history").update({ status_final: "listo" }).eq("dia", entry.dia).eq("status_final", "generando");
        await sendTelegramMessage(
          `✅ <b>Vídeo listo — Día ${entry.dia}</b>\n\n<b>Tema:</b> ${entry.tema}\n\n<a href="${videoUrl}">▶️ Ver vídeo</a>\n\n¿Lo apruebas para publicar?`,
          [[{ text: "✅ Aprobar", callback_data: `approve_${entry.dia}` }, { text: "❌ Rechazar", callback_data: `reject_${entry.dia}` }]]
        );
        results.push({ dia: entry.dia, status: "completado", videoUrl });
      } else if (status === "failed") {
        await supabase.from("content_calendar").update({ status: "pendiente", notas: "HeyGen: video generation failed" }).eq("id", entry.id);
        await sendTelegramMessage(`⚠️ <b>Error en vídeo — Día ${entry.dia}</b>\n\nHeyGen no pudo generar el vídeo. Se reintentará mañana.`);
        results.push({ dia: entry.dia, status: "failed" });
      }
    } catch (err) {
      console.error(`[check-video] Error día ${entry.dia}:`, err);
    }
  }

  return NextResponse.json({ ok: true, results });
}
