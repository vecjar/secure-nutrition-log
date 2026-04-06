const { TableClient } = require('@azure/data-tables');
const { DefaultAzureCredential } = require('@azure/identity');

function getTableClient(tableNameEnvVar, fallbackTableName) {
  const accountName = process.env.STORAGE_ACCOUNT_NAME;
  const tableName = process.env[tableNameEnvVar] || fallbackTableName;

  if (!accountName) {
    throw new Error('STORAGE_ACCOUNT_NAME is missing.');
  }

  if (!tableName) {
    throw new Error(`Table name is missing for ${tableNameEnvVar}.`);
  }

  const endpoint = `https://${accountName}.table.core.windows.net`;
  const credential = new DefaultAzureCredential();

  return new TableClient(endpoint, tableName, credential);
}

module.exports = { getTableClient };