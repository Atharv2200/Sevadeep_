const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { uploadDir } = require('../config/env');

// Local-disk file storage, kept behind this one module so it can later be
// replaced with object storage (S3 and friends) without the Contribution API or
// business logic changing: callers only ever deal in opaque keys.

function keyPath(key) {
  // `key` is always one this module generated (see save()), so it never contains
  // path separators or traversal sequences.
  return path.join(uploadDir, key);
}

// A random, unguessable key; the original filename is never used as a path.
function randomKey(ext) {
  return `${crypto.randomBytes(24).toString('hex')}${ext}`;
}

async function save(buffer, ext) {
  await fs.mkdir(uploadDir, { recursive: true });
  const key = randomKey(ext);
  await fs.writeFile(keyPath(key), buffer);
  return key;
}

function read(key) {
  return fs.readFile(keyPath(key));
}

async function remove(key) {
  await fs.rm(keyPath(key), { force: true });
}

module.exports = { save, read, remove };
