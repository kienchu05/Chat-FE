import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import axiosClient from "../Api/services/axiosClient";

interface MyJwtPayload {
  sub: string;
  roles: string[];
}

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Thông báo", "Vui lòng nhập đầy đủ email và mật khẩu!");
      return;
    }
    try {
      setLoading(true);
      // Gọi API đăng nhập tới Spring Boot
      const response = await axiosClient.post("/api/v1/auth/login", {
        email,
        password,
      });
      console.log("Dữ liệu gửi lên server:", { email, password });
      const token = response.data.data.accessToken;
      console.log("Token nhận được từ API:", token);

      if (token) {
        // 1. Lưu accessToken
        await AsyncStorage.setItem("accessToken", token);
        // 2. Đọc thông tin trong JWT
        const decoded = jwtDecode<MyJwtPayload>(token);
        console.log("JWT:", decoded);
        console.log("ROLE:", decoded.roles);

        // 3. Kiểm tra role
        if (decoded.roles?.includes("ADMIN_ROLE")) {
          Alert.alert("Thành công", "Đăng nhập với quyền Admin!");
          router.replace("../Admin/page");
        } else {
          Alert.alert("Thành công", "Đăng nhập thành công!");
          router.replace("/home");
        }
      } else {
        Alert.alert("Lỗi", "Không nhận được token từ hệ thống.");
      }
    } catch (error: any) {
      console.error("Lỗi đăng nhập:", error);
      Alert.alert(
        "Đăng nhập thất bại",
        error.response?.data?.message || "Sai tài khoản hoặc mật khẩu",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Phần LOGO */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>💬</Text>
          </View>
          <Text style={styles.appName}>ChatOnline</Text>
        </View>

        {/* Phần PHẦN ĐĂNG NHẬP (Form) */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>Đăng Nhập</Text>

          <TextInput
            style={styles.input}
            placeholder="Tên tài khoản hoặc Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Mật khẩu"
            placeholderTextColor="#888"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? "Đang xử lý..." : "Đăng Nhập"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/Password/forgot-password")}
          >
            <Text style={styles.forgotPassword}>Quên mật khẩu?</Text>
          </TouchableOpacity>
        </View>

        {/* Phần PHẦN ĐĂNG KÝ (Chuyển hướng) */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Bạn chưa có tài khoản? </Text>
          <TouchableOpacity onPress={() => router.push("/register")}>
            <Text style={styles.registerLink}>Đăng ký ngay</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e1e24", // Tông màu tối giao diện chat hiện đại
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#5865F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  logoText: {
    fontSize: 36,
  },
  appName: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#ffffff",
  },
  formContainer: {
    width: "100%",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 20,
    textAlign: "left",
  },
  input: {
    height: 50,
    backgroundColor: "#2a2a35",
    color: "#ffffff",
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#3a3a48",
  },
  loginButton: {
    height: 50,
    backgroundColor: "#5865F2",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginTop: 8,
  },
  loginButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },
  registerText: {
    color: "#aaa",
    fontSize: 14,
  },
  registerLink: {
    color: "#5865F2",
    fontSize: 14,
    fontWeight: "bold",
  },
  forgotPassword: {
    color: "#0084ff",
    textAlign: "right",
    marginTop: 10,
    fontSize: 14,
    fontWeight: "500",
  },
});
