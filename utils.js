const { randomBytes } = require('crypto');

function nanoid(size = 8) {
  return randomBytes(size).toString('base64url').slice(0, size);
}

module.exports = { nanoid };
