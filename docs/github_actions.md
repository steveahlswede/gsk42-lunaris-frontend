# Deployment via GitHub Actions

This repository has a GitHub Actions workflow that deploys to Azure Web App.

In the GitHub repository, we should have 2 environments (prod and dev). If not done yet, create these environments in the GitHub repository (see below). 
The dev environment will target any branch not named main, whereas the prod environment will only target main. 

## GitHub Actions Setup

1. [Register the App in Entra](https://docs.belt.ai/articles/#!belt-enterprise-deployment-guide-for-azure/configure-service-principal-for-github-actions-in-microsoft-azure)
2. Add the Client ID to the .azure/.env file associated to your environment you wish to deploy to. The expected name is `SECRET_AZURE_SERVICE_PRINCIPAL_CLIENT_ID`
3. Create an environment in the GitHub repo. Go to Settings > Environments. Create a new environment and during configuration, switch the toggle next to `Deployment branches and tags` to select `Selected branches and tags` and create a name pattern to match the branches you want the environment's 
variables and secrets to be used on during deployment via GitHub Actions.
4. Load the variables and secrets from your env file into the GitHub environment. This can be automated using the script `./scripts/deploy-env-secrets.sh <GH Env Name> <Path to ./azure/.env file>`


> [!NOTE]
> Its important that any parameter that is not given a default value in the `main.bicep` file should have a value in the GitHub repository environment variables (or be given a value directly in `main.bicep`), otherwise the running of the `azd ... --no-prompt` commands in the CI/CD will fail when it finds a parameter without any value.