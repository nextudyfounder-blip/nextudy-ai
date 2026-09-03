import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BLUEPRINT_SYSTEM } from "@/lib/prompts";

/**
 * Compiles the Vanguard interview into a clean Launch Blueprint markdown
 * document. The client renders it to a downloadable PDF.
 */
export const buildLaunchBlueprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ conversationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("AI key not configured");

    const { data: msgs } = await supabase
      .from("chat_messages").select("role, content")
      .eq("user_id", userId).eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true }).limit(80);

    if (!msgs || msgs.length === 0) throw new Error("Nothing to export yet — talk through the venture first.");

    const transcript = msgs
      .map((m) => `${m.role === "user" ? "FOUNDER" : "VANGUARD"}: ${m.content}`)
      .join("\n\n")
      .slice(0, 40000);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: BLUEPRINT_SYSTEM },
          { role: "user", content: `Conversation:\n\n${transcript}` },
        ],
      }),
    });
    if (!aiResp.ok) {
      if (aiResp.status === 429) throw new Error("Too many requests, try again shortly.");
      if (aiResp.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI error: ${aiResp.status}`);
    }
    const json = await aiResp.json();
    const markdown = json.choices?.[0]?.message?.content as string | undefined;
    if (!markdown) throw new Error("Could not compile the blueprint");

    return { markdown, generatedAt: new Date().toISOString() };
  });
