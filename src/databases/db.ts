import mongoose, { Connection } from 'mongoose';
import config from '../config/config';

let dbConnection: Connection | null = null;

/**
 * Connect to MongoDB database
 */
export const connectDatabase = async (): Promise<Connection> => {
  if (dbConnection) {
    console.log('Using existing database connection');
    return dbConnection;
  }

  try {
    console.log('⏳ Connecting to MongoDB...');
    
    const mongooseConnection = await mongoose.connect(config.database.mongodb.uri, {
      ...config.database.mongodb.options,
    });

    dbConnection = mongooseConnection.connection;

    console.log('Connected successfully');
    console.log(`  Database: ${mongooseConnection.connection.name}`);
    console.log(`  Host: ${mongooseConnection.connection.host}`);

    return dbConnection;
  } catch (error) {
    console.error('Failed to connect:', error);
    throw error;
  }
};

/**
 * Disconnect from MongoDB database
 */
export const disconnectDatabase = async (): Promise<void> => {
  if (!dbConnection) {
    return;
  }

  try {
    console.log('Disconnecting ...');
    await mongoose.disconnect();
    dbConnection = null;
    console.log('Dsconnected successfully');
  } catch (error) {
    console.error('Failed to disconnect:', error);
    throw error;
  }
};

/**
 * Get current database connection
 */
export const getDatabase = (): Connection => {
  if (!dbConnection) {
    throw new Error('Database connection not established. Call connectDatabase first.');
  }
  return dbConnection;
};

/**
 * Check database connection status
 */
export const isDatabaseConnected = (): boolean => {
  return dbConnection !== null && mongoose.connection.readyState === 1;
};

export default {
  connectDatabase,
  disconnectDatabase,
  getDatabase,
  isDatabaseConnected,
};
