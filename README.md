# Secure Nutrition Log on Azure

A low-cost Azure security portfolio project inspired by nutrition tracking apps.

This project is designed to demonstrate AZ-500 aligned security concepts using a simple Azure-hosted web application.

## Goal

Build a minimal nutrition logging application where authenticated users can:

- sign in with Microsoft Entra ID
- add daily food entries
- view their own entries
- securely access Azure-hosted backend services

## Why I Built This

I am studying for the AZ-500 certification and wanted to create a personal project that demonstrates practical Azure security concepts in a realistic application scenario.

This project is focused on:

- Microsoft Entra ID authentication
- Azure Functions
- Managed Identity
- Azure RBAC
- Azure Key Vault
- secure storage access
- Infrastructure as Code with Bicep

## Planned Architecture

- Frontend: Azure Static Web App
- Authentication: Microsoft Entra ID
- Backend: Azure Functions
- Data Store: Azure Table Storage
- Secrets / Secure Configuration: Azure Key Vault
- Deployment: Bicep

## Initial Scope (v1)

Version 1 will include:

- sign in
- add a food entry
- view today’s entries

Each food entry will include:

- date
- meal type
- food name
- calories
- protein
- carbs
- fats
- notes

## Security Objectives

This project is being designed with security-first principles, including:

- identity-first authentication
- least privilege access
- no hardcoded secrets
- managed identity for Azure resource access
- role-based access control
- infrastructure deployed via code

## Status

Currently in planning and initial infrastructure setup.
