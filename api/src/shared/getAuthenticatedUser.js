function getAuthenticatedUser(request) {
  const header =
    request.headers.get('x-ms-client-principal') ||
    request.headers.get('X-MS-CLIENT-PRINCIPAL');

  if (!header || typeof header !== 'string') {
    return null;
  }

  try {
    const decoded = Buffer.from(header, 'base64').toString('utf8');
    const clientPrincipal = JSON.parse(decoded);

    if (!clientPrincipal) {
      return null;
    }

    const roles = Array.isArray(clientPrincipal.userRoles)
      ? [...clientPrincipal.userRoles]
      : [];

    if (!roles.includes('authenticated')) {
      return null;
    }

    const userKey = clientPrincipal.userId || clientPrincipal.userDetails;

    if (!userKey) {
      return null;
    }

    const userDetails = clientPrincipal.userDetails || '';

    // Temporary learning/demo role mapping
    // Make your account an admin for testing role-based access
    if (userDetails.toLowerCase() === 'vecjar@gmail.com' && !roles.includes('admin')) {
      roles.push('admin');
    }

    return {
      userKey,
      userId: clientPrincipal.userId || null,
      userDetails,
      identityProvider: clientPrincipal.identityProvider || '',
      roles
    };
  } catch {
    return null;
  }
}

function hasRole(user, roleName) {
  if (!user || !Array.isArray(user.roles)) {
    return false;
  }

  return user.roles.includes(roleName);
}

module.exports = { getAuthenticatedUser, hasRole };