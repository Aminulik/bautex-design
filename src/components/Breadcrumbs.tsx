import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/breadcrumbss.css'; // Создадим отдельный файл стилей

interface BreadcrumbsProps {
  currentPage: string;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ currentPage }) => {
  return (
    <div className='breadcrumb-container'>
      <Link to='/' className='breadcrumb-home'>
        Главная
      </Link>
      <div className='breadcrumb-separator'>
        <div className='breadcrumb-dot'></div>
        <div className='breadcrumb-line'></div>
        <div className='breadcrumb-dot'></div>
      </div>
      <span className='breadcrumb-current'>{currentPage}</span>
    </div>
  );
};

export default Breadcrumbs;
