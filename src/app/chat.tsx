import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import axiosClient from '../Api/services/axiosClient'; // Đảm bảo đường dẫn này đúng

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

  // --- KHỞI TẠO DỮ LIỆU ---
  useEffect(() => {
    // Lấy ID của chính mình từ bộ nhớ để phân biệt tin nhắn gửi/nhận
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

  useEffect(() => {
    if (conversationId) {
      // Khi có ID phòng chat, gọi API lấy trang 1
      fetchMessages(1);
    }
  }, [conversationId]);

  // --- LOGIC GỌI API ---
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
          // Khi tải thêm (cuộn lên trên), ghép tin nhắn cũ vào cuối mảng
          setMessages(prev => [...prev, ...newMessages]);
        }

        // Kiểm tra xem còn trang nào nữa không
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

  // Kích hoạt khi cuộn lên kịch trần để tải tin nhắn cũ hơn
  const loadMoreMessages = () => {
    if (!loadingMore && hasMore) {
      fetchMessages(page + 1);
    }
  };

  // --- LOGIC GỬI TIN NHẮN (Sẽ nâng cấp lên WebSocket sau) ---
  const handleSend = () => {
    if (!inputText.trim()) return;
    
    // TODO: Gửi tin nhắn qua STOMP WebSocket tại đây
    Alert.alert("Thông báo", "Cần tích hợp WebSocket để gửi tin nhắn thật!");
    setInputText('');
  };

  // Hàm định dạng thời gian
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return new Date(timeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- RENDER TỪNG BONG BÓNG TIN NHẮN ---
  const renderMessage = ({ item }: { item: ChatMessageResponse }) => {
    // Phân biệt tin nhắn: Nếu senderId bằng myUserId thì là tin của mình (màu xanh, bên phải)
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
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
            <Text style={[styles.messageText, isMe ? styles.textMe : styles.textThem]}>
              {item.content}
            </Text>
          </View>
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
            // Thuộc tính Inverted (lật ngược) để tin mới nhất nằm ở dưới cùng
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
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#e5e5ea', zIndex: 10 },
  headerTitleContainer: { flex: 1, paddingLeft: 8 },
  headerName: { fontSize: 17, fontWeight: '600', color: '#000' },
  headerActions: { flexDirection: 'row' },
  iconButton: { padding: 8 },

  // Message List
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

  // Input Area
  inputSection: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingVertical: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e5ea' },
  attachButton: { padding: 8, paddingBottom: 10 },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f2f2f7', borderRadius: 20, marginHorizontal: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e5ea' },
  input: { flex: 1, fontSize: 16, maxHeight: 100, paddingTop: 10, paddingBottom: 10, color: '#000' },
  emojiButton: { padding: 4 },
  sendButton: { padding: 8, paddingBottom: 10 },
});