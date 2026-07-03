import React, { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Upload, Download, RotateCcw, X, AlertCircle, SwitchCamera } from "lucide-react";

import { SPECIES } from "../../shared/species.js";
import { applyVisionToCanvas } from "../../shared/visionEngine.js";

const CANVAS_W = 480;
const CANVAS_H = 640; // 3:4 (縦持ちスマホ向け)

function applyVision(ctx, source, sw, sh, speciesKey) {
  applyVisionToCanvas(ctx, source, sw, sh, CANVAS_W, CANVAS_H, SPECIES[speciesKey]);
}

function PupilIcon({ shape, color, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill="none" stroke={color} strokeWidth="1.4" opacity="0.5" />
      {shape === "slit" ? (
        <ellipse cx="16" cy="16" rx="3.2" ry="10.5" fill={color} />
      ) : (
        <circle cx="16" cy="16" r="6.5" fill={color} />
      )}
    </svg>
  );
}

export default function App() {
  const [mode, setMode] = useState("cat");
  const [viewState, setViewState] = useState("idle");
  const [cameraError, setCameraError] = useState(null);
  const [facing, setFacing] = useState("environment"); // environment=外カメ / user=インカメ

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const modeRef = useRef(mode);
  const facingRef = useRef("environment");
  const uploadedImgRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    modeRef.current = mode;
    if (viewState === "captured" || viewState === "photo") redrawStatic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const redrawStatic = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (viewState === "photo" && uploadedImgRef.current) {
      const img = uploadedImgRef.current;
      applyVision(ctx, img, img.naturalWidth, img.naturalHeight, modeRef.current);
    }
  }, [viewState]);

  const drawLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.videoWidth > 0) {
      const ctx = canvas.getContext("2d");
      if (facingRef.current === "user") {
        // インカメは鏡像表示(セルフィーの自然な見え方)
        ctx.save();
        ctx.translate(CANVAS_W, 0);
        ctx.scale(-1, 1);
        applyVision(ctx, video, video.videoWidth, video.videoHeight, modeRef.current);
        ctx.restore();
      } else {
        applyVision(ctx, video, video.videoWidth, video.videoHeight, modeRef.current);
      }
    }
    rafRef.current = requestAnimationFrame(drawLoop);
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = async (facingMode) => {
    // onClickから直接呼ばれた場合などイベントが渡っても壊れないように防御
    if (typeof facingMode !== "string") facingMode = facingRef.current;
    setCameraError(null);
    uploadedImgRef.current = null;
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      setViewState("live");
      rafRef.current = requestAnimationFrame(drawLoop);
    } catch (err) {
      setCameraError(
        "カメラにアクセスできませんでした。写真をアップロードして色味を確認してください。"
      );
    }
  };

  const handleFlipCamera = () => {
    const next = facing === "environment" ? "user" : "environment";
    setFacing(next);
    facingRef.current = next;
    startCamera(next);
  };

  const handleCapture = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setViewState("captured");
  };

  const handleRetake = () => {
    setViewState("live");
    rafRef.current = requestAnimationFrame(drawLoop);
  };

  const handleClose = () => {
    stopCamera();
    uploadedImgRef.current = null;
    setViewState("idle");
    setCameraError(null);
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCamera();
    setCameraError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        uploadedImgRef.current = img;
        setViewState("photo");
        setTimeout(() => {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          applyVision(ctx, img, img.naturalWidth, img.naturalHeight, modeRef.current);
        }, 0);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kemonome_${mode}_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const spec = SPECIES[mode];
  const isLive = viewState === "live";
  const hasStatic = viewState === "captured" || viewState === "photo";
  const hasContent = isLive || hasStatic;

  return (
    <div style={styles.page}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        .kn-btn { transition: transform .12s ease, box-shadow .15s ease, background .15s ease; }
        .kn-btn:active { transform: scale(0.94) translateY(1px); }
        @keyframes kn-pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
        .kn-live-dot { animation: kn-pulse 1.4s ease-in-out infinite; }
        @keyframes kn-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .kn-bob { animation: kn-bob 2.4s ease-in-out infinite; }
        input[type=file] { display:none; }
      `}</style>

      <div style={styles.header}>
        <h1 style={styles.title}>けものめ</h1>
        <p style={styles.subtitle}>いぬ・ねこには世界がこう見えてる！</p>
      </div>

      <div style={styles.stageWrap}>
        <div style={{ ...styles.finder, borderColor: spec.color, boxShadow: `0 12px 30px -8px ${spec.glow}` }}>
          <div style={styles.finderInner}>
            <video ref={videoRef} muted playsInline style={{ display: "none" }} />
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              style={{
                width: "100%",
                height: "100%",
                display: hasContent ? "block" : "none",
                objectFit: "cover",
              }}
            />
            {!hasContent && (
              <div style={styles.placeholder}>
                <div className="kn-bob" style={{ fontSize: 44 }}>{spec.emoji}</div>
                <span style={styles.placeholderText}>カメラをスタートするか{"\n"}写真を選んでね</span>
              </div>
            )}

            {isLive && (
              <div style={styles.liveBadge}>
                <span className="kn-live-dot" style={{ ...styles.liveDot, background: spec.color }} />
                {spec.label}の目
              </div>
            )}

            {isLive && (
              <div style={styles.cameraBar}>
                <button className="kn-btn" style={styles.flipBtn} onClick={handleFlipCamera} aria-label="カメラ切り替え">
                  <SwitchCamera size={22} color="#fff" />
                </button>
                <button className="kn-btn" style={styles.shutterBtn} onClick={handleCapture} aria-label="撮影">
                  <span style={styles.shutterInner} />
                </button>
                <button className="kn-btn" style={styles.flipBtn} onClick={handleClose} aria-label="終了">
                  <X size={22} color="#fff" />
                </button>
              </div>
            )}

            {/* 角のかわいいフレーム装飾 */}
            <span style={{ ...styles.corner, ...styles.cornerTL, borderColor: spec.color }} />
            <span style={{ ...styles.corner, ...styles.cornerTR, borderColor: spec.color }} />
            <span style={{ ...styles.corner, ...styles.cornerBL, borderColor: spec.color }} />
            <span style={{ ...styles.corner, ...styles.cornerBR, borderColor: spec.color }} />
          </div>
        </div>
      </div>

      {cameraError && (
        <div style={styles.errorBox}>
          <AlertCircle size={16} color="#D98866" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{cameraError}</span>
        </div>
      )}

      <div style={styles.speciesRow}>
        {Object.entries(SPECIES).map(([key, s]) => {
          const active = mode === key;
          return (
            <button
              key={key}
              className="kn-btn"
              onClick={() => setMode(key)}
              style={{
                ...styles.speciesBtn,
                borderColor: s.color,
                background: active ? s.color : "#fff",
                boxShadow: active ? `0 4px 0 ${s.glow}` : "0 2px 4px rgba(90,70,50,0.1)",
              }}
            >
              <PupilIcon shape={s.pupil} color={active ? "#fff" : s.color} />
              <span style={{ color: active ? "#fff" : s.color, fontWeight: 700 }}>
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ ...styles.dataCard, background: `${spec.color}18`, borderColor: `${spec.color}55` }}>
        <div style={styles.dataTitle}>
          <span style={{ fontSize: 18 }}>{spec.emoji}</span>
          {spec.label}にはこう見えてる
        </div>
        <p style={styles.dataDesc}>{spec.data.color}</p>
        <div style={styles.chipRow}>
          <span style={styles.chip}>👁 視力 {spec.data.acuity}</span>
          <span style={styles.chip}>📐 視野 {spec.data.fov}</span>
        </div>
        <p style={styles.dataNote}>{spec.data.note}</p>
      </div>

      <div style={styles.controls}>
        {viewState === "idle" && (
          <>
            <button className="kn-btn" style={styles.primaryBtn} onClick={() => startCamera()}>
              <Camera size={18} /> カメラを起動
            </button>
            <button className="kn-btn" style={styles.secondaryBtn} onClick={handleUploadClick}>
              <Upload size={18} /> 写真をアップロード
            </button>
          </>
        )}

        {viewState === "live" && (
          <button className="kn-btn" style={styles.ghostBtn} onClick={handleUploadClick}>
            <Upload size={18} /> 写真を選ぶ
          </button>
        )}

        {hasStatic && (
          <>
            <button className="kn-btn" style={styles.primaryBtn} onClick={handleDownload}>
              <Download size={18} /> 画像を保存
            </button>
            {viewState === "captured" && (
              <button className="kn-btn" style={styles.secondaryBtn} onClick={handleRetake}>
                <RotateCcw size={18} /> 撮り直す
              </button>
            )}
            <button className="kn-btn" style={styles.secondaryBtn} onClick={handleUploadClick}>
              <Upload size={18} /> 別の写真
            </button>
            <button className="kn-btn" style={styles.ghostBtn} onClick={handleClose}>
              <X size={18} /> 閉じる
            </button>
          </>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} />
      </div>

      <p style={styles.footnote}>
        本アプリは犬・猫の色覚（二色型）・視力・視野・暗所視能力といった生物学的特徴を、
        教育目的で視覚的に近似した演出です。実際の網膜知覚を厳密に再現するものではありません。
        カメラ映像・写真はすべて端末内で処理され、サーバーへ送信されません。
      </p>
    </div>
  );
}
const SYS = "-apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#F6F8F4",
    color: "#3D4A3A",
    fontFamily: SYS,
    padding: "32px 16px 48px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  header: { textAlign: "center", maxWidth: 480, marginBottom: 22 },
  title: {
    fontFamily: SYS,
    fontWeight: 700,
    fontSize: "clamp(30px, 8vw, 40px)",
    margin: "0 0 8px",
    color: "#2E3A2B",
    letterSpacing: "0.01em",
  },
  subtitle: { fontSize: 15, color: "#7C8878", margin: 0, lineHeight: 1.6, fontWeight: 400 },

  stageWrap: { display: "flex", justifyContent: "center", marginBottom: 20, width: "100%" },
  finder: {
    position: "relative",
    width: "min(94vw, 420px)",
    aspectRatio: "3 / 4",
    borderRadius: 24,
    border: "none",
    background: "#fff",
    padding: 8,
    boxShadow: "0 8px 32px rgba(46,58,43,0.10), 0 2px 8px rgba(46,58,43,0.06)",
  },
  finderInner: {
    position: "relative",
    width: "100%",
    height: "100%",
    borderRadius: 18,
    overflow: "hidden",
    background: "#EDF0EA",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    padding: 20,
    textAlign: "center",
  },
  placeholderText: {
    fontSize: 14,
    color: "#93A08E",
    whiteSpace: "pre-line",
    lineHeight: 1.7,
    fontWeight: 400,
  },
  liveBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    fontFamily: SYS,
    fontSize: 13,
    fontWeight: 600,
    color: "#3D4A3A",
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(255,255,255,0.92)",
    padding: "5px 12px",
    borderRadius: 999,
    boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
  },
  liveDot: { width: 8, height: 8, borderRadius: "50%", display: "inline-block" },

  cameraBar: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    zIndex: 2,
  },
  shutterBtn: {
    width: 68,
    height: 68,
    borderRadius: "50%",
    border: "4px solid rgba(255,255,255,0.95)",
    background: "rgba(255,255,255,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },
  shutterInner: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: "#fff",
    display: "block",
  },
  flipBtn: {
    width: 46,
    height: 46,
    borderRadius: "50%",
    border: "none",
    background: "rgba(30,30,30,0.45)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },

  corner: {
    position: "absolute",
    width: 18,
    height: 18,
    border: "2.5px solid",
    borderRadius: 2,
    opacity: 0.85,
  },
  cornerTL: { top: 10, left: 10, borderRight: "none", borderBottom: "none" },
  cornerTR: { top: 10, right: 10, borderLeft: "none", borderBottom: "none" },
  cornerBL: { bottom: 10, left: 10, borderRight: "none", borderTop: "none" },
  cornerBR: { bottom: 10, right: 10, borderLeft: "none", borderTop: "none" },

  errorBox: {
    display: "flex",
    gap: 8,
    maxWidth: 380,
    fontSize: 13,
    lineHeight: 1.6,
    color: "#A85A38",
    background: "#FDEEE5",
    border: "none",
    borderRadius: 14,
    padding: "12px 14px",
    marginBottom: 16,
    fontWeight: 400,
    boxShadow: "0 2px 8px rgba(168,90,56,0.08)",
  },

  speciesRow: { display: "flex", gap: 8, marginBottom: 18 },
  speciesBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "10px 20px",
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    fontFamily: SYS,
    fontSize: 15,
  },

  dataCard: {
    width: "min(94vw, 420px)",
    border: "none",
    borderRadius: 20,
    padding: "18px 20px",
    marginBottom: 24,
    background: "#fff",
    boxShadow: "0 4px 20px rgba(46,58,43,0.08)",
  },
  dataTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontFamily: SYS,
    fontSize: 16,
    fontWeight: 700,
    color: "#2E3A2B",
    marginBottom: 8,
  },
  dataDesc: { fontSize: 14, lineHeight: 1.65, color: "#5C6858", margin: "0 0 12px", fontWeight: 400 },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: {
    fontSize: 12.5,
    fontWeight: 500,
    color: "#5C6858",
    background: "#F1F4EF",
    padding: "6px 12px",
    borderRadius: 999,
  },
  dataNote: { fontSize: 13, lineHeight: 1.6, color: "#93A08E", margin: 0, fontWeight: 400 },

  controls: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginBottom: 22,
  },
  primaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "14px 26px",
    borderRadius: 999,
    border: "none",
    background: "#6BA368",
    color: "#fff",
    fontWeight: 600,
    fontSize: 15,
    fontFamily: SYS,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(107,163,104,0.35)",
  },
  secondaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "14px 24px",
    borderRadius: 999,
    border: "none",
    background: "#fff",
    color: "#5C6858",
    fontWeight: 600,
    fontSize: 14.5,
    fontFamily: SYS,
    cursor: "pointer",
    boxShadow: "0 2px 10px rgba(46,58,43,0.10)",
  },
  ghostBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "14px 18px",
    borderRadius: 999,
    border: "none",
    background: "transparent",
    color: "#93A08E",
    fontSize: 14,
    fontWeight: 500,
    fontFamily: SYS,
    cursor: "pointer",
  },

  footnote: {
    maxWidth: 400,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 1.8,
    color: "#93A08E",
    fontWeight: 400,
  },
};
