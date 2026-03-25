const { getAuthenticatedUser } = require('./getAuthenticatedUser');

function requireAuthenticatedUser(request) {
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

  return {
    ok: true,
    authUser
  };
}

module.exports = { requireAuthenticatedUser };