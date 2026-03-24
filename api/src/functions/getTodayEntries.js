const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

app.http('getTodayEntries', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('getTodayEntries function processed a request.');

        const connectionString = process.env.AzureWebJobsStorage;
        const tableName = process.env.TABLE_NAME || 'foodentries';

        const client = TableClient.fromConnectionString(connectionString, tableName);

        const today = new Date().toISOString().split('T')[0];
        const entries = [];

        try {
            const entities = client.listEntities({
                queryOptions: {
                    filter: `PartitionKey eq '${today}'`
                }
            });

            for await (const entity of entities) {
                entries.push({
                    id: entity.rowKey,
                    date: entity.date,
                    mealType: entity.mealType,
                    foodName: entity.foodName,
                    calories: entity.calories,
                    protein: entity.protein ?? null,
                    carbs: entity.carbs ?? null,
                    fats: entity.fats ?? null,
                    notes: entity.notes ?? '',
                    createdAt: entity.createdAt
                });
            }
        } catch (error) {
            context.log.error('Failed to retrieve entries:', error);

            return {
                status: 500,
                jsonBody: {
                    error: 'Failed to retrieve food entries.'
                }
            };
        }

        return {
            status: 200,
            jsonBody: {
                date: today,
                count: entries.length,
                entries
            }
        };
    }
});