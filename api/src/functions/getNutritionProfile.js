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

app.http("getNutritionProfile", {
  methods: ["GET"],
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

      const tableClient = TableClient.fromConnectionString(
        connectionString,
        tableName
      );

      try {
        const entity = await tableClient.getEntity("PROFILE", userId);

        return {
          status: 200,
          jsonBody: {
            profile: JSON.parse(entity.data)
          }
        };
      } catch (err) {
        if (err.statusCode === 404) {
          return {
            status: 200,
            jsonBody: { profile: null }
          };
        }

        context.log("Error reading nutrition profile", err);

        return {
          status: 500,
          jsonBody: { error: "Failed to read nutrition profile" }
        };
      }
    } catch (error) {
      context.log("getNutritionProfile failed", error);

      return {
        status: 500,
        jsonBody: { error: "Failed to get profile" }
      };
    }
  }
});