import React, { useEffect, useState } from 'react';
import '../../styles/app.css';

interface MlMetricsData {
  dataset: {
    path: string;
    imagesCount: number;
    masksCount: number;
    ready: boolean;
  };
  latest: {
    imagesCount?: number;
    meanIoU?: number;
    meanDice?: number;
    meanPrecision?: number;
    meanRecall?: number;
    createdAt?: string;
  } | null;
  metricGuide: Array<{ key: string; label: string; good: string }>;
}

const API_URL = (process.env.API_BASE_URL || '/api') as string;

const formatMetric = (value?: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3) : 'н/д';

const formatPercent = (value?: number) =>
  typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value * 100)}%` : 'н/д';

const getMetricRating = (key: string, value?: number): { label: string; color: string } => {
  if (!value && value !== 0) return { label: 'Нет данных', color: '#999' };

  const thresholds: Record<string, { excellent: number; good: number }> = {
    IoU: { excellent: 0.75, good: 0.65 },
    Dice: { excellent: 0.85, good: 0.75 },
    Precision: { excellent: 0.85, good: 0.70 },
    Recall: { excellent: 0.85, good: 0.70 },
  };

  const t = thresholds[key] || { excellent: 0.80, good: 0.70 };
  if (value >= t.excellent) return { label: 'Отлично', color: '#28a745' };
  if (value >= t.good) return { label: 'Хорошо', color: '#47624d' };
  return { label: 'Требует улучшения', color: '#b84c36' };
};

const metricExplanations: Record<string, { title: string; description: string; example: string }> = {
  IoU: {
    title: 'Intersection over Union',
    description: 'Показывает, насколько точно модель выделила стены. Если IoU = 1 — идеальное совпадение с эталоном. Если 0 — модель ошиблась полностью.',
    example: 'IoU = 0.77 значит, что площадь пересечения маски модели и эталонной маски составляет 77% от площади их объединения.',
  },
  Dice: {
    title: 'Dice Coefficient (F1-мера)',
    description: 'Среднее гармоническое между точностью и полнотой. Хорошо работает даже когда стены занимают мало места на фото.',
    example: 'Dice = 0.87 значит, что модель одинаково хорошо и находит стены, и не захватывает лишнего.',
  },
  Precision: {
    title: 'Точность выделения',
    description: 'Какая доля пикселей, которые модель пометила как стену, действительно являются стеной. Высокая точность = модель не красит лишнего.',
    example: 'Precision = 0.82 значит, что 82% того, что модель назвала стеной — действительно стена.',
  },
  Recall: {
    title: 'Полнота выделения',
    description: 'Какую долю от настоящей стены модель смогла найти. Высокий recall = модель находит почти всю стену.',
    example: 'Recall = 0.93 значит, что модель нашла 93% площади реальной стены.',
  },
};

const MlMetrics: React.FC = () => {
  const [data, setData] = useState<MlMetricsData | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/ml/metrics`)
      .then((response) => (response.ok ? response.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const datasetReady = Boolean(data?.dataset.ready);
  const hasMetrics = data?.latest && data.latest.meanIoU !== null;

  return (
    <main className='container metrics-page'>
      <section style={{ maxWidth: 980 }}>
        <p style={{ color: '#8a6b48', fontWeight: 700, textTransform: 'uppercase' }}>
          Проверка сегментации
        </p>
        <h1 style={{ color: '#30493a', fontSize: 42, margin: '0 0 14px' }}>
          Качество выделения стен
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.55, color: '#4b4b46' }}>
          Мы постоянно измеряем, насколько точно нейросеть SegFormer находит стены на фото.
          Эти метрики обновляются при каждом запуске оценки и показывают реальное качество
          автоматического выделения стен.
        </p>
      </section>

      {/* Карточки с данными */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14,
        marginTop: 26,
      }}>
        <article style={cardStyle}>
          <strong>{data?.dataset.imagesCount ?? 0}</strong>
          <span>тестовых фото</span>
        </article>
        <article style={cardStyle}>
          <strong>{data?.dataset.masksCount ?? 0}</strong>
          <span>эталонных масок</span>
        </article>
        <article style={cardStyle}>
          <strong>{datasetReady ? 'Готов' : 'Нужны данные'}</strong>
          <span>статус датасета</span>
        </article>
      </div>

      {/* Предупреждение если нет данных */}
      {!datasetReady && <DatasetEmptyState />}

      {/* Метрики последнего прогона */}
      {hasMetrics && (
        <section style={{ ...panelStyle, marginTop: 24 }}>
          <h2 style={headingStyle}>Результаты последней оценки</h2>
          <p style={{ color: '#735234', marginBottom: 16 }}>
            На основе {data?.latest?.imagesCount || 0} тестовых фото
            {data?.latest?.createdAt && ` · ${new Date(data.latest.createdAt).toLocaleDateString('ru-RU')}`}
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            marginBottom: 24,
          }}>
            {[
              { key: 'IoU', value: data?.latest?.meanIoU },
              { key: 'Dice', value: data?.latest?.meanDice },
              { key: 'Precision', value: data?.latest?.meanPrecision },
              { key: 'Recall', value: data?.latest?.meanRecall },
            ].map(({ key, value }) => {
              const rating = getMetricRating(key, value);
              return (
                <MetricCard
                  key={key}
                  label={key}
                  value={formatMetric(value)}
                  rating={rating}
                />
              );
            })}
          </div>

          {/* Пояснения к метрикам */}
          <div style={{ display: 'grid', gap: 16 }}>
            {Object.entries(metricExplanations).map(([key, explanation]) => {
              const value = data?.latest?.[`mean${key}` as keyof typeof data.latest];
              const rating = getMetricRating(key, value as number | undefined);

              return (
                <div key={key} style={explanationCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h3 style={{ margin: 0, color: '#30493a', fontSize: 18 }}>
                      {key} — {explanation.title}
                    </h3>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 12,
                      background: rating.color,
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 700,
                    }}>
                      {formatMetric(value as number)} — {rating.label}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 8px', color: '#556b60', lineHeight: 1.5 }}>
                    {explanation.description}
                  </p>
                  <p style={{ margin: 0, color: '#735234', fontSize: 14, fontStyle: 'italic' }}>
                    {explanation.example}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Как читать метрики */}
      <section style={{ ...panelStyle, marginTop: 24 }}>
        <h2 style={headingStyle}>Как улучшить метрики</h2>
        <div style={{ display: 'grid', gap: 12, color: '#4b4b46', lineHeight: 1.6 }}>
          <p>Метрики растут когда:</p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li>В датасете больше 5-10 разнообразных фото комнат</li>
            <li>Эталонные маски тщательно выделяют только стены (без мебели, окон, дверей)</li>
            <li>Фото сделаны при хорошем освещении, стены видны четко</li>
            <li>SegFormer получает качественные входные изображения</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            Для пересчета метрик добавьте фото в <code>test_data/segmentation/images/</code>,
            маски в <code>test_data/segmentation/masks_gt/</code> и запустите оценку.
          </p>
        </div>
      </section>
    </main>
  );
};

const DatasetEmptyState: React.FC = () => (
  <section style={{ ...panelStyle, marginTop: 24, background: '#f7f8f4' }}>
    <h2 style={headingStyle}>Тестовый набор пока пустой</h2>
    <p style={{ color: '#4b4b46', lineHeight: 1.55 }}>
      Чтобы получить реальные метрики качества, добавьте пары файлов: фото комнаты и эталонную маску стены.
      Маска должна быть черно-белой: белая область — стена, черная — всё остальное.
    </p>
    <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
      <code>test_data/segmentation/images/room_001.jpg</code>
      <code>test_data/segmentation/masks_gt/room_001.png</code>
    </div>
  </section>
);

const cardStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  padding: 18,
  borderRadius: 8,
  border: '1px solid #e0d6cc',
  background: '#fffcf8',
};

const panelStyle: React.CSSProperties = {
  padding: 22,
  borderRadius: 8,
  border: '1px solid #e0d6cc',
  background: '#fffdfa',
};

const headingStyle: React.CSSProperties = {
  color: '#30493a',
  marginTop: 0,
};

const explanationCardStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 8,
  border: '1px solid #e0d6cc',
  background: '#fffcf8',
};

const MetricCard: React.FC<{ label: string; value: string; rating: { label: string; color: string } }> = ({ label, value, rating }) => (
  <div style={{ ...cardStyle, background: '#f7f8f4' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#735234', fontWeight: 700 }}>{label}</span>
      <span style={{
        padding: '2px 8px',
        borderRadius: 10,
        background: rating.color,
        color: '#fff',
        fontSize: 11,
        fontWeight: 700,
      }}>
        {rating.label}
      </span>
    </div>
    <strong style={{ fontSize: 32, color: '#30493a' }}>{value}</strong>
  </div>
);

export default MlMetrics;