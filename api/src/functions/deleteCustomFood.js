const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { requireAuthenticatedUser } = require('../shared/requireAuthenticatedUser');

app.http('deleteCustomFood', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const authResult = requireAuthenticatedUser(request);

if (!authResult.ok) {
  return authResult.response;
}

const authUser = authResult.authUser;

    const foodId = request.query.get('foodId');

    if (!foodId) {
      return {
        status: 400,
        jsonBody: { error: 'foodId is required.' }
      };
    }

    const connectionString = process.env.STORAGE_CONNECTION_STRING;
    const tableName = process.env.CUSTOM_FOODS_TABLE_NAME || 'customfoods';
    const client = TableClient.fromConnectionString(connectionString, tableName);

    try {
      await client.deleteEntity(authUser.userKey, foodId);

      return {
        status: 200,
        jsonBody: { message: 'Custom food deleted successfully.' }
      };
    } catch (error) {
      context.log.error('Failed to delete custom food:', error);

      return {
        status: 500,
        jsonBody: { error: 'Failed to delete custom food.' }
      };
    }
  }
});