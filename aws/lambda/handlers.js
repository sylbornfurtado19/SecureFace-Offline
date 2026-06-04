'use strict';

const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.attendanceHandler = async (event) => {
  try {
    const { userId, userName, employeeId, timestamp, confidence } = JSON.parse(event.body);

    if (!userId || !employeeId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const record = {
      userId,
      timestamp: timestamp || Date.now(),
      id: `${userId}#${timestamp}`,
      userName,
      employeeId,
      confidence,
    };

    await dynamodb.put({
      TableName: 'attendance',
      Item: record,
    }).promise();

    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, data: record }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

exports.embeddingHandler = async (event) => {
  try {
    const { userId, embedding, timestamp } = JSON.parse(event.body);

    if (!userId || !embedding) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const embeddingRecord = {
      userId,
      id: `${userId}#${Date.now()}`,
      embedding, // Already encrypted
      timestamp: timestamp || Date.now(),
    };

    await dynamodb.put({
      TableName: 'embeddings',
      Item: embeddingRecord,
    }).promise();

    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, data: { id: embeddingRecord.id } }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
