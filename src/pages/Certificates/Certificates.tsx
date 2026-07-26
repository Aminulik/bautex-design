import React from 'react';
import './certificates.css';
import certificate1 from '../../assets/certificate1.png';
import certificate2 from '../../assets/certificate2.png';
import certificate3 from '../../assets/certificate3.png';
import Breadcrumbs from '../../components/Breadcrumbs';

// Данные о сертификатах с официальными ссылками
const certificatesData = [
  {
    id: 1,
    image: certificate1,
    title: 'Сертификат соответствия',
    link: 'https://pub.fsa.gov.ru/rds/declaration/view/4537465',
    subcaption: 'Подтверждает соответствие ГОСТ-стандартам',
  },
  {
    id: 2,
    image: certificate2,
    title: 'Пожарный сертификат',
    link: 'https://pub.fsa.gov.ru/rds/declaration/view/4829373',
    subcaption: 'Подтверждает класс горючести Г 1',
  },
  {
    id: 3,
    image: certificate3,
    title: 'Экспертное заключение',
    link: 'https://pub.fsa.gov.ru/rds/declaration/view/5128439',
    subcaption:
      'О соответствии продукции единым санитарно-эпидемиологическим и гигиеническим требованиям.',
  },
];

const Certificates: React.FC = () => {
  const handleCertificateClick = (link?: string) => {
    if (link) {
      window.open(link, 'img', 'noopener,noreferrer');
    }
  };

  return (
    <main>
      <Breadcrumbs currentPage='Сертификаты' />

      <div className='certificates-header-sert'>
        <h1>СЕРТИФИКАТЫ</h1>
      </div>

      <div className='title'>
        Обои BauTex Design прошли не только обязательную, но и добровольную сертификацию
      </div>

      <div className='cert-container'>
        {certificatesData.map((cert) => (
          <div key={cert.id} className='certificate-wrapper'>
            <div className='certificate' onClick={() => handleCertificateClick(cert.link)}>
              <img src={cert.image} alt={cert.title} />
            </div>
            <div className='cert-caption'>{cert.title}</div>
            {cert.subcaption && <div className='cert-subcaption'>{cert.subcaption}</div>}
          </div>
        ))}
      </div>
    </main>
  );
};

export default Certificates;
