const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

app.http('deleteEntry', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('deleteEntry function processed a request.');

        const partitionKey = request.query.get('partitionKey');
        const entryId = request.query.get('entryId');

        if (!partitionKey || !entryId) {
            return {
                status: 400,
                jsonBody: {
                    error: 'partitionKey and entryId are required.'
                }
            };
        }

        const connectionString = process.env.AzureWebJobsStorage;
        const tableName = process.env.TABLE_NAME || 'foodentries';
        const client = TableClient.fromConnectionString(connectionString, tableName);

        try {
            await client.deleteEntity(partitionKey, entryId);

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