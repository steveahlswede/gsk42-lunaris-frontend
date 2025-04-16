. ./scripts/load_azd_env.ps1

if (-not $env:AZURE_USE_AUTHENTICATION) {
  Exit 0
}

. ./scripts/load_python_env.ps1

$venvPythonPath = "./.venv/scripts/python.exe"
if (Test-Path -Path "/usr") {
  # fallback to Linux venv path
  $venvPythonPath = "./.venv/bin/python"
}

# Ja/Nein-Abfrage vor dem Starten des Prozesses
$confirmation = Read-Host "Did you read the README_deploy_global_prompts and made sure you have the correct CosmosDB Roles (Yes/No)"

if ($confirmation -match "^(yes|y|ja|j)$") {
    Start-Process -FilePath $venvPythonPath -ArgumentList "./scripts/deploy_global_prompts.py" -Wait -NoNewWindow
} else {
    Write-Host "Script execution aborted. Please read the README_deploy_global_prompts and make sure you have the correct CosmosDB Roles."
    Exit 0
}
