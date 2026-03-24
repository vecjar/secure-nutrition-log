const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

app.http('deleteCustomFood', {
    methods: ['DELETE'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('deleteCustomFood function processed a request.');

        const partitionKey = request.query.get('partitionKey');
        const foodId = request.query.get('foodId');

        if (!partitionKey || !foodId) {
            return {
                status: 400,
                jsonBody: {
                    error: 'partitionKey and foodId are required.'
                }
            };
        }

        const connectionString = process.env.AzureWebJobsStorage;
        const tableName = process.env.CUSTOM_FOODS_TABLE_NAME || 'customfoods';
        const client = TableClient.fromConnectionString(connectionString, tableName);

        try {
            await client.deleteEntity(partitionKey, foodId);

            return {
                status: 200,
                jsonBody: {
                    message: 'Custom food deleted successfully.'
                }
            };
        } catch (error) {
            context.log.error('Failed to delete custom food:', error);

            return {
                status: 500,
                jsonBody: {
                    error: 'Failed to delete custom food.'
                }
            };
        }
    }
});