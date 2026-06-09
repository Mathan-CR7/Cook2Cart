export const money = (value) => {
  const amount = Number(value || 0);
  return `₹${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
};

export const getIngredientName = (ingredient) => (
  ingredient?.ingredientName || ingredient?.name || 'Ingredient'
);

export const displayQty = (ingredient) => {
  const quantity = ingredient?.recipeQuantity ?? ingredient?.quantity ?? '';
  const unit = ingredient?.recipeUnit ?? ingredient?.unit ?? '';
  return `${quantity} ${unit}`.trim();
};

export const getBrandName = (product) => {
  if (product?.brandName) return product.brandName;
  if (product?.brand) return product.brand;
  const words = (product?.productName || product?.name || 'Product').split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words[0]?.toLowerCase() === 'india') return words.slice(0, 2).join(' ');
  return words.slice(0, 2).join(' ') || 'Generic';
};

export const getProductPrice = (product) => Number(product?.marketPrice ?? product?.price ?? 0);

export const getPackSize = (product) => product?.packQuantity || product?.size || 'Market pack';

export const isMarketProduct = (product) => product?.source === 'AGMARKNET';

export const getProductImageUrl = (product, ingredientName = 'Grocery') => {
  if (product?.imageUrl) return product.imageUrl;
  const label = encodeURIComponent(ingredientName || product?.ingredientName || product?.productName || 'Grocery');
  return `https://placehold.co/180x180/fff7ed/f97316?text=${label}`;
};

const isLiquidIngredient = (ingredientName = '') => {
  const ingredient = String(ingredientName).toLowerCase();
  return ['oil', 'milk', 'water', 'curd', 'cream', 'sauce', 'vinegar', 'juice', 'stock', 'broth'].some((item) => ingredient.includes(item));
};

const pieceWeightInGrams = (ingredientName = '') => {
  const ingredient = String(ingredientName).toLowerCase();
  if (ingredient.includes('cardamom')) return 0.25;
  if (ingredient.includes('star anise')) return 2;
  if (ingredient.includes('clove')) return ingredient.includes('garlic') ? 3 : 0.2;
  if (ingredient.includes('cinnamon')) return 5;
  if (ingredient.includes('garlic')) return 3;
  if (ingredient.includes('ginger')) return 5;
  if (ingredient.includes('onion')) return 100;
  if (ingredient.includes('tomato')) return 80;
  if (ingredient.includes('egg')) return 50;
  if (ingredient.includes('chilli') || ingredient.includes('chili')) return 5;
  if (ingredient.includes('leaf') || ingredient.includes('leaves')) return 0.5;
  return 10;
};

const normalizeUnit = (unit = '', ingredientName = '') => {
  const normalized = String(unit).trim().toLowerCase();
  const liquid = isLiquidIngredient(ingredientName);

  if (['kg', 'kilogram', 'kilograms'].includes(normalized)) return { type: 'weight', factor: 1000 };
  if (['g', 'gram', 'grams'].includes(normalized)) return { type: 'weight', factor: 1 };
  if (['l', 'ltr', 'litre', 'liter', 'litres', 'liters'].includes(normalized)) return { type: 'volume', factor: 1000 };
  if (['ml', 'millilitre', 'milliliter', 'millilitres', 'milliliters'].includes(normalized)) return { type: 'volume', factor: 1 };
  if (['tsp', 'teaspoon', 'teaspoons'].includes(normalized)) return liquid ? { type: 'volume', factor: 5 } : { type: 'weight', factor: 2.5 };
  if (['tbsp', 'tablespoon', 'tablespoons'].includes(normalized)) return liquid ? { type: 'volume', factor: 15 } : { type: 'weight', factor: 8 };
  if (['cup', 'cups'].includes(normalized)) return liquid ? { type: 'volume', factor: 240 } : { type: 'weight', factor: 240 };
  if (['piece', 'pieces', 'pc', 'pcs', 'number', 'nos', 'no'].includes(normalized)) return { type: 'weight', factor: pieceWeightInGrams(ingredientName) };
  if (['clove', 'cloves'].includes(normalized)) return { type: 'weight', factor: String(ingredientName).toLowerCase().includes('garlic') ? 3 : 0.2 };
  if (['inch', 'inches'].includes(normalized)) return { type: 'weight', factor: 5 };
  if (['stick', 'sticks'].includes(normalized)) return { type: 'weight', factor: 5 };
  return { type: 'unit', factor: 1 };
};

export const toBaseQuantity = (quantity, unit, ingredientName = '') => {
  const parsed = Number(quantity);
  if (!Number.isFinite(parsed)) return null;
  const normalized = normalizeUnit(unit, ingredientName);
  return {
    value: parsed * normalized.factor,
    type: normalized.type,
  };
};

export const parsePackQuantity = (packText = '') => {
  const text = String(packText).toLowerCase();
  const match = text.match(/(\d+(?:\.\d+)?)\s*(kg|kilogram|kilograms|g|gram|grams|l|ltr|litre|liter|litres|liters|ml|millilitre|milliliter)/i);
  if (!match) return null;
  return toBaseQuantity(match[1], match[2]);
};

export const getRequiredBase = (ingredient) => (
  toBaseQuantity(
    ingredient?.recipeQuantity ?? ingredient?.quantity,
    ingredient?.recipeUnit ?? ingredient?.unit,
    getIngredientName(ingredient)
  )
);

export const formatBaseQuantity = (quantity, type) => {
  const amount = Number(quantity || 0);
  if (!Number.isFinite(amount)) return '';
  const rounded = Math.round(amount * 100) / 100;
  if (type === 'weight') return `${rounded}g`;
  if (type === 'volume') return `${rounded}ml`;
  return `${rounded}`;
};

const getMarketPricePerBaseUnit = (product) => {
  const price = getProductPrice(product);
  const unit = String(product?.priceUnit || '').toLowerCase();
  if (!price) return 0;
  if (unit.includes('quintal')) return price / 100000;
  if (unit.includes('kg')) return price / 1000;
  if (unit.includes('l') || unit.includes('litre') || unit.includes('liter')) return price / 1000;
  return price;
};

export const vegetableOptions = [
  { label: 'Add 250g', value: 250, unit: 'g' },
  { label: 'Add 500g', value: 500, unit: 'g' },
  { label: 'Add 1kg', value: 1, unit: 'kg' },
];

export const calculateProductPricing = (ingredient, product, vegetableOption = vegetableOptions[0]) => {
  const packPrice = getProductPrice(product);
  const required = getRequiredBase(ingredient);
  const fallback = {
    required,
    pack: null,
    packsNeeded: 1,
    packPrice,
    purchaseCost: packPrice,
    recipeUsageCost: packPrice,
    unusedQuantity: null,
    unusedValue: 0,
    warningType: null,
    selectedVegetableOption: vegetableOption,
  };

  if (!product || !packPrice || !required) return fallback;

  if (isMarketProduct(product)) {
    const selected = toBaseQuantity(vegetableOption?.value, vegetableOption?.unit);
    if (!selected || selected.type !== required.type) return fallback;
    const pricePerBaseUnit = getMarketPricePerBaseUnit(product);
    const purchaseCost = selected.value * pricePerBaseUnit;
    const recipeUsageCost = required.value * pricePerBaseUnit;
    const unusedQuantity = Math.max(0, selected.value - required.value);
    return {
      required,
      pack: selected,
      packsNeeded: 1,
      packPrice,
      purchaseCost,
      recipeUsageCost,
      unusedQuantity,
      unusedValue: unusedQuantity * pricePerBaseUnit,
      warningType: selected.value < required.value ? 'more-needed' : null,
      selectedVegetableOption: vegetableOption,
    };
  }

  const pack = parsePackQuantity(getPackSize(product));
  if (!pack || pack.type !== required.type || !pack.value) return fallback;

  const packsNeeded = Math.max(1, Math.ceil(required.value / pack.value));
  const totalPackQuantity = pack.value * packsNeeded;
  const purchaseCost = packsNeeded * packPrice;
  const recipeUsageCost = (required.value / totalPackQuantity) * purchaseCost;
  const unusedQuantity = Math.max(0, totalPackQuantity - required.value);

  return {
    required,
    pack,
    packsNeeded,
    packPrice,
    purchaseCost,
    recipeUsageCost,
    unusedQuantity,
    unusedValue: purchaseCost - recipeUsageCost,
    warningType: required.value > pack.value ? 'multi-pack' : pack.value > required.value ? 'oversized-pack' : null,
    selectedVegetableOption: vegetableOption,
  };
};

export const getUsageCost = (ingredient, product) => (
  calculateProductPricing(ingredient, product).recipeUsageCost
);

export const getVegetablePurchaseCost = (product, option) => {
  const base = toBaseQuantity(option.value, option.unit);
  if (!base) return getProductPrice(product);
  return base.value * getMarketPricePerBaseUnit(product);
};
