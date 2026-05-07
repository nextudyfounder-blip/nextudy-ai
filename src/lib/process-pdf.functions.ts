import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  documentId: z.string().uuid(),
  text: z.string().min(20).max(200000),
});

const SYSTEM_PROMPT = `You are an expert study assistant. Given the text of a study document, produce:
1. A concise structured bullet summary (6-10 bullets) capturing the key concepts.
2. Exactly 5 practice questions with clear answers that test understanding of the material.
Use the language of the source text.`;

export const processPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Enforce daily upload limit for free plan
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
        .select("uploads")
        .eq("user_id", userId)
        .eq("day", today)
        .maybeSingle();
      if ((usage?.uploads ?? 0) >= 5) {
        throw new Error("Daily limit reached (5/5 uploads). Upgrade to Pro for unlimited.");
      }
    }

    // verify ownership
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, user_id")
      .eq("id", data.documentId)
      .maybeSingle();
    if (docErr || !doc || doc.user_id !== userId) {
      throw new Error("Document not found");
    }

    await supabase
      .from("documents")
      .update({ status: "processing", extracted_text: data.text.slice(0, 100000) })
      .eq("id", data.documentId);

    const truncated = data.text.slice(0, 60000);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Document content:\n\n${truncated}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_study_material",
              description: "Save the structured summary and practice questions.",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "array",
                    items: { type: "string" },
                    description: "6-10 concise bullet points summarizing the document.",
                  },
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        answer: { type: "string" },
                      },
                      required: ["question", "answer"],
                      additionalProperties: false,
                    },
                    description: "Exactly 5 practice questions with answers.",
                  },
                },
                required: ["summary", "questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_study_material" } },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      const errMsg =
        aiResp.status === 429
          ? "Rate limit exceeded. Please try again in a moment."
          : aiResp.status === 402
            ? "AI credits exhausted. Add funds in Workspace > Usage."
            : `AI error ${aiResp.status}: ${txt.slice(0, 200)}`;
      await supabase
        .from("documents")
        .update({ status: "failed", error: errMsg })
        .eq("id", data.documentId);
      throw new Error(errMsg);
    }

    const json = await aiResp.json();
    const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured output");
    }
    const parsed = JSON.parse(toolCall.function.arguments) as {
      summary: string[];
      questions: { question: string; answer: string }[];
    };

    const { error: updErr } = await supabase
      .from("documents")
      .update({
        summary: parsed.summary,
        questions: parsed.questions,
        status: "ready",
        error: null,
      })
      .eq("id", data.documentId);
    if (updErr) throw new Error(updErr.message);

    // increment uploads counter
    const { data: prof } = await supabase
      .from("profiles")
      .select("uploads_this_month")
      .eq("id", userId)
      .maybeSingle();
    if (prof) {
      await supabase
        .from("profiles")
        .update({ uploads_this_month: (prof.uploads_this_month ?? 0) + 1 })
        .eq("id", userId);
    }

    return { ok: true, summary: parsed.summary, questions: parsed.questions };
  });
