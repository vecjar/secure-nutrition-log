const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { getAuthenticatedUser } = require('../shared/getAuthenticatedUser');

app.http('getGoals', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'getGoals',
  handler: async (request, context) => {
    let authUser;

    try {
      authUser = getAuthenticatedUser(request);
    } catch (error) {
      context.log.error('Authentication error in getGoals:', error);

      return {
        status: 401,
        jsonBody: {
          error: 'Unauthorized.',
          detail: error?.message || String(error)
        }
      };
    }

    if (!authUser) {
      return {
        status: 401,
        jsonBody: { error: 'Unauthorized.' }
      };
    }

    const connectionString = process.env.AzureWebJobsStorage;
    const tableName = process.env.GOALS_TABLE_NAME || 'usergoals';

    if (!connectionString) {
      context.log.error('AzureWebJobsStorage is missing in getGoals.');

      return {
        status: 500,
        jsonBody: {
          error: 'Server storage configuration is missing.'
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
            calories: entity.calories,
            protein: entity.protein,
            carbs: entity.carbs,
            fats: entity.fats
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
          detail: error?.message || String(error)
        }
      };
    }
  }
});