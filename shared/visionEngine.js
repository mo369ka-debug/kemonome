// shared/visionEngine.js
// sRGB を正しく線形化してから二色型変換をかける高精度版。
// pow() を毎ピクセル呼ばないよう、ガンマ変換は LUT(ルックアップテーブル)で高速化。

import { SPECIES } from './species.js';

// --- sRGB(0-255) -> 線形光(0-1) ---
const SRGB2LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  SRGB2LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// --- 線形光(0-1, 4096段階) -> sRGB(0-255) ---
const LIN2SRGB = new Uint8ClampedArray(4096);
for (let i = 0; i < 4096; i++) {
  const c = i / 4095;
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  LIN2SRGB[i] = Math.round(s * 255);
}

// 3x3 行列の積 A×B
function mul3(a, b) {
  const r = new Array(9);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return r;
}

// 彩度を落とす行列(線形光での Rec.709 輝度を使用)
function desatMatrix(c) {
  const lr = 0.2126, lg = 0.7152, lb = 0.0722, k = 1 - c;
  return [
    c + k * lr, k * lg,     k * lb,
    k * lr,     c + k * lg, k * lb,
    k * lr,     k * lg,     c + k * lb,
  ];
}

// 種ごとの「実効行列」を事前計算(chroma を行列に畳み込む → 実行時は掛け算1回だけ)
const EFFECTIVE = {};
for (const key in SPECIES) {
  const sp = SPECIES[key];
  EFFECTIVE[key] = mul3(desatMatrix(sp.chroma), sp.matrix);
}

// ImageData を直接書き換えて色覚変換を適用
export function applyColorVision(imageData, speciesId) {
  const m = EFFECTIVE[speciesId];
  if (!m) return imageData;
  const d = imageData.data;
  const m0 = m[0], m1 = m[1], m2 = m[2],
        m3 = m[3], m4 = m[4], m5 = m[5],
        m6 = m[6], m7 = m[7], m8 = m[8];

  for (let i = 0; i < d.length; i += 4) {
    const r = SRGB2LIN[d[i]], g = SRGB2LIN[d[i + 1]], b = SRGB2LIN[d[i + 2]];

    let R = m0 * r + m1 * g + m2 * b;
    let G = m3 * r + m4 * g + m5 * b;
    let B = m6 * r + m7 * g + m8 * b;

    R = R < 0 ? 0 : R > 1 ? 1 : R;
    G = G < 0 ? 0 : G > 1 ? 1 : G;
    B = B < 0 ? 0 : B > 1 ? 1 : B;

    d[i]     = LIN2SRGB[(R * 4095) | 0];
    d[i + 1] = LIN2SRGB[(G * 4095) | 0];
    d[i + 2] = LIN2SRGB[(B * 4095) | 0];
    // alpha(d[i+3])はそのまま
  }
  return imageData;
}
