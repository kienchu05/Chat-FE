import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import axiosClient from "../../Api/services/axiosClient";

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams<{
    email: string;
  }>();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!newPassword) {
      Alert.alert("Lỗi", "Vui lòng nhập mật khẩu mới.");
      return;
    }

    if (!confirmPassword) {
      Alert.alert("Lỗi", "Vui lòng nhập lại mật khẩu.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu nhập lại không khớp.");
      return;
    }

    try {
      setLoading(true);

      const response = await axiosClient.post("/api/v1/passwd/reset-password", {
        email,
        newPassword,
      });

      console.log("RESET PASSWORD:", response.data);

      Alert.alert("Thành công", "Mật khẩu của bạn đã được thay đổi.", [
        {
          text: "Đăng nhập",
          onPress: () => router.replace("/"),
        },
      ]);
    } catch (error: any) {
      console.log("===== RESET PASSWORD ERROR =====");
      console.log("status:", error.response?.status);
      console.log("data:", error.response?.data);
      console.log("headers:", error.response?.headers);
      console.log("message:", error.message);
      console.log("request:", error.request);

      Alert.alert(
        "Lỗi",
        error.response?.data?.message ||
          error.response?.data?.error ||
          `Không thể đổi mật khẩu. Mã lỗi: ${error.response?.status || "unknown"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#050505" />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Ionicons name="key-outline" size={40} color="#0084ff" />
          </View>

          <Text style={styles.title}>Tạo mật khẩu mới</Text>

          <Text style={styles.description}>
            Nhập mật khẩu mới cho tài khoản của bạn.
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#8e8e93" />

            <TextInput
              style={styles.input}
              placeholder="Mật khẩu mới"
              placeholderTextColor="#8e8e93"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
            />

            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="#8e8e93"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#8e8e93" />

            <TextInput
              style={styles.input}
              placeholder="Nhập lại mật khẩu"
              placeholderTextColor="#8e8e93"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />

            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="#8e8e93"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Đổi mật khẩu</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  keyboard: {
    flex: 1,
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },

  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#eaf4ff",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 40,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#050505",
    textAlign: "center",
    marginTop: 20,
  },

  description: {
    fontSize: 15,
    color: "#65676b",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 30,
  },

  inputContainer: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f2f5",
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: "#050505",
    marginLeft: 10,
  },

  button: {
    height: 50,
    backgroundColor: "#0084ff",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
