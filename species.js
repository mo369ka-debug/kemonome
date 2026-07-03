/**
 * shared/species.js
 *
 * 犬・猫・人の視覚データ。DOMやReactに依存しない「純粋なJS」なので、
 * Web版(Canvas)でもネイティブ版(React Native + Skia)でもそのまま import して使える。
 *
 * ※ 実際の網膜知覚を厳密に再現するものではなく、二色型色覚・視力低下・
 *   広い視野・低照度感度といった実在の生物学的特徴を、教育目的で
 *   視覚的に近似したシミュレーションです。
 */

export const SPECIES = {
  human: {
    label: "ヒト",
    en: "HUMAN",
    emoji: "🧑",
    color: "#5B9BD5",
    glow: "rgba(91,155,213,0.4)",
    pupil: "round",
    // Web(Canvas)用: ctx.filter に渡す文字列
    cssFilter: "none",
    // 色変換用の 3x3 マトリクス。null = 変換なし
    matrix: null,
    // 変換後にどれだけ輝度方向へ寄せるか (0=そのまま, 1=完全グレー)
    desaturate: 0,
    tint: null,
    data: {
      acuity: "1.0（基準）",
      color: "三色型 — フルカラーを知覚",
      fov: "約180°",
      note: "解像度・色彩認識ともに最も高い",
    },
  },
  dog: {
    label: "イヌ",
    en: "DOG",
    emoji: "🐶",
    color: "#C77B3B",
    glow: "rgba(199,123,59,0.45)",
    pupil: "round",
    cssFilter: "contrast(1.05) brightness(1.08) blur(1px)",
    // 赤と緑をほぼ同一視し、黄〜琥珀色に強く寄せる
    matrix: [0.5, 0.5, 0, 0.5, 0.5, 0, 0.1, 0.1, 0.8],
    desaturate: 0.35,
    tint: { rgb: [203, 161, 53], strength: 0.4 },
    data: {
      acuity: "0.3前後（ヒトの20/75相当）",
      color: "二色型 — 赤と緑の識別が苦手。青と黄を中心に知覚",
      fov: "約240〜250°（広い周辺視野）",
      note: "動体視力に優れ、薄暮でもよく見える",
    },
  },
  cat: {
    label: "ネコ",
    en: "CAT",
    emoji: "🐱",
    color: "#8FB93E",
    glow: "rgba(143,185,62,0.45)",
    pupil: "slit",
    cssFilter: "contrast(0.96) brightness(1.18) blur(1.3px)",
    // 赤と緑をゆるやかに混ぜつつ、青もある程度残す(強く青に寄せすぎない)
    matrix: [0.62, 0.38, 0, 0.38, 0.62, 0, 0.08, 0.17, 0.75],
    desaturate: 0.32,
    tint: { rgb: [214, 196, 96], strength: 0.22 },
    data: {
      acuity: "0.1〜0.2前後（ヒトの20/100〜20/200相当）",
      color: "二色型 — 赤の識別が弱く、青・黄が中心（黄緑寄り）",
      fov: "約200°",
      note: "タペタム（輝板）により暗所視能力が非常に高い",
    },
  },
};

export const SPECIES_KEYS = Object.keys(SPECIES);
