import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login, register, clearError } from '../store/authSlice';
import type { AppDispatch, RootState } from '../store';
import StaticDemoNotice, { isStaticDemo } from './StaticDemoNotice';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isLogin) {
        await dispatch(login({ email, password })).unwrap();
      } else {
        await dispatch(register({ email, password, name })).unwrap();
      }
      onClose();
    } catch {
      // ошибка уже в state.error
    }
  };

  const handleClose = () => {
    dispatch(clearError());
    onClose();
  };

  const modal = (
    <div className='modal-overlay' onClick={handleClose}>
      <div className='review-form-container' onClick={(event) => event.stopPropagation()}>
        <button type='button' className='close-btn' onClick={handleClose} aria-label='Закрыть окно'>
          ×
        </button>

        <h3>{isLogin ? 'Вход' : 'Регистрация'}</h3>

        {isStaticDemo ? (
          <>
            <StaticDemoNotice feature='Авторизация' />
            <button type='button' className='submit-review-btn' onClick={handleClose}>
              Понятно
            </button>
          </>
        ) : (
          <>
            {error && <p className='privacy-policy'>{error}</p>}

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <input
                  type='text'
                  name='name'
                  placeholder='Ваше имя'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              )}

              <input
                type='email'
                name='email'
                placeholder='Email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <input
                type='password'
                name='password'
                placeholder='Пароль'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button type='submit' className='submit-review-btn' disabled={loading}>
                {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
              </button>
            </form>

            <button type='button' className='auth-switch-btn' onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default LoginModal;
