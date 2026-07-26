import React from 'react';
import Markdown from 'react-markdown';
import { FaRobot, FaUser } from 'react-icons/fa';
import type { Message } from '../../types/chat';
import styles from './ChatMessage.module.css';

interface ChatMessageProps {
  message: Message;
  senderDisplayName?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, senderDisplayName }) => {
  const isUser = message.sender === 'user';
  const cleanMessageContent = (text: string) =>
    text.replace(/^( {4,})(?![-*+] |\d+\.)/gm, '').replace(/^\s+$/gm, '');

  return (
    <div className={`${styles['message-container']} ${isUser ? styles.user : styles.ai}`}>
      <div className={styles.avatar}>
        {isUser || senderDisplayName ? <FaUser size={18} /> : <FaRobot size={18} />}
      </div>
      <div className={styles['message-content']}>
        <p className={styles['sender-name']}>
          {isUser ? 'Вы' : senderDisplayName || 'Помощник BauTex'}
        </p>
        <div className={styles.bubble}>
          <Markdown>{cleanMessageContent(message.text)}</Markdown>
        </div>
      </div>
    </div>
  );
};
