import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Gamepad2, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SnakeGame } from "@/components/games/SnakeGame";
import { MemoryGame } from "@/components/games/MemoryGame";
import { awardCoins } from "@/lib/coins";
import { toast } from "sonner";

export const Route = createFileRoute("/games")({
  component: GamesPage,
  head: () => ({ meta: [
    { title: "Mini games — Nextudy" },
    { name: "description", content: "Take a study break with Snake or Memory and earn Study Coins." },
  ] }),
});

function GamesPage() {
  const [snakeBest, setSnakeBest] = useState(0);
  const [memoryBest, setMemoryBest] = useState(0);
  const [awardedToday, setAwardedToday] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) return;
      const { data } = await supabase.from("game_scores").select("game, score").eq("user_id", uid);
      data?.forEach((r) => {
        if (r.game === "snake") setSnakeBest(r.score);
        if (r.game === "memory") setMemoryBest(r.score);
      });
    })();
  }, []);

  const grantPlayCoins = useCallback(async () => {
    if (awardedToday) return;
    setAwardedToday(true);
    const next = await awardCoins("game");
    if (next !== null) toast.success("+5 Study Coins! 🪙");
  }, [awardedToday]);

  const saveScore = async (game: "snake" | "memory", score: number, isBetter: (prev: number) => boolean) => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return;
    const prev = game === "snake" ? snakeBest : memoryBest;
    if (isBetter(prev)) {
      await supabase.from("game_scores").upsert({ user_id: uid, game, score }, { onConflict: "user_id,game" });
      if (game === "snake") setSnakeBest(score); else setMemoryBest(score);
      toast.success("New high score! 🏆");
    }
    grantPlayCoins();
  };

  return (
    <AppLayout title="🎮 Games">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold flex items-center gap-2">
              <Gamepad2 className="h-7 w-7 text-primary" /> Study breaks
            </h2>
            <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1">
              Earn <Coins className="h-3.5 w-3.5 text-amber-500" /> +5 Study Coins per session
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-2" />Back to studying</Link>
          </Button>
        </div>

        <Tabs defaultValue="snake">
          <TabsList className="grid grid-cols-2 w-full max-w-sm">
            <TabsTrigger value="snake">🐍 Snake</TabsTrigger>
            <TabsTrigger value="memory">🧠 Memory</TabsTrigger>
          </TabsList>
          <TabsContent value="snake">
            <Card>
              <CardHeader><CardTitle>Snake</CardTitle></CardHeader>
              <CardContent>
                <SnakeGame
                  highScore={snakeBest}
                  onGameOver={(score) => saveScore("snake", score, (prev) => score > prev)}
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="memory">
            <Card>
              <CardHeader><CardTitle>Memory match</CardTitle></CardHeader>
              <CardContent>
                <MemoryGame
                  bestMoves={memoryBest}
                  onWin={(moves) => saveScore("memory", moves, (prev) => prev === 0 || moves < prev)}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
