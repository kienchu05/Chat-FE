import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import axiosClient from "../Api/services/axiosClient";
import { initializeKeyPair } from "../crypto/keyManager";
import { useWebSocket } from "../hooks/WebsocketHooks";

interface ParticipantResponse {
  userId: string;
  username: string;
}

interface ConversationDetailResponse {
  id: string;
  name: string;
  conversationType: string;
  conversationAvatar: string | null;
  participantInfo: ParticipantResponse[];

  lastMessageId: string | null;
  lastMessageContent: string | null;
  lastMessageTime: string | null;

  lastMessageSenderId?: string | null;
  lastMessageSenderName?: string | null;

  createdAt: string;
  isRead: boolean;

  isOnline?: boolean;
  lastOnlineAt?: string | null;
}

interface UserSearchResponse {
  userId: string;
  email: string;
  username: string;
}

export default function HomeScreen() {
  const [chatList, setChatList] = useState<ConversationDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<UserSearchResponse[]>([]);

  useEffect(() => {
    initializeKeyPair()
      .then((keyPair) => {
        console.log("PUBLIC KEY:", keyPair.publicKey);
        console.log("PRIVATE KEY:", keyPair.privateKey);
      })
      .catch((error) => {
        console.error("E2EE KEY ERROR:", error);
      });
  }, []);

  const fetchMyProfile = useCallback(async () => {
    try {
      const response = await axiosClient.get("/api/v1/users");
      const apiResponse = response.data;
      if (apiResponse?.code === 200) {
        const myInfo = apiResponse.data;
        setCurrentUserId(myInfo.userId);
        await AsyncStorage.setItem("myUserId", myInfo.userId);
      }
    } catch (error) {
      console.error("Lỗi lấy thông tin cá nhân:", error);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await axiosClient.get("/api/v1/my-conversations", {
        params: {
          page: 1,
          size: 20,
        },
      });

      const apiResponse = response.data;
      console.log("MY CONVERSATIONS RESPONSE:", apiResponse);
      if (apiResponse?.code === 200) {
        const conversations = apiResponse.data?.content || [];

        console.log("CONVERSATIONS:", conversations);
        setChatList(conversations);
      } else {
        Alert.alert(
          "Lỗi",
          apiResponse?.message || "Không thể tải danh sách cuộc trò chuyện",
        );
      }
    } catch (error: any) {
      console.error("Lỗi fetch conversations:", error);
      console.error("Response:", error?.response?.data);
      console.error("Status:", error?.response?.status);
      Alert.alert("Lỗi kết nối", "Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);

    fetchConversations();
  }, [fetchConversations]);

  const handleSearchUsers = async () => {
    const keyword = searchQuery.trim();

    if (!keyword) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchLoading(true);

    try {
      const response = await axiosClient.get("/api/v1/users/search", {
        params: {
          keyword,
          page: 1,
          size: 20,
        },
      });

      const apiResponse = response.data;

      console.log("SEARCH RESPONSE:", apiResponse);

      if (apiResponse?.code === 200) {
        setSearchResults(apiResponse.data?.content || []);
      } else {
        Alert.alert(
          "Lỗi",
          apiResponse?.message || "Không thể tìm kiếm người dùng",
        );
      }
    } catch (error: any) {
      console.error("Lỗi tìm kiếm:", error);
      console.error("Response:", error?.response?.data);

      Alert.alert("Lỗi", "Có lỗi xảy ra khi tìm kiếm người dùng.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleStartChat = async (targetUser: UserSearchResponse) => {
    try {
      const response = await axiosClient.post("/api/v1/conversations", {
        participantIds: [targetUser.userId],
        conversationType: "PRIVATE",
      });

      const apiResponse = response.data;
      console.log("CREATE CONVERSATION RESPONSE:", apiResponse);

      if (apiResponse?.code === 200) {
        const conversation = apiResponse.data;

        console.log("Đã tạo cuộc trò chuyện:", conversation);
        console.log("PARTICIPANTS:", conversation?.participantInfo);

        setSearchQuery("");
        setIsSearching(false);
        setSearchResults([]);

        router.push(
          `/chat?id=${conversation.id}&name=${encodeURIComponent(
            conversation.name,
          )}`,
        );
      } else {
        Alert.alert(
          "Lỗi",
          apiResponse?.message || "Không thể tạo cuộc trò chuyện",
        );
      }
    } catch (error: any) {
      console.error("Lỗi khi tạo phòng chat:", error);
      console.error("Response:", error?.response?.data);
      console.error("Status:", error?.response?.status);

      Alert.alert(
        "Lỗi kết nối",
        error?.response?.data?.message ||
          "Có lỗi xảy ra khi kết nối với máy chủ.",
      );
    }
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) {
      return "";
    }

    const date = new Date(timeString);

    if (isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyProfile();

      fetchConversations();
    }, [fetchMyProfile, fetchConversations]),
  );

  const handlePresence = useCallback(
    (presence: any) => {
      if (!presence?.userId) {
        return;
      }

      setChatList((prevConversations) =>
        prevConversations.map((conversation) => {
          if (conversation.conversationType === "PRIVATE") {
            const isTargetUser = conversation.participantInfo?.some(
              (participant) =>
                participant.userId === presence.userId &&
                participant.userId !== currentUserId,
            );

            if (!isTargetUser) {
              return conversation;
            }

            return {
              ...conversation,
              isOnline: presence.isOnline,
              lastOnlineAt: presence.isOnline ? null : presence.lastOnlineAt,
            };
          }

          const hasParticipant = conversation.participantInfo?.some(
            (participant) =>
              participant.userId === presence.userId &&
              participant.userId !== currentUserId,
          );

          if (!hasParticipant) {
            return conversation;
          }

          // Có thành viên online
          if (presence.isOnline) {
            return {
              ...conversation,
              isOnline: true,
            };
          }

          return conversation;
        }),
      );
    },
    [currentUserId],
  );

  const handleNewMessage = useCallback(
    (newMessage: any) => {
      if (!newMessage?.conversationId) {
        return;
      }

      setChatList((prevList) => {
        const existingIndex = prevList.findIndex(
          (conversation) => conversation.id === newMessage.conversationId,
        );

        if (existingIndex !== -1) {
          const updatedList = [...prevList];

          const conversation = {
            ...updatedList.splice(existingIndex, 1)[0],
          };

          conversation.lastMessageContent = newMessage.content;
          conversation.lastMessageTime = newMessage.createdAt;
          conversation.lastMessageId =
            newMessage.id || conversation.lastMessageId;

          conversation.lastMessageSenderId = newMessage.senderId;
          conversation.lastMessageSenderName = newMessage.senderName;

          conversation.isRead = false;

          updatedList.unshift(conversation); // Thêm phần tử vào đầu danh sách
          console.log("UPDATED CONVERSATION:", conversation);

          return updatedList;
        }

        setTimeout(() => {
          fetchConversations();
        }, 0);

        return prevList;
      });
    },
    [fetchConversations],
  );

  const { connected } = useWebSocket(handleNewMessage, handlePresence);

  const handleLogout = () => {
    Alert.alert(
      "Xác nhận đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng?",
      [
        {
          text: "Hủy",
          style: "cancel",
        },

        {
          text: "Đăng xuất",
          style: "destructive",

          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(["accessToken", "myUserId"]);

              setChatList([]);
              setCurrentUserId(null);
              setSearchQuery("");
              setSearchResults([]);
              setIsSearching(false);

              router.replace("/");
            } catch (error) {
              console.error("❌ Lỗi khi đăng xuất:", error);

              // Dù disconnect lỗi
              // vẫn xóa token
              await AsyncStorage.multiRemove(["accessToken", "myUserId"]);
              router.replace("/");
            }
          },
        },
      ],
    );
  };

  const handleOpenConversation = async (
    conversation: ConversationDetailResponse,
  ) => {
    setChatList((prevList) =>
      prevList.map((item) =>
        item.id === conversation.id
          ? {
              ...item,
              isRead: true,
            }
          : item,
      ),
    );

    if (!conversation.isRead) {
      try {
        await axiosClient.put(`/api/v1/conversations/${conversation.id}/read`);
      } catch (error) {
        console.error("Lỗi đánh dấu đã đọc:", error);
      }
    }

    router.push(
      `/chat?id=${conversation.id}&name=${encodeURIComponent(
        conversation.name,
      )}`,
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* HEADER */}

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Đoạn chat</Text>

          <View style={styles.headerActions}>
            {/* LOGOUT */}
            <TouchableOpacity style={styles.actionIcon} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#ff3b30" />
            </TouchableOpacity>

            {/* CAMERA */}
            <TouchableOpacity style={styles.actionIcon}>
              <Ionicons name="camera" size={24} color="#050505" />
            </TouchableOpacity>

            {/* NEW GROUP */}
            <TouchableOpacity
              style={styles.actionIcon}
              onPress={() => router.push("/create-group")}
            >
              <Ionicons name="people" size={24} color="#050505" />
            </TouchableOpacity>
          </View>
        </View>

        {/*SEARCH*/}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#8e8e93"
            style={styles.searchIcon}
          />

          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm bạn bè..."
            placeholderTextColor="#8e8e93"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);

              if (!text.trim()) {
                setIsSearching(false);

                setSearchResults([]);
              }
            }}
            onSubmitEditing={handleSearchUsers}
            returnKeyType="search"
          />

          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setIsSearching(false);
                setSearchResults([]);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#8e8e93" />
            </TouchableOpacity>
          )}
        </View>

        {/*SEARCH RESULT*/}
        {isSearching ? (
          searchLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0084ff" />

              <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.userId}
              contentContainerStyle={styles.listContainer}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  Không tìm thấy người dùng nào khớp với "{searchQuery}"
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.chatItem}
                  onPress={() => handleStartChat(item)}
                >
                  <View style={styles.avatarSearch}>
                    <Image
                      source={require("../assets/icon.png.webp")}
                      style={styles.avatarSearchImage}
                    />
                  </View>

                  <View style={styles.chatInfo}>
                    <Text style={styles.chatName}>{item.username}</Text>

                    <Text style={styles.lastMessage}>{item.email}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0084ff" />
          </View>
        ) : (
          <FlatList
            data={chatList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            refreshing={refreshing}
            onRefresh={onRefresh}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                Bạn chưa có cuộc trò chuyện nào.
              </Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.chatItem}
                onPress={() => handleOpenConversation(item)}
              >
                {/*AVATAR*/}

                <View style={styles.avatarContainer}>
                  <Image
                    source={
                      item.conversationAvatar
                        ? {
                            uri: item.conversationAvatar,
                          }
                        : require("../assets/icon.png.webp")
                    }
                    style={styles.avatar}
                  />

                  {item.isOnline && <View style={styles.onlineBadge} />}
                </View>

                {/* CHAT INFO */}

                <View style={styles.chatInfo}>
                  {/* NAME */}

                  <Text
                    style={[
                      styles.chatName,
                      !item.isRead && {
                        fontWeight: "bold",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>

                  {/* PRESENCE*/}

                  {item.conversationType === "PRIVATE" && (
                    <View style={styles.presenceContainer}>
                      <View
                        style={[
                          styles.presenceDot,
                          {
                            backgroundColor: item.isOnline
                              ? "#31a24c"
                              : "#80848e",
                          },
                        ]}
                      />

                      <Text
                        style={[
                          styles.presenceText,
                          {
                            color: item.isOnline ? "#31a24c" : "#65676b",
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.isOnline
                          ? "Đang hoạt động"
                          : item.lastOnlineAt || "Không hoạt động"}
                      </Text>
                    </View>
                  )}

                  {/* LAST MESSAGE */}

                  <Text
                    style={[
                      styles.lastMessage,

                      !item.isRead && {
                        fontWeight: "bold",
                        color: "#000",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.lastMessageContent &&
                    item.lastMessageContent.trim().length > 0
                      ? `${
                          item.lastMessageSenderId === currentUserId
                            ? "Bạn"
                            : item.lastMessageSenderName || ""
                        }: ${item.lastMessageContent}`
                      : "Chưa có tin nhắn"}
                  </Text>
                </View>

                {/* TIME*/}

                <View style={styles.chatMeta}>
                  <Text style={styles.timeText}>
                    {formatTime(item.lastMessageTime)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },

  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 10,
    color: "#888",
  },

  emptyText: {
    textAlign: "center",
    marginTop: 20,
    color: "#888",
    fontSize: 16,
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 5,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#050505",
  },

  headerActions: {
    flexDirection: "row",
  },

  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f2f5",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f2f5",
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 40,
  },

  searchIcon: {
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#050505",
  },

  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },

  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#aeb4b7",
  },

  avatarSearch: {
    width: 40,
    height: 40,
    borderRadius: 28,
    overflow: "hidden",
    marginRight: 12,
  },

  avatarSearchImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },

  onlineBadge: {
    position: "absolute",
    bottom: 0,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#31a24c",
    borderWidth: 2,
    borderColor: "#fff",
    zIndex: 1,
  },

  chatInfo: {
    flex: 1,
    justifyContent: "center",
  },

  chatName: {
    fontSize: 17,
    fontWeight: "500",
    color: "#050505",
    marginBottom: 3,
  },

  presenceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    maxWidth: "90%",
  },

  presenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },

  presenceText: {
    fontSize: 12,
    fontWeight: "500",
    flexShrink: 1,
  },

  lastMessage: {
    fontSize: 14,
    color: "#65676b",
  },

  chatMeta: {
    alignItems: "flex-end",
    marginLeft: 8,
  },

  timeText: {
    fontSize: 12,
    color: "#65676b",
    marginBottom: 6,
  },
});
