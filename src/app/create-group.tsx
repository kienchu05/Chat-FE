import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
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
import axiosClient from "../Api/services/axiosClient";

interface UserSearchResponse {
  userId: string;
  email: string;
  username: string;
}

export default function CreateGroupScreen() {
  const router = useRouter();

  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResponse[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResponse[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleSearchUsers = async () => {
    const keyword = searchQuery.trim();
    if (!keyword) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const response = await axiosClient.get("/api/v1/users/search", {
        params: {
          keyword,
          page: 1,
          size: 20,
        },
      });

      const apiResponse = response.data;
      if (apiResponse?.code === 200) {
        const users: UserSearchResponse[] = apiResponse.data?.content || [];
        // Không hiển thị những user đã được chọn
        const filteredUsers = users.filter(
          (user) =>
            !selectedUsers.some((selected) => selected.userId === user.userId),
        );

        setSearchResults(filteredUsers);
      } else {
        Alert.alert(
          "Lỗi",
          apiResponse?.message || "Không thể tìm kiếm người dùng",
        );
      }
    } catch (error: any) {
      console.error("Lỗi tìm kiếm user:", error);

      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể tìm kiếm người dùng",
      );
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectUser = (user: UserSearchResponse) => {
    setSelectedUsers((prev) => {
      // Đã tồn tại thì không thêm nữa
      if (prev.some((item) => item.userId === user.userId)) {
        return prev;
      }
      return [...prev, user];
    });

    // Xóa user khỏi kết quả tìm kiếm
    setSearchResults((prev) =>
      prev.filter((item) => item.userId !== user.userId),
    );
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((user) => user.userId !== userId));
  };

  const handlePickGroupAvatar = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Quyền truy cập",
          "Vui lòng cho phép ứng dụng truy cập thư viện ảnh.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setGroupAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Lỗi chọn avatar nhóm:", error);
      Alert.alert("Lỗi", "Không thể chọn ảnh.");
    }
  };

  const handleCreateGroup = async () => {
    const name = groupName.trim();
    if (!name) {
      Alert.alert("Thông báo", "Vui lòng nhập tên nhóm.");
      return;
    }

    // Ít nhất 2 người được chọn + người tạo nhóm
    if (selectedUsers.length < 2) {
      Alert.alert("Thông báo", "Vui lòng chọn ít nhất 2 thành viên.");
      return;
    }

    try {
      setCreating(true);

      let avatarUrl: string | null = null;

      // 1. Upload avatar nếu người dùng đã chọn
      if (groupAvatar) {
        setUploadingAvatar(true);

        const formData = new FormData();

        formData.append("file", {
          uri: groupAvatar,
          name: "group-avatar.jpg",
          type: "image/jpeg",
        } as any);

        const uploadResponse = await axiosClient.post(
          "/api/v1/files/upload",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        );

        setUploadingAvatar(false);

        console.log("UPLOAD GROUP AVATAR:", uploadResponse.data);
        avatarUrl = uploadResponse.data?.message;

        if (!avatarUrl) {
          throw new Error("Không nhận được URL avatar.");
        }
      }

      // 2. Tạo nhóm
      const participantIds = selectedUsers.map((user) => user.userId);
      const response = await axiosClient.post("/api/v1/conversations", {
        name,
        participantIds,
        conversationType: "GROUP",
        conversationAvatar: avatarUrl,
      });

      const apiResponse = response.data;

      console.log("CREATE GROUP RESPONSE:", apiResponse);

      if (apiResponse?.code === 200) {
        const conversation = apiResponse.data;

        // Xóa dữ liệu màn hình
        setGroupName("");
        setSearchQuery("");
        setSearchResults([]);
        setSelectedUsers([]);
        setGroupAvatar(null);

        // Mở màn hình chat nhóm
        router.replace({
          pathname: "/chat",
          params: {
            id: conversation.id,
            name: conversation.name,
          },
        });
      } else {
        Alert.alert("Lỗi", apiResponse?.message || "Không thể tạo nhóm.");
      }
    } catch (error: any) {
      console.error("Lỗi tạo nhóm:", error);

      Alert.alert(
        "Lỗi",
        error.response?.data?.message ||
          error.message ||
          "Không thể tạo cuộc trò chuyện nhóm.",
      );
    } finally {
      setCreating(false);
      setUploadingAvatar(false);
    }
  };

  const renderSelectedUser = ({ item }: { item: UserSearchResponse }) => {
    return (
      <View style={styles.selectedUser}>
        <View style={styles.selectedAvatarContainer}>
          <Image
            source={require("../assets/icon.png.webp")}
            style={styles.selectedAvatar}
          />
        </View>

        <Text style={styles.selectedUsername} numberOfLines={1}>
          {item.username}
        </Text>

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveUser(item.userId)}
        >
          <Ionicons name="close-circle" size={22} color="#8e8e93" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderSearchUser = ({ item }: { item: UserSearchResponse }) => {
    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => handleSelectUser(item)}
      >
        <Image
          source={require("../assets/icon.png.webp")}
          style={styles.userAvatar}
        />

        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.username}</Text>

          <Text style={styles.email}>{item.email}</Text>
        </View>

        <Ionicons name="add-circle-outline" size={28} color="#0084ff" />
      </TouchableOpacity>
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
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={25} color="#050505" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Tạo nhóm</Text>

          <View style={styles.headerRight} />
        </View>

        {/* GROUP NAME */}
        <View style={styles.section}>
          <Text style={styles.label}>Tên nhóm</Text>

          <TextInput
            style={styles.groupNameInput}
            placeholder="Nhập tên nhóm..."
            placeholderTextColor="#8e8e93"
            value={groupName}
            onChangeText={setGroupName}
            maxLength={100}
          />
        </View>

        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarPicker}
            onPress={handlePickGroupAvatar}
            disabled={creating}
          >
            <Image
              source={
                groupAvatar
                  ? { uri: groupAvatar }
                  : require("../assets/icon.png.webp")
              }
              style={styles.groupAvatar}
            />

            <View style={styles.cameraButton}>
              <Ionicons name="camera" size={18} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={styles.avatarHint}>
            {groupAvatar ? "Thay đổi ảnh nhóm" : "Thêm ảnh nhóm"}
          </Text>
        </View>

        {/* GROUP NAME */}
        <View style={styles.section}>
          <Text style={styles.label}>Tên nhóm</Text>

          <TextInput
            style={styles.groupNameInput}
            placeholder="Nhập tên nhóm..."
            placeholderTextColor="#8e8e93"
            value={groupName}
            onChangeText={setGroupName}
            maxLength={100}
          />
        </View>

        {/* SELECTED USERS */}
        <View style={styles.section}>
          <View style={styles.selectedHeader}>
            <Text style={styles.label}>Thành viên</Text>

            <Text style={styles.selectedCount}>{selectedUsers.length}</Text>
          </View>

          {selectedUsers.length > 0 ? (
            <FlatList
              data={selectedUsers}
              horizontal
              keyExtractor={(item) => item.userId}
              renderItem={renderSelectedUser}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectedList}
            />
          ) : (
            <Text style={styles.noSelectedText}>Chưa chọn thành viên</Text>
          )}
        </View>

        {/* SEARCH */}
        <View style={styles.section}>
          <Text style={styles.label}>Thêm thành viên</Text>

          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color="#8e8e93"
              style={styles.searchIcon}
            />

            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm người dùng..."
              placeholderTextColor="#8e8e93"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchUsers}
              returnKeyType="search"
            />

            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                }}
              >
                <Ionicons name="close-circle" size={20} color="#8e8e93" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* SEARCH RESULTS */}
        {searchLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0084ff" />

            <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.userId}
            renderItem={renderSearchUser}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.searchResultList}
            ListEmptyComponent={
              searchQuery.trim() ? (
                <Text style={styles.emptyText}>Không tìm thấy người dùng.</Text>
              ) : (
                <Text style={styles.emptyText}>
                  Nhập tên hoặc email để tìm kiếm.
                </Text>
              )
            }
          />
        )}

        {/* CREATE BUTTON */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.createButton,
              (creating || !groupName.trim() || selectedUsers.length < 2) &&
                styles.createButtonDisabled,
            ]}
            disabled={creating || !groupName.trim() || selectedUsers.length < 2}
            onPress={handleCreateGroup}
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="people" size={20} color="#fff" />

                <Text style={styles.createButtonText}>Tạo nhóm</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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

  // HEADER
  header: {
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#050505",
  },

  headerRight: {
    width: 40,
  },

  // SECTION
  section: {
    paddingHorizontal: 16,
    marginTop: 16,
  },

  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#050505",
    marginBottom: 8,
  },

  // GROUP NAME
  groupNameInput: {
    height: 48,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#050505",
  },

  // SELECTED
  selectedHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  selectedCount: {
    marginLeft: 8,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0084ff",
    color: "#fff",
    textAlign: "center",
    lineHeight: 24,
    fontSize: 13,
    fontWeight: "600",
  },

  selectedList: {
    paddingVertical: 4,
  },

  selectedUser: {
    width: 80,
    alignItems: "center",
    marginRight: 10,
  },

  selectedAvatarContainer: {
    position: "relative",
  },

  selectedAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },

  selectedUsername: {
    marginTop: 5,
    fontSize: 12,
    color: "#050505",
    maxWidth: 75,
  },

  removeButton: {
    position: "absolute",
    right: -5,
    top: -5,
    backgroundColor: "#fff",
    borderRadius: 12,
  },

  noSelectedText: {
    color: "#8e8e93",
    fontSize: 14,
  },

  // SEARCH
  searchContainer: {
    height: 44,
    backgroundColor: "#f0f2f5",
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  searchIcon: {
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#050505",
  },

  // USER

  searchResultList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },

  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },

  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },

  userInfo: {
    flex: 1,
  },

  username: {
    fontSize: 16,
    fontWeight: "600",
    color: "#050505",
    marginBottom: 3,
  },

  email: {
    fontSize: 13,
    color: "#65676b",
  },

  // LOADING
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
    color: "#888",
    marginTop: 20,
    fontSize: 14,
  },

  // BOTTOM
  bottomContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },

  createButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0084ff",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  createButtonDisabled: {
    opacity: 0.5,
  },

  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },

  avatarSection: {
    alignItems: "center",
    marginTop: 20,
  },

  avatarPicker: {
    position: "relative",
  },

  groupAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  cameraButton: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0084ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  avatarHint: {
    marginTop: 8,
    fontSize: 14,
    color: "#0084ff",
    fontWeight: "500",
  },
});
