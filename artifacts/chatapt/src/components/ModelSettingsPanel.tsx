import React, { useState } from "react";
import {
  getModelSettings, saveModelSettings, resetModelSettings,
  NSCALE_MODELS, NOVITA_THINK_MODELS, NOVITA_VISION_MODELS,
  type AllModelSettings, type PerModelSettings,
} from "@/lib/modelSettings";

type Tab = "standard" | "think" | "vision";

interface Props { onClose: () => void; }

function Slider({ label, value, min, max, step, format, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[#ccc] text-[13px] font-medium">{label}</span>
        <span className="text-[#666] text-[13px] font-mono">{format(value)}</span>
      </div>
      <div className="relative h-1.5 bg-[#222] rounded-full">
        <div className="absolute left-0 top-0 h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md border border-[#111] pointer-events-none"
          style={{ left: `calc(${pct}% - 7px)` }} />
      </div>
      <div className="flex justify-between text-[#333] text-[10px]">
        <span>{format(min)}</span><span>{format(max)}</span>
      </div>
    </div>
  );
}

function ModelPicker({ models, value, onChange }: {
  models: readonly { id: string; label: string; ctx: number }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[#444] text-[11px] uppercase tracking-widest font-medium mb-1">Model</p>
      <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl overflow-hidden">
        {models.map((m, i) => (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors
              ${i > 0 ? "border-t border-[#151515]" : ""}
              ${value === m.id ? "bg-[#161616]" : "hover:bg-[#0f0f0f] active:bg-[#0f0f0f]"}`}
          >
            <div>
              <p className={`text-[13px] font-medium ${value === m.id ? "text-white" : "text-[#666]"}`}>{m.label}</p>
              <p className="text-[#333] text-[10px] mt-0.5">{(m.ctx / 1000).toFixed(0)}K ctx</p>
            </div>
            {value === m.id && (
              <div className="w-2 h-2 rounded-full bg-white shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function PerModelPanel({ tab, settings, onUpdate }: {
  tab: Tab;
  settings: PerModelSettings;
  onUpdate: (s: PerModelSettings) => void;
}) {
  const maxTokensMax = tab === "think" ? 32768 : 16384;
  const update = (key: keyof PerModelSettings, v: number) => onUpdate({ ...settings, [key]: v });

  return (
    <div className="flex flex-col gap-5 pt-2">
      <Slider label="Temperature" value={settings.temperature} min={0} max={2} step={0.05}
        format={v => v.toFixed(2)} onChange={v => update("temperature", v)} />
      <p className="text-[#3a3a3a] text-[11px] -mt-3 leading-relaxed">
        {settings.temperature < 0.4 ? "Deterministic — repeatable, factual answers."
          : settings.temperature < 0.8 ? "Balanced — natural, slightly varied."
          : settings.temperature < 1.3 ? "Creative — more expressive output."
          : "Very creative — unpredictable."}
      </p>

      <Slider label="Max Tokens" value={settings.maxTokens} min={512} max={maxTokensMax} step={512}
        format={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
        onChange={v => update("maxTokens", v)} />
      <p className="text-[#3a3a3a] text-[11px] -mt-3 leading-relaxed">
        Maximum tokens in the AI response. Keep under model context limit.
      </p>

      <Slider label="Top P" value={settings.topP} min={0.1} max={1.0} step={0.05}
        format={v => v.toFixed(2)} onChange={v => update("topP", v)} />
      <p className="text-[#3a3a3a] text-[11px] -mt-3 leading-relaxed">
        Nucleus sampling — lower = more focused, higher = more varied.
      </p>
    </div>
  );
}

const TAB_LABELS: { id: Tab; label: string; desc: string }[] = [
  { id: "standard", label: "Standard",  desc: "Regular chat (nscale)" },
  { id: "think",    label: "Think",     desc: "Think toggle (novita)" },
  { id: "vision",   label: "Vision",    desc: "Image uploads (novita)" },
];

export default function ModelSettingsPanel({ onClose }: Props) {
  const [settings, setSettings] = useState<AllModelSettings>(() => getModelSettings());
  const [tab, setTab] = useState<Tab>("standard");
  const [saved, setSaved] = useState(false);

  const updateModel = (field: "standardModelId" | "thinkModelId" | "visionModelId", id: string) => {
    setSettings(prev => ({ ...prev, [field]: id }));
    setSaved(false);
  };

  const updatePerModel = (key: Tab, s: PerModelSettings) => {
    setSettings(prev => ({ ...prev, [key]: s }));
    setSaved(false);
  };

  const handleSave = () => {
    saveModelSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setSettings(resetModelSettings());
    setSaved(false);
  };

  const modelField = tab === "standard" ? "standardModelId" : tab === "think" ? "thinkModelId" : "visionModelId";
  const modelList  = tab === "standard" ? NSCALE_MODELS : tab === "think" ? NOVITA_THINK_MODELS : NOVITA_VISION_MODELS;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-[#1a1a1a]">
        <h2 className="text-white font-semibold text-base">AI Model Settings</h2>
        <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-[#1a1a1a] px-4">
        {TAB_LABELS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-[12px] font-medium transition-colors relative
              ${tab === t.id ? "text-white" : "text-[#444] hover:text-[#666]"}`}
          >
            {t.label}
            {tab === t.id && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-white rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-5 flex flex-col gap-5">
        <p className="text-[#333] text-[11px] -mb-2">{TAB_LABELS.find(t => t.id === tab)?.desc}</p>

        <ModelPicker
          models={modelList}
          value={settings[modelField]}
          onChange={id => updateModel(modelField, id)}
        />

        <div className="h-px bg-[#141414]" />

        <PerModelPanel
          tab={tab}
          settings={settings[tab]}
          onUpdate={s => updatePerModel(tab, s)}
        />

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-white text-[#080808] text-[13px] font-semibold py-2.5 rounded-xl hover:bg-[#e0e0e0] transition-colors active:scale-95"
          >
            {saved ? "Saved ✓" : "Apply"}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl border border-[#222] text-[#666] text-[13px] hover:border-[#333] hover:text-white transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
