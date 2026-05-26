"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";

import ChannelCard from "@/components/ChannelCard";
import Player from "@/components/Player";
import { Channel, Playlist } from "@/types/DataTypes";

import {
  IoAdd,
  IoClose,
  IoDesktopOutline,
  IoFunnel,
  IoGlobeOutline,
  IoHeart,
  IoListOutline,
  IoTrash,
} from "react-icons/io5";

import { M3uParser } from "m3u-parser-generator";
import { useVirtualizer } from "@tanstack/react-virtual";

// ================= THEME =================
export const theme = {
  bg: "#05070F",
  card: "#0B1020",
  card2: "#101A33",
  accent: "#00F5D4",
  danger: "#FF3B6B",
  span: "#EAF2FF",
  muted: "#6F7AA6",
  border: "#1F2A44",
};

const FAVORITES_KEY = "@fav";
const ADDED_KEY = "@added_playlists";

export default function IPTVWebFull() {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [search, setSearch] = useState("");

  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavOnly, setShowFavOnly] = useState(false);

  const [activeFilters, setActiveFilters] = useState<{ category?: string }>({
    category: "All",
  });

  const [playerMode, setPlayerMode] = useState<"web" | "vlc">("web");
  const [current, setCurrent] = useState<Channel | null>(null);

  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const [playlistName, setPlaylistName] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState("");

  const [addedPlaylists, setAddedPlaylists] = useState<Playlist[]>([]);

  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist>({
    name: "IPTV Org",
    playlist: "https://iptv-org.github.io/iptv/index.m3u",
  });

  const cache = useRef<Record<string, Channel[]>>({});

  const isIPTVOrg = selectedPlaylist.name === "IPTV Org";

  // ================= LOAD STORAGE =================
  useEffect(() => {
    const fav = localStorage.getItem(FAVORITES_KEY);
    const added = localStorage.getItem(ADDED_KEY);

    if (fav) setFavorites(JSON.parse(fav));
    if (added) setAddedPlaylists(JSON.parse(added));
  }, []);

  // ================= FETCH =================
  const fetchChannels = async () => {
    try {
      let url = selectedPlaylist.playlist;

      if (isIPTVOrg && activeFilters.category !== "All") {
        url = `https://iptv-org.github.io/iptv/categories/${activeFilters.category}.m3u`;
      }

      if (cache.current[url]) {
        setChannels(cache.current[url]);
        return;
      }

      const res = await fetch(url);
      const text = await res.text();

      const parser = new M3uParser();
      const data = parser.parse(text);

      const parsed: Channel[] = data.medias.map((m: any, i: number) => ({
        id: `${m.location}-${i}`,
        name: m.name,
        location: m.location,
        attributes: m.attributes,
      }));

      cache.current[url] = parsed;
      setChannels(parsed);
    } catch {
      alert("Failed to load playlist");
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchChannels, 300);
    return () => clearTimeout(t);
  }, [selectedPlaylist, activeFilters.category]);

  // ================= FILTER =================
  const filtered = useMemo(() => {
    let list = [...channels];

    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(s) ||
          c.attributes?.["group-title"]?.toLowerCase().includes(s),
      );
    }

    if (showFavOnly) {
      list = list.filter((c) => favorites.includes(c.location || c.name || ""));
    }

    return list;
  }, [channels, search, showFavOnly, favorites]);

  useEffect(() => {
    if (playerMode === "vlc") {
      window?.electronAPI?.setWindowSize(420, 800);
      if (current) {
        window?.electronAPI?.playInVLC(current?.location);
      }
    } else {
      window?.electronAPI?.setWindowSize(1200, 800);
      window?.electronAPI?.stopVLC();
    }
  }, [playerMode, current]);

  // ================= VIRTUALIZER (FIXED) =================
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 10,
  });

  // ================= FAVORITES =================
  const toggleFav = useCallback(
    (ch: Channel) => {
      const id = ch.location || ch.name || "";
      let f = [...favorites];

      if (f.includes(id)) f = f.filter((x) => x !== id);
      else f.push(id);

      setFavorites(f);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(f));
    },
    [favorites],
  );

  const selectChannel = useCallback((ch: Channel) => {
    setCurrent(ch);
  }, []);

  // ================= PLAYLIST =================
  const addPlaylist = async () => {
    if (!playlistName || !playlistUrl) return;

    const newP: Playlist = {
      name: playlistName,
      playlist: playlistUrl,
    };

    const updated = [...addedPlaylists, newP];
    setAddedPlaylists(updated);
    localStorage.setItem(ADDED_KEY, JSON.stringify(updated));

    setPlaylistName("");
    setPlaylistUrl("");
    setShowAdd(false);
  };

  const deletePlaylist = (target: Playlist) => {
    const updated = addedPlaylists.filter(
      (p) => p.playlist !== target.playlist,
    );

    setAddedPlaylists(updated);
    localStorage.setItem(ADDED_KEY, JSON.stringify(updated));
  };
  const PREDEFINED: Playlist[] = [
    { name: "IPTV Org", playlist: "https://iptv-org.github.io/iptv/index.m3u" },
  ];
  // ================= UI =================
  return (
    <div style={{ display: "flex", height: "100vh", background: theme.bg }}>
      {/* ================= LEFT PLAYER ================= */}
      {playerMode !== "vlc" && (
        <div
          style={{
            flex: 3,
            background: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {current ? (
            <Player url={current.location} playerMode={playerMode} />
          ) : (
            <span style={{ color: theme.muted }}>Select channel</span>
          )}
        </div>
      )}

      {/* ================= RIGHT PANEL ================= */}
      <div
        style={{
          flex: 1.2,
          background: theme.card,
          display: "flex",
          flexDirection: "column",
          padding: 10,
        }}
      >
        {/* TOP BAR */}
        <button
          onClick={() => setPlayerMode(playerMode === "web" ? "vlc" : "web")}
          style={{
            width: "100%",
            padding: "10px 12px",
            marginBottom: 10,

            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,

            borderRadius: 12,
            cursor: "pointer",

            background:
              "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",

            border: `1px solid ${
              playerMode === "web" ? theme.accent : theme.border
            }`,

            boxShadow:
              playerMode === "web"
                ? "0 0 18px rgba(0,245,212,0.15)"
                : "0 8px 20px rgba(0,0,0,0.35)",

            color: theme.span,

            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.borderColor = theme.accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0px)";
            e.currentTarget.style.borderColor =
              playerMode === "web" ? theme.accent : theme.border;
          }}
        >
          {/* ICON */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: playerMode === "web" ? theme.accent : theme.muted,
              transition: "all 0.2s ease",
            }}
          >
            {playerMode === "web" ? (
              <IoGlobeOutline size={18} />
            ) : (
              <IoDesktopOutline size={18} />
            )}
          </div>

          {/* LABEL */}
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.5,
              color: playerMode === "web" ? theme.accent : theme.span,
            }}
          >
            {playerMode === "web" ? "WEB PLAYER" : "VLC MODE"}
          </span>

          {/* GLOW DOT */}
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: 10,
              marginLeft: "auto",
              backgroundColor:
                playerMode === "web" ? theme.accent : theme.muted,
              boxShadow:
                playerMode === "web" ? "0 0 10px rgba(0,245,212,0.8)" : "none",
            }}
          />
        </button>
        {/* SEARCH */}
        <div style={{ padding: 10 }}>
          <div
            style={{
              position: "relative",
              width: "100%",
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search channels"
              style={{
                width: "100%",
                padding: "12px 14px",
                paddingLeft: 38,
                background:
                  "linear-gradient(145deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                color: theme.span,
                border: "1px solid #1F2A44",
                borderRadius: 12,
                outline: "none",
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: 0.3,
                boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
                transition: "all 0.2s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.accent;
                e.currentTarget.style.boxShadow =
                  "0 0 0 2px rgba(0,245,212,0.15), 0 10px 25px rgba(0,0,0,0.45)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#1F2A44";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.35)";
              }}
            />

            {/* SEARCH ICON */}
            <div
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#6F7AA6",
                pointerEvents: "none",
                fontSize: 14,
              }}
            >
              🔍
            </div>

            {/* GLOW LINE */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 10,
                right: 10,
                height: 2,
                background:
                  "linear-gradient(90deg, transparent, #00F5D4, transparent)",
                opacity: 0.25,
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            padding: 12,
            justifyContent: "center",
            alignItems: "center",
            background:
              "linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
            border: "1px solid #1F2A44",
            borderRadius: 16,
            margin: "10px 0",
            backdropFilter: "blur(10px)",
          }}
        >
          {/* BUTTON STYLE BASE */}
          {[
            {
              icon: <IoListOutline size={18} />,
              onClick: () => setShowPlaylist(true),
              color: theme.span,
              glow: "#00F5D4",
            },
            ...(isIPTVOrg
              ? [
                  {
                    icon: <IoFunnel size={18} />,
                    onClick: () => setShowCategory(true),
                    color: theme.accent,
                    glow: "#00F5D4",
                  },
                ]
              : []),
            {
              icon: <IoAdd size={18} />,
              onClick: () => setShowAdd(true),
              color: theme.span,
              glow: "#7CFF6B",
            },
            {
              icon: <IoHeart size={18} />,
              onClick: () => setShowFavOnly(!showFavOnly),
              color: theme.danger,
              glow: "#FF3B6B",
            },
          ].map((b, i) => (
            <button
              key={i}
              onClick={b.onClick}
              style={{
                width: 42,
                height: 42,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 14,
                background:
                  "linear-gradient(145deg, rgba(17,28,51,0.9), rgba(11,18,32,0.9))",
                border: "1px solid #1F2A44",
                cursor: "pointer",
                color: b.color,
                transition: "all 0.2s ease",
                boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.transform = "scale(1.12)";
                el.style.boxShadow = `0 0 18px ${b.glow}33, 0 10px 25px rgba(0,0,0,0.5)`;
                el.style.borderColor = b.glow;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.transform = "scale(1)";
                el.style.boxShadow = "0 6px 18px rgba(0,0,0,0.35)";
                el.style.borderColor = "#1F2A44";
              }}
            >
              {b.icon}
            </button>
          ))}
        </div>
        {isIPTVOrg && activeFilters.category !== "All" && (
          <div
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.accent,
              padding: "4px 10px",
              borderRadius: 20,
              justifyContent: "center",
              display: "flex",
              marginBottom: 10,
            }}
          >
            <span style={{ color: theme.card, marginRight: 6 }}>
              {activeFilters.category}
            </span>
            <button onClick={() => setActiveFilters({ category: "All" })}>
              <IoClose size={18} color={theme.danger} />
            </button>
          </div>
        )}
        {/* VIRTUAL LIST */}
        <div
          ref={parentRef}
          style={{
            flex: 1,
            overflow: "auto",
            position: "relative",
          }}
        >
          <div
            style={{
              height: rowVirtualizer.getTotalSize(),
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((row) => {
              const item = filtered[row.index];

              return (
                <div
                  key={row.key}
                  style={{
                    position: "absolute",
                    width: "100%",
                    transform: `translateY(${row.start}px)`,
                    overflowX: "hidden",
                  }}
                >
                  <ChannelCard
                    channel={item}
                    isFavorite={favorites.includes(
                      item.location || item.name || "",
                    )}
                    toggleFavorite={toggleFav}
                    onSelect={selectChannel}
                    isPlaying={current?.location === item.location}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= MODALS (UNCHANGED LOGIC) ================= */}

      {showAdd && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "#000000cc",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            zIndex: 9999,
          }}
        >
          {/* MODAL BOX */}
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              backgroundColor: theme.card,
              padding: 20,
              borderRadius: 16,
            }}
          >
            {/* NAME INPUT */}
            <input
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              placeholder="Name"
              style={{
                width: "100%",
                backgroundColor: theme.card2,
                padding: 12,
                color: theme.span,
                border: "1px solid #1F2A44",
                borderRadius: 10,
                outline: "none",
              }}
            />

            {/* URL INPUT */}
            <input
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder="URL"
              style={{
                width: "100%",
                backgroundColor: theme.card2,
                padding: 12,
                marginTop: 10,
                color: theme.span,
                border: "1px solid #1F2A44",
                borderRadius: 10,
                outline: "none",
              }}
            />

            {/* ADD BUTTON */}
            <button
              onClick={addPlaylist}
              style={{
                width: "100%",
                marginTop: 12,
                padding: 12,
                borderRadius: 12,
                backgroundColor: theme.accent,
                border: "none",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              ADD PLAYLIST
            </button>
            <button
              onClick={() => setShowAdd(false)}
              style={{
                width: "100%",
                marginTop: 12,
                padding: 12,
                borderRadius: 12,
                backgroundColor: theme.danger,
                border: "none",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              CLOSE
            </button>
          </div>

          {/* CLOSE BUTTON */}
        </div>
      )}
      {showPlaylist && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "#000000cc",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 500,
              maxHeight: "80vh",
              backgroundColor: theme.card,
              borderRadius: 16,
              overflowY: "auto",
              padding: 10,
            }}
          >
            {[...PREDEFINED, ...addedPlaylists].map((p) => (
              <div
                key={p.playlist}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 12,
                  borderBottom: `1px solid ${theme.border}`,
                }}
              >
                {/* SELECT PLAYLIST */}
                <button
                  onClick={() => {
                    setSelectedPlaylist(p);
                    setShowPlaylist(false);
                  }}
                  style={{
                    flex: 1,
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ color: theme.accent }}>{p.name}</span>
                </button>

                {/* DELETE ONLY USER ADDED */}
                {addedPlaylists.some((x) => x.playlist === p.playlist) && (
                  <button
                    onClick={() => deletePlaylist(p)}
                    style={{
                      marginLeft: 10,
                      padding: 6,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <IoTrash size={18} color={theme.danger} />
                  </button>
                )}
              </div>
            ))}

            {/* CLOSE BUTTON */}
            <button
              onClick={() => setShowPlaylist(false)}
              style={{
                width: "100%",
                marginTop: 10,
                padding: 12,
                borderRadius: 10,
                border: "none",
                backgroundColor: theme.danger,
                color: "#fff",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {showCategory && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "#000000cc",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 400,
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 12,
            }}
          >
            {[
              "All",
              "movies",
              "sports",
              "music",
              "news",
              "kids",
              "documentary",
            ].map((c) => (
              <button
                key={c}
                onClick={() => {
                  setActiveFilters({ category: c });
                  setShowCategory(false);
                }}
                style={{
                  width: "100%",
                  padding: 12,
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <span style={{ color: theme.accent, fontSize: 15 }}>{c}</span>
              </button>
            ))}

            <button
              onClick={() => setShowCategory(false)}
              style={{
                width: "100%",
                marginTop: 10,
                padding: 10,
                borderRadius: 12,
                backgroundColor: theme.danger,
                border: "none",
                color: "#fff",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
