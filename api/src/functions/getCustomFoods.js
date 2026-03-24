const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

app.http('getCustomFoods', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const userId = request.query.get('userId');

        if (!userId) {
            return {
                status: 400,
                jsonBody: { error: 'userId is required.' }
            };
        }

        const connectionString = process.env.AzureWebJobsStorage;
        const tableName = process.env.CUSTOM_FOODS_TABLE_NAME || 'customfoods';
        const client = TableClient.fromConnectionString(connectionString, tableName);

        const foods = [];

        try {
            const entities = client.listEntities({
                queryOptions: {
                    filter: `PartitionKey eq '${userId}'`
                }
            });

            for await (const entity of entities) {
                foods.push({
                    id: entity.rowKey,
                    partitionKey: entity.partitionKey,
                    foodName: entity.foodName,
                    calories: entity.calories,
                    protein: entity.protein ?? 0,
                    carbs: entity.carbs ?? 0,
                    fats: entity.fats ?? 0,
                    notes: entity.notes ?? '',
                    createdAt: entity.createdAt
                });
            }

            return {
                status: 200,
                jsonBody: { foods }
            };
        } catch (error) {
            context.log.error('Failed to load custom foods:', error);
            return {
                status: 500,
                jsonBody: { error: 'Failed to load custom foods.' }
            };
        }
    }
});