const { app } = require('@azure/functions');
const { getAuthenticatedUser } = require('../shared/getAuthenticatedUser');

app.http('getGoals', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'getGoals',
  handler: async (request, context) => {
    const authUser = getAuthenticatedUser(request);

    if (!authUser) {
      return {
        status: 401,
        jsonBody: {
          error: 'Unauthorized.',
          detail: 'No authenticated user could be resolved from x-ms-client-principal.'
        }
      };
    }

    return {
      status: 200,
      jsonBody: {
        message: 'Auth check passed.',
        authUser
      }
    };
  }
});