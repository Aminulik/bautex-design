import React from 'react';
import styles from './ChatList.module.css';

interface ConversationPreview {
  id: string;
  partnerName: string;
  partnerCompany: string;
  lastMessage: string;
  timestamp: string;
  avatarUrl: string;
}

interface ChatListProps {
  conversations: ConversationPreview[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  conversations,
  activeChatId,
  onSelectChat,
}) => {
  return (
    <aside className={styles['chat-list-sidebar']} data-hidden={!!activeChatId}>
      <header className={styles['sidebar-header']}>
        <h2>Все чаты</h2>
      </header>

      <div className={styles['chat-items-container']}>
        {conversations.map((convo) => (
          <div
            key={convo.id}
            className={`${styles['chat-item']} ${convo.id === activeChatId ? styles['active'] : ''}`}
            onClick={() => onSelectChat(convo.id)}
          >
            <img src={convo.avatarUrl} alt={convo.partnerName} className={styles['avatar']} />

            <div className={styles['chat-details']}>
              <div className={styles['chat-header']}>
                <span className={styles['partner-name']}>{convo.partnerName}</span>
                <span className={styles['timestamp']}>{convo.timestamp}</span>
              </div>

              <p className={styles['last-message']}>{convo.lastMessage}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
