import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/location-map.css';
import ymaps from 'yandex-maps';

declare global {
  interface Window {
    ymaps?: typeof ymaps;
  }
}

interface LocationPoint {
  id: number;
  city: string;
  name: string;
  address: string;
  coordinates: [number, number];
}

interface MarkerHitbox {
  point: LocationPoint;
  x: number;
  y: number;
}

type YmapsWithProjection = typeof ymaps & {
  projection?: {
    wgs84Mercator?: ymaps.IProjection;
  };
};

const getMercatorProjection = () => (window.ymaps as YmapsWithProjection).projection?.wgs84Mercator;

const YANDEX_MAPS_API_KEY =
  process.env.REACT_APP_YANDEX_MAPS_API_KEY || '0ac10ed4-b4d8-4d4f-bcfa-9f4150ca70e6';
const YANDEX_MAPS_SCRIPT_ID = 'yandex-maps-api';
const YANDEX_MAPS_SRC = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_MAPS_API_KEY}&lang=ru_RU`;

let yandexMapsPromise: Promise<typeof ymaps> | null = null;

const waitForYandexMapsReady = () =>
  new Promise<typeof ymaps>((resolve, reject) => {
    const api = window.ymaps;

    if (!api?.ready) {
      reject(new Error('Yandex Maps API did not initialize.'));
      return;
    }

    api.ready(() => {
      if (window.ymaps && typeof window.ymaps.Map === 'function') {
        resolve(window.ymaps);
        return;
      }

      reject(new Error('Yandex Maps constructor is unavailable.'));
    });
  });

const loadYandexMaps = () => {
  if (window.ymaps && typeof window.ymaps.Map === 'function') {
    return Promise.resolve(window.ymaps);
  }

  if (yandexMapsPromise) return yandexMapsPromise;

  if (window.ymaps) {
    yandexMapsPromise = waitForYandexMapsReady().catch((error) => {
      yandexMapsPromise = null;
      throw error;
    });
    return yandexMapsPromise;
  }

  yandexMapsPromise = new Promise<typeof ymaps>((resolve, reject) => {
    const settleReady = () => {
      waitForYandexMapsReady().then(resolve).catch(reject);
    };
    const rejectLoad = () => reject(new Error('Failed to load Yandex Maps API.'));
    const existingScript =
      (document.getElementById(YANDEX_MAPS_SCRIPT_ID) as HTMLScriptElement | null) ||
      Array.from(document.scripts).find((script) => script.src.includes('api-maps.yandex.ru/2.1/'));

    if (existingScript) {
      existingScript.id = YANDEX_MAPS_SCRIPT_ID;
      existingScript.addEventListener('load', settleReady, { once: true });
      existingScript.addEventListener('error', rejectLoad, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = YANDEX_MAPS_SCRIPT_ID;
    script.src = YANDEX_MAPS_SRC;
    script.async = true;
    script.onload = settleReady;
    script.onerror = rejectLoad;
    document.head.appendChild(script);
  }).catch((error) => {
    yandexMapsPromise = null;
    throw error;
  });

  return yandexMapsPromise;
};

const locations: LocationPoint[] = [
  {
    id: 1,
    city: 'Владимир',
    name: 'BauTex Design - главный офис',
    address: 'г. Владимир, ул. Большая Нижегородская, 88',
    coordinates: [56.129057, 40.406662],
  },
  {
    id: 2,
    city: 'Владимир',
    name: 'Шоурум BauTex на Гагарина',
    address: 'г. Владимир, ул. Гагарина, 13',
    coordinates: [56.128361, 40.408036],
  },
  {
    id: 3,
    city: 'Москва',
    name: 'Салон BauTex Design, Artplay',
    address: 'г. Москва, ул. Нижняя Сыромятническая, д. 10, стр. 2',
    coordinates: [55.752121, 37.670355],
  },
  {
    id: 4,
    city: 'Москва',
    name: 'Партнерский салон на Крымском Валу',
    address: 'г. Москва, ул. Крымский Вал, д. 3, с. 2',
    coordinates: [55.734812, 37.607312],
  },
  {
    id: 5,
    city: 'Москва',
    name: 'Дизайн-студия на Ленинском',
    address: 'г. Москва, Ленинский проспект, д. 38',
    coordinates: [55.705415, 37.588268],
  },
  {
    id: 6,
    city: 'Москва',
    name: 'Салон обоев на Рязанском',
    address: 'г. Москва, Рязанский проспект, д. 2',
    coordinates: [55.729169, 37.733706],
  },
  {
    id: 7,
    city: 'Санкт-Петербург',
    name: 'Дилерский центр BauTex',
    address: 'г. Санкт-Петербург, ул. Большая Конюшенная, д. 19',
    coordinates: [59.939864, 30.323853],
  },
  {
    id: 8,
    city: 'Санкт-Петербург',
    name: 'Салон на Петроградской',
    address: 'г. Санкт-Петербург, Большой проспект П. С., д. 74',
    coordinates: [59.966558, 30.311109],
  },
  {
    id: 9,
    city: 'Санкт-Петербург',
    name: 'Студия интерьера у Московских ворот',
    address: 'г. Санкт-Петербург, Московский проспект, д. 107',
    coordinates: [59.891985, 30.317641],
  },
  {
    id: 10,
    city: 'Казань',
    name: 'Салон BauTex Казань',
    address: 'г. Казань, ул. Пушкина, д. 46',
    coordinates: [55.789977, 49.133931],
  },
  {
    id: 11,
    city: 'Казань',
    name: 'Дизайн-центр на Чистопольской',
    address: 'г. Казань, ул. Чистопольская, д. 20',
    coordinates: [55.822899, 49.120621],
  },
  {
    id: 12,
    city: 'Нижний Новгород',
    name: 'Салон на Большой Покровской',
    address: 'г. Нижний Новгород, ул. Большая Покровская, д. 25',
    coordinates: [56.322795, 44.005982],
  },
  {
    id: 13,
    city: 'Нижний Новгород',
    name: 'Партнерский шоурум на Родионова',
    address: 'г. Нижний Новгород, ул. Родионова, д. 165',
    coordinates: [56.307298, 44.076152],
  },
  {
    id: 14,
    city: 'Екатеринбург',
    name: 'BauTex Екатеринбург',
    address: 'г. Екатеринбург, ул. Малышева, д. 51',
    coordinates: [56.837536, 60.611456],
  },
  {
    id: 15,
    city: 'Екатеринбург',
    name: 'Студия на Шейнкмана',
    address: 'г. Екатеринбург, ул. Шейнкмана, д. 90',
    coordinates: [56.827459, 60.589135],
  },
  {
    id: 16,
    city: 'Новосибирск',
    name: 'Салон BauTex Новосибирск',
    address: 'г. Новосибирск, Красный проспект, д. 50',
    coordinates: [55.041471, 82.921602],
  },
  {
    id: 17,
    city: 'Новосибирск',
    name: 'Интерьерная студия у площади Маркса',
    address: 'г. Новосибирск, пл. Карла Маркса, д. 7',
    coordinates: [54.982357, 82.892892],
  },
  {
    id: 18,
    city: 'Ростов-на-Дону',
    name: 'Салон на Буденновском',
    address: 'г. Ростов-на-Дону, Буденновский проспект, д. 49',
    coordinates: [47.222464, 39.71538],
  },
  {
    id: 19,
    city: 'Краснодар',
    name: 'Партнер BauTex Краснодар',
    address: 'г. Краснодар, ул. Красная, д. 176',
    coordinates: [45.042812, 38.981895],
  },
];

interface OrderModalProps {
  city: string;
  onClose: () => void;
  onConfirm: () => void;
}

const OrderModal: React.FC<OrderModalProps> = ({ city, onClose, onConfirm }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 30000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className='order-modal-overlay' onClick={onClose}>
      <div className='order-modal-content' onClick={(event) => event.stopPropagation()}>
        <button className='order-modal-close' onClick={onClose}>
          ×
        </button>
        <h3>Перейти к оформлению заказа?</h3>
        <p>
          Вы выбрали город: <strong>{city}</strong>
        </p>
        <p>Откроем форму заказа и подставим выбранный город.</p>
        <div className='order-modal-buttons'>
          <button className='order-modal-confirm' onClick={onConfirm}>
            Перейти к оформлению
          </button>
          <button className='order-modal-cancel' onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

const getBounds = (points: LocationPoint[]) => {
  const lats = points.map((point) => point.coordinates[0]);
  const lngs = points.map((point) => point.coordinates[1]);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ] as [[number, number], [number, number]];
};

const LocationMap: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [viewType, setViewType] = useState<'map' | 'list'>('map');
  const [activeLocation, setActiveLocation] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedCity, setSelectedCity] = useState('');
  const [markerHitboxes, setMarkerHitboxes] = useState<MarkerHitbox[]>([]);
  const mapRef = useRef<ymaps.Map | null>(null);
  const placemarksRef = useRef<ymaps.Placemark[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const handlerAddedRef = useRef(false);
  const nativeMapClickCleanupRef = useRef<(() => void) | null>(null);
  const markerHitboxCleanupRef = useRef<(() => void) | null>(null);

  const groupedLocations = useMemo(
    () =>
      locations.reduce(
        (acc, item) => {
          if (!acc[item.city]) acc[item.city] = [];
          acc[item.city].push(item);
          return acc;
        },
        {} as Record<string, LocationPoint[]>
      ),
    []
  );

  // useLocation отдаёт путь уже без basename, поэтому сравниваем с чистыми маршрутами.
  const isOnOrderPage = location.pathname === '/where-to-buy';
  const isHomePage = location.pathname === '/';

  const zoomToCity = useCallback((city: string) => {
    const cityLocations = locations.filter((point) => point.city === city);
    if (!cityLocations.length) return;

    setSelectedCity(city);
    setViewType('map');

    window.setTimeout(() => {
      const map = mapRef.current;
      if (!map) return;

      if (cityLocations.length === 1) {
        map.setCenter(cityLocations[0].coordinates, 14, { duration: 450 });
      } else {
        map.setBounds(getBounds(cityLocations), {
          checkZoomRange: true,
          zoomMargin: [92, 92, 92, 92],
          duration: 450,
        } as ymaps.IMapBoundsOptions);
      }
    }, 80);
  }, []);

  const handleBalloonClick = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>('.balloon-order-button');
    if (button) {
      const city = button.getAttribute('data-city');
      if (city) {
        setSelectedCity(city);
        setShowOrderModal(true);
      }
    }
  }, []);

  const handleConfirmOrder = () => {
    setShowOrderModal(false);

    if (isOnOrderPage) {
      setTimeout(() => {
        const orderForm =
          document.getElementById('order-form') ||
          document.querySelector('.order-form-container') ||
          document.querySelector('.order-section');
        if (orderForm) {
          orderForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
          window.scrollBy(0, -50);
        }
      }, 100);
    } else {
      navigate(`/where-to-buy?city=${encodeURIComponent(selectedCity)}`);
    }
  };

  const highlightPlacemark = useCallback((locationId: number) => {
    if (!mapRef.current || !placemarksRef.current.length) return;

    placemarksRef.current.forEach((placemark) => {
      placemark.options.set('preset', 'islands#greenDotIcon');
    });

    const locationIndex = locations.findIndex((point) => point.id === locationId);
    if (locationIndex === -1) return;

    const placemark = placemarksRef.current[locationIndex];
    placemark.options.set('preset', 'islands#darkGreenIcon');
    placemark.balloon.open();
    mapRef.current.setCenter(locations[locationIndex].coordinates, 16, { duration: 500 });
  }, []);

  const openPlacemarkBalloon = useCallback((point: LocationPoint) => {
    const locationIndex = locations.findIndex((item) => item.id === point.id);
    const placemark = placemarksRef.current[locationIndex];

    setActiveLocation(point.id);
    setSelectedCity(point.city);
    placemark?.balloon.open();
  }, []);

  useEffect(() => {
    let isDisposed = false;

    const initMap = async () => {
      if (!mapContainerRef.current || viewType !== 'map') return;
      if (mapRef.current) {
        if (isDisposed) return;
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const ymapsApi = await loadYandexMaps();
        if (isDisposed || !mapContainerRef.current || mapRef.current) return;

        const map = new ymapsApi.Map(mapContainerRef.current, {
          center: [55.76, 37.64],
          zoom: 5,
          controls: ['zoomControl'],
        });

        mapRef.current = map;

        if (map.margin?.addArea) {
          map.margin.addArea({
            top: 0,
            left: 0,
            width: '100%',
            height: '120px',
          });
        }

        document.removeEventListener('click', handleBalloonClick, true);
        document.addEventListener('click', handleBalloonClick, true);
        handlerAddedRef.current = true;

        const placemarks: ymaps.Placemark[] = [];

        locations.forEach((point) => {
          const placemark = new ymapsApi.Placemark(
            point.coordinates,
            {
              balloonContent: `
                <div class="balloon">
                  <h3>${point.name}</h3>
                  <p>${point.address}</p>
                  <button class="balloon-order-button" data-city="${point.city.replace(
                    /"/g,
                    '&quot;'
                  )}">Оформить заказ</button>
                </div>
              `,
            },
            {
              preset: 'islands#greenDotIcon',
              openBalloonOnClick: true,
              interactiveZIndex: true,
              hideIconOnBalloonOpen: false,
              balloonCloseButton: true,
            }
          );

          map.geoObjects.add(placemark);
          placemark.events.add('click', () => {
            setActiveLocation(point.id);
            setSelectedCity(point.city);
            placemark.balloon.open();
          });

          placemarks.push(placemark);
        });

        const openClosestPlacemark = (clickPixels: number[]) => {
          const projection = getMercatorProjection();
          if (!projection?.toGlobalPixels) return;

          const zoom = map.getZoom();
          const closest = locations.reduce(
            (acc, point, index) => {
              const markerPixels = projection.toGlobalPixels(point.coordinates, zoom);
              const distance = Math.hypot(
                markerPixels[0] - clickPixels[0],
                markerPixels[1] - clickPixels[1]
              );

              return distance < acc.distance ? { distance, index } : acc;
            },
            { distance: Number.POSITIVE_INFINITY, index: -1 }
          );

          if (closest.index === -1 || closest.distance > 38) return;

          const point = locations[closest.index];
          const placemark = placemarks[closest.index];
          setActiveLocation(point.id);
          setSelectedCity(point.city);
          placemark.balloon.open();
        };

        map.events.add('click', (event) => {
          const coords = event.get('coords') as [number, number] | undefined;
          const projection = getMercatorProjection();
          if (!coords || !projection?.toGlobalPixels) return;

          openClosestPlacemark(projection.toGlobalPixels(coords, map.getZoom()));
        });

        const container = mapContainerRef.current;
        const converter = map.converter;
        if (container && converter?.globalToPage) {
          const handleNativeMapClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (
              target?.closest(
                '.balloon, .balloon-order-button, .ymaps-2-1-79-balloon, .map-marker-hitbox'
              )
            ) {
              return;
            }

            const projection = getMercatorProjection();
            if (!projection?.toGlobalPixels) return;

            const zoom = map.getZoom();
            const closest = locations.reduce(
              (acc, point, index) => {
                const markerGlobalPixels = projection.toGlobalPixels(point.coordinates, zoom);
                const markerPagePixels = converter.globalToPage(markerGlobalPixels);
                const distance = Math.hypot(
                  markerPagePixels[0] - event.pageX,
                  markerPagePixels[1] - event.pageY
                );

                return distance < acc.distance ? { distance, index } : acc;
              },
              { distance: Number.POSITIVE_INFINITY, index: -1 }
            );

            if (closest.index === -1 || closest.distance > 38) return;

            const point = locations[closest.index];
            const placemark = placemarks[closest.index];
            setActiveLocation(point.id);
            setSelectedCity(point.city);
            placemark.balloon.open();
          };

          nativeMapClickCleanupRef.current?.();
          container.addEventListener('click', handleNativeMapClick, true);
          nativeMapClickCleanupRef.current = () => {
            container.removeEventListener('click', handleNativeMapClick, true);
          };
        }

        const updateMarkerHitboxes = () => {
          const containerRect = mapContainerRef.current?.getBoundingClientRect();
          const projection = getMercatorProjection();
          const converter = map.converter;

          if (!containerRect || !projection?.toGlobalPixels || !converter?.globalToPage) {
            setMarkerHitboxes([]);
            return;
          }

          const containerPageLeft = containerRect.left + window.scrollX;
          const containerPageTop = containerRect.top + window.scrollY;
          const zoom = map.getZoom();

          const nextHitboxes = locations
            .map((point) => {
              const globalPixels = projection.toGlobalPixels(point.coordinates, zoom);
              const pagePixels = converter.globalToPage(globalPixels);

              return {
                point,
                x: pagePixels[0] - containerPageLeft,
                y: pagePixels[1] - containerPageTop,
              };
            })
            .filter(
              ({ x, y }) =>
                x >= -56 &&
                y >= -72 &&
                x <= containerRect.width + 56 &&
                y <= containerRect.height + 72
            );

          setMarkerHitboxes(nextHitboxes);
        };

        const markerUpdateEvents = ['boundschange', 'actiontick', 'actionend', 'sizechange'];
        markerUpdateEvents.forEach((eventName) => map.events.add(eventName, updateMarkerHitboxes));
        window.addEventListener('resize', updateMarkerHitboxes);
        markerHitboxCleanupRef.current?.();
        markerHitboxCleanupRef.current = () => {
          markerUpdateEvents.forEach((eventName) =>
            map.events.remove(eventName, updateMarkerHitboxes)
          );
          window.removeEventListener('resize', updateMarkerHitboxes);
        };

        placemarksRef.current = placemarks;

        const bounds = map.geoObjects.getBounds();
        if (bounds) {
          map.setBounds(bounds, {
            checkZoomRange: true,
            zoomMargin: [72, 72, 150, 72],
          });
        }

        requestAnimationFrame(updateMarkerHitboxes);
        window.setTimeout(updateMarkerHitboxes, 250);
        window.setTimeout(updateMarkerHitboxes, 800);

        if (isDisposed) return;
        setIsLoading(false);
        if (activeLocation) highlightPlacemark(activeLocation);
        if (selectedCity) zoomToCity(selectedCity);
      } catch (err) {
        console.error('Map error:', err);
        if (isDisposed) return;
        setError('Ошибка загрузки карты. Проверьте API-ключ Яндекс.Карт и доступ к сети.');
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      isDisposed = true;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
        placemarksRef.current = [];
      }
      if (handlerAddedRef.current) {
        document.removeEventListener('click', handleBalloonClick, true);
        handlerAddedRef.current = false;
      }
      nativeMapClickCleanupRef.current?.();
      nativeMapClickCleanupRef.current = null;
      markerHitboxCleanupRef.current?.();
      markerHitboxCleanupRef.current = null;
      setMarkerHitboxes([]);
    };
  }, [handleBalloonClick, viewType]);

  useEffect(() => {
    if (viewType !== 'map' || !activeLocation) return;
    highlightPlacemark(activeLocation);
  }, [activeLocation, highlightPlacemark, viewType]);

  const handleLocationClick = (point: LocationPoint) => {
    setActiveLocation(point.id);
    setSelectedCity(point.city);
    setViewType('map');
    window.setTimeout(() => highlightPlacemark(point.id), 120);
  };

  return (
    <>
      <section className={`location-section ${isHomePage ? 'on-home-page' : ''}`}>
        <div className='location-header'>
          <h1 className='location-title'>Где нас можно купить</h1>
        </div>

        <div className='view-toggle-buttons'>
          <button
            className={`view-toggle-button ${viewType === 'map' ? 'active' : ''}`}
            onClick={() => setViewType('map')}
          >
            Карта
          </button>
          <button
            className={`view-toggle-button ${viewType === 'list' ? 'active' : ''}`}
            onClick={() => setViewType('list')}
          >
            Список
          </button>
        </div>

        <div className='location-content'>
          {viewType === 'map' ? (
            <div className='map-wrapper'>
              <div ref={mapContainerRef} className='map-container' />
              <div className='map-marker-hit-layer' aria-hidden={isLoading}>
                {markerHitboxes.map(({ point, x, y }) => (
                  <button
                    key={point.id}
                    type='button'
                    className={`map-marker-hitbox ${activeLocation === point.id ? 'active' : ''}`}
                    style={{ left: x, top: y }}
                    aria-label={`Open location: ${point.name}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      openPlacemarkBalloon(point);
                    }}
                  />
                ))}
              </div>
              {isLoading && <div className='map-loading'>Загрузка карты...</div>}
              {error && <div className='map-error'>{error}</div>}
            </div>
          ) : (
            <div className='locations-list city-list'>
              {Object.entries(groupedLocations).map(([city, points]) => (
                <section key={city} className='city-location-group'>
                  <button className='city-location-head' onClick={() => zoomToCity(city)}>
                    <span>{city}</span>
                    <span>{points.length} точек</span>
                  </button>
                  <div className='city-location-items'>
                    {points.map((point) => (
                      <button
                        key={point.id}
                        className={`location-item ${activeLocation === point.id ? 'active' : ''}`}
                        onClick={() => handleLocationClick(point)}
                      >
                        <h3>{point.name}</h3>
                        <p>{point.address}</p>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>
      {showOrderModal && (
        <OrderModal
          city={selectedCity}
          onClose={() => setShowOrderModal(false)}
          onConfirm={handleConfirmOrder}
        />
      )}
    </>
  );
};

export default LocationMap;
