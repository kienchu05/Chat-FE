import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    const emailValue = email.trim();

    if (!emailValue) {
      Alert.alert("Lỗi", "Vui lòng nhập email.");
      return;
    }

    try {
      setLoading(true);

      const response = await axiosClient.post(
        "/api/v1/passwd/forgot-password",
        {
          email: emailValue,
        },
      );

      console.log("FORGOT PASSWORD:", response.data);

      Alert.alert("Thành công", "Mã xác nhận đã được gửi đến email của bạn.", [
        {
          text: "Tiếp tục",
          onPress: () => {
            router.replace({
              pathname: "/Password/verify-otp",
              params: {
                email: emailValue,
              },
            });
          },
        },
      ]);
    } catch (error: any) {
      console.error("Lỗi forgot password:", error.response?.data || error);

      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể gửi mã xác nhận.",
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
            <Ionicons name="lock-closed-outline" size={40} color="#0084ff" />
          </View>

          <Text style={styles.title}>Quên mật khẩu?</Text>

          <Text style={styles.description}>
            Nhập email đã đăng ký. Chúng tôi sẽ gửi mã xác nhận đến email của
            bạn.
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#8e8e93" />

            <TextInput
              style={styles.input}
              placeholder="Nhập email"
              placeholderTextColor="#8e8e93"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleForgotPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Gửi mã xác nhận</Text>
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
    lineHeight: 22,
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
    marginTop: 20,
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
