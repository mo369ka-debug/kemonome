/**
 * shared/species.js
 *
 * 各動物種の視覚データ。DOMやReactに依存しない純粋なJSなので、
 * Web版(Canvas)でもネイティブ版(React Native + Skia)でもそのまま使える。
 *
 * 色変換: Machado, Oliveira & Fernandes (2009) の二色覚(deutan)
 * シミュレーション行列を「線形sRGB空間」で適用する。
 * 犬・猫はM錐体系を欠く二色型のため、ヒトの第2色覚(deuteranopia)が
 * 最も近いモデルとなる。犬猫専用の検証済み行列は学術的に確立されて
 * いないため、これは筋の通った近似である。
 *
 * ※ 実際の網膜知覚を厳密に再現するものではなく、教育目的で
 *   視覚的に近似したシミュレーション。
 */

// Machado et al. (2009) deuteranopia (severity 1.0)
export const DEUTAN = [
  0.367322, 0.860646, -0.227968,
  0.280085, 0.672501,  0.047413,
 -0.011820, 0.042940,  0.968881,
];

export const SPECIES = {
  human: {
    label: "ヒト",
    en: "HUMAN",
    emoji: "🧑",
    color: "#5B9BD5",
    glow: "rgba(91,155,213,0.4)",
    pupil: "round",
    cssFilter: "none",
    matrix: null,        // 線形空間で適用する3x3行列。null = 変換なし
    chroma: 1,           // 色の残し具合(1 = 行列そのまま)
    acuityBlurPx: 0,     // 視力ぼかしの基準量(px)。表示サイズ依存なので実機で微調整
    tint: null,          // 輝度保存の色味足し込み
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
    cssFilter: "contrast(1.05) brightness(1.08)",
    matrix: DEUTAN,
    chroma: 1.0,
    acuityBlurPx: 2.0,   // 犬 ≒ 20/75
    tint: { rgb: [203, 161, 53], strength: 0.2 },
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
    cssFilter: "contrast(0.96) brightness(1.18)",
    matrix: DEUTAN,
    chroma: 0.75,        // 猫は色識別が弱いとされるので彩度を落とす
    acuityBlurPx: 3.5,   // 猫 ≒ 20/100〜150
    tint: { rgb: [214, 196, 96], strength: 0.15 },
    data: {
      acuity: "0.1〜0.2前後（ヒトの20/100〜20/200相当）",
      color: "二色型 — 赤の識別が弱く、青・黄が中心（黄緑寄り）",
      fov: "約200°",
      note: "タペタム（輝板）により暗所視能力が非常に高い",
    },
  },
};

export const SPECIES_KEYS = Object.keys(SPECIES);
