# 🚀 Deploy Global Prompts Script

This script (`deploy_global_prompts.py`) is used to deploy global prompts for the system. It automatically configures the necessary settings and uploads the corresponding data to Azure CosmosDB.

## 📌 Required Azure CosmosDB Roles & Permissions

Your user account or service principal must have **read and write permissions** in CosmosDB. The required roles should be created as **Custom Roles** using Azure Cloud Shell or the appropriate PowerShell modules.

### Documentation Reference:
[Microsoft Documentation on Role-Based Access Control (RBAC)](https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-setup-rbac#permission-model)

To ensure the correct permissions are set, follow these steps:

```powershell
Set-AzContext -Subscription "<Subscription ID where the CosmosDB is located>"
$accountName = "<CosmosDB Account Name>"
$resourceGroupName = "<Resource Group where the CosmosDB Account is located>"
```

### Creating a Read-Only Custom Role

```powershell
New-AzCosmosDBSqlRoleDefinition -AccountName $accountName -ResourceGroupName $resourceGroupName -Type CustomRole -RoleName CosmosDBReadOnlyCustomRole -DataAction @( 
    'Microsoft.DocumentDB/databaseAccounts/readMetadata', 
    'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/items/read', 
    'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/executeQuery', 
    'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/readChangeFeed'
) -AssignableScope "/"
```

### Creating a Read-Write Custom Role

```powershell
New-AzCosmosDBSqlRoleDefinition -AccountName $accountName -ResourceGroupName $resourceGroupName -Type CustomRole -RoleName CosmosDBReadWriteCustomRole -DataAction @( 
    'Microsoft.DocumentDB/databaseAccounts/readMetadata',
    'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/items/*', 
    'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers/*'
) -AssignableScope "/"
```

### Retrieving Custom Role IDs

After creation, fetch the role definitions, as their **IDs** are required for the next steps:

```powershell
Get-AzCosmosDBSqlRoleDefinition -AccountName $accountName -ResourceGroupName $resourceGroupName
```

Example output:

```powershell
RoleName         : CosmosDBReadWriteCustomRole
Id               : /subscriptions/<subscriptionId>/resourceGroups/<resourceGroup>/providers/Microsoft.DocumentDB/databaseAccounts/<cosmosDBAccount>/sqlRoleDefinitions/<roleDefinitionId>
Type             : CustomRole
Permissions      : {Microsoft.Azure.Management.CosmosDB.Models.Permission}
AssignableScopes : {/subscriptions/<subscriptionId>/resourceGroups/<resourceGroup>/providers/Microsoft.DocumentDB/databaseAccounts/<cosmosDBAccount>}
```

### Assigning Roles to a Principal

Define variables for role assignments:

```powershell
$readRoleDefinitionId = "/subscriptions/<subscriptionId>/resourceGroups/<resourceGroup>/providers/Microsoft.DocumentDB/databaseAccounts/<cosmosDBAccount>/sqlRoleDefinitions/<roleDefinitionId>" 
$readWriteRoleDefinitionId = "/subscriptions/<subscriptionId>/resourceGroups/<resourceGroup>/providers/Microsoft.DocumentDB/databaseAccounts/<cosmosDBAccount>/sqlRoleDefinitions/<roleDefinitionId>" 
$principalId = "<Principal ID>"
```

Assign the roles:

```powershell
New-AzCosmosDBSqlRoleAssignment -AccountName $accountName -ResourceGroupName $resourceGroupName -RoleDefinitionId $readRoleDefinitionId -Scope "/" -PrincipalId $principalId
New-AzCosmosDBSqlRoleAssignment -AccountName $accountName -ResourceGroupName $resourceGroupName -RoleDefinitionId $readWriteRoleDefinitionId -Scope "/" -PrincipalId $principalId
```

## ✅ Running the Deployment Script

Once the required roles are assigned, execute the deployment script:

**For PowerShell:**
```powershell
./scripts/deploy_global_prompts.ps1
```

**For Bash:**
```sh
./scripts/deploy_global_prompts.sh
```

> The script will prompt for confirmation before execution.

## 🛠️ Troubleshooting

1. **Missing Permissions?** Ensure your user or service principal has the correct CosmosDB role assignments.
2. **Python Issues?** Verify the virtual environment is set up correctly:
   ```sh
   .venv/bin/python --version
   ```
   Reinstall dependencies if necessary:
   ```sh
   .venv/bin/pip install -r requirements.txt
   ```
3. **Azure Authentication Issues?** If authentication fails, log in again:
   ```sh
   az login
   ```
