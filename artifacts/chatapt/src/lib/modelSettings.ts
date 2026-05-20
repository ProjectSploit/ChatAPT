export interface PerModelSettings {
  temperature: number;
  maxTokens: number;
  topP: number;
}

export interface AllModelSettings {
  standardModelId: string;
  thinkModelId: string;
  visionModelId: string;
  standard: PerModelSettings;
  think: PerModelSettings;
  vision: PerModelSettings;
}

export const NSCALE_MODELS = [
  { id: "Qwen/Qwen3-235B-A22B-Instruct-2507", label: "Qwen3-235B Instruct 2507", ctx: 32768 },
  { id: "Qwen/Qwen3-235B-A22B",               label: "Qwen3-235B",               ctx: 32000 },
  { id: "Qwen/Qwen3-32B",                     label: "Qwen3-32B",                ctx: 40960 },
  { id: "Qwen/Qwen3-14B",                     label: "Qwen3-14B",                ctx: 40960 },
  { id: "Qwen/Qwen3-8B",                      label: "Qwen3-8B",                 ctx: 40960 },
  { id: "Qwen/QwQ-32B",                       label: "QwQ-32B (thinking)",       ctx: 131072 },
  { id: "moonshotai/Kimi-K2.5",               label: "Kimi K2.5",                ctx: 262144 },
] as const;

export const NOVITA_THINK_MODELS = [
  { id: "qwen/qwen3-235b-a22b-thinking-2507",  label: "Qwen3-235B Thinking 2507",  ctx: 131072 },
  { id: "qwen/qwen3-vl-235b-a22b-thinking",   label: "Qwen3-VL-235B Thinking",    ctx: 131072 },
  { id: "qwen/qwen3-next-80b-a3b-thinking",   label: "Qwen3-Next-80B Thinking",   ctx: 131072 },
  { id: "qwen/qwen3-32b-fp8",                 label: "Qwen3-32B (fast)",          ctx: 40960  },
] as const;

export const NOVITA_VISION_MODELS = [
  { id: "qwen/qwen2.5-vl-72b-instruct",       label: "Qwen2.5-VL-72B",           ctx: 32768  },
  { id: "qwen/qwen3-vl-235b-a22b-instruct",   label: "Qwen3-VL-235B Instruct",   ctx: 131072 },
  { id: "qwen/qwen3-vl-30b-a3b-instruct",     label: "Qwen3-VL-30B Instruct",    ctx: 131072 },
  { id: "qwen/qwen3-vl-8b-instruct",          label: "Qwen3-VL-8B (fast)",       ctx: 131072 },
] as const;

const DEFAULTS: AllModelSettings = {
  standardModelId: "Qwen/Qwen3-235B-A22B-Instruct-2507",
  thinkModelId:    "qwen/qwen3-235b-a22b-thinking-2507",
  visionModelId:   "qwen/qwen2.5-vl-72b-instruct",
  standard: { temperature: 0.7, maxTokens: 16384, topP: 0.9  },
  think:    { temperature: 0.6, maxTokens: 32768, topP: 0.95 },
  vision:   { temperature: 0.7, maxTokens: 16384, topP: 0.9  },
};

const KEY = "chataptModelSettingsV2";

function mergeSettings(stored: any): AllModelSettings {
  const d = DEFAULTS;
  return {
    standardModelId: typeof stored?.standardModelId === "string" ? stored.standardModelId : d.standardModelId,
    thinkModelId:    typeof stored?.thinkModelId    === "string" ? stored.thinkModelId    : d.thinkModelId,
    visionModelId:   typeof stored?.visionModelId   === "string" ? stored.visionModelId   : d.visionModelId,
    standard: mergePerModel(stored?.standard, d.standard),
    think:    mergePerModel(stored?.think,    d.think),
    vision:   mergePerModel(stored?.vision,   d.vision),
  };
}

function mergePerModel(stored: any, def: PerModelSettings): PerModelSettings {
  return {
    temperature: typeof stored?.temperature === "number" ? stored.temperature : def.temperature,
    maxTokens:   typeof stored?.maxTokens   === "number" ? stored.maxTokens   : def.maxTokens,
    topP:        typeof stored?.topP        === "number" ? stored.topP        : def.topP,
  };
}

export function getModelSettings(): AllModelSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS, standard: { ...DEFAULTS.standard }, think: { ...DEFAULTS.think }, vision: { ...DEFAULTS.vision } };
    return mergeSettings(JSON.parse(raw));
  } catch {
    return mergeSettings({});
  }
}

export function saveModelSettings(s: AllModelSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function resetModelSettings(): AllModelSettings {
  localStorage.removeItem(KEY);
  return mergeSettings({});
}

export { DEFAULTS as MODEL_DEFAULTS };
