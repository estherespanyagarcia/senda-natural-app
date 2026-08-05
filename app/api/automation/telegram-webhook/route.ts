import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { editTelegramMessage, answerCallbackQuery } from "@/lib/telegram";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const callbackQuery = body?.callback_query;
  if (!callbackQuery) return NextResponse.json({ ok: true });

  const { id: queryId, data, message } = callbackQuery;
  if (!data) return NextResponse.json({ ok: true });

  const [action, diaStr] = data.split("_");
  const dia = parseInt(diaStr);

  await answerCallbackQuery(queryId);

  const { data: entry } = await supabase
    .from("content_calendar")
    .select("*")
    .eq("dia", dia)
    .single();

  if (!entry) return NextResponse.json({ ok: true });

  if (action === "approve") {
    await supabase
      .from("content_calendar")
      .update({ status: "aprobado" })
      .eq("dia", dia);

    await supabase
      .from("content_history")
      .update({ status_final: "aprobado" })
      .eq("dia", dia)
      .eq("status_final", "listo");

    if (entry.telegram_message_id) {
      await editTelegramMessage(
        entry.telegram_message_id,
        `✅ <b>Aprobado — Día ${dia}</b>\n\n<b>Tema:</b> ${entry.tema}\n\nEl contenido está listo para publicar en Instagram.`,
        []
      );
    }
  } else if (action === "reject") {
    await supabase
      .from("content_calendar")
      .update({ status: "pendiente", notas: "Rechazado manualmente desde Telegram." })
      .eq("dia", dia);

    await supabase
      .from("content_history")
      .update({ status_final: "rechazado" })
      .eq("dia", dia)
      .eq("status_final", "listo");

    if (entry.telegram_message_id) {
      await editTelegramMessage(
        entry.telegram_message_id,
        `❌ <b>Rechazado — Día ${dia}</b>\n\n<b>Tema:</b> ${entry.tema}\n\nVuelta a pendiente. Se regenerará mañana.`,
        []
      );
    }
  } else if (action === "script") {
    // Send the full script as a follow-up message
    const { sendTelegramMessage } = await import("@/lib/telegram");
    const scriptText =
      `📄 <b>Guion completo — Día ${dia}: ${entry.tema}</b>\n\n` +
      `<pre>${entry.guion.slice(0, 3500)}</pre>`;
    await sendTelegramMessage(scriptText);
  }

  return NextResponse.json({ ok: true });
}
