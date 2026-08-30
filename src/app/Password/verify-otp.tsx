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

export default function VerifyOtpScreen() {
  const { email } = useLocalSearchParams<{
    email: string;
  }>();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerifyOtp = async () => {
    const otpValue = otp.trim();

    if (!otpValue) {
      Alert.alert("Lỗi", "Vui lòng nhập mã OTP.");
      return;
    }

    if (otpValue.length !== 6) {
      Alert.alert("Lỗi", "Mã OTP phải gồm 6 chữ số.");
      return;
    }

    try {
      setLoading(true);

      const response = await axiosClient.post("/api/v1/passwd/verify-otp", {
        email,
        otp: otpValue,
      });

      console.log("VERIFY OTP:", response.data);

      Alert.alert(
        "Xác thực thành công",
        "Mã OTP chính xác. Bạn có thể tạo mật khẩu mới.",
        [
          {
            text: "Tiếp tục",
            onPress: () => {
              router.replace({
                pathname: "/Password/reset-password",
                params: {
                  email,
                },
              });
            },
          },
        ],
      );
    } catch (error: any) {
      console.error("Lỗi verify OTP:", error.response?.data || error);

      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Mã OTP không chính xác.",
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
            <Ionicons name="mail-outline" size={40} color="#0084ff" />
          </View>

          <Text style={styles.title}>Xác nhận mã OTP</Text>

          <Text style={styles.description}>
            Nhập mã 6 chữ số đã được gửi đến
          </Text>

          <Text style={styles.email}>{email}</Text>

          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={(text) => {
              const value = text.replace(/[^0-9]/g, "").slice(0, 6);

              setOtp(value);
            }}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor="#aaa"
            textAlign="center"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerifyOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Xác nhận</Text>
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
    marginTop: 12,
  },

  email: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#050505",
    textAlign: "center",
    marginTop: 5,
    marginBottom: 25,
  },

  otpInput: {
    height: 60,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 8,
    color: "#050505",
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
