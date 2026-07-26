import React, { useEffect, useRef } from 'react';
import { useAiChatStore } from '../../store/aiChatStore';
import { ChatMessage } from '../../components/chatPage/ChatMessage';
import { MessageInput } from '../../components/chatPage/MessageInput';
import Breadcrumbs from '../../components/Breadcrumbs';
import StaticDemoNotice from '../../components/StaticDemoNotice';
import styles from './AiChatPage.module.css';

export const AiChatPage: React.FC = () => {
  const { messages, isLoading, expectsPhone, sendMessage, loadHistory, clearChat } =
    useAiChatStore();
  const chatListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    chatListRef.current?.scrollTo({
      top: chatListRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isLoading]);

  return (
    <main className={styles.page}>
      <div className='container'>
        <Breadcrumbs currentPage='Помощник по обоям' />

        <StaticDemoNotice
          feature='AI-чат'
          hint='Ответы генерирует бэкенд: он ходит во внешние API по ключам из server/.env, поэтому в статической версии переписка не отправляется.'
        />

        <div className={styles['chat-layout']}>
          <section className={styles['chat-container']}>
            <div className={styles['chat-header']}>
              <span>Онлайн-консультация</span>
              <h1>Помощник по обоям</h1>
              <p>Задайте вопрос про выбор, поклейку, окрашивание или уход.</p>
              <button type='button' onClick={() => clearChat()}>
                Очистить
              </button>
            </div>

            <div className={styles['messages-list']} ref={chatListRef}>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isLoading && (
                <ChatMessage message={{ id: 'typing', sender: 'ai', text: 'Печатает...' }} />
              )}
            </div>

            <div className={styles['chat-footer']}>
              <MessageInput
                onSendMessage={(text) => sendMessage(text)}
                isLoading={isLoading}
                phoneMode={expectsPhone}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};
