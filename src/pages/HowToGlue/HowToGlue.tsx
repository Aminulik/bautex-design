import React, { useState } from 'react';
import Breadcrumbs from '../../components/Breadcrumbs';
import {
  ClockIcon,
  GlueBucketIcon,
  KnifeIcon,
  RollerIcon,
  SpatulaIcon,
  TextureIcon,
} from '../../components/InstructionIcons';
import VideoPlayer from '../../components/VideoPlayer';
import VideoPhone from '../../assets/slides/slider2.jpg';
import '../HowToPaint/how-to-paint.css';

const HowToGlue: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const youtubeVideoId = 'Lmv5BMXfFfg';

  const handlePlayClick = () => setIsPlaying(true);

  return (
    <main className='how-to-paint-page how-to-video-page how-to-glue-page'>
      <Breadcrumbs currentPage='Как клеить обои BauTex Design' />

      <section className='video-section'>
        <h1 className='page-title'>Как клеить обои BauTex Design</h1>
      </section>

      <div className='how-to-paint-content-container'>
        <div className={`video-container how-to-glue-hero ${isPlaying ? 'playing' : ''}`}>
          <VideoPlayer videoId={youtubeVideoId} onPlay={handlePlayClick} isPlaying={isPlaying} />
          {!isPlaying && (
            <>
              <div className='video-preview'>
                <img src={VideoPhone} alt='Превью инструкции по поклейке обоев BauTex Design' />
              </div>
              <button
                className='play-button'
                onClick={handlePlayClick}
                type='button'
                aria-label='Воспроизвести видео'
              />
              <div className='how-to-glue-hero-caption'>
                <span>Инструкция</span>
                <strong>От подготовки стены до финальной прокатки швов</strong>
              </div>
            </>
          )}
        </div>

        <div className='how-to-paint-content-wrapper'>
          {/* Секция 01 */}
          <section className='how-to-paint-section instruction-card instruction-card--glue'>
            <div className='instruction-hero-icon' aria-hidden='true'>
              <GlueBucketIcon />
            </div>
            <div className='instruction-copy'>
              <h2 className='how-to-paint-section-title'>01 / Замешиваем клей</h2>
              <div className='how-to-paint-section-text'>
                <p>
                  Клей должен быть специальным, предназначенным для работы с плотными
                  стеклотканевыми обоями. Обычный клей для бумажных полотен не подойдет.
                </p>
                <div className='instruction-points'>
                  <article className='instruction-point'>
                    <span className='instruction-point-icon'>
                      <GlueBucketIcon />
                    </span>
                    <div className='instruction-point-content'>
                      <strong>Сыпьте в воду тонкой струйкой</strong>
                      <p>
                        Постоянно перемешивайте состав, чтобы не появились комки. Консистенция
                        должна быть однородной и достаточно плотной.
                      </p>
                    </div>
                  </article>
                  <article className='instruction-point'>
                    <span className='instruction-point-icon'>
                      <ClockIcon />
                    </span>
                    <div className='instruction-point-content'>
                      <strong>Дайте клею настояться</strong>
                      <p>
                        Оставьте смесь на 5 минут, затем еще раз перемешайте. После этого клей готов
                        к нанесению на стену.
                      </p>
                    </div>
                  </article>
                </div>
                <div className='how-to-paint-tip'>
                  <strong>Совет!</strong>
                  Состав со временем густеет, поэтому замешивайте только то количество клея, которое
                  успеете использовать за один подход.
                </div>
              </div>
            </div>
          </section>

          {/* Секция 02 */}
          <section className='how-to-paint-section instruction-card instruction-card--glue'>
            <div className='instruction-hero-icon' aria-hidden='true'>
              <SpatulaIcon />
            </div>
            <div className='instruction-copy'>
              <h2 className='how-to-paint-section-title green'>02 / Клеим полотна на стену</h2>
              <div className='how-to-paint-section-text'>
                <p>
                  Работу начинайте от разметки возле дверного проема. В отличие от обычных обоев,
                  клей наносится на стену, а не на полотно.
                </p>
                <div className='instruction-points'>
                  <article className='instruction-point'>
                    <span className='instruction-point-icon'>
                      <RollerIcon />
                    </span>
                    <div className='instruction-point-content'>
                      <strong>Разглаживайте от центра</strong>
                      <p>
                        Прикладывайте полотно сверху вниз и прокатывайте валиком от середины к
                        краям. Так уйдет воздух, а фактура не сплющится.
                      </p>
                    </div>
                  </article>
                  <article className='instruction-point'>
                    <span className='instruction-point-icon'>
                      <KnifeIcon />
                    </span>
                    <div className='instruction-point-content'>
                      <strong>Аккуратно обрезайте излишки</strong>
                      <p>
                        Лишние сантиметры сверху и снизу срезайте монтажным ножом по линейке. Нож
                        должен быть острым, чтобы край оставался чистым.
                      </p>
                    </div>
                  </article>
                  <article className='instruction-point'>
                    <span className='instruction-point-icon'>
                      <TextureIcon />
                    </span>
                    <div className='instruction-point-content'>
                      <strong>Стыкуйте без нахлеста</strong>
                      <p>
                        Следующее полотно клеится стык в стык. Не давите на кромку слишком сильно,
                        чтобы сохранить рельеф ткани.
                      </p>
                    </div>
                  </article>
                </div>
                <div className='how-to-paint-tip'>
                  <strong>Совет!</strong>
                  Если заметили засохший клей или выступивший пузырь, сразу снимите его влажной
                  губкой и снова прокатайте участок валиком.
                </div>
              </div>
            </div>
          </section>

          {/* Секция 03 */}
          <section className='how-to-paint-section instruction-card instruction-card--glue'>
            <div className='instruction-hero-icon' aria-hidden='true'>
              <ClockIcon />
            </div>
            <div className='instruction-copy'>
              <h2 className='how-to-paint-section-title green'>03 / Сушим перед окрашиванием</h2>
              <div className='how-to-paint-section-text'>
                <div className='instruction-points'>
                  <article className='instruction-point'>
                    <span className='instruction-point-icon'>
                      <ClockIcon />
                    </span>
                    <div className='instruction-point-content'>
                      <strong>Оставьте комнату на 2 суток</strong>
                      <p>
                        Не открывайте окна настежь и не включайте направленный обогрев. Обои должны
                        высохнуть спокойно, без сквозняков.
                      </p>
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </section>

          <div className='how-to-paint-final-note'>
            <h3>Поздравляем, у вас получилось!</h3>
            <p>
              Когда полотна полностью высохнут, можно переходить к окрашиванию. Проверьте стыки и
              убедитесь, что на стене нет пузырей.
            </p>
            <a className='instruction-next-link' href='/info/how-to-paint'>
              Инструкция по окрашиванию
            </a>
          </div>
        </div>
      </div>
    </main>
  );
};

export default HowToGlue;
