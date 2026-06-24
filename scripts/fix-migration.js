const { Client } = require('pg');

async function fix() {
  const client = new Client(process.env.DATABASE_URL);
  try {
    await client.connect();
    await client.query(`DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260624100000_add_pixel_model'`);
    console.log('Fixed: removed stuck migration entry');
  } catch (e) {
    console.log('Fix not needed or failed:', e.message);
  } finally {
    await client.end();
  }
}
fix();
