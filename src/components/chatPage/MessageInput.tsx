import React, { useState } from 'react';
import { FaPaperPlane } from 'react-icons/fa';
import styles from './MessageInput.module.css';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  phoneMode?: boolean;
}

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').replace(/^8/, '7').slice(0, 11);
  const normalized = digits.startsWith('7') ? digits.slice(1) : digits;

  let result = '+7';
  if (normalized.length > 0) result += ` (${normalized.slice(0, 3)}`;
  if (normalized.length >= 3) result += ')';
  if (normalized.length > 3) result += ` ${normalized.slice(3, 6)}`;
  if (normalized.length > 6) result += `-${normalized.slice(6, 8)}`;
  if (normalized.length > 8) result += `-${normalized.slice(8, 10)}`;
  return result;
};

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  isLoading,
  phoneMode = false,
}) => {
  const [text, setText] = useState('');

  const handleSendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim() || isLoading) return;
    onSendMessage(text.trim());
    setText('');
  };

  const handleChange = (value: string) => {
    setText(phoneMode ? formatPhone(value) : value);
  };

  return (
    <form className={styles['message-input-form']} onSubmit={handleSendMessage}>
      <input
        type={phoneMode ? 'tel' : 'text'}
        className={styles['message-input-field']}
        placeholder={phoneMode ? '+7 (___) ___-__-__' : 'Введите сообщение...'}
        value={text}
        onChange={(event) => handleChange(event.target.value)}
        disabled={isLoading}
        autoComplete='off'
        inputMode={phoneMode ? 'tel' : 'text'}
      />
      <button
        type='submit'
        className={`${styles['icon-button']} ${styles['send-button']}`}
        disabled={isLoading || !text.trim()}
        aria-label='Отправить сообщение'
      >
        <FaPaperPlane size={18} />
      </button>
    </form>
  );
};
