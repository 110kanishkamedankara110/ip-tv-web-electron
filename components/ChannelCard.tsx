"use client";

import { Channel } from "@/types/DataTypes";
import Image from "next/image";
import React, { memo, useState } from "react";
import { IoHeart } from "react-icons/io5";

const ChannelCard: React.FC<{
  channel: Channel;
  isFavorite: boolean;
  toggleFavorite: (channel: Channel) => void;
  onSelect: (channel: Channel | null) => void;
  isPlaying?: boolean;
}> = memo(({ channel, isFavorite, toggleFavorite, onSelect, isPlaying }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isHover, setIsHover] = useState(false);

  const active = isPlaying || isFocused;
  const hover = isHover;

  return (
    <div
      style={{
        marginTop: 10,
        marginLeft: 12,
        marginRight: 12,
        borderRadius: 18,

        transform: hover
          ? "translateY(-2px) scale(1.01)"
          : "translateY(0px) scale(1)",

        transition: "all 0.18s ease",
      }}
    >
      {/* CARD */}
      <div
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        style={{
          borderRadius: 18,

          background:
            "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",

          border: `1px solid ${
            isPlaying ? "#00F5D4" : isHover ? "#2D3F66" : "#1F2A44"
          }`,

          boxShadow: isPlaying
            ? "0 0 22px rgba(0,245,212,0.20)"
            : isHover
              ? "0 18px 40px rgba(0,0,0,0.65), 0 0 18px rgba(0,245,212,0.08)"
              : "0 8px 20px rgba(0,0,0,0.35)",

          transform: isHover
            ? "translateY(-4px) scale(1.015)"
            : "translateY(0px) scale(1)",

          transition: "all 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)",
          cursor: "pointer",
        }}
      >
        {/* SHINE EFFECT */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 18,
            pointerEvents: "none",
            background: isHover
              ? "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.06), transparent 70%)"
              : "transparent",
            transform: isHover ? "translateX(100%)" : "translateX(-100%)",
            transition: "transform 0.6s ease",
          }}
        />
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            onSelect(null);
            setTimeout(() => {
              onSelect(channel);
            }, 10);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            display: "flex",
            alignItems: "center",
            padding: 12,
            gap: 12,
          }}
        >
          {/* LOGO */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              backgroundColor: "#111C33",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              border: "1px solid #1F2A44",
              flexShrink: 0,

              transform: hover ? "scale(1.05)" : "scale(1)",
              transition: "all 0.18s ease",
            }}
          >
            {channel.attributes?.["tvg-logo"] ? (
              <Image
                src={channel.attributes["tvg-logo"]}
                width={48}
                height={48}
                alt={channel.name || "channel"}
                style={{
                  objectFit: "contain",
                  transition: "all 0.2s ease",
                  width: "auto",
                  height: "auto",
                }}
              />
            ) : (
              <span style={{ color: "#00F5D4", fontWeight: 700 }}>
                {channel.name?.slice(0, 2).toUpperCase() || "TV"}
              </span>
            )}
          </div>

          {/* INFO */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: "#EAF2FF",
                fontSize: 15,
                fontWeight: 700,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {channel.name}
            </div>

            <div
              style={{
                color: "#6F7AA6",
                fontSize: 12,
                marginTop: 3,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {channel.attributes?.["group-title"] || "Unknown Category"}
            </div>

            {/* LIVE */}
            <div
              style={{
                marginTop: 6,
                height: 14,
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 10,
                  backgroundColor: isPlaying ? "#00F5D4" : "transparent",
                  marginRight: 6,
                  boxShadow: isPlaying
                    ? "0 0 10px rgba(0,245,212,0.8)"
                    : "none",
                }}
              />

              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: isPlaying ? "#00F5D4" : "transparent",
                }}
              >
                NOW PLAYING
              </span>
            </div>
          </div>

          {/* FAVORITE BUTTON */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(channel);
            }}
            style={{
              width: 42,
              height: 42,
              flexShrink: 0,
              marginLeft: "auto",

              borderRadius: 12,
              background: isHover
                ? "linear-gradient(145deg, #16223D, #0B1220)"
                : "linear-gradient(145deg, #111C33, #0B1220)",

              border: `1px solid ${isHover ? "#2A3A5F" : "#1F2A44"}`,

              display: "flex",
              alignItems: "center",
              justifyContent: "center",

              transform: isHover ? "scale(1.08)" : "scale(1)",
              transition: "all 0.18s ease",

              cursor: "pointer",
            }}
          >
            <IoHeart size={18} color={isFavorite ? "#FF3B6B" : "#6F7AA6"} />
          </button>
        </div>
      </div>
    </div>
  );
});

ChannelCard.displayName = "ChannelCard";

export default React.memo(ChannelCard);
