import React from 'react';
import '../styles/features.css';

const featureItems = [
  {
    title: 'Прочные',
    text: 'Обои точно останутся целыми, когда придет время расставить или передвинуть мебель и не пострадают от рук, лап или когтей домашних животных!',
    icon: 'shield',
  },
  {
    title: 'Моющиеся',
    text: 'Эти обои можно мыть с чистящими средствами и перекрашивать до 15 раз. Идеально для детской и кухни!',
    icon: 'drop',
  },
  {
    title: 'Экологичные & гипоаллергенные',
    text: 'Мы сделали обои из природных материалов, чтобы ваш дом стал безопаснее, а планета - чище. Никаких подводных камней: в их составе только натуральные компоненты: крахмал, глина и кварцевый песок.',
    icon: 'leaf',
  },
  {
    title: 'Защищают от плесени',
    text: 'Наши обои пропускают воздух, поэтому под ними никогда не появится плесень или грибок даже в ванной или на кухне!',
    icon: 'air',
  },
  {
    title: 'Препятствуют образованию трещин',
    text: 'Обои сдерживают процесс образования трещин на стенах - отлично подходят для новостроек.',
    icon: 'bolt',
    wide: true,
  },
];

const FeatureIcon: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'shield') {
    return (
      <svg viewBox='0 0 120 120' aria-hidden='true'>
        <path d='M60 15C78 31 93 30 98 31C101 67 88 92 60 105C32 92 19 67 22 31C27 30 42 31 60 15Z' />
        <path d='M60 31C72 42 82 42 85 43C87 66 78 82 60 93C42 82 33 66 35 43C38 42 48 42 60 31Z' />
      </svg>
    );
  }

  if (type === 'drop') {
    return (
      <svg viewBox='0 0 120 120' aria-hidden='true'>
        <path d='M61 17C78 41 91 58 91 77C91 94 78 106 60 106C42 106 29 94 29 77C29 58 44 40 61 17Z' />
        <path d='M49 73C48 84 54 91 64 91' />
      </svg>
    );
  }

  if (type === 'leaf') {
    return (
      <svg viewBox='0 0 120 120' aria-hidden='true'>
        <path d='M86 17C56 23 36 44 37 70C38 89 51 101 69 99C93 96 102 70 86 17Z' />
        <path d='M72 34C62 50 56 67 54 96' />
        <path d='M54 73C44 66 36 61 25 58' />
      </svg>
    );
  }

  if (type === 'air') {
    return (
      <svg viewBox='0 0 120 120' aria-hidden='true'>
        <rect x='38' y='17' width='44' height='86' rx='6' />
        <path d='M18 43C36 43 38 53 56 53C72 53 77 43 94 43' />
        <path d='M18 62C36 62 38 72 56 72C72 72 77 62 94 62' />
        <path d='M18 81C36 81 38 91 56 91C72 91 77 81 94 81' />
      </svg>
    );
  }

  return (
    <svg viewBox='0 0 120 120' aria-hidden='true'>
      <path d='M69 12L27 65H56L48 108L92 51H63L69 12Z' />
    </svg>
  );
};

const Features: React.FC = () => {
  return (
    <section className='features' aria-label='Преимущества обоев'>
      <div className='features-grid'>
        {featureItems.map((item) => (
          <article
            className={`feature-card ${item.wide ? 'feature-card-wide' : ''}`}
            key={item.title}
          >
            <FeatureIcon type={item.icon} />
            <div className='feature-copy'>
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Features;
