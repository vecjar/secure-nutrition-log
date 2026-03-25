const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { getAuthenticatedUser } = require('../shared/getAuthenticatedUser');

app.http('deleteCustomFood', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const authUser = getAuthenticatedUser(request);

    if (!authUser) {
      return {
        status: 401,
        jsonBody: { error: 'Unauthorized.' }
      };
    }

    const foodId = request.query.get('foodId');

    if (!foodId) {
      return {
        status: 400,
        jsonBody: { error: 'foodId is required.' }
      };
    }

    const connectionString = process.env.AzureWebJobsStorage;
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