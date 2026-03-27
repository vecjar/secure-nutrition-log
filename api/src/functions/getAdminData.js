const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { requireAuthenticatedUser } = require('../shared/requireAuthenticatedUser');
const { hasRole } = require('../shared/getAuthenticatedUser');

app.http('getAdminData', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'rolecheck/admin-data',
  handler: async (request, context) => {
    context.log('getAdminData called');

    const authResult = requireAuthenticatedUser(request);

    if (!authResult.ok) {
      return authResult.response;
    }

    const authUser = authResult.authUser;

    if (!hasRole(authUser, 'admin')) {
      return {
        status: 403,
        jsonBody: { error: 'Admin access required.' }
      };
    }

    const connectionString = process.env.STORAGE_CONNECTION_STRING;

    const entriesClient = TableClient.fromConnectionString(
      connectionString,
      process.env.TABLE_NAME || 'foodentries'
    );

    const foodsClient = TableClient.fromConnectionString(
      connectionString,
      process.env.CUSTOM_FOODS_TABLE_NAME || 'customfoods'
    );

    const goalsClient = TableClient.fromConnectionString(
      connectionString,
      process.env.GOALS_TABLE_NAME || 'usergoals'
    );

    let totalEntries = 0;
    let totalCustomFoods = 0;
    let totalGoals = 0;
    const uniqueUsers = new Set();

    const mealTypeCounts = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snack: 0
    };

    // 🔹 Entries
    for await (const entity of entriesClient.listEntities()) {
      totalEntries++;
      uniqueUsers.add(entity.partitionKey);

      if (entity.mealType && mealTypeCounts[entity.mealType] !== undefined) {
        mealTypeCounts[entity.mealType]++;
      }
    }

    // 🔹 Custom foods
    for await (const entity of foodsClient.listEntities()) {
      totalCustomFoods++;
    }

    // 🔹 Goals
    for await (const entity of goalsClient.listEntities()) {
      totalGoals++;
    }

    return {
      status: 200,
      jsonBody: {
        adminUser: authUser.userDetails,
        roles: authUser.roles,
        stats: {
          totalEntries,
          totalCustomFoods,
          totalGoals,
          totalUsers: uniqueUsers.size,
          mealBreakdown: mealTypeCounts
        }
      }
    };
  }
});