// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { Client, IMessage, StompSubscription } from "@stomp/stompjs";

// class WebSocketService {
//   private client: Client | null = null;

//   async connect(onConnected?: () => void) {
//     const token = await AsyncStorage.getItem("accessToken");

//     if (!token) {
//       console.log("Không tìm thấy accessToken");
//       return;
//     }

//     this.client = new Client({
//       brokerURL: "ws://10.0.2.2:8080/ws",

//       connectHeaders: {
//         Authorization: `Bearer ${token}`,
//       },

//       forceBinaryWSFrames: true,
//       appendMissingNULLonIncoming: true,

//       reconnectDelay: 5000,

//       onConnect: () => {
//         console.log("STOMP connected");
//         onConnected?.();
//       },

//       onDisconnect: () => {
//         console.log("STOMP disconnected");
//       },

//       onStompError: (frame) => {
//         console.error("STOMP error:", frame.headers["message"], frame.body);
//       },

//       onWebSocketError: (error) => {
//         console.error("WebSocket error:", error);
//       },
//     });

//     this.client.activate();
//   }

//   subscribe(
//     destination: string,
//     callback: (data: any) => void,
//   ): StompSubscription | null {
//     if (!this.client || !this.client.connected) {
//       console.log("WebSocket chưa kết nối");
//       return null;
//     }

//     return this.client.subscribe(destination, (message: IMessage) => {
//       try {
//         const data = JSON.parse(message.body);
//         callback(data);
//       } catch (error) {
//         console.error("Lỗi parse WebSocket message:", error);
//       }
//     });
//   }

//   disconnect() {
//     if (this.client) {
//       this.client.deactivate();
//       this.client = null;
//     }
//   }

//   get isConnected() {
//     return this.client?.connected ?? false;
//   }
// }

// export const websocketService = new WebSocketService();
