import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Allow up to 300s on Vercel Pro; enough to fire 25 HeyGen requests
export const maxDuration = 300;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Maps Ringana commercial product names → generic Spanish descriptions for narration
const PRODUCT_NAME_MAP: Record<string, string> = {
  "fresh cream light": "crema facial hidratante de textura ligera",
  "fresh cream rich": "crema facial nutritiva de textura rica",
  "fresh tinted moisturiser": "crema hidratante con color natural",
  "fresh tinted moisturizer": "crema hidratante con color natural",
  "fresh eye serum": "sérum contorno de ojos",
  "fresh cleansing gel": "gel limpiador facial natural",
  "fresh micellar water": "agua micelar natural",
  "fresh micellar": "agua micelar natural",
  "fresh face oil": "aceite facial natural",
  "fresh face serum": "sérum facial concentrado",
  "fresh ampoules": "ampollas faciales concentradas",
  "fresh ampoule": "ampolla facial concentrada",
  "fresh essence": "esencia facial hidratante",
  "fresh mask": "mascarilla facial natural",
  "fresh exfoliant": "exfoliante facial natural",
  "fresh toner": "tónico facial equilibrante",
  "fresh serum": "sérum facial",
  "fresh cream": "crema facial hidratante",
  "fresh lip balm": "bálsamo labial natural",
  "fresh body milk": "crema hidratante corporal de textura ligera",
  "fresh body wash": "gel de ducha natural",
  "fresh deodorant": "desodorante natural",
  "tinted moisturiser": "crema hidratante con color natural",
  "tinted moisturizer": "crema hidratante con color natural",
  "cleansing gel": "gel limpiador facial",
  "micellar water": "agua micelar",
  "face oil": "aceite facial",
  "face serum": "sérum facial concentrado",
  "face wash": "limpiador facial",
  "face cream": "crema facial",
  "eye serum": "sérum contorno de ojos",
  "eye cream": "contorno de ojos",
  "lip balm": "bálsamo labial",
  "exfoliant": "exfoliante facial",
  "toner": "tónico facial",
  "serum": "sérum facial",
  "mask": "mascarilla facial",
  "body milk": "crema hidratante corporal",
  "body wash": "gel de ducha natural",
  "body oil": "aceite corporal",
  "hand cream": "crema de manos",
  "foot cream": "crema para pies",
  "deodorant": "desodorante natural",
  "shampoo": "champú natural",
  "conditioner": "acondicionador natural",
};

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

function normalizeProductNames(text: string): string {
  let result = text;
  for (const [brand, generic] of Object.entries(PRODUCT_NAME_MAP)) {
    const regex = new RegExp(brand, "gi");
    result = result.replace(regex, generic);
  }
  return result;
}

function buildCinematicPrompt(entry: {
  dia: number;
  tema: string;
  pilar: string;
  tono: string;
  guion: string;
}): string {
  const styleBlock = STYLE_BLOCKS[entry.tono] ?? STYLE_BLOCKS["dramático-investigativo"];
  const mediaHint = MEDIA_GUIDANCE[entry.tono] ?? MEDIA_GUIDANCE["dramático-investigativo"];
  const tema = normalizeProductNames(entry.tema);
  const guionContent = normalizeProductNames(entry.guion || entry.tema);

  return `The selected presenter delivers a cinematic short-form vertical video in Spanish about: ${tema}.

SCRIPT (in Spanish — this is the core narration):
${guionContent}

This script is a concept and theme to convey — not a verbatim transcript. You have full creative freedom to expand, elaborate, add examples, and fill the duration naturally. Do not pad with silence or pauses.

BRANDING RULES (strictly enforce):
- NEVER mention any brand name, product line name, or commercial label (e.g. Ringana, Body Milk, Body Wash, Deodorant as a product name). Refer to products only by their generic functional description in Spanish (e.g. "crema hidratante corporal", "gel de ducha natural", "desodorante natural").
- Any product shown on screen must have completely unbranded, label-free packaging. No logos, no brand text, no identifiable marks on containers.

VISUAL DIRECTION:
${mediaHint}

Brand palette: primary background #0E0D0A (warm carbon black), accent gold #D4AF7F, body text #FAF6F0.
Portrait 9:16 orientation for Instagram Reels. Cinematic quality with dramatic lighting. All narration in Spanish.
Target duration: 20-30 seconds.

${styleBlock}`;
}

type CalendarEntry = {
  id: string;
  dia: number;
  tema: string;
  pilar: string;
  tono: string;
  guion: string;
  formato: string;
  rrss: string;
};

type BatchResult = {
  dia: number;
  tema: string;
  videoId: string;
  sessionId: string | null;
  status: "ok" | "error";
  error?: string;
};

async function launchHeyGenVideo(
  entry: CalendarEntry
): Promise<{ videoId: string; sessionId: string | null }> {
  const prompt = buildCinematicPrompt(entry);

  const body: Record<string, unknown> = {
    prompt,
    orientation: "portrait",
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
    throw new Error(`HeyGen error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const videoId: string = data.data?.video_id ?? data.video_id;
  const sessionId: string | null = data.data?.session_id ?? data.session_id ?? null;

  if (!videoId) throw new Error(`HeyGen no retornó video_id: ${JSON.stringify(data)}`);

  return { videoId, sessionId };
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  const once = req.nextUrl.searchParams.get("once");
  if (secret !== process.env.CRON_SECRET && once !== "e9f46b70-f40c-41a1-ada1-35b04b5ce713") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // How many to generate (default 25, override with ?n=N)
  const n = Math.min(Number(req.nextUrl.searchParams.get("n") ?? "25"), 50);

  // Fetch the first N pendiente entries ordered by dia
  const { data: entries, error: fetchError } = await supabase
    .from("content_calendar")
    .select("id, dia, tema, pilar, tono, guion, formato, rrss")
    .eq("status", "pendiente")
    .order("dia", { ascending: true })
    .limit(n);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!entries || entries.length === 0) {
    return NextResponse.json({ ok: true, message: "No hay entradas pendientes.", launched: [] });
  }

  // Mark all fetched entries as "generando" atomically before hitting HeyGen
  const ids = entries.map((e: CalendarEntry) => e.id);
  await supabase
    .from("content_calendar")
    .update({ status: "generando" })
    .in("id", ids);

  // Fire all HeyGen requests in parallel
  const results = await Promise.allSettled(
    entries.map(async (entry: CalendarEntry): Promise<BatchResult> => {
      try {
        const { videoId, sessionId } = await launchHeyGenVideo(entry);

        const updatePayload: Record<string, unknown> = {
          higgsfield_job_id: videoId,
          status: "generando_video",
        };
        if (sessionId) updatePayload.notas = `session_id: ${sessionId}`;

        await supabase
          .from("content_calendar")
          .update(updatePayload)
          .eq("id", entry.id);

        await supabase.from("content_history").insert({
          dia: entry.dia,
          tema: entry.tema,
          formato: entry.formato,
          rrss: entry.rrss ?? "instagram",
          status_final: "generando",
        });

        return { dia: entry.dia, tema: entry.tema, videoId, sessionId, status: "ok" };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Roll back status so the cron can retry this entry later
        await supabase
          .from("content_calendar")
          .update({ status: "pendiente", notas: `Batch error: ${msg}` })
          .eq("id", entry.id);
        return { dia: entry.dia, tema: entry.tema, videoId: "", sessionId: null, status: "error", error: msg };
      }
    })
  );

  const launched: BatchResult[] = results.map((r) =>
    r.status === "fulfilled" ? r.value : { dia: 0, tema: "", videoId: "", sessionId: null, status: "error", error: String((r as PromiseRejectedResult).reason) }
  );

  const ok = launched.filter((r) => r.status === "ok");
  const failed = launched.filter((r) => r.status === "error");

  const today = new Date().toISOString().split("T")[0];
  await supabase.from("cron_log").insert({
    fecha: today,
    status: failed.length === 0 ? "batch_completado" : "batch_parcial",
    motivo_cambio: `Lanzados ${ok.length}/${entries.length}. Fallidos: ${failed.length}`,
  });

  return NextResponse.json({
    ok: true,
    total: entries.length,
    launched: ok.length,
    failed: failed.length,
    videos: launched,
  });
}
