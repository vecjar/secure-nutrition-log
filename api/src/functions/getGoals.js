const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

app.http('getGoals', {
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
        const tableName = process.env.GOALS_TABLE_NAME || 'usergoals';
        const client = TableClient.fromConnectionString(connectionString, tableName);

        try {
            const entity = await client.getEntity(userId, 'goals');

            return {
                status: 200,
                jsonBody: {
                    goals: {
                        calories: entity.calories,
                        protein: entity.protein,
                        carbs: entity.carbs,
                        fats: entity.fats
                    }
                }
            };
        } catch (error) {
            if (error.statusCode === 404) {
                return {
                    status: 200,
                    jsonBody: { goals: null }
                };
            }

            context.log.error('Failed to get goals:', error);
            return {
                status: 500,
                jsonBody: { error: 'Failed to load goals.' }
            };
        }
    }
});