import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client } from '@stomp/stompjs';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
  View
} from 'react-native';
import 'text-encoding';
import axiosClient from '../Api/services/axiosClient'; // Đảm bảo đường dẫn này đúng với dự án của bạn

// --- KHAI BÁO TYPE ---
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
  createdAt: string;
  isRead: boolean; // Trường kiểm tra đã đọc / chưa đọc
}

interface UserSearchResponse {
  userId: string;
  email: string;
  username: string;
}

export default function HomeScreen() {
  // --- STATE DANH SÁCH CHAT ---
  const [chatList, setChatList] = useState<ConversationDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // --- STATE TÌM KIẾM ---
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<UserSearchResponse[]>([]); 

  // Sử dụng useFocusEffect để tự động tải lại dữ liệu mỗi khi quay về màn hình Home
  useFocusEffect(
    useCallback(() => {
      fetchMyProfile();
      fetchConversations();
    }, [])
  );

  // --- THIẾT LẬP WEBSOCKET (STOMP) CHO MÀN HÌNH HOME ---
  useEffect(() => {
    let client: Client | null = null;

    const connectHomeWebSocket = async () => {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;

      client = new Client({
        brokerURL: 'ws://10.0.2.2:8080/ws',
        connectHeaders: { Authorization: `Bearer ${token}` },
        forceBinaryWSFrames: true,
        appendMissingNULLonIncoming: true,
      });

      client.onConnect = () => {
        console.log('Home: Đã kết nối STOMP để theo dõi danh sách');
        
        client!.subscribe('/user/queue/messages', (messageOutput) => {
          if (messageOutput.body) {
            const newMessage = JSON.parse(messageOutput.body);
            
            // KHI CÓ TIN NHẮN MỚI, CẬP NHẬT LẠI DANH SÁCH CHAT NGAY LẬP TỨC
            setChatList((prevList) => {
              const existingChatIndex = prevList.findIndex(chat => chat.id === newMessage.conversationId);
              
              let updatedList = [...prevList];

              if (existingChatIndex !== -1) {
                const chatToUpdate = updatedList.splice(existingChatIndex, 1)[0];
                chatToUpdate.lastMessageContent = newMessage.content;
                chatToUpdate.lastMessageTime = newMessage.createdAt;
                chatToUpdate.isRead = false; // Có tin nhắn mới -> Đánh dấu là chưa đọc (in đậm)
                
                updatedList.unshift(chatToUpdate); 
              } else {
                fetchConversations();
              }

              return updatedList;
            });
          }
        });
      };

      client.activate();
    };

    connectHomeWebSocket();

    return () => {
      if (client && client.active) client.deactivate();
    };
  }, []);

  // 1. LẤY THÔNG TIN CỦA CHÍNH MÌNH
  const fetchMyProfile = async () => {
    try {
      const response = await axiosClient.get('/api/v1/users');
      const apiResponse = response.data;
      if (apiResponse && apiResponse.code === 200) {
        const myInfo = apiResponse.data;
        setCurrentUserId(myInfo.userId);
        await AsyncStorage.setItem('myUserId', myInfo.userId); 
      }
    } catch (error) {
      console.error('Lỗi lấy thông tin cá nhân:', error);
    }
  };

  // 2. LẤY DANH SÁCH CUỘC TRÒ CHUYỆN
  const fetchConversations = async () => {
    try { 
      const response = await axiosClient.get('/api/v1/my-conversations', {
        params: { page: 1, size: 20 }
      });

      const apiResponse = response.data;
      if (apiResponse && apiResponse.code === 200) {
        const allChats = apiResponse.data.content || [];
        const activeChats = allChats.filter((chat: ConversationDetailResponse) => {
          if (chat.conversationType === 'GROUP') return true;
          const hasMessage = chat.lastMessageContent && chat.lastMessageContent.trim().length > 0;
          return hasMessage;
        });

        setChatList(activeChats);
      } else {
        Alert.alert('Lỗi', apiResponse.message || 'Không thể tải dữ liệu');
      }
    } catch (error: any) {
      console.error('Lỗi fetch conversations:', error);
      Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    setSearchLoading(true);
    
    try {
      const response = await axiosClient.get('/api/v1/users/search', {
        params: { 
          keyword: searchQuery,
          page: 1, 
          size: 20 
        }
      });

      const apiResponse = response.data;
      if (apiResponse && apiResponse.code === 200) {
        setSearchResults(apiResponse.data.content || []);
      } else {
        Alert.alert('Lỗi', apiResponse.message || 'Không thể tìm kiếm');
      }
    } catch (error) {
      console.error('Lỗi tìm kiếm:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi tìm kiếm người dùng.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleStartChat = async (targetUser: UserSearchResponse) => {
    try {
      const response = await axiosClient.post('/api/v1/conversations', {
        participantIds: [targetUser.userId],
        conversationType: 'PRIVATE' 
      });

      const apiResponse = response.data;
      
      if (apiResponse && apiResponse.code === 200) {
        const conversation = apiResponse.data;
        
        setSearchQuery('');
        setIsSearching(false);
        setSearchResults([]);

        router.push(`/chat?id=${conversation.id}&name=${encodeURIComponent(conversation.name)}`);
      } else {
        Alert.alert('Lỗi', apiResponse.message || 'Không thể tạo cuộc trò chuyện');
      }
    } catch (error: any) {
      console.error('Lỗi khi tạo phòng chat:', error);
      Alert.alert('Lỗi kết nối', error.response?.data?.message || 'Có lỗi xảy ra khi kết nối với máy chủ.');
    }
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '';
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Đoạn chat</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionIcon}>
              <Ionicons name="camera" size={24} color="#050505" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon}>
              <Ionicons name="pencil" size={24} color="#050505" />
            </TouchableOpacity>
          </View>
        </View>

        {/* THANH TÌM KIẾM */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#8e8e93" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Tìm kiếm bạn bè..."
            placeholderTextColor="#8e8e93"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text === '') {
                setIsSearching(false);
                setSearchResults([]);
              }
            }}
            onSubmitEditing={handleSearchUsers}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { 
              setSearchQuery(''); 
              setIsSearching(false);
              setSearchResults([]);
            }}>
              <Ionicons name="close-circle" size={20} color="#8e8e93" />
            </TouchableOpacity>
          )}
        </View>

        {/* KHU VỰC HIỂN THỊ DỮ LIỆU */}
        {isSearching ? (
          searchLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0084ff" />
              <Text style={{ marginTop: 10, color: '#888' }}>Đang tìm kiếm...</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.userId}
              contentContainerStyle={styles.listContainer}
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
                  <View style={[styles.avatar, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>
                      {item.username.charAt(0).toUpperCase()}
                    </Text>
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
              <Text style={styles.emptyText}>Bạn chưa có cuộc trò chuyện nào.</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.chatItem} 
                onPress={() => {
                  // Đổi trạng thái isRead thành true ngay lập tức để mất chữ in đậm tại giao diện
                  setChatList((prevList) =>
                    prevList.map((chat) =>
                      chat.id === item.id ? { ...chat, isRead: true } : chat
                    )
                  );
                  // Chuyển hướng sang phòng chat
                  router.push(`/chat?id=${item.id}&name=${encodeURIComponent(item.name)}`);
                }}
              >
                <Image 
                  source={{ uri: item.conversationAvatar || 'https://i.pravatar.cc/150?img=11' }} 
                  style={styles.avatar} 
                />
                
                <View style={styles.chatInfo}>
                  <Text style={[styles.chatName, !item.isRead && { fontWeight: 'bold' }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text 
                    style={[
                      styles.lastMessage, 
                      !item.isRead && { fontWeight: 'bold', color: '#000' }
                    ]} 
                    numberOfLines={1}
                  >
                    {item.lastMessageContent || 'Chưa có tin nhắn'}
                  </Text>
                </View>

                <View style={styles.chatMeta}>
                  <Text style={styles.timeText}>{formatTime(item.lastMessageTime)}</Text>
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
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#888', fontSize: 16 },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 5,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#050505' },
  headerActions: { flexDirection: 'row' },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#050505' },

  listContainer: { paddingHorizontal: 16 },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 12, backgroundColor: '#aeb4b7' },
  chatInfo: { flex: 1, justifyContent: 'center' },
  chatName: { fontSize: 17, fontWeight: '500', color: '#050505', marginBottom: 4 },
  lastMessage: { fontSize: 14, color: '#65676b' },
  
  chatMeta: { alignItems: 'flex-end', marginLeft: 8 },
  timeText: { fontSize: 12, color: '#65676b', marginBottom: 6 },
});