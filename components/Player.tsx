import Hls from "hls.js";
import React, { useEffect, useRef } from "react";

type PlayerProps = {
  url?: string | null;
  playerMode: "web" | "vlc";
};

export default function Player({ url, playerMode }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // ================= VLC MODE =================
  useEffect(() => {
    if (playerMode !== "vlc") return;
    if (!url) return;
  }, [playerMode, url]);

  // ================= WEB MODE =================
  useEffect(() => {
    const video = videoRef.current;

    if (playerMode !== "web") return;
    if (!video || !url) return;

    // cleanup safely
    try {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    } catch {}

    video.src = "";

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
    } else {
      video.src = url;
    }

    return () => {
      try {
        hlsRef.current?.destroy();
        hlsRef.current = null;
      } catch {}
    };
  }, [url, playerMode]);

  // ================= UI ONLY =================
  if (!url) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <span style={{ color: "#6F7AA6" }}>Select channel</span>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", background: "#000" }}>
      {playerMode === "web" && (
        <video
          ref={videoRef}
          controls
          autoPlay
          playsInline
          style={{ width: "100%", height: "100%" }}
        />
      )}
    </div>
  );
}
