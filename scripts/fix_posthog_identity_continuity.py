from pathlib import Path

path = Path("scos-analytics.js")
s = path.read_text(encoding="utf-8")

old = """  window.scosCapture = function (name, props) {
    const eventProperties = Object.assign({}, attribution, { path: location.pathname, funnel: funnelId() }, props || {});
    delete eventProperties.email;
    delete eventProperties.purchaser_email;
    delete eventProperties.session_id;
    try { window.posthog.capture(name, eventProperties, { transport: 'sendBeacon', send_instantly: true }); } catch (_) {}
  };
  window.scosAttribution = attribution;

  function captureBeforeNavigation(name, props) {
    const properties = Object.assign({}, attribution, { path: location.pathname, funnel: funnelId(), '$process_person_profile': false }, props || {});
    const payload = JSON.stringify({ api_key: TOKEN, distinct_id: anonymousId, event: name, properties });
    try {
      if (navigator.sendBeacon(HOST + '/i/v0/e/', new Blob([payload], { type: 'application/json' }))) return;
    } catch (_) {}
    window.scosCapture(name, props);
  }
"""

new = """  function sendEvent(name, props) {
    const properties = Object.assign({}, attribution, {
      path: location.pathname,
      funnel: funnelId(),
      '$process_person_profile': false
    }, props || {});
    delete properties.email;
    delete properties.purchaser_email;
    delete properties.session_id;
    const payload = JSON.stringify({ api_key: TOKEN, distinct_id: anonymousId, event: name, properties });
    try {
      if (navigator.sendBeacon(HOST + '/i/v0/e/', new Blob([payload], { type: 'application/json' }))) return true;
    } catch (_) {}
    try {
      fetch(HOST + '/i/v0/e/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
        mode: 'cors'
      });
      return true;
    } catch (_) { return false; }
  }

  window.scosCapture = function (name, props) {
    sendEvent(name, props);
  };
  window.scosAttribution = attribution;

  function captureBeforeNavigation(name, props) {
    sendEvent(name, props);
  }
"""

if new in s:
    print("identity continuity fix already applied")
elif old not in s:
    raise SystemExit("target analytics block not found; aborting without changes")
else:
    s = s.replace(old, new, 1)
    path.write_text(s, encoding="utf-8")
    print("patched scos-analytics.js")

updated = path.read_text(encoding="utf-8")
assert "function sendEvent(name, props)" in updated
assert "distinct_id: anonymousId" in updated
assert "window.posthog.capture(name" not in updated
assert updated.count("distinct_id: anonymousId") == 1
print("identity continuity verification passed")
