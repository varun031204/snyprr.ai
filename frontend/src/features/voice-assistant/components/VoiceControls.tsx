import React, { useState } from 'react';
import type { VoiceSettings } from '../types/voice';
import { LANGUAGES, getLanguagesByGroup } from '../config/languages';

interface VoiceControlsProps {
  settings: VoiceSettings;
  onUpdate: (partial: Partial<VoiceSettings>) => void;
  onClear: () => void;
}

// ─── VoiceControls ────────────────────────────────────────────────────────────

export const VoiceControls: React.FC<VoiceControlsProps> = ({ settings, onUpdate, onClear }) => {
  const [showLangPicker, setShowLangPicker] = useState(false);

  const indianLangs        = getLanguagesByGroup('indian');
  const internationalLangs = getLanguagesByGroup('international');
  const currentLangEntry   = LANGUAGES.find(l => l.code === settings.language);

  return (
    <div
      className="flex flex-col gap-3 p-3 rounded-xl"
      style={{
        background:   'var(--bg-secondary)',
        border:       '1px solid var(--border-subtle)',
      }}
    >
      {/* ── Row 1: Language + Gender ───────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Language button */}
        <button
          onClick={() => setShowLangPicker(p => !p)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium flex-1 min-w-0 truncate"
          style={{
            background: 'var(--bg-surface)',
            border:     '1px solid var(--border-subtle)',
            color:      'var(--text-primary)',
          }}
          title="Select language"
          aria-expanded={showLangPicker}
        >
          <span>{currentLangEntry?.flag ?? '🌐'}</span>
          <span className="truncate">{currentLangEntry?.short ?? settings.language}</span>
          <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>▾</span>
        </button>

        {/* Auto-detect toggle */}
        <button
          onClick={() => onUpdate({ autoDetect: !settings.autoDetect })}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs"
          style={{
            background: settings.autoDetect ? 'var(--brand-primary)' : 'var(--bg-surface)',
            border:     '1px solid var(--border-subtle)',
            color:      settings.autoDetect ? '#fff' : 'var(--text-muted)',
            flexShrink: 0,
          }}
          title="Auto-detect language from speech"
        >
          Auto
        </button>

        {/* Gender toggle */}
        <button
          onClick={() => onUpdate({ gender: settings.gender === 'female' ? 'male' : 'female' })}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-base flex-shrink-0"
          style={{
            background: 'var(--bg-surface)',
            border:     '1px solid var(--border-subtle)',
          }}
          title={`Voice: ${settings.gender}`}
          aria-label={`Switch voice gender. Current: ${settings.gender}`}
        >
          {settings.gender === 'female' ? '👩' : '👨'}
        </button>
      </div>

      {/* ── Language picker dropdown ──────────────────────────────────────── */}
      {showLangPicker && (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            border:     '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            maxHeight:  220,
            overflowY:  'auto',
          }}
        >
          <LangGroup
            title="🇮🇳 Indian Languages"
            langs={indianLangs}
            selected={settings.language}
            onSelect={code => { onUpdate({ language: code }); setShowLangPicker(false); }}
          />
          <LangGroup
            title="🌍 International"
            langs={internationalLangs}
            selected={settings.language}
            onSelect={code => { onUpdate({ language: code }); setShowLangPicker(false); }}
          />
        </div>
      )}

      {/* ── Row 2: Speed + Volume sliders ─────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <SliderRow
          label="Speed"
          value={settings.speed}
          min={0.5}
          max={2.0}
          step={0.1}
          displayValue={`${settings.speed.toFixed(1)}×`}
          onChange={v => onUpdate({ speed: v })}
        />
        <SliderRow
          label="Volume"
          value={settings.volume}
          min={0}
          max={1}
          step={0.05}
          displayValue={`${Math.round(settings.volume * 100)}%`}
          onChange={v => onUpdate({ volume: v })}
        />
      </div>

      {/* ── Row 3: Clear history ──────────────────────────────────────────── */}
      <button
        onClick={onClear}
        className="text-xs py-1.5 rounded-lg w-full"
        style={{
          background: 'transparent',
          border:     '1px solid var(--border-subtle)',
          color:      'var(--text-muted)',
        }}
      >
        Clear conversation
      </button>
    </div>
  );
};

// ─── Language group ───────────────────────────────────────────────────────────

interface LangGroupProps {
  title: string;
  langs: typeof LANGUAGES;
  selected: string;
  onSelect: (code: string) => void;
}

const LangGroup: React.FC<LangGroupProps> = ({ title, langs, selected, onSelect }) => (
  <div>
    <p
      className="text-[10px] px-3 py-1.5 uppercase tracking-wider font-semibold sticky top-0"
      style={{ color: 'var(--text-muted)', background: 'var(--bg-surface)' }}
    >
      {title}
    </p>
    {langs.map(l => (
      <button
        key={l.code}
        onClick={() => onSelect(l.code)}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left"
        style={{
          color:      selected === l.code ? 'var(--brand-vivid)' : 'var(--text-primary)',
          background: selected === l.code ? 'color-mix(in srgb, var(--brand-primary) 12%, transparent)' : 'transparent',
          fontWeight: selected === l.code ? 600 : 400,
        }}
      >
        <span>{l.flag}</span>
        <span>{l.label}</span>
        {selected === l.code && <span className="ml-auto">✓</span>}
      </button>
    ))}
  </div>
);

// ─── Slider row ───────────────────────────────────────────────────────────────

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (v: number) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({ label, value, min, max, step, displayValue, onChange }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs w-12 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
      {label}
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
      style={{ accentColor: 'var(--brand-primary)' }}
      aria-label={label}
    />
    <span className="text-xs w-9 text-right flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
      {displayValue}
    </span>
  </div>
);
