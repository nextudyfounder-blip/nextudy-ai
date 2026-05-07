import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  imageBase64: z.string().min(20).max(20_000_000),
  mimeType: z.string().regex(/^image\/(png|jpeg|jpg|webp|heic)$/i),
});

export const ocrImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("AI key not configured");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are an OCR engine. Extract ALL legible text from the image (printed or handwritten). Output only the extracted text with reasonable line breaks. No commentary.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all text from this image:" },
              { type: "image_url", image_url: { url: `data:${data.mimeType};base64,${data.imageBase64}` } },
            ],
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      if (aiResp.status === 429) throw new Error("Too many requests, slow down a moment.");
      if (aiResp.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`OCR error: ${t.slice(0, 200)}`);
    }

    const json = await aiResp.json();
    const text = json.choices?.[0]?.message?.content as string | undefined;
    if (!text || text.trim().length < 10) throw new Error("Could not extract enough text from this image");
    return { text: text.trim() };
  });
