const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { requireAuthenticatedUser } = require('../shared/requireAuthenticatedUser');
const checkUserBlocked = require('../shared/checkUserBlocked');

app.http('saveGoals', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'saveGoals',
  handler: async (request, context) => {
    context.log('saveGoals called');

    const authResult = requireAuthenticatedUser(request);

    if (!authResult.ok) {
      context.log.warn('saveGoals unauthorized');
      return authResult.response;
    }

    const authUser = authResult.authUser;

    const blockedCheck = await checkUserBlocked(authUser, context);
    if (!blockedCheck.ok) {
      return blockedCheck.response;
    }

    let body;

    try {
      body = await request.json();
    } catch {
      context.log.warn('saveGoals invalid JSON body', {
        userKey: authUser.userKey
      });

      return {
        status: 400,
        jsonBody: { error: 'Request body must be valid JSON.' }
      };
    }

    const { calories, protein, carbs, fats } = body;
    const connectionString = process.env.STORAGE_CONNECTION_STRING;
    const tableName = process.env.GOALS_TABLE_NAME || 'usergoals';

    context.log('saveGoals authenticated', {
      userKey: authUser.userKey,
      tableName
    });

    if (!connectionString) {
      context.log.error('saveGoals missing storage connection string', {
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

      context.log('saveGoals storage client created', {
        userKey: authUser.userKey,
        tableName
      });
    } catch (error) {
      context.log.error('saveGoals failed to create storage client', {
        userKey: authUser.userKey,
        tableName,
        error: error?.message || String(error)
      });

      return {
        status: 500,
        jsonBody: { error: 'Failed to create storage client.' }
      };
    }

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

      context.log('saveGoals success', {
        userKey: authUser.userKey,
        tableName
      });

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
      context.log.error('saveGoals failed', {
        userKey: authUser.userKey,
        tableName,
        error: error?.message || String(error)
      });

      return {
        status: 500,
        jsonBody: { error: 'Failed to save goals.' }
      };
    }
  }
});