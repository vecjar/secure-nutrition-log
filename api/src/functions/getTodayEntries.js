const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { requireAuthenticatedUser } = require('../shared/requireAuthenticatedUser');
const trackUserAccess = require('../shared/trackUserAccess');
const checkUserBlocked = require('../shared/checkUserBlocked');

app.http('getTodayEntries', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'getTodayEntries',
  handler: async (request, context) => {
    try {
      context.log('getTodayEntries called');

      const authResult = requireAuthenticatedUser(request);

      if (!authResult || !authResult.ok || !authResult.authUser) {
        context.log('getTodayEntries unauthorized');
        return {
          status: 401,
          jsonBody: { error: 'Unauthorized.' }
        };
      }

      const authUser = authResult.authUser;

      context.log('getTodayEntries auth user resolved', {
        userKey: authUser.userKey || null,
        userId: authUser.userId || null,
        userDetails: authUser.userDetails || null
      });

      context.log('getTodayEntries checking blocked status');
      const blockedCheck = await checkUserBlocked(authUser, context);

      if (!blockedCheck.ok) {
        context.log('getTodayEntries blocked check failed or denied');
        return blockedCheck.response;
      }

      context.log('getTodayEntries tracking user access');
      await trackUserAccess(authUser, context, 'access');

      const requestedDate = request.query.get('date');
      const targetDate = requestedDate || new Date().toISOString().split('T')[0];

      const connectionString = process.env.STORAGE_CONNECTION_STRING;
      const tableName = process.env.TABLE_NAME || 'foodentries';

      context.log('getTodayEntries authenticated', {
        userKey: authUser.userKey,
        tableName,
        targetDate
      });

      if (!connectionString) {
        context.log.error('getTodayEntries missing storage connection string', {
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

        context.log('getTodayEntries storage client created', {
          userKey: authUser.userKey,
          tableName
        });
      } catch (error) {
        context.log.error('getTodayEntries failed to create storage client', {
          userKey: authUser.userKey,
          tableName,
          error: error?.message || String(error)
        });

        return {
          status: 500,
          jsonBody: { error: 'Failed to create storage client.' }
        };
      }

      const entries = [];

      try {
        const entities = client.listEntities({
          queryOptions: {
            filter: `PartitionKey eq '${authUser.userKey}'`
          }
        });

        for await (const entity of entities) {
          if (entity.date !== targetDate) {
            continue;
          }

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

        context.log('getTodayEntries success', {
          userKey: authUser.userKey,
          tableName,
          targetDate,
          count: entries.length
        });

        return {
          status: 200,
          jsonBody: {
            date: targetDate,
            count: entries.length,
            entries
          }
        };
      } catch (error) {
        context.log.error('getTodayEntries failed while reading table data', {
          userKey: authUser.userKey,
          tableName,
          targetDate,
          error: error?.message || String(error),
          stack: error?.stack || null
        });

        return {
          status: 500,
          jsonBody: { error: 'Failed to retrieve food entries.' }
        };
      }
    } catch (error) {
      context.log.error('getTodayEntries unexpected top-level failure', {
        error: error?.message || String(error),
        stack: error?.stack || null
      });

      return {
        status: 500,
        jsonBody: { error: 'Unexpected server error in getTodayEntries.' }
      };
    }
  }
});