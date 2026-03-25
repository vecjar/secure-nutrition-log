function getAuthenticatedUser(request) {
  const header =
    request.headers.get('x-ms-client-principal') ||
    request.headers.get('X-MS-CLIENT-PRINCIPAL');

  if (!header) {
    return null;
  }

  try {
    const decoded = Buffer.from(header, 'base64').toString('utf8');
    const clientPrincipal = JSON.parse(decoded);

    if (!clientPrincipal) {
      return null;
    }

    const roles = Array.isArray(clientPrincipal.userRoles)
      ? clientPrincipal.userRoles
      : [];

    if (!roles.includes('authenticated')) {
      return null;
    }

    const userKey = clientPrincipal.userId || clientPrincipal.userDetails;

    if (!userKey) {
      return null;
    }

    return {
      userKey,
      userId: clientPrincipal.userId || null,
      userDetails: clientPrincipal.userDetails || '',
      identityProvider: clientPrincipal.identityProvider || '',
      roles
    };
  } catch {
    return null;
  }
}

module.exports = { getAuthenticatedUser };