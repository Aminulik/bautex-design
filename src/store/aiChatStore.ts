import { create } from 'zustand';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp?: Date;
}

interface AiChatStore {
  messages: Message[];
  isLoading: boolean;
  expectsPhone: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => Promise<void>;
  loadHistory: () => Promise<void>;
}

interface ServerMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface AiChatResponse {
  reply?: string;
}

const welcomeMessage = (): Message => ({
  id: 'welcome',
  sender: 'ai',
  text: 'Здравствуйте! Я помощник BauTex Design. Помогу выбрать обои, разобраться с поклейкой, окрашиванием и уходом. Если ИИ не ответит, я попрошу телефон и передам вопрос менеджеру.',
  timestamp: new Date(),
});

const fallbackMessage = (): Message => ({
  id: `fallback-${Date.now()}`,
  sender: 'ai',
  text: 'Сейчас помощник не смог ответить. Оставьте номер телефона, и менеджер BauTex Design свяжется с вами в течение часа.',
  timestamp: new Date(),
});

const createUserMessage = (text: string): Message => ({
  id: `user-${Date.now()}`,
  sender: 'user',
  text,
  timestamp: new Date(),
});

const createAiMessage = (text: string): Message => ({
  id: `ai-${Date.now()}`,
  sender: 'ai',
  text,
  timestamp: new Date(),
});

const normalizePhone = (value: string) => value.replace(/\D/g, '');

const isValidPhone = (value: string) => {
  const digits = normalizePhone(value);
  return digits.length === 10 || (digits.length === 11 && ['7', '8'].includes(digits[0]));
};

export const useAiChatStore = create<AiChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  expectsPhone: false,

  loadHistory: async () => {
    if (get().messages.length > 0) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai_chat/history', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        set({ messages: [welcomeMessage()] });
        return;
      }

      const history = (await response.json()) as ServerMessage[];
      const formattedMessages: Message[] = history.map((msg) => ({
        id: msg.id,
        sender: msg.sender,
        text: msg.text,
        timestamp: new Date(msg.timestamp),
      }));

      set({ messages: formattedMessages.length > 0 ? formattedMessages : [welcomeMessage()] });
    } catch (error) {
      console.error('Error loading chat history:', error);
      set({ messages: [welcomeMessage()] });
    }
  },

  sendMessage: async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    const userMessage = createUserMessage(trimmedText);

    if (get().expectsPhone) {
      if (!isValidPhone(trimmedText)) {
        set((state) => ({
          messages: [
            ...state.messages,
            userMessage,
            createAiMessage('Введите, пожалуйста, телефон в формате +7 (999) 123-45-67.'),
          ],
          isLoading: false,
        }));
        return;
      }

      set((state) => ({
        messages: [
          ...state.messages,
          userMessage,
          createAiMessage('Спасибо! Номер передан менеджеру, скоро с вами свяжутся.'),
        ],
        expectsPhone: false,
        isLoading: false,
      }));
      return;
    }

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
    }));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai_chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: trimmedText }),
      });

      const data = (await response.json().catch(() => ({}))) as AiChatResponse;

      if (response.ok && data.reply) {
        set((state) => ({
          messages: [...state.messages, createAiMessage(data.reply || '')],
          isLoading: false,
        }));
        return;
      }

      set((state) => ({
        messages: [...state.messages, fallbackMessage()],
        isLoading: false,
        expectsPhone: true,
      }));
    } catch (error) {
      console.error('Error sending message:', error);
      set((state) => ({
        messages: [...state.messages, fallbackMessage()],
        isLoading: false,
        expectsPhone: true,
      }));
    }
  },

  clearChat: async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/ai_chat/clear', {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (error) {
      console.error('Error clearing chat:', error);
    }

    set({
      messages: [welcomeMessage()],
      isLoading: false,
      expectsPhone: false,
    });
  },
}));
