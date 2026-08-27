import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/chat/Markdown";
import { useUnderglowClass, usePrefersReducedMotion } from "@/components/chat/LedFrame";

/** Splits into words while keeping whitespace so markdown stays intact. */
function wordChunks(text: string): string[] {
  return text.match(/\s+|\S+/g) ?? [];
}

/**
 * Renders an AI message. New messages reveal word-by-word (fade + slide) and
 * freeze permanently once fully rendered. User messages never use this.
 */
export function AiMessage({ content, animate = false }: { content: string; animate?: boolean }) {
  const glow = useUnderglowClass();
  const reduced = usePrefersReducedMotion();
  const chunks = wordChunks(content);
  const shouldAnimate = animate && !reduced;
  const [shown, setShown] = useState(shouldAnimate ? 0 : chunks.length);
  const done = useRef(!shouldAnimate);

  useEffect(() => {
    if (!shouldAnimate || done.current) {
      setShown(chunks.length);
      return;
    }
    let i = 0;
    const total = chunks.length;
    const step = Math.max(1, Math.round(total / 90));
    const timer = window.setInterval(() => {
      i += step;
      if (i >= total) {
        setShown(total);
        done.current = true;
        window.clearInterval(timer);
      } else {
        setShown(i);
      }
    }, 22);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, shouldAnimate]);

  const visible = shown >= chunks.length ? content : chunks.slice(0, shown).join("");
  const streaming = shown < chunks.length;

  return (
    <div className={glow}>
      <div className={streaming ? "ai-stream-tail" : undefined}>
        <Markdown content={visible} />
      </div>
    </div>
  );
}

const STATUSES = ["Thinking…", "Getting information…", "Composing your answer…"];

/** Sleek pulsing status indicator shown below the input bar while generating. */
export function AiStatusIndicator() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % STATUSES.length), 1800);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="flex items-center justify-center gap-2 py-1.5 text-xs text-muted-foreground animate-fade-in" aria-live="polite">
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((d) => (
          <span
            key={d}
            className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 ai-status-dot"
            style={{ animationDelay: `${d * 0.18}s` }}
          />
        ))}
      </span>
      <span className="font-medium">{STATUSES[index]}</span>
    </div>
  );
}
