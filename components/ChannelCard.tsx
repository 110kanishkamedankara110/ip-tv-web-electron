import { Channel } from "@/types/DataTypes";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { memo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

const ChannelCard: React.FC<{
  channel: Channel;
  isFavorite: boolean;
  toggleFavorite: (channel: Channel) => void;
  onSelect: (channel: Channel) => void;
  hasTVPreferredFocus?: boolean;
  isPlaying?: boolean;
}> = memo(
  ({
    channel,
    isFavorite,
    toggleFavorite,
    onSelect,
    hasTVPreferredFocus,
    isPlaying,
  }) => {
    const [isFocused, setIsFocused] = useState(false);

    const bg = isPlaying ? "#0B2A2A" : isFocused ? "#0F1F3A" : "#0B1020";

    const glow = isPlaying ? "#00F5D4" : isFocused ? "#7CFF6B" : "transparent";

    return (
      <View
        style={{
          marginVertical: 6,
          borderRadius: 18,
          overflow: "hidden",
          marginHorizontal: 12,
        }}
      >
        {/* GLASS BACKGROUND BORDER EFFECT */}
        <View
          style={{
            borderRadius: 18,
            borderWidth: 1,
            borderColor: isPlaying ? "#00F5D4" : "#1F2A44",
            backgroundColor: bg,
            shadowColor: glow,
            shadowOpacity: isPlaying ? 0.6 : 0,
            shadowRadius: 12,
            elevation: isPlaying ? 6 : 0,
          }}
        >
          <TouchableOpacity
            onPress={() => onSelect(channel)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            hasTVPreferredFocus={hasTVPreferredFocus}
            activeOpacity={0.85}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
            }}
          >
            {/* LOGO */}
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 14,
                backgroundColor: "#111C33",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "#1F2A44",
              }}
            >
              {channel.attributes?.["tvg-logo"] ? (
                <Image
                  source={{ uri: channel.attributes["tvg-logo"] }}
                  style={{ width: 50, height: 50 }}
                  contentFit="contain"
                />
              ) : (
                <Text
                  style={{
                    color: "#00F5D4",
                    fontSize: 18,
                    fontWeight: "bold",
                  }}
                >
                  {channel.name?.slice(0, 2).toUpperCase() || "TV"}
                </Text>
              )}
            </View>

            {/* INFO */}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                numberOfLines={1}
                style={{
                  color: "#EAF2FF",
                  fontSize: 15,
                  fontWeight: "700",
                }}
              >
                {channel.name}
              </Text>

              <Text
                numberOfLines={1}
                style={{
                  color: "#6F7AA6",
                  fontSize: 12,
                  marginTop: 3,
                }}
              >
                {channel.attributes?.["group-title"] || "Unknown Category"}
              </Text>

              {/* LIVE / PLAYING BADGE */}
              {isPlaying && (
                <View
                  style={{
                    marginTop: 6,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "#00F5D4",
                      marginRight: 6,
                    }}
                  />
                  <Text
                    style={{
                      color: "#00F5D4",
                      fontSize: 11,
                      fontWeight: "600",
                    }}
                  >
                    NOW PLAYING
                  </Text>
                </View>
              )}
            </View>

            {/* FAVORITE BUTTON */}
            <TouchableOpacity
              onPress={() => toggleFavorite(channel)}
              style={{
                padding: 8,
                borderRadius: 12,
                backgroundColor: "#111C33",
                borderWidth: 1,
                borderColor: "#1F2A44",
              }}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={18}
                color={isFavorite ? "#FF3B6B" : "#6F7AA6"}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

ChannelCard.displayName = "ChannelCard";

export default ChannelCard;
