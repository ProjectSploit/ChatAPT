import React from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { ThinkingSection } from "./ThinkingSection";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  isStreaming?: boolean;
  isError?: boolean;
}

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const colors = useColors();
  const isUser = message.role === "user";

  const handleLongPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Message", message.content.slice(0, 200) + (message.content.length > 200 ? "…" : ""), [
      { text: "OK" },
    ]);
  };

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <Pressable
          onLongPress={handleLongPress}
          style={({ pressed }) => [
            styles.userBubble,
            {
              backgroundColor: message.isError
                ? colors.destructive
                : colors.userBubble,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.userText, { color: colors.userBubbleText }]}>
            {message.content}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.assistantRow}>
      <View style={styles.assistantInner}>
        {message.thinking ? (
          <ThinkingSection
            thinking={message.thinking}
            isStreaming={message.isStreaming}
          />
        ) : null}
        {message.content ? (
          <Pressable onLongPress={handleLongPress}>
            <Text
              style={[
                styles.assistantText,
                {
                  color: message.isError
                    ? colors.destructive
                    : colors.assistantBubbleText,
                },
              ]}
            >
              {message.content}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  userBubble: {
    maxWidth: "78%",
    borderRadius: 20,
    borderBottomRightRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  assistantRow: {
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  assistantInner: {
    maxWidth: "92%",
  },
  assistantText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
  },
  copiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 4,
    gap: 4,
  },
  copiedText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
