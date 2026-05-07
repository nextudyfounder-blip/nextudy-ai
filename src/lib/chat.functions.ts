import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FREE_DAILY_QUESTIONS = 20;

const inputSchema = z.object({
  message: z.string().min(1).max(4000),
  documentId: z.string().uuid().optional().nullable(),
});

export const askChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("AI key not configured");

    // Check plan
    const { data: prof } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();
    const isFree = (prof?.plan ?? "free") === "free";

    const today = new Date().toISOString().slice(0, 10);

    if (isFree) {
      const { data: usage } = await supabase
        .from("usage_daily")
        .select("questions")
        .eq("user_id", userId)
        .eq("day", today)
        .maybeSingle();
      const used = usage?.questions ?? 0;
      if (used >= FREE_DAILY_QUESTIONS) {
        throw new Error(`Daily limit reached (${FREE_DAILY_QUESTIONS}/${FREE_DAILY_QUESTIONS} questions). Upgrade to Pro for unlimited.`);
      }
    }

    // Build context
    let systemPrompt =
      "You are Nextudy, a friendly and clear AI study tutor. Help the student understand concepts, answer study questions, summarize and quiz them. Use markdown.";

    if (data.documentId) {
      const { data: doc } = await supabase
        .from("documents")
        .select("file_name, extracted_text, summary")
        .eq("id", data.documentId)
        .eq("user_id", userId)
        .maybeSingle();
      if (doc) {
        systemPrompt += `\n\nThe student is currently studying "${doc.file_name}". Reference excerpt:\n${(doc.extracted_text ?? "").slice(0, 12000)}`;
      }
    } else {
      // Pull recent docs as light context
      const { data: docs } = await supabase
        .from("documents")
        .select("file_name, summary")
        .eq("user_id", userId)
        .eq("status", "ready")
        .order("created_at", { ascending: false })
        .limit(5);
      if (docs && docs.length) {
        const list = docs
          .map((d) => `- ${d.file_name}: ${Array.isArray(d.summary) ? (d.summary as string[]).slice(0, 3).join("; ") : ""}`)
          .join("\n");
        systemPrompt += `\n\nThe student has these recent documents:\n${list}`;
      }
    }

    // Pull recent chat history
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...((history ?? []).reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))),
      { role: "user" as const, content: data.message },
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      if (aiResp.status === 429) throw new Error("Too many requests, slow down a moment.");
      if (aiResp.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI error: ${t.slice(0, 200)}`);
    }

    const json = await aiResp.json();
    const reply = json.choices?.[0]?.message?.content as string | undefined;
    if (!reply) throw new Error("Empty AI reply");

    // Save both messages
    await supabase.from("chat_messages").insert([
      { user_id: userId, role: "user", content: data.message, document_id: data.documentId ?? null },
      { user_id: userId, role: "assistant", content: reply, document_id: data.documentId ?? null },
    ]);

    // Increment usage
    await supabase.rpc("increment_question" as never).then(() => {}).catch(() => {});
    const { data: existing } = await supabase
      .from("usage_daily")
      .select("questions, uploads")
      .eq("user_id", userId)
      .eq("day", today)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("usage_daily")
        .update({ questions: (existing.questions ?? 0) + 1, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("day", today);
    } else {
      await supabase.from("usage_daily").insert({ user_id: userId, day: today, questions: 1, uploads: 0 });
    }

    return { reply };
  });

export const getChatHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(100);
    return { messages: data ?? [] };
  });

export const clearChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("chat_messages").delete().eq("user_id", userId);
    return { ok: true };
  });
