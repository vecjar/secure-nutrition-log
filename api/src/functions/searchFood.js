const { app } = require('@azure/functions');
const { requireAuthenticatedUser } = require('../shared/requireAuthenticatedUser');

const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';

app.http('searchFood', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'searchFood',
  handler: async (request, context) => {
    context.log('searchFood called');

    const authResult = requireAuthenticatedUser(request);

    if (!authResult.ok) {
      context.log('searchFood unauthorized');
      return authResult.response;
    }

    const authUser = authResult.authUser;
    const query = (request.query.get('query') || '').trim();
    const pageSizeRaw = Number(request.query.get('pageSize') || 10);
    const pageSize = Math.min(Math.max(pageSizeRaw, 1), 25);

    if (!query) {
      return {
        status: 400,
        jsonBody: { error: 'Query is required.' }
      };
    }

    if (query.length < 2) {
      return {
        status: 400,
        jsonBody: { error: 'Query must be at least 2 characters.' }
      };
    }

    const apiKey = process.env.USDA_API_KEY;

    if (!apiKey) {
      context.log.error('searchFood missing USDA_API_KEY', {
        userKey: authUser.userKey
      });

      return {
        status: 500,
        jsonBody: { error: 'USDA_API_KEY is missing.' }
      };
    }

    const requestBody = {
      query,
      pageSize,
      pageNumber: 1,
      sortBy: 'dataType.keyword',
      sortOrder: 'asc',
      dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded']
    };

    try {
      context.log('searchFood calling USDA', {
        userKey: authUser.userKey,
        query,
        pageSize
      });

      const usdaResponse = await fetch(`${USDA_SEARCH_URL}?api_key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const responseText = await usdaResponse.text();

      if (!usdaResponse.ok) {
        context.log.error('searchFood USDA request failed', {
          userKey: authUser.userKey,
          query,
          status: usdaResponse.status,
          body: responseText
        });

        return {
          status: 502,
          jsonBody: { error: 'Failed to retrieve food data from USDA.' }
        };
      }

      let usdaData;

      try {
        usdaData = JSON.parse(responseText);
      } catch (parseError) {
        context.log.error('searchFood USDA response parse failed', {
          userKey: authUser.userKey,
          query,
          error: parseError?.message || String(parseError)
        });

        return {
          status: 502,
          jsonBody: { error: 'Invalid response received from USDA.' }
        };
      }

      const foods = Array.isArray(usdaData.foods) ? usdaData.foods : [];

      const results = foods
        .map(mapUsdaFoodToAppShape)
        .filter(Boolean);

      context.log('searchFood success', {
        userKey: authUser.userKey,
        query,
        resultCount: results.length,
        totalHits: usdaData.totalHits || 0
      });

      return {
        status: 200,
        jsonBody: {
          query,
          totalHits: usdaData.totalHits || 0,
          count: results.length,
          results
        }
      };
    } catch (error) {
      context.log.error('searchFood failed', {
        userKey: authUser.userKey,
        query,
        error: error?.message || String(error)
      });

      return {
        status: 500,
        jsonBody: { error: 'Failed to search food data.' }
      };
    }
  }
});

function mapUsdaFoodToAppShape(food) {
  if (!food || !food.description) {
    return null;
  }

  const nutrients = Array.isArray(food.foodNutrients) ? food.foodNutrients : [];

  const calories =
    findNutrientValue(nutrients, ['Energy'], [1008]) ??
    0;

  const protein =
    findNutrientValue(nutrients, ['Protein'], [1003]) ??
    0;

  const carbs =
    findNutrientValue(nutrients, ['Carbohydrate, by difference'], [1005]) ??
    0;

  const fats =
    findNutrientValue(nutrients, ['Total lipid (fat)'], [1004]) ??
    0;

  return {
    fdcId: food.fdcId,
    foodName: cleanFoodName(food.description),
    brandName: food.brandOwner || food.brandName || '',
    dataType: food.dataType || '',
    serving: buildServingLabel(food),
    calories: roundNumber(calories),
    protein: roundNumber(protein),
    carbs: roundNumber(carbs),
    fats: roundNumber(fats)
  };
}

function findNutrientValue(nutrients, names = [], numbers = []) {
  for (const nutrient of nutrients) {
    const nutrientName = nutrient?.nutrientName || nutrient?.name || '';
    const nutrientNumber = Number(nutrient?.nutrientNumber);
    const value = nutrient?.value;

    const matchesName = names.includes(nutrientName);
    const matchesNumber = numbers.includes(nutrientNumber);

    if ((matchesName || matchesNumber) && value !== undefined && value !== null) {
      return Number(value);
    }
  }

  return null;
}

function buildServingLabel(food) {
  if (food.servingSize && food.servingSizeUnit) {
    return `${food.servingSize} ${food.servingSizeUnit}`;
  }

  if (food.householdServingFullText) {
    return food.householdServingFullText;
  }

  return '100 g';
}

function cleanFoodName(name) {
  return String(name).replace(/\s+/g, ' ').trim();
}

function roundNumber(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}