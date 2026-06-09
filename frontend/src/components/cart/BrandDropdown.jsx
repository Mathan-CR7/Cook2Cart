export default function BrandDropdown({ value, products, getLabel, onChange }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Brand</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-800 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
      >
        {products.map((product) => (
          <option key={String(product.id || product.barcode || product.productName)} value={String(product.id || product.barcode || product.productName)}>
            {getLabel(product)}
          </option>
        ))}
      </select>
    </label>
  );
}
