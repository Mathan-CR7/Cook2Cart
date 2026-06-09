export const formatQty = (qty) => {
  if (qty === undefined || qty === null || qty === '') return '';
  const num = parseFloat(qty);
  if (isNaN(num)) return qty;
  return Math.round(num * 100) / 100;
};

export const formatUnit = (unit, qty) => {
  if (!unit) return 'pcs';
  let u = unit.toLowerCase().trim();
  
  if (u === 'number' || u === 'numbers' || u === 'nos' || u === 'no') {
    return parseFloat(qty) === 1 ? 'pc' : 'pcs';
  }
  if (u === 'hand' || u === 'hands' || u === 'handful' || u === 'handfuls') {
    return parseFloat(qty) === 1 ? 'handful' : 'handfuls';
  }
  if (u === 'piece' || u === 'pieces' || u === 'pcs' || u === 'pc') {
    return parseFloat(qty) === 1 ? 'pc' : 'pcs';
  }
  if (u === 'tablespoon' || u === 'tablespoons' || u === 'tbsp') {
    return 'tbsp';
  }
  if (u === 'teaspoon' || u === 'teaspoons' || u === 'tsp') {
    return 'tsp';
  }
  if (u === 'gram' || u === 'grams' || u === 'g') {
    return 'g';
  }
  if (u === 'kilogram' || u === 'kilograms' || u === 'kg') {
    return 'kg';
  }
  if (u === 'milliliter' || u === 'milliliters' || u === 'ml') {
    return 'ml';
  }
  if (u === 'liter' || u === 'liters' || u === 'l') {
    return 'l';
  }
  if (u === 'cup' || u === 'cups') {
    return parseFloat(qty) === 1 ? 'cup' : 'cups';
  }
  return unit;
};
