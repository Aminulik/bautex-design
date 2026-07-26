import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/reviews.css';
import ArrowLeftIcon from '../assets/Vector-left.svg';
import ArrowRightIcon from '../assets/Vector-rigth.svg';
import SvgGroup from '../assets/Group 123.svg'; // Импортируем ваш SVG файл
import InputMask from 'react-input-mask';

interface ReviewItem {
  id: number;
  content: string;
  author: string;
}

const ReviewsCarousel: React.FC = () => {
  const allReviews: ReviewItem[] = [
    {
      id: 1,
      content:
        'Покупала обои для детской комнаты, подошли идеально. Дочке очень понравились бабочки, поэтому взяли Singapore. В небесном цвете они смотрятся просто божественно!',
      author: 'Анна К.',
    },
    {
      id: 2,
      content:
        'Переехали с мужем в новостройку, очень хотели просто гладкие окрашенные стены. Пошли в салон покупать краску, и нам там посоветовали, чтобы потом трещин на стенах не было, т.к. дом новый и будет еще усаживаться, купить обои под покраску. Остановились на пигментированном холсте. Это полный восторг! Ни разу не пожалели!',
      author: 'Марина С.',
    },
    {
      id: 3,
      content:
        'Сначала очень скептически относилась к обоям под покраску, тем более тканным. Изучила массу информации, перелопатила кучу отзывов и поняла в итоге, что это то, что мне нужно! Остановилась именно на BauTex Design, потому что очень уж понравилась фактура Tokyo. Покрасила ее в пудровый - смотрится очень эффектно.',
      author: 'Елена П.',
    },
    {
      id: 4,
      content: 'Отзыв 4 - Отличное качество материалов и прекрасная фактура.',
      author: 'Ирина В.',
    },
  ];

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    comment: '',
  });
  // Получаем текущие отзывы для отображения
  const getCurrentReviews = () => {
    const prevIndex = currentIndex === 0 ? allReviews.length - 1 : currentIndex - 1;
    const nextIndex = currentIndex === allReviews.length - 1 ? 0 : currentIndex + 1;
    return [allReviews[prevIndex], allReviews[currentIndex], allReviews[nextIndex]];
  };

  const scroll = (direction: -1 | 1) => {
    setCurrentIndex((prev) => (prev + direction + allReviews.length) % allReviews.length);
  };

  const goToReview = (index: number) => {
    setCurrentIndex(index);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const API_URL = (process.env.API_BASE_URL || '/api') as string;
    const token = localStorage.getItem('token');

    // Если пользователь не авторизован — сохраняем локально (как раньше)
    if (!token) {
      try {
        const existing = localStorage.getItem('myReviews');
        const parsed = existing ? JSON.parse(existing) : [];
        const newReview = {
          id: Date.now(),
          createdAt: new Date().toISOString(),
          name: formData.name,
          phone: formData.phone,
          comment: formData.comment,
        };
        localStorage.setItem('myReviews', JSON.stringify([newReview, ...parsed].slice(0, 10)));
      } catch (storageError) {
        console.error('Failed to save review to localStorage', storageError);
      }
    } else {
      // Иначе — отправляем на бэкенд и сохраняем в БД
      fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: 'general',
          rating: null,
          comment: formData.comment,
          authorName: formData.name,
          authorPhone: formData.phone,
        }),
      }).catch((err) => console.error('Failed to send review:', err));
    }

    // Показываем сообщение "Спасибо"
    setFormSubmitted(true);

    // Через 3 секунды закрываем окно
    setTimeout(() => {
      setShowForm(false);
      setFormSubmitted(false);
      setFormData({ name: '', phone: '', comment: '' });
    }, 3000);
  };

  const closeModal = () => {
    setShowForm(false);
    setFormSubmitted(false);
    setFormData({ name: '', phone: '', comment: '' });
  };

  return (
    <section className='reviews-carousel-section'>
      {/* SVG Overlay Group */}
      <div className='svg-overlay-group'>
        <SvgGroup aria-hidden='true' />
      </div>

      <h2 className='section-title'>Вы о BauTex Design</h2>

      <div className='reviews-carousel'>
        {getCurrentReviews().map((review, index) => (
          <div
            key={`${review.id}-${index}`}
            className={`review-box ${index === 1 ? 'center' : ''}`}
          >
            <p className='review-text'>{review.content}</p>
            <p className='review-author'>{review.author}</p>
          </div>
        ))}
      </div>
      <div className='carousel-controls'>
        <div className='arrow left' onClick={() => scroll(-1)}>
          <ArrowLeftIcon width={60} height={31} />
        </div>
        <div className='dots-container'>
          {allReviews.map((_, index) => (
            <div
              key={index}
              className={`dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToReview(index)}
            />
          ))}
        </div>

        <div className='arrow right' onClick={() => scroll(1)}>
          <ArrowRightIcon width={60} height={31} />
        </div>
      </div>

      <button className='add-review-btn' onClick={() => setShowForm(true)}>
        Оставить отзыв
      </button>

      {showForm && (
        <div className='modal-overlay'>
          <div className='review-form-container'>
            <button className='close-btn' onClick={closeModal}>
              ×
            </button>

            {formSubmitted ? (
              <div className='thank-you-content'>
                <h3>Спасибо за ваш отзыв!</h3>
                <p>Мы ценим ваше мнение и время.</p>
              </div>
            ) : (
              <>
                <h3>Оставить отзыв</h3>
                <form onSubmit={handleSubmit}>
                  <input
                    type='text'
                    name='name'
                    placeholder='Ваше имя'
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                  <InputMask
                    mask='+7 (999) 999-99-99'
                    maskPlaceholder='_'
                    name='phone'
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  >
                    {(inputProps) => <input {...inputProps} type='tel' />}
                  </InputMask>
                  <textarea
                    name='comment'
                    placeholder='Ваш отзыв'
                    value={formData.comment}
                    onChange={handleInputChange}
                    required
                  />
                  <button type='submit' className='submit-review-btn'>
                    Отправить
                  </button>
                  <p className='privacy-policy'>
                    {/* eslint-disable-next-line react/no-unescaped-entities */}
                    Нажимая кнопку "Отправить", вы соглашаетесь с условиями{' '}
                    <Link to='/privacy-policy'>Политики конфиденциальности</Link>
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default ReviewsCarousel;
