// shared/species.js
// 各動物種の色覚モデル。
// matrix は「線形sRGB空間」で使う二色型シミュレーション行列。
// 出典の考え方: Machado, Oliveira & Fernandes (2009) の二色覚シミュレーション行列。
// 犬・猫は M 錐体を欠く二色型で、人間の第2色覚(deuteranopia)が最も近いモデル。
// ※ 犬猫「専用」の検証済み行列は学術的に確立されていないため、これは筋の通った近似です。

const DEUTAN = [
  0.367322, 0.860646, -0.227968,
  0.280085, 0.672501,  0.047413,
 -0.011820, 0.042940,  0.968881,
];

export const SPECIES = {
  dog: {
    id: 'dog',
    label: '犬',
    matrix: DEUTAN,
    chroma: 1.0,        // 色の残し具合(1 = 行列そのまま)
    acuityBlurPx: 2.0,  // 視力ぼかしの基準量(犬 ≒ 20/75)
  },
  cat: {
    id: 'cat',
    label: '猫',
    matrix: DEUTAN,
    chroma: 0.75,       // 猫は色識別が弱いとされるので彩度を少し落とす
    acuityBlurPx: 3.5,  // 視力ぼかしの基準量(猫 ≒ 20/100〜150)
  },
};
