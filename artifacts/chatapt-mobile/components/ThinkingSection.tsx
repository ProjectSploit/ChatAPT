import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface ThinkingSectionProps {
  thinking: string;
  isStreaming?: boolean;
}

export function ThinkingSection({ thinking, isStreaming = false }: ThinkingSectionProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(isStreaming);

  if (!thinking) return null;

  return (
    <View style={[styles.container, { borderColor: colors.thinkingBorder, backgroundColor: colors.thinkingBg }]}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.header}
        hitSlop={8}
      >
        <Feather
          name="cpu"
          size={13}
          color={colors.thinkingText}
          style={styles.icon}
        />
        <Text style={[styles.headerText, { color: colors.thinkingText }]}>
          {isStreaming ? "Thinking…" : "Reasoning"}
        </Text>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={13}
          color={colors.thinkingText}
        />
      </Pressable>
      {expanded && (
        <ScrollView
          style={styles.body}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.text, { color: colors.thinkingText }]}>
            {thinking}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 8,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  icon: {
    opacity: 0.8,
  },
  headerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
  },
  body: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    maxHeight: 200,
  },
  text: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    opacity: 0.9,
  },
});
