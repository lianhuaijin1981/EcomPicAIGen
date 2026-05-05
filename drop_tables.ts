import mysql from 'mysql2/promise';
async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL || '');
  await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
  await conn.execute('DROP TABLE IF EXISTS generation_results');
  await conn.execute('DROP TABLE IF EXISTS generation_tasks');
  await conn.execute('DROP TABLE IF EXISTS algorithms');
  await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
  console.log('All tables dropped');
  await conn.end();
}
main().catch(e => { console.error(e); process.exit(1); });
