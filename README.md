# けものめ (kemonome)

犬・猫が見ている世界を、カメラ越しに体験できるアプリ。

## 構成

- `shared/` … DOM非依存の純粋なロジック。Web版・将来のネイティブ版で共有する
  - `species.js` … ヒト/イヌ/ネコの視覚データ(色変換マトリクス・視力・視野など)
  - `visionEngine.js` … マトリクス適用・tint(色味の足し込み)などの計算処理
- `web/` … Web版 (Vite + React)。UIは `shared/` のロジックを呼び出すだけ

## Web版の動かし方

```bash
cd web
npm install
npm run dev
