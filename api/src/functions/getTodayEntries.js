const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { getAuthenticatedUser } = require('../shared/getAuthenticatedUser');

app.http('getTodayEntries', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'getTodayEntries',
  handler: async (request, context) => {
    const authUser = getAuthenticatedUser(request);

    if (!authUser) {
      return {
        status: 401,
        jsonBody: { error: 'Unauthorized.' }
      };
    }

    const requestedDate = request.query.get('date');
    const targetDate = requestedDate || new Date().toISOString().split('T')[0];

    const connectionString = process.env.AzureWebJobsStorage;
    const tableName = process.env.TABLE_NAME || 'foodentries';
    const client = TableClient.fromConnectionString(connectionString, tableName);

    const entries = [];

    try {
      const entities = client.listEntities({
        queryOptions: {
          filter: `PartitionKey eq '${authUser.userKey}'`
        }
      });

      for await (const entity of entities) {
        if (entity.date !== targetDate) {
          continue;
        }

        entries.push({
          id: entity.rowKey,
          date: entity.date,
          mealType: entity.mealType,
          foodName: entity.foodName,
          calories: entity.calories,
          protein: entity.protein ?? null,
          carbs: entity.carbs ?? null,
          fats: entity.fats ?? null,
          notes: entity.notes ?? '',
          createdAt: entity.createdAt
        });
      }

      return {
        status: 200,
        jsonBody: {
          date: targetDate,
          count: entries.length,
          entries
        }
      };
    } catch (error) {
      context.log.error('Failed to retrieve entries:', error);

      return {
        status: 500,
        jsonBody: { error: 'Failed to retrieve food entries.' }
      };
    }
  }
});