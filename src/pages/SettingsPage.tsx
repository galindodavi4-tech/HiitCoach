import { useState } from 'react';
import { loadSettings, saveSettings } from '../lib/storage';
import type { Settings } from '../lib/storage';
import { speak, startBeep, unlockAudio, vibrate } from '../lib/cues';
import { wakeLockSupported } from '../lib/wakeLock';
import { Volume2 } from 'lucide-react';
import ScreenTitle from '../components/jb/ScreenTitle';
import SectionHeading from '../components/jb/SectionHeading';
import Switch from '../components/jb/Switch';
import AccountCard from '../components/AccountCard';
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
    <section className="flex flex-col gap-[var(--section-gap)]">
      <ScreenTitle eyebrow="Personalizado para você">Ajustes</ScreenTitle>

      <AccountCard />

      <div className="flex flex-col gap-[var(--stack-gap)]">
        <SectionHeading>Sinais no treino</SectionHeading>
        <div className="jb-card flex flex-col divide-y divide-line-subtle px-4">
          {TOGGLES.map((t) => (
            <div key={t.key} className="py-4">
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

      <div className="flex flex-col gap-[var(--stack-gap)]">
        <SectionHeading>Áudio</SectionHeading>
        <div className="jb-card flex flex-col gap-3 px-4 pt-4 pb-2">
          <label htmlFor="volume" className="flex items-baseline justify-between">
            <span className="text-[18px] font-bold">Volume</span>
            <span className="flex items-baseline gap-1">
              <span className="jb-num text-[28px] text-accent">{Math.round(settings.volume * 100)}</span>
              <span className="text-[15px] font-semibold text-muted">%</span>
            </span>
          </label>
          <input
            id="volume"
            type="range"
            min={0}
            max={100}
            step={5}
            className="jb-range"
            aria-label="Volume"
            value={Math.round(settings.volume * 100)}
            onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
          />
        </div>

        <button className={btnSecondary} onClick={test}>
          <Volume2 size={19} strokeWidth={2.2} /> Testar som
        </button>
      </div>

      {!wakeLockSupported() && (
        // Tips callout: the one place the blue info colours are used
        <div className="flex flex-col gap-2 rounded-r-[var(--radius-sm)] border-l-4 border-[var(--jb-info-border)] bg-[var(--jb-info-bg)] px-4 py-3.5">
          <span className="text-[16px] text-info">
            Dica: este navegador não consegue manter a tela ligada sozinho. Use o Chrome e abra o app pelo endereço https.
          </span>
        </div>
      )}
    </section>
  );
}
