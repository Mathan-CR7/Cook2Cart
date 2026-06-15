import { getIngredientWeight } from '../../utils/nutritionEstimator';

export const money = (value) => {
  const amount = Number(value || 0);
  return `₹${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
};

export const getIngredientName = (ingredient) =>
  ingredient?.ingredientName || ingredient?.name || 'Ingredient';

export const displayQty = (ingredient) => {
  const quantity = ingredient?.recipeQuantity ?? ingredient?.quantity ?? '';
  const unit = ingredient?.recipeUnit ?? ingredient?.unit ?? '';
  return `${quantity} ${unit}`.trim();
};

export const getBrandName = (product) => {
  if (product?.brandName) return product.brandName;
  if (product?.brand) return product.brand;

  const words = (product?.productName || product?.name || 'Product')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2 && words[0]?.toLowerCase() === 'india') {
    return words.slice(0, 2).join(' ');
  }

  return words.slice(0, 2).join(' ') || 'Generic';
};

export const getProductPrice = (product) =>
  Number(product?.marketPrice ?? product?.price ?? 0);

export const getPackSize = (product) =>
  product?.packQuantity || product?.size || 'Market pack';

export const isMarketProduct = (product) =>
  product?.source === 'AGMARKNET';

export const getProductImageUrl = (product, ingredientName = 'Grocery') => {
  if (product?.imageUrl) return product.imageUrl;

  const label = encodeURIComponent(
    ingredientName ||
      product?.ingredientName ||
      product?.productName ||
      'Grocery'
  );

  return `https://placehold.co/180x180/fff7ed/f97316?text=${label}`;
};

const round2 = (value) => Number(Number(value || 0).toFixed(2));

const isLiquidIngredient = (ingredientName = '') => {
  const ingredient = String(ingredientName).toLowerCase();

  return [
    'oil',
    'ghee',
    'milk',
    'water',
    'curd',
    'cream',
    'sauce',
    'vinegar',
    'juice',
    'stock',
    'broth',
  ].some((item) => ingredient.includes(item));
};

const getDensityGramsPerMl = (ingredientName = '') => {
  const ingredient = String(ingredientName).toLowerCase();

  if (ingredient.includes('ghee')) return 0.91;
  if (ingredient.includes('oil')) return 0.92;
  if (ingredient.includes('butter')) return 0.96;
  if (
    ingredient.includes('milk') ||
    ingredient.includes('curd') ||
    ingredient.includes('cream')
  ) {
    return 1.03;
  }

  if (
    ingredient.includes('water') ||
    ingredient.includes('juice') ||
    ingredient.includes('stock') ||
    ingredient.includes('broth')
  ) {
    return 1;
  }

  return null;
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

  if (['kg', 'kilogram', 'kilograms'].includes(normalized)) {
    return { type: 'weight', factor: 1000 };
  }

  if (['g', 'gram', 'grams'].includes(normalized)) {
    return { type: 'weight', factor: 1 };
  }

  if (['l', 'ltr', 'litre', 'liter', 'litres', 'liters'].includes(normalized)) {
    return { type: 'volume', factor: 1000 };
  }

  if (
    ['ml', 'millilitre', 'milliliter', 'millilitres', 'milliliters'].includes(
      normalized
    )
  ) {
    return { type: 'volume', factor: 1 };
  }

  if (['tsp', 'teaspoon', 'teaspoons'].includes(normalized)) {
    return liquid
      ? { type: 'volume', factor: 5 }
      : { type: 'weight', factor: 2.5 };
  }

  if (['tbsp', 'tablespoon', 'tablespoons'].includes(normalized)) {
    return liquid
      ? { type: 'volume', factor: 15 }
      : { type: 'weight', factor: 8 };
  }

  if (['cup', 'cups'].includes(normalized)) {
    return liquid
      ? { type: 'volume', factor: 240 }
      : { type: 'weight', factor: 240 };
  }

  if (
    ['piece', 'pieces', 'pc', 'pcs', 'number', 'nos', 'no'].includes(normalized)
  ) {
    return {
      type: 'weight',
      factor: pieceWeightInGrams(ingredientName),
    };
  }

  if (['clove', 'cloves'].includes(normalized)) {
    return {
      type: 'weight',
      factor: String(ingredientName).toLowerCase().includes('garlic') ? 3 : 0.2,
    };
  }

  if (['inch', 'inches'].includes(normalized)) {
    return { type: 'weight', factor: 5 };
  }

  if (['stick', 'sticks'].includes(normalized)) {
    return { type: 'weight', factor: 5 };
  }

  return { type: 'unit', factor: 1 };
};

const isMetricUnit = (unit = '') => {
  const normalized = String(unit).trim().toLowerCase();

  return [
    'kg',
    'kilogram',
    'kilograms',
    'g',
    'gram',
    'grams',
    'l',
    'ltr',
    'litre',
    'liter',
    'litres',
    'liters',
    'ml',
    'millilitre',
    'milliliter',
    'millilitres',
    'milliliters',
  ].includes(normalized);
};

const isHouseholdUnit = (unit = '') => {
  const normalized = String(unit).trim().toLowerCase();

  return (
    [
      'tsp',
      'teaspoon',
      'teaspoons',
      'tbsp',
      'tablespoon',
      'tablespoons',
      'cup',
      'cups',
      'piece',
      'pieces',
      'pc',
      'pcs',
      'number',
      'nos',
      'no',
      'clove',
      'cloves',
      'inch',
      'inches',
      'stick',
      'sticks',
      'pinch',
      'pinches',
      'handful',
      'handfuls',
      'sprig',
      'sprigs',
      'bunch',
      'bunches',
    ].includes(normalized) ||
    normalized.includes('teaspoon') ||
    normalized.includes('tablespoon')
  );
};

export const toBaseQuantity = (quantity, unit, ingredientName = '') => {
  const parsed = Number(quantity);

  if (!Number.isFinite(parsed)) return null;

  if (!isMetricUnit(unit) && isHouseholdUnit(unit)) {
    return {
      value: getIngredientWeight(ingredientName, parsed, unit),
      type: isLiquidIngredient(ingredientName) ? 'volume' : 'weight',
    };
  }

  const normalized = normalizeUnit(unit, ingredientName);
  const baseValue = parsed * normalized.factor;
  const density = getDensityGramsPerMl(ingredientName);

  if (density && normalized.type === 'weight') {
    return {
      value: baseValue / density,
      type: 'volume',
    };
  }

  return {
    value: baseValue,
    type: normalized.type,
  };
};

const PACK_UNIT_PATTERN =
  '(kg|kilogram|kilograms|g|gram|grams|l|ltr|litre|liter|litres|liters|ml|millilitre|milliliter|millilitres|milliliters)';

const decodeProductText = (value = '') =>
  String(value)
    .replace(/&amp;/gi, '&')
    .replace(/&#x27;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const buildPackCandidate = (quantity, unit, multiplier = 1, ingredientName = '') => {
  const base = toBaseQuantity(quantity, unit, ingredientName);
  const count = Number(multiplier);

  if (!base || !Number.isFinite(count) || count <= 0) return null;

  return {
    ...base,
    value: base.value * count,
  };
};

export const parsePackQuantity = (packText = '', ingredientName = '') => {
  const text = decodeProductText(packText);
  const candidates = [];

  if (!text) return null;

  const metricThenCount = new RegExp(
    `(\\d+(?:\\.\\d+)?)\\s*${PACK_UNIT_PATTERN}\\s*(?:pack\\s*of|packs\\s*of|x|\\*)\\s*(\\d+)`,
    'gi'
  );

  for (const match of text.matchAll(metricThenCount)) {
    const candidate = buildPackCandidate(match[1], match[2], match[3], ingredientName);
    if (candidate) candidates.push(candidate);
  }

  const countThenMetric = new RegExp(
    `(\\d+)\\s*(?:pack|packs|pcs|pieces|pouches|sachets|units|packets|bottles)?\\s*(?:of|x|\\*)\\s*(\\d+(?:\\.\\d+)?)\\s*${PACK_UNIT_PATTERN}`,
    'gi'
  );

  for (const match of text.matchAll(countThenMetric)) {
    const candidate = buildPackCandidate(match[2], match[3], match[1], ingredientName);
    if (candidate) candidates.push(candidate);
  }

  const plainMetric = new RegExp(
    `(\\d+(?:\\.\\d+)?)\\s*${PACK_UNIT_PATTERN}`,
    'gi'
  );

  for (const match of text.matchAll(plainMetric)) {
    const candidate = buildPackCandidate(match[1], match[2], 1, ingredientName);
    if (candidate) candidates.push(candidate);
  }

  if (!candidates.length) return null;

  return candidates.sort((first, second) => second.value - first.value)[0];
};

export const getEffectivePackQuantity = (product, ingredientName = '') => {
  const textSources = [
    product?.productName,
    product?.name,
    product?.packQuantity,
    product?.size,
  ].filter(Boolean);

  return parsePackQuantity(textSources.join(' '), ingredientName);
};

const alignPackToRequired = (required, pack, ingredientName = '') => {
  if (!required || !pack || required.type === pack.type) return pack;

  const density = getDensityGramsPerMl(ingredientName);

  if (!density) return pack;

  if (required.type === 'weight' && pack.type === 'volume') {
    return {
      value: pack.value * density,
      type: 'weight',
    };
  }

  if (required.type === 'volume' && pack.type === 'weight') {
    return {
      value: pack.value / density,
      type: 'volume',
    };
  }

  return pack;
};

export const getRequiredBase = (ingredient) =>
  toBaseQuantity(
    ingredient?.recipeQuantity ?? ingredient?.quantity,
    ingredient?.recipeUnit ?? ingredient?.unit,
    getIngredientName(ingredient)
  );

export const formatBaseQuantity = (quantity, type) => {
  const amount = Number(quantity || 0);

  if (!Number.isFinite(amount)) return '';

  const rounded = round2(amount);

  if (type === 'weight') {
    return amount >= 1000 ? `${round2(amount / 1000)}kg` : `${rounded}g`;
  }

  if (type === 'volume') {
    return amount >= 1000 ? `${round2(amount / 1000)}l` : `${rounded}ml`;
  }

  return `${rounded}`;
};

const getMarketPricePerBaseUnit = (product) => {
  const price = getProductPrice(product);
  const unit = String(product?.priceUnit || '').toLowerCase();

  if (!price) return 0;

  if (unit.includes('quintal')) return price / 100000;
  if (unit.includes('kg')) return price / 1000;
  if (unit.includes('l') || unit.includes('litre') || unit.includes('liter')) {
    return price / 1000;
  }

  return price;
};

export const vegetableOptions = [
  { label: 'Add 250g', value: 250, unit: 'g' },
  { label: 'Add 500g', value: 500, unit: 'g' },
  { label: 'Add 1kg', value: 1, unit: 'kg' },
];

export const calculateProductPricing = (
  ingredient,
  product,
  vegetableOption = vegetableOptions[0]
) => {
  const packPrice = getProductPrice(product);
  const required = getRequiredBase(ingredient);

  const fallback = {
    required,
    pack: null,
    packsNeeded: 1,
    packPrice,
    purchaseCost: round2(packPrice),
    recipeUsageCost: 0,
    unusedQuantity: null,
    unusedValue: 0,
    pricePerBaseUnit: 0,
    warningType: 'unknown-pack',
    selectedVegetableOption: vegetableOption,
  };

  if (!product || !packPrice || !required) return fallback;

  if (isMarketProduct(product)) {
    const selected = toBaseQuantity(
      vegetableOption?.value,
      vegetableOption?.unit
    );

    if (!selected || selected.type !== required.type) return fallback;

    const pricePerBaseUnit = getMarketPricePerBaseUnit(product);

    const purchaseCost = selected.value * pricePerBaseUnit;
    const recipeUsageCost = required.value * pricePerBaseUnit;
    const unusedQuantity = Math.max(0, selected.value - required.value);

    return {
      required,
      pack: selected,
      packsNeeded: 1,
      packPrice: round2(packPrice),
      purchaseCost: round2(purchaseCost),
      recipeUsageCost: round2(recipeUsageCost),
      unusedQuantity: round2(unusedQuantity),
      unusedValue: round2(unusedQuantity * pricePerBaseUnit),
      pricePerBaseUnit: round2(pricePerBaseUnit),
      warningType: selected.value < required.value ? 'more-needed' : null,
      selectedVegetableOption: vegetableOption,
    };
  }

  const parsedPack = getEffectivePackQuantity(product, getIngredientName(ingredient));

  const pack = alignPackToRequired(
    required,
    parsedPack,
    getIngredientName(ingredient)
  );

  if (!pack || pack.type !== required.type || !pack.value) {
    return fallback;
  }

  const packsNeeded = Math.max(1, Math.ceil(required.value / pack.value));

  const totalPackQuantity = pack.value * packsNeeded;

  const purchaseCost = packsNeeded * packPrice;

  const pricePerBaseUnit = packPrice / pack.value;

  const recipeUsageCost = Math.min(
    purchaseCost,
    required.value * pricePerBaseUnit
  );

  const unusedQuantity = Math.max(0, totalPackQuantity - required.value);

  const unusedValue = purchaseCost - recipeUsageCost;

  return {
    required,
    pack,
    packsNeeded,
    packPrice: round2(packPrice),
    purchaseCost: round2(purchaseCost),
    recipeUsageCost: round2(recipeUsageCost),
    unusedQuantity: round2(unusedQuantity),
    unusedValue: round2(unusedValue),
    pricePerBaseUnit: round2(pricePerBaseUnit),
    warningType:
      required.value > pack.value
        ? 'multi-pack'
        : pack.value > required.value
        ? 'oversized-pack'
        : null,
    selectedVegetableOption: vegetableOption,
  };
};

export const getUsageCost = (ingredient, product) =>
  calculateProductPricing(ingredient, product).recipeUsageCost;

export const getVegetablePurchaseCost = (product, option) => {
  const base = toBaseQuantity(option.value, option.unit);

  if (!base) return getProductPrice(product);

  return round2(base.value * getMarketPricePerBaseUnit(product));
};
