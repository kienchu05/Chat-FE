import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Khởi tạo instance của Axios
const axiosClient = axios.create({
  baseURL: 'http://10.0.2.2:8080', // Thay đổi tùy theo IP máy ảo/máy thật của bạn
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// INTERCEPTOR: Can thiệp vào mọi request trước khi gửi đi
axiosClient.interceptors.request.use(
  async (config) => {
    try {
      // Lấy token từ bộ nhớ thiết bị
      const token = await AsyncStorage.getItem('accessToken');
      
      // Nếu có token, đính kèm vào header Authorization
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Lỗi khi lấy token từ AsyncStorage:', error);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// (Tùy chọn) Interceptor xử lý response lỗi chung
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Nếu API trả về 401 ở bất kỳ đâu, có thể do token hết hạn -> xử lý đăng xuất tại đây
    if (error.response?.status === 401) {
      console.log('Token không hợp lệ hoặc đã hết hạn!');
      // router.replace('/login'); // Tương lai có thể thêm logic tự động đẩy về trang đăng nhập
    }
    return Promise.reject(error);
  }
);

export default axiosClient;