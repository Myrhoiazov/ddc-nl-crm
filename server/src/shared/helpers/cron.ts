import cron from 'node-cron';
// import { recalculateLoyalty } from '../../services/recalculateLoyalty';

// Каждый день в 2:00 ночи
cron.schedule('0 2 * * *', async () => {
  console.log('[Cron] Starting loyalty recalculation...');

//   const clients = await Client.findAll({ attributes: ['id'] });

//   for (const client of clients) {
//     // await recalculateLoyalty(client.id);
//   }

  console.log('[Cron] Loyalty recalculation complete.');
});