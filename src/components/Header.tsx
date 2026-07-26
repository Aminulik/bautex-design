import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import '../styles/header.css';
import icon from '../assets/icon.png';
import Cross from '../assets/cross.svg';
import DevNoticeModal from '../components/DevNoticeModal';
import LoginModal from '../components/LoginModal';
import type { CartItem } from '../store/cartSlice';

interface DropdownProps {
  title: string;
  items: Array<{
    href: string;
    text: string;
    className?: string;
    onClick?: () => void;
  }>;
  onItemClick?: () => void;
  isMobile?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({ title, items, onItemClick, isMobile }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleItemClick = () => {
    setIsOpen(false);
    onItemClick?.();
  };

  return (
    <div
      className={`dropdown ${isOpen ? 'open' : ''} ${isMobile ? 'mobile' : ''}`}
      onMouseEnter={() => !isMobile && setIsOpen(true)}
      onMouseLeave={() => !isMobile && setIsOpen(false)}
    >
      <button className='dropdown-toggle' onClick={() => isMobile && setIsOpen(!isOpen)}>
        {title}
        {!isMobile && <span className='dropdown-arrow'>▾</span>}
      </button>
      <div className='dropdown-menu'>
        {items.map((item, index) => (
          <Link
            key={`${item.href}-${index}`}
            to={item.href}
            className={item.className}
            onClick={(event) => {
              if (item.onClick) {
                event.preventDefault();
                item.onClick();
              }
              handleItemClick();
            }}
          >
            {item.text}
          </Link>
        ))}
      </div>
    </div>
  );
};

const HomeIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <path d='M3.5 11.4 12 4l8.5 7.4' />
    <path d='M5.8 10.3V20h4.3v-5.2h3.8V20h4.3v-9.7' />
  </svg>
);

const HeartIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <path d='M20.3 5.8c-1.9-1.8-4.8-1.5-6.4.4L12 8.4l-1.9-2.2c-1.6-1.9-4.5-2.2-6.4-.4-2 1.9-2.1 5.1-.2 7.1L12 21l8.5-8.1c1.9-2 1.8-5.2-.2-7.1Z' />
  </svg>
);

const CartIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <path d='M3 4h2.6l1.7 10.2a2 2 0 0 0 2 1.7h7.8a2 2 0 0 0 2-1.6l1.1-6.5H7' />
    <path d='M9.2 20.2h.1M17.2 20.2h.1' />
  </svg>
);

interface IconLinkProps {
  to: string;
  label: string;
  count?: number;
  children: React.ReactNode;
  onClick?: () => void;
}

const IconLink: React.FC<IconLinkProps> = ({ to, label, count, children, onClick }) => (
  <Link to={to} className='header-icon-link' aria-label={label} title={label} onClick={onClick}>
    <span className='header-icon'>{children}</span>
    {!!count && <span className='header-icon-count'>{count}</span>}
  </Link>
);

const Header: React.FC = () => {
  const [showDevNotice, setShowDevNotice] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isPastHero, setIsPastHero] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeMobileDropdown, setActiveMobileDropdown] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const { items: favorites } = useSelector((state: RootState) => state.favorites);
  const isHomePage = location.pathname === '/';
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const cartCount = cartItems.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);

  // Закрытие мобильного меню при ресайзе на десктоп
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  // Отслеживание скролла по положению hero-секции
  useEffect(() => {
    if (!isHomePage) {
      setIsPastHero(true);
      setIsScrolled(true);
      return;
    }

    const checkScroll = () => {
      const hero = document.querySelector('.hero-section');

      if (!hero) {
        setIsScrolled(false);
        setIsPastHero(false);
        return;
      }

      const rect = hero.getBoundingClientRect();
      const headerHeight = 60;

      // Фон шапки — когда hero начинает уходить вверх
      setIsScrolled(rect.bottom < window.innerHeight);

      // Hero пройден — когда он почти скрылся за шапку
      setIsPastHero(rect.bottom <= headerHeight + 24);
    };

    checkScroll();

    // Интервал для гарантированного срабатывания
    const interval = setInterval(checkScroll, 100);

    // События скролла на всё что можно
    window.addEventListener('scroll', checkScroll, { passive: true });
    document.addEventListener('scroll', checkScroll, { passive: true });

    const scrollContainer = document.querySelector('.app');
    scrollContainer?.addEventListener('scroll', checkScroll, { passive: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener('scroll', checkScroll);
      document.removeEventListener('scroll', checkScroll);
      scrollContainer?.removeEventListener('scroll', checkScroll);
    };
  }, [isHomePage, location.pathname]);

  // Класс home-route для body
  useEffect(() => {
    document.body.classList.toggle('home-route', isHomePage);
    return () => {
      document.body.classList.remove('home-route');
    };
  }, [isHomePage]);

  // Блокировка скролла при открытом мобильном меню
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    if (!isMobileMenuOpen) setActiveMobileDropdown(null);
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLoginClick = () => {
    setIsLoginModalOpen(true);
    closeMobileMenu();
  };

  const collectionsItems = [
    { href: '/catalog', text: 'Все' },
    { href: '/collections/basic', text: 'Basic' },
    { href: '/collections/loft', text: 'Loft' },
    { href: '/collections/geometry', text: 'Geometry' },
    { href: '/collections/minimalism', text: 'Minimalism' },
    { href: '/collections/classic', text: 'Classic' },
    { href: '/collections/kids', text: 'Kids' },
  ];

  const aboutItems = [
    { href: '/about/company', text: 'О компании', className: 'company-link' },
    { href: '/about/projects', text: 'Проекты' },
    { href: '/about/reviews', text: 'Отзывы' },
    { href: '/about/certificates', text: 'Сертификаты' },
  ];

  const infoItems: DropdownProps['items'] = [
    { href: '/info/how-to-paste', text: 'Как клеить' },
    { href: '/info/how-to-paint', text: 'Как красить' },
  ];

  const goTo = (href: string) => {
    navigate(href);
    closeMobileMenu();
  };

  const shouldShowHeaderBackground = !isHomePage || isScrolled || isPastHero || isMobileMenuOpen;

  return (
    <header
      className={`${isHomePage ? 'home-header' : ''} ${shouldShowHeaderBackground ? 'scrolled' : ''} ${
        isMobileMenuOpen ? 'mobile-menu-open' : ''
      }`}
    >
      <div className='logo-section'>
        <Link to='/' onClick={closeMobileMenu}>
          <img src={icon} alt='BauTex Design' className='logo' />
        </Link>
        <div className='slogan-container'>
          Жаккардовые обои
          <br />
          из кварцевой нити
          <br />
          под покраску
        </div>
      </div>

      <Link to='/' className='home-nav-icon' aria-label='На главную' title='На главную'>
        <HomeIcon />
      </Link>

      <div
        className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
      >
        {isMobileMenuOpen ? (
          <Cross className='cross-icon' />
        ) : (
          <>
            <span />
            <span />
            <span />
          </>
        )}
      </div>

      <nav className='desktop-nav'>
        <Dropdown title='Коллекции' items={collectionsItems} />
        <button className='nav-button' onClick={() => navigate('/where-to-buy')}>
          Где купить
        </button>
        <Dropdown title='О нас' items={aboutItems} />
        <Dropdown title='Инструкции' items={infoItems} />
        <button className='nav-button' onClick={() => navigate('/visualization')}>
          Визуализация
        </button>
      </nav>

      <div className='desktop-actions'>
        <div className='auth-block-desktop'>
          {user ? (
            <Link to='/account' className='user-name'>
              ЛК
            </Link>
          ) : (
            <button className='login-btn' onClick={handleLoginClick}>
              ЛК
            </button>
          )}
        </div>
        <div className='header-actions-icons'>
          <IconLink to='/favorites' label='Избранное' count={favorites.length}>
            <HeartIcon />
          </IconLink>
          <IconLink to='/where-to-buy#order-form' label='Корзина и заказ' count={cartCount}>
            <CartIcon />
          </IconLink>
        </div>
        <div className='phone desktop-phone' onClick={() => window.open('tel:+74955329112')}>
          8 (495) 532-91-12
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className='mobile-menu-overlay'>
          {activeMobileDropdown ? (
            <div className='mobile-dropdown-content'>
              <button className='mobile-back-button' onClick={() => setActiveMobileDropdown(null)}>
                ← Назад
              </button>
              {activeMobileDropdown === 'Каталог' && (
                <div className='mobile-submenu'>
                  {collectionsItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className='mobile-menu-item'
                      onClick={closeMobileMenu}
                    >
                      {item.text}
                    </Link>
                  ))}
                </div>
              )}
              {activeMobileDropdown === 'О нас' && (
                <div className='mobile-submenu'>
                  {aboutItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className='mobile-menu-item'
                      onClick={closeMobileMenu}
                    >
                      {item.text}
                    </Link>
                  ))}
                </div>
              )}
              {activeMobileDropdown === 'Инструкции' && (
                <div className='mobile-submenu'>
                  {infoItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className='mobile-menu-item'
                      onClick={closeMobileMenu}
                    >
                      {item.text}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className='mobile-main-menu'>
              <button
                className='mobile-menu-button'
                onClick={() => setActiveMobileDropdown('Каталог')}
              >
                Каталог
              </button>
              <button className='mobile-menu-button' onClick={() => goTo('/where-to-buy')}>
                Купить
              </button>
              <button
                className='mobile-menu-button'
                onClick={() => setActiveMobileDropdown('О нас')}
              >
                О нас
              </button>
              <button
                className='mobile-menu-button'
                onClick={() => setActiveMobileDropdown('Инструкции')}
              >
                Инструкции
              </button>
              <button className='mobile-menu-button' onClick={() => goTo('/visualization')}>
                Визуализация
              </button>
              <div className='mobile-quick-actions'>
                {user ? (
                  <Link to='/account' className='mobile-action-pill' onClick={closeMobileMenu}>
                    Личный кабинет
                  </Link>
                ) : (
                  <button className='mobile-action-pill' onClick={handleLoginClick}>
                    Войти в ЛК
                  </button>
                )}
                <Link to='/favorites' className='mobile-action-pill' onClick={closeMobileMenu}>
                  Избранное{favorites.length ? ` (${favorites.length})` : ''}
                </Link>
                <Link
                  to='/where-to-buy#order-form'
                  className='mobile-action-pill'
                  onClick={closeMobileMenu}
                >
                  Корзина{cartCount ? ` (${cartCount})` : ''}
                </Link>
              </div>
              <button
                className='mobile-menu-button phone-button'
                onClick={() => {
                  window.open('tel:+74955329112');
                  closeMobileMenu();
                }}
              >
                +7 (495) 532-91-12
              </button>
            </div>
          )}
        </div>
      )}

      {showDevNotice && <DevNoticeModal onClose={() => setShowDevNotice(false)} />}
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </header>
  );
};

export default Header;
