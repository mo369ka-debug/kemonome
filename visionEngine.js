/**
 * shared/visionEngine.js
 *
 * 「動物種のマトリクスをどう画素に適用するか」だけを担当する純粋関数群。
 * Canvas ImageData(Web)にも、将来的な Skia ColorFilter(React Native)にも
 * 同じ matrix/desaturate の数値をそのまま渡せるように設計している。
 */

/**
 * Web版: Canvas の ImageData に対して直接、色変換マトリクスと
 * 彩度低減(desaturate)を適用する。in-place で書き換えて返す。
 *
 * @param {ImageData} imageData - ctx.getImageData() の戻り値
 * @param {number[]} matrix - 3x3の色変換マトリクス(9要素, row-major)
 * @param {number} desaturate - 0〜1。1に近いほどグレーに寄る
 */
export function applyColorMatrixToImageData(imageData, matrix, desaturate = 0) {
  const d = imageData.data;
  const m = matrix;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    let nr = m[0] * r + m[1] * g + m[2] * b;
    let ng = m[3] * r + m[4] * g + m[5] * b;
    let nb = m[6] * r + m[7] * g + m[8] * b;
    if (desaturate > 0) {
      const lum = 0.299 * nr + 0.587 * ng + 0.114 * nb;
      nr += (lum - nr) * desaturate;
      ng += (lum - ng) * desaturate;
      nb += (lum - nb) * desaturate;
    }
    d[i] = nr;
    d[i + 1] = ng;
    d[i + 2] = nb;
  }
  return imageData;
}

/**
 * 将来のネイティブ版向け: 3x3マトリクスを Skia の ColorMatrix 形式
 * (4x5 = 20要素, RGBA + オフセット)に変換するヘルパー。
 *
 * React Native + @shopify/react-native-skia を導入したら、
 *   Skia.ColorFilter.MakeMatrix(toSkiaColorMatrix(species.matrix))
 * のような形でそのまま同じ視覚データを使い回せる。
 *
 * desaturate(輝度寄せ)は Skia 側では別途「元マトリクスと
 * グレースケール化マトリクスを線形補間」して事前計算するのが定石。
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

/**
 * 画像(Canvas / Video要素)を、指定サイズの正方形に「object-fit: cover」
 * 相当でクロップして描画する。
 */
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
 * 輝度を保ったまま色味だけを混ぜる「色相/彩度だけ置き換え」処理。
 * (Photoshopの「カラー」ブレンドモード相当を数値計算で再現)
 *
 * 前バージョンは単純に lum * tintColor を混ぜていたため、tint色自体の
 * 明るさ(203や184など255未満)に引っ張られて全体が暗く見える不具合があった。
 * tint色の輝度を測り、元画素の輝度に合わせてスケーリングすることで、
 * 明るさを変えずに色味だけを足し込む。
 *
 * globalCompositeOperation のようなCanvas固有のブレンドAPIに頼らず、
 * 純粋な数値計算だけで実装しているため、将来Skia側でも同じ結果を
 * 再現できる。
 *
 * @param {ImageData} imageData
 * @param {[number,number,number]} rgb - 足し込みたい色 (0-255)
 * @param {number} strength - 0〜1
 */
export function applyTint(imageData, rgb, strength = 0) {
  if (!strength) return imageData;
  const d = imageData.data;
  const [tr, tg, tb] = rgb;
  // tint色そのものの輝度(これが小さいほど暗く引っ張られやすい)
  const tintLum = 0.299 * tr + 0.587 * tg + 0.114 * tb || 1;
  for (let i = 0; i < d.length; i += 4) {
    const srcLum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    // 元画素と同じ明るさになるようtint色をスケーリング
    const scale = srcLum / tintLum;
    const tintedR = tr * scale;
    const tintedG = tg * scale;
    const tintedB = tb * scale;
    d[i] = d[i] + (tintedR - d[i]) * strength;
    d[i + 1] = d[i + 1] + (tintedG - d[i + 1]) * strength;
    d[i + 2] = d[i + 2] + (tintedB - d[i + 2]) * strength;
  }
  return imageData;
}

/**
 * Web版のメイン処理: source(video/image)を canvas に描画し、
 * 指定した動物種の視覚マトリクスを適用する。
 */
export function applyVisionToCanvas(ctx, source, sw, sh, canvasW, canvasH, spec) {
  ctx.save();
  ctx.filter = spec.cssFilter;
  drawCover(ctx, source, sw, sh, canvasW, canvasH);
  ctx.restore();

  if (spec.matrix) {
    const imgData = ctx.getImageData(0, 0, canvasW, canvasH);
    applyColorMatrixToImageData(imgData, spec.matrix, spec.desaturate || 0);
    if (spec.tint) applyTint(imgData, spec.tint.rgb, spec.tint.strength);
    ctx.putImageData(imgData, 0, 0);
  }
}
