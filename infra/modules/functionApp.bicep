param functionAppName string
param location string
param hostingPlanId string
param appInsightsInstrumentationKey string
param azureWebJobsStorage string
param storageConnectionSecretUri string

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: hostingPlanId
    httpsOnly: true
    siteConfig: {
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: azureWebJobsStorage
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsightsInstrumentationKey
        }
        {
          name: 'STORAGE_CONNECTION_STRING'
          value: '@Microsoft.KeyVault(SecretUri=${storageConnectionSecretUri})'
        }
      ]
    }
  }
}

output id string = functionApp.id
output name string = functionApp.name
output principalId string = functionApp.identity.principalId
