const crypto = require('crypto');
const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { getAuthenticatedUser } = require('../shared/getAuthenticatedUser');

app.http('createCustomFood', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const authUser = getAuthenticatedUser(request);

    if (!authUser) {
      return {
        status: 401,
        jsonBody: { error: 'Unauthorized.' }
      };
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return {
        status: 400,
        jsonBody: { error: 'Request body must be valid JSON.' }
      };
    }

    const { foodName, calories, protein, carbs, fats, notes } = body;

    if (!foodName || calories === undefined || calories === null) {
      return {
        status: 400,
        jsonBody: { error: 'foodName and calories are required.' }
      };
    }

    const connectionString = process.env.AzureWebJobsStorage;
    const tableName = process.env.CUSTOM_FOODS_TABLE_NAME || 'customfoods';
    const client = TableClient.fromConnectionString(connectionString, tableName);

    const entity = {
      partitionKey: authUser.userKey,
      rowKey: crypto.randomUUID(),
      userId: authUser.userId || authUser.userDetails,
      userDetails: authUser.userDetails,
      foodName,
      calories: Number(calories),
      protein: protein ?? 0,
      carbs: carbs ?? 0,
      fats: fats ?? 0,
      notes: notes ?? '',
      createdAt: new Date().toISOString()
    };

    try {
      await client.createEntity(entity);

      return {
        status: 201,
        jsonBody: {
          message: 'Custom food saved.',
          food: {
            id: entity.rowKey,
            foodName: entity.foodName,
            calories: entity.calories,
            protein: entity.protein,
            carbs: entity.carbs,
            fats: entity.fats,
            notes: entity.notes,
            createdAt: entity.createdAt
          }
        }
      };
    } catch (error) {
      context.log.error('Failed to save custom food:', error);

      return {
        status: 500,
        jsonBody: { error: 'Failed to save custom food.' }
      };
    }
  }
});