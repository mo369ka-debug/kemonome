# けものめ (kemonome)

犬・猫が見ている世界を、カメラ越しに体験できるアプリ。

## 構成

```
kemonome/
├── shared/              ← DOM非依存の「純粋なロジック」。Web版・将来のネイティブ版で共有する
│   ├── species.js        ヒト/イヌ/ネコの視覚データ(色変換マトリクス・視力・視野など)
│   └── visionEngine.js    マトリクス適用・tint(色味の足し込み)などの計算処理
│
└── web/                 ← 今回のWeb版(Vite + React)
    ├── index.html
    └── src/
        ├── main.jsx
        └── App.jsx        カメラ/アップロードUI。shared/ のロジックを呼び出すだけ
```

**設計方針**: `shared/` には Canvas も React Native も知らない「動物種ごとの数値データと計算式」だけを置いている。
UI(カメラ制御・ボタン・レイアウト)は `web/` 側の関心事として分離した。
これにより、将来 React Native 版を作る際も `shared/species.js` の色変換マトリクスや視覚データは**そのまま使い回せる**。

## Web版の動かし方

```bash
cd web
npm install
npm run dev
```

## デプロイ(プレリリース)

Vercel や Netlify に `web/` ディレクトリをルートとして接続すればそのまま公開できる。
カメラ・写真処理はすべて端末内(ブラウザ)で完結し、画像データはサーバーに送信されない。

## 将来: iOS/Android ネイティブ版について

Web版で手応えが確認できたら、React Native (Expo) + `@shopify/react-native-skia` での実装を想定している。

- `shared/species.js` の `matrix` (3x3配列) は `toSkiaColorMatrix()` で
  Skia の ColorMatrix形式(4x5)に変換して、そのまま `Skia.ColorFilter.MakeMatrix()` に渡せる設計にしてある。
- リアルタイムのカメラ処理には `expo-camera` 単体では画素データへのアクセスができないため、
  `react-native-vision-camera` の Frame Processor + Skia を組み合わせる方式が現実的。
- そのため着手時は次のような構成を想定:

```
kemonome/
├── shared/        ← 変更なし、そのまま流用
├── web/           ← 変更なし
└── native/        ← 新規追加 (Expo + Skia)
```

この設計に沿って `shared/` を汚さずに `native/` を追加できるようにしておくこと。
