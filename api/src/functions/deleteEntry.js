const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

app.http('deleteEntry', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('deleteEntry function processed a request.');

        const userId = request.query.get('userId');
        const entryId = request.query.get('entryId');

        if (!userId || !entryId) {
            return {
                status: 400,
                jsonBody: {
                    error: 'userId and entryId are required.'
                }
            };
        }

        const connectionString = process.env.AzureWebJobsStorage;
        const tableName = process.env.TABLE_NAME || 'foodentries';
        const client = TableClient.fromConnectionString(connectionString, tableName);

        try {
            await client.deleteEntity(userId, entryId);

            return {
                status: 200,
                jsonBody: {
                    message: 'Entry deleted successfully.'
                }
            };
        } catch (error) {
            context.log.error('Failed to delete entry:', error);

            return {
                status: 500,
                jsonBody: {
                    error: 'Failed to delete entry.'
                }
            };
        }
    }
});