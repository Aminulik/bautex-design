import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { removeFromCart, updateCartQuantity } from '../store/cartSlice';
import type { CartItem } from '../store/cartSlice';
import StaticDemoNotice from './StaticDemoNotice';
import '../styles/order-form.css';

interface OrderFormData {
  name: string;
  phone: string;
  email: string;
  city: string;
  comment: string;
}

interface CartSelection {
  checked: boolean;
  quantity: number;
}

interface SelectedCartItem extends CartItem {
  selectedQuantity: number;
  checked: boolean;
}

const FREE_DELIVERY_CITIES = ['Москва', 'Санкт-Петербург', 'Владимир', 'Казань'];

const RUSSIAN_CITIES = [
  { name: 'Москва', region: 'Центральный' },
  { name: 'Санкт-Петербург', region: 'Северо-Западный' },
  { name: 'Владимир', region: 'Центральный' },
  { name: 'Гусь-Хрустальный', region: 'Центральный' },
  { name: 'Нижний Новгород', region: 'Приволжский' },
  { name: 'Казань', region: 'Приволжский' },
  { name: 'Новосибирск', region: 'Сибирский' },
  { name: 'Екатеринбург', region: 'Уральский' },
  { name: 'Челябинск', region: 'Уральский' },
  { name: 'Омск', region: 'Сибирский' },
  { name: 'Самара', region: 'Приволжский' },
  { name: 'Ростов-на-Дону', region: 'Южный' },
  { name: 'Уфа', region: 'Приволжский' },
  { name: 'Красноярск', region: 'Сибирский' },
  { name: 'Воронеж', region: 'Центральный' },
  { name: 'Пермь', region: 'Приволжский' },
  { name: 'Волгоград', region: 'Южный' },
].sort((a, b) => a.name.localeCompare(b.name));

const CITIES_BY_REGION = RUSSIAN_CITIES.reduce(
  (acc, city) => {
    if (!acc[city.region]) acc[city.region] = [];
    acc[city.region].push(city.name);
    return acc;
  },
  {} as Record<string, string[]>
);

const DELIVERY_COST = 99;
const API_URL = (process.env.API_BASE_URL || '/api') as string;

const cartKey = (item: CartItem) => `${item.productId}::${item.color}`;

const formatPrice = (price: number) => `${price.toLocaleString('ru-RU')} ₽`;

const formatPhone = (value: string) => {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('8')) digits = digits.slice(1);
  if (digits.startsWith('7')) digits = digits.slice(1);
  digits = digits.slice(0, 10);

  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)];

  if (!digits) return '';
  let result = '+7';
  if (parts[0]) result += ` (${parts[0]}`;
  if (parts[0].length === 3) result += ')';
  if (parts[1]) result += ` ${parts[1]}`;
  if (parts[2]) result += `-${parts[2]}`;
  if (parts[3]) result += `-${parts[3]}`;
  return result;
};

const OrderForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const [searchParams] = useSearchParams();
  const initialCity = searchParams.get('city') || '';

  const [formData, setFormData] = useState<OrderFormData>({
    name: '',
    phone: '',
    email: '',
    city: initialCity,
    comment: '',
  });
  const [selection, setSelection] = useState<Record<string, CartSelection>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    const cityFromUrl = searchParams.get('city');
    if (cityFromUrl) {
      setFormData((prev) => ({ ...prev, city: cityFromUrl }));
    }
  }, [searchParams]);

  useEffect(() => {
    setSelection((prev) => {
      const next = { ...prev };
      cartItems.forEach((item: CartItem) => {
        const key = cartKey(item);
        if (!next[key]) {
          next[key] = {
            checked: true,
            quantity: Math.max(1, Number(item.quantity || 1)),
          };
        }
      });

      Object.keys(next).forEach((key) => {
        if (!cartItems.some((item: CartItem) => cartKey(item) === key)) delete next[key];
      });

      return next;
    });
  }, [cartItems]);

  const handleRemoveItem = (productId: string, color: string) => {
    dispatch(removeFromCart({ productId, color }));
  };

  const selectedItems = useMemo(
    () =>
      cartItems
        .map(
          (item: CartItem): SelectedCartItem => ({
            ...item,
            selectedQuantity: selection[cartKey(item)]?.quantity || item.quantity || 1,
            checked: selection[cartKey(item)]?.checked ?? true,
          })
        )
        .filter((item: SelectedCartItem) => item.checked && item.selectedQuantity > 0),
    [cartItems, selection]
  );

  const orderSummary = useMemo(() => {
    const subtotal = selectedItems.reduce(
      (sum: number, item: SelectedCartItem) => sum + item.product.price * item.selectedQuantity,
      0
    );
    const totalQuantity = selectedItems.reduce(
      (sum: number, item: SelectedCartItem) => sum + item.selectedQuantity,
      0
    );
    const deliveryCost =
      formData.city &&
      FREE_DELIVERY_CITIES.some((city) => formData.city.toLowerCase().includes(city.toLowerCase()))
        ? 0
        : selectedItems.length
          ? DELIVERY_COST
          : 0;

    return {
      subtotal,
      deliveryCost,
      total: subtotal + deliveryCost,
      totalQuantity,
    };
  }, [formData.city, selectedItems]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'phone' ? formatPhone(value) : value,
    }));
  };

  const updateSelection = (key: string, patch: Partial<CartSelection>) => {
    setSelection((prev) => ({
      ...prev,
      [key]: {
        checked: prev[key]?.checked ?? true,
        quantity: prev[key]?.quantity ?? 1,
        ...patch,
      },
    }));
  };

  const validateForm = () => {
    const phoneDigits = formData.phone.replace(/\D/g, '');

    if (!formData.name || !formData.phone || !formData.email || !formData.city) {
      setSubmitStatus({
        type: 'error',
        message: 'Пожалуйста, заполните имя, телефон, email и город.',
      });
      return false;
    }

    if (phoneDigits.length !== 11) {
      setSubmitStatus({
        type: 'error',
        message: 'Введите корректный номер телефона в формате +7 (999) 999-99-99.',
      });
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setSubmitStatus({
        type: 'error',
        message: 'Пожалуйста, введите корректный email.',
      });
      return false;
    }

    if (!selectedItems.length) {
      setSubmitStatus({
        type: 'error',
        message: 'Выберите хотя бы один товар из корзины для оформления.',
      });
      return false;
    }

    return true;
  };

  const saveOrderLocally = () => {
    try {
      const existing = localStorage.getItem('myOrders');
      const parsed = existing ? JSON.parse(existing) : [];
      const newOrder = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        name: formData.name,
        email: formData.email,
        city: formData.city,
        items: selectedItems.map((item: SelectedCartItem) => ({
          productId: item.productId,
          name: item.product.name,
          code: item.product.code,
          color: item.color,
          quantity: item.selectedQuantity,
          price: item.product.price,
        })),
        quantity: orderSummary.totalQuantity,
        total: orderSummary.total,
      };
      localStorage.setItem('myOrders', JSON.stringify([newOrder, ...parsed].slice(0, 10)));
    } catch (storageError) {
      console.error('Failed to save order to localStorage', storageError);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    const payload = {
      ...formData,
      items: selectedItems.map((item: SelectedCartItem) => ({
        productId: item.productId,
        productName: item.product.name,
        code: item.product.code,
        color: item.color,
        quantity: item.selectedQuantity,
        price: item.product.price,
        total: item.product.price * item.selectedQuantity,
      })),
      orderSummary,
      fabricType: 'cart',
      color: selectedItems
        .map((item: CartItem) => `${item.product.name}: ${item.color}`)
        .join('; '),
      quantity: String(orderSummary.totalQuantity),
    };

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Order request failed');

      saveOrderLocally();
      setSubmitStatus({
        type: 'success',
        message: 'Заказ отправлен. Мы свяжемся с вами, чтобы уточнить детали и доставку.',
      });
    } catch (error) {
      console.error('Order submission error:', error);
      setSubmitStatus({
        type: 'error',
        message: 'Не удалось отправить заказ. Проверьте соединение и попробуйте еще раз.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetOrderForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      city: '',
      comment: '',
    });
    setSubmitStatus({ type: null, message: '' });
    setIsPaymentModalOpen(false);
  };

  return (
    <div className='order-form-container' id='order-form'>
      <StaticDemoNotice
        feature='Оформление заказа'
        hint='Заявка сохраняется в базу на стороне Express и попадает в админ-панель, поэтому в статической версии отправить её некуда. Корзину при этом можно собрать — она хранится в браузере.'
      />
      <form onSubmit={handleSubmit} className='order-form'>
        <div className='form-grid'>
          <div className='form-group'>
            <label htmlFor='name'>
              Имя <span className='required'>*</span>
            </label>
            <input
              type='text'
              id='name'
              name='name'
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className='form-group'>
            <label htmlFor='phone'>
              Телефон <span className='required'>*</span>
            </label>
            <input
              type='tel'
              id='phone'
              name='phone'
              value={formData.phone}
              onChange={handleChange}
              inputMode='numeric'
              placeholder='+7 (___) ___-__-__'
              required
            />
          </div>
          <div className='form-group'>
            <label htmlFor='email'>
              Email <span className='required'>*</span>
            </label>
            <input
              type='email'
              id='email'
              name='email'
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className='form-group'>
            <label htmlFor='city'>
              Город <span className='required'>*</span>
            </label>
            <select id='city' name='city' value={formData.city} onChange={handleChange} required>
              <option value=''>Выберите город</option>
              {Object.entries(CITIES_BY_REGION).map(([region, cities]) => (
                <optgroup key={region} label={region}>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city} {FREE_DELIVERY_CITIES.includes(city) ? '(бесплатная доставка)' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {formData.city && (
              <small className='city-hint'>
                {FREE_DELIVERY_CITIES.includes(formData.city)
                  ? 'Бесплатная доставка'
                  : `Доставка: ${formatPrice(DELIVERY_COST)}`}
              </small>
            )}
          </div>
        </div>

        <section className='cart-order-picker'>
          <div className='cart-order-heading'>
            <h3>Товары из корзины</h3>
            <p>Отметьте ткани, которые точно включаем в заказ, и уточните количество.</p>
          </div>

          {cartItems.length ? (
            <div className='cart-order-strip' aria-label='Товары в корзине'>
              {cartItems.map((item: CartItem) => {
                const key = cartKey(item);
                const current = selection[key] || { checked: true, quantity: item.quantity || 1 };

                return (
                  <article
                    key={key}
                    className={`cart-order-card ${current.checked ? 'selected' : ''}`}
                  >
                    <button
                      type='button'
                      className='cart-order-remove'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveItem(item.productId, item.color);
                      }}
                      title='Удалить из корзины'
                    >
                      ×
                    </button>
                    <label className='cart-order-check'>
                      <input
                        type='checkbox'
                        checked={current.checked}
                        onChange={(event) =>
                          updateSelection(key, { checked: event.target.checked })
                        }
                      />
                      <span>{current.checked ? 'В заказе' : 'Не включать'}</span>
                    </label>
                    <div className='cart-order-image'>
                      <img src={item.product.image} alt={item.product.name} />
                      <span
                        className='cart-preview-color-overlay'
                        style={{
                          backgroundColor:
                            item.product.colors?.find((c) => c.name === item.color)?.hex ||
                            '#d8c3a5',
                          opacity:
                            item.product.colors?.find((c) => c.name === item.color)?.intensity ||
                            0.35,
                        }}
                      />
                    </div>
                    <p className='cart-order-code'>{item.product.code}</p>
                    <h4>{item.product.name}</h4>
                    <p className='cart-order-color'>{item.color}</p>
                    <div className='cart-order-quantity'>
                      <span>Количество</span>
                      <input
                        type='number'
                        min='1'
                        max='99'
                        value={current.quantity}
                        onChange={(event) => {
                          const newQuantity = Math.max(
                            1,
                            Math.min(99, Number(event.target.value || 1))
                          );
                          updateSelection(key, { quantity: newQuantity });
                          dispatch(
                            updateCartQuantity({
                              productId: item.productId,
                              color: item.color,
                              quantity: newQuantity,
                            })
                          );
                        }}
                      />
                    </div>
                    <strong>{formatPrice(item.product.price * current.quantity)}</strong>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className='cart-empty-hint'>
              <p>В корзине пока пусто. Добавьте обои из каталога, и они появятся здесь.</p>
              <Link to='/catalog'>Перейти в каталог</Link>
            </div>
          )}
        </section>

        <div className='form-group full-width'>
          <label htmlFor='comment'>Комментарий к заказу</label>
          <textarea
            id='comment'
            name='comment'
            value={formData.comment}
            onChange={handleChange}
            rows={4}
          />
        </div>

        <div className='order-summary'>
          <h3>Расчет стоимости</h3>
          <div className='summary-item'>
            <span>Выбрано товаров:</span>
            <span>{orderSummary.totalQuantity} шт.</span>
          </div>
          <div className='summary-item'>
            <span>Материалы:</span>
            <span className='calculation'>{formatPrice(orderSummary.subtotal)}</span>
          </div>
          <div className='summary-item'>
            <span>Доставка:</span>
            <span>{formatPrice(orderSummary.deliveryCost)}</span>
          </div>
          <div className='summary-item total'>
            <span>Итого:</span>
            <span>{formatPrice(orderSummary.total)}</span>
          </div>
        </div>

        {submitStatus.message && (
          <div className={`submit-status ${submitStatus.type}`}>{submitStatus.message}</div>
        )}

        {submitStatus.type === 'success' && (
          <div className='payment-emulation'>
            <h3>Оплата заказа</h3>
            <p>
              К оплате: <strong>{formatPrice(orderSummary.total)}</strong>
            </p>
            <p className='payment-hint'>
              Онлайн-оплата пока не подключена. Менеджер предложит удобный способ оплаты после
              подтверждения заказа.
            </p>
            <div className='payment-buttons'>
              <button
                type='button'
                className='payment-button primary'
                onClick={() => setIsPaymentModalOpen(true)}
              >
                Подробнее об оплате
              </button>
            </div>
          </div>
        )}

        {isPaymentModalOpen && (
          <div className='payment-modal-overlay' onClick={() => setIsPaymentModalOpen(false)}>
            <div className='payment-modal' onClick={(event) => event.stopPropagation()}>
              <button
                className='payment-modal-close'
                type='button'
                onClick={() => setIsPaymentModalOpen(false)}
              >
                ×
              </button>
              <h3>Оплата</h3>
              <p className='payment-modal-subtitle'>
                Сейчас заказ фиксируется как заявка. После проверки наличия менеджер отправит ссылку
                на оплату или согласует оплату при получении.
              </p>
              <button
                type='button'
                className='payment-button primary full-width'
                onClick={() => setIsPaymentModalOpen(false)}
              >
                Понятно
              </button>
            </div>
          </div>
        )}

        {submitStatus.type === 'success' ? (
          <button type='button' onClick={resetOrderForm}>
            Оформить новый заказ
          </button>
        ) : (
          <button type='submit' disabled={isSubmitting || !cartItems.length}>
            {isSubmitting ? 'Отправка...' : 'Оформить заказ'}
          </button>
        )}
      </form>
    </div>
  );
};

export default OrderForm;
