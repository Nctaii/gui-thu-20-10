/* Versioned, UTF-8 links: no account or browser storage required. */
const GreetingLink = (() => {
  const limits = { recipient: 60, message: 1500, sender: 60 };
  function validate(value) {
    if (!value || !Object.entries(limits).every(([key, max]) =>
      typeof value[key] === 'string' && value[key].trim() && value[key].length <= max)) {
      throw new Error('Invalid greeting');
    }
    return Object.fromEntries(Object.keys(limits).map(key => [key, value[key].trim()]));
  }
  function encode(value) {
    const bytes = new TextEncoder().encode(JSON.stringify(validate(value)));
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(hash) {
    if (!hash || hash === '#') return null;
    if (!hash.startsWith('#card=') || hash.length > 16000) throw new Error('Invalid link');
    const encoded = hash.slice(6).replace(/-/g, '+').replace(/_/g, '/');
    return validate(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(
      Uint8Array.from(atob(encoded), char => char.charCodeAt(0)))));
  }
  function url(base, value) {
    const result = new URL(base);
    result.hash = 'card=' + encode(value);
    return result.href;
  }
  return { encode, decode, url };
})();
if (typeof module !== 'undefined') module.exports = GreetingLink;
