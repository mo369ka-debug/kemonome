import React, { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Upload, Download, RotateCcw, X, AlertCircle, Aperture } from "lucide-react";
import { SPECIES } from "../../shared/species.js";
import { applyVisionToCanvas } from "../../shared/visionEngine.js";

const CANVAS_SIZE = 480;

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
  const [mode, setMode] = useState("human");
  const [viewState, setViewState] = useState("idle"); // idle | live | captured | photo
  const [cameraError, setCameraError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const modeRef = useRef(mode);
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
      applyVisionToCanvas(ctx, img, img.naturalWidth, img.naturalHeight, CANVAS_SIZE, SPECIES[modeRef.current]);
    }
  }, [viewState]);

  const drawLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.videoWidth > 0) {
      const ctx = canvas.getContext("2d");
      applyVisionToCanvas(ctx, video, video.videoWidth, video.videoHeight, CANVAS_SIZE, SPECIES[modeRef.current]);
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

  const startCamera = async () => {
    setCameraError(null);
    uploadedImgRef.current = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
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
        "カメラにアクセスできませんでした。ブラウザの権限設定をご確認いただくか、下の「写真をアップロード」からお試しください。"
      );
    }
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
          applyVisionToCanvas(ctx, img, img.naturalWidth, img.naturalHeight, CANVAS_SIZE, SPECIES[modeRef.current]);
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
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        .kn-btn { transition: transform .15s ease, border-color .15s ease, background .15s ease; }
        .kn-btn:active { transform: scale(0.96); }
        .kn-tick { position:absolute; left:50%; top:50%; width:1px; height:8px; background:rgba(236,230,214,0.22); transform-origin:0 ${CANVAS_SIZE / 2 + 18}px; }
        @keyframes kn-pulse { 0%,100% { opacity:1; } 50% { opacity:.35; } }
        .kn-live-dot { animation: kn-pulse 1.6s ease-in-out infinite; }
        input[type=file] { display:none; }
      `}</style>

      <div style={styles.header}>
        <div style={styles.eyebrow}>ANIMAL VISION LAB</div>
        <h1 style={styles.title}>けものめ</h1>
        <p style={styles.subtitle}>犬・猫が見ている世界を、カメラ越しに覗いてみる。</p>
      </div>

      <div style={styles.stageWrap}>
        <div style={{ ...styles.ring, boxShadow: `0 0 0 1px rgba(236,230,214,0.1), 0 0 40px ${spec.glow}` }}>
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="kn-tick" style={{ transform: `rotate(${i * 15}deg)` }} />
          ))}
          <div style={styles.circleMask}>
            <video ref={videoRef} muted playsInline style={{ display: "none" }} />
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              style={{
                width: "100%",
                height: "100%",
                display: hasContent ? "block" : "none",
                borderRadius: "50%",
              }}
            />
            {!hasContent && (
              <div style={styles.placeholder}>
                <Aperture size={40} strokeWidth={1.2} color="rgba(236,230,214,0.35)" />
                <span style={styles.placeholderText}>カメラを起動するか{"\n"}写真を選んでください</span>
              </div>
            )}
          </div>

          {isLive && (
            <div style={styles.liveBadge}>
              <span className="kn-live-dot" style={{ ...styles.liveDot, background: spec.color }} />
              LIVE — {spec.en}
            </div>
          )}
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
                borderColor: active ? s.color : "rgba(236,230,214,0.16)",
                background: active ? "rgba(236,230,214,0.06)" : "transparent",
              }}
            >
              <PupilIcon shape={s.pupil} color={active ? s.color : "rgba(236,230,214,0.4)"} />
              <span style={{ color: active ? s.color : "rgba(236,230,214,0.55)", fontWeight: 600 }}>
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ ...styles.dataCard, borderColor: `${spec.color}55` }}>
        <div style={styles.dataRow}>
          <span style={styles.dataLabel}>視力</span>
          <span style={styles.dataValue}>{spec.data.acuity}</span>
        </div>
        <div style={styles.dataRow}>
          <span style={styles.dataLabel}>色覚</span>
          <span style={styles.dataValue}>{spec.data.color}</span>
        </div>
        <div style={styles.dataRow}>
          <span style={styles.dataLabel}>視野</span>
          <span style={styles.dataValue}>{spec.data.fov}</span>
        </div>
        <div style={styles.dataRow}>
          <span style={styles.dataLabel}>特徴</span>
          <span style={styles.dataValue}>{spec.data.note}</span>
        </div>
      </div>

      <div style={styles.controls}>
        {viewState === "idle" && (
          <>
            <button className="kn-btn" style={styles.primaryBtn} onClick={startCamera}>
              <Camera size={18} /> カメラを起動
            </button>
            <button className="kn-btn" style={styles.secondaryBtn} onClick={handleUploadClick}>
              <Upload size={18} /> 写真をアップロード
            </button>
          </>
        )}

        {viewState === "live" && (
          <>
            <button className="kn-btn" style={styles.primaryBtn} onClick={handleCapture}>
              <Aperture size={18} /> 撮影する
            </button>
            <button className="kn-btn" style={styles.secondaryBtn} onClick={handleUploadClick}>
              <Upload size={18} /> 写真を選ぶ
            </button>
            <button className="kn-btn" style={styles.ghostBtn} onClick={handleClose}>
              <X size={18} /> 終了
            </button>
          </>
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

const styles = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at 50% -10%, #1b221a 0%, #10160f 55%, #0c100b 100%)",
    color: "#ECE6D6",
    fontFamily: "'Inter', sans-serif",
    padding: "40px 20px 56px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  header: { textAlign: "center", maxWidth: 480, marginBottom: 28 },
  eyebrow: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.22em",
    color: "#6FB89A",
    marginBottom: 10,
  },
  title: {
    fontFamily: "'Fraunces', serif",
    fontStyle: "italic",
    fontWeight: 600,
    fontSize: "clamp(34px, 8vw, 48px)",
    margin: "0 0 8px",
    letterSpacing: "0.01em",
  },
  subtitle: { fontSize: 14, color: "rgba(236,230,214,0.6)", margin: 0, lineHeight: 1.6 },

  stageWrap: { display: "flex", justifyContent: "center", marginBottom: 22 },
  ring: {
    position: "relative",
    width: "min(92vw, 460px)",
    height: "min(92vw, 460px)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  circleMask: {
    position: "relative",
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    overflow: "hidden",
    background: "#181f16",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    padding: 20,
    textAlign: "center",
  },
  placeholderText: {
    fontSize: 12.5,
    color: "rgba(236,230,214,0.45)",
    whiteSpace: "pre-line",
    lineHeight: 1.6,
  },
  liveBadge: {
    position: "absolute",
    top: 6,
    left: "50%",
    transform: "translateX(-50%)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10.5,
    letterSpacing: "0.08em",
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(12,16,11,0.75)",
    padding: "4px 10px",
    borderRadius: 20,
    border: "1px solid rgba(236,230,214,0.15)",
  },
  liveDot: { width: 6, height: 6, borderRadius: "50%", display: "inline-block" },

  errorBox: {
    display: "flex",
    gap: 8,
    maxWidth: 380,
    fontSize: 12.5,
    lineHeight: 1.6,
    color: "#E8C8B8",
    background: "rgba(217,136,102,0.08)",
    border: "1px solid rgba(217,136,102,0.3)",
    borderRadius: 10,
    padding: "10px 12px",
    marginBottom: 18,
  },

  speciesRow: { display: "flex", gap: 10, marginBottom: 18 },
  speciesBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "9px 16px",
    borderRadius: 24,
    border: "1px solid",
    background: "transparent",
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    fontSize: 13.5,
  },

  dataCard: {
    width: "min(90vw, 380px)",
    border: "1px solid",
    borderRadius: 12,
    padding: "14px 16px",
    background: "rgba(236,230,214,0.03)",
    marginBottom: 26,
  },
  dataRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    padding: "6px 0",
    borderBottom: "1px solid rgba(236,230,214,0.08)",
    fontSize: 12.5,
  },
  dataLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    color: "rgba(236,230,214,0.45)",
    flexShrink: 0,
  },
  dataValue: { textAlign: "right", color: "rgba(236,230,214,0.85)", lineHeight: 1.5 },

  controls: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },
  primaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 18px",
    borderRadius: 10,
    border: "1px solid #6FB89A",
    background: "#6FB89A",
    color: "#0c100b",
    fontWeight: 600,
    fontSize: 13.5,
    cursor: "pointer",
  },
  secondaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 18px",
    borderRadius: 10,
    border: "1px solid rgba(236,230,214,0.25)",
    background: "transparent",
    color: "#ECE6D6",
    fontWeight: 500,
    fontSize: 13.5,
    cursor: "pointer",
  },
  ghostBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 14px",
    borderRadius: 10,
    border: "1px solid transparent",
    background: "transparent",
    color: "rgba(236,230,214,0.5)",
    fontSize: 13.5,
    cursor: "pointer",
  },

  footnote: {
    maxWidth: 420,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 1.7,
    color: "rgba(236,230,214,0.35)",
  },
};
