import { getBrandName } from './cartMath';

export default function ProductDropdown({ value, products, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-gray-400">Product</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-800 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
      >
        {products.map((product) => (
          <option
            key={String(product.id || product.barcode || product.productName)}
            value={String(product.id || product.barcode || product.productName)}
          >
            {getBrandName(product)} - {product.productName}
          </option>
        ))}
      </select>
    </label>
  );
}
