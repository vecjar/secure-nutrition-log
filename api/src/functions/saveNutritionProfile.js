const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");

function getUserId(req) {
  const principal = req.headers.get("x-ms-client-principal");

  if (!principal) return null;

  const decoded = JSON.parse(
    Buffer.from(principal, "base64").toString("utf-8")
  );

  return decoded.userId || null;
}

app.http("saveNutritionProfile", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (req, context) => {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return {
          status: 401,
          jsonBody: { error: "Unauthorized" }
        };
      }

      const connectionString = process.env.STORAGE_CONNECTION_STRING;
      const tableName = process.env.NUTRITION_PROFILES_TABLE_NAME || "NutritionProfiles";

      if (!connectionString) {
        context.log("Missing STORAGE_CONNECTION_STRING");
        return {
          status: 500,
          jsonBody: { error: "Missing storage connection string" }
        };
      }

      const body = await req.json();

      const tableClient = TableClient.fromConnectionString(
        connectionString,
        tableName
      );

      await tableClient.createTable().catch(() => {});

      await tableClient.upsertEntity({
        partitionKey: "PROFILE",
        rowKey: userId,
        data: JSON.stringify(body)
      });

      return {
        status: 200,
        jsonBody: { success: true }
      };
    } catch (error) {
      context.log("saveNutritionProfile failed", error);

      return {
        status: 500,
        jsonBody: { error: "Failed to save profile" }
      };
    }
  }
});