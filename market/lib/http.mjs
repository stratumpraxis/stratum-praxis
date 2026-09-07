// Outbound HTTP.
//
// Node's built-in fetch does not read HTTPS_PROXY on its own. In any environment
// that reaches the internet through an egress proxy - CI runners and sandboxes both
// do - a plain fetch() comes back with a proxy denial that looks exactly like an
// upstream 401 or 403. That misdiagnosis is expensive: it sends you hunting for a
// credential problem that does not exist. It cost a cycle here before this file
// existed, which is why the proxy is handled once, in one place.
//
// Node 22 can do this itself with NODE_USE_ENV_PROXY=1, but that is read at process
// start, so a library cannot turn it on for a caller who forgot. Rather than depend
// on how the process was launched, this establishes the CONNECT tunnel directly. No
// npm dependency, and it behaves the same whether it is run from a CLI, a test, or
// GitHub Actions.

import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import { URL } from 'node:url';

export function proxyUrl() {
  return process.env.HTTPS_PROXY || process.env.https_proxy
    || process.env.HTTP_PROXY || process.env.http_proxy || null;
}

export function proxyConfigured() {
  return Boolean(proxyUrl());
}

function bypassesProxy(hostname) {
  const noProxy = process.env.NO_PROXY || process.env.no_proxy || '';
  if (!noProxy) return false;
  return noProxy.split(',').map((s) => s.trim()).filter(Boolean).some((entry) => {
    if (entry === '*') return true;
    const bare = entry.startsWith('.') ? entry.slice(1) : entry;
    return hostname === bare || hostname.endsWith(`.${bare}`);
  });
}

/** Open a TLS socket to `target` through an HTTP CONNECT proxy. */
function connectThroughProxy(proxy, targetHost, targetPort) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: proxy.hostname,
      port: proxy.port || 80,
      method: 'CONNECT',
      path: `${targetHost}:${targetPort}`,
      headers: { Host: `${targetHost}:${targetPort}` },
      ...(proxy.username
        ? { headers: {
            Host: `${targetHost}:${targetPort}`,
            'Proxy-Authorization': `Basic ${Buffer.from(`${proxy.username}:${proxy.password}`).toString('base64')}`
          } }
        : {})
    });

    req.once('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy();
        const err = new Error(`proxy refused CONNECT ${targetHost}:${targetPort} with ${res.statusCode}`);
        // Surfaced as its own class: a proxy denial is an environment/policy fact,
        // never an upstream authentication failure.
        err.status = res.statusCode;
        err.failure_class = 'PERMANENT';
        err.proxy_denied = true;
        return reject(err);
      }
      resolve(tls.connect({ socket, servername: targetHost }));
    });

    req.once('error', reject);
    req.end();
  });
}

function readBody(res) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    res.on('error', reject);
  });
}

/**
 * fetch that respects the environment's egress proxy.
 *
 * Returns a minimal Response-shaped object (ok / status / text() / json()) so
 * adapters can treat it exactly like a fetch result. Falls through to global fetch
 * when no proxy is configured, or when the host is excluded by NO_PROXY.
 */
export async function proxyFetch(url, options = {}) {
  const proxy = proxyUrl();
  const target = new URL(url);

  if (!proxy || target.protocol !== 'https:' || bypassesProxy(target.hostname)) {
    return fetch(url, options);
  }

  const socket = await connectThroughProxy(new URL(proxy), target.hostname, target.port || 443);

  return new Promise((resolve, reject) => {
    const req = https.request({
      createConnection: () => socket,
      method: options.method ?? 'GET',
      host: target.hostname,
      path: `${target.pathname}${target.search}`,
      headers: { Host: target.hostname, ...(options.headers ?? {}) }
    }, async (res) => {
      try {
        const body = await readBody(res);
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          headers: res.headers,
          text: async () => body,
          json: async () => JSON.parse(body)
        });
      } catch (err) { reject(err); }
    });

    req.once('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}
