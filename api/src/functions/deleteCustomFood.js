const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { requireAuthenticatedUser } = require('../shared/requireAuthenticatedUser');

app.http('deleteCustomFood', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'deleteCustomFood',
  handler: async (request, context) => {
    context.log('deleteCustomFood called');

    const authResult = requireAuthenticatedUser(request);

    if (!authResult.ok) {
      context.log.warn('deleteCustomFood unauthorized');
      return authResult.response;
    }

    const authUser = authResult.authUser;

    const foodId = request.query.get('foodId');

    if (!foodId) {
      context.log.warn('deleteCustomFood missing foodId', {
        userKey: authUser.userKey
      });

      return {
        status: 400,
        jsonBody: { error: 'foodId is required.' }
      };
    }

    const connectionString = process.env.STORAGE_CONNECTION_STRING;
    const tableName = process.env.CUSTOM_FOODS_TABLE_NAME || 'customfoods';

    context.log('deleteCustomFood authenticated', {
      userKey: authUser.userKey,
      tableName,
      foodId
    });

    if (!connectionString) {
      context.log.error('deleteCustomFood missing storage connection string', {
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

      context.log('deleteCustomFood storage client created', {
        userKey: authUser.userKey,
        tableName
      });
    } catch (error) {
      context.log.error('deleteCustomFood failed to create storage client', {
        userKey: authUser.userKey,
        tableName,
        error: error?.message || String(error)
      });

      return {
        status: 500,
        jsonBody: { error: 'Failed to create storage client.' }
      };
    }

    try {
      await client.deleteEntity(authUser.userKey, foodId);

      context.log('deleteCustomFood success', {
        userKey: authUser.userKey,
        tableName,
        foodId
      });

      return {
        status: 200,
        jsonBody: { message: 'Custom food deleted successfully.' }
      };
    } catch (error) {
      context.log.error('deleteCustomFood failed', {
        userKey: authUser.userKey,
        tableName,
        foodId,
        error: error?.message || String(error)
      });

      return {
        status: 500,
        jsonBody: { error: 'Failed to delete custom food.' }
      };
    }
  }
});