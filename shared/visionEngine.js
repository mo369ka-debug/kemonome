/**
 * shared/visionEngine.js
 *
 * 色変換エンジン。sRGBを線形化してから二色型行列を適用する高精度版。
 * ガンマ変換は LUT(ルックアップテーブル)で高速化し、pow()を毎ピクセル
 * 呼ばない。chroma(彩度低減)は行列に事前に畳み込み、実行時は行列積1回。
 *
 * applyVisionToCanvas() のシグネチャは従来互換 + blurPx を追加。
 */

/* --- sRGB(0-255) -> 線形光(0-1) --- */
const SRGB2LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  SRGB2LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/* --- 線形光(0-1, 4096段階) -> sRGB(0-255) --- */
const LIN2SRGB = new Uint8ClampedArray(4096);
for (let i = 0; i < 4096; i++) {
  const c = i / 4095;
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  LIN2SRGB[i] = Math.round(v * 255);
}

/** 3x3行列の積 A×B */
export function mul3(a, b) {
  const r = new Array(9);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return r;
}

/** 彩度を落とす行列(線形光での Rec.709 輝度を使用) */
export function desatMatrix(c) {
  const lr = 0.2126, lg = 0.7152, lb = 0.0722, k = 1 - c;
  return [
    c + k * lr, k * lg, k * lb,
    k * lr, c + k * lg, k * lb,
    k * lr, k * lg, c + k * lb,
  ];
}

/** chromaを畳み込んだ実効行列(spec上にキャッシュ) */
export function effectiveMatrix(spec) {
  if (!spec.matrix) return null;
  if (!spec._eff) spec._eff = mul3(desatMatrix(spec.chroma ?? 1), spec.matrix);
  return spec._eff;
}

/** 線形sRGB空間で二色型行列を適用(in-place) */
export function applyColorVisionLinear(imageData, m) {
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
    d[i] = LIN2SRGB[(R * 4095) | 0];
    d[i + 1] = LIN2SRGB[(G * 4095) | 0];
    d[i + 2] = LIN2SRGB[(B * 4095) | 0];
  }
  return imageData;
}

/** 輝度を保ったまま色味だけ混ぜる(暗くならない色被せ) */
export function applyTint(imageData, rgb, strength = 0) {
  if (!strength) return imageData;
  const d = imageData.data;
  const [tr, tg, tb] = rgb;
  const tintLum = 0.299 * tr + 0.587 * tg + 0.114 * tb || 1;
  for (let i = 0; i < d.length; i += 4) {
    const srcLum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const scale = srcLum / tintLum;
    d[i] = d[i] + (tr * scale - d[i]) * strength;
    d[i + 1] = d[i + 1] + (tg * scale - d[i + 1]) * strength;
    d[i + 2] = d[i + 2] + (tb * scale - d[i + 2]) * strength;
  }
  return imageData;
}

/** object-fit: cover 相当のクロップ描画 */
export function drawCover(ctx, source, sw, sh, dw, dh) {
  if (!sw || !sh) return;
  const sourceRatio = sw / sh;
  const destRatio = dw / dh;
  let sx = 0, sy = 0, cw = sw, ch = sh;
  if (sourceRatio > destRatio) {
    cw = sh * destRatio;
    sx = (sw - cw) / 2;
  } else {
    ch = sw / destRatio;
    sy = (sh - ch) / 2;
  }
  ctx.drawImage(source, sx, sy, cw, ch, 0, 0, dw, dh);
}

/**
 * Web版のメイン処理。
 * blurPx > 0 なら描画パイプライン(ctx.filter)でぼかすため、
 * 保存されるPNGにもぼかしが反映される。
 */
export function applyVisionToCanvas(ctx, source, sw, sh, canvasW, canvasH, spec, blurPx = 0) {
  ctx.save();
  const blurPart = blurPx > 0 ? ` blur(${blurPx}px)` : "";
  ctx.filter = ((spec.cssFilter === "none" ? "" : spec.cssFilter) + blurPart) || "none";
  drawCover(ctx, source, sw, sh, canvasW, canvasH);
  ctx.restore();

  const m = effectiveMatrix(spec);
  if (m) {
    const imgData = ctx.getImageData(0, 0, canvasW, canvasH);
    applyColorVisionLinear(imgData, m);
    if (spec.tint) applyTint(imgData, spec.tint.rgb, spec.tint.strength);
    ctx.putImageData(imgData, 0, 0);
  }
}

/**
 * 将来のネイティブ版向け: 3x3行列をSkiaのColorMatrix形式(4x5)へ。
 * 注意: Skiaで線形空間処理をするには ColorFilter の合成
 * (MakeSRGBToLinearGamma -> MakeMatrix -> MakeLinearToSRGBGamma) を使う。
 */
export function toSkiaColorMatrix(matrix3x3) {
  const [m11, m12, m13, m21, m22, m23, m31, m32, m33] = matrix3x3;
  return [
    m11, m12, m13, 0, 0,
    m21, m22, m23, 0, 0,
    m31, m32, m33, 0, 0,
    0, 0, 0, 1, 0,
  ];
}
