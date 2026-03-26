const { app } = require('@azure/functions');
const { requireAuthenticatedUser } = require('../shared/requireAuthenticatedUser');
const { hasRole } = require('../shared/getAuthenticatedUser');

app.http('getAdminData', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'admin/data',
  handler: async (request, context) => {
    context.log('getAdminData called');

    const authResult = requireAuthenticatedUser(request);

    if (!authResult.ok) {
      context.log.warn('getAdminData unauthorized');
      return authResult.response;
    }

    const authUser = authResult.authUser;

    context.log('getAdminData authenticated', {
      userKey: authUser.userKey,
      userDetails: authUser.userDetails,
      roles: authUser.roles
    });

    if (!hasRole(authUser, 'admin')) {
      context.log.warn('getAdminData forbidden', {
        userKey: authUser.userKey,
        userDetails: authUser.userDetails,
        roles: authUser.roles
      });

      return {
        status: 403,
        jsonBody: { error: 'Admin access required.' }
      };
    }

    context.log('getAdminData success', {
      userKey: authUser.userKey,
      userDetails: authUser.userDetails
    });

    return {
      status: 200,
      jsonBody: {
        message: 'Welcome admin',
        adminUser: authUser.userDetails,
        roles: authUser.roles
      }
    };
  }
});