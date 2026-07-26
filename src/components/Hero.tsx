import React, { useState, useEffect, useCallback } from 'react';
import '../styles/hero.css';
import hero1 from '../assets/hero/design-version-hero-1.jpg';
import hero2 from '../assets/hero/design-version-hero-2.jpg';
import hero3 from '../assets/hero/design-version-hero-3.jpg';
import HeroFrame from '../assets/hero-svg/Rectangle 4.svg';

const slides = [
  { image: hero1, background: '#B1918F' },
  { image: hero2, background: '#9DAD9C' },
  { image: hero3, background: '#A0ADC0' },
];

const Hero: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [displayBackground, setDisplayBackground] = useState(slides[0].background);
  const [isAnimating, setIsAnimating] = useState(false);

  const timeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);
  const intervalRef = React.useRef<NodeJS.Timeout | undefined>(undefined);
  const isAnimatingRef = React.useRef(false);

  useEffect(() => {
    slides.forEach((slide) => {
      const img = new Image();
      img.src = slide.image;
    });
  }, []);

  useEffect(() => {
    isAnimatingRef.current = isAnimating;
  }, [isAnimating]);

  const switchTo = useCallback(
    (targetIndex: number) => {
      if (isAnimatingRef.current) return;
      if (targetIndex === activeIndex) return;

      setIsAnimating(true);
      isAnimatingRef.current = true;
      setNextIndex(targetIndex);
      setDisplayBackground(slides[targetIndex].background);

      timeoutRef.current = setTimeout(() => {
        setActiveIndex(targetIndex);
        setNextIndex(null);
        setIsAnimating(false);
        isAnimatingRef.current = false;
      }, 1400);
    },
    [activeIndex]
  );

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (!isAnimatingRef.current) {
        const next = (activeIndex + 1) % slides.length;
        switchTo(next);
      }
    }, 4000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [activeIndex, switchTo]);

  return (
    <section className='hero-section' style={{ backgroundColor: displayBackground }}>
      <div className='hero-stage'>
        <div className='hero-text-overlay'>
          Жаккардовые<span> обои</span>
          <br />
          из кварцевой нити
        </div>

        <div
          className={`hero-slider-container ${isAnimating ? 'transitioning' : ''}`}
          data-active={activeIndex}
        >
          {slides.map((slide, index) => (
            <img
              key={index}
              src={slide.image}
              alt={`Slide ${index}`}
              className={`hero-slide ${
                index === activeIndex ? 'active' : nextIndex === index ? 'incoming' : ''
              }`}
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding='async'
            />
          ))}
        </div>

        {/* Новый контейнер для рамки и кнопок */}
        <div className='hero-frame-wrapper'>
          <HeroFrame
            className='hero-frame'
            width='100%'
            height='100%'
            preserveAspectRatio='none'
            aria-hidden='true'
            focusable='false'
          />
          <div className='hero-buttons'>
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => switchTo(idx)}
                className={`hero-button ${activeIndex === idx ? 'active' : ''}`}
              >
                Оттенок {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
