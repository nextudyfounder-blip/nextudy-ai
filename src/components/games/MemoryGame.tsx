import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

const ICONS = ["📚", "🧠", "✏️", "🧪", "📐", "🌍", "🔬", "🎓"];

type Card = { id: number; icon: string; flipped: boolean; matched: boolean };

function buildDeck(): Card[] {
  const deck = [...ICONS, ...ICONS]
    .map((icon, i) => ({ id: i, icon, flipped: false, matched: false }))
    .sort(() => Math.random() - 0.5)
    .map((c, i) => ({ ...c, id: i }));
  return deck;
}

interface Props {
  bestMoves: number;
  onWin: (moves: number) => void;
}

export function MemoryGame({ bestMoves, onWin }: Props) {
  const [cards, setCards] = useState<Card[]>(buildDeck);
  const [picked, setPicked] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  const reset = () => {
    setCards(buildDeck());
    setPicked([]);
    setMoves(0);
    setWon(false);
  };

  const flip = (id: number) => {
    if (picked.length === 2) return;
    const c = cards.find((x) => x.id === id);
    if (!c || c.flipped || c.matched) return;
    setCards((cs) => cs.map((x) => (x.id === id ? { ...x, flipped: true } : x)));
    setPicked((p) => [...p, id]);
  };

  useEffect(() => {
    if (picked.length !== 2) return;
    setMoves((m) => m + 1);
    const [a, b] = picked.map((id) => cards.find((c) => c.id === id)!);
    if (a.icon === b.icon) {
      setCards((cs) => cs.map((x) => (x.id === a.id || x.id === b.id ? { ...x, matched: true } : x)));
      setPicked([]);
    } else {
      const t = setTimeout(() => {
        setCards((cs) => cs.map((x) => (x.id === a.id || x.id === b.id ? { ...x, flipped: false } : x)));
        setPicked([]);
      }, 700);
      return () => clearTimeout(t);
    }
  }, [picked, cards]);

  useEffect(() => {
    if (cards.length && cards.every((c) => c.matched) && !won) {
      setWon(true);
      onWin(moves);
    }
  }, [cards, won, moves, onWin]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <div className="font-medium">Moves: <span className="text-primary">{moves}</span></div>
        <div className="text-muted-foreground">Best: {bestMoves > 0 ? bestMoves : "—"}</div>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-md mx-auto">
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => flip(c.id)}
            className={`aspect-square rounded-xl text-3xl sm:text-4xl flex items-center justify-center transition-all border ${
              c.flipped || c.matched
                ? "bg-gradient-accent border-transparent shadow-glow"
                : "bg-card border-border hover:border-primary/50"
            }`}
            aria-label={c.flipped || c.matched ? c.icon : "Hidden card"}
          >
            {(c.flipped || c.matched) && c.icon}
          </button>
        ))}
      </div>
      {won && (
        <div className="text-center space-y-3 pt-2">
          <p className="font-display text-xl">You won in {moves} moves! 🎉</p>
          <Button variant="hero" onClick={reset}><RotateCcw className="h-4 w-4 mr-2" />Play again</Button>
        </div>
      )}
      {!won && (
        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="h-4 w-4 mr-2" />Restart</Button>
        </div>
      )}
    </div>
  );
}
