import AWS from 'aws-sdk';

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export class DynamoDBService {
  async putAttendanceRecord(record: any): Promise<void> {
    const params = {
      TableName: process.env.ATTENDANCE_TABLE || 'attendance',
      Item: {
        ...record,
        expiresAt: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90 days TTL
      },
    };

    try {
      await dynamodb.put(params).promise();
    } catch (error) {
      throw new Error(`Failed to put attendance record: ${error}`);
    }
  }

  async getAttendanceRecords(userId: string): Promise<any[]> {
    const params = {
      TableName: process.env.ATTENDANCE_TABLE || 'attendance',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    };

    try {
      const result = await dynamodb.query(params).promise();
      return result.Items || [];
    } catch (error) {
      throw new Error(`Failed to get attendance records: ${error}`);
    }
  }

  async putEmbedding(embedding: any): Promise<void> {
    const params = {
      TableName: process.env.EMBEDDINGS_TABLE || 'embeddings',
      Item: {
        ...embedding,
        expiresAt: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year TTL
      },
    };

    try {
      await dynamodb.put(params).promise();
    } catch (error) {
      throw new Error(`Failed to put embedding: ${error}`);
    }
  }

  async getEmbeddings(userId: string): Promise<any[]> {
    const params = {
      TableName: process.env.EMBEDDINGS_TABLE || 'embeddings',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    };

    try {
      const result = await dynamodb.query(params).promise();
      return result.Items || [];
    } catch (error) {
      throw new Error(`Failed to get embeddings: ${error}`);
    }
  }

  async putAuditLog(log: any): Promise<void> {
    const params = {
      TableName: process.env.AUDIT_LOG_TABLE || 'audit_logs',
      Item: {
        ...log,
        expiresAt: Math.floor(Date.now() / 1000) + 180 * 24 * 60 * 60, // 180 days TTL
      },
    };

    try {
      await dynamodb.put(params).promise();
    } catch (error) {
      throw new Error(`Failed to put audit log: ${error}`);
    }
  }

  async registerDevice(deviceId: string, info: any): Promise<void> {
    const params = {
      TableName: process.env.DEVICES_TABLE || 'devices',
      Item: {
        deviceId,
        info,
        registeredAt: Date.now(),
        verified: true,
      },
    };

    try {
      await dynamodb.put(params).promise();
    } catch (error) {
      throw new Error(`Failed to register device: ${error}`);
    }
  }

  async verifyDevice(deviceId: string): Promise<boolean> {
    const params = {
      TableName: process.env.DEVICES_TABLE || 'devices',
      Key: {
        deviceId,
      },
    };

    try {
      const result = await dynamodb.get(params).promise();
      return result.Item ? result.Item.verified === true : false;
    } catch (error) {
      return false;
    }
  }
}

export default new DynamoDBService();
