import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ContactDetails() {
  const router = useRouter();

  const { username, conversationId, avatar } = useLocalSearchParams<{
    username?: string;
    conversationId?: string;
    avatar?: string;
  }>();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={25} color="#222" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Contact details</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar + username */}
        <View style={styles.profile}>
          <Image
            source={
              avatar ? { uri: avatar } : require("../assets/icon.png.webp")
            }
            style={styles.avatar}
          />

          <Text style={styles.username}>
            {username || "Người dùng ứng dụng"}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="call" size={25} color="#2196F3" />
            <Text style={styles.actionText}>audio</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="videocam" size={25} color="#2196F3" />
            <Text style={styles.actionText}>video</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              router.push({
                pathname: "/search-message",
                params: {
                  conversationId: conversationId,
                },
              });
            }}
          >
            <Ionicons name="search" size={24} color="#0084ff" />
            <Text>search</Text>
          </TouchableOpacity>
        </View>

        {/* Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information</Text>
        </View>

        {/* Media */}
        <TouchableOpacity
          style={styles.item}
          onPress={() => {
            router.push({
              pathname: "/media",
              params: {
                conversationId: conversationId,
              },
            });
          }}
        >
          <View style={styles.itemLeft}>
            <View style={styles.iconBox}>
              <Ionicons name="image" size={21} color="#2196F3" />
            </View>

            <Text style={styles.itemText}>Media</Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color="#aaa" />
        </TouchableOpacity>

        {/* Secret Chat */}
        <TouchableOpacity style={styles.item}>
          <View style={styles.itemLeft}>
            <Ionicons
              name="lock-closed-outline"
              size={21}
              color="#2196F3"
              style={{ marginLeft: 8 }}
            />

            <Text style={[styles.itemText, styles.blue]}>Secret Chat</Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color="#aaa" />
        </TouchableOpacity>

        {/* Block */}
        <View style={styles.dangerSection}>
          <TouchableOpacity style={styles.dangerItem}>
            <Text style={styles.dangerText}>Block</Text>

            <Ionicons name="chevron-forward" size={20} color="#aaa" />
          </TouchableOpacity>

          {/* Report */}
          <TouchableOpacity style={styles.dangerItem}>
            <Text style={styles.dangerText}>Report</Text>

            <Ionicons name="chevron-forward" size={20} color="#aaa" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    backgroundColor: "#f5f5f5",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "500",
    marginLeft: 25,
    color: "#222",
  },

  profile: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 35,
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 12,
  },

  username: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111",
  },

  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 35,
    marginBottom: 14,
  },

  actionButton: {
    width: 85,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  actionText: {
    color: "#2196F3",
    fontSize: 11,
    marginTop: 2,
  },

  section: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 10,
    height: 64,
    justifyContent: "center",
    paddingHorizontal: 18,
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 18,
    color: "#222",
  },

  item: {
    height: 58,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#e9f3ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  itemText: {
    fontSize: 16,
    color: "#222",
  },

  blue: {
    color: "#2196F3",
    marginLeft: 10,
  },

  dangerSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 10,
    overflow: "hidden",
  },

  dangerItem: {
    height: 58,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },

  dangerText: {
    color: "red",
    fontSize: 16,
  },
});
