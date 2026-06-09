export const getEstimatedNutrition = (recipeName = '') => {
  const name = recipeName.toLowerCase();
  
  if (name.includes('biryani')) {
    return {
      calories: '550 kcal',
      protein: '22g',
      carbohydrates: '75g',
      fat: '16g',
      vitamins: 'Vitamin A: 12%, Vitamin C: 8%, Calcium: 6%, Iron: 15%'
    };
  }
  if (name.includes('butter chicken') || name.includes('paneer butter') || name.includes('paneer')) {
    return {
      calories: '620 kcal',
      protein: '26g',
      carbohydrates: '14g',
      fat: '32g',
      vitamins: 'Vitamin A: 25%, Vitamin C: 10%, Calcium: 18%, Iron: 12%'
    };
  }
  if (name.includes('lava cake') || name.includes('cupcake') || name.includes('cake') || name.includes('dessert')) {
    return {
      calories: '380 kcal',
      protein: '4g',
      carbohydrates: '52g',
      fat: '18g',
      vitamins: 'Vitamin D: 5%, Calcium: 8%, Iron: 10%'
    };
  }
  if (name.includes('fries') || name.includes('french fries') || name.includes('potato')) {
    return {
      calories: '312 kcal',
      protein: '3.4g',
      carbohydrates: '41g',
      fat: '15g',
      vitamins: 'Vitamin C: 15%, Vitamin B6: 20%, Potassium: 12%'
    };
  }
  if (name.includes('pasta') || name.includes('noodle') || name.includes('spaghetti')) {
    return {
      calories: '450 kcal',
      protein: '14g',
      carbohydrates: '68g',
      fat: '12g',
      vitamins: 'Vitamin A: 8%, Vitamin C: 12%, Calcium: 10%, Iron: 14%'
    };
  }
  if (name.includes('chicken') || name.includes('mutton') || name.includes('fish') || name.includes('egg')) {
    return {
      calories: '480 kcal',
      protein: '32g',
      carbohydrates: '12g',
      fat: '18g',
      vitamins: 'Vitamin A: 8%, Vitamin B12: 25%, Iron: 15%'
    };
  }
  if (name.includes('salad') || name.includes('vegetable') || name.includes('soup')) {
    return {
      calories: '180 kcal',
      protein: '5g',
      carbohydrates: '18g',
      fat: '6g',
      vitamins: 'Vitamin A: 45%, Vitamin C: 60%, Calcium: 10%, Iron: 8%'
    };
  }
  
  // default fallback for any other recipe
  return {
    calories: '420 kcal',
    protein: '15g',
    carbohydrates: '48g',
    fat: '14g',
    vitamins: 'Vitamin A: 10%, Vitamin C: 15%, Calcium: 8%, Iron: 10%'
  };
};

const INGREDIENT_DATABASE = {
  chicken: { calories: 165, protein: 31, carbs: 0, fat: 3.6, vitamins: 'Vitamin B6, Iron' },
  paneer: { calories: 265, protein: 18, carbs: 1.2, fat: 20, vitamins: 'Calcium, Vitamin D' },
  rice: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, vitamins: 'Iron, Vitamin B6' },
  pasta: { calories: 157, protein: 5.8, carbs: 30, fat: 0.9, vitamins: 'Iron, B Vitamins' },
  butter: { calories: 717, protein: 0.85, carbs: 0.06, fat: 81, vitamins: 'Vitamin A, Vitamin E' },
  oil: { calories: 884, protein: 0, carbs: 0, fat: 100, vitamins: 'Vitamin E, Vitamin K' },
  ghee: { calories: 900, protein: 0, carbs: 0, fat: 100, vitamins: 'Vitamin A, Vitamin E' },
  garlic: { calories: 149, protein: 6.4, carbs: 33, fat: 0.5, vitamins: 'Vitamin C, Vitamin B6' },
  ginger: { calories: 80, protein: 1.8, carbs: 18, fat: 0.8, vitamins: 'Vitamin C, Potassium' },
  onion: { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, vitamins: 'Vitamin C, Folate' },
  tomato: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, vitamins: 'Vitamin C, Potassium, Vitamin K' },
  chili: { calories: 40, protein: 2, carbs: 9, fat: 0.4, vitamins: 'Vitamin C, Vitamin A' },
  egg: { calories: 155, protein: 13, carbs: 1.1, fat: 11, vitamins: 'Vitamin D, B12, Iron' },
  salt: { calories: 0, protein: 0, carbs: 0, fat: 0, vitamins: 'Sodium' },
  water: { calories: 0, protein: 0, carbs: 0, fat: 0, vitamins: 'Minerals' },
  flour: { calories: 364, protein: 10, carbs: 76, fat: 1, vitamins: 'Iron, B Vitamins' },
  maida: { calories: 364, protein: 10, carbs: 76, fat: 1, vitamins: 'Iron, B Vitamins' },
  sugar: { calories: 387, protein: 0, carbs: 100, fat: 0, vitamins: 'None' },
  milk: { calories: 64, protein: 3.3, carbs: 4.8, fat: 3.6, vitamins: 'Calcium, Vitamin D' },
  potato: { calories: 77, protein: 2, carbs: 17, fat: 0.1, vitamins: 'Vitamin C, B6' },
  carrot: { calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2, vitamins: 'Vitamin A, K' },
  capsicum: { calories: 20, protein: 0.9, carbs: 4.6, fat: 0.2, vitamins: 'Vitamin C, A' },
  turmeric: { calories: 312, protein: 9.7, carbs: 67, fat: 3.2, vitamins: 'Iron, Potassium' },
  curry: { calories: 108, protein: 6, carbs: 18, fat: 1, vitamins: 'Vitamin A, Calcium' },
  coriander: { calories: 23, protein: 2, carbs: 3.7, fat: 0.5, vitamins: 'Vitamin C, A' },
  mint: { calories: 70, protein: 3.8, carbs: 15, fat: 0.9, vitamins: 'Vitamin A, C' },
  cinnamon: { calories: 247, protein: 4, carbs: 81, fat: 1.2, vitamins: 'Calcium, Iron' },
  cardamom: { calories: 311, protein: 11, carbs: 68, fat: 6.7, vitamins: 'Iron, Calcium' },
  clove: { calories: 274, protein: 6, carbs: 66, fat: 13, vitamins: 'Manganese' },
  bay: { calories: 313, protein: 7.6, carbs: 75, fat: 8.3, vitamins: 'Vitamin A, C' },
  peppercorn: { calories: 251, protein: 10, carbs: 64, fat: 3.3, vitamins: 'Calcium, Iron' },
};

export const getIngredientWeight = (ingredientName = '', qty = 1, unit = 'pcs') => {
  const name = ingredientName.toLowerCase().trim();
  let numericQty = parseFloat(qty);
  if (isNaN(numericQty) || numericQty <= 0) {
    numericQty = 1;
  }
  
  const unitNorm = (unit || '').toLowerCase().trim();
  let weight = 0;
  
  // Weight determination logic matching the provided conversions
  if (unitNorm.includes('pinch') && name.includes('salt')) {
    weight = numericQty * 0.3;
  } else if (unitNorm.includes('handful') && name.includes('rice')) {
    weight = numericQty * 30;
  } else if (unitNorm.includes('handful') && name.includes('coriander')) {
    weight = numericQty * 20;
  } else if (unitNorm.includes('sprig') && name.includes('curry')) {
    weight = numericQty * 2.5; // based on 10-15 leaves (10 leaves = 2g, so 12 leaves is roughly 2.4-2.5g)
  } else if (unitNorm.includes('bunch') && name.includes('coriander')) {
    weight = numericQty * 100;
  } else if (unitNorm.includes('bunch') && name.includes('mint')) {
    weight = numericQty * 80;
  } else if (unitNorm === 'g' || unitNorm === 'gram' || unitNorm === 'grams') {
    weight = numericQty;
  } else if (unitNorm === 'ml' || unitNorm === 'milliliter' || unitNorm === 'milliliters') {
    weight = numericQty;
  } else if (unitNorm === 'kg' || unitNorm === 'kilogram' || unitNorm === 'kilograms') {
    weight = numericQty * 1000;
  } else if (unitNorm === 'l' || unitNorm === 'liter' || unitNorm === 'liters') {
    weight = numericQty * 1000;
  } else if (unitNorm === 'tsp' || unitNorm.includes('teaspoon')) {
    if (name.includes('turmeric') || name.includes('chilli') || name.includes('chili')) {
      weight = numericQty * 3;
    } else if (name.includes('coriander') && name.includes('powder')) {
      weight = numericQty * 2;
    } else if (name.includes('garam') || name.includes('masala')) {
      weight = numericQty * 2;
    } else if (name.includes('cumin')) {
      weight = numericQty * 2;
    } else if (name.includes('salt')) {
      weight = numericQty * 5;
    } else {
      weight = numericQty * 5;
    }
  } else if (unitNorm === 'tbsp' || unitNorm.includes('tablespoon')) {
    weight = numericQty * 15;
  } else if (unitNorm.includes('cup')) {
    if (name.includes('rice')) {
      weight = numericQty * 200;
    } else if (name.includes('wheat') || name.includes('flour')) {
      weight = numericQty * 120;
    } else if (name.includes('maida')) {
      weight = numericQty * 125;
    } else if (name.includes('sugar')) {
      weight = numericQty * 200;
    } else if (name.includes('milk')) {
      weight = numericQty * 240;
    } else if (name.includes('water')) {
      weight = numericQty * 240;
    } else {
      weight = numericQty * 150;
    }
  } else if (unitNorm.includes('piece') || unitNorm === 'pc' || unitNorm === 'pcs' || unitNorm.includes('no') || unitNorm === '') {
    if (name.includes('onion')) {
      weight = numericQty * 100;
    } else if (name.includes('tomato')) {
      weight = numericQty * 100;
    } else if (name.includes('potato')) {
      weight = numericQty * 150;
    } else if (name.includes('carrot')) {
      weight = numericQty * 60;
    } else if (name.includes('capsicum')) {
      weight = numericQty * 120;
    } else if (name.includes('green chilli') || name.includes('green chili')) {
      weight = numericQty * 5;
    } else if (name.includes('dry red chilli') || name.includes('red chilli') || name.includes('chili')) {
      weight = numericQty * 2;
    } else if (name.includes('clove') || name.includes('garlic')) {
      weight = numericQty * 4; // clove default
    } else if (name.includes('ginger')) {
      weight = numericQty * 10; // inch piece default
    } else if (name.includes('curry')) {
      weight = numericQty * 0.2; // 1 leaf = 0.2g (10 leaves = 2g)
    } else if (name.includes('cinnamon')) {
      weight = numericQty * 2;
    } else if (name.includes('clove')) {
      weight = numericQty * 0.2;
    } else if (name.includes('cardamom')) {
      weight = numericQty * 0.3;
    } else if (name.includes('bay leaf') || name.includes('bay leaves')) {
      weight = numericQty * 0.5;
    } else if (name.includes('peppercorn')) {
      weight = numericQty * 0.05;
    } else if (name.includes('egg')) {
      weight = numericQty * 50;
    } else if (name.includes('chicken')) {
      weight = numericQty * 150; // chicken piece
    } else if (name.includes('paneer')) {
      weight = numericQty * 20; // paneer piece
    } else {
      weight = numericQty * 50; // default piece weight
    }
  } else if (unitNorm.includes('clove')) {
    weight = numericQty * 4;
  } else if (unitNorm.includes('inch')) {
    weight = numericQty * 10;
  } else if (unitNorm.includes('handful')) {
    if (name.includes('coriander')) {
      weight = numericQty * 20;
    } else if (name.includes('mint')) {
      weight = numericQty * 15;
    } else {
      weight = numericQty * 20;
    }
  } else if (unitNorm.includes('sprig')) {
    weight = numericQty * 2.5;
  } else if (unitNorm.includes('pinch')) {
    weight = numericQty * 0.5;
  } else {
    weight = numericQty * 50; // default generic fallback weight
  }
  
  return weight;
};

export const getIngredientNutrition = (ingredientName = '', qty = 1, unit = 'pcs') => {
  const name = ingredientName.toLowerCase().trim();
  
  let base = null;
  for (const [key, val] of Object.entries(INGREDIENT_DATABASE)) {
    if (name.includes(key)) {
      base = val;
      break;
    }
  }
  
  if (!base) {
    base = { calories: 50, protein: 1, carbs: 10, fat: 0.5, vitamins: 'Vitamin C, Minerals' };
  }
  
  const weight = getIngredientWeight(ingredientName, qty, unit);
  const scaleFactor = weight / 100;

  return {
    calories: Math.round(base.calories * scaleFactor),
    protein: Math.round((base.protein * scaleFactor) * 10) / 10,
    carbohydrates: Math.round((base.carbs * scaleFactor) * 10) / 10,
    fat: Math.round((base.fat * scaleFactor) * 10) / 10,
    vitamins: base.vitamins,
  };
};

export const getDisplayQuantityWithConversion = (ingredientName = '', qty, unit) => {
  if (qty === undefined || qty === null || qty === '') {
    return unit ? `${qty} ${unit}`.trim() : '';
  }
  const q = parseFloat(qty);
  if (isNaN(q) || q <= 0) {
    return `${qty} ${unit}`.trim();
  }
  
  const unitNorm = (unit || '').toLowerCase().trim();
  const isMetric = ['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms', 'ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters'].includes(unitNorm);
  
  if (isMetric) {
    return `${qty} ${unit}`;
  }
  
  const weight = getIngredientWeight(ingredientName, qty, unit);
  if (weight <= 0) {
    return `${qty} ${unit}`;
  }
  
  const name = ingredientName.toLowerCase().trim();
  const isLiquid = name.includes('oil') || name.includes('milk') || name.includes('water') ||
                    name.includes('extract') || name.includes('juice') || name.includes('sauce') || 
                    name.includes('vinegar');
                    
  let conversionStr = '';
  if (isLiquid) {
    conversionStr = weight >= 1000 
      ? `${(weight / 1000).toFixed(1).replace(/\.0$/, '')} l`
      : `${Math.round(weight)} ml`;
  } else {
    conversionStr = weight >= 1000 
      ? `${(weight / 1000).toFixed(1).replace(/\.0$/, '')} kg`
      : `${Math.round(weight)}g`;
  }
  
  return `${qty} ${unit} - ${conversionStr}`;
};
