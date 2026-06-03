"use client";
import React, { useEffect, useRef } from "react";

type PlayerProps = {
  url?: string | null;
  playerMode: "web" | "mpv";
};

export default function Player({ url, playerMode }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (playerMode !== "mpv" || !url) return;
  }, [playerMode, url]);

  useEffect(() => {
    const video = videoRef.current;
    if (playerMode !== "web" || !video || !url) return;

    const targetProxyUrl = `http://localhost:3001/api/stream?url=${encodeURIComponent(url)}`;

    // Refresh video source cleanly
    video.src = targetProxyUrl;
    video.load();

    video.play().catch((err) => {
      console.warn("Autoplay managed:", err.message);
    });

    return () => {
      if (video) {
        video.pause();
        video.src = "";
      }
    };
  }, [url, playerMode]);

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
        <span style={{ color: "#6F7AA6", fontFamily: "sans-serif" }}>
          Select channel
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#000",
        overflow: "hidden",
      }}
    >
      {playerMode === "web" && (
        <video
          key={url}
          ref={videoRef}
          controls
          autoPlay
          disablePictureInPicture={true}
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain", // Keeps aspect ratio perfect inside tiny PiP windows
            display: "block", // Removes extra browser padding spacing under inline components
          }}
        />
      )}
    </div>
  );
}
