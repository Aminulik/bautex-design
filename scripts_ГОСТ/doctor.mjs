import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), '..');
const smokeOnly = process.argv.includes('--smoke');

const checks = [];

function addCheck(name, ok, details = '') {
  checks.push({ name, ok, details });
}

async function checkUrl(name, url, required = true) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    addCheck(name, response.ok, `${response.status} ${url}`);
  } catch (error) {
    addCheck(name, !required, `${url} unavailable: ${error.message}`);
  }
}

function checkFile(name, relativePath, required = true) {
  const target = path.join(rootDir, relativePath);
  addCheck(name, fs.existsSync(target) || !required, relativePath);
}

function countImages(relativePath) {
  const target = path.join(rootDir, relativePath);
  if (!fs.existsSync(target)) return 0;
  return fs
    .readdirSync(target)
    .filter((file) => /\.(jpe?g|png|webp)$/i.test(file)).length;
}

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port, timeout: 1500 });
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => resolve(false));
  });
}

async function main() {
  await checkUrl('Frontend', 'http://localhost:3001', false);
  await checkUrl('Backend health', 'http://localhost:3003/health', false);
  await checkUrl('Visualization status', 'http://localhost:3003/api/visualize/status', false);
  await checkUrl('ML health', 'http://localhost:8000/health', false);
  await checkUrl('ML metrics API', 'http://localhost:3003/api/ml/metrics', false);

  if (!smokeOnly) {
    checkFile('Root package.json', 'package.json');
    checkFile('Backend package.json', 'server/package.json');
    checkFile('Backend env file', 'server/.env', false);
    checkFile('Backend env template', 'server/.env.example');
    checkFile('Docker Compose', 'docker-compose.yml');
    checkFile('Demo script', 'DEMO.md');

    const images = countImages('test_data/segmentation/images');
    const masks = countImages('test_data/segmentation/masks_gt');
    addCheck('ML test images', images > 0, `${images} file(s) in test_data/segmentation/images`);
    addCheck('ML ground-truth masks', masks > 0, `${masks} file(s) in test_data/segmentation/masks_gt`);
    addCheck('ML dataset pairs', images > 0 && images === masks, `${images} image(s), ${masks} mask(s)`);

    for (const port of [3001, 3003, 8000]) {
      const busy = await checkPort(port);
      addCheck(`Port ${port}`, busy, busy ? 'service is listening' : 'not listening');
    }
  }

  const failed = checks.filter((check) => !check.ok);
  for (const check of checks) {
    const mark = check.ok ? 'OK' : 'FAIL';
    console.log(`[${mark}] ${check.name}${check.details ? ` - ${check.details}` : ''}`);
  }

  if (failed.length > 0) {
    console.log('');
    console.log(`${failed.length} check(s) need attention.`);
    process.exitCode = 1;
  } else {
    console.log('');
    console.log('All checks passed.');
  }
}

await main();
