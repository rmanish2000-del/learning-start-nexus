import { useEffect, useMemo } from "react";
import { PartyPopper, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CelebrationProps {
  show: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

const CONFETTI_COLORS = ["#017C5D", "#10b981", "#f59e0b", "#38bdf8", "#f472b6", "#a78bfa"];

/**
 * Lightweight milestone celebration: confetti burst + message card.
 *
 * Visibility is driven directly by the `show` prop — there is intentionally
 * no internal "visible" latch. A previous version kept its own state that
 * only ever flipped to true, so `onClose` could never dismiss the modal and
 * users were trapped behind the blurred overlay.
 */
export function Celebration({ show, title, message, onClose }: CelebrationProps) {
  // Escape key closes the celebration like any other dismiss path.
  useEffect(() => {
    if (!show) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [show, onClose]);

  const pieces = useMemo(
    () =>
      Array.from({ length: 56 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        duration: 2.4 + Math.random() * 1.6,
        size: 6 + Math.random() * 8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.random() * 360,
      })),
    [],
  );

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <style>{`
        @keyframes eduos-confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.4; }
        }
        @keyframes eduos-celebrate-in {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div className="absolute inset-0 overflow-hidden bg-background/70 backdrop-blur-sm" onClick={onClose}>
        {pieces.map((p) => (
          <span
            key={p.id}
            className="absolute top-0"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 0.6,
              backgroundColor: p.color,
              borderRadius: 2,
              transform: `rotate(${p.rotate}deg)`,
              animation: `eduos-confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            }}
          />
        ))}
      </div>
      <div
        className="relative w-full max-w-sm rounded-2xl border bg-card p-8 text-center shadow-2xl"
        style={{ animation: "eduos-celebrate-in 0.35s ease-out" }}
      >
        <button
          onClick={onClose}
          aria-label="Close celebration"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <PartyPopper className="h-7 w-7 text-primary" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <Button className="mt-6 w-full" onClick={onClose}>
          Keep going
        </Button>
      </div>
    </div>
  );
}
