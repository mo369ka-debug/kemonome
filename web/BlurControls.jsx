// web/src/BlurControls.jsx
// ぼかしトグルの見た目部品。useAcuityBlur が返す値をそのまま渡して使う。
// 例:
//   const blur = useAcuityBlur(speciesId);
//   <canvas ref={canvasRef} style={blur.canvasStyle} />
//   <BlurControls blur={blur} />

export function BlurControls({ blur }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={() => blur.setBlurOn((v) => !v)}>
        視力ぼかし: {blur.blurOn ? 'ON' : 'OFF'}
      </button>
      {blur.blurOn && (
        <button onClick={() => blur.setSenior((v) => !v)}>
          {blur.senior ? 'シニア' : '通常'}
        </button>
      )}
    </div>
  );
}
