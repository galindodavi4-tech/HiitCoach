import { useState } from 'react';
import { loadSettings, saveSettings } from '../lib/storage';
import type { Settings } from '../lib/storage';
import { speak, startBeep, unlockAudio, vibrate } from '../lib/cues';
import { wakeLockSupported } from '../lib/wakeLock';
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
    speak('Teste de voz. Bora treinar!', settings);
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Ajustes</h1>

      {TOGGLES.map((t) => (
        <label key={t.key} className="flex min-h-16 items-center gap-4 rounded-2xl bg-neutral-900 px-4 py-3">
          <span className="flex-1">
            <span className="block text-xl font-bold">{t.label}</span>
            <span className="block text-sm text-neutral-400">{t.hint}</span>
          </span>
          <input
            type="checkbox"
            className="peer sr-only"
            checked={settings[t.key]}
            onChange={(e) => update({ [t.key]: e.target.checked })}
          />
          <span
            aria-hidden="true"
            className="relative h-8 w-14 shrink-0 rounded-full bg-neutral-700 transition peer-checked:bg-green-600 after:absolute after:top-1 after:left-1 after:h-6 after:w-6 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-6"
          />
        </label>
      ))}

      <div className="rounded-2xl bg-neutral-900 px-4 py-3">
        <label htmlFor="volume" className="mb-2 flex items-center justify-between text-xl font-bold">
          Volume
          <span className="tabular-nums text-neutral-300">{Math.round(settings.volume * 100)}%</span>
        </label>
        <input
          id="volume"
          type="range"
          min={0}
          max={100}
          step={5}
          className="h-12 w-full accent-green-600"
          value={Math.round(settings.volume * 100)}
          onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
        />
      </div>

      <button className={`${btnSecondary} min-h-14`} onClick={test}>🔊 Testar som</button>

      {!wakeLockSupported() && (
        <p className="rounded-xl bg-amber-950 p-3 text-amber-300">
          Este navegador não consegue manter a tela ligada sozinho. Use o Chrome e abra o app pelo endereço https.
        </p>
      )}
    </section>
  );
}
