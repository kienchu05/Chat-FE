import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Client } from "@stomp/stompjs";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import "text-encoding";
import axiosClient from "../Api/services/axiosClient";

// --- ĐỊNH NGHĨA TYPE TỪ SPRING BOOT ---
interface MessageMediaResponse {
  fileName: string;
  fileType: string;
  thumbnailUrl: string;
  uploadedAt: string;
}

interface ChatMessageResponse {
  id: string;
  tempId?: string;
  conversationId: string;
  conversationAvatar?: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: string;
  messageMedia?: MessageMediaResponse[];
  createdAt: string;
}

export default function ChatScreen() {
  const { id: conversationId, name: conversationName } = useLocalSearchParams<{
    id: string;
    name: string;
  }>();

  // --- STATE ---
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [inputText, setInputText] = useState("");
  const [myUserId, setMyUserId] = useState<string | null>(null);

  // Trạng thái Loading
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // STATE MỚI: Trạng thái đang tải file
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // State cho WebSocket (STOMP)
  const [stompClient, setStompClient] = useState<Client | null>(null);

  // --- KHỞI TẠO DỮ LIỆU ---
  useEffect(() => {
    const getMyId = async () => {
      try {
        const id = await AsyncStorage.getItem("myUserId");
        setMyUserId(id);
      } catch (error) {
        console.error("Lỗi lấy myUserId:", error);
      }
    };
    getMyId();
  }, []);

  // --- THIẾT LẬP WEBSOCKET (STOMP) ---
  useEffect(() => {
    let client: Client | null = null;

    const connectWebSocket = async () => {
      try {
        const token = await AsyncStorage.getItem("accessToken");
        if (!token) return;

        client = new Client({
          brokerURL: "ws://10.0.2.2:8080/ws",
          connectHeaders: { Authorization: `Bearer ${token}` },
          forceBinaryWSFrames: true,
          appendMissingNULLonIncoming: true,
          debug: (str) => console.log("STOMP: " + str),
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
        });

        client.onConnect = (frame) => {
          client!.subscribe("/user/queue/messages", (messageOutput) => {
            if (messageOutput.body) {
              const newMessage: ChatMessageResponse = JSON.parse(
                messageOutput.body,
              );
              if (newMessage.conversationId === conversationId) {
                // Kiểm tra trùng lặp trước khi thêm vào mảng (tránh duplicate khi chính mình gửi)
                setMessages((prev) => {
                  if (prev.some((msg) => msg.id === newMessage.id)) return prev;
                  return [newMessage, ...prev];
                });
              }
            }
          });
        };

        client.onStompError = (frame) =>
          console.error("Lỗi STOMP Server: ", frame.headers["message"]);
        client.onWebSocketError = (error) =>
          console.error("Lỗi mạng WebSocket:", error);

        client.activate();
        setStompClient(client);
      } catch (error) {
        console.error("Lỗi khởi tạo STOMP:", error);
      }
    };

    if (conversationId) connectWebSocket();

    return () => {
      if (client && client.active) client.deactivate();
    };
  }, [conversationId]);

  // --- TẢI TIN NHẮN VÀ ĐÁNH DẤU ĐÃ ĐỌC ---
  useEffect(() => {
    if (conversationId) {
      fetchMessages(1);
      axiosClient
        .put(`/api/v1/conversations/${conversationId}/read`)
        .catch(() => {});
    }
  }, [conversationId]);

  // --- LOGIC GỌI API LỊCH SỬ ---
  const fetchMessages = async (pageNumber: number) => {
    try {
      if (pageNumber === 1) setLoading(true);
      else setLoadingMore(true);

      const response = await axiosClient.get(
        `/api/v1/${conversationId}/messages`,
        {
          params: { page: pageNumber, size: 20 },
        },
      );

      const apiResponse = response.data;
      if (apiResponse && apiResponse.code === 200) {
        const newMessages = apiResponse.data.content || [];
        setMessages((prev) =>
          pageNumber === 1 ? newMessages : [...prev, ...newMessages],
        );
        setHasMore(pageNumber < apiResponse.data.totalPages);
        setPage(pageNumber);
      }
    } catch (error) {
      console.error("Lỗi tải tin nhắn:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreMessages = () => {
    if (!loadingMore && hasMore) fetchMessages(page + 1);
  };

  // --- LOGIC GỬI TIN NHẮN TEXT ---
  const handleSend = async () => {
    if (!inputText.trim()) return;

    const messageContent = inputText.trim();
    setInputText("");

    try {
      const response = await axiosClient.post(`/api/v1/chat-messages`, {
        conversationId: conversationId,
        content: messageContent,
        messageType: "TEXT",
        messageMedia: [],
        tempId: Date.now().toString(),
      });

      const savedMessage = response.data.data || response.data;
      if (savedMessage?.id) {
        setMessages((prev) => [savedMessage, ...prev]);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", "Không thể gửi tin nhắn đi.");
    }
  };

  const handleOpenMedia = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Cấp quyền", "Cần cấp quyền truy cập ảnh để gửi file!");
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        quality: 0.8,
        allowsMultipleSelection: true, // BẬT TÍNH NĂNG CHỌN NHIỀU ẢNH
        selectionLimit: 5, // (Tùy chọn) Giới hạn tối đa 5 ảnh 1 lần gửi để tránh nặng máy
      });

      if (pickerResult.canceled) return;

      setIsUploading(true);

      // 1. Upload TẤT CẢ các ảnh được chọn lên Cloudinary cùng lúc (dùng Promise.all)
      const uploadPromises = pickerResult.assets.map(async (asset) => {
        const uriParts = asset.uri.split("/");
        const fileName = uriParts[uriParts.length - 1];
        const typeMatch = /\.(\w+)$/.exec(fileName);
        const fileExtension = typeMatch ? typeMatch[1].toLowerCase() : "jpg";
        const isVideo =
          asset.type === "video" || ["mp4", "mov"].includes(fileExtension);
        const mimeType = isVideo
          ? `video/${fileExtension}`
          : `image/${fileExtension}`;

        const formData = new FormData();
        formData.append("file", {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        } as any);

        const uploadRes = await axiosClient.post(
          "/api/v1/files/upload",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );

        const fileUrl = uploadRes.data?.url || uploadRes.data?.data?.url;
        if (!fileUrl)
          throw new Error(
            fileUrl.data?.message || "Không nhận được URL file từ server",
          );

        // Trả về object theo chuẩn MessageMediaRequest
        return {
          fileName: fileName,
          fileType: mimeType,
          thumbnailUrl: fileUrl,
        };
      });

      // Đợi tất cả ảnh upload xong, ta sẽ có 1 mảng các URL
      const uploadedMediaList = await Promise.all(uploadPromises);

      // Lấy nội dung chữ hiện tại làm tin nhắn kèm theo
      const messageContent = inputText.trim();
      setInputText(""); // Xóa trắng ô nhập chữ ngay sau khi gửi

      // 2. Gửi 1 tin nhắn mang theo toàn bộ danh sách ảnh + chữ
      const messagePayload = {
        tempId: Date.now().toString(),
        conversationId: conversationId,
        content: messageContent, // Kèm chữ vào đây
        messageType: uploadedMediaList[0].fileType.startsWith("video")
          ? "VIDEO"
          : "IMAGE",
        messageMedia: uploadedMediaList, // Gửi cả mảng nhiều ảnh lên Backend
      };

      const sendRes = await axiosClient.post(
        "/api/v1/chat-messages",
        messagePayload,
      );
      const savedMessage = sendRes.data.data || sendRes.data;

      if (savedMessage?.id) {
        setMessages((prev) => [savedMessage, ...prev]);
      }
    } catch (error) {
      console.error("Lỗi gửi media:", error);
      Alert.alert("Lỗi", "Không thể tải lên file đính kèm.");
    } finally {
      setIsUploading(false);
    }
  };

  // --- LOGIC XÓA TIN NHẮN ---
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await axiosClient.delete(`/api/v1/messages/${messageId}`);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (error) {
      Alert.alert("Lỗi", "Không thể xóa tin nhắn lúc này.");
    }
  };

  const confirmDelete = (messageId: string) => {
    Alert.alert("Xóa tin nhắn", "Bạn có chắc muốn xóa tin nhắn này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => handleDeleteMessage(messageId),
      },
    ]);
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "";
    return new Date(timeString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const openContactDetails = () => {
    router.push({
      pathname: "/contact-detail",
      params: {
        username: conversationName,
        conversationId: conversationId,
        avatar: messages[0]?.conversationAvatar || "",
      },
    });
  };

  // --- RENDER BONG BÓNG TIN NHẮN ---
  const renderMessage = ({ item }: { item: ChatMessageResponse }) => {
    const isMe = item.senderId === myUserId;
    const hasMedia =
      (item.messageType === "IMAGE" || item.messageType === "VIDEO") &&
      item.messageMedia &&
      item.messageMedia.length > 0;

    return (
      <View
        style={[
          styles.messageWrapper,
          isMe ? styles.messageWrapperMe : styles.messageWrapperThem,
        ]}
      >
        {!isMe && (
          <Image
            source={
              item.conversationAvatar
                ? { uri: item.conversationAvatar }
                : require("../assets/icon.png.webp")
            }
            style={styles.avatarSmall}
          />
        )}
        <View>
          <TouchableOpacity
            onLongPress={() => {
              if (isMe) confirmDelete(item.id);
            }}
            activeOpacity={0.8}
            delayLongPress={300}
          >
            <View
              style={[
                styles.bubble,
                isMe ? styles.bubbleMe : styles.bubbleThem,
                hasMedia && !item.content ? styles.bubbleMediaOnly : {}, // Đổi style nếu chỉ có ảnh
              ]}
            >
              {hasMedia && (
                <View style={styles.mediaContainer}>
                  {item.messageMedia!.map((media, index) => {
                    const isMultiple = item.messageMedia!.length > 1;
                    return (
                      <Image
                        key={index}
                        source={{ uri: media.thumbnailUrl }}
                        style={[
                          styles.mediaImage,
                          isMultiple ? styles.mediaImageMultiple : {}, // Thu nhỏ ảnh lại nếu có nhiều ảnh
                          item.content ? { marginBottom: 8 } : {},
                        ]}
                        resizeMode="cover"
                      />
                    );
                  })}
                </View>
              )}

              {/* HIỂN THỊ VĂN BẢN (Kèm theo ảnh) */}
              {!!item.content && (
                <Text
                  style={[
                    styles.messageText,
                    isMe ? styles.textMe : styles.textThem,
                  ]}
                >
                  {item.content}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          <Text
            style={[
              styles.timeLabel,
              isMe ? styles.timeLabelMe : styles.timeLabelThem,
            ]}
          >
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.iconButton}
          >
            <Ionicons name="chevron-back" size={28} color="#0084ff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <TouchableOpacity onPress={openContactDetails}>
              <Text style={styles.headerName}>{conversationName}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="call" size={24} color="#0084ff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="videocam" size={24} color="#0084ff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* DANH SÁCH TIN NHẮN */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0084ff" />
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            inverted={true}
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator size="small" color="#0084ff" />
              ) : null
            }
          />
        )}

        {/* KHUNG NHẬP TIN NHẮN */}
        <View style={styles.inputSection}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add" size={26} color="#0084ff" />
          </TouchableOpacity>

          {/* GẮN HÀM XỬ LÝ VÀO NÚT ẢNH */}
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleOpenMedia}
          >
            <Ionicons name="image" size={24} color="#0084ff" />
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Aa"
              placeholderTextColor="#8e8e93"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity style={styles.emojiButton}>
              <Ionicons name="happy-outline" size={24} color="#0084ff" />
            </TouchableOpacity>
          </View>

          {/* Nút Gửi / Icon Like tùy trạng thái */}
          {isUploading ? (
            <View style={styles.sendButton}>
              <ActivityIndicator size="small" color="#0084ff" />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Ionicons
                name={inputText.trim() ? "send" : "thumbs-up"}
                size={24}
                color="#0084ff"
              />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, backgroundColor: "#f4f4f6" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5ea",
    zIndex: 10,
  },
  headerTitleContainer: { flex: 1, paddingLeft: 8 },
  headerName: { fontSize: 17, fontWeight: "600", color: "#000" },
  headerActions: { flexDirection: "row" },
  iconButton: { padding: 8 },

  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  messageWrapper: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-end",
  },
  messageWrapperMe: { justifyContent: "flex-end" },
  messageWrapperThem: { justifyContent: "flex-start" },
  avatarSmall: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },

  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: "hidden", // Để ảnh không bị tràn viền cong
  },
  bubbleMediaOnly: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  bubbleMe: { backgroundColor: "#0084ff", borderBottomRightRadius: 4 },
  bubbleThem: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#e5e5ea",
  },
  messageText: { fontSize: 16, lineHeight: 22 },
  textMe: { color: "#fff" },
  textThem: { color: "#000" },
  mediaImage: {
    width: 220,
    height: 300,
    borderRadius: 16,
    backgroundColor: "#e5e5ea",
  },

  timeLabel: { fontSize: 11, color: "#8e8e93", marginTop: 4 },
  timeLabelMe: { alignSelf: "flex-end", marginRight: 4 },
  timeLabelThem: { alignSelf: "flex-start", marginLeft: 4 },

  inputSection: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e5ea",
  },
  attachButton: { padding: 8, paddingBottom: 10 },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f7",
    borderRadius: 20,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e5e5ea",
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingTop: 10,
    paddingBottom: 10,
    color: "#000",
  },
  emojiButton: { padding: 4 },
  sendButton: {
    padding: 8,
    paddingBottom: 10,
    justifyContent: "center",
    alignItems: "center",
    width: 40,
  },
  mediaContainer: {
    flexDirection: "row", // Xếp hàng ngang
    flexWrap: "wrap", // Hết chỗ thì tự động rớt dòng
    gap: 4, // Khoảng cách giữa các ảnh
  },
  mediaImageMultiple: {
    width: 110, // Nếu có nhiều ảnh thì thu nhỏ lại (bằng 1 nửa)
    height: 150, // Chiều cao cũng thu nhỏ theo tỷ lệ
    borderRadius: 8,
  },
});
