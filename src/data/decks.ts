export type Lang = "en" | "zh" | "ja";

// A single vocabulary card. `motion` must exactly match a Teachable Machine
// class name in the deck's exported model (besides the reserved "idle" class).
// `word`/`hint` are the English base; `i18n` holds optional translations.
export type Card = {
  word: string;
  motion: string;
  hint: string;
  i18n?: {
    zh?: { word: string; hint: string };
    ja?: { word: string; hint: string };
  };
};

/** Resolve a card's word + hint for a language, falling back to English. */
export function cardText(card: Card, lang: Lang): { word: string; hint: string } {
  if (lang === "en") return { word: card.word, hint: card.hint };
  const t = card.i18n?.[lang];
  return { word: t?.word ?? card.word, hint: t?.hint ?? card.hint };
}

export type Difficulty = "Easy" | "Medium" | "Hard";

export type Deck = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  difficulty: Difficulty;
  popularity: number;
  // Folder under /public/models/<id>/ holding model.json, metadata.json, weights.bin.
  // Until the real model is trained, the app falls back to the mock classifier.
  modelPath: string;
  cards: Card[];
};

// The reserved neutral class every model must include so the app does not
// false-trigger while the player is standing still.
export const IDLE_CLASS = "idle";

export const DECKS: Deck[] = [
  {
    id: "directions",
    title: "Directions",
    description: "Point your way through left, right, up and forward.",
    emoji: "",
    difficulty: "Easy",
    popularity: 1243,
    modelPath: "/models/directions/",
    cards: [
      { word: "Left",    motion: "left",    hint: "Extend your left arm to the left",
        i18n: { zh: { word: "左", hint: "向左伸出你的左臂" }, ja: { word: "左", hint: "左腕を左に伸ばす" } } },
      { word: "West",    motion: "left",    hint: "Extend your left arm — West on a map",
        i18n: { zh: { word: "西", hint: "伸出左臂——地图上的西方" }, ja: { word: "西", hint: "左腕を伸ばす——地図の西" } } },
      { word: "Right",   motion: "right",   hint: "Extend your right arm to the right",
        i18n: { zh: { word: "右", hint: "向右伸出你的右臂" }, ja: { word: "右", hint: "右腕を右に伸ばす" } } },
      { word: "East",    motion: "right",   hint: "Extend your right arm — East on a map",
        i18n: { zh: { word: "东", hint: "伸出右臂——地图上的东方" }, ja: { word: "東", hint: "右腕を伸ばす——地図の東" } } },
      { word: "Up",      motion: "up",      hint: "Raise your arms upward",
        i18n: { zh: { word: "上", hint: "向上举起你的手臂" }, ja: { word: "上", hint: "腕を上に上げる" } } },
      { word: "Above",   motion: "up",      hint: "Raise both arms upward",
        i18n: { zh: { word: "上方", hint: "双臂向上举起" }, ja: { word: "上に", hint: "両腕を上に上げる" } } },
      { word: "North",   motion: "up",      hint: "Point up — North on a compass",
        i18n: { zh: { word: "北", hint: "向上指——指南针上的北方" }, ja: { word: "北", hint: "上を指す——方位の北" } } },
      { word: "Forward", motion: "forward", hint: "Push both arms straight forward",
        i18n: { zh: { word: "前进", hint: "双臂笔直向前推" }, ja: { word: "前", hint: "両腕をまっすぐ前に押し出す" } } },
      { word: "Ahead",   motion: "forward", hint: "Push both arms forward",
        i18n: { zh: { word: "向前", hint: "双臂向前推" }, ja: { word: "前方", hint: "両腕を前に押し出す" } } },
    ],
  },
  {
    id: "body-parts",
    title: "Body Parts",
    description: "Touch your head, shoulders, knees and toes.",
    emoji: "",
    difficulty: "Medium",
    popularity: 867,
    modelPath: "/models/body-parts/",
    cards: [
      { word: "Head",     motion: "head",     hint: "Touch or point to your head",
        i18n: { zh: { word: "头", hint: "触摸或指向你的头" }, ja: { word: "頭", hint: "頭に触れる、または指す" } } },
      { word: "Forehead", motion: "head",     hint: "Touch your forehead",
        i18n: { zh: { word: "额头", hint: "触摸你的额头" }, ja: { word: "額", hint: "額に触れる" } } },
      { word: "Shoulders", motion: "shoulder", hint: "Touch your shoulders",
        i18n: { zh: { word: "肩膀", hint: "触摸你的肩膀" }, ja: { word: "肩", hint: "肩に触れる" } } },
      { word: "Knees",    motion: "knees",    hint: "Bend down and touch your knees",
        i18n: { zh: { word: "膝盖", hint: "弯下身触摸你的膝盖" }, ja: { word: "膝", hint: "かがんで膝に触れる" } } },
      { word: "Kneecap",  motion: "knees",    hint: "Tap your kneecap",
        i18n: { zh: { word: "膝盖骨", hint: "轻拍你的膝盖骨" }, ja: { word: "膝の皿", hint: "膝の皿を軽くたたく" } } },
      { word: "Toes",     motion: "toes",     hint: "Reach down and touch your toes",
        i18n: { zh: { word: "脚趾", hint: "弯下身触摸你的脚趾" }, ja: { word: "つま先", hint: "かがんでつま先に触れる" } } },
      { word: "Foot",     motion: "toes",     hint: "Look down at your foot",
        i18n: { zh: { word: "脚", hint: "低头看你的脚" }, ja: { word: "足", hint: "足を見下ろす" } } },
    ],
  },
  {
    id: "body-language",
    title: "Body Language",
    description: "Express abstract ideas — right, wrong, thinking, open, respect — through your body.",
    emoji: "",
    difficulty: "Medium",
    popularity: 634,
    modelPath: "/models/body-language/",
    cards: [
      { word: "Correct",  motion: "correct",  hint: "Make a big O shape with your arms overhead",
        i18n: { zh: { word: "正确", hint: "双臂在头顶做大圆圈" }, ja: { word: "正しい", hint: "頭の上で腕を大きな○の形にする" } } },
      { word: "OK",       motion: "correct",  hint: "Make a big O — that's OK!",
        i18n: { zh: { word: "好的", hint: "做个大圆圈——好的！" }, ja: { word: "オッケー", hint: "大きなOを作る——オッケー！" } } },
      { word: "Wrong",    motion: "wrong",    hint: "Cross your arms in a big X",
        i18n: { zh: { word: "错误", hint: "双臂交叉成大X" }, ja: { word: "間違い", hint: "腕を大きくXに交差する" } } },
      { word: "False",    motion: "wrong",    hint: "Make an X with your arms — false!",
        i18n: { zh: { word: "假", hint: "双臂做出X——错误！" }, ja: { word: "偽り", hint: "腕でXを作る——偽り！" } } },
      { word: "Thinking", motion: "thinking", hint: "Hand to chin — deep in thought",
        i18n: { zh: { word: "思考", hint: "手托下巴——深思" }, ja: { word: "考え中", hint: "手を顎に当てる——深く考える" } } },
      { word: "Braining", motion: "thinking", hint: "Hand to chin — use that brain!",
        i18n: { zh: { word: "动脑", hint: "手托下巴——动动脑筋！" }, ja: { word: "脳みそ全開", hint: "顎に手を当てる——頭を使え！" } } },
      { word: "T-Pose",   motion: "t_pose",   hint: "Stretch arms straight out to both sides",
        i18n: { zh: { word: "T字站姿", hint: "双臂向两侧平举" }, ja: { word: "Tポーズ", hint: "両腕を両側に水平に伸ばす" } } },
      { word: "Bow",      motion: "bow",      hint: "Bow forward — show respect",
        i18n: { zh: { word: "鞠躬", hint: "向前鞠躬——表示尊重" }, ja: { word: "お辞儀", hint: "前にお辞儀する" } } },
    ],
  },
];

export function getDeck(id: string): Deck | undefined {
  return DECKS.find((d) => d.id === id);
}
