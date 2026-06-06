// DiceBear avatar helpers. Uses the public HTTP API — no SDK required.
export const AVATAR_STYLES = [
  { id: "adventurer", name: "Adventurer", price: 0 },
  { id: "avataaars", name: "Avataaars", price: 50 },
  { id: "big-smile", name: "Big Smile", price: 50 },
  { id: "bottts", name: "Bottts", price: 75 },
  { id: "fun-emoji", name: "Fun Emoji", price: 75 },
  { id: "lorelei", name: "Lorelei", price: 100 },
  { id: "micah", name: "Micah", price: 100 },
  { id: "notionists", name: "Notionists", price: 150 },
  { id: "pixel-art", name: "Pixel Art", price: 150 },
  { id: "thumbs", name: "Thumbs", price: 200 },
] as const;

export type AvatarStyleId = (typeof AVATAR_STYLES)[number]["id"];

export function avatarUrl(style: string | null | undefined, seed: string | null | undefined, size = 128) {
  const s = style && style.length > 0 ? style : "adventurer";
  const sd = encodeURIComponent(seed && seed.length > 0 ? seed : "nextudy");
  return `https://api.dicebear.com/9.x/${s}/svg?seed=${sd}&size=${size}`;
}

export function randomSeed() {
  return Math.random().toString(36).slice(2, 10);
}
