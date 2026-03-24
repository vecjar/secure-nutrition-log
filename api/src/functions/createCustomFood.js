const crypto = require('crypto');
const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

app.http('createCustomFood', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        let body;

        try {
            body = await request.json();
        } catch {
            return {
                status: 400,
                jsonBody: { error: 'Request body must be valid JSON.' }
            };
        }

        const { userId, foodName, calories, protein, carbs, fats, notes } = body;

        if (!userId || !foodName || calories === undefined) {
            return {
                status: 400,
                jsonBody: { error: 'userId, foodName, and calories are required.' }
            };
        }

        const connectionString = process.env.AzureWebJobsStorage;
        const tableName = process.env.CUSTOM_FOODS_TABLE_NAME || 'customfoods';
        const client = TableClient.fromConnectionString(connectionString, tableName);

        const entity = {
            partitionKey: userId,
            rowKey: crypto.randomUUID(),
            userId,
            foodName,
            calories,
            protein: protein ?? 0,
            carbs: carbs ?? 0,
            fats: fats ?? 0,
            notes: notes ?? '',
            createdAt: new Date().toISOString()
        };

        try {
            await client.createEntity(entity);

            return {
                status: 201,
                jsonBody: {
                    message: 'Custom food saved.',
                    food: {
                        id: entity.rowKey,
                        ...entity
                    }
                }
            };
        } catch (error) {
            context.log.error('Failed to save custom food:', error);
            return {
                status: 500,
                jsonBody: { error: 'Failed to save custom food.' }
            };
        }
    }
});