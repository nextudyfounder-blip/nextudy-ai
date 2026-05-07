import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDailyUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await supabase
      .from("usage_daily")
      .select("uploads, questions")
      .eq("user_id", userId)
      .eq("day", today)
      .maybeSingle();
    const { data: prof } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();
    return {
      uploads: usage?.uploads ?? 0,
      questions: usage?.questions ?? 0,
      plan: prof?.plan ?? "free",
      limits: { uploads: 5, questions: 20 },
    };
  });
