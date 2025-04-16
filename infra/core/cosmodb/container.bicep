param parentDatabase string
param parentCosmos string

@description('The name for the container')
param containerName string


param partitionKeyPaths array
param indexingIncludedPaths array
var idxIncludingPaths = [for item in indexingIncludedPaths: {path: item}]
param indexingExcludedPaths array
var idxExcludingPaths = [for item in indexingExcludedPaths: {path: item}]

@minValue(400)
@maxValue(1000000)
@description('The throughput for the container')
param throughput int = 400

resource parentCosmosAccount  'Microsoft.DocumentDB/databaseAccounts@2024-02-15-preview' existing = {
  name: parentCosmos
}

resource parentDb 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-02-15-preview' existing = {
  parent: parentCosmosAccount
  name: parentDatabase
}

resource container 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-02-15-preview' = {
  parent: parentDb
  name:  containerName
  properties: {
    resource: {
      id: containerName
      partitionKey: {
        paths: partitionKeyPaths
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        includedPaths: idxIncludingPaths
        excludedPaths: idxExcludingPaths
      }
    }
    options: {
      throughput: throughput
    }
  }
}
