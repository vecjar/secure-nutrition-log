# Key Design Decisions

## Why a minimal frontend?
The main purpose of this project is to demonstrate Azure security concepts, not frontend complexity.

## Why Azure Functions?
Azure Functions provides a low-cost backend option and supports Azure-native identity patterns.

## Why Azure Table Storage first?
Azure Table Storage is cheaper and simpler than starting with Azure SQL, which makes it a better fit for version 1.

## Why Bicep?
Bicep allows the infrastructure to be defined and deployed as code, making the project repeatable and easier to explain in a portfolio.
