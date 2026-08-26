import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// Khởi tạo instance của Axios
const axiosClient = axios.create({
  baseURL: "http://10.0.2.2:8080",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// INTERCEPTOR: Can thiệp vào mọi request trước khi gửi đi
axiosClient.interceptors.request.use(
  async (config) => {
    try {
      // 1. Kiểm tra xem request này có phải là API công khai không (Đăng nhập / Đăng ký)
      const isPublicAPI =
        config.url?.includes("/auth/login") ||
        config.url?.includes("/auth/register");

      // 2. Nếu KHÔNG phải API công khai thì mới tiến hành lấy token đính kèm
      if (!isPublicAPI) {
        const token = await AsyncStorage.getItem("accessToken");
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } else {
        // Nếu là API login/register, đảm bảo xóa sạch header Authorization cũ (nếu có)
        if (config.headers) {
          delete config.headers.Authorization;
        }
      }
    } catch (error) {
      console.error("Lỗi trong request interceptor:", error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default axiosClient;
