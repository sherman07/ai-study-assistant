function Mx(e, n) {
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
function Rx(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function yg(e) {
  const n = String(e || "").toLowerCase();
  return n === "127.0.0.1" || n === "localhost" || n === "::1" || n === "[::1]";
}
function th(e) {
  return yg(e) || Rx(e);
}
function Nx(e) {
  return !e || yg(e) ? "127.0.0.1" : e;
}
const Dx = (() => {
  var p, m, y, v;
  const { protocol: e, hostname: n, port: o } = window.location, i = String(window.SYNAPSE_BACKEND_PORT || ((m = (p = document.body) == null ? void 0 : p.dataset) == null ? void 0 : m.apiPort) || "8001").trim(), a = `http://${Nx(n)}:${i || "8001"}`, d = String(window.SYNAPSE_API_BASE || ((v = (y = document.body) == null ? void 0 : y.dataset) == null ? void 0 : v.apiBase) || "").replace(/\/+$/, ""), f = `${e}//${window.location.host}`.replace(/\/+$/, "");
  return d && !(th(n) && o !== i && d === f) ? d : e === "file:" || th(n) && o !== i ? a : `${e}//${window.location.host}`;
})();
class Yr extends Error {
  constructor(n, { cause: o, code: i } = {}) {
    super(n), this.name = "ApiConnectionError", this.cause = o, this.code = i || "connection_error";
  }
}
const nh = "synapse.client.id.v1";
function zn() {
  return globalThis.window || globalThis;
}
function Qr(e, n = 220) {
  return String(e || "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
}
function rh() {
  const e = globalThis.crypto || zn().crypto;
  return e != null && e.randomUUID ? e.randomUUID() : `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
function jx() {
  var n, o;
  const e = zn();
  try {
    const i = (n = e.localStorage) == null ? void 0 : n.getItem(nh);
    if (i) return i;
    const a = rh();
    return (o = e.localStorage) == null || o.setItem(nh, a), a;
  } catch {
    return rh();
  }
}
function Ix(e = {}) {
  if (typeof Headers < "u" && e instanceof Headers) {
    const n = {};
    return e.forEach((o, i) => {
      n[i] = o;
    }), n;
  }
  return Array.isArray(e) ? Object.fromEntries(e) : { ...e || {} };
}
class gg {
  constructor(n, { fetchImpl: o } = {}) {
    var a, d;
    const i = zn();
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
    const o = zn(), i = Ix(n);
    i["X-Synapse-Client-Id"] = Qr(jx(), 160);
    const a = (f = (d = o.SynapseAuth) == null ? void 0 : d.getStoredSession) == null ? void 0 : f.call(d);
    if (a && typeof a == "object" && (a.accountId && (i["X-Synapse-User-Id"] = Qr(a.accountId, 160)), a.email && (i["X-Synapse-User-Email"] = Qr(a.email, 220)), a.displayName && (i["X-Synapse-User-Name"] = Qr(a.displayName, 180)), a.authMode && (i["X-Synapse-Auth-Mode"] = Qr(a.authMode, 60)), a.role && (i["X-Synapse-User-Role"] = Qr(a.role, 80))), (p = o.SynapseAuth) != null && p.authHeaders && !i.Authorization && !i.authorization)
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
    const v = d.signal;
    f > 0 && typeof AbortController < "u" && (p = new AbortController(), y = () => p.abort(), v && (v.aborted ? p.abort() : v.addEventListener("abort", y, { once: !0 })), m = zn().setTimeout(() => p.abort(), f), d.signal = p.signal);
    try {
      return await this.fetchImpl(i, d);
    } catch (c) {
      throw (l = p == null ? void 0 : p.signal) != null && l.aborted && !(v != null && v.aborted) ? new Yr(this.timeoutMessage(f), {
        cause: c,
        code: "timeout"
      }) : v != null && v.aborted ? new Yr("Analysis was cancelled.", {
        cause: c,
        code: "cancelled"
      }) : new Yr(this.connectionMessage(), {
        cause: c,
        code: "unreachable"
      });
    } finally {
      m && zn().clearTimeout(m), v && y && v.removeEventListener("abort", y);
    }
  }
  async warmup({ attempts: n = 2, retryDelayMs: o = 1500, timeoutMs: i = 6e4, maxWaitMs: a = 0, signal: d } = {}) {
    const f = Math.max(1, Math.floor(Number(n) || 1)), p = Math.max(0, Number(a) || 0), m = Date.now();
    let y = null;
    for (let v = 0; v < f; v += 1) {
      const l = Date.now() - m, c = p > 0 ? p - l : 0;
      if (p > 0 && c <= 0) break;
      try {
        const S = await this.fetch("/healthz", {
          method: "GET",
          signal: d,
          timeoutMs: p > 0 ? Math.min(i, c) : i
        });
        if (S != null && S.ok) return S;
        y = new Yr(
          `Synapse hosted service returned ${(S == null ? void 0 : S.status) || "an unexpected status"} while preparing your analysis.`,
          { code: "warmup_status" }
        );
      } catch (S) {
        y = S;
      }
      if (v < f - 1 && o > 0) {
        const S = p > 0 ? p - (Date.now() - m) : o;
        if (p > 0 && S <= 0) break;
        await new Promise((x) => zn().setTimeout(x, Math.min(o, S)));
      }
    }
    throw y || new Yr(this.connectionMessage(), { code: "warmup_failed" });
  }
  isRetryableResponse(n) {
    return [502, 503, 504].includes(Number(n == null ? void 0 : n.status));
  }
  isRetryableConnectionError(n) {
    return !(!(n instanceof Yr) || n.code === "cancelled" || n.code === "timeout");
  }
  async fetchWithRetry(n, o = {}, {
    attempts: i = 3,
    retryDelayMs: a = 3e3,
    retryOnConnectionError: d = !0,
    onRetry: f
  } = {}) {
    const p = Math.max(1, Math.floor(Number(i) || 1));
    let m = null, y = null;
    for (let v = 0; v < p; v += 1) {
      try {
        const l = typeof o == "function" ? o(v) : o;
        if (m = await this.fetch(n, l), !this.isRetryableResponse(m) || v === p - 1) return m;
        f == null || f({
          attempt: v + 1,
          totalAttempts: p,
          reason: `HTTP ${m.status}`
        });
      } catch (l) {
        if (y = l, !(d && this.isRetryableConnectionError(l) && v < p - 1)) throw l;
        f == null || f({
          attempt: v + 1,
          totalAttempts: p,
          reason: (l == null ? void 0 : l.code) || "connection_error"
        });
      }
      a > 0 && await new Promise((l) => zn().setTimeout(l, a));
    }
    if (y) throw y;
    return m;
  }
}
var ei = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function vg(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var Vu = { exports: {} }, fe = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var oh;
function Fx() {
  if (oh) return fe;
  oh = 1;
  var e = Symbol.for("react.element"), n = Symbol.for("react.portal"), o = Symbol.for("react.fragment"), i = Symbol.for("react.strict_mode"), a = Symbol.for("react.profiler"), d = Symbol.for("react.provider"), f = Symbol.for("react.context"), p = Symbol.for("react.forward_ref"), m = Symbol.for("react.suspense"), y = Symbol.for("react.memo"), v = Symbol.for("react.lazy"), l = Symbol.iterator;
  function c(N) {
    return N === null || typeof N != "object" ? null : (N = l && N[l] || N["@@iterator"], typeof N == "function" ? N : null);
  }
  var S = { isMounted: function() {
    return !1;
  }, enqueueForceUpdate: function() {
  }, enqueueReplaceState: function() {
  }, enqueueSetState: function() {
  } }, x = Object.assign, k = {};
  function A(N, L, le) {
    this.props = N, this.context = L, this.refs = k, this.updater = le || S;
  }
  A.prototype.isReactComponent = {}, A.prototype.setState = function(N, L) {
    if (typeof N != "object" && typeof N != "function" && N != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
    this.updater.enqueueSetState(this, N, L, "setState");
  }, A.prototype.forceUpdate = function(N) {
    this.updater.enqueueForceUpdate(this, N, "forceUpdate");
  };
  function _() {
  }
  _.prototype = A.prototype;
  function b(N, L, le) {
    this.props = N, this.context = L, this.refs = k, this.updater = le || S;
  }
  var E = b.prototype = new _();
  E.constructor = b, x(E, A.prototype), E.isPureReactComponent = !0;
  var D = Array.isArray, O = Object.prototype.hasOwnProperty, K = { current: null }, W = { key: !0, ref: !0, __self: !0, __source: !0 };
  function $(N, L, le) {
    var de, ge = {}, ve = null, be = null;
    if (L != null) for (de in L.ref !== void 0 && (be = L.ref), L.key !== void 0 && (ve = "" + L.key), L) O.call(L, de) && !W.hasOwnProperty(de) && (ge[de] = L[de]);
    var xe = arguments.length - 2;
    if (xe === 1) ge.children = le;
    else if (1 < xe) {
      for (var Ne = Array(xe), St = 0; St < xe; St++) Ne[St] = arguments[St + 2];
      ge.children = Ne;
    }
    if (N && N.defaultProps) for (de in xe = N.defaultProps, xe) ge[de] === void 0 && (ge[de] = xe[de]);
    return { $$typeof: e, type: N, key: ve, ref: be, props: ge, _owner: K.current };
  }
  function G(N, L) {
    return { $$typeof: e, type: N.type, key: L, ref: N.ref, props: N.props, _owner: N._owner };
  }
  function Z(N) {
    return typeof N == "object" && N !== null && N.$$typeof === e;
  }
  function te(N) {
    var L = { "=": "=0", ":": "=2" };
    return "$" + N.replace(/[=:]/g, function(le) {
      return L[le];
    });
  }
  var ce = /\/+/g;
  function he(N, L) {
    return typeof N == "object" && N !== null && N.key != null ? te("" + N.key) : L.toString(36);
  }
  function pe(N, L, le, de, ge) {
    var ve = typeof N;
    (ve === "undefined" || ve === "boolean") && (N = null);
    var be = !1;
    if (N === null) be = !0;
    else switch (ve) {
      case "string":
      case "number":
        be = !0;
        break;
      case "object":
        switch (N.$$typeof) {
          case e:
          case n:
            be = !0;
        }
    }
    if (be) return be = N, ge = ge(be), N = de === "" ? "." + he(be, 0) : de, D(ge) ? (le = "", N != null && (le = N.replace(ce, "$&/") + "/"), pe(ge, L, le, "", function(St) {
      return St;
    })) : ge != null && (Z(ge) && (ge = G(ge, le + (!ge.key || be && be.key === ge.key ? "" : ("" + ge.key).replace(ce, "$&/") + "/") + N)), L.push(ge)), 1;
    if (be = 0, de = de === "" ? "." : de + ":", D(N)) for (var xe = 0; xe < N.length; xe++) {
      ve = N[xe];
      var Ne = de + he(ve, xe);
      be += pe(ve, L, le, Ne, ge);
    }
    else if (Ne = c(N), typeof Ne == "function") for (N = Ne.call(N), xe = 0; !(ve = N.next()).done; ) ve = ve.value, Ne = de + he(ve, xe++), be += pe(ve, L, le, Ne, ge);
    else if (ve === "object") throw L = String(N), Error("Objects are not valid as a React child (found: " + (L === "[object Object]" ? "object with keys {" + Object.keys(N).join(", ") + "}" : L) + "). If you meant to render a collection of children, use an array instead.");
    return be;
  }
  function we(N, L, le) {
    if (N == null) return N;
    var de = [], ge = 0;
    return pe(N, de, "", "", function(ve) {
      return L.call(le, ve, ge++);
    }), de;
  }
  function Q(N) {
    if (N._status === -1) {
      var L = N._result;
      L = L(), L.then(function(le) {
        (N._status === 0 || N._status === -1) && (N._status = 1, N._result = le);
      }, function(le) {
        (N._status === 0 || N._status === -1) && (N._status = 2, N._result = le);
      }), N._status === -1 && (N._status = 0, N._result = L);
    }
    if (N._status === 1) return N._result.default;
    throw N._result;
  }
  var me = { current: null }, B = { transition: null }, ee = { ReactCurrentDispatcher: me, ReactCurrentBatchConfig: B, ReactCurrentOwner: K };
  function X() {
    throw Error("act(...) is not supported in production builds of React.");
  }
  return fe.Children = { map: we, forEach: function(N, L, le) {
    we(N, function() {
      L.apply(this, arguments);
    }, le);
  }, count: function(N) {
    var L = 0;
    return we(N, function() {
      L++;
    }), L;
  }, toArray: function(N) {
    return we(N, function(L) {
      return L;
    }) || [];
  }, only: function(N) {
    if (!Z(N)) throw Error("React.Children.only expected to receive a single React element child.");
    return N;
  } }, fe.Component = A, fe.Fragment = o, fe.Profiler = a, fe.PureComponent = b, fe.StrictMode = i, fe.Suspense = m, fe.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = ee, fe.act = X, fe.cloneElement = function(N, L, le) {
    if (N == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + N + ".");
    var de = x({}, N.props), ge = N.key, ve = N.ref, be = N._owner;
    if (L != null) {
      if (L.ref !== void 0 && (ve = L.ref, be = K.current), L.key !== void 0 && (ge = "" + L.key), N.type && N.type.defaultProps) var xe = N.type.defaultProps;
      for (Ne in L) O.call(L, Ne) && !W.hasOwnProperty(Ne) && (de[Ne] = L[Ne] === void 0 && xe !== void 0 ? xe[Ne] : L[Ne]);
    }
    var Ne = arguments.length - 2;
    if (Ne === 1) de.children = le;
    else if (1 < Ne) {
      xe = Array(Ne);
      for (var St = 0; St < Ne; St++) xe[St] = arguments[St + 2];
      de.children = xe;
    }
    return { $$typeof: e, type: N.type, key: ge, ref: ve, props: de, _owner: be };
  }, fe.createContext = function(N) {
    return N = { $$typeof: f, _currentValue: N, _currentValue2: N, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, N.Provider = { $$typeof: d, _context: N }, N.Consumer = N;
  }, fe.createElement = $, fe.createFactory = function(N) {
    var L = $.bind(null, N);
    return L.type = N, L;
  }, fe.createRef = function() {
    return { current: null };
  }, fe.forwardRef = function(N) {
    return { $$typeof: p, render: N };
  }, fe.isValidElement = Z, fe.lazy = function(N) {
    return { $$typeof: v, _payload: { _status: -1, _result: N }, _init: Q };
  }, fe.memo = function(N, L) {
    return { $$typeof: y, type: N, compare: L === void 0 ? null : L };
  }, fe.startTransition = function(N) {
    var L = B.transition;
    B.transition = {};
    try {
      N();
    } finally {
      B.transition = L;
    }
  }, fe.unstable_act = X, fe.useCallback = function(N, L) {
    return me.current.useCallback(N, L);
  }, fe.useContext = function(N) {
    return me.current.useContext(N);
  }, fe.useDebugValue = function() {
  }, fe.useDeferredValue = function(N) {
    return me.current.useDeferredValue(N);
  }, fe.useEffect = function(N, L) {
    return me.current.useEffect(N, L);
  }, fe.useId = function() {
    return me.current.useId();
  }, fe.useImperativeHandle = function(N, L, le) {
    return me.current.useImperativeHandle(N, L, le);
  }, fe.useInsertionEffect = function(N, L) {
    return me.current.useInsertionEffect(N, L);
  }, fe.useLayoutEffect = function(N, L) {
    return me.current.useLayoutEffect(N, L);
  }, fe.useMemo = function(N, L) {
    return me.current.useMemo(N, L);
  }, fe.useReducer = function(N, L, le) {
    return me.current.useReducer(N, L, le);
  }, fe.useRef = function(N) {
    return me.current.useRef(N);
  }, fe.useState = function(N) {
    return me.current.useState(N);
  }, fe.useSyncExternalStore = function(N, L, le) {
    return me.current.useSyncExternalStore(N, L, le);
  }, fe.useTransition = function() {
    return me.current.useTransition();
  }, fe.version = "18.3.1", fe;
}
var ih;
function ad() {
  return ih || (ih = 1, Vu.exports = Fx()), Vu.exports;
}
var C = ad();
const hn = /* @__PURE__ */ vg(C), ld = /* @__PURE__ */ Mx({
  __proto__: null,
  default: hn
}, [C]);
var Fs = {}, zu = { exports: {} }, ht = {}, Bu = { exports: {} }, Uu = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var sh;
function Ox() {
  return sh || (sh = 1, (function(e) {
    function n(B, ee) {
      var X = B.length;
      B.push(ee);
      e: for (; 0 < X; ) {
        var N = X - 1 >>> 1, L = B[N];
        if (0 < a(L, ee)) B[N] = ee, B[X] = L, X = N;
        else break e;
      }
    }
    function o(B) {
      return B.length === 0 ? null : B[0];
    }
    function i(B) {
      if (B.length === 0) return null;
      var ee = B[0], X = B.pop();
      if (X !== ee) {
        B[0] = X;
        e: for (var N = 0, L = B.length, le = L >>> 1; N < le; ) {
          var de = 2 * (N + 1) - 1, ge = B[de], ve = de + 1, be = B[ve];
          if (0 > a(ge, X)) ve < L && 0 > a(be, ge) ? (B[N] = be, B[ve] = X, N = ve) : (B[N] = ge, B[de] = X, N = de);
          else if (ve < L && 0 > a(be, X)) B[N] = be, B[ve] = X, N = ve;
          else break e;
        }
      }
      return ee;
    }
    function a(B, ee) {
      var X = B.sortIndex - ee.sortIndex;
      return X !== 0 ? X : B.id - ee.id;
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
    var m = [], y = [], v = 1, l = null, c = 3, S = !1, x = !1, k = !1, A = typeof setTimeout == "function" ? setTimeout : null, _ = typeof clearTimeout == "function" ? clearTimeout : null, b = typeof setImmediate < "u" ? setImmediate : null;
    typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
    function E(B) {
      for (var ee = o(y); ee !== null; ) {
        if (ee.callback === null) i(y);
        else if (ee.startTime <= B) i(y), ee.sortIndex = ee.expirationTime, n(m, ee);
        else break;
        ee = o(y);
      }
    }
    function D(B) {
      if (k = !1, E(B), !x) if (o(m) !== null) x = !0, Q(O);
      else {
        var ee = o(y);
        ee !== null && me(D, ee.startTime - B);
      }
    }
    function O(B, ee) {
      x = !1, k && (k = !1, _($), $ = -1), S = !0;
      var X = c;
      try {
        for (E(ee), l = o(m); l !== null && (!(l.expirationTime > ee) || B && !te()); ) {
          var N = l.callback;
          if (typeof N == "function") {
            l.callback = null, c = l.priorityLevel;
            var L = N(l.expirationTime <= ee);
            ee = e.unstable_now(), typeof L == "function" ? l.callback = L : l === o(m) && i(m), E(ee);
          } else i(m);
          l = o(m);
        }
        if (l !== null) var le = !0;
        else {
          var de = o(y);
          de !== null && me(D, de.startTime - ee), le = !1;
        }
        return le;
      } finally {
        l = null, c = X, S = !1;
      }
    }
    var K = !1, W = null, $ = -1, G = 5, Z = -1;
    function te() {
      return !(e.unstable_now() - Z < G);
    }
    function ce() {
      if (W !== null) {
        var B = e.unstable_now();
        Z = B;
        var ee = !0;
        try {
          ee = W(!0, B);
        } finally {
          ee ? he() : (K = !1, W = null);
        }
      } else K = !1;
    }
    var he;
    if (typeof b == "function") he = function() {
      b(ce);
    };
    else if (typeof MessageChannel < "u") {
      var pe = new MessageChannel(), we = pe.port2;
      pe.port1.onmessage = ce, he = function() {
        we.postMessage(null);
      };
    } else he = function() {
      A(ce, 0);
    };
    function Q(B) {
      W = B, K || (K = !0, he());
    }
    function me(B, ee) {
      $ = A(function() {
        B(e.unstable_now());
      }, ee);
    }
    e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(B) {
      B.callback = null;
    }, e.unstable_continueExecution = function() {
      x || S || (x = !0, Q(O));
    }, e.unstable_forceFrameRate = function(B) {
      0 > B || 125 < B ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : G = 0 < B ? Math.floor(1e3 / B) : 5;
    }, e.unstable_getCurrentPriorityLevel = function() {
      return c;
    }, e.unstable_getFirstCallbackNode = function() {
      return o(m);
    }, e.unstable_next = function(B) {
      switch (c) {
        case 1:
        case 2:
        case 3:
          var ee = 3;
          break;
        default:
          ee = c;
      }
      var X = c;
      c = ee;
      try {
        return B();
      } finally {
        c = X;
      }
    }, e.unstable_pauseExecution = function() {
    }, e.unstable_requestPaint = function() {
    }, e.unstable_runWithPriority = function(B, ee) {
      switch (B) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          B = 3;
      }
      var X = c;
      c = B;
      try {
        return ee();
      } finally {
        c = X;
      }
    }, e.unstable_scheduleCallback = function(B, ee, X) {
      var N = e.unstable_now();
      switch (typeof X == "object" && X !== null ? (X = X.delay, X = typeof X == "number" && 0 < X ? N + X : N) : X = N, B) {
        case 1:
          var L = -1;
          break;
        case 2:
          L = 250;
          break;
        case 5:
          L = 1073741823;
          break;
        case 4:
          L = 1e4;
          break;
        default:
          L = 5e3;
      }
      return L = X + L, B = { id: v++, callback: ee, priorityLevel: B, startTime: X, expirationTime: L, sortIndex: -1 }, X > N ? (B.sortIndex = X, n(y, B), o(m) === null && B === o(y) && (k ? (_($), $ = -1) : k = !0, me(D, X - N))) : (B.sortIndex = L, n(m, B), x || S || (x = !0, Q(O))), B;
    }, e.unstable_shouldYield = te, e.unstable_wrapCallback = function(B) {
      var ee = c;
      return function() {
        var X = c;
        c = ee;
        try {
          return B.apply(this, arguments);
        } finally {
          c = X;
        }
      };
    };
  })(Uu)), Uu;
}
var ah;
function Lx() {
  return ah || (ah = 1, Bu.exports = Ox()), Bu.exports;
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
var lh;
function Vx() {
  if (lh) return ht;
  lh = 1;
  var e = ad(), n = Lx();
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
  var p = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), m = Object.prototype.hasOwnProperty, y = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, v = {}, l = {};
  function c(t) {
    return m.call(l, t) ? !0 : m.call(v, t) ? !1 : y.test(t) ? l[t] = !0 : (v[t] = !0, !1);
  }
  function S(t, r, s, u) {
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
    if (r === null || typeof r > "u" || S(t, r, s, u)) return !0;
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
  function k(t, r, s, u, h, g, T) {
    this.acceptsBooleans = r === 2 || r === 3 || r === 4, this.attributeName = u, this.attributeNamespace = h, this.mustUseProperty = s, this.propertyName = t, this.type = r, this.sanitizeURL = g, this.removeEmptyString = T;
  }
  var A = {};
  "children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(t) {
    A[t] = new k(t, 0, !1, t, null, !1, !1);
  }), [["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(t) {
    var r = t[0];
    A[r] = new k(r, 1, !1, t[1], null, !1, !1);
  }), ["contentEditable", "draggable", "spellCheck", "value"].forEach(function(t) {
    A[t] = new k(t, 2, !1, t.toLowerCase(), null, !1, !1);
  }), ["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(t) {
    A[t] = new k(t, 2, !1, t, null, !1, !1);
  }), "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(t) {
    A[t] = new k(t, 3, !1, t.toLowerCase(), null, !1, !1);
  }), ["checked", "multiple", "muted", "selected"].forEach(function(t) {
    A[t] = new k(t, 3, !0, t, null, !1, !1);
  }), ["capture", "download"].forEach(function(t) {
    A[t] = new k(t, 4, !1, t, null, !1, !1);
  }), ["cols", "rows", "size", "span"].forEach(function(t) {
    A[t] = new k(t, 6, !1, t, null, !1, !1);
  }), ["rowSpan", "start"].forEach(function(t) {
    A[t] = new k(t, 5, !1, t.toLowerCase(), null, !1, !1);
  });
  var _ = /[\-:]([a-z])/g;
  function b(t) {
    return t[1].toUpperCase();
  }
  "accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(t) {
    var r = t.replace(
      _,
      b
    );
    A[r] = new k(r, 1, !1, t, null, !1, !1);
  }), "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(t) {
    var r = t.replace(_, b);
    A[r] = new k(r, 1, !1, t, "http://www.w3.org/1999/xlink", !1, !1);
  }), ["xml:base", "xml:lang", "xml:space"].forEach(function(t) {
    var r = t.replace(_, b);
    A[r] = new k(r, 1, !1, t, "http://www.w3.org/XML/1998/namespace", !1, !1);
  }), ["tabIndex", "crossOrigin"].forEach(function(t) {
    A[t] = new k(t, 1, !1, t.toLowerCase(), null, !1, !1);
  }), A.xlinkHref = new k("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1), ["src", "href", "action", "formAction"].forEach(function(t) {
    A[t] = new k(t, 1, !1, t.toLowerCase(), null, !0, !0);
  });
  function E(t, r, s, u) {
    var h = A.hasOwnProperty(r) ? A[r] : null;
    (h !== null ? h.type !== 0 : u || !(2 < r.length) || r[0] !== "o" && r[0] !== "O" || r[1] !== "n" && r[1] !== "N") && (x(r, s, h, u) && (s = null), u || h === null ? c(r) && (s === null ? t.removeAttribute(r) : t.setAttribute(r, "" + s)) : h.mustUseProperty ? t[h.propertyName] = s === null ? h.type === 3 ? !1 : "" : s : (r = h.attributeName, u = h.attributeNamespace, s === null ? t.removeAttribute(r) : (h = h.type, s = h === 3 || h === 4 && s === !0 ? "" : "" + s, u ? t.setAttributeNS(u, r, s) : t.setAttribute(r, s))));
  }
  var D = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, O = Symbol.for("react.element"), K = Symbol.for("react.portal"), W = Symbol.for("react.fragment"), $ = Symbol.for("react.strict_mode"), G = Symbol.for("react.profiler"), Z = Symbol.for("react.provider"), te = Symbol.for("react.context"), ce = Symbol.for("react.forward_ref"), he = Symbol.for("react.suspense"), pe = Symbol.for("react.suspense_list"), we = Symbol.for("react.memo"), Q = Symbol.for("react.lazy"), me = Symbol.for("react.offscreen"), B = Symbol.iterator;
  function ee(t) {
    return t === null || typeof t != "object" ? null : (t = B && t[B] || t["@@iterator"], typeof t == "function" ? t : null);
  }
  var X = Object.assign, N;
  function L(t) {
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
`), g = u.stack.split(`
`), T = h.length - 1, P = g.length - 1; 1 <= T && 0 <= P && h[T] !== g[P]; ) P--;
        for (; 1 <= T && 0 <= P; T--, P--) if (h[T] !== g[P]) {
          if (T !== 1 || P !== 1)
            do
              if (T--, P--, 0 > P || h[T] !== g[P]) {
                var M = `
` + h[T].replace(" at new ", " at ");
                return t.displayName && M.includes("<anonymous>") && (M = M.replace("<anonymous>", t.displayName)), M;
              }
            while (1 <= T && 0 <= P);
          break;
        }
      }
    } finally {
      le = !1, Error.prepareStackTrace = s;
    }
    return (t = t ? t.displayName || t.name : "") ? L(t) : "";
  }
  function ge(t) {
    switch (t.tag) {
      case 5:
        return L(t.type);
      case 16:
        return L("Lazy");
      case 13:
        return L("Suspense");
      case 19:
        return L("SuspenseList");
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
  function ve(t) {
    if (t == null) return null;
    if (typeof t == "function") return t.displayName || t.name || null;
    if (typeof t == "string") return t;
    switch (t) {
      case W:
        return "Fragment";
      case K:
        return "Portal";
      case G:
        return "Profiler";
      case $:
        return "StrictMode";
      case he:
        return "Suspense";
      case pe:
        return "SuspenseList";
    }
    if (typeof t == "object") switch (t.$$typeof) {
      case te:
        return (t.displayName || "Context") + ".Consumer";
      case Z:
        return (t._context.displayName || "Context") + ".Provider";
      case ce:
        var r = t.render;
        return t = t.displayName, t || (t = r.displayName || r.name || "", t = t !== "" ? "ForwardRef(" + t + ")" : "ForwardRef"), t;
      case we:
        return r = t.displayName || null, r !== null ? r : ve(t.type) || "Memo";
      case Q:
        r = t._payload, t = t._init;
        try {
          return ve(t(r));
        } catch {
        }
    }
    return null;
  }
  function be(t) {
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
        return ve(r);
      case 8:
        return r === $ ? "StrictMode" : "Mode";
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
      var h = s.get, g = s.set;
      return Object.defineProperty(t, r, { configurable: !0, get: function() {
        return h.call(this);
      }, set: function(T) {
        u = "" + T, g.call(this, T);
      } }), Object.defineProperty(t, r, { enumerable: s.enumerable }), { getValue: function() {
        return u;
      }, setValue: function(T) {
        u = "" + T;
      }, stopTracking: function() {
        t._valueTracker = null, delete t[r];
      } };
    }
  }
  function Ci(t) {
    t._valueTracker || (t._valueTracker = St(t));
  }
  function af(t) {
    if (!t) return !1;
    var r = t._valueTracker;
    if (!r) return !0;
    var s = r.getValue(), u = "";
    return t && (u = Ne(t) ? t.checked ? "true" : "false" : t.value), t = u, t !== s ? (r.setValue(t), !0) : !1;
  }
  function bi(t) {
    if (t = t || (typeof document < "u" ? document : void 0), typeof t > "u") return null;
    try {
      return t.activeElement || t.body;
    } catch {
      return t.body;
    }
  }
  function Ga(t, r) {
    var s = r.checked;
    return X({}, r, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: s ?? t._wrapperState.initialChecked });
  }
  function lf(t, r) {
    var s = r.defaultValue == null ? "" : r.defaultValue, u = r.checked != null ? r.checked : r.defaultChecked;
    s = xe(r.value != null ? r.value : s), t._wrapperState = { initialChecked: u, initialValue: s, controlled: r.type === "checkbox" || r.type === "radio" ? r.checked != null : r.value != null };
  }
  function uf(t, r) {
    r = r.checked, r != null && E(t, "checked", r, !1);
  }
  function Ka(t, r) {
    uf(t, r);
    var s = xe(r.value), u = r.type;
    if (s != null) u === "number" ? (s === 0 && t.value === "" || t.value != s) && (t.value = "" + s) : t.value !== "" + s && (t.value = "" + s);
    else if (u === "submit" || u === "reset") {
      t.removeAttribute("value");
      return;
    }
    r.hasOwnProperty("value") ? Ya(t, r.type, s) : r.hasOwnProperty("defaultValue") && Ya(t, r.type, xe(r.defaultValue)), r.checked == null && r.defaultChecked != null && (t.defaultChecked = !!r.defaultChecked);
  }
  function cf(t, r, s) {
    if (r.hasOwnProperty("value") || r.hasOwnProperty("defaultValue")) {
      var u = r.type;
      if (!(u !== "submit" && u !== "reset" || r.value !== void 0 && r.value !== null)) return;
      r = "" + t._wrapperState.initialValue, s || r === t.value || (t.value = r), t.defaultValue = r;
    }
    s = t.name, s !== "" && (t.name = ""), t.defaultChecked = !!t._wrapperState.initialChecked, s !== "" && (t.name = s);
  }
  function Ya(t, r, s) {
    (r !== "number" || bi(t.ownerDocument) !== t) && (s == null ? t.defaultValue = "" + t._wrapperState.initialValue : t.defaultValue !== "" + s && (t.defaultValue = "" + s));
  }
  var ho = Array.isArray;
  function Tr(t, r, s, u) {
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
  function Qa(t, r) {
    if (r.dangerouslySetInnerHTML != null) throw Error(o(91));
    return X({}, r, { value: void 0, defaultValue: void 0, children: "" + t._wrapperState.initialValue });
  }
  function df(t, r) {
    var s = r.value;
    if (s == null) {
      if (s = r.children, r = r.defaultValue, s != null) {
        if (r != null) throw Error(o(92));
        if (ho(s)) {
          if (1 < s.length) throw Error(o(93));
          s = s[0];
        }
        r = s;
      }
      r == null && (r = ""), s = r;
    }
    t._wrapperState = { initialValue: xe(s) };
  }
  function ff(t, r) {
    var s = xe(r.value), u = xe(r.defaultValue);
    s != null && (s = "" + s, s !== t.value && (t.value = s), r.defaultValue == null && t.defaultValue !== s && (t.defaultValue = s)), u != null && (t.defaultValue = "" + u);
  }
  function pf(t) {
    var r = t.textContent;
    r === t._wrapperState.initialValue && r !== "" && r !== null && (t.value = r);
  }
  function mf(t) {
    switch (t) {
      case "svg":
        return "http://www.w3.org/2000/svg";
      case "math":
        return "http://www.w3.org/1998/Math/MathML";
      default:
        return "http://www.w3.org/1999/xhtml";
    }
  }
  function Xa(t, r) {
    return t == null || t === "http://www.w3.org/1999/xhtml" ? mf(r) : t === "http://www.w3.org/2000/svg" && r === "foreignObject" ? "http://www.w3.org/1999/xhtml" : t;
  }
  var Pi, hf = (function(t) {
    return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(r, s, u, h) {
      MSApp.execUnsafeLocalFunction(function() {
        return t(r, s, u, h);
      });
    } : t;
  })(function(t, r) {
    if (t.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in t) t.innerHTML = r;
    else {
      for (Pi = Pi || document.createElement("div"), Pi.innerHTML = "<svg>" + r.valueOf().toString() + "</svg>", r = Pi.firstChild; t.firstChild; ) t.removeChild(t.firstChild);
      for (; r.firstChild; ) t.appendChild(r.firstChild);
    }
  });
  function yo(t, r) {
    if (r) {
      var s = t.firstChild;
      if (s && s === t.lastChild && s.nodeType === 3) {
        s.nodeValue = r;
        return;
      }
    }
    t.textContent = r;
  }
  var go = {
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
  }, jS = ["Webkit", "ms", "Moz", "O"];
  Object.keys(go).forEach(function(t) {
    jS.forEach(function(r) {
      r = r + t.charAt(0).toUpperCase() + t.substring(1), go[r] = go[t];
    });
  });
  function yf(t, r, s) {
    return r == null || typeof r == "boolean" || r === "" ? "" : s || typeof r != "number" || r === 0 || go.hasOwnProperty(t) && go[t] ? ("" + r).trim() : r + "px";
  }
  function gf(t, r) {
    t = t.style;
    for (var s in r) if (r.hasOwnProperty(s)) {
      var u = s.indexOf("--") === 0, h = yf(s, r[s], u);
      s === "float" && (s = "cssFloat"), u ? t.setProperty(s, h) : t[s] = h;
    }
  }
  var IS = X({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
  function Za(t, r) {
    if (r) {
      if (IS[t] && (r.children != null || r.dangerouslySetInnerHTML != null)) throw Error(o(137, t));
      if (r.dangerouslySetInnerHTML != null) {
        if (r.children != null) throw Error(o(60));
        if (typeof r.dangerouslySetInnerHTML != "object" || !("__html" in r.dangerouslySetInnerHTML)) throw Error(o(61));
      }
      if (r.style != null && typeof r.style != "object") throw Error(o(62));
    }
  }
  function Ja(t, r) {
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
  var qa = null;
  function el(t) {
    return t = t.target || t.srcElement || window, t.correspondingUseElement && (t = t.correspondingUseElement), t.nodeType === 3 ? t.parentNode : t;
  }
  var tl = null, kr = null, Ar = null;
  function vf(t) {
    if (t = Vo(t)) {
      if (typeof tl != "function") throw Error(o(280));
      var r = t.stateNode;
      r && (r = Zi(r), tl(t.stateNode, t.type, r));
    }
  }
  function Sf(t) {
    kr ? Ar ? Ar.push(t) : Ar = [t] : kr = t;
  }
  function wf() {
    if (kr) {
      var t = kr, r = Ar;
      if (Ar = kr = null, vf(t), r) for (t = 0; t < r.length; t++) vf(r[t]);
    }
  }
  function xf(t, r) {
    return t(r);
  }
  function _f() {
  }
  var nl = !1;
  function Tf(t, r, s) {
    if (nl) return t(r, s);
    nl = !0;
    try {
      return xf(t, r, s);
    } finally {
      nl = !1, (kr !== null || Ar !== null) && (_f(), wf());
    }
  }
  function vo(t, r) {
    var s = t.stateNode;
    if (s === null) return null;
    var u = Zi(s);
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
  var rl = !1;
  if (p) try {
    var So = {};
    Object.defineProperty(So, "passive", { get: function() {
      rl = !0;
    } }), window.addEventListener("test", So, So), window.removeEventListener("test", So, So);
  } catch {
    rl = !1;
  }
  function FS(t, r, s, u, h, g, T, P, M) {
    var F = Array.prototype.slice.call(arguments, 3);
    try {
      r.apply(s, F);
    } catch (z) {
      this.onError(z);
    }
  }
  var wo = !1, Ei = null, Mi = !1, ol = null, OS = { onError: function(t) {
    wo = !0, Ei = t;
  } };
  function LS(t, r, s, u, h, g, T, P, M) {
    wo = !1, Ei = null, FS.apply(OS, arguments);
  }
  function VS(t, r, s, u, h, g, T, P, M) {
    if (LS.apply(this, arguments), wo) {
      if (wo) {
        var F = Ei;
        wo = !1, Ei = null;
      } else throw Error(o(198));
      Mi || (Mi = !0, ol = F);
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
  function kf(t) {
    if (t.tag === 13) {
      var r = t.memoizedState;
      if (r === null && (t = t.alternate, t !== null && (r = t.memoizedState)), r !== null) return r.dehydrated;
    }
    return null;
  }
  function Af(t) {
    if (Xn(t) !== t) throw Error(o(188));
  }
  function zS(t) {
    var r = t.alternate;
    if (!r) {
      if (r = Xn(t), r === null) throw Error(o(188));
      return r !== t ? null : t;
    }
    for (var s = t, u = r; ; ) {
      var h = s.return;
      if (h === null) break;
      var g = h.alternate;
      if (g === null) {
        if (u = h.return, u !== null) {
          s = u;
          continue;
        }
        break;
      }
      if (h.child === g.child) {
        for (g = h.child; g; ) {
          if (g === s) return Af(h), t;
          if (g === u) return Af(h), r;
          g = g.sibling;
        }
        throw Error(o(188));
      }
      if (s.return !== u.return) s = h, u = g;
      else {
        for (var T = !1, P = h.child; P; ) {
          if (P === s) {
            T = !0, s = h, u = g;
            break;
          }
          if (P === u) {
            T = !0, u = h, s = g;
            break;
          }
          P = P.sibling;
        }
        if (!T) {
          for (P = g.child; P; ) {
            if (P === s) {
              T = !0, s = g, u = h;
              break;
            }
            if (P === u) {
              T = !0, u = g, s = h;
              break;
            }
            P = P.sibling;
          }
          if (!T) throw Error(o(189));
        }
      }
      if (s.alternate !== u) throw Error(o(190));
    }
    if (s.tag !== 3) throw Error(o(188));
    return s.stateNode.current === s ? t : r;
  }
  function Cf(t) {
    return t = zS(t), t !== null ? bf(t) : null;
  }
  function bf(t) {
    if (t.tag === 5 || t.tag === 6) return t;
    for (t = t.child; t !== null; ) {
      var r = bf(t);
      if (r !== null) return r;
      t = t.sibling;
    }
    return null;
  }
  var Pf = n.unstable_scheduleCallback, Ef = n.unstable_cancelCallback, BS = n.unstable_shouldYield, US = n.unstable_requestPaint, Le = n.unstable_now, $S = n.unstable_getCurrentPriorityLevel, il = n.unstable_ImmediatePriority, Mf = n.unstable_UserBlockingPriority, Ri = n.unstable_NormalPriority, HS = n.unstable_LowPriority, Rf = n.unstable_IdlePriority, Ni = null, Kt = null;
  function WS(t) {
    if (Kt && typeof Kt.onCommitFiberRoot == "function") try {
      Kt.onCommitFiberRoot(Ni, t, void 0, (t.current.flags & 128) === 128);
    } catch {
    }
  }
  var It = Math.clz32 ? Math.clz32 : YS, GS = Math.log, KS = Math.LN2;
  function YS(t) {
    return t >>>= 0, t === 0 ? 32 : 31 - (GS(t) / KS | 0) | 0;
  }
  var Di = 64, ji = 4194304;
  function xo(t) {
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
  function Ii(t, r) {
    var s = t.pendingLanes;
    if (s === 0) return 0;
    var u = 0, h = t.suspendedLanes, g = t.pingedLanes, T = s & 268435455;
    if (T !== 0) {
      var P = T & ~h;
      P !== 0 ? u = xo(P) : (g &= T, g !== 0 && (u = xo(g)));
    } else T = s & ~h, T !== 0 ? u = xo(T) : g !== 0 && (u = xo(g));
    if (u === 0) return 0;
    if (r !== 0 && r !== u && (r & h) === 0 && (h = u & -u, g = r & -r, h >= g || h === 16 && (g & 4194240) !== 0)) return r;
    if ((u & 4) !== 0 && (u |= s & 16), r = t.entangledLanes, r !== 0) for (t = t.entanglements, r &= u; 0 < r; ) s = 31 - It(r), h = 1 << s, u |= t[s], r &= ~h;
    return u;
  }
  function QS(t, r) {
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
  function XS(t, r) {
    for (var s = t.suspendedLanes, u = t.pingedLanes, h = t.expirationTimes, g = t.pendingLanes; 0 < g; ) {
      var T = 31 - It(g), P = 1 << T, M = h[T];
      M === -1 ? ((P & s) === 0 || (P & u) !== 0) && (h[T] = QS(P, r)) : M <= r && (t.expiredLanes |= P), g &= ~P;
    }
  }
  function sl(t) {
    return t = t.pendingLanes & -1073741825, t !== 0 ? t : t & 1073741824 ? 1073741824 : 0;
  }
  function Nf() {
    var t = Di;
    return Di <<= 1, (Di & 4194240) === 0 && (Di = 64), t;
  }
  function al(t) {
    for (var r = [], s = 0; 31 > s; s++) r.push(t);
    return r;
  }
  function _o(t, r, s) {
    t.pendingLanes |= r, r !== 536870912 && (t.suspendedLanes = 0, t.pingedLanes = 0), t = t.eventTimes, r = 31 - It(r), t[r] = s;
  }
  function ZS(t, r) {
    var s = t.pendingLanes & ~r;
    t.pendingLanes = r, t.suspendedLanes = 0, t.pingedLanes = 0, t.expiredLanes &= r, t.mutableReadLanes &= r, t.entangledLanes &= r, r = t.entanglements;
    var u = t.eventTimes;
    for (t = t.expirationTimes; 0 < s; ) {
      var h = 31 - It(s), g = 1 << h;
      r[h] = 0, u[h] = -1, t[h] = -1, s &= ~g;
    }
  }
  function ll(t, r) {
    var s = t.entangledLanes |= r;
    for (t = t.entanglements; s; ) {
      var u = 31 - It(s), h = 1 << u;
      h & r | t[u] & r && (t[u] |= r), s &= ~h;
    }
  }
  var _e = 0;
  function Df(t) {
    return t &= -t, 1 < t ? 4 < t ? (t & 268435455) !== 0 ? 16 : 536870912 : 4 : 1;
  }
  var jf, ul, If, Ff, Of, cl = !1, Fi = [], vn = null, Sn = null, wn = null, To = /* @__PURE__ */ new Map(), ko = /* @__PURE__ */ new Map(), xn = [], JS = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
  function Lf(t, r) {
    switch (t) {
      case "focusin":
      case "focusout":
        vn = null;
        break;
      case "dragenter":
      case "dragleave":
        Sn = null;
        break;
      case "mouseover":
      case "mouseout":
        wn = null;
        break;
      case "pointerover":
      case "pointerout":
        To.delete(r.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        ko.delete(r.pointerId);
    }
  }
  function Ao(t, r, s, u, h, g) {
    return t === null || t.nativeEvent !== g ? (t = { blockedOn: r, domEventName: s, eventSystemFlags: u, nativeEvent: g, targetContainers: [h] }, r !== null && (r = Vo(r), r !== null && ul(r)), t) : (t.eventSystemFlags |= u, r = t.targetContainers, h !== null && r.indexOf(h) === -1 && r.push(h), t);
  }
  function qS(t, r, s, u, h) {
    switch (r) {
      case "focusin":
        return vn = Ao(vn, t, r, s, u, h), !0;
      case "dragenter":
        return Sn = Ao(Sn, t, r, s, u, h), !0;
      case "mouseover":
        return wn = Ao(wn, t, r, s, u, h), !0;
      case "pointerover":
        var g = h.pointerId;
        return To.set(g, Ao(To.get(g) || null, t, r, s, u, h)), !0;
      case "gotpointercapture":
        return g = h.pointerId, ko.set(g, Ao(ko.get(g) || null, t, r, s, u, h)), !0;
    }
    return !1;
  }
  function Vf(t) {
    var r = Zn(t.target);
    if (r !== null) {
      var s = Xn(r);
      if (s !== null) {
        if (r = s.tag, r === 13) {
          if (r = kf(s), r !== null) {
            t.blockedOn = r, Of(t.priority, function() {
              If(s);
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
  function Oi(t) {
    if (t.blockedOn !== null) return !1;
    for (var r = t.targetContainers; 0 < r.length; ) {
      var s = fl(t.domEventName, t.eventSystemFlags, r[0], t.nativeEvent);
      if (s === null) {
        s = t.nativeEvent;
        var u = new s.constructor(s.type, s);
        qa = u, s.target.dispatchEvent(u), qa = null;
      } else return r = Vo(s), r !== null && ul(r), t.blockedOn = s, !1;
      r.shift();
    }
    return !0;
  }
  function zf(t, r, s) {
    Oi(t) && s.delete(r);
  }
  function ew() {
    cl = !1, vn !== null && Oi(vn) && (vn = null), Sn !== null && Oi(Sn) && (Sn = null), wn !== null && Oi(wn) && (wn = null), To.forEach(zf), ko.forEach(zf);
  }
  function Co(t, r) {
    t.blockedOn === r && (t.blockedOn = null, cl || (cl = !0, n.unstable_scheduleCallback(n.unstable_NormalPriority, ew)));
  }
  function bo(t) {
    function r(h) {
      return Co(h, t);
    }
    if (0 < Fi.length) {
      Co(Fi[0], t);
      for (var s = 1; s < Fi.length; s++) {
        var u = Fi[s];
        u.blockedOn === t && (u.blockedOn = null);
      }
    }
    for (vn !== null && Co(vn, t), Sn !== null && Co(Sn, t), wn !== null && Co(wn, t), To.forEach(r), ko.forEach(r), s = 0; s < xn.length; s++) u = xn[s], u.blockedOn === t && (u.blockedOn = null);
    for (; 0 < xn.length && (s = xn[0], s.blockedOn === null); ) Vf(s), s.blockedOn === null && xn.shift();
  }
  var Cr = D.ReactCurrentBatchConfig, Li = !0;
  function tw(t, r, s, u) {
    var h = _e, g = Cr.transition;
    Cr.transition = null;
    try {
      _e = 1, dl(t, r, s, u);
    } finally {
      _e = h, Cr.transition = g;
    }
  }
  function nw(t, r, s, u) {
    var h = _e, g = Cr.transition;
    Cr.transition = null;
    try {
      _e = 4, dl(t, r, s, u);
    } finally {
      _e = h, Cr.transition = g;
    }
  }
  function dl(t, r, s, u) {
    if (Li) {
      var h = fl(t, r, s, u);
      if (h === null) El(t, r, u, Vi, s), Lf(t, u);
      else if (qS(h, t, r, s, u)) u.stopPropagation();
      else if (Lf(t, u), r & 4 && -1 < JS.indexOf(t)) {
        for (; h !== null; ) {
          var g = Vo(h);
          if (g !== null && jf(g), g = fl(t, r, s, u), g === null && El(t, r, u, Vi, s), g === h) break;
          h = g;
        }
        h !== null && u.stopPropagation();
      } else El(t, r, u, null, s);
    }
  }
  var Vi = null;
  function fl(t, r, s, u) {
    if (Vi = null, t = el(u), t = Zn(t), t !== null) if (r = Xn(t), r === null) t = null;
    else if (s = r.tag, s === 13) {
      if (t = kf(r), t !== null) return t;
      t = null;
    } else if (s === 3) {
      if (r.stateNode.current.memoizedState.isDehydrated) return r.tag === 3 ? r.stateNode.containerInfo : null;
      t = null;
    } else r !== t && (t = null);
    return Vi = t, null;
  }
  function Bf(t) {
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
        switch ($S()) {
          case il:
            return 1;
          case Mf:
            return 4;
          case Ri:
          case HS:
            return 16;
          case Rf:
            return 536870912;
          default:
            return 16;
        }
      default:
        return 16;
    }
  }
  var _n = null, pl = null, zi = null;
  function Uf() {
    if (zi) return zi;
    var t, r = pl, s = r.length, u, h = "value" in _n ? _n.value : _n.textContent, g = h.length;
    for (t = 0; t < s && r[t] === h[t]; t++) ;
    var T = s - t;
    for (u = 1; u <= T && r[s - u] === h[g - u]; u++) ;
    return zi = h.slice(t, 1 < u ? 1 - u : void 0);
  }
  function Bi(t) {
    var r = t.keyCode;
    return "charCode" in t ? (t = t.charCode, t === 0 && r === 13 && (t = 13)) : t = r, t === 10 && (t = 13), 32 <= t || t === 13 ? t : 0;
  }
  function Ui() {
    return !0;
  }
  function $f() {
    return !1;
  }
  function wt(t) {
    function r(s, u, h, g, T) {
      this._reactName = s, this._targetInst = h, this.type = u, this.nativeEvent = g, this.target = T, this.currentTarget = null;
      for (var P in t) t.hasOwnProperty(P) && (s = t[P], this[P] = s ? s(g) : g[P]);
      return this.isDefaultPrevented = (g.defaultPrevented != null ? g.defaultPrevented : g.returnValue === !1) ? Ui : $f, this.isPropagationStopped = $f, this;
    }
    return X(r.prototype, { preventDefault: function() {
      this.defaultPrevented = !0;
      var s = this.nativeEvent;
      s && (s.preventDefault ? s.preventDefault() : typeof s.returnValue != "unknown" && (s.returnValue = !1), this.isDefaultPrevented = Ui);
    }, stopPropagation: function() {
      var s = this.nativeEvent;
      s && (s.stopPropagation ? s.stopPropagation() : typeof s.cancelBubble != "unknown" && (s.cancelBubble = !0), this.isPropagationStopped = Ui);
    }, persist: function() {
    }, isPersistent: Ui }), r;
  }
  var br = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(t) {
    return t.timeStamp || Date.now();
  }, defaultPrevented: 0, isTrusted: 0 }, ml = wt(br), Po = X({}, br, { view: 0, detail: 0 }), rw = wt(Po), hl, yl, Eo, $i = X({}, Po, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: vl, button: 0, buttons: 0, relatedTarget: function(t) {
    return t.relatedTarget === void 0 ? t.fromElement === t.srcElement ? t.toElement : t.fromElement : t.relatedTarget;
  }, movementX: function(t) {
    return "movementX" in t ? t.movementX : (t !== Eo && (Eo && t.type === "mousemove" ? (hl = t.screenX - Eo.screenX, yl = t.screenY - Eo.screenY) : yl = hl = 0, Eo = t), hl);
  }, movementY: function(t) {
    return "movementY" in t ? t.movementY : yl;
  } }), Hf = wt($i), ow = X({}, $i, { dataTransfer: 0 }), iw = wt(ow), sw = X({}, Po, { relatedTarget: 0 }), gl = wt(sw), aw = X({}, br, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), lw = wt(aw), uw = X({}, br, { clipboardData: function(t) {
    return "clipboardData" in t ? t.clipboardData : window.clipboardData;
  } }), cw = wt(uw), dw = X({}, br, { data: 0 }), Wf = wt(dw), fw = {
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
  }, pw = {
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
  }, mw = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
  function hw(t) {
    var r = this.nativeEvent;
    return r.getModifierState ? r.getModifierState(t) : (t = mw[t]) ? !!r[t] : !1;
  }
  function vl() {
    return hw;
  }
  var yw = X({}, Po, { key: function(t) {
    if (t.key) {
      var r = fw[t.key] || t.key;
      if (r !== "Unidentified") return r;
    }
    return t.type === "keypress" ? (t = Bi(t), t === 13 ? "Enter" : String.fromCharCode(t)) : t.type === "keydown" || t.type === "keyup" ? pw[t.keyCode] || "Unidentified" : "";
  }, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: vl, charCode: function(t) {
    return t.type === "keypress" ? Bi(t) : 0;
  }, keyCode: function(t) {
    return t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
  }, which: function(t) {
    return t.type === "keypress" ? Bi(t) : t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
  } }), gw = wt(yw), vw = X({}, $i, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), Gf = wt(vw), Sw = X({}, Po, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: vl }), ww = wt(Sw), xw = X({}, br, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), _w = wt(xw), Tw = X({}, $i, {
    deltaX: function(t) {
      return "deltaX" in t ? t.deltaX : "wheelDeltaX" in t ? -t.wheelDeltaX : 0;
    },
    deltaY: function(t) {
      return "deltaY" in t ? t.deltaY : "wheelDeltaY" in t ? -t.wheelDeltaY : "wheelDelta" in t ? -t.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), kw = wt(Tw), Aw = [9, 13, 27, 32], Sl = p && "CompositionEvent" in window, Mo = null;
  p && "documentMode" in document && (Mo = document.documentMode);
  var Cw = p && "TextEvent" in window && !Mo, Kf = p && (!Sl || Mo && 8 < Mo && 11 >= Mo), Yf = " ", Qf = !1;
  function Xf(t, r) {
    switch (t) {
      case "keyup":
        return Aw.indexOf(r.keyCode) !== -1;
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
  function Zf(t) {
    return t = t.detail, typeof t == "object" && "data" in t ? t.data : null;
  }
  var Pr = !1;
  function bw(t, r) {
    switch (t) {
      case "compositionend":
        return Zf(r);
      case "keypress":
        return r.which !== 32 ? null : (Qf = !0, Yf);
      case "textInput":
        return t = r.data, t === Yf && Qf ? null : t;
      default:
        return null;
    }
  }
  function Pw(t, r) {
    if (Pr) return t === "compositionend" || !Sl && Xf(t, r) ? (t = Uf(), zi = pl = _n = null, Pr = !1, t) : null;
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
        return Kf && r.locale !== "ko" ? null : r.data;
      default:
        return null;
    }
  }
  var Ew = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
  function Jf(t) {
    var r = t && t.nodeName && t.nodeName.toLowerCase();
    return r === "input" ? !!Ew[t.type] : r === "textarea";
  }
  function qf(t, r, s, u) {
    Sf(u), r = Yi(r, "onChange"), 0 < r.length && (s = new ml("onChange", "change", null, s, u), t.push({ event: s, listeners: r }));
  }
  var Ro = null, No = null;
  function Mw(t) {
    gp(t, 0);
  }
  function Hi(t) {
    var r = Dr(t);
    if (af(r)) return t;
  }
  function Rw(t, r) {
    if (t === "change") return r;
  }
  var ep = !1;
  if (p) {
    var wl;
    if (p) {
      var xl = "oninput" in document;
      if (!xl) {
        var tp = document.createElement("div");
        tp.setAttribute("oninput", "return;"), xl = typeof tp.oninput == "function";
      }
      wl = xl;
    } else wl = !1;
    ep = wl && (!document.documentMode || 9 < document.documentMode);
  }
  function np() {
    Ro && (Ro.detachEvent("onpropertychange", rp), No = Ro = null);
  }
  function rp(t) {
    if (t.propertyName === "value" && Hi(No)) {
      var r = [];
      qf(r, No, t, el(t)), Tf(Mw, r);
    }
  }
  function Nw(t, r, s) {
    t === "focusin" ? (np(), Ro = r, No = s, Ro.attachEvent("onpropertychange", rp)) : t === "focusout" && np();
  }
  function Dw(t) {
    if (t === "selectionchange" || t === "keyup" || t === "keydown") return Hi(No);
  }
  function jw(t, r) {
    if (t === "click") return Hi(r);
  }
  function Iw(t, r) {
    if (t === "input" || t === "change") return Hi(r);
  }
  function Fw(t, r) {
    return t === r && (t !== 0 || 1 / t === 1 / r) || t !== t && r !== r;
  }
  var Ft = typeof Object.is == "function" ? Object.is : Fw;
  function Do(t, r) {
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
  function op(t) {
    for (; t && t.firstChild; ) t = t.firstChild;
    return t;
  }
  function ip(t, r) {
    var s = op(t);
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
      s = op(s);
    }
  }
  function sp(t, r) {
    return t && r ? t === r ? !0 : t && t.nodeType === 3 ? !1 : r && r.nodeType === 3 ? sp(t, r.parentNode) : "contains" in t ? t.contains(r) : t.compareDocumentPosition ? !!(t.compareDocumentPosition(r) & 16) : !1 : !1;
  }
  function ap() {
    for (var t = window, r = bi(); r instanceof t.HTMLIFrameElement; ) {
      try {
        var s = typeof r.contentWindow.location.href == "string";
      } catch {
        s = !1;
      }
      if (s) t = r.contentWindow;
      else break;
      r = bi(t.document);
    }
    return r;
  }
  function _l(t) {
    var r = t && t.nodeName && t.nodeName.toLowerCase();
    return r && (r === "input" && (t.type === "text" || t.type === "search" || t.type === "tel" || t.type === "url" || t.type === "password") || r === "textarea" || t.contentEditable === "true");
  }
  function Ow(t) {
    var r = ap(), s = t.focusedElem, u = t.selectionRange;
    if (r !== s && s && s.ownerDocument && sp(s.ownerDocument.documentElement, s)) {
      if (u !== null && _l(s)) {
        if (r = u.start, t = u.end, t === void 0 && (t = r), "selectionStart" in s) s.selectionStart = r, s.selectionEnd = Math.min(t, s.value.length);
        else if (t = (r = s.ownerDocument || document) && r.defaultView || window, t.getSelection) {
          t = t.getSelection();
          var h = s.textContent.length, g = Math.min(u.start, h);
          u = u.end === void 0 ? g : Math.min(u.end, h), !t.extend && g > u && (h = u, u = g, g = h), h = ip(s, g);
          var T = ip(
            s,
            u
          );
          h && T && (t.rangeCount !== 1 || t.anchorNode !== h.node || t.anchorOffset !== h.offset || t.focusNode !== T.node || t.focusOffset !== T.offset) && (r = r.createRange(), r.setStart(h.node, h.offset), t.removeAllRanges(), g > u ? (t.addRange(r), t.extend(T.node, T.offset)) : (r.setEnd(T.node, T.offset), t.addRange(r)));
        }
      }
      for (r = [], t = s; t = t.parentNode; ) t.nodeType === 1 && r.push({ element: t, left: t.scrollLeft, top: t.scrollTop });
      for (typeof s.focus == "function" && s.focus(), s = 0; s < r.length; s++) t = r[s], t.element.scrollLeft = t.left, t.element.scrollTop = t.top;
    }
  }
  var Lw = p && "documentMode" in document && 11 >= document.documentMode, Er = null, Tl = null, jo = null, kl = !1;
  function lp(t, r, s) {
    var u = s.window === s ? s.document : s.nodeType === 9 ? s : s.ownerDocument;
    kl || Er == null || Er !== bi(u) || (u = Er, "selectionStart" in u && _l(u) ? u = { start: u.selectionStart, end: u.selectionEnd } : (u = (u.ownerDocument && u.ownerDocument.defaultView || window).getSelection(), u = { anchorNode: u.anchorNode, anchorOffset: u.anchorOffset, focusNode: u.focusNode, focusOffset: u.focusOffset }), jo && Do(jo, u) || (jo = u, u = Yi(Tl, "onSelect"), 0 < u.length && (r = new ml("onSelect", "select", null, r, s), t.push({ event: r, listeners: u }), r.target = Er)));
  }
  function Wi(t, r) {
    var s = {};
    return s[t.toLowerCase()] = r.toLowerCase(), s["Webkit" + t] = "webkit" + r, s["Moz" + t] = "moz" + r, s;
  }
  var Mr = { animationend: Wi("Animation", "AnimationEnd"), animationiteration: Wi("Animation", "AnimationIteration"), animationstart: Wi("Animation", "AnimationStart"), transitionend: Wi("Transition", "TransitionEnd") }, Al = {}, up = {};
  p && (up = document.createElement("div").style, "AnimationEvent" in window || (delete Mr.animationend.animation, delete Mr.animationiteration.animation, delete Mr.animationstart.animation), "TransitionEvent" in window || delete Mr.transitionend.transition);
  function Gi(t) {
    if (Al[t]) return Al[t];
    if (!Mr[t]) return t;
    var r = Mr[t], s;
    for (s in r) if (r.hasOwnProperty(s) && s in up) return Al[t] = r[s];
    return t;
  }
  var cp = Gi("animationend"), dp = Gi("animationiteration"), fp = Gi("animationstart"), pp = Gi("transitionend"), mp = /* @__PURE__ */ new Map(), hp = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
  function Tn(t, r) {
    mp.set(t, r), d(r, [t]);
  }
  for (var Cl = 0; Cl < hp.length; Cl++) {
    var bl = hp[Cl], Vw = bl.toLowerCase(), zw = bl[0].toUpperCase() + bl.slice(1);
    Tn(Vw, "on" + zw);
  }
  Tn(cp, "onAnimationEnd"), Tn(dp, "onAnimationIteration"), Tn(fp, "onAnimationStart"), Tn("dblclick", "onDoubleClick"), Tn("focusin", "onFocus"), Tn("focusout", "onBlur"), Tn(pp, "onTransitionEnd"), f("onMouseEnter", ["mouseout", "mouseover"]), f("onMouseLeave", ["mouseout", "mouseover"]), f("onPointerEnter", ["pointerout", "pointerover"]), f("onPointerLeave", ["pointerout", "pointerover"]), d("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), d("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), d("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]), d("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), d("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), d("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
  var Io = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), Bw = new Set("cancel close invalid load scroll toggle".split(" ").concat(Io));
  function yp(t, r, s) {
    var u = t.type || "unknown-event";
    t.currentTarget = s, VS(u, r, void 0, t), t.currentTarget = null;
  }
  function gp(t, r) {
    r = (r & 4) !== 0;
    for (var s = 0; s < t.length; s++) {
      var u = t[s], h = u.event;
      u = u.listeners;
      e: {
        var g = void 0;
        if (r) for (var T = u.length - 1; 0 <= T; T--) {
          var P = u[T], M = P.instance, F = P.currentTarget;
          if (P = P.listener, M !== g && h.isPropagationStopped()) break e;
          yp(h, P, F), g = M;
        }
        else for (T = 0; T < u.length; T++) {
          if (P = u[T], M = P.instance, F = P.currentTarget, P = P.listener, M !== g && h.isPropagationStopped()) break e;
          yp(h, P, F), g = M;
        }
      }
    }
    if (Mi) throw t = ol, Mi = !1, ol = null, t;
  }
  function Me(t, r) {
    var s = r[Il];
    s === void 0 && (s = r[Il] = /* @__PURE__ */ new Set());
    var u = t + "__bubble";
    s.has(u) || (vp(r, t, 2, !1), s.add(u));
  }
  function Pl(t, r, s) {
    var u = 0;
    r && (u |= 4), vp(s, t, u, r);
  }
  var Ki = "_reactListening" + Math.random().toString(36).slice(2);
  function Fo(t) {
    if (!t[Ki]) {
      t[Ki] = !0, i.forEach(function(s) {
        s !== "selectionchange" && (Bw.has(s) || Pl(s, !1, t), Pl(s, !0, t));
      });
      var r = t.nodeType === 9 ? t : t.ownerDocument;
      r === null || r[Ki] || (r[Ki] = !0, Pl("selectionchange", !1, r));
    }
  }
  function vp(t, r, s, u) {
    switch (Bf(r)) {
      case 1:
        var h = tw;
        break;
      case 4:
        h = nw;
        break;
      default:
        h = dl;
    }
    s = h.bind(null, r, s, t), h = void 0, !rl || r !== "touchstart" && r !== "touchmove" && r !== "wheel" || (h = !0), u ? h !== void 0 ? t.addEventListener(r, s, { capture: !0, passive: h }) : t.addEventListener(r, s, !0) : h !== void 0 ? t.addEventListener(r, s, { passive: h }) : t.addEventListener(r, s, !1);
  }
  function El(t, r, s, u, h) {
    var g = u;
    if ((r & 1) === 0 && (r & 2) === 0 && u !== null) e: for (; ; ) {
      if (u === null) return;
      var T = u.tag;
      if (T === 3 || T === 4) {
        var P = u.stateNode.containerInfo;
        if (P === h || P.nodeType === 8 && P.parentNode === h) break;
        if (T === 4) for (T = u.return; T !== null; ) {
          var M = T.tag;
          if ((M === 3 || M === 4) && (M = T.stateNode.containerInfo, M === h || M.nodeType === 8 && M.parentNode === h)) return;
          T = T.return;
        }
        for (; P !== null; ) {
          if (T = Zn(P), T === null) return;
          if (M = T.tag, M === 5 || M === 6) {
            u = g = T;
            continue e;
          }
          P = P.parentNode;
        }
      }
      u = u.return;
    }
    Tf(function() {
      var F = g, z = el(s), U = [];
      e: {
        var V = mp.get(t);
        if (V !== void 0) {
          var J = ml, ne = t;
          switch (t) {
            case "keypress":
              if (Bi(s) === 0) break e;
            case "keydown":
            case "keyup":
              J = gw;
              break;
            case "focusin":
              ne = "focus", J = gl;
              break;
            case "focusout":
              ne = "blur", J = gl;
              break;
            case "beforeblur":
            case "afterblur":
              J = gl;
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
              J = Hf;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              J = iw;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              J = ww;
              break;
            case cp:
            case dp:
            case fp:
              J = lw;
              break;
            case pp:
              J = _w;
              break;
            case "scroll":
              J = rw;
              break;
            case "wheel":
              J = kw;
              break;
            case "copy":
            case "cut":
            case "paste":
              J = cw;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              J = Gf;
          }
          var oe = (r & 4) !== 0, Ve = !oe && t === "scroll", j = oe ? V !== null ? V + "Capture" : null : V;
          oe = [];
          for (var R = F, I; R !== null; ) {
            I = R;
            var H = I.stateNode;
            if (I.tag === 5 && H !== null && (I = H, j !== null && (H = vo(R, j), H != null && oe.push(Oo(R, H, I)))), Ve) break;
            R = R.return;
          }
          0 < oe.length && (V = new J(V, ne, null, s, z), U.push({ event: V, listeners: oe }));
        }
      }
      if ((r & 7) === 0) {
        e: {
          if (V = t === "mouseover" || t === "pointerover", J = t === "mouseout" || t === "pointerout", V && s !== qa && (ne = s.relatedTarget || s.fromElement) && (Zn(ne) || ne[sn])) break e;
          if ((J || V) && (V = z.window === z ? z : (V = z.ownerDocument) ? V.defaultView || V.parentWindow : window, J ? (ne = s.relatedTarget || s.toElement, J = F, ne = ne ? Zn(ne) : null, ne !== null && (Ve = Xn(ne), ne !== Ve || ne.tag !== 5 && ne.tag !== 6) && (ne = null)) : (J = null, ne = F), J !== ne)) {
            if (oe = Hf, H = "onMouseLeave", j = "onMouseEnter", R = "mouse", (t === "pointerout" || t === "pointerover") && (oe = Gf, H = "onPointerLeave", j = "onPointerEnter", R = "pointer"), Ve = J == null ? V : Dr(J), I = ne == null ? V : Dr(ne), V = new oe(H, R + "leave", J, s, z), V.target = Ve, V.relatedTarget = I, H = null, Zn(z) === F && (oe = new oe(j, R + "enter", ne, s, z), oe.target = I, oe.relatedTarget = Ve, H = oe), Ve = H, J && ne) t: {
              for (oe = J, j = ne, R = 0, I = oe; I; I = Rr(I)) R++;
              for (I = 0, H = j; H; H = Rr(H)) I++;
              for (; 0 < R - I; ) oe = Rr(oe), R--;
              for (; 0 < I - R; ) j = Rr(j), I--;
              for (; R--; ) {
                if (oe === j || j !== null && oe === j.alternate) break t;
                oe = Rr(oe), j = Rr(j);
              }
              oe = null;
            }
            else oe = null;
            J !== null && Sp(U, V, J, oe, !1), ne !== null && Ve !== null && Sp(U, Ve, ne, oe, !0);
          }
        }
        e: {
          if (V = F ? Dr(F) : window, J = V.nodeName && V.nodeName.toLowerCase(), J === "select" || J === "input" && V.type === "file") var ie = Rw;
          else if (Jf(V)) if (ep) ie = Iw;
          else {
            ie = Dw;
            var se = Nw;
          }
          else (J = V.nodeName) && J.toLowerCase() === "input" && (V.type === "checkbox" || V.type === "radio") && (ie = jw);
          if (ie && (ie = ie(t, F))) {
            qf(U, ie, s, z);
            break e;
          }
          se && se(t, V, F), t === "focusout" && (se = V._wrapperState) && se.controlled && V.type === "number" && Ya(V, "number", V.value);
        }
        switch (se = F ? Dr(F) : window, t) {
          case "focusin":
            (Jf(se) || se.contentEditable === "true") && (Er = se, Tl = F, jo = null);
            break;
          case "focusout":
            jo = Tl = Er = null;
            break;
          case "mousedown":
            kl = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            kl = !1, lp(U, s, z);
            break;
          case "selectionchange":
            if (Lw) break;
          case "keydown":
          case "keyup":
            lp(U, s, z);
        }
        var ae;
        if (Sl) e: {
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
        else Pr ? Xf(t, s) && (ue = "onCompositionEnd") : t === "keydown" && s.keyCode === 229 && (ue = "onCompositionStart");
        ue && (Kf && s.locale !== "ko" && (Pr || ue !== "onCompositionStart" ? ue === "onCompositionEnd" && Pr && (ae = Uf()) : (_n = z, pl = "value" in _n ? _n.value : _n.textContent, Pr = !0)), se = Yi(F, ue), 0 < se.length && (ue = new Wf(ue, t, null, s, z), U.push({ event: ue, listeners: se }), ae ? ue.data = ae : (ae = Zf(s), ae !== null && (ue.data = ae)))), (ae = Cw ? bw(t, s) : Pw(t, s)) && (F = Yi(F, "onBeforeInput"), 0 < F.length && (z = new Wf("onBeforeInput", "beforeinput", null, s, z), U.push({ event: z, listeners: F }), z.data = ae));
      }
      gp(U, r);
    });
  }
  function Oo(t, r, s) {
    return { instance: t, listener: r, currentTarget: s };
  }
  function Yi(t, r) {
    for (var s = r + "Capture", u = []; t !== null; ) {
      var h = t, g = h.stateNode;
      h.tag === 5 && g !== null && (h = g, g = vo(t, s), g != null && u.unshift(Oo(t, g, h)), g = vo(t, r), g != null && u.push(Oo(t, g, h))), t = t.return;
    }
    return u;
  }
  function Rr(t) {
    if (t === null) return null;
    do
      t = t.return;
    while (t && t.tag !== 5);
    return t || null;
  }
  function Sp(t, r, s, u, h) {
    for (var g = r._reactName, T = []; s !== null && s !== u; ) {
      var P = s, M = P.alternate, F = P.stateNode;
      if (M !== null && M === u) break;
      P.tag === 5 && F !== null && (P = F, h ? (M = vo(s, g), M != null && T.unshift(Oo(s, M, P))) : h || (M = vo(s, g), M != null && T.push(Oo(s, M, P)))), s = s.return;
    }
    T.length !== 0 && t.push({ event: r, listeners: T });
  }
  var Uw = /\r\n?/g, $w = /\u0000|\uFFFD/g;
  function wp(t) {
    return (typeof t == "string" ? t : "" + t).replace(Uw, `
`).replace($w, "");
  }
  function Qi(t, r, s) {
    if (r = wp(r), wp(t) !== r && s) throw Error(o(425));
  }
  function Xi() {
  }
  var Ml = null, Rl = null;
  function Nl(t, r) {
    return t === "textarea" || t === "noscript" || typeof r.children == "string" || typeof r.children == "number" || typeof r.dangerouslySetInnerHTML == "object" && r.dangerouslySetInnerHTML !== null && r.dangerouslySetInnerHTML.__html != null;
  }
  var Dl = typeof setTimeout == "function" ? setTimeout : void 0, Hw = typeof clearTimeout == "function" ? clearTimeout : void 0, xp = typeof Promise == "function" ? Promise : void 0, Ww = typeof queueMicrotask == "function" ? queueMicrotask : typeof xp < "u" ? function(t) {
    return xp.resolve(null).then(t).catch(Gw);
  } : Dl;
  function Gw(t) {
    setTimeout(function() {
      throw t;
    });
  }
  function jl(t, r) {
    var s = r, u = 0;
    do {
      var h = s.nextSibling;
      if (t.removeChild(s), h && h.nodeType === 8) if (s = h.data, s === "/$") {
        if (u === 0) {
          t.removeChild(h), bo(r);
          return;
        }
        u--;
      } else s !== "$" && s !== "$?" && s !== "$!" || u++;
      s = h;
    } while (s);
    bo(r);
  }
  function kn(t) {
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
  function _p(t) {
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
  var Nr = Math.random().toString(36).slice(2), Yt = "__reactFiber$" + Nr, Lo = "__reactProps$" + Nr, sn = "__reactContainer$" + Nr, Il = "__reactEvents$" + Nr, Kw = "__reactListeners$" + Nr, Yw = "__reactHandles$" + Nr;
  function Zn(t) {
    var r = t[Yt];
    if (r) return r;
    for (var s = t.parentNode; s; ) {
      if (r = s[sn] || s[Yt]) {
        if (s = r.alternate, r.child !== null || s !== null && s.child !== null) for (t = _p(t); t !== null; ) {
          if (s = t[Yt]) return s;
          t = _p(t);
        }
        return r;
      }
      t = s, s = t.parentNode;
    }
    return null;
  }
  function Vo(t) {
    return t = t[Yt] || t[sn], !t || t.tag !== 5 && t.tag !== 6 && t.tag !== 13 && t.tag !== 3 ? null : t;
  }
  function Dr(t) {
    if (t.tag === 5 || t.tag === 6) return t.stateNode;
    throw Error(o(33));
  }
  function Zi(t) {
    return t[Lo] || null;
  }
  var Fl = [], jr = -1;
  function An(t) {
    return { current: t };
  }
  function Re(t) {
    0 > jr || (t.current = Fl[jr], Fl[jr] = null, jr--);
  }
  function Pe(t, r) {
    jr++, Fl[jr] = t.current, t.current = r;
  }
  var Cn = {}, qe = An(Cn), ct = An(!1), Jn = Cn;
  function Ir(t, r) {
    var s = t.type.contextTypes;
    if (!s) return Cn;
    var u = t.stateNode;
    if (u && u.__reactInternalMemoizedUnmaskedChildContext === r) return u.__reactInternalMemoizedMaskedChildContext;
    var h = {}, g;
    for (g in s) h[g] = r[g];
    return u && (t = t.stateNode, t.__reactInternalMemoizedUnmaskedChildContext = r, t.__reactInternalMemoizedMaskedChildContext = h), h;
  }
  function dt(t) {
    return t = t.childContextTypes, t != null;
  }
  function Ji() {
    Re(ct), Re(qe);
  }
  function Tp(t, r, s) {
    if (qe.current !== Cn) throw Error(o(168));
    Pe(qe, r), Pe(ct, s);
  }
  function kp(t, r, s) {
    var u = t.stateNode;
    if (r = r.childContextTypes, typeof u.getChildContext != "function") return s;
    u = u.getChildContext();
    for (var h in u) if (!(h in r)) throw Error(o(108, be(t) || "Unknown", h));
    return X({}, s, u);
  }
  function qi(t) {
    return t = (t = t.stateNode) && t.__reactInternalMemoizedMergedChildContext || Cn, Jn = qe.current, Pe(qe, t), Pe(ct, ct.current), !0;
  }
  function Ap(t, r, s) {
    var u = t.stateNode;
    if (!u) throw Error(o(169));
    s ? (t = kp(t, r, Jn), u.__reactInternalMemoizedMergedChildContext = t, Re(ct), Re(qe), Pe(qe, t)) : Re(ct), Pe(ct, s);
  }
  var an = null, es = !1, Ol = !1;
  function Cp(t) {
    an === null ? an = [t] : an.push(t);
  }
  function Qw(t) {
    es = !0, Cp(t);
  }
  function bn() {
    if (!Ol && an !== null) {
      Ol = !0;
      var t = 0, r = _e;
      try {
        var s = an;
        for (_e = 1; t < s.length; t++) {
          var u = s[t];
          do
            u = u(!0);
          while (u !== null);
        }
        an = null, es = !1;
      } catch (h) {
        throw an !== null && (an = an.slice(t + 1)), Pf(il, bn), h;
      } finally {
        _e = r, Ol = !1;
      }
    }
    return null;
  }
  var Fr = [], Or = 0, ts = null, ns = 0, At = [], Ct = 0, qn = null, ln = 1, un = "";
  function er(t, r) {
    Fr[Or++] = ns, Fr[Or++] = ts, ts = t, ns = r;
  }
  function bp(t, r, s) {
    At[Ct++] = ln, At[Ct++] = un, At[Ct++] = qn, qn = t;
    var u = ln;
    t = un;
    var h = 32 - It(u) - 1;
    u &= ~(1 << h), s += 1;
    var g = 32 - It(r) + h;
    if (30 < g) {
      var T = h - h % 5;
      g = (u & (1 << T) - 1).toString(32), u >>= T, h -= T, ln = 1 << 32 - It(r) + h | s << h | u, un = g + t;
    } else ln = 1 << g | s << h | u, un = t;
  }
  function Ll(t) {
    t.return !== null && (er(t, 1), bp(t, 1, 0));
  }
  function Vl(t) {
    for (; t === ts; ) ts = Fr[--Or], Fr[Or] = null, ns = Fr[--Or], Fr[Or] = null;
    for (; t === qn; ) qn = At[--Ct], At[Ct] = null, un = At[--Ct], At[Ct] = null, ln = At[--Ct], At[Ct] = null;
  }
  var xt = null, _t = null, De = !1, Ot = null;
  function Pp(t, r) {
    var s = Mt(5, null, null, 0);
    s.elementType = "DELETED", s.stateNode = r, s.return = t, r = t.deletions, r === null ? (t.deletions = [s], t.flags |= 16) : r.push(s);
  }
  function Ep(t, r) {
    switch (t.tag) {
      case 5:
        var s = t.type;
        return r = r.nodeType !== 1 || s.toLowerCase() !== r.nodeName.toLowerCase() ? null : r, r !== null ? (t.stateNode = r, xt = t, _t = kn(r.firstChild), !0) : !1;
      case 6:
        return r = t.pendingProps === "" || r.nodeType !== 3 ? null : r, r !== null ? (t.stateNode = r, xt = t, _t = null, !0) : !1;
      case 13:
        return r = r.nodeType !== 8 ? null : r, r !== null ? (s = qn !== null ? { id: ln, overflow: un } : null, t.memoizedState = { dehydrated: r, treeContext: s, retryLane: 1073741824 }, s = Mt(18, null, null, 0), s.stateNode = r, s.return = t, t.child = s, xt = t, _t = null, !0) : !1;
      default:
        return !1;
    }
  }
  function zl(t) {
    return (t.mode & 1) !== 0 && (t.flags & 128) === 0;
  }
  function Bl(t) {
    if (De) {
      var r = _t;
      if (r) {
        var s = r;
        if (!Ep(t, r)) {
          if (zl(t)) throw Error(o(418));
          r = kn(s.nextSibling);
          var u = xt;
          r && Ep(t, r) ? Pp(u, s) : (t.flags = t.flags & -4097 | 2, De = !1, xt = t);
        }
      } else {
        if (zl(t)) throw Error(o(418));
        t.flags = t.flags & -4097 | 2, De = !1, xt = t;
      }
    }
  }
  function Mp(t) {
    for (t = t.return; t !== null && t.tag !== 5 && t.tag !== 3 && t.tag !== 13; ) t = t.return;
    xt = t;
  }
  function rs(t) {
    if (t !== xt) return !1;
    if (!De) return Mp(t), De = !0, !1;
    var r;
    if ((r = t.tag !== 3) && !(r = t.tag !== 5) && (r = t.type, r = r !== "head" && r !== "body" && !Nl(t.type, t.memoizedProps)), r && (r = _t)) {
      if (zl(t)) throw Rp(), Error(o(418));
      for (; r; ) Pp(t, r), r = kn(r.nextSibling);
    }
    if (Mp(t), t.tag === 13) {
      if (t = t.memoizedState, t = t !== null ? t.dehydrated : null, !t) throw Error(o(317));
      e: {
        for (t = t.nextSibling, r = 0; t; ) {
          if (t.nodeType === 8) {
            var s = t.data;
            if (s === "/$") {
              if (r === 0) {
                _t = kn(t.nextSibling);
                break e;
              }
              r--;
            } else s !== "$" && s !== "$!" && s !== "$?" || r++;
          }
          t = t.nextSibling;
        }
        _t = null;
      }
    } else _t = xt ? kn(t.stateNode.nextSibling) : null;
    return !0;
  }
  function Rp() {
    for (var t = _t; t; ) t = kn(t.nextSibling);
  }
  function Lr() {
    _t = xt = null, De = !1;
  }
  function Ul(t) {
    Ot === null ? Ot = [t] : Ot.push(t);
  }
  var Xw = D.ReactCurrentBatchConfig;
  function zo(t, r, s) {
    if (t = s.ref, t !== null && typeof t != "function" && typeof t != "object") {
      if (s._owner) {
        if (s = s._owner, s) {
          if (s.tag !== 1) throw Error(o(309));
          var u = s.stateNode;
        }
        if (!u) throw Error(o(147, t));
        var h = u, g = "" + t;
        return r !== null && r.ref !== null && typeof r.ref == "function" && r.ref._stringRef === g ? r.ref : (r = function(T) {
          var P = h.refs;
          T === null ? delete P[g] : P[g] = T;
        }, r._stringRef = g, r);
      }
      if (typeof t != "string") throw Error(o(284));
      if (!s._owner) throw Error(o(290, t));
    }
    return t;
  }
  function os(t, r) {
    throw t = Object.prototype.toString.call(r), Error(o(31, t === "[object Object]" ? "object with keys {" + Object.keys(r).join(", ") + "}" : t));
  }
  function Np(t) {
    var r = t._init;
    return r(t._payload);
  }
  function Dp(t) {
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
      return j = In(j, R), j.index = 0, j.sibling = null, j;
    }
    function g(j, R, I) {
      return j.index = I, t ? (I = j.alternate, I !== null ? (I = I.index, I < R ? (j.flags |= 2, R) : I) : (j.flags |= 2, R)) : (j.flags |= 1048576, R);
    }
    function T(j) {
      return t && j.alternate === null && (j.flags |= 2), j;
    }
    function P(j, R, I, H) {
      return R === null || R.tag !== 6 ? (R = Du(I, j.mode, H), R.return = j, R) : (R = h(R, I), R.return = j, R);
    }
    function M(j, R, I, H) {
      var ie = I.type;
      return ie === W ? z(j, R, I.props.children, H, I.key) : R !== null && (R.elementType === ie || typeof ie == "object" && ie !== null && ie.$$typeof === Q && Np(ie) === R.type) ? (H = h(R, I.props), H.ref = zo(j, R, I), H.return = j, H) : (H = Ps(I.type, I.key, I.props, null, j.mode, H), H.ref = zo(j, R, I), H.return = j, H);
    }
    function F(j, R, I, H) {
      return R === null || R.tag !== 4 || R.stateNode.containerInfo !== I.containerInfo || R.stateNode.implementation !== I.implementation ? (R = ju(I, j.mode, H), R.return = j, R) : (R = h(R, I.children || []), R.return = j, R);
    }
    function z(j, R, I, H, ie) {
      return R === null || R.tag !== 7 ? (R = lr(I, j.mode, H, ie), R.return = j, R) : (R = h(R, I), R.return = j, R);
    }
    function U(j, R, I) {
      if (typeof R == "string" && R !== "" || typeof R == "number") return R = Du("" + R, j.mode, I), R.return = j, R;
      if (typeof R == "object" && R !== null) {
        switch (R.$$typeof) {
          case O:
            return I = Ps(R.type, R.key, R.props, null, j.mode, I), I.ref = zo(j, null, R), I.return = j, I;
          case K:
            return R = ju(R, j.mode, I), R.return = j, R;
          case Q:
            var H = R._init;
            return U(j, H(R._payload), I);
        }
        if (ho(R) || ee(R)) return R = lr(R, j.mode, I, null), R.return = j, R;
        os(j, R);
      }
      return null;
    }
    function V(j, R, I, H) {
      var ie = R !== null ? R.key : null;
      if (typeof I == "string" && I !== "" || typeof I == "number") return ie !== null ? null : P(j, R, "" + I, H);
      if (typeof I == "object" && I !== null) {
        switch (I.$$typeof) {
          case O:
            return I.key === ie ? M(j, R, I, H) : null;
          case K:
            return I.key === ie ? F(j, R, I, H) : null;
          case Q:
            return ie = I._init, V(
              j,
              R,
              ie(I._payload),
              H
            );
        }
        if (ho(I) || ee(I)) return ie !== null ? null : z(j, R, I, H, null);
        os(j, I);
      }
      return null;
    }
    function J(j, R, I, H, ie) {
      if (typeof H == "string" && H !== "" || typeof H == "number") return j = j.get(I) || null, P(R, j, "" + H, ie);
      if (typeof H == "object" && H !== null) {
        switch (H.$$typeof) {
          case O:
            return j = j.get(H.key === null ? I : H.key) || null, M(R, j, H, ie);
          case K:
            return j = j.get(H.key === null ? I : H.key) || null, F(R, j, H, ie);
          case Q:
            var se = H._init;
            return J(j, R, I, se(H._payload), ie);
        }
        if (ho(H) || ee(H)) return j = j.get(I) || null, z(R, j, H, ie, null);
        os(R, H);
      }
      return null;
    }
    function ne(j, R, I, H) {
      for (var ie = null, se = null, ae = R, ue = R = 0, Ke = null; ae !== null && ue < I.length; ue++) {
        ae.index > ue ? (Ke = ae, ae = null) : Ke = ae.sibling;
        var Se = V(j, ae, I[ue], H);
        if (Se === null) {
          ae === null && (ae = Ke);
          break;
        }
        t && ae && Se.alternate === null && r(j, ae), R = g(Se, R, ue), se === null ? ie = Se : se.sibling = Se, se = Se, ae = Ke;
      }
      if (ue === I.length) return s(j, ae), De && er(j, ue), ie;
      if (ae === null) {
        for (; ue < I.length; ue++) ae = U(j, I[ue], H), ae !== null && (R = g(ae, R, ue), se === null ? ie = ae : se.sibling = ae, se = ae);
        return De && er(j, ue), ie;
      }
      for (ae = u(j, ae); ue < I.length; ue++) Ke = J(ae, j, ue, I[ue], H), Ke !== null && (t && Ke.alternate !== null && ae.delete(Ke.key === null ? ue : Ke.key), R = g(Ke, R, ue), se === null ? ie = Ke : se.sibling = Ke, se = Ke);
      return t && ae.forEach(function(Fn) {
        return r(j, Fn);
      }), De && er(j, ue), ie;
    }
    function oe(j, R, I, H) {
      var ie = ee(I);
      if (typeof ie != "function") throw Error(o(150));
      if (I = ie.call(I), I == null) throw Error(o(151));
      for (var se = ie = null, ae = R, ue = R = 0, Ke = null, Se = I.next(); ae !== null && !Se.done; ue++, Se = I.next()) {
        ae.index > ue ? (Ke = ae, ae = null) : Ke = ae.sibling;
        var Fn = V(j, ae, Se.value, H);
        if (Fn === null) {
          ae === null && (ae = Ke);
          break;
        }
        t && ae && Fn.alternate === null && r(j, ae), R = g(Fn, R, ue), se === null ? ie = Fn : se.sibling = Fn, se = Fn, ae = Ke;
      }
      if (Se.done) return s(
        j,
        ae
      ), De && er(j, ue), ie;
      if (ae === null) {
        for (; !Se.done; ue++, Se = I.next()) Se = U(j, Se.value, H), Se !== null && (R = g(Se, R, ue), se === null ? ie = Se : se.sibling = Se, se = Se);
        return De && er(j, ue), ie;
      }
      for (ae = u(j, ae); !Se.done; ue++, Se = I.next()) Se = J(ae, j, ue, Se.value, H), Se !== null && (t && Se.alternate !== null && ae.delete(Se.key === null ? ue : Se.key), R = g(Se, R, ue), se === null ? ie = Se : se.sibling = Se, se = Se);
      return t && ae.forEach(function(Ex) {
        return r(j, Ex);
      }), De && er(j, ue), ie;
    }
    function Ve(j, R, I, H) {
      if (typeof I == "object" && I !== null && I.type === W && I.key === null && (I = I.props.children), typeof I == "object" && I !== null) {
        switch (I.$$typeof) {
          case O:
            e: {
              for (var ie = I.key, se = R; se !== null; ) {
                if (se.key === ie) {
                  if (ie = I.type, ie === W) {
                    if (se.tag === 7) {
                      s(j, se.sibling), R = h(se, I.props.children), R.return = j, j = R;
                      break e;
                    }
                  } else if (se.elementType === ie || typeof ie == "object" && ie !== null && ie.$$typeof === Q && Np(ie) === se.type) {
                    s(j, se.sibling), R = h(se, I.props), R.ref = zo(j, se, I), R.return = j, j = R;
                    break e;
                  }
                  s(j, se);
                  break;
                } else r(j, se);
                se = se.sibling;
              }
              I.type === W ? (R = lr(I.props.children, j.mode, H, I.key), R.return = j, j = R) : (H = Ps(I.type, I.key, I.props, null, j.mode, H), H.ref = zo(j, R, I), H.return = j, j = H);
            }
            return T(j);
          case K:
            e: {
              for (se = I.key; R !== null; ) {
                if (R.key === se) if (R.tag === 4 && R.stateNode.containerInfo === I.containerInfo && R.stateNode.implementation === I.implementation) {
                  s(j, R.sibling), R = h(R, I.children || []), R.return = j, j = R;
                  break e;
                } else {
                  s(j, R);
                  break;
                }
                else r(j, R);
                R = R.sibling;
              }
              R = ju(I, j.mode, H), R.return = j, j = R;
            }
            return T(j);
          case Q:
            return se = I._init, Ve(j, R, se(I._payload), H);
        }
        if (ho(I)) return ne(j, R, I, H);
        if (ee(I)) return oe(j, R, I, H);
        os(j, I);
      }
      return typeof I == "string" && I !== "" || typeof I == "number" ? (I = "" + I, R !== null && R.tag === 6 ? (s(j, R.sibling), R = h(R, I), R.return = j, j = R) : (s(j, R), R = Du(I, j.mode, H), R.return = j, j = R), T(j)) : s(j, R);
    }
    return Ve;
  }
  var Vr = Dp(!0), jp = Dp(!1), is = An(null), ss = null, zr = null, $l = null;
  function Hl() {
    $l = zr = ss = null;
  }
  function Wl(t) {
    var r = is.current;
    Re(is), t._currentValue = r;
  }
  function Gl(t, r, s) {
    for (; t !== null; ) {
      var u = t.alternate;
      if ((t.childLanes & r) !== r ? (t.childLanes |= r, u !== null && (u.childLanes |= r)) : u !== null && (u.childLanes & r) !== r && (u.childLanes |= r), t === s) break;
      t = t.return;
    }
  }
  function Br(t, r) {
    ss = t, $l = zr = null, t = t.dependencies, t !== null && t.firstContext !== null && ((t.lanes & r) !== 0 && (ft = !0), t.firstContext = null);
  }
  function bt(t) {
    var r = t._currentValue;
    if ($l !== t) if (t = { context: t, memoizedValue: r, next: null }, zr === null) {
      if (ss === null) throw Error(o(308));
      zr = t, ss.dependencies = { lanes: 0, firstContext: t };
    } else zr = zr.next = t;
    return r;
  }
  var tr = null;
  function Kl(t) {
    tr === null ? tr = [t] : tr.push(t);
  }
  function Ip(t, r, s, u) {
    var h = r.interleaved;
    return h === null ? (s.next = s, Kl(r)) : (s.next = h.next, h.next = s), r.interleaved = s, cn(t, u);
  }
  function cn(t, r) {
    t.lanes |= r;
    var s = t.alternate;
    for (s !== null && (s.lanes |= r), s = t, t = t.return; t !== null; ) t.childLanes |= r, s = t.alternate, s !== null && (s.childLanes |= r), s = t, t = t.return;
    return s.tag === 3 ? s.stateNode : null;
  }
  var Pn = !1;
  function Yl(t) {
    t.updateQueue = { baseState: t.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
  }
  function Fp(t, r) {
    t = t.updateQueue, r.updateQueue === t && (r.updateQueue = { baseState: t.baseState, firstBaseUpdate: t.firstBaseUpdate, lastBaseUpdate: t.lastBaseUpdate, shared: t.shared, effects: t.effects });
  }
  function dn(t, r) {
    return { eventTime: t, lane: r, tag: 0, payload: null, callback: null, next: null };
  }
  function En(t, r, s) {
    var u = t.updateQueue;
    if (u === null) return null;
    if (u = u.shared, (ye & 2) !== 0) {
      var h = u.pending;
      return h === null ? r.next = r : (r.next = h.next, h.next = r), u.pending = r, cn(t, s);
    }
    return h = u.interleaved, h === null ? (r.next = r, Kl(u)) : (r.next = h.next, h.next = r), u.interleaved = r, cn(t, s);
  }
  function as(t, r, s) {
    if (r = r.updateQueue, r !== null && (r = r.shared, (s & 4194240) !== 0)) {
      var u = r.lanes;
      u &= t.pendingLanes, s |= u, r.lanes = s, ll(t, s);
    }
  }
  function Op(t, r) {
    var s = t.updateQueue, u = t.alternate;
    if (u !== null && (u = u.updateQueue, s === u)) {
      var h = null, g = null;
      if (s = s.firstBaseUpdate, s !== null) {
        do {
          var T = { eventTime: s.eventTime, lane: s.lane, tag: s.tag, payload: s.payload, callback: s.callback, next: null };
          g === null ? h = g = T : g = g.next = T, s = s.next;
        } while (s !== null);
        g === null ? h = g = r : g = g.next = r;
      } else h = g = r;
      s = { baseState: u.baseState, firstBaseUpdate: h, lastBaseUpdate: g, shared: u.shared, effects: u.effects }, t.updateQueue = s;
      return;
    }
    t = s.lastBaseUpdate, t === null ? s.firstBaseUpdate = r : t.next = r, s.lastBaseUpdate = r;
  }
  function ls(t, r, s, u) {
    var h = t.updateQueue;
    Pn = !1;
    var g = h.firstBaseUpdate, T = h.lastBaseUpdate, P = h.shared.pending;
    if (P !== null) {
      h.shared.pending = null;
      var M = P, F = M.next;
      M.next = null, T === null ? g = F : T.next = F, T = M;
      var z = t.alternate;
      z !== null && (z = z.updateQueue, P = z.lastBaseUpdate, P !== T && (P === null ? z.firstBaseUpdate = F : P.next = F, z.lastBaseUpdate = M));
    }
    if (g !== null) {
      var U = h.baseState;
      T = 0, z = F = M = null, P = g;
      do {
        var V = P.lane, J = P.eventTime;
        if ((u & V) === V) {
          z !== null && (z = z.next = {
            eventTime: J,
            lane: 0,
            tag: P.tag,
            payload: P.payload,
            callback: P.callback,
            next: null
          });
          e: {
            var ne = t, oe = P;
            switch (V = r, J = s, oe.tag) {
              case 1:
                if (ne = oe.payload, typeof ne == "function") {
                  U = ne.call(J, U, V);
                  break e;
                }
                U = ne;
                break e;
              case 3:
                ne.flags = ne.flags & -65537 | 128;
              case 0:
                if (ne = oe.payload, V = typeof ne == "function" ? ne.call(J, U, V) : ne, V == null) break e;
                U = X({}, U, V);
                break e;
              case 2:
                Pn = !0;
            }
          }
          P.callback !== null && P.lane !== 0 && (t.flags |= 64, V = h.effects, V === null ? h.effects = [P] : V.push(P));
        } else J = { eventTime: J, lane: V, tag: P.tag, payload: P.payload, callback: P.callback, next: null }, z === null ? (F = z = J, M = U) : z = z.next = J, T |= V;
        if (P = P.next, P === null) {
          if (P = h.shared.pending, P === null) break;
          V = P, P = V.next, V.next = null, h.lastBaseUpdate = V, h.shared.pending = null;
        }
      } while (!0);
      if (z === null && (M = U), h.baseState = M, h.firstBaseUpdate = F, h.lastBaseUpdate = z, r = h.shared.interleaved, r !== null) {
        h = r;
        do
          T |= h.lane, h = h.next;
        while (h !== r);
      } else g === null && (h.shared.lanes = 0);
      or |= T, t.lanes = T, t.memoizedState = U;
    }
  }
  function Lp(t, r, s) {
    if (t = r.effects, r.effects = null, t !== null) for (r = 0; r < t.length; r++) {
      var u = t[r], h = u.callback;
      if (h !== null) {
        if (u.callback = null, u = s, typeof h != "function") throw Error(o(191, h));
        h.call(u);
      }
    }
  }
  var Bo = {}, Qt = An(Bo), Uo = An(Bo), $o = An(Bo);
  function nr(t) {
    if (t === Bo) throw Error(o(174));
    return t;
  }
  function Ql(t, r) {
    switch (Pe($o, r), Pe(Uo, t), Pe(Qt, Bo), t = r.nodeType, t) {
      case 9:
      case 11:
        r = (r = r.documentElement) ? r.namespaceURI : Xa(null, "");
        break;
      default:
        t = t === 8 ? r.parentNode : r, r = t.namespaceURI || null, t = t.tagName, r = Xa(r, t);
    }
    Re(Qt), Pe(Qt, r);
  }
  function Ur() {
    Re(Qt), Re(Uo), Re($o);
  }
  function Vp(t) {
    nr($o.current);
    var r = nr(Qt.current), s = Xa(r, t.type);
    r !== s && (Pe(Uo, t), Pe(Qt, s));
  }
  function Xl(t) {
    Uo.current === t && (Re(Qt), Re(Uo));
  }
  var je = An(0);
  function us(t) {
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
  var Zl = [];
  function Jl() {
    for (var t = 0; t < Zl.length; t++) Zl[t]._workInProgressVersionPrimary = null;
    Zl.length = 0;
  }
  var cs = D.ReactCurrentDispatcher, ql = D.ReactCurrentBatchConfig, rr = 0, Ie = null, Ue = null, We = null, ds = !1, Ho = !1, Wo = 0, Zw = 0;
  function et() {
    throw Error(o(321));
  }
  function eu(t, r) {
    if (r === null) return !1;
    for (var s = 0; s < r.length && s < t.length; s++) if (!Ft(t[s], r[s])) return !1;
    return !0;
  }
  function tu(t, r, s, u, h, g) {
    if (rr = g, Ie = r, r.memoizedState = null, r.updateQueue = null, r.lanes = 0, cs.current = t === null || t.memoizedState === null ? tx : nx, t = s(u, h), Ho) {
      g = 0;
      do {
        if (Ho = !1, Wo = 0, 25 <= g) throw Error(o(301));
        g += 1, We = Ue = null, r.updateQueue = null, cs.current = rx, t = s(u, h);
      } while (Ho);
    }
    if (cs.current = ms, r = Ue !== null && Ue.next !== null, rr = 0, We = Ue = Ie = null, ds = !1, r) throw Error(o(300));
    return t;
  }
  function nu() {
    var t = Wo !== 0;
    return Wo = 0, t;
  }
  function Xt() {
    var t = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
    return We === null ? Ie.memoizedState = We = t : We = We.next = t, We;
  }
  function Pt() {
    if (Ue === null) {
      var t = Ie.alternate;
      t = t !== null ? t.memoizedState : null;
    } else t = Ue.next;
    var r = We === null ? Ie.memoizedState : We.next;
    if (r !== null) We = r, Ue = t;
    else {
      if (t === null) throw Error(o(310));
      Ue = t, t = { memoizedState: Ue.memoizedState, baseState: Ue.baseState, baseQueue: Ue.baseQueue, queue: Ue.queue, next: null }, We === null ? Ie.memoizedState = We = t : We = We.next = t;
    }
    return We;
  }
  function Go(t, r) {
    return typeof r == "function" ? r(t) : r;
  }
  function ru(t) {
    var r = Pt(), s = r.queue;
    if (s === null) throw Error(o(311));
    s.lastRenderedReducer = t;
    var u = Ue, h = u.baseQueue, g = s.pending;
    if (g !== null) {
      if (h !== null) {
        var T = h.next;
        h.next = g.next, g.next = T;
      }
      u.baseQueue = h = g, s.pending = null;
    }
    if (h !== null) {
      g = h.next, u = u.baseState;
      var P = T = null, M = null, F = g;
      do {
        var z = F.lane;
        if ((rr & z) === z) M !== null && (M = M.next = { lane: 0, action: F.action, hasEagerState: F.hasEagerState, eagerState: F.eagerState, next: null }), u = F.hasEagerState ? F.eagerState : t(u, F.action);
        else {
          var U = {
            lane: z,
            action: F.action,
            hasEagerState: F.hasEagerState,
            eagerState: F.eagerState,
            next: null
          };
          M === null ? (P = M = U, T = u) : M = M.next = U, Ie.lanes |= z, or |= z;
        }
        F = F.next;
      } while (F !== null && F !== g);
      M === null ? T = u : M.next = P, Ft(u, r.memoizedState) || (ft = !0), r.memoizedState = u, r.baseState = T, r.baseQueue = M, s.lastRenderedState = u;
    }
    if (t = s.interleaved, t !== null) {
      h = t;
      do
        g = h.lane, Ie.lanes |= g, or |= g, h = h.next;
      while (h !== t);
    } else h === null && (s.lanes = 0);
    return [r.memoizedState, s.dispatch];
  }
  function ou(t) {
    var r = Pt(), s = r.queue;
    if (s === null) throw Error(o(311));
    s.lastRenderedReducer = t;
    var u = s.dispatch, h = s.pending, g = r.memoizedState;
    if (h !== null) {
      s.pending = null;
      var T = h = h.next;
      do
        g = t(g, T.action), T = T.next;
      while (T !== h);
      Ft(g, r.memoizedState) || (ft = !0), r.memoizedState = g, r.baseQueue === null && (r.baseState = g), s.lastRenderedState = g;
    }
    return [g, u];
  }
  function zp() {
  }
  function Bp(t, r) {
    var s = Ie, u = Pt(), h = r(), g = !Ft(u.memoizedState, h);
    if (g && (u.memoizedState = h, ft = !0), u = u.queue, iu(Hp.bind(null, s, u, t), [t]), u.getSnapshot !== r || g || We !== null && We.memoizedState.tag & 1) {
      if (s.flags |= 2048, Ko(9, $p.bind(null, s, u, h, r), void 0, null), Ge === null) throw Error(o(349));
      (rr & 30) !== 0 || Up(s, r, h);
    }
    return h;
  }
  function Up(t, r, s) {
    t.flags |= 16384, t = { getSnapshot: r, value: s }, r = Ie.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, Ie.updateQueue = r, r.stores = [t]) : (s = r.stores, s === null ? r.stores = [t] : s.push(t));
  }
  function $p(t, r, s, u) {
    r.value = s, r.getSnapshot = u, Wp(r) && Gp(t);
  }
  function Hp(t, r, s) {
    return s(function() {
      Wp(r) && Gp(t);
    });
  }
  function Wp(t) {
    var r = t.getSnapshot;
    t = t.value;
    try {
      var s = r();
      return !Ft(t, s);
    } catch {
      return !0;
    }
  }
  function Gp(t) {
    var r = cn(t, 1);
    r !== null && Bt(r, t, 1, -1);
  }
  function Kp(t) {
    var r = Xt();
    return typeof t == "function" && (t = t()), r.memoizedState = r.baseState = t, t = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: Go, lastRenderedState: t }, r.queue = t, t = t.dispatch = ex.bind(null, Ie, t), [r.memoizedState, t];
  }
  function Ko(t, r, s, u) {
    return t = { tag: t, create: r, destroy: s, deps: u, next: null }, r = Ie.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, Ie.updateQueue = r, r.lastEffect = t.next = t) : (s = r.lastEffect, s === null ? r.lastEffect = t.next = t : (u = s.next, s.next = t, t.next = u, r.lastEffect = t)), t;
  }
  function Yp() {
    return Pt().memoizedState;
  }
  function fs(t, r, s, u) {
    var h = Xt();
    Ie.flags |= t, h.memoizedState = Ko(1 | r, s, void 0, u === void 0 ? null : u);
  }
  function ps(t, r, s, u) {
    var h = Pt();
    u = u === void 0 ? null : u;
    var g = void 0;
    if (Ue !== null) {
      var T = Ue.memoizedState;
      if (g = T.destroy, u !== null && eu(u, T.deps)) {
        h.memoizedState = Ko(r, s, g, u);
        return;
      }
    }
    Ie.flags |= t, h.memoizedState = Ko(1 | r, s, g, u);
  }
  function Qp(t, r) {
    return fs(8390656, 8, t, r);
  }
  function iu(t, r) {
    return ps(2048, 8, t, r);
  }
  function Xp(t, r) {
    return ps(4, 2, t, r);
  }
  function Zp(t, r) {
    return ps(4, 4, t, r);
  }
  function Jp(t, r) {
    if (typeof r == "function") return t = t(), r(t), function() {
      r(null);
    };
    if (r != null) return t = t(), r.current = t, function() {
      r.current = null;
    };
  }
  function qp(t, r, s) {
    return s = s != null ? s.concat([t]) : null, ps(4, 4, Jp.bind(null, r, t), s);
  }
  function su() {
  }
  function em(t, r) {
    var s = Pt();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && eu(r, u[1]) ? u[0] : (s.memoizedState = [t, r], t);
  }
  function tm(t, r) {
    var s = Pt();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && eu(r, u[1]) ? u[0] : (t = t(), s.memoizedState = [t, r], t);
  }
  function nm(t, r, s) {
    return (rr & 21) === 0 ? (t.baseState && (t.baseState = !1, ft = !0), t.memoizedState = s) : (Ft(s, r) || (s = Nf(), Ie.lanes |= s, or |= s, t.baseState = !0), r);
  }
  function Jw(t, r) {
    var s = _e;
    _e = s !== 0 && 4 > s ? s : 4, t(!0);
    var u = ql.transition;
    ql.transition = {};
    try {
      t(!1), r();
    } finally {
      _e = s, ql.transition = u;
    }
  }
  function rm() {
    return Pt().memoizedState;
  }
  function qw(t, r, s) {
    var u = Dn(t);
    if (s = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null }, om(t)) im(r, s);
    else if (s = Ip(t, r, s, u), s !== null) {
      var h = it();
      Bt(s, t, u, h), sm(s, r, u);
    }
  }
  function ex(t, r, s) {
    var u = Dn(t), h = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null };
    if (om(t)) im(r, h);
    else {
      var g = t.alternate;
      if (t.lanes === 0 && (g === null || g.lanes === 0) && (g = r.lastRenderedReducer, g !== null)) try {
        var T = r.lastRenderedState, P = g(T, s);
        if (h.hasEagerState = !0, h.eagerState = P, Ft(P, T)) {
          var M = r.interleaved;
          M === null ? (h.next = h, Kl(r)) : (h.next = M.next, M.next = h), r.interleaved = h;
          return;
        }
      } catch {
      } finally {
      }
      s = Ip(t, r, h, u), s !== null && (h = it(), Bt(s, t, u, h), sm(s, r, u));
    }
  }
  function om(t) {
    var r = t.alternate;
    return t === Ie || r !== null && r === Ie;
  }
  function im(t, r) {
    Ho = ds = !0;
    var s = t.pending;
    s === null ? r.next = r : (r.next = s.next, s.next = r), t.pending = r;
  }
  function sm(t, r, s) {
    if ((s & 4194240) !== 0) {
      var u = r.lanes;
      u &= t.pendingLanes, s |= u, r.lanes = s, ll(t, s);
    }
  }
  var ms = { readContext: bt, useCallback: et, useContext: et, useEffect: et, useImperativeHandle: et, useInsertionEffect: et, useLayoutEffect: et, useMemo: et, useReducer: et, useRef: et, useState: et, useDebugValue: et, useDeferredValue: et, useTransition: et, useMutableSource: et, useSyncExternalStore: et, useId: et, unstable_isNewReconciler: !1 }, tx = { readContext: bt, useCallback: function(t, r) {
    return Xt().memoizedState = [t, r === void 0 ? null : r], t;
  }, useContext: bt, useEffect: Qp, useImperativeHandle: function(t, r, s) {
    return s = s != null ? s.concat([t]) : null, fs(
      4194308,
      4,
      Jp.bind(null, r, t),
      s
    );
  }, useLayoutEffect: function(t, r) {
    return fs(4194308, 4, t, r);
  }, useInsertionEffect: function(t, r) {
    return fs(4, 2, t, r);
  }, useMemo: function(t, r) {
    var s = Xt();
    return r = r === void 0 ? null : r, t = t(), s.memoizedState = [t, r], t;
  }, useReducer: function(t, r, s) {
    var u = Xt();
    return r = s !== void 0 ? s(r) : r, u.memoizedState = u.baseState = r, t = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: t, lastRenderedState: r }, u.queue = t, t = t.dispatch = qw.bind(null, Ie, t), [u.memoizedState, t];
  }, useRef: function(t) {
    var r = Xt();
    return t = { current: t }, r.memoizedState = t;
  }, useState: Kp, useDebugValue: su, useDeferredValue: function(t) {
    return Xt().memoizedState = t;
  }, useTransition: function() {
    var t = Kp(!1), r = t[0];
    return t = Jw.bind(null, t[1]), Xt().memoizedState = t, [r, t];
  }, useMutableSource: function() {
  }, useSyncExternalStore: function(t, r, s) {
    var u = Ie, h = Xt();
    if (De) {
      if (s === void 0) throw Error(o(407));
      s = s();
    } else {
      if (s = r(), Ge === null) throw Error(o(349));
      (rr & 30) !== 0 || Up(u, r, s);
    }
    h.memoizedState = s;
    var g = { value: s, getSnapshot: r };
    return h.queue = g, Qp(Hp.bind(
      null,
      u,
      g,
      t
    ), [t]), u.flags |= 2048, Ko(9, $p.bind(null, u, g, s, r), void 0, null), s;
  }, useId: function() {
    var t = Xt(), r = Ge.identifierPrefix;
    if (De) {
      var s = un, u = ln;
      s = (u & ~(1 << 32 - It(u) - 1)).toString(32) + s, r = ":" + r + "R" + s, s = Wo++, 0 < s && (r += "H" + s.toString(32)), r += ":";
    } else s = Zw++, r = ":" + r + "r" + s.toString(32) + ":";
    return t.memoizedState = r;
  }, unstable_isNewReconciler: !1 }, nx = {
    readContext: bt,
    useCallback: em,
    useContext: bt,
    useEffect: iu,
    useImperativeHandle: qp,
    useInsertionEffect: Xp,
    useLayoutEffect: Zp,
    useMemo: tm,
    useReducer: ru,
    useRef: Yp,
    useState: function() {
      return ru(Go);
    },
    useDebugValue: su,
    useDeferredValue: function(t) {
      var r = Pt();
      return nm(r, Ue.memoizedState, t);
    },
    useTransition: function() {
      var t = ru(Go)[0], r = Pt().memoizedState;
      return [t, r];
    },
    useMutableSource: zp,
    useSyncExternalStore: Bp,
    useId: rm,
    unstable_isNewReconciler: !1
  }, rx = { readContext: bt, useCallback: em, useContext: bt, useEffect: iu, useImperativeHandle: qp, useInsertionEffect: Xp, useLayoutEffect: Zp, useMemo: tm, useReducer: ou, useRef: Yp, useState: function() {
    return ou(Go);
  }, useDebugValue: su, useDeferredValue: function(t) {
    var r = Pt();
    return Ue === null ? r.memoizedState = t : nm(r, Ue.memoizedState, t);
  }, useTransition: function() {
    var t = ou(Go)[0], r = Pt().memoizedState;
    return [t, r];
  }, useMutableSource: zp, useSyncExternalStore: Bp, useId: rm, unstable_isNewReconciler: !1 };
  function Lt(t, r) {
    if (t && t.defaultProps) {
      r = X({}, r), t = t.defaultProps;
      for (var s in t) r[s] === void 0 && (r[s] = t[s]);
      return r;
    }
    return r;
  }
  function au(t, r, s, u) {
    r = t.memoizedState, s = s(u, r), s = s == null ? r : X({}, r, s), t.memoizedState = s, t.lanes === 0 && (t.updateQueue.baseState = s);
  }
  var hs = { isMounted: function(t) {
    return (t = t._reactInternals) ? Xn(t) === t : !1;
  }, enqueueSetState: function(t, r, s) {
    t = t._reactInternals;
    var u = it(), h = Dn(t), g = dn(u, h);
    g.payload = r, s != null && (g.callback = s), r = En(t, g, h), r !== null && (Bt(r, t, h, u), as(r, t, h));
  }, enqueueReplaceState: function(t, r, s) {
    t = t._reactInternals;
    var u = it(), h = Dn(t), g = dn(u, h);
    g.tag = 1, g.payload = r, s != null && (g.callback = s), r = En(t, g, h), r !== null && (Bt(r, t, h, u), as(r, t, h));
  }, enqueueForceUpdate: function(t, r) {
    t = t._reactInternals;
    var s = it(), u = Dn(t), h = dn(s, u);
    h.tag = 2, r != null && (h.callback = r), r = En(t, h, u), r !== null && (Bt(r, t, u, s), as(r, t, u));
  } };
  function am(t, r, s, u, h, g, T) {
    return t = t.stateNode, typeof t.shouldComponentUpdate == "function" ? t.shouldComponentUpdate(u, g, T) : r.prototype && r.prototype.isPureReactComponent ? !Do(s, u) || !Do(h, g) : !0;
  }
  function lm(t, r, s) {
    var u = !1, h = Cn, g = r.contextType;
    return typeof g == "object" && g !== null ? g = bt(g) : (h = dt(r) ? Jn : qe.current, u = r.contextTypes, g = (u = u != null) ? Ir(t, h) : Cn), r = new r(s, g), t.memoizedState = r.state !== null && r.state !== void 0 ? r.state : null, r.updater = hs, t.stateNode = r, r._reactInternals = t, u && (t = t.stateNode, t.__reactInternalMemoizedUnmaskedChildContext = h, t.__reactInternalMemoizedMaskedChildContext = g), r;
  }
  function um(t, r, s, u) {
    t = r.state, typeof r.componentWillReceiveProps == "function" && r.componentWillReceiveProps(s, u), typeof r.UNSAFE_componentWillReceiveProps == "function" && r.UNSAFE_componentWillReceiveProps(s, u), r.state !== t && hs.enqueueReplaceState(r, r.state, null);
  }
  function lu(t, r, s, u) {
    var h = t.stateNode;
    h.props = s, h.state = t.memoizedState, h.refs = {}, Yl(t);
    var g = r.contextType;
    typeof g == "object" && g !== null ? h.context = bt(g) : (g = dt(r) ? Jn : qe.current, h.context = Ir(t, g)), h.state = t.memoizedState, g = r.getDerivedStateFromProps, typeof g == "function" && (au(t, r, g, s), h.state = t.memoizedState), typeof r.getDerivedStateFromProps == "function" || typeof h.getSnapshotBeforeUpdate == "function" || typeof h.UNSAFE_componentWillMount != "function" && typeof h.componentWillMount != "function" || (r = h.state, typeof h.componentWillMount == "function" && h.componentWillMount(), typeof h.UNSAFE_componentWillMount == "function" && h.UNSAFE_componentWillMount(), r !== h.state && hs.enqueueReplaceState(h, h.state, null), ls(t, s, h, u), h.state = t.memoizedState), typeof h.componentDidMount == "function" && (t.flags |= 4194308);
  }
  function $r(t, r) {
    try {
      var s = "", u = r;
      do
        s += ge(u), u = u.return;
      while (u);
      var h = s;
    } catch (g) {
      h = `
Error generating stack: ` + g.message + `
` + g.stack;
    }
    return { value: t, source: r, stack: h, digest: null };
  }
  function uu(t, r, s) {
    return { value: t, source: null, stack: s ?? null, digest: r ?? null };
  }
  function cu(t, r) {
    try {
      console.error(r.value);
    } catch (s) {
      setTimeout(function() {
        throw s;
      });
    }
  }
  var ox = typeof WeakMap == "function" ? WeakMap : Map;
  function cm(t, r, s) {
    s = dn(-1, s), s.tag = 3, s.payload = { element: null };
    var u = r.value;
    return s.callback = function() {
      _s || (_s = !0, Au = u), cu(t, r);
    }, s;
  }
  function dm(t, r, s) {
    s = dn(-1, s), s.tag = 3;
    var u = t.type.getDerivedStateFromError;
    if (typeof u == "function") {
      var h = r.value;
      s.payload = function() {
        return u(h);
      }, s.callback = function() {
        cu(t, r);
      };
    }
    var g = t.stateNode;
    return g !== null && typeof g.componentDidCatch == "function" && (s.callback = function() {
      cu(t, r), typeof u != "function" && (Rn === null ? Rn = /* @__PURE__ */ new Set([this]) : Rn.add(this));
      var T = r.stack;
      this.componentDidCatch(r.value, { componentStack: T !== null ? T : "" });
    }), s;
  }
  function fm(t, r, s) {
    var u = t.pingCache;
    if (u === null) {
      u = t.pingCache = new ox();
      var h = /* @__PURE__ */ new Set();
      u.set(r, h);
    } else h = u.get(r), h === void 0 && (h = /* @__PURE__ */ new Set(), u.set(r, h));
    h.has(s) || (h.add(s), t = vx.bind(null, t, r, s), r.then(t, t));
  }
  function pm(t) {
    do {
      var r;
      if ((r = t.tag === 13) && (r = t.memoizedState, r = r !== null ? r.dehydrated !== null : !0), r) return t;
      t = t.return;
    } while (t !== null);
    return null;
  }
  function mm(t, r, s, u, h) {
    return (t.mode & 1) === 0 ? (t === r ? t.flags |= 65536 : (t.flags |= 128, s.flags |= 131072, s.flags &= -52805, s.tag === 1 && (s.alternate === null ? s.tag = 17 : (r = dn(-1, 1), r.tag = 2, En(s, r, 1))), s.lanes |= 1), t) : (t.flags |= 65536, t.lanes = h, t);
  }
  var ix = D.ReactCurrentOwner, ft = !1;
  function ot(t, r, s, u) {
    r.child = t === null ? jp(r, null, s, u) : Vr(r, t.child, s, u);
  }
  function hm(t, r, s, u, h) {
    s = s.render;
    var g = r.ref;
    return Br(r, h), u = tu(t, r, s, u, g, h), s = nu(), t !== null && !ft ? (r.updateQueue = t.updateQueue, r.flags &= -2053, t.lanes &= ~h, fn(t, r, h)) : (De && s && Ll(r), r.flags |= 1, ot(t, r, u, h), r.child);
  }
  function ym(t, r, s, u, h) {
    if (t === null) {
      var g = s.type;
      return typeof g == "function" && !Nu(g) && g.defaultProps === void 0 && s.compare === null && s.defaultProps === void 0 ? (r.tag = 15, r.type = g, gm(t, r, g, u, h)) : (t = Ps(s.type, null, u, r, r.mode, h), t.ref = r.ref, t.return = r, r.child = t);
    }
    if (g = t.child, (t.lanes & h) === 0) {
      var T = g.memoizedProps;
      if (s = s.compare, s = s !== null ? s : Do, s(T, u) && t.ref === r.ref) return fn(t, r, h);
    }
    return r.flags |= 1, t = In(g, u), t.ref = r.ref, t.return = r, r.child = t;
  }
  function gm(t, r, s, u, h) {
    if (t !== null) {
      var g = t.memoizedProps;
      if (Do(g, u) && t.ref === r.ref) if (ft = !1, r.pendingProps = u = g, (t.lanes & h) !== 0) (t.flags & 131072) !== 0 && (ft = !0);
      else return r.lanes = t.lanes, fn(t, r, h);
    }
    return du(t, r, s, u, h);
  }
  function vm(t, r, s) {
    var u = r.pendingProps, h = u.children, g = t !== null ? t.memoizedState : null;
    if (u.mode === "hidden") if ((r.mode & 1) === 0) r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, Pe(Wr, Tt), Tt |= s;
    else {
      if ((s & 1073741824) === 0) return t = g !== null ? g.baseLanes | s : s, r.lanes = r.childLanes = 1073741824, r.memoizedState = { baseLanes: t, cachePool: null, transitions: null }, r.updateQueue = null, Pe(Wr, Tt), Tt |= t, null;
      r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, u = g !== null ? g.baseLanes : s, Pe(Wr, Tt), Tt |= u;
    }
    else g !== null ? (u = g.baseLanes | s, r.memoizedState = null) : u = s, Pe(Wr, Tt), Tt |= u;
    return ot(t, r, h, s), r.child;
  }
  function Sm(t, r) {
    var s = r.ref;
    (t === null && s !== null || t !== null && t.ref !== s) && (r.flags |= 512, r.flags |= 2097152);
  }
  function du(t, r, s, u, h) {
    var g = dt(s) ? Jn : qe.current;
    return g = Ir(r, g), Br(r, h), s = tu(t, r, s, u, g, h), u = nu(), t !== null && !ft ? (r.updateQueue = t.updateQueue, r.flags &= -2053, t.lanes &= ~h, fn(t, r, h)) : (De && u && Ll(r), r.flags |= 1, ot(t, r, s, h), r.child);
  }
  function wm(t, r, s, u, h) {
    if (dt(s)) {
      var g = !0;
      qi(r);
    } else g = !1;
    if (Br(r, h), r.stateNode === null) gs(t, r), lm(r, s, u), lu(r, s, u, h), u = !0;
    else if (t === null) {
      var T = r.stateNode, P = r.memoizedProps;
      T.props = P;
      var M = T.context, F = s.contextType;
      typeof F == "object" && F !== null ? F = bt(F) : (F = dt(s) ? Jn : qe.current, F = Ir(r, F));
      var z = s.getDerivedStateFromProps, U = typeof z == "function" || typeof T.getSnapshotBeforeUpdate == "function";
      U || typeof T.UNSAFE_componentWillReceiveProps != "function" && typeof T.componentWillReceiveProps != "function" || (P !== u || M !== F) && um(r, T, u, F), Pn = !1;
      var V = r.memoizedState;
      T.state = V, ls(r, u, T, h), M = r.memoizedState, P !== u || V !== M || ct.current || Pn ? (typeof z == "function" && (au(r, s, z, u), M = r.memoizedState), (P = Pn || am(r, s, P, u, V, M, F)) ? (U || typeof T.UNSAFE_componentWillMount != "function" && typeof T.componentWillMount != "function" || (typeof T.componentWillMount == "function" && T.componentWillMount(), typeof T.UNSAFE_componentWillMount == "function" && T.UNSAFE_componentWillMount()), typeof T.componentDidMount == "function" && (r.flags |= 4194308)) : (typeof T.componentDidMount == "function" && (r.flags |= 4194308), r.memoizedProps = u, r.memoizedState = M), T.props = u, T.state = M, T.context = F, u = P) : (typeof T.componentDidMount == "function" && (r.flags |= 4194308), u = !1);
    } else {
      T = r.stateNode, Fp(t, r), P = r.memoizedProps, F = r.type === r.elementType ? P : Lt(r.type, P), T.props = F, U = r.pendingProps, V = T.context, M = s.contextType, typeof M == "object" && M !== null ? M = bt(M) : (M = dt(s) ? Jn : qe.current, M = Ir(r, M));
      var J = s.getDerivedStateFromProps;
      (z = typeof J == "function" || typeof T.getSnapshotBeforeUpdate == "function") || typeof T.UNSAFE_componentWillReceiveProps != "function" && typeof T.componentWillReceiveProps != "function" || (P !== U || V !== M) && um(r, T, u, M), Pn = !1, V = r.memoizedState, T.state = V, ls(r, u, T, h);
      var ne = r.memoizedState;
      P !== U || V !== ne || ct.current || Pn ? (typeof J == "function" && (au(r, s, J, u), ne = r.memoizedState), (F = Pn || am(r, s, F, u, V, ne, M) || !1) ? (z || typeof T.UNSAFE_componentWillUpdate != "function" && typeof T.componentWillUpdate != "function" || (typeof T.componentWillUpdate == "function" && T.componentWillUpdate(u, ne, M), typeof T.UNSAFE_componentWillUpdate == "function" && T.UNSAFE_componentWillUpdate(u, ne, M)), typeof T.componentDidUpdate == "function" && (r.flags |= 4), typeof T.getSnapshotBeforeUpdate == "function" && (r.flags |= 1024)) : (typeof T.componentDidUpdate != "function" || P === t.memoizedProps && V === t.memoizedState || (r.flags |= 4), typeof T.getSnapshotBeforeUpdate != "function" || P === t.memoizedProps && V === t.memoizedState || (r.flags |= 1024), r.memoizedProps = u, r.memoizedState = ne), T.props = u, T.state = ne, T.context = M, u = F) : (typeof T.componentDidUpdate != "function" || P === t.memoizedProps && V === t.memoizedState || (r.flags |= 4), typeof T.getSnapshotBeforeUpdate != "function" || P === t.memoizedProps && V === t.memoizedState || (r.flags |= 1024), u = !1);
    }
    return fu(t, r, s, u, g, h);
  }
  function fu(t, r, s, u, h, g) {
    Sm(t, r);
    var T = (r.flags & 128) !== 0;
    if (!u && !T) return h && Ap(r, s, !1), fn(t, r, g);
    u = r.stateNode, ix.current = r;
    var P = T && typeof s.getDerivedStateFromError != "function" ? null : u.render();
    return r.flags |= 1, t !== null && T ? (r.child = Vr(r, t.child, null, g), r.child = Vr(r, null, P, g)) : ot(t, r, P, g), r.memoizedState = u.state, h && Ap(r, s, !0), r.child;
  }
  function xm(t) {
    var r = t.stateNode;
    r.pendingContext ? Tp(t, r.pendingContext, r.pendingContext !== r.context) : r.context && Tp(t, r.context, !1), Ql(t, r.containerInfo);
  }
  function _m(t, r, s, u, h) {
    return Lr(), Ul(h), r.flags |= 256, ot(t, r, s, u), r.child;
  }
  var pu = { dehydrated: null, treeContext: null, retryLane: 0 };
  function mu(t) {
    return { baseLanes: t, cachePool: null, transitions: null };
  }
  function Tm(t, r, s) {
    var u = r.pendingProps, h = je.current, g = !1, T = (r.flags & 128) !== 0, P;
    if ((P = T) || (P = t !== null && t.memoizedState === null ? !1 : (h & 2) !== 0), P ? (g = !0, r.flags &= -129) : (t === null || t.memoizedState !== null) && (h |= 1), Pe(je, h & 1), t === null)
      return Bl(r), t = r.memoizedState, t !== null && (t = t.dehydrated, t !== null) ? ((r.mode & 1) === 0 ? r.lanes = 1 : t.data === "$!" ? r.lanes = 8 : r.lanes = 1073741824, null) : (T = u.children, t = u.fallback, g ? (u = r.mode, g = r.child, T = { mode: "hidden", children: T }, (u & 1) === 0 && g !== null ? (g.childLanes = 0, g.pendingProps = T) : g = Es(T, u, 0, null), t = lr(t, u, s, null), g.return = r, t.return = r, g.sibling = t, r.child = g, r.child.memoizedState = mu(s), r.memoizedState = pu, t) : hu(r, T));
    if (h = t.memoizedState, h !== null && (P = h.dehydrated, P !== null)) return sx(t, r, T, u, P, h, s);
    if (g) {
      g = u.fallback, T = r.mode, h = t.child, P = h.sibling;
      var M = { mode: "hidden", children: u.children };
      return (T & 1) === 0 && r.child !== h ? (u = r.child, u.childLanes = 0, u.pendingProps = M, r.deletions = null) : (u = In(h, M), u.subtreeFlags = h.subtreeFlags & 14680064), P !== null ? g = In(P, g) : (g = lr(g, T, s, null), g.flags |= 2), g.return = r, u.return = r, u.sibling = g, r.child = u, u = g, g = r.child, T = t.child.memoizedState, T = T === null ? mu(s) : { baseLanes: T.baseLanes | s, cachePool: null, transitions: T.transitions }, g.memoizedState = T, g.childLanes = t.childLanes & ~s, r.memoizedState = pu, u;
    }
    return g = t.child, t = g.sibling, u = In(g, { mode: "visible", children: u.children }), (r.mode & 1) === 0 && (u.lanes = s), u.return = r, u.sibling = null, t !== null && (s = r.deletions, s === null ? (r.deletions = [t], r.flags |= 16) : s.push(t)), r.child = u, r.memoizedState = null, u;
  }
  function hu(t, r) {
    return r = Es({ mode: "visible", children: r }, t.mode, 0, null), r.return = t, t.child = r;
  }
  function ys(t, r, s, u) {
    return u !== null && Ul(u), Vr(r, t.child, null, s), t = hu(r, r.pendingProps.children), t.flags |= 2, r.memoizedState = null, t;
  }
  function sx(t, r, s, u, h, g, T) {
    if (s)
      return r.flags & 256 ? (r.flags &= -257, u = uu(Error(o(422))), ys(t, r, T, u)) : r.memoizedState !== null ? (r.child = t.child, r.flags |= 128, null) : (g = u.fallback, h = r.mode, u = Es({ mode: "visible", children: u.children }, h, 0, null), g = lr(g, h, T, null), g.flags |= 2, u.return = r, g.return = r, u.sibling = g, r.child = u, (r.mode & 1) !== 0 && Vr(r, t.child, null, T), r.child.memoizedState = mu(T), r.memoizedState = pu, g);
    if ((r.mode & 1) === 0) return ys(t, r, T, null);
    if (h.data === "$!") {
      if (u = h.nextSibling && h.nextSibling.dataset, u) var P = u.dgst;
      return u = P, g = Error(o(419)), u = uu(g, u, void 0), ys(t, r, T, u);
    }
    if (P = (T & t.childLanes) !== 0, ft || P) {
      if (u = Ge, u !== null) {
        switch (T & -T) {
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
        h = (h & (u.suspendedLanes | T)) !== 0 ? 0 : h, h !== 0 && h !== g.retryLane && (g.retryLane = h, cn(t, h), Bt(u, t, h, -1));
      }
      return Ru(), u = uu(Error(o(421))), ys(t, r, T, u);
    }
    return h.data === "$?" ? (r.flags |= 128, r.child = t.child, r = Sx.bind(null, t), h._reactRetry = r, null) : (t = g.treeContext, _t = kn(h.nextSibling), xt = r, De = !0, Ot = null, t !== null && (At[Ct++] = ln, At[Ct++] = un, At[Ct++] = qn, ln = t.id, un = t.overflow, qn = r), r = hu(r, u.children), r.flags |= 4096, r);
  }
  function km(t, r, s) {
    t.lanes |= r;
    var u = t.alternate;
    u !== null && (u.lanes |= r), Gl(t.return, r, s);
  }
  function yu(t, r, s, u, h) {
    var g = t.memoizedState;
    g === null ? t.memoizedState = { isBackwards: r, rendering: null, renderingStartTime: 0, last: u, tail: s, tailMode: h } : (g.isBackwards = r, g.rendering = null, g.renderingStartTime = 0, g.last = u, g.tail = s, g.tailMode = h);
  }
  function Am(t, r, s) {
    var u = r.pendingProps, h = u.revealOrder, g = u.tail;
    if (ot(t, r, u.children, s), u = je.current, (u & 2) !== 0) u = u & 1 | 2, r.flags |= 128;
    else {
      if (t !== null && (t.flags & 128) !== 0) e: for (t = r.child; t !== null; ) {
        if (t.tag === 13) t.memoizedState !== null && km(t, s, r);
        else if (t.tag === 19) km(t, s, r);
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
    if (Pe(je, u), (r.mode & 1) === 0) r.memoizedState = null;
    else switch (h) {
      case "forwards":
        for (s = r.child, h = null; s !== null; ) t = s.alternate, t !== null && us(t) === null && (h = s), s = s.sibling;
        s = h, s === null ? (h = r.child, r.child = null) : (h = s.sibling, s.sibling = null), yu(r, !1, h, s, g);
        break;
      case "backwards":
        for (s = null, h = r.child, r.child = null; h !== null; ) {
          if (t = h.alternate, t !== null && us(t) === null) {
            r.child = h;
            break;
          }
          t = h.sibling, h.sibling = s, s = h, h = t;
        }
        yu(r, !0, s, null, g);
        break;
      case "together":
        yu(r, !1, null, null, void 0);
        break;
      default:
        r.memoizedState = null;
    }
    return r.child;
  }
  function gs(t, r) {
    (r.mode & 1) === 0 && t !== null && (t.alternate = null, r.alternate = null, r.flags |= 2);
  }
  function fn(t, r, s) {
    if (t !== null && (r.dependencies = t.dependencies), or |= r.lanes, (s & r.childLanes) === 0) return null;
    if (t !== null && r.child !== t.child) throw Error(o(153));
    if (r.child !== null) {
      for (t = r.child, s = In(t, t.pendingProps), r.child = s, s.return = r; t.sibling !== null; ) t = t.sibling, s = s.sibling = In(t, t.pendingProps), s.return = r;
      s.sibling = null;
    }
    return r.child;
  }
  function ax(t, r, s) {
    switch (r.tag) {
      case 3:
        xm(r), Lr();
        break;
      case 5:
        Vp(r);
        break;
      case 1:
        dt(r.type) && qi(r);
        break;
      case 4:
        Ql(r, r.stateNode.containerInfo);
        break;
      case 10:
        var u = r.type._context, h = r.memoizedProps.value;
        Pe(is, u._currentValue), u._currentValue = h;
        break;
      case 13:
        if (u = r.memoizedState, u !== null)
          return u.dehydrated !== null ? (Pe(je, je.current & 1), r.flags |= 128, null) : (s & r.child.childLanes) !== 0 ? Tm(t, r, s) : (Pe(je, je.current & 1), t = fn(t, r, s), t !== null ? t.sibling : null);
        Pe(je, je.current & 1);
        break;
      case 19:
        if (u = (s & r.childLanes) !== 0, (t.flags & 128) !== 0) {
          if (u) return Am(t, r, s);
          r.flags |= 128;
        }
        if (h = r.memoizedState, h !== null && (h.rendering = null, h.tail = null, h.lastEffect = null), Pe(je, je.current), u) break;
        return null;
      case 22:
      case 23:
        return r.lanes = 0, vm(t, r, s);
    }
    return fn(t, r, s);
  }
  var Cm, gu, bm, Pm;
  Cm = function(t, r) {
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
  }, gu = function() {
  }, bm = function(t, r, s, u) {
    var h = t.memoizedProps;
    if (h !== u) {
      t = r.stateNode, nr(Qt.current);
      var g = null;
      switch (s) {
        case "input":
          h = Ga(t, h), u = Ga(t, u), g = [];
          break;
        case "select":
          h = X({}, h, { value: void 0 }), u = X({}, u, { value: void 0 }), g = [];
          break;
        case "textarea":
          h = Qa(t, h), u = Qa(t, u), g = [];
          break;
        default:
          typeof h.onClick != "function" && typeof u.onClick == "function" && (t.onclick = Xi);
      }
      Za(s, u);
      var T;
      s = null;
      for (F in h) if (!u.hasOwnProperty(F) && h.hasOwnProperty(F) && h[F] != null) if (F === "style") {
        var P = h[F];
        for (T in P) P.hasOwnProperty(T) && (s || (s = {}), s[T] = "");
      } else F !== "dangerouslySetInnerHTML" && F !== "children" && F !== "suppressContentEditableWarning" && F !== "suppressHydrationWarning" && F !== "autoFocus" && (a.hasOwnProperty(F) ? g || (g = []) : (g = g || []).push(F, null));
      for (F in u) {
        var M = u[F];
        if (P = h != null ? h[F] : void 0, u.hasOwnProperty(F) && M !== P && (M != null || P != null)) if (F === "style") if (P) {
          for (T in P) !P.hasOwnProperty(T) || M && M.hasOwnProperty(T) || (s || (s = {}), s[T] = "");
          for (T in M) M.hasOwnProperty(T) && P[T] !== M[T] && (s || (s = {}), s[T] = M[T]);
        } else s || (g || (g = []), g.push(
          F,
          s
        )), s = M;
        else F === "dangerouslySetInnerHTML" ? (M = M ? M.__html : void 0, P = P ? P.__html : void 0, M != null && P !== M && (g = g || []).push(F, M)) : F === "children" ? typeof M != "string" && typeof M != "number" || (g = g || []).push(F, "" + M) : F !== "suppressContentEditableWarning" && F !== "suppressHydrationWarning" && (a.hasOwnProperty(F) ? (M != null && F === "onScroll" && Me("scroll", t), g || P === M || (g = [])) : (g = g || []).push(F, M));
      }
      s && (g = g || []).push("style", s);
      var F = g;
      (r.updateQueue = F) && (r.flags |= 4);
    }
  }, Pm = function(t, r, s, u) {
    s !== u && (r.flags |= 4);
  };
  function Yo(t, r) {
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
  function lx(t, r, s) {
    var u = r.pendingProps;
    switch (Vl(r), r.tag) {
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
        return dt(r.type) && Ji(), tt(r), null;
      case 3:
        return u = r.stateNode, Ur(), Re(ct), Re(qe), Jl(), u.pendingContext && (u.context = u.pendingContext, u.pendingContext = null), (t === null || t.child === null) && (rs(r) ? r.flags |= 4 : t === null || t.memoizedState.isDehydrated && (r.flags & 256) === 0 || (r.flags |= 1024, Ot !== null && (Pu(Ot), Ot = null))), gu(t, r), tt(r), null;
      case 5:
        Xl(r);
        var h = nr($o.current);
        if (s = r.type, t !== null && r.stateNode != null) bm(t, r, s, u, h), t.ref !== r.ref && (r.flags |= 512, r.flags |= 2097152);
        else {
          if (!u) {
            if (r.stateNode === null) throw Error(o(166));
            return tt(r), null;
          }
          if (t = nr(Qt.current), rs(r)) {
            u = r.stateNode, s = r.type;
            var g = r.memoizedProps;
            switch (u[Yt] = r, u[Lo] = g, t = (r.mode & 1) !== 0, s) {
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
                for (h = 0; h < Io.length; h++) Me(Io[h], u);
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
                lf(u, g), Me("invalid", u);
                break;
              case "select":
                u._wrapperState = { wasMultiple: !!g.multiple }, Me("invalid", u);
                break;
              case "textarea":
                df(u, g), Me("invalid", u);
            }
            Za(s, g), h = null;
            for (var T in g) if (g.hasOwnProperty(T)) {
              var P = g[T];
              T === "children" ? typeof P == "string" ? u.textContent !== P && (g.suppressHydrationWarning !== !0 && Qi(u.textContent, P, t), h = ["children", P]) : typeof P == "number" && u.textContent !== "" + P && (g.suppressHydrationWarning !== !0 && Qi(
                u.textContent,
                P,
                t
              ), h = ["children", "" + P]) : a.hasOwnProperty(T) && P != null && T === "onScroll" && Me("scroll", u);
            }
            switch (s) {
              case "input":
                Ci(u), cf(u, g, !0);
                break;
              case "textarea":
                Ci(u), pf(u);
                break;
              case "select":
              case "option":
                break;
              default:
                typeof g.onClick == "function" && (u.onclick = Xi);
            }
            u = h, r.updateQueue = u, u !== null && (r.flags |= 4);
          } else {
            T = h.nodeType === 9 ? h : h.ownerDocument, t === "http://www.w3.org/1999/xhtml" && (t = mf(s)), t === "http://www.w3.org/1999/xhtml" ? s === "script" ? (t = T.createElement("div"), t.innerHTML = "<script><\/script>", t = t.removeChild(t.firstChild)) : typeof u.is == "string" ? t = T.createElement(s, { is: u.is }) : (t = T.createElement(s), s === "select" && (T = t, u.multiple ? T.multiple = !0 : u.size && (T.size = u.size))) : t = T.createElementNS(t, s), t[Yt] = r, t[Lo] = u, Cm(t, r, !1, !1), r.stateNode = t;
            e: {
              switch (T = Ja(s, u), s) {
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
                  for (h = 0; h < Io.length; h++) Me(Io[h], t);
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
                  lf(t, u), h = Ga(t, u), Me("invalid", t);
                  break;
                case "option":
                  h = u;
                  break;
                case "select":
                  t._wrapperState = { wasMultiple: !!u.multiple }, h = X({}, u, { value: void 0 }), Me("invalid", t);
                  break;
                case "textarea":
                  df(t, u), h = Qa(t, u), Me("invalid", t);
                  break;
                default:
                  h = u;
              }
              Za(s, h), P = h;
              for (g in P) if (P.hasOwnProperty(g)) {
                var M = P[g];
                g === "style" ? gf(t, M) : g === "dangerouslySetInnerHTML" ? (M = M ? M.__html : void 0, M != null && hf(t, M)) : g === "children" ? typeof M == "string" ? (s !== "textarea" || M !== "") && yo(t, M) : typeof M == "number" && yo(t, "" + M) : g !== "suppressContentEditableWarning" && g !== "suppressHydrationWarning" && g !== "autoFocus" && (a.hasOwnProperty(g) ? M != null && g === "onScroll" && Me("scroll", t) : M != null && E(t, g, M, T));
              }
              switch (s) {
                case "input":
                  Ci(t), cf(t, u, !1);
                  break;
                case "textarea":
                  Ci(t), pf(t);
                  break;
                case "option":
                  u.value != null && t.setAttribute("value", "" + xe(u.value));
                  break;
                case "select":
                  t.multiple = !!u.multiple, g = u.value, g != null ? Tr(t, !!u.multiple, g, !1) : u.defaultValue != null && Tr(
                    t,
                    !!u.multiple,
                    u.defaultValue,
                    !0
                  );
                  break;
                default:
                  typeof h.onClick == "function" && (t.onclick = Xi);
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
        if (t && r.stateNode != null) Pm(t, r, t.memoizedProps, u);
        else {
          if (typeof u != "string" && r.stateNode === null) throw Error(o(166));
          if (s = nr($o.current), nr(Qt.current), rs(r)) {
            if (u = r.stateNode, s = r.memoizedProps, u[Yt] = r, (g = u.nodeValue !== s) && (t = xt, t !== null)) switch (t.tag) {
              case 3:
                Qi(u.nodeValue, s, (t.mode & 1) !== 0);
                break;
              case 5:
                t.memoizedProps.suppressHydrationWarning !== !0 && Qi(u.nodeValue, s, (t.mode & 1) !== 0);
            }
            g && (r.flags |= 4);
          } else u = (s.nodeType === 9 ? s : s.ownerDocument).createTextNode(u), u[Yt] = r, r.stateNode = u;
        }
        return tt(r), null;
      case 13:
        if (Re(je), u = r.memoizedState, t === null || t.memoizedState !== null && t.memoizedState.dehydrated !== null) {
          if (De && _t !== null && (r.mode & 1) !== 0 && (r.flags & 128) === 0) Rp(), Lr(), r.flags |= 98560, g = !1;
          else if (g = rs(r), u !== null && u.dehydrated !== null) {
            if (t === null) {
              if (!g) throw Error(o(318));
              if (g = r.memoizedState, g = g !== null ? g.dehydrated : null, !g) throw Error(o(317));
              g[Yt] = r;
            } else Lr(), (r.flags & 128) === 0 && (r.memoizedState = null), r.flags |= 4;
            tt(r), g = !1;
          } else Ot !== null && (Pu(Ot), Ot = null), g = !0;
          if (!g) return r.flags & 65536 ? r : null;
        }
        return (r.flags & 128) !== 0 ? (r.lanes = s, r) : (u = u !== null, u !== (t !== null && t.memoizedState !== null) && u && (r.child.flags |= 8192, (r.mode & 1) !== 0 && (t === null || (je.current & 1) !== 0 ? $e === 0 && ($e = 3) : Ru())), r.updateQueue !== null && (r.flags |= 4), tt(r), null);
      case 4:
        return Ur(), gu(t, r), t === null && Fo(r.stateNode.containerInfo), tt(r), null;
      case 10:
        return Wl(r.type._context), tt(r), null;
      case 17:
        return dt(r.type) && Ji(), tt(r), null;
      case 19:
        if (Re(je), g = r.memoizedState, g === null) return tt(r), null;
        if (u = (r.flags & 128) !== 0, T = g.rendering, T === null) if (u) Yo(g, !1);
        else {
          if ($e !== 0 || t !== null && (t.flags & 128) !== 0) for (t = r.child; t !== null; ) {
            if (T = us(t), T !== null) {
              for (r.flags |= 128, Yo(g, !1), u = T.updateQueue, u !== null && (r.updateQueue = u, r.flags |= 4), r.subtreeFlags = 0, u = s, s = r.child; s !== null; ) g = s, t = u, g.flags &= 14680066, T = g.alternate, T === null ? (g.childLanes = 0, g.lanes = t, g.child = null, g.subtreeFlags = 0, g.memoizedProps = null, g.memoizedState = null, g.updateQueue = null, g.dependencies = null, g.stateNode = null) : (g.childLanes = T.childLanes, g.lanes = T.lanes, g.child = T.child, g.subtreeFlags = 0, g.deletions = null, g.memoizedProps = T.memoizedProps, g.memoizedState = T.memoizedState, g.updateQueue = T.updateQueue, g.type = T.type, t = T.dependencies, g.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }), s = s.sibling;
              return Pe(je, je.current & 1 | 2), r.child;
            }
            t = t.sibling;
          }
          g.tail !== null && Le() > Gr && (r.flags |= 128, u = !0, Yo(g, !1), r.lanes = 4194304);
        }
        else {
          if (!u) if (t = us(T), t !== null) {
            if (r.flags |= 128, u = !0, s = t.updateQueue, s !== null && (r.updateQueue = s, r.flags |= 4), Yo(g, !0), g.tail === null && g.tailMode === "hidden" && !T.alternate && !De) return tt(r), null;
          } else 2 * Le() - g.renderingStartTime > Gr && s !== 1073741824 && (r.flags |= 128, u = !0, Yo(g, !1), r.lanes = 4194304);
          g.isBackwards ? (T.sibling = r.child, r.child = T) : (s = g.last, s !== null ? s.sibling = T : r.child = T, g.last = T);
        }
        return g.tail !== null ? (r = g.tail, g.rendering = r, g.tail = r.sibling, g.renderingStartTime = Le(), r.sibling = null, s = je.current, Pe(je, u ? s & 1 | 2 : s & 1), r) : (tt(r), null);
      case 22:
      case 23:
        return Mu(), u = r.memoizedState !== null, t !== null && t.memoizedState !== null !== u && (r.flags |= 8192), u && (r.mode & 1) !== 0 ? (Tt & 1073741824) !== 0 && (tt(r), r.subtreeFlags & 6 && (r.flags |= 8192)) : tt(r), null;
      case 24:
        return null;
      case 25:
        return null;
    }
    throw Error(o(156, r.tag));
  }
  function ux(t, r) {
    switch (Vl(r), r.tag) {
      case 1:
        return dt(r.type) && Ji(), t = r.flags, t & 65536 ? (r.flags = t & -65537 | 128, r) : null;
      case 3:
        return Ur(), Re(ct), Re(qe), Jl(), t = r.flags, (t & 65536) !== 0 && (t & 128) === 0 ? (r.flags = t & -65537 | 128, r) : null;
      case 5:
        return Xl(r), null;
      case 13:
        if (Re(je), t = r.memoizedState, t !== null && t.dehydrated !== null) {
          if (r.alternate === null) throw Error(o(340));
          Lr();
        }
        return t = r.flags, t & 65536 ? (r.flags = t & -65537 | 128, r) : null;
      case 19:
        return Re(je), null;
      case 4:
        return Ur(), null;
      case 10:
        return Wl(r.type._context), null;
      case 22:
      case 23:
        return Mu(), null;
      case 24:
        return null;
      default:
        return null;
    }
  }
  var vs = !1, nt = !1, cx = typeof WeakSet == "function" ? WeakSet : Set, q = null;
  function Hr(t, r) {
    var s = t.ref;
    if (s !== null) if (typeof s == "function") try {
      s(null);
    } catch (u) {
      Oe(t, r, u);
    }
    else s.current = null;
  }
  function vu(t, r, s) {
    try {
      s();
    } catch (u) {
      Oe(t, r, u);
    }
  }
  var Em = !1;
  function dx(t, r) {
    if (Ml = Li, t = ap(), _l(t)) {
      if ("selectionStart" in t) var s = { start: t.selectionStart, end: t.selectionEnd };
      else e: {
        s = (s = t.ownerDocument) && s.defaultView || window;
        var u = s.getSelection && s.getSelection();
        if (u && u.rangeCount !== 0) {
          s = u.anchorNode;
          var h = u.anchorOffset, g = u.focusNode;
          u = u.focusOffset;
          try {
            s.nodeType, g.nodeType;
          } catch {
            s = null;
            break e;
          }
          var T = 0, P = -1, M = -1, F = 0, z = 0, U = t, V = null;
          t: for (; ; ) {
            for (var J; U !== s || h !== 0 && U.nodeType !== 3 || (P = T + h), U !== g || u !== 0 && U.nodeType !== 3 || (M = T + u), U.nodeType === 3 && (T += U.nodeValue.length), (J = U.firstChild) !== null; )
              V = U, U = J;
            for (; ; ) {
              if (U === t) break t;
              if (V === s && ++F === h && (P = T), V === g && ++z === u && (M = T), (J = U.nextSibling) !== null) break;
              U = V, V = U.parentNode;
            }
            U = J;
          }
          s = P === -1 || M === -1 ? null : { start: P, end: M };
        } else s = null;
      }
      s = s || { start: 0, end: 0 };
    } else s = null;
    for (Rl = { focusedElem: t, selectionRange: s }, Li = !1, q = r; q !== null; ) if (r = q, t = r.child, (r.subtreeFlags & 1028) !== 0 && t !== null) t.return = r, q = t;
    else for (; q !== null; ) {
      r = q;
      try {
        var ne = r.alternate;
        if ((r.flags & 1024) !== 0) switch (r.tag) {
          case 0:
          case 11:
          case 15:
            break;
          case 1:
            if (ne !== null) {
              var oe = ne.memoizedProps, Ve = ne.memoizedState, j = r.stateNode, R = j.getSnapshotBeforeUpdate(r.elementType === r.type ? oe : Lt(r.type, oe), Ve);
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
      } catch (H) {
        Oe(r, r.return, H);
      }
      if (t = r.sibling, t !== null) {
        t.return = r.return, q = t;
        break;
      }
      q = r.return;
    }
    return ne = Em, Em = !1, ne;
  }
  function Qo(t, r, s) {
    var u = r.updateQueue;
    if (u = u !== null ? u.lastEffect : null, u !== null) {
      var h = u = u.next;
      do {
        if ((h.tag & t) === t) {
          var g = h.destroy;
          h.destroy = void 0, g !== void 0 && vu(r, s, g);
        }
        h = h.next;
      } while (h !== u);
    }
  }
  function Ss(t, r) {
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
  function Su(t) {
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
  function Mm(t) {
    var r = t.alternate;
    r !== null && (t.alternate = null, Mm(r)), t.child = null, t.deletions = null, t.sibling = null, t.tag === 5 && (r = t.stateNode, r !== null && (delete r[Yt], delete r[Lo], delete r[Il], delete r[Kw], delete r[Yw])), t.stateNode = null, t.return = null, t.dependencies = null, t.memoizedProps = null, t.memoizedState = null, t.pendingProps = null, t.stateNode = null, t.updateQueue = null;
  }
  function Rm(t) {
    return t.tag === 5 || t.tag === 3 || t.tag === 4;
  }
  function Nm(t) {
    e: for (; ; ) {
      for (; t.sibling === null; ) {
        if (t.return === null || Rm(t.return)) return null;
        t = t.return;
      }
      for (t.sibling.return = t.return, t = t.sibling; t.tag !== 5 && t.tag !== 6 && t.tag !== 18; ) {
        if (t.flags & 2 || t.child === null || t.tag === 4) continue e;
        t.child.return = t, t = t.child;
      }
      if (!(t.flags & 2)) return t.stateNode;
    }
  }
  function wu(t, r, s) {
    var u = t.tag;
    if (u === 5 || u === 6) t = t.stateNode, r ? s.nodeType === 8 ? s.parentNode.insertBefore(t, r) : s.insertBefore(t, r) : (s.nodeType === 8 ? (r = s.parentNode, r.insertBefore(t, s)) : (r = s, r.appendChild(t)), s = s._reactRootContainer, s != null || r.onclick !== null || (r.onclick = Xi));
    else if (u !== 4 && (t = t.child, t !== null)) for (wu(t, r, s), t = t.sibling; t !== null; ) wu(t, r, s), t = t.sibling;
  }
  function xu(t, r, s) {
    var u = t.tag;
    if (u === 5 || u === 6) t = t.stateNode, r ? s.insertBefore(t, r) : s.appendChild(t);
    else if (u !== 4 && (t = t.child, t !== null)) for (xu(t, r, s), t = t.sibling; t !== null; ) xu(t, r, s), t = t.sibling;
  }
  var Qe = null, Vt = !1;
  function Mn(t, r, s) {
    for (s = s.child; s !== null; ) Dm(t, r, s), s = s.sibling;
  }
  function Dm(t, r, s) {
    if (Kt && typeof Kt.onCommitFiberUnmount == "function") try {
      Kt.onCommitFiberUnmount(Ni, s);
    } catch {
    }
    switch (s.tag) {
      case 5:
        nt || Hr(s, r);
      case 6:
        var u = Qe, h = Vt;
        Qe = null, Mn(t, r, s), Qe = u, Vt = h, Qe !== null && (Vt ? (t = Qe, s = s.stateNode, t.nodeType === 8 ? t.parentNode.removeChild(s) : t.removeChild(s)) : Qe.removeChild(s.stateNode));
        break;
      case 18:
        Qe !== null && (Vt ? (t = Qe, s = s.stateNode, t.nodeType === 8 ? jl(t.parentNode, s) : t.nodeType === 1 && jl(t, s), bo(t)) : jl(Qe, s.stateNode));
        break;
      case 4:
        u = Qe, h = Vt, Qe = s.stateNode.containerInfo, Vt = !0, Mn(t, r, s), Qe = u, Vt = h;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        if (!nt && (u = s.updateQueue, u !== null && (u = u.lastEffect, u !== null))) {
          h = u = u.next;
          do {
            var g = h, T = g.destroy;
            g = g.tag, T !== void 0 && ((g & 2) !== 0 || (g & 4) !== 0) && vu(s, r, T), h = h.next;
          } while (h !== u);
        }
        Mn(t, r, s);
        break;
      case 1:
        if (!nt && (Hr(s, r), u = s.stateNode, typeof u.componentWillUnmount == "function")) try {
          u.props = s.memoizedProps, u.state = s.memoizedState, u.componentWillUnmount();
        } catch (P) {
          Oe(s, r, P);
        }
        Mn(t, r, s);
        break;
      case 21:
        Mn(t, r, s);
        break;
      case 22:
        s.mode & 1 ? (nt = (u = nt) || s.memoizedState !== null, Mn(t, r, s), nt = u) : Mn(t, r, s);
        break;
      default:
        Mn(t, r, s);
    }
  }
  function jm(t) {
    var r = t.updateQueue;
    if (r !== null) {
      t.updateQueue = null;
      var s = t.stateNode;
      s === null && (s = t.stateNode = new cx()), r.forEach(function(u) {
        var h = wx.bind(null, t, u);
        s.has(u) || (s.add(u), u.then(h, h));
      });
    }
  }
  function zt(t, r) {
    var s = r.deletions;
    if (s !== null) for (var u = 0; u < s.length; u++) {
      var h = s[u];
      try {
        var g = t, T = r, P = T;
        e: for (; P !== null; ) {
          switch (P.tag) {
            case 5:
              Qe = P.stateNode, Vt = !1;
              break e;
            case 3:
              Qe = P.stateNode.containerInfo, Vt = !0;
              break e;
            case 4:
              Qe = P.stateNode.containerInfo, Vt = !0;
              break e;
          }
          P = P.return;
        }
        if (Qe === null) throw Error(o(160));
        Dm(g, T, h), Qe = null, Vt = !1;
        var M = h.alternate;
        M !== null && (M.return = null), h.return = null;
      } catch (F) {
        Oe(h, r, F);
      }
    }
    if (r.subtreeFlags & 12854) for (r = r.child; r !== null; ) Im(r, t), r = r.sibling;
  }
  function Im(t, r) {
    var s = t.alternate, u = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (zt(r, t), Zt(t), u & 4) {
          try {
            Qo(3, t, t.return), Ss(3, t);
          } catch (oe) {
            Oe(t, t.return, oe);
          }
          try {
            Qo(5, t, t.return);
          } catch (oe) {
            Oe(t, t.return, oe);
          }
        }
        break;
      case 1:
        zt(r, t), Zt(t), u & 512 && s !== null && Hr(s, s.return);
        break;
      case 5:
        if (zt(r, t), Zt(t), u & 512 && s !== null && Hr(s, s.return), t.flags & 32) {
          var h = t.stateNode;
          try {
            yo(h, "");
          } catch (oe) {
            Oe(t, t.return, oe);
          }
        }
        if (u & 4 && (h = t.stateNode, h != null)) {
          var g = t.memoizedProps, T = s !== null ? s.memoizedProps : g, P = t.type, M = t.updateQueue;
          if (t.updateQueue = null, M !== null) try {
            P === "input" && g.type === "radio" && g.name != null && uf(h, g), Ja(P, T);
            var F = Ja(P, g);
            for (T = 0; T < M.length; T += 2) {
              var z = M[T], U = M[T + 1];
              z === "style" ? gf(h, U) : z === "dangerouslySetInnerHTML" ? hf(h, U) : z === "children" ? yo(h, U) : E(h, z, U, F);
            }
            switch (P) {
              case "input":
                Ka(h, g);
                break;
              case "textarea":
                ff(h, g);
                break;
              case "select":
                var V = h._wrapperState.wasMultiple;
                h._wrapperState.wasMultiple = !!g.multiple;
                var J = g.value;
                J != null ? Tr(h, !!g.multiple, J, !1) : V !== !!g.multiple && (g.defaultValue != null ? Tr(
                  h,
                  !!g.multiple,
                  g.defaultValue,
                  !0
                ) : Tr(h, !!g.multiple, g.multiple ? [] : "", !1));
            }
            h[Lo] = g;
          } catch (oe) {
            Oe(t, t.return, oe);
          }
        }
        break;
      case 6:
        if (zt(r, t), Zt(t), u & 4) {
          if (t.stateNode === null) throw Error(o(162));
          h = t.stateNode, g = t.memoizedProps;
          try {
            h.nodeValue = g;
          } catch (oe) {
            Oe(t, t.return, oe);
          }
        }
        break;
      case 3:
        if (zt(r, t), Zt(t), u & 4 && s !== null && s.memoizedState.isDehydrated) try {
          bo(r.containerInfo);
        } catch (oe) {
          Oe(t, t.return, oe);
        }
        break;
      case 4:
        zt(r, t), Zt(t);
        break;
      case 13:
        zt(r, t), Zt(t), h = t.child, h.flags & 8192 && (g = h.memoizedState !== null, h.stateNode.isHidden = g, !g || h.alternate !== null && h.alternate.memoizedState !== null || (ku = Le())), u & 4 && jm(t);
        break;
      case 22:
        if (z = s !== null && s.memoizedState !== null, t.mode & 1 ? (nt = (F = nt) || z, zt(r, t), nt = F) : zt(r, t), Zt(t), u & 8192) {
          if (F = t.memoizedState !== null, (t.stateNode.isHidden = F) && !z && (t.mode & 1) !== 0) for (q = t, z = t.child; z !== null; ) {
            for (U = q = z; q !== null; ) {
              switch (V = q, J = V.child, V.tag) {
                case 0:
                case 11:
                case 14:
                case 15:
                  Qo(4, V, V.return);
                  break;
                case 1:
                  Hr(V, V.return);
                  var ne = V.stateNode;
                  if (typeof ne.componentWillUnmount == "function") {
                    u = V, s = V.return;
                    try {
                      r = u, ne.props = r.memoizedProps, ne.state = r.memoizedState, ne.componentWillUnmount();
                    } catch (oe) {
                      Oe(u, s, oe);
                    }
                  }
                  break;
                case 5:
                  Hr(V, V.return);
                  break;
                case 22:
                  if (V.memoizedState !== null) {
                    Lm(U);
                    continue;
                  }
              }
              J !== null ? (J.return = V, q = J) : Lm(U);
            }
            z = z.sibling;
          }
          e: for (z = null, U = t; ; ) {
            if (U.tag === 5) {
              if (z === null) {
                z = U;
                try {
                  h = U.stateNode, F ? (g = h.style, typeof g.setProperty == "function" ? g.setProperty("display", "none", "important") : g.display = "none") : (P = U.stateNode, M = U.memoizedProps.style, T = M != null && M.hasOwnProperty("display") ? M.display : null, P.style.display = yf("display", T));
                } catch (oe) {
                  Oe(t, t.return, oe);
                }
              }
            } else if (U.tag === 6) {
              if (z === null) try {
                U.stateNode.nodeValue = F ? "" : U.memoizedProps;
              } catch (oe) {
                Oe(t, t.return, oe);
              }
            } else if ((U.tag !== 22 && U.tag !== 23 || U.memoizedState === null || U === t) && U.child !== null) {
              U.child.return = U, U = U.child;
              continue;
            }
            if (U === t) break e;
            for (; U.sibling === null; ) {
              if (U.return === null || U.return === t) break e;
              z === U && (z = null), U = U.return;
            }
            z === U && (z = null), U.sibling.return = U.return, U = U.sibling;
          }
        }
        break;
      case 19:
        zt(r, t), Zt(t), u & 4 && jm(t);
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
            if (Rm(s)) {
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
            u.flags & 32 && (yo(h, ""), u.flags &= -33);
            var g = Nm(t);
            xu(t, g, h);
            break;
          case 3:
          case 4:
            var T = u.stateNode.containerInfo, P = Nm(t);
            wu(t, P, T);
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
  function fx(t, r, s) {
    q = t, Fm(t);
  }
  function Fm(t, r, s) {
    for (var u = (t.mode & 1) !== 0; q !== null; ) {
      var h = q, g = h.child;
      if (h.tag === 22 && u) {
        var T = h.memoizedState !== null || vs;
        if (!T) {
          var P = h.alternate, M = P !== null && P.memoizedState !== null || nt;
          P = vs;
          var F = nt;
          if (vs = T, (nt = M) && !F) for (q = h; q !== null; ) T = q, M = T.child, T.tag === 22 && T.memoizedState !== null ? Vm(h) : M !== null ? (M.return = T, q = M) : Vm(h);
          for (; g !== null; ) q = g, Fm(g), g = g.sibling;
          q = h, vs = P, nt = F;
        }
        Om(t);
      } else (h.subtreeFlags & 8772) !== 0 && g !== null ? (g.return = h, q = g) : Om(t);
    }
  }
  function Om(t) {
    for (; q !== null; ) {
      var r = q;
      if ((r.flags & 8772) !== 0) {
        var s = r.alternate;
        try {
          if ((r.flags & 8772) !== 0) switch (r.tag) {
            case 0:
            case 11:
            case 15:
              nt || Ss(5, r);
              break;
            case 1:
              var u = r.stateNode;
              if (r.flags & 4 && !nt) if (s === null) u.componentDidMount();
              else {
                var h = r.elementType === r.type ? s.memoizedProps : Lt(r.type, s.memoizedProps);
                u.componentDidUpdate(h, s.memoizedState, u.__reactInternalSnapshotBeforeUpdate);
              }
              var g = r.updateQueue;
              g !== null && Lp(r, g, u);
              break;
            case 3:
              var T = r.updateQueue;
              if (T !== null) {
                if (s = null, r.child !== null) switch (r.child.tag) {
                  case 5:
                    s = r.child.stateNode;
                    break;
                  case 1:
                    s = r.child.stateNode;
                }
                Lp(r, T, s);
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
                  var z = F.memoizedState;
                  if (z !== null) {
                    var U = z.dehydrated;
                    U !== null && bo(U);
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
          nt || r.flags & 512 && Su(r);
        } catch (V) {
          Oe(r, r.return, V);
        }
      }
      if (r === t) {
        q = null;
        break;
      }
      if (s = r.sibling, s !== null) {
        s.return = r.return, q = s;
        break;
      }
      q = r.return;
    }
  }
  function Lm(t) {
    for (; q !== null; ) {
      var r = q;
      if (r === t) {
        q = null;
        break;
      }
      var s = r.sibling;
      if (s !== null) {
        s.return = r.return, q = s;
        break;
      }
      q = r.return;
    }
  }
  function Vm(t) {
    for (; q !== null; ) {
      var r = q;
      try {
        switch (r.tag) {
          case 0:
          case 11:
          case 15:
            var s = r.return;
            try {
              Ss(4, r);
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
            var g = r.return;
            try {
              Su(r);
            } catch (M) {
              Oe(r, g, M);
            }
            break;
          case 5:
            var T = r.return;
            try {
              Su(r);
            } catch (M) {
              Oe(r, T, M);
            }
        }
      } catch (M) {
        Oe(r, r.return, M);
      }
      if (r === t) {
        q = null;
        break;
      }
      var P = r.sibling;
      if (P !== null) {
        P.return = r.return, q = P;
        break;
      }
      q = r.return;
    }
  }
  var px = Math.ceil, ws = D.ReactCurrentDispatcher, _u = D.ReactCurrentOwner, Et = D.ReactCurrentBatchConfig, ye = 0, Ge = null, ze = null, Xe = 0, Tt = 0, Wr = An(0), $e = 0, Xo = null, or = 0, xs = 0, Tu = 0, Zo = null, pt = null, ku = 0, Gr = 1 / 0, pn = null, _s = !1, Au = null, Rn = null, Ts = !1, Nn = null, ks = 0, Jo = 0, Cu = null, As = -1, Cs = 0;
  function it() {
    return (ye & 6) !== 0 ? Le() : As !== -1 ? As : As = Le();
  }
  function Dn(t) {
    return (t.mode & 1) === 0 ? 1 : (ye & 2) !== 0 && Xe !== 0 ? Xe & -Xe : Xw.transition !== null ? (Cs === 0 && (Cs = Nf()), Cs) : (t = _e, t !== 0 || (t = window.event, t = t === void 0 ? 16 : Bf(t.type)), t);
  }
  function Bt(t, r, s, u) {
    if (50 < Jo) throw Jo = 0, Cu = null, Error(o(185));
    _o(t, s, u), ((ye & 2) === 0 || t !== Ge) && (t === Ge && ((ye & 2) === 0 && (xs |= s), $e === 4 && jn(t, Xe)), mt(t, u), s === 1 && ye === 0 && (r.mode & 1) === 0 && (Gr = Le() + 500, es && bn()));
  }
  function mt(t, r) {
    var s = t.callbackNode;
    XS(t, r);
    var u = Ii(t, t === Ge ? Xe : 0);
    if (u === 0) s !== null && Ef(s), t.callbackNode = null, t.callbackPriority = 0;
    else if (r = u & -u, t.callbackPriority !== r) {
      if (s != null && Ef(s), r === 1) t.tag === 0 ? Qw(Bm.bind(null, t)) : Cp(Bm.bind(null, t)), Ww(function() {
        (ye & 6) === 0 && bn();
      }), s = null;
      else {
        switch (Df(u)) {
          case 1:
            s = il;
            break;
          case 4:
            s = Mf;
            break;
          case 16:
            s = Ri;
            break;
          case 536870912:
            s = Rf;
            break;
          default:
            s = Ri;
        }
        s = Qm(s, zm.bind(null, t));
      }
      t.callbackPriority = r, t.callbackNode = s;
    }
  }
  function zm(t, r) {
    if (As = -1, Cs = 0, (ye & 6) !== 0) throw Error(o(327));
    var s = t.callbackNode;
    if (Kr() && t.callbackNode !== s) return null;
    var u = Ii(t, t === Ge ? Xe : 0);
    if (u === 0) return null;
    if ((u & 30) !== 0 || (u & t.expiredLanes) !== 0 || r) r = bs(t, u);
    else {
      r = u;
      var h = ye;
      ye |= 2;
      var g = $m();
      (Ge !== t || Xe !== r) && (pn = null, Gr = Le() + 500, sr(t, r));
      do
        try {
          yx();
          break;
        } catch (P) {
          Um(t, P);
        }
      while (!0);
      Hl(), ws.current = g, ye = h, ze !== null ? r = 0 : (Ge = null, Xe = 0, r = $e);
    }
    if (r !== 0) {
      if (r === 2 && (h = sl(t), h !== 0 && (u = h, r = bu(t, h))), r === 1) throw s = Xo, sr(t, 0), jn(t, u), mt(t, Le()), s;
      if (r === 6) jn(t, u);
      else {
        if (h = t.current.alternate, (u & 30) === 0 && !mx(h) && (r = bs(t, u), r === 2 && (g = sl(t), g !== 0 && (u = g, r = bu(t, g))), r === 1)) throw s = Xo, sr(t, 0), jn(t, u), mt(t, Le()), s;
        switch (t.finishedWork = h, t.finishedLanes = u, r) {
          case 0:
          case 1:
            throw Error(o(345));
          case 2:
            ar(t, pt, pn);
            break;
          case 3:
            if (jn(t, u), (u & 130023424) === u && (r = ku + 500 - Le(), 10 < r)) {
              if (Ii(t, 0) !== 0) break;
              if (h = t.suspendedLanes, (h & u) !== u) {
                it(), t.pingedLanes |= t.suspendedLanes & h;
                break;
              }
              t.timeoutHandle = Dl(ar.bind(null, t, pt, pn), r);
              break;
            }
            ar(t, pt, pn);
            break;
          case 4:
            if (jn(t, u), (u & 4194240) === u) break;
            for (r = t.eventTimes, h = -1; 0 < u; ) {
              var T = 31 - It(u);
              g = 1 << T, T = r[T], T > h && (h = T), u &= ~g;
            }
            if (u = h, u = Le() - u, u = (120 > u ? 120 : 480 > u ? 480 : 1080 > u ? 1080 : 1920 > u ? 1920 : 3e3 > u ? 3e3 : 4320 > u ? 4320 : 1960 * px(u / 1960)) - u, 10 < u) {
              t.timeoutHandle = Dl(ar.bind(null, t, pt, pn), u);
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
    return mt(t, Le()), t.callbackNode === s ? zm.bind(null, t) : null;
  }
  function bu(t, r) {
    var s = Zo;
    return t.current.memoizedState.isDehydrated && (sr(t, r).flags |= 256), t = bs(t, r), t !== 2 && (r = pt, pt = s, r !== null && Pu(r)), t;
  }
  function Pu(t) {
    pt === null ? pt = t : pt.push.apply(pt, t);
  }
  function mx(t) {
    for (var r = t; ; ) {
      if (r.flags & 16384) {
        var s = r.updateQueue;
        if (s !== null && (s = s.stores, s !== null)) for (var u = 0; u < s.length; u++) {
          var h = s[u], g = h.getSnapshot;
          h = h.value;
          try {
            if (!Ft(g(), h)) return !1;
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
  function jn(t, r) {
    for (r &= ~Tu, r &= ~xs, t.suspendedLanes |= r, t.pingedLanes &= ~r, t = t.expirationTimes; 0 < r; ) {
      var s = 31 - It(r), u = 1 << s;
      t[s] = -1, r &= ~u;
    }
  }
  function Bm(t) {
    if ((ye & 6) !== 0) throw Error(o(327));
    Kr();
    var r = Ii(t, 0);
    if ((r & 1) === 0) return mt(t, Le()), null;
    var s = bs(t, r);
    if (t.tag !== 0 && s === 2) {
      var u = sl(t);
      u !== 0 && (r = u, s = bu(t, u));
    }
    if (s === 1) throw s = Xo, sr(t, 0), jn(t, r), mt(t, Le()), s;
    if (s === 6) throw Error(o(345));
    return t.finishedWork = t.current.alternate, t.finishedLanes = r, ar(t, pt, pn), mt(t, Le()), null;
  }
  function Eu(t, r) {
    var s = ye;
    ye |= 1;
    try {
      return t(r);
    } finally {
      ye = s, ye === 0 && (Gr = Le() + 500, es && bn());
    }
  }
  function ir(t) {
    Nn !== null && Nn.tag === 0 && (ye & 6) === 0 && Kr();
    var r = ye;
    ye |= 1;
    var s = Et.transition, u = _e;
    try {
      if (Et.transition = null, _e = 1, t) return t();
    } finally {
      _e = u, Et.transition = s, ye = r, (ye & 6) === 0 && bn();
    }
  }
  function Mu() {
    Tt = Wr.current, Re(Wr);
  }
  function sr(t, r) {
    t.finishedWork = null, t.finishedLanes = 0;
    var s = t.timeoutHandle;
    if (s !== -1 && (t.timeoutHandle = -1, Hw(s)), ze !== null) for (s = ze.return; s !== null; ) {
      var u = s;
      switch (Vl(u), u.tag) {
        case 1:
          u = u.type.childContextTypes, u != null && Ji();
          break;
        case 3:
          Ur(), Re(ct), Re(qe), Jl();
          break;
        case 5:
          Xl(u);
          break;
        case 4:
          Ur();
          break;
        case 13:
          Re(je);
          break;
        case 19:
          Re(je);
          break;
        case 10:
          Wl(u.type._context);
          break;
        case 22:
        case 23:
          Mu();
      }
      s = s.return;
    }
    if (Ge = t, ze = t = In(t.current, null), Xe = Tt = r, $e = 0, Xo = null, Tu = xs = or = 0, pt = Zo = null, tr !== null) {
      for (r = 0; r < tr.length; r++) if (s = tr[r], u = s.interleaved, u !== null) {
        s.interleaved = null;
        var h = u.next, g = s.pending;
        if (g !== null) {
          var T = g.next;
          g.next = h, u.next = T;
        }
        s.pending = u;
      }
      tr = null;
    }
    return t;
  }
  function Um(t, r) {
    do {
      var s = ze;
      try {
        if (Hl(), cs.current = ms, ds) {
          for (var u = Ie.memoizedState; u !== null; ) {
            var h = u.queue;
            h !== null && (h.pending = null), u = u.next;
          }
          ds = !1;
        }
        if (rr = 0, We = Ue = Ie = null, Ho = !1, Wo = 0, _u.current = null, s === null || s.return === null) {
          $e = 1, Xo = r, ze = null;
          break;
        }
        e: {
          var g = t, T = s.return, P = s, M = r;
          if (r = Xe, P.flags |= 32768, M !== null && typeof M == "object" && typeof M.then == "function") {
            var F = M, z = P, U = z.tag;
            if ((z.mode & 1) === 0 && (U === 0 || U === 11 || U === 15)) {
              var V = z.alternate;
              V ? (z.updateQueue = V.updateQueue, z.memoizedState = V.memoizedState, z.lanes = V.lanes) : (z.updateQueue = null, z.memoizedState = null);
            }
            var J = pm(T);
            if (J !== null) {
              J.flags &= -257, mm(J, T, P, g, r), J.mode & 1 && fm(g, F, r), r = J, M = F;
              var ne = r.updateQueue;
              if (ne === null) {
                var oe = /* @__PURE__ */ new Set();
                oe.add(M), r.updateQueue = oe;
              } else ne.add(M);
              break e;
            } else {
              if ((r & 1) === 0) {
                fm(g, F, r), Ru();
                break e;
              }
              M = Error(o(426));
            }
          } else if (De && P.mode & 1) {
            var Ve = pm(T);
            if (Ve !== null) {
              (Ve.flags & 65536) === 0 && (Ve.flags |= 256), mm(Ve, T, P, g, r), Ul($r(M, P));
              break e;
            }
          }
          g = M = $r(M, P), $e !== 4 && ($e = 2), Zo === null ? Zo = [g] : Zo.push(g), g = T;
          do {
            switch (g.tag) {
              case 3:
                g.flags |= 65536, r &= -r, g.lanes |= r;
                var j = cm(g, M, r);
                Op(g, j);
                break e;
              case 1:
                P = M;
                var R = g.type, I = g.stateNode;
                if ((g.flags & 128) === 0 && (typeof R.getDerivedStateFromError == "function" || I !== null && typeof I.componentDidCatch == "function" && (Rn === null || !Rn.has(I)))) {
                  g.flags |= 65536, r &= -r, g.lanes |= r;
                  var H = dm(g, P, r);
                  Op(g, H);
                  break e;
                }
            }
            g = g.return;
          } while (g !== null);
        }
        Wm(s);
      } catch (ie) {
        r = ie, ze === s && s !== null && (ze = s = s.return);
        continue;
      }
      break;
    } while (!0);
  }
  function $m() {
    var t = ws.current;
    return ws.current = ms, t === null ? ms : t;
  }
  function Ru() {
    ($e === 0 || $e === 3 || $e === 2) && ($e = 4), Ge === null || (or & 268435455) === 0 && (xs & 268435455) === 0 || jn(Ge, Xe);
  }
  function bs(t, r) {
    var s = ye;
    ye |= 2;
    var u = $m();
    (Ge !== t || Xe !== r) && (pn = null, sr(t, r));
    do
      try {
        hx();
        break;
      } catch (h) {
        Um(t, h);
      }
    while (!0);
    if (Hl(), ye = s, ws.current = u, ze !== null) throw Error(o(261));
    return Ge = null, Xe = 0, $e;
  }
  function hx() {
    for (; ze !== null; ) Hm(ze);
  }
  function yx() {
    for (; ze !== null && !BS(); ) Hm(ze);
  }
  function Hm(t) {
    var r = Ym(t.alternate, t, Tt);
    t.memoizedProps = t.pendingProps, r === null ? Wm(t) : ze = r, _u.current = null;
  }
  function Wm(t) {
    var r = t;
    do {
      var s = r.alternate;
      if (t = r.return, (r.flags & 32768) === 0) {
        if (s = lx(s, r, Tt), s !== null) {
          ze = s;
          return;
        }
      } else {
        if (s = ux(s, r), s !== null) {
          s.flags &= 32767, ze = s;
          return;
        }
        if (t !== null) t.flags |= 32768, t.subtreeFlags = 0, t.deletions = null;
        else {
          $e = 6, ze = null;
          return;
        }
      }
      if (r = r.sibling, r !== null) {
        ze = r;
        return;
      }
      ze = r = t;
    } while (r !== null);
    $e === 0 && ($e = 5);
  }
  function ar(t, r, s) {
    var u = _e, h = Et.transition;
    try {
      Et.transition = null, _e = 1, gx(t, r, s, u);
    } finally {
      Et.transition = h, _e = u;
    }
    return null;
  }
  function gx(t, r, s, u) {
    do
      Kr();
    while (Nn !== null);
    if ((ye & 6) !== 0) throw Error(o(327));
    s = t.finishedWork;
    var h = t.finishedLanes;
    if (s === null) return null;
    if (t.finishedWork = null, t.finishedLanes = 0, s === t.current) throw Error(o(177));
    t.callbackNode = null, t.callbackPriority = 0;
    var g = s.lanes | s.childLanes;
    if (ZS(t, g), t === Ge && (ze = Ge = null, Xe = 0), (s.subtreeFlags & 2064) === 0 && (s.flags & 2064) === 0 || Ts || (Ts = !0, Qm(Ri, function() {
      return Kr(), null;
    })), g = (s.flags & 15990) !== 0, (s.subtreeFlags & 15990) !== 0 || g) {
      g = Et.transition, Et.transition = null;
      var T = _e;
      _e = 1;
      var P = ye;
      ye |= 4, _u.current = null, dx(t, s), Im(s, t), Ow(Rl), Li = !!Ml, Rl = Ml = null, t.current = s, fx(s), US(), ye = P, _e = T, Et.transition = g;
    } else t.current = s;
    if (Ts && (Ts = !1, Nn = t, ks = h), g = t.pendingLanes, g === 0 && (Rn = null), WS(s.stateNode), mt(t, Le()), r !== null) for (u = t.onRecoverableError, s = 0; s < r.length; s++) h = r[s], u(h.value, { componentStack: h.stack, digest: h.digest });
    if (_s) throw _s = !1, t = Au, Au = null, t;
    return (ks & 1) !== 0 && t.tag !== 0 && Kr(), g = t.pendingLanes, (g & 1) !== 0 ? t === Cu ? Jo++ : (Jo = 0, Cu = t) : Jo = 0, bn(), null;
  }
  function Kr() {
    if (Nn !== null) {
      var t = Df(ks), r = Et.transition, s = _e;
      try {
        if (Et.transition = null, _e = 16 > t ? 16 : t, Nn === null) var u = !1;
        else {
          if (t = Nn, Nn = null, ks = 0, (ye & 6) !== 0) throw Error(o(331));
          var h = ye;
          for (ye |= 4, q = t.current; q !== null; ) {
            var g = q, T = g.child;
            if ((q.flags & 16) !== 0) {
              var P = g.deletions;
              if (P !== null) {
                for (var M = 0; M < P.length; M++) {
                  var F = P[M];
                  for (q = F; q !== null; ) {
                    var z = q;
                    switch (z.tag) {
                      case 0:
                      case 11:
                      case 15:
                        Qo(8, z, g);
                    }
                    var U = z.child;
                    if (U !== null) U.return = z, q = U;
                    else for (; q !== null; ) {
                      z = q;
                      var V = z.sibling, J = z.return;
                      if (Mm(z), z === F) {
                        q = null;
                        break;
                      }
                      if (V !== null) {
                        V.return = J, q = V;
                        break;
                      }
                      q = J;
                    }
                  }
                }
                var ne = g.alternate;
                if (ne !== null) {
                  var oe = ne.child;
                  if (oe !== null) {
                    ne.child = null;
                    do {
                      var Ve = oe.sibling;
                      oe.sibling = null, oe = Ve;
                    } while (oe !== null);
                  }
                }
                q = g;
              }
            }
            if ((g.subtreeFlags & 2064) !== 0 && T !== null) T.return = g, q = T;
            else e: for (; q !== null; ) {
              if (g = q, (g.flags & 2048) !== 0) switch (g.tag) {
                case 0:
                case 11:
                case 15:
                  Qo(9, g, g.return);
              }
              var j = g.sibling;
              if (j !== null) {
                j.return = g.return, q = j;
                break e;
              }
              q = g.return;
            }
          }
          var R = t.current;
          for (q = R; q !== null; ) {
            T = q;
            var I = T.child;
            if ((T.subtreeFlags & 2064) !== 0 && I !== null) I.return = T, q = I;
            else e: for (T = R; q !== null; ) {
              if (P = q, (P.flags & 2048) !== 0) try {
                switch (P.tag) {
                  case 0:
                  case 11:
                  case 15:
                    Ss(9, P);
                }
              } catch (ie) {
                Oe(P, P.return, ie);
              }
              if (P === T) {
                q = null;
                break e;
              }
              var H = P.sibling;
              if (H !== null) {
                H.return = P.return, q = H;
                break e;
              }
              q = P.return;
            }
          }
          if (ye = h, bn(), Kt && typeof Kt.onPostCommitFiberRoot == "function") try {
            Kt.onPostCommitFiberRoot(Ni, t);
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
  function Gm(t, r, s) {
    r = $r(s, r), r = cm(t, r, 1), t = En(t, r, 1), r = it(), t !== null && (_o(t, 1, r), mt(t, r));
  }
  function Oe(t, r, s) {
    if (t.tag === 3) Gm(t, t, s);
    else for (; r !== null; ) {
      if (r.tag === 3) {
        Gm(r, t, s);
        break;
      } else if (r.tag === 1) {
        var u = r.stateNode;
        if (typeof r.type.getDerivedStateFromError == "function" || typeof u.componentDidCatch == "function" && (Rn === null || !Rn.has(u))) {
          t = $r(s, t), t = dm(r, t, 1), r = En(r, t, 1), t = it(), r !== null && (_o(r, 1, t), mt(r, t));
          break;
        }
      }
      r = r.return;
    }
  }
  function vx(t, r, s) {
    var u = t.pingCache;
    u !== null && u.delete(r), r = it(), t.pingedLanes |= t.suspendedLanes & s, Ge === t && (Xe & s) === s && ($e === 4 || $e === 3 && (Xe & 130023424) === Xe && 500 > Le() - ku ? sr(t, 0) : Tu |= s), mt(t, r);
  }
  function Km(t, r) {
    r === 0 && ((t.mode & 1) === 0 ? r = 1 : (r = ji, ji <<= 1, (ji & 130023424) === 0 && (ji = 4194304)));
    var s = it();
    t = cn(t, r), t !== null && (_o(t, r, s), mt(t, s));
  }
  function Sx(t) {
    var r = t.memoizedState, s = 0;
    r !== null && (s = r.retryLane), Km(t, s);
  }
  function wx(t, r) {
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
    u !== null && u.delete(r), Km(t, s);
  }
  var Ym;
  Ym = function(t, r, s) {
    if (t !== null) if (t.memoizedProps !== r.pendingProps || ct.current) ft = !0;
    else {
      if ((t.lanes & s) === 0 && (r.flags & 128) === 0) return ft = !1, ax(t, r, s);
      ft = (t.flags & 131072) !== 0;
    }
    else ft = !1, De && (r.flags & 1048576) !== 0 && bp(r, ns, r.index);
    switch (r.lanes = 0, r.tag) {
      case 2:
        var u = r.type;
        gs(t, r), t = r.pendingProps;
        var h = Ir(r, qe.current);
        Br(r, s), h = tu(null, r, u, t, h, s);
        var g = nu();
        return r.flags |= 1, typeof h == "object" && h !== null && typeof h.render == "function" && h.$$typeof === void 0 ? (r.tag = 1, r.memoizedState = null, r.updateQueue = null, dt(u) ? (g = !0, qi(r)) : g = !1, r.memoizedState = h.state !== null && h.state !== void 0 ? h.state : null, Yl(r), h.updater = hs, r.stateNode = h, h._reactInternals = r, lu(r, u, t, s), r = fu(null, r, u, !0, g, s)) : (r.tag = 0, De && g && Ll(r), ot(null, r, h, s), r = r.child), r;
      case 16:
        u = r.elementType;
        e: {
          switch (gs(t, r), t = r.pendingProps, h = u._init, u = h(u._payload), r.type = u, h = r.tag = _x(u), t = Lt(u, t), h) {
            case 0:
              r = du(null, r, u, t, s);
              break e;
            case 1:
              r = wm(null, r, u, t, s);
              break e;
            case 11:
              r = hm(null, r, u, t, s);
              break e;
            case 14:
              r = ym(null, r, u, Lt(u.type, t), s);
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
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Lt(u, h), du(t, r, u, h, s);
      case 1:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Lt(u, h), wm(t, r, u, h, s);
      case 3:
        e: {
          if (xm(r), t === null) throw Error(o(387));
          u = r.pendingProps, g = r.memoizedState, h = g.element, Fp(t, r), ls(r, u, null, s);
          var T = r.memoizedState;
          if (u = T.element, g.isDehydrated) if (g = { element: u, isDehydrated: !1, cache: T.cache, pendingSuspenseBoundaries: T.pendingSuspenseBoundaries, transitions: T.transitions }, r.updateQueue.baseState = g, r.memoizedState = g, r.flags & 256) {
            h = $r(Error(o(423)), r), r = _m(t, r, u, s, h);
            break e;
          } else if (u !== h) {
            h = $r(Error(o(424)), r), r = _m(t, r, u, s, h);
            break e;
          } else for (_t = kn(r.stateNode.containerInfo.firstChild), xt = r, De = !0, Ot = null, s = jp(r, null, u, s), r.child = s; s; ) s.flags = s.flags & -3 | 4096, s = s.sibling;
          else {
            if (Lr(), u === h) {
              r = fn(t, r, s);
              break e;
            }
            ot(t, r, u, s);
          }
          r = r.child;
        }
        return r;
      case 5:
        return Vp(r), t === null && Bl(r), u = r.type, h = r.pendingProps, g = t !== null ? t.memoizedProps : null, T = h.children, Nl(u, h) ? T = null : g !== null && Nl(u, g) && (r.flags |= 32), Sm(t, r), ot(t, r, T, s), r.child;
      case 6:
        return t === null && Bl(r), null;
      case 13:
        return Tm(t, r, s);
      case 4:
        return Ql(r, r.stateNode.containerInfo), u = r.pendingProps, t === null ? r.child = Vr(r, null, u, s) : ot(t, r, u, s), r.child;
      case 11:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Lt(u, h), hm(t, r, u, h, s);
      case 7:
        return ot(t, r, r.pendingProps, s), r.child;
      case 8:
        return ot(t, r, r.pendingProps.children, s), r.child;
      case 12:
        return ot(t, r, r.pendingProps.children, s), r.child;
      case 10:
        e: {
          if (u = r.type._context, h = r.pendingProps, g = r.memoizedProps, T = h.value, Pe(is, u._currentValue), u._currentValue = T, g !== null) if (Ft(g.value, T)) {
            if (g.children === h.children && !ct.current) {
              r = fn(t, r, s);
              break e;
            }
          } else for (g = r.child, g !== null && (g.return = r); g !== null; ) {
            var P = g.dependencies;
            if (P !== null) {
              T = g.child;
              for (var M = P.firstContext; M !== null; ) {
                if (M.context === u) {
                  if (g.tag === 1) {
                    M = dn(-1, s & -s), M.tag = 2;
                    var F = g.updateQueue;
                    if (F !== null) {
                      F = F.shared;
                      var z = F.pending;
                      z === null ? M.next = M : (M.next = z.next, z.next = M), F.pending = M;
                    }
                  }
                  g.lanes |= s, M = g.alternate, M !== null && (M.lanes |= s), Gl(
                    g.return,
                    s,
                    r
                  ), P.lanes |= s;
                  break;
                }
                M = M.next;
              }
            } else if (g.tag === 10) T = g.type === r.type ? null : g.child;
            else if (g.tag === 18) {
              if (T = g.return, T === null) throw Error(o(341));
              T.lanes |= s, P = T.alternate, P !== null && (P.lanes |= s), Gl(T, s, r), T = g.sibling;
            } else T = g.child;
            if (T !== null) T.return = g;
            else for (T = g; T !== null; ) {
              if (T === r) {
                T = null;
                break;
              }
              if (g = T.sibling, g !== null) {
                g.return = T.return, T = g;
                break;
              }
              T = T.return;
            }
            g = T;
          }
          ot(t, r, h.children, s), r = r.child;
        }
        return r;
      case 9:
        return h = r.type, u = r.pendingProps.children, Br(r, s), h = bt(h), u = u(h), r.flags |= 1, ot(t, r, u, s), r.child;
      case 14:
        return u = r.type, h = Lt(u, r.pendingProps), h = Lt(u.type, h), ym(t, r, u, h, s);
      case 15:
        return gm(t, r, r.type, r.pendingProps, s);
      case 17:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Lt(u, h), gs(t, r), r.tag = 1, dt(u) ? (t = !0, qi(r)) : t = !1, Br(r, s), lm(r, u, h), lu(r, u, h, s), fu(null, r, u, !0, t, s);
      case 19:
        return Am(t, r, s);
      case 22:
        return vm(t, r, s);
    }
    throw Error(o(156, r.tag));
  };
  function Qm(t, r) {
    return Pf(t, r);
  }
  function xx(t, r, s, u) {
    this.tag = t, this.key = s, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = r, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = u, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function Mt(t, r, s, u) {
    return new xx(t, r, s, u);
  }
  function Nu(t) {
    return t = t.prototype, !(!t || !t.isReactComponent);
  }
  function _x(t) {
    if (typeof t == "function") return Nu(t) ? 1 : 0;
    if (t != null) {
      if (t = t.$$typeof, t === ce) return 11;
      if (t === we) return 14;
    }
    return 2;
  }
  function In(t, r) {
    var s = t.alternate;
    return s === null ? (s = Mt(t.tag, r, t.key, t.mode), s.elementType = t.elementType, s.type = t.type, s.stateNode = t.stateNode, s.alternate = t, t.alternate = s) : (s.pendingProps = r, s.type = t.type, s.flags = 0, s.subtreeFlags = 0, s.deletions = null), s.flags = t.flags & 14680064, s.childLanes = t.childLanes, s.lanes = t.lanes, s.child = t.child, s.memoizedProps = t.memoizedProps, s.memoizedState = t.memoizedState, s.updateQueue = t.updateQueue, r = t.dependencies, s.dependencies = r === null ? null : { lanes: r.lanes, firstContext: r.firstContext }, s.sibling = t.sibling, s.index = t.index, s.ref = t.ref, s;
  }
  function Ps(t, r, s, u, h, g) {
    var T = 2;
    if (u = t, typeof t == "function") Nu(t) && (T = 1);
    else if (typeof t == "string") T = 5;
    else e: switch (t) {
      case W:
        return lr(s.children, h, g, r);
      case $:
        T = 8, h |= 8;
        break;
      case G:
        return t = Mt(12, s, r, h | 2), t.elementType = G, t.lanes = g, t;
      case he:
        return t = Mt(13, s, r, h), t.elementType = he, t.lanes = g, t;
      case pe:
        return t = Mt(19, s, r, h), t.elementType = pe, t.lanes = g, t;
      case me:
        return Es(s, h, g, r);
      default:
        if (typeof t == "object" && t !== null) switch (t.$$typeof) {
          case Z:
            T = 10;
            break e;
          case te:
            T = 9;
            break e;
          case ce:
            T = 11;
            break e;
          case we:
            T = 14;
            break e;
          case Q:
            T = 16, u = null;
            break e;
        }
        throw Error(o(130, t == null ? t : typeof t, ""));
    }
    return r = Mt(T, s, r, h), r.elementType = t, r.type = u, r.lanes = g, r;
  }
  function lr(t, r, s, u) {
    return t = Mt(7, t, u, r), t.lanes = s, t;
  }
  function Es(t, r, s, u) {
    return t = Mt(22, t, u, r), t.elementType = me, t.lanes = s, t.stateNode = { isHidden: !1 }, t;
  }
  function Du(t, r, s) {
    return t = Mt(6, t, null, r), t.lanes = s, t;
  }
  function ju(t, r, s) {
    return r = Mt(4, t.children !== null ? t.children : [], t.key, r), r.lanes = s, r.stateNode = { containerInfo: t.containerInfo, pendingChildren: null, implementation: t.implementation }, r;
  }
  function Tx(t, r, s, u, h) {
    this.tag = r, this.containerInfo = t, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = al(0), this.expirationTimes = al(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = al(0), this.identifierPrefix = u, this.onRecoverableError = h, this.mutableSourceEagerHydrationData = null;
  }
  function Iu(t, r, s, u, h, g, T, P, M) {
    return t = new Tx(t, r, s, P, M), r === 1 ? (r = 1, g === !0 && (r |= 8)) : r = 0, g = Mt(3, null, null, r), t.current = g, g.stateNode = t, g.memoizedState = { element: u, isDehydrated: s, cache: null, transitions: null, pendingSuspenseBoundaries: null }, Yl(g), t;
  }
  function kx(t, r, s) {
    var u = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return { $$typeof: K, key: u == null ? null : "" + u, children: t, containerInfo: r, implementation: s };
  }
  function Xm(t) {
    if (!t) return Cn;
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
      if (dt(s)) return kp(t, s, r);
    }
    return r;
  }
  function Zm(t, r, s, u, h, g, T, P, M) {
    return t = Iu(s, u, !0, t, h, g, T, P, M), t.context = Xm(null), s = t.current, u = it(), h = Dn(s), g = dn(u, h), g.callback = r ?? null, En(s, g, h), t.current.lanes = h, _o(t, h, u), mt(t, u), t;
  }
  function Ms(t, r, s, u) {
    var h = r.current, g = it(), T = Dn(h);
    return s = Xm(s), r.context === null ? r.context = s : r.pendingContext = s, r = dn(g, T), r.payload = { element: t }, u = u === void 0 ? null : u, u !== null && (r.callback = u), t = En(h, r, T), t !== null && (Bt(t, h, T, g), as(t, h, T)), T;
  }
  function Rs(t) {
    if (t = t.current, !t.child) return null;
    switch (t.child.tag) {
      case 5:
        return t.child.stateNode;
      default:
        return t.child.stateNode;
    }
  }
  function Jm(t, r) {
    if (t = t.memoizedState, t !== null && t.dehydrated !== null) {
      var s = t.retryLane;
      t.retryLane = s !== 0 && s < r ? s : r;
    }
  }
  function Fu(t, r) {
    Jm(t, r), (t = t.alternate) && Jm(t, r);
  }
  function Ax() {
    return null;
  }
  var qm = typeof reportError == "function" ? reportError : function(t) {
    console.error(t);
  };
  function Ou(t) {
    this._internalRoot = t;
  }
  Ns.prototype.render = Ou.prototype.render = function(t) {
    var r = this._internalRoot;
    if (r === null) throw Error(o(409));
    Ms(t, r, null, null);
  }, Ns.prototype.unmount = Ou.prototype.unmount = function() {
    var t = this._internalRoot;
    if (t !== null) {
      this._internalRoot = null;
      var r = t.containerInfo;
      ir(function() {
        Ms(null, t, null, null);
      }), r[sn] = null;
    }
  };
  function Ns(t) {
    this._internalRoot = t;
  }
  Ns.prototype.unstable_scheduleHydration = function(t) {
    if (t) {
      var r = Ff();
      t = { blockedOn: null, target: t, priority: r };
      for (var s = 0; s < xn.length && r !== 0 && r < xn[s].priority; s++) ;
      xn.splice(s, 0, t), s === 0 && Vf(t);
    }
  };
  function Lu(t) {
    return !(!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11);
  }
  function Ds(t) {
    return !(!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11 && (t.nodeType !== 8 || t.nodeValue !== " react-mount-point-unstable "));
  }
  function eh() {
  }
  function Cx(t, r, s, u, h) {
    if (h) {
      if (typeof u == "function") {
        var g = u;
        u = function() {
          var F = Rs(T);
          g.call(F);
        };
      }
      var T = Zm(r, u, t, 0, null, !1, !1, "", eh);
      return t._reactRootContainer = T, t[sn] = T.current, Fo(t.nodeType === 8 ? t.parentNode : t), ir(), T;
    }
    for (; h = t.lastChild; ) t.removeChild(h);
    if (typeof u == "function") {
      var P = u;
      u = function() {
        var F = Rs(M);
        P.call(F);
      };
    }
    var M = Iu(t, 0, !1, null, null, !1, !1, "", eh);
    return t._reactRootContainer = M, t[sn] = M.current, Fo(t.nodeType === 8 ? t.parentNode : t), ir(function() {
      Ms(r, M, s, u);
    }), M;
  }
  function js(t, r, s, u, h) {
    var g = s._reactRootContainer;
    if (g) {
      var T = g;
      if (typeof h == "function") {
        var P = h;
        h = function() {
          var M = Rs(T);
          P.call(M);
        };
      }
      Ms(r, T, t, h);
    } else T = Cx(s, r, t, h, u);
    return Rs(T);
  }
  jf = function(t) {
    switch (t.tag) {
      case 3:
        var r = t.stateNode;
        if (r.current.memoizedState.isDehydrated) {
          var s = xo(r.pendingLanes);
          s !== 0 && (ll(r, s | 1), mt(r, Le()), (ye & 6) === 0 && (Gr = Le() + 500, bn()));
        }
        break;
      case 13:
        ir(function() {
          var u = cn(t, 1);
          if (u !== null) {
            var h = it();
            Bt(u, t, 1, h);
          }
        }), Fu(t, 1);
    }
  }, ul = function(t) {
    if (t.tag === 13) {
      var r = cn(t, 134217728);
      if (r !== null) {
        var s = it();
        Bt(r, t, 134217728, s);
      }
      Fu(t, 134217728);
    }
  }, If = function(t) {
    if (t.tag === 13) {
      var r = Dn(t), s = cn(t, r);
      if (s !== null) {
        var u = it();
        Bt(s, t, r, u);
      }
      Fu(t, r);
    }
  }, Ff = function() {
    return _e;
  }, Of = function(t, r) {
    var s = _e;
    try {
      return _e = t, r();
    } finally {
      _e = s;
    }
  }, tl = function(t, r, s) {
    switch (r) {
      case "input":
        if (Ka(t, s), r = s.name, s.type === "radio" && r != null) {
          for (s = t; s.parentNode; ) s = s.parentNode;
          for (s = s.querySelectorAll("input[name=" + JSON.stringify("" + r) + '][type="radio"]'), r = 0; r < s.length; r++) {
            var u = s[r];
            if (u !== t && u.form === t.form) {
              var h = Zi(u);
              if (!h) throw Error(o(90));
              af(u), Ka(u, h);
            }
          }
        }
        break;
      case "textarea":
        ff(t, s);
        break;
      case "select":
        r = s.value, r != null && Tr(t, !!s.multiple, r, !1);
    }
  }, xf = Eu, _f = ir;
  var bx = { usingClientEntryPoint: !1, Events: [Vo, Dr, Zi, Sf, wf, Eu] }, qo = { findFiberByHostInstance: Zn, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, Px = { bundleType: qo.bundleType, version: qo.version, rendererPackageName: qo.rendererPackageName, rendererConfig: qo.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: D.ReactCurrentDispatcher, findHostInstanceByFiber: function(t) {
    return t = Cf(t), t === null ? null : t.stateNode;
  }, findFiberByHostInstance: qo.findFiberByHostInstance || Ax, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Is = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Is.isDisabled && Is.supportsFiber) try {
      Ni = Is.inject(Px), Kt = Is;
    } catch {
    }
  }
  return ht.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = bx, ht.createPortal = function(t, r) {
    var s = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!Lu(r)) throw Error(o(200));
    return kx(t, r, null, s);
  }, ht.createRoot = function(t, r) {
    if (!Lu(t)) throw Error(o(299));
    var s = !1, u = "", h = qm;
    return r != null && (r.unstable_strictMode === !0 && (s = !0), r.identifierPrefix !== void 0 && (u = r.identifierPrefix), r.onRecoverableError !== void 0 && (h = r.onRecoverableError)), r = Iu(t, 1, !1, null, null, s, !1, u, h), t[sn] = r.current, Fo(t.nodeType === 8 ? t.parentNode : t), new Ou(r);
  }, ht.findDOMNode = function(t) {
    if (t == null) return null;
    if (t.nodeType === 1) return t;
    var r = t._reactInternals;
    if (r === void 0)
      throw typeof t.render == "function" ? Error(o(188)) : (t = Object.keys(t).join(","), Error(o(268, t)));
    return t = Cf(r), t = t === null ? null : t.stateNode, t;
  }, ht.flushSync = function(t) {
    return ir(t);
  }, ht.hydrate = function(t, r, s) {
    if (!Ds(r)) throw Error(o(200));
    return js(null, t, r, !0, s);
  }, ht.hydrateRoot = function(t, r, s) {
    if (!Lu(t)) throw Error(o(405));
    var u = s != null && s.hydratedSources || null, h = !1, g = "", T = qm;
    if (s != null && (s.unstable_strictMode === !0 && (h = !0), s.identifierPrefix !== void 0 && (g = s.identifierPrefix), s.onRecoverableError !== void 0 && (T = s.onRecoverableError)), r = Zm(r, null, t, 1, s ?? null, h, !1, g, T), t[sn] = r.current, Fo(t), u) for (t = 0; t < u.length; t++) s = u[t], h = s._getVersion, h = h(s._source), r.mutableSourceEagerHydrationData == null ? r.mutableSourceEagerHydrationData = [s, h] : r.mutableSourceEagerHydrationData.push(
      s,
      h
    );
    return new Ns(r);
  }, ht.render = function(t, r, s) {
    if (!Ds(r)) throw Error(o(200));
    return js(null, t, r, !1, s);
  }, ht.unmountComponentAtNode = function(t) {
    if (!Ds(t)) throw Error(o(40));
    return t._reactRootContainer ? (ir(function() {
      js(null, null, t, !1, function() {
        t._reactRootContainer = null, t[sn] = null;
      });
    }), !0) : !1;
  }, ht.unstable_batchedUpdates = Eu, ht.unstable_renderSubtreeIntoContainer = function(t, r, s, u) {
    if (!Ds(s)) throw Error(o(200));
    if (t == null || t._reactInternals === void 0) throw Error(o(38));
    return js(t, r, s, !1, u);
  }, ht.version = "18.3.1-next-f1338f8080-20240426", ht;
}
var uh;
function Sg() {
  if (uh) return zu.exports;
  uh = 1;
  function e() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(e);
      } catch (n) {
        console.error(n);
      }
  }
  return e(), zu.exports = Vx(), zu.exports;
}
var ch;
function zx() {
  if (ch) return Fs;
  ch = 1;
  var e = Sg();
  return Fs.createRoot = e.createRoot, Fs.hydrateRoot = e.hydrateRoot, Fs;
}
var Bx = zx(), $u = { exports: {} }, ti = {};
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var dh;
function Ux() {
  if (dh) return ti;
  dh = 1;
  var e = ad(), n = Symbol.for("react.element"), o = Symbol.for("react.fragment"), i = Object.prototype.hasOwnProperty, a = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, d = { key: !0, ref: !0, __self: !0, __source: !0 };
  function f(p, m, y) {
    var v, l = {}, c = null, S = null;
    y !== void 0 && (c = "" + y), m.key !== void 0 && (c = "" + m.key), m.ref !== void 0 && (S = m.ref);
    for (v in m) i.call(m, v) && !d.hasOwnProperty(v) && (l[v] = m[v]);
    if (p && p.defaultProps) for (v in m = p.defaultProps, m) l[v] === void 0 && (l[v] = m[v]);
    return { $$typeof: n, type: p, key: c, ref: S, props: l, _owner: a.current };
  }
  return ti.Fragment = o, ti.jsx = f, ti.jsxs = f, ti;
}
var fh;
function $x() {
  return fh || (fh = 1, $u.exports = Ux()), $u.exports;
}
var w = $x();
const ph = (e) => Symbol.iterator in e, mh = (e) => (
  // HACK: avoid checking entries type
  "entries" in e
), hh = (e, n) => {
  const o = e instanceof Map ? e : new Map(e.entries()), i = n instanceof Map ? n : new Map(n.entries());
  if (o.size !== i.size)
    return !1;
  for (const [a, d] of o)
    if (!i.has(a) || !Object.is(d, i.get(a)))
      return !1;
  return !0;
}, Hx = (e, n) => {
  const o = e[Symbol.iterator](), i = n[Symbol.iterator]();
  let a = o.next(), d = i.next();
  for (; !a.done && !d.done; ) {
    if (!Object.is(a.value, d.value))
      return !1;
    a = o.next(), d = i.next();
  }
  return !!a.done && !!d.done;
};
function Wx(e, n) {
  return Object.is(e, n) ? !0 : typeof e != "object" || e === null || typeof n != "object" || n === null || Object.getPrototypeOf(e) !== Object.getPrototypeOf(n) ? !1 : ph(e) && ph(n) ? mh(e) && mh(n) ? hh(e, n) : Hx(e, n) : hh(
    { entries: () => Object.entries(e) },
    { entries: () => Object.entries(n) }
  );
}
function Gx(e) {
  const n = hn.useRef(void 0);
  return (o) => {
    const i = e(o);
    return Wx(n.current, i) ? n.current : n.current = i;
  };
}
const ud = C.createContext({});
function cd(e) {
  const n = C.useRef(null);
  return n.current === null && (n.current = e()), n.current;
}
const Kx = typeof window < "u", dd = Kx ? C.useLayoutEffect : C.useEffect, Na = /* @__PURE__ */ C.createContext(null);
function fd(e, n) {
  e.indexOf(n) === -1 && e.push(n);
}
function fa(e, n) {
  const o = e.indexOf(n);
  o > -1 && e.splice(o, 1);
}
const on = (e, n, o) => o > n ? n : o < e ? e : o;
function yh(e, n) {
  return n ? `${e}. For more information and steps for solving, visit https://motion.dev/troubleshooting/${n}` : e;
}
let wi = () => {
}, _r = () => {
};
var pg;
typeof process < "u" && ((pg = process.env) == null ? void 0 : pg.NODE_ENV) !== "production" && (wi = (e, n, o) => {
  !e && typeof console < "u" && console.warn(yh(n, o));
}, _r = (e, n, o) => {
  if (!e)
    throw new Error(yh(n, o));
});
const Gn = {}, wg = (e) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(e), xg = (e) => typeof e == "object" && e !== null, _g = (e) => /^0[^.\s]+$/u.test(e);
// @__NO_SIDE_EFFECTS__
function Tg(e) {
  let n;
  return () => (n === void 0 && (n = e()), n);
}
const jt = /* @__NO_SIDE_EFFECTS__ */ (e) => e, xi = (...e) => e.reduce((n, o) => (i) => o(n(i))), pi = /* @__NO_SIDE_EFFECTS__ */ (e, n, o) => {
  const i = n - e;
  return i ? (o - e) / i : 1;
};
class pd {
  constructor() {
    this.subscriptions = [];
  }
  add(n) {
    return fd(this.subscriptions, n), () => fa(this.subscriptions, n);
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
const gt = /* @__NO_SIDE_EFFECTS__ */ (e) => e * 1e3, Dt = /* @__NO_SIDE_EFFECTS__ */ (e) => e / 1e3, kg = /* @__NO_SIDE_EFFECTS__ */ (e, n) => n ? e * (1e3 / n) : 0, Ag = (e, n, o) => (((1 - 3 * o + 3 * n) * e + (3 * o - 6 * n)) * e + 3 * n) * e, Yx = 1e-7, Qx = 12;
function Xx(e, n, o, i, a) {
  let d, f, p = 0;
  do
    f = n + (o - n) / 2, d = Ag(f, i, a) - e, d > 0 ? o = f : n = f;
  while (Math.abs(d) > Yx && ++p < Qx);
  return f;
}
// @__NO_SIDE_EFFECTS__
function _i(e, n, o, i) {
  if (e === n && o === i)
    return jt;
  const a = (d) => Xx(d, 0, 1, e, o);
  return (d) => d === 0 || d === 1 ? d : Ag(a(d), n, i);
}
const Cg = /* @__NO_SIDE_EFFECTS__ */ (e) => (n) => n <= 0.5 ? e(2 * n) / 2 : (2 - e(2 * (1 - n))) / 2, bg = /* @__NO_SIDE_EFFECTS__ */ (e) => (n) => 1 - e(1 - n), Pg = /* @__PURE__ */ _i(0.33, 1.53, 0.69, 0.99), md = /* @__PURE__ */ bg(Pg), Eg = /* @__PURE__ */ Cg(md), Mg = (e) => e >= 1 ? 1 : (e *= 2) < 1 ? 0.5 * md(e) : 0.5 * (2 - Math.pow(2, -10 * (e - 1))), hd = (e) => 1 - Math.sin(Math.acos(e)), Rg = /* @__PURE__ */ bg(hd), Ng = /* @__PURE__ */ Cg(hd), Zx = /* @__PURE__ */ _i(0.42, 0, 1, 1), Jx = /* @__PURE__ */ _i(0, 0, 0.58, 1), Dg = /* @__PURE__ */ _i(0.42, 0, 0.58, 1), qx = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] != "number", jg = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] == "number", gh = {
  linear: jt,
  easeIn: Zx,
  easeInOut: Dg,
  easeOut: Jx,
  circIn: hd,
  circInOut: Ng,
  circOut: Rg,
  backIn: md,
  backInOut: Eg,
  backOut: Pg,
  anticipate: Mg
}, e1 = (e) => typeof e == "string", vh = (e) => {
  if (/* @__PURE__ */ jg(e)) {
    _r(e.length === 4, "Cubic bezier arrays must contain four numerical values.", "cubic-bezier-length");
    const [n, o, i, a] = e;
    return /* @__PURE__ */ _i(n, o, i, a);
  } else if (e1(e))
    return _r(gh[e] !== void 0, `Invalid easing type '${e}'`, "invalid-easing-type"), gh[e];
  return e;
}, Os = [
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
function t1(e) {
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
    schedule: (y, v = !1, l = !1) => {
      const S = l && i ? n : o;
      return v && d.add(y), S.add(y), y;
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
      const v = n;
      n = o, o = v, n.forEach(p), n.clear(), i = !1, a && (a = !1, m.process(y));
    }
  };
  return m;
}
const n1 = 40;
function Ig(e, n) {
  let o = !1, i = !0;
  const a = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  }, d = () => o = !0, f = Os.reduce((E, D) => (E[D] = t1(d), E), {}), { setup: p, read: m, resolveKeyframes: y, preUpdate: v, update: l, preRender: c, render: S, postRender: x } = f, k = () => {
    const E = Gn.useManualTiming, D = E ? a.timestamp : performance.now();
    o = !1, E || (a.delta = i ? 1e3 / 60 : Math.max(Math.min(D - a.timestamp, n1), 1)), a.timestamp = D, a.isProcessing = !0, p.process(a), m.process(a), y.process(a), v.process(a), l.process(a), c.process(a), S.process(a), x.process(a), a.isProcessing = !1, o && n && (i = !1, e(k));
  }, A = () => {
    o = !0, i = !0, a.isProcessing || e(k);
  };
  return { schedule: Os.reduce((E, D) => {
    const O = f[D];
    return E[D] = (K, W = !1, $ = !1) => (o || A(), O.schedule(K, W, $)), E;
  }, {}), cancel: (E) => {
    for (let D = 0; D < Os.length; D++)
      f[Os[D]].cancel(E);
  }, state: a, steps: f };
}
const { schedule: Ce, cancel: Kn, state: Ze, steps: Hu } = /* @__PURE__ */ Ig(typeof requestAnimationFrame < "u" ? requestAnimationFrame : jt, !0);
let Js;
function r1() {
  Js = void 0;
}
const at = {
  now: () => (Js === void 0 && at.set(Ze.isProcessing || Gn.useManualTiming ? Ze.timestamp : performance.now()), Js),
  set: (e) => {
    Js = e, queueMicrotask(r1);
  }
}, Fg = (e) => (n) => typeof n == "string" && n.startsWith(e), Og = /* @__PURE__ */ Fg("--"), o1 = /* @__PURE__ */ Fg("var(--"), yd = (e) => o1(e) ? i1.test(e.split("/*")[0].trim()) : !1, i1 = /var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;
function Sh(e) {
  return typeof e != "string" ? !1 : e.split("/*")[0].includes("var(--");
}
const co = {
  test: (e) => typeof e == "number",
  parse: parseFloat,
  transform: (e) => e
}, mi = {
  ...co,
  transform: (e) => on(0, 1, e)
}, Ls = {
  ...co,
  default: 1
}, si = (e) => Math.round(e * 1e5) / 1e5, gd = /-?(?:\d+(?:\.\d+)?|\.\d+)/gu;
function s1(e) {
  return e == null;
}
const a1 = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu, vd = (e, n) => (o) => !!(typeof o == "string" && a1.test(o) && o.startsWith(e) || n && !s1(o) && Object.prototype.hasOwnProperty.call(o, n)), Lg = (e, n, o) => (i) => {
  if (typeof i != "string")
    return i;
  const [a, d, f, p] = i.match(gd);
  return {
    [e]: parseFloat(a),
    [n]: parseFloat(d),
    [o]: parseFloat(f),
    alpha: p !== void 0 ? parseFloat(p) : 1
  };
}, l1 = (e) => on(0, 255, e), Wu = {
  ...co,
  transform: (e) => Math.round(l1(e))
}, hr = {
  test: /* @__PURE__ */ vd("rgb", "red"),
  parse: /* @__PURE__ */ Lg("red", "green", "blue"),
  transform: ({ red: e, green: n, blue: o, alpha: i = 1 }) => "rgba(" + Wu.transform(e) + ", " + Wu.transform(n) + ", " + Wu.transform(o) + ", " + si(mi.transform(i)) + ")"
};
function u1(e) {
  let n = "", o = "", i = "", a = "";
  return e.length > 5 ? (n = e.substring(1, 3), o = e.substring(3, 5), i = e.substring(5, 7), a = e.substring(7, 9)) : (n = e.substring(1, 2), o = e.substring(2, 3), i = e.substring(3, 4), a = e.substring(4, 5), n += n, o += o, i += i, a += a), {
    red: parseInt(n, 16),
    green: parseInt(o, 16),
    blue: parseInt(i, 16),
    alpha: a ? parseInt(a, 16) / 255 : 1
  };
}
const vc = {
  test: /* @__PURE__ */ vd("#"),
  parse: u1,
  transform: hr.transform
}, Ti = /* @__NO_SIDE_EFFECTS__ */ (e) => ({
  test: (n) => typeof n == "string" && n.endsWith(e) && n.split(" ").length === 1,
  parse: parseFloat,
  transform: (n) => `${n}${e}`
}), mn = /* @__PURE__ */ Ti("deg"), rn = /* @__PURE__ */ Ti("%"), re = /* @__PURE__ */ Ti("px"), c1 = /* @__PURE__ */ Ti("vh"), d1 = /* @__PURE__ */ Ti("vw"), wh = {
  ...rn,
  parse: (e) => rn.parse(e) / 100,
  transform: (e) => rn.transform(e * 100)
}, eo = {
  test: /* @__PURE__ */ vd("hsl", "hue"),
  parse: /* @__PURE__ */ Lg("hue", "saturation", "lightness"),
  transform: ({ hue: e, saturation: n, lightness: o, alpha: i = 1 }) => "hsla(" + Math.round(e) + ", " + rn.transform(si(n)) + ", " + rn.transform(si(o)) + ", " + si(mi.transform(i)) + ")"
}, Be = {
  test: (e) => hr.test(e) || vc.test(e) || eo.test(e),
  parse: (e) => hr.test(e) ? hr.parse(e) : eo.test(e) ? eo.parse(e) : vc.parse(e),
  transform: (e) => typeof e == "string" ? e : e.hasOwnProperty("red") ? hr.transform(e) : eo.transform(e),
  getAnimatableNone: (e) => {
    const n = Be.parse(e);
    return n.alpha = 0, Be.transform(n);
  }
}, f1 = /(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;
function p1(e) {
  var n, o;
  return isNaN(e) && typeof e == "string" && (((n = e.match(gd)) == null ? void 0 : n.length) || 0) + (((o = e.match(f1)) == null ? void 0 : o.length) || 0) > 0;
}
const Vg = "number", zg = "color", m1 = "var", h1 = "var(", xh = "${}", y1 = /var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;
function io(e) {
  const n = e.toString(), o = [], i = {
    color: [],
    number: [],
    var: []
  }, a = [];
  let d = 0;
  const p = n.replace(y1, (m) => (Be.test(m) ? (i.color.push(d), a.push(zg), o.push(Be.parse(m))) : m.startsWith(h1) ? (i.var.push(d), a.push(m1), o.push(m)) : (i.number.push(d), a.push(Vg), o.push(parseFloat(m))), ++d, xh)).split(xh);
  return { values: o, split: p, indexes: i, types: a };
}
function g1(e) {
  return io(e).values;
}
function Bg({ split: e, types: n }) {
  const o = e.length;
  return (i) => {
    let a = "";
    for (let d = 0; d < o; d++)
      if (a += e[d], i[d] !== void 0) {
        const f = n[d];
        f === Vg ? a += si(i[d]) : f === zg ? a += Be.transform(i[d]) : a += i[d];
      }
    return a;
  };
}
function v1(e) {
  return Bg(io(e));
}
const S1 = (e) => typeof e == "number" ? 0 : Be.test(e) ? Be.getAnimatableNone(e) : e, w1 = (e, n) => typeof e == "number" ? n != null && n.trim().endsWith("/") ? e : 0 : S1(e);
function x1(e) {
  const n = io(e);
  return Bg(n)(n.values.map((i, a) => w1(i, n.split[a])));
}
const Wt = {
  test: p1,
  parse: g1,
  createTransformer: v1,
  getAnimatableNone: x1
};
function Gu(e, n, o) {
  return o < 0 && (o += 1), o > 1 && (o -= 1), o < 1 / 6 ? e + (n - e) * 6 * o : o < 1 / 2 ? n : o < 2 / 3 ? e + (n - e) * (2 / 3 - o) * 6 : e;
}
function _1({ hue: e, saturation: n, lightness: o, alpha: i }) {
  e /= 360, n /= 100, o /= 100;
  let a = 0, d = 0, f = 0;
  if (!n)
    a = d = f = o;
  else {
    const p = o < 0.5 ? o * (1 + n) : o + n - o * n, m = 2 * o - p;
    a = Gu(m, p, e + 1 / 3), d = Gu(m, p, e), f = Gu(m, p, e - 1 / 3);
  }
  return {
    red: Math.round(a * 255),
    green: Math.round(d * 255),
    blue: Math.round(f * 255),
    alpha: i
  };
}
function pa(e, n) {
  return (o) => o > 0 ? n : e;
}
const Ae = (e, n, o) => e + (n - e) * o, Ku = (e, n, o) => {
  const i = e * e, a = o * (n * n - i) + i;
  return a < 0 ? 0 : Math.sqrt(a);
}, T1 = [vc, hr, eo], k1 = (e) => T1.find((n) => n.test(e));
function _h(e) {
  const n = k1(e);
  if (wi(!!n, `'${e}' is not an animatable color. Use the equivalent color code instead.`, "color-not-animatable"), !n)
    return !1;
  let o = n.parse(e);
  return n === eo && (o = _1(o)), o;
}
const Th = (e, n) => {
  const o = _h(e), i = _h(n);
  if (!o || !i)
    return pa(e, n);
  const a = { ...o };
  return (d) => (a.red = Ku(o.red, i.red, d), a.green = Ku(o.green, i.green, d), a.blue = Ku(o.blue, i.blue, d), a.alpha = Ae(o.alpha, i.alpha, d), hr.transform(a));
}, Sc = /* @__PURE__ */ new Set(["none", "hidden"]);
function A1(e, n) {
  return Sc.has(e) ? (o) => o <= 0 ? e : n : (o) => o >= 1 ? n : e;
}
function C1(e, n) {
  return (o) => Ae(e, n, o);
}
function Sd(e) {
  return typeof e == "number" ? C1 : typeof e == "string" ? yd(e) ? pa : Be.test(e) ? Th : E1 : Array.isArray(e) ? Ug : typeof e == "object" ? Be.test(e) ? Th : b1 : pa;
}
function Ug(e, n) {
  const o = [...e], i = o.length, a = e.map((d, f) => Sd(d)(d, n[f]));
  return (d) => {
    for (let f = 0; f < i; f++)
      o[f] = a[f](d);
    return o;
  };
}
function b1(e, n) {
  const o = { ...e, ...n }, i = {};
  for (const a in o)
    e[a] !== void 0 && n[a] !== void 0 && (i[a] = Sd(e[a])(e[a], n[a]));
  return (a) => {
    for (const d in i)
      o[d] = i[d](a);
    return o;
  };
}
function P1(e, n) {
  const o = [], i = { color: 0, var: 0, number: 0 };
  for (let a = 0; a < n.values.length; a++) {
    const d = n.types[a], f = e.indexes[d][i[d]], p = e.values[f] ?? 0;
    o[a] = p, i[d]++;
  }
  return o;
}
const E1 = (e, n) => {
  const o = Wt.createTransformer(n), i = io(e), a = io(n);
  return i.indexes.var.length === a.indexes.var.length && i.indexes.color.length === a.indexes.color.length && i.indexes.number.length >= a.indexes.number.length ? Sc.has(e) && !a.values.length || Sc.has(n) && !i.values.length ? A1(e, n) : xi(Ug(P1(i, a), a.values), o) : (wi(!0, `Complex values '${e}' and '${n}' too different to mix. Ensure all colors are of the same type, and that each contains the same quantity of number and color values. Falling back to instant transition.`, "complex-values-different"), pa(e, n));
};
function $g(e, n, o) {
  return typeof e == "number" && typeof n == "number" && typeof o == "number" ? Ae(e, n, o) : Sd(e)(e, n);
}
const M1 = (e) => {
  const n = ({ timestamp: o }) => e(o);
  return {
    start: (o = !0) => Ce.update(n, o),
    stop: () => Kn(n),
    /**
     * If we're processing this frame we can use the
     * framelocked timestamp to keep things in sync.
     */
    now: () => Ze.isProcessing ? Ze.timestamp : at.now()
  };
}, Hg = (e, n, o = 10) => {
  let i = "";
  const a = Math.max(Math.round(n / o), 2);
  for (let d = 0; d < a; d++)
    i += Math.round(e(d / (a - 1)) * 1e4) / 1e4 + ", ";
  return `linear(${i.substring(0, i.length - 2)})`;
}, ma = 2e4;
function wd(e) {
  let n = 0;
  const o = 50;
  let i = e.next(n);
  for (; !i.done && n < ma; )
    n += o, i = e.next(n);
  return n >= ma ? 1 / 0 : n;
}
function R1(e, n = 100, o) {
  const i = o({ ...e, keyframes: [0, n] }), a = Math.min(wd(i), ma);
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
function wc(e, n) {
  return e * Math.sqrt(1 - n * n);
}
const N1 = 12;
function D1(e, n, o) {
  let i = o;
  for (let a = 1; a < N1; a++)
    i = i - e(i) / n(i);
  return i;
}
const Yu = 1e-3;
function j1({ duration: e = Fe.duration, bounce: n = Fe.bounce, velocity: o = Fe.velocity, mass: i = Fe.mass }) {
  let a, d;
  wi(e <= /* @__PURE__ */ gt(Fe.maxDuration), "Spring duration must be 10 seconds or less", "spring-duration-limit");
  let f = 1 - n;
  f = on(Fe.minDamping, Fe.maxDamping, f), e = on(Fe.minDuration, Fe.maxDuration, /* @__PURE__ */ Dt(e)), f < 1 ? (a = (y) => {
    const v = y * f, l = v * e, c = v - o, S = wc(y, f), x = Math.exp(-l);
    return Yu - c / S * x;
  }, d = (y) => {
    const l = y * f * e, c = l * o + o, S = Math.pow(f, 2) * Math.pow(y, 2) * e, x = Math.exp(-l), k = wc(Math.pow(y, 2), f);
    return (-a(y) + Yu > 0 ? -1 : 1) * ((c - S) * x) / k;
  }) : (a = (y) => {
    const v = Math.exp(-y * e), l = (y - o) * e + 1;
    return -Yu + v * l;
  }, d = (y) => {
    const v = Math.exp(-y * e), l = (o - y) * (e * e);
    return v * l;
  });
  const p = 5 / e, m = D1(a, d, p);
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
const I1 = ["duration", "bounce"], F1 = ["stiffness", "damping", "mass"];
function kh(e, n) {
  return n.some((o) => e[o] !== void 0);
}
function O1(e) {
  let n = {
    velocity: Fe.velocity,
    stiffness: Fe.stiffness,
    damping: Fe.damping,
    mass: Fe.mass,
    isResolvedFromDuration: !1,
    ...e
  };
  if (!kh(e, F1) && kh(e, I1))
    if (n.velocity = 0, e.visualDuration) {
      const o = e.visualDuration, i = 2 * Math.PI / (o * 1.2), a = i * i, d = 2 * on(0.05, 1, 1 - (e.bounce || 0)) * Math.sqrt(a);
      n = {
        ...n,
        mass: Fe.mass,
        stiffness: a,
        damping: d
      };
    } else {
      const o = j1({ ...e, velocity: 0 });
      n = {
        ...n,
        ...o,
        mass: Fe.mass
      }, n.isResolvedFromDuration = !0;
    }
  return n;
}
function ha(e = Fe.visualDuration, n = Fe.bounce) {
  const o = typeof e != "object" ? {
    visualDuration: e,
    keyframes: [0, 1],
    bounce: n
  } : e;
  let { restSpeed: i, restDelta: a } = o;
  const d = o.keyframes[0], f = o.keyframes[o.keyframes.length - 1], p = { done: !1, value: d }, { stiffness: m, damping: y, mass: v, duration: l, velocity: c, isResolvedFromDuration: S } = O1({
    ...o,
    velocity: -/* @__PURE__ */ Dt(o.velocity || 0)
  }), x = c || 0, k = y / (2 * Math.sqrt(m * v)), A = f - d, _ = /* @__PURE__ */ Dt(Math.sqrt(m / v)), b = Math.abs(A) < 5;
  i || (i = b ? Fe.restSpeed.granular : Fe.restSpeed.default), a || (a = b ? Fe.restDelta.granular : Fe.restDelta.default);
  let E, D, O, K, W, $;
  if (k < 1)
    O = wc(_, k), K = (x + k * _ * A) / O, E = (Z) => {
      const te = Math.exp(-k * _ * Z);
      return f - te * (K * Math.sin(O * Z) + A * Math.cos(O * Z));
    }, W = k * _ * K + A * O, $ = k * _ * A - K * O, D = (Z) => Math.exp(-k * _ * Z) * (W * Math.sin(O * Z) + $ * Math.cos(O * Z));
  else if (k === 1) {
    E = (te) => f - Math.exp(-_ * te) * (A + (x + _ * A) * te);
    const Z = x + _ * A;
    D = (te) => Math.exp(-_ * te) * (_ * Z * te - x);
  } else {
    const Z = _ * Math.sqrt(k * k - 1);
    E = (pe) => {
      const we = Math.exp(-k * _ * pe), Q = Math.min(Z * pe, 300);
      return f - we * ((x + k * _ * A) * Math.sinh(Q) + Z * A * Math.cosh(Q)) / Z;
    };
    const te = (x + k * _ * A) / Z, ce = k * _ * te - A * Z, he = k * _ * A - te * Z;
    D = (pe) => {
      const we = Math.exp(-k * _ * pe), Q = Math.min(Z * pe, 300);
      return we * (ce * Math.sinh(Q) + he * Math.cosh(Q));
    };
  }
  const G = {
    calculatedDuration: S && l || null,
    velocity: (Z) => /* @__PURE__ */ gt(D(Z)),
    next: (Z) => {
      if (!S && k < 1) {
        const ce = Math.exp(-k * _ * Z), he = Math.sin(O * Z), pe = Math.cos(O * Z), we = f - ce * (K * he + A * pe), Q = /* @__PURE__ */ gt(ce * (W * he + $ * pe));
        return p.done = Math.abs(Q) <= i && Math.abs(f - we) <= a, p.value = p.done ? f : we, p;
      }
      const te = E(Z);
      if (S)
        p.done = Z >= l;
      else {
        const ce = /* @__PURE__ */ gt(D(Z));
        p.done = Math.abs(ce) <= i && Math.abs(f - te) <= a;
      }
      return p.value = p.done ? f : te, p;
    },
    toString: () => {
      const Z = Math.min(wd(G), ma), te = Hg((ce) => G.next(Z * ce).value, Z, 30);
      return Z + "ms " + te;
    },
    toTransition: () => {
    }
  };
  return G;
}
ha.applyToOptions = (e) => {
  const n = R1(e, 100, ha);
  return e.ease = n.ease, e.duration = /* @__PURE__ */ gt(n.duration), e.type = "keyframes", e;
};
const L1 = 5;
function Wg(e, n, o) {
  const i = Math.max(n - L1, 0);
  return /* @__PURE__ */ kg(o - e(i), n - i);
}
function xc({ keyframes: e, velocity: n = 0, power: o = 0.8, timeConstant: i = 325, bounceDamping: a = 10, bounceStiffness: d = 500, modifyTarget: f, min: p, max: m, restDelta: y = 0.5, restSpeed: v }) {
  const l = e[0], c = {
    done: !1,
    value: l
  }, S = ($) => p !== void 0 && $ < p || m !== void 0 && $ > m, x = ($) => p === void 0 ? m : m === void 0 || Math.abs(p - $) < Math.abs(m - $) ? p : m;
  let k = o * n;
  const A = l + k, _ = f === void 0 ? A : f(A);
  _ !== A && (k = _ - l);
  const b = ($) => -k * Math.exp(-$ / i), E = ($) => _ + b($), D = ($) => {
    const G = b($), Z = E($);
    c.done = Math.abs(G) <= y, c.value = c.done ? _ : Z;
  };
  let O, K;
  const W = ($) => {
    S(c.value) && (O = $, K = ha({
      keyframes: [c.value, x(c.value)],
      velocity: Wg(E, $, c.value),
      // TODO: This should be passing * 1000
      damping: a,
      stiffness: d,
      restDelta: y,
      restSpeed: v
    }));
  };
  return W(0), {
    calculatedDuration: null,
    next: ($) => {
      let G = !1;
      return !K && O === void 0 && (G = !0, D($), W($)), O !== void 0 && $ >= O ? K.next($ - O) : (!G && D($), c);
    }
  };
}
function V1(e, n, o) {
  const i = [], a = o || Gn.mix || $g, d = e.length - 1;
  for (let f = 0; f < d; f++) {
    let p = a(e[f], e[f + 1]);
    if (n) {
      const m = Array.isArray(n) ? n[f] || jt : n;
      p = xi(m, p);
    }
    i.push(p);
  }
  return i;
}
function z1(e, n, { clamp: o = !0, ease: i, mixer: a } = {}) {
  const d = e.length;
  if (_r(d === n.length, "Both input and output ranges must be the same length", "range-length"), d === 1)
    return () => n[0];
  if (d === 2 && n[0] === n[1])
    return () => n[1];
  const f = e[0] === e[1];
  e[0] > e[d - 1] && (e = [...e].reverse(), n = [...n].reverse());
  const p = V1(n, i, a), m = p.length, y = (v) => {
    if (f && v < e[0])
      return n[0];
    let l = 0;
    if (m > 1)
      for (; l < e.length - 2 && !(v < e[l + 1]); l++)
        ;
    const c = /* @__PURE__ */ pi(e[l], e[l + 1], v);
    return p[l](c);
  };
  return o ? (v) => y(on(e[0], e[d - 1], v)) : y;
}
function B1(e, n) {
  const o = e[e.length - 1];
  for (let i = 1; i <= n; i++) {
    const a = /* @__PURE__ */ pi(0, n, i);
    e.push(Ae(o, 1, a));
  }
}
function U1(e) {
  const n = [0];
  return B1(n, e.length - 1), n;
}
function $1(e, n) {
  return e.map((o) => o * n);
}
function H1(e, n) {
  return e.map(() => n || Dg).splice(0, e.length - 1);
}
function ai({ duration: e = 300, keyframes: n, times: o, ease: i = "easeInOut" }) {
  const a = /* @__PURE__ */ qx(i) ? i.map(vh) : vh(i), d = {
    done: !1,
    value: n[0]
  }, f = $1(
    // Only use the provided offsets if they're the correct length
    // TODO Maybe we should warn here if there's a length mismatch
    o && o.length === n.length ? o : U1(n),
    e
  ), p = z1(f, n, {
    ease: Array.isArray(a) ? a : H1(n, a)
  });
  return {
    calculatedDuration: e,
    next: (m) => (d.value = p(m), d.done = m >= e, d)
  };
}
const W1 = (e) => e !== null;
function Da(e, { repeat: n, repeatType: o = "loop" }, i, a = 1) {
  const d = e.filter(W1), p = a < 0 || n && o !== "loop" && n % 2 === 1 ? 0 : d.length - 1;
  return !p || i === void 0 ? d[p] : i;
}
const G1 = {
  decay: xc,
  inertia: xc,
  tween: ai,
  keyframes: ai,
  spring: ha
};
function Gg(e) {
  typeof e.type == "string" && (e.type = G1[e.type]);
}
class xd {
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
const K1 = (e) => e / 100;
class ya extends xd {
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
    Gg(n);
    const { type: o = ai, repeat: i = 0, repeatDelay: a = 0, repeatType: d, velocity: f = 0 } = n;
    let { keyframes: p } = n;
    const m = o || ai;
    m !== ai && typeof p[0] != "number" && (this.mixKeyframes = xi(K1, $g(p[0], p[1])), p = [0, 100]);
    const y = m({ ...n, keyframes: p });
    d === "mirror" && (this.mirroredGenerator = m({
      ...n,
      keyframes: [...p].reverse(),
      velocity: -f
    })), y.calculatedDuration === null && (y.calculatedDuration = wd(y));
    const { calculatedDuration: v } = y;
    this.calculatedDuration = v, this.resolvedDuration = v + a, this.totalDuration = this.resolvedDuration * (i + 1) - a, this.generator = y;
  }
  updateTime(n) {
    const o = Math.round(n - this.startTime) * this.playbackSpeed;
    this.holdTime !== null ? this.currentTime = this.holdTime : this.currentTime = o;
  }
  tick(n, o = !1) {
    const { generator: i, totalDuration: a, mixKeyframes: d, mirroredGenerator: f, resolvedDuration: p, calculatedDuration: m } = this;
    if (this.startTime === null)
      return i.next(0);
    const { delay: y = 0, keyframes: v, repeat: l, repeatType: c, repeatDelay: S, type: x, onUpdate: k, finalKeyframe: A } = this.options;
    this.speed > 0 ? this.startTime = Math.min(this.startTime, n) : this.speed < 0 && (this.startTime = Math.min(n - a / this.speed, this.startTime)), o ? this.currentTime = n : this.updateTime(n);
    const _ = this.currentTime - y * (this.playbackSpeed >= 0 ? 1 : -1), b = this.playbackSpeed >= 0 ? _ < 0 : _ > a;
    this.currentTime = Math.max(_, 0), this.state === "finished" && this.holdTime === null && (this.currentTime = a);
    let E = this.currentTime, D = i;
    if (l) {
      const $ = Math.min(this.currentTime, a) / p;
      let G = Math.floor($), Z = $ % 1;
      !Z && $ >= 1 && (Z = 1), Z === 1 && G--, G = Math.min(G, l + 1), !!(G % 2) && (c === "reverse" ? (Z = 1 - Z, S && (Z -= S / p)) : c === "mirror" && (D = f)), E = on(0, 1, Z) * p;
    }
    let O;
    b ? (this.delayState.value = v[0], O = this.delayState) : O = D.next(E), d && !b && (O.value = d(O.value));
    let { done: K } = O;
    !b && m !== null && (K = this.playbackSpeed >= 0 ? this.currentTime >= a : this.currentTime <= 0);
    const W = this.holdTime === null && (this.state === "finished" || this.state === "running" && K);
    return W && x !== xc && (O.value = Da(v, this.options, A, this.speed)), k && k(O.value), W && this.finish(), O;
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
    return Wg((i) => this.generator.next(i).value, n, o);
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
    const { driver: n = M1, startTime: o } = this.options;
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
function Y1(e) {
  for (let n = 1; n < e.length; n++)
    e[n] ?? (e[n] = e[n - 1]);
}
const yr = (e) => e * 180 / Math.PI, _c = (e) => {
  const n = yr(Math.atan2(e[1], e[0]));
  return Tc(n);
}, Q1 = {
  x: 4,
  y: 5,
  translateX: 4,
  translateY: 5,
  scaleX: 0,
  scaleY: 3,
  scale: (e) => (Math.abs(e[0]) + Math.abs(e[3])) / 2,
  rotate: _c,
  rotateZ: _c,
  skewX: (e) => yr(Math.atan(e[1])),
  skewY: (e) => yr(Math.atan(e[2])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[2])) / 2
}, Tc = (e) => (e = e % 360, e < 0 && (e += 360), e), Ah = _c, Ch = (e) => Math.sqrt(e[0] * e[0] + e[1] * e[1]), bh = (e) => Math.sqrt(e[4] * e[4] + e[5] * e[5]), X1 = {
  x: 12,
  y: 13,
  z: 14,
  translateX: 12,
  translateY: 13,
  translateZ: 14,
  scaleX: Ch,
  scaleY: bh,
  scale: (e) => (Ch(e) + bh(e)) / 2,
  rotateX: (e) => Tc(yr(Math.atan2(e[6], e[5]))),
  rotateY: (e) => Tc(yr(Math.atan2(-e[2], e[0]))),
  rotateZ: Ah,
  rotate: Ah,
  skewX: (e) => yr(Math.atan(e[4])),
  skewY: (e) => yr(Math.atan(e[1])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[4])) / 2
};
function kc(e) {
  return e.includes("scale") ? 1 : 0;
}
function Ac(e, n) {
  if (!e || e === "none")
    return kc(n);
  const o = e.match(/^matrix3d\(([-\d.e\s,]+)\)$/u);
  let i, a;
  if (o)
    i = X1, a = o;
  else {
    const p = e.match(/^matrix\(([-\d.e\s,]+)\)$/u);
    i = Q1, a = p;
  }
  if (!a)
    return kc(n);
  const d = i[n], f = a[1].split(",").map(J1);
  return typeof d == "function" ? d(f) : f[d];
}
const Z1 = (e, n) => {
  const { transform: o = "none" } = getComputedStyle(e);
  return Ac(o, n);
};
function J1(e) {
  return parseFloat(e.trim());
}
const fo = [
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
], po = /* @__PURE__ */ new Set([...fo, "pathRotation"]), Ph = (e) => e === co || e === re, q1 = /* @__PURE__ */ new Set(["x", "y", "z"]), e_ = fo.filter((e) => !q1.has(e));
function t_(e) {
  const n = [];
  return e_.forEach((o) => {
    const i = e.getValue(o);
    i !== void 0 && (n.push([o, i.get()]), i.set(o.startsWith("scale") ? 1 : 0));
  }), n;
}
const $n = {
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
  x: (e, { transform: n }) => Ac(n, "x"),
  y: (e, { transform: n }) => Ac(n, "y")
};
$n.translateX = $n.x;
$n.translateY = $n.y;
const vr = /* @__PURE__ */ new Set();
let Cc = !1, bc = !1, Pc = !1;
function Kg() {
  if (bc) {
    const e = Array.from(vr).filter((i) => i.needsMeasurement), n = new Set(e.map((i) => i.element)), o = /* @__PURE__ */ new Map();
    n.forEach((i) => {
      const a = t_(i);
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
  bc = !1, Cc = !1, vr.forEach((e) => e.complete(Pc)), vr.clear();
}
function Yg() {
  vr.forEach((e) => {
    e.readKeyframes(), e.needsMeasurement && (bc = !0);
  });
}
function n_() {
  Pc = !0, Yg(), Kg(), Pc = !1;
}
class _d {
  constructor(n, o, i, a, d, f = !1) {
    this.state = "pending", this.isAsync = !1, this.needsMeasurement = !1, this.unresolvedKeyframes = [...n], this.onComplete = o, this.name = i, this.motionValue = a, this.element = d, this.isAsync = f;
  }
  scheduleResolve() {
    this.state = "scheduled", this.isAsync ? (vr.add(this), Cc || (Cc = !0, Ce.read(Yg), Ce.resolveKeyframes(Kg))) : (this.readKeyframes(), this.complete());
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
    Y1(n);
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
const r_ = (e) => e.startsWith("--");
function Qg(e, n, o) {
  r_(n) ? e.style.setProperty(n, o) : e.style[n] = o;
}
const o_ = {};
function Xg(e, n) {
  const o = /* @__PURE__ */ Tg(e);
  return () => o_[n] ?? o();
}
const i_ = /* @__PURE__ */ Xg(() => window.ScrollTimeline !== void 0, "scrollTimeline"), Zg = /* @__PURE__ */ Xg(() => {
  try {
    document.createElement("div").animate({ opacity: 0 }, { easing: "linear(0, 1)" });
  } catch {
    return !1;
  }
  return !0;
}, "linearEasing"), oi = ([e, n, o, i]) => `cubic-bezier(${e}, ${n}, ${o}, ${i})`, Eh = {
  linear: "linear",
  ease: "ease",
  easeIn: "ease-in",
  easeOut: "ease-out",
  easeInOut: "ease-in-out",
  circIn: /* @__PURE__ */ oi([0, 0.65, 0.55, 1]),
  circOut: /* @__PURE__ */ oi([0.55, 0, 1, 0.45]),
  backIn: /* @__PURE__ */ oi([0.31, 0.01, 0.66, -0.59]),
  backOut: /* @__PURE__ */ oi([0.33, 1.53, 0.69, 0.99])
};
function Jg(e, n) {
  if (e)
    return typeof e == "function" ? Zg() ? Hg(e, n) : "ease-out" : /* @__PURE__ */ jg(e) ? oi(e) : Array.isArray(e) ? e.map((o) => Jg(o, n) || Eh.easeOut) : Eh[e];
}
function s_(e, n, o, { delay: i = 0, duration: a = 300, repeat: d = 0, repeatType: f = "loop", ease: p = "easeOut", times: m } = {}, y = void 0) {
  const v = {
    [n]: o
  };
  m && (v.offset = m);
  const l = Jg(p, a);
  Array.isArray(l) && (v.easing = l);
  const c = {
    delay: i,
    duration: a,
    easing: Array.isArray(l) ? "linear" : l,
    fill: "both",
    iterations: d + 1,
    direction: f === "reverse" ? "alternate" : "normal"
  };
  return y && (c.pseudoElement = y), e.animate(v, c);
}
function qg(e) {
  return typeof e == "function" && "applyToOptions" in e;
}
function a_({ type: e, ...n }) {
  return qg(e) && Zg() ? e.applyToOptions(n) : (n.duration ?? (n.duration = 300), n.ease ?? (n.ease = "easeOut"), n);
}
class ev extends xd {
  constructor(n) {
    if (super(), this.finishedTime = null, this.isStopped = !1, this.manualStartTime = null, !n)
      return;
    const { element: o, name: i, keyframes: a, pseudoElement: d, allowFlatten: f = !1, finalKeyframe: p, onComplete: m } = n;
    this.isPseudoElement = !!d, this.allowFlatten = f, this.options = n, _r(typeof n.type != "string", `Mini animate() doesn't support "type" as a string.`, "mini-spring");
    const y = a_(n);
    this.animation = s_(o, i, a, y, d), y.autoplay === !1 && this.animation.pause(), this.animation.onfinish = () => {
      if (this.finishedTime = this.time, !d) {
        const v = Da(a, this.options, p, this.speed);
        this.updateMotionValue && this.updateMotionValue(v), Qg(o, i, v), this.animation.cancel();
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
    return this.allowFlatten && ((d = this.animation.effect) == null || d.updateTiming({ easing: "linear" })), this.animation.onfinish = null, n && i_() ? (this.animation.timeline = n, o && (this.animation.rangeStart = o), i && (this.animation.rangeEnd = i), jt) : a(this);
  }
}
const tv = {
  anticipate: Mg,
  backInOut: Eg,
  circInOut: Ng
};
function l_(e) {
  return e in tv;
}
function u_(e) {
  typeof e.ease == "string" && l_(e.ease) && (e.ease = tv[e.ease]);
}
const Qu = 10;
class c_ extends ev {
  constructor(n) {
    u_(n), Gg(n), super(n), n.startTime !== void 0 && n.autoplay !== !1 && (this.startTime = n.startTime), this.options = n;
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
    const p = new ya({
      ...f,
      autoplay: !1
    }), m = Math.max(Qu, at.now() - this.startTime), y = on(0, Qu, m - Qu), v = p.sample(m).value, { name: l } = this.options;
    d && l && Qg(d, l, v), o.setWithVelocity(p.sample(Math.max(0, m - y)).value, v, y), p.stop();
  }
}
const Mh = (e, n) => n === "zIndex" ? !1 : !!(typeof e == "number" || Array.isArray(e) || typeof e == "string" && // It's animatable if we have a string
(Wt.test(e) || e === "0") && // And it contains numbers and/or colors
!e.startsWith("url("));
function d_(e) {
  const n = e[0];
  if (e.length === 1)
    return !0;
  for (let o = 0; o < e.length; o++)
    if (e[o] !== n)
      return !0;
}
function f_(e, n, o, i) {
  const a = e[0];
  if (a === null)
    return !1;
  if (n === "display" || n === "visibility")
    return !0;
  const d = e[e.length - 1], f = Mh(a, n), p = Mh(d, n);
  return wi(f === p, `You are trying to animate ${n} from "${a}" to "${d}". "${f ? d : a}" is not an animatable value.`, "value-not-animatable"), !f || !p ? !1 : d_(e) || (o === "spring" || qg(o)) && i;
}
function Ec(e) {
  e.duration = 0, e.type = "keyframes";
}
const nv = /* @__PURE__ */ new Set([
  "opacity",
  "clipPath",
  "filter",
  "transform"
  // TODO: Can be accelerated but currently disabled until https://issues.chromium.org/issues/41491098 is resolved
  // or until we implement support for linear() easing.
  // "background-color"
]), p_ = /^(?:oklch|oklab|lab|lch|color|color-mix|light-dark)\(/;
function m_(e) {
  for (let n = 0; n < e.length; n++)
    if (typeof e[n] == "string" && p_.test(e[n]))
      return !0;
  return !1;
}
const h_ = /* @__PURE__ */ new Set([
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
]), y_ = /* @__PURE__ */ Tg(() => Object.hasOwnProperty.call(Element.prototype, "animate"));
function g_(e) {
  var l;
  const { motionValue: n, name: o, repeatDelay: i, repeatType: a, damping: d, type: f, keyframes: p } = e;
  if (!(((l = n == null ? void 0 : n.owner) == null ? void 0 : l.current) instanceof HTMLElement))
    return !1;
  const { onUpdate: y, transformTemplate: v } = n.owner.getProps();
  return y_() && o && /**
   * Force WAAPI for color properties with browser-only color formats
   * (oklch, oklab, lab, lch, etc.) that the JS animation path can't parse.
   */
  (nv.has(o) || h_.has(o) && m_(p)) && (o !== "transform" || !v) && /**
   * If we're outputting values to onUpdate then we can't use WAAPI as there's
   * no way to read the value from WAAPI every frame.
   */
  !y && !i && a !== "mirror" && d !== 0 && f !== "inertia";
}
const v_ = 40;
class S_ extends xd {
  constructor({ autoplay: n = !0, delay: o = 0, type: i = "keyframes", repeat: a = 0, repeatDelay: d = 0, repeatType: f = "loop", keyframes: p, name: m, motionValue: y, element: v, ...l }) {
    var x;
    super(), this.stop = () => {
      var k, A;
      this._animation && (this._animation.stop(), (k = this.stopTimeline) == null || k.call(this)), (A = this.keyframeResolver) == null || A.cancel();
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
      element: v,
      ...l
    }, S = (v == null ? void 0 : v.KeyframeResolver) || _d;
    this.keyframeResolver = new S(p, (k, A, _) => this.onKeyframesResolved(k, A, c, !_), m, y, v), (x = this.keyframeResolver) == null || x.scheduleResolve();
  }
  onKeyframesResolved(n, o, i, a) {
    var _, b;
    this.keyframeResolver = void 0;
    const { name: d, type: f, velocity: p, delay: m, isHandoff: y, onUpdate: v } = i;
    this.resolvedAt = at.now();
    let l = !0;
    f_(n, d, f, p) || (l = !1, (Gn.instantAnimations || !m) && (v == null || v(Da(n, i, o))), n[0] = n[n.length - 1], Ec(i), i.repeat = 0);
    const S = {
      startTime: a ? this.resolvedAt ? this.resolvedAt - this.createdAt > v_ ? this.resolvedAt : this.createdAt : this.createdAt : void 0,
      finalKeyframe: o,
      ...i,
      keyframes: n
    }, x = l && !y && g_(S), k = (b = (_ = S.motionValue) == null ? void 0 : _.owner) == null ? void 0 : b.current;
    let A;
    if (x)
      try {
        A = new c_({
          ...S,
          element: k
        });
      } catch {
        A = new ya(S);
      }
    else
      A = new ya(S);
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
    return this._animation || ((n = this.keyframeResolver) == null || n.resume(), n_()), this._animation;
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
function rv(e, n, o, i = 0, a = 1) {
  const d = Array.from(e).sort((y, v) => y.sortNodePosition(v)).indexOf(n), f = e.size, p = (f - 1) * i;
  return typeof o == "function" ? o(d, f) : a === 1 ? d * i : p - d * i;
}
const Rh = 30, w_ = (e) => !isNaN(parseFloat(e));
class x_ {
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
    this.current = n, this.updatedAt = at.now(), this.canTrackVelocity === null && n !== void 0 && (this.canTrackVelocity = w_(this.current));
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
    this.events[n] || (this.events[n] = new pd());
    const i = this.events[n].add(o);
    return n === "change" ? () => {
      i(), Ce.read(() => {
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
    return this.current;
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
    if (!this.canTrackVelocity || this.prevFrameValue === void 0 || n - this.updatedAt > Rh)
      return 0;
    const o = Math.min(this.updatedAt - this.prevUpdatedAt, Rh);
    return /* @__PURE__ */ kg(parseFloat(this.current) - parseFloat(this.prevFrameValue), o);
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
function so(e, n) {
  return new x_(e, n);
}
function ov(e, n) {
  if (e != null && e.inherit && n) {
    const { inherit: o, ...i } = e;
    return { ...n, ...i };
  }
  return e;
}
function Td(e, n) {
  const o = (e == null ? void 0 : e[n]) ?? (e == null ? void 0 : e.default) ?? e;
  return o !== e ? ov(o, e) : o;
}
const __ = {
  type: "spring",
  stiffness: 500,
  damping: 25,
  restSpeed: 10
}, T_ = (e) => ({
  type: "spring",
  stiffness: 550,
  damping: e === 0 ? 2 * Math.sqrt(550) : 30,
  restSpeed: 10
}), k_ = {
  type: "keyframes",
  duration: 0.8
}, A_ = {
  type: "keyframes",
  ease: [0.25, 0.1, 0.35, 1],
  duration: 0.3
}, C_ = (e, { keyframes: n }) => n.length > 2 ? k_ : po.has(e) ? e.startsWith("scale") ? T_(n[1]) : __ : A_, b_ = /* @__PURE__ */ new Set([
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
function P_(e) {
  for (const n in e)
    if (!b_.has(n))
      return !0;
  return !1;
}
const kd = (e, n, o, i = {}, a, d) => (f) => {
  const p = Td(i, e) || {}, m = p.delay || i.delay || 0;
  let { elapsed: y = 0 } = i;
  y = y - /* @__PURE__ */ gt(m);
  const v = {
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
  P_(p) || Object.assign(v, C_(e, v)), v.duration && (v.duration = /* @__PURE__ */ gt(v.duration)), v.repeatDelay && (v.repeatDelay = /* @__PURE__ */ gt(v.repeatDelay)), v.from !== void 0 && (v.keyframes[0] = v.from);
  let l = !1;
  if ((v.type === !1 || v.duration === 0 && !v.repeatDelay) && (Ec(v), v.delay === 0 && (l = !0)), (Gn.instantAnimations || Gn.skipAnimations || a != null && a.shouldSkipAnimations || p.skipAnimations) && (l = !0, Ec(v), v.delay = 0), v.allowFlatten = !p.type && !p.ease, l && !d && n.get() !== void 0) {
    const c = Da(v.keyframes, p);
    if (c !== void 0) {
      Ce.update(() => {
        v.onUpdate(c), v.onComplete();
      });
      return;
    }
  }
  return p.isSync ? new ya(v) : new S_(v);
}, E_ = (
  // eslint-disable-next-line redos-detector/no-unsafe-regex -- false positive, as it can match a lot of words
  /^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u
);
function M_(e) {
  const n = E_.exec(e);
  if (!n)
    return [,];
  const [, o, i, a] = n;
  return [`--${o ?? i}`, a];
}
const R_ = 4;
function iv(e, n, o = 1) {
  _r(o <= R_, `Max CSS variable fallback depth detected in property "${e}". This may indicate a circular fallback dependency.`, "max-css-var-depth");
  const [i, a] = M_(e);
  if (!i)
    return;
  const d = window.getComputedStyle(n).getPropertyValue(i);
  if (d) {
    const f = d.trim();
    return wg(f) ? parseFloat(f) : f;
  }
  return yd(a) ? iv(a, n, o + 1) : a;
}
function Nh(e) {
  const n = [{}, {}];
  return e == null || e.values.forEach((o, i) => {
    n[0][i] = o.get(), n[1][i] = o.getVelocity();
  }), n;
}
function Ad(e, n, o, i) {
  if (typeof n == "function") {
    const [a, d] = Nh(i);
    n = n(o !== void 0 ? o : e.custom, a, d);
  }
  if (typeof n == "string" && (n = e.variants && e.variants[n]), typeof n == "function") {
    const [a, d] = Nh(i);
    n = n(o !== void 0 ? o : e.custom, a, d);
  }
  return n;
}
function Sr(e, n, o) {
  const i = e.getProps();
  return Ad(i, n, o !== void 0 ? o : i.custom, e);
}
const sv = /* @__PURE__ */ new Set([
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
  ...fo
]), Mc = (e) => Array.isArray(e);
function N_(e, n, o) {
  e.hasValue(n) ? e.getValue(n).set(o) : e.addValue(n, so(o));
}
function D_(e) {
  return Mc(e) ? e[e.length - 1] || 0 : e;
}
function j_(e, n) {
  const o = Sr(e, n);
  let { transitionEnd: i = {}, transition: a = {}, ...d } = o || {};
  d = { ...d, ...i };
  for (const f in d) {
    const p = D_(d[f]);
    N_(e, f, p);
  }
}
const Je = (e) => !!(e && e.getVelocity);
function I_(e) {
  return !!(Je(e) && e.add);
}
function Rc(e, n) {
  const o = e.getValue("willChange");
  if (I_(o))
    return o.add(n);
  if (!o && Gn.WillChange) {
    const i = new Gn.WillChange("auto");
    e.addValue("willChange", i), i.add(n);
  }
}
function Cd(e) {
  return e.replace(/([A-Z])/g, (n) => `-${n.toLowerCase()}`);
}
const F_ = "framerAppearId", av = "data-" + Cd(F_);
function lv(e) {
  return e.props[av];
}
function O_({ protectedKeys: e, needsAnimating: n }, o) {
  const i = e.hasOwnProperty(o) && n[o] !== !0;
  return n[o] = !1, i;
}
function uv(e, n, { delay: o = 0, transitionOverride: i, type: a } = {}) {
  let { transition: d, transitionEnd: f, ...p } = n;
  const m = e.getDefaultTransition();
  d = d ? ov(d, m) : m;
  const y = d == null ? void 0 : d.reduceMotion, v = d == null ? void 0 : d.skipAnimations;
  i && (d = i);
  const l = [], c = a && e.animationState && e.animationState.getState()[a], S = d == null ? void 0 : d.path;
  S && S.animateVisualElement(e, p, d, o, l);
  for (const x in p) {
    const k = e.getValue(x, e.latestValues[x] ?? null), A = p[x];
    if (A === void 0 || c && O_(c, x))
      continue;
    const _ = {
      delay: o,
      ...Td(d || {}, x)
    };
    v && (_.skipAnimations = !0);
    const b = k.get();
    if (b !== void 0 && !k.isAnimating() && !Array.isArray(A) && A === b && !_.velocity) {
      Ce.update(() => k.set(A));
      continue;
    }
    let E = !1;
    if (window.MotionHandoffAnimation) {
      const K = lv(e);
      if (K) {
        const W = window.MotionHandoffAnimation(K, x, Ce);
        W !== null && (_.startTime = W, E = !0);
      }
    }
    Rc(e, x);
    const D = y ?? e.shouldReduceMotion;
    k.start(kd(x, k, A, D && sv.has(x) ? { type: !1 } : _, e, E));
    const O = k.animation;
    O && l.push(O);
  }
  if (f) {
    const x = () => Ce.update(() => {
      f && j_(e, f);
    });
    l.length ? Promise.all(l).then(x) : x();
  }
  return l;
}
function Nc(e, n, o = {}) {
  var m;
  const i = Sr(e, n, o.type === "exit" ? (m = e.presenceContext) == null ? void 0 : m.custom : void 0);
  let { transition: a = e.getDefaultTransition() || {} } = i || {};
  o.transitionOverride && (a = o.transitionOverride);
  const d = i ? () => Promise.all(uv(e, i, o)) : () => Promise.resolve(), f = e.variantChildren && e.variantChildren.size ? (y = 0) => {
    const { delayChildren: v = 0, staggerChildren: l, staggerDirection: c } = a;
    return L_(e, n, y, v, l, c, o);
  } : () => Promise.resolve(), { when: p } = a;
  if (p) {
    const [y, v] = p === "beforeChildren" ? [d, f] : [f, d];
    return y().then(() => v());
  } else
    return Promise.all([d(), f(o.delay)]);
}
function L_(e, n, o = 0, i = 0, a = 0, d = 1, f) {
  const p = [];
  for (const m of e.variantChildren)
    m.notify("AnimationStart", n), p.push(Nc(m, n, {
      ...f,
      delay: o + (typeof i == "function" ? 0 : i) + rv(e.variantChildren, m, i, a, d)
    }).then(() => m.notify("AnimationComplete", n)));
  return Promise.all(p);
}
function V_(e, n, o = {}) {
  e.notify("AnimationStart", n);
  let i;
  if (Array.isArray(n)) {
    const a = n.map((d) => Nc(e, d, o));
    i = Promise.all(a);
  } else if (typeof n == "string")
    i = Nc(e, n, o);
  else {
    const a = typeof n == "function" ? Sr(e, n, o.custom) : n;
    i = Promise.all(uv(e, a, o));
  }
  return i.then(() => {
    e.notify("AnimationComplete", n);
  });
}
const z_ = {
  test: (e) => e === "auto",
  parse: (e) => e
}, cv = (e) => (n) => n.test(e), dv = [co, re, rn, mn, d1, c1, z_], Dh = (e) => dv.find(cv(e));
function B_(e) {
  return typeof e == "number" ? e === 0 : e !== null ? e === "none" || e === "0" || _g(e) : !0;
}
const U_ = /* @__PURE__ */ new Set(["brightness", "contrast", "saturate", "opacity"]);
function $_(e) {
  const [n, o] = e.slice(0, -1).split("(");
  if (n === "drop-shadow")
    return e;
  const [i] = o.match(gd) || [];
  if (!i)
    return e;
  const a = o.replace(i, "");
  let d = U_.has(n) ? 1 : 0;
  return i !== o && (d *= 100), n + "(" + d + a + ")";
}
const H_ = /\b([a-z-]*)\(.*?\)/gu, Dc = {
  ...Wt,
  getAnimatableNone: (e) => {
    const n = e.match(H_);
    return n ? n.map($_).join(" ") : e;
  }
}, jc = {
  ...Wt,
  getAnimatableNone: (e) => {
    const n = Wt.parse(e);
    return Wt.createTransformer(e)(n.map((i) => typeof i == "number" ? 0 : typeof i == "object" ? { ...i, alpha: 1 } : i));
  }
}, jh = {
  ...co,
  transform: Math.round
}, W_ = {
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
  scale: Ls,
  scaleX: Ls,
  scaleY: Ls,
  scaleZ: Ls,
  skew: mn,
  skewX: mn,
  skewY: mn,
  distance: re,
  translateX: re,
  translateY: re,
  translateZ: re,
  x: re,
  y: re,
  z: re,
  perspective: re,
  transformPerspective: re,
  opacity: mi,
  originX: wh,
  originY: wh,
  originZ: re
}, ga = {
  // Border props
  borderWidth: re,
  borderTopWidth: re,
  borderRightWidth: re,
  borderBottomWidth: re,
  borderLeftWidth: re,
  borderRadius: re,
  borderTopLeftRadius: re,
  borderTopRightRadius: re,
  borderBottomRightRadius: re,
  borderBottomLeftRadius: re,
  // Positioning props
  width: re,
  maxWidth: re,
  height: re,
  maxHeight: re,
  top: re,
  right: re,
  bottom: re,
  left: re,
  inset: re,
  insetBlock: re,
  insetBlockStart: re,
  insetBlockEnd: re,
  insetInline: re,
  insetInlineStart: re,
  insetInlineEnd: re,
  // Spacing props
  padding: re,
  paddingTop: re,
  paddingRight: re,
  paddingBottom: re,
  paddingLeft: re,
  paddingBlock: re,
  paddingBlockStart: re,
  paddingBlockEnd: re,
  paddingInline: re,
  paddingInlineStart: re,
  paddingInlineEnd: re,
  margin: re,
  marginTop: re,
  marginRight: re,
  marginBottom: re,
  marginLeft: re,
  marginBlock: re,
  marginBlockStart: re,
  marginBlockEnd: re,
  marginInline: re,
  marginInlineStart: re,
  marginInlineEnd: re,
  // Typography
  fontSize: re,
  // Misc
  backgroundPositionX: re,
  backgroundPositionY: re,
  ...W_,
  zIndex: jh,
  // SVG
  fillOpacity: mi,
  strokeOpacity: mi,
  numOctaves: jh
}, G_ = {
  ...ga,
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
  filter: Dc,
  WebkitFilter: Dc,
  mask: jc,
  WebkitMask: jc
}, fv = (e) => G_[e], K_ = /* @__PURE__ */ new Set([Dc, jc]);
function pv(e, n) {
  let o = fv(e);
  return K_.has(o) || (o = Wt), o.getAnimatableNone ? o.getAnimatableNone(n) : void 0;
}
const Y_ = /* @__PURE__ */ new Set(["auto", "none", "0"]);
function Q_(e, n, o) {
  let i = 0, a;
  for (; i < e.length && !a; ) {
    const d = e[i];
    typeof d == "string" && !Y_.has(d) && io(d).values.length && (a = e[i]), i++;
  }
  if (a && o)
    for (const d of n)
      e[d] = pv(o, a);
}
class X_ extends _d {
  constructor(n, o, i, a, d) {
    super(n, o, i, a, d, !0);
  }
  readKeyframes() {
    const { unresolvedKeyframes: n, element: o, name: i } = this;
    if (!o || !o.current)
      return;
    super.readKeyframes();
    for (let v = 0; v < n.length; v++) {
      let l = n[v];
      if (typeof l == "string" && (l = l.trim(), yd(l))) {
        const c = iv(l, o.current);
        c !== void 0 && (n[v] = c), v === n.length - 1 && (this.finalKeyframe = l);
      }
    }
    if (this.resolveNoneKeyframes(), !sv.has(i) || n.length !== 2)
      return;
    const [a, d] = n, f = Dh(a), p = Dh(d), m = Sh(a), y = Sh(d);
    if (m !== y && $n[i]) {
      this.needsMeasurement = !0;
      return;
    }
    if (f !== p)
      if (Ph(f) && Ph(p))
        for (let v = 0; v < n.length; v++) {
          const l = n[v];
          typeof l == "string" && (n[v] = parseFloat(l));
        }
      else $n[i] && (this.needsMeasurement = !0);
  }
  resolveNoneKeyframes() {
    const { unresolvedKeyframes: n, name: o } = this, i = [];
    for (let a = 0; a < n.length; a++)
      (n[a] === null || B_(n[a])) && i.push(a);
    i.length && Q_(n, i, o);
  }
  measureInitialState() {
    const { element: n, unresolvedKeyframes: o, name: i } = this;
    if (!n || !n.current)
      return;
    i === "height" && (this.suspendedScrollY = window.pageYOffset), this.measuredOrigin = $n[i](n.measureViewportBox(), window.getComputedStyle(n.current)), o[0] = this.measuredOrigin;
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
    i[d] = $n[o](n.measureViewportBox(), window.getComputedStyle(n.current)), f !== null && this.finalKeyframe === void 0 && (this.finalKeyframe = f), (p = this.removedTransforms) != null && p.length && this.removedTransforms.forEach(([m, y]) => {
      n.getValue(m).set(y);
    }), this.resolveNoneKeyframes();
  }
}
const bd = [
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomRightRadius",
  "borderBottomLeftRadius"
];
function mv(e, n, o) {
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
const Ic = (e, n) => n && typeof e == "number" ? n.transform(e) : e;
function qs(e) {
  return xg(e) && "offsetHeight" in e && !("ownerSVGElement" in e);
}
const { schedule: Pd } = /* @__PURE__ */ Ig(queueMicrotask, !1), $t = {
  x: !1,
  y: !1
};
function hv() {
  return $t.x || $t.y;
}
function Z_(e) {
  return e === "x" || e === "y" ? $t[e] ? null : ($t[e] = !0, () => {
    $t[e] = !1;
  }) : $t.x || $t.y ? null : ($t.x = $t.y = !0, () => {
    $t.x = $t.y = !1;
  });
}
function yv(e, n) {
  const o = mv(e), i = new AbortController(), a = {
    passive: !0,
    ...n,
    signal: i.signal
  };
  return [o, a, () => i.abort()];
}
function J_(e) {
  return !(e.pointerType === "touch" || hv());
}
function q_(e, n, o = {}) {
  const [i, a, d] = yv(e, o);
  return i.forEach((f) => {
    let p = !1, m = !1, y;
    const v = () => {
      f.removeEventListener("pointerleave", x);
    }, l = (A) => {
      y && (y(A), y = void 0), v();
    }, c = (A) => {
      p = !1, window.removeEventListener("pointerup", c), window.removeEventListener("pointercancel", c), m && (m = !1, l(A));
    }, S = () => {
      p = !0, window.addEventListener("pointerup", c, a), window.addEventListener("pointercancel", c, a);
    }, x = (A) => {
      if (A.pointerType !== "touch") {
        if (p) {
          m = !0;
          return;
        }
        l(A);
      }
    }, k = (A) => {
      if (!J_(A))
        return;
      m = !1;
      const _ = n(f, A);
      typeof _ == "function" && (y = _, f.addEventListener("pointerleave", x, a));
    };
    f.addEventListener("pointerenter", k, a), f.addEventListener("pointerdown", S, a);
  }), d;
}
const gv = (e, n) => n ? e === n ? !0 : gv(e, n.parentElement) : !1, Ed = (e) => e.pointerType === "mouse" ? typeof e.button != "number" || e.button <= 0 : e.isPrimary !== !1, eT = /* @__PURE__ */ new Set([
  "BUTTON",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "A"
]);
function tT(e) {
  return eT.has(e.tagName) || e.isContentEditable === !0;
}
const nT = /* @__PURE__ */ new Set(["INPUT", "SELECT", "TEXTAREA"]);
function rT(e) {
  return nT.has(e.tagName) || e.isContentEditable === !0;
}
const ea = /* @__PURE__ */ new WeakSet();
function Ih(e) {
  return (n) => {
    n.key === "Enter" && e(n);
  };
}
function Xu(e, n) {
  e.dispatchEvent(new PointerEvent("pointer" + n, { isPrimary: !0, bubbles: !0 }));
}
const oT = (e, n) => {
  const o = e.currentTarget;
  if (!o)
    return;
  const i = Ih(() => {
    if (ea.has(o))
      return;
    Xu(o, "down");
    const a = Ih(() => {
      Xu(o, "up");
    }), d = () => Xu(o, "cancel");
    o.addEventListener("keyup", a, n), o.addEventListener("blur", d, n);
  });
  o.addEventListener("keydown", i, n), o.addEventListener("blur", () => o.removeEventListener("keydown", i), n);
};
function Fh(e) {
  return Ed(e) && !hv();
}
const Oh = /* @__PURE__ */ new WeakSet();
function iT(e, n, o = {}) {
  const [i, a, d] = yv(e, o), f = (p) => {
    const m = p.currentTarget;
    if (!Fh(p) || Oh.has(p))
      return;
    ea.add(m), o.stopPropagation && Oh.add(p);
    const y = n(m, p), v = { ...a, capture: !0 }, l = (x, k) => {
      window.removeEventListener("pointerup", c, v), window.removeEventListener("pointercancel", S, v), ea.has(m) && ea.delete(m), Fh(x) && typeof y == "function" && y(x, { success: k });
    }, c = (x) => {
      l(x, m === window || m === document || o.useGlobalTarget || gv(m, x.target));
    }, S = (x) => {
      l(x, !1);
    };
    window.addEventListener("pointerup", c, v), window.addEventListener("pointercancel", S, v);
  };
  return i.forEach((p) => {
    (o.useGlobalTarget ? window : p).addEventListener("pointerdown", f, a), qs(p) && (p.addEventListener("focus", (y) => oT(y, a)), !tT(p) && !p.hasAttribute("tabindex") && (p.tabIndex = 0));
  }), d;
}
function Md(e) {
  return xg(e) && "ownerSVGElement" in e;
}
const ta = /* @__PURE__ */ new WeakMap();
let Ln;
const vv = (e, n, o) => (i, a) => a && a[0] ? a[0][e + "Size"] : Md(i) && "getBBox" in i ? i.getBBox()[n] : i[o], sT = /* @__PURE__ */ vv("inline", "width", "offsetWidth"), aT = /* @__PURE__ */ vv("block", "height", "offsetHeight");
function lT({ target: e, borderBoxSize: n }) {
  var o;
  (o = ta.get(e)) == null || o.forEach((i) => {
    i(e, {
      get width() {
        return sT(e, n);
      },
      get height() {
        return aT(e, n);
      }
    });
  });
}
function uT(e) {
  e.forEach(lT);
}
function cT() {
  typeof ResizeObserver > "u" || (Ln = new ResizeObserver(uT));
}
function dT(e, n) {
  Ln || cT();
  const o = mv(e);
  return o.forEach((i) => {
    let a = ta.get(i);
    a || (a = /* @__PURE__ */ new Set(), ta.set(i, a)), a.add(n), Ln == null || Ln.observe(i);
  }), () => {
    o.forEach((i) => {
      const a = ta.get(i);
      a == null || a.delete(n), a != null && a.size || Ln == null || Ln.unobserve(i);
    });
  };
}
const na = /* @__PURE__ */ new Set();
let to;
function fT() {
  to = () => {
    const e = {
      get width() {
        return window.innerWidth;
      },
      get height() {
        return window.innerHeight;
      }
    };
    na.forEach((n) => n(e));
  }, window.addEventListener("resize", to);
}
function pT(e) {
  return na.add(e), to || fT(), () => {
    na.delete(e), !na.size && typeof to == "function" && (window.removeEventListener("resize", to), to = void 0);
  };
}
function Lh(e, n) {
  return typeof e == "function" ? pT(e) : dT(e, n);
}
function mT(e) {
  return Md(e) && e.tagName === "svg";
}
const hT = [...dv, Be, Wt], yT = (e) => hT.find(cv(e)), Vh = () => ({
  translate: 0,
  scale: 1,
  origin: 0,
  originPoint: 0
}), no = () => ({
  x: Vh(),
  y: Vh()
}), zh = () => ({ min: 0, max: 0 }), He = () => ({
  x: zh(),
  y: zh()
}), gT = /* @__PURE__ */ new WeakMap();
function ja(e) {
  return e !== null && typeof e == "object" && typeof e.start == "function";
}
function hi(e) {
  return typeof e == "string" || Array.isArray(e);
}
const Rd = [
  "animate",
  "whileInView",
  "whileFocus",
  "whileHover",
  "whileTap",
  "whileDrag",
  "exit"
], Nd = ["initial", ...Rd];
function Ia(e) {
  return ja(e.animate) || Nd.some((n) => hi(e[n]));
}
function Sv(e) {
  return !!(Ia(e) || e.variants);
}
function vT(e, n, o) {
  for (const i in n) {
    const a = n[i], d = o[i];
    if (Je(a))
      e.addValue(i, a);
    else if (Je(d))
      e.addValue(i, so(a, { owner: e }));
    else if (d !== a)
      if (e.hasValue(i)) {
        const f = e.getValue(i);
        f.liveStyle === !0 ? f.jump(a) : f.hasAnimated || f.set(a);
      } else {
        const f = e.getStaticValue(i);
        e.addValue(i, so(f !== void 0 ? f : a, { owner: e }));
      }
  }
  for (const i in o)
    n[i] === void 0 && e.removeValue(i);
  return n;
}
const Fc = { current: null }, wv = { current: !1 }, ST = typeof window < "u";
function wT() {
  if (wv.current = !0, !!ST)
    if (window.matchMedia) {
      const e = window.matchMedia("(prefers-reduced-motion)"), n = () => Fc.current = e.matches;
      e.addEventListener("change", n), n();
    } else
      Fc.current = !1;
}
const Bh = [
  "AnimationStart",
  "AnimationComplete",
  "Update",
  "BeforeLayoutMeasure",
  "LayoutMeasure",
  "LayoutAnimationStart",
  "LayoutAnimationComplete"
];
let va = {};
function xv(e) {
  va = e;
}
function xT() {
  return va;
}
class _T {
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
    this.current = null, this.children = /* @__PURE__ */ new Set(), this.isVariantNode = !1, this.isControllingVariants = !1, this.shouldReduceMotion = null, this.shouldSkipAnimations = !1, this.values = /* @__PURE__ */ new Map(), this.KeyframeResolver = _d, this.features = {}, this.valueSubscriptions = /* @__PURE__ */ new Map(), this.prevMotionValues = {}, this.hasBeenMounted = !1, this.events = {}, this.propEventSubscriptions = {}, this.notifyUpdate = () => this.notify("Update", this.latestValues), this.render = () => {
      this.current && (this.triggerBuild(), this.renderInstance(this.current, this.renderState, this.props.style, this.projection));
    }, this.renderScheduledAt = 0, this.scheduleRender = () => {
      const S = at.now();
      this.renderScheduledAt < S && (this.renderScheduledAt = S, Ce.render(this.render, !1, !0));
    };
    const { latestValues: y, renderState: v } = p;
    this.latestValues = y, this.baseTarget = { ...y }, this.initialValues = o.initial ? { ...y } : {}, this.renderState = v, this.parent = n, this.props = o, this.presenceContext = i, this.depth = n ? n.depth + 1 : 0, this.reducedMotionConfig = a, this.skipAnimationsConfig = d, this.options = m, this.blockInitialAnimation = !!f, this.isControllingVariants = Ia(o), this.isVariantNode = Sv(o), this.isVariantNode && (this.variantChildren = /* @__PURE__ */ new Set()), this.manuallyAnimateOnMount = !!(n && n.current);
    const { willChange: l, ...c } = this.scrapeMotionValuesFromProps(o, {}, this);
    for (const S in c) {
      const x = c[S];
      y[S] !== void 0 && Je(x) && x.set(y[S]);
    }
  }
  mount(n) {
    var o, i;
    if (this.hasBeenMounted)
      for (const a in this.initialValues)
        (o = this.values.get(a)) == null || o.jump(this.initialValues[a]), this.latestValues[a] = this.initialValues[a];
    this.current = n, gT.set(n, this), this.projection && !this.projection.instance && this.projection.mount(n), this.parent && this.isVariantNode && !this.isControllingVariants && (this.removeFromVariantTree = this.parent.addVariantChild(this)), this.values.forEach((a, d) => this.bindToMotionValue(d, a)), this.reducedMotionConfig === "never" ? this.shouldReduceMotion = !1 : this.reducedMotionConfig === "always" ? this.shouldReduceMotion = !0 : (wv.current || wT(), this.shouldReduceMotion = Fc.current), this.shouldSkipAnimations = this.skipAnimationsConfig ?? !1, (i = this.parent) == null || i.addChild(this), this.update(this.props, this.presenceContext), this.hasBeenMounted = !0;
  }
  unmount() {
    var n;
    this.projection && this.projection.unmount(), Kn(this.notifyUpdate), Kn(this.render), this.valueSubscriptions.forEach((o) => o()), this.valueSubscriptions.clear(), this.removeFromVariantTree && this.removeFromVariantTree(), (n = this.parent) == null || n.removeChild(this);
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
    if (this.valueSubscriptions.has(n) && this.valueSubscriptions.get(n)(), o.accelerate && nv.has(n) && this.current instanceof HTMLElement) {
      const { factory: f, keyframes: p, times: m, ease: y, duration: v } = o.accelerate, l = new ev({
        element: this.current,
        name: n,
        keyframes: p,
        times: m,
        ease: y,
        duration: /* @__PURE__ */ gt(v)
      }), c = f(l);
      this.valueSubscriptions.set(n, () => {
        c(), l.cancel();
      });
      return;
    }
    const i = po.has(n);
    i && this.onBindTransform && this.onBindTransform();
    const a = o.on("change", (f) => {
      this.latestValues[n] = f, this.props.onUpdate && Ce.preRender(this.notifyUpdate), i && this.projection && (this.projection.isTransformDirty = !0), this.scheduleRender();
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
    for (n in va) {
      const o = va[n];
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
    for (let i = 0; i < Bh.length; i++) {
      const a = Bh[i];
      this.propEventSubscriptions[a] && (this.propEventSubscriptions[a](), delete this.propEventSubscriptions[a]);
      const d = "on" + a, f = n[d];
      f && (this.propEventSubscriptions[a] = this.on(a, f));
    }
    this.prevMotionValues = vT(this, this.scrapeMotionValuesFromProps(n, this.prevProps || {}, this), this.prevMotionValues), this.handleChildMotionValue && this.handleChildMotionValue();
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
    return i === void 0 && o !== void 0 && (i = so(o === null ? void 0 : o, { owner: this }), this.addValue(n, i)), i;
  }
  /**
   * If we're trying to animate to a previously unencountered value,
   * we need to check for it in our state and as a last resort read it
   * directly from the instance (which might have performance implications).
   */
  readValue(n, o) {
    let i = this.latestValues[n] !== void 0 || !this.current ? this.latestValues[n] : this.getBaseTargetFromProps(this.props, n) ?? this.readValueFromInstance(this.current, n, this.options);
    return i != null && (typeof i == "string" && (wg(i) || _g(i)) ? i = parseFloat(i) : !yT(i) && Wt.test(o) && (i = pv(n, o)), this.setBaseTarget(n, Je(i) ? i.get() : i)), Je(i) ? i.get() : i;
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
      const f = Ad(this.props, o, (d = this.presenceContext) == null ? void 0 : d.custom);
      f && (i = f[n]);
    }
    if (o && i !== void 0)
      return i;
    const a = this.getBaseTargetFromProps(this.props, n);
    return a !== void 0 && !Je(a) ? a : this.initialValues[n] !== void 0 && i === void 0 ? void 0 : this.baseTarget[n];
  }
  on(n, o) {
    return this.events[n] || (this.events[n] = new pd()), this.events[n].add(o);
  }
  notify(n, ...o) {
    this.events[n] && this.events[n].notify(...o);
  }
  scheduleRenderMicrotask() {
    Pd.render(this.render);
  }
}
class _v extends _T {
  constructor() {
    super(...arguments), this.KeyframeResolver = X_;
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
    Je(n) && (this.childSubscription = n.on("change", (o) => {
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
function Tv({ top: e, left: n, right: o, bottom: i }) {
  return {
    x: { min: n, max: o },
    y: { min: e, max: i }
  };
}
function TT({ x: e, y: n }) {
  return { top: n.min, right: e.max, bottom: n.max, left: e.min };
}
function kT(e, n) {
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
function Zu(e) {
  return e === void 0 || e === 1;
}
function Oc({ scale: e, scaleX: n, scaleY: o }) {
  return !Zu(e) || !Zu(n) || !Zu(o);
}
function cr(e) {
  return Oc(e) || kv(e) || e.z || e.rotate || e.rotateX || e.rotateY || e.skewX || e.skewY;
}
function kv(e) {
  return Uh(e.x) || Uh(e.y);
}
function Uh(e) {
  return e && e !== "0%";
}
function Sa(e, n, o) {
  const i = e - o, a = n * i;
  return o + a;
}
function $h(e, n, o, i, a) {
  return a !== void 0 && (e = Sa(e, a, i)), Sa(e, o, i) + n;
}
function Lc(e, n = 0, o = 1, i, a) {
  e.min = $h(e.min, n, o, i, a), e.max = $h(e.max, n, o, i, a);
}
function Av(e, { x: n, y: o }) {
  Lc(e.x, n.translate, n.scale, n.originPoint), Lc(e.y, o.translate, o.scale, o.originPoint);
}
const Hh = 0.999999999999, Wh = 1.0000000000001;
function AT(e, n, o, i = !1) {
  var p;
  const a = o.length;
  if (!a)
    return;
  n.x = n.y = 1;
  let d, f;
  for (let m = 0; m < a; m++) {
    d = o[m], f = d.projectionDelta;
    const { visualElement: y } = d.options;
    y && y.props.style && y.props.style.display === "contents" || (i && d.options.layoutScroll && d.scroll && d !== d.root && (en(e.x, -d.scroll.offset.x), en(e.y, -d.scroll.offset.y)), f && (n.x *= f.x.scale, n.y *= f.y.scale, Av(e, f)), i && cr(d.latestValues) && ra(e, d.latestValues, (p = d.layout) == null ? void 0 : p.layoutBox));
  }
  n.x < Wh && n.x > Hh && (n.x = 1), n.y < Wh && n.y > Hh && (n.y = 1);
}
function en(e, n) {
  e.min += n, e.max += n;
}
function Gh(e, n, o, i, a = 0.5) {
  const d = Ae(e.min, e.max, a);
  Lc(e, n, o, d, i);
}
function Kh(e, n) {
  return typeof e == "string" ? parseFloat(e) / 100 * (n.max - n.min) : e;
}
function ra(e, n, o) {
  const i = o ?? e;
  Gh(e.x, Kh(n.x, i.x), n.scaleX, n.scale, n.originX), Gh(e.y, Kh(n.y, i.y), n.scaleY, n.scale, n.originY);
}
function Cv(e, n) {
  return Tv(kT(e.getBoundingClientRect(), n));
}
function CT(e, n, o) {
  const i = Cv(e, o), { scroll: a } = n;
  return a && (en(i.x, a.offset.x), en(i.y, a.offset.y)), i;
}
const bT = {
  x: "translateX",
  y: "translateY",
  z: "translateZ",
  transformPerspective: "perspective"
}, PT = fo.length;
function ET(e, n, o) {
  let i = "", a = !0;
  for (let f = 0; f < PT; f++) {
    const p = fo[f], m = e[p];
    if (m === void 0)
      continue;
    let y = !0;
    if (typeof m == "number")
      y = m === (p.startsWith("scale") ? 1 : 0);
    else {
      const v = parseFloat(m);
      y = p.startsWith("scale") ? v === 1 : v === 0;
    }
    if (!y || o) {
      const v = Ic(m, ga[p]);
      if (!y) {
        a = !1;
        const l = bT[p] || p;
        i += `${l}(${v}) `;
      }
      o && (n[p] = v);
    }
  }
  const d = e.pathRotation;
  return d && (a = !1, i += `rotate(${Ic(d, ga.pathRotation)}) `), i = i.trim(), o ? i = o(n, a ? "" : i) : a && (i = "none"), i;
}
function Dd(e, n, o) {
  const { style: i, vars: a, transformOrigin: d } = e;
  let f = !1, p = !1;
  for (const m in n) {
    const y = n[m];
    if (po.has(m)) {
      f = !0;
      continue;
    } else if (Og(m)) {
      a[m] = y;
      continue;
    } else {
      const v = Ic(y, ga[m]);
      m.startsWith("origin") ? (p = !0, d[m] = v) : i[m] = v;
    }
  }
  if (n.transform || (f || o ? i.transform = ET(n, e.transform, o) : i.transform && (i.transform = "none")), p) {
    const { originX: m = "50%", originY: y = "50%", originZ: v = 0 } = d;
    i.transformOrigin = `${m} ${y} ${v}`;
  }
}
function bv(e, { style: n, vars: o }, i, a) {
  const d = e.style;
  let f;
  for (f in n)
    d[f] = n[f];
  a == null || a.applyProjectionStyles(d, i);
  for (f in o)
    d.setProperty(f, o[f]);
}
function Yh(e, n) {
  return n.max === n.min ? 0 : e / (n.max - n.min) * 100;
}
const ni = {
  correct: (e, n) => {
    if (!n.target)
      return e;
    if (typeof e == "string")
      if (re.test(e))
        e = parseFloat(e);
      else
        return e;
    const o = Yh(e, n.target.x), i = Yh(e, n.target.y);
    return `${o}% ${i}%`;
  }
}, MT = {
  correct: (e, { treeScale: n, projectionDelta: o }) => {
    const i = e, a = Wt.parse(e);
    if (a.length > 5)
      return i;
    const d = Wt.createTransformer(e), f = typeof a[0] != "number" ? 1 : 0, p = o.x.scale * n.x, m = o.y.scale * n.y;
    a[0 + f] /= p, a[1 + f] /= m;
    const y = Ae(p, m, 0.5);
    return typeof a[2 + f] == "number" && (a[2 + f] /= y), typeof a[3 + f] == "number" && (a[3 + f] /= y), d(a);
  }
}, Vc = {
  borderRadius: {
    ...ni,
    applyTo: [...bd]
  },
  borderTopLeftRadius: ni,
  borderTopRightRadius: ni,
  borderBottomLeftRadius: ni,
  borderBottomRightRadius: ni,
  boxShadow: MT
};
function Pv(e, { layout: n, layoutId: o }) {
  return po.has(e) || e.startsWith("origin") || (n || o !== void 0) && (!!Vc[e] || e === "opacity");
}
function jd(e, n, o) {
  var f;
  const i = e.style, a = n == null ? void 0 : n.style, d = {};
  if (!i)
    return d;
  for (const p in i)
    (Je(i[p]) || a && Je(a[p]) || Pv(p, e) || ((f = o == null ? void 0 : o.getValue(p)) == null ? void 0 : f.liveStyle) !== void 0) && (d[p] = i[p]);
  return d;
}
function RT(e) {
  return window.getComputedStyle(e);
}
class NT extends _v {
  constructor() {
    super(...arguments), this.type = "html", this.renderInstance = bv;
  }
  readValueFromInstance(n, o) {
    var i;
    if (po.has(o))
      return (i = this.projection) != null && i.isProjecting ? kc(o) : Z1(n, o);
    {
      const a = RT(n), d = (Og(o) ? a.getPropertyValue(o) : a[o]) || 0;
      return typeof d == "string" ? d.trim() : d;
    }
  }
  measureInstanceViewportBox(n, { transformPagePoint: o }) {
    return Cv(n, o);
  }
  build(n, o, i) {
    Dd(n, o, i.transformTemplate);
  }
  scrapeMotionValuesFromProps(n, o, i) {
    return jd(n, o, i);
  }
}
const DT = {
  offset: "stroke-dashoffset",
  array: "stroke-dasharray"
}, jT = {
  offset: "strokeDashoffset",
  array: "strokeDasharray"
};
function IT(e, n, o = 1, i = 0, a = !0) {
  e.pathLength = 1;
  const d = a ? DT : jT;
  e[d.offset] = `${-i}`, e[d.array] = `${n} ${o}`;
}
const FT = [
  "offsetDistance",
  "offsetPath",
  "offsetRotate",
  "offsetAnchor"
];
function Ev(e, {
  attrX: n,
  attrY: o,
  attrScale: i,
  pathLength: a,
  pathSpacing: d = 1,
  pathOffset: f = 0,
  // This is object creation, which we try to avoid per-frame.
  ...p
}, m, y, v) {
  if (Dd(e, p, y), m) {
    e.style.viewBox && (e.attrs.viewBox = e.style.viewBox);
    return;
  }
  e.attrs = e.style, e.style = {};
  const { attrs: l, style: c } = e;
  l.transform && (c.transform = l.transform, delete l.transform), (c.transform || l.transformOrigin) && (c.transformOrigin = l.transformOrigin ?? "50% 50%", delete l.transformOrigin), c.transform && (c.transformBox = (v == null ? void 0 : v.transformBox) ?? "fill-box", delete l.transformBox);
  for (const S of FT)
    l[S] !== void 0 && (c[S] = l[S], delete l[S]);
  n !== void 0 && (l.x = n), o !== void 0 && (l.y = o), i !== void 0 && (l.scale = i), a !== void 0 && IT(l, a, d, f, !1);
}
const Mv = /* @__PURE__ */ new Set([
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
]), Rv = (e) => typeof e == "string" && e.toLowerCase() === "svg";
function OT(e, n, o, i) {
  bv(e, n, void 0, i);
  for (const a in n.attrs)
    e.setAttribute(Mv.has(a) ? a : Cd(a), n.attrs[a]);
}
function Nv(e, n, o) {
  const i = jd(e, n, o);
  for (const a in e)
    if (Je(e[a]) || Je(n[a])) {
      const d = fo.indexOf(a) !== -1 ? "attr" + a.charAt(0).toUpperCase() + a.substring(1) : a;
      i[d] = e[a];
    }
  return i;
}
class LT extends _v {
  constructor() {
    super(...arguments), this.type = "svg", this.isSVGTag = !1, this.measureInstanceViewportBox = He;
  }
  getBaseTargetFromProps(n, o) {
    return n[o];
  }
  readValueFromInstance(n, o) {
    if (po.has(o)) {
      const i = fv(o);
      return i && i.default || 0;
    }
    return o = Mv.has(o) ? o : Cd(o), n.getAttribute(o);
  }
  scrapeMotionValuesFromProps(n, o, i) {
    return Nv(n, o, i);
  }
  build(n, o, i) {
    Ev(n, o, this.isSVGTag, i.transformTemplate, i.style);
  }
  renderInstance(n, o, i, a) {
    OT(n, o, i, a);
  }
  mount(n) {
    this.isSVGTag = Rv(n.tagName), super.mount(n);
  }
}
const VT = Nd.length;
function Dv(e) {
  if (!e)
    return;
  if (!e.isControllingVariants) {
    const o = e.parent ? Dv(e.parent) || {} : {};
    return e.props.initial !== void 0 && (o.initial = e.props.initial), o;
  }
  const n = {};
  for (let o = 0; o < VT; o++) {
    const i = Nd[o], a = e.props[i];
    (hi(a) || a === !1) && (n[i] = a);
  }
  return n;
}
function jv(e, n) {
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
const zT = [...Rd].reverse(), BT = Rd.length;
function UT(e) {
  return (n) => Promise.all(n.map(({ animation: o, options: i }) => V_(e, o, i)));
}
function $T(e) {
  let n = UT(e), o = Qh(), i = !0, a = !1;
  const d = (y) => (v, l) => {
    var S;
    const c = Sr(e, l, y === "exit" ? (S = e.presenceContext) == null ? void 0 : S.custom : void 0);
    if (c) {
      const { transition: x, transitionEnd: k, ...A } = c;
      v = { ...v, ...A, ...k };
    }
    return v;
  };
  function f(y) {
    n = y(e);
  }
  function p(y) {
    const { props: v } = e, l = Dv(e.parent) || {}, c = [], S = /* @__PURE__ */ new Set();
    let x = {}, k = 1 / 0;
    for (let _ = 0; _ < BT; _++) {
      const b = zT[_], E = o[b], D = v[b] !== void 0 ? v[b] : l[b], O = hi(D), K = b === y ? E.isActive : null;
      K === !1 && (k = _);
      let W = D === l[b] && D !== v[b] && O;
      if (W && (i || a) && e.manuallyAnimateOnMount && (W = !1), E.protectedKeys = { ...x }, // If it isn't active and hasn't *just* been set as inactive
      !E.isActive && K === null || // If we didn't and don't have any defined prop for this animation type
      !D && !E.prevProp || // Or if the prop doesn't define an animation
      ja(D) || typeof D == "boolean")
        continue;
      if (b === "exit" && E.isActive && K !== !0) {
        E.prevResolvedValues && (x = {
          ...x,
          ...E.prevResolvedValues
        });
        continue;
      }
      const $ = HT(E.prevProp, D);
      let G = $ || // If we're making this variant active, we want to always make it active
      b === y && E.isActive && !W && O || // If we removed a higher-priority variant (i is in reverse order)
      _ > k && O, Z = !1;
      const te = Array.isArray(D) ? D : [D];
      let ce = te.reduce(d(b), {});
      K === !1 && (ce = {});
      const { prevResolvedValues: he = {} } = E, pe = {
        ...he,
        ...ce
      }, we = (B) => {
        G = !0, S.has(B) && (Z = !0, S.delete(B)), E.needsAnimating[B] = !0;
        const ee = e.getValue(B);
        ee && (ee.liveStyle = !1);
      };
      for (const B in pe) {
        const ee = ce[B], X = he[B];
        if (x.hasOwnProperty(B))
          continue;
        let N = !1;
        Mc(ee) && Mc(X) ? N = !jv(ee, X) || $ : N = ee !== X, N ? ee != null ? we(B) : S.add(B) : ee !== void 0 && S.has(B) ? we(B) : E.protectedKeys[B] = !0;
      }
      E.prevProp = D, E.prevResolvedValues = ce, E.isActive && (x = { ...x, ...ce }), (i || a) && e.blockInitialAnimation && (G = !1);
      const Q = W && $;
      G && (!Q || Z) && c.push(...te.map((B) => {
        const ee = { type: b };
        if (typeof B == "string" && (i || a) && !Q && e.manuallyAnimateOnMount && e.parent) {
          const { parent: X } = e, N = Sr(X, B);
          if (X.enteringChildren && N) {
            const { delayChildren: L } = N.transition || {};
            ee.delay = rv(X.enteringChildren, e, L);
          }
        }
        return {
          animation: B,
          options: ee
        };
      }));
    }
    if (S.size) {
      const _ = {};
      if (typeof v.initial != "boolean") {
        const b = Sr(e, Array.isArray(v.initial) ? v.initial[0] : v.initial);
        b && b.transition && (_.transition = b.transition);
      }
      S.forEach((b) => {
        const E = e.getBaseTarget(b), D = e.getValue(b);
        D && (D.liveStyle = !0), _[b] = E ?? null;
      }), c.push({ animation: _ });
    }
    let A = !!c.length;
    return i && (v.initial === !1 || v.initial === v.animate) && !e.manuallyAnimateOnMount && (A = !1), i = !1, a = !1, A ? n(c) : Promise.resolve();
  }
  function m(y, v) {
    var c;
    if (o[y].isActive === v)
      return Promise.resolve();
    (c = e.variantChildren) == null || c.forEach((S) => {
      var x;
      return (x = S.animationState) == null ? void 0 : x.setActive(y, v);
    }), o[y].isActive = v;
    const l = p(y);
    for (const S in o)
      o[S].protectedKeys = {};
    return l;
  }
  return {
    animateChanges: p,
    setActive: m,
    setAnimateFunction: f,
    getState: () => o,
    reset: () => {
      o = Qh(), a = !0;
    }
  };
}
function HT(e, n) {
  return typeof n == "string" ? n !== e : Array.isArray(n) ? !jv(n, e) : !1;
}
function ur(e = !1) {
  return {
    isActive: e,
    protectedKeys: {},
    needsAnimating: {},
    prevResolvedValues: {}
  };
}
function Qh() {
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
function zc(e, n) {
  e.min = n.min, e.max = n.max;
}
function Ut(e, n) {
  zc(e.x, n.x), zc(e.y, n.y);
}
function Xh(e, n) {
  e.translate = n.translate, e.scale = n.scale, e.originPoint = n.originPoint, e.origin = n.origin;
}
const Iv = 1e-4, WT = 1 - Iv, GT = 1 + Iv, Fv = 0.01, KT = 0 - Fv, YT = 0 + Fv;
function lt(e) {
  return e.max - e.min;
}
function QT(e, n, o) {
  return Math.abs(e - n) <= o;
}
function Zh(e, n, o, i = 0.5) {
  e.origin = i, e.originPoint = Ae(n.min, n.max, e.origin), e.scale = lt(o) / lt(n), e.translate = Ae(o.min, o.max, e.origin) - e.originPoint, (e.scale >= WT && e.scale <= GT || isNaN(e.scale)) && (e.scale = 1), (e.translate >= KT && e.translate <= YT || isNaN(e.translate)) && (e.translate = 0);
}
function li(e, n, o, i) {
  Zh(e.x, n.x, o.x, i ? i.originX : void 0), Zh(e.y, n.y, o.y, i ? i.originY : void 0);
}
function Jh(e, n, o, i = 0) {
  const a = i ? Ae(o.min, o.max, i) : o.min;
  e.min = a + n.min, e.max = e.min + lt(n);
}
function XT(e, n, o, i) {
  Jh(e.x, n.x, o.x, i == null ? void 0 : i.x), Jh(e.y, n.y, o.y, i == null ? void 0 : i.y);
}
function qh(e, n, o, i = 0) {
  const a = i ? Ae(o.min, o.max, i) : o.min;
  e.min = n.min - a, e.max = e.min + lt(n);
}
function wa(e, n, o, i) {
  qh(e.x, n.x, o.x, i == null ? void 0 : i.x), qh(e.y, n.y, o.y, i == null ? void 0 : i.y);
}
function ey(e, n, o, i, a) {
  return e -= n, e = Sa(e, 1 / o, i), a !== void 0 && (e = Sa(e, 1 / a, i)), e;
}
function ZT(e, n = 0, o = 1, i = 0.5, a, d = e, f = e) {
  if (rn.test(n) && (n = parseFloat(n), n = Ae(f.min, f.max, n / 100) - f.min), typeof n != "number")
    return;
  let p = Ae(d.min, d.max, i);
  e === d && (p -= n), e.min = ey(e.min, n, o, p, a), e.max = ey(e.max, n, o, p, a);
}
function ty(e, n, [o, i, a], d, f) {
  ZT(e, n[o], n[i], n[a], n.scale, d, f);
}
const JT = ["x", "scaleX", "originX"], qT = ["y", "scaleY", "originY"];
function ny(e, n, o, i) {
  ty(e.x, n, JT, o ? o.x : void 0, i ? i.x : void 0), ty(e.y, n, qT, o ? o.y : void 0, i ? i.y : void 0);
}
function ry(e) {
  return e.translate === 0 && e.scale === 1;
}
function Ov(e) {
  return ry(e.x) && ry(e.y);
}
function oy(e, n) {
  return e.min === n.min && e.max === n.max;
}
function ek(e, n) {
  return oy(e.x, n.x) && oy(e.y, n.y);
}
function iy(e, n) {
  return Math.round(e.min) === Math.round(n.min) && Math.round(e.max) === Math.round(n.max);
}
function Lv(e, n) {
  return iy(e.x, n.x) && iy(e.y, n.y);
}
function sy(e) {
  return lt(e.x) / lt(e.y);
}
function ay(e, n) {
  return e.translate === n.translate && e.scale === n.scale && e.originPoint === n.originPoint;
}
function qt(e) {
  return [e("x"), e("y")];
}
function tk(e, n, o) {
  let i = "";
  const a = e.x.translate / n.x, d = e.y.translate / n.y, f = (o == null ? void 0 : o.z) || 0;
  if ((a || d || f) && (i = `translate3d(${a}px, ${d}px, ${f}px) `), (n.x !== 1 || n.y !== 1) && (i += `scale(${1 / n.x}, ${1 / n.y}) `), o) {
    const { transformPerspective: y, rotate: v, pathRotation: l, rotateX: c, rotateY: S, skewX: x, skewY: k } = o;
    y && (i = `perspective(${y}px) ${i}`), v && (i += `rotate(${v}deg) `), l && (i += `rotate(${l}deg) `), c && (i += `rotateX(${c}deg) `), S && (i += `rotateY(${S}deg) `), x && (i += `skewX(${x}deg) `), k && (i += `skewY(${k}deg) `);
  }
  const p = e.x.scale * n.x, m = e.y.scale * n.y;
  return (p !== 1 || m !== 1) && (i += `scale(${p}, ${m})`), i || "none";
}
const nk = bd.length, ly = (e) => typeof e == "string" ? parseFloat(e) : e, uy = (e) => typeof e == "number" || re.test(e);
function rk(e, n, o, i, a, d) {
  a ? (e.opacity = Ae(0, o.opacity ?? 1, ok(i)), e.opacityExit = Ae(n.opacity ?? 1, 0, ik(i))) : d && (e.opacity = Ae(n.opacity ?? 1, o.opacity ?? 1, i));
  for (let f = 0; f < nk; f++) {
    const p = bd[f];
    let m = cy(n, p), y = cy(o, p);
    if (m === void 0 && y === void 0)
      continue;
    m || (m = 0), y || (y = 0), m === 0 || y === 0 || uy(m) === uy(y) ? (e[p] = Math.max(Ae(ly(m), ly(y), i), 0), (rn.test(y) || rn.test(m)) && (e[p] += "%")) : e[p] = y;
  }
  (n.rotate || o.rotate) && (e.rotate = Ae(n.rotate || 0, o.rotate || 0, i));
}
function cy(e, n) {
  return e[n] !== void 0 ? e[n] : e.borderRadius;
}
const ok = /* @__PURE__ */ Vv(0, 0.5, Rg), ik = /* @__PURE__ */ Vv(0.5, 0.95, jt);
function Vv(e, n, o) {
  return (i) => i < e ? 0 : i > n ? 1 : o(/* @__PURE__ */ pi(e, n, i));
}
function sk(e, n, o) {
  const i = Je(e) ? e : so(e);
  return i.start(kd("", i, n, o)), i.animation;
}
function yi(e, n, o, i = { passive: !0 }) {
  return e.addEventListener(n, o, i), () => e.removeEventListener(n, o, i);
}
const ak = (e, n) => e.depth - n.depth;
class lk {
  constructor() {
    this.children = [], this.isDirty = !1;
  }
  add(n) {
    fd(this.children, n), this.isDirty = !0;
  }
  remove(n) {
    fa(this.children, n), this.isDirty = !0;
  }
  forEach(n) {
    this.isDirty && this.children.sort(ak), this.isDirty = !1, this.children.forEach(n);
  }
}
function uk(e, n) {
  const o = at.now(), i = ({ timestamp: a }) => {
    const d = a - o;
    d >= n && (Kn(i), e(d - n));
  };
  return Ce.setup(i, !0), () => Kn(i);
}
function oa(e) {
  return Je(e) ? e.get() : e;
}
class ck {
  constructor() {
    this.members = [];
  }
  add(n) {
    fd(this.members, n);
    for (let o = this.members.length - 1; o >= 0; o--) {
      const i = this.members[o];
      if (i === n || i === this.lead || i === this.prevLead)
        continue;
      const a = i.instance;
      (!a || a.isConnected === !1) && !i.snapshot && (fa(this.members, i), i.unmount());
    }
    n.scheduleRender();
  }
  remove(n) {
    if (fa(this.members, n), n === this.prevLead && (this.prevLead = void 0), n === this.lead) {
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
const ia = {
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
}, Ju = ["", "X", "Y", "Z"], dk = 1e3;
let fk = 0;
function qu(e, n, o, i) {
  const { latestValues: a } = n;
  a[e] && (o[e] = a[e], n.setStaticValue(e, 0), i && (i[e] = 0));
}
function zv(e) {
  if (e.hasCheckedOptimisedAppear = !0, e.root === e)
    return;
  const { visualElement: n } = e.options;
  if (!n)
    return;
  const o = lv(n);
  if (window.MotionHasOptimisedAnimation(o, "transform")) {
    const { layout: a, layoutId: d } = e.options;
    window.MotionCancelOptimisedAnimation(o, "transform", Ce, !(a || d));
  }
  const { parent: i } = e;
  i && !i.hasCheckedOptimisedAppear && zv(i);
}
function Bv({ attachResizeListener: e, defaultParent: n, measureScroll: o, checkIsScrollRoot: i, resetTransform: a }) {
  return class {
    constructor(f = {}, p = n == null ? void 0 : n()) {
      this.id = fk++, this.animationId = 0, this.animationCommitId = 0, this.children = /* @__PURE__ */ new Set(), this.options = {}, this.isTreeAnimating = !1, this.isAnimationBlocked = !1, this.isLayoutDirty = !1, this.isProjectionDirty = !1, this.isSharedProjectionDirty = !1, this.isTransformDirty = !1, this.updateManuallyBlocked = !1, this.updateBlockedByResize = !1, this.isUpdating = !1, this.isSVG = !1, this.needsReset = !1, this.shouldResetTransform = !1, this.hasCheckedOptimisedAppear = !1, this.treeScale = { x: 1, y: 1 }, this.eventHandlers = /* @__PURE__ */ new Map(), this.hasTreeAnimated = !1, this.layoutVersion = 0, this.updateScheduled = !1, this.scheduleUpdate = () => this.update(), this.projectionUpdateScheduled = !1, this.checkUpdateFailed = () => {
        this.isUpdating && (this.isUpdating = !1, this.clearAllSnapshots());
      }, this.updateProjection = () => {
        this.projectionUpdateScheduled = !1, this.nodes.forEach(hk), this.nodes.forEach(xk), this.nodes.forEach(_k), this.nodes.forEach(yk);
      }, this.resolvedRelativeTargetAt = 0, this.linkedParentVersion = 0, this.hasProjected = !1, this.isVisible = !0, this.animationProgress = 0, this.sharedNodes = /* @__PURE__ */ new Map(), this.latestValues = f, this.root = p ? p.root || p : this, this.path = p ? [...p.path, p] : [], this.parent = p, this.depth = p ? p.depth + 1 : 0;
      for (let m = 0; m < this.path.length; m++)
        this.path[m].shouldResetTransform = !0;
      this.root === this && (this.nodes = new lk());
    }
    addEventListener(f, p) {
      return this.eventHandlers.has(f) || this.eventHandlers.set(f, new pd()), this.eventHandlers.get(f).add(p);
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
      this.isSVG = Md(f) && !mT(f), this.instance = f;
      const { layoutId: p, layout: m, visualElement: y } = this.options;
      if (y && !y.current && y.mount(f), this.root.nodes.add(this), this.parent && this.parent.children.add(this), this.root.hasTreeAnimated && (m || p) && (this.isLayoutDirty = !0), e) {
        let v, l = 0;
        const c = () => this.root.updateBlockedByResize = !1;
        Ce.read(() => {
          l = window.innerWidth;
        }), e(f, () => {
          const S = window.innerWidth;
          S !== l && (l = S, this.root.updateBlockedByResize = !0, v && v(), v = uk(c, 250), ia.hasAnimatedSinceResize && (ia.hasAnimatedSinceResize = !1, this.nodes.forEach(py)));
        });
      }
      p && this.root.registerSharedNode(p, this), this.options.animate !== !1 && y && (p || m) && this.addEventListener("didUpdate", ({ delta: v, hasLayoutChanged: l, hasRelativeLayoutChanged: c, layout: S }) => {
        if (this.isTreeAnimationBlocked()) {
          this.target = void 0, this.relativeTarget = void 0;
          return;
        }
        const x = this.options.transition || y.getDefaultTransition() || bk, { onLayoutAnimationStart: k, onLayoutAnimationComplete: A } = y.getProps(), _ = !this.targetLayout || !Lv(this.targetLayout, S), b = !l && c;
        if (this.options.layoutRoot || this.resumeFrom || b || l && (_ || !this.currentAnimation)) {
          this.resumeFrom && (this.resumingFrom = this.resumeFrom, this.resumingFrom.resumingFrom = void 0);
          const E = {
            ...Td(x, "layout"),
            onPlay: k,
            onComplete: A
          };
          (y.shouldReduceMotion || this.options.layoutRoot) && (E.delay = 0, E.type = !1), this.startAnimation(E), this.setAnimationOrigin(v, b, E.path);
        } else
          l || py(this), this.isLead() && this.options.onExitComplete && this.options.onExitComplete();
        this.targetLayout = S;
      });
    }
    unmount() {
      this.options.layoutId && this.willUpdate(), this.root.nodes.remove(this);
      const f = this.getStack();
      f && f.remove(this), this.parent && this.parent.children.delete(this), this.instance = void 0, this.eventHandlers.clear(), Kn(this.updateProjection);
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
      this.isUpdateBlocked() || (this.isUpdating = !0, this.nodes && this.nodes.forEach(Tk), this.animationId++);
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
      if (window.MotionCancelOptimisedAnimation && !this.hasCheckedOptimisedAppear && zv(this), !this.root.isUpdating && this.root.startUpdate(), this.isLayoutDirty)
        return;
      this.isLayoutDirty = !0;
      for (let v = 0; v < this.path.length; v++) {
        const l = this.path[v];
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
        this.unblockUpdate(), this.updateBlockedByResize = !1, this.clearAllSnapshots(), m && this.nodes.forEach(vk), this.nodes.forEach(dy);
        return;
      }
      if (this.animationId <= this.animationCommitId) {
        this.nodes.forEach(fy);
        return;
      }
      this.animationCommitId = this.animationId, this.isUpdating ? (this.isUpdating = !1, this.nodes.forEach(Sk), this.nodes.forEach(wk), this.nodes.forEach(pk), this.nodes.forEach(mk)) : this.nodes.forEach(fy), this.clearAllSnapshots();
      const p = at.now();
      Ze.delta = on(0, 1e3 / 60, p - Ze.timestamp), Ze.timestamp = p, Ze.isProcessing = !0, Hu.update.process(Ze), Hu.preRender.process(Ze), Hu.render.process(Ze), Ze.isProcessing = !1;
    }
    didUpdate() {
      this.updateScheduled || (this.updateScheduled = !0, Pd.read(this.scheduleUpdate));
    }
    clearAllSnapshots() {
      this.nodes.forEach(gk), this.sharedNodes.forEach(kk);
    }
    scheduleUpdateProjection() {
      this.projectionUpdateScheduled || (this.projectionUpdateScheduled = !0, Ce.preRender(this.updateProjection, !1, !0));
    }
    scheduleCheckAfterUnmount() {
      Ce.postRender(() => {
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
      const f = this.isLayoutDirty || this.shouldResetTransform || this.options.alwaysMeasureLayout, p = this.projectionDelta && !Ov(this.projectionDelta), m = this.getTransformTemplate(), y = m ? m(this.latestValues, "") : void 0, v = y !== this.prevTransformTemplateValue;
      f && this.instance && (p || cr(this.latestValues) || v) && (a(this.instance, y), this.shouldResetTransform = !1, this.scheduleRender());
    }
    measure(f = !0) {
      const p = this.measurePageBox();
      let m = this.removeElementScroll(p);
      return f && (m = this.removeTransform(m)), Pk(m), {
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
      if (!(((y = this.scroll) == null ? void 0 : y.wasRoot) || this.path.some(Ek))) {
        const { scroll: v } = this.root;
        v && (en(p.x, v.offset.x), en(p.y, v.offset.y));
      }
      return p;
    }
    removeElementScroll(f) {
      var m;
      const p = He();
      if (Ut(p, f), (m = this.scroll) != null && m.wasRoot)
        return p;
      for (let y = 0; y < this.path.length; y++) {
        const v = this.path[y], { scroll: l, options: c } = v;
        v !== this.root && l && c.layoutScroll && (l.wasRoot && Ut(p, f), en(p.x, l.offset.x), en(p.y, l.offset.y));
      }
      return p;
    }
    applyTransform(f, p = !1, m) {
      var v, l;
      const y = m || He();
      Ut(y, f);
      for (let c = 0; c < this.path.length; c++) {
        const S = this.path[c];
        !p && S.options.layoutScroll && S.scroll && S !== S.root && (en(y.x, -S.scroll.offset.x), en(y.y, -S.scroll.offset.y)), cr(S.latestValues) && ra(y, S.latestValues, (v = S.layout) == null ? void 0 : v.layoutBox);
      }
      return cr(this.latestValues) && ra(y, this.latestValues, (l = this.layout) == null ? void 0 : l.layoutBox), y;
    }
    removeTransform(f) {
      var m;
      const p = He();
      Ut(p, f);
      for (let y = 0; y < this.path.length; y++) {
        const v = this.path[y];
        if (!cr(v.latestValues))
          continue;
        let l;
        v.instance && (Oc(v.latestValues) && v.updateSnapshot(), l = He(), Ut(l, v.measurePageBox())), ny(p, v.latestValues, (m = v.snapshot) == null ? void 0 : m.layoutBox, l);
      }
      return cr(this.latestValues) && ny(p, this.latestValues), p;
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
      this.relativeParent && this.relativeParent.resolvedRelativeTargetAt !== Ze.timestamp && this.relativeParent.resolveTargetDelta(!0);
    }
    resolveTargetDelta(f = !1) {
      var S;
      const p = this.getLead();
      this.isProjectionDirty || (this.isProjectionDirty = p.isProjectionDirty), this.isTransformDirty || (this.isTransformDirty = p.isTransformDirty), this.isSharedProjectionDirty || (this.isSharedProjectionDirty = p.isSharedProjectionDirty);
      const m = !!this.resumingFrom || this !== p;
      if (!(f || m && this.isSharedProjectionDirty || this.isProjectionDirty || (S = this.parent) != null && S.isProjectionDirty || this.attemptToResolveRelativeTarget || this.root.updateBlockedByResize))
        return;
      const { layout: v, layoutId: l } = this.options;
      if (!this.layout || !(v || l))
        return;
      this.resolvedRelativeTargetAt = Ze.timestamp;
      const c = this.getClosestProjectingParent();
      c && this.linkedParentVersion !== c.layoutVersion && !c.options.layoutRoot && this.removeRelativeTarget(), !this.targetDelta && !this.relativeTarget && (this.options.layoutAnchor !== !1 && c && c.layout ? this.createRelativeTarget(c, this.layout.layoutBox, c.layout.layoutBox) : this.removeRelativeTarget()), !(!this.relativeTarget && !this.targetDelta) && (this.target || (this.target = He(), this.targetWithTransforms = He()), this.relativeTarget && this.relativeTargetOrigin && this.relativeParent && this.relativeParent.target ? (this.forceRelativeParentToResolveTarget(), XT(this.target, this.relativeTarget, this.relativeParent.target, this.options.layoutAnchor || void 0)) : this.targetDelta ? (this.resumingFrom ? this.applyTransform(this.layout.layoutBox, !1, this.target) : Ut(this.target, this.layout.layoutBox), Av(this.target, this.targetDelta)) : Ut(this.target, this.layout.layoutBox), this.attemptToResolveRelativeTarget && (this.attemptToResolveRelativeTarget = !1, this.options.layoutAnchor !== !1 && c && !!c.resumingFrom == !!this.resumingFrom && !c.options.layoutScroll && c.target && this.animationProgress !== 1 ? this.createRelativeTarget(c, this.target, c.target) : this.relativeParent = this.relativeTarget = void 0));
    }
    getClosestProjectingParent() {
      if (!(!this.parent || Oc(this.parent.latestValues) || kv(this.parent.latestValues)))
        return this.parent.isProjecting() ? this.parent : this.parent.getClosestProjectingParent();
    }
    isProjecting() {
      return !!((this.relativeTarget || this.targetDelta || this.options.layoutRoot) && this.layout);
    }
    createRelativeTarget(f, p, m) {
      this.relativeParent = f, this.linkedParentVersion = f.layoutVersion, this.forceRelativeParentToResolveTarget(), this.relativeTarget = He(), this.relativeTargetOrigin = He(), wa(this.relativeTargetOrigin, p, m, this.options.layoutAnchor || void 0), Ut(this.relativeTarget, this.relativeTargetOrigin);
    }
    removeRelativeTarget() {
      this.relativeParent = this.relativeTarget = void 0;
    }
    calcProjection() {
      var x;
      const f = this.getLead(), p = !!this.resumingFrom || this !== f;
      let m = !0;
      if ((this.isProjectionDirty || (x = this.parent) != null && x.isProjectionDirty) && (m = !1), p && (this.isSharedProjectionDirty || this.isTransformDirty) && (m = !1), this.resolvedRelativeTargetAt === Ze.timestamp && (m = !1), m)
        return;
      const { layout: y, layoutId: v } = this.options;
      if (this.isTreeAnimating = !!(this.parent && this.parent.isTreeAnimating || this.currentAnimation || this.pendingAnimation), this.isTreeAnimating || (this.targetDelta = this.relativeTarget = void 0), !this.layout || !(y || v))
        return;
      Ut(this.layoutCorrected, this.layout.layoutBox);
      const l = this.treeScale.x, c = this.treeScale.y;
      AT(this.layoutCorrected, this.treeScale, this.path, p), f.layout && !f.target && (this.treeScale.x !== 1 || this.treeScale.y !== 1) && (f.target = f.layout.layoutBox, f.targetWithTransforms = He());
      const { target: S } = f;
      if (!S) {
        this.prevProjectionDelta && (this.createProjectionDeltas(), this.scheduleRender());
        return;
      }
      !this.projectionDelta || !this.prevProjectionDelta ? this.createProjectionDeltas() : (Xh(this.prevProjectionDelta.x, this.projectionDelta.x), Xh(this.prevProjectionDelta.y, this.projectionDelta.y)), li(this.projectionDelta, this.layoutCorrected, S, this.latestValues), (this.treeScale.x !== l || this.treeScale.y !== c || !ay(this.projectionDelta.x, this.prevProjectionDelta.x) || !ay(this.projectionDelta.y, this.prevProjectionDelta.y)) && (this.hasProjected = !0, this.scheduleRender(), this.notifyListeners("projectionUpdate", S));
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
      this.prevProjectionDelta = no(), this.projectionDelta = no(), this.projectionDeltaWithTransform = no();
    }
    setAnimationOrigin(f, p = !1, m) {
      const y = this.snapshot, v = y ? y.latestValues : {}, l = { ...this.latestValues }, c = no();
      (!this.relativeParent || !this.relativeParent.options.layoutRoot) && (this.relativeTarget = this.relativeTargetOrigin = void 0), this.attemptToResolveRelativeTarget = !p;
      const S = He(), x = y ? y.source : void 0, k = this.layout ? this.layout.source : void 0, A = x !== k, _ = this.getStack(), b = !_ || _.members.length <= 1, E = !!(A && !b && this.options.crossfade === !0 && !this.path.some(Ck));
      this.animationProgress = 0;
      let D;
      const O = m == null ? void 0 : m.interpolateProjection(f);
      this.mixTargetDelta = (K) => {
        const W = K / 1e3, $ = O == null ? void 0 : O(W);
        $ ? (c.x.translate = $.x, c.x.scale = Ae(f.x.scale, 1, W), c.x.origin = f.x.origin, c.x.originPoint = f.x.originPoint, c.y.translate = $.y, c.y.scale = Ae(f.y.scale, 1, W), c.y.origin = f.y.origin, c.y.originPoint = f.y.originPoint) : (my(c.x, f.x, W), my(c.y, f.y, W)), this.setTargetDelta(c), this.relativeTarget && this.relativeTargetOrigin && this.layout && this.relativeParent && this.relativeParent.layout && (wa(S, this.layout.layoutBox, this.relativeParent.layout.layoutBox, this.options.layoutAnchor || void 0), Ak(this.relativeTarget, this.relativeTargetOrigin, S, W), D && ek(this.relativeTarget, D) && (this.isProjectionDirty = !1), D || (D = He()), Ut(D, this.relativeTarget)), A && (this.animationValues = l, rk(l, v, this.latestValues, W, E, b)), $ && $.rotate !== void 0 && (this.animationValues || (this.animationValues = l), this.animationValues.pathRotation = $.rotate), this.root.scheduleUpdateProjection(), this.scheduleRender(), this.animationProgress = W;
      }, this.mixTargetDelta(this.options.layoutRoot ? 1e3 : 0);
    }
    startAnimation(f) {
      var p, m, y;
      this.notifyListeners("animationStart"), (p = this.currentAnimation) == null || p.stop(), (y = (m = this.resumingFrom) == null ? void 0 : m.currentAnimation) == null || y.stop(), this.pendingAnimation && (Kn(this.pendingAnimation), this.pendingAnimation = void 0), this.pendingAnimation = Ce.update(() => {
        ia.hasAnimatedSinceResize = !0, this.motionValue || (this.motionValue = so(0)), this.motionValue.jump(0, !1), this.currentAnimation = sk(this.motionValue, [0, 1e3], {
          ...f,
          velocity: 0,
          isSync: !0,
          onUpdate: (v) => {
            this.mixTargetDelta(v), f.onUpdate && f.onUpdate(v);
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
      this.currentAnimation && (this.mixTargetDelta && this.mixTargetDelta(dk), this.currentAnimation.stop()), this.completeAnimation();
    }
    applyTransformsToTarget() {
      const f = this.getLead();
      let { targetWithTransforms: p, target: m, layout: y, latestValues: v } = f;
      if (!(!p || !m || !y)) {
        if (this !== f && this.layout && y && Uv(this.options.animationType, this.layout.layoutBox, y.layoutBox)) {
          m = this.target || He();
          const l = lt(this.layout.layoutBox.x);
          m.x.min = f.target.x.min, m.x.max = m.x.min + l;
          const c = lt(this.layout.layoutBox.y);
          m.y.min = f.target.y.min, m.y.max = m.y.min + c;
        }
        Ut(p, m), ra(p, v), li(this.projectionDeltaWithTransform, this.layoutCorrected, p, v);
      }
    }
    registerSharedNode(f, p) {
      this.sharedNodes.has(f) || this.sharedNodes.set(f, new ck()), this.sharedNodes.get(f).add(p);
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
      m.z && qu("z", f, y, this.animationValues);
      for (let v = 0; v < Ju.length; v++)
        qu(`rotate${Ju[v]}`, f, y, this.animationValues), qu(`skew${Ju[v]}`, f, y, this.animationValues);
      f.render();
      for (const v in y)
        f.setStaticValue(v, y[v]), this.animationValues && (this.animationValues[v] = y[v]);
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
        this.needsReset = !1, f.visibility = "", f.opacity = "", f.pointerEvents = oa(p == null ? void 0 : p.pointerEvents) || "", f.transform = m ? m(this.latestValues, "") : "none";
        return;
      }
      const y = this.getLead();
      if (!this.projectionDelta || !this.layout || !y.target) {
        this.options.layoutId && (f.opacity = this.latestValues.opacity !== void 0 ? this.latestValues.opacity : 1, f.pointerEvents = oa(p == null ? void 0 : p.pointerEvents) || ""), this.hasProjected && !cr(this.latestValues) && (f.transform = m ? m({}, "") : "none", this.hasProjected = !1);
        return;
      }
      f.visibility = "";
      const v = y.animationValues || y.latestValues;
      this.applyTransformsToTarget();
      let l = tk(this.projectionDeltaWithTransform, this.treeScale, v);
      m && (l = m(v, l)), f.transform = l;
      const { x: c, y: S } = this.projectionDelta;
      f.transformOrigin = `${c.origin * 100}% ${S.origin * 100}% 0`, y.animationValues ? f.opacity = y === this ? v.opacity ?? this.latestValues.opacity ?? 1 : this.preserveOpacity ? this.latestValues.opacity : v.opacityExit : f.opacity = y === this ? v.opacity !== void 0 ? v.opacity : "" : v.opacityExit !== void 0 ? v.opacityExit : 0;
      for (const x in Vc) {
        if (v[x] === void 0)
          continue;
        const { correct: k, applyTo: A, isCSSVariable: _ } = Vc[x], b = l === "none" ? v[x] : k(v[x], y);
        if (A) {
          const E = A.length;
          for (let D = 0; D < E; D++)
            f[A[D]] = b;
        } else
          _ ? this.options.visualElement.renderState.vars[x] = b : f[x] = b;
      }
      this.options.layoutId && (f.pointerEvents = y === this ? oa(p == null ? void 0 : p.pointerEvents) || "" : "none");
    }
    clearSnapshot() {
      this.resumeFrom = this.snapshot = void 0;
    }
    // Only run on root
    resetTree() {
      this.root.nodes.forEach((f) => {
        var p;
        return (p = f.currentAnimation) == null ? void 0 : p.stop();
      }), this.root.nodes.forEach(dy), this.root.sharedNodes.clear();
    }
  };
}
function pk(e) {
  e.updateLayout();
}
function mk(e) {
  var o;
  const n = ((o = e.resumeFrom) == null ? void 0 : o.snapshot) || e.snapshot;
  if (e.isLead() && e.layout && n && e.hasListeners("didUpdate")) {
    const { layoutBox: i, measuredBox: a } = e.layout, { animationType: d } = e.options, f = n.source !== e.layout.source;
    if (d === "size")
      qt((l) => {
        const c = f ? n.measuredBox[l] : n.layoutBox[l], S = lt(c);
        c.min = i[l].min, c.max = c.min + S;
      });
    else if (d === "x" || d === "y") {
      const l = d === "x" ? "y" : "x";
      zc(f ? n.measuredBox[l] : n.layoutBox[l], i[l]);
    } else Uv(d, n.layoutBox, i) && qt((l) => {
      const c = f ? n.measuredBox[l] : n.layoutBox[l], S = lt(i[l]);
      c.max = c.min + S, e.relativeTarget && !e.currentAnimation && (e.isProjectionDirty = !0, e.relativeTarget[l].max = e.relativeTarget[l].min + S);
    });
    const p = no();
    li(p, i, n.layoutBox);
    const m = no();
    f ? li(m, e.applyTransform(a, !0), n.measuredBox) : li(m, i, n.layoutBox);
    const y = !Ov(p);
    let v = !1;
    if (!e.resumeFrom) {
      const l = e.getClosestProjectingParent();
      if (l && !l.resumeFrom) {
        const { snapshot: c, layout: S } = l;
        if (c && S) {
          const x = e.options.layoutAnchor || void 0, k = He();
          wa(k, n.layoutBox, c.layoutBox, x);
          const A = He();
          wa(A, i, S.layoutBox, x), Lv(k, A) || (v = !0), l.options.layoutRoot && (e.relativeTarget = A, e.relativeTargetOrigin = k, e.relativeParent = l);
        }
      }
    }
    e.notifyListeners("didUpdate", {
      layout: i,
      snapshot: n,
      delta: m,
      layoutDelta: p,
      hasLayoutChanged: y,
      hasRelativeLayoutChanged: v
    });
  } else if (e.isLead()) {
    const { onExitComplete: i } = e.options;
    i && i();
  }
  e.options.transition = void 0;
}
function hk(e) {
  e.parent && (e.isProjecting() || (e.isProjectionDirty = e.parent.isProjectionDirty), e.isSharedProjectionDirty || (e.isSharedProjectionDirty = !!(e.isProjectionDirty || e.parent.isProjectionDirty || e.parent.isSharedProjectionDirty)), e.isTransformDirty || (e.isTransformDirty = e.parent.isTransformDirty));
}
function yk(e) {
  e.isProjectionDirty = e.isSharedProjectionDirty = e.isTransformDirty = !1;
}
function gk(e) {
  e.clearSnapshot();
}
function dy(e) {
  e.clearMeasurements();
}
function vk(e) {
  e.isLayoutDirty = !0, e.updateLayout();
}
function fy(e) {
  e.isLayoutDirty = !1;
}
function Sk(e) {
  e.isAnimationBlocked && e.layout && !e.isLayoutDirty && (e.snapshot = e.layout, e.isLayoutDirty = !0);
}
function wk(e) {
  const { visualElement: n } = e.options;
  n && n.getProps().onBeforeLayoutMeasure && n.notify("BeforeLayoutMeasure"), e.resetTransform();
}
function py(e) {
  e.finishAnimation(), e.targetDelta = e.relativeTarget = e.target = void 0, e.isProjectionDirty = !0;
}
function xk(e) {
  e.resolveTargetDelta();
}
function _k(e) {
  e.calcProjection();
}
function Tk(e) {
  e.resetSkewAndRotation();
}
function kk(e) {
  e.removeLeadSnapshot();
}
function my(e, n, o) {
  e.translate = Ae(n.translate, 0, o), e.scale = Ae(n.scale, 1, o), e.origin = n.origin, e.originPoint = n.originPoint;
}
function hy(e, n, o, i) {
  e.min = Ae(n.min, o.min, i), e.max = Ae(n.max, o.max, i);
}
function Ak(e, n, o, i) {
  hy(e.x, n.x, o.x, i), hy(e.y, n.y, o.y, i);
}
function Ck(e) {
  return e.animationValues && e.animationValues.opacityExit !== void 0;
}
const bk = {
  duration: 0.45,
  ease: [0.4, 0, 0.1, 1]
}, yy = (e) => typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().includes(e), gy = yy("applewebkit/") && !yy("chrome/") ? Math.round : jt;
function vy(e) {
  e.min = gy(e.min), e.max = gy(e.max);
}
function Pk(e) {
  vy(e.x), vy(e.y);
}
function Uv(e, n, o) {
  return e === "position" || e === "preserve-aspect" && !QT(sy(n), sy(o), 0.2);
}
function Ek(e) {
  var n;
  return e !== e.root && ((n = e.scroll) == null ? void 0 : n.wasRoot);
}
const Mk = Bv({
  attachResizeListener: (e, n) => yi(e, "resize", n),
  measureScroll: () => {
    var e, n;
    return {
      x: document.documentElement.scrollLeft || ((e = document.body) == null ? void 0 : e.scrollLeft) || 0,
      y: document.documentElement.scrollTop || ((n = document.body) == null ? void 0 : n.scrollTop) || 0
    };
  },
  checkIsScrollRoot: () => !0
}), ec = {
  current: void 0
}, $v = Bv({
  measureScroll: (e) => ({
    x: e.scrollLeft,
    y: e.scrollTop
  }),
  defaultParent: () => {
    if (!ec.current) {
      const e = new Mk({});
      e.mount(window), e.setOptions({ layoutScroll: !0 }), ec.current = e;
    }
    return ec.current;
  },
  resetTransform: (e, n) => {
    e.style.transform = n !== void 0 ? n : "none";
  },
  checkIsScrollRoot: (e) => window.getComputedStyle(e).position === "fixed"
}), Id = C.createContext({
  transformPagePoint: (e) => e,
  isStatic: !1,
  reducedMotion: "never"
});
function Sy(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function Rk(...e) {
  return (n) => {
    let o = !1;
    const i = e.map((a) => {
      const d = Sy(a, n);
      return !o && typeof d == "function" && (o = !0), d;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const d = i[a];
          typeof d == "function" ? d() : Sy(e[a], null);
        }
      };
  };
}
function Nk(...e) {
  return C.useCallback(Rk(...e), e);
}
class Dk extends C.Component {
  getSnapshotBeforeUpdate(n) {
    const o = this.props.childRef.current;
    if (qs(o) && n.isPresent && !this.props.isPresent && this.props.pop !== !1) {
      const i = o.offsetParent, a = qs(i) && i.offsetWidth || 0, d = qs(i) && i.offsetHeight || 0, f = getComputedStyle(o), p = this.props.sizeRef.current;
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
function jk({ children: e, isPresent: n, anchorX: o, anchorY: i, root: a, pop: d }) {
  var c;
  const f = C.useId(), p = C.useRef(null), m = C.useRef({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    direction: "ltr"
  }), { nonce: y } = C.useContext(Id), v = ((c = e.props) == null ? void 0 : c.ref) ?? (e == null ? void 0 : e.ref), l = Nk(p, v);
  return C.useInsertionEffect(() => {
    const { width: S, height: x, top: k, left: A, right: _, bottom: b, direction: E } = m.current;
    if (n || d === !1 || !p.current || !S || !x)
      return;
    const D = E === "rtl", O = o === "left" ? D ? `right: ${_}` : `left: ${A}` : D ? `left: ${A}` : `right: ${_}`, K = i === "bottom" ? `bottom: ${b}` : `top: ${k}`;
    p.current.dataset.motionPopId = f;
    const W = document.createElement("style");
    y && (W.nonce = y);
    const $ = a ?? document.head;
    return $.appendChild(W), W.sheet && W.sheet.insertRule(`
          [data-motion-pop-id="${f}"] {
            position: absolute !important;
            width: ${S}px !important;
            height: ${x}px !important;
            ${O}px !important;
            ${K}px !important;
          }
        `), () => {
      var G;
      (G = p.current) == null || G.removeAttribute("data-motion-pop-id"), $.contains(W) && $.removeChild(W);
    };
  }, [n]), w.jsx(Dk, { isPresent: n, childRef: p, sizeRef: m, pop: d, children: d === !1 ? e : C.cloneElement(e, { ref: l }) });
}
const Ik = ({ children: e, initial: n, isPresent: o, onExitComplete: i, custom: a, presenceAffectsLayout: d, mode: f, anchorX: p, anchorY: m, root: y }) => {
  const v = cd(Fk), l = C.useId(), c = C.useRef(o), S = C.useRef(i);
  dd(() => {
    c.current = o, S.current = i;
  });
  let x = !0, k = C.useMemo(() => (x = !1, {
    id: l,
    initial: n,
    isPresent: o,
    custom: a,
    onExitComplete: (A) => {
      v.set(A, !0);
      for (const _ of v.values())
        if (!_)
          return;
      i && i();
    },
    register: (A) => (v.set(A, !1), () => {
      var _;
      v.delete(A), !c.current && !v.size && ((_ = S.current) == null || _.call(S));
    })
  }), [o, v, i]);
  return d && x && (k = { ...k }), C.useMemo(() => {
    v.forEach((A, _) => v.set(_, !1));
  }, [o]), C.useEffect(() => {
    !o && !v.size && i && i();
  }, [o]), e = w.jsx(jk, { pop: f === "popLayout", isPresent: o, anchorX: p, anchorY: m, root: y, children: e }), w.jsx(Na.Provider, { value: k, children: e });
};
function Fk() {
  return /* @__PURE__ */ new Map();
}
function Hv(e = !0) {
  const n = C.useContext(Na);
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
const Vs = (e) => e.key || "";
function wy(e) {
  const n = [];
  return C.Children.forEach(e, (o) => {
    C.isValidElement(o) && n.push(o);
  }), n;
}
const Fa = ({ children: e, custom: n, initial: o = !0, onExitComplete: i, presenceAffectsLayout: a = !0, mode: d = "sync", propagate: f = !1, anchorX: p = "left", anchorY: m = "top", root: y }) => {
  const [v, l] = Hv(f), c = C.useMemo(() => wy(e), [e]), S = f && !v ? [] : c.map(Vs), x = C.useRef(!0), k = C.useRef(c), A = cd(() => /* @__PURE__ */ new Map()), _ = C.useRef(/* @__PURE__ */ new Set()), [b, E] = C.useState(c), [D, O] = C.useState(c);
  dd(() => {
    x.current = !1, k.current = c;
    for (let $ = 0; $ < D.length; $++) {
      const G = Vs(D[$]);
      S.includes(G) ? (A.delete(G), _.current.delete(G)) : A.get(G) !== !0 && A.set(G, !1);
    }
  }, [D, S.length, S.join("-")]);
  const K = [];
  if (c !== b) {
    let $ = [...c];
    for (let G = 0; G < D.length; G++) {
      const Z = D[G], te = Vs(Z);
      S.includes(te) || ($.splice(G, 0, Z), K.push(Z));
    }
    return d === "wait" && K.length && ($ = K), O(wy($)), E(c), null;
  }
  const { forceRender: W } = C.useContext(ud);
  return w.jsx(w.Fragment, { children: D.map(($) => {
    const G = Vs($), Z = f && !v ? !1 : c === D || S.includes(G), te = () => {
      if (_.current.has(G))
        return;
      if (A.has(G))
        _.current.add(G), A.set(G, !0);
      else
        return;
      let ce = !0;
      A.forEach((he) => {
        he || (ce = !1);
      }), ce && (W == null || W(), O(k.current), f && (l == null || l()), i && i());
    };
    return w.jsx(Ik, { isPresent: Z, initial: !x.current || o ? void 0 : !1, custom: n, presenceAffectsLayout: a, mode: d, root: y, onExitComplete: Z ? void 0 : te, anchorX: p, anchorY: m, children: $ }, G);
  }) });
}, Wv = C.createContext({ strict: !1 }), xy = {
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
let _y = !1;
function Ok() {
  if (_y)
    return;
  const e = {};
  for (const n in xy)
    e[n] = {
      isEnabled: (o) => xy[n].some((i) => !!o[i])
    };
  xv(e), _y = !0;
}
function Gv() {
  return Ok(), xT();
}
function Lk(e) {
  const n = Gv();
  for (const o in e)
    n[o] = {
      ...n[o],
      ...e[o]
    };
  xv(n);
}
const Vk = /* @__PURE__ */ new Set([
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
function xa(e) {
  return e.startsWith("while") || e.startsWith("drag") && e !== "draggable" || e.startsWith("layout") || e.startsWith("onTap") || e.startsWith("onPan") || e.startsWith("onLayout") || Vk.has(e);
}
let Kv = (e) => !xa(e);
function zk(e) {
  typeof e == "function" && (Kv = (n) => n.startsWith("on") ? !xa(n) : e(n));
}
try {
  zk(require("@emotion/is-prop-valid").default);
} catch {
}
function Bk(e, n, o) {
  const i = {};
  for (const a in e)
    a === "values" && typeof e.values == "object" || Je(e[a]) || (Kv(a) || o === !0 && xa(a) || !n && !xa(a) || // If trying to use native HTML drag events, forward drag listeners
    e.draggable && a.startsWith("onDrag")) && (i[a] = e[a]);
  return i;
}
const Oa = /* @__PURE__ */ C.createContext({});
function Uk(e, n) {
  if (Ia(e)) {
    const { initial: o, animate: i } = e;
    return {
      initial: o === !1 || hi(o) ? o : void 0,
      animate: hi(i) ? i : void 0
    };
  }
  return e.inherit !== !1 ? n : {};
}
function $k(e) {
  const { initial: n, animate: o } = Uk(e, C.useContext(Oa));
  return C.useMemo(() => ({ initial: n, animate: o }), [Ty(n), Ty(o)]);
}
function Ty(e) {
  return Array.isArray(e) ? e.join(" ") : e;
}
const Fd = () => ({
  style: {},
  transform: {},
  transformOrigin: {},
  vars: {}
});
function Yv(e, n, o) {
  for (const i in n)
    !Je(n[i]) && !Pv(i, o) && (e[i] = n[i]);
}
function Hk({ transformTemplate: e }, n) {
  return C.useMemo(() => {
    const o = Fd();
    return Dd(o, n, e), Object.assign({}, o.vars, o.style);
  }, [n]);
}
function Wk(e, n) {
  const o = e.style || {}, i = {};
  return Yv(i, o, e), Object.assign(i, Hk(e, n)), i;
}
function Gk(e, n) {
  const o = {}, i = Wk(e, n);
  return e.drag && e.dragListener !== !1 && (o.draggable = !1, i.userSelect = i.WebkitUserSelect = i.WebkitTouchCallout = "none", i.touchAction = e.drag === !0 ? "none" : `pan-${e.drag === "x" ? "y" : "x"}`), e.tabIndex === void 0 && (e.onTap || e.onTapStart || e.whileTap) && (o.tabIndex = 0), o.style = i, o;
}
const Qv = () => ({
  ...Fd(),
  attrs: {}
});
function Kk(e, n, o, i) {
  const a = C.useMemo(() => {
    const d = Qv();
    return Ev(d, n, Rv(i), e.transformTemplate, e.style), {
      ...d.attrs,
      style: { ...d.style }
    };
  }, [n]);
  if (e.style) {
    const d = {};
    Yv(d, e.style, e), a.style = { ...d, ...a.style };
  }
  return a;
}
const Yk = [
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
function Od(e) {
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
      !!(Yk.indexOf(e) > -1 || /**
       * If it contains a capital letter, it's an SVG component
       */
      /[A-Z]/u.test(e))
    )
  );
}
function Qk(e, n, o, { latestValues: i }, a, d = !1, f) {
  const m = (f ?? Od(e) ? Kk : Gk)(n, i, a, e), y = Bk(n, typeof e == "string", d), v = e !== C.Fragment ? { ...y, ...m, ref: o } : {}, { children: l } = n, c = C.useMemo(() => Je(l) ? l.get() : l, [l]);
  return C.createElement(e, {
    ...v,
    children: c
  });
}
function Xk({ scrapeMotionValuesFromProps: e, createRenderState: n }, o, i, a) {
  return {
    latestValues: Zk(o, i, a, e),
    renderState: n()
  };
}
function Zk(e, n, o, i) {
  const a = {}, d = i(e, {});
  for (const c in d)
    a[c] = oa(d[c]);
  let { initial: f, animate: p } = e;
  const m = Ia(e), y = Sv(e);
  n && y && !m && e.inherit !== !1 && (f === void 0 && (f = n.initial), p === void 0 && (p = n.animate));
  let v = o ? o.initial === !1 : !1;
  v = v || f === !1;
  const l = v ? p : f;
  if (l && typeof l != "boolean" && !ja(l)) {
    const c = Array.isArray(l) ? l : [l];
    for (let S = 0; S < c.length; S++) {
      const x = Ad(e, c[S]);
      if (x) {
        const { transitionEnd: k, transition: A, ..._ } = x;
        for (const b in _) {
          let E = _[b];
          if (Array.isArray(E)) {
            const D = v ? E.length - 1 : 0;
            E = E[D];
          }
          E !== null && (a[b] = E);
        }
        for (const b in k)
          a[b] = k[b];
      }
    }
  }
  return a;
}
const Xv = (e) => (n, o) => {
  const i = C.useContext(Oa), a = C.useContext(Na), d = () => Xk(e, n, i, a);
  return o ? d() : cd(d);
}, Jk = /* @__PURE__ */ Xv({
  scrapeMotionValuesFromProps: jd,
  createRenderState: Fd
}), qk = /* @__PURE__ */ Xv({
  scrapeMotionValuesFromProps: Nv,
  createRenderState: Qv
}), eA = Symbol.for("motionComponentSymbol");
function tA(e, n, o) {
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
const Zv = C.createContext({});
function qr(e) {
  return e && typeof e == "object" && Object.prototype.hasOwnProperty.call(e, "current");
}
function nA(e, n, o, i, a, d) {
  var E, D;
  const { visualElement: f } = C.useContext(Oa), p = C.useContext(Wv), m = C.useContext(Na), y = C.useContext(Id), v = y.reducedMotion, l = y.skipAnimations, c = C.useRef(null), S = C.useRef(!1);
  i = i || p.renderer, !c.current && i && (c.current = i(e, {
    visualState: n,
    parent: f,
    props: o,
    presenceContext: m,
    blockInitialAnimation: m ? m.initial === !1 : !1,
    reducedMotionConfig: v,
    skipAnimations: l,
    isSVG: d
  }), S.current && c.current && (c.current.manuallyAnimateOnMount = !0));
  const x = c.current, k = C.useContext(Zv);
  x && !x.projection && a && (x.type === "html" || x.type === "svg") && rA(c.current, o, a, k);
  const A = C.useRef(!1);
  C.useInsertionEffect(() => {
    x && A.current && x.update(o, m);
  });
  const _ = o[av], b = C.useRef(!!_ && typeof window < "u" && !((E = window.MotionHandoffIsComplete) != null && E.call(window, _)) && ((D = window.MotionHasOptimisedAnimation) == null ? void 0 : D.call(window, _)));
  return dd(() => {
    S.current = !0, x && (A.current = !0, window.MotionIsMounted = !0, x.updateFeatures(), x.scheduleRenderMicrotask(), b.current && x.animationState && x.animationState.animateChanges());
  }), C.useEffect(() => {
    x && (!b.current && x.animationState && x.animationState.animateChanges(), b.current && (queueMicrotask(() => {
      var O;
      (O = window.MotionHandoffMarkAsComplete) == null || O.call(window, _);
    }), b.current = !1), x.enteringChildren = void 0);
  }), x;
}
function rA(e, n, o, i) {
  const { layoutId: a, layout: d, drag: f, dragConstraints: p, layoutScroll: m, layoutRoot: y, layoutAnchor: v, layoutCrossfade: l } = n;
  e.projection = new o(e.latestValues, n["data-framer-portal-id"] ? void 0 : Jv(e.parent)), e.projection.setOptions({
    layoutId: a,
    layout: d,
    alwaysMeasureLayout: !!f || p && qr(p),
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
    layoutAnchor: v
  });
}
function Jv(e) {
  if (e)
    return e.options.allowProjection !== !1 ? e.projection : Jv(e.parent);
}
function tc(e, { forwardMotionProps: n = !1, type: o } = {}, i, a) {
  i && Lk(i);
  const d = o ? o === "svg" : Od(e), f = d ? qk : Jk;
  function p(y, v) {
    let l;
    const c = {
      ...C.useContext(Id),
      ...y,
      layoutId: oA(y)
    }, { isStatic: S } = c, x = $k(y), k = f(y, S);
    if (!S && typeof window < "u") {
      iA();
      const A = sA(c);
      l = A.MeasureLayout, x.visualElement = nA(e, k, c, a, A.ProjectionNode, d);
    }
    return w.jsxs(Oa.Provider, { value: x, children: [l && x.visualElement ? w.jsx(l, { visualElement: x.visualElement, ...c }) : null, Qk(e, y, tA(k, x.visualElement, v), k, S, n, d)] });
  }
  p.displayName = `motion.${typeof e == "string" ? e : `create(${e.displayName ?? e.name ?? ""})`}`;
  const m = C.forwardRef(p);
  return m[eA] = e, m;
}
function oA({ layoutId: e }) {
  const n = C.useContext(ud).id;
  return n && e !== void 0 ? n + "-" + e : e;
}
function iA(e, n) {
  C.useContext(Wv).strict;
}
function sA(e) {
  const n = Gv(), { drag: o, layout: i } = n;
  if (!o && !i)
    return {};
  const a = { ...o, ...i };
  return {
    MeasureLayout: o != null && o.isEnabled(e) || i != null && i.isEnabled(e) ? a.MeasureLayout : void 0,
    ProjectionNode: a.ProjectionNode
  };
}
function aA(e, n) {
  if (typeof Proxy > "u")
    return tc;
  const o = /* @__PURE__ */ new Map(), i = (d, f) => tc(d, f, e, n), a = (d, f) => i(d, f);
  return new Proxy(a, {
    /**
     * Called when `motion` is referenced with a prop: `motion.div`, `motion.input` etc.
     * The prop name is passed through as `key` and we can use that to generate a `motion`
     * DOM component with that name.
     */
    get: (d, f) => f === "create" ? i : (o.has(f) || o.set(f, tc(f, void 0, e, n)), o.get(f))
  });
}
const lA = (e, n) => n.isSVG ?? Od(e) ? new LT(n) : new NT(n, {
  allowProjection: e !== C.Fragment
});
class uA extends Qn {
  /**
   * We dynamically generate the AnimationState manager as it contains a reference
   * to the underlying animation library. We only want to load that if we load this,
   * so people can optionally code split it out using the `m` component.
   */
  constructor(n) {
    super(n), n.animationState || (n.animationState = $T(n));
  }
  updateAnimationControlsSubscription() {
    const { animate: n } = this.node.getProps();
    ja(n) && (this.unmountControls = n.subscribe(this.node));
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
let cA = 0;
class dA extends Qn {
  constructor() {
    super(...arguments), this.id = cA++, this.isExitComplete = !1;
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
            const { transition: y, transitionEnd: v, ...l } = m;
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
const fA = {
  animation: {
    Feature: uA
  },
  exit: {
    Feature: dA
  }
};
function ki(e) {
  return {
    point: {
      x: e.pageX,
      y: e.pageY
    }
  };
}
const pA = (e) => (n) => Ed(n) && e(n, ki(n));
function ui(e, n, o, i) {
  return yi(e, n, pA(o), i);
}
const qv = ({ current: e }) => e ? e.ownerDocument.defaultView : null, ky = (e, n) => Math.abs(e - n);
function mA(e, n) {
  const o = ky(e.x, n.x), i = ky(e.y, n.y);
  return Math.sqrt(o ** 2 + i ** 2);
}
const Ay = /* @__PURE__ */ new Set(["auto", "scroll"]);
class e0 {
  constructor(n, o, { transformPagePoint: i, contextWindow: a = window, dragSnapToOrigin: d = !1, distanceThreshold: f = 3, element: p } = {}) {
    if (this.startEvent = null, this.lastMoveEvent = null, this.lastMoveEventInfo = null, this.lastRawMoveEventInfo = null, this.handlers = {}, this.contextWindow = window, this.scrollPositions = /* @__PURE__ */ new Map(), this.removeScrollListeners = null, this.onElementScroll = (x) => {
      this.handleScroll(x.target);
    }, this.onWindowScroll = () => {
      this.handleScroll(window);
    }, this.updatePoint = () => {
      if (!(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      this.lastRawMoveEventInfo && (this.lastMoveEventInfo = zs(this.lastRawMoveEventInfo, this.transformPagePoint));
      const x = nc(this.lastMoveEventInfo, this.history), k = this.startEvent !== null, A = mA(x.offset, { x: 0, y: 0 }) >= this.distanceThreshold;
      if (!k && !A)
        return;
      const { point: _ } = x, { timestamp: b } = Ze;
      this.history.push({ ..._, timestamp: b });
      const { onStart: E, onMove: D } = this.handlers;
      k || (E && E(this.lastMoveEvent, x), this.startEvent = this.lastMoveEvent), D && D(this.lastMoveEvent, x);
    }, this.handlePointerMove = (x, k) => {
      this.lastMoveEvent = x, this.lastRawMoveEventInfo = k, this.lastMoveEventInfo = zs(k, this.transformPagePoint), Ce.update(this.updatePoint, !0);
    }, this.handlePointerUp = (x, k) => {
      this.end();
      const { onEnd: A, onSessionEnd: _, resumeAnimation: b } = this.handlers;
      if ((this.dragSnapToOrigin || !this.startEvent) && b && b(), !(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      const E = nc(x.type === "pointercancel" ? this.lastMoveEventInfo : zs(k, this.transformPagePoint), this.history);
      this.startEvent && A && A(x, E), _ && _(x, E);
    }, !Ed(n))
      return;
    this.dragSnapToOrigin = d, this.handlers = o, this.transformPagePoint = i, this.distanceThreshold = f, this.contextWindow = a || window;
    const m = ki(n), y = zs(m, this.transformPagePoint), { point: v } = y, { timestamp: l } = Ze;
    this.history = [{ ...v, timestamp: l }];
    const { onSessionStart: c } = o;
    c && c(n, nc(y, this.history));
    const S = { passive: !0, capture: !0 };
    this.removeListeners = xi(ui(this.contextWindow, "pointermove", this.handlePointerMove, S), ui(this.contextWindow, "pointerup", this.handlePointerUp, S), ui(this.contextWindow, "pointercancel", this.handlePointerUp, S)), p && this.startScrollTracking(p);
  }
  /**
   * Start tracking scroll on ancestors and window.
   */
  startScrollTracking(n) {
    let o = n.parentElement;
    for (; o; ) {
      const i = getComputedStyle(o);
      (Ay.has(i.overflowX) || Ay.has(i.overflowY)) && this.scrollPositions.set(o, {
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
    d.x === 0 && d.y === 0 || (i ? this.lastMoveEventInfo && (this.lastMoveEventInfo.point.x += d.x, this.lastMoveEventInfo.point.y += d.y) : this.history.length > 0 && (this.history[0].x -= d.x, this.history[0].y -= d.y), this.scrollPositions.set(n, a), Ce.update(this.updatePoint, !0));
  }
  updateHandlers(n) {
    this.handlers = n;
  }
  end() {
    this.removeListeners && this.removeListeners(), this.removeScrollListeners && this.removeScrollListeners(), this.scrollPositions.clear(), Kn(this.updatePoint);
  }
}
function zs(e, n) {
  return n ? { point: n(e.point) } : e;
}
function Cy(e, n) {
  return { x: e.x - n.x, y: e.y - n.y };
}
function nc({ point: e }, n) {
  return {
    point: e,
    delta: Cy(e, t0(n)),
    offset: Cy(e, hA(n)),
    velocity: yA(n, 0.1)
  };
}
function hA(e) {
  return e[0];
}
function t0(e) {
  return e[e.length - 1];
}
function yA(e, n) {
  if (e.length < 2)
    return { x: 0, y: 0 };
  let o = e.length - 1, i = null;
  const a = t0(e);
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
function gA(e, { min: n, max: o }, i) {
  return n !== void 0 && e < n ? e = i ? Ae(n, e, i.min) : Math.max(e, n) : o !== void 0 && e > o && (e = i ? Ae(o, e, i.max) : Math.min(e, o)), e;
}
function by(e, n, o) {
  return {
    min: n !== void 0 ? e.min + n : void 0,
    max: o !== void 0 ? e.max + o - (e.max - e.min) : void 0
  };
}
function vA(e, { top: n, left: o, bottom: i, right: a }) {
  return {
    x: by(e.x, o, a),
    y: by(e.y, n, i)
  };
}
function Py(e, n) {
  let o = n.min - e.min, i = n.max - e.max;
  return n.max - n.min < e.max - e.min && ([o, i] = [i, o]), { min: o, max: i };
}
function SA(e, n) {
  return {
    x: Py(e.x, n.x),
    y: Py(e.y, n.y)
  };
}
function wA(e, n) {
  let o = 0.5;
  const i = lt(e), a = lt(n);
  return a > i ? o = /* @__PURE__ */ pi(n.min, n.max - i, e.min) : i > a && (o = /* @__PURE__ */ pi(e.min, e.max - a, n.min)), on(0, 1, o);
}
function xA(e, n) {
  const o = {};
  return n.min !== void 0 && (o.min = n.min - e.min), n.max !== void 0 && (o.max = n.max - e.min), o;
}
const Bc = 0.35;
function _A(e = Bc) {
  return e === !1 ? e = 0 : e === !0 && (e = Bc), {
    x: Ey(e, "left", "right"),
    y: Ey(e, "top", "bottom")
  };
}
function Ey(e, n, o) {
  return {
    min: My(e, n),
    max: My(e, o)
  };
}
function My(e, n) {
  return typeof e == "number" ? e : e[n] || 0;
}
const TA = /* @__PURE__ */ new WeakMap();
class kA {
  constructor(n) {
    this.openDragLock = null, this.isDragging = !1, this.currentDirection = null, this.originPoint = { x: 0, y: 0 }, this.constraints = !1, this.hasMutatedConstraints = !1, this.elastic = He(), this.latestPointerEvent = null, this.latestPanInfo = null, this.visualElement = n;
  }
  start(n, { snapToCursor: o = !1, distanceThreshold: i } = {}) {
    const { presenceContext: a } = this.visualElement;
    if (a && a.isPresent === !1)
      return;
    const d = (l) => {
      o && this.snapToCursor(ki(l).point), this.stopAnimation();
    }, f = (l, c) => {
      const { drag: S, dragPropagation: x, onDragStart: k } = this.getProps();
      if (S && !x && (this.openDragLock && this.openDragLock(), this.openDragLock = Z_(S), !this.openDragLock))
        return;
      this.latestPointerEvent = l, this.latestPanInfo = c, this.isDragging = !0, this.currentDirection = null, this.resolveConstraints(), this.visualElement.projection && (this.visualElement.projection.isAnimationBlocked = !0, this.visualElement.projection.target = void 0), qt((_) => {
        let b = this.getAxisMotionValue(_).get() || 0;
        if (rn.test(b)) {
          const { projection: E } = this.visualElement;
          if (E && E.layout) {
            const D = E.layout.layoutBox[_];
            D && (b = lt(D) * (parseFloat(b) / 100));
          }
        }
        this.originPoint[_] = b;
      }), k && Ce.update(() => k(l, c), !1, !0), Rc(this.visualElement, "transform");
      const { animationState: A } = this.visualElement;
      A && A.setActive("whileDrag", !0);
    }, p = (l, c) => {
      this.latestPointerEvent = l, this.latestPanInfo = c;
      const { dragPropagation: S, dragDirectionLock: x, onDirectionLock: k, onDrag: A } = this.getProps();
      if (!S && !this.openDragLock)
        return;
      const { offset: _ } = c;
      if (x && this.currentDirection === null) {
        this.currentDirection = CA(_), this.currentDirection !== null && k && k(this.currentDirection);
        return;
      }
      this.updateAxis("x", c.point, _), this.updateAxis("y", c.point, _), this.visualElement.render(), A && Ce.update(() => A(l, c), !1, !0);
    }, m = (l, c) => {
      this.latestPointerEvent = l, this.latestPanInfo = c, this.stop(l, c), this.latestPointerEvent = null, this.latestPanInfo = null;
    }, y = () => {
      const { dragSnapToOrigin: l } = this.getProps();
      (l || this.constraints) && this.startAnimation({ x: 0, y: 0 });
    }, { dragSnapToOrigin: v } = this.getProps();
    this.panSession = new e0(n, {
      onSessionStart: d,
      onStart: f,
      onMove: p,
      onSessionEnd: m,
      resumeAnimation: y
    }, {
      transformPagePoint: this.visualElement.getTransformPagePoint(),
      dragSnapToOrigin: v,
      distanceThreshold: i,
      contextWindow: qv(this.visualElement),
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
    p && Ce.postRender(() => p(i, a));
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
    if (!i || !Bs(n, a, this.currentDirection))
      return;
    const d = this.getAxisMotionValue(n);
    let f = this.originPoint[n] + i[n];
    this.constraints && this.constraints[n] && (f = gA(f, this.constraints[n], this.elastic[n])), d.set(f);
  }
  resolveConstraints() {
    var d;
    const { dragConstraints: n, dragElastic: o } = this.getProps(), i = this.visualElement.projection && !this.visualElement.projection.layout ? this.visualElement.projection.measure(!1) : (d = this.visualElement.projection) == null ? void 0 : d.layout, a = this.constraints;
    n && qr(n) ? this.constraints || (this.constraints = this.resolveRefConstraints()) : n && i ? this.constraints = vA(i.layoutBox, n) : this.constraints = !1, this.elastic = _A(o), a !== this.constraints && !qr(n) && i && this.constraints && !this.hasMutatedConstraints && qt((f) => {
      this.constraints !== !1 && this.getAxisMotionValue(f) && (this.constraints[f] = xA(i.layoutBox[f], this.constraints[f]));
    });
  }
  resolveRefConstraints() {
    const { dragConstraints: n, onMeasureDragConstraints: o } = this.getProps();
    if (!n || !qr(n))
      return !1;
    const i = n.current;
    _r(i !== null, "If `dragConstraints` is set as a React ref, that ref must be passed to another component's `ref` prop.", "drag-constraints-ref");
    const { projection: a } = this.visualElement;
    if (!a || !a.layout)
      return !1;
    a.root && (a.root.scroll = void 0, a.root.updateScroll());
    const d = CT(i, a.root, this.visualElement.getTransformPagePoint());
    let f = SA(a.layout.layoutBox, d);
    if (o) {
      const p = o(TT(f));
      this.hasMutatedConstraints = !!p, p && (f = Tv(p));
    }
    return f;
  }
  startAnimation(n) {
    const { drag: o, dragMomentum: i, dragElastic: a, dragTransition: d, dragSnapToOrigin: f, onDragTransitionEnd: p } = this.getProps(), m = this.constraints || {}, y = qt((v) => {
      if (!Bs(v, o, this.currentDirection))
        return;
      let l = m && m[v] || {};
      (f === !0 || f === v) && (l = { min: 0, max: 0 });
      const c = a ? 200 : 1e6, S = a ? 40 : 1e7, x = {
        type: "inertia",
        velocity: i ? n[v] : 0,
        bounceStiffness: c,
        bounceDamping: S,
        timeConstant: 750,
        restDelta: 1,
        restSpeed: 10,
        ...d,
        ...l
      };
      return this.startAxisValueAnimation(v, x);
    });
    return Promise.all(y).then(p);
  }
  startAxisValueAnimation(n, o) {
    const i = this.getAxisMotionValue(n);
    return Rc(this.visualElement, n), i.start(kd(n, i, 0, o, this.visualElement, !1));
  }
  stopAnimation() {
    qt((n) => this.getAxisMotionValue(n).stop());
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
    qt((o) => {
      const { drag: i } = this.getProps();
      if (!Bs(o, i, this.currentDirection))
        return;
      const { projection: a } = this.visualElement, d = this.getAxisMotionValue(o);
      if (a && a.layout) {
        const { min: f, max: p } = a.layout.layoutBox[o], m = d.get() || 0;
        d.set(n[o] - Ae(f, p, 0.5) + m);
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
    if (!qr(o) || !i || !this.constraints)
      return;
    this.stopAnimation();
    const a = { x: 0, y: 0 };
    qt((f) => {
      const p = this.getAxisMotionValue(f);
      if (p && this.constraints !== !1) {
        const m = p.get();
        a[f] = wA({ min: m, max: m }, this.constraints[f]);
      }
    });
    const { transformTemplate: d } = this.visualElement.getProps();
    this.visualElement.current.style.transform = d ? d({}, "") : "none", i.root && i.root.updateScroll(), i.updateLayout(), this.constraints = !1, this.resolveConstraints(), qt((f) => {
      if (!Bs(f, n, null))
        return;
      const p = this.getAxisMotionValue(f), { min: m, max: y } = this.constraints[f];
      p.set(Ae(m, y, a[f]));
    }), this.visualElement.render();
  }
  addListeners() {
    if (!this.visualElement.current)
      return;
    TA.set(this.visualElement, this);
    const n = this.visualElement.current, o = ui(n, "pointerdown", (y) => {
      const { drag: v, dragListener: l = !0 } = this.getProps(), c = y.target, S = c !== n && rT(c);
      v && l && !S && this.start(y);
    });
    let i;
    const a = () => {
      const { dragConstraints: y } = this.getProps();
      qr(y) && y.current && (this.constraints = this.resolveRefConstraints(), i || (i = AA(n, y.current, () => this.scalePositionWithinConstraints())));
    }, { projection: d } = this.visualElement, f = d.addEventListener("measure", a);
    d && !d.layout && (d.root && d.root.updateScroll(), d.updateLayout()), Ce.read(a);
    const p = yi(window, "resize", () => this.scalePositionWithinConstraints()), m = d.addEventListener("didUpdate", (({ delta: y, hasLayoutChanged: v }) => {
      this.isDragging && v && (qt((l) => {
        const c = this.getAxisMotionValue(l);
        c && (this.originPoint[l] += y[l].translate, c.set(c.get() + y[l].translate));
      }), this.visualElement.render());
    }));
    return () => {
      p(), o(), f(), m && m(), i && i();
    };
  }
  getProps() {
    const n = this.visualElement.getProps(), { drag: o = !1, dragDirectionLock: i = !1, dragPropagation: a = !1, dragConstraints: d = !1, dragElastic: f = Bc, dragMomentum: p = !0 } = n;
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
function Ry(e) {
  let n = !0;
  return () => {
    if (n) {
      n = !1;
      return;
    }
    e();
  };
}
function AA(e, n, o) {
  const i = Lh(e, Ry(o)), a = Lh(n, Ry(o));
  return () => {
    i(), a();
  };
}
function Bs(e, n, o) {
  return (n === !0 || n === e) && (o === null || o === e);
}
function CA(e, n = 10) {
  let o = null;
  return Math.abs(e.y) > n ? o = "y" : Math.abs(e.x) > n && (o = "x"), o;
}
class bA extends Qn {
  constructor(n) {
    super(n), this.removeGroupControls = jt, this.removeListeners = jt, this.controls = new kA(n);
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
const rc = (e) => (n, o) => {
  e && Ce.update(() => e(n, o), !1, !0);
};
class PA extends Qn {
  constructor() {
    super(...arguments), this.removePointerDownListener = jt;
  }
  onPointerDown(n) {
    this.session = new e0(n, this.createPanHandlers(), {
      transformPagePoint: this.node.getTransformPagePoint(),
      contextWindow: qv(this.node)
    });
  }
  createPanHandlers() {
    const { onPanSessionStart: n, onPanStart: o, onPan: i, onPanEnd: a } = this.node.getProps();
    return {
      onSessionStart: rc(n),
      onStart: rc(o),
      onMove: rc(i),
      onEnd: (d, f) => {
        delete this.session, a && Ce.postRender(() => a(d, f));
      }
    };
  }
  mount() {
    this.removePointerDownListener = ui(this.node.current, "pointerdown", (n) => this.onPointerDown(n));
  }
  update() {
    this.session && this.session.updateHandlers(this.createPanHandlers());
  }
  unmount() {
    this.removePointerDownListener(), this.session && this.session.end();
  }
}
let oc = !1;
class EA extends C.Component {
  /**
   * This only mounts projection nodes for components that
   * need measuring, we might want to do it for all components
   * in order to incorporate transforms
   */
  componentDidMount() {
    const { visualElement: n, layoutGroup: o, switchLayoutGroup: i, layoutId: a } = this.props, { projection: d } = n;
    d && (o.group && o.group.add(d), i && i.register && a && i.register(d), oc && d.root.didUpdate(), d.addEventListener("animationComplete", () => {
      this.safeToRemove();
    }), d.setOptions({
      ...d.options,
      layoutDependency: this.props.layoutDependency,
      onExitComplete: () => this.safeToRemove()
    })), ia.hasEverUpdated = !0;
  }
  getSnapshotBeforeUpdate(n) {
    const { layoutDependency: o, visualElement: i, drag: a, isPresent: d } = this.props, { projection: f } = i;
    return f && (f.isPresent = d, n.layoutDependency !== o && f.setOptions({
      ...f.options,
      layoutDependency: o
    }), oc = !0, a || n.layoutDependency !== o || o === void 0 || n.isPresent !== d ? f.willUpdate() : this.safeToRemove(), n.isPresent !== d && (d ? f.promote() : f.relegate() || Ce.postRender(() => {
      const p = f.getStack();
      (!p || !p.members.length) && this.safeToRemove();
    }))), null;
  }
  componentDidUpdate() {
    const { visualElement: n, layoutAnchor: o } = this.props, { projection: i } = n;
    i && (i.options.layoutAnchor = o, i.root.didUpdate(), Pd.postRender(() => {
      !i.currentAnimation && i.isLead() && this.safeToRemove();
    }));
  }
  componentWillUnmount() {
    const { visualElement: n, layoutGroup: o, switchLayoutGroup: i } = this.props, { projection: a } = n;
    oc = !0, a && (a.scheduleCheckAfterUnmount(), o && o.group && o.group.remove(a), i && i.deregister && i.deregister(a));
  }
  safeToRemove() {
    const { safeToRemove: n } = this.props;
    n && n();
  }
  render() {
    return null;
  }
}
function n0(e) {
  const [n, o] = Hv(), i = C.useContext(ud);
  return w.jsx(EA, { ...e, layoutGroup: i, switchLayoutGroup: C.useContext(Zv), isPresent: n, safeToRemove: o });
}
const MA = {
  pan: {
    Feature: PA
  },
  drag: {
    Feature: bA,
    ProjectionNode: $v,
    MeasureLayout: n0
  }
};
function Ny(e, n, o) {
  const { props: i } = e;
  e.animationState && i.whileHover && e.animationState.setActive("whileHover", o === "Start");
  const a = "onHover" + o, d = i[a];
  d && Ce.postRender(() => d(n, ki(n)));
}
class RA extends Qn {
  mount() {
    const { current: n } = this.node;
    n && (this.unmount = q_(n, (o, i) => (Ny(this.node, i, "Start"), (a) => Ny(this.node, a, "End"))));
  }
  unmount() {
  }
}
class NA extends Qn {
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
    this.unmount = xi(yi(this.node.current, "focus", () => this.onFocus()), yi(this.node.current, "blur", () => this.onBlur()));
  }
  unmount() {
  }
}
function Dy(e, n, o) {
  const { props: i } = e;
  if (e.current instanceof HTMLButtonElement && e.current.disabled)
    return;
  e.animationState && i.whileTap && e.animationState.setActive("whileTap", o === "Start");
  const a = "onTap" + (o === "End" ? "" : o), d = i[a];
  d && Ce.postRender(() => d(n, ki(n)));
}
class DA extends Qn {
  mount() {
    const { current: n } = this.node;
    if (!n)
      return;
    const { globalTapTarget: o, propagate: i } = this.node.props;
    this.unmount = iT(n, (a, d) => (Dy(this.node, d, "Start"), (f, { success: p }) => Dy(this.node, f, p ? "End" : "Cancel")), {
      useGlobalTarget: o,
      stopPropagation: (i == null ? void 0 : i.tap) === !1
    });
  }
  unmount() {
  }
}
const Uc = /* @__PURE__ */ new WeakMap(), ic = /* @__PURE__ */ new WeakMap(), jA = (e) => {
  const n = Uc.get(e.target);
  n && n(e);
}, IA = (e) => {
  e.forEach(jA);
};
function FA({ root: e, ...n }) {
  const o = e || document;
  ic.has(o) || ic.set(o, {});
  const i = ic.get(o), a = JSON.stringify(n);
  return i[a] || (i[a] = new IntersectionObserver(IA, { root: e, ...n })), i[a];
}
function OA(e, n, o) {
  const i = FA(n);
  return Uc.set(e, o), i.observe(e), () => {
    Uc.delete(e), i.unobserve(e);
  };
}
const LA = {
  some: 0,
  all: 1
};
class VA extends Qn {
  constructor() {
    super(...arguments), this.hasEnteredView = !1, this.isInView = !1;
  }
  startObserver() {
    var m;
    (m = this.stopObserver) == null || m.call(this);
    const { viewport: n = {} } = this.node.getProps(), { root: o, margin: i, amount: a = "some", once: d } = n, f = {
      root: o ? o.current : void 0,
      rootMargin: i,
      threshold: typeof a == "number" ? a : LA[a]
    }, p = (y) => {
      const { isIntersecting: v } = y;
      if (this.isInView === v || (this.isInView = v, d && !v && this.hasEnteredView))
        return;
      v && (this.hasEnteredView = !0), this.node.animationState && this.node.animationState.setActive("whileInView", v);
      const { onViewportEnter: l, onViewportLeave: c } = this.node.getProps(), S = v ? l : c;
      S && S(y);
    };
    this.stopObserver = OA(this.node.current, f, p);
  }
  mount() {
    this.startObserver();
  }
  update() {
    if (typeof IntersectionObserver > "u")
      return;
    const { props: n, prevProps: o } = this.node;
    ["amount", "margin", "root"].some(zA(n, o)) && this.startObserver();
  }
  unmount() {
    var n;
    (n = this.stopObserver) == null || n.call(this), this.hasEnteredView = !1, this.isInView = !1;
  }
}
function zA({ viewport: e = {} }, { viewport: n = {} } = {}) {
  return (o) => e[o] !== n[o];
}
const BA = {
  inView: {
    Feature: VA
  },
  tap: {
    Feature: DA
  },
  focus: {
    Feature: NA
  },
  hover: {
    Feature: RA
  }
}, UA = {
  layout: {
    ProjectionNode: $v,
    MeasureLayout: n0
  }
}, $A = {
  ...fA,
  ...BA,
  ...MA,
  ...UA
}, HA = /* @__PURE__ */ aA($A, lA), gn = HA;
function WA(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function r0(e) {
  const n = String(e || "").toLowerCase();
  return n === "127.0.0.1" || n === "localhost" || n === "::1" || n === "[::1]";
}
function jy(e) {
  return r0(e) || WA(e);
}
function GA(e) {
  return !e || r0(e) ? "127.0.0.1" : e;
}
const KA = (() => {
  var v, l, c, S;
  const e = globalThis.window || globalThis, n = globalThis.document || {}, o = e.location || {}, i = String(e.SYNAPSE_DATA_API_PORT || ((l = (v = n.body) == null ? void 0 : v.dataset) == null ? void 0 : l.dataApiPort) || "3001").trim(), { protocol: a = "file:", hostname: d = "127.0.0.1", port: f = "" } = o, p = `http://${GA(d)}:${i || "3001"}`, m = String(e.SYNAPSE_DATA_API_BASE || ((S = (c = n.body) == null ? void 0 : c.dataset) == null ? void 0 : S.dataApiBase) || "").replace(/\/+$/, ""), y = `${a}//${o.host || (f ? `${d}:${f}` : d)}`.replace(/\/+$/, "");
  return m && !(jy(d) && f !== i && m === y) ? m : a === "file:" || jy(d) && f !== i ? p : `${a}//${o.host || d}`;
})(), YA = new gg(KA), sc = Number((globalThis.window || globalThis).SYNAPSE_DATA_API_TIMEOUT_MS || 6e3), QA = Number.isFinite(sc) && sc > 0 ? sc : 6e3;
function XA(e, n) {
  typeof window > "u" || console.warn(e, n);
}
async function ZA(e) {
  var i, a;
  const o = (((a = (i = e.headers) == null ? void 0 : i.get) == null ? void 0 : a.call(i, "content-type")) || "").includes("application/json") ? await e.json() : {};
  if (!e.ok || (o == null ? void 0 : o.ok) === !1)
    throw new Error((o == null ? void 0 : o.error) || `Synapse data API returned HTTP ${e.status}`);
  return o;
}
async function JA(e, n = {}) {
  const o = await YA.fetch(e, {
    timeoutMs: QA,
    ...n
  });
  return ZA(o);
}
async function qA(e) {
  try {
    return (await JA("/api/focus-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(e || {})
    })).item || null;
  } catch (n) {
    return XA("Synapse data API focus-session save skipped:", n), null;
  }
}
class eC {
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
const o0 = new eC();
function Ld(e, n) {
  return o0.readJSON(e, n);
}
function Vd(e, n) {
  return o0.writeJSON(e, n);
}
const i0 = "synapse.focusRoom.sessions.v1", s0 = "synapse.focusRoom.draft.v1", a0 = "synapse.focusRoom.active-session.v1", $c = 40, Iy = Object.freeze([
  "idle",
  "running",
  "paused",
  "completed",
  "break",
  "restoring"
]), tC = Object.freeze({
  studying: "running",
  running: "running",
  idle: "idle",
  paused: "paused",
  completed: "completed",
  break: "break",
  restoring: "restoring"
});
let Hc = [];
const dr = (e) => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURI(e)}`, Hn = [
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
], ci = Object.freeze([
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
function nC(e = "") {
  const n = String(e || "");
  return ci.find((o) => o.id === n) || ci[ci.length - 1];
}
function rC(e = {}) {
  return ci.find((n) => n.musicType === String((e == null ? void 0 : e.musicType) || "") && n.ambientSound === String((e == null ? void 0 : e.ambientSound) || "")) || null;
}
const Ye = {
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
}, Wn = [
  {
    label: "Nature",
    layers: [Ye.nature],
    pageUrl: Ye.nature.pageUrl,
    license: Ye.nature.license
  },
  {
    label: "Cafe Rain",
    layers: [Ye.cafe, Ye.rain],
    pageUrl: Ye.cafe.pageUrl,
    license: "CC0 / Public domain"
  },
  {
    label: "Rain",
    layers: [Ye.rain],
    pageUrl: Ye.rain.pageUrl,
    license: Ye.rain.license
  },
  {
    label: "White Noise",
    layers: [Ye.whiteNoise],
    pageUrl: Ye.whiteNoise.pageUrl,
    license: Ye.whiteNoise.license
  },
  {
    label: "Ocean",
    layers: [Ye.ocean],
    pageUrl: Ye.ocean.pageUrl,
    license: Ye.ocean.license
  },
  {
    label: "Wind",
    layers: [Ye.wind],
    pageUrl: Ye.wind.pageUrl,
    license: Ye.wind.license
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
], oC = Yn, l0 = [25, 45, 50, 90];
function iC(e = "") {
  const n = String(e || "");
  return Hn.find((o) => o.label === n) || Hn[0];
}
function sC(e = "") {
  const n = String(e || "");
  return Wn.find((o) => o.label === n) || Wn[0];
}
function La(e = {}) {
  const n = iC(e == null ? void 0 : e.musicType), o = sC(e == null ? void 0 : e.ambientSound);
  return {
    musicTrack: n,
    ambientSound: o,
    ambientLayers: o.layers.map((i) => ({
      ...i,
      volumeBias: Bn(i.volumeBias, 1)
    }))
  };
}
function aC(e) {
  return e && typeof e == "object" && !Array.isArray(e) ? e : {};
}
function u0(e) {
  return String(e || "").trim();
}
function lC({ material: e, goal: n, durationMinutes: o }) {
  var v;
  const i = Math.max(10, Number(o) || 25), a = (v = e == null ? void 0 : e.studyHeadings) != null && v.length ? e.studyHeadings : ["Key ideas", "Examples", "Practice", "Review"], d = String(n || "").trim() || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`, f = Math.max(1, Math.floor(i * 0.2)), p = Math.max(1, Math.floor(i * 0.4)), m = Math.max(1, Math.floor(i * 0.2)), y = Math.max(1, i - f - p - m);
  return [
    { minutes: f, task: `Set the goal: ${d}` },
    { minutes: p, task: `Review ${a[0] || "the core ideas"}` },
    { minutes: m, task: `Practice with ${a[1] || a[0] || "the generated examples"}` },
    { minutes: y, task: "Summarize mistakes and choose the next study step" }
  ];
}
function c0() {
  return Ld(s0, null);
}
function uC(e) {
  return Vd(s0, e || null);
}
function d0(e) {
  if (!e || typeof e != "object")
    return { materials: {} };
  const n = aC(e.materials);
  return {
    ...e,
    materials: { ...n }
  };
}
function ao(e, n = "idle") {
  const o = tC[String(e || "").trim().toLowerCase()];
  return o && Iy.includes(o) ? o : Iy.includes(n) ? n : "idle";
}
function zd(e) {
  return ao(e) === "running" ? "studying" : ao(e);
}
function f0(e = {}, n = {}) {
  const o = e && typeof e == "object" ? e : {}, i = n && typeof n == "object" ? n : {}, a = Object.prototype.hasOwnProperty.call(o, "timerStatus"), d = Object.prototype.hasOwnProperty.call(o, "timerState") || Object.prototype.hasOwnProperty.call(o, "timerPhase"), f = ao(
    d ? o.timerState || o.timerPhase : a ? o.timerStatus : o.status || i.timerState,
    ao(i.timerState || i.timerPhase || i.timerStatus)
  ), p = o.timerMode === "countup" || i.timerMode === "countup" && !Object.prototype.hasOwnProperty.call(o, "timerMode") ? "countup" : "countdown", y = Object.fromEntries(["timerAnchorAtMs", "timerPausedAtMs", "timerUpdatedAtMs", "timerRestoredAtMs"].map((l) => {
    const c = Object.prototype.hasOwnProperty.call(o, l) ? o[l] : i[l], S = Number(c);
    return [l, Number.isFinite(S) && S > 0 ? S : null];
  })), v = Math.max(0, Bn(
    Object.prototype.hasOwnProperty.call(o, "elapsedSeconds") ? o.elapsedSeconds : i.elapsedSeconds,
    0
  ));
  return {
    ...i,
    ...o,
    timerState: f,
    timerPhase: f,
    status: f,
    timerStatus: zd(f),
    timerMode: p,
    elapsedSeconds: v,
    ...y
  };
}
function p0() {
  return d0(Ld(a0, null));
}
function cC(e) {
  return Vd(a0, d0(e));
}
function m0(e) {
  const n = u0(e);
  if (!n) return null;
  const i = p0().materials[n];
  return i && typeof i == "object" ? f0(i) : null;
}
function Bd(e, n) {
  const o = u0(e);
  if (!o) return !1;
  const i = p0();
  return n && typeof n == "object" ? i.materials[o] = {
    ...f0(n, i.materials[o]),
    materialId: o,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  } : delete i.materials[o], cC(i);
}
function sa(e) {
  return Bd(e, null);
}
function Wc() {
  const e = Ld(i0, []), n = Array.isArray(e) ? e : [], o = /* @__PURE__ */ new Set();
  return [...Hc, ...n].filter((i) => {
    const a = String((i == null ? void 0 : i.sessionId) || "");
    return !a || o.has(a) ? !1 : (o.add(a), !0);
  }).slice(0, $c);
}
function Bn(e, n) {
  const o = Number(e);
  return Number.isFinite(o) ? o : n;
}
function dC(e = {}) {
  const n = (/* @__PURE__ */ new Date()).toISOString(), i = { ...{
    sessionId: e.sessionId || `focus-${Date.now()}`,
    materialId: String(e.materialId || ""),
    materialTitle: e.materialTitle || "Study material",
    studyGoal: e.studyGoal || "",
    selectedScene: e.selectedScene || "morning-window",
    musicType: e.musicType || "Deep Focus",
    ambientSound: e.ambientSound || "Nature",
    musicVolume: Bn(e.musicVolume ?? 60, 60),
    ambientVolume: Bn(e.ambientVolume ?? 50, 50),
    pomodoroDuration: Bn(e.pomodoroDuration || 25, 25),
    startedAt: e.startedAt || n,
    endedAt: e.endedAt || n,
    totalFocusTime: Math.max(0, Bn(e.totalFocusTime || 0, 0)),
    flashcardsCompleted: Math.max(0, Bn(e.flashcardsCompleted || 0, 0)),
    quizScore: e.quizScore === null || e.quizScore === void 0 || e.quizScore === "" ? null : Number.isFinite(Number(e.quizScore)) ? Number(e.quizScore) : null,
    mistakesMade: Array.isArray(e.mistakesMade) ? e.mistakesMade : [],
    completedTasks: Array.isArray(e.completedTasks) ? e.completedTasks : [],
    aiReflection: e.aiReflection || "You protected a focused study block and created momentum for the next session.",
    recommendedNextStep: e.recommendedNextStep || "Review the hardest item, then start another short focus block.",
    sessionDate: e.sessionDate || n
  }, persisted: !0 }, a = Wc().filter((m) => m.sessionId !== i.sessionId), d = [i, ...a.map((m) => ({ ...m, persisted: !0 }))].slice(0, $c), f = Vd(i0, d), p = { ...i, persisted: f };
  return qA(p).catch((m) => {
    console.warn("Synapse data API focus-session background save failed:", m);
  }), f ? Hc = [] : Hc = [p, ...a].slice(0, $c), p;
}
function h0(e) {
  const n = Math.max(0, Bn(e || 0, 0)), o = Math.floor(n / 3600), i = Math.floor(n % 3600 / 60);
  return o ? `${o}h ${i}m` : `${i}m`;
}
const ke = (e, n, o, i) => Object.freeze({ kind: e, duration: n, intensity: o, density: i }), Fy = Object.freeze({
  "morning-window": Object.freeze({
    id: "morning-window",
    layers: Object.freeze([ke("camera", 32, 0.34, 0.42), ke("foliage", 18, 0.24, 0.38), ke("light", 26, 0.2, 0.3)])
  }),
  "cabin-twilight": Object.freeze({
    id: "cabin-twilight",
    layers: Object.freeze([ke("camera", 38, 0.28, 0.32), ke("mist", 34, 0.2, 0.35), ke("light", 22, 0.2, 0.28)])
  }),
  "last-light-lounge": Object.freeze({
    id: "last-light-lounge",
    layers: Object.freeze([ke("camera", 36, 0.24, 0.3), ke("rain", 16, 0.28, 0.42), ke("mist", 32, 0.18, 0.28), ke("light", 24, 0.18, 0.24)])
  }),
  "garden-cafe": Object.freeze({
    id: "garden-cafe",
    layers: Object.freeze([ke("camera", 34, 0.26, 0.32), ke("rain", 14, 0.34, 0.52), ke("foliage", 20, 0.2, 0.38), ke("light", 28, 0.18, 0.26)])
  }),
  "sunset-classroom": Object.freeze({
    id: "sunset-classroom",
    layers: Object.freeze([ke("camera", 40, 0.2, 0.25), ke("light", 20, 0.3, 0.36), ke("foliage", 28, 0.14, 0.22)])
  }),
  "tokyo-night": Object.freeze({
    id: "tokyo-night",
    layers: Object.freeze([ke("camera", 42, 0.2, 0.26), ke("mist", 36, 0.16, 0.24), ke("light", 18, 0.24, 0.44)])
  }),
  "snow-window-cabin": Object.freeze({
    id: "snow-window-cabin",
    layers: Object.freeze([ke("camera", 38, 0.24, 0.28), ke("snow", 18, 0.34, 0.48), ke("light", 26, 0.2, 0.28)])
  }),
  "bamboo-cabin": Object.freeze({
    id: "bamboo-cabin",
    layers: Object.freeze([ke("camera", 36, 0.24, 0.3), ke("foliage", 16, 0.24, 0.46), ke("water", 24, 0.2, 0.36), ke("mist", 32, 0.16, 0.26)])
  })
});
function fC(e = "") {
  return Fy[String(e || "")] || Fy["morning-window"];
}
var mg;
const Gc = ((mg = Yn[0]) == null ? void 0 : mg.id) || "morning-window", ro = l0[0] || 25, pC = 10, Va = 180, Ud = 60, y0 = Va * 60, mC = 0, hC = 100, yC = ["materials", "notes", "sources", "chat", "quiz", "flashcards", "mindmap", "plan", "workspace", "history"], Kc = new Set(yC), _a = {
  type: "spring",
  stiffness: 120,
  damping: 18,
  mass: 0.8
};
function gC(e, n, o, i) {
  const a = Number(e);
  return Number.isFinite(a) ? Math.min(i, Math.max(o, a)) : n;
}
function wr(e, n, o, i) {
  return Math.round(gC(e, n, o, i));
}
function kt(e, n = 50) {
  return wr(e, n, mC, hC);
}
function gr(e, n = ro) {
  return wr(e, n, pC, Va);
}
function nn(e, n = ro * 60) {
  return wr(e, n, Ud, y0);
}
function Ta(e) {
  return Yn.find((n) => n.id === e) || null;
}
function yn(e = Gc) {
  return Ta(e) || Yn[0] || {
    id: Gc,
    name: "Focus Room",
    kicker: "Focus",
    description: "A quiet study space.",
    image: "",
    ambientSound: "Nature",
    musicType: "Deep Focus"
  };
}
function g0(e) {
  return Array.isArray(e) ? e.map((n) => ({
    minutes: wr(n == null ? void 0 : n.minutes, 5, 1, Va),
    task: String((n == null ? void 0 : n.task) || "").trim()
  })).filter((n) => n.task) : [];
}
function ii(e) {
  return Array.isArray(e) ? e.map((n) => ({
    role: String((n == null ? void 0 : n.role) || "assistant") === "user" ? "user" : "assistant",
    text: String((n == null ? void 0 : n.text) || "").trim(),
    createdAt: (n == null ? void 0 : n.createdAt) || (/* @__PURE__ */ new Date()).toISOString()
  })).filter((n) => n.text).slice(-24) : [];
}
function v0(e) {
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
function Yc(e, n, o) {
  return e ? lC({
    material: e,
    goal: n,
    durationMinutes: o
  }) : [];
}
function gi(e) {
  const n = gr(e);
  return n > 0 ? n * 60 : 0;
}
function Qc(e) {
  const n = Math.max(0, Math.floor(Number(e) || 0)), o = Math.floor(n / 3600), i = Math.floor(n % 3600 / 60), a = n % 60, d = (f) => String(f).padStart(2, "0");
  return o ? `${o}:${d(i)}:${d(a)}` : `${d(i)}:${d(a)}`;
}
function Oy(e) {
  const n = (e == null ? void 0 : e.flashcards) || [];
  return Array.isArray(n) ? n.slice(0, 24) : [];
}
function vC(e, n) {
  return String((e == null ? void 0 : e.id) || (e == null ? void 0 : e.front) || (e == null ? void 0 : e.term) || n);
}
function SC(e) {
  var n;
  return Array.isArray(e == null ? void 0 : e.questions) ? e.questions : Array.isArray((n = e == null ? void 0 : e.quiz) == null ? void 0 : n.questions) ? e.quiz.questions : [];
}
function Xc(e) {
  return (Array.isArray(e == null ? void 0 : e.quizzes) ? e.quizzes : []).flatMap((o) => SC(o).map((i) => {
    var a;
    return {
      ...i,
      quizTitle: (o == null ? void 0 : o.title) || ((a = o == null ? void 0 : o.quiz) == null ? void 0 : a.title) || "Saved quiz"
    };
  })).slice(0, 12);
}
function wC(e, n) {
  return (e == null ? void 0 : e.question) || (e == null ? void 0 : e.prompt) || (e == null ? void 0 : e.stem) || `Question ${n + 1}`;
}
function $d(e) {
  return String((e == null ? void 0 : e.type) || "").toLowerCase();
}
function xC(e) {
  return String((e == null ? void 0 : e.label) || (e == null ? void 0 : e.text) || e).trim();
}
function ka(e) {
  const n = (e == null ? void 0 : e.choices) || (e == null ? void 0 : e.options) || (e == null ? void 0 : e.answers);
  return Array.isArray(n) && n.length ? n.map(xC).filter(Boolean) : $d(e) === "true_false" ? ["True", "False"] : [];
}
function Zc(e) {
  const n = (e == null ? void 0 : e.correctOptionIndexes) || (e == null ? void 0 : e.correct_option_indexes) || (e == null ? void 0 : e.correctIndexes);
  return Array.isArray(n) ? n.map((o) => Number(o)).filter(Number.isInteger) : [];
}
function _C(e, n) {
  const o = Array.isArray(e) ? [...e].map(Number).filter(Number.isInteger).sort((a, d) => a - d) : [], i = Array.isArray(n) ? [...n].map(Number).filter(Number.isInteger).sort((a, d) => a - d) : [];
  return o.length === i.length && o.every((a, d) => a === i[d]);
}
function xr(e) {
  return String(e || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function Aa(e, n) {
  if (Number.isInteger(n)) return n;
  const o = Number(n);
  if (typeof n != "string" && Number.isInteger(o)) return o;
  const i = ka(e), a = xr(n);
  return i.findIndex((d) => xr(d) === a);
}
function S0(e, n) {
  if (typeof n == "boolean") return n;
  if (n === 0) return !0;
  if (n === 1) return !1;
  const o = ka(e), i = xr(n);
  return i === "true" ? !0 : i === "false" ? !1 : xr(o[0]) === i ? !0 : xr(o[1]) === i ? !1 : null;
}
function TC(e, n, o) {
  const i = $d(e);
  if (i === "multiple_choice") {
    const a = Aa(e, n);
    if (!Number.isInteger(a) || a < 0) return [];
    const d = Array.isArray(o) ? [...o] : [];
    return d.includes(a) ? d.filter((f) => f !== a) : [...d, a].sort((f, p) => f - p);
  }
  if (i === "single_choice") {
    const a = Aa(e, n);
    return Number.isInteger(a) && a >= 0 ? a : "";
  }
  if (i === "true_false") {
    const a = S0(e, n);
    return a === null ? "" : a;
  }
  return String(n || "");
}
function w0(e) {
  const n = (e == null ? void 0 : e.correctAnswer) ?? (e == null ? void 0 : e.correct_answer) ?? (e == null ? void 0 : e.answer) ?? (e == null ? void 0 : e.correct), o = Zc(e);
  if (o.length) {
    const i = ka(e);
    return o.map((a) => i[a] || "").filter(Boolean).join(", ");
  }
  if (typeof (e == null ? void 0 : e.correctBoolean) == "boolean" || typeof (e == null ? void 0 : e.correct_boolean) == "boolean") {
    const i = ka(e);
    return (typeof e.correctBoolean == "boolean" ? e.correctBoolean : e.correct_boolean) ? i[0] || "True" : i[1] || "False";
  }
  return e != null && e.expectedAnswer || e != null && e.expected_answer ? String(e.expectedAnswer || e.expected_answer || "").trim() : Array.isArray(n) ? n.map((i) => String(i)).join(", ") : String(n || "").trim();
}
function kC(e, n) {
  const o = $d(e);
  if (o === "single_choice") {
    const a = Zc(e)[0], d = Aa(e, n);
    return Number.isInteger(a) ? d === a : null;
  }
  if (o === "multiple_choice") {
    const a = Zc(e), d = Array.isArray(n) ? n : [Aa(e, n)].filter(Number.isInteger);
    return a.length ? _C(d, a) : null;
  }
  if (o === "true_false") {
    const a = typeof (e == null ? void 0 : e.correctBoolean) == "boolean" ? e.correctBoolean : e == null ? void 0 : e.correct_boolean, d = S0(e, n);
    return typeof a == "boolean" && d !== null ? d === a : null;
  }
  const i = w0(e);
  return i ? xr(n) === xr(i) : null;
}
function x0(e, n, o) {
  var p;
  const i = String(e || "").trim(), a = String((n == null ? void 0 : n.summaryText) || (n == null ? void 0 : n.aiSummary) || "").slice(0, 420), d = ((p = n == null ? void 0 : n.studyHeadings) == null ? void 0 : p[0]) || (n == null ? void 0 : n.materialTitle) || "this material", f = o || `Study ${(n == null ? void 0 : n.materialTitle) || "this material"}`;
  return i ? [
    `For ${d}: ${a || "use the selected material as your main source."}`,
    `Your current goal is: ${f}.`,
    "Try explaining the idea in one sentence, then test yourself with one example before moving on."
  ].join(" ") : "";
}
function AC() {
  return /* @__PURE__ */ w.jsx("svg", { className: "liquid-glass-filter-defs", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ w.jsx("defs", { children: /* @__PURE__ */ w.jsxs("filter", { id: "liquid-glass-displacement", x: "-12%", y: "-12%", width: "124%", height: "124%", colorInterpolationFilters: "sRGB", children: [
    /* @__PURE__ */ w.jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.012 0.024", numOctaves: "2", seed: "17", result: "liquid-noise" }),
    /* @__PURE__ */ w.jsx("feDisplacementMap", { in: "SourceGraphic", in2: "liquid-noise", scale: "7", xChannelSelector: "R", yChannelSelector: "B", result: "refracted-surface" }),
    /* @__PURE__ */ w.jsx("feColorMatrix", { in: "refracted-surface", type: "matrix", values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.04 0", result: "edge-alpha" }),
    /* @__PURE__ */ w.jsx("feGaussianBlur", { in: "edge-alpha", stdDeviation: "0.25", result: "soft-edge" }),
    /* @__PURE__ */ w.jsx("feBlend", { in: "soft-edge", in2: "refracted-surface", mode: "screen" })
  ] }) }) });
}
function CC({ profile: e, paused: n = !1, reducedMotion: o = !1 }) {
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
function bC({ scene: e }) {
  const [n, o] = C.useState(e), [i, a] = C.useState(!1), [d, f] = C.useState(!1), [p, m] = C.useState(() => {
    var S;
    return ((S = globalThis.document) == null ? void 0 : S.visibilityState) === "hidden";
  }), [y, v] = C.useState(() => {
    var S, x;
    return ((x = (S = globalThis.matchMedia) == null ? void 0 : S.call(globalThis, "(prefers-reduced-motion: reduce)")) == null ? void 0 : x.matches) || !1;
  });
  C.useEffect(() => {
    a(!1), f(!1);
  }, [n == null ? void 0 : n.id]), C.useEffect(() => {
    if (!(e != null && e.id) || e.id === (n == null ? void 0 : n.id)) return;
    let S = !1;
    const x = new Image();
    return x.onload = () => {
      S || o(e);
    }, x.onerror = () => {
      S || f(!0);
    }, x.src = e.image, () => {
      S = !0, x.onload = null, x.onerror = null;
    };
  }, [n == null ? void 0 : n.id, e]), C.useEffect(() => {
    var x, k;
    const S = () => {
      var A;
      return m(((A = globalThis.document) == null ? void 0 : A.visibilityState) === "hidden");
    };
    return (k = (x = globalThis.document) == null ? void 0 : x.addEventListener) == null || k.call(x, "visibilitychange", S), () => {
      var A, _;
      return (_ = (A = globalThis.document) == null ? void 0 : A.removeEventListener) == null ? void 0 : _.call(A, "visibilitychange", S);
    };
  }, []), C.useEffect(() => {
    var k, A;
    const S = (k = globalThis.matchMedia) == null ? void 0 : k.call(globalThis, "(prefers-reduced-motion: reduce)");
    if (!S) return;
    const x = (_) => v(!!_.matches);
    return v(!!S.matches), (A = S.addEventListener) == null || A.call(S, "change", x), () => {
      var _;
      return (_ = S.removeEventListener) == null ? void 0 : _.call(S, "change", x);
    };
  }, []);
  const l = fC((n == null ? void 0 : n.motionProfile) || (n == null ? void 0 : n.id)), c = l.layers.find((S) => S.kind === "camera");
  return /* @__PURE__ */ w.jsxs("div", { className: "focus-background-wrap", "aria-hidden": "true", children: [
    /* @__PURE__ */ w.jsx(AC, {}),
    /* @__PURE__ */ w.jsx(Fa, { mode: "sync", children: /* @__PURE__ */ w.jsxs(
      gn.div,
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
          /* @__PURE__ */ w.jsx(CC, { profile: l, paused: p, reducedMotion: y })
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
const PC = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), EC = (e) => e.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (n, o, i) => i ? i.toUpperCase() : o.toLowerCase()
), Ly = (e) => {
  const n = EC(e);
  return n.charAt(0).toUpperCase() + n.slice(1);
}, _0 = (...e) => e.filter((n, o, i) => !!n && n.trim() !== "" && i.indexOf(n) === o).join(" ").trim(), MC = (e) => {
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
var RC = {
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
const NC = C.forwardRef(
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
      ...RC,
      width: n,
      height: n,
      stroke: e,
      strokeWidth: i ? Number(o) * 24 / Number(n) : o,
      className: _0("lucide", a),
      ...!d && !MC(p) && { "aria-hidden": "true" },
      ...p
    },
    [
      ...f.map(([y, v]) => C.createElement(y, v)),
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
const Te = (e, n) => {
  const o = C.forwardRef(
    ({ className: i, ...a }, d) => C.createElement(NC, {
      ref: d,
      iconNode: n,
      className: _0(
        `lucide-${PC(Ly(e))}`,
        `lucide-${e}`,
        i
      ),
      ...a
    })
  );
  return o.displayName = Ly(e), o;
};
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const DC = [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
], jC = Te("arrow-left", DC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const IC = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
], FC = Te("arrow-right", IC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const OC = [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]], za = Te("check", OC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const LC = [["path", { d: "m15 18-6-6 6-6", key: "1wnfg3" }]], VC = Te("chevron-left", LC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const zC = [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]], BC = Te("chevron-right", zC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const UC = [
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
], $C = Te("coffee", UC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const HC = [
  ["rect", { width: "12", height: "12", x: "2", y: "10", rx: "2", ry: "2", key: "6agr2n" }],
  [
    "path",
    { d: "m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6", key: "1o487t" }
  ],
  ["path", { d: "M6 18h.01", key: "uhywen" }],
  ["path", { d: "M10 14h.01", key: "ssrbsk" }],
  ["path", { d: "M15 6h.01", key: "cblpky" }],
  ["path", { d: "M18 9h.01", key: "2061c0" }]
], WC = Te("dices", HC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const GC = [
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
], KC = Te("door-open", GC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const YC = [
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
], Ca = Te("footprints", YC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const QC = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }],
  ["path", { d: "M12 7v5l4 2", key: "1fdv2h" }]
], XC = Te("history", QC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ZC = [
  ["path", { d: "m14 10 7-7", key: "oa77jy" }],
  ["path", { d: "M20 10h-6V4", key: "mjg0md" }],
  ["path", { d: "m3 21 7-7", key: "tjx5ai" }],
  ["path", { d: "M4 14h6v6", key: "rmj7iw" }]
], JC = Te("minimize-2", ZC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const qC = [
  ["circle", { cx: "8", cy: "18", r: "4", key: "1fc0mg" }],
  ["path", { d: "M12 18V2l7 4", key: "g04rme" }]
], eb = Te("music-2", qC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const tb = [
  ["rect", { x: "14", y: "4", width: "4", height: "16", rx: "1", key: "zuxfzm" }],
  ["rect", { x: "6", y: "4", width: "4", height: "16", rx: "1", key: "1okwgv" }]
], Vy = Te("pause", tb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const nb = [
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
], rb = Te("piano", nb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ob = [["polygon", { points: "6 3 20 12 6 21 6 3", key: "1oa8hb" }]], ib = Te("play", ob);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const sb = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
], ab = Te("plus", sb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const lb = [
  ["path", { d: "M4.9 19.1C1 15.2 1 8.8 4.9 4.9", key: "1vaf9d" }],
  ["path", { d: "M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5", key: "u1ii0m" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }],
  ["path", { d: "M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5", key: "1j5fej" }],
  ["path", { d: "M19.1 4.9C23 8.8 23 15.1 19.1 19", key: "10b0cb" }]
], ub = Te("radio", lb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const cb = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
], db = Te("rotate-ccw", cb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const fb = [
  [
    "path",
    {
      d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
      key: "1c8476"
    }
  ],
  ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7", key: "1ydtos" }],
  ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7", key: "t51u73" }]
], T0 = Te("save", fb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const pb = [
  ["path", { d: "M14 17H5", key: "gfn3mx" }],
  ["path", { d: "M19 7h-9", key: "6i9tg" }],
  ["circle", { cx: "17", cy: "17", r: "3", key: "18b49y" }],
  ["circle", { cx: "7", cy: "7", r: "3", key: "dfmy0x" }]
], k0 = Te("settings-2", pb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const mb = [
  ["path", { d: "m18 14 4 4-4 4", key: "10pe0f" }],
  ["path", { d: "m18 2 4 4-4 4", key: "pucp1d" }],
  ["path", { d: "M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22", key: "1ailkh" }],
  ["path", { d: "M2 6h1.972a4 4 0 0 1 3.6 2.2", key: "km57vx" }],
  ["path", { d: "M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45", key: "os18l9" }]
], hb = Te("shuffle", mb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const yb = [
  ["polygon", { points: "5 4 15 12 5 20 5 4", key: "16p6eg" }],
  ["line", { x1: "19", x2: "19", y1: "5", y2: "19", key: "futhcm" }]
], gb = Te("skip-forward", yb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const vb = [
  ["line", { x1: "21", x2: "14", y1: "4", y2: "4", key: "obuewd" }],
  ["line", { x1: "10", x2: "3", y1: "4", y2: "4", key: "1q6298" }],
  ["line", { x1: "21", x2: "12", y1: "12", y2: "12", key: "1iu8h1" }],
  ["line", { x1: "8", x2: "3", y1: "12", y2: "12", key: "ntss68" }],
  ["line", { x1: "21", x2: "16", y1: "20", y2: "20", key: "14d8ph" }],
  ["line", { x1: "12", x2: "3", y1: "20", y2: "20", key: "m0wm8r" }],
  ["line", { x1: "14", x2: "14", y1: "2", y2: "6", key: "14e1ph" }],
  ["line", { x1: "8", x2: "8", y1: "10", y2: "14", key: "1i6ji0" }],
  ["line", { x1: "16", x2: "16", y1: "18", y2: "22", key: "1lctlv" }]
], Sb = Te("sliders-horizontal", vb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const wb = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["circle", { cx: "12", cy: "12", r: "6", key: "1vlfrh" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }]
], xb = Te("target", wb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const _b = [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
], Tb = Te("trash-2", _b);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const kb = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744", key: "16gr8j" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }]
], ba = Te("users", kb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Ab = [
  [
    "path",
    {
      d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
      key: "uqj9uw"
    }
  ],
  ["path", { d: "M16 9a5 5 0 0 1 0 6", key: "1q6k2b" }],
  ["path", { d: "M19.364 18.364a9 9 0 0 0 0-12.728", key: "ijwkga" }]
], Ba = Te("volume-2", Ab);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Cb = [
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
], Hd = Te("waves", Cb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const bb = [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
], A0 = Te("x", bb), zy = (e) => {
  let n;
  const o = /* @__PURE__ */ new Set(), i = (y, v) => {
    const l = typeof y == "function" ? y(n) : y;
    if (!Object.is(l, n)) {
      const c = n;
      n = v ?? (typeof l != "object" || l === null) ? l : Object.assign({}, n, l), o.forEach((S) => S(n, c));
    }
  }, a = () => n, p = { setState: i, getState: a, getInitialState: () => m, subscribe: (y) => (o.add(y), () => o.delete(y)) }, m = n = e(i, a, p);
  return p;
}, Pb = ((e) => e ? zy(e) : zy), Eb = (e) => e;
function Mb(e, n = Eb) {
  const o = hn.useSyncExternalStore(
    e.subscribe,
    hn.useCallback(() => n(e.getState()), [e, n]),
    hn.useCallback(() => n(e.getInitialState()), [e, n])
  );
  return hn.useDebugValue(o), o;
}
const By = (e) => {
  const n = Pb(e), o = (i) => Mb(n, i);
  return Object.assign(o, n), o;
}, Rb = ((e) => e ? By(e) : By), Nb = /* @__PURE__ */ new Set(["pending", "active", "done"]);
function C0() {
  return `topic-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function Pa(e = {}, n = "pending") {
  const o = String(e.title || e.name || "").trim(), i = String(e.description || e.detail || e.notes || "").trim(), a = Nb.has(e.status) ? e.status : n;
  return {
    id: String(e.id || "").trim() || C0(),
    title: o || "Untitled topic",
    description: i,
    status: a
  };
}
function fr(e, n = "Deep work block") {
  const o = Array.isArray(e) ? e.map((f) => Pa(f)).filter(Boolean) : [];
  if (!o.length) {
    const f = Pa({
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
function Wd(e = [], n = "") {
  const o = Array.isArray(e) ? e : [];
  return o.find((i) => i.id === n) || o.find((i) => i.status === "active") || o.find((i) => i.status !== "done") || o[0] || null;
}
function ac(e = [], n = "") {
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
const di = Object.freeze({
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
function Db() {
  return Yn[0] || yn(Gc);
}
function Jc(e) {
  const n = String(e || "");
  if (!n) return null;
  const i = v0(c0()).materials[n];
  return i && typeof i == "object" ? i : null;
}
function rt(e) {
  var i;
  const n = String(e.selectedMaterialId || ((i = e.selectedMaterial) == null ? void 0 : i.materialId) || "");
  if (!n) return;
  const o = v0(c0());
  o.materials[n] = {
    materialId: n,
    selectedScene: e.selectedScene,
    musicType: e.musicType,
    ambientSound: e.ambientSound,
    musicVolume: kt(e.musicVolume),
    ambientVolume: kt(e.ambientVolume),
    audioChannels: { ...di, ...e.audioChannels || {} },
    durationMinutes: gr(e.pomodoroDuration),
    durationSeconds: nn(e.pomodoroDurationSeconds, gi(e.pomodoroDuration)),
    studyGoal: e.studyGoal,
    focusTopics: Array.isArray(e.focusTopics) ? e.focusTopics : [],
    activeTopicId: String(e.activeTopicId || ""),
    studyPlan: g0(e.studyPlan),
    completedTasks: Array.isArray(e.completedTasks) ? e.completedTasks.filter(Boolean) : [],
    workspaceNotes: String(e.workspaceNotes || ""),
    workspaceUpdatedAt: e.workspaceUpdatedAt || "",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }, uC(o);
}
function jb(e) {
  return Array.isArray(e == null ? void 0 : e.completedTasks) ? e.completedTasks.map((n) => String(n || "").trim()).filter(Boolean) : [];
}
function qc(e = {}) {
  return {
    sectionTitle: String(e.sectionTitle || "").trim(),
    excerpt: String(e.excerpt || "").trim().slice(0, 1800)
  };
}
function b0(e = null) {
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
function st() {
  const e = Date.now();
  return Number.isFinite(e) ? e : 0;
}
function Ht(e = {}) {
  return ao(e.timerState || e.timerPhase || e.status || e.timerStatus);
}
function mr(e = {}) {
  const n = Number(e.pomodoroDurationSeconds);
  return Number.isFinite(n) && n > 0 ? nn(n, gi(e.pomodoroDuration)) : gi(e.pomodoroDuration);
}
function Un(e = {}) {
  if (e.timerMode === "countup") return 0;
  const n = Number(e.timerDurationSeconds);
  return Number.isFinite(n) && n > 0 ? n : mr(e);
}
function Ea(e = {}, n = st()) {
  const o = Math.max(0, Number(e.elapsedSeconds) || 0);
  if (Ht(e) !== "running") return o;
  const i = Number(e.timerAnchorAtMs);
  return !Number.isFinite(i) || i <= 0 ? o : Math.max(o, Math.floor(Math.max(0, n - i) / 1e3));
}
function Rt(e, n = st()) {
  const o = ao(e);
  return {
    timerState: o,
    timerPhase: o,
    status: o,
    timerStatus: zd(o),
    timerUpdatedAtMs: n
  };
}
function Ib(e = {}) {
  const n = Ht(e);
  return {
    timerState: n,
    timerPhase: n,
    status: n,
    timerStatus: zd(n),
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
function On(e) {
  var o;
  const n = String(e.selectedMaterialId || ((o = e.selectedMaterial) == null ? void 0 : o.materialId) || "");
  return !n || e.view !== "session" ? !1 : Bd(n, Ib(e));
}
function Uy(e, n = st()) {
  const o = Ea(e, n), i = Un(e), a = e.timerMode !== "countup" && i > 0 && o >= i, d = a ? "completed" : Ht(e);
  return {
    ...Rt(d, n),
    elapsedSeconds: a ? i : o,
    timerAnchorAtMs: d === "running" ? e.timerAnchorAtMs : null,
    timerPausedAtMs: d === "running" ? null : e.timerPausedAtMs || n,
    audioPlaying: d === "running" ? e.audioPlaying : !1
  };
}
function Fb(e, n = {}) {
  const o = yn(n.selectedScene), i = Jc(e == null ? void 0 : e.materialId), a = Ta(i == null ? void 0 : i.selectedScene) ? i.selectedScene : o.id, d = yn(a), f = String((i == null ? void 0 : i.musicType) || d.musicType || "Deep Focus"), p = String((i == null ? void 0 : i.ambientSound) || d.ambientSound || "Nature"), m = kt(i == null ? void 0 : i.musicVolume, n.musicVolume ?? 60), y = kt(i == null ? void 0 : i.ambientVolume, n.ambientVolume ?? 50), v = gr(i == null ? void 0 : i.durationMinutes, n.pomodoroDuration ?? ro), l = nn(
    i == null ? void 0 : i.durationSeconds,
    n.pomodoroDurationSeconds ?? v * 60
  ), c = String((i == null ? void 0 : i.studyGoal) || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`), S = g0(i == null ? void 0 : i.studyPlan), x = S.length ? S : Yc(e, c, v), k = jb(i), A = String((i == null ? void 0 : i.workspaceNotes) || ""), _ = (i == null ? void 0 : i.workspaceUpdatedAt) || (i == null ? void 0 : i.updatedAt) || "";
  return {
    selectedScene: a,
    musicType: f,
    ambientSound: p,
    musicVolume: m,
    ambientVolume: y,
    audioChannels: { ...di, ...(i == null ? void 0 : i.audioChannels) || n.audioChannels || {} },
    pomodoroDuration: v,
    pomodoroDurationSeconds: l,
    studyGoal: c,
    studyPlan: x,
    completedTasks: k,
    workspaceNotes: A,
    workspaceUpdatedAt: _
  };
}
function $y(e) {
  const n = m0(e);
  if (!n || typeof n != "object") return null;
  const o = Ht(n), i = st(), a = Number(n.timerAnchorAtMs), d = Date.parse(n.startedAt || ""), f = Number.isFinite(d) ? d : NaN, p = o === "running" ? Ea({
    ...n,
    timerState: "running",
    timerAnchorAtMs: Number.isFinite(a) && a > 0 ? a : f
  }, i) : Math.max(0, Number(n.elapsedSeconds) || 0), m = Un(n), y = o === "running" ? m > 0 && p >= m ? "completed" : "paused" : o, v = o === "running";
  return {
    route: n.view === "session" ? "session" : "setup",
    view: n.view === "session" ? "session" : "setup",
    ...Rt(v ? "restoring" : y, i),
    timerRestoreTarget: v ? y : null,
    timerMode: n.timerMode === "countup" ? "countup" : "countdown",
    timerAnchorAtMs: null,
    timerPausedAtMs: v ? null : Number(n.timerPausedAtMs) || null,
    timerRestoredAtMs: v ? null : i,
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
    chatMessages: ii(n.chatMessages),
    chatPending: !1,
    chatError: "",
    panelTab: Kc.has(n.panelTab) ? n.panelTab : "materials",
    workspaceNotes: String(n.workspaceNotes || ""),
    workspaceUpdatedAt: n.workspaceUpdatedAt || n.updatedAt || "",
    activeNoteSection: String(n.activeNoteSection || ""),
    activeSourceHighlight: b0(n.activeSourceHighlight),
    assistantContext: qc(n.assistantContext),
    audioPlaying: !1
  };
}
function Us() {
  return {
    completedTasks: [],
    flashcardIndex: 0,
    flashcardSide: "front",
    flashcardProgress: {},
    quizAnswers: {},
    quizChecked: {}
  };
}
function Ob(e) {
  return Object.values(e.flashcardProgress || {}).filter((n) => n && n.difficulty).length;
}
function Lb(e) {
  const n = Object.values(e.quizChecked || {}).filter((i) => i && i.hasKnownAnswer);
  if (!n.length) return null;
  const o = n.filter((i) => i.correct).length;
  return Math.round(o / n.length * 100);
}
function Vb(e) {
  const n = Xc(e.selectedMaterial);
  return Object.entries(e.quizChecked || {}).filter(([, o]) => o && o.hasKnownAnswer && !o.correct).map(([o]) => wC(n[Number(o)], Number(o))).filter(Boolean);
}
async function zb(e, n, o, i = {}) {
  var f, p;
  if (!globalThis.apiClient || typeof globalThis.apiClient.fetch != "function")
    return {
      answer: x0(e, o, Y.getState().studyGoal),
      offline: !0
    };
  const a = await globalThis.apiClient.fetch("/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: e,
      selected_section: i.sectionTitle || ((f = o == null ? void 0 : o.studyHeadings) == null ? void 0 : f[0]) || "",
      selected_excerpt: i.excerpt || "",
      source_strict: !!(o != null && o.isSourceRestricted),
      preferred_language: ((p = globalThis.preferredLanguage) == null ? void 0 : p.value) || "auto",
      title: (o == null ? void 0 : o.materialTitle) || "Study material",
      summary: (o == null ? void 0 : o.aiSummary) || (o == null ? void 0 : o.summaryText) || "",
      sections: (o == null ? void 0 : o.sections) || {},
      source_identity: (o == null ? void 0 : o.materialId) || "",
      source_fingerprint: (o == null ? void 0 : o.sourceFingerprint) || "",
      chat_history: n
    })
  });
  let d = null;
  try {
    d = await a.json();
  } catch {
    throw new Error("Backend returned non-JSON response.");
  }
  if (!a.ok || d != null && d.error)
    throw new Error((d == null ? void 0 : d.error) || "AI request failed.");
  return {
    answer: (d == null ? void 0 : d.answer) || "No answer returned.",
    usedExternalResearch: !!(d != null && d.used_external_research),
    researchSources: Array.isArray(d == null ? void 0 : d.research_sources) ? d.research_sources : []
  };
}
const Y = Rb((e, n) => {
  const o = Db(), i = Jc("focus-room"), a = Ta(i == null ? void 0 : i.selectedScene) ? yn(i.selectedScene) : o, d = gr(i == null ? void 0 : i.durationMinutes, ro), f = nn(
    i == null ? void 0 : i.durationSeconds,
    gi(d)
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
    audioChannels: { ...di, ...(i == null ? void 0 : i.audioChannels) || {} },
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
      const p = n(), m = m0("focus-room"), y = $y("focus-room"), v = Ht(m || {});
      if (!!((y == null ? void 0 : y.view) === "session" && y.currentSession && v === "running")) {
        const A = yn((m == null ? void 0 : m.selectedScene) || p.selectedScene);
        e({
          selectedMaterialId: "focus-room",
          selectedMaterial: null,
          studyPlan: Array.isArray(m == null ? void 0 : m.studyPlan) ? m.studyPlan : [],
          selectedScene: A.id,
          musicType: (m == null ? void 0 : m.musicType) || p.musicType,
          ambientSound: (m == null ? void 0 : m.ambientSound) || p.ambientSound,
          musicVolume: kt(m == null ? void 0 : m.musicVolume, p.musicVolume),
          ambientVolume: kt(m == null ? void 0 : m.ambientVolume, p.ambientVolume),
          audioChannels: { ...di, ...(m == null ? void 0 : m.audioChannels) || p.audioChannels || {} },
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
      sa("focus-room");
      const c = Jc("focus-room"), S = yn((c == null ? void 0 : c.selectedScene) || p.selectedScene), x = gr(c == null ? void 0 : c.durationMinutes, p.pomodoroDuration || ro), k = nn(
        c == null ? void 0 : c.durationSeconds,
        p.pomodoroDurationSeconds || gi(x)
      );
      e({
        route: "setup",
        view: "setup",
        selectedMaterialId: "focus-room",
        selectedMaterial: null,
        selectedScene: S.id,
        musicType: String((c == null ? void 0 : c.musicType) || S.musicType || p.musicType || "Deep Focus"),
        ambientSound: String((c == null ? void 0 : c.ambientSound) || S.ambientSound || p.ambientSound || "Nature"),
        musicVolume: kt(c == null ? void 0 : c.musicVolume, p.musicVolume ?? 60),
        ambientVolume: kt(c == null ? void 0 : c.ambientVolume, p.ambientVolume ?? 50),
        audioChannels: { ...di, ...(c == null ? void 0 : c.audioChannels) || p.audioChannels || {} },
        pomodoroDuration: x,
        pomodoroDurationSeconds: k,
        timerDurationSeconds: k,
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
        ...Rt("idle", st()),
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
      rt(p), sa("focus-room"), e({
        route: "setup",
        view: "setup",
        currentSession: null,
        summaryRecord: null,
        audioPlaying: !1,
        aiPanelOpen: !1,
        activeDrawer: "",
        elapsedSeconds: 0,
        startedAt: null,
        ...Rt("idle", st()),
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
      const v = n(), l = !!m, c = l ? m.materialId : String(p.materialId || "");
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
      const S = v.selectedMaterialId === c, x = S && y ? null : $y(c), k = S && y ? {} : Fb(m, v), A = S && y ? {} : {
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
          pomodoroDuration: k.pomodoroDuration || ro,
          pomodoroDurationSeconds: k.pomodoroDurationSeconds
        }),
        elapsedSeconds: 0,
        startedAt: null,
        currentSession: null,
        ...Us(),
        chatMessages: [],
        chatPending: !1,
        chatError: "",
        activeNoteSection: "",
        activeSourceHighlight: null,
        assistantContext: { sectionTitle: "", excerpt: "" }
      }, _ = S && y ? v.view === "session" ? "session" : "setup" : (x == null ? void 0 : x.view) === "session" ? "session" : "setup";
      if (e({
        ...k,
        ...A,
        ...x,
        route: _,
        view: _,
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
          const D = st(), O = Un(E), K = O > 0 ? Math.min(O, Math.max(0, Number(E.elapsedSeconds) || 0)) : Math.max(0, Number(E.elapsedSeconds) || 0), W = {
            ...Rt(b, D),
            timerRestoreTarget: null,
            timerAnchorAtMs: null,
            timerPausedAtMs: b === "paused" ? D : null,
            timerRestoredAtMs: D,
            elapsedSeconds: K,
            audioPlaying: !1
          };
          e(W), On({ ...E, ...W });
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
        sessionHistory: Wc()
      });
    },
    selectScene(p) {
      const m = Ta(p);
      m && e((y) => {
        const v = {
          selectedScene: m.id,
          musicType: m.musicType || y.musicType,
          ambientSound: m.ambientSound || y.ambientSound
        }, l = { ...y, ...v };
        return rt(l), v;
      });
    },
    setPomodoroDurationSeconds(p) {
      e((m) => {
        const y = nn(p, m.pomodoroDurationSeconds), v = Math.max(1, Math.round(y / 60)), l = m.selectedMaterial ? Yc(m.selectedMaterial, m.studyGoal, v) : [], c = {
          pomodoroDuration: v,
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
        var S;
        const y = String(p ?? ""), v = m.selectedMaterial ? Yc(m.selectedMaterial, y, m.pomodoroDuration) : [], l = Array.isArray(m.focusTopics) ? m.focusTopics.map((x) => x.id === m.activeTopicId || x.status === "active" ? { ...x, title: y || x.title, status: "active" } : x) : fr([], y).focusTopics, c = {
          studyGoal: y,
          studyPlan: v,
          focusTopics: l,
          activeTopicId: m.activeTopicId || ((S = l.find((x) => x.status === "active")) == null ? void 0 : S.id) || ""
        };
        return rt({ ...m, ...c }), c;
      });
    },
    addFocusTopic(p = {}) {
      e((m) => {
        const y = (m.focusTopics || []).some((S) => S.status === "active"), v = Pa({
          id: C0(),
          title: p.title || `Topic ${(m.focusTopics || []).length + 1}`,
          description: p.description || "",
          status: y ? "pending" : "active"
        }, y ? "pending" : "active"), c = {
          focusTopics: [...m.focusTopics || [], v],
          activeTopicId: y ? m.activeTopicId : v.id,
          studyGoal: y ? m.studyGoal : v.title
        };
        return rt({ ...m, ...c }), c;
      });
    },
    updateFocusTopic(p, m = {}) {
      e((y) => {
        const v = (y.focusTopics || []).map((S) => S.id !== p ? S : Pa({
          ...S,
          ...m,
          id: S.id,
          status: S.status
        }, S.status)), l = Wd(v, y.activeTopicId), c = {
          focusTopics: v,
          activeTopicId: (l == null ? void 0 : l.id) || y.activeTopicId || "",
          studyGoal: (l == null ? void 0 : l.title) || y.studyGoal
        };
        return rt({ ...y, ...c }), c;
      });
    },
    activateFocusTopic(p) {
      e((m) => {
        const y = ac(m.focusTopics, p);
        return rt({ ...m, ...y }), y;
      });
    },
    finishFocusTopic(p = "") {
      e((m) => {
        const y = String(p || m.activeTopicId || ""), v = (m.focusTopics || []).map((c) => c.id === y ? { ...c, status: "done" } : c), l = ac(v);
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
        const l = m.activeTopicId === p || (m.focusTopics || []).some((c) => c.id === p && c.status === "active") ? ac(y) : fr(y, m.studyGoal);
        return rt({ ...m, ...l }), l;
      });
    },
    setSound(p, m) {
      e((y) => {
        var l;
        let v = {};
        if (p === "musicVolume" && (v = { musicVolume: kt(m, y.musicVolume) }), p === "ambientVolume" && (v = { ambientVolume: kt(m, y.ambientVolume) }), p === "musicType" && (v = { musicType: String(m || y.musicType) }), p === "ambientSound" && (v = { ambientSound: String(m || y.ambientSound) }), String(p).startsWith("audioChannel:")) {
          const c = String(p).slice(13);
          v = { audioChannels: { ...y.audioChannels, [c]: kt(m, ((l = y.audioChannels) == null ? void 0 : l[c]) ?? 0) } };
        }
        return rt({ ...y, ...v }), v;
      });
    },
    applyAudioPreset(p) {
      e((m) => {
        const y = nC(p), v = {
          musicType: y.musicType,
          ambientSound: y.ambientSound
        };
        return rt({ ...m, ...v }), v;
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
      const m = Kc.has(String(p || "")) ? String(p) : "materials";
      e({
        panelTab: m,
        aiPanelOpen: !0,
        activeDrawer: ""
      });
    },
    selectSourceHighlight(p = null, { openPanel: m = !0 } = {}) {
      const y = b0(p);
      e({
        activeSourceHighlight: y,
        activeNoteSection: (y == null ? void 0 : y.sectionTitle) || n().activeNoteSection || "",
        assistantContext: y ? qc({
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
        panelTab: Kc.has(m) ? m : "materials",
        aiPanelOpen: !0,
        activeDrawer: ""
      });
    },
    startSession() {
      const p = n(), m = p.timerMode === "countup" ? "countup" : "countdown";
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
        timerUpdatedAtMs: st(),
        timerRestoredAtMs: null,
        timerDurationSeconds: m === "countup" ? 0 : mr(p),
        elapsedSeconds: 0,
        startedAt: null,
        summaryRecord: null,
        aiPanelOpen: !1,
        activeDrawer: "",
        currentSession: {
          sessionId: `focus-${Date.now()}`,
          materialId: "focus-room",
          studyGoal: p.studyGoal,
          selectedScene: p.selectedScene,
          musicType: p.musicType,
          ambientSound: p.ambientSound,
          musicVolume: p.musicVolume,
          ambientVolume: p.ambientVolume,
          pomodoroDuration: p.pomodoroDuration,
          startedAt: null
        },
        ...Us(),
        chatMessages: [],
        chatPending: !1,
        chatError: ""
      });
    },
    startTimer() {
      const p = n();
      (!p.currentSession || p.view !== "session") && n().startSession();
      const m = n(), y = st(), v = Ht(m);
      if (v === "running") {
        n().tickTimer();
        return;
      }
      const l = Un(m), c = v === "completed" || v === "break" || l > 0 && m.elapsedSeconds >= l, S = c ? 0 : Math.max(0, Number(m.elapsedSeconds) || 0), x = {
        view: "session",
        route: "session",
        ...Rt("running", y),
        audioPlaying: p.audioPlaying,
        summaryRecord: null,
        elapsedSeconds: S,
        startedAt: !m.startedAt || c ? new Date(y).toISOString() : m.startedAt,
        timerAnchorAtMs: y - S * 1e3,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        timerDurationSeconds: l,
        ...c ? Us() : {}
      };
      e(x), On({ ...m, ...x });
    },
    pauseTimer({ pauseAudio: p = !0 } = {}) {
      const m = n(), y = st();
      if (Ht(m) !== "running") {
        p && m.audioPlaying && e({ audioPlaying: !1 });
        return;
      }
      const v = Uy(m, y), l = {
        ...v,
        ...Rt(v.timerState === "completed" ? "completed" : "paused", y),
        timerAnchorAtMs: null,
        timerPausedAtMs: y,
        audioPlaying: p ? !1 : m.audioPlaying
      };
      e(l), On({ ...m, ...l });
    },
    resetTimer() {
      const p = st(), m = {
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
        ...Us()
      };
      e(m), On({ ...n(), ...m });
    },
    skipTimer() {
      const p = n(), m = st(), y = Un(p), v = {
        ...Rt("completed", m),
        elapsedSeconds: y || Math.max(0, Number(p.elapsedSeconds) || 0),
        audioPlaying: !1,
        startedAt: p.startedAt || new Date(m).toISOString(),
        timerAnchorAtMs: null,
        timerPausedAtMs: m,
        timerDurationSeconds: y
      };
      e(v), On({ ...p, ...v });
    },
    tickTimer() {
      const p = n();
      if (p.view !== "session" || Ht(p) !== "running") return;
      const m = st(), y = Un(p), v = y ? Math.min(y, Ea(p, m)) : Ea(p, m), l = y > 0 && v >= y ? "completed" : "running", c = {
        ...Rt(l, m),
        elapsedSeconds: v,
        timerAnchorAtMs: l === "running" ? p.timerAnchorAtMs : null,
        timerPausedAtMs: l === "running" ? null : m,
        timerDurationSeconds: y,
        audioPlaying: l === "running" ? p.audioPlaying : !1
      };
      v === p.elapsedSeconds && l === Ht(p) || (e(c), On({ ...p, ...c }));
    },
    setTimerMode(p = "countdown") {
      const m = p === "countup" ? "countup" : "countdown", y = {
        timerMode: m,
        timerDurationSeconds: m === "countup" ? 0 : mr(n())
      };
      e(y), On({ ...n(), ...y });
    },
    startBreak() {
      const p = st(), m = {
        ...Rt("break", p),
        timerRestoreTarget: null,
        timerAnchorAtMs: null,
        timerPausedAtMs: p,
        timerDurationSeconds: 0,
        audioPlaying: !1
      };
      e(m), On({ ...n(), ...m });
    },
    getTimerState() {
      return Ht(n());
    },
    endSession() {
      var x;
      const p = n(), m = st(), y = new Date(m).toISOString(), v = Ht(p) === "running" ? Uy(p, m) : p, l = Un(v), c = l ? Math.min(l, v.elapsedSeconds) : v.elapsedSeconds, S = dC({
        sessionId: (x = p.currentSession) == null ? void 0 : x.sessionId,
        materialId: "focus-room",
        materialTitle: "Focus Room",
        studyGoal: p.studyGoal,
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
      sa("focus-room"), e({
        summaryRecord: S,
        sessionHistory: Wc(),
        ...Rt("completed", m),
        audioPlaying: !1,
        timerAnchorAtMs: null,
        timerPausedAtMs: m,
        timerDurationSeconds: l,
        elapsedSeconds: l ? Math.min(l, v.elapsedSeconds) : v.elapsedSeconds,
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
      e({ assistantContext: qc(p) });
    },
    toggleTask(p) {
      e((m) => {
        const y = m.studyPlan[Number(p)];
        if (!y) return {};
        const v = String(y.task || ""), l = m.completedTasks.includes(v) ? m.completedTasks.filter((c) => c !== v) : [...m.completedTasks, v];
        return rt({ ...m, completedTasks: l }), { completedTasks: l };
      });
    },
    updatePlanTask(p, m = null, y = null) {
      e((v) => {
        const l = Number(p), c = v.studyPlan[l];
        if (!c) return {};
        const S = String(c.task || ""), x = y == null ? S : String(y || "").trim(), k = m == null ? c.minutes : wr(m, c.minutes, 1, Va), A = v.studyPlan.map((E, D) => D === l ? { minutes: k, task: x || S } : E);
        let _ = v.completedTasks;
        S && S !== A[l].task && _.includes(S) && (_ = _.filter((E) => E !== S).concat(A[l].task));
        const b = { studyPlan: A, completedTasks: _ };
        return rt({ ...v, ...b }), b;
      });
    },
    setFlashcardIndex(p) {
      const m = Oy(n().selectedMaterial);
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
      const m = n(), y = Oy(m.selectedMaterial);
      if (!y.length) return;
      const v = wr(m.flashcardIndex, 0, 0, y.length - 1), l = y[v], c = ["easy", "medium", "hard"].includes(String(p)) ? String(p) : "medium";
      e({
        flashcardProgress: {
          ...m.flashcardProgress,
          [vC(l, v)]: {
            difficulty: c,
            reviewedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        },
        flashcardSide: "front",
        flashcardIndex: v < y.length - 1 ? v + 1 : v
      });
    },
    answerQuizQuestion(p, m) {
      const y = Number(p), v = Xc(n().selectedMaterial)[y];
      if (!v) return;
      const l = String(y);
      e((c) => ({
        quizAnswers: {
          ...c.quizAnswers,
          [l]: TC(v, m, c.quizAnswers[l])
        }
      }));
    },
    checkQuizQuestion(p) {
      const m = Xc(n().selectedMaterial), y = Number(p), v = m[y];
      if (!v) return;
      const l = String(y), c = n(), S = Object.prototype.hasOwnProperty.call(c.quizAnswers, l) ? c.quizAnswers[l] : "", x = kC(v, S), k = w0(v);
      e({
        quizChecked: {
          ...c.quizChecked,
          [l]: {
            answer: S,
            correct: x === null ? !1 : x,
            hasKnownAnswer: x !== null,
            explanation: v.explanation || v.rationale || (k ? `Correct answer: ${k}` : ""),
            checkedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        }
      });
    },
    async askAssistant(p) {
      const m = String(p || "").trim();
      if (!m) return;
      const y = n(), v = y.selectedMaterial, l = ii(y.chatMessages).slice(-10).map((c) => ({
        role: c.role === "user" ? "user" : "assistant",
        content: c.text
      }));
      e({
        chatMessages: ii([
          ...y.chatMessages,
          { role: "user", text: m, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
        ]),
        chatPending: !0,
        chatError: ""
      });
      try {
        const c = await zb(m, l, v, y.assistantContext);
        e((S) => ({
          chatMessages: ii([
            ...S.chatMessages,
            { role: "assistant", text: c.answer, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: c.offline ? "Using a local Focus Room reply because the AI tutor service is not connected." : ""
        }));
      } catch (c) {
        e((S) => ({
          chatMessages: ii([
            ...S.chatMessages,
            { role: "assistant", text: x0(m, v, n().studyGoal), createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: `AI tutor unavailable: ${c.message || "request failed"}`
        }));
      } finally {
        e({ chatPending: !1 });
      }
    },
    focusFlashcardsCompletedCount() {
      return Ob(n());
    },
    focusQuizScore() {
      return Lb(n());
    },
    focusQuizMistakes() {
      return Vb(n());
    },
    formatFocusedTime() {
      return h0(n().elapsedSeconds);
    }
  };
});
function P0({ compact: e = !1, className: n = "" }) {
  const o = Y((c) => c.focusTopics), i = Y((c) => c.activeTopicId), a = Y((c) => c.addFocusTopic), d = Y((c) => c.updateFocusTopic), f = Y((c) => c.finishFocusTopic), p = Y((c) => c.removeFocusTopic), m = Y((c) => c.activateFocusTopic), y = Wd(o, i), v = (o || []).filter((c) => c.status !== "done").length, l = (o || []).filter((c) => c.status === "done").length;
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
                /* @__PURE__ */ w.jsx(ab, { size: 14, "aria-hidden": "true" }),
                "Add"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ w.jsxs("p", { className: "focus-topics-hint", children: [
          "Finish or remove the active topic to switch into the next one automatically.",
          l ? ` ${l} done · ${v} open.` : null
        ] }),
        /* @__PURE__ */ w.jsx("div", { className: "focus-topics-list", children: (o || []).map((c, S) => {
          const x = c.id === (y == null ? void 0 : y.id), k = c.status === "done";
          return /* @__PURE__ */ w.jsxs(
            "article",
            {
              className: `focus-topic-card ${x ? "is-active" : ""} ${k ? "is-done" : ""}`.trim(),
              "data-focus-topic-id": c.id,
              "data-focus-topic-status": c.status,
              children: [
                /* @__PURE__ */ w.jsxs("div", { className: "focus-topic-card-top", children: [
                  /* @__PURE__ */ w.jsx("span", { className: "focus-topic-index", children: String(S + 1).padStart(2, "0") }),
                  /* @__PURE__ */ w.jsx("span", { className: "focus-topic-status", children: k ? "Done" : x ? "Active" : "Next" }),
                  /* @__PURE__ */ w.jsxs("div", { className: "focus-topic-actions", children: [
                    !k && !x ? /* @__PURE__ */ w.jsx(
                      "button",
                      {
                        type: "button",
                        className: "focus-topic-action",
                        onClick: () => m(c.id),
                        "aria-label": `Activate topic ${c.title}`,
                        children: "Use"
                      }
                    ) : null,
                    k ? null : /* @__PURE__ */ w.jsxs(
                      "button",
                      {
                        type: "button",
                        className: "focus-topic-action is-success",
                        onClick: () => f(c.id),
                        "aria-label": `Mark topic ${c.title} as done`,
                        "data-focus-topic-finish": c.id,
                        children: [
                          /* @__PURE__ */ w.jsx(za, { size: 13, "aria-hidden": "true" }),
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
                        children: /* @__PURE__ */ w.jsx(Tb, { size: 13, "aria-hidden": "true" })
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
                      disabled: k,
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
                      disabled: k,
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
function Hy({ scene: e, active: n, onSelect: o, variant: i = "default" }) {
  return i === "gallery" ? /* @__PURE__ */ w.jsxs(
    gn.button,
    {
      className: `scene-card scene-card-gallery ${n ? "active" : ""}`.trim(),
      type: "button",
      "aria-pressed": n,
      "aria-label": `${e.name}: ${e.description}`,
      onClick: () => o(e.id),
      whileHover: { y: -2 },
      whileTap: { scale: 0.985 },
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
    gn.button,
    {
      className: `scene-card ${n ? "active" : ""}`.trim(),
      type: "button",
      "aria-pressed": n,
      "aria-label": `${e.name}: ${e.description}`,
      onClick: () => o(e.id),
      style: { backgroundImage: `url("${e.image}")` },
      whileHover: { scale: 1.025, y: -2 },
      whileTap: { scale: 0.98 },
      children: [
        /* @__PURE__ */ w.jsx("span", { className: "focus-pill", children: e.kicker }),
        /* @__PURE__ */ w.jsx("strong", { children: e.name }),
        /* @__PURE__ */ w.jsx("span", { children: e.description })
      ]
    }
  );
}
const $s = 8;
function Gd({ variant: e = "default" }) {
  const n = Y((y) => y.selectedScene), o = Y((y) => y.selectScene), [i, a] = C.useState(0), d = C.useMemo(() => e === "gallery" ? oC : Yn.filter((y) => !y.galleryOnly || y.id === n), [n, e]), f = Math.max(1, Math.ceil(d.length / $s)), p = Math.min(i, f - 1), m = e === "gallery" ? d.slice(p * $s, p * $s + $s) : d;
  return e !== "gallery" ? /* @__PURE__ */ w.jsx("div", { className: "scene-selector", "aria-label": "Study scenes", children: m.map((y) => /* @__PURE__ */ w.jsx(
    Hy,
    {
      scene: y,
      active: y.id === n,
      onSelect: o
    },
    y.id
  )) }) : /* @__PURE__ */ w.jsxs("div", { className: "scene-selector-wrap", "aria-label": "Study scenes", children: [
    /* @__PURE__ */ w.jsx("div", { className: "scene-selector scene-selector-gallery", children: m.map((y) => /* @__PURE__ */ w.jsx(
      Hy,
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
          children: /* @__PURE__ */ w.jsx(VC, { size: 18, "aria-hidden": "true" })
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
          children: /* @__PURE__ */ w.jsx(BC, { size: 18, "aria-hidden": "true" })
        }
      )
    ] }) : null
  ] });
}
const Wy = [
  { label: "Lo-fi Chill", icon: eb, musicType: "Lo-fi", ambientSound: "Cafe Rain" },
  { label: "Ambient Piano", icon: rb, musicType: "Piano", ambientSound: "Nature" },
  { label: "Nature Ambient", icon: Hd, musicType: "Deep Focus", ambientSound: "Nature" },
  { label: "Acoustic Warm", icon: $C, musicType: "Minimal", ambientSound: "White Noise" },
  { label: "Deep Focus", icon: ub, musicType: "Deep Focus", ambientSound: "White Noise" }
];
function Bb({ onWorkspace: e }) {
  const n = Y((b) => b.selectedScene), o = Y((b) => b.pomodoroDuration), i = Y((b) => b.timerMode), a = Y((b) => b.musicType), d = Y((b) => b.focusTopics), f = Y((b) => b.setPomodoroDuration), p = Y((b) => b.setTimerMode), m = Y((b) => b.setSound), y = Y((b) => b.startSession), [v, l] = C.useState(!1), c = C.useMemo(
    () => {
      var b;
      return ((b = Wy.find((E) => E.musicType === a)) == null ? void 0 : b.label) || "";
    },
    [a]
  ), S = (d || []).filter((b) => b.status !== "done").length, x = (b) => {
    m("musicType", b.musicType), m("ambientSound", b.ambientSound);
  }, k = (b) => {
    p("countdown"), f(b);
  }, A = () => {
    n && y();
  }, _ = () => {
    e == null || e("", "history");
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
            onClick: _,
            "aria-label": "Open Focus Trail",
            title: "Open Focus Trail",
            children: /* @__PURE__ */ w.jsx(XC, { size: 18, "aria-hidden": "true" })
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
            children: /* @__PURE__ */ w.jsx(jC, { size: 20, "aria-hidden": "true" })
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
        /* @__PURE__ */ w.jsx(Gd, { variant: "gallery" })
      ] }),
      /* @__PURE__ */ w.jsxs("aside", { className: "innook-control-rail", "aria-label": "Study settings", children: [
        /* @__PURE__ */ w.jsx("div", { className: "innook-rail-group", "aria-label": "Music atmosphere", children: Wy.map((b) => {
          const E = b.icon, D = c === b.label;
          return /* @__PURE__ */ w.jsx(
            "button",
            {
              type: "button",
              className: `innook-rail-icon ${D ? "is-active" : ""}`.trim(),
              onClick: () => x(b),
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
          l0.map((b) => {
            const E = i !== "countup" && b === o;
            return /* @__PURE__ */ w.jsx(
              "button",
              {
                type: "button",
                className: `innook-duration ${E ? "is-active" : ""}`.trim(),
                onClick: () => k(b),
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
              className: `innook-duration innook-duration-infinity ${i === "countup" ? "is-active" : ""}`.trim(),
              onClick: () => p("countup"),
              "aria-label": "Count-up timer",
              "aria-pressed": i === "countup",
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
            className: `innook-rail-icon ${v ? "is-active" : ""}`.trim(),
            onClick: () => l((b) => !b),
            "aria-label": "Edit focus topics",
            "aria-expanded": v,
            title: "Edit focus topics",
            "data-focus-topics-toggle": "true",
            children: [
              /* @__PURE__ */ w.jsx(xb, { size: 16, "aria-hidden": "true" }),
              S > 1 ? /* @__PURE__ */ w.jsx("span", { className: "innook-rail-badge", children: S }) : null
            ]
          }
        ),
        /* @__PURE__ */ w.jsx(
          "button",
          {
            type: "button",
            className: "innook-enter-button",
            onClick: A,
            disabled: !n,
            "data-focus-enter": "true",
            "aria-label": "Enter Focus Room",
            title: "Enter Focus Room",
            children: /* @__PURE__ */ w.jsx(FC, { size: 22, "aria-hidden": "true" })
          }
        ),
        v ? /* @__PURE__ */ w.jsx("div", { className: "innook-goal-popover innook-topics-popover", "data-focus-topics-popover": "true", children: /* @__PURE__ */ w.jsx(P0, { compact: !0 }) }) : null
      ] })
    ] })
  ] });
}
function Ee({
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
function Ub({ onWorkspace: e, onOpenTrail: n, onOpenCompanion: o, onOpenSettings: i, onExit: a }) {
  const d = Y((p) => p.selectedScene), f = yn(d);
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
      /* @__PURE__ */ w.jsxs(Ee, { className: "header-icon-button", onClick: n, title: "Open Focus Trail", "aria-label": "Open Focus Trail", children: [
        /* @__PURE__ */ w.jsx(Ca, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Focus Trail" })
      ] }),
      /* @__PURE__ */ w.jsxs(Ee, { className: "header-icon-button", onClick: o, title: "Open Companion Room", "aria-label": "Open Companion Room", children: [
        /* @__PURE__ */ w.jsx(ba, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Companion" })
      ] }),
      /* @__PURE__ */ w.jsxs(Ee, { className: "header-icon-button", onClick: i, title: "Open room settings", "aria-label": "Open room settings", children: [
        /* @__PURE__ */ w.jsx(k0, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Settings" })
      ] }),
      /* @__PURE__ */ w.jsxs(Ee, { className: "header-icon-button header-exit-button", onClick: a, title: "Exit Focus Room", "aria-label": "Exit Focus Room", children: [
        /* @__PURE__ */ w.jsx(KC, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Exit" })
      ] })
    ] })
  ] });
}
const E0 = {
  minutes: Math.floor(y0 / 60),
  seconds: 59
}, $b = {
  minutes: 3,
  seconds: 2
};
function Kd(e) {
  const n = nn(e, Ud);
  return {
    minutes: Math.floor(n / 60),
    seconds: n % 60
  };
}
function Gy(e, n) {
  const o = Math.max(0, Math.floor(Number(e) || 0)), i = Math.max(0, Math.floor(Number(n) || 0));
  return nn(o * 60 + i, Ud);
}
function ed(e, n) {
  return String(Math.max(0, Math.floor(Number(e) || 0))).padStart(2, "0");
}
function Yd(e) {
  const { minutes: n, seconds: o } = Kd(e);
  return `${ed(n, "minutes")}:${ed(o, "seconds")}`;
}
function Hb(e, n, o) {
  const i = $b[o] || 2;
  return `${String(e || "").replace(/\D/g, "")}${String(n).replace(/\D/g, "")}`.slice(-i) || "";
}
function Wb(e, n) {
  const o = Number(String(e || "").replace(/\D/g, "")) || 0;
  return Math.min(E0[n], o);
}
function Gb(e, n, o) {
  const i = Kd(e), a = Wb(o, n);
  return n === "seconds" ? Gy(i.minutes, a) : Gy(a, i.seconds);
}
const Kb = { minutes: "Minutes", seconds: "Seconds" };
function Ky({
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
  const y = Kb[e], v = (l) => {
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
      "aria-valuemax": E0[e],
      "aria-valuenow": n,
      "aria-valuetext": `${n} ${y.toLowerCase()}`,
      "aria-disabled": o || void 0,
      onFocus: () => a(e),
      onKeyDown: v,
      children: ed(n, e)
    }
  ) });
}
function Yb({
  valueSeconds: e,
  onChange: n,
  disabled: o = !1,
  size: i = "hero",
  ariaLabel: a = "Set focus block length",
  className: d = ""
}) {
  const { minutes: f, seconds: p } = Kd(e), [m, y] = C.useState(null), v = C.useRef(""), l = C.useRef(null), c = C.useRef(null), S = C.useRef(null), x = C.useCallback(() => {
    v.current = "";
  }, []), k = C.useCallback((E) => {
    v.current = "", y(E);
  }, []), A = C.useCallback(
    (E, D) => {
      if (o) return;
      const O = Hb(v.current, D, E);
      v.current = O, y(E), n == null || n(Gb(e, E, O));
    },
    [o, n, e]
  ), _ = C.useCallback((E) => {
    var O;
    const D = E < 0 ? "minutes" : "seconds";
    v.current = "", y(D), (O = (E < 0 ? l : c).current) == null || O.focus();
  }, []), b = (E) => {
    var D;
    (D = S.current) != null && D.contains(E.relatedTarget) || (x(), y(null));
  };
  return /* @__PURE__ */ w.jsxs(
    "div",
    {
      ref: S,
      className: `timer-editor timer-editor-${i}${o ? " is-readonly" : ""} ${d}`.trim(),
      role: "group",
      "aria-label": a,
      onBlur: b,
      children: [
        o ? /* @__PURE__ */ w.jsx("span", { className: "timer-editor-static", "aria-hidden": "true", children: Yd(e) }) : /* @__PURE__ */ w.jsxs(w.Fragment, { children: [
          /* @__PURE__ */ w.jsx(
            Ky,
            {
              segment: "minutes",
              value: f,
              disabled: o,
              active: m === "minutes",
              segmentRef: l,
              onFocusSegment: k,
              onType: A,
              onCommit: x,
              onMove: _
            }
          ),
          /* @__PURE__ */ w.jsx("span", { className: "timer-editor-colon", "aria-hidden": "true", children: ":" }),
          /* @__PURE__ */ w.jsx(
            Ky,
            {
              segment: "seconds",
              value: p,
              disabled: o,
              active: m === "seconds",
              segmentRef: c,
              onFocusSegment: k,
              onType: A,
              onCommit: x,
              onMove: _
            }
          )
        ] }),
        !o && /* @__PURE__ */ w.jsx("span", { className: "sr-only", children: "Editable focus timer. Click minutes or seconds, then type digits to set the value." })
      ]
    }
  );
}
function Qb(e, n) {
  return n ? Math.min(100, Math.max(0, e / n * 100)) : 0;
}
function Xb({ onFocusMode: e, audioState: n }) {
  const o = Y((Q) => Q.timerStatus), i = Y((Q) => Q.elapsedSeconds), a = Y((Q) => Q.pomodoroDuration), d = Y((Q) => Q.pomodoroDurationSeconds), f = Y((Q) => Q.timerMode), p = Y((Q) => Q.studyGoal), m = Y((Q) => Q.focusTopics), y = Y((Q) => Q.activeTopicId), v = Y((Q) => Q.currentSession), l = Y((Q) => Q.startTimer), c = Y((Q) => Q.pauseTimer), S = Y((Q) => Q.resetTimer), x = Y((Q) => Q.skipTimer), k = Y((Q) => Q.toggleAudio), A = Y((Q) => Q.audioPlaying), _ = Y((Q) => Q.setPomodoroDurationSeconds), b = Y((Q) => Q.finishFocusTopic), E = Wd(m, y), D = Number(d) || (Number(a) || 0) * 60, O = f === "countup" ? i : Math.max(0, D - i), K = o === "paused", W = o === "studying", $ = o === "completed", G = o === "idle" && f !== "countup", Z = $ && f !== "countup" ? "00:00" : Qc(O), te = K ? "Paused" : $ ? "Complete" : W ? "In focus" : "Ready", ce = K ? "Resume timer" : W ? "Pause timer" : "Start timer", he = (E == null ? void 0 : E.title) || p || "A quiet block for meaningful progress", pe = (E == null ? void 0 : E.description) || "", we = !!(E && E.status !== "done");
  return /* @__PURE__ */ w.jsxs("div", { className: "focus-session-dock liquid-glass", "aria-label": "Focus session controls", children: [
    /* @__PURE__ */ w.jsxs("div", { className: "dock-timer-block", children: [
      /* @__PURE__ */ w.jsxs("div", { className: "dock-eyebrow", children: [
        "POMODORO #",
        (v == null ? void 0 : v.pomodoroNumber) || 1
      ] }),
      /* @__PURE__ */ w.jsxs("div", { className: "dock-status", children: [
        /* @__PURE__ */ w.jsx("span", { className: `dock-status-dot ${K || !W ? "is-paused" : ""}` }),
        te
      ] }),
      G ? /* @__PURE__ */ w.jsx(
        Yb,
        {
          className: "dock-time-editor",
          valueSeconds: D,
          onChange: _,
          size: "dock",
          ariaLabel: "Set focus block length"
        }
      ) : /* @__PURE__ */ w.jsx("strong", { className: "dock-time", "aria-live": "off", children: Z }),
      /* @__PURE__ */ w.jsx("div", { className: "dock-progress", "aria-hidden": "true", children: /* @__PURE__ */ w.jsx("span", { style: { width: `${Qb(i, D)}%` } }) })
    ] }),
    /* @__PURE__ */ w.jsxs("div", { className: "dock-goal-block", "data-focus-active-topic": "true", children: [
      /* @__PURE__ */ w.jsx("span", { className: "dock-eyebrow", children: "ACTIVE TOPIC" }),
      /* @__PURE__ */ w.jsx("strong", { children: he }),
      pe ? /* @__PURE__ */ w.jsx("span", { className: "dock-goal-description", children: pe }) : null,
      /* @__PURE__ */ w.jsxs("span", { className: "dock-goal-meta", children: [
        f === "countup" ? "Count-up" : `${Yd(D)} block`,
        " · ",
        Qc(i),
        " focused"
      ] }),
      we ? /* @__PURE__ */ w.jsxs(
        "button",
        {
          type: "button",
          className: "dock-topic-finish",
          onClick: () => b(E.id),
          "data-focus-topic-finish-dock": "true",
          "aria-label": "Mark active topic done and switch to the next",
          children: [
            /* @__PURE__ */ w.jsx(za, { size: 13, "aria-hidden": "true" }),
            "Done · next topic"
          ]
        }
      ) : null
    ] }),
    /* @__PURE__ */ w.jsxs("div", { className: "dock-action-block", children: [
      /* @__PURE__ */ w.jsxs(Ee, { className: "dock-action-button", onClick: k, "aria-label": A ? "Pause room audio" : "Play room audio", children: [
        A ? /* @__PURE__ */ w.jsx(Vy, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(Ba, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: n != null && n.playing ? "Pause audio" : "Audio" })
      ] }),
      /* @__PURE__ */ w.jsxs(Ee, { className: "dock-action-button", onClick: () => W ? c() : l(), variant: "primary", "aria-label": ce, children: [
        W ? /* @__PURE__ */ w.jsx(Vy, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(ib, { size: 15, fill: "currentColor", "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: K ? "Resume" : W ? "Pause" : "Start" })
      ] }),
      /* @__PURE__ */ w.jsxs(Ee, { className: "dock-action-button", onClick: x, "aria-label": "Skip timer", children: [
        /* @__PURE__ */ w.jsx(gb, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Skip" })
      ] }),
      /* @__PURE__ */ w.jsxs(Ee, { className: "dock-action-button", onClick: S, "aria-label": "Reset timer", children: [
        /* @__PURE__ */ w.jsx(db, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Reset" })
      ] }),
      /* @__PURE__ */ w.jsxs(Ee, { className: "dock-focus-mode", onClick: e, "aria-label": "Enter distraction-free Focus Mode", children: [
        /* @__PURE__ */ w.jsx(Sb, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Focus Mode" })
      ] })
    ] })
  ] });
}
function yt(e, n, { checkForDefaultPrevented: o = !0 } = {}) {
  return function(a) {
    if (e == null || e(a), o === !1 || !a || !a.defaultPrevented)
      return n == null ? void 0 : n(a);
  };
}
function Yy(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function Zb(...e) {
  return (n) => {
    let o = !1;
    const i = e.map((a) => {
      const d = Yy(a, n);
      return !o && typeof d == "function" && (o = !0), d;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const d = i[a];
          typeof d == "function" ? d() : Yy(e[a], null);
        }
      };
  };
}
function ut(...e) {
  return C.useCallback(Zb(...e), e);
}
function Qd(e, n = []) {
  let o = [];
  function i(d, f) {
    const p = C.createContext(f);
    p.displayName = d + "Context";
    const m = o.length;
    o = [...o, f];
    const y = (l) => {
      var _;
      const { scope: c, children: S, ...x } = l, k = ((_ = c == null ? void 0 : c[e]) == null ? void 0 : _[m]) || p, A = C.useMemo(() => x, Object.values(x));
      return /* @__PURE__ */ w.jsx(k.Provider, { value: A, children: S });
    };
    y.displayName = d + "Provider";
    function v(l, c, S = {}) {
      var _;
      const { optional: x = !1 } = S, k = ((_ = c == null ? void 0 : c[e]) == null ? void 0 : _[m]) || p, A = C.useContext(k);
      if (A) return A;
      if (f !== void 0) return f;
      if (!x)
        throw new Error(`\`${l}\` must be used within \`${d}\``);
    }
    return [y, v];
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
  return a.scopeName = e, [i, Jb(a, ...n)];
}
function Jb(...e) {
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
var lo = globalThis != null && globalThis.document ? C.useLayoutEffect : () => {
}, qb = ld[" useId ".trim().toString()] || (() => {
}), eP = 0;
function lc(e) {
  const [n, o] = C.useState(qb());
  return lo(() => {
    o((i) => i ?? String(eP++));
  }, [e]), e || (n ? `radix-${n}` : "");
}
var tP = ld[" useInsertionEffect ".trim().toString()] || lo;
function M0({
  prop: e,
  defaultProp: n,
  onChange: o = () => {
  },
  caller: i
}) {
  const [a, d, f] = nP({
    defaultProp: n,
    onChange: o
  }), p = e !== void 0, m = p ? e : a;
  {
    const v = C.useRef(e !== void 0);
    C.useEffect(() => {
      const l = v.current;
      l !== p && console.warn(
        `${i} is changing from ${l ? "controlled" : "uncontrolled"} to ${p ? "controlled" : "uncontrolled"}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
      ), v.current = p;
    }, [p, i]);
  }
  const y = C.useCallback(
    (v) => {
      var l;
      if (p) {
        const c = rP(v) ? v(e) : v;
        c !== e && ((l = f.current) == null || l.call(f, c));
      } else
        d(v);
    },
    [p, e, d, f]
  );
  return [m, y];
}
function nP({
  defaultProp: e,
  onChange: n
}) {
  const [o, i] = C.useState(e), a = C.useRef(o), d = C.useRef(n);
  return tP(() => {
    d.current = n;
  }, [n]), C.useEffect(() => {
    var f;
    a.current !== o && ((f = d.current) == null || f.call(d, o), a.current = o);
  }, [o, a]), [o, i, d];
}
function rP(e) {
  return typeof e == "function";
}
var R0 = Sg();
// @__NO_SIDE_EFFECTS__
function Ma(e) {
  const n = C.forwardRef((o, i) => {
    let { children: a, ...d } = o, f = null, p = !1;
    const m = [];
    Qy(a) && typeof Hs == "function" && (a = Hs(a._payload)), C.Children.forEach(a, (c) => {
      var S;
      if (lP(c)) {
        p = !0;
        const x = c;
        let k = "child" in x.props ? x.props.child : x.props.children;
        Qy(k) && typeof Hs == "function" && (k = Hs(k._payload)), f = iP(x, k), m.push((S = f == null ? void 0 : f.props) == null ? void 0 : S.children);
      } else
        m.push(c);
    }), f ? f = C.cloneElement(f, void 0, m) : (
      // A `Slottable` was found but it didn't resolve to a single element (e.g.
      // it wrapped multiple elements, text, or a render-prop `child` that
      // wasn't an element). Don't fall back to treating the `Slottable` wrapper
      // itself as the slot target — throw a descriptive error below instead.
      !p && C.Children.count(a) === 1 && C.isValidElement(a) && (f = a)
    );
    const y = f ? aP(f) : void 0, v = ut(i, y);
    if (!f) {
      if (a || a === 0)
        throw new Error(
          p ? fP(e) : dP(e)
        );
      return a;
    }
    const l = sP(d, f.props ?? {});
    return f.type !== C.Fragment && (l.ref = i ? v : y), C.cloneElement(f, l);
  });
  return n.displayName = `${e}.Slot`, n;
}
var oP = Symbol.for("radix.slottable"), iP = (e, n) => {
  if ("child" in e.props) {
    const o = e.props.child;
    return C.isValidElement(o) ? C.cloneElement(o, void 0, e.props.children(o.props.children)) : null;
  }
  return C.isValidElement(n) ? n : null;
};
function sP(e, n) {
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
function aP(e) {
  var i, a;
  let n = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = n && "isReactWarning" in n && n.isReactWarning;
  return o ? e.ref : (n = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = n && "isReactWarning" in n && n.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
function lP(e) {
  return C.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === oP;
}
var uP = Symbol.for("react.lazy");
function Qy(e) {
  return e != null && typeof e == "object" && "$$typeof" in e && e.$$typeof === uP && "_payload" in e && cP(e._payload);
}
function cP(e) {
  return typeof e == "object" && e !== null && "then" in e;
}
var dP = (e) => `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`, fP = (e) => `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`, Hs = ld[" use ".trim().toString()], pP = [
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
], vt = pP.reduce((e, n) => {
  const o = /* @__PURE__ */ Ma(`Primitive.${n}`), i = C.forwardRef((a, d) => {
    const { asChild: f, ...p } = a, m = f ? o : n;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ w.jsx(m, { ...p, ref: d });
  });
  return i.displayName = `Primitive.${n}`, { ...e, [n]: i };
}, {});
function mP(e, n) {
  e && R0.flushSync(() => e.dispatchEvent(n));
}
function vi(e) {
  const n = C.useRef(e);
  return C.useEffect(() => {
    n.current = e;
  }), C.useMemo(() => ((...o) => {
    var i;
    return (i = n.current) == null ? void 0 : i.call(n, ...o);
  }), []);
}
var hP = "DismissableLayer", td = "dismissableLayer.update", yP = "dismissableLayer.pointerDownOutside", gP = "dismissableLayer.focusOutside", Xy, Xd = C.createContext({
  layers: /* @__PURE__ */ new Set(),
  layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
  branches: /* @__PURE__ */ new Set(),
  // Outside elements that belong to a layer's own dismiss affordance (eg, a
  // dialog overlay). Pressing them should dismiss the layer regardless of
  // whether or not they stop propagation.
  //
  // See https://github.com/radix-ui/primitives/issues/3346
  dismissableSurfaces: /* @__PURE__ */ new Set()
}), N0 = C.forwardRef(
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
    } = e, v = C.useContext(Xd), [l, c] = C.useState(null), S = (l == null ? void 0 : l.ownerDocument) ?? (globalThis == null ? void 0 : globalThis.document), [, x] = C.useState({}), k = ut(n, c), A = Array.from(v.layers), [_] = [
      ...v.layersWithOutsidePointerEventsDisabled
    ].slice(-1), b = _ ? A.indexOf(_) : -1, E = l ? A.indexOf(l) : -1, D = v.layersWithOutsidePointerEventsDisabled.size > 0, O = E >= b, K = C.useRef(!1), W = _P(
      (te) => {
        d == null || d(te), p == null || p(te), te.defaultPrevented || m == null || m();
      },
      {
        ownerDocument: S,
        deferPointerDownOutside: i,
        isDeferredPointerDownOutsideRef: K,
        dismissableSurfaces: v.dismissableSurfaces,
        shouldHandlePointerDownOutside: C.useCallback(
          (te) => {
            if (!(te instanceof Node))
              return !1;
            const ce = [...v.branches].some(
              (he) => he.contains(te)
            );
            return O && !ce;
          },
          [v.branches, O]
        )
      }
    ), $ = TP((te) => {
      if (i && K.current)
        return;
      const ce = te.target;
      [...v.branches].some((pe) => pe.contains(ce)) || (f == null || f(te), p == null || p(te), te.defaultPrevented || m == null || m());
    }, S), G = l ? E === A.length - 1 : !1, Z = vi((te) => {
      te.key === "Escape" && (a == null || a(te), !te.defaultPrevented && m && (te.preventDefault(), m()));
    });
    return C.useEffect(() => {
      if (G)
        return S.addEventListener("keydown", Z, { capture: !0 }), () => S.removeEventListener("keydown", Z, { capture: !0 });
    }, [S, G, Z]), C.useEffect(() => {
      if (l)
        return o && (v.layersWithOutsidePointerEventsDisabled.size === 0 && (Xy = S.body.style.pointerEvents, S.body.style.pointerEvents = "none"), v.layersWithOutsidePointerEventsDisabled.add(l)), v.layers.add(l), Zy(), () => {
          o && (v.layersWithOutsidePointerEventsDisabled.delete(l), v.layersWithOutsidePointerEventsDisabled.size === 0 && (S.body.style.pointerEvents = Xy));
        };
    }, [l, S, o, v]), C.useEffect(() => () => {
      l && (v.layers.delete(l), v.layersWithOutsidePointerEventsDisabled.delete(l), Zy());
    }, [l, v]), C.useEffect(() => {
      const te = () => x({});
      return document.addEventListener(td, te), () => document.removeEventListener(td, te);
    }, []), /* @__PURE__ */ w.jsx(
      vt.div,
      {
        ...y,
        ref: k,
        style: {
          pointerEvents: D ? O ? "auto" : "none" : void 0,
          ...e.style
        },
        onFocusCapture: yt(e.onFocusCapture, $.onFocusCapture),
        onBlurCapture: yt(e.onBlurCapture, $.onBlurCapture),
        onPointerDownCapture: yt(
          e.onPointerDownCapture,
          W.onPointerDownCapture
        )
      }
    );
  }
);
N0.displayName = hP;
var vP = "DismissableLayerBranch", SP = C.forwardRef((e, n) => {
  const o = C.useContext(Xd), i = C.useRef(null), a = ut(n, i);
  return C.useEffect(() => {
    const d = i.current;
    if (d)
      return o.branches.add(d), () => {
        o.branches.delete(d);
      };
  }, [o.branches]), /* @__PURE__ */ w.jsx(vt.div, { ...e, ref: a });
});
SP.displayName = vP;
function wP() {
  const e = C.useContext(Xd), [n, o] = C.useState(null);
  return C.useEffect(() => {
    if (n)
      return e.dismissableSurfaces.add(n), () => {
        e.dismissableSurfaces.delete(n);
      };
  }, [n, e.dismissableSurfaces]), o;
}
var xP = () => !0;
function _P(e, n) {
  const {
    ownerDocument: o = globalThis == null ? void 0 : globalThis.document,
    deferPointerDownOutside: i = !1,
    isDeferredPointerDownOutsideRef: a,
    dismissableSurfaces: d,
    shouldHandlePointerDownOutside: f = xP
  } = n, p = vi(e), m = C.useRef(!1), y = C.useRef(!1), v = C.useRef(/* @__PURE__ */ new Map()), l = C.useRef(() => {
  });
  return C.useEffect(() => {
    function c() {
      y.current = !1, a.current = !1, v.current.clear();
    }
    function S() {
      return Array.from(v.current.values()).some(Boolean);
    }
    function x(E) {
      if (!y.current)
        return;
      const D = E.target;
      D instanceof Node && [...d].some((K) => K.contains(D)) || v.current.set(E.type, !0), E.type === "click" && window.setTimeout(() => {
        y.current && l.current();
      }, 0);
    }
    function k(E) {
      y.current && v.current.set(E.type, !1);
    }
    const A = (E) => {
      if (E.target && !m.current) {
        let D = function() {
          o.removeEventListener("click", l.current);
          const K = S();
          c(), K || D0(
            yP,
            p,
            O,
            { discrete: !0 }
          );
        };
        if (!f(E.target)) {
          o.removeEventListener("click", l.current), c(), m.current = !1;
          return;
        }
        const O = { originalEvent: E };
        y.current = !0, a.current = i && E.button === 0, v.current.clear(), !i || E.button !== 0 ? D() : (o.removeEventListener("click", l.current), l.current = D, o.addEventListener("click", l.current, { once: !0 }));
      } else
        o.removeEventListener("click", l.current), c();
      m.current = !1;
    }, _ = [
      "pointerup",
      "mousedown",
      "mouseup",
      "touchstart",
      "touchend",
      "click"
    ];
    for (const E of _)
      o.addEventListener(E, x, !0), o.addEventListener(E, k);
    const b = window.setTimeout(() => {
      o.addEventListener("pointerdown", A);
    }, 0);
    return () => {
      window.clearTimeout(b), o.removeEventListener("pointerdown", A), o.removeEventListener("click", l.current);
      for (const E of _)
        o.removeEventListener(E, x, !0), o.removeEventListener(E, k);
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
function TP(e, n = globalThis == null ? void 0 : globalThis.document) {
  const o = vi(e), i = C.useRef(!1);
  return C.useEffect(() => {
    const a = (d) => {
      d.target && !i.current && D0(gP, o, { originalEvent: d }, {
        discrete: !1
      });
    };
    return n.addEventListener("focusin", a), () => n.removeEventListener("focusin", a);
  }, [n, o]), {
    onFocusCapture: () => i.current = !0,
    onBlurCapture: () => i.current = !1
  };
}
function Zy() {
  const e = new CustomEvent(td);
  document.dispatchEvent(e);
}
function D0(e, n, o, { discrete: i }) {
  const a = o.originalEvent.target, d = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: o });
  n && a.addEventListener(e, n, { once: !0 }), i ? mP(a, d) : a.dispatchEvent(d);
}
var uc = "focusScope.autoFocusOnMount", cc = "focusScope.autoFocusOnUnmount", Jy = { bubbles: !1, cancelable: !0 }, kP = "FocusScope", j0 = C.forwardRef((e, n) => {
  const {
    loop: o = !1,
    trapped: i = !1,
    onMountAutoFocus: a,
    onUnmountAutoFocus: d,
    ...f
  } = e, [p, m] = C.useState(null), y = vi(a), v = vi(d), l = C.useRef(null), c = ut(n, m), S = C.useRef({
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
      let k = function(E) {
        if (S.paused || !p) return;
        const D = E.target;
        p.contains(D) ? l.current = D : Vn(l.current, { select: !0 });
      }, A = function(E) {
        if (S.paused || !p) return;
        const D = E.relatedTarget;
        D !== null && (p.contains(D) || Vn(l.current, { select: !0 }));
      }, _ = function(E) {
        if (document.activeElement === document.body)
          for (const O of E)
            O.removedNodes.length > 0 && Vn(p);
      };
      document.addEventListener("focusin", k), document.addEventListener("focusout", A);
      const b = new MutationObserver(_);
      return p && b.observe(p, { childList: !0, subtree: !0 }), () => {
        document.removeEventListener("focusin", k), document.removeEventListener("focusout", A), b.disconnect();
      };
    }
  }, [i, p, S.paused]), C.useEffect(() => {
    if (p) {
      eg.add(S);
      const k = document.activeElement;
      if (!p.contains(k)) {
        const _ = new CustomEvent(uc, Jy);
        p.addEventListener(uc, y), p.dispatchEvent(_), _.defaultPrevented || (AP(MP(I0(p)), { select: !0 }), document.activeElement === k && Vn(p));
      }
      return () => {
        p.removeEventListener(uc, y), setTimeout(() => {
          const _ = new CustomEvent(cc, Jy);
          p.addEventListener(cc, v), p.dispatchEvent(_), _.defaultPrevented || Vn(k ?? document.body, { select: !0 }), p.removeEventListener(cc, v), eg.remove(S);
        }, 0);
      };
    }
  }, [p, y, v, S]);
  const x = C.useCallback(
    (k) => {
      if (!o && !i || S.paused) return;
      const A = k.key === "Tab" && !k.altKey && !k.ctrlKey && !k.metaKey, _ = document.activeElement;
      if (A && _) {
        const b = k.currentTarget, [E, D] = CP(b);
        E && D ? !k.shiftKey && _ === D ? (k.preventDefault(), o && Vn(E, { select: !0 })) : k.shiftKey && _ === E && (k.preventDefault(), o && Vn(D, { select: !0 })) : _ === b && k.preventDefault();
      }
    },
    [o, i, S.paused]
  );
  return /* @__PURE__ */ w.jsx(vt.div, { tabIndex: -1, ...f, ref: c, onKeyDown: x });
});
j0.displayName = kP;
function AP(e, { select: n = !1 } = {}) {
  const o = document.activeElement;
  for (const i of e)
    if (Vn(i, { select: n }), document.activeElement !== o) return;
}
function CP(e) {
  const n = I0(e), o = qy(n, e), i = qy(n.reverse(), e);
  return [o, i];
}
function I0(e) {
  const n = [], o = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (i) => {
      const a = i.tagName === "INPUT" && i.type === "hidden";
      return i.disabled || i.hidden || a ? NodeFilter.FILTER_SKIP : i.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  for (; o.nextNode(); ) n.push(o.currentNode);
  return n;
}
function qy(e, n) {
  const o = typeof n.checkVisibility == "function" && n.checkVisibility({ checkVisibilityCSS: !0 });
  for (const i of e)
    if (!(o ? !i.checkVisibility({ checkVisibilityCSS: !0 }) : bP(i, { upTo: n })))
      return i;
}
function bP(e, { upTo: n }) {
  if (getComputedStyle(e).visibility === "hidden") return !0;
  for (; e; ) {
    if (n !== void 0 && e === n) return !1;
    if (getComputedStyle(e).display === "none") return !0;
    e = e.parentElement;
  }
  return !1;
}
function PP(e) {
  return e instanceof HTMLInputElement && "select" in e;
}
function Vn(e, { select: n = !1 } = {}) {
  if (e && e.focus) {
    const o = document.activeElement;
    e.focus({ preventScroll: !0 }), e !== o && PP(e) && n && e.select();
  }
}
var eg = EP();
function EP() {
  let e = [];
  return {
    add(n) {
      const o = e[0];
      n !== o && (o == null || o.pause()), e = tg(e, n), e.unshift(n);
    },
    remove(n) {
      var o;
      e = tg(e, n), (o = e[0]) == null || o.resume();
    }
  };
}
function tg(e, n) {
  const o = [...e], i = o.indexOf(n);
  return i !== -1 && o.splice(i, 1), o;
}
function MP(e) {
  return e.filter((n) => n.tagName !== "A");
}
var RP = "Portal", F0 = C.forwardRef((e, n) => {
  var p;
  const { container: o, ...i } = e, [a, d] = C.useState(!1);
  lo(() => d(!0), []);
  const f = o || a && ((p = globalThis == null ? void 0 : globalThis.document) == null ? void 0 : p.body);
  return f ? R0.createPortal(/* @__PURE__ */ w.jsx(vt.div, { ...i, ref: n }), f) : null;
});
F0.displayName = RP;
function NP(e, n) {
  return C.useReducer((o, i) => n[o][i] ?? o, e);
}
var Ua = (e) => {
  const { present: n, children: o } = e, i = DP(n), a = typeof o == "function" ? o({ present: i.isPresent }) : C.Children.only(o), d = jP(i.ref, IP(a));
  return typeof o == "function" || i.isPresent ? C.cloneElement(a, { ref: d }) : null;
};
Ua.displayName = "Presence";
function DP(e) {
  const [n, o] = C.useState(), i = C.useRef(null), a = C.useRef(e), d = C.useRef("none"), f = C.useRef(void 0), p = e ? "mounted" : "unmounted", [m, y] = NP(p, {
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
    m === "mounted" ? (d.current = f.current ?? ri(i.current), f.current = void 0) : d.current = "none";
  }, [m]), lo(() => {
    const v = i.current, l = a.current;
    if (l !== e) {
      const S = d.current, x = ri(v);
      e ? (f.current = x, y("MOUNT")) : x === "none" || (v == null ? void 0 : v.display) === "none" ? y("UNMOUNT") : y(l && S !== x ? "ANIMATION_OUT" : "UNMOUNT"), a.current = e;
    }
  }, [e, y]), lo(() => {
    if (n) {
      let v;
      const l = n.ownerDocument.defaultView ?? window, c = (x) => {
        const A = ri(i.current).includes(CSS.escape(x.animationName));
        if (x.target === n && A && (y("ANIMATION_END"), !a.current)) {
          const _ = n.style.animationFillMode;
          n.style.animationFillMode = "forwards", v = l.setTimeout(() => {
            n.style.animationFillMode === "forwards" && (n.style.animationFillMode = _);
          });
        }
      }, S = (x) => {
        x.target === n && (d.current = ri(i.current));
      };
      return n.addEventListener("animationstart", S), n.addEventListener("animationcancel", c), n.addEventListener("animationend", c), () => {
        l.clearTimeout(v), n.removeEventListener("animationstart", S), n.removeEventListener("animationcancel", c), n.removeEventListener("animationend", c);
      };
    } else
      y("ANIMATION_END");
  }, [n, y]), {
    isPresent: ["mounted", "unmountSuspended"].includes(m),
    ref: C.useCallback((v) => {
      if (v) {
        const l = getComputedStyle(v);
        i.current = l, f.current = ri(l);
      } else
        i.current = null;
      o(v);
    }, [])
  };
}
function ng(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function jP(...e) {
  const n = C.useRef(e);
  return n.current = e, C.useCallback((o) => {
    const i = n.current;
    let a = !1;
    const d = i.map((f) => {
      const p = ng(f, o);
      return !a && typeof p == "function" && (a = !0), p;
    });
    if (a)
      return () => {
        for (let f = 0; f < d.length; f++) {
          const p = d[f];
          typeof p == "function" ? p() : ng(i[f], null);
        }
      };
  }, []);
}
function ri(e) {
  return (e == null ? void 0 : e.animationName) || "none";
}
function IP(e) {
  var i, a;
  let n = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = n && "isReactWarning" in n && n.isReactWarning;
  return o ? e.ref : (n = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = n && "isReactWarning" in n && n.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
var Ws = 0, Jt = null;
function FP() {
  C.useEffect(() => {
    Jt || (Jt = { start: rg(), end: rg() });
    const { start: e, end: n } = Jt;
    return document.body.firstElementChild !== e && document.body.insertAdjacentElement("afterbegin", e), document.body.lastElementChild !== n && document.body.insertAdjacentElement("beforeend", n), Ws++, () => {
      Ws === 1 && (Jt == null || Jt.start.remove(), Jt == null || Jt.end.remove(), Jt = null), Ws = Math.max(0, Ws - 1);
    };
  }, []);
}
function rg() {
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
function O0(e, n) {
  var o = {};
  for (var i in e) Object.prototype.hasOwnProperty.call(e, i) && n.indexOf(i) < 0 && (o[i] = e[i]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var a = 0, i = Object.getOwnPropertySymbols(e); a < i.length; a++)
      n.indexOf(i[a]) < 0 && Object.prototype.propertyIsEnumerable.call(e, i[a]) && (o[i[a]] = e[i[a]]);
  return o;
}
function OP(e, n, o) {
  if (o || arguments.length === 2) for (var i = 0, a = n.length, d; i < a; i++)
    (d || !(i in n)) && (d || (d = Array.prototype.slice.call(n, 0, i)), d[i] = n[i]);
  return e.concat(d || Array.prototype.slice.call(n));
}
var aa = "right-scroll-bar-position", la = "width-before-scroll-bar", LP = "with-scroll-bars-hidden", VP = "--removed-body-scroll-bar-size";
function dc(e, n) {
  return typeof e == "function" ? e(n) : e && (e.current = n), e;
}
function zP(e, n) {
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
var BP = typeof window < "u" ? C.useLayoutEffect : C.useEffect, og = /* @__PURE__ */ new WeakMap();
function UP(e, n) {
  var o = zP(null, function(i) {
    return e.forEach(function(a) {
      return dc(a, i);
    });
  });
  return BP(function() {
    var i = og.get(o);
    if (i) {
      var a = new Set(i), d = new Set(e), f = o.current;
      a.forEach(function(p) {
        d.has(p) || dc(p, null);
      }), d.forEach(function(p) {
        a.has(p) || dc(p, f);
      });
    }
    og.set(o, e);
  }, [e]), o;
}
function $P(e) {
  return e;
}
function HP(e, n) {
  n === void 0 && (n = $P);
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
        var v = f;
        f = [], v.forEach(d);
      }, y = function() {
        return Promise.resolve().then(m);
      };
      y(), o = {
        push: function(v) {
          f.push(v), y();
        },
        filter: function(v) {
          return f = f.filter(v), o;
        }
      };
    }
  };
  return a;
}
function WP(e) {
  e === void 0 && (e = {});
  var n = HP(null);
  return n.options = tn({ async: !0, ssr: !1 }, e), n;
}
var L0 = function(e) {
  var n = e.sideCar, o = O0(e, ["sideCar"]);
  if (!n)
    throw new Error("Sidecar: please provide `sideCar` property to import the right car");
  var i = n.read();
  if (!i)
    throw new Error("Sidecar medium not found");
  return C.createElement(i, tn({}, o));
};
L0.isSideCarExport = !0;
function GP(e, n) {
  return e.useMedium(n), L0;
}
var V0 = WP(), fc = function() {
}, $a = C.forwardRef(function(e, n) {
  var o = C.useRef(null), i = C.useState({
    onScrollCapture: fc,
    onWheelCapture: fc,
    onTouchMoveCapture: fc
  }), a = i[0], d = i[1], f = e.forwardProps, p = e.children, m = e.className, y = e.removeScrollBar, v = e.enabled, l = e.shards, c = e.sideCar, S = e.noRelative, x = e.noIsolation, k = e.inert, A = e.allowPinchZoom, _ = e.as, b = _ === void 0 ? "div" : _, E = e.gapMode, D = O0(e, ["forwardProps", "children", "className", "removeScrollBar", "enabled", "shards", "sideCar", "noRelative", "noIsolation", "inert", "allowPinchZoom", "as", "gapMode"]), O = c, K = UP([o, n]), W = tn(tn({}, D), a);
  return C.createElement(
    C.Fragment,
    null,
    v && C.createElement(O, { sideCar: V0, removeScrollBar: y, shards: l, noRelative: S, noIsolation: x, inert: k, setCallbacks: d, allowPinchZoom: !!A, lockRef: o, gapMode: E }),
    f ? C.cloneElement(C.Children.only(p), tn(tn({}, W), { ref: K })) : C.createElement(b, tn({}, W, { className: m, ref: K }), p)
  );
});
$a.defaultProps = {
  enabled: !0,
  removeScrollBar: !0,
  inert: !1
};
$a.classNames = {
  fullWidth: la,
  zeroRight: aa
};
var KP = function() {
  if (typeof __webpack_nonce__ < "u")
    return __webpack_nonce__;
};
function YP() {
  if (!document)
    return null;
  var e = document.createElement("style");
  e.type = "text/css";
  var n = KP();
  return n && e.setAttribute("nonce", n), e;
}
function QP(e, n) {
  e.styleSheet ? e.styleSheet.cssText = n : e.appendChild(document.createTextNode(n));
}
function XP(e) {
  var n = document.head || document.getElementsByTagName("head")[0];
  n.appendChild(e);
}
var ZP = function() {
  var e = 0, n = null;
  return {
    add: function(o) {
      e == 0 && (n = YP()) && (QP(n, o), XP(n)), e++;
    },
    remove: function() {
      e--, !e && n && (n.parentNode && n.parentNode.removeChild(n), n = null);
    }
  };
}, JP = function() {
  var e = ZP();
  return function(n, o) {
    C.useEffect(function() {
      return e.add(n), function() {
        e.remove();
      };
    }, [n && o]);
  };
}, z0 = function() {
  var e = JP(), n = function(o) {
    var i = o.styles, a = o.dynamic;
    return e(i, a), null;
  };
  return n;
}, qP = {
  left: 0,
  top: 0,
  right: 0,
  gap: 0
}, pc = function(e) {
  return parseInt(e || "", 10) || 0;
}, eE = function(e) {
  var n = window.getComputedStyle(document.body), o = n[e === "padding" ? "paddingLeft" : "marginLeft"], i = n[e === "padding" ? "paddingTop" : "marginTop"], a = n[e === "padding" ? "paddingRight" : "marginRight"];
  return [pc(o), pc(i), pc(a)];
}, tE = function(e) {
  if (e === void 0 && (e = "margin"), typeof window > "u")
    return qP;
  var n = eE(e), o = document.documentElement.clientWidth, i = window.innerWidth;
  return {
    left: n[0],
    top: n[1],
    right: n[2],
    gap: Math.max(0, i - o + n[2] - n[0])
  };
}, nE = z0(), oo = "data-scroll-locked", rE = function(e, n, o, i) {
  var a = e.left, d = e.top, f = e.right, p = e.gap;
  return o === void 0 && (o = "margin"), `
  .`.concat(LP, ` {
   overflow: hidden `).concat(i, `;
   padding-right: `).concat(p, "px ").concat(i, `;
  }
  body[`).concat(oo, `] {
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
  
  .`).concat(aa, ` {
    right: `).concat(p, "px ").concat(i, `;
  }
  
  .`).concat(la, ` {
    margin-right: `).concat(p, "px ").concat(i, `;
  }
  
  .`).concat(aa, " .").concat(aa, ` {
    right: 0 `).concat(i, `;
  }
  
  .`).concat(la, " .").concat(la, ` {
    margin-right: 0 `).concat(i, `;
  }
  
  body[`).concat(oo, `] {
    `).concat(VP, ": ").concat(p, `px;
  }
`);
}, ig = function() {
  var e = parseInt(document.body.getAttribute(oo) || "0", 10);
  return isFinite(e) ? e : 0;
}, oE = function() {
  C.useEffect(function() {
    return document.body.setAttribute(oo, (ig() + 1).toString()), function() {
      var e = ig() - 1;
      e <= 0 ? document.body.removeAttribute(oo) : document.body.setAttribute(oo, e.toString());
    };
  }, []);
}, iE = function(e) {
  var n = e.noRelative, o = e.noImportant, i = e.gapMode, a = i === void 0 ? "margin" : i;
  oE();
  var d = C.useMemo(function() {
    return tE(a);
  }, [a]);
  return C.createElement(nE, { styles: rE(d, !n, a, o ? "" : "!important") });
}, nd = !1;
if (typeof window < "u")
  try {
    var Gs = Object.defineProperty({}, "passive", {
      get: function() {
        return nd = !0, !0;
      }
    });
    window.addEventListener("test", Gs, Gs), window.removeEventListener("test", Gs, Gs);
  } catch {
    nd = !1;
  }
var Xr = nd ? { passive: !1 } : !1, sE = function(e) {
  return e.tagName === "TEXTAREA";
}, B0 = function(e, n) {
  if (!(e instanceof Element))
    return !1;
  var o = window.getComputedStyle(e);
  return (
    // not-not-scrollable
    o[n] !== "hidden" && // contains scroll inside self
    !(o.overflowY === o.overflowX && !sE(e) && o[n] === "visible")
  );
}, aE = function(e) {
  return B0(e, "overflowY");
}, lE = function(e) {
  return B0(e, "overflowX");
}, sg = function(e, n) {
  var o = n.ownerDocument, i = n;
  do {
    typeof ShadowRoot < "u" && i instanceof ShadowRoot && (i = i.host);
    var a = U0(e, i);
    if (a) {
      var d = $0(e, i), f = d[1], p = d[2];
      if (f > p)
        return !0;
    }
    i = i.parentNode;
  } while (i && i !== o.body);
  return !1;
}, uE = function(e) {
  var n = e.scrollTop, o = e.scrollHeight, i = e.clientHeight;
  return [
    n,
    o,
    i
  ];
}, cE = function(e) {
  var n = e.scrollLeft, o = e.scrollWidth, i = e.clientWidth;
  return [
    n,
    o,
    i
  ];
}, U0 = function(e, n) {
  return e === "v" ? aE(n) : lE(n);
}, $0 = function(e, n) {
  return e === "v" ? uE(n) : cE(n);
}, dE = function(e, n) {
  return e === "h" && n === "rtl" ? -1 : 1;
}, fE = function(e, n, o, i, a) {
  var d = dE(e, window.getComputedStyle(n).direction), f = d * i, p = o.target, m = n.contains(p), y = !1, v = f > 0, l = 0, c = 0;
  do {
    if (!p)
      break;
    var S = $0(e, p), x = S[0], k = S[1], A = S[2], _ = k - A - d * x;
    (x || _) && U0(e, p) && (l += _, c += x);
    var b = p.parentNode;
    p = b && b.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? b.host : b;
  } while (
    // portaled content
    !m && p !== document.body || // self content
    m && (n.contains(p) || n === p)
  );
  return (v && Math.abs(l) < 1 || !v && Math.abs(c) < 1) && (y = !0), y;
}, Ks = function(e) {
  return "changedTouches" in e ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY] : [0, 0];
}, ag = function(e) {
  return [e.deltaX, e.deltaY];
}, lg = function(e) {
  return e && "current" in e ? e.current : e;
}, pE = function(e, n) {
  return e[0] === n[0] && e[1] === n[1];
}, mE = function(e) {
  return `
  .block-interactivity-`.concat(e, ` {pointer-events: none;}
  .allow-interactivity-`).concat(e, ` {pointer-events: all;}
`);
}, hE = 0, Zr = [];
function yE(e) {
  var n = C.useRef([]), o = C.useRef([0, 0]), i = C.useRef(), a = C.useState(hE++)[0], d = C.useState(z0)[0], f = C.useRef(e);
  C.useEffect(function() {
    f.current = e;
  }, [e]), C.useEffect(function() {
    if (e.inert) {
      document.body.classList.add("block-interactivity-".concat(a));
      var k = OP([e.lockRef.current], (e.shards || []).map(lg), !0).filter(Boolean);
      return k.forEach(function(A) {
        return A.classList.add("allow-interactivity-".concat(a));
      }), function() {
        document.body.classList.remove("block-interactivity-".concat(a)), k.forEach(function(A) {
          return A.classList.remove("allow-interactivity-".concat(a));
        });
      };
    }
  }, [e.inert, e.lockRef.current, e.shards]);
  var p = C.useCallback(function(k, A) {
    if ("touches" in k && k.touches.length === 2 || k.type === "wheel" && k.ctrlKey)
      return !f.current.allowPinchZoom;
    var _ = Ks(k), b = o.current, E = "deltaX" in k ? k.deltaX : b[0] - _[0], D = "deltaY" in k ? k.deltaY : b[1] - _[1], O, K = k.target, W = Math.abs(E) > Math.abs(D) ? "h" : "v";
    if ("touches" in k && W === "h" && K.type === "range")
      return !1;
    var $ = window.getSelection(), G = $ && $.anchorNode, Z = G ? G === K || G.contains(K) : !1;
    if (Z)
      return !1;
    var te = sg(W, K);
    if (!te)
      return !0;
    if (te ? O = W : (O = W === "v" ? "h" : "v", te = sg(W, K)), !te)
      return !1;
    if (!i.current && "changedTouches" in k && (E || D) && (i.current = O), !O)
      return !0;
    var ce = i.current || O;
    return fE(ce, A, k, ce === "h" ? E : D);
  }, []), m = C.useCallback(function(k) {
    var A = k;
    if (!(!Zr.length || Zr[Zr.length - 1] !== d)) {
      var _ = "deltaY" in A ? ag(A) : Ks(A), b = n.current.filter(function(O) {
        return O.name === A.type && (O.target === A.target || A.target === O.shadowParent) && pE(O.delta, _);
      })[0];
      if (b && b.should) {
        A.cancelable && A.preventDefault();
        return;
      }
      if (!b) {
        var E = (f.current.shards || []).map(lg).filter(Boolean).filter(function(O) {
          return O.contains(A.target);
        }), D = E.length > 0 ? p(A, E[0]) : !f.current.noIsolation;
        D && A.cancelable && A.preventDefault();
      }
    }
  }, []), y = C.useCallback(function(k, A, _, b) {
    var E = { name: k, delta: A, target: _, should: b, shadowParent: gE(_) };
    n.current.push(E), setTimeout(function() {
      n.current = n.current.filter(function(D) {
        return D !== E;
      });
    }, 1);
  }, []), v = C.useCallback(function(k) {
    o.current = Ks(k), i.current = void 0;
  }, []), l = C.useCallback(function(k) {
    y(k.type, ag(k), k.target, p(k, e.lockRef.current));
  }, []), c = C.useCallback(function(k) {
    y(k.type, Ks(k), k.target, p(k, e.lockRef.current));
  }, []);
  C.useEffect(function() {
    return Zr.push(d), e.setCallbacks({
      onScrollCapture: l,
      onWheelCapture: l,
      onTouchMoveCapture: c
    }), document.addEventListener("wheel", m, Xr), document.addEventListener("touchmove", m, Xr), document.addEventListener("touchstart", v, Xr), function() {
      Zr = Zr.filter(function(k) {
        return k !== d;
      }), document.removeEventListener("wheel", m, Xr), document.removeEventListener("touchmove", m, Xr), document.removeEventListener("touchstart", v, Xr);
    };
  }, []);
  var S = e.removeScrollBar, x = e.inert;
  return C.createElement(
    C.Fragment,
    null,
    x ? C.createElement(d, { styles: mE(a) }) : null,
    S ? C.createElement(iE, { noRelative: e.noRelative, gapMode: e.gapMode }) : null
  );
}
function gE(e) {
  for (var n = null; e !== null; )
    e instanceof ShadowRoot && (n = e.host, e = e.host), e = e.parentNode;
  return n;
}
const vE = GP(V0, yE);
var H0 = C.forwardRef(function(e, n) {
  return C.createElement($a, tn({}, e, { ref: n, sideCar: vE }));
});
H0.classNames = $a.classNames;
var SE = function(e) {
  if (typeof document > "u")
    return null;
  var n = Array.isArray(e) ? e[0] : e;
  return n.ownerDocument.body;
}, Jr = /* @__PURE__ */ new WeakMap(), Ys = /* @__PURE__ */ new WeakMap(), Qs = {}, mc = 0, W0 = function(e) {
  return e && (e.host || W0(e.parentNode));
}, wE = function(e, n) {
  return n.map(function(o) {
    if (e.contains(o))
      return o;
    var i = W0(o);
    return i && e.contains(i) ? i : (console.error("aria-hidden", o, "in not contained inside", e, ". Doing nothing"), null);
  }).filter(function(o) {
    return !!o;
  });
}, xE = function(e, n, o, i) {
  var a = wE(n, Array.isArray(e) ? e : [e]);
  Qs[o] || (Qs[o] = /* @__PURE__ */ new WeakMap());
  var d = Qs[o], f = [], p = /* @__PURE__ */ new Set(), m = new Set(a), y = function(l) {
    !l || p.has(l) || (p.add(l), y(l.parentNode));
  };
  a.forEach(y);
  var v = function(l) {
    !l || m.has(l) || Array.prototype.forEach.call(l.children, function(c) {
      if (p.has(c))
        v(c);
      else
        try {
          var S = c.getAttribute(i), x = S !== null && S !== "false", k = (Jr.get(c) || 0) + 1, A = (d.get(c) || 0) + 1;
          Jr.set(c, k), d.set(c, A), f.push(c), k === 1 && x && Ys.set(c, !0), A === 1 && c.setAttribute(o, "true"), x || c.setAttribute(i, "true");
        } catch (_) {
          console.error("aria-hidden: cannot operate on ", c, _);
        }
    });
  };
  return v(n), p.clear(), mc++, function() {
    f.forEach(function(l) {
      var c = Jr.get(l) - 1, S = d.get(l) - 1;
      Jr.set(l, c), d.set(l, S), c || (Ys.has(l) || l.removeAttribute(i), Ys.delete(l)), S || l.removeAttribute(o);
    }), mc--, mc || (Jr = /* @__PURE__ */ new WeakMap(), Jr = /* @__PURE__ */ new WeakMap(), Ys = /* @__PURE__ */ new WeakMap(), Qs = {});
  };
}, _E = function(e, n, o) {
  o === void 0 && (o = "data-aria-hidden");
  var i = Array.from(Array.isArray(e) ? e : [e]), a = SE(e);
  return a ? (i.push.apply(i, Array.from(a.querySelectorAll("[aria-live], script"))), xE(i, a, o, "aria-hidden")) : function() {
    return null;
  };
}, Ha = "Dialog", [G0] = Qd(Ha), [TE, Gt] = G0(Ha), K0 = (e) => {
  const {
    __scopeDialog: n,
    children: o,
    open: i,
    defaultOpen: a,
    onOpenChange: d,
    modal: f = !0
  } = e, p = C.useRef(null), m = C.useRef(null), [y, v] = M0({
    prop: i,
    defaultProp: a ?? !1,
    onChange: d,
    caller: Ha
  });
  return /* @__PURE__ */ w.jsx(
    TE,
    {
      scope: n,
      triggerRef: p,
      contentRef: m,
      contentId: lc(),
      titleId: lc(),
      descriptionId: lc(),
      open: y,
      onOpenChange: v,
      onOpenToggle: C.useCallback(() => v((l) => !l), [v]),
      modal: f,
      children: o
    }
  );
};
K0.displayName = Ha;
var Y0 = "DialogTrigger", kE = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Gt(Y0, o), d = ut(n, a.triggerRef);
    return /* @__PURE__ */ w.jsx(
      vt.button,
      {
        type: "button",
        "aria-haspopup": "dialog",
        "aria-expanded": a.open,
        "aria-controls": a.open ? a.contentId : void 0,
        "data-state": Jd(a.open),
        ...i,
        ref: d,
        onClick: yt(e.onClick, a.onOpenToggle)
      }
    );
  }
);
kE.displayName = Y0;
var Zd = "DialogPortal", [AE, Q0] = G0(Zd, {
  forceMount: void 0
}), X0 = (e) => {
  const { __scopeDialog: n, forceMount: o, children: i, container: a } = e, d = Gt(Zd, n);
  return /* @__PURE__ */ w.jsx(AE, { scope: n, forceMount: o, children: C.Children.map(i, (f) => /* @__PURE__ */ w.jsx(Ua, { present: o || d.open, children: /* @__PURE__ */ w.jsx(F0, { asChild: !0, container: a, children: f }) })) });
};
X0.displayName = Zd;
var Ra = "DialogOverlay", Z0 = C.forwardRef(
  (e, n) => {
    const o = Q0(Ra, e.__scopeDialog), { forceMount: i = o.forceMount, ...a } = e, d = Gt(Ra, e.__scopeDialog);
    return d.modal ? /* @__PURE__ */ w.jsx(Ua, { present: i || d.open, children: /* @__PURE__ */ w.jsx(bE, { ...a, ref: n }) }) : null;
  }
);
Z0.displayName = Ra;
var CE = /* @__PURE__ */ Ma("DialogOverlay.RemoveScroll"), bE = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Gt(Ra, o), d = wP(), f = ut(n, d);
    return (
      // Make sure `Content` is scrollable even when it doesn't live inside `RemoveScroll`
      // ie. when `Overlay` and `Content` are siblings
      /* @__PURE__ */ w.jsx(H0, { as: CE, allowPinchZoom: !0, shards: [a.contentRef], children: /* @__PURE__ */ w.jsx(
        vt.div,
        {
          "data-state": Jd(a.open),
          ...i,
          ref: f,
          style: { pointerEvents: "auto", ...i.style }
        }
      ) })
    );
  }
), uo = "DialogContent", J0 = C.forwardRef(
  (e, n) => {
    const o = Q0(uo, e.__scopeDialog), { forceMount: i = o.forceMount, ...a } = e, d = Gt(uo, e.__scopeDialog);
    return /* @__PURE__ */ w.jsx(Ua, { present: i || d.open, children: d.modal ? /* @__PURE__ */ w.jsx(PE, { ...a, ref: n }) : /* @__PURE__ */ w.jsx(EE, { ...a, ref: n }) });
  }
);
J0.displayName = uo;
var PE = C.forwardRef(
  (e, n) => {
    const o = Gt(uo, e.__scopeDialog), i = C.useRef(null), a = ut(n, o.contentRef, i);
    return C.useEffect(() => {
      const d = i.current;
      if (d) return _E(d);
    }, []), /* @__PURE__ */ w.jsx(
      q0,
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
), EE = C.forwardRef(
  (e, n) => {
    const o = Gt(uo, e.__scopeDialog), i = C.useRef(!1), a = C.useRef(!1);
    return /* @__PURE__ */ w.jsx(
      q0,
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
), q0 = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, trapFocus: i, onOpenAutoFocus: a, onCloseAutoFocus: d, ...f } = e, p = Gt(uo, o);
    return FP(), /* @__PURE__ */ w.jsx(w.Fragment, { children: /* @__PURE__ */ w.jsx(
      j0,
      {
        asChild: !0,
        loop: !0,
        trapped: i,
        onMountAutoFocus: a,
        onUnmountAutoFocus: d,
        children: /* @__PURE__ */ w.jsx(
          N0,
          {
            role: "dialog",
            id: p.contentId,
            "aria-describedby": p.descriptionId,
            "aria-labelledby": p.titleId,
            "data-state": Jd(p.open),
            ...f,
            ref: n,
            deferPointerDownOutside: !0,
            onDismiss: () => p.onOpenChange(!1)
          }
        )
      }
    ) });
  }
), eS = "DialogTitle", tS = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Gt(eS, o);
    return /* @__PURE__ */ w.jsx(vt.h2, { id: a.titleId, ...i, ref: n });
  }
);
tS.displayName = eS;
var nS = "DialogDescription", rS = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Gt(nS, o);
    return /* @__PURE__ */ w.jsx(vt.p, { id: a.descriptionId, ...i, ref: n });
  }
);
rS.displayName = nS;
var oS = "DialogClose", ME = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Gt(oS, o);
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
ME.displayName = oS;
function Jd(e) {
  return e ? "open" : "closed";
}
function RE() {
  const e = Y((a) => a.summaryRecord), n = Y((a) => a.closeSummary), o = Y((a) => a.startTimer), i = yn(e == null ? void 0 : e.selectedScene);
  return /* @__PURE__ */ w.jsx(K0, { open: !!e, onOpenChange: (a) => !a && n(), children: /* @__PURE__ */ w.jsx(Fa, { children: e ? /* @__PURE__ */ w.jsxs(X0, { forceMount: !0, children: [
    /* @__PURE__ */ w.jsx(Z0, { asChild: !0, children: /* @__PURE__ */ w.jsx(
      gn.div,
      {
        className: "summary-overlay",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
      }
    ) }),
    /* @__PURE__ */ w.jsx(J0, { asChild: !0, children: /* @__PURE__ */ w.jsxs(
      gn.article,
      {
        className: "summary-card liquid-glass",
        initial: { opacity: 0, y: 18, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 18, scale: 0.98 },
        children: [
          /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Session complete" }),
          /* @__PURE__ */ w.jsx(tS, { children: "Focus block complete" }),
          /* @__PURE__ */ w.jsx(rS, { className: "sr-only", children: "Summary of the completed focus block." }),
          /* @__PURE__ */ w.jsx("p", { children: "You protected a focused block in your quiet study room." }),
          /* @__PURE__ */ w.jsxs("div", { className: "summary-grid", children: [
            /* @__PURE__ */ w.jsxs("div", { className: "summary-stat liquid-glass-lite", children: [
              /* @__PURE__ */ w.jsx("span", { children: "Focus time" }),
              /* @__PURE__ */ w.jsx("strong", { children: h0(e.totalFocusTime) })
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
            /* @__PURE__ */ w.jsx(Ee, { variant: "primary", onClick: () => {
              n(), o();
            }, children: "Continue studying" }),
            /* @__PURE__ */ w.jsx(Ee, { onClick: n, children: "Done" })
          ] })
        ]
      }
    ) })
  ] }) : null }) });
}
function iS(e, [n, o]) {
  return Math.min(o, Math.max(n, e));
}
var NE = C.createContext(void 0);
function DE(e) {
  const n = C.useContext(NE);
  return e || n || "ltr";
}
function jE(e) {
  const n = C.useRef({ value: e, previous: e });
  return C.useMemo(() => (n.current.value !== e && (n.current.previous = n.current.value, n.current.value = e), n.current.previous), [e]);
}
function IE(e) {
  const [n, o] = C.useState(void 0);
  return lo(() => {
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
function FE(e) {
  const n = e + "CollectionProvider", [o, i] = Qd(n), [a, d] = o(
    n,
    { collectionRef: { current: null }, itemMap: /* @__PURE__ */ new Map() }
  ), f = (k) => {
    const { scope: A, children: _ } = k, b = C.useRef(null), E = C.useRef(/* @__PURE__ */ new Map()).current;
    return /* @__PURE__ */ w.jsx(a, { scope: A, itemMap: E, collectionRef: b, children: _ });
  };
  f.displayName = n;
  const p = e + "CollectionSlot", m = /* @__PURE__ */ Ma(p), y = C.forwardRef(
    (k, A) => {
      const { scope: _, children: b } = k, E = d(p, _), D = ut(A, E.collectionRef);
      return /* @__PURE__ */ w.jsx(m, { ref: D, children: b });
    }
  );
  y.displayName = p;
  const v = e + "CollectionItemSlot", l = "data-radix-collection-item", c = /* @__PURE__ */ Ma(v), S = C.forwardRef(
    (k, A) => {
      const { scope: _, children: b, ...E } = k, D = C.useRef(null), O = ut(A, D), K = d(v, _);
      return C.useEffect(() => (K.itemMap.set(D, { ref: D, ...E }), () => void K.itemMap.delete(D))), /* @__PURE__ */ w.jsx(c, { [l]: "", ref: O, children: b });
    }
  );
  S.displayName = v;
  function x(k) {
    const A = d(e + "CollectionConsumer", k);
    return C.useCallback(() => {
      const b = A.collectionRef.current;
      if (!b) return [];
      const E = Array.from(b.querySelectorAll(`[${l}]`));
      return Array.from(A.itemMap.values()).sort(
        (K, W) => E.indexOf(K.ref.current) - E.indexOf(W.ref.current)
      );
    }, [A.collectionRef, A.itemMap]);
  }
  return [
    { Provider: f, Slot: y, ItemSlot: S },
    x,
    i
  ];
}
var sS = ["PageUp", "PageDown"], aS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"], lS = {
  "from-left": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-right": ["Home", "PageDown", "ArrowDown", "ArrowRight"],
  "from-bottom": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-top": ["Home", "PageDown", "ArrowUp", "ArrowLeft"]
}, mo = "Slider", [rd, OE, LE] = FE(mo), [qd] = Qd(mo, [
  LE
]), [VE, Ai] = qd(mo), ef = C.forwardRef(
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
      value: v,
      onValueChange: l = () => {
      },
      onValueCommit: c = () => {
      },
      inverted: S = !1,
      form: x,
      ...k
    } = e, A = C.useRef(/* @__PURE__ */ new Set()), _ = C.useRef(0), b = C.useRef(!1), D = f === "horizontal" ? zE : BE, [O, K] = C.useState(null), W = ut(n, K), [$ = [], G] = M0({
      prop: v,
      defaultProp: y,
      onChange: (Q) => {
        var B;
        (B = [...A.current][_.current]) == null || B.focus({
          preventScroll: !0,
          focusVisible: b.current
        }), b.current = !1, l(Q);
      }
    }), Z = C.useRef($), te = C.useRef($);
    C.useEffect(() => {
      const Q = x ? O == null ? void 0 : O.ownerDocument.getElementById(x) : O == null ? void 0 : O.closest("form");
      if (Q instanceof HTMLFormElement) {
        const me = () => G(te.current);
        return Q.addEventListener("reset", me), () => Q.removeEventListener("reset", me);
      }
    }, [O, x, G]);
    function ce(Q) {
      const me = WE($, Q);
      we(Q, me);
    }
    function he(Q) {
      we(Q, _.current);
    }
    function pe() {
      const Q = Z.current[_.current];
      $[_.current] !== Q && c($);
    }
    function we(Q, me, { commit: B } = { commit: !1 }) {
      const ee = xS(d), X = ca(Math.round((Q - i) / d) * d + i, ee), N = iS(X, [i, a]);
      G((L = []) => {
        const le = $E(L, N, me);
        if (YE(le, m * d)) {
          _.current = le.indexOf(N);
          const de = String(le) !== String(L);
          return de && B && c(le), de ? le : L;
        } else
          return L;
      });
    }
    return /* @__PURE__ */ w.jsx(
      VE,
      {
        scope: e.__scopeSlider,
        name: o,
        disabled: p,
        min: i,
        max: a,
        valueIndexToChangeRef: _,
        thumbs: A.current,
        values: $,
        orientation: f,
        form: x,
        children: /* @__PURE__ */ w.jsx(rd.Provider, { scope: e.__scopeSlider, children: /* @__PURE__ */ w.jsx(rd.Slot, { scope: e.__scopeSlider, children: /* @__PURE__ */ w.jsx(
          D,
          {
            "aria-disabled": p,
            "data-disabled": p ? "" : void 0,
            ...k,
            ref: W,
            onPointerDown: yt(k.onPointerDown, () => {
              p || (Z.current = $, b.current = !1);
            }),
            min: i,
            max: a,
            inverted: S,
            onSlideStart: p ? void 0 : ce,
            onSlideMove: p ? void 0 : he,
            onSlideEnd: p ? void 0 : pe,
            onHomeKeyDown: () => {
              p || (b.current = !0, we(i, 0, { commit: !0 }));
            },
            onEndKeyDown: () => {
              p || (b.current = !0, we(a, $.length - 1, { commit: !0 }));
            },
            onStepKeyDown: ({ event: Q, direction: me }) => {
              if (!p) {
                b.current = !0;
                const X = sS.includes(Q.key) || Q.shiftKey && aS.includes(Q.key) ? 10 : 1, N = _.current, L = $[N], le = QE(L, {
                  min: i,
                  step: d,
                  direction: me,
                  multiplier: X
                });
                we(le, N, { commit: !0 });
              }
            }
          }
        ) }) })
      }
    );
  }
);
ef.displayName = mo;
var [uS, cS] = qd(mo, {
  startEdge: "left",
  endEdge: "right",
  size: "width",
  direction: 1
}), zE = C.forwardRef(
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
      ...v
    } = e, [l, c] = C.useState(null), S = ut(n, c), x = C.useRef(void 0), k = DE(a), A = k === "ltr", _ = A && !d || !A && d;
    function b(E) {
      const D = x.current || l.getBoundingClientRect(), O = [0, D.width], W = of(O, _ ? [o, i] : [i, o]);
      return x.current = D, W(E - D.left);
    }
    return /* @__PURE__ */ w.jsx(
      uS,
      {
        scope: e.__scopeSlider,
        startEdge: _ ? "left" : "right",
        endEdge: _ ? "right" : "left",
        direction: _ ? 1 : -1,
        size: "width",
        children: /* @__PURE__ */ w.jsx(
          dS,
          {
            dir: k,
            "data-orientation": "horizontal",
            ...v,
            ref: S,
            style: {
              ...v.style,
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
              const O = lS[_ ? "from-left" : "from-right"].includes(E.key);
              y == null || y({ event: E, direction: O ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), BE = C.forwardRef(
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
    } = e, v = C.useRef(null), l = ut(n, v), c = C.useRef(void 0), S = !a;
    function x(k) {
      const A = c.current || v.current.getBoundingClientRect(), _ = [0, A.height], E = of(_, S ? [i, o] : [o, i]);
      return c.current = A, E(k - A.top);
    }
    return /* @__PURE__ */ w.jsx(
      uS,
      {
        scope: e.__scopeSlider,
        startEdge: S ? "bottom" : "top",
        endEdge: S ? "top" : "bottom",
        size: "height",
        direction: S ? 1 : -1,
        children: /* @__PURE__ */ w.jsx(
          dS,
          {
            "data-orientation": "vertical",
            ...y,
            ref: l,
            style: {
              ...y.style,
              "--radix-slider-thumb-transform": "translateY(50%)"
            },
            onSlideStart: (k) => {
              const A = x(k.clientY);
              d == null || d(A);
            },
            onSlideMove: (k) => {
              const A = x(k.clientY);
              f == null || f(A);
            },
            onSlideEnd: () => {
              c.current = void 0, p == null || p();
            },
            onStepKeyDown: (k) => {
              const _ = lS[S ? "from-bottom" : "from-top"].includes(k.key);
              m == null || m({ event: k, direction: _ ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), dS = C.forwardRef(
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
    } = e, v = Ai(mo, o);
    return /* @__PURE__ */ w.jsx(
      vt.span,
      {
        ...y,
        ref: n,
        onKeyDown: yt(e.onKeyDown, (l) => {
          l.key === "Home" ? (f(l), l.preventDefault()) : l.key === "End" ? (p(l), l.preventDefault()) : sS.concat(aS).includes(l.key) && (m(l), l.preventDefault());
        }),
        onPointerDown: yt(e.onPointerDown, (l) => {
          const c = l.target;
          c.setPointerCapture(l.pointerId), l.preventDefault(), v.thumbs.has(c) ? c.focus({ preventScroll: !0, focusVisible: !1 }) : i(l);
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
), fS = "SliderTrack", tf = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Ai(fS, o);
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
tf.displayName = fS;
var od = "SliderRange", nf = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Ai(od, o), d = cS(od, o), f = C.useRef(null), p = ut(n, f), m = a.values.length, y = a.values.map(
      (c) => wS(c, a.min, a.max)
    ), v = m > 1 ? Math.min(...y) : 0, l = 100 - Math.max(...y);
    return /* @__PURE__ */ w.jsx(
      vt.span,
      {
        "data-orientation": a.orientation,
        "data-disabled": a.disabled ? "" : void 0,
        ...i,
        ref: p,
        style: {
          ...e.style,
          [d.startEdge]: v + "%",
          [d.endEdge]: l + "%"
        }
      }
    );
  }
);
nf.displayName = od;
var pS = "SliderThumb", [UE, mS] = qd(pS), hS = "SliderThumbProvider";
function yS(e) {
  const {
    __scopeSlider: n,
    name: o,
    children: i,
    // @ts-expect-error internal render prop
    internal_do_not_use_render: a
  } = e, d = Ai(hS, n), f = OE(n), [p, m] = C.useState(null), y = C.useMemo(
    () => p ? f().findIndex((A) => A.ref.current === p) : -1,
    [f, p]
  ), v = IE(p), l = p ? !!d.form || !!p.closest("form") : !0, c = d.values[y], S = o ?? (d.name ? d.name + (d.values.length > 1 ? "[]" : "") : void 0), x = c === void 0 ? 0 : wS(c, d.min, d.max);
  C.useEffect(() => {
    if (p)
      return d.thumbs.add(p), () => {
        d.thumbs.delete(p);
      };
  }, [p, d.thumbs]);
  const k = {
    value: c,
    name: S,
    form: d.form,
    isFormControl: l,
    index: y,
    thumb: p,
    onThumbChange: m,
    percent: x,
    size: v
  };
  return /* @__PURE__ */ w.jsx(UE, { scope: n, ...k, children: XE(a) ? a(k) : i });
}
yS.displayName = hS;
var ua = "SliderThumbTrigger", gS = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Ai(ua, o), d = cS(ua, o), { index: f, value: p, percent: m, size: y, onThumbChange: v } = mS(
      ua,
      o
    ), l = ut(n, v), c = HE(f, a.values.length), S = y == null ? void 0 : y[d.size], x = S ? GE(S, m, d.direction) : 0;
    return /* @__PURE__ */ w.jsx(
      "span",
      {
        style: {
          transform: "var(--radix-slider-thumb-transform)",
          position: "absolute",
          [d.startEdge]: `calc(${m}% + ${x}px)`
        },
        children: /* @__PURE__ */ w.jsx(rd.ItemSlot, { scope: o, children: /* @__PURE__ */ w.jsx(
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
gS.displayName = ua;
var rf = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, name: i, ...a } = e;
    return /* @__PURE__ */ w.jsx(
      yS,
      {
        __scopeSlider: o,
        name: i,
        internal_do_not_use_render: ({ index: d, isFormControl: f }) => /* @__PURE__ */ w.jsxs(w.Fragment, { children: [
          /* @__PURE__ */ w.jsx(
            gS,
            {
              ...a,
              ref: n,
              __scopeSlider: o
            }
          ),
          f ? /* @__PURE__ */ w.jsx(
            SS,
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
rf.displayName = pS;
var vS = "SliderBubbleInput", SS = C.forwardRef(
  ({ __scopeSlider: e, ...n }, o) => {
    const { value: i, name: a, form: d } = mS(vS, e), f = C.useRef(null), p = ut(f, o), m = jE(i);
    return C.useEffect(() => {
      const y = f.current;
      if (!y) return;
      const v = window.HTMLInputElement.prototype, c = Object.getOwnPropertyDescriptor(v, "value").set;
      if (m !== i && c) {
        const S = new Event("input", { bubbles: !0 });
        c.call(y, i), y.dispatchEvent(S);
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
SS.displayName = vS;
function $E(e = [], n, o) {
  const i = [...e];
  return i[o] = n, i.sort((a, d) => a - d);
}
function wS(e, n, o) {
  const d = 100 / (o - n) * (e - n);
  return iS(d, [0, 100]);
}
function HE(e, n) {
  return n > 2 ? `Value ${e + 1} of ${n}` : n === 2 ? ["Minimum", "Maximum"][e] : void 0;
}
function WE(e, n) {
  if (e.length === 1) return 0;
  const o = e.map((a) => Math.abs(a - n)), i = Math.min(...o);
  return o.indexOf(i);
}
function GE(e, n, o) {
  const i = e / 2, d = of([0, 50], [0, i]);
  return (i - d(n) * o) * o;
}
function KE(e) {
  return e.slice(0, -1).map((n, o) => e[o + 1] - n);
}
function YE(e, n) {
  if (n > 0) {
    const o = KE(e);
    return Math.min(...o) >= n;
  }
  return !0;
}
function of(e, n) {
  return (o) => {
    if (e[0] === e[1] || n[0] === n[1]) return n[0];
    const i = (n[1] - n[0]) / (e[1] - e[0]);
    return n[0] + i * (o - e[0]);
  };
}
function xS(e) {
  if (!Number.isFinite(e)) return 0;
  const n = e.toString();
  if (n.includes("e")) {
    const [i, a] = n.split("e"), d = i.split(".")[1] || "", f = Number(a);
    return Math.max(0, d.length - f);
  }
  const o = n.split(".")[1];
  return o ? o.length : 0;
}
function ca(e, n) {
  const o = Math.pow(10, n);
  return Math.round(e * o) / o;
}
function QE(e, {
  min: n,
  step: o,
  direction: i,
  multiplier: a
}) {
  const d = xS(o), f = (e - n) / o, p = Math.round(f), m = ca(p * o + n, d) === ca(e, d);
  let y;
  return m ? y = p + a * i : i > 0 ? y = Math.ceil(f) : y = Math.floor(f), ca(y * o + n, d);
}
function XE(e) {
  return typeof e == "function";
}
function ug({ label: e, icon: n, value: o, onChange: i }) {
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
      ef,
      {
        className: "radix-slider-root",
        value: [o],
        min: 0,
        max: 100,
        step: 1,
        onValueChange: (a) => i(a[0]),
        children: [
          /* @__PURE__ */ w.jsx(tf, { className: "radix-slider-track", children: /* @__PURE__ */ w.jsx(nf, { className: "radix-slider-range" }) }),
          /* @__PURE__ */ w.jsx(rf, { className: "radix-slider-thumb", "aria-label": e })
        ]
      }
    )
  ] });
}
function ZE({ audioState: e }) {
  const n = Y((c) => c.musicType), o = Y((c) => c.ambientSound), i = Y((c) => c.musicVolume), a = Y((c) => c.ambientVolume), d = Y((c) => c.audioPlaying), f = Y((c) => c.setSound), p = Y((c) => c.applyAudioPreset), m = Y((c) => c.toggleAudio), y = La({ musicType: n, ambientSound: o }), v = rC({ musicType: n, ambientSound: o }), l = y.ambientLayers.map((c) => c.title).filter(Boolean).join(" + ");
  return /* @__PURE__ */ w.jsxs("div", { className: "sound-panel", children: [
    /* @__PURE__ */ w.jsx("div", { className: "sound-preset-list", "aria-label": "Focus audio presets", children: ci.map((c) => /* @__PURE__ */ w.jsxs(
      "button",
      {
        type: "button",
        className: (v == null ? void 0 : v.id) === c.id ? "is-active" : "",
        "aria-pressed": (v == null ? void 0 : v.id) === c.id,
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
      /* @__PURE__ */ w.jsx("select", { value: n, onChange: (c) => f("musicType", c.target.value), children: Hn.map((c) => /* @__PURE__ */ w.jsx("option", { value: c.label, children: c.label }, c.label)) })
    ] }),
    /* @__PURE__ */ w.jsx(
      ug,
      {
        label: "Music volume",
        icon: /* @__PURE__ */ w.jsx(Ba, { size: 16, "aria-hidden": "true" }),
        value: i,
        onChange: (c) => f("musicVolume", c)
      }
    ),
    /* @__PURE__ */ w.jsxs("label", { className: "focus-field", children: [
      "Ambient sound selector",
      /* @__PURE__ */ w.jsx("select", { value: o, onChange: (c) => f("ambientSound", c.target.value), children: Wn.map((c) => /* @__PURE__ */ w.jsx("option", { value: c.label, children: c.label }, c.label)) })
    ] }),
    /* @__PURE__ */ w.jsx(
      ug,
      {
        label: "Ambient volume",
        icon: /* @__PURE__ */ w.jsx(Hd, { size: 16, "aria-hidden": "true" }),
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
      /* @__PURE__ */ w.jsx(Ee, { variant: d ? "primary" : "ghost", onClick: m, children: d ? "Pause audio" : "Play audio" })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "audio-links", children: [y.musicTrack, ...y.ambientLayers].filter((c) => c == null ? void 0 : c.pageUrl).map((c) => /* @__PURE__ */ w.jsx("a", { href: c.pageUrl, target: "_blank", rel: "noreferrer", children: c.title || c.label || "Audio source" }, c.pageUrl)) })
  ] });
}
const JE = [
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
], qE = [
  ["white-noise", "White noise"],
  ["pink-noise", "Pink noise"],
  ["brown-noise", "Brown noise"]
], eM = [
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
function Xs({ id: e, label: n, value: o, icon: i = null, onChange: a, card: d = !1 }) {
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
      ef,
      {
        className: "radix-slider-root",
        value: [f],
        min: 0,
        max: 100,
        step: 1,
        onValueChange: (m) => a(e, m[0]),
        children: [
          /* @__PURE__ */ w.jsx(tf, { className: "radix-slider-track", children: /* @__PURE__ */ w.jsx(nf, { className: "radix-slider-range" }) }),
          /* @__PURE__ */ w.jsx(rf, { className: "radix-slider-thumb", "aria-label": `${n} volume` })
        ]
      }
    )
  ] });
}
function tM({ audioState: e, scene: n, onClose: o }) {
  const i = Y((_) => _.audioChannels), a = Y((_) => _.setSound), d = Y((_) => _.returnToSetup), f = Y((_) => _.musicType), p = Y((_) => _.ambientSound), m = Y((_) => _.musicVolume), y = Y((_) => _.ambientVolume), [v, l] = C.useState(!1), c = (_, b) => {
    l(!1), a(`audioChannel:${_}`, b);
  }, S = (_, b) => a("musicVolume", b), x = (_, b) => a("ambientVolume", b), k = () => {
    const _ = Hn[Math.floor(Math.random() * Hn.length)], b = Wn[Math.floor(Math.random() * Wn.length)];
    a("musicType", _.label), a("ambientSound", b.label), l(!1);
  }, A = () => {
    a("musicType", (n == null ? void 0 : n.musicType) || "Deep Focus"), a("ambientSound", (n == null ? void 0 : n.ambientSound) || "Nature"), l(!0);
  };
  return /* @__PURE__ */ w.jsxs(
    gn.aside,
    {
      className: "focus-utility-panel room-control-panel liquid-glass",
      initial: { opacity: 0, y: 18 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 14 },
      transition: _a,
      role: "dialog",
      "aria-label": "Room settings",
      children: [
        /* @__PURE__ */ w.jsxs("header", { className: "room-control-head", children: [
          /* @__PURE__ */ w.jsxs("div", { children: [
            /* @__PURE__ */ w.jsx("span", { className: "control-eyebrow", children: "Control" }),
            /* @__PURE__ */ w.jsx("h2", { children: "Room settings" })
          ] }),
          /* @__PURE__ */ w.jsx(Ee, { className: "room-control-close", "aria-label": "Close room settings", onClick: o, children: /* @__PURE__ */ w.jsx(A0, { size: 16, "aria-hidden": "true" }) })
        ] }),
        /* @__PURE__ */ w.jsx("div", { className: "room-control-divider", "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("div", { className: "room-control-setup-actions", children: /* @__PURE__ */ w.jsx(
          Ee,
          {
            className: "room-control-setup-btn",
            onClick: () => {
              o == null || o(), d();
            },
            "data-focus-return-setup": "true",
            children: "Change scene & setup"
          }
        ) }),
        /* @__PURE__ */ w.jsx("section", { className: "room-control-topics", "aria-label": "Focus topics", children: /* @__PURE__ */ w.jsx(P0, {}) }),
        /* @__PURE__ */ w.jsxs("div", { className: "room-control-grid", children: [
          /* @__PURE__ */ w.jsxs("section", { className: "room-control-col room-control-scenes", "aria-label": "Scenes", children: [
            /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Scenes" }),
            /* @__PURE__ */ w.jsx(Gd, {})
          ] }),
          /* @__PURE__ */ w.jsxs("section", { className: "room-control-col room-control-audio", children: [
            /* @__PURE__ */ w.jsxs("div", { className: "room-control-masters", children: [
              /* @__PURE__ */ w.jsxs("div", { className: "room-control-block", children: [
                /* @__PURE__ */ w.jsxs("div", { className: "room-control-block-head", children: [
                  /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Music" }),
                  /* @__PURE__ */ w.jsx(Ee, { className: "room-control-icon-btn", "aria-label": "Shuffle to a random track", onClick: k, children: /* @__PURE__ */ w.jsx(hb, { size: 15, "aria-hidden": "true" }) })
                ] }),
                /* @__PURE__ */ w.jsxs("label", { className: "room-select-field", children: [
                  /* @__PURE__ */ w.jsx("span", { className: "sr-only", children: "Music track" }),
                  /* @__PURE__ */ w.jsx("select", { value: f, onChange: (_) => {
                    l(!1), a("musicType", _.target.value);
                  }, children: Hn.map((_) => /* @__PURE__ */ w.jsx("option", { value: _.label, children: _.label }, _.label)) })
                ] }),
                /* @__PURE__ */ w.jsx(Xs, { id: "music-volume", label: "Music volume", icon: /* @__PURE__ */ w.jsx(Ba, { size: 15, "aria-hidden": "true" }), value: m, onChange: S })
              ] }),
              /* @__PURE__ */ w.jsxs("div", { className: "room-control-block", children: [
                /* @__PURE__ */ w.jsxs("div", { className: "room-control-block-head", children: [
                  /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Scene sound" }),
                  /* @__PURE__ */ w.jsx(Ee, { className: "room-control-icon-btn", "aria-label": v ? "Mix saved" : "Save current mix", onClick: () => l(!0), children: v ? /* @__PURE__ */ w.jsx(za, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(T0, { size: 15, "aria-hidden": "true" }) })
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
                  /* @__PURE__ */ w.jsx("select", { value: p, onChange: (_) => {
                    l(!1), a("ambientSound", _.target.value);
                  }, children: Wn.map((_) => /* @__PURE__ */ w.jsx("option", { value: _.label, children: _.label }, _.label)) })
                ] }),
                /* @__PURE__ */ w.jsx(Xs, { id: "ambient-volume", label: "Ambient volume", icon: /* @__PURE__ */ w.jsx(Hd, { size: 15, "aria-hidden": "true" }), value: y, onChange: x })
              ] })
            ] }),
            /* @__PURE__ */ w.jsxs("div", { className: "room-control-block", children: [
              /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Focus noise" }),
              /* @__PURE__ */ w.jsx("div", { className: "room-noise-row", children: qE.map(([_, b]) => /* @__PURE__ */ w.jsx(Xs, { id: _, label: b, value: i == null ? void 0 : i[_], onChange: c, card: !0 }, _)) })
            ] }),
            /* @__PURE__ */ w.jsxs("div", { className: "room-control-block", children: [
              /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Ambient atmosphere" }),
              /* @__PURE__ */ w.jsx("div", { className: "room-ambient-grid", children: eM.map(([_, b]) => /* @__PURE__ */ w.jsx(Xs, { id: _, label: b, value: i == null ? void 0 : i[_], onChange: c, card: !0 }, _)) })
            ] }),
            e != null && e.error ? /* @__PURE__ */ w.jsx("p", { className: "audio-error", children: e.error }) : null
          ] })
        ] })
      ]
    }
  );
}
function Zs({ title: e, kicker: n, icon: o, children: i, onClose: a, className: d = "" }) {
  return /* @__PURE__ */ w.jsxs(gn.aside, { className: `focus-utility-panel liquid-glass ${d}`.trim(), initial: { opacity: 0, y: 12, x: -18 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: 10, x: -18 }, transition: _a, role: "dialog", "aria-label": e, children: [
    /* @__PURE__ */ w.jsxs("div", { className: "drawer-head", children: [
      /* @__PURE__ */ w.jsxs("div", { className: "utility-title", children: [
        /* @__PURE__ */ w.jsx("span", { className: "utility-title-icon", children: o }),
        /* @__PURE__ */ w.jsxs("div", { children: [
          /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: n }),
          /* @__PURE__ */ w.jsx("h2", { children: e })
        ] })
      ] }),
      /* @__PURE__ */ w.jsx(Ee, { "aria-label": `Close ${e}`, onClick: a, children: /* @__PURE__ */ w.jsx(A0, { size: 16, "aria-hidden": "true" }) })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "utility-panel-body", children: i })
  ] });
}
function nM({ audioState: e, scene: n }) {
  const o = Y((y) => y.audioChannels), i = Y((y) => y.setSound), [a, d] = C.useState(!1), f = (y, v) => {
    d(!1), i(`audioChannel:${y}`, v);
  }, p = () => {
    const y = Hn[Math.floor(Math.random() * Hn.length)], v = Wn[Math.floor(Math.random() * Wn.length)];
    i("musicType", y.label), i("ambientSound", v.label), d(!0);
  }, m = () => {
    i("musicType", (n == null ? void 0 : n.musicType) || "Deep Focus"), i("ambientSound", (n == null ? void 0 : n.ambientSound) || "Nature"), d(!0);
  };
  return /* @__PURE__ */ w.jsxs("div", { className: "sound-mixer", children: [
    /* @__PURE__ */ w.jsxs("div", { className: "mixer-featured-row", children: [
      /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Music library" }),
      /* @__PURE__ */ w.jsxs(Ee, { onClick: p, children: [
        /* @__PURE__ */ w.jsx(WC, { size: 14, "aria-hidden": "true" }),
        " Random track"
      ] })
    ] }),
    /* @__PURE__ */ w.jsx(ZE, { audioState: e, compact: !0 }),
    /* @__PURE__ */ w.jsxs("div", { className: "mixer-preset-row", children: [
      /* @__PURE__ */ w.jsxs("button", { type: "button", className: "mixer-preset-button", onClick: m, children: [
        "Apply scene mix ",
        /* @__PURE__ */ w.jsx("span", { children: "↗" })
      ] }),
      /* @__PURE__ */ w.jsxs(Ee, { onClick: () => d(!0), children: [
        a ? /* @__PURE__ */ w.jsx(za, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(T0, { size: 14, "aria-hidden": "true" }),
        " ",
        a ? "Saved" : "Save current mix"
      ] })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "mixer-channel-grid", children: JE.map(([y, v]) => /* @__PURE__ */ w.jsxs("label", { className: "mixer-channel", children: [
      /* @__PURE__ */ w.jsxs("span", { children: [
        /* @__PURE__ */ w.jsx("i", { className: `mixer-channel-dot mixer-${y}` }),
        v
      ] }),
      /* @__PURE__ */ w.jsxs("strong", { children: [
        o[y],
        "%"
      ] }),
      /* @__PURE__ */ w.jsx("input", { type: "range", min: "0", max: "100", value: o[y], "aria-label": `${v} volume`, onChange: (l) => f(y, l.target.value) })
    ] }, y)) }),
    e != null && e.error ? /* @__PURE__ */ w.jsx("p", { className: "audio-error", children: e.error }) : null
  ] });
}
function rM() {
  const e = () => {
    var i, a, d;
    return ((d = (a = (i = globalThis.window) == null ? void 0 : i.SynapseAuth) == null ? void 0 : a.getStoredSession) == null ? void 0 : d.call(a)) || null;
  }, [n, o] = C.useState(e);
  return C.useEffect(() => {
    var f, p, m, y;
    let i = !0;
    const a = (v) => {
      var l;
      i && o(((l = v == null ? void 0 : v.detail) == null ? void 0 : l.session) || e());
    };
    (f = globalThis.window) == null || f.addEventListener("synapse-auth-changed", a);
    const d = (y = (m = (p = globalThis.window) == null ? void 0 : p.SynapseAuth) == null ? void 0 : m.syncSessionFromProvider) == null ? void 0 : y.call(m);
    return Promise.resolve(d).finally(() => a()), () => {
      var v;
      i = !1, (v = globalThis.window) == null || v.removeEventListener("synapse-auth-changed", a);
    };
  }, []), n;
}
function oM({ onWorkspace: e, session: n }) {
  return !!n ? /* @__PURE__ */ w.jsxs("div", { className: "utility-empty-state", children: [
    /* @__PURE__ */ w.jsx(Ca, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Your Focus Trail" }),
    /* @__PURE__ */ w.jsx("p", { children: "Recent sessions and progress remain available through Synapse history." }),
    /* @__PURE__ */ w.jsx(Ee, { variant: "primary", onClick: () => e == null ? void 0 : e("", "history"), children: "Open session history" })
  ] }) : /* @__PURE__ */ w.jsxs("div", { className: "utility-login-state", children: [
    /* @__PURE__ */ w.jsx(Ca, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Your rhythm, remembered" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Sign in to view your Focus Trail" }),
    /* @__PURE__ */ w.jsx("p", { children: "Track deep-work time, completed goals, and your study streak across devices." }),
    /* @__PURE__ */ w.jsx(Ee, { variant: "primary", onClick: () => e == null ? void 0 : e(), children: "Sign in with Synapse" }),
    /* @__PURE__ */ w.jsx("small", { children: "Your current session continues without an account." })
  ] });
}
function iM({ onWorkspace: e, session: n }) {
  return !!n ? /* @__PURE__ */ w.jsxs("div", { className: "utility-empty-state", children: [
    /* @__PURE__ */ w.jsx(ba, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Companion Room" }),
    /* @__PURE__ */ w.jsx("p", { children: "Invite a study partner from your Synapse workspace to share this quiet room." }),
    /* @__PURE__ */ w.jsx(Ee, { variant: "primary", onClick: () => e == null ? void 0 : e("", "companion"), children: "Open Companion Room" })
  ] }) : /* @__PURE__ */ w.jsxs("div", { className: "utility-login-state", children: [
    /* @__PURE__ */ w.jsx(ba, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Study alongside someone" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Sign in to use Companion Room" }),
    /* @__PURE__ */ w.jsx("p", { children: "Keep your own goal private while sharing the feeling of showing up together." }),
    /* @__PURE__ */ w.jsx(Ee, { variant: "primary", onClick: () => e == null ? void 0 : e(), children: "Go to sign in" }),
    /* @__PURE__ */ w.jsx("small", { children: "No companion data is created in Focus Room." })
  ] });
}
function sM({ audioState: e, utilityPanel: n, onClose: o, onWorkspace: i }) {
  const a = Y((y) => y.activeDrawer), d = Y((y) => y.closeDrawer), f = Y((y) => y.selectedScene), p = rM(), m = C.useMemo(() => Yn.find((y) => y.id === f) || Yn[0], [f]);
  return /* @__PURE__ */ w.jsxs(Fa, { children: [
    n === "trail" ? /* @__PURE__ */ w.jsx(Zs, { title: "Focus Trail", kicker: "Your progress", icon: /* @__PURE__ */ w.jsx(Ca, { size: 16 }), onClose: o, children: /* @__PURE__ */ w.jsx(oM, { onWorkspace: i, session: p }) }) : null,
    n === "companion" ? /* @__PURE__ */ w.jsx(Zs, { title: "Companion Room", kicker: "Shared focus", icon: /* @__PURE__ */ w.jsx(ba, { size: 16 }), onClose: o, children: /* @__PURE__ */ w.jsx(iM, { onWorkspace: i, session: p }) }) : null,
    n === "settings" ? /* @__PURE__ */ w.jsx(tM, { audioState: e, scene: m, onClose: o }) : null,
    !n && a === "scene" ? /* @__PURE__ */ w.jsx(Zs, { title: "Choose scene", kicker: "Scene", icon: /* @__PURE__ */ w.jsx(k0, { size: 16 }), onClose: d, children: /* @__PURE__ */ w.jsx(Gd, {}) }) : null,
    !n && a === "music" ? /* @__PURE__ */ w.jsx(Zs, { title: "Sound atmosphere", kicker: "Room audio", icon: /* @__PURE__ */ w.jsx(Ba, { size: 16 }), onClose: d, children: /* @__PURE__ */ w.jsx(nM, { audioState: e, scene: m }) }) : null
  ] });
}
function aM(e, n) {
  return n ? Math.min(100, Math.max(0, e / n * 100)) : 0;
}
function lM({ onExit: e }) {
  const n = Y((y) => y.elapsedSeconds), o = Y((y) => y.pomodoroDuration), i = Y((y) => y.pomodoroDurationSeconds), a = Y((y) => y.timerMode), d = Y((y) => y.timerStatus), f = Y((y) => y.currentSession), p = Number(i) || (Number(o) || 0) * 60, m = a === "countup" ? n : Math.max(0, p - n);
  return /* @__PURE__ */ w.jsxs("div", { className: "compact-focus-mode-card", "aria-label": "Distraction-free focus timer", children: [
    /* @__PURE__ */ w.jsxs("div", { className: "compact-focus-card-top", children: [
      /* @__PURE__ */ w.jsxs("span", { children: [
        "POMODORO #",
        (f == null ? void 0 : f.pomodoroNumber) || 1
      ] }),
      /* @__PURE__ */ w.jsx(Ee, { className: "compact-exit-button", onClick: e, "aria-label": "Exit Focus Mode", children: /* @__PURE__ */ w.jsx(JC, { size: 14, "aria-hidden": "true" }) })
    ] }),
    /* @__PURE__ */ w.jsxs("span", { className: "compact-focus-status", children: [
      /* @__PURE__ */ w.jsx("i", {}),
      d === "paused" ? "Paused" : "In focus"
    ] }),
    /* @__PURE__ */ w.jsx("strong", { children: Qc(m) }),
    /* @__PURE__ */ w.jsx("div", { className: "compact-focus-progress", children: /* @__PURE__ */ w.jsx("span", { style: { width: `${aM(n, p)}%` } }) }),
    /* @__PURE__ */ w.jsxs("small", { children: [
      Yd(p),
      " session"
    ] }),
    /* @__PURE__ */ w.jsx("span", { className: "sr-only", children: "Press Escape to exit Focus Mode." })
  ] });
}
var hc = {};
/*!
 *  howler.js v2.2.4
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */
var cg;
function uM() {
  return cg || (cg = 1, (function(e) {
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
          if (l = parseFloat(l), c.ctx || v(), typeof l < "u" && l >= 0 && l <= 1) {
            if (c._volume = l, c._muted)
              return c;
            c.usingWebAudio && c.masterGain.gain.setValueAtTime(l, o.ctx.currentTime);
            for (var S = 0; S < c._howls.length; S++)
              if (!c._howls[S]._webAudio)
                for (var x = c._howls[S]._getSoundIds(), k = 0; k < x.length; k++) {
                  var A = c._howls[S]._soundById(x[k]);
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
          c.ctx || v(), c._muted = l, c.usingWebAudio && c.masterGain.gain.setValueAtTime(l ? 0 : c._volume, o.ctx.currentTime);
          for (var S = 0; S < c._howls.length; S++)
            if (!c._howls[S]._webAudio)
              for (var x = c._howls[S]._getSoundIds(), k = 0; k < x.length; k++) {
                var A = c._howls[S]._soundById(x[k]);
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
          return l.usingWebAudio && l.ctx && typeof l.ctx.close < "u" && (l.ctx.close(), l.ctx = null, v()), l;
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
          var S = c.canPlayType("audio/mpeg;").replace(/^no$/, ""), x = l._navigator ? l._navigator.userAgent : "", k = x.match(/OPR\/(\d+)/g), A = k && parseInt(k[0].split("/")[1], 10) < 33, _ = x.indexOf("Safari") !== -1 && x.indexOf("Chrome") === -1, b = x.match(/Version\/(.*?) /), E = _ && b && parseInt(b[1], 10) < 15;
          return l._codecs = {
            mp3: !!(!A && (S || c.canPlayType("audio/mp3;").replace(/^no$/, ""))),
            mpeg: !!S,
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
            var c = function(S) {
              for (; l._html5AudioPool.length < l.html5PoolSize; )
                try {
                  var x = new Audio();
                  x._unlocked = !0, l._releaseHtml5Audio(x);
                } catch {
                  l.noAudio = !0;
                  break;
                }
              for (var k = 0; k < l._howls.length; k++)
                if (!l._howls[k]._webAudio)
                  for (var A = l._howls[k]._getSoundIds(), _ = 0; _ < A.length; _++) {
                    var b = l._howls[k]._soundById(A[_]);
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
                for (var S = 0; S < l._howls[c]._sounds.length; S++)
                  if (!l._howls[c]._sounds[S]._paused)
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
          return o.ctx || v(), c._autoplay = l.autoplay || !1, c._format = typeof l.format != "string" ? l.format : [l.format], c._html5 = l.html5 || !1, c._muted = l.mute || !1, c._loop = l.loop || !1, c._pool = l.pool || 5, c._preload = typeof l.preload == "boolean" || l.preload === "metadata" ? l.preload : !0, c._rate = l.rate || 1, c._sprite = l.sprite || {}, c._src = typeof l.src != "string" ? l.src : [l.src], c._volume = l.volume !== void 0 ? l.volume : 1, c._xhr = {
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
          for (var S = 0; S < l._src.length; S++) {
            var x, k;
            if (l._format && l._format[S])
              x = l._format[S];
            else {
              if (k = l._src[S], typeof k != "string") {
                l._emit("loaderror", null, "Non-string found in selected audio sources - ignoring.");
                continue;
              }
              x = /^data:audio\/([^;,]+);/i.exec(k), x || (x = /\.([^.]+)$/.exec(k.split("?", 1)[0])), x && (x = x[1].toLowerCase());
            }
            if (x || console.warn('No file extension was found. Consider using the "format" property or specify an extension.'), x && o.codecs(x)) {
              c = l._src[S];
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
          var S = this, x = null;
          if (typeof l == "number")
            x = l, l = null;
          else {
            if (typeof l == "string" && S._state === "loaded" && !S._sprite[l])
              return null;
            if (typeof l > "u" && (l = "__default", !S._playLock)) {
              for (var k = 0, A = 0; A < S._sounds.length; A++)
                S._sounds[A]._paused && !S._sounds[A]._ended && (k++, x = S._sounds[A]._id);
              k === 1 ? l = null : x = null;
            }
          }
          var _ = x ? S._soundById(x) : S._inactiveSound();
          if (!_)
            return null;
          if (x && !l && (l = _._sprite || "__default"), S._state !== "loaded") {
            _._sprite = l, _._ended = !1;
            var b = _._id;
            return S._queue.push({
              event: "play",
              action: function() {
                S.play(b);
              }
            }), b;
          }
          if (x && !_._paused)
            return c || S._loadQueue("play"), _._id;
          S._webAudio && o._autoResume();
          var E = Math.max(0, _._seek > 0 ? _._seek : S._sprite[l][0] / 1e3), D = Math.max(0, (S._sprite[l][0] + S._sprite[l][1]) / 1e3 - E), O = D * 1e3 / Math.abs(_._rate), K = S._sprite[l][0] / 1e3, W = (S._sprite[l][0] + S._sprite[l][1]) / 1e3;
          _._sprite = l, _._ended = !1;
          var $ = function() {
            _._paused = !1, _._seek = E, _._start = K, _._stop = W, _._loop = !!(_._loop || S._sprite[l][2]);
          };
          if (E >= W) {
            S._ended(_);
            return;
          }
          var G = _._node;
          if (S._webAudio) {
            var Z = function() {
              S._playLock = !1, $(), S._refreshBuffer(_);
              var pe = _._muted || S._muted ? 0 : _._volume;
              G.gain.setValueAtTime(pe, o.ctx.currentTime), _._playStart = o.ctx.currentTime, typeof G.bufferSource.start > "u" ? _._loop ? G.bufferSource.noteGrainOn(0, E, 86400) : G.bufferSource.noteGrainOn(0, E, D) : _._loop ? G.bufferSource.start(0, E, 86400) : G.bufferSource.start(0, E, D), O !== 1 / 0 && (S._endTimers[_._id] = setTimeout(S._ended.bind(S, _), O)), c || setTimeout(function() {
                S._emit("play", _._id), S._loadQueue();
              }, 0);
            };
            o.state === "running" && o.ctx.state !== "interrupted" ? Z() : (S._playLock = !0, S.once("resume", Z), S._clearTimer(_._id));
          } else {
            var te = function() {
              G.currentTime = E, G.muted = _._muted || S._muted || o._muted || G.muted, G.volume = _._volume * o.volume(), G.playbackRate = _._rate;
              try {
                var pe = G.play();
                if (pe && typeof Promise < "u" && (pe instanceof Promise || typeof pe.then == "function") ? (S._playLock = !0, $(), pe.then(function() {
                  S._playLock = !1, G._unlocked = !0, c ? S._loadQueue() : S._emit("play", _._id);
                }).catch(function() {
                  S._playLock = !1, S._emit("playerror", _._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction."), _._ended = !0, _._paused = !0;
                })) : c || (S._playLock = !1, $(), S._emit("play", _._id)), G.playbackRate = _._rate, G.paused) {
                  S._emit("playerror", _._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.");
                  return;
                }
                l !== "__default" || _._loop ? S._endTimers[_._id] = setTimeout(S._ended.bind(S, _), O) : (S._endTimers[_._id] = function() {
                  S._ended(_), G.removeEventListener("ended", S._endTimers[_._id], !1);
                }, G.addEventListener("ended", S._endTimers[_._id], !1));
              } catch (we) {
                S._emit("playerror", _._id, we);
              }
            };
            G.src === "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA" && (G.src = S._src, G.load());
            var ce = window && window.ejecta || !G.readyState && o._navigator.isCocoonJS;
            if (G.readyState >= 3 || ce)
              te();
            else {
              S._playLock = !0, S._state = "loading";
              var he = function() {
                S._state = "loaded", te(), G.removeEventListener(o._canPlayEvent, he, !1);
              };
              G.addEventListener(o._canPlayEvent, he, !1), S._clearTimer(_._id);
            }
          }
          return _._id;
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
          for (var S = c._getSoundIds(l), x = 0; x < S.length; x++) {
            c._clearTimer(S[x]);
            var k = c._soundById(S[x]);
            if (k && !k._paused && (k._seek = c.seek(S[x]), k._rateSeek = 0, k._paused = !0, c._stopFade(S[x]), k._node))
              if (c._webAudio) {
                if (!k._node.bufferSource)
                  continue;
                typeof k._node.bufferSource.stop > "u" ? k._node.bufferSource.noteOff(0) : k._node.bufferSource.stop(0), c._cleanBuffer(k._node);
              } else (!isNaN(k._node.duration) || k._node.duration === 1 / 0) && k._node.pause();
            arguments[1] || c._emit("pause", k ? k._id : null);
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
          var S = this;
          if (S._state !== "loaded" || S._playLock)
            return S._queue.push({
              event: "stop",
              action: function() {
                S.stop(l);
              }
            }), S;
          for (var x = S._getSoundIds(l), k = 0; k < x.length; k++) {
            S._clearTimer(x[k]);
            var A = S._soundById(x[k]);
            A && (A._seek = A._start || 0, A._rateSeek = 0, A._paused = !0, A._ended = !0, S._stopFade(x[k]), A._node && (S._webAudio ? A._node.bufferSource && (typeof A._node.bufferSource.stop > "u" ? A._node.bufferSource.noteOff(0) : A._node.bufferSource.stop(0), S._cleanBuffer(A._node)) : (!isNaN(A._node.duration) || A._node.duration === 1 / 0) && (A._node.currentTime = A._start || 0, A._node.pause(), A._node.duration === 1 / 0 && S._clearSound(A._node))), c || S._emit("stop", A._id));
          }
          return S;
        },
        /**
         * Mute/unmute a single sound or all sounds in this Howl group.
         * @param  {Boolean} muted Set to true to mute and false to unmute.
         * @param  {Number} id    The sound ID to update (omit to mute/unmute all).
         * @return {Howl}
         */
        mute: function(l, c) {
          var S = this;
          if (S._state !== "loaded" || S._playLock)
            return S._queue.push({
              event: "mute",
              action: function() {
                S.mute(l, c);
              }
            }), S;
          if (typeof c > "u")
            if (typeof l == "boolean")
              S._muted = l;
            else
              return S._muted;
          for (var x = S._getSoundIds(c), k = 0; k < x.length; k++) {
            var A = S._soundById(x[k]);
            A && (A._muted = l, A._interval && S._stopFade(A._id), S._webAudio && A._node ? A._node.gain.setValueAtTime(l ? 0 : A._volume, o.ctx.currentTime) : A._node && (A._node.muted = o._muted ? !0 : l), S._emit("mute", A._id));
          }
          return S;
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
          var l = this, c = arguments, S, x;
          if (c.length === 0)
            return l._volume;
          if (c.length === 1 || c.length === 2 && typeof c[1] > "u") {
            var k = l._getSoundIds(), A = k.indexOf(c[0]);
            A >= 0 ? x = parseInt(c[0], 10) : S = parseFloat(c[0]);
          } else c.length >= 2 && (S = parseFloat(c[0]), x = parseInt(c[1], 10));
          var _;
          if (typeof S < "u" && S >= 0 && S <= 1) {
            if (l._state !== "loaded" || l._playLock)
              return l._queue.push({
                event: "volume",
                action: function() {
                  l.volume.apply(l, c);
                }
              }), l;
            typeof x > "u" && (l._volume = S), x = l._getSoundIds(x);
            for (var b = 0; b < x.length; b++)
              _ = l._soundById(x[b]), _ && (_._volume = S, c[2] || l._stopFade(x[b]), l._webAudio && _._node && !_._muted ? _._node.gain.setValueAtTime(S, o.ctx.currentTime) : _._node && !_._muted && (_._node.volume = S * o.volume()), l._emit("volume", _._id));
          } else
            return _ = x ? l._soundById(x) : l._sounds[0], _ ? _._volume : 0;
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
        fade: function(l, c, S, x) {
          var k = this;
          if (k._state !== "loaded" || k._playLock)
            return k._queue.push({
              event: "fade",
              action: function() {
                k.fade(l, c, S, x);
              }
            }), k;
          l = Math.min(Math.max(0, parseFloat(l)), 1), c = Math.min(Math.max(0, parseFloat(c)), 1), S = parseFloat(S), k.volume(l, x);
          for (var A = k._getSoundIds(x), _ = 0; _ < A.length; _++) {
            var b = k._soundById(A[_]);
            if (b) {
              if (x || k._stopFade(A[_]), k._webAudio && !b._muted) {
                var E = o.ctx.currentTime, D = E + S / 1e3;
                b._volume = l, b._node.gain.setValueAtTime(l, E), b._node.gain.linearRampToValueAtTime(c, D);
              }
              k._startFadeInterval(b, l, c, S, A[_], typeof x > "u");
            }
          }
          return k;
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
        _startFadeInterval: function(l, c, S, x, k, A) {
          var _ = this, b = c, E = S - c, D = Math.abs(E / 0.01), O = Math.max(4, D > 0 ? x / D : x), K = Date.now();
          l._fadeTo = S, l._interval = setInterval(function() {
            var W = (Date.now() - K) / x;
            K = Date.now(), b += E * W, b = Math.round(b * 100) / 100, E < 0 ? b = Math.max(S, b) : b = Math.min(S, b), _._webAudio ? l._volume = b : _.volume(b, l._id, !0), A && (_._volume = b), (S < c && b <= S || S > c && b >= S) && (clearInterval(l._interval), l._interval = null, l._fadeTo = null, _.volume(S, l._id), _._emit("fade", l._id));
          }, O);
        },
        /**
         * Internal method that stops the currently playing fade when
         * a new fade starts, volume is changed or the sound is stopped.
         * @param  {Number} id The sound id.
         * @return {Howl}
         */
        _stopFade: function(l) {
          var c = this, S = c._soundById(l);
          return S && S._interval && (c._webAudio && S._node.gain.cancelScheduledValues(o.ctx.currentTime), clearInterval(S._interval), S._interval = null, c.volume(S._fadeTo, l), S._fadeTo = null, c._emit("fade", l)), c;
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
          var l = this, c = arguments, S, x, k;
          if (c.length === 0)
            return l._loop;
          if (c.length === 1)
            if (typeof c[0] == "boolean")
              S = c[0], l._loop = S;
            else
              return k = l._soundById(parseInt(c[0], 10)), k ? k._loop : !1;
          else c.length === 2 && (S = c[0], x = parseInt(c[1], 10));
          for (var A = l._getSoundIds(x), _ = 0; _ < A.length; _++)
            k = l._soundById(A[_]), k && (k._loop = S, l._webAudio && k._node && k._node.bufferSource && (k._node.bufferSource.loop = S, S && (k._node.bufferSource.loopStart = k._start || 0, k._node.bufferSource.loopEnd = k._stop, l.playing(A[_]) && (l.pause(A[_], !0), l.play(A[_], !0)))));
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
          var l = this, c = arguments, S, x;
          if (c.length === 0)
            x = l._sounds[0]._id;
          else if (c.length === 1) {
            var k = l._getSoundIds(), A = k.indexOf(c[0]);
            A >= 0 ? x = parseInt(c[0], 10) : S = parseFloat(c[0]);
          } else c.length === 2 && (S = parseFloat(c[0]), x = parseInt(c[1], 10));
          var _;
          if (typeof S == "number") {
            if (l._state !== "loaded" || l._playLock)
              return l._queue.push({
                event: "rate",
                action: function() {
                  l.rate.apply(l, c);
                }
              }), l;
            typeof x > "u" && (l._rate = S), x = l._getSoundIds(x);
            for (var b = 0; b < x.length; b++)
              if (_ = l._soundById(x[b]), _) {
                l.playing(x[b]) && (_._rateSeek = l.seek(x[b]), _._playStart = l._webAudio ? o.ctx.currentTime : _._playStart), _._rate = S, l._webAudio && _._node && _._node.bufferSource ? _._node.bufferSource.playbackRate.setValueAtTime(S, o.ctx.currentTime) : _._node && (_._node.playbackRate = S);
                var E = l.seek(x[b]), D = (l._sprite[_._sprite][0] + l._sprite[_._sprite][1]) / 1e3 - E, O = D * 1e3 / Math.abs(_._rate);
                (l._endTimers[x[b]] || !_._paused) && (l._clearTimer(x[b]), l._endTimers[x[b]] = setTimeout(l._ended.bind(l, _), O)), l._emit("rate", _._id);
              }
          } else
            return _ = l._soundById(x), _ ? _._rate : l._rate;
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
          var l = this, c = arguments, S, x;
          if (c.length === 0)
            l._sounds.length && (x = l._sounds[0]._id);
          else if (c.length === 1) {
            var k = l._getSoundIds(), A = k.indexOf(c[0]);
            A >= 0 ? x = parseInt(c[0], 10) : l._sounds.length && (x = l._sounds[0]._id, S = parseFloat(c[0]));
          } else c.length === 2 && (S = parseFloat(c[0]), x = parseInt(c[1], 10));
          if (typeof x > "u")
            return 0;
          if (typeof S == "number" && (l._state !== "loaded" || l._playLock))
            return l._queue.push({
              event: "seek",
              action: function() {
                l.seek.apply(l, c);
              }
            }), l;
          var _ = l._soundById(x);
          if (_)
            if (typeof S == "number" && S >= 0) {
              var b = l.playing(x);
              b && l.pause(x, !0), _._seek = S, _._ended = !1, l._clearTimer(x), !l._webAudio && _._node && !isNaN(_._node.duration) && (_._node.currentTime = S);
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
              var O = l.playing(x) ? o.ctx.currentTime - _._playStart : 0, K = _._rateSeek ? _._rateSeek - _._seek : 0;
              return _._seek + (K + O * Math.abs(_._rate));
            } else
              return _._node.currentTime;
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
            var S = c._soundById(l);
            return S ? !S._paused : !1;
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
          var c = this, S = c._duration, x = c._soundById(l);
          return x && (S = c._sprite[x._sprite][1] / 1e3), S;
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
          for (var l = this, c = l._sounds, S = 0; S < c.length; S++)
            c[S]._paused || l.stop(c[S]._id), l._webAudio || (l._clearSound(c[S]._node), c[S]._node.removeEventListener("error", c[S]._errorFn, !1), c[S]._node.removeEventListener(o._canPlayEvent, c[S]._loadFn, !1), c[S]._node.removeEventListener("ended", c[S]._endFn, !1), o._releaseHtml5Audio(c[S]._node)), delete c[S]._node, l._clearTimer(c[S]._id);
          var x = o._howls.indexOf(l);
          x >= 0 && o._howls.splice(x, 1);
          var k = !0;
          for (S = 0; S < o._howls.length; S++)
            if (o._howls[S]._src === l._src || l._src.indexOf(o._howls[S]._src) >= 0) {
              k = !1;
              break;
            }
          return d && k && delete d[l._src], o.noAudio = !1, l._state = "unloaded", l._sounds = [], l = null, null;
        },
        /**
         * Listen to a custom event.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to call.
         * @param  {Number}   id    (optional) Only listen to events for this sound.
         * @param  {Number}   once  (INTERNAL) Marks event to fire only once.
         * @return {Howl}
         */
        on: function(l, c, S, x) {
          var k = this, A = k["_on" + l];
          return typeof c == "function" && A.push(x ? { id: S, fn: c, once: x } : { id: S, fn: c }), k;
        },
        /**
         * Remove a custom event. Call without parameters to remove all events.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to remove. Leave empty to remove all.
         * @param  {Number}   id    (optional) Only remove events for this sound.
         * @return {Howl}
         */
        off: function(l, c, S) {
          var x = this, k = x["_on" + l], A = 0;
          if (typeof c == "number" && (S = c, c = null), c || S)
            for (A = 0; A < k.length; A++) {
              var _ = S === k[A].id;
              if (c === k[A].fn && _ || !c && _) {
                k.splice(A, 1);
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
        once: function(l, c, S) {
          var x = this;
          return x.on(l, c, S, 1), x;
        },
        /**
         * Emit all events of a specific type and pass the sound id.
         * @param  {String} event Event name.
         * @param  {Number} id    Sound ID.
         * @param  {Number} msg   Message to go with event.
         * @return {Howl}
         */
        _emit: function(l, c, S) {
          for (var x = this, k = x["_on" + l], A = k.length - 1; A >= 0; A--)
            (!k[A].id || k[A].id === c || l === "load") && (setTimeout((function(_) {
              _.call(this, c, S);
            }).bind(x, k[A].fn), 0), k[A].once && x.off(l, k[A].fn, k[A].id));
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
            var S = c._queue[0];
            S.event === l && (c._queue.shift(), c._loadQueue()), l || S.action();
          }
          return c;
        },
        /**
         * Fired when playback ends at the end of the duration.
         * @param  {Sound} sound The sound object to work with.
         * @return {Howl}
         */
        _ended: function(l) {
          var c = this, S = l._sprite;
          if (!c._webAudio && l._node && !l._node.paused && !l._node.ended && l._node.currentTime < l._stop)
            return setTimeout(c._ended.bind(c, l), 100), c;
          var x = !!(l._loop || c._sprite[S][2]);
          if (c._emit("end", l._id), !c._webAudio && x && c.stop(l._id, !0).play(l._id), c._webAudio && x) {
            c._emit("play", l._id), l._seek = l._start || 0, l._rateSeek = 0, l._playStart = o.ctx.currentTime;
            var k = (l._stop - l._start) * 1e3 / Math.abs(l._rate);
            c._endTimers[l._id] = setTimeout(c._ended.bind(c, l), k);
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
              var S = c._soundById(l);
              S && S._node && S._node.removeEventListener("ended", c._endTimers[l], !1);
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
          for (var c = this, S = 0; S < c._sounds.length; S++)
            if (l === c._sounds[S]._id)
              return c._sounds[S];
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
          var l = this, c = l._pool, S = 0, x = 0;
          if (!(l._sounds.length < c)) {
            for (x = 0; x < l._sounds.length; x++)
              l._sounds[x]._ended && S++;
            for (x = l._sounds.length - 1; x >= 0; x--) {
              if (S <= c)
                return;
              l._sounds[x]._ended && (l._webAudio && l._sounds[x]._node && l._sounds[x]._node.disconnect(0), l._sounds.splice(x, 1), S--);
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
            for (var S = [], x = 0; x < c._sounds.length; x++)
              S.push(c._sounds[x]._id);
            return S;
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
          var c = this, S = o._navigator && o._navigator.vendor.indexOf("Apple") >= 0;
          if (!l.bufferSource)
            return c;
          if (o._scratchBuffer && l.bufferSource && (l.bufferSource.onended = null, l.bufferSource.disconnect(0), S))
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
          var l = this, c = l._parent, S = o._muted || l._muted || l._parent._muted ? 0 : l._volume;
          return c._webAudio ? (l._node = typeof o.ctx.createGain > "u" ? o.ctx.createGainNode() : o.ctx.createGain(), l._node.gain.setValueAtTime(S, o.ctx.currentTime), l._node.paused = !0, l._node.connect(o.masterGain)) : o.noAudio || (l._node = o._obtainHtml5Audio(), l._errorFn = l._errorListener.bind(l), l._node.addEventListener("error", l._errorFn, !1), l._loadFn = l._loadListener.bind(l), l._node.addEventListener(o._canPlayEvent, l._loadFn, !1), l._endFn = l._endListener.bind(l), l._node.addEventListener("ended", l._endFn, !1), l._node.src = c._src, l._node.preload = c._preload === !0 ? "auto" : c._preload, l._node.volume = S * o.volume(), l._node.load()), l;
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
          for (var S = atob(c.split(",")[1]), x = new Uint8Array(S.length), k = 0; k < S.length; ++k)
            x[k] = S.charCodeAt(k);
          m(x.buffer, l);
        } else {
          var A = new XMLHttpRequest();
          A.open(l._xhr.method, c, !0), A.withCredentials = l._xhr.withCredentials, A.responseType = "arraybuffer", l._xhr.headers && Object.keys(l._xhr.headers).forEach(function(_) {
            A.setRequestHeader(_, l._xhr.headers[_]);
          }), A.onload = function() {
            var _ = (A.status + "")[0];
            if (_ !== "0" && _ !== "2" && _ !== "3") {
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
        var S = function() {
          c._emit("loaderror", null, "Decoding audio data failed.");
        }, x = function(k) {
          k && c._sounds.length > 0 ? (d[c._src] = k, y(c, k)) : S();
        };
        typeof Promise < "u" && o.ctx.decodeAudioData.length === 1 ? o.ctx.decodeAudioData(l).then(x).catch(S) : o.ctx.decodeAudioData(l, x, S);
      }, y = function(l, c) {
        c && !l._duration && (l._duration = c.duration), Object.keys(l._sprite).length === 0 && (l._sprite = { __default: [0, l._duration * 1e3] }), l._state !== "loaded" && (l._state = "loaded", l._emit("load"), l._loadQueue());
      }, v = function() {
        if (o.usingWebAudio) {
          try {
            typeof AudioContext < "u" ? o.ctx = new AudioContext() : typeof webkitAudioContext < "u" ? o.ctx = new webkitAudioContext() : o.usingWebAudio = !1;
          } catch {
            o.usingWebAudio = !1;
          }
          o.ctx || (o.usingWebAudio = !1);
          var l = /iP(hone|od|ad)/.test(o._navigator && o._navigator.platform), c = o._navigator && o._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/), S = c ? parseInt(c[1], 10) : null;
          if (l && S && S < 9) {
            var x = /safari/.test(o._navigator && o._navigator.userAgent.toLowerCase());
            o._navigator && !x && (o.usingWebAudio = !1);
          }
          o.usingWebAudio && (o.masterGain = typeof o.ctx.createGain > "u" ? o.ctx.createGainNode() : o.ctx.createGain(), o.masterGain.gain.setValueAtTime(o._muted ? 0 : o._volume, o.ctx.currentTime), o.masterGain.connect(o.ctx.destination)), o._setup();
        }
      };
      e.Howler = o, e.Howl = i, typeof ei < "u" ? (ei.HowlerGlobal = n, ei.Howler = o, ei.Howl = i, ei.Sound = a) : typeof window < "u" && (window.HowlerGlobal = n, window.Howler = o, window.Howl = i, window.Sound = a);
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
            var v = f._panner;
            v || (f._pos || (f._pos = o._pos || [0, 0, -0.5]), n(f, "spatial"), v = f._panner), v.coneInnerAngle = y.coneInnerAngle, v.coneOuterAngle = y.coneOuterAngle, v.coneOuterGain = y.coneOuterGain, v.distanceModel = y.distanceModel, v.maxDistance = y.maxDistance, v.refDistance = y.refDistance, v.rolloffFactor = y.rolloffFactor, v.panningModel = y.panningModel;
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
  })(hc)), hc;
}
var cM = uM();
const dM = /* @__PURE__ */ vg(cM), { Howl: _S } = dM, id = 500, Nt = {
  music: null,
  ambient: /* @__PURE__ */ new Map()
};
let pr = {}, fi = !1, sd = "";
function Si() {
  return typeof _S == "function";
}
function yc(e, n = 50) {
  const o = Number(e), i = Number.isFinite(o) ? o : n;
  return Math.min(1, Math.max(0, i / 100));
}
function TS(e) {
  return new _S({
    src: [e],
    loop: !0,
    html5: !0,
    preload: !0,
    volume: 0
  });
}
function kS(e, n, o = id) {
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
function Wa(e, { unload: n = !1 } = {}) {
  var o;
  e && (kS(e, 0, Math.min(id, 300)), (o = globalThis.setTimeout) == null || o.call(globalThis, () => {
    try {
      e.pause(), n && e.unload();
    } catch {
    }
  }, Math.min(id, 320)));
}
function fM(e) {
  return !(e != null && e.streamUrl) || !Si() ? null : ((!Nt.music || Nt.music.__synapseSrc !== e.streamUrl) && (Wa(Nt.music, { unload: !0 }), Nt.music = TS(e.streamUrl), Nt.music.__synapseSrc = e.streamUrl), Nt.music);
}
function pM(e) {
  if (!(e != null && e.streamUrl) || !Si()) return null;
  const n = e.id || e.streamUrl, o = Nt.ambient.get(n);
  if (o && o.__synapseSrc === e.streamUrl) return o;
  Wa(o, { unload: !0 });
  const i = TS(e.streamUrl);
  return i.__synapseSrc = e.streamUrl, Nt.ambient.set(n, i), i;
}
function mM() {
  return [
    Nt.music,
    ...Nt.ambient.values()
  ].filter(Boolean);
}
function AS() {
  mM().forEach((e) => Wa(e));
}
function hM(e) {
  for (const [n, o] of Nt.ambient.entries())
    e.has(n) || (Wa(o, { unload: !0 }), Nt.ambient.delete(n));
}
function dg(e, n) {
  if (e)
    try {
      e.playing() || e.play(), kS(e, n), sd = "";
    } catch (o) {
      sd = (o == null ? void 0 : o.message) || "Audio playback is blocked until the browser receives a user action.";
    }
}
async function yM(e = {}) {
  pr = { ...pr, ...e };
  const n = La(pr);
  if (!Si()) return da(n);
  if (!fi)
    return AS(), da(n);
  const o = fM(n.musicTrack), i = yc(pr.musicVolume, 60), a = yc(pr.ambientVolume, 50), d = /* @__PURE__ */ new Set(), f = [];
  return n.ambientLayers.forEach((p) => {
    var c;
    const m = p.id || p.streamUrl;
    d.add(m);
    const y = pM(p), v = Number((c = pr.audioChannels) == null ? void 0 : c[p.id]), l = Number.isFinite(v) ? yc(v, 0) : Math.min(1, Math.max(0, a * (p.volumeBias ?? 1)));
    f.push([y, l]);
  }), hM(d), dg(o, i), f.forEach(([p, m]) => dg(p, m)), da(n);
}
function gM(e) {
  return fi = !!e, fi || AS(), fi;
}
function da(e = La(pr)) {
  var n, o, i, a;
  return {
    available: Si(),
    playing: fi && Si(),
    musicTitle: ((n = e.musicTrack) == null ? void 0 : n.title) || "",
    musicArtist: ((o = e.musicTrack) == null ? void 0 : o.artist) || "",
    musicPageUrl: ((i = e.musicTrack) == null ? void 0 : i.pageUrl) || "",
    musicAttribution: ((a = e.musicTrack) == null ? void 0 : a.attribution) || "",
    ambientTitles: e.ambientLayers.map((d) => d.title).filter(Boolean),
    ambientPageUrls: e.ambientLayers.map((d) => d.pageUrl).filter(Boolean),
    ambientAttributions: e.ambientLayers.map((d) => d.attribution).filter(Boolean),
    error: sd
  };
}
const vM = "synapse.focusRoom.audioPrefs.v1";
function SM(e) {
  var n;
  try {
    (n = globalThis.localStorage) == null || n.setItem(vM, JSON.stringify({
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
function wM() {
  const e = Y((m) => m.musicType), n = Y((m) => m.ambientSound), o = Y((m) => m.musicVolume), i = Y((m) => m.ambientVolume), a = Y((m) => m.audioChannels), d = Y((m) => m.audioPlaying), [f, p] = C.useState(() => da(La({
    musicType: e,
    ambientSound: n
  })));
  return C.useEffect(() => {
    const m = { musicType: e, ambientSound: n, musicVolume: o, ambientVolume: i, audioChannels: a };
    let y = !1;
    return gM(d), SM(m), yM(m).then((v) => {
      y || p(v);
    }), () => {
      y = !0;
    };
  }, [n, i, a, d, e, o]), f;
}
function xM() {
  const e = Y(), n = C.useCallback(async (i = "", a = "", d = {}) => {
    var v;
    e.pauseTimer({ pauseAudio: !0 }), e.closeSummary();
    const f = typeof i == "string" || typeof i == "number" ? i : "", p = typeof a == "string" ? a : "", m = _M(p, d), y = String(f || e.selectedMaterialId || ((v = e.selectedMaterial) == null ? void 0 : v.materialId) || "");
    if (typeof globalThis.returnFromFocusRoomToWorkspace == "function")
      try {
        const l = globalThis.returnFromFocusRoomToWorkspace(y, m);
        l && typeof l.then == "function" && await l, fg(m.action || p, m);
        return;
      } catch (l) {
        console.error("Could not return from Focus Room:", l);
      }
    globalThis.location.hash = "", fg(m.action || p, m);
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
function CS(e) {
  const n = String(e || "").trim().toLowerCase();
  return ["flashcards", "quiz", "assistant", "mindmap", "timeline", "source", "notes"].includes(n) ? n : "";
}
function _M(e, n = {}) {
  const o = n && typeof n == "object" && !Array.isArray(n) ? n : {}, i = CS(e || o.action);
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
function fg(e, n = {}) {
  const o = CS(e);
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
function TM(e = 3e3) {
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
function kM() {
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
function AM() {
  const e = Y((n) => n.selectedScene);
  return yn(e);
}
function CM(e) {
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
function bM() {
  const [e, n] = C.useState(""), [o, i] = C.useState(!1), [a, d] = C.useState(!1), f = Y((_) => _.view), p = TM(3e3), m = AM(), y = wM(), v = xM();
  kM();
  const l = Y(Gx(CM)), c = Y((_) => _.summaryRecord), S = Y((_) => _.endSession), x = Y((_) => _.initializeFocusRoom);
  C.useEffect(() => {
    x();
  }, [x]), C.useEffect(() => {
    var D;
    const _ = document.documentElement, b = _.dataset.theme, E = _.style.colorScheme;
    return _.dataset.theme = "dark", _.style.colorScheme = "dark", (D = document.body) == null || D.classList.add("synapse-theme-dark"), () => {
      var O;
      (O = document.body) != null && O.classList.contains("focus-room-standalone") || (b && (_.dataset.theme = b), _.style.colorScheme = E);
    };
  }, []), C.useEffect(() => {
    l != null && l.materialId && Bd(l.materialId, l);
  }, [l]), C.useEffect(() => {
    f === "session" || !c || sa("focus-room");
  }, [c, f]), C.useEffect(() => {
    f !== "session" && (i(!1), n(""), d(!1));
  }, [f]), C.useEffect(() => {
    const _ = (b) => {
      b.key === "Escape" && (o ? (b.preventDefault(), i(!1)) : e ? n("") : a && d(!1));
    };
    return window.addEventListener("keydown", _), () => window.removeEventListener("keydown", _);
  }, [a, o, e]);
  const k = (..._) => {
    v.returnToWorkspace(..._);
  }, A = async () => {
    d(!1), i(!1), n(""), S(), await k();
  };
  return /* @__PURE__ */ w.jsxs(
    "main",
    {
      id: "focusRoomSurface",
      className: `focus-room-surface react-focus-room ${p ? "is-idle" : ""} ${f === "setup" ? "is-setup is-innook-setup" : "is-session"}`.trim(),
      "aria-live": "polite",
      "data-focus-room-view": f,
      children: [
        /* @__PURE__ */ w.jsx(bC, { scene: m }),
        /* @__PURE__ */ w.jsxs(Fa, { mode: "wait", children: [
          f === "setup" ? /* @__PURE__ */ w.jsx(
            gn.div,
            {
              className: "focus-room-view focus-setup-view",
              initial: { opacity: 0, y: 16 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -10 },
              transition: _a,
              children: /* @__PURE__ */ w.jsx(Bb, { audioState: y, onWorkspace: k })
            },
            "setup"
          ) : null,
          f === "session" ? /* @__PURE__ */ w.jsxs(
            gn.div,
            {
              className: "focus-room-view focus-session-view",
              initial: { opacity: 0, y: 14 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -8 },
              transition: _a,
              children: [
                o ? /* @__PURE__ */ w.jsx("button", { type: "button", className: "focus-mode-exit-hit-area", onClick: () => i(!1), children: "Exit Focus Mode" }) : /* @__PURE__ */ w.jsx(Ub, { onWorkspace: k, onOpenTrail: () => n("trail"), onOpenCompanion: () => n("companion"), onOpenSettings: () => n("settings"), onExit: () => d(!0) }),
                /* @__PURE__ */ w.jsx("section", { className: `focus-session-stage ${o ? "is-focus-mode" : ""}`.trim(), "aria-hidden": "true" }),
                o ? /* @__PURE__ */ w.jsx(lM, { onExit: () => i(!1) }) : /* @__PURE__ */ w.jsx(Xb, { audioState: y, onFocusMode: () => i(!0) }),
                o ? null : /* @__PURE__ */ w.jsx(sM, { audioState: y, utilityPanel: e, onClose: () => n(""), onWorkspace: k }),
                /* @__PURE__ */ w.jsx(RE, {}),
                /* @__PURE__ */ w.jsx(PM, { open: a, onClose: () => d(!1), onConfirm: A })
              ]
            },
            "session"
          ) : null
        ] })
      ]
    }
  );
}
function PM({ open: e, onClose: n, onConfirm: o }) {
  return e ? /* @__PURE__ */ w.jsx("div", { className: "focus-exit-overlay", role: "presentation", children: /* @__PURE__ */ w.jsxs("div", { className: "focus-exit-dialog liquid-glass", role: "dialog", "aria-modal": "true", "aria-labelledby": "focus-exit-title", children: [
    /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Leave this room?" }),
    /* @__PURE__ */ w.jsx("h2", { id: "focus-exit-title", children: "End focus session" }),
    /* @__PURE__ */ w.jsx("p", { children: "Your focused time will be saved to your Focus Trail." }),
    /* @__PURE__ */ w.jsxs("div", { className: "focus-button-row", children: [
      /* @__PURE__ */ w.jsx(Ee, { onClick: n, children: "Continue focusing" }),
      /* @__PURE__ */ w.jsx(Ee, { variant: "primary", onClick: o, children: "End and exit" })
    ] })
  ] }) }) : null;
}
let gc = null;
function EM(e, n) {
  const o = globalThis.__synapseFocusRoomApi || {};
  if (typeof o[e] != "function") {
    console.warn(`Synapse Focus Room action "${e}" is not available yet.`);
    return;
  }
  return o[e](...n);
}
function MM() {
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
    globalThis[n] = (...i) => EM(o, i);
  });
}
function RM(e = {}) {
  MM();
  const n = e.root || document.getElementById("focusRoomRoot");
  if (!n)
    throw new Error("Focus Room root element was not found.");
  gc || (gc = Bx.createRoot(n), gc.render(
    hn.createElement(
      hn.StrictMode,
      null,
      hn.createElement(bM)
    )
  ));
}
const NM = "synapse.generated.history.v6", bS = "synapse.active.generated.v6", DM = "synapse.flashcards.deck.v1", jM = "synapse.quiz.history.v1", IM = "synapse.focusRoom.return-target.v1";
function sf(e, n) {
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
function FM(e, n) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, n), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function OM(e, n) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, JSON.stringify(n)), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function PS() {
  const e = sf(NM, []);
  return Array.isArray(e) ? e : [];
}
function LM(e) {
  const n = String((e == null ? void 0 : e.title) || "").trim();
  return n || String((e == null ? void 0 : e.summary) || "").split(/\n+/).map((i) => i.replace(/^#+\s*/, "").trim()).find((i) => i.length > 4) || "Generated Study Notes";
}
function ES(e = {}) {
  return [
    e.id ? `history:${e.id}` : "",
    e.sourceFingerprint ? `fingerprint:${e.sourceFingerprint}` : "",
    e.clientFingerprint ? `fingerprint:${e.clientFingerprint}` : ""
  ].filter(Boolean);
}
function VM(e = {}) {
  const n = sf(DM, {}), i = ES(e).map((a) => n == null ? void 0 : n[a]).find((a) => a && Array.isArray(a.cards) && a.cards.length);
  return (i == null ? void 0 : i.cards) || [];
}
function zM(e = {}) {
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
function BM(e = []) {
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
function UM(e = {}) {
  const n = sf(jM, {}), i = ES(e).flatMap((d) => Array.isArray(n == null ? void 0 : n[d]) ? n[d] : []), a = /* @__PURE__ */ new Set();
  return BM(i).filter((d) => {
    const f = zM(d);
    return !f || a.has(f) ? !1 : (a.add(f), !0);
  }).sort((d, f) => new Date(f.createdAt || 0) - new Date(d.createdAt || 0));
}
function $M(e = {}) {
  return {
    materialId: String(e.id || e.sourceFingerprint || e.clientFingerprint || "current-material"),
    materialTitle: LM(e),
    materialType: "Generated notes",
    uploadedContent: "",
    aiSummary: e.summary || "",
    sections: e.sections || {},
    flashcards: VM(e),
    quizzes: UM(e),
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
function MS() {
  return PS().filter((e) => e && (e.id || e.summary) && e.kind !== "companion" && !String(e.id || "").startsWith("companion:")).map($M);
}
function RS(e = "") {
  const n = String(e || "");
  return n && MS().find(
    (o) => o.materialId === n || o.sourceFingerprint === n || o.clientFingerprint === n
  ) || null;
}
function NS() {
  var n;
  const e = ((n = globalThis.localStorage) == null ? void 0 : n.getItem(bS)) || "";
  return RS(e);
}
function HM(e = "") {
  var i;
  const n = e || ((i = NS()) == null ? void 0 : i.materialId) || "", o = n ? `/${encodeURIComponent(n)}` : "";
  globalThis.location.hash = `#/focus-room${o}`;
}
function WM(e = "", n = {}) {
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
async function GM(e = "", n = {}) {
  const o = String(e || ""), i = PS().find(
    (f) => String((f == null ? void 0 : f.id) || "") === o || String((f == null ? void 0 : f.sourceFingerprint) || (f == null ? void 0 : f.source_fingerprint) || "") === o || String((f == null ? void 0 : f.clientFingerprint) || (f == null ? void 0 : f.client_fingerprint) || "") === o
  ) || null, a = String((i == null ? void 0 : i.id) || "");
  a && FM(bS, a);
  const d = WM(a, n);
  d.action && OM(IM, d), globalThis.location.href = a ? `index.html?focusReturn=${encodeURIComponent(a)}` : "index.html";
}
function KM() {
  Object.assign(globalThis, {
    getSynapseFocusRoomCurrentMaterial: NS,
    getSynapseFocusRoomMaterial: RS,
    getSynapseFocusRoomMaterials: MS,
    openSynapseFocusRoom: HM,
    returnFromFocusRoomToWorkspace: GM
  });
}
const DS = document.getElementById("focusRoomRoot");
if (!DS)
  throw new Error("Focus Room root element was not found.");
var hg;
(hg = document.getElementById("focusRoomFallbackTitle")) == null || hg.remove();
globalThis.apiClient = new gg(Dx);
KM();
(!globalThis.location.hash || globalThis.location.hash === "#") && (globalThis.location.hash = "#/focus-room");
RM({ root: DS });
