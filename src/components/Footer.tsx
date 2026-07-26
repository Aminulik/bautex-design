import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/footer.css';

const navigationLinks = [
  { to: '/collections/basic', label: 'Коллекции' },
  { to: '/where-to-buy', label: 'Где купить' },
  { to: '/about/company', label: 'О нас' },
  { to: '/info/how-to-glue', label: 'Инструкции' },
  { to: '/visualization', label: 'Визуализация' },
];

const Footer: React.FC = () => {
  return (
    <footer className='footer'>
      <div className='footer-container'>
        <nav className='footer-nav' aria-label='Навигация в футере'>
          <h2 className='footer-title'>Навигация</h2>

          <ul className='footer-nav-list'>
            {navigationLinks.map((link) => (
              <li key={link.label}>
                <Link to={link.to} className='footer-link'>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className='footer-main'>
          <section className='footer-contacts' aria-labelledby='footer-contacts-title'>
            <div className='footer-heading-row'>
              <h2 id='footer-contacts-title' className='footer-title'>
                Контакты
              </h2>
              <span className='footer-line' aria-hidden='true' />
            </div>

            <address className='footer-address'>
              119049, г. Москва, ул. Крымский вал, д. 3, с. 2
            </address>

            <div className='footer-contact-links'>
              <a href='tel:+74955329112' className='footer-link'>
                +7 (495) 532-91-12
              </a>
              <a
                href='https://mail.google.com/mail/?view=cm&fs=1&to=design@bautex.ru'
                target='_blank'
                rel='noreferrer'
                className='footer-link'
              >
                design@bautex.ru
              </a>
            </div>
          </section>

          <div className='footer-bottom-line' aria-hidden='true' />

          <div className='footer-bottom'>
            <Link to='/privacy-policy' className='footer-link footer-privacy'>
              Политика конфиденциальности
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
