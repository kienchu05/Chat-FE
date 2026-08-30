import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import axiosClient from "../../Api/services/axiosClient";
import { useWebSocket } from "../../hooks/WebsocketHooks";

interface User {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  isOnline: boolean;
  isLocked: boolean;
  lockedUntil?: string | null;
  lastOnlineAt?: string | null;
}

interface PresenceEvent {
  userId: string;
  isOnline: boolean;
  lastOnlineAt: string | null;
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // LOCK
  const [lockUserId, setLockUserId] = useState<string | null>(null);
  const [lockSeconds, setLockSeconds] = useState("60");
  const [lockLoading, setLockLoading] = useState(false);

  // LOGOUT
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
              console.log("ADMIN: Bắt đầu logout...");

              // Xóa token
              await AsyncStorage.multiRemove(["accessToken", "myUserId"]);

              console.log("ADMIN: Đã xóa token");

              // Xóa dữ liệu trên UI
              setUsers([]);

              // Quay về Login
              router.replace("/");
            } catch (error) {
              console.error("ADMIN: Lỗi logout:", error);

              await AsyncStorage.multiRemove(["accessToken", "myUserId"]);

              router.replace("/");
            }
          },
        },
      ],
    );
  };

  // PRESENCE
  const handlePresence = useCallback((presence: PresenceEvent) => {
    console.log("ADMIN PRESENCE:", presence);

    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.userId === presence.userId
          ? {
              ...user,
              isOnline: presence.isOnline,
              lastOnlineAt: presence.lastOnlineAt,
            }
          : user,
      ),
    );
  }, []);

  const { connected } = useWebSocket(undefined, handlePresence);

  // GET USERS
  const fetchUsers = useCallback(async () => {
    try {
      const response = await axiosClient.get("/api/v1/admin/users");

      console.log("ADMIN USERS:", response.data);

      setUsers(response.data || []);
    } catch (error: any) {
      console.error("Lỗi lấy danh sách user:", error.response?.data || error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // LOAD
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // REFRESH
  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  // OPEN LOCK
  const openLockInput = (user: User) => {
    setLockUserId(user.userId);
    setLockSeconds("60");
  };

  // CANCEL LOCK
  const cancelLock = () => {
    setLockUserId(null);
    setLockSeconds("60");
  };

  // LOCK USER
  const handleLockUser = async (user: User) => {
    const seconds = Number(lockSeconds);

    if (!Number.isInteger(seconds) || seconds <= 0) {
      Alert.alert("Lỗi", "Thời gian khóa phải lớn hơn 0 giây.");
      return;
    }

    Alert.alert(
      "Khóa tài khoản",
      `Bạn có chắc chắn muốn khóa tài khoản "${user.username}" trong ${seconds} giây?`,
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Khóa",
          style: "destructive",
          onPress: async () => {
            try {
              setLockLoading(true);

              await axiosClient.put(`/api/v1/admin/users/${user.userId}/lock`, {
                seconds,
              });

              setUsers((prevUsers) =>
                prevUsers.map((item) =>
                  item.userId === user.userId
                    ? {
                        ...item,
                        isLocked: true,
                      }
                    : item,
                ),
              );

              setLockUserId(null);
              setLockSeconds("60");

              Alert.alert(
                "Thành công",
                `Đã khóa tài khoản ${user.username} trong ${seconds} giây.`,
              );
            } catch (error: any) {
              console.error(
                "ADMIN: Lỗi khóa user:",
                error.response?.data || error,
              );

              Alert.alert(
                "Lỗi",
                error.response?.data?.message || "Không thể khóa tài khoản.",
              );
            } finally {
              setLockLoading(false);
            }
          },
        },
      ],
    );
  };

  // UNLOCK USER
  const handleUnlockUser = async (user: User) => {
    Alert.alert(
      "Mở khóa tài khoản",
      `Bạn có chắc chắn muốn mở khóa tài khoản "${user.username}"?`,
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Mở khóa",
          onPress: async () => {
            try {
              setLockLoading(true);

              await axiosClient.put(
                `/api/v1/admin/users/${user.userId}/unlock`,
              );

              Alert.alert(
                "Thành công",
                `Đã mở khóa tài khoản ${user.username}.`,
              );

              setUsers((prevUsers) =>
                prevUsers.map((item) =>
                  item.userId === user.userId
                    ? {
                        ...item,
                        isLocked: false,
                      }
                    : item,
                ),
              );

              fetchUsers();
            } catch (error: any) {
              console.error(
                "ADMIN: Lỗi mở khóa user:",
                error.response?.data || error,
              );

              Alert.alert(
                "Lỗi",
                error.response?.data?.message || "Không thể mở khóa tài khoản.",
              );
            } finally {
              setLockLoading(false);
            }
          },
        },
      ],
    );
  };

  // USER ITEM
  const renderUser = ({ item }: { item: User }) => {
    const isAdmin = item.roles?.includes("ADMIN_ROLE");
    const isLocking = lockUserId === item.userId;

    return (
      <View style={styles.userCard}>
        {/* USER INFO */}
        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.username}</Text>

          <Text style={styles.email}>{item.email}</Text>

          <Text style={styles.userId}>ID: {item.userId}</Text>

          <Text style={styles.role}>Quyền: {isAdmin ? "ADMIN" : "USER"}</Text>

          {/* LOCK STATUS */}
          <View style={styles.lockStatusContainer}>
            <View
              style={[
                styles.lockStatusDot,
                {
                  backgroundColor: item.isLocked ? "#ff3b30" : "#31a24c",
                },
              ]}
            />

            <Text
              style={[
                styles.lockStatusText,
                {
                  color: item.isLocked ? "#ff3b30" : "#31a24c",
                },
              ]}
            >
              {item.isLocked ? "Đang bị khóa" : "Không bị khóa"}
            </Text>
          </View>
        </View>

        {/* RIGHT */}
        <View style={styles.rightContainer}>
          {/* ONLINE */}
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: item.isOnline ? "#31a24c" : "#80848e",
                },
              ]}
            />

            <Text
              style={[
                styles.statusText,
                {
                  color: item.isOnline ? "#31a24c" : "#65676b",
                },
              ]}
            >
              {item.isOnline ? "Online" : "Offline"}
            </Text>
          </View>

          {/* ADMIN */}
          {isAdmin ? (
            <Text style={styles.adminText}>ADMIN</Text>
          ) : (
            <>
              {/* LOCK INPUT */}
              {isLocking && !item.isLocked && (
                <View style={styles.lockInputContainer}>
                  <TextInput
                    style={styles.lockInput}
                    value={lockSeconds}
                    onChangeText={setLockSeconds}
                    keyboardType="numeric"
                    placeholder="Giây"
                    placeholderTextColor="#999"
                  />

                  <Text style={styles.secondsText}>giây</Text>

                  <View style={styles.inputButtons}>
                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={() => handleLockUser(item)}
                      disabled={lockLoading}
                    >
                      {lockLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>Khóa</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={cancelLock}
                    >
                      <Text style={styles.cancelButtonText}>Hủy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* LOCK BUTTON */}
              {!isLocking && !item.isLocked && (
                <TouchableOpacity
                  style={styles.lockButton}
                  onPress={() => openLockInput(item)}
                >
                  <Text style={styles.buttonText}>Khóa tài khoản</Text>
                </TouchableOpacity>
              )}

              {/* UNLOCK BUTTON */}
              {item.isLocked && (
                <TouchableOpacity
                  style={styles.unlockButton}
                  onPress={() => handleUnlockUser(item)}
                  disabled={lockLoading}
                >
                  {lockLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Mở khóa</Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  // LOADING
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />

          <Text style={styles.loadingText}>
            Đang tải danh sách người dùng...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // UI
  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Quản lý người dùng</Text>

          <Text style={styles.total}>Tổng số: {users.length} người dùng</Text>

          <View style={styles.websocketStatus}>
            <View
              style={[
                styles.websocketDot,
                {
                  backgroundColor: connected ? "#31a24c" : "#ff3b30",
                },
              ]}
            />

            <Text
              style={[
                styles.websocketText,
                {
                  color: connected ? "#31a24c" : "#ff3b30",
                },
              ]}
            >
              {connected ? "WebSocket đang kết nối" : "WebSocket đã ngắt"}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      {/* USER LIST */}
      <FlatList
        data={users}
        keyExtractor={(item) => item.userId}
        renderItem={renderUser}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Không có người dùng nào.</Text>
        }
      />
    </SafeAreaView>
  );
}

// STYLE
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6f8",
  },

  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerInfo: {
    flex: 1,
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#050505",
  },

  total: {
    marginTop: 5,
    fontSize: 14,
    color: "#65676b",
  },

  websocketStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  websocketDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },

  websocketText: {
    fontSize: 12,
    fontWeight: "500",
  },

  list: {
    padding: 15,
  },

  userCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  userInfo: {
    flex: 1,
  },

  username: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#050505",
  },

  email: {
    marginTop: 5,
    fontSize: 14,
    color: "#65676b",
  },

  userId: {
    marginTop: 4,
    fontSize: 12,
    color: "#999",
  },

  role: {
    marginTop: 6,
    fontSize: 13,
    color: "#555",
  },

  rightContainer: {
    alignItems: "flex-end",
    marginLeft: 10,
  },

  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 6,
  },

  statusText: {
    fontSize: 13,
    fontWeight: "500",
  },

  lockStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },

  lockStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },

  lockStatusText: {
    fontSize: 12,
    fontWeight: "500",
  },

  adminText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#5865F2",
  },

  lockButton: {
    backgroundColor: "#ff3b30",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 7,
  },

  unlockButton: {
    backgroundColor: "#31a24c",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 7,
  },

  buttonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },

  lockInputContainer: {
    alignItems: "flex-end",
  },

  lockInput: {
    width: 80,
    height: 38,
    backgroundColor: "#f0f2f5",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 7,
    paddingHorizontal: 10,
    color: "#050505",
    textAlign: "center",
  },

  secondsText: {
    fontSize: 11,
    color: "#666",
    marginTop: 3,
    marginBottom: 5,
  },

  inputButtons: {
    flexDirection: "row",
    alignItems: "center",
  },

  confirmButton: {
    backgroundColor: "#ff3b30",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    marginRight: 5,
    minWidth: 48,
    alignItems: "center",
  },

  cancelButton: {
    backgroundColor: "#e4e6eb",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },

  cancelButtonText: {
    color: "#333",
    fontSize: 12,
    fontWeight: "bold",
  },

  logoutButton: {
    backgroundColor: "#ff3b30",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    marginLeft: 10,
  },

  logoutText: {
    color: "#fff",
    fontWeight: "bold",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 10,
    color: "#666",
  },

  emptyText: {
    textAlign: "center",
    marginTop: 30,
    color: "#888",
    fontSize: 16,
  },
});
