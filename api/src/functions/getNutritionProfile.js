const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");

function getUserId(req) {
  const principal = req.headers["x-ms-client-principal"];

  if (!principal) return null;

  const decoded = JSON.parse(Buffer.from(principal, "base64").toString("utf-8"));
  return decoded.userId;
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

      const tableClient = TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        "NutritionProfiles"
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
        // Not found = first-time user
        return {
          status: 200,
          jsonBody: { profile: null }
        };
      }
    } catch (error) {
      context.log(error);

      return {
        status: 500,
        jsonBody: { error: "Failed to get profile" }
      };
    }
  }
});