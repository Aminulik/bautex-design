import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import '../styles/DevNoticeModal.css';

interface Props {
  onClose: () => void;
}

const DevNoticeModal: React.FC<Props> = ({ onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return createPortal(
    <div className='dev-modal-overlay' onClick={onClose}>
      <div className='dev-modal-content' onClick={(e) => e.stopPropagation()}>
        <button className='dev-modal-close' onClick={onClose}>
          ×
        </button>
        <h3>Страница в разработке</h3>
        <p>Мы приносим свои извинения за временные неудобства.</p>
      </div>
    </div>,
    document.body
  );
};

export default DevNoticeModal;
