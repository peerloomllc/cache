import { webcrypto } from 'crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;

import * as nostrPure from 'nostr-tools/pure';
import * as nip19mod from 'nostr-tools/nip19';
import { Relay, useWebSocketImplementation } from 'nostr-tools/relay';
import WebSocket from 'ws';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

useWebSocketImplementation(WebSocket);

const { getPublicKey, finalizeEvent } = nostrPure;
const nip19 = nip19mod;

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(resolve(__dirname, '.env'), 'utf8');
const nsec = envFile.match(/NOSTR_NSEC=(\S+)/)?.[1];
if (!nsec) { console.error('NOSTR_NSEC not found in .env'); process.exit(1); }

const { type, data: sk } = nip19.decode(nsec);
if (type !== 'nsec') { console.error('Invalid nsec'); process.exit(1); }

const pk = getPublicKey(sk);
const npub = nip19.npubEncode(pk);
console.log('Public key (npub):', npub);
console.log('Public key (hex):', pk);

const discoveryRelays = [
  'wss://purplepag.es',
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.primal.net',
];

async function queryRelayList(relayUrl, pubkey) {
  try {
    const relay = await Relay.connect(relayUrl);
    return new Promise((res) => {
      const timeout = setTimeout(() => { relay.close(); res([]); }, 5000);
      relay.subscribe(
        [{ kinds: [10002], authors: [pubkey], limit: 1 }],
        {
          onevent(event) {
            clearTimeout(timeout);
            const relays = event.tags
              .filter(t => t[0] === 'r')
              .map(t => ({ url: t[1], mode: t[2] || 'read+write' }));
            relay.close();
            res(relays);
          },
          oneose() {
            clearTimeout(timeout);
            relay.close();
            res([]);
          }
        }
      );
    });
  } catch (e) {
    return [];
  }
}

console.log('\nLooking up relay list (NIP-65)...');
let userRelays = [];
for (const dr of discoveryRelays) {
  const result = await queryRelayList(dr, pk);
  if (result.length > 0) {
    userRelays = result;
    console.log(`Found relay list on ${dr}:`);
    result.forEach(r => console.log(`  ${r.url} (${r.mode})`));
    break;
  }
}

if (userRelays.length === 0) {
  console.log('No NIP-65 relay list found. Using default relays.');
  userRelays = discoveryRelays.map(u => ({ url: u, mode: 'read+write' }));
}

const content = process.argv[2];
if (!content) { console.error('Usage: node nostr-post.mjs "post content"'); process.exit(1); }

const writeRelays = userRelays.filter(r => r.mode.includes('write') || r.mode === 'read+write');
const relayUrls = writeRelays.map(r => r.url);
if (relayUrls.length === 0) {
  relayUrls.push(...userRelays.map(r => r.url));
}

const event = finalizeEvent({
  kind: 1,
  created_at: Math.floor(Date.now() / 1000),
  tags: [
    ['t', 'bitcoin'],
    ['t', 'opensource'],
    ['t', 'privacy'],
    ['t', 'personalfinance'],
    ['t', 'foss'],
  ],
  content,
}, sk);

console.log('\nSigned event:', JSON.stringify(event, null, 2));
console.log('\nPublishing to write relays...');

const publishToRelay = async (url) => {
  try {
    const relay = await Promise.race([
      Relay.connect(url),
      new Promise((_, rej) => setTimeout(() => rej(new Error('connect timeout')), 8000))
    ]);
    await Promise.race([
      relay.publish(event),
      new Promise((_, rej) => setTimeout(() => rej(new Error('publish timeout')), 8000))
    ]);
    console.log(`  Published to ${url}`);
    relay.close();
  } catch (e) {
    console.log(`  Failed on ${url}: ${e.message}`);
  }
};

await Promise.all(relayUrls.map(publishToRelay));

console.log('\nDone!');
process.exit(0);
