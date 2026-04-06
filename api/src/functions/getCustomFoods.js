const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { requireAuthenticatedUser } = require('../shared/requireAuthenticatedUser');
const checkUserBlocked = require('../shared/checkUserBlocked');

app.http('getCustomFoods', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'getCustomFoods',
  handler: async (request, context) => {
    context.log('getCustomFoods called');

    const authResult = requireAuthenticatedUser(request);

    if (!authResult.ok) {
      context.log.warn('getCustomFoods unauthorized');
      return authResult.response;
    }

    const authUser = authResult.authUser;

    const blockedCheck = await checkUserBlocked(authUser, context);
    if (!blockedCheck.ok) {
      return blockedCheck.response;
    }

    const connectionString = process.env.STORAGE_CONNECTION_STRING;
    const tableName = process.env.CUSTOM_FOODS_TABLE_NAME || 'customfoods';

    context.log('getCustomFoods authenticated', {
      userKey: authUser.userKey,
      tableName
    });

    if (!connectionString) {
      context.log.error('getCustomFoods missing storage connection string', {
        userKey: authUser.userKey,
        tableName
      });

      return {
        status: 500,
        jsonBody: { error: 'STORAGE_CONNECTION_STRING is missing.' }
      };
    }

    let client;

    try {
      client = TableClient.fromConnectionString(connectionString, tableName);

      context.log('getCustomFoods storage client created', {
        userKey: authUser.userKey,
        tableName
      });
    } catch (error) {
      context.log.error('getCustomFoods failed to create storage client', {
        userKey: authUser.userKey,
        tableName,
        error: error?.message || String(error)
      });

      return {
        status: 500,
        jsonBody: { error: 'Failed to create storage client.' }
      };
    }

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

      context.log('getCustomFoods success', {
        userKey: authUser.userKey,
        tableName,
        count: foods.length
      });

      return {
        status: 200,
        jsonBody: { foods }
      };
    } catch (error) {
      context.log.error('getCustomFoods failed', {
        userKey: authUser.userKey,
        tableName,
        error: error?.message || String(error)
      });

      return {
        status: 500,
        jsonBody: { error: 'Failed to load custom foods.' }
      };
    }
  }
});