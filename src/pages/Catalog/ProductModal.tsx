// ============================================
// Файл: src/components/ProductModal.tsx (ЗАМЕНА)
// ============================================
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import type { CatalogItem, ProductColor } from '../../data/catalogItems';
import { addToFavorites, removeFromFavorites } from '../../store/favoritesSlice';
import { addToCart, removeFromCart } from '../../store/cartSlice';
import type { CartItem } from '../../store/cartSlice';

const API_URL = (process.env.API_BASE_URL || '/api') as string;
const ALLOW_ANONYMOUS_FAVORITES = true;
const displayNames: Partial<Record<string, string>> = {
  'BASIC-1001': 'Geneva',
  'BASIC-1002': 'Пигментированный холст',
  'LOFT-2001': 'Berlin',
  'LOFT-2002': 'Rome',
  'GEOM-3001': 'Tokyo',
  'GEOM-3002': 'New York',
  'GEOM-3003': 'London',
  'MIN-4001': 'Dublin',
  'MIN-4002': 'Prague',
  'CLS-5001': 'Istanbul',
  'CLS-5002': 'Venice',
  'KIDS-6001': 'Singapore',
  'KIDS-6002': 'Rodos',
};
interface ProductModalProps {
  item: CatalogItem | null;
  onClose: () => void;
}

const formatPrice = (price: number) => `${price.toLocaleString('ru-RU')} ₽ / рулон`;

const ProductModal: React.FC<ProductModalProps> = ({ item, onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, token } = useSelector((state: RootState) => state.auth);
  const { items: favorites } = useSelector((state: RootState) => state.favorites);
  const cartItems = useSelector((state: RootState) => state.cart.items);

  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(item?.colors[0] ?? null);
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState('');
  const [favoriteMessage, setFavoriteMessage] = useState('');

  const isFavorite = item ? favorites.includes(item.id) : false;
  const currentColor = selectedColor?.name ?? item?.colorHint ?? '';
  const total = useMemo(() => (item ? item.price * quantity : 0), [item, quantity]);

  // Проверяем наличие товара с ЛЮБЫМ цветом
  const hasAnyColorInCart = item
    ? cartItems.some((ci: CartItem) => ci.productId === item.id)
    : false;

  // Проверяем наличие товара с ТЕКУЩИМ цветом
  const isCurrentColorInCart = item
    ? cartItems.some((ci: CartItem) => ci.productId === item.id && ci.color === currentColor)
    : false;

  // Общее количество товара в корзине (всех цветов)
  const totalInCart = item
    ? cartItems
        .filter((ci: CartItem) => ci.productId === item.id)
        .reduce((sum: number, ci: CartItem) => sum + ci.quantity, 0)
    : 0;

  useEffect(() => {
    setSelectedColor(item?.colors[0] ?? null);
    setQuantity(1);
    setCartMessage('');
    setFavoriteMessage('');
  }, [item]);

  if (!item) return null;

  const toggleFavorite = () => {
    if (!ALLOW_ANONYMOUS_FAVORITES && !user) {
      alert('Чтобы добавлять товары в избранное, войдите в аккаунт.');
      return;
    }
    if (isFavorite) {
      dispatch(removeFromFavorites(item.id));
      setFavoriteMessage('Товар убран из избранного');
    } else {
      dispatch(addToFavorites(item.id));
      setFavoriteMessage('Товар добавлен в избранное');
    }
  };

  const handleCartToggle = () => {
    const color = currentColor;

    if (isCurrentColorInCart) {
      // Удаление из корзины только для текущего цвета
      dispatch(removeFromCart({ productId: item.id, color }));
      setCartMessage('Товар удалён из корзины');

      // Синхронизация удаления с сервером (опционально)
      if (user && token) {
        fetch(`${API_URL}/cart/${encodeURIComponent(item.id)}?color=${encodeURIComponent(color)}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch((error) => console.warn('Failed to sync cart removal with backend:', error));
      }
    } else {
      // Добавление в корзину (можно добавить даже если есть другой цвет)
      dispatch(addToCart({ product: item, color, quantity }));
      setCartMessage(
        hasAnyColorInCart ? 'Добавлен новый цвет в корзину' : 'Товар добавлен в корзину'
      );

      // Синхронизация с сервером (опционально)
      if (user && token) {
        fetch(`${API_URL}/cart`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: item.id,
            product: item,
            color,
            quantity,
          }),
        }).catch((error) => console.warn('Failed to sync cart with backend:', error));
      }
    }
  };

  return (
    <div className='product-modal-overlay' onClick={onClose}>
      <article className='product-modal' onClick={(event) => event.stopPropagation()}>
        <button type='button' className='product-modal-close' onClick={onClose}>
          ×
        </button>
        <div className='product-modal-preview'>
          <img src={item.image} alt={item.name} />
          {selectedColor && (
            <div
              className='product-modal-color-layer'
              style={{ backgroundColor: selectedColor.hex, opacity: selectedColor.intensity }}
            />
          )}
        </div>
        <div className='product-modal-info'>
          <p className='product-modal-code'>{item.code}</p>
          <h2>{displayNames[item.id] || item.name}</h2>
          <p className='product-modal-description'>{item.description}</p>
          <div className='product-modal-meta'>
            <span>{formatPrice(item.price)}</span>
            <span>{item.rollSize}</span>
            <span>{item.density}</span>
          </div>
          <div className='product-modal-section'>
            <h3>Цвет покраски</h3>
            <div className='product-color-grid'>
              {item.colors.map((color) => (
                <button
                  key={color.hex}
                  type='button'
                  className={`product-color-swatch ${selectedColor?.hex === color.hex ? 'active' : ''}`}
                  style={{ backgroundColor: color.hex }}
                  onClick={() => {
                    setSelectedColor(color);
                    setCartMessage('');
                    setFavoriteMessage('');
                  }}
                  aria-label={color.name}
                  title={color.name}
                />
              ))}
            </div>
            <p className='product-color-name'>{currentColor}</p>
          </div>
          <div className='product-buy-row'>
            <label className='product-quantity'>
              <span>Количество</span>
              <input
                type='number'
                min='1'
                max='99'
                value={quantity}
                onChange={(event) =>
                  setQuantity(Math.max(1, Math.min(99, Number(event.target.value) || 1)))
                }
              />
            </label>
            <strong>{total.toLocaleString('ru-RU')} ₽</strong>
          </div>
          {totalInCart > 0 && (
            <div className='product-cart-info'>
              В корзине: {totalInCart} шт.
              {hasAnyColorInCart && !isCurrentColorInCart && ' (других цветов)'}
            </div>
          )}
          <div className='product-modal-actions'>
            <button
              type='button'
              className={`product-primary-action ${isCurrentColorInCart ? 'is-added' : ''}`}
              onClick={handleCartToggle}
            >
              {isCurrentColorInCart
                ? 'Удалить из корзины'
                : hasAnyColorInCart
                  ? 'Добавить этот цвет'
                  : 'В корзину'}
            </button>
            <button
              type='button'
              className={`product-secondary-action ${isFavorite ? 'is-favorite' : ''}`}
              onClick={toggleFavorite}
            >
              {isFavorite ? 'Убрать из избранного' : 'В избранное'}
            </button>
          </div>
          {(cartMessage || favoriteMessage) && (
            <div className='product-action-feedback' aria-live='polite'>
              {cartMessage && <p className='product-cart-message'>{cartMessage}</p>}
              {favoriteMessage && <p className='product-favorite-message'>{favoriteMessage}</p>}
            </div>
          )}
        </div>
      </article>
    </div>
  );
};

export default ProductModal;
