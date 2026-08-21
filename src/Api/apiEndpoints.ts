export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    LOGOUT: '/api/v1/auth/logout',
  },
  USERS: {
    CREATE: '/api/v1/users',
    MY_INFO: '/api/v1/users',
    SEARCH: '/api/v1/users/search',
  },
  CONVERSATIONS: {
    CREATE: '/api/v1/conversations',
    MY_CONVERSATIONS: '/api/v1/my-conversations',
  },
  MESSAGES: {
    SEND: '/api/v1/chat-messages',
    GET_BY_CONVERSATION: (conversationId: string) => 
      `/api/v1/${conversationId}/messages`,
  },
} as const;