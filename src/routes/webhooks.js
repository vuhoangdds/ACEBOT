import express from 'express';
import { sendDM, sendChannel } from '../services/discordService.js';
import config from '../config.js';

const router = express.Router();

router.post('/send_dm', async (req, res) => {
  const { userId, content } = req.body;
  if (!userId || !content) 
    return res.status(400).json({ success: false, error: 'Missing userId or content' });
  try {
    await sendDM(req.app.get('discordClient'), userId, content);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/send_channel', async (req, res) => {
  const { channelId, content } = req.body;
  if (!channelId || !content) 
    return res.status(400).json({ success: false, error: 'Missing channelId or content' });
  try {
    await sendChannel(req.app.get('discordClient'), channelId, content);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// thêm webhook /donWebhook nếu cần…

export default router;
