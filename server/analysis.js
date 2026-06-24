const RANKS = [
  { min: 9.2, rank: 'TRUE ADAM', label: 'Абсолютный пик', color: '#a5f3fc' },
  { min: 8.5, rank: 'CHAD', label: 'Высший эшелон', color: '#ffd700' },
  { min: 7.5, rank: 'HTN', label: 'Высокий потенциал', color: '#22c55e' },
  { min: 6.0, rank: 'MTN', label: 'Средний уровень', color: '#3b82f6' },
  { min: 4.5, rank: 'LTN', label: 'Ниже среднего', color: '#f97316' },
  { min: 3.0, rank: 'SUB5', label: 'Sub-5', color: '#ef4444' },
  { min: 0, rank: 'SUB3', label: 'Sub-3', color: '#991b1b' },
];

const METRIC_NAMES = {
  symmetry: 'Симметрия',
  cheekbones: 'Скулы',
  jawline: 'Челюсть',
  hunterEyes: 'Hunter Eyes',
  canthalTilt: 'Кантальный наклон',
  philtrum: 'Филтрум',
  nose: 'Нос',
  lips: 'Губы',
  midface: 'Средняя треть',
  lowerThird: 'Нижняя треть',
  eyeSpacing: 'Расстояние глаз',
  browRidge: 'Надбровные дуги',
  skinQuality: 'Кожа',
  dimorphism: 'Диморфизм',
  aging: 'Потенциал старения',
};

function clamp(v, min = 0, max = 10) {
  if (!Number.isFinite(v)) return (min + max) / 2;
  return Math.max(min, Math.min(max, v));
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function getRank(score) {
  return RANKS.find((r) => score >= r.min) || RANKS[RANKS.length - 1];
}

function generateAdvice(metrics, rank) {
  const weak = Object.entries(metrics)
    .filter(([, v]) => v < 6)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3);

  const strong = Object.entries(metrics)
    .filter(([, v]) => v >= 7.5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const tips = [];

  if (weak.length) {
    const [key] = weak[0];
    const tipsMap = {
      symmetry: 'Проверь освещение и позу — асимметрия часто от угла съёмки. Массаж лица и осознанная мимика помогают.',
      cheekbones: 'Снижение % жира до 10-12% подчеркнёт скулы. Мьюинг + кардио — базовый стек.',
      jawline: 'Мьюинг, жевательная резинка (mastic), снижение соли — классика для челюсти.',
      hunterEyes: 'Позитивный кантальный наклон — от век. Убери отёки: сон, меньше соли, кофеиновые патчи.',
      canthalTilt: 'Тренируй верхнее веко, работай с бровями — поднятие дуги визуально улучшает tilt.',
      philtrum: 'Усы/борода могут скрыть длинный филтрум. Губная гигиена и увлажнение — must.',
      nose: 'Контуринг носа, правильный угол фото. При сильной проблеме — консультация хирурга.',
      lips: 'Увлажнение, SPF, бальзам. Губная гигиена underrated.',
      midface: 'Борода с правильной линией нижней челюсти компенсирует длинный midface.',
      lowerThird: 'Работа над челюстью и шеей — основной рычаг для нижней трети.',
      eyeSpacing: 'Прическа и брови могут визуально скорректировать расстояние глаз.',
      browRidge: 'Густые брови добавляют массивности. Прокачай брови — это frame maxxing.',
      skinQuality: 'Ретинол, SPF 50, витамин C, 8ч сна. Скинмаксинг = 80% glow up.',
      dimorphism: 'Низкий голос, широкие плечи, агрессивный стайлинг усиливают мужские черты.',
      aging: 'SPF каждый день, ретинол, коллаген, сон. Начни сейчас — через 5 лет скажешь спасибо.',
    };
    tips.push(tipsMap[key] || 'Работай над слабыми зонами системно — consistency > intensity.');
  }

  if (rank.rank === 'TRUE ADAM' || rank.rank === 'CHAD' || rank.rank === 'HTN') {
    tips.push('Ты уже в верхнем процентиле. Фокус: стиль, харизма, социальный капитал.');
  } else if (rank.rank === 'MTN') {
    tips.push('У тебя solid база. 6-12 месяцев дисциплины — и ты в HTN зоне.');
  } else if (rank.rank === 'LTN' || rank.rank === 'SUB5') {
    tips.push('Не демотивируйся — 80% внешности это то, что ты контролируешь: жир, кожа, стиль, осанка.');
  } else {
    tips.push('Суб-уровень — не приговор. Системный glow up за 6-12 мес реально поднять на 2-3 ранга.');
  }

  return {
    strengths: strong.map(([k, v]) => ({
      name: METRIC_NAMES[k],
      score: Math.round(v * 10) / 10,
    })),
    weaknesses: weak.map(([k, v]) => ({
      name: METRIC_NAMES[k],
      score: Math.round(v * 10) / 10,
    })),
    tips,
  };
}

function lmDist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** Угол челюсти: острый ≈ квадрат, мягкий ≈ круг/овал */
function jawAngularity(lm) {
  const chin = lm(152);
  const left = lm(234);
  const right = lm(454);
  const v1x = left.x - chin.x, v1y = left.y - chin.y;
  const v2x = right.x - chin.x, v2y = right.y - chin.y;
  const dot = v1x * v2x + v1y * v2y;
  const m1 = Math.hypot(v1x, v1y) || 0.01;
  const m2 = Math.hypot(v2x, v2y) || 0.01;
  const angle = Math.acos(Math.max(-1, Math.min(1, dot / (m1 * m2)))) * (180 / Math.PI);
  return angle; // квадрат ~95-130°, круг ~55-85°
}

/**
 * 7 форм лица по стандарту (овальный, круглый, квадратный, сердце,
 * ромб, прямоугольный, треугольник).
 * Сначала — кто шире (лоб / скулы / челюсть), потом длина и углы.
 */
function detectFaceShapeFromLandmarks(landmarks) {
  if (!landmarks || landmarks.length < 468) return { shape: 'овальный', confidence: 50 };

  const lm = (i) => landmarks[i];

  const foreheadW = lmDist(lm(71), lm(301));
  const cheekW = lmDist(lm(123), lm(352));
  const jawW = lmDist(lm(234), lm(454));
  const chinW = lmDist(lm(172), lm(397));

  const faceH = Math.abs(lm(152).y - lm(10).y) || 0.01;
  const maxW = Math.max(foreheadW, cheekW, jawW);

  const lengthRatio = faceH / maxW;
  const jawAngle = jawAngularity(lm);

  const f2j = foreheadW / (jawW || 0.01);       // лоб / челюсть
  const c2f = cheekW / (foreheadW || 0.01);   // скулы / лоб
  const c2j = cheekW / (jawW || 0.01);         // скулы / челюсть
  const j2f = jawW / (foreheadW || 0.01);     // челюсть / лоб
  const chinRatio = chinW / (jawW || 0.01);

  const widthSpread = maxW / (Math.min(foreheadW, cheekW, jawW) || 0.01);
  // широкий подбородок + широкий угол = квадрат; сужение = круг/сердце
  const isAngular = jawAngle > 120 || chinRatio > 0.68;
  const isSoft = jawAngle < 118 && chinRatio < 0.66;

  const scores = {
    овальный: 0,
    круглый: 0,
    квадратный: 0,
    сердце: 0,
    ромбовидный: 0,
    прямоугольный: 0,
    треугольный: 0,
  };

  const secondW = [foreheadW, cheekW, jawW].sort((a, b) => b - a)[1];
  const dominantMargin = maxW / (secondW || 0.01);

  const widestIsCheek = cheekW === maxW && dominantMargin > 1.05;
  const widestIsJaw = jawW === maxW && dominantMargin > 1.05;
  const widestIsForehead = foreheadW === maxW && dominantMargin > 1.05;

  // ── Фаза 1: явный лидер по ширине (нужен запас >5%) ──────

  if (widestIsCheek) {
    scores.ромбовидный += 10;
    if (foreheadW < jawW * 1.04 && jawW < foreheadW * 1.04) scores.ромбовидный += 4;
    scores.квадратный -= 8;
    scores.треугольный -= 5;
    scores.круглый -= 4;
  }

  if (widestIsForehead && foreheadW > jawW * 1.08) {
    scores.сердце += 10;
    if (chinRatio < 0.65) scores.сердце += 4;
    scores.квадратный -= 6;
    scores.треугольный -= 7;
    scores.ромбовидный -= 4;
  }

  if (widestIsJaw && jawW > foreheadW * 1.08) {
    scores.треугольный += 10;
    if (j2f > 1.12) scores.треугольный += 4;
    scores.квадратный -= 7;
    scores.сердце -= 7;
    scores.ромбовидный -= 4;
  }

  // ── Фаза 2: длина лица (приоритет над слабым ромбом) ─────

  const balanced = widthSpread < 1.18;

  if (lengthRatio > 1.52) {
    scores.прямоугольный += 10;
    if (balanced) scores.прямоугольный += 5;
    scores.ромбовидный -= 6;
    scores.круглый -= 6;
    scores.квадратный -= 5;
  } else if (lengthRatio > 1.44 && lengthRatio <= 1.52) {
    scores.овальный += 5;
    scores.прямоугольный += 3;
  }

  // КОМПАКТНОЕ ЛИЦО (длина ≈ ширина): круглый vs квадратный
  if (lengthRatio < 1.24 && balanced) {
    const uniformW = Math.abs(f2j - 1) < 0.10 && Math.abs(c2j - 1) < 0.12;
    const wideChin = chinRatio > 0.64;
    const narrowChin = chinRatio < 0.58;

    if (uniformW && wideChin) {
      scores.квадратный += 12;
      scores.круглый -= 8;
    } else if (lengthRatio < 1.18 || narrowChin) {
      scores.круглый += 12;
      scores.квадратный -= 7;
    } else if (uniformW && isAngular) {
      scores.квадратный += 9;
      scores.круглый -= 5;
    } else {
      scores.круглый += 9;
      scores.квадратный -= 4;
    }
    scores.прямоугольный -= 7;
  } else if (lengthRatio >= 1.24 && lengthRatio < 1.36 && isAngular && balanced) {
    scores.квадратный += 8;
    if (Math.abs(f2j - 1) < 0.10) scores.квадратный += 4;
    scores.круглый -= 5;
    scores.треугольный -= 4;
  }

  if (lengthRatio >= 1.26 && lengthRatio <= 1.48 && !widestIsCheek && !widestIsJaw) {
    scores.овальный += 6;
    if (foreheadW >= jawW * 0.96 && foreheadW <= jawW * 1.12) scores.овальный += 4;
    if (cheekW >= jawW * 0.94) scores.овальный += 2;
  }

  if (!widestIsCheek && !widestIsJaw && !widestIsForehead && balanced) {
    scores.овальный += 3;
  }

  scores.овальный += 1;

  let best = 'овальный';
  let bestScore = -Infinity;
  for (const [shape, s] of Object.entries(scores)) {
    if (s > bestScore) {
      bestScore = s;
      best = shape;
    }
  }

  const confidence = Math.min(95, Math.max(55, Math.round(55 + bestScore * 3)));
  return { shape: best, confidence };
}

function getStyleRecommendation(metrics, rank, faceShape) {
  const styles = [];

  if (metrics.jawline >= 7) {
    styles.push('Короткая стрижка с текстурой (crop, textured fringe) подчеркнёт челюсть.');
  } else if (metrics.jawline < 6) {
    styles.push('Объём сверху + лёгкая борода по линии челюсти — визуально расширит нижнюю треть.');
  }

  if (metrics.hunterEyes >= 7.5) {
    styles.push('Минималистичный стиль: монохром, slim fit, без лишних аксессуаров — глаза и так доминируют.');
  } else {
    styles.push('Очки с тонкой оправой или browline frames усилят верхнюю часть лица.');
  }

  if (metrics.cheekbones >= 7.5) {
    styles.push('Зауженные рубашки, V-образный силуэт, слои на плечах — скулы уже дают объём.');
  }

  if (metrics.dimorphism >= 7) {
    styles.push('Dark academia / old money: пальто, рубашки, часы — мужественный вайб в тренде.');
  } else {
    styles.push('Smart casual: чистые линии, нейтральные тона, ухоженный минимализм.');
  }

  const styleByShape = {
    прямоугольный: 'Средняя длина с боковым пробором — визуально укоротит лицо.',
    квадратный: 'Текстурированный верх + fade по бокам — смягчит углы, сохранив masculinity.',
    круглый: 'Высота сверху (quiff, pompadour) — вытянет лицо визуально.',
    треугольный: 'Объём на макушке и висках — балансирует широкую челюсть.',
    ромбовидный: 'Текстурная чёлка и объём на лбу — балансирует широкие скулы.',
    сердце: 'Объём по бокам, короче сверху — балансирует широкий лоб.',
  };
  if (styleByShape[faceShape]) styles.push(styleByShape[faceShape]);

  if (rank.rank === 'TRUE ADAM' || rank.rank === 'CHAD' || rank.rank === 'HTN') {
    styles.push('Тебе подходит bold styling — экспериментируй с цветом и statement pieces.');
  }

  return { faceShape, styles };
}

function generateDetailedProfile(score, rank, metrics, faceShape) {
  const { styles } = getStyleRecommendation(metrics, rank, faceShape);

  const topMetrics = Object.entries(metrics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `${METRIC_NAMES[k]} (${(Math.round(v * 10) / 10).toFixed(1)})`);

  const weakMetrics = Object.entries(metrics)
    .filter(([, v]) => v < 6)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([k, v]) => `${METRIC_NAMES[k]} (${(Math.round(v * 10) / 10).toFixed(1)})`);

  const eyeType = metrics.hunterEyes >= 7.5
    ? 'Hunter eyes — глубокая посадка, позитивный tilt. Это один из самых ценных активов в мужской эстетике.'
    : metrics.hunterEyes >= 6
      ? 'Средняя глубина глаз. С правильным сном и работой с отёками можно приблизиться к hunter eye aesthetic.'
      : 'Prey eye tendency — верхнее веко доминирует. Работа с отёками, бровями и осанкой даст заметный прирост.';

  const jawDesc = metrics.jawline >= 7.5
    ? 'Чёткая линия челюсти — один из твоих главных козырей. Подчеркивай её стрижкой и низким % жира.'
    : metrics.jawline >= 6
      ? 'Челюсть в норме, но есть потенциал. Мьюинг + mewing + снижение body fat % — твой путь.'
      : 'Слабая проекция челюсти — приоритет #1. Борода, mewing, жевательная резинка, neck training.';

  const skinDesc = metrics.skinQuality >= 7
    ? 'Кожа в хорошем состоянии — поддерживай ретинол + SPF стек.'
    : 'Кожа требует внимания. Скинмаксинг даст самый быстрый визуальный прирост — до +1.5 балла за 3 месяца.';

  const sections = [
    `Твой тип лица: ${faceShape}. Общий балл ${score}/10 (${rank.rank} — ${rank.label}).`,
    `Топ-3 черты: ${topMetrics.join(', ')}.`,
    weakMetrics.length
      ? `Зоны для прокачки: ${weakMetrics.join(', ')}.`
      : 'Слабых зон минимум — фокус на поддержании и стиле.',
    eyeType,
    jawDesc,
    skinDesc,
    `Стиль, который тебе подойдёт: ${styles.join(' ')}`,
  ];

  return sections.join('\n\n');
}

export function generateTrainingProgram(metrics, rank) {
  const weeks = [];

  const focusAreas = Object.entries(metrics)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 5);

  weeks.push({
    week: 1,
    title: 'Фундамент: сон, питание, кожа',
    tasks: [
      'Сон 7-8ч минимум — отёки уходят, hunter eyes улучшаются за 2 недели.',
      'Вода 2.5л/день, соль <5г — лицо сразу станет leaner.',
      'Утро: умывание + SPF 50. Вечер: ретинол 0.025% через день.',
      'Дневник питания: белок 1.6г/кг, дефицит 300-500 ккал если BF% >15%.',
      metrics.skinQuality < 7 ? 'Добавь витамин C serum утром + ниацинамид.' : 'Поддерживай текущий скин-стек.',
    ],
  });

  weeks.push({
    week: 2,
    title: 'Челюсть и скулы',
    tasks: [
      'Mewing: язык на нёбе 24/7, губы сомкнуты, носовое дыхание.',
      'Mastic gum 20 мин/день — жевательные мышцы + проекция челюсти.',
      'Жевательная гимнастика: открыть-закрыть рот с сопротивлением 3×15.',
      metrics.cheekbones < 7
        ? 'Снижай BF%: кардио 3×30мин + силовые 3×/нед. Скулы появятся на 12-14% BF.'
        : 'Поддерживай BF% 10-14% — скулы уже на уровне, не теряй lean mass.',
      'Холодный душ на лицо 30 сек — тонус кожи и скульптурность.',
    ],
  });

  weeks.push({
    week: 3,
    title: 'Шея, осанка, подбородок',
    tasks: [
      'Neck curls: 3×20 с лёгким весом — толстая шея = доминантный профиль.',
      'Neck extensions: 3×15 — баланс передней и задней цепи.',
      'Осанка: chin tucks 3×10, wall angels 3×15 — forward head posture убирает подбородок.',
      'Подбородок на грудь stretch 30 сек × 3 — расслабление трапеции.',
      metrics.lowerThird < 6.5
        ? 'Дополнительно: face pulling 5 мин/день для проекции maxilla.'
        : 'Поддерживай осанку — нижняя треть в норме.',
    ],
  });

  weeks.push({
    week: 4,
    title: 'Глаза, брови, upper third',
    tasks: [
      metrics.hunterEyes < 7
        ? 'Кофеиновые патчи под глаза утром, cold spoons 5 мин — убрать отёки.'
        : 'Hunter eyes на уровне — поддерживай сон и гидратацию.',
      'Брови: выщипай монобровь, форма flat/thick — frame maxxing.',
      metrics.canthalTilt < 7
        ? 'Массаж век: безымянный палец от уголка к виску 2 мин/день.'
        : 'Кантальный tilt хороший — не трогай.',
      'Видео-запись профиля: проверь brow ridge и forehead slope.',
    ],
  });

  const extraTasks = focusAreas.map(([key]) => {
    const map = {
      symmetry: 'Фоткайся строго фронтально, одно освещение — отслеживай симметрию еженедельно.',
      cheekbones: 'Буккальный fat removal massage: 5 мин/день от носа к уху.',
      jawline: 'Jawzrsize или аналог: 10 мин жевания с сопротивлением.',
      hunterEyes: 'Спи на спине, высокая подушка — отёки не накапливаются.',
      nose: 'Носовое дыхание only — mewing автоматически улучшает профиль носа.',
      lips: 'Увлажнение губ 3×/день, не облизывай — сухость портит оценку.',
      skinQuality: 'Пилинг AHA 1×/нед, маска глины 1×/нед.',
      dimorphism: 'Голосовые упражнения: humming низких нот 5 мин — голос глубже.',
      aging: 'Коллаген 10г/день + SPF — anti-aging база.',
    };
    return map[key] || `Работай над ${METRIC_NAMES[key]} — ежедневная дисциплина.`;
  });

  weeks.push({
    week: 5,
    title: 'Персональный фокус + стиль',
    tasks: [
      ...extraTasks.slice(0, 3),
      `Стрижка под твою форму лица — сходи к барберу с этим анализом.`,
      rank.rank === 'LTN' || rank.rank === 'SUB5' || rank.rank === 'SUB3'
        ? 'Пересними анализ через 30 дней — отслеживай прогресс в истории.'
        : 'Поддерживай режим — ты на правильном пути.',
    ],
  });

  weeks.push({
    week: 6,
    title: 'Интеграция и контроль',
    tasks: [
      'Полный день режима: сон → скин → mewing → тренировка → питание.',
      'Сделай новое фото и сравни с первым анализом в истории.',
      'Оцени прогресс по 3 слабым метрикам — записывай цифры.',
      'Скорректируй программу: что сработало, что нет.',
      `Цель: +0.5-1.0 балла за 6 недель. Текущий ранг: ${rank.rank}.`,
    ],
  });

  return {
    title: '6-недельная программа Looksmaxxing',
    subtitle: `Персональный план на основе твоего анализа (${rank.rank})`,
    weeks,
    disclaimer: 'Программа основана на анализе черт лица. Результаты зависят от дисциплины и генетики.',
  };
}

function round1(v) {
  return Math.round(v * 10) / 10;
}

function score10(v) {
  return round1(clamp(v));
}

/** Симметрия и пропорции по парам landmark'ов — не одна точка носа */
function computeMetricsFromLandmarks(landmarks, rand) {
  const neutral = 5.5;
  const micro = () => (rand() - 0.5) * 0.2;

  if (!landmarks || landmarks.length < 468) {
    const jitter = () => (rand() - 0.5) * 0.6;
    return {
      symmetry: clamp(neutral + jitter()),
      cheekbones: clamp(neutral + jitter()),
      jawline: clamp(neutral + jitter()),
      hunterEyes: clamp(neutral + jitter()),
      canthalTilt: clamp(neutral + jitter()),
      philtrum: clamp(neutral + jitter()),
      nose: clamp(neutral + jitter()),
      lips: clamp(neutral + jitter()),
      midface: clamp(neutral + jitter()),
      lowerThird: clamp(neutral + jitter()),
      eyeSpacing: clamp(neutral + jitter()),
      browRidge: clamp(neutral + jitter()),
      skinQuality: clamp(neutral + jitter()),
      dimorphism: clamp(neutral + jitter()),
      aging: clamp(neutral + jitter()),
    };
  }

  const lm = (i) => landmarks[i];
  const leftEye = lm(33);
  const rightEye = lm(263);
  const chin = lm(152);
  const forehead = lm(10);
  const faceH = Math.abs(chin.y - forehead.y) || 0.01;
  const midX = (leftEye.x + rightEye.x) / 2;
  const jawWidth = lmDist(lm(234), lm(454)) || 0.01;
  const cheekWidth = lmDist(lm(123), lm(352)) || jawWidth;
  const faceWidth = Math.max(cheekWidth, jawWidth);

  const xPairs = [
    [33, 263], [133, 362], [61, 291], [234, 454], [123, 352],
    [70, 300], [107, 336], [172, 397], [49, 279], [159, 386],
  ];
  let xAsymSum = 0;
  for (const [li, ri] of xPairs) {
    const dL = Math.abs(lm(li).x - midX);
    const dR = Math.abs(lm(ri).x - midX);
    const avg = (dL + dR) / 2 || 0.001;
    xAsymSum += Math.abs(dL - dR) / avg;
  }
  const xAsym = xAsymSum / xPairs.length;

  const yPairs = [[61, 291], [70, 300], [33, 263], [234, 454], [159, 386], [107, 336]];
  let yAsymSum = 0;
  for (const [li, ri] of yPairs) {
    yAsymSum += Math.abs(lm(li).y - lm(ri).y) / faceH;
  }
  const yAsym = yAsymSum / yPairs.length;

  let symmetry = clamp(10 - xAsym * 26 - yAsym * 42);

  const leftJaw = lm(234);
  const rightJaw = lm(454);
  const jawRatio = jawWidth / faceH;
  const jawAngle = jawAngularity(lm);
  const jawAsymX =
    Math.abs(Math.abs(leftJaw.x - midX) - Math.abs(rightJaw.x - midX)) / (jawWidth / 2 || 0.01);

  let jawline = clamp(4 + ((jawAngle - 95) / 35) * 4.5);
  jawline = clamp(jawline + (jawRatio - 0.5) * 4 - jawAsymX * 4);
  symmetry = clamp(symmetry - jawAsymX * 1.5);

  const cheekRatio = cheekWidth / jawWidth;
  const foreheadW = lmDist(lm(71), lm(301));
  const cheekProminence = cheekWidth / Math.max(foreheadW, jawWidth);
  let cheekbones = clamp(4.5 + cheekRatio * 2.8 + cheekProminence * 3.2);

  const eyeOpenL = lmDist(lm(159), lm(145));
  const eyeOpenR = lmDist(lm(386), lm(374));
  const eyeW = lmDist(leftEye, rightEye);
  const eyeAperture = (eyeOpenL + eyeOpenR) / 2 / (eyeW || 0.01);
  const tiltL = lm(133).y - lm(33).y;
  const tiltR = lm(362).y - lm(263).y;
  const tilt = (tiltL + tiltR) / 2;
  const canthalTilt = clamp(4.5 + tilt * 32);
  const hunterEyes = clamp(5 + eyeAperture * 18 + tilt * 28 + 1.5);

  const ipdRatio = eyeW / faceWidth;
  const eyeSpacing = clamp(10 - (Math.abs(ipdRatio - 0.38) / 0.14) * 4);

  const noseW = lmDist(lm(49), lm(279));
  const nose = clamp(10 - (Math.abs(noseW / faceWidth - 0.28) / 0.1) * 4);

  const mouthW = lmDist(lm(61), lm(291));
  const lips = clamp(10 - (Math.abs(mouthW / faceWidth - 0.42) / 0.12) * 4);

  const upperLip = lm(13);
  const philtrumLen = Math.abs(upperLip.y - lm(2).y) / faceH;
  const philtrum = clamp(10 - (Math.abs(philtrumLen - 0.04) / 0.025) * 4);

  const midfaceLen = Math.abs(upperLip.y - lm(1).y) / faceH;
  const midface = clamp(10 - (Math.abs(midfaceLen - 0.16) / 0.06) * 4);

  const lowerLen = Math.abs(chin.y - upperLip.y) / faceH;
  let lowerThird = clamp(10 - (Math.abs(lowerLen - 0.34) / 0.08) * 4);
  lowerThird = clamp(lowerThird * 0.45 + jawline * 0.55);

  const browThickL = lmDist(lm(70), lm(107));
  const browThickR = lmDist(lm(300), lm(336));
  const browThickAvg = (browThickL + browThickR) / 2;
  const browAsym = Math.abs(browThickL - browThickR) / (browThickAvg || 0.01);
  const browHeightAsym = Math.abs(lm(70).y - lm(300).y) / faceH;
  const browRidge = clamp(
    4.5 + (browThickAvg / faceH) * 38 - browAsym * 4 - browHeightAsym * 22
  );
  symmetry = clamp(symmetry - browAsym * 1.2 - browHeightAsym * 12);

  const dimorphism = clamp(
    jawline * 0.35 + browRidge * 0.25 + cheekbones * 0.2 + lowerThird * 0.2
  );

  const skinQuality = clamp(6.2 + (rand() - 0.5) * 1.0);

  const bagProxy = (lmDist(lm(145), lm(25)) + lmDist(lm(374), lm(255))) / 2 / faceH;
  const aging = clamp(8 - bagProxy * 20);

  return {
    symmetry: clamp(symmetry + micro()),
    cheekbones: clamp(cheekbones + micro()),
    jawline: clamp(jawline + micro()),
    hunterEyes: clamp(hunterEyes + micro()),
    canthalTilt: clamp(canthalTilt + micro()),
    philtrum: clamp(philtrum + micro()),
    nose: clamp(nose + micro()),
    lips: clamp(lips + micro()),
    midface: clamp(midface + micro()),
    lowerThird: clamp(lowerThird + micro()),
    eyeSpacing: clamp(eyeSpacing + micro()),
    browRidge: clamp(browRidge + micro()),
    skinQuality: clamp(skinQuality),
    dimorphism: clamp(dimorphism + micro()),
    aging: clamp(aging + micro()),
  };
}

function computeProportionsFromLandmarks(landmarks) {
  if (!landmarks || landmarks.length < 468) return null;

  const lm = (i) => landmarks[i];
  const faceH = Math.abs(lm(152).y - lm(10).y) || 0.01;
  const faceW = lmDist(lm(234), lm(454)) || 0.01;
  const cheekW = lmDist(lm(123), lm(352)) || faceW;
  const widthForRatios = Math.max(cheekW, faceW);
  const browLineY = (lm(107).y + lm(336).y) / 2;
  const noseBaseY = lm(2).y;
  const upperThird = Math.abs(browLineY - lm(10).y) / faceH;
  const middleThird = Math.abs(noseBaseY - browLineY) / faceH;
  const lowerThirdVal = Math.abs(lm(152).y - noseBaseY) / faceH;
  const eyeW = lmDist(lm(33), lm(263));
  const philtrumLen = Math.abs(lm(13).y - noseBaseY) / faceH;
  const chinLen = Math.abs(lm(152).y - lm(13).y) / faceH;

  return {
    faceRatio: faceH / widthForRatios,
    upperThird,
    middleThird,
    lowerThirdVal,
    eyeSpacing: eyeW / widthForRatios,
    philtrumChin: philtrumLen / (chinLen || 0.01),
  };
}

function calibrateOverallScore(rawScore, metrics) {
  const anchorMetrics = [
    metrics.jawline,
    metrics.cheekbones,
    metrics.browRidge,
    metrics.nose,
    metrics.symmetry,
    metrics.hunterEyes,
    metrics.dimorphism,
    metrics.lips,
  ];
  const topFeatures = [...anchorMetrics].sort((a, b) => b - a).slice(0, 4);
  const peakAvg = topFeatures.reduce((a, b) => a + b, 0) / topFeatures.length;

  const structuralCore =
    (metrics.symmetry * 1.2 +
      metrics.jawline * 1.15 +
      metrics.cheekbones +
      metrics.hunterEyes +
      metrics.nose +
      metrics.browRidge) /
    6.35;

  let score = clamp(rawScore * 0.4 + structuralCore * 0.45 + peakAvg * 0.15);

  if (metrics.symmetry < 5) {
    score = Math.min(score, metrics.symmetry + 1.8);
  }
  if (metrics.symmetry < 4) {
    score = Math.min(score, 5.2);
  }

  if (peakAvg >= 8 && metrics.symmetry >= 6.5) {
    score = Math.max(score, 7.2);
  }
  if (peakAvg >= 8.5 && metrics.jawline >= 8 && metrics.symmetry >= 7) {
    score = Math.max(score, 7.8);
  }

  return clamp(score);
}

function proportionStatus(value, ideal, tolerance = 0.15) {
  const diff = Math.abs(value - ideal);
  if (diff <= tolerance * 0.5) return { label: 'Идеал', color: '#22d3ee' };
  if (diff <= tolerance) return { label: 'Хорошо', color: '#3b82f6' };
  if (value > ideal) return { label: 'Удлинён', color: '#a855f7' };
  return { label: 'Широкий', color: '#a855f7' };
}

function generateExtendedReport(metrics, score, rank, faceShape, faceShapeConfidence = 70, landmarkProps = null) {
  const traitScores = [
    { key: 'brows', name: 'Брови', score: score10(metrics.browRidge) },
    { key: 'expressiveness', name: 'Выразительность', score: score10((metrics.hunterEyes + metrics.canthalTilt) / 2) },
    { key: 'harmony', name: 'Гармония', score: score10((metrics.symmetry + metrics.midface + metrics.lowerThird) / 3) },
    { key: 'eyes', name: 'Глаза', score: score10(metrics.hunterEyes) },
    { key: 'lips', name: 'Губы', score: score10(metrics.lips) },
    { key: 'forehead', name: 'Лоб', score: score10((metrics.browRidge + metrics.midface) / 2) },
    { key: 'nose', name: 'Нос', score: score10(metrics.nose) },
    { key: 'chin', name: 'Подбородок', score: score10(metrics.lowerThird) },
    { key: 'proportions', name: 'Пропорции', score: score10((metrics.midface + metrics.lowerThird + metrics.eyeSpacing) / 3) },
    { key: 'symmetry', name: 'Симметрия', score: score10(metrics.symmetry) },
    { key: 'cheekbones', name: 'Скулы', score: score10(metrics.cheekbones) },
    { key: 'skin', name: 'Текстура кожи', score: score10(metrics.skinQuality) },
    {
      key: 'uniqueness',
      name: 'Уникальность',
      score: score10(
        (() => {
          const vals = Object.values(metrics);
          const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
          const spread = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length);
          return 4 + Math.min(spread * 1.1, 4);
        })()
      ),
    },
    { key: 'jaw', name: 'Челюсть', score: score10(metrics.jawline) },
    { key: 'cheeks', name: 'Щёки', score: score10(metrics.cheekbones * 0.7 + metrics.midface * 0.3) },
  ];

  const faceRatio = landmarkProps?.faceRatio ?? 1.35;
  const upperThird = landmarkProps?.upperThird ?? 0.33;
  const middleThird = landmarkProps?.middleThird ?? 0.34;
  const lowerThirdVal = landmarkProps?.lowerThirdVal ?? 0.33;
  const eyeSpacingVal = landmarkProps?.eyeSpacing ?? 1.0;
  const philtrumChin = landmarkProps?.philtrumChin ?? 0.45;

  const proportions = [
    { name: 'Длина лица к ширине', value: round1(faceRatio), ...proportionStatus(faceRatio, 1.38, 0.12) },
    { name: 'Верхняя треть', value: round1(upperThird), ...proportionStatus(upperThird, 0.33, 0.04) },
    { name: 'Средняя треть', value: round1(middleThird), ...proportionStatus(middleThird, 0.34, 0.04) },
    { name: 'Нижняя треть', value: round1(lowerThirdVal), ...proportionStatus(lowerThirdVal, 0.33, 0.04) },
    { name: 'Расстояние между глазами', value: round1(eyeSpacingVal), ...proportionStatus(eyeSpacingVal, 1.0, 0.1) },
    { name: 'Филтрум к подбородку', value: round1(philtrumChin), ...proportionStatus(philtrumChin, 0.45, 0.08) },
  ];

  const characterTraits = [
    { name: 'Доминантность', score: score10(metrics.dimorphism * 0.5 + metrics.jawline * 0.5) },
    { name: 'Надёжность', score: score10(metrics.symmetry * 0.4 + score * 0.6) },
    { name: 'Привлекательность', score: score10(score) },
    { name: 'Уверенность', score: score10(metrics.dimorphism * 0.4 + metrics.browRidge * 0.3 + metrics.jawline * 0.3) },
    { name: 'Харизма', score: score10((metrics.hunterEyes + metrics.canthalTilt + score) / 3) },
  ];

  const characterText = score >= 8
    ? 'Внешность транслирует силу и уверенность. Люди воспринимают тебя как лидера — мужественные черты, выразительный взгляд и гармоничные пропорции создают сильное первое впечатление.'
    : score >= 6.5
      ? 'Сбалансированная внешность с потенциалом. Черты лица вызывают доверие, но усиление челюсти, кожи или стиля поднимет восприятие на новый уровень.'
      : 'Мягкие черты лица. Работа над осанкой, стилем и уходом за кожей значительно изменит то, как тебя считывают окружающие.';

  const harmonyChart = [
    { label: 'Брови', value: score10(metrics.browRidge) },
    { label: 'Глаза', value: score10(metrics.hunterEyes) },
    { label: 'Губы', value: score10(metrics.lips) },
    { label: 'Лоб', value: score10((metrics.browRidge + metrics.midface) / 2) },
    { label: 'Нос', value: score10(metrics.nose) },
    { label: 'Симметрия', value: score10(metrics.symmetry) },
    { label: 'Скулы', value: score10(metrics.cheekbones) },
    { label: 'Челюсть', value: score10(metrics.jawline) },
  ];

  const agePotential = round1(metrics.aging);
  const ageText = agePotential >= 8
    ? `Потенциал ${round1(agePotential - 0.5)}+ к 40 годам. Хорошая костная структура и уход за кожей — ты будешь age like fine wine.`
    : agePotential >= 6.5
      ? `Потенциал ${round1(agePotential - 1)}+ к 40. Начни SPF и ретинол сейчас — это +1.5 балла через 5 лет.`
      : 'Потенциал средний. Агрессивный скинмаксинг и сон — главные рычаги для долгосрочного результата.';

  const strongSides = [];
  if (metrics.jawline >= 7) strongSides.push('Мощная, чёткая линия нижней челюсти');
  if (metrics.cheekbones >= 7) strongSides.push('Высокие скулы с хорошей проекцией');
  if (metrics.hunterEyes >= 7) strongSides.push('Выразительные hunter eyes');
  if (metrics.symmetry >= 7.5) strongSides.push('Высокая симметрия лица');
  if (metrics.dimorphism >= 7) strongSides.push('Выраженный мужской диморфизм');
  if (metrics.skinQuality >= 7) strongSides.push('Хорошее состояние и текстура кожи');
  if (metrics.nose >= 7) strongSides.push('Гармоничный профиль носа');
  if (metrics.canthalTilt >= 7.5) strongSides.push('Позитивный кантальный наклон глаз');
  if (strongSides.length < 2 && score >= 6.5) {
    strongSides.push('Молодой потенциал — база для системной работы');
  }
  if (strongSides.length === 0) {
    strongSides.push('Чётко определены зоны роста — фокус даст быстрый визуальный эффект');
  }

  const recommendations = [];
  if (metrics.jawline < 7) {
    recommendations.push('Mewing 24/7 + mastic gum 15 мин/день — проекция челюсти улучшается за 4-6 мес.');
  }
  if (metrics.skinQuality < 7) {
    recommendations.push('Скинмаксинг: ретинол ночью + SPF 50 утром + ниацинамид — +1.5 балла за 2-3 мес.');
  }
  if (metrics.cheekbones < 7) {
    // умная рекомендация: не упоминать жир, давать структурные советы
    if (metrics.cheekbones < 5.5) {
      recommendations.push('Работай над bone structure: mewing + neck training поднимают структуру лица.');
    } else {
      recommendations.push('Холодный массаж скул (гуаша) и снижение соли в рационе — убирает отёки за 2 нед.');
    }
  }
  if (metrics.hunterEyes < 7) {
    recommendations.push('Убери отёки под глазами: сон 8ч строго, кофеиновые патчи утром, меньше соли.');
  }
  if (metrics.browRidge < 7) {
    recommendations.push('Frame maxxing: густые брови с правильной формой меняют взгляд кардинально.');
  }
  if (metrics.symmetry < 7) {
    recommendations.push('Фотографируйся строго фронтально — 70% асимметрии исчезает при правильном угле.');
  }
  recommendations.push(`Стрижка под ${faceShape} форму — раздел ниже, с барбером это +0.5 балла визуально.`);
  recommendations.push('Повтори анализ через 4-6 недель — отслеживай прогресс по каждой метрике.');

  // --- СТРИЖКИ (7 форм лица) ---
  const haircutMap = {
    квадратный: {
      icon: '🟫',
      label: 'Квадратный',
      goal: 'Смягчить угловатость, сохранив masculinity',
      cuts: [
        { name: 'Textured Crop', desc: 'Короткий верх с текстурой, fade по бокам — классика для квадрата' },
        { name: 'Caesar Cut', desc: 'Ровная чёлка с fade — смягчает углы челюсти' },
        { name: 'Side Part Fade', desc: 'Пробор + fade — добавляет асимметрию, балансирует ширину' },
        { name: 'French Crop', desc: 'Короткий верх, skin fade — подчёркивает структуру без лишнего объёма' },
      ],
      avoid: 'Избегай: длинные волосы по бокам, центральный пробор — усилят ширину',
    },
    прямоугольный: {
      icon: '🟦',
      label: 'Прямоугольный / Вытянутый',
      goal: 'Визуально укоротить лицо, добавить ширину',
      cuts: [
        { name: 'Curtains / Middle Part', desc: 'Средний пробор — укорачивает лицо, добавляет ширину' },
        { name: 'Side Swept Fringe', desc: 'Боковая чёлка — укорачивает верхнюю треть' },
        { name: 'Horizontal Quiff', desc: 'Объём вбок, не вверх — горизонталь важнее вертикали' },
        { name: 'Fringe + Taper', desc: 'Чёлка до бровей + taper fade — лучший выбор для длинного лица' },
      ],
      avoid: 'Избегай: высокий pompadour, mohawk, ирокез — удлиняют лицо',
    },
    ромбовидный: {
      icon: '♦️',
      label: 'Ромбовидный',
      goal: 'Сбалансировать широкие скулы, добавить объём на лбу и подбородке',
      cuts: [
        { name: 'Textured Fringe', desc: 'Чёлка с текстурой — добавляет ширину узкому лбу' },
        { name: 'Side Part + Volume', desc: 'Объём над пробором — балансирует скулы' },
        { name: 'Chin Strap Beard', desc: 'Борода по линии челюсти — визуально расширяет узкий низ' },
        { name: 'Medium Length Slick', desc: 'Средняя длина зачёсанная — смягчает угловатость скул' },
      ],
      avoid: 'Избегай: зачёсанные назад волосы (открывают скулы), очень короткий buzz cut',
    },
    овальный: {
      icon: '🥚',
      label: 'Овальный',
      goal: 'Универсальная форма — подходит почти любой стиль',
      cuts: [
        { name: 'Buzz Cut', desc: 'Подчёркивает череп — работает при хорошей структуре' },
        { name: 'Crew Cut', desc: 'Классика — короткие бока, чуть длиннее сверху' },
        { name: 'Slick Back', desc: 'Зачёсанный назад — зрелый, уверенный образ' },
        { name: 'Ivy League', desc: 'Пробор + умеренная длина — smart casual' },
      ],
      avoid: 'Овальное лицо — минимум ограничений, главное ухоженность',
    },
    треугольный: {
      icon: '🔺',
      label: 'Треугольный / Груша',
      goal: 'Добавить ширину лбу и висков, отвлечь от широкой челюсти',
      cuts: [
        { name: 'Pompadour', desc: 'Объём на макушке — расширяет верх, балансирует челюсть' },
        { name: 'Textured Quiff', desc: 'Направленный объём вверх и в стороны — расширяет crown' },
        { name: 'Fringe + Fade', desc: 'Чёлка + fade по бокам — классика для треугольника' },
        { name: 'Side Part Volume', desc: 'Объём над пробором — визуально расширяет лоб' },
      ],
      avoid: 'Избегай: короткий crop без объёма сверху, tight fade по всей голове',
    },
    круглый: {
      icon: '🔵',
      label: 'Круглый',
      goal: 'Визуально вытянуть лицо, убрать ширину по бокам',
      cuts: [
        { name: 'Pompadour / Quiff', desc: 'Высота сверху — вытягивает круглое лицо вертикально' },
        { name: 'Faux Hawk', desc: 'Объём по центру, короткие бока — удлиняет силуэт' },
        { name: 'High Skin Fade', desc: 'Короткие бока + объём сверху — убирает ширину' },
        { name: 'Angular Fringe', desc: 'Асимметричная чёлка — добавляет угловатость' },
      ],
      avoid: 'Избегай: длинные волосы по бокам, центральный пробор, bob — усилят круглость',
    },
    сердце: {
      icon: '❤️',
      label: 'Сердце',
      goal: 'Смягчить широкий лоб, добавить ширину в нижней трети',
      cuts: [
        { name: 'Side Swept Fringe', desc: 'Боковая чёлка — скрывает широкий лоб' },
        { name: 'Medium Textured Cut', desc: 'Средняя длина с текстурой — балансирует пропорции' },
        { name: 'Low Fade + Texture', desc: 'Низкий fade, текстура сверху — не акцентирует лоб' },
        { name: 'Chin Beard', desc: 'Борода на подбородке — визуально расширяет узкий низ' },
      ],
      avoid: 'Избегай: зачёс назад (открывает широкий лоб), высокий объём на макушке',
    },
  };

  const haircuts = haircutMap[faceShape] || haircutMap.овальный;

  const summary = score >= 8
    ? `Лицо с ${faceShape} формой, высокий потенциал. Выраженные мужские черты, гармоничные пропорции.`
    : score >= 6.5
      ? `Лицо с ${faceShape} формой. Хорошая база с зонами роста. Glow up реален за 3-6 мес.`
      : `Лицо требует системной работы. ${faceShape} тип — фокус на коже, челюсти и стиле.`;

  const scoreLabel = rank.rank;
  const stars = round1(score / 2);

  return {
    traitScores,
    proportions,
    character: { text: characterText, traits: characterTraits },
    harmonyChart,
    agePotential: { score: agePotential, text: ageText },
    strongSides,
    recommendations,
    haircuts,
    faceShape,
    faceShapeConfidence,
    summary,
    scoreLabel,
    stars,
  };
}

function generateVerdict(score, rank, metrics) {
  const avg = Object.values(metrics).reduce((a, b) => a + b, 0) / Object.keys(metrics).length;
  const verdicts = {
    'TRUE ADAM': `Вердикт: ${score}/10 — ${rank.rank}. Вершина пирамиды. Исключительная гармония и dimorphism — топ <1% по метрикам. Не расслабляйся: стиль и социальный капитал решают остальное.`,
    CHAD: `Вердикт: ${score}/10 — ${rank.rank}. Ты в топ-5% по анализу. Гармония лица на высоком уровне, phi ratio близок к идеалу. Главный риск — complacency. Продолжай скинмаксинг и стайл.`,
    HTN: `Вердикт: ${score}/10 — ${rank.rank}. Сильная база с потенциалом до CHAD. Ключевые метрики выше среднего (${avg.toFixed(1)} avg). Точечная работа над слабыми зонами даст +1-1.5 балла.`,
    MTN: `Вердикт: ${score}/10 — ${rank.rank}. Средний уровень — большинство людей здесь. Хорошая новость: у тебя есть ${Object.values(metrics).filter((v) => v >= 7).length} сильных параметров. Glow up реален за 6-12 мес.`,
    LTN: `Вердикт: ${score}/10 — ${rank.rank}. Есть зоны для роста, но это не приговор. Скинмаксинг + фитнес + стиль = +2 балла за год. Начни с кожи и % жира.`,
    SUB5: `Вердикт: ${score}/10 — ${rank.rank}. Ниже среднего, но подъём в LTN реален за 3-6 мес. Фокус: сон, питание, тренировки, уход за кожей.`,
    SUB3: `Вердикт: ${score}/10 — ${rank.rank}. База требует системной работы. Начни с фундамента: сон, дефицит калорий, скинмаксинг. Каждый CHAD когда-то был на дне пирамиды.`,
  };
  return verdicts[rank.rank] || verdicts.MTN;
}

export function analyzeFromLandmarks(landmarks, imageHash = 'default') {
  const rand = seededRandom(hashSeed(imageHash));

  const faceShapeData = detectFaceShapeFromLandmarks(landmarks);
  const faceShape = faceShapeData.shape;
  const faceShapeConfidence = faceShapeData.confidence;

  const metrics = computeMetricsFromLandmarks(landmarks, rand);
  const landmarkProps = computeProportionsFromLandmarks(landmarks);

  const weights = {
    symmetry: 1.35,
    cheekbones: 1.0,
    jawline: 1.15,
    hunterEyes: 1.1,
    canthalTilt: 0.85,
    philtrum: 0.7,
    nose: 0.9,
    lips: 0.55,
    midface: 0.9,
    lowerThird: 0.95,
    eyeSpacing: 0.75,
    browRidge: 0.95,
    skinQuality: 0.65,
    dimorphism: 0.75,
    aging: 0.55,
  };

  let totalWeight = 0;
  let weightedSum = 0;
  for (const [key, val] of Object.entries(metrics)) {
    weightedSum += val * weights[key];
    totalWeight += weights[key];
  }

  const rawScore = weightedSum / (totalWeight || 1);
  const score = calibrateOverallScore(rawScore, metrics);
  const rank = getRank(score);
  const advice = generateAdvice(metrics, rank);

  const metricList = Object.entries(metrics).map(([key, value]) => ({
    key,
    name: METRIC_NAMES[key],
    score: Math.round(value * 10) / 10,
  }));

  const detailedProfile = generateDetailedProfile(score, rank, metrics, faceShape);
  const report = generateExtendedReport(
    metrics,
    score,
    rank,
    faceShape,
    faceShapeConfidence,
    landmarkProps
  );

  return {
    score: Math.round(score * 10) / 10,
    rank: rank.rank,
    rankLabel: rank.label,
    rankColor: rank.color,
    metrics: metricList,
    verdict: generateVerdict(score, rank, metrics),
    detailedProfile,
    advice,
    phiRatio: Math.round((landmarkProps?.faceRatio ?? 1.35) * 100) / 100,
    faceShape,
    faceShapeConfidence,
    report,
  };
}

export function analyzeBattle(result1, result2) {
  const winner = result1.score >= result2.score ? 1 : 2;
  const diff = Math.abs(result1.score - result2.score);

  const comparisons = result1.metrics.map((m, i) => {
    const m2 = result2.metrics[i];
    return {
      name: m.name,
      score1: m.score,
      score2: m2.score,
      winner: m.score >= m2.score ? 1 : 2,
    };
  });

  const verdicts = [
    `Могг #1 (${result1.score}) vs Могг #2 (${result2.score}). Разница: ${diff.toFixed(1)} балла.`,
    winner === 1
      ? `Победитель: Могг #1 — ${result1.rank}. Преимущество в ${comparisons.filter((c) => c.winner === 1).length} из 15 параметров.`
      : `Победитель: Могг #2 — ${result2.rank}. Доминирует в ${comparisons.filter((c) => c.winner === 2).length} из 15 параметров.`,
    diff < 0.5
      ? 'Почти ничья — разница минимальна. На свидании оба в одной лиге.'
      : diff < 1.5
        ? 'Уверенная победа, но проигравший тоже в игре.'
        : 'Разгром — winner takes all.',
  ];

  return {
    winner,
    diff: Math.round(diff * 10) / 10,
    comparisons,
    verdict: verdicts.join(' '),
    result1,
    result2,
  };
}

export const PACKAGES = [
  { moggs: 5, price: 25, label: '5 mogгов' },
  { moggs: 10, price: 50, label: '10 mogгов' },
  { moggs: 15, price: 75, label: '15 mogгов' },
  { moggs: 20, price: 85, label: '20 mogгов', badge: 'SALE' },
  { moggs: 50, price: 200, label: '50 mogгов' },
  { moggs: 67, price: 220, label: '67 mogгов', badge: 'MEME' },
];

export const TRAINING_PROGRAM_PRICE = 200;
