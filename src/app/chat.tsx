import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client } from '@stomp/stompjs';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
  View
} from 'react-native';
import 'text-encoding';
import axiosClient from '../Api/services/axiosClient';

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
  const { id: conversationId, name: conversationName } = useLocalSearchParams<{ id: string; name: string }>();

  // --- STATE ---
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [inputText, setInputText] = useState('');
  const [myUserId, setMyUserId] = useState<string | null>(null);
  
  // Trạng thái Loading và Phân trang
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // State cho WebSocket (STOMP)
  const [stompClient, setStompClient] = useState<Client | null>(null);

  // --- KHỞI TẠO DỮ LIỆU ---
  useEffect(() => {
    const getMyId = async () => {
      try {
        const id = await AsyncStorage.getItem('myUserId');
        setMyUserId(id);
      } catch (error) {
        console.error('Lỗi lấy myUserId:', error);
      }
    };
    getMyId();
  }, []);

  // --- THIẾT LẬP WEBSOCKET (STOMP) ---
  useEffect(() => {
    let client: Client | null = null; 

    const connectWebSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (!token) {
          console.error("Không tìm thấy token để kết nối WebSocket!");
          return;
        }

        client = new Client({
          brokerURL: 'ws://10.0.2.2:8080/ws', 
          connectHeaders: {
            Authorization: `Bearer ${token}`, 
          },
          forceBinaryWSFrames: true,
          appendMissingNULLonIncoming: true,
          debug: (str) => console.log('STOMP: ' + str),
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
        });

        client.onConnect = (frame) => {
          console.log('Đã kết nối WebSocket thành công!', frame);
          
          client!.subscribe('/user/queue/messages', (messageOutput) => {
            if (messageOutput.body) {
              const newMessage: ChatMessageResponse = JSON.parse(messageOutput.body);
              
              if (newMessage.conversationId === conversationId) {
                setMessages((prevMessages) => [newMessage, ...prevMessages]);
              }
            }
          });
        };

        client.onStompError = (frame) => {
          console.error('Lỗi STOMP Server: ' + frame.headers['message']);
        };

        client.onWebSocketError = (error) => {
          console.error('Lỗi kết nối mạng WebSocket:', error);
        };

        client.activate();
        setStompClient(client);

      } catch (error) {
        console.error("Lỗi khởi tạo STOMP Client:", error);
      }
    };

    if (conversationId) {
      connectWebSocket();
    }

    return () => {
      if (client && client.active) {
        client.deactivate();
        console.log('Đã ngắt kết nối WebSocket.');
      }
    };
  }, [conversationId]);

  // --- TẢI TIN NHẮN VÀ ĐÁNH DẤU ĐÃ ĐỌC ---
  useEffect(() => {
    if (conversationId) {
      fetchMessages(1);

      // Gọi API đánh dấu đã đọc khi người dùng mở phòng chat này
      axiosClient.put(`/api/v1/conversations/${conversationId}/read`)
        .catch(error => console.log('Lỗi đánh dấu đã đọc:', error));
    }
  }, [conversationId]);

  // --- LOGIC GỌI API LỊCH SỬ ---
  const fetchMessages = async (pageNumber: number) => {
    try {
      if (pageNumber === 1) setLoading(true);
      else setLoadingMore(true);

      const response = await axiosClient.get(`/api/v1/${conversationId}/messages`, {
        params: { page: pageNumber, size: 20 }
      });

      const apiResponse = response.data;
      if (apiResponse && apiResponse.code === 200) {
        const newMessages = apiResponse.data.content || [];
        
        if (pageNumber === 1) {
          setMessages(newMessages);
        } else {
          setMessages(prev => [...prev, ...newMessages]);
        }

        setHasMore(pageNumber < apiResponse.data.totalPages);
        setPage(pageNumber);
      }
    } catch (error) {
      console.error('Lỗi tải tin nhắn:', error);
      Alert.alert('Lỗi', 'Không thể tải lịch sử trò chuyện.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreMessages = () => {
    if (!loadingMore && hasMore) {
      fetchMessages(page + 1);
    }
  };

  // --- LOGIC GỬI TIN NHẮN THẬT QUA REST API ---
  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    const messageContent = inputText.trim();
    setInputText(''); // Xóa khung nhập ngay lập tức để tạo cảm giác mượt

    try {
      const response = await axiosClient.post(`/api/v1/chat-messages`, {
        conversationId: conversationId,
        content: messageContent,
        messageType: 'TEXT', 
        messageMedia: [], 
        tempId: Date.now().toString(), 
      });

      const apiResponse = response.data;
      
      // Chấp nhận mọi dữ liệu trả về miễn là có data
      const savedMessage = apiResponse.data || apiResponse;
      
      if (savedMessage && (apiResponse.code === 200 || savedMessage.id)) {
        setMessages((prevMessages) => [savedMessage, ...prevMessages]);
      } else {
        Alert.alert('Lỗi', apiResponse.message || 'Không thể gửi tin nhắn');
      }
    } catch (error: any) {
      console.error('Lỗi khi gửi tin nhắn:', error);
      Alert.alert('Lỗi kết nối', error.response?.data?.message || 'Không thể gửi tin nhắn đi.');
    }
  };

  // --- LOGIC XÓA TIN NHẮN ---
  const handleDeleteMessage = async (messageId: string) => {
    try {
      // Đảm bảo đường dẫn này khớp với backend của bạn
      const response = await axiosClient.delete(`/api/v1/messages/${messageId}`);
      if (response.data.code === 200 || response.status === 200) {
        // Lọc bỏ tin nhắn bị xóa khỏi giao diện hiện tại
        setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== messageId));
      }
    } catch (error) {
      console.error("Lỗi xóa tin nhắn:", error);
      Alert.alert("Lỗi", "Không thể xóa tin nhắn lúc này.");
    }
  };

  const confirmDelete = (messageId: string) => {
    Alert.alert(
      "Xóa tin nhắn",
      "Bạn có chắc chắn muốn xóa tin nhắn này không?",
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Xóa", 
          style: "destructive", 
          onPress: () => handleDeleteMessage(messageId) 
        }
      ]
    );
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return new Date(timeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- RENDER BONG BÓNG TIN NHẮN ---
  const renderMessage = ({ item }: { item: ChatMessageResponse }) => {
    const isMe = item.senderId === myUserId; 
    
    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperThem]}>
        {!isMe && (
          <Image 
            source={{ uri: item.conversationAvatar || 'https://i.pravatar.cc/150?img=11' }} 
            style={styles.avatarSmall} 
          />
        )}
        <View>
          {/* Nhấn giữ (long press) vào tin nhắn của MÌNH để hiện menu xóa */}
          <TouchableOpacity 
            onLongPress={() => {
              if (isMe) confirmDelete(item.id);
            }}
            activeOpacity={0.8}
            delayLongPress={300}
          >
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
              <Text style={[styles.messageText, isMe ? styles.textMe : styles.textThem]}>
                {item.content}
              </Text>
            </View>
          </TouchableOpacity>
          <Text style={[styles.timeLabel, isMe ? styles.timeLabelMe : styles.timeLabelThem]}>
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={28} color="#0084ff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerName}>{conversationName || 'Đoạn chat'}</Text>
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
            ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#0084ff" /> : null}
          />
        )}

        {/* KHUNG NHẬP TIN NHẮN */}
        <View style={styles.inputSection}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add" size={26} color="#0084ff" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.attachButton}>
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

          <TouchableOpacity 
            style={styles.sendButton} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons 
              name={inputText.trim() ? "send" : "thumbs-up"} 
              size={24} 
              color={inputText.trim() ? "#0084ff" : "#0084ff"} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#f4f4f6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#e5e5ea', zIndex: 10 },
  headerTitleContainer: { flex: 1, paddingLeft: 8 },
  headerName: { fontSize: 17, fontWeight: '600', color: '#000' },
  headerActions: { flexDirection: 'row' },
  iconButton: { padding: 8 },

  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  messageWrapper: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperThem: { justifyContent: 'flex-start' },
  avatarSmall: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  
  bubble: { maxWidth: '75%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  bubbleMe: { backgroundColor: '#0084ff', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e5e5ea' },
  messageText: { fontSize: 16, lineHeight: 22 },
  textMe: { color: '#fff' },
  textThem: { color: '#000' },
  
  timeLabel: { fontSize: 11, color: '#8e8e93', marginTop: 4 },
  timeLabelMe: { alignSelf: 'flex-end', marginRight: 4 },
  timeLabelThem: { alignSelf: 'flex-start', marginLeft: 4 },

  inputSection: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingVertical: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e5ea' },
  attachButton: { padding: 8, paddingBottom: 10 },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f2f2f7', borderRadius: 20, marginHorizontal: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e5ea' },
  input: { flex: 1, fontSize: 16, maxHeight: 100, paddingTop: 10, paddingBottom: 10, color: '#000' },
  emojiButton: { padding: 4 },
  sendButton: { padding: 8, paddingBottom: 10 },
});