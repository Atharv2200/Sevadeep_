// Escapes user text so it matches literally inside a RegExp (no operators, no ReDoS).
module.exports = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
