import React from 'react';
import OrderForm from '../../components/OrderForm';
import LocationMap from '../../components/LocationMap';
import './where-to-buy.css';
import Breadcrumbs from '../../components/Breadcrumbs';

const WhereToBuy: React.FC = () => {
  return (
    <div className='where-to-buy-page'>
      <div className='container'>
        <Breadcrumbs currentPage='Купить' />

        <div className='content-wrapper'>
          <div className='order-section'>
            <h2>Оформить заказ</h2>
            <p className='order-description'>
              Заполните форму ниже, и наш менеджер свяжется с вами для уточнения деталей заказа и
              способа доставки. Мы работаем по всей России и готовы помочь вам с выбором
              оптимального решения.
            </p>
            <OrderForm />
          </div>
          <div className='locations-section'>
            <LocationMap />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhereToBuy;
