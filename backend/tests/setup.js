const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const uri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/devflow_test';

exports.connect = () => mongoose.connect(uri);

exports.clearDb = async () => {
  const { collections } = mongoose.connection;
  for (const name of Object.keys(collections)) {
    await collections[name].deleteMany({});
  }
};

exports.disconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
};
