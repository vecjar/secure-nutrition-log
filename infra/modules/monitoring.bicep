param appInsightsName string
param location string

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
  }
}

output id string = appInsights.id
output name string = appInsights.name
output instrumentationKey string = appInsights.properties.InstrumentationKey
