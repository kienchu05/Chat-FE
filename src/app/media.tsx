import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import axiosClient from "../Api/services/axiosClient";

interface MessageMedia {
  fileName: string;
  fileType: string;
  thumbnailUrl: string;
  uploadedAt?: string;
}

interface MediaMessage {
  id: string;
  conversationId: string;
  messageType: string;
  senderId: string;
  senderName: string;
  messageMedia: MessageMedia[];
}

export default function MediaScreen() {
  const router = useRouter();

  const { conversationId } = useLocalSearchParams<{
    conversationId?: string;
  }>();

  const [media, setMedia] = useState<MessageMedia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (conversationId) {
      fetchMedia();
    }
  }, [conversationId]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/api/v1/${conversationId}/media`);

      console.log("MEDIA:", response.data);

      const messages: MediaMessage[] = response.data?.data || [];

      const mediaArrays = messages.map((message) => message.messageMedia || []);
      console.log("ALL MEDIA:", mediaArrays);

      setMedia(mediaArrays.flat()); // làm phẳng mảng các mảng media thành một mảng duy nhất
    } catch (error) {
      console.error("Lỗi tải media:", error);
    } finally {
      setLoading(false);
    }
  };

  const isVideo = (item: MessageMedia) => {
    return item.fileType?.startsWith("video/");
  };

  const renderMedia = ({ item }: { item: MessageMedia }) => {
    return (
      <TouchableOpacity style={styles.mediaItem}>
        <Image
          source={{ uri: item.thumbnailUrl }}
          style={styles.image}
          resizeMode="cover"
        />

        {isVideo(item) && (
          <View style={styles.videoIcon}>
            <Ionicons name="play-circle" size={36} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0084ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={25} color="#222" />
        </TouchableOpacity>

        <Text style={styles.title}>Media</Text>
      </View>

      {/* MEDIA */}
      {media.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="images-outline" size={60} color="#aaa" />

          <Text style={styles.emptyText}>Chưa có media</Text>
        </View>
      ) : (
        <FlatList
          data={media}
          keyExtractor={(item, index) => `${item.fileName}-${index}`}
          renderItem={renderMedia}
          numColumns={3}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  backButton: {
    padding: 16,
  },

  title: {
    fontSize: 20,
    fontWeight: "600",
  },

  list: {
    padding: 2,
  },

  row: {
    gap: 2,
  },

  mediaItem: {
    width: "33%",
    aspectRatio: 1,
    position: "relative",
    marginBottom: 2,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  videoIcon: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyText: {
    marginTop: 10,
    color: "#888",
    fontSize: 16,
  },
});
