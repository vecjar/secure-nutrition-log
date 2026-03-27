const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");

function getUserId(req) {
  const principal = req.headers["x-ms-client-principal"];

  if (!principal) return null;

  const decoded = JSON.parse(Buffer.from(principal, "base64").toString("utf-8"));
  return decoded.userId;
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

      const body = await req.json();

      const tableClient = TableClient.fromConnectionString(
        process.env.STORAGE_CONNECTION_STRING,
        "NutritionProfiles"
      );

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
      context.log(error);

      return {
        status: 500,
        jsonBody: { error: "Failed to save profile" }
      };
    }
  }
});