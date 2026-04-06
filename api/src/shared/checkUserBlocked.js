const { TableClient } = require('@azure/data-tables');

const USER_REGISTRY_TABLE = process.env.USER_REGISTRY_TABLE_NAME || 'UserRegistry';

module.exports = async function checkUserBlocked(authUser, context) {
  try {
    const connectionString = process.env.STORAGE_CONNECTION_STRING;

    if (!connectionString || !authUser) {
      return { ok: true };
    }

    const userId = authUser.userId || authUser.userKey;
    if (!userId) {
      return { ok: true };
    }

    const registryClient = TableClient.fromConnectionString(connectionString, USER_REGISTRY_TABLE);

    let userRecord = null;

    try {
      userRecord = await registryClient.getEntity(userId, userId);
    } catch (err) {
      if (err.statusCode === 404) {
        return { ok: true };
      }
      throw err;
    }

    const status = String(userRecord.status || 'active').toLowerCase();

    if (status === 'blocked') {
      context.log('Blocked user denied access', {
        userId,
        userDetails: authUser.userDetails || authUser.email || authUser.userKey
      });

      return {
        ok: false,
        response: {
          status: 403,
          jsonBody: {
            error: 'Your account has been blocked from using this app.'
          }
        }
      };
    }

    return { ok: true };
  } catch (err) {
    context.log('checkUserBlocked error', {
      message: err?.message || String(err),
      stack: err?.stack || null
    });

    return {
      ok: false,
      response: {
        status: 500,
        jsonBody: {
          error: 'Failed to validate user access.'
        }
      }
    };
  }
};