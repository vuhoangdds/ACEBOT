import express from 'express';
import nacl from 'tweetnacl';
import config from '../config.js';
import * as cmdPing from '../commands/ping.js';
import * as cmdAce from '../commands/ace.js';
import * as cmdMa from '../commands/ma.js';
import * as cmdDuyet from '../commands/duyet.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const sig = req.get('X-Signature-Ed25519');
  const ts = req.get('X-Signature-Timestamp');
  if (!nacl.sign.detached.verify(
    Buffer.from(ts + req.rawBody),
    Buffer.from(sig, 'hex'),
    Buffer.from(config.DISCORD.PUBLIC_KEY, 'hex')
  )) return res.status(401).send('Invalid signature');

  const interaction = req.body;
  if (interaction.type === 1) return res.send({ type: 1 });
  if (interaction.type !== 2) return res.sendStatus(204);

  const { name } = interaction.data;
  let result;
  switch (name) {
    case cmdPing.ping.name:
      result = await cmdPing.ping.execute(interaction);
      break;
    case cmdAce.ace.name:
      result = await cmdAce.ace.execute(interaction);
      break;
    case cmdMa.ma.name:
      result = await cmdMa.ma.execute(interaction);
      break;
    case 'duyet':
    case 'tuchoi':
      result = await cmdDuyet.duyet.execute(interaction);
      break;
    default:
      result = { content: '❓ Unknown command' };
  }

  return res.json({ type: 4, data: result });
});

export default router;
