const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { requireAuthenticatedUser } = require('../shared/requireAuthenticatedUser');

app.http('getCustomFoods', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'getCustomFoods',
  handler: async (request, context) => {
    const authResult = requireAuthenticatedUser(request);

if (!authResult.ok) {
  return authResult.response;
}

const authUser = authResult.authUser;

    const connectionString = process.env.STORAGE_CONNECTION_STRING;
    const tableName = process.env.CUSTOM_FOODS_TABLE_NAME || 'customfoods';
    const client = TableClient.fromConnectionString(connectionString, tableName);

    const foods = [];

    try {
      const entities = client.listEntities({
        queryOptions: {
          filter: `PartitionKey eq '${authUser.userKey}'`
        }
      });

      for await (const entity of entities) {
        foods.push({
          id: entity.rowKey,
          foodName: entity.foodName,
          calories: entity.calories,
          protein: entity.protein ?? 0,
          carbs: entity.carbs ?? 0,
          fats: entity.fats ?? 0,
          notes: entity.notes ?? '',
          createdAt: entity.createdAt
        });
      }

      return {
        status: 200,
        jsonBody: { foods }
      };
    } catch (error) {
      context.log.error('Failed to load custom foods:', error);

      return {
        status: 500,
        jsonBody: { error: 'Failed to load custom foods.' }
      };
    }
  }
});