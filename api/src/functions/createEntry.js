const crypto = require('crypto');
const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

app.http('createEntry', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('createEntry function processed a request.');

        let body;

        try {
            body = await request.json();
        } catch (error) {
            return {
                status: 400,
                jsonBody: {
                    error: 'Request body must be valid JSON.'
                }
            };
        }

        const {
            userId,
            date,
            mealType,
            foodName,
            calories,
            protein,
            carbs,
            fats,
            notes
        } = body;

        if (!userId || !foodName || !mealType || calories === undefined) {
            return {
                status: 400,
                jsonBody: {
                    error: 'userId, foodName, mealType, and calories are required.'
                }
            };
        }

        const entryDate = date || new Date().toISOString().split('T')[0];
        const entryId = crypto.randomUUID();

        const connectionString = process.env.AzureWebJobsStorage;
        const tableName = process.env.TABLE_NAME || 'foodentries';

        const client = TableClient.fromConnectionString(connectionString, tableName);

        const entity = {
            partitionKey: userId,
            rowKey: entryId,
            userId,
            date: entryDate,
            mealType,
            foodName,
            calories,
            protein: protein ?? null,
            carbs: carbs ?? null,
            fats: fats ?? null,
            notes: notes ?? '',
            createdAt: new Date().toISOString()
        };

        try {
            await client.createEntity(entity);
        } catch (error) {
            context.log.error('Failed to save entity:', error);

            return {
                status: 500,
                jsonBody: {
                    error: 'Failed to save food entry.'
                }
            };
        }

        return {
            status: 201,
            jsonBody: {
                message: 'Food entry saved.',
                entry: {
                    id: entity.rowKey,
                    ...entity
                }
            }
        };
    }
});