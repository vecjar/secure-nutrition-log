const { TableClient } = require('@azure/data-tables');

const USER_REGISTRY_TABLE = process.env.USER_REGISTRY_TABLE_NAME || 'UserRegistry';
const USER_ACCESS_AUDIT_TABLE = process.env.USER_ACCESS_AUDIT_TABLE_NAME || 'UserAccessAudit';

module.exports = async function trackUserAccess(authUser, context, action = 'access') {
  try {
    const connectionString = process.env.STORAGE_CONNECTION_STRING;

    if (!connectionString || !authUser) {
      context.log('trackUserAccess skipped: missing connection string or authUser');
      return;
    }

    const userId = authUser.userId || authUser.userKey;
    const userDetails = authUser.userDetails || authUser.email || authUser.userKey || 'Unknown user';

    context.log('trackUserAccess starting', {
      userId,
      userDetails,
      action
    });

    if (!userId) {
      context.log('trackUserAccess skipped: no userId/userKey found on authUser');
      return;
    }

    const registryClient = TableClient.fromConnectionString(connectionString, USER_REGISTRY_TABLE);
    const auditClient = TableClient.fromConnectionString(connectionString, USER_ACCESS_AUDIT_TABLE);

    await ensureTableExists(registryClient, context);
    await ensureTableExists(auditClient, context);

    const now = new Date().toISOString();

    let existingUser = null;

    try {
      existingUser = await registryClient.getEntity(userId, userId);
    } catch (err) {
      if (err.statusCode !== 404) {
        throw err;
      }
    }

    const userType = classifyUserType(userDetails);

    if (!existingUser) {
      await registryClient.createEntity({
        partitionKey: userId,
        rowKey: userId,
        userId,
        userDetails,
        userType,
        loginCount: 1,
        firstSeen: now,
        lastSeen: now,
        status: 'active'
      });

      await auditClient.createEntity({
        partitionKey: userId,
        rowKey: cryptoRandom(),
        userId,
        userDetails,
        userType,
        eventType: 'first-seen',
        timestamp: now
      });

      await auditClient.createEntity({
        partitionKey: userId,
        rowKey: cryptoRandom(),
        userId,
        userDetails,
        userType,
        eventType: 'sign-in',
        timestamp: now
      });

      context.log('trackUserAccess wrote first-seen + sign-in audit events', {
        userId,
        userDetails
      });

      return;
    }

    await registryClient.updateEntity({
      partitionKey: userId,
      rowKey: userId,
      userId,
      userDetails,
      userType,
      loginCount: Number(existingUser.loginCount || 0) + 1,
      lastSeen: now,
      status: 'active'
    }, 'Merge');

    await auditClient.createEntity({
      partitionKey: userId,
      rowKey: cryptoRandom(),
      userId,
      userDetails,
      userType,
      eventType: action,
      timestamp: now
    });

    context.log('trackUserAccess wrote access audit event', {
      userId,
      userDetails,
      action
    });
  } catch (err) {
    context.log('trackUserAccess error', {
      message: err?.message || String(err),
      stack: err?.stack || null
    });
  }
};

function cryptoRandom() {
  return Math.random().toString(36).substring(2) + Date.now();
}

function classifyUserType(value) {
  if (!value) return 'unknown';

  const v = String(value).toLowerCase().trim();

  if (v.includes('#ext#')) return 'external';

  if (
    v.includes('gmail.com') ||
    v.includes('outlook.com') ||
    v.includes('hotmail.com') ||
    v.includes('live.com') ||
    v.includes('yahoo.com') ||
    v.includes('icloud.com')
  ) {
    return 'external';
  }

  if (v.endsWith('.onmicrosoft.com')) return 'internal';

  return 'unknown';
}

async function ensureTableExists(tableClient, context) {
  try {
    await tableClient.createTable();
    context.log(`Created table ${tableClient.tableName}`);
  } catch (err) {
    if (err.statusCode === 409 || err.code === 'TableAlreadyExists') {
      return;
    }

    throw err;
  }
}