import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { editTelegramMessage } from "@/lib/telegram";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Called by a separate cron (every 5 min) to poll Higgsfield job status
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find entries with a pending Higgsfield job and no video_url yet
  const { data: pending } = await supabase
    .from("content_calendar")
    .select("id, dia, tema, higgsfield_job_id, telegram_message_id")
    .eq("status", "listo")
    .is("video_url", null)
    .not("higgsfield_job_id", "is", null)
    .limit(10);

  if (!pending?.length) return NextResponse.json({ ok: true, checked: 0 });

  const results = [];

  for (const entry of pending) {
    const res = await fetch(
      `https://api.higgsfield.ai/v1/jobs/${entry.higgsfield_job_id}`,
      {
        headers: { Authorization: `Bearer ${process.env.HIGGSFIELD_API_KEY}` },
      }
    );

    if (!res.ok) continue;
    const job = await res.json();

    if (job.status === "completed" && job.output_url) {
      await supabase
        .from("content_calendar")
        .update({ video_url: job.output_url })
        .eq("id", entry.id);

      // Update Telegram message with video link
      if (entry.telegram_message_id) {
        await editTelegramMessage(
          entry.telegram_message_id,
          `🎬 <b>Video listo — Día ${entry.dia}</b>\n\n` +
            `<b>Tema:</b> ${entry.tema}\n\n` +
            `🎥 <a href="${job.output_url}">Ver video</a>\n\n` +
            `¿Apruebas este contenido para publicar en Instagram?`,
          [
            [
              { text: "✅ Aprobar", callback_data: `approve_${entry.dia}` },
              { text: "❌ Rechazar", callback_data: `reject_${entry.dia}` },
            ],
            [{ text: "✏️ Ver guion", callback_data: `script_${entry.dia}` }],
          ]
        );
      }

      results.push({ dia: entry.dia, status: "video_ready" });
    } else if (job.status === "failed") {
      await supabase
        .from("content_calendar")
        .update({ notas: `Higgsfield job failed: ${job.error ?? "unknown"}` })
        .eq("id", entry.id);
      results.push({ dia: entry.dia, status: "failed" });
    }
  }

  return NextResponse.json({ ok: true, checked: pending.length, results });
}
