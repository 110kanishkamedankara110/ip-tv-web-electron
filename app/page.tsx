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
  IoPencil,
  IoTrash,
} from "react-icons/io5";

import { M3uMedia, M3uParser } from "m3u-parser-generator";
import { useVirtualizer } from "@tanstack/react-virtual";
import axios from "axios";
import { BsPip } from "react-icons/bs";
import { VscScreenFull } from "react-icons/vsc";

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
  const [loading, setLoading] = useState(false);
  const [loadingButton, setLoadingButton] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [search, setSearch] = useState("");
  const [editIndex, setEditIndex] = useState<null | number>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [isPip, setPip] = useState<boolean>(false);
  const [showPlayer, setShowPlayer] = useState(true);
  const [activeFilters, setActiveFilters] = useState<{ category?: string }>({
    category: "All",
  });

  const [playerMode, setPlayerMode] = useState<"web" | "mpv">("web");
  const [current, setCurrent] = useState<Channel | null>(null);

  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState("");

  const [addedPlaylists, setAddedPlaylists] = useState<Playlist[]>([]);

  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist>();
  const cache = useRef(new Map<string, Channel[]>());
  const isIPTVOrg = selectedPlaylist?.name === "IPTV Org";

  const showToast = (message: string, type: Toast["type"] = "info") => {
    const id = Date.now();

    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 8000);
  };

  const { url, cacheKey } = useMemo(() => {
    let u = selectedPlaylist?.playlist ?? "";

    if (isIPTVOrg && activeFilters.category !== "All") {
      u = `https://iptv-org.github.io/iptv/categories/${activeFilters.category}.m3u`;
    }

    return {
      url: u,
      cacheKey: isIPTVOrg ? `${u}:${activeFilters.category}` : u,
    };
  }, [selectedPlaylist?.playlist, activeFilters.category, isIPTVOrg]);
  const parserRef = useRef(new M3uParser());

  const categories = [
    "All",
    "animation",
    "auto",
    "business",
    "classic",
    "comedy",
    "cooking",
    "culture",
    "documentary",
    "education",
    "entertainment",
    "family",
    "general",
    "interactive",
    "kids",
    "legislative",
    "lifestyle",
    "movies",
    "music",
    "news",
    "outdoor",
    "public",
    "relax",
    "religious",
    "science",
    "series",
    "shop",
    "sports",
    "travel",
    "weather",
    "undefined",
  ];

  useEffect(() => {
    const fav = localStorage.getItem(FAVORITES_KEY);
    const added = localStorage.getItem(ADDED_KEY);
    setSelectedPlaylist(
      localStorage.getItem("SELECTED_PLAYLIST")
        ? JSON.parse(localStorage.getItem("SELECTED_PLAYLIST") as string)
        : {
            name: "IPTV Org",
            playlist: "https://iptv-org.github.io/iptv/index.m3u",
          },
    );
    if (fav) setFavorites(JSON.parse(fav));
    if (added) setAddedPlaylists(JSON.parse(added));
  }, []);

  useEffect(() => {
    return () => {
      window?.electronAPI?.stopMpv();
    };
  }, []);

  const fetchChannels = async () => {
    try {
      if (!selectedPlaylist) return;

      setLoading(true);

      const cached = cache.current.get(cacheKey);

      if (cached) {
        setChannels(cached);
        setLoading(false);
        return;
      }

      const text = window?.electronAPI
        ? await window.electronAPI.fetchM3U(url)
        : (
            await axios.get(url, {
              responseType: "text",
              timeout: 15000,
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
              },
            })
          ).data;

      const data = parserRef.current.parse(text);

      const parsed: Channel[] = data.medias.map((m: M3uMedia, i: number) => ({
        id: `${m.location ?? m.name ?? "channel"}-${i}`,
        name: m.name ?? "Unknown",
        location: m.location ?? "",
        attributes: {
          "tvg-id": m.attributes?.["tvg-id"] ?? "",
          "tvg-logo": m.attributes?.["tvg-logo"] ?? "",
          "group-title": m.attributes?.["group-title"] ?? "",
        },
      }));
      cache.current.set(cacheKey, parsed);
      setChannels(parsed);
    } catch (e) {
      console.log(e);
      showToast("Failed to load playlist", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
    localStorage.setItem("SELECTED_PLAYLIST", JSON.stringify(selectedPlaylist));
  }, [selectedPlaylist, activeFilters.category]);

  const filtered = useMemo(() => {
    let list = channels;

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
    if (!window.electronAPI) return;

    const url = current?.location || "";

    if (!url) return;
    const isMpv = playerMode === "mpv";

    if (!isMpv) {
      window.electronAPI.setWindowSize(isPip ? 420 : 1200, 800);
      window.electronAPI.stopMpv();
      window.electronAPI.exitPiPMode();
      if (isPip) {
        window.electronAPI.openPiP(url);
      } else {
        window.electronAPI.closePiP();
      }
      setShowPlayer(isPip ? false : true);
    } else {
      window.electronAPI.setWindowSize(420, 800);
      window.electronAPI.closePiP();

      if (isPip) {
        window.electronAPI.enterPiPMode(url);
      } else {
        window.electronAPI.exitPiPMode();
        if (url) {
          window.electronAPI.playMpv(url);
        }
      }
      setShowPlayer(false);
    }
  }, [playerMode, current, isPip]);

  useEffect(() => {
    return () => {
      window?.electronAPI?.stopMpv();
    };
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 8,
  });

  function toggleFav(ch: Channel) {
    const id = ch.location || ch.name || "";

    setFavorites((prev) => {
      let updated = [...prev];

      if (updated.includes(id)) {
        updated = updated.filter((x) => x !== id);
      } else {
        updated.push(id);
      }

      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  const validatePlaylist = async (url: string) => {
    if (window.electronAPI) {
      return await window.electronAPI.validateM3U(url);
    }

    try {
      await axios.get(url, {
        responseType: "text",
        timeout: 8000,
      });
      return true;
    } catch {
      return false;
    }
  };

  const addPlaylist = async () => {
    const newItem = {
      name: playlistName,
      playlist: playlistUrl,
    };

    try {
      setLoadingButton(true);

      const isValid = await validatePlaylist(playlistUrl);

      if (!isValid) {
        showToast("Playlist is not responding", "error");
        setLoading(false);
        setPlaylistName("");
        setPlaylistUrl("");
      } else {
        if (editIndex !== null) {
          const updated = [...addedPlaylists];
          updated[editIndex] = newItem;
          setAddedPlaylists(updated);
          setEditIndex(null);
          showToast("Playlist updated", "success");
        } else {
          setAddedPlaylists((prev) => [...prev, newItem]);
          showToast("Playlist added", "success");
        }

        setPlaylistName("");
        setPlaylistUrl("");
        setShowAdd(false);
      }
    } catch (e) {
      console.log(e);
      showToast(`Playlist validation failed ${e}`, "error");
    } finally {
      setLoadingButton(false);
    }
  };

  useEffect(() => {
    localStorage.setItem(ADDED_KEY, JSON.stringify(addedPlaylists));
  }, [addedPlaylists]);

  const deletePlaylist = (target: Playlist) => {
    try {
      const updated = addedPlaylists.filter(
        (p) => p.playlist !== target.playlist,
      );
      setAddedPlaylists(updated);
      showToast("Playlist removed", "success");
    } catch (e) {
      showToast("Failed to remove playlist", "error");
      console.log(e);
    }
  };
  const PREDEFINED: Playlist[] = [
    { name: "IPTV Org", playlist: "https://iptv-org.github.io/iptv/index.m3u" },
    {
      name: "Samsung TV Plus",
      playlist: "https://apsattv.com/ssungusa.m3u",
    },
    {
      name: "TheTVApp",
      playlist: "https://tvpass.org/playlist/m3u",
    },
    {
      name: "XUMO",
      playlist: "https://www.apsattv.com/xumo.m3u",
    },
    {
      name: "Local Now",
      playlist: "https://www.apsattv.com/localnow.m3u",
    },
    {
      name: "LG Channels",
      playlist: "https://www.apsattv.com/lg.m3u",
    },
    {
      name: "DistroTV",
      playlist: "https://www.apsattv.com/distro.m3u",
    },
    {
      name: "Xiaomi",
      playlist: "https://www.apsattv.com/xiaomi.m3u",
    },
  ];

  const selectChannel = useCallback((ch: Channel | null) => {
    setCurrent(ch);
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", background: theme.bg }}>
      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          zIndex: 99999,
        }}
      >
        {toasts.map((t) => (
          <>
            <style>
              {`
    @keyframes slideIn {
      from {
        transform: translateX(20px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `}
            </style>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                background:
                  t.type === "error"
                    ? "#FF3B6B"
                    : t.type === "success"
                      ? "#00F5D4"
                      : "#1F2A44",
                boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
                animation: "slideIn 0.2s ease",
              }}
            >
              {t.message}
            </div>
          </>
        ))}
      </div>

      {showPlayer && (
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

      <div
        style={{
          flex: 1.2,
          background: theme.card,
          display: "flex",
          flexDirection: "column",
          padding: 10,
        }}
      >
        <button
          onClick={() => setPlayerMode(playerMode === "web" ? "mpv" : "web")}
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

          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.5,
              color: playerMode === "web" ? theme.accent : theme.span,
            }}
          >
            {playerMode === "web" ? "WEB PLAYER" : "MPV MODE"}
          </span>

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
              color: !showFavOnly ? "#ffff" : "#FF6B6B",
              glow: "#FF6B6B",
            },
            {
              icon: (
                <>
                  {!isPip ? <BsPip size={20} /> : <VscScreenFull size={18} />}
                </>
              ),
              onClick: () => setPip(!isPip),
              glow: "#7CFF6B",
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
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 999,
              background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)`,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.15)",
              transition: "all 0.2s ease",
              cursor: "default",
              width: "fit-content",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.03)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <span
              style={{
                color: theme.card,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 0.3,
                textTransform: "capitalize",
              }}
            >
              {activeFilters.category}
            </span>

            <button
              onClick={() => setActiveFilters({ category: "All" })}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: "none",
                background: "rgba(255,255,255,0.15)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.25)";
                e.currentTarget.style.transform = "rotate(90deg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                e.currentTarget.style.transform = "rotate(0deg)";
              }}
            >
              <IoClose size={14} color={theme.card} />
            </button>
          </div>
        )}
        <div
          ref={parentRef}
          style={{
            flex: 1,
            overflow: "auto",
            position: "relative",
            overflowX: "hidden",
          }}
        >
          {loading ? (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 14,
                zIndex: 99999999,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  border: `4px solid ${theme.border}`,
                  borderTop: `4px solid ${theme.accent}`,
                  animation: "spin 1s linear infinite",
                }}
              />

              <span
                style={{
                  color: theme.muted,
                  fontSize: 13,
                  letterSpacing: 0.5,
                }}
              >
                Loading channels...
              </span>

              <style>
                {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
              </style>
            </div>
          ) : (
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
                    ref={rowVirtualizer.measureElement}
                    key={row.key}
                    style={{
                      position: "absolute",
                      width: "100%",
                      transform: `translateY(${row.start}px)`,
                      willChange: "transform",
                    }}
                    data-index={row.index}
                  >
                    <ChannelCard
                      channel={item}
                      isFavorite={favorites.includes(
                        item.location || item.name || "",
                      )}
                      toggleFavorite={toggleFav}
                      onSelect={(channel) => {
                        selectChannel(channel);
                      }}
                      isPlaying={current?.location === item.location}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              backgroundColor: theme.card,
              padding: 20,
              borderRadius: 18,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {loadingButton && (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: 14,
                  zIndex: 99999999,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    border: `4px solid ${theme.border}`,
                    borderTop: `4px solid ${theme.accent}`,
                    animation: "spin 1s linear infinite",
                  }}
                />
                <style>
                  {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
                </style>
              </div>
            )}
            <input
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              placeholder="Playlist Name"
              style={{
                width: "100%",
                backgroundColor: theme.card2,
                padding: 12,
                color: "#fff",
                border: "1px solid #2a3550",
                borderRadius: 10,
                outline: "none",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.accent;
                e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.accent}30`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#2a3550";
                e.currentTarget.style.boxShadow = "none";
              }}
            />

            <input
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder="Playlist URL"
              style={{
                width: "100%",
                backgroundColor: theme.card2,
                padding: 12,
                color: "#fff",
                border: "1px solid #2a3550",
                borderRadius: 10,
                outline: "none",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.accent;
                e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.accent}30`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#2a3550";
                e.currentTarget.style.boxShadow = "none";
              }}
            />

            <button
              onClick={addPlaylist}
              disabled={!playlistName || !playlistUrl}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                fontWeight: 700,
                cursor:
                  !playlistName || !playlistUrl ? "not-allowed" : "pointer",
                color: "#fff",
                background:
                  !playlistName || !playlistUrl
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0, 198, 255, 0.12)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                boxShadow:
                  !playlistName || !playlistUrl
                    ? "none"
                    : "0 10px 25px rgba(0,0,0,0.35)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (playlistName && playlistUrl) {
                  e.currentTarget.style.transform = "scale(1.03)";
                  e.currentTarget.style.background = "rgba(0, 198, 255, 0.18)";
                  e.currentTarget.style.border =
                    "1px solid rgba(0, 198, 255, 0.35)";
                  e.currentTarget.style.boxShadow =
                    "0 12px 30px rgba(0,0,0,0.4)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.background =
                  !playlistName || !playlistUrl
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0, 198, 255, 0.12)";
                e.currentTarget.style.border =
                  "1px solid rgba(255,255,255,0.08)";
                e.currentTarget.style.boxShadow =
                  !playlistName || !playlistUrl
                    ? "none"
                    : "0 10px 25px rgba(0,0,0,0.35)";
              }}
            >
              <span style={{ fontWeight: 700 }}>
                {editIndex !== null ? "EDIT PLAYLIST" : "ADD PLAYLIST"}
              </span>
            </button>

            <button
              onClick={() => {
                setShowAdd(false);
                setEditIndex(null);
                setPlaylistName("");
                setPlaylistUrl("");
              }}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                background: "linear-gradient(135deg, #ff4d4d, #b30000)",
                border: "none",
                fontWeight: 700,
                color: "#fff",
                cursor: "pointer",
              }}
            >
              CLOSE
            </button>
          </div>
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
            zIndex: 999,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              maxHeight: "80vh",
              backgroundColor: theme.card,
              borderRadius: 18,
              padding: 12,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* SCROLLABLE AREA START */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                minHeight: 0,
                padding: 10,
              }}
            >
              {[...PREDEFINED, ...addedPlaylists].map((p) => {
                const isSelected = selectedPlaylist?.playlist === p.playlist;

                return (
                  <div
                    key={p.playlist}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      borderRadius: 12,
                      marginBottom: 6,
                      cursor: "pointer",

                      background: isSelected
                        ? `linear-gradient(135deg, ${theme.accent}20, rgba(255,255,255,0.03))`
                        : "transparent",

                      border: isSelected
                        ? `1px solid ${theme.accent}55`
                        : `1px solid ${theme.border}`,

                      boxShadow: isSelected
                        ? "0 10px 25px rgba(0,0,0,0.35)"
                        : "none",

                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background =
                          "rgba(255,255,255,0.03)";
                      }
                      e.currentTarget.style.transform = "scale(1.01)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = "transparent";
                      }
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
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
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <span
                        style={{
                          color: isSelected ? "#fff" : "#cbd5e1",
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {p.name}
                      </span>

                      {isSelected && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.85)",
                          }}
                        >
                          Currently Active
                        </span>
                      )}
                    </button>

                    {addedPlaylists.some((x) => x.playlist === p.playlist) && (
                      <>
                        <button
                          onClick={() => {
                            const index = addedPlaylists.findIndex(
                              (x) => x.playlist === p.playlist,
                            );

                            setEditIndex(index);
                            setPlaylistName(p.name);
                            setPlaylistUrl(p.playlist);
                            setShowAdd(true);
                          }}
                          style={{
                            marginRight: 6,
                            padding: 6,
                            borderRadius: 8,
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          <IoPencil size={20} />
                        </button>
                        <button
                          onClick={() => deletePlaylist(p)}
                          style={{
                            marginLeft: 10,
                            padding: 6,
                            borderRadius: 8,
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          <IoTrash
                            size={18}
                            color={isSelected ? "#fff" : theme.danger}
                          />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {/* SCROLLABLE AREA END */}

            <button
              onClick={() => setShowPlaylist(false)}
              style={{
                width: "100%",
                marginTop: 12,
                padding: 12,
                borderRadius: 12,
                background: "linear-gradient(135deg, #ff4d4d, #b30000)",
                border: "none",
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
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
              maxWidth: 420,
              maxHeight: "80vh",
              backgroundColor: theme.card,
              borderRadius: 18,
              padding: 14,
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Scrollable category list */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                minHeight: 0,
                padding: 10,
              }}
            >
              {categories.map((c) => {
                const isSelected = activeFilters.category === c;

                return (
                  <button
                    key={c}
                    onClick={() => {
                      setActiveFilters({ category: c });
                      setShowCategory(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      marginBottom: 6,
                      textAlign: "left",
                      border: "1px solid transparent",
                      cursor: "pointer",
                      background: isSelected
                        ? `linear-gradient(135deg, ${theme.accent}20, rgba(0,0,0,0.2))`
                        : "transparent",
                      borderColor: isSelected
                        ? `${theme.accent}55`
                        : theme.border,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        color: isSelected ? "#fff" : "#cbd5e1",
                        fontWeight: 700,
                        textTransform: "capitalize",
                      }}
                    >
                      {c}
                    </span>

                    {isSelected && (
                      <span style={{ color: "#fff", fontWeight: 700 }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Always visible */}
            <button
              onClick={() => setShowCategory(false)}
              style={{
                width: "100%",
                marginTop: 10,
                padding: 12,
                borderRadius: 12,
                background: "linear-gradient(135deg, #ff4d4d, #b30000)",
                border: "none",
                color: "#fff",
                fontWeight: 700,
                flexShrink: 0,
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
