const crypto = require('crypto');
const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { getAuthenticatedUser } = require('../shared/getAuthenticatedUser');

app.http('createEntry', {
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

    const {
      date,
      mealType,
      foodName,
      calories,
      protein,
      carbs,
      fats,
      notes
    } = body;

    if (!mealType || !foodName || calories === undefined || calories === null) {
      return {
        status: 400,
        jsonBody: { error: 'mealType, foodName, and calories are required.' }
      };
    }

    const entryDate = date || new Date().toISOString().split('T')[0];

    const connectionString = process.env.STORAGE_CONNECTION_STRING;
    const tableName = process.env.TABLE_NAME || 'foodentries';
    const client = TableClient.fromConnectionString(connectionString, tableName);

    const entity = {
      partitionKey: authUser.userKey,
      rowKey: crypto.randomUUID(),
      userId: authUser.userId || authUser.userDetails,
      userDetails: authUser.userDetails,
      date: entryDate,
      mealType,
      foodName,
      calories: Number(calories),
      protein: protein !== null && protein !== undefined ? Number(protein) : null,
      carbs: carbs !== null && carbs !== undefined ? Number(carbs) : null,
      fats: fats !== null && fats !== undefined ? Number(fats) : null,
      notes: notes ?? '',
      createdAt: new Date().toISOString()
    };

    try {
      await client.createEntity(entity);

      return {
        status: 201,
        jsonBody: {
          message: 'Entry created successfully.',
          entry: {
            id: entity.rowKey,
            date: entity.date,
            mealType: entity.mealType,
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
      context.log.error('Failed to create entry:', error);

      return {
        status: 500,
        jsonBody: { error: 'Failed to create entry.' }
      };
    }
  }
});