import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { leadId, activityType, messageText, promocode } = body;

    if (!leadId || !activityType) {
      return NextResponse.json(
        { error: "Faltan leadId o activityType" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("lead_activity").insert({
      lead_id: leadId,
      activity_type: activityType,
      message_text: messageText ?? null,
      promocode: promocode ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Error guardando actividad" },
      { status: 500 }
    );
  }
}