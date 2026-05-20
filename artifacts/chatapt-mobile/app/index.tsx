import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateConversation,
  useDeleteConversation,
  useListConversations,
  getListConversationsQueryKey,
} from "@workspace/api-client-react";
import { ConversationCard } from "@/components/ConversationCard";
import { useColors } from "@/hooks/useColors";

export default function ConversationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const {
    data: conversations,
    isLoading,
    refetch,
    isRefetching,
  } = useListConversations();

  const { mutate: createConversation, isPending: isCreating } =
    useCreateConversation({
      mutation: {
        onSuccess: (newConv) => {
          queryClient.invalidateQueries({
            queryKey: getListConversationsQueryKey(),
          });
          router.push(`/chat/${newConv.id}`);
        },
      },
    });

  const { mutate: deleteConversation } = useDeleteConversation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListConversationsQueryKey(),
        });
      },
    },
  });

  const handleNewChat = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    createConversation({ data: { title: "New Chat" } });
  }, [createConversation]);

  const handleDelete = useCallback(
    (id: number, title: string) => {
      Alert.alert("Delete Chat", `Delete "${title}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteConversation({ id }),
        },
      ]);
    },
    [deleteConversation]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (isLoading) {
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

  const sorted = [...(conversations ?? [])].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          ChatAPT
        </Text>
        <Pressable
          onPress={handleNewChat}
          disabled={isCreating}
          style={({ pressed }) => [
            styles.newBtn,
            {
              backgroundColor: colors.primary,
              opacity: pressed || isCreating ? 0.7 : 1,
            },
          ]}
          testID="new-chat-button"
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Feather name="edit" size={18} color="#FFF" />
          )}
        </Pressable>
      </View>

      {/* List */}
      <FlatList
        data={sorted}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ConversationCard
            id={item.id}
            title={item.title}
            updatedAt={item.updatedAt}
            onPress={() => router.push(`/chat/${item.id}`)}
            onDelete={() => handleDelete(item.id, item.title)}
          />
        )}
        scrollEnabled={!!sorted.length}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="message-circle" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No conversations yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Tap the edit icon to start chatting
            </Text>
          </View>
        }
        contentContainerStyle={
          sorted.length === 0 ? styles.emptyContainer : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  newBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
