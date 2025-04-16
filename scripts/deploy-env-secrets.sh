#!/bin/bash

# gh auth login

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <environment> <env_file_path>"
  exit 1
fi

ENVIRONMENT="$1"
ENV_FILE="$2"

while IFS='=' read -r key value || [ -n "$key" ]; do
  value_cleaned=$(echo "$value" | sed 's/^"//' | sed 's/"$//')

  if [ -z "$value_cleaned" ]; then
    echo "Skipping empty value for key: $key"
    echo
    continue
  fi

  echo "Value $value_cleaned"
  if [[ "$key" == *"SECRET"* ]]; then
    gh secret set "$key" --body "$value_cleaned" --repo GSK-CCD/chat-gsk42 --env "$ENVIRONMENT"
  else
    gh variable set "$key" --body "$value_cleaned" --repo GSK-CCD/chat-gsk42 --env "$ENVIRONMENT"
  fi

  echo

done < "$ENV_FILE"