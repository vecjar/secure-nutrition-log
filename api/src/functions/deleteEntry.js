const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { requireAuthenticatedUser } = require('../shared/requireAuthenticatedUser');

app.http('deleteEntry', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'deleteEntry',
  handler: async (request, context) => {
    context.log('deleteEntry called');

    const authResult = requireAuthenticatedUser(request);

    if (!authResult.ok) {
      context.log.warn('deleteEntry unauthorized');
      return authResult.response;
    }

    const authUser = authResult.authUser;

    const entryId = request.query.get('entryId');

    if (!entryId) {
      context.log.warn('deleteEntry missing entryId', {
        userKey: authUser.userKey
      });

      return {
        status: 400,
        jsonBody: { error: 'entryId is required.' }
      };
    }

    const connectionString = process.env.STORAGE_CONNECTION_STRING;
    const tableName = process.env.TABLE_NAME || 'foodentries';

    context.log('deleteEntry authenticated', {
      userKey: authUser.userKey,
      tableName,
      entryId
    });

    if (!connectionString) {
      context.log.error('deleteEntry missing storage connection string', {
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

      context.log('deleteEntry storage client created', {
        userKey: authUser.userKey,
        tableName
      });
    } catch (error) {
      context.log.error('deleteEntry failed to create storage client', {
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
      await client.deleteEntity(authUser.userKey, entryId);

      context.log('deleteEntry success', {
        userKey: authUser.userKey,
        tableName,
        entryId
      });

      return {
        status: 200,
        jsonBody: { message: 'Entry deleted successfully.' }
      };
    } catch (error) {
      context.log.error('deleteEntry failed', {
        userKey: authUser.userKey,
        tableName,
        entryId,
        error: error?.message || String(error)
      });

      return {
        status: 500,
        jsonBody: { error: 'Failed to delete entry.' }
      };
    }
  }
});