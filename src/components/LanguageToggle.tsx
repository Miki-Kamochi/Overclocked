import type { Lang } from "../data/decks";

type Props = {
  value: Lang;
  onChange: (lang: Lang) => void;
};

const OPTIONS: { id: Lang; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "zh", label: "中文" },
  { id: "ja", label: "日本語" },
];

/** Segmented control for choosing the card/speech language. */
export default function LanguageToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex gap-1 rounded-full bg-neutral-100 p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            value === opt.id
              ? "bg-neutral-900 text-white"
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
