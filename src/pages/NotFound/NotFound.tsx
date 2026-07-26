import React from 'react';
import { Link } from 'react-router-dom';
import './not-found.css';

const NotFound: React.FC = () => (
  <main className='not-found-page container'>
    <p className='not-found-code'>404</p>
    <h1>Такой страницы нет</h1>
    <p className='not-found-text'>
      Возможно, ссылка устарела или в адресе опечатка. Загляните в каталог — там все коллекции
      обоев.
    </p>
    <div className='not-found-actions'>
      <Link className='not-found-button' to='/'>
        На главную
      </Link>
      <Link className='not-found-button not-found-button--ghost' to='/catalog'>
        В каталог
      </Link>
    </div>
  </main>
);

export default NotFound;
