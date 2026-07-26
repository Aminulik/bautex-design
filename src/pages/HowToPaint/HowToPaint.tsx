import React, { useState } from 'react';
import Breadcrumbs from '../../components/Breadcrumbs';
import {
  BrushIcon,
  ClockIcon,
  DropIcon,
  RollerIcon,
  TextureIcon,
} from '../../components/InstructionIcons';
import VideoPlayer from '../../components/VideoPlayer';
import Lines from '../../assets/Group 50.svg';
import VideoPhone from '../../assets/slides/slider1.jpg';
import './how-to-paint.css';

const HowToPaint: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const youtubeVideoId = 'Lmv5BMXfFfg';

  const handlePlayClick = () => setIsPlaying(true);

  return (
    <main className='how-to-paint-page how-to-video-page'>
      <Breadcrumbs currentPage='Как красить обои BauTex Design' />
      <section className='video-section'>
        <h1 className='page-title'>Как красить обои BauTex Design</h1>
      </section>

      <div className='how-to-paint-content-container'>
        <div className={`video-container ${isPlaying ? 'playing' : ''}`}>
          <VideoPlayer videoId={youtubeVideoId} onPlay={handlePlayClick} isPlaying={isPlaying} />
          {!isPlaying && (
            <>
              <div className='video-preview'>
                <img src={VideoPhone} alt='Превью инструкции по окрашиванию обоев BauTex Design' />
              </div>
              <button
                className='play-button'
                onClick={handlePlayClick}
                type='button'
                aria-label='Воспроизвести видео'
              />
              <div className='svg-overlay'>
                <Lines className='lines-svg' />
              </div>
            </>
          )}
        </div>
        <div className='how-to-paint-content-wrapper'>
          <section className='how-to-paint-section instruction-card instruction-card--paint'>
            <div className='instruction-hero-icon' aria-hidden='true'>
              <BrushIcon />
            </div>

            <div className='instruction-copy'>
              <h2 className='how-to-paint-section-title'>01 / Красим обои</h2>
              <div className='how-to-paint-section-text'>
                <p>
                  Для покраски стеклотканевых обоев лучше всего подойдет водно-дисперсионная краска.
                  У нее нет резкого запаха, она быстро высыхает и сохраняет рельеф фактуры.
                </p>

                <div className='instruction-points'>
                  <article className='instruction-point'>
                    <span className='instruction-point-icon'>
                      <TextureIcon />
                    </span>
                    <div className='instruction-point-content'>
                      <strong>Подготовьте поверхность</strong>
                      <p>
                        Чтобы снизить расход краски, предварительно загрунтуйте стены. Для этого
                        можно использовать сильно разбавленный клей или краску. После грунтовки
                        дайте обоям полностью просохнуть.
                      </p>
                    </div>
                  </article>

                  <article className='instruction-point'>
                    <span className='instruction-point-icon'>
                      <RollerIcon />
                    </span>
                    <div className='instruction-point-content'>
                      <strong>Наносите валиком</strong>
                      <p>
                        Начинайте с углов и сложных мест, затем прокрашивайте основную площадь
                        валиком. Работайте равномерно, без сильного нажима, чтобы не забить рисунок
                        фактуры.
                      </p>
                    </div>
                  </article>
                </div>

                <div className='how-to-paint-tip'>
                  <strong>Совет!</strong>
                  Ванночку для краски удобнее обматывать стрейч-пленкой или плотным пакетом. После
                  работы пленку можно снять, и лоток останется чистым.
                </div>
              </div>
            </div>
          </section>

          <section className='how-to-paint-section instruction-card instruction-card--paint'>
            <div className='instruction-hero-icon' aria-hidden='true'>
              <RollerIcon />
            </div>

            <div className='instruction-copy'>
              <h2 className='how-to-paint-section-title green'>02 / Второй слой и сушка</h2>
              <div className='how-to-paint-section-text'>
                <div className='instruction-points'>
                  <article className='instruction-point'>
                    <span className='instruction-point-icon'>
                      <DropIcon />
                    </span>
                    <div className='instruction-point-content'>
                      <strong>Соблюдайте мокрый край</strong>
                      <p>
                        Следующая полоса краски должна заходить на предыдущую, пока она еще влажная.
                        Так после высыхания не появится заметная граница.
                      </p>
                    </div>
                  </article>

                  <article className='instruction-point'>
                    <span className='instruction-point-icon'>
                      <ClockIcon />
                    </span>
                    <div className='instruction-point-content'>
                      <strong>Дайте покрытию высохнуть</strong>
                      <p>
                        После окрашивания оставьте стены минимум на 12 часов. Второй слой наносите
                        только после полного высыхания первого.
                      </p>
                    </div>
                  </article>
                </div>

                <div className='how-to-paint-tip'>
                  <strong>Совет!</strong>
                  Красить лучше всю стену за один раз, не прерываясь на обед или долгие паузы. Так
                  цвет получится ровным.
                </div>
              </div>
            </div>
          </section>

          <div className='how-to-paint-final-note'>
            <h3>Поздравляем!</h3>
            <p>
              Теперь можно заносить мебель и наслаждаться обновленной комнатой. Если цвет надоест
              или появятся следы быта, обои можно мыть и перекрашивать до 15 раз.
            </p>
            <a className='instruction-next-link' href='/info/how-to-glue'>
              Инструкция по поклейке
            </a>
          </div>
        </div>
      </div>
    </main>
  );
};

export default HowToPaint;
