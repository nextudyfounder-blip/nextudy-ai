import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { welcomeEmail } from "@/lib/email/templates";
import { addToAudience, sendEmail } from "@/lib/email/resend";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const InputSchema = z.object({
  email: z.string().email(),
  display_name: z.string().min(1).max(120).optional().nullable(),
});

export const Route = createFileRoute("/api/public/welcome-onboarding")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const json = await request.json().catch(() => ({}));
          const parsed = InputSchema.safeParse(json);
          if (!parsed.success) {
            return new Response(
              JSON.stringify({ error: "Invalid payload", details: parsed.error.flatten() }),
              { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
            );
          }
          const { email, display_name } = parsed.data;
          const audienceId = process.env.RESEND_AUDIENCE_ID;

          // Best-effort audience add — never blocks the welcome email.
          if (audienceId) {
            try {
              await addToAudience({
                audienceId,
                email,
                firstName: display_name?.split(" ")[0] || undefined,
              });
            } catch (e) {
              console.warn("[welcome_onboarding] audience add skipped", e);
            }
          }

          const { subject, html } = welcomeEmail({ name: display_name });
          const result = await sendEmail({
            from: "Nextudy <welcome@nextudy.app>",
            to: email,
            subject,
            html,
          });

          return new Response(JSON.stringify({ ok: true, id: result.id }), {
            status: 200,
            headers: { ...CORS, "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("[welcome_onboarding] failed", err);
          return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
            { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
