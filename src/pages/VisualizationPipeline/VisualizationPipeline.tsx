import React from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../../components/Breadcrumbs';
import './VisualizationPipeline.css';

const steps = [
  {
    title: 'Фото комнаты',
    text: 'Пользователь загружает JPG, PNG или WEBP. Backend проверяет размер и формат файла.',
  },
  {
    title: 'SegFormer B0',
    text: 'Локальный FastAPI-сервис строит семантическую маску класса wall. Если ML недоступен, остается fallback.',
  },
  {
    title: 'Маска стены',
    text: 'Маска нормализуется, очищается и передается в Sharp как область, куда можно накладывать материал.',
  },
  {
    title: 'Обои и цвет',
    text: 'Выбранная текстура масштабируется под фото, окрашивается выбранным цветом и смешивается с исходным снимком.',
  },
  {
    title: 'Ручная коррекция',
    text: 'Если автоматика ошиблась, пользователь уточняет стену кистью и повторяет обработку по своей маске.',
  },
];

const VisualizationPipeline: React.FC = () => (
  <main>
    <Breadcrumbs currentPage='Как это работает' />
    <div className='pipeline-container'>
      <h1 className='pipeline-title'>Как работает визуализация</h1>
      <p className='pipeline-description'>
        Фото → SegFormer → маска → обои → коррекция. Краткая схема автоматического выделения стены и
        наложения жаккардовых обоев с выбранным цветом покраски.
      </p>

      <div className='pipeline-steps-grid'>
        {steps.map((step, index) => (
          <article key={step.title} className='pipeline-step-card'>
            <span className='pipeline-step-number'>0{index + 1}</span>
            <h2 className='pipeline-step-title'>{step.title}</h2>
            <p className='pipeline-step-text'>{step.text}</p>
          </article>
        ))}
      </div>

      <div className='pipeline-actions'>
        <Link to='/visualization' className='pipeline-button pipeline-button-primary'>
          Открыть визуализацию
        </Link>
        <Link to='/ml-metrics' className='pipeline-button pipeline-button-secondary'>
          Смотреть метрики ML
        </Link>
      </div>
    </div>
  </main>
);

export default VisualizationPipeline;
