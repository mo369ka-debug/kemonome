// web/src/useAcuityBlur.js
// 視力ぼかしの ON/OFF と 通常/シニア を管理する小さなフック。
// ぼかしは CSS フィルタで表示にかけるだけなので、ピクセル処理を重くしません(GPU任せ)。

import { useState } from 'react';
import { SPECIES } from '../../shared/species.js'; // ← パスは実際の構成に合わせて調整

export function useAcuityBlur(speciesId) {
  const [blurOn, setBlurOn] = useState(false);
  const [senior, setSenior] = useState(false);

  const sp = SPECIES[speciesId];
  const base = sp ? sp.acuityBlurPx : 0;
  const blurPx = blurOn ? base * (senior ? 2 : 1) : 0;

  // canvas の style にそのまま渡せる
  const canvasStyle = { filter: blurPx ? `blur(${blurPx}px)` : 'none' };

  return {
    blurOn, setBlurOn,
    senior, setSenior,
    blurPx,
    canvasStyle,
  };
}
