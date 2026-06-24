const ANALYSIS_STEPS = [
  'Детекция лица...',
  'Анализ симметрии...',
  'Оценка пропорций лица...',
  'Hunter eyes & средняя треть...',
  'Расчёт Phi Ratio...',
  'Определение ранга...',
  'Формирование AI-вердикта...',
];

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runAnalysisWithDelay(
  onStep: (steps: string[], current: string) => void,
  work: () => Promise<void>
) {
  const steps: string[] = [];
  const stepDelay = 800;

  for (const step of ANALYSIS_STEPS) {
    steps.push(step);
    onStep([...steps], step);
    await delay(stepDelay);
  }

  await work();

  steps.push('Готово!');
  onStep([...steps], 'Готово!');
  await delay(400);
}

export const BATTLE_STEPS = [
  'Детекция первого лица...',
  'Детекция второго лица...',
  'Сравнение симметрии...',
  'Сравнение пропорций...',
  'Анализ hunter eyes...',
  'Расчёт победителя...',
  'Формирование вердикта...',
];

export async function runBattleWithDelay(
  onStep: (steps: string[], current: string) => void,
  work: () => Promise<void>
) {
  const steps: string[] = [];
  const stepDelay = 850;

  for (const step of BATTLE_STEPS) {
    steps.push(step);
    onStep([...steps], step);
    await delay(stepDelay);
  }

  await work();

  steps.push('Готово!');
  onStep([...steps], 'Готово!');
  await delay(400);
}
