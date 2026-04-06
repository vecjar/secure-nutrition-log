const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { requireAuthenticatedUser } = require('../shared/requireAuthenticatedUser');
const { hasRole } = require('../shared/getAuthenticatedUser');

const USER_REGISTRY_TABLE = process.env.USER_REGISTRY_TABLE_NAME || 'UserRegistry';

app.http('setUserStatus', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'rolecheck/user-status',
  handler: async (request, context) => {
    context.log('setUserStatus called');

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

    let body;
    try {
      body = await request.json();
    } catch {
      return {
        status: 400,
        jsonBody: { error: 'Invalid JSON body.' }
      };
    }

    const userId = String(body.userId || '').trim();
    const status = String(body.status || '').trim().toLowerCase();
    const userDetails = String(body.userDetails || userId).trim();

    if (!userId) {
      return {
        status: 400,
        jsonBody: { error: 'userId is required.' }
      };
    }

    if (!['active', 'blocked'].includes(status)) {
      return {
        status: 400,
        jsonBody: { error: 'status must be active or blocked.' }
      };
    }

    const connectionString = process.env.STORAGE_CONNECTION_STRING;

    if (!connectionString) {
      return {
        status: 500,
        jsonBody: { error: 'STORAGE_CONNECTION_STRING is missing.' }
      };
    }

    const registryClient = TableClient.fromConnectionString(connectionString, USER_REGISTRY_TABLE);
    const now = new Date().toISOString();

    try {
      await ensureTableExists(registryClient);

      let existing = null;
      try {
        existing = await registryClient.getEntity(userId, userId);
      } catch (err) {
        if (err.statusCode !== 404) {
          throw err;
        }
      }

      if (!existing) {
        await registryClient.createEntity({
          partitionKey: userId,
          rowKey: userId,
          userId,
          userDetails,
          userType: 'unknown',
          loginCount: 0,
          firstSeen: now,
          lastSeen: now,
          status
        });
      } else {
        await registryClient.updateEntity({
          partitionKey: userId,
          rowKey: userId,
          userId,
          userDetails: existing.userDetails || userDetails,
          status,
          lastSeen: existing.lastSeen || now
        }, 'Merge');
      }

      return {
        status: 200,
        jsonBody: {
          success: true,
          userId,
          status
        }
      };
    } catch (err) {
      context.log('setUserStatus failed', {
        message: err?.message || String(err),
        stack: err?.stack || null
      });

      return {
        status: 500,
        jsonBody: { error: 'Failed to update user status.' }
      };
    }
  }
});

async function ensureTableExists(tableClient) {
  try {
    await tableClient.createTable();
  } catch (err) {
    if (err.statusCode === 409 || err.code === 'TableAlreadyExists') {
      return;
    }

    throw err;
  }
}