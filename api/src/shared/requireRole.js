const { getAuthenticatedUser, hasRole } = require('./getAuthenticatedUser');

function requireRole(request, roleName) {
  const authUser = getAuthenticatedUser(request);

  if (!authUser) {
    return {
      ok: false,
      response: {
        status: 401,
        jsonBody: { error: 'Unauthorized.' }
      }
    };
  }

  if (!hasRole(authUser, roleName)) {
    return {
      ok: false,
      response: {
        status: 403,
        jsonBody: { error: 'Forbidden.' }
      }
    };
  }

  return {
    ok: true,
    authUser
  };
}

module.exports = { requireRole };