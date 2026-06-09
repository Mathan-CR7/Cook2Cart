import { money } from './cartMath';

export default function ConfirmationModal({ open, items, total, saving, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-gray-900">Confirm Purchase</h2>
            <p className="mt-1 text-sm text-gray-500">You are about to purchase these packs.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200"
            aria-label="Close"
          >
            <span className="material-icon text-lg">close</span>
          </button>
        </div>

        <div className="mt-5 max-h-[45vh] overflow-y-auto rounded-2xl border border-gray-100">
          {items.map((item) => (
            <div key={item.key} className="flex justify-between gap-4 border-b border-gray-100 px-4 py-3 last:border-0">
              <div>
                <p className="text-sm font-bold text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">{item.packLabel}</p>
              </div>
              <span className="text-sm font-black text-gray-900">{money(item.purchaseCost)}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-3">
          <span className="text-sm font-bold text-gray-700">Total Purchase Cost</span>
          <span className="text-lg font-black text-orange-600">{money(total)}</span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-gray-200 py-3 text-sm font-black text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onConfirm}
            className="gradient-bg rounded-2xl py-3 text-sm font-black text-white shadow-lg disabled:opacity-60"
          >
            {saving ? 'Saving Cart...' : 'Confirm Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
