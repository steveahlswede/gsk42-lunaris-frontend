targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the the environment which is used to generate a short unique hash used in all resources.')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

param appServicePlanName string = '' // Set in main.parameters.json and will be overridden with that value
param backendServiceName string = '' 
param resourceGroupName string = '' 

param applicationInsightsDashboardName string = '' 
param applicationInsightsName string = '' 
param logAnalyticsName string = '' 

param searchServiceName string = '' 
param searchServiceResourceGroupName string = '' 
param searchServiceLocation string = '' 
// The free tier does not support managed identity (required) or semantic search (optional)
@allowed([ 'free', 'basic', 'standard', 'standard2', 'standard3', 'storage_optimized_l1', 'storage_optimized_l2' ])
param searchServiceSkuName string = 'standard'
param searchIndexName string = ''
param searchQueryLanguage string = 'de-de'
param searchQuerySpeller string = 'lexicon'
param searchServiceSemanticRankerLevel string = 'free'
var actualSearchServiceSemanticRankerLevel = (searchServiceSkuName == 'free') ? 'disabled' : searchServiceSemanticRankerLevel

param storageAccountName string = '' 
param storageResourceGroupName string = '' 
param storageResourceGroupLocation string = location
param storageContainerName string = 'content'
param storageSkuName string = 'Standard_LRS'

param userStorageAccountName string 
param userStorageContainerName string = 'user-content'

param appServiceSkuName string 

@allowed([ 'azure', 'openai', 'azure_custom' ])
param openAiHost string 
param isAzureOpenAiHost bool = startsWith(openAiHost, 'azure')
param deployAzureOpenAi bool = openAiHost == 'azure'
param azureOpenAiCustomUrl string = ''
param azureOpenAiApiVersion string = ''
@secure()
param azureOpenAiApiKey string = ''
@description('Primary Azure OpenAI instance name')
param openAiServiceName string
@description('Second Azure OpenAI instance name (optional)')
param openAiServiceName2 string = ''
@description('Third Azure OpenAI instance name (optional)')
param openAiServiceName3 string = ''
@description('Fourth Azure OpenAI instance name (optional)')
param openAiServiceName4 string = ''
param openAiResourceGroupName string = ''

param speechServiceResourceGroupName string = ''
param speechServiceLocation string = ''
param speechServiceName string = ''
param speechServiceSkuName string = ''
param useGPT4V bool = false

// CosmosDB chat history params
param cosmosAccountName string
param databaseName string 
param containerName string
param cosmosDbFreeTierEnabled bool = false
param chatHistoryPartitionKeyPaths array = ['/oid']
param chatHistoryIndexIncludedPaths array =  ['/*']
param chatHistoryIndexExcludedPaths array = ['/_etag/?']

// CosmosDB prompts
param containerNameUserPrompts string
param userPromptsPartitionKeyPaths array = ['/oid']
param containerNameGlobalPrompts string
param globalPromptsPartitionKeyPaths array = ['/category']

@description('Location for the OpenAI resource group')
@allowed([ 'canadaeast', 'eastus', 'eastus2', 'francecentral', 'switzerlandnorth', 'uksouth', 'japaneast', 'northcentralus', 'australiaeast', 'swedencentral', 'germanywestcentral', 'westeurope' ])
@metadata({
  azd: {
    type: 'location'
  }
})
param openAiResourceGroupLocation string

param openAiSkuName string = 'S0'

@secure()
param openAiApiKey string = ''
param openAiApiOrganization string = ''

param documentIntelligenceServiceName string = '' // Set in main.parameters.json
param documentIntelligenceResourceGroupName string = '' // Set in main.parameters.json

// Limited regions for new version:
// https://learn.microsoft.com/azure/ai-services/document-intelligence/concept-layout
@description('Location for the Document Intelligence resource group')
@allowed([ 'eastus', 'westus2', 'westeurope', 'germanywestcentral' ])
@metadata({
  azd: {
    type: 'location'
  }
})
param documentIntelligenceResourceGroupLocation string

param documentIntelligenceSkuName string // Set in main.parameters.json

param computerVisionServiceName string = '' // Set in main.parameters.json
param computerVisionResourceGroupName string = '' // Set in main.parameters.json
param computerVisionResourceGroupLocation string = '' // Set in main.parameters.json
param computerVisionSkuName string // Set in main.parameters.json

param chatGptModelName string = 'gpt-4o'
param chatGptDeploymentName string = 'chat4o'
param chatGptDeploymentVersion string = '2024-08-06'
param chatGptDeploymentCapacity int = 10
var chatGpt = {
  modelName: !empty(chatGptModelName) ? chatGptModelName : startsWith(openAiHost, 'azure') ? 'gpt-4o' : 'gpt-4o'
  deploymentName: !empty(chatGptDeploymentName) ? chatGptDeploymentName : 'chat'
  deploymentVersion: !empty(chatGptDeploymentVersion) ? chatGptDeploymentVersion : '2024-08-06'
  deploymentCapacity: chatGptDeploymentCapacity != 0 ? chatGptDeploymentCapacity : 10
}

param embeddingModelName string = ''
param embeddingDeploymentName string = ''
param embeddingDeploymentVersion string = ''
param embeddingDeploymentCapacity int = 0
param embeddingDimensions int = 0
var embedding = {
  modelName: !empty(embeddingModelName) ? embeddingModelName : 'text-embedding-ada-002'
  deploymentName: !empty(embeddingDeploymentName) ? embeddingDeploymentName : 'embedding'
  deploymentVersion: !empty(embeddingDeploymentVersion) ? embeddingDeploymentVersion : '2'
  deploymentCapacity: embeddingDeploymentCapacity != 0 ? embeddingDeploymentCapacity : 60
  dimensions: embeddingDimensions != 0 ? embeddingDimensions : 1536
}

param gpt4vModelName string = 'gpt-4o'
param gpt4vDeploymentName string = 'gpt-4o'
param gpt4vModelVersion string = '2024-08-06'
param gpt4vDeploymentCapacity int = 10

param tenantId string = tenant().tenantId
param authTenantId string = ''

// Used for the optional login and document level access control system
param useAuthentication bool = false
param enforceAccessControl bool = false
param enableGlobalDocuments bool = false
param enableUnauthenticatedAccess bool = false
param serverAppId string = ''
@secure()
param serverAppSecret string = ''
param clientAppId string = ''
@secure()
param clientAppSecret string = ''

// Used for optional CORS support for alternate frontends
param allowedOrigin string = '' // should start with https://, shouldn't end with a /

@allowed([ 'None', 'AzureServices' ])
@description('If allowedIp is set, whether azure services are allowed to bypass the storage and AI services firewall.')
param bypass string = 'AzureServices'

@description('Public network access value for all deployed resources')
@allowed([ 'Enabled', 'Disabled' ])
param publicNetworkAccess string = 'Enabled'

@description('Add a private endpoints for network connectivity')
param usePrivateEndpoint bool = false

@description('Provision a VM to use for private endpoint connectivity')
param provisionVm bool = false
param vmUserName string = ''
@secure()
param vmPassword string = ''
param vmOsVersion string = ''
param vmOsPublisher string = ''
param vmOsOffer string = ''
@description('Size of the virtual machine.')
param vmSize string = 'Standard_DS1_v2'

@description('Id of the user or app to assign application roles')
param principalId string = ''

@description('Use Application Insights for monitoring and performance tracing')
param useApplicationInsights bool = false

@description('Use speech recognition feature in browser')
param useSpeechInputBrowser bool = false
@description('Use speech synthesis in browser')
param useSpeechOutputBrowser bool = false
@description('Use Azure speech service for reading out text')
param useSpeechOutputAzure bool = false
@description('Show options to use vector embeddings for searching in the app UI')
param useVectors bool = false
@description('Use Built-in integrated Vectorization feature of AI Search to vectorize and ingest documents')
param useIntegratedVectorization bool = false

@description('Enable user document upload feature')
param useUserUpload bool = false
param useLocalPdfParser bool = false
param useLocalHtmlParser bool = false

@description('The email for the admin user. When the admin user is logged in, the Developer Settings button will be shown.')
param adminUsername string

var abbrs = loadJsonContent('abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
param tagsAppName string
param tagsEnvironment string
var tags = { //Change Tags
  ApplicationName: tagsAppName
  BusinessCriticality: 'Low'
  BusinessImpact: 'Low'
  CostCenter: 'tba'
  Creator: 'steve.ahlswede@gsk.de'
  DeploymentDate: '11.12.2024'
  Environment: tagsEnvironment
  Owner: 'tba'
  DataClassification: 'Company'
}

var tenantIdForAuth = !empty(authTenantId) ? authTenantId : tenantId
var authenticationIssuerUri = '${environment().authentication.loginEndpoint}${tenantIdForAuth}/v2.0'

@description('Whether the deployment is running on GitHub Actions')
param runningOnGh string = ''

@description('Whether the deployment is running on Azure DevOps Pipeline')
param runningOnAdo string = ''

// Organize resources in a resource group
resource resourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: !empty(resourceGroupName) ? resourceGroupName : '${abbrs.resourcesResourceGroups}${environmentName}'
  location: location
  tags: tags
}

resource openAiResourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' existing = if (!empty(openAiResourceGroupName)) {
  name: !empty(openAiResourceGroupName) ? openAiResourceGroupName : resourceGroup.name
}

resource documentIntelligenceResourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' existing = if (!empty(documentIntelligenceResourceGroupName)) {
  name: !empty(documentIntelligenceResourceGroupName) ? documentIntelligenceResourceGroupName : resourceGroup.name
}

resource computerVisionResourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' existing = if (!empty(computerVisionResourceGroupName)) {
  name: !empty(computerVisionResourceGroupName) ? computerVisionResourceGroupName : resourceGroup.name
}

resource searchServiceResourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' existing = if (!empty(searchServiceResourceGroupName)) {
  name: !empty(searchServiceResourceGroupName) ? searchServiceResourceGroupName : resourceGroup.name
}

resource storageResourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' existing = if (!empty(storageResourceGroupName)) {
  name: !empty(storageResourceGroupName) ? storageResourceGroupName : resourceGroup.name
}

resource speechResourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' existing = if (!empty(speechServiceResourceGroupName)) {
  name: !empty(speechServiceResourceGroupName) ? speechServiceResourceGroupName : resourceGroup.name
}

// Monitor application with Azure Monitor
module monitoring 'core/monitor/monitoring.bicep' = if (useApplicationInsights) {
  name: 'monitoring'
  scope: resourceGroup
  params: {
    location: location
    tags: tags
    applicationInsightsName: !empty(applicationInsightsName) ? applicationInsightsName : '${abbrs.insightsComponents}${resourceToken}'
    logAnalyticsName: !empty(logAnalyticsName) ? logAnalyticsName : '${abbrs.operationalInsightsWorkspaces}${resourceToken}'
    publicNetworkAccess: publicNetworkAccess
  }
}

module applicationInsightsDashboard 'backend-dashboard.bicep' = if (useApplicationInsights) {
  name: 'application-insights-dashboard'
  scope: resourceGroup
  params: {
    name: !empty(applicationInsightsDashboardName) ? applicationInsightsDashboardName : '${abbrs.portalDashboards}${resourceToken}'
    location: location
    applicationInsightsName: useApplicationInsights ? monitoring.outputs.applicationInsightsName : ''
  }
}

// Create an App Service Plan to group applications under the same payment plan and SKU
module appServicePlan 'core/host/appserviceplan.bicep' = {
  name: 'appserviceplan'
  scope: resourceGroup
  params: {
    name: !empty(appServicePlanName) ? appServicePlanName : '${abbrs.webServerFarms}${resourceToken}'
    location: location
    tags: tags
    sku: {
      name: appServiceSkuName
      capacity: 1
    }
    kind: 'linux'
  }
}

// The application frontend
module backend 'core/host/appservice.bicep' = {
  name: 'web'
  scope: resourceGroup
  params: {
    name: !empty(backendServiceName) ? backendServiceName : '${abbrs.webSitesAppService}backend-${resourceToken}'
    location: location
    tags: union(tags, { 'azd-service-name': 'backend' })
    appServicePlanId: appServicePlan.outputs.id
    runtimeName: 'python'
    runtimeVersion: '3.11'
    appCommandLine: 'python3 -m gunicorn main:app'
    scmDoBuildDuringDeployment: true
    managedIdentity: true
    virtualNetworkSubnetId: isolation.outputs.appSubnetId
    publicNetworkAccess: publicNetworkAccess
    allowedOrigins: [ allowedOrigin ]
    clientAppId: clientAppId
    serverAppId: serverAppId
    enableUnauthenticatedAccess: enableUnauthenticatedAccess
    clientSecretSettingName: !empty(clientAppSecret) ? 'AZURE_CLIENT_APP_SECRET' : ''
    authenticationIssuerUri: authenticationIssuerUri
    use32BitWorkerProcess: appServiceSkuName == 'F1'
    alwaysOn: appServiceSkuName != 'F1'
    appSettings: {
      AZURE_STORAGE_ACCOUNT: storage.outputs.name
      AZURE_STORAGE_CONTAINER: storageContainerName
      AZURE_SEARCH_INDEX: searchIndexName
      AZURE_SEARCH_SERVICE: searchService.outputs.name
      AZURE_SEARCH_SEMANTIC_RANKER: actualSearchServiceSemanticRankerLevel
      AZURE_VISION_ENDPOINT: useGPT4V ? computerVision.outputs.endpoint : ''
      AZURE_SEARCH_QUERY_LANGUAGE: searchQueryLanguage
      AZURE_SEARCH_QUERY_SPELLER: searchQuerySpeller
      APPLICATIONINSIGHTS_CONNECTION_STRING: useApplicationInsights ? monitoring.outputs.applicationInsightsConnectionString : ''
      AZURE_SPEECH_SERVICE_ID: useSpeechOutputAzure ? speech.outputs.resourceId : ''
      AZURE_SPEECH_SERVICE_LOCATION: useSpeechOutputAzure ? speech.outputs.location : ''
      USE_SPEECH_INPUT_BROWSER: useSpeechInputBrowser
      USE_SPEECH_OUTPUT_BROWSER: useSpeechOutputBrowser
      USE_SPEECH_OUTPUT_AZURE: useSpeechOutputAzure
      // Shared by all OpenAI deployments
      OPENAI_HOST: openAiHost
      AZURE_OPENAI_EMB_MODEL_NAME: embedding.modelName
      AZURE_OPENAI_EMB_DIMENSIONS: embedding.dimensions
      AZURE_OPENAI_CHATGPT_MODEL: chatGpt.modelName
      AZURE_OPENAI_GPT4V_MODEL: gpt4vModelName
      // Specific to Azure OpenAI
      AZURE_OPENAI_SERVICE_1: isAzureOpenAiHost && deployAzureOpenAi ? openAi.outputs.name : ''
      AZURE_OPENAI_SERVICE_2: isAzureOpenAiHost && deployAzureOpenAi && !empty(openAiServiceName2) ? openAi2.outputs.name : ''
      AZURE_OPENAI_SERVICE_3: isAzureOpenAiHost && deployAzureOpenAi && !empty(openAiServiceName3) ? openAi3.outputs.name : ''
      AZURE_OPENAI_SERVICE_4: isAzureOpenAiHost && deployAzureOpenAi && !empty(openAiServiceName4) ? openAi4.outputs.name : ''
      AZURE_OPENAI_CHATGPT_DEPLOYMENT: chatGpt.deploymentName
      AZURE_OPENAI_EMB_DEPLOYMENT: embedding.deploymentName
      AZURE_OPENAI_GPT4V_DEPLOYMENT: useGPT4V ? gpt4vDeploymentName : ''
      AZURE_OPENAI_API_VERSION: azureOpenAiApiVersion
      AZURE_OPENAI_API_KEY: azureOpenAiApiKey
      AZURE_OPENAI_CUSTOM_URL: azureOpenAiCustomUrl
      // Used only with non-Azure OpenAI deployments
      OPENAI_API_KEY: openAiApiKey
      OPENAI_ORGANIZATION: openAiApiOrganization
      // Optional login and document level access control system
      AZURE_USE_AUTHENTICATION: useAuthentication
      AZURE_ENFORCE_ACCESS_CONTROL: enforceAccessControl
      AZURE_ENABLE_GLOBAL_DOCUMENTS_ACCESS: enableGlobalDocuments
      AZURE_ENABLE_UNAUTHENTICATED_ACCESS: enableUnauthenticatedAccess
      AZURE_SERVER_APP_ID: serverAppId
      AZURE_SERVER_APP_SECRET: serverAppSecret
      AZURE_CLIENT_APP_ID: clientAppId
      AZURE_CLIENT_APP_SECRET: clientAppSecret
      AZURE_TENANT_ID: tenantId
      AZURE_AUTH_TENANT_ID: tenantIdForAuth
      AZURE_AUTHENTICATION_ISSUER_URI: authenticationIssuerUri
      // CORS support, for frontends on other hosts
      ALLOWED_ORIGIN: allowedOrigin
      USE_VECTORS: useVectors
      USE_GPT4V: useGPT4V
      USE_USER_UPLOAD: useUserUpload
      AZURE_USERSTORAGE_ACCOUNT: useUserUpload ? userStorage.outputs.name : ''
      AZURE_USERSTORAGE_CONTAINER: useUserUpload ? userStorageContainerName : ''
      AZURE_DOCUMENTINTELLIGENCE_SERVICE: documentIntelligence.outputs.name
      USE_LOCAL_PDF_PARSER: useLocalPdfParser
      USE_LOCAL_HTML_PARSER: useLocalHtmlParser
      COSMOS_ACCOUNT_NAME: cosmosAccountName
      DATABASE_NAME: databaseName
      CONTAINER_NAME: containerName
      ADMIN_USERNAME: adminUsername
      CONTAINER_NAME_GLOBAL_PROMPTS: containerNameGlobalPrompts
      CONTAINER_NAME_USER_PROMPTS: containerNameUserPrompts
    }
  }
}

// Deployment array for the first instance (gpt-4o and ADA 002)
var firstInstanceDeployments = [
  {
    name: 'chat4o'
    model: {
      format: 'OpenAI'
      name: 'gpt-4o'
      version: '2024-08-06'
    }
    sku: {
      name: 'DataZoneStandard'
      capacity: 150 // Adjust based on your needs
    }
  }
  {
    name: 'embedding'
    model: {
      format: 'OpenAI'
      name: 'text-embedding-ada-002'
      version: '2' // Adjust to the correct version if needed
    }
    sku: {
      name: 'Standard'
      capacity: 115 // Adjust based on your needs
    }
  }
]

// Deployment array for the remaining instances (GPT-4o)
var gpt4oDeployments = [
  {
    name: chatGptDeploymentName
    model: {
      format: 'OpenAI'
      name: chatGptModelName
      version: gpt4vModelVersion
    }
    sku: {
      name: 'DataZoneStandard' // Use the correct SKU for GPT-4o
      capacity: 150 // Adjust capacity as needed
    }
  }
  {
    name: 'embedding'
    model: {
      format: 'OpenAI'
      name: embedding.modelName
      version: embedding.deploymentVersion // Adjust to the correct version if needed
    }
    sku: {
      name: 'Standard'
      capacity: 175 // Adjust based on your needs
    }
  }
]

// Define the primary OpenAI instance (gpt-4o and ADA 002)
module openAi 'br/public:avm/res/cognitive-services/account:0.5.4' = if (isAzureOpenAiHost && deployAzureOpenAi) {
  name: 'openai'
  scope: openAiResourceGroup
  params: {
    name: !empty(openAiServiceName) ? openAiServiceName : '${abbrs.cognitiveServicesAccounts}${resourceToken}'
    location: openAiResourceGroupLocation
    tags: tags
    kind: 'OpenAI'
    customSubDomainName: !empty(openAiServiceName) ? openAiServiceName : '${abbrs.cognitiveServicesAccounts}${resourceToken}'
    publicNetworkAccess: publicNetworkAccess
    networkAcls: {
      defaultAction: 'Allow'
      bypass: bypass
    }
    sku: openAiSkuName
    deployments: firstInstanceDeployments // Deploy gpt-4o and ADA 002 for the first instance
    disableLocalAuth: true
  }
}

// Define the second OpenAI instance (GPT-4o)
module openAi2 'br/public:avm/res/cognitive-services/account:0.5.4' = if (!empty(openAiServiceName2)) {
  name: 'openai-secondary'
  scope: openAiResourceGroup
  params: {
    name: openAiServiceName2
    location: openAiResourceGroupLocation
    tags: tags
    kind: 'OpenAI'
    customSubDomainName: openAiServiceName2
    publicNetworkAccess: publicNetworkAccess
    networkAcls: {
      defaultAction: 'Allow'
      bypass: bypass
    }
    sku: openAiSkuName
    deployments: firstInstanceDeployments // Deploy gpt-4o and ADA 002 like the first instance
    disableLocalAuth: true
  }
}

// Define the third OpenAI instance (GPT-4o)
module openAi3 'br/public:avm/res/cognitive-services/account:0.5.4' = if (!empty(openAiServiceName3)) {
  name: 'openai-tertiary'
  scope: openAiResourceGroup
  params: {
    name: openAiServiceName3
    location: 'Swedencentral'  
    tags: tags
    kind: 'OpenAI'
    customSubDomainName: openAiServiceName3
    publicNetworkAccess: publicNetworkAccess
    networkAcls: {
      defaultAction: 'Allow'
      bypass: bypass
    }
    sku: openAiSkuName
    deployments: gpt4oDeployments // Deploy GPT-4o for the third instance
    disableLocalAuth: true
  }
}

// Define the fourth OpenAI instance (GPT-4o)
module openAi4 'br/public:avm/res/cognitive-services/account:0.5.4' = if (!empty(openAiServiceName4)) {
  name: 'openai-quaternary'
  scope: openAiResourceGroup
  params: {
    name: openAiServiceName4
    location: 'swedencentral'  
    tags: tags
    kind: 'OpenAI'
    customSubDomainName: openAiServiceName4
    publicNetworkAccess: publicNetworkAccess
    networkAcls: {
      defaultAction: 'Allow'
      bypass: bypass
    }
    sku: openAiSkuName
    deployments: gpt4oDeployments // Deploy GPT-4o for the fourth instance
    disableLocalAuth: true
  }
}


// Formerly known as Form Recognizer
// Does not support bypass
module documentIntelligence 'br/public:avm/res/cognitive-services/account:0.5.4' = {
  name: 'documentintelligence'
  scope: documentIntelligenceResourceGroup
  params: {
    name: !empty(documentIntelligenceServiceName) ? documentIntelligenceServiceName : '${abbrs.cognitiveServicesDocumentIntelligence}${resourceToken}'
    kind: 'FormRecognizer'
    customSubDomainName: !empty(documentIntelligenceServiceName) ? documentIntelligenceServiceName : '${abbrs.cognitiveServicesDocumentIntelligence}${resourceToken}'
    publicNetworkAccess: publicNetworkAccess
    networkAcls: {
      defaultAction: 'Allow'
    }
    location: documentIntelligenceResourceGroupLocation
    disableLocalAuth: true
    tags: tags
    sku: documentIntelligenceSkuName
  }
}

module computerVision 'br/public:avm/res/cognitive-services/account:0.5.4' = if (useGPT4V) {
  name: 'computerVision'
  scope: computerVisionResourceGroup
  params: {
    name: !empty(computerVisionServiceName)
      ? computerVisionServiceName
      : '${abbrs.cognitiveServicesComputerVision}${resourceToken}'
    kind: 'ComputerVision'
    networkAcls: {
      defaultAction: 'Allow'
    }
    customSubDomainName: !empty(computerVisionServiceName)
      ? computerVisionServiceName
      : '${abbrs.cognitiveServicesComputerVision}${resourceToken}'
    location: computerVisionResourceGroupLocation
    tags: tags
    sku: computerVisionSkuName
  }
}

module speech 'br/public:avm/res/cognitive-services/account:0.5.4' = if (useSpeechOutputAzure) {
  name: 'speech-service'
  scope: speechResourceGroup
  params: {
    name: !empty(speechServiceName) ? speechServiceName : '${abbrs.cognitiveServicesSpeech}${resourceToken}'
    kind: 'SpeechServices'
    networkAcls: {
      defaultAction: 'Allow'
    }
    customSubDomainName: !empty(speechServiceName) ? speechServiceName : '${abbrs.cognitiveServicesSpeech}${resourceToken}'
    location: !empty(speechServiceLocation) ? speechServiceLocation : location
    tags: tags
    sku: speechServiceSkuName
  }
}
module searchService 'core/search/search-services.bicep' = {
  name: 'search-service'
  scope: searchServiceResourceGroup
  params: {
    name: !empty(searchServiceName) ? searchServiceName : 'gptkb-${resourceToken}'
    location: !empty(searchServiceLocation) ? searchServiceLocation : location
    tags: tags
    disableLocalAuth: true
    sku: {
      name: searchServiceSkuName
    }
    semanticSearch: actualSearchServiceSemanticRankerLevel
    publicNetworkAccess: publicNetworkAccess == 'Enabled' ? 'enabled' : (publicNetworkAccess == 'Disabled' ? 'disabled' : null)
    sharedPrivateLinkStorageAccounts: usePrivateEndpoint ? [ storage.outputs.id ] : []
  }
}

module searchDiagnostics 'core/search/search-diagnostics.bicep' = if (useApplicationInsights) {
  name: 'search-diagnostics'
  scope: searchServiceResourceGroup
  params: {
    searchServiceName: searchService.outputs.name
    workspaceId: useApplicationInsights ? monitoring.outputs.logAnalyticsWorkspaceId : ''
  }
}

module storage 'core/storage/storage-account.bicep' = {
  name: 'storage'
  scope: storageResourceGroup
  params: {
    name: !empty(storageAccountName) ? storageAccountName : '${abbrs.storageStorageAccounts}${resourceToken}'
    location: storageResourceGroupLocation
    tags: tags
    publicNetworkAccess: publicNetworkAccess
    bypass: bypass
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    sku: {
      name: storageSkuName
    }
    deleteRetentionPolicy: {
      enabled: true
      days: 2
    }
    containers: [
      {
        name: storageContainerName
        publicAccess: 'None'
      }
    ]
  }
}

module userStorage 'core/storage/storage-account.bicep' = if (useUserUpload) {
  name: 'user-storage'
  scope: storageResourceGroup
  params: {
    name: !empty(userStorageAccountName) ? userStorageAccountName : 'user${abbrs.storageStorageAccounts}${resourceToken}'
    location: storageResourceGroupLocation
    tags: tags
    publicNetworkAccess: publicNetworkAccess
    bypass: bypass
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    isHnsEnabled: true
    sku: {
      name: storageSkuName
    }
    containers: [
      {
        name: userStorageContainerName
        publicAccess: 'None'
      }
    ]
  }
}

// USER ROLES
// var principalType = empty(runningOnGh) && empty(runningOnAdo) ? 'User' : 'ServicePrincipal'
var principalType = 'User'

module openAiRoleUser 'core/security/role.bicep' = if (isAzureOpenAiHost && deployAzureOpenAi) {
  scope: openAiResourceGroup
  name: 'openai-role-user'
  params: {
    principalId: principalId
    roleDefinitionId: '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'
    principalType: principalType
  }
}

// For both document intelligence and computer vision
module cognitiveServicesRoleUser 'core/security/role.bicep' = {
  scope: resourceGroup
  name: 'cognitiveservices-role-user'
  params: {
    principalId: principalId
    roleDefinitionId: 'a97b65f3-24c7-4388-baec-2e87135dc908'
    principalType: principalType
  }
}

module speechRoleUser 'core/security/role.bicep' = {
  scope: speechResourceGroup
  name: 'speech-role-user'
  params: {
    principalId: principalId
    roleDefinitionId: 'f2dc8367-1007-4938-bd23-fe263f013447'
    principalType: principalType
  }
}

module cosmosRoleUser 'core/security/role.bicep' = {
  scope: storageResourceGroup
  name: 'cosmos-role-user'
  params: {
    principalId: backend.outputs.identityPrincipalId
    roleDefinitionId: '5bd9cd88-fe45-4216-938b-f97437e15450'
    principalType: 'ServicePrincipal'
  }
}

module cosmosDbDataContribRoleUser 'core/security/cosmosdb-sql-role.bicep' = {
  scope: resourceGroup
  name: 'cosmosdb-data-contrib-role-user'
  params: {
    databaseAccountName: cosmosDb.outputs.name
    principalId: backend.outputs.identityPrincipalId
    // Cosmos DB Built-in Data Contributor role
    roleDefinitionId: '/${subscription().id}/resourceGroups/${cosmosDb.outputs.resourceGroupName}/providers/Microsoft.DocumentDB/databaseAccounts/${cosmosDb.outputs.name}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002'
  }
}

module cosmosRoleForAdminAccount 'core/security/role.bicep' = {
  scope: storageResourceGroup
  name: 'cosmos-role-user-principal'
  params: {
    principalId: principalId
    roleDefinitionId: '5bd9cd88-fe45-4216-938b-f97437e15450'
    principalType: 'User'
  }
}

module cosmosDbDataContribRoleForAdminAccount 'core/security/cosmosdb-sql-role.bicep' = {
  scope: resourceGroup
  name: 'cosmosdb-data-contrib-role-user-principal'
  params: {
    databaseAccountName: cosmosDb.outputs.name
    principalId: principalId
    // Cosmos DB Built-in Data Contributor role
    roleDefinitionId: '/${subscription().id}/resourceGroups/${cosmosDb.outputs.resourceGroupName}/providers/Microsoft.DocumentDB/databaseAccounts/${cosmosDb.outputs.name}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002'
  }
}


module storageRoleUser 'core/security/role.bicep' = {
  scope: storageResourceGroup
  name: 'storage-role-user'
  params: {
    principalId: principalId
    roleDefinitionId: '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1'
    principalType: principalType
  }
}

module storageContribRoleUser 'core/security/role.bicep' = {
  scope: storageResourceGroup
  name: 'storage-contrib-role-user'
  params: {
    principalId: principalId
    roleDefinitionId: 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
    principalType: principalType
  }
}

module storageOwnerRoleUser 'core/security/role.bicep' = if (useUserUpload) {
  scope: storageResourceGroup
  name: 'storage-owner-role-user'
  params: {
    principalId: principalId
    roleDefinitionId: 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'
    principalType: principalType
  }
}

module searchRoleUser 'core/security/role.bicep' = {
  scope: searchServiceResourceGroup
  name: 'search-role-user'
  params: {
    principalId: principalId
    roleDefinitionId: '1407120a-92aa-4202-b7e9-c0e197c71c8f'
    principalType: principalType
  }
}

module searchContribRoleUser 'core/security/role.bicep' = {
  scope: searchServiceResourceGroup
  name: 'search-contrib-role-user'
  params: {
    principalId: principalId
    roleDefinitionId: '8ebe5a00-799e-43f5-93ac-243d3dce84a7'
    principalType: principalType
  }
}

module searchSvcContribRoleUser 'core/security/role.bicep' = {
  scope: searchServiceResourceGroup
  name: 'search-svccontrib-role-user'
  params: {
    principalId: principalId
    roleDefinitionId: '7ca78c08-252a-4471-8644-bb5ff32d4ba0'
    principalType: principalType
  }
}

// SYSTEM IDENTITIES
module openAiRoleBackend 'core/security/role.bicep' = if (isAzureOpenAiHost && deployAzureOpenAi) {
  scope: openAiResourceGroup
  name: 'openai-role-backend'
  params: {
    principalId: backend.outputs.identityPrincipalId
    roleDefinitionId: '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'
    principalType: 'ServicePrincipal'
  }
}

module openAiRoleSearchService 'core/security/role.bicep' = if (isAzureOpenAiHost && deployAzureOpenAi && useIntegratedVectorization) {
  scope: openAiResourceGroup
  name: 'openai-role-searchservice'
  params: {
    principalId: searchService.outputs.principalId
    roleDefinitionId: '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'
    principalType: 'ServicePrincipal'
  }
}

module storageRoleBackend 'core/security/role.bicep' = {
  scope: storageResourceGroup
  name: 'storage-role-backend'
  params: {
    principalId: backend.outputs.identityPrincipalId
    roleDefinitionId: '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1'
    principalType: 'ServicePrincipal'
  }
}

module storageOwnerRoleBackend 'core/security/role.bicep' = if (useUserUpload) {
  scope: storageResourceGroup
  name: 'storage-owner-role-backend'
  params: {
    principalId: backend.outputs.identityPrincipalId
    roleDefinitionId: 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b'
    principalType: 'ServicePrincipal'
  }
}

module storageRoleSearchService 'core/security/role.bicep' = if (useIntegratedVectorization) {
  scope: storageResourceGroup
  name: 'storage-role-searchservice'
  params: {
    principalId: searchService.outputs.principalId
    roleDefinitionId: '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1'
    principalType: 'ServicePrincipal'
  }
}

// Used to issue search queries
// https://learn.microsoft.com/azure/search/search-security-rbac
module searchRoleBackend 'core/security/role.bicep' = {
  scope: searchServiceResourceGroup
  name: 'search-role-backend'
  params: {
    principalId: backend.outputs.identityPrincipalId
    roleDefinitionId: '1407120a-92aa-4202-b7e9-c0e197c71c8f'
    principalType: 'ServicePrincipal'
  }
}

module speechRoleBackend 'core/security/role.bicep' = {
  scope: speechResourceGroup
  name: 'speech-role-backend'
  params: {
    principalId: backend.outputs.identityPrincipalId
    roleDefinitionId: 'f2dc8367-1007-4938-bd23-fe263f013447'
    principalType: 'ServicePrincipal'
  }
}

module isolation 'network-isolation.bicep' = {
  name: 'networks'
  scope: resourceGroup
  params: {
    location: location
    tags: tags
    resourceToken: resourceToken
    vnetName: '${abbrs.virtualNetworks}${resourceToken}'
    appServicePlanName: appServicePlan.outputs.name
    provisionVm: provisionVm
    usePrivateEndpoint: usePrivateEndpoint
  }
}

var environmentData = environment()

var openAiPrivateEndpointConnection = (isAzureOpenAiHost && deployAzureOpenAi) ? [{
  groupId: 'account'
  dnsZoneName: 'privatelink.openai.azure.com'
  resourceIds: concat(
    [ openAi.outputs.resourceId ],
    useGPT4V ? [ computerVision.outputs.resourceId ] : [],
    !useLocalPdfParser ? [ documentIntelligence.outputs.resourceId ] : []
  )
}] : []
var otherPrivateEndpointConnections = usePrivateEndpoint ? [
  {
    groupId: 'blob'
    dnsZoneName: 'privatelink.blob.${environmentData.suffixes.storage}'
    resourceIds: concat(
      [ storage.outputs.id ],
      useUserUpload ? [ userStorage.outputs.id ] : []
    )
  }
  {
    groupId: 'searchService'
    dnsZoneName: 'privatelink.search.windows.net'
    resourceIds: [ searchService.outputs.id ]
  }
  {
    groupId: 'sites'
    dnsZoneName: 'privatelink.azurewebsites.net'
    resourceIds: [ backend.outputs.id ]
  }
] : []


var privateEndpointConnections = concat(otherPrivateEndpointConnections, openAiPrivateEndpointConnection)

module privateEndpoints 'private-endpoints.bicep' = if (usePrivateEndpoint) {
  name: 'privateEndpoints'
  scope: resourceGroup
  params: {
    location: location
    tags: tags
    resourceToken: resourceToken
    privateEndpointConnections: privateEndpointConnections
    applicationInsightsId: useApplicationInsights ? monitoring.outputs.applicationInsightsId : ''
    logAnalyticsWorkspaceId: useApplicationInsights ? monitoring.outputs.logAnalyticsWorkspaceId : ''
    vnetName: isolation.outputs.vnetName
    vnetPeSubnetName: isolation.outputs.backendSubnetId
  }
}

module vm 'core/host/vm.bicep' = if (provisionVm && usePrivateEndpoint) {
  name: 'vm'
  scope: resourceGroup
  params: {
    name: '${abbrs.computeVirtualMachines}${resourceToken}'
    location: location
    adminUsername: vmUserName
    adminPassword: vmPassword
    nicId: isolation.outputs.nicId
    osVersion: vmOsVersion
    osPublisher: vmOsPublisher
    osOffer: vmOsOffer
    vmSize: vmSize
  }
}

// Used to read index definitions (required when using authentication)
// https://learn.microsoft.com/azure/search/search-security-rbac
module searchReaderRoleBackend 'core/security/role.bicep' = if (useAuthentication) {
  scope: searchServiceResourceGroup
  name: 'search-reader-role-backend'
  params: {
    principalId: backend.outputs.identityPrincipalId
    roleDefinitionId: 'acdd72a7-3385-48ef-bd42-f606fba81ae7'
    principalType: 'ServicePrincipal'
  }
}

// Used to add/remove documents from index (required for user upload feature)
module searchContribRoleBackend 'core/security/role.bicep' = if (useUserUpload) {
  scope: searchServiceResourceGroup
  name: 'search-contrib-role-backend'
  params: {
    principalId: backend.outputs.identityPrincipalId
    roleDefinitionId: '8ebe5a00-799e-43f5-93ac-243d3dce84a7'
    principalType: 'ServicePrincipal'
  }
}

// For computer vision access by the backend
module computerVisionRoleBackend 'core/security/role.bicep' = if (useGPT4V) {
  scope: computerVisionResourceGroup
  name: 'computervision-role-backend'
  params: {
    principalId: backend.outputs.identityPrincipalId
    roleDefinitionId: 'a97b65f3-24c7-4388-baec-2e87135dc908'
    principalType: 'ServicePrincipal'
  }
}

// For document intelligence access by the backend
module documentIntelligenceRoleBackend 'core/security/role.bicep' = if (useUserUpload) {
  scope: documentIntelligenceResourceGroup
  name: 'documentintelligence-role-backend'
  params: {
    principalId: backend.outputs.identityPrincipalId
    roleDefinitionId: 'a97b65f3-24c7-4388-baec-2e87135dc908'
    principalType: 'ServicePrincipal'
  }
}

module cosmosDb 'core/cosmodb/db.bicep' = {
  name: 'cosmos-db-chat-history'
  scope: resourceGroup
  params: {
    location: location
    tags: tags
    accountName: cosmosAccountName
    databaseName: databaseName
    cosmosDbFreeTierEnabled: cosmosDbFreeTierEnabled
  }
}

module chatHistoryContainer 'core/cosmodb/container.bicep' = {
  name: 'cosmos-container-chat-history'
  scope: resourceGroup
  params: {
    parentCosmos: cosmosDb.outputs.name
    parentDatabase: cosmosDb.outputs.parentDb
    containerName: containerName
    partitionKeyPaths: chatHistoryPartitionKeyPaths
    indexingIncludedPaths: chatHistoryIndexIncludedPaths
    indexingExcludedPaths: chatHistoryIndexExcludedPaths
  }
}

module globalPromptsContainer 'core/cosmodb/container.bicep' = {
  name: 'cosmos-container-global-prompts'
  scope: resourceGroup
  params: {
    parentCosmos: cosmosDb.outputs.name
    parentDatabase: cosmosDb.outputs.parentDb
    containerName: containerNameGlobalPrompts
    partitionKeyPaths: globalPromptsPartitionKeyPaths
    indexingIncludedPaths: chatHistoryIndexIncludedPaths
    indexingExcludedPaths: chatHistoryIndexExcludedPaths
  }
}

module userPromptsContainer 'core/cosmodb/container.bicep' = {
  name: 'cosmos-container-user-prompts'
  scope: resourceGroup
  params: {
    parentCosmos: cosmosDb.outputs.name
    parentDatabase: cosmosDb.outputs.parentDb
    containerName: containerNameUserPrompts
    partitionKeyPaths: userPromptsPartitionKeyPaths
    indexingIncludedPaths: chatHistoryIndexIncludedPaths
    indexingExcludedPaths: chatHistoryIndexExcludedPaths
  }
}

output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = tenantId
output AZURE_AUTH_TENANT_ID string = authTenantId
output AZURE_RESOURCE_GROUP string = resourceGroup.name

// Shared by all OpenAI deployments
output OPENAI_HOST string = openAiHost
output AZURE_OPENAI_EMB_MODEL_NAME string = embedding.modelName
output AZURE_OPENAI_CHATGPT_MODEL string = chatGpt.modelName
output AZURE_OPENAI_GPT4V_MODEL string = gpt4vModelName

// Output for the primary OpenAI instance
output AZURE_OPENAI_SERVICE_1 string = isAzureOpenAiHost && deployAzureOpenAi ? openAi.outputs.name : ''
output AZURE_OPENAI_SERVICE_2 string = !empty(openAiServiceName2) ? openAi2.outputs.name : ''
output AZURE_OPENAI_SERVICE_3 string = !empty(openAiServiceName3) ? openAi3.outputs.name : ''
output AZURE_OPENAI_SERVICE_4 string = !empty(openAiServiceName4) ? openAi4.outputs.name : ''

output AZURE_OPENAI_API_VERSION string = isAzureOpenAiHost ? azureOpenAiApiVersion : ''
output AZURE_OPENAI_RESOURCE_GROUP string = isAzureOpenAiHost ? openAiResourceGroup.name : ''
output AZURE_OPENAI_CHATGPT_DEPLOYMENT string = isAzureOpenAiHost ? chatGpt.deploymentName : ''
output AZURE_OPENAI_EMB_DEPLOYMENT string = isAzureOpenAiHost ? embedding.deploymentName : ''
output AZURE_OPENAI_GPT4V_DEPLOYMENT string = isAzureOpenAiHost ? gpt4vDeploymentName : ''

output AZURE_SPEECH_SERVICE_ID string = useSpeechOutputAzure ? speech.outputs.resourceId : ''
output AZURE_SPEECH_SERVICE_LOCATION string = useSpeechOutputAzure ? speech.outputs.location : ''

output AZURE_VISION_ENDPOINT string = useGPT4V ? computerVision.outputs.endpoint : ''

output AZURE_DOCUMENTINTELLIGENCE_SERVICE string = documentIntelligence.outputs.name
output AZURE_DOCUMENTINTELLIGENCE_RESOURCE_GROUP string = documentIntelligenceResourceGroup.name

output AZURE_SEARCH_INDEX string = searchIndexName
output AZURE_SEARCH_SERVICE string = searchService.outputs.name
output AZURE_SEARCH_SERVICE_RESOURCE_GROUP string = searchServiceResourceGroup.name
output AZURE_SEARCH_SEMANTIC_RANKER string = actualSearchServiceSemanticRankerLevel
output AZURE_SEARCH_SERVICE_ASSIGNED_USERID string = searchService.outputs.principalId

output AZURE_STORAGE_ACCOUNT string = storage.outputs.name
output AZURE_STORAGE_CONTAINER string = storageContainerName
output AZURE_STORAGE_RESOURCE_GROUP string = storageResourceGroup.name

output AZURE_USERSTORAGE_ACCOUNT string = useUserUpload ? userStorage.outputs.name : ''
output AZURE_USERSTORAGE_CONTAINER string = userStorageContainerName
output AZURE_USERSTORAGE_RESOURCE_GROUP string = storageResourceGroup.name

output AZURE_USE_AUTHENTICATION bool = useAuthentication

output BACKEND_URI string = backend.outputs.uri
output COSMOS_ACCOUNT_NAME string = cosmosDb.outputs.name
