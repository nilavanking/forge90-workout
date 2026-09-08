/* Forge90 Phase 1 local-first storage
   IndexedDB is the primary store through Dexie. Existing localStorage data is
   imported automatically and retained as a non-destructive rollback mirror.
*/
(() => {
  'use strict';

  const DATABASE_NAME = 'forge90_local_v1';
  const DATABASE_VERSION = 1;
  const MIRROR_META_KEY = 'forge90_indexeddb_mirror_meta_v1';
  const OWNED_KEY = key => key === 'forge90.v1' || key.startsWith('forge90_');
  const memory = new Map();
  let database = null;
  let mode = 'starting';
  let writeChain = Promise.resolve();

  const parseJson = (value, fallback) => {
    try { return value ? JSON.parse(value) : fallback; }
    catch (_) { return fallback; }
  };

  const mirrorGet = key => {
    try { return localStorage.getItem(key); }
    catch (_) { return null; }
  };

  const readMirrorMeta = () => parseJson(mirrorGet(MIRROR_META_KEY), {});

  const writeMirror = (key, value, updatedAt) => {
    try {
      localStorage.setItem(key, value);
      const meta = readMirrorMeta();
      meta[key] = updatedAt;
      localStorage.setItem(MIRROR_META_KEY, JSON.stringify(meta));
    } catch (error) {
      console.warn(`[Forge90] Safety mirror write failed for ${key}.`, error);
    }
  };

  const removeMirror = (key, updatedAt) => {
    try {
      localStorage.removeItem(key);
      const meta = readMirrorMeta();
      meta[key] = updatedAt;
      localStorage.setItem(MIRROR_META_KEY, JSON.stringify(meta));
    } catch (error) {
      console.warn(`[Forge90] Safety mirror delete failed for ${key}.`, error);
    }
  };

  function collectLegacyRecords() {
    try {
      const meta = readMirrorMeta();
      const records = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key || key === MIRROR_META_KEY || !OWNED_KEY(key)) continue;
        records.push({
          key,
          value: localStorage.getItem(key),
          updatedAt: Number(meta[key]) || 0,
          deleted: false
        });
      }
      return records;
    } catch (error) {
      console.warn('[Forge90] Existing safety mirror could not be read.', error);
      return [];
    }
  }

  async function initialiseDatabase() {
    if (!window.Dexie) throw new Error('Dexie did not load');

    database = new window.Dexie(DATABASE_NAME);
    database.version(DATABASE_VERSION).stores({
      records: '&key, updatedAt, deleted',
      migrations: '&name, completedAt'
    });
    await database.open();

    const [storedRecords, legacyRecords] = await Promise.all([
      database.records.toArray(),
      Promise.resolve(collectLegacyRecords())
    ]);
    const storedByKey = new Map(storedRecords.map(record => [record.key, record]));
    const imports = [];

    for (const legacy of legacyRecords) {
      const stored = storedByKey.get(legacy.key);
      if (!stored || legacy.updatedAt > Number(stored.updatedAt || 0)) {
        const record = {...legacy, updatedAt: legacy.updatedAt || Date.now()};
        storedByKey.set(record.key, record);
        imports.push(record);
      }
    }

    if (imports.length) await database.records.bulkPut(imports);

    for (const record of storedByKey.values()) {
      if (record.deleted) {
        memory.delete(record.key);
        removeMirror(record.key, Number(record.updatedAt) || Date.now());
      } else {
        memory.set(record.key, record.value);
        writeMirror(record.key, record.value, Number(record.updatedAt) || Date.now());
      }
    }

    await database.migrations.put({
      name: 'localStorage-to-indexedDB-v1',
      completedAt: new Date().toISOString(),
      importedKeys: imports.map(record => record.key)
    });
    mode = 'indexeddb';
  }

  async function init() {
    if (mode === 'indexeddb' || mode === 'localstorage-fallback') return mode;
    try {
      await initialiseDatabase();
    } catch (error) {
      console.warn('[Forge90] IndexedDB unavailable; using the safety mirror.', error);
      collectLegacyRecords().forEach(record => memory.set(record.key, record.value));
      mode = 'localstorage-fallback';
    }
    window.dispatchEvent(new CustomEvent('forge90-storage-ready', {detail: {mode}}));
    return mode;
  }

  function getItem(key) {
    return memory.has(key) ? memory.get(key) : null;
  }

  function setItem(key, value) {
    if (!OWNED_KEY(key)) throw new Error(`Forge90 storage rejected unowned key: ${key}`);
    const text = String(value);
    const updatedAt = Date.now();
    memory.set(key, text);
    writeMirror(key, text, updatedAt);
    if (database) {
      writeChain = writeChain
        .then(() => database.records.put({key, value: text, updatedAt, deleted: false}))
        .catch(error => console.error(`[Forge90] IndexedDB write failed for ${key}.`, error));
    }
  }

  function removeItem(key) {
    if (!OWNED_KEY(key)) throw new Error(`Forge90 storage rejected unowned key: ${key}`);
    const updatedAt = Date.now();
    memory.delete(key);
    removeMirror(key, updatedAt);
    if (database) {
      writeChain = writeChain
        .then(() => database.records.put({key, value: null, updatedAt, deleted: true}))
        .catch(error => console.error(`[Forge90] IndexedDB delete failed for ${key}.`, error));
    }
  }

  async function flush() {
    await writeChain;
  }

  window.Forge90Storage = Object.freeze({
    init,
    getItem,
    setItem,
    removeItem,
    flush,
    getMode: () => mode,
    getDatabaseName: () => DATABASE_NAME
  });
})();
