import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/fabrics.css';
import {
  CATALOG_ITEMS,
  COLLECTION_INFO,
  PRODUCT_COLORS,
  type CatalogItem,
  type CollectionKey,
  type ProductColor,
} from '../data/catalogItems';

const collectionOrder: CollectionKey[] = [
  'basic',
  'loft',
  'geometry',
  'minimalism',
  'classic',
  'kids',
];

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

const palette: ProductColor[] = [
  { name: 'Stone', hex: '#a7a9a5', intensity: 0.42 },
  { name: 'Forest', hex: '#425f52', intensity: 0.58 },
  { name: 'Rose', hex: '#c9838c', intensity: 0.44 },
  { name: 'Mauve', hex: '#826d78', intensity: 0.54 },
  { name: 'Sand', hex: '#efd5b6', intensity: 0.35 },
  { name: 'Sage', hex: '#9ab29f', intensity: 0.45 },
  { name: 'Tokyo', hex: '#8199ad', intensity: 0.52 },
  { name: 'Clay', hex: '#deb6ae', intensity: 0.42 },
  { name: 'Wine', hex: '#9d263d', intensity: 0.62 },
  { name: 'Petrol', hex: '#1f6a7f', intensity: 0.6 },
];

const getDisplayName = (item: CatalogItem) => displayNames[item.id] || item.name;

const getTintedBackground = (hex: string) => {
  const normalized = hex.replace('#', '');
  const base =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;

  const color = Number.parseInt(base, 16);
  if (Number.isNaN(color)) {
    return '#6f8798';
  }

  const target = { r: 64, g: 82, b: 88 };
  const mix = 0.34;
  const r = Math.round(((color >> 16) & 255) * (1 - mix) + target.r * mix);
  const g = Math.round(((color >> 8) & 255) * (1 - mix) + target.g * mix);
  const b = Math.round((color & 255) * (1 - mix) + target.b * mix);

  return `rgb(${r}, ${g}, ${b})`;
};

const FabricsSection: React.FC = () => {
  const navigate = useNavigate();
  const [activeItemId, setActiveItemId] = useState('GEOM-3001');
  const [activeColor, setActiveColor] = useState<ProductColor>(palette[6] || PRODUCT_COLORS[6]);

  const groupedItems = useMemo(
    () =>
      collectionOrder.map((collection) => ({
        key: collection,
        title: COLLECTION_INFO[collection].title,
        items: CATALOG_ITEMS.filter((item) => item.collection === collection).slice(0, 3),
      })),
    []
  );

  const activeItem = useMemo(
    () => CATALOG_ITEMS.find((item) => item.id === activeItemId) || CATALOG_ITEMS[0],
    [activeItemId]
  );

  const handleTryClick = () => {
    navigate('/visualization');
  };

  return (
    <section
      className='fabrics-section'
      aria-label='Подбор обоев и цвета'
      style={
        {
          '--fabric-section-bg': getTintedBackground(activeColor.hex),
          '--fabric-accent-color': activeColor.hex,
        } as React.CSSProperties
      }
    >
      <div className='fabrics-shell'>
        <div className='fabrics-board'>
          <div className='fabrics-table' aria-label='Модели обоев'>
            {groupedItems.map((collection) => (
              <div className='fabric-row' key={collection.key}>
                <h3 className='fabric-row-title'>{collection.title}</h3>
                <div className='fabric-row-items'>
                  {collection.items.map((item) => (
                    <button
                      key={item.id}
                      className={`fabric-card ${activeItemId === item.id ? 'active' : ''}`}
                      type='button'
                      onClick={() => setActiveItemId(item.id)}
                      aria-pressed={activeItemId === item.id}
                    >
                      <img src={item.image} alt='' className='fabric-card-image' />
                      <span>{getDisplayName(item)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className='fabric-preview-panel'>
            <h2>{getDisplayName(activeItem).toUpperCase()}</h2>
            <div className='fabric-preview-arch'>
              <img src={activeItem.image} alt={getDisplayName(activeItem)} />
              <span
                className='fabric-preview-color'
                style={{
                  backgroundColor: activeColor.hex,
                  opacity: activeColor.intensity,
                }}
              />
            </div>
          </div>
        </div>

        <div className='fabric-bottom'>
          <div className='fabric-decorator' aria-hidden='true'>
            <span />
          </div>
          <div className='fabric-palette' aria-label='Цвета'>
            {palette.map((color) => (
              <button
                key={color.hex}
                className={`fabric-swatch ${activeColor.hex === color.hex ? 'active' : ''}`}
                type='button'
                style={{ backgroundColor: color.hex }}
                onClick={() => setActiveColor(color)}
                aria-label={color.name}
                aria-pressed={activeColor.hex === color.hex}
              />
            ))}
          </div>
          <button className='fabric-try-button' type='button' onClick={handleTryClick}>
            Примерить
          </button>
        </div>
      </div>
    </section>
  );
};

export default FabricsSection;
