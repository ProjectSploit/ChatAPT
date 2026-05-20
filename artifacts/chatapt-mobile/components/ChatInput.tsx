import React, { useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  onStop?: () => void;
  isStreaming?: boolean;
}

export function ChatInput({
  onSend,
  disabled = false,
  onStop,
  isStreaming = false,
}: ChatInputProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const canSend = text.trim().length > 0 && !disabled;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    inputRef.current?.focus();
  };

  const bottomPad =
    Platform.OS === "web" ? 34 : insets.bottom > 0 ? insets.bottom : 8;

  return (
    <View
      style={[
        styles.wrapper,
        {
          borderTopColor: colors.border,
          backgroundColor: colors.headerBg,
          paddingBottom: bottomPad,
        },
      ]}
    >
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.border,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              color: colors.foreground,
              fontFamily: "Inter_400Regular",
            },
          ]}
          value={text}
          onChangeText={setText}
          placeholder="Message ChatAPT…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          testID="chat-input"
          maxLength={4000}
        />
        <Pressable
          onPress={isStreaming ? onStop : handleSend}
          disabled={!isStreaming && !canSend}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor:
                isStreaming
                  ? colors.destructive
                  : canSend
                  ? colors.primary
                  : colors.muted,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          testID="send-button"
        >
          <Feather
            name={isStreaming ? "square" : "arrow-up"}
            size={16}
            color={
              isStreaming
                ? colors.destructiveForeground
                : canSend
                ? colors.primaryForeground
                : colors.mutedForeground
            }
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderWidth: 1,
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 120,
    paddingVertical: 4,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
});
