import { useState } from 'react';
import { loadSettings, saveSettings } from '../lib/storage';
import type { Settings } from '../lib/storage';
import { speak, startBeep, unlockAudio, vibrate } from '../lib/cues';
import { wakeLockSupported } from '../lib/wakeLock';
import { AlertTriangle, Volume2 } from 'lucide-react';
import Eyebrow from '../components/pulso/Eyebrow';
import Switch from '../components/pulso/Switch';
import Title from '../components/pulso/Title';
import { btnSecondary } from '../components/ui';

type Toggle = 'beeps' | 'voice' | 'vibration';

const TOGGLES: { key: Toggle; label: string; hint: string }[] = [
  { key: 'beeps', label: 'Bipes', hint: 'Contagem 3, 2, 1 e bipe no início de cada passo' },
  { key: 'voice', label: 'Voz', hint: 'Fala o nome do passo quando ele começa' },
  { key: 'vibration', label: 'Vibração', hint: 'Vibra quando muda de passo' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState(loadSettings);

  function update(changes: Partial<Settings>) {
    const next = { ...settings, ...changes };
    saveSettings(next);
    setSettings(next);
  }

  function test() {
    unlockAudio();
    startBeep('work', settings);
    vibrate(200, settings);
    speak('Teste de voz. Bora treinar.', settings);
  }

  return (
    <section className="flex flex-col gap-8">
      <Title>Ajustes</Title>

      <div className="flex flex-col gap-3">
        <Eyebrow>Sinais durante o treino</Eyebrow>
        <div className="p-card flex flex-col divide-y divide-line-subtle px-4">
          {TOGGLES.map((t) => (
            <div key={t.key} className="py-3.5">
              <Switch
                label={t.label}
                description={t.hint}
                checked={settings[t.key]}
                onChange={(checked) => update({ [t.key]: checked })}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Eyebrow>Áudio</Eyebrow>
        <div className="p-card flex flex-col gap-2 px-4 pt-4 pb-2">
          <label htmlFor="volume" className="flex items-baseline justify-between">
            <span className="text-[15px] font-medium">Volume</span>
            <span className="flex items-baseline gap-1">
              <span className="p-num text-[22px]">{Math.round(settings.volume * 100)}</span>
              <span className="p-unit">%</span>
            </span>
          </label>
          <input
            id="volume"
            type="range"
            min={0}
            max={100}
            step={5}
            className="p-range"
            value={Math.round(settings.volume * 100)}
            onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
          />
        </div>

        <button className={btnSecondary} onClick={test}>
          <Volume2 size={17} strokeWidth={2} /> Testar som
        </button>
      </div>

      {!wakeLockSupported() && (
        <div className="flex gap-3 rounded-md border border-[rgba(255,176,31,.4)] bg-[var(--wash-warning)] p-3.5">
          <AlertTriangle size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-warning" />
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10.5px] tracking-[0.12em] text-warning uppercase">Tela</span>
            <p className="text-[14px] text-secondary">
              Este navegador não consegue manter a tela ligada sozinho. Use o Chrome e abra o app pelo endereço https.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
