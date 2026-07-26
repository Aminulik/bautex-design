import React from 'react';
import '../styles/StaticDemoNotice.css';

// Ссылка на исходники — показывается в плашке демо-режима.
const REPO_URL = 'https://github.com/Aminulik/bautex-design';

/**
 * Статическая сборка (GitHub Pages) отдаётся без Express и ML-сервиса,
 * поэтому всё, что ходит в /api, работать не может.
 * Флаг STATIC_DEMO выставляет webpack: production-сборка без REACT_APP_API_URL.
 * Как только бэкенд появится и адрес будет задан, плашка исчезнет сама.
 */
export const isStaticDemo = Boolean(process.env.STATIC_DEMO);

interface Props {
  /**
   * Что именно не работает, например «Визуализация обоев».
   * Подставляется в заголовок без согласования по роду,
   * поэтому формулировка заголовка нейтральная.
   */
  feature: string;
  /** Чем это заменить прямо сейчас, если замена есть. */
  hint?: string;
}

const StaticDemoNotice: React.FC<Props> = ({ feature, hint }) => {
  if (!isStaticDemo) return null;

  return (
    <aside className='static-demo-notice' role='note'>
      <p className='static-demo-notice__title'>{feature} — нужен запущенный сервер</p>
      <p className='static-demo-notice__text'>
        Это витрина проекта на GitHub Pages — она статическая, без бэкенда и ML-сервиса. Каталог,
        коллекции, избранное и справочные страницы работают полностью; вход, заказы, AI-чат и
        визуализация обоев требуют запущенного Express и FastAPI.
      </p>
      {hint && <p className='static-demo-notice__text'>{hint}</p>}
      <p className='static-demo-notice__text'>
        Полная версия поднимается одной командой <code>npm run demo:up</code> из{' '}
        <a href={REPO_URL} target='_blank' rel='noreferrer'>
          исходников на GitHub
        </a>
        .
      </p>
    </aside>
  );
};

export default StaticDemoNotice;
