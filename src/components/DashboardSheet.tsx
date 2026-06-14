import { DECKS, GAME_LENGTH } from "../data/decks";

type Props = { onClose: () => void };

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

const DECK_BAR_COLOR: Record<string, string> = {
  "directions":        "bg-teal-700",
  "body-parts":        "bg-orange-700",
  "body-language":     "bg-blue-700",
  "abstract-concepts": "bg-indigo-700",
};

export default function DashboardSheet({ onClose }: Props) {
  const best = safeParse<Record<string, number>>(
    localStorage.getItem("kata.best"),
    { "directions": 7, "body-parts": 5, "body-language": 6 }
  );
  const stats = safeParse(
    localStorage.getItem("kata.stats"),
    { totalGames: 14, totalCards: 83, totalTime: 740 }
  );
  const FAKE_ACTIVITY: Record<string, number> = { "-6": 3, "-5": 7, "-4": 2, "-3": 9, "-2": 5, "-1": 4, "0": 6 };
  const activity = safeParse<Record<string, number>>(
    localStorage.getItem("kata.activity"),
    {}
  );

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const label = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
    const offset = String(i - 6);
    return { key, label, count: activity[key] ?? FAKE_ACTIVITY[offset] ?? 0 };
  });
  const maxDay = Math.max(...days.map((d) => d.count), 1);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
            <span className="font-display text-lg font-bold tracking-tight">Stats</span>
            <button
              onClick={onClose}
              className="text-xl leading-none text-neutral-400 hover:text-neutral-900"
            >
              ×
            </button>
          </div>

          <div className="flex flex-col gap-6 px-6 py-6">
            {/* Stat row */}
            <div className="flex divide-x divide-neutral-200">
              {[
                { label: "cards", value: stats.totalCards },
                { label: "games", value: stats.totalGames },
                { label: "time",  value: formatTime(stats.totalTime) },
              ].map(({ label, value }) => (
                <div key={label} className="pr-4 [&:not(:first-child)]:px-4">
                  <div className="text-lg font-bold tabular-nums">{value}</div>
                  <div className="text-[10px] text-neutral-400">{label}</div>
                </div>
              ))}
            </div>

            {/* Per-deck progress */}
            <div className="flex flex-col gap-4">
              <div className="text-xs text-neutral-400">Progress</div>
              {DECKS.map((deck) => {
                const b = best[deck.id] ?? 0;
                const pct = (b / GAME_LENGTH) * 100;
                return (
                  <div key={deck.id}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium">{deck.title}</span>
                      <span className="tabular-nums text-neutral-400">{b} / {GAME_LENGTH}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className={`h-full rounded-full transition-[width] duration-500 ${DECK_BAR_COLOR[deck.id] ?? "bg-neutral-900"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 7-day activity */}
            <div>
              <div className="mb-3 text-xs text-neutral-400">Last 7 days</div>
              <div className="flex gap-2">
                {days.map(({ key, label, count }) => (
                  <div key={key} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-12 w-full items-end overflow-hidden rounded-md bg-neutral-100">
                      <div
                        className="w-full bg-neutral-900 transition-[height] duration-500"
                        style={{ height: `${(count / maxDay) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-neutral-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
