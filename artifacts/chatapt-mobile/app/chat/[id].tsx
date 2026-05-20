import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetConversation,
  getGetConversationQueryKey,
  getListConversationsQueryKey,
} from "@workspace/api-client-react";
import { ChatInput } from "@/components/ChatInput";
import { MessageBubble, type ChatMessage } from "@/components/MessageBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { sendMessageStream } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

let msgCounter = 0;
function genId(): string {
  msgCounter++;
  return `msg-${Date.now()}-${msgCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

type ModelMode = "standard" | "thinking";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [modelMode, setModelMode] = useState<ModelMode>("standard");
  const [initialized, setInitialized] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: conversation, isLoading } = useGetConversation(conversationId);

  // Load historical messages on first load only
  useEffect(() => {
    if (conversation?.messages && !initialized) {
      const mapped: ChatMessage[] = conversation.messages.map((m) => ({
        id: genId(),
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      setMessages(mapped);
      setInitialized(true);
    }
  }, [conversation?.messages, initialized]);

  const handleSend = useCallback(
    async (text: string) => {
      if (isStreaming) return;

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const userMsg: ChatMessage = { id: genId(), role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setShowTyping(true);

      const ac = new AbortController();
      abortControllerRef.current = ac;

      let assistantId: string | null = null;
      let fullContent = "";
      let fullThinking = "";

      try {
        await sendMessageStream({
          conversationId,
          content: text,
          thinkingMode: modelMode === "thinking",
          signal: ac.signal,
          onChunk: (chunk) => {
            if (chunk.type === "done" || chunk.type === "error") {
              if (chunk.type === "error") {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: genId(),
                    role: "assistant",
                    content: chunk.message,
                    isError: true,
                  },
                ]);
              }
              return;
            }

            if (chunk.type === "thinking") {
              fullThinking += chunk.text;
              if (!assistantId) {
                assistantId = genId();
                setShowTyping(false);
                setMessages((prev) => [
                  ...prev,
                  {
                    id: assistantId!,
                    role: "assistant",
                    content: "",
                    thinking: fullThinking,
                    isStreaming: true,
                  },
                ]);
              } else {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, thinking: fullThinking }
                      : m
                  )
                );
              }
              return;
            }

            if (chunk.type === "content") {
              fullContent += chunk.text;
              setShowTyping(false);
              if (!assistantId) {
                assistantId = genId();
                setMessages((prev) => [
                  ...prev,
                  {
                    id: assistantId!,
                    role: "assistant",
                    content: fullContent,
                    isStreaming: true,
                  },
                ]);
              } else {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: fullContent, isStreaming: true }
                      : m
                  )
                );
              }
            }
          },
        });
      } finally {
        abortControllerRef.current = null;
        setIsStreaming(false);
        setShowTyping(false);
        if (assistantId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, isStreaming: false } : m
            )
          );
        }
        // Invalidate to get updated title/timestamp
        queryClient.invalidateQueries({
          queryKey: getGetConversationQueryKey(conversationId),
        });
        queryClient.invalidateQueries({
          queryKey: getListConversationsQueryKey(),
        });
      }
    },
    [isStreaming, conversationId, modelMode, queryClient]
  );

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const toggleModel = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setModelMode((m) => (m === "standard" ? "thinking" : "standard"));
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const reversed = [...messages].reverse();

  if (isLoading && !initialized) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background, paddingTop: topPad },
        ]}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.headerBg,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.5 : 1 }]}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>

        <Text
          style={[styles.headerTitle, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {conversation?.title ?? "Chat"}
        </Text>

        <Pressable
          onPress={toggleModel}
          style={({ pressed }) => [
            styles.modelBadge,
            {
              backgroundColor:
                modelMode === "thinking"
                  ? colors.accent
                  : colors.muted,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          testID="model-toggle"
        >
          <Feather
            name={modelMode === "thinking" ? "cpu" : "zap"}
            size={12}
            color={
              modelMode === "thinking"
                ? colors.accentForeground
                : colors.mutedForeground
            }
          />
          <Text
            style={[
              styles.modelLabel,
              {
                color:
                  modelMode === "thinking"
                    ? colors.accentForeground
                    : colors.mutedForeground,
              },
            ]}
          >
            {modelMode === "thinking" ? "Think" : "Fast"}
          </Text>
        </Pressable>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 && !showTyping ? (
          <View style={styles.emptyChat}>
            <Feather name="message-circle" size={52} color={colors.mutedForeground} />
            <Text style={[styles.emptyChatTitle, { color: colors.foreground }]}>
              How can I help?
            </Text>
            <Text style={[styles.emptyChatSub, { color: colors.mutedForeground }]}>
              Ask anything — code, questions, ideas
            </Text>
          </View>
        ) : (
          <FlatList
            data={reversed}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            inverted={messages.length > 0}
            ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!!messages.length}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}

        <ChatInput
          onSend={handleSend}
          onStop={handleStop}
          disabled={false}
          isStreaming={isStreaming}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.3,
  },
  modelBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  modelLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  emptyChat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyChatTitle: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
    letterSpacing: -0.3,
  },
  emptyChatSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
