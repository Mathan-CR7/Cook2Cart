import { useState } from 'react';

export default function ServingsModal({ open, initialValue = 4, onConfirm }) {
  const [persons, setPersons] = useState(initialValue);

  if (!open) return null;

  const presets = [1, 2, 4, 6, 8];

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
            <span className="material-icon !text-3xl">groups</span>
          </div>
          <h2 className="mt-4 text-xl font-black text-gray-900">How many persons?</h2>
          <p className="mt-2 text-sm font-medium text-gray-500">
            Cook2Cart will scale ingredient quantities and product costs for this serving size.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-5 gap-2">
          {presets.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPersons(value)}
              className={`rounded-2xl py-3 text-sm font-black transition ${
                Number(persons) === value
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-orange-50 hover:text-orange-600'
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        <label className="mt-5 block">
          <span className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Custom persons</span>
          <input
            type="number"
            min="1"
            max="50"
            value={persons}
            onChange={(event) => setPersons(event.target.value)}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-center text-lg font-black text-gray-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          />
        </label>

        <button
          type="button"
          onClick={() => onConfirm(Math.max(1, Number(persons) || 1))}
          className="gradient-bg mt-6 w-full rounded-2xl py-4 text-sm font-black text-white shadow-lg"
        >
          Generate Cart
        </button>
      </div>
    </div>
  );
}
