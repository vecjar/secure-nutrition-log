using './main.bicep'

param location = 'australiaeast'
param projectName = 'snlog'
param environmentName = 'dev'

// Fill this in after you create the secret
param storageConnectionSecretUri = 'https://snlog-dev-kv-01.vault.azure.net/secrets/storage-connection-string/REPLACE_WITH_SECRET_VERSION'
