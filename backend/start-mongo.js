const { MongoMemoryServer } = require('mongodb-memory-server');

async function start() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  console.log(uri);
  // Keep process alive
  process.on('SIGINT', async () => {
    await mongod.stop();
    process.exit(0);
  });
}

start().catch(console.error);
