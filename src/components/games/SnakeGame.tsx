import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw } from "lucide-react";

type Pt = { x: number; y: number };
const SIZE = 20; // grid cells

function rndCell(exclude: Pt[]): Pt {
  while (true) {
    const p = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
    if (!exclude.some((e) => e.x === p.x && e.y === p.y)) return p;
  }
}

interface Props {
  highScore: number;
  onGameOver: (score: number) => void;
}

export function SnakeGame({ highScore, onGameOver }: Props) {
  const [snake, setSnake] = useState<Pt[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Pt>({ x: 5, y: 5 });
  const [dir, setDir] = useState<Pt>({ x: 1, y: 0 });
  const dirRef = useRef(dir);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);

  useEffect(() => { dirRef.current = dir; }, [dir]);

  const reset = useCallback(() => {
    setSnake([{ x: 10, y: 10 }]);
    setFood({ x: 5, y: 5 });
    setDir({ x: 1, y: 0 });
    setScore(0);
    setOver(false);
    setRunning(true);
  }, []);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = dirRef.current;
      if (e.key === "ArrowUp" && d.y !== 1) setDir({ x: 0, y: -1 });
      else if (e.key === "ArrowDown" && d.y !== -1) setDir({ x: 0, y: 1 });
      else if (e.key === "ArrowLeft" && d.x !== 1) setDir({ x: -1, y: 0 });
      else if (e.key === "ArrowRight" && d.x !== -1) setDir({ x: 1, y: 0 });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Touch swipe
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    const d = dirRef.current;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 20 && d.x !== -1) setDir({ x: 1, y: 0 });
      else if (dx < -20 && d.x !== 1) setDir({ x: -1, y: 0 });
    } else {
      if (dy > 20 && d.y !== -1) setDir({ x: 0, y: 1 });
      else if (dy < -20 && d.y !== 1) setDir({ x: 0, y: -1 });
    }
    touchStart.current = null;
  };

  // Tick
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setSnake((s) => {
        const head = { x: s[0].x + dirRef.current.x, y: s[0].y + dirRef.current.y };
        if (
          head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE ||
          s.some((p) => p.x === head.x && p.y === head.y)
        ) {
          setRunning(false);
          setOver(true);
          setScore((sc) => { onGameOver(sc); return sc; });
          return s;
        }
        const ate = head.x === food.x && head.y === food.y;
        const next = [head, ...s];
        if (!ate) next.pop();
        else {
          setScore((sc) => sc + 1);
          setFood(rndCell(next));
        }
        return next;
      });
    }, 130);
    return () => clearInterval(t);
  }, [running, food, onGameOver]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <div className="font-medium">Score: <span className="text-primary">{score}</span></div>
        <div className="text-muted-foreground">Best: {highScore}</div>
      </div>
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative aspect-square w-full max-w-md mx-auto rounded-xl border border-border bg-card overflow-hidden touch-none"
        style={{ display: "grid", gridTemplateColumns: `repeat(${SIZE}, 1fr)`, gridTemplateRows: `repeat(${SIZE}, 1fr)` }}
      >
        {Array.from({ length: SIZE * SIZE }).map((_, i) => {
          const x = i % SIZE, y = Math.floor(i / SIZE);
          const isHead = snake[0].x === x && snake[0].y === y;
          const isBody = !isHead && snake.some((p) => p.x === x && p.y === y);
          const isFood = food.x === x && food.y === y;
          return (
            <div
              key={i}
              className={
                isHead ? "bg-gradient-accent" :
                isBody ? "bg-primary/70" :
                isFood ? "bg-accent rounded-full m-1" : ""
              }
            />
          );
        })}
        {!running && (
          <div className="absolute inset-0 grid place-items-center bg-background/80 backdrop-blur-sm">
            <div className="text-center space-y-3">
              {over && <p className="font-display text-xl">Game over! Score: {score}</p>}
              <Button variant="hero" onClick={reset}>
                {over ? <RotateCcw className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {over ? "Play again" : "Start"}
              </Button>
              <p className="text-xs text-muted-foreground">Arrow keys or swipe</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
