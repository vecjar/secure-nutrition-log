# 🥗 Secure Nutrition Log (Azure Full-Stack Project)

A secure, cloud-native nutrition tracking application built on Microsoft Azure.  
This project demonstrates modern full-stack development combined with Azure security best practices aligned with AZ-500 concepts.

---

## 🚀 Live Application

👉 https://salmon-ground-0674e7100.1.azurestaticapps.net

🔐 **Login required:**  
Sign in using a Microsoft account (Microsoft Entra ID authentication)

💡 This demonstrates:
- Secure user authentication
- Per-user data isolation
- Production-style access control

---

## 📌 Overview

Secure Nutrition Log allows users to:
- Track daily food intake and macros
- Create and reuse custom foods
- Set nutrition goals dynamically via profile
- View daily summaries and trends
- Securely store and isolate user data

The application is built with a strong focus on **security, identity, and cloud-native architecture**.

---

## 🎯 Purpose of This Project

This project was built to:
- Demonstrate Azure security best practices (AZ-500 aligned)
- Showcase real-world identity and access control patterns
- Build a production-style full-stack cloud application

---

## ⭐ Highlights

- 🔐 Secure authentication with Microsoft Entra ID
- 🔑 Secrets managed via Azure Key Vault (no hardcoded credentials)
- 🛡️ Managed Identity + RBAC for secure resource access
- 📊 Admin dashboard with user tracking and activity insights
- ☁️ Fully deployed on Azure (frontend + backend)

---

## 🏗️ Architecture

### High-Level Design

```text
Frontend (Azure Static Web App)
        |
        v
Azure Functions (API Layer)
        |
        v
Azure Table Storage (Data Layer)

        ^
        |
Azure Key Vault (Secrets)
        ^
        |
Managed Identity + RBAC
```

---

## 🔐 Security Implementation (AZ-500 Aligned)

This project focuses heavily on Azure security best practices:

### ✅ Authentication
- Azure Static Web Apps authentication (Microsoft Entra ID)
- Backend validates user identity via `x-ms-client-principal`
- Per-user data isolation using partition keys

---

### ✅ Managed Identity
- System-assigned Managed Identity enabled on Function App
- Used to securely access:
  - Azure Key Vault
  - Storage resources via RBAC

---

### ✅ Azure Key Vault
- Secrets stored securely (e.g., storage connection string)
- Function App retrieves secrets via **Key Vault references**
- Eliminates hardcoded credentials

---

### ✅ Role-Based Access Control (RBAC)
- Key roles assigned:
  - **Key Vault Secrets User**
  - **Storage Table Data Contributor**
- Ensures least-privilege access model

---

### ✅ Secure Backend Design
- Backend enforces authentication (no trust in frontend)
- User access validation on every request
- User activity tracking and audit logging

---

## ⚙️ Technology Stack

### Frontend
- HTML / CSS / JavaScript
- Tailwind CSS
- Azure Static Web Apps

### Backend
- Azure Functions (Node.js)
- REST API endpoints

### Data Layer
- Azure Table Storage
- Partitioned per user

### Security & Identity
- Microsoft Entra ID
- Managed Identity
- Azure Key Vault
- RBAC

---

## 📊 Features

### 🥗 Nutrition Tracking
- Add meals by category (Breakfast, Lunch, Dinner, Snacks)
- Track calories, protein, carbs, fats

### 📦 Custom Foods
- Save reusable food entries
- Auto-populate fields

### 🎯 Nutrition Profile
- User onboarding flow
- Automatic macro calculation

### 📈 Admin Dashboard
- User tracking and activity insights
- Profile completion monitoring
- System usage metrics

---

## 💡 Key Design Decisions

### 🔹 Secure-by-default backend
All requests require authenticated users and are validated server-side.

### 🔹 Per-user data isolation
PartitionKey = authenticated user ID ensures strict data separation.

### 🔹 Cost-optimized architecture
- Uses Azure Free-tier services
- Key Vault + Managed Identity implemented without premium services

### 🔹 Separation of concerns
- Frontend: UI/UX
- Backend: security + business logic
- Azure services: identity + storage + secrets

---

## ⚠️ Notes on Architecture

Due to Azure Static Web Apps Free tier design:

- The frontend is tightly integrated with managed APIs
- A secure backend architecture using Managed Identity and Key Vault has been implemented and validated independently
- The production design demonstrates how secrets and access would be secured in a real-world deployment

---

## 🧪 Local Development

```bash
cd api
npm install
func start
