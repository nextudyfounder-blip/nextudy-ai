import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkChatMessage } from "@/lib/profanity";
import { NEXTUDY_SYSTEM, VANGUARD_PRIME_SYSTEM } from "@/lib/prompts";

const FREE_DAILY_QUESTIONS = 20;

const IMAGE_MIME_RE = /^image\/(png|jpeg|jpg|webp|heic)$/i;

const askSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.string().uuid().optional().nullable(),
  documentId: z.string().uuid().optional().nullable(),
  imageBase64: z.string().max(20_000_000).optional().nullable(),
  imageMimeType: z.string().regex(IMAGE_MIME_RE).optional().nullable(),
  realm: z.enum(["mentor", "vanguard"]).optional().nullable(),
  /** Zero-storage file ingestion: extracted text passed straight into session context. */
  contextText: z.string().max(120_000).optional().nullable(),
  contextName: z.string().max(300).optional().nullable(),
});


function buildUserContent(message: string, imageBase64?: string | null, mime?: string | null) {
  if (!imageBase64) return message;
  return [
    { type: "text", text: message },
    { type: "image_url", image_url: { url: `data:${mime ?? "image/png"};base64,${imageBase64}` } },
  ];
}

/** Detects a stated low/zero starting budget so Vanguard can flag capital risk. */
function detectLowBudget(text: string): { low: boolean; stated?: string } {
  const t = text.toLowerCase();
  if (/\b(no|zero|geen|without a?)\s*(starting\s*)?(budget|capital|money|kapitaal|geld)\b/.test(t)) {
    return { low: true, stated: "€0" };
  }
  const amounts = [...t.matchAll(/(?:€|eur\s?|\$)\s?([\d.,]+)\s?(k|k€)?/g)].map((m) => {
    const n = Number(m[1].replace(/\./g, "").replace(",", "."));
    return m[2] ? n * 1000 : n;
  });
  const budgetContext = /(budget|capital|kapitaal|save[d]?|spaargeld|start with|to invest|invest)/.test(t);
  const min = amounts.length ? Math.min(...amounts) : null;
  if (budgetContext && min !== null && min <= 1000) {
    return { low: true, stated: `€${min}` };
  }
  return { low: false };
}

/**
 * Lightweight live web trend lookup (DuckDuckGo HTML endpoint). Best effort:
 * on any failure Vanguard is told the signals are unavailable.
 */
async function fetchTrendSignals(query: string): Promise<string | null> {
  try {
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(`${query} market trend 2026 demand`)}`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NextudyBot/1.0)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    const snippets = [...html.matchAll(/result__snippet[^>]*>([\s\S]{0,400}?)<\/a>/g)]
      .map((m) => m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
      .filter((s) => s.length > 40)
      .slice(0, 5);
    if (!snippets.length) return null;
    return snippets.map((s, i) => `${i + 1}. ${s}`).join("\n");
  } catch {
    return null;
  }
}

/** Detects whether the message looks like a business/venture evaluation. */
function looksLikeVenture(text: string): boolean {
  return /(business|venture|startup|dropship|e-?commerce|shop|store|saas|agency|freelanc|marketing|profit|margin|revenue|sell|onderneming|winkel|verdienen)/i.test(
    text,
  );
}


export const askChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => askSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("AI key not configured");

    const { data: prof } = await supabase
      .from("profiles").select("plan").eq("id", userId).maybeSingle();
    const isFree = false; // TEMP PREVIEW OVERRIDE: treat all users as pro
    const today = new Date().toISOString().slice(0, 10);

    if (isFree) {
      const { data: usage } = await supabase
        .from("usage_daily").select("questions")
        .eq("user_id", userId).eq("day", today).maybeSingle();
      const used = usage?.questions ?? 0;
      if (used >= FREE_DAILY_QUESTIONS) {
        throw new Error(`Daily limit reached (${FREE_DAILY_QUESTIONS}/${FREE_DAILY_QUESTIONS} questions). Upgrade to Pro for unlimited.`);
      }
    }

    const verdict = checkChatMessage(data.message);
    if (verdict.blocked) throw new Error(verdict.reason ?? "That message can't be sent.");

    // Ensure conversation
    let convId = data.conversationId ?? null;
    if (!convId) {
      const title = data.message.slice(0, 60);
      const { data: c, error } = await supabase
        .from("conversations")
        .insert({ user_id: userId, title })
        .select("id").single();
      if (error) throw error;
      convId = c.id;
    }

    const isVanguard = data.realm === "vanguard";
    let systemPrompt = isVanguard ? VANGUARD_PRIME_SYSTEM : NEXTUDY_SYSTEM;

    if (isVanguard) {
      // Financial risk protection: compare stated budget against the idea.
      const budget = detectLowBudget(data.message);
      if (budget.low) {
        systemPrompt += `\n\nBUDGET SIGNAL: the founder stated roughly ${budget.stated ?? "€0"} of starting capital. If the venture needs materially more than that, you MUST open with the ⚠️ CAPITAL RISK block and give low-capital alternatives.`;
      }
      // Trend validation from live web search.
      if (looksLikeVenture(data.message)) {
        const signals = await fetchTrendSignals(data.message.slice(0, 180));
        systemPrompt += signals
          ? `\n\nTREND SIGNALS (live web search, treat as raw and possibly noisy):\n${signals}`
          : `\n\nTREND SIGNALS: unavailable right now — label your market read as an estimate.`;
      }
    }


    const { data: nameRow } = await supabase
      .from("profiles").select("display_name").eq("id", userId).maybeSingle();
    const preferredName = nameRow?.display_name?.trim();
    if (preferredName) {
      systemPrompt += `\n\nAddress the user as "${preferredName}" when it feels natural.`;
    }

    // Zero-storage attachment: text extracted in the browser, never persisted as a file.
    if (data.contextText && data.contextText.trim().length > 20) {
      systemPrompt += `\n\nATTACHED FILE (this session only)${
        data.contextName ? ` — "${data.contextName}"` : ""
      }:\n${data.contextText.slice(0, 60000)}`;
    }


    if (data.documentId) {
      const { data: doc } = await supabase
        .from("documents").select("file_name, extracted_text")
        .eq("id", data.documentId).eq("user_id", userId).maybeSingle();
      if (doc) {
        systemPrompt += `\n\nThe student is currently studying "${doc.file_name}". Reference excerpt:\n${(doc.extracted_text ?? "").slice(0, 12000)}`;
      }
    } else {
      const { data: docs } = await supabase
        .from("documents").select("file_name, summary")
        .eq("user_id", userId).eq("status", "ready")
        .order("created_at", { ascending: false }).limit(5);
      if (docs && docs.length) {
        const list = docs
          .map((d) => `- ${d.file_name}: ${Array.isArray(d.summary) ? (d.summary as string[]).slice(0, 3).join("; ") : ""}`)
          .join("\n");
        systemPrompt += `\n\nThe student has these recent documents:\n${list}`;
      }
    }

    const { data: history } = await supabase
      .from("chat_messages").select("role, content")
      .eq("user_id", userId).eq("conversation_id", convId)
      .order("created_at", { ascending: true }).limit(50);

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...((history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))),
      { role: "user" as const, content: buildUserContent(data.message, data.imageBase64, data.imageMimeType) },
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
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

    const { data: inserted } = await supabase.from("chat_messages").insert([
      { user_id: userId, role: "user", content: data.message, conversation_id: convId, document_id: data.documentId ?? null },
      { user_id: userId, role: "assistant", content: reply, conversation_id: convId, document_id: data.documentId ?? null },
    ]).select("id, role");
    const assistantId = inserted?.find((r) => r.role === "assistant")?.id ?? null;
    const userMsgId = inserted?.find((r) => r.role === "user")?.id ?? null;
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("usage_daily").select("questions, uploads")
      .eq("user_id", userId).eq("day", today).maybeSingle();
    if (existing) {
      await supabaseAdmin.from("usage_daily")
        .update({ questions: (existing.questions ?? 0) + 1, updated_at: new Date().toISOString() })
        .eq("user_id", userId).eq("day", today);
    } else {
      await supabaseAdmin.from("usage_daily").insert({ user_id: userId, day: today, questions: 1, uploads: 0 });
    }

    return { reply, conversationId: convId, assistantId, userMsgId };
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("conversations").select("id, title, updated_at")
      .eq("user_id", userId).order("updated_at", { ascending: false }).limit(50);
    return { conversations: data ?? [] };
  });

export const getConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: msgs } = await supabase
      .from("chat_messages").select("id, role, content, created_at")
      .eq("user_id", userId).eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    return { messages: msgs ?? [] };
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("chat_messages").delete()
      .eq("user_id", userId).eq("conversation_id", data.conversationId);
    await supabase.from("conversations").delete()
      .eq("user_id", userId).eq("id", data.conversationId);
    return { ok: true };
  });

export const renameConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ conversationId: z.string().uuid(), title: z.string().min(1).max(120) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("conversations")
      .update({ title: data.title })
      .eq("user_id", userId).eq("id", data.conversationId);
    return { ok: true };
  });

const MODIFY_STYLES = {
  shorter: "Rewrite the previous answer to be significantly shorter and more concise, keeping all key information.",
  longer: "Rewrite the previous answer to be more detailed and thorough, adding helpful examples and context.",
  simpler: "Rewrite the previous answer in simpler language, as if explaining to a 12-year-old.",
  casual: "Rewrite the previous answer in a more casual, friendly tone.",
  professional: "Rewrite the previous answer in a more formal, professional tone.",
} as const;

export const modifyResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      messageId: z.string().uuid(),
      style: z.enum(["shorter", "longer", "simpler", "casual", "professional"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("AI key not configured");

    const { data: msg, error } = await supabase
      .from("chat_messages")
      .select("id, content, conversation_id")
      .eq("id", data.messageId).eq("user_id", userId).maybeSingle();
    if (error || !msg) throw new Error("Message not found");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are Nextudy, an AI study tutor. Rewrite the user's previous answer per the instruction. Output only the rewritten answer in markdown — no preamble." },
          { role: "user", content: `Previous answer:\n\n${msg.content}\n\nInstruction: ${MODIFY_STYLES[data.style]}` },
        ],
      }),
    });
    if (!aiResp.ok) throw new Error(`AI error: ${aiResp.status}`);
    const json = await aiResp.json();
    const reply = json.choices?.[0]?.message?.content as string | undefined;
    if (!reply) throw new Error("Empty AI reply");

    await supabase.from("chat_messages").update({ content: reply }).eq("id", data.messageId).eq("user_id", userId);
    return { content: reply };
  });

// ---- Guest (no persistence) ----
// ---- Guest endpoint removed: required auth to prevent unmetered AI usage ----
// Use askChat (authenticated) instead. This stub exists to preserve the export
// name but rejects all callers.
const guestSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .max(40)
    .optional(),
  imageBase64: z.string().max(20_000_000).optional().nullable(),
  imageMimeType: z.string().regex(IMAGE_MIME_RE).optional().nullable(),
});

export const askChatGuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => guestSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Authenticated stateless chat (kept for back-compat with the guest UI path).
    const { userId } = context;
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("AI key not configured");
    void userId;
    const messages = [
      { role: "system" as const, content: NEXTUDY_SYSTEM },
      ...((data.history ?? []).map((m) => ({ role: m.role, content: m.content }))),
      { role: "user" as const, content: buildUserContent(data.message, data.imageBase64, data.imageMimeType) },
    ];
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
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
    return { reply };
  });

