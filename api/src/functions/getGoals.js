const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { getAuthenticatedUser } = require('../shared/getAuthenticatedUser');

app.http('getGoals', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'getGoals',
  handler: async (request, context) => {
    const authUser = getAuthenticatedUser(request);

    if (!authUser) {
      return {
        status: 401,
        jsonBody: {
          error: 'Unauthorized.',
          detail: 'No authenticated user could be resolved from x-ms-client-principal.'
        }
      };
    }

    const connectionString = process.env.AzureWebJobsStorage;
    const tableName = process.env.GOALS_TABLE_NAME || 'usergoals';

    if (!connectionString) {
      return {
        status: 500,
        jsonBody: {
          error: 'AzureWebJobsStorage is missing.'
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