function Jx(e, n) {
  for (var o = 0; o < n.length; o++) {
    const i = n[o];
    if (typeof i != "string" && !Array.isArray(i)) {
      for (const a in i)
        if (a !== "default" && !(a in e)) {
          const d = Object.getOwnPropertyDescriptor(i, a);
          d && Object.defineProperty(e, a, d.get ? d : {
            enumerable: !0,
            get: () => i[a]
          });
        }
    }
  }
  return Object.freeze(Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }));
}
function e1(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function jg(e) {
  const n = String(e || "").toLowerCase();
  return n === "127.0.0.1" || n === "localhost" || n === "::1" || n === "[::1]";
}
function yh(e) {
  return jg(e) || e1(e);
}
function t1(e) {
  return !e || jg(e) ? "127.0.0.1" : e;
}
const n1 = (() => {
  var p, m, y, S;
  const { protocol: e, hostname: n, port: o } = window.location, i = String(window.SYNAPSE_BACKEND_PORT || ((m = (p = document.body) == null ? void 0 : p.dataset) == null ? void 0 : m.apiPort) || "8001").trim(), a = `http://${t1(n)}:${i || "8001"}`, d = String(window.SYNAPSE_API_BASE || ((S = (y = document.body) == null ? void 0 : y.dataset) == null ? void 0 : S.apiBase) || "").replace(/\/+$/, ""), f = `${e}//${window.location.host}`.replace(/\/+$/, "");
  return d && !(yh(n) && o !== i && d === f) ? d : e === "file:" || yh(n) && o !== i ? a : `${e}//${window.location.host}`;
})();
class Xr extends Error {
  constructor(n, { cause: o, code: i } = {}) {
    super(n), this.name = "ApiConnectionError", this.cause = o, this.code = i || "connection_error";
  }
}
const gh = "synapse.client.id.v1";
function $n() {
  return globalThis.window || globalThis;
}
function Zr(e, n = 220) {
  return String(e || "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
}
function vh() {
  const e = globalThis.crypto || $n().crypto;
  return e != null && e.randomUUID ? e.randomUUID() : `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
function r1() {
  var n, o;
  const e = $n();
  try {
    const i = (n = e.localStorage) == null ? void 0 : n.getItem(gh);
    if (i) return i;
    const a = vh();
    return (o = e.localStorage) == null || o.setItem(gh, a), a;
  } catch {
    return vh();
  }
}
function o1(e = {}) {
  if (typeof Headers < "u" && e instanceof Headers) {
    const n = {};
    return e.forEach((o, i) => {
      n[i] = o;
    }), n;
  }
  return Array.isArray(e) ? Object.fromEntries(e) : { ...e || {} };
}
class Ig {
  constructor(n, { fetchImpl: o } = {}) {
    var a, d;
    const i = $n();
    this.baseUrl = String(n || "").replace(/\/+$/, ""), this.fetchImpl = o || ((a = i.fetch) == null ? void 0 : a.bind(i)) || ((d = globalThis.fetch) == null ? void 0 : d.bind(globalThis));
  }
  endpoint(n) {
    const o = String(n || "").replace(/^\/+/, "");
    return `${this.baseUrl}/${o}`;
  }
  timeoutMessage(n) {
    return `Synapse backend did not respond within ${Math.max(1, Math.round(Number(n || 0) / 1e3))} seconds. Try a smaller source set or increase window.SYNAPSE_ANALYSIS_TIMEOUT_MS.`;
  }
  isLocalBackend() {
    try {
      const n = new URL(this.baseUrl).hostname.toLowerCase();
      return n === "localhost" || n === "127.0.0.1" || n === "0.0.0.0";
    } catch {
      return !0;
    }
  }
  connectionMessage() {
    return this.isLocalBackend() ? [
      `Cannot reach the Synapse backend at ${this.baseUrl}.`,
      "Start the local stack with `bash scripts/start_local_stack.sh`, or run `.venv/bin/python run_backend.py` manually, then try again."
    ].join(" ") : [
      `Synapse could not reach its hosted service at ${this.baseUrl}.`,
      "The service may be waking up. Wait a moment and retry; if this keeps happening, contact Synapse support."
    ].join(" ");
  }
  analysisInterruptedMessage() {
    return [
      "Synapse lost the connection while analysing your materials.",
      "This is usually a temporary hosted-service interruption, not missing files.",
      "Click Retry — your uploaded files and links are kept in this browser when possible."
    ].join(" ");
  }
  async requestHeaders(n = {}) {
    var d, f, p;
    const o = $n(), i = o1(n);
    i["X-Synapse-Client-Id"] = Zr(r1(), 160);
    const a = (f = (d = o.SynapseAuth) == null ? void 0 : d.getStoredSession) == null ? void 0 : f.call(d);
    if (a && typeof a == "object" && (a.accountId && (i["X-Synapse-User-Id"] = Zr(a.accountId, 160)), a.email && (i["X-Synapse-User-Email"] = Zr(a.email, 220)), a.displayName && (i["X-Synapse-User-Name"] = Zr(a.displayName, 180)), a.authMode && (i["X-Synapse-Auth-Mode"] = Zr(a.authMode, 60)), a.role && (i["X-Synapse-User-Role"] = Zr(a.role, 80))), (p = o.SynapseAuth) != null && p.authHeaders && !i.Authorization && !i.authorization)
      try {
        const m = await o.SynapseAuth.authHeaders({});
        m != null && m.Authorization && (i.Authorization = m.Authorization), m != null && m.authorization && (i.authorization = m.authorization);
      } catch (m) {
        console.warn("Synapse auth headers were not attached:", m);
      }
    return i;
  }
  async fetch(n, o = {}) {
    var l;
    const i = this.endpoint(n), { timeoutMs: a, ...d } = o || {};
    d.headers = await this.requestHeaders(d.headers || {});
    const f = Number(a || 0);
    let p = null, m = null, y = null;
    const S = d.signal;
    f > 0 && typeof AbortController < "u" && (p = new AbortController(), y = () => p.abort(), S && (S.aborted ? p.abort() : S.addEventListener("abort", y, { once: !0 })), m = $n().setTimeout(() => p.abort(), f), d.signal = p.signal);
    try {
      return await this.fetchImpl(i, d);
    } catch (c) {
      throw (l = p == null ? void 0 : p.signal) != null && l.aborted && !(S != null && S.aborted) ? new Xr(this.timeoutMessage(f), {
        cause: c,
        code: "timeout"
      }) : S != null && S.aborted ? new Xr("Analysis was cancelled.", {
        cause: c,
        code: "cancelled"
      }) : new Xr(this.connectionMessage(), {
        cause: c,
        code: "unreachable"
      });
    } finally {
      m && $n().clearTimeout(m), S && y && S.removeEventListener("abort", y);
    }
  }
  async warmup({ attempts: n = 2, retryDelayMs: o = 1500, timeoutMs: i = 6e4, maxWaitMs: a = 0, signal: d } = {}) {
    const f = Math.max(1, Math.floor(Number(n) || 1)), p = Math.max(0, Number(a) || 0), m = Date.now();
    let y = null;
    for (let S = 0; S < f; S += 1) {
      const l = Date.now() - m, c = p > 0 ? p - l : 0;
      if (p > 0 && c <= 0) break;
      try {
        const g = await this.fetch("/healthz", {
          method: "GET",
          signal: d,
          timeoutMs: p > 0 ? Math.min(i, c) : i
        });
        if (g != null && g.ok) return g;
        y = new Xr(
          `Synapse hosted service returned ${(g == null ? void 0 : g.status) || "an unexpected status"} while preparing your analysis.`,
          { code: "warmup_status" }
        );
      } catch (g) {
        y = g;
      }
      if (S < f - 1 && o > 0) {
        const g = p > 0 ? p - (Date.now() - m) : o;
        if (p > 0 && g <= 0) break;
        await new Promise((x) => $n().setTimeout(x, Math.min(o, g)));
      }
    }
    throw y || new Xr(this.connectionMessage(), { code: "warmup_failed" });
  }
  isRetryableResponse(n) {
    return [502, 503, 504].includes(Number(n == null ? void 0 : n.status));
  }
  isRetryableConnectionError(n) {
    return !(!(n instanceof Xr) || n.code === "cancelled" || n.code === "timeout");
  }
  async fetchWithRetry(n, o = {}, {
    attempts: i = 3,
    retryDelayMs: a = 3e3,
    retryOnConnectionError: d = !0,
    onRetry: f
  } = {}) {
    const p = Math.max(1, Math.floor(Number(i) || 1));
    let m = null, y = null;
    for (let S = 0; S < p; S += 1) {
      try {
        const l = typeof o == "function" ? o(S) : o;
        if (m = await this.fetch(n, l), !this.isRetryableResponse(m) || S === p - 1) return m;
        f == null || f({
          attempt: S + 1,
          totalAttempts: p,
          reason: `HTTP ${m.status}`
        });
      } catch (l) {
        if (y = l, !(d && this.isRetryableConnectionError(l) && S < p - 1)) throw l;
        f == null || f({
          attempt: S + 1,
          totalAttempts: p,
          reason: (l == null ? void 0 : l.code) || "connection_error"
        });
      }
      a > 0 && await new Promise((l) => $n().setTimeout(l, a));
    }
    if (y) throw y;
    return m;
  }
}
var ti = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Fg(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var Ju = { exports: {} }, pe = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Sh;
function i1() {
  if (Sh) return pe;
  Sh = 1;
  var e = Symbol.for("react.element"), n = Symbol.for("react.portal"), o = Symbol.for("react.fragment"), i = Symbol.for("react.strict_mode"), a = Symbol.for("react.profiler"), d = Symbol.for("react.provider"), f = Symbol.for("react.context"), p = Symbol.for("react.forward_ref"), m = Symbol.for("react.suspense"), y = Symbol.for("react.memo"), S = Symbol.for("react.lazy"), l = Symbol.iterator;
  function c(N) {
    return N === null || typeof N != "object" ? null : (N = l && N[l] || N["@@iterator"], typeof N == "function" ? N : null);
  }
  var g = { isMounted: function() {
    return !1;
  }, enqueueForceUpdate: function() {
  }, enqueueReplaceState: function() {
  }, enqueueSetState: function() {
  } }, x = Object.assign, _ = {};
  function A(N, z, le) {
    this.props = N, this.context = z, this.refs = _, this.updater = le || g;
  }
  A.prototype.isReactComponent = {}, A.prototype.setState = function(N, z) {
    if (typeof N != "object" && typeof N != "function" && N != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
    this.updater.enqueueSetState(this, N, z, "setState");
  }, A.prototype.forceUpdate = function(N) {
    this.updater.enqueueForceUpdate(this, N, "forceUpdate");
  };
  function T() {
  }
  T.prototype = A.prototype;
  function b(N, z, le) {
    this.props = N, this.context = z, this.refs = _, this.updater = le || g;
  }
  var E = b.prototype = new T();
  E.constructor = b, x(E, A.prototype), E.isPureReactComponent = !0;
  var D = Array.isArray, L = Object.prototype.hasOwnProperty, G = { current: null }, W = { key: !0, ref: !0, __self: !0, __source: !0 };
  function H(N, z, le) {
    var de, ve = {}, Se = null, Pe = null;
    if (z != null) for (de in z.ref !== void 0 && (Pe = z.ref), z.key !== void 0 && (Se = "" + z.key), z) L.call(z, de) && !W.hasOwnProperty(de) && (ve[de] = z[de]);
    var xe = arguments.length - 2;
    if (xe === 1) ve.children = le;
    else if (1 < xe) {
      for (var Ne = Array(xe), St = 0; St < xe; St++) Ne[St] = arguments[St + 2];
      ve.children = Ne;
    }
    if (N && N.defaultProps) for (de in xe = N.defaultProps, xe) ve[de] === void 0 && (ve[de] = xe[de]);
    return { $$typeof: e, type: N, key: Se, ref: Pe, props: ve, _owner: G.current };
  }
  function V(N, z) {
    return { $$typeof: e, type: N.type, key: z, ref: N.ref, props: N.props, _owner: N._owner };
  }
  function X(N) {
    return typeof N == "object" && N !== null && N.$$typeof === e;
  }
  function J(N) {
    var z = { "=": "=0", ":": "=2" };
    return "$" + N.replace(/[=:]/g, function(le) {
      return z[le];
    });
  }
  var ce = /\/+/g;
  function me(N, z) {
    return typeof N == "object" && N !== null && N.key != null ? J("" + N.key) : z.toString(36);
  }
  function fe(N, z, le, de, ve) {
    var Se = typeof N;
    (Se === "undefined" || Se === "boolean") && (N = null);
    var Pe = !1;
    if (N === null) Pe = !0;
    else switch (Se) {
      case "string":
      case "number":
        Pe = !0;
        break;
      case "object":
        switch (N.$$typeof) {
          case e:
          case n:
            Pe = !0;
        }
    }
    if (Pe) return Pe = N, ve = ve(Pe), N = de === "" ? "." + me(Pe, 0) : de, D(ve) ? (le = "", N != null && (le = N.replace(ce, "$&/") + "/"), fe(ve, z, le, "", function(St) {
      return St;
    })) : ve != null && (X(ve) && (ve = V(ve, le + (!ve.key || Pe && Pe.key === ve.key ? "" : ("" + ve.key).replace(ce, "$&/") + "/") + N)), z.push(ve)), 1;
    if (Pe = 0, de = de === "" ? "." : de + ":", D(N)) for (var xe = 0; xe < N.length; xe++) {
      Se = N[xe];
      var Ne = de + me(Se, xe);
      Pe += fe(Se, z, le, Ne, ve);
    }
    else if (Ne = c(N), typeof Ne == "function") for (N = Ne.call(N), xe = 0; !(Se = N.next()).done; ) Se = Se.value, Ne = de + me(Se, xe++), Pe += fe(Se, z, le, Ne, ve);
    else if (Se === "object") throw z = String(N), Error("Objects are not valid as a React child (found: " + (z === "[object Object]" ? "object with keys {" + Object.keys(N).join(", ") + "}" : z) + "). If you meant to render a collection of children, use an array instead.");
    return Pe;
  }
  function ye(N, z, le) {
    if (N == null) return N;
    var de = [], ve = 0;
    return fe(N, de, "", "", function(Se) {
      return z.call(le, Se, ve++);
    }), de;
  }
  function ae(N) {
    if (N._status === -1) {
      var z = N._result;
      z = z(), z.then(function(le) {
        (N._status === 0 || N._status === -1) && (N._status = 1, N._result = le);
      }, function(le) {
        (N._status === 0 || N._status === -1) && (N._status = 2, N._result = le);
      }), N._status === -1 && (N._status = 0, N._result = z);
    }
    if (N._status === 1) return N._result.default;
    throw N._result;
  }
  var he = { current: null }, O = { transition: null }, Z = { ReactCurrentDispatcher: he, ReactCurrentBatchConfig: O, ReactCurrentOwner: G };
  function Q() {
    throw Error("act(...) is not supported in production builds of React.");
  }
  return pe.Children = { map: ye, forEach: function(N, z, le) {
    ye(N, function() {
      z.apply(this, arguments);
    }, le);
  }, count: function(N) {
    var z = 0;
    return ye(N, function() {
      z++;
    }), z;
  }, toArray: function(N) {
    return ye(N, function(z) {
      return z;
    }) || [];
  }, only: function(N) {
    if (!X(N)) throw Error("React.Children.only expected to receive a single React element child.");
    return N;
  } }, pe.Component = A, pe.Fragment = o, pe.Profiler = a, pe.PureComponent = b, pe.StrictMode = i, pe.Suspense = m, pe.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Z, pe.act = Q, pe.cloneElement = function(N, z, le) {
    if (N == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + N + ".");
    var de = x({}, N.props), ve = N.key, Se = N.ref, Pe = N._owner;
    if (z != null) {
      if (z.ref !== void 0 && (Se = z.ref, Pe = G.current), z.key !== void 0 && (ve = "" + z.key), N.type && N.type.defaultProps) var xe = N.type.defaultProps;
      for (Ne in z) L.call(z, Ne) && !W.hasOwnProperty(Ne) && (de[Ne] = z[Ne] === void 0 && xe !== void 0 ? xe[Ne] : z[Ne]);
    }
    var Ne = arguments.length - 2;
    if (Ne === 1) de.children = le;
    else if (1 < Ne) {
      xe = Array(Ne);
      for (var St = 0; St < Ne; St++) xe[St] = arguments[St + 2];
      de.children = xe;
    }
    return { $$typeof: e, type: N.type, key: ve, ref: Se, props: de, _owner: Pe };
  }, pe.createContext = function(N) {
    return N = { $$typeof: f, _currentValue: N, _currentValue2: N, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, N.Provider = { $$typeof: d, _context: N }, N.Consumer = N;
  }, pe.createElement = H, pe.createFactory = function(N) {
    var z = H.bind(null, N);
    return z.type = N, z;
  }, pe.createRef = function() {
    return { current: null };
  }, pe.forwardRef = function(N) {
    return { $$typeof: p, render: N };
  }, pe.isValidElement = X, pe.lazy = function(N) {
    return { $$typeof: S, _payload: { _status: -1, _result: N }, _init: ae };
  }, pe.memo = function(N, z) {
    return { $$typeof: y, type: N, compare: z === void 0 ? null : z };
  }, pe.startTransition = function(N) {
    var z = O.transition;
    O.transition = {};
    try {
      N();
    } finally {
      O.transition = z;
    }
  }, pe.unstable_act = Q, pe.useCallback = function(N, z) {
    return he.current.useCallback(N, z);
  }, pe.useContext = function(N) {
    return he.current.useContext(N);
  }, pe.useDebugValue = function() {
  }, pe.useDeferredValue = function(N) {
    return he.current.useDeferredValue(N);
  }, pe.useEffect = function(N, z) {
    return he.current.useEffect(N, z);
  }, pe.useId = function() {
    return he.current.useId();
  }, pe.useImperativeHandle = function(N, z, le) {
    return he.current.useImperativeHandle(N, z, le);
  }, pe.useInsertionEffect = function(N, z) {
    return he.current.useInsertionEffect(N, z);
  }, pe.useLayoutEffect = function(N, z) {
    return he.current.useLayoutEffect(N, z);
  }, pe.useMemo = function(N, z) {
    return he.current.useMemo(N, z);
  }, pe.useReducer = function(N, z, le) {
    return he.current.useReducer(N, z, le);
  }, pe.useRef = function(N) {
    return he.current.useRef(N);
  }, pe.useState = function(N) {
    return he.current.useState(N);
  }, pe.useSyncExternalStore = function(N, z, le) {
    return he.current.useSyncExternalStore(N, z, le);
  }, pe.useTransition = function() {
    return he.current.useTransition();
  }, pe.version = "18.3.1", pe;
}
var wh;
function Td() {
  return wh || (wh = 1, Ju.exports = i1()), Ju.exports;
}
var C = Td();
const yn = /* @__PURE__ */ Fg(C), kd = /* @__PURE__ */ Jx({
  __proto__: null,
  default: yn
}, [C]);
var Us = {}, ec = { exports: {} }, ht = {}, tc = { exports: {} }, nc = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var xh;
function s1() {
  return xh || (xh = 1, (function(e) {
    function n(O, Z) {
      var Q = O.length;
      O.push(Z);
      e: for (; 0 < Q; ) {
        var N = Q - 1 >>> 1, z = O[N];
        if (0 < a(z, Z)) O[N] = Z, O[Q] = z, Q = N;
        else break e;
      }
    }
    function o(O) {
      return O.length === 0 ? null : O[0];
    }
    function i(O) {
      if (O.length === 0) return null;
      var Z = O[0], Q = O.pop();
      if (Q !== Z) {
        O[0] = Q;
        e: for (var N = 0, z = O.length, le = z >>> 1; N < le; ) {
          var de = 2 * (N + 1) - 1, ve = O[de], Se = de + 1, Pe = O[Se];
          if (0 > a(ve, Q)) Se < z && 0 > a(Pe, ve) ? (O[N] = Pe, O[Se] = Q, N = Se) : (O[N] = ve, O[de] = Q, N = de);
          else if (Se < z && 0 > a(Pe, Q)) O[N] = Pe, O[Se] = Q, N = Se;
          else break e;
        }
      }
      return Z;
    }
    function a(O, Z) {
      var Q = O.sortIndex - Z.sortIndex;
      return Q !== 0 ? Q : O.id - Z.id;
    }
    if (typeof performance == "object" && typeof performance.now == "function") {
      var d = performance;
      e.unstable_now = function() {
        return d.now();
      };
    } else {
      var f = Date, p = f.now();
      e.unstable_now = function() {
        return f.now() - p;
      };
    }
    var m = [], y = [], S = 1, l = null, c = 3, g = !1, x = !1, _ = !1, A = typeof setTimeout == "function" ? setTimeout : null, T = typeof clearTimeout == "function" ? clearTimeout : null, b = typeof setImmediate < "u" ? setImmediate : null;
    typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
    function E(O) {
      for (var Z = o(y); Z !== null; ) {
        if (Z.callback === null) i(y);
        else if (Z.startTime <= O) i(y), Z.sortIndex = Z.expirationTime, n(m, Z);
        else break;
        Z = o(y);
      }
    }
    function D(O) {
      if (_ = !1, E(O), !x) if (o(m) !== null) x = !0, ae(L);
      else {
        var Z = o(y);
        Z !== null && he(D, Z.startTime - O);
      }
    }
    function L(O, Z) {
      x = !1, _ && (_ = !1, T(H), H = -1), g = !0;
      var Q = c;
      try {
        for (E(Z), l = o(m); l !== null && (!(l.expirationTime > Z) || O && !J()); ) {
          var N = l.callback;
          if (typeof N == "function") {
            l.callback = null, c = l.priorityLevel;
            var z = N(l.expirationTime <= Z);
            Z = e.unstable_now(), typeof z == "function" ? l.callback = z : l === o(m) && i(m), E(Z);
          } else i(m);
          l = o(m);
        }
        if (l !== null) var le = !0;
        else {
          var de = o(y);
          de !== null && he(D, de.startTime - Z), le = !1;
        }
        return le;
      } finally {
        l = null, c = Q, g = !1;
      }
    }
    var G = !1, W = null, H = -1, V = 5, X = -1;
    function J() {
      return !(e.unstable_now() - X < V);
    }
    function ce() {
      if (W !== null) {
        var O = e.unstable_now();
        X = O;
        var Z = !0;
        try {
          Z = W(!0, O);
        } finally {
          Z ? me() : (G = !1, W = null);
        }
      } else G = !1;
    }
    var me;
    if (typeof b == "function") me = function() {
      b(ce);
    };
    else if (typeof MessageChannel < "u") {
      var fe = new MessageChannel(), ye = fe.port2;
      fe.port1.onmessage = ce, me = function() {
        ye.postMessage(null);
      };
    } else me = function() {
      A(ce, 0);
    };
    function ae(O) {
      W = O, G || (G = !0, me());
    }
    function he(O, Z) {
      H = A(function() {
        O(e.unstable_now());
      }, Z);
    }
    e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(O) {
      O.callback = null;
    }, e.unstable_continueExecution = function() {
      x || g || (x = !0, ae(L));
    }, e.unstable_forceFrameRate = function(O) {
      0 > O || 125 < O ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : V = 0 < O ? Math.floor(1e3 / O) : 5;
    }, e.unstable_getCurrentPriorityLevel = function() {
      return c;
    }, e.unstable_getFirstCallbackNode = function() {
      return o(m);
    }, e.unstable_next = function(O) {
      switch (c) {
        case 1:
        case 2:
        case 3:
          var Z = 3;
          break;
        default:
          Z = c;
      }
      var Q = c;
      c = Z;
      try {
        return O();
      } finally {
        c = Q;
      }
    }, e.unstable_pauseExecution = function() {
    }, e.unstable_requestPaint = function() {
    }, e.unstable_runWithPriority = function(O, Z) {
      switch (O) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          O = 3;
      }
      var Q = c;
      c = O;
      try {
        return Z();
      } finally {
        c = Q;
      }
    }, e.unstable_scheduleCallback = function(O, Z, Q) {
      var N = e.unstable_now();
      switch (typeof Q == "object" && Q !== null ? (Q = Q.delay, Q = typeof Q == "number" && 0 < Q ? N + Q : N) : Q = N, O) {
        case 1:
          var z = -1;
          break;
        case 2:
          z = 250;
          break;
        case 5:
          z = 1073741823;
          break;
        case 4:
          z = 1e4;
          break;
        default:
          z = 5e3;
      }
      return z = Q + z, O = { id: S++, callback: Z, priorityLevel: O, startTime: Q, expirationTime: z, sortIndex: -1 }, Q > N ? (O.sortIndex = Q, n(y, O), o(m) === null && O === o(y) && (_ ? (T(H), H = -1) : _ = !0, he(D, Q - N))) : (O.sortIndex = z, n(m, O), x || g || (x = !0, ae(L))), O;
    }, e.unstable_shouldYield = J, e.unstable_wrapCallback = function(O) {
      var Z = c;
      return function() {
        var Q = c;
        c = Z;
        try {
          return O.apply(this, arguments);
        } finally {
          c = Q;
        }
      };
    };
  })(nc)), nc;
}
var _h;
function a1() {
  return _h || (_h = 1, tc.exports = s1()), tc.exports;
}
/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Th;
function l1() {
  if (Th) return ht;
  Th = 1;
  var e = Td(), n = a1();
  function o(t) {
    for (var r = "https://reactjs.org/docs/error-decoder.html?invariant=" + t, s = 1; s < arguments.length; s++) r += "&args[]=" + encodeURIComponent(arguments[s]);
    return "Minified React error #" + t + "; visit " + r + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  var i = /* @__PURE__ */ new Set(), a = {};
  function d(t, r) {
    f(t, r), f(t + "Capture", r);
  }
  function f(t, r) {
    for (a[t] = r, t = 0; t < r.length; t++) i.add(r[t]);
  }
  var p = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), m = Object.prototype.hasOwnProperty, y = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, S = {}, l = {};
  function c(t) {
    return m.call(l, t) ? !0 : m.call(S, t) ? !1 : y.test(t) ? l[t] = !0 : (S[t] = !0, !1);
  }
  function g(t, r, s, u) {
    if (s !== null && s.type === 0) return !1;
    switch (typeof r) {
      case "function":
      case "symbol":
        return !0;
      case "boolean":
        return u ? !1 : s !== null ? !s.acceptsBooleans : (t = t.toLowerCase().slice(0, 5), t !== "data-" && t !== "aria-");
      default:
        return !1;
    }
  }
  function x(t, r, s, u) {
    if (r === null || typeof r > "u" || g(t, r, s, u)) return !0;
    if (u) return !1;
    if (s !== null) switch (s.type) {
      case 3:
        return !r;
      case 4:
        return r === !1;
      case 5:
        return isNaN(r);
      case 6:
        return isNaN(r) || 1 > r;
    }
    return !1;
  }
  function _(t, r, s, u, h, v, k) {
    this.acceptsBooleans = r === 2 || r === 3 || r === 4, this.attributeName = u, this.attributeNamespace = h, this.mustUseProperty = s, this.propertyName = t, this.type = r, this.sanitizeURL = v, this.removeEmptyString = k;
  }
  var A = {};
  "children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(t) {
    A[t] = new _(t, 0, !1, t, null, !1, !1);
  }), [["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(t) {
    var r = t[0];
    A[r] = new _(r, 1, !1, t[1], null, !1, !1);
  }), ["contentEditable", "draggable", "spellCheck", "value"].forEach(function(t) {
    A[t] = new _(t, 2, !1, t.toLowerCase(), null, !1, !1);
  }), ["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(t) {
    A[t] = new _(t, 2, !1, t, null, !1, !1);
  }), "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(t) {
    A[t] = new _(t, 3, !1, t.toLowerCase(), null, !1, !1);
  }), ["checked", "multiple", "muted", "selected"].forEach(function(t) {
    A[t] = new _(t, 3, !0, t, null, !1, !1);
  }), ["capture", "download"].forEach(function(t) {
    A[t] = new _(t, 4, !1, t, null, !1, !1);
  }), ["cols", "rows", "size", "span"].forEach(function(t) {
    A[t] = new _(t, 6, !1, t, null, !1, !1);
  }), ["rowSpan", "start"].forEach(function(t) {
    A[t] = new _(t, 5, !1, t.toLowerCase(), null, !1, !1);
  });
  var T = /[\-:]([a-z])/g;
  function b(t) {
    return t[1].toUpperCase();
  }
  "accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(t) {
    var r = t.replace(
      T,
      b
    );
    A[r] = new _(r, 1, !1, t, null, !1, !1);
  }), "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(t) {
    var r = t.replace(T, b);
    A[r] = new _(r, 1, !1, t, "http://www.w3.org/1999/xlink", !1, !1);
  }), ["xml:base", "xml:lang", "xml:space"].forEach(function(t) {
    var r = t.replace(T, b);
    A[r] = new _(r, 1, !1, t, "http://www.w3.org/XML/1998/namespace", !1, !1);
  }), ["tabIndex", "crossOrigin"].forEach(function(t) {
    A[t] = new _(t, 1, !1, t.toLowerCase(), null, !1, !1);
  }), A.xlinkHref = new _("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1), ["src", "href", "action", "formAction"].forEach(function(t) {
    A[t] = new _(t, 1, !1, t.toLowerCase(), null, !0, !0);
  });
  function E(t, r, s, u) {
    var h = A.hasOwnProperty(r) ? A[r] : null;
    (h !== null ? h.type !== 0 : u || !(2 < r.length) || r[0] !== "o" && r[0] !== "O" || r[1] !== "n" && r[1] !== "N") && (x(r, s, h, u) && (s = null), u || h === null ? c(r) && (s === null ? t.removeAttribute(r) : t.setAttribute(r, "" + s)) : h.mustUseProperty ? t[h.propertyName] = s === null ? h.type === 3 ? !1 : "" : s : (r = h.attributeName, u = h.attributeNamespace, s === null ? t.removeAttribute(r) : (h = h.type, s = h === 3 || h === 4 && s === !0 ? "" : "" + s, u ? t.setAttributeNS(u, r, s) : t.setAttribute(r, s))));
  }
  var D = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, L = Symbol.for("react.element"), G = Symbol.for("react.portal"), W = Symbol.for("react.fragment"), H = Symbol.for("react.strict_mode"), V = Symbol.for("react.profiler"), X = Symbol.for("react.provider"), J = Symbol.for("react.context"), ce = Symbol.for("react.forward_ref"), me = Symbol.for("react.suspense"), fe = Symbol.for("react.suspense_list"), ye = Symbol.for("react.memo"), ae = Symbol.for("react.lazy"), he = Symbol.for("react.offscreen"), O = Symbol.iterator;
  function Z(t) {
    return t === null || typeof t != "object" ? null : (t = O && t[O] || t["@@iterator"], typeof t == "function" ? t : null);
  }
  var Q = Object.assign, N;
  function z(t) {
    if (N === void 0) try {
      throw Error();
    } catch (s) {
      var r = s.stack.trim().match(/\n( *(at )?)/);
      N = r && r[1] || "";
    }
    return `
` + N + t;
  }
  var le = !1;
  function de(t, r) {
    if (!t || le) return "";
    le = !0;
    var s = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      if (r) if (r = function() {
        throw Error();
      }, Object.defineProperty(r.prototype, "props", { set: function() {
        throw Error();
      } }), typeof Reflect == "object" && Reflect.construct) {
        try {
          Reflect.construct(r, []);
        } catch (F) {
          var u = F;
        }
        Reflect.construct(t, [], r);
      } else {
        try {
          r.call();
        } catch (F) {
          u = F;
        }
        t.call(r.prototype);
      }
      else {
        try {
          throw Error();
        } catch (F) {
          u = F;
        }
        t();
      }
    } catch (F) {
      if (F && u && typeof F.stack == "string") {
        for (var h = F.stack.split(`
`), v = u.stack.split(`
`), k = h.length - 1, P = v.length - 1; 1 <= k && 0 <= P && h[k] !== v[P]; ) P--;
        for (; 1 <= k && 0 <= P; k--, P--) if (h[k] !== v[P]) {
          if (k !== 1 || P !== 1)
            do
              if (k--, P--, 0 > P || h[k] !== v[P]) {
                var M = `
` + h[k].replace(" at new ", " at ");
                return t.displayName && M.includes("<anonymous>") && (M = M.replace("<anonymous>", t.displayName)), M;
              }
            while (1 <= k && 0 <= P);
          break;
        }
      }
    } finally {
      le = !1, Error.prepareStackTrace = s;
    }
    return (t = t ? t.displayName || t.name : "") ? z(t) : "";
  }
  function ve(t) {
    switch (t.tag) {
      case 5:
        return z(t.type);
      case 16:
        return z("Lazy");
      case 13:
        return z("Suspense");
      case 19:
        return z("SuspenseList");
      case 0:
      case 2:
      case 15:
        return t = de(t.type, !1), t;
      case 11:
        return t = de(t.type.render, !1), t;
      case 1:
        return t = de(t.type, !0), t;
      default:
        return "";
    }
  }
  function Se(t) {
    if (t == null) return null;
    if (typeof t == "function") return t.displayName || t.name || null;
    if (typeof t == "string") return t;
    switch (t) {
      case W:
        return "Fragment";
      case G:
        return "Portal";
      case V:
        return "Profiler";
      case H:
        return "StrictMode";
      case me:
        return "Suspense";
      case fe:
        return "SuspenseList";
    }
    if (typeof t == "object") switch (t.$$typeof) {
      case J:
        return (t.displayName || "Context") + ".Consumer";
      case X:
        return (t._context.displayName || "Context") + ".Provider";
      case ce:
        var r = t.render;
        return t = t.displayName, t || (t = r.displayName || r.name || "", t = t !== "" ? "ForwardRef(" + t + ")" : "ForwardRef"), t;
      case ye:
        return r = t.displayName || null, r !== null ? r : Se(t.type) || "Memo";
      case ae:
        r = t._payload, t = t._init;
        try {
          return Se(t(r));
        } catch {
        }
    }
    return null;
  }
  function Pe(t) {
    var r = t.type;
    switch (t.tag) {
      case 24:
        return "Cache";
      case 9:
        return (r.displayName || "Context") + ".Consumer";
      case 10:
        return (r._context.displayName || "Context") + ".Provider";
      case 18:
        return "DehydratedFragment";
      case 11:
        return t = r.render, t = t.displayName || t.name || "", r.displayName || (t !== "" ? "ForwardRef(" + t + ")" : "ForwardRef");
      case 7:
        return "Fragment";
      case 5:
        return r;
      case 4:
        return "Portal";
      case 3:
        return "Root";
      case 6:
        return "Text";
      case 16:
        return Se(r);
      case 8:
        return r === H ? "StrictMode" : "Mode";
      case 22:
        return "Offscreen";
      case 12:
        return "Profiler";
      case 21:
        return "Scope";
      case 13:
        return "Suspense";
      case 19:
        return "SuspenseList";
      case 25:
        return "TracingMarker";
      case 1:
      case 0:
      case 17:
      case 2:
      case 14:
      case 15:
        if (typeof r == "function") return r.displayName || r.name || null;
        if (typeof r == "string") return r;
    }
    return null;
  }
  function xe(t) {
    switch (typeof t) {
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return t;
      case "object":
        return t;
      default:
        return "";
    }
  }
  function Ne(t) {
    var r = t.type;
    return (t = t.nodeName) && t.toLowerCase() === "input" && (r === "checkbox" || r === "radio");
  }
  function St(t) {
    var r = Ne(t) ? "checked" : "value", s = Object.getOwnPropertyDescriptor(t.constructor.prototype, r), u = "" + t[r];
    if (!t.hasOwnProperty(r) && typeof s < "u" && typeof s.get == "function" && typeof s.set == "function") {
      var h = s.get, v = s.set;
      return Object.defineProperty(t, r, { configurable: !0, get: function() {
        return h.call(this);
      }, set: function(k) {
        u = "" + k, v.call(this, k);
      } }), Object.defineProperty(t, r, { enumerable: s.enumerable }), { getValue: function() {
        return u;
      }, setValue: function(k) {
        u = "" + k;
      }, stopTracking: function() {
        t._valueTracker = null, delete t[r];
      } };
    }
  }
  function Di(t) {
    t._valueTracker || (t._valueTracker = St(t));
  }
  function _f(t) {
    if (!t) return !1;
    var r = t._valueTracker;
    if (!r) return !0;
    var s = r.getValue(), u = "";
    return t && (u = Ne(t) ? t.checked ? "true" : "false" : t.value), t = u, t !== s ? (r.setValue(t), !0) : !1;
  }
  function ji(t) {
    if (t = t || (typeof document < "u" ? document : void 0), typeof t > "u") return null;
    try {
      return t.activeElement || t.body;
    } catch {
      return t.body;
    }
  }
  function sl(t, r) {
    var s = r.checked;
    return Q({}, r, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: s ?? t._wrapperState.initialChecked });
  }
  function Tf(t, r) {
    var s = r.defaultValue == null ? "" : r.defaultValue, u = r.checked != null ? r.checked : r.defaultChecked;
    s = xe(r.value != null ? r.value : s), t._wrapperState = { initialChecked: u, initialValue: s, controlled: r.type === "checkbox" || r.type === "radio" ? r.checked != null : r.value != null };
  }
  function kf(t, r) {
    r = r.checked, r != null && E(t, "checked", r, !1);
  }
  function al(t, r) {
    kf(t, r);
    var s = xe(r.value), u = r.type;
    if (s != null) u === "number" ? (s === 0 && t.value === "" || t.value != s) && (t.value = "" + s) : t.value !== "" + s && (t.value = "" + s);
    else if (u === "submit" || u === "reset") {
      t.removeAttribute("value");
      return;
    }
    r.hasOwnProperty("value") ? ll(t, r.type, s) : r.hasOwnProperty("defaultValue") && ll(t, r.type, xe(r.defaultValue)), r.checked == null && r.defaultChecked != null && (t.defaultChecked = !!r.defaultChecked);
  }
  function Af(t, r, s) {
    if (r.hasOwnProperty("value") || r.hasOwnProperty("defaultValue")) {
      var u = r.type;
      if (!(u !== "submit" && u !== "reset" || r.value !== void 0 && r.value !== null)) return;
      r = "" + t._wrapperState.initialValue, s || r === t.value || (t.value = r), t.defaultValue = r;
    }
    s = t.name, s !== "" && (t.name = ""), t.defaultChecked = !!t._wrapperState.initialChecked, s !== "" && (t.name = s);
  }
  function ll(t, r, s) {
    (r !== "number" || ji(t.ownerDocument) !== t) && (s == null ? t.defaultValue = "" + t._wrapperState.initialValue : t.defaultValue !== "" + s && (t.defaultValue = "" + s));
  }
  var yo = Array.isArray;
  function Ar(t, r, s, u) {
    if (t = t.options, r) {
      r = {};
      for (var h = 0; h < s.length; h++) r["$" + s[h]] = !0;
      for (s = 0; s < t.length; s++) h = r.hasOwnProperty("$" + t[s].value), t[s].selected !== h && (t[s].selected = h), h && u && (t[s].defaultSelected = !0);
    } else {
      for (s = "" + xe(s), r = null, h = 0; h < t.length; h++) {
        if (t[h].value === s) {
          t[h].selected = !0, u && (t[h].defaultSelected = !0);
          return;
        }
        r !== null || t[h].disabled || (r = t[h]);
      }
      r !== null && (r.selected = !0);
    }
  }
  function ul(t, r) {
    if (r.dangerouslySetInnerHTML != null) throw Error(o(91));
    return Q({}, r, { value: void 0, defaultValue: void 0, children: "" + t._wrapperState.initialValue });
  }
  function Cf(t, r) {
    var s = r.value;
    if (s == null) {
      if (s = r.children, r = r.defaultValue, s != null) {
        if (r != null) throw Error(o(92));
        if (yo(s)) {
          if (1 < s.length) throw Error(o(93));
          s = s[0];
        }
        r = s;
      }
      r == null && (r = ""), s = r;
    }
    t._wrapperState = { initialValue: xe(s) };
  }
  function bf(t, r) {
    var s = xe(r.value), u = xe(r.defaultValue);
    s != null && (s = "" + s, s !== t.value && (t.value = s), r.defaultValue == null && t.defaultValue !== s && (t.defaultValue = s)), u != null && (t.defaultValue = "" + u);
  }
  function Pf(t) {
    var r = t.textContent;
    r === t._wrapperState.initialValue && r !== "" && r !== null && (t.value = r);
  }
  function Ef(t) {
    switch (t) {
      case "svg":
        return "http://www.w3.org/2000/svg";
      case "math":
        return "http://www.w3.org/1998/Math/MathML";
      default:
        return "http://www.w3.org/1999/xhtml";
    }
  }
  function cl(t, r) {
    return t == null || t === "http://www.w3.org/1999/xhtml" ? Ef(r) : t === "http://www.w3.org/2000/svg" && r === "foreignObject" ? "http://www.w3.org/1999/xhtml" : t;
  }
  var Ii, Mf = (function(t) {
    return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(r, s, u, h) {
      MSApp.execUnsafeLocalFunction(function() {
        return t(r, s, u, h);
      });
    } : t;
  })(function(t, r) {
    if (t.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in t) t.innerHTML = r;
    else {
      for (Ii = Ii || document.createElement("div"), Ii.innerHTML = "<svg>" + r.valueOf().toString() + "</svg>", r = Ii.firstChild; t.firstChild; ) t.removeChild(t.firstChild);
      for (; r.firstChild; ) t.appendChild(r.firstChild);
    }
  });
  function go(t, r) {
    if (r) {
      var s = t.firstChild;
      if (s && s === t.lastChild && s.nodeType === 3) {
        s.nodeValue = r;
        return;
      }
    }
    t.textContent = r;
  }
  var vo = {
    animationIterationCount: !0,
    aspectRatio: !0,
    borderImageOutset: !0,
    borderImageSlice: !0,
    borderImageWidth: !0,
    boxFlex: !0,
    boxFlexGroup: !0,
    boxOrdinalGroup: !0,
    columnCount: !0,
    columns: !0,
    flex: !0,
    flexGrow: !0,
    flexPositive: !0,
    flexShrink: !0,
    flexNegative: !0,
    flexOrder: !0,
    gridArea: !0,
    gridRow: !0,
    gridRowEnd: !0,
    gridRowSpan: !0,
    gridRowStart: !0,
    gridColumn: !0,
    gridColumnEnd: !0,
    gridColumnSpan: !0,
    gridColumnStart: !0,
    fontWeight: !0,
    lineClamp: !0,
    lineHeight: !0,
    opacity: !0,
    order: !0,
    orphans: !0,
    tabSize: !0,
    widows: !0,
    zIndex: !0,
    zoom: !0,
    fillOpacity: !0,
    floodOpacity: !0,
    stopOpacity: !0,
    strokeDasharray: !0,
    strokeDashoffset: !0,
    strokeMiterlimit: !0,
    strokeOpacity: !0,
    strokeWidth: !0
  }, rw = ["Webkit", "ms", "Moz", "O"];
  Object.keys(vo).forEach(function(t) {
    rw.forEach(function(r) {
      r = r + t.charAt(0).toUpperCase() + t.substring(1), vo[r] = vo[t];
    });
  });
  function Rf(t, r, s) {
    return r == null || typeof r == "boolean" || r === "" ? "" : s || typeof r != "number" || r === 0 || vo.hasOwnProperty(t) && vo[t] ? ("" + r).trim() : r + "px";
  }
  function Nf(t, r) {
    t = t.style;
    for (var s in r) if (r.hasOwnProperty(s)) {
      var u = s.indexOf("--") === 0, h = Rf(s, r[s], u);
      s === "float" && (s = "cssFloat"), u ? t.setProperty(s, h) : t[s] = h;
    }
  }
  var ow = Q({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
  function dl(t, r) {
    if (r) {
      if (ow[t] && (r.children != null || r.dangerouslySetInnerHTML != null)) throw Error(o(137, t));
      if (r.dangerouslySetInnerHTML != null) {
        if (r.children != null) throw Error(o(60));
        if (typeof r.dangerouslySetInnerHTML != "object" || !("__html" in r.dangerouslySetInnerHTML)) throw Error(o(61));
      }
      if (r.style != null && typeof r.style != "object") throw Error(o(62));
    }
  }
  function fl(t, r) {
    if (t.indexOf("-") === -1) return typeof r.is == "string";
    switch (t) {
      case "annotation-xml":
      case "color-profile":
      case "font-face":
      case "font-face-src":
      case "font-face-uri":
      case "font-face-format":
      case "font-face-name":
      case "missing-glyph":
        return !1;
      default:
        return !0;
    }
  }
  var pl = null;
  function ml(t) {
    return t = t.target || t.srcElement || window, t.correspondingUseElement && (t = t.correspondingUseElement), t.nodeType === 3 ? t.parentNode : t;
  }
  var hl = null, Cr = null, br = null;
  function Df(t) {
    if (t = zo(t)) {
      if (typeof hl != "function") throw Error(o(280));
      var r = t.stateNode;
      r && (r = os(r), hl(t.stateNode, t.type, r));
    }
  }
  function jf(t) {
    Cr ? br ? br.push(t) : br = [t] : Cr = t;
  }
  function If() {
    if (Cr) {
      var t = Cr, r = br;
      if (br = Cr = null, Df(t), r) for (t = 0; t < r.length; t++) Df(r[t]);
    }
  }
  function Ff(t, r) {
    return t(r);
  }
  function Of() {
  }
  var yl = !1;
  function Lf(t, r, s) {
    if (yl) return t(r, s);
    yl = !0;
    try {
      return Ff(t, r, s);
    } finally {
      yl = !1, (Cr !== null || br !== null) && (Of(), If());
    }
  }
  function So(t, r) {
    var s = t.stateNode;
    if (s === null) return null;
    var u = os(s);
    if (u === null) return null;
    s = u[r];
    e: switch (r) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
        (u = !u.disabled) || (t = t.type, u = !(t === "button" || t === "input" || t === "select" || t === "textarea")), t = !u;
        break e;
      default:
        t = !1;
    }
    if (t) return null;
    if (s && typeof s != "function") throw Error(o(231, r, typeof s));
    return s;
  }
  var gl = !1;
  if (p) try {
    var wo = {};
    Object.defineProperty(wo, "passive", { get: function() {
      gl = !0;
    } }), window.addEventListener("test", wo, wo), window.removeEventListener("test", wo, wo);
  } catch {
    gl = !1;
  }
  function iw(t, r, s, u, h, v, k, P, M) {
    var F = Array.prototype.slice.call(arguments, 3);
    try {
      r.apply(s, F);
    } catch ($) {
      this.onError($);
    }
  }
  var xo = !1, Fi = null, Oi = !1, vl = null, sw = { onError: function(t) {
    xo = !0, Fi = t;
  } };
  function aw(t, r, s, u, h, v, k, P, M) {
    xo = !1, Fi = null, iw.apply(sw, arguments);
  }
  function lw(t, r, s, u, h, v, k, P, M) {
    if (aw.apply(this, arguments), xo) {
      if (xo) {
        var F = Fi;
        xo = !1, Fi = null;
      } else throw Error(o(198));
      Oi || (Oi = !0, vl = F);
    }
  }
  function Xn(t) {
    var r = t, s = t;
    if (t.alternate) for (; r.return; ) r = r.return;
    else {
      t = r;
      do
        r = t, (r.flags & 4098) !== 0 && (s = r.return), t = r.return;
      while (t);
    }
    return r.tag === 3 ? s : null;
  }
  function Vf(t) {
    if (t.tag === 13) {
      var r = t.memoizedState;
      if (r === null && (t = t.alternate, t !== null && (r = t.memoizedState)), r !== null) return r.dehydrated;
    }
    return null;
  }
  function zf(t) {
    if (Xn(t) !== t) throw Error(o(188));
  }
  function uw(t) {
    var r = t.alternate;
    if (!r) {
      if (r = Xn(t), r === null) throw Error(o(188));
      return r !== t ? null : t;
    }
    for (var s = t, u = r; ; ) {
      var h = s.return;
      if (h === null) break;
      var v = h.alternate;
      if (v === null) {
        if (u = h.return, u !== null) {
          s = u;
          continue;
        }
        break;
      }
      if (h.child === v.child) {
        for (v = h.child; v; ) {
          if (v === s) return zf(h), t;
          if (v === u) return zf(h), r;
          v = v.sibling;
        }
        throw Error(o(188));
      }
      if (s.return !== u.return) s = h, u = v;
      else {
        for (var k = !1, P = h.child; P; ) {
          if (P === s) {
            k = !0, s = h, u = v;
            break;
          }
          if (P === u) {
            k = !0, u = h, s = v;
            break;
          }
          P = P.sibling;
        }
        if (!k) {
          for (P = v.child; P; ) {
            if (P === s) {
              k = !0, s = v, u = h;
              break;
            }
            if (P === u) {
              k = !0, u = v, s = h;
              break;
            }
            P = P.sibling;
          }
          if (!k) throw Error(o(189));
        }
      }
      if (s.alternate !== u) throw Error(o(190));
    }
    if (s.tag !== 3) throw Error(o(188));
    return s.stateNode.current === s ? t : r;
  }
  function Bf(t) {
    return t = uw(t), t !== null ? $f(t) : null;
  }
  function $f(t) {
    if (t.tag === 5 || t.tag === 6) return t;
    for (t = t.child; t !== null; ) {
      var r = $f(t);
      if (r !== null) return r;
      t = t.sibling;
    }
    return null;
  }
  var Uf = n.unstable_scheduleCallback, Hf = n.unstable_cancelCallback, cw = n.unstable_shouldYield, dw = n.unstable_requestPaint, Le = n.unstable_now, fw = n.unstable_getCurrentPriorityLevel, Sl = n.unstable_ImmediatePriority, Wf = n.unstable_UserBlockingPriority, Li = n.unstable_NormalPriority, pw = n.unstable_LowPriority, Gf = n.unstable_IdlePriority, Vi = null, Kt = null;
  function mw(t) {
    if (Kt && typeof Kt.onCommitFiberRoot == "function") try {
      Kt.onCommitFiberRoot(Vi, t, void 0, (t.current.flags & 128) === 128);
    } catch {
    }
  }
  var It = Math.clz32 ? Math.clz32 : gw, hw = Math.log, yw = Math.LN2;
  function gw(t) {
    return t >>>= 0, t === 0 ? 32 : 31 - (hw(t) / yw | 0) | 0;
  }
  var zi = 64, Bi = 4194304;
  function _o(t) {
    switch (t & -t) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return t & 4194240;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
      case 67108864:
        return t & 130023424;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 1073741824;
      default:
        return t;
    }
  }
  function $i(t, r) {
    var s = t.pendingLanes;
    if (s === 0) return 0;
    var u = 0, h = t.suspendedLanes, v = t.pingedLanes, k = s & 268435455;
    if (k !== 0) {
      var P = k & ~h;
      P !== 0 ? u = _o(P) : (v &= k, v !== 0 && (u = _o(v)));
    } else k = s & ~h, k !== 0 ? u = _o(k) : v !== 0 && (u = _o(v));
    if (u === 0) return 0;
    if (r !== 0 && r !== u && (r & h) === 0 && (h = u & -u, v = r & -r, h >= v || h === 16 && (v & 4194240) !== 0)) return r;
    if ((u & 4) !== 0 && (u |= s & 16), r = t.entangledLanes, r !== 0) for (t = t.entanglements, r &= u; 0 < r; ) s = 31 - It(r), h = 1 << s, u |= t[s], r &= ~h;
    return u;
  }
  function vw(t, r) {
    switch (t) {
      case 1:
      case 2:
      case 4:
        return r + 250;
      case 8:
      case 16:
      case 32:
      case 64:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return r + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
      case 67108864:
        return -1;
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function Sw(t, r) {
    for (var s = t.suspendedLanes, u = t.pingedLanes, h = t.expirationTimes, v = t.pendingLanes; 0 < v; ) {
      var k = 31 - It(v), P = 1 << k, M = h[k];
      M === -1 ? ((P & s) === 0 || (P & u) !== 0) && (h[k] = vw(P, r)) : M <= r && (t.expiredLanes |= P), v &= ~P;
    }
  }
  function wl(t) {
    return t = t.pendingLanes & -1073741825, t !== 0 ? t : t & 1073741824 ? 1073741824 : 0;
  }
  function Kf() {
    var t = zi;
    return zi <<= 1, (zi & 4194240) === 0 && (zi = 64), t;
  }
  function xl(t) {
    for (var r = [], s = 0; 31 > s; s++) r.push(t);
    return r;
  }
  function To(t, r, s) {
    t.pendingLanes |= r, r !== 536870912 && (t.suspendedLanes = 0, t.pingedLanes = 0), t = t.eventTimes, r = 31 - It(r), t[r] = s;
  }
  function ww(t, r) {
    var s = t.pendingLanes & ~r;
    t.pendingLanes = r, t.suspendedLanes = 0, t.pingedLanes = 0, t.expiredLanes &= r, t.mutableReadLanes &= r, t.entangledLanes &= r, r = t.entanglements;
    var u = t.eventTimes;
    for (t = t.expirationTimes; 0 < s; ) {
      var h = 31 - It(s), v = 1 << h;
      r[h] = 0, u[h] = -1, t[h] = -1, s &= ~v;
    }
  }
  function _l(t, r) {
    var s = t.entangledLanes |= r;
    for (t = t.entanglements; s; ) {
      var u = 31 - It(s), h = 1 << u;
      h & r | t[u] & r && (t[u] |= r), s &= ~h;
    }
  }
  var _e = 0;
  function Yf(t) {
    return t &= -t, 1 < t ? 4 < t ? (t & 268435455) !== 0 ? 16 : 536870912 : 4 : 1;
  }
  var Qf, Tl, Xf, Zf, qf, kl = !1, Ui = [], wn = null, xn = null, _n = null, ko = /* @__PURE__ */ new Map(), Ao = /* @__PURE__ */ new Map(), Tn = [], xw = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
  function Jf(t, r) {
    switch (t) {
      case "focusin":
      case "focusout":
        wn = null;
        break;
      case "dragenter":
      case "dragleave":
        xn = null;
        break;
      case "mouseover":
      case "mouseout":
        _n = null;
        break;
      case "pointerover":
      case "pointerout":
        ko.delete(r.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        Ao.delete(r.pointerId);
    }
  }
  function Co(t, r, s, u, h, v) {
    return t === null || t.nativeEvent !== v ? (t = { blockedOn: r, domEventName: s, eventSystemFlags: u, nativeEvent: v, targetContainers: [h] }, r !== null && (r = zo(r), r !== null && Tl(r)), t) : (t.eventSystemFlags |= u, r = t.targetContainers, h !== null && r.indexOf(h) === -1 && r.push(h), t);
  }
  function _w(t, r, s, u, h) {
    switch (r) {
      case "focusin":
        return wn = Co(wn, t, r, s, u, h), !0;
      case "dragenter":
        return xn = Co(xn, t, r, s, u, h), !0;
      case "mouseover":
        return _n = Co(_n, t, r, s, u, h), !0;
      case "pointerover":
        var v = h.pointerId;
        return ko.set(v, Co(ko.get(v) || null, t, r, s, u, h)), !0;
      case "gotpointercapture":
        return v = h.pointerId, Ao.set(v, Co(Ao.get(v) || null, t, r, s, u, h)), !0;
    }
    return !1;
  }
  function ep(t) {
    var r = Zn(t.target);
    if (r !== null) {
      var s = Xn(r);
      if (s !== null) {
        if (r = s.tag, r === 13) {
          if (r = Vf(s), r !== null) {
            t.blockedOn = r, qf(t.priority, function() {
              Xf(s);
            });
            return;
          }
        } else if (r === 3 && s.stateNode.current.memoizedState.isDehydrated) {
          t.blockedOn = s.tag === 3 ? s.stateNode.containerInfo : null;
          return;
        }
      }
    }
    t.blockedOn = null;
  }
  function Hi(t) {
    if (t.blockedOn !== null) return !1;
    for (var r = t.targetContainers; 0 < r.length; ) {
      var s = Cl(t.domEventName, t.eventSystemFlags, r[0], t.nativeEvent);
      if (s === null) {
        s = t.nativeEvent;
        var u = new s.constructor(s.type, s);
        pl = u, s.target.dispatchEvent(u), pl = null;
      } else return r = zo(s), r !== null && Tl(r), t.blockedOn = s, !1;
      r.shift();
    }
    return !0;
  }
  function tp(t, r, s) {
    Hi(t) && s.delete(r);
  }
  function Tw() {
    kl = !1, wn !== null && Hi(wn) && (wn = null), xn !== null && Hi(xn) && (xn = null), _n !== null && Hi(_n) && (_n = null), ko.forEach(tp), Ao.forEach(tp);
  }
  function bo(t, r) {
    t.blockedOn === r && (t.blockedOn = null, kl || (kl = !0, n.unstable_scheduleCallback(n.unstable_NormalPriority, Tw)));
  }
  function Po(t) {
    function r(h) {
      return bo(h, t);
    }
    if (0 < Ui.length) {
      bo(Ui[0], t);
      for (var s = 1; s < Ui.length; s++) {
        var u = Ui[s];
        u.blockedOn === t && (u.blockedOn = null);
      }
    }
    for (wn !== null && bo(wn, t), xn !== null && bo(xn, t), _n !== null && bo(_n, t), ko.forEach(r), Ao.forEach(r), s = 0; s < Tn.length; s++) u = Tn[s], u.blockedOn === t && (u.blockedOn = null);
    for (; 0 < Tn.length && (s = Tn[0], s.blockedOn === null); ) ep(s), s.blockedOn === null && Tn.shift();
  }
  var Pr = D.ReactCurrentBatchConfig, Wi = !0;
  function kw(t, r, s, u) {
    var h = _e, v = Pr.transition;
    Pr.transition = null;
    try {
      _e = 1, Al(t, r, s, u);
    } finally {
      _e = h, Pr.transition = v;
    }
  }
  function Aw(t, r, s, u) {
    var h = _e, v = Pr.transition;
    Pr.transition = null;
    try {
      _e = 4, Al(t, r, s, u);
    } finally {
      _e = h, Pr.transition = v;
    }
  }
  function Al(t, r, s, u) {
    if (Wi) {
      var h = Cl(t, r, s, u);
      if (h === null) Ul(t, r, u, Gi, s), Jf(t, u);
      else if (_w(h, t, r, s, u)) u.stopPropagation();
      else if (Jf(t, u), r & 4 && -1 < xw.indexOf(t)) {
        for (; h !== null; ) {
          var v = zo(h);
          if (v !== null && Qf(v), v = Cl(t, r, s, u), v === null && Ul(t, r, u, Gi, s), v === h) break;
          h = v;
        }
        h !== null && u.stopPropagation();
      } else Ul(t, r, u, null, s);
    }
  }
  var Gi = null;
  function Cl(t, r, s, u) {
    if (Gi = null, t = ml(u), t = Zn(t), t !== null) if (r = Xn(t), r === null) t = null;
    else if (s = r.tag, s === 13) {
      if (t = Vf(r), t !== null) return t;
      t = null;
    } else if (s === 3) {
      if (r.stateNode.current.memoizedState.isDehydrated) return r.tag === 3 ? r.stateNode.containerInfo : null;
      t = null;
    } else r !== t && (t = null);
    return Gi = t, null;
  }
  function np(t) {
    switch (t) {
      case "cancel":
      case "click":
      case "close":
      case "contextmenu":
      case "copy":
      case "cut":
      case "auxclick":
      case "dblclick":
      case "dragend":
      case "dragstart":
      case "drop":
      case "focusin":
      case "focusout":
      case "input":
      case "invalid":
      case "keydown":
      case "keypress":
      case "keyup":
      case "mousedown":
      case "mouseup":
      case "paste":
      case "pause":
      case "play":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
      case "ratechange":
      case "reset":
      case "resize":
      case "seeked":
      case "submit":
      case "touchcancel":
      case "touchend":
      case "touchstart":
      case "volumechange":
      case "change":
      case "selectionchange":
      case "textInput":
      case "compositionstart":
      case "compositionend":
      case "compositionupdate":
      case "beforeblur":
      case "afterblur":
      case "beforeinput":
      case "blur":
      case "fullscreenchange":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
        return 1;
      case "drag":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "mousemove":
      case "mouseout":
      case "mouseover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "scroll":
      case "toggle":
      case "touchmove":
      case "wheel":
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
        return 4;
      case "message":
        switch (fw()) {
          case Sl:
            return 1;
          case Wf:
            return 4;
          case Li:
          case pw:
            return 16;
          case Gf:
            return 536870912;
          default:
            return 16;
        }
      default:
        return 16;
    }
  }
  var kn = null, bl = null, Ki = null;
  function rp() {
    if (Ki) return Ki;
    var t, r = bl, s = r.length, u, h = "value" in kn ? kn.value : kn.textContent, v = h.length;
    for (t = 0; t < s && r[t] === h[t]; t++) ;
    var k = s - t;
    for (u = 1; u <= k && r[s - u] === h[v - u]; u++) ;
    return Ki = h.slice(t, 1 < u ? 1 - u : void 0);
  }
  function Yi(t) {
    var r = t.keyCode;
    return "charCode" in t ? (t = t.charCode, t === 0 && r === 13 && (t = 13)) : t = r, t === 10 && (t = 13), 32 <= t || t === 13 ? t : 0;
  }
  function Qi() {
    return !0;
  }
  function op() {
    return !1;
  }
  function wt(t) {
    function r(s, u, h, v, k) {
      this._reactName = s, this._targetInst = h, this.type = u, this.nativeEvent = v, this.target = k, this.currentTarget = null;
      for (var P in t) t.hasOwnProperty(P) && (s = t[P], this[P] = s ? s(v) : v[P]);
      return this.isDefaultPrevented = (v.defaultPrevented != null ? v.defaultPrevented : v.returnValue === !1) ? Qi : op, this.isPropagationStopped = op, this;
    }
    return Q(r.prototype, { preventDefault: function() {
      this.defaultPrevented = !0;
      var s = this.nativeEvent;
      s && (s.preventDefault ? s.preventDefault() : typeof s.returnValue != "unknown" && (s.returnValue = !1), this.isDefaultPrevented = Qi);
    }, stopPropagation: function() {
      var s = this.nativeEvent;
      s && (s.stopPropagation ? s.stopPropagation() : typeof s.cancelBubble != "unknown" && (s.cancelBubble = !0), this.isPropagationStopped = Qi);
    }, persist: function() {
    }, isPersistent: Qi }), r;
  }
  var Er = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(t) {
    return t.timeStamp || Date.now();
  }, defaultPrevented: 0, isTrusted: 0 }, Pl = wt(Er), Eo = Q({}, Er, { view: 0, detail: 0 }), Cw = wt(Eo), El, Ml, Mo, Xi = Q({}, Eo, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: Nl, button: 0, buttons: 0, relatedTarget: function(t) {
    return t.relatedTarget === void 0 ? t.fromElement === t.srcElement ? t.toElement : t.fromElement : t.relatedTarget;
  }, movementX: function(t) {
    return "movementX" in t ? t.movementX : (t !== Mo && (Mo && t.type === "mousemove" ? (El = t.screenX - Mo.screenX, Ml = t.screenY - Mo.screenY) : Ml = El = 0, Mo = t), El);
  }, movementY: function(t) {
    return "movementY" in t ? t.movementY : Ml;
  } }), ip = wt(Xi), bw = Q({}, Xi, { dataTransfer: 0 }), Pw = wt(bw), Ew = Q({}, Eo, { relatedTarget: 0 }), Rl = wt(Ew), Mw = Q({}, Er, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), Rw = wt(Mw), Nw = Q({}, Er, { clipboardData: function(t) {
    return "clipboardData" in t ? t.clipboardData : window.clipboardData;
  } }), Dw = wt(Nw), jw = Q({}, Er, { data: 0 }), sp = wt(jw), Iw = {
    Esc: "Escape",
    Spacebar: " ",
    Left: "ArrowLeft",
    Up: "ArrowUp",
    Right: "ArrowRight",
    Down: "ArrowDown",
    Del: "Delete",
    Win: "OS",
    Menu: "ContextMenu",
    Apps: "ContextMenu",
    Scroll: "ScrollLock",
    MozPrintableKey: "Unidentified"
  }, Fw = {
    8: "Backspace",
    9: "Tab",
    12: "Clear",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    45: "Insert",
    46: "Delete",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "NumLock",
    145: "ScrollLock",
    224: "Meta"
  }, Ow = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
  function Lw(t) {
    var r = this.nativeEvent;
    return r.getModifierState ? r.getModifierState(t) : (t = Ow[t]) ? !!r[t] : !1;
  }
  function Nl() {
    return Lw;
  }
  var Vw = Q({}, Eo, { key: function(t) {
    if (t.key) {
      var r = Iw[t.key] || t.key;
      if (r !== "Unidentified") return r;
    }
    return t.type === "keypress" ? (t = Yi(t), t === 13 ? "Enter" : String.fromCharCode(t)) : t.type === "keydown" || t.type === "keyup" ? Fw[t.keyCode] || "Unidentified" : "";
  }, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: Nl, charCode: function(t) {
    return t.type === "keypress" ? Yi(t) : 0;
  }, keyCode: function(t) {
    return t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
  }, which: function(t) {
    return t.type === "keypress" ? Yi(t) : t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
  } }), zw = wt(Vw), Bw = Q({}, Xi, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), ap = wt(Bw), $w = Q({}, Eo, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: Nl }), Uw = wt($w), Hw = Q({}, Er, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), Ww = wt(Hw), Gw = Q({}, Xi, {
    deltaX: function(t) {
      return "deltaX" in t ? t.deltaX : "wheelDeltaX" in t ? -t.wheelDeltaX : 0;
    },
    deltaY: function(t) {
      return "deltaY" in t ? t.deltaY : "wheelDeltaY" in t ? -t.wheelDeltaY : "wheelDelta" in t ? -t.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), Kw = wt(Gw), Yw = [9, 13, 27, 32], Dl = p && "CompositionEvent" in window, Ro = null;
  p && "documentMode" in document && (Ro = document.documentMode);
  var Qw = p && "TextEvent" in window && !Ro, lp = p && (!Dl || Ro && 8 < Ro && 11 >= Ro), up = " ", cp = !1;
  function dp(t, r) {
    switch (t) {
      case "keyup":
        return Yw.indexOf(r.keyCode) !== -1;
      case "keydown":
        return r.keyCode !== 229;
      case "keypress":
      case "mousedown":
      case "focusout":
        return !0;
      default:
        return !1;
    }
  }
  function fp(t) {
    return t = t.detail, typeof t == "object" && "data" in t ? t.data : null;
  }
  var Mr = !1;
  function Xw(t, r) {
    switch (t) {
      case "compositionend":
        return fp(r);
      case "keypress":
        return r.which !== 32 ? null : (cp = !0, up);
      case "textInput":
        return t = r.data, t === up && cp ? null : t;
      default:
        return null;
    }
  }
  function Zw(t, r) {
    if (Mr) return t === "compositionend" || !Dl && dp(t, r) ? (t = rp(), Ki = bl = kn = null, Mr = !1, t) : null;
    switch (t) {
      case "paste":
        return null;
      case "keypress":
        if (!(r.ctrlKey || r.altKey || r.metaKey) || r.ctrlKey && r.altKey) {
          if (r.char && 1 < r.char.length) return r.char;
          if (r.which) return String.fromCharCode(r.which);
        }
        return null;
      case "compositionend":
        return lp && r.locale !== "ko" ? null : r.data;
      default:
        return null;
    }
  }
  var qw = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
  function pp(t) {
    var r = t && t.nodeName && t.nodeName.toLowerCase();
    return r === "input" ? !!qw[t.type] : r === "textarea";
  }
  function mp(t, r, s, u) {
    jf(u), r = ts(r, "onChange"), 0 < r.length && (s = new Pl("onChange", "change", null, s, u), t.push({ event: s, listeners: r }));
  }
  var No = null, Do = null;
  function Jw(t) {
    Np(t, 0);
  }
  function Zi(t) {
    var r = Ir(t);
    if (_f(r)) return t;
  }
  function ex(t, r) {
    if (t === "change") return r;
  }
  var hp = !1;
  if (p) {
    var jl;
    if (p) {
      var Il = "oninput" in document;
      if (!Il) {
        var yp = document.createElement("div");
        yp.setAttribute("oninput", "return;"), Il = typeof yp.oninput == "function";
      }
      jl = Il;
    } else jl = !1;
    hp = jl && (!document.documentMode || 9 < document.documentMode);
  }
  function gp() {
    No && (No.detachEvent("onpropertychange", vp), Do = No = null);
  }
  function vp(t) {
    if (t.propertyName === "value" && Zi(Do)) {
      var r = [];
      mp(r, Do, t, ml(t)), Lf(Jw, r);
    }
  }
  function tx(t, r, s) {
    t === "focusin" ? (gp(), No = r, Do = s, No.attachEvent("onpropertychange", vp)) : t === "focusout" && gp();
  }
  function nx(t) {
    if (t === "selectionchange" || t === "keyup" || t === "keydown") return Zi(Do);
  }
  function rx(t, r) {
    if (t === "click") return Zi(r);
  }
  function ox(t, r) {
    if (t === "input" || t === "change") return Zi(r);
  }
  function ix(t, r) {
    return t === r && (t !== 0 || 1 / t === 1 / r) || t !== t && r !== r;
  }
  var Ft = typeof Object.is == "function" ? Object.is : ix;
  function jo(t, r) {
    if (Ft(t, r)) return !0;
    if (typeof t != "object" || t === null || typeof r != "object" || r === null) return !1;
    var s = Object.keys(t), u = Object.keys(r);
    if (s.length !== u.length) return !1;
    for (u = 0; u < s.length; u++) {
      var h = s[u];
      if (!m.call(r, h) || !Ft(t[h], r[h])) return !1;
    }
    return !0;
  }
  function Sp(t) {
    for (; t && t.firstChild; ) t = t.firstChild;
    return t;
  }
  function wp(t, r) {
    var s = Sp(t);
    t = 0;
    for (var u; s; ) {
      if (s.nodeType === 3) {
        if (u = t + s.textContent.length, t <= r && u >= r) return { node: s, offset: r - t };
        t = u;
      }
      e: {
        for (; s; ) {
          if (s.nextSibling) {
            s = s.nextSibling;
            break e;
          }
          s = s.parentNode;
        }
        s = void 0;
      }
      s = Sp(s);
    }
  }
  function xp(t, r) {
    return t && r ? t === r ? !0 : t && t.nodeType === 3 ? !1 : r && r.nodeType === 3 ? xp(t, r.parentNode) : "contains" in t ? t.contains(r) : t.compareDocumentPosition ? !!(t.compareDocumentPosition(r) & 16) : !1 : !1;
  }
  function _p() {
    for (var t = window, r = ji(); r instanceof t.HTMLIFrameElement; ) {
      try {
        var s = typeof r.contentWindow.location.href == "string";
      } catch {
        s = !1;
      }
      if (s) t = r.contentWindow;
      else break;
      r = ji(t.document);
    }
    return r;
  }
  function Fl(t) {
    var r = t && t.nodeName && t.nodeName.toLowerCase();
    return r && (r === "input" && (t.type === "text" || t.type === "search" || t.type === "tel" || t.type === "url" || t.type === "password") || r === "textarea" || t.contentEditable === "true");
  }
  function sx(t) {
    var r = _p(), s = t.focusedElem, u = t.selectionRange;
    if (r !== s && s && s.ownerDocument && xp(s.ownerDocument.documentElement, s)) {
      if (u !== null && Fl(s)) {
        if (r = u.start, t = u.end, t === void 0 && (t = r), "selectionStart" in s) s.selectionStart = r, s.selectionEnd = Math.min(t, s.value.length);
        else if (t = (r = s.ownerDocument || document) && r.defaultView || window, t.getSelection) {
          t = t.getSelection();
          var h = s.textContent.length, v = Math.min(u.start, h);
          u = u.end === void 0 ? v : Math.min(u.end, h), !t.extend && v > u && (h = u, u = v, v = h), h = wp(s, v);
          var k = wp(
            s,
            u
          );
          h && k && (t.rangeCount !== 1 || t.anchorNode !== h.node || t.anchorOffset !== h.offset || t.focusNode !== k.node || t.focusOffset !== k.offset) && (r = r.createRange(), r.setStart(h.node, h.offset), t.removeAllRanges(), v > u ? (t.addRange(r), t.extend(k.node, k.offset)) : (r.setEnd(k.node, k.offset), t.addRange(r)));
        }
      }
      for (r = [], t = s; t = t.parentNode; ) t.nodeType === 1 && r.push({ element: t, left: t.scrollLeft, top: t.scrollTop });
      for (typeof s.focus == "function" && s.focus(), s = 0; s < r.length; s++) t = r[s], t.element.scrollLeft = t.left, t.element.scrollTop = t.top;
    }
  }
  var ax = p && "documentMode" in document && 11 >= document.documentMode, Rr = null, Ol = null, Io = null, Ll = !1;
  function Tp(t, r, s) {
    var u = s.window === s ? s.document : s.nodeType === 9 ? s : s.ownerDocument;
    Ll || Rr == null || Rr !== ji(u) || (u = Rr, "selectionStart" in u && Fl(u) ? u = { start: u.selectionStart, end: u.selectionEnd } : (u = (u.ownerDocument && u.ownerDocument.defaultView || window).getSelection(), u = { anchorNode: u.anchorNode, anchorOffset: u.anchorOffset, focusNode: u.focusNode, focusOffset: u.focusOffset }), Io && jo(Io, u) || (Io = u, u = ts(Ol, "onSelect"), 0 < u.length && (r = new Pl("onSelect", "select", null, r, s), t.push({ event: r, listeners: u }), r.target = Rr)));
  }
  function qi(t, r) {
    var s = {};
    return s[t.toLowerCase()] = r.toLowerCase(), s["Webkit" + t] = "webkit" + r, s["Moz" + t] = "moz" + r, s;
  }
  var Nr = { animationend: qi("Animation", "AnimationEnd"), animationiteration: qi("Animation", "AnimationIteration"), animationstart: qi("Animation", "AnimationStart"), transitionend: qi("Transition", "TransitionEnd") }, Vl = {}, kp = {};
  p && (kp = document.createElement("div").style, "AnimationEvent" in window || (delete Nr.animationend.animation, delete Nr.animationiteration.animation, delete Nr.animationstart.animation), "TransitionEvent" in window || delete Nr.transitionend.transition);
  function Ji(t) {
    if (Vl[t]) return Vl[t];
    if (!Nr[t]) return t;
    var r = Nr[t], s;
    for (s in r) if (r.hasOwnProperty(s) && s in kp) return Vl[t] = r[s];
    return t;
  }
  var Ap = Ji("animationend"), Cp = Ji("animationiteration"), bp = Ji("animationstart"), Pp = Ji("transitionend"), Ep = /* @__PURE__ */ new Map(), Mp = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
  function An(t, r) {
    Ep.set(t, r), d(r, [t]);
  }
  for (var zl = 0; zl < Mp.length; zl++) {
    var Bl = Mp[zl], lx = Bl.toLowerCase(), ux = Bl[0].toUpperCase() + Bl.slice(1);
    An(lx, "on" + ux);
  }
  An(Ap, "onAnimationEnd"), An(Cp, "onAnimationIteration"), An(bp, "onAnimationStart"), An("dblclick", "onDoubleClick"), An("focusin", "onFocus"), An("focusout", "onBlur"), An(Pp, "onTransitionEnd"), f("onMouseEnter", ["mouseout", "mouseover"]), f("onMouseLeave", ["mouseout", "mouseover"]), f("onPointerEnter", ["pointerout", "pointerover"]), f("onPointerLeave", ["pointerout", "pointerover"]), d("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), d("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), d("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]), d("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), d("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), d("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
  var Fo = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), cx = new Set("cancel close invalid load scroll toggle".split(" ").concat(Fo));
  function Rp(t, r, s) {
    var u = t.type || "unknown-event";
    t.currentTarget = s, lw(u, r, void 0, t), t.currentTarget = null;
  }
  function Np(t, r) {
    r = (r & 4) !== 0;
    for (var s = 0; s < t.length; s++) {
      var u = t[s], h = u.event;
      u = u.listeners;
      e: {
        var v = void 0;
        if (r) for (var k = u.length - 1; 0 <= k; k--) {
          var P = u[k], M = P.instance, F = P.currentTarget;
          if (P = P.listener, M !== v && h.isPropagationStopped()) break e;
          Rp(h, P, F), v = M;
        }
        else for (k = 0; k < u.length; k++) {
          if (P = u[k], M = P.instance, F = P.currentTarget, P = P.listener, M !== v && h.isPropagationStopped()) break e;
          Rp(h, P, F), v = M;
        }
      }
    }
    if (Oi) throw t = vl, Oi = !1, vl = null, t;
  }
  function Me(t, r) {
    var s = r[Ql];
    s === void 0 && (s = r[Ql] = /* @__PURE__ */ new Set());
    var u = t + "__bubble";
    s.has(u) || (Dp(r, t, 2, !1), s.add(u));
  }
  function $l(t, r, s) {
    var u = 0;
    r && (u |= 4), Dp(s, t, u, r);
  }
  var es = "_reactListening" + Math.random().toString(36).slice(2);
  function Oo(t) {
    if (!t[es]) {
      t[es] = !0, i.forEach(function(s) {
        s !== "selectionchange" && (cx.has(s) || $l(s, !1, t), $l(s, !0, t));
      });
      var r = t.nodeType === 9 ? t : t.ownerDocument;
      r === null || r[es] || (r[es] = !0, $l("selectionchange", !1, r));
    }
  }
  function Dp(t, r, s, u) {
    switch (np(r)) {
      case 1:
        var h = kw;
        break;
      case 4:
        h = Aw;
        break;
      default:
        h = Al;
    }
    s = h.bind(null, r, s, t), h = void 0, !gl || r !== "touchstart" && r !== "touchmove" && r !== "wheel" || (h = !0), u ? h !== void 0 ? t.addEventListener(r, s, { capture: !0, passive: h }) : t.addEventListener(r, s, !0) : h !== void 0 ? t.addEventListener(r, s, { passive: h }) : t.addEventListener(r, s, !1);
  }
  function Ul(t, r, s, u, h) {
    var v = u;
    if ((r & 1) === 0 && (r & 2) === 0 && u !== null) e: for (; ; ) {
      if (u === null) return;
      var k = u.tag;
      if (k === 3 || k === 4) {
        var P = u.stateNode.containerInfo;
        if (P === h || P.nodeType === 8 && P.parentNode === h) break;
        if (k === 4) for (k = u.return; k !== null; ) {
          var M = k.tag;
          if ((M === 3 || M === 4) && (M = k.stateNode.containerInfo, M === h || M.nodeType === 8 && M.parentNode === h)) return;
          k = k.return;
        }
        for (; P !== null; ) {
          if (k = Zn(P), k === null) return;
          if (M = k.tag, M === 5 || M === 6) {
            u = v = k;
            continue e;
          }
          P = P.parentNode;
        }
      }
      u = u.return;
    }
    Lf(function() {
      var F = v, $ = ml(s), U = [];
      e: {
        var B = Ep.get(t);
        if (B !== void 0) {
          var q = Pl, te = t;
          switch (t) {
            case "keypress":
              if (Yi(s) === 0) break e;
            case "keydown":
            case "keyup":
              q = zw;
              break;
            case "focusin":
              te = "focus", q = Rl;
              break;
            case "focusout":
              te = "blur", q = Rl;
              break;
            case "beforeblur":
            case "afterblur":
              q = Rl;
              break;
            case "click":
              if (s.button === 2) break e;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              q = ip;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              q = Pw;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              q = Uw;
              break;
            case Ap:
            case Cp:
            case bp:
              q = Rw;
              break;
            case Pp:
              q = Ww;
              break;
            case "scroll":
              q = Cw;
              break;
            case "wheel":
              q = Kw;
              break;
            case "copy":
            case "cut":
            case "paste":
              q = Dw;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              q = ap;
          }
          var re = (r & 4) !== 0, Ve = !re && t === "scroll", j = re ? B !== null ? B + "Capture" : null : B;
          re = [];
          for (var R = F, I; R !== null; ) {
            I = R;
            var K = I.stateNode;
            if (I.tag === 5 && K !== null && (I = K, j !== null && (K = So(R, j), K != null && re.push(Lo(R, K, I)))), Ve) break;
            R = R.return;
          }
          0 < re.length && (B = new q(B, te, null, s, $), U.push({ event: B, listeners: re }));
        }
      }
      if ((r & 7) === 0) {
        e: {
          if (B = t === "mouseover" || t === "pointerover", q = t === "mouseout" || t === "pointerout", B && s !== pl && (te = s.relatedTarget || s.fromElement) && (Zn(te) || te[sn])) break e;
          if ((q || B) && (B = $.window === $ ? $ : (B = $.ownerDocument) ? B.defaultView || B.parentWindow : window, q ? (te = s.relatedTarget || s.toElement, q = F, te = te ? Zn(te) : null, te !== null && (Ve = Xn(te), te !== Ve || te.tag !== 5 && te.tag !== 6) && (te = null)) : (q = null, te = F), q !== te)) {
            if (re = ip, K = "onMouseLeave", j = "onMouseEnter", R = "mouse", (t === "pointerout" || t === "pointerover") && (re = ap, K = "onPointerLeave", j = "onPointerEnter", R = "pointer"), Ve = q == null ? B : Ir(q), I = te == null ? B : Ir(te), B = new re(K, R + "leave", q, s, $), B.target = Ve, B.relatedTarget = I, K = null, Zn($) === F && (re = new re(j, R + "enter", te, s, $), re.target = I, re.relatedTarget = Ve, K = re), Ve = K, q && te) t: {
              for (re = q, j = te, R = 0, I = re; I; I = Dr(I)) R++;
              for (I = 0, K = j; K; K = Dr(K)) I++;
              for (; 0 < R - I; ) re = Dr(re), R--;
              for (; 0 < I - R; ) j = Dr(j), I--;
              for (; R--; ) {
                if (re === j || j !== null && re === j.alternate) break t;
                re = Dr(re), j = Dr(j);
              }
              re = null;
            }
            else re = null;
            q !== null && jp(U, B, q, re, !1), te !== null && Ve !== null && jp(U, Ve, te, re, !0);
          }
        }
        e: {
          if (B = F ? Ir(F) : window, q = B.nodeName && B.nodeName.toLowerCase(), q === "select" || q === "input" && B.type === "file") var oe = ex;
          else if (pp(B)) if (hp) oe = ox;
          else {
            oe = nx;
            var ie = tx;
          }
          else (q = B.nodeName) && q.toLowerCase() === "input" && (B.type === "checkbox" || B.type === "radio") && (oe = rx);
          if (oe && (oe = oe(t, F))) {
            mp(U, oe, s, $);
            break e;
          }
          ie && ie(t, B, F), t === "focusout" && (ie = B._wrapperState) && ie.controlled && B.type === "number" && ll(B, "number", B.value);
        }
        switch (ie = F ? Ir(F) : window, t) {
          case "focusin":
            (pp(ie) || ie.contentEditable === "true") && (Rr = ie, Ol = F, Io = null);
            break;
          case "focusout":
            Io = Ol = Rr = null;
            break;
          case "mousedown":
            Ll = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            Ll = !1, Tp(U, s, $);
            break;
          case "selectionchange":
            if (ax) break;
          case "keydown":
          case "keyup":
            Tp(U, s, $);
        }
        var se;
        if (Dl) e: {
          switch (t) {
            case "compositionstart":
              var ue = "onCompositionStart";
              break e;
            case "compositionend":
              ue = "onCompositionEnd";
              break e;
            case "compositionupdate":
              ue = "onCompositionUpdate";
              break e;
          }
          ue = void 0;
        }
        else Mr ? dp(t, s) && (ue = "onCompositionEnd") : t === "keydown" && s.keyCode === 229 && (ue = "onCompositionStart");
        ue && (lp && s.locale !== "ko" && (Mr || ue !== "onCompositionStart" ? ue === "onCompositionEnd" && Mr && (se = rp()) : (kn = $, bl = "value" in kn ? kn.value : kn.textContent, Mr = !0)), ie = ts(F, ue), 0 < ie.length && (ue = new sp(ue, t, null, s, $), U.push({ event: ue, listeners: ie }), se ? ue.data = se : (se = fp(s), se !== null && (ue.data = se)))), (se = Qw ? Xw(t, s) : Zw(t, s)) && (F = ts(F, "onBeforeInput"), 0 < F.length && ($ = new sp("onBeforeInput", "beforeinput", null, s, $), U.push({ event: $, listeners: F }), $.data = se));
      }
      Np(U, r);
    });
  }
  function Lo(t, r, s) {
    return { instance: t, listener: r, currentTarget: s };
  }
  function ts(t, r) {
    for (var s = r + "Capture", u = []; t !== null; ) {
      var h = t, v = h.stateNode;
      h.tag === 5 && v !== null && (h = v, v = So(t, s), v != null && u.unshift(Lo(t, v, h)), v = So(t, r), v != null && u.push(Lo(t, v, h))), t = t.return;
    }
    return u;
  }
  function Dr(t) {
    if (t === null) return null;
    do
      t = t.return;
    while (t && t.tag !== 5);
    return t || null;
  }
  function jp(t, r, s, u, h) {
    for (var v = r._reactName, k = []; s !== null && s !== u; ) {
      var P = s, M = P.alternate, F = P.stateNode;
      if (M !== null && M === u) break;
      P.tag === 5 && F !== null && (P = F, h ? (M = So(s, v), M != null && k.unshift(Lo(s, M, P))) : h || (M = So(s, v), M != null && k.push(Lo(s, M, P)))), s = s.return;
    }
    k.length !== 0 && t.push({ event: r, listeners: k });
  }
  var dx = /\r\n?/g, fx = /\u0000|\uFFFD/g;
  function Ip(t) {
    return (typeof t == "string" ? t : "" + t).replace(dx, `
`).replace(fx, "");
  }
  function ns(t, r, s) {
    if (r = Ip(r), Ip(t) !== r && s) throw Error(o(425));
  }
  function rs() {
  }
  var Hl = null, Wl = null;
  function Gl(t, r) {
    return t === "textarea" || t === "noscript" || typeof r.children == "string" || typeof r.children == "number" || typeof r.dangerouslySetInnerHTML == "object" && r.dangerouslySetInnerHTML !== null && r.dangerouslySetInnerHTML.__html != null;
  }
  var Kl = typeof setTimeout == "function" ? setTimeout : void 0, px = typeof clearTimeout == "function" ? clearTimeout : void 0, Fp = typeof Promise == "function" ? Promise : void 0, mx = typeof queueMicrotask == "function" ? queueMicrotask : typeof Fp < "u" ? function(t) {
    return Fp.resolve(null).then(t).catch(hx);
  } : Kl;
  function hx(t) {
    setTimeout(function() {
      throw t;
    });
  }
  function Yl(t, r) {
    var s = r, u = 0;
    do {
      var h = s.nextSibling;
      if (t.removeChild(s), h && h.nodeType === 8) if (s = h.data, s === "/$") {
        if (u === 0) {
          t.removeChild(h), Po(r);
          return;
        }
        u--;
      } else s !== "$" && s !== "$?" && s !== "$!" || u++;
      s = h;
    } while (s);
    Po(r);
  }
  function Cn(t) {
    for (; t != null; t = t.nextSibling) {
      var r = t.nodeType;
      if (r === 1 || r === 3) break;
      if (r === 8) {
        if (r = t.data, r === "$" || r === "$!" || r === "$?") break;
        if (r === "/$") return null;
      }
    }
    return t;
  }
  function Op(t) {
    t = t.previousSibling;
    for (var r = 0; t; ) {
      if (t.nodeType === 8) {
        var s = t.data;
        if (s === "$" || s === "$!" || s === "$?") {
          if (r === 0) return t;
          r--;
        } else s === "/$" && r++;
      }
      t = t.previousSibling;
    }
    return null;
  }
  var jr = Math.random().toString(36).slice(2), Yt = "__reactFiber$" + jr, Vo = "__reactProps$" + jr, sn = "__reactContainer$" + jr, Ql = "__reactEvents$" + jr, yx = "__reactListeners$" + jr, gx = "__reactHandles$" + jr;
  function Zn(t) {
    var r = t[Yt];
    if (r) return r;
    for (var s = t.parentNode; s; ) {
      if (r = s[sn] || s[Yt]) {
        if (s = r.alternate, r.child !== null || s !== null && s.child !== null) for (t = Op(t); t !== null; ) {
          if (s = t[Yt]) return s;
          t = Op(t);
        }
        return r;
      }
      t = s, s = t.parentNode;
    }
    return null;
  }
  function zo(t) {
    return t = t[Yt] || t[sn], !t || t.tag !== 5 && t.tag !== 6 && t.tag !== 13 && t.tag !== 3 ? null : t;
  }
  function Ir(t) {
    if (t.tag === 5 || t.tag === 6) return t.stateNode;
    throw Error(o(33));
  }
  function os(t) {
    return t[Vo] || null;
  }
  var Xl = [], Fr = -1;
  function bn(t) {
    return { current: t };
  }
  function Re(t) {
    0 > Fr || (t.current = Xl[Fr], Xl[Fr] = null, Fr--);
  }
  function Ee(t, r) {
    Fr++, Xl[Fr] = t.current, t.current = r;
  }
  var Pn = {}, Je = bn(Pn), ct = bn(!1), qn = Pn;
  function Or(t, r) {
    var s = t.type.contextTypes;
    if (!s) return Pn;
    var u = t.stateNode;
    if (u && u.__reactInternalMemoizedUnmaskedChildContext === r) return u.__reactInternalMemoizedMaskedChildContext;
    var h = {}, v;
    for (v in s) h[v] = r[v];
    return u && (t = t.stateNode, t.__reactInternalMemoizedUnmaskedChildContext = r, t.__reactInternalMemoizedMaskedChildContext = h), h;
  }
  function dt(t) {
    return t = t.childContextTypes, t != null;
  }
  function is() {
    Re(ct), Re(Je);
  }
  function Lp(t, r, s) {
    if (Je.current !== Pn) throw Error(o(168));
    Ee(Je, r), Ee(ct, s);
  }
  function Vp(t, r, s) {
    var u = t.stateNode;
    if (r = r.childContextTypes, typeof u.getChildContext != "function") return s;
    u = u.getChildContext();
    for (var h in u) if (!(h in r)) throw Error(o(108, Pe(t) || "Unknown", h));
    return Q({}, s, u);
  }
  function ss(t) {
    return t = (t = t.stateNode) && t.__reactInternalMemoizedMergedChildContext || Pn, qn = Je.current, Ee(Je, t), Ee(ct, ct.current), !0;
  }
  function zp(t, r, s) {
    var u = t.stateNode;
    if (!u) throw Error(o(169));
    s ? (t = Vp(t, r, qn), u.__reactInternalMemoizedMergedChildContext = t, Re(ct), Re(Je), Ee(Je, t)) : Re(ct), Ee(ct, s);
  }
  var an = null, as = !1, Zl = !1;
  function Bp(t) {
    an === null ? an = [t] : an.push(t);
  }
  function vx(t) {
    as = !0, Bp(t);
  }
  function En() {
    if (!Zl && an !== null) {
      Zl = !0;
      var t = 0, r = _e;
      try {
        var s = an;
        for (_e = 1; t < s.length; t++) {
          var u = s[t];
          do
            u = u(!0);
          while (u !== null);
        }
        an = null, as = !1;
      } catch (h) {
        throw an !== null && (an = an.slice(t + 1)), Uf(Sl, En), h;
      } finally {
        _e = r, Zl = !1;
      }
    }
    return null;
  }
  var Lr = [], Vr = 0, ls = null, us = 0, At = [], Ct = 0, Jn = null, ln = 1, un = "";
  function er(t, r) {
    Lr[Vr++] = us, Lr[Vr++] = ls, ls = t, us = r;
  }
  function $p(t, r, s) {
    At[Ct++] = ln, At[Ct++] = un, At[Ct++] = Jn, Jn = t;
    var u = ln;
    t = un;
    var h = 32 - It(u) - 1;
    u &= ~(1 << h), s += 1;
    var v = 32 - It(r) + h;
    if (30 < v) {
      var k = h - h % 5;
      v = (u & (1 << k) - 1).toString(32), u >>= k, h -= k, ln = 1 << 32 - It(r) + h | s << h | u, un = v + t;
    } else ln = 1 << v | s << h | u, un = t;
  }
  function ql(t) {
    t.return !== null && (er(t, 1), $p(t, 1, 0));
  }
  function Jl(t) {
    for (; t === ls; ) ls = Lr[--Vr], Lr[Vr] = null, us = Lr[--Vr], Lr[Vr] = null;
    for (; t === Jn; ) Jn = At[--Ct], At[Ct] = null, un = At[--Ct], At[Ct] = null, ln = At[--Ct], At[Ct] = null;
  }
  var xt = null, _t = null, De = !1, Ot = null;
  function Up(t, r) {
    var s = Mt(5, null, null, 0);
    s.elementType = "DELETED", s.stateNode = r, s.return = t, r = t.deletions, r === null ? (t.deletions = [s], t.flags |= 16) : r.push(s);
  }
  function Hp(t, r) {
    switch (t.tag) {
      case 5:
        var s = t.type;
        return r = r.nodeType !== 1 || s.toLowerCase() !== r.nodeName.toLowerCase() ? null : r, r !== null ? (t.stateNode = r, xt = t, _t = Cn(r.firstChild), !0) : !1;
      case 6:
        return r = t.pendingProps === "" || r.nodeType !== 3 ? null : r, r !== null ? (t.stateNode = r, xt = t, _t = null, !0) : !1;
      case 13:
        return r = r.nodeType !== 8 ? null : r, r !== null ? (s = Jn !== null ? { id: ln, overflow: un } : null, t.memoizedState = { dehydrated: r, treeContext: s, retryLane: 1073741824 }, s = Mt(18, null, null, 0), s.stateNode = r, s.return = t, t.child = s, xt = t, _t = null, !0) : !1;
      default:
        return !1;
    }
  }
  function eu(t) {
    return (t.mode & 1) !== 0 && (t.flags & 128) === 0;
  }
  function tu(t) {
    if (De) {
      var r = _t;
      if (r) {
        var s = r;
        if (!Hp(t, r)) {
          if (eu(t)) throw Error(o(418));
          r = Cn(s.nextSibling);
          var u = xt;
          r && Hp(t, r) ? Up(u, s) : (t.flags = t.flags & -4097 | 2, De = !1, xt = t);
        }
      } else {
        if (eu(t)) throw Error(o(418));
        t.flags = t.flags & -4097 | 2, De = !1, xt = t;
      }
    }
  }
  function Wp(t) {
    for (t = t.return; t !== null && t.tag !== 5 && t.tag !== 3 && t.tag !== 13; ) t = t.return;
    xt = t;
  }
  function cs(t) {
    if (t !== xt) return !1;
    if (!De) return Wp(t), De = !0, !1;
    var r;
    if ((r = t.tag !== 3) && !(r = t.tag !== 5) && (r = t.type, r = r !== "head" && r !== "body" && !Gl(t.type, t.memoizedProps)), r && (r = _t)) {
      if (eu(t)) throw Gp(), Error(o(418));
      for (; r; ) Up(t, r), r = Cn(r.nextSibling);
    }
    if (Wp(t), t.tag === 13) {
      if (t = t.memoizedState, t = t !== null ? t.dehydrated : null, !t) throw Error(o(317));
      e: {
        for (t = t.nextSibling, r = 0; t; ) {
          if (t.nodeType === 8) {
            var s = t.data;
            if (s === "/$") {
              if (r === 0) {
                _t = Cn(t.nextSibling);
                break e;
              }
              r--;
            } else s !== "$" && s !== "$!" && s !== "$?" || r++;
          }
          t = t.nextSibling;
        }
        _t = null;
      }
    } else _t = xt ? Cn(t.stateNode.nextSibling) : null;
    return !0;
  }
  function Gp() {
    for (var t = _t; t; ) t = Cn(t.nextSibling);
  }
  function zr() {
    _t = xt = null, De = !1;
  }
  function nu(t) {
    Ot === null ? Ot = [t] : Ot.push(t);
  }
  var Sx = D.ReactCurrentBatchConfig;
  function Bo(t, r, s) {
    if (t = s.ref, t !== null && typeof t != "function" && typeof t != "object") {
      if (s._owner) {
        if (s = s._owner, s) {
          if (s.tag !== 1) throw Error(o(309));
          var u = s.stateNode;
        }
        if (!u) throw Error(o(147, t));
        var h = u, v = "" + t;
        return r !== null && r.ref !== null && typeof r.ref == "function" && r.ref._stringRef === v ? r.ref : (r = function(k) {
          var P = h.refs;
          k === null ? delete P[v] : P[v] = k;
        }, r._stringRef = v, r);
      }
      if (typeof t != "string") throw Error(o(284));
      if (!s._owner) throw Error(o(290, t));
    }
    return t;
  }
  function ds(t, r) {
    throw t = Object.prototype.toString.call(r), Error(o(31, t === "[object Object]" ? "object with keys {" + Object.keys(r).join(", ") + "}" : t));
  }
  function Kp(t) {
    var r = t._init;
    return r(t._payload);
  }
  function Yp(t) {
    function r(j, R) {
      if (t) {
        var I = j.deletions;
        I === null ? (j.deletions = [R], j.flags |= 16) : I.push(R);
      }
    }
    function s(j, R) {
      if (!t) return null;
      for (; R !== null; ) r(j, R), R = R.sibling;
      return null;
    }
    function u(j, R) {
      for (j = /* @__PURE__ */ new Map(); R !== null; ) R.key !== null ? j.set(R.key, R) : j.set(R.index, R), R = R.sibling;
      return j;
    }
    function h(j, R) {
      return j = On(j, R), j.index = 0, j.sibling = null, j;
    }
    function v(j, R, I) {
      return j.index = I, t ? (I = j.alternate, I !== null ? (I = I.index, I < R ? (j.flags |= 2, R) : I) : (j.flags |= 2, R)) : (j.flags |= 1048576, R);
    }
    function k(j) {
      return t && j.alternate === null && (j.flags |= 2), j;
    }
    function P(j, R, I, K) {
      return R === null || R.tag !== 6 ? (R = Ku(I, j.mode, K), R.return = j, R) : (R = h(R, I), R.return = j, R);
    }
    function M(j, R, I, K) {
      var oe = I.type;
      return oe === W ? $(j, R, I.props.children, K, I.key) : R !== null && (R.elementType === oe || typeof oe == "object" && oe !== null && oe.$$typeof === ae && Kp(oe) === R.type) ? (K = h(R, I.props), K.ref = Bo(j, R, I), K.return = j, K) : (K = Is(I.type, I.key, I.props, null, j.mode, K), K.ref = Bo(j, R, I), K.return = j, K);
    }
    function F(j, R, I, K) {
      return R === null || R.tag !== 4 || R.stateNode.containerInfo !== I.containerInfo || R.stateNode.implementation !== I.implementation ? (R = Yu(I, j.mode, K), R.return = j, R) : (R = h(R, I.children || []), R.return = j, R);
    }
    function $(j, R, I, K, oe) {
      return R === null || R.tag !== 7 ? (R = lr(I, j.mode, K, oe), R.return = j, R) : (R = h(R, I), R.return = j, R);
    }
    function U(j, R, I) {
      if (typeof R == "string" && R !== "" || typeof R == "number") return R = Ku("" + R, j.mode, I), R.return = j, R;
      if (typeof R == "object" && R !== null) {
        switch (R.$$typeof) {
          case L:
            return I = Is(R.type, R.key, R.props, null, j.mode, I), I.ref = Bo(j, null, R), I.return = j, I;
          case G:
            return R = Yu(R, j.mode, I), R.return = j, R;
          case ae:
            var K = R._init;
            return U(j, K(R._payload), I);
        }
        if (yo(R) || Z(R)) return R = lr(R, j.mode, I, null), R.return = j, R;
        ds(j, R);
      }
      return null;
    }
    function B(j, R, I, K) {
      var oe = R !== null ? R.key : null;
      if (typeof I == "string" && I !== "" || typeof I == "number") return oe !== null ? null : P(j, R, "" + I, K);
      if (typeof I == "object" && I !== null) {
        switch (I.$$typeof) {
          case L:
            return I.key === oe ? M(j, R, I, K) : null;
          case G:
            return I.key === oe ? F(j, R, I, K) : null;
          case ae:
            return oe = I._init, B(
              j,
              R,
              oe(I._payload),
              K
            );
        }
        if (yo(I) || Z(I)) return oe !== null ? null : $(j, R, I, K, null);
        ds(j, I);
      }
      return null;
    }
    function q(j, R, I, K, oe) {
      if (typeof K == "string" && K !== "" || typeof K == "number") return j = j.get(I) || null, P(R, j, "" + K, oe);
      if (typeof K == "object" && K !== null) {
        switch (K.$$typeof) {
          case L:
            return j = j.get(K.key === null ? I : K.key) || null, M(R, j, K, oe);
          case G:
            return j = j.get(K.key === null ? I : K.key) || null, F(R, j, K, oe);
          case ae:
            var ie = K._init;
            return q(j, R, I, ie(K._payload), oe);
        }
        if (yo(K) || Z(K)) return j = j.get(I) || null, $(R, j, K, oe, null);
        ds(R, K);
      }
      return null;
    }
    function te(j, R, I, K) {
      for (var oe = null, ie = null, se = R, ue = R = 0, Ye = null; se !== null && ue < I.length; ue++) {
        se.index > ue ? (Ye = se, se = null) : Ye = se.sibling;
        var we = B(j, se, I[ue], K);
        if (we === null) {
          se === null && (se = Ye);
          break;
        }
        t && se && we.alternate === null && r(j, se), R = v(we, R, ue), ie === null ? oe = we : ie.sibling = we, ie = we, se = Ye;
      }
      if (ue === I.length) return s(j, se), De && er(j, ue), oe;
      if (se === null) {
        for (; ue < I.length; ue++) se = U(j, I[ue], K), se !== null && (R = v(se, R, ue), ie === null ? oe = se : ie.sibling = se, ie = se);
        return De && er(j, ue), oe;
      }
      for (se = u(j, se); ue < I.length; ue++) Ye = q(se, j, ue, I[ue], K), Ye !== null && (t && Ye.alternate !== null && se.delete(Ye.key === null ? ue : Ye.key), R = v(Ye, R, ue), ie === null ? oe = Ye : ie.sibling = Ye, ie = Ye);
      return t && se.forEach(function(Ln) {
        return r(j, Ln);
      }), De && er(j, ue), oe;
    }
    function re(j, R, I, K) {
      var oe = Z(I);
      if (typeof oe != "function") throw Error(o(150));
      if (I = oe.call(I), I == null) throw Error(o(151));
      for (var ie = oe = null, se = R, ue = R = 0, Ye = null, we = I.next(); se !== null && !we.done; ue++, we = I.next()) {
        se.index > ue ? (Ye = se, se = null) : Ye = se.sibling;
        var Ln = B(j, se, we.value, K);
        if (Ln === null) {
          se === null && (se = Ye);
          break;
        }
        t && se && Ln.alternate === null && r(j, se), R = v(Ln, R, ue), ie === null ? oe = Ln : ie.sibling = Ln, ie = Ln, se = Ye;
      }
      if (we.done) return s(
        j,
        se
      ), De && er(j, ue), oe;
      if (se === null) {
        for (; !we.done; ue++, we = I.next()) we = U(j, we.value, K), we !== null && (R = v(we, R, ue), ie === null ? oe = we : ie.sibling = we, ie = we);
        return De && er(j, ue), oe;
      }
      for (se = u(j, se); !we.done; ue++, we = I.next()) we = q(se, j, ue, we.value, K), we !== null && (t && we.alternate !== null && se.delete(we.key === null ? ue : we.key), R = v(we, R, ue), ie === null ? oe = we : ie.sibling = we, ie = we);
      return t && se.forEach(function(qx) {
        return r(j, qx);
      }), De && er(j, ue), oe;
    }
    function Ve(j, R, I, K) {
      if (typeof I == "object" && I !== null && I.type === W && I.key === null && (I = I.props.children), typeof I == "object" && I !== null) {
        switch (I.$$typeof) {
          case L:
            e: {
              for (var oe = I.key, ie = R; ie !== null; ) {
                if (ie.key === oe) {
                  if (oe = I.type, oe === W) {
                    if (ie.tag === 7) {
                      s(j, ie.sibling), R = h(ie, I.props.children), R.return = j, j = R;
                      break e;
                    }
                  } else if (ie.elementType === oe || typeof oe == "object" && oe !== null && oe.$$typeof === ae && Kp(oe) === ie.type) {
                    s(j, ie.sibling), R = h(ie, I.props), R.ref = Bo(j, ie, I), R.return = j, j = R;
                    break e;
                  }
                  s(j, ie);
                  break;
                } else r(j, ie);
                ie = ie.sibling;
              }
              I.type === W ? (R = lr(I.props.children, j.mode, K, I.key), R.return = j, j = R) : (K = Is(I.type, I.key, I.props, null, j.mode, K), K.ref = Bo(j, R, I), K.return = j, j = K);
            }
            return k(j);
          case G:
            e: {
              for (ie = I.key; R !== null; ) {
                if (R.key === ie) if (R.tag === 4 && R.stateNode.containerInfo === I.containerInfo && R.stateNode.implementation === I.implementation) {
                  s(j, R.sibling), R = h(R, I.children || []), R.return = j, j = R;
                  break e;
                } else {
                  s(j, R);
                  break;
                }
                else r(j, R);
                R = R.sibling;
              }
              R = Yu(I, j.mode, K), R.return = j, j = R;
            }
            return k(j);
          case ae:
            return ie = I._init, Ve(j, R, ie(I._payload), K);
        }
        if (yo(I)) return te(j, R, I, K);
        if (Z(I)) return re(j, R, I, K);
        ds(j, I);
      }
      return typeof I == "string" && I !== "" || typeof I == "number" ? (I = "" + I, R !== null && R.tag === 6 ? (s(j, R.sibling), R = h(R, I), R.return = j, j = R) : (s(j, R), R = Ku(I, j.mode, K), R.return = j, j = R), k(j)) : s(j, R);
    }
    return Ve;
  }
  var Br = Yp(!0), Qp = Yp(!1), fs = bn(null), ps = null, $r = null, ru = null;
  function ou() {
    ru = $r = ps = null;
  }
  function iu(t) {
    var r = fs.current;
    Re(fs), t._currentValue = r;
  }
  function su(t, r, s) {
    for (; t !== null; ) {
      var u = t.alternate;
      if ((t.childLanes & r) !== r ? (t.childLanes |= r, u !== null && (u.childLanes |= r)) : u !== null && (u.childLanes & r) !== r && (u.childLanes |= r), t === s) break;
      t = t.return;
    }
  }
  function Ur(t, r) {
    ps = t, ru = $r = null, t = t.dependencies, t !== null && t.firstContext !== null && ((t.lanes & r) !== 0 && (ft = !0), t.firstContext = null);
  }
  function bt(t) {
    var r = t._currentValue;
    if (ru !== t) if (t = { context: t, memoizedValue: r, next: null }, $r === null) {
      if (ps === null) throw Error(o(308));
      $r = t, ps.dependencies = { lanes: 0, firstContext: t };
    } else $r = $r.next = t;
    return r;
  }
  var tr = null;
  function au(t) {
    tr === null ? tr = [t] : tr.push(t);
  }
  function Xp(t, r, s, u) {
    var h = r.interleaved;
    return h === null ? (s.next = s, au(r)) : (s.next = h.next, h.next = s), r.interleaved = s, cn(t, u);
  }
  function cn(t, r) {
    t.lanes |= r;
    var s = t.alternate;
    for (s !== null && (s.lanes |= r), s = t, t = t.return; t !== null; ) t.childLanes |= r, s = t.alternate, s !== null && (s.childLanes |= r), s = t, t = t.return;
    return s.tag === 3 ? s.stateNode : null;
  }
  var Mn = !1;
  function lu(t) {
    t.updateQueue = { baseState: t.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
  }
  function Zp(t, r) {
    t = t.updateQueue, r.updateQueue === t && (r.updateQueue = { baseState: t.baseState, firstBaseUpdate: t.firstBaseUpdate, lastBaseUpdate: t.lastBaseUpdate, shared: t.shared, effects: t.effects });
  }
  function dn(t, r) {
    return { eventTime: t, lane: r, tag: 0, payload: null, callback: null, next: null };
  }
  function Rn(t, r, s) {
    var u = t.updateQueue;
    if (u === null) return null;
    if (u = u.shared, (ge & 2) !== 0) {
      var h = u.pending;
      return h === null ? r.next = r : (r.next = h.next, h.next = r), u.pending = r, cn(t, s);
    }
    return h = u.interleaved, h === null ? (r.next = r, au(u)) : (r.next = h.next, h.next = r), u.interleaved = r, cn(t, s);
  }
  function ms(t, r, s) {
    if (r = r.updateQueue, r !== null && (r = r.shared, (s & 4194240) !== 0)) {
      var u = r.lanes;
      u &= t.pendingLanes, s |= u, r.lanes = s, _l(t, s);
    }
  }
  function qp(t, r) {
    var s = t.updateQueue, u = t.alternate;
    if (u !== null && (u = u.updateQueue, s === u)) {
      var h = null, v = null;
      if (s = s.firstBaseUpdate, s !== null) {
        do {
          var k = { eventTime: s.eventTime, lane: s.lane, tag: s.tag, payload: s.payload, callback: s.callback, next: null };
          v === null ? h = v = k : v = v.next = k, s = s.next;
        } while (s !== null);
        v === null ? h = v = r : v = v.next = r;
      } else h = v = r;
      s = { baseState: u.baseState, firstBaseUpdate: h, lastBaseUpdate: v, shared: u.shared, effects: u.effects }, t.updateQueue = s;
      return;
    }
    t = s.lastBaseUpdate, t === null ? s.firstBaseUpdate = r : t.next = r, s.lastBaseUpdate = r;
  }
  function hs(t, r, s, u) {
    var h = t.updateQueue;
    Mn = !1;
    var v = h.firstBaseUpdate, k = h.lastBaseUpdate, P = h.shared.pending;
    if (P !== null) {
      h.shared.pending = null;
      var M = P, F = M.next;
      M.next = null, k === null ? v = F : k.next = F, k = M;
      var $ = t.alternate;
      $ !== null && ($ = $.updateQueue, P = $.lastBaseUpdate, P !== k && (P === null ? $.firstBaseUpdate = F : P.next = F, $.lastBaseUpdate = M));
    }
    if (v !== null) {
      var U = h.baseState;
      k = 0, $ = F = M = null, P = v;
      do {
        var B = P.lane, q = P.eventTime;
        if ((u & B) === B) {
          $ !== null && ($ = $.next = {
            eventTime: q,
            lane: 0,
            tag: P.tag,
            payload: P.payload,
            callback: P.callback,
            next: null
          });
          e: {
            var te = t, re = P;
            switch (B = r, q = s, re.tag) {
              case 1:
                if (te = re.payload, typeof te == "function") {
                  U = te.call(q, U, B);
                  break e;
                }
                U = te;
                break e;
              case 3:
                te.flags = te.flags & -65537 | 128;
              case 0:
                if (te = re.payload, B = typeof te == "function" ? te.call(q, U, B) : te, B == null) break e;
                U = Q({}, U, B);
                break e;
              case 2:
                Mn = !0;
            }
          }
          P.callback !== null && P.lane !== 0 && (t.flags |= 64, B = h.effects, B === null ? h.effects = [P] : B.push(P));
        } else q = { eventTime: q, lane: B, tag: P.tag, payload: P.payload, callback: P.callback, next: null }, $ === null ? (F = $ = q, M = U) : $ = $.next = q, k |= B;
        if (P = P.next, P === null) {
          if (P = h.shared.pending, P === null) break;
          B = P, P = B.next, B.next = null, h.lastBaseUpdate = B, h.shared.pending = null;
        }
      } while (!0);
      if ($ === null && (M = U), h.baseState = M, h.firstBaseUpdate = F, h.lastBaseUpdate = $, r = h.shared.interleaved, r !== null) {
        h = r;
        do
          k |= h.lane, h = h.next;
        while (h !== r);
      } else v === null && (h.shared.lanes = 0);
      or |= k, t.lanes = k, t.memoizedState = U;
    }
  }
  function Jp(t, r, s) {
    if (t = r.effects, r.effects = null, t !== null) for (r = 0; r < t.length; r++) {
      var u = t[r], h = u.callback;
      if (h !== null) {
        if (u.callback = null, u = s, typeof h != "function") throw Error(o(191, h));
        h.call(u);
      }
    }
  }
  var $o = {}, Qt = bn($o), Uo = bn($o), Ho = bn($o);
  function nr(t) {
    if (t === $o) throw Error(o(174));
    return t;
  }
  function uu(t, r) {
    switch (Ee(Ho, r), Ee(Uo, t), Ee(Qt, $o), t = r.nodeType, t) {
      case 9:
      case 11:
        r = (r = r.documentElement) ? r.namespaceURI : cl(null, "");
        break;
      default:
        t = t === 8 ? r.parentNode : r, r = t.namespaceURI || null, t = t.tagName, r = cl(r, t);
    }
    Re(Qt), Ee(Qt, r);
  }
  function Hr() {
    Re(Qt), Re(Uo), Re(Ho);
  }
  function em(t) {
    nr(Ho.current);
    var r = nr(Qt.current), s = cl(r, t.type);
    r !== s && (Ee(Uo, t), Ee(Qt, s));
  }
  function cu(t) {
    Uo.current === t && (Re(Qt), Re(Uo));
  }
  var je = bn(0);
  function ys(t) {
    for (var r = t; r !== null; ) {
      if (r.tag === 13) {
        var s = r.memoizedState;
        if (s !== null && (s = s.dehydrated, s === null || s.data === "$?" || s.data === "$!")) return r;
      } else if (r.tag === 19 && r.memoizedProps.revealOrder !== void 0) {
        if ((r.flags & 128) !== 0) return r;
      } else if (r.child !== null) {
        r.child.return = r, r = r.child;
        continue;
      }
      if (r === t) break;
      for (; r.sibling === null; ) {
        if (r.return === null || r.return === t) return null;
        r = r.return;
      }
      r.sibling.return = r.return, r = r.sibling;
    }
    return null;
  }
  var du = [];
  function fu() {
    for (var t = 0; t < du.length; t++) du[t]._workInProgressVersionPrimary = null;
    du.length = 0;
  }
  var gs = D.ReactCurrentDispatcher, pu = D.ReactCurrentBatchConfig, rr = 0, Ie = null, $e = null, Ge = null, vs = !1, Wo = !1, Go = 0, wx = 0;
  function et() {
    throw Error(o(321));
  }
  function mu(t, r) {
    if (r === null) return !1;
    for (var s = 0; s < r.length && s < t.length; s++) if (!Ft(t[s], r[s])) return !1;
    return !0;
  }
  function hu(t, r, s, u, h, v) {
    if (rr = v, Ie = r, r.memoizedState = null, r.updateQueue = null, r.lanes = 0, gs.current = t === null || t.memoizedState === null ? kx : Ax, t = s(u, h), Wo) {
      v = 0;
      do {
        if (Wo = !1, Go = 0, 25 <= v) throw Error(o(301));
        v += 1, Ge = $e = null, r.updateQueue = null, gs.current = Cx, t = s(u, h);
      } while (Wo);
    }
    if (gs.current = xs, r = $e !== null && $e.next !== null, rr = 0, Ge = $e = Ie = null, vs = !1, r) throw Error(o(300));
    return t;
  }
  function yu() {
    var t = Go !== 0;
    return Go = 0, t;
  }
  function Xt() {
    var t = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
    return Ge === null ? Ie.memoizedState = Ge = t : Ge = Ge.next = t, Ge;
  }
  function Pt() {
    if ($e === null) {
      var t = Ie.alternate;
      t = t !== null ? t.memoizedState : null;
    } else t = $e.next;
    var r = Ge === null ? Ie.memoizedState : Ge.next;
    if (r !== null) Ge = r, $e = t;
    else {
      if (t === null) throw Error(o(310));
      $e = t, t = { memoizedState: $e.memoizedState, baseState: $e.baseState, baseQueue: $e.baseQueue, queue: $e.queue, next: null }, Ge === null ? Ie.memoizedState = Ge = t : Ge = Ge.next = t;
    }
    return Ge;
  }
  function Ko(t, r) {
    return typeof r == "function" ? r(t) : r;
  }
  function gu(t) {
    var r = Pt(), s = r.queue;
    if (s === null) throw Error(o(311));
    s.lastRenderedReducer = t;
    var u = $e, h = u.baseQueue, v = s.pending;
    if (v !== null) {
      if (h !== null) {
        var k = h.next;
        h.next = v.next, v.next = k;
      }
      u.baseQueue = h = v, s.pending = null;
    }
    if (h !== null) {
      v = h.next, u = u.baseState;
      var P = k = null, M = null, F = v;
      do {
        var $ = F.lane;
        if ((rr & $) === $) M !== null && (M = M.next = { lane: 0, action: F.action, hasEagerState: F.hasEagerState, eagerState: F.eagerState, next: null }), u = F.hasEagerState ? F.eagerState : t(u, F.action);
        else {
          var U = {
            lane: $,
            action: F.action,
            hasEagerState: F.hasEagerState,
            eagerState: F.eagerState,
            next: null
          };
          M === null ? (P = M = U, k = u) : M = M.next = U, Ie.lanes |= $, or |= $;
        }
        F = F.next;
      } while (F !== null && F !== v);
      M === null ? k = u : M.next = P, Ft(u, r.memoizedState) || (ft = !0), r.memoizedState = u, r.baseState = k, r.baseQueue = M, s.lastRenderedState = u;
    }
    if (t = s.interleaved, t !== null) {
      h = t;
      do
        v = h.lane, Ie.lanes |= v, or |= v, h = h.next;
      while (h !== t);
    } else h === null && (s.lanes = 0);
    return [r.memoizedState, s.dispatch];
  }
  function vu(t) {
    var r = Pt(), s = r.queue;
    if (s === null) throw Error(o(311));
    s.lastRenderedReducer = t;
    var u = s.dispatch, h = s.pending, v = r.memoizedState;
    if (h !== null) {
      s.pending = null;
      var k = h = h.next;
      do
        v = t(v, k.action), k = k.next;
      while (k !== h);
      Ft(v, r.memoizedState) || (ft = !0), r.memoizedState = v, r.baseQueue === null && (r.baseState = v), s.lastRenderedState = v;
    }
    return [v, u];
  }
  function tm() {
  }
  function nm(t, r) {
    var s = Ie, u = Pt(), h = r(), v = !Ft(u.memoizedState, h);
    if (v && (u.memoizedState = h, ft = !0), u = u.queue, Su(im.bind(null, s, u, t), [t]), u.getSnapshot !== r || v || Ge !== null && Ge.memoizedState.tag & 1) {
      if (s.flags |= 2048, Yo(9, om.bind(null, s, u, h, r), void 0, null), Ke === null) throw Error(o(349));
      (rr & 30) !== 0 || rm(s, r, h);
    }
    return h;
  }
  function rm(t, r, s) {
    t.flags |= 16384, t = { getSnapshot: r, value: s }, r = Ie.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, Ie.updateQueue = r, r.stores = [t]) : (s = r.stores, s === null ? r.stores = [t] : s.push(t));
  }
  function om(t, r, s, u) {
    r.value = s, r.getSnapshot = u, sm(r) && am(t);
  }
  function im(t, r, s) {
    return s(function() {
      sm(r) && am(t);
    });
  }
  function sm(t) {
    var r = t.getSnapshot;
    t = t.value;
    try {
      var s = r();
      return !Ft(t, s);
    } catch {
      return !0;
    }
  }
  function am(t) {
    var r = cn(t, 1);
    r !== null && Bt(r, t, 1, -1);
  }
  function lm(t) {
    var r = Xt();
    return typeof t == "function" && (t = t()), r.memoizedState = r.baseState = t, t = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: Ko, lastRenderedState: t }, r.queue = t, t = t.dispatch = Tx.bind(null, Ie, t), [r.memoizedState, t];
  }
  function Yo(t, r, s, u) {
    return t = { tag: t, create: r, destroy: s, deps: u, next: null }, r = Ie.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, Ie.updateQueue = r, r.lastEffect = t.next = t) : (s = r.lastEffect, s === null ? r.lastEffect = t.next = t : (u = s.next, s.next = t, t.next = u, r.lastEffect = t)), t;
  }
  function um() {
    return Pt().memoizedState;
  }
  function Ss(t, r, s, u) {
    var h = Xt();
    Ie.flags |= t, h.memoizedState = Yo(1 | r, s, void 0, u === void 0 ? null : u);
  }
  function ws(t, r, s, u) {
    var h = Pt();
    u = u === void 0 ? null : u;
    var v = void 0;
    if ($e !== null) {
      var k = $e.memoizedState;
      if (v = k.destroy, u !== null && mu(u, k.deps)) {
        h.memoizedState = Yo(r, s, v, u);
        return;
      }
    }
    Ie.flags |= t, h.memoizedState = Yo(1 | r, s, v, u);
  }
  function cm(t, r) {
    return Ss(8390656, 8, t, r);
  }
  function Su(t, r) {
    return ws(2048, 8, t, r);
  }
  function dm(t, r) {
    return ws(4, 2, t, r);
  }
  function fm(t, r) {
    return ws(4, 4, t, r);
  }
  function pm(t, r) {
    if (typeof r == "function") return t = t(), r(t), function() {
      r(null);
    };
    if (r != null) return t = t(), r.current = t, function() {
      r.current = null;
    };
  }
  function mm(t, r, s) {
    return s = s != null ? s.concat([t]) : null, ws(4, 4, pm.bind(null, r, t), s);
  }
  function wu() {
  }
  function hm(t, r) {
    var s = Pt();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && mu(r, u[1]) ? u[0] : (s.memoizedState = [t, r], t);
  }
  function ym(t, r) {
    var s = Pt();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && mu(r, u[1]) ? u[0] : (t = t(), s.memoizedState = [t, r], t);
  }
  function gm(t, r, s) {
    return (rr & 21) === 0 ? (t.baseState && (t.baseState = !1, ft = !0), t.memoizedState = s) : (Ft(s, r) || (s = Kf(), Ie.lanes |= s, or |= s, t.baseState = !0), r);
  }
  function xx(t, r) {
    var s = _e;
    _e = s !== 0 && 4 > s ? s : 4, t(!0);
    var u = pu.transition;
    pu.transition = {};
    try {
      t(!1), r();
    } finally {
      _e = s, pu.transition = u;
    }
  }
  function vm() {
    return Pt().memoizedState;
  }
  function _x(t, r, s) {
    var u = In(t);
    if (s = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null }, Sm(t)) wm(r, s);
    else if (s = Xp(t, r, s, u), s !== null) {
      var h = st();
      Bt(s, t, u, h), xm(s, r, u);
    }
  }
  function Tx(t, r, s) {
    var u = In(t), h = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null };
    if (Sm(t)) wm(r, h);
    else {
      var v = t.alternate;
      if (t.lanes === 0 && (v === null || v.lanes === 0) && (v = r.lastRenderedReducer, v !== null)) try {
        var k = r.lastRenderedState, P = v(k, s);
        if (h.hasEagerState = !0, h.eagerState = P, Ft(P, k)) {
          var M = r.interleaved;
          M === null ? (h.next = h, au(r)) : (h.next = M.next, M.next = h), r.interleaved = h;
          return;
        }
      } catch {
      } finally {
      }
      s = Xp(t, r, h, u), s !== null && (h = st(), Bt(s, t, u, h), xm(s, r, u));
    }
  }
  function Sm(t) {
    var r = t.alternate;
    return t === Ie || r !== null && r === Ie;
  }
  function wm(t, r) {
    Wo = vs = !0;
    var s = t.pending;
    s === null ? r.next = r : (r.next = s.next, s.next = r), t.pending = r;
  }
  function xm(t, r, s) {
    if ((s & 4194240) !== 0) {
      var u = r.lanes;
      u &= t.pendingLanes, s |= u, r.lanes = s, _l(t, s);
    }
  }
  var xs = { readContext: bt, useCallback: et, useContext: et, useEffect: et, useImperativeHandle: et, useInsertionEffect: et, useLayoutEffect: et, useMemo: et, useReducer: et, useRef: et, useState: et, useDebugValue: et, useDeferredValue: et, useTransition: et, useMutableSource: et, useSyncExternalStore: et, useId: et, unstable_isNewReconciler: !1 }, kx = { readContext: bt, useCallback: function(t, r) {
    return Xt().memoizedState = [t, r === void 0 ? null : r], t;
  }, useContext: bt, useEffect: cm, useImperativeHandle: function(t, r, s) {
    return s = s != null ? s.concat([t]) : null, Ss(
      4194308,
      4,
      pm.bind(null, r, t),
      s
    );
  }, useLayoutEffect: function(t, r) {
    return Ss(4194308, 4, t, r);
  }, useInsertionEffect: function(t, r) {
    return Ss(4, 2, t, r);
  }, useMemo: function(t, r) {
    var s = Xt();
    return r = r === void 0 ? null : r, t = t(), s.memoizedState = [t, r], t;
  }, useReducer: function(t, r, s) {
    var u = Xt();
    return r = s !== void 0 ? s(r) : r, u.memoizedState = u.baseState = r, t = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: t, lastRenderedState: r }, u.queue = t, t = t.dispatch = _x.bind(null, Ie, t), [u.memoizedState, t];
  }, useRef: function(t) {
    var r = Xt();
    return t = { current: t }, r.memoizedState = t;
  }, useState: lm, useDebugValue: wu, useDeferredValue: function(t) {
    return Xt().memoizedState = t;
  }, useTransition: function() {
    var t = lm(!1), r = t[0];
    return t = xx.bind(null, t[1]), Xt().memoizedState = t, [r, t];
  }, useMutableSource: function() {
  }, useSyncExternalStore: function(t, r, s) {
    var u = Ie, h = Xt();
    if (De) {
      if (s === void 0) throw Error(o(407));
      s = s();
    } else {
      if (s = r(), Ke === null) throw Error(o(349));
      (rr & 30) !== 0 || rm(u, r, s);
    }
    h.memoizedState = s;
    var v = { value: s, getSnapshot: r };
    return h.queue = v, cm(im.bind(
      null,
      u,
      v,
      t
    ), [t]), u.flags |= 2048, Yo(9, om.bind(null, u, v, s, r), void 0, null), s;
  }, useId: function() {
    var t = Xt(), r = Ke.identifierPrefix;
    if (De) {
      var s = un, u = ln;
      s = (u & ~(1 << 32 - It(u) - 1)).toString(32) + s, r = ":" + r + "R" + s, s = Go++, 0 < s && (r += "H" + s.toString(32)), r += ":";
    } else s = wx++, r = ":" + r + "r" + s.toString(32) + ":";
    return t.memoizedState = r;
  }, unstable_isNewReconciler: !1 }, Ax = {
    readContext: bt,
    useCallback: hm,
    useContext: bt,
    useEffect: Su,
    useImperativeHandle: mm,
    useInsertionEffect: dm,
    useLayoutEffect: fm,
    useMemo: ym,
    useReducer: gu,
    useRef: um,
    useState: function() {
      return gu(Ko);
    },
    useDebugValue: wu,
    useDeferredValue: function(t) {
      var r = Pt();
      return gm(r, $e.memoizedState, t);
    },
    useTransition: function() {
      var t = gu(Ko)[0], r = Pt().memoizedState;
      return [t, r];
    },
    useMutableSource: tm,
    useSyncExternalStore: nm,
    useId: vm,
    unstable_isNewReconciler: !1
  }, Cx = { readContext: bt, useCallback: hm, useContext: bt, useEffect: Su, useImperativeHandle: mm, useInsertionEffect: dm, useLayoutEffect: fm, useMemo: ym, useReducer: vu, useRef: um, useState: function() {
    return vu(Ko);
  }, useDebugValue: wu, useDeferredValue: function(t) {
    var r = Pt();
    return $e === null ? r.memoizedState = t : gm(r, $e.memoizedState, t);
  }, useTransition: function() {
    var t = vu(Ko)[0], r = Pt().memoizedState;
    return [t, r];
  }, useMutableSource: tm, useSyncExternalStore: nm, useId: vm, unstable_isNewReconciler: !1 };
  function Lt(t, r) {
    if (t && t.defaultProps) {
      r = Q({}, r), t = t.defaultProps;
      for (var s in t) r[s] === void 0 && (r[s] = t[s]);
      return r;
    }
    return r;
  }
  function xu(t, r, s, u) {
    r = t.memoizedState, s = s(u, r), s = s == null ? r : Q({}, r, s), t.memoizedState = s, t.lanes === 0 && (t.updateQueue.baseState = s);
  }
  var _s = { isMounted: function(t) {
    return (t = t._reactInternals) ? Xn(t) === t : !1;
  }, enqueueSetState: function(t, r, s) {
    t = t._reactInternals;
    var u = st(), h = In(t), v = dn(u, h);
    v.payload = r, s != null && (v.callback = s), r = Rn(t, v, h), r !== null && (Bt(r, t, h, u), ms(r, t, h));
  }, enqueueReplaceState: function(t, r, s) {
    t = t._reactInternals;
    var u = st(), h = In(t), v = dn(u, h);
    v.tag = 1, v.payload = r, s != null && (v.callback = s), r = Rn(t, v, h), r !== null && (Bt(r, t, h, u), ms(r, t, h));
  }, enqueueForceUpdate: function(t, r) {
    t = t._reactInternals;
    var s = st(), u = In(t), h = dn(s, u);
    h.tag = 2, r != null && (h.callback = r), r = Rn(t, h, u), r !== null && (Bt(r, t, u, s), ms(r, t, u));
  } };
  function _m(t, r, s, u, h, v, k) {
    return t = t.stateNode, typeof t.shouldComponentUpdate == "function" ? t.shouldComponentUpdate(u, v, k) : r.prototype && r.prototype.isPureReactComponent ? !jo(s, u) || !jo(h, v) : !0;
  }
  function Tm(t, r, s) {
    var u = !1, h = Pn, v = r.contextType;
    return typeof v == "object" && v !== null ? v = bt(v) : (h = dt(r) ? qn : Je.current, u = r.contextTypes, v = (u = u != null) ? Or(t, h) : Pn), r = new r(s, v), t.memoizedState = r.state !== null && r.state !== void 0 ? r.state : null, r.updater = _s, t.stateNode = r, r._reactInternals = t, u && (t = t.stateNode, t.__reactInternalMemoizedUnmaskedChildContext = h, t.__reactInternalMemoizedMaskedChildContext = v), r;
  }
  function km(t, r, s, u) {
    t = r.state, typeof r.componentWillReceiveProps == "function" && r.componentWillReceiveProps(s, u), typeof r.UNSAFE_componentWillReceiveProps == "function" && r.UNSAFE_componentWillReceiveProps(s, u), r.state !== t && _s.enqueueReplaceState(r, r.state, null);
  }
  function _u(t, r, s, u) {
    var h = t.stateNode;
    h.props = s, h.state = t.memoizedState, h.refs = {}, lu(t);
    var v = r.contextType;
    typeof v == "object" && v !== null ? h.context = bt(v) : (v = dt(r) ? qn : Je.current, h.context = Or(t, v)), h.state = t.memoizedState, v = r.getDerivedStateFromProps, typeof v == "function" && (xu(t, r, v, s), h.state = t.memoizedState), typeof r.getDerivedStateFromProps == "function" || typeof h.getSnapshotBeforeUpdate == "function" || typeof h.UNSAFE_componentWillMount != "function" && typeof h.componentWillMount != "function" || (r = h.state, typeof h.componentWillMount == "function" && h.componentWillMount(), typeof h.UNSAFE_componentWillMount == "function" && h.UNSAFE_componentWillMount(), r !== h.state && _s.enqueueReplaceState(h, h.state, null), hs(t, s, h, u), h.state = t.memoizedState), typeof h.componentDidMount == "function" && (t.flags |= 4194308);
  }
  function Wr(t, r) {
    try {
      var s = "", u = r;
      do
        s += ve(u), u = u.return;
      while (u);
      var h = s;
    } catch (v) {
      h = `
Error generating stack: ` + v.message + `
` + v.stack;
    }
    return { value: t, source: r, stack: h, digest: null };
  }
  function Tu(t, r, s) {
    return { value: t, source: null, stack: s ?? null, digest: r ?? null };
  }
  function ku(t, r) {
    try {
      console.error(r.value);
    } catch (s) {
      setTimeout(function() {
        throw s;
      });
    }
  }
  var bx = typeof WeakMap == "function" ? WeakMap : Map;
  function Am(t, r, s) {
    s = dn(-1, s), s.tag = 3, s.payload = { element: null };
    var u = r.value;
    return s.callback = function() {
      Es || (Es = !0, Vu = u), ku(t, r);
    }, s;
  }
  function Cm(t, r, s) {
    s = dn(-1, s), s.tag = 3;
    var u = t.type.getDerivedStateFromError;
    if (typeof u == "function") {
      var h = r.value;
      s.payload = function() {
        return u(h);
      }, s.callback = function() {
        ku(t, r);
      };
    }
    var v = t.stateNode;
    return v !== null && typeof v.componentDidCatch == "function" && (s.callback = function() {
      ku(t, r), typeof u != "function" && (Dn === null ? Dn = /* @__PURE__ */ new Set([this]) : Dn.add(this));
      var k = r.stack;
      this.componentDidCatch(r.value, { componentStack: k !== null ? k : "" });
    }), s;
  }
  function bm(t, r, s) {
    var u = t.pingCache;
    if (u === null) {
      u = t.pingCache = new bx();
      var h = /* @__PURE__ */ new Set();
      u.set(r, h);
    } else h = u.get(r), h === void 0 && (h = /* @__PURE__ */ new Set(), u.set(r, h));
    h.has(s) || (h.add(s), t = Bx.bind(null, t, r, s), r.then(t, t));
  }
  function Pm(t) {
    do {
      var r;
      if ((r = t.tag === 13) && (r = t.memoizedState, r = r !== null ? r.dehydrated !== null : !0), r) return t;
      t = t.return;
    } while (t !== null);
    return null;
  }
  function Em(t, r, s, u, h) {
    return (t.mode & 1) === 0 ? (t === r ? t.flags |= 65536 : (t.flags |= 128, s.flags |= 131072, s.flags &= -52805, s.tag === 1 && (s.alternate === null ? s.tag = 17 : (r = dn(-1, 1), r.tag = 2, Rn(s, r, 1))), s.lanes |= 1), t) : (t.flags |= 65536, t.lanes = h, t);
  }
  var Px = D.ReactCurrentOwner, ft = !1;
  function it(t, r, s, u) {
    r.child = t === null ? Qp(r, null, s, u) : Br(r, t.child, s, u);
  }
  function Mm(t, r, s, u, h) {
    s = s.render;
    var v = r.ref;
    return Ur(r, h), u = hu(t, r, s, u, v, h), s = yu(), t !== null && !ft ? (r.updateQueue = t.updateQueue, r.flags &= -2053, t.lanes &= ~h, fn(t, r, h)) : (De && s && ql(r), r.flags |= 1, it(t, r, u, h), r.child);
  }
  function Rm(t, r, s, u, h) {
    if (t === null) {
      var v = s.type;
      return typeof v == "function" && !Gu(v) && v.defaultProps === void 0 && s.compare === null && s.defaultProps === void 0 ? (r.tag = 15, r.type = v, Nm(t, r, v, u, h)) : (t = Is(s.type, null, u, r, r.mode, h), t.ref = r.ref, t.return = r, r.child = t);
    }
    if (v = t.child, (t.lanes & h) === 0) {
      var k = v.memoizedProps;
      if (s = s.compare, s = s !== null ? s : jo, s(k, u) && t.ref === r.ref) return fn(t, r, h);
    }
    return r.flags |= 1, t = On(v, u), t.ref = r.ref, t.return = r, r.child = t;
  }
  function Nm(t, r, s, u, h) {
    if (t !== null) {
      var v = t.memoizedProps;
      if (jo(v, u) && t.ref === r.ref) if (ft = !1, r.pendingProps = u = v, (t.lanes & h) !== 0) (t.flags & 131072) !== 0 && (ft = !0);
      else return r.lanes = t.lanes, fn(t, r, h);
    }
    return Au(t, r, s, u, h);
  }
  function Dm(t, r, s) {
    var u = r.pendingProps, h = u.children, v = t !== null ? t.memoizedState : null;
    if (u.mode === "hidden") if ((r.mode & 1) === 0) r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, Ee(Kr, Tt), Tt |= s;
    else {
      if ((s & 1073741824) === 0) return t = v !== null ? v.baseLanes | s : s, r.lanes = r.childLanes = 1073741824, r.memoizedState = { baseLanes: t, cachePool: null, transitions: null }, r.updateQueue = null, Ee(Kr, Tt), Tt |= t, null;
      r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, u = v !== null ? v.baseLanes : s, Ee(Kr, Tt), Tt |= u;
    }
    else v !== null ? (u = v.baseLanes | s, r.memoizedState = null) : u = s, Ee(Kr, Tt), Tt |= u;
    return it(t, r, h, s), r.child;
  }
  function jm(t, r) {
    var s = r.ref;
    (t === null && s !== null || t !== null && t.ref !== s) && (r.flags |= 512, r.flags |= 2097152);
  }
  function Au(t, r, s, u, h) {
    var v = dt(s) ? qn : Je.current;
    return v = Or(r, v), Ur(r, h), s = hu(t, r, s, u, v, h), u = yu(), t !== null && !ft ? (r.updateQueue = t.updateQueue, r.flags &= -2053, t.lanes &= ~h, fn(t, r, h)) : (De && u && ql(r), r.flags |= 1, it(t, r, s, h), r.child);
  }
  function Im(t, r, s, u, h) {
    if (dt(s)) {
      var v = !0;
      ss(r);
    } else v = !1;
    if (Ur(r, h), r.stateNode === null) ks(t, r), Tm(r, s, u), _u(r, s, u, h), u = !0;
    else if (t === null) {
      var k = r.stateNode, P = r.memoizedProps;
      k.props = P;
      var M = k.context, F = s.contextType;
      typeof F == "object" && F !== null ? F = bt(F) : (F = dt(s) ? qn : Je.current, F = Or(r, F));
      var $ = s.getDerivedStateFromProps, U = typeof $ == "function" || typeof k.getSnapshotBeforeUpdate == "function";
      U || typeof k.UNSAFE_componentWillReceiveProps != "function" && typeof k.componentWillReceiveProps != "function" || (P !== u || M !== F) && km(r, k, u, F), Mn = !1;
      var B = r.memoizedState;
      k.state = B, hs(r, u, k, h), M = r.memoizedState, P !== u || B !== M || ct.current || Mn ? (typeof $ == "function" && (xu(r, s, $, u), M = r.memoizedState), (P = Mn || _m(r, s, P, u, B, M, F)) ? (U || typeof k.UNSAFE_componentWillMount != "function" && typeof k.componentWillMount != "function" || (typeof k.componentWillMount == "function" && k.componentWillMount(), typeof k.UNSAFE_componentWillMount == "function" && k.UNSAFE_componentWillMount()), typeof k.componentDidMount == "function" && (r.flags |= 4194308)) : (typeof k.componentDidMount == "function" && (r.flags |= 4194308), r.memoizedProps = u, r.memoizedState = M), k.props = u, k.state = M, k.context = F, u = P) : (typeof k.componentDidMount == "function" && (r.flags |= 4194308), u = !1);
    } else {
      k = r.stateNode, Zp(t, r), P = r.memoizedProps, F = r.type === r.elementType ? P : Lt(r.type, P), k.props = F, U = r.pendingProps, B = k.context, M = s.contextType, typeof M == "object" && M !== null ? M = bt(M) : (M = dt(s) ? qn : Je.current, M = Or(r, M));
      var q = s.getDerivedStateFromProps;
      ($ = typeof q == "function" || typeof k.getSnapshotBeforeUpdate == "function") || typeof k.UNSAFE_componentWillReceiveProps != "function" && typeof k.componentWillReceiveProps != "function" || (P !== U || B !== M) && km(r, k, u, M), Mn = !1, B = r.memoizedState, k.state = B, hs(r, u, k, h);
      var te = r.memoizedState;
      P !== U || B !== te || ct.current || Mn ? (typeof q == "function" && (xu(r, s, q, u), te = r.memoizedState), (F = Mn || _m(r, s, F, u, B, te, M) || !1) ? ($ || typeof k.UNSAFE_componentWillUpdate != "function" && typeof k.componentWillUpdate != "function" || (typeof k.componentWillUpdate == "function" && k.componentWillUpdate(u, te, M), typeof k.UNSAFE_componentWillUpdate == "function" && k.UNSAFE_componentWillUpdate(u, te, M)), typeof k.componentDidUpdate == "function" && (r.flags |= 4), typeof k.getSnapshotBeforeUpdate == "function" && (r.flags |= 1024)) : (typeof k.componentDidUpdate != "function" || P === t.memoizedProps && B === t.memoizedState || (r.flags |= 4), typeof k.getSnapshotBeforeUpdate != "function" || P === t.memoizedProps && B === t.memoizedState || (r.flags |= 1024), r.memoizedProps = u, r.memoizedState = te), k.props = u, k.state = te, k.context = M, u = F) : (typeof k.componentDidUpdate != "function" || P === t.memoizedProps && B === t.memoizedState || (r.flags |= 4), typeof k.getSnapshotBeforeUpdate != "function" || P === t.memoizedProps && B === t.memoizedState || (r.flags |= 1024), u = !1);
    }
    return Cu(t, r, s, u, v, h);
  }
  function Cu(t, r, s, u, h, v) {
    jm(t, r);
    var k = (r.flags & 128) !== 0;
    if (!u && !k) return h && zp(r, s, !1), fn(t, r, v);
    u = r.stateNode, Px.current = r;
    var P = k && typeof s.getDerivedStateFromError != "function" ? null : u.render();
    return r.flags |= 1, t !== null && k ? (r.child = Br(r, t.child, null, v), r.child = Br(r, null, P, v)) : it(t, r, P, v), r.memoizedState = u.state, h && zp(r, s, !0), r.child;
  }
  function Fm(t) {
    var r = t.stateNode;
    r.pendingContext ? Lp(t, r.pendingContext, r.pendingContext !== r.context) : r.context && Lp(t, r.context, !1), uu(t, r.containerInfo);
  }
  function Om(t, r, s, u, h) {
    return zr(), nu(h), r.flags |= 256, it(t, r, s, u), r.child;
  }
  var bu = { dehydrated: null, treeContext: null, retryLane: 0 };
  function Pu(t) {
    return { baseLanes: t, cachePool: null, transitions: null };
  }
  function Lm(t, r, s) {
    var u = r.pendingProps, h = je.current, v = !1, k = (r.flags & 128) !== 0, P;
    if ((P = k) || (P = t !== null && t.memoizedState === null ? !1 : (h & 2) !== 0), P ? (v = !0, r.flags &= -129) : (t === null || t.memoizedState !== null) && (h |= 1), Ee(je, h & 1), t === null)
      return tu(r), t = r.memoizedState, t !== null && (t = t.dehydrated, t !== null) ? ((r.mode & 1) === 0 ? r.lanes = 1 : t.data === "$!" ? r.lanes = 8 : r.lanes = 1073741824, null) : (k = u.children, t = u.fallback, v ? (u = r.mode, v = r.child, k = { mode: "hidden", children: k }, (u & 1) === 0 && v !== null ? (v.childLanes = 0, v.pendingProps = k) : v = Fs(k, u, 0, null), t = lr(t, u, s, null), v.return = r, t.return = r, v.sibling = t, r.child = v, r.child.memoizedState = Pu(s), r.memoizedState = bu, t) : Eu(r, k));
    if (h = t.memoizedState, h !== null && (P = h.dehydrated, P !== null)) return Ex(t, r, k, u, P, h, s);
    if (v) {
      v = u.fallback, k = r.mode, h = t.child, P = h.sibling;
      var M = { mode: "hidden", children: u.children };
      return (k & 1) === 0 && r.child !== h ? (u = r.child, u.childLanes = 0, u.pendingProps = M, r.deletions = null) : (u = On(h, M), u.subtreeFlags = h.subtreeFlags & 14680064), P !== null ? v = On(P, v) : (v = lr(v, k, s, null), v.flags |= 2), v.return = r, u.return = r, u.sibling = v, r.child = u, u = v, v = r.child, k = t.child.memoizedState, k = k === null ? Pu(s) : { baseLanes: k.baseLanes | s, cachePool: null, transitions: k.transitions }, v.memoizedState = k, v.childLanes = t.childLanes & ~s, r.memoizedState = bu, u;
    }
    return v = t.child, t = v.sibling, u = On(v, { mode: "visible", children: u.children }), (r.mode & 1) === 0 && (u.lanes = s), u.return = r, u.sibling = null, t !== null && (s = r.deletions, s === null ? (r.deletions = [t], r.flags |= 16) : s.push(t)), r.child = u, r.memoizedState = null, u;
  }
  function Eu(t, r) {
    return r = Fs({ mode: "visible", children: r }, t.mode, 0, null), r.return = t, t.child = r;
  }
  function Ts(t, r, s, u) {
    return u !== null && nu(u), Br(r, t.child, null, s), t = Eu(r, r.pendingProps.children), t.flags |= 2, r.memoizedState = null, t;
  }
  function Ex(t, r, s, u, h, v, k) {
    if (s)
      return r.flags & 256 ? (r.flags &= -257, u = Tu(Error(o(422))), Ts(t, r, k, u)) : r.memoizedState !== null ? (r.child = t.child, r.flags |= 128, null) : (v = u.fallback, h = r.mode, u = Fs({ mode: "visible", children: u.children }, h, 0, null), v = lr(v, h, k, null), v.flags |= 2, u.return = r, v.return = r, u.sibling = v, r.child = u, (r.mode & 1) !== 0 && Br(r, t.child, null, k), r.child.memoizedState = Pu(k), r.memoizedState = bu, v);
    if ((r.mode & 1) === 0) return Ts(t, r, k, null);
    if (h.data === "$!") {
      if (u = h.nextSibling && h.nextSibling.dataset, u) var P = u.dgst;
      return u = P, v = Error(o(419)), u = Tu(v, u, void 0), Ts(t, r, k, u);
    }
    if (P = (k & t.childLanes) !== 0, ft || P) {
      if (u = Ke, u !== null) {
        switch (k & -k) {
          case 4:
            h = 2;
            break;
          case 16:
            h = 8;
            break;
          case 64:
          case 128:
          case 256:
          case 512:
          case 1024:
          case 2048:
          case 4096:
          case 8192:
          case 16384:
          case 32768:
          case 65536:
          case 131072:
          case 262144:
          case 524288:
          case 1048576:
          case 2097152:
          case 4194304:
          case 8388608:
          case 16777216:
          case 33554432:
          case 67108864:
            h = 32;
            break;
          case 536870912:
            h = 268435456;
            break;
          default:
            h = 0;
        }
        h = (h & (u.suspendedLanes | k)) !== 0 ? 0 : h, h !== 0 && h !== v.retryLane && (v.retryLane = h, cn(t, h), Bt(u, t, h, -1));
      }
      return Wu(), u = Tu(Error(o(421))), Ts(t, r, k, u);
    }
    return h.data === "$?" ? (r.flags |= 128, r.child = t.child, r = $x.bind(null, t), h._reactRetry = r, null) : (t = v.treeContext, _t = Cn(h.nextSibling), xt = r, De = !0, Ot = null, t !== null && (At[Ct++] = ln, At[Ct++] = un, At[Ct++] = Jn, ln = t.id, un = t.overflow, Jn = r), r = Eu(r, u.children), r.flags |= 4096, r);
  }
  function Vm(t, r, s) {
    t.lanes |= r;
    var u = t.alternate;
    u !== null && (u.lanes |= r), su(t.return, r, s);
  }
  function Mu(t, r, s, u, h) {
    var v = t.memoizedState;
    v === null ? t.memoizedState = { isBackwards: r, rendering: null, renderingStartTime: 0, last: u, tail: s, tailMode: h } : (v.isBackwards = r, v.rendering = null, v.renderingStartTime = 0, v.last = u, v.tail = s, v.tailMode = h);
  }
  function zm(t, r, s) {
    var u = r.pendingProps, h = u.revealOrder, v = u.tail;
    if (it(t, r, u.children, s), u = je.current, (u & 2) !== 0) u = u & 1 | 2, r.flags |= 128;
    else {
      if (t !== null && (t.flags & 128) !== 0) e: for (t = r.child; t !== null; ) {
        if (t.tag === 13) t.memoizedState !== null && Vm(t, s, r);
        else if (t.tag === 19) Vm(t, s, r);
        else if (t.child !== null) {
          t.child.return = t, t = t.child;
          continue;
        }
        if (t === r) break e;
        for (; t.sibling === null; ) {
          if (t.return === null || t.return === r) break e;
          t = t.return;
        }
        t.sibling.return = t.return, t = t.sibling;
      }
      u &= 1;
    }
    if (Ee(je, u), (r.mode & 1) === 0) r.memoizedState = null;
    else switch (h) {
      case "forwards":
        for (s = r.child, h = null; s !== null; ) t = s.alternate, t !== null && ys(t) === null && (h = s), s = s.sibling;
        s = h, s === null ? (h = r.child, r.child = null) : (h = s.sibling, s.sibling = null), Mu(r, !1, h, s, v);
        break;
      case "backwards":
        for (s = null, h = r.child, r.child = null; h !== null; ) {
          if (t = h.alternate, t !== null && ys(t) === null) {
            r.child = h;
            break;
          }
          t = h.sibling, h.sibling = s, s = h, h = t;
        }
        Mu(r, !0, s, null, v);
        break;
      case "together":
        Mu(r, !1, null, null, void 0);
        break;
      default:
        r.memoizedState = null;
    }
    return r.child;
  }
  function ks(t, r) {
    (r.mode & 1) === 0 && t !== null && (t.alternate = null, r.alternate = null, r.flags |= 2);
  }
  function fn(t, r, s) {
    if (t !== null && (r.dependencies = t.dependencies), or |= r.lanes, (s & r.childLanes) === 0) return null;
    if (t !== null && r.child !== t.child) throw Error(o(153));
    if (r.child !== null) {
      for (t = r.child, s = On(t, t.pendingProps), r.child = s, s.return = r; t.sibling !== null; ) t = t.sibling, s = s.sibling = On(t, t.pendingProps), s.return = r;
      s.sibling = null;
    }
    return r.child;
  }
  function Mx(t, r, s) {
    switch (r.tag) {
      case 3:
        Fm(r), zr();
        break;
      case 5:
        em(r);
        break;
      case 1:
        dt(r.type) && ss(r);
        break;
      case 4:
        uu(r, r.stateNode.containerInfo);
        break;
      case 10:
        var u = r.type._context, h = r.memoizedProps.value;
        Ee(fs, u._currentValue), u._currentValue = h;
        break;
      case 13:
        if (u = r.memoizedState, u !== null)
          return u.dehydrated !== null ? (Ee(je, je.current & 1), r.flags |= 128, null) : (s & r.child.childLanes) !== 0 ? Lm(t, r, s) : (Ee(je, je.current & 1), t = fn(t, r, s), t !== null ? t.sibling : null);
        Ee(je, je.current & 1);
        break;
      case 19:
        if (u = (s & r.childLanes) !== 0, (t.flags & 128) !== 0) {
          if (u) return zm(t, r, s);
          r.flags |= 128;
        }
        if (h = r.memoizedState, h !== null && (h.rendering = null, h.tail = null, h.lastEffect = null), Ee(je, je.current), u) break;
        return null;
      case 22:
      case 23:
        return r.lanes = 0, Dm(t, r, s);
    }
    return fn(t, r, s);
  }
  var Bm, Ru, $m, Um;
  Bm = function(t, r) {
    for (var s = r.child; s !== null; ) {
      if (s.tag === 5 || s.tag === 6) t.appendChild(s.stateNode);
      else if (s.tag !== 4 && s.child !== null) {
        s.child.return = s, s = s.child;
        continue;
      }
      if (s === r) break;
      for (; s.sibling === null; ) {
        if (s.return === null || s.return === r) return;
        s = s.return;
      }
      s.sibling.return = s.return, s = s.sibling;
    }
  }, Ru = function() {
  }, $m = function(t, r, s, u) {
    var h = t.memoizedProps;
    if (h !== u) {
      t = r.stateNode, nr(Qt.current);
      var v = null;
      switch (s) {
        case "input":
          h = sl(t, h), u = sl(t, u), v = [];
          break;
        case "select":
          h = Q({}, h, { value: void 0 }), u = Q({}, u, { value: void 0 }), v = [];
          break;
        case "textarea":
          h = ul(t, h), u = ul(t, u), v = [];
          break;
        default:
          typeof h.onClick != "function" && typeof u.onClick == "function" && (t.onclick = rs);
      }
      dl(s, u);
      var k;
      s = null;
      for (F in h) if (!u.hasOwnProperty(F) && h.hasOwnProperty(F) && h[F] != null) if (F === "style") {
        var P = h[F];
        for (k in P) P.hasOwnProperty(k) && (s || (s = {}), s[k] = "");
      } else F !== "dangerouslySetInnerHTML" && F !== "children" && F !== "suppressContentEditableWarning" && F !== "suppressHydrationWarning" && F !== "autoFocus" && (a.hasOwnProperty(F) ? v || (v = []) : (v = v || []).push(F, null));
      for (F in u) {
        var M = u[F];
        if (P = h != null ? h[F] : void 0, u.hasOwnProperty(F) && M !== P && (M != null || P != null)) if (F === "style") if (P) {
          for (k in P) !P.hasOwnProperty(k) || M && M.hasOwnProperty(k) || (s || (s = {}), s[k] = "");
          for (k in M) M.hasOwnProperty(k) && P[k] !== M[k] && (s || (s = {}), s[k] = M[k]);
        } else s || (v || (v = []), v.push(
          F,
          s
        )), s = M;
        else F === "dangerouslySetInnerHTML" ? (M = M ? M.__html : void 0, P = P ? P.__html : void 0, M != null && P !== M && (v = v || []).push(F, M)) : F === "children" ? typeof M != "string" && typeof M != "number" || (v = v || []).push(F, "" + M) : F !== "suppressContentEditableWarning" && F !== "suppressHydrationWarning" && (a.hasOwnProperty(F) ? (M != null && F === "onScroll" && Me("scroll", t), v || P === M || (v = [])) : (v = v || []).push(F, M));
      }
      s && (v = v || []).push("style", s);
      var F = v;
      (r.updateQueue = F) && (r.flags |= 4);
    }
  }, Um = function(t, r, s, u) {
    s !== u && (r.flags |= 4);
  };
  function Qo(t, r) {
    if (!De) switch (t.tailMode) {
      case "hidden":
        r = t.tail;
        for (var s = null; r !== null; ) r.alternate !== null && (s = r), r = r.sibling;
        s === null ? t.tail = null : s.sibling = null;
        break;
      case "collapsed":
        s = t.tail;
        for (var u = null; s !== null; ) s.alternate !== null && (u = s), s = s.sibling;
        u === null ? r || t.tail === null ? t.tail = null : t.tail.sibling = null : u.sibling = null;
    }
  }
  function tt(t) {
    var r = t.alternate !== null && t.alternate.child === t.child, s = 0, u = 0;
    if (r) for (var h = t.child; h !== null; ) s |= h.lanes | h.childLanes, u |= h.subtreeFlags & 14680064, u |= h.flags & 14680064, h.return = t, h = h.sibling;
    else for (h = t.child; h !== null; ) s |= h.lanes | h.childLanes, u |= h.subtreeFlags, u |= h.flags, h.return = t, h = h.sibling;
    return t.subtreeFlags |= u, t.childLanes = s, r;
  }
  function Rx(t, r, s) {
    var u = r.pendingProps;
    switch (Jl(r), r.tag) {
      case 2:
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return tt(r), null;
      case 1:
        return dt(r.type) && is(), tt(r), null;
      case 3:
        return u = r.stateNode, Hr(), Re(ct), Re(Je), fu(), u.pendingContext && (u.context = u.pendingContext, u.pendingContext = null), (t === null || t.child === null) && (cs(r) ? r.flags |= 4 : t === null || t.memoizedState.isDehydrated && (r.flags & 256) === 0 || (r.flags |= 1024, Ot !== null && ($u(Ot), Ot = null))), Ru(t, r), tt(r), null;
      case 5:
        cu(r);
        var h = nr(Ho.current);
        if (s = r.type, t !== null && r.stateNode != null) $m(t, r, s, u, h), t.ref !== r.ref && (r.flags |= 512, r.flags |= 2097152);
        else {
          if (!u) {
            if (r.stateNode === null) throw Error(o(166));
            return tt(r), null;
          }
          if (t = nr(Qt.current), cs(r)) {
            u = r.stateNode, s = r.type;
            var v = r.memoizedProps;
            switch (u[Yt] = r, u[Vo] = v, t = (r.mode & 1) !== 0, s) {
              case "dialog":
                Me("cancel", u), Me("close", u);
                break;
              case "iframe":
              case "object":
              case "embed":
                Me("load", u);
                break;
              case "video":
              case "audio":
                for (h = 0; h < Fo.length; h++) Me(Fo[h], u);
                break;
              case "source":
                Me("error", u);
                break;
              case "img":
              case "image":
              case "link":
                Me(
                  "error",
                  u
                ), Me("load", u);
                break;
              case "details":
                Me("toggle", u);
                break;
              case "input":
                Tf(u, v), Me("invalid", u);
                break;
              case "select":
                u._wrapperState = { wasMultiple: !!v.multiple }, Me("invalid", u);
                break;
              case "textarea":
                Cf(u, v), Me("invalid", u);
            }
            dl(s, v), h = null;
            for (var k in v) if (v.hasOwnProperty(k)) {
              var P = v[k];
              k === "children" ? typeof P == "string" ? u.textContent !== P && (v.suppressHydrationWarning !== !0 && ns(u.textContent, P, t), h = ["children", P]) : typeof P == "number" && u.textContent !== "" + P && (v.suppressHydrationWarning !== !0 && ns(
                u.textContent,
                P,
                t
              ), h = ["children", "" + P]) : a.hasOwnProperty(k) && P != null && k === "onScroll" && Me("scroll", u);
            }
            switch (s) {
              case "input":
                Di(u), Af(u, v, !0);
                break;
              case "textarea":
                Di(u), Pf(u);
                break;
              case "select":
              case "option":
                break;
              default:
                typeof v.onClick == "function" && (u.onclick = rs);
            }
            u = h, r.updateQueue = u, u !== null && (r.flags |= 4);
          } else {
            k = h.nodeType === 9 ? h : h.ownerDocument, t === "http://www.w3.org/1999/xhtml" && (t = Ef(s)), t === "http://www.w3.org/1999/xhtml" ? s === "script" ? (t = k.createElement("div"), t.innerHTML = "<script><\/script>", t = t.removeChild(t.firstChild)) : typeof u.is == "string" ? t = k.createElement(s, { is: u.is }) : (t = k.createElement(s), s === "select" && (k = t, u.multiple ? k.multiple = !0 : u.size && (k.size = u.size))) : t = k.createElementNS(t, s), t[Yt] = r, t[Vo] = u, Bm(t, r, !1, !1), r.stateNode = t;
            e: {
              switch (k = fl(s, u), s) {
                case "dialog":
                  Me("cancel", t), Me("close", t), h = u;
                  break;
                case "iframe":
                case "object":
                case "embed":
                  Me("load", t), h = u;
                  break;
                case "video":
                case "audio":
                  for (h = 0; h < Fo.length; h++) Me(Fo[h], t);
                  h = u;
                  break;
                case "source":
                  Me("error", t), h = u;
                  break;
                case "img":
                case "image":
                case "link":
                  Me(
                    "error",
                    t
                  ), Me("load", t), h = u;
                  break;
                case "details":
                  Me("toggle", t), h = u;
                  break;
                case "input":
                  Tf(t, u), h = sl(t, u), Me("invalid", t);
                  break;
                case "option":
                  h = u;
                  break;
                case "select":
                  t._wrapperState = { wasMultiple: !!u.multiple }, h = Q({}, u, { value: void 0 }), Me("invalid", t);
                  break;
                case "textarea":
                  Cf(t, u), h = ul(t, u), Me("invalid", t);
                  break;
                default:
                  h = u;
              }
              dl(s, h), P = h;
              for (v in P) if (P.hasOwnProperty(v)) {
                var M = P[v];
                v === "style" ? Nf(t, M) : v === "dangerouslySetInnerHTML" ? (M = M ? M.__html : void 0, M != null && Mf(t, M)) : v === "children" ? typeof M == "string" ? (s !== "textarea" || M !== "") && go(t, M) : typeof M == "number" && go(t, "" + M) : v !== "suppressContentEditableWarning" && v !== "suppressHydrationWarning" && v !== "autoFocus" && (a.hasOwnProperty(v) ? M != null && v === "onScroll" && Me("scroll", t) : M != null && E(t, v, M, k));
              }
              switch (s) {
                case "input":
                  Di(t), Af(t, u, !1);
                  break;
                case "textarea":
                  Di(t), Pf(t);
                  break;
                case "option":
                  u.value != null && t.setAttribute("value", "" + xe(u.value));
                  break;
                case "select":
                  t.multiple = !!u.multiple, v = u.value, v != null ? Ar(t, !!u.multiple, v, !1) : u.defaultValue != null && Ar(
                    t,
                    !!u.multiple,
                    u.defaultValue,
                    !0
                  );
                  break;
                default:
                  typeof h.onClick == "function" && (t.onclick = rs);
              }
              switch (s) {
                case "button":
                case "input":
                case "select":
                case "textarea":
                  u = !!u.autoFocus;
                  break e;
                case "img":
                  u = !0;
                  break e;
                default:
                  u = !1;
              }
            }
            u && (r.flags |= 4);
          }
          r.ref !== null && (r.flags |= 512, r.flags |= 2097152);
        }
        return tt(r), null;
      case 6:
        if (t && r.stateNode != null) Um(t, r, t.memoizedProps, u);
        else {
          if (typeof u != "string" && r.stateNode === null) throw Error(o(166));
          if (s = nr(Ho.current), nr(Qt.current), cs(r)) {
            if (u = r.stateNode, s = r.memoizedProps, u[Yt] = r, (v = u.nodeValue !== s) && (t = xt, t !== null)) switch (t.tag) {
              case 3:
                ns(u.nodeValue, s, (t.mode & 1) !== 0);
                break;
              case 5:
                t.memoizedProps.suppressHydrationWarning !== !0 && ns(u.nodeValue, s, (t.mode & 1) !== 0);
            }
            v && (r.flags |= 4);
          } else u = (s.nodeType === 9 ? s : s.ownerDocument).createTextNode(u), u[Yt] = r, r.stateNode = u;
        }
        return tt(r), null;
      case 13:
        if (Re(je), u = r.memoizedState, t === null || t.memoizedState !== null && t.memoizedState.dehydrated !== null) {
          if (De && _t !== null && (r.mode & 1) !== 0 && (r.flags & 128) === 0) Gp(), zr(), r.flags |= 98560, v = !1;
          else if (v = cs(r), u !== null && u.dehydrated !== null) {
            if (t === null) {
              if (!v) throw Error(o(318));
              if (v = r.memoizedState, v = v !== null ? v.dehydrated : null, !v) throw Error(o(317));
              v[Yt] = r;
            } else zr(), (r.flags & 128) === 0 && (r.memoizedState = null), r.flags |= 4;
            tt(r), v = !1;
          } else Ot !== null && ($u(Ot), Ot = null), v = !0;
          if (!v) return r.flags & 65536 ? r : null;
        }
        return (r.flags & 128) !== 0 ? (r.lanes = s, r) : (u = u !== null, u !== (t !== null && t.memoizedState !== null) && u && (r.child.flags |= 8192, (r.mode & 1) !== 0 && (t === null || (je.current & 1) !== 0 ? Ue === 0 && (Ue = 3) : Wu())), r.updateQueue !== null && (r.flags |= 4), tt(r), null);
      case 4:
        return Hr(), Ru(t, r), t === null && Oo(r.stateNode.containerInfo), tt(r), null;
      case 10:
        return iu(r.type._context), tt(r), null;
      case 17:
        return dt(r.type) && is(), tt(r), null;
      case 19:
        if (Re(je), v = r.memoizedState, v === null) return tt(r), null;
        if (u = (r.flags & 128) !== 0, k = v.rendering, k === null) if (u) Qo(v, !1);
        else {
          if (Ue !== 0 || t !== null && (t.flags & 128) !== 0) for (t = r.child; t !== null; ) {
            if (k = ys(t), k !== null) {
              for (r.flags |= 128, Qo(v, !1), u = k.updateQueue, u !== null && (r.updateQueue = u, r.flags |= 4), r.subtreeFlags = 0, u = s, s = r.child; s !== null; ) v = s, t = u, v.flags &= 14680066, k = v.alternate, k === null ? (v.childLanes = 0, v.lanes = t, v.child = null, v.subtreeFlags = 0, v.memoizedProps = null, v.memoizedState = null, v.updateQueue = null, v.dependencies = null, v.stateNode = null) : (v.childLanes = k.childLanes, v.lanes = k.lanes, v.child = k.child, v.subtreeFlags = 0, v.deletions = null, v.memoizedProps = k.memoizedProps, v.memoizedState = k.memoizedState, v.updateQueue = k.updateQueue, v.type = k.type, t = k.dependencies, v.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }), s = s.sibling;
              return Ee(je, je.current & 1 | 2), r.child;
            }
            t = t.sibling;
          }
          v.tail !== null && Le() > Yr && (r.flags |= 128, u = !0, Qo(v, !1), r.lanes = 4194304);
        }
        else {
          if (!u) if (t = ys(k), t !== null) {
            if (r.flags |= 128, u = !0, s = t.updateQueue, s !== null && (r.updateQueue = s, r.flags |= 4), Qo(v, !0), v.tail === null && v.tailMode === "hidden" && !k.alternate && !De) return tt(r), null;
          } else 2 * Le() - v.renderingStartTime > Yr && s !== 1073741824 && (r.flags |= 128, u = !0, Qo(v, !1), r.lanes = 4194304);
          v.isBackwards ? (k.sibling = r.child, r.child = k) : (s = v.last, s !== null ? s.sibling = k : r.child = k, v.last = k);
        }
        return v.tail !== null ? (r = v.tail, v.rendering = r, v.tail = r.sibling, v.renderingStartTime = Le(), r.sibling = null, s = je.current, Ee(je, u ? s & 1 | 2 : s & 1), r) : (tt(r), null);
      case 22:
      case 23:
        return Hu(), u = r.memoizedState !== null, t !== null && t.memoizedState !== null !== u && (r.flags |= 8192), u && (r.mode & 1) !== 0 ? (Tt & 1073741824) !== 0 && (tt(r), r.subtreeFlags & 6 && (r.flags |= 8192)) : tt(r), null;
      case 24:
        return null;
      case 25:
        return null;
    }
    throw Error(o(156, r.tag));
  }
  function Nx(t, r) {
    switch (Jl(r), r.tag) {
      case 1:
        return dt(r.type) && is(), t = r.flags, t & 65536 ? (r.flags = t & -65537 | 128, r) : null;
      case 3:
        return Hr(), Re(ct), Re(Je), fu(), t = r.flags, (t & 65536) !== 0 && (t & 128) === 0 ? (r.flags = t & -65537 | 128, r) : null;
      case 5:
        return cu(r), null;
      case 13:
        if (Re(je), t = r.memoizedState, t !== null && t.dehydrated !== null) {
          if (r.alternate === null) throw Error(o(340));
          zr();
        }
        return t = r.flags, t & 65536 ? (r.flags = t & -65537 | 128, r) : null;
      case 19:
        return Re(je), null;
      case 4:
        return Hr(), null;
      case 10:
        return iu(r.type._context), null;
      case 22:
      case 23:
        return Hu(), null;
      case 24:
        return null;
      default:
        return null;
    }
  }
  var As = !1, nt = !1, Dx = typeof WeakSet == "function" ? WeakSet : Set, ee = null;
  function Gr(t, r) {
    var s = t.ref;
    if (s !== null) if (typeof s == "function") try {
      s(null);
    } catch (u) {
      Oe(t, r, u);
    }
    else s.current = null;
  }
  function Nu(t, r, s) {
    try {
      s();
    } catch (u) {
      Oe(t, r, u);
    }
  }
  var Hm = !1;
  function jx(t, r) {
    if (Hl = Wi, t = _p(), Fl(t)) {
      if ("selectionStart" in t) var s = { start: t.selectionStart, end: t.selectionEnd };
      else e: {
        s = (s = t.ownerDocument) && s.defaultView || window;
        var u = s.getSelection && s.getSelection();
        if (u && u.rangeCount !== 0) {
          s = u.anchorNode;
          var h = u.anchorOffset, v = u.focusNode;
          u = u.focusOffset;
          try {
            s.nodeType, v.nodeType;
          } catch {
            s = null;
            break e;
          }
          var k = 0, P = -1, M = -1, F = 0, $ = 0, U = t, B = null;
          t: for (; ; ) {
            for (var q; U !== s || h !== 0 && U.nodeType !== 3 || (P = k + h), U !== v || u !== 0 && U.nodeType !== 3 || (M = k + u), U.nodeType === 3 && (k += U.nodeValue.length), (q = U.firstChild) !== null; )
              B = U, U = q;
            for (; ; ) {
              if (U === t) break t;
              if (B === s && ++F === h && (P = k), B === v && ++$ === u && (M = k), (q = U.nextSibling) !== null) break;
              U = B, B = U.parentNode;
            }
            U = q;
          }
          s = P === -1 || M === -1 ? null : { start: P, end: M };
        } else s = null;
      }
      s = s || { start: 0, end: 0 };
    } else s = null;
    for (Wl = { focusedElem: t, selectionRange: s }, Wi = !1, ee = r; ee !== null; ) if (r = ee, t = r.child, (r.subtreeFlags & 1028) !== 0 && t !== null) t.return = r, ee = t;
    else for (; ee !== null; ) {
      r = ee;
      try {
        var te = r.alternate;
        if ((r.flags & 1024) !== 0) switch (r.tag) {
          case 0:
          case 11:
          case 15:
            break;
          case 1:
            if (te !== null) {
              var re = te.memoizedProps, Ve = te.memoizedState, j = r.stateNode, R = j.getSnapshotBeforeUpdate(r.elementType === r.type ? re : Lt(r.type, re), Ve);
              j.__reactInternalSnapshotBeforeUpdate = R;
            }
            break;
          case 3:
            var I = r.stateNode.containerInfo;
            I.nodeType === 1 ? I.textContent = "" : I.nodeType === 9 && I.documentElement && I.removeChild(I.documentElement);
            break;
          case 5:
          case 6:
          case 4:
          case 17:
            break;
          default:
            throw Error(o(163));
        }
      } catch (K) {
        Oe(r, r.return, K);
      }
      if (t = r.sibling, t !== null) {
        t.return = r.return, ee = t;
        break;
      }
      ee = r.return;
    }
    return te = Hm, Hm = !1, te;
  }
  function Xo(t, r, s) {
    var u = r.updateQueue;
    if (u = u !== null ? u.lastEffect : null, u !== null) {
      var h = u = u.next;
      do {
        if ((h.tag & t) === t) {
          var v = h.destroy;
          h.destroy = void 0, v !== void 0 && Nu(r, s, v);
        }
        h = h.next;
      } while (h !== u);
    }
  }
  function Cs(t, r) {
    if (r = r.updateQueue, r = r !== null ? r.lastEffect : null, r !== null) {
      var s = r = r.next;
      do {
        if ((s.tag & t) === t) {
          var u = s.create;
          s.destroy = u();
        }
        s = s.next;
      } while (s !== r);
    }
  }
  function Du(t) {
    var r = t.ref;
    if (r !== null) {
      var s = t.stateNode;
      switch (t.tag) {
        case 5:
          t = s;
          break;
        default:
          t = s;
      }
      typeof r == "function" ? r(t) : r.current = t;
    }
  }
  function Wm(t) {
    var r = t.alternate;
    r !== null && (t.alternate = null, Wm(r)), t.child = null, t.deletions = null, t.sibling = null, t.tag === 5 && (r = t.stateNode, r !== null && (delete r[Yt], delete r[Vo], delete r[Ql], delete r[yx], delete r[gx])), t.stateNode = null, t.return = null, t.dependencies = null, t.memoizedProps = null, t.memoizedState = null, t.pendingProps = null, t.stateNode = null, t.updateQueue = null;
  }
  function Gm(t) {
    return t.tag === 5 || t.tag === 3 || t.tag === 4;
  }
  function Km(t) {
    e: for (; ; ) {
      for (; t.sibling === null; ) {
        if (t.return === null || Gm(t.return)) return null;
        t = t.return;
      }
      for (t.sibling.return = t.return, t = t.sibling; t.tag !== 5 && t.tag !== 6 && t.tag !== 18; ) {
        if (t.flags & 2 || t.child === null || t.tag === 4) continue e;
        t.child.return = t, t = t.child;
      }
      if (!(t.flags & 2)) return t.stateNode;
    }
  }
  function ju(t, r, s) {
    var u = t.tag;
    if (u === 5 || u === 6) t = t.stateNode, r ? s.nodeType === 8 ? s.parentNode.insertBefore(t, r) : s.insertBefore(t, r) : (s.nodeType === 8 ? (r = s.parentNode, r.insertBefore(t, s)) : (r = s, r.appendChild(t)), s = s._reactRootContainer, s != null || r.onclick !== null || (r.onclick = rs));
    else if (u !== 4 && (t = t.child, t !== null)) for (ju(t, r, s), t = t.sibling; t !== null; ) ju(t, r, s), t = t.sibling;
  }
  function Iu(t, r, s) {
    var u = t.tag;
    if (u === 5 || u === 6) t = t.stateNode, r ? s.insertBefore(t, r) : s.appendChild(t);
    else if (u !== 4 && (t = t.child, t !== null)) for (Iu(t, r, s), t = t.sibling; t !== null; ) Iu(t, r, s), t = t.sibling;
  }
  var Xe = null, Vt = !1;
  function Nn(t, r, s) {
    for (s = s.child; s !== null; ) Ym(t, r, s), s = s.sibling;
  }
  function Ym(t, r, s) {
    if (Kt && typeof Kt.onCommitFiberUnmount == "function") try {
      Kt.onCommitFiberUnmount(Vi, s);
    } catch {
    }
    switch (s.tag) {
      case 5:
        nt || Gr(s, r);
      case 6:
        var u = Xe, h = Vt;
        Xe = null, Nn(t, r, s), Xe = u, Vt = h, Xe !== null && (Vt ? (t = Xe, s = s.stateNode, t.nodeType === 8 ? t.parentNode.removeChild(s) : t.removeChild(s)) : Xe.removeChild(s.stateNode));
        break;
      case 18:
        Xe !== null && (Vt ? (t = Xe, s = s.stateNode, t.nodeType === 8 ? Yl(t.parentNode, s) : t.nodeType === 1 && Yl(t, s), Po(t)) : Yl(Xe, s.stateNode));
        break;
      case 4:
        u = Xe, h = Vt, Xe = s.stateNode.containerInfo, Vt = !0, Nn(t, r, s), Xe = u, Vt = h;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        if (!nt && (u = s.updateQueue, u !== null && (u = u.lastEffect, u !== null))) {
          h = u = u.next;
          do {
            var v = h, k = v.destroy;
            v = v.tag, k !== void 0 && ((v & 2) !== 0 || (v & 4) !== 0) && Nu(s, r, k), h = h.next;
          } while (h !== u);
        }
        Nn(t, r, s);
        break;
      case 1:
        if (!nt && (Gr(s, r), u = s.stateNode, typeof u.componentWillUnmount == "function")) try {
          u.props = s.memoizedProps, u.state = s.memoizedState, u.componentWillUnmount();
        } catch (P) {
          Oe(s, r, P);
        }
        Nn(t, r, s);
        break;
      case 21:
        Nn(t, r, s);
        break;
      case 22:
        s.mode & 1 ? (nt = (u = nt) || s.memoizedState !== null, Nn(t, r, s), nt = u) : Nn(t, r, s);
        break;
      default:
        Nn(t, r, s);
    }
  }
  function Qm(t) {
    var r = t.updateQueue;
    if (r !== null) {
      t.updateQueue = null;
      var s = t.stateNode;
      s === null && (s = t.stateNode = new Dx()), r.forEach(function(u) {
        var h = Ux.bind(null, t, u);
        s.has(u) || (s.add(u), u.then(h, h));
      });
    }
  }
  function zt(t, r) {
    var s = r.deletions;
    if (s !== null) for (var u = 0; u < s.length; u++) {
      var h = s[u];
      try {
        var v = t, k = r, P = k;
        e: for (; P !== null; ) {
          switch (P.tag) {
            case 5:
              Xe = P.stateNode, Vt = !1;
              break e;
            case 3:
              Xe = P.stateNode.containerInfo, Vt = !0;
              break e;
            case 4:
              Xe = P.stateNode.containerInfo, Vt = !0;
              break e;
          }
          P = P.return;
        }
        if (Xe === null) throw Error(o(160));
        Ym(v, k, h), Xe = null, Vt = !1;
        var M = h.alternate;
        M !== null && (M.return = null), h.return = null;
      } catch (F) {
        Oe(h, r, F);
      }
    }
    if (r.subtreeFlags & 12854) for (r = r.child; r !== null; ) Xm(r, t), r = r.sibling;
  }
  function Xm(t, r) {
    var s = t.alternate, u = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (zt(r, t), Zt(t), u & 4) {
          try {
            Xo(3, t, t.return), Cs(3, t);
          } catch (re) {
            Oe(t, t.return, re);
          }
          try {
            Xo(5, t, t.return);
          } catch (re) {
            Oe(t, t.return, re);
          }
        }
        break;
      case 1:
        zt(r, t), Zt(t), u & 512 && s !== null && Gr(s, s.return);
        break;
      case 5:
        if (zt(r, t), Zt(t), u & 512 && s !== null && Gr(s, s.return), t.flags & 32) {
          var h = t.stateNode;
          try {
            go(h, "");
          } catch (re) {
            Oe(t, t.return, re);
          }
        }
        if (u & 4 && (h = t.stateNode, h != null)) {
          var v = t.memoizedProps, k = s !== null ? s.memoizedProps : v, P = t.type, M = t.updateQueue;
          if (t.updateQueue = null, M !== null) try {
            P === "input" && v.type === "radio" && v.name != null && kf(h, v), fl(P, k);
            var F = fl(P, v);
            for (k = 0; k < M.length; k += 2) {
              var $ = M[k], U = M[k + 1];
              $ === "style" ? Nf(h, U) : $ === "dangerouslySetInnerHTML" ? Mf(h, U) : $ === "children" ? go(h, U) : E(h, $, U, F);
            }
            switch (P) {
              case "input":
                al(h, v);
                break;
              case "textarea":
                bf(h, v);
                break;
              case "select":
                var B = h._wrapperState.wasMultiple;
                h._wrapperState.wasMultiple = !!v.multiple;
                var q = v.value;
                q != null ? Ar(h, !!v.multiple, q, !1) : B !== !!v.multiple && (v.defaultValue != null ? Ar(
                  h,
                  !!v.multiple,
                  v.defaultValue,
                  !0
                ) : Ar(h, !!v.multiple, v.multiple ? [] : "", !1));
            }
            h[Vo] = v;
          } catch (re) {
            Oe(t, t.return, re);
          }
        }
        break;
      case 6:
        if (zt(r, t), Zt(t), u & 4) {
          if (t.stateNode === null) throw Error(o(162));
          h = t.stateNode, v = t.memoizedProps;
          try {
            h.nodeValue = v;
          } catch (re) {
            Oe(t, t.return, re);
          }
        }
        break;
      case 3:
        if (zt(r, t), Zt(t), u & 4 && s !== null && s.memoizedState.isDehydrated) try {
          Po(r.containerInfo);
        } catch (re) {
          Oe(t, t.return, re);
        }
        break;
      case 4:
        zt(r, t), Zt(t);
        break;
      case 13:
        zt(r, t), Zt(t), h = t.child, h.flags & 8192 && (v = h.memoizedState !== null, h.stateNode.isHidden = v, !v || h.alternate !== null && h.alternate.memoizedState !== null || (Lu = Le())), u & 4 && Qm(t);
        break;
      case 22:
        if ($ = s !== null && s.memoizedState !== null, t.mode & 1 ? (nt = (F = nt) || $, zt(r, t), nt = F) : zt(r, t), Zt(t), u & 8192) {
          if (F = t.memoizedState !== null, (t.stateNode.isHidden = F) && !$ && (t.mode & 1) !== 0) for (ee = t, $ = t.child; $ !== null; ) {
            for (U = ee = $; ee !== null; ) {
              switch (B = ee, q = B.child, B.tag) {
                case 0:
                case 11:
                case 14:
                case 15:
                  Xo(4, B, B.return);
                  break;
                case 1:
                  Gr(B, B.return);
                  var te = B.stateNode;
                  if (typeof te.componentWillUnmount == "function") {
                    u = B, s = B.return;
                    try {
                      r = u, te.props = r.memoizedProps, te.state = r.memoizedState, te.componentWillUnmount();
                    } catch (re) {
                      Oe(u, s, re);
                    }
                  }
                  break;
                case 5:
                  Gr(B, B.return);
                  break;
                case 22:
                  if (B.memoizedState !== null) {
                    Jm(U);
                    continue;
                  }
              }
              q !== null ? (q.return = B, ee = q) : Jm(U);
            }
            $ = $.sibling;
          }
          e: for ($ = null, U = t; ; ) {
            if (U.tag === 5) {
              if ($ === null) {
                $ = U;
                try {
                  h = U.stateNode, F ? (v = h.style, typeof v.setProperty == "function" ? v.setProperty("display", "none", "important") : v.display = "none") : (P = U.stateNode, M = U.memoizedProps.style, k = M != null && M.hasOwnProperty("display") ? M.display : null, P.style.display = Rf("display", k));
                } catch (re) {
                  Oe(t, t.return, re);
                }
              }
            } else if (U.tag === 6) {
              if ($ === null) try {
                U.stateNode.nodeValue = F ? "" : U.memoizedProps;
              } catch (re) {
                Oe(t, t.return, re);
              }
            } else if ((U.tag !== 22 && U.tag !== 23 || U.memoizedState === null || U === t) && U.child !== null) {
              U.child.return = U, U = U.child;
              continue;
            }
            if (U === t) break e;
            for (; U.sibling === null; ) {
              if (U.return === null || U.return === t) break e;
              $ === U && ($ = null), U = U.return;
            }
            $ === U && ($ = null), U.sibling.return = U.return, U = U.sibling;
          }
        }
        break;
      case 19:
        zt(r, t), Zt(t), u & 4 && Qm(t);
        break;
      case 21:
        break;
      default:
        zt(
          r,
          t
        ), Zt(t);
    }
  }
  function Zt(t) {
    var r = t.flags;
    if (r & 2) {
      try {
        e: {
          for (var s = t.return; s !== null; ) {
            if (Gm(s)) {
              var u = s;
              break e;
            }
            s = s.return;
          }
          throw Error(o(160));
        }
        switch (u.tag) {
          case 5:
            var h = u.stateNode;
            u.flags & 32 && (go(h, ""), u.flags &= -33);
            var v = Km(t);
            Iu(t, v, h);
            break;
          case 3:
          case 4:
            var k = u.stateNode.containerInfo, P = Km(t);
            ju(t, P, k);
            break;
          default:
            throw Error(o(161));
        }
      } catch (M) {
        Oe(t, t.return, M);
      }
      t.flags &= -3;
    }
    r & 4096 && (t.flags &= -4097);
  }
  function Ix(t, r, s) {
    ee = t, Zm(t);
  }
  function Zm(t, r, s) {
    for (var u = (t.mode & 1) !== 0; ee !== null; ) {
      var h = ee, v = h.child;
      if (h.tag === 22 && u) {
        var k = h.memoizedState !== null || As;
        if (!k) {
          var P = h.alternate, M = P !== null && P.memoizedState !== null || nt;
          P = As;
          var F = nt;
          if (As = k, (nt = M) && !F) for (ee = h; ee !== null; ) k = ee, M = k.child, k.tag === 22 && k.memoizedState !== null ? eh(h) : M !== null ? (M.return = k, ee = M) : eh(h);
          for (; v !== null; ) ee = v, Zm(v), v = v.sibling;
          ee = h, As = P, nt = F;
        }
        qm(t);
      } else (h.subtreeFlags & 8772) !== 0 && v !== null ? (v.return = h, ee = v) : qm(t);
    }
  }
  function qm(t) {
    for (; ee !== null; ) {
      var r = ee;
      if ((r.flags & 8772) !== 0) {
        var s = r.alternate;
        try {
          if ((r.flags & 8772) !== 0) switch (r.tag) {
            case 0:
            case 11:
            case 15:
              nt || Cs(5, r);
              break;
            case 1:
              var u = r.stateNode;
              if (r.flags & 4 && !nt) if (s === null) u.componentDidMount();
              else {
                var h = r.elementType === r.type ? s.memoizedProps : Lt(r.type, s.memoizedProps);
                u.componentDidUpdate(h, s.memoizedState, u.__reactInternalSnapshotBeforeUpdate);
              }
              var v = r.updateQueue;
              v !== null && Jp(r, v, u);
              break;
            case 3:
              var k = r.updateQueue;
              if (k !== null) {
                if (s = null, r.child !== null) switch (r.child.tag) {
                  case 5:
                    s = r.child.stateNode;
                    break;
                  case 1:
                    s = r.child.stateNode;
                }
                Jp(r, k, s);
              }
              break;
            case 5:
              var P = r.stateNode;
              if (s === null && r.flags & 4) {
                s = P;
                var M = r.memoizedProps;
                switch (r.type) {
                  case "button":
                  case "input":
                  case "select":
                  case "textarea":
                    M.autoFocus && s.focus();
                    break;
                  case "img":
                    M.src && (s.src = M.src);
                }
              }
              break;
            case 6:
              break;
            case 4:
              break;
            case 12:
              break;
            case 13:
              if (r.memoizedState === null) {
                var F = r.alternate;
                if (F !== null) {
                  var $ = F.memoizedState;
                  if ($ !== null) {
                    var U = $.dehydrated;
                    U !== null && Po(U);
                  }
                }
              }
              break;
            case 19:
            case 17:
            case 21:
            case 22:
            case 23:
            case 25:
              break;
            default:
              throw Error(o(163));
          }
          nt || r.flags & 512 && Du(r);
        } catch (B) {
          Oe(r, r.return, B);
        }
      }
      if (r === t) {
        ee = null;
        break;
      }
      if (s = r.sibling, s !== null) {
        s.return = r.return, ee = s;
        break;
      }
      ee = r.return;
    }
  }
  function Jm(t) {
    for (; ee !== null; ) {
      var r = ee;
      if (r === t) {
        ee = null;
        break;
      }
      var s = r.sibling;
      if (s !== null) {
        s.return = r.return, ee = s;
        break;
      }
      ee = r.return;
    }
  }
  function eh(t) {
    for (; ee !== null; ) {
      var r = ee;
      try {
        switch (r.tag) {
          case 0:
          case 11:
          case 15:
            var s = r.return;
            try {
              Cs(4, r);
            } catch (M) {
              Oe(r, s, M);
            }
            break;
          case 1:
            var u = r.stateNode;
            if (typeof u.componentDidMount == "function") {
              var h = r.return;
              try {
                u.componentDidMount();
              } catch (M) {
                Oe(r, h, M);
              }
            }
            var v = r.return;
            try {
              Du(r);
            } catch (M) {
              Oe(r, v, M);
            }
            break;
          case 5:
            var k = r.return;
            try {
              Du(r);
            } catch (M) {
              Oe(r, k, M);
            }
        }
      } catch (M) {
        Oe(r, r.return, M);
      }
      if (r === t) {
        ee = null;
        break;
      }
      var P = r.sibling;
      if (P !== null) {
        P.return = r.return, ee = P;
        break;
      }
      ee = r.return;
    }
  }
  var Fx = Math.ceil, bs = D.ReactCurrentDispatcher, Fu = D.ReactCurrentOwner, Et = D.ReactCurrentBatchConfig, ge = 0, Ke = null, ze = null, Ze = 0, Tt = 0, Kr = bn(0), Ue = 0, Zo = null, or = 0, Ps = 0, Ou = 0, qo = null, pt = null, Lu = 0, Yr = 1 / 0, pn = null, Es = !1, Vu = null, Dn = null, Ms = !1, jn = null, Rs = 0, Jo = 0, zu = null, Ns = -1, Ds = 0;
  function st() {
    return (ge & 6) !== 0 ? Le() : Ns !== -1 ? Ns : Ns = Le();
  }
  function In(t) {
    return (t.mode & 1) === 0 ? 1 : (ge & 2) !== 0 && Ze !== 0 ? Ze & -Ze : Sx.transition !== null ? (Ds === 0 && (Ds = Kf()), Ds) : (t = _e, t !== 0 || (t = window.event, t = t === void 0 ? 16 : np(t.type)), t);
  }
  function Bt(t, r, s, u) {
    if (50 < Jo) throw Jo = 0, zu = null, Error(o(185));
    To(t, s, u), ((ge & 2) === 0 || t !== Ke) && (t === Ke && ((ge & 2) === 0 && (Ps |= s), Ue === 4 && Fn(t, Ze)), mt(t, u), s === 1 && ge === 0 && (r.mode & 1) === 0 && (Yr = Le() + 500, as && En()));
  }
  function mt(t, r) {
    var s = t.callbackNode;
    Sw(t, r);
    var u = $i(t, t === Ke ? Ze : 0);
    if (u === 0) s !== null && Hf(s), t.callbackNode = null, t.callbackPriority = 0;
    else if (r = u & -u, t.callbackPriority !== r) {
      if (s != null && Hf(s), r === 1) t.tag === 0 ? vx(nh.bind(null, t)) : Bp(nh.bind(null, t)), mx(function() {
        (ge & 6) === 0 && En();
      }), s = null;
      else {
        switch (Yf(u)) {
          case 1:
            s = Sl;
            break;
          case 4:
            s = Wf;
            break;
          case 16:
            s = Li;
            break;
          case 536870912:
            s = Gf;
            break;
          default:
            s = Li;
        }
        s = ch(s, th.bind(null, t));
      }
      t.callbackPriority = r, t.callbackNode = s;
    }
  }
  function th(t, r) {
    if (Ns = -1, Ds = 0, (ge & 6) !== 0) throw Error(o(327));
    var s = t.callbackNode;
    if (Qr() && t.callbackNode !== s) return null;
    var u = $i(t, t === Ke ? Ze : 0);
    if (u === 0) return null;
    if ((u & 30) !== 0 || (u & t.expiredLanes) !== 0 || r) r = js(t, u);
    else {
      r = u;
      var h = ge;
      ge |= 2;
      var v = oh();
      (Ke !== t || Ze !== r) && (pn = null, Yr = Le() + 500, sr(t, r));
      do
        try {
          Vx();
          break;
        } catch (P) {
          rh(t, P);
        }
      while (!0);
      ou(), bs.current = v, ge = h, ze !== null ? r = 0 : (Ke = null, Ze = 0, r = Ue);
    }
    if (r !== 0) {
      if (r === 2 && (h = wl(t), h !== 0 && (u = h, r = Bu(t, h))), r === 1) throw s = Zo, sr(t, 0), Fn(t, u), mt(t, Le()), s;
      if (r === 6) Fn(t, u);
      else {
        if (h = t.current.alternate, (u & 30) === 0 && !Ox(h) && (r = js(t, u), r === 2 && (v = wl(t), v !== 0 && (u = v, r = Bu(t, v))), r === 1)) throw s = Zo, sr(t, 0), Fn(t, u), mt(t, Le()), s;
        switch (t.finishedWork = h, t.finishedLanes = u, r) {
          case 0:
          case 1:
            throw Error(o(345));
          case 2:
            ar(t, pt, pn);
            break;
          case 3:
            if (Fn(t, u), (u & 130023424) === u && (r = Lu + 500 - Le(), 10 < r)) {
              if ($i(t, 0) !== 0) break;
              if (h = t.suspendedLanes, (h & u) !== u) {
                st(), t.pingedLanes |= t.suspendedLanes & h;
                break;
              }
              t.timeoutHandle = Kl(ar.bind(null, t, pt, pn), r);
              break;
            }
            ar(t, pt, pn);
            break;
          case 4:
            if (Fn(t, u), (u & 4194240) === u) break;
            for (r = t.eventTimes, h = -1; 0 < u; ) {
              var k = 31 - It(u);
              v = 1 << k, k = r[k], k > h && (h = k), u &= ~v;
            }
            if (u = h, u = Le() - u, u = (120 > u ? 120 : 480 > u ? 480 : 1080 > u ? 1080 : 1920 > u ? 1920 : 3e3 > u ? 3e3 : 4320 > u ? 4320 : 1960 * Fx(u / 1960)) - u, 10 < u) {
              t.timeoutHandle = Kl(ar.bind(null, t, pt, pn), u);
              break;
            }
            ar(t, pt, pn);
            break;
          case 5:
            ar(t, pt, pn);
            break;
          default:
            throw Error(o(329));
        }
      }
    }
    return mt(t, Le()), t.callbackNode === s ? th.bind(null, t) : null;
  }
  function Bu(t, r) {
    var s = qo;
    return t.current.memoizedState.isDehydrated && (sr(t, r).flags |= 256), t = js(t, r), t !== 2 && (r = pt, pt = s, r !== null && $u(r)), t;
  }
  function $u(t) {
    pt === null ? pt = t : pt.push.apply(pt, t);
  }
  function Ox(t) {
    for (var r = t; ; ) {
      if (r.flags & 16384) {
        var s = r.updateQueue;
        if (s !== null && (s = s.stores, s !== null)) for (var u = 0; u < s.length; u++) {
          var h = s[u], v = h.getSnapshot;
          h = h.value;
          try {
            if (!Ft(v(), h)) return !1;
          } catch {
            return !1;
          }
        }
      }
      if (s = r.child, r.subtreeFlags & 16384 && s !== null) s.return = r, r = s;
      else {
        if (r === t) break;
        for (; r.sibling === null; ) {
          if (r.return === null || r.return === t) return !0;
          r = r.return;
        }
        r.sibling.return = r.return, r = r.sibling;
      }
    }
    return !0;
  }
  function Fn(t, r) {
    for (r &= ~Ou, r &= ~Ps, t.suspendedLanes |= r, t.pingedLanes &= ~r, t = t.expirationTimes; 0 < r; ) {
      var s = 31 - It(r), u = 1 << s;
      t[s] = -1, r &= ~u;
    }
  }
  function nh(t) {
    if ((ge & 6) !== 0) throw Error(o(327));
    Qr();
    var r = $i(t, 0);
    if ((r & 1) === 0) return mt(t, Le()), null;
    var s = js(t, r);
    if (t.tag !== 0 && s === 2) {
      var u = wl(t);
      u !== 0 && (r = u, s = Bu(t, u));
    }
    if (s === 1) throw s = Zo, sr(t, 0), Fn(t, r), mt(t, Le()), s;
    if (s === 6) throw Error(o(345));
    return t.finishedWork = t.current.alternate, t.finishedLanes = r, ar(t, pt, pn), mt(t, Le()), null;
  }
  function Uu(t, r) {
    var s = ge;
    ge |= 1;
    try {
      return t(r);
    } finally {
      ge = s, ge === 0 && (Yr = Le() + 500, as && En());
    }
  }
  function ir(t) {
    jn !== null && jn.tag === 0 && (ge & 6) === 0 && Qr();
    var r = ge;
    ge |= 1;
    var s = Et.transition, u = _e;
    try {
      if (Et.transition = null, _e = 1, t) return t();
    } finally {
      _e = u, Et.transition = s, ge = r, (ge & 6) === 0 && En();
    }
  }
  function Hu() {
    Tt = Kr.current, Re(Kr);
  }
  function sr(t, r) {
    t.finishedWork = null, t.finishedLanes = 0;
    var s = t.timeoutHandle;
    if (s !== -1 && (t.timeoutHandle = -1, px(s)), ze !== null) for (s = ze.return; s !== null; ) {
      var u = s;
      switch (Jl(u), u.tag) {
        case 1:
          u = u.type.childContextTypes, u != null && is();
          break;
        case 3:
          Hr(), Re(ct), Re(Je), fu();
          break;
        case 5:
          cu(u);
          break;
        case 4:
          Hr();
          break;
        case 13:
          Re(je);
          break;
        case 19:
          Re(je);
          break;
        case 10:
          iu(u.type._context);
          break;
        case 22:
        case 23:
          Hu();
      }
      s = s.return;
    }
    if (Ke = t, ze = t = On(t.current, null), Ze = Tt = r, Ue = 0, Zo = null, Ou = Ps = or = 0, pt = qo = null, tr !== null) {
      for (r = 0; r < tr.length; r++) if (s = tr[r], u = s.interleaved, u !== null) {
        s.interleaved = null;
        var h = u.next, v = s.pending;
        if (v !== null) {
          var k = v.next;
          v.next = h, u.next = k;
        }
        s.pending = u;
      }
      tr = null;
    }
    return t;
  }
  function rh(t, r) {
    do {
      var s = ze;
      try {
        if (ou(), gs.current = xs, vs) {
          for (var u = Ie.memoizedState; u !== null; ) {
            var h = u.queue;
            h !== null && (h.pending = null), u = u.next;
          }
          vs = !1;
        }
        if (rr = 0, Ge = $e = Ie = null, Wo = !1, Go = 0, Fu.current = null, s === null || s.return === null) {
          Ue = 1, Zo = r, ze = null;
          break;
        }
        e: {
          var v = t, k = s.return, P = s, M = r;
          if (r = Ze, P.flags |= 32768, M !== null && typeof M == "object" && typeof M.then == "function") {
            var F = M, $ = P, U = $.tag;
            if (($.mode & 1) === 0 && (U === 0 || U === 11 || U === 15)) {
              var B = $.alternate;
              B ? ($.updateQueue = B.updateQueue, $.memoizedState = B.memoizedState, $.lanes = B.lanes) : ($.updateQueue = null, $.memoizedState = null);
            }
            var q = Pm(k);
            if (q !== null) {
              q.flags &= -257, Em(q, k, P, v, r), q.mode & 1 && bm(v, F, r), r = q, M = F;
              var te = r.updateQueue;
              if (te === null) {
                var re = /* @__PURE__ */ new Set();
                re.add(M), r.updateQueue = re;
              } else te.add(M);
              break e;
            } else {
              if ((r & 1) === 0) {
                bm(v, F, r), Wu();
                break e;
              }
              M = Error(o(426));
            }
          } else if (De && P.mode & 1) {
            var Ve = Pm(k);
            if (Ve !== null) {
              (Ve.flags & 65536) === 0 && (Ve.flags |= 256), Em(Ve, k, P, v, r), nu(Wr(M, P));
              break e;
            }
          }
          v = M = Wr(M, P), Ue !== 4 && (Ue = 2), qo === null ? qo = [v] : qo.push(v), v = k;
          do {
            switch (v.tag) {
              case 3:
                v.flags |= 65536, r &= -r, v.lanes |= r;
                var j = Am(v, M, r);
                qp(v, j);
                break e;
              case 1:
                P = M;
                var R = v.type, I = v.stateNode;
                if ((v.flags & 128) === 0 && (typeof R.getDerivedStateFromError == "function" || I !== null && typeof I.componentDidCatch == "function" && (Dn === null || !Dn.has(I)))) {
                  v.flags |= 65536, r &= -r, v.lanes |= r;
                  var K = Cm(v, P, r);
                  qp(v, K);
                  break e;
                }
            }
            v = v.return;
          } while (v !== null);
        }
        sh(s);
      } catch (oe) {
        r = oe, ze === s && s !== null && (ze = s = s.return);
        continue;
      }
      break;
    } while (!0);
  }
  function oh() {
    var t = bs.current;
    return bs.current = xs, t === null ? xs : t;
  }
  function Wu() {
    (Ue === 0 || Ue === 3 || Ue === 2) && (Ue = 4), Ke === null || (or & 268435455) === 0 && (Ps & 268435455) === 0 || Fn(Ke, Ze);
  }
  function js(t, r) {
    var s = ge;
    ge |= 2;
    var u = oh();
    (Ke !== t || Ze !== r) && (pn = null, sr(t, r));
    do
      try {
        Lx();
        break;
      } catch (h) {
        rh(t, h);
      }
    while (!0);
    if (ou(), ge = s, bs.current = u, ze !== null) throw Error(o(261));
    return Ke = null, Ze = 0, Ue;
  }
  function Lx() {
    for (; ze !== null; ) ih(ze);
  }
  function Vx() {
    for (; ze !== null && !cw(); ) ih(ze);
  }
  function ih(t) {
    var r = uh(t.alternate, t, Tt);
    t.memoizedProps = t.pendingProps, r === null ? sh(t) : ze = r, Fu.current = null;
  }
  function sh(t) {
    var r = t;
    do {
      var s = r.alternate;
      if (t = r.return, (r.flags & 32768) === 0) {
        if (s = Rx(s, r, Tt), s !== null) {
          ze = s;
          return;
        }
      } else {
        if (s = Nx(s, r), s !== null) {
          s.flags &= 32767, ze = s;
          return;
        }
        if (t !== null) t.flags |= 32768, t.subtreeFlags = 0, t.deletions = null;
        else {
          Ue = 6, ze = null;
          return;
        }
      }
      if (r = r.sibling, r !== null) {
        ze = r;
        return;
      }
      ze = r = t;
    } while (r !== null);
    Ue === 0 && (Ue = 5);
  }
  function ar(t, r, s) {
    var u = _e, h = Et.transition;
    try {
      Et.transition = null, _e = 1, zx(t, r, s, u);
    } finally {
      Et.transition = h, _e = u;
    }
    return null;
  }
  function zx(t, r, s, u) {
    do
      Qr();
    while (jn !== null);
    if ((ge & 6) !== 0) throw Error(o(327));
    s = t.finishedWork;
    var h = t.finishedLanes;
    if (s === null) return null;
    if (t.finishedWork = null, t.finishedLanes = 0, s === t.current) throw Error(o(177));
    t.callbackNode = null, t.callbackPriority = 0;
    var v = s.lanes | s.childLanes;
    if (ww(t, v), t === Ke && (ze = Ke = null, Ze = 0), (s.subtreeFlags & 2064) === 0 && (s.flags & 2064) === 0 || Ms || (Ms = !0, ch(Li, function() {
      return Qr(), null;
    })), v = (s.flags & 15990) !== 0, (s.subtreeFlags & 15990) !== 0 || v) {
      v = Et.transition, Et.transition = null;
      var k = _e;
      _e = 1;
      var P = ge;
      ge |= 4, Fu.current = null, jx(t, s), Xm(s, t), sx(Wl), Wi = !!Hl, Wl = Hl = null, t.current = s, Ix(s), dw(), ge = P, _e = k, Et.transition = v;
    } else t.current = s;
    if (Ms && (Ms = !1, jn = t, Rs = h), v = t.pendingLanes, v === 0 && (Dn = null), mw(s.stateNode), mt(t, Le()), r !== null) for (u = t.onRecoverableError, s = 0; s < r.length; s++) h = r[s], u(h.value, { componentStack: h.stack, digest: h.digest });
    if (Es) throw Es = !1, t = Vu, Vu = null, t;
    return (Rs & 1) !== 0 && t.tag !== 0 && Qr(), v = t.pendingLanes, (v & 1) !== 0 ? t === zu ? Jo++ : (Jo = 0, zu = t) : Jo = 0, En(), null;
  }
  function Qr() {
    if (jn !== null) {
      var t = Yf(Rs), r = Et.transition, s = _e;
      try {
        if (Et.transition = null, _e = 16 > t ? 16 : t, jn === null) var u = !1;
        else {
          if (t = jn, jn = null, Rs = 0, (ge & 6) !== 0) throw Error(o(331));
          var h = ge;
          for (ge |= 4, ee = t.current; ee !== null; ) {
            var v = ee, k = v.child;
            if ((ee.flags & 16) !== 0) {
              var P = v.deletions;
              if (P !== null) {
                for (var M = 0; M < P.length; M++) {
                  var F = P[M];
                  for (ee = F; ee !== null; ) {
                    var $ = ee;
                    switch ($.tag) {
                      case 0:
                      case 11:
                      case 15:
                        Xo(8, $, v);
                    }
                    var U = $.child;
                    if (U !== null) U.return = $, ee = U;
                    else for (; ee !== null; ) {
                      $ = ee;
                      var B = $.sibling, q = $.return;
                      if (Wm($), $ === F) {
                        ee = null;
                        break;
                      }
                      if (B !== null) {
                        B.return = q, ee = B;
                        break;
                      }
                      ee = q;
                    }
                  }
                }
                var te = v.alternate;
                if (te !== null) {
                  var re = te.child;
                  if (re !== null) {
                    te.child = null;
                    do {
                      var Ve = re.sibling;
                      re.sibling = null, re = Ve;
                    } while (re !== null);
                  }
                }
                ee = v;
              }
            }
            if ((v.subtreeFlags & 2064) !== 0 && k !== null) k.return = v, ee = k;
            else e: for (; ee !== null; ) {
              if (v = ee, (v.flags & 2048) !== 0) switch (v.tag) {
                case 0:
                case 11:
                case 15:
                  Xo(9, v, v.return);
              }
              var j = v.sibling;
              if (j !== null) {
                j.return = v.return, ee = j;
                break e;
              }
              ee = v.return;
            }
          }
          var R = t.current;
          for (ee = R; ee !== null; ) {
            k = ee;
            var I = k.child;
            if ((k.subtreeFlags & 2064) !== 0 && I !== null) I.return = k, ee = I;
            else e: for (k = R; ee !== null; ) {
              if (P = ee, (P.flags & 2048) !== 0) try {
                switch (P.tag) {
                  case 0:
                  case 11:
                  case 15:
                    Cs(9, P);
                }
              } catch (oe) {
                Oe(P, P.return, oe);
              }
              if (P === k) {
                ee = null;
                break e;
              }
              var K = P.sibling;
              if (K !== null) {
                K.return = P.return, ee = K;
                break e;
              }
              ee = P.return;
            }
          }
          if (ge = h, En(), Kt && typeof Kt.onPostCommitFiberRoot == "function") try {
            Kt.onPostCommitFiberRoot(Vi, t);
          } catch {
          }
          u = !0;
        }
        return u;
      } finally {
        _e = s, Et.transition = r;
      }
    }
    return !1;
  }
  function ah(t, r, s) {
    r = Wr(s, r), r = Am(t, r, 1), t = Rn(t, r, 1), r = st(), t !== null && (To(t, 1, r), mt(t, r));
  }
  function Oe(t, r, s) {
    if (t.tag === 3) ah(t, t, s);
    else for (; r !== null; ) {
      if (r.tag === 3) {
        ah(r, t, s);
        break;
      } else if (r.tag === 1) {
        var u = r.stateNode;
        if (typeof r.type.getDerivedStateFromError == "function" || typeof u.componentDidCatch == "function" && (Dn === null || !Dn.has(u))) {
          t = Wr(s, t), t = Cm(r, t, 1), r = Rn(r, t, 1), t = st(), r !== null && (To(r, 1, t), mt(r, t));
          break;
        }
      }
      r = r.return;
    }
  }
  function Bx(t, r, s) {
    var u = t.pingCache;
    u !== null && u.delete(r), r = st(), t.pingedLanes |= t.suspendedLanes & s, Ke === t && (Ze & s) === s && (Ue === 4 || Ue === 3 && (Ze & 130023424) === Ze && 500 > Le() - Lu ? sr(t, 0) : Ou |= s), mt(t, r);
  }
  function lh(t, r) {
    r === 0 && ((t.mode & 1) === 0 ? r = 1 : (r = Bi, Bi <<= 1, (Bi & 130023424) === 0 && (Bi = 4194304)));
    var s = st();
    t = cn(t, r), t !== null && (To(t, r, s), mt(t, s));
  }
  function $x(t) {
    var r = t.memoizedState, s = 0;
    r !== null && (s = r.retryLane), lh(t, s);
  }
  function Ux(t, r) {
    var s = 0;
    switch (t.tag) {
      case 13:
        var u = t.stateNode, h = t.memoizedState;
        h !== null && (s = h.retryLane);
        break;
      case 19:
        u = t.stateNode;
        break;
      default:
        throw Error(o(314));
    }
    u !== null && u.delete(r), lh(t, s);
  }
  var uh;
  uh = function(t, r, s) {
    if (t !== null) if (t.memoizedProps !== r.pendingProps || ct.current) ft = !0;
    else {
      if ((t.lanes & s) === 0 && (r.flags & 128) === 0) return ft = !1, Mx(t, r, s);
      ft = (t.flags & 131072) !== 0;
    }
    else ft = !1, De && (r.flags & 1048576) !== 0 && $p(r, us, r.index);
    switch (r.lanes = 0, r.tag) {
      case 2:
        var u = r.type;
        ks(t, r), t = r.pendingProps;
        var h = Or(r, Je.current);
        Ur(r, s), h = hu(null, r, u, t, h, s);
        var v = yu();
        return r.flags |= 1, typeof h == "object" && h !== null && typeof h.render == "function" && h.$$typeof === void 0 ? (r.tag = 1, r.memoizedState = null, r.updateQueue = null, dt(u) ? (v = !0, ss(r)) : v = !1, r.memoizedState = h.state !== null && h.state !== void 0 ? h.state : null, lu(r), h.updater = _s, r.stateNode = h, h._reactInternals = r, _u(r, u, t, s), r = Cu(null, r, u, !0, v, s)) : (r.tag = 0, De && v && ql(r), it(null, r, h, s), r = r.child), r;
      case 16:
        u = r.elementType;
        e: {
          switch (ks(t, r), t = r.pendingProps, h = u._init, u = h(u._payload), r.type = u, h = r.tag = Wx(u), t = Lt(u, t), h) {
            case 0:
              r = Au(null, r, u, t, s);
              break e;
            case 1:
              r = Im(null, r, u, t, s);
              break e;
            case 11:
              r = Mm(null, r, u, t, s);
              break e;
            case 14:
              r = Rm(null, r, u, Lt(u.type, t), s);
              break e;
          }
          throw Error(o(
            306,
            u,
            ""
          ));
        }
        return r;
      case 0:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Lt(u, h), Au(t, r, u, h, s);
      case 1:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Lt(u, h), Im(t, r, u, h, s);
      case 3:
        e: {
          if (Fm(r), t === null) throw Error(o(387));
          u = r.pendingProps, v = r.memoizedState, h = v.element, Zp(t, r), hs(r, u, null, s);
          var k = r.memoizedState;
          if (u = k.element, v.isDehydrated) if (v = { element: u, isDehydrated: !1, cache: k.cache, pendingSuspenseBoundaries: k.pendingSuspenseBoundaries, transitions: k.transitions }, r.updateQueue.baseState = v, r.memoizedState = v, r.flags & 256) {
            h = Wr(Error(o(423)), r), r = Om(t, r, u, s, h);
            break e;
          } else if (u !== h) {
            h = Wr(Error(o(424)), r), r = Om(t, r, u, s, h);
            break e;
          } else for (_t = Cn(r.stateNode.containerInfo.firstChild), xt = r, De = !0, Ot = null, s = Qp(r, null, u, s), r.child = s; s; ) s.flags = s.flags & -3 | 4096, s = s.sibling;
          else {
            if (zr(), u === h) {
              r = fn(t, r, s);
              break e;
            }
            it(t, r, u, s);
          }
          r = r.child;
        }
        return r;
      case 5:
        return em(r), t === null && tu(r), u = r.type, h = r.pendingProps, v = t !== null ? t.memoizedProps : null, k = h.children, Gl(u, h) ? k = null : v !== null && Gl(u, v) && (r.flags |= 32), jm(t, r), it(t, r, k, s), r.child;
      case 6:
        return t === null && tu(r), null;
      case 13:
        return Lm(t, r, s);
      case 4:
        return uu(r, r.stateNode.containerInfo), u = r.pendingProps, t === null ? r.child = Br(r, null, u, s) : it(t, r, u, s), r.child;
      case 11:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Lt(u, h), Mm(t, r, u, h, s);
      case 7:
        return it(t, r, r.pendingProps, s), r.child;
      case 8:
        return it(t, r, r.pendingProps.children, s), r.child;
      case 12:
        return it(t, r, r.pendingProps.children, s), r.child;
      case 10:
        e: {
          if (u = r.type._context, h = r.pendingProps, v = r.memoizedProps, k = h.value, Ee(fs, u._currentValue), u._currentValue = k, v !== null) if (Ft(v.value, k)) {
            if (v.children === h.children && !ct.current) {
              r = fn(t, r, s);
              break e;
            }
          } else for (v = r.child, v !== null && (v.return = r); v !== null; ) {
            var P = v.dependencies;
            if (P !== null) {
              k = v.child;
              for (var M = P.firstContext; M !== null; ) {
                if (M.context === u) {
                  if (v.tag === 1) {
                    M = dn(-1, s & -s), M.tag = 2;
                    var F = v.updateQueue;
                    if (F !== null) {
                      F = F.shared;
                      var $ = F.pending;
                      $ === null ? M.next = M : (M.next = $.next, $.next = M), F.pending = M;
                    }
                  }
                  v.lanes |= s, M = v.alternate, M !== null && (M.lanes |= s), su(
                    v.return,
                    s,
                    r
                  ), P.lanes |= s;
                  break;
                }
                M = M.next;
              }
            } else if (v.tag === 10) k = v.type === r.type ? null : v.child;
            else if (v.tag === 18) {
              if (k = v.return, k === null) throw Error(o(341));
              k.lanes |= s, P = k.alternate, P !== null && (P.lanes |= s), su(k, s, r), k = v.sibling;
            } else k = v.child;
            if (k !== null) k.return = v;
            else for (k = v; k !== null; ) {
              if (k === r) {
                k = null;
                break;
              }
              if (v = k.sibling, v !== null) {
                v.return = k.return, k = v;
                break;
              }
              k = k.return;
            }
            v = k;
          }
          it(t, r, h.children, s), r = r.child;
        }
        return r;
      case 9:
        return h = r.type, u = r.pendingProps.children, Ur(r, s), h = bt(h), u = u(h), r.flags |= 1, it(t, r, u, s), r.child;
      case 14:
        return u = r.type, h = Lt(u, r.pendingProps), h = Lt(u.type, h), Rm(t, r, u, h, s);
      case 15:
        return Nm(t, r, r.type, r.pendingProps, s);
      case 17:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Lt(u, h), ks(t, r), r.tag = 1, dt(u) ? (t = !0, ss(r)) : t = !1, Ur(r, s), Tm(r, u, h), _u(r, u, h, s), Cu(null, r, u, !0, t, s);
      case 19:
        return zm(t, r, s);
      case 22:
        return Dm(t, r, s);
    }
    throw Error(o(156, r.tag));
  };
  function ch(t, r) {
    return Uf(t, r);
  }
  function Hx(t, r, s, u) {
    this.tag = t, this.key = s, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = r, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = u, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function Mt(t, r, s, u) {
    return new Hx(t, r, s, u);
  }
  function Gu(t) {
    return t = t.prototype, !(!t || !t.isReactComponent);
  }
  function Wx(t) {
    if (typeof t == "function") return Gu(t) ? 1 : 0;
    if (t != null) {
      if (t = t.$$typeof, t === ce) return 11;
      if (t === ye) return 14;
    }
    return 2;
  }
  function On(t, r) {
    var s = t.alternate;
    return s === null ? (s = Mt(t.tag, r, t.key, t.mode), s.elementType = t.elementType, s.type = t.type, s.stateNode = t.stateNode, s.alternate = t, t.alternate = s) : (s.pendingProps = r, s.type = t.type, s.flags = 0, s.subtreeFlags = 0, s.deletions = null), s.flags = t.flags & 14680064, s.childLanes = t.childLanes, s.lanes = t.lanes, s.child = t.child, s.memoizedProps = t.memoizedProps, s.memoizedState = t.memoizedState, s.updateQueue = t.updateQueue, r = t.dependencies, s.dependencies = r === null ? null : { lanes: r.lanes, firstContext: r.firstContext }, s.sibling = t.sibling, s.index = t.index, s.ref = t.ref, s;
  }
  function Is(t, r, s, u, h, v) {
    var k = 2;
    if (u = t, typeof t == "function") Gu(t) && (k = 1);
    else if (typeof t == "string") k = 5;
    else e: switch (t) {
      case W:
        return lr(s.children, h, v, r);
      case H:
        k = 8, h |= 8;
        break;
      case V:
        return t = Mt(12, s, r, h | 2), t.elementType = V, t.lanes = v, t;
      case me:
        return t = Mt(13, s, r, h), t.elementType = me, t.lanes = v, t;
      case fe:
        return t = Mt(19, s, r, h), t.elementType = fe, t.lanes = v, t;
      case he:
        return Fs(s, h, v, r);
      default:
        if (typeof t == "object" && t !== null) switch (t.$$typeof) {
          case X:
            k = 10;
            break e;
          case J:
            k = 9;
            break e;
          case ce:
            k = 11;
            break e;
          case ye:
            k = 14;
            break e;
          case ae:
            k = 16, u = null;
            break e;
        }
        throw Error(o(130, t == null ? t : typeof t, ""));
    }
    return r = Mt(k, s, r, h), r.elementType = t, r.type = u, r.lanes = v, r;
  }
  function lr(t, r, s, u) {
    return t = Mt(7, t, u, r), t.lanes = s, t;
  }
  function Fs(t, r, s, u) {
    return t = Mt(22, t, u, r), t.elementType = he, t.lanes = s, t.stateNode = { isHidden: !1 }, t;
  }
  function Ku(t, r, s) {
    return t = Mt(6, t, null, r), t.lanes = s, t;
  }
  function Yu(t, r, s) {
    return r = Mt(4, t.children !== null ? t.children : [], t.key, r), r.lanes = s, r.stateNode = { containerInfo: t.containerInfo, pendingChildren: null, implementation: t.implementation }, r;
  }
  function Gx(t, r, s, u, h) {
    this.tag = r, this.containerInfo = t, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = xl(0), this.expirationTimes = xl(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = xl(0), this.identifierPrefix = u, this.onRecoverableError = h, this.mutableSourceEagerHydrationData = null;
  }
  function Qu(t, r, s, u, h, v, k, P, M) {
    return t = new Gx(t, r, s, P, M), r === 1 ? (r = 1, v === !0 && (r |= 8)) : r = 0, v = Mt(3, null, null, r), t.current = v, v.stateNode = t, v.memoizedState = { element: u, isDehydrated: s, cache: null, transitions: null, pendingSuspenseBoundaries: null }, lu(v), t;
  }
  function Kx(t, r, s) {
    var u = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return { $$typeof: G, key: u == null ? null : "" + u, children: t, containerInfo: r, implementation: s };
  }
  function dh(t) {
    if (!t) return Pn;
    t = t._reactInternals;
    e: {
      if (Xn(t) !== t || t.tag !== 1) throw Error(o(170));
      var r = t;
      do {
        switch (r.tag) {
          case 3:
            r = r.stateNode.context;
            break e;
          case 1:
            if (dt(r.type)) {
              r = r.stateNode.__reactInternalMemoizedMergedChildContext;
              break e;
            }
        }
        r = r.return;
      } while (r !== null);
      throw Error(o(171));
    }
    if (t.tag === 1) {
      var s = t.type;
      if (dt(s)) return Vp(t, s, r);
    }
    return r;
  }
  function fh(t, r, s, u, h, v, k, P, M) {
    return t = Qu(s, u, !0, t, h, v, k, P, M), t.context = dh(null), s = t.current, u = st(), h = In(s), v = dn(u, h), v.callback = r ?? null, Rn(s, v, h), t.current.lanes = h, To(t, h, u), mt(t, u), t;
  }
  function Os(t, r, s, u) {
    var h = r.current, v = st(), k = In(h);
    return s = dh(s), r.context === null ? r.context = s : r.pendingContext = s, r = dn(v, k), r.payload = { element: t }, u = u === void 0 ? null : u, u !== null && (r.callback = u), t = Rn(h, r, k), t !== null && (Bt(t, h, k, v), ms(t, h, k)), k;
  }
  function Ls(t) {
    if (t = t.current, !t.child) return null;
    switch (t.child.tag) {
      case 5:
        return t.child.stateNode;
      default:
        return t.child.stateNode;
    }
  }
  function ph(t, r) {
    if (t = t.memoizedState, t !== null && t.dehydrated !== null) {
      var s = t.retryLane;
      t.retryLane = s !== 0 && s < r ? s : r;
    }
  }
  function Xu(t, r) {
    ph(t, r), (t = t.alternate) && ph(t, r);
  }
  function Yx() {
    return null;
  }
  var mh = typeof reportError == "function" ? reportError : function(t) {
    console.error(t);
  };
  function Zu(t) {
    this._internalRoot = t;
  }
  Vs.prototype.render = Zu.prototype.render = function(t) {
    var r = this._internalRoot;
    if (r === null) throw Error(o(409));
    Os(t, r, null, null);
  }, Vs.prototype.unmount = Zu.prototype.unmount = function() {
    var t = this._internalRoot;
    if (t !== null) {
      this._internalRoot = null;
      var r = t.containerInfo;
      ir(function() {
        Os(null, t, null, null);
      }), r[sn] = null;
    }
  };
  function Vs(t) {
    this._internalRoot = t;
  }
  Vs.prototype.unstable_scheduleHydration = function(t) {
    if (t) {
      var r = Zf();
      t = { blockedOn: null, target: t, priority: r };
      for (var s = 0; s < Tn.length && r !== 0 && r < Tn[s].priority; s++) ;
      Tn.splice(s, 0, t), s === 0 && ep(t);
    }
  };
  function qu(t) {
    return !(!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11);
  }
  function zs(t) {
    return !(!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11 && (t.nodeType !== 8 || t.nodeValue !== " react-mount-point-unstable "));
  }
  function hh() {
  }
  function Qx(t, r, s, u, h) {
    if (h) {
      if (typeof u == "function") {
        var v = u;
        u = function() {
          var F = Ls(k);
          v.call(F);
        };
      }
      var k = fh(r, u, t, 0, null, !1, !1, "", hh);
      return t._reactRootContainer = k, t[sn] = k.current, Oo(t.nodeType === 8 ? t.parentNode : t), ir(), k;
    }
    for (; h = t.lastChild; ) t.removeChild(h);
    if (typeof u == "function") {
      var P = u;
      u = function() {
        var F = Ls(M);
        P.call(F);
      };
    }
    var M = Qu(t, 0, !1, null, null, !1, !1, "", hh);
    return t._reactRootContainer = M, t[sn] = M.current, Oo(t.nodeType === 8 ? t.parentNode : t), ir(function() {
      Os(r, M, s, u);
    }), M;
  }
  function Bs(t, r, s, u, h) {
    var v = s._reactRootContainer;
    if (v) {
      var k = v;
      if (typeof h == "function") {
        var P = h;
        h = function() {
          var M = Ls(k);
          P.call(M);
        };
      }
      Os(r, k, t, h);
    } else k = Qx(s, r, t, h, u);
    return Ls(k);
  }
  Qf = function(t) {
    switch (t.tag) {
      case 3:
        var r = t.stateNode;
        if (r.current.memoizedState.isDehydrated) {
          var s = _o(r.pendingLanes);
          s !== 0 && (_l(r, s | 1), mt(r, Le()), (ge & 6) === 0 && (Yr = Le() + 500, En()));
        }
        break;
      case 13:
        ir(function() {
          var u = cn(t, 1);
          if (u !== null) {
            var h = st();
            Bt(u, t, 1, h);
          }
        }), Xu(t, 1);
    }
  }, Tl = function(t) {
    if (t.tag === 13) {
      var r = cn(t, 134217728);
      if (r !== null) {
        var s = st();
        Bt(r, t, 134217728, s);
      }
      Xu(t, 134217728);
    }
  }, Xf = function(t) {
    if (t.tag === 13) {
      var r = In(t), s = cn(t, r);
      if (s !== null) {
        var u = st();
        Bt(s, t, r, u);
      }
      Xu(t, r);
    }
  }, Zf = function() {
    return _e;
  }, qf = function(t, r) {
    var s = _e;
    try {
      return _e = t, r();
    } finally {
      _e = s;
    }
  }, hl = function(t, r, s) {
    switch (r) {
      case "input":
        if (al(t, s), r = s.name, s.type === "radio" && r != null) {
          for (s = t; s.parentNode; ) s = s.parentNode;
          for (s = s.querySelectorAll("input[name=" + JSON.stringify("" + r) + '][type="radio"]'), r = 0; r < s.length; r++) {
            var u = s[r];
            if (u !== t && u.form === t.form) {
              var h = os(u);
              if (!h) throw Error(o(90));
              _f(u), al(u, h);
            }
          }
        }
        break;
      case "textarea":
        bf(t, s);
        break;
      case "select":
        r = s.value, r != null && Ar(t, !!s.multiple, r, !1);
    }
  }, Ff = Uu, Of = ir;
  var Xx = { usingClientEntryPoint: !1, Events: [zo, Ir, os, jf, If, Uu] }, ei = { findFiberByHostInstance: Zn, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, Zx = { bundleType: ei.bundleType, version: ei.version, rendererPackageName: ei.rendererPackageName, rendererConfig: ei.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: D.ReactCurrentDispatcher, findHostInstanceByFiber: function(t) {
    return t = Bf(t), t === null ? null : t.stateNode;
  }, findFiberByHostInstance: ei.findFiberByHostInstance || Yx, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var $s = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!$s.isDisabled && $s.supportsFiber) try {
      Vi = $s.inject(Zx), Kt = $s;
    } catch {
    }
  }
  return ht.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Xx, ht.createPortal = function(t, r) {
    var s = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!qu(r)) throw Error(o(200));
    return Kx(t, r, null, s);
  }, ht.createRoot = function(t, r) {
    if (!qu(t)) throw Error(o(299));
    var s = !1, u = "", h = mh;
    return r != null && (r.unstable_strictMode === !0 && (s = !0), r.identifierPrefix !== void 0 && (u = r.identifierPrefix), r.onRecoverableError !== void 0 && (h = r.onRecoverableError)), r = Qu(t, 1, !1, null, null, s, !1, u, h), t[sn] = r.current, Oo(t.nodeType === 8 ? t.parentNode : t), new Zu(r);
  }, ht.findDOMNode = function(t) {
    if (t == null) return null;
    if (t.nodeType === 1) return t;
    var r = t._reactInternals;
    if (r === void 0)
      throw typeof t.render == "function" ? Error(o(188)) : (t = Object.keys(t).join(","), Error(o(268, t)));
    return t = Bf(r), t = t === null ? null : t.stateNode, t;
  }, ht.flushSync = function(t) {
    return ir(t);
  }, ht.hydrate = function(t, r, s) {
    if (!zs(r)) throw Error(o(200));
    return Bs(null, t, r, !0, s);
  }, ht.hydrateRoot = function(t, r, s) {
    if (!qu(t)) throw Error(o(405));
    var u = s != null && s.hydratedSources || null, h = !1, v = "", k = mh;
    if (s != null && (s.unstable_strictMode === !0 && (h = !0), s.identifierPrefix !== void 0 && (v = s.identifierPrefix), s.onRecoverableError !== void 0 && (k = s.onRecoverableError)), r = fh(r, null, t, 1, s ?? null, h, !1, v, k), t[sn] = r.current, Oo(t), u) for (t = 0; t < u.length; t++) s = u[t], h = s._getVersion, h = h(s._source), r.mutableSourceEagerHydrationData == null ? r.mutableSourceEagerHydrationData = [s, h] : r.mutableSourceEagerHydrationData.push(
      s,
      h
    );
    return new Vs(r);
  }, ht.render = function(t, r, s) {
    if (!zs(r)) throw Error(o(200));
    return Bs(null, t, r, !1, s);
  }, ht.unmountComponentAtNode = function(t) {
    if (!zs(t)) throw Error(o(40));
    return t._reactRootContainer ? (ir(function() {
      Bs(null, null, t, !1, function() {
        t._reactRootContainer = null, t[sn] = null;
      });
    }), !0) : !1;
  }, ht.unstable_batchedUpdates = Uu, ht.unstable_renderSubtreeIntoContainer = function(t, r, s, u) {
    if (!zs(s)) throw Error(o(200));
    if (t == null || t._reactInternals === void 0) throw Error(o(38));
    return Bs(t, r, s, !1, u);
  }, ht.version = "18.3.1-next-f1338f8080-20240426", ht;
}
var kh;
function Og() {
  if (kh) return ec.exports;
  kh = 1;
  function e() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(e);
      } catch (n) {
        console.error(n);
      }
  }
  return e(), ec.exports = l1(), ec.exports;
}
var Ah;
function u1() {
  if (Ah) return Us;
  Ah = 1;
  var e = Og();
  return Us.createRoot = e.createRoot, Us.hydrateRoot = e.hydrateRoot, Us;
}
var c1 = u1(), rc = { exports: {} }, ni = {};
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Ch;
function d1() {
  if (Ch) return ni;
  Ch = 1;
  var e = Td(), n = Symbol.for("react.element"), o = Symbol.for("react.fragment"), i = Object.prototype.hasOwnProperty, a = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, d = { key: !0, ref: !0, __self: !0, __source: !0 };
  function f(p, m, y) {
    var S, l = {}, c = null, g = null;
    y !== void 0 && (c = "" + y), m.key !== void 0 && (c = "" + m.key), m.ref !== void 0 && (g = m.ref);
    for (S in m) i.call(m, S) && !d.hasOwnProperty(S) && (l[S] = m[S]);
    if (p && p.defaultProps) for (S in m = p.defaultProps, m) l[S] === void 0 && (l[S] = m[S]);
    return { $$typeof: n, type: p, key: c, ref: g, props: l, _owner: a.current };
  }
  return ni.Fragment = o, ni.jsx = f, ni.jsxs = f, ni;
}
var bh;
function f1() {
  return bh || (bh = 1, rc.exports = d1()), rc.exports;
}
var w = f1();
const Ph = (e) => Symbol.iterator in e, Eh = (e) => (
  // HACK: avoid checking entries type
  "entries" in e
), Mh = (e, n) => {
  const o = e instanceof Map ? e : new Map(e.entries()), i = n instanceof Map ? n : new Map(n.entries());
  if (o.size !== i.size)
    return !1;
  for (const [a, d] of o)
    if (!i.has(a) || !Object.is(d, i.get(a)))
      return !1;
  return !0;
}, p1 = (e, n) => {
  const o = e[Symbol.iterator](), i = n[Symbol.iterator]();
  let a = o.next(), d = i.next();
  for (; !a.done && !d.done; ) {
    if (!Object.is(a.value, d.value))
      return !1;
    a = o.next(), d = i.next();
  }
  return !!a.done && !!d.done;
};
function m1(e, n) {
  return Object.is(e, n) ? !0 : typeof e != "object" || e === null || typeof n != "object" || n === null || Object.getPrototypeOf(e) !== Object.getPrototypeOf(n) ? !1 : Ph(e) && Ph(n) ? Eh(e) && Eh(n) ? Mh(e, n) : p1(e, n) : Mh(
    { entries: () => Object.entries(e) },
    { entries: () => Object.entries(n) }
  );
}
function h1(e) {
  const n = yn.useRef(void 0);
  return (o) => {
    const i = e(o);
    return m1(n.current, i) ? n.current : n.current = i;
  };
}
const Ad = C.createContext({});
function _r(e) {
  const n = C.useRef(null);
  return n.current === null && (n.current = e()), n.current;
}
const y1 = typeof window < "u", Wa = y1 ? C.useLayoutEffect : C.useEffect, Ga = /* @__PURE__ */ C.createContext(null);
function Cd(e, n) {
  e.indexOf(n) === -1 && e.push(n);
}
function _a(e, n) {
  const o = e.indexOf(n);
  o > -1 && e.splice(o, 1);
}
const on = (e, n, o) => o > n ? n : o < e ? e : o;
function Rh(e, n) {
  return n ? `${e}. For more information and steps for solving, visit https://motion.dev/troubleshooting/${n}` : e;
}
let Ci = () => {
}, Tr = () => {
};
var Rg;
typeof process < "u" && ((Rg = process.env) == null ? void 0 : Rg.NODE_ENV) !== "production" && (Ci = (e, n, o) => {
  !e && typeof console < "u" && console.warn(Rh(n, o));
}, Tr = (e, n, o) => {
  if (!e)
    throw new Error(Rh(n, o));
});
const Kn = {}, Lg = (e) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(e), Vg = (e) => typeof e == "object" && e !== null, zg = (e) => /^0[^.\s]+$/u.test(e);
// @__NO_SIDE_EFFECTS__
function Bg(e) {
  let n;
  return () => (n === void 0 && (n = e()), n);
}
const jt = /* @__NO_SIDE_EFFECTS__ */ (e) => e, bi = (...e) => e.reduce((n, o) => (i) => o(n(i))), gi = /* @__NO_SIDE_EFFECTS__ */ (e, n, o) => {
  const i = n - e;
  return i ? (o - e) / i : 1;
};
class bd {
  constructor() {
    this.subscriptions = [];
  }
  add(n) {
    return Cd(this.subscriptions, n), () => _a(this.subscriptions, n);
  }
  notify(n, o, i) {
    const a = this.subscriptions.length;
    if (a)
      if (a === 1)
        this.subscriptions[0](n, o, i);
      else
        for (let d = 0; d < a; d++) {
          const f = this.subscriptions[d];
          f && f(n, o, i);
        }
  }
  getSize() {
    return this.subscriptions.length;
  }
  clear() {
    this.subscriptions.length = 0;
  }
}
const gt = /* @__NO_SIDE_EFFECTS__ */ (e) => e * 1e3, Dt = /* @__NO_SIDE_EFFECTS__ */ (e) => e / 1e3, $g = /* @__NO_SIDE_EFFECTS__ */ (e, n) => n ? e * (1e3 / n) : 0, Ug = (e, n, o) => (((1 - 3 * o + 3 * n) * e + (3 * o - 6 * n)) * e + 3 * n) * e, g1 = 1e-7, v1 = 12;
function S1(e, n, o, i, a) {
  let d, f, p = 0;
  do
    f = n + (o - n) / 2, d = Ug(f, i, a) - e, d > 0 ? o = f : n = f;
  while (Math.abs(d) > g1 && ++p < v1);
  return f;
}
// @__NO_SIDE_EFFECTS__
function Pi(e, n, o, i) {
  if (e === n && o === i)
    return jt;
  const a = (d) => S1(d, 0, 1, e, o);
  return (d) => d === 0 || d === 1 ? d : Ug(a(d), n, i);
}
const Hg = /* @__NO_SIDE_EFFECTS__ */ (e) => (n) => n <= 0.5 ? e(2 * n) / 2 : (2 - e(2 * (1 - n))) / 2, Wg = /* @__NO_SIDE_EFFECTS__ */ (e) => (n) => 1 - e(1 - n), Gg = /* @__PURE__ */ Pi(0.33, 1.53, 0.69, 0.99), Pd = /* @__PURE__ */ Wg(Gg), Kg = /* @__PURE__ */ Hg(Pd), Yg = (e) => e >= 1 ? 1 : (e *= 2) < 1 ? 0.5 * Pd(e) : 0.5 * (2 - Math.pow(2, -10 * (e - 1))), Ed = (e) => 1 - Math.sin(Math.acos(e)), Qg = /* @__PURE__ */ Wg(Ed), Xg = /* @__PURE__ */ Hg(Ed), w1 = /* @__PURE__ */ Pi(0.42, 0, 1, 1), x1 = /* @__PURE__ */ Pi(0, 0, 0.58, 1), Zg = /* @__PURE__ */ Pi(0.42, 0, 0.58, 1), _1 = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] != "number", qg = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] == "number", Nh = {
  linear: jt,
  easeIn: w1,
  easeInOut: Zg,
  easeOut: x1,
  circIn: Ed,
  circInOut: Xg,
  circOut: Qg,
  backIn: Pd,
  backInOut: Kg,
  backOut: Gg,
  anticipate: Yg
}, T1 = (e) => typeof e == "string", Dh = (e) => {
  if (/* @__PURE__ */ qg(e)) {
    Tr(e.length === 4, "Cubic bezier arrays must contain four numerical values.", "cubic-bezier-length");
    const [n, o, i, a] = e;
    return /* @__PURE__ */ Pi(n, o, i, a);
  } else if (T1(e))
    return Tr(Nh[e] !== void 0, `Invalid easing type '${e}'`, "invalid-easing-type"), Nh[e];
  return e;
}, Hs = [
  "setup",
  // Compute
  "read",
  // Read
  "resolveKeyframes",
  // Write/Read/Write/Read
  "preUpdate",
  // Compute
  "update",
  // Compute
  "preRender",
  // Compute
  "render",
  // Write
  "postRender"
  // Compute
];
function k1(e) {
  let n = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set(), i = !1, a = !1;
  const d = /* @__PURE__ */ new WeakSet();
  let f = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  };
  function p(y) {
    d.has(y) && (m.schedule(y), e()), y(f);
  }
  const m = {
    /**
     * Schedule a process to run on the next frame.
     */
    schedule: (y, S = !1, l = !1) => {
      const g = l && i ? n : o;
      return S && d.add(y), g.add(y), y;
    },
    /**
     * Cancel the provided callback from running on the next frame.
     */
    cancel: (y) => {
      o.delete(y), d.delete(y);
    },
    /**
     * Execute all schedule callbacks.
     */
    process: (y) => {
      if (f = y, i) {
        a = !0;
        return;
      }
      i = !0;
      const S = n;
      n = o, o = S, n.forEach(p), n.clear(), i = !1, a && (a = !1, m.process(y));
    }
  };
  return m;
}
const A1 = 40;
function Jg(e, n) {
  let o = !1, i = !0;
  const a = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  }, d = () => o = !0, f = Hs.reduce((E, D) => (E[D] = k1(d), E), {}), { setup: p, read: m, resolveKeyframes: y, preUpdate: S, update: l, preRender: c, render: g, postRender: x } = f, _ = () => {
    const E = Kn.useManualTiming, D = E ? a.timestamp : performance.now();
    o = !1, E || (a.delta = i ? 1e3 / 60 : Math.max(Math.min(D - a.timestamp, A1), 1)), a.timestamp = D, a.isProcessing = !0, p.process(a), m.process(a), y.process(a), S.process(a), l.process(a), c.process(a), g.process(a), x.process(a), a.isProcessing = !1, o && n && (i = !1, e(_));
  }, A = () => {
    o = !0, i = !0, a.isProcessing || e(_);
  };
  return { schedule: Hs.reduce((E, D) => {
    const L = f[D];
    return E[D] = (G, W = !1, H = !1) => (o || A(), L.schedule(G, W, H)), E;
  }, {}), cancel: (E) => {
    for (let D = 0; D < Hs.length; D++)
      f[Hs[D]].cancel(E);
  }, state: a, steps: f };
}
const { schedule: ke, cancel: vn, state: qe, steps: oc } = /* @__PURE__ */ Jg(typeof requestAnimationFrame < "u" ? requestAnimationFrame : jt, !0);
let sa;
function C1() {
  sa = void 0;
}
const at = {
  now: () => (sa === void 0 && at.set(qe.isProcessing || Kn.useManualTiming ? qe.timestamp : performance.now()), sa),
  set: (e) => {
    sa = e, queueMicrotask(C1);
  }
}, ev = (e) => (n) => typeof n == "string" && n.startsWith(e), tv = /* @__PURE__ */ ev("--"), b1 = /* @__PURE__ */ ev("var(--"), Md = (e) => b1(e) ? P1.test(e.split("/*")[0].trim()) : !1, P1 = /var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;
function jh(e) {
  return typeof e != "string" ? !1 : e.split("/*")[0].includes("var(--");
}
const fo = {
  test: (e) => typeof e == "number",
  parse: parseFloat,
  transform: (e) => e
}, vi = {
  ...fo,
  transform: (e) => on(0, 1, e)
}, Ws = {
  ...fo,
  default: 1
}, ai = (e) => Math.round(e * 1e5) / 1e5, Rd = /-?(?:\d+(?:\.\d+)?|\.\d+)/gu;
function E1(e) {
  return e == null;
}
const M1 = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu, Nd = (e, n) => (o) => !!(typeof o == "string" && M1.test(o) && o.startsWith(e) || n && !E1(o) && Object.prototype.hasOwnProperty.call(o, n)), nv = (e, n, o) => (i) => {
  if (typeof i != "string")
    return i;
  const [a, d, f, p] = i.match(Rd);
  return {
    [e]: parseFloat(a),
    [n]: parseFloat(d),
    [o]: parseFloat(f),
    alpha: p !== void 0 ? parseFloat(p) : 1
  };
}, R1 = (e) => on(0, 255, e), ic = {
  ...fo,
  transform: (e) => Math.round(R1(e))
}, hr = {
  test: /* @__PURE__ */ Nd("rgb", "red"),
  parse: /* @__PURE__ */ nv("red", "green", "blue"),
  transform: ({ red: e, green: n, blue: o, alpha: i = 1 }) => "rgba(" + ic.transform(e) + ", " + ic.transform(n) + ", " + ic.transform(o) + ", " + ai(vi.transform(i)) + ")"
};
function N1(e) {
  let n = "", o = "", i = "", a = "";
  return e.length > 5 ? (n = e.substring(1, 3), o = e.substring(3, 5), i = e.substring(5, 7), a = e.substring(7, 9)) : (n = e.substring(1, 2), o = e.substring(2, 3), i = e.substring(3, 4), a = e.substring(4, 5), n += n, o += o, i += i, a += a), {
    red: parseInt(n, 16),
    green: parseInt(o, 16),
    blue: parseInt(i, 16),
    alpha: a ? parseInt(a, 16) / 255 : 1
  };
}
const Ic = {
  test: /* @__PURE__ */ Nd("#"),
  parse: N1,
  transform: hr.transform
}, Ei = /* @__NO_SIDE_EFFECTS__ */ (e) => ({
  test: (n) => typeof n == "string" && n.endsWith(e) && n.split(" ").length === 1,
  parse: parseFloat,
  transform: (n) => `${n}${e}`
}), mn = /* @__PURE__ */ Ei("deg"), rn = /* @__PURE__ */ Ei("%"), ne = /* @__PURE__ */ Ei("px"), D1 = /* @__PURE__ */ Ei("vh"), j1 = /* @__PURE__ */ Ei("vw"), Ih = {
  ...rn,
  parse: (e) => rn.parse(e) / 100,
  transform: (e) => rn.transform(e * 100)
}, no = {
  test: /* @__PURE__ */ Nd("hsl", "hue"),
  parse: /* @__PURE__ */ nv("hue", "saturation", "lightness"),
  transform: ({ hue: e, saturation: n, lightness: o, alpha: i = 1 }) => "hsla(" + Math.round(e) + ", " + rn.transform(ai(n)) + ", " + rn.transform(ai(o)) + ", " + ai(vi.transform(i)) + ")"
}, Be = {
  test: (e) => hr.test(e) || Ic.test(e) || no.test(e),
  parse: (e) => hr.test(e) ? hr.parse(e) : no.test(e) ? no.parse(e) : Ic.parse(e),
  transform: (e) => typeof e == "string" ? e : e.hasOwnProperty("red") ? hr.transform(e) : no.transform(e),
  getAnimatableNone: (e) => {
    const n = Be.parse(e);
    return n.alpha = 0, Be.transform(n);
  }
}, I1 = /(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;
function F1(e) {
  var n, o;
  return isNaN(e) && typeof e == "string" && (((n = e.match(Rd)) == null ? void 0 : n.length) || 0) + (((o = e.match(I1)) == null ? void 0 : o.length) || 0) > 0;
}
const rv = "number", ov = "color", O1 = "var", L1 = "var(", Fh = "${}", V1 = /var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;
function ao(e) {
  const n = e.toString(), o = [], i = {
    color: [],
    number: [],
    var: []
  }, a = [];
  let d = 0;
  const p = n.replace(V1, (m) => (Be.test(m) ? (i.color.push(d), a.push(ov), o.push(Be.parse(m))) : m.startsWith(L1) ? (i.var.push(d), a.push(O1), o.push(m)) : (i.number.push(d), a.push(rv), o.push(parseFloat(m))), ++d, Fh)).split(Fh);
  return { values: o, split: p, indexes: i, types: a };
}
function z1(e) {
  return ao(e).values;
}
function iv({ split: e, types: n }) {
  const o = e.length;
  return (i) => {
    let a = "";
    for (let d = 0; d < o; d++)
      if (a += e[d], i[d] !== void 0) {
        const f = n[d];
        f === rv ? a += ai(i[d]) : f === ov ? a += Be.transform(i[d]) : a += i[d];
      }
    return a;
  };
}
function B1(e) {
  return iv(ao(e));
}
const $1 = (e) => typeof e == "number" ? 0 : Be.test(e) ? Be.getAnimatableNone(e) : e, U1 = (e, n) => typeof e == "number" ? n != null && n.trim().endsWith("/") ? e : 0 : $1(e);
function H1(e) {
  const n = ao(e);
  return iv(n)(n.values.map((i, a) => U1(i, n.split[a])));
}
const Wt = {
  test: F1,
  parse: z1,
  createTransformer: B1,
  getAnimatableNone: H1
};
function sc(e, n, o) {
  return o < 0 && (o += 1), o > 1 && (o -= 1), o < 1 / 6 ? e + (n - e) * 6 * o : o < 1 / 2 ? n : o < 2 / 3 ? e + (n - e) * (2 / 3 - o) * 6 : e;
}
function W1({ hue: e, saturation: n, lightness: o, alpha: i }) {
  e /= 360, n /= 100, o /= 100;
  let a = 0, d = 0, f = 0;
  if (!n)
    a = d = f = o;
  else {
    const p = o < 0.5 ? o * (1 + n) : o + n - o * n, m = 2 * o - p;
    a = sc(m, p, e + 1 / 3), d = sc(m, p, e), f = sc(m, p, e - 1 / 3);
  }
  return {
    red: Math.round(a * 255),
    green: Math.round(d * 255),
    blue: Math.round(f * 255),
    alpha: i
  };
}
function Ta(e, n) {
  return (o) => o > 0 ? n : e;
}
const be = (e, n, o) => e + (n - e) * o, ac = (e, n, o) => {
  const i = e * e, a = o * (n * n - i) + i;
  return a < 0 ? 0 : Math.sqrt(a);
}, G1 = [Ic, hr, no], K1 = (e) => G1.find((n) => n.test(e));
function Oh(e) {
  const n = K1(e);
  if (Ci(!!n, `'${e}' is not an animatable color. Use the equivalent color code instead.`, "color-not-animatable"), !n)
    return !1;
  let o = n.parse(e);
  return n === no && (o = W1(o)), o;
}
const Lh = (e, n) => {
  const o = Oh(e), i = Oh(n);
  if (!o || !i)
    return Ta(e, n);
  const a = { ...o };
  return (d) => (a.red = ac(o.red, i.red, d), a.green = ac(o.green, i.green, d), a.blue = ac(o.blue, i.blue, d), a.alpha = be(o.alpha, i.alpha, d), hr.transform(a));
}, Fc = /* @__PURE__ */ new Set(["none", "hidden"]);
function Y1(e, n) {
  return Fc.has(e) ? (o) => o <= 0 ? e : n : (o) => o >= 1 ? n : e;
}
function Q1(e, n) {
  return (o) => be(e, n, o);
}
function Dd(e) {
  return typeof e == "number" ? Q1 : typeof e == "string" ? Md(e) ? Ta : Be.test(e) ? Lh : q1 : Array.isArray(e) ? sv : typeof e == "object" ? Be.test(e) ? Lh : X1 : Ta;
}
function sv(e, n) {
  const o = [...e], i = o.length, a = e.map((d, f) => Dd(d)(d, n[f]));
  return (d) => {
    for (let f = 0; f < i; f++)
      o[f] = a[f](d);
    return o;
  };
}
function X1(e, n) {
  const o = { ...e, ...n }, i = {};
  for (const a in o)
    e[a] !== void 0 && n[a] !== void 0 && (i[a] = Dd(e[a])(e[a], n[a]));
  return (a) => {
    for (const d in i)
      o[d] = i[d](a);
    return o;
  };
}
function Z1(e, n) {
  const o = [], i = { color: 0, var: 0, number: 0 };
  for (let a = 0; a < n.values.length; a++) {
    const d = n.types[a], f = e.indexes[d][i[d]], p = e.values[f] ?? 0;
    o[a] = p, i[d]++;
  }
  return o;
}
const q1 = (e, n) => {
  const o = Wt.createTransformer(n), i = ao(e), a = ao(n);
  return i.indexes.var.length === a.indexes.var.length && i.indexes.color.length === a.indexes.color.length && i.indexes.number.length >= a.indexes.number.length ? Fc.has(e) && !a.values.length || Fc.has(n) && !i.values.length ? Y1(e, n) : bi(sv(Z1(i, a), a.values), o) : (Ci(!0, `Complex values '${e}' and '${n}' too different to mix. Ensure all colors are of the same type, and that each contains the same quantity of number and color values. Falling back to instant transition.`, "complex-values-different"), Ta(e, n));
};
function av(e, n, o) {
  return typeof e == "number" && typeof n == "number" && typeof o == "number" ? be(e, n, o) : Dd(e)(e, n);
}
const J1 = (e) => {
  const n = ({ timestamp: o }) => e(o);
  return {
    start: (o = !0) => ke.update(n, o),
    stop: () => vn(n),
    /**
     * If we're processing this frame we can use the
     * framelocked timestamp to keep things in sync.
     */
    now: () => qe.isProcessing ? qe.timestamp : at.now()
  };
}, lv = (e, n, o = 10) => {
  let i = "";
  const a = Math.max(Math.round(n / o), 2);
  for (let d = 0; d < a; d++)
    i += Math.round(e(d / (a - 1)) * 1e4) / 1e4 + ", ";
  return `linear(${i.substring(0, i.length - 2)})`;
}, ka = 2e4;
function jd(e) {
  let n = 0;
  const o = 50;
  let i = e.next(n);
  for (; !i.done && n < ka; )
    n += o, i = e.next(n);
  return n >= ka ? 1 / 0 : n;
}
function e_(e, n = 100, o) {
  const i = o({ ...e, keyframes: [0, n] }), a = Math.min(jd(i), ka);
  return {
    type: "keyframes",
    ease: (d) => i.next(a * d).value / n,
    duration: /* @__PURE__ */ Dt(a)
  };
}
const Fe = {
  // Default spring physics
  stiffness: 100,
  damping: 10,
  mass: 1,
  velocity: 0,
  // Default duration/bounce-based options
  duration: 800,
  // in ms
  bounce: 0.3,
  visualDuration: 0.3,
  // in seconds
  // Rest thresholds
  restSpeed: {
    granular: 0.01,
    default: 2
  },
  restDelta: {
    granular: 5e-3,
    default: 0.5
  },
  // Limits
  minDuration: 0.01,
  // in seconds
  maxDuration: 10,
  // in seconds
  minDamping: 0.05,
  maxDamping: 1
};
function Oc(e, n) {
  return e * Math.sqrt(1 - n * n);
}
const t_ = 12;
function n_(e, n, o) {
  let i = o;
  for (let a = 1; a < t_; a++)
    i = i - e(i) / n(i);
  return i;
}
const lc = 1e-3;
function r_({ duration: e = Fe.duration, bounce: n = Fe.bounce, velocity: o = Fe.velocity, mass: i = Fe.mass }) {
  let a, d;
  Ci(e <= /* @__PURE__ */ gt(Fe.maxDuration), "Spring duration must be 10 seconds or less", "spring-duration-limit");
  let f = 1 - n;
  f = on(Fe.minDamping, Fe.maxDamping, f), e = on(Fe.minDuration, Fe.maxDuration, /* @__PURE__ */ Dt(e)), f < 1 ? (a = (y) => {
    const S = y * f, l = S * e, c = S - o, g = Oc(y, f), x = Math.exp(-l);
    return lc - c / g * x;
  }, d = (y) => {
    const l = y * f * e, c = l * o + o, g = Math.pow(f, 2) * Math.pow(y, 2) * e, x = Math.exp(-l), _ = Oc(Math.pow(y, 2), f);
    return (-a(y) + lc > 0 ? -1 : 1) * ((c - g) * x) / _;
  }) : (a = (y) => {
    const S = Math.exp(-y * e), l = (y - o) * e + 1;
    return -lc + S * l;
  }, d = (y) => {
    const S = Math.exp(-y * e), l = (o - y) * (e * e);
    return S * l;
  });
  const p = 5 / e, m = n_(a, d, p);
  if (e = /* @__PURE__ */ gt(e), isNaN(m))
    return {
      stiffness: Fe.stiffness,
      damping: Fe.damping,
      duration: e
    };
  {
    const y = Math.pow(m, 2) * i;
    return {
      stiffness: y,
      damping: f * 2 * Math.sqrt(i * y),
      duration: e
    };
  }
}
const o_ = ["duration", "bounce"], i_ = ["stiffness", "damping", "mass"];
function Vh(e, n) {
  return n.some((o) => e[o] !== void 0);
}
function s_(e) {
  let n = {
    velocity: Fe.velocity,
    stiffness: Fe.stiffness,
    damping: Fe.damping,
    mass: Fe.mass,
    isResolvedFromDuration: !1,
    ...e
  };
  if (!Vh(e, i_) && Vh(e, o_))
    if (n.velocity = 0, e.visualDuration) {
      const o = e.visualDuration, i = 2 * Math.PI / (o * 1.2), a = i * i, d = 2 * on(0.05, 1, 1 - (e.bounce || 0)) * Math.sqrt(a);
      n = {
        ...n,
        mass: Fe.mass,
        stiffness: a,
        damping: d
      };
    } else {
      const o = r_({ ...e, velocity: 0 });
      n = {
        ...n,
        ...o,
        mass: Fe.mass
      }, n.isResolvedFromDuration = !0;
    }
  return n;
}
function Aa(e = Fe.visualDuration, n = Fe.bounce) {
  const o = typeof e != "object" ? {
    visualDuration: e,
    keyframes: [0, 1],
    bounce: n
  } : e;
  let { restSpeed: i, restDelta: a } = o;
  const d = o.keyframes[0], f = o.keyframes[o.keyframes.length - 1], p = { done: !1, value: d }, { stiffness: m, damping: y, mass: S, duration: l, velocity: c, isResolvedFromDuration: g } = s_({
    ...o,
    velocity: -/* @__PURE__ */ Dt(o.velocity || 0)
  }), x = c || 0, _ = y / (2 * Math.sqrt(m * S)), A = f - d, T = /* @__PURE__ */ Dt(Math.sqrt(m / S)), b = Math.abs(A) < 5;
  i || (i = b ? Fe.restSpeed.granular : Fe.restSpeed.default), a || (a = b ? Fe.restDelta.granular : Fe.restDelta.default);
  let E, D, L, G, W, H;
  if (_ < 1)
    L = Oc(T, _), G = (x + _ * T * A) / L, E = (X) => {
      const J = Math.exp(-_ * T * X);
      return f - J * (G * Math.sin(L * X) + A * Math.cos(L * X));
    }, W = _ * T * G + A * L, H = _ * T * A - G * L, D = (X) => Math.exp(-_ * T * X) * (W * Math.sin(L * X) + H * Math.cos(L * X));
  else if (_ === 1) {
    E = (J) => f - Math.exp(-T * J) * (A + (x + T * A) * J);
    const X = x + T * A;
    D = (J) => Math.exp(-T * J) * (T * X * J - x);
  } else {
    const X = T * Math.sqrt(_ * _ - 1);
    E = (fe) => {
      const ye = Math.exp(-_ * T * fe), ae = Math.min(X * fe, 300);
      return f - ye * ((x + _ * T * A) * Math.sinh(ae) + X * A * Math.cosh(ae)) / X;
    };
    const J = (x + _ * T * A) / X, ce = _ * T * J - A * X, me = _ * T * A - J * X;
    D = (fe) => {
      const ye = Math.exp(-_ * T * fe), ae = Math.min(X * fe, 300);
      return ye * (ce * Math.sinh(ae) + me * Math.cosh(ae));
    };
  }
  const V = {
    calculatedDuration: g && l || null,
    velocity: (X) => /* @__PURE__ */ gt(D(X)),
    next: (X) => {
      if (!g && _ < 1) {
        const ce = Math.exp(-_ * T * X), me = Math.sin(L * X), fe = Math.cos(L * X), ye = f - ce * (G * me + A * fe), ae = /* @__PURE__ */ gt(ce * (W * me + H * fe));
        return p.done = Math.abs(ae) <= i && Math.abs(f - ye) <= a, p.value = p.done ? f : ye, p;
      }
      const J = E(X);
      if (g)
        p.done = X >= l;
      else {
        const ce = /* @__PURE__ */ gt(D(X));
        p.done = Math.abs(ce) <= i && Math.abs(f - J) <= a;
      }
      return p.value = p.done ? f : J, p;
    },
    toString: () => {
      const X = Math.min(jd(V), ka), J = lv((ce) => V.next(X * ce).value, X, 30);
      return X + "ms " + J;
    },
    toTransition: () => {
    }
  };
  return V;
}
Aa.applyToOptions = (e) => {
  const n = e_(e, 100, Aa);
  return e.ease = n.ease, e.duration = /* @__PURE__ */ gt(n.duration), e.type = "keyframes", e;
};
const a_ = 5;
function uv(e, n, o) {
  const i = Math.max(n - a_, 0);
  return /* @__PURE__ */ $g(o - e(i), n - i);
}
function Lc({ keyframes: e, velocity: n = 0, power: o = 0.8, timeConstant: i = 325, bounceDamping: a = 10, bounceStiffness: d = 500, modifyTarget: f, min: p, max: m, restDelta: y = 0.5, restSpeed: S }) {
  const l = e[0], c = {
    done: !1,
    value: l
  }, g = (H) => p !== void 0 && H < p || m !== void 0 && H > m, x = (H) => p === void 0 ? m : m === void 0 || Math.abs(p - H) < Math.abs(m - H) ? p : m;
  let _ = o * n;
  const A = l + _, T = f === void 0 ? A : f(A);
  T !== A && (_ = T - l);
  const b = (H) => -_ * Math.exp(-H / i), E = (H) => T + b(H), D = (H) => {
    const V = b(H), X = E(H);
    c.done = Math.abs(V) <= y, c.value = c.done ? T : X;
  };
  let L, G;
  const W = (H) => {
    g(c.value) && (L = H, G = Aa({
      keyframes: [c.value, x(c.value)],
      velocity: uv(E, H, c.value),
      // TODO: This should be passing * 1000
      damping: a,
      stiffness: d,
      restDelta: y,
      restSpeed: S
    }));
  };
  return W(0), {
    calculatedDuration: null,
    next: (H) => {
      let V = !1;
      return !G && L === void 0 && (V = !0, D(H), W(H)), L !== void 0 && H >= L ? G.next(H - L) : (!V && D(H), c);
    }
  };
}
function l_(e, n, o) {
  const i = [], a = o || Kn.mix || av, d = e.length - 1;
  for (let f = 0; f < d; f++) {
    let p = a(e[f], e[f + 1]);
    if (n) {
      const m = Array.isArray(n) ? n[f] || jt : n;
      p = bi(m, p);
    }
    i.push(p);
  }
  return i;
}
function cv(e, n, { clamp: o = !0, ease: i, mixer: a } = {}) {
  const d = e.length;
  if (Tr(d === n.length, "Both input and output ranges must be the same length", "range-length"), d === 1)
    return () => n[0];
  if (d === 2 && n[0] === n[1])
    return () => n[1];
  const f = e[0] === e[1];
  e[0] > e[d - 1] && (e = [...e].reverse(), n = [...n].reverse());
  const p = l_(n, i, a), m = p.length, y = (S) => {
    if (f && S < e[0])
      return n[0];
    let l = 0;
    if (m > 1)
      for (; l < e.length - 2 && !(S < e[l + 1]); l++)
        ;
    const c = /* @__PURE__ */ gi(e[l], e[l + 1], S);
    return p[l](c);
  };
  return o ? (S) => y(on(e[0], e[d - 1], S)) : y;
}
function u_(e, n) {
  const o = e[e.length - 1];
  for (let i = 1; i <= n; i++) {
    const a = /* @__PURE__ */ gi(0, n, i);
    e.push(be(o, 1, a));
  }
}
function c_(e) {
  const n = [0];
  return u_(n, e.length - 1), n;
}
function d_(e, n) {
  return e.map((o) => o * n);
}
function f_(e, n) {
  return e.map(() => n || Zg).splice(0, e.length - 1);
}
function li({ duration: e = 300, keyframes: n, times: o, ease: i = "easeInOut" }) {
  const a = /* @__PURE__ */ _1(i) ? i.map(Dh) : Dh(i), d = {
    done: !1,
    value: n[0]
  }, f = d_(
    // Only use the provided offsets if they're the correct length
    // TODO Maybe we should warn here if there's a length mismatch
    o && o.length === n.length ? o : c_(n),
    e
  ), p = cv(f, n, {
    ease: Array.isArray(a) ? a : f_(n, a)
  });
  return {
    calculatedDuration: e,
    next: (m) => (d.value = p(m), d.done = m >= e, d)
  };
}
const p_ = (e) => e !== null;
function Ka(e, { repeat: n, repeatType: o = "loop" }, i, a = 1) {
  const d = e.filter(p_), p = a < 0 || n && o !== "loop" && n % 2 === 1 ? 0 : d.length - 1;
  return !p || i === void 0 ? d[p] : i;
}
const m_ = {
  decay: Lc,
  inertia: Lc,
  tween: li,
  keyframes: li,
  spring: Aa
};
function dv(e) {
  typeof e.type == "string" && (e.type = m_[e.type]);
}
class Id {
  constructor() {
    this.updateFinished();
  }
  get finished() {
    return this._finished;
  }
  updateFinished() {
    this._finished = new Promise((n) => {
      this.resolve = n;
    });
  }
  notifyFinished() {
    this.resolve();
  }
  /**
   * Allows the animation to be awaited.
   *
   * @deprecated Use `finished` instead.
   */
  then(n, o) {
    return this.finished.then(n, o);
  }
}
const h_ = (e) => e / 100;
class Si extends Id {
  constructor(n) {
    super(), this.state = "idle", this.startTime = null, this.isStopped = !1, this.currentTime = 0, this.holdTime = null, this.playbackSpeed = 1, this.delayState = {
      done: !1,
      value: void 0
    }, this.stop = () => {
      var i, a;
      const { motionValue: o } = this.options;
      o && o.updatedAt !== at.now() && this.tick(at.now()), this.isStopped = !0, this.state !== "idle" && (this.teardown(), (a = (i = this.options).onStop) == null || a.call(i));
    }, this.options = n, this.initAnimation(), this.play(), n.autoplay === !1 && this.pause();
  }
  initAnimation() {
    const { options: n } = this;
    dv(n);
    const { type: o = li, repeat: i = 0, repeatDelay: a = 0, repeatType: d, velocity: f = 0 } = n;
    let { keyframes: p } = n;
    const m = o || li;
    m !== li && typeof p[0] != "number" && (this.mixKeyframes = bi(h_, av(p[0], p[1])), p = [0, 100]);
    const y = m({ ...n, keyframes: p });
    d === "mirror" && (this.mirroredGenerator = m({
      ...n,
      keyframes: [...p].reverse(),
      velocity: -f
    })), y.calculatedDuration === null && (y.calculatedDuration = jd(y));
    const { calculatedDuration: S } = y;
    this.calculatedDuration = S, this.resolvedDuration = S + a, this.totalDuration = this.resolvedDuration * (i + 1) - a, this.generator = y;
  }
  updateTime(n) {
    const o = Math.round(n - this.startTime) * this.playbackSpeed;
    this.holdTime !== null ? this.currentTime = this.holdTime : this.currentTime = o;
  }
  tick(n, o = !1) {
    const { generator: i, totalDuration: a, mixKeyframes: d, mirroredGenerator: f, resolvedDuration: p, calculatedDuration: m } = this;
    if (this.startTime === null)
      return i.next(0);
    const { delay: y = 0, keyframes: S, repeat: l, repeatType: c, repeatDelay: g, type: x, onUpdate: _, finalKeyframe: A } = this.options;
    this.speed > 0 ? this.startTime = Math.min(this.startTime, n) : this.speed < 0 && (this.startTime = Math.min(n - a / this.speed, this.startTime)), o ? this.currentTime = n : this.updateTime(n);
    const T = this.currentTime - y * (this.playbackSpeed >= 0 ? 1 : -1), b = this.playbackSpeed >= 0 ? T < 0 : T > a;
    this.currentTime = Math.max(T, 0), this.state === "finished" && this.holdTime === null && (this.currentTime = a);
    let E = this.currentTime, D = i;
    if (l) {
      const H = Math.min(this.currentTime, a) / p;
      let V = Math.floor(H), X = H % 1;
      !X && H >= 1 && (X = 1), X === 1 && V--, V = Math.min(V, l + 1), !!(V % 2) && (c === "reverse" ? (X = 1 - X, g && (X -= g / p)) : c === "mirror" && (D = f)), E = on(0, 1, X) * p;
    }
    let L;
    b ? (this.delayState.value = S[0], L = this.delayState) : L = D.next(E), d && !b && (L.value = d(L.value));
    let { done: G } = L;
    !b && m !== null && (G = this.playbackSpeed >= 0 ? this.currentTime >= a : this.currentTime <= 0);
    const W = this.holdTime === null && (this.state === "finished" || this.state === "running" && G);
    return W && x !== Lc && (L.value = Ka(S, this.options, A, this.speed)), _ && _(L.value), W && this.finish(), L;
  }
  /**
   * Allows the returned animation to be awaited or promise-chained. Currently
   * resolves when the animation finishes at all but in a future update could/should
   * reject if its cancels.
   */
  then(n, o) {
    return this.finished.then(n, o);
  }
  get duration() {
    return /* @__PURE__ */ Dt(this.calculatedDuration);
  }
  get iterationDuration() {
    const { delay: n = 0 } = this.options || {};
    return this.duration + /* @__PURE__ */ Dt(n);
  }
  get time() {
    return /* @__PURE__ */ Dt(this.currentTime);
  }
  set time(n) {
    n = /* @__PURE__ */ gt(n), this.currentTime = n, this.startTime === null || this.holdTime !== null || this.playbackSpeed === 0 ? this.holdTime = n : this.driver && (this.startTime = this.driver.now() - n / this.playbackSpeed), this.driver ? this.driver.start(!1) : (this.startTime = 0, this.state = "paused", this.holdTime = n, this.tick(n));
  }
  /**
   * Returns the generator's velocity at the current time in units/second.
   * Uses the analytical derivative when available (springs), avoiding
   * the MotionValue's frame-dependent velocity estimation.
   */
  getGeneratorVelocity() {
    const n = this.currentTime;
    if (n <= 0)
      return this.options.velocity || 0;
    if (this.generator.velocity)
      return this.generator.velocity(n);
    const o = this.generator.next(n).value;
    return uv((i) => this.generator.next(i).value, n, o);
  }
  get speed() {
    return this.playbackSpeed;
  }
  set speed(n) {
    const o = this.playbackSpeed !== n;
    o && this.driver && this.updateTime(at.now()), this.playbackSpeed = n, o && this.driver && (this.time = /* @__PURE__ */ Dt(this.currentTime));
  }
  play() {
    var a, d;
    if (this.isStopped)
      return;
    const { driver: n = J1, startTime: o } = this.options;
    this.driver || (this.driver = n((f) => this.tick(f))), (d = (a = this.options).onPlay) == null || d.call(a);
    const i = this.driver.now();
    this.state === "finished" ? (this.updateFinished(), this.startTime = i) : this.holdTime !== null ? this.startTime = i - this.holdTime : this.startTime || (this.startTime = o ?? i), this.state === "finished" && this.speed < 0 && (this.startTime += this.calculatedDuration), this.holdTime = null, this.state = "running", this.driver.start();
  }
  pause() {
    this.state = "paused", this.updateTime(at.now()), this.holdTime = this.currentTime;
  }
  complete() {
    this.state !== "running" && this.play(), this.state = "finished", this.holdTime = null;
  }
  finish() {
    var n, o;
    this.notifyFinished(), this.teardown(), this.state = "finished", (o = (n = this.options).onComplete) == null || o.call(n);
  }
  cancel() {
    var n, o;
    this.holdTime = null, this.startTime = 0, this.tick(0), this.teardown(), (o = (n = this.options).onCancel) == null || o.call(n);
  }
  teardown() {
    this.state = "idle", this.stopDriver(), this.startTime = this.holdTime = null;
  }
  stopDriver() {
    this.driver && (this.driver.stop(), this.driver = void 0);
  }
  sample(n) {
    return this.startTime = 0, this.tick(n, !0);
  }
  attachTimeline(n) {
    var o;
    return this.options.allowFlatten && (this.options.type = "keyframes", this.options.ease = "linear", this.initAnimation()), (o = this.driver) == null || o.stop(), n.observe(this);
  }
}
function y_(e) {
  for (let n = 1; n < e.length; n++)
    e[n] ?? (e[n] = e[n - 1]);
}
const yr = (e) => e * 180 / Math.PI, Vc = (e) => {
  const n = yr(Math.atan2(e[1], e[0]));
  return zc(n);
}, g_ = {
  x: 4,
  y: 5,
  translateX: 4,
  translateY: 5,
  scaleX: 0,
  scaleY: 3,
  scale: (e) => (Math.abs(e[0]) + Math.abs(e[3])) / 2,
  rotate: Vc,
  rotateZ: Vc,
  skewX: (e) => yr(Math.atan(e[1])),
  skewY: (e) => yr(Math.atan(e[2])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[2])) / 2
}, zc = (e) => (e = e % 360, e < 0 && (e += 360), e), zh = Vc, Bh = (e) => Math.sqrt(e[0] * e[0] + e[1] * e[1]), $h = (e) => Math.sqrt(e[4] * e[4] + e[5] * e[5]), v_ = {
  x: 12,
  y: 13,
  z: 14,
  translateX: 12,
  translateY: 13,
  translateZ: 14,
  scaleX: Bh,
  scaleY: $h,
  scale: (e) => (Bh(e) + $h(e)) / 2,
  rotateX: (e) => zc(yr(Math.atan2(e[6], e[5]))),
  rotateY: (e) => zc(yr(Math.atan2(-e[2], e[0]))),
  rotateZ: zh,
  rotate: zh,
  skewX: (e) => yr(Math.atan(e[4])),
  skewY: (e) => yr(Math.atan(e[1])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[4])) / 2
};
function Bc(e) {
  return e.includes("scale") ? 1 : 0;
}
function $c(e, n) {
  if (!e || e === "none")
    return Bc(n);
  const o = e.match(/^matrix3d\(([-\d.e\s,]+)\)$/u);
  let i, a;
  if (o)
    i = v_, a = o;
  else {
    const p = e.match(/^matrix\(([-\d.e\s,]+)\)$/u);
    i = g_, a = p;
  }
  if (!a)
    return Bc(n);
  const d = i[n], f = a[1].split(",").map(w_);
  return typeof d == "function" ? d(f) : f[d];
}
const S_ = (e, n) => {
  const { transform: o = "none" } = getComputedStyle(e);
  return $c(o, n);
};
function w_(e) {
  return parseFloat(e.trim());
}
const po = [
  "transformPerspective",
  "x",
  "y",
  "z",
  "translateX",
  "translateY",
  "translateZ",
  "scale",
  "scaleX",
  "scaleY",
  "rotate",
  "rotateX",
  "rotateY",
  "rotateZ",
  "skew",
  "skewX",
  "skewY"
], mo = /* @__PURE__ */ new Set([...po, "pathRotation"]), Uh = (e) => e === fo || e === ne, x_ = /* @__PURE__ */ new Set(["x", "y", "z"]), __ = po.filter((e) => !x_.has(e));
function T_(e) {
  const n = [];
  return __.forEach((o) => {
    const i = e.getValue(o);
    i !== void 0 && (n.push([o, i.get()]), i.set(o.startsWith("scale") ? 1 : 0));
  }), n;
}
const Hn = {
  // Dimensions
  width: ({ x: e }, { paddingLeft: n = "0", paddingRight: o = "0", boxSizing: i }) => {
    const a = e.max - e.min;
    return i === "border-box" ? a : a - parseFloat(n) - parseFloat(o);
  },
  height: ({ y: e }, { paddingTop: n = "0", paddingBottom: o = "0", boxSizing: i }) => {
    const a = e.max - e.min;
    return i === "border-box" ? a : a - parseFloat(n) - parseFloat(o);
  },
  top: (e, { top: n }) => parseFloat(n),
  left: (e, { left: n }) => parseFloat(n),
  bottom: ({ y: e }, { top: n }) => parseFloat(n) + (e.max - e.min),
  right: ({ x: e }, { left: n }) => parseFloat(n) + (e.max - e.min),
  // Transform
  x: (e, { transform: n }) => $c(n, "x"),
  y: (e, { transform: n }) => $c(n, "y")
};
Hn.translateX = Hn.x;
Hn.translateY = Hn.y;
const vr = /* @__PURE__ */ new Set();
let Uc = !1, Hc = !1, Wc = !1;
function fv() {
  if (Hc) {
    const e = Array.from(vr).filter((i) => i.needsMeasurement), n = new Set(e.map((i) => i.element)), o = /* @__PURE__ */ new Map();
    n.forEach((i) => {
      const a = T_(i);
      a.length && (o.set(i, a), i.render());
    }), e.forEach((i) => i.measureInitialState()), n.forEach((i) => {
      i.render();
      const a = o.get(i);
      a && a.forEach(([d, f]) => {
        var p;
        (p = i.getValue(d)) == null || p.set(f);
      });
    }), e.forEach((i) => i.measureEndState()), e.forEach((i) => {
      i.suspendedScrollY !== void 0 && window.scrollTo(0, i.suspendedScrollY);
    });
  }
  Hc = !1, Uc = !1, vr.forEach((e) => e.complete(Wc)), vr.clear();
}
function pv() {
  vr.forEach((e) => {
    e.readKeyframes(), e.needsMeasurement && (Hc = !0);
  });
}
function k_() {
  Wc = !0, pv(), fv(), Wc = !1;
}
class Fd {
  constructor(n, o, i, a, d, f = !1) {
    this.state = "pending", this.isAsync = !1, this.needsMeasurement = !1, this.unresolvedKeyframes = [...n], this.onComplete = o, this.name = i, this.motionValue = a, this.element = d, this.isAsync = f;
  }
  scheduleResolve() {
    this.state = "scheduled", this.isAsync ? (vr.add(this), Uc || (Uc = !0, ke.read(pv), ke.resolveKeyframes(fv))) : (this.readKeyframes(), this.complete());
  }
  readKeyframes() {
    const { unresolvedKeyframes: n, name: o, element: i, motionValue: a } = this;
    if (n[0] === null) {
      const d = a == null ? void 0 : a.get(), f = n[n.length - 1];
      if (d !== void 0)
        n[0] = d;
      else if (i && o) {
        const p = i.readValue(o, f);
        p != null && (n[0] = p);
      }
      n[0] === void 0 && (n[0] = f), a && d === void 0 && a.set(n[0]);
    }
    y_(n);
  }
  setFinalKeyframe() {
  }
  measureInitialState() {
  }
  renderEndStyles() {
  }
  measureEndState() {
  }
  complete(n = !1) {
    this.state = "complete", this.onComplete(this.unresolvedKeyframes, this.finalKeyframe, n), vr.delete(this);
  }
  cancel() {
    this.state === "scheduled" && (vr.delete(this), this.state = "pending");
  }
  resume() {
    this.state === "pending" && this.scheduleResolve();
  }
}
const A_ = (e) => e.startsWith("--");
function mv(e, n, o) {
  A_(n) ? e.style.setProperty(n, o) : e.style[n] = o;
}
const C_ = {};
function hv(e, n) {
  const o = /* @__PURE__ */ Bg(e);
  return () => C_[n] ?? o();
}
const b_ = /* @__PURE__ */ hv(() => window.ScrollTimeline !== void 0, "scrollTimeline"), yv = /* @__PURE__ */ hv(() => {
  try {
    document.createElement("div").animate({ opacity: 0 }, { easing: "linear(0, 1)" });
  } catch {
    return !1;
  }
  return !0;
}, "linearEasing"), ii = ([e, n, o, i]) => `cubic-bezier(${e}, ${n}, ${o}, ${i})`, Hh = {
  linear: "linear",
  ease: "ease",
  easeIn: "ease-in",
  easeOut: "ease-out",
  easeInOut: "ease-in-out",
  circIn: /* @__PURE__ */ ii([0, 0.65, 0.55, 1]),
  circOut: /* @__PURE__ */ ii([0.55, 0, 1, 0.45]),
  backIn: /* @__PURE__ */ ii([0.31, 0.01, 0.66, -0.59]),
  backOut: /* @__PURE__ */ ii([0.33, 1.53, 0.69, 0.99])
};
function gv(e, n) {
  if (e)
    return typeof e == "function" ? yv() ? lv(e, n) : "ease-out" : /* @__PURE__ */ qg(e) ? ii(e) : Array.isArray(e) ? e.map((o) => gv(o, n) || Hh.easeOut) : Hh[e];
}
function P_(e, n, o, { delay: i = 0, duration: a = 300, repeat: d = 0, repeatType: f = "loop", ease: p = "easeOut", times: m } = {}, y = void 0) {
  const S = {
    [n]: o
  };
  m && (S.offset = m);
  const l = gv(p, a);
  Array.isArray(l) && (S.easing = l);
  const c = {
    delay: i,
    duration: a,
    easing: Array.isArray(l) ? "linear" : l,
    fill: "both",
    iterations: d + 1,
    direction: f === "reverse" ? "alternate" : "normal"
  };
  return y && (c.pseudoElement = y), e.animate(S, c);
}
function vv(e) {
  return typeof e == "function" && "applyToOptions" in e;
}
function E_({ type: e, ...n }) {
  return vv(e) && yv() ? e.applyToOptions(n) : (n.duration ?? (n.duration = 300), n.ease ?? (n.ease = "easeOut"), n);
}
class Sv extends Id {
  constructor(n) {
    if (super(), this.finishedTime = null, this.isStopped = !1, this.manualStartTime = null, !n)
      return;
    const { element: o, name: i, keyframes: a, pseudoElement: d, allowFlatten: f = !1, finalKeyframe: p, onComplete: m } = n;
    this.isPseudoElement = !!d, this.allowFlatten = f, this.options = n, Tr(typeof n.type != "string", `Mini animate() doesn't support "type" as a string.`, "mini-spring");
    const y = E_(n);
    this.animation = P_(o, i, a, y, d), y.autoplay === !1 && this.animation.pause(), this.animation.onfinish = () => {
      if (this.finishedTime = this.time, !d) {
        const S = Ka(a, this.options, p, this.speed);
        this.updateMotionValue && this.updateMotionValue(S), mv(o, i, S), this.animation.cancel();
      }
      m == null || m(), this.notifyFinished();
    };
  }
  play() {
    this.isStopped || (this.manualStartTime = null, this.animation.play(), this.state === "finished" && this.updateFinished());
  }
  pause() {
    this.animation.pause();
  }
  complete() {
    var n, o;
    (o = (n = this.animation).finish) == null || o.call(n);
  }
  cancel() {
    try {
      this.animation.cancel();
    } catch {
    }
  }
  stop() {
    if (this.isStopped)
      return;
    this.isStopped = !0;
    const { state: n } = this;
    n === "idle" || n === "finished" || (this.updateMotionValue ? this.updateMotionValue() : this.commitStyles(), this.isPseudoElement || this.cancel());
  }
  /**
   * WAAPI doesn't natively have any interruption capabilities.
   *
   * In this method, we commit styles back to the DOM before cancelling
   * the animation.
   *
   * This is designed to be overridden by NativeAnimationExtended, which
   * will create a renderless JS animation and sample it twice to calculate
   * its current value, "previous" value, and therefore allow
   * Motion to also correctly calculate velocity for any subsequent animation
   * while deferring the commit until the next animation frame.
   */
  commitStyles() {
    var o, i, a;
    const n = (o = this.options) == null ? void 0 : o.element;
    !this.isPseudoElement && (n != null && n.isConnected) && ((a = (i = this.animation).commitStyles) == null || a.call(i));
  }
  get duration() {
    var o, i;
    const n = ((i = (o = this.animation.effect) == null ? void 0 : o.getComputedTiming) == null ? void 0 : i.call(o).duration) || 0;
    return /* @__PURE__ */ Dt(Number(n));
  }
  get iterationDuration() {
    const { delay: n = 0 } = this.options || {};
    return this.duration + /* @__PURE__ */ Dt(n);
  }
  get time() {
    return /* @__PURE__ */ Dt(Number(this.animation.currentTime) || 0);
  }
  set time(n) {
    const o = this.finishedTime !== null;
    this.manualStartTime = null, this.finishedTime = null, this.animation.currentTime = /* @__PURE__ */ gt(n), o && this.animation.pause();
  }
  /**
   * The playback speed of the animation.
   * 1 = normal speed, 2 = double speed, 0.5 = half speed.
   */
  get speed() {
    return this.animation.playbackRate;
  }
  set speed(n) {
    n < 0 && (this.finishedTime = null), this.animation.playbackRate = n;
  }
  get state() {
    return this.finishedTime !== null ? "finished" : this.animation.playState;
  }
  get startTime() {
    return this.manualStartTime ?? Number(this.animation.startTime);
  }
  set startTime(n) {
    this.manualStartTime = this.animation.startTime = n;
  }
  /**
   * Attaches a timeline to the animation, for instance the `ScrollTimeline`.
   */
  attachTimeline({ timeline: n, rangeStart: o, rangeEnd: i, observe: a }) {
    var d;
    return this.allowFlatten && ((d = this.animation.effect) == null || d.updateTiming({ easing: "linear" })), this.animation.onfinish = null, n && b_() ? (this.animation.timeline = n, o && (this.animation.rangeStart = o), i && (this.animation.rangeEnd = i), jt) : a(this);
  }
}
const wv = {
  anticipate: Yg,
  backInOut: Kg,
  circInOut: Xg
};
function M_(e) {
  return e in wv;
}
function R_(e) {
  typeof e.ease == "string" && M_(e.ease) && (e.ease = wv[e.ease]);
}
const uc = 10;
class N_ extends Sv {
  constructor(n) {
    R_(n), dv(n), super(n), n.startTime !== void 0 && n.autoplay !== !1 && (this.startTime = n.startTime), this.options = n;
  }
  /**
   * WAAPI doesn't natively have any interruption capabilities.
   *
   * Rather than read committed styles back out of the DOM, we can
   * create a renderless JS animation and sample it twice to calculate
   * its current value, "previous" value, and therefore allow
   * Motion to calculate velocity for any subsequent animation.
   */
  updateMotionValue(n) {
    const { motionValue: o, onUpdate: i, onComplete: a, element: d, ...f } = this.options;
    if (!o)
      return;
    if (n !== void 0) {
      o.set(n);
      return;
    }
    const p = new Si({
      ...f,
      autoplay: !1
    }), m = Math.max(uc, at.now() - this.startTime), y = on(0, uc, m - uc), S = p.sample(m).value, { name: l } = this.options;
    d && l && mv(d, l, S), o.setWithVelocity(p.sample(Math.max(0, m - y)).value, S, y), p.stop();
  }
}
const Wh = (e, n) => n === "zIndex" ? !1 : !!(typeof e == "number" || Array.isArray(e) || typeof e == "string" && // It's animatable if we have a string
(Wt.test(e) || e === "0") && // And it contains numbers and/or colors
!e.startsWith("url("));
function D_(e) {
  const n = e[0];
  if (e.length === 1)
    return !0;
  for (let o = 0; o < e.length; o++)
    if (e[o] !== n)
      return !0;
}
function j_(e, n, o, i) {
  const a = e[0];
  if (a === null)
    return !1;
  if (n === "display" || n === "visibility")
    return !0;
  const d = e[e.length - 1], f = Wh(a, n), p = Wh(d, n);
  return Ci(f === p, `You are trying to animate ${n} from "${a}" to "${d}". "${f ? d : a}" is not an animatable value.`, "value-not-animatable"), !f || !p ? !1 : D_(e) || (o === "spring" || vv(o)) && i;
}
function Gc(e) {
  e.duration = 0, e.type = "keyframes";
}
const xv = /* @__PURE__ */ new Set([
  "opacity",
  "clipPath",
  "filter",
  "transform"
  // TODO: Can be accelerated but currently disabled until https://issues.chromium.org/issues/41491098 is resolved
  // or until we implement support for linear() easing.
  // "background-color"
]), I_ = /^(?:oklch|oklab|lab|lch|color|color-mix|light-dark)\(/;
function F_(e) {
  for (let n = 0; n < e.length; n++)
    if (typeof e[n] == "string" && I_.test(e[n]))
      return !0;
  return !1;
}
const O_ = /* @__PURE__ */ new Set([
  "color",
  "backgroundColor",
  "outlineColor",
  "fill",
  "stroke",
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor"
]), L_ = /* @__PURE__ */ Bg(() => Object.hasOwnProperty.call(Element.prototype, "animate"));
function V_(e) {
  var l;
  const { motionValue: n, name: o, repeatDelay: i, repeatType: a, damping: d, type: f, keyframes: p } = e;
  if (!(((l = n == null ? void 0 : n.owner) == null ? void 0 : l.current) instanceof HTMLElement))
    return !1;
  const { onUpdate: y, transformTemplate: S } = n.owner.getProps();
  return L_() && o && /**
   * Force WAAPI for color properties with browser-only color formats
   * (oklch, oklab, lab, lch, etc.) that the JS animation path can't parse.
   */
  (xv.has(o) || O_.has(o) && F_(p)) && (o !== "transform" || !S) && /**
   * If we're outputting values to onUpdate then we can't use WAAPI as there's
   * no way to read the value from WAAPI every frame.
   */
  !y && !i && a !== "mirror" && d !== 0 && f !== "inertia";
}
const z_ = 40;
class B_ extends Id {
  constructor({ autoplay: n = !0, delay: o = 0, type: i = "keyframes", repeat: a = 0, repeatDelay: d = 0, repeatType: f = "loop", keyframes: p, name: m, motionValue: y, element: S, ...l }) {
    var x;
    super(), this.stop = () => {
      var _, A;
      this._animation && (this._animation.stop(), (_ = this.stopTimeline) == null || _.call(this)), (A = this.keyframeResolver) == null || A.cancel();
    }, this.createdAt = at.now();
    const c = {
      autoplay: n,
      delay: o,
      type: i,
      repeat: a,
      repeatDelay: d,
      repeatType: f,
      name: m,
      motionValue: y,
      element: S,
      ...l
    }, g = (S == null ? void 0 : S.KeyframeResolver) || Fd;
    this.keyframeResolver = new g(p, (_, A, T) => this.onKeyframesResolved(_, A, c, !T), m, y, S), (x = this.keyframeResolver) == null || x.scheduleResolve();
  }
  onKeyframesResolved(n, o, i, a) {
    var T, b;
    this.keyframeResolver = void 0;
    const { name: d, type: f, velocity: p, delay: m, isHandoff: y, onUpdate: S } = i;
    this.resolvedAt = at.now();
    let l = !0;
    j_(n, d, f, p) || (l = !1, (Kn.instantAnimations || !m) && (S == null || S(Ka(n, i, o))), n[0] = n[n.length - 1], Gc(i), i.repeat = 0);
    const g = {
      startTime: a ? this.resolvedAt ? this.resolvedAt - this.createdAt > z_ ? this.resolvedAt : this.createdAt : this.createdAt : void 0,
      finalKeyframe: o,
      ...i,
      keyframes: n
    }, x = l && !y && V_(g), _ = (b = (T = g.motionValue) == null ? void 0 : T.owner) == null ? void 0 : b.current;
    let A;
    if (x)
      try {
        A = new N_({
          ...g,
          element: _
        });
      } catch {
        A = new Si(g);
      }
    else
      A = new Si(g);
    A.finished.then(() => {
      this.notifyFinished();
    }).catch(jt), this.pendingTimeline && (this.stopTimeline = A.attachTimeline(this.pendingTimeline), this.pendingTimeline = void 0), this._animation = A;
  }
  get finished() {
    return this._animation ? this.animation.finished : this._finished;
  }
  then(n, o) {
    return this.finished.finally(n).then(() => {
    });
  }
  get animation() {
    var n;
    return this._animation || ((n = this.keyframeResolver) == null || n.resume(), k_()), this._animation;
  }
  get duration() {
    return this.animation.duration;
  }
  get iterationDuration() {
    return this.animation.iterationDuration;
  }
  get time() {
    return this.animation.time;
  }
  set time(n) {
    this.animation.time = n;
  }
  get speed() {
    return this.animation.speed;
  }
  get state() {
    return this.animation.state;
  }
  set speed(n) {
    this.animation.speed = n;
  }
  get startTime() {
    return this.animation.startTime;
  }
  attachTimeline(n) {
    return this._animation ? this.stopTimeline = this.animation.attachTimeline(n) : this.pendingTimeline = n, () => this.stop();
  }
  play() {
    this.animation.play();
  }
  pause() {
    this.animation.pause();
  }
  complete() {
    this.animation.complete();
  }
  cancel() {
    var n;
    this._animation && this.animation.cancel(), (n = this.keyframeResolver) == null || n.cancel();
  }
}
function _v(e, n, o, i = 0, a = 1) {
  const d = Array.from(e).sort((y, S) => y.sortNodePosition(S)).indexOf(n), f = e.size, p = (f - 1) * i;
  return typeof o == "function" ? o(d, f) : a === 1 ? d * i : p - d * i;
}
const Gh = 30, $_ = (e) => !isNaN(parseFloat(e)), ui = {
  current: void 0
};
class U_ {
  /**
   * @param init - The initiating value
   * @param config - Optional configuration options
   *
   * -  `transformer`: A function to transform incoming values with.
   */
  constructor(n, o = {}) {
    this.canTrackVelocity = null, this.events = {}, this.updateAndNotify = (i) => {
      var d;
      const a = at.now();
      if (this.updatedAt !== a && this.setPrevFrameValue(), this.prev = this.current, this.setCurrent(i), this.current !== this.prev && ((d = this.events.change) == null || d.notify(this.current), this.dependents))
        for (const f of this.dependents)
          f.dirty();
    }, this.hasAnimated = !1, this.setCurrent(n), this.owner = o.owner;
  }
  setCurrent(n) {
    this.current = n, this.updatedAt = at.now(), this.canTrackVelocity === null && n !== void 0 && (this.canTrackVelocity = $_(this.current));
  }
  setPrevFrameValue(n = this.current) {
    this.prevFrameValue = n, this.prevUpdatedAt = this.updatedAt;
  }
  /**
   * Adds a function that will be notified when the `MotionValue` is updated.
   *
   * It returns a function that, when called, will cancel the subscription.
   *
   * When calling `onChange` inside a React component, it should be wrapped with the
   * `useEffect` hook. As it returns an unsubscribe function, this should be returned
   * from the `useEffect` function to ensure you don't add duplicate subscribers..
   *
   * ```jsx
   * export const MyComponent = () => {
   *   const x = useMotionValue(0)
   *   const y = useMotionValue(0)
   *   const opacity = useMotionValue(1)
   *
   *   useEffect(() => {
   *     function updateOpacity() {
   *       const maxXY = Math.max(x.get(), y.get())
   *       const newOpacity = transform(maxXY, [0, 100], [1, 0])
   *       opacity.set(newOpacity)
   *     }
   *
   *     const unsubscribeX = x.on("change", updateOpacity)
   *     const unsubscribeY = y.on("change", updateOpacity)
   *
   *     return () => {
   *       unsubscribeX()
   *       unsubscribeY()
   *     }
   *   }, [])
   *
   *   return <motion.div style={{ x }} />
   * }
   * ```
   *
   * @param subscriber - A function that receives the latest value.
   * @returns A function that, when called, will cancel this subscription.
   *
   * @deprecated
   */
  onChange(n) {
    return this.on("change", n);
  }
  on(n, o) {
    this.events[n] || (this.events[n] = new bd());
    const i = this.events[n].add(o);
    return n === "change" ? () => {
      i(), ke.read(() => {
        this.events.change.getSize() || this.stop();
      });
    } : i;
  }
  clearListeners() {
    for (const n in this.events)
      this.events[n].clear();
  }
  /**
   * Attaches a passive effect to the `MotionValue`.
   */
  attach(n, o) {
    this.passiveEffect = n, this.stopPassiveEffect = o;
  }
  /**
   * Sets the state of the `MotionValue`.
   *
   * @remarks
   *
   * ```jsx
   * const x = useMotionValue(0)
   * x.set(10)
   * ```
   *
   * @param latest - Latest value to set.
   * @param render - Whether to notify render subscribers. Defaults to `true`
   *
   * @public
   */
  set(n) {
    this.passiveEffect ? this.passiveEffect(n, this.updateAndNotify) : this.updateAndNotify(n);
  }
  setWithVelocity(n, o, i) {
    this.set(o), this.prev = void 0, this.prevFrameValue = n, this.prevUpdatedAt = this.updatedAt - i;
  }
  /**
   * Set the state of the `MotionValue`, stopping any active animations,
   * effects, and resets velocity to `0`.
   */
  jump(n, o = !0) {
    this.updateAndNotify(n), this.prev = n, this.prevUpdatedAt = this.prevFrameValue = void 0, o && this.stop(), this.stopPassiveEffect && this.stopPassiveEffect();
  }
  dirty() {
    var n;
    (n = this.events.change) == null || n.notify(this.current);
  }
  addDependent(n) {
    this.dependents || (this.dependents = /* @__PURE__ */ new Set()), this.dependents.add(n);
  }
  removeDependent(n) {
    this.dependents && this.dependents.delete(n);
  }
  /**
   * Returns the latest state of `MotionValue`
   *
   * @returns - The latest state of `MotionValue`
   *
   * @public
   */
  get() {
    return ui.current && ui.current.push(this), this.current;
  }
  /**
   * @public
   */
  getPrevious() {
    return this.prev;
  }
  /**
   * Returns the latest velocity of `MotionValue`
   *
   * @returns - The latest velocity of `MotionValue`. Returns `0` if the state is non-numerical.
   *
   * @public
   */
  getVelocity() {
    const n = at.now();
    if (!this.canTrackVelocity || this.prevFrameValue === void 0 || n - this.updatedAt > Gh)
      return 0;
    const o = Math.min(this.updatedAt - this.prevUpdatedAt, Gh);
    return /* @__PURE__ */ $g(parseFloat(this.current) - parseFloat(this.prevFrameValue), o);
  }
  /**
   * Registers a new animation to control this `MotionValue`. Only one
   * animation can drive a `MotionValue` at one time.
   *
   * ```jsx
   * value.start()
   * ```
   *
   * @param animation - A function that starts the provided animation
   */
  start(n) {
    return this.stop(), new Promise((o) => {
      this.hasAnimated = !0, this.animation = n(o), this.events.animationStart && this.events.animationStart.notify();
    }).then(() => {
      this.events.animationComplete && this.events.animationComplete.notify(), this.clearAnimation();
    });
  }
  /**
   * Stop the currently active animation.
   *
   * @public
   */
  stop() {
    this.animation && (this.animation.stop(), this.events.animationCancel && this.events.animationCancel.notify()), this.clearAnimation();
  }
  /**
   * Returns `true` if this value is currently animating.
   *
   * @public
   */
  isAnimating() {
    return !!this.animation;
  }
  clearAnimation() {
    delete this.animation;
  }
  /**
   * Destroy and clean up subscribers to this `MotionValue`.
   *
   * The `MotionValue` hooks like `useMotionValue` and `useTransform` automatically
   * handle the lifecycle of the returned `MotionValue`, so this method is only necessary if you've manually
   * created a `MotionValue` via the `motionValue` function.
   *
   * @public
   */
  destroy() {
    var n, o;
    (n = this.dependents) == null || n.clear(), (o = this.events.destroy) == null || o.notify(), this.clearListeners(), this.stop(), this.stopPassiveEffect && this.stopPassiveEffect();
  }
}
function kr(e, n) {
  return new U_(e, n);
}
function Tv(e, n) {
  if (e != null && e.inherit && n) {
    const { inherit: o, ...i } = e;
    return { ...n, ...i };
  }
  return e;
}
function Od(e, n) {
  const o = (e == null ? void 0 : e[n]) ?? (e == null ? void 0 : e.default) ?? e;
  return o !== e ? Tv(o, e) : o;
}
const H_ = {
  type: "spring",
  stiffness: 500,
  damping: 25,
  restSpeed: 10
}, W_ = (e) => ({
  type: "spring",
  stiffness: 550,
  damping: e === 0 ? 2 * Math.sqrt(550) : 30,
  restSpeed: 10
}), G_ = {
  type: "keyframes",
  duration: 0.8
}, K_ = {
  type: "keyframes",
  ease: [0.25, 0.1, 0.35, 1],
  duration: 0.3
}, Y_ = (e, { keyframes: n }) => n.length > 2 ? G_ : mo.has(e) ? e.startsWith("scale") ? W_(n[1]) : H_ : K_, Q_ = /* @__PURE__ */ new Set([
  "when",
  "delay",
  "delayChildren",
  "staggerChildren",
  "staggerDirection",
  "repeat",
  "repeatType",
  "repeatDelay",
  "from",
  "elapsed"
]);
function X_(e) {
  for (const n in e)
    if (!Q_.has(n))
      return !0;
  return !1;
}
const Ld = (e, n, o, i = {}, a, d) => (f) => {
  const p = Od(i, e) || {}, m = p.delay || i.delay || 0;
  let { elapsed: y = 0 } = i;
  y = y - /* @__PURE__ */ gt(m);
  const S = {
    keyframes: Array.isArray(o) ? o : [null, o],
    ease: "easeOut",
    velocity: n.getVelocity(),
    ...p,
    delay: -y,
    onUpdate: (c) => {
      n.set(c), p.onUpdate && p.onUpdate(c);
    },
    onComplete: () => {
      f(), p.onComplete && p.onComplete();
    },
    name: e,
    motionValue: n,
    element: d ? void 0 : a
  };
  X_(p) || Object.assign(S, Y_(e, S)), S.duration && (S.duration = /* @__PURE__ */ gt(S.duration)), S.repeatDelay && (S.repeatDelay = /* @__PURE__ */ gt(S.repeatDelay)), S.from !== void 0 && (S.keyframes[0] = S.from);
  let l = !1;
  if ((S.type === !1 || S.duration === 0 && !S.repeatDelay) && (Gc(S), S.delay === 0 && (l = !0)), (Kn.instantAnimations || Kn.skipAnimations || a != null && a.shouldSkipAnimations || p.skipAnimations) && (l = !0, Gc(S), S.delay = 0), S.allowFlatten = !p.type && !p.ease, l && !d && n.get() !== void 0) {
    const c = Ka(S.keyframes, p);
    if (c !== void 0) {
      ke.update(() => {
        S.onUpdate(c), S.onComplete();
      });
      return;
    }
  }
  return p.isSync ? new Si(S) : new B_(S);
}, Z_ = (
  // eslint-disable-next-line redos-detector/no-unsafe-regex -- false positive, as it can match a lot of words
  /^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u
);
function q_(e) {
  const n = Z_.exec(e);
  if (!n)
    return [,];
  const [, o, i, a] = n;
  return [`--${o ?? i}`, a];
}
const J_ = 4;
function kv(e, n, o = 1) {
  Tr(o <= J_, `Max CSS variable fallback depth detected in property "${e}". This may indicate a circular fallback dependency.`, "max-css-var-depth");
  const [i, a] = q_(e);
  if (!i)
    return;
  const d = window.getComputedStyle(n).getPropertyValue(i);
  if (d) {
    const f = d.trim();
    return Lg(f) ? parseFloat(f) : f;
  }
  return Md(a) ? kv(a, n, o + 1) : a;
}
function Kh(e) {
  const n = [{}, {}];
  return e == null || e.values.forEach((o, i) => {
    n[0][i] = o.get(), n[1][i] = o.getVelocity();
  }), n;
}
function Vd(e, n, o, i) {
  if (typeof n == "function") {
    const [a, d] = Kh(i);
    n = n(o !== void 0 ? o : e.custom, a, d);
  }
  if (typeof n == "string" && (n = e.variants && e.variants[n]), typeof n == "function") {
    const [a, d] = Kh(i);
    n = n(o !== void 0 ? o : e.custom, a, d);
  }
  return n;
}
function Sr(e, n, o) {
  const i = e.getProps();
  return Vd(i, n, o !== void 0 ? o : i.custom, e);
}
const Av = /* @__PURE__ */ new Set([
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
  ...po
]), Kc = (e) => Array.isArray(e);
function eT(e, n, o) {
  e.hasValue(n) ? e.getValue(n).set(o) : e.addValue(n, kr(o));
}
function tT(e) {
  return Kc(e) ? e[e.length - 1] || 0 : e;
}
function nT(e, n) {
  const o = Sr(e, n);
  let { transitionEnd: i = {}, transition: a = {}, ...d } = o || {};
  d = { ...d, ...i };
  for (const f in d) {
    const p = tT(d[f]);
    eT(e, f, p);
  }
}
const We = (e) => !!(e && e.getVelocity);
function rT(e) {
  return !!(We(e) && e.add);
}
function Yc(e, n) {
  const o = e.getValue("willChange");
  if (rT(o))
    return o.add(n);
  if (!o && Kn.WillChange) {
    const i = new Kn.WillChange("auto");
    e.addValue("willChange", i), i.add(n);
  }
}
function zd(e) {
  return e.replace(/([A-Z])/g, (n) => `-${n.toLowerCase()}`);
}
const oT = "framerAppearId", Cv = "data-" + zd(oT);
function bv(e) {
  return e.props[Cv];
}
function iT({ protectedKeys: e, needsAnimating: n }, o) {
  const i = e.hasOwnProperty(o) && n[o] !== !0;
  return n[o] = !1, i;
}
function Pv(e, n, { delay: o = 0, transitionOverride: i, type: a } = {}) {
  let { transition: d, transitionEnd: f, ...p } = n;
  const m = e.getDefaultTransition();
  d = d ? Tv(d, m) : m;
  const y = d == null ? void 0 : d.reduceMotion, S = d == null ? void 0 : d.skipAnimations;
  i && (d = i);
  const l = [], c = a && e.animationState && e.animationState.getState()[a], g = d == null ? void 0 : d.path;
  g && g.animateVisualElement(e, p, d, o, l);
  for (const x in p) {
    const _ = e.getValue(x, e.latestValues[x] ?? null), A = p[x];
    if (A === void 0 || c && iT(c, x))
      continue;
    const T = {
      delay: o,
      ...Od(d || {}, x)
    };
    S && (T.skipAnimations = !0);
    const b = _.get();
    if (b !== void 0 && !_.isAnimating() && !Array.isArray(A) && A === b && !T.velocity) {
      ke.update(() => _.set(A));
      continue;
    }
    let E = !1;
    if (window.MotionHandoffAnimation) {
      const G = bv(e);
      if (G) {
        const W = window.MotionHandoffAnimation(G, x, ke);
        W !== null && (T.startTime = W, E = !0);
      }
    }
    Yc(e, x);
    const D = y ?? e.shouldReduceMotion;
    _.start(Ld(x, _, A, D && Av.has(x) ? { type: !1 } : T, e, E));
    const L = _.animation;
    L && l.push(L);
  }
  if (f) {
    const x = () => ke.update(() => {
      f && nT(e, f);
    });
    l.length ? Promise.all(l).then(x) : x();
  }
  return l;
}
function Qc(e, n, o = {}) {
  var m;
  const i = Sr(e, n, o.type === "exit" ? (m = e.presenceContext) == null ? void 0 : m.custom : void 0);
  let { transition: a = e.getDefaultTransition() || {} } = i || {};
  o.transitionOverride && (a = o.transitionOverride);
  const d = i ? () => Promise.all(Pv(e, i, o)) : () => Promise.resolve(), f = e.variantChildren && e.variantChildren.size ? (y = 0) => {
    const { delayChildren: S = 0, staggerChildren: l, staggerDirection: c } = a;
    return sT(e, n, y, S, l, c, o);
  } : () => Promise.resolve(), { when: p } = a;
  if (p) {
    const [y, S] = p === "beforeChildren" ? [d, f] : [f, d];
    return y().then(() => S());
  } else
    return Promise.all([d(), f(o.delay)]);
}
function sT(e, n, o = 0, i = 0, a = 0, d = 1, f) {
  const p = [];
  for (const m of e.variantChildren)
    m.notify("AnimationStart", n), p.push(Qc(m, n, {
      ...f,
      delay: o + (typeof i == "function" ? 0 : i) + _v(e.variantChildren, m, i, a, d)
    }).then(() => m.notify("AnimationComplete", n)));
  return Promise.all(p);
}
function aT(e, n, o = {}) {
  e.notify("AnimationStart", n);
  let i;
  if (Array.isArray(n)) {
    const a = n.map((d) => Qc(e, d, o));
    i = Promise.all(a);
  } else if (typeof n == "string")
    i = Qc(e, n, o);
  else {
    const a = typeof n == "function" ? Sr(e, n, o.custom) : n;
    i = Promise.all(Pv(e, a, o));
  }
  return i.then(() => {
    e.notify("AnimationComplete", n);
  });
}
const lT = {
  test: (e) => e === "auto",
  parse: (e) => e
}, Ev = (e) => (n) => n.test(e), Mv = [fo, ne, rn, mn, j1, D1, lT], Yh = (e) => Mv.find(Ev(e));
function uT(e) {
  return typeof e == "number" ? e === 0 : e !== null ? e === "none" || e === "0" || zg(e) : !0;
}
const cT = /* @__PURE__ */ new Set(["brightness", "contrast", "saturate", "opacity"]);
function dT(e) {
  const [n, o] = e.slice(0, -1).split("(");
  if (n === "drop-shadow")
    return e;
  const [i] = o.match(Rd) || [];
  if (!i)
    return e;
  const a = o.replace(i, "");
  let d = cT.has(n) ? 1 : 0;
  return i !== o && (d *= 100), n + "(" + d + a + ")";
}
const fT = /\b([a-z-]*)\(.*?\)/gu, Xc = {
  ...Wt,
  getAnimatableNone: (e) => {
    const n = e.match(fT);
    return n ? n.map(dT).join(" ") : e;
  }
}, Zc = {
  ...Wt,
  getAnimatableNone: (e) => {
    const n = Wt.parse(e);
    return Wt.createTransformer(e)(n.map((i) => typeof i == "number" ? 0 : typeof i == "object" ? { ...i, alpha: 1 } : i));
  }
}, Qh = {
  ...fo,
  transform: Math.round
}, pT = {
  rotate: mn,
  /**
   * Internal channel for `transition.path` orientToPath. Composed onto
   * `rotate` at the transform-build sites so the user's `rotate` is
   * never read or overwritten. Not part of `transformPropOrder`.
   */
  pathRotation: mn,
  rotateX: mn,
  rotateY: mn,
  rotateZ: mn,
  scale: Ws,
  scaleX: Ws,
  scaleY: Ws,
  scaleZ: Ws,
  skew: mn,
  skewX: mn,
  skewY: mn,
  distance: ne,
  translateX: ne,
  translateY: ne,
  translateZ: ne,
  x: ne,
  y: ne,
  z: ne,
  perspective: ne,
  transformPerspective: ne,
  opacity: vi,
  originX: Ih,
  originY: Ih,
  originZ: ne
}, Ca = {
  // Border props
  borderWidth: ne,
  borderTopWidth: ne,
  borderRightWidth: ne,
  borderBottomWidth: ne,
  borderLeftWidth: ne,
  borderRadius: ne,
  borderTopLeftRadius: ne,
  borderTopRightRadius: ne,
  borderBottomRightRadius: ne,
  borderBottomLeftRadius: ne,
  // Positioning props
  width: ne,
  maxWidth: ne,
  height: ne,
  maxHeight: ne,
  top: ne,
  right: ne,
  bottom: ne,
  left: ne,
  inset: ne,
  insetBlock: ne,
  insetBlockStart: ne,
  insetBlockEnd: ne,
  insetInline: ne,
  insetInlineStart: ne,
  insetInlineEnd: ne,
  // Spacing props
  padding: ne,
  paddingTop: ne,
  paddingRight: ne,
  paddingBottom: ne,
  paddingLeft: ne,
  paddingBlock: ne,
  paddingBlockStart: ne,
  paddingBlockEnd: ne,
  paddingInline: ne,
  paddingInlineStart: ne,
  paddingInlineEnd: ne,
  margin: ne,
  marginTop: ne,
  marginRight: ne,
  marginBottom: ne,
  marginLeft: ne,
  marginBlock: ne,
  marginBlockStart: ne,
  marginBlockEnd: ne,
  marginInline: ne,
  marginInlineStart: ne,
  marginInlineEnd: ne,
  // Typography
  fontSize: ne,
  // Misc
  backgroundPositionX: ne,
  backgroundPositionY: ne,
  ...pT,
  zIndex: Qh,
  // SVG
  fillOpacity: vi,
  strokeOpacity: vi,
  numOctaves: Qh
}, mT = {
  ...Ca,
  // Color props
  color: Be,
  backgroundColor: Be,
  outlineColor: Be,
  fill: Be,
  stroke: Be,
  // Border props
  borderColor: Be,
  borderTopColor: Be,
  borderRightColor: Be,
  borderBottomColor: Be,
  borderLeftColor: Be,
  filter: Xc,
  WebkitFilter: Xc,
  mask: Zc,
  WebkitMask: Zc
}, Rv = (e) => mT[e], hT = /* @__PURE__ */ new Set([Xc, Zc]);
function Nv(e, n) {
  let o = Rv(e);
  return hT.has(o) || (o = Wt), o.getAnimatableNone ? o.getAnimatableNone(n) : void 0;
}
const yT = /* @__PURE__ */ new Set(["auto", "none", "0"]);
function gT(e, n, o) {
  let i = 0, a;
  for (; i < e.length && !a; ) {
    const d = e[i];
    typeof d == "string" && !yT.has(d) && ao(d).values.length && (a = e[i]), i++;
  }
  if (a && o)
    for (const d of n)
      e[d] = Nv(o, a);
}
class vT extends Fd {
  constructor(n, o, i, a, d) {
    super(n, o, i, a, d, !0);
  }
  readKeyframes() {
    const { unresolvedKeyframes: n, element: o, name: i } = this;
    if (!o || !o.current)
      return;
    super.readKeyframes();
    for (let S = 0; S < n.length; S++) {
      let l = n[S];
      if (typeof l == "string" && (l = l.trim(), Md(l))) {
        const c = kv(l, o.current);
        c !== void 0 && (n[S] = c), S === n.length - 1 && (this.finalKeyframe = l);
      }
    }
    if (this.resolveNoneKeyframes(), !Av.has(i) || n.length !== 2)
      return;
    const [a, d] = n, f = Yh(a), p = Yh(d), m = jh(a), y = jh(d);
    if (m !== y && Hn[i]) {
      this.needsMeasurement = !0;
      return;
    }
    if (f !== p)
      if (Uh(f) && Uh(p))
        for (let S = 0; S < n.length; S++) {
          const l = n[S];
          typeof l == "string" && (n[S] = parseFloat(l));
        }
      else Hn[i] && (this.needsMeasurement = !0);
  }
  resolveNoneKeyframes() {
    const { unresolvedKeyframes: n, name: o } = this, i = [];
    for (let a = 0; a < n.length; a++)
      (n[a] === null || uT(n[a])) && i.push(a);
    i.length && gT(n, i, o);
  }
  measureInitialState() {
    const { element: n, unresolvedKeyframes: o, name: i } = this;
    if (!n || !n.current)
      return;
    i === "height" && (this.suspendedScrollY = window.pageYOffset), this.measuredOrigin = Hn[i](n.measureViewportBox(), window.getComputedStyle(n.current)), o[0] = this.measuredOrigin;
    const a = o[o.length - 1];
    a !== void 0 && n.getValue(i, a).jump(a, !1);
  }
  measureEndState() {
    var p;
    const { element: n, name: o, unresolvedKeyframes: i } = this;
    if (!n || !n.current)
      return;
    const a = n.getValue(o);
    a && a.jump(this.measuredOrigin, !1);
    const d = i.length - 1, f = i[d];
    i[d] = Hn[o](n.measureViewportBox(), window.getComputedStyle(n.current)), f !== null && this.finalKeyframe === void 0 && (this.finalKeyframe = f), (p = this.removedTransforms) != null && p.length && this.removedTransforms.forEach(([m, y]) => {
      n.getValue(m).set(y);
    }), this.resolveNoneKeyframes();
  }
}
const Bd = [
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomRightRadius",
  "borderBottomLeftRadius"
];
function Dv(e, n, o) {
  if (e == null)
    return [];
  if (e instanceof EventTarget)
    return [e];
  if (typeof e == "string") {
    let i = document;
    const a = (o == null ? void 0 : o[e]) ?? i.querySelectorAll(e);
    return a ? Array.from(a) : [];
  }
  return Array.from(e).filter((i) => i != null);
}
const qc = (e, n) => n && typeof e == "number" ? n.transform(e) : e;
function aa(e) {
  return Vg(e) && "offsetHeight" in e && !("ownerSVGElement" in e);
}
const { schedule: $d } = /* @__PURE__ */ Jg(queueMicrotask, !1), Ut = {
  x: !1,
  y: !1
};
function jv() {
  return Ut.x || Ut.y;
}
function ST(e) {
  return e === "x" || e === "y" ? Ut[e] ? null : (Ut[e] = !0, () => {
    Ut[e] = !1;
  }) : Ut.x || Ut.y ? null : (Ut.x = Ut.y = !0, () => {
    Ut.x = Ut.y = !1;
  });
}
function Iv(e, n) {
  const o = Dv(e), i = new AbortController(), a = {
    passive: !0,
    ...n,
    signal: i.signal
  };
  return [o, a, () => i.abort()];
}
function wT(e) {
  return !(e.pointerType === "touch" || jv());
}
function xT(e, n, o = {}) {
  const [i, a, d] = Iv(e, o);
  return i.forEach((f) => {
    let p = !1, m = !1, y;
    const S = () => {
      f.removeEventListener("pointerleave", x);
    }, l = (A) => {
      y && (y(A), y = void 0), S();
    }, c = (A) => {
      p = !1, window.removeEventListener("pointerup", c), window.removeEventListener("pointercancel", c), m && (m = !1, l(A));
    }, g = () => {
      p = !0, window.addEventListener("pointerup", c, a), window.addEventListener("pointercancel", c, a);
    }, x = (A) => {
      if (A.pointerType !== "touch") {
        if (p) {
          m = !0;
          return;
        }
        l(A);
      }
    }, _ = (A) => {
      if (!wT(A))
        return;
      m = !1;
      const T = n(f, A);
      typeof T == "function" && (y = T, f.addEventListener("pointerleave", x, a));
    };
    f.addEventListener("pointerenter", _, a), f.addEventListener("pointerdown", g, a);
  }), d;
}
const Fv = (e, n) => n ? e === n ? !0 : Fv(e, n.parentElement) : !1, Ud = (e) => e.pointerType === "mouse" ? typeof e.button != "number" || e.button <= 0 : e.isPrimary !== !1, _T = /* @__PURE__ */ new Set([
  "BUTTON",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "A"
]);
function TT(e) {
  return _T.has(e.tagName) || e.isContentEditable === !0;
}
const kT = /* @__PURE__ */ new Set(["INPUT", "SELECT", "TEXTAREA"]);
function AT(e) {
  return kT.has(e.tagName) || e.isContentEditable === !0;
}
const la = /* @__PURE__ */ new WeakSet();
function Xh(e) {
  return (n) => {
    n.key === "Enter" && e(n);
  };
}
function cc(e, n) {
  e.dispatchEvent(new PointerEvent("pointer" + n, { isPrimary: !0, bubbles: !0 }));
}
const CT = (e, n) => {
  const o = e.currentTarget;
  if (!o)
    return;
  const i = Xh(() => {
    if (la.has(o))
      return;
    cc(o, "down");
    const a = Xh(() => {
      cc(o, "up");
    }), d = () => cc(o, "cancel");
    o.addEventListener("keyup", a, n), o.addEventListener("blur", d, n);
  });
  o.addEventListener("keydown", i, n), o.addEventListener("blur", () => o.removeEventListener("keydown", i), n);
};
function Zh(e) {
  return Ud(e) && !jv();
}
const qh = /* @__PURE__ */ new WeakSet();
function bT(e, n, o = {}) {
  const [i, a, d] = Iv(e, o), f = (p) => {
    const m = p.currentTarget;
    if (!Zh(p) || qh.has(p))
      return;
    la.add(m), o.stopPropagation && qh.add(p);
    const y = n(m, p), S = { ...a, capture: !0 }, l = (x, _) => {
      window.removeEventListener("pointerup", c, S), window.removeEventListener("pointercancel", g, S), la.has(m) && la.delete(m), Zh(x) && typeof y == "function" && y(x, { success: _ });
    }, c = (x) => {
      l(x, m === window || m === document || o.useGlobalTarget || Fv(m, x.target));
    }, g = (x) => {
      l(x, !1);
    };
    window.addEventListener("pointerup", c, S), window.addEventListener("pointercancel", g, S);
  };
  return i.forEach((p) => {
    (o.useGlobalTarget ? window : p).addEventListener("pointerdown", f, a), aa(p) && (p.addEventListener("focus", (y) => CT(y, a)), !TT(p) && !p.hasAttribute("tabindex") && (p.tabIndex = 0));
  }), d;
}
function Hd(e) {
  return Vg(e) && "ownerSVGElement" in e;
}
const ua = /* @__PURE__ */ new WeakMap();
let zn;
const Ov = (e, n, o) => (i, a) => a && a[0] ? a[0][e + "Size"] : Hd(i) && "getBBox" in i ? i.getBBox()[n] : i[o], PT = /* @__PURE__ */ Ov("inline", "width", "offsetWidth"), ET = /* @__PURE__ */ Ov("block", "height", "offsetHeight");
function MT({ target: e, borderBoxSize: n }) {
  var o;
  (o = ua.get(e)) == null || o.forEach((i) => {
    i(e, {
      get width() {
        return PT(e, n);
      },
      get height() {
        return ET(e, n);
      }
    });
  });
}
function RT(e) {
  e.forEach(MT);
}
function NT() {
  typeof ResizeObserver > "u" || (zn = new ResizeObserver(RT));
}
function DT(e, n) {
  zn || NT();
  const o = Dv(e);
  return o.forEach((i) => {
    let a = ua.get(i);
    a || (a = /* @__PURE__ */ new Set(), ua.set(i, a)), a.add(n), zn == null || zn.observe(i);
  }), () => {
    o.forEach((i) => {
      const a = ua.get(i);
      a == null || a.delete(n), a != null && a.size || zn == null || zn.unobserve(i);
    });
  };
}
const ca = /* @__PURE__ */ new Set();
let ro;
function jT() {
  ro = () => {
    const e = {
      get width() {
        return window.innerWidth;
      },
      get height() {
        return window.innerHeight;
      }
    };
    ca.forEach((n) => n(e));
  }, window.addEventListener("resize", ro);
}
function IT(e) {
  return ca.add(e), ro || jT(), () => {
    ca.delete(e), !ca.size && typeof ro == "function" && (window.removeEventListener("resize", ro), ro = void 0);
  };
}
function Jh(e, n) {
  return typeof e == "function" ? IT(e) : DT(e, n);
}
function FT(e) {
  return Hd(e) && e.tagName === "svg";
}
function OT(...e) {
  const n = !Array.isArray(e[0]), o = n ? 0 : -1, i = e[0 + o], a = e[1 + o], d = e[2 + o], f = e[3 + o], p = cv(a, d, f);
  return n ? p(i) : p;
}
function LT(e, n, o = {}) {
  const i = e.get();
  let a = null, d = i, f;
  const p = typeof i == "string" ? i.replace(/[\d.-]/g, "") : void 0, m = () => {
    a && (a.stop(), a = null), e.animation = void 0;
  }, y = () => {
    const l = ey(e.get()), c = ey(d);
    if (l === c) {
      m();
      return;
    }
    const g = a ? a.getGeneratorVelocity() : e.getVelocity();
    m(), a = new Si({
      keyframes: [l, c],
      velocity: g,
      // Default to spring if no type specified (matches useSpring behavior)
      type: "spring",
      restDelta: 1e-3,
      restSpeed: 0.01,
      ...o,
      onUpdate: f
    });
  }, S = () => {
    var l;
    y(), e.animation = a ?? void 0, (l = e.events.animationStart) == null || l.notify(), a == null || a.then(() => {
      var c;
      e.animation = void 0, (c = e.events.animationComplete) == null || c.notify();
    });
  };
  if (e.attach((l, c) => {
    d = l, f = (g) => c(dc(g, p)), ke.postRender(S);
  }, m), We(n)) {
    let l = o.skipInitialAnimation === !0;
    const c = n.on("change", (x) => {
      l ? (l = !1, e.jump(dc(x, p), !1)) : e.set(dc(x, p));
    }), g = e.on("destroy", c);
    return () => {
      c(), g();
    };
  }
  return m;
}
function dc(e, n) {
  return n ? e + n : e;
}
function ey(e) {
  return typeof e == "number" ? e : parseFloat(e);
}
const VT = [...Mv, Be, Wt], zT = (e) => VT.find(Ev(e)), ty = () => ({
  translate: 0,
  scale: 1,
  origin: 0,
  originPoint: 0
}), oo = () => ({
  x: ty(),
  y: ty()
}), ny = () => ({ min: 0, max: 0 }), He = () => ({
  x: ny(),
  y: ny()
}), BT = /* @__PURE__ */ new WeakMap();
function Ya(e) {
  return e !== null && typeof e == "object" && typeof e.start == "function";
}
function wi(e) {
  return typeof e == "string" || Array.isArray(e);
}
const Wd = [
  "animate",
  "whileInView",
  "whileFocus",
  "whileHover",
  "whileTap",
  "whileDrag",
  "exit"
], Gd = ["initial", ...Wd];
function Qa(e) {
  return Ya(e.animate) || Gd.some((n) => wi(e[n]));
}
function Lv(e) {
  return !!(Qa(e) || e.variants);
}
function $T(e, n, o) {
  for (const i in n) {
    const a = n[i], d = o[i];
    if (We(a))
      e.addValue(i, a);
    else if (We(d))
      e.addValue(i, kr(a, { owner: e }));
    else if (d !== a)
      if (e.hasValue(i)) {
        const f = e.getValue(i);
        f.liveStyle === !0 ? f.jump(a) : f.hasAnimated || f.set(a);
      } else {
        const f = e.getStaticValue(i);
        e.addValue(i, kr(f !== void 0 ? f : a, { owner: e }));
      }
  }
  for (const i in o)
    n[i] === void 0 && e.removeValue(i);
  return n;
}
const ba = { current: null }, Kd = { current: !1 }, UT = typeof window < "u";
function Vv() {
  if (Kd.current = !0, !!UT)
    if (window.matchMedia) {
      const e = window.matchMedia("(prefers-reduced-motion)"), n = () => ba.current = e.matches;
      e.addEventListener("change", n), n();
    } else
      ba.current = !1;
}
const ry = [
  "AnimationStart",
  "AnimationComplete",
  "Update",
  "BeforeLayoutMeasure",
  "LayoutMeasure",
  "LayoutAnimationStart",
  "LayoutAnimationComplete"
];
let Pa = {};
function zv(e) {
  Pa = e;
}
function HT() {
  return Pa;
}
class WT {
  /**
   * This method takes React props and returns found MotionValues. For example, HTML
   * MotionValues will be found within the style prop, whereas for Three.js within attribute arrays.
   *
   * This isn't an abstract method as it needs calling in the constructor, but it is
   * intended to be one.
   */
  scrapeMotionValuesFromProps(n, o, i) {
    return {};
  }
  constructor({ parent: n, props: o, presenceContext: i, reducedMotionConfig: a, skipAnimations: d, blockInitialAnimation: f, visualState: p }, m = {}) {
    this.current = null, this.children = /* @__PURE__ */ new Set(), this.isVariantNode = !1, this.isControllingVariants = !1, this.shouldReduceMotion = null, this.shouldSkipAnimations = !1, this.values = /* @__PURE__ */ new Map(), this.KeyframeResolver = Fd, this.features = {}, this.valueSubscriptions = /* @__PURE__ */ new Map(), this.prevMotionValues = {}, this.hasBeenMounted = !1, this.events = {}, this.propEventSubscriptions = {}, this.notifyUpdate = () => this.notify("Update", this.latestValues), this.render = () => {
      this.current && (this.triggerBuild(), this.renderInstance(this.current, this.renderState, this.props.style, this.projection));
    }, this.renderScheduledAt = 0, this.scheduleRender = () => {
      const g = at.now();
      this.renderScheduledAt < g && (this.renderScheduledAt = g, ke.render(this.render, !1, !0));
    };
    const { latestValues: y, renderState: S } = p;
    this.latestValues = y, this.baseTarget = { ...y }, this.initialValues = o.initial ? { ...y } : {}, this.renderState = S, this.parent = n, this.props = o, this.presenceContext = i, this.depth = n ? n.depth + 1 : 0, this.reducedMotionConfig = a, this.skipAnimationsConfig = d, this.options = m, this.blockInitialAnimation = !!f, this.isControllingVariants = Qa(o), this.isVariantNode = Lv(o), this.isVariantNode && (this.variantChildren = /* @__PURE__ */ new Set()), this.manuallyAnimateOnMount = !!(n && n.current);
    const { willChange: l, ...c } = this.scrapeMotionValuesFromProps(o, {}, this);
    for (const g in c) {
      const x = c[g];
      y[g] !== void 0 && We(x) && x.set(y[g]);
    }
  }
  mount(n) {
    var o, i;
    if (this.hasBeenMounted)
      for (const a in this.initialValues)
        (o = this.values.get(a)) == null || o.jump(this.initialValues[a]), this.latestValues[a] = this.initialValues[a];
    this.current = n, BT.set(n, this), this.projection && !this.projection.instance && this.projection.mount(n), this.parent && this.isVariantNode && !this.isControllingVariants && (this.removeFromVariantTree = this.parent.addVariantChild(this)), this.values.forEach((a, d) => this.bindToMotionValue(d, a)), this.reducedMotionConfig === "never" ? this.shouldReduceMotion = !1 : this.reducedMotionConfig === "always" ? this.shouldReduceMotion = !0 : (Kd.current || Vv(), this.shouldReduceMotion = ba.current), this.shouldSkipAnimations = this.skipAnimationsConfig ?? !1, (i = this.parent) == null || i.addChild(this), this.update(this.props, this.presenceContext), this.hasBeenMounted = !0;
  }
  unmount() {
    var n;
    this.projection && this.projection.unmount(), vn(this.notifyUpdate), vn(this.render), this.valueSubscriptions.forEach((o) => o()), this.valueSubscriptions.clear(), this.removeFromVariantTree && this.removeFromVariantTree(), (n = this.parent) == null || n.removeChild(this);
    for (const o in this.events)
      this.events[o].clear();
    for (const o in this.features) {
      const i = this.features[o];
      i && (i.unmount(), i.isMounted = !1);
    }
    this.current = null;
  }
  addChild(n) {
    this.children.add(n), this.enteringChildren ?? (this.enteringChildren = /* @__PURE__ */ new Set()), this.enteringChildren.add(n);
  }
  removeChild(n) {
    this.children.delete(n), this.enteringChildren && this.enteringChildren.delete(n);
  }
  bindToMotionValue(n, o) {
    if (this.valueSubscriptions.has(n) && this.valueSubscriptions.get(n)(), o.accelerate && xv.has(n) && this.current instanceof HTMLElement) {
      const { factory: f, keyframes: p, times: m, ease: y, duration: S } = o.accelerate, l = new Sv({
        element: this.current,
        name: n,
        keyframes: p,
        times: m,
        ease: y,
        duration: /* @__PURE__ */ gt(S)
      }), c = f(l);
      this.valueSubscriptions.set(n, () => {
        c(), l.cancel();
      });
      return;
    }
    const i = mo.has(n);
    i && this.onBindTransform && this.onBindTransform();
    const a = o.on("change", (f) => {
      this.latestValues[n] = f, this.props.onUpdate && ke.preRender(this.notifyUpdate), i && this.projection && (this.projection.isTransformDirty = !0), this.scheduleRender();
    });
    let d;
    typeof window < "u" && window.MotionCheckAppearSync && (d = window.MotionCheckAppearSync(this, n, o)), this.valueSubscriptions.set(n, () => {
      a(), d && d();
    });
  }
  sortNodePosition(n) {
    return !this.current || !this.sortInstanceNodePosition || this.type !== n.type ? 0 : this.sortInstanceNodePosition(this.current, n.current);
  }
  updateFeatures() {
    let n = "animation";
    for (n in Pa) {
      const o = Pa[n];
      if (!o)
        continue;
      const { isEnabled: i, Feature: a } = o;
      if (!this.features[n] && a && i(this.props) && (this.features[n] = new a(this)), this.features[n]) {
        const d = this.features[n];
        d.isMounted ? d.update() : (d.mount(), d.isMounted = !0);
      }
    }
  }
  triggerBuild() {
    this.build(this.renderState, this.latestValues, this.props);
  }
  /**
   * Measure the current viewport box with or without transforms.
   * Only measures axis-aligned boxes, rotate and skew must be manually
   * removed with a re-render to work.
   */
  measureViewportBox() {
    return this.current ? this.measureInstanceViewportBox(this.current, this.props) : He();
  }
  getStaticValue(n) {
    return this.latestValues[n];
  }
  setStaticValue(n, o) {
    this.latestValues[n] = o;
  }
  /**
   * Update the provided props. Ensure any newly-added motion values are
   * added to our map, old ones removed, and listeners updated.
   */
  update(n, o) {
    (n.transformTemplate || this.props.transformTemplate) && this.scheduleRender(), this.prevProps = this.props, this.props = n, this.prevPresenceContext = this.presenceContext, this.presenceContext = o;
    for (let i = 0; i < ry.length; i++) {
      const a = ry[i];
      this.propEventSubscriptions[a] && (this.propEventSubscriptions[a](), delete this.propEventSubscriptions[a]);
      const d = "on" + a, f = n[d];
      f && (this.propEventSubscriptions[a] = this.on(a, f));
    }
    this.prevMotionValues = $T(this, this.scrapeMotionValuesFromProps(n, this.prevProps || {}, this), this.prevMotionValues), this.handleChildMotionValue && this.handleChildMotionValue();
  }
  getProps() {
    return this.props;
  }
  /**
   * Returns the variant definition with a given name.
   */
  getVariant(n) {
    return this.props.variants ? this.props.variants[n] : void 0;
  }
  /**
   * Returns the defined default transition on this component.
   */
  getDefaultTransition() {
    return this.props.transition;
  }
  getTransformPagePoint() {
    return this.props.transformPagePoint;
  }
  getClosestVariantNode() {
    return this.isVariantNode ? this : this.parent ? this.parent.getClosestVariantNode() : void 0;
  }
  /**
   * Add a child visual element to our set of children.
   */
  addVariantChild(n) {
    const o = this.getClosestVariantNode();
    if (o)
      return o.variantChildren && o.variantChildren.add(n), () => o.variantChildren.delete(n);
  }
  /**
   * Add a motion value and bind it to this visual element.
   */
  addValue(n, o) {
    const i = this.values.get(n);
    o !== i && (i && this.removeValue(n), this.bindToMotionValue(n, o), this.values.set(n, o), this.latestValues[n] = o.get());
  }
  /**
   * Remove a motion value and unbind any active subscriptions.
   */
  removeValue(n) {
    this.values.delete(n);
    const o = this.valueSubscriptions.get(n);
    o && (o(), this.valueSubscriptions.delete(n)), delete this.latestValues[n], this.removeValueFromRenderState(n, this.renderState);
  }
  /**
   * Check whether we have a motion value for this key
   */
  hasValue(n) {
    return this.values.has(n);
  }
  getValue(n, o) {
    if (this.props.values && this.props.values[n])
      return this.props.values[n];
    let i = this.values.get(n);
    return i === void 0 && o !== void 0 && (i = kr(o === null ? void 0 : o, { owner: this }), this.addValue(n, i)), i;
  }
  /**
   * If we're trying to animate to a previously unencountered value,
   * we need to check for it in our state and as a last resort read it
   * directly from the instance (which might have performance implications).
   */
  readValue(n, o) {
    let i = this.latestValues[n] !== void 0 || !this.current ? this.latestValues[n] : this.getBaseTargetFromProps(this.props, n) ?? this.readValueFromInstance(this.current, n, this.options);
    return i != null && (typeof i == "string" && (Lg(i) || zg(i)) ? i = parseFloat(i) : !zT(i) && Wt.test(o) && (i = Nv(n, o)), this.setBaseTarget(n, We(i) ? i.get() : i)), We(i) ? i.get() : i;
  }
  /**
   * Set the base target to later animate back to. This is currently
   * only hydrated on creation and when we first read a value.
   */
  setBaseTarget(n, o) {
    this.baseTarget[n] = o;
  }
  /**
   * Find the base target for a value thats been removed from all animation
   * props.
   */
  getBaseTarget(n) {
    var d;
    const { initial: o } = this.props;
    let i;
    if (typeof o == "string" || typeof o == "object") {
      const f = Vd(this.props, o, (d = this.presenceContext) == null ? void 0 : d.custom);
      f && (i = f[n]);
    }
    if (o && i !== void 0)
      return i;
    const a = this.getBaseTargetFromProps(this.props, n);
    return a !== void 0 && !We(a) ? a : this.initialValues[n] !== void 0 && i === void 0 ? void 0 : this.baseTarget[n];
  }
  on(n, o) {
    return this.events[n] || (this.events[n] = new bd()), this.events[n].add(o);
  }
  notify(n, ...o) {
    this.events[n] && this.events[n].notify(...o);
  }
  scheduleRenderMicrotask() {
    $d.render(this.render);
  }
}
class Bv extends WT {
  constructor() {
    super(...arguments), this.KeyframeResolver = vT;
  }
  sortInstanceNodePosition(n, o) {
    return n.compareDocumentPosition(o) & 2 ? 1 : -1;
  }
  getBaseTargetFromProps(n, o) {
    const i = n.style;
    return i ? i[o] : void 0;
  }
  removeValueFromRenderState(n, { vars: o, style: i }) {
    delete o[n], delete i[n];
  }
  handleChildMotionValue() {
    this.childSubscription && (this.childSubscription(), delete this.childSubscription);
    const { children: n } = this.props;
    We(n) && (this.childSubscription = n.on("change", (o) => {
      this.current && (this.current.textContent = `${o}`);
    }));
  }
}
class Qn {
  constructor(n) {
    this.isMounted = !1, this.node = n;
  }
  update() {
  }
}
function $v({ top: e, left: n, right: o, bottom: i }) {
  return {
    x: { min: n, max: o },
    y: { min: e, max: i }
  };
}
function GT({ x: e, y: n }) {
  return { top: n.min, right: e.max, bottom: n.max, left: e.min };
}
function KT(e, n) {
  if (!n)
    return e;
  const o = n({ x: e.left, y: e.top }), i = n({ x: e.right, y: e.bottom });
  return {
    top: o.y,
    left: o.x,
    bottom: i.y,
    right: i.x
  };
}
function fc(e) {
  return e === void 0 || e === 1;
}
function Jc({ scale: e, scaleX: n, scaleY: o }) {
  return !fc(e) || !fc(n) || !fc(o);
}
function cr(e) {
  return Jc(e) || Uv(e) || e.z || e.rotate || e.rotateX || e.rotateY || e.skewX || e.skewY;
}
function Uv(e) {
  return oy(e.x) || oy(e.y);
}
function oy(e) {
  return e && e !== "0%";
}
function Ea(e, n, o) {
  const i = e - o, a = n * i;
  return o + a;
}
function iy(e, n, o, i, a) {
  return a !== void 0 && (e = Ea(e, a, i)), Ea(e, o, i) + n;
}
function ed(e, n = 0, o = 1, i, a) {
  e.min = iy(e.min, n, o, i, a), e.max = iy(e.max, n, o, i, a);
}
function Hv(e, { x: n, y: o }) {
  ed(e.x, n.translate, n.scale, n.originPoint), ed(e.y, o.translate, o.scale, o.originPoint);
}
const sy = 0.999999999999, ay = 1.0000000000001;
function YT(e, n, o, i = !1) {
  var p;
  const a = o.length;
  if (!a)
    return;
  n.x = n.y = 1;
  let d, f;
  for (let m = 0; m < a; m++) {
    d = o[m], f = d.projectionDelta;
    const { visualElement: y } = d.options;
    y && y.props.style && y.props.style.display === "contents" || (i && d.options.layoutScroll && d.scroll && d !== d.root && (en(e.x, -d.scroll.offset.x), en(e.y, -d.scroll.offset.y)), f && (n.x *= f.x.scale, n.y *= f.y.scale, Hv(e, f)), i && cr(d.latestValues) && da(e, d.latestValues, (p = d.layout) == null ? void 0 : p.layoutBox));
  }
  n.x < ay && n.x > sy && (n.x = 1), n.y < ay && n.y > sy && (n.y = 1);
}
function en(e, n) {
  e.min += n, e.max += n;
}
function ly(e, n, o, i, a = 0.5) {
  const d = be(e.min, e.max, a);
  ed(e, n, o, d, i);
}
function uy(e, n) {
  return typeof e == "string" ? parseFloat(e) / 100 * (n.max - n.min) : e;
}
function da(e, n, o) {
  const i = o ?? e;
  ly(e.x, uy(n.x, i.x), n.scaleX, n.scale, n.originX), ly(e.y, uy(n.y, i.y), n.scaleY, n.scale, n.originY);
}
function Wv(e, n) {
  return $v(KT(e.getBoundingClientRect(), n));
}
function QT(e, n, o) {
  const i = Wv(e, o), { scroll: a } = n;
  return a && (en(i.x, a.offset.x), en(i.y, a.offset.y)), i;
}
const XT = {
  x: "translateX",
  y: "translateY",
  z: "translateZ",
  transformPerspective: "perspective"
}, ZT = po.length;
function qT(e, n, o) {
  let i = "", a = !0;
  for (let f = 0; f < ZT; f++) {
    const p = po[f], m = e[p];
    if (m === void 0)
      continue;
    let y = !0;
    if (typeof m == "number")
      y = m === (p.startsWith("scale") ? 1 : 0);
    else {
      const S = parseFloat(m);
      y = p.startsWith("scale") ? S === 1 : S === 0;
    }
    if (!y || o) {
      const S = qc(m, Ca[p]);
      if (!y) {
        a = !1;
        const l = XT[p] || p;
        i += `${l}(${S}) `;
      }
      o && (n[p] = S);
    }
  }
  const d = e.pathRotation;
  return d && (a = !1, i += `rotate(${qc(d, Ca.pathRotation)}) `), i = i.trim(), o ? i = o(n, a ? "" : i) : a && (i = "none"), i;
}
function Yd(e, n, o) {
  const { style: i, vars: a, transformOrigin: d } = e;
  let f = !1, p = !1;
  for (const m in n) {
    const y = n[m];
    if (mo.has(m)) {
      f = !0;
      continue;
    } else if (tv(m)) {
      a[m] = y;
      continue;
    } else {
      const S = qc(y, Ca[m]);
      m.startsWith("origin") ? (p = !0, d[m] = S) : i[m] = S;
    }
  }
  if (n.transform || (f || o ? i.transform = qT(n, e.transform, o) : i.transform && (i.transform = "none")), p) {
    const { originX: m = "50%", originY: y = "50%", originZ: S = 0 } = d;
    i.transformOrigin = `${m} ${y} ${S}`;
  }
}
function Gv(e, { style: n, vars: o }, i, a) {
  const d = e.style;
  let f;
  for (f in n)
    d[f] = n[f];
  a == null || a.applyProjectionStyles(d, i);
  for (f in o)
    d.setProperty(f, o[f]);
}
function cy(e, n) {
  return n.max === n.min ? 0 : e / (n.max - n.min) * 100;
}
const ri = {
  correct: (e, n) => {
    if (!n.target)
      return e;
    if (typeof e == "string")
      if (ne.test(e))
        e = parseFloat(e);
      else
        return e;
    const o = cy(e, n.target.x), i = cy(e, n.target.y);
    return `${o}% ${i}%`;
  }
}, JT = {
  correct: (e, { treeScale: n, projectionDelta: o }) => {
    const i = e, a = Wt.parse(e);
    if (a.length > 5)
      return i;
    const d = Wt.createTransformer(e), f = typeof a[0] != "number" ? 1 : 0, p = o.x.scale * n.x, m = o.y.scale * n.y;
    a[0 + f] /= p, a[1 + f] /= m;
    const y = be(p, m, 0.5);
    return typeof a[2 + f] == "number" && (a[2 + f] /= y), typeof a[3 + f] == "number" && (a[3 + f] /= y), d(a);
  }
}, td = {
  borderRadius: {
    ...ri,
    applyTo: [...Bd]
  },
  borderTopLeftRadius: ri,
  borderTopRightRadius: ri,
  borderBottomLeftRadius: ri,
  borderBottomRightRadius: ri,
  boxShadow: JT
};
function Kv(e, { layout: n, layoutId: o }) {
  return mo.has(e) || e.startsWith("origin") || (n || o !== void 0) && (!!td[e] || e === "opacity");
}
function Qd(e, n, o) {
  var f;
  const i = e.style, a = n == null ? void 0 : n.style, d = {};
  if (!i)
    return d;
  for (const p in i)
    (We(i[p]) || a && We(a[p]) || Kv(p, e) || ((f = o == null ? void 0 : o.getValue(p)) == null ? void 0 : f.liveStyle) !== void 0) && (d[p] = i[p]);
  return d;
}
function ek(e) {
  return window.getComputedStyle(e);
}
class tk extends Bv {
  constructor() {
    super(...arguments), this.type = "html", this.renderInstance = Gv;
  }
  readValueFromInstance(n, o) {
    var i;
    if (mo.has(o))
      return (i = this.projection) != null && i.isProjecting ? Bc(o) : S_(n, o);
    {
      const a = ek(n), d = (tv(o) ? a.getPropertyValue(o) : a[o]) || 0;
      return typeof d == "string" ? d.trim() : d;
    }
  }
  measureInstanceViewportBox(n, { transformPagePoint: o }) {
    return Wv(n, o);
  }
  build(n, o, i) {
    Yd(n, o, i.transformTemplate);
  }
  scrapeMotionValuesFromProps(n, o, i) {
    return Qd(n, o, i);
  }
}
const nk = {
  offset: "stroke-dashoffset",
  array: "stroke-dasharray"
}, rk = {
  offset: "strokeDashoffset",
  array: "strokeDasharray"
};
function ok(e, n, o = 1, i = 0, a = !0) {
  e.pathLength = 1;
  const d = a ? nk : rk;
  e[d.offset] = `${-i}`, e[d.array] = `${n} ${o}`;
}
const ik = [
  "offsetDistance",
  "offsetPath",
  "offsetRotate",
  "offsetAnchor"
];
function Yv(e, {
  attrX: n,
  attrY: o,
  attrScale: i,
  pathLength: a,
  pathSpacing: d = 1,
  pathOffset: f = 0,
  // This is object creation, which we try to avoid per-frame.
  ...p
}, m, y, S) {
  if (Yd(e, p, y), m) {
    e.style.viewBox && (e.attrs.viewBox = e.style.viewBox);
    return;
  }
  e.attrs = e.style, e.style = {};
  const { attrs: l, style: c } = e;
  l.transform && (c.transform = l.transform, delete l.transform), (c.transform || l.transformOrigin) && (c.transformOrigin = l.transformOrigin ?? "50% 50%", delete l.transformOrigin), c.transform && (c.transformBox = (S == null ? void 0 : S.transformBox) ?? "fill-box", delete l.transformBox);
  for (const g of ik)
    l[g] !== void 0 && (c[g] = l[g], delete l[g]);
  n !== void 0 && (l.x = n), o !== void 0 && (l.y = o), i !== void 0 && (l.scale = i), a !== void 0 && ok(l, a, d, f, !1);
}
const Qv = /* @__PURE__ */ new Set([
  "baseFrequency",
  "diffuseConstant",
  "kernelMatrix",
  "kernelUnitLength",
  "keySplines",
  "keyTimes",
  "limitingConeAngle",
  "markerHeight",
  "markerWidth",
  "numOctaves",
  "targetX",
  "targetY",
  "surfaceScale",
  "specularConstant",
  "specularExponent",
  "stdDeviation",
  "tableValues",
  "viewBox",
  "gradientTransform",
  "pathLength",
  "startOffset",
  "textLength",
  "lengthAdjust"
]), Xv = (e) => typeof e == "string" && e.toLowerCase() === "svg";
function sk(e, n, o, i) {
  Gv(e, n, void 0, i);
  for (const a in n.attrs)
    e.setAttribute(Qv.has(a) ? a : zd(a), n.attrs[a]);
}
function Zv(e, n, o) {
  const i = Qd(e, n, o);
  for (const a in e)
    if (We(e[a]) || We(n[a])) {
      const d = po.indexOf(a) !== -1 ? "attr" + a.charAt(0).toUpperCase() + a.substring(1) : a;
      i[d] = e[a];
    }
  return i;
}
class ak extends Bv {
  constructor() {
    super(...arguments), this.type = "svg", this.isSVGTag = !1, this.measureInstanceViewportBox = He;
  }
  getBaseTargetFromProps(n, o) {
    return n[o];
  }
  readValueFromInstance(n, o) {
    if (mo.has(o)) {
      const i = Rv(o);
      return i && i.default || 0;
    }
    return o = Qv.has(o) ? o : zd(o), n.getAttribute(o);
  }
  scrapeMotionValuesFromProps(n, o, i) {
    return Zv(n, o, i);
  }
  build(n, o, i) {
    Yv(n, o, this.isSVGTag, i.transformTemplate, i.style);
  }
  renderInstance(n, o, i, a) {
    sk(n, o, i, a);
  }
  mount(n) {
    this.isSVGTag = Xv(n.tagName), super.mount(n);
  }
}
const lk = Gd.length;
function qv(e) {
  if (!e)
    return;
  if (!e.isControllingVariants) {
    const o = e.parent ? qv(e.parent) || {} : {};
    return e.props.initial !== void 0 && (o.initial = e.props.initial), o;
  }
  const n = {};
  for (let o = 0; o < lk; o++) {
    const i = Gd[o], a = e.props[i];
    (wi(a) || a === !1) && (n[i] = a);
  }
  return n;
}
function Jv(e, n) {
  if (!Array.isArray(n))
    return !1;
  const o = n.length;
  if (o !== e.length)
    return !1;
  for (let i = 0; i < o; i++)
    if (n[i] !== e[i])
      return !1;
  return !0;
}
const uk = [...Wd].reverse(), ck = Wd.length;
function dk(e) {
  return (n) => Promise.all(n.map(({ animation: o, options: i }) => aT(e, o, i)));
}
function fk(e) {
  let n = dk(e), o = dy(), i = !0, a = !1;
  const d = (y) => (S, l) => {
    var g;
    const c = Sr(e, l, y === "exit" ? (g = e.presenceContext) == null ? void 0 : g.custom : void 0);
    if (c) {
      const { transition: x, transitionEnd: _, ...A } = c;
      S = { ...S, ...A, ..._ };
    }
    return S;
  };
  function f(y) {
    n = y(e);
  }
  function p(y) {
    const { props: S } = e, l = qv(e.parent) || {}, c = [], g = /* @__PURE__ */ new Set();
    let x = {}, _ = 1 / 0;
    for (let T = 0; T < ck; T++) {
      const b = uk[T], E = o[b], D = S[b] !== void 0 ? S[b] : l[b], L = wi(D), G = b === y ? E.isActive : null;
      G === !1 && (_ = T);
      let W = D === l[b] && D !== S[b] && L;
      if (W && (i || a) && e.manuallyAnimateOnMount && (W = !1), E.protectedKeys = { ...x }, // If it isn't active and hasn't *just* been set as inactive
      !E.isActive && G === null || // If we didn't and don't have any defined prop for this animation type
      !D && !E.prevProp || // Or if the prop doesn't define an animation
      Ya(D) || typeof D == "boolean")
        continue;
      if (b === "exit" && E.isActive && G !== !0) {
        E.prevResolvedValues && (x = {
          ...x,
          ...E.prevResolvedValues
        });
        continue;
      }
      const H = pk(E.prevProp, D);
      let V = H || // If we're making this variant active, we want to always make it active
      b === y && E.isActive && !W && L || // If we removed a higher-priority variant (i is in reverse order)
      T > _ && L, X = !1;
      const J = Array.isArray(D) ? D : [D];
      let ce = J.reduce(d(b), {});
      G === !1 && (ce = {});
      const { prevResolvedValues: me = {} } = E, fe = {
        ...me,
        ...ce
      }, ye = (O) => {
        V = !0, g.has(O) && (X = !0, g.delete(O)), E.needsAnimating[O] = !0;
        const Z = e.getValue(O);
        Z && (Z.liveStyle = !1);
      };
      for (const O in fe) {
        const Z = ce[O], Q = me[O];
        if (x.hasOwnProperty(O))
          continue;
        let N = !1;
        Kc(Z) && Kc(Q) ? N = !Jv(Z, Q) || H : N = Z !== Q, N ? Z != null ? ye(O) : g.add(O) : Z !== void 0 && g.has(O) ? ye(O) : E.protectedKeys[O] = !0;
      }
      E.prevProp = D, E.prevResolvedValues = ce, E.isActive && (x = { ...x, ...ce }), (i || a) && e.blockInitialAnimation && (V = !1);
      const ae = W && H;
      V && (!ae || X) && c.push(...J.map((O) => {
        const Z = { type: b };
        if (typeof O == "string" && (i || a) && !ae && e.manuallyAnimateOnMount && e.parent) {
          const { parent: Q } = e, N = Sr(Q, O);
          if (Q.enteringChildren && N) {
            const { delayChildren: z } = N.transition || {};
            Z.delay = _v(Q.enteringChildren, e, z);
          }
        }
        return {
          animation: O,
          options: Z
        };
      }));
    }
    if (g.size) {
      const T = {};
      if (typeof S.initial != "boolean") {
        const b = Sr(e, Array.isArray(S.initial) ? S.initial[0] : S.initial);
        b && b.transition && (T.transition = b.transition);
      }
      g.forEach((b) => {
        const E = e.getBaseTarget(b), D = e.getValue(b);
        D && (D.liveStyle = !0), T[b] = E ?? null;
      }), c.push({ animation: T });
    }
    let A = !!c.length;
    return i && (S.initial === !1 || S.initial === S.animate) && !e.manuallyAnimateOnMount && (A = !1), i = !1, a = !1, A ? n(c) : Promise.resolve();
  }
  function m(y, S) {
    var c;
    if (o[y].isActive === S)
      return Promise.resolve();
    (c = e.variantChildren) == null || c.forEach((g) => {
      var x;
      return (x = g.animationState) == null ? void 0 : x.setActive(y, S);
    }), o[y].isActive = S;
    const l = p(y);
    for (const g in o)
      o[g].protectedKeys = {};
    return l;
  }
  return {
    animateChanges: p,
    setActive: m,
    setAnimateFunction: f,
    getState: () => o,
    reset: () => {
      o = dy(), a = !0;
    }
  };
}
function pk(e, n) {
  return typeof n == "string" ? n !== e : Array.isArray(n) ? !Jv(n, e) : !1;
}
function ur(e = !1) {
  return {
    isActive: e,
    protectedKeys: {},
    needsAnimating: {},
    prevResolvedValues: {}
  };
}
function dy() {
  return {
    animate: ur(!0),
    whileInView: ur(),
    whileHover: ur(),
    whileTap: ur(),
    whileDrag: ur(),
    whileFocus: ur(),
    exit: ur()
  };
}
function nd(e, n) {
  e.min = n.min, e.max = n.max;
}
function $t(e, n) {
  nd(e.x, n.x), nd(e.y, n.y);
}
function fy(e, n) {
  e.translate = n.translate, e.scale = n.scale, e.originPoint = n.originPoint, e.origin = n.origin;
}
const e0 = 1e-4, mk = 1 - e0, hk = 1 + e0, t0 = 0.01, yk = 0 - t0, gk = 0 + t0;
function lt(e) {
  return e.max - e.min;
}
function vk(e, n, o) {
  return Math.abs(e - n) <= o;
}
function py(e, n, o, i = 0.5) {
  e.origin = i, e.originPoint = be(n.min, n.max, e.origin), e.scale = lt(o) / lt(n), e.translate = be(o.min, o.max, e.origin) - e.originPoint, (e.scale >= mk && e.scale <= hk || isNaN(e.scale)) && (e.scale = 1), (e.translate >= yk && e.translate <= gk || isNaN(e.translate)) && (e.translate = 0);
}
function ci(e, n, o, i) {
  py(e.x, n.x, o.x, i ? i.originX : void 0), py(e.y, n.y, o.y, i ? i.originY : void 0);
}
function my(e, n, o, i = 0) {
  const a = i ? be(o.min, o.max, i) : o.min;
  e.min = a + n.min, e.max = e.min + lt(n);
}
function Sk(e, n, o, i) {
  my(e.x, n.x, o.x, i == null ? void 0 : i.x), my(e.y, n.y, o.y, i == null ? void 0 : i.y);
}
function hy(e, n, o, i = 0) {
  const a = i ? be(o.min, o.max, i) : o.min;
  e.min = n.min - a, e.max = e.min + lt(n);
}
function Ma(e, n, o, i) {
  hy(e.x, n.x, o.x, i == null ? void 0 : i.x), hy(e.y, n.y, o.y, i == null ? void 0 : i.y);
}
function yy(e, n, o, i, a) {
  return e -= n, e = Ea(e, 1 / o, i), a !== void 0 && (e = Ea(e, 1 / a, i)), e;
}
function wk(e, n = 0, o = 1, i = 0.5, a, d = e, f = e) {
  if (rn.test(n) && (n = parseFloat(n), n = be(f.min, f.max, n / 100) - f.min), typeof n != "number")
    return;
  let p = be(d.min, d.max, i);
  e === d && (p -= n), e.min = yy(e.min, n, o, p, a), e.max = yy(e.max, n, o, p, a);
}
function gy(e, n, [o, i, a], d, f) {
  wk(e, n[o], n[i], n[a], n.scale, d, f);
}
const xk = ["x", "scaleX", "originX"], _k = ["y", "scaleY", "originY"];
function vy(e, n, o, i) {
  gy(e.x, n, xk, o ? o.x : void 0, i ? i.x : void 0), gy(e.y, n, _k, o ? o.y : void 0, i ? i.y : void 0);
}
function Sy(e) {
  return e.translate === 0 && e.scale === 1;
}
function n0(e) {
  return Sy(e.x) && Sy(e.y);
}
function wy(e, n) {
  return e.min === n.min && e.max === n.max;
}
function Tk(e, n) {
  return wy(e.x, n.x) && wy(e.y, n.y);
}
function xy(e, n) {
  return Math.round(e.min) === Math.round(n.min) && Math.round(e.max) === Math.round(n.max);
}
function r0(e, n) {
  return xy(e.x, n.x) && xy(e.y, n.y);
}
function _y(e) {
  return lt(e.x) / lt(e.y);
}
function Ty(e, n) {
  return e.translate === n.translate && e.scale === n.scale && e.originPoint === n.originPoint;
}
function Jt(e) {
  return [e("x"), e("y")];
}
function kk(e, n, o) {
  let i = "";
  const a = e.x.translate / n.x, d = e.y.translate / n.y, f = (o == null ? void 0 : o.z) || 0;
  if ((a || d || f) && (i = `translate3d(${a}px, ${d}px, ${f}px) `), (n.x !== 1 || n.y !== 1) && (i += `scale(${1 / n.x}, ${1 / n.y}) `), o) {
    const { transformPerspective: y, rotate: S, pathRotation: l, rotateX: c, rotateY: g, skewX: x, skewY: _ } = o;
    y && (i = `perspective(${y}px) ${i}`), S && (i += `rotate(${S}deg) `), l && (i += `rotate(${l}deg) `), c && (i += `rotateX(${c}deg) `), g && (i += `rotateY(${g}deg) `), x && (i += `skewX(${x}deg) `), _ && (i += `skewY(${_}deg) `);
  }
  const p = e.x.scale * n.x, m = e.y.scale * n.y;
  return (p !== 1 || m !== 1) && (i += `scale(${p}, ${m})`), i || "none";
}
const Ak = Bd.length, ky = (e) => typeof e == "string" ? parseFloat(e) : e, Ay = (e) => typeof e == "number" || ne.test(e);
function Ck(e, n, o, i, a, d) {
  a ? (e.opacity = be(0, o.opacity ?? 1, bk(i)), e.opacityExit = be(n.opacity ?? 1, 0, Pk(i))) : d && (e.opacity = be(n.opacity ?? 1, o.opacity ?? 1, i));
  for (let f = 0; f < Ak; f++) {
    const p = Bd[f];
    let m = Cy(n, p), y = Cy(o, p);
    if (m === void 0 && y === void 0)
      continue;
    m || (m = 0), y || (y = 0), m === 0 || y === 0 || Ay(m) === Ay(y) ? (e[p] = Math.max(be(ky(m), ky(y), i), 0), (rn.test(y) || rn.test(m)) && (e[p] += "%")) : e[p] = y;
  }
  (n.rotate || o.rotate) && (e.rotate = be(n.rotate || 0, o.rotate || 0, i));
}
function Cy(e, n) {
  return e[n] !== void 0 ? e[n] : e.borderRadius;
}
const bk = /* @__PURE__ */ o0(0, 0.5, Qg), Pk = /* @__PURE__ */ o0(0.5, 0.95, jt);
function o0(e, n, o) {
  return (i) => i < e ? 0 : i > n ? 1 : o(/* @__PURE__ */ gi(e, n, i));
}
function Ek(e, n, o) {
  const i = We(e) ? e : kr(e);
  return i.start(Ld("", i, n, o)), i.animation;
}
function xi(e, n, o, i = { passive: !0 }) {
  return e.addEventListener(n, o, i), () => e.removeEventListener(n, o, i);
}
const Mk = (e, n) => e.depth - n.depth;
class Rk {
  constructor() {
    this.children = [], this.isDirty = !1;
  }
  add(n) {
    Cd(this.children, n), this.isDirty = !0;
  }
  remove(n) {
    _a(this.children, n), this.isDirty = !0;
  }
  forEach(n) {
    this.isDirty && this.children.sort(Mk), this.isDirty = !1, this.children.forEach(n);
  }
}
function Nk(e, n) {
  const o = at.now(), i = ({ timestamp: a }) => {
    const d = a - o;
    d >= n && (vn(i), e(d - n));
  };
  return ke.setup(i, !0), () => vn(i);
}
function fa(e) {
  return We(e) ? e.get() : e;
}
class Dk {
  constructor() {
    this.members = [];
  }
  add(n) {
    Cd(this.members, n);
    for (let o = this.members.length - 1; o >= 0; o--) {
      const i = this.members[o];
      if (i === n || i === this.lead || i === this.prevLead)
        continue;
      const a = i.instance;
      (!a || a.isConnected === !1) && !i.snapshot && (_a(this.members, i), i.unmount());
    }
    n.scheduleRender();
  }
  remove(n) {
    if (_a(this.members, n), n === this.prevLead && (this.prevLead = void 0), n === this.lead) {
      const o = this.members[this.members.length - 1];
      o && this.promote(o);
    }
  }
  relegate(n) {
    var o;
    for (let i = this.members.indexOf(n) - 1; i >= 0; i--) {
      const a = this.members[i];
      if (a.isPresent !== !1 && ((o = a.instance) == null ? void 0 : o.isConnected) !== !1)
        return this.promote(a), !0;
    }
    return !1;
  }
  promote(n, o) {
    var a;
    const i = this.lead;
    if (n !== i && (this.prevLead = i, this.lead = n, n.show(), i)) {
      i.updateSnapshot(), n.scheduleRender();
      const { layoutDependency: d } = i.options, { layoutDependency: f } = n.options;
      (d === void 0 || d !== f) && (n.resumeFrom = i, o && (i.preserveOpacity = !0), i.snapshot && (n.snapshot = i.snapshot, n.snapshot.latestValues = i.animationValues || i.latestValues), (a = n.root) != null && a.isUpdating && (n.isLayoutDirty = !0)), n.options.crossfade === !1 && i.hide();
    }
  }
  exitAnimationComplete() {
    this.members.forEach((n) => {
      var o, i, a, d, f;
      (i = (o = n.options).onExitComplete) == null || i.call(o), (f = (a = n.resumingFrom) == null ? void 0 : (d = a.options).onExitComplete) == null || f.call(d);
    });
  }
  scheduleRender() {
    this.members.forEach((n) => n.instance && n.scheduleRender(!1));
  }
  removeLeadSnapshot() {
    var n;
    (n = this.lead) != null && n.snapshot && (this.lead.snapshot = void 0);
  }
}
const pa = {
  /**
   * Global flag as to whether the tree has animated since the last time
   * we resized the window
   */
  hasAnimatedSinceResize: !0,
  /**
   * We set this to true once, on the first update. Any nodes added to the tree beyond that
   * update will be given a `data-projection-id` attribute.
   */
  hasEverUpdated: !1
}, pc = ["", "X", "Y", "Z"], jk = 1e3;
let Ik = 0;
function mc(e, n, o, i) {
  const { latestValues: a } = n;
  a[e] && (o[e] = a[e], n.setStaticValue(e, 0), i && (i[e] = 0));
}
function i0(e) {
  if (e.hasCheckedOptimisedAppear = !0, e.root === e)
    return;
  const { visualElement: n } = e.options;
  if (!n)
    return;
  const o = bv(n);
  if (window.MotionHasOptimisedAnimation(o, "transform")) {
    const { layout: a, layoutId: d } = e.options;
    window.MotionCancelOptimisedAnimation(o, "transform", ke, !(a || d));
  }
  const { parent: i } = e;
  i && !i.hasCheckedOptimisedAppear && i0(i);
}
function s0({ attachResizeListener: e, defaultParent: n, measureScroll: o, checkIsScrollRoot: i, resetTransform: a }) {
  return class {
    constructor(f = {}, p = n == null ? void 0 : n()) {
      this.id = Ik++, this.animationId = 0, this.animationCommitId = 0, this.children = /* @__PURE__ */ new Set(), this.options = {}, this.isTreeAnimating = !1, this.isAnimationBlocked = !1, this.isLayoutDirty = !1, this.isProjectionDirty = !1, this.isSharedProjectionDirty = !1, this.isTransformDirty = !1, this.updateManuallyBlocked = !1, this.updateBlockedByResize = !1, this.isUpdating = !1, this.isSVG = !1, this.needsReset = !1, this.shouldResetTransform = !1, this.hasCheckedOptimisedAppear = !1, this.treeScale = { x: 1, y: 1 }, this.eventHandlers = /* @__PURE__ */ new Map(), this.hasTreeAnimated = !1, this.layoutVersion = 0, this.updateScheduled = !1, this.scheduleUpdate = () => this.update(), this.projectionUpdateScheduled = !1, this.checkUpdateFailed = () => {
        this.isUpdating && (this.isUpdating = !1, this.clearAllSnapshots());
      }, this.updateProjection = () => {
        this.projectionUpdateScheduled = !1, this.nodes.forEach(Lk), this.nodes.forEach(Hk), this.nodes.forEach(Wk), this.nodes.forEach(Vk);
      }, this.resolvedRelativeTargetAt = 0, this.linkedParentVersion = 0, this.hasProjected = !1, this.isVisible = !0, this.animationProgress = 0, this.sharedNodes = /* @__PURE__ */ new Map(), this.latestValues = f, this.root = p ? p.root || p : this, this.path = p ? [...p.path, p] : [], this.parent = p, this.depth = p ? p.depth + 1 : 0;
      for (let m = 0; m < this.path.length; m++)
        this.path[m].shouldResetTransform = !0;
      this.root === this && (this.nodes = new Rk());
    }
    addEventListener(f, p) {
      return this.eventHandlers.has(f) || this.eventHandlers.set(f, new bd()), this.eventHandlers.get(f).add(p);
    }
    notifyListeners(f, ...p) {
      const m = this.eventHandlers.get(f);
      m && m.notify(...p);
    }
    hasListeners(f) {
      return this.eventHandlers.has(f);
    }
    /**
     * Lifecycles
     */
    mount(f) {
      if (this.instance)
        return;
      this.isSVG = Hd(f) && !FT(f), this.instance = f;
      const { layoutId: p, layout: m, visualElement: y } = this.options;
      if (y && !y.current && y.mount(f), this.root.nodes.add(this), this.parent && this.parent.children.add(this), this.root.hasTreeAnimated && (m || p) && (this.isLayoutDirty = !0), e) {
        let S, l = 0;
        const c = () => this.root.updateBlockedByResize = !1;
        ke.read(() => {
          l = window.innerWidth;
        }), e(f, () => {
          const g = window.innerWidth;
          g !== l && (l = g, this.root.updateBlockedByResize = !0, S && S(), S = Nk(c, 250), pa.hasAnimatedSinceResize && (pa.hasAnimatedSinceResize = !1, this.nodes.forEach(Ey)));
        });
      }
      p && this.root.registerSharedNode(p, this), this.options.animate !== !1 && y && (p || m) && this.addEventListener("didUpdate", ({ delta: S, hasLayoutChanged: l, hasRelativeLayoutChanged: c, layout: g }) => {
        if (this.isTreeAnimationBlocked()) {
          this.target = void 0, this.relativeTarget = void 0;
          return;
        }
        const x = this.options.transition || y.getDefaultTransition() || Xk, { onLayoutAnimationStart: _, onLayoutAnimationComplete: A } = y.getProps(), T = !this.targetLayout || !r0(this.targetLayout, g), b = !l && c;
        if (this.options.layoutRoot || this.resumeFrom || b || l && (T || !this.currentAnimation)) {
          this.resumeFrom && (this.resumingFrom = this.resumeFrom, this.resumingFrom.resumingFrom = void 0);
          const E = {
            ...Od(x, "layout"),
            onPlay: _,
            onComplete: A
          };
          (y.shouldReduceMotion || this.options.layoutRoot) && (E.delay = 0, E.type = !1), this.startAnimation(E), this.setAnimationOrigin(S, b, E.path);
        } else
          l || Ey(this), this.isLead() && this.options.onExitComplete && this.options.onExitComplete();
        this.targetLayout = g;
      });
    }
    unmount() {
      this.options.layoutId && this.willUpdate(), this.root.nodes.remove(this);
      const f = this.getStack();
      f && f.remove(this), this.parent && this.parent.children.delete(this), this.instance = void 0, this.eventHandlers.clear(), vn(this.updateProjection);
    }
    // only on the root
    blockUpdate() {
      this.updateManuallyBlocked = !0;
    }
    unblockUpdate() {
      this.updateManuallyBlocked = !1;
    }
    isUpdateBlocked() {
      return this.updateManuallyBlocked || this.updateBlockedByResize;
    }
    isTreeAnimationBlocked() {
      return this.isAnimationBlocked || this.parent && this.parent.isTreeAnimationBlocked() || !1;
    }
    // Note: currently only running on root node
    startUpdate() {
      this.isUpdateBlocked() || (this.isUpdating = !0, this.nodes && this.nodes.forEach(Gk), this.animationId++);
    }
    getTransformTemplate() {
      const { visualElement: f } = this.options;
      return f && f.getProps().transformTemplate;
    }
    willUpdate(f = !0) {
      if (this.root.hasTreeAnimated = !0, this.root.isUpdateBlocked()) {
        this.options.onExitComplete && this.options.onExitComplete();
        return;
      }
      if (window.MotionCancelOptimisedAnimation && !this.hasCheckedOptimisedAppear && i0(this), !this.root.isUpdating && this.root.startUpdate(), this.isLayoutDirty)
        return;
      this.isLayoutDirty = !0;
      for (let S = 0; S < this.path.length; S++) {
        const l = this.path[S];
        l.shouldResetTransform = !0, (typeof l.latestValues.x == "string" || typeof l.latestValues.y == "string") && (l.isLayoutDirty = !0), l.updateScroll("snapshot"), l.options.layoutRoot && l.willUpdate(!1);
      }
      const { layoutId: p, layout: m } = this.options;
      if (p === void 0 && !m)
        return;
      const y = this.getTransformTemplate();
      this.prevTransformTemplateValue = y ? y(this.latestValues, "") : void 0, this.updateSnapshot(), f && this.notifyListeners("willUpdate");
    }
    update() {
      if (this.updateScheduled = !1, this.isUpdateBlocked()) {
        const m = this.updateBlockedByResize;
        this.unblockUpdate(), this.updateBlockedByResize = !1, this.clearAllSnapshots(), m && this.nodes.forEach(Bk), this.nodes.forEach(by);
        return;
      }
      if (this.animationId <= this.animationCommitId) {
        this.nodes.forEach(Py);
        return;
      }
      this.animationCommitId = this.animationId, this.isUpdating ? (this.isUpdating = !1, this.nodes.forEach($k), this.nodes.forEach(Uk), this.nodes.forEach(Fk), this.nodes.forEach(Ok)) : this.nodes.forEach(Py), this.clearAllSnapshots();
      const p = at.now();
      qe.delta = on(0, 1e3 / 60, p - qe.timestamp), qe.timestamp = p, qe.isProcessing = !0, oc.update.process(qe), oc.preRender.process(qe), oc.render.process(qe), qe.isProcessing = !1;
    }
    didUpdate() {
      this.updateScheduled || (this.updateScheduled = !0, $d.read(this.scheduleUpdate));
    }
    clearAllSnapshots() {
      this.nodes.forEach(zk), this.sharedNodes.forEach(Kk);
    }
    scheduleUpdateProjection() {
      this.projectionUpdateScheduled || (this.projectionUpdateScheduled = !0, ke.preRender(this.updateProjection, !1, !0));
    }
    scheduleCheckAfterUnmount() {
      ke.postRender(() => {
        this.isLayoutDirty ? this.root.didUpdate() : this.root.checkUpdateFailed();
      });
    }
    /**
     * Update measurements
     */
    updateSnapshot() {
      this.snapshot || !this.instance || (this.snapshot = this.measure(), this.snapshot && !lt(this.snapshot.measuredBox.x) && !lt(this.snapshot.measuredBox.y) && (this.snapshot = void 0));
    }
    updateLayout() {
      if (!this.instance || (this.updateScroll(), !(this.options.alwaysMeasureLayout && this.isLead()) && !this.isLayoutDirty))
        return;
      if (this.resumeFrom && !this.resumeFrom.instance)
        for (let m = 0; m < this.path.length; m++)
          this.path[m].updateScroll();
      const f = this.layout;
      this.layout = this.measure(!1), this.layoutVersion++, this.layoutCorrected || (this.layoutCorrected = He()), this.isLayoutDirty = !1, this.projectionDelta = void 0, this.notifyListeners("measure", this.layout.layoutBox);
      const { visualElement: p } = this.options;
      p && p.notify("LayoutMeasure", this.layout.layoutBox, f ? f.layoutBox : void 0);
    }
    updateScroll(f = "measure") {
      let p = !!(this.options.layoutScroll && this.instance);
      if (this.scroll && this.scroll.animationId === this.root.animationId && this.scroll.phase === f && (p = !1), p && this.instance) {
        const m = i(this.instance);
        this.scroll = {
          animationId: this.root.animationId,
          phase: f,
          isRoot: m,
          offset: o(this.instance),
          wasRoot: this.scroll ? this.scroll.isRoot : m
        };
      }
    }
    resetTransform() {
      if (!a)
        return;
      const f = this.isLayoutDirty || this.shouldResetTransform || this.options.alwaysMeasureLayout, p = this.projectionDelta && !n0(this.projectionDelta), m = this.getTransformTemplate(), y = m ? m(this.latestValues, "") : void 0, S = y !== this.prevTransformTemplateValue;
      f && this.instance && (p || cr(this.latestValues) || S) && (a(this.instance, y), this.shouldResetTransform = !1, this.scheduleRender());
    }
    measure(f = !0) {
      const p = this.measurePageBox();
      let m = this.removeElementScroll(p);
      return f && (m = this.removeTransform(m)), Zk(m), {
        animationId: this.root.animationId,
        measuredBox: p,
        layoutBox: m,
        latestValues: {},
        source: this.id
      };
    }
    measurePageBox() {
      var y;
      const { visualElement: f } = this.options;
      if (!f)
        return He();
      const p = f.measureViewportBox();
      if (!(((y = this.scroll) == null ? void 0 : y.wasRoot) || this.path.some(qk))) {
        const { scroll: S } = this.root;
        S && (en(p.x, S.offset.x), en(p.y, S.offset.y));
      }
      return p;
    }
    removeElementScroll(f) {
      var m;
      const p = He();
      if ($t(p, f), (m = this.scroll) != null && m.wasRoot)
        return p;
      for (let y = 0; y < this.path.length; y++) {
        const S = this.path[y], { scroll: l, options: c } = S;
        S !== this.root && l && c.layoutScroll && (l.wasRoot && $t(p, f), en(p.x, l.offset.x), en(p.y, l.offset.y));
      }
      return p;
    }
    applyTransform(f, p = !1, m) {
      var S, l;
      const y = m || He();
      $t(y, f);
      for (let c = 0; c < this.path.length; c++) {
        const g = this.path[c];
        !p && g.options.layoutScroll && g.scroll && g !== g.root && (en(y.x, -g.scroll.offset.x), en(y.y, -g.scroll.offset.y)), cr(g.latestValues) && da(y, g.latestValues, (S = g.layout) == null ? void 0 : S.layoutBox);
      }
      return cr(this.latestValues) && da(y, this.latestValues, (l = this.layout) == null ? void 0 : l.layoutBox), y;
    }
    removeTransform(f) {
      var m;
      const p = He();
      $t(p, f);
      for (let y = 0; y < this.path.length; y++) {
        const S = this.path[y];
        if (!cr(S.latestValues))
          continue;
        let l;
        S.instance && (Jc(S.latestValues) && S.updateSnapshot(), l = He(), $t(l, S.measurePageBox())), vy(p, S.latestValues, (m = S.snapshot) == null ? void 0 : m.layoutBox, l);
      }
      return cr(this.latestValues) && vy(p, this.latestValues), p;
    }
    setTargetDelta(f) {
      this.targetDelta = f, this.root.scheduleUpdateProjection(), this.isProjectionDirty = !0;
    }
    setOptions(f) {
      this.options = {
        ...this.options,
        ...f,
        crossfade: f.crossfade !== void 0 ? f.crossfade : !0
      };
    }
    clearMeasurements() {
      this.scroll = void 0, this.layout = void 0, this.snapshot = void 0, this.prevTransformTemplateValue = void 0, this.targetDelta = void 0, this.target = void 0, this.isLayoutDirty = !1;
    }
    forceRelativeParentToResolveTarget() {
      this.relativeParent && this.relativeParent.resolvedRelativeTargetAt !== qe.timestamp && this.relativeParent.resolveTargetDelta(!0);
    }
    resolveTargetDelta(f = !1) {
      var g;
      const p = this.getLead();
      this.isProjectionDirty || (this.isProjectionDirty = p.isProjectionDirty), this.isTransformDirty || (this.isTransformDirty = p.isTransformDirty), this.isSharedProjectionDirty || (this.isSharedProjectionDirty = p.isSharedProjectionDirty);
      const m = !!this.resumingFrom || this !== p;
      if (!(f || m && this.isSharedProjectionDirty || this.isProjectionDirty || (g = this.parent) != null && g.isProjectionDirty || this.attemptToResolveRelativeTarget || this.root.updateBlockedByResize))
        return;
      const { layout: S, layoutId: l } = this.options;
      if (!this.layout || !(S || l))
        return;
      this.resolvedRelativeTargetAt = qe.timestamp;
      const c = this.getClosestProjectingParent();
      c && this.linkedParentVersion !== c.layoutVersion && !c.options.layoutRoot && this.removeRelativeTarget(), !this.targetDelta && !this.relativeTarget && (this.options.layoutAnchor !== !1 && c && c.layout ? this.createRelativeTarget(c, this.layout.layoutBox, c.layout.layoutBox) : this.removeRelativeTarget()), !(!this.relativeTarget && !this.targetDelta) && (this.target || (this.target = He(), this.targetWithTransforms = He()), this.relativeTarget && this.relativeTargetOrigin && this.relativeParent && this.relativeParent.target ? (this.forceRelativeParentToResolveTarget(), Sk(this.target, this.relativeTarget, this.relativeParent.target, this.options.layoutAnchor || void 0)) : this.targetDelta ? (this.resumingFrom ? this.applyTransform(this.layout.layoutBox, !1, this.target) : $t(this.target, this.layout.layoutBox), Hv(this.target, this.targetDelta)) : $t(this.target, this.layout.layoutBox), this.attemptToResolveRelativeTarget && (this.attemptToResolveRelativeTarget = !1, this.options.layoutAnchor !== !1 && c && !!c.resumingFrom == !!this.resumingFrom && !c.options.layoutScroll && c.target && this.animationProgress !== 1 ? this.createRelativeTarget(c, this.target, c.target) : this.relativeParent = this.relativeTarget = void 0));
    }
    getClosestProjectingParent() {
      if (!(!this.parent || Jc(this.parent.latestValues) || Uv(this.parent.latestValues)))
        return this.parent.isProjecting() ? this.parent : this.parent.getClosestProjectingParent();
    }
    isProjecting() {
      return !!((this.relativeTarget || this.targetDelta || this.options.layoutRoot) && this.layout);
    }
    createRelativeTarget(f, p, m) {
      this.relativeParent = f, this.linkedParentVersion = f.layoutVersion, this.forceRelativeParentToResolveTarget(), this.relativeTarget = He(), this.relativeTargetOrigin = He(), Ma(this.relativeTargetOrigin, p, m, this.options.layoutAnchor || void 0), $t(this.relativeTarget, this.relativeTargetOrigin);
    }
    removeRelativeTarget() {
      this.relativeParent = this.relativeTarget = void 0;
    }
    calcProjection() {
      var x;
      const f = this.getLead(), p = !!this.resumingFrom || this !== f;
      let m = !0;
      if ((this.isProjectionDirty || (x = this.parent) != null && x.isProjectionDirty) && (m = !1), p && (this.isSharedProjectionDirty || this.isTransformDirty) && (m = !1), this.resolvedRelativeTargetAt === qe.timestamp && (m = !1), m)
        return;
      const { layout: y, layoutId: S } = this.options;
      if (this.isTreeAnimating = !!(this.parent && this.parent.isTreeAnimating || this.currentAnimation || this.pendingAnimation), this.isTreeAnimating || (this.targetDelta = this.relativeTarget = void 0), !this.layout || !(y || S))
        return;
      $t(this.layoutCorrected, this.layout.layoutBox);
      const l = this.treeScale.x, c = this.treeScale.y;
      YT(this.layoutCorrected, this.treeScale, this.path, p), f.layout && !f.target && (this.treeScale.x !== 1 || this.treeScale.y !== 1) && (f.target = f.layout.layoutBox, f.targetWithTransforms = He());
      const { target: g } = f;
      if (!g) {
        this.prevProjectionDelta && (this.createProjectionDeltas(), this.scheduleRender());
        return;
      }
      !this.projectionDelta || !this.prevProjectionDelta ? this.createProjectionDeltas() : (fy(this.prevProjectionDelta.x, this.projectionDelta.x), fy(this.prevProjectionDelta.y, this.projectionDelta.y)), ci(this.projectionDelta, this.layoutCorrected, g, this.latestValues), (this.treeScale.x !== l || this.treeScale.y !== c || !Ty(this.projectionDelta.x, this.prevProjectionDelta.x) || !Ty(this.projectionDelta.y, this.prevProjectionDelta.y)) && (this.hasProjected = !0, this.scheduleRender(), this.notifyListeners("projectionUpdate", g));
    }
    hide() {
      this.isVisible = !1;
    }
    show() {
      this.isVisible = !0;
    }
    scheduleRender(f = !0) {
      var p;
      if ((p = this.options.visualElement) == null || p.scheduleRender(), f) {
        const m = this.getStack();
        m && m.scheduleRender();
      }
      this.resumingFrom && !this.resumingFrom.instance && (this.resumingFrom = void 0);
    }
    createProjectionDeltas() {
      this.prevProjectionDelta = oo(), this.projectionDelta = oo(), this.projectionDeltaWithTransform = oo();
    }
    setAnimationOrigin(f, p = !1, m) {
      const y = this.snapshot, S = y ? y.latestValues : {}, l = { ...this.latestValues }, c = oo();
      (!this.relativeParent || !this.relativeParent.options.layoutRoot) && (this.relativeTarget = this.relativeTargetOrigin = void 0), this.attemptToResolveRelativeTarget = !p;
      const g = He(), x = y ? y.source : void 0, _ = this.layout ? this.layout.source : void 0, A = x !== _, T = this.getStack(), b = !T || T.members.length <= 1, E = !!(A && !b && this.options.crossfade === !0 && !this.path.some(Qk));
      this.animationProgress = 0;
      let D;
      const L = m == null ? void 0 : m.interpolateProjection(f);
      this.mixTargetDelta = (G) => {
        const W = G / 1e3, H = L == null ? void 0 : L(W);
        H ? (c.x.translate = H.x, c.x.scale = be(f.x.scale, 1, W), c.x.origin = f.x.origin, c.x.originPoint = f.x.originPoint, c.y.translate = H.y, c.y.scale = be(f.y.scale, 1, W), c.y.origin = f.y.origin, c.y.originPoint = f.y.originPoint) : (My(c.x, f.x, W), My(c.y, f.y, W)), this.setTargetDelta(c), this.relativeTarget && this.relativeTargetOrigin && this.layout && this.relativeParent && this.relativeParent.layout && (Ma(g, this.layout.layoutBox, this.relativeParent.layout.layoutBox, this.options.layoutAnchor || void 0), Yk(this.relativeTarget, this.relativeTargetOrigin, g, W), D && Tk(this.relativeTarget, D) && (this.isProjectionDirty = !1), D || (D = He()), $t(D, this.relativeTarget)), A && (this.animationValues = l, Ck(l, S, this.latestValues, W, E, b)), H && H.rotate !== void 0 && (this.animationValues || (this.animationValues = l), this.animationValues.pathRotation = H.rotate), this.root.scheduleUpdateProjection(), this.scheduleRender(), this.animationProgress = W;
      }, this.mixTargetDelta(this.options.layoutRoot ? 1e3 : 0);
    }
    startAnimation(f) {
      var p, m, y;
      this.notifyListeners("animationStart"), (p = this.currentAnimation) == null || p.stop(), (y = (m = this.resumingFrom) == null ? void 0 : m.currentAnimation) == null || y.stop(), this.pendingAnimation && (vn(this.pendingAnimation), this.pendingAnimation = void 0), this.pendingAnimation = ke.update(() => {
        pa.hasAnimatedSinceResize = !0, this.motionValue || (this.motionValue = kr(0)), this.motionValue.jump(0, !1), this.currentAnimation = Ek(this.motionValue, [0, 1e3], {
          ...f,
          velocity: 0,
          isSync: !0,
          onUpdate: (S) => {
            this.mixTargetDelta(S), f.onUpdate && f.onUpdate(S);
          },
          onComplete: () => {
            f.onComplete && f.onComplete(), this.completeAnimation();
          }
        }), this.resumingFrom && (this.resumingFrom.currentAnimation = this.currentAnimation), this.pendingAnimation = void 0;
      });
    }
    completeAnimation() {
      this.resumingFrom && (this.resumingFrom.currentAnimation = void 0, this.resumingFrom.preserveOpacity = void 0);
      const f = this.getStack();
      f && f.exitAnimationComplete(), this.resumingFrom = this.currentAnimation = this.animationValues = void 0, this.notifyListeners("animationComplete");
    }
    finishAnimation() {
      this.currentAnimation && (this.mixTargetDelta && this.mixTargetDelta(jk), this.currentAnimation.stop()), this.completeAnimation();
    }
    applyTransformsToTarget() {
      const f = this.getLead();
      let { targetWithTransforms: p, target: m, layout: y, latestValues: S } = f;
      if (!(!p || !m || !y)) {
        if (this !== f && this.layout && y && a0(this.options.animationType, this.layout.layoutBox, y.layoutBox)) {
          m = this.target || He();
          const l = lt(this.layout.layoutBox.x);
          m.x.min = f.target.x.min, m.x.max = m.x.min + l;
          const c = lt(this.layout.layoutBox.y);
          m.y.min = f.target.y.min, m.y.max = m.y.min + c;
        }
        $t(p, m), da(p, S), ci(this.projectionDeltaWithTransform, this.layoutCorrected, p, S);
      }
    }
    registerSharedNode(f, p) {
      this.sharedNodes.has(f) || this.sharedNodes.set(f, new Dk()), this.sharedNodes.get(f).add(p);
      const y = p.options.initialPromotionConfig;
      p.promote({
        transition: y ? y.transition : void 0,
        preserveFollowOpacity: y && y.shouldPreserveFollowOpacity ? y.shouldPreserveFollowOpacity(p) : void 0
      });
    }
    isLead() {
      const f = this.getStack();
      return f ? f.lead === this : !0;
    }
    getLead() {
      var p;
      const { layoutId: f } = this.options;
      return f ? ((p = this.getStack()) == null ? void 0 : p.lead) || this : this;
    }
    getPrevLead() {
      var p;
      const { layoutId: f } = this.options;
      return f ? (p = this.getStack()) == null ? void 0 : p.prevLead : void 0;
    }
    getStack() {
      const { layoutId: f } = this.options;
      if (f)
        return this.root.sharedNodes.get(f);
    }
    promote({ needsReset: f, transition: p, preserveFollowOpacity: m } = {}) {
      const y = this.getStack();
      y && y.promote(this, m), f && (this.projectionDelta = void 0, this.needsReset = !0), p && this.setOptions({ transition: p });
    }
    relegate() {
      const f = this.getStack();
      return f ? f.relegate(this) : !1;
    }
    resetSkewAndRotation() {
      const { visualElement: f } = this.options;
      if (!f)
        return;
      let p = !1;
      const { latestValues: m } = f;
      if ((m.z || m.rotate || m.rotateX || m.rotateY || m.rotateZ || m.skewX || m.skewY) && (p = !0), !p)
        return;
      const y = {};
      m.z && mc("z", f, y, this.animationValues);
      for (let S = 0; S < pc.length; S++)
        mc(`rotate${pc[S]}`, f, y, this.animationValues), mc(`skew${pc[S]}`, f, y, this.animationValues);
      f.render();
      for (const S in y)
        f.setStaticValue(S, y[S]), this.animationValues && (this.animationValues[S] = y[S]);
      f.scheduleRender();
    }
    applyProjectionStyles(f, p) {
      if (!this.instance || this.isSVG)
        return;
      if (!this.isVisible) {
        f.visibility = "hidden";
        return;
      }
      const m = this.getTransformTemplate();
      if (this.needsReset) {
        this.needsReset = !1, f.visibility = "", f.opacity = "", f.pointerEvents = fa(p == null ? void 0 : p.pointerEvents) || "", f.transform = m ? m(this.latestValues, "") : "none";
        return;
      }
      const y = this.getLead();
      if (!this.projectionDelta || !this.layout || !y.target) {
        this.options.layoutId && (f.opacity = this.latestValues.opacity !== void 0 ? this.latestValues.opacity : 1, f.pointerEvents = fa(p == null ? void 0 : p.pointerEvents) || ""), this.hasProjected && !cr(this.latestValues) && (f.transform = m ? m({}, "") : "none", this.hasProjected = !1);
        return;
      }
      f.visibility = "";
      const S = y.animationValues || y.latestValues;
      this.applyTransformsToTarget();
      let l = kk(this.projectionDeltaWithTransform, this.treeScale, S);
      m && (l = m(S, l)), f.transform = l;
      const { x: c, y: g } = this.projectionDelta;
      f.transformOrigin = `${c.origin * 100}% ${g.origin * 100}% 0`, y.animationValues ? f.opacity = y === this ? S.opacity ?? this.latestValues.opacity ?? 1 : this.preserveOpacity ? this.latestValues.opacity : S.opacityExit : f.opacity = y === this ? S.opacity !== void 0 ? S.opacity : "" : S.opacityExit !== void 0 ? S.opacityExit : 0;
      for (const x in td) {
        if (S[x] === void 0)
          continue;
        const { correct: _, applyTo: A, isCSSVariable: T } = td[x], b = l === "none" ? S[x] : _(S[x], y);
        if (A) {
          const E = A.length;
          for (let D = 0; D < E; D++)
            f[A[D]] = b;
        } else
          T ? this.options.visualElement.renderState.vars[x] = b : f[x] = b;
      }
      this.options.layoutId && (f.pointerEvents = y === this ? fa(p == null ? void 0 : p.pointerEvents) || "" : "none");
    }
    clearSnapshot() {
      this.resumeFrom = this.snapshot = void 0;
    }
    // Only run on root
    resetTree() {
      this.root.nodes.forEach((f) => {
        var p;
        return (p = f.currentAnimation) == null ? void 0 : p.stop();
      }), this.root.nodes.forEach(by), this.root.sharedNodes.clear();
    }
  };
}
function Fk(e) {
  e.updateLayout();
}
function Ok(e) {
  var o;
  const n = ((o = e.resumeFrom) == null ? void 0 : o.snapshot) || e.snapshot;
  if (e.isLead() && e.layout && n && e.hasListeners("didUpdate")) {
    const { layoutBox: i, measuredBox: a } = e.layout, { animationType: d } = e.options, f = n.source !== e.layout.source;
    if (d === "size")
      Jt((l) => {
        const c = f ? n.measuredBox[l] : n.layoutBox[l], g = lt(c);
        c.min = i[l].min, c.max = c.min + g;
      });
    else if (d === "x" || d === "y") {
      const l = d === "x" ? "y" : "x";
      nd(f ? n.measuredBox[l] : n.layoutBox[l], i[l]);
    } else a0(d, n.layoutBox, i) && Jt((l) => {
      const c = f ? n.measuredBox[l] : n.layoutBox[l], g = lt(i[l]);
      c.max = c.min + g, e.relativeTarget && !e.currentAnimation && (e.isProjectionDirty = !0, e.relativeTarget[l].max = e.relativeTarget[l].min + g);
    });
    const p = oo();
    ci(p, i, n.layoutBox);
    const m = oo();
    f ? ci(m, e.applyTransform(a, !0), n.measuredBox) : ci(m, i, n.layoutBox);
    const y = !n0(p);
    let S = !1;
    if (!e.resumeFrom) {
      const l = e.getClosestProjectingParent();
      if (l && !l.resumeFrom) {
        const { snapshot: c, layout: g } = l;
        if (c && g) {
          const x = e.options.layoutAnchor || void 0, _ = He();
          Ma(_, n.layoutBox, c.layoutBox, x);
          const A = He();
          Ma(A, i, g.layoutBox, x), r0(_, A) || (S = !0), l.options.layoutRoot && (e.relativeTarget = A, e.relativeTargetOrigin = _, e.relativeParent = l);
        }
      }
    }
    e.notifyListeners("didUpdate", {
      layout: i,
      snapshot: n,
      delta: m,
      layoutDelta: p,
      hasLayoutChanged: y,
      hasRelativeLayoutChanged: S
    });
  } else if (e.isLead()) {
    const { onExitComplete: i } = e.options;
    i && i();
  }
  e.options.transition = void 0;
}
function Lk(e) {
  e.parent && (e.isProjecting() || (e.isProjectionDirty = e.parent.isProjectionDirty), e.isSharedProjectionDirty || (e.isSharedProjectionDirty = !!(e.isProjectionDirty || e.parent.isProjectionDirty || e.parent.isSharedProjectionDirty)), e.isTransformDirty || (e.isTransformDirty = e.parent.isTransformDirty));
}
function Vk(e) {
  e.isProjectionDirty = e.isSharedProjectionDirty = e.isTransformDirty = !1;
}
function zk(e) {
  e.clearSnapshot();
}
function by(e) {
  e.clearMeasurements();
}
function Bk(e) {
  e.isLayoutDirty = !0, e.updateLayout();
}
function Py(e) {
  e.isLayoutDirty = !1;
}
function $k(e) {
  e.isAnimationBlocked && e.layout && !e.isLayoutDirty && (e.snapshot = e.layout, e.isLayoutDirty = !0);
}
function Uk(e) {
  const { visualElement: n } = e.options;
  n && n.getProps().onBeforeLayoutMeasure && n.notify("BeforeLayoutMeasure"), e.resetTransform();
}
function Ey(e) {
  e.finishAnimation(), e.targetDelta = e.relativeTarget = e.target = void 0, e.isProjectionDirty = !0;
}
function Hk(e) {
  e.resolveTargetDelta();
}
function Wk(e) {
  e.calcProjection();
}
function Gk(e) {
  e.resetSkewAndRotation();
}
function Kk(e) {
  e.removeLeadSnapshot();
}
function My(e, n, o) {
  e.translate = be(n.translate, 0, o), e.scale = be(n.scale, 1, o), e.origin = n.origin, e.originPoint = n.originPoint;
}
function Ry(e, n, o, i) {
  e.min = be(n.min, o.min, i), e.max = be(n.max, o.max, i);
}
function Yk(e, n, o, i) {
  Ry(e.x, n.x, o.x, i), Ry(e.y, n.y, o.y, i);
}
function Qk(e) {
  return e.animationValues && e.animationValues.opacityExit !== void 0;
}
const Xk = {
  duration: 0.45,
  ease: [0.4, 0, 0.1, 1]
}, Ny = (e) => typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().includes(e), Dy = Ny("applewebkit/") && !Ny("chrome/") ? Math.round : jt;
function jy(e) {
  e.min = Dy(e.min), e.max = Dy(e.max);
}
function Zk(e) {
  jy(e.x), jy(e.y);
}
function a0(e, n, o) {
  return e === "position" || e === "preserve-aspect" && !vk(_y(n), _y(o), 0.2);
}
function qk(e) {
  var n;
  return e !== e.root && ((n = e.scroll) == null ? void 0 : n.wasRoot);
}
const Jk = s0({
  attachResizeListener: (e, n) => xi(e, "resize", n),
  measureScroll: () => {
    var e, n;
    return {
      x: document.documentElement.scrollLeft || ((e = document.body) == null ? void 0 : e.scrollLeft) || 0,
      y: document.documentElement.scrollTop || ((n = document.body) == null ? void 0 : n.scrollTop) || 0
    };
  },
  checkIsScrollRoot: () => !0
}), hc = {
  current: void 0
}, l0 = s0({
  measureScroll: (e) => ({
    x: e.scrollLeft,
    y: e.scrollTop
  }),
  defaultParent: () => {
    if (!hc.current) {
      const e = new Jk({});
      e.mount(window), e.setOptions({ layoutScroll: !0 }), hc.current = e;
    }
    return hc.current;
  },
  resetTransform: (e, n) => {
    e.style.transform = n !== void 0 ? n : "none";
  },
  checkIsScrollRoot: (e) => window.getComputedStyle(e).position === "fixed"
}), Mi = C.createContext({
  transformPagePoint: (e) => e,
  isStatic: !1,
  reducedMotion: "never"
});
function Iy(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function eA(...e) {
  return (n) => {
    let o = !1;
    const i = e.map((a) => {
      const d = Iy(a, n);
      return !o && typeof d == "function" && (o = !0), d;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const d = i[a];
          typeof d == "function" ? d() : Iy(e[a], null);
        }
      };
  };
}
function tA(...e) {
  return C.useCallback(eA(...e), e);
}
class nA extends C.Component {
  getSnapshotBeforeUpdate(n) {
    const o = this.props.childRef.current;
    if (aa(o) && n.isPresent && !this.props.isPresent && this.props.pop !== !1) {
      const i = o.offsetParent, a = aa(i) && i.offsetWidth || 0, d = aa(i) && i.offsetHeight || 0, f = getComputedStyle(o), p = this.props.sizeRef.current;
      p.height = parseFloat(f.height), p.width = parseFloat(f.width), p.top = o.offsetTop, p.left = o.offsetLeft, p.right = a - p.width - p.left, p.bottom = d - p.height - p.top, p.direction = f.direction;
    }
    return null;
  }
  /**
   * Required with getSnapshotBeforeUpdate to stop React complaining.
   */
  componentDidUpdate() {
  }
  render() {
    return this.props.children;
  }
}
function rA({ children: e, isPresent: n, anchorX: o, anchorY: i, root: a, pop: d }) {
  var c;
  const f = C.useId(), p = C.useRef(null), m = C.useRef({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    direction: "ltr"
  }), { nonce: y } = C.useContext(Mi), S = ((c = e.props) == null ? void 0 : c.ref) ?? (e == null ? void 0 : e.ref), l = tA(p, S);
  return C.useInsertionEffect(() => {
    const { width: g, height: x, top: _, left: A, right: T, bottom: b, direction: E } = m.current;
    if (n || d === !1 || !p.current || !g || !x)
      return;
    const D = E === "rtl", L = o === "left" ? D ? `right: ${T}` : `left: ${A}` : D ? `left: ${A}` : `right: ${T}`, G = i === "bottom" ? `bottom: ${b}` : `top: ${_}`;
    p.current.dataset.motionPopId = f;
    const W = document.createElement("style");
    y && (W.nonce = y);
    const H = a ?? document.head;
    return H.appendChild(W), W.sheet && W.sheet.insertRule(`
          [data-motion-pop-id="${f}"] {
            position: absolute !important;
            width: ${g}px !important;
            height: ${x}px !important;
            ${L}px !important;
            ${G}px !important;
          }
        `), () => {
      var V;
      (V = p.current) == null || V.removeAttribute("data-motion-pop-id"), H.contains(W) && H.removeChild(W);
    };
  }, [n]), w.jsx(nA, { isPresent: n, childRef: p, sizeRef: m, pop: d, children: d === !1 ? e : C.cloneElement(e, { ref: l }) });
}
const oA = ({ children: e, initial: n, isPresent: o, onExitComplete: i, custom: a, presenceAffectsLayout: d, mode: f, anchorX: p, anchorY: m, root: y }) => {
  const S = _r(iA), l = C.useId(), c = C.useRef(o), g = C.useRef(i);
  Wa(() => {
    c.current = o, g.current = i;
  });
  let x = !0, _ = C.useMemo(() => (x = !1, {
    id: l,
    initial: n,
    isPresent: o,
    custom: a,
    onExitComplete: (A) => {
      S.set(A, !0);
      for (const T of S.values())
        if (!T)
          return;
      i && i();
    },
    register: (A) => (S.set(A, !1), () => {
      var T;
      S.delete(A), !c.current && !S.size && ((T = g.current) == null || T.call(g));
    })
  }), [o, S, i]);
  return d && x && (_ = { ..._ }), C.useMemo(() => {
    S.forEach((A, T) => S.set(T, !1));
  }, [o]), C.useEffect(() => {
    !o && !S.size && i && i();
  }, [o]), e = w.jsx(rA, { pop: f === "popLayout", isPresent: o, anchorX: p, anchorY: m, root: y, children: e }), w.jsx(Ga.Provider, { value: _, children: e });
};
function iA() {
  return /* @__PURE__ */ new Map();
}
function u0(e = !0) {
  const n = C.useContext(Ga);
  if (n === null)
    return [!0, null];
  const { isPresent: o, onExitComplete: i, register: a } = n, d = C.useId();
  C.useEffect(() => {
    if (e)
      return a(d);
  }, [e]);
  const f = C.useCallback(() => e && i && i(d), [d, i, e]);
  return !o && i ? [!1, f] : [!0];
}
const Gs = (e) => e.key || "";
function Fy(e) {
  const n = [];
  return C.Children.forEach(e, (o) => {
    C.isValidElement(o) && n.push(o);
  }), n;
}
const Xa = ({ children: e, custom: n, initial: o = !0, onExitComplete: i, presenceAffectsLayout: a = !0, mode: d = "sync", propagate: f = !1, anchorX: p = "left", anchorY: m = "top", root: y }) => {
  const [S, l] = u0(f), c = C.useMemo(() => Fy(e), [e]), g = f && !S ? [] : c.map(Gs), x = C.useRef(!0), _ = C.useRef(c), A = _r(() => /* @__PURE__ */ new Map()), T = C.useRef(/* @__PURE__ */ new Set()), [b, E] = C.useState(c), [D, L] = C.useState(c);
  Wa(() => {
    x.current = !1, _.current = c;
    for (let H = 0; H < D.length; H++) {
      const V = Gs(D[H]);
      g.includes(V) ? (A.delete(V), T.current.delete(V)) : A.get(V) !== !0 && A.set(V, !1);
    }
  }, [D, g.length, g.join("-")]);
  const G = [];
  if (c !== b) {
    let H = [...c];
    for (let V = 0; V < D.length; V++) {
      const X = D[V], J = Gs(X);
      g.includes(J) || (H.splice(V, 0, X), G.push(X));
    }
    return d === "wait" && G.length && (H = G), L(Fy(H)), E(c), null;
  }
  const { forceRender: W } = C.useContext(Ad);
  return w.jsx(w.Fragment, { children: D.map((H) => {
    const V = Gs(H), X = f && !S ? !1 : c === D || g.includes(V), J = () => {
      if (T.current.has(V))
        return;
      if (A.has(V))
        T.current.add(V), A.set(V, !0);
      else
        return;
      let ce = !0;
      A.forEach((me) => {
        me || (ce = !1);
      }), ce && (W == null || W(), L(_.current), f && (l == null || l()), i && i());
    };
    return w.jsx(oA, { isPresent: X, initial: !x.current || o ? void 0 : !1, custom: n, presenceAffectsLayout: a, mode: d, root: y, onExitComplete: X ? void 0 : J, anchorX: p, anchorY: m, children: H }, V);
  }) });
}, c0 = C.createContext({ strict: !1 }), Oy = {
  animation: [
    "animate",
    "variants",
    "whileHover",
    "whileTap",
    "exit",
    "whileInView",
    "whileFocus",
    "whileDrag"
  ],
  exit: ["exit"],
  drag: ["drag", "dragControls"],
  focus: ["whileFocus"],
  hover: ["whileHover", "onHoverStart", "onHoverEnd"],
  tap: ["whileTap", "onTap", "onTapStart", "onTapCancel"],
  pan: ["onPan", "onPanStart", "onPanSessionStart", "onPanEnd"],
  inView: ["whileInView", "onViewportEnter", "onViewportLeave"],
  layout: ["layout", "layoutId"]
};
let Ly = !1;
function sA() {
  if (Ly)
    return;
  const e = {};
  for (const n in Oy)
    e[n] = {
      isEnabled: (o) => Oy[n].some((i) => !!o[i])
    };
  zv(e), Ly = !0;
}
function d0() {
  return sA(), HT();
}
function aA(e) {
  const n = d0();
  for (const o in e)
    n[o] = {
      ...n[o],
      ...e[o]
    };
  zv(n);
}
const lA = /* @__PURE__ */ new Set([
  "animate",
  "exit",
  "variants",
  "initial",
  "style",
  "values",
  "variants",
  "transition",
  "transformTemplate",
  "custom",
  "inherit",
  "onBeforeLayoutMeasure",
  "onAnimationStart",
  "onAnimationComplete",
  "onUpdate",
  "onDragStart",
  "onDrag",
  "onDragEnd",
  "onMeasureDragConstraints",
  "onDirectionLock",
  "onDragTransitionEnd",
  "_dragX",
  "_dragY",
  "onHoverStart",
  "onHoverEnd",
  "onViewportEnter",
  "onViewportLeave",
  "globalTapTarget",
  "propagate",
  "ignoreStrict",
  "viewport"
]);
function Ra(e) {
  return e.startsWith("while") || e.startsWith("drag") && e !== "draggable" || e.startsWith("layout") || e.startsWith("onTap") || e.startsWith("onPan") || e.startsWith("onLayout") || lA.has(e);
}
let f0 = (e) => !Ra(e);
function uA(e) {
  typeof e == "function" && (f0 = (n) => n.startsWith("on") ? !Ra(n) : e(n));
}
try {
  uA(require("@emotion/is-prop-valid").default);
} catch {
}
function cA(e, n, o) {
  const i = {};
  for (const a in e)
    a === "values" && typeof e.values == "object" || We(e[a]) || (f0(a) || o === !0 && Ra(a) || !n && !Ra(a) || // If trying to use native HTML drag events, forward drag listeners
    e.draggable && a.startsWith("onDrag")) && (i[a] = e[a]);
  return i;
}
const Za = /* @__PURE__ */ C.createContext({});
function dA(e, n) {
  if (Qa(e)) {
    const { initial: o, animate: i } = e;
    return {
      initial: o === !1 || wi(o) ? o : void 0,
      animate: wi(i) ? i : void 0
    };
  }
  return e.inherit !== !1 ? n : {};
}
function fA(e) {
  const { initial: n, animate: o } = dA(e, C.useContext(Za));
  return C.useMemo(() => ({ initial: n, animate: o }), [Vy(n), Vy(o)]);
}
function Vy(e) {
  return Array.isArray(e) ? e.join(" ") : e;
}
const Xd = () => ({
  style: {},
  transform: {},
  transformOrigin: {},
  vars: {}
});
function p0(e, n, o) {
  for (const i in n)
    !We(n[i]) && !Kv(i, o) && (e[i] = n[i]);
}
function pA({ transformTemplate: e }, n) {
  return C.useMemo(() => {
    const o = Xd();
    return Yd(o, n, e), Object.assign({}, o.vars, o.style);
  }, [n]);
}
function mA(e, n) {
  const o = e.style || {}, i = {};
  return p0(i, o, e), Object.assign(i, pA(e, n)), i;
}
function hA(e, n) {
  const o = {}, i = mA(e, n);
  return e.drag && e.dragListener !== !1 && (o.draggable = !1, i.userSelect = i.WebkitUserSelect = i.WebkitTouchCallout = "none", i.touchAction = e.drag === !0 ? "none" : `pan-${e.drag === "x" ? "y" : "x"}`), e.tabIndex === void 0 && (e.onTap || e.onTapStart || e.whileTap) && (o.tabIndex = 0), o.style = i, o;
}
const m0 = () => ({
  ...Xd(),
  attrs: {}
});
function yA(e, n, o, i) {
  const a = C.useMemo(() => {
    const d = m0();
    return Yv(d, n, Xv(i), e.transformTemplate, e.style), {
      ...d.attrs,
      style: { ...d.style }
    };
  }, [n]);
  if (e.style) {
    const d = {};
    p0(d, e.style, e), a.style = { ...d, ...a.style };
  }
  return a;
}
const gA = [
  "animate",
  "circle",
  "defs",
  "desc",
  "ellipse",
  "g",
  "image",
  "line",
  "filter",
  "marker",
  "mask",
  "metadata",
  "path",
  "pattern",
  "polygon",
  "polyline",
  "rect",
  "stop",
  "switch",
  "symbol",
  "svg",
  "text",
  "tspan",
  "use",
  "view"
];
function Zd(e) {
  return (
    /**
     * If it's not a string, it's a custom React component. Currently we only support
     * HTML custom React components.
     */
    typeof e != "string" || /**
     * If it contains a dash, the element is a custom HTML webcomponent.
     */
    e.includes("-") ? !1 : (
      /**
       * If it's in our list of lowercase SVG tags, it's an SVG component
       */
      !!(gA.indexOf(e) > -1 || /**
       * If it contains a capital letter, it's an SVG component
       */
      /[A-Z]/u.test(e))
    )
  );
}
function vA(e, n, o, { latestValues: i }, a, d = !1, f) {
  const m = (f ?? Zd(e) ? yA : hA)(n, i, a, e), y = cA(n, typeof e == "string", d), S = e !== C.Fragment ? { ...y, ...m, ref: o } : {}, { children: l } = n, c = C.useMemo(() => We(l) ? l.get() : l, [l]);
  return C.createElement(e, {
    ...S,
    children: c
  });
}
function SA({ scrapeMotionValuesFromProps: e, createRenderState: n }, o, i, a) {
  return {
    latestValues: wA(o, i, a, e),
    renderState: n()
  };
}
function wA(e, n, o, i) {
  const a = {}, d = i(e, {});
  for (const c in d)
    a[c] = fa(d[c]);
  let { initial: f, animate: p } = e;
  const m = Qa(e), y = Lv(e);
  n && y && !m && e.inherit !== !1 && (f === void 0 && (f = n.initial), p === void 0 && (p = n.animate));
  let S = o ? o.initial === !1 : !1;
  S = S || f === !1;
  const l = S ? p : f;
  if (l && typeof l != "boolean" && !Ya(l)) {
    const c = Array.isArray(l) ? l : [l];
    for (let g = 0; g < c.length; g++) {
      const x = Vd(e, c[g]);
      if (x) {
        const { transitionEnd: _, transition: A, ...T } = x;
        for (const b in T) {
          let E = T[b];
          if (Array.isArray(E)) {
            const D = S ? E.length - 1 : 0;
            E = E[D];
          }
          E !== null && (a[b] = E);
        }
        for (const b in _)
          a[b] = _[b];
      }
    }
  }
  return a;
}
const h0 = (e) => (n, o) => {
  const i = C.useContext(Za), a = C.useContext(Ga), d = () => SA(e, n, i, a);
  return o ? d() : _r(d);
}, xA = /* @__PURE__ */ h0({
  scrapeMotionValuesFromProps: Qd,
  createRenderState: Xd
}), _A = /* @__PURE__ */ h0({
  scrapeMotionValuesFromProps: Zv,
  createRenderState: m0
}), TA = Symbol.for("motionComponentSymbol");
function kA(e, n, o) {
  const i = C.useRef(o);
  C.useInsertionEffect(() => {
    i.current = o;
  });
  const a = C.useRef(null);
  return C.useCallback((d) => {
    var p;
    d && ((p = e.onMount) == null || p.call(e, d)), n && (d ? n.mount(d) : n.unmount());
    const f = i.current;
    if (typeof f == "function")
      if (d) {
        const m = f(d);
        typeof m == "function" && (a.current = m);
      } else a.current ? (a.current(), a.current = null) : f(d);
    else f && (f.current = d);
  }, [n]);
}
const y0 = C.createContext({});
function to(e) {
  return e && typeof e == "object" && Object.prototype.hasOwnProperty.call(e, "current");
}
function AA(e, n, o, i, a, d) {
  var E, D;
  const { visualElement: f } = C.useContext(Za), p = C.useContext(c0), m = C.useContext(Ga), y = C.useContext(Mi), S = y.reducedMotion, l = y.skipAnimations, c = C.useRef(null), g = C.useRef(!1);
  i = i || p.renderer, !c.current && i && (c.current = i(e, {
    visualState: n,
    parent: f,
    props: o,
    presenceContext: m,
    blockInitialAnimation: m ? m.initial === !1 : !1,
    reducedMotionConfig: S,
    skipAnimations: l,
    isSVG: d
  }), g.current && c.current && (c.current.manuallyAnimateOnMount = !0));
  const x = c.current, _ = C.useContext(y0);
  x && !x.projection && a && (x.type === "html" || x.type === "svg") && CA(c.current, o, a, _);
  const A = C.useRef(!1);
  C.useInsertionEffect(() => {
    x && A.current && x.update(o, m);
  });
  const T = o[Cv], b = C.useRef(!!T && typeof window < "u" && !((E = window.MotionHandoffIsComplete) != null && E.call(window, T)) && ((D = window.MotionHasOptimisedAnimation) == null ? void 0 : D.call(window, T)));
  return Wa(() => {
    g.current = !0, x && (A.current = !0, window.MotionIsMounted = !0, x.updateFeatures(), x.scheduleRenderMicrotask(), b.current && x.animationState && x.animationState.animateChanges());
  }), C.useEffect(() => {
    x && (!b.current && x.animationState && x.animationState.animateChanges(), b.current && (queueMicrotask(() => {
      var L;
      (L = window.MotionHandoffMarkAsComplete) == null || L.call(window, T);
    }), b.current = !1), x.enteringChildren = void 0);
  }), x;
}
function CA(e, n, o, i) {
  const { layoutId: a, layout: d, drag: f, dragConstraints: p, layoutScroll: m, layoutRoot: y, layoutAnchor: S, layoutCrossfade: l } = n;
  e.projection = new o(e.latestValues, n["data-framer-portal-id"] ? void 0 : g0(e.parent)), e.projection.setOptions({
    layoutId: a,
    layout: d,
    alwaysMeasureLayout: !!f || p && to(p),
    visualElement: e,
    /**
     * TODO: Update options in an effect. This could be tricky as it'll be too late
     * to update by the time layout animations run.
     * We also need to fix this safeToRemove by linking it up to the one returned by usePresence,
     * ensuring it gets called if there's no potential layout animations.
     *
     */
    animationType: typeof d == "string" ? d : "both",
    initialPromotionConfig: i,
    crossfade: l,
    layoutScroll: m,
    layoutRoot: y,
    layoutAnchor: S
  });
}
function g0(e) {
  if (e)
    return e.options.allowProjection !== !1 ? e.projection : g0(e.parent);
}
function yc(e, { forwardMotionProps: n = !1, type: o } = {}, i, a) {
  i && aA(i);
  const d = o ? o === "svg" : Zd(e), f = d ? _A : xA;
  function p(y, S) {
    let l;
    const c = {
      ...C.useContext(Mi),
      ...y,
      layoutId: bA(y)
    }, { isStatic: g } = c, x = fA(y), _ = f(y, g);
    if (!g && typeof window < "u") {
      PA();
      const A = EA(c);
      l = A.MeasureLayout, x.visualElement = AA(e, _, c, a, A.ProjectionNode, d);
    }
    return w.jsxs(Za.Provider, { value: x, children: [l && x.visualElement ? w.jsx(l, { visualElement: x.visualElement, ...c }) : null, vA(e, y, kA(_, x.visualElement, S), _, g, n, d)] });
  }
  p.displayName = `motion.${typeof e == "string" ? e : `create(${e.displayName ?? e.name ?? ""})`}`;
  const m = C.forwardRef(p);
  return m[TA] = e, m;
}
function bA({ layoutId: e }) {
  const n = C.useContext(Ad).id;
  return n && e !== void 0 ? n + "-" + e : e;
}
function PA(e, n) {
  C.useContext(c0).strict;
}
function EA(e) {
  const n = d0(), { drag: o, layout: i } = n;
  if (!o && !i)
    return {};
  const a = { ...o, ...i };
  return {
    MeasureLayout: o != null && o.isEnabled(e) || i != null && i.isEnabled(e) ? a.MeasureLayout : void 0,
    ProjectionNode: a.ProjectionNode
  };
}
function MA(e, n) {
  if (typeof Proxy > "u")
    return yc;
  const o = /* @__PURE__ */ new Map(), i = (d, f) => yc(d, f, e, n), a = (d, f) => i(d, f);
  return new Proxy(a, {
    /**
     * Called when `motion` is referenced with a prop: `motion.div`, `motion.input` etc.
     * The prop name is passed through as `key` and we can use that to generate a `motion`
     * DOM component with that name.
     */
    get: (d, f) => f === "create" ? i : (o.has(f) || o.set(f, yc(f, void 0, e, n)), o.get(f))
  });
}
const RA = (e, n) => n.isSVG ?? Zd(e) ? new ak(n) : new tk(n, {
  allowProjection: e !== C.Fragment
});
class NA extends Qn {
  /**
   * We dynamically generate the AnimationState manager as it contains a reference
   * to the underlying animation library. We only want to load that if we load this,
   * so people can optionally code split it out using the `m` component.
   */
  constructor(n) {
    super(n), n.animationState || (n.animationState = fk(n));
  }
  updateAnimationControlsSubscription() {
    const { animate: n } = this.node.getProps();
    Ya(n) && (this.unmountControls = n.subscribe(this.node));
  }
  /**
   * Subscribe any provided AnimationControls to the component's VisualElement
   */
  mount() {
    this.updateAnimationControlsSubscription();
  }
  update() {
    const { animate: n } = this.node.getProps(), { animate: o } = this.node.prevProps || {};
    n !== o && this.updateAnimationControlsSubscription();
  }
  unmount() {
    var n;
    this.node.animationState.reset(), (n = this.unmountControls) == null || n.call(this);
  }
}
let DA = 0;
class jA extends Qn {
  constructor() {
    super(...arguments), this.id = DA++, this.isExitComplete = !1;
  }
  update() {
    var d;
    if (!this.node.presenceContext)
      return;
    const { isPresent: n, onExitComplete: o } = this.node.presenceContext, { isPresent: i } = this.node.prevPresenceContext || {};
    if (!this.node.animationState || n === i)
      return;
    if (n && i === !1) {
      if (this.isExitComplete) {
        const { initial: f, custom: p } = this.node.getProps();
        if (typeof f == "string" || typeof f == "object" && f !== null && !Array.isArray(f)) {
          const m = Sr(this.node, f, p);
          if (m) {
            const { transition: y, transitionEnd: S, ...l } = m;
            for (const c in l)
              (d = this.node.getValue(c)) == null || d.jump(l[c]);
          }
        }
        this.node.animationState.reset(), this.node.animationState.animateChanges();
      } else
        this.node.animationState.setActive("exit", !1);
      this.isExitComplete = !1;
      return;
    }
    const a = this.node.animationState.setActive("exit", !n);
    o && !n && a.then(() => {
      this.isExitComplete = !0, o(this.id);
    });
  }
  mount() {
    const { register: n, onExitComplete: o } = this.node.presenceContext || {};
    o && o(this.id), n && (this.unmount = n(this.id));
  }
  unmount() {
  }
}
const IA = {
  animation: {
    Feature: NA
  },
  exit: {
    Feature: jA
  }
};
function Ri(e) {
  return {
    point: {
      x: e.pageX,
      y: e.pageY
    }
  };
}
const FA = (e) => (n) => Ud(n) && e(n, Ri(n));
function di(e, n, o, i) {
  return xi(e, n, FA(o), i);
}
const v0 = ({ current: e }) => e ? e.ownerDocument.defaultView : null, zy = (e, n) => Math.abs(e - n);
function OA(e, n) {
  const o = zy(e.x, n.x), i = zy(e.y, n.y);
  return Math.sqrt(o ** 2 + i ** 2);
}
const By = /* @__PURE__ */ new Set(["auto", "scroll"]);
class S0 {
  constructor(n, o, { transformPagePoint: i, contextWindow: a = window, dragSnapToOrigin: d = !1, distanceThreshold: f = 3, element: p } = {}) {
    if (this.startEvent = null, this.lastMoveEvent = null, this.lastMoveEventInfo = null, this.lastRawMoveEventInfo = null, this.handlers = {}, this.contextWindow = window, this.scrollPositions = /* @__PURE__ */ new Map(), this.removeScrollListeners = null, this.onElementScroll = (x) => {
      this.handleScroll(x.target);
    }, this.onWindowScroll = () => {
      this.handleScroll(window);
    }, this.updatePoint = () => {
      if (!(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      this.lastRawMoveEventInfo && (this.lastMoveEventInfo = Ks(this.lastRawMoveEventInfo, this.transformPagePoint));
      const x = gc(this.lastMoveEventInfo, this.history), _ = this.startEvent !== null, A = OA(x.offset, { x: 0, y: 0 }) >= this.distanceThreshold;
      if (!_ && !A)
        return;
      const { point: T } = x, { timestamp: b } = qe;
      this.history.push({ ...T, timestamp: b });
      const { onStart: E, onMove: D } = this.handlers;
      _ || (E && E(this.lastMoveEvent, x), this.startEvent = this.lastMoveEvent), D && D(this.lastMoveEvent, x);
    }, this.handlePointerMove = (x, _) => {
      this.lastMoveEvent = x, this.lastRawMoveEventInfo = _, this.lastMoveEventInfo = Ks(_, this.transformPagePoint), ke.update(this.updatePoint, !0);
    }, this.handlePointerUp = (x, _) => {
      this.end();
      const { onEnd: A, onSessionEnd: T, resumeAnimation: b } = this.handlers;
      if ((this.dragSnapToOrigin || !this.startEvent) && b && b(), !(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      const E = gc(x.type === "pointercancel" ? this.lastMoveEventInfo : Ks(_, this.transformPagePoint), this.history);
      this.startEvent && A && A(x, E), T && T(x, E);
    }, !Ud(n))
      return;
    this.dragSnapToOrigin = d, this.handlers = o, this.transformPagePoint = i, this.distanceThreshold = f, this.contextWindow = a || window;
    const m = Ri(n), y = Ks(m, this.transformPagePoint), { point: S } = y, { timestamp: l } = qe;
    this.history = [{ ...S, timestamp: l }];
    const { onSessionStart: c } = o;
    c && c(n, gc(y, this.history));
    const g = { passive: !0, capture: !0 };
    this.removeListeners = bi(di(this.contextWindow, "pointermove", this.handlePointerMove, g), di(this.contextWindow, "pointerup", this.handlePointerUp, g), di(this.contextWindow, "pointercancel", this.handlePointerUp, g)), p && this.startScrollTracking(p);
  }
  /**
   * Start tracking scroll on ancestors and window.
   */
  startScrollTracking(n) {
    let o = n.parentElement;
    for (; o; ) {
      const i = getComputedStyle(o);
      (By.has(i.overflowX) || By.has(i.overflowY)) && this.scrollPositions.set(o, {
        x: o.scrollLeft,
        y: o.scrollTop
      }), o = o.parentElement;
    }
    this.scrollPositions.set(window, {
      x: window.scrollX,
      y: window.scrollY
    }), window.addEventListener("scroll", this.onElementScroll, {
      capture: !0
    }), window.addEventListener("scroll", this.onWindowScroll), this.removeScrollListeners = () => {
      window.removeEventListener("scroll", this.onElementScroll, {
        capture: !0
      }), window.removeEventListener("scroll", this.onWindowScroll);
    };
  }
  /**
   * Handle scroll compensation during drag.
   *
   * For element scroll: adjusts history origin since pageX/pageY doesn't change.
   * For window scroll: adjusts lastMoveEventInfo since pageX/pageY would change.
   */
  handleScroll(n) {
    const o = this.scrollPositions.get(n);
    if (!o)
      return;
    const i = n === window, a = i ? { x: window.scrollX, y: window.scrollY } : {
      x: n.scrollLeft,
      y: n.scrollTop
    }, d = { x: a.x - o.x, y: a.y - o.y };
    d.x === 0 && d.y === 0 || (i ? this.lastMoveEventInfo && (this.lastMoveEventInfo.point.x += d.x, this.lastMoveEventInfo.point.y += d.y) : this.history.length > 0 && (this.history[0].x -= d.x, this.history[0].y -= d.y), this.scrollPositions.set(n, a), ke.update(this.updatePoint, !0));
  }
  updateHandlers(n) {
    this.handlers = n;
  }
  end() {
    this.removeListeners && this.removeListeners(), this.removeScrollListeners && this.removeScrollListeners(), this.scrollPositions.clear(), vn(this.updatePoint);
  }
}
function Ks(e, n) {
  return n ? { point: n(e.point) } : e;
}
function $y(e, n) {
  return { x: e.x - n.x, y: e.y - n.y };
}
function gc({ point: e }, n) {
  return {
    point: e,
    delta: $y(e, w0(n)),
    offset: $y(e, LA(n)),
    velocity: VA(n, 0.1)
  };
}
function LA(e) {
  return e[0];
}
function w0(e) {
  return e[e.length - 1];
}
function VA(e, n) {
  if (e.length < 2)
    return { x: 0, y: 0 };
  let o = e.length - 1, i = null;
  const a = w0(e);
  for (; o >= 0 && (i = e[o], !(a.timestamp - i.timestamp > /* @__PURE__ */ gt(n))); )
    o--;
  if (!i)
    return { x: 0, y: 0 };
  i === e[0] && e.length > 2 && a.timestamp - i.timestamp > /* @__PURE__ */ gt(n) * 2 && (i = e[1]);
  const d = /* @__PURE__ */ Dt(a.timestamp - i.timestamp);
  if (d === 0)
    return { x: 0, y: 0 };
  const f = {
    x: (a.x - i.x) / d,
    y: (a.y - i.y) / d
  };
  return f.x === 1 / 0 && (f.x = 0), f.y === 1 / 0 && (f.y = 0), f;
}
function zA(e, { min: n, max: o }, i) {
  return n !== void 0 && e < n ? e = i ? be(n, e, i.min) : Math.max(e, n) : o !== void 0 && e > o && (e = i ? be(o, e, i.max) : Math.min(e, o)), e;
}
function Uy(e, n, o) {
  return {
    min: n !== void 0 ? e.min + n : void 0,
    max: o !== void 0 ? e.max + o - (e.max - e.min) : void 0
  };
}
function BA(e, { top: n, left: o, bottom: i, right: a }) {
  return {
    x: Uy(e.x, o, a),
    y: Uy(e.y, n, i)
  };
}
function Hy(e, n) {
  let o = n.min - e.min, i = n.max - e.max;
  return n.max - n.min < e.max - e.min && ([o, i] = [i, o]), { min: o, max: i };
}
function $A(e, n) {
  return {
    x: Hy(e.x, n.x),
    y: Hy(e.y, n.y)
  };
}
function UA(e, n) {
  let o = 0.5;
  const i = lt(e), a = lt(n);
  return a > i ? o = /* @__PURE__ */ gi(n.min, n.max - i, e.min) : i > a && (o = /* @__PURE__ */ gi(e.min, e.max - a, n.min)), on(0, 1, o);
}
function HA(e, n) {
  const o = {};
  return n.min !== void 0 && (o.min = n.min - e.min), n.max !== void 0 && (o.max = n.max - e.min), o;
}
const rd = 0.35;
function WA(e = rd) {
  return e === !1 ? e = 0 : e === !0 && (e = rd), {
    x: Wy(e, "left", "right"),
    y: Wy(e, "top", "bottom")
  };
}
function Wy(e, n, o) {
  return {
    min: Gy(e, n),
    max: Gy(e, o)
  };
}
function Gy(e, n) {
  return typeof e == "number" ? e : e[n] || 0;
}
const GA = /* @__PURE__ */ new WeakMap();
class KA {
  constructor(n) {
    this.openDragLock = null, this.isDragging = !1, this.currentDirection = null, this.originPoint = { x: 0, y: 0 }, this.constraints = !1, this.hasMutatedConstraints = !1, this.elastic = He(), this.latestPointerEvent = null, this.latestPanInfo = null, this.visualElement = n;
  }
  start(n, { snapToCursor: o = !1, distanceThreshold: i } = {}) {
    const { presenceContext: a } = this.visualElement;
    if (a && a.isPresent === !1)
      return;
    const d = (l) => {
      o && this.snapToCursor(Ri(l).point), this.stopAnimation();
    }, f = (l, c) => {
      const { drag: g, dragPropagation: x, onDragStart: _ } = this.getProps();
      if (g && !x && (this.openDragLock && this.openDragLock(), this.openDragLock = ST(g), !this.openDragLock))
        return;
      this.latestPointerEvent = l, this.latestPanInfo = c, this.isDragging = !0, this.currentDirection = null, this.resolveConstraints(), this.visualElement.projection && (this.visualElement.projection.isAnimationBlocked = !0, this.visualElement.projection.target = void 0), Jt((T) => {
        let b = this.getAxisMotionValue(T).get() || 0;
        if (rn.test(b)) {
          const { projection: E } = this.visualElement;
          if (E && E.layout) {
            const D = E.layout.layoutBox[T];
            D && (b = lt(D) * (parseFloat(b) / 100));
          }
        }
        this.originPoint[T] = b;
      }), _ && ke.update(() => _(l, c), !1, !0), Yc(this.visualElement, "transform");
      const { animationState: A } = this.visualElement;
      A && A.setActive("whileDrag", !0);
    }, p = (l, c) => {
      this.latestPointerEvent = l, this.latestPanInfo = c;
      const { dragPropagation: g, dragDirectionLock: x, onDirectionLock: _, onDrag: A } = this.getProps();
      if (!g && !this.openDragLock)
        return;
      const { offset: T } = c;
      if (x && this.currentDirection === null) {
        this.currentDirection = QA(T), this.currentDirection !== null && _ && _(this.currentDirection);
        return;
      }
      this.updateAxis("x", c.point, T), this.updateAxis("y", c.point, T), this.visualElement.render(), A && ke.update(() => A(l, c), !1, !0);
    }, m = (l, c) => {
      this.latestPointerEvent = l, this.latestPanInfo = c, this.stop(l, c), this.latestPointerEvent = null, this.latestPanInfo = null;
    }, y = () => {
      const { dragSnapToOrigin: l } = this.getProps();
      (l || this.constraints) && this.startAnimation({ x: 0, y: 0 });
    }, { dragSnapToOrigin: S } = this.getProps();
    this.panSession = new S0(n, {
      onSessionStart: d,
      onStart: f,
      onMove: p,
      onSessionEnd: m,
      resumeAnimation: y
    }, {
      transformPagePoint: this.visualElement.getTransformPagePoint(),
      dragSnapToOrigin: S,
      distanceThreshold: i,
      contextWindow: v0(this.visualElement),
      element: this.visualElement.current
    });
  }
  /**
   * @internal
   */
  stop(n, o) {
    const i = n || this.latestPointerEvent, a = o || this.latestPanInfo, d = this.isDragging;
    if (this.cancel(), !d || !a || !i)
      return;
    const { velocity: f } = a;
    this.startAnimation(f);
    const { onDragEnd: p } = this.getProps();
    p && ke.postRender(() => p(i, a));
  }
  /**
   * @internal
   */
  cancel() {
    this.isDragging = !1;
    const { projection: n, animationState: o } = this.visualElement;
    n && (n.isAnimationBlocked = !1), this.endPanSession();
    const { dragPropagation: i } = this.getProps();
    !i && this.openDragLock && (this.openDragLock(), this.openDragLock = null), o && o.setActive("whileDrag", !1);
  }
  /**
   * Clean up the pan session without modifying other drag state.
   * This is used during unmount to ensure event listeners are removed
   * without affecting projection animations or drag locks.
   * @internal
   */
  endPanSession() {
    this.panSession && this.panSession.end(), this.panSession = void 0;
  }
  updateAxis(n, o, i) {
    const { drag: a } = this.getProps();
    if (!i || !Ys(n, a, this.currentDirection))
      return;
    const d = this.getAxisMotionValue(n);
    let f = this.originPoint[n] + i[n];
    this.constraints && this.constraints[n] && (f = zA(f, this.constraints[n], this.elastic[n])), d.set(f);
  }
  resolveConstraints() {
    var d;
    const { dragConstraints: n, dragElastic: o } = this.getProps(), i = this.visualElement.projection && !this.visualElement.projection.layout ? this.visualElement.projection.measure(!1) : (d = this.visualElement.projection) == null ? void 0 : d.layout, a = this.constraints;
    n && to(n) ? this.constraints || (this.constraints = this.resolveRefConstraints()) : n && i ? this.constraints = BA(i.layoutBox, n) : this.constraints = !1, this.elastic = WA(o), a !== this.constraints && !to(n) && i && this.constraints && !this.hasMutatedConstraints && Jt((f) => {
      this.constraints !== !1 && this.getAxisMotionValue(f) && (this.constraints[f] = HA(i.layoutBox[f], this.constraints[f]));
    });
  }
  resolveRefConstraints() {
    const { dragConstraints: n, onMeasureDragConstraints: o } = this.getProps();
    if (!n || !to(n))
      return !1;
    const i = n.current;
    Tr(i !== null, "If `dragConstraints` is set as a React ref, that ref must be passed to another component's `ref` prop.", "drag-constraints-ref");
    const { projection: a } = this.visualElement;
    if (!a || !a.layout)
      return !1;
    a.root && (a.root.scroll = void 0, a.root.updateScroll());
    const d = QT(i, a.root, this.visualElement.getTransformPagePoint());
    let f = $A(a.layout.layoutBox, d);
    if (o) {
      const p = o(GT(f));
      this.hasMutatedConstraints = !!p, p && (f = $v(p));
    }
    return f;
  }
  startAnimation(n) {
    const { drag: o, dragMomentum: i, dragElastic: a, dragTransition: d, dragSnapToOrigin: f, onDragTransitionEnd: p } = this.getProps(), m = this.constraints || {}, y = Jt((S) => {
      if (!Ys(S, o, this.currentDirection))
        return;
      let l = m && m[S] || {};
      (f === !0 || f === S) && (l = { min: 0, max: 0 });
      const c = a ? 200 : 1e6, g = a ? 40 : 1e7, x = {
        type: "inertia",
        velocity: i ? n[S] : 0,
        bounceStiffness: c,
        bounceDamping: g,
        timeConstant: 750,
        restDelta: 1,
        restSpeed: 10,
        ...d,
        ...l
      };
      return this.startAxisValueAnimation(S, x);
    });
    return Promise.all(y).then(p);
  }
  startAxisValueAnimation(n, o) {
    const i = this.getAxisMotionValue(n);
    return Yc(this.visualElement, n), i.start(Ld(n, i, 0, o, this.visualElement, !1));
  }
  stopAnimation() {
    Jt((n) => this.getAxisMotionValue(n).stop());
  }
  /**
   * Drag works differently depending on which props are provided.
   *
   * - If _dragX and _dragY are provided, we output the gesture delta directly to those motion values.
   * - Otherwise, we apply the delta to the x/y motion values.
   */
  getAxisMotionValue(n) {
    const o = `_drag${n.toUpperCase()}`, a = this.visualElement.getProps()[o];
    return a || this.visualElement.getValue(n, this.visualElement.latestValues[n] ?? 0);
  }
  snapToCursor(n) {
    Jt((o) => {
      const { drag: i } = this.getProps();
      if (!Ys(o, i, this.currentDirection))
        return;
      const { projection: a } = this.visualElement, d = this.getAxisMotionValue(o);
      if (a && a.layout) {
        const { min: f, max: p } = a.layout.layoutBox[o], m = d.get() || 0;
        d.set(n[o] - be(f, p, 0.5) + m);
      }
    });
  }
  /**
   * When the viewport resizes we want to check if the measured constraints
   * have changed and, if so, reposition the element within those new constraints
   * relative to where it was before the resize.
   */
  scalePositionWithinConstraints() {
    if (!this.visualElement.current)
      return;
    const { drag: n, dragConstraints: o } = this.getProps(), { projection: i } = this.visualElement;
    if (!to(o) || !i || !this.constraints)
      return;
    this.stopAnimation();
    const a = { x: 0, y: 0 };
    Jt((f) => {
      const p = this.getAxisMotionValue(f);
      if (p && this.constraints !== !1) {
        const m = p.get();
        a[f] = UA({ min: m, max: m }, this.constraints[f]);
      }
    });
    const { transformTemplate: d } = this.visualElement.getProps();
    this.visualElement.current.style.transform = d ? d({}, "") : "none", i.root && i.root.updateScroll(), i.updateLayout(), this.constraints = !1, this.resolveConstraints(), Jt((f) => {
      if (!Ys(f, n, null))
        return;
      const p = this.getAxisMotionValue(f), { min: m, max: y } = this.constraints[f];
      p.set(be(m, y, a[f]));
    }), this.visualElement.render();
  }
  addListeners() {
    if (!this.visualElement.current)
      return;
    GA.set(this.visualElement, this);
    const n = this.visualElement.current, o = di(n, "pointerdown", (y) => {
      const { drag: S, dragListener: l = !0 } = this.getProps(), c = y.target, g = c !== n && AT(c);
      S && l && !g && this.start(y);
    });
    let i;
    const a = () => {
      const { dragConstraints: y } = this.getProps();
      to(y) && y.current && (this.constraints = this.resolveRefConstraints(), i || (i = YA(n, y.current, () => this.scalePositionWithinConstraints())));
    }, { projection: d } = this.visualElement, f = d.addEventListener("measure", a);
    d && !d.layout && (d.root && d.root.updateScroll(), d.updateLayout()), ke.read(a);
    const p = xi(window, "resize", () => this.scalePositionWithinConstraints()), m = d.addEventListener("didUpdate", (({ delta: y, hasLayoutChanged: S }) => {
      this.isDragging && S && (Jt((l) => {
        const c = this.getAxisMotionValue(l);
        c && (this.originPoint[l] += y[l].translate, c.set(c.get() + y[l].translate));
      }), this.visualElement.render());
    }));
    return () => {
      p(), o(), f(), m && m(), i && i();
    };
  }
  getProps() {
    const n = this.visualElement.getProps(), { drag: o = !1, dragDirectionLock: i = !1, dragPropagation: a = !1, dragConstraints: d = !1, dragElastic: f = rd, dragMomentum: p = !0 } = n;
    return {
      ...n,
      drag: o,
      dragDirectionLock: i,
      dragPropagation: a,
      dragConstraints: d,
      dragElastic: f,
      dragMomentum: p
    };
  }
}
function Ky(e) {
  let n = !0;
  return () => {
    if (n) {
      n = !1;
      return;
    }
    e();
  };
}
function YA(e, n, o) {
  const i = Jh(e, Ky(o)), a = Jh(n, Ky(o));
  return () => {
    i(), a();
  };
}
function Ys(e, n, o) {
  return (n === !0 || n === e) && (o === null || o === e);
}
function QA(e, n = 10) {
  let o = null;
  return Math.abs(e.y) > n ? o = "y" : Math.abs(e.x) > n && (o = "x"), o;
}
class XA extends Qn {
  constructor(n) {
    super(n), this.removeGroupControls = jt, this.removeListeners = jt, this.controls = new KA(n);
  }
  mount() {
    const { dragControls: n } = this.node.getProps();
    n && (this.removeGroupControls = n.subscribe(this.controls)), this.removeListeners = this.controls.addListeners() || jt;
  }
  update() {
    const { dragControls: n } = this.node.getProps(), { dragControls: o } = this.node.prevProps || {};
    n !== o && (this.removeGroupControls(), n && (this.removeGroupControls = n.subscribe(this.controls)));
  }
  unmount() {
    this.removeGroupControls(), this.removeListeners(), this.controls.isDragging || this.controls.endPanSession();
  }
}
const vc = (e) => (n, o) => {
  e && ke.update(() => e(n, o), !1, !0);
};
class ZA extends Qn {
  constructor() {
    super(...arguments), this.removePointerDownListener = jt;
  }
  onPointerDown(n) {
    this.session = new S0(n, this.createPanHandlers(), {
      transformPagePoint: this.node.getTransformPagePoint(),
      contextWindow: v0(this.node)
    });
  }
  createPanHandlers() {
    const { onPanSessionStart: n, onPanStart: o, onPan: i, onPanEnd: a } = this.node.getProps();
    return {
      onSessionStart: vc(n),
      onStart: vc(o),
      onMove: vc(i),
      onEnd: (d, f) => {
        delete this.session, a && ke.postRender(() => a(d, f));
      }
    };
  }
  mount() {
    this.removePointerDownListener = di(this.node.current, "pointerdown", (n) => this.onPointerDown(n));
  }
  update() {
    this.session && this.session.updateHandlers(this.createPanHandlers());
  }
  unmount() {
    this.removePointerDownListener(), this.session && this.session.end();
  }
}
let Sc = !1;
class qA extends C.Component {
  /**
   * This only mounts projection nodes for components that
   * need measuring, we might want to do it for all components
   * in order to incorporate transforms
   */
  componentDidMount() {
    const { visualElement: n, layoutGroup: o, switchLayoutGroup: i, layoutId: a } = this.props, { projection: d } = n;
    d && (o.group && o.group.add(d), i && i.register && a && i.register(d), Sc && d.root.didUpdate(), d.addEventListener("animationComplete", () => {
      this.safeToRemove();
    }), d.setOptions({
      ...d.options,
      layoutDependency: this.props.layoutDependency,
      onExitComplete: () => this.safeToRemove()
    })), pa.hasEverUpdated = !0;
  }
  getSnapshotBeforeUpdate(n) {
    const { layoutDependency: o, visualElement: i, drag: a, isPresent: d } = this.props, { projection: f } = i;
    return f && (f.isPresent = d, n.layoutDependency !== o && f.setOptions({
      ...f.options,
      layoutDependency: o
    }), Sc = !0, a || n.layoutDependency !== o || o === void 0 || n.isPresent !== d ? f.willUpdate() : this.safeToRemove(), n.isPresent !== d && (d ? f.promote() : f.relegate() || ke.postRender(() => {
      const p = f.getStack();
      (!p || !p.members.length) && this.safeToRemove();
    }))), null;
  }
  componentDidUpdate() {
    const { visualElement: n, layoutAnchor: o } = this.props, { projection: i } = n;
    i && (i.options.layoutAnchor = o, i.root.didUpdate(), $d.postRender(() => {
      !i.currentAnimation && i.isLead() && this.safeToRemove();
    }));
  }
  componentWillUnmount() {
    const { visualElement: n, layoutGroup: o, switchLayoutGroup: i } = this.props, { projection: a } = n;
    Sc = !0, a && (a.scheduleCheckAfterUnmount(), o && o.group && o.group.remove(a), i && i.deregister && i.deregister(a));
  }
  safeToRemove() {
    const { safeToRemove: n } = this.props;
    n && n();
  }
  render() {
    return null;
  }
}
function x0(e) {
  const [n, o] = u0(), i = C.useContext(Ad);
  return w.jsx(qA, { ...e, layoutGroup: i, switchLayoutGroup: C.useContext(y0), isPresent: n, safeToRemove: o });
}
const JA = {
  pan: {
    Feature: ZA
  },
  drag: {
    Feature: XA,
    ProjectionNode: l0,
    MeasureLayout: x0
  }
};
function Yy(e, n, o) {
  const { props: i } = e;
  e.animationState && i.whileHover && e.animationState.setActive("whileHover", o === "Start");
  const a = "onHover" + o, d = i[a];
  d && ke.postRender(() => d(n, Ri(n)));
}
class eC extends Qn {
  mount() {
    const { current: n } = this.node;
    n && (this.unmount = xT(n, (o, i) => (Yy(this.node, i, "Start"), (a) => Yy(this.node, a, "End"))));
  }
  unmount() {
  }
}
class tC extends Qn {
  constructor() {
    super(...arguments), this.isActive = !1;
  }
  onFocus() {
    let n = !1;
    try {
      n = this.node.current.matches(":focus-visible");
    } catch {
      n = !0;
    }
    !n || !this.node.animationState || (this.node.animationState.setActive("whileFocus", !0), this.isActive = !0);
  }
  onBlur() {
    !this.isActive || !this.node.animationState || (this.node.animationState.setActive("whileFocus", !1), this.isActive = !1);
  }
  mount() {
    this.unmount = bi(xi(this.node.current, "focus", () => this.onFocus()), xi(this.node.current, "blur", () => this.onBlur()));
  }
  unmount() {
  }
}
function Qy(e, n, o) {
  const { props: i } = e;
  if (e.current instanceof HTMLButtonElement && e.current.disabled)
    return;
  e.animationState && i.whileTap && e.animationState.setActive("whileTap", o === "Start");
  const a = "onTap" + (o === "End" ? "" : o), d = i[a];
  d && ke.postRender(() => d(n, Ri(n)));
}
class nC extends Qn {
  mount() {
    const { current: n } = this.node;
    if (!n)
      return;
    const { globalTapTarget: o, propagate: i } = this.node.props;
    this.unmount = bT(n, (a, d) => (Qy(this.node, d, "Start"), (f, { success: p }) => Qy(this.node, f, p ? "End" : "Cancel")), {
      useGlobalTarget: o,
      stopPropagation: (i == null ? void 0 : i.tap) === !1
    });
  }
  unmount() {
  }
}
const od = /* @__PURE__ */ new WeakMap(), wc = /* @__PURE__ */ new WeakMap(), rC = (e) => {
  const n = od.get(e.target);
  n && n(e);
}, oC = (e) => {
  e.forEach(rC);
};
function iC({ root: e, ...n }) {
  const o = e || document;
  wc.has(o) || wc.set(o, {});
  const i = wc.get(o), a = JSON.stringify(n);
  return i[a] || (i[a] = new IntersectionObserver(oC, { root: e, ...n })), i[a];
}
function sC(e, n, o) {
  const i = iC(n);
  return od.set(e, o), i.observe(e), () => {
    od.delete(e), i.unobserve(e);
  };
}
const aC = {
  some: 0,
  all: 1
};
class lC extends Qn {
  constructor() {
    super(...arguments), this.hasEnteredView = !1, this.isInView = !1;
  }
  startObserver() {
    var m;
    (m = this.stopObserver) == null || m.call(this);
    const { viewport: n = {} } = this.node.getProps(), { root: o, margin: i, amount: a = "some", once: d } = n, f = {
      root: o ? o.current : void 0,
      rootMargin: i,
      threshold: typeof a == "number" ? a : aC[a]
    }, p = (y) => {
      const { isIntersecting: S } = y;
      if (this.isInView === S || (this.isInView = S, d && !S && this.hasEnteredView))
        return;
      S && (this.hasEnteredView = !0), this.node.animationState && this.node.animationState.setActive("whileInView", S);
      const { onViewportEnter: l, onViewportLeave: c } = this.node.getProps(), g = S ? l : c;
      g && g(y);
    };
    this.stopObserver = sC(this.node.current, f, p);
  }
  mount() {
    this.startObserver();
  }
  update() {
    if (typeof IntersectionObserver > "u")
      return;
    const { props: n, prevProps: o } = this.node;
    ["amount", "margin", "root"].some(uC(n, o)) && this.startObserver();
  }
  unmount() {
    var n;
    (n = this.stopObserver) == null || n.call(this), this.hasEnteredView = !1, this.isInView = !1;
  }
}
function uC({ viewport: e = {} }, { viewport: n = {} } = {}) {
  return (o) => e[o] !== n[o];
}
const cC = {
  inView: {
    Feature: lC
  },
  tap: {
    Feature: nC
  },
  focus: {
    Feature: tC
  },
  hover: {
    Feature: eC
  }
}, dC = {
  layout: {
    ProjectionNode: l0,
    MeasureLayout: x0
  }
}, fC = {
  ...IA,
  ...cC,
  ...JA,
  ...dC
}, pC = /* @__PURE__ */ MA(fC, RA);
function Na(e) {
  const n = _r(() => kr(e)), { isStatic: o } = C.useContext(Mi);
  if (o) {
    const [, i] = C.useState(e);
    C.useEffect(() => n.on("change", i), []);
  }
  return n;
}
function _0(e, n) {
  const o = Na(n()), i = () => o.set(n());
  return i(), Wa(() => {
    const a = () => ke.preRender(i, !1, !0), d = e.map((f) => f.on("change", a));
    return () => {
      d.forEach((f) => f()), vn(i);
    };
  }), o;
}
function mC(e) {
  ui.current = [], e();
  const n = _0(ui.current, e);
  return ui.current = void 0, n;
}
function Da(e, n, o, i) {
  if (typeof e == "function")
    return mC(e);
  if (o !== void 0 && !Array.isArray(o) && typeof n != "function")
    return hC(e, n, o, i);
  const f = typeof n == "function" ? n : OT(n, o, i), p = Array.isArray(e) ? Xy(e, f) : Xy([e], ([y]) => f(y)), m = Array.isArray(e) ? void 0 : e.accelerate;
  return m && !m.isTransformed && typeof n != "function" && Array.isArray(o) && (i == null ? void 0 : i.clamp) !== !1 && (p.accelerate = {
    ...m,
    times: n,
    keyframes: o,
    isTransformed: !0
  }), p;
}
function Xy(e, n) {
  const o = _r(() => []);
  return _0(e, () => {
    o.length = 0;
    const i = e.length;
    for (let a = 0; a < i; a++)
      o[a] = e[a].get();
    return n(o);
  });
}
function hC(e, n, o, i) {
  const a = _r(() => Object.keys(o)), d = _r(() => ({}));
  for (const f of a)
    d[f] = Da(e, n, o[f], i);
  return d;
}
function yC(e, n = {}) {
  const { isStatic: o } = C.useContext(Mi), i = () => We(e) ? e.get() : e;
  if (o)
    return Da(i);
  const a = Na(i());
  return C.useInsertionEffect(() => LT(a, e, n), [a, JSON.stringify(n)]), a;
}
function Zy(e, n = {}) {
  return yC(e, { type: "spring", ...n });
}
function gC() {
  !Kd.current && Vv();
  const [e] = C.useState(ba.current);
  return e;
}
const Sn = pC;
function vC(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function T0(e) {
  const n = String(e || "").toLowerCase();
  return n === "127.0.0.1" || n === "localhost" || n === "::1" || n === "[::1]";
}
function qy(e) {
  return T0(e) || vC(e);
}
function SC(e) {
  return !e || T0(e) ? "127.0.0.1" : e;
}
const wC = (() => {
  var S, l, c, g;
  const e = globalThis.window || globalThis, n = globalThis.document || {}, o = e.location || {}, i = String(e.SYNAPSE_DATA_API_PORT || ((l = (S = n.body) == null ? void 0 : S.dataset) == null ? void 0 : l.dataApiPort) || "3001").trim(), { protocol: a = "file:", hostname: d = "127.0.0.1", port: f = "" } = o, p = `http://${SC(d)}:${i || "3001"}`, m = String(e.SYNAPSE_DATA_API_BASE || ((g = (c = n.body) == null ? void 0 : c.dataset) == null ? void 0 : g.dataApiBase) || "").replace(/\/+$/, ""), y = `${a}//${o.host || (f ? `${d}:${f}` : d)}`.replace(/\/+$/, "");
  return m && !(qy(d) && f !== i && m === y) ? m : a === "file:" || qy(d) && f !== i ? p : `${a}//${o.host || d}`;
})(), xC = new Ig(wC), xc = Number((globalThis.window || globalThis).SYNAPSE_DATA_API_TIMEOUT_MS || 6e3), _C = Number.isFinite(xc) && xc > 0 ? xc : 6e3;
function TC(e, n) {
  typeof window > "u" || console.warn(e, n);
}
async function kC(e) {
  var i, a;
  const o = (((a = (i = e.headers) == null ? void 0 : i.get) == null ? void 0 : a.call(i, "content-type")) || "").includes("application/json") ? await e.json() : {};
  if (!e.ok || (o == null ? void 0 : o.ok) === !1)
    throw new Error((o == null ? void 0 : o.error) || `Synapse data API returned HTTP ${e.status}`);
  return o;
}
async function k0(e, n = {}) {
  const o = await xC.fetch(e, {
    timeoutMs: _C,
    ...n
  });
  return kC(o);
}
async function AC(e) {
  try {
    return (await k0("/api/focus-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(e || {})
    })).item || null;
  } catch (n) {
    return TC("Synapse data API focus-session save skipped:", n), null;
  }
}
async function CC(e = 40) {
  const n = await k0(`/api/focus-sessions?limit=${encodeURIComponent(e)}`);
  return Array.isArray(n.items) ? n.items : [];
}
class bC {
  constructor(n = () => globalThis.localStorage) {
    this.storageProvider = n;
  }
  get storage() {
    return this.storageProvider();
  }
  set(n, o) {
    try {
      return this.storage.setItem(n, o), !0;
    } catch (i) {
      return console.warn(`Could not save ${n} to localStorage:`, i), !1;
    }
  }
  get(n, o = "") {
    try {
      const i = this.storage.getItem(n);
      return i === null ? o : i;
    } catch (i) {
      return console.warn(`Could not read ${n} from localStorage:`, i), o;
    }
  }
  remove(n) {
    try {
      return this.storage.removeItem(n), !0;
    } catch (o) {
      return console.warn(`Could not remove ${n} from localStorage:`, o), !1;
    }
  }
  readJSON(n, o) {
    const i = this.get(n, "");
    if (!i) return o;
    try {
      const a = JSON.parse(i);
      return a ?? o;
    } catch (a) {
      return console.warn(`Could not parse ${n} from localStorage:`, a), o;
    }
  }
  writeJSON(n, o) {
    try {
      return this.set(n, JSON.stringify(o));
    } catch (i) {
      return console.warn(`Could not serialize ${n} for localStorage:`, i), !1;
    }
  }
}
const A0 = new bC();
function qd(e, n) {
  return A0.readJSON(e, n);
}
function Jd(e, n) {
  return A0.writeJSON(e, n);
}
const C0 = "synapse.focusRoom.sessions.v1", b0 = "synapse.focusRoom.draft.v1", P0 = "synapse.focusRoom.active-session.v1", ja = 40, Jy = Object.freeze([
  "idle",
  "running",
  "paused",
  "completed",
  "break",
  "restoring"
]), PC = Object.freeze({
  studying: "running",
  running: "running",
  idle: "idle",
  paused: "paused",
  completed: "completed",
  break: "break",
  restoring: "restoring"
});
let id = [];
const dr = (e) => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURI(e)}`, Wn = [
  {
    label: "Deep Focus",
    title: "Chasing Daylight",
    artist: "Scott Buckley",
    streamUrl: "https://www.scottbuckley.com.au/library/wp-content/uploads/2021/03/sb_chasingdaylight.mp3",
    pageUrl: "https://www.scottbuckley.com.au/library/chasing-daylight/",
    license: "CC BY 4.0",
    attribution: "'Chasing Daylight' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au"
  },
  {
    label: "Lo-fi",
    title: "Lofi Hip Hop Upbeat",
    artist: "raspberrymusic",
    streamUrl: dr("Raspberrymusic_-_Lofi_Hip_Hop_Upbeat.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Raspberrymusic_-_Lofi_Hip_Hop_Upbeat.ogg",
    license: "CC BY 4.0",
    attribution: "Raspberrymusic - Lofi Hip Hop Upbeat by raspberrymusic"
  },
  {
    label: "Piano",
    title: "The Long Dark",
    artist: "Scott Buckley",
    streamUrl: "https://www.scottbuckley.com.au/library/wp-content/uploads/2023/01/TheLongDark.mp3",
    pageUrl: "https://www.scottbuckley.com.au/library/the-long-dark/",
    license: "CC BY 4.0",
    attribution: "'The Long Dark' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au"
  },
  {
    label: "Minimal",
    title: "Computations in a Snowstorm",
    artist: "Scott Buckley",
    streamUrl: "https://www.scottbuckley.com.au/library/wp-content/uploads/2019/01/sb_computations_altmix.mp3",
    pageUrl: "https://www.scottbuckley.com.au/library/computations/",
    license: "CC BY 4.0",
    attribution: "'Computations in a Snowstorm' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au"
  }
], fi = Object.freeze([
  {
    id: "soft-piano",
    label: "Soft Piano",
    musicType: "Piano",
    ambientSound: "Nature",
    description: "Gentle keys and light outdoor calm for reading."
  },
  {
    id: "lofi-cafe",
    label: "Lo-fi Café",
    musicType: "Lo-fi",
    ambientSound: "Cafe Rain",
    description: "A steady beat and café rain for writing and exercises."
  },
  {
    id: "nature-flow",
    label: "Nature Flow",
    musicType: "Deep Focus",
    ambientSound: "Nature",
    description: "Restrained music with forest ambience for calm concentration."
  },
  {
    id: "warm-ambience",
    label: "Warm Ambience",
    musicType: "Minimal",
    ambientSound: "Rain",
    description: "Minimal texture and soft rain for evening study."
  },
  {
    id: "deep-focus",
    label: "Deep Focus",
    musicType: "Deep Focus",
    ambientSound: "White Noise",
    description: "A stable focus bed for difficult problem solving."
  }
]);
function EC(e = "") {
  const n = String(e || "");
  return fi.find((o) => o.id === n) || fi[fi.length - 1];
}
function MC(e = {}) {
  return fi.find((n) => n.musicType === String((e == null ? void 0 : e.musicType) || "") && n.ambientSound === String((e == null ? void 0 : e.ambientSound) || "")) || null;
}
const Qe = {
  nature: {
    id: "nature-forest",
    title: "Forest ambience",
    artist: "nille",
    streamUrl: dr("20090610_0_ambience.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:20090610_0_ambience.ogg",
    license: "Public domain",
    attribution: "Forest ambience by nille",
    volumeBias: 1
  },
  cafe: {
    id: "cafe-ambiance",
    title: "Cafe ambiance",
    artist: "Marble Toast",
    streamUrl: dr("Cafe_ambiance.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Cafe_ambiance.ogg",
    license: "CC0",
    attribution: "Cafe ambiance by Marble Toast",
    volumeBias: 0.72
  },
  rain: {
    id: "rain",
    title: "Rain",
    artist: "ezwa",
    streamUrl: dr("Rain_(1).ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Rain_(1).ogg",
    license: "Public domain",
    attribution: "Rain by ezwa",
    volumeBias: 0.48
  },
  whiteNoise: {
    id: "white-noise",
    title: "White noise",
    artist: "Bautsch",
    streamUrl: dr("White.Noise.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:White.Noise.ogg",
    license: "Public domain",
    attribution: "White noise by Bautsch",
    volumeBias: 1
  },
  ocean: {
    id: "ocean-waves",
    title: "Waves",
    artist: "Dsw4",
    streamUrl: dr("Waves.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Waves.ogg",
    license: "CC BY 3.0",
    attribution: "Waves by Dsw4",
    volumeBias: 1
  },
  wind: {
    id: "howling-wind",
    title: "Howling wind",
    artist: "Tvabutzku1234",
    streamUrl: dr("Howling_wind.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Howling_wind.ogg",
    license: "CC0",
    attribution: "Howling wind by Tvabutzku1234",
    volumeBias: 0.78
  }
}, Gn = [
  {
    label: "Nature",
    layers: [Qe.nature],
    pageUrl: Qe.nature.pageUrl,
    license: Qe.nature.license
  },
  {
    label: "Cafe Rain",
    layers: [Qe.cafe, Qe.rain],
    pageUrl: Qe.cafe.pageUrl,
    license: "CC0 / Public domain"
  },
  {
    label: "Rain",
    layers: [Qe.rain],
    pageUrl: Qe.rain.pageUrl,
    license: Qe.rain.license
  },
  {
    label: "White Noise",
    layers: [Qe.whiteNoise],
    pageUrl: Qe.whiteNoise.pageUrl,
    license: Qe.whiteNoise.license
  },
  {
    label: "Ocean",
    layers: [Qe.ocean],
    pageUrl: Qe.ocean.pageUrl,
    license: Qe.ocean.license
  },
  {
    label: "Wind",
    layers: [Qe.wind],
    pageUrl: Qe.wind.pageUrl,
    license: Qe.wind.license
  }
], Yn = [
  {
    id: "morning-window",
    name: "Morning Window",
    kicker: "Morning · Nature",
    description: "Soft daylight, quiet desk, gentle outdoor calm.",
    image: "./assets/focus-room/original/morning-window.jpg",
    motionProfile: "morning-window",
    ambientSound: "Nature",
    musicType: "Piano"
  },
  {
    id: "cabin-twilight",
    name: "Cabin Twilight",
    kicker: "Twilight · Warmth",
    description: "Blue-hour hills and gentle lamp light for a calm study block.",
    image: "./assets/focus-room/original/cabin-twilight.jpg",
    motionProfile: "cabin-twilight",
    ambientSound: "Wind",
    musicType: "Piano"
  },
  {
    id: "last-light-lounge",
    name: "Last Light Lounge",
    kicker: "Rain · Last light",
    description: "A quiet lounge with rain and the final light of day.",
    image: "./assets/focus-room/original/last-light-lounge.jpg",
    motionProfile: "last-light-lounge",
    ambientSound: "Rain",
    musicType: "Minimal"
  },
  {
    id: "garden-cafe",
    name: "Garden Café",
    kicker: "Greenery · Café",
    description: "Soft café ambience among abundant greenery.",
    image: "./assets/focus-room/original/garden-cafe.jpg",
    motionProfile: "garden-cafe",
    ambientSound: "Cafe Rain",
    musicType: "Lo-fi"
  },
  {
    id: "sunset-classroom",
    name: "Sunset Classroom",
    kicker: "Classroom · Sunset",
    description: "An empty classroom in the fading evening light.",
    image: "./assets/focus-room/original/sunset-classroom.jpg",
    motionProfile: "sunset-classroom",
    ambientSound: "Nature",
    musicType: "Piano"
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    kicker: "City · Night",
    description: "A city-night view for steady late study.",
    image: "./assets/focus-room/original/tokyo-night.jpg",
    motionProfile: "tokyo-night",
    ambientSound: "White Noise",
    musicType: "Deep Focus"
  },
  {
    id: "snow-window-cabin",
    name: "Snow Window Cabin",
    kicker: "Snow · Cabin",
    description: "Snow beyond the window, warmth at the desk.",
    image: "./assets/focus-room/original/snow-window-cabin.jpg",
    motionProfile: "snow-window-cabin",
    ambientSound: "Wind",
    musicType: "Minimal"
  },
  {
    id: "bamboo-cabin",
    name: "Bamboo Cabin",
    kicker: "Bamboo · Quiet",
    description: "A bamboo retreat made for quiet concentration.",
    image: "./assets/focus-room/original/bamboo-cabin.jpg",
    motionProfile: "bamboo-cabin",
    ambientSound: "Nature",
    musicType: "Deep Focus"
  }
], RC = Yn, E0 = [25, 45, 50, 90];
function NC(e = "") {
  const n = String(e || "");
  return Wn.find((o) => o.label === n) || Wn[0];
}
function DC(e = "") {
  const n = String(e || "");
  return Gn.find((o) => o.label === n) || Gn[0];
}
function qa(e = {}) {
  const n = NC(e == null ? void 0 : e.musicType), o = DC(e == null ? void 0 : e.ambientSound);
  return {
    musicTrack: n,
    ambientSound: o,
    ambientLayers: o.layers.map((i) => ({
      ...i,
      volumeBias: hn(i.volumeBias, 1)
    }))
  };
}
function jC(e) {
  return e && typeof e == "object" && !Array.isArray(e) ? e : {};
}
function M0(e) {
  return String(e || "").trim();
}
function IC({ material: e, goal: n, durationMinutes: o }) {
  var S;
  const i = Math.max(10, Number(o) || 25), a = (S = e == null ? void 0 : e.studyHeadings) != null && S.length ? e.studyHeadings : ["Key ideas", "Examples", "Practice", "Review"], d = String(n || "").trim() || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`, f = Math.max(1, Math.floor(i * 0.2)), p = Math.max(1, Math.floor(i * 0.4)), m = Math.max(1, Math.floor(i * 0.2)), y = Math.max(1, i - f - p - m);
  return [
    { minutes: f, task: `Set the goal: ${d}` },
    { minutes: p, task: `Review ${a[0] || "the core ideas"}` },
    { minutes: m, task: `Practice with ${a[1] || a[0] || "the generated examples"}` },
    { minutes: y, task: "Summarize mistakes and choose the next study step" }
  ];
}
function R0() {
  return qd(b0, null);
}
function FC(e) {
  return Jd(b0, e || null);
}
function N0(e) {
  if (!e || typeof e != "object")
    return { materials: {} };
  const n = jC(e.materials);
  return {
    ...e,
    materials: { ...n }
  };
}
function lo(e, n = "idle") {
  const o = PC[String(e || "").trim().toLowerCase()];
  return o && Jy.includes(o) ? o : Jy.includes(n) ? n : "idle";
}
function ef(e) {
  return lo(e) === "running" ? "studying" : lo(e);
}
function D0(e = {}, n = {}) {
  const o = e && typeof e == "object" ? e : {}, i = n && typeof n == "object" ? n : {}, a = Object.prototype.hasOwnProperty.call(o, "timerStatus"), d = Object.prototype.hasOwnProperty.call(o, "timerState") || Object.prototype.hasOwnProperty.call(o, "timerPhase"), f = lo(
    d ? o.timerState || o.timerPhase : a ? o.timerStatus : o.status || i.timerState,
    lo(i.timerState || i.timerPhase || i.timerStatus)
  ), p = o.timerMode === "countup" || i.timerMode === "countup" && !Object.prototype.hasOwnProperty.call(o, "timerMode") ? "countup" : "countdown", y = Object.fromEntries(["timerAnchorAtMs", "timerPausedAtMs", "timerUpdatedAtMs", "timerRestoredAtMs"].map((l) => {
    const c = Object.prototype.hasOwnProperty.call(o, l) ? o[l] : i[l], g = Number(c);
    return [l, Number.isFinite(g) && g > 0 ? g : null];
  })), S = Math.max(0, hn(
    Object.prototype.hasOwnProperty.call(o, "elapsedSeconds") ? o.elapsedSeconds : i.elapsedSeconds,
    0
  ));
  return {
    ...i,
    ...o,
    timerState: f,
    timerPhase: f,
    status: f,
    timerStatus: ef(f),
    timerMode: p,
    elapsedSeconds: S,
    ...y
  };
}
function j0() {
  return N0(qd(P0, null));
}
function OC(e) {
  return Jd(P0, N0(e));
}
function I0(e) {
  const n = M0(e);
  if (!n) return null;
  const i = j0().materials[n];
  return i && typeof i == "object" ? D0(i) : null;
}
function tf(e, n) {
  const o = M0(e);
  if (!o) return !1;
  const i = j0();
  return n && typeof n == "object" ? i.materials[o] = {
    ...D0(n, i.materials[o]),
    materialId: o,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  } : delete i.materials[o], OC(i);
}
function ma(e) {
  return tf(e, null);
}
function pi() {
  const e = qd(C0, []), n = Array.isArray(e) ? e : [], o = /* @__PURE__ */ new Set();
  return [...id, ...n].filter((i) => {
    const a = String((i == null ? void 0 : i.sessionId) || "");
    return !a || o.has(a) ? !1 : (o.add(a), !0);
  }).slice(0, ja);
}
async function LC() {
  try {
    const e = await CC(ja);
    if (e.length)
      return e.map((n) => ({
        ...n.metrics,
        ...n,
        sessionId: n.sessionId || n.id,
        persisted: !0
      }));
  } catch (e) {
    console.warn("Synapse data API focus-session read skipped:", e);
  }
  return pi();
}
function hn(e, n) {
  const o = Number(e);
  return Number.isFinite(o) ? o : n;
}
function _i(e = /* @__PURE__ */ new Date(), n = "") {
  const o = e instanceof Date ? e : new Date(e);
  let i = String(n || "").trim() || (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  })(), a = [];
  if (!Number.isNaN(o.getTime()))
    try {
      a = new Intl.DateTimeFormat("en-CA", {
        timeZone: i,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).formatToParts(o);
    } catch {
      i = "UTC", a = new Intl.DateTimeFormat("en-CA", {
        timeZone: i,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).formatToParts(o);
    }
  const d = (p) => {
    var m;
    return ((m = a.find((y) => y.type === p)) == null ? void 0 : m.value) || "";
  }, f = `${d("year")}-${d("month")}-${d("day")}`;
  return {
    focusTrailDate: /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : o.toISOString().slice(0, 10),
    focusTimezone: i
  };
}
function sd(e) {
  const n = String(e || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(n) ? n : "";
}
function VC(e) {
  const n = /* @__PURE__ */ new Date(`${e}T00:00:00.000Z`);
  return n.setUTCDate(n.getUTCDate() - 1), n.toISOString().slice(0, 10);
}
function zC(e = [], n = _i().focusTrailDate) {
  const o = /* @__PURE__ */ new Map();
  for (const f of Array.isArray(e) ? e : []) {
    const p = sd((f == null ? void 0 : f.focusTrailDate) || (f == null ? void 0 : f.focus_trail_date));
    if (!p) continue;
    const m = o.get(p) || { date: p, sessions: 0, seconds: 0 };
    m.sessions += 1, m.seconds += Math.max(0, hn((f == null ? void 0 : f.totalFocusTime) ?? (f == null ? void 0 : f.total_focus_seconds), 0)), o.set(p, m);
  }
  const i = sd(n) || _i().focusTrailDate;
  let a = 0, d = i;
  for (; o.has(d); )
    a += 1, d = VC(d);
  return {
    activeDays: o.size,
    currentStreak: a,
    today: o.get(i) || { date: i, sessions: 0, seconds: 0 },
    days: [...o.values()].sort((f, p) => p.date.localeCompare(f.date))
  };
}
function eg(e = {}) {
  const n = (/* @__PURE__ */ new Date()).toISOString(), o = _i(e.startedAt || n, e.focusTimezone), a = { ...{
    sessionId: e.sessionId || `focus-${Date.now()}`,
    materialId: String(e.materialId || ""),
    materialTitle: e.materialTitle || "Study material",
    studyGoal: e.studyGoal || "",
    status: ["planned", "active", "completed", "cancelled"].includes(e.status) ? e.status : "completed",
    focusTrailDate: sd(e.focusTrailDate) || o.focusTrailDate,
    focusTimezone: String(e.focusTimezone || o.focusTimezone).trim().slice(0, 120),
    selectedScene: e.selectedScene || "morning-window",
    musicType: e.musicType || "Deep Focus",
    ambientSound: e.ambientSound || "Nature",
    musicVolume: hn(e.musicVolume ?? 60, 60),
    ambientVolume: hn(e.ambientVolume ?? 50, 50),
    pomodoroDuration: hn(e.pomodoroDuration || 25, 25),
    startedAt: e.startedAt || n,
    endedAt: Object.prototype.hasOwnProperty.call(e, "endedAt") ? e.endedAt : n,
    totalFocusTime: Math.max(0, hn(e.totalFocusTime || 0, 0)),
    flashcardsCompleted: Math.max(0, hn(e.flashcardsCompleted || 0, 0)),
    quizScore: e.quizScore === null || e.quizScore === void 0 || e.quizScore === "" ? null : Number.isFinite(Number(e.quizScore)) ? Number(e.quizScore) : null,
    mistakesMade: Array.isArray(e.mistakesMade) ? e.mistakesMade : [],
    completedTasks: Array.isArray(e.completedTasks) ? e.completedTasks : [],
    aiReflection: e.aiReflection || "You protected a focused study block and created momentum for the next session.",
    recommendedNextStep: e.recommendedNextStep || "Review the hardest item, then start another short focus block.",
    sessionDate: e.sessionDate || n
  }, persisted: !0 }, d = pi().filter((y) => y.sessionId !== a.sessionId), f = [a, ...d.map((y) => ({ ...y, persisted: !0 }))].slice(0, ja), p = Jd(C0, f), m = { ...a, persisted: p };
  return AC(m).catch((y) => {
    console.warn("Synapse data API focus-session background save failed:", y);
  }), p ? id = [] : id = [m, ...d].slice(0, ja), m;
}
function Ia(e) {
  const n = Math.max(0, hn(e || 0, 0)), o = Math.floor(n / 3600), i = Math.floor(n % 3600 / 60);
  return o ? `${o}h ${i}m` : `${i}m`;
}
const Ce = (e, n, o, i) => Object.freeze({ kind: e, duration: n, intensity: o, density: i }), tg = Object.freeze({
  "morning-window": Object.freeze({
    id: "morning-window",
    layers: Object.freeze([Ce("camera", 32, 0.34, 0.42), Ce("foliage", 18, 0.24, 0.38), Ce("light", 26, 0.2, 0.3)])
  }),
  "cabin-twilight": Object.freeze({
    id: "cabin-twilight",
    layers: Object.freeze([Ce("camera", 38, 0.28, 0.32), Ce("mist", 34, 0.2, 0.35), Ce("light", 22, 0.2, 0.28)])
  }),
  "last-light-lounge": Object.freeze({
    id: "last-light-lounge",
    layers: Object.freeze([Ce("camera", 36, 0.24, 0.3), Ce("rain", 16, 0.28, 0.42), Ce("mist", 32, 0.18, 0.28), Ce("light", 24, 0.18, 0.24)])
  }),
  "garden-cafe": Object.freeze({
    id: "garden-cafe",
    layers: Object.freeze([Ce("camera", 34, 0.26, 0.32), Ce("rain", 14, 0.34, 0.52), Ce("foliage", 20, 0.2, 0.38), Ce("light", 28, 0.18, 0.26)])
  }),
  "sunset-classroom": Object.freeze({
    id: "sunset-classroom",
    layers: Object.freeze([Ce("camera", 40, 0.2, 0.25), Ce("light", 20, 0.3, 0.36), Ce("foliage", 28, 0.14, 0.22)])
  }),
  "tokyo-night": Object.freeze({
    id: "tokyo-night",
    layers: Object.freeze([Ce("camera", 42, 0.2, 0.26), Ce("mist", 36, 0.16, 0.24), Ce("light", 18, 0.24, 0.44)])
  }),
  "snow-window-cabin": Object.freeze({
    id: "snow-window-cabin",
    layers: Object.freeze([Ce("camera", 38, 0.24, 0.28), Ce("snow", 18, 0.34, 0.48), Ce("light", 26, 0.2, 0.28)])
  }),
  "bamboo-cabin": Object.freeze({
    id: "bamboo-cabin",
    layers: Object.freeze([Ce("camera", 36, 0.24, 0.3), Ce("foliage", 16, 0.24, 0.46), Ce("water", 24, 0.2, 0.36), Ce("mist", 32, 0.16, 0.26)])
  })
});
function BC(e = "") {
  return tg[String(e || "")] || tg["morning-window"];
}
var Ng;
const ad = ((Ng = Yn[0]) == null ? void 0 : Ng.id) || "morning-window", io = E0[0] || 25, $C = 10, Ja = 180, nf = 60, F0 = Ja * 60, UC = 0, HC = 100, WC = ["materials", "notes", "sources", "chat", "quiz", "flashcards", "mindmap", "plan", "workspace", "history"], ld = new Set(WC), Fa = {
  type: "spring",
  stiffness: 120,
  damping: 18,
  mass: 0.8
};
function GC(e, n, o, i) {
  const a = Number(e);
  return Number.isFinite(a) ? Math.min(i, Math.max(o, a)) : n;
}
function wr(e, n, o, i) {
  return Math.round(GC(e, n, o, i));
}
function kt(e, n = 50) {
  return wr(e, n, UC, HC);
}
function gr(e, n = io) {
  return wr(e, n, $C, Ja);
}
function nn(e, n = io * 60) {
  return wr(e, n, nf, F0);
}
function Oa(e) {
  return Yn.find((n) => n.id === e) || null;
}
function gn(e = ad) {
  return Oa(e) || Yn[0] || {
    id: ad,
    name: "Focus Room",
    kicker: "Focus",
    description: "A quiet study space.",
    image: "",
    ambientSound: "Nature",
    musicType: "Deep Focus"
  };
}
function O0(e) {
  return Array.isArray(e) ? e.map((n) => ({
    minutes: wr(n == null ? void 0 : n.minutes, 5, 1, Ja),
    task: String((n == null ? void 0 : n.task) || "").trim()
  })).filter((n) => n.task) : [];
}
function si(e) {
  return Array.isArray(e) ? e.map((n) => ({
    role: String((n == null ? void 0 : n.role) || "assistant") === "user" ? "user" : "assistant",
    text: String((n == null ? void 0 : n.text) || "").trim(),
    createdAt: (n == null ? void 0 : n.createdAt) || (/* @__PURE__ */ new Date()).toISOString()
  })).filter((n) => n.text).slice(-24) : [];
}
function L0(e) {
  if (!e || typeof e != "object")
    return { materials: {} };
  if (e.materials && typeof e.materials == "object")
    return {
      ...e,
      materials: { ...e.materials }
    };
  const n = String(e.materialId || "");
  return n ? {
    materials: {
      [n]: e
    }
  } : { materials: {} };
}
function ud(e, n, o) {
  return e ? IC({
    material: e,
    goal: n,
    durationMinutes: o
  }) : [];
}
function Ti(e) {
  const n = gr(e);
  return n > 0 ? n * 60 : 0;
}
function cd(e) {
  const n = Math.max(0, Math.floor(Number(e) || 0)), o = Math.floor(n / 3600), i = Math.floor(n % 3600 / 60), a = n % 60, d = (f) => String(f).padStart(2, "0");
  return o ? `${o}:${d(i)}:${d(a)}` : `${d(i)}:${d(a)}`;
}
function ng(e) {
  const n = (e == null ? void 0 : e.flashcards) || [];
  return Array.isArray(n) ? n.slice(0, 24) : [];
}
function KC(e, n) {
  return String((e == null ? void 0 : e.id) || (e == null ? void 0 : e.front) || (e == null ? void 0 : e.term) || n);
}
function YC(e) {
  var n;
  return Array.isArray(e == null ? void 0 : e.questions) ? e.questions : Array.isArray((n = e == null ? void 0 : e.quiz) == null ? void 0 : n.questions) ? e.quiz.questions : [];
}
function dd(e) {
  return (Array.isArray(e == null ? void 0 : e.quizzes) ? e.quizzes : []).flatMap((o) => YC(o).map((i) => {
    var a;
    return {
      ...i,
      quizTitle: (o == null ? void 0 : o.title) || ((a = o == null ? void 0 : o.quiz) == null ? void 0 : a.title) || "Saved quiz"
    };
  })).slice(0, 12);
}
function QC(e, n) {
  return (e == null ? void 0 : e.question) || (e == null ? void 0 : e.prompt) || (e == null ? void 0 : e.stem) || `Question ${n + 1}`;
}
function rf(e) {
  return String((e == null ? void 0 : e.type) || "").toLowerCase();
}
function XC(e) {
  return String((e == null ? void 0 : e.label) || (e == null ? void 0 : e.text) || e).trim();
}
function La(e) {
  const n = (e == null ? void 0 : e.choices) || (e == null ? void 0 : e.options) || (e == null ? void 0 : e.answers);
  return Array.isArray(n) && n.length ? n.map(XC).filter(Boolean) : rf(e) === "true_false" ? ["True", "False"] : [];
}
function fd(e) {
  const n = (e == null ? void 0 : e.correctOptionIndexes) || (e == null ? void 0 : e.correct_option_indexes) || (e == null ? void 0 : e.correctIndexes);
  return Array.isArray(n) ? n.map((o) => Number(o)).filter(Number.isInteger) : [];
}
function ZC(e, n) {
  const o = Array.isArray(e) ? [...e].map(Number).filter(Number.isInteger).sort((a, d) => a - d) : [], i = Array.isArray(n) ? [...n].map(Number).filter(Number.isInteger).sort((a, d) => a - d) : [];
  return o.length === i.length && o.every((a, d) => a === i[d]);
}
function xr(e) {
  return String(e || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function Va(e, n) {
  if (Number.isInteger(n)) return n;
  const o = Number(n);
  if (typeof n != "string" && Number.isInteger(o)) return o;
  const i = La(e), a = xr(n);
  return i.findIndex((d) => xr(d) === a);
}
function V0(e, n) {
  if (typeof n == "boolean") return n;
  if (n === 0) return !0;
  if (n === 1) return !1;
  const o = La(e), i = xr(n);
  return i === "true" ? !0 : i === "false" ? !1 : xr(o[0]) === i ? !0 : xr(o[1]) === i ? !1 : null;
}
function qC(e, n, o) {
  const i = rf(e);
  if (i === "multiple_choice") {
    const a = Va(e, n);
    if (!Number.isInteger(a) || a < 0) return [];
    const d = Array.isArray(o) ? [...o] : [];
    return d.includes(a) ? d.filter((f) => f !== a) : [...d, a].sort((f, p) => f - p);
  }
  if (i === "single_choice") {
    const a = Va(e, n);
    return Number.isInteger(a) && a >= 0 ? a : "";
  }
  if (i === "true_false") {
    const a = V0(e, n);
    return a === null ? "" : a;
  }
  return String(n || "");
}
function z0(e) {
  const n = (e == null ? void 0 : e.correctAnswer) ?? (e == null ? void 0 : e.correct_answer) ?? (e == null ? void 0 : e.answer) ?? (e == null ? void 0 : e.correct), o = fd(e);
  if (o.length) {
    const i = La(e);
    return o.map((a) => i[a] || "").filter(Boolean).join(", ");
  }
  if (typeof (e == null ? void 0 : e.correctBoolean) == "boolean" || typeof (e == null ? void 0 : e.correct_boolean) == "boolean") {
    const i = La(e);
    return (typeof e.correctBoolean == "boolean" ? e.correctBoolean : e.correct_boolean) ? i[0] || "True" : i[1] || "False";
  }
  return e != null && e.expectedAnswer || e != null && e.expected_answer ? String(e.expectedAnswer || e.expected_answer || "").trim() : Array.isArray(n) ? n.map((i) => String(i)).join(", ") : String(n || "").trim();
}
function JC(e, n) {
  const o = rf(e);
  if (o === "single_choice") {
    const a = fd(e)[0], d = Va(e, n);
    return Number.isInteger(a) ? d === a : null;
  }
  if (o === "multiple_choice") {
    const a = fd(e), d = Array.isArray(n) ? n : [Va(e, n)].filter(Number.isInteger);
    return a.length ? ZC(d, a) : null;
  }
  if (o === "true_false") {
    const a = typeof (e == null ? void 0 : e.correctBoolean) == "boolean" ? e.correctBoolean : e == null ? void 0 : e.correct_boolean, d = V0(e, n);
    return typeof a == "boolean" && d !== null ? d === a : null;
  }
  const i = z0(e);
  return i ? xr(n) === xr(i) : null;
}
function B0(e, n, o) {
  var p;
  const i = String(e || "").trim(), a = String((n == null ? void 0 : n.summaryText) || (n == null ? void 0 : n.aiSummary) || "").slice(0, 420), d = ((p = n == null ? void 0 : n.studyHeadings) == null ? void 0 : p[0]) || (n == null ? void 0 : n.materialTitle) || "this material", f = o || `Study ${(n == null ? void 0 : n.materialTitle) || "this material"}`;
  return i ? [
    `For ${d}: ${a || "use the selected material as your main source."}`,
    `Your current goal is: ${f}.`,
    "Try explaining the idea in one sentence, then test yourself with one example before moving on."
  ].join(" ") : "";
}
function eb() {
  return /* @__PURE__ */ w.jsx("svg", { className: "liquid-glass-filter-defs", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ w.jsx("defs", { children: /* @__PURE__ */ w.jsxs("filter", { id: "liquid-glass-displacement", x: "-12%", y: "-12%", width: "124%", height: "124%", colorInterpolationFilters: "sRGB", children: [
    /* @__PURE__ */ w.jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.012 0.024", numOctaves: "2", seed: "17", result: "liquid-noise" }),
    /* @__PURE__ */ w.jsx("feDisplacementMap", { in: "SourceGraphic", in2: "liquid-noise", scale: "7", xChannelSelector: "R", yChannelSelector: "B", result: "refracted-surface" }),
    /* @__PURE__ */ w.jsx("feColorMatrix", { in: "refracted-surface", type: "matrix", values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.04 0", result: "edge-alpha" }),
    /* @__PURE__ */ w.jsx("feGaussianBlur", { in: "edge-alpha", stdDeviation: "0.25", result: "soft-edge" }),
    /* @__PURE__ */ w.jsx("feBlend", { in: "soft-edge", in2: "refracted-surface", mode: "screen" })
  ] }) }) });
}
function tb({ profile: e, paused: n = !1, reducedMotion: o = !1 }) {
  var a;
  if (o || !((a = e == null ? void 0 : e.layers) != null && a.length)) return null;
  const i = e.layers.filter((d) => d.kind !== "camera");
  return /* @__PURE__ */ w.jsx("div", { className: `scene-motion-layer ${n ? "is-paused" : ""}`.trim(), "aria-hidden": "true", children: i.map((d, f) => /* @__PURE__ */ w.jsx(
    "span",
    {
      className: `scene-motion scene-motion-${d.kind}`,
      style: {
        "--motion-duration": `${d.duration}s`,
        "--motion-intensity": d.intensity,
        "--motion-density": d.density,
        "--motion-delay": `${-f * 3.7}s`
      }
    },
    `${e.id}-${d.kind}-${f}`
  )) });
}
function nb({ scene: e }) {
  const [n, o] = C.useState(e), [i, a] = C.useState(!1), [d, f] = C.useState(!1), [p, m] = C.useState(() => {
    var g;
    return ((g = globalThis.document) == null ? void 0 : g.visibilityState) === "hidden";
  }), [y, S] = C.useState(() => {
    var g, x;
    return ((x = (g = globalThis.matchMedia) == null ? void 0 : g.call(globalThis, "(prefers-reduced-motion: reduce)")) == null ? void 0 : x.matches) || !1;
  });
  C.useEffect(() => {
    a(!1), f(!1);
  }, [n == null ? void 0 : n.id]), C.useEffect(() => {
    if (!(e != null && e.id) || e.id === (n == null ? void 0 : n.id)) return;
    let g = !1;
    const x = new Image();
    return x.onload = () => {
      g || o(e);
    }, x.onerror = () => {
      g || f(!0);
    }, x.src = e.image, () => {
      g = !0, x.onload = null, x.onerror = null;
    };
  }, [n == null ? void 0 : n.id, e]), C.useEffect(() => {
    var x, _;
    const g = () => {
      var A;
      return m(((A = globalThis.document) == null ? void 0 : A.visibilityState) === "hidden");
    };
    return (_ = (x = globalThis.document) == null ? void 0 : x.addEventListener) == null || _.call(x, "visibilitychange", g), () => {
      var A, T;
      return (T = (A = globalThis.document) == null ? void 0 : A.removeEventListener) == null ? void 0 : T.call(A, "visibilitychange", g);
    };
  }, []), C.useEffect(() => {
    var _, A;
    const g = (_ = globalThis.matchMedia) == null ? void 0 : _.call(globalThis, "(prefers-reduced-motion: reduce)");
    if (!g) return;
    const x = (T) => S(!!T.matches);
    return S(!!g.matches), (A = g.addEventListener) == null || A.call(g, "change", x), () => {
      var T;
      return (T = g.removeEventListener) == null ? void 0 : T.call(g, "change", x);
    };
  }, []);
  const l = BC((n == null ? void 0 : n.motionProfile) || (n == null ? void 0 : n.id)), c = l.layers.find((g) => g.kind === "camera");
  return /* @__PURE__ */ w.jsxs("div", { className: "focus-background-wrap", "aria-hidden": "true", children: [
    /* @__PURE__ */ w.jsx(eb, {}),
    /* @__PURE__ */ w.jsx(Xa, { mode: "sync", children: /* @__PURE__ */ w.jsxs(
      Sn.div,
      {
        className: `focus-background ${i && !y ? "has-scene-motion" : ""} ${p ? "is-motion-paused" : ""}`.trim(),
        style: { backgroundImage: d ? "none" : void 0 },
        initial: { opacity: 0, scale: 1.035 },
        animate: { opacity: 1, scale: 1.02 },
        exit: { opacity: 0, scale: 1.015 },
        transition: { duration: 0.8, ease: "easeOut" },
        children: [
          n != null && n.image ? /* @__PURE__ */ w.jsx(
            "img",
            {
              className: `focus-background-media focus-background-poster ${i ? "is-ready" : ""}`.trim(),
              src: n.image,
              alt: "",
              style: { "--scene-camera-duration": `${(c == null ? void 0 : c.duration) || 36}s`, "--scene-camera-intensity": (c == null ? void 0 : c.intensity) || 0.2 },
              onLoad: () => a(!0),
              onError: () => f(!0)
            }
          ) : null,
          n != null && n.video ? /* @__PURE__ */ w.jsx(
            "video",
            {
              className: `focus-background-media focus-background-video ${i ? "is-ready" : ""}`.trim(),
              src: n.video,
              poster: n.image,
              autoPlay: !0,
              muted: !0,
              loop: !0,
              playsInline: !0,
              preload: "metadata",
              onLoadedData: () => a(!0),
              onError: () => f(!0)
            }
          ) : null,
          /* @__PURE__ */ w.jsx(tb, { profile: l, paused: p, reducedMotion: y })
        ]
      },
      (n == null ? void 0 : n.id) || "focus-background"
    ) }),
    /* @__PURE__ */ w.jsx("div", { className: "focus-overlay" }),
    /* @__PURE__ */ w.jsx("div", { className: "focus-vignette" })
  ] });
}
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const rb = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), ob = (e) => e.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (n, o, i) => i ? i.toUpperCase() : o.toLowerCase()
), rg = (e) => {
  const n = ob(e);
  return n.charAt(0).toUpperCase() + n.slice(1);
}, $0 = (...e) => e.filter((n, o, i) => !!n && n.trim() !== "" && i.indexOf(n) === o).join(" ").trim(), ib = (e) => {
  for (const n in e)
    if (n.startsWith("aria-") || n === "role" || n === "title")
      return !0;
};
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var sb = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ab = C.forwardRef(
  ({
    color: e = "currentColor",
    size: n = 24,
    strokeWidth: o = 2,
    absoluteStrokeWidth: i,
    className: a = "",
    children: d,
    iconNode: f,
    ...p
  }, m) => C.createElement(
    "svg",
    {
      ref: m,
      ...sb,
      width: n,
      height: n,
      stroke: e,
      strokeWidth: i ? Number(o) * 24 / Number(n) : o,
      className: $0("lucide", a),
      ...!d && !ib(p) && { "aria-hidden": "true" },
      ...p
    },
    [
      ...f.map(([y, S]) => C.createElement(y, S)),
      ...Array.isArray(d) ? d : [d]
    ]
  )
);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Ae = (e, n) => {
  const o = C.forwardRef(
    ({ className: i, ...a }, d) => C.createElement(ab, {
      ref: d,
      iconNode: n,
      className: $0(
        `lucide-${rb(rg(e))}`,
        `lucide-${e}`,
        i
      ),
      ...a
    })
  );
  return o.displayName = rg(e), o;
};
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const lb = [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
], ub = Ae("arrow-left", lb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const cb = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
], db = Ae("arrow-right", cb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const fb = [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]], el = Ae("check", fb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const pb = [["path", { d: "m15 18-6-6 6-6", key: "1wnfg3" }]], mb = Ae("chevron-left", pb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const hb = [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]], yb = Ae("chevron-right", hb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const gb = [
  ["path", { d: "M10 2v2", key: "7u0qdc" }],
  ["path", { d: "M14 2v2", key: "6buw04" }],
  [
    "path",
    {
      d: "M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1",
      key: "pwadti"
    }
  ],
  ["path", { d: "M6 2v2", key: "colzsn" }]
], vb = Ae("coffee", gb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Sb = [
  ["rect", { width: "12", height: "12", x: "2", y: "10", rx: "2", ry: "2", key: "6agr2n" }],
  [
    "path",
    { d: "m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6", key: "1o487t" }
  ],
  ["path", { d: "M6 18h.01", key: "uhywen" }],
  ["path", { d: "M10 14h.01", key: "ssrbsk" }],
  ["path", { d: "M15 6h.01", key: "cblpky" }],
  ["path", { d: "M18 9h.01", key: "2061c0" }]
], wb = Ae("dices", Sb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const xb = [
  ["path", { d: "M11 20H2", key: "nlcfvz" }],
  [
    "path",
    {
      d: "M11 4.562v16.157a1 1 0 0 0 1.242.97L19 20V5.562a2 2 0 0 0-1.515-1.94l-4-1A2 2 0 0 0 11 4.561z",
      key: "au4z13"
    }
  ],
  ["path", { d: "M11 4H8a2 2 0 0 0-2 2v14", key: "74r1mk" }],
  ["path", { d: "M14 12h.01", key: "1jfl7z" }],
  ["path", { d: "M22 20h-3", key: "vhrsz" }]
], _b = Ae("door-open", xb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Tb = [
  [
    "path",
    {
      d: "M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z",
      key: "1dudjm"
    }
  ],
  [
    "path",
    {
      d: "M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z",
      key: "l2t8xc"
    }
  ],
  ["path", { d: "M16 17h4", key: "1dejxt" }],
  ["path", { d: "M4 13h4", key: "1bwh8b" }]
], of = Ae("footprints", Tb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const kb = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }],
  ["path", { d: "M12 7v5l4 2", key: "1fdv2h" }]
], Ab = Ae("history", kb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Cb = [
  ["path", { d: "m14 10 7-7", key: "oa77jy" }],
  ["path", { d: "M20 10h-6V4", key: "mjg0md" }],
  ["path", { d: "m3 21 7-7", key: "tjx5ai" }],
  ["path", { d: "M4 14h6v6", key: "rmj7iw" }]
], bb = Ae("minimize-2", Cb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Pb = [
  ["circle", { cx: "8", cy: "18", r: "4", key: "1fc0mg" }],
  ["path", { d: "M12 18V2l7 4", key: "g04rme" }]
], Eb = Ae("music-2", Pb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Mb = [
  ["rect", { x: "14", y: "4", width: "4", height: "16", rx: "1", key: "zuxfzm" }],
  ["rect", { x: "6", y: "4", width: "4", height: "16", rx: "1", key: "1okwgv" }]
], pd = Ae("pause", Mb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Rb = [
  [
    "path",
    {
      d: "M18.5 8c-1.4 0-2.6-.8-3.2-2A6.87 6.87 0 0 0 2 9v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.5C22 9.6 20.4 8 18.5 8",
      key: "lag0yf"
    }
  ],
  ["path", { d: "M2 14h20", key: "myj16y" }],
  ["path", { d: "M6 14v4", key: "9ng0ue" }],
  ["path", { d: "M10 14v4", key: "1v8uk5" }],
  ["path", { d: "M14 14v4", key: "1tqops" }],
  ["path", { d: "M18 14v4", key: "18uqwm" }]
], Nb = Ae("piano", Rb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Db = [["polygon", { points: "6 3 20 12 6 21 6 3", key: "1oa8hb" }]], U0 = Ae("play", Db);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const jb = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
], Ib = Ae("plus", jb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Fb = [
  ["path", { d: "M4.9 19.1C1 15.2 1 8.8 4.9 4.9", key: "1vaf9d" }],
  ["path", { d: "M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5", key: "u1ii0m" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }],
  ["path", { d: "M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5", key: "1j5fej" }],
  ["path", { d: "M19.1 4.9C23 8.8 23 15.1 19.1 19", key: "10b0cb" }]
], Ob = Ae("radio", Fb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Lb = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
], H0 = Ae("rotate-ccw", Lb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Vb = [
  [
    "path",
    {
      d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
      key: "1c8476"
    }
  ],
  ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7", key: "1ydtos" }],
  ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7", key: "t51u73" }]
], W0 = Ae("save", Vb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const zb = [
  ["path", { d: "M14 17H5", key: "gfn3mx" }],
  ["path", { d: "M19 7h-9", key: "6i9tg" }],
  ["circle", { cx: "17", cy: "17", r: "3", key: "18b49y" }],
  ["circle", { cx: "7", cy: "7", r: "3", key: "dfmy0x" }]
], G0 = Ae("settings-2", zb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Bb = [
  ["path", { d: "m18 14 4 4-4 4", key: "10pe0f" }],
  ["path", { d: "m18 2 4 4-4 4", key: "pucp1d" }],
  ["path", { d: "M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22", key: "1ailkh" }],
  ["path", { d: "M2 6h1.972a4 4 0 0 1 3.6 2.2", key: "km57vx" }],
  ["path", { d: "M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45", key: "os18l9" }]
], $b = Ae("shuffle", Bb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Ub = [
  ["polygon", { points: "5 4 15 12 5 20 5 4", key: "16p6eg" }],
  ["line", { x1: "19", x2: "19", y1: "5", y2: "19", key: "futhcm" }]
], K0 = Ae("skip-forward", Ub);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Hb = [
  ["line", { x1: "21", x2: "14", y1: "4", y2: "4", key: "obuewd" }],
  ["line", { x1: "10", x2: "3", y1: "4", y2: "4", key: "1q6298" }],
  ["line", { x1: "21", x2: "12", y1: "12", y2: "12", key: "1iu8h1" }],
  ["line", { x1: "8", x2: "3", y1: "12", y2: "12", key: "ntss68" }],
  ["line", { x1: "21", x2: "16", y1: "20", y2: "20", key: "14d8ph" }],
  ["line", { x1: "12", x2: "3", y1: "20", y2: "20", key: "m0wm8r" }],
  ["line", { x1: "14", x2: "14", y1: "2", y2: "6", key: "14e1ph" }],
  ["line", { x1: "8", x2: "8", y1: "10", y2: "14", key: "1i6ji0" }],
  ["line", { x1: "16", x2: "16", y1: "18", y2: "22", key: "1lctlv" }]
], Wb = Ae("sliders-horizontal", Hb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Gb = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["circle", { cx: "12", cy: "12", r: "6", key: "1vlfrh" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }]
], Kb = Ae("target", Gb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Yb = [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
], Qb = Ae("trash-2", Yb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Xb = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744", key: "16gr8j" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }]
], za = Ae("users", Xb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Zb = [
  [
    "path",
    {
      d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
      key: "uqj9uw"
    }
  ],
  ["path", { d: "M16 9a5 5 0 0 1 0 6", key: "1q6k2b" }],
  ["path", { d: "M19.364 18.364a9 9 0 0 0 0-12.728", key: "ijwkga" }]
], tl = Ae("volume-2", Zb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const qb = [
  [
    "path",
    {
      d: "M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
      key: "knzxuh"
    }
  ],
  [
    "path",
    {
      d: "M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
      key: "2jd2cc"
    }
  ],
  [
    "path",
    {
      d: "M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
      key: "rd2r6e"
    }
  ]
], sf = Ae("waves", qb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Jb = [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
], Y0 = Ae("x", Jb), og = (e) => {
  let n;
  const o = /* @__PURE__ */ new Set(), i = (y, S) => {
    const l = typeof y == "function" ? y(n) : y;
    if (!Object.is(l, n)) {
      const c = n;
      n = S ?? (typeof l != "object" || l === null) ? l : Object.assign({}, n, l), o.forEach((g) => g(n, c));
    }
  }, a = () => n, p = { setState: i, getState: a, getInitialState: () => m, subscribe: (y) => (o.add(y), () => o.delete(y)) }, m = n = e(i, a, p);
  return p;
}, eP = ((e) => e ? og(e) : og), tP = (e) => e;
function nP(e, n = tP) {
  const o = yn.useSyncExternalStore(
    e.subscribe,
    yn.useCallback(() => n(e.getState()), [e, n]),
    yn.useCallback(() => n(e.getInitialState()), [e, n])
  );
  return yn.useDebugValue(o), o;
}
const ig = (e) => {
  const n = eP(e), o = (i) => nP(n, i);
  return Object.assign(o, n), o;
}, rP = ((e) => e ? ig(e) : ig), oP = /* @__PURE__ */ new Set(["pending", "active", "done"]);
function Q0() {
  return `topic-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function Ba(e = {}, n = "pending") {
  const o = String(e.title || e.name || "").trim(), i = String(e.description || e.detail || e.notes || "").trim(), a = oP.has(e.status) ? e.status : n;
  return {
    id: String(e.id || "").trim() || Q0(),
    title: o || "Untitled topic",
    description: i,
    status: a
  };
}
function fr(e, n = "Deep work block") {
  const o = Array.isArray(e) ? e.map((f) => Ba(f)).filter(Boolean) : [];
  if (!o.length) {
    const f = Ba({
      title: String(n || "Deep work block").trim() || "Deep work block",
      description: "",
      status: "active"
    }, "active");
    return { focusTopics: [f], activeTopicId: f.id, studyGoal: f.title };
  }
  let i = "";
  const a = o.map((f, p) => f.status === "active" && !i ? (i = f.id, f) : f.status === "active" && i ? { ...f, status: "pending" } : f);
  if (!i) {
    const f = a.find((p) => p.status !== "done") || a[0];
    return i = f.id, {
      focusTopics: a.map((p) => p.id === i ? { ...p, status: "active" } : p.status === "active" ? { ...p, status: "pending" } : p),
      activeTopicId: i,
      studyGoal: f.title
    };
  }
  const d = a.find((f) => f.id === i) || a[0];
  return {
    focusTopics: a,
    activeTopicId: i,
    studyGoal: (d == null ? void 0 : d.title) || String(n || "Deep work block")
  };
}
function af(e = [], n = "") {
  const o = Array.isArray(e) ? e : [];
  return o.find((i) => i.id === n) || o.find((i) => i.status === "active") || o.find((i) => i.status !== "done") || o[0] || null;
}
function _c(e = [], n = "") {
  var d;
  const o = Array.isArray(e) ? e.map((f) => ({ ...f })) : [];
  if (!o.length)
    return fr([], "Deep work block");
  const i = n ? o.find((f) => f.id === n && f.status !== "done") : o.find((f) => f.status === "pending") || o.find((f) => f.status !== "done");
  return i ? {
    focusTopics: o.map((f) => f.id === i.id ? { ...f, status: "active" } : f.status === "active" ? { ...f, status: "pending" } : f),
    activeTopicId: i.id,
    studyGoal: i.title
  } : {
    focusTopics: o,
    activeTopicId: "",
    studyGoal: ((d = o[o.length - 1]) == null ? void 0 : d.title) || "Deep work block"
  };
}
function iP(e, n, o) {
  return B0(e, n, o);
}
async function sP({
  question: e,
  chatHistory: n = [],
  material: o = null,
  assistantContext: i = {},
  studyGoal: a = "",
  apiClient: d = globalThis.apiClient,
  preferredLanguage: f = ((p) => (p = globalThis.preferredLanguage) == null ? void 0 : p.value)() || "auto"
} = {}) {
  var S;
  if (!d || typeof d.fetch != "function")
    return {
      answer: iP(e, o, a),
      offline: !0
    };
  const m = await d.fetch("/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: e,
      selected_section: i.sectionTitle || ((S = o == null ? void 0 : o.studyHeadings) == null ? void 0 : S[0]) || "",
      selected_excerpt: i.excerpt || "",
      source_strict: !!(o != null && o.isSourceRestricted),
      preferred_language: f,
      title: (o == null ? void 0 : o.materialTitle) || "Study material",
      summary: (o == null ? void 0 : o.aiSummary) || (o == null ? void 0 : o.summaryText) || "",
      sections: (o == null ? void 0 : o.sections) || {},
      source_identity: (o == null ? void 0 : o.materialId) || "",
      source_fingerprint: (o == null ? void 0 : o.sourceFingerprint) || "",
      chat_history: n
    })
  });
  let y = null;
  try {
    y = await m.json();
  } catch {
    throw new Error("Backend returned non-JSON response.");
  }
  if (!m.ok || y != null && y.error)
    throw new Error((y == null ? void 0 : y.error) || "AI request failed.");
  return {
    answer: (y == null ? void 0 : y.answer) || "No answer returned.",
    usedExternalResearch: !!(y != null && y.used_external_research),
    researchSources: Array.isArray(y == null ? void 0 : y.research_sources) ? y.research_sources : []
  };
}
const mi = Object.freeze({
  "white-noise": 0,
  "pink-noise": 0,
  "brown-noise": 0,
  "light-rain": 24,
  "heavy-rain": 0,
  "ocean-waves": 0,
  wind: 0,
  fireplace: 0,
  train: 0,
  cafe: 0,
  street: 0,
  forest: 0,
  "summer-night": 0,
  waterfall: 0,
  typing: 0,
  "page-turning": 0,
  writing: 0
});
function aP() {
  return Yn[0] || gn(ad);
}
function md(e) {
  const n = String(e || "");
  if (!n) return null;
  const i = L0(R0()).materials[n];
  return i && typeof i == "object" ? i : null;
}
function rt(e) {
  var i;
  const n = String(e.selectedMaterialId || ((i = e.selectedMaterial) == null ? void 0 : i.materialId) || "");
  if (!n) return;
  const o = L0(R0());
  o.materials[n] = {
    materialId: n,
    selectedScene: e.selectedScene,
    musicType: e.musicType,
    ambientSound: e.ambientSound,
    musicVolume: kt(e.musicVolume),
    ambientVolume: kt(e.ambientVolume),
    audioChannels: { ...mi, ...e.audioChannels || {} },
    durationMinutes: gr(e.pomodoroDuration),
    durationSeconds: nn(e.pomodoroDurationSeconds, Ti(e.pomodoroDuration)),
    studyGoal: e.studyGoal,
    focusTopics: Array.isArray(e.focusTopics) ? e.focusTopics : [],
    activeTopicId: String(e.activeTopicId || ""),
    studyPlan: O0(e.studyPlan),
    completedTasks: Array.isArray(e.completedTasks) ? e.completedTasks.filter(Boolean) : [],
    workspaceNotes: String(e.workspaceNotes || ""),
    workspaceUpdatedAt: e.workspaceUpdatedAt || "",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }, FC(o);
}
function lP(e) {
  return Array.isArray(e == null ? void 0 : e.completedTasks) ? e.completedTasks.map((n) => String(n || "").trim()).filter(Boolean) : [];
}
function hd(e = {}) {
  return {
    sectionTitle: String(e.sectionTitle || "").trim(),
    excerpt: String(e.excerpt || "").trim().slice(0, 1800)
  };
}
function X0(e = null) {
  return !e || typeof e != "object" ? null : {
    id: String(e.id || "").trim(),
    title: String(e.title || "").trim(),
    excerpt: String(e.excerpt || "").trim().slice(0, 1800),
    sourceId: String(e.sourceId || e.source_id || "").trim(),
    sourceIndex: Number(e.sourceIndex || e.source_index || 0) || 0,
    sourceLabel: String(e.sourceLabel || e.source_label || "").trim(),
    sourceKind: String(e.sourceKind || e.source_kind || "").trim(),
    sectionTitle: String(e.sectionTitle || e.section_title || "").trim(),
    kind: String(e.kind || "evidence").trim()
  };
}
function ot() {
  const e = Date.now();
  return Number.isFinite(e) ? e : 0;
}
function Ht(e = {}) {
  return lo(e.timerState || e.timerPhase || e.status || e.timerStatus);
}
function mr(e = {}) {
  const n = Number(e.pomodoroDurationSeconds);
  return Number.isFinite(n) && n > 0 ? nn(n, Ti(e.pomodoroDuration)) : Ti(e.pomodoroDuration);
}
function Un(e = {}) {
  if (e.timerMode === "countup") return 0;
  const n = Number(e.timerDurationSeconds);
  return Number.isFinite(n) && n > 0 ? n : mr(e);
}
function $a(e = {}, n = ot()) {
  const o = Math.max(0, Number(e.elapsedSeconds) || 0);
  if (Ht(e) !== "running") return o;
  const i = Number(e.timerAnchorAtMs);
  return !Number.isFinite(i) || i <= 0 ? o : Math.max(o, Math.floor(Math.max(0, n - i) / 1e3));
}
function Rt(e, n = ot()) {
  const o = lo(e);
  return {
    timerState: o,
    timerPhase: o,
    status: o,
    timerStatus: ef(o),
    timerUpdatedAtMs: n
  };
}
function uP(e = {}) {
  const n = Ht(e);
  return {
    timerState: n,
    timerPhase: n,
    status: n,
    timerStatus: ef(n),
    timerMode: e.timerMode === "countup" ? "countup" : "countdown",
    timerAnchorAtMs: Number.isFinite(Number(e.timerAnchorAtMs)) ? Number(e.timerAnchorAtMs) : null,
    timerPausedAtMs: Number.isFinite(Number(e.timerPausedAtMs)) ? Number(e.timerPausedAtMs) : null,
    timerUpdatedAtMs: Number.isFinite(Number(e.timerUpdatedAtMs)) ? Number(e.timerUpdatedAtMs) : null,
    timerRestoredAtMs: Number.isFinite(Number(e.timerRestoredAtMs)) ? Number(e.timerRestoredAtMs) : null,
    timerDurationSeconds: Un(e),
    pomodoroDuration: e.pomodoroDuration,
    pomodoroDurationSeconds: mr(e),
    elapsedSeconds: Math.max(0, Number(e.elapsedSeconds) || 0),
    startedAt: e.startedAt || null,
    currentSession: e.currentSession || null,
    view: e.view
  };
}
function Vn(e) {
  var o;
  const n = String(e.selectedMaterialId || ((o = e.selectedMaterial) == null ? void 0 : o.materialId) || "");
  return !n || e.view !== "session" ? !1 : tf(n, uP(e));
}
function sg(e, n = ot()) {
  const o = $a(e, n), i = Un(e), a = e.timerMode !== "countup" && i > 0 && o >= i, d = a ? "completed" : Ht(e);
  return {
    ...Rt(d, n),
    elapsedSeconds: a ? i : o,
    timerAnchorAtMs: d === "running" ? e.timerAnchorAtMs : null,
    timerPausedAtMs: d === "running" ? null : e.timerPausedAtMs || n,
    audioPlaying: d === "running" ? e.audioPlaying : !1
  };
}
function cP(e, n = {}) {
  const o = gn(n.selectedScene), i = md(e == null ? void 0 : e.materialId), a = Oa(i == null ? void 0 : i.selectedScene) ? i.selectedScene : o.id, d = gn(a), f = String((i == null ? void 0 : i.musicType) || d.musicType || "Deep Focus"), p = String((i == null ? void 0 : i.ambientSound) || d.ambientSound || "Nature"), m = kt(i == null ? void 0 : i.musicVolume, n.musicVolume ?? 60), y = kt(i == null ? void 0 : i.ambientVolume, n.ambientVolume ?? 50), S = gr(i == null ? void 0 : i.durationMinutes, n.pomodoroDuration ?? io), l = nn(
    i == null ? void 0 : i.durationSeconds,
    n.pomodoroDurationSeconds ?? S * 60
  ), c = String((i == null ? void 0 : i.studyGoal) || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`), g = O0(i == null ? void 0 : i.studyPlan), x = g.length ? g : ud(e, c, S), _ = lP(i), A = String((i == null ? void 0 : i.workspaceNotes) || ""), T = (i == null ? void 0 : i.workspaceUpdatedAt) || (i == null ? void 0 : i.updatedAt) || "";
  return {
    selectedScene: a,
    musicType: f,
    ambientSound: p,
    musicVolume: m,
    ambientVolume: y,
    audioChannels: { ...mi, ...(i == null ? void 0 : i.audioChannels) || n.audioChannels || {} },
    pomodoroDuration: S,
    pomodoroDurationSeconds: l,
    studyGoal: c,
    studyPlan: x,
    completedTasks: _,
    workspaceNotes: A,
    workspaceUpdatedAt: T
  };
}
function ag(e) {
  const n = I0(e);
  if (!n || typeof n != "object") return null;
  const o = Ht(n), i = ot(), a = Number(n.timerAnchorAtMs), d = Date.parse(n.startedAt || ""), f = Number.isFinite(d) ? d : NaN, p = o === "running" ? $a({
    ...n,
    timerState: "running",
    timerAnchorAtMs: Number.isFinite(a) && a > 0 ? a : f
  }, i) : Math.max(0, Number(n.elapsedSeconds) || 0), m = Un(n), y = o === "running" ? m > 0 && p >= m ? "completed" : "paused" : o, S = o === "running";
  return {
    route: n.view === "session" ? "session" : "setup",
    view: n.view === "session" ? "session" : "setup",
    ...Rt(S ? "restoring" : y, i),
    timerRestoreTarget: S ? y : null,
    timerMode: n.timerMode === "countup" ? "countup" : "countdown",
    timerAnchorAtMs: null,
    timerPausedAtMs: S ? null : Number(n.timerPausedAtMs) || null,
    timerRestoredAtMs: S ? null : i,
    timerDurationSeconds: m,
    ...Number(n.pomodoroDurationSeconds) > 0 ? { pomodoroDurationSeconds: nn(n.pomodoroDurationSeconds) } : {},
    elapsedSeconds: m > 0 ? Math.min(m, p) : p,
    startedAt: n.startedAt || null,
    currentSession: n.currentSession || null,
    completedTasks: Array.isArray(n.completedTasks) ? n.completedTasks.filter(Boolean) : [],
    flashcardIndex: Math.max(0, Number(n.flashcardIndex) || 0),
    flashcardSide: n.flashcardSide === "back" ? "back" : "front",
    flashcardProgress: n.flashcardProgress && typeof n.flashcardProgress == "object" && !Array.isArray(n.flashcardProgress) ? n.flashcardProgress : {},
    quizAnswers: n.quizAnswers && typeof n.quizAnswers == "object" && !Array.isArray(n.quizAnswers) ? n.quizAnswers : {},
    quizChecked: n.quizChecked && typeof n.quizChecked == "object" && !Array.isArray(n.quizChecked) ? n.quizChecked : {},
    chatMessages: si(n.chatMessages),
    chatPending: !1,
    chatError: "",
    panelTab: ld.has(n.panelTab) ? n.panelTab : "materials",
    workspaceNotes: String(n.workspaceNotes || ""),
    workspaceUpdatedAt: n.workspaceUpdatedAt || n.updatedAt || "",
    activeNoteSection: String(n.activeNoteSection || ""),
    activeSourceHighlight: X0(n.activeSourceHighlight),
    assistantContext: hd(n.assistantContext),
    audioPlaying: !1
  };
}
function Qs() {
  return {
    completedTasks: [],
    flashcardIndex: 0,
    flashcardSide: "front",
    flashcardProgress: {},
    quizAnswers: {},
    quizChecked: {}
  };
}
function dP(e) {
  return Object.values(e.flashcardProgress || {}).filter((n) => n && n.difficulty).length;
}
function fP(e) {
  const n = Object.values(e.quizChecked || {}).filter((i) => i && i.hasKnownAnswer);
  if (!n.length) return null;
  const o = n.filter((i) => i.correct).length;
  return Math.round(o / n.length * 100);
}
function pP(e) {
  const n = dd(e.selectedMaterial);
  return Object.entries(e.quizChecked || {}).filter(([, o]) => o && o.hasKnownAnswer && !o.correct).map(([o]) => QC(n[Number(o)], Number(o))).filter(Boolean);
}
const Y = rP((e, n) => {
  const o = aP(), i = md("focus-room"), a = Oa(i == null ? void 0 : i.selectedScene) ? gn(i.selectedScene) : o, d = gr(i == null ? void 0 : i.durationMinutes, io), f = nn(
    i == null ? void 0 : i.durationSeconds,
    Ti(d)
  );
  return {
    route: "setup",
    view: "setup",
    materials: [],
    materialsStatus: "idle",
    materialsError: "",
    selectedMaterialId: "focus-room",
    selectedMaterial: null,
    selectedScene: a.id,
    musicType: String((i == null ? void 0 : i.musicType) || a.musicType || "Deep Focus"),
    ambientSound: String((i == null ? void 0 : i.ambientSound) || a.ambientSound || "Nature"),
    musicVolume: kt(i == null ? void 0 : i.musicVolume, 60),
    ambientVolume: kt(i == null ? void 0 : i.ambientVolume, 50),
    audioChannels: { ...mi, ...(i == null ? void 0 : i.audioChannels) || {} },
    pomodoroDuration: d,
    pomodoroDurationSeconds: f,
    timerStatus: "idle",
    timerState: "idle",
    timerPhase: "idle",
    status: "idle",
    timerRestoreTarget: null,
    timerMode: "countdown",
    timerAnchorAtMs: null,
    timerPausedAtMs: null,
    timerUpdatedAtMs: null,
    timerRestoredAtMs: null,
    timerDurationSeconds: f,
    ...fr(i == null ? void 0 : i.focusTopics, (i == null ? void 0 : i.studyGoal) || "Deep work block"),
    studyPlan: [],
    aiPanelOpen: !1,
    isIdle: !1,
    currentSession: null,
    sessionHistory: [],
    activeDrawer: "",
    audioPlaying: !1,
    elapsedSeconds: 0,
    startedAt: null,
    panelTab: "materials",
    summaryRecord: null,
    completedTasks: [],
    flashcardIndex: 0,
    flashcardSide: "front",
    flashcardProgress: {},
    quizAnswers: {},
    quizChecked: {},
    workspaceNotes: String((i == null ? void 0 : i.workspaceNotes) || ""),
    workspaceUpdatedAt: (i == null ? void 0 : i.workspaceUpdatedAt) || "",
    activeNoteSection: "",
    activeSourceHighlight: null,
    assistantContext: { sectionTitle: "", excerpt: "" },
    chatMessages: [],
    chatPending: !1,
    chatError: "",
    setIdle: (p) => e({ isIdle: p }),
    initializeFocusRoom() {
      const p = n(), m = I0("focus-room"), y = ag("focus-room"), S = Ht(m || {});
      if (!!((y == null ? void 0 : y.view) === "session" && y.currentSession && S === "running")) {
        const A = gn((m == null ? void 0 : m.selectedScene) || p.selectedScene);
        e({
          selectedMaterialId: "focus-room",
          selectedMaterial: null,
          studyPlan: Array.isArray(m == null ? void 0 : m.studyPlan) ? m.studyPlan : [],
          selectedScene: A.id,
          musicType: (m == null ? void 0 : m.musicType) || p.musicType,
          ambientSound: (m == null ? void 0 : m.ambientSound) || p.ambientSound,
          musicVolume: kt(m == null ? void 0 : m.musicVolume, p.musicVolume),
          ambientVolume: kt(m == null ? void 0 : m.ambientVolume, p.ambientVolume),
          audioChannels: { ...mi, ...(m == null ? void 0 : m.audioChannels) || p.audioChannels || {} },
          pomodoroDuration: gr(m == null ? void 0 : m.pomodoroDuration, p.pomodoroDuration),
          pomodoroDurationSeconds: nn(
            m == null ? void 0 : m.pomodoroDurationSeconds,
            p.pomodoroDurationSeconds
          ),
          ...fr(
            (m == null ? void 0 : m.focusTopics) || p.focusTopics,
            (m == null ? void 0 : m.studyGoal) || p.studyGoal || "Deep work block"
          ),
          summaryRecord: null,
          ...y,
          route: "session",
          view: "session"
        });
        return;
      }
      ma("focus-room");
      const c = md("focus-room"), g = gn((c == null ? void 0 : c.selectedScene) || p.selectedScene), x = gr(c == null ? void 0 : c.durationMinutes, p.pomodoroDuration || io), _ = nn(
        c == null ? void 0 : c.durationSeconds,
        p.pomodoroDurationSeconds || Ti(x)
      );
      e({
        route: "setup",
        view: "setup",
        selectedMaterialId: "focus-room",
        selectedMaterial: null,
        selectedScene: g.id,
        musicType: String((c == null ? void 0 : c.musicType) || g.musicType || p.musicType || "Deep Focus"),
        ambientSound: String((c == null ? void 0 : c.ambientSound) || g.ambientSound || p.ambientSound || "Nature"),
        musicVolume: kt(c == null ? void 0 : c.musicVolume, p.musicVolume ?? 60),
        ambientVolume: kt(c == null ? void 0 : c.ambientVolume, p.ambientVolume ?? 50),
        audioChannels: { ...mi, ...(c == null ? void 0 : c.audioChannels) || p.audioChannels || {} },
        pomodoroDuration: x,
        pomodoroDurationSeconds: _,
        timerDurationSeconds: _,
        ...fr(
          (c == null ? void 0 : c.focusTopics) || p.focusTopics,
          (c == null ? void 0 : c.studyGoal) || p.studyGoal || "Deep work block"
        ),
        studyPlan: [],
        completedTasks: [],
        currentSession: null,
        summaryRecord: null,
        audioPlaying: !1,
        elapsedSeconds: 0,
        startedAt: null,
        ...Rt("idle", ot()),
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        workspaceNotes: String((c == null ? void 0 : c.workspaceNotes) || p.workspaceNotes || ""),
        workspaceUpdatedAt: (c == null ? void 0 : c.workspaceUpdatedAt) || p.workspaceUpdatedAt || ""
      });
    },
    returnToSetup() {
      const p = n();
      rt(p), ma("focus-room"), e({
        route: "setup",
        view: "setup",
        currentSession: null,
        summaryRecord: null,
        audioPlaying: !1,
        aiPanelOpen: !1,
        activeDrawer: "",
        elapsedSeconds: 0,
        startedAt: null,
        ...Rt("idle", ot()),
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        timerDurationSeconds: mr(p)
      });
    },
    setMaterialsState({ items: p = [], status: m = "ready", error: y = "" } = {}) {
      e({
        materials: Array.isArray(p) ? p : [],
        materialsStatus: m === "error" ? "error" : m === "loading" ? "loading" : "ready",
        materialsError: String(y || "")
      });
    },
    hydrateFocusRoute(p, m, { preserveSession: y = !1 } = {}) {
      const S = n(), l = !!m, c = l ? m.materialId : String(p.materialId || "");
      if (!l) {
        e({
          route: "setup",
          view: "setup",
          selectedMaterialId: c,
          selectedMaterial: null,
          aiPanelOpen: !1,
          activeDrawer: "",
          summaryRecord: null,
          studyPlan: [],
          workspaceNotes: "",
          workspaceUpdatedAt: "",
          activeNoteSection: "",
          activeSourceHighlight: null,
          assistantContext: { sectionTitle: "", excerpt: "" }
        });
        return;
      }
      const g = S.selectedMaterialId === c, x = g && y ? null : ag(c), _ = g && y ? {} : cP(m, S), A = g && y ? {} : {
        timerStatus: "idle",
        timerState: "idle",
        timerPhase: "idle",
        status: "idle",
        timerRestoreTarget: null,
        timerMode: "countdown",
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerUpdatedAtMs: null,
        timerRestoredAtMs: null,
        timerDurationSeconds: mr({
          pomodoroDuration: _.pomodoroDuration || io,
          pomodoroDurationSeconds: _.pomodoroDurationSeconds
        }),
        elapsedSeconds: 0,
        startedAt: null,
        currentSession: null,
        ...Qs(),
        chatMessages: [],
        chatPending: !1,
        chatError: "",
        activeNoteSection: "",
        activeSourceHighlight: null,
        assistantContext: { sectionTitle: "", excerpt: "" }
      }, T = g && y ? S.view === "session" ? "session" : "setup" : (x == null ? void 0 : x.view) === "session" ? "session" : "setup";
      if (e({
        ..._,
        ...A,
        ...x,
        route: T,
        view: T,
        selectedMaterialId: c,
        selectedMaterial: m,
        aiPanelOpen: !1,
        activeDrawer: "",
        summaryRecord: null
      }), (x == null ? void 0 : x.timerState) === "restoring") {
        const b = x.timerRestoreTarget || "paused";
        Promise.resolve().then(() => {
          const E = n();
          if (E.selectedMaterialId !== c || E.timerState !== "restoring") return;
          const D = ot(), L = Un(E), G = L > 0 ? Math.min(L, Math.max(0, Number(E.elapsedSeconds) || 0)) : Math.max(0, Number(E.elapsedSeconds) || 0), W = {
            ...Rt(b, D),
            timerRestoreTarget: null,
            timerAnchorAtMs: null,
            timerPausedAtMs: b === "paused" ? D : null,
            timerRestoredAtMs: D,
            elapsedSeconds: G,
            audioPlaying: !1
          };
          e(W), Vn({ ...E, ...W });
        });
      }
    },
    showStudyHistory() {
      e({
        route: "history",
        view: "history",
        aiPanelOpen: !1,
        activeDrawer: "",
        summaryRecord: null,
        sessionHistory: pi()
      });
    },
    selectScene(p) {
      const m = Oa(p);
      m && e((y) => {
        const S = {
          selectedScene: m.id,
          musicType: m.musicType || y.musicType,
          ambientSound: m.ambientSound || y.ambientSound
        }, l = { ...y, ...S };
        return rt(l), S;
      });
    },
    setPomodoroDurationSeconds(p) {
      e((m) => {
        const y = nn(p, m.pomodoroDurationSeconds), S = Math.max(1, Math.round(y / 60)), l = m.selectedMaterial ? ud(m.selectedMaterial, m.studyGoal, S) : [], c = {
          pomodoroDuration: S,
          pomodoroDurationSeconds: y,
          studyPlan: l,
          timerDurationSeconds: m.timerMode === "countup" ? 0 : y
        };
        return rt({ ...m, ...c }), c;
      });
    },
    setPomodoroDuration(p) {
      const m = gr(p, n().pomodoroDuration);
      n().setPomodoroDurationSeconds(m * 60);
    },
    setStudyGoal(p) {
      e((m) => {
        var g;
        const y = String(p ?? ""), S = m.selectedMaterial ? ud(m.selectedMaterial, y, m.pomodoroDuration) : [], l = Array.isArray(m.focusTopics) ? m.focusTopics.map((x) => x.id === m.activeTopicId || x.status === "active" ? { ...x, title: y || x.title, status: "active" } : x) : fr([], y).focusTopics, c = {
          studyGoal: y,
          studyPlan: S,
          focusTopics: l,
          activeTopicId: m.activeTopicId || ((g = l.find((x) => x.status === "active")) == null ? void 0 : g.id) || ""
        };
        return rt({ ...m, ...c }), c;
      });
    },
    addFocusTopic(p = {}) {
      e((m) => {
        const y = (m.focusTopics || []).some((g) => g.status === "active"), S = Ba({
          id: Q0(),
          title: p.title || `Topic ${(m.focusTopics || []).length + 1}`,
          description: p.description || "",
          status: y ? "pending" : "active"
        }, y ? "pending" : "active"), c = {
          focusTopics: [...m.focusTopics || [], S],
          activeTopicId: y ? m.activeTopicId : S.id,
          studyGoal: y ? m.studyGoal : S.title
        };
        return rt({ ...m, ...c }), c;
      });
    },
    updateFocusTopic(p, m = {}) {
      e((y) => {
        const S = (y.focusTopics || []).map((g) => g.id !== p ? g : Ba({
          ...g,
          ...m,
          id: g.id,
          status: g.status
        }, g.status)), l = af(S, y.activeTopicId), c = {
          focusTopics: S,
          activeTopicId: (l == null ? void 0 : l.id) || y.activeTopicId || "",
          studyGoal: (l == null ? void 0 : l.title) || y.studyGoal
        };
        return rt({ ...y, ...c }), c;
      });
    },
    activateFocusTopic(p) {
      e((m) => {
        const y = _c(m.focusTopics, p);
        return rt({ ...m, ...y }), y;
      });
    },
    finishFocusTopic(p = "") {
      e((m) => {
        const y = String(p || m.activeTopicId || ""), S = (m.focusTopics || []).map((c) => c.id === y ? { ...c, status: "done" } : c), l = _c(S);
        return rt({ ...m, ...l }), l;
      });
    },
    removeFocusTopic(p) {
      e((m) => {
        const y = (m.focusTopics || []).filter((c) => c.id !== p);
        if (!y.length) {
          const c = fr([], m.studyGoal || "Deep work block");
          return rt({ ...m, ...c }), c;
        }
        const l = m.activeTopicId === p || (m.focusTopics || []).some((c) => c.id === p && c.status === "active") ? _c(y) : fr(y, m.studyGoal);
        return rt({ ...m, ...l }), l;
      });
    },
    setSound(p, m) {
      e((y) => {
        var l;
        let S = {};
        if (p === "musicVolume" && (S = { musicVolume: kt(m, y.musicVolume) }), p === "ambientVolume" && (S = { ambientVolume: kt(m, y.ambientVolume) }), p === "musicType" && (S = { musicType: String(m || y.musicType) }), p === "ambientSound" && (S = { ambientSound: String(m || y.ambientSound) }), String(p).startsWith("audioChannel:")) {
          const c = String(p).slice(13);
          S = { audioChannels: { ...y.audioChannels, [c]: kt(m, ((l = y.audioChannels) == null ? void 0 : l[c]) ?? 0) } };
        }
        return rt({ ...y, ...S }), S;
      });
    },
    applyAudioPreset(p) {
      e((m) => {
        const y = EC(p), S = {
          musicType: y.musicType,
          ambientSound: y.ambientSound
        };
        return rt({ ...m, ...S }), S;
      });
    },
    toggleAudio() {
      e((p) => ({ audioPlaying: !p.audioPlaying }));
    },
    setAudioPlaying(p) {
      e({ audioPlaying: !!p });
    },
    openDrawer(p) {
      e({
        activeDrawer: p
      });
    },
    closeDrawer() {
      e({
        activeDrawer: ""
      });
    },
    toggleAIPanel(p = null) {
      e((m) => ({ aiPanelOpen: typeof p == "boolean" ? p : !m.aiPanelOpen }));
    },
    openStudyPanel(p = "materials") {
      const m = ld.has(String(p || "")) ? String(p) : "materials";
      e({
        panelTab: m,
        aiPanelOpen: !0,
        activeDrawer: ""
      });
    },
    selectSourceHighlight(p = null, { openPanel: m = !0 } = {}) {
      const y = X0(p);
      e({
        activeSourceHighlight: y,
        activeNoteSection: (y == null ? void 0 : y.sectionTitle) || n().activeNoteSection || "",
        assistantContext: y ? hd({
          sectionTitle: y.sectionTitle,
          excerpt: y.excerpt
        }) : n().assistantContext,
        ...m ? { panelTab: "sources", aiPanelOpen: !0, activeDrawer: "" } : {}
      });
    },
    setActiveNoteSection(p = "") {
      e({
        activeNoteSection: String(p || "").trim()
      });
    },
    setPanelTab(p) {
      const m = String(p || "materials");
      e({
        panelTab: ld.has(m) ? m : "materials",
        aiPanelOpen: !0,
        activeDrawer: ""
      });
    },
    startSession() {
      const p = n(), m = p.timerMode === "countup" ? "countup" : "countdown", y = new Date(ot()).toISOString(), S = _i(y), l = {
        sessionId: `focus-${Date.now()}`,
        materialId: "focus-room",
        studyGoal: p.studyGoal,
        selectedScene: p.selectedScene,
        musicType: p.musicType,
        ambientSound: p.ambientSound,
        musicVolume: p.musicVolume,
        ambientVolume: p.ambientVolume,
        pomodoroDuration: p.pomodoroDuration,
        status: "active",
        focusTrailDate: S.focusTrailDate,
        focusTimezone: S.focusTimezone,
        startedAt: y,
        endedAt: null,
        totalFocusTime: 0
      }, c = eg(l);
      rt(p), e({
        route: "session",
        view: "session",
        timerStatus: "idle",
        timerState: "idle",
        timerPhase: "idle",
        status: "idle",
        timerRestoreTarget: null,
        timerMode: m,
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerUpdatedAtMs: ot(),
        timerRestoredAtMs: null,
        timerDurationSeconds: m === "countup" ? 0 : mr(p),
        elapsedSeconds: 0,
        startedAt: y,
        summaryRecord: null,
        aiPanelOpen: !1,
        activeDrawer: "",
        currentSession: l,
        sessionHistory: [c, ...pi().filter((g) => g.sessionId !== c.sessionId)],
        ...Qs(),
        chatMessages: [],
        chatPending: !1,
        chatError: ""
      });
    },
    startTimer() {
      const p = n();
      (!p.currentSession || p.view !== "session") && n().startSession();
      const m = n(), y = ot(), S = Ht(m);
      if (S === "running") {
        n().tickTimer();
        return;
      }
      const l = Un(m), c = S === "completed" || S === "break" || l > 0 && m.elapsedSeconds >= l, g = c ? 0 : Math.max(0, Number(m.elapsedSeconds) || 0), x = {
        view: "session",
        route: "session",
        ...Rt("running", y),
        audioPlaying: p.audioPlaying,
        summaryRecord: null,
        elapsedSeconds: g,
        startedAt: !m.startedAt || c ? new Date(y).toISOString() : m.startedAt,
        timerAnchorAtMs: y - g * 1e3,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        timerDurationSeconds: l,
        ...c ? Qs() : {}
      };
      e(x), Vn({ ...m, ...x });
    },
    pauseTimer({ pauseAudio: p = !0 } = {}) {
      const m = n(), y = ot();
      if (Ht(m) !== "running") {
        p && m.audioPlaying && e({ audioPlaying: !1 });
        return;
      }
      const S = sg(m, y), l = {
        ...S,
        ...Rt(S.timerState === "completed" ? "completed" : "paused", y),
        timerAnchorAtMs: null,
        timerPausedAtMs: y,
        audioPlaying: p ? !1 : m.audioPlaying
      };
      e(l), Vn({ ...m, ...l });
    },
    resetTimer() {
      const p = ot(), m = {
        ...Rt("idle", p),
        timerRestoreTarget: null,
        timerMode: "countdown",
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerDurationSeconds: mr(n()),
        audioPlaying: !1,
        startedAt: null,
        elapsedSeconds: 0,
        summaryRecord: null,
        ...Qs()
      };
      e(m), Vn({ ...n(), ...m });
    },
    skipTimer() {
      const p = n(), m = ot(), y = Un(p), S = {
        ...Rt("completed", m),
        elapsedSeconds: y || Math.max(0, Number(p.elapsedSeconds) || 0),
        audioPlaying: !1,
        startedAt: p.startedAt || new Date(m).toISOString(),
        timerAnchorAtMs: null,
        timerPausedAtMs: m,
        timerDurationSeconds: y
      };
      e(S), Vn({ ...p, ...S });
    },
    tickTimer() {
      const p = n();
      if (p.view !== "session" || Ht(p) !== "running") return;
      const m = ot(), y = Un(p), S = y ? Math.min(y, $a(p, m)) : $a(p, m), l = y > 0 && S >= y ? "completed" : "running", c = {
        ...Rt(l, m),
        elapsedSeconds: S,
        timerAnchorAtMs: l === "running" ? p.timerAnchorAtMs : null,
        timerPausedAtMs: l === "running" ? null : m,
        timerDurationSeconds: y,
        audioPlaying: l === "running" ? p.audioPlaying : !1
      };
      S === p.elapsedSeconds && l === Ht(p) || (e(c), Vn({ ...p, ...c }));
    },
    setTimerMode(p = "countdown") {
      const m = p === "countup" ? "countup" : "countdown", y = {
        timerMode: m,
        timerDurationSeconds: m === "countup" ? 0 : mr(n())
      };
      e(y), Vn({ ...n(), ...y });
    },
    startBreak() {
      const p = ot(), m = {
        ...Rt("break", p),
        timerRestoreTarget: null,
        timerAnchorAtMs: null,
        timerPausedAtMs: p,
        timerDurationSeconds: 0,
        audioPlaying: !1
      };
      e(m), Vn({ ...n(), ...m });
    },
    getTimerState() {
      return Ht(n());
    },
    endSession() {
      var x, _, A;
      const p = n(), m = ot(), y = new Date(m).toISOString(), S = Ht(p) === "running" ? sg(p, m) : p, l = Un(S), c = l ? Math.min(l, S.elapsedSeconds) : S.elapsedSeconds, g = eg({
        sessionId: (x = p.currentSession) == null ? void 0 : x.sessionId,
        materialId: "focus-room",
        materialTitle: "Focus Room",
        studyGoal: p.studyGoal,
        status: "completed",
        focusTrailDate: (_ = p.currentSession) == null ? void 0 : _.focusTrailDate,
        focusTimezone: (A = p.currentSession) == null ? void 0 : A.focusTimezone,
        selectedScene: p.selectedScene,
        musicType: p.musicType,
        ambientSound: p.ambientSound,
        musicVolume: p.musicVolume,
        ambientVolume: p.ambientVolume,
        pomodoroDuration: p.pomodoroDuration,
        startedAt: p.startedAt || y,
        endedAt: y,
        totalFocusTime: c,
        flashcardsCompleted: 0,
        quizScore: null,
        mistakesMade: [],
        completedTasks: [],
        recommendedNextStep: "Start another protected focus block when you are ready."
      });
      ma("focus-room"), e({
        summaryRecord: g,
        sessionHistory: pi(),
        ...Rt("completed", m),
        audioPlaying: !1,
        timerAnchorAtMs: null,
        timerPausedAtMs: m,
        timerDurationSeconds: l,
        elapsedSeconds: l ? Math.min(l, S.elapsedSeconds) : S.elapsedSeconds,
        currentSession: null
      });
    },
    closeSummary() {
      e({ summaryRecord: null });
    },
    setWorkspaceNotes(p) {
      e((m) => {
        const y = {
          workspaceNotes: String(p ?? ""),
          workspaceUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        return rt({ ...m, ...y }), y;
      });
    },
    setAssistantContext(p = {}) {
      e({ assistantContext: hd(p) });
    },
    toggleTask(p) {
      e((m) => {
        const y = m.studyPlan[Number(p)];
        if (!y) return {};
        const S = String(y.task || ""), l = m.completedTasks.includes(S) ? m.completedTasks.filter((c) => c !== S) : [...m.completedTasks, S];
        return rt({ ...m, completedTasks: l }), { completedTasks: l };
      });
    },
    updatePlanTask(p, m = null, y = null) {
      e((S) => {
        const l = Number(p), c = S.studyPlan[l];
        if (!c) return {};
        const g = String(c.task || ""), x = y == null ? g : String(y || "").trim(), _ = m == null ? c.minutes : wr(m, c.minutes, 1, Ja), A = S.studyPlan.map((E, D) => D === l ? { minutes: _, task: x || g } : E);
        let T = S.completedTasks;
        g && g !== A[l].task && T.includes(g) && (T = T.filter((E) => E !== g).concat(A[l].task));
        const b = { studyPlan: A, completedTasks: T };
        return rt({ ...S, ...b }), b;
      });
    },
    setFlashcardIndex(p) {
      const m = ng(n().selectedMaterial);
      e({
        flashcardIndex: wr(p, n().flashcardIndex, 0, Math.max(0, m.length - 1)),
        flashcardSide: "front"
      });
    },
    flipFlashcard() {
      e((p) => ({
        flashcardSide: p.flashcardSide === "back" ? "front" : "back"
      }));
    },
    rateFlashcard(p) {
      const m = n(), y = ng(m.selectedMaterial);
      if (!y.length) return;
      const S = wr(m.flashcardIndex, 0, 0, y.length - 1), l = y[S], c = ["easy", "medium", "hard"].includes(String(p)) ? String(p) : "medium";
      e({
        flashcardProgress: {
          ...m.flashcardProgress,
          [KC(l, S)]: {
            difficulty: c,
            reviewedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        },
        flashcardSide: "front",
        flashcardIndex: S < y.length - 1 ? S + 1 : S
      });
    },
    answerQuizQuestion(p, m) {
      const y = Number(p), S = dd(n().selectedMaterial)[y];
      if (!S) return;
      const l = String(y);
      e((c) => {
        const g = c.quizAnswers[l], x = qC(S, m, g);
        if (Array.isArray(g) && Array.isArray(x) ? g.length === x.length && g.every((T, b) => Object.is(T, x[b])) : Object.is(g, x)) return c;
        const A = { ...c.quizChecked };
        return delete A[l], {
          quizAnswers: {
            ...c.quizAnswers,
            [l]: x
          },
          quizChecked: A
        };
      });
    },
    checkQuizQuestion(p) {
      const m = dd(n().selectedMaterial), y = Number(p), S = m[y];
      if (!S) return;
      const l = String(y), c = n(), g = Object.prototype.hasOwnProperty.call(c.quizAnswers, l) ? c.quizAnswers[l] : "", x = JC(S, g), _ = z0(S);
      e({
        quizChecked: {
          ...c.quizChecked,
          [l]: {
            answer: g,
            correct: x === null ? !1 : x,
            hasKnownAnswer: x !== null,
            explanation: S.explanation || S.rationale || (_ ? `Correct answer: ${_}` : ""),
            checkedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        }
      });
    },
    async askAssistant(p) {
      const m = String(p || "").trim();
      if (!m) return;
      const y = n(), S = y.selectedMaterial, l = si(y.chatMessages).slice(-10).map((c) => ({
        role: c.role === "user" ? "user" : "assistant",
        content: c.text
      }));
      e({
        chatMessages: si([
          ...y.chatMessages,
          { role: "user", text: m, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
        ]),
        chatPending: !0,
        chatError: ""
      });
      try {
        const c = await sP({
          question: m,
          chatHistory: l,
          material: S,
          assistantContext: y.assistantContext,
          studyGoal: y.studyGoal
        });
        e((g) => ({
          chatMessages: si([
            ...g.chatMessages,
            { role: "assistant", text: c.answer, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: c.offline ? "Using a local Focus Room reply because the AI tutor service is not connected." : ""
        }));
      } catch (c) {
        e((g) => ({
          chatMessages: si([
            ...g.chatMessages,
            { role: "assistant", text: B0(m, S, n().studyGoal), createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: `AI tutor unavailable: ${c.message || "request failed"}`
        }));
      } finally {
        e({ chatPending: !1 });
      }
    },
    focusFlashcardsCompletedCount() {
      return dP(n());
    },
    focusQuizScore() {
      return fP(n());
    },
    focusQuizMistakes() {
      return pP(n());
    },
    formatFocusedTime() {
      return Ia(n().elapsedSeconds);
    }
  };
});
function Z0({ compact: e = !1, className: n = "" }) {
  const o = Y((c) => c.focusTopics), i = Y((c) => c.activeTopicId), a = Y((c) => c.addFocusTopic), d = Y((c) => c.updateFocusTopic), f = Y((c) => c.finishFocusTopic), p = Y((c) => c.removeFocusTopic), m = Y((c) => c.activateFocusTopic), y = af(o, i), S = (o || []).filter((c) => c.status !== "done").length, l = (o || []).filter((c) => c.status === "done").length;
  return /* @__PURE__ */ w.jsxs(
    "section",
    {
      className: `focus-topics-panel ${e ? "is-compact" : ""} ${n}`.trim(),
      "aria-label": "Focus topics",
      "data-focus-topics": "true",
      children: [
        /* @__PURE__ */ w.jsxs("header", { className: "focus-topics-head", children: [
          /* @__PURE__ */ w.jsxs("div", { children: [
            /* @__PURE__ */ w.jsx("span", { className: "focus-topics-eyebrow", children: "Topics queue" }),
            /* @__PURE__ */ w.jsx("h3", { children: "What will you protect?" })
          ] }),
          /* @__PURE__ */ w.jsxs(
            "button",
            {
              type: "button",
              className: "focus-topics-add",
              onClick: () => a(),
              "aria-label": "Add focus topic",
              "data-focus-topic-add": "true",
              children: [
                /* @__PURE__ */ w.jsx(Ib, { size: 14, "aria-hidden": "true" }),
                "Add"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ w.jsxs("p", { className: "focus-topics-hint", children: [
          "Finish or remove the active topic to switch into the next one automatically.",
          l ? ` ${l} done · ${S} open.` : null
        ] }),
        /* @__PURE__ */ w.jsx("div", { className: "focus-topics-list", children: (o || []).map((c, g) => {
          const x = c.id === (y == null ? void 0 : y.id), _ = c.status === "done";
          return /* @__PURE__ */ w.jsxs(
            "article",
            {
              className: `focus-topic-card ${x ? "is-active" : ""} ${_ ? "is-done" : ""}`.trim(),
              "data-focus-topic-id": c.id,
              "data-focus-topic-status": c.status,
              children: [
                /* @__PURE__ */ w.jsxs("div", { className: "focus-topic-card-top", children: [
                  /* @__PURE__ */ w.jsx("span", { className: "focus-topic-index", children: String(g + 1).padStart(2, "0") }),
                  /* @__PURE__ */ w.jsx("span", { className: "focus-topic-status", children: _ ? "Done" : x ? "Active" : "Next" }),
                  /* @__PURE__ */ w.jsxs("div", { className: "focus-topic-actions", children: [
                    !_ && !x ? /* @__PURE__ */ w.jsx(
                      "button",
                      {
                        type: "button",
                        className: "focus-topic-action",
                        onClick: () => m(c.id),
                        "aria-label": `Activate topic ${c.title}`,
                        children: "Use"
                      }
                    ) : null,
                    _ ? null : /* @__PURE__ */ w.jsxs(
                      "button",
                      {
                        type: "button",
                        className: "focus-topic-action is-success",
                        onClick: () => f(c.id),
                        "aria-label": `Mark topic ${c.title} as done`,
                        "data-focus-topic-finish": c.id,
                        children: [
                          /* @__PURE__ */ w.jsx(el, { size: 13, "aria-hidden": "true" }),
                          "Done"
                        ]
                      }
                    ),
                    /* @__PURE__ */ w.jsx(
                      "button",
                      {
                        type: "button",
                        className: "focus-topic-action is-danger",
                        onClick: () => p(c.id),
                        "aria-label": `Delete topic ${c.title}`,
                        "data-focus-topic-remove": c.id,
                        disabled: (o || []).length <= 1,
                        children: /* @__PURE__ */ w.jsx(Qb, { size: 13, "aria-hidden": "true" })
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ w.jsxs("label", { className: "focus-topic-field", children: [
                  /* @__PURE__ */ w.jsx("span", { children: "Topic" }),
                  /* @__PURE__ */ w.jsx(
                    "input",
                    {
                      type: "text",
                      value: c.title,
                      onChange: (A) => d(c.id, { title: A.target.value }),
                      placeholder: "Topic title",
                      disabled: _,
                      "data-focus-topic-title": c.id
                    }
                  )
                ] }),
                /* @__PURE__ */ w.jsxs("label", { className: "focus-topic-field", children: [
                  /* @__PURE__ */ w.jsx("span", { children: "Description" }),
                  /* @__PURE__ */ w.jsx(
                    "textarea",
                    {
                      value: c.description,
                      onChange: (A) => d(c.id, { description: A.target.value }),
                      placeholder: "What will you do in this block?",
                      rows: e ? 2 : 3,
                      disabled: _,
                      "data-focus-topic-description": c.id
                    }
                  )
                ] })
              ]
            },
            c.id
          );
        }) })
      ]
    }
  );
}
function lg({ scene: e, active: n, onSelect: o, variant: i = "default" }) {
  const a = gC(), d = Na(0.5), f = Na(0.5), p = Zy(d, { stiffness: 180, damping: 24, mass: 0.5 }), m = Zy(f, { stiffness: 180, damping: 24, mass: 0.5 }), y = Da(m, [0, 1], [2.2, -2.2]), S = Da(p, [0, 1], [-2.2, 2.2]), l = a ? {} : { rotateX: y, rotateY: S, transformPerspective: 820 };
  function c(x) {
    const _ = x.currentTarget.getBoundingClientRect(), A = Math.max(0, Math.min(1, (x.clientX - _.left) / _.width)), T = Math.max(0, Math.min(1, (x.clientY - _.top) / _.height));
    d.set(A), f.set(T), x.currentTarget.style.setProperty("--scene-glare-x", `${A * 100}%`), x.currentTarget.style.setProperty("--scene-glare-y", `${T * 100}%`);
  }
  function g(x) {
    d.set(0.5), f.set(0.5), x.currentTarget.style.setProperty("--scene-glare-x", "50%"), x.currentTarget.style.setProperty("--scene-glare-y", "15%");
  }
  return i === "gallery" ? /* @__PURE__ */ w.jsxs(
    Sn.button,
    {
      className: `scene-card scene-card-gallery ${n ? "active" : ""}`.trim(),
      type: "button",
      "aria-pressed": n,
      "aria-label": `${e.name}: ${e.description}`,
      onClick: () => o(e.id),
      onPointerMove: c,
      onPointerLeave: g,
      style: l,
      whileHover: a ? void 0 : { y: -2 },
      whileTap: a ? void 0 : { scale: 0.985 },
      children: [
        /* @__PURE__ */ w.jsx(
          "span",
          {
            className: "scene-card-gallery-media",
            style: { backgroundImage: `url("${e.image}")` },
            children: n ? /* @__PURE__ */ w.jsx("span", { className: "scene-card-check", "aria-hidden": "true", children: "✓" }) : null
          }
        ),
        /* @__PURE__ */ w.jsxs("span", { className: "scene-card-gallery-copy", children: [
          /* @__PURE__ */ w.jsx("strong", { children: e.name }),
          /* @__PURE__ */ w.jsx("small", { children: e.kicker })
        ] })
      ]
    }
  ) : /* @__PURE__ */ w.jsxs(
    Sn.button,
    {
      className: `scene-card ${n ? "active" : ""}`.trim(),
      type: "button",
      "aria-pressed": n,
      "aria-label": `${e.name}: ${e.description}`,
      onClick: () => o(e.id),
      onPointerMove: c,
      onPointerLeave: g,
      style: { backgroundImage: `url("${e.image}")`, ...l },
      whileHover: a ? void 0 : { scale: 1.025, y: -2 },
      whileTap: a ? void 0 : { scale: 0.98 },
      children: [
        /* @__PURE__ */ w.jsx("span", { className: "focus-pill", children: e.kicker }),
        /* @__PURE__ */ w.jsx("strong", { children: e.name }),
        /* @__PURE__ */ w.jsx("span", { children: e.description })
      ]
    }
  );
}
const Xs = 8;
function lf({ variant: e = "default" }) {
  const n = Y((y) => y.selectedScene), o = Y((y) => y.selectScene), [i, a] = C.useState(0), d = C.useMemo(() => e === "gallery" ? RC : Yn.filter((y) => !y.galleryOnly || y.id === n), [n, e]), f = Math.max(1, Math.ceil(d.length / Xs)), p = Math.min(i, f - 1), m = e === "gallery" ? d.slice(p * Xs, p * Xs + Xs) : d;
  return e !== "gallery" ? /* @__PURE__ */ w.jsx("div", { className: "scene-selector", "aria-label": "Study scenes", children: m.map((y) => /* @__PURE__ */ w.jsx(
    lg,
    {
      scene: y,
      active: y.id === n,
      onSelect: o
    },
    y.id
  )) }) : /* @__PURE__ */ w.jsxs("div", { className: "scene-selector-wrap", "aria-label": "Study scenes", children: [
    /* @__PURE__ */ w.jsx("div", { className: "scene-selector scene-selector-gallery", children: m.map((y) => /* @__PURE__ */ w.jsx(
      lg,
      {
        scene: y,
        active: y.id === n,
        onSelect: o,
        variant: "gallery"
      },
      y.id
    )) }),
    f > 1 ? /* @__PURE__ */ w.jsxs("div", { className: "scene-pagination", "aria-label": "Scene pages", children: [
      /* @__PURE__ */ w.jsx(
        "button",
        {
          type: "button",
          className: "scene-page-arrow scene-page-button-left",
          onClick: () => a((y) => Math.max(0, y - 1)),
          disabled: p <= 0,
          "aria-label": "Previous scenes",
          children: /* @__PURE__ */ w.jsx(mb, { size: 18, "aria-hidden": "true" })
        }
      ),
      /* @__PURE__ */ w.jsx(
        "button",
        {
          type: "button",
          className: "scene-page-arrow scene-page-button-right",
          onClick: () => a((y) => Math.min(f - 1, y + 1)),
          disabled: p >= f - 1,
          "aria-label": "Next scenes",
          children: /* @__PURE__ */ w.jsx(yb, { size: 18, "aria-hidden": "true" })
        }
      )
    ] }) : null
  ] });
}
const ug = [
  { label: "Lo-fi Chill", icon: Eb, musicType: "Lo-fi", ambientSound: "Cafe Rain" },
  { label: "Ambient Piano", icon: Nb, musicType: "Piano", ambientSound: "Nature" },
  { label: "Nature Ambient", icon: sf, musicType: "Deep Focus", ambientSound: "Nature" },
  { label: "Acoustic Warm", icon: vb, musicType: "Minimal", ambientSound: "White Noise" },
  { label: "Deep Focus", icon: Ob, musicType: "Deep Focus", ambientSound: "White Noise" }
];
function mP({ onWorkspace: e, onOpenTrail: n }) {
  const o = Y((b) => b.selectedScene), i = Y((b) => b.pomodoroDuration), a = Y((b) => b.timerMode), d = Y((b) => b.musicType), f = Y((b) => b.focusTopics), p = Y((b) => b.setPomodoroDuration), m = Y((b) => b.setTimerMode), y = Y((b) => b.setSound), S = Y((b) => b.startSession), [l, c] = C.useState(!1), g = C.useMemo(
    () => {
      var b;
      return ((b = ug.find((E) => E.musicType === d)) == null ? void 0 : b.label) || "";
    },
    [d]
  ), x = (f || []).filter((b) => b.status !== "done").length, _ = (b) => {
    y("musicType", b.musicType), y("ambientSound", b.ambientSound);
  }, A = (b) => {
    m("countdown"), p(b);
  }, T = () => {
    o && S();
  };
  return /* @__PURE__ */ w.jsxs("section", { className: "focus-setup-stage innook-scene-setup", "aria-label": "Focus Room setup", "data-focus-setup": "true", children: [
    /* @__PURE__ */ w.jsxs("header", { className: "innook-setup-header", children: [
      /* @__PURE__ */ w.jsxs("button", { type: "button", className: "innook-setup-brand", onClick: e, "aria-label": "Return to Synapse workspace", children: [
        /* @__PURE__ */ w.jsx("span", { className: "innook-brand-mark", children: "S" }),
        /* @__PURE__ */ w.jsxs("span", { children: [
          /* @__PURE__ */ w.jsx("strong", { children: "synapse" }),
          /* @__PURE__ */ w.jsx("small", { children: "Focus Room" })
        ] })
      ] }),
      /* @__PURE__ */ w.jsxs("div", { className: "innook-setup-header-actions", children: [
        /* @__PURE__ */ w.jsx(
          "button",
          {
            type: "button",
            className: "innook-header-action",
            onClick: n,
            "aria-label": "Open Focus Trail",
            title: "Open Focus Trail",
            children: /* @__PURE__ */ w.jsx(Ab, { size: 18, "aria-hidden": "true" })
          }
        ),
        /* @__PURE__ */ w.jsx(
          "button",
          {
            type: "button",
            className: "innook-header-action",
            onClick: e,
            "aria-label": "Return to Synapse workspace",
            title: "Return to workspace",
            children: /* @__PURE__ */ w.jsx(ub, { size: 20, "aria-hidden": "true" })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ w.jsxs("div", { className: "innook-setup-layout", children: [
      /* @__PURE__ */ w.jsxs("section", { className: "innook-scene-panel", "aria-labelledby": "innook-scene-title", children: [
        /* @__PURE__ */ w.jsxs("div", { className: "innook-panel-heading", children: [
          /* @__PURE__ */ w.jsx("span", { children: "STEP 01" }),
          /* @__PURE__ */ w.jsx("h1", { id: "innook-scene-title", children: "Choose a study scene" })
        ] }),
        /* @__PURE__ */ w.jsx(lf, { variant: "gallery" })
      ] }),
      /* @__PURE__ */ w.jsxs("aside", { className: "innook-control-rail", "aria-label": "Study settings", children: [
        /* @__PURE__ */ w.jsx("div", { className: "innook-rail-group", "aria-label": "Music atmosphere", children: ug.map((b) => {
          const E = b.icon, D = g === b.label;
          return /* @__PURE__ */ w.jsx(
            "button",
            {
              type: "button",
              className: `innook-rail-icon ${D ? "is-active" : ""}`.trim(),
              onClick: () => _(b),
              "aria-label": `Music style: ${b.label}`,
              "aria-pressed": D,
              title: b.label,
              children: /* @__PURE__ */ w.jsx(E, { size: 16, "aria-hidden": "true" })
            },
            b.label
          );
        }) }),
        /* @__PURE__ */ w.jsx("div", { className: "innook-rail-divider" }),
        /* @__PURE__ */ w.jsxs("div", { className: "innook-duration-list", "aria-label": "Focus duration", children: [
          E0.map((b) => {
            const E = a !== "countup" && b === i;
            return /* @__PURE__ */ w.jsx(
              "button",
              {
                type: "button",
                className: `innook-duration ${E ? "is-active" : ""}`.trim(),
                onClick: () => A(b),
                "aria-pressed": E,
                children: b
              },
              b
            );
          }),
          /* @__PURE__ */ w.jsx(
            "button",
            {
              type: "button",
              className: `innook-duration innook-duration-infinity ${a === "countup" ? "is-active" : ""}`.trim(),
              onClick: () => m("countup"),
              "aria-label": "Count-up timer",
              "aria-pressed": a === "countup",
              title: "Count-up",
              children: "∞"
            }
          )
        ] }),
        /* @__PURE__ */ w.jsx("div", { className: "innook-rail-divider" }),
        /* @__PURE__ */ w.jsxs(
          "button",
          {
            type: "button",
            className: `innook-rail-icon ${l ? "is-active" : ""}`.trim(),
            onClick: () => c((b) => !b),
            "aria-label": "Edit focus topics",
            "aria-expanded": l,
            title: "Edit focus topics",
            "data-focus-topics-toggle": "true",
            children: [
              /* @__PURE__ */ w.jsx(Kb, { size: 16, "aria-hidden": "true" }),
              x > 1 ? /* @__PURE__ */ w.jsx("span", { className: "innook-rail-badge", children: x }) : null
            ]
          }
        ),
        /* @__PURE__ */ w.jsx(
          "button",
          {
            type: "button",
            className: "innook-enter-button",
            onClick: T,
            disabled: !o,
            "data-focus-enter": "true",
            "aria-label": "Enter Focus Room",
            title: "Enter Focus Room",
            children: /* @__PURE__ */ w.jsx(db, { size: 22, "aria-hidden": "true" })
          }
        ),
        l ? /* @__PURE__ */ w.jsx("div", { className: "innook-goal-popover innook-topics-popover", "data-focus-topics-popover": "true", children: /* @__PURE__ */ w.jsx(Z0, { compact: !0 }) }) : null
      ] })
    ] })
  ] });
}
function Te({
  children: e,
  className: n = "",
  variant: o = "ghost",
  type: i = "button",
  ...a
}) {
  const { onPointerMove: d, onPointerLeave: f, ...p } = a;
  return /* @__PURE__ */ w.jsx(
    "button",
    {
      className: `glass-button glass-button-${o} ${n}`.trim(),
      type: i,
      onPointerMove: (m) => {
        const y = m.currentTarget.getBoundingClientRect();
        m.currentTarget.style.setProperty("--glass-x", `${Math.max(0, Math.min(100, (m.clientX - y.left) / y.width * 100))}%`), m.currentTarget.style.setProperty("--glass-y", `${Math.max(0, Math.min(100, (m.clientY - y.top) / y.height * 100))}%`), d == null || d(m);
      },
      onPointerLeave: (m) => {
        m.currentTarget.style.setProperty("--glass-x", "50%"), m.currentTarget.style.setProperty("--glass-y", "0%"), f == null || f(m);
      },
      ...p,
      children: e
    }
  );
}
function hP({ onWorkspace: e, onOpenTrail: n, onOpenCompanion: o, onOpenSettings: i, onExit: a }) {
  const d = Y((p) => p.selectedScene), f = gn(d);
  return /* @__PURE__ */ w.jsxs("header", { className: "focus-room-header", children: [
    /* @__PURE__ */ w.jsxs("button", { type: "button", className: "focus-wordmark", onClick: e, "aria-label": "Return to Synapse workspace", children: [
      /* @__PURE__ */ w.jsx("span", { className: "focus-wordmark-mark", children: "S" }),
      /* @__PURE__ */ w.jsx("span", { children: "synapse" })
    ] }),
    /* @__PURE__ */ w.jsxs("div", { className: "focus-room-context", "aria-label": "Current focus context", children: [
      /* @__PURE__ */ w.jsx("span", { children: f.name }),
      /* @__PURE__ */ w.jsx("small", { children: "Quiet study room" })
    ] }),
    /* @__PURE__ */ w.jsxs("nav", { className: "focus-room-header-actions", "aria-label": "Focus Room controls", children: [
      /* @__PURE__ */ w.jsxs(Te, { className: "header-icon-button", onClick: n, title: "Open Focus Trail", "aria-label": "Open Focus Trail", children: [
        /* @__PURE__ */ w.jsx(of, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Focus Trail" })
      ] }),
      /* @__PURE__ */ w.jsxs(Te, { className: "header-icon-button", onClick: o, title: "Open Companion Room", "aria-label": "Open Companion Room", children: [
        /* @__PURE__ */ w.jsx(za, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Companion" })
      ] }),
      /* @__PURE__ */ w.jsxs(Te, { className: "header-icon-button", onClick: i, title: "Open room settings", "aria-label": "Open room settings", children: [
        /* @__PURE__ */ w.jsx(G0, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Settings" })
      ] }),
      /* @__PURE__ */ w.jsxs(Te, { className: "header-icon-button header-exit-button", onClick: a, title: "Exit Focus Room", "aria-label": "Exit Focus Room", children: [
        /* @__PURE__ */ w.jsx(_b, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Exit" })
      ] })
    ] })
  ] });
}
const q0 = {
  minutes: Math.floor(F0 / 60),
  seconds: 59
}, yP = {
  minutes: 3,
  seconds: 2
};
function uf(e) {
  const n = nn(e, nf);
  return {
    minutes: Math.floor(n / 60),
    seconds: n % 60
  };
}
function cg(e, n) {
  const o = Math.max(0, Math.floor(Number(e) || 0)), i = Math.max(0, Math.floor(Number(n) || 0));
  return nn(o * 60 + i, nf);
}
function yd(e, n) {
  return String(Math.max(0, Math.floor(Number(e) || 0))).padStart(2, "0");
}
function cf(e) {
  const { minutes: n, seconds: o } = uf(e);
  return `${yd(n, "minutes")}:${yd(o, "seconds")}`;
}
function gP(e, n, o) {
  const i = yP[o] || 2;
  return `${String(e || "").replace(/\D/g, "")}${String(n).replace(/\D/g, "")}`.slice(-i) || "";
}
function vP(e, n) {
  const o = Number(String(e || "").replace(/\D/g, "")) || 0;
  return Math.min(q0[n], o);
}
function SP(e, n, o) {
  const i = uf(e), a = vP(o, n);
  return n === "seconds" ? cg(i.minutes, a) : cg(a, i.seconds);
}
const wP = { minutes: "Minutes", seconds: "Seconds" };
function dg({
  segment: e,
  value: n,
  disabled: o,
  active: i,
  onFocusSegment: a,
  onType: d,
  onCommit: f,
  onMove: p,
  segmentRef: m
}) {
  const y = wP[e], S = (l) => {
    if (o) return;
    const { key: c } = l;
    if (c >= "0" && c <= "9") {
      l.preventDefault(), d(e, c);
      return;
    }
    if (c === "ArrowLeft") {
      l.preventDefault(), p(-1);
      return;
    }
    if (c === "ArrowRight" || c === "Tab" && !l.shiftKey && e === "minutes") {
      c === "ArrowRight" && (l.preventDefault(), p(1));
      return;
    }
    (c === "Backspace" || c === "Delete") && (l.preventDefault(), f());
  };
  return /* @__PURE__ */ w.jsx("span", { className: `timer-editor-segment${i ? " is-active" : ""}`, children: /* @__PURE__ */ w.jsx(
    "span",
    {
      ref: m,
      className: "timer-editor-digits",
      role: "spinbutton",
      tabIndex: o ? -1 : 0,
      "aria-label": y,
      "aria-valuemin": 0,
      "aria-valuemax": q0[e],
      "aria-valuenow": n,
      "aria-valuetext": `${n} ${y.toLowerCase()}`,
      "aria-disabled": o || void 0,
      onFocus: () => a(e),
      onKeyDown: S,
      children: yd(n, e)
    }
  ) });
}
function xP({
  valueSeconds: e,
  onChange: n,
  disabled: o = !1,
  size: i = "hero",
  ariaLabel: a = "Set focus block length",
  className: d = ""
}) {
  const { minutes: f, seconds: p } = uf(e), [m, y] = C.useState(null), S = C.useRef(""), l = C.useRef(null), c = C.useRef(null), g = C.useRef(null), x = C.useCallback(() => {
    S.current = "";
  }, []), _ = C.useCallback((E) => {
    S.current = "", y(E);
  }, []), A = C.useCallback(
    (E, D) => {
      if (o) return;
      const L = gP(S.current, D, E);
      S.current = L, y(E), n == null || n(SP(e, E, L));
    },
    [o, n, e]
  ), T = C.useCallback((E) => {
    var L;
    const D = E < 0 ? "minutes" : "seconds";
    S.current = "", y(D), (L = (E < 0 ? l : c).current) == null || L.focus();
  }, []), b = (E) => {
    var D;
    (D = g.current) != null && D.contains(E.relatedTarget) || (x(), y(null));
  };
  return /* @__PURE__ */ w.jsxs(
    "div",
    {
      ref: g,
      className: `timer-editor timer-editor-${i}${o ? " is-readonly" : ""} ${d}`.trim(),
      role: "group",
      "aria-label": a,
      onBlur: b,
      children: [
        o ? /* @__PURE__ */ w.jsx("span", { className: "timer-editor-static", "aria-hidden": "true", children: cf(e) }) : /* @__PURE__ */ w.jsxs(w.Fragment, { children: [
          /* @__PURE__ */ w.jsx(
            dg,
            {
              segment: "minutes",
              value: f,
              disabled: o,
              active: m === "minutes",
              segmentRef: l,
              onFocusSegment: _,
              onType: A,
              onCommit: x,
              onMove: T
            }
          ),
          /* @__PURE__ */ w.jsx("span", { className: "timer-editor-colon", "aria-hidden": "true", children: ":" }),
          /* @__PURE__ */ w.jsx(
            dg,
            {
              segment: "seconds",
              value: p,
              disabled: o,
              active: m === "seconds",
              segmentRef: c,
              onFocusSegment: _,
              onType: A,
              onCommit: x,
              onMove: T
            }
          )
        ] }),
        !o && /* @__PURE__ */ w.jsx("span", { className: "sr-only", children: "Editable focus timer. Click minutes or seconds, then type digits to set the value." })
      ]
    }
  );
}
function _P(e, n) {
  return n ? Math.min(100, Math.max(0, e / n * 100)) : 0;
}
function TP({ onFocusMode: e, audioState: n }) {
  const o = Y((O) => O.timerStatus), i = Y((O) => O.elapsedSeconds), a = Y((O) => O.pomodoroDuration), d = Y((O) => O.pomodoroDurationSeconds), f = Y((O) => O.timerMode), p = Y((O) => O.studyGoal), m = Y((O) => O.focusTopics), y = Y((O) => O.activeTopicId), S = Y((O) => O.currentSession), l = Y((O) => O.startTimer), c = Y((O) => O.pauseTimer), g = Y((O) => O.resetTimer), x = Y((O) => O.skipTimer), _ = Y((O) => O.toggleAudio), A = Y((O) => O.audioPlaying), T = Y((O) => O.setPomodoroDurationSeconds), b = Y((O) => O.finishFocusTopic), E = af(m, y), D = Number(d) || (Number(a) || 0) * 60, L = f === "countup" ? i : Math.max(0, D - i), G = o === "paused", W = o === "studying", H = o === "completed", V = o === "idle" && f !== "countup", X = H && f !== "countup" ? "00:00" : cd(L), J = G ? "Paused" : H ? "Complete" : W ? "In focus" : "Ready", ce = G ? "Resume timer" : W ? "Pause timer" : "Start timer", me = (E == null ? void 0 : E.title) || p || "A quiet block for meaningful progress", fe = (E == null ? void 0 : E.description) || "", ye = !!(E && E.status !== "done");
  function ae(O) {
    const Z = O.currentTarget.getBoundingClientRect(), Q = Math.max(0, Math.min(100, (O.clientX - Z.left) / Z.width * 100)), N = Math.max(0, Math.min(100, (O.clientY - Z.top) / Z.height * 100));
    O.currentTarget.style.setProperty("--dock-light-x", `${Q}%`), O.currentTarget.style.setProperty("--dock-light-y", `${N}%`), O.currentTarget.style.setProperty("--glass-x", `${Q}%`), O.currentTarget.style.setProperty("--glass-y", `${N}%`);
  }
  function he(O) {
    O.currentTarget.style.setProperty("--dock-light-x", "50%"), O.currentTarget.style.setProperty("--dock-light-y", "0%"), O.currentTarget.style.setProperty("--glass-x", "50%"), O.currentTarget.style.setProperty("--glass-y", "0%");
  }
  return /* @__PURE__ */ w.jsxs(
    "div",
    {
      className: "focus-session-dock liquid-glass",
      "aria-label": "Focus session controls",
      onPointerMove: ae,
      onPointerLeave: he,
      children: [
        /* @__PURE__ */ w.jsxs("div", { className: "dock-timer-block", children: [
          /* @__PURE__ */ w.jsxs("div", { className: "dock-eyebrow", children: [
            "POMODORO #",
            (S == null ? void 0 : S.pomodoroNumber) || 1
          ] }),
          /* @__PURE__ */ w.jsxs("div", { className: "dock-status", children: [
            /* @__PURE__ */ w.jsx("span", { className: `dock-status-dot ${G || !W ? "is-paused" : ""}` }),
            J
          ] }),
          V ? /* @__PURE__ */ w.jsx(
            xP,
            {
              className: "dock-time-editor",
              valueSeconds: D,
              onChange: T,
              size: "dock",
              ariaLabel: "Set focus block length"
            }
          ) : /* @__PURE__ */ w.jsx("strong", { className: "dock-time", "aria-live": "off", children: X }),
          /* @__PURE__ */ w.jsx("div", { className: "dock-progress", "aria-hidden": "true", children: /* @__PURE__ */ w.jsx("span", { style: { width: `${_P(i, D)}%` } }) })
        ] }),
        /* @__PURE__ */ w.jsxs("div", { className: "dock-goal-block", "data-focus-active-topic": "true", children: [
          /* @__PURE__ */ w.jsx("span", { className: "dock-eyebrow", children: "ACTIVE TOPIC" }),
          /* @__PURE__ */ w.jsx("strong", { children: me }),
          fe ? /* @__PURE__ */ w.jsx("span", { className: "dock-goal-description", children: fe }) : null,
          /* @__PURE__ */ w.jsxs("span", { className: "dock-goal-meta", children: [
            f === "countup" ? "Count-up" : `${cf(D)} block`,
            " · ",
            cd(i),
            " focused"
          ] }),
          ye ? /* @__PURE__ */ w.jsxs(
            "button",
            {
              type: "button",
              className: "dock-topic-finish",
              onClick: () => b(E.id),
              "data-focus-topic-finish-dock": "true",
              "aria-label": "Mark active topic done and switch to the next",
              children: [
                /* @__PURE__ */ w.jsx(el, { size: 13, "aria-hidden": "true" }),
                "Done · next topic"
              ]
            }
          ) : null
        ] }),
        /* @__PURE__ */ w.jsxs("div", { className: "dock-action-block", children: [
          /* @__PURE__ */ w.jsxs(Te, { className: "dock-action-button", onClick: _, "aria-label": A ? "Pause room audio" : "Play room audio", children: [
            A ? /* @__PURE__ */ w.jsx(pd, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(tl, { size: 15, "aria-hidden": "true" }),
            /* @__PURE__ */ w.jsx("span", { children: n != null && n.playing ? "Pause audio" : "Audio" })
          ] }),
          /* @__PURE__ */ w.jsxs(Te, { className: "dock-action-button", onClick: () => W ? c() : l(), variant: "primary", "aria-label": ce, children: [
            W ? /* @__PURE__ */ w.jsx(pd, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(U0, { size: 15, fill: "currentColor", "aria-hidden": "true" }),
            /* @__PURE__ */ w.jsx("span", { children: G ? "Resume" : W ? "Pause" : "Start" })
          ] }),
          /* @__PURE__ */ w.jsxs(Te, { className: "dock-action-button", onClick: x, "aria-label": "Skip timer", children: [
            /* @__PURE__ */ w.jsx(K0, { size: 15, "aria-hidden": "true" }),
            /* @__PURE__ */ w.jsx("span", { children: "Skip" })
          ] }),
          /* @__PURE__ */ w.jsxs(Te, { className: "dock-action-button", onClick: g, "aria-label": "Reset timer", children: [
            /* @__PURE__ */ w.jsx(H0, { size: 15, "aria-hidden": "true" }),
            /* @__PURE__ */ w.jsx("span", { children: "Reset" })
          ] }),
          /* @__PURE__ */ w.jsxs(Te, { className: "dock-focus-mode", onClick: e, "aria-label": "Enter distraction-free Focus Mode", children: [
            /* @__PURE__ */ w.jsx(Wb, { size: 15, "aria-hidden": "true" }),
            /* @__PURE__ */ w.jsx("span", { children: "Focus Mode" })
          ] })
        ] })
      ]
    }
  );
}
function yt(e, n, { checkForDefaultPrevented: o = !0 } = {}) {
  return function(a) {
    if (e == null || e(a), o === !1 || !a || !a.defaultPrevented)
      return n == null ? void 0 : n(a);
  };
}
function fg(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function kP(...e) {
  return (n) => {
    let o = !1;
    const i = e.map((a) => {
      const d = fg(a, n);
      return !o && typeof d == "function" && (o = !0), d;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const d = i[a];
          typeof d == "function" ? d() : fg(e[a], null);
        }
      };
  };
}
function ut(...e) {
  return C.useCallback(kP(...e), e);
}
function df(e, n = []) {
  let o = [];
  function i(d, f) {
    const p = C.createContext(f);
    p.displayName = d + "Context";
    const m = o.length;
    o = [...o, f];
    const y = (l) => {
      var T;
      const { scope: c, children: g, ...x } = l, _ = ((T = c == null ? void 0 : c[e]) == null ? void 0 : T[m]) || p, A = C.useMemo(() => x, Object.values(x));
      return /* @__PURE__ */ w.jsx(_.Provider, { value: A, children: g });
    };
    y.displayName = d + "Provider";
    function S(l, c, g = {}) {
      var T;
      const { optional: x = !1 } = g, _ = ((T = c == null ? void 0 : c[e]) == null ? void 0 : T[m]) || p, A = C.useContext(_);
      if (A) return A;
      if (f !== void 0) return f;
      if (!x)
        throw new Error(`\`${l}\` must be used within \`${d}\``);
    }
    return [y, S];
  }
  const a = () => {
    const d = o.map((f) => C.createContext(f));
    return function(p) {
      const m = (p == null ? void 0 : p[e]) || d;
      return C.useMemo(
        () => ({ [`__scope${e}`]: { ...p, [e]: m } }),
        [p, m]
      );
    };
  };
  return a.scopeName = e, [i, AP(a, ...n)];
}
function AP(...e) {
  const n = e[0];
  if (e.length === 1) return n;
  const o = () => {
    const i = e.map((a) => ({
      useScope: a(),
      scopeName: a.scopeName
    }));
    return function(d) {
      const f = i.reduce((p, { useScope: m, scopeName: y }) => {
        const l = m(d)[`__scope${y}`];
        return { ...p, ...l };
      }, {});
      return C.useMemo(() => ({ [`__scope${n.scopeName}`]: f }), [f]);
    };
  };
  return o.scopeName = n.scopeName, o;
}
var uo = globalThis != null && globalThis.document ? C.useLayoutEffect : () => {
}, CP = kd[" useId ".trim().toString()] || (() => {
}), bP = 0;
function Tc(e) {
  const [n, o] = C.useState(CP());
  return uo(() => {
    o((i) => i ?? String(bP++));
  }, [e]), e || (n ? `radix-${n}` : "");
}
var PP = kd[" useInsertionEffect ".trim().toString()] || uo;
function J0({
  prop: e,
  defaultProp: n,
  onChange: o = () => {
  },
  caller: i
}) {
  const [a, d, f] = EP({
    defaultProp: n,
    onChange: o
  }), p = e !== void 0, m = p ? e : a;
  {
    const S = C.useRef(e !== void 0);
    C.useEffect(() => {
      const l = S.current;
      l !== p && console.warn(
        `${i} is changing from ${l ? "controlled" : "uncontrolled"} to ${p ? "controlled" : "uncontrolled"}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
      ), S.current = p;
    }, [p, i]);
  }
  const y = C.useCallback(
    (S) => {
      var l;
      if (p) {
        const c = MP(S) ? S(e) : S;
        c !== e && ((l = f.current) == null || l.call(f, c));
      } else
        d(S);
    },
    [p, e, d, f]
  );
  return [m, y];
}
function EP({
  defaultProp: e,
  onChange: n
}) {
  const [o, i] = C.useState(e), a = C.useRef(o), d = C.useRef(n);
  return PP(() => {
    d.current = n;
  }, [n]), C.useEffect(() => {
    var f;
    a.current !== o && ((f = d.current) == null || f.call(d, o), a.current = o);
  }, [o, a]), [o, i, d];
}
function MP(e) {
  return typeof e == "function";
}
var eS = Og();
// @__NO_SIDE_EFFECTS__
function Ua(e) {
  const n = C.forwardRef((o, i) => {
    let { children: a, ...d } = o, f = null, p = !1;
    const m = [];
    pg(a) && typeof Zs == "function" && (a = Zs(a._payload)), C.Children.forEach(a, (c) => {
      var g;
      if (IP(c)) {
        p = !0;
        const x = c;
        let _ = "child" in x.props ? x.props.child : x.props.children;
        pg(_) && typeof Zs == "function" && (_ = Zs(_._payload)), f = NP(x, _), m.push((g = f == null ? void 0 : f.props) == null ? void 0 : g.children);
      } else
        m.push(c);
    }), f ? f = C.cloneElement(f, void 0, m) : (
      // A `Slottable` was found but it didn't resolve to a single element (e.g.
      // it wrapped multiple elements, text, or a render-prop `child` that
      // wasn't an element). Don't fall back to treating the `Slottable` wrapper
      // itself as the slot target — throw a descriptive error below instead.
      !p && C.Children.count(a) === 1 && C.isValidElement(a) && (f = a)
    );
    const y = f ? jP(f) : void 0, S = ut(i, y);
    if (!f) {
      if (a || a === 0)
        throw new Error(
          p ? VP(e) : LP(e)
        );
      return a;
    }
    const l = DP(d, f.props ?? {});
    return f.type !== C.Fragment && (l.ref = i ? S : y), C.cloneElement(f, l);
  });
  return n.displayName = `${e}.Slot`, n;
}
var RP = Symbol.for("radix.slottable"), NP = (e, n) => {
  if ("child" in e.props) {
    const o = e.props.child;
    return C.isValidElement(o) ? C.cloneElement(o, void 0, e.props.children(o.props.children)) : null;
  }
  return C.isValidElement(n) ? n : null;
};
function DP(e, n) {
  const o = { ...n };
  for (const i in n) {
    const a = e[i], d = n[i];
    /^on[A-Z]/.test(i) ? a && d ? o[i] = (...p) => {
      const m = d(...p);
      return a(...p), m;
    } : a && (o[i] = a) : i === "style" ? o[i] = { ...a, ...d } : i === "className" && (o[i] = [a, d].filter(Boolean).join(" "));
  }
  return { ...e, ...o };
}
function jP(e) {
  var i, a;
  let n = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = n && "isReactWarning" in n && n.isReactWarning;
  return o ? e.ref : (n = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = n && "isReactWarning" in n && n.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
function IP(e) {
  return C.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === RP;
}
var FP = Symbol.for("react.lazy");
function pg(e) {
  return e != null && typeof e == "object" && "$$typeof" in e && e.$$typeof === FP && "_payload" in e && OP(e._payload);
}
function OP(e) {
  return typeof e == "object" && e !== null && "then" in e;
}
var LP = (e) => `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`, VP = (e) => `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`, Zs = kd[" use ".trim().toString()], zP = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "select",
  "span",
  "svg",
  "ul"
], vt = zP.reduce((e, n) => {
  const o = /* @__PURE__ */ Ua(`Primitive.${n}`), i = C.forwardRef((a, d) => {
    const { asChild: f, ...p } = a, m = f ? o : n;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ w.jsx(m, { ...p, ref: d });
  });
  return i.displayName = `Primitive.${n}`, { ...e, [n]: i };
}, {});
function BP(e, n) {
  e && eS.flushSync(() => e.dispatchEvent(n));
}
function ki(e) {
  const n = C.useRef(e);
  return C.useEffect(() => {
    n.current = e;
  }), C.useMemo(() => ((...o) => {
    var i;
    return (i = n.current) == null ? void 0 : i.call(n, ...o);
  }), []);
}
var $P = "DismissableLayer", gd = "dismissableLayer.update", UP = "dismissableLayer.pointerDownOutside", HP = "dismissableLayer.focusOutside", mg, ff = C.createContext({
  layers: /* @__PURE__ */ new Set(),
  layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
  branches: /* @__PURE__ */ new Set(),
  // Outside elements that belong to a layer's own dismiss affordance (eg, a
  // dialog overlay). Pressing them should dismiss the layer regardless of
  // whether or not they stop propagation.
  //
  // See https://github.com/radix-ui/primitives/issues/3346
  dismissableSurfaces: /* @__PURE__ */ new Set()
}), tS = C.forwardRef(
  (e, n) => {
    const {
      disableOutsidePointerEvents: o = !1,
      deferPointerDownOutside: i = !1,
      onEscapeKeyDown: a,
      onPointerDownOutside: d,
      onFocusOutside: f,
      onInteractOutside: p,
      onDismiss: m,
      ...y
    } = e, S = C.useContext(ff), [l, c] = C.useState(null), g = (l == null ? void 0 : l.ownerDocument) ?? (globalThis == null ? void 0 : globalThis.document), [, x] = C.useState({}), _ = ut(n, c), A = Array.from(S.layers), [T] = [
      ...S.layersWithOutsidePointerEventsDisabled
    ].slice(-1), b = T ? A.indexOf(T) : -1, E = l ? A.indexOf(l) : -1, D = S.layersWithOutsidePointerEventsDisabled.size > 0, L = E >= b, G = C.useRef(!1), W = QP(
      (J) => {
        d == null || d(J), p == null || p(J), J.defaultPrevented || m == null || m();
      },
      {
        ownerDocument: g,
        deferPointerDownOutside: i,
        isDeferredPointerDownOutsideRef: G,
        dismissableSurfaces: S.dismissableSurfaces,
        shouldHandlePointerDownOutside: C.useCallback(
          (J) => {
            if (!(J instanceof Node))
              return !1;
            const ce = [...S.branches].some(
              (me) => me.contains(J)
            );
            return L && !ce;
          },
          [S.branches, L]
        )
      }
    ), H = XP((J) => {
      if (i && G.current)
        return;
      const ce = J.target;
      [...S.branches].some((fe) => fe.contains(ce)) || (f == null || f(J), p == null || p(J), J.defaultPrevented || m == null || m());
    }, g), V = l ? E === A.length - 1 : !1, X = ki((J) => {
      J.key === "Escape" && (a == null || a(J), !J.defaultPrevented && m && (J.preventDefault(), m()));
    });
    return C.useEffect(() => {
      if (V)
        return g.addEventListener("keydown", X, { capture: !0 }), () => g.removeEventListener("keydown", X, { capture: !0 });
    }, [g, V, X]), C.useEffect(() => {
      if (l)
        return o && (S.layersWithOutsidePointerEventsDisabled.size === 0 && (mg = g.body.style.pointerEvents, g.body.style.pointerEvents = "none"), S.layersWithOutsidePointerEventsDisabled.add(l)), S.layers.add(l), hg(), () => {
          o && (S.layersWithOutsidePointerEventsDisabled.delete(l), S.layersWithOutsidePointerEventsDisabled.size === 0 && (g.body.style.pointerEvents = mg));
        };
    }, [l, g, o, S]), C.useEffect(() => () => {
      l && (S.layers.delete(l), S.layersWithOutsidePointerEventsDisabled.delete(l), hg());
    }, [l, S]), C.useEffect(() => {
      const J = () => x({});
      return document.addEventListener(gd, J), () => document.removeEventListener(gd, J);
    }, []), /* @__PURE__ */ w.jsx(
      vt.div,
      {
        ...y,
        ref: _,
        style: {
          pointerEvents: D ? L ? "auto" : "none" : void 0,
          ...e.style
        },
        onFocusCapture: yt(e.onFocusCapture, H.onFocusCapture),
        onBlurCapture: yt(e.onBlurCapture, H.onBlurCapture),
        onPointerDownCapture: yt(
          e.onPointerDownCapture,
          W.onPointerDownCapture
        )
      }
    );
  }
);
tS.displayName = $P;
var WP = "DismissableLayerBranch", GP = C.forwardRef((e, n) => {
  const o = C.useContext(ff), i = C.useRef(null), a = ut(n, i);
  return C.useEffect(() => {
    const d = i.current;
    if (d)
      return o.branches.add(d), () => {
        o.branches.delete(d);
      };
  }, [o.branches]), /* @__PURE__ */ w.jsx(vt.div, { ...e, ref: a });
});
GP.displayName = WP;
function KP() {
  const e = C.useContext(ff), [n, o] = C.useState(null);
  return C.useEffect(() => {
    if (n)
      return e.dismissableSurfaces.add(n), () => {
        e.dismissableSurfaces.delete(n);
      };
  }, [n, e.dismissableSurfaces]), o;
}
var YP = () => !0;
function QP(e, n) {
  const {
    ownerDocument: o = globalThis == null ? void 0 : globalThis.document,
    deferPointerDownOutside: i = !1,
    isDeferredPointerDownOutsideRef: a,
    dismissableSurfaces: d,
    shouldHandlePointerDownOutside: f = YP
  } = n, p = ki(e), m = C.useRef(!1), y = C.useRef(!1), S = C.useRef(/* @__PURE__ */ new Map()), l = C.useRef(() => {
  });
  return C.useEffect(() => {
    function c() {
      y.current = !1, a.current = !1, S.current.clear();
    }
    function g() {
      return Array.from(S.current.values()).some(Boolean);
    }
    function x(E) {
      if (!y.current)
        return;
      const D = E.target;
      D instanceof Node && [...d].some((G) => G.contains(D)) || S.current.set(E.type, !0), E.type === "click" && window.setTimeout(() => {
        y.current && l.current();
      }, 0);
    }
    function _(E) {
      y.current && S.current.set(E.type, !1);
    }
    const A = (E) => {
      if (E.target && !m.current) {
        let D = function() {
          o.removeEventListener("click", l.current);
          const G = g();
          c(), G || nS(
            UP,
            p,
            L,
            { discrete: !0 }
          );
        };
        if (!f(E.target)) {
          o.removeEventListener("click", l.current), c(), m.current = !1;
          return;
        }
        const L = { originalEvent: E };
        y.current = !0, a.current = i && E.button === 0, S.current.clear(), !i || E.button !== 0 ? D() : (o.removeEventListener("click", l.current), l.current = D, o.addEventListener("click", l.current, { once: !0 }));
      } else
        o.removeEventListener("click", l.current), c();
      m.current = !1;
    }, T = [
      "pointerup",
      "mousedown",
      "mouseup",
      "touchstart",
      "touchend",
      "click"
    ];
    for (const E of T)
      o.addEventListener(E, x, !0), o.addEventListener(E, _);
    const b = window.setTimeout(() => {
      o.addEventListener("pointerdown", A);
    }, 0);
    return () => {
      window.clearTimeout(b), o.removeEventListener("pointerdown", A), o.removeEventListener("click", l.current);
      for (const E of T)
        o.removeEventListener(E, x, !0), o.removeEventListener(E, _);
    };
  }, [
    o,
    p,
    i,
    a,
    d,
    f
  ]), {
    // ensures we check React component tree (not just DOM tree)
    onPointerDownCapture: () => m.current = !0
  };
}
function XP(e, n = globalThis == null ? void 0 : globalThis.document) {
  const o = ki(e), i = C.useRef(!1);
  return C.useEffect(() => {
    const a = (d) => {
      d.target && !i.current && nS(HP, o, { originalEvent: d }, {
        discrete: !1
      });
    };
    return n.addEventListener("focusin", a), () => n.removeEventListener("focusin", a);
  }, [n, o]), {
    onFocusCapture: () => i.current = !0,
    onBlurCapture: () => i.current = !1
  };
}
function hg() {
  const e = new CustomEvent(gd);
  document.dispatchEvent(e);
}
function nS(e, n, o, { discrete: i }) {
  const a = o.originalEvent.target, d = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: o });
  n && a.addEventListener(e, n, { once: !0 }), i ? BP(a, d) : a.dispatchEvent(d);
}
var kc = "focusScope.autoFocusOnMount", Ac = "focusScope.autoFocusOnUnmount", yg = { bubbles: !1, cancelable: !0 }, ZP = "FocusScope", rS = C.forwardRef((e, n) => {
  const {
    loop: o = !1,
    trapped: i = !1,
    onMountAutoFocus: a,
    onUnmountAutoFocus: d,
    ...f
  } = e, [p, m] = C.useState(null), y = ki(a), S = ki(d), l = C.useRef(null), c = ut(n, m), g = C.useRef({
    paused: !1,
    pause() {
      this.paused = !0;
    },
    resume() {
      this.paused = !1;
    }
  }).current;
  C.useEffect(() => {
    if (i) {
      let _ = function(E) {
        if (g.paused || !p) return;
        const D = E.target;
        p.contains(D) ? l.current = D : Bn(l.current, { select: !0 });
      }, A = function(E) {
        if (g.paused || !p) return;
        const D = E.relatedTarget;
        D !== null && (p.contains(D) || Bn(l.current, { select: !0 }));
      }, T = function(E) {
        if (document.activeElement === document.body)
          for (const L of E)
            L.removedNodes.length > 0 && Bn(p);
      };
      document.addEventListener("focusin", _), document.addEventListener("focusout", A);
      const b = new MutationObserver(T);
      return p && b.observe(p, { childList: !0, subtree: !0 }), () => {
        document.removeEventListener("focusin", _), document.removeEventListener("focusout", A), b.disconnect();
      };
    }
  }, [i, p, g.paused]), C.useEffect(() => {
    if (p) {
      vg.add(g);
      const _ = document.activeElement;
      if (!p.contains(_)) {
        const T = new CustomEvent(kc, yg);
        p.addEventListener(kc, y), p.dispatchEvent(T), T.defaultPrevented || (qP(rE(oS(p)), { select: !0 }), document.activeElement === _ && Bn(p));
      }
      return () => {
        p.removeEventListener(kc, y), setTimeout(() => {
          const T = new CustomEvent(Ac, yg);
          p.addEventListener(Ac, S), p.dispatchEvent(T), T.defaultPrevented || Bn(_ ?? document.body, { select: !0 }), p.removeEventListener(Ac, S), vg.remove(g);
        }, 0);
      };
    }
  }, [p, y, S, g]);
  const x = C.useCallback(
    (_) => {
      if (!o && !i || g.paused) return;
      const A = _.key === "Tab" && !_.altKey && !_.ctrlKey && !_.metaKey, T = document.activeElement;
      if (A && T) {
        const b = _.currentTarget, [E, D] = JP(b);
        E && D ? !_.shiftKey && T === D ? (_.preventDefault(), o && Bn(E, { select: !0 })) : _.shiftKey && T === E && (_.preventDefault(), o && Bn(D, { select: !0 })) : T === b && _.preventDefault();
      }
    },
    [o, i, g.paused]
  );
  return /* @__PURE__ */ w.jsx(vt.div, { tabIndex: -1, ...f, ref: c, onKeyDown: x });
});
rS.displayName = ZP;
function qP(e, { select: n = !1 } = {}) {
  const o = document.activeElement;
  for (const i of e)
    if (Bn(i, { select: n }), document.activeElement !== o) return;
}
function JP(e) {
  const n = oS(e), o = gg(n, e), i = gg(n.reverse(), e);
  return [o, i];
}
function oS(e) {
  const n = [], o = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (i) => {
      const a = i.tagName === "INPUT" && i.type === "hidden";
      return i.disabled || i.hidden || a ? NodeFilter.FILTER_SKIP : i.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  for (; o.nextNode(); ) n.push(o.currentNode);
  return n;
}
function gg(e, n) {
  const o = typeof n.checkVisibility == "function" && n.checkVisibility({ checkVisibilityCSS: !0 });
  for (const i of e)
    if (!(o ? !i.checkVisibility({ checkVisibilityCSS: !0 }) : eE(i, { upTo: n })))
      return i;
}
function eE(e, { upTo: n }) {
  if (getComputedStyle(e).visibility === "hidden") return !0;
  for (; e; ) {
    if (n !== void 0 && e === n) return !1;
    if (getComputedStyle(e).display === "none") return !0;
    e = e.parentElement;
  }
  return !1;
}
function tE(e) {
  return e instanceof HTMLInputElement && "select" in e;
}
function Bn(e, { select: n = !1 } = {}) {
  if (e && e.focus) {
    const o = document.activeElement;
    e.focus({ preventScroll: !0 }), e !== o && tE(e) && n && e.select();
  }
}
var vg = nE();
function nE() {
  let e = [];
  return {
    add(n) {
      const o = e[0];
      n !== o && (o == null || o.pause()), e = Sg(e, n), e.unshift(n);
    },
    remove(n) {
      var o;
      e = Sg(e, n), (o = e[0]) == null || o.resume();
    }
  };
}
function Sg(e, n) {
  const o = [...e], i = o.indexOf(n);
  return i !== -1 && o.splice(i, 1), o;
}
function rE(e) {
  return e.filter((n) => n.tagName !== "A");
}
var oE = "Portal", iS = C.forwardRef((e, n) => {
  var p;
  const { container: o, ...i } = e, [a, d] = C.useState(!1);
  uo(() => d(!0), []);
  const f = o || a && ((p = globalThis == null ? void 0 : globalThis.document) == null ? void 0 : p.body);
  return f ? eS.createPortal(/* @__PURE__ */ w.jsx(vt.div, { ...i, ref: n }), f) : null;
});
iS.displayName = oE;
function iE(e, n) {
  return C.useReducer((o, i) => n[o][i] ?? o, e);
}
var nl = (e) => {
  const { present: n, children: o } = e, i = sE(n), a = typeof o == "function" ? o({ present: i.isPresent }) : C.Children.only(o), d = aE(i.ref, lE(a));
  return typeof o == "function" || i.isPresent ? C.cloneElement(a, { ref: d }) : null;
};
nl.displayName = "Presence";
function sE(e) {
  const [n, o] = C.useState(), i = C.useRef(null), a = C.useRef(e), d = C.useRef("none"), f = C.useRef(void 0), p = e ? "mounted" : "unmounted", [m, y] = iE(p, {
    mounted: {
      UNMOUNT: "unmounted",
      ANIMATION_OUT: "unmountSuspended"
    },
    unmountSuspended: {
      MOUNT: "mounted",
      ANIMATION_END: "unmounted"
    },
    unmounted: {
      MOUNT: "mounted"
    }
  });
  return C.useEffect(() => {
    m === "mounted" ? (d.current = f.current ?? oi(i.current), f.current = void 0) : d.current = "none";
  }, [m]), uo(() => {
    const S = i.current, l = a.current;
    if (l !== e) {
      const g = d.current, x = oi(S);
      e ? (f.current = x, y("MOUNT")) : x === "none" || (S == null ? void 0 : S.display) === "none" ? y("UNMOUNT") : y(l && g !== x ? "ANIMATION_OUT" : "UNMOUNT"), a.current = e;
    }
  }, [e, y]), uo(() => {
    if (n) {
      let S;
      const l = n.ownerDocument.defaultView ?? window, c = (x) => {
        const A = oi(i.current).includes(CSS.escape(x.animationName));
        if (x.target === n && A && (y("ANIMATION_END"), !a.current)) {
          const T = n.style.animationFillMode;
          n.style.animationFillMode = "forwards", S = l.setTimeout(() => {
            n.style.animationFillMode === "forwards" && (n.style.animationFillMode = T);
          });
        }
      }, g = (x) => {
        x.target === n && (d.current = oi(i.current));
      };
      return n.addEventListener("animationstart", g), n.addEventListener("animationcancel", c), n.addEventListener("animationend", c), () => {
        l.clearTimeout(S), n.removeEventListener("animationstart", g), n.removeEventListener("animationcancel", c), n.removeEventListener("animationend", c);
      };
    } else
      y("ANIMATION_END");
  }, [n, y]), {
    isPresent: ["mounted", "unmountSuspended"].includes(m),
    ref: C.useCallback((S) => {
      if (S) {
        const l = getComputedStyle(S);
        i.current = l, f.current = oi(l);
      } else
        i.current = null;
      o(S);
    }, [])
  };
}
function wg(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function aE(...e) {
  const n = C.useRef(e);
  return n.current = e, C.useCallback((o) => {
    const i = n.current;
    let a = !1;
    const d = i.map((f) => {
      const p = wg(f, o);
      return !a && typeof p == "function" && (a = !0), p;
    });
    if (a)
      return () => {
        for (let f = 0; f < d.length; f++) {
          const p = d[f];
          typeof p == "function" ? p() : wg(i[f], null);
        }
      };
  }, []);
}
function oi(e) {
  return (e == null ? void 0 : e.animationName) || "none";
}
function lE(e) {
  var i, a;
  let n = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = n && "isReactWarning" in n && n.isReactWarning;
  return o ? e.ref : (n = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = n && "isReactWarning" in n && n.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
var qs = 0, qt = null;
function uE() {
  C.useEffect(() => {
    qt || (qt = { start: xg(), end: xg() });
    const { start: e, end: n } = qt;
    return document.body.firstElementChild !== e && document.body.insertAdjacentElement("afterbegin", e), document.body.lastElementChild !== n && document.body.insertAdjacentElement("beforeend", n), qs++, () => {
      qs === 1 && (qt == null || qt.start.remove(), qt == null || qt.end.remove(), qt = null), qs = Math.max(0, qs - 1);
    };
  }, []);
}
function xg() {
  const e = document.createElement("span");
  return e.setAttribute("data-radix-focus-guard", ""), e.tabIndex = 0, e.style.outline = "none", e.style.opacity = "0", e.style.position = "fixed", e.style.pointerEvents = "none", e;
}
var tn = function() {
  return tn = Object.assign || function(n) {
    for (var o, i = 1, a = arguments.length; i < a; i++) {
      o = arguments[i];
      for (var d in o) Object.prototype.hasOwnProperty.call(o, d) && (n[d] = o[d]);
    }
    return n;
  }, tn.apply(this, arguments);
};
function sS(e, n) {
  var o = {};
  for (var i in e) Object.prototype.hasOwnProperty.call(e, i) && n.indexOf(i) < 0 && (o[i] = e[i]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var a = 0, i = Object.getOwnPropertySymbols(e); a < i.length; a++)
      n.indexOf(i[a]) < 0 && Object.prototype.propertyIsEnumerable.call(e, i[a]) && (o[i[a]] = e[i[a]]);
  return o;
}
function cE(e, n, o) {
  if (o || arguments.length === 2) for (var i = 0, a = n.length, d; i < a; i++)
    (d || !(i in n)) && (d || (d = Array.prototype.slice.call(n, 0, i)), d[i] = n[i]);
  return e.concat(d || Array.prototype.slice.call(n));
}
var ha = "right-scroll-bar-position", ya = "width-before-scroll-bar", dE = "with-scroll-bars-hidden", fE = "--removed-body-scroll-bar-size";
function Cc(e, n) {
  return typeof e == "function" ? e(n) : e && (e.current = n), e;
}
function pE(e, n) {
  var o = C.useState(function() {
    return {
      // value
      value: e,
      // last callback
      callback: n,
      // "memoized" public interface
      facade: {
        get current() {
          return o.value;
        },
        set current(i) {
          var a = o.value;
          a !== i && (o.value = i, o.callback(i, a));
        }
      }
    };
  })[0];
  return o.callback = n, o.facade;
}
var mE = typeof window < "u" ? C.useLayoutEffect : C.useEffect, _g = /* @__PURE__ */ new WeakMap();
function hE(e, n) {
  var o = pE(null, function(i) {
    return e.forEach(function(a) {
      return Cc(a, i);
    });
  });
  return mE(function() {
    var i = _g.get(o);
    if (i) {
      var a = new Set(i), d = new Set(e), f = o.current;
      a.forEach(function(p) {
        d.has(p) || Cc(p, null);
      }), d.forEach(function(p) {
        a.has(p) || Cc(p, f);
      });
    }
    _g.set(o, e);
  }, [e]), o;
}
function yE(e) {
  return e;
}
function gE(e, n) {
  n === void 0 && (n = yE);
  var o = [], i = !1, a = {
    read: function() {
      if (i)
        throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");
      return o.length ? o[o.length - 1] : e;
    },
    useMedium: function(d) {
      var f = n(d, i);
      return o.push(f), function() {
        o = o.filter(function(p) {
          return p !== f;
        });
      };
    },
    assignSyncMedium: function(d) {
      for (i = !0; o.length; ) {
        var f = o;
        o = [], f.forEach(d);
      }
      o = {
        push: function(p) {
          return d(p);
        },
        filter: function() {
          return o;
        }
      };
    },
    assignMedium: function(d) {
      i = !0;
      var f = [];
      if (o.length) {
        var p = o;
        o = [], p.forEach(d), f = o;
      }
      var m = function() {
        var S = f;
        f = [], S.forEach(d);
      }, y = function() {
        return Promise.resolve().then(m);
      };
      y(), o = {
        push: function(S) {
          f.push(S), y();
        },
        filter: function(S) {
          return f = f.filter(S), o;
        }
      };
    }
  };
  return a;
}
function vE(e) {
  e === void 0 && (e = {});
  var n = gE(null);
  return n.options = tn({ async: !0, ssr: !1 }, e), n;
}
var aS = function(e) {
  var n = e.sideCar, o = sS(e, ["sideCar"]);
  if (!n)
    throw new Error("Sidecar: please provide `sideCar` property to import the right car");
  var i = n.read();
  if (!i)
    throw new Error("Sidecar medium not found");
  return C.createElement(i, tn({}, o));
};
aS.isSideCarExport = !0;
function SE(e, n) {
  return e.useMedium(n), aS;
}
var lS = vE(), bc = function() {
}, rl = C.forwardRef(function(e, n) {
  var o = C.useRef(null), i = C.useState({
    onScrollCapture: bc,
    onWheelCapture: bc,
    onTouchMoveCapture: bc
  }), a = i[0], d = i[1], f = e.forwardProps, p = e.children, m = e.className, y = e.removeScrollBar, S = e.enabled, l = e.shards, c = e.sideCar, g = e.noRelative, x = e.noIsolation, _ = e.inert, A = e.allowPinchZoom, T = e.as, b = T === void 0 ? "div" : T, E = e.gapMode, D = sS(e, ["forwardProps", "children", "className", "removeScrollBar", "enabled", "shards", "sideCar", "noRelative", "noIsolation", "inert", "allowPinchZoom", "as", "gapMode"]), L = c, G = hE([o, n]), W = tn(tn({}, D), a);
  return C.createElement(
    C.Fragment,
    null,
    S && C.createElement(L, { sideCar: lS, removeScrollBar: y, shards: l, noRelative: g, noIsolation: x, inert: _, setCallbacks: d, allowPinchZoom: !!A, lockRef: o, gapMode: E }),
    f ? C.cloneElement(C.Children.only(p), tn(tn({}, W), { ref: G })) : C.createElement(b, tn({}, W, { className: m, ref: G }), p)
  );
});
rl.defaultProps = {
  enabled: !0,
  removeScrollBar: !0,
  inert: !1
};
rl.classNames = {
  fullWidth: ya,
  zeroRight: ha
};
var wE = function() {
  if (typeof __webpack_nonce__ < "u")
    return __webpack_nonce__;
};
function xE() {
  if (!document)
    return null;
  var e = document.createElement("style");
  e.type = "text/css";
  var n = wE();
  return n && e.setAttribute("nonce", n), e;
}
function _E(e, n) {
  e.styleSheet ? e.styleSheet.cssText = n : e.appendChild(document.createTextNode(n));
}
function TE(e) {
  var n = document.head || document.getElementsByTagName("head")[0];
  n.appendChild(e);
}
var kE = function() {
  var e = 0, n = null;
  return {
    add: function(o) {
      e == 0 && (n = xE()) && (_E(n, o), TE(n)), e++;
    },
    remove: function() {
      e--, !e && n && (n.parentNode && n.parentNode.removeChild(n), n = null);
    }
  };
}, AE = function() {
  var e = kE();
  return function(n, o) {
    C.useEffect(function() {
      return e.add(n), function() {
        e.remove();
      };
    }, [n && o]);
  };
}, uS = function() {
  var e = AE(), n = function(o) {
    var i = o.styles, a = o.dynamic;
    return e(i, a), null;
  };
  return n;
}, CE = {
  left: 0,
  top: 0,
  right: 0,
  gap: 0
}, Pc = function(e) {
  return parseInt(e || "", 10) || 0;
}, bE = function(e) {
  var n = window.getComputedStyle(document.body), o = n[e === "padding" ? "paddingLeft" : "marginLeft"], i = n[e === "padding" ? "paddingTop" : "marginTop"], a = n[e === "padding" ? "paddingRight" : "marginRight"];
  return [Pc(o), Pc(i), Pc(a)];
}, PE = function(e) {
  if (e === void 0 && (e = "margin"), typeof window > "u")
    return CE;
  var n = bE(e), o = document.documentElement.clientWidth, i = window.innerWidth;
  return {
    left: n[0],
    top: n[1],
    right: n[2],
    gap: Math.max(0, i - o + n[2] - n[0])
  };
}, EE = uS(), so = "data-scroll-locked", ME = function(e, n, o, i) {
  var a = e.left, d = e.top, f = e.right, p = e.gap;
  return o === void 0 && (o = "margin"), `
  .`.concat(dE, ` {
   overflow: hidden `).concat(i, `;
   padding-right: `).concat(p, "px ").concat(i, `;
  }
  body[`).concat(so, `] {
    overflow: hidden `).concat(i, `;
    overscroll-behavior: contain;
    `).concat([
    n && "position: relative ".concat(i, ";"),
    o === "margin" && `
    padding-left: `.concat(a, `px;
    padding-top: `).concat(d, `px;
    padding-right: `).concat(f, `px;
    margin-left:0;
    margin-top:0;
    margin-right: `).concat(p, "px ").concat(i, `;
    `),
    o === "padding" && "padding-right: ".concat(p, "px ").concat(i, ";")
  ].filter(Boolean).join(""), `
  }
  
  .`).concat(ha, ` {
    right: `).concat(p, "px ").concat(i, `;
  }
  
  .`).concat(ya, ` {
    margin-right: `).concat(p, "px ").concat(i, `;
  }
  
  .`).concat(ha, " .").concat(ha, ` {
    right: 0 `).concat(i, `;
  }
  
  .`).concat(ya, " .").concat(ya, ` {
    margin-right: 0 `).concat(i, `;
  }
  
  body[`).concat(so, `] {
    `).concat(fE, ": ").concat(p, `px;
  }
`);
}, Tg = function() {
  var e = parseInt(document.body.getAttribute(so) || "0", 10);
  return isFinite(e) ? e : 0;
}, RE = function() {
  C.useEffect(function() {
    return document.body.setAttribute(so, (Tg() + 1).toString()), function() {
      var e = Tg() - 1;
      e <= 0 ? document.body.removeAttribute(so) : document.body.setAttribute(so, e.toString());
    };
  }, []);
}, NE = function(e) {
  var n = e.noRelative, o = e.noImportant, i = e.gapMode, a = i === void 0 ? "margin" : i;
  RE();
  var d = C.useMemo(function() {
    return PE(a);
  }, [a]);
  return C.createElement(EE, { styles: ME(d, !n, a, o ? "" : "!important") });
}, vd = !1;
if (typeof window < "u")
  try {
    var Js = Object.defineProperty({}, "passive", {
      get: function() {
        return vd = !0, !0;
      }
    });
    window.addEventListener("test", Js, Js), window.removeEventListener("test", Js, Js);
  } catch {
    vd = !1;
  }
var qr = vd ? { passive: !1 } : !1, DE = function(e) {
  return e.tagName === "TEXTAREA";
}, cS = function(e, n) {
  if (!(e instanceof Element))
    return !1;
  var o = window.getComputedStyle(e);
  return (
    // not-not-scrollable
    o[n] !== "hidden" && // contains scroll inside self
    !(o.overflowY === o.overflowX && !DE(e) && o[n] === "visible")
  );
}, jE = function(e) {
  return cS(e, "overflowY");
}, IE = function(e) {
  return cS(e, "overflowX");
}, kg = function(e, n) {
  var o = n.ownerDocument, i = n;
  do {
    typeof ShadowRoot < "u" && i instanceof ShadowRoot && (i = i.host);
    var a = dS(e, i);
    if (a) {
      var d = fS(e, i), f = d[1], p = d[2];
      if (f > p)
        return !0;
    }
    i = i.parentNode;
  } while (i && i !== o.body);
  return !1;
}, FE = function(e) {
  var n = e.scrollTop, o = e.scrollHeight, i = e.clientHeight;
  return [
    n,
    o,
    i
  ];
}, OE = function(e) {
  var n = e.scrollLeft, o = e.scrollWidth, i = e.clientWidth;
  return [
    n,
    o,
    i
  ];
}, dS = function(e, n) {
  return e === "v" ? jE(n) : IE(n);
}, fS = function(e, n) {
  return e === "v" ? FE(n) : OE(n);
}, LE = function(e, n) {
  return e === "h" && n === "rtl" ? -1 : 1;
}, VE = function(e, n, o, i, a) {
  var d = LE(e, window.getComputedStyle(n).direction), f = d * i, p = o.target, m = n.contains(p), y = !1, S = f > 0, l = 0, c = 0;
  do {
    if (!p)
      break;
    var g = fS(e, p), x = g[0], _ = g[1], A = g[2], T = _ - A - d * x;
    (x || T) && dS(e, p) && (l += T, c += x);
    var b = p.parentNode;
    p = b && b.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? b.host : b;
  } while (
    // portaled content
    !m && p !== document.body || // self content
    m && (n.contains(p) || n === p)
  );
  return (S && Math.abs(l) < 1 || !S && Math.abs(c) < 1) && (y = !0), y;
}, ea = function(e) {
  return "changedTouches" in e ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY] : [0, 0];
}, Ag = function(e) {
  return [e.deltaX, e.deltaY];
}, Cg = function(e) {
  return e && "current" in e ? e.current : e;
}, zE = function(e, n) {
  return e[0] === n[0] && e[1] === n[1];
}, BE = function(e) {
  return `
  .block-interactivity-`.concat(e, ` {pointer-events: none;}
  .allow-interactivity-`).concat(e, ` {pointer-events: all;}
`);
}, $E = 0, Jr = [];
function UE(e) {
  var n = C.useRef([]), o = C.useRef([0, 0]), i = C.useRef(), a = C.useState($E++)[0], d = C.useState(uS)[0], f = C.useRef(e);
  C.useEffect(function() {
    f.current = e;
  }, [e]), C.useEffect(function() {
    if (e.inert) {
      document.body.classList.add("block-interactivity-".concat(a));
      var _ = cE([e.lockRef.current], (e.shards || []).map(Cg), !0).filter(Boolean);
      return _.forEach(function(A) {
        return A.classList.add("allow-interactivity-".concat(a));
      }), function() {
        document.body.classList.remove("block-interactivity-".concat(a)), _.forEach(function(A) {
          return A.classList.remove("allow-interactivity-".concat(a));
        });
      };
    }
  }, [e.inert, e.lockRef.current, e.shards]);
  var p = C.useCallback(function(_, A) {
    if ("touches" in _ && _.touches.length === 2 || _.type === "wheel" && _.ctrlKey)
      return !f.current.allowPinchZoom;
    var T = ea(_), b = o.current, E = "deltaX" in _ ? _.deltaX : b[0] - T[0], D = "deltaY" in _ ? _.deltaY : b[1] - T[1], L, G = _.target, W = Math.abs(E) > Math.abs(D) ? "h" : "v";
    if ("touches" in _ && W === "h" && G.type === "range")
      return !1;
    var H = window.getSelection(), V = H && H.anchorNode, X = V ? V === G || V.contains(G) : !1;
    if (X)
      return !1;
    var J = kg(W, G);
    if (!J)
      return !0;
    if (J ? L = W : (L = W === "v" ? "h" : "v", J = kg(W, G)), !J)
      return !1;
    if (!i.current && "changedTouches" in _ && (E || D) && (i.current = L), !L)
      return !0;
    var ce = i.current || L;
    return VE(ce, A, _, ce === "h" ? E : D);
  }, []), m = C.useCallback(function(_) {
    var A = _;
    if (!(!Jr.length || Jr[Jr.length - 1] !== d)) {
      var T = "deltaY" in A ? Ag(A) : ea(A), b = n.current.filter(function(L) {
        return L.name === A.type && (L.target === A.target || A.target === L.shadowParent) && zE(L.delta, T);
      })[0];
      if (b && b.should) {
        A.cancelable && A.preventDefault();
        return;
      }
      if (!b) {
        var E = (f.current.shards || []).map(Cg).filter(Boolean).filter(function(L) {
          return L.contains(A.target);
        }), D = E.length > 0 ? p(A, E[0]) : !f.current.noIsolation;
        D && A.cancelable && A.preventDefault();
      }
    }
  }, []), y = C.useCallback(function(_, A, T, b) {
    var E = { name: _, delta: A, target: T, should: b, shadowParent: HE(T) };
    n.current.push(E), setTimeout(function() {
      n.current = n.current.filter(function(D) {
        return D !== E;
      });
    }, 1);
  }, []), S = C.useCallback(function(_) {
    o.current = ea(_), i.current = void 0;
  }, []), l = C.useCallback(function(_) {
    y(_.type, Ag(_), _.target, p(_, e.lockRef.current));
  }, []), c = C.useCallback(function(_) {
    y(_.type, ea(_), _.target, p(_, e.lockRef.current));
  }, []);
  C.useEffect(function() {
    return Jr.push(d), e.setCallbacks({
      onScrollCapture: l,
      onWheelCapture: l,
      onTouchMoveCapture: c
    }), document.addEventListener("wheel", m, qr), document.addEventListener("touchmove", m, qr), document.addEventListener("touchstart", S, qr), function() {
      Jr = Jr.filter(function(_) {
        return _ !== d;
      }), document.removeEventListener("wheel", m, qr), document.removeEventListener("touchmove", m, qr), document.removeEventListener("touchstart", S, qr);
    };
  }, []);
  var g = e.removeScrollBar, x = e.inert;
  return C.createElement(
    C.Fragment,
    null,
    x ? C.createElement(d, { styles: BE(a) }) : null,
    g ? C.createElement(NE, { noRelative: e.noRelative, gapMode: e.gapMode }) : null
  );
}
function HE(e) {
  for (var n = null; e !== null; )
    e instanceof ShadowRoot && (n = e.host, e = e.host), e = e.parentNode;
  return n;
}
const WE = SE(lS, UE);
var pS = C.forwardRef(function(e, n) {
  return C.createElement(rl, tn({}, e, { ref: n, sideCar: WE }));
});
pS.classNames = rl.classNames;
var GE = function(e) {
  if (typeof document > "u")
    return null;
  var n = Array.isArray(e) ? e[0] : e;
  return n.ownerDocument.body;
}, eo = /* @__PURE__ */ new WeakMap(), ta = /* @__PURE__ */ new WeakMap(), na = {}, Ec = 0, mS = function(e) {
  return e && (e.host || mS(e.parentNode));
}, KE = function(e, n) {
  return n.map(function(o) {
    if (e.contains(o))
      return o;
    var i = mS(o);
    return i && e.contains(i) ? i : (console.error("aria-hidden", o, "in not contained inside", e, ". Doing nothing"), null);
  }).filter(function(o) {
    return !!o;
  });
}, YE = function(e, n, o, i) {
  var a = KE(n, Array.isArray(e) ? e : [e]);
  na[o] || (na[o] = /* @__PURE__ */ new WeakMap());
  var d = na[o], f = [], p = /* @__PURE__ */ new Set(), m = new Set(a), y = function(l) {
    !l || p.has(l) || (p.add(l), y(l.parentNode));
  };
  a.forEach(y);
  var S = function(l) {
    !l || m.has(l) || Array.prototype.forEach.call(l.children, function(c) {
      if (p.has(c))
        S(c);
      else
        try {
          var g = c.getAttribute(i), x = g !== null && g !== "false", _ = (eo.get(c) || 0) + 1, A = (d.get(c) || 0) + 1;
          eo.set(c, _), d.set(c, A), f.push(c), _ === 1 && x && ta.set(c, !0), A === 1 && c.setAttribute(o, "true"), x || c.setAttribute(i, "true");
        } catch (T) {
          console.error("aria-hidden: cannot operate on ", c, T);
        }
    });
  };
  return S(n), p.clear(), Ec++, function() {
    f.forEach(function(l) {
      var c = eo.get(l) - 1, g = d.get(l) - 1;
      eo.set(l, c), d.set(l, g), c || (ta.has(l) || l.removeAttribute(i), ta.delete(l)), g || l.removeAttribute(o);
    }), Ec--, Ec || (eo = /* @__PURE__ */ new WeakMap(), eo = /* @__PURE__ */ new WeakMap(), ta = /* @__PURE__ */ new WeakMap(), na = {});
  };
}, QE = function(e, n, o) {
  o === void 0 && (o = "data-aria-hidden");
  var i = Array.from(Array.isArray(e) ? e : [e]), a = GE(e);
  return a ? (i.push.apply(i, Array.from(a.querySelectorAll("[aria-live], script"))), YE(i, a, o, "aria-hidden")) : function() {
    return null;
  };
}, ol = "Dialog", [hS] = df(ol), [XE, Gt] = hS(ol), yS = (e) => {
  const {
    __scopeDialog: n,
    children: o,
    open: i,
    defaultOpen: a,
    onOpenChange: d,
    modal: f = !0
  } = e, p = C.useRef(null), m = C.useRef(null), [y, S] = J0({
    prop: i,
    defaultProp: a ?? !1,
    onChange: d,
    caller: ol
  });
  return /* @__PURE__ */ w.jsx(
    XE,
    {
      scope: n,
      triggerRef: p,
      contentRef: m,
      contentId: Tc(),
      titleId: Tc(),
      descriptionId: Tc(),
      open: y,
      onOpenChange: S,
      onOpenToggle: C.useCallback(() => S((l) => !l), [S]),
      modal: f,
      children: o
    }
  );
};
yS.displayName = ol;
var gS = "DialogTrigger", ZE = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Gt(gS, o), d = ut(n, a.triggerRef);
    return /* @__PURE__ */ w.jsx(
      vt.button,
      {
        type: "button",
        "aria-haspopup": "dialog",
        "aria-expanded": a.open,
        "aria-controls": a.open ? a.contentId : void 0,
        "data-state": mf(a.open),
        ...i,
        ref: d,
        onClick: yt(e.onClick, a.onOpenToggle)
      }
    );
  }
);
ZE.displayName = gS;
var pf = "DialogPortal", [qE, vS] = hS(pf, {
  forceMount: void 0
}), SS = (e) => {
  const { __scopeDialog: n, forceMount: o, children: i, container: a } = e, d = Gt(pf, n);
  return /* @__PURE__ */ w.jsx(qE, { scope: n, forceMount: o, children: C.Children.map(i, (f) => /* @__PURE__ */ w.jsx(nl, { present: o || d.open, children: /* @__PURE__ */ w.jsx(iS, { asChild: !0, container: a, children: f }) })) });
};
SS.displayName = pf;
var Ha = "DialogOverlay", wS = C.forwardRef(
  (e, n) => {
    const o = vS(Ha, e.__scopeDialog), { forceMount: i = o.forceMount, ...a } = e, d = Gt(Ha, e.__scopeDialog);
    return d.modal ? /* @__PURE__ */ w.jsx(nl, { present: i || d.open, children: /* @__PURE__ */ w.jsx(eM, { ...a, ref: n }) }) : null;
  }
);
wS.displayName = Ha;
var JE = /* @__PURE__ */ Ua("DialogOverlay.RemoveScroll"), eM = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Gt(Ha, o), d = KP(), f = ut(n, d);
    return (
      // Make sure `Content` is scrollable even when it doesn't live inside `RemoveScroll`
      // ie. when `Overlay` and `Content` are siblings
      /* @__PURE__ */ w.jsx(pS, { as: JE, allowPinchZoom: !0, shards: [a.contentRef], children: /* @__PURE__ */ w.jsx(
        vt.div,
        {
          "data-state": mf(a.open),
          ...i,
          ref: f,
          style: { pointerEvents: "auto", ...i.style }
        }
      ) })
    );
  }
), co = "DialogContent", xS = C.forwardRef(
  (e, n) => {
    const o = vS(co, e.__scopeDialog), { forceMount: i = o.forceMount, ...a } = e, d = Gt(co, e.__scopeDialog);
    return /* @__PURE__ */ w.jsx(nl, { present: i || d.open, children: d.modal ? /* @__PURE__ */ w.jsx(tM, { ...a, ref: n }) : /* @__PURE__ */ w.jsx(nM, { ...a, ref: n }) });
  }
);
xS.displayName = co;
var tM = C.forwardRef(
  (e, n) => {
    const o = Gt(co, e.__scopeDialog), i = C.useRef(null), a = ut(n, o.contentRef, i);
    return C.useEffect(() => {
      const d = i.current;
      if (d) return QE(d);
    }, []), /* @__PURE__ */ w.jsx(
      _S,
      {
        ...e,
        ref: a,
        trapFocus: o.open,
        disableOutsidePointerEvents: o.open,
        onCloseAutoFocus: yt(e.onCloseAutoFocus, (d) => {
          var f;
          d.preventDefault(), (f = o.triggerRef.current) == null || f.focus();
        }),
        onPointerDownOutside: yt(e.onPointerDownOutside, (d) => {
          const f = d.detail.originalEvent, p = f.button === 0 && f.ctrlKey === !0;
          (f.button === 2 || p) && d.preventDefault();
        }),
        onFocusOutside: yt(
          e.onFocusOutside,
          (d) => d.preventDefault()
        )
      }
    );
  }
), nM = C.forwardRef(
  (e, n) => {
    const o = Gt(co, e.__scopeDialog), i = C.useRef(!1), a = C.useRef(!1);
    return /* @__PURE__ */ w.jsx(
      _S,
      {
        ...e,
        ref: n,
        trapFocus: !1,
        disableOutsidePointerEvents: !1,
        onCloseAutoFocus: (d) => {
          var f, p;
          (f = e.onCloseAutoFocus) == null || f.call(e, d), d.defaultPrevented || (i.current || (p = o.triggerRef.current) == null || p.focus(), d.preventDefault()), i.current = !1, a.current = !1;
        },
        onInteractOutside: (d) => {
          var m, y;
          (m = e.onInteractOutside) == null || m.call(e, d), d.defaultPrevented || (i.current = !0, d.detail.originalEvent.type === "pointerdown" && (a.current = !0));
          const f = d.target;
          ((y = o.triggerRef.current) == null ? void 0 : y.contains(f)) && d.preventDefault(), d.detail.originalEvent.type === "focusin" && a.current && d.preventDefault();
        }
      }
    );
  }
), _S = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, trapFocus: i, onOpenAutoFocus: a, onCloseAutoFocus: d, ...f } = e, p = Gt(co, o);
    return uE(), /* @__PURE__ */ w.jsx(w.Fragment, { children: /* @__PURE__ */ w.jsx(
      rS,
      {
        asChild: !0,
        loop: !0,
        trapped: i,
        onMountAutoFocus: a,
        onUnmountAutoFocus: d,
        children: /* @__PURE__ */ w.jsx(
          tS,
          {
            role: "dialog",
            id: p.contentId,
            "aria-describedby": p.descriptionId,
            "aria-labelledby": p.titleId,
            "data-state": mf(p.open),
            ...f,
            ref: n,
            deferPointerDownOutside: !0,
            onDismiss: () => p.onOpenChange(!1)
          }
        )
      }
    ) });
  }
), TS = "DialogTitle", kS = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Gt(TS, o);
    return /* @__PURE__ */ w.jsx(vt.h2, { id: a.titleId, ...i, ref: n });
  }
);
kS.displayName = TS;
var AS = "DialogDescription", CS = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Gt(AS, o);
    return /* @__PURE__ */ w.jsx(vt.p, { id: a.descriptionId, ...i, ref: n });
  }
);
CS.displayName = AS;
var bS = "DialogClose", rM = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Gt(bS, o);
    return /* @__PURE__ */ w.jsx(
      vt.button,
      {
        type: "button",
        ...i,
        ref: n,
        onClick: yt(e.onClick, () => a.onOpenChange(!1))
      }
    );
  }
);
rM.displayName = bS;
function mf(e) {
  return e ? "open" : "closed";
}
function oM() {
  const e = Y((a) => a.summaryRecord), n = Y((a) => a.closeSummary), o = Y((a) => a.startTimer), i = gn(e == null ? void 0 : e.selectedScene);
  return /* @__PURE__ */ w.jsx(yS, { open: !!e, onOpenChange: (a) => !a && n(), children: /* @__PURE__ */ w.jsx(Xa, { children: e ? /* @__PURE__ */ w.jsxs(SS, { forceMount: !0, children: [
    /* @__PURE__ */ w.jsx(wS, { asChild: !0, children: /* @__PURE__ */ w.jsx(
      Sn.div,
      {
        className: "summary-overlay",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
      }
    ) }),
    /* @__PURE__ */ w.jsx(xS, { asChild: !0, children: /* @__PURE__ */ w.jsxs(
      Sn.article,
      {
        className: "summary-card liquid-glass",
        initial: { opacity: 0, y: 18, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 18, scale: 0.98 },
        children: [
          /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Session complete" }),
          /* @__PURE__ */ w.jsx(kS, { children: "Focus block complete" }),
          /* @__PURE__ */ w.jsx(CS, { className: "sr-only", children: "Summary of the completed focus block." }),
          /* @__PURE__ */ w.jsx("p", { children: "You protected a focused block in your quiet study room." }),
          /* @__PURE__ */ w.jsxs("div", { className: "summary-grid", children: [
            /* @__PURE__ */ w.jsxs("div", { className: "summary-stat liquid-glass-lite", children: [
              /* @__PURE__ */ w.jsx("span", { children: "Focus time" }),
              /* @__PURE__ */ w.jsx("strong", { children: Ia(e.totalFocusTime) })
            ] }),
            /* @__PURE__ */ w.jsxs("div", { className: "summary-stat liquid-glass-lite", children: [
              /* @__PURE__ */ w.jsx("span", { children: "Planned block" }),
              /* @__PURE__ */ w.jsxs("strong", { children: [
                e.pomodoroDuration,
                "m"
              ] })
            ] }),
            /* @__PURE__ */ w.jsxs("div", { className: "summary-stat liquid-glass-lite", children: [
              /* @__PURE__ */ w.jsx("span", { children: "Scene" }),
              /* @__PURE__ */ w.jsx("strong", { children: i.name })
            ] }),
            /* @__PURE__ */ w.jsxs("div", { className: "summary-stat liquid-glass-lite", children: [
              /* @__PURE__ */ w.jsx("span", { children: "Room state" }),
              /* @__PURE__ */ w.jsx("strong", { children: "Saved" })
            ] })
          ] }),
          e.persisted === !1 ? /* @__PURE__ */ w.jsx("p", { children: "This session is visible for now, but could not be saved to this device history." }) : null,
          /* @__PURE__ */ w.jsxs("div", { className: "focus-button-row", children: [
            /* @__PURE__ */ w.jsx(Te, { variant: "primary", onClick: () => {
              n(), o();
            }, children: "Continue studying" }),
            /* @__PURE__ */ w.jsx(Te, { onClick: n, children: "Done" })
          ] })
        ]
      }
    ) })
  ] }) : null }) });
}
function PS(e, [n, o]) {
  return Math.min(o, Math.max(n, e));
}
var iM = C.createContext(void 0);
function sM(e) {
  const n = C.useContext(iM);
  return e || n || "ltr";
}
function aM(e) {
  const n = C.useRef({ value: e, previous: e });
  return C.useMemo(() => (n.current.value !== e && (n.current.previous = n.current.value, n.current.value = e), n.current.previous), [e]);
}
function lM(e) {
  const [n, o] = C.useState(void 0);
  return uo(() => {
    if (e) {
      o({ width: e.offsetWidth, height: e.offsetHeight });
      const i = new ResizeObserver((a) => {
        if (!Array.isArray(a) || !a.length)
          return;
        const d = a[0];
        let f, p;
        if ("borderBoxSize" in d) {
          const m = d.borderBoxSize, y = Array.isArray(m) ? m[0] : m;
          f = y.inlineSize, p = y.blockSize;
        } else
          f = e.offsetWidth, p = e.offsetHeight;
        o({ width: f, height: p });
      });
      return i.observe(e, { box: "border-box" }), () => i.unobserve(e);
    } else
      o(void 0);
  }, [e]), n;
}
function uM(e) {
  const n = e + "CollectionProvider", [o, i] = df(n), [a, d] = o(
    n,
    { collectionRef: { current: null }, itemMap: /* @__PURE__ */ new Map() }
  ), f = (_) => {
    const { scope: A, children: T } = _, b = C.useRef(null), E = C.useRef(/* @__PURE__ */ new Map()).current;
    return /* @__PURE__ */ w.jsx(a, { scope: A, itemMap: E, collectionRef: b, children: T });
  };
  f.displayName = n;
  const p = e + "CollectionSlot", m = /* @__PURE__ */ Ua(p), y = C.forwardRef(
    (_, A) => {
      const { scope: T, children: b } = _, E = d(p, T), D = ut(A, E.collectionRef);
      return /* @__PURE__ */ w.jsx(m, { ref: D, children: b });
    }
  );
  y.displayName = p;
  const S = e + "CollectionItemSlot", l = "data-radix-collection-item", c = /* @__PURE__ */ Ua(S), g = C.forwardRef(
    (_, A) => {
      const { scope: T, children: b, ...E } = _, D = C.useRef(null), L = ut(A, D), G = d(S, T);
      return C.useEffect(() => (G.itemMap.set(D, { ref: D, ...E }), () => void G.itemMap.delete(D))), /* @__PURE__ */ w.jsx(c, { [l]: "", ref: L, children: b });
    }
  );
  g.displayName = S;
  function x(_) {
    const A = d(e + "CollectionConsumer", _);
    return C.useCallback(() => {
      const b = A.collectionRef.current;
      if (!b) return [];
      const E = Array.from(b.querySelectorAll(`[${l}]`));
      return Array.from(A.itemMap.values()).sort(
        (G, W) => E.indexOf(G.ref.current) - E.indexOf(W.ref.current)
      );
    }, [A.collectionRef, A.itemMap]);
  }
  return [
    { Provider: f, Slot: y, ItemSlot: g },
    x,
    i
  ];
}
var ES = ["PageUp", "PageDown"], MS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"], RS = {
  "from-left": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-right": ["Home", "PageDown", "ArrowDown", "ArrowRight"],
  "from-bottom": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-top": ["Home", "PageDown", "ArrowUp", "ArrowLeft"]
}, ho = "Slider", [Sd, cM, dM] = uM(ho), [hf] = df(ho, [
  dM
]), [fM, Ni] = hf(ho), yf = C.forwardRef(
  (e, n) => {
    const {
      name: o,
      min: i = 0,
      max: a = 100,
      step: d = 1,
      orientation: f = "horizontal",
      disabled: p = !1,
      minStepsBetweenThumbs: m = 0,
      defaultValue: y = [i],
      value: S,
      onValueChange: l = () => {
      },
      onValueCommit: c = () => {
      },
      inverted: g = !1,
      form: x,
      ..._
    } = e, A = C.useRef(/* @__PURE__ */ new Set()), T = C.useRef(0), b = C.useRef(!1), D = f === "horizontal" ? pM : mM, [L, G] = C.useState(null), W = ut(n, G), [H = [], V] = J0({
      prop: S,
      defaultProp: y,
      onChange: (ae) => {
        var O;
        (O = [...A.current][T.current]) == null || O.focus({
          preventScroll: !0,
          focusVisible: b.current
        }), b.current = !1, l(ae);
      }
    }), X = C.useRef(H), J = C.useRef(H);
    C.useEffect(() => {
      const ae = x ? L == null ? void 0 : L.ownerDocument.getElementById(x) : L == null ? void 0 : L.closest("form");
      if (ae instanceof HTMLFormElement) {
        const he = () => V(J.current);
        return ae.addEventListener("reset", he), () => ae.removeEventListener("reset", he);
      }
    }, [L, x, V]);
    function ce(ae) {
      const he = vM(H, ae);
      ye(ae, he);
    }
    function me(ae) {
      ye(ae, T.current);
    }
    function fe() {
      const ae = X.current[T.current];
      H[T.current] !== ae && c(H);
    }
    function ye(ae, he, { commit: O } = { commit: !1 }) {
      const Z = HS(d), Q = va(Math.round((ae - i) / d) * d + i, Z), N = PS(Q, [i, a]);
      V((z = []) => {
        const le = yM(z, N, he);
        if (xM(le, m * d)) {
          T.current = le.indexOf(N);
          const de = String(le) !== String(z);
          return de && O && c(le), de ? le : z;
        } else
          return z;
      });
    }
    return /* @__PURE__ */ w.jsx(
      fM,
      {
        scope: e.__scopeSlider,
        name: o,
        disabled: p,
        min: i,
        max: a,
        valueIndexToChangeRef: T,
        thumbs: A.current,
        values: H,
        orientation: f,
        form: x,
        children: /* @__PURE__ */ w.jsx(Sd.Provider, { scope: e.__scopeSlider, children: /* @__PURE__ */ w.jsx(Sd.Slot, { scope: e.__scopeSlider, children: /* @__PURE__ */ w.jsx(
          D,
          {
            "aria-disabled": p,
            "data-disabled": p ? "" : void 0,
            ..._,
            ref: W,
            onPointerDown: yt(_.onPointerDown, () => {
              p || (X.current = H, b.current = !1);
            }),
            min: i,
            max: a,
            inverted: g,
            onSlideStart: p ? void 0 : ce,
            onSlideMove: p ? void 0 : me,
            onSlideEnd: p ? void 0 : fe,
            onHomeKeyDown: () => {
              p || (b.current = !0, ye(i, 0, { commit: !0 }));
            },
            onEndKeyDown: () => {
              p || (b.current = !0, ye(a, H.length - 1, { commit: !0 }));
            },
            onStepKeyDown: ({ event: ae, direction: he }) => {
              if (!p) {
                b.current = !0;
                const Q = ES.includes(ae.key) || ae.shiftKey && MS.includes(ae.key) ? 10 : 1, N = T.current, z = H[N], le = _M(z, {
                  min: i,
                  step: d,
                  direction: he,
                  multiplier: Q
                });
                ye(le, N, { commit: !0 });
              }
            }
          }
        ) }) })
      }
    );
  }
);
yf.displayName = ho;
var [NS, DS] = hf(ho, {
  startEdge: "left",
  endEdge: "right",
  size: "width",
  direction: 1
}), pM = C.forwardRef(
  (e, n) => {
    const {
      min: o,
      max: i,
      dir: a,
      inverted: d,
      onSlideStart: f,
      onSlideMove: p,
      onSlideEnd: m,
      onStepKeyDown: y,
      ...S
    } = e, [l, c] = C.useState(null), g = ut(n, c), x = C.useRef(void 0), _ = sM(a), A = _ === "ltr", T = A && !d || !A && d;
    function b(E) {
      const D = x.current || l.getBoundingClientRect(), L = [0, D.width], W = wf(L, T ? [o, i] : [i, o]);
      return x.current = D, W(E - D.left);
    }
    return /* @__PURE__ */ w.jsx(
      NS,
      {
        scope: e.__scopeSlider,
        startEdge: T ? "left" : "right",
        endEdge: T ? "right" : "left",
        direction: T ? 1 : -1,
        size: "width",
        children: /* @__PURE__ */ w.jsx(
          jS,
          {
            dir: _,
            "data-orientation": "horizontal",
            ...S,
            ref: g,
            style: {
              ...S.style,
              "--radix-slider-thumb-transform": "translateX(-50%)"
            },
            onSlideStart: (E) => {
              const D = b(E.clientX);
              f == null || f(D);
            },
            onSlideMove: (E) => {
              const D = b(E.clientX);
              p == null || p(D);
            },
            onSlideEnd: () => {
              x.current = void 0, m == null || m();
            },
            onStepKeyDown: (E) => {
              const L = RS[T ? "from-left" : "from-right"].includes(E.key);
              y == null || y({ event: E, direction: L ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), mM = C.forwardRef(
  (e, n) => {
    const {
      min: o,
      max: i,
      inverted: a,
      onSlideStart: d,
      onSlideMove: f,
      onSlideEnd: p,
      onStepKeyDown: m,
      ...y
    } = e, S = C.useRef(null), l = ut(n, S), c = C.useRef(void 0), g = !a;
    function x(_) {
      const A = c.current || S.current.getBoundingClientRect(), T = [0, A.height], E = wf(T, g ? [i, o] : [o, i]);
      return c.current = A, E(_ - A.top);
    }
    return /* @__PURE__ */ w.jsx(
      NS,
      {
        scope: e.__scopeSlider,
        startEdge: g ? "bottom" : "top",
        endEdge: g ? "top" : "bottom",
        size: "height",
        direction: g ? 1 : -1,
        children: /* @__PURE__ */ w.jsx(
          jS,
          {
            "data-orientation": "vertical",
            ...y,
            ref: l,
            style: {
              ...y.style,
              "--radix-slider-thumb-transform": "translateY(50%)"
            },
            onSlideStart: (_) => {
              const A = x(_.clientY);
              d == null || d(A);
            },
            onSlideMove: (_) => {
              const A = x(_.clientY);
              f == null || f(A);
            },
            onSlideEnd: () => {
              c.current = void 0, p == null || p();
            },
            onStepKeyDown: (_) => {
              const T = RS[g ? "from-bottom" : "from-top"].includes(_.key);
              m == null || m({ event: _, direction: T ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), jS = C.forwardRef(
  (e, n) => {
    const {
      __scopeSlider: o,
      onSlideStart: i,
      onSlideMove: a,
      onSlideEnd: d,
      onHomeKeyDown: f,
      onEndKeyDown: p,
      onStepKeyDown: m,
      ...y
    } = e, S = Ni(ho, o);
    return /* @__PURE__ */ w.jsx(
      vt.span,
      {
        ...y,
        ref: n,
        onKeyDown: yt(e.onKeyDown, (l) => {
          l.key === "Home" ? (f(l), l.preventDefault()) : l.key === "End" ? (p(l), l.preventDefault()) : ES.concat(MS).includes(l.key) && (m(l), l.preventDefault());
        }),
        onPointerDown: yt(e.onPointerDown, (l) => {
          const c = l.target;
          c.setPointerCapture(l.pointerId), l.preventDefault(), S.thumbs.has(c) ? c.focus({ preventScroll: !0, focusVisible: !1 }) : i(l);
        }),
        onPointerMove: yt(e.onPointerMove, (l) => {
          l.target.hasPointerCapture(l.pointerId) && a(l);
        }),
        onPointerUp: yt(e.onPointerUp, (l) => {
          const c = l.target;
          c.hasPointerCapture(l.pointerId) && (c.releasePointerCapture(l.pointerId), d(l));
        })
      }
    );
  }
), IS = "SliderTrack", gf = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Ni(IS, o);
    return /* @__PURE__ */ w.jsx(
      vt.span,
      {
        "data-disabled": a.disabled ? "" : void 0,
        "data-orientation": a.orientation,
        ...i,
        ref: n
      }
    );
  }
);
gf.displayName = IS;
var wd = "SliderRange", vf = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Ni(wd, o), d = DS(wd, o), f = C.useRef(null), p = ut(n, f), m = a.values.length, y = a.values.map(
      (c) => US(c, a.min, a.max)
    ), S = m > 1 ? Math.min(...y) : 0, l = 100 - Math.max(...y);
    return /* @__PURE__ */ w.jsx(
      vt.span,
      {
        "data-orientation": a.orientation,
        "data-disabled": a.disabled ? "" : void 0,
        ...i,
        ref: p,
        style: {
          ...e.style,
          [d.startEdge]: S + "%",
          [d.endEdge]: l + "%"
        }
      }
    );
  }
);
vf.displayName = wd;
var FS = "SliderThumb", [hM, OS] = hf(FS), LS = "SliderThumbProvider";
function VS(e) {
  const {
    __scopeSlider: n,
    name: o,
    children: i,
    // @ts-expect-error internal render prop
    internal_do_not_use_render: a
  } = e, d = Ni(LS, n), f = cM(n), [p, m] = C.useState(null), y = C.useMemo(
    () => p ? f().findIndex((A) => A.ref.current === p) : -1,
    [f, p]
  ), S = lM(p), l = p ? !!d.form || !!p.closest("form") : !0, c = d.values[y], g = o ?? (d.name ? d.name + (d.values.length > 1 ? "[]" : "") : void 0), x = c === void 0 ? 0 : US(c, d.min, d.max);
  C.useEffect(() => {
    if (p)
      return d.thumbs.add(p), () => {
        d.thumbs.delete(p);
      };
  }, [p, d.thumbs]);
  const _ = {
    value: c,
    name: g,
    form: d.form,
    isFormControl: l,
    index: y,
    thumb: p,
    onThumbChange: m,
    percent: x,
    size: S
  };
  return /* @__PURE__ */ w.jsx(hM, { scope: n, ..._, children: TM(a) ? a(_) : i });
}
VS.displayName = LS;
var ga = "SliderThumbTrigger", zS = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Ni(ga, o), d = DS(ga, o), { index: f, value: p, percent: m, size: y, onThumbChange: S } = OS(
      ga,
      o
    ), l = ut(n, S), c = gM(f, a.values.length), g = y == null ? void 0 : y[d.size], x = g ? SM(g, m, d.direction) : 0;
    return /* @__PURE__ */ w.jsx(
      "span",
      {
        style: {
          transform: "var(--radix-slider-thumb-transform)",
          position: "absolute",
          [d.startEdge]: `calc(${m}% + ${x}px)`
        },
        children: /* @__PURE__ */ w.jsx(Sd.ItemSlot, { scope: o, children: /* @__PURE__ */ w.jsx(
          vt.span,
          {
            role: "slider",
            "aria-label": e["aria-label"] || c,
            "aria-valuemin": a.min,
            "aria-valuenow": p,
            "aria-valuemax": a.max,
            "aria-orientation": a.orientation,
            "data-orientation": a.orientation,
            "data-disabled": a.disabled ? "" : void 0,
            tabIndex: a.disabled ? void 0 : 0,
            ...i,
            ref: l,
            style: p === void 0 ? { display: "none" } : e.style,
            onFocus: yt(e.onFocus, () => {
              a.valueIndexToChangeRef.current = f;
            })
          }
        ) })
      }
    );
  }
);
zS.displayName = ga;
var Sf = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, name: i, ...a } = e;
    return /* @__PURE__ */ w.jsx(
      VS,
      {
        __scopeSlider: o,
        name: i,
        internal_do_not_use_render: ({ index: d, isFormControl: f }) => /* @__PURE__ */ w.jsxs(w.Fragment, { children: [
          /* @__PURE__ */ w.jsx(
            zS,
            {
              ...a,
              ref: n,
              __scopeSlider: o
            }
          ),
          f ? /* @__PURE__ */ w.jsx(
            $S,
            {
              __scopeSlider: o
            },
            d
          ) : null
        ] })
      }
    );
  }
);
Sf.displayName = FS;
var BS = "SliderBubbleInput", $S = C.forwardRef(
  ({ __scopeSlider: e, ...n }, o) => {
    const { value: i, name: a, form: d } = OS(BS, e), f = C.useRef(null), p = ut(f, o), m = aM(i);
    return C.useEffect(() => {
      const y = f.current;
      if (!y) return;
      const S = window.HTMLInputElement.prototype, c = Object.getOwnPropertyDescriptor(S, "value").set;
      if (m !== i && c) {
        const g = new Event("input", { bubbles: !0 });
        c.call(y, i), y.dispatchEvent(g);
      }
    }, [m, i]), /* @__PURE__ */ w.jsx(
      vt.input,
      {
        style: { display: "none" },
        name: a,
        form: d,
        ...n,
        ref: p,
        defaultValue: i
      }
    );
  }
);
$S.displayName = BS;
function yM(e = [], n, o) {
  const i = [...e];
  return i[o] = n, i.sort((a, d) => a - d);
}
function US(e, n, o) {
  const d = 100 / (o - n) * (e - n);
  return PS(d, [0, 100]);
}
function gM(e, n) {
  return n > 2 ? `Value ${e + 1} of ${n}` : n === 2 ? ["Minimum", "Maximum"][e] : void 0;
}
function vM(e, n) {
  if (e.length === 1) return 0;
  const o = e.map((a) => Math.abs(a - n)), i = Math.min(...o);
  return o.indexOf(i);
}
function SM(e, n, o) {
  const i = e / 2, d = wf([0, 50], [0, i]);
  return (i - d(n) * o) * o;
}
function wM(e) {
  return e.slice(0, -1).map((n, o) => e[o + 1] - n);
}
function xM(e, n) {
  if (n > 0) {
    const o = wM(e);
    return Math.min(...o) >= n;
  }
  return !0;
}
function wf(e, n) {
  return (o) => {
    if (e[0] === e[1] || n[0] === n[1]) return n[0];
    const i = (n[1] - n[0]) / (e[1] - e[0]);
    return n[0] + i * (o - e[0]);
  };
}
function HS(e) {
  if (!Number.isFinite(e)) return 0;
  const n = e.toString();
  if (n.includes("e")) {
    const [i, a] = n.split("e"), d = i.split(".")[1] || "", f = Number(a);
    return Math.max(0, d.length - f);
  }
  const o = n.split(".")[1];
  return o ? o.length : 0;
}
function va(e, n) {
  const o = Math.pow(10, n);
  return Math.round(e * o) / o;
}
function _M(e, {
  min: n,
  step: o,
  direction: i,
  multiplier: a
}) {
  const d = HS(o), f = (e - n) / o, p = Math.round(f), m = va(p * o + n, d) === va(e, d);
  let y;
  return m ? y = p + a * i : i > 0 ? y = Math.ceil(f) : y = Math.floor(f), va(y * o + n, d);
}
function TM(e) {
  return typeof e == "function";
}
const Sa = /* @__PURE__ */ new Map(), wa = /* @__PURE__ */ new Map(), ra = /* @__PURE__ */ new Map(), Mc = /* @__PURE__ */ new Map();
function kM(e) {
  return JSON.stringify(Array.isArray(e) ? e : [e]);
}
function AM(e) {
  const n = typeof e == "function" ? e() : e;
  return {
    data: n,
    error: null,
    hasFetched: !1,
    isFetching: !1,
    isPending: n === void 0
  };
}
function hi(e, n) {
  return Sa.has(e) || Sa.set(e, AM(n)), Sa.get(e);
}
function Rc(e, n) {
  var i;
  const o = {
    ...hi(e),
    ...n
  };
  return Sa.set(e, o), (i = wa.get(e)) == null || i.forEach((a) => a(o)), o;
}
function CM(e, n) {
  const o = wa.get(e) || /* @__PURE__ */ new Set();
  return o.add(n), wa.set(e, o), () => {
    o.delete(n), o.size || wa.delete(e);
  };
}
function bM(e, n) {
  const o = Symbol(e);
  Mc.set(e, o);
  const i = hi(e);
  Rc(e, {
    error: null,
    isFetching: !0,
    isPending: i.data === void 0
  }), Promise.resolve().then(n).then((a) => {
    Mc.get(e) === o && Rc(e, {
      data: a,
      error: null,
      hasFetched: !0,
      isFetching: !1,
      isPending: !1
    });
  }).catch((a) => {
    Mc.get(e) === o && Rc(e, {
      error: a instanceof Error ? a : new Error(String(a)),
      hasFetched: !0,
      isFetching: !1,
      isPending: !1
    });
  });
}
function PM({ queryKey: e, queryFn: n, initialData: o }) {
  const i = C.useMemo(() => kM(e), [e]), a = C.useRef(n);
  a.current = n;
  const [d, f] = C.useState(() => hi(i, o));
  return C.useEffect(() => (f(hi(i, o)), CM(i, f)), [i]), C.useEffect(() => {
    const p = () => bM(i, () => a.current());
    return ra.set(i, p), hi(i, o).hasFetched || p(), () => {
      ra.get(i) === p && ra.delete(i);
    };
  }, [i]), {
    ...d,
    isError: !!d.error,
    refetch: () => {
      var p;
      return (p = ra.get(i)) == null ? void 0 : p();
    }
  };
}
function EM() {
  return PM({
    queryKey: ["focus-room", "sessions"],
    queryFn: () => LC()
  });
}
function bg({ label: e, icon: n, value: o, onChange: i }) {
  return /* @__PURE__ */ w.jsxs("label", { className: "sound-slider", children: [
    /* @__PURE__ */ w.jsxs("span", { className: "sound-slider-head", children: [
      /* @__PURE__ */ w.jsxs("span", { className: "sound-slider-label", children: [
        n,
        /* @__PURE__ */ w.jsx("span", { children: e })
      ] }),
      /* @__PURE__ */ w.jsxs("strong", { children: [
        o,
        "%"
      ] })
    ] }),
    /* @__PURE__ */ w.jsxs(
      yf,
      {
        className: "radix-slider-root",
        style: { "--slider-progress": `${o}%` },
        value: [o],
        min: 0,
        max: 100,
        step: 1,
        onValueChange: (a) => i(a[0]),
        children: [
          /* @__PURE__ */ w.jsx(gf, { className: "radix-slider-track", children: /* @__PURE__ */ w.jsx(vf, { className: "radix-slider-range" }) }),
          /* @__PURE__ */ w.jsx(Sf, { className: "radix-slider-thumb", "aria-label": e })
        ]
      }
    )
  ] });
}
function MM({ audioState: e }) {
  const n = Y((c) => c.musicType), o = Y((c) => c.ambientSound), i = Y((c) => c.musicVolume), a = Y((c) => c.ambientVolume), d = Y((c) => c.audioPlaying), f = Y((c) => c.setSound), p = Y((c) => c.applyAudioPreset), m = Y((c) => c.toggleAudio), y = qa({ musicType: n, ambientSound: o }), S = MC({ musicType: n, ambientSound: o }), l = y.ambientLayers.map((c) => c.title).filter(Boolean).join(" + ");
  return /* @__PURE__ */ w.jsxs("div", { className: "sound-panel", children: [
    /* @__PURE__ */ w.jsx("div", { className: "sound-preset-list", "aria-label": "Focus audio presets", children: fi.map((c) => /* @__PURE__ */ w.jsxs(
      "button",
      {
        type: "button",
        className: (S == null ? void 0 : S.id) === c.id ? "is-active" : "",
        "aria-pressed": (S == null ? void 0 : S.id) === c.id,
        title: c.description,
        onClick: () => p(c.id),
        children: [
          /* @__PURE__ */ w.jsx("strong", { children: c.label }),
          /* @__PURE__ */ w.jsx("small", { children: c.description })
        ]
      },
      c.id
    )) }),
    /* @__PURE__ */ w.jsxs("label", { className: "focus-field", children: [
      "Music selector",
      /* @__PURE__ */ w.jsx("select", { value: n, onChange: (c) => f("musicType", c.target.value), children: Wn.map((c) => /* @__PURE__ */ w.jsx("option", { value: c.label, children: c.label }, c.label)) })
    ] }),
    /* @__PURE__ */ w.jsx(
      bg,
      {
        label: "Music volume",
        icon: /* @__PURE__ */ w.jsx(tl, { size: 16, "aria-hidden": "true" }),
        value: i,
        onChange: (c) => f("musicVolume", c)
      }
    ),
    /* @__PURE__ */ w.jsxs("label", { className: "focus-field", children: [
      "Ambient sound selector",
      /* @__PURE__ */ w.jsx("select", { value: o, onChange: (c) => f("ambientSound", c.target.value), children: Gn.map((c) => /* @__PURE__ */ w.jsx("option", { value: c.label, children: c.label }, c.label)) })
    ] }),
    /* @__PURE__ */ w.jsx(
      bg,
      {
        label: "Ambient volume",
        icon: /* @__PURE__ */ w.jsx(sf, { size: 16, "aria-hidden": "true" }),
        value: a,
        onChange: (c) => f("ambientVolume", c)
      }
    ),
    /* @__PURE__ */ w.jsxs("div", { className: "audio-preview liquid-glass-lite", children: [
      /* @__PURE__ */ w.jsxs("div", { children: [
        /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Theme audio preview" }),
        /* @__PURE__ */ w.jsx("strong", { children: y.musicTrack.title }),
        /* @__PURE__ */ w.jsx("p", { children: l }),
        e != null && e.error ? /* @__PURE__ */ w.jsx("p", { className: "audio-error", children: e.error }) : null
      ] }),
      /* @__PURE__ */ w.jsx(Te, { variant: d ? "primary" : "ghost", onClick: m, children: d ? "Pause audio" : "Play audio" })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "audio-links", children: [y.musicTrack, ...y.ambientLayers].filter((c) => c == null ? void 0 : c.pageUrl).map((c) => /* @__PURE__ */ w.jsx("a", { href: c.pageUrl, target: "_blank", rel: "noreferrer", children: c.title || c.label || "Audio source" }, c.pageUrl)) })
  ] });
}
const RM = [
  ["white-noise", "White noise"],
  ["pink-noise", "Pink noise"],
  ["brown-noise", "Brown noise"],
  ["light-rain", "Light rain"],
  ["heavy-rain", "Heavy rain"],
  ["ocean-waves", "Ocean waves"],
  ["wind", "Wind"],
  ["fireplace", "Fireplace"],
  ["train", "Train"],
  ["cafe", "Café"],
  ["street", "Street"],
  ["forest", "Forest"],
  ["summer-night", "Summer night"],
  ["waterfall", "Waterfall"],
  ["typing", "Typing"],
  ["page-turning", "Page turning"],
  ["writing", "Writing sounds"]
], NM = [
  ["white-noise", "White noise"],
  ["pink-noise", "Pink noise"],
  ["brown-noise", "Brown noise"]
], DM = [
  ["light-rain", "Light rain"],
  ["heavy-rain", "Heavy rain"],
  ["ocean-waves", "Ocean waves"],
  ["wind", "Wind"],
  ["fireplace", "Fireplace"],
  ["train", "Train"],
  ["cafe", "Café"],
  ["street", "Street"],
  ["forest", "Forest"],
  ["summer-night", "Summer night"],
  ["waterfall", "Waterfall"],
  ["typing", "Typing"],
  ["page-turning", "Page turning"],
  ["writing", "Writing sounds"]
];
function oa({ id: e, label: n, value: o, icon: i = null, onChange: a, card: d = !1 }) {
  const f = Number.isFinite(Number(o)) ? Number(o) : 0, p = f > 0;
  return /* @__PURE__ */ w.jsxs("label", { className: [
    "room-channel",
    i ? "room-channel-master" : "",
    d ? "room-channel-card" : "",
    p ? "is-active" : ""
  ].filter(Boolean).join(" "), children: [
    /* @__PURE__ */ w.jsxs("span", { className: "room-channel-head", children: [
      /* @__PURE__ */ w.jsxs("span", { className: "room-channel-label", children: [
        i || /* @__PURE__ */ w.jsx("i", { className: `mixer-channel-dot mixer-${e}`, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: n })
      ] }),
      /* @__PURE__ */ w.jsxs("strong", { children: [
        f,
        "%"
      ] })
    ] }),
    /* @__PURE__ */ w.jsxs(
      yf,
      {
        className: "radix-slider-root",
        value: [f],
        min: 0,
        max: 100,
        step: 1,
        onValueChange: (m) => a(e, m[0]),
        children: [
          /* @__PURE__ */ w.jsx(gf, { className: "radix-slider-track", children: /* @__PURE__ */ w.jsx(vf, { className: "radix-slider-range" }) }),
          /* @__PURE__ */ w.jsx(Sf, { className: "radix-slider-thumb", "aria-label": `${n} volume` })
        ]
      }
    )
  ] });
}
function jM({ audioState: e, scene: n, onClose: o }) {
  const i = Y((T) => T.audioChannels), a = Y((T) => T.setSound), d = Y((T) => T.returnToSetup), f = Y((T) => T.musicType), p = Y((T) => T.ambientSound), m = Y((T) => T.musicVolume), y = Y((T) => T.ambientVolume), [S, l] = C.useState(!1), c = (T, b) => {
    l(!1), a(`audioChannel:${T}`, b);
  }, g = (T, b) => a("musicVolume", b), x = (T, b) => a("ambientVolume", b), _ = () => {
    const T = Wn[Math.floor(Math.random() * Wn.length)], b = Gn[Math.floor(Math.random() * Gn.length)];
    a("musicType", T.label), a("ambientSound", b.label), l(!1);
  }, A = () => {
    a("musicType", (n == null ? void 0 : n.musicType) || "Deep Focus"), a("ambientSound", (n == null ? void 0 : n.ambientSound) || "Nature"), l(!0);
  };
  return /* @__PURE__ */ w.jsxs(
    Sn.aside,
    {
      className: "focus-utility-panel room-control-panel liquid-glass",
      initial: { opacity: 0, y: 18 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 14 },
      transition: Fa,
      role: "dialog",
      "aria-label": "Room settings",
      children: [
        /* @__PURE__ */ w.jsxs("header", { className: "room-control-head", children: [
          /* @__PURE__ */ w.jsxs("div", { children: [
            /* @__PURE__ */ w.jsx("span", { className: "control-eyebrow", children: "Control" }),
            /* @__PURE__ */ w.jsx("h2", { children: "Room settings" })
          ] }),
          /* @__PURE__ */ w.jsx(Te, { className: "room-control-close", "aria-label": "Close room settings", onClick: o, children: /* @__PURE__ */ w.jsx(Y0, { size: 16, "aria-hidden": "true" }) })
        ] }),
        /* @__PURE__ */ w.jsx("div", { className: "room-control-divider", "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("div", { className: "room-control-setup-actions", children: /* @__PURE__ */ w.jsx(
          Te,
          {
            className: "room-control-setup-btn",
            onClick: () => {
              o == null || o(), d();
            },
            "data-focus-return-setup": "true",
            children: "Change scene & setup"
          }
        ) }),
        /* @__PURE__ */ w.jsx("section", { className: "room-control-topics", "aria-label": "Focus topics", children: /* @__PURE__ */ w.jsx(Z0, {}) }),
        /* @__PURE__ */ w.jsxs("div", { className: "room-control-grid", children: [
          /* @__PURE__ */ w.jsxs("section", { className: "room-control-col room-control-scenes", "aria-label": "Scenes", children: [
            /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Scenes" }),
            /* @__PURE__ */ w.jsx(lf, {})
          ] }),
          /* @__PURE__ */ w.jsxs("section", { className: "room-control-col room-control-audio", children: [
            /* @__PURE__ */ w.jsxs("div", { className: "room-control-masters", children: [
              /* @__PURE__ */ w.jsxs("div", { className: "room-control-block", children: [
                /* @__PURE__ */ w.jsxs("div", { className: "room-control-block-head", children: [
                  /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Music" }),
                  /* @__PURE__ */ w.jsx(Te, { className: "room-control-icon-btn", "aria-label": "Shuffle to a random track", onClick: _, children: /* @__PURE__ */ w.jsx($b, { size: 15, "aria-hidden": "true" }) })
                ] }),
                /* @__PURE__ */ w.jsxs("label", { className: "room-select-field", children: [
                  /* @__PURE__ */ w.jsx("span", { className: "sr-only", children: "Music track" }),
                  /* @__PURE__ */ w.jsx("select", { value: f, onChange: (T) => {
                    l(!1), a("musicType", T.target.value);
                  }, children: Wn.map((T) => /* @__PURE__ */ w.jsx("option", { value: T.label, children: T.label }, T.label)) })
                ] }),
                /* @__PURE__ */ w.jsx(oa, { id: "music-volume", label: "Music volume", icon: /* @__PURE__ */ w.jsx(tl, { size: 15, "aria-hidden": "true" }), value: m, onChange: g })
              ] }),
              /* @__PURE__ */ w.jsxs("div", { className: "room-control-block", children: [
                /* @__PURE__ */ w.jsxs("div", { className: "room-control-block-head", children: [
                  /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Scene sound" }),
                  /* @__PURE__ */ w.jsx(Te, { className: "room-control-icon-btn", "aria-label": S ? "Mix saved" : "Save current mix", onClick: () => l(!0), children: S ? /* @__PURE__ */ w.jsx(el, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(W0, { size: 15, "aria-hidden": "true" }) })
                ] }),
                /* @__PURE__ */ w.jsxs("p", { className: "room-scene-recommend", children: [
                  "Recommended for ",
                  /* @__PURE__ */ w.jsx("strong", { children: n == null ? void 0 : n.name }),
                  /* @__PURE__ */ w.jsxs("span", { children: [
                    n == null ? void 0 : n.musicType,
                    " · ",
                    n == null ? void 0 : n.ambientSound
                  ] })
                ] }),
                /* @__PURE__ */ w.jsxs("button", { type: "button", className: "room-scene-apply", onClick: A, children: [
                  "Apply scene mix ",
                  /* @__PURE__ */ w.jsx("span", { "aria-hidden": "true", children: "↗" })
                ] }),
                /* @__PURE__ */ w.jsxs("label", { className: "room-select-field", children: [
                  /* @__PURE__ */ w.jsx("span", { className: "sr-only", children: "Ambient sound" }),
                  /* @__PURE__ */ w.jsx("select", { value: p, onChange: (T) => {
                    l(!1), a("ambientSound", T.target.value);
                  }, children: Gn.map((T) => /* @__PURE__ */ w.jsx("option", { value: T.label, children: T.label }, T.label)) })
                ] }),
                /* @__PURE__ */ w.jsx(oa, { id: "ambient-volume", label: "Ambient volume", icon: /* @__PURE__ */ w.jsx(sf, { size: 15, "aria-hidden": "true" }), value: y, onChange: x })
              ] })
            ] }),
            /* @__PURE__ */ w.jsxs("div", { className: "room-control-block", children: [
              /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Focus noise" }),
              /* @__PURE__ */ w.jsx("div", { className: "room-noise-row", children: NM.map(([T, b]) => /* @__PURE__ */ w.jsx(oa, { id: T, label: b, value: i == null ? void 0 : i[T], onChange: c, card: !0 }, T)) })
            ] }),
            /* @__PURE__ */ w.jsxs("div", { className: "room-control-block", children: [
              /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Ambient atmosphere" }),
              /* @__PURE__ */ w.jsx("div", { className: "room-ambient-grid", children: DM.map(([T, b]) => /* @__PURE__ */ w.jsx(oa, { id: T, label: b, value: i == null ? void 0 : i[T], onChange: c, card: !0 }, T)) })
            ] }),
            e != null && e.error ? /* @__PURE__ */ w.jsx("p", { className: "audio-error", children: e.error }) : null
          ] })
        ] })
      ]
    }
  );
}
function ia({ title: e, kicker: n, icon: o, children: i, onClose: a, className: d = "" }) {
  return /* @__PURE__ */ w.jsxs(Sn.aside, { className: `focus-utility-panel liquid-glass ${d}`.trim(), initial: { opacity: 0, y: 12, x: -18 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: 10, x: -18 }, transition: Fa, role: "dialog", "aria-label": e, children: [
    /* @__PURE__ */ w.jsxs("div", { className: "drawer-head", children: [
      /* @__PURE__ */ w.jsxs("div", { className: "utility-title", children: [
        /* @__PURE__ */ w.jsx("span", { className: "utility-title-icon", children: o }),
        /* @__PURE__ */ w.jsxs("div", { children: [
          /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: n }),
          /* @__PURE__ */ w.jsx("h2", { children: e })
        ] })
      ] }),
      /* @__PURE__ */ w.jsx(Te, { "aria-label": `Close ${e}`, onClick: a, children: /* @__PURE__ */ w.jsx(Y0, { size: 16, "aria-hidden": "true" }) })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "utility-panel-body", children: i })
  ] });
}
function IM({ audioState: e, scene: n }) {
  const o = Y((y) => y.audioChannels), i = Y((y) => y.setSound), [a, d] = C.useState(!1), f = (y, S) => {
    d(!1), i(`audioChannel:${y}`, S);
  }, p = () => {
    const y = Wn[Math.floor(Math.random() * Wn.length)], S = Gn[Math.floor(Math.random() * Gn.length)];
    i("musicType", y.label), i("ambientSound", S.label), d(!0);
  }, m = () => {
    i("musicType", (n == null ? void 0 : n.musicType) || "Deep Focus"), i("ambientSound", (n == null ? void 0 : n.ambientSound) || "Nature"), d(!0);
  };
  return /* @__PURE__ */ w.jsxs("div", { className: "sound-mixer", children: [
    /* @__PURE__ */ w.jsxs("div", { className: "mixer-featured-row", children: [
      /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Music library" }),
      /* @__PURE__ */ w.jsxs(Te, { onClick: p, children: [
        /* @__PURE__ */ w.jsx(wb, { size: 14, "aria-hidden": "true" }),
        " Random track"
      ] })
    ] }),
    /* @__PURE__ */ w.jsx(MM, { audioState: e, compact: !0 }),
    /* @__PURE__ */ w.jsxs("div", { className: "mixer-preset-row", children: [
      /* @__PURE__ */ w.jsxs("button", { type: "button", className: "mixer-preset-button", onClick: m, children: [
        "Apply scene mix ",
        /* @__PURE__ */ w.jsx("span", { children: "↗" })
      ] }),
      /* @__PURE__ */ w.jsxs(Te, { onClick: () => d(!0), children: [
        a ? /* @__PURE__ */ w.jsx(el, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(W0, { size: 14, "aria-hidden": "true" }),
        " ",
        a ? "Saved" : "Save current mix"
      ] })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "mixer-channel-grid", children: RM.map(([y, S]) => /* @__PURE__ */ w.jsxs("label", { className: "mixer-channel", children: [
      /* @__PURE__ */ w.jsxs("span", { children: [
        /* @__PURE__ */ w.jsx("i", { className: `mixer-channel-dot mixer-${y}` }),
        S
      ] }),
      /* @__PURE__ */ w.jsxs("strong", { children: [
        o[y],
        "%"
      ] }),
      /* @__PURE__ */ w.jsx("input", { type: "range", min: "0", max: "100", value: o[y], "aria-label": `${S} volume`, onChange: (l) => f(y, l.target.value) })
    ] }, y)) }),
    e != null && e.error ? /* @__PURE__ */ w.jsx("p", { className: "audio-error", children: e.error }) : null
  ] });
}
function FM() {
  const e = () => {
    var i, a, d;
    return ((d = (a = (i = globalThis.window) == null ? void 0 : i.SynapseAuth) == null ? void 0 : a.getStoredSession) == null ? void 0 : d.call(a)) || null;
  }, [n, o] = C.useState(e);
  return C.useEffect(() => {
    var f, p, m, y;
    let i = !0;
    const a = (S) => {
      var l;
      i && o(((l = S == null ? void 0 : S.detail) == null ? void 0 : l.session) || e());
    };
    (f = globalThis.window) == null || f.addEventListener("synapse-auth-changed", a);
    const d = (y = (m = (p = globalThis.window) == null ? void 0 : p.SynapseAuth) == null ? void 0 : m.syncSessionFromProvider) == null ? void 0 : y.call(m);
    return Promise.resolve(d).finally(() => a()), () => {
      var S;
      i = !1, (S = globalThis.window) == null || S.removeEventListener("synapse-auth-changed", a);
    };
  }, []), n;
}
function OM(e) {
  const n = /* @__PURE__ */ new Date(`${e}T00:00:00.000Z`);
  return Array.from({ length: 30 }, (o, i) => {
    const a = new Date(n);
    return a.setUTCDate(n.getUTCDate() - (29 - i)), a.toISOString().slice(0, 10);
  });
}
function LM({ onWorkspace: e, session: n }) {
  const o = !!n, { data: i = [], isPending: a } = EM(), d = _i(), f = zC(i, d.focusTrailDate), p = new Set(f.days.map((m) => m.date));
  return o ? /* @__PURE__ */ w.jsxs("div", { className: "focus-trail-panel", "data-focus-trail": "true", children: [
    /* @__PURE__ */ w.jsxs("section", { className: "focus-trail-calendar", "aria-label": "30-day trail", children: [
      /* @__PURE__ */ w.jsxs("div", { className: "focus-trail-section-head", children: [
        /* @__PURE__ */ w.jsx("span", { children: "30-day trail" }),
        /* @__PURE__ */ w.jsxs("small", { children: [
          "Local time · ",
          d.focusTimezone
        ] })
      ] }),
      /* @__PURE__ */ w.jsx("div", { className: "focus-trail-grid", role: "list", "aria-label": "Focus days in the last 30 days", children: OM(d.focusTrailDate).map((m) => {
        const y = p.has(m);
        return /* @__PURE__ */ w.jsx("span", { className: `focus-trail-day ${y ? "is-active" : ""}`.trim(), role: "listitem", title: y ? `Focused on ${m}` : m, "aria-label": y ? `Focused on ${m}` : `No focus session on ${m}` }, m);
      }) })
    ] }),
    /* @__PURE__ */ w.jsxs("div", { className: "focus-trail-stats", "aria-label": "Focus Trail summary", children: [
      /* @__PURE__ */ w.jsxs("article", { children: [
        /* @__PURE__ */ w.jsx("span", { children: "Current streak" }),
        /* @__PURE__ */ w.jsx("strong", { children: f.currentStreak }),
        /* @__PURE__ */ w.jsx("small", { children: f.currentStreak === 1 ? "day in rhythm" : "days in rhythm" })
      ] }),
      /* @__PURE__ */ w.jsxs("article", { children: [
        /* @__PURE__ */ w.jsx("span", { children: "Today" }),
        /* @__PURE__ */ w.jsx("strong", { children: Ia(f.today.seconds) }),
        /* @__PURE__ */ w.jsxs("small", { children: [
          f.today.sessions,
          " ",
          f.today.sessions === 1 ? "session" : "sessions"
        ] })
      ] }),
      /* @__PURE__ */ w.jsxs("article", { children: [
        /* @__PURE__ */ w.jsx("span", { children: "Active days" }),
        /* @__PURE__ */ w.jsx("strong", { children: f.activeDays }),
        /* @__PURE__ */ w.jsx("small", { children: "all time" })
      ] })
    ] }),
    /* @__PURE__ */ w.jsxs("section", { className: "focus-trail-recent", "aria-label": "Recent focus sessions", children: [
      /* @__PURE__ */ w.jsxs("div", { className: "focus-trail-section-head", children: [
        /* @__PURE__ */ w.jsx("span", { children: "Recent sessions" }),
        /* @__PURE__ */ w.jsx("small", { children: a ? "Syncing…" : "Synced across devices" })
      ] }),
      f.days.length ? f.days.slice(0, 3).map((m) => /* @__PURE__ */ w.jsxs("div", { className: "focus-trail-recent-row", children: [
        /* @__PURE__ */ w.jsx("span", { children: m.date }),
        /* @__PURE__ */ w.jsx("strong", { children: Ia(m.seconds) }),
        /* @__PURE__ */ w.jsxs("small", { children: [
          m.sessions,
          " ",
          m.sessions === 1 ? "session" : "sessions"
        ] })
      ] }, m.date)) : /* @__PURE__ */ w.jsx("p", { className: "focus-trail-empty", children: "Enter the Focus Room to mark your first day." })
    ] }),
    /* @__PURE__ */ w.jsx(Te, { variant: "primary", onClick: () => e == null ? void 0 : e("", "history"), children: "View full session history" })
  ] }) : /* @__PURE__ */ w.jsxs("div", { className: "utility-login-state", children: [
    /* @__PURE__ */ w.jsx(of, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Your rhythm, remembered" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Sign in to view your Focus Trail" }),
    /* @__PURE__ */ w.jsx("p", { children: "Track deep-work time, completed goals, and your study streak across devices." }),
    /* @__PURE__ */ w.jsx(Te, { variant: "primary", onClick: () => e == null ? void 0 : e(), children: "Sign in with Synapse" }),
    /* @__PURE__ */ w.jsx("small", { children: "Your current session continues without an account." })
  ] });
}
function VM({ onWorkspace: e, session: n }) {
  return !!n ? /* @__PURE__ */ w.jsxs("div", { className: "utility-empty-state", children: [
    /* @__PURE__ */ w.jsx(za, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Companion Room" }),
    /* @__PURE__ */ w.jsx("p", { children: "Invite a study partner from your Synapse workspace to share this quiet room." }),
    /* @__PURE__ */ w.jsx(Te, { variant: "primary", onClick: () => e == null ? void 0 : e("", "companion"), children: "Open Companion Room" })
  ] }) : /* @__PURE__ */ w.jsxs("div", { className: "utility-login-state", children: [
    /* @__PURE__ */ w.jsx(za, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Study alongside someone" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Sign in to use Companion Room" }),
    /* @__PURE__ */ w.jsx("p", { children: "Keep your own goal private while sharing the feeling of showing up together." }),
    /* @__PURE__ */ w.jsx(Te, { variant: "primary", onClick: () => e == null ? void 0 : e(), children: "Go to sign in" }),
    /* @__PURE__ */ w.jsx("small", { children: "No companion data is created in Focus Room." })
  ] });
}
function zM({ audioState: e, utilityPanel: n, onClose: o, onWorkspace: i }) {
  const a = Y((y) => y.activeDrawer), d = Y((y) => y.closeDrawer), f = Y((y) => y.selectedScene), p = FM(), m = C.useMemo(() => Yn.find((y) => y.id === f) || Yn[0], [f]);
  return /* @__PURE__ */ w.jsxs(Xa, { children: [
    n === "trail" ? /* @__PURE__ */ w.jsx(ia, { title: "Focus Trail", kicker: "Your progress", icon: /* @__PURE__ */ w.jsx(of, { size: 16 }), onClose: o, children: /* @__PURE__ */ w.jsx(LM, { onWorkspace: i, session: p }) }) : null,
    n === "companion" ? /* @__PURE__ */ w.jsx(ia, { title: "Companion Room", kicker: "Shared focus", icon: /* @__PURE__ */ w.jsx(za, { size: 16 }), onClose: o, children: /* @__PURE__ */ w.jsx(VM, { onWorkspace: i, session: p }) }) : null,
    n === "settings" ? /* @__PURE__ */ w.jsx(jM, { audioState: e, scene: m, onClose: o }) : null,
    !n && a === "scene" ? /* @__PURE__ */ w.jsx(ia, { title: "Choose scene", kicker: "Scene", icon: /* @__PURE__ */ w.jsx(G0, { size: 16 }), onClose: d, children: /* @__PURE__ */ w.jsx(lf, {}) }) : null,
    !n && a === "music" ? /* @__PURE__ */ w.jsx(ia, { title: "Sound atmosphere", kicker: "Room audio", icon: /* @__PURE__ */ w.jsx(tl, { size: 16 }), onClose: d, children: /* @__PURE__ */ w.jsx(IM, { audioState: e, scene: m }) }) : null
  ] });
}
const BM = 2800;
function $M(e = "idle") {
  return e === "studying" ? { action: "pause", label: "Pause timer" } : e === "paused" ? { action: "start", label: "Resume timer" } : { action: "start", label: "Start timer" };
}
function UM({ pointerWithin: e = !1, focusWithin: n = !1 } = {}) {
  return !e && !n;
}
function HM(e, n) {
  return n ? Math.min(100, Math.max(0, e / n * 100)) : 0;
}
function WM({ onExit: e }) {
  const n = Y((V) => V.elapsedSeconds), o = Y((V) => V.pomodoroDuration), i = Y((V) => V.pomodoroDurationSeconds), a = Y((V) => V.timerMode), d = Y((V) => V.timerStatus), f = Y((V) => V.currentSession), p = Y((V) => V.startTimer), m = Y((V) => V.pauseTimer), y = Y((V) => V.resetTimer), S = Y((V) => V.skipTimer), [l, c] = C.useState(!1), g = C.useRef(null), x = C.useRef(!1), _ = C.useRef(!1), A = C.useRef("pointer"), T = Number(i) || (Number(o) || 0) * 60, b = a === "countup" ? n : Math.max(0, T - n), E = $M(d), D = d === "paused" ? "Paused" : d === "completed" ? "Complete" : d === "studying" ? "In focus" : "Ready", L = C.useCallback(() => {
    g.current && (globalThis.clearTimeout(g.current), g.current = null);
  }, []), G = C.useCallback(() => {
    L(), g.current = globalThis.setTimeout(() => {
      UM({
        pointerWithin: x.current,
        focusWithin: _.current
      }) && c(!1);
    }, BM);
  }, [L]), W = C.useCallback(() => {
    c(!0), G();
  }, [G]);
  C.useEffect(() => {
    var J, ce, me;
    const V = () => {
      A.current = "pointer", _.current = !1, W();
    }, X = () => {
      A.current = "keyboard", W();
    };
    return (J = globalThis.addEventListener) == null || J.call(globalThis, "pointermove", V, { passive: !0 }), (ce = globalThis.addEventListener) == null || ce.call(globalThis, "pointerdown", V, { passive: !0 }), (me = globalThis.addEventListener) == null || me.call(globalThis, "keydown", X), () => {
      var fe, ye, ae;
      L(), (fe = globalThis.removeEventListener) == null || fe.call(globalThis, "pointermove", V), (ye = globalThis.removeEventListener) == null || ye.call(globalThis, "pointerdown", V), (ae = globalThis.removeEventListener) == null || ae.call(globalThis, "keydown", X);
    };
  }, [L, W]);
  const H = () => {
    E.action === "pause" ? m() : p();
  };
  return /* @__PURE__ */ w.jsxs(
    "div",
    {
      className: `compact-focus-mode-card ${l ? "has-timer-controls" : ""}`.trim(),
      "aria-label": "Distraction-free focus timer",
      "data-timer-controls-visible": l ? "true" : "false",
      onPointerEnter: () => {
        x.current = !0, W();
      },
      onPointerLeave: () => {
        x.current = !1, G();
      },
      onFocusCapture: () => {
        _.current = A.current === "keyboard", W();
      },
      onBlurCapture: (V) => {
        _.current = !!V.currentTarget.contains(V.relatedTarget), G();
      },
      children: [
        /* @__PURE__ */ w.jsxs("div", { className: "compact-focus-card-top", children: [
          /* @__PURE__ */ w.jsxs("span", { children: [
            "POMODORO #",
            (f == null ? void 0 : f.pomodoroNumber) || 1
          ] }),
          /* @__PURE__ */ w.jsx(Te, { className: "compact-exit-button", onClick: e, "aria-label": "Exit Focus Mode", children: /* @__PURE__ */ w.jsx(bb, { size: 14, "aria-hidden": "true" }) })
        ] }),
        /* @__PURE__ */ w.jsxs("span", { className: "compact-focus-status", children: [
          /* @__PURE__ */ w.jsx("i", {}),
          D
        ] }),
        /* @__PURE__ */ w.jsx("strong", { "aria-live": "off", children: cd(b) }),
        /* @__PURE__ */ w.jsx("div", { className: "compact-focus-progress", "aria-hidden": "true", children: /* @__PURE__ */ w.jsx("span", { style: { width: `${HM(n, T)}%` } }) }),
        /* @__PURE__ */ w.jsxs("small", { children: [
          cf(T),
          " session"
        ] }),
        /* @__PURE__ */ w.jsxs("div", { className: "compact-timer-controls", "aria-hidden": !l, inert: l ? void 0 : "", children: [
          /* @__PURE__ */ w.jsx(Te, { className: "compact-timer-control compact-timer-control-primary", variant: "primary", onClick: H, "aria-label": E.label, title: E.label, children: E.action === "pause" ? /* @__PURE__ */ w.jsx(pd, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(U0, { size: 15, fill: "currentColor", "aria-hidden": "true" }) }),
          /* @__PURE__ */ w.jsx(Te, { className: "compact-timer-control", onClick: y, "aria-label": "Reset timer", title: "Reset timer", children: /* @__PURE__ */ w.jsx(H0, { size: 15, "aria-hidden": "true" }) }),
          /* @__PURE__ */ w.jsx(Te, { className: "compact-timer-control", onClick: S, "aria-label": "Skip timer", title: "Skip timer", children: /* @__PURE__ */ w.jsx(K0, { size: 15, "aria-hidden": "true" }) })
        ] }),
        /* @__PURE__ */ w.jsx("span", { className: "sr-only", children: "Move the pointer, tap, or use the keyboard to reveal timer controls. Press Escape to exit Focus Mode." })
      ]
    }
  );
}
var Nc = {};
/*!
 *  howler.js v2.2.4
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */
var Pg;
function GM() {
  return Pg || (Pg = 1, (function(e) {
    (function() {
      var n = function() {
        this.init();
      };
      n.prototype = {
        /**
         * Initialize the global Howler object.
         * @return {Howler}
         */
        init: function() {
          var l = this || o;
          return l._counter = 1e3, l._html5AudioPool = [], l.html5PoolSize = 10, l._codecs = {}, l._howls = [], l._muted = !1, l._volume = 1, l._canPlayEvent = "canplaythrough", l._navigator = typeof window < "u" && window.navigator ? window.navigator : null, l.masterGain = null, l.noAudio = !1, l.usingWebAudio = !0, l.autoSuspend = !0, l.ctx = null, l.autoUnlock = !0, l._setup(), l;
        },
        /**
         * Get/set the global volume for all sounds.
         * @param  {Float} vol Volume from 0.0 to 1.0.
         * @return {Howler/Float}     Returns self or current volume.
         */
        volume: function(l) {
          var c = this || o;
          if (l = parseFloat(l), c.ctx || S(), typeof l < "u" && l >= 0 && l <= 1) {
            if (c._volume = l, c._muted)
              return c;
            c.usingWebAudio && c.masterGain.gain.setValueAtTime(l, o.ctx.currentTime);
            for (var g = 0; g < c._howls.length; g++)
              if (!c._howls[g]._webAudio)
                for (var x = c._howls[g]._getSoundIds(), _ = 0; _ < x.length; _++) {
                  var A = c._howls[g]._soundById(x[_]);
                  A && A._node && (A._node.volume = A._volume * l);
                }
            return c;
          }
          return c._volume;
        },
        /**
         * Handle muting and unmuting globally.
         * @param  {Boolean} muted Is muted or not.
         */
        mute: function(l) {
          var c = this || o;
          c.ctx || S(), c._muted = l, c.usingWebAudio && c.masterGain.gain.setValueAtTime(l ? 0 : c._volume, o.ctx.currentTime);
          for (var g = 0; g < c._howls.length; g++)
            if (!c._howls[g]._webAudio)
              for (var x = c._howls[g]._getSoundIds(), _ = 0; _ < x.length; _++) {
                var A = c._howls[g]._soundById(x[_]);
                A && A._node && (A._node.muted = l ? !0 : A._muted);
              }
          return c;
        },
        /**
         * Handle stopping all sounds globally.
         */
        stop: function() {
          for (var l = this || o, c = 0; c < l._howls.length; c++)
            l._howls[c].stop();
          return l;
        },
        /**
         * Unload and destroy all currently loaded Howl objects.
         * @return {Howler}
         */
        unload: function() {
          for (var l = this || o, c = l._howls.length - 1; c >= 0; c--)
            l._howls[c].unload();
          return l.usingWebAudio && l.ctx && typeof l.ctx.close < "u" && (l.ctx.close(), l.ctx = null, S()), l;
        },
        /**
         * Check for codec support of specific extension.
         * @param  {String} ext Audio file extention.
         * @return {Boolean}
         */
        codecs: function(l) {
          return (this || o)._codecs[l.replace(/^x-/, "")];
        },
        /**
         * Setup various state values for global tracking.
         * @return {Howler}
         */
        _setup: function() {
          var l = this || o;
          if (l.state = l.ctx && l.ctx.state || "suspended", l._autoSuspend(), !l.usingWebAudio)
            if (typeof Audio < "u")
              try {
                var c = new Audio();
                typeof c.oncanplaythrough > "u" && (l._canPlayEvent = "canplay");
              } catch {
                l.noAudio = !0;
              }
            else
              l.noAudio = !0;
          try {
            var c = new Audio();
            c.muted && (l.noAudio = !0);
          } catch {
          }
          return l.noAudio || l._setupCodecs(), l;
        },
        /**
         * Check for browser support for various codecs and cache the results.
         * @return {Howler}
         */
        _setupCodecs: function() {
          var l = this || o, c = null;
          try {
            c = typeof Audio < "u" ? new Audio() : null;
          } catch {
            return l;
          }
          if (!c || typeof c.canPlayType != "function")
            return l;
          var g = c.canPlayType("audio/mpeg;").replace(/^no$/, ""), x = l._navigator ? l._navigator.userAgent : "", _ = x.match(/OPR\/(\d+)/g), A = _ && parseInt(_[0].split("/")[1], 10) < 33, T = x.indexOf("Safari") !== -1 && x.indexOf("Chrome") === -1, b = x.match(/Version\/(.*?) /), E = T && b && parseInt(b[1], 10) < 15;
          return l._codecs = {
            mp3: !!(!A && (g || c.canPlayType("audio/mp3;").replace(/^no$/, ""))),
            mpeg: !!g,
            opus: !!c.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, ""),
            ogg: !!c.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ""),
            oga: !!c.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ""),
            wav: !!(c.canPlayType('audio/wav; codecs="1"') || c.canPlayType("audio/wav")).replace(/^no$/, ""),
            aac: !!c.canPlayType("audio/aac;").replace(/^no$/, ""),
            caf: !!c.canPlayType("audio/x-caf;").replace(/^no$/, ""),
            m4a: !!(c.canPlayType("audio/x-m4a;") || c.canPlayType("audio/m4a;") || c.canPlayType("audio/aac;")).replace(/^no$/, ""),
            m4b: !!(c.canPlayType("audio/x-m4b;") || c.canPlayType("audio/m4b;") || c.canPlayType("audio/aac;")).replace(/^no$/, ""),
            mp4: !!(c.canPlayType("audio/x-mp4;") || c.canPlayType("audio/mp4;") || c.canPlayType("audio/aac;")).replace(/^no$/, ""),
            weba: !!(!E && c.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, "")),
            webm: !!(!E && c.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, "")),
            dolby: !!c.canPlayType('audio/mp4; codecs="ec-3"').replace(/^no$/, ""),
            flac: !!(c.canPlayType("audio/x-flac;") || c.canPlayType("audio/flac;")).replace(/^no$/, "")
          }, l;
        },
        /**
         * Some browsers/devices will only allow audio to be played after a user interaction.
         * Attempt to automatically unlock audio on the first user interaction.
         * Concept from: http://paulbakaus.com/tutorials/html5/web-audio-on-ios/
         * @return {Howler}
         */
        _unlockAudio: function() {
          var l = this || o;
          if (!(l._audioUnlocked || !l.ctx)) {
            l._audioUnlocked = !1, l.autoUnlock = !1, !l._mobileUnloaded && l.ctx.sampleRate !== 44100 && (l._mobileUnloaded = !0, l.unload()), l._scratchBuffer = l.ctx.createBuffer(1, 1, 22050);
            var c = function(g) {
              for (; l._html5AudioPool.length < l.html5PoolSize; )
                try {
                  var x = new Audio();
                  x._unlocked = !0, l._releaseHtml5Audio(x);
                } catch {
                  l.noAudio = !0;
                  break;
                }
              for (var _ = 0; _ < l._howls.length; _++)
                if (!l._howls[_]._webAudio)
                  for (var A = l._howls[_]._getSoundIds(), T = 0; T < A.length; T++) {
                    var b = l._howls[_]._soundById(A[T]);
                    b && b._node && !b._node._unlocked && (b._node._unlocked = !0, b._node.load());
                  }
              l._autoResume();
              var E = l.ctx.createBufferSource();
              E.buffer = l._scratchBuffer, E.connect(l.ctx.destination), typeof E.start > "u" ? E.noteOn(0) : E.start(0), typeof l.ctx.resume == "function" && l.ctx.resume(), E.onended = function() {
                E.disconnect(0), l._audioUnlocked = !0, document.removeEventListener("touchstart", c, !0), document.removeEventListener("touchend", c, !0), document.removeEventListener("click", c, !0), document.removeEventListener("keydown", c, !0);
                for (var D = 0; D < l._howls.length; D++)
                  l._howls[D]._emit("unlock");
              };
            };
            return document.addEventListener("touchstart", c, !0), document.addEventListener("touchend", c, !0), document.addEventListener("click", c, !0), document.addEventListener("keydown", c, !0), l;
          }
        },
        /**
         * Get an unlocked HTML5 Audio object from the pool. If none are left,
         * return a new Audio object and throw a warning.
         * @return {Audio} HTML5 Audio object.
         */
        _obtainHtml5Audio: function() {
          var l = this || o;
          if (l._html5AudioPool.length)
            return l._html5AudioPool.pop();
          var c = new Audio().play();
          return c && typeof Promise < "u" && (c instanceof Promise || typeof c.then == "function") && c.catch(function() {
            console.warn("HTML5 Audio pool exhausted, returning potentially locked audio object.");
          }), new Audio();
        },
        /**
         * Return an activated HTML5 Audio object to the pool.
         * @return {Howler}
         */
        _releaseHtml5Audio: function(l) {
          var c = this || o;
          return l._unlocked && c._html5AudioPool.push(l), c;
        },
        /**
         * Automatically suspend the Web Audio AudioContext after no sound has played for 30 seconds.
         * This saves processing/energy and fixes various browser-specific bugs with audio getting stuck.
         * @return {Howler}
         */
        _autoSuspend: function() {
          var l = this;
          if (!(!l.autoSuspend || !l.ctx || typeof l.ctx.suspend > "u" || !o.usingWebAudio)) {
            for (var c = 0; c < l._howls.length; c++)
              if (l._howls[c]._webAudio) {
                for (var g = 0; g < l._howls[c]._sounds.length; g++)
                  if (!l._howls[c]._sounds[g]._paused)
                    return l;
              }
            return l._suspendTimer && clearTimeout(l._suspendTimer), l._suspendTimer = setTimeout(function() {
              if (l.autoSuspend) {
                l._suspendTimer = null, l.state = "suspending";
                var x = function() {
                  l.state = "suspended", l._resumeAfterSuspend && (delete l._resumeAfterSuspend, l._autoResume());
                };
                l.ctx.suspend().then(x, x);
              }
            }, 3e4), l;
          }
        },
        /**
         * Automatically resume the Web Audio AudioContext when a new sound is played.
         * @return {Howler}
         */
        _autoResume: function() {
          var l = this;
          if (!(!l.ctx || typeof l.ctx.resume > "u" || !o.usingWebAudio))
            return l.state === "running" && l.ctx.state !== "interrupted" && l._suspendTimer ? (clearTimeout(l._suspendTimer), l._suspendTimer = null) : l.state === "suspended" || l.state === "running" && l.ctx.state === "interrupted" ? (l.ctx.resume().then(function() {
              l.state = "running";
              for (var c = 0; c < l._howls.length; c++)
                l._howls[c]._emit("resume");
            }), l._suspendTimer && (clearTimeout(l._suspendTimer), l._suspendTimer = null)) : l.state === "suspending" && (l._resumeAfterSuspend = !0), l;
        }
      };
      var o = new n(), i = function(l) {
        var c = this;
        if (!l.src || l.src.length === 0) {
          console.error("An array of source files must be passed with any new Howl.");
          return;
        }
        c.init(l);
      };
      i.prototype = {
        /**
         * Initialize a new Howl group object.
         * @param  {Object} o Passed in properties for this group.
         * @return {Howl}
         */
        init: function(l) {
          var c = this;
          return o.ctx || S(), c._autoplay = l.autoplay || !1, c._format = typeof l.format != "string" ? l.format : [l.format], c._html5 = l.html5 || !1, c._muted = l.mute || !1, c._loop = l.loop || !1, c._pool = l.pool || 5, c._preload = typeof l.preload == "boolean" || l.preload === "metadata" ? l.preload : !0, c._rate = l.rate || 1, c._sprite = l.sprite || {}, c._src = typeof l.src != "string" ? l.src : [l.src], c._volume = l.volume !== void 0 ? l.volume : 1, c._xhr = {
            method: l.xhr && l.xhr.method ? l.xhr.method : "GET",
            headers: l.xhr && l.xhr.headers ? l.xhr.headers : null,
            withCredentials: l.xhr && l.xhr.withCredentials ? l.xhr.withCredentials : !1
          }, c._duration = 0, c._state = "unloaded", c._sounds = [], c._endTimers = {}, c._queue = [], c._playLock = !1, c._onend = l.onend ? [{ fn: l.onend }] : [], c._onfade = l.onfade ? [{ fn: l.onfade }] : [], c._onload = l.onload ? [{ fn: l.onload }] : [], c._onloaderror = l.onloaderror ? [{ fn: l.onloaderror }] : [], c._onplayerror = l.onplayerror ? [{ fn: l.onplayerror }] : [], c._onpause = l.onpause ? [{ fn: l.onpause }] : [], c._onplay = l.onplay ? [{ fn: l.onplay }] : [], c._onstop = l.onstop ? [{ fn: l.onstop }] : [], c._onmute = l.onmute ? [{ fn: l.onmute }] : [], c._onvolume = l.onvolume ? [{ fn: l.onvolume }] : [], c._onrate = l.onrate ? [{ fn: l.onrate }] : [], c._onseek = l.onseek ? [{ fn: l.onseek }] : [], c._onunlock = l.onunlock ? [{ fn: l.onunlock }] : [], c._onresume = [], c._webAudio = o.usingWebAudio && !c._html5, typeof o.ctx < "u" && o.ctx && o.autoUnlock && o._unlockAudio(), o._howls.push(c), c._autoplay && c._queue.push({
            event: "play",
            action: function() {
              c.play();
            }
          }), c._preload && c._preload !== "none" && c.load(), c;
        },
        /**
         * Load the audio file.
         * @return {Howler}
         */
        load: function() {
          var l = this, c = null;
          if (o.noAudio) {
            l._emit("loaderror", null, "No audio support.");
            return;
          }
          typeof l._src == "string" && (l._src = [l._src]);
          for (var g = 0; g < l._src.length; g++) {
            var x, _;
            if (l._format && l._format[g])
              x = l._format[g];
            else {
              if (_ = l._src[g], typeof _ != "string") {
                l._emit("loaderror", null, "Non-string found in selected audio sources - ignoring.");
                continue;
              }
              x = /^data:audio\/([^;,]+);/i.exec(_), x || (x = /\.([^.]+)$/.exec(_.split("?", 1)[0])), x && (x = x[1].toLowerCase());
            }
            if (x || console.warn('No file extension was found. Consider using the "format" property or specify an extension.'), x && o.codecs(x)) {
              c = l._src[g];
              break;
            }
          }
          if (!c) {
            l._emit("loaderror", null, "No codec support for selected audio sources.");
            return;
          }
          return l._src = c, l._state = "loading", window.location.protocol === "https:" && c.slice(0, 5) === "http:" && (l._html5 = !0, l._webAudio = !1), new a(l), l._webAudio && f(l), l;
        },
        /**
         * Play a sound or resume previous playback.
         * @param  {String/Number} sprite   Sprite name for sprite playback or sound id to continue previous.
         * @param  {Boolean} internal Internal Use: true prevents event firing.
         * @return {Number}          Sound ID.
         */
        play: function(l, c) {
          var g = this, x = null;
          if (typeof l == "number")
            x = l, l = null;
          else {
            if (typeof l == "string" && g._state === "loaded" && !g._sprite[l])
              return null;
            if (typeof l > "u" && (l = "__default", !g._playLock)) {
              for (var _ = 0, A = 0; A < g._sounds.length; A++)
                g._sounds[A]._paused && !g._sounds[A]._ended && (_++, x = g._sounds[A]._id);
              _ === 1 ? l = null : x = null;
            }
          }
          var T = x ? g._soundById(x) : g._inactiveSound();
          if (!T)
            return null;
          if (x && !l && (l = T._sprite || "__default"), g._state !== "loaded") {
            T._sprite = l, T._ended = !1;
            var b = T._id;
            return g._queue.push({
              event: "play",
              action: function() {
                g.play(b);
              }
            }), b;
          }
          if (x && !T._paused)
            return c || g._loadQueue("play"), T._id;
          g._webAudio && o._autoResume();
          var E = Math.max(0, T._seek > 0 ? T._seek : g._sprite[l][0] / 1e3), D = Math.max(0, (g._sprite[l][0] + g._sprite[l][1]) / 1e3 - E), L = D * 1e3 / Math.abs(T._rate), G = g._sprite[l][0] / 1e3, W = (g._sprite[l][0] + g._sprite[l][1]) / 1e3;
          T._sprite = l, T._ended = !1;
          var H = function() {
            T._paused = !1, T._seek = E, T._start = G, T._stop = W, T._loop = !!(T._loop || g._sprite[l][2]);
          };
          if (E >= W) {
            g._ended(T);
            return;
          }
          var V = T._node;
          if (g._webAudio) {
            var X = function() {
              g._playLock = !1, H(), g._refreshBuffer(T);
              var fe = T._muted || g._muted ? 0 : T._volume;
              V.gain.setValueAtTime(fe, o.ctx.currentTime), T._playStart = o.ctx.currentTime, typeof V.bufferSource.start > "u" ? T._loop ? V.bufferSource.noteGrainOn(0, E, 86400) : V.bufferSource.noteGrainOn(0, E, D) : T._loop ? V.bufferSource.start(0, E, 86400) : V.bufferSource.start(0, E, D), L !== 1 / 0 && (g._endTimers[T._id] = setTimeout(g._ended.bind(g, T), L)), c || setTimeout(function() {
                g._emit("play", T._id), g._loadQueue();
              }, 0);
            };
            o.state === "running" && o.ctx.state !== "interrupted" ? X() : (g._playLock = !0, g.once("resume", X), g._clearTimer(T._id));
          } else {
            var J = function() {
              V.currentTime = E, V.muted = T._muted || g._muted || o._muted || V.muted, V.volume = T._volume * o.volume(), V.playbackRate = T._rate;
              try {
                var fe = V.play();
                if (fe && typeof Promise < "u" && (fe instanceof Promise || typeof fe.then == "function") ? (g._playLock = !0, H(), fe.then(function() {
                  g._playLock = !1, V._unlocked = !0, c ? g._loadQueue() : g._emit("play", T._id);
                }).catch(function() {
                  g._playLock = !1, g._emit("playerror", T._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction."), T._ended = !0, T._paused = !0;
                })) : c || (g._playLock = !1, H(), g._emit("play", T._id)), V.playbackRate = T._rate, V.paused) {
                  g._emit("playerror", T._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.");
                  return;
                }
                l !== "__default" || T._loop ? g._endTimers[T._id] = setTimeout(g._ended.bind(g, T), L) : (g._endTimers[T._id] = function() {
                  g._ended(T), V.removeEventListener("ended", g._endTimers[T._id], !1);
                }, V.addEventListener("ended", g._endTimers[T._id], !1));
              } catch (ye) {
                g._emit("playerror", T._id, ye);
              }
            };
            V.src === "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA" && (V.src = g._src, V.load());
            var ce = window && window.ejecta || !V.readyState && o._navigator.isCocoonJS;
            if (V.readyState >= 3 || ce)
              J();
            else {
              g._playLock = !0, g._state = "loading";
              var me = function() {
                g._state = "loaded", J(), V.removeEventListener(o._canPlayEvent, me, !1);
              };
              V.addEventListener(o._canPlayEvent, me, !1), g._clearTimer(T._id);
            }
          }
          return T._id;
        },
        /**
         * Pause playback and save current position.
         * @param  {Number} id The sound ID (empty to pause all in group).
         * @return {Howl}
         */
        pause: function(l) {
          var c = this;
          if (c._state !== "loaded" || c._playLock)
            return c._queue.push({
              event: "pause",
              action: function() {
                c.pause(l);
              }
            }), c;
          for (var g = c._getSoundIds(l), x = 0; x < g.length; x++) {
            c._clearTimer(g[x]);
            var _ = c._soundById(g[x]);
            if (_ && !_._paused && (_._seek = c.seek(g[x]), _._rateSeek = 0, _._paused = !0, c._stopFade(g[x]), _._node))
              if (c._webAudio) {
                if (!_._node.bufferSource)
                  continue;
                typeof _._node.bufferSource.stop > "u" ? _._node.bufferSource.noteOff(0) : _._node.bufferSource.stop(0), c._cleanBuffer(_._node);
              } else (!isNaN(_._node.duration) || _._node.duration === 1 / 0) && _._node.pause();
            arguments[1] || c._emit("pause", _ ? _._id : null);
          }
          return c;
        },
        /**
         * Stop playback and reset to start.
         * @param  {Number} id The sound ID (empty to stop all in group).
         * @param  {Boolean} internal Internal Use: true prevents event firing.
         * @return {Howl}
         */
        stop: function(l, c) {
          var g = this;
          if (g._state !== "loaded" || g._playLock)
            return g._queue.push({
              event: "stop",
              action: function() {
                g.stop(l);
              }
            }), g;
          for (var x = g._getSoundIds(l), _ = 0; _ < x.length; _++) {
            g._clearTimer(x[_]);
            var A = g._soundById(x[_]);
            A && (A._seek = A._start || 0, A._rateSeek = 0, A._paused = !0, A._ended = !0, g._stopFade(x[_]), A._node && (g._webAudio ? A._node.bufferSource && (typeof A._node.bufferSource.stop > "u" ? A._node.bufferSource.noteOff(0) : A._node.bufferSource.stop(0), g._cleanBuffer(A._node)) : (!isNaN(A._node.duration) || A._node.duration === 1 / 0) && (A._node.currentTime = A._start || 0, A._node.pause(), A._node.duration === 1 / 0 && g._clearSound(A._node))), c || g._emit("stop", A._id));
          }
          return g;
        },
        /**
         * Mute/unmute a single sound or all sounds in this Howl group.
         * @param  {Boolean} muted Set to true to mute and false to unmute.
         * @param  {Number} id    The sound ID to update (omit to mute/unmute all).
         * @return {Howl}
         */
        mute: function(l, c) {
          var g = this;
          if (g._state !== "loaded" || g._playLock)
            return g._queue.push({
              event: "mute",
              action: function() {
                g.mute(l, c);
              }
            }), g;
          if (typeof c > "u")
            if (typeof l == "boolean")
              g._muted = l;
            else
              return g._muted;
          for (var x = g._getSoundIds(c), _ = 0; _ < x.length; _++) {
            var A = g._soundById(x[_]);
            A && (A._muted = l, A._interval && g._stopFade(A._id), g._webAudio && A._node ? A._node.gain.setValueAtTime(l ? 0 : A._volume, o.ctx.currentTime) : A._node && (A._node.muted = o._muted ? !0 : l), g._emit("mute", A._id));
          }
          return g;
        },
        /**
         * Get/set the volume of this sound or of the Howl group. This method can optionally take 0, 1 or 2 arguments.
         *   volume() -> Returns the group's volume value.
         *   volume(id) -> Returns the sound id's current volume.
         *   volume(vol) -> Sets the volume of all sounds in this Howl group.
         *   volume(vol, id) -> Sets the volume of passed sound id.
         * @return {Howl/Number} Returns self or current volume.
         */
        volume: function() {
          var l = this, c = arguments, g, x;
          if (c.length === 0)
            return l._volume;
          if (c.length === 1 || c.length === 2 && typeof c[1] > "u") {
            var _ = l._getSoundIds(), A = _.indexOf(c[0]);
            A >= 0 ? x = parseInt(c[0], 10) : g = parseFloat(c[0]);
          } else c.length >= 2 && (g = parseFloat(c[0]), x = parseInt(c[1], 10));
          var T;
          if (typeof g < "u" && g >= 0 && g <= 1) {
            if (l._state !== "loaded" || l._playLock)
              return l._queue.push({
                event: "volume",
                action: function() {
                  l.volume.apply(l, c);
                }
              }), l;
            typeof x > "u" && (l._volume = g), x = l._getSoundIds(x);
            for (var b = 0; b < x.length; b++)
              T = l._soundById(x[b]), T && (T._volume = g, c[2] || l._stopFade(x[b]), l._webAudio && T._node && !T._muted ? T._node.gain.setValueAtTime(g, o.ctx.currentTime) : T._node && !T._muted && (T._node.volume = g * o.volume()), l._emit("volume", T._id));
          } else
            return T = x ? l._soundById(x) : l._sounds[0], T ? T._volume : 0;
          return l;
        },
        /**
         * Fade a currently playing sound between two volumes (if no id is passed, all sounds will fade).
         * @param  {Number} from The value to fade from (0.0 to 1.0).
         * @param  {Number} to   The volume to fade to (0.0 to 1.0).
         * @param  {Number} len  Time in milliseconds to fade.
         * @param  {Number} id   The sound id (omit to fade all sounds).
         * @return {Howl}
         */
        fade: function(l, c, g, x) {
          var _ = this;
          if (_._state !== "loaded" || _._playLock)
            return _._queue.push({
              event: "fade",
              action: function() {
                _.fade(l, c, g, x);
              }
            }), _;
          l = Math.min(Math.max(0, parseFloat(l)), 1), c = Math.min(Math.max(0, parseFloat(c)), 1), g = parseFloat(g), _.volume(l, x);
          for (var A = _._getSoundIds(x), T = 0; T < A.length; T++) {
            var b = _._soundById(A[T]);
            if (b) {
              if (x || _._stopFade(A[T]), _._webAudio && !b._muted) {
                var E = o.ctx.currentTime, D = E + g / 1e3;
                b._volume = l, b._node.gain.setValueAtTime(l, E), b._node.gain.linearRampToValueAtTime(c, D);
              }
              _._startFadeInterval(b, l, c, g, A[T], typeof x > "u");
            }
          }
          return _;
        },
        /**
         * Starts the internal interval to fade a sound.
         * @param  {Object} sound Reference to sound to fade.
         * @param  {Number} from The value to fade from (0.0 to 1.0).
         * @param  {Number} to   The volume to fade to (0.0 to 1.0).
         * @param  {Number} len  Time in milliseconds to fade.
         * @param  {Number} id   The sound id to fade.
         * @param  {Boolean} isGroup   If true, set the volume on the group.
         */
        _startFadeInterval: function(l, c, g, x, _, A) {
          var T = this, b = c, E = g - c, D = Math.abs(E / 0.01), L = Math.max(4, D > 0 ? x / D : x), G = Date.now();
          l._fadeTo = g, l._interval = setInterval(function() {
            var W = (Date.now() - G) / x;
            G = Date.now(), b += E * W, b = Math.round(b * 100) / 100, E < 0 ? b = Math.max(g, b) : b = Math.min(g, b), T._webAudio ? l._volume = b : T.volume(b, l._id, !0), A && (T._volume = b), (g < c && b <= g || g > c && b >= g) && (clearInterval(l._interval), l._interval = null, l._fadeTo = null, T.volume(g, l._id), T._emit("fade", l._id));
          }, L);
        },
        /**
         * Internal method that stops the currently playing fade when
         * a new fade starts, volume is changed or the sound is stopped.
         * @param  {Number} id The sound id.
         * @return {Howl}
         */
        _stopFade: function(l) {
          var c = this, g = c._soundById(l);
          return g && g._interval && (c._webAudio && g._node.gain.cancelScheduledValues(o.ctx.currentTime), clearInterval(g._interval), g._interval = null, c.volume(g._fadeTo, l), g._fadeTo = null, c._emit("fade", l)), c;
        },
        /**
         * Get/set the loop parameter on a sound. This method can optionally take 0, 1 or 2 arguments.
         *   loop() -> Returns the group's loop value.
         *   loop(id) -> Returns the sound id's loop value.
         *   loop(loop) -> Sets the loop value for all sounds in this Howl group.
         *   loop(loop, id) -> Sets the loop value of passed sound id.
         * @return {Howl/Boolean} Returns self or current loop value.
         */
        loop: function() {
          var l = this, c = arguments, g, x, _;
          if (c.length === 0)
            return l._loop;
          if (c.length === 1)
            if (typeof c[0] == "boolean")
              g = c[0], l._loop = g;
            else
              return _ = l._soundById(parseInt(c[0], 10)), _ ? _._loop : !1;
          else c.length === 2 && (g = c[0], x = parseInt(c[1], 10));
          for (var A = l._getSoundIds(x), T = 0; T < A.length; T++)
            _ = l._soundById(A[T]), _ && (_._loop = g, l._webAudio && _._node && _._node.bufferSource && (_._node.bufferSource.loop = g, g && (_._node.bufferSource.loopStart = _._start || 0, _._node.bufferSource.loopEnd = _._stop, l.playing(A[T]) && (l.pause(A[T], !0), l.play(A[T], !0)))));
          return l;
        },
        /**
         * Get/set the playback rate of a sound. This method can optionally take 0, 1 or 2 arguments.
         *   rate() -> Returns the first sound node's current playback rate.
         *   rate(id) -> Returns the sound id's current playback rate.
         *   rate(rate) -> Sets the playback rate of all sounds in this Howl group.
         *   rate(rate, id) -> Sets the playback rate of passed sound id.
         * @return {Howl/Number} Returns self or the current playback rate.
         */
        rate: function() {
          var l = this, c = arguments, g, x;
          if (c.length === 0)
            x = l._sounds[0]._id;
          else if (c.length === 1) {
            var _ = l._getSoundIds(), A = _.indexOf(c[0]);
            A >= 0 ? x = parseInt(c[0], 10) : g = parseFloat(c[0]);
          } else c.length === 2 && (g = parseFloat(c[0]), x = parseInt(c[1], 10));
          var T;
          if (typeof g == "number") {
            if (l._state !== "loaded" || l._playLock)
              return l._queue.push({
                event: "rate",
                action: function() {
                  l.rate.apply(l, c);
                }
              }), l;
            typeof x > "u" && (l._rate = g), x = l._getSoundIds(x);
            for (var b = 0; b < x.length; b++)
              if (T = l._soundById(x[b]), T) {
                l.playing(x[b]) && (T._rateSeek = l.seek(x[b]), T._playStart = l._webAudio ? o.ctx.currentTime : T._playStart), T._rate = g, l._webAudio && T._node && T._node.bufferSource ? T._node.bufferSource.playbackRate.setValueAtTime(g, o.ctx.currentTime) : T._node && (T._node.playbackRate = g);
                var E = l.seek(x[b]), D = (l._sprite[T._sprite][0] + l._sprite[T._sprite][1]) / 1e3 - E, L = D * 1e3 / Math.abs(T._rate);
                (l._endTimers[x[b]] || !T._paused) && (l._clearTimer(x[b]), l._endTimers[x[b]] = setTimeout(l._ended.bind(l, T), L)), l._emit("rate", T._id);
              }
          } else
            return T = l._soundById(x), T ? T._rate : l._rate;
          return l;
        },
        /**
         * Get/set the seek position of a sound. This method can optionally take 0, 1 or 2 arguments.
         *   seek() -> Returns the first sound node's current seek position.
         *   seek(id) -> Returns the sound id's current seek position.
         *   seek(seek) -> Sets the seek position of the first sound node.
         *   seek(seek, id) -> Sets the seek position of passed sound id.
         * @return {Howl/Number} Returns self or the current seek position.
         */
        seek: function() {
          var l = this, c = arguments, g, x;
          if (c.length === 0)
            l._sounds.length && (x = l._sounds[0]._id);
          else if (c.length === 1) {
            var _ = l._getSoundIds(), A = _.indexOf(c[0]);
            A >= 0 ? x = parseInt(c[0], 10) : l._sounds.length && (x = l._sounds[0]._id, g = parseFloat(c[0]));
          } else c.length === 2 && (g = parseFloat(c[0]), x = parseInt(c[1], 10));
          if (typeof x > "u")
            return 0;
          if (typeof g == "number" && (l._state !== "loaded" || l._playLock))
            return l._queue.push({
              event: "seek",
              action: function() {
                l.seek.apply(l, c);
              }
            }), l;
          var T = l._soundById(x);
          if (T)
            if (typeof g == "number" && g >= 0) {
              var b = l.playing(x);
              b && l.pause(x, !0), T._seek = g, T._ended = !1, l._clearTimer(x), !l._webAudio && T._node && !isNaN(T._node.duration) && (T._node.currentTime = g);
              var E = function() {
                b && l.play(x, !0), l._emit("seek", x);
              };
              if (b && !l._webAudio) {
                var D = function() {
                  l._playLock ? setTimeout(D, 0) : E();
                };
                setTimeout(D, 0);
              } else
                E();
            } else if (l._webAudio) {
              var L = l.playing(x) ? o.ctx.currentTime - T._playStart : 0, G = T._rateSeek ? T._rateSeek - T._seek : 0;
              return T._seek + (G + L * Math.abs(T._rate));
            } else
              return T._node.currentTime;
          return l;
        },
        /**
         * Check if a specific sound is currently playing or not (if id is provided), or check if at least one of the sounds in the group is playing or not.
         * @param  {Number}  id The sound id to check. If none is passed, the whole sound group is checked.
         * @return {Boolean} True if playing and false if not.
         */
        playing: function(l) {
          var c = this;
          if (typeof l == "number") {
            var g = c._soundById(l);
            return g ? !g._paused : !1;
          }
          for (var x = 0; x < c._sounds.length; x++)
            if (!c._sounds[x]._paused)
              return !0;
          return !1;
        },
        /**
         * Get the duration of this sound. Passing a sound id will return the sprite duration.
         * @param  {Number} id The sound id to check. If none is passed, return full source duration.
         * @return {Number} Audio duration in seconds.
         */
        duration: function(l) {
          var c = this, g = c._duration, x = c._soundById(l);
          return x && (g = c._sprite[x._sprite][1] / 1e3), g;
        },
        /**
         * Returns the current loaded state of this Howl.
         * @return {String} 'unloaded', 'loading', 'loaded'
         */
        state: function() {
          return this._state;
        },
        /**
         * Unload and destroy the current Howl object.
         * This will immediately stop all sound instances attached to this group.
         */
        unload: function() {
          for (var l = this, c = l._sounds, g = 0; g < c.length; g++)
            c[g]._paused || l.stop(c[g]._id), l._webAudio || (l._clearSound(c[g]._node), c[g]._node.removeEventListener("error", c[g]._errorFn, !1), c[g]._node.removeEventListener(o._canPlayEvent, c[g]._loadFn, !1), c[g]._node.removeEventListener("ended", c[g]._endFn, !1), o._releaseHtml5Audio(c[g]._node)), delete c[g]._node, l._clearTimer(c[g]._id);
          var x = o._howls.indexOf(l);
          x >= 0 && o._howls.splice(x, 1);
          var _ = !0;
          for (g = 0; g < o._howls.length; g++)
            if (o._howls[g]._src === l._src || l._src.indexOf(o._howls[g]._src) >= 0) {
              _ = !1;
              break;
            }
          return d && _ && delete d[l._src], o.noAudio = !1, l._state = "unloaded", l._sounds = [], l = null, null;
        },
        /**
         * Listen to a custom event.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to call.
         * @param  {Number}   id    (optional) Only listen to events for this sound.
         * @param  {Number}   once  (INTERNAL) Marks event to fire only once.
         * @return {Howl}
         */
        on: function(l, c, g, x) {
          var _ = this, A = _["_on" + l];
          return typeof c == "function" && A.push(x ? { id: g, fn: c, once: x } : { id: g, fn: c }), _;
        },
        /**
         * Remove a custom event. Call without parameters to remove all events.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to remove. Leave empty to remove all.
         * @param  {Number}   id    (optional) Only remove events for this sound.
         * @return {Howl}
         */
        off: function(l, c, g) {
          var x = this, _ = x["_on" + l], A = 0;
          if (typeof c == "number" && (g = c, c = null), c || g)
            for (A = 0; A < _.length; A++) {
              var T = g === _[A].id;
              if (c === _[A].fn && T || !c && T) {
                _.splice(A, 1);
                break;
              }
            }
          else if (l)
            x["_on" + l] = [];
          else {
            var b = Object.keys(x);
            for (A = 0; A < b.length; A++)
              b[A].indexOf("_on") === 0 && Array.isArray(x[b[A]]) && (x[b[A]] = []);
          }
          return x;
        },
        /**
         * Listen to a custom event and remove it once fired.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to call.
         * @param  {Number}   id    (optional) Only listen to events for this sound.
         * @return {Howl}
         */
        once: function(l, c, g) {
          var x = this;
          return x.on(l, c, g, 1), x;
        },
        /**
         * Emit all events of a specific type and pass the sound id.
         * @param  {String} event Event name.
         * @param  {Number} id    Sound ID.
         * @param  {Number} msg   Message to go with event.
         * @return {Howl}
         */
        _emit: function(l, c, g) {
          for (var x = this, _ = x["_on" + l], A = _.length - 1; A >= 0; A--)
            (!_[A].id || _[A].id === c || l === "load") && (setTimeout((function(T) {
              T.call(this, c, g);
            }).bind(x, _[A].fn), 0), _[A].once && x.off(l, _[A].fn, _[A].id));
          return x._loadQueue(l), x;
        },
        /**
         * Queue of actions initiated before the sound has loaded.
         * These will be called in sequence, with the next only firing
         * after the previous has finished executing (even if async like play).
         * @return {Howl}
         */
        _loadQueue: function(l) {
          var c = this;
          if (c._queue.length > 0) {
            var g = c._queue[0];
            g.event === l && (c._queue.shift(), c._loadQueue()), l || g.action();
          }
          return c;
        },
        /**
         * Fired when playback ends at the end of the duration.
         * @param  {Sound} sound The sound object to work with.
         * @return {Howl}
         */
        _ended: function(l) {
          var c = this, g = l._sprite;
          if (!c._webAudio && l._node && !l._node.paused && !l._node.ended && l._node.currentTime < l._stop)
            return setTimeout(c._ended.bind(c, l), 100), c;
          var x = !!(l._loop || c._sprite[g][2]);
          if (c._emit("end", l._id), !c._webAudio && x && c.stop(l._id, !0).play(l._id), c._webAudio && x) {
            c._emit("play", l._id), l._seek = l._start || 0, l._rateSeek = 0, l._playStart = o.ctx.currentTime;
            var _ = (l._stop - l._start) * 1e3 / Math.abs(l._rate);
            c._endTimers[l._id] = setTimeout(c._ended.bind(c, l), _);
          }
          return c._webAudio && !x && (l._paused = !0, l._ended = !0, l._seek = l._start || 0, l._rateSeek = 0, c._clearTimer(l._id), c._cleanBuffer(l._node), o._autoSuspend()), !c._webAudio && !x && c.stop(l._id, !0), c;
        },
        /**
         * Clear the end timer for a sound playback.
         * @param  {Number} id The sound ID.
         * @return {Howl}
         */
        _clearTimer: function(l) {
          var c = this;
          if (c._endTimers[l]) {
            if (typeof c._endTimers[l] != "function")
              clearTimeout(c._endTimers[l]);
            else {
              var g = c._soundById(l);
              g && g._node && g._node.removeEventListener("ended", c._endTimers[l], !1);
            }
            delete c._endTimers[l];
          }
          return c;
        },
        /**
         * Return the sound identified by this ID, or return null.
         * @param  {Number} id Sound ID
         * @return {Object}    Sound object or null.
         */
        _soundById: function(l) {
          for (var c = this, g = 0; g < c._sounds.length; g++)
            if (l === c._sounds[g]._id)
              return c._sounds[g];
          return null;
        },
        /**
         * Return an inactive sound from the pool or create a new one.
         * @return {Sound} Sound playback object.
         */
        _inactiveSound: function() {
          var l = this;
          l._drain();
          for (var c = 0; c < l._sounds.length; c++)
            if (l._sounds[c]._ended)
              return l._sounds[c].reset();
          return new a(l);
        },
        /**
         * Drain excess inactive sounds from the pool.
         */
        _drain: function() {
          var l = this, c = l._pool, g = 0, x = 0;
          if (!(l._sounds.length < c)) {
            for (x = 0; x < l._sounds.length; x++)
              l._sounds[x]._ended && g++;
            for (x = l._sounds.length - 1; x >= 0; x--) {
              if (g <= c)
                return;
              l._sounds[x]._ended && (l._webAudio && l._sounds[x]._node && l._sounds[x]._node.disconnect(0), l._sounds.splice(x, 1), g--);
            }
          }
        },
        /**
         * Get all ID's from the sounds pool.
         * @param  {Number} id Only return one ID if one is passed.
         * @return {Array}    Array of IDs.
         */
        _getSoundIds: function(l) {
          var c = this;
          if (typeof l > "u") {
            for (var g = [], x = 0; x < c._sounds.length; x++)
              g.push(c._sounds[x]._id);
            return g;
          } else
            return [l];
        },
        /**
         * Load the sound back into the buffer source.
         * @param  {Sound} sound The sound object to work with.
         * @return {Howl}
         */
        _refreshBuffer: function(l) {
          var c = this;
          return l._node.bufferSource = o.ctx.createBufferSource(), l._node.bufferSource.buffer = d[c._src], l._panner ? l._node.bufferSource.connect(l._panner) : l._node.bufferSource.connect(l._node), l._node.bufferSource.loop = l._loop, l._loop && (l._node.bufferSource.loopStart = l._start || 0, l._node.bufferSource.loopEnd = l._stop || 0), l._node.bufferSource.playbackRate.setValueAtTime(l._rate, o.ctx.currentTime), c;
        },
        /**
         * Prevent memory leaks by cleaning up the buffer source after playback.
         * @param  {Object} node Sound's audio node containing the buffer source.
         * @return {Howl}
         */
        _cleanBuffer: function(l) {
          var c = this, g = o._navigator && o._navigator.vendor.indexOf("Apple") >= 0;
          if (!l.bufferSource)
            return c;
          if (o._scratchBuffer && l.bufferSource && (l.bufferSource.onended = null, l.bufferSource.disconnect(0), g))
            try {
              l.bufferSource.buffer = o._scratchBuffer;
            } catch {
            }
          return l.bufferSource = null, c;
        },
        /**
         * Set the source to a 0-second silence to stop any downloading (except in IE).
         * @param  {Object} node Audio node to clear.
         */
        _clearSound: function(l) {
          var c = /MSIE |Trident\//.test(o._navigator && o._navigator.userAgent);
          c || (l.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
        }
      };
      var a = function(l) {
        this._parent = l, this.init();
      };
      a.prototype = {
        /**
         * Initialize a new Sound object.
         * @return {Sound}
         */
        init: function() {
          var l = this, c = l._parent;
          return l._muted = c._muted, l._loop = c._loop, l._volume = c._volume, l._rate = c._rate, l._seek = 0, l._paused = !0, l._ended = !0, l._sprite = "__default", l._id = ++o._counter, c._sounds.push(l), l.create(), l;
        },
        /**
         * Create and setup a new sound object, whether HTML5 Audio or Web Audio.
         * @return {Sound}
         */
        create: function() {
          var l = this, c = l._parent, g = o._muted || l._muted || l._parent._muted ? 0 : l._volume;
          return c._webAudio ? (l._node = typeof o.ctx.createGain > "u" ? o.ctx.createGainNode() : o.ctx.createGain(), l._node.gain.setValueAtTime(g, o.ctx.currentTime), l._node.paused = !0, l._node.connect(o.masterGain)) : o.noAudio || (l._node = o._obtainHtml5Audio(), l._errorFn = l._errorListener.bind(l), l._node.addEventListener("error", l._errorFn, !1), l._loadFn = l._loadListener.bind(l), l._node.addEventListener(o._canPlayEvent, l._loadFn, !1), l._endFn = l._endListener.bind(l), l._node.addEventListener("ended", l._endFn, !1), l._node.src = c._src, l._node.preload = c._preload === !0 ? "auto" : c._preload, l._node.volume = g * o.volume(), l._node.load()), l;
        },
        /**
         * Reset the parameters of this sound to the original state (for recycle).
         * @return {Sound}
         */
        reset: function() {
          var l = this, c = l._parent;
          return l._muted = c._muted, l._loop = c._loop, l._volume = c._volume, l._rate = c._rate, l._seek = 0, l._rateSeek = 0, l._paused = !0, l._ended = !0, l._sprite = "__default", l._id = ++o._counter, l;
        },
        /**
         * HTML5 Audio error listener callback.
         */
        _errorListener: function() {
          var l = this;
          l._parent._emit("loaderror", l._id, l._node.error ? l._node.error.code : 0), l._node.removeEventListener("error", l._errorFn, !1);
        },
        /**
         * HTML5 Audio canplaythrough listener callback.
         */
        _loadListener: function() {
          var l = this, c = l._parent;
          c._duration = Math.ceil(l._node.duration * 10) / 10, Object.keys(c._sprite).length === 0 && (c._sprite = { __default: [0, c._duration * 1e3] }), c._state !== "loaded" && (c._state = "loaded", c._emit("load"), c._loadQueue()), l._node.removeEventListener(o._canPlayEvent, l._loadFn, !1);
        },
        /**
         * HTML5 Audio ended listener callback.
         */
        _endListener: function() {
          var l = this, c = l._parent;
          c._duration === 1 / 0 && (c._duration = Math.ceil(l._node.duration * 10) / 10, c._sprite.__default[1] === 1 / 0 && (c._sprite.__default[1] = c._duration * 1e3), c._ended(l)), l._node.removeEventListener("ended", l._endFn, !1);
        }
      };
      var d = {}, f = function(l) {
        var c = l._src;
        if (d[c]) {
          l._duration = d[c].duration, y(l);
          return;
        }
        if (/^data:[^;]+;base64,/.test(c)) {
          for (var g = atob(c.split(",")[1]), x = new Uint8Array(g.length), _ = 0; _ < g.length; ++_)
            x[_] = g.charCodeAt(_);
          m(x.buffer, l);
        } else {
          var A = new XMLHttpRequest();
          A.open(l._xhr.method, c, !0), A.withCredentials = l._xhr.withCredentials, A.responseType = "arraybuffer", l._xhr.headers && Object.keys(l._xhr.headers).forEach(function(T) {
            A.setRequestHeader(T, l._xhr.headers[T]);
          }), A.onload = function() {
            var T = (A.status + "")[0];
            if (T !== "0" && T !== "2" && T !== "3") {
              l._emit("loaderror", null, "Failed loading audio file with status: " + A.status + ".");
              return;
            }
            m(A.response, l);
          }, A.onerror = function() {
            l._webAudio && (l._html5 = !0, l._webAudio = !1, l._sounds = [], delete d[c], l.load());
          }, p(A);
        }
      }, p = function(l) {
        try {
          l.send();
        } catch {
          l.onerror();
        }
      }, m = function(l, c) {
        var g = function() {
          c._emit("loaderror", null, "Decoding audio data failed.");
        }, x = function(_) {
          _ && c._sounds.length > 0 ? (d[c._src] = _, y(c, _)) : g();
        };
        typeof Promise < "u" && o.ctx.decodeAudioData.length === 1 ? o.ctx.decodeAudioData(l).then(x).catch(g) : o.ctx.decodeAudioData(l, x, g);
      }, y = function(l, c) {
        c && !l._duration && (l._duration = c.duration), Object.keys(l._sprite).length === 0 && (l._sprite = { __default: [0, l._duration * 1e3] }), l._state !== "loaded" && (l._state = "loaded", l._emit("load"), l._loadQueue());
      }, S = function() {
        if (o.usingWebAudio) {
          try {
            typeof AudioContext < "u" ? o.ctx = new AudioContext() : typeof webkitAudioContext < "u" ? o.ctx = new webkitAudioContext() : o.usingWebAudio = !1;
          } catch {
            o.usingWebAudio = !1;
          }
          o.ctx || (o.usingWebAudio = !1);
          var l = /iP(hone|od|ad)/.test(o._navigator && o._navigator.platform), c = o._navigator && o._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/), g = c ? parseInt(c[1], 10) : null;
          if (l && g && g < 9) {
            var x = /safari/.test(o._navigator && o._navigator.userAgent.toLowerCase());
            o._navigator && !x && (o.usingWebAudio = !1);
          }
          o.usingWebAudio && (o.masterGain = typeof o.ctx.createGain > "u" ? o.ctx.createGainNode() : o.ctx.createGain(), o.masterGain.gain.setValueAtTime(o._muted ? 0 : o._volume, o.ctx.currentTime), o.masterGain.connect(o.ctx.destination)), o._setup();
        }
      };
      e.Howler = o, e.Howl = i, typeof ti < "u" ? (ti.HowlerGlobal = n, ti.Howler = o, ti.Howl = i, ti.Sound = a) : typeof window < "u" && (window.HowlerGlobal = n, window.Howler = o, window.Howl = i, window.Sound = a);
    })();
    /*!
     *  Spatial Plugin - Adds support for stereo and 3D audio where Web Audio is supported.
     *  
     *  howler.js v2.2.4
     *  howlerjs.com
     *
     *  (c) 2013-2020, James Simpson of GoldFire Studios
     *  goldfirestudios.com
     *
     *  MIT License
     */
    (function() {
      HowlerGlobal.prototype._pos = [0, 0, 0], HowlerGlobal.prototype._orientation = [0, 0, -1, 0, 1, 0], HowlerGlobal.prototype.stereo = function(o) {
        var i = this;
        if (!i.ctx || !i.ctx.listener)
          return i;
        for (var a = i._howls.length - 1; a >= 0; a--)
          i._howls[a].stereo(o);
        return i;
      }, HowlerGlobal.prototype.pos = function(o, i, a) {
        var d = this;
        if (!d.ctx || !d.ctx.listener)
          return d;
        if (i = typeof i != "number" ? d._pos[1] : i, a = typeof a != "number" ? d._pos[2] : a, typeof o == "number")
          d._pos = [o, i, a], typeof d.ctx.listener.positionX < "u" ? (d.ctx.listener.positionX.setTargetAtTime(d._pos[0], Howler.ctx.currentTime, 0.1), d.ctx.listener.positionY.setTargetAtTime(d._pos[1], Howler.ctx.currentTime, 0.1), d.ctx.listener.positionZ.setTargetAtTime(d._pos[2], Howler.ctx.currentTime, 0.1)) : d.ctx.listener.setPosition(d._pos[0], d._pos[1], d._pos[2]);
        else
          return d._pos;
        return d;
      }, HowlerGlobal.prototype.orientation = function(o, i, a, d, f, p) {
        var m = this;
        if (!m.ctx || !m.ctx.listener)
          return m;
        var y = m._orientation;
        if (i = typeof i != "number" ? y[1] : i, a = typeof a != "number" ? y[2] : a, d = typeof d != "number" ? y[3] : d, f = typeof f != "number" ? y[4] : f, p = typeof p != "number" ? y[5] : p, typeof o == "number")
          m._orientation = [o, i, a, d, f, p], typeof m.ctx.listener.forwardX < "u" ? (m.ctx.listener.forwardX.setTargetAtTime(o, Howler.ctx.currentTime, 0.1), m.ctx.listener.forwardY.setTargetAtTime(i, Howler.ctx.currentTime, 0.1), m.ctx.listener.forwardZ.setTargetAtTime(a, Howler.ctx.currentTime, 0.1), m.ctx.listener.upX.setTargetAtTime(d, Howler.ctx.currentTime, 0.1), m.ctx.listener.upY.setTargetAtTime(f, Howler.ctx.currentTime, 0.1), m.ctx.listener.upZ.setTargetAtTime(p, Howler.ctx.currentTime, 0.1)) : m.ctx.listener.setOrientation(o, i, a, d, f, p);
        else
          return y;
        return m;
      }, Howl.prototype.init = /* @__PURE__ */ (function(o) {
        return function(i) {
          var a = this;
          return a._orientation = i.orientation || [1, 0, 0], a._stereo = i.stereo || null, a._pos = i.pos || null, a._pannerAttr = {
            coneInnerAngle: typeof i.coneInnerAngle < "u" ? i.coneInnerAngle : 360,
            coneOuterAngle: typeof i.coneOuterAngle < "u" ? i.coneOuterAngle : 360,
            coneOuterGain: typeof i.coneOuterGain < "u" ? i.coneOuterGain : 0,
            distanceModel: typeof i.distanceModel < "u" ? i.distanceModel : "inverse",
            maxDistance: typeof i.maxDistance < "u" ? i.maxDistance : 1e4,
            panningModel: typeof i.panningModel < "u" ? i.panningModel : "HRTF",
            refDistance: typeof i.refDistance < "u" ? i.refDistance : 1,
            rolloffFactor: typeof i.rolloffFactor < "u" ? i.rolloffFactor : 1
          }, a._onstereo = i.onstereo ? [{ fn: i.onstereo }] : [], a._onpos = i.onpos ? [{ fn: i.onpos }] : [], a._onorientation = i.onorientation ? [{ fn: i.onorientation }] : [], o.call(this, i);
        };
      })(Howl.prototype.init), Howl.prototype.stereo = function(o, i) {
        var a = this;
        if (!a._webAudio)
          return a;
        if (a._state !== "loaded")
          return a._queue.push({
            event: "stereo",
            action: function() {
              a.stereo(o, i);
            }
          }), a;
        var d = typeof Howler.ctx.createStereoPanner > "u" ? "spatial" : "stereo";
        if (typeof i > "u")
          if (typeof o == "number")
            a._stereo = o, a._pos = [o, 0, 0];
          else
            return a._stereo;
        for (var f = a._getSoundIds(i), p = 0; p < f.length; p++) {
          var m = a._soundById(f[p]);
          if (m)
            if (typeof o == "number")
              m._stereo = o, m._pos = [o, 0, 0], m._node && (m._pannerAttr.panningModel = "equalpower", (!m._panner || !m._panner.pan) && n(m, d), d === "spatial" ? typeof m._panner.positionX < "u" ? (m._panner.positionX.setValueAtTime(o, Howler.ctx.currentTime), m._panner.positionY.setValueAtTime(0, Howler.ctx.currentTime), m._panner.positionZ.setValueAtTime(0, Howler.ctx.currentTime)) : m._panner.setPosition(o, 0, 0) : m._panner.pan.setValueAtTime(o, Howler.ctx.currentTime)), a._emit("stereo", m._id);
            else
              return m._stereo;
        }
        return a;
      }, Howl.prototype.pos = function(o, i, a, d) {
        var f = this;
        if (!f._webAudio)
          return f;
        if (f._state !== "loaded")
          return f._queue.push({
            event: "pos",
            action: function() {
              f.pos(o, i, a, d);
            }
          }), f;
        if (i = typeof i != "number" ? 0 : i, a = typeof a != "number" ? -0.5 : a, typeof d > "u")
          if (typeof o == "number")
            f._pos = [o, i, a];
          else
            return f._pos;
        for (var p = f._getSoundIds(d), m = 0; m < p.length; m++) {
          var y = f._soundById(p[m]);
          if (y)
            if (typeof o == "number")
              y._pos = [o, i, a], y._node && ((!y._panner || y._panner.pan) && n(y, "spatial"), typeof y._panner.positionX < "u" ? (y._panner.positionX.setValueAtTime(o, Howler.ctx.currentTime), y._panner.positionY.setValueAtTime(i, Howler.ctx.currentTime), y._panner.positionZ.setValueAtTime(a, Howler.ctx.currentTime)) : y._panner.setPosition(o, i, a)), f._emit("pos", y._id);
            else
              return y._pos;
        }
        return f;
      }, Howl.prototype.orientation = function(o, i, a, d) {
        var f = this;
        if (!f._webAudio)
          return f;
        if (f._state !== "loaded")
          return f._queue.push({
            event: "orientation",
            action: function() {
              f.orientation(o, i, a, d);
            }
          }), f;
        if (i = typeof i != "number" ? f._orientation[1] : i, a = typeof a != "number" ? f._orientation[2] : a, typeof d > "u")
          if (typeof o == "number")
            f._orientation = [o, i, a];
          else
            return f._orientation;
        for (var p = f._getSoundIds(d), m = 0; m < p.length; m++) {
          var y = f._soundById(p[m]);
          if (y)
            if (typeof o == "number")
              y._orientation = [o, i, a], y._node && (y._panner || (y._pos || (y._pos = f._pos || [0, 0, -0.5]), n(y, "spatial")), typeof y._panner.orientationX < "u" ? (y._panner.orientationX.setValueAtTime(o, Howler.ctx.currentTime), y._panner.orientationY.setValueAtTime(i, Howler.ctx.currentTime), y._panner.orientationZ.setValueAtTime(a, Howler.ctx.currentTime)) : y._panner.setOrientation(o, i, a)), f._emit("orientation", y._id);
            else
              return y._orientation;
        }
        return f;
      }, Howl.prototype.pannerAttr = function() {
        var o = this, i = arguments, a, d, f;
        if (!o._webAudio)
          return o;
        if (i.length === 0)
          return o._pannerAttr;
        if (i.length === 1)
          if (typeof i[0] == "object")
            a = i[0], typeof d > "u" && (a.pannerAttr || (a.pannerAttr = {
              coneInnerAngle: a.coneInnerAngle,
              coneOuterAngle: a.coneOuterAngle,
              coneOuterGain: a.coneOuterGain,
              distanceModel: a.distanceModel,
              maxDistance: a.maxDistance,
              refDistance: a.refDistance,
              rolloffFactor: a.rolloffFactor,
              panningModel: a.panningModel
            }), o._pannerAttr = {
              coneInnerAngle: typeof a.pannerAttr.coneInnerAngle < "u" ? a.pannerAttr.coneInnerAngle : o._coneInnerAngle,
              coneOuterAngle: typeof a.pannerAttr.coneOuterAngle < "u" ? a.pannerAttr.coneOuterAngle : o._coneOuterAngle,
              coneOuterGain: typeof a.pannerAttr.coneOuterGain < "u" ? a.pannerAttr.coneOuterGain : o._coneOuterGain,
              distanceModel: typeof a.pannerAttr.distanceModel < "u" ? a.pannerAttr.distanceModel : o._distanceModel,
              maxDistance: typeof a.pannerAttr.maxDistance < "u" ? a.pannerAttr.maxDistance : o._maxDistance,
              refDistance: typeof a.pannerAttr.refDistance < "u" ? a.pannerAttr.refDistance : o._refDistance,
              rolloffFactor: typeof a.pannerAttr.rolloffFactor < "u" ? a.pannerAttr.rolloffFactor : o._rolloffFactor,
              panningModel: typeof a.pannerAttr.panningModel < "u" ? a.pannerAttr.panningModel : o._panningModel
            });
          else
            return f = o._soundById(parseInt(i[0], 10)), f ? f._pannerAttr : o._pannerAttr;
        else i.length === 2 && (a = i[0], d = parseInt(i[1], 10));
        for (var p = o._getSoundIds(d), m = 0; m < p.length; m++)
          if (f = o._soundById(p[m]), f) {
            var y = f._pannerAttr;
            y = {
              coneInnerAngle: typeof a.coneInnerAngle < "u" ? a.coneInnerAngle : y.coneInnerAngle,
              coneOuterAngle: typeof a.coneOuterAngle < "u" ? a.coneOuterAngle : y.coneOuterAngle,
              coneOuterGain: typeof a.coneOuterGain < "u" ? a.coneOuterGain : y.coneOuterGain,
              distanceModel: typeof a.distanceModel < "u" ? a.distanceModel : y.distanceModel,
              maxDistance: typeof a.maxDistance < "u" ? a.maxDistance : y.maxDistance,
              refDistance: typeof a.refDistance < "u" ? a.refDistance : y.refDistance,
              rolloffFactor: typeof a.rolloffFactor < "u" ? a.rolloffFactor : y.rolloffFactor,
              panningModel: typeof a.panningModel < "u" ? a.panningModel : y.panningModel
            };
            var S = f._panner;
            S || (f._pos || (f._pos = o._pos || [0, 0, -0.5]), n(f, "spatial"), S = f._panner), S.coneInnerAngle = y.coneInnerAngle, S.coneOuterAngle = y.coneOuterAngle, S.coneOuterGain = y.coneOuterGain, S.distanceModel = y.distanceModel, S.maxDistance = y.maxDistance, S.refDistance = y.refDistance, S.rolloffFactor = y.rolloffFactor, S.panningModel = y.panningModel;
          }
        return o;
      }, Sound.prototype.init = /* @__PURE__ */ (function(o) {
        return function() {
          var i = this, a = i._parent;
          i._orientation = a._orientation, i._stereo = a._stereo, i._pos = a._pos, i._pannerAttr = a._pannerAttr, o.call(this), i._stereo ? a.stereo(i._stereo) : i._pos && a.pos(i._pos[0], i._pos[1], i._pos[2], i._id);
        };
      })(Sound.prototype.init), Sound.prototype.reset = /* @__PURE__ */ (function(o) {
        return function() {
          var i = this, a = i._parent;
          return i._orientation = a._orientation, i._stereo = a._stereo, i._pos = a._pos, i._pannerAttr = a._pannerAttr, i._stereo ? a.stereo(i._stereo) : i._pos ? a.pos(i._pos[0], i._pos[1], i._pos[2], i._id) : i._panner && (i._panner.disconnect(0), i._panner = void 0, a._refreshBuffer(i)), o.call(this);
        };
      })(Sound.prototype.reset);
      var n = function(o, i) {
        i = i || "spatial", i === "spatial" ? (o._panner = Howler.ctx.createPanner(), o._panner.coneInnerAngle = o._pannerAttr.coneInnerAngle, o._panner.coneOuterAngle = o._pannerAttr.coneOuterAngle, o._panner.coneOuterGain = o._pannerAttr.coneOuterGain, o._panner.distanceModel = o._pannerAttr.distanceModel, o._panner.maxDistance = o._pannerAttr.maxDistance, o._panner.refDistance = o._pannerAttr.refDistance, o._panner.rolloffFactor = o._pannerAttr.rolloffFactor, o._panner.panningModel = o._pannerAttr.panningModel, typeof o._panner.positionX < "u" ? (o._panner.positionX.setValueAtTime(o._pos[0], Howler.ctx.currentTime), o._panner.positionY.setValueAtTime(o._pos[1], Howler.ctx.currentTime), o._panner.positionZ.setValueAtTime(o._pos[2], Howler.ctx.currentTime)) : o._panner.setPosition(o._pos[0], o._pos[1], o._pos[2]), typeof o._panner.orientationX < "u" ? (o._panner.orientationX.setValueAtTime(o._orientation[0], Howler.ctx.currentTime), o._panner.orientationY.setValueAtTime(o._orientation[1], Howler.ctx.currentTime), o._panner.orientationZ.setValueAtTime(o._orientation[2], Howler.ctx.currentTime)) : o._panner.setOrientation(o._orientation[0], o._orientation[1], o._orientation[2])) : (o._panner = Howler.ctx.createStereoPanner(), o._panner.pan.setValueAtTime(o._stereo, Howler.ctx.currentTime)), o._panner.connect(o._node), o._paused || o._parent.pause(o._id, !0).play(o._id, !0);
      };
    })();
  })(Nc)), Nc;
}
var KM = GM();
const YM = /* @__PURE__ */ Fg(KM), { Howl: WS } = YM, xd = 500, Nt = {
  music: null,
  ambient: /* @__PURE__ */ new Map()
};
let pr = {}, yi = !1, _d = "";
function Ai() {
  return typeof WS == "function";
}
function Dc(e, n = 50) {
  const o = Number(e), i = Number.isFinite(o) ? o : n;
  return Math.min(1, Math.max(0, i / 100));
}
function GS(e) {
  return new WS({
    src: [e],
    loop: !0,
    html5: !0,
    preload: !0,
    volume: 0
  });
}
function KS(e, n, o = xd) {
  if (e)
    try {
      const i = typeof e.volume == "function" ? e.volume() : 0;
      e.fade(i, n, o);
    } catch {
      try {
        e.volume(n);
      } catch {
      }
    }
}
function il(e, { unload: n = !1 } = {}) {
  var o;
  e && (KS(e, 0, Math.min(xd, 300)), (o = globalThis.setTimeout) == null || o.call(globalThis, () => {
    try {
      e.pause(), n && e.unload();
    } catch {
    }
  }, Math.min(xd, 320)));
}
function QM(e) {
  return !(e != null && e.streamUrl) || !Ai() ? null : ((!Nt.music || Nt.music.__synapseSrc !== e.streamUrl) && (il(Nt.music, { unload: !0 }), Nt.music = GS(e.streamUrl), Nt.music.__synapseSrc = e.streamUrl), Nt.music);
}
function XM(e) {
  if (!(e != null && e.streamUrl) || !Ai()) return null;
  const n = e.id || e.streamUrl, o = Nt.ambient.get(n);
  if (o && o.__synapseSrc === e.streamUrl) return o;
  il(o, { unload: !0 });
  const i = GS(e.streamUrl);
  return i.__synapseSrc = e.streamUrl, Nt.ambient.set(n, i), i;
}
function ZM() {
  return [
    Nt.music,
    ...Nt.ambient.values()
  ].filter(Boolean);
}
function YS() {
  ZM().forEach((e) => il(e));
}
function qM(e) {
  for (const [n, o] of Nt.ambient.entries())
    e.has(n) || (il(o, { unload: !0 }), Nt.ambient.delete(n));
}
function Eg(e, n) {
  if (e)
    try {
      e.playing() || e.play(), KS(e, n), _d = "";
    } catch (o) {
      _d = (o == null ? void 0 : o.message) || "Audio playback is blocked until the browser receives a user action.";
    }
}
async function JM(e = {}) {
  pr = { ...pr, ...e };
  const n = qa(pr);
  if (!Ai()) return xa(n);
  if (!yi)
    return YS(), xa(n);
  const o = QM(n.musicTrack), i = Dc(pr.musicVolume, 60), a = Dc(pr.ambientVolume, 50), d = /* @__PURE__ */ new Set(), f = [];
  return n.ambientLayers.forEach((p) => {
    var c;
    const m = p.id || p.streamUrl;
    d.add(m);
    const y = XM(p), S = Number((c = pr.audioChannels) == null ? void 0 : c[p.id]), l = Number.isFinite(S) ? Dc(S, 0) : Math.min(1, Math.max(0, a * (p.volumeBias ?? 1)));
    f.push([y, l]);
  }), qM(d), Eg(o, i), f.forEach(([p, m]) => Eg(p, m)), xa(n);
}
function eR(e) {
  return yi = !!e, yi || YS(), yi;
}
function xa(e = qa(pr)) {
  var n, o, i, a;
  return {
    available: Ai(),
    playing: yi && Ai(),
    musicTitle: ((n = e.musicTrack) == null ? void 0 : n.title) || "",
    musicArtist: ((o = e.musicTrack) == null ? void 0 : o.artist) || "",
    musicPageUrl: ((i = e.musicTrack) == null ? void 0 : i.pageUrl) || "",
    musicAttribution: ((a = e.musicTrack) == null ? void 0 : a.attribution) || "",
    ambientTitles: e.ambientLayers.map((d) => d.title).filter(Boolean),
    ambientPageUrls: e.ambientLayers.map((d) => d.pageUrl).filter(Boolean),
    ambientAttributions: e.ambientLayers.map((d) => d.attribution).filter(Boolean),
    error: _d
  };
}
const tR = "synapse.focusRoom.audioPrefs.v1";
function nR(e) {
  var n;
  try {
    (n = globalThis.localStorage) == null || n.setItem(tR, JSON.stringify({
      musicType: e.musicType,
      ambientSound: e.ambientSound,
      musicVolume: e.musicVolume,
      ambientVolume: e.ambientVolume,
      audioChannels: e.audioChannels,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }));
  } catch {
  }
}
function rR() {
  const e = Y((m) => m.musicType), n = Y((m) => m.ambientSound), o = Y((m) => m.musicVolume), i = Y((m) => m.ambientVolume), a = Y((m) => m.audioChannels), d = Y((m) => m.audioPlaying), [f, p] = C.useState(() => xa(qa({
    musicType: e,
    ambientSound: n
  })));
  return C.useEffect(() => {
    const m = { musicType: e, ambientSound: n, musicVolume: o, ambientVolume: i, audioChannels: a };
    let y = !1;
    return eR(d), nR(m), JM(m).then((S) => {
      y || p(S);
    }), () => {
      y = !0;
    };
  }, [n, i, a, d, e, o]), f;
}
function oR() {
  const e = Y(), n = C.useCallback(async (i = "", a = "", d = {}) => {
    var S;
    e.pauseTimer({ pauseAudio: !0 }), e.closeSummary();
    const f = typeof i == "string" || typeof i == "number" ? i : "", p = typeof a == "string" ? a : "", m = iR(p, d), y = String(f || e.selectedMaterialId || ((S = e.selectedMaterial) == null ? void 0 : S.materialId) || "");
    if (typeof globalThis.returnFromFocusRoomToWorkspace == "function")
      try {
        const l = globalThis.returnFromFocusRoomToWorkspace(y, m);
        l && typeof l.then == "function" && await l, Mg(m.action || p, m);
        return;
      } catch (l) {
        console.error("Could not return from Focus Room:", l);
      }
    globalThis.location.hash = "", Mg(m.action || p, m);
  }, [e]), o = C.useMemo(() => ({
    answerFocusQuizQuestion: e.answerQuizQuestion,
    askFocusAssistant: e.askAssistant,
    checkFocusQuizQuestion: e.checkQuizQuestion,
    closeFocusSummary: e.closeSummary,
    endFocusRoomSession: e.endSession,
    returnToFocusRoomSetup: e.returnToSetup,
    flipFocusFlashcard: e.flipFlashcard,
    pauseFocusRoomTimer: e.pauseTimer,
    rateFocusFlashcard: e.rateFlashcard,
    resetFocusRoomTimer: e.resetTimer,
    returnFromFocusRoom: n,
    selectFocusScene: e.selectScene,
    setFocusDuration: e.setPomodoroDuration,
    setFocusFlashcardIndex: e.setFlashcardIndex,
    setFocusPanelTab: e.setPanelTab,
    showFocusStudyHistory: () => {
      e.openStudyPanel("history");
    },
    skipFocusRoomTimer: e.skipTimer,
    startFocusRoomSession: e.startSession,
    startFocusRoomTimer: e.startTimer,
    toggleFocusRoomAudioPlayback: e.toggleAudio,
    toggleFocusLearningPanel: e.toggleAIPanel,
    toggleFocusTask: e.toggleTask,
    updateFocusPlanTask: e.updatePlanTask,
    updateFocusGoal: e.setStudyGoal,
    updateFocusSound: e.setSound
  }), [n, e]);
  return globalThis.__synapseFocusRoomApi = o, C.useEffect(() => {
    globalThis.__synapseFocusRoomApi = o;
  }, [o]), {
    ...e,
    returnToWorkspace: n
  };
}
function QS(e) {
  const n = String(e || "").trim().toLowerCase();
  return ["flashcards", "quiz", "assistant", "mindmap", "timeline", "source", "notes"].includes(n) ? n : "";
}
function iR(e, n = {}) {
  const o = n && typeof n == "object" && !Array.isArray(n) ? n : {}, i = QS(e || o.action);
  return {
    ...o,
    action: i,
    sourceId: String(o.sourceId || o.source_id || ""),
    sourceIndex: Number(o.sourceIndex || o.source_index || 0) || 0,
    sourceLabel: String(o.sourceLabel || o.source_label || ""),
    sectionTitle: String(o.sectionTitle || o.section_title || ""),
    highlightId: String(o.highlightId || o.highlight_id || ""),
    excerpt: String(o.excerpt || "").slice(0, 1600)
  };
}
function Mg(e, n = {}) {
  const o = QS(e);
  if (!o) return;
  const i = () => {
    if (o === "source") {
      typeof globalThis.toggleSourceViewer == "function" && globalThis.toggleSourceViewer(!0), n.sourceId && typeof globalThis.selectSourceItem == "function" && globalThis.selectSourceItem(n.sourceId);
      return;
    }
    if (o === "notes") {
      typeof globalThis.showFullSummary == "function" && globalThis.showFullSummary();
      return;
    }
    if (o === "assistant") {
      typeof globalThis.openAssistant == "function" && globalThis.openAssistant();
      return;
    }
    typeof globalThis.switchTool == "function" && globalThis.switchTool(o);
  };
  typeof globalThis.requestAnimationFrame == "function" ? globalThis.requestAnimationFrame(i) : setTimeout(i, 0);
}
function sR(e = 3e3) {
  const n = Y((i) => i.setIdle), o = Y((i) => i.isIdle);
  return C.useEffect(() => {
    let i;
    const a = () => {
      n(!1), clearTimeout(i), i = setTimeout(() => n(!0), e);
    };
    return window.addEventListener("mousemove", a), window.addEventListener("keydown", a), window.addEventListener("click", a), a(), () => {
      clearTimeout(i), window.removeEventListener("mousemove", a), window.removeEventListener("keydown", a), window.removeEventListener("click", a);
    };
  }, [e, n]), o;
}
function aR() {
  const e = Y((i) => i.timerState || (i.timerStatus === "studying" ? "running" : i.timerStatus)), n = Y((i) => i.view), o = Y((i) => i.tickTimer);
  C.useEffect(() => {
    if (n !== "session" || e !== "running" || typeof window > "u") return;
    let i = !0;
    const a = () => {
      i && o();
    }, d = window.setInterval(a, 1e3), f = () => {
      document.visibilityState === "visible" && a();
    };
    return document.addEventListener("visibilitychange", f), a(), () => {
      i = !1, window.clearInterval(d), document.removeEventListener("visibilitychange", f);
    };
  }, [o, e, n]);
}
function lR() {
  const e = Y((n) => n.selectedScene);
  return gn(e);
}
function uR(e) {
  return e.view !== "session" || e.summaryRecord ? null : {
    materialId: "focus-room",
    view: e.view,
    panelTab: e.panelTab,
    selectedScene: e.selectedScene,
    musicType: e.musicType,
    ambientSound: e.ambientSound,
    musicVolume: e.musicVolume,
    ambientVolume: e.ambientVolume,
    audioChannels: e.audioChannels,
    pomodoroDuration: e.pomodoroDuration,
    timerState: e.timerState,
    timerMode: e.timerMode,
    timerAnchorAtMs: e.timerAnchorAtMs,
    timerDurationSeconds: e.timerDurationSeconds,
    timerStatus: e.timerStatus,
    studyGoal: e.studyGoal,
    focusTopics: e.focusTopics,
    activeTopicId: e.activeTopicId,
    studyPlan: e.studyPlan,
    currentSession: e.currentSession,
    elapsedSeconds: e.elapsedSeconds,
    startedAt: e.startedAt
  };
}
function cR() {
  const [e, n] = C.useState(""), [o, i] = C.useState(!1), [a, d] = C.useState(!1), f = Y((T) => T.view), p = sR(3e3), m = lR(), y = rR(), S = oR();
  aR();
  const l = Y(h1(uR)), c = Y((T) => T.summaryRecord), g = Y((T) => T.endSession), x = Y((T) => T.initializeFocusRoom);
  C.useEffect(() => {
    x();
  }, [x]), C.useEffect(() => {
    l != null && l.materialId && tf(l.materialId, l);
  }, [l]), C.useEffect(() => {
    f === "session" || !c || ma("focus-room");
  }, [c, f]), C.useEffect(() => {
    f !== "session" && (i(!1), n(""), d(!1));
  }, [f]), C.useEffect(() => {
    const T = (b) => {
      b.key === "Escape" && (o ? (b.preventDefault(), i(!1)) : e ? n("") : a && d(!1));
    };
    return window.addEventListener("keydown", T), () => window.removeEventListener("keydown", T);
  }, [a, o, e]);
  const _ = (...T) => {
    S.returnToWorkspace(...T);
  }, A = async () => {
    d(!1), i(!1), n(""), g(), await _();
  };
  return /* @__PURE__ */ w.jsxs(
    "main",
    {
      id: "focusRoomSurface",
      className: `focus-room-surface react-focus-room ${p ? "is-idle" : ""} ${f === "setup" ? "is-setup is-innook-setup" : "is-session"}`.trim(),
      "aria-live": "polite",
      "data-focus-room-view": f,
      children: [
        /* @__PURE__ */ w.jsx(nb, { scene: m }),
        /* @__PURE__ */ w.jsxs(Xa, { mode: "wait", children: [
          f === "setup" ? /* @__PURE__ */ w.jsx(
            Sn.div,
            {
              className: "focus-room-view focus-setup-view",
              initial: { opacity: 0, y: 16 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -10 },
              transition: Fa,
              children: /* @__PURE__ */ w.jsx(mP, { audioState: y, onWorkspace: _, onOpenTrail: () => n("trail") })
            },
            "setup"
          ) : null,
          f === "session" ? /* @__PURE__ */ w.jsxs(
            Sn.div,
            {
              className: "focus-room-view focus-session-view",
              initial: { opacity: 0, y: 14 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -8 },
              transition: Fa,
              children: [
                o ? /* @__PURE__ */ w.jsx("button", { type: "button", className: "focus-mode-exit-hit-area", onClick: () => i(!1), children: "Exit Focus Mode" }) : /* @__PURE__ */ w.jsx(hP, { onWorkspace: _, onOpenTrail: () => n("trail"), onOpenCompanion: () => n("companion"), onOpenSettings: () => n("settings"), onExit: () => d(!0) }),
                /* @__PURE__ */ w.jsx("section", { className: `focus-session-stage ${o ? "is-focus-mode" : ""}`.trim(), "aria-hidden": "true" }),
                o ? /* @__PURE__ */ w.jsx(WM, { onExit: () => i(!1) }) : /* @__PURE__ */ w.jsx(TP, { audioState: y, onFocusMode: () => i(!0) }),
                /* @__PURE__ */ w.jsx(oM, {}),
                /* @__PURE__ */ w.jsx(dR, { open: a, onClose: () => d(!1), onConfirm: A })
              ]
            },
            "session"
          ) : null
        ] }),
        o ? null : /* @__PURE__ */ w.jsx(zM, { audioState: y, utilityPanel: e, onClose: () => n(""), onWorkspace: _ })
      ]
    }
  );
}
function dR({ open: e, onClose: n, onConfirm: o }) {
  return e ? /* @__PURE__ */ w.jsx("div", { className: "focus-exit-overlay", role: "presentation", children: /* @__PURE__ */ w.jsxs("div", { className: "focus-exit-dialog liquid-glass", role: "dialog", "aria-modal": "true", "aria-labelledby": "focus-exit-title", children: [
    /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Leave this room?" }),
    /* @__PURE__ */ w.jsx("h2", { id: "focus-exit-title", children: "End focus session" }),
    /* @__PURE__ */ w.jsx("p", { children: "Your focused time will be saved to your Focus Trail." }),
    /* @__PURE__ */ w.jsxs("div", { className: "focus-button-row", children: [
      /* @__PURE__ */ w.jsx(Te, { onClick: n, children: "Continue focusing" }),
      /* @__PURE__ */ w.jsx(Te, { variant: "primary", onClick: o, children: "End and exit" })
    ] })
  ] }) }) : null;
}
let jc = null;
function fR(e, n) {
  const o = globalThis.__synapseFocusRoomApi || {};
  if (typeof o[e] != "function") {
    console.warn(`Synapse Focus Room action "${e}" is not available yet.`);
    return;
  }
  return o[e](...n);
}
function pR() {
  Object.entries({
    answerFocusQuizQuestion: "answerFocusQuizQuestion",
    askFocusAssistant: "askFocusAssistant",
    checkFocusQuizQuestion: "checkFocusQuizQuestion",
    closeFocusSummary: "closeFocusSummary",
    endFocusRoomSession: "endFocusRoomSession",
    flipFocusFlashcard: "flipFocusFlashcard",
    pauseFocusRoomTimer: "pauseFocusRoomTimer",
    rateFocusFlashcard: "rateFocusFlashcard",
    resetFocusRoomTimer: "resetFocusRoomTimer",
    returnFromFocusRoom: "returnFromFocusRoom",
    selectFocusScene: "selectFocusScene",
    setFocusDuration: "setFocusDuration",
    setFocusFlashcardIndex: "setFocusFlashcardIndex",
    setFocusPanelTab: "setFocusPanelTab",
    showFocusStudyHistory: "showFocusStudyHistory",
    skipFocusRoomTimer: "skipFocusRoomTimer",
    startFocusRoomSession: "startFocusRoomSession",
    startFocusRoomTimer: "startFocusRoomTimer",
    toggleFocusRoomAudioPlayback: "toggleFocusRoomAudioPlayback",
    toggleFocusLearningPanel: "toggleFocusLearningPanel",
    toggleFocusTask: "toggleFocusTask",
    updateFocusPlanTask: "updateFocusPlanTask",
    updateFocusGoal: "updateFocusGoal",
    updateFocusSound: "updateFocusSound"
  }).forEach(([n, o]) => {
    globalThis[n] = (...i) => fR(o, i);
  });
}
function mR(e = {}) {
  pR();
  const n = e.root || document.getElementById("focusRoomRoot");
  if (!n)
    throw new Error("Focus Room root element was not found.");
  jc || (jc = c1.createRoot(n), jc.render(
    yn.createElement(
      yn.StrictMode,
      null,
      yn.createElement(cR)
    )
  ));
}
const hR = "synapse.generated.history.v6", XS = "synapse.active.generated.v6", yR = "synapse.flashcards.deck.v1", gR = "synapse.quiz.history.v1", vR = "synapse.focusRoom.return-target.v1";
function xf(e, n) {
  var o;
  try {
    const i = (o = globalThis.localStorage) == null ? void 0 : o.getItem(e);
    if (!i) return n;
    const a = JSON.parse(i);
    return a ?? n;
  } catch (i) {
    return console.warn(`Could not read ${e}:`, i), n;
  }
}
function SR(e, n) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, n), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function wR(e, n) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, JSON.stringify(n)), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function ZS() {
  const e = xf(hR, []);
  return Array.isArray(e) ? e : [];
}
function xR(e) {
  const n = String((e == null ? void 0 : e.title) || "").trim();
  return n || String((e == null ? void 0 : e.summary) || "").split(/\n+/).map((i) => i.replace(/^#+\s*/, "").trim()).find((i) => i.length > 4) || "Generated Study Notes";
}
function qS(e = {}) {
  return [
    e.id ? `history:${e.id}` : "",
    e.sourceFingerprint ? `fingerprint:${e.sourceFingerprint}` : "",
    e.clientFingerprint ? `fingerprint:${e.clientFingerprint}` : ""
  ].filter(Boolean);
}
function _R(e = {}) {
  const n = xf(yR, {}), i = qS(e).map((a) => n == null ? void 0 : n[a]).find((a) => a && Array.isArray(a.cards) && a.cards.length);
  return (i == null ? void 0 : i.cards) || [];
}
function TR(e = {}) {
  var o;
  const n = String(e.id || "").trim();
  if (n) return `id:${n}`;
  try {
    return `content:${JSON.stringify({
      title: e.title || "",
      createdAt: e.createdAt || "",
      updatedAt: e.updatedAt || "",
      questions: ((o = e.quiz) == null ? void 0 : o.questions) || e.questions || []
    })}`;
  } catch {
    return "";
  }
}
function kR(e = []) {
  return (Array.isArray(e) ? e : []).map((n) => {
    var o;
    return {
      id: n.id,
      title: n.title,
      createdAt: n.createdAt || n.created_at || "",
      updatedAt: n.updatedAt || n.updated_at || "",
      questions: ((o = n.quiz) == null ? void 0 : o.questions) || n.questions || [],
      report: n.report || null
    };
  });
}
function AR(e = {}) {
  const n = xf(gR, {}), i = qS(e).flatMap((d) => Array.isArray(n == null ? void 0 : n[d]) ? n[d] : []), a = /* @__PURE__ */ new Set();
  return kR(i).filter((d) => {
    const f = TR(d);
    return !f || a.has(f) ? !1 : (a.add(f), !0);
  }).sort((d, f) => new Date(f.createdAt || 0) - new Date(d.createdAt || 0));
}
function CR(e = {}) {
  return {
    materialId: String(e.id || e.sourceFingerprint || e.clientFingerprint || "current-material"),
    materialTitle: xR(e),
    materialType: "Generated notes",
    uploadedContent: "",
    aiSummary: e.summary || "",
    sections: e.sections || {},
    flashcards: _R(e),
    quizzes: AR(e),
    mindMap: e.mindMap || e.mind_map || e.brainstorm || null,
    studyPlan: e.studyPlan || [],
    progressHistory: [],
    sources: Array.isArray(e.sources) ? e.sources : [],
    sourceItems: Array.isArray(e.sourceItems) ? e.sourceItems : [],
    sourceHighlights: Array.isArray(e.sourceHighlights || e.source_highlights) ? e.sourceHighlights || e.source_highlights : [],
    sourceFingerprint: e.sourceFingerprint || e.clientFingerprint || "",
    createdAt: e.createdAt || "",
    updatedAt: e.updatedAt || ""
  };
}
function JS() {
  return ZS().filter((e) => e && (e.id || e.summary) && e.kind !== "companion" && !String(e.id || "").startsWith("companion:")).map(CR);
}
function ew(e = "") {
  const n = String(e || "");
  return n && JS().find(
    (o) => o.materialId === n || o.sourceFingerprint === n || o.clientFingerprint === n
  ) || null;
}
function tw() {
  var n;
  const e = ((n = globalThis.localStorage) == null ? void 0 : n.getItem(XS)) || "";
  return ew(e);
}
function bR(e = "") {
  var i;
  const n = e || ((i = tw()) == null ? void 0 : i.materialId) || "", o = n ? `/${encodeURIComponent(n)}` : "";
  globalThis.location.hash = `#/focus-room${o}`;
}
function PR(e = "", n = {}) {
  const o = n && typeof n == "object" && !Array.isArray(n) ? n : {};
  return {
    materialId: String(e || ""),
    action: String(o.action || "").trim().toLowerCase(),
    sourceId: String(o.sourceId || o.source_id || ""),
    sourceIndex: Number(o.sourceIndex || o.source_index || 0) || 0,
    sourceLabel: String(o.sourceLabel || o.source_label || ""),
    sectionTitle: String(o.sectionTitle || o.section_title || ""),
    highlightId: String(o.highlightId || o.highlight_id || ""),
    excerpt: String(o.excerpt || "").slice(0, 1600),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function ER(e = "", n = {}) {
  const o = String(e || ""), i = ZS().find(
    (f) => String((f == null ? void 0 : f.id) || "") === o || String((f == null ? void 0 : f.sourceFingerprint) || (f == null ? void 0 : f.source_fingerprint) || "") === o || String((f == null ? void 0 : f.clientFingerprint) || (f == null ? void 0 : f.client_fingerprint) || "") === o
  ) || null, a = String((i == null ? void 0 : i.id) || "");
  a && SR(XS, a);
  const d = PR(a, n);
  d.action && wR(vR, d), globalThis.location.href = a ? `index.html?focusReturn=${encodeURIComponent(a)}` : "index.html";
}
function MR() {
  Object.assign(globalThis, {
    getSynapseFocusRoomCurrentMaterial: tw,
    getSynapseFocusRoomMaterial: ew,
    getSynapseFocusRoomMaterials: JS,
    openSynapseFocusRoom: bR,
    returnFromFocusRoomToWorkspace: ER
  });
}
const nw = document.getElementById("focusRoomRoot");
if (!nw)
  throw new Error("Focus Room root element was not found.");
var Dg;
(Dg = document.getElementById("focusRoomFallbackTitle")) == null || Dg.remove();
globalThis.apiClient = new Ig(n1);
MR();
(!globalThis.location.hash || globalThis.location.hash === "#") && (globalThis.location.hash = "#/focus-room");
mR({ root: nw });
