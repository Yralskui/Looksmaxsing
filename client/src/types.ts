export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

export interface Metric {
  key: string;
  name: string;
  score: number;
}

export interface TraitScore {
  key: string;
  name: string;
  score: number;
}

export interface ProportionItem {
  name: string;
  value: number;
  label: string;
  color: string;
}

export interface CharacterTrait {
  name: string;
  score: number;
}

export interface HarmonyPoint {
  label: string;
  value: number;
}

export interface HaircutItem {
  name: string;
  desc: string;
}

export interface HaircutRecommendation {
  icon: string;
  label: string;
  goal: string;
  cuts: HaircutItem[];
  avoid: string;
}

export interface AnalysisReport {
  traitScores: TraitScore[];
  proportions: ProportionItem[];
  character: { text: string; traits: CharacterTrait[] };
  harmonyChart: HarmonyPoint[];
  agePotential: { score: number; text: string };
  strongSides: string[];
  recommendations: string[];
  haircuts?: HaircutRecommendation;
  faceShape?: string;
  faceShapeConfidence?: number;
  summary: string;
  scoreLabel: string;
  stars: number;
}

export interface AnalysisResult {
  score: number;
  rank: string;
  rankLabel: string;
  rankColor: string;
  metrics: Metric[];
  verdict: string;
  detailedProfile: string;
  phiRatio: number;
  advice: {
    strengths: { name: string; score: number }[];
    weaknesses: { name: string; score: number }[];
    tips: string[];
  };
  report?: AnalysisReport;
  analysisId?: string;
  moggs?: number;
  trainingPurchased?: boolean;
}

export interface HistoryItem {
  id: string;
  type: 'single' | 'battle';
  score: number;
  rank: string;
  trainingPurchased: boolean;
  createdAt: string;
}

export interface TrainingWeek {
  week: number;
  title: string;
  tasks: string[];
}

export interface TrainingProgram {
  title: string;
  subtitle: string;
  weeks: TrainingWeek[];
  disclaimer: string;
}

export interface BattleComparison {
  name: string;
  score1: number;
  score2: number;
  winner: number;
}

export interface BattleResult {
  winner: number;
  diff: number;
  comparisons: BattleComparison[];
  verdict: string;
  result1: AnalysisResult;
  result2: AnalysisResult;
  analysisId?: string;
  moggs?: number;
}

export interface Package {
  moggs: number;
  price: number;
  label: string;
  badge?: string;
}
