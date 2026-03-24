# Architecture Notes

## Version 1 Architecture

User -> Azure Static Web App -> Azure Functions -> Azure Table Storage

Authentication:
- User signs in with Microsoft Entra ID

Security direction:
- Backend will use managed identity where possible
- Secrets and sensitive configuration will move to Key Vault
- Access will be controlled using RBAC and least privilege principles

## Design Priorities

1. Keep Azure cost low
2. Focus on AZ-500 relevant concepts
3. Keep frontend minimal
4. Expand later without redesigning the whole project
