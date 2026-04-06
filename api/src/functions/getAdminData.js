const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { requireAuthenticatedUser } = require('../shared/requireAuthenticatedUser');
const { hasRole } = require('../shared/getAuthenticatedUser');

const USER_REGISTRY_TABLE = process.env.USER_REGISTRY_TABLE_NAME || 'UserRegistry';
const USER_ACCESS_AUDIT_TABLE = process.env.USER_ACCESS_AUDIT_TABLE_NAME || 'UserAccessAudit';
const PROFILES_TABLE_NAME = process.env.NUTRITION_PROFILES_TABLE_NAME || 'NutritionProfiles';

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

    if (!connectionString) {
      return {
        status: 500,
        jsonBody: { error: 'STORAGE_CONNECTION_STRING is missing.' }
      };
    }

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

    const profilesClient = TableClient.fromConnectionString(
      connectionString,
      PROFILES_TABLE_NAME
    );

    const userRegistryClient = TableClient.fromConnectionString(
      connectionString,
      USER_REGISTRY_TABLE
    );

    const userAccessAuditClient = TableClient.fromConnectionString(
      connectionString,
      USER_ACCESS_AUDIT_TABLE
    );

    const [
      entryEntities,
      foodEntities,
      goalEntities,
      profileEntities,
      registryEntities,
      auditEntities
    ] = await Promise.all([
      listAllEntities(entriesClient, context),
      listAllEntities(foodsClient, context),
      listAllEntities(goalsClient, context),
      listAllEntities(profilesClient, context),
      listAllEntities(userRegistryClient, context),
      listAllEntities(userAccessAuditClient, context)
    ]);

    const usersMap = new Map();

    // 1) Seed from registry first if present
    for (const entity of registryEntities) {
      const userKey = entity.userId || entity.partitionKey || entity.rowKey;
      if (!userKey) continue;

      const userDetails = entity.userDetails || entity.email || entity.displayName || userKey;
      const userType = normalizeUserType(
        entity.userType || classifyUserType(userDetails)
      );

      usersMap.set(userKey, {
        userId: userKey,
        userDetails,
        email: entity.email || userDetails,
        userType,
        loginCount: Number(entity.loginCount || 0),
        profileComplete: entity.profileComplete === true || entity.profileComplete === 'true',
        firstSeen: entity.firstSeen || entity.createdAt || entity.timestamp || null,
        lastSeen: entity.lastSeen || entity.lastActive || entity.updatedAt || entity.timestamp || null,
        status: normalizeStatus(entity.status || 'active'),
        entriesCount: 0,
        savedFoodsCount: 0
      });
    }

    // 2) Add users found from entries
    for (const entity of entryEntities) {
      const userKey = entity.partitionKey;
      if (!userKey) continue;

      const existing = ensureUser(usersMap, userKey);
      existing.entriesCount += 1;
      existing.lastSeen = mostRecentDate(existing.lastSeen, entity.createdAt || entity.timestamp);
    }

    // 3) Add users found from custom foods
    for (const entity of foodEntities) {
      const userKey = entity.partitionKey;
      if (!userKey) continue;

      const existing = ensureUser(usersMap, userKey);
      existing.savedFoodsCount += 1;
      existing.lastSeen = mostRecentDate(existing.lastSeen, entity.createdAt || entity.timestamp);
    }

    // 4) Add users found from goals
    for (const entity of goalEntities) {
      const userKey = entity.partitionKey;
      if (!userKey) continue;

      const existing = ensureUser(usersMap, userKey);
      existing.lastSeen = mostRecentDate(existing.lastSeen, entity.updatedAt || entity.timestamp);
    }

    // 5) Mark profile completion from NutritionProfiles
    const profileUsers = new Set();
    for (const entity of profileEntities) {
      const userKey = entity.partitionKey;
      if (!userKey) continue;

      profileUsers.add(userKey);

      const existing = ensureUser(usersMap, userKey);
      existing.profileComplete = true;
      existing.lastSeen = mostRecentDate(existing.lastSeen, entity.updatedAt || entity.timestamp);
    }

    // 6) Merge audit information if present
    for (const entity of auditEntities) {
      const userKey = entity.userId || entity.partitionKey;
      if (!userKey) continue;

      const existing = ensureUser(usersMap, userKey, entity.userDetails || entity.email || userKey);

      const eventType = (entity.eventType || entity.action || '').toLowerCase();
      if (eventType === 'sign-in' || eventType === 'signin' || eventType === 'login') {
        existing.loginCount += 1;
      }

      existing.lastSeen = mostRecentDate(
        existing.lastSeen,
        entity.timestamp || entity.createdAt || entity.updatedAt
      );

      if (!existing.userType || existing.userType === 'unknown') {
        existing.userType = normalizeUserType(
          entity.userType || classifyUserType(entity.userDetails || entity.email || existing.userDetails)
        );
      }
    }

    // 7) Final normalization
    const allUsers = Array.from(usersMap.values()).map((user) => {
      const finalUserType = normalizeUserType(
        user.userType || classifyUserType(user.userDetails || user.email || user.userId)
      );

      const finalStatus = normalizeComputedStatus(user.status, user.lastSeen);

      return {
        userId: user.userId,
        userDetails: user.userDetails || user.email || user.userId,
        email: user.email || user.userDetails || user.userId,
        userType: finalUserType,
        loginCount: Number(user.loginCount || 0),
        profileComplete: user.profileComplete === true || profileUsers.has(user.userId),
        lastSeen: user.lastSeen || null,
        status: finalStatus,
        entriesCount: Number(user.entriesCount || 0),
        savedFoodsCount: Number(user.savedFoodsCount || 0)
      };
    });

    allUsers.sort((a, b) => {
      const aTime = toSortableTime(a.lastSeen);
      const bTime = toSortableTime(b.lastSeen);
      return bTime - aTime;
    });

    const trackedUsers = allUsers.length;
    const profilesCompleted = allUsers.filter((u) => u.profileComplete).length;
    const internalUsers = allUsers.filter((u) => u.userType === 'internal').length;
    const externalUsers = allUsers.filter((u) => u.userType === 'external').length;
    const unknownUsers = allUsers.filter((u) => u.userType === 'unknown').length;
    const inactiveUsers = allUsers.filter((u) => u.status === 'inactive').length;
    const blockedUsers = allUsers.filter((u) => u.status === 'blocked').length;

    const totalSignIns =
      auditEntities.filter((e) => {
        const eventType = (e.eventType || e.action || '').toLowerCase();
        return eventType === 'sign-in' || eventType === 'signin' || eventType === 'login';
      }).length ||
      allUsers.reduce((sum, user) => sum + Number(user.loginCount || 0), 0);

    const allRecentActivity = buildRecentActivity(auditEntities, allUsers);

    const users = allUsers.slice(0, 25);
    const recentActivity = allRecentActivity.slice(0, 25);

    return {
      status: 200,
      jsonBody: {
        adminUser: authUser.userDetails,
        roles: authUser.roles,
        stats: {
          trackedUsers,
          profilesCompleted,
          internalUsers,
          externalUsers,
          unknownUsers,
          totalSignIns,
          inactiveUsers,
          blockedUsers
        },
        users,
        recentActivity
      }
    };
  }
});

async function listAllEntities(tableClient, context) {
  const entities = [];

  try {
    for await (const entity of tableClient.listEntities()) {
      entities.push(entity);
    }
  } catch (error) {
    const statusCode = error.statusCode || error.code;

    if (statusCode === 404 || statusCode === 'TableNotFound') {
      context.log(`Table not found for ${tableClient.tableName}. Returning empty list.`);
      return [];
    }

    throw error;
  }

  return entities;
}

function ensureUser(usersMap, userKey, userDetailsOverride = null) {
  if (!usersMap.has(userKey)) {
    const userDetails = userDetailsOverride || userKey;

    usersMap.set(userKey, {
      userId: userKey,
      userDetails,
      email: userDetails,
      userType: normalizeUserType(classifyUserType(userDetails)),
      loginCount: 0,
      profileComplete: false,
      firstSeen: null,
      lastSeen: null,
      status: 'active',
      entriesCount: 0,
      savedFoodsCount: 0
    });
  }

  return usersMap.get(userKey);
}

function classifyUserType(value) {
  if (!value) return 'unknown';

  const normalized = String(value).toLowerCase().trim();

  // Azure B2B guest pattern
  if (normalized.includes('#ext#')) {
    return 'external';
  }

  // Common personal email domains
  const publicDomains = [
    'gmail.com',
    'outlook.com',
    'hotmail.com',
    'live.com',
    'msn.com',
    'yahoo.com',
    'icloud.com'
  ];

  if (publicDomains.some((domain) => normalized.endsWith(`@${domain}`) || normalized.includes(domain))) {
    return 'external';
  }

  // Common Entra / tenant style domains
  if (normalized.endsWith('.onmicrosoft.com')) {
    return 'internal';
  }

  const configuredInternalDomains = (process.env.INTERNAL_USER_DOMAINS || '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  if (configuredInternalDomains.some((domain) => normalized.endsWith(`@${domain}`))) {
    return 'internal';
  }

  return 'unknown';
}

function normalizeUserType(value) {
  const normalized = String(value || 'unknown').toLowerCase();

  if (normalized === 'internal') return 'internal';
  if (normalized === 'external') return 'external';
  return 'unknown';
}

function normalizeStatus(value) {
  const normalized = String(value || 'active').toLowerCase();

  if (normalized === 'blocked') return 'blocked';
  if (normalized === 'inactive') return 'inactive';
  return 'active';
}

function normalizeComputedStatus(currentStatus, lastSeen) {
  const normalized = normalizeStatus(currentStatus);

  if (normalized === 'blocked') {
    return 'blocked';
  }

  if (!lastSeen) {
    return 'inactive';
  }

  const lastSeenDate = new Date(lastSeen);
  if (Number.isNaN(lastSeenDate.getTime())) {
    return normalized;
  }

  const now = new Date();
  const daysSinceSeen = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceSeen > 14) {
    return 'inactive';
  }

  return 'active';
}

function buildRecentActivity(auditEntities, users) {
  if (auditEntities.length > 0) {
    return auditEntities
      .map((entity) => ({
        title: formatAuditTitle(entity),
        description: entity.description || entity.userDetails || entity.email || entity.userId || entity.partitionKey || 'System event',
        timestamp: entity.timestamp || entity.createdAt || entity.updatedAt || null
      }))
      .sort((a, b) => toSortableTime(b.timestamp) - toSortableTime(a.timestamp));
  }

  return users
    .filter((user) => user.lastSeen)
    .map((user) => ({
      title: 'User activity seen',
      description: user.userDetails || user.email || user.userId,
      timestamp: user.lastSeen
    }))
    .sort((a, b) => toSortableTime(b.timestamp) - toSortableTime(a.timestamp));
}

function formatAuditTitle(entity) {
  const eventType = String(entity.eventType || entity.action || '').toLowerCase();

  if (eventType === 'sign-in' || eventType === 'signin' || eventType === 'login') {
    return 'User signed in';
  }

  if (eventType === 'first-seen') {
    return 'New user first seen';
  }

  if (eventType === 'access') {
    return 'User accessed app';
  }

  return entity.title || 'Activity';
}

function mostRecentDate(currentValue, nextValue) {
  if (!currentValue) return nextValue || null;
  if (!nextValue) return currentValue || null;

  const currentTime = toSortableTime(currentValue);
  const nextTime = toSortableTime(nextValue);

  return nextTime > currentTime ? nextValue : currentValue;
}

function toSortableTime(value) {
  if (!value) return 0;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;

  return date.getTime();
}