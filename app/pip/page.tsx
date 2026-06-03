"use client";

import Player from "@/components/Player";
import { useEffect, useState } from "react";

export default function PiP() {
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUrl(params.get("url") || "");
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden", // Crucial: Completely clips scroll bars globally
      }}
    >
      {/* 📺 DRAG AREA (TOP BAR) */}
      <div
        style={{
          height: 30,
          width: "100%",
          background: "#111",
          display: "flex",
          alignItems: "center",
          paddingLeft: 10,
          fontSize: 12,
          color: "#aaa",
          flexShrink: 0, // Blocks the title bar from collapsing or shrinking
          userSelect: "none",
        }}
      >
        📺 PiP Mode
      </div>

      {/* 🎥 VIDEO AREA */}
      <div
        style={{
          width: "100%",
          flexGrow: 1, // Automatically forces this layout frame to take up 100% of remaining space perfectly
          position: "relative",
          overflow: "hidden",
        }}
      >
        {url ? (
          <Player url={url} playerMode={"web"} />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "#666",
              fontSize: 12,
              fontFamily: "sans-serif",
            }}
          >
            No stream loaded
          </div>
        )}
      </div>
    </div>
  );
}
