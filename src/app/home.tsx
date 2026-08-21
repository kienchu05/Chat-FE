import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    fetchMyProfile();
    fetchConversations();
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
    //   console.log('API Response for conversations:', apiResponse);
    //   console.log('Raw data from API:', apiResponse.data.content[2]);
      if (apiResponse && apiResponse.code === 200) {
        
        // Dữ liệu gốc từ Backend
        const allChats = apiResponse.data.content || [];
        
        // --- THÊM BƯỚC LỌC Ở ĐÂY ---
        // Chỉ giữ lại: Nhóm (GROUP) HOẶC Cuộc trò chuyện cá nhân đã có tin nhắn
        const activeChats = allChats.filter((chat: ConversationDetailResponse) => {
          if (chat.conversationType === 'GROUP') return true;
          const hasMessage = chat.lastMessageContent && chat.lastMessageContent.trim().length > 0;
          return hasMessage;
        });

        // Đổ dữ liệu đã lọc vào State
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

  // 3. XỬ LÝ KÉO XUỐNG ĐỂ TẢI LẠI
  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  // 4. XỬ LÝ TÌM KIẾM BẠN BÈ
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

  // 5. XỬ LÝ KHI BẤM VÀO NGƯỜI DÙNG TRONG TẬP KẾT QUẢ TÌM KIẾM
  const handleStartChat = async (targetUser: UserSearchResponse) => {
    try {
      // Gọi API tạo hoặc lấy cuộc trò chuyện cũ
      const response = await axiosClient.post('/api/v1/conversations', {
        participantIds: [targetUser.userId],
        conversationType: 'PRIVATE' 
      });

      const apiResponse = response.data;
      
      if (apiResponse && apiResponse.code === 200) {
        const conversation = apiResponse.data;
        
        // Dọn dẹp trạng thái tìm kiếm
        setSearchQuery('');
        setIsSearching(false);
        setSearchResults([]);

        // Chuyển hướng sang màn hình chat
        router.push(`/chat?id=${conversation.id}&name=${encodeURIComponent(conversation.name)}`);
      } else {
        Alert.alert('Lỗi', apiResponse.message || 'Không thể tạo cuộc trò chuyện');
      }
    } catch (error: any) {
      console.error('Lỗi khi tạo phòng chat:', error);
      Alert.alert('Lỗi kết nối', error.response?.data?.message || 'Có lỗi xảy ra khi kết nối với máy chủ.');
    }
  };

  // Hàm định dạng thời gian
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
          /* TRẠNG THÁI 1: HIỂN THỊ KẾT QUẢ TÌM KIẾM */
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
          /* TRẠNG THÁI 2: ĐANG TẢI DANH SÁCH CHAT */
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0084ff" />
          </View>
        ) : (
          /* TRẠNG THÁI 3: HIỂN THỊ DANH SÁCH CHAT BÌNH THƯỜNG */
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
                onPress={() => router.push(`/chat?id=${item.id}&name=${encodeURIComponent(item.name)}`)}
              >
                <Image 
                  source={{ uri: item.conversationAvatar || 'https://i.pravatar.cc/150?img=11' }} 
                  style={styles.avatar} 
                />
                
                <View style={styles.chatInfo}>
                  <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.lastMessage} numberOfLines={1}>
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
  
  // Header
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

  // Search
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

  // List
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