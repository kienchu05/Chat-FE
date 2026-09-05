import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import axiosClient from "../Api/services/axiosClient";

interface ChatMessageResponse {
  id: string;
  tempId?: string;
  conversationId: string;
  conversationAvatar?: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: string;
  createdAt: string;
}

export default function SearchMessageScreen() {
  const { conversationId } = useLocalSearchParams<{
    conversationId: string;
  }>();

  const [keyword, setKeyword] = useState("");
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const handleSearch = async (
    text: string = keyword,
    pageNumber: number = 1,
  ) => {
    if (!conversationId || !text.trim()) {
      setMessages([]);
      return;
    }

    try {
      setLoading(true);

      const response = await axiosClient.get(
        `/api/v1/${conversationId}/search-messages`,
        {
          params: {
            keyword: text.trim(),
            page: pageNumber,
            size: 5,
          },
        },
      );

      const apiResponse = response.data;

      if (apiResponse?.code === 200) {
        const data = apiResponse.data;

        setMessages(data.content || []);
        setPage(data.currentPage);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error("Lỗi tìm kiếm tin nhắn:", error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };
  const handleClear = () => {
    setKeyword("");
    setMessages([]);
    setPage(1);
    setTotalPages(1);
  };

  const formatTime = (time: string) => {
    if (!time) return "";

    return new Date(time).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderMessage = ({ item }: { item: ChatMessageResponse }) => {
    return (
      <TouchableOpacity style={styles.messageItem}>
        <View style={styles.messageContent}>
          <Text style={styles.senderName}>Người gửi : {item.senderName}</Text>

          <Text style={styles.messageText}>Nội dung : {item.content}</Text>

          <Text style={styles.time}>
            Thời gian : {formatTime(item.createdAt)}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={26} color="#222" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Tìm kiếm tin nhắn</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={21} color="#888" />

        <TextInput
          style={styles.input}
          placeholder="Tìm kiếm tin nhắn..."
          placeholderTextColor="#999"
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={() => handleSearch()}
          returnKeyType="search"
        />

        {keyword.length > 0 && (
          <TouchableOpacity onPress={handleClear}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : keyword.trim() === "" ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={50} color="#bbb" />

          <Text style={styles.emptyText}>
            Nhập từ khóa để tìm kiếm tin nhắn
          </Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-outline" size={50} color="#bbb" />

          <Text style={styles.emptyText}>Không tìm thấy tin nhắn</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
        />
      )}

      {messages.length > 0 && totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            disabled={page <= 1}
            onPress={() => handleSearch(keyword, page - 1)}
          >
            <Ionicons
              name="chevron-back"
              size={25}
              color={page <= 1 ? "#ccc" : "#2196F3"}
            />
          </TouchableOpacity>

          <Text style={styles.pageText}>
            {page} / {totalPages}
          </Text>

          <TouchableOpacity
            disabled={page >= totalPages}
            onPress={() => handleSearch(keyword, page + 1)}
          >
            <Ionicons
              name="chevron-forward"
              size={25}
              color={page >= totalPages ? "#ccc" : "#2196F3"}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f4f6",
  },

  header: {
    height: 60,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5ea",
  },

  backButton: {
    padding: 16,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 12,
    paddingHorizontal: 14,
    height: 45,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e5e5ea",
  },

  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#222",
  },

  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },

  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: "#888",
  },

  list: {
    paddingHorizontal: 12,
    paddingBottom: 80,
  },

  messageItem: {
    backgroundColor: "#fff",
    marginBottom: 8,
    padding: 14,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  messageContent: {
    flex: 1,
  },

  senderName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
    marginBottom: 4,
  },

  messageText: {
    fontSize: 16,
    color: "#333",
  },

  time: {
    fontSize: 12,
    color: "#999",
    marginTop: 5,
  },

  pagination: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 55,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e5ea",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 25,
  },

  pageText: {
    fontSize: 14,
    color: "#555",
  },
});
