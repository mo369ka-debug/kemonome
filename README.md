# けものめ 精度強化パッチ

## 中身

```
shared/species.js        ← 丸ごと差し替え(安全)
shared/visionEngine.js   ← 丸ごと差し替え(安全)
web/src/useAcuityBlur.js ← 新規追加(ぼかしトグルのロジック)
web/src/BlurControls.jsx ← 新規追加(ぼかしトグルのUI)
```

## 手順

1. `shared/species.js` と `shared/visionEngine.js` を **そのまま上書き**。
   - `applyColorVision(imageData, speciesId)` という呼び出しシグネチャは前と同じなので、呼び出し側は基本いじらなくてOK。

2. `web/src/useAcuityBlur.js` と `web/src/BlurControls.jsx` を追加。
   - `import { SPECIES } from '../../shared/species.js'` のパスだけ、実際の構成に合わせて直す。

3. カメラを描画しているコンポーネントで:
   ```jsx
   import { useAcuityBlur } from './useAcuityBlur.js';
   import { BlurControls } from './BlurControls.jsx';

   const blur = useAcuityBlur(speciesId);

   <canvas ref={canvasRef} style={blur.canvasStyle} />
   <BlurControls blur={blur} />
   ```

## 注意

- CSS ぼかしは「表示」だけにかかる。写真保存/録画には焼き込まれない。
  保存にも反映したいなら canvas 側で別途ぼかす処理が必要(その分重くなる)。
- ぼかし量(px)は端末・表示サイズ依存。実機を見ながら species.js の
  `acuityBlurPx` を微調整する。
- 速度をさらに稼ぎたいときは、処理用 canvas を長辺 480〜640px に縮小してから
  applyColorVision → 表示側で拡大、が一番効く。
