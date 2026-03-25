const crypto = require('crypto');
const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { requireAuthenticatedUser } = require('../shared/requireAuthenticatedUser');

app.http('createEntry', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'createEntry',
  handler: async (request, context) => {
    context.log('createEntry called');

    const authResult = requireAuthenticatedUser(request);

    if (!authResult.ok) {
      context.log.warn('createEntry unauthorized');
      return authResult.response;
    }

    const authUser = authResult.authUser;

    let body;

    try {
      body = await request.json();
    } catch {
      context.log.warn('createEntry invalid JSON body', {
        userKey: authUser.userKey
      });

      return {
        status: 400,
        jsonBody: { error: 'Request body must be valid JSON.' }
      };
    }

    const {
      date,
      mealType,
      foodName,
      calories,
      protein,
      carbs,
      fats,
      notes
    } = body;

    if (!mealType || !foodName || calories === undefined || calories === null) {
      context.log.warn('createEntry missing required fields', {
        userKey: authUser.userKey,
        hasMealType: !!mealType,
        hasFoodName: !!foodName,
        hasCalories: calories !== undefined && calories !== null
      });

      return {
        status: 400,
        jsonBody: { error: 'mealType, foodName, and calories are required.' }
      };
    }

    const entryDate = date || new Date().toISOString().split('T')[0];
    const connectionString = process.env.STORAGE_CONNECTION_STRING;
    const tableName = process.env.TABLE_NAME || 'foodentries';

    context.log('createEntry authenticated', {
      userKey: authUser.userKey,
      tableName,
      entryDate,
      mealType
    });

    if (!connectionString) {
      context.log.error('createEntry missing storage connection string', {
        userKey: authUser.userKey,
        tableName
      });

      return {
        status: 500,
        jsonBody: { error: 'STORAGE_CONNECTION_STRING is missing.' }
      };
    }

    let client;

    try {
      client = TableClient.fromConnectionString(connectionString, tableName);
      context.log('createEntry storage client created', {
        userKey: authUser.userKey,
        tableName
      });
    } catch (error) {
      context.log.error('createEntry failed to create storage client', {
        userKey: authUser.userKey,
        tableName,
        error: error?.message || String(error)
      });

      return {
        status: 500,
        jsonBody: { error: 'Failed to create storage client.' }
      };
    }

    const entity = {
      partitionKey: authUser.userKey,
      rowKey: crypto.randomUUID(),
      userId: authUser.userId || authUser.userDetails,
      userDetails: authUser.userDetails,
      date: entryDate,
      mealType,
      foodName,
      calories: Number(calories),
      protein: protein !== null && protein !== undefined ? Number(protein) : null,
      carbs: carbs !== null && carbs !== undefined ? Number(carbs) : null,
      fats: fats !== null && fats !== undefined ? Number(fats) : null,
      notes: notes ?? '',
      createdAt: new Date().toISOString()
    };

    try {
      await client.createEntity(entity);

      context.log('createEntry success', {
        userKey: authUser.userKey,
        tableName,
        entryId: entity.rowKey,
        entryDate,
        mealType
      });

      return {
        status: 201,
        jsonBody: {
          message: 'Entry created successfully.',
          entry: {
            id: entity.rowKey,
            date: entity.date,
            mealType: entity.mealType,
            foodName: entity.foodName,
            calories: entity.calories,
            protein: entity.protein,
            carbs: entity.carbs,
            fats: entity.fats,
            notes: entity.notes,
            createdAt: entity.createdAt
          }
        }
      };
    } catch (error) {
      context.log.error('createEntry failed', {
        userKey: authUser.userKey,
        tableName,
        entryDate,
        mealType,
        error: error?.message || String(error)
      });

      return {
        status: 500,
        jsonBody: { error: 'Failed to create entry.' }
      };
    }
  }
});