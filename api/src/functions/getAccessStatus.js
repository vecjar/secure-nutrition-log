const { app } = require('@azure/functions');
const { requireAuthenticatedUser } = require('../shared/requireAuthenticatedUser');
const checkUserBlocked = require('../shared/checkUserBlocked');

app.http('getAccessStatus', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'access-status',
  handler: async (request, context) => {
    context.log('getAccessStatus called');

    const authResult = requireAuthenticatedUser(request);

    if (!authResult.ok) {
      return {
        status: 200,
        jsonBody: {
          authenticated: false,
          blocked: false,
          status: 'anonymous'
        }
      };
    }

    const authUser = authResult.authUser;

    const blockedCheck = await checkUserBlocked(authUser, context);

    if (!blockedCheck.ok) {
      return {
        status: 200,
        jsonBody: {
          authenticated: true,
          blocked: true,
          status: 'blocked',
          user: authUser.userDetails || authUser.userKey || authUser.userId || 'Unknown user'
        }
      };
    }

    return {
      status: 200,
      jsonBody: {
        authenticated: true,
        blocked: false,
        status: 'active',
        user: authUser.userDetails || authUser.userKey || authUser.userId || 'Unknown user'
      }
    };
  }
});