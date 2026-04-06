const { TableClient } = require('@azure/data-tables');

const USER_REGISTRY_TABLE = process.env.USER_REGISTRY_TABLE_NAME || 'UserRegistry';
const USER_ACCESS_AUDIT_TABLE = process.env.USER_ACCESS_AUDIT_TABLE_NAME || 'UserAccessAudit';

module.exports = async function trackUserAccess(authUser, context, action = 'access') {
  try {
    const connectionString = process.env.STORAGE_CONNECTION_STRING;

    if (!connectionString || !authUser) return;

    const userId = authUser.userId;
    const userDetails = authUser.userDetails;

    const registryClient = TableClient.fromConnectionString(connectionString, USER_REGISTRY_TABLE);
    const auditClient = TableClient.fromConnectionString(connectionString, USER_ACCESS_AUDIT_TABLE);

    const now = new Date().toISOString();

    // 🔹 Try get existing user
    let existingUser = null;

    try {
      existingUser = await registryClient.getEntity(userId, userId);
    } catch (err) {
      if (err.statusCode !== 404) throw err;
    }

    // 🔹 Determine user type
    const userType = classifyUserType(userDetails);

    if (!existingUser) {
      // 🟢 New user
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
        eventType: 'first-seen',
        timestamp: now
      });

    } else {
      // 🔵 Existing user
      await registryClient.updateEntity({
        partitionKey: userId,
        rowKey: userId,
        userId,
        userDetails,
        userType,
        loginCount: Number(existingUser.loginCount || 0) + 1,
        lastSeen: now,
        status: 'active'
      }, "Merge");

      await auditClient.createEntity({
        partitionKey: userId,
        rowKey: cryptoRandom(),
        userId,
        userDetails,
        eventType: action,
        timestamp: now
      });
    }

  } catch (err) {
    context.log('trackUserAccess error', err);
  }
};

function cryptoRandom() {
  return Math.random().toString(36).substring(2) + Date.now();
}

function classifyUserType(value) {
  if (!value) return 'unknown';

  const v = value.toLowerCase();

  if (v.includes('#ext#')) return 'external';

  if (
    v.includes('gmail.com') ||
    v.includes('outlook.com') ||
    v.includes('hotmail.com')
  ) return 'external';

  if (v.endsWith('.onmicrosoft.com')) return 'internal';

  return 'unknown';
}