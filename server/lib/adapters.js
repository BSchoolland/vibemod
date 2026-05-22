import fs from 'fs/promises';
import path from 'path';

const adapters = {
  'vite-react': {
    name: 'Vite + React',
    detect: (pkg, files) => pkg.devDependencies?.vite && (pkg.dependencies?.react || pkg.devDependencies?.react),
    install: 'npm install',
    build: 'npm run build',
    dev: 'npm run dev',
    start: 'npm run start',
    startFile: null,
  },

  'next': {
    name: 'Next.js',
    detect: (pkg) => pkg.dependencies?.next || pkg.devDependencies?.next,
    install: 'npm install',
    build: 'npm run build',
    dev: 'npm run dev',
    start: 'npm run start',
    startFile: null,
  },

  'node-express': {
    name: 'Node.js + Express',
    detect: (pkg, files) => pkg.dependencies?.express && !pkg.dependencies?.next,
    install: 'npm install',
    build: pkg => pkg.scripts?.build ? 'npm run build' : null,
    dev: pkg => pkg.scripts?.dev ? 'npm run dev' : 'node server.js',
    start: 'npm start',
    startFile: null,
  },

  'static': {
    name: 'Static HTML',
    detect: (_pkg, files) => files.includes('index.html'),
    install: null,
    build: null,
    dev: null,
    start: null,
    startFile: 'index.html',
  },
};

export async function detectAdapter(appDir) {
  let pkg = {};
  let files = [];

  try {
    const raw = await fs.readFile(path.join(appDir, 'package.json'), 'utf-8');
    pkg = JSON.parse(raw);
  } catch {}

  try {
    files = await fs.readdir(appDir);
  } catch {}

  for (const [id, adapter] of Object.entries(adapters)) {
    if (adapter.detect(pkg, files)) {
      return { id, ...resolveAdapter(adapter, pkg) };
    }
  }

  if (files.includes('index.html')) {
    return { id: 'static', ...resolveAdapter(adapters.static, pkg) };
  }

  return null;
}

function resolveAdapter(adapter, pkg) {
  return {
    name: adapter.name,
    install: typeof adapter.install === 'function' ? adapter.install(pkg) : adapter.install,
    build: typeof adapter.build === 'function' ? adapter.build(pkg) : adapter.build,
    dev: typeof adapter.dev === 'function' ? adapter.dev(pkg) : adapter.dev,
    start: typeof adapter.start === 'function' ? adapter.start(pkg) : adapter.start,
    startFile: adapter.startFile,
  };
}

export function getAdapterById(id) {
  return adapters[id] || null;
}
