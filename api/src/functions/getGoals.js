const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { requireAuthenticatedUser } = require('../shared/requireAuthenticatedUser');
const checkUserBlocked = require('../shared/checkUserBlocked');

app.http('getGoals', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'getGoals',
  handler: async (request, context) => {
    context.log('getGoals called');

    const authResult = requireAuthenticatedUser(request);

    if (!authResult.ok) {
      context.log.warn('getGoals unauthorized');
      return authResult.response;
    }

    const authUser = authResult.authUser;

    const blockedCheck = await checkUserBlocked(authUser, context);
    if (!blockedCheck.ok) {
      return blockedCheck.response;
    }
    const connectionString = process.env.STORAGE_CONNECTION_STRING;
    const tableName = process.env.GOALS_TABLE_NAME || 'usergoals';

    context.log('getGoals authenticated', {
      userKey: authUser.userKey,
      tableName
    });

    if (!connectionString) {
      context.log.error('getGoals missing storage connection string');

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
      context.log('getGoals storage client created', {
        userKey: authUser.userKey,
        tableName
      });
    } catch (error) {
      context.log.error('getGoals failed to create TableClient', {
        userKey: authUser.userKey,
        tableName,
        error: error?.message || String(error)
      });

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

      context.log('getGoals success', {
        userKey: authUser.userKey,
        tableName
      });

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
        context.log('getGoals no goals found', {
          userKey: authUser.userKey,
          tableName
        });

        return {
          status: 200,
          jsonBody: { goals: null }
        };
      }

      context.log.error('getGoals failed', {
        userKey: authUser.userKey,
        tableName,
        error: error?.message || String(error)
      });

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