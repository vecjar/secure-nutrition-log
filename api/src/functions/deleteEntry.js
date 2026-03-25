const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { requireAuthenticatedUser } = require('../shared/requireAuthenticatedUser');

app.http('deleteEntry', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const authResult = requireAuthenticatedUser(request);

if (!authResult.ok) {
  return authResult.response;
}

const authUser = authResult.authUser;

    const entryId = request.query.get('entryId');

    if (!entryId) {
      return {
        status: 400,
        jsonBody: { error: 'entryId is required.' }
      };
    }

    const connectionString = process.env.STORAGE_CONNECTION_STRING;
    const tableName = process.env.TABLE_NAME || 'foodentries';
    const client = TableClient.fromConnectionString(connectionString, tableName);

    try {
      await client.deleteEntity(authUser.userKey, entryId);

      return {
        status: 200,
        jsonBody: { message: 'Entry deleted successfully.' }
      };
    } catch (error) {
      context.log.error('Failed to delete entry:', error);

      return {
        status: 500,
        jsonBody: { error: 'Failed to delete entry.' }
      };
    }
  }
});