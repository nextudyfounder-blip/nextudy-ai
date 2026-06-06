import { avatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

interface Props {
  style?: string | null;
  seed?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ style, seed, size = 64, className }: Props) {
  return (
    <img
      src={avatarUrl(style, seed, size * 2)}
      alt="Avatar"
      width={size}
      height={size}
      className={cn("rounded-full bg-muted object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
