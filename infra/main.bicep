targetScope = 'resourceGroup'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Project name prefix')
param projectName string = 'snlog'

@description('Environment name')
param environmentName string = 'dev'

@description('Tenant ID for Key Vault')
param tenantId string = subscription().tenantId

@description('Secret URI for the storage connection string in Key Vault')
param storageConnectionSecretUri string

var storageAccountName = toLower('${projectName}${environmentName}stg01')
var functionAppName = '${projectName}-${environmentName}-func-01'
var appInsightsName = '${projectName}-${environmentName}-appi-01'
var hostingPlanName = '${projectName}-${environmentName}-plan-01'
var keyVaultName = '${projectName}-${environmentName}-kv-01'

// Key Vault Secrets User built-in role
var keyVaultSecretsUserRoleDefinitionId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '4633458b-17de-408a-b874-0445c86b69e6'
)

module storage './modules/storage.bicep' = {
  name: 'storageDeploy'
  params: {
    storageAccountName: storageAccountName
    location: location
  }
}

module monitoring './modules/monitoring.bicep' = {
  name: 'monitoringDeploy'
  params: {
    appInsightsName: appInsightsName
    location: location
  }
}

module hostingPlan './modules/hostingPlan.bicep' = {
  name: 'hostingPlanDeploy'
  params: {
    hostingPlanName: hostingPlanName
    location: location
  }
}

module keyVault './modules/keyVault.bicep' = {
  name: 'keyVaultDeploy'
  params: {
    keyVaultName: keyVaultName
    location: location
    tenantId: tenantId
  }
}

module functionApp './modules/functionApp.bicep' = {
  name: 'functionAppDeploy'
  params: {
    functionAppName: functionAppName
    location: location
    hostingPlanId: hostingPlan.outputs.id
    appInsightsInstrumentationKey: monitoring.outputs.instrumentationKey
    azureWebJobsStorage: storage.outputs.connectionString
    storageConnectionSecretUri: storageConnectionSecretUri
  }
}

resource keyVaultResource 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource keyVaultSecretsUserAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVaultName, functionAppName, keyVaultSecretsUserRoleDefinitionId)
  scope: keyVaultResource
  properties: {
    roleDefinitionId: keyVaultSecretsUserRoleDefinitionId
    principalId: functionApp.outputs.principalId
    principalType: 'ServicePrincipal'
  }
}

output storageAccountName string = storage.outputs.name
output functionAppName string = functionApp.outputs.name
output appInsightsName string = monitoring.outputs.name
output keyVaultName string = keyVault.outputs.name
output keyVaultUri string = keyVault.outputs.vaultUri
