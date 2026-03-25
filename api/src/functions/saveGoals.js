const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { getAuthenticatedUser } = require('../shared/getAuthenticatedUser');

app.http('saveGoals', {
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

    const { calories, protein, carbs, fats } = body;

    const connectionString = process.env.AzureWebJobsStorage;
    const tableName = process.env.GOALS_TABLE_NAME || 'usergoals';
    const client = TableClient.fromConnectionString(connectionString, tableName);

    const entity = {
      partitionKey: authUser.userKey,
      rowKey: 'goals',
      userId: authUser.userId || authUser.userDetails,
      userDetails: authUser.userDetails,
      calories: calories ?? 2200,
      protein: protein ?? 180,
      carbs: carbs ?? 220,
      fats: fats ?? 70,
      updatedAt: new Date().toISOString()
    };

    try {
      await client.upsertEntity(entity, 'Replace');

      return {
        status: 200,
        jsonBody: {
          message: 'Goals saved successfully.',
          goals: {
            calories: entity.calories,
            protein: entity.protein,
            carbs: entity.carbs,
            fats: entity.fats
          }
        }
      };
    } catch (error) {
      context.log.error('Failed to save goals:', error);

      return {
        status: 500,
        jsonBody: { error: 'Failed to save goals.' }
      };
    }
  }
});