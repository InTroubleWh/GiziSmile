import whoLms from "./who-lms.json";

export type Gender = "male" | "female";

export interface ZScoreInput {
  gender: Gender;
  age_months: number;
  height_cm: number;
  weight_kg: number;
}

export type HfaStatus =
  | "Sangat Pendek (Severely Stunted)"
  | "Pendek (Stunted)"
  | "Normal"
  | "Tinggi";

export type WfaStatus =
  | "Berat Badan Sangat Kurang (Severely Underweight)"
  | "Berat Badan Kurang (Underweight)"
  | "Berat Badan Normal"
  | "Risiko Berat Badan Lebih";

export type WfhStatus =
  | "Gizi Buruk (Severely Wasted)"
  | "Gizi Kurang (Wasted)"
  | "Gizi Baik (Normal)"
  | "Berisiko Gizi Lebih"
  | "Gizi Lebih (Overweight)"
  | "Obesitas";

export interface LmsEntry {
  L: number;
  M: number;
  S: number;
  sd3neg?: number;
  sd2neg?: number;
  sd1neg?: number;
  sd0?: number;
  sd1?: number;
  sd2?: number;
  sd3?: number;
}

export interface ZScoreResult {
  zscore_hfa: number;
  zscore_wfa: number;
  zscore_wfh: number;
  status_hfa: HfaStatus;
  status_wfa: WfaStatus;
  status_wfh: WfhStatus;
  is_stunted: boolean;
  is_underweight: boolean;
  is_wasted: boolean;
  needs_intervention: boolean;
  curve_data?: {
    hfa_reference?: LmsEntry;
    wfa_reference?: LmsEntry;
    wfh_reference?: LmsEntry;
  };
}

type LmsDatabase = {
  hfa: Record<Gender, Record<string, LmsEntry>>;
  wfa: Record<Gender, Record<string, LmsEntry>>;
  wfh: Record<Gender, Record<string, LmsEntry>>;
};

const lmsData = whoLms as unknown as LmsDatabase;

/**
 * Box-Cox Power Transformation Z-score calculation:
 * Z = ((y / M)^L - 1) / (L * S)  [if L != 0]
 * Z = ln(y / M) / S               [if L == 0]
 */
function computeLmsZScore(val: number, lms: LmsEntry): number {
  const { L, M, S } = lms;
  if (!M || !S) return 0;

  if (Math.abs(L) < 0.0001) {
    return Math.log(val / M) / S;
  }
  return (Math.pow(val / M, L) - 1) / (L * S);
}

function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function classifyHfa(z: number): HfaStatus {
  if (z < -3) return "Sangat Pendek (Severely Stunted)";
  if (z < -2) return "Pendek (Stunted)";
  if (z <= 3) return "Normal";
  return "Tinggi";
}

export function classifyWfa(z: number): WfaStatus {
  if (z < -3) return "Berat Badan Sangat Kurang (Severely Underweight)";
  if (z < -2) return "Berat Badan Kurang (Underweight)";
  if (z <= 1) return "Berat Badan Normal";
  return "Risiko Berat Badan Lebih";
}

export function classifyWfh(z: number): WfhStatus {
  if (z < -3) return "Gizi Buruk (Severely Wasted)";
  if (z < -2) return "Gizi Kurang (Wasted)";
  if (z <= 1) return "Gizi Baik (Normal)";
  if (z <= 2) return "Berisiko Gizi Lebih";
  if (z <= 3) return "Gizi Lebih (Overweight)";
  return "Obesitas";
}

export function calculateZScore(input: ZScoreInput): ZScoreResult {
  const { gender, age_months, height_cm, weight_kg } = input;

  const ageKey = Math.min(Math.max(0, Math.floor(age_months)), 60).toString();

  // 1. TB/U (HFA)
  const hfaLms = lmsData.hfa[gender]?.[ageKey];
  const rawHfa = hfaLms ? computeLmsZScore(height_cm, hfaLms) : 0;
  const zscore_hfa = roundToTwo(rawHfa);

  // 2. BB/U (WFA)
  const wfaLms = lmsData.wfa[gender]?.[ageKey];
  const rawWfa = wfaLms ? computeLmsZScore(weight_kg, wfaLms) : 0;
  const zscore_wfa = roundToTwo(rawWfa);

  // 3. BB/TB (WFH) - height rounded to nearest 0.5 cm between 45.0 and 120.0
  const clampedHeight = Math.min(Math.max(45.0, height_cm), 120.0);
  const roundedHeight = (Math.round(clampedHeight * 2) / 2).toFixed(1);
  const wfhLms = lmsData.wfh[gender]?.[roundedHeight];
  const rawWfh = wfhLms ? computeLmsZScore(weight_kg, wfhLms) : 0;
  const zscore_wfh = roundToTwo(rawWfh);

  const status_hfa = classifyHfa(zscore_hfa);
  const status_wfa = classifyWfa(zscore_wfa);
  const status_wfh = classifyWfh(zscore_wfh);

  const is_stunted = zscore_hfa < -2;
  const is_underweight = zscore_wfa < -2;
  const is_wasted = zscore_wfh < -2;
  const needs_intervention = is_stunted || is_underweight || is_wasted;

  return {
    zscore_hfa,
    zscore_wfa,
    zscore_wfh,
    status_hfa,
    status_wfa,
    status_wfh,
    is_stunted,
    is_underweight,
    is_wasted,
    needs_intervention,
    curve_data: {
      hfa_reference: hfaLms,
      wfa_reference: wfaLms,
      wfh_reference: wfhLms,
    },
  };
}
