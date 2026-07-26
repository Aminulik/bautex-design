import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAiChatStore } from '../../store/aiChatStore';
import { ChatMessage } from '../chatPage/ChatMessage';
import { MessageInput } from '../chatPage/MessageInput';
import './ChatWidget.css';

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, isLoading, expectsPhone, sendMessage, loadHistory } = useAiChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const recentMessages = messages.slice(-4);

  return (
    <>
      <button
        type='button'
        className={`chat-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((value) => !value)}
        aria-label={isOpen ? 'Закрыть чат' : 'Открыть чат'}
      >
        {isOpen ? '×' : '✦'}
      </button>

      {isOpen && (
        <div className='chat-widget'>
          <div className='widget-header'>
            <div>
              <span className='widget-eyebrow'>BauTex Design</span>
              <h3>Помощник по обоям</h3>
            </div>
            <button type='button' onClick={() => setIsOpen(false)} aria-label='Закрыть чат'>
              ×
            </button>
          </div>
          <div className='widget-messages'>
            {recentMessages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <ChatMessage message={{ id: 'typing', sender: 'ai', text: 'Печатает...' }} />
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className='widget-footer'>
            <MessageInput
              onSendMessage={(text) => sendMessage(text)}
              isLoading={isLoading}
              phoneMode={expectsPhone}
            />
            <button
              type='button'
              className='full-chat-button'
              onClick={() => {
                setIsOpen(false);
                navigate('/ai-chat');
              }}
            >
              Открыть полный чат
            </button>
          </div>
        </div>
      )}
    </>
  );
};
