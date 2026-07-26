import React from 'react';
import Breadcrumbs from '../../components/Breadcrumbs';
import './privacy-policy.css';

const PrivacyPolicy: React.FC = () => (
  <main className='privacy-page'>
    <Breadcrumbs currentPage='Политика конфиденциальности' />
    <section className='privacy-content'>
      <p className='privacy-eyebrow'>BauTex Design</p>
      <h1>Политика конфиденциальности</h1>
      <p>
        Мы используем данные только для обработки заявок, заказов, отзывов и обратной связи по
        вопросам подбора обоев.
      </p>

      <div className='privacy-grid'>
        <article>
          <h2>Какие данные собираем</h2>
          <p>
            Имя, телефон, email, город, состав корзины, комментарий к заказу или отзыву, а также
            технические данные, необходимые для работы сайта.
          </p>
        </article>
        <article>
          <h2>Зачем они нужны</h2>
          <p>
            Чтобы связаться с вами, уточнить наличие, рассчитать доставку, сохранить избранное,
            корзину и историю обращений в личном кабинете.
          </p>
        </article>
        <article>
          <h2>Передача третьим лицам</h2>
          <p>
            Данные могут передаваться только сервисам, которые помогают выполнить заказ: доставке,
            платежным и техническим подрядчикам.
          </p>
        </article>
        <article>
          <h2>Как управлять данными</h2>
          <p>
            Вы можете запросить удаление или уточнение данных, написав на{' '}
            <a href='https://mail.google.com/mail/?view=cm&fs=1&to=design@bautex.ru'>
              design@bautex.ru
            </a>
            .
          </p>
        </article>
      </div>
    </section>
  </main>
);

export default PrivacyPolicy;
