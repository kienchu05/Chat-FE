import AsyncStorage from "@react-native-async-storage/async-storage";
import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import { useEffect, useRef, useState } from "react";

interface PresenceEvent {
  userId: string;
  isOnline: boolean;
  lastOnlineAt: string | null;
}

export const useWebSocket = (
  onMessage?: (message: any) => void,
  onPresence?: (presence: PresenceEvent) => void,
) => {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);

  const messageSubRef = useRef<StompSubscription | null>(null);
  const presenceSubRef = useRef<StompSubscription | null>(null);

  const onMessageRef = useRef(onMessage);
  const onPresenceRef = useRef(onPresence);

  // Quan trọng:
  // true = đang chủ động disconnect
  const disconnectingRef = useRef(false);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onPresenceRef.current = onPresence;
  }, [onMessage, onPresence]);

  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      const token = await AsyncStorage.getItem("accessToken");
      // Component đã unmount trong lúc đang lấy token
      if (!mounted) {
        return;
      }
      if (!token) {
        console.log("WebSocket: Không có accessToken");
        return;
      }

      // Reset trạng thái disconnect
      disconnectingRef.current = false;

      const client = new Client({
        brokerURL: "ws://10.0.2.2:8080/ws",

        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        forceBinaryWSFrames: true,
        appendMissingNULLonIncoming: true,
        // Có reconnect nhưng chỉ khi chưa chủ động disconnect
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        debug: (str) => {
          console.log("STOMP:", str);
        },
      });
      // CONNECT
      client.onConnect = () => {
        if (!mounted || disconnectingRef.current) {
          return;
        }
        console.log("WebSocket: Connected");
        setConnected(true);
        // SUBSCRIBE MESSAGE
        messageSubRef.current = client.subscribe(
          "/user/queue/messages",
          (message: IMessage) => {
            if (!message.body) {
              return;
            }
            try {
              const data = JSON.parse(message.body);
              onMessageRef.current?.(data); //onMessage = handleNewMessage
            } catch (error) {
              console.error("WebSocket: Lỗi parse message:", error);
            }
          },
        );
        // SUBSCRIBE PRESENCE
        presenceSubRef.current = client.subscribe(
          "/topic/presence",
          (message: IMessage) => {
            if (!message.body) {
              return;
            }

            try {
              const presence: PresenceEvent = JSON.parse(message.body);
              console.log("Presence:", presence);
              onPresenceRef.current?.(presence); // = handlePresence(presence);
            } catch (error) {
              console.error("WebSocket: Lỗi parse presence:", error);
            }
          },
        );
      };
      // WEBSOCKET CLOSE
      client.onWebSocketClose = () => {
        console.log("WebSocket: Closed");
        if (mounted) {
          setConnected(false);
        }
      };
      // WEBSOCKET ERROR
      client.onWebSocketError = (error) => {
        // Nếu đang chủ động logout / cleanup
        // thì KHÔNG xem đây là lỗi
        if (disconnectingRef.current || !mounted) {
          console.log("WebSocket: Socket đóng chủ động");
          return;
        }

        console.error("WebSocket error:", error);
      };
      // STOMP ERROR
      client.onStompError = (frame) => {
        if (disconnectingRef.current || !mounted) {
          return;
        }

        console.error("STOMP error:", frame.headers["message"]);
        console.error("STOMP details:", frame.body);
      };

      clientRef.current = client;
      // ACTIVATE
      console.log("WebSocket: Bắt đầu connect...");
      client.activate();
    };

    connect();
    // CLEANUP
    return () => {
      console.log("WebSocket Hook: cleanup");
      // Đánh dấu trước khi deactivate
      // để onWebSocketError biết đây là
      // disconnect chủ động
      disconnectingRef.current = true;

      mounted = false;
      // Hủy subscription
      if (messageSubRef.current) {
        try {
          messageSubRef.current.unsubscribe();
        } catch (error) {
          console.log("WebSocket: Không thể unsubscribe message");
        }
        messageSubRef.current = null;
      }

      if (presenceSubRef.current) {
        try {
          presenceSubRef.current.unsubscribe();
        } catch (error) {
          console.log("WebSocket: Không thể unsubscribe presence");
        }
        presenceSubRef.current = null;
      }

      // Disconnect client
      if (clientRef.current) {
        console.log("WebSocket: Bắt đầu disconnect...");
        clientRef.current
          .deactivate()
          .then(() => {
            console.log("WebSocket: Disconnect hoàn tất");
          })
          .catch((error) => {
            // Đây cũng là disconnect chủ động
            console.log("WebSocket: Disconnect kết thúc", error);
          });
        clientRef.current = null;
      }
      setConnected(false);
    };
  }, []);

  return {
    connected,
  };
};
