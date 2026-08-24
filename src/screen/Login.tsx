import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import axiosClient from '../Api/services/axiosClient';

import { router } from '../../.expo/types/router';
export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    Alert.alert('Thông báo', 'Đang xử lý đăng nhập...');
    console.log("1. Đã bấm nút đăng nhập với:", username, password);

    if (!username || !password) {
      console.log("2. Bị kẹt ở điều kiện: Thiếu tài khoản hoặc mật khẩu");
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ tài khoản và mật khẩu!');
      return;
    }

    try {
      setLoading(true);
      console.log("3. Đang gọi API tới Spring Boot...");
      
      const response = await axiosClient.post('/api/v1/auth/login', {
        username,
        password,
      });
      console.log("Dữ liệu gửi lên server:", { username, password });
      console.log("4. API trả về thành công:", response.data);

      const token = response.data.accessToken;

      if (token) {
        console.log("5. Đã tìm thấy token, chuẩn bị lưu và chuyển trang");
        await AsyncStorage.setItem('accessToken', token);
        Alert.alert('Thành công', 'Đăng nhập thành công!');
        router.replace('/chat'); 
      } else {
        console.log("6. Lỗi: Không tìm thấy trường accessToken trong response");
        Alert.alert('Lỗi', 'Không nhận được accessToken từ hệ thống.');
      }
    } catch (error: any) {
      console.log("7. Bắt được lỗi trong catch:", error);
      Alert.alert('Đăng nhập thất bại', error.response?.data?.message || 'Sai tài khoản hoặc mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
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
            value={username}
            onChangeText={setUsername}
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
              {loading ? 'Đang xử lý...' : 'Đăng Nhập'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Phần PHẦN ĐĂNG KÝ (Chuyển hướng) */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Bạn chưa có tài khoản? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
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
    backgroundColor: '#1e1e24', // Tông màu tối giao diện chat hiện đại
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#5865F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 36,
  },
  appName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  formContainer: {
    width: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'left',
  },
  input: {
    height: 50,
    backgroundColor: '#2a2a35',
    color: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#3a3a48',
  },
  loginButton: {
    height: 50,
    backgroundColor: '#5865F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  registerText: {
    color: '#aaa',
    fontSize: 14,
  },
  registerLink: {
    color: '#5865F2',
    fontSize: 14,
    fontWeight: 'bold',
  },
});