const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { requireAuthenticatedUser } = require('../shared/requireAuthenticatedUser');

app.http('getGoals', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'getGoals',
  handler: async (request, context) => {
    const authResult = requireAuthenticatedUser(request);

    if (!authResult.ok) {
      return authResult.response;
    }

    const authUser = authResult.authUser;
    const connectionString = process.env.STORAGE_CONNECTION_STRING;
    const tableName = process.env.GOALS_TABLE_NAME || 'usergoals';

    if (!connectionString) {
      return {
        status: 500,
        jsonBody: {
          error: 'STORAGE_CONNECTION_STRING is missing.'
        }
      };
    }

    let client;

    try {
      client = TableClient.fromConnectionString(connectionString, tableName);
    } catch (error) {
      context.log.error('Failed to create TableClient in getGoals:', error);

      return {
        status: 500,
        jsonBody: {
          error: 'Failed to create storage client.',
          detail: error?.message || String(error)
        }
      };
    }

    try {
      const entity = await client.getEntity(authUser.userKey, 'goals');

      return {
        status: 200,
        jsonBody: {
          goals: {
            calories: entity.calories ?? 0,
            protein: entity.protein ?? 0,
            carbs: entity.carbs ?? 0,
            fats: entity.fats ?? 0
          }
        }
      };
    } catch (error) {
      if (error.statusCode === 404) {
        return {
          status: 200,
          jsonBody: { goals: null }
        };
      }

      context.log.error('Failed to get goals:', error);

      return {
        status: 500,
        jsonBody: {
          error: 'Failed to load goals.',
          detail: error?.message || String(error),
          tableName,
          userKey: authUser.userKey
        }
      };
    }
  }
});