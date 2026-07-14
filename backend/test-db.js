import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const SRV_URI = `mongodb+srv://heartisans_admin:UTYH2f8BqjD5HG2f@cluster0.efjikoc.mongodb.net/test?retryWrites=true&w=majority`;
const DIRECT_URI_A = `mongodb://heartisans_admin:UTYH2f8BqjD5HG2f@ac-pnmfumq-shard-00-00.efjikoc.mongodb.net:27017/test?ssl=true&replicaSet=atlas-13rxjk-shard-0&authSource=admin`;
const DIRECT_URI_B = `mongodb://heartisans_admin:UTYH2f8BqjD5HG2f@ac-pnmfumq-shard-00-00.efjikoc.mongodb.net:27017/test?ssl=true&authSource=admin&directConnection=true`;
const DIRECT_URI_C = `mongodb://heartisans_admin:UTYH2f8BqjD5HG2f@ac-pnmfumq-shard-00-00.efjikoc.mongodb.net:27017,ac-pnmfumq-shard-00-01.efjikoc.mongodb.net:27017,ac-pnmfumq-shard-00-02.efjikoc.mongodb.net:27017/test?tls=true&authSource=admin`;

async function test(label, uri) {
  console.log(`\n🔍 Testing: ${label}`);
  try {
    const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 10000 }).asPromise();
    console.log(`✅ SUCCESS with ${label}`);
    await conn.close();
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
  }
}

(async () => {
  await test('SRV (original)', SRV_URI);
  await test('Direct + replicaSet name', DIRECT_URI_A);
  await test('Direct + directConnection=true', DIRECT_URI_B);
  await test('Direct + tls=true (no replicaSet)', DIRECT_URI_C);
  console.log('\nDone.');
  process.exit(0);
})();
