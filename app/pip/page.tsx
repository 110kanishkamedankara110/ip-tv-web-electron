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
        width: "100%",
        height: "100%",
        background: "#000",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 🔥 DRAG AREA (TOP BAR) */}
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
        }}
      >
        📺 PiP Mode
      </div>

      {/* 🎥 VIDEO AREA */}
      <div
        style={{
          width: "100%",
          height: "calc(100% - 30px)",
          position: "relative",
        }}
      >
        {url ? (
          <Player url={url}  playerMode={"web"} />
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
            }}
          >
            No stream loaded
          </div>
        )}
      </div>
    </div>
  );
}
