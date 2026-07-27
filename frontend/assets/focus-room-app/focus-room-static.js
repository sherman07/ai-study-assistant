function u1(e, n) {
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
function c1(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function Rg(e) {
  const n = String(e || "").toLowerCase();
  return n === "127.0.0.1" || n === "localhost" || n === "::1" || n === "[::1]";
}
function Sh(e) {
  return Rg(e) || c1(e);
}
function d1(e) {
  return !e || Rg(e) ? "127.0.0.1" : e;
}
const f1 = (() => {
  var p, m, y, g;
  const { protocol: e, hostname: n, port: o } = window.location, i = String(window.SYNAPSE_BACKEND_PORT || ((m = (p = document.body) == null ? void 0 : p.dataset) == null ? void 0 : m.apiPort) || "8001").trim(), a = `http://${d1(n)}:${i || "8001"}`, d = String(window.SYNAPSE_API_BASE || ((g = (y = document.body) == null ? void 0 : y.dataset) == null ? void 0 : g.apiBase) || "").replace(/\/+$/, ""), c = `${e}//${window.location.host}`.replace(/\/+$/, "");
  return d && !(Sh(n) && o !== i && d === c) ? d : e === "file:" || Sh(n) && o !== i ? a : `${e}//${window.location.host}`;
})();
class eo extends Error {
  constructor(n, { cause: o, code: i } = {}) {
    super(n), this.name = "ApiConnectionError", this.cause = o, this.code = i || "connection_error";
  }
}
const wh = "synapse.client.id.v1";
function Un() {
  return globalThis.window || globalThis;
}
function to(e, n = 220) {
  return String(e || "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
}
function xh() {
  const e = globalThis.crypto || Un().crypto;
  return e != null && e.randomUUID ? e.randomUUID() : `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
function p1() {
  var n, o;
  const e = Un();
  try {
    const i = (n = e.localStorage) == null ? void 0 : n.getItem(wh);
    if (i) return i;
    const a = xh();
    return (o = e.localStorage) == null || o.setItem(wh, a), a;
  } catch {
    return xh();
  }
}
function m1(e = {}) {
  if (typeof Headers < "u" && e instanceof Headers) {
    const n = {};
    return e.forEach((o, i) => {
      n[i] = o;
    }), n;
  }
  return Array.isArray(e) ? Object.fromEntries(e) : { ...e || {} };
}
class Dg {
  constructor(n, { fetchImpl: o } = {}) {
    var a, d;
    const i = Un();
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
    var d, c, p;
    const o = Un(), i = m1(n);
    i["X-Synapse-Client-Id"] = to(p1(), 160);
    const a = (c = (d = o.SynapseAuth) == null ? void 0 : d.getStoredSession) == null ? void 0 : c.call(d);
    if (a && typeof a == "object" && (a.accountId && (i["X-Synapse-User-Id"] = to(a.accountId, 160)), a.email && (i["X-Synapse-User-Email"] = to(a.email, 220)), a.displayName && (i["X-Synapse-User-Name"] = to(a.displayName, 180)), a.authMode && (i["X-Synapse-Auth-Mode"] = to(a.authMode, 60)), a.role && (i["X-Synapse-User-Role"] = to(a.role, 80))), (p = o.SynapseAuth) != null && p.authHeaders && !i.Authorization && !i.authorization)
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
    const c = Number(a || 0);
    let p = null, m = null, y = null;
    const g = d.signal;
    c > 0 && typeof AbortController < "u" && (p = new AbortController(), y = () => p.abort(), g && (g.aborted ? p.abort() : g.addEventListener("abort", y, { once: !0 })), m = Un().setTimeout(() => p.abort(), c), d.signal = p.signal);
    try {
      return await this.fetchImpl(i, d);
    } catch (f) {
      throw (l = p == null ? void 0 : p.signal) != null && l.aborted && !(g != null && g.aborted) ? new eo(this.timeoutMessage(c), {
        cause: f,
        code: "timeout"
      }) : g != null && g.aborted ? new eo("Analysis was cancelled.", {
        cause: f,
        code: "cancelled"
      }) : new eo(this.connectionMessage(), {
        cause: f,
        code: "unreachable"
      });
    } finally {
      m && Un().clearTimeout(m), g && y && g.removeEventListener("abort", y);
    }
  }
  async warmup({ attempts: n = 2, retryDelayMs: o = 1500, timeoutMs: i = 6e4, maxWaitMs: a = 0, signal: d } = {}) {
    const c = Math.max(1, Math.floor(Number(n) || 1)), p = Math.max(0, Number(a) || 0), m = Date.now();
    let y = null;
    for (let g = 0; g < c; g += 1) {
      const l = Date.now() - m, f = p > 0 ? p - l : 0;
      if (p > 0 && f <= 0) break;
      try {
        const S = await this.fetch("/healthz", {
          method: "GET",
          signal: d,
          timeoutMs: p > 0 ? Math.min(i, f) : i
        });
        if (S != null && S.ok) return S;
        y = new eo(
          `Synapse hosted service returned ${(S == null ? void 0 : S.status) || "an unexpected status"} while preparing your analysis.`,
          { code: "warmup_status" }
        );
      } catch (S) {
        y = S;
      }
      if (g < c - 1 && o > 0) {
        const S = p > 0 ? p - (Date.now() - m) : o;
        if (p > 0 && S <= 0) break;
        await new Promise((x) => Un().setTimeout(x, Math.min(o, S)));
      }
    }
    throw y || new eo(this.connectionMessage(), { code: "warmup_failed" });
  }
  isRetryableResponse(n) {
    return [502, 503, 504].includes(Number(n == null ? void 0 : n.status));
  }
  isRetryableConnectionError(n) {
    return !(!(n instanceof eo) || n.code === "cancelled" || n.code === "timeout");
  }
  async fetchWithRetry(n, o = {}, {
    attempts: i = 3,
    retryDelayMs: a = 3e3,
    retryOnConnectionError: d = !0,
    onRetry: c
  } = {}) {
    const p = Math.max(1, Math.floor(Number(i) || 1));
    let m = null, y = null;
    for (let g = 0; g < p; g += 1) {
      try {
        const l = typeof o == "function" ? o(g) : o;
        if (m = await this.fetch(n, l), !this.isRetryableResponse(m) || g === p - 1) return m;
        c == null || c({
          attempt: g + 1,
          totalAttempts: p,
          reason: `HTTP ${m.status}`
        });
      } catch (l) {
        if (y = l, !(d && this.isRetryableConnectionError(l) && g < p - 1)) throw l;
        c == null || c({
          attempt: g + 1,
          totalAttempts: p,
          reason: (l == null ? void 0 : l.code) || "connection_error"
        });
      }
      a > 0 && await new Promise((l) => Un().setTimeout(l, a));
    }
    if (y) throw y;
    return m;
  }
}
var ci = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Ng(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var Gu = { exports: {} }, pe = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var _h;
function h1() {
  if (_h) return pe;
  _h = 1;
  var e = Symbol.for("react.element"), n = Symbol.for("react.portal"), o = Symbol.for("react.fragment"), i = Symbol.for("react.strict_mode"), a = Symbol.for("react.profiler"), d = Symbol.for("react.provider"), c = Symbol.for("react.context"), p = Symbol.for("react.forward_ref"), m = Symbol.for("react.suspense"), y = Symbol.for("react.memo"), g = Symbol.for("react.lazy"), l = Symbol.iterator;
  function f(N) {
    return N === null || typeof N != "object" ? null : (N = l && N[l] || N["@@iterator"], typeof N == "function" ? N : null);
  }
  var S = { isMounted: function() {
    return !1;
  }, enqueueForceUpdate: function() {
  }, enqueueReplaceState: function() {
  }, enqueueSetState: function() {
  } }, x = Object.assign, k = {};
  function A(N, L, fe) {
    this.props = N, this.context = L, this.refs = k, this.updater = fe || S;
  }
  A.prototype.isReactComponent = {}, A.prototype.setState = function(N, L) {
    if (typeof N != "object" && typeof N != "function" && N != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
    this.updater.enqueueSetState(this, N, L, "setState");
  }, A.prototype.forceUpdate = function(N) {
    this.updater.enqueueForceUpdate(this, N, "forceUpdate");
  };
  function T() {
  }
  T.prototype = A.prototype;
  function b(N, L, fe) {
    this.props = N, this.context = L, this.refs = k, this.updater = fe || S;
  }
  var E = b.prototype = new T();
  E.constructor = b, x(E, A.prototype), E.isPureReactComponent = !0;
  var D = Array.isArray, O = Object.prototype.hasOwnProperty, H = { current: null }, W = { key: !0, ref: !0, __self: !0, __source: !0 };
  function G(N, L, fe) {
    var me, ye = {}, ge = null, Ce = null;
    if (L != null) for (me in L.ref !== void 0 && (Ce = L.ref), L.key !== void 0 && (ge = "" + L.key), L) O.call(L, me) && !W.hasOwnProperty(me) && (ye[me] = L[me]);
    var xe = arguments.length - 2;
    if (xe === 1) ye.children = fe;
    else if (1 < xe) {
      for (var Re = Array(xe), gt = 0; gt < xe; gt++) Re[gt] = arguments[gt + 2];
      ye.children = Re;
    }
    if (N && N.defaultProps) for (me in xe = N.defaultProps, xe) ye[me] === void 0 && (ye[me] = xe[me]);
    return { $$typeof: e, type: N, key: ge, ref: Ce, props: ye, _owner: H.current };
  }
  function K(N, L) {
    return { $$typeof: e, type: N.type, key: L, ref: N.ref, props: N.props, _owner: N._owner };
  }
  function X(N) {
    return typeof N == "object" && N !== null && N.$$typeof === e;
  }
  function se(N) {
    var L = { "=": "=0", ":": "=2" };
    return "$" + N.replace(/[=:]/g, function(fe) {
      return L[fe];
    });
  }
  var Z = /\/+/g;
  function de(N, L) {
    return typeof N == "object" && N !== null && N.key != null ? se("" + N.key) : L.toString(36);
  }
  function ce(N, L, fe, me, ye) {
    var ge = typeof N;
    (ge === "undefined" || ge === "boolean") && (N = null);
    var Ce = !1;
    if (N === null) Ce = !0;
    else switch (ge) {
      case "string":
      case "number":
        Ce = !0;
        break;
      case "object":
        switch (N.$$typeof) {
          case e:
          case n:
            Ce = !0;
        }
    }
    if (Ce) return Ce = N, ye = ye(Ce), N = me === "" ? "." + de(Ce, 0) : me, D(ye) ? (fe = "", N != null && (fe = N.replace(Z, "$&/") + "/"), ce(ye, L, fe, "", function(gt) {
      return gt;
    })) : ye != null && (X(ye) && (ye = K(ye, fe + (!ye.key || Ce && Ce.key === ye.key ? "" : ("" + ye.key).replace(Z, "$&/") + "/") + N)), L.push(ye)), 1;
    if (Ce = 0, me = me === "" ? "." : me + ":", D(N)) for (var xe = 0; xe < N.length; xe++) {
      ge = N[xe];
      var Re = me + de(ge, xe);
      Ce += ce(ge, L, fe, Re, ye);
    }
    else if (Re = f(N), typeof Re == "function") for (N = Re.call(N), xe = 0; !(ge = N.next()).done; ) ge = ge.value, Re = me + de(ge, xe++), Ce += ce(ge, L, fe, Re, ye);
    else if (ge === "object") throw L = String(N), Error("Objects are not valid as a React child (found: " + (L === "[object Object]" ? "object with keys {" + Object.keys(N).join(", ") + "}" : L) + "). If you meant to render a collection of children, use an array instead.");
    return Ce;
  }
  function Se(N, L, fe) {
    if (N == null) return N;
    var me = [], ye = 0;
    return ce(N, me, "", "", function(ge) {
      return L.call(fe, ge, ye++);
    }), me;
  }
  function re(N) {
    if (N._status === -1) {
      var L = N._result;
      L = L(), L.then(function(fe) {
        (N._status === 0 || N._status === -1) && (N._status = 1, N._result = fe);
      }, function(fe) {
        (N._status === 0 || N._status === -1) && (N._status = 2, N._result = fe);
      }), N._status === -1 && (N._status = 0, N._result = L);
    }
    if (N._status === 1) return N._result.default;
    throw N._result;
  }
  var we = { current: null }, z = { transition: null }, J = { ReactCurrentDispatcher: we, ReactCurrentBatchConfig: z, ReactCurrentOwner: H };
  function Q() {
    throw Error("act(...) is not supported in production builds of React.");
  }
  return pe.Children = { map: Se, forEach: function(N, L, fe) {
    Se(N, function() {
      L.apply(this, arguments);
    }, fe);
  }, count: function(N) {
    var L = 0;
    return Se(N, function() {
      L++;
    }), L;
  }, toArray: function(N) {
    return Se(N, function(L) {
      return L;
    }) || [];
  }, only: function(N) {
    if (!X(N)) throw Error("React.Children.only expected to receive a single React element child.");
    return N;
  } }, pe.Component = A, pe.Fragment = o, pe.Profiler = a, pe.PureComponent = b, pe.StrictMode = i, pe.Suspense = m, pe.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = J, pe.act = Q, pe.cloneElement = function(N, L, fe) {
    if (N == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + N + ".");
    var me = x({}, N.props), ye = N.key, ge = N.ref, Ce = N._owner;
    if (L != null) {
      if (L.ref !== void 0 && (ge = L.ref, Ce = H.current), L.key !== void 0 && (ye = "" + L.key), N.type && N.type.defaultProps) var xe = N.type.defaultProps;
      for (Re in L) O.call(L, Re) && !W.hasOwnProperty(Re) && (me[Re] = L[Re] === void 0 && xe !== void 0 ? xe[Re] : L[Re]);
    }
    var Re = arguments.length - 2;
    if (Re === 1) me.children = fe;
    else if (1 < Re) {
      xe = Array(Re);
      for (var gt = 0; gt < Re; gt++) xe[gt] = arguments[gt + 2];
      me.children = xe;
    }
    return { $$typeof: e, type: N.type, key: ye, ref: ge, props: me, _owner: Ce };
  }, pe.createContext = function(N) {
    return N = { $$typeof: c, _currentValue: N, _currentValue2: N, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, N.Provider = { $$typeof: d, _context: N }, N.Consumer = N;
  }, pe.createElement = G, pe.createFactory = function(N) {
    var L = G.bind(null, N);
    return L.type = N, L;
  }, pe.createRef = function() {
    return { current: null };
  }, pe.forwardRef = function(N) {
    return { $$typeof: p, render: N };
  }, pe.isValidElement = X, pe.lazy = function(N) {
    return { $$typeof: g, _payload: { _status: -1, _result: N }, _init: re };
  }, pe.memo = function(N, L) {
    return { $$typeof: y, type: N, compare: L === void 0 ? null : L };
  }, pe.startTransition = function(N) {
    var L = z.transition;
    z.transition = {};
    try {
      N();
    } finally {
      z.transition = L;
    }
  }, pe.unstable_act = Q, pe.useCallback = function(N, L) {
    return we.current.useCallback(N, L);
  }, pe.useContext = function(N) {
    return we.current.useContext(N);
  }, pe.useDebugValue = function() {
  }, pe.useDeferredValue = function(N) {
    return we.current.useDeferredValue(N);
  }, pe.useEffect = function(N, L) {
    return we.current.useEffect(N, L);
  }, pe.useId = function() {
    return we.current.useId();
  }, pe.useImperativeHandle = function(N, L, fe) {
    return we.current.useImperativeHandle(N, L, fe);
  }, pe.useInsertionEffect = function(N, L) {
    return we.current.useInsertionEffect(N, L);
  }, pe.useLayoutEffect = function(N, L) {
    return we.current.useLayoutEffect(N, L);
  }, pe.useMemo = function(N, L) {
    return we.current.useMemo(N, L);
  }, pe.useReducer = function(N, L, fe) {
    return we.current.useReducer(N, L, fe);
  }, pe.useRef = function(N) {
    return we.current.useRef(N);
  }, pe.useState = function(N) {
    return we.current.useState(N);
  }, pe.useSyncExternalStore = function(N, L, fe) {
    return we.current.useSyncExternalStore(N, L, fe);
  }, pe.useTransition = function() {
    return we.current.useTransition();
  }, pe.version = "18.3.1", pe;
}
var Th;
function Td() {
  return Th || (Th = 1, Gu.exports = h1()), Gu.exports;
}
var C = Td();
const yn = /* @__PURE__ */ Ng(C), Pr = /* @__PURE__ */ u1({
  __proto__: null,
  default: yn
}, [C]);
var Gs = {}, Ku = { exports: {} }, ht = {}, Yu = { exports: {} }, Qu = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var kh;
function y1() {
  return kh || (kh = 1, (function(e) {
    function n(z, J) {
      var Q = z.length;
      z.push(J);
      e: for (; 0 < Q; ) {
        var N = Q - 1 >>> 1, L = z[N];
        if (0 < a(L, J)) z[N] = J, z[Q] = L, Q = N;
        else break e;
      }
    }
    function o(z) {
      return z.length === 0 ? null : z[0];
    }
    function i(z) {
      if (z.length === 0) return null;
      var J = z[0], Q = z.pop();
      if (Q !== J) {
        z[0] = Q;
        e: for (var N = 0, L = z.length, fe = L >>> 1; N < fe; ) {
          var me = 2 * (N + 1) - 1, ye = z[me], ge = me + 1, Ce = z[ge];
          if (0 > a(ye, Q)) ge < L && 0 > a(Ce, ye) ? (z[N] = Ce, z[ge] = Q, N = ge) : (z[N] = ye, z[me] = Q, N = me);
          else if (ge < L && 0 > a(Ce, Q)) z[N] = Ce, z[ge] = Q, N = ge;
          else break e;
        }
      }
      return J;
    }
    function a(z, J) {
      var Q = z.sortIndex - J.sortIndex;
      return Q !== 0 ? Q : z.id - J.id;
    }
    if (typeof performance == "object" && typeof performance.now == "function") {
      var d = performance;
      e.unstable_now = function() {
        return d.now();
      };
    } else {
      var c = Date, p = c.now();
      e.unstable_now = function() {
        return c.now() - p;
      };
    }
    var m = [], y = [], g = 1, l = null, f = 3, S = !1, x = !1, k = !1, A = typeof setTimeout == "function" ? setTimeout : null, T = typeof clearTimeout == "function" ? clearTimeout : null, b = typeof setImmediate < "u" ? setImmediate : null;
    typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
    function E(z) {
      for (var J = o(y); J !== null; ) {
        if (J.callback === null) i(y);
        else if (J.startTime <= z) i(y), J.sortIndex = J.expirationTime, n(m, J);
        else break;
        J = o(y);
      }
    }
    function D(z) {
      if (k = !1, E(z), !x) if (o(m) !== null) x = !0, re(O);
      else {
        var J = o(y);
        J !== null && we(D, J.startTime - z);
      }
    }
    function O(z, J) {
      x = !1, k && (k = !1, T(G), G = -1), S = !0;
      var Q = f;
      try {
        for (E(J), l = o(m); l !== null && (!(l.expirationTime > J) || z && !se()); ) {
          var N = l.callback;
          if (typeof N == "function") {
            l.callback = null, f = l.priorityLevel;
            var L = N(l.expirationTime <= J);
            J = e.unstable_now(), typeof L == "function" ? l.callback = L : l === o(m) && i(m), E(J);
          } else i(m);
          l = o(m);
        }
        if (l !== null) var fe = !0;
        else {
          var me = o(y);
          me !== null && we(D, me.startTime - J), fe = !1;
        }
        return fe;
      } finally {
        l = null, f = Q, S = !1;
      }
    }
    var H = !1, W = null, G = -1, K = 5, X = -1;
    function se() {
      return !(e.unstable_now() - X < K);
    }
    function Z() {
      if (W !== null) {
        var z = e.unstable_now();
        X = z;
        var J = !0;
        try {
          J = W(!0, z);
        } finally {
          J ? de() : (H = !1, W = null);
        }
      } else H = !1;
    }
    var de;
    if (typeof b == "function") de = function() {
      b(Z);
    };
    else if (typeof MessageChannel < "u") {
      var ce = new MessageChannel(), Se = ce.port2;
      ce.port1.onmessage = Z, de = function() {
        Se.postMessage(null);
      };
    } else de = function() {
      A(Z, 0);
    };
    function re(z) {
      W = z, H || (H = !0, de());
    }
    function we(z, J) {
      G = A(function() {
        z(e.unstable_now());
      }, J);
    }
    e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(z) {
      z.callback = null;
    }, e.unstable_continueExecution = function() {
      x || S || (x = !0, re(O));
    }, e.unstable_forceFrameRate = function(z) {
      0 > z || 125 < z ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : K = 0 < z ? Math.floor(1e3 / z) : 5;
    }, e.unstable_getCurrentPriorityLevel = function() {
      return f;
    }, e.unstable_getFirstCallbackNode = function() {
      return o(m);
    }, e.unstable_next = function(z) {
      switch (f) {
        case 1:
        case 2:
        case 3:
          var J = 3;
          break;
        default:
          J = f;
      }
      var Q = f;
      f = J;
      try {
        return z();
      } finally {
        f = Q;
      }
    }, e.unstable_pauseExecution = function() {
    }, e.unstable_requestPaint = function() {
    }, e.unstable_runWithPriority = function(z, J) {
      switch (z) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          z = 3;
      }
      var Q = f;
      f = z;
      try {
        return J();
      } finally {
        f = Q;
      }
    }, e.unstable_scheduleCallback = function(z, J, Q) {
      var N = e.unstable_now();
      switch (typeof Q == "object" && Q !== null ? (Q = Q.delay, Q = typeof Q == "number" && 0 < Q ? N + Q : N) : Q = N, z) {
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
      return L = Q + L, z = { id: g++, callback: J, priorityLevel: z, startTime: Q, expirationTime: L, sortIndex: -1 }, Q > N ? (z.sortIndex = Q, n(y, z), o(m) === null && z === o(y) && (k ? (T(G), G = -1) : k = !0, we(D, Q - N))) : (z.sortIndex = L, n(m, z), x || S || (x = !0, re(O))), z;
    }, e.unstable_shouldYield = se, e.unstable_wrapCallback = function(z) {
      var J = f;
      return function() {
        var Q = f;
        f = J;
        try {
          return z.apply(this, arguments);
        } finally {
          f = Q;
        }
      };
    };
  })(Qu)), Qu;
}
var Ah;
function g1() {
  return Ah || (Ah = 1, Yu.exports = y1()), Yu.exports;
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
var Ch;
function v1() {
  if (Ch) return ht;
  Ch = 1;
  var e = Td(), n = g1();
  function o(t) {
    for (var r = "https://reactjs.org/docs/error-decoder.html?invariant=" + t, s = 1; s < arguments.length; s++) r += "&args[]=" + encodeURIComponent(arguments[s]);
    return "Minified React error #" + t + "; visit " + r + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  var i = /* @__PURE__ */ new Set(), a = {};
  function d(t, r) {
    c(t, r), c(t + "Capture", r);
  }
  function c(t, r) {
    for (a[t] = r, t = 0; t < r.length; t++) i.add(r[t]);
  }
  var p = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), m = Object.prototype.hasOwnProperty, y = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, g = {}, l = {};
  function f(t) {
    return m.call(l, t) ? !0 : m.call(g, t) ? !1 : y.test(t) ? l[t] = !0 : (g[t] = !0, !1);
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
  function k(t, r, s, u, h, v, _) {
    this.acceptsBooleans = r === 2 || r === 3 || r === 4, this.attributeName = u, this.attributeNamespace = h, this.mustUseProperty = s, this.propertyName = t, this.type = r, this.sanitizeURL = v, this.removeEmptyString = _;
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
  var T = /[\-:]([a-z])/g;
  function b(t) {
    return t[1].toUpperCase();
  }
  "accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(t) {
    var r = t.replace(
      T,
      b
    );
    A[r] = new k(r, 1, !1, t, null, !1, !1);
  }), "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(t) {
    var r = t.replace(T, b);
    A[r] = new k(r, 1, !1, t, "http://www.w3.org/1999/xlink", !1, !1);
  }), ["xml:base", "xml:lang", "xml:space"].forEach(function(t) {
    var r = t.replace(T, b);
    A[r] = new k(r, 1, !1, t, "http://www.w3.org/XML/1998/namespace", !1, !1);
  }), ["tabIndex", "crossOrigin"].forEach(function(t) {
    A[t] = new k(t, 1, !1, t.toLowerCase(), null, !1, !1);
  }), A.xlinkHref = new k("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1), ["src", "href", "action", "formAction"].forEach(function(t) {
    A[t] = new k(t, 1, !1, t.toLowerCase(), null, !0, !0);
  });
  function E(t, r, s, u) {
    var h = A.hasOwnProperty(r) ? A[r] : null;
    (h !== null ? h.type !== 0 : u || !(2 < r.length) || r[0] !== "o" && r[0] !== "O" || r[1] !== "n" && r[1] !== "N") && (x(r, s, h, u) && (s = null), u || h === null ? f(r) && (s === null ? t.removeAttribute(r) : t.setAttribute(r, "" + s)) : h.mustUseProperty ? t[h.propertyName] = s === null ? h.type === 3 ? !1 : "" : s : (r = h.attributeName, u = h.attributeNamespace, s === null ? t.removeAttribute(r) : (h = h.type, s = h === 3 || h === 4 && s === !0 ? "" : "" + s, u ? t.setAttributeNS(u, r, s) : t.setAttribute(r, s))));
  }
  var D = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, O = Symbol.for("react.element"), H = Symbol.for("react.portal"), W = Symbol.for("react.fragment"), G = Symbol.for("react.strict_mode"), K = Symbol.for("react.profiler"), X = Symbol.for("react.provider"), se = Symbol.for("react.context"), Z = Symbol.for("react.forward_ref"), de = Symbol.for("react.suspense"), ce = Symbol.for("react.suspense_list"), Se = Symbol.for("react.memo"), re = Symbol.for("react.lazy"), we = Symbol.for("react.offscreen"), z = Symbol.iterator;
  function J(t) {
    return t === null || typeof t != "object" ? null : (t = z && t[z] || t["@@iterator"], typeof t == "function" ? t : null);
  }
  var Q = Object.assign, N;
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
  var fe = !1;
  function me(t, r) {
    if (!t || fe) return "";
    fe = !0;
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
`), _ = h.length - 1, P = v.length - 1; 1 <= _ && 0 <= P && h[_] !== v[P]; ) P--;
        for (; 1 <= _ && 0 <= P; _--, P--) if (h[_] !== v[P]) {
          if (_ !== 1 || P !== 1)
            do
              if (_--, P--, 0 > P || h[_] !== v[P]) {
                var M = `
` + h[_].replace(" at new ", " at ");
                return t.displayName && M.includes("<anonymous>") && (M = M.replace("<anonymous>", t.displayName)), M;
              }
            while (1 <= _ && 0 <= P);
          break;
        }
      }
    } finally {
      fe = !1, Error.prepareStackTrace = s;
    }
    return (t = t ? t.displayName || t.name : "") ? L(t) : "";
  }
  function ye(t) {
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
        return t = me(t.type, !1), t;
      case 11:
        return t = me(t.type.render, !1), t;
      case 1:
        return t = me(t.type, !0), t;
      default:
        return "";
    }
  }
  function ge(t) {
    if (t == null) return null;
    if (typeof t == "function") return t.displayName || t.name || null;
    if (typeof t == "string") return t;
    switch (t) {
      case W:
        return "Fragment";
      case H:
        return "Portal";
      case K:
        return "Profiler";
      case G:
        return "StrictMode";
      case de:
        return "Suspense";
      case ce:
        return "SuspenseList";
    }
    if (typeof t == "object") switch (t.$$typeof) {
      case se:
        return (t.displayName || "Context") + ".Consumer";
      case X:
        return (t._context.displayName || "Context") + ".Provider";
      case Z:
        var r = t.render;
        return t = t.displayName, t || (t = r.displayName || r.name || "", t = t !== "" ? "ForwardRef(" + t + ")" : "ForwardRef"), t;
      case Se:
        return r = t.displayName || null, r !== null ? r : ge(t.type) || "Memo";
      case re:
        r = t._payload, t = t._init;
        try {
          return ge(t(r));
        } catch {
        }
    }
    return null;
  }
  function Ce(t) {
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
        return ge(r);
      case 8:
        return r === G ? "StrictMode" : "Mode";
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
  function Re(t) {
    var r = t.type;
    return (t = t.nodeName) && t.toLowerCase() === "input" && (r === "checkbox" || r === "radio");
  }
  function gt(t) {
    var r = Re(t) ? "checked" : "value", s = Object.getOwnPropertyDescriptor(t.constructor.prototype, r), u = "" + t[r];
    if (!t.hasOwnProperty(r) && typeof s < "u" && typeof s.get == "function" && typeof s.set == "function") {
      var h = s.get, v = s.set;
      return Object.defineProperty(t, r, { configurable: !0, get: function() {
        return h.call(this);
      }, set: function(_) {
        u = "" + _, v.call(this, _);
      } }), Object.defineProperty(t, r, { enumerable: s.enumerable }), { getValue: function() {
        return u;
      }, setValue: function(_) {
        u = "" + _;
      }, stopTracking: function() {
        t._valueTracker = null, delete t[r];
      } };
    }
  }
  function Fi(t) {
    t._valueTracker || (t._valueTracker = gt(t));
  }
  function Af(t) {
    if (!t) return !1;
    var r = t._valueTracker;
    if (!r) return !0;
    var s = r.getValue(), u = "";
    return t && (u = Re(t) ? t.checked ? "true" : "false" : t.value), t = u, t !== s ? (r.setValue(t), !0) : !1;
  }
  function Oi(t) {
    if (t = t || (typeof document < "u" ? document : void 0), typeof t > "u") return null;
    try {
      return t.activeElement || t.body;
    } catch {
      return t.body;
    }
  }
  function qa(t, r) {
    var s = r.checked;
    return Q({}, r, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: s ?? t._wrapperState.initialChecked });
  }
  function Cf(t, r) {
    var s = r.defaultValue == null ? "" : r.defaultValue, u = r.checked != null ? r.checked : r.defaultChecked;
    s = xe(r.value != null ? r.value : s), t._wrapperState = { initialChecked: u, initialValue: s, controlled: r.type === "checkbox" || r.type === "radio" ? r.checked != null : r.value != null };
  }
  function bf(t, r) {
    r = r.checked, r != null && E(t, "checked", r, !1);
  }
  function el(t, r) {
    bf(t, r);
    var s = xe(r.value), u = r.type;
    if (s != null) u === "number" ? (s === 0 && t.value === "" || t.value != s) && (t.value = "" + s) : t.value !== "" + s && (t.value = "" + s);
    else if (u === "submit" || u === "reset") {
      t.removeAttribute("value");
      return;
    }
    r.hasOwnProperty("value") ? tl(t, r.type, s) : r.hasOwnProperty("defaultValue") && tl(t, r.type, xe(r.defaultValue)), r.checked == null && r.defaultChecked != null && (t.defaultChecked = !!r.defaultChecked);
  }
  function Pf(t, r, s) {
    if (r.hasOwnProperty("value") || r.hasOwnProperty("defaultValue")) {
      var u = r.type;
      if (!(u !== "submit" && u !== "reset" || r.value !== void 0 && r.value !== null)) return;
      r = "" + t._wrapperState.initialValue, s || r === t.value || (t.value = r), t.defaultValue = r;
    }
    s = t.name, s !== "" && (t.name = ""), t.defaultChecked = !!t._wrapperState.initialChecked, s !== "" && (t.name = s);
  }
  function tl(t, r, s) {
    (r !== "number" || Oi(t.ownerDocument) !== t) && (s == null ? t.defaultValue = "" + t._wrapperState.initialValue : t.defaultValue !== "" + s && (t.defaultValue = "" + s));
  }
  var Ao = Array.isArray;
  function Er(t, r, s, u) {
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
  function nl(t, r) {
    if (r.dangerouslySetInnerHTML != null) throw Error(o(91));
    return Q({}, r, { value: void 0, defaultValue: void 0, children: "" + t._wrapperState.initialValue });
  }
  function Ef(t, r) {
    var s = r.value;
    if (s == null) {
      if (s = r.children, r = r.defaultValue, s != null) {
        if (r != null) throw Error(o(92));
        if (Ao(s)) {
          if (1 < s.length) throw Error(o(93));
          s = s[0];
        }
        r = s;
      }
      r == null && (r = ""), s = r;
    }
    t._wrapperState = { initialValue: xe(s) };
  }
  function Mf(t, r) {
    var s = xe(r.value), u = xe(r.defaultValue);
    s != null && (s = "" + s, s !== t.value && (t.value = s), r.defaultValue == null && t.defaultValue !== s && (t.defaultValue = s)), u != null && (t.defaultValue = "" + u);
  }
  function Rf(t) {
    var r = t.textContent;
    r === t._wrapperState.initialValue && r !== "" && r !== null && (t.value = r);
  }
  function Df(t) {
    switch (t) {
      case "svg":
        return "http://www.w3.org/2000/svg";
      case "math":
        return "http://www.w3.org/1998/Math/MathML";
      default:
        return "http://www.w3.org/1999/xhtml";
    }
  }
  function rl(t, r) {
    return t == null || t === "http://www.w3.org/1999/xhtml" ? Df(r) : t === "http://www.w3.org/2000/svg" && r === "foreignObject" ? "http://www.w3.org/1999/xhtml" : t;
  }
  var Li, Nf = (function(t) {
    return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(r, s, u, h) {
      MSApp.execUnsafeLocalFunction(function() {
        return t(r, s, u, h);
      });
    } : t;
  })(function(t, r) {
    if (t.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in t) t.innerHTML = r;
    else {
      for (Li = Li || document.createElement("div"), Li.innerHTML = "<svg>" + r.valueOf().toString() + "</svg>", r = Li.firstChild; t.firstChild; ) t.removeChild(t.firstChild);
      for (; r.firstChild; ) t.appendChild(r.firstChild);
    }
  });
  function Co(t, r) {
    if (r) {
      var s = t.firstChild;
      if (s && s === t.lastChild && s.nodeType === 3) {
        s.nodeValue = r;
        return;
      }
    }
    t.textContent = r;
  }
  var bo = {
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
  }, pw = ["Webkit", "ms", "Moz", "O"];
  Object.keys(bo).forEach(function(t) {
    pw.forEach(function(r) {
      r = r + t.charAt(0).toUpperCase() + t.substring(1), bo[r] = bo[t];
    });
  });
  function jf(t, r, s) {
    return r == null || typeof r == "boolean" || r === "" ? "" : s || typeof r != "number" || r === 0 || bo.hasOwnProperty(t) && bo[t] ? ("" + r).trim() : r + "px";
  }
  function If(t, r) {
    t = t.style;
    for (var s in r) if (r.hasOwnProperty(s)) {
      var u = s.indexOf("--") === 0, h = jf(s, r[s], u);
      s === "float" && (s = "cssFloat"), u ? t.setProperty(s, h) : t[s] = h;
    }
  }
  var mw = Q({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
  function ol(t, r) {
    if (r) {
      if (mw[t] && (r.children != null || r.dangerouslySetInnerHTML != null)) throw Error(o(137, t));
      if (r.dangerouslySetInnerHTML != null) {
        if (r.children != null) throw Error(o(60));
        if (typeof r.dangerouslySetInnerHTML != "object" || !("__html" in r.dangerouslySetInnerHTML)) throw Error(o(61));
      }
      if (r.style != null && typeof r.style != "object") throw Error(o(62));
    }
  }
  function il(t, r) {
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
  var sl = null;
  function al(t) {
    return t = t.target || t.srcElement || window, t.correspondingUseElement && (t = t.correspondingUseElement), t.nodeType === 3 ? t.parentNode : t;
  }
  var ll = null, Mr = null, Rr = null;
  function Ff(t) {
    if (t = Qo(t)) {
      if (typeof ll != "function") throw Error(o(280));
      var r = t.stateNode;
      r && (r = as(r), ll(t.stateNode, t.type, r));
    }
  }
  function Of(t) {
    Mr ? Rr ? Rr.push(t) : Rr = [t] : Mr = t;
  }
  function Lf() {
    if (Mr) {
      var t = Mr, r = Rr;
      if (Rr = Mr = null, Ff(t), r) for (t = 0; t < r.length; t++) Ff(r[t]);
    }
  }
  function Vf(t, r) {
    return t(r);
  }
  function Bf() {
  }
  var ul = !1;
  function zf(t, r, s) {
    if (ul) return t(r, s);
    ul = !0;
    try {
      return Vf(t, r, s);
    } finally {
      ul = !1, (Mr !== null || Rr !== null) && (Bf(), Lf());
    }
  }
  function Po(t, r) {
    var s = t.stateNode;
    if (s === null) return null;
    var u = as(s);
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
  var cl = !1;
  if (p) try {
    var Eo = {};
    Object.defineProperty(Eo, "passive", { get: function() {
      cl = !0;
    } }), window.addEventListener("test", Eo, Eo), window.removeEventListener("test", Eo, Eo);
  } catch {
    cl = !1;
  }
  function hw(t, r, s, u, h, v, _, P, M) {
    var F = Array.prototype.slice.call(arguments, 3);
    try {
      r.apply(s, F);
    } catch (B) {
      this.onError(B);
    }
  }
  var Mo = !1, Vi = null, Bi = !1, dl = null, yw = { onError: function(t) {
    Mo = !0, Vi = t;
  } };
  function gw(t, r, s, u, h, v, _, P, M) {
    Mo = !1, Vi = null, hw.apply(yw, arguments);
  }
  function vw(t, r, s, u, h, v, _, P, M) {
    if (gw.apply(this, arguments), Mo) {
      if (Mo) {
        var F = Vi;
        Mo = !1, Vi = null;
      } else throw Error(o(198));
      Bi || (Bi = !0, dl = F);
    }
  }
  function er(t) {
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
  function $f(t) {
    if (t.tag === 13) {
      var r = t.memoizedState;
      if (r === null && (t = t.alternate, t !== null && (r = t.memoizedState)), r !== null) return r.dehydrated;
    }
    return null;
  }
  function Uf(t) {
    if (er(t) !== t) throw Error(o(188));
  }
  function Sw(t) {
    var r = t.alternate;
    if (!r) {
      if (r = er(t), r === null) throw Error(o(188));
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
          if (v === s) return Uf(h), t;
          if (v === u) return Uf(h), r;
          v = v.sibling;
        }
        throw Error(o(188));
      }
      if (s.return !== u.return) s = h, u = v;
      else {
        for (var _ = !1, P = h.child; P; ) {
          if (P === s) {
            _ = !0, s = h, u = v;
            break;
          }
          if (P === u) {
            _ = !0, u = h, s = v;
            break;
          }
          P = P.sibling;
        }
        if (!_) {
          for (P = v.child; P; ) {
            if (P === s) {
              _ = !0, s = v, u = h;
              break;
            }
            if (P === u) {
              _ = !0, u = v, s = h;
              break;
            }
            P = P.sibling;
          }
          if (!_) throw Error(o(189));
        }
      }
      if (s.alternate !== u) throw Error(o(190));
    }
    if (s.tag !== 3) throw Error(o(188));
    return s.stateNode.current === s ? t : r;
  }
  function Hf(t) {
    return t = Sw(t), t !== null ? Wf(t) : null;
  }
  function Wf(t) {
    if (t.tag === 5 || t.tag === 6) return t;
    for (t = t.child; t !== null; ) {
      var r = Wf(t);
      if (r !== null) return r;
      t = t.sibling;
    }
    return null;
  }
  var Gf = n.unstable_scheduleCallback, Kf = n.unstable_cancelCallback, ww = n.unstable_shouldYield, xw = n.unstable_requestPaint, Oe = n.unstable_now, _w = n.unstable_getCurrentPriorityLevel, fl = n.unstable_ImmediatePriority, Yf = n.unstable_UserBlockingPriority, zi = n.unstable_NormalPriority, Tw = n.unstable_LowPriority, Qf = n.unstable_IdlePriority, $i = null, Kt = null;
  function kw(t) {
    if (Kt && typeof Kt.onCommitFiberRoot == "function") try {
      Kt.onCommitFiberRoot($i, t, void 0, (t.current.flags & 128) === 128);
    } catch {
    }
  }
  var jt = Math.clz32 ? Math.clz32 : bw, Aw = Math.log, Cw = Math.LN2;
  function bw(t) {
    return t >>>= 0, t === 0 ? 32 : 31 - (Aw(t) / Cw | 0) | 0;
  }
  var Ui = 64, Hi = 4194304;
  function Ro(t) {
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
  function Wi(t, r) {
    var s = t.pendingLanes;
    if (s === 0) return 0;
    var u = 0, h = t.suspendedLanes, v = t.pingedLanes, _ = s & 268435455;
    if (_ !== 0) {
      var P = _ & ~h;
      P !== 0 ? u = Ro(P) : (v &= _, v !== 0 && (u = Ro(v)));
    } else _ = s & ~h, _ !== 0 ? u = Ro(_) : v !== 0 && (u = Ro(v));
    if (u === 0) return 0;
    if (r !== 0 && r !== u && (r & h) === 0 && (h = u & -u, v = r & -r, h >= v || h === 16 && (v & 4194240) !== 0)) return r;
    if ((u & 4) !== 0 && (u |= s & 16), r = t.entangledLanes, r !== 0) for (t = t.entanglements, r &= u; 0 < r; ) s = 31 - jt(r), h = 1 << s, u |= t[s], r &= ~h;
    return u;
  }
  function Pw(t, r) {
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
  function Ew(t, r) {
    for (var s = t.suspendedLanes, u = t.pingedLanes, h = t.expirationTimes, v = t.pendingLanes; 0 < v; ) {
      var _ = 31 - jt(v), P = 1 << _, M = h[_];
      M === -1 ? ((P & s) === 0 || (P & u) !== 0) && (h[_] = Pw(P, r)) : M <= r && (t.expiredLanes |= P), v &= ~P;
    }
  }
  function pl(t) {
    return t = t.pendingLanes & -1073741825, t !== 0 ? t : t & 1073741824 ? 1073741824 : 0;
  }
  function Xf() {
    var t = Ui;
    return Ui <<= 1, (Ui & 4194240) === 0 && (Ui = 64), t;
  }
  function ml(t) {
    for (var r = [], s = 0; 31 > s; s++) r.push(t);
    return r;
  }
  function Do(t, r, s) {
    t.pendingLanes |= r, r !== 536870912 && (t.suspendedLanes = 0, t.pingedLanes = 0), t = t.eventTimes, r = 31 - jt(r), t[r] = s;
  }
  function Mw(t, r) {
    var s = t.pendingLanes & ~r;
    t.pendingLanes = r, t.suspendedLanes = 0, t.pingedLanes = 0, t.expiredLanes &= r, t.mutableReadLanes &= r, t.entangledLanes &= r, r = t.entanglements;
    var u = t.eventTimes;
    for (t = t.expirationTimes; 0 < s; ) {
      var h = 31 - jt(s), v = 1 << h;
      r[h] = 0, u[h] = -1, t[h] = -1, s &= ~v;
    }
  }
  function hl(t, r) {
    var s = t.entangledLanes |= r;
    for (t = t.entanglements; s; ) {
      var u = 31 - jt(s), h = 1 << u;
      h & r | t[u] & r && (t[u] |= r), s &= ~h;
    }
  }
  var _e = 0;
  function Zf(t) {
    return t &= -t, 1 < t ? 4 < t ? (t & 268435455) !== 0 ? 16 : 536870912 : 4 : 1;
  }
  var Jf, yl, qf, ep, tp, gl = !1, Gi = [], _n = null, Tn = null, kn = null, No = /* @__PURE__ */ new Map(), jo = /* @__PURE__ */ new Map(), An = [], Rw = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
  function np(t, r) {
    switch (t) {
      case "focusin":
      case "focusout":
        _n = null;
        break;
      case "dragenter":
      case "dragleave":
        Tn = null;
        break;
      case "mouseover":
      case "mouseout":
        kn = null;
        break;
      case "pointerover":
      case "pointerout":
        No.delete(r.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        jo.delete(r.pointerId);
    }
  }
  function Io(t, r, s, u, h, v) {
    return t === null || t.nativeEvent !== v ? (t = { blockedOn: r, domEventName: s, eventSystemFlags: u, nativeEvent: v, targetContainers: [h] }, r !== null && (r = Qo(r), r !== null && yl(r)), t) : (t.eventSystemFlags |= u, r = t.targetContainers, h !== null && r.indexOf(h) === -1 && r.push(h), t);
  }
  function Dw(t, r, s, u, h) {
    switch (r) {
      case "focusin":
        return _n = Io(_n, t, r, s, u, h), !0;
      case "dragenter":
        return Tn = Io(Tn, t, r, s, u, h), !0;
      case "mouseover":
        return kn = Io(kn, t, r, s, u, h), !0;
      case "pointerover":
        var v = h.pointerId;
        return No.set(v, Io(No.get(v) || null, t, r, s, u, h)), !0;
      case "gotpointercapture":
        return v = h.pointerId, jo.set(v, Io(jo.get(v) || null, t, r, s, u, h)), !0;
    }
    return !1;
  }
  function rp(t) {
    var r = tr(t.target);
    if (r !== null) {
      var s = er(r);
      if (s !== null) {
        if (r = s.tag, r === 13) {
          if (r = $f(s), r !== null) {
            t.blockedOn = r, tp(t.priority, function() {
              qf(s);
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
  function Ki(t) {
    if (t.blockedOn !== null) return !1;
    for (var r = t.targetContainers; 0 < r.length; ) {
      var s = Sl(t.domEventName, t.eventSystemFlags, r[0], t.nativeEvent);
      if (s === null) {
        s = t.nativeEvent;
        var u = new s.constructor(s.type, s);
        sl = u, s.target.dispatchEvent(u), sl = null;
      } else return r = Qo(s), r !== null && yl(r), t.blockedOn = s, !1;
      r.shift();
    }
    return !0;
  }
  function op(t, r, s) {
    Ki(t) && s.delete(r);
  }
  function Nw() {
    gl = !1, _n !== null && Ki(_n) && (_n = null), Tn !== null && Ki(Tn) && (Tn = null), kn !== null && Ki(kn) && (kn = null), No.forEach(op), jo.forEach(op);
  }
  function Fo(t, r) {
    t.blockedOn === r && (t.blockedOn = null, gl || (gl = !0, n.unstable_scheduleCallback(n.unstable_NormalPriority, Nw)));
  }
  function Oo(t) {
    function r(h) {
      return Fo(h, t);
    }
    if (0 < Gi.length) {
      Fo(Gi[0], t);
      for (var s = 1; s < Gi.length; s++) {
        var u = Gi[s];
        u.blockedOn === t && (u.blockedOn = null);
      }
    }
    for (_n !== null && Fo(_n, t), Tn !== null && Fo(Tn, t), kn !== null && Fo(kn, t), No.forEach(r), jo.forEach(r), s = 0; s < An.length; s++) u = An[s], u.blockedOn === t && (u.blockedOn = null);
    for (; 0 < An.length && (s = An[0], s.blockedOn === null); ) rp(s), s.blockedOn === null && An.shift();
  }
  var Dr = D.ReactCurrentBatchConfig, Yi = !0;
  function jw(t, r, s, u) {
    var h = _e, v = Dr.transition;
    Dr.transition = null;
    try {
      _e = 1, vl(t, r, s, u);
    } finally {
      _e = h, Dr.transition = v;
    }
  }
  function Iw(t, r, s, u) {
    var h = _e, v = Dr.transition;
    Dr.transition = null;
    try {
      _e = 4, vl(t, r, s, u);
    } finally {
      _e = h, Dr.transition = v;
    }
  }
  function vl(t, r, s, u) {
    if (Yi) {
      var h = Sl(t, r, s, u);
      if (h === null) Fl(t, r, u, Qi, s), np(t, u);
      else if (Dw(h, t, r, s, u)) u.stopPropagation();
      else if (np(t, u), r & 4 && -1 < Rw.indexOf(t)) {
        for (; h !== null; ) {
          var v = Qo(h);
          if (v !== null && Jf(v), v = Sl(t, r, s, u), v === null && Fl(t, r, u, Qi, s), v === h) break;
          h = v;
        }
        h !== null && u.stopPropagation();
      } else Fl(t, r, u, null, s);
    }
  }
  var Qi = null;
  function Sl(t, r, s, u) {
    if (Qi = null, t = al(u), t = tr(t), t !== null) if (r = er(t), r === null) t = null;
    else if (s = r.tag, s === 13) {
      if (t = $f(r), t !== null) return t;
      t = null;
    } else if (s === 3) {
      if (r.stateNode.current.memoizedState.isDehydrated) return r.tag === 3 ? r.stateNode.containerInfo : null;
      t = null;
    } else r !== t && (t = null);
    return Qi = t, null;
  }
  function ip(t) {
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
        switch (_w()) {
          case fl:
            return 1;
          case Yf:
            return 4;
          case zi:
          case Tw:
            return 16;
          case Qf:
            return 536870912;
          default:
            return 16;
        }
      default:
        return 16;
    }
  }
  var Cn = null, wl = null, Xi = null;
  function sp() {
    if (Xi) return Xi;
    var t, r = wl, s = r.length, u, h = "value" in Cn ? Cn.value : Cn.textContent, v = h.length;
    for (t = 0; t < s && r[t] === h[t]; t++) ;
    var _ = s - t;
    for (u = 1; u <= _ && r[s - u] === h[v - u]; u++) ;
    return Xi = h.slice(t, 1 < u ? 1 - u : void 0);
  }
  function Zi(t) {
    var r = t.keyCode;
    return "charCode" in t ? (t = t.charCode, t === 0 && r === 13 && (t = 13)) : t = r, t === 10 && (t = 13), 32 <= t || t === 13 ? t : 0;
  }
  function Ji() {
    return !0;
  }
  function ap() {
    return !1;
  }
  function vt(t) {
    function r(s, u, h, v, _) {
      this._reactName = s, this._targetInst = h, this.type = u, this.nativeEvent = v, this.target = _, this.currentTarget = null;
      for (var P in t) t.hasOwnProperty(P) && (s = t[P], this[P] = s ? s(v) : v[P]);
      return this.isDefaultPrevented = (v.defaultPrevented != null ? v.defaultPrevented : v.returnValue === !1) ? Ji : ap, this.isPropagationStopped = ap, this;
    }
    return Q(r.prototype, { preventDefault: function() {
      this.defaultPrevented = !0;
      var s = this.nativeEvent;
      s && (s.preventDefault ? s.preventDefault() : typeof s.returnValue != "unknown" && (s.returnValue = !1), this.isDefaultPrevented = Ji);
    }, stopPropagation: function() {
      var s = this.nativeEvent;
      s && (s.stopPropagation ? s.stopPropagation() : typeof s.cancelBubble != "unknown" && (s.cancelBubble = !0), this.isPropagationStopped = Ji);
    }, persist: function() {
    }, isPersistent: Ji }), r;
  }
  var Nr = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(t) {
    return t.timeStamp || Date.now();
  }, defaultPrevented: 0, isTrusted: 0 }, xl = vt(Nr), Lo = Q({}, Nr, { view: 0, detail: 0 }), Fw = vt(Lo), _l, Tl, Vo, qi = Q({}, Lo, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: Al, button: 0, buttons: 0, relatedTarget: function(t) {
    return t.relatedTarget === void 0 ? t.fromElement === t.srcElement ? t.toElement : t.fromElement : t.relatedTarget;
  }, movementX: function(t) {
    return "movementX" in t ? t.movementX : (t !== Vo && (Vo && t.type === "mousemove" ? (_l = t.screenX - Vo.screenX, Tl = t.screenY - Vo.screenY) : Tl = _l = 0, Vo = t), _l);
  }, movementY: function(t) {
    return "movementY" in t ? t.movementY : Tl;
  } }), lp = vt(qi), Ow = Q({}, qi, { dataTransfer: 0 }), Lw = vt(Ow), Vw = Q({}, Lo, { relatedTarget: 0 }), kl = vt(Vw), Bw = Q({}, Nr, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), zw = vt(Bw), $w = Q({}, Nr, { clipboardData: function(t) {
    return "clipboardData" in t ? t.clipboardData : window.clipboardData;
  } }), Uw = vt($w), Hw = Q({}, Nr, { data: 0 }), up = vt(Hw), Ww = {
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
  }, Gw = {
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
  }, Kw = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
  function Yw(t) {
    var r = this.nativeEvent;
    return r.getModifierState ? r.getModifierState(t) : (t = Kw[t]) ? !!r[t] : !1;
  }
  function Al() {
    return Yw;
  }
  var Qw = Q({}, Lo, { key: function(t) {
    if (t.key) {
      var r = Ww[t.key] || t.key;
      if (r !== "Unidentified") return r;
    }
    return t.type === "keypress" ? (t = Zi(t), t === 13 ? "Enter" : String.fromCharCode(t)) : t.type === "keydown" || t.type === "keyup" ? Gw[t.keyCode] || "Unidentified" : "";
  }, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: Al, charCode: function(t) {
    return t.type === "keypress" ? Zi(t) : 0;
  }, keyCode: function(t) {
    return t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
  }, which: function(t) {
    return t.type === "keypress" ? Zi(t) : t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
  } }), Xw = vt(Qw), Zw = Q({}, qi, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), cp = vt(Zw), Jw = Q({}, Lo, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: Al }), qw = vt(Jw), ex = Q({}, Nr, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), tx = vt(ex), nx = Q({}, qi, {
    deltaX: function(t) {
      return "deltaX" in t ? t.deltaX : "wheelDeltaX" in t ? -t.wheelDeltaX : 0;
    },
    deltaY: function(t) {
      return "deltaY" in t ? t.deltaY : "wheelDeltaY" in t ? -t.wheelDeltaY : "wheelDelta" in t ? -t.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), rx = vt(nx), ox = [9, 13, 27, 32], Cl = p && "CompositionEvent" in window, Bo = null;
  p && "documentMode" in document && (Bo = document.documentMode);
  var ix = p && "TextEvent" in window && !Bo, dp = p && (!Cl || Bo && 8 < Bo && 11 >= Bo), fp = " ", pp = !1;
  function mp(t, r) {
    switch (t) {
      case "keyup":
        return ox.indexOf(r.keyCode) !== -1;
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
  function hp(t) {
    return t = t.detail, typeof t == "object" && "data" in t ? t.data : null;
  }
  var jr = !1;
  function sx(t, r) {
    switch (t) {
      case "compositionend":
        return hp(r);
      case "keypress":
        return r.which !== 32 ? null : (pp = !0, fp);
      case "textInput":
        return t = r.data, t === fp && pp ? null : t;
      default:
        return null;
    }
  }
  function ax(t, r) {
    if (jr) return t === "compositionend" || !Cl && mp(t, r) ? (t = sp(), Xi = wl = Cn = null, jr = !1, t) : null;
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
        return dp && r.locale !== "ko" ? null : r.data;
      default:
        return null;
    }
  }
  var lx = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
  function yp(t) {
    var r = t && t.nodeName && t.nodeName.toLowerCase();
    return r === "input" ? !!lx[t.type] : r === "textarea";
  }
  function gp(t, r, s, u) {
    Of(u), r = os(r, "onChange"), 0 < r.length && (s = new xl("onChange", "change", null, s, u), t.push({ event: s, listeners: r }));
  }
  var zo = null, $o = null;
  function ux(t) {
    Ip(t, 0);
  }
  function es(t) {
    var r = Vr(t);
    if (Af(r)) return t;
  }
  function cx(t, r) {
    if (t === "change") return r;
  }
  var vp = !1;
  if (p) {
    var bl;
    if (p) {
      var Pl = "oninput" in document;
      if (!Pl) {
        var Sp = document.createElement("div");
        Sp.setAttribute("oninput", "return;"), Pl = typeof Sp.oninput == "function";
      }
      bl = Pl;
    } else bl = !1;
    vp = bl && (!document.documentMode || 9 < document.documentMode);
  }
  function wp() {
    zo && (zo.detachEvent("onpropertychange", xp), $o = zo = null);
  }
  function xp(t) {
    if (t.propertyName === "value" && es($o)) {
      var r = [];
      gp(r, $o, t, al(t)), zf(ux, r);
    }
  }
  function dx(t, r, s) {
    t === "focusin" ? (wp(), zo = r, $o = s, zo.attachEvent("onpropertychange", xp)) : t === "focusout" && wp();
  }
  function fx(t) {
    if (t === "selectionchange" || t === "keyup" || t === "keydown") return es($o);
  }
  function px(t, r) {
    if (t === "click") return es(r);
  }
  function mx(t, r) {
    if (t === "input" || t === "change") return es(r);
  }
  function hx(t, r) {
    return t === r && (t !== 0 || 1 / t === 1 / r) || t !== t && r !== r;
  }
  var It = typeof Object.is == "function" ? Object.is : hx;
  function Uo(t, r) {
    if (It(t, r)) return !0;
    if (typeof t != "object" || t === null || typeof r != "object" || r === null) return !1;
    var s = Object.keys(t), u = Object.keys(r);
    if (s.length !== u.length) return !1;
    for (u = 0; u < s.length; u++) {
      var h = s[u];
      if (!m.call(r, h) || !It(t[h], r[h])) return !1;
    }
    return !0;
  }
  function _p(t) {
    for (; t && t.firstChild; ) t = t.firstChild;
    return t;
  }
  function Tp(t, r) {
    var s = _p(t);
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
      s = _p(s);
    }
  }
  function kp(t, r) {
    return t && r ? t === r ? !0 : t && t.nodeType === 3 ? !1 : r && r.nodeType === 3 ? kp(t, r.parentNode) : "contains" in t ? t.contains(r) : t.compareDocumentPosition ? !!(t.compareDocumentPosition(r) & 16) : !1 : !1;
  }
  function Ap() {
    for (var t = window, r = Oi(); r instanceof t.HTMLIFrameElement; ) {
      try {
        var s = typeof r.contentWindow.location.href == "string";
      } catch {
        s = !1;
      }
      if (s) t = r.contentWindow;
      else break;
      r = Oi(t.document);
    }
    return r;
  }
  function El(t) {
    var r = t && t.nodeName && t.nodeName.toLowerCase();
    return r && (r === "input" && (t.type === "text" || t.type === "search" || t.type === "tel" || t.type === "url" || t.type === "password") || r === "textarea" || t.contentEditable === "true");
  }
  function yx(t) {
    var r = Ap(), s = t.focusedElem, u = t.selectionRange;
    if (r !== s && s && s.ownerDocument && kp(s.ownerDocument.documentElement, s)) {
      if (u !== null && El(s)) {
        if (r = u.start, t = u.end, t === void 0 && (t = r), "selectionStart" in s) s.selectionStart = r, s.selectionEnd = Math.min(t, s.value.length);
        else if (t = (r = s.ownerDocument || document) && r.defaultView || window, t.getSelection) {
          t = t.getSelection();
          var h = s.textContent.length, v = Math.min(u.start, h);
          u = u.end === void 0 ? v : Math.min(u.end, h), !t.extend && v > u && (h = u, u = v, v = h), h = Tp(s, v);
          var _ = Tp(
            s,
            u
          );
          h && _ && (t.rangeCount !== 1 || t.anchorNode !== h.node || t.anchorOffset !== h.offset || t.focusNode !== _.node || t.focusOffset !== _.offset) && (r = r.createRange(), r.setStart(h.node, h.offset), t.removeAllRanges(), v > u ? (t.addRange(r), t.extend(_.node, _.offset)) : (r.setEnd(_.node, _.offset), t.addRange(r)));
        }
      }
      for (r = [], t = s; t = t.parentNode; ) t.nodeType === 1 && r.push({ element: t, left: t.scrollLeft, top: t.scrollTop });
      for (typeof s.focus == "function" && s.focus(), s = 0; s < r.length; s++) t = r[s], t.element.scrollLeft = t.left, t.element.scrollTop = t.top;
    }
  }
  var gx = p && "documentMode" in document && 11 >= document.documentMode, Ir = null, Ml = null, Ho = null, Rl = !1;
  function Cp(t, r, s) {
    var u = s.window === s ? s.document : s.nodeType === 9 ? s : s.ownerDocument;
    Rl || Ir == null || Ir !== Oi(u) || (u = Ir, "selectionStart" in u && El(u) ? u = { start: u.selectionStart, end: u.selectionEnd } : (u = (u.ownerDocument && u.ownerDocument.defaultView || window).getSelection(), u = { anchorNode: u.anchorNode, anchorOffset: u.anchorOffset, focusNode: u.focusNode, focusOffset: u.focusOffset }), Ho && Uo(Ho, u) || (Ho = u, u = os(Ml, "onSelect"), 0 < u.length && (r = new xl("onSelect", "select", null, r, s), t.push({ event: r, listeners: u }), r.target = Ir)));
  }
  function ts(t, r) {
    var s = {};
    return s[t.toLowerCase()] = r.toLowerCase(), s["Webkit" + t] = "webkit" + r, s["Moz" + t] = "moz" + r, s;
  }
  var Fr = { animationend: ts("Animation", "AnimationEnd"), animationiteration: ts("Animation", "AnimationIteration"), animationstart: ts("Animation", "AnimationStart"), transitionend: ts("Transition", "TransitionEnd") }, Dl = {}, bp = {};
  p && (bp = document.createElement("div").style, "AnimationEvent" in window || (delete Fr.animationend.animation, delete Fr.animationiteration.animation, delete Fr.animationstart.animation), "TransitionEvent" in window || delete Fr.transitionend.transition);
  function ns(t) {
    if (Dl[t]) return Dl[t];
    if (!Fr[t]) return t;
    var r = Fr[t], s;
    for (s in r) if (r.hasOwnProperty(s) && s in bp) return Dl[t] = r[s];
    return t;
  }
  var Pp = ns("animationend"), Ep = ns("animationiteration"), Mp = ns("animationstart"), Rp = ns("transitionend"), Dp = /* @__PURE__ */ new Map(), Np = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
  function bn(t, r) {
    Dp.set(t, r), d(r, [t]);
  }
  for (var Nl = 0; Nl < Np.length; Nl++) {
    var jl = Np[Nl], vx = jl.toLowerCase(), Sx = jl[0].toUpperCase() + jl.slice(1);
    bn(vx, "on" + Sx);
  }
  bn(Pp, "onAnimationEnd"), bn(Ep, "onAnimationIteration"), bn(Mp, "onAnimationStart"), bn("dblclick", "onDoubleClick"), bn("focusin", "onFocus"), bn("focusout", "onBlur"), bn(Rp, "onTransitionEnd"), c("onMouseEnter", ["mouseout", "mouseover"]), c("onMouseLeave", ["mouseout", "mouseover"]), c("onPointerEnter", ["pointerout", "pointerover"]), c("onPointerLeave", ["pointerout", "pointerover"]), d("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), d("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), d("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]), d("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), d("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), d("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
  var Wo = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), wx = new Set("cancel close invalid load scroll toggle".split(" ").concat(Wo));
  function jp(t, r, s) {
    var u = t.type || "unknown-event";
    t.currentTarget = s, vw(u, r, void 0, t), t.currentTarget = null;
  }
  function Ip(t, r) {
    r = (r & 4) !== 0;
    for (var s = 0; s < t.length; s++) {
      var u = t[s], h = u.event;
      u = u.listeners;
      e: {
        var v = void 0;
        if (r) for (var _ = u.length - 1; 0 <= _; _--) {
          var P = u[_], M = P.instance, F = P.currentTarget;
          if (P = P.listener, M !== v && h.isPropagationStopped()) break e;
          jp(h, P, F), v = M;
        }
        else for (_ = 0; _ < u.length; _++) {
          if (P = u[_], M = P.instance, F = P.currentTarget, P = P.listener, M !== v && h.isPropagationStopped()) break e;
          jp(h, P, F), v = M;
        }
      }
    }
    if (Bi) throw t = dl, Bi = !1, dl = null, t;
  }
  function Ee(t, r) {
    var s = r[$l];
    s === void 0 && (s = r[$l] = /* @__PURE__ */ new Set());
    var u = t + "__bubble";
    s.has(u) || (Fp(r, t, 2, !1), s.add(u));
  }
  function Il(t, r, s) {
    var u = 0;
    r && (u |= 4), Fp(s, t, u, r);
  }
  var rs = "_reactListening" + Math.random().toString(36).slice(2);
  function Go(t) {
    if (!t[rs]) {
      t[rs] = !0, i.forEach(function(s) {
        s !== "selectionchange" && (wx.has(s) || Il(s, !1, t), Il(s, !0, t));
      });
      var r = t.nodeType === 9 ? t : t.ownerDocument;
      r === null || r[rs] || (r[rs] = !0, Il("selectionchange", !1, r));
    }
  }
  function Fp(t, r, s, u) {
    switch (ip(r)) {
      case 1:
        var h = jw;
        break;
      case 4:
        h = Iw;
        break;
      default:
        h = vl;
    }
    s = h.bind(null, r, s, t), h = void 0, !cl || r !== "touchstart" && r !== "touchmove" && r !== "wheel" || (h = !0), u ? h !== void 0 ? t.addEventListener(r, s, { capture: !0, passive: h }) : t.addEventListener(r, s, !0) : h !== void 0 ? t.addEventListener(r, s, { passive: h }) : t.addEventListener(r, s, !1);
  }
  function Fl(t, r, s, u, h) {
    var v = u;
    if ((r & 1) === 0 && (r & 2) === 0 && u !== null) e: for (; ; ) {
      if (u === null) return;
      var _ = u.tag;
      if (_ === 3 || _ === 4) {
        var P = u.stateNode.containerInfo;
        if (P === h || P.nodeType === 8 && P.parentNode === h) break;
        if (_ === 4) for (_ = u.return; _ !== null; ) {
          var M = _.tag;
          if ((M === 3 || M === 4) && (M = _.stateNode.containerInfo, M === h || M.nodeType === 8 && M.parentNode === h)) return;
          _ = _.return;
        }
        for (; P !== null; ) {
          if (_ = tr(P), _ === null) return;
          if (M = _.tag, M === 5 || M === 6) {
            u = v = _;
            continue e;
          }
          P = P.parentNode;
        }
      }
      u = u.return;
    }
    zf(function() {
      var F = v, B = al(s), $ = [];
      e: {
        var V = Dp.get(t);
        if (V !== void 0) {
          var q = xl, te = t;
          switch (t) {
            case "keypress":
              if (Zi(s) === 0) break e;
            case "keydown":
            case "keyup":
              q = Xw;
              break;
            case "focusin":
              te = "focus", q = kl;
              break;
            case "focusout":
              te = "blur", q = kl;
              break;
            case "beforeblur":
            case "afterblur":
              q = kl;
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
              q = lp;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              q = Lw;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              q = qw;
              break;
            case Pp:
            case Ep:
            case Mp:
              q = zw;
              break;
            case Rp:
              q = tx;
              break;
            case "scroll":
              q = Fw;
              break;
            case "wheel":
              q = rx;
              break;
            case "copy":
            case "cut":
            case "paste":
              q = Uw;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              q = cp;
          }
          var oe = (r & 4) !== 0, Le = !oe && t === "scroll", j = oe ? V !== null ? V + "Capture" : null : V;
          oe = [];
          for (var R = F, I; R !== null; ) {
            I = R;
            var U = I.stateNode;
            if (I.tag === 5 && U !== null && (I = U, j !== null && (U = Po(R, j), U != null && oe.push(Ko(R, U, I)))), Le) break;
            R = R.return;
          }
          0 < oe.length && (V = new q(V, te, null, s, B), $.push({ event: V, listeners: oe }));
        }
      }
      if ((r & 7) === 0) {
        e: {
          if (V = t === "mouseover" || t === "pointerover", q = t === "mouseout" || t === "pointerout", V && s !== sl && (te = s.relatedTarget || s.fromElement) && (tr(te) || te[sn])) break e;
          if ((q || V) && (V = B.window === B ? B : (V = B.ownerDocument) ? V.defaultView || V.parentWindow : window, q ? (te = s.relatedTarget || s.toElement, q = F, te = te ? tr(te) : null, te !== null && (Le = er(te), te !== Le || te.tag !== 5 && te.tag !== 6) && (te = null)) : (q = null, te = F), q !== te)) {
            if (oe = lp, U = "onMouseLeave", j = "onMouseEnter", R = "mouse", (t === "pointerout" || t === "pointerover") && (oe = cp, U = "onPointerLeave", j = "onPointerEnter", R = "pointer"), Le = q == null ? V : Vr(q), I = te == null ? V : Vr(te), V = new oe(U, R + "leave", q, s, B), V.target = Le, V.relatedTarget = I, U = null, tr(B) === F && (oe = new oe(j, R + "enter", te, s, B), oe.target = I, oe.relatedTarget = Le, U = oe), Le = U, q && te) t: {
              for (oe = q, j = te, R = 0, I = oe; I; I = Or(I)) R++;
              for (I = 0, U = j; U; U = Or(U)) I++;
              for (; 0 < R - I; ) oe = Or(oe), R--;
              for (; 0 < I - R; ) j = Or(j), I--;
              for (; R--; ) {
                if (oe === j || j !== null && oe === j.alternate) break t;
                oe = Or(oe), j = Or(j);
              }
              oe = null;
            }
            else oe = null;
            q !== null && Op($, V, q, oe, !1), te !== null && Le !== null && Op($, Le, te, oe, !0);
          }
        }
        e: {
          if (V = F ? Vr(F) : window, q = V.nodeName && V.nodeName.toLowerCase(), q === "select" || q === "input" && V.type === "file") var ie = cx;
          else if (yp(V)) if (vp) ie = mx;
          else {
            ie = fx;
            var ae = dx;
          }
          else (q = V.nodeName) && q.toLowerCase() === "input" && (V.type === "checkbox" || V.type === "radio") && (ie = px);
          if (ie && (ie = ie(t, F))) {
            gp($, ie, s, B);
            break e;
          }
          ae && ae(t, V, F), t === "focusout" && (ae = V._wrapperState) && ae.controlled && V.type === "number" && tl(V, "number", V.value);
        }
        switch (ae = F ? Vr(F) : window, t) {
          case "focusin":
            (yp(ae) || ae.contentEditable === "true") && (Ir = ae, Ml = F, Ho = null);
            break;
          case "focusout":
            Ho = Ml = Ir = null;
            break;
          case "mousedown":
            Rl = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            Rl = !1, Cp($, s, B);
            break;
          case "selectionchange":
            if (gx) break;
          case "keydown":
          case "keyup":
            Cp($, s, B);
        }
        var le;
        if (Cl) e: {
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
        else jr ? mp(t, s) && (ue = "onCompositionEnd") : t === "keydown" && s.keyCode === 229 && (ue = "onCompositionStart");
        ue && (dp && s.locale !== "ko" && (jr || ue !== "onCompositionStart" ? ue === "onCompositionEnd" && jr && (le = sp()) : (Cn = B, wl = "value" in Cn ? Cn.value : Cn.textContent, jr = !0)), ae = os(F, ue), 0 < ae.length && (ue = new up(ue, t, null, s, B), $.push({ event: ue, listeners: ae }), le ? ue.data = le : (le = hp(s), le !== null && (ue.data = le)))), (le = ix ? sx(t, s) : ax(t, s)) && (F = os(F, "onBeforeInput"), 0 < F.length && (B = new up("onBeforeInput", "beforeinput", null, s, B), $.push({ event: B, listeners: F }), B.data = le));
      }
      Ip($, r);
    });
  }
  function Ko(t, r, s) {
    return { instance: t, listener: r, currentTarget: s };
  }
  function os(t, r) {
    for (var s = r + "Capture", u = []; t !== null; ) {
      var h = t, v = h.stateNode;
      h.tag === 5 && v !== null && (h = v, v = Po(t, s), v != null && u.unshift(Ko(t, v, h)), v = Po(t, r), v != null && u.push(Ko(t, v, h))), t = t.return;
    }
    return u;
  }
  function Or(t) {
    if (t === null) return null;
    do
      t = t.return;
    while (t && t.tag !== 5);
    return t || null;
  }
  function Op(t, r, s, u, h) {
    for (var v = r._reactName, _ = []; s !== null && s !== u; ) {
      var P = s, M = P.alternate, F = P.stateNode;
      if (M !== null && M === u) break;
      P.tag === 5 && F !== null && (P = F, h ? (M = Po(s, v), M != null && _.unshift(Ko(s, M, P))) : h || (M = Po(s, v), M != null && _.push(Ko(s, M, P)))), s = s.return;
    }
    _.length !== 0 && t.push({ event: r, listeners: _ });
  }
  var xx = /\r\n?/g, _x = /\u0000|\uFFFD/g;
  function Lp(t) {
    return (typeof t == "string" ? t : "" + t).replace(xx, `
`).replace(_x, "");
  }
  function is(t, r, s) {
    if (r = Lp(r), Lp(t) !== r && s) throw Error(o(425));
  }
  function ss() {
  }
  var Ol = null, Ll = null;
  function Vl(t, r) {
    return t === "textarea" || t === "noscript" || typeof r.children == "string" || typeof r.children == "number" || typeof r.dangerouslySetInnerHTML == "object" && r.dangerouslySetInnerHTML !== null && r.dangerouslySetInnerHTML.__html != null;
  }
  var Bl = typeof setTimeout == "function" ? setTimeout : void 0, Tx = typeof clearTimeout == "function" ? clearTimeout : void 0, Vp = typeof Promise == "function" ? Promise : void 0, kx = typeof queueMicrotask == "function" ? queueMicrotask : typeof Vp < "u" ? function(t) {
    return Vp.resolve(null).then(t).catch(Ax);
  } : Bl;
  function Ax(t) {
    setTimeout(function() {
      throw t;
    });
  }
  function zl(t, r) {
    var s = r, u = 0;
    do {
      var h = s.nextSibling;
      if (t.removeChild(s), h && h.nodeType === 8) if (s = h.data, s === "/$") {
        if (u === 0) {
          t.removeChild(h), Oo(r);
          return;
        }
        u--;
      } else s !== "$" && s !== "$?" && s !== "$!" || u++;
      s = h;
    } while (s);
    Oo(r);
  }
  function Pn(t) {
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
  function Bp(t) {
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
  var Lr = Math.random().toString(36).slice(2), Yt = "__reactFiber$" + Lr, Yo = "__reactProps$" + Lr, sn = "__reactContainer$" + Lr, $l = "__reactEvents$" + Lr, Cx = "__reactListeners$" + Lr, bx = "__reactHandles$" + Lr;
  function tr(t) {
    var r = t[Yt];
    if (r) return r;
    for (var s = t.parentNode; s; ) {
      if (r = s[sn] || s[Yt]) {
        if (s = r.alternate, r.child !== null || s !== null && s.child !== null) for (t = Bp(t); t !== null; ) {
          if (s = t[Yt]) return s;
          t = Bp(t);
        }
        return r;
      }
      t = s, s = t.parentNode;
    }
    return null;
  }
  function Qo(t) {
    return t = t[Yt] || t[sn], !t || t.tag !== 5 && t.tag !== 6 && t.tag !== 13 && t.tag !== 3 ? null : t;
  }
  function Vr(t) {
    if (t.tag === 5 || t.tag === 6) return t.stateNode;
    throw Error(o(33));
  }
  function as(t) {
    return t[Yo] || null;
  }
  var Ul = [], Br = -1;
  function En(t) {
    return { current: t };
  }
  function Me(t) {
    0 > Br || (t.current = Ul[Br], Ul[Br] = null, Br--);
  }
  function be(t, r) {
    Br++, Ul[Br] = t.current, t.current = r;
  }
  var Mn = {}, qe = En(Mn), ct = En(!1), nr = Mn;
  function zr(t, r) {
    var s = t.type.contextTypes;
    if (!s) return Mn;
    var u = t.stateNode;
    if (u && u.__reactInternalMemoizedUnmaskedChildContext === r) return u.__reactInternalMemoizedMaskedChildContext;
    var h = {}, v;
    for (v in s) h[v] = r[v];
    return u && (t = t.stateNode, t.__reactInternalMemoizedUnmaskedChildContext = r, t.__reactInternalMemoizedMaskedChildContext = h), h;
  }
  function dt(t) {
    return t = t.childContextTypes, t != null;
  }
  function ls() {
    Me(ct), Me(qe);
  }
  function zp(t, r, s) {
    if (qe.current !== Mn) throw Error(o(168));
    be(qe, r), be(ct, s);
  }
  function $p(t, r, s) {
    var u = t.stateNode;
    if (r = r.childContextTypes, typeof u.getChildContext != "function") return s;
    u = u.getChildContext();
    for (var h in u) if (!(h in r)) throw Error(o(108, Ce(t) || "Unknown", h));
    return Q({}, s, u);
  }
  function us(t) {
    return t = (t = t.stateNode) && t.__reactInternalMemoizedMergedChildContext || Mn, nr = qe.current, be(qe, t), be(ct, ct.current), !0;
  }
  function Up(t, r, s) {
    var u = t.stateNode;
    if (!u) throw Error(o(169));
    s ? (t = $p(t, r, nr), u.__reactInternalMemoizedMergedChildContext = t, Me(ct), Me(qe), be(qe, t)) : Me(ct), be(ct, s);
  }
  var an = null, cs = !1, Hl = !1;
  function Hp(t) {
    an === null ? an = [t] : an.push(t);
  }
  function Px(t) {
    cs = !0, Hp(t);
  }
  function Rn() {
    if (!Hl && an !== null) {
      Hl = !0;
      var t = 0, r = _e;
      try {
        var s = an;
        for (_e = 1; t < s.length; t++) {
          var u = s[t];
          do
            u = u(!0);
          while (u !== null);
        }
        an = null, cs = !1;
      } catch (h) {
        throw an !== null && (an = an.slice(t + 1)), Gf(fl, Rn), h;
      } finally {
        _e = r, Hl = !1;
      }
    }
    return null;
  }
  var $r = [], Ur = 0, ds = null, fs = 0, Tt = [], kt = 0, rr = null, ln = 1, un = "";
  function or(t, r) {
    $r[Ur++] = fs, $r[Ur++] = ds, ds = t, fs = r;
  }
  function Wp(t, r, s) {
    Tt[kt++] = ln, Tt[kt++] = un, Tt[kt++] = rr, rr = t;
    var u = ln;
    t = un;
    var h = 32 - jt(u) - 1;
    u &= ~(1 << h), s += 1;
    var v = 32 - jt(r) + h;
    if (30 < v) {
      var _ = h - h % 5;
      v = (u & (1 << _) - 1).toString(32), u >>= _, h -= _, ln = 1 << 32 - jt(r) + h | s << h | u, un = v + t;
    } else ln = 1 << v | s << h | u, un = t;
  }
  function Wl(t) {
    t.return !== null && (or(t, 1), Wp(t, 1, 0));
  }
  function Gl(t) {
    for (; t === ds; ) ds = $r[--Ur], $r[Ur] = null, fs = $r[--Ur], $r[Ur] = null;
    for (; t === rr; ) rr = Tt[--kt], Tt[kt] = null, un = Tt[--kt], Tt[kt] = null, ln = Tt[--kt], Tt[kt] = null;
  }
  var St = null, wt = null, De = !1, Ft = null;
  function Gp(t, r) {
    var s = Pt(5, null, null, 0);
    s.elementType = "DELETED", s.stateNode = r, s.return = t, r = t.deletions, r === null ? (t.deletions = [s], t.flags |= 16) : r.push(s);
  }
  function Kp(t, r) {
    switch (t.tag) {
      case 5:
        var s = t.type;
        return r = r.nodeType !== 1 || s.toLowerCase() !== r.nodeName.toLowerCase() ? null : r, r !== null ? (t.stateNode = r, St = t, wt = Pn(r.firstChild), !0) : !1;
      case 6:
        return r = t.pendingProps === "" || r.nodeType !== 3 ? null : r, r !== null ? (t.stateNode = r, St = t, wt = null, !0) : !1;
      case 13:
        return r = r.nodeType !== 8 ? null : r, r !== null ? (s = rr !== null ? { id: ln, overflow: un } : null, t.memoizedState = { dehydrated: r, treeContext: s, retryLane: 1073741824 }, s = Pt(18, null, null, 0), s.stateNode = r, s.return = t, t.child = s, St = t, wt = null, !0) : !1;
      default:
        return !1;
    }
  }
  function Kl(t) {
    return (t.mode & 1) !== 0 && (t.flags & 128) === 0;
  }
  function Yl(t) {
    if (De) {
      var r = wt;
      if (r) {
        var s = r;
        if (!Kp(t, r)) {
          if (Kl(t)) throw Error(o(418));
          r = Pn(s.nextSibling);
          var u = St;
          r && Kp(t, r) ? Gp(u, s) : (t.flags = t.flags & -4097 | 2, De = !1, St = t);
        }
      } else {
        if (Kl(t)) throw Error(o(418));
        t.flags = t.flags & -4097 | 2, De = !1, St = t;
      }
    }
  }
  function Yp(t) {
    for (t = t.return; t !== null && t.tag !== 5 && t.tag !== 3 && t.tag !== 13; ) t = t.return;
    St = t;
  }
  function ps(t) {
    if (t !== St) return !1;
    if (!De) return Yp(t), De = !0, !1;
    var r;
    if ((r = t.tag !== 3) && !(r = t.tag !== 5) && (r = t.type, r = r !== "head" && r !== "body" && !Vl(t.type, t.memoizedProps)), r && (r = wt)) {
      if (Kl(t)) throw Qp(), Error(o(418));
      for (; r; ) Gp(t, r), r = Pn(r.nextSibling);
    }
    if (Yp(t), t.tag === 13) {
      if (t = t.memoizedState, t = t !== null ? t.dehydrated : null, !t) throw Error(o(317));
      e: {
        for (t = t.nextSibling, r = 0; t; ) {
          if (t.nodeType === 8) {
            var s = t.data;
            if (s === "/$") {
              if (r === 0) {
                wt = Pn(t.nextSibling);
                break e;
              }
              r--;
            } else s !== "$" && s !== "$!" && s !== "$?" || r++;
          }
          t = t.nextSibling;
        }
        wt = null;
      }
    } else wt = St ? Pn(t.stateNode.nextSibling) : null;
    return !0;
  }
  function Qp() {
    for (var t = wt; t; ) t = Pn(t.nextSibling);
  }
  function Hr() {
    wt = St = null, De = !1;
  }
  function Ql(t) {
    Ft === null ? Ft = [t] : Ft.push(t);
  }
  var Ex = D.ReactCurrentBatchConfig;
  function Xo(t, r, s) {
    if (t = s.ref, t !== null && typeof t != "function" && typeof t != "object") {
      if (s._owner) {
        if (s = s._owner, s) {
          if (s.tag !== 1) throw Error(o(309));
          var u = s.stateNode;
        }
        if (!u) throw Error(o(147, t));
        var h = u, v = "" + t;
        return r !== null && r.ref !== null && typeof r.ref == "function" && r.ref._stringRef === v ? r.ref : (r = function(_) {
          var P = h.refs;
          _ === null ? delete P[v] : P[v] = _;
        }, r._stringRef = v, r);
      }
      if (typeof t != "string") throw Error(o(284));
      if (!s._owner) throw Error(o(290, t));
    }
    return t;
  }
  function ms(t, r) {
    throw t = Object.prototype.toString.call(r), Error(o(31, t === "[object Object]" ? "object with keys {" + Object.keys(r).join(", ") + "}" : t));
  }
  function Xp(t) {
    var r = t._init;
    return r(t._payload);
  }
  function Zp(t) {
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
      return j = Vn(j, R), j.index = 0, j.sibling = null, j;
    }
    function v(j, R, I) {
      return j.index = I, t ? (I = j.alternate, I !== null ? (I = I.index, I < R ? (j.flags |= 2, R) : I) : (j.flags |= 2, R)) : (j.flags |= 1048576, R);
    }
    function _(j) {
      return t && j.alternate === null && (j.flags |= 2), j;
    }
    function P(j, R, I, U) {
      return R === null || R.tag !== 6 ? (R = Bu(I, j.mode, U), R.return = j, R) : (R = h(R, I), R.return = j, R);
    }
    function M(j, R, I, U) {
      var ie = I.type;
      return ie === W ? B(j, R, I.props.children, U, I.key) : R !== null && (R.elementType === ie || typeof ie == "object" && ie !== null && ie.$$typeof === re && Xp(ie) === R.type) ? (U = h(R, I.props), U.ref = Xo(j, R, I), U.return = j, U) : (U = Ls(I.type, I.key, I.props, null, j.mode, U), U.ref = Xo(j, R, I), U.return = j, U);
    }
    function F(j, R, I, U) {
      return R === null || R.tag !== 4 || R.stateNode.containerInfo !== I.containerInfo || R.stateNode.implementation !== I.implementation ? (R = zu(I, j.mode, U), R.return = j, R) : (R = h(R, I.children || []), R.return = j, R);
    }
    function B(j, R, I, U, ie) {
      return R === null || R.tag !== 7 ? (R = fr(I, j.mode, U, ie), R.return = j, R) : (R = h(R, I), R.return = j, R);
    }
    function $(j, R, I) {
      if (typeof R == "string" && R !== "" || typeof R == "number") return R = Bu("" + R, j.mode, I), R.return = j, R;
      if (typeof R == "object" && R !== null) {
        switch (R.$$typeof) {
          case O:
            return I = Ls(R.type, R.key, R.props, null, j.mode, I), I.ref = Xo(j, null, R), I.return = j, I;
          case H:
            return R = zu(R, j.mode, I), R.return = j, R;
          case re:
            var U = R._init;
            return $(j, U(R._payload), I);
        }
        if (Ao(R) || J(R)) return R = fr(R, j.mode, I, null), R.return = j, R;
        ms(j, R);
      }
      return null;
    }
    function V(j, R, I, U) {
      var ie = R !== null ? R.key : null;
      if (typeof I == "string" && I !== "" || typeof I == "number") return ie !== null ? null : P(j, R, "" + I, U);
      if (typeof I == "object" && I !== null) {
        switch (I.$$typeof) {
          case O:
            return I.key === ie ? M(j, R, I, U) : null;
          case H:
            return I.key === ie ? F(j, R, I, U) : null;
          case re:
            return ie = I._init, V(
              j,
              R,
              ie(I._payload),
              U
            );
        }
        if (Ao(I) || J(I)) return ie !== null ? null : B(j, R, I, U, null);
        ms(j, I);
      }
      return null;
    }
    function q(j, R, I, U, ie) {
      if (typeof U == "string" && U !== "" || typeof U == "number") return j = j.get(I) || null, P(R, j, "" + U, ie);
      if (typeof U == "object" && U !== null) {
        switch (U.$$typeof) {
          case O:
            return j = j.get(U.key === null ? I : U.key) || null, M(R, j, U, ie);
          case H:
            return j = j.get(U.key === null ? I : U.key) || null, F(R, j, U, ie);
          case re:
            var ae = U._init;
            return q(j, R, I, ae(U._payload), ie);
        }
        if (Ao(U) || J(U)) return j = j.get(I) || null, B(R, j, U, ie, null);
        ms(R, U);
      }
      return null;
    }
    function te(j, R, I, U) {
      for (var ie = null, ae = null, le = R, ue = R = 0, Ge = null; le !== null && ue < I.length; ue++) {
        le.index > ue ? (Ge = le, le = null) : Ge = le.sibling;
        var ve = V(j, le, I[ue], U);
        if (ve === null) {
          le === null && (le = Ge);
          break;
        }
        t && le && ve.alternate === null && r(j, le), R = v(ve, R, ue), ae === null ? ie = ve : ae.sibling = ve, ae = ve, le = Ge;
      }
      if (ue === I.length) return s(j, le), De && or(j, ue), ie;
      if (le === null) {
        for (; ue < I.length; ue++) le = $(j, I[ue], U), le !== null && (R = v(le, R, ue), ae === null ? ie = le : ae.sibling = le, ae = le);
        return De && or(j, ue), ie;
      }
      for (le = u(j, le); ue < I.length; ue++) Ge = q(le, j, ue, I[ue], U), Ge !== null && (t && Ge.alternate !== null && le.delete(Ge.key === null ? ue : Ge.key), R = v(Ge, R, ue), ae === null ? ie = Ge : ae.sibling = Ge, ae = Ge);
      return t && le.forEach(function(Bn) {
        return r(j, Bn);
      }), De && or(j, ue), ie;
    }
    function oe(j, R, I, U) {
      var ie = J(I);
      if (typeof ie != "function") throw Error(o(150));
      if (I = ie.call(I), I == null) throw Error(o(151));
      for (var ae = ie = null, le = R, ue = R = 0, Ge = null, ve = I.next(); le !== null && !ve.done; ue++, ve = I.next()) {
        le.index > ue ? (Ge = le, le = null) : Ge = le.sibling;
        var Bn = V(j, le, ve.value, U);
        if (Bn === null) {
          le === null && (le = Ge);
          break;
        }
        t && le && Bn.alternate === null && r(j, le), R = v(Bn, R, ue), ae === null ? ie = Bn : ae.sibling = Bn, ae = Bn, le = Ge;
      }
      if (ve.done) return s(
        j,
        le
      ), De && or(j, ue), ie;
      if (le === null) {
        for (; !ve.done; ue++, ve = I.next()) ve = $(j, ve.value, U), ve !== null && (R = v(ve, R, ue), ae === null ? ie = ve : ae.sibling = ve, ae = ve);
        return De && or(j, ue), ie;
      }
      for (le = u(j, le); !ve.done; ue++, ve = I.next()) ve = q(le, j, ue, ve.value, U), ve !== null && (t && ve.alternate !== null && le.delete(ve.key === null ? ue : ve.key), R = v(ve, R, ue), ae === null ? ie = ve : ae.sibling = ve, ae = ve);
      return t && le.forEach(function(l1) {
        return r(j, l1);
      }), De && or(j, ue), ie;
    }
    function Le(j, R, I, U) {
      if (typeof I == "object" && I !== null && I.type === W && I.key === null && (I = I.props.children), typeof I == "object" && I !== null) {
        switch (I.$$typeof) {
          case O:
            e: {
              for (var ie = I.key, ae = R; ae !== null; ) {
                if (ae.key === ie) {
                  if (ie = I.type, ie === W) {
                    if (ae.tag === 7) {
                      s(j, ae.sibling), R = h(ae, I.props.children), R.return = j, j = R;
                      break e;
                    }
                  } else if (ae.elementType === ie || typeof ie == "object" && ie !== null && ie.$$typeof === re && Xp(ie) === ae.type) {
                    s(j, ae.sibling), R = h(ae, I.props), R.ref = Xo(j, ae, I), R.return = j, j = R;
                    break e;
                  }
                  s(j, ae);
                  break;
                } else r(j, ae);
                ae = ae.sibling;
              }
              I.type === W ? (R = fr(I.props.children, j.mode, U, I.key), R.return = j, j = R) : (U = Ls(I.type, I.key, I.props, null, j.mode, U), U.ref = Xo(j, R, I), U.return = j, j = U);
            }
            return _(j);
          case H:
            e: {
              for (ae = I.key; R !== null; ) {
                if (R.key === ae) if (R.tag === 4 && R.stateNode.containerInfo === I.containerInfo && R.stateNode.implementation === I.implementation) {
                  s(j, R.sibling), R = h(R, I.children || []), R.return = j, j = R;
                  break e;
                } else {
                  s(j, R);
                  break;
                }
                else r(j, R);
                R = R.sibling;
              }
              R = zu(I, j.mode, U), R.return = j, j = R;
            }
            return _(j);
          case re:
            return ae = I._init, Le(j, R, ae(I._payload), U);
        }
        if (Ao(I)) return te(j, R, I, U);
        if (J(I)) return oe(j, R, I, U);
        ms(j, I);
      }
      return typeof I == "string" && I !== "" || typeof I == "number" ? (I = "" + I, R !== null && R.tag === 6 ? (s(j, R.sibling), R = h(R, I), R.return = j, j = R) : (s(j, R), R = Bu(I, j.mode, U), R.return = j, j = R), _(j)) : s(j, R);
    }
    return Le;
  }
  var Wr = Zp(!0), Jp = Zp(!1), hs = En(null), ys = null, Gr = null, Xl = null;
  function Zl() {
    Xl = Gr = ys = null;
  }
  function Jl(t) {
    var r = hs.current;
    Me(hs), t._currentValue = r;
  }
  function ql(t, r, s) {
    for (; t !== null; ) {
      var u = t.alternate;
      if ((t.childLanes & r) !== r ? (t.childLanes |= r, u !== null && (u.childLanes |= r)) : u !== null && (u.childLanes & r) !== r && (u.childLanes |= r), t === s) break;
      t = t.return;
    }
  }
  function Kr(t, r) {
    ys = t, Xl = Gr = null, t = t.dependencies, t !== null && t.firstContext !== null && ((t.lanes & r) !== 0 && (ft = !0), t.firstContext = null);
  }
  function At(t) {
    var r = t._currentValue;
    if (Xl !== t) if (t = { context: t, memoizedValue: r, next: null }, Gr === null) {
      if (ys === null) throw Error(o(308));
      Gr = t, ys.dependencies = { lanes: 0, firstContext: t };
    } else Gr = Gr.next = t;
    return r;
  }
  var ir = null;
  function eu(t) {
    ir === null ? ir = [t] : ir.push(t);
  }
  function qp(t, r, s, u) {
    var h = r.interleaved;
    return h === null ? (s.next = s, eu(r)) : (s.next = h.next, h.next = s), r.interleaved = s, cn(t, u);
  }
  function cn(t, r) {
    t.lanes |= r;
    var s = t.alternate;
    for (s !== null && (s.lanes |= r), s = t, t = t.return; t !== null; ) t.childLanes |= r, s = t.alternate, s !== null && (s.childLanes |= r), s = t, t = t.return;
    return s.tag === 3 ? s.stateNode : null;
  }
  var Dn = !1;
  function tu(t) {
    t.updateQueue = { baseState: t.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
  }
  function em(t, r) {
    t = t.updateQueue, r.updateQueue === t && (r.updateQueue = { baseState: t.baseState, firstBaseUpdate: t.firstBaseUpdate, lastBaseUpdate: t.lastBaseUpdate, shared: t.shared, effects: t.effects });
  }
  function dn(t, r) {
    return { eventTime: t, lane: r, tag: 0, payload: null, callback: null, next: null };
  }
  function Nn(t, r, s) {
    var u = t.updateQueue;
    if (u === null) return null;
    if (u = u.shared, (he & 2) !== 0) {
      var h = u.pending;
      return h === null ? r.next = r : (r.next = h.next, h.next = r), u.pending = r, cn(t, s);
    }
    return h = u.interleaved, h === null ? (r.next = r, eu(u)) : (r.next = h.next, h.next = r), u.interleaved = r, cn(t, s);
  }
  function gs(t, r, s) {
    if (r = r.updateQueue, r !== null && (r = r.shared, (s & 4194240) !== 0)) {
      var u = r.lanes;
      u &= t.pendingLanes, s |= u, r.lanes = s, hl(t, s);
    }
  }
  function tm(t, r) {
    var s = t.updateQueue, u = t.alternate;
    if (u !== null && (u = u.updateQueue, s === u)) {
      var h = null, v = null;
      if (s = s.firstBaseUpdate, s !== null) {
        do {
          var _ = { eventTime: s.eventTime, lane: s.lane, tag: s.tag, payload: s.payload, callback: s.callback, next: null };
          v === null ? h = v = _ : v = v.next = _, s = s.next;
        } while (s !== null);
        v === null ? h = v = r : v = v.next = r;
      } else h = v = r;
      s = { baseState: u.baseState, firstBaseUpdate: h, lastBaseUpdate: v, shared: u.shared, effects: u.effects }, t.updateQueue = s;
      return;
    }
    t = s.lastBaseUpdate, t === null ? s.firstBaseUpdate = r : t.next = r, s.lastBaseUpdate = r;
  }
  function vs(t, r, s, u) {
    var h = t.updateQueue;
    Dn = !1;
    var v = h.firstBaseUpdate, _ = h.lastBaseUpdate, P = h.shared.pending;
    if (P !== null) {
      h.shared.pending = null;
      var M = P, F = M.next;
      M.next = null, _ === null ? v = F : _.next = F, _ = M;
      var B = t.alternate;
      B !== null && (B = B.updateQueue, P = B.lastBaseUpdate, P !== _ && (P === null ? B.firstBaseUpdate = F : P.next = F, B.lastBaseUpdate = M));
    }
    if (v !== null) {
      var $ = h.baseState;
      _ = 0, B = F = M = null, P = v;
      do {
        var V = P.lane, q = P.eventTime;
        if ((u & V) === V) {
          B !== null && (B = B.next = {
            eventTime: q,
            lane: 0,
            tag: P.tag,
            payload: P.payload,
            callback: P.callback,
            next: null
          });
          e: {
            var te = t, oe = P;
            switch (V = r, q = s, oe.tag) {
              case 1:
                if (te = oe.payload, typeof te == "function") {
                  $ = te.call(q, $, V);
                  break e;
                }
                $ = te;
                break e;
              case 3:
                te.flags = te.flags & -65537 | 128;
              case 0:
                if (te = oe.payload, V = typeof te == "function" ? te.call(q, $, V) : te, V == null) break e;
                $ = Q({}, $, V);
                break e;
              case 2:
                Dn = !0;
            }
          }
          P.callback !== null && P.lane !== 0 && (t.flags |= 64, V = h.effects, V === null ? h.effects = [P] : V.push(P));
        } else q = { eventTime: q, lane: V, tag: P.tag, payload: P.payload, callback: P.callback, next: null }, B === null ? (F = B = q, M = $) : B = B.next = q, _ |= V;
        if (P = P.next, P === null) {
          if (P = h.shared.pending, P === null) break;
          V = P, P = V.next, V.next = null, h.lastBaseUpdate = V, h.shared.pending = null;
        }
      } while (!0);
      if (B === null && (M = $), h.baseState = M, h.firstBaseUpdate = F, h.lastBaseUpdate = B, r = h.shared.interleaved, r !== null) {
        h = r;
        do
          _ |= h.lane, h = h.next;
        while (h !== r);
      } else v === null && (h.shared.lanes = 0);
      lr |= _, t.lanes = _, t.memoizedState = $;
    }
  }
  function nm(t, r, s) {
    if (t = r.effects, r.effects = null, t !== null) for (r = 0; r < t.length; r++) {
      var u = t[r], h = u.callback;
      if (h !== null) {
        if (u.callback = null, u = s, typeof h != "function") throw Error(o(191, h));
        h.call(u);
      }
    }
  }
  var Zo = {}, Qt = En(Zo), Jo = En(Zo), qo = En(Zo);
  function sr(t) {
    if (t === Zo) throw Error(o(174));
    return t;
  }
  function nu(t, r) {
    switch (be(qo, r), be(Jo, t), be(Qt, Zo), t = r.nodeType, t) {
      case 9:
      case 11:
        r = (r = r.documentElement) ? r.namespaceURI : rl(null, "");
        break;
      default:
        t = t === 8 ? r.parentNode : r, r = t.namespaceURI || null, t = t.tagName, r = rl(r, t);
    }
    Me(Qt), be(Qt, r);
  }
  function Yr() {
    Me(Qt), Me(Jo), Me(qo);
  }
  function rm(t) {
    sr(qo.current);
    var r = sr(Qt.current), s = rl(r, t.type);
    r !== s && (be(Jo, t), be(Qt, s));
  }
  function ru(t) {
    Jo.current === t && (Me(Qt), Me(Jo));
  }
  var Ne = En(0);
  function Ss(t) {
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
  var ou = [];
  function iu() {
    for (var t = 0; t < ou.length; t++) ou[t]._workInProgressVersionPrimary = null;
    ou.length = 0;
  }
  var ws = D.ReactCurrentDispatcher, su = D.ReactCurrentBatchConfig, ar = 0, je = null, ze = null, He = null, xs = !1, ei = !1, ti = 0, Mx = 0;
  function et() {
    throw Error(o(321));
  }
  function au(t, r) {
    if (r === null) return !1;
    for (var s = 0; s < r.length && s < t.length; s++) if (!It(t[s], r[s])) return !1;
    return !0;
  }
  function lu(t, r, s, u, h, v) {
    if (ar = v, je = r, r.memoizedState = null, r.updateQueue = null, r.lanes = 0, ws.current = t === null || t.memoizedState === null ? jx : Ix, t = s(u, h), ei) {
      v = 0;
      do {
        if (ei = !1, ti = 0, 25 <= v) throw Error(o(301));
        v += 1, He = ze = null, r.updateQueue = null, ws.current = Fx, t = s(u, h);
      } while (ei);
    }
    if (ws.current = ks, r = ze !== null && ze.next !== null, ar = 0, He = ze = je = null, xs = !1, r) throw Error(o(300));
    return t;
  }
  function uu() {
    var t = ti !== 0;
    return ti = 0, t;
  }
  function Xt() {
    var t = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
    return He === null ? je.memoizedState = He = t : He = He.next = t, He;
  }
  function Ct() {
    if (ze === null) {
      var t = je.alternate;
      t = t !== null ? t.memoizedState : null;
    } else t = ze.next;
    var r = He === null ? je.memoizedState : He.next;
    if (r !== null) He = r, ze = t;
    else {
      if (t === null) throw Error(o(310));
      ze = t, t = { memoizedState: ze.memoizedState, baseState: ze.baseState, baseQueue: ze.baseQueue, queue: ze.queue, next: null }, He === null ? je.memoizedState = He = t : He = He.next = t;
    }
    return He;
  }
  function ni(t, r) {
    return typeof r == "function" ? r(t) : r;
  }
  function cu(t) {
    var r = Ct(), s = r.queue;
    if (s === null) throw Error(o(311));
    s.lastRenderedReducer = t;
    var u = ze, h = u.baseQueue, v = s.pending;
    if (v !== null) {
      if (h !== null) {
        var _ = h.next;
        h.next = v.next, v.next = _;
      }
      u.baseQueue = h = v, s.pending = null;
    }
    if (h !== null) {
      v = h.next, u = u.baseState;
      var P = _ = null, M = null, F = v;
      do {
        var B = F.lane;
        if ((ar & B) === B) M !== null && (M = M.next = { lane: 0, action: F.action, hasEagerState: F.hasEagerState, eagerState: F.eagerState, next: null }), u = F.hasEagerState ? F.eagerState : t(u, F.action);
        else {
          var $ = {
            lane: B,
            action: F.action,
            hasEagerState: F.hasEagerState,
            eagerState: F.eagerState,
            next: null
          };
          M === null ? (P = M = $, _ = u) : M = M.next = $, je.lanes |= B, lr |= B;
        }
        F = F.next;
      } while (F !== null && F !== v);
      M === null ? _ = u : M.next = P, It(u, r.memoizedState) || (ft = !0), r.memoizedState = u, r.baseState = _, r.baseQueue = M, s.lastRenderedState = u;
    }
    if (t = s.interleaved, t !== null) {
      h = t;
      do
        v = h.lane, je.lanes |= v, lr |= v, h = h.next;
      while (h !== t);
    } else h === null && (s.lanes = 0);
    return [r.memoizedState, s.dispatch];
  }
  function du(t) {
    var r = Ct(), s = r.queue;
    if (s === null) throw Error(o(311));
    s.lastRenderedReducer = t;
    var u = s.dispatch, h = s.pending, v = r.memoizedState;
    if (h !== null) {
      s.pending = null;
      var _ = h = h.next;
      do
        v = t(v, _.action), _ = _.next;
      while (_ !== h);
      It(v, r.memoizedState) || (ft = !0), r.memoizedState = v, r.baseQueue === null && (r.baseState = v), s.lastRenderedState = v;
    }
    return [v, u];
  }
  function om() {
  }
  function im(t, r) {
    var s = je, u = Ct(), h = r(), v = !It(u.memoizedState, h);
    if (v && (u.memoizedState = h, ft = !0), u = u.queue, fu(lm.bind(null, s, u, t), [t]), u.getSnapshot !== r || v || He !== null && He.memoizedState.tag & 1) {
      if (s.flags |= 2048, ri(9, am.bind(null, s, u, h, r), void 0, null), We === null) throw Error(o(349));
      (ar & 30) !== 0 || sm(s, r, h);
    }
    return h;
  }
  function sm(t, r, s) {
    t.flags |= 16384, t = { getSnapshot: r, value: s }, r = je.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, je.updateQueue = r, r.stores = [t]) : (s = r.stores, s === null ? r.stores = [t] : s.push(t));
  }
  function am(t, r, s, u) {
    r.value = s, r.getSnapshot = u, um(r) && cm(t);
  }
  function lm(t, r, s) {
    return s(function() {
      um(r) && cm(t);
    });
  }
  function um(t) {
    var r = t.getSnapshot;
    t = t.value;
    try {
      var s = r();
      return !It(t, s);
    } catch {
      return !0;
    }
  }
  function cm(t) {
    var r = cn(t, 1);
    r !== null && Bt(r, t, 1, -1);
  }
  function dm(t) {
    var r = Xt();
    return typeof t == "function" && (t = t()), r.memoizedState = r.baseState = t, t = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: ni, lastRenderedState: t }, r.queue = t, t = t.dispatch = Nx.bind(null, je, t), [r.memoizedState, t];
  }
  function ri(t, r, s, u) {
    return t = { tag: t, create: r, destroy: s, deps: u, next: null }, r = je.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, je.updateQueue = r, r.lastEffect = t.next = t) : (s = r.lastEffect, s === null ? r.lastEffect = t.next = t : (u = s.next, s.next = t, t.next = u, r.lastEffect = t)), t;
  }
  function fm() {
    return Ct().memoizedState;
  }
  function _s(t, r, s, u) {
    var h = Xt();
    je.flags |= t, h.memoizedState = ri(1 | r, s, void 0, u === void 0 ? null : u);
  }
  function Ts(t, r, s, u) {
    var h = Ct();
    u = u === void 0 ? null : u;
    var v = void 0;
    if (ze !== null) {
      var _ = ze.memoizedState;
      if (v = _.destroy, u !== null && au(u, _.deps)) {
        h.memoizedState = ri(r, s, v, u);
        return;
      }
    }
    je.flags |= t, h.memoizedState = ri(1 | r, s, v, u);
  }
  function pm(t, r) {
    return _s(8390656, 8, t, r);
  }
  function fu(t, r) {
    return Ts(2048, 8, t, r);
  }
  function mm(t, r) {
    return Ts(4, 2, t, r);
  }
  function hm(t, r) {
    return Ts(4, 4, t, r);
  }
  function ym(t, r) {
    if (typeof r == "function") return t = t(), r(t), function() {
      r(null);
    };
    if (r != null) return t = t(), r.current = t, function() {
      r.current = null;
    };
  }
  function gm(t, r, s) {
    return s = s != null ? s.concat([t]) : null, Ts(4, 4, ym.bind(null, r, t), s);
  }
  function pu() {
  }
  function vm(t, r) {
    var s = Ct();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && au(r, u[1]) ? u[0] : (s.memoizedState = [t, r], t);
  }
  function Sm(t, r) {
    var s = Ct();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && au(r, u[1]) ? u[0] : (t = t(), s.memoizedState = [t, r], t);
  }
  function wm(t, r, s) {
    return (ar & 21) === 0 ? (t.baseState && (t.baseState = !1, ft = !0), t.memoizedState = s) : (It(s, r) || (s = Xf(), je.lanes |= s, lr |= s, t.baseState = !0), r);
  }
  function Rx(t, r) {
    var s = _e;
    _e = s !== 0 && 4 > s ? s : 4, t(!0);
    var u = su.transition;
    su.transition = {};
    try {
      t(!1), r();
    } finally {
      _e = s, su.transition = u;
    }
  }
  function xm() {
    return Ct().memoizedState;
  }
  function Dx(t, r, s) {
    var u = On(t);
    if (s = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null }, _m(t)) Tm(r, s);
    else if (s = qp(t, r, s, u), s !== null) {
      var h = ot();
      Bt(s, t, u, h), km(s, r, u);
    }
  }
  function Nx(t, r, s) {
    var u = On(t), h = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null };
    if (_m(t)) Tm(r, h);
    else {
      var v = t.alternate;
      if (t.lanes === 0 && (v === null || v.lanes === 0) && (v = r.lastRenderedReducer, v !== null)) try {
        var _ = r.lastRenderedState, P = v(_, s);
        if (h.hasEagerState = !0, h.eagerState = P, It(P, _)) {
          var M = r.interleaved;
          M === null ? (h.next = h, eu(r)) : (h.next = M.next, M.next = h), r.interleaved = h;
          return;
        }
      } catch {
      } finally {
      }
      s = qp(t, r, h, u), s !== null && (h = ot(), Bt(s, t, u, h), km(s, r, u));
    }
  }
  function _m(t) {
    var r = t.alternate;
    return t === je || r !== null && r === je;
  }
  function Tm(t, r) {
    ei = xs = !0;
    var s = t.pending;
    s === null ? r.next = r : (r.next = s.next, s.next = r), t.pending = r;
  }
  function km(t, r, s) {
    if ((s & 4194240) !== 0) {
      var u = r.lanes;
      u &= t.pendingLanes, s |= u, r.lanes = s, hl(t, s);
    }
  }
  var ks = { readContext: At, useCallback: et, useContext: et, useEffect: et, useImperativeHandle: et, useInsertionEffect: et, useLayoutEffect: et, useMemo: et, useReducer: et, useRef: et, useState: et, useDebugValue: et, useDeferredValue: et, useTransition: et, useMutableSource: et, useSyncExternalStore: et, useId: et, unstable_isNewReconciler: !1 }, jx = { readContext: At, useCallback: function(t, r) {
    return Xt().memoizedState = [t, r === void 0 ? null : r], t;
  }, useContext: At, useEffect: pm, useImperativeHandle: function(t, r, s) {
    return s = s != null ? s.concat([t]) : null, _s(
      4194308,
      4,
      ym.bind(null, r, t),
      s
    );
  }, useLayoutEffect: function(t, r) {
    return _s(4194308, 4, t, r);
  }, useInsertionEffect: function(t, r) {
    return _s(4, 2, t, r);
  }, useMemo: function(t, r) {
    var s = Xt();
    return r = r === void 0 ? null : r, t = t(), s.memoizedState = [t, r], t;
  }, useReducer: function(t, r, s) {
    var u = Xt();
    return r = s !== void 0 ? s(r) : r, u.memoizedState = u.baseState = r, t = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: t, lastRenderedState: r }, u.queue = t, t = t.dispatch = Dx.bind(null, je, t), [u.memoizedState, t];
  }, useRef: function(t) {
    var r = Xt();
    return t = { current: t }, r.memoizedState = t;
  }, useState: dm, useDebugValue: pu, useDeferredValue: function(t) {
    return Xt().memoizedState = t;
  }, useTransition: function() {
    var t = dm(!1), r = t[0];
    return t = Rx.bind(null, t[1]), Xt().memoizedState = t, [r, t];
  }, useMutableSource: function() {
  }, useSyncExternalStore: function(t, r, s) {
    var u = je, h = Xt();
    if (De) {
      if (s === void 0) throw Error(o(407));
      s = s();
    } else {
      if (s = r(), We === null) throw Error(o(349));
      (ar & 30) !== 0 || sm(u, r, s);
    }
    h.memoizedState = s;
    var v = { value: s, getSnapshot: r };
    return h.queue = v, pm(lm.bind(
      null,
      u,
      v,
      t
    ), [t]), u.flags |= 2048, ri(9, am.bind(null, u, v, s, r), void 0, null), s;
  }, useId: function() {
    var t = Xt(), r = We.identifierPrefix;
    if (De) {
      var s = un, u = ln;
      s = (u & ~(1 << 32 - jt(u) - 1)).toString(32) + s, r = ":" + r + "R" + s, s = ti++, 0 < s && (r += "H" + s.toString(32)), r += ":";
    } else s = Mx++, r = ":" + r + "r" + s.toString(32) + ":";
    return t.memoizedState = r;
  }, unstable_isNewReconciler: !1 }, Ix = {
    readContext: At,
    useCallback: vm,
    useContext: At,
    useEffect: fu,
    useImperativeHandle: gm,
    useInsertionEffect: mm,
    useLayoutEffect: hm,
    useMemo: Sm,
    useReducer: cu,
    useRef: fm,
    useState: function() {
      return cu(ni);
    },
    useDebugValue: pu,
    useDeferredValue: function(t) {
      var r = Ct();
      return wm(r, ze.memoizedState, t);
    },
    useTransition: function() {
      var t = cu(ni)[0], r = Ct().memoizedState;
      return [t, r];
    },
    useMutableSource: om,
    useSyncExternalStore: im,
    useId: xm,
    unstable_isNewReconciler: !1
  }, Fx = { readContext: At, useCallback: vm, useContext: At, useEffect: fu, useImperativeHandle: gm, useInsertionEffect: mm, useLayoutEffect: hm, useMemo: Sm, useReducer: du, useRef: fm, useState: function() {
    return du(ni);
  }, useDebugValue: pu, useDeferredValue: function(t) {
    var r = Ct();
    return ze === null ? r.memoizedState = t : wm(r, ze.memoizedState, t);
  }, useTransition: function() {
    var t = du(ni)[0], r = Ct().memoizedState;
    return [t, r];
  }, useMutableSource: om, useSyncExternalStore: im, useId: xm, unstable_isNewReconciler: !1 };
  function Ot(t, r) {
    if (t && t.defaultProps) {
      r = Q({}, r), t = t.defaultProps;
      for (var s in t) r[s] === void 0 && (r[s] = t[s]);
      return r;
    }
    return r;
  }
  function mu(t, r, s, u) {
    r = t.memoizedState, s = s(u, r), s = s == null ? r : Q({}, r, s), t.memoizedState = s, t.lanes === 0 && (t.updateQueue.baseState = s);
  }
  var As = { isMounted: function(t) {
    return (t = t._reactInternals) ? er(t) === t : !1;
  }, enqueueSetState: function(t, r, s) {
    t = t._reactInternals;
    var u = ot(), h = On(t), v = dn(u, h);
    v.payload = r, s != null && (v.callback = s), r = Nn(t, v, h), r !== null && (Bt(r, t, h, u), gs(r, t, h));
  }, enqueueReplaceState: function(t, r, s) {
    t = t._reactInternals;
    var u = ot(), h = On(t), v = dn(u, h);
    v.tag = 1, v.payload = r, s != null && (v.callback = s), r = Nn(t, v, h), r !== null && (Bt(r, t, h, u), gs(r, t, h));
  }, enqueueForceUpdate: function(t, r) {
    t = t._reactInternals;
    var s = ot(), u = On(t), h = dn(s, u);
    h.tag = 2, r != null && (h.callback = r), r = Nn(t, h, u), r !== null && (Bt(r, t, u, s), gs(r, t, u));
  } };
  function Am(t, r, s, u, h, v, _) {
    return t = t.stateNode, typeof t.shouldComponentUpdate == "function" ? t.shouldComponentUpdate(u, v, _) : r.prototype && r.prototype.isPureReactComponent ? !Uo(s, u) || !Uo(h, v) : !0;
  }
  function Cm(t, r, s) {
    var u = !1, h = Mn, v = r.contextType;
    return typeof v == "object" && v !== null ? v = At(v) : (h = dt(r) ? nr : qe.current, u = r.contextTypes, v = (u = u != null) ? zr(t, h) : Mn), r = new r(s, v), t.memoizedState = r.state !== null && r.state !== void 0 ? r.state : null, r.updater = As, t.stateNode = r, r._reactInternals = t, u && (t = t.stateNode, t.__reactInternalMemoizedUnmaskedChildContext = h, t.__reactInternalMemoizedMaskedChildContext = v), r;
  }
  function bm(t, r, s, u) {
    t = r.state, typeof r.componentWillReceiveProps == "function" && r.componentWillReceiveProps(s, u), typeof r.UNSAFE_componentWillReceiveProps == "function" && r.UNSAFE_componentWillReceiveProps(s, u), r.state !== t && As.enqueueReplaceState(r, r.state, null);
  }
  function hu(t, r, s, u) {
    var h = t.stateNode;
    h.props = s, h.state = t.memoizedState, h.refs = {}, tu(t);
    var v = r.contextType;
    typeof v == "object" && v !== null ? h.context = At(v) : (v = dt(r) ? nr : qe.current, h.context = zr(t, v)), h.state = t.memoizedState, v = r.getDerivedStateFromProps, typeof v == "function" && (mu(t, r, v, s), h.state = t.memoizedState), typeof r.getDerivedStateFromProps == "function" || typeof h.getSnapshotBeforeUpdate == "function" || typeof h.UNSAFE_componentWillMount != "function" && typeof h.componentWillMount != "function" || (r = h.state, typeof h.componentWillMount == "function" && h.componentWillMount(), typeof h.UNSAFE_componentWillMount == "function" && h.UNSAFE_componentWillMount(), r !== h.state && As.enqueueReplaceState(h, h.state, null), vs(t, s, h, u), h.state = t.memoizedState), typeof h.componentDidMount == "function" && (t.flags |= 4194308);
  }
  function Qr(t, r) {
    try {
      var s = "", u = r;
      do
        s += ye(u), u = u.return;
      while (u);
      var h = s;
    } catch (v) {
      h = `
Error generating stack: ` + v.message + `
` + v.stack;
    }
    return { value: t, source: r, stack: h, digest: null };
  }
  function yu(t, r, s) {
    return { value: t, source: null, stack: s ?? null, digest: r ?? null };
  }
  function gu(t, r) {
    try {
      console.error(r.value);
    } catch (s) {
      setTimeout(function() {
        throw s;
      });
    }
  }
  var Ox = typeof WeakMap == "function" ? WeakMap : Map;
  function Pm(t, r, s) {
    s = dn(-1, s), s.tag = 3, s.payload = { element: null };
    var u = r.value;
    return s.callback = function() {
      Ds || (Ds = !0, Du = u), gu(t, r);
    }, s;
  }
  function Em(t, r, s) {
    s = dn(-1, s), s.tag = 3;
    var u = t.type.getDerivedStateFromError;
    if (typeof u == "function") {
      var h = r.value;
      s.payload = function() {
        return u(h);
      }, s.callback = function() {
        gu(t, r);
      };
    }
    var v = t.stateNode;
    return v !== null && typeof v.componentDidCatch == "function" && (s.callback = function() {
      gu(t, r), typeof u != "function" && (In === null ? In = /* @__PURE__ */ new Set([this]) : In.add(this));
      var _ = r.stack;
      this.componentDidCatch(r.value, { componentStack: _ !== null ? _ : "" });
    }), s;
  }
  function Mm(t, r, s) {
    var u = t.pingCache;
    if (u === null) {
      u = t.pingCache = new Ox();
      var h = /* @__PURE__ */ new Set();
      u.set(r, h);
    } else h = u.get(r), h === void 0 && (h = /* @__PURE__ */ new Set(), u.set(r, h));
    h.has(s) || (h.add(s), t = Zx.bind(null, t, r, s), r.then(t, t));
  }
  function Rm(t) {
    do {
      var r;
      if ((r = t.tag === 13) && (r = t.memoizedState, r = r !== null ? r.dehydrated !== null : !0), r) return t;
      t = t.return;
    } while (t !== null);
    return null;
  }
  function Dm(t, r, s, u, h) {
    return (t.mode & 1) === 0 ? (t === r ? t.flags |= 65536 : (t.flags |= 128, s.flags |= 131072, s.flags &= -52805, s.tag === 1 && (s.alternate === null ? s.tag = 17 : (r = dn(-1, 1), r.tag = 2, Nn(s, r, 1))), s.lanes |= 1), t) : (t.flags |= 65536, t.lanes = h, t);
  }
  var Lx = D.ReactCurrentOwner, ft = !1;
  function rt(t, r, s, u) {
    r.child = t === null ? Jp(r, null, s, u) : Wr(r, t.child, s, u);
  }
  function Nm(t, r, s, u, h) {
    s = s.render;
    var v = r.ref;
    return Kr(r, h), u = lu(t, r, s, u, v, h), s = uu(), t !== null && !ft ? (r.updateQueue = t.updateQueue, r.flags &= -2053, t.lanes &= ~h, fn(t, r, h)) : (De && s && Wl(r), r.flags |= 1, rt(t, r, u, h), r.child);
  }
  function jm(t, r, s, u, h) {
    if (t === null) {
      var v = s.type;
      return typeof v == "function" && !Vu(v) && v.defaultProps === void 0 && s.compare === null && s.defaultProps === void 0 ? (r.tag = 15, r.type = v, Im(t, r, v, u, h)) : (t = Ls(s.type, null, u, r, r.mode, h), t.ref = r.ref, t.return = r, r.child = t);
    }
    if (v = t.child, (t.lanes & h) === 0) {
      var _ = v.memoizedProps;
      if (s = s.compare, s = s !== null ? s : Uo, s(_, u) && t.ref === r.ref) return fn(t, r, h);
    }
    return r.flags |= 1, t = Vn(v, u), t.ref = r.ref, t.return = r, r.child = t;
  }
  function Im(t, r, s, u, h) {
    if (t !== null) {
      var v = t.memoizedProps;
      if (Uo(v, u) && t.ref === r.ref) if (ft = !1, r.pendingProps = u = v, (t.lanes & h) !== 0) (t.flags & 131072) !== 0 && (ft = !0);
      else return r.lanes = t.lanes, fn(t, r, h);
    }
    return vu(t, r, s, u, h);
  }
  function Fm(t, r, s) {
    var u = r.pendingProps, h = u.children, v = t !== null ? t.memoizedState : null;
    if (u.mode === "hidden") if ((r.mode & 1) === 0) r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, be(Zr, xt), xt |= s;
    else {
      if ((s & 1073741824) === 0) return t = v !== null ? v.baseLanes | s : s, r.lanes = r.childLanes = 1073741824, r.memoizedState = { baseLanes: t, cachePool: null, transitions: null }, r.updateQueue = null, be(Zr, xt), xt |= t, null;
      r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, u = v !== null ? v.baseLanes : s, be(Zr, xt), xt |= u;
    }
    else v !== null ? (u = v.baseLanes | s, r.memoizedState = null) : u = s, be(Zr, xt), xt |= u;
    return rt(t, r, h, s), r.child;
  }
  function Om(t, r) {
    var s = r.ref;
    (t === null && s !== null || t !== null && t.ref !== s) && (r.flags |= 512, r.flags |= 2097152);
  }
  function vu(t, r, s, u, h) {
    var v = dt(s) ? nr : qe.current;
    return v = zr(r, v), Kr(r, h), s = lu(t, r, s, u, v, h), u = uu(), t !== null && !ft ? (r.updateQueue = t.updateQueue, r.flags &= -2053, t.lanes &= ~h, fn(t, r, h)) : (De && u && Wl(r), r.flags |= 1, rt(t, r, s, h), r.child);
  }
  function Lm(t, r, s, u, h) {
    if (dt(s)) {
      var v = !0;
      us(r);
    } else v = !1;
    if (Kr(r, h), r.stateNode === null) bs(t, r), Cm(r, s, u), hu(r, s, u, h), u = !0;
    else if (t === null) {
      var _ = r.stateNode, P = r.memoizedProps;
      _.props = P;
      var M = _.context, F = s.contextType;
      typeof F == "object" && F !== null ? F = At(F) : (F = dt(s) ? nr : qe.current, F = zr(r, F));
      var B = s.getDerivedStateFromProps, $ = typeof B == "function" || typeof _.getSnapshotBeforeUpdate == "function";
      $ || typeof _.UNSAFE_componentWillReceiveProps != "function" && typeof _.componentWillReceiveProps != "function" || (P !== u || M !== F) && bm(r, _, u, F), Dn = !1;
      var V = r.memoizedState;
      _.state = V, vs(r, u, _, h), M = r.memoizedState, P !== u || V !== M || ct.current || Dn ? (typeof B == "function" && (mu(r, s, B, u), M = r.memoizedState), (P = Dn || Am(r, s, P, u, V, M, F)) ? ($ || typeof _.UNSAFE_componentWillMount != "function" && typeof _.componentWillMount != "function" || (typeof _.componentWillMount == "function" && _.componentWillMount(), typeof _.UNSAFE_componentWillMount == "function" && _.UNSAFE_componentWillMount()), typeof _.componentDidMount == "function" && (r.flags |= 4194308)) : (typeof _.componentDidMount == "function" && (r.flags |= 4194308), r.memoizedProps = u, r.memoizedState = M), _.props = u, _.state = M, _.context = F, u = P) : (typeof _.componentDidMount == "function" && (r.flags |= 4194308), u = !1);
    } else {
      _ = r.stateNode, em(t, r), P = r.memoizedProps, F = r.type === r.elementType ? P : Ot(r.type, P), _.props = F, $ = r.pendingProps, V = _.context, M = s.contextType, typeof M == "object" && M !== null ? M = At(M) : (M = dt(s) ? nr : qe.current, M = zr(r, M));
      var q = s.getDerivedStateFromProps;
      (B = typeof q == "function" || typeof _.getSnapshotBeforeUpdate == "function") || typeof _.UNSAFE_componentWillReceiveProps != "function" && typeof _.componentWillReceiveProps != "function" || (P !== $ || V !== M) && bm(r, _, u, M), Dn = !1, V = r.memoizedState, _.state = V, vs(r, u, _, h);
      var te = r.memoizedState;
      P !== $ || V !== te || ct.current || Dn ? (typeof q == "function" && (mu(r, s, q, u), te = r.memoizedState), (F = Dn || Am(r, s, F, u, V, te, M) || !1) ? (B || typeof _.UNSAFE_componentWillUpdate != "function" && typeof _.componentWillUpdate != "function" || (typeof _.componentWillUpdate == "function" && _.componentWillUpdate(u, te, M), typeof _.UNSAFE_componentWillUpdate == "function" && _.UNSAFE_componentWillUpdate(u, te, M)), typeof _.componentDidUpdate == "function" && (r.flags |= 4), typeof _.getSnapshotBeforeUpdate == "function" && (r.flags |= 1024)) : (typeof _.componentDidUpdate != "function" || P === t.memoizedProps && V === t.memoizedState || (r.flags |= 4), typeof _.getSnapshotBeforeUpdate != "function" || P === t.memoizedProps && V === t.memoizedState || (r.flags |= 1024), r.memoizedProps = u, r.memoizedState = te), _.props = u, _.state = te, _.context = M, u = F) : (typeof _.componentDidUpdate != "function" || P === t.memoizedProps && V === t.memoizedState || (r.flags |= 4), typeof _.getSnapshotBeforeUpdate != "function" || P === t.memoizedProps && V === t.memoizedState || (r.flags |= 1024), u = !1);
    }
    return Su(t, r, s, u, v, h);
  }
  function Su(t, r, s, u, h, v) {
    Om(t, r);
    var _ = (r.flags & 128) !== 0;
    if (!u && !_) return h && Up(r, s, !1), fn(t, r, v);
    u = r.stateNode, Lx.current = r;
    var P = _ && typeof s.getDerivedStateFromError != "function" ? null : u.render();
    return r.flags |= 1, t !== null && _ ? (r.child = Wr(r, t.child, null, v), r.child = Wr(r, null, P, v)) : rt(t, r, P, v), r.memoizedState = u.state, h && Up(r, s, !0), r.child;
  }
  function Vm(t) {
    var r = t.stateNode;
    r.pendingContext ? zp(t, r.pendingContext, r.pendingContext !== r.context) : r.context && zp(t, r.context, !1), nu(t, r.containerInfo);
  }
  function Bm(t, r, s, u, h) {
    return Hr(), Ql(h), r.flags |= 256, rt(t, r, s, u), r.child;
  }
  var wu = { dehydrated: null, treeContext: null, retryLane: 0 };
  function xu(t) {
    return { baseLanes: t, cachePool: null, transitions: null };
  }
  function zm(t, r, s) {
    var u = r.pendingProps, h = Ne.current, v = !1, _ = (r.flags & 128) !== 0, P;
    if ((P = _) || (P = t !== null && t.memoizedState === null ? !1 : (h & 2) !== 0), P ? (v = !0, r.flags &= -129) : (t === null || t.memoizedState !== null) && (h |= 1), be(Ne, h & 1), t === null)
      return Yl(r), t = r.memoizedState, t !== null && (t = t.dehydrated, t !== null) ? ((r.mode & 1) === 0 ? r.lanes = 1 : t.data === "$!" ? r.lanes = 8 : r.lanes = 1073741824, null) : (_ = u.children, t = u.fallback, v ? (u = r.mode, v = r.child, _ = { mode: "hidden", children: _ }, (u & 1) === 0 && v !== null ? (v.childLanes = 0, v.pendingProps = _) : v = Vs(_, u, 0, null), t = fr(t, u, s, null), v.return = r, t.return = r, v.sibling = t, r.child = v, r.child.memoizedState = xu(s), r.memoizedState = wu, t) : _u(r, _));
    if (h = t.memoizedState, h !== null && (P = h.dehydrated, P !== null)) return Vx(t, r, _, u, P, h, s);
    if (v) {
      v = u.fallback, _ = r.mode, h = t.child, P = h.sibling;
      var M = { mode: "hidden", children: u.children };
      return (_ & 1) === 0 && r.child !== h ? (u = r.child, u.childLanes = 0, u.pendingProps = M, r.deletions = null) : (u = Vn(h, M), u.subtreeFlags = h.subtreeFlags & 14680064), P !== null ? v = Vn(P, v) : (v = fr(v, _, s, null), v.flags |= 2), v.return = r, u.return = r, u.sibling = v, r.child = u, u = v, v = r.child, _ = t.child.memoizedState, _ = _ === null ? xu(s) : { baseLanes: _.baseLanes | s, cachePool: null, transitions: _.transitions }, v.memoizedState = _, v.childLanes = t.childLanes & ~s, r.memoizedState = wu, u;
    }
    return v = t.child, t = v.sibling, u = Vn(v, { mode: "visible", children: u.children }), (r.mode & 1) === 0 && (u.lanes = s), u.return = r, u.sibling = null, t !== null && (s = r.deletions, s === null ? (r.deletions = [t], r.flags |= 16) : s.push(t)), r.child = u, r.memoizedState = null, u;
  }
  function _u(t, r) {
    return r = Vs({ mode: "visible", children: r }, t.mode, 0, null), r.return = t, t.child = r;
  }
  function Cs(t, r, s, u) {
    return u !== null && Ql(u), Wr(r, t.child, null, s), t = _u(r, r.pendingProps.children), t.flags |= 2, r.memoizedState = null, t;
  }
  function Vx(t, r, s, u, h, v, _) {
    if (s)
      return r.flags & 256 ? (r.flags &= -257, u = yu(Error(o(422))), Cs(t, r, _, u)) : r.memoizedState !== null ? (r.child = t.child, r.flags |= 128, null) : (v = u.fallback, h = r.mode, u = Vs({ mode: "visible", children: u.children }, h, 0, null), v = fr(v, h, _, null), v.flags |= 2, u.return = r, v.return = r, u.sibling = v, r.child = u, (r.mode & 1) !== 0 && Wr(r, t.child, null, _), r.child.memoizedState = xu(_), r.memoizedState = wu, v);
    if ((r.mode & 1) === 0) return Cs(t, r, _, null);
    if (h.data === "$!") {
      if (u = h.nextSibling && h.nextSibling.dataset, u) var P = u.dgst;
      return u = P, v = Error(o(419)), u = yu(v, u, void 0), Cs(t, r, _, u);
    }
    if (P = (_ & t.childLanes) !== 0, ft || P) {
      if (u = We, u !== null) {
        switch (_ & -_) {
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
        h = (h & (u.suspendedLanes | _)) !== 0 ? 0 : h, h !== 0 && h !== v.retryLane && (v.retryLane = h, cn(t, h), Bt(u, t, h, -1));
      }
      return Lu(), u = yu(Error(o(421))), Cs(t, r, _, u);
    }
    return h.data === "$?" ? (r.flags |= 128, r.child = t.child, r = Jx.bind(null, t), h._reactRetry = r, null) : (t = v.treeContext, wt = Pn(h.nextSibling), St = r, De = !0, Ft = null, t !== null && (Tt[kt++] = ln, Tt[kt++] = un, Tt[kt++] = rr, ln = t.id, un = t.overflow, rr = r), r = _u(r, u.children), r.flags |= 4096, r);
  }
  function $m(t, r, s) {
    t.lanes |= r;
    var u = t.alternate;
    u !== null && (u.lanes |= r), ql(t.return, r, s);
  }
  function Tu(t, r, s, u, h) {
    var v = t.memoizedState;
    v === null ? t.memoizedState = { isBackwards: r, rendering: null, renderingStartTime: 0, last: u, tail: s, tailMode: h } : (v.isBackwards = r, v.rendering = null, v.renderingStartTime = 0, v.last = u, v.tail = s, v.tailMode = h);
  }
  function Um(t, r, s) {
    var u = r.pendingProps, h = u.revealOrder, v = u.tail;
    if (rt(t, r, u.children, s), u = Ne.current, (u & 2) !== 0) u = u & 1 | 2, r.flags |= 128;
    else {
      if (t !== null && (t.flags & 128) !== 0) e: for (t = r.child; t !== null; ) {
        if (t.tag === 13) t.memoizedState !== null && $m(t, s, r);
        else if (t.tag === 19) $m(t, s, r);
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
    if (be(Ne, u), (r.mode & 1) === 0) r.memoizedState = null;
    else switch (h) {
      case "forwards":
        for (s = r.child, h = null; s !== null; ) t = s.alternate, t !== null && Ss(t) === null && (h = s), s = s.sibling;
        s = h, s === null ? (h = r.child, r.child = null) : (h = s.sibling, s.sibling = null), Tu(r, !1, h, s, v);
        break;
      case "backwards":
        for (s = null, h = r.child, r.child = null; h !== null; ) {
          if (t = h.alternate, t !== null && Ss(t) === null) {
            r.child = h;
            break;
          }
          t = h.sibling, h.sibling = s, s = h, h = t;
        }
        Tu(r, !0, s, null, v);
        break;
      case "together":
        Tu(r, !1, null, null, void 0);
        break;
      default:
        r.memoizedState = null;
    }
    return r.child;
  }
  function bs(t, r) {
    (r.mode & 1) === 0 && t !== null && (t.alternate = null, r.alternate = null, r.flags |= 2);
  }
  function fn(t, r, s) {
    if (t !== null && (r.dependencies = t.dependencies), lr |= r.lanes, (s & r.childLanes) === 0) return null;
    if (t !== null && r.child !== t.child) throw Error(o(153));
    if (r.child !== null) {
      for (t = r.child, s = Vn(t, t.pendingProps), r.child = s, s.return = r; t.sibling !== null; ) t = t.sibling, s = s.sibling = Vn(t, t.pendingProps), s.return = r;
      s.sibling = null;
    }
    return r.child;
  }
  function Bx(t, r, s) {
    switch (r.tag) {
      case 3:
        Vm(r), Hr();
        break;
      case 5:
        rm(r);
        break;
      case 1:
        dt(r.type) && us(r);
        break;
      case 4:
        nu(r, r.stateNode.containerInfo);
        break;
      case 10:
        var u = r.type._context, h = r.memoizedProps.value;
        be(hs, u._currentValue), u._currentValue = h;
        break;
      case 13:
        if (u = r.memoizedState, u !== null)
          return u.dehydrated !== null ? (be(Ne, Ne.current & 1), r.flags |= 128, null) : (s & r.child.childLanes) !== 0 ? zm(t, r, s) : (be(Ne, Ne.current & 1), t = fn(t, r, s), t !== null ? t.sibling : null);
        be(Ne, Ne.current & 1);
        break;
      case 19:
        if (u = (s & r.childLanes) !== 0, (t.flags & 128) !== 0) {
          if (u) return Um(t, r, s);
          r.flags |= 128;
        }
        if (h = r.memoizedState, h !== null && (h.rendering = null, h.tail = null, h.lastEffect = null), be(Ne, Ne.current), u) break;
        return null;
      case 22:
      case 23:
        return r.lanes = 0, Fm(t, r, s);
    }
    return fn(t, r, s);
  }
  var Hm, ku, Wm, Gm;
  Hm = function(t, r) {
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
  }, ku = function() {
  }, Wm = function(t, r, s, u) {
    var h = t.memoizedProps;
    if (h !== u) {
      t = r.stateNode, sr(Qt.current);
      var v = null;
      switch (s) {
        case "input":
          h = qa(t, h), u = qa(t, u), v = [];
          break;
        case "select":
          h = Q({}, h, { value: void 0 }), u = Q({}, u, { value: void 0 }), v = [];
          break;
        case "textarea":
          h = nl(t, h), u = nl(t, u), v = [];
          break;
        default:
          typeof h.onClick != "function" && typeof u.onClick == "function" && (t.onclick = ss);
      }
      ol(s, u);
      var _;
      s = null;
      for (F in h) if (!u.hasOwnProperty(F) && h.hasOwnProperty(F) && h[F] != null) if (F === "style") {
        var P = h[F];
        for (_ in P) P.hasOwnProperty(_) && (s || (s = {}), s[_] = "");
      } else F !== "dangerouslySetInnerHTML" && F !== "children" && F !== "suppressContentEditableWarning" && F !== "suppressHydrationWarning" && F !== "autoFocus" && (a.hasOwnProperty(F) ? v || (v = []) : (v = v || []).push(F, null));
      for (F in u) {
        var M = u[F];
        if (P = h != null ? h[F] : void 0, u.hasOwnProperty(F) && M !== P && (M != null || P != null)) if (F === "style") if (P) {
          for (_ in P) !P.hasOwnProperty(_) || M && M.hasOwnProperty(_) || (s || (s = {}), s[_] = "");
          for (_ in M) M.hasOwnProperty(_) && P[_] !== M[_] && (s || (s = {}), s[_] = M[_]);
        } else s || (v || (v = []), v.push(
          F,
          s
        )), s = M;
        else F === "dangerouslySetInnerHTML" ? (M = M ? M.__html : void 0, P = P ? P.__html : void 0, M != null && P !== M && (v = v || []).push(F, M)) : F === "children" ? typeof M != "string" && typeof M != "number" || (v = v || []).push(F, "" + M) : F !== "suppressContentEditableWarning" && F !== "suppressHydrationWarning" && (a.hasOwnProperty(F) ? (M != null && F === "onScroll" && Ee("scroll", t), v || P === M || (v = [])) : (v = v || []).push(F, M));
      }
      s && (v = v || []).push("style", s);
      var F = v;
      (r.updateQueue = F) && (r.flags |= 4);
    }
  }, Gm = function(t, r, s, u) {
    s !== u && (r.flags |= 4);
  };
  function oi(t, r) {
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
  function zx(t, r, s) {
    var u = r.pendingProps;
    switch (Gl(r), r.tag) {
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
        return dt(r.type) && ls(), tt(r), null;
      case 3:
        return u = r.stateNode, Yr(), Me(ct), Me(qe), iu(), u.pendingContext && (u.context = u.pendingContext, u.pendingContext = null), (t === null || t.child === null) && (ps(r) ? r.flags |= 4 : t === null || t.memoizedState.isDehydrated && (r.flags & 256) === 0 || (r.flags |= 1024, Ft !== null && (Iu(Ft), Ft = null))), ku(t, r), tt(r), null;
      case 5:
        ru(r);
        var h = sr(qo.current);
        if (s = r.type, t !== null && r.stateNode != null) Wm(t, r, s, u, h), t.ref !== r.ref && (r.flags |= 512, r.flags |= 2097152);
        else {
          if (!u) {
            if (r.stateNode === null) throw Error(o(166));
            return tt(r), null;
          }
          if (t = sr(Qt.current), ps(r)) {
            u = r.stateNode, s = r.type;
            var v = r.memoizedProps;
            switch (u[Yt] = r, u[Yo] = v, t = (r.mode & 1) !== 0, s) {
              case "dialog":
                Ee("cancel", u), Ee("close", u);
                break;
              case "iframe":
              case "object":
              case "embed":
                Ee("load", u);
                break;
              case "video":
              case "audio":
                for (h = 0; h < Wo.length; h++) Ee(Wo[h], u);
                break;
              case "source":
                Ee("error", u);
                break;
              case "img":
              case "image":
              case "link":
                Ee(
                  "error",
                  u
                ), Ee("load", u);
                break;
              case "details":
                Ee("toggle", u);
                break;
              case "input":
                Cf(u, v), Ee("invalid", u);
                break;
              case "select":
                u._wrapperState = { wasMultiple: !!v.multiple }, Ee("invalid", u);
                break;
              case "textarea":
                Ef(u, v), Ee("invalid", u);
            }
            ol(s, v), h = null;
            for (var _ in v) if (v.hasOwnProperty(_)) {
              var P = v[_];
              _ === "children" ? typeof P == "string" ? u.textContent !== P && (v.suppressHydrationWarning !== !0 && is(u.textContent, P, t), h = ["children", P]) : typeof P == "number" && u.textContent !== "" + P && (v.suppressHydrationWarning !== !0 && is(
                u.textContent,
                P,
                t
              ), h = ["children", "" + P]) : a.hasOwnProperty(_) && P != null && _ === "onScroll" && Ee("scroll", u);
            }
            switch (s) {
              case "input":
                Fi(u), Pf(u, v, !0);
                break;
              case "textarea":
                Fi(u), Rf(u);
                break;
              case "select":
              case "option":
                break;
              default:
                typeof v.onClick == "function" && (u.onclick = ss);
            }
            u = h, r.updateQueue = u, u !== null && (r.flags |= 4);
          } else {
            _ = h.nodeType === 9 ? h : h.ownerDocument, t === "http://www.w3.org/1999/xhtml" && (t = Df(s)), t === "http://www.w3.org/1999/xhtml" ? s === "script" ? (t = _.createElement("div"), t.innerHTML = "<script><\/script>", t = t.removeChild(t.firstChild)) : typeof u.is == "string" ? t = _.createElement(s, { is: u.is }) : (t = _.createElement(s), s === "select" && (_ = t, u.multiple ? _.multiple = !0 : u.size && (_.size = u.size))) : t = _.createElementNS(t, s), t[Yt] = r, t[Yo] = u, Hm(t, r, !1, !1), r.stateNode = t;
            e: {
              switch (_ = il(s, u), s) {
                case "dialog":
                  Ee("cancel", t), Ee("close", t), h = u;
                  break;
                case "iframe":
                case "object":
                case "embed":
                  Ee("load", t), h = u;
                  break;
                case "video":
                case "audio":
                  for (h = 0; h < Wo.length; h++) Ee(Wo[h], t);
                  h = u;
                  break;
                case "source":
                  Ee("error", t), h = u;
                  break;
                case "img":
                case "image":
                case "link":
                  Ee(
                    "error",
                    t
                  ), Ee("load", t), h = u;
                  break;
                case "details":
                  Ee("toggle", t), h = u;
                  break;
                case "input":
                  Cf(t, u), h = qa(t, u), Ee("invalid", t);
                  break;
                case "option":
                  h = u;
                  break;
                case "select":
                  t._wrapperState = { wasMultiple: !!u.multiple }, h = Q({}, u, { value: void 0 }), Ee("invalid", t);
                  break;
                case "textarea":
                  Ef(t, u), h = nl(t, u), Ee("invalid", t);
                  break;
                default:
                  h = u;
              }
              ol(s, h), P = h;
              for (v in P) if (P.hasOwnProperty(v)) {
                var M = P[v];
                v === "style" ? If(t, M) : v === "dangerouslySetInnerHTML" ? (M = M ? M.__html : void 0, M != null && Nf(t, M)) : v === "children" ? typeof M == "string" ? (s !== "textarea" || M !== "") && Co(t, M) : typeof M == "number" && Co(t, "" + M) : v !== "suppressContentEditableWarning" && v !== "suppressHydrationWarning" && v !== "autoFocus" && (a.hasOwnProperty(v) ? M != null && v === "onScroll" && Ee("scroll", t) : M != null && E(t, v, M, _));
              }
              switch (s) {
                case "input":
                  Fi(t), Pf(t, u, !1);
                  break;
                case "textarea":
                  Fi(t), Rf(t);
                  break;
                case "option":
                  u.value != null && t.setAttribute("value", "" + xe(u.value));
                  break;
                case "select":
                  t.multiple = !!u.multiple, v = u.value, v != null ? Er(t, !!u.multiple, v, !1) : u.defaultValue != null && Er(
                    t,
                    !!u.multiple,
                    u.defaultValue,
                    !0
                  );
                  break;
                default:
                  typeof h.onClick == "function" && (t.onclick = ss);
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
        if (t && r.stateNode != null) Gm(t, r, t.memoizedProps, u);
        else {
          if (typeof u != "string" && r.stateNode === null) throw Error(o(166));
          if (s = sr(qo.current), sr(Qt.current), ps(r)) {
            if (u = r.stateNode, s = r.memoizedProps, u[Yt] = r, (v = u.nodeValue !== s) && (t = St, t !== null)) switch (t.tag) {
              case 3:
                is(u.nodeValue, s, (t.mode & 1) !== 0);
                break;
              case 5:
                t.memoizedProps.suppressHydrationWarning !== !0 && is(u.nodeValue, s, (t.mode & 1) !== 0);
            }
            v && (r.flags |= 4);
          } else u = (s.nodeType === 9 ? s : s.ownerDocument).createTextNode(u), u[Yt] = r, r.stateNode = u;
        }
        return tt(r), null;
      case 13:
        if (Me(Ne), u = r.memoizedState, t === null || t.memoizedState !== null && t.memoizedState.dehydrated !== null) {
          if (De && wt !== null && (r.mode & 1) !== 0 && (r.flags & 128) === 0) Qp(), Hr(), r.flags |= 98560, v = !1;
          else if (v = ps(r), u !== null && u.dehydrated !== null) {
            if (t === null) {
              if (!v) throw Error(o(318));
              if (v = r.memoizedState, v = v !== null ? v.dehydrated : null, !v) throw Error(o(317));
              v[Yt] = r;
            } else Hr(), (r.flags & 128) === 0 && (r.memoizedState = null), r.flags |= 4;
            tt(r), v = !1;
          } else Ft !== null && (Iu(Ft), Ft = null), v = !0;
          if (!v) return r.flags & 65536 ? r : null;
        }
        return (r.flags & 128) !== 0 ? (r.lanes = s, r) : (u = u !== null, u !== (t !== null && t.memoizedState !== null) && u && (r.child.flags |= 8192, (r.mode & 1) !== 0 && (t === null || (Ne.current & 1) !== 0 ? $e === 0 && ($e = 3) : Lu())), r.updateQueue !== null && (r.flags |= 4), tt(r), null);
      case 4:
        return Yr(), ku(t, r), t === null && Go(r.stateNode.containerInfo), tt(r), null;
      case 10:
        return Jl(r.type._context), tt(r), null;
      case 17:
        return dt(r.type) && ls(), tt(r), null;
      case 19:
        if (Me(Ne), v = r.memoizedState, v === null) return tt(r), null;
        if (u = (r.flags & 128) !== 0, _ = v.rendering, _ === null) if (u) oi(v, !1);
        else {
          if ($e !== 0 || t !== null && (t.flags & 128) !== 0) for (t = r.child; t !== null; ) {
            if (_ = Ss(t), _ !== null) {
              for (r.flags |= 128, oi(v, !1), u = _.updateQueue, u !== null && (r.updateQueue = u, r.flags |= 4), r.subtreeFlags = 0, u = s, s = r.child; s !== null; ) v = s, t = u, v.flags &= 14680066, _ = v.alternate, _ === null ? (v.childLanes = 0, v.lanes = t, v.child = null, v.subtreeFlags = 0, v.memoizedProps = null, v.memoizedState = null, v.updateQueue = null, v.dependencies = null, v.stateNode = null) : (v.childLanes = _.childLanes, v.lanes = _.lanes, v.child = _.child, v.subtreeFlags = 0, v.deletions = null, v.memoizedProps = _.memoizedProps, v.memoizedState = _.memoizedState, v.updateQueue = _.updateQueue, v.type = _.type, t = _.dependencies, v.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }), s = s.sibling;
              return be(Ne, Ne.current & 1 | 2), r.child;
            }
            t = t.sibling;
          }
          v.tail !== null && Oe() > Jr && (r.flags |= 128, u = !0, oi(v, !1), r.lanes = 4194304);
        }
        else {
          if (!u) if (t = Ss(_), t !== null) {
            if (r.flags |= 128, u = !0, s = t.updateQueue, s !== null && (r.updateQueue = s, r.flags |= 4), oi(v, !0), v.tail === null && v.tailMode === "hidden" && !_.alternate && !De) return tt(r), null;
          } else 2 * Oe() - v.renderingStartTime > Jr && s !== 1073741824 && (r.flags |= 128, u = !0, oi(v, !1), r.lanes = 4194304);
          v.isBackwards ? (_.sibling = r.child, r.child = _) : (s = v.last, s !== null ? s.sibling = _ : r.child = _, v.last = _);
        }
        return v.tail !== null ? (r = v.tail, v.rendering = r, v.tail = r.sibling, v.renderingStartTime = Oe(), r.sibling = null, s = Ne.current, be(Ne, u ? s & 1 | 2 : s & 1), r) : (tt(r), null);
      case 22:
      case 23:
        return Ou(), u = r.memoizedState !== null, t !== null && t.memoizedState !== null !== u && (r.flags |= 8192), u && (r.mode & 1) !== 0 ? (xt & 1073741824) !== 0 && (tt(r), r.subtreeFlags & 6 && (r.flags |= 8192)) : tt(r), null;
      case 24:
        return null;
      case 25:
        return null;
    }
    throw Error(o(156, r.tag));
  }
  function $x(t, r) {
    switch (Gl(r), r.tag) {
      case 1:
        return dt(r.type) && ls(), t = r.flags, t & 65536 ? (r.flags = t & -65537 | 128, r) : null;
      case 3:
        return Yr(), Me(ct), Me(qe), iu(), t = r.flags, (t & 65536) !== 0 && (t & 128) === 0 ? (r.flags = t & -65537 | 128, r) : null;
      case 5:
        return ru(r), null;
      case 13:
        if (Me(Ne), t = r.memoizedState, t !== null && t.dehydrated !== null) {
          if (r.alternate === null) throw Error(o(340));
          Hr();
        }
        return t = r.flags, t & 65536 ? (r.flags = t & -65537 | 128, r) : null;
      case 19:
        return Me(Ne), null;
      case 4:
        return Yr(), null;
      case 10:
        return Jl(r.type._context), null;
      case 22:
      case 23:
        return Ou(), null;
      case 24:
        return null;
      default:
        return null;
    }
  }
  var Ps = !1, nt = !1, Ux = typeof WeakSet == "function" ? WeakSet : Set, ee = null;
  function Xr(t, r) {
    var s = t.ref;
    if (s !== null) if (typeof s == "function") try {
      s(null);
    } catch (u) {
      Fe(t, r, u);
    }
    else s.current = null;
  }
  function Au(t, r, s) {
    try {
      s();
    } catch (u) {
      Fe(t, r, u);
    }
  }
  var Km = !1;
  function Hx(t, r) {
    if (Ol = Yi, t = Ap(), El(t)) {
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
          var _ = 0, P = -1, M = -1, F = 0, B = 0, $ = t, V = null;
          t: for (; ; ) {
            for (var q; $ !== s || h !== 0 && $.nodeType !== 3 || (P = _ + h), $ !== v || u !== 0 && $.nodeType !== 3 || (M = _ + u), $.nodeType === 3 && (_ += $.nodeValue.length), (q = $.firstChild) !== null; )
              V = $, $ = q;
            for (; ; ) {
              if ($ === t) break t;
              if (V === s && ++F === h && (P = _), V === v && ++B === u && (M = _), (q = $.nextSibling) !== null) break;
              $ = V, V = $.parentNode;
            }
            $ = q;
          }
          s = P === -1 || M === -1 ? null : { start: P, end: M };
        } else s = null;
      }
      s = s || { start: 0, end: 0 };
    } else s = null;
    for (Ll = { focusedElem: t, selectionRange: s }, Yi = !1, ee = r; ee !== null; ) if (r = ee, t = r.child, (r.subtreeFlags & 1028) !== 0 && t !== null) t.return = r, ee = t;
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
              var oe = te.memoizedProps, Le = te.memoizedState, j = r.stateNode, R = j.getSnapshotBeforeUpdate(r.elementType === r.type ? oe : Ot(r.type, oe), Le);
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
      } catch (U) {
        Fe(r, r.return, U);
      }
      if (t = r.sibling, t !== null) {
        t.return = r.return, ee = t;
        break;
      }
      ee = r.return;
    }
    return te = Km, Km = !1, te;
  }
  function ii(t, r, s) {
    var u = r.updateQueue;
    if (u = u !== null ? u.lastEffect : null, u !== null) {
      var h = u = u.next;
      do {
        if ((h.tag & t) === t) {
          var v = h.destroy;
          h.destroy = void 0, v !== void 0 && Au(r, s, v);
        }
        h = h.next;
      } while (h !== u);
    }
  }
  function Es(t, r) {
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
  function Cu(t) {
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
  function Ym(t) {
    var r = t.alternate;
    r !== null && (t.alternate = null, Ym(r)), t.child = null, t.deletions = null, t.sibling = null, t.tag === 5 && (r = t.stateNode, r !== null && (delete r[Yt], delete r[Yo], delete r[$l], delete r[Cx], delete r[bx])), t.stateNode = null, t.return = null, t.dependencies = null, t.memoizedProps = null, t.memoizedState = null, t.pendingProps = null, t.stateNode = null, t.updateQueue = null;
  }
  function Qm(t) {
    return t.tag === 5 || t.tag === 3 || t.tag === 4;
  }
  function Xm(t) {
    e: for (; ; ) {
      for (; t.sibling === null; ) {
        if (t.return === null || Qm(t.return)) return null;
        t = t.return;
      }
      for (t.sibling.return = t.return, t = t.sibling; t.tag !== 5 && t.tag !== 6 && t.tag !== 18; ) {
        if (t.flags & 2 || t.child === null || t.tag === 4) continue e;
        t.child.return = t, t = t.child;
      }
      if (!(t.flags & 2)) return t.stateNode;
    }
  }
  function bu(t, r, s) {
    var u = t.tag;
    if (u === 5 || u === 6) t = t.stateNode, r ? s.nodeType === 8 ? s.parentNode.insertBefore(t, r) : s.insertBefore(t, r) : (s.nodeType === 8 ? (r = s.parentNode, r.insertBefore(t, s)) : (r = s, r.appendChild(t)), s = s._reactRootContainer, s != null || r.onclick !== null || (r.onclick = ss));
    else if (u !== 4 && (t = t.child, t !== null)) for (bu(t, r, s), t = t.sibling; t !== null; ) bu(t, r, s), t = t.sibling;
  }
  function Pu(t, r, s) {
    var u = t.tag;
    if (u === 5 || u === 6) t = t.stateNode, r ? s.insertBefore(t, r) : s.appendChild(t);
    else if (u !== 4 && (t = t.child, t !== null)) for (Pu(t, r, s), t = t.sibling; t !== null; ) Pu(t, r, s), t = t.sibling;
  }
  var Qe = null, Lt = !1;
  function jn(t, r, s) {
    for (s = s.child; s !== null; ) Zm(t, r, s), s = s.sibling;
  }
  function Zm(t, r, s) {
    if (Kt && typeof Kt.onCommitFiberUnmount == "function") try {
      Kt.onCommitFiberUnmount($i, s);
    } catch {
    }
    switch (s.tag) {
      case 5:
        nt || Xr(s, r);
      case 6:
        var u = Qe, h = Lt;
        Qe = null, jn(t, r, s), Qe = u, Lt = h, Qe !== null && (Lt ? (t = Qe, s = s.stateNode, t.nodeType === 8 ? t.parentNode.removeChild(s) : t.removeChild(s)) : Qe.removeChild(s.stateNode));
        break;
      case 18:
        Qe !== null && (Lt ? (t = Qe, s = s.stateNode, t.nodeType === 8 ? zl(t.parentNode, s) : t.nodeType === 1 && zl(t, s), Oo(t)) : zl(Qe, s.stateNode));
        break;
      case 4:
        u = Qe, h = Lt, Qe = s.stateNode.containerInfo, Lt = !0, jn(t, r, s), Qe = u, Lt = h;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        if (!nt && (u = s.updateQueue, u !== null && (u = u.lastEffect, u !== null))) {
          h = u = u.next;
          do {
            var v = h, _ = v.destroy;
            v = v.tag, _ !== void 0 && ((v & 2) !== 0 || (v & 4) !== 0) && Au(s, r, _), h = h.next;
          } while (h !== u);
        }
        jn(t, r, s);
        break;
      case 1:
        if (!nt && (Xr(s, r), u = s.stateNode, typeof u.componentWillUnmount == "function")) try {
          u.props = s.memoizedProps, u.state = s.memoizedState, u.componentWillUnmount();
        } catch (P) {
          Fe(s, r, P);
        }
        jn(t, r, s);
        break;
      case 21:
        jn(t, r, s);
        break;
      case 22:
        s.mode & 1 ? (nt = (u = nt) || s.memoizedState !== null, jn(t, r, s), nt = u) : jn(t, r, s);
        break;
      default:
        jn(t, r, s);
    }
  }
  function Jm(t) {
    var r = t.updateQueue;
    if (r !== null) {
      t.updateQueue = null;
      var s = t.stateNode;
      s === null && (s = t.stateNode = new Ux()), r.forEach(function(u) {
        var h = qx.bind(null, t, u);
        s.has(u) || (s.add(u), u.then(h, h));
      });
    }
  }
  function Vt(t, r) {
    var s = r.deletions;
    if (s !== null) for (var u = 0; u < s.length; u++) {
      var h = s[u];
      try {
        var v = t, _ = r, P = _;
        e: for (; P !== null; ) {
          switch (P.tag) {
            case 5:
              Qe = P.stateNode, Lt = !1;
              break e;
            case 3:
              Qe = P.stateNode.containerInfo, Lt = !0;
              break e;
            case 4:
              Qe = P.stateNode.containerInfo, Lt = !0;
              break e;
          }
          P = P.return;
        }
        if (Qe === null) throw Error(o(160));
        Zm(v, _, h), Qe = null, Lt = !1;
        var M = h.alternate;
        M !== null && (M.return = null), h.return = null;
      } catch (F) {
        Fe(h, r, F);
      }
    }
    if (r.subtreeFlags & 12854) for (r = r.child; r !== null; ) qm(r, t), r = r.sibling;
  }
  function qm(t, r) {
    var s = t.alternate, u = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (Vt(r, t), Zt(t), u & 4) {
          try {
            ii(3, t, t.return), Es(3, t);
          } catch (oe) {
            Fe(t, t.return, oe);
          }
          try {
            ii(5, t, t.return);
          } catch (oe) {
            Fe(t, t.return, oe);
          }
        }
        break;
      case 1:
        Vt(r, t), Zt(t), u & 512 && s !== null && Xr(s, s.return);
        break;
      case 5:
        if (Vt(r, t), Zt(t), u & 512 && s !== null && Xr(s, s.return), t.flags & 32) {
          var h = t.stateNode;
          try {
            Co(h, "");
          } catch (oe) {
            Fe(t, t.return, oe);
          }
        }
        if (u & 4 && (h = t.stateNode, h != null)) {
          var v = t.memoizedProps, _ = s !== null ? s.memoizedProps : v, P = t.type, M = t.updateQueue;
          if (t.updateQueue = null, M !== null) try {
            P === "input" && v.type === "radio" && v.name != null && bf(h, v), il(P, _);
            var F = il(P, v);
            for (_ = 0; _ < M.length; _ += 2) {
              var B = M[_], $ = M[_ + 1];
              B === "style" ? If(h, $) : B === "dangerouslySetInnerHTML" ? Nf(h, $) : B === "children" ? Co(h, $) : E(h, B, $, F);
            }
            switch (P) {
              case "input":
                el(h, v);
                break;
              case "textarea":
                Mf(h, v);
                break;
              case "select":
                var V = h._wrapperState.wasMultiple;
                h._wrapperState.wasMultiple = !!v.multiple;
                var q = v.value;
                q != null ? Er(h, !!v.multiple, q, !1) : V !== !!v.multiple && (v.defaultValue != null ? Er(
                  h,
                  !!v.multiple,
                  v.defaultValue,
                  !0
                ) : Er(h, !!v.multiple, v.multiple ? [] : "", !1));
            }
            h[Yo] = v;
          } catch (oe) {
            Fe(t, t.return, oe);
          }
        }
        break;
      case 6:
        if (Vt(r, t), Zt(t), u & 4) {
          if (t.stateNode === null) throw Error(o(162));
          h = t.stateNode, v = t.memoizedProps;
          try {
            h.nodeValue = v;
          } catch (oe) {
            Fe(t, t.return, oe);
          }
        }
        break;
      case 3:
        if (Vt(r, t), Zt(t), u & 4 && s !== null && s.memoizedState.isDehydrated) try {
          Oo(r.containerInfo);
        } catch (oe) {
          Fe(t, t.return, oe);
        }
        break;
      case 4:
        Vt(r, t), Zt(t);
        break;
      case 13:
        Vt(r, t), Zt(t), h = t.child, h.flags & 8192 && (v = h.memoizedState !== null, h.stateNode.isHidden = v, !v || h.alternate !== null && h.alternate.memoizedState !== null || (Ru = Oe())), u & 4 && Jm(t);
        break;
      case 22:
        if (B = s !== null && s.memoizedState !== null, t.mode & 1 ? (nt = (F = nt) || B, Vt(r, t), nt = F) : Vt(r, t), Zt(t), u & 8192) {
          if (F = t.memoizedState !== null, (t.stateNode.isHidden = F) && !B && (t.mode & 1) !== 0) for (ee = t, B = t.child; B !== null; ) {
            for ($ = ee = B; ee !== null; ) {
              switch (V = ee, q = V.child, V.tag) {
                case 0:
                case 11:
                case 14:
                case 15:
                  ii(4, V, V.return);
                  break;
                case 1:
                  Xr(V, V.return);
                  var te = V.stateNode;
                  if (typeof te.componentWillUnmount == "function") {
                    u = V, s = V.return;
                    try {
                      r = u, te.props = r.memoizedProps, te.state = r.memoizedState, te.componentWillUnmount();
                    } catch (oe) {
                      Fe(u, s, oe);
                    }
                  }
                  break;
                case 5:
                  Xr(V, V.return);
                  break;
                case 22:
                  if (V.memoizedState !== null) {
                    nh($);
                    continue;
                  }
              }
              q !== null ? (q.return = V, ee = q) : nh($);
            }
            B = B.sibling;
          }
          e: for (B = null, $ = t; ; ) {
            if ($.tag === 5) {
              if (B === null) {
                B = $;
                try {
                  h = $.stateNode, F ? (v = h.style, typeof v.setProperty == "function" ? v.setProperty("display", "none", "important") : v.display = "none") : (P = $.stateNode, M = $.memoizedProps.style, _ = M != null && M.hasOwnProperty("display") ? M.display : null, P.style.display = jf("display", _));
                } catch (oe) {
                  Fe(t, t.return, oe);
                }
              }
            } else if ($.tag === 6) {
              if (B === null) try {
                $.stateNode.nodeValue = F ? "" : $.memoizedProps;
              } catch (oe) {
                Fe(t, t.return, oe);
              }
            } else if (($.tag !== 22 && $.tag !== 23 || $.memoizedState === null || $ === t) && $.child !== null) {
              $.child.return = $, $ = $.child;
              continue;
            }
            if ($ === t) break e;
            for (; $.sibling === null; ) {
              if ($.return === null || $.return === t) break e;
              B === $ && (B = null), $ = $.return;
            }
            B === $ && (B = null), $.sibling.return = $.return, $ = $.sibling;
          }
        }
        break;
      case 19:
        Vt(r, t), Zt(t), u & 4 && Jm(t);
        break;
      case 21:
        break;
      default:
        Vt(
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
            if (Qm(s)) {
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
            u.flags & 32 && (Co(h, ""), u.flags &= -33);
            var v = Xm(t);
            Pu(t, v, h);
            break;
          case 3:
          case 4:
            var _ = u.stateNode.containerInfo, P = Xm(t);
            bu(t, P, _);
            break;
          default:
            throw Error(o(161));
        }
      } catch (M) {
        Fe(t, t.return, M);
      }
      t.flags &= -3;
    }
    r & 4096 && (t.flags &= -4097);
  }
  function Wx(t, r, s) {
    ee = t, eh(t);
  }
  function eh(t, r, s) {
    for (var u = (t.mode & 1) !== 0; ee !== null; ) {
      var h = ee, v = h.child;
      if (h.tag === 22 && u) {
        var _ = h.memoizedState !== null || Ps;
        if (!_) {
          var P = h.alternate, M = P !== null && P.memoizedState !== null || nt;
          P = Ps;
          var F = nt;
          if (Ps = _, (nt = M) && !F) for (ee = h; ee !== null; ) _ = ee, M = _.child, _.tag === 22 && _.memoizedState !== null ? rh(h) : M !== null ? (M.return = _, ee = M) : rh(h);
          for (; v !== null; ) ee = v, eh(v), v = v.sibling;
          ee = h, Ps = P, nt = F;
        }
        th(t);
      } else (h.subtreeFlags & 8772) !== 0 && v !== null ? (v.return = h, ee = v) : th(t);
    }
  }
  function th(t) {
    for (; ee !== null; ) {
      var r = ee;
      if ((r.flags & 8772) !== 0) {
        var s = r.alternate;
        try {
          if ((r.flags & 8772) !== 0) switch (r.tag) {
            case 0:
            case 11:
            case 15:
              nt || Es(5, r);
              break;
            case 1:
              var u = r.stateNode;
              if (r.flags & 4 && !nt) if (s === null) u.componentDidMount();
              else {
                var h = r.elementType === r.type ? s.memoizedProps : Ot(r.type, s.memoizedProps);
                u.componentDidUpdate(h, s.memoizedState, u.__reactInternalSnapshotBeforeUpdate);
              }
              var v = r.updateQueue;
              v !== null && nm(r, v, u);
              break;
            case 3:
              var _ = r.updateQueue;
              if (_ !== null) {
                if (s = null, r.child !== null) switch (r.child.tag) {
                  case 5:
                    s = r.child.stateNode;
                    break;
                  case 1:
                    s = r.child.stateNode;
                }
                nm(r, _, s);
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
                  var B = F.memoizedState;
                  if (B !== null) {
                    var $ = B.dehydrated;
                    $ !== null && Oo($);
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
          nt || r.flags & 512 && Cu(r);
        } catch (V) {
          Fe(r, r.return, V);
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
  function nh(t) {
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
  function rh(t) {
    for (; ee !== null; ) {
      var r = ee;
      try {
        switch (r.tag) {
          case 0:
          case 11:
          case 15:
            var s = r.return;
            try {
              Es(4, r);
            } catch (M) {
              Fe(r, s, M);
            }
            break;
          case 1:
            var u = r.stateNode;
            if (typeof u.componentDidMount == "function") {
              var h = r.return;
              try {
                u.componentDidMount();
              } catch (M) {
                Fe(r, h, M);
              }
            }
            var v = r.return;
            try {
              Cu(r);
            } catch (M) {
              Fe(r, v, M);
            }
            break;
          case 5:
            var _ = r.return;
            try {
              Cu(r);
            } catch (M) {
              Fe(r, _, M);
            }
        }
      } catch (M) {
        Fe(r, r.return, M);
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
  var Gx = Math.ceil, Ms = D.ReactCurrentDispatcher, Eu = D.ReactCurrentOwner, bt = D.ReactCurrentBatchConfig, he = 0, We = null, Ve = null, Xe = 0, xt = 0, Zr = En(0), $e = 0, si = null, lr = 0, Rs = 0, Mu = 0, ai = null, pt = null, Ru = 0, Jr = 1 / 0, pn = null, Ds = !1, Du = null, In = null, Ns = !1, Fn = null, js = 0, li = 0, Nu = null, Is = -1, Fs = 0;
  function ot() {
    return (he & 6) !== 0 ? Oe() : Is !== -1 ? Is : Is = Oe();
  }
  function On(t) {
    return (t.mode & 1) === 0 ? 1 : (he & 2) !== 0 && Xe !== 0 ? Xe & -Xe : Ex.transition !== null ? (Fs === 0 && (Fs = Xf()), Fs) : (t = _e, t !== 0 || (t = window.event, t = t === void 0 ? 16 : ip(t.type)), t);
  }
  function Bt(t, r, s, u) {
    if (50 < li) throw li = 0, Nu = null, Error(o(185));
    Do(t, s, u), ((he & 2) === 0 || t !== We) && (t === We && ((he & 2) === 0 && (Rs |= s), $e === 4 && Ln(t, Xe)), mt(t, u), s === 1 && he === 0 && (r.mode & 1) === 0 && (Jr = Oe() + 500, cs && Rn()));
  }
  function mt(t, r) {
    var s = t.callbackNode;
    Ew(t, r);
    var u = Wi(t, t === We ? Xe : 0);
    if (u === 0) s !== null && Kf(s), t.callbackNode = null, t.callbackPriority = 0;
    else if (r = u & -u, t.callbackPriority !== r) {
      if (s != null && Kf(s), r === 1) t.tag === 0 ? Px(ih.bind(null, t)) : Hp(ih.bind(null, t)), kx(function() {
        (he & 6) === 0 && Rn();
      }), s = null;
      else {
        switch (Zf(u)) {
          case 1:
            s = fl;
            break;
          case 4:
            s = Yf;
            break;
          case 16:
            s = zi;
            break;
          case 536870912:
            s = Qf;
            break;
          default:
            s = zi;
        }
        s = ph(s, oh.bind(null, t));
      }
      t.callbackPriority = r, t.callbackNode = s;
    }
  }
  function oh(t, r) {
    if (Is = -1, Fs = 0, (he & 6) !== 0) throw Error(o(327));
    var s = t.callbackNode;
    if (qr() && t.callbackNode !== s) return null;
    var u = Wi(t, t === We ? Xe : 0);
    if (u === 0) return null;
    if ((u & 30) !== 0 || (u & t.expiredLanes) !== 0 || r) r = Os(t, u);
    else {
      r = u;
      var h = he;
      he |= 2;
      var v = ah();
      (We !== t || Xe !== r) && (pn = null, Jr = Oe() + 500, cr(t, r));
      do
        try {
          Qx();
          break;
        } catch (P) {
          sh(t, P);
        }
      while (!0);
      Zl(), Ms.current = v, he = h, Ve !== null ? r = 0 : (We = null, Xe = 0, r = $e);
    }
    if (r !== 0) {
      if (r === 2 && (h = pl(t), h !== 0 && (u = h, r = ju(t, h))), r === 1) throw s = si, cr(t, 0), Ln(t, u), mt(t, Oe()), s;
      if (r === 6) Ln(t, u);
      else {
        if (h = t.current.alternate, (u & 30) === 0 && !Kx(h) && (r = Os(t, u), r === 2 && (v = pl(t), v !== 0 && (u = v, r = ju(t, v))), r === 1)) throw s = si, cr(t, 0), Ln(t, u), mt(t, Oe()), s;
        switch (t.finishedWork = h, t.finishedLanes = u, r) {
          case 0:
          case 1:
            throw Error(o(345));
          case 2:
            dr(t, pt, pn);
            break;
          case 3:
            if (Ln(t, u), (u & 130023424) === u && (r = Ru + 500 - Oe(), 10 < r)) {
              if (Wi(t, 0) !== 0) break;
              if (h = t.suspendedLanes, (h & u) !== u) {
                ot(), t.pingedLanes |= t.suspendedLanes & h;
                break;
              }
              t.timeoutHandle = Bl(dr.bind(null, t, pt, pn), r);
              break;
            }
            dr(t, pt, pn);
            break;
          case 4:
            if (Ln(t, u), (u & 4194240) === u) break;
            for (r = t.eventTimes, h = -1; 0 < u; ) {
              var _ = 31 - jt(u);
              v = 1 << _, _ = r[_], _ > h && (h = _), u &= ~v;
            }
            if (u = h, u = Oe() - u, u = (120 > u ? 120 : 480 > u ? 480 : 1080 > u ? 1080 : 1920 > u ? 1920 : 3e3 > u ? 3e3 : 4320 > u ? 4320 : 1960 * Gx(u / 1960)) - u, 10 < u) {
              t.timeoutHandle = Bl(dr.bind(null, t, pt, pn), u);
              break;
            }
            dr(t, pt, pn);
            break;
          case 5:
            dr(t, pt, pn);
            break;
          default:
            throw Error(o(329));
        }
      }
    }
    return mt(t, Oe()), t.callbackNode === s ? oh.bind(null, t) : null;
  }
  function ju(t, r) {
    var s = ai;
    return t.current.memoizedState.isDehydrated && (cr(t, r).flags |= 256), t = Os(t, r), t !== 2 && (r = pt, pt = s, r !== null && Iu(r)), t;
  }
  function Iu(t) {
    pt === null ? pt = t : pt.push.apply(pt, t);
  }
  function Kx(t) {
    for (var r = t; ; ) {
      if (r.flags & 16384) {
        var s = r.updateQueue;
        if (s !== null && (s = s.stores, s !== null)) for (var u = 0; u < s.length; u++) {
          var h = s[u], v = h.getSnapshot;
          h = h.value;
          try {
            if (!It(v(), h)) return !1;
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
  function Ln(t, r) {
    for (r &= ~Mu, r &= ~Rs, t.suspendedLanes |= r, t.pingedLanes &= ~r, t = t.expirationTimes; 0 < r; ) {
      var s = 31 - jt(r), u = 1 << s;
      t[s] = -1, r &= ~u;
    }
  }
  function ih(t) {
    if ((he & 6) !== 0) throw Error(o(327));
    qr();
    var r = Wi(t, 0);
    if ((r & 1) === 0) return mt(t, Oe()), null;
    var s = Os(t, r);
    if (t.tag !== 0 && s === 2) {
      var u = pl(t);
      u !== 0 && (r = u, s = ju(t, u));
    }
    if (s === 1) throw s = si, cr(t, 0), Ln(t, r), mt(t, Oe()), s;
    if (s === 6) throw Error(o(345));
    return t.finishedWork = t.current.alternate, t.finishedLanes = r, dr(t, pt, pn), mt(t, Oe()), null;
  }
  function Fu(t, r) {
    var s = he;
    he |= 1;
    try {
      return t(r);
    } finally {
      he = s, he === 0 && (Jr = Oe() + 500, cs && Rn());
    }
  }
  function ur(t) {
    Fn !== null && Fn.tag === 0 && (he & 6) === 0 && qr();
    var r = he;
    he |= 1;
    var s = bt.transition, u = _e;
    try {
      if (bt.transition = null, _e = 1, t) return t();
    } finally {
      _e = u, bt.transition = s, he = r, (he & 6) === 0 && Rn();
    }
  }
  function Ou() {
    xt = Zr.current, Me(Zr);
  }
  function cr(t, r) {
    t.finishedWork = null, t.finishedLanes = 0;
    var s = t.timeoutHandle;
    if (s !== -1 && (t.timeoutHandle = -1, Tx(s)), Ve !== null) for (s = Ve.return; s !== null; ) {
      var u = s;
      switch (Gl(u), u.tag) {
        case 1:
          u = u.type.childContextTypes, u != null && ls();
          break;
        case 3:
          Yr(), Me(ct), Me(qe), iu();
          break;
        case 5:
          ru(u);
          break;
        case 4:
          Yr();
          break;
        case 13:
          Me(Ne);
          break;
        case 19:
          Me(Ne);
          break;
        case 10:
          Jl(u.type._context);
          break;
        case 22:
        case 23:
          Ou();
      }
      s = s.return;
    }
    if (We = t, Ve = t = Vn(t.current, null), Xe = xt = r, $e = 0, si = null, Mu = Rs = lr = 0, pt = ai = null, ir !== null) {
      for (r = 0; r < ir.length; r++) if (s = ir[r], u = s.interleaved, u !== null) {
        s.interleaved = null;
        var h = u.next, v = s.pending;
        if (v !== null) {
          var _ = v.next;
          v.next = h, u.next = _;
        }
        s.pending = u;
      }
      ir = null;
    }
    return t;
  }
  function sh(t, r) {
    do {
      var s = Ve;
      try {
        if (Zl(), ws.current = ks, xs) {
          for (var u = je.memoizedState; u !== null; ) {
            var h = u.queue;
            h !== null && (h.pending = null), u = u.next;
          }
          xs = !1;
        }
        if (ar = 0, He = ze = je = null, ei = !1, ti = 0, Eu.current = null, s === null || s.return === null) {
          $e = 1, si = r, Ve = null;
          break;
        }
        e: {
          var v = t, _ = s.return, P = s, M = r;
          if (r = Xe, P.flags |= 32768, M !== null && typeof M == "object" && typeof M.then == "function") {
            var F = M, B = P, $ = B.tag;
            if ((B.mode & 1) === 0 && ($ === 0 || $ === 11 || $ === 15)) {
              var V = B.alternate;
              V ? (B.updateQueue = V.updateQueue, B.memoizedState = V.memoizedState, B.lanes = V.lanes) : (B.updateQueue = null, B.memoizedState = null);
            }
            var q = Rm(_);
            if (q !== null) {
              q.flags &= -257, Dm(q, _, P, v, r), q.mode & 1 && Mm(v, F, r), r = q, M = F;
              var te = r.updateQueue;
              if (te === null) {
                var oe = /* @__PURE__ */ new Set();
                oe.add(M), r.updateQueue = oe;
              } else te.add(M);
              break e;
            } else {
              if ((r & 1) === 0) {
                Mm(v, F, r), Lu();
                break e;
              }
              M = Error(o(426));
            }
          } else if (De && P.mode & 1) {
            var Le = Rm(_);
            if (Le !== null) {
              (Le.flags & 65536) === 0 && (Le.flags |= 256), Dm(Le, _, P, v, r), Ql(Qr(M, P));
              break e;
            }
          }
          v = M = Qr(M, P), $e !== 4 && ($e = 2), ai === null ? ai = [v] : ai.push(v), v = _;
          do {
            switch (v.tag) {
              case 3:
                v.flags |= 65536, r &= -r, v.lanes |= r;
                var j = Pm(v, M, r);
                tm(v, j);
                break e;
              case 1:
                P = M;
                var R = v.type, I = v.stateNode;
                if ((v.flags & 128) === 0 && (typeof R.getDerivedStateFromError == "function" || I !== null && typeof I.componentDidCatch == "function" && (In === null || !In.has(I)))) {
                  v.flags |= 65536, r &= -r, v.lanes |= r;
                  var U = Em(v, P, r);
                  tm(v, U);
                  break e;
                }
            }
            v = v.return;
          } while (v !== null);
        }
        uh(s);
      } catch (ie) {
        r = ie, Ve === s && s !== null && (Ve = s = s.return);
        continue;
      }
      break;
    } while (!0);
  }
  function ah() {
    var t = Ms.current;
    return Ms.current = ks, t === null ? ks : t;
  }
  function Lu() {
    ($e === 0 || $e === 3 || $e === 2) && ($e = 4), We === null || (lr & 268435455) === 0 && (Rs & 268435455) === 0 || Ln(We, Xe);
  }
  function Os(t, r) {
    var s = he;
    he |= 2;
    var u = ah();
    (We !== t || Xe !== r) && (pn = null, cr(t, r));
    do
      try {
        Yx();
        break;
      } catch (h) {
        sh(t, h);
      }
    while (!0);
    if (Zl(), he = s, Ms.current = u, Ve !== null) throw Error(o(261));
    return We = null, Xe = 0, $e;
  }
  function Yx() {
    for (; Ve !== null; ) lh(Ve);
  }
  function Qx() {
    for (; Ve !== null && !ww(); ) lh(Ve);
  }
  function lh(t) {
    var r = fh(t.alternate, t, xt);
    t.memoizedProps = t.pendingProps, r === null ? uh(t) : Ve = r, Eu.current = null;
  }
  function uh(t) {
    var r = t;
    do {
      var s = r.alternate;
      if (t = r.return, (r.flags & 32768) === 0) {
        if (s = zx(s, r, xt), s !== null) {
          Ve = s;
          return;
        }
      } else {
        if (s = $x(s, r), s !== null) {
          s.flags &= 32767, Ve = s;
          return;
        }
        if (t !== null) t.flags |= 32768, t.subtreeFlags = 0, t.deletions = null;
        else {
          $e = 6, Ve = null;
          return;
        }
      }
      if (r = r.sibling, r !== null) {
        Ve = r;
        return;
      }
      Ve = r = t;
    } while (r !== null);
    $e === 0 && ($e = 5);
  }
  function dr(t, r, s) {
    var u = _e, h = bt.transition;
    try {
      bt.transition = null, _e = 1, Xx(t, r, s, u);
    } finally {
      bt.transition = h, _e = u;
    }
    return null;
  }
  function Xx(t, r, s, u) {
    do
      qr();
    while (Fn !== null);
    if ((he & 6) !== 0) throw Error(o(327));
    s = t.finishedWork;
    var h = t.finishedLanes;
    if (s === null) return null;
    if (t.finishedWork = null, t.finishedLanes = 0, s === t.current) throw Error(o(177));
    t.callbackNode = null, t.callbackPriority = 0;
    var v = s.lanes | s.childLanes;
    if (Mw(t, v), t === We && (Ve = We = null, Xe = 0), (s.subtreeFlags & 2064) === 0 && (s.flags & 2064) === 0 || Ns || (Ns = !0, ph(zi, function() {
      return qr(), null;
    })), v = (s.flags & 15990) !== 0, (s.subtreeFlags & 15990) !== 0 || v) {
      v = bt.transition, bt.transition = null;
      var _ = _e;
      _e = 1;
      var P = he;
      he |= 4, Eu.current = null, Hx(t, s), qm(s, t), yx(Ll), Yi = !!Ol, Ll = Ol = null, t.current = s, Wx(s), xw(), he = P, _e = _, bt.transition = v;
    } else t.current = s;
    if (Ns && (Ns = !1, Fn = t, js = h), v = t.pendingLanes, v === 0 && (In = null), kw(s.stateNode), mt(t, Oe()), r !== null) for (u = t.onRecoverableError, s = 0; s < r.length; s++) h = r[s], u(h.value, { componentStack: h.stack, digest: h.digest });
    if (Ds) throw Ds = !1, t = Du, Du = null, t;
    return (js & 1) !== 0 && t.tag !== 0 && qr(), v = t.pendingLanes, (v & 1) !== 0 ? t === Nu ? li++ : (li = 0, Nu = t) : li = 0, Rn(), null;
  }
  function qr() {
    if (Fn !== null) {
      var t = Zf(js), r = bt.transition, s = _e;
      try {
        if (bt.transition = null, _e = 16 > t ? 16 : t, Fn === null) var u = !1;
        else {
          if (t = Fn, Fn = null, js = 0, (he & 6) !== 0) throw Error(o(331));
          var h = he;
          for (he |= 4, ee = t.current; ee !== null; ) {
            var v = ee, _ = v.child;
            if ((ee.flags & 16) !== 0) {
              var P = v.deletions;
              if (P !== null) {
                for (var M = 0; M < P.length; M++) {
                  var F = P[M];
                  for (ee = F; ee !== null; ) {
                    var B = ee;
                    switch (B.tag) {
                      case 0:
                      case 11:
                      case 15:
                        ii(8, B, v);
                    }
                    var $ = B.child;
                    if ($ !== null) $.return = B, ee = $;
                    else for (; ee !== null; ) {
                      B = ee;
                      var V = B.sibling, q = B.return;
                      if (Ym(B), B === F) {
                        ee = null;
                        break;
                      }
                      if (V !== null) {
                        V.return = q, ee = V;
                        break;
                      }
                      ee = q;
                    }
                  }
                }
                var te = v.alternate;
                if (te !== null) {
                  var oe = te.child;
                  if (oe !== null) {
                    te.child = null;
                    do {
                      var Le = oe.sibling;
                      oe.sibling = null, oe = Le;
                    } while (oe !== null);
                  }
                }
                ee = v;
              }
            }
            if ((v.subtreeFlags & 2064) !== 0 && _ !== null) _.return = v, ee = _;
            else e: for (; ee !== null; ) {
              if (v = ee, (v.flags & 2048) !== 0) switch (v.tag) {
                case 0:
                case 11:
                case 15:
                  ii(9, v, v.return);
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
            _ = ee;
            var I = _.child;
            if ((_.subtreeFlags & 2064) !== 0 && I !== null) I.return = _, ee = I;
            else e: for (_ = R; ee !== null; ) {
              if (P = ee, (P.flags & 2048) !== 0) try {
                switch (P.tag) {
                  case 0:
                  case 11:
                  case 15:
                    Es(9, P);
                }
              } catch (ie) {
                Fe(P, P.return, ie);
              }
              if (P === _) {
                ee = null;
                break e;
              }
              var U = P.sibling;
              if (U !== null) {
                U.return = P.return, ee = U;
                break e;
              }
              ee = P.return;
            }
          }
          if (he = h, Rn(), Kt && typeof Kt.onPostCommitFiberRoot == "function") try {
            Kt.onPostCommitFiberRoot($i, t);
          } catch {
          }
          u = !0;
        }
        return u;
      } finally {
        _e = s, bt.transition = r;
      }
    }
    return !1;
  }
  function ch(t, r, s) {
    r = Qr(s, r), r = Pm(t, r, 1), t = Nn(t, r, 1), r = ot(), t !== null && (Do(t, 1, r), mt(t, r));
  }
  function Fe(t, r, s) {
    if (t.tag === 3) ch(t, t, s);
    else for (; r !== null; ) {
      if (r.tag === 3) {
        ch(r, t, s);
        break;
      } else if (r.tag === 1) {
        var u = r.stateNode;
        if (typeof r.type.getDerivedStateFromError == "function" || typeof u.componentDidCatch == "function" && (In === null || !In.has(u))) {
          t = Qr(s, t), t = Em(r, t, 1), r = Nn(r, t, 1), t = ot(), r !== null && (Do(r, 1, t), mt(r, t));
          break;
        }
      }
      r = r.return;
    }
  }
  function Zx(t, r, s) {
    var u = t.pingCache;
    u !== null && u.delete(r), r = ot(), t.pingedLanes |= t.suspendedLanes & s, We === t && (Xe & s) === s && ($e === 4 || $e === 3 && (Xe & 130023424) === Xe && 500 > Oe() - Ru ? cr(t, 0) : Mu |= s), mt(t, r);
  }
  function dh(t, r) {
    r === 0 && ((t.mode & 1) === 0 ? r = 1 : (r = Hi, Hi <<= 1, (Hi & 130023424) === 0 && (Hi = 4194304)));
    var s = ot();
    t = cn(t, r), t !== null && (Do(t, r, s), mt(t, s));
  }
  function Jx(t) {
    var r = t.memoizedState, s = 0;
    r !== null && (s = r.retryLane), dh(t, s);
  }
  function qx(t, r) {
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
    u !== null && u.delete(r), dh(t, s);
  }
  var fh;
  fh = function(t, r, s) {
    if (t !== null) if (t.memoizedProps !== r.pendingProps || ct.current) ft = !0;
    else {
      if ((t.lanes & s) === 0 && (r.flags & 128) === 0) return ft = !1, Bx(t, r, s);
      ft = (t.flags & 131072) !== 0;
    }
    else ft = !1, De && (r.flags & 1048576) !== 0 && Wp(r, fs, r.index);
    switch (r.lanes = 0, r.tag) {
      case 2:
        var u = r.type;
        bs(t, r), t = r.pendingProps;
        var h = zr(r, qe.current);
        Kr(r, s), h = lu(null, r, u, t, h, s);
        var v = uu();
        return r.flags |= 1, typeof h == "object" && h !== null && typeof h.render == "function" && h.$$typeof === void 0 ? (r.tag = 1, r.memoizedState = null, r.updateQueue = null, dt(u) ? (v = !0, us(r)) : v = !1, r.memoizedState = h.state !== null && h.state !== void 0 ? h.state : null, tu(r), h.updater = As, r.stateNode = h, h._reactInternals = r, hu(r, u, t, s), r = Su(null, r, u, !0, v, s)) : (r.tag = 0, De && v && Wl(r), rt(null, r, h, s), r = r.child), r;
      case 16:
        u = r.elementType;
        e: {
          switch (bs(t, r), t = r.pendingProps, h = u._init, u = h(u._payload), r.type = u, h = r.tag = t1(u), t = Ot(u, t), h) {
            case 0:
              r = vu(null, r, u, t, s);
              break e;
            case 1:
              r = Lm(null, r, u, t, s);
              break e;
            case 11:
              r = Nm(null, r, u, t, s);
              break e;
            case 14:
              r = jm(null, r, u, Ot(u.type, t), s);
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
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Ot(u, h), vu(t, r, u, h, s);
      case 1:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Ot(u, h), Lm(t, r, u, h, s);
      case 3:
        e: {
          if (Vm(r), t === null) throw Error(o(387));
          u = r.pendingProps, v = r.memoizedState, h = v.element, em(t, r), vs(r, u, null, s);
          var _ = r.memoizedState;
          if (u = _.element, v.isDehydrated) if (v = { element: u, isDehydrated: !1, cache: _.cache, pendingSuspenseBoundaries: _.pendingSuspenseBoundaries, transitions: _.transitions }, r.updateQueue.baseState = v, r.memoizedState = v, r.flags & 256) {
            h = Qr(Error(o(423)), r), r = Bm(t, r, u, s, h);
            break e;
          } else if (u !== h) {
            h = Qr(Error(o(424)), r), r = Bm(t, r, u, s, h);
            break e;
          } else for (wt = Pn(r.stateNode.containerInfo.firstChild), St = r, De = !0, Ft = null, s = Jp(r, null, u, s), r.child = s; s; ) s.flags = s.flags & -3 | 4096, s = s.sibling;
          else {
            if (Hr(), u === h) {
              r = fn(t, r, s);
              break e;
            }
            rt(t, r, u, s);
          }
          r = r.child;
        }
        return r;
      case 5:
        return rm(r), t === null && Yl(r), u = r.type, h = r.pendingProps, v = t !== null ? t.memoizedProps : null, _ = h.children, Vl(u, h) ? _ = null : v !== null && Vl(u, v) && (r.flags |= 32), Om(t, r), rt(t, r, _, s), r.child;
      case 6:
        return t === null && Yl(r), null;
      case 13:
        return zm(t, r, s);
      case 4:
        return nu(r, r.stateNode.containerInfo), u = r.pendingProps, t === null ? r.child = Wr(r, null, u, s) : rt(t, r, u, s), r.child;
      case 11:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Ot(u, h), Nm(t, r, u, h, s);
      case 7:
        return rt(t, r, r.pendingProps, s), r.child;
      case 8:
        return rt(t, r, r.pendingProps.children, s), r.child;
      case 12:
        return rt(t, r, r.pendingProps.children, s), r.child;
      case 10:
        e: {
          if (u = r.type._context, h = r.pendingProps, v = r.memoizedProps, _ = h.value, be(hs, u._currentValue), u._currentValue = _, v !== null) if (It(v.value, _)) {
            if (v.children === h.children && !ct.current) {
              r = fn(t, r, s);
              break e;
            }
          } else for (v = r.child, v !== null && (v.return = r); v !== null; ) {
            var P = v.dependencies;
            if (P !== null) {
              _ = v.child;
              for (var M = P.firstContext; M !== null; ) {
                if (M.context === u) {
                  if (v.tag === 1) {
                    M = dn(-1, s & -s), M.tag = 2;
                    var F = v.updateQueue;
                    if (F !== null) {
                      F = F.shared;
                      var B = F.pending;
                      B === null ? M.next = M : (M.next = B.next, B.next = M), F.pending = M;
                    }
                  }
                  v.lanes |= s, M = v.alternate, M !== null && (M.lanes |= s), ql(
                    v.return,
                    s,
                    r
                  ), P.lanes |= s;
                  break;
                }
                M = M.next;
              }
            } else if (v.tag === 10) _ = v.type === r.type ? null : v.child;
            else if (v.tag === 18) {
              if (_ = v.return, _ === null) throw Error(o(341));
              _.lanes |= s, P = _.alternate, P !== null && (P.lanes |= s), ql(_, s, r), _ = v.sibling;
            } else _ = v.child;
            if (_ !== null) _.return = v;
            else for (_ = v; _ !== null; ) {
              if (_ === r) {
                _ = null;
                break;
              }
              if (v = _.sibling, v !== null) {
                v.return = _.return, _ = v;
                break;
              }
              _ = _.return;
            }
            v = _;
          }
          rt(t, r, h.children, s), r = r.child;
        }
        return r;
      case 9:
        return h = r.type, u = r.pendingProps.children, Kr(r, s), h = At(h), u = u(h), r.flags |= 1, rt(t, r, u, s), r.child;
      case 14:
        return u = r.type, h = Ot(u, r.pendingProps), h = Ot(u.type, h), jm(t, r, u, h, s);
      case 15:
        return Im(t, r, r.type, r.pendingProps, s);
      case 17:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Ot(u, h), bs(t, r), r.tag = 1, dt(u) ? (t = !0, us(r)) : t = !1, Kr(r, s), Cm(r, u, h), hu(r, u, h, s), Su(null, r, u, !0, t, s);
      case 19:
        return Um(t, r, s);
      case 22:
        return Fm(t, r, s);
    }
    throw Error(o(156, r.tag));
  };
  function ph(t, r) {
    return Gf(t, r);
  }
  function e1(t, r, s, u) {
    this.tag = t, this.key = s, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = r, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = u, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function Pt(t, r, s, u) {
    return new e1(t, r, s, u);
  }
  function Vu(t) {
    return t = t.prototype, !(!t || !t.isReactComponent);
  }
  function t1(t) {
    if (typeof t == "function") return Vu(t) ? 1 : 0;
    if (t != null) {
      if (t = t.$$typeof, t === Z) return 11;
      if (t === Se) return 14;
    }
    return 2;
  }
  function Vn(t, r) {
    var s = t.alternate;
    return s === null ? (s = Pt(t.tag, r, t.key, t.mode), s.elementType = t.elementType, s.type = t.type, s.stateNode = t.stateNode, s.alternate = t, t.alternate = s) : (s.pendingProps = r, s.type = t.type, s.flags = 0, s.subtreeFlags = 0, s.deletions = null), s.flags = t.flags & 14680064, s.childLanes = t.childLanes, s.lanes = t.lanes, s.child = t.child, s.memoizedProps = t.memoizedProps, s.memoizedState = t.memoizedState, s.updateQueue = t.updateQueue, r = t.dependencies, s.dependencies = r === null ? null : { lanes: r.lanes, firstContext: r.firstContext }, s.sibling = t.sibling, s.index = t.index, s.ref = t.ref, s;
  }
  function Ls(t, r, s, u, h, v) {
    var _ = 2;
    if (u = t, typeof t == "function") Vu(t) && (_ = 1);
    else if (typeof t == "string") _ = 5;
    else e: switch (t) {
      case W:
        return fr(s.children, h, v, r);
      case G:
        _ = 8, h |= 8;
        break;
      case K:
        return t = Pt(12, s, r, h | 2), t.elementType = K, t.lanes = v, t;
      case de:
        return t = Pt(13, s, r, h), t.elementType = de, t.lanes = v, t;
      case ce:
        return t = Pt(19, s, r, h), t.elementType = ce, t.lanes = v, t;
      case we:
        return Vs(s, h, v, r);
      default:
        if (typeof t == "object" && t !== null) switch (t.$$typeof) {
          case X:
            _ = 10;
            break e;
          case se:
            _ = 9;
            break e;
          case Z:
            _ = 11;
            break e;
          case Se:
            _ = 14;
            break e;
          case re:
            _ = 16, u = null;
            break e;
        }
        throw Error(o(130, t == null ? t : typeof t, ""));
    }
    return r = Pt(_, s, r, h), r.elementType = t, r.type = u, r.lanes = v, r;
  }
  function fr(t, r, s, u) {
    return t = Pt(7, t, u, r), t.lanes = s, t;
  }
  function Vs(t, r, s, u) {
    return t = Pt(22, t, u, r), t.elementType = we, t.lanes = s, t.stateNode = { isHidden: !1 }, t;
  }
  function Bu(t, r, s) {
    return t = Pt(6, t, null, r), t.lanes = s, t;
  }
  function zu(t, r, s) {
    return r = Pt(4, t.children !== null ? t.children : [], t.key, r), r.lanes = s, r.stateNode = { containerInfo: t.containerInfo, pendingChildren: null, implementation: t.implementation }, r;
  }
  function n1(t, r, s, u, h) {
    this.tag = r, this.containerInfo = t, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = ml(0), this.expirationTimes = ml(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = ml(0), this.identifierPrefix = u, this.onRecoverableError = h, this.mutableSourceEagerHydrationData = null;
  }
  function $u(t, r, s, u, h, v, _, P, M) {
    return t = new n1(t, r, s, P, M), r === 1 ? (r = 1, v === !0 && (r |= 8)) : r = 0, v = Pt(3, null, null, r), t.current = v, v.stateNode = t, v.memoizedState = { element: u, isDehydrated: s, cache: null, transitions: null, pendingSuspenseBoundaries: null }, tu(v), t;
  }
  function r1(t, r, s) {
    var u = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return { $$typeof: H, key: u == null ? null : "" + u, children: t, containerInfo: r, implementation: s };
  }
  function mh(t) {
    if (!t) return Mn;
    t = t._reactInternals;
    e: {
      if (er(t) !== t || t.tag !== 1) throw Error(o(170));
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
      if (dt(s)) return $p(t, s, r);
    }
    return r;
  }
  function hh(t, r, s, u, h, v, _, P, M) {
    return t = $u(s, u, !0, t, h, v, _, P, M), t.context = mh(null), s = t.current, u = ot(), h = On(s), v = dn(u, h), v.callback = r ?? null, Nn(s, v, h), t.current.lanes = h, Do(t, h, u), mt(t, u), t;
  }
  function Bs(t, r, s, u) {
    var h = r.current, v = ot(), _ = On(h);
    return s = mh(s), r.context === null ? r.context = s : r.pendingContext = s, r = dn(v, _), r.payload = { element: t }, u = u === void 0 ? null : u, u !== null && (r.callback = u), t = Nn(h, r, _), t !== null && (Bt(t, h, _, v), gs(t, h, _)), _;
  }
  function zs(t) {
    if (t = t.current, !t.child) return null;
    switch (t.child.tag) {
      case 5:
        return t.child.stateNode;
      default:
        return t.child.stateNode;
    }
  }
  function yh(t, r) {
    if (t = t.memoizedState, t !== null && t.dehydrated !== null) {
      var s = t.retryLane;
      t.retryLane = s !== 0 && s < r ? s : r;
    }
  }
  function Uu(t, r) {
    yh(t, r), (t = t.alternate) && yh(t, r);
  }
  function o1() {
    return null;
  }
  var gh = typeof reportError == "function" ? reportError : function(t) {
    console.error(t);
  };
  function Hu(t) {
    this._internalRoot = t;
  }
  $s.prototype.render = Hu.prototype.render = function(t) {
    var r = this._internalRoot;
    if (r === null) throw Error(o(409));
    Bs(t, r, null, null);
  }, $s.prototype.unmount = Hu.prototype.unmount = function() {
    var t = this._internalRoot;
    if (t !== null) {
      this._internalRoot = null;
      var r = t.containerInfo;
      ur(function() {
        Bs(null, t, null, null);
      }), r[sn] = null;
    }
  };
  function $s(t) {
    this._internalRoot = t;
  }
  $s.prototype.unstable_scheduleHydration = function(t) {
    if (t) {
      var r = ep();
      t = { blockedOn: null, target: t, priority: r };
      for (var s = 0; s < An.length && r !== 0 && r < An[s].priority; s++) ;
      An.splice(s, 0, t), s === 0 && rp(t);
    }
  };
  function Wu(t) {
    return !(!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11);
  }
  function Us(t) {
    return !(!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11 && (t.nodeType !== 8 || t.nodeValue !== " react-mount-point-unstable "));
  }
  function vh() {
  }
  function i1(t, r, s, u, h) {
    if (h) {
      if (typeof u == "function") {
        var v = u;
        u = function() {
          var F = zs(_);
          v.call(F);
        };
      }
      var _ = hh(r, u, t, 0, null, !1, !1, "", vh);
      return t._reactRootContainer = _, t[sn] = _.current, Go(t.nodeType === 8 ? t.parentNode : t), ur(), _;
    }
    for (; h = t.lastChild; ) t.removeChild(h);
    if (typeof u == "function") {
      var P = u;
      u = function() {
        var F = zs(M);
        P.call(F);
      };
    }
    var M = $u(t, 0, !1, null, null, !1, !1, "", vh);
    return t._reactRootContainer = M, t[sn] = M.current, Go(t.nodeType === 8 ? t.parentNode : t), ur(function() {
      Bs(r, M, s, u);
    }), M;
  }
  function Hs(t, r, s, u, h) {
    var v = s._reactRootContainer;
    if (v) {
      var _ = v;
      if (typeof h == "function") {
        var P = h;
        h = function() {
          var M = zs(_);
          P.call(M);
        };
      }
      Bs(r, _, t, h);
    } else _ = i1(s, r, t, h, u);
    return zs(_);
  }
  Jf = function(t) {
    switch (t.tag) {
      case 3:
        var r = t.stateNode;
        if (r.current.memoizedState.isDehydrated) {
          var s = Ro(r.pendingLanes);
          s !== 0 && (hl(r, s | 1), mt(r, Oe()), (he & 6) === 0 && (Jr = Oe() + 500, Rn()));
        }
        break;
      case 13:
        ur(function() {
          var u = cn(t, 1);
          if (u !== null) {
            var h = ot();
            Bt(u, t, 1, h);
          }
        }), Uu(t, 1);
    }
  }, yl = function(t) {
    if (t.tag === 13) {
      var r = cn(t, 134217728);
      if (r !== null) {
        var s = ot();
        Bt(r, t, 134217728, s);
      }
      Uu(t, 134217728);
    }
  }, qf = function(t) {
    if (t.tag === 13) {
      var r = On(t), s = cn(t, r);
      if (s !== null) {
        var u = ot();
        Bt(s, t, r, u);
      }
      Uu(t, r);
    }
  }, ep = function() {
    return _e;
  }, tp = function(t, r) {
    var s = _e;
    try {
      return _e = t, r();
    } finally {
      _e = s;
    }
  }, ll = function(t, r, s) {
    switch (r) {
      case "input":
        if (el(t, s), r = s.name, s.type === "radio" && r != null) {
          for (s = t; s.parentNode; ) s = s.parentNode;
          for (s = s.querySelectorAll("input[name=" + JSON.stringify("" + r) + '][type="radio"]'), r = 0; r < s.length; r++) {
            var u = s[r];
            if (u !== t && u.form === t.form) {
              var h = as(u);
              if (!h) throw Error(o(90));
              Af(u), el(u, h);
            }
          }
        }
        break;
      case "textarea":
        Mf(t, s);
        break;
      case "select":
        r = s.value, r != null && Er(t, !!s.multiple, r, !1);
    }
  }, Vf = Fu, Bf = ur;
  var s1 = { usingClientEntryPoint: !1, Events: [Qo, Vr, as, Of, Lf, Fu] }, ui = { findFiberByHostInstance: tr, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, a1 = { bundleType: ui.bundleType, version: ui.version, rendererPackageName: ui.rendererPackageName, rendererConfig: ui.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: D.ReactCurrentDispatcher, findHostInstanceByFiber: function(t) {
    return t = Hf(t), t === null ? null : t.stateNode;
  }, findFiberByHostInstance: ui.findFiberByHostInstance || o1, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Ws = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Ws.isDisabled && Ws.supportsFiber) try {
      $i = Ws.inject(a1), Kt = Ws;
    } catch {
    }
  }
  return ht.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = s1, ht.createPortal = function(t, r) {
    var s = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!Wu(r)) throw Error(o(200));
    return r1(t, r, null, s);
  }, ht.createRoot = function(t, r) {
    if (!Wu(t)) throw Error(o(299));
    var s = !1, u = "", h = gh;
    return r != null && (r.unstable_strictMode === !0 && (s = !0), r.identifierPrefix !== void 0 && (u = r.identifierPrefix), r.onRecoverableError !== void 0 && (h = r.onRecoverableError)), r = $u(t, 1, !1, null, null, s, !1, u, h), t[sn] = r.current, Go(t.nodeType === 8 ? t.parentNode : t), new Hu(r);
  }, ht.findDOMNode = function(t) {
    if (t == null) return null;
    if (t.nodeType === 1) return t;
    var r = t._reactInternals;
    if (r === void 0)
      throw typeof t.render == "function" ? Error(o(188)) : (t = Object.keys(t).join(","), Error(o(268, t)));
    return t = Hf(r), t = t === null ? null : t.stateNode, t;
  }, ht.flushSync = function(t) {
    return ur(t);
  }, ht.hydrate = function(t, r, s) {
    if (!Us(r)) throw Error(o(200));
    return Hs(null, t, r, !0, s);
  }, ht.hydrateRoot = function(t, r, s) {
    if (!Wu(t)) throw Error(o(405));
    var u = s != null && s.hydratedSources || null, h = !1, v = "", _ = gh;
    if (s != null && (s.unstable_strictMode === !0 && (h = !0), s.identifierPrefix !== void 0 && (v = s.identifierPrefix), s.onRecoverableError !== void 0 && (_ = s.onRecoverableError)), r = hh(r, null, t, 1, s ?? null, h, !1, v, _), t[sn] = r.current, Go(t), u) for (t = 0; t < u.length; t++) s = u[t], h = s._getVersion, h = h(s._source), r.mutableSourceEagerHydrationData == null ? r.mutableSourceEagerHydrationData = [s, h] : r.mutableSourceEagerHydrationData.push(
      s,
      h
    );
    return new $s(r);
  }, ht.render = function(t, r, s) {
    if (!Us(r)) throw Error(o(200));
    return Hs(null, t, r, !1, s);
  }, ht.unmountComponentAtNode = function(t) {
    if (!Us(t)) throw Error(o(40));
    return t._reactRootContainer ? (ur(function() {
      Hs(null, null, t, !1, function() {
        t._reactRootContainer = null, t[sn] = null;
      });
    }), !0) : !1;
  }, ht.unstable_batchedUpdates = Fu, ht.unstable_renderSubtreeIntoContainer = function(t, r, s, u) {
    if (!Us(s)) throw Error(o(200));
    if (t == null || t._reactInternals === void 0) throw Error(o(38));
    return Hs(t, r, s, !1, u);
  }, ht.version = "18.3.1-next-f1338f8080-20240426", ht;
}
var bh;
function jg() {
  if (bh) return Ku.exports;
  bh = 1;
  function e() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(e);
      } catch (n) {
        console.error(n);
      }
  }
  return e(), Ku.exports = v1(), Ku.exports;
}
var Ph;
function S1() {
  if (Ph) return Gs;
  Ph = 1;
  var e = jg();
  return Gs.createRoot = e.createRoot, Gs.hydrateRoot = e.hydrateRoot, Gs;
}
var w1 = S1(), Xu = { exports: {} }, di = {};
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Eh;
function x1() {
  if (Eh) return di;
  Eh = 1;
  var e = Td(), n = Symbol.for("react.element"), o = Symbol.for("react.fragment"), i = Object.prototype.hasOwnProperty, a = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, d = { key: !0, ref: !0, __self: !0, __source: !0 };
  function c(p, m, y) {
    var g, l = {}, f = null, S = null;
    y !== void 0 && (f = "" + y), m.key !== void 0 && (f = "" + m.key), m.ref !== void 0 && (S = m.ref);
    for (g in m) i.call(m, g) && !d.hasOwnProperty(g) && (l[g] = m[g]);
    if (p && p.defaultProps) for (g in m = p.defaultProps, m) l[g] === void 0 && (l[g] = m[g]);
    return { $$typeof: n, type: p, key: f, ref: S, props: l, _owner: a.current };
  }
  return di.Fragment = o, di.jsx = c, di.jsxs = c, di;
}
var Mh;
function _1() {
  return Mh || (Mh = 1, Xu.exports = x1()), Xu.exports;
}
var w = _1();
const Rh = (e) => Symbol.iterator in e, Dh = (e) => (
  // HACK: avoid checking entries type
  "entries" in e
), Nh = (e, n) => {
  const o = e instanceof Map ? e : new Map(e.entries()), i = n instanceof Map ? n : new Map(n.entries());
  if (o.size !== i.size)
    return !1;
  for (const [a, d] of o)
    if (!i.has(a) || !Object.is(d, i.get(a)))
      return !1;
  return !0;
}, T1 = (e, n) => {
  const o = e[Symbol.iterator](), i = n[Symbol.iterator]();
  let a = o.next(), d = i.next();
  for (; !a.done && !d.done; ) {
    if (!Object.is(a.value, d.value))
      return !1;
    a = o.next(), d = i.next();
  }
  return !!a.done && !!d.done;
};
function k1(e, n) {
  return Object.is(e, n) ? !0 : typeof e != "object" || e === null || typeof n != "object" || n === null || Object.getPrototypeOf(e) !== Object.getPrototypeOf(n) ? !1 : Rh(e) && Rh(n) ? Dh(e) && Dh(n) ? Nh(e, n) : T1(e, n) : Nh(
    { entries: () => Object.entries(e) },
    { entries: () => Object.entries(n) }
  );
}
function A1(e) {
  const n = yn.useRef(void 0);
  return (o) => {
    const i = e(o);
    return k1(n.current, i) ? n.current : n.current = i;
  };
}
const kd = C.createContext({});
function Ad(e) {
  const n = C.useRef(null);
  return n.current === null && (n.current = e()), n.current;
}
const C1 = typeof window < "u", Ig = C1 ? C.useLayoutEffect : C.useEffect, za = /* @__PURE__ */ C.createContext(null);
function Cd(e, n) {
  e.indexOf(n) === -1 && e.push(n);
}
function Ta(e, n) {
  const o = e.indexOf(n);
  o > -1 && e.splice(o, 1);
}
const on = (e, n, o) => o > n ? n : o < e ? e : o;
function jh(e, n) {
  return n ? `${e}. For more information and steps for solving, visit https://motion.dev/troubleshooting/${n}` : e;
}
let Pi = () => {
}, br = () => {
};
var Pg;
typeof process < "u" && ((Pg = process.env) == null ? void 0 : Pg.NODE_ENV) !== "production" && (Pi = (e, n, o) => {
  !e && typeof console < "u" && console.warn(jh(n, o));
}, br = (e, n, o) => {
  if (!e)
    throw new Error(jh(n, o));
});
const Qn = {}, Fg = (e) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(e), Og = (e) => typeof e == "object" && e !== null, Lg = (e) => /^0[^.\s]+$/u.test(e);
// @__NO_SIDE_EFFECTS__
function Vg(e) {
  let n;
  return () => (n === void 0 && (n = e()), n);
}
const Nt = /* @__NO_SIDE_EFFECTS__ */ (e) => e, Ei = (...e) => e.reduce((n, o) => (i) => o(n(i))), xi = /* @__NO_SIDE_EFFECTS__ */ (e, n, o) => {
  const i = n - e;
  return i ? (o - e) / i : 1;
};
class bd {
  constructor() {
    this.subscriptions = [];
  }
  add(n) {
    return Cd(this.subscriptions, n), () => Ta(this.subscriptions, n);
  }
  notify(n, o, i) {
    const a = this.subscriptions.length;
    if (a)
      if (a === 1)
        this.subscriptions[0](n, o, i);
      else
        for (let d = 0; d < a; d++) {
          const c = this.subscriptions[d];
          c && c(n, o, i);
        }
  }
  getSize() {
    return this.subscriptions.length;
  }
  clear() {
    this.subscriptions.length = 0;
  }
}
const yt = /* @__NO_SIDE_EFFECTS__ */ (e) => e * 1e3, Dt = /* @__NO_SIDE_EFFECTS__ */ (e) => e / 1e3, Bg = /* @__NO_SIDE_EFFECTS__ */ (e, n) => n ? e * (1e3 / n) : 0, zg = (e, n, o) => (((1 - 3 * o + 3 * n) * e + (3 * o - 6 * n)) * e + 3 * n) * e, b1 = 1e-7, P1 = 12;
function E1(e, n, o, i, a) {
  let d, c, p = 0;
  do
    c = n + (o - n) / 2, d = zg(c, i, a) - e, d > 0 ? o = c : n = c;
  while (Math.abs(d) > b1 && ++p < P1);
  return c;
}
// @__NO_SIDE_EFFECTS__
function Mi(e, n, o, i) {
  if (e === n && o === i)
    return Nt;
  const a = (d) => E1(d, 0, 1, e, o);
  return (d) => d === 0 || d === 1 ? d : zg(a(d), n, i);
}
const $g = /* @__NO_SIDE_EFFECTS__ */ (e) => (n) => n <= 0.5 ? e(2 * n) / 2 : (2 - e(2 * (1 - n))) / 2, Ug = /* @__NO_SIDE_EFFECTS__ */ (e) => (n) => 1 - e(1 - n), Hg = /* @__PURE__ */ Mi(0.33, 1.53, 0.69, 0.99), Pd = /* @__PURE__ */ Ug(Hg), Wg = /* @__PURE__ */ $g(Pd), Gg = (e) => e >= 1 ? 1 : (e *= 2) < 1 ? 0.5 * Pd(e) : 0.5 * (2 - Math.pow(2, -10 * (e - 1))), Ed = (e) => 1 - Math.sin(Math.acos(e)), Kg = /* @__PURE__ */ Ug(Ed), Yg = /* @__PURE__ */ $g(Ed), M1 = /* @__PURE__ */ Mi(0.42, 0, 1, 1), R1 = /* @__PURE__ */ Mi(0, 0, 0.58, 1), Qg = /* @__PURE__ */ Mi(0.42, 0, 0.58, 1), D1 = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] != "number", Xg = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] == "number", Ih = {
  linear: Nt,
  easeIn: M1,
  easeInOut: Qg,
  easeOut: R1,
  circIn: Ed,
  circInOut: Yg,
  circOut: Kg,
  backIn: Pd,
  backInOut: Wg,
  backOut: Hg,
  anticipate: Gg
}, N1 = (e) => typeof e == "string", Fh = (e) => {
  if (/* @__PURE__ */ Xg(e)) {
    br(e.length === 4, "Cubic bezier arrays must contain four numerical values.", "cubic-bezier-length");
    const [n, o, i, a] = e;
    return /* @__PURE__ */ Mi(n, o, i, a);
  } else if (N1(e))
    return br(Ih[e] !== void 0, `Invalid easing type '${e}'`, "invalid-easing-type"), Ih[e];
  return e;
}, Ks = [
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
function j1(e, n) {
  let o = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Set(), a = !1, d = !1;
  const c = /* @__PURE__ */ new WeakSet();
  let p = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  };
  function m(g) {
    c.has(g) && (y.schedule(g), e()), g(p);
  }
  const y = {
    /**
     * Schedule a process to run on the next frame.
     */
    schedule: (g, l = !1, f = !1) => {
      const x = f && a ? o : i;
      return l && c.add(g), x.add(g), g;
    },
    /**
     * Cancel the provided callback from running on the next frame.
     */
    cancel: (g) => {
      i.delete(g), c.delete(g);
    },
    /**
     * Execute all schedule callbacks.
     */
    process: (g) => {
      if (p = g, a) {
        d = !0;
        return;
      }
      a = !0;
      const l = o;
      o = i, i = l, o.forEach(m), o.clear(), a = !1, d && (d = !1, y.process(g));
    }
  };
  return y;
}
const I1 = 40;
function Zg(e, n) {
  let o = !1, i = !0;
  const a = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  }, d = () => o = !0, c = Ks.reduce((E, D) => (E[D] = j1(d), E), {}), { setup: p, read: m, resolveKeyframes: y, preUpdate: g, update: l, preRender: f, render: S, postRender: x } = c, k = () => {
    const E = Qn.useManualTiming, D = E ? a.timestamp : performance.now();
    o = !1, E || (a.delta = i ? 1e3 / 60 : Math.max(Math.min(D - a.timestamp, I1), 1)), a.timestamp = D, a.isProcessing = !0, p.process(a), m.process(a), y.process(a), g.process(a), l.process(a), f.process(a), S.process(a), x.process(a), a.isProcessing = !1, o && n && (i = !1, e(k));
  }, A = () => {
    o = !0, i = !0, a.isProcessing || e(k);
  };
  return { schedule: Ks.reduce((E, D) => {
    const O = c[D];
    return E[D] = (H, W = !1, G = !1) => (o || A(), O.schedule(H, W, G)), E;
  }, {}), cancel: (E) => {
    for (let D = 0; D < Ks.length; D++)
      c[Ks[D]].cancel(E);
  }, state: a, steps: c };
}
const { schedule: Ae, cancel: Xn, state: Ze, steps: Zu } = /* @__PURE__ */ Zg(typeof requestAnimationFrame < "u" ? requestAnimationFrame : Nt, !0);
let ua;
function F1() {
  ua = void 0;
}
const at = {
  now: () => (ua === void 0 && at.set(Ze.isProcessing || Qn.useManualTiming ? Ze.timestamp : performance.now()), ua),
  set: (e) => {
    ua = e, queueMicrotask(F1);
  }
}, Jg = (e) => (n) => typeof n == "string" && n.startsWith(e), qg = /* @__PURE__ */ Jg("--"), O1 = /* @__PURE__ */ Jg("var(--"), Md = (e) => O1(e) ? L1.test(e.split("/*")[0].trim()) : !1, L1 = /var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;
function Oh(e) {
  return typeof e != "string" ? !1 : e.split("/*")[0].includes("var(--");
}
const vo = {
  test: (e) => typeof e == "number",
  parse: parseFloat,
  transform: (e) => e
}, _i = {
  ...vo,
  transform: (e) => on(0, 1, e)
}, Ys = {
  ...vo,
  default: 1
}, hi = (e) => Math.round(e * 1e5) / 1e5, Rd = /-?(?:\d+(?:\.\d+)?|\.\d+)/gu;
function V1(e) {
  return e == null;
}
const B1 = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu, Dd = (e, n) => (o) => !!(typeof o == "string" && B1.test(o) && o.startsWith(e) || n && !V1(o) && Object.prototype.hasOwnProperty.call(o, n)), ev = (e, n, o) => (i) => {
  if (typeof i != "string")
    return i;
  const [a, d, c, p] = i.match(Rd);
  return {
    [e]: parseFloat(a),
    [n]: parseFloat(d),
    [o]: parseFloat(c),
    alpha: p !== void 0 ? parseFloat(p) : 1
  };
}, z1 = (e) => on(0, 255, e), Ju = {
  ...vo,
  transform: (e) => Math.round(z1(e))
}, Sr = {
  test: /* @__PURE__ */ Dd("rgb", "red"),
  parse: /* @__PURE__ */ ev("red", "green", "blue"),
  transform: ({ red: e, green: n, blue: o, alpha: i = 1 }) => "rgba(" + Ju.transform(e) + ", " + Ju.transform(n) + ", " + Ju.transform(o) + ", " + hi(_i.transform(i)) + ")"
};
function $1(e) {
  let n = "", o = "", i = "", a = "";
  return e.length > 5 ? (n = e.substring(1, 3), o = e.substring(3, 5), i = e.substring(5, 7), a = e.substring(7, 9)) : (n = e.substring(1, 2), o = e.substring(2, 3), i = e.substring(3, 4), a = e.substring(4, 5), n += n, o += o, i += i, a += a), {
    red: parseInt(n, 16),
    green: parseInt(o, 16),
    blue: parseInt(i, 16),
    alpha: a ? parseInt(a, 16) / 255 : 1
  };
}
const kc = {
  test: /* @__PURE__ */ Dd("#"),
  parse: $1,
  transform: Sr.transform
}, Ri = /* @__NO_SIDE_EFFECTS__ */ (e) => ({
  test: (n) => typeof n == "string" && n.endsWith(e) && n.split(" ").length === 1,
  parse: parseFloat,
  transform: (n) => `${n}${e}`
}), mn = /* @__PURE__ */ Ri("deg"), rn = /* @__PURE__ */ Ri("%"), ne = /* @__PURE__ */ Ri("px"), U1 = /* @__PURE__ */ Ri("vh"), H1 = /* @__PURE__ */ Ri("vw"), Lh = {
  ...rn,
  parse: (e) => rn.parse(e) / 100,
  transform: (e) => rn.transform(e * 100)
}, ao = {
  test: /* @__PURE__ */ Dd("hsl", "hue"),
  parse: /* @__PURE__ */ ev("hue", "saturation", "lightness"),
  transform: ({ hue: e, saturation: n, lightness: o, alpha: i = 1 }) => "hsla(" + Math.round(e) + ", " + rn.transform(hi(n)) + ", " + rn.transform(hi(o)) + ", " + hi(_i.transform(i)) + ")"
}, Be = {
  test: (e) => Sr.test(e) || kc.test(e) || ao.test(e),
  parse: (e) => Sr.test(e) ? Sr.parse(e) : ao.test(e) ? ao.parse(e) : kc.parse(e),
  transform: (e) => typeof e == "string" ? e : e.hasOwnProperty("red") ? Sr.transform(e) : ao.transform(e),
  getAnimatableNone: (e) => {
    const n = Be.parse(e);
    return n.alpha = 0, Be.transform(n);
  }
}, W1 = /(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;
function G1(e) {
  var n, o;
  return isNaN(e) && typeof e == "string" && (((n = e.match(Rd)) == null ? void 0 : n.length) || 0) + (((o = e.match(W1)) == null ? void 0 : o.length) || 0) > 0;
}
const tv = "number", nv = "color", K1 = "var", Y1 = "var(", Vh = "${}", Q1 = /var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;
function mo(e) {
  const n = e.toString(), o = [], i = {
    color: [],
    number: [],
    var: []
  }, a = [];
  let d = 0;
  const p = n.replace(Q1, (m) => (Be.test(m) ? (i.color.push(d), a.push(nv), o.push(Be.parse(m))) : m.startsWith(Y1) ? (i.var.push(d), a.push(K1), o.push(m)) : (i.number.push(d), a.push(tv), o.push(parseFloat(m))), ++d, Vh)).split(Vh);
  return { values: o, split: p, indexes: i, types: a };
}
function X1(e) {
  return mo(e).values;
}
function rv({ split: e, types: n }) {
  const o = e.length;
  return (i) => {
    let a = "";
    for (let d = 0; d < o; d++)
      if (a += e[d], i[d] !== void 0) {
        const c = n[d];
        c === tv ? a += hi(i[d]) : c === nv ? a += Be.transform(i[d]) : a += i[d];
      }
    return a;
  };
}
function Z1(e) {
  return rv(mo(e));
}
const J1 = (e) => typeof e == "number" ? 0 : Be.test(e) ? Be.getAnimatableNone(e) : e, q1 = (e, n) => typeof e == "number" ? n != null && n.trim().endsWith("/") ? e : 0 : J1(e);
function e_(e) {
  const n = mo(e);
  return rv(n)(n.values.map((i, a) => q1(i, n.split[a])));
}
const Ht = {
  test: G1,
  parse: X1,
  createTransformer: Z1,
  getAnimatableNone: e_
};
function qu(e, n, o) {
  return o < 0 && (o += 1), o > 1 && (o -= 1), o < 1 / 6 ? e + (n - e) * 6 * o : o < 1 / 2 ? n : o < 2 / 3 ? e + (n - e) * (2 / 3 - o) * 6 : e;
}
function t_({ hue: e, saturation: n, lightness: o, alpha: i }) {
  e /= 360, n /= 100, o /= 100;
  let a = 0, d = 0, c = 0;
  if (!n)
    a = d = c = o;
  else {
    const p = o < 0.5 ? o * (1 + n) : o + n - o * n, m = 2 * o - p;
    a = qu(m, p, e + 1 / 3), d = qu(m, p, e), c = qu(m, p, e - 1 / 3);
  }
  return {
    red: Math.round(a * 255),
    green: Math.round(d * 255),
    blue: Math.round(c * 255),
    alpha: i
  };
}
function ka(e, n) {
  return (o) => o > 0 ? n : e;
}
const ke = (e, n, o) => e + (n - e) * o, ec = (e, n, o) => {
  const i = e * e, a = o * (n * n - i) + i;
  return a < 0 ? 0 : Math.sqrt(a);
}, n_ = [kc, Sr, ao], r_ = (e) => n_.find((n) => n.test(e));
function Bh(e) {
  const n = r_(e);
  if (Pi(!!n, `'${e}' is not an animatable color. Use the equivalent color code instead.`, "color-not-animatable"), !n)
    return !1;
  let o = n.parse(e);
  return n === ao && (o = t_(o)), o;
}
const zh = (e, n) => {
  const o = Bh(e), i = Bh(n);
  if (!o || !i)
    return ka(e, n);
  const a = { ...o };
  return (d) => (a.red = ec(o.red, i.red, d), a.green = ec(o.green, i.green, d), a.blue = ec(o.blue, i.blue, d), a.alpha = ke(o.alpha, i.alpha, d), Sr.transform(a));
}, Ac = /* @__PURE__ */ new Set(["none", "hidden"]);
function o_(e, n) {
  return Ac.has(e) ? (o) => o <= 0 ? e : n : (o) => o >= 1 ? n : e;
}
function i_(e, n) {
  return (o) => ke(e, n, o);
}
function Nd(e) {
  return typeof e == "number" ? i_ : typeof e == "string" ? Md(e) ? ka : Be.test(e) ? zh : l_ : Array.isArray(e) ? ov : typeof e == "object" ? Be.test(e) ? zh : s_ : ka;
}
function ov(e, n) {
  const o = [...e], i = o.length, a = e.map((d, c) => Nd(d)(d, n[c]));
  return (d) => {
    for (let c = 0; c < i; c++)
      o[c] = a[c](d);
    return o;
  };
}
function s_(e, n) {
  const o = { ...e, ...n }, i = {};
  for (const a in o)
    e[a] !== void 0 && n[a] !== void 0 && (i[a] = Nd(e[a])(e[a], n[a]));
  return (a) => {
    for (const d in i)
      o[d] = i[d](a);
    return o;
  };
}
function a_(e, n) {
  const o = [], i = { color: 0, var: 0, number: 0 };
  for (let a = 0; a < n.values.length; a++) {
    const d = n.types[a], c = e.indexes[d][i[d]], p = e.values[c] ?? 0;
    o[a] = p, i[d]++;
  }
  return o;
}
const l_ = (e, n) => {
  const o = Ht.createTransformer(n), i = mo(e), a = mo(n);
  return i.indexes.var.length === a.indexes.var.length && i.indexes.color.length === a.indexes.color.length && i.indexes.number.length >= a.indexes.number.length ? Ac.has(e) && !a.values.length || Ac.has(n) && !i.values.length ? o_(e, n) : Ei(ov(a_(i, a), a.values), o) : (Pi(!0, `Complex values '${e}' and '${n}' too different to mix. Ensure all colors are of the same type, and that each contains the same quantity of number and color values. Falling back to instant transition.`, "complex-values-different"), ka(e, n));
};
function iv(e, n, o) {
  return typeof e == "number" && typeof n == "number" && typeof o == "number" ? ke(e, n, o) : Nd(e)(e, n);
}
const u_ = (e) => {
  const n = ({ timestamp: o }) => e(o);
  return {
    start: (o = !0) => Ae.update(n, o),
    stop: () => Xn(n),
    /**
     * If we're processing this frame we can use the
     * framelocked timestamp to keep things in sync.
     */
    now: () => Ze.isProcessing ? Ze.timestamp : at.now()
  };
}, sv = (e, n, o = 10) => {
  let i = "";
  const a = Math.max(Math.round(n / o), 2);
  for (let d = 0; d < a; d++)
    i += Math.round(e(d / (a - 1)) * 1e4) / 1e4 + ", ";
  return `linear(${i.substring(0, i.length - 2)})`;
}, Aa = 2e4;
function jd(e) {
  let n = 0;
  const o = 50;
  let i = e.next(n);
  for (; !i.done && n < Aa; )
    n += o, i = e.next(n);
  return n >= Aa ? 1 / 0 : n;
}
function c_(e, n = 100, o) {
  const i = o({ ...e, keyframes: [0, n] }), a = Math.min(jd(i), Aa);
  return {
    type: "keyframes",
    ease: (d) => i.next(a * d).value / n,
    duration: /* @__PURE__ */ Dt(a)
  };
}
const Ie = {
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
function Cc(e, n) {
  return e * Math.sqrt(1 - n * n);
}
const d_ = 12;
function f_(e, n, o) {
  let i = o;
  for (let a = 1; a < d_; a++)
    i = i - e(i) / n(i);
  return i;
}
const tc = 1e-3;
function p_({ duration: e = Ie.duration, bounce: n = Ie.bounce, velocity: o = Ie.velocity, mass: i = Ie.mass }) {
  let a, d;
  Pi(e <= /* @__PURE__ */ yt(Ie.maxDuration), "Spring duration must be 10 seconds or less", "spring-duration-limit");
  let c = 1 - n;
  c = on(Ie.minDamping, Ie.maxDamping, c), e = on(Ie.minDuration, Ie.maxDuration, /* @__PURE__ */ Dt(e)), c < 1 ? (a = (y) => {
    const g = y * c, l = g * e, f = g - o, S = Cc(y, c), x = Math.exp(-l);
    return tc - f / S * x;
  }, d = (y) => {
    const l = y * c * e, f = l * o + o, S = Math.pow(c, 2) * Math.pow(y, 2) * e, x = Math.exp(-l), k = Cc(Math.pow(y, 2), c);
    return (-a(y) + tc > 0 ? -1 : 1) * ((f - S) * x) / k;
  }) : (a = (y) => {
    const g = Math.exp(-y * e), l = (y - o) * e + 1;
    return -tc + g * l;
  }, d = (y) => {
    const g = Math.exp(-y * e), l = (o - y) * (e * e);
    return g * l;
  });
  const p = 5 / e, m = f_(a, d, p);
  if (e = /* @__PURE__ */ yt(e), isNaN(m))
    return {
      stiffness: Ie.stiffness,
      damping: Ie.damping,
      duration: e
    };
  {
    const y = Math.pow(m, 2) * i;
    return {
      stiffness: y,
      damping: c * 2 * Math.sqrt(i * y),
      duration: e
    };
  }
}
const m_ = ["duration", "bounce"], h_ = ["stiffness", "damping", "mass"];
function $h(e, n) {
  return n.some((o) => e[o] !== void 0);
}
function y_(e) {
  let n = {
    velocity: Ie.velocity,
    stiffness: Ie.stiffness,
    damping: Ie.damping,
    mass: Ie.mass,
    isResolvedFromDuration: !1,
    ...e
  };
  if (!$h(e, h_) && $h(e, m_))
    if (n.velocity = 0, e.visualDuration) {
      const o = e.visualDuration, i = 2 * Math.PI / (o * 1.2), a = i * i, d = 2 * on(0.05, 1, 1 - (e.bounce || 0)) * Math.sqrt(a);
      n = {
        ...n,
        mass: Ie.mass,
        stiffness: a,
        damping: d
      };
    } else {
      const o = p_({ ...e, velocity: 0 });
      n = {
        ...n,
        ...o,
        mass: Ie.mass
      }, n.isResolvedFromDuration = !0;
    }
  return n;
}
function Ca(e = Ie.visualDuration, n = Ie.bounce) {
  const o = typeof e != "object" ? {
    visualDuration: e,
    keyframes: [0, 1],
    bounce: n
  } : e;
  let { restSpeed: i, restDelta: a } = o;
  const d = o.keyframes[0], c = o.keyframes[o.keyframes.length - 1], p = { done: !1, value: d }, { stiffness: m, damping: y, mass: g, duration: l, velocity: f, isResolvedFromDuration: S } = y_({
    ...o,
    velocity: -/* @__PURE__ */ Dt(o.velocity || 0)
  }), x = f || 0, k = y / (2 * Math.sqrt(m * g)), A = c - d, T = /* @__PURE__ */ Dt(Math.sqrt(m / g)), b = Math.abs(A) < 5;
  i || (i = b ? Ie.restSpeed.granular : Ie.restSpeed.default), a || (a = b ? Ie.restDelta.granular : Ie.restDelta.default);
  let E, D, O, H, W, G;
  if (k < 1)
    O = Cc(T, k), H = (x + k * T * A) / O, E = (X) => {
      const se = Math.exp(-k * T * X);
      return c - se * (H * Math.sin(O * X) + A * Math.cos(O * X));
    }, W = k * T * H + A * O, G = k * T * A - H * O, D = (X) => Math.exp(-k * T * X) * (W * Math.sin(O * X) + G * Math.cos(O * X));
  else if (k === 1) {
    E = (se) => c - Math.exp(-T * se) * (A + (x + T * A) * se);
    const X = x + T * A;
    D = (se) => Math.exp(-T * se) * (T * X * se - x);
  } else {
    const X = T * Math.sqrt(k * k - 1);
    E = (ce) => {
      const Se = Math.exp(-k * T * ce), re = Math.min(X * ce, 300);
      return c - Se * ((x + k * T * A) * Math.sinh(re) + X * A * Math.cosh(re)) / X;
    };
    const se = (x + k * T * A) / X, Z = k * T * se - A * X, de = k * T * A - se * X;
    D = (ce) => {
      const Se = Math.exp(-k * T * ce), re = Math.min(X * ce, 300);
      return Se * (Z * Math.sinh(re) + de * Math.cosh(re));
    };
  }
  const K = {
    calculatedDuration: S && l || null,
    velocity: (X) => /* @__PURE__ */ yt(D(X)),
    next: (X) => {
      if (!S && k < 1) {
        const Z = Math.exp(-k * T * X), de = Math.sin(O * X), ce = Math.cos(O * X), Se = c - Z * (H * de + A * ce), re = /* @__PURE__ */ yt(Z * (W * de + G * ce));
        return p.done = Math.abs(re) <= i && Math.abs(c - Se) <= a, p.value = p.done ? c : Se, p;
      }
      const se = E(X);
      if (S)
        p.done = X >= l;
      else {
        const Z = /* @__PURE__ */ yt(D(X));
        p.done = Math.abs(Z) <= i && Math.abs(c - se) <= a;
      }
      return p.value = p.done ? c : se, p;
    },
    toString: () => {
      const X = Math.min(jd(K), Aa), se = sv((Z) => K.next(X * Z).value, X, 30);
      return X + "ms " + se;
    },
    toTransition: () => {
    }
  };
  return K;
}
Ca.applyToOptions = (e) => {
  const n = c_(e, 100, Ca);
  return e.ease = n.ease, e.duration = /* @__PURE__ */ yt(n.duration), e.type = "keyframes", e;
};
const g_ = 5;
function av(e, n, o) {
  const i = Math.max(n - g_, 0);
  return /* @__PURE__ */ Bg(o - e(i), n - i);
}
function bc({ keyframes: e, velocity: n = 0, power: o = 0.8, timeConstant: i = 325, bounceDamping: a = 10, bounceStiffness: d = 500, modifyTarget: c, min: p, max: m, restDelta: y = 0.5, restSpeed: g }) {
  const l = e[0], f = {
    done: !1,
    value: l
  }, S = (G) => p !== void 0 && G < p || m !== void 0 && G > m, x = (G) => p === void 0 ? m : m === void 0 || Math.abs(p - G) < Math.abs(m - G) ? p : m;
  let k = o * n;
  const A = l + k, T = c === void 0 ? A : c(A);
  T !== A && (k = T - l);
  const b = (G) => -k * Math.exp(-G / i), E = (G) => T + b(G), D = (G) => {
    const K = b(G), X = E(G);
    f.done = Math.abs(K) <= y, f.value = f.done ? T : X;
  };
  let O, H;
  const W = (G) => {
    S(f.value) && (O = G, H = Ca({
      keyframes: [f.value, x(f.value)],
      velocity: av(E, G, f.value),
      // TODO: This should be passing * 1000
      damping: a,
      stiffness: d,
      restDelta: y,
      restSpeed: g
    }));
  };
  return W(0), {
    calculatedDuration: null,
    next: (G) => {
      let K = !1;
      return !H && O === void 0 && (K = !0, D(G), W(G)), O !== void 0 && G >= O ? H.next(G - O) : (!K && D(G), f);
    }
  };
}
function v_(e, n, o) {
  const i = [], a = o || Qn.mix || iv, d = e.length - 1;
  for (let c = 0; c < d; c++) {
    let p = a(e[c], e[c + 1]);
    if (n) {
      const m = Array.isArray(n) ? n[c] || Nt : n;
      p = Ei(m, p);
    }
    i.push(p);
  }
  return i;
}
function S_(e, n, { clamp: o = !0, ease: i, mixer: a } = {}) {
  const d = e.length;
  if (br(d === n.length, "Both input and output ranges must be the same length", "range-length"), d === 1)
    return () => n[0];
  if (d === 2 && n[0] === n[1])
    return () => n[1];
  const c = e[0] === e[1];
  e[0] > e[d - 1] && (e = [...e].reverse(), n = [...n].reverse());
  const p = v_(n, i, a), m = p.length, y = (g) => {
    if (c && g < e[0])
      return n[0];
    let l = 0;
    if (m > 1)
      for (; l < e.length - 2 && !(g < e[l + 1]); l++)
        ;
    const f = /* @__PURE__ */ xi(e[l], e[l + 1], g);
    return p[l](f);
  };
  return o ? (g) => y(on(e[0], e[d - 1], g)) : y;
}
function w_(e, n) {
  const o = e[e.length - 1];
  for (let i = 1; i <= n; i++) {
    const a = /* @__PURE__ */ xi(0, n, i);
    e.push(ke(o, 1, a));
  }
}
function x_(e) {
  const n = [0];
  return w_(n, e.length - 1), n;
}
function __(e, n) {
  return e.map((o) => o * n);
}
function T_(e, n) {
  return e.map(() => n || Qg).splice(0, e.length - 1);
}
function yi({ duration: e = 300, keyframes: n, times: o, ease: i = "easeInOut" }) {
  const a = /* @__PURE__ */ D1(i) ? i.map(Fh) : Fh(i), d = {
    done: !1,
    value: n[0]
  }, c = __(
    // Only use the provided offsets if they're the correct length
    // TODO Maybe we should warn here if there's a length mismatch
    o && o.length === n.length ? o : x_(n),
    e
  ), p = S_(c, n, {
    ease: Array.isArray(a) ? a : T_(n, a)
  });
  return {
    calculatedDuration: e,
    next: (m) => (d.value = p(m), d.done = m >= e, d)
  };
}
const k_ = (e) => e !== null;
function $a(e, { repeat: n, repeatType: o = "loop" }, i, a = 1) {
  const d = e.filter(k_), p = a < 0 || n && o !== "loop" && n % 2 === 1 ? 0 : d.length - 1;
  return !p || i === void 0 ? d[p] : i;
}
const A_ = {
  decay: bc,
  inertia: bc,
  tween: yi,
  keyframes: yi,
  spring: Ca
};
function lv(e) {
  typeof e.type == "string" && (e.type = A_[e.type]);
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
const C_ = (e) => e / 100;
class ba extends Id {
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
    lv(n);
    const { type: o = yi, repeat: i = 0, repeatDelay: a = 0, repeatType: d, velocity: c = 0 } = n;
    let { keyframes: p } = n;
    const m = o || yi;
    m !== yi && typeof p[0] != "number" && (this.mixKeyframes = Ei(C_, iv(p[0], p[1])), p = [0, 100]);
    const y = m({ ...n, keyframes: p });
    d === "mirror" && (this.mirroredGenerator = m({
      ...n,
      keyframes: [...p].reverse(),
      velocity: -c
    })), y.calculatedDuration === null && (y.calculatedDuration = jd(y));
    const { calculatedDuration: g } = y;
    this.calculatedDuration = g, this.resolvedDuration = g + a, this.totalDuration = this.resolvedDuration * (i + 1) - a, this.generator = y;
  }
  updateTime(n) {
    const o = Math.round(n - this.startTime) * this.playbackSpeed;
    this.holdTime !== null ? this.currentTime = this.holdTime : this.currentTime = o;
  }
  tick(n, o = !1) {
    const { generator: i, totalDuration: a, mixKeyframes: d, mirroredGenerator: c, resolvedDuration: p, calculatedDuration: m } = this;
    if (this.startTime === null)
      return i.next(0);
    const { delay: y = 0, keyframes: g, repeat: l, repeatType: f, repeatDelay: S, type: x, onUpdate: k, finalKeyframe: A } = this.options;
    this.speed > 0 ? this.startTime = Math.min(this.startTime, n) : this.speed < 0 && (this.startTime = Math.min(n - a / this.speed, this.startTime)), o ? this.currentTime = n : this.updateTime(n);
    const T = this.currentTime - y * (this.playbackSpeed >= 0 ? 1 : -1), b = this.playbackSpeed >= 0 ? T < 0 : T > a;
    this.currentTime = Math.max(T, 0), this.state === "finished" && this.holdTime === null && (this.currentTime = a);
    let E = this.currentTime, D = i;
    if (l) {
      const G = Math.min(this.currentTime, a) / p;
      let K = Math.floor(G), X = G % 1;
      !X && G >= 1 && (X = 1), X === 1 && K--, K = Math.min(K, l + 1), !!(K % 2) && (f === "reverse" ? (X = 1 - X, S && (X -= S / p)) : f === "mirror" && (D = c)), E = on(0, 1, X) * p;
    }
    let O;
    b ? (this.delayState.value = g[0], O = this.delayState) : O = D.next(E), d && !b && (O.value = d(O.value));
    let { done: H } = O;
    !b && m !== null && (H = this.playbackSpeed >= 0 ? this.currentTime >= a : this.currentTime <= 0);
    const W = this.holdTime === null && (this.state === "finished" || this.state === "running" && H);
    return W && x !== bc && (O.value = $a(g, this.options, A, this.speed)), k && k(O.value), W && this.finish(), O;
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
    n = /* @__PURE__ */ yt(n), this.currentTime = n, this.startTime === null || this.holdTime !== null || this.playbackSpeed === 0 ? this.holdTime = n : this.driver && (this.startTime = this.driver.now() - n / this.playbackSpeed), this.driver ? this.driver.start(!1) : (this.startTime = 0, this.state = "paused", this.holdTime = n, this.tick(n));
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
    return av((i) => this.generator.next(i).value, n, o);
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
    const { driver: n = u_, startTime: o } = this.options;
    this.driver || (this.driver = n((c) => this.tick(c))), (d = (a = this.options).onPlay) == null || d.call(a);
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
function b_(e) {
  for (let n = 1; n < e.length; n++)
    e[n] ?? (e[n] = e[n - 1]);
}
const wr = (e) => e * 180 / Math.PI, Pc = (e) => {
  const n = wr(Math.atan2(e[1], e[0]));
  return Ec(n);
}, P_ = {
  x: 4,
  y: 5,
  translateX: 4,
  translateY: 5,
  scaleX: 0,
  scaleY: 3,
  scale: (e) => (Math.abs(e[0]) + Math.abs(e[3])) / 2,
  rotate: Pc,
  rotateZ: Pc,
  skewX: (e) => wr(Math.atan(e[1])),
  skewY: (e) => wr(Math.atan(e[2])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[2])) / 2
}, Ec = (e) => (e = e % 360, e < 0 && (e += 360), e), Uh = Pc, Hh = (e) => Math.sqrt(e[0] * e[0] + e[1] * e[1]), Wh = (e) => Math.sqrt(e[4] * e[4] + e[5] * e[5]), E_ = {
  x: 12,
  y: 13,
  z: 14,
  translateX: 12,
  translateY: 13,
  translateZ: 14,
  scaleX: Hh,
  scaleY: Wh,
  scale: (e) => (Hh(e) + Wh(e)) / 2,
  rotateX: (e) => Ec(wr(Math.atan2(e[6], e[5]))),
  rotateY: (e) => Ec(wr(Math.atan2(-e[2], e[0]))),
  rotateZ: Uh,
  rotate: Uh,
  skewX: (e) => wr(Math.atan(e[4])),
  skewY: (e) => wr(Math.atan(e[1])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[4])) / 2
};
function Mc(e) {
  return e.includes("scale") ? 1 : 0;
}
function Rc(e, n) {
  if (!e || e === "none")
    return Mc(n);
  const o = e.match(/^matrix3d\(([-\d.e\s,]+)\)$/u);
  let i, a;
  if (o)
    i = E_, a = o;
  else {
    const p = e.match(/^matrix\(([-\d.e\s,]+)\)$/u);
    i = P_, a = p;
  }
  if (!a)
    return Mc(n);
  const d = i[n], c = a[1].split(",").map(R_);
  return typeof d == "function" ? d(c) : c[d];
}
const M_ = (e, n) => {
  const { transform: o = "none" } = getComputedStyle(e);
  return Rc(o, n);
};
function R_(e) {
  return parseFloat(e.trim());
}
const So = [
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
], wo = /* @__PURE__ */ new Set([...So, "pathRotation"]), Gh = (e) => e === vo || e === ne, D_ = /* @__PURE__ */ new Set(["x", "y", "z"]), N_ = So.filter((e) => !D_.has(e));
function j_(e) {
  const n = [];
  return N_.forEach((o) => {
    const i = e.getValue(o);
    i !== void 0 && (n.push([o, i.get()]), i.set(o.startsWith("scale") ? 1 : 0));
  }), n;
}
const Gn = {
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
  x: (e, { transform: n }) => Rc(n, "x"),
  y: (e, { transform: n }) => Rc(n, "y")
};
Gn.translateX = Gn.x;
Gn.translateY = Gn.y;
const _r = /* @__PURE__ */ new Set();
let Dc = !1, Nc = !1, jc = !1;
function uv() {
  if (Nc) {
    const e = Array.from(_r).filter((i) => i.needsMeasurement), n = new Set(e.map((i) => i.element)), o = /* @__PURE__ */ new Map();
    n.forEach((i) => {
      const a = j_(i);
      a.length && (o.set(i, a), i.render());
    }), e.forEach((i) => i.measureInitialState()), n.forEach((i) => {
      i.render();
      const a = o.get(i);
      a && a.forEach(([d, c]) => {
        var p;
        (p = i.getValue(d)) == null || p.set(c);
      });
    }), e.forEach((i) => i.measureEndState()), e.forEach((i) => {
      i.suspendedScrollY !== void 0 && window.scrollTo(0, i.suspendedScrollY);
    });
  }
  Nc = !1, Dc = !1, _r.forEach((e) => e.complete(jc)), _r.clear();
}
function cv() {
  _r.forEach((e) => {
    e.readKeyframes(), e.needsMeasurement && (Nc = !0);
  });
}
function I_() {
  jc = !0, cv(), uv(), jc = !1;
}
class Fd {
  constructor(n, o, i, a, d, c = !1) {
    this.state = "pending", this.isAsync = !1, this.needsMeasurement = !1, this.unresolvedKeyframes = [...n], this.onComplete = o, this.name = i, this.motionValue = a, this.element = d, this.isAsync = c;
  }
  scheduleResolve() {
    this.state = "scheduled", this.isAsync ? (_r.add(this), Dc || (Dc = !0, Ae.read(cv), Ae.resolveKeyframes(uv))) : (this.readKeyframes(), this.complete());
  }
  readKeyframes() {
    const { unresolvedKeyframes: n, name: o, element: i, motionValue: a } = this;
    if (n[0] === null) {
      const d = a == null ? void 0 : a.get(), c = n[n.length - 1];
      if (d !== void 0)
        n[0] = d;
      else if (i && o) {
        const p = i.readValue(o, c);
        p != null && (n[0] = p);
      }
      n[0] === void 0 && (n[0] = c), a && d === void 0 && a.set(n[0]);
    }
    b_(n);
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
    this.state = "complete", this.onComplete(this.unresolvedKeyframes, this.finalKeyframe, n), _r.delete(this);
  }
  cancel() {
    this.state === "scheduled" && (_r.delete(this), this.state = "pending");
  }
  resume() {
    this.state === "pending" && this.scheduleResolve();
  }
}
const F_ = (e) => e.startsWith("--");
function dv(e, n, o) {
  F_(n) ? e.style.setProperty(n, o) : e.style[n] = o;
}
const O_ = {};
function fv(e, n) {
  const o = /* @__PURE__ */ Vg(e);
  return () => O_[n] ?? o();
}
const L_ = /* @__PURE__ */ fv(() => window.ScrollTimeline !== void 0, "scrollTimeline"), pv = /* @__PURE__ */ fv(() => {
  try {
    document.createElement("div").animate({ opacity: 0 }, { easing: "linear(0, 1)" });
  } catch {
    return !1;
  }
  return !0;
}, "linearEasing"), pi = ([e, n, o, i]) => `cubic-bezier(${e}, ${n}, ${o}, ${i})`, Kh = {
  linear: "linear",
  ease: "ease",
  easeIn: "ease-in",
  easeOut: "ease-out",
  easeInOut: "ease-in-out",
  circIn: /* @__PURE__ */ pi([0, 0.65, 0.55, 1]),
  circOut: /* @__PURE__ */ pi([0.55, 0, 1, 0.45]),
  backIn: /* @__PURE__ */ pi([0.31, 0.01, 0.66, -0.59]),
  backOut: /* @__PURE__ */ pi([0.33, 1.53, 0.69, 0.99])
};
function mv(e, n) {
  if (e)
    return typeof e == "function" ? pv() ? sv(e, n) : "ease-out" : /* @__PURE__ */ Xg(e) ? pi(e) : Array.isArray(e) ? e.map((o) => mv(o, n) || Kh.easeOut) : Kh[e];
}
function V_(e, n, o, { delay: i = 0, duration: a = 300, repeat: d = 0, repeatType: c = "loop", ease: p = "easeOut", times: m } = {}, y = void 0) {
  const g = {
    [n]: o
  };
  m && (g.offset = m);
  const l = mv(p, a);
  Array.isArray(l) && (g.easing = l);
  const f = {
    delay: i,
    duration: a,
    easing: Array.isArray(l) ? "linear" : l,
    fill: "both",
    iterations: d + 1,
    direction: c === "reverse" ? "alternate" : "normal"
  };
  return y && (f.pseudoElement = y), e.animate(g, f);
}
function hv(e) {
  return typeof e == "function" && "applyToOptions" in e;
}
function B_({ type: e, ...n }) {
  return hv(e) && pv() ? e.applyToOptions(n) : (n.duration ?? (n.duration = 300), n.ease ?? (n.ease = "easeOut"), n);
}
class yv extends Id {
  constructor(n) {
    if (super(), this.finishedTime = null, this.isStopped = !1, this.manualStartTime = null, !n)
      return;
    const { element: o, name: i, keyframes: a, pseudoElement: d, allowFlatten: c = !1, finalKeyframe: p, onComplete: m } = n;
    this.isPseudoElement = !!d, this.allowFlatten = c, this.options = n, br(typeof n.type != "string", `Mini animate() doesn't support "type" as a string.`, "mini-spring");
    const y = B_(n);
    this.animation = V_(o, i, a, y, d), y.autoplay === !1 && this.animation.pause(), this.animation.onfinish = () => {
      if (this.finishedTime = this.time, !d) {
        const g = $a(a, this.options, p, this.speed);
        this.updateMotionValue && this.updateMotionValue(g), dv(o, i, g), this.animation.cancel();
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
    this.manualStartTime = null, this.finishedTime = null, this.animation.currentTime = /* @__PURE__ */ yt(n), o && this.animation.pause();
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
    return this.allowFlatten && ((d = this.animation.effect) == null || d.updateTiming({ easing: "linear" })), this.animation.onfinish = null, n && L_() ? (this.animation.timeline = n, o && (this.animation.rangeStart = o), i && (this.animation.rangeEnd = i), Nt) : a(this);
  }
}
const gv = {
  anticipate: Gg,
  backInOut: Wg,
  circInOut: Yg
};
function z_(e) {
  return e in gv;
}
function $_(e) {
  typeof e.ease == "string" && z_(e.ease) && (e.ease = gv[e.ease]);
}
const nc = 10;
class U_ extends yv {
  constructor(n) {
    $_(n), lv(n), super(n), n.startTime !== void 0 && n.autoplay !== !1 && (this.startTime = n.startTime), this.options = n;
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
    const { motionValue: o, onUpdate: i, onComplete: a, element: d, ...c } = this.options;
    if (!o)
      return;
    if (n !== void 0) {
      o.set(n);
      return;
    }
    const p = new ba({
      ...c,
      autoplay: !1
    }), m = Math.max(nc, at.now() - this.startTime), y = on(0, nc, m - nc), g = p.sample(m).value, { name: l } = this.options;
    d && l && dv(d, l, g), o.setWithVelocity(p.sample(Math.max(0, m - y)).value, g, y), p.stop();
  }
}
const Yh = (e, n) => n === "zIndex" ? !1 : !!(typeof e == "number" || Array.isArray(e) || typeof e == "string" && // It's animatable if we have a string
(Ht.test(e) || e === "0") && // And it contains numbers and/or colors
!e.startsWith("url("));
function H_(e) {
  const n = e[0];
  if (e.length === 1)
    return !0;
  for (let o = 0; o < e.length; o++)
    if (e[o] !== n)
      return !0;
}
function W_(e, n, o, i) {
  const a = e[0];
  if (a === null)
    return !1;
  if (n === "display" || n === "visibility")
    return !0;
  const d = e[e.length - 1], c = Yh(a, n), p = Yh(d, n);
  return Pi(c === p, `You are trying to animate ${n} from "${a}" to "${d}". "${c ? d : a}" is not an animatable value.`, "value-not-animatable"), !c || !p ? !1 : H_(e) || (o === "spring" || hv(o)) && i;
}
function Ic(e) {
  e.duration = 0, e.type = "keyframes";
}
const vv = /* @__PURE__ */ new Set([
  "opacity",
  "clipPath",
  "filter",
  "transform"
  // TODO: Can be accelerated but currently disabled until https://issues.chromium.org/issues/41491098 is resolved
  // or until we implement support for linear() easing.
  // "background-color"
]), G_ = /^(?:oklch|oklab|lab|lch|color|color-mix|light-dark)\(/;
function K_(e) {
  for (let n = 0; n < e.length; n++)
    if (typeof e[n] == "string" && G_.test(e[n]))
      return !0;
  return !1;
}
const Y_ = /* @__PURE__ */ new Set([
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
]), Q_ = /* @__PURE__ */ Vg(() => Object.hasOwnProperty.call(Element.prototype, "animate"));
function X_(e) {
  var l;
  const { motionValue: n, name: o, repeatDelay: i, repeatType: a, damping: d, type: c, keyframes: p } = e;
  if (!(((l = n == null ? void 0 : n.owner) == null ? void 0 : l.current) instanceof HTMLElement))
    return !1;
  const { onUpdate: y, transformTemplate: g } = n.owner.getProps();
  return Q_() && o && /**
   * Force WAAPI for color properties with browser-only color formats
   * (oklch, oklab, lab, lch, etc.) that the JS animation path can't parse.
   */
  (vv.has(o) || Y_.has(o) && K_(p)) && (o !== "transform" || !g) && /**
   * If we're outputting values to onUpdate then we can't use WAAPI as there's
   * no way to read the value from WAAPI every frame.
   */
  !y && !i && a !== "mirror" && d !== 0 && c !== "inertia";
}
const Z_ = 40;
class J_ extends Id {
  constructor({ autoplay: n = !0, delay: o = 0, type: i = "keyframes", repeat: a = 0, repeatDelay: d = 0, repeatType: c = "loop", keyframes: p, name: m, motionValue: y, element: g, ...l }) {
    var x;
    super(), this.stop = () => {
      var k, A;
      this._animation && (this._animation.stop(), (k = this.stopTimeline) == null || k.call(this)), (A = this.keyframeResolver) == null || A.cancel();
    }, this.createdAt = at.now();
    const f = {
      autoplay: n,
      delay: o,
      type: i,
      repeat: a,
      repeatDelay: d,
      repeatType: c,
      name: m,
      motionValue: y,
      element: g,
      ...l
    }, S = (g == null ? void 0 : g.KeyframeResolver) || Fd;
    this.keyframeResolver = new S(p, (k, A, T) => this.onKeyframesResolved(k, A, f, !T), m, y, g), (x = this.keyframeResolver) == null || x.scheduleResolve();
  }
  onKeyframesResolved(n, o, i, a) {
    var T, b;
    this.keyframeResolver = void 0;
    const { name: d, type: c, velocity: p, delay: m, isHandoff: y, onUpdate: g } = i;
    this.resolvedAt = at.now();
    let l = !0;
    W_(n, d, c, p) || (l = !1, (Qn.instantAnimations || !m) && (g == null || g($a(n, i, o))), n[0] = n[n.length - 1], Ic(i), i.repeat = 0);
    const S = {
      startTime: a ? this.resolvedAt ? this.resolvedAt - this.createdAt > Z_ ? this.resolvedAt : this.createdAt : this.createdAt : void 0,
      finalKeyframe: o,
      ...i,
      keyframes: n
    }, x = l && !y && X_(S), k = (b = (T = S.motionValue) == null ? void 0 : T.owner) == null ? void 0 : b.current;
    let A;
    if (x)
      try {
        A = new U_({
          ...S,
          element: k
        });
      } catch {
        A = new ba(S);
      }
    else
      A = new ba(S);
    A.finished.then(() => {
      this.notifyFinished();
    }).catch(Nt), this.pendingTimeline && (this.stopTimeline = A.attachTimeline(this.pendingTimeline), this.pendingTimeline = void 0), this._animation = A;
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
    return this._animation || ((n = this.keyframeResolver) == null || n.resume(), I_()), this._animation;
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
function Sv(e, n, o, i = 0, a = 1) {
  const d = Array.from(e).sort((y, g) => y.sortNodePosition(g)).indexOf(n), c = e.size, p = (c - 1) * i;
  return typeof o == "function" ? o(d, c) : a === 1 ? d * i : p - d * i;
}
const Qh = 30, q_ = (e) => !isNaN(parseFloat(e));
class eT {
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
        for (const c of this.dependents)
          c.dirty();
    }, this.hasAnimated = !1, this.setCurrent(n), this.owner = o.owner;
  }
  setCurrent(n) {
    this.current = n, this.updatedAt = at.now(), this.canTrackVelocity === null && n !== void 0 && (this.canTrackVelocity = q_(this.current));
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
      i(), Ae.read(() => {
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
    if (!this.canTrackVelocity || this.prevFrameValue === void 0 || n - this.updatedAt > Qh)
      return 0;
    const o = Math.min(this.updatedAt - this.prevUpdatedAt, Qh);
    return /* @__PURE__ */ Bg(parseFloat(this.current) - parseFloat(this.prevFrameValue), o);
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
function ho(e, n) {
  return new eT(e, n);
}
function wv(e, n) {
  if (e != null && e.inherit && n) {
    const { inherit: o, ...i } = e;
    return { ...n, ...i };
  }
  return e;
}
function Od(e, n) {
  const o = (e == null ? void 0 : e[n]) ?? (e == null ? void 0 : e.default) ?? e;
  return o !== e ? wv(o, e) : o;
}
const tT = {
  type: "spring",
  stiffness: 500,
  damping: 25,
  restSpeed: 10
}, nT = (e) => ({
  type: "spring",
  stiffness: 550,
  damping: e === 0 ? 2 * Math.sqrt(550) : 30,
  restSpeed: 10
}), rT = {
  type: "keyframes",
  duration: 0.8
}, oT = {
  type: "keyframes",
  ease: [0.25, 0.1, 0.35, 1],
  duration: 0.3
}, iT = (e, { keyframes: n }) => n.length > 2 ? rT : wo.has(e) ? e.startsWith("scale") ? nT(n[1]) : tT : oT, sT = /* @__PURE__ */ new Set([
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
function aT(e) {
  for (const n in e)
    if (!sT.has(n))
      return !0;
  return !1;
}
const Ld = (e, n, o, i = {}, a, d) => (c) => {
  const p = Od(i, e) || {}, m = p.delay || i.delay || 0;
  let { elapsed: y = 0 } = i;
  y = y - /* @__PURE__ */ yt(m);
  const g = {
    keyframes: Array.isArray(o) ? o : [null, o],
    ease: "easeOut",
    velocity: n.getVelocity(),
    ...p,
    delay: -y,
    onUpdate: (f) => {
      n.set(f), p.onUpdate && p.onUpdate(f);
    },
    onComplete: () => {
      c(), p.onComplete && p.onComplete();
    },
    name: e,
    motionValue: n,
    element: d ? void 0 : a
  };
  aT(p) || Object.assign(g, iT(e, g)), g.duration && (g.duration = /* @__PURE__ */ yt(g.duration)), g.repeatDelay && (g.repeatDelay = /* @__PURE__ */ yt(g.repeatDelay)), g.from !== void 0 && (g.keyframes[0] = g.from);
  let l = !1;
  if ((g.type === !1 || g.duration === 0 && !g.repeatDelay) && (Ic(g), g.delay === 0 && (l = !0)), (Qn.instantAnimations || Qn.skipAnimations || a != null && a.shouldSkipAnimations || p.skipAnimations) && (l = !0, Ic(g), g.delay = 0), g.allowFlatten = !p.type && !p.ease, l && !d && n.get() !== void 0) {
    const f = $a(g.keyframes, p);
    if (f !== void 0) {
      Ae.update(() => {
        g.onUpdate(f), g.onComplete();
      });
      return;
    }
  }
  return p.isSync ? new ba(g) : new J_(g);
}, lT = (
  // eslint-disable-next-line redos-detector/no-unsafe-regex -- false positive, as it can match a lot of words
  /^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u
);
function uT(e) {
  const n = lT.exec(e);
  if (!n)
    return [,];
  const [, o, i, a] = n;
  return [`--${o ?? i}`, a];
}
const cT = 4;
function xv(e, n, o = 1) {
  br(o <= cT, `Max CSS variable fallback depth detected in property "${e}". This may indicate a circular fallback dependency.`, "max-css-var-depth");
  const [i, a] = uT(e);
  if (!i)
    return;
  const d = window.getComputedStyle(n).getPropertyValue(i);
  if (d) {
    const c = d.trim();
    return Fg(c) ? parseFloat(c) : c;
  }
  return Md(a) ? xv(a, n, o + 1) : a;
}
function Xh(e) {
  const n = [{}, {}];
  return e == null || e.values.forEach((o, i) => {
    n[0][i] = o.get(), n[1][i] = o.getVelocity();
  }), n;
}
function Vd(e, n, o, i) {
  if (typeof n == "function") {
    const [a, d] = Xh(i);
    n = n(o !== void 0 ? o : e.custom, a, d);
  }
  if (typeof n == "string" && (n = e.variants && e.variants[n]), typeof n == "function") {
    const [a, d] = Xh(i);
    n = n(o !== void 0 ? o : e.custom, a, d);
  }
  return n;
}
function Tr(e, n, o) {
  const i = e.getProps();
  return Vd(i, n, o !== void 0 ? o : i.custom, e);
}
const _v = /* @__PURE__ */ new Set([
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
  ...So
]), Fc = (e) => Array.isArray(e);
function dT(e, n, o) {
  e.hasValue(n) ? e.getValue(n).set(o) : e.addValue(n, ho(o));
}
function fT(e) {
  return Fc(e) ? e[e.length - 1] || 0 : e;
}
function pT(e, n) {
  const o = Tr(e, n);
  let { transitionEnd: i = {}, transition: a = {}, ...d } = o || {};
  d = { ...d, ...i };
  for (const c in d) {
    const p = fT(d[c]);
    dT(e, c, p);
  }
}
const Je = (e) => !!(e && e.getVelocity);
function mT(e) {
  return !!(Je(e) && e.add);
}
function Oc(e, n) {
  const o = e.getValue("willChange");
  if (mT(o))
    return o.add(n);
  if (!o && Qn.WillChange) {
    const i = new Qn.WillChange("auto");
    e.addValue("willChange", i), i.add(n);
  }
}
function Bd(e) {
  return e.replace(/([A-Z])/g, (n) => `-${n.toLowerCase()}`);
}
const hT = "framerAppearId", Tv = "data-" + Bd(hT);
function kv(e) {
  return e.props[Tv];
}
function yT({ protectedKeys: e, needsAnimating: n }, o) {
  const i = e.hasOwnProperty(o) && n[o] !== !0;
  return n[o] = !1, i;
}
function Av(e, n, { delay: o = 0, transitionOverride: i, type: a } = {}) {
  let { transition: d, transitionEnd: c, ...p } = n;
  const m = e.getDefaultTransition();
  d = d ? wv(d, m) : m;
  const y = d == null ? void 0 : d.reduceMotion, g = d == null ? void 0 : d.skipAnimations;
  i && (d = i);
  const l = [], f = a && e.animationState && e.animationState.getState()[a], S = d == null ? void 0 : d.path;
  S && S.animateVisualElement(e, p, d, o, l);
  for (const x in p) {
    const k = e.getValue(x, e.latestValues[x] ?? null), A = p[x];
    if (A === void 0 || f && yT(f, x))
      continue;
    const T = {
      delay: o,
      ...Od(d || {}, x)
    };
    g && (T.skipAnimations = !0);
    const b = k.get();
    if (b !== void 0 && !k.isAnimating() && !Array.isArray(A) && A === b && !T.velocity) {
      Ae.update(() => k.set(A));
      continue;
    }
    let E = !1;
    if (window.MotionHandoffAnimation) {
      const H = kv(e);
      if (H) {
        const W = window.MotionHandoffAnimation(H, x, Ae);
        W !== null && (T.startTime = W, E = !0);
      }
    }
    Oc(e, x);
    const D = y ?? e.shouldReduceMotion;
    k.start(Ld(x, k, A, D && _v.has(x) ? { type: !1 } : T, e, E));
    const O = k.animation;
    O && l.push(O);
  }
  if (c) {
    const x = () => Ae.update(() => {
      c && pT(e, c);
    });
    l.length ? Promise.all(l).then(x) : x();
  }
  return l;
}
function Lc(e, n, o = {}) {
  var m;
  const i = Tr(e, n, o.type === "exit" ? (m = e.presenceContext) == null ? void 0 : m.custom : void 0);
  let { transition: a = e.getDefaultTransition() || {} } = i || {};
  o.transitionOverride && (a = o.transitionOverride);
  const d = i ? () => Promise.all(Av(e, i, o)) : () => Promise.resolve(), c = e.variantChildren && e.variantChildren.size ? (y = 0) => {
    const { delayChildren: g = 0, staggerChildren: l, staggerDirection: f } = a;
    return gT(e, n, y, g, l, f, o);
  } : () => Promise.resolve(), { when: p } = a;
  if (p) {
    const [y, g] = p === "beforeChildren" ? [d, c] : [c, d];
    return y().then(() => g());
  } else
    return Promise.all([d(), c(o.delay)]);
}
function gT(e, n, o = 0, i = 0, a = 0, d = 1, c) {
  const p = [];
  for (const m of e.variantChildren)
    m.notify("AnimationStart", n), p.push(Lc(m, n, {
      ...c,
      delay: o + (typeof i == "function" ? 0 : i) + Sv(e.variantChildren, m, i, a, d)
    }).then(() => m.notify("AnimationComplete", n)));
  return Promise.all(p);
}
function vT(e, n, o = {}) {
  e.notify("AnimationStart", n);
  let i;
  if (Array.isArray(n)) {
    const a = n.map((d) => Lc(e, d, o));
    i = Promise.all(a);
  } else if (typeof n == "string")
    i = Lc(e, n, o);
  else {
    const a = typeof n == "function" ? Tr(e, n, o.custom) : n;
    i = Promise.all(Av(e, a, o));
  }
  return i.then(() => {
    e.notify("AnimationComplete", n);
  });
}
const ST = {
  test: (e) => e === "auto",
  parse: (e) => e
}, Cv = (e) => (n) => n.test(e), bv = [vo, ne, rn, mn, H1, U1, ST], Zh = (e) => bv.find(Cv(e));
function wT(e) {
  return typeof e == "number" ? e === 0 : e !== null ? e === "none" || e === "0" || Lg(e) : !0;
}
const xT = /* @__PURE__ */ new Set(["brightness", "contrast", "saturate", "opacity"]);
function _T(e) {
  const [n, o] = e.slice(0, -1).split("(");
  if (n === "drop-shadow")
    return e;
  const [i] = o.match(Rd) || [];
  if (!i)
    return e;
  const a = o.replace(i, "");
  let d = xT.has(n) ? 1 : 0;
  return i !== o && (d *= 100), n + "(" + d + a + ")";
}
const TT = /\b([a-z-]*)\(.*?\)/gu, Vc = {
  ...Ht,
  getAnimatableNone: (e) => {
    const n = e.match(TT);
    return n ? n.map(_T).join(" ") : e;
  }
}, Bc = {
  ...Ht,
  getAnimatableNone: (e) => {
    const n = Ht.parse(e);
    return Ht.createTransformer(e)(n.map((i) => typeof i == "number" ? 0 : typeof i == "object" ? { ...i, alpha: 1 } : i));
  }
}, Jh = {
  ...vo,
  transform: Math.round
}, kT = {
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
  scale: Ys,
  scaleX: Ys,
  scaleY: Ys,
  scaleZ: Ys,
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
  opacity: _i,
  originX: Lh,
  originY: Lh,
  originZ: ne
}, Pa = {
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
  ...kT,
  zIndex: Jh,
  // SVG
  fillOpacity: _i,
  strokeOpacity: _i,
  numOctaves: Jh
}, AT = {
  ...Pa,
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
  filter: Vc,
  WebkitFilter: Vc,
  mask: Bc,
  WebkitMask: Bc
}, Pv = (e) => AT[e], CT = /* @__PURE__ */ new Set([Vc, Bc]);
function Ev(e, n) {
  let o = Pv(e);
  return CT.has(o) || (o = Ht), o.getAnimatableNone ? o.getAnimatableNone(n) : void 0;
}
const bT = /* @__PURE__ */ new Set(["auto", "none", "0"]);
function PT(e, n, o) {
  let i = 0, a;
  for (; i < e.length && !a; ) {
    const d = e[i];
    typeof d == "string" && !bT.has(d) && mo(d).values.length && (a = e[i]), i++;
  }
  if (a && o)
    for (const d of n)
      e[d] = Ev(o, a);
}
class ET extends Fd {
  constructor(n, o, i, a, d) {
    super(n, o, i, a, d, !0);
  }
  readKeyframes() {
    const { unresolvedKeyframes: n, element: o, name: i } = this;
    if (!o || !o.current)
      return;
    super.readKeyframes();
    for (let g = 0; g < n.length; g++) {
      let l = n[g];
      if (typeof l == "string" && (l = l.trim(), Md(l))) {
        const f = xv(l, o.current);
        f !== void 0 && (n[g] = f), g === n.length - 1 && (this.finalKeyframe = l);
      }
    }
    if (this.resolveNoneKeyframes(), !_v.has(i) || n.length !== 2)
      return;
    const [a, d] = n, c = Zh(a), p = Zh(d), m = Oh(a), y = Oh(d);
    if (m !== y && Gn[i]) {
      this.needsMeasurement = !0;
      return;
    }
    if (c !== p)
      if (Gh(c) && Gh(p))
        for (let g = 0; g < n.length; g++) {
          const l = n[g];
          typeof l == "string" && (n[g] = parseFloat(l));
        }
      else Gn[i] && (this.needsMeasurement = !0);
  }
  resolveNoneKeyframes() {
    const { unresolvedKeyframes: n, name: o } = this, i = [];
    for (let a = 0; a < n.length; a++)
      (n[a] === null || wT(n[a])) && i.push(a);
    i.length && PT(n, i, o);
  }
  measureInitialState() {
    const { element: n, unresolvedKeyframes: o, name: i } = this;
    if (!n || !n.current)
      return;
    i === "height" && (this.suspendedScrollY = window.pageYOffset), this.measuredOrigin = Gn[i](n.measureViewportBox(), window.getComputedStyle(n.current)), o[0] = this.measuredOrigin;
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
    const d = i.length - 1, c = i[d];
    i[d] = Gn[o](n.measureViewportBox(), window.getComputedStyle(n.current)), c !== null && this.finalKeyframe === void 0 && (this.finalKeyframe = c), (p = this.removedTransforms) != null && p.length && this.removedTransforms.forEach(([m, y]) => {
      n.getValue(m).set(y);
    }), this.resolveNoneKeyframes();
  }
}
function Mv(e, n, o) {
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
const zc = (e, n) => n && typeof e == "number" ? n.transform(e) : e;
function ca(e) {
  return Og(e) && "offsetHeight" in e && !("ownerSVGElement" in e);
}
const { schedule: zd } = /* @__PURE__ */ Zg(queueMicrotask, !1), $t = {
  x: !1,
  y: !1
};
function Rv() {
  return $t.x || $t.y;
}
function MT(e) {
  return e === "x" || e === "y" ? $t[e] ? null : ($t[e] = !0, () => {
    $t[e] = !1;
  }) : $t.x || $t.y ? null : ($t.x = $t.y = !0, () => {
    $t.x = $t.y = !1;
  });
}
function Dv(e, n) {
  const o = Mv(e), i = new AbortController(), a = {
    passive: !0,
    ...n,
    signal: i.signal
  };
  return [o, a, () => i.abort()];
}
function RT(e) {
  return !(e.pointerType === "touch" || Rv());
}
function DT(e, n, o = {}) {
  const [i, a, d] = Dv(e, o);
  return i.forEach((c) => {
    let p = !1, m = !1, y;
    const g = () => {
      c.removeEventListener("pointerleave", x);
    }, l = (A) => {
      y && (y(A), y = void 0), g();
    }, f = (A) => {
      p = !1, window.removeEventListener("pointerup", f), window.removeEventListener("pointercancel", f), m && (m = !1, l(A));
    }, S = () => {
      p = !0, window.addEventListener("pointerup", f, a), window.addEventListener("pointercancel", f, a);
    }, x = (A) => {
      if (A.pointerType !== "touch") {
        if (p) {
          m = !0;
          return;
        }
        l(A);
      }
    }, k = (A) => {
      if (!RT(A))
        return;
      m = !1;
      const T = n(c, A);
      typeof T == "function" && (y = T, c.addEventListener("pointerleave", x, a));
    };
    c.addEventListener("pointerenter", k, a), c.addEventListener("pointerdown", S, a);
  }), d;
}
const Nv = (e, n) => n ? e === n ? !0 : Nv(e, n.parentElement) : !1, $d = (e) => e.pointerType === "mouse" ? typeof e.button != "number" || e.button <= 0 : e.isPrimary !== !1, NT = /* @__PURE__ */ new Set([
  "BUTTON",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "A"
]);
function jT(e) {
  return NT.has(e.tagName) || e.isContentEditable === !0;
}
const IT = /* @__PURE__ */ new Set(["INPUT", "SELECT", "TEXTAREA"]);
function FT(e) {
  return IT.has(e.tagName) || e.isContentEditable === !0;
}
const da = /* @__PURE__ */ new WeakSet();
function qh(e) {
  return (n) => {
    n.key === "Enter" && e(n);
  };
}
function rc(e, n) {
  e.dispatchEvent(new PointerEvent("pointer" + n, { isPrimary: !0, bubbles: !0 }));
}
const OT = (e, n) => {
  const o = e.currentTarget;
  if (!o)
    return;
  const i = qh(() => {
    if (da.has(o))
      return;
    rc(o, "down");
    const a = qh(() => {
      rc(o, "up");
    }), d = () => rc(o, "cancel");
    o.addEventListener("keyup", a, n), o.addEventListener("blur", d, n);
  });
  o.addEventListener("keydown", i, n), o.addEventListener("blur", () => o.removeEventListener("keydown", i), n);
};
function ey(e) {
  return $d(e) && !Rv();
}
const ty = /* @__PURE__ */ new WeakSet();
function LT(e, n, o = {}) {
  const [i, a, d] = Dv(e, o), c = (p) => {
    const m = p.currentTarget;
    if (!ey(p) || ty.has(p))
      return;
    da.add(m), o.stopPropagation && ty.add(p);
    const y = n(m, p), g = (S, x) => {
      window.removeEventListener("pointerup", l), window.removeEventListener("pointercancel", f), da.has(m) && da.delete(m), ey(S) && typeof y == "function" && y(S, { success: x });
    }, l = (S) => {
      g(S, m === window || m === document || o.useGlobalTarget || Nv(m, S.target));
    }, f = (S) => {
      g(S, !1);
    };
    window.addEventListener("pointerup", l, a), window.addEventListener("pointercancel", f, a);
  };
  return i.forEach((p) => {
    (o.useGlobalTarget ? window : p).addEventListener("pointerdown", c, a), ca(p) && (p.addEventListener("focus", (y) => OT(y, a)), !jT(p) && !p.hasAttribute("tabindex") && (p.tabIndex = 0));
  }), d;
}
function Ud(e) {
  return Og(e) && "ownerSVGElement" in e;
}
const fa = /* @__PURE__ */ new WeakMap();
let $n;
const jv = (e, n, o) => (i, a) => a && a[0] ? a[0][e + "Size"] : Ud(i) && "getBBox" in i ? i.getBBox()[n] : i[o], VT = /* @__PURE__ */ jv("inline", "width", "offsetWidth"), BT = /* @__PURE__ */ jv("block", "height", "offsetHeight");
function zT({ target: e, borderBoxSize: n }) {
  var o;
  (o = fa.get(e)) == null || o.forEach((i) => {
    i(e, {
      get width() {
        return VT(e, n);
      },
      get height() {
        return BT(e, n);
      }
    });
  });
}
function $T(e) {
  e.forEach(zT);
}
function UT() {
  typeof ResizeObserver > "u" || ($n = new ResizeObserver($T));
}
function HT(e, n) {
  $n || UT();
  const o = Mv(e);
  return o.forEach((i) => {
    let a = fa.get(i);
    a || (a = /* @__PURE__ */ new Set(), fa.set(i, a)), a.add(n), $n == null || $n.observe(i);
  }), () => {
    o.forEach((i) => {
      const a = fa.get(i);
      a == null || a.delete(n), a != null && a.size || $n == null || $n.unobserve(i);
    });
  };
}
const pa = /* @__PURE__ */ new Set();
let lo;
function WT() {
  lo = () => {
    const e = {
      get width() {
        return window.innerWidth;
      },
      get height() {
        return window.innerHeight;
      }
    };
    pa.forEach((n) => n(e));
  }, window.addEventListener("resize", lo);
}
function GT(e) {
  return pa.add(e), lo || WT(), () => {
    pa.delete(e), !pa.size && typeof lo == "function" && (window.removeEventListener("resize", lo), lo = void 0);
  };
}
function ny(e, n) {
  return typeof e == "function" ? GT(e) : HT(e, n);
}
function KT(e) {
  return Ud(e) && e.tagName === "svg";
}
const YT = [...bv, Be, Ht], QT = (e) => YT.find(Cv(e)), ry = () => ({
  translate: 0,
  scale: 1,
  origin: 0,
  originPoint: 0
}), uo = () => ({
  x: ry(),
  y: ry()
}), oy = () => ({ min: 0, max: 0 }), Ue = () => ({
  x: oy(),
  y: oy()
}), XT = /* @__PURE__ */ new WeakMap();
function Ua(e) {
  return e !== null && typeof e == "object" && typeof e.start == "function";
}
function Ti(e) {
  return typeof e == "string" || Array.isArray(e);
}
const Hd = [
  "animate",
  "whileInView",
  "whileFocus",
  "whileHover",
  "whileTap",
  "whileDrag",
  "exit"
], Wd = ["initial", ...Hd];
function Ha(e) {
  return Ua(e.animate) || Wd.some((n) => Ti(e[n]));
}
function Iv(e) {
  return !!(Ha(e) || e.variants);
}
function ZT(e, n, o) {
  for (const i in n) {
    const a = n[i], d = o[i];
    if (Je(a))
      e.addValue(i, a);
    else if (Je(d))
      e.addValue(i, ho(a, { owner: e }));
    else if (d !== a)
      if (e.hasValue(i)) {
        const c = e.getValue(i);
        c.liveStyle === !0 ? c.jump(a) : c.hasAnimated || c.set(a);
      } else {
        const c = e.getStaticValue(i);
        e.addValue(i, ho(c !== void 0 ? c : a, { owner: e }));
      }
  }
  for (const i in o)
    n[i] === void 0 && e.removeValue(i);
  return n;
}
const $c = { current: null }, Fv = { current: !1 }, JT = typeof window < "u";
function qT() {
  if (Fv.current = !0, !!JT)
    if (window.matchMedia) {
      const e = window.matchMedia("(prefers-reduced-motion)"), n = () => $c.current = e.matches;
      e.addEventListener("change", n), n();
    } else
      $c.current = !1;
}
const iy = [
  "AnimationStart",
  "AnimationComplete",
  "Update",
  "BeforeLayoutMeasure",
  "LayoutMeasure",
  "LayoutAnimationStart",
  "LayoutAnimationComplete"
];
let Ea = {};
function Ov(e) {
  Ea = e;
}
function ek() {
  return Ea;
}
class tk {
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
  constructor({ parent: n, props: o, presenceContext: i, reducedMotionConfig: a, skipAnimations: d, blockInitialAnimation: c, visualState: p }, m = {}) {
    this.current = null, this.children = /* @__PURE__ */ new Set(), this.isVariantNode = !1, this.isControllingVariants = !1, this.shouldReduceMotion = null, this.shouldSkipAnimations = !1, this.values = /* @__PURE__ */ new Map(), this.KeyframeResolver = Fd, this.features = {}, this.valueSubscriptions = /* @__PURE__ */ new Map(), this.prevMotionValues = {}, this.hasBeenMounted = !1, this.events = {}, this.propEventSubscriptions = {}, this.notifyUpdate = () => this.notify("Update", this.latestValues), this.render = () => {
      this.current && (this.triggerBuild(), this.renderInstance(this.current, this.renderState, this.props.style, this.projection));
    }, this.renderScheduledAt = 0, this.scheduleRender = () => {
      const S = at.now();
      this.renderScheduledAt < S && (this.renderScheduledAt = S, Ae.render(this.render, !1, !0));
    };
    const { latestValues: y, renderState: g } = p;
    this.latestValues = y, this.baseTarget = { ...y }, this.initialValues = o.initial ? { ...y } : {}, this.renderState = g, this.parent = n, this.props = o, this.presenceContext = i, this.depth = n ? n.depth + 1 : 0, this.reducedMotionConfig = a, this.skipAnimationsConfig = d, this.options = m, this.blockInitialAnimation = !!c, this.isControllingVariants = Ha(o), this.isVariantNode = Iv(o), this.isVariantNode && (this.variantChildren = /* @__PURE__ */ new Set()), this.manuallyAnimateOnMount = !!(n && n.current);
    const { willChange: l, ...f } = this.scrapeMotionValuesFromProps(o, {}, this);
    for (const S in f) {
      const x = f[S];
      y[S] !== void 0 && Je(x) && x.set(y[S]);
    }
  }
  mount(n) {
    var o, i;
    if (this.hasBeenMounted)
      for (const a in this.initialValues)
        (o = this.values.get(a)) == null || o.jump(this.initialValues[a]), this.latestValues[a] = this.initialValues[a];
    this.current = n, XT.set(n, this), this.projection && !this.projection.instance && this.projection.mount(n), this.parent && this.isVariantNode && !this.isControllingVariants && (this.removeFromVariantTree = this.parent.addVariantChild(this)), this.values.forEach((a, d) => this.bindToMotionValue(d, a)), this.reducedMotionConfig === "never" ? this.shouldReduceMotion = !1 : this.reducedMotionConfig === "always" ? this.shouldReduceMotion = !0 : (Fv.current || qT(), this.shouldReduceMotion = $c.current), this.shouldSkipAnimations = this.skipAnimationsConfig ?? !1, (i = this.parent) == null || i.addChild(this), this.update(this.props, this.presenceContext), this.hasBeenMounted = !0;
  }
  unmount() {
    var n;
    this.projection && this.projection.unmount(), Xn(this.notifyUpdate), Xn(this.render), this.valueSubscriptions.forEach((o) => o()), this.valueSubscriptions.clear(), this.removeFromVariantTree && this.removeFromVariantTree(), (n = this.parent) == null || n.removeChild(this);
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
    if (this.valueSubscriptions.has(n) && this.valueSubscriptions.get(n)(), o.accelerate && vv.has(n) && this.current instanceof HTMLElement) {
      const { factory: c, keyframes: p, times: m, ease: y, duration: g } = o.accelerate, l = new yv({
        element: this.current,
        name: n,
        keyframes: p,
        times: m,
        ease: y,
        duration: /* @__PURE__ */ yt(g)
      }), f = c(l);
      this.valueSubscriptions.set(n, () => {
        f(), l.cancel();
      });
      return;
    }
    const i = wo.has(n);
    i && this.onBindTransform && this.onBindTransform();
    const a = o.on("change", (c) => {
      this.latestValues[n] = c, this.props.onUpdate && Ae.preRender(this.notifyUpdate), i && this.projection && (this.projection.isTransformDirty = !0), this.scheduleRender();
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
    for (n in Ea) {
      const o = Ea[n];
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
    return this.current ? this.measureInstanceViewportBox(this.current, this.props) : Ue();
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
    for (let i = 0; i < iy.length; i++) {
      const a = iy[i];
      this.propEventSubscriptions[a] && (this.propEventSubscriptions[a](), delete this.propEventSubscriptions[a]);
      const d = "on" + a, c = n[d];
      c && (this.propEventSubscriptions[a] = this.on(a, c));
    }
    this.prevMotionValues = ZT(this, this.scrapeMotionValuesFromProps(n, this.prevProps || {}, this), this.prevMotionValues), this.handleChildMotionValue && this.handleChildMotionValue();
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
    return i === void 0 && o !== void 0 && (i = ho(o === null ? void 0 : o, { owner: this }), this.addValue(n, i)), i;
  }
  /**
   * If we're trying to animate to a previously unencountered value,
   * we need to check for it in our state and as a last resort read it
   * directly from the instance (which might have performance implications).
   */
  readValue(n, o) {
    let i = this.latestValues[n] !== void 0 || !this.current ? this.latestValues[n] : this.getBaseTargetFromProps(this.props, n) ?? this.readValueFromInstance(this.current, n, this.options);
    return i != null && (typeof i == "string" && (Fg(i) || Lg(i)) ? i = parseFloat(i) : !QT(i) && Ht.test(o) && (i = Ev(n, o)), this.setBaseTarget(n, Je(i) ? i.get() : i)), Je(i) ? i.get() : i;
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
      const c = Vd(this.props, o, (d = this.presenceContext) == null ? void 0 : d.custom);
      c && (i = c[n]);
    }
    if (o && i !== void 0)
      return i;
    const a = this.getBaseTargetFromProps(this.props, n);
    return a !== void 0 && !Je(a) ? a : this.initialValues[n] !== void 0 && i === void 0 ? void 0 : this.baseTarget[n];
  }
  on(n, o) {
    return this.events[n] || (this.events[n] = new bd()), this.events[n].add(o);
  }
  notify(n, ...o) {
    this.events[n] && this.events[n].notify(...o);
  }
  scheduleRenderMicrotask() {
    zd.render(this.render);
  }
}
class Lv extends tk {
  constructor() {
    super(...arguments), this.KeyframeResolver = ET;
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
class qn {
  constructor(n) {
    this.isMounted = !1, this.node = n;
  }
  update() {
  }
}
function Vv({ top: e, left: n, right: o, bottom: i }) {
  return {
    x: { min: n, max: o },
    y: { min: e, max: i }
  };
}
function nk({ x: e, y: n }) {
  return { top: n.min, right: e.max, bottom: n.max, left: e.min };
}
function rk(e, n) {
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
function oc(e) {
  return e === void 0 || e === 1;
}
function Uc({ scale: e, scaleX: n, scaleY: o }) {
  return !oc(e) || !oc(n) || !oc(o);
}
function mr(e) {
  return Uc(e) || Bv(e) || e.z || e.rotate || e.rotateX || e.rotateY || e.skewX || e.skewY;
}
function Bv(e) {
  return sy(e.x) || sy(e.y);
}
function sy(e) {
  return e && e !== "0%";
}
function Ma(e, n, o) {
  const i = e - o, a = n * i;
  return o + a;
}
function ay(e, n, o, i, a) {
  return a !== void 0 && (e = Ma(e, a, i)), Ma(e, o, i) + n;
}
function Hc(e, n = 0, o = 1, i, a) {
  e.min = ay(e.min, n, o, i, a), e.max = ay(e.max, n, o, i, a);
}
function zv(e, { x: n, y: o }) {
  Hc(e.x, n.translate, n.scale, n.originPoint), Hc(e.y, o.translate, o.scale, o.originPoint);
}
const ly = 0.999999999999, uy = 1.0000000000001;
function ok(e, n, o, i = !1) {
  var p;
  const a = o.length;
  if (!a)
    return;
  n.x = n.y = 1;
  let d, c;
  for (let m = 0; m < a; m++) {
    d = o[m], c = d.projectionDelta;
    const { visualElement: y } = d.options;
    y && y.props.style && y.props.style.display === "contents" || (i && d.options.layoutScroll && d.scroll && d !== d.root && (en(e.x, -d.scroll.offset.x), en(e.y, -d.scroll.offset.y)), c && (n.x *= c.x.scale, n.y *= c.y.scale, zv(e, c)), i && mr(d.latestValues) && ma(e, d.latestValues, (p = d.layout) == null ? void 0 : p.layoutBox));
  }
  n.x < uy && n.x > ly && (n.x = 1), n.y < uy && n.y > ly && (n.y = 1);
}
function en(e, n) {
  e.min += n, e.max += n;
}
function cy(e, n, o, i, a = 0.5) {
  const d = ke(e.min, e.max, a);
  Hc(e, n, o, d, i);
}
function dy(e, n) {
  return typeof e == "string" ? parseFloat(e) / 100 * (n.max - n.min) : e;
}
function ma(e, n, o) {
  const i = o ?? e;
  cy(e.x, dy(n.x, i.x), n.scaleX, n.scale, n.originX), cy(e.y, dy(n.y, i.y), n.scaleY, n.scale, n.originY);
}
function $v(e, n) {
  return Vv(rk(e.getBoundingClientRect(), n));
}
function ik(e, n, o) {
  const i = $v(e, o), { scroll: a } = n;
  return a && (en(i.x, a.offset.x), en(i.y, a.offset.y)), i;
}
const sk = {
  x: "translateX",
  y: "translateY",
  z: "translateZ",
  transformPerspective: "perspective"
}, ak = So.length;
function lk(e, n, o) {
  let i = "", a = !0;
  for (let c = 0; c < ak; c++) {
    const p = So[c], m = e[p];
    if (m === void 0)
      continue;
    let y = !0;
    if (typeof m == "number")
      y = m === (p.startsWith("scale") ? 1 : 0);
    else {
      const g = parseFloat(m);
      y = p.startsWith("scale") ? g === 1 : g === 0;
    }
    if (!y || o) {
      const g = zc(m, Pa[p]);
      if (!y) {
        a = !1;
        const l = sk[p] || p;
        i += `${l}(${g}) `;
      }
      o && (n[p] = g);
    }
  }
  const d = e.pathRotation;
  return d && (a = !1, i += `rotate(${zc(d, Pa.pathRotation)}) `), i = i.trim(), o ? i = o(n, a ? "" : i) : a && (i = "none"), i;
}
function Gd(e, n, o) {
  const { style: i, vars: a, transformOrigin: d } = e;
  let c = !1, p = !1;
  for (const m in n) {
    const y = n[m];
    if (wo.has(m)) {
      c = !0;
      continue;
    } else if (qg(m)) {
      a[m] = y;
      continue;
    } else {
      const g = zc(y, Pa[m]);
      m.startsWith("origin") ? (p = !0, d[m] = g) : i[m] = g;
    }
  }
  if (n.transform || (c || o ? i.transform = lk(n, e.transform, o) : i.transform && (i.transform = "none")), p) {
    const { originX: m = "50%", originY: y = "50%", originZ: g = 0 } = d;
    i.transformOrigin = `${m} ${y} ${g}`;
  }
}
function Uv(e, { style: n, vars: o }, i, a) {
  const d = e.style;
  let c;
  for (c in n)
    d[c] = n[c];
  a == null || a.applyProjectionStyles(d, i);
  for (c in o)
    d.setProperty(c, o[c]);
}
function fy(e, n) {
  return n.max === n.min ? 0 : e / (n.max - n.min) * 100;
}
const fi = {
  correct: (e, n) => {
    if (!n.target)
      return e;
    if (typeof e == "string")
      if (ne.test(e))
        e = parseFloat(e);
      else
        return e;
    const o = fy(e, n.target.x), i = fy(e, n.target.y);
    return `${o}% ${i}%`;
  }
}, uk = {
  correct: (e, { treeScale: n, projectionDelta: o }) => {
    const i = e, a = Ht.parse(e);
    if (a.length > 5)
      return i;
    const d = Ht.createTransformer(e), c = typeof a[0] != "number" ? 1 : 0, p = o.x.scale * n.x, m = o.y.scale * n.y;
    a[0 + c] /= p, a[1 + c] /= m;
    const y = ke(p, m, 0.5);
    return typeof a[2 + c] == "number" && (a[2 + c] /= y), typeof a[3 + c] == "number" && (a[3 + c] /= y), d(a);
  }
}, Wc = {
  borderRadius: {
    ...fi,
    applyTo: [
      "borderTopLeftRadius",
      "borderTopRightRadius",
      "borderBottomLeftRadius",
      "borderBottomRightRadius"
    ]
  },
  borderTopLeftRadius: fi,
  borderTopRightRadius: fi,
  borderBottomLeftRadius: fi,
  borderBottomRightRadius: fi,
  boxShadow: uk
};
function Hv(e, { layout: n, layoutId: o }) {
  return wo.has(e) || e.startsWith("origin") || (n || o !== void 0) && (!!Wc[e] || e === "opacity");
}
function Kd(e, n, o) {
  var c;
  const i = e.style, a = n == null ? void 0 : n.style, d = {};
  if (!i)
    return d;
  for (const p in i)
    (Je(i[p]) || a && Je(a[p]) || Hv(p, e) || ((c = o == null ? void 0 : o.getValue(p)) == null ? void 0 : c.liveStyle) !== void 0) && (d[p] = i[p]);
  return d;
}
function ck(e) {
  return window.getComputedStyle(e);
}
class dk extends Lv {
  constructor() {
    super(...arguments), this.type = "html", this.renderInstance = Uv;
  }
  readValueFromInstance(n, o) {
    var i;
    if (wo.has(o))
      return (i = this.projection) != null && i.isProjecting ? Mc(o) : M_(n, o);
    {
      const a = ck(n), d = (qg(o) ? a.getPropertyValue(o) : a[o]) || 0;
      return typeof d == "string" ? d.trim() : d;
    }
  }
  measureInstanceViewportBox(n, { transformPagePoint: o }) {
    return $v(n, o);
  }
  build(n, o, i) {
    Gd(n, o, i.transformTemplate);
  }
  scrapeMotionValuesFromProps(n, o, i) {
    return Kd(n, o, i);
  }
}
const fk = {
  offset: "stroke-dashoffset",
  array: "stroke-dasharray"
}, pk = {
  offset: "strokeDashoffset",
  array: "strokeDasharray"
};
function mk(e, n, o = 1, i = 0, a = !0) {
  e.pathLength = 1;
  const d = a ? fk : pk;
  e[d.offset] = `${-i}`, e[d.array] = `${n} ${o}`;
}
const hk = [
  "offsetDistance",
  "offsetPath",
  "offsetRotate",
  "offsetAnchor"
];
function Wv(e, {
  attrX: n,
  attrY: o,
  attrScale: i,
  pathLength: a,
  pathSpacing: d = 1,
  pathOffset: c = 0,
  // This is object creation, which we try to avoid per-frame.
  ...p
}, m, y, g) {
  if (Gd(e, p, y), m) {
    e.style.viewBox && (e.attrs.viewBox = e.style.viewBox);
    return;
  }
  e.attrs = e.style, e.style = {};
  const { attrs: l, style: f } = e;
  l.transform && (f.transform = l.transform, delete l.transform), (f.transform || l.transformOrigin) && (f.transformOrigin = l.transformOrigin ?? "50% 50%", delete l.transformOrigin), f.transform && (f.transformBox = (g == null ? void 0 : g.transformBox) ?? "fill-box", delete l.transformBox);
  for (const S of hk)
    l[S] !== void 0 && (f[S] = l[S], delete l[S]);
  n !== void 0 && (l.x = n), o !== void 0 && (l.y = o), i !== void 0 && (l.scale = i), a !== void 0 && mk(l, a, d, c, !1);
}
const Gv = /* @__PURE__ */ new Set([
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
]), Kv = (e) => typeof e == "string" && e.toLowerCase() === "svg";
function yk(e, n, o, i) {
  Uv(e, n, void 0, i);
  for (const a in n.attrs)
    e.setAttribute(Gv.has(a) ? a : Bd(a), n.attrs[a]);
}
function Yv(e, n, o) {
  const i = Kd(e, n, o);
  for (const a in e)
    if (Je(e[a]) || Je(n[a])) {
      const d = So.indexOf(a) !== -1 ? "attr" + a.charAt(0).toUpperCase() + a.substring(1) : a;
      i[d] = e[a];
    }
  return i;
}
class gk extends Lv {
  constructor() {
    super(...arguments), this.type = "svg", this.isSVGTag = !1, this.measureInstanceViewportBox = Ue;
  }
  getBaseTargetFromProps(n, o) {
    return n[o];
  }
  readValueFromInstance(n, o) {
    if (wo.has(o)) {
      const i = Pv(o);
      return i && i.default || 0;
    }
    return o = Gv.has(o) ? o : Bd(o), n.getAttribute(o);
  }
  scrapeMotionValuesFromProps(n, o, i) {
    return Yv(n, o, i);
  }
  build(n, o, i) {
    Wv(n, o, this.isSVGTag, i.transformTemplate, i.style);
  }
  renderInstance(n, o, i, a) {
    yk(n, o, i, a);
  }
  mount(n) {
    this.isSVGTag = Kv(n.tagName), super.mount(n);
  }
}
const vk = Wd.length;
function Qv(e) {
  if (!e)
    return;
  if (!e.isControllingVariants) {
    const o = e.parent ? Qv(e.parent) || {} : {};
    return e.props.initial !== void 0 && (o.initial = e.props.initial), o;
  }
  const n = {};
  for (let o = 0; o < vk; o++) {
    const i = Wd[o], a = e.props[i];
    (Ti(a) || a === !1) && (n[i] = a);
  }
  return n;
}
function Xv(e, n) {
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
const Sk = [...Hd].reverse(), wk = Hd.length;
function xk(e) {
  return (n) => Promise.all(n.map(({ animation: o, options: i }) => vT(e, o, i)));
}
function _k(e) {
  let n = xk(e), o = py(), i = !0, a = !1;
  const d = (y) => (g, l) => {
    var S;
    const f = Tr(e, l, y === "exit" ? (S = e.presenceContext) == null ? void 0 : S.custom : void 0);
    if (f) {
      const { transition: x, transitionEnd: k, ...A } = f;
      g = { ...g, ...A, ...k };
    }
    return g;
  };
  function c(y) {
    n = y(e);
  }
  function p(y) {
    const { props: g } = e, l = Qv(e.parent) || {}, f = [], S = /* @__PURE__ */ new Set();
    let x = {}, k = 1 / 0;
    for (let T = 0; T < wk; T++) {
      const b = Sk[T], E = o[b], D = g[b] !== void 0 ? g[b] : l[b], O = Ti(D), H = b === y ? E.isActive : null;
      H === !1 && (k = T);
      let W = D === l[b] && D !== g[b] && O;
      if (W && (i || a) && e.manuallyAnimateOnMount && (W = !1), E.protectedKeys = { ...x }, // If it isn't active and hasn't *just* been set as inactive
      !E.isActive && H === null || // If we didn't and don't have any defined prop for this animation type
      !D && !E.prevProp || // Or if the prop doesn't define an animation
      Ua(D) || typeof D == "boolean")
        continue;
      if (b === "exit" && E.isActive && H !== !0) {
        E.prevResolvedValues && (x = {
          ...x,
          ...E.prevResolvedValues
        });
        continue;
      }
      const G = Tk(E.prevProp, D);
      let K = G || // If we're making this variant active, we want to always make it active
      b === y && E.isActive && !W && O || // If we removed a higher-priority variant (i is in reverse order)
      T > k && O, X = !1;
      const se = Array.isArray(D) ? D : [D];
      let Z = se.reduce(d(b), {});
      H === !1 && (Z = {});
      const { prevResolvedValues: de = {} } = E, ce = {
        ...de,
        ...Z
      }, Se = (z) => {
        K = !0, S.has(z) && (X = !0, S.delete(z)), E.needsAnimating[z] = !0;
        const J = e.getValue(z);
        J && (J.liveStyle = !1);
      };
      for (const z in ce) {
        const J = Z[z], Q = de[z];
        if (x.hasOwnProperty(z))
          continue;
        let N = !1;
        Fc(J) && Fc(Q) ? N = !Xv(J, Q) || G : N = J !== Q, N ? J != null ? Se(z) : S.add(z) : J !== void 0 && S.has(z) ? Se(z) : E.protectedKeys[z] = !0;
      }
      E.prevProp = D, E.prevResolvedValues = Z, E.isActive && (x = { ...x, ...Z }), (i || a) && e.blockInitialAnimation && (K = !1);
      const re = W && G;
      K && (!re || X) && f.push(...se.map((z) => {
        const J = { type: b };
        if (typeof z == "string" && (i || a) && !re && e.manuallyAnimateOnMount && e.parent) {
          const { parent: Q } = e, N = Tr(Q, z);
          if (Q.enteringChildren && N) {
            const { delayChildren: L } = N.transition || {};
            J.delay = Sv(Q.enteringChildren, e, L);
          }
        }
        return {
          animation: z,
          options: J
        };
      }));
    }
    if (S.size) {
      const T = {};
      if (typeof g.initial != "boolean") {
        const b = Tr(e, Array.isArray(g.initial) ? g.initial[0] : g.initial);
        b && b.transition && (T.transition = b.transition);
      }
      S.forEach((b) => {
        const E = e.getBaseTarget(b), D = e.getValue(b);
        D && (D.liveStyle = !0), T[b] = E ?? null;
      }), f.push({ animation: T });
    }
    let A = !!f.length;
    return i && (g.initial === !1 || g.initial === g.animate) && !e.manuallyAnimateOnMount && (A = !1), i = !1, a = !1, A ? n(f) : Promise.resolve();
  }
  function m(y, g) {
    var f;
    if (o[y].isActive === g)
      return Promise.resolve();
    (f = e.variantChildren) == null || f.forEach((S) => {
      var x;
      return (x = S.animationState) == null ? void 0 : x.setActive(y, g);
    }), o[y].isActive = g;
    const l = p(y);
    for (const S in o)
      o[S].protectedKeys = {};
    return l;
  }
  return {
    animateChanges: p,
    setActive: m,
    setAnimateFunction: c,
    getState: () => o,
    reset: () => {
      o = py(), a = !0;
    }
  };
}
function Tk(e, n) {
  return typeof n == "string" ? n !== e : Array.isArray(n) ? !Xv(n, e) : !1;
}
function pr(e = !1) {
  return {
    isActive: e,
    protectedKeys: {},
    needsAnimating: {},
    prevResolvedValues: {}
  };
}
function py() {
  return {
    animate: pr(!0),
    whileInView: pr(),
    whileHover: pr(),
    whileTap: pr(),
    whileDrag: pr(),
    whileFocus: pr(),
    exit: pr()
  };
}
function Gc(e, n) {
  e.min = n.min, e.max = n.max;
}
function zt(e, n) {
  Gc(e.x, n.x), Gc(e.y, n.y);
}
function my(e, n) {
  e.translate = n.translate, e.scale = n.scale, e.originPoint = n.originPoint, e.origin = n.origin;
}
const Zv = 1e-4, kk = 1 - Zv, Ak = 1 + Zv, Jv = 0.01, Ck = 0 - Jv, bk = 0 + Jv;
function lt(e) {
  return e.max - e.min;
}
function Pk(e, n, o) {
  return Math.abs(e - n) <= o;
}
function hy(e, n, o, i = 0.5) {
  e.origin = i, e.originPoint = ke(n.min, n.max, e.origin), e.scale = lt(o) / lt(n), e.translate = ke(o.min, o.max, e.origin) - e.originPoint, (e.scale >= kk && e.scale <= Ak || isNaN(e.scale)) && (e.scale = 1), (e.translate >= Ck && e.translate <= bk || isNaN(e.translate)) && (e.translate = 0);
}
function gi(e, n, o, i) {
  hy(e.x, n.x, o.x, i ? i.originX : void 0), hy(e.y, n.y, o.y, i ? i.originY : void 0);
}
function yy(e, n, o, i = 0) {
  const a = i ? ke(o.min, o.max, i) : o.min;
  e.min = a + n.min, e.max = e.min + lt(n);
}
function Ek(e, n, o, i) {
  yy(e.x, n.x, o.x, i == null ? void 0 : i.x), yy(e.y, n.y, o.y, i == null ? void 0 : i.y);
}
function gy(e, n, o, i = 0) {
  const a = i ? ke(o.min, o.max, i) : o.min;
  e.min = n.min - a, e.max = e.min + lt(n);
}
function Ra(e, n, o, i) {
  gy(e.x, n.x, o.x, i == null ? void 0 : i.x), gy(e.y, n.y, o.y, i == null ? void 0 : i.y);
}
function vy(e, n, o, i, a) {
  return e -= n, e = Ma(e, 1 / o, i), a !== void 0 && (e = Ma(e, 1 / a, i)), e;
}
function Mk(e, n = 0, o = 1, i = 0.5, a, d = e, c = e) {
  if (rn.test(n) && (n = parseFloat(n), n = ke(c.min, c.max, n / 100) - c.min), typeof n != "number")
    return;
  let p = ke(d.min, d.max, i);
  e === d && (p -= n), e.min = vy(e.min, n, o, p, a), e.max = vy(e.max, n, o, p, a);
}
function Sy(e, n, [o, i, a], d, c) {
  Mk(e, n[o], n[i], n[a], n.scale, d, c);
}
const Rk = ["x", "scaleX", "originX"], Dk = ["y", "scaleY", "originY"];
function wy(e, n, o, i) {
  Sy(e.x, n, Rk, o ? o.x : void 0, i ? i.x : void 0), Sy(e.y, n, Dk, o ? o.y : void 0, i ? i.y : void 0);
}
function xy(e) {
  return e.translate === 0 && e.scale === 1;
}
function qv(e) {
  return xy(e.x) && xy(e.y);
}
function _y(e, n) {
  return e.min === n.min && e.max === n.max;
}
function Nk(e, n) {
  return _y(e.x, n.x) && _y(e.y, n.y);
}
function Ty(e, n) {
  return Math.round(e.min) === Math.round(n.min) && Math.round(e.max) === Math.round(n.max);
}
function e0(e, n) {
  return Ty(e.x, n.x) && Ty(e.y, n.y);
}
function ky(e) {
  return lt(e.x) / lt(e.y);
}
function Ay(e, n) {
  return e.translate === n.translate && e.scale === n.scale && e.originPoint === n.originPoint;
}
function qt(e) {
  return [e("x"), e("y")];
}
function jk(e, n, o) {
  let i = "";
  const a = e.x.translate / n.x, d = e.y.translate / n.y, c = (o == null ? void 0 : o.z) || 0;
  if ((a || d || c) && (i = `translate3d(${a}px, ${d}px, ${c}px) `), (n.x !== 1 || n.y !== 1) && (i += `scale(${1 / n.x}, ${1 / n.y}) `), o) {
    const { transformPerspective: y, rotate: g, pathRotation: l, rotateX: f, rotateY: S, skewX: x, skewY: k } = o;
    y && (i = `perspective(${y}px) ${i}`), g && (i += `rotate(${g}deg) `), l && (i += `rotate(${l}deg) `), f && (i += `rotateX(${f}deg) `), S && (i += `rotateY(${S}deg) `), x && (i += `skewX(${x}deg) `), k && (i += `skewY(${k}deg) `);
  }
  const p = e.x.scale * n.x, m = e.y.scale * n.y;
  return (p !== 1 || m !== 1) && (i += `scale(${p}, ${m})`), i || "none";
}
const t0 = [
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius"
], Ik = t0.length, Cy = (e) => typeof e == "string" ? parseFloat(e) : e, by = (e) => typeof e == "number" || ne.test(e);
function Fk(e, n, o, i, a, d) {
  a ? (e.opacity = ke(0, o.opacity ?? 1, Ok(i)), e.opacityExit = ke(n.opacity ?? 1, 0, Lk(i))) : d && (e.opacity = ke(n.opacity ?? 1, o.opacity ?? 1, i));
  for (let c = 0; c < Ik; c++) {
    const p = t0[c];
    let m = Py(n, p), y = Py(o, p);
    if (m === void 0 && y === void 0)
      continue;
    m || (m = 0), y || (y = 0), m === 0 || y === 0 || by(m) === by(y) ? (e[p] = Math.max(ke(Cy(m), Cy(y), i), 0), (rn.test(y) || rn.test(m)) && (e[p] += "%")) : e[p] = y;
  }
  (n.rotate || o.rotate) && (e.rotate = ke(n.rotate || 0, o.rotate || 0, i));
}
function Py(e, n) {
  return e[n] !== void 0 ? e[n] : e.borderRadius;
}
const Ok = /* @__PURE__ */ n0(0, 0.5, Kg), Lk = /* @__PURE__ */ n0(0.5, 0.95, Nt);
function n0(e, n, o) {
  return (i) => i < e ? 0 : i > n ? 1 : o(/* @__PURE__ */ xi(e, n, i));
}
function Vk(e, n, o) {
  const i = Je(e) ? e : ho(e);
  return i.start(Ld("", i, n, o)), i.animation;
}
function ki(e, n, o, i = { passive: !0 }) {
  return e.addEventListener(n, o, i), () => e.removeEventListener(n, o);
}
const Bk = (e, n) => e.depth - n.depth;
class zk {
  constructor() {
    this.children = [], this.isDirty = !1;
  }
  add(n) {
    Cd(this.children, n), this.isDirty = !0;
  }
  remove(n) {
    Ta(this.children, n), this.isDirty = !0;
  }
  forEach(n) {
    this.isDirty && this.children.sort(Bk), this.isDirty = !1, this.children.forEach(n);
  }
}
function $k(e, n) {
  const o = at.now(), i = ({ timestamp: a }) => {
    const d = a - o;
    d >= n && (Xn(i), e(d - n));
  };
  return Ae.setup(i, !0), () => Xn(i);
}
function ha(e) {
  return Je(e) ? e.get() : e;
}
class Uk {
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
      (!a || a.isConnected === !1) && !i.snapshot && (Ta(this.members, i), i.unmount());
    }
    n.scheduleRender();
  }
  remove(n) {
    if (Ta(this.members, n), n === this.prevLead && (this.prevLead = void 0), n === this.lead) {
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
      const { layoutDependency: d } = i.options, { layoutDependency: c } = n.options;
      (d === void 0 || d !== c) && (n.resumeFrom = i, o && (i.preserveOpacity = !0), i.snapshot && (n.snapshot = i.snapshot, n.snapshot.latestValues = i.animationValues || i.latestValues), (a = n.root) != null && a.isUpdating && (n.isLayoutDirty = !0)), n.options.crossfade === !1 && i.hide();
    }
  }
  exitAnimationComplete() {
    this.members.forEach((n) => {
      var o, i, a, d, c;
      (i = (o = n.options).onExitComplete) == null || i.call(o), (c = (a = n.resumingFrom) == null ? void 0 : (d = a.options).onExitComplete) == null || c.call(d);
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
const ya = {
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
}, ic = ["", "X", "Y", "Z"], Hk = 1e3;
let Wk = 0;
function sc(e, n, o, i) {
  const { latestValues: a } = n;
  a[e] && (o[e] = a[e], n.setStaticValue(e, 0), i && (i[e] = 0));
}
function r0(e) {
  if (e.hasCheckedOptimisedAppear = !0, e.root === e)
    return;
  const { visualElement: n } = e.options;
  if (!n)
    return;
  const o = kv(n);
  if (window.MotionHasOptimisedAnimation(o, "transform")) {
    const { layout: a, layoutId: d } = e.options;
    window.MotionCancelOptimisedAnimation(o, "transform", Ae, !(a || d));
  }
  const { parent: i } = e;
  i && !i.hasCheckedOptimisedAppear && r0(i);
}
function o0({ attachResizeListener: e, defaultParent: n, measureScroll: o, checkIsScrollRoot: i, resetTransform: a }) {
  return class {
    constructor(c = {}, p = n == null ? void 0 : n()) {
      this.id = Wk++, this.animationId = 0, this.animationCommitId = 0, this.children = /* @__PURE__ */ new Set(), this.options = {}, this.isTreeAnimating = !1, this.isAnimationBlocked = !1, this.isLayoutDirty = !1, this.isProjectionDirty = !1, this.isSharedProjectionDirty = !1, this.isTransformDirty = !1, this.updateManuallyBlocked = !1, this.updateBlockedByResize = !1, this.isUpdating = !1, this.isSVG = !1, this.needsReset = !1, this.shouldResetTransform = !1, this.hasCheckedOptimisedAppear = !1, this.treeScale = { x: 1, y: 1 }, this.eventHandlers = /* @__PURE__ */ new Map(), this.hasTreeAnimated = !1, this.layoutVersion = 0, this.updateScheduled = !1, this.scheduleUpdate = () => this.update(), this.projectionUpdateScheduled = !1, this.checkUpdateFailed = () => {
        this.isUpdating && (this.isUpdating = !1, this.clearAllSnapshots());
      }, this.updateProjection = () => {
        this.projectionUpdateScheduled = !1, this.nodes.forEach(Yk), this.nodes.forEach(eA), this.nodes.forEach(tA), this.nodes.forEach(Qk);
      }, this.resolvedRelativeTargetAt = 0, this.linkedParentVersion = 0, this.hasProjected = !1, this.isVisible = !0, this.animationProgress = 0, this.sharedNodes = /* @__PURE__ */ new Map(), this.latestValues = c, this.root = p ? p.root || p : this, this.path = p ? [...p.path, p] : [], this.parent = p, this.depth = p ? p.depth + 1 : 0;
      for (let m = 0; m < this.path.length; m++)
        this.path[m].shouldResetTransform = !0;
      this.root === this && (this.nodes = new zk());
    }
    addEventListener(c, p) {
      return this.eventHandlers.has(c) || this.eventHandlers.set(c, new bd()), this.eventHandlers.get(c).add(p);
    }
    notifyListeners(c, ...p) {
      const m = this.eventHandlers.get(c);
      m && m.notify(...p);
    }
    hasListeners(c) {
      return this.eventHandlers.has(c);
    }
    /**
     * Lifecycles
     */
    mount(c) {
      if (this.instance)
        return;
      this.isSVG = Ud(c) && !KT(c), this.instance = c;
      const { layoutId: p, layout: m, visualElement: y } = this.options;
      if (y && !y.current && y.mount(c), this.root.nodes.add(this), this.parent && this.parent.children.add(this), this.root.hasTreeAnimated && (m || p) && (this.isLayoutDirty = !0), e) {
        let g, l = 0;
        const f = () => this.root.updateBlockedByResize = !1;
        Ae.read(() => {
          l = window.innerWidth;
        }), e(c, () => {
          const S = window.innerWidth;
          S !== l && (l = S, this.root.updateBlockedByResize = !0, g && g(), g = $k(f, 250), ya.hasAnimatedSinceResize && (ya.hasAnimatedSinceResize = !1, this.nodes.forEach(Ry)));
        });
      }
      p && this.root.registerSharedNode(p, this), this.options.animate !== !1 && y && (p || m) && this.addEventListener("didUpdate", ({ delta: g, hasLayoutChanged: l, hasRelativeLayoutChanged: f, layout: S }) => {
        if (this.isTreeAnimationBlocked()) {
          this.target = void 0, this.relativeTarget = void 0;
          return;
        }
        const x = this.options.transition || y.getDefaultTransition() || sA, { onLayoutAnimationStart: k, onLayoutAnimationComplete: A } = y.getProps(), T = !this.targetLayout || !e0(this.targetLayout, S), b = !l && f;
        if (this.options.layoutRoot || this.resumeFrom || b || l && (T || !this.currentAnimation)) {
          this.resumeFrom && (this.resumingFrom = this.resumeFrom, this.resumingFrom.resumingFrom = void 0);
          const E = {
            ...Od(x, "layout"),
            onPlay: k,
            onComplete: A
          };
          (y.shouldReduceMotion || this.options.layoutRoot) && (E.delay = 0, E.type = !1), this.startAnimation(E), this.setAnimationOrigin(g, b, E.path);
        } else
          l || Ry(this), this.isLead() && this.options.onExitComplete && this.options.onExitComplete();
        this.targetLayout = S;
      });
    }
    unmount() {
      this.options.layoutId && this.willUpdate(), this.root.nodes.remove(this);
      const c = this.getStack();
      c && c.remove(this), this.parent && this.parent.children.delete(this), this.instance = void 0, this.eventHandlers.clear(), Xn(this.updateProjection);
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
      this.isUpdateBlocked() || (this.isUpdating = !0, this.nodes && this.nodes.forEach(nA), this.animationId++);
    }
    getTransformTemplate() {
      const { visualElement: c } = this.options;
      return c && c.getProps().transformTemplate;
    }
    willUpdate(c = !0) {
      if (this.root.hasTreeAnimated = !0, this.root.isUpdateBlocked()) {
        this.options.onExitComplete && this.options.onExitComplete();
        return;
      }
      if (window.MotionCancelOptimisedAnimation && !this.hasCheckedOptimisedAppear && r0(this), !this.root.isUpdating && this.root.startUpdate(), this.isLayoutDirty)
        return;
      this.isLayoutDirty = !0;
      for (let g = 0; g < this.path.length; g++) {
        const l = this.path[g];
        l.shouldResetTransform = !0, (typeof l.latestValues.x == "string" || typeof l.latestValues.y == "string") && (l.isLayoutDirty = !0), l.updateScroll("snapshot"), l.options.layoutRoot && l.willUpdate(!1);
      }
      const { layoutId: p, layout: m } = this.options;
      if (p === void 0 && !m)
        return;
      const y = this.getTransformTemplate();
      this.prevTransformTemplateValue = y ? y(this.latestValues, "") : void 0, this.updateSnapshot(), c && this.notifyListeners("willUpdate");
    }
    update() {
      if (this.updateScheduled = !1, this.isUpdateBlocked()) {
        const m = this.updateBlockedByResize;
        this.unblockUpdate(), this.updateBlockedByResize = !1, this.clearAllSnapshots(), m && this.nodes.forEach(Zk), this.nodes.forEach(Ey);
        return;
      }
      if (this.animationId <= this.animationCommitId) {
        this.nodes.forEach(My);
        return;
      }
      this.animationCommitId = this.animationId, this.isUpdating ? (this.isUpdating = !1, this.nodes.forEach(Jk), this.nodes.forEach(qk), this.nodes.forEach(Gk), this.nodes.forEach(Kk)) : this.nodes.forEach(My), this.clearAllSnapshots();
      const p = at.now();
      Ze.delta = on(0, 1e3 / 60, p - Ze.timestamp), Ze.timestamp = p, Ze.isProcessing = !0, Zu.update.process(Ze), Zu.preRender.process(Ze), Zu.render.process(Ze), Ze.isProcessing = !1;
    }
    didUpdate() {
      this.updateScheduled || (this.updateScheduled = !0, zd.read(this.scheduleUpdate));
    }
    clearAllSnapshots() {
      this.nodes.forEach(Xk), this.sharedNodes.forEach(rA);
    }
    scheduleUpdateProjection() {
      this.projectionUpdateScheduled || (this.projectionUpdateScheduled = !0, Ae.preRender(this.updateProjection, !1, !0));
    }
    scheduleCheckAfterUnmount() {
      Ae.postRender(() => {
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
      const c = this.layout;
      this.layout = this.measure(!1), this.layoutVersion++, this.layoutCorrected || (this.layoutCorrected = Ue()), this.isLayoutDirty = !1, this.projectionDelta = void 0, this.notifyListeners("measure", this.layout.layoutBox);
      const { visualElement: p } = this.options;
      p && p.notify("LayoutMeasure", this.layout.layoutBox, c ? c.layoutBox : void 0);
    }
    updateScroll(c = "measure") {
      let p = !!(this.options.layoutScroll && this.instance);
      if (this.scroll && this.scroll.animationId === this.root.animationId && this.scroll.phase === c && (p = !1), p && this.instance) {
        const m = i(this.instance);
        this.scroll = {
          animationId: this.root.animationId,
          phase: c,
          isRoot: m,
          offset: o(this.instance),
          wasRoot: this.scroll ? this.scroll.isRoot : m
        };
      }
    }
    resetTransform() {
      if (!a)
        return;
      const c = this.isLayoutDirty || this.shouldResetTransform || this.options.alwaysMeasureLayout, p = this.projectionDelta && !qv(this.projectionDelta), m = this.getTransformTemplate(), y = m ? m(this.latestValues, "") : void 0, g = y !== this.prevTransformTemplateValue;
      c && this.instance && (p || mr(this.latestValues) || g) && (a(this.instance, y), this.shouldResetTransform = !1, this.scheduleRender());
    }
    measure(c = !0) {
      const p = this.measurePageBox();
      let m = this.removeElementScroll(p);
      return c && (m = this.removeTransform(m)), aA(m), {
        animationId: this.root.animationId,
        measuredBox: p,
        layoutBox: m,
        latestValues: {},
        source: this.id
      };
    }
    measurePageBox() {
      var y;
      const { visualElement: c } = this.options;
      if (!c)
        return Ue();
      const p = c.measureViewportBox();
      if (!(((y = this.scroll) == null ? void 0 : y.wasRoot) || this.path.some(lA))) {
        const { scroll: g } = this.root;
        g && (en(p.x, g.offset.x), en(p.y, g.offset.y));
      }
      return p;
    }
    removeElementScroll(c) {
      var m;
      const p = Ue();
      if (zt(p, c), (m = this.scroll) != null && m.wasRoot)
        return p;
      for (let y = 0; y < this.path.length; y++) {
        const g = this.path[y], { scroll: l, options: f } = g;
        g !== this.root && l && f.layoutScroll && (l.wasRoot && zt(p, c), en(p.x, l.offset.x), en(p.y, l.offset.y));
      }
      return p;
    }
    applyTransform(c, p = !1, m) {
      var g, l;
      const y = m || Ue();
      zt(y, c);
      for (let f = 0; f < this.path.length; f++) {
        const S = this.path[f];
        !p && S.options.layoutScroll && S.scroll && S !== S.root && (en(y.x, -S.scroll.offset.x), en(y.y, -S.scroll.offset.y)), mr(S.latestValues) && ma(y, S.latestValues, (g = S.layout) == null ? void 0 : g.layoutBox);
      }
      return mr(this.latestValues) && ma(y, this.latestValues, (l = this.layout) == null ? void 0 : l.layoutBox), y;
    }
    removeTransform(c) {
      var m;
      const p = Ue();
      zt(p, c);
      for (let y = 0; y < this.path.length; y++) {
        const g = this.path[y];
        if (!mr(g.latestValues))
          continue;
        let l;
        g.instance && (Uc(g.latestValues) && g.updateSnapshot(), l = Ue(), zt(l, g.measurePageBox())), wy(p, g.latestValues, (m = g.snapshot) == null ? void 0 : m.layoutBox, l);
      }
      return mr(this.latestValues) && wy(p, this.latestValues), p;
    }
    setTargetDelta(c) {
      this.targetDelta = c, this.root.scheduleUpdateProjection(), this.isProjectionDirty = !0;
    }
    setOptions(c) {
      this.options = {
        ...this.options,
        ...c,
        crossfade: c.crossfade !== void 0 ? c.crossfade : !0
      };
    }
    clearMeasurements() {
      this.scroll = void 0, this.layout = void 0, this.snapshot = void 0, this.prevTransformTemplateValue = void 0, this.targetDelta = void 0, this.target = void 0, this.isLayoutDirty = !1;
    }
    forceRelativeParentToResolveTarget() {
      this.relativeParent && this.relativeParent.resolvedRelativeTargetAt !== Ze.timestamp && this.relativeParent.resolveTargetDelta(!0);
    }
    resolveTargetDelta(c = !1) {
      var S;
      const p = this.getLead();
      this.isProjectionDirty || (this.isProjectionDirty = p.isProjectionDirty), this.isTransformDirty || (this.isTransformDirty = p.isTransformDirty), this.isSharedProjectionDirty || (this.isSharedProjectionDirty = p.isSharedProjectionDirty);
      const m = !!this.resumingFrom || this !== p;
      if (!(c || m && this.isSharedProjectionDirty || this.isProjectionDirty || (S = this.parent) != null && S.isProjectionDirty || this.attemptToResolveRelativeTarget || this.root.updateBlockedByResize))
        return;
      const { layout: g, layoutId: l } = this.options;
      if (!this.layout || !(g || l))
        return;
      this.resolvedRelativeTargetAt = Ze.timestamp;
      const f = this.getClosestProjectingParent();
      f && this.linkedParentVersion !== f.layoutVersion && !f.options.layoutRoot && this.removeRelativeTarget(), !this.targetDelta && !this.relativeTarget && (this.options.layoutAnchor !== !1 && f && f.layout ? this.createRelativeTarget(f, this.layout.layoutBox, f.layout.layoutBox) : this.removeRelativeTarget()), !(!this.relativeTarget && !this.targetDelta) && (this.target || (this.target = Ue(), this.targetWithTransforms = Ue()), this.relativeTarget && this.relativeTargetOrigin && this.relativeParent && this.relativeParent.target ? (this.forceRelativeParentToResolveTarget(), Ek(this.target, this.relativeTarget, this.relativeParent.target, this.options.layoutAnchor || void 0)) : this.targetDelta ? (this.resumingFrom ? this.applyTransform(this.layout.layoutBox, !1, this.target) : zt(this.target, this.layout.layoutBox), zv(this.target, this.targetDelta)) : zt(this.target, this.layout.layoutBox), this.attemptToResolveRelativeTarget && (this.attemptToResolveRelativeTarget = !1, this.options.layoutAnchor !== !1 && f && !!f.resumingFrom == !!this.resumingFrom && !f.options.layoutScroll && f.target && this.animationProgress !== 1 ? this.createRelativeTarget(f, this.target, f.target) : this.relativeParent = this.relativeTarget = void 0));
    }
    getClosestProjectingParent() {
      if (!(!this.parent || Uc(this.parent.latestValues) || Bv(this.parent.latestValues)))
        return this.parent.isProjecting() ? this.parent : this.parent.getClosestProjectingParent();
    }
    isProjecting() {
      return !!((this.relativeTarget || this.targetDelta || this.options.layoutRoot) && this.layout);
    }
    createRelativeTarget(c, p, m) {
      this.relativeParent = c, this.linkedParentVersion = c.layoutVersion, this.forceRelativeParentToResolveTarget(), this.relativeTarget = Ue(), this.relativeTargetOrigin = Ue(), Ra(this.relativeTargetOrigin, p, m, this.options.layoutAnchor || void 0), zt(this.relativeTarget, this.relativeTargetOrigin);
    }
    removeRelativeTarget() {
      this.relativeParent = this.relativeTarget = void 0;
    }
    calcProjection() {
      var x;
      const c = this.getLead(), p = !!this.resumingFrom || this !== c;
      let m = !0;
      if ((this.isProjectionDirty || (x = this.parent) != null && x.isProjectionDirty) && (m = !1), p && (this.isSharedProjectionDirty || this.isTransformDirty) && (m = !1), this.resolvedRelativeTargetAt === Ze.timestamp && (m = !1), m)
        return;
      const { layout: y, layoutId: g } = this.options;
      if (this.isTreeAnimating = !!(this.parent && this.parent.isTreeAnimating || this.currentAnimation || this.pendingAnimation), this.isTreeAnimating || (this.targetDelta = this.relativeTarget = void 0), !this.layout || !(y || g))
        return;
      zt(this.layoutCorrected, this.layout.layoutBox);
      const l = this.treeScale.x, f = this.treeScale.y;
      ok(this.layoutCorrected, this.treeScale, this.path, p), c.layout && !c.target && (this.treeScale.x !== 1 || this.treeScale.y !== 1) && (c.target = c.layout.layoutBox, c.targetWithTransforms = Ue());
      const { target: S } = c;
      if (!S) {
        this.prevProjectionDelta && (this.createProjectionDeltas(), this.scheduleRender());
        return;
      }
      !this.projectionDelta || !this.prevProjectionDelta ? this.createProjectionDeltas() : (my(this.prevProjectionDelta.x, this.projectionDelta.x), my(this.prevProjectionDelta.y, this.projectionDelta.y)), gi(this.projectionDelta, this.layoutCorrected, S, this.latestValues), (this.treeScale.x !== l || this.treeScale.y !== f || !Ay(this.projectionDelta.x, this.prevProjectionDelta.x) || !Ay(this.projectionDelta.y, this.prevProjectionDelta.y)) && (this.hasProjected = !0, this.scheduleRender(), this.notifyListeners("projectionUpdate", S));
    }
    hide() {
      this.isVisible = !1;
    }
    show() {
      this.isVisible = !0;
    }
    scheduleRender(c = !0) {
      var p;
      if ((p = this.options.visualElement) == null || p.scheduleRender(), c) {
        const m = this.getStack();
        m && m.scheduleRender();
      }
      this.resumingFrom && !this.resumingFrom.instance && (this.resumingFrom = void 0);
    }
    createProjectionDeltas() {
      this.prevProjectionDelta = uo(), this.projectionDelta = uo(), this.projectionDeltaWithTransform = uo();
    }
    setAnimationOrigin(c, p = !1, m) {
      const y = this.snapshot, g = y ? y.latestValues : {}, l = { ...this.latestValues }, f = uo();
      (!this.relativeParent || !this.relativeParent.options.layoutRoot) && (this.relativeTarget = this.relativeTargetOrigin = void 0), this.attemptToResolveRelativeTarget = !p;
      const S = Ue(), x = y ? y.source : void 0, k = this.layout ? this.layout.source : void 0, A = x !== k, T = this.getStack(), b = !T || T.members.length <= 1, E = !!(A && !b && this.options.crossfade === !0 && !this.path.some(iA));
      this.animationProgress = 0;
      let D;
      const O = m == null ? void 0 : m.interpolateProjection(c);
      this.mixTargetDelta = (H) => {
        const W = H / 1e3, G = O == null ? void 0 : O(W);
        G ? (f.x.translate = G.x, f.x.scale = ke(c.x.scale, 1, W), f.x.origin = c.x.origin, f.x.originPoint = c.x.originPoint, f.y.translate = G.y, f.y.scale = ke(c.y.scale, 1, W), f.y.origin = c.y.origin, f.y.originPoint = c.y.originPoint) : (Dy(f.x, c.x, W), Dy(f.y, c.y, W)), this.setTargetDelta(f), this.relativeTarget && this.relativeTargetOrigin && this.layout && this.relativeParent && this.relativeParent.layout && (Ra(S, this.layout.layoutBox, this.relativeParent.layout.layoutBox, this.options.layoutAnchor || void 0), oA(this.relativeTarget, this.relativeTargetOrigin, S, W), D && Nk(this.relativeTarget, D) && (this.isProjectionDirty = !1), D || (D = Ue()), zt(D, this.relativeTarget)), A && (this.animationValues = l, Fk(l, g, this.latestValues, W, E, b)), G && G.rotate !== void 0 && (this.animationValues || (this.animationValues = l), this.animationValues.pathRotation = G.rotate), this.root.scheduleUpdateProjection(), this.scheduleRender(), this.animationProgress = W;
      }, this.mixTargetDelta(this.options.layoutRoot ? 1e3 : 0);
    }
    startAnimation(c) {
      var p, m, y;
      this.notifyListeners("animationStart"), (p = this.currentAnimation) == null || p.stop(), (y = (m = this.resumingFrom) == null ? void 0 : m.currentAnimation) == null || y.stop(), this.pendingAnimation && (Xn(this.pendingAnimation), this.pendingAnimation = void 0), this.pendingAnimation = Ae.update(() => {
        ya.hasAnimatedSinceResize = !0, this.motionValue || (this.motionValue = ho(0)), this.motionValue.jump(0, !1), this.currentAnimation = Vk(this.motionValue, [0, 1e3], {
          ...c,
          velocity: 0,
          isSync: !0,
          onUpdate: (g) => {
            this.mixTargetDelta(g), c.onUpdate && c.onUpdate(g);
          },
          onStop: () => {
          },
          onComplete: () => {
            c.onComplete && c.onComplete(), this.completeAnimation();
          }
        }), this.resumingFrom && (this.resumingFrom.currentAnimation = this.currentAnimation), this.pendingAnimation = void 0;
      });
    }
    completeAnimation() {
      this.resumingFrom && (this.resumingFrom.currentAnimation = void 0, this.resumingFrom.preserveOpacity = void 0);
      const c = this.getStack();
      c && c.exitAnimationComplete(), this.resumingFrom = this.currentAnimation = this.animationValues = void 0, this.notifyListeners("animationComplete");
    }
    finishAnimation() {
      this.currentAnimation && (this.mixTargetDelta && this.mixTargetDelta(Hk), this.currentAnimation.stop()), this.completeAnimation();
    }
    applyTransformsToTarget() {
      const c = this.getLead();
      let { targetWithTransforms: p, target: m, layout: y, latestValues: g } = c;
      if (!(!p || !m || !y)) {
        if (this !== c && this.layout && y && i0(this.options.animationType, this.layout.layoutBox, y.layoutBox)) {
          m = this.target || Ue();
          const l = lt(this.layout.layoutBox.x);
          m.x.min = c.target.x.min, m.x.max = m.x.min + l;
          const f = lt(this.layout.layoutBox.y);
          m.y.min = c.target.y.min, m.y.max = m.y.min + f;
        }
        zt(p, m), ma(p, g), gi(this.projectionDeltaWithTransform, this.layoutCorrected, p, g);
      }
    }
    registerSharedNode(c, p) {
      this.sharedNodes.has(c) || this.sharedNodes.set(c, new Uk()), this.sharedNodes.get(c).add(p);
      const y = p.options.initialPromotionConfig;
      p.promote({
        transition: y ? y.transition : void 0,
        preserveFollowOpacity: y && y.shouldPreserveFollowOpacity ? y.shouldPreserveFollowOpacity(p) : void 0
      });
    }
    isLead() {
      const c = this.getStack();
      return c ? c.lead === this : !0;
    }
    getLead() {
      var p;
      const { layoutId: c } = this.options;
      return c ? ((p = this.getStack()) == null ? void 0 : p.lead) || this : this;
    }
    getPrevLead() {
      var p;
      const { layoutId: c } = this.options;
      return c ? (p = this.getStack()) == null ? void 0 : p.prevLead : void 0;
    }
    getStack() {
      const { layoutId: c } = this.options;
      if (c)
        return this.root.sharedNodes.get(c);
    }
    promote({ needsReset: c, transition: p, preserveFollowOpacity: m } = {}) {
      const y = this.getStack();
      y && y.promote(this, m), c && (this.projectionDelta = void 0, this.needsReset = !0), p && this.setOptions({ transition: p });
    }
    relegate() {
      const c = this.getStack();
      return c ? c.relegate(this) : !1;
    }
    resetSkewAndRotation() {
      const { visualElement: c } = this.options;
      if (!c)
        return;
      let p = !1;
      const { latestValues: m } = c;
      if ((m.z || m.rotate || m.rotateX || m.rotateY || m.rotateZ || m.skewX || m.skewY) && (p = !0), !p)
        return;
      const y = {};
      m.z && sc("z", c, y, this.animationValues);
      for (let g = 0; g < ic.length; g++)
        sc(`rotate${ic[g]}`, c, y, this.animationValues), sc(`skew${ic[g]}`, c, y, this.animationValues);
      c.render();
      for (const g in y)
        c.setStaticValue(g, y[g]), this.animationValues && (this.animationValues[g] = y[g]);
      c.scheduleRender();
    }
    applyProjectionStyles(c, p) {
      if (!this.instance || this.isSVG)
        return;
      if (!this.isVisible) {
        c.visibility = "hidden";
        return;
      }
      const m = this.getTransformTemplate();
      if (this.needsReset) {
        this.needsReset = !1, c.visibility = "", c.opacity = "", c.pointerEvents = ha(p == null ? void 0 : p.pointerEvents) || "", c.transform = m ? m(this.latestValues, "") : "none";
        return;
      }
      const y = this.getLead();
      if (!this.projectionDelta || !this.layout || !y.target) {
        this.options.layoutId && (c.opacity = this.latestValues.opacity !== void 0 ? this.latestValues.opacity : 1, c.pointerEvents = ha(p == null ? void 0 : p.pointerEvents) || ""), this.hasProjected && !mr(this.latestValues) && (c.transform = m ? m({}, "") : "none", this.hasProjected = !1);
        return;
      }
      c.visibility = "";
      const g = y.animationValues || y.latestValues;
      this.applyTransformsToTarget();
      let l = jk(this.projectionDeltaWithTransform, this.treeScale, g);
      m && (l = m(g, l)), c.transform = l;
      const { x: f, y: S } = this.projectionDelta;
      c.transformOrigin = `${f.origin * 100}% ${S.origin * 100}% 0`, y.animationValues ? c.opacity = y === this ? g.opacity ?? this.latestValues.opacity ?? 1 : this.preserveOpacity ? this.latestValues.opacity : g.opacityExit : c.opacity = y === this ? g.opacity !== void 0 ? g.opacity : "" : g.opacityExit !== void 0 ? g.opacityExit : 0;
      for (const x in Wc) {
        if (g[x] === void 0)
          continue;
        const { correct: k, applyTo: A, isCSSVariable: T } = Wc[x], b = l === "none" ? g[x] : k(g[x], y);
        if (A) {
          const E = A.length;
          for (let D = 0; D < E; D++)
            c[A[D]] = b;
        } else
          T ? this.options.visualElement.renderState.vars[x] = b : c[x] = b;
      }
      this.options.layoutId && (c.pointerEvents = y === this ? ha(p == null ? void 0 : p.pointerEvents) || "" : "none");
    }
    clearSnapshot() {
      this.resumeFrom = this.snapshot = void 0;
    }
    // Only run on root
    resetTree() {
      this.root.nodes.forEach((c) => {
        var p;
        return (p = c.currentAnimation) == null ? void 0 : p.stop();
      }), this.root.nodes.forEach(Ey), this.root.sharedNodes.clear();
    }
  };
}
function Gk(e) {
  e.updateLayout();
}
function Kk(e) {
  var o;
  const n = ((o = e.resumeFrom) == null ? void 0 : o.snapshot) || e.snapshot;
  if (e.isLead() && e.layout && n && e.hasListeners("didUpdate")) {
    const { layoutBox: i, measuredBox: a } = e.layout, { animationType: d } = e.options, c = n.source !== e.layout.source;
    if (d === "size")
      qt((l) => {
        const f = c ? n.measuredBox[l] : n.layoutBox[l], S = lt(f);
        f.min = i[l].min, f.max = f.min + S;
      });
    else if (d === "x" || d === "y") {
      const l = d === "x" ? "y" : "x";
      Gc(c ? n.measuredBox[l] : n.layoutBox[l], i[l]);
    } else i0(d, n.layoutBox, i) && qt((l) => {
      const f = c ? n.measuredBox[l] : n.layoutBox[l], S = lt(i[l]);
      f.max = f.min + S, e.relativeTarget && !e.currentAnimation && (e.isProjectionDirty = !0, e.relativeTarget[l].max = e.relativeTarget[l].min + S);
    });
    const p = uo();
    gi(p, i, n.layoutBox);
    const m = uo();
    c ? gi(m, e.applyTransform(a, !0), n.measuredBox) : gi(m, i, n.layoutBox);
    const y = !qv(p);
    let g = !1;
    if (!e.resumeFrom) {
      const l = e.getClosestProjectingParent();
      if (l && !l.resumeFrom) {
        const { snapshot: f, layout: S } = l;
        if (f && S) {
          const x = e.options.layoutAnchor || void 0, k = Ue();
          Ra(k, n.layoutBox, f.layoutBox, x);
          const A = Ue();
          Ra(A, i, S.layoutBox, x), e0(k, A) || (g = !0), l.options.layoutRoot && (e.relativeTarget = A, e.relativeTargetOrigin = k, e.relativeParent = l);
        }
      }
    }
    e.notifyListeners("didUpdate", {
      layout: i,
      snapshot: n,
      delta: m,
      layoutDelta: p,
      hasLayoutChanged: y,
      hasRelativeLayoutChanged: g
    });
  } else if (e.isLead()) {
    const { onExitComplete: i } = e.options;
    i && i();
  }
  e.options.transition = void 0;
}
function Yk(e) {
  e.parent && (e.isProjecting() || (e.isProjectionDirty = e.parent.isProjectionDirty), e.isSharedProjectionDirty || (e.isSharedProjectionDirty = !!(e.isProjectionDirty || e.parent.isProjectionDirty || e.parent.isSharedProjectionDirty)), e.isTransformDirty || (e.isTransformDirty = e.parent.isTransformDirty));
}
function Qk(e) {
  e.isProjectionDirty = e.isSharedProjectionDirty = e.isTransformDirty = !1;
}
function Xk(e) {
  e.clearSnapshot();
}
function Ey(e) {
  e.clearMeasurements();
}
function Zk(e) {
  e.isLayoutDirty = !0, e.updateLayout();
}
function My(e) {
  e.isLayoutDirty = !1;
}
function Jk(e) {
  e.isAnimationBlocked && e.layout && !e.isLayoutDirty && (e.snapshot = e.layout, e.isLayoutDirty = !0);
}
function qk(e) {
  const { visualElement: n } = e.options;
  n && n.getProps().onBeforeLayoutMeasure && n.notify("BeforeLayoutMeasure"), e.resetTransform();
}
function Ry(e) {
  e.finishAnimation(), e.targetDelta = e.relativeTarget = e.target = void 0, e.isProjectionDirty = !0;
}
function eA(e) {
  e.resolveTargetDelta();
}
function tA(e) {
  e.calcProjection();
}
function nA(e) {
  e.resetSkewAndRotation();
}
function rA(e) {
  e.removeLeadSnapshot();
}
function Dy(e, n, o) {
  e.translate = ke(n.translate, 0, o), e.scale = ke(n.scale, 1, o), e.origin = n.origin, e.originPoint = n.originPoint;
}
function Ny(e, n, o, i) {
  e.min = ke(n.min, o.min, i), e.max = ke(n.max, o.max, i);
}
function oA(e, n, o, i) {
  Ny(e.x, n.x, o.x, i), Ny(e.y, n.y, o.y, i);
}
function iA(e) {
  return e.animationValues && e.animationValues.opacityExit !== void 0;
}
const sA = {
  duration: 0.45,
  ease: [0.4, 0, 0.1, 1]
}, jy = (e) => typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().includes(e), Iy = jy("applewebkit/") && !jy("chrome/") ? Math.round : Nt;
function Fy(e) {
  e.min = Iy(e.min), e.max = Iy(e.max);
}
function aA(e) {
  Fy(e.x), Fy(e.y);
}
function i0(e, n, o) {
  return e === "position" || e === "preserve-aspect" && !Pk(ky(n), ky(o), 0.2);
}
function lA(e) {
  var n;
  return e !== e.root && ((n = e.scroll) == null ? void 0 : n.wasRoot);
}
const uA = o0({
  attachResizeListener: (e, n) => ki(e, "resize", n),
  measureScroll: () => {
    var e, n;
    return {
      x: document.documentElement.scrollLeft || ((e = document.body) == null ? void 0 : e.scrollLeft) || 0,
      y: document.documentElement.scrollTop || ((n = document.body) == null ? void 0 : n.scrollTop) || 0
    };
  },
  checkIsScrollRoot: () => !0
}), ac = {
  current: void 0
}, s0 = o0({
  measureScroll: (e) => ({
    x: e.scrollLeft,
    y: e.scrollTop
  }),
  defaultParent: () => {
    if (!ac.current) {
      const e = new uA({});
      e.mount(window), e.setOptions({ layoutScroll: !0 }), ac.current = e;
    }
    return ac.current;
  },
  resetTransform: (e, n) => {
    e.style.transform = n !== void 0 ? n : "none";
  },
  checkIsScrollRoot: (e) => window.getComputedStyle(e).position === "fixed"
}), Yd = C.createContext({
  transformPagePoint: (e) => e,
  isStatic: !1,
  reducedMotion: "never"
});
function Oy(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function cA(...e) {
  return (n) => {
    let o = !1;
    const i = e.map((a) => {
      const d = Oy(a, n);
      return !o && typeof d == "function" && (o = !0), d;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const d = i[a];
          typeof d == "function" ? d() : Oy(e[a], null);
        }
      };
  };
}
function dA(...e) {
  return C.useCallback(cA(...e), e);
}
class fA extends C.Component {
  getSnapshotBeforeUpdate(n) {
    const o = this.props.childRef.current;
    if (ca(o) && n.isPresent && !this.props.isPresent && this.props.pop !== !1) {
      const i = o.offsetParent, a = ca(i) && i.offsetWidth || 0, d = ca(i) && i.offsetHeight || 0, c = getComputedStyle(o), p = this.props.sizeRef.current;
      p.height = parseFloat(c.height), p.width = parseFloat(c.width), p.top = o.offsetTop, p.left = o.offsetLeft, p.right = a - p.width - p.left, p.bottom = d - p.height - p.top, p.direction = c.direction;
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
function pA({ children: e, isPresent: n, anchorX: o, anchorY: i, root: a, pop: d }) {
  var f;
  const c = C.useId(), p = C.useRef(null), m = C.useRef({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    direction: "ltr"
  }), { nonce: y } = C.useContext(Yd), g = ((f = e.props) == null ? void 0 : f.ref) ?? (e == null ? void 0 : e.ref), l = dA(p, g);
  return C.useInsertionEffect(() => {
    const { width: S, height: x, top: k, left: A, right: T, bottom: b, direction: E } = m.current;
    if (n || d === !1 || !p.current || !S || !x)
      return;
    const D = E === "rtl", O = o === "left" ? D ? `right: ${T}` : `left: ${A}` : D ? `left: ${A}` : `right: ${T}`, H = i === "bottom" ? `bottom: ${b}` : `top: ${k}`;
    p.current.dataset.motionPopId = c;
    const W = document.createElement("style");
    y && (W.nonce = y);
    const G = a ?? document.head;
    return G.appendChild(W), W.sheet && W.sheet.insertRule(`
          [data-motion-pop-id="${c}"] {
            position: absolute !important;
            width: ${S}px !important;
            height: ${x}px !important;
            ${O}px !important;
            ${H}px !important;
          }
        `), () => {
      var K;
      (K = p.current) == null || K.removeAttribute("data-motion-pop-id"), G.contains(W) && G.removeChild(W);
    };
  }, [n]), w.jsx(fA, { isPresent: n, childRef: p, sizeRef: m, pop: d, children: d === !1 ? e : C.cloneElement(e, { ref: l }) });
}
const mA = ({ children: e, initial: n, isPresent: o, onExitComplete: i, custom: a, presenceAffectsLayout: d, mode: c, anchorX: p, anchorY: m, root: y }) => {
  const g = Ad(hA), l = C.useId();
  let f = !0, S = C.useMemo(() => (f = !1, {
    id: l,
    initial: n,
    isPresent: o,
    custom: a,
    onExitComplete: (x) => {
      g.set(x, !0);
      for (const k of g.values())
        if (!k)
          return;
      i && i();
    },
    register: (x) => (g.set(x, !1), () => g.delete(x))
  }), [o, g, i]);
  return d && f && (S = { ...S }), C.useMemo(() => {
    g.forEach((x, k) => g.set(k, !1));
  }, [o]), C.useEffect(() => {
    !o && !g.size && i && i();
  }, [o]), e = w.jsx(pA, { pop: c === "popLayout", isPresent: o, anchorX: p, anchorY: m, root: y, children: e }), w.jsx(za.Provider, { value: S, children: e });
};
function hA() {
  return /* @__PURE__ */ new Map();
}
function a0(e = !0) {
  const n = C.useContext(za);
  if (n === null)
    return [!0, null];
  const { isPresent: o, onExitComplete: i, register: a } = n, d = C.useId();
  C.useEffect(() => {
    if (e)
      return a(d);
  }, [e]);
  const c = C.useCallback(() => e && i && i(d), [d, i, e]);
  return !o && i ? [!1, c] : [!0];
}
const Qs = (e) => e.key || "";
function Ly(e) {
  const n = [];
  return C.Children.forEach(e, (o) => {
    C.isValidElement(o) && n.push(o);
  }), n;
}
const Wa = ({ children: e, custom: n, initial: o = !0, onExitComplete: i, presenceAffectsLayout: a = !0, mode: d = "sync", propagate: c = !1, anchorX: p = "left", anchorY: m = "top", root: y }) => {
  const [g, l] = a0(c), f = C.useMemo(() => Ly(e), [e]), S = c && !g ? [] : f.map(Qs), x = C.useRef(!0), k = C.useRef(f), A = Ad(() => /* @__PURE__ */ new Map()), T = C.useRef(/* @__PURE__ */ new Set()), [b, E] = C.useState(f), [D, O] = C.useState(f);
  Ig(() => {
    x.current = !1, k.current = f;
    for (let G = 0; G < D.length; G++) {
      const K = Qs(D[G]);
      S.includes(K) ? (A.delete(K), T.current.delete(K)) : A.get(K) !== !0 && A.set(K, !1);
    }
  }, [D, S.length, S.join("-")]);
  const H = [];
  if (f !== b) {
    let G = [...f];
    for (let K = 0; K < D.length; K++) {
      const X = D[K], se = Qs(X);
      S.includes(se) || (G.splice(K, 0, X), H.push(X));
    }
    return d === "wait" && H.length && (G = H), O(Ly(G)), E(f), null;
  }
  const { forceRender: W } = C.useContext(kd);
  return w.jsx(w.Fragment, { children: D.map((G) => {
    const K = Qs(G), X = c && !g ? !1 : f === D || S.includes(K), se = () => {
      if (T.current.has(K))
        return;
      if (A.has(K))
        T.current.add(K), A.set(K, !0);
      else
        return;
      let Z = !0;
      A.forEach((de) => {
        de || (Z = !1);
      }), Z && (W == null || W(), O(k.current), c && (l == null || l()), i && i());
    };
    return w.jsx(mA, { isPresent: X, initial: !x.current || o ? void 0 : !1, custom: n, presenceAffectsLayout: a, mode: d, root: y, onExitComplete: X ? void 0 : se, anchorX: p, anchorY: m, children: G }, K);
  }) });
}, l0 = C.createContext({ strict: !1 }), Vy = {
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
let By = !1;
function yA() {
  if (By)
    return;
  const e = {};
  for (const n in Vy)
    e[n] = {
      isEnabled: (o) => Vy[n].some((i) => !!o[i])
    };
  Ov(e), By = !0;
}
function u0() {
  return yA(), ek();
}
function gA(e) {
  const n = u0();
  for (const o in e)
    n[o] = {
      ...n[o],
      ...e[o]
    };
  Ov(n);
}
const vA = /* @__PURE__ */ new Set([
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
function Da(e) {
  return e.startsWith("while") || e.startsWith("drag") && e !== "draggable" || e.startsWith("layout") || e.startsWith("onTap") || e.startsWith("onPan") || e.startsWith("onLayout") || vA.has(e);
}
let c0 = (e) => !Da(e);
function SA(e) {
  typeof e == "function" && (c0 = (n) => n.startsWith("on") ? !Da(n) : e(n));
}
try {
  SA(require("@emotion/is-prop-valid").default);
} catch {
}
function wA(e, n, o) {
  const i = {};
  for (const a in e)
    a === "values" && typeof e.values == "object" || Je(e[a]) || (c0(a) || o === !0 && Da(a) || !n && !Da(a) || // If trying to use native HTML drag events, forward drag listeners
    e.draggable && a.startsWith("onDrag")) && (i[a] = e[a]);
  return i;
}
const Ga = /* @__PURE__ */ C.createContext({});
function xA(e, n) {
  if (Ha(e)) {
    const { initial: o, animate: i } = e;
    return {
      initial: o === !1 || Ti(o) ? o : void 0,
      animate: Ti(i) ? i : void 0
    };
  }
  return e.inherit !== !1 ? n : {};
}
function _A(e) {
  const { initial: n, animate: o } = xA(e, C.useContext(Ga));
  return C.useMemo(() => ({ initial: n, animate: o }), [zy(n), zy(o)]);
}
function zy(e) {
  return Array.isArray(e) ? e.join(" ") : e;
}
const Qd = () => ({
  style: {},
  transform: {},
  transformOrigin: {},
  vars: {}
});
function d0(e, n, o) {
  for (const i in n)
    !Je(n[i]) && !Hv(i, o) && (e[i] = n[i]);
}
function TA({ transformTemplate: e }, n) {
  return C.useMemo(() => {
    const o = Qd();
    return Gd(o, n, e), Object.assign({}, o.vars, o.style);
  }, [n]);
}
function kA(e, n) {
  const o = e.style || {}, i = {};
  return d0(i, o, e), Object.assign(i, TA(e, n)), i;
}
function AA(e, n) {
  const o = {}, i = kA(e, n);
  return e.drag && e.dragListener !== !1 && (o.draggable = !1, i.userSelect = i.WebkitUserSelect = i.WebkitTouchCallout = "none", i.touchAction = e.drag === !0 ? "none" : `pan-${e.drag === "x" ? "y" : "x"}`), e.tabIndex === void 0 && (e.onTap || e.onTapStart || e.whileTap) && (o.tabIndex = 0), o.style = i, o;
}
const f0 = () => ({
  ...Qd(),
  attrs: {}
});
function CA(e, n, o, i) {
  const a = C.useMemo(() => {
    const d = f0();
    return Wv(d, n, Kv(i), e.transformTemplate, e.style), {
      ...d.attrs,
      style: { ...d.style }
    };
  }, [n]);
  if (e.style) {
    const d = {};
    d0(d, e.style, e), a.style = { ...d, ...a.style };
  }
  return a;
}
const bA = [
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
function Xd(e) {
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
      !!(bA.indexOf(e) > -1 || /**
       * If it contains a capital letter, it's an SVG component
       */
      /[A-Z]/u.test(e))
    )
  );
}
function PA(e, n, o, { latestValues: i }, a, d = !1, c) {
  const m = (c ?? Xd(e) ? CA : AA)(n, i, a, e), y = wA(n, typeof e == "string", d), g = e !== C.Fragment ? { ...y, ...m, ref: o } : {}, { children: l } = n, f = C.useMemo(() => Je(l) ? l.get() : l, [l]);
  return C.createElement(e, {
    ...g,
    children: f
  });
}
function EA({ scrapeMotionValuesFromProps: e, createRenderState: n }, o, i, a) {
  return {
    latestValues: MA(o, i, a, e),
    renderState: n()
  };
}
function MA(e, n, o, i) {
  const a = {}, d = i(e, {});
  for (const f in d)
    a[f] = ha(d[f]);
  let { initial: c, animate: p } = e;
  const m = Ha(e), y = Iv(e);
  n && y && !m && e.inherit !== !1 && (c === void 0 && (c = n.initial), p === void 0 && (p = n.animate));
  let g = o ? o.initial === !1 : !1;
  g = g || c === !1;
  const l = g ? p : c;
  if (l && typeof l != "boolean" && !Ua(l)) {
    const f = Array.isArray(l) ? l : [l];
    for (let S = 0; S < f.length; S++) {
      const x = Vd(e, f[S]);
      if (x) {
        const { transitionEnd: k, transition: A, ...T } = x;
        for (const b in T) {
          let E = T[b];
          if (Array.isArray(E)) {
            const D = g ? E.length - 1 : 0;
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
const p0 = (e) => (n, o) => {
  const i = C.useContext(Ga), a = C.useContext(za), d = () => EA(e, n, i, a);
  return o ? d() : Ad(d);
}, RA = /* @__PURE__ */ p0({
  scrapeMotionValuesFromProps: Kd,
  createRenderState: Qd
}), DA = /* @__PURE__ */ p0({
  scrapeMotionValuesFromProps: Yv,
  createRenderState: f0
}), NA = Symbol.for("motionComponentSymbol");
function jA(e, n, o) {
  const i = C.useRef(o);
  C.useInsertionEffect(() => {
    i.current = o;
  });
  const a = C.useRef(null);
  return C.useCallback((d) => {
    var p;
    d && ((p = e.onMount) == null || p.call(e, d)), n && (d ? n.mount(d) : n.unmount());
    const c = i.current;
    if (typeof c == "function")
      if (d) {
        const m = c(d);
        typeof m == "function" && (a.current = m);
      } else a.current ? (a.current(), a.current = null) : c(d);
    else c && (c.current = d);
  }, [n]);
}
const m0 = C.createContext({});
function io(e) {
  return e && typeof e == "object" && Object.prototype.hasOwnProperty.call(e, "current");
}
function IA(e, n, o, i, a, d) {
  var E, D;
  const { visualElement: c } = C.useContext(Ga), p = C.useContext(l0), m = C.useContext(za), y = C.useContext(Yd), g = y.reducedMotion, l = y.skipAnimations, f = C.useRef(null), S = C.useRef(!1);
  i = i || p.renderer, !f.current && i && (f.current = i(e, {
    visualState: n,
    parent: c,
    props: o,
    presenceContext: m,
    blockInitialAnimation: m ? m.initial === !1 : !1,
    reducedMotionConfig: g,
    skipAnimations: l,
    isSVG: d
  }), S.current && f.current && (f.current.manuallyAnimateOnMount = !0));
  const x = f.current, k = C.useContext(m0);
  x && !x.projection && a && (x.type === "html" || x.type === "svg") && FA(f.current, o, a, k);
  const A = C.useRef(!1);
  C.useInsertionEffect(() => {
    x && A.current && x.update(o, m);
  });
  const T = o[Tv], b = C.useRef(!!T && typeof window < "u" && !((E = window.MotionHandoffIsComplete) != null && E.call(window, T)) && ((D = window.MotionHasOptimisedAnimation) == null ? void 0 : D.call(window, T)));
  return Ig(() => {
    S.current = !0, x && (A.current = !0, window.MotionIsMounted = !0, x.updateFeatures(), x.scheduleRenderMicrotask(), b.current && x.animationState && x.animationState.animateChanges());
  }), C.useEffect(() => {
    x && (!b.current && x.animationState && x.animationState.animateChanges(), b.current && (queueMicrotask(() => {
      var O;
      (O = window.MotionHandoffMarkAsComplete) == null || O.call(window, T);
    }), b.current = !1), x.enteringChildren = void 0);
  }), x;
}
function FA(e, n, o, i) {
  const { layoutId: a, layout: d, drag: c, dragConstraints: p, layoutScroll: m, layoutRoot: y, layoutAnchor: g, layoutCrossfade: l } = n;
  e.projection = new o(e.latestValues, n["data-framer-portal-id"] ? void 0 : h0(e.parent)), e.projection.setOptions({
    layoutId: a,
    layout: d,
    alwaysMeasureLayout: !!c || p && io(p),
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
    layoutAnchor: g
  });
}
function h0(e) {
  if (e)
    return e.options.allowProjection !== !1 ? e.projection : h0(e.parent);
}
function lc(e, { forwardMotionProps: n = !1, type: o } = {}, i, a) {
  i && gA(i);
  const d = o ? o === "svg" : Xd(e), c = d ? DA : RA;
  function p(y, g) {
    let l;
    const f = {
      ...C.useContext(Yd),
      ...y,
      layoutId: OA(y)
    }, { isStatic: S } = f, x = _A(y), k = c(y, S);
    if (!S && typeof window < "u") {
      LA();
      const A = VA(f);
      l = A.MeasureLayout, x.visualElement = IA(e, k, f, a, A.ProjectionNode, d);
    }
    return w.jsxs(Ga.Provider, { value: x, children: [l && x.visualElement ? w.jsx(l, { visualElement: x.visualElement, ...f }) : null, PA(e, y, jA(k, x.visualElement, g), k, S, n, d)] });
  }
  p.displayName = `motion.${typeof e == "string" ? e : `create(${e.displayName ?? e.name ?? ""})`}`;
  const m = C.forwardRef(p);
  return m[NA] = e, m;
}
function OA({ layoutId: e }) {
  const n = C.useContext(kd).id;
  return n && e !== void 0 ? n + "-" + e : e;
}
function LA(e, n) {
  C.useContext(l0).strict;
}
function VA(e) {
  const n = u0(), { drag: o, layout: i } = n;
  if (!o && !i)
    return {};
  const a = { ...o, ...i };
  return {
    MeasureLayout: o != null && o.isEnabled(e) || i != null && i.isEnabled(e) ? a.MeasureLayout : void 0,
    ProjectionNode: a.ProjectionNode
  };
}
function BA(e, n) {
  if (typeof Proxy > "u")
    return lc;
  const o = /* @__PURE__ */ new Map(), i = (d, c) => lc(d, c, e, n), a = (d, c) => i(d, c);
  return new Proxy(a, {
    /**
     * Called when `motion` is referenced with a prop: `motion.div`, `motion.input` etc.
     * The prop name is passed through as `key` and we can use that to generate a `motion`
     * DOM component with that name.
     */
    get: (d, c) => c === "create" ? i : (o.has(c) || o.set(c, lc(c, void 0, e, n)), o.get(c))
  });
}
const zA = (e, n) => n.isSVG ?? Xd(e) ? new gk(n) : new dk(n, {
  allowProjection: e !== C.Fragment
});
class $A extends qn {
  /**
   * We dynamically generate the AnimationState manager as it contains a reference
   * to the underlying animation library. We only want to load that if we load this,
   * so people can optionally code split it out using the `m` component.
   */
  constructor(n) {
    super(n), n.animationState || (n.animationState = _k(n));
  }
  updateAnimationControlsSubscription() {
    const { animate: n } = this.node.getProps();
    Ua(n) && (this.unmountControls = n.subscribe(this.node));
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
let UA = 0;
class HA extends qn {
  constructor() {
    super(...arguments), this.id = UA++, this.isExitComplete = !1;
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
        const { initial: c, custom: p } = this.node.getProps();
        if (typeof c == "string" || typeof c == "object" && c !== null && !Array.isArray(c)) {
          const m = Tr(this.node, c, p);
          if (m) {
            const { transition: y, transitionEnd: g, ...l } = m;
            for (const f in l)
              (d = this.node.getValue(f)) == null || d.jump(l[f]);
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
const WA = {
  animation: {
    Feature: $A
  },
  exit: {
    Feature: HA
  }
};
function Di(e) {
  return {
    point: {
      x: e.pageX,
      y: e.pageY
    }
  };
}
const GA = (e) => (n) => $d(n) && e(n, Di(n));
function vi(e, n, o, i) {
  return ki(e, n, GA(o), i);
}
const y0 = ({ current: e }) => e ? e.ownerDocument.defaultView : null, $y = (e, n) => Math.abs(e - n);
function KA(e, n) {
  const o = $y(e.x, n.x), i = $y(e.y, n.y);
  return Math.sqrt(o ** 2 + i ** 2);
}
const Uy = /* @__PURE__ */ new Set(["auto", "scroll"]);
class g0 {
  constructor(n, o, { transformPagePoint: i, contextWindow: a = window, dragSnapToOrigin: d = !1, distanceThreshold: c = 3, element: p } = {}) {
    if (this.startEvent = null, this.lastMoveEvent = null, this.lastMoveEventInfo = null, this.lastRawMoveEventInfo = null, this.handlers = {}, this.contextWindow = window, this.scrollPositions = /* @__PURE__ */ new Map(), this.removeScrollListeners = null, this.onElementScroll = (S) => {
      this.handleScroll(S.target);
    }, this.onWindowScroll = () => {
      this.handleScroll(window);
    }, this.updatePoint = () => {
      if (!(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      this.lastRawMoveEventInfo && (this.lastMoveEventInfo = Xs(this.lastRawMoveEventInfo, this.transformPagePoint));
      const S = uc(this.lastMoveEventInfo, this.history), x = this.startEvent !== null, k = KA(S.offset, { x: 0, y: 0 }) >= this.distanceThreshold;
      if (!x && !k)
        return;
      const { point: A } = S, { timestamp: T } = Ze;
      this.history.push({ ...A, timestamp: T });
      const { onStart: b, onMove: E } = this.handlers;
      x || (b && b(this.lastMoveEvent, S), this.startEvent = this.lastMoveEvent), E && E(this.lastMoveEvent, S);
    }, this.handlePointerMove = (S, x) => {
      this.lastMoveEvent = S, this.lastRawMoveEventInfo = x, this.lastMoveEventInfo = Xs(x, this.transformPagePoint), Ae.update(this.updatePoint, !0);
    }, this.handlePointerUp = (S, x) => {
      this.end();
      const { onEnd: k, onSessionEnd: A, resumeAnimation: T } = this.handlers;
      if ((this.dragSnapToOrigin || !this.startEvent) && T && T(), !(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      const b = uc(S.type === "pointercancel" ? this.lastMoveEventInfo : Xs(x, this.transformPagePoint), this.history);
      this.startEvent && k && k(S, b), A && A(S, b);
    }, !$d(n))
      return;
    this.dragSnapToOrigin = d, this.handlers = o, this.transformPagePoint = i, this.distanceThreshold = c, this.contextWindow = a || window;
    const m = Di(n), y = Xs(m, this.transformPagePoint), { point: g } = y, { timestamp: l } = Ze;
    this.history = [{ ...g, timestamp: l }];
    const { onSessionStart: f } = o;
    f && f(n, uc(y, this.history)), this.removeListeners = Ei(vi(this.contextWindow, "pointermove", this.handlePointerMove), vi(this.contextWindow, "pointerup", this.handlePointerUp), vi(this.contextWindow, "pointercancel", this.handlePointerUp)), p && this.startScrollTracking(p);
  }
  /**
   * Start tracking scroll on ancestors and window.
   */
  startScrollTracking(n) {
    let o = n.parentElement;
    for (; o; ) {
      const i = getComputedStyle(o);
      (Uy.has(i.overflowX) || Uy.has(i.overflowY)) && this.scrollPositions.set(o, {
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
    d.x === 0 && d.y === 0 || (i ? this.lastMoveEventInfo && (this.lastMoveEventInfo.point.x += d.x, this.lastMoveEventInfo.point.y += d.y) : this.history.length > 0 && (this.history[0].x -= d.x, this.history[0].y -= d.y), this.scrollPositions.set(n, a), Ae.update(this.updatePoint, !0));
  }
  updateHandlers(n) {
    this.handlers = n;
  }
  end() {
    this.removeListeners && this.removeListeners(), this.removeScrollListeners && this.removeScrollListeners(), this.scrollPositions.clear(), Xn(this.updatePoint);
  }
}
function Xs(e, n) {
  return n ? { point: n(e.point) } : e;
}
function Hy(e, n) {
  return { x: e.x - n.x, y: e.y - n.y };
}
function uc({ point: e }, n) {
  return {
    point: e,
    delta: Hy(e, v0(n)),
    offset: Hy(e, YA(n)),
    velocity: QA(n, 0.1)
  };
}
function YA(e) {
  return e[0];
}
function v0(e) {
  return e[e.length - 1];
}
function QA(e, n) {
  if (e.length < 2)
    return { x: 0, y: 0 };
  let o = e.length - 1, i = null;
  const a = v0(e);
  for (; o >= 0 && (i = e[o], !(a.timestamp - i.timestamp > /* @__PURE__ */ yt(n))); )
    o--;
  if (!i)
    return { x: 0, y: 0 };
  i === e[0] && e.length > 2 && a.timestamp - i.timestamp > /* @__PURE__ */ yt(n) * 2 && (i = e[1]);
  const d = /* @__PURE__ */ Dt(a.timestamp - i.timestamp);
  if (d === 0)
    return { x: 0, y: 0 };
  const c = {
    x: (a.x - i.x) / d,
    y: (a.y - i.y) / d
  };
  return c.x === 1 / 0 && (c.x = 0), c.y === 1 / 0 && (c.y = 0), c;
}
function XA(e, { min: n, max: o }, i) {
  return n !== void 0 && e < n ? e = i ? ke(n, e, i.min) : Math.max(e, n) : o !== void 0 && e > o && (e = i ? ke(o, e, i.max) : Math.min(e, o)), e;
}
function Wy(e, n, o) {
  return {
    min: n !== void 0 ? e.min + n : void 0,
    max: o !== void 0 ? e.max + o - (e.max - e.min) : void 0
  };
}
function ZA(e, { top: n, left: o, bottom: i, right: a }) {
  return {
    x: Wy(e.x, o, a),
    y: Wy(e.y, n, i)
  };
}
function Gy(e, n) {
  let o = n.min - e.min, i = n.max - e.max;
  return n.max - n.min < e.max - e.min && ([o, i] = [i, o]), { min: o, max: i };
}
function JA(e, n) {
  return {
    x: Gy(e.x, n.x),
    y: Gy(e.y, n.y)
  };
}
function qA(e, n) {
  let o = 0.5;
  const i = lt(e), a = lt(n);
  return a > i ? o = /* @__PURE__ */ xi(n.min, n.max - i, e.min) : i > a && (o = /* @__PURE__ */ xi(e.min, e.max - a, n.min)), on(0, 1, o);
}
function eC(e, n) {
  const o = {};
  return n.min !== void 0 && (o.min = n.min - e.min), n.max !== void 0 && (o.max = n.max - e.min), o;
}
const Kc = 0.35;
function tC(e = Kc) {
  return e === !1 ? e = 0 : e === !0 && (e = Kc), {
    x: Ky(e, "left", "right"),
    y: Ky(e, "top", "bottom")
  };
}
function Ky(e, n, o) {
  return {
    min: Yy(e, n),
    max: Yy(e, o)
  };
}
function Yy(e, n) {
  return typeof e == "number" ? e : e[n] || 0;
}
const nC = /* @__PURE__ */ new WeakMap();
class rC {
  constructor(n) {
    this.openDragLock = null, this.isDragging = !1, this.currentDirection = null, this.originPoint = { x: 0, y: 0 }, this.constraints = !1, this.hasMutatedConstraints = !1, this.elastic = Ue(), this.latestPointerEvent = null, this.latestPanInfo = null, this.visualElement = n;
  }
  start(n, { snapToCursor: o = !1, distanceThreshold: i } = {}) {
    const { presenceContext: a } = this.visualElement;
    if (a && a.isPresent === !1)
      return;
    const d = (l) => {
      o && this.snapToCursor(Di(l).point), this.stopAnimation();
    }, c = (l, f) => {
      const { drag: S, dragPropagation: x, onDragStart: k } = this.getProps();
      if (S && !x && (this.openDragLock && this.openDragLock(), this.openDragLock = MT(S), !this.openDragLock))
        return;
      this.latestPointerEvent = l, this.latestPanInfo = f, this.isDragging = !0, this.currentDirection = null, this.resolveConstraints(), this.visualElement.projection && (this.visualElement.projection.isAnimationBlocked = !0, this.visualElement.projection.target = void 0), qt((T) => {
        let b = this.getAxisMotionValue(T).get() || 0;
        if (rn.test(b)) {
          const { projection: E } = this.visualElement;
          if (E && E.layout) {
            const D = E.layout.layoutBox[T];
            D && (b = lt(D) * (parseFloat(b) / 100));
          }
        }
        this.originPoint[T] = b;
      }), k && Ae.update(() => k(l, f), !1, !0), Oc(this.visualElement, "transform");
      const { animationState: A } = this.visualElement;
      A && A.setActive("whileDrag", !0);
    }, p = (l, f) => {
      this.latestPointerEvent = l, this.latestPanInfo = f;
      const { dragPropagation: S, dragDirectionLock: x, onDirectionLock: k, onDrag: A } = this.getProps();
      if (!S && !this.openDragLock)
        return;
      const { offset: T } = f;
      if (x && this.currentDirection === null) {
        this.currentDirection = iC(T), this.currentDirection !== null && k && k(this.currentDirection);
        return;
      }
      this.updateAxis("x", f.point, T), this.updateAxis("y", f.point, T), this.visualElement.render(), A && Ae.update(() => A(l, f), !1, !0);
    }, m = (l, f) => {
      this.latestPointerEvent = l, this.latestPanInfo = f, this.stop(l, f), this.latestPointerEvent = null, this.latestPanInfo = null;
    }, y = () => {
      const { dragSnapToOrigin: l } = this.getProps();
      (l || this.constraints) && this.startAnimation({ x: 0, y: 0 });
    }, { dragSnapToOrigin: g } = this.getProps();
    this.panSession = new g0(n, {
      onSessionStart: d,
      onStart: c,
      onMove: p,
      onSessionEnd: m,
      resumeAnimation: y
    }, {
      transformPagePoint: this.visualElement.getTransformPagePoint(),
      dragSnapToOrigin: g,
      distanceThreshold: i,
      contextWindow: y0(this.visualElement),
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
    const { velocity: c } = a;
    this.startAnimation(c);
    const { onDragEnd: p } = this.getProps();
    p && Ae.postRender(() => p(i, a));
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
    if (!i || !Zs(n, a, this.currentDirection))
      return;
    const d = this.getAxisMotionValue(n);
    let c = this.originPoint[n] + i[n];
    this.constraints && this.constraints[n] && (c = XA(c, this.constraints[n], this.elastic[n])), d.set(c);
  }
  resolveConstraints() {
    var d;
    const { dragConstraints: n, dragElastic: o } = this.getProps(), i = this.visualElement.projection && !this.visualElement.projection.layout ? this.visualElement.projection.measure(!1) : (d = this.visualElement.projection) == null ? void 0 : d.layout, a = this.constraints;
    n && io(n) ? this.constraints || (this.constraints = this.resolveRefConstraints()) : n && i ? this.constraints = ZA(i.layoutBox, n) : this.constraints = !1, this.elastic = tC(o), a !== this.constraints && !io(n) && i && this.constraints && !this.hasMutatedConstraints && qt((c) => {
      this.constraints !== !1 && this.getAxisMotionValue(c) && (this.constraints[c] = eC(i.layoutBox[c], this.constraints[c]));
    });
  }
  resolveRefConstraints() {
    const { dragConstraints: n, onMeasureDragConstraints: o } = this.getProps();
    if (!n || !io(n))
      return !1;
    const i = n.current;
    br(i !== null, "If `dragConstraints` is set as a React ref, that ref must be passed to another component's `ref` prop.", "drag-constraints-ref");
    const { projection: a } = this.visualElement;
    if (!a || !a.layout)
      return !1;
    a.root && (a.root.scroll = void 0, a.root.updateScroll());
    const d = ik(i, a.root, this.visualElement.getTransformPagePoint());
    let c = JA(a.layout.layoutBox, d);
    if (o) {
      const p = o(nk(c));
      this.hasMutatedConstraints = !!p, p && (c = Vv(p));
    }
    return c;
  }
  startAnimation(n) {
    const { drag: o, dragMomentum: i, dragElastic: a, dragTransition: d, dragSnapToOrigin: c, onDragTransitionEnd: p } = this.getProps(), m = this.constraints || {}, y = qt((g) => {
      if (!Zs(g, o, this.currentDirection))
        return;
      let l = m && m[g] || {};
      (c === !0 || c === g) && (l = { min: 0, max: 0 });
      const f = a ? 200 : 1e6, S = a ? 40 : 1e7, x = {
        type: "inertia",
        velocity: i ? n[g] : 0,
        bounceStiffness: f,
        bounceDamping: S,
        timeConstant: 750,
        restDelta: 1,
        restSpeed: 10,
        ...d,
        ...l
      };
      return this.startAxisValueAnimation(g, x);
    });
    return Promise.all(y).then(p);
  }
  startAxisValueAnimation(n, o) {
    const i = this.getAxisMotionValue(n);
    return Oc(this.visualElement, n), i.start(Ld(n, i, 0, o, this.visualElement, !1));
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
      if (!Zs(o, i, this.currentDirection))
        return;
      const { projection: a } = this.visualElement, d = this.getAxisMotionValue(o);
      if (a && a.layout) {
        const { min: c, max: p } = a.layout.layoutBox[o], m = d.get() || 0;
        d.set(n[o] - ke(c, p, 0.5) + m);
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
    if (!io(o) || !i || !this.constraints)
      return;
    this.stopAnimation();
    const a = { x: 0, y: 0 };
    qt((c) => {
      const p = this.getAxisMotionValue(c);
      if (p && this.constraints !== !1) {
        const m = p.get();
        a[c] = qA({ min: m, max: m }, this.constraints[c]);
      }
    });
    const { transformTemplate: d } = this.visualElement.getProps();
    this.visualElement.current.style.transform = d ? d({}, "") : "none", i.root && i.root.updateScroll(), i.updateLayout(), this.constraints = !1, this.resolveConstraints(), qt((c) => {
      if (!Zs(c, n, null))
        return;
      const p = this.getAxisMotionValue(c), { min: m, max: y } = this.constraints[c];
      p.set(ke(m, y, a[c]));
    }), this.visualElement.render();
  }
  addListeners() {
    if (!this.visualElement.current)
      return;
    nC.set(this.visualElement, this);
    const n = this.visualElement.current, o = vi(n, "pointerdown", (y) => {
      const { drag: g, dragListener: l = !0 } = this.getProps(), f = y.target, S = f !== n && FT(f);
      g && l && !S && this.start(y);
    });
    let i;
    const a = () => {
      const { dragConstraints: y } = this.getProps();
      io(y) && y.current && (this.constraints = this.resolveRefConstraints(), i || (i = oC(n, y.current, () => this.scalePositionWithinConstraints())));
    }, { projection: d } = this.visualElement, c = d.addEventListener("measure", a);
    d && !d.layout && (d.root && d.root.updateScroll(), d.updateLayout()), Ae.read(a);
    const p = ki(window, "resize", () => this.scalePositionWithinConstraints()), m = d.addEventListener("didUpdate", (({ delta: y, hasLayoutChanged: g }) => {
      this.isDragging && g && (qt((l) => {
        const f = this.getAxisMotionValue(l);
        f && (this.originPoint[l] += y[l].translate, f.set(f.get() + y[l].translate));
      }), this.visualElement.render());
    }));
    return () => {
      p(), o(), c(), m && m(), i && i();
    };
  }
  getProps() {
    const n = this.visualElement.getProps(), { drag: o = !1, dragDirectionLock: i = !1, dragPropagation: a = !1, dragConstraints: d = !1, dragElastic: c = Kc, dragMomentum: p = !0 } = n;
    return {
      ...n,
      drag: o,
      dragDirectionLock: i,
      dragPropagation: a,
      dragConstraints: d,
      dragElastic: c,
      dragMomentum: p
    };
  }
}
function Qy(e) {
  let n = !0;
  return () => {
    if (n) {
      n = !1;
      return;
    }
    e();
  };
}
function oC(e, n, o) {
  const i = ny(e, Qy(o)), a = ny(n, Qy(o));
  return () => {
    i(), a();
  };
}
function Zs(e, n, o) {
  return (n === !0 || n === e) && (o === null || o === e);
}
function iC(e, n = 10) {
  let o = null;
  return Math.abs(e.y) > n ? o = "y" : Math.abs(e.x) > n && (o = "x"), o;
}
class sC extends qn {
  constructor(n) {
    super(n), this.removeGroupControls = Nt, this.removeListeners = Nt, this.controls = new rC(n);
  }
  mount() {
    const { dragControls: n } = this.node.getProps();
    n && (this.removeGroupControls = n.subscribe(this.controls)), this.removeListeners = this.controls.addListeners() || Nt;
  }
  update() {
    const { dragControls: n } = this.node.getProps(), { dragControls: o } = this.node.prevProps || {};
    n !== o && (this.removeGroupControls(), n && (this.removeGroupControls = n.subscribe(this.controls)));
  }
  unmount() {
    this.removeGroupControls(), this.removeListeners(), this.controls.isDragging || this.controls.endPanSession();
  }
}
const cc = (e) => (n, o) => {
  e && Ae.update(() => e(n, o), !1, !0);
};
class aC extends qn {
  constructor() {
    super(...arguments), this.removePointerDownListener = Nt;
  }
  onPointerDown(n) {
    this.session = new g0(n, this.createPanHandlers(), {
      transformPagePoint: this.node.getTransformPagePoint(),
      contextWindow: y0(this.node)
    });
  }
  createPanHandlers() {
    const { onPanSessionStart: n, onPanStart: o, onPan: i, onPanEnd: a } = this.node.getProps();
    return {
      onSessionStart: cc(n),
      onStart: cc(o),
      onMove: cc(i),
      onEnd: (d, c) => {
        delete this.session, a && Ae.postRender(() => a(d, c));
      }
    };
  }
  mount() {
    this.removePointerDownListener = vi(this.node.current, "pointerdown", (n) => this.onPointerDown(n));
  }
  update() {
    this.session && this.session.updateHandlers(this.createPanHandlers());
  }
  unmount() {
    this.removePointerDownListener(), this.session && this.session.end();
  }
}
let dc = !1;
class lC extends C.Component {
  /**
   * This only mounts projection nodes for components that
   * need measuring, we might want to do it for all components
   * in order to incorporate transforms
   */
  componentDidMount() {
    const { visualElement: n, layoutGroup: o, switchLayoutGroup: i, layoutId: a } = this.props, { projection: d } = n;
    d && (o.group && o.group.add(d), i && i.register && a && i.register(d), dc && d.root.didUpdate(), d.addEventListener("animationComplete", () => {
      this.safeToRemove();
    }), d.setOptions({
      ...d.options,
      layoutDependency: this.props.layoutDependency,
      onExitComplete: () => this.safeToRemove()
    })), ya.hasEverUpdated = !0;
  }
  getSnapshotBeforeUpdate(n) {
    const { layoutDependency: o, visualElement: i, drag: a, isPresent: d } = this.props, { projection: c } = i;
    return c && (c.isPresent = d, n.layoutDependency !== o && c.setOptions({
      ...c.options,
      layoutDependency: o
    }), dc = !0, a || n.layoutDependency !== o || o === void 0 || n.isPresent !== d ? c.willUpdate() : this.safeToRemove(), n.isPresent !== d && (d ? c.promote() : c.relegate() || Ae.postRender(() => {
      const p = c.getStack();
      (!p || !p.members.length) && this.safeToRemove();
    }))), null;
  }
  componentDidUpdate() {
    const { visualElement: n, layoutAnchor: o } = this.props, { projection: i } = n;
    i && (i.options.layoutAnchor = o, i.root.didUpdate(), zd.postRender(() => {
      !i.currentAnimation && i.isLead() && this.safeToRemove();
    }));
  }
  componentWillUnmount() {
    const { visualElement: n, layoutGroup: o, switchLayoutGroup: i } = this.props, { projection: a } = n;
    dc = !0, a && (a.scheduleCheckAfterUnmount(), o && o.group && o.group.remove(a), i && i.deregister && i.deregister(a));
  }
  safeToRemove() {
    const { safeToRemove: n } = this.props;
    n && n();
  }
  render() {
    return null;
  }
}
function S0(e) {
  const [n, o] = a0(), i = C.useContext(kd);
  return w.jsx(lC, { ...e, layoutGroup: i, switchLayoutGroup: C.useContext(m0), isPresent: n, safeToRemove: o });
}
const uC = {
  pan: {
    Feature: aC
  },
  drag: {
    Feature: sC,
    ProjectionNode: s0,
    MeasureLayout: S0
  }
};
function Xy(e, n, o) {
  const { props: i } = e;
  e.animationState && i.whileHover && e.animationState.setActive("whileHover", o === "Start");
  const a = "onHover" + o, d = i[a];
  d && Ae.postRender(() => d(n, Di(n)));
}
class cC extends qn {
  mount() {
    const { current: n } = this.node;
    n && (this.unmount = DT(n, (o, i) => (Xy(this.node, i, "Start"), (a) => Xy(this.node, a, "End"))));
  }
  unmount() {
  }
}
class dC extends qn {
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
    this.unmount = Ei(ki(this.node.current, "focus", () => this.onFocus()), ki(this.node.current, "blur", () => this.onBlur()));
  }
  unmount() {
  }
}
function Zy(e, n, o) {
  const { props: i } = e;
  if (e.current instanceof HTMLButtonElement && e.current.disabled)
    return;
  e.animationState && i.whileTap && e.animationState.setActive("whileTap", o === "Start");
  const a = "onTap" + (o === "End" ? "" : o), d = i[a];
  d && Ae.postRender(() => d(n, Di(n)));
}
class fC extends qn {
  mount() {
    const { current: n } = this.node;
    if (!n)
      return;
    const { globalTapTarget: o, propagate: i } = this.node.props;
    this.unmount = LT(n, (a, d) => (Zy(this.node, d, "Start"), (c, { success: p }) => Zy(this.node, c, p ? "End" : "Cancel")), {
      useGlobalTarget: o,
      stopPropagation: (i == null ? void 0 : i.tap) === !1
    });
  }
  unmount() {
  }
}
const Yc = /* @__PURE__ */ new WeakMap(), fc = /* @__PURE__ */ new WeakMap(), pC = (e) => {
  const n = Yc.get(e.target);
  n && n(e);
}, mC = (e) => {
  e.forEach(pC);
};
function hC({ root: e, ...n }) {
  const o = e || document;
  fc.has(o) || fc.set(o, {});
  const i = fc.get(o), a = JSON.stringify(n);
  return i[a] || (i[a] = new IntersectionObserver(mC, { root: e, ...n })), i[a];
}
function yC(e, n, o) {
  const i = hC(n);
  return Yc.set(e, o), i.observe(e), () => {
    Yc.delete(e), i.unobserve(e);
  };
}
const gC = {
  some: 0,
  all: 1
};
class vC extends qn {
  constructor() {
    super(...arguments), this.hasEnteredView = !1, this.isInView = !1;
  }
  startObserver() {
    var m;
    (m = this.stopObserver) == null || m.call(this);
    const { viewport: n = {} } = this.node.getProps(), { root: o, margin: i, amount: a = "some", once: d } = n, c = {
      root: o ? o.current : void 0,
      rootMargin: i,
      threshold: typeof a == "number" ? a : gC[a]
    }, p = (y) => {
      const { isIntersecting: g } = y;
      if (this.isInView === g || (this.isInView = g, d && !g && this.hasEnteredView))
        return;
      g && (this.hasEnteredView = !0), this.node.animationState && this.node.animationState.setActive("whileInView", g);
      const { onViewportEnter: l, onViewportLeave: f } = this.node.getProps(), S = g ? l : f;
      S && S(y);
    };
    this.stopObserver = yC(this.node.current, c, p);
  }
  mount() {
    this.startObserver();
  }
  update() {
    if (typeof IntersectionObserver > "u")
      return;
    const { props: n, prevProps: o } = this.node;
    ["amount", "margin", "root"].some(SC(n, o)) && this.startObserver();
  }
  unmount() {
    var n;
    (n = this.stopObserver) == null || n.call(this), this.hasEnteredView = !1, this.isInView = !1;
  }
}
function SC({ viewport: e = {} }, { viewport: n = {} } = {}) {
  return (o) => e[o] !== n[o];
}
const wC = {
  inView: {
    Feature: vC
  },
  tap: {
    Feature: fC
  },
  focus: {
    Feature: dC
  },
  hover: {
    Feature: cC
  }
}, xC = {
  layout: {
    ProjectionNode: s0,
    MeasureLayout: S0
  }
}, _C = {
  ...WA,
  ...wC,
  ...uC,
  ...xC
}, vn = /* @__PURE__ */ BA(_C, zA);
function TC(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function w0(e) {
  const n = String(e || "").toLowerCase();
  return n === "127.0.0.1" || n === "localhost" || n === "::1" || n === "[::1]";
}
function Jy(e) {
  return w0(e) || TC(e);
}
function kC(e) {
  return !e || w0(e) ? "127.0.0.1" : e;
}
const AC = (() => {
  var g, l, f, S;
  const e = globalThis.window || globalThis, n = globalThis.document || {}, o = e.location || {}, i = String(e.SYNAPSE_DATA_API_PORT || ((l = (g = n.body) == null ? void 0 : g.dataset) == null ? void 0 : l.dataApiPort) || "3001").trim(), { protocol: a = "file:", hostname: d = "127.0.0.1", port: c = "" } = o, p = `http://${kC(d)}:${i || "3001"}`, m = String(e.SYNAPSE_DATA_API_BASE || ((S = (f = n.body) == null ? void 0 : f.dataset) == null ? void 0 : S.dataApiBase) || "").replace(/\/+$/, ""), y = `${a}//${o.host || (c ? `${d}:${c}` : d)}`.replace(/\/+$/, "");
  return m && !(Jy(d) && c !== i && m === y) ? m : a === "file:" || Jy(d) && c !== i ? p : `${a}//${o.host || d}`;
})(), CC = new Dg(AC), pc = Number((globalThis.window || globalThis).SYNAPSE_DATA_API_TIMEOUT_MS || 6e3), bC = Number.isFinite(pc) && pc > 0 ? pc : 6e3;
function PC(e, n) {
  typeof window > "u" || console.warn(e, n);
}
async function EC(e) {
  var i, a;
  const o = (((a = (i = e.headers) == null ? void 0 : i.get) == null ? void 0 : a.call(i, "content-type")) || "").includes("application/json") ? await e.json() : {};
  if (!e.ok || (o == null ? void 0 : o.ok) === !1)
    throw new Error((o == null ? void 0 : o.error) || `Synapse data API returned HTTP ${e.status}`);
  return o;
}
async function MC(e, n = {}) {
  const o = await CC.fetch(e, {
    timeoutMs: bC,
    ...n
  });
  return EC(o);
}
async function RC(e) {
  try {
    return (await MC("/api/focus-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(e || {})
    })).item || null;
  } catch (n) {
    return PC("Synapse data API focus-session save skipped:", n), null;
  }
}
class DC {
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
const x0 = new DC();
function Zd(e, n) {
  return x0.readJSON(e, n);
}
function Jd(e, n) {
  return x0.writeJSON(e, n);
}
const _0 = "synapse.focusRoom.sessions.v1", T0 = "synapse.focusRoom.draft.v1", k0 = "synapse.focusRoom.active-session.v1", Qc = 40, qy = Object.freeze([
  "idle",
  "running",
  "paused",
  "completed",
  "break",
  "restoring"
]), NC = Object.freeze({
  studying: "running",
  running: "running",
  idle: "idle",
  paused: "paused",
  completed: "completed",
  break: "break",
  restoring: "restoring"
});
let Xc = [];
const hr = (e) => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURI(e)}`, Kn = [
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
    streamUrl: hr("Raspberrymusic_-_Lofi_Hip_Hop_Upbeat.ogg"),
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
], Ke = {
  nature: {
    id: "nature-forest",
    title: "Forest ambience",
    artist: "nille",
    streamUrl: hr("20090610_0_ambience.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:20090610_0_ambience.ogg",
    license: "Public domain",
    attribution: "Forest ambience by nille",
    volumeBias: 1
  },
  cafe: {
    id: "cafe-ambiance",
    title: "Cafe ambiance",
    artist: "Marble Toast",
    streamUrl: hr("Cafe_ambiance.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Cafe_ambiance.ogg",
    license: "CC0",
    attribution: "Cafe ambiance by Marble Toast",
    volumeBias: 0.72
  },
  rain: {
    id: "rain",
    title: "Rain",
    artist: "ezwa",
    streamUrl: hr("Rain_(1).ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Rain_(1).ogg",
    license: "Public domain",
    attribution: "Rain by ezwa",
    volumeBias: 0.48
  },
  whiteNoise: {
    id: "white-noise",
    title: "White noise",
    artist: "Bautsch",
    streamUrl: hr("White.Noise.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:White.Noise.ogg",
    license: "Public domain",
    attribution: "White noise by Bautsch",
    volumeBias: 1
  },
  ocean: {
    id: "ocean-waves",
    title: "Waves",
    artist: "Dsw4",
    streamUrl: hr("Waves.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Waves.ogg",
    license: "CC BY 3.0",
    attribution: "Waves by Dsw4",
    volumeBias: 1
  },
  wind: {
    id: "howling-wind",
    title: "Howling wind",
    artist: "Tvabutzku1234",
    streamUrl: hr("Howling_wind.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Howling_wind.ogg",
    license: "CC0",
    attribution: "Howling wind by Tvabutzku1234",
    volumeBias: 0.78
  }
}, Yn = [
  {
    label: "Nature",
    layers: [Ke.nature],
    pageUrl: Ke.nature.pageUrl,
    license: Ke.nature.license
  },
  {
    label: "Cafe Rain",
    layers: [Ke.cafe, Ke.rain],
    pageUrl: Ke.cafe.pageUrl,
    license: "CC0 / Public domain"
  },
  {
    label: "Rain",
    layers: [Ke.rain],
    pageUrl: Ke.rain.pageUrl,
    license: Ke.rain.license
  },
  {
    label: "White Noise",
    layers: [Ke.whiteNoise],
    pageUrl: Ke.whiteNoise.pageUrl,
    license: Ke.whiteNoise.license
  },
  {
    label: "Ocean",
    layers: [Ke.ocean],
    pageUrl: Ke.ocean.pageUrl,
    license: Ke.ocean.license
  },
  {
    label: "Wind",
    layers: [Ke.wind],
    pageUrl: Ke.wind.pageUrl,
    license: Ke.wind.license
  }
], Sn = [
  {
    id: "morning-window",
    name: "Morning Window",
    kicker: "Bright focus",
    description: "Soft daylight, quiet desk, gentle outdoor calm.",
    image: "./assets/focus-room/innook/morning-window.jpg",
    video: "./assets/focus-room/innook/morning-window.mp4",
    ambientSound: "Nature",
    musicType: "Piano"
  },
  {
    id: "rainy-cafe",
    name: "Rainy Cafe",
    kicker: "Low hum",
    description: "Window rain, warm lights, steady cafe ambience.",
    image: "./assets/focus-room/rainy-cafe.webp",
    ambientSound: "Cafe Rain",
    musicType: "Lo-fi"
  },
  {
    id: "library-night",
    name: "Library Night",
    kicker: "Quiet review",
    description: "Desk lamp, bookshelves, late-night concentration.",
    image: "./assets/focus-room/library-night.webp",
    ambientSound: "White Noise",
    musicType: "Minimal"
  },
  {
    id: "ocean-study-room",
    name: "Ocean Study Room",
    kicker: "Open air",
    description: "Blue horizon, slow waves, clean study energy.",
    image: "./assets/focus-room/ocean-study-room.webp",
    ambientSound: "Cafe Rain",
    musicType: "Lo-fi"
  },
  {
    id: "mountain-cabin",
    name: "Mountain Cabin",
    kicker: "Warm retreat",
    description: "Timber, mountain air, and an unhurried study block.",
    image: "./assets/focus-room/mountain-cabin.webp",
    ambientSound: "Wind",
    musicType: "Piano"
  },
  {
    id: "minimal-desk",
    name: "Minimal Desk",
    kicker: "Clean reset",
    description: "A clear desk, soft light, and room to think.",
    image: "./assets/focus-room/minimal-desk.webp",
    ambientSound: "White Noise",
    musicType: "Deep Focus"
  },
  {
    id: "innook-cabin-twilight",
    name: "Cabin Twilight",
    kicker: "Warm light · Ease",
    description: "Warm cabin light and an unhurried focus block.",
    image: "./assets/focus-room/innook/cabin-twilight.jpg",
    ambientSound: "Nature",
    musicType: "Piano",
    galleryOnly: !0
  },
  {
    id: "innook-last-room",
    name: "Last Light Lounge",
    kicker: "Wasteland · Glow",
    description: "A quiet room with distant, low-lit calm.",
    image: "./assets/focus-room/innook/last-room.jpg",
    ambientSound: "White Noise",
    musicType: "Minimal",
    galleryOnly: !0
  },
  {
    id: "innook-garden-cafe",
    name: "Garden Cafe",
    kicker: "Greenery · Coffee",
    description: "Soft café ambience among abundant greenery.",
    image: "./assets/focus-room/innook/garden-cafe.jpg",
    ambientSound: "Cafe Rain",
    musicType: "Lo-fi",
    galleryOnly: !0
  },
  {
    id: "innook-sunset-classroom",
    name: "Sunset Classroom",
    kicker: "Classroom · Dusk",
    description: "An empty classroom in the fading evening light.",
    image: "./assets/focus-room/innook/sunset-classroom.jpg",
    ambientSound: "Nature",
    musicType: "Piano",
    galleryOnly: !0
  },
  {
    id: "innook-tokyo-night",
    name: "Tokyo Night",
    kicker: "City · Night",
    description: "A city-night view for steady late study.",
    image: "./assets/focus-room/innook/tokyo-night-view.jpg",
    ambientSound: "White Noise",
    musicType: "Deep Focus",
    galleryOnly: !0
  },
  {
    id: "innook-snow-window-cabin",
    name: "Snow Window Cabin",
    kicker: "Snow · Cabin",
    description: "Snow beyond the window, warmth at the desk.",
    image: "./assets/focus-room/innook/snow-window-cabin.jpg",
    ambientSound: "Wind",
    musicType: "Minimal",
    galleryOnly: !0
  },
  {
    id: "innook-bamboo-cabin",
    name: "Bamboo Cabin",
    kicker: "Bamboo · Quiet",
    description: "A bamboo retreat made for quiet concentration.",
    image: "./assets/focus-room/innook/bamboo-cabin.jpg",
    ambientSound: "Nature",
    musicType: "Deep Focus",
    galleryOnly: !0
  },
  {
    id: "innook-snow-peak-window",
    name: "Alpine Window",
    kicker: "Peaks · Calm",
    description: "Cool alpine light through a quiet study window.",
    image: "./assets/focus-room/innook/snow-peak-window.jpg",
    ambientSound: "Wind",
    musicType: "Piano",
    galleryOnly: !0
  },
  {
    id: "innook-herbal-apothecary",
    name: "Herbal Desk",
    kicker: "Herbs · Wood",
    description: "Warm wood shelves and a grounded herbal desk.",
    image: "./assets/focus-room/innook/herbal-apothecary.jpg",
    ambientSound: "Nature",
    musicType: "Minimal",
    galleryOnly: !0
  },
  {
    id: "innook-garden-study",
    name: "Garden Study",
    kicker: "Garden · Window",
    description: "Garden light and a calm reading desk.",
    image: "./assets/focus-room/innook/garden-study-window.jpg",
    ambientSound: "Nature",
    musicType: "Piano",
    galleryOnly: !0
  },
  {
    id: "innook-summer-green",
    name: "Summer Green Window",
    kicker: "Shade · Bright",
    description: "Bright summer greens for a fresh focus block.",
    image: "./assets/focus-room/innook/summer-green-window.jpg",
    ambientSound: "Nature",
    musicType: "Lo-fi",
    galleryOnly: !0
  },
  {
    id: "innook-forest-chimes",
    name: "Forest Chimes",
    kicker: "Forest · Breeze",
    description: "Forest light and soft outdoor calm.",
    image: "./assets/focus-room/innook/forest-window-chimes.jpg",
    ambientSound: "Nature",
    musicType: "Deep Focus",
    galleryOnly: !0
  }
], jC = [
  {
    ...Sn[0],
    name: "Morning Window",
    kicker: "Morning · Plants",
    description: "A bright morning desk beside a leafy window."
  },
  ...Sn.filter((e) => e.galleryOnly)
], A0 = [25, 45, 50, 90];
function IC(e = "") {
  const n = String(e || "");
  return Kn.find((o) => o.label === n) || Kn[0];
}
function FC(e = "") {
  const n = String(e || "");
  return Yn.find((o) => o.label === n) || Yn[0];
}
function Ka(e = {}) {
  const n = IC(e == null ? void 0 : e.musicType), o = FC(e == null ? void 0 : e.ambientSound);
  return {
    musicTrack: n,
    ambientSound: o,
    ambientLayers: o.layers.map((i) => ({
      ...i,
      volumeBias: Hn(i.volumeBias, 1)
    }))
  };
}
function OC(e) {
  return e && typeof e == "object" && !Array.isArray(e) ? e : {};
}
function C0(e) {
  return String(e || "").trim();
}
function LC({ material: e, goal: n, durationMinutes: o }) {
  var g;
  const i = Math.max(10, Number(o) || 25), a = (g = e == null ? void 0 : e.studyHeadings) != null && g.length ? e.studyHeadings : ["Key ideas", "Examples", "Practice", "Review"], d = String(n || "").trim() || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`, c = Math.max(1, Math.floor(i * 0.2)), p = Math.max(1, Math.floor(i * 0.4)), m = Math.max(1, Math.floor(i * 0.2)), y = Math.max(1, i - c - p - m);
  return [
    { minutes: c, task: `Set the goal: ${d}` },
    { minutes: p, task: `Review ${a[0] || "the core ideas"}` },
    { minutes: m, task: `Practice with ${a[1] || a[0] || "the generated examples"}` },
    { minutes: y, task: "Summarize mistakes and choose the next study step" }
  ];
}
function b0() {
  return Zd(T0, null);
}
function VC(e) {
  return Jd(T0, e || null);
}
function P0(e) {
  if (!e || typeof e != "object")
    return { materials: {} };
  const n = OC(e.materials);
  return {
    ...e,
    materials: { ...n }
  };
}
function yo(e, n = "idle") {
  const o = NC[String(e || "").trim().toLowerCase()];
  return o && qy.includes(o) ? o : qy.includes(n) ? n : "idle";
}
function qd(e) {
  return yo(e) === "running" ? "studying" : yo(e);
}
function E0(e = {}, n = {}) {
  const o = e && typeof e == "object" ? e : {}, i = n && typeof n == "object" ? n : {}, a = Object.prototype.hasOwnProperty.call(o, "timerStatus"), d = Object.prototype.hasOwnProperty.call(o, "timerState") || Object.prototype.hasOwnProperty.call(o, "timerPhase"), c = yo(
    d ? o.timerState || o.timerPhase : a ? o.timerStatus : o.status || i.timerState,
    yo(i.timerState || i.timerPhase || i.timerStatus)
  ), p = o.timerMode === "countup" || i.timerMode === "countup" && !Object.prototype.hasOwnProperty.call(o, "timerMode") ? "countup" : "countdown", y = Object.fromEntries(["timerAnchorAtMs", "timerPausedAtMs", "timerUpdatedAtMs", "timerRestoredAtMs"].map((l) => {
    const f = Object.prototype.hasOwnProperty.call(o, l) ? o[l] : i[l], S = Number(f);
    return [l, Number.isFinite(S) && S > 0 ? S : null];
  })), g = Math.max(0, Hn(
    Object.prototype.hasOwnProperty.call(o, "elapsedSeconds") ? o.elapsedSeconds : i.elapsedSeconds,
    0
  ));
  return {
    ...i,
    ...o,
    timerState: c,
    timerPhase: c,
    status: c,
    timerStatus: qd(c),
    timerMode: p,
    elapsedSeconds: g,
    ...y
  };
}
function M0() {
  return P0(Zd(k0, null));
}
function BC(e) {
  return Jd(k0, P0(e));
}
function R0(e) {
  const n = C0(e);
  if (!n) return null;
  const i = M0().materials[n];
  return i && typeof i == "object" ? E0(i) : null;
}
function ef(e, n) {
  const o = C0(e);
  if (!o) return !1;
  const i = M0();
  return n && typeof n == "object" ? i.materials[o] = {
    ...E0(n, i.materials[o]),
    materialId: o,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  } : delete i.materials[o], BC(i);
}
function ga(e) {
  return ef(e, null);
}
function Zc() {
  const e = Zd(_0, []), n = Array.isArray(e) ? e : [], o = /* @__PURE__ */ new Set();
  return [...Xc, ...n].filter((i) => {
    const a = String((i == null ? void 0 : i.sessionId) || "");
    return !a || o.has(a) ? !1 : (o.add(a), !0);
  }).slice(0, Qc);
}
function Hn(e, n) {
  const o = Number(e);
  return Number.isFinite(o) ? o : n;
}
function zC(e = {}) {
  const n = (/* @__PURE__ */ new Date()).toISOString(), i = { ...{
    sessionId: e.sessionId || `focus-${Date.now()}`,
    materialId: String(e.materialId || ""),
    materialTitle: e.materialTitle || "Study material",
    studyGoal: e.studyGoal || "",
    selectedScene: e.selectedScene || "morning-window",
    musicType: e.musicType || "Deep Focus",
    ambientSound: e.ambientSound || "Nature",
    musicVolume: Hn(e.musicVolume ?? 60, 60),
    ambientVolume: Hn(e.ambientVolume ?? 50, 50),
    pomodoroDuration: Hn(e.pomodoroDuration || 25, 25),
    startedAt: e.startedAt || n,
    endedAt: e.endedAt || n,
    totalFocusTime: Math.max(0, Hn(e.totalFocusTime || 0, 0)),
    flashcardsCompleted: Math.max(0, Hn(e.flashcardsCompleted || 0, 0)),
    quizScore: e.quizScore === null || e.quizScore === void 0 || e.quizScore === "" ? null : Number.isFinite(Number(e.quizScore)) ? Number(e.quizScore) : null,
    mistakesMade: Array.isArray(e.mistakesMade) ? e.mistakesMade : [],
    completedTasks: Array.isArray(e.completedTasks) ? e.completedTasks : [],
    aiReflection: e.aiReflection || "You protected a focused study block and created momentum for the next session.",
    recommendedNextStep: e.recommendedNextStep || "Review the hardest item, then start another short focus block.",
    sessionDate: e.sessionDate || n
  }, persisted: !0 }, a = Zc().filter((m) => m.sessionId !== i.sessionId), d = [i, ...a.map((m) => ({ ...m, persisted: !0 }))].slice(0, Qc), c = Jd(_0, d), p = { ...i, persisted: c };
  return RC(p).catch((m) => {
    console.warn("Synapse data API focus-session background save failed:", m);
  }), c ? Xc = [] : Xc = [p, ...a].slice(0, Qc), p;
}
function D0(e) {
  const n = Math.max(0, Hn(e || 0, 0)), o = Math.floor(n / 3600), i = Math.floor(n % 3600 / 60);
  return o ? `${o}h ${i}m` : `${i}m`;
}
var Eg;
const Jc = ((Eg = Sn[0]) == null ? void 0 : Eg.id) || "morning-window", fo = A0[0] || 25, $C = 10, Ya = 180, tf = 60, N0 = Ya * 60, UC = 0, HC = 100, WC = ["materials", "notes", "sources", "chat", "quiz", "flashcards", "mindmap", "plan", "workspace", "history"], qc = new Set(WC), Na = {
  type: "spring",
  stiffness: 120,
  damping: 18,
  mass: 0.8
};
function GC(e, n, o, i) {
  const a = Number(e);
  return Number.isFinite(a) ? Math.min(i, Math.max(o, a)) : n;
}
function kr(e, n, o, i) {
  return Math.round(GC(e, n, o, i));
}
function _t(e, n = 50) {
  return kr(e, n, UC, HC);
}
function xr(e, n = fo) {
  return kr(e, n, $C, Ya);
}
function nn(e, n = fo * 60) {
  return kr(e, n, tf, N0);
}
function ja(e) {
  return Sn.find((n) => n.id === e) || null;
}
function gn(e = Jc) {
  return ja(e) || Sn[0] || {
    id: Jc,
    name: "Focus Room",
    kicker: "Focus",
    description: "A quiet study space.",
    image: "",
    ambientSound: "Nature",
    musicType: "Deep Focus"
  };
}
function j0(e) {
  return Array.isArray(e) ? e.map((n) => ({
    minutes: kr(n == null ? void 0 : n.minutes, 5, 1, Ya),
    task: String((n == null ? void 0 : n.task) || "").trim()
  })).filter((n) => n.task) : [];
}
function mi(e) {
  return Array.isArray(e) ? e.map((n) => ({
    role: String((n == null ? void 0 : n.role) || "assistant") === "user" ? "user" : "assistant",
    text: String((n == null ? void 0 : n.text) || "").trim(),
    createdAt: (n == null ? void 0 : n.createdAt) || (/* @__PURE__ */ new Date()).toISOString()
  })).filter((n) => n.text).slice(-24) : [];
}
function I0(e) {
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
function ed(e, n, o) {
  return e ? LC({
    material: e,
    goal: n,
    durationMinutes: o
  }) : [];
}
function Ai(e) {
  const n = xr(e);
  return n > 0 ? n * 60 : 0;
}
function td(e) {
  const n = Math.max(0, Math.floor(Number(e) || 0)), o = Math.floor(n / 3600), i = Math.floor(n % 3600 / 60), a = n % 60, d = (c) => String(c).padStart(2, "0");
  return o ? `${o}:${d(i)}:${d(a)}` : `${d(i)}:${d(a)}`;
}
function eg(e) {
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
function nd(e) {
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
function nf(e) {
  return String((e == null ? void 0 : e.type) || "").toLowerCase();
}
function XC(e) {
  return String((e == null ? void 0 : e.label) || (e == null ? void 0 : e.text) || e).trim();
}
function Ia(e) {
  const n = (e == null ? void 0 : e.choices) || (e == null ? void 0 : e.options) || (e == null ? void 0 : e.answers);
  return Array.isArray(n) && n.length ? n.map(XC).filter(Boolean) : nf(e) === "true_false" ? ["True", "False"] : [];
}
function rd(e) {
  const n = (e == null ? void 0 : e.correctOptionIndexes) || (e == null ? void 0 : e.correct_option_indexes) || (e == null ? void 0 : e.correctIndexes);
  return Array.isArray(n) ? n.map((o) => Number(o)).filter(Number.isInteger) : [];
}
function ZC(e, n) {
  const o = Array.isArray(e) ? [...e].map(Number).filter(Number.isInteger).sort((a, d) => a - d) : [], i = Array.isArray(n) ? [...n].map(Number).filter(Number.isInteger).sort((a, d) => a - d) : [];
  return o.length === i.length && o.every((a, d) => a === i[d]);
}
function Ar(e) {
  return String(e || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function Fa(e, n) {
  if (Number.isInteger(n)) return n;
  const o = Number(n);
  if (typeof n != "string" && Number.isInteger(o)) return o;
  const i = Ia(e), a = Ar(n);
  return i.findIndex((d) => Ar(d) === a);
}
function F0(e, n) {
  if (typeof n == "boolean") return n;
  if (n === 0) return !0;
  if (n === 1) return !1;
  const o = Ia(e), i = Ar(n);
  return i === "true" ? !0 : i === "false" ? !1 : Ar(o[0]) === i ? !0 : Ar(o[1]) === i ? !1 : null;
}
function JC(e, n, o) {
  const i = nf(e);
  if (i === "multiple_choice") {
    const a = Fa(e, n);
    if (!Number.isInteger(a) || a < 0) return [];
    const d = Array.isArray(o) ? [...o] : [];
    return d.includes(a) ? d.filter((c) => c !== a) : [...d, a].sort((c, p) => c - p);
  }
  if (i === "single_choice") {
    const a = Fa(e, n);
    return Number.isInteger(a) && a >= 0 ? a : "";
  }
  if (i === "true_false") {
    const a = F0(e, n);
    return a === null ? "" : a;
  }
  return String(n || "");
}
function O0(e) {
  const n = (e == null ? void 0 : e.correctAnswer) ?? (e == null ? void 0 : e.correct_answer) ?? (e == null ? void 0 : e.answer) ?? (e == null ? void 0 : e.correct), o = rd(e);
  if (o.length) {
    const i = Ia(e);
    return o.map((a) => i[a] || "").filter(Boolean).join(", ");
  }
  if (typeof (e == null ? void 0 : e.correctBoolean) == "boolean" || typeof (e == null ? void 0 : e.correct_boolean) == "boolean") {
    const i = Ia(e);
    return (typeof e.correctBoolean == "boolean" ? e.correctBoolean : e.correct_boolean) ? i[0] || "True" : i[1] || "False";
  }
  return e != null && e.expectedAnswer || e != null && e.expected_answer ? String(e.expectedAnswer || e.expected_answer || "").trim() : Array.isArray(n) ? n.map((i) => String(i)).join(", ") : String(n || "").trim();
}
function qC(e, n) {
  const o = nf(e);
  if (o === "single_choice") {
    const a = rd(e)[0], d = Fa(e, n);
    return Number.isInteger(a) ? d === a : null;
  }
  if (o === "multiple_choice") {
    const a = rd(e), d = Array.isArray(n) ? n : [Fa(e, n)].filter(Number.isInteger);
    return a.length ? ZC(d, a) : null;
  }
  if (o === "true_false") {
    const a = typeof (e == null ? void 0 : e.correctBoolean) == "boolean" ? e.correctBoolean : e == null ? void 0 : e.correct_boolean, d = F0(e, n);
    return typeof a == "boolean" && d !== null ? d === a : null;
  }
  const i = O0(e);
  return i ? Ar(n) === Ar(i) : null;
}
function L0(e, n, o) {
  var p;
  const i = String(e || "").trim(), a = String((n == null ? void 0 : n.summaryText) || (n == null ? void 0 : n.aiSummary) || "").slice(0, 420), d = ((p = n == null ? void 0 : n.studyHeadings) == null ? void 0 : p[0]) || (n == null ? void 0 : n.materialTitle) || "this material", c = o || `Study ${(n == null ? void 0 : n.materialTitle) || "this material"}`;
  return i ? [
    `For ${d}: ${a || "use the selected material as your main source."}`,
    `Your current goal is: ${c}.`,
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
function tb({ scene: e }) {
  const [n, o] = C.useState(!1), [i, a] = C.useState(!1);
  return C.useEffect(() => {
    o(!1), a(!1);
  }, [e == null ? void 0 : e.id]), /* @__PURE__ */ w.jsxs("div", { className: "focus-background-wrap", "aria-hidden": "true", children: [
    /* @__PURE__ */ w.jsx(eb, {}),
    /* @__PURE__ */ w.jsx(Wa, { mode: "wait", children: /* @__PURE__ */ w.jsxs(
      vn.div,
      {
        className: "focus-background",
        style: { backgroundImage: i ? "none" : void 0 },
        initial: { opacity: 0, scale: 1.035 },
        animate: { opacity: 1, scale: 1.02 },
        exit: { opacity: 0, scale: 1.015 },
        transition: { duration: 0.8, ease: "easeOut" },
        children: [
          e != null && e.image ? /* @__PURE__ */ w.jsx(
            "img",
            {
              className: `focus-background-media focus-background-poster ${n ? "is-ready" : ""}`.trim(),
              src: e.image,
              alt: "",
              onLoad: () => o(!0),
              onError: () => a(!0)
            }
          ) : null,
          e != null && e.video ? /* @__PURE__ */ w.jsx(
            "video",
            {
              className: `focus-background-media focus-background-video ${n ? "is-ready" : ""}`.trim(),
              src: e.video,
              poster: e.image,
              autoPlay: !0,
              muted: !0,
              loop: !0,
              playsInline: !0,
              preload: "metadata",
              onLoadedData: () => o(!0),
              onError: () => a(!0)
            }
          ) : null
        ]
      },
      (e == null ? void 0 : e.id) || "focus-background"
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
const nb = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), rb = (e) => e.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (n, o, i) => i ? i.toUpperCase() : o.toLowerCase()
), tg = (e) => {
  const n = rb(e);
  return n.charAt(0).toUpperCase() + n.slice(1);
}, V0 = (...e) => e.filter((n, o, i) => !!n && n.trim() !== "" && i.indexOf(n) === o).join(" ").trim(), ob = (e) => {
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
var ib = {
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
const sb = C.forwardRef(
  ({
    color: e = "currentColor",
    size: n = 24,
    strokeWidth: o = 2,
    absoluteStrokeWidth: i,
    className: a = "",
    children: d,
    iconNode: c,
    ...p
  }, m) => C.createElement(
    "svg",
    {
      ref: m,
      ...ib,
      width: n,
      height: n,
      stroke: e,
      strokeWidth: i ? Number(o) * 24 / Number(n) : o,
      className: V0("lucide", a),
      ...!d && !ob(p) && { "aria-hidden": "true" },
      ...p
    },
    [
      ...c.map(([y, g]) => C.createElement(y, g)),
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
    ({ className: i, ...a }, d) => C.createElement(sb, {
      ref: d,
      iconNode: n,
      className: V0(
        `lucide-${nb(tg(e))}`,
        `lucide-${e}`,
        i
      ),
      ...a
    })
  );
  return o.displayName = tg(e), o;
};
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ab = [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
], lb = Te("arrow-left", ab);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ub = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
], cb = Te("arrow-right", ub);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const db = [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]], Qa = Te("check", db);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const fb = [["path", { d: "m15 18-6-6 6-6", key: "1wnfg3" }]], pb = Te("chevron-left", fb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const mb = [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]], hb = Te("chevron-right", mb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const yb = [
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
], gb = Te("coffee", yb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const vb = [
  ["rect", { width: "12", height: "12", x: "2", y: "10", rx: "2", ry: "2", key: "6agr2n" }],
  [
    "path",
    { d: "m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6", key: "1o487t" }
  ],
  ["path", { d: "M6 18h.01", key: "uhywen" }],
  ["path", { d: "M10 14h.01", key: "ssrbsk" }],
  ["path", { d: "M15 6h.01", key: "cblpky" }],
  ["path", { d: "M18 9h.01", key: "2061c0" }]
], Sb = Te("dices", vb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const wb = [
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
], xb = Te("door-open", wb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const _b = [
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
], Oa = Te("footprints", _b);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Tb = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }],
  ["path", { d: "M12 7v5l4 2", key: "1fdv2h" }]
], kb = Te("history", Tb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Ab = [
  ["path", { d: "m14 10 7-7", key: "oa77jy" }],
  ["path", { d: "M20 10h-6V4", key: "mjg0md" }],
  ["path", { d: "m3 21 7-7", key: "tjx5ai" }],
  ["path", { d: "M4 14h6v6", key: "rmj7iw" }]
], Cb = Te("minimize-2", Ab);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const bb = [
  ["circle", { cx: "8", cy: "18", r: "4", key: "1fc0mg" }],
  ["path", { d: "M12 18V2l7 4", key: "g04rme" }]
], Pb = Te("music-2", bb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Eb = [
  ["rect", { x: "14", y: "4", width: "4", height: "16", rx: "1", key: "zuxfzm" }],
  ["rect", { x: "6", y: "4", width: "4", height: "16", rx: "1", key: "1okwgv" }]
], ng = Te("pause", Eb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Mb = [
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
], Rb = Te("piano", Mb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Db = [["polygon", { points: "6 3 20 12 6 21 6 3", key: "1oa8hb" }]], Nb = Te("play", Db);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const jb = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
], Ib = Te("plus", jb);
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
], Ob = Te("radio", Fb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Lb = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
], Vb = Te("rotate-ccw", Lb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Bb = [
  [
    "path",
    {
      d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
      key: "1c8476"
    }
  ],
  ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7", key: "1ydtos" }],
  ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7", key: "t51u73" }]
], B0 = Te("save", Bb);
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
], z0 = Te("settings-2", zb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const $b = [
  ["path", { d: "m18 14 4 4-4 4", key: "10pe0f" }],
  ["path", { d: "m18 2 4 4-4 4", key: "pucp1d" }],
  ["path", { d: "M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22", key: "1ailkh" }],
  ["path", { d: "M2 6h1.972a4 4 0 0 1 3.6 2.2", key: "km57vx" }],
  ["path", { d: "M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45", key: "os18l9" }]
], Ub = Te("shuffle", $b);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Hb = [
  ["polygon", { points: "5 4 15 12 5 20 5 4", key: "16p6eg" }],
  ["line", { x1: "19", x2: "19", y1: "5", y2: "19", key: "futhcm" }]
], Wb = Te("skip-forward", Hb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Gb = [
  ["line", { x1: "21", x2: "14", y1: "4", y2: "4", key: "obuewd" }],
  ["line", { x1: "10", x2: "3", y1: "4", y2: "4", key: "1q6298" }],
  ["line", { x1: "21", x2: "12", y1: "12", y2: "12", key: "1iu8h1" }],
  ["line", { x1: "8", x2: "3", y1: "12", y2: "12", key: "ntss68" }],
  ["line", { x1: "21", x2: "16", y1: "20", y2: "20", key: "14d8ph" }],
  ["line", { x1: "12", x2: "3", y1: "20", y2: "20", key: "m0wm8r" }],
  ["line", { x1: "14", x2: "14", y1: "2", y2: "6", key: "14e1ph" }],
  ["line", { x1: "8", x2: "8", y1: "10", y2: "14", key: "1i6ji0" }],
  ["line", { x1: "16", x2: "16", y1: "18", y2: "22", key: "1lctlv" }]
], Kb = Te("sliders-horizontal", Gb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Yb = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["circle", { cx: "12", cy: "12", r: "6", key: "1vlfrh" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }]
], Qb = Te("target", Yb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Xb = [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
], Zb = Te("trash-2", Xb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Jb = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744", key: "16gr8j" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }]
], La = Te("users", Jb);
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
      d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
      key: "uqj9uw"
    }
  ],
  ["path", { d: "M16 9a5 5 0 0 1 0 6", key: "1q6k2b" }],
  ["path", { d: "M19.364 18.364a9 9 0 0 0 0-12.728", key: "ijwkga" }]
], Xa = Te("volume-2", qb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const eP = [
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
], rf = Te("waves", eP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const tP = [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
], $0 = Te("x", tP), rg = (e) => {
  let n;
  const o = /* @__PURE__ */ new Set(), i = (y, g) => {
    const l = typeof y == "function" ? y(n) : y;
    if (!Object.is(l, n)) {
      const f = n;
      n = g ?? (typeof l != "object" || l === null) ? l : Object.assign({}, n, l), o.forEach((S) => S(n, f));
    }
  }, a = () => n, p = { setState: i, getState: a, getInitialState: () => m, subscribe: (y) => (o.add(y), () => o.delete(y)) }, m = n = e(i, a, p);
  return p;
}, nP = ((e) => e ? rg(e) : rg), rP = (e) => e;
function oP(e, n = rP) {
  const o = yn.useSyncExternalStore(
    e.subscribe,
    yn.useCallback(() => n(e.getState()), [e, n]),
    yn.useCallback(() => n(e.getInitialState()), [e, n])
  );
  return yn.useDebugValue(o), o;
}
const og = (e) => {
  const n = nP(e), o = (i) => oP(n, i);
  return Object.assign(o, n), o;
}, iP = ((e) => e ? og(e) : og), sP = /* @__PURE__ */ new Set(["pending", "active", "done"]);
function U0() {
  return `topic-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function Va(e = {}, n = "pending") {
  const o = String(e.title || e.name || "").trim(), i = String(e.description || e.detail || e.notes || "").trim(), a = sP.has(e.status) ? e.status : n;
  return {
    id: String(e.id || "").trim() || U0(),
    title: o || "Untitled topic",
    description: i,
    status: a
  };
}
function yr(e, n = "Deep work block") {
  const o = Array.isArray(e) ? e.map((c) => Va(c)).filter(Boolean) : [];
  if (!o.length) {
    const c = Va({
      title: String(n || "Deep work block").trim() || "Deep work block",
      description: "",
      status: "active"
    }, "active");
    return { focusTopics: [c], activeTopicId: c.id, studyGoal: c.title };
  }
  let i = "";
  const a = o.map((c, p) => c.status === "active" && !i ? (i = c.id, c) : c.status === "active" && i ? { ...c, status: "pending" } : c);
  if (!i) {
    const c = a.find((p) => p.status !== "done") || a[0];
    return i = c.id, {
      focusTopics: a.map((p) => p.id === i ? { ...p, status: "active" } : p.status === "active" ? { ...p, status: "pending" } : p),
      activeTopicId: i,
      studyGoal: c.title
    };
  }
  const d = a.find((c) => c.id === i) || a[0];
  return {
    focusTopics: a,
    activeTopicId: i,
    studyGoal: (d == null ? void 0 : d.title) || String(n || "Deep work block")
  };
}
function of(e = [], n = "") {
  const o = Array.isArray(e) ? e : [];
  return o.find((i) => i.id === n) || o.find((i) => i.status === "active") || o.find((i) => i.status !== "done") || o[0] || null;
}
function mc(e = [], n = "") {
  var d;
  const o = Array.isArray(e) ? e.map((c) => ({ ...c })) : [];
  if (!o.length)
    return yr([], "Deep work block");
  const i = n ? o.find((c) => c.id === n && c.status !== "done") : o.find((c) => c.status === "pending") || o.find((c) => c.status !== "done");
  return i ? {
    focusTopics: o.map((c) => c.id === i.id ? { ...c, status: "active" } : c.status === "active" ? { ...c, status: "pending" } : c),
    activeTopicId: i.id,
    studyGoal: i.title
  } : {
    focusTopics: o,
    activeTopicId: "",
    studyGoal: ((d = o[o.length - 1]) == null ? void 0 : d.title) || "Deep work block"
  };
}
const Si = Object.freeze({
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
  return Sn[0] || gn(Jc);
}
function od(e) {
  const n = String(e || "");
  if (!n) return null;
  const i = I0(b0()).materials[n];
  return i && typeof i == "object" ? i : null;
}
function it(e) {
  var i;
  const n = String(e.selectedMaterialId || ((i = e.selectedMaterial) == null ? void 0 : i.materialId) || "");
  if (!n) return;
  const o = I0(b0());
  o.materials[n] = {
    materialId: n,
    selectedScene: e.selectedScene,
    musicType: e.musicType,
    ambientSound: e.ambientSound,
    musicVolume: _t(e.musicVolume),
    ambientVolume: _t(e.ambientVolume),
    audioChannels: { ...Si, ...e.audioChannels || {} },
    durationMinutes: xr(e.pomodoroDuration),
    durationSeconds: nn(e.pomodoroDurationSeconds, Ai(e.pomodoroDuration)),
    studyGoal: e.studyGoal,
    focusTopics: Array.isArray(e.focusTopics) ? e.focusTopics : [],
    activeTopicId: String(e.activeTopicId || ""),
    studyPlan: j0(e.studyPlan),
    completedTasks: Array.isArray(e.completedTasks) ? e.completedTasks.filter(Boolean) : [],
    workspaceNotes: String(e.workspaceNotes || ""),
    workspaceUpdatedAt: e.workspaceUpdatedAt || "",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }, VC(o);
}
function lP(e) {
  return Array.isArray(e == null ? void 0 : e.completedTasks) ? e.completedTasks.map((n) => String(n || "").trim()).filter(Boolean) : [];
}
function id(e = {}) {
  return {
    sectionTitle: String(e.sectionTitle || "").trim(),
    excerpt: String(e.excerpt || "").trim().slice(0, 1800)
  };
}
function H0(e = null) {
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
function Ut(e = {}) {
  return yo(e.timerState || e.timerPhase || e.status || e.timerStatus);
}
function vr(e = {}) {
  const n = Number(e.pomodoroDurationSeconds);
  return Number.isFinite(n) && n > 0 ? nn(n, Ai(e.pomodoroDuration)) : Ai(e.pomodoroDuration);
}
function Wn(e = {}) {
  if (e.timerMode === "countup") return 0;
  const n = Number(e.timerDurationSeconds);
  return Number.isFinite(n) && n > 0 ? n : vr(e);
}
function Ba(e = {}, n = st()) {
  const o = Math.max(0, Number(e.elapsedSeconds) || 0);
  if (Ut(e) !== "running") return o;
  const i = Number(e.timerAnchorAtMs);
  return !Number.isFinite(i) || i <= 0 ? o : Math.max(o, Math.floor(Math.max(0, n - i) / 1e3));
}
function Et(e, n = st()) {
  const o = yo(e);
  return {
    timerState: o,
    timerPhase: o,
    status: o,
    timerStatus: qd(o),
    timerUpdatedAtMs: n
  };
}
function uP(e = {}) {
  const n = Ut(e);
  return {
    timerState: n,
    timerPhase: n,
    status: n,
    timerStatus: qd(n),
    timerMode: e.timerMode === "countup" ? "countup" : "countdown",
    timerAnchorAtMs: Number.isFinite(Number(e.timerAnchorAtMs)) ? Number(e.timerAnchorAtMs) : null,
    timerPausedAtMs: Number.isFinite(Number(e.timerPausedAtMs)) ? Number(e.timerPausedAtMs) : null,
    timerUpdatedAtMs: Number.isFinite(Number(e.timerUpdatedAtMs)) ? Number(e.timerUpdatedAtMs) : null,
    timerRestoredAtMs: Number.isFinite(Number(e.timerRestoredAtMs)) ? Number(e.timerRestoredAtMs) : null,
    timerDurationSeconds: Wn(e),
    pomodoroDuration: e.pomodoroDuration,
    pomodoroDurationSeconds: vr(e),
    elapsedSeconds: Math.max(0, Number(e.elapsedSeconds) || 0),
    startedAt: e.startedAt || null,
    currentSession: e.currentSession || null,
    view: e.view
  };
}
function zn(e) {
  var o;
  const n = String(e.selectedMaterialId || ((o = e.selectedMaterial) == null ? void 0 : o.materialId) || "");
  return !n || e.view !== "session" ? !1 : ef(n, uP(e));
}
function ig(e, n = st()) {
  const o = Ba(e, n), i = Wn(e), a = e.timerMode !== "countup" && i > 0 && o >= i, d = a ? "completed" : Ut(e);
  return {
    ...Et(d, n),
    elapsedSeconds: a ? i : o,
    timerAnchorAtMs: d === "running" ? e.timerAnchorAtMs : null,
    timerPausedAtMs: d === "running" ? null : e.timerPausedAtMs || n,
    audioPlaying: d === "running" ? e.audioPlaying : !1
  };
}
function cP(e, n = {}) {
  const o = gn(n.selectedScene), i = od(e == null ? void 0 : e.materialId), a = ja(i == null ? void 0 : i.selectedScene) ? i.selectedScene : o.id, d = gn(a), c = String((i == null ? void 0 : i.musicType) || d.musicType || "Deep Focus"), p = String((i == null ? void 0 : i.ambientSound) || d.ambientSound || "Nature"), m = _t(i == null ? void 0 : i.musicVolume, n.musicVolume ?? 60), y = _t(i == null ? void 0 : i.ambientVolume, n.ambientVolume ?? 50), g = xr(i == null ? void 0 : i.durationMinutes, n.pomodoroDuration ?? fo), l = nn(
    i == null ? void 0 : i.durationSeconds,
    n.pomodoroDurationSeconds ?? g * 60
  ), f = String((i == null ? void 0 : i.studyGoal) || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`), S = j0(i == null ? void 0 : i.studyPlan), x = S.length ? S : ed(e, f, g), k = lP(i), A = String((i == null ? void 0 : i.workspaceNotes) || ""), T = (i == null ? void 0 : i.workspaceUpdatedAt) || (i == null ? void 0 : i.updatedAt) || "";
  return {
    selectedScene: a,
    musicType: c,
    ambientSound: p,
    musicVolume: m,
    ambientVolume: y,
    audioChannels: { ...Si, ...(i == null ? void 0 : i.audioChannels) || n.audioChannels || {} },
    pomodoroDuration: g,
    pomodoroDurationSeconds: l,
    studyGoal: f,
    studyPlan: x,
    completedTasks: k,
    workspaceNotes: A,
    workspaceUpdatedAt: T
  };
}
function sg(e) {
  const n = R0(e);
  if (!n || typeof n != "object") return null;
  const o = Ut(n), i = st(), a = Number(n.timerAnchorAtMs), d = Date.parse(n.startedAt || ""), c = Number.isFinite(d) ? d : NaN, p = o === "running" ? Ba({
    ...n,
    timerState: "running",
    timerAnchorAtMs: Number.isFinite(a) && a > 0 ? a : c
  }, i) : Math.max(0, Number(n.elapsedSeconds) || 0), m = Wn(n), y = o === "running" ? m > 0 && p >= m ? "completed" : "paused" : o, g = o === "running";
  return {
    route: n.view === "session" ? "session" : "setup",
    view: n.view === "session" ? "session" : "setup",
    ...Et(g ? "restoring" : y, i),
    timerRestoreTarget: g ? y : null,
    timerMode: n.timerMode === "countup" ? "countup" : "countdown",
    timerAnchorAtMs: null,
    timerPausedAtMs: g ? null : Number(n.timerPausedAtMs) || null,
    timerRestoredAtMs: g ? null : i,
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
    chatMessages: mi(n.chatMessages),
    chatPending: !1,
    chatError: "",
    panelTab: qc.has(n.panelTab) ? n.panelTab : "materials",
    workspaceNotes: String(n.workspaceNotes || ""),
    workspaceUpdatedAt: n.workspaceUpdatedAt || n.updatedAt || "",
    activeNoteSection: String(n.activeNoteSection || ""),
    activeSourceHighlight: H0(n.activeSourceHighlight),
    assistantContext: id(n.assistantContext),
    audioPlaying: !1
  };
}
function Js() {
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
  const n = nd(e.selectedMaterial);
  return Object.entries(e.quizChecked || {}).filter(([, o]) => o && o.hasKnownAnswer && !o.correct).map(([o]) => QC(n[Number(o)], Number(o))).filter(Boolean);
}
async function mP(e, n, o, i = {}) {
  var c, p;
  if (!globalThis.apiClient || typeof globalThis.apiClient.fetch != "function")
    return {
      answer: L0(e, o, Y.getState().studyGoal),
      offline: !0
    };
  const a = await globalThis.apiClient.fetch("/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: e,
      selected_section: i.sectionTitle || ((c = o == null ? void 0 : o.studyHeadings) == null ? void 0 : c[0]) || "",
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
const Y = iP((e, n) => {
  const o = aP(), i = od("focus-room"), a = ja(i == null ? void 0 : i.selectedScene) ? gn(i.selectedScene) : o, d = xr(i == null ? void 0 : i.durationMinutes, fo), c = nn(
    i == null ? void 0 : i.durationSeconds,
    Ai(d)
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
    musicVolume: _t(i == null ? void 0 : i.musicVolume, 60),
    ambientVolume: _t(i == null ? void 0 : i.ambientVolume, 50),
    audioChannels: { ...Si, ...(i == null ? void 0 : i.audioChannels) || {} },
    pomodoroDuration: d,
    pomodoroDurationSeconds: c,
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
    timerDurationSeconds: c,
    ...yr(i == null ? void 0 : i.focusTopics, (i == null ? void 0 : i.studyGoal) || "Deep work block"),
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
      const p = n(), m = R0("focus-room"), y = sg("focus-room"), g = Ut(m || {});
      if (!!((y == null ? void 0 : y.view) === "session" && y.currentSession && g === "running")) {
        const A = gn((m == null ? void 0 : m.selectedScene) || p.selectedScene);
        e({
          selectedMaterialId: "focus-room",
          selectedMaterial: null,
          studyPlan: Array.isArray(m == null ? void 0 : m.studyPlan) ? m.studyPlan : [],
          selectedScene: A.id,
          musicType: (m == null ? void 0 : m.musicType) || p.musicType,
          ambientSound: (m == null ? void 0 : m.ambientSound) || p.ambientSound,
          musicVolume: _t(m == null ? void 0 : m.musicVolume, p.musicVolume),
          ambientVolume: _t(m == null ? void 0 : m.ambientVolume, p.ambientVolume),
          audioChannels: { ...Si, ...(m == null ? void 0 : m.audioChannels) || p.audioChannels || {} },
          pomodoroDuration: xr(m == null ? void 0 : m.pomodoroDuration, p.pomodoroDuration),
          pomodoroDurationSeconds: nn(
            m == null ? void 0 : m.pomodoroDurationSeconds,
            p.pomodoroDurationSeconds
          ),
          ...yr(
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
      ga("focus-room");
      const f = od("focus-room"), S = gn((f == null ? void 0 : f.selectedScene) || p.selectedScene), x = xr(f == null ? void 0 : f.durationMinutes, p.pomodoroDuration || fo), k = nn(
        f == null ? void 0 : f.durationSeconds,
        p.pomodoroDurationSeconds || Ai(x)
      );
      e({
        route: "setup",
        view: "setup",
        selectedMaterialId: "focus-room",
        selectedMaterial: null,
        selectedScene: S.id,
        musicType: String((f == null ? void 0 : f.musicType) || S.musicType || p.musicType || "Deep Focus"),
        ambientSound: String((f == null ? void 0 : f.ambientSound) || S.ambientSound || p.ambientSound || "Nature"),
        musicVolume: _t(f == null ? void 0 : f.musicVolume, p.musicVolume ?? 60),
        ambientVolume: _t(f == null ? void 0 : f.ambientVolume, p.ambientVolume ?? 50),
        audioChannels: { ...Si, ...(f == null ? void 0 : f.audioChannels) || p.audioChannels || {} },
        pomodoroDuration: x,
        pomodoroDurationSeconds: k,
        timerDurationSeconds: k,
        ...yr(
          (f == null ? void 0 : f.focusTopics) || p.focusTopics,
          (f == null ? void 0 : f.studyGoal) || p.studyGoal || "Deep work block"
        ),
        studyPlan: [],
        completedTasks: [],
        currentSession: null,
        summaryRecord: null,
        audioPlaying: !1,
        elapsedSeconds: 0,
        startedAt: null,
        ...Et("idle", st()),
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        workspaceNotes: String((f == null ? void 0 : f.workspaceNotes) || p.workspaceNotes || ""),
        workspaceUpdatedAt: (f == null ? void 0 : f.workspaceUpdatedAt) || p.workspaceUpdatedAt || ""
      });
    },
    returnToSetup() {
      const p = n();
      it(p), ga("focus-room"), e({
        route: "setup",
        view: "setup",
        currentSession: null,
        summaryRecord: null,
        audioPlaying: !1,
        aiPanelOpen: !1,
        activeDrawer: "",
        elapsedSeconds: 0,
        startedAt: null,
        ...Et("idle", st()),
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        timerDurationSeconds: vr(p)
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
      const g = n(), l = !!m, f = l ? m.materialId : String(p.materialId || "");
      if (!l) {
        e({
          route: "setup",
          view: "setup",
          selectedMaterialId: f,
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
      const S = g.selectedMaterialId === f, x = S && y ? null : sg(f), k = S && y ? {} : cP(m, g), A = S && y ? {} : {
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
        timerDurationSeconds: vr({
          pomodoroDuration: k.pomodoroDuration || fo,
          pomodoroDurationSeconds: k.pomodoroDurationSeconds
        }),
        elapsedSeconds: 0,
        startedAt: null,
        currentSession: null,
        ...Js(),
        chatMessages: [],
        chatPending: !1,
        chatError: "",
        activeNoteSection: "",
        activeSourceHighlight: null,
        assistantContext: { sectionTitle: "", excerpt: "" }
      }, T = S && y ? g.view === "session" ? "session" : "setup" : (x == null ? void 0 : x.view) === "session" ? "session" : "setup";
      if (e({
        ...k,
        ...A,
        ...x,
        route: T,
        view: T,
        selectedMaterialId: f,
        selectedMaterial: m,
        aiPanelOpen: !1,
        activeDrawer: "",
        summaryRecord: null
      }), (x == null ? void 0 : x.timerState) === "restoring") {
        const b = x.timerRestoreTarget || "paused";
        Promise.resolve().then(() => {
          const E = n();
          if (E.selectedMaterialId !== f || E.timerState !== "restoring") return;
          const D = st(), O = Wn(E), H = O > 0 ? Math.min(O, Math.max(0, Number(E.elapsedSeconds) || 0)) : Math.max(0, Number(E.elapsedSeconds) || 0), W = {
            ...Et(b, D),
            timerRestoreTarget: null,
            timerAnchorAtMs: null,
            timerPausedAtMs: b === "paused" ? D : null,
            timerRestoredAtMs: D,
            elapsedSeconds: H,
            audioPlaying: !1
          };
          e(W), zn({ ...E, ...W });
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
        sessionHistory: Zc()
      });
    },
    selectScene(p) {
      const m = ja(p);
      m && e((y) => {
        const g = {
          selectedScene: m.id,
          musicType: m.musicType || y.musicType,
          ambientSound: m.ambientSound || y.ambientSound
        }, l = { ...y, ...g };
        return it(l), g;
      });
    },
    setPomodoroDurationSeconds(p) {
      e((m) => {
        const y = nn(p, m.pomodoroDurationSeconds), g = Math.max(1, Math.round(y / 60)), l = m.selectedMaterial ? ed(m.selectedMaterial, m.studyGoal, g) : [], f = {
          pomodoroDuration: g,
          pomodoroDurationSeconds: y,
          studyPlan: l,
          timerDurationSeconds: m.timerMode === "countup" ? 0 : y
        };
        return it({ ...m, ...f }), f;
      });
    },
    setPomodoroDuration(p) {
      const m = xr(p, n().pomodoroDuration);
      n().setPomodoroDurationSeconds(m * 60);
    },
    setStudyGoal(p) {
      e((m) => {
        var S;
        const y = String(p ?? ""), g = m.selectedMaterial ? ed(m.selectedMaterial, y, m.pomodoroDuration) : [], l = Array.isArray(m.focusTopics) ? m.focusTopics.map((x) => x.id === m.activeTopicId || x.status === "active" ? { ...x, title: y || x.title, status: "active" } : x) : yr([], y).focusTopics, f = {
          studyGoal: y,
          studyPlan: g,
          focusTopics: l,
          activeTopicId: m.activeTopicId || ((S = l.find((x) => x.status === "active")) == null ? void 0 : S.id) || ""
        };
        return it({ ...m, ...f }), f;
      });
    },
    addFocusTopic(p = {}) {
      e((m) => {
        const y = (m.focusTopics || []).some((S) => S.status === "active"), g = Va({
          id: U0(),
          title: p.title || `Topic ${(m.focusTopics || []).length + 1}`,
          description: p.description || "",
          status: y ? "pending" : "active"
        }, y ? "pending" : "active"), f = {
          focusTopics: [...m.focusTopics || [], g],
          activeTopicId: y ? m.activeTopicId : g.id,
          studyGoal: y ? m.studyGoal : g.title
        };
        return it({ ...m, ...f }), f;
      });
    },
    updateFocusTopic(p, m = {}) {
      e((y) => {
        const g = (y.focusTopics || []).map((S) => S.id !== p ? S : Va({
          ...S,
          ...m,
          id: S.id,
          status: S.status
        }, S.status)), l = of(g, y.activeTopicId), f = {
          focusTopics: g,
          activeTopicId: (l == null ? void 0 : l.id) || y.activeTopicId || "",
          studyGoal: (l == null ? void 0 : l.title) || y.studyGoal
        };
        return it({ ...y, ...f }), f;
      });
    },
    activateFocusTopic(p) {
      e((m) => {
        const y = mc(m.focusTopics, p);
        return it({ ...m, ...y }), y;
      });
    },
    finishFocusTopic(p = "") {
      e((m) => {
        const y = String(p || m.activeTopicId || ""), g = (m.focusTopics || []).map((f) => f.id === y ? { ...f, status: "done" } : f), l = mc(g);
        return it({ ...m, ...l }), l;
      });
    },
    removeFocusTopic(p) {
      e((m) => {
        const y = (m.focusTopics || []).filter((f) => f.id !== p);
        if (!y.length) {
          const f = yr([], m.studyGoal || "Deep work block");
          return it({ ...m, ...f }), f;
        }
        const l = m.activeTopicId === p || (m.focusTopics || []).some((f) => f.id === p && f.status === "active") ? mc(y) : yr(y, m.studyGoal);
        return it({ ...m, ...l }), l;
      });
    },
    setSound(p, m) {
      e((y) => {
        var l;
        let g = {};
        if (p === "musicVolume" && (g = { musicVolume: _t(m, y.musicVolume) }), p === "ambientVolume" && (g = { ambientVolume: _t(m, y.ambientVolume) }), p === "musicType" && (g = { musicType: String(m || y.musicType) }), p === "ambientSound" && (g = { ambientSound: String(m || y.ambientSound) }), String(p).startsWith("audioChannel:")) {
          const f = String(p).slice(13);
          g = { audioChannels: { ...y.audioChannels, [f]: _t(m, ((l = y.audioChannels) == null ? void 0 : l[f]) ?? 0) } };
        }
        return it({ ...y, ...g }), g;
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
      const m = qc.has(String(p || "")) ? String(p) : "materials";
      e({
        panelTab: m,
        aiPanelOpen: !0,
        activeDrawer: ""
      });
    },
    selectSourceHighlight(p = null, { openPanel: m = !0 } = {}) {
      const y = H0(p);
      e({
        activeSourceHighlight: y,
        activeNoteSection: (y == null ? void 0 : y.sectionTitle) || n().activeNoteSection || "",
        assistantContext: y ? id({
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
        panelTab: qc.has(m) ? m : "materials",
        aiPanelOpen: !0,
        activeDrawer: ""
      });
    },
    startSession() {
      const p = n(), m = p.timerMode === "countup" ? "countup" : "countdown";
      it(p), e({
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
        timerDurationSeconds: m === "countup" ? 0 : vr(p),
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
        ...Js(),
        chatMessages: [],
        chatPending: !1,
        chatError: ""
      });
    },
    startTimer() {
      const p = n();
      (!p.currentSession || p.view !== "session") && n().startSession();
      const m = n(), y = st(), g = Ut(m);
      if (g === "running") {
        n().tickTimer();
        return;
      }
      const l = Wn(m), f = g === "completed" || g === "break" || l > 0 && m.elapsedSeconds >= l, S = f ? 0 : Math.max(0, Number(m.elapsedSeconds) || 0), x = {
        view: "session",
        route: "session",
        ...Et("running", y),
        audioPlaying: !0,
        summaryRecord: null,
        elapsedSeconds: S,
        startedAt: !m.startedAt || f ? new Date(y).toISOString() : m.startedAt,
        timerAnchorAtMs: y - S * 1e3,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        timerDurationSeconds: l,
        ...f ? Js() : {}
      };
      e(x), zn({ ...m, ...x });
    },
    pauseTimer({ pauseAudio: p = !0 } = {}) {
      const m = n(), y = st();
      if (Ut(m) !== "running") {
        p && m.audioPlaying && e({ audioPlaying: !1 });
        return;
      }
      const g = ig(m, y), l = {
        ...g,
        ...Et(g.timerState === "completed" ? "completed" : "paused", y),
        timerAnchorAtMs: null,
        timerPausedAtMs: y,
        audioPlaying: p ? !1 : m.audioPlaying
      };
      e(l), zn({ ...m, ...l });
    },
    resetTimer() {
      const p = st(), m = {
        ...Et("idle", p),
        timerRestoreTarget: null,
        timerMode: "countdown",
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerDurationSeconds: vr(n()),
        audioPlaying: !1,
        startedAt: null,
        elapsedSeconds: 0,
        summaryRecord: null,
        ...Js()
      };
      e(m), zn({ ...n(), ...m });
    },
    skipTimer() {
      const p = n(), m = st(), y = Wn(p), g = {
        ...Et("completed", m),
        elapsedSeconds: y || Math.max(0, Number(p.elapsedSeconds) || 0),
        audioPlaying: !1,
        startedAt: p.startedAt || new Date(m).toISOString(),
        timerAnchorAtMs: null,
        timerPausedAtMs: m,
        timerDurationSeconds: y
      };
      e(g), zn({ ...p, ...g });
    },
    tickTimer() {
      const p = n();
      if (p.view !== "session" || Ut(p) !== "running") return;
      const m = st(), y = Wn(p), g = y ? Math.min(y, Ba(p, m)) : Ba(p, m), l = y > 0 && g >= y ? "completed" : "running", f = {
        ...Et(l, m),
        elapsedSeconds: g,
        timerAnchorAtMs: l === "running" ? p.timerAnchorAtMs : null,
        timerPausedAtMs: l === "running" ? null : m,
        timerDurationSeconds: y,
        audioPlaying: l === "running" ? p.audioPlaying : !1
      };
      g === p.elapsedSeconds && l === Ut(p) || (e(f), zn({ ...p, ...f }));
    },
    setTimerMode(p = "countdown") {
      const m = p === "countup" ? "countup" : "countdown", y = {
        timerMode: m,
        timerDurationSeconds: m === "countup" ? 0 : vr(n())
      };
      e(y), zn({ ...n(), ...y });
    },
    startBreak() {
      const p = st(), m = {
        ...Et("break", p),
        timerRestoreTarget: null,
        timerAnchorAtMs: null,
        timerPausedAtMs: p,
        timerDurationSeconds: 0,
        audioPlaying: !1
      };
      e(m), zn({ ...n(), ...m });
    },
    getTimerState() {
      return Ut(n());
    },
    endSession() {
      var x;
      const p = n(), m = st(), y = new Date(m).toISOString(), g = Ut(p) === "running" ? ig(p, m) : p, l = Wn(g), f = l ? Math.min(l, g.elapsedSeconds) : g.elapsedSeconds, S = zC({
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
        totalFocusTime: f,
        flashcardsCompleted: 0,
        quizScore: null,
        mistakesMade: [],
        completedTasks: [],
        recommendedNextStep: "Start another protected focus block when you are ready."
      });
      ga("focus-room"), e({
        summaryRecord: S,
        sessionHistory: Zc(),
        ...Et("completed", m),
        audioPlaying: !1,
        timerAnchorAtMs: null,
        timerPausedAtMs: m,
        timerDurationSeconds: l,
        elapsedSeconds: l ? Math.min(l, g.elapsedSeconds) : g.elapsedSeconds,
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
        return it({ ...m, ...y }), y;
      });
    },
    setAssistantContext(p = {}) {
      e({ assistantContext: id(p) });
    },
    toggleTask(p) {
      e((m) => {
        const y = m.studyPlan[Number(p)];
        if (!y) return {};
        const g = String(y.task || ""), l = m.completedTasks.includes(g) ? m.completedTasks.filter((f) => f !== g) : [...m.completedTasks, g];
        return it({ ...m, completedTasks: l }), { completedTasks: l };
      });
    },
    updatePlanTask(p, m = null, y = null) {
      e((g) => {
        const l = Number(p), f = g.studyPlan[l];
        if (!f) return {};
        const S = String(f.task || ""), x = y == null ? S : String(y || "").trim(), k = m == null ? f.minutes : kr(m, f.minutes, 1, Ya), A = g.studyPlan.map((E, D) => D === l ? { minutes: k, task: x || S } : E);
        let T = g.completedTasks;
        S && S !== A[l].task && T.includes(S) && (T = T.filter((E) => E !== S).concat(A[l].task));
        const b = { studyPlan: A, completedTasks: T };
        return it({ ...g, ...b }), b;
      });
    },
    setFlashcardIndex(p) {
      const m = eg(n().selectedMaterial);
      e({
        flashcardIndex: kr(p, n().flashcardIndex, 0, Math.max(0, m.length - 1)),
        flashcardSide: "front"
      });
    },
    flipFlashcard() {
      e((p) => ({
        flashcardSide: p.flashcardSide === "back" ? "front" : "back"
      }));
    },
    rateFlashcard(p) {
      const m = n(), y = eg(m.selectedMaterial);
      if (!y.length) return;
      const g = kr(m.flashcardIndex, 0, 0, y.length - 1), l = y[g], f = ["easy", "medium", "hard"].includes(String(p)) ? String(p) : "medium";
      e({
        flashcardProgress: {
          ...m.flashcardProgress,
          [KC(l, g)]: {
            difficulty: f,
            reviewedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        },
        flashcardSide: "front",
        flashcardIndex: g < y.length - 1 ? g + 1 : g
      });
    },
    answerQuizQuestion(p, m) {
      const y = Number(p), g = nd(n().selectedMaterial)[y];
      if (!g) return;
      const l = String(y);
      e((f) => ({
        quizAnswers: {
          ...f.quizAnswers,
          [l]: JC(g, m, f.quizAnswers[l])
        }
      }));
    },
    checkQuizQuestion(p) {
      const m = nd(n().selectedMaterial), y = Number(p), g = m[y];
      if (!g) return;
      const l = String(y), f = n(), S = Object.prototype.hasOwnProperty.call(f.quizAnswers, l) ? f.quizAnswers[l] : "", x = qC(g, S), k = O0(g);
      e({
        quizChecked: {
          ...f.quizChecked,
          [l]: {
            answer: S,
            correct: x === null ? !1 : x,
            hasKnownAnswer: x !== null,
            explanation: g.explanation || g.rationale || (k ? `Correct answer: ${k}` : ""),
            checkedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        }
      });
    },
    async askAssistant(p) {
      const m = String(p || "").trim();
      if (!m) return;
      const y = n(), g = y.selectedMaterial, l = mi(y.chatMessages).slice(-10).map((f) => ({
        role: f.role === "user" ? "user" : "assistant",
        content: f.text
      }));
      e({
        chatMessages: mi([
          ...y.chatMessages,
          { role: "user", text: m, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
        ]),
        chatPending: !0,
        chatError: ""
      });
      try {
        const f = await mP(m, l, g, y.assistantContext);
        e((S) => ({
          chatMessages: mi([
            ...S.chatMessages,
            { role: "assistant", text: f.answer, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: f.offline ? "Using a local Focus Room reply because the AI tutor service is not connected." : ""
        }));
      } catch (f) {
        e((S) => ({
          chatMessages: mi([
            ...S.chatMessages,
            { role: "assistant", text: L0(m, g, n().studyGoal), createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: `AI tutor unavailable: ${f.message || "request failed"}`
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
      return D0(n().elapsedSeconds);
    }
  };
});
function W0({ compact: e = !1, className: n = "" }) {
  const o = Y((f) => f.focusTopics), i = Y((f) => f.activeTopicId), a = Y((f) => f.addFocusTopic), d = Y((f) => f.updateFocusTopic), c = Y((f) => f.finishFocusTopic), p = Y((f) => f.removeFocusTopic), m = Y((f) => f.activateFocusTopic), y = of(o, i), g = (o || []).filter((f) => f.status !== "done").length, l = (o || []).filter((f) => f.status === "done").length;
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
          l ? ` ${l} done · ${g} open.` : null
        ] }),
        /* @__PURE__ */ w.jsx("div", { className: "focus-topics-list", children: (o || []).map((f, S) => {
          const x = f.id === (y == null ? void 0 : y.id), k = f.status === "done";
          return /* @__PURE__ */ w.jsxs(
            "article",
            {
              className: `focus-topic-card ${x ? "is-active" : ""} ${k ? "is-done" : ""}`.trim(),
              "data-focus-topic-id": f.id,
              "data-focus-topic-status": f.status,
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
                        onClick: () => m(f.id),
                        "aria-label": `Activate topic ${f.title}`,
                        children: "Use"
                      }
                    ) : null,
                    k ? null : /* @__PURE__ */ w.jsxs(
                      "button",
                      {
                        type: "button",
                        className: "focus-topic-action is-success",
                        onClick: () => c(f.id),
                        "aria-label": `Mark topic ${f.title} as done`,
                        "data-focus-topic-finish": f.id,
                        children: [
                          /* @__PURE__ */ w.jsx(Qa, { size: 13, "aria-hidden": "true" }),
                          "Done"
                        ]
                      }
                    ),
                    /* @__PURE__ */ w.jsx(
                      "button",
                      {
                        type: "button",
                        className: "focus-topic-action is-danger",
                        onClick: () => p(f.id),
                        "aria-label": `Delete topic ${f.title}`,
                        "data-focus-topic-remove": f.id,
                        disabled: (o || []).length <= 1,
                        children: /* @__PURE__ */ w.jsx(Zb, { size: 13, "aria-hidden": "true" })
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
                      value: f.title,
                      onChange: (A) => d(f.id, { title: A.target.value }),
                      placeholder: "Topic title",
                      disabled: k,
                      "data-focus-topic-title": f.id
                    }
                  )
                ] }),
                /* @__PURE__ */ w.jsxs("label", { className: "focus-topic-field", children: [
                  /* @__PURE__ */ w.jsx("span", { children: "Description" }),
                  /* @__PURE__ */ w.jsx(
                    "textarea",
                    {
                      value: f.description,
                      onChange: (A) => d(f.id, { description: A.target.value }),
                      placeholder: "What will you do in this block?",
                      rows: e ? 2 : 3,
                      disabled: k,
                      "data-focus-topic-description": f.id
                    }
                  )
                ] })
              ]
            },
            f.id
          );
        }) })
      ]
    }
  );
}
function ag({ scene: e, active: n, onSelect: o, variant: i = "default" }) {
  return i === "gallery" ? /* @__PURE__ */ w.jsxs(
    vn.button,
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
    vn.button,
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
const qs = 8;
function sf({ variant: e = "default" }) {
  const n = Y((y) => y.selectedScene), o = Y((y) => y.selectScene), [i, a] = C.useState(0), d = C.useMemo(() => e === "gallery" ? jC : Sn.filter((y) => !y.galleryOnly || y.id === n), [n, e]), c = Math.max(1, Math.ceil(d.length / qs)), p = Math.min(i, c - 1), m = e === "gallery" ? d.slice(p * qs, p * qs + qs) : d;
  return e !== "gallery" ? /* @__PURE__ */ w.jsx("div", { className: "scene-selector", "aria-label": "Study scenes", children: m.map((y) => /* @__PURE__ */ w.jsx(
    ag,
    {
      scene: y,
      active: y.id === n,
      onSelect: o
    },
    y.id
  )) }) : /* @__PURE__ */ w.jsxs("div", { className: "scene-selector-wrap", "aria-label": "Study scenes", children: [
    /* @__PURE__ */ w.jsx("div", { className: "scene-selector scene-selector-gallery", children: m.map((y) => /* @__PURE__ */ w.jsx(
      ag,
      {
        scene: y,
        active: y.id === n,
        onSelect: o,
        variant: "gallery"
      },
      y.id
    )) }),
    c > 1 ? /* @__PURE__ */ w.jsxs("div", { className: "scene-pagination", "aria-label": "Scene pages", children: [
      /* @__PURE__ */ w.jsx(
        "button",
        {
          type: "button",
          className: "scene-page-arrow scene-page-button-left",
          onClick: () => a((y) => Math.max(0, y - 1)),
          disabled: p <= 0,
          "aria-label": "Previous scenes",
          children: /* @__PURE__ */ w.jsx(pb, { size: 18, "aria-hidden": "true" })
        }
      ),
      /* @__PURE__ */ w.jsx(
        "button",
        {
          type: "button",
          className: "scene-page-arrow scene-page-button-right",
          onClick: () => a((y) => Math.min(c - 1, y + 1)),
          disabled: p >= c - 1,
          "aria-label": "Next scenes",
          children: /* @__PURE__ */ w.jsx(hb, { size: 18, "aria-hidden": "true" })
        }
      )
    ] }) : null
  ] });
}
const lg = [
  { label: "Lo-fi Chill", icon: Pb, musicType: "Lo-fi", ambientSound: "Cafe Rain" },
  { label: "Ambient Piano", icon: Rb, musicType: "Piano", ambientSound: "Nature" },
  { label: "Nature Ambient", icon: rf, musicType: "Deep Focus", ambientSound: "Nature" },
  { label: "Acoustic Warm", icon: gb, musicType: "Minimal", ambientSound: "White Noise" },
  { label: "Deep Focus", icon: Ob, musicType: "Deep Focus", ambientSound: "White Noise" }
];
function hP({ onWorkspace: e }) {
  const n = Y((b) => b.selectedScene), o = Y((b) => b.pomodoroDuration), i = Y((b) => b.timerMode), a = Y((b) => b.musicType), d = Y((b) => b.focusTopics), c = Y((b) => b.setPomodoroDuration), p = Y((b) => b.setTimerMode), m = Y((b) => b.setSound), y = Y((b) => b.startSession), [g, l] = C.useState(!1), f = C.useMemo(
    () => {
      var b;
      return ((b = lg.find((E) => E.musicType === a)) == null ? void 0 : b.label) || "";
    },
    [a]
  ), S = (d || []).filter((b) => b.status !== "done").length, x = (b) => {
    m("musicType", b.musicType), m("ambientSound", b.ambientSound);
  }, k = (b) => {
    p("countdown"), c(b);
  }, A = () => {
    n && y();
  }, T = () => {
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
            onClick: T,
            "aria-label": "Open Focus Trail",
            title: "Open Focus Trail",
            children: /* @__PURE__ */ w.jsx(kb, { size: 18, "aria-hidden": "true" })
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
            children: /* @__PURE__ */ w.jsx(lb, { size: 20, "aria-hidden": "true" })
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
        /* @__PURE__ */ w.jsx(sf, { variant: "gallery" })
      ] }),
      /* @__PURE__ */ w.jsxs("aside", { className: "innook-control-rail", "aria-label": "Study settings", children: [
        /* @__PURE__ */ w.jsx("div", { className: "innook-rail-group", "aria-label": "Music atmosphere", children: lg.map((b) => {
          const E = b.icon, D = f === b.label;
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
          A0.map((b) => {
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
            className: `innook-rail-icon ${g ? "is-active" : ""}`.trim(),
            onClick: () => l((b) => !b),
            "aria-label": "Edit focus topics",
            "aria-expanded": g,
            title: "Edit focus topics",
            "data-focus-topics-toggle": "true",
            children: [
              /* @__PURE__ */ w.jsx(Qb, { size: 16, "aria-hidden": "true" }),
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
            children: /* @__PURE__ */ w.jsx(cb, { size: 22, "aria-hidden": "true" })
          }
        ),
        g ? /* @__PURE__ */ w.jsx("div", { className: "innook-goal-popover innook-topics-popover", "data-focus-topics-popover": "true", children: /* @__PURE__ */ w.jsx(W0, { compact: !0 }) }) : null
      ] })
    ] })
  ] });
}
function Pe({
  children: e,
  className: n = "",
  variant: o = "ghost",
  type: i = "button",
  ...a
}) {
  const { onPointerMove: d, onPointerLeave: c, ...p } = a;
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
        m.currentTarget.style.setProperty("--glass-x", "50%"), m.currentTarget.style.setProperty("--glass-y", "0%"), c == null || c(m);
      },
      ...p,
      children: e
    }
  );
}
function yP({ onWorkspace: e, onOpenTrail: n, onOpenCompanion: o, onOpenSettings: i, onExit: a }) {
  const d = Y((p) => p.selectedScene), c = gn(d);
  return /* @__PURE__ */ w.jsxs("header", { className: "focus-room-header", children: [
    /* @__PURE__ */ w.jsxs("button", { type: "button", className: "focus-wordmark", onClick: e, "aria-label": "Return to Synapse workspace", children: [
      /* @__PURE__ */ w.jsx("span", { className: "focus-wordmark-mark", children: "S" }),
      /* @__PURE__ */ w.jsx("span", { children: "synapse" })
    ] }),
    /* @__PURE__ */ w.jsxs("div", { className: "focus-room-context", "aria-label": "Current focus context", children: [
      /* @__PURE__ */ w.jsx("span", { children: c.name }),
      /* @__PURE__ */ w.jsx("small", { children: "Quiet study room" })
    ] }),
    /* @__PURE__ */ w.jsxs("nav", { className: "focus-room-header-actions", "aria-label": "Focus Room controls", children: [
      /* @__PURE__ */ w.jsxs(Pe, { className: "header-icon-button", onClick: n, title: "Open Focus Trail", "aria-label": "Open Focus Trail", children: [
        /* @__PURE__ */ w.jsx(Oa, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Focus Trail" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { className: "header-icon-button", onClick: o, title: "Open Companion Room", "aria-label": "Open Companion Room", children: [
        /* @__PURE__ */ w.jsx(La, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Companion" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { className: "header-icon-button", onClick: i, title: "Open room settings", "aria-label": "Open room settings", children: [
        /* @__PURE__ */ w.jsx(z0, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Settings" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { className: "header-icon-button header-exit-button", onClick: a, title: "Exit Focus Room", "aria-label": "Exit Focus Room", children: [
        /* @__PURE__ */ w.jsx(xb, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Exit" })
      ] })
    ] })
  ] });
}
const G0 = {
  minutes: Math.floor(N0 / 60),
  seconds: 59
}, gP = {
  minutes: 3,
  seconds: 2
};
function af(e) {
  const n = nn(e, tf);
  return {
    minutes: Math.floor(n / 60),
    seconds: n % 60
  };
}
function ug(e, n) {
  const o = Math.max(0, Math.floor(Number(e) || 0)), i = Math.max(0, Math.floor(Number(n) || 0));
  return nn(o * 60 + i, tf);
}
function sd(e, n) {
  return String(Math.max(0, Math.floor(Number(e) || 0))).padStart(2, "0");
}
function lf(e) {
  const { minutes: n, seconds: o } = af(e);
  return `${sd(n, "minutes")}:${sd(o, "seconds")}`;
}
function vP(e, n, o) {
  const i = gP[o] || 2;
  return `${String(e || "").replace(/\D/g, "")}${String(n).replace(/\D/g, "")}`.slice(-i) || "";
}
function SP(e, n) {
  const o = Number(String(e || "").replace(/\D/g, "")) || 0;
  return Math.min(G0[n], o);
}
function wP(e, n, o) {
  const i = af(e), a = SP(o, n);
  return n === "seconds" ? ug(i.minutes, a) : ug(a, i.seconds);
}
const xP = { minutes: "Minutes", seconds: "Seconds" };
function cg({
  segment: e,
  value: n,
  disabled: o,
  active: i,
  onFocusSegment: a,
  onType: d,
  onCommit: c,
  onMove: p,
  segmentRef: m
}) {
  const y = xP[e], g = (l) => {
    if (o) return;
    const { key: f } = l;
    if (f >= "0" && f <= "9") {
      l.preventDefault(), d(e, f);
      return;
    }
    if (f === "ArrowLeft") {
      l.preventDefault(), p(-1);
      return;
    }
    if (f === "ArrowRight" || f === "Tab" && !l.shiftKey && e === "minutes") {
      f === "ArrowRight" && (l.preventDefault(), p(1));
      return;
    }
    (f === "Backspace" || f === "Delete") && (l.preventDefault(), c());
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
      "aria-valuemax": G0[e],
      "aria-valuenow": n,
      "aria-valuetext": `${n} ${y.toLowerCase()}`,
      "aria-disabled": o || void 0,
      onFocus: () => a(e),
      onKeyDown: g,
      children: sd(n, e)
    }
  ) });
}
function _P({
  valueSeconds: e,
  onChange: n,
  disabled: o = !1,
  size: i = "hero",
  ariaLabel: a = "Set focus block length",
  className: d = ""
}) {
  const { minutes: c, seconds: p } = af(e), [m, y] = C.useState(null), g = C.useRef(""), l = C.useRef(null), f = C.useRef(null), S = C.useRef(null), x = C.useCallback(() => {
    g.current = "";
  }, []), k = C.useCallback((E) => {
    g.current = "", y(E);
  }, []), A = C.useCallback(
    (E, D) => {
      if (o) return;
      const O = vP(g.current, D, E);
      g.current = O, y(E), n == null || n(wP(e, E, O));
    },
    [o, n, e]
  ), T = C.useCallback((E) => {
    var O;
    const D = E < 0 ? "minutes" : "seconds";
    g.current = "", y(D), (O = (E < 0 ? l : f).current) == null || O.focus();
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
        o ? /* @__PURE__ */ w.jsx("span", { className: "timer-editor-static", "aria-hidden": "true", children: lf(e) }) : /* @__PURE__ */ w.jsxs(w.Fragment, { children: [
          /* @__PURE__ */ w.jsx(
            cg,
            {
              segment: "minutes",
              value: c,
              disabled: o,
              active: m === "minutes",
              segmentRef: l,
              onFocusSegment: k,
              onType: A,
              onCommit: x,
              onMove: T
            }
          ),
          /* @__PURE__ */ w.jsx("span", { className: "timer-editor-colon", "aria-hidden": "true", children: ":" }),
          /* @__PURE__ */ w.jsx(
            cg,
            {
              segment: "seconds",
              value: p,
              disabled: o,
              active: m === "seconds",
              segmentRef: f,
              onFocusSegment: k,
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
function TP(e, n) {
  return n ? Math.min(100, Math.max(0, e / n * 100)) : 0;
}
function kP({ onFocusMode: e, audioState: n }) {
  const o = Y((re) => re.timerStatus), i = Y((re) => re.elapsedSeconds), a = Y((re) => re.pomodoroDuration), d = Y((re) => re.pomodoroDurationSeconds), c = Y((re) => re.timerMode), p = Y((re) => re.studyGoal), m = Y((re) => re.focusTopics), y = Y((re) => re.activeTopicId), g = Y((re) => re.currentSession), l = Y((re) => re.startTimer), f = Y((re) => re.pauseTimer), S = Y((re) => re.resetTimer), x = Y((re) => re.skipTimer), k = Y((re) => re.toggleAudio), A = Y((re) => re.audioPlaying), T = Y((re) => re.setPomodoroDurationSeconds), b = Y((re) => re.finishFocusTopic), E = of(m, y), D = Number(d) || (Number(a) || 0) * 60, O = c === "countup" ? i : Math.max(0, D - i), H = o === "paused", W = o === "studying", G = o === "completed", K = o === "idle" && c !== "countup", X = G && c !== "countup" ? "00:00" : td(O), se = H ? "Paused" : G ? "Complete" : W ? "In focus" : "Ready", Z = H ? "Resume timer" : W ? "Pause timer" : "Start timer", de = (E == null ? void 0 : E.title) || p || "A quiet block for meaningful progress", ce = (E == null ? void 0 : E.description) || "", Se = !!(E && E.status !== "done");
  return /* @__PURE__ */ w.jsxs("div", { className: "focus-session-dock liquid-glass", "aria-label": "Focus session controls", children: [
    /* @__PURE__ */ w.jsxs("div", { className: "dock-timer-block", children: [
      /* @__PURE__ */ w.jsxs("div", { className: "dock-eyebrow", children: [
        "POMODORO #",
        (g == null ? void 0 : g.pomodoroNumber) || 1
      ] }),
      /* @__PURE__ */ w.jsxs("div", { className: "dock-status", children: [
        /* @__PURE__ */ w.jsx("span", { className: `dock-status-dot ${H || !W ? "is-paused" : ""}` }),
        se
      ] }),
      K ? /* @__PURE__ */ w.jsx(
        _P,
        {
          className: "dock-time-editor",
          valueSeconds: D,
          onChange: T,
          size: "dock",
          ariaLabel: "Set focus block length"
        }
      ) : /* @__PURE__ */ w.jsx("strong", { className: "dock-time", "aria-live": "off", children: X }),
      /* @__PURE__ */ w.jsx("div", { className: "dock-progress", "aria-hidden": "true", children: /* @__PURE__ */ w.jsx("span", { style: { width: `${TP(i, D)}%` } }) })
    ] }),
    /* @__PURE__ */ w.jsxs("div", { className: "dock-goal-block", "data-focus-active-topic": "true", children: [
      /* @__PURE__ */ w.jsx("span", { className: "dock-eyebrow", children: "ACTIVE TOPIC" }),
      /* @__PURE__ */ w.jsx("strong", { children: de }),
      ce ? /* @__PURE__ */ w.jsx("span", { className: "dock-goal-description", children: ce }) : null,
      /* @__PURE__ */ w.jsxs("span", { className: "dock-goal-meta", children: [
        c === "countup" ? "Count-up" : `${lf(D)} block`,
        " · ",
        td(i),
        " focused"
      ] }),
      Se ? /* @__PURE__ */ w.jsxs(
        "button",
        {
          type: "button",
          className: "dock-topic-finish",
          onClick: () => b(E.id),
          "data-focus-topic-finish-dock": "true",
          "aria-label": "Mark active topic done and switch to the next",
          children: [
            /* @__PURE__ */ w.jsx(Qa, { size: 13, "aria-hidden": "true" }),
            "Done · next topic"
          ]
        }
      ) : null
    ] }),
    /* @__PURE__ */ w.jsxs("div", { className: "dock-action-block", children: [
      /* @__PURE__ */ w.jsxs(Pe, { className: "dock-action-button", onClick: k, "aria-label": A ? "Pause room audio" : "Play room audio", children: [
        A ? /* @__PURE__ */ w.jsx(ng, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(Xa, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: n != null && n.playing ? "Pause audio" : "Audio" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { className: "dock-action-button", onClick: () => W ? f() : l(), variant: "primary", "aria-label": Z, children: [
        W ? /* @__PURE__ */ w.jsx(ng, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(Nb, { size: 15, fill: "currentColor", "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: H ? "Resume" : W ? "Pause" : "Start" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { className: "dock-action-button", onClick: x, "aria-label": "Skip timer", children: [
        /* @__PURE__ */ w.jsx(Wb, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Skip" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { className: "dock-action-button", onClick: S, "aria-label": "Reset timer", children: [
        /* @__PURE__ */ w.jsx(Vb, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Reset" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { className: "dock-focus-mode", onClick: e, "aria-label": "Enter distraction-free Focus Mode", children: [
        /* @__PURE__ */ w.jsx(Kb, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Focus Mode" })
      ] })
    ] })
  ] });
}
var AP = Object.defineProperty, xo = (e, n) => AP(e, "name", { value: n, configurable: !0 }), K0 = !!(typeof window < "u" && window.document && window.document.createElement);
function Cr(e, n, { checkForDefaultPrevented: o = !0 } = {}) {
  return /* @__PURE__ */ xo(function(a) {
    if (e == null || e(a), o === !1 || !a || !a.defaultPrevented)
      return n == null ? void 0 : n(a);
  }, "handleEvent");
}
xo(Cr, "composeEventHandlers");
function CP(e) {
  var n;
  if (!K0)
    throw new Error("Cannot access window outside of the DOM");
  return ((n = e == null ? void 0 : e.ownerDocument) == null ? void 0 : n.defaultView) ?? window;
}
xo(CP, "getOwnerWindow");
function ad(e) {
  if (!K0)
    throw new Error("Cannot access document outside of the DOM");
  return (e == null ? void 0 : e.ownerDocument) ?? document;
}
xo(ad, "getOwnerDocument");
function Y0(e, n = !1) {
  const { activeElement: o } = ad(e);
  if (!(o != null && o.nodeName))
    return null;
  if (Q0(o) && o.contentDocument)
    return Y0(o.contentDocument.body, n);
  if (n) {
    const i = o.getAttribute("aria-activedescendant");
    if (i) {
      const a = ad(o).getElementById(i);
      if (a)
        return a;
    }
  }
  return o;
}
xo(Y0, "getActiveElement");
function Q0(e) {
  return e.tagName === "IFRAME";
}
xo(Q0, "isFrame");
var bP = Object.defineProperty, uf = (e, n) => bP(e, "name", { value: n, configurable: !0 });
function ld(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
uf(ld, "setRef");
function X0(...e) {
  return (n) => {
    let o = !1;
    const i = e.map((a) => {
      const d = ld(a, n);
      return !o && typeof d == "function" && (o = !0), d;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const d = i[a];
          typeof d == "function" ? d() : ld(e[a], null);
        }
      };
  };
}
uf(X0, "composeRefs");
function _o(...e) {
  return C.useCallback(X0(...e), e);
}
uf(_o, "useComposedRefs");
var PP = Object.defineProperty, Rt = (e, n) => PP(e, "name", { value: n, configurable: !0 });
// @__NO_SIDE_EFFECTS__
function EP(e, n) {
  const o = C.createContext(n);
  o.displayName = e + "Context";
  const i = /* @__PURE__ */ Rt((d) => {
    const { children: c, ...p } = d, m = C.useMemo(() => p, Object.values(p));
    return /* @__PURE__ */ w.jsx(o.Provider, { value: m, children: c });
  }, "Provider");
  i.displayName = e + "Provider";
  function a(d, c = {}) {
    const { optional: p = !1 } = c, m = C.useContext(o);
    if (m) return m;
    if (n !== void 0) return n;
    if (!p)
      throw new Error(`\`${d}\` must be used within \`${e}\``);
  }
  return Rt(a, "useContext"), [i, a];
}
Rt(EP, "createContext");
// @__NO_SIDE_EFFECTS__
function Z0(e, n = []) {
  let o = [];
  function i(d, c) {
    const p = C.createContext(c);
    p.displayName = d + "Context";
    const m = o.length;
    o = [...o, c];
    const y = /* @__PURE__ */ Rt((l) => {
      var T;
      const { scope: f, children: S, ...x } = l, k = ((T = f == null ? void 0 : f[e]) == null ? void 0 : T[m]) || p, A = C.useMemo(() => x, Object.values(x));
      return /* @__PURE__ */ w.jsx(k.Provider, { value: A, children: S });
    }, "Provider");
    y.displayName = d + "Provider";
    function g(l, f, S = {}) {
      var T;
      const { optional: x = !1 } = S, k = ((T = f == null ? void 0 : f[e]) == null ? void 0 : T[m]) || p, A = C.useContext(k);
      if (A) return A;
      if (c !== void 0) return c;
      if (!x)
        throw new Error(`\`${l}\` must be used within \`${d}\``);
    }
    return Rt(g, "useContext"), [y, g];
  }
  Rt(i, "createContext");
  const a = /* @__PURE__ */ Rt(() => {
    const d = o.map((c) => C.createContext(c));
    return /* @__PURE__ */ Rt(function(p) {
      const m = (p == null ? void 0 : p[e]) || d;
      return C.useMemo(
        () => ({ [`__scope${e}`]: { ...p, [e]: m } }),
        [p, m]
      );
    }, "useScope");
  }, "createScope");
  return a.scopeName = e, [i, J0(a, ...n)];
}
Rt(Z0, "createContextScope");
function J0(...e) {
  const n = e[0];
  if (e.length === 1) return n;
  const o = /* @__PURE__ */ Rt(() => {
    const i = e.map((a) => ({
      useScope: a(),
      scopeName: a.scopeName
    }));
    return /* @__PURE__ */ Rt(function(d) {
      const c = i.reduce((p, { useScope: m, scopeName: y }) => {
        const l = m(d)[`__scope${y}`];
        return { ...p, ...l };
      }, {});
      return C.useMemo(() => ({ [`__scope${n.scopeName}`]: c }), [c]);
    }, "useComposedScopes");
  }, "createScope");
  return o.scopeName = n.scopeName, o;
}
Rt(J0, "composeContextScopes");
var Zn = globalThis != null && globalThis.document ? C.useLayoutEffect : () => {
}, MP = Object.defineProperty, RP = (e, n) => MP(e, "name", { value: n, configurable: !0 }), DP = Pr[" useId ".trim().toString()] || (() => {
}), NP = 0;
function va(e) {
  const [n, o] = C.useState(DP());
  return Zn(() => {
    e || o((i) => i ?? String(NP++));
  }, [e]), e || (n ? `radix-${n}` : "");
}
RP(va, "useId");
var jP = Object.defineProperty, IP = (e, n) => jP(e, "name", { value: n, configurable: !0 }), dg = Pr[" useEffectEvent ".trim().toString()], fg = Pr[" useInsertionEffect ".trim().toString()];
function q0(e) {
  if (typeof dg == "function")
    return dg(e);
  const n = C.useRef(() => {
    throw new Error("Cannot call an event handler while rendering.");
  });
  return typeof fg == "function" ? fg(() => {
    n.current = e;
  }) : Zn(() => {
    n.current = e;
  }), C.useMemo(() => ((...o) => {
    var i;
    return (i = n.current) == null ? void 0 : i.call(n, ...o);
  }), []);
}
IP(q0, "useEffectEvent");
var FP = Object.defineProperty, Ni = (e, n) => FP(e, "name", { value: n, configurable: !0 }), OP = Pr[" useInsertionEffect ".trim().toString()] || Zn;
function eS({
  prop: e,
  defaultProp: n,
  onChange: o = /* @__PURE__ */ Ni(() => {
  }, "onChange"),
  caller: i
}) {
  const [a, d, c] = tS({
    defaultProp: n,
    onChange: o
  }), p = e !== void 0, m = p ? e : a, y = C.useCallback(
    (g) => {
      var l;
      if (p) {
        const f = nS(g) ? g(e) : g;
        f !== e && ((l = c.current) == null || l.call(c, f));
      } else
        d(g);
    },
    [p, e, d, c]
  );
  return [m, y];
}
Ni(eS, "useControllableState");
function tS({
  defaultProp: e,
  onChange: n
}) {
  const [o, i] = C.useState(e), a = C.useRef(o), d = C.useRef(n);
  return OP(() => {
    d.current = n;
  }, [n]), C.useEffect(() => {
    var c;
    a.current !== o && ((c = d.current) == null || c.call(d, o), a.current = o);
  }, [o, a]), [o, i, d];
}
Ni(tS, "useUncontrolledState");
function nS(e) {
  return typeof e == "function";
}
Ni(nS, "isFunction");
var pg = Symbol("RADIX:SYNC_STATE");
function LP(e, n, o, i) {
  const { prop: a, defaultProp: d, onChange: c, caller: p } = n, m = a !== void 0, y = q0(c), g = [{ ...o, state: d }];
  i && g.push(i);
  const [l, f] = C.useReducer(
    (A, T) => {
      if (T.type === pg)
        return { ...A, state: T.state };
      const b = e(A, T);
      return m && !Object.is(b.state, A.state) && y(b.state), b;
    },
    ...g
  ), S = l.state, x = C.useRef(S);
  C.useEffect(() => {
    x.current !== S && (x.current = S, m || y(S));
  }, [S, x, m]);
  const k = C.useMemo(() => a !== void 0 ? { ...l, state: a } : l, [l, a]);
  return C.useEffect(() => {
    m && !Object.is(a, l.state) && f({ type: pg, state: a });
  }, [a, l.state, m]), [k, f];
}
Ni(LP, "useControllableStateReducer");
var rS = jg(), VP = Object.defineProperty, Wt = (e, n) => VP(e, "name", { value: n, configurable: !0 });
// @__NO_SIDE_EFFECTS__
function cf(e) {
  const n = C.forwardRef((o, i) => {
    let { children: a, ...d } = o, c = null, p = !1;
    const m = [];
    ud(a) && typeof ea == "function" && (a = ea(a._payload)), C.Children.forEach(a, (f) => {
      var S;
      if (aS(f)) {
        p = !0;
        const x = f;
        let k = "child" in x.props ? x.props.child : x.props.children;
        ud(k) && typeof ea == "function" && (k = ea(k._payload)), c = zP(x, k), m.push((S = c == null ? void 0 : c.props) == null ? void 0 : S.children);
      } else
        m.push(f);
    }), c ? c = C.cloneElement(c, void 0, m) : (
      // A `Slottable` was found but it didn't resolve to a single element (e.g.
      // it wrapped multiple elements, text, or a render-prop `child` that
      // wasn't an element). Don't fall back to treating the `Slottable` wrapper
      // itself as the slot target — throw a descriptive error below instead.
      !p && C.Children.count(a) === 1 && C.isValidElement(a) && (c = a)
    );
    const y = c ? sS(c) : void 0, g = _o(i, y);
    if (!c) {
      if (a || a === 0)
        throw new Error(
          p ? HP(e) : UP(e)
        );
      return a;
    }
    const l = iS(d, c.props ?? {});
    return c.type !== C.Fragment && (l.ref = i ? g : y), C.cloneElement(c, l);
  });
  return n.displayName = `${e}.Slot`, n;
}
Wt(cf, "createSlot");
var oS = Symbol.for("radix.slottable");
// @__NO_SIDE_EFFECTS__
function BP(e) {
  const n = /* @__PURE__ */ Wt((o) => "child" in o ? o.children(o.child) : o.children, "Slottable");
  return n.displayName = `${e}.Slottable`, n.__radixId = oS, n;
}
Wt(BP, "createSlottable");
var zP = /* @__PURE__ */ Wt((e, n) => {
  if ("child" in e.props) {
    const o = e.props.child;
    return C.isValidElement(o) ? C.cloneElement(o, void 0, e.props.children(o.props.children)) : null;
  }
  return C.isValidElement(n) ? n : null;
}, "getSlottableElementFromSlottable");
function iS(e, n) {
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
Wt(iS, "mergeProps");
function sS(e) {
  var i, a;
  let n = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = n && "isReactWarning" in n && n.isReactWarning;
  return o ? e.ref : (n = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = n && "isReactWarning" in n && n.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
Wt(sS, "getElementRef");
function aS(e) {
  return C.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === oS;
}
Wt(aS, "isSlottable");
var $P = Symbol.for("react.lazy");
function ud(e) {
  return e != null && typeof e == "object" && "$$typeof" in e && e.$$typeof === $P && "_payload" in e && lS(e._payload);
}
Wt(ud, "isLazyComponent");
function lS(e) {
  return typeof e == "object" && e !== null && "then" in e;
}
Wt(lS, "isPromiseLike");
var UP = /* @__PURE__ */ Wt((e) => `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`, "createSlotError"), HP = /* @__PURE__ */ Wt((e) => `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`, "createSlottableError"), ea = Pr[" use ".trim().toString()], WP = Object.defineProperty, GP = (e, n) => WP(e, "name", { value: n, configurable: !0 }), KP = [
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
], To = KP.reduce((e, n) => {
  const o = /* @__PURE__ */ cf(`Primitive.${n}`), i = C.forwardRef((a, d) => {
    const { asChild: c, ...p } = a, m = c ? o : n;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ w.jsx(m, { ...p, ref: d });
  });
  return i.displayName = `Primitive.${n}`, { ...e, [n]: i };
}, {});
function uS(e, n) {
  e && rS.flushSync(() => e.dispatchEvent(n));
}
GP(uS, "dispatchDiscreteCustomEvent");
var YP = Object.defineProperty, QP = (e, n) => YP(e, "name", { value: n, configurable: !0 });
function go(e) {
  const n = C.useRef(e);
  return C.useEffect(() => {
    n.current = e;
  }), C.useMemo(() => ((...o) => {
    var i;
    return (i = n.current) == null ? void 0 : i.call(n, ...o);
  }), []);
}
QP(go, "useCallbackRef");
var XP = Object.defineProperty, Ye = (e, n) => XP(e, "name", { value: n, configurable: !0 }), cd = "dismissableLayer.update", ZP = "dismissableLayer.pointerDownOutside", JP = "dismissableLayer.focusOutside", mg, cS = C.createContext({
  layers: /* @__PURE__ */ new Set(),
  layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
  branches: /* @__PURE__ */ new Set(),
  // Outside elements that belong to a layer's own dismiss affordance (eg, a
  // dialog overlay). Pressing them should dismiss the layer regardless of
  // whether or not they stop propagation.
  //
  // See https://github.com/radix-ui/primitives/issues/3346
  dismissableSurfaces: /* @__PURE__ */ new Set()
}), qP = /* @__PURE__ */ C.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Ye(function(n, o) {
    const {
      disableOutsidePointerEvents: i = !1,
      deferPointerDownOutside: a = !1,
      onEscapeKeyDown: d,
      onPointerDownOutside: c,
      onFocusOutside: p,
      onInteractOutside: m,
      onDismiss: y,
      ...g
    } = n, l = C.useContext(cS), [f, S] = C.useState(null), x = (f == null ? void 0 : f.ownerDocument) ?? (globalThis == null ? void 0 : globalThis.document), [, k] = C.useState({}), A = _o(o, S), T = Array.from(l.layers), [b] = [
      ...l.layersWithOutsidePointerEventsDisabled
    ].slice(-1), E = b ? T.indexOf(b) : -1, D = f ? T.indexOf(f) : -1, O = l.layersWithOutsidePointerEventsDisabled.size > 0, H = D >= E, W = C.useRef(!1), G = fS(
      (Z) => {
        c == null || c(Z), m == null || m(Z), Z.defaultPrevented || y == null || y();
      },
      {
        ownerDocument: x,
        deferPointerDownOutside: a,
        isDeferredPointerDownOutsideRef: W,
        dismissableSurfaces: l.dismissableSurfaces,
        shouldHandlePointerDownOutside: C.useCallback(
          (Z) => {
            if (!(Z instanceof Node))
              return !1;
            const de = [...l.branches].some(
              (ce) => ce.contains(Z)
            );
            return H && !de;
          },
          [l.branches, H]
        )
      }
    ), K = pS((Z) => {
      if (a && W.current)
        return;
      const de = Z.target;
      [...l.branches].some((Se) => Se.contains(de)) || (p == null || p(Z), m == null || m(Z), Z.defaultPrevented || y == null || y());
    }, x), X = f ? D === T.length - 1 : !1, se = go((Z) => {
      Z.key === "Escape" && (d == null || d(Z), !Z.defaultPrevented && y && (Z.preventDefault(), y()));
    });
    return C.useEffect(() => {
      if (X)
        return x.addEventListener("keydown", se, { capture: !0 }), () => x.removeEventListener("keydown", se, { capture: !0 });
    }, [x, X, se]), C.useEffect(() => {
      if (f)
        return i && (l.layersWithOutsidePointerEventsDisabled.size === 0 && (mg = x.body.style.pointerEvents, x.body.style.pointerEvents = "none"), l.layersWithOutsidePointerEventsDisabled.add(f)), l.layers.add(f), dd(), () => {
          i && (l.layersWithOutsidePointerEventsDisabled.delete(f), l.layersWithOutsidePointerEventsDisabled.size === 0 && (x.body.style.pointerEvents = mg));
        };
    }, [f, x, i, l]), C.useEffect(() => () => {
      f && (l.layers.delete(f), l.layersWithOutsidePointerEventsDisabled.delete(f), dd());
    }, [f, l]), C.useEffect(() => {
      const Z = /* @__PURE__ */ Ye(() => k({}), "handleUpdate");
      return document.addEventListener(cd, Z), () => document.removeEventListener(cd, Z);
    }, []), /* @__PURE__ */ w.jsx(
      To.div,
      {
        ...g,
        ref: A,
        style: {
          pointerEvents: O ? H ? "auto" : "none" : void 0,
          ...n.style
        },
        onFocusCapture: Cr(n.onFocusCapture, K.onFocusCapture),
        onBlurCapture: Cr(n.onBlurCapture, K.onBlurCapture),
        onPointerDownCapture: Cr(
          n.onPointerDownCapture,
          G.onPointerDownCapture
        )
      }
    );
  }, "DismissableLayer")
);
function dS() {
  const e = C.useContext(cS), [n, o] = C.useState(null);
  return C.useEffect(() => {
    if (n)
      return e.dismissableSurfaces.add(n), () => {
        e.dismissableSurfaces.delete(n);
      };
  }, [n, e.dismissableSurfaces]), o;
}
Ye(dS, "useDismissableLayerSurface");
var eE = /* @__PURE__ */ Ye(() => !0, "IS_TRUE");
function fS(e, n) {
  const {
    ownerDocument: o = globalThis == null ? void 0 : globalThis.document,
    deferPointerDownOutside: i = !1,
    isDeferredPointerDownOutsideRef: a,
    dismissableSurfaces: d,
    shouldHandlePointerDownOutside: c = eE
  } = n, p = go(e), m = C.useRef(!1), y = C.useRef(!1), g = C.useRef(/* @__PURE__ */ new Map()), l = C.useRef(() => {
  });
  return C.useEffect(() => {
    function f() {
      y.current = !1, a.current = !1, g.current.clear();
    }
    Ye(f, "resetOutsideInteraction");
    function S() {
      return Array.from(g.current.values()).some(Boolean);
    }
    Ye(S, "isOutsideInteractionIntercepted");
    function x(E) {
      if (!y.current)
        return;
      const D = E.target;
      D instanceof Node && [...d].some((H) => H.contains(D)) || g.current.set(E.type, !0), E.type === "click" && window.setTimeout(() => {
        y.current && l.current();
      }, 0);
    }
    Ye(x, "handleInteractionCapture");
    function k(E) {
      y.current && g.current.set(E.type, !1);
    }
    Ye(k, "handleInteractionBubble");
    const A = /* @__PURE__ */ Ye((E) => {
      if (E.target && !m.current) {
        let D = function() {
          o.removeEventListener("click", l.current);
          const H = S();
          f(), H || df(
            ZP,
            p,
            O,
            { discrete: !0 }
          );
        };
        if (Ye(D, "handleAndDispatchPointerDownOutsideEvent"), !c(E.target)) {
          o.removeEventListener("click", l.current), f(), m.current = !1;
          return;
        }
        const O = { originalEvent: E };
        y.current = !0, a.current = i && E.button === 0, g.current.clear(), !i || E.button !== 0 ? D() : (o.removeEventListener("click", l.current), l.current = D, o.addEventListener("click", l.current, { once: !0 }));
      } else
        o.removeEventListener("click", l.current), f();
      m.current = !1;
    }, "handlePointerDown"), T = [
      "pointerup",
      "mousedown",
      "mouseup",
      "touchstart",
      "touchend",
      "click"
    ];
    for (const E of T)
      o.addEventListener(E, x, !0), o.addEventListener(E, k);
    const b = window.setTimeout(() => {
      o.addEventListener("pointerdown", A);
    }, 0);
    return () => {
      window.clearTimeout(b), o.removeEventListener("pointerdown", A), o.removeEventListener("click", l.current);
      for (const E of T)
        o.removeEventListener(E, x, !0), o.removeEventListener(E, k);
    };
  }, [
    o,
    p,
    i,
    a,
    d,
    c
  ]), {
    // ensures we check React component tree (not just DOM tree)
    onPointerDownCapture: /* @__PURE__ */ Ye(() => m.current = !0, "onPointerDownCapture")
  };
}
Ye(fS, "usePointerDownOutside");
function pS(e, n = globalThis == null ? void 0 : globalThis.document) {
  const o = go(e), i = C.useRef(!1);
  return C.useEffect(() => {
    const a = /* @__PURE__ */ Ye((d) => {
      d.target && !i.current && df(JP, o, { originalEvent: d }, {
        discrete: !1
      });
    }, "handleFocus");
    return n.addEventListener("focusin", a), () => n.removeEventListener("focusin", a);
  }, [n, o]), {
    onFocusCapture: /* @__PURE__ */ Ye(() => i.current = !0, "onFocusCapture"),
    onBlurCapture: /* @__PURE__ */ Ye(() => i.current = !1, "onBlurCapture")
  };
}
Ye(pS, "useFocusOutside");
function dd() {
  const e = new CustomEvent(cd);
  document.dispatchEvent(e);
}
Ye(dd, "dispatchUpdate");
function df(e, n, o, { discrete: i }) {
  const a = o.originalEvent.target, d = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: o });
  n && a.addEventListener(e, n, { once: !0 }), i ? uS(a, d) : a.dispatchEvent(d);
}
Ye(df, "handleAndDispatchCustomEvent");
var tE = Object.defineProperty, ut = (e, n) => tE(e, "name", { value: n, configurable: !0 }), hc = "focusScope.autoFocusOnMount", yc = "focusScope.autoFocusOnUnmount", hg = { bubbles: !1, cancelable: !0 }, nE = /* @__PURE__ */ C.forwardRef(
  /* @__PURE__ */ ut(function(n, o) {
    const {
      loop: i = !1,
      trapped: a = !1,
      onMountAutoFocus: d,
      onUnmountAutoFocus: c,
      ...p
    } = n, [m, y] = C.useState(null), g = go(d), l = go(c), f = C.useRef(null), S = _o(o, y), x = C.useRef({
      paused: !1,
      pause() {
        this.paused = !0;
      },
      resume() {
        this.paused = !1;
      }
    }).current;
    C.useEffect(() => {
      if (a) {
        let A = function(D) {
          if (x.paused || !m) return;
          const O = D.target;
          m.contains(O) ? f.current = O : hn(f.current, { select: !0 });
        }, T = function(D) {
          if (x.paused || !m) return;
          const O = D.relatedTarget;
          O !== null && (m.contains(O) || hn(f.current, { select: !0 }));
        }, b = function(D) {
          if (document.activeElement === document.body)
            for (const H of D)
              H.removedNodes.length > 0 && hn(m);
        };
        ut(A, "handleFocusIn"), ut(T, "handleFocusOut"), ut(b, "handleMutations"), document.addEventListener("focusin", A), document.addEventListener("focusout", T);
        const E = new MutationObserver(b);
        return m && E.observe(m, { childList: !0, subtree: !0 }), () => {
          document.removeEventListener("focusin", A), document.removeEventListener("focusout", T), E.disconnect();
        };
      }
    }, [a, m, x.paused]), C.useEffect(() => {
      if (m) {
        yg.add(x);
        const A = document.activeElement;
        if (!m.contains(A)) {
          const b = new CustomEvent(hc, hg);
          m.addEventListener(hc, g), m.dispatchEvent(b), b.defaultPrevented || (mS(SS(ff(m)), { select: !0 }), document.activeElement === A && hn(m));
        }
        return () => {
          m.removeEventListener(hc, g), setTimeout(() => {
            const b = new CustomEvent(yc, hg);
            m.addEventListener(yc, l), m.dispatchEvent(b), b.defaultPrevented || hn(A ?? document.body, { select: !0 }), m.removeEventListener(yc, l), yg.remove(x);
          }, 0);
        };
      }
    }, [m, g, l, x]);
    const k = C.useCallback(
      (A) => {
        if (!i && !a || x.paused) return;
        const T = A.key === "Tab" && !A.altKey && !A.ctrlKey && !A.metaKey, b = document.activeElement;
        if (T && b) {
          const E = A.currentTarget, [D, O] = hS(E);
          D && O ? !A.shiftKey && b === O ? (A.preventDefault(), i && hn(D, { select: !0 })) : A.shiftKey && b === D && (A.preventDefault(), i && hn(O, { select: !0 })) : b === E && A.preventDefault();
        }
      },
      [i, a, x.paused]
    );
    return /* @__PURE__ */ w.jsx(To.div, { tabIndex: -1, ...p, ref: S, onKeyDown: k });
  }, "FocusScope")
);
function mS(e, { select: n = !1 } = {}) {
  const o = document.activeElement;
  for (const i of e)
    if (hn(i, { select: n }), document.activeElement !== o) return;
}
ut(mS, "focusFirst");
function hS(e) {
  const n = ff(e), o = fd(n, e), i = fd(n.reverse(), e);
  return [o, i];
}
ut(hS, "getTabbableEdges");
function ff(e) {
  const n = [], o = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
    acceptNode: /* @__PURE__ */ ut((i) => {
      const a = i.tagName === "INPUT" && i.type === "hidden";
      return i.disabled || i.hidden || a ? NodeFilter.FILTER_SKIP : i.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }, "acceptNode")
  });
  for (; o.nextNode(); ) n.push(o.currentNode);
  return n;
}
ut(ff, "getTabbableCandidates");
function fd(e, n) {
  const o = typeof n.checkVisibility == "function" && n.checkVisibility({ checkVisibilityCSS: !0 });
  for (const i of e)
    if (!(o ? !i.checkVisibility({ checkVisibilityCSS: !0 }) : yS(i, { upTo: n })))
      return i;
}
ut(fd, "findVisible");
function yS(e, { upTo: n }) {
  if (getComputedStyle(e).visibility === "hidden") return !0;
  for (; e; ) {
    if (n !== void 0 && e === n) return !1;
    if (getComputedStyle(e).display === "none") return !0;
    e = e.parentElement;
  }
  return !1;
}
ut(yS, "isHidden");
function gS(e) {
  return e instanceof HTMLInputElement && "select" in e;
}
ut(gS, "isSelectableInput");
function hn(e, { select: n = !1 } = {}) {
  if (e && e.focus) {
    const o = document.activeElement;
    e.focus({ preventScroll: !0 }), e !== o && gS(e) && n && e.select();
  }
}
ut(hn, "focus");
var yg = vS();
function vS() {
  let e = [];
  return {
    add(n) {
      const o = e[0];
      n !== o && (o == null || o.pause()), e = pd(e, n), e.unshift(n);
    },
    remove(n) {
      var o;
      e = pd(e, n), (o = e[0]) == null || o.resume();
    }
  };
}
ut(vS, "createFocusScopesStack");
function pd(e, n) {
  const o = [...e], i = o.indexOf(n);
  return i !== -1 && o.splice(i, 1), o;
}
ut(pd, "arrayRemove");
function SS(e) {
  return e.filter((n) => n.tagName !== "A");
}
ut(SS, "removeLinks");
var rE = Object.defineProperty, oE = (e, n) => rE(e, "name", { value: n, configurable: !0 }), iE = /* @__PURE__ */ C.forwardRef(
  /* @__PURE__ */ oE(function(n, o) {
    var m;
    const { container: i, ...a } = n, [d, c] = C.useState(!1);
    Zn(() => c(!0), []);
    const p = i || d && ((m = globalThis == null ? void 0 : globalThis.document) == null ? void 0 : m.body);
    return p ? rS.createPortal(/* @__PURE__ */ w.jsx(To.div, { ...a, ref: o }), p) : null;
  }, "Portal")
), sE = Object.defineProperty, wn = (e, n) => sE(e, "name", { value: n, configurable: !0 });
function wS(e, n) {
  return C.useReducer((o, i) => n[o][i] ?? o, e);
}
wn(wS, "useStateMachine");
var pf = /* @__PURE__ */ wn((e) => {
  const { present: n, children: o } = e, i = xS(n), a = typeof o == "function" ? o({ present: i.isPresent }) : C.Children.only(o), d = _S(i.ref, TS(a));
  return typeof o == "function" || i.isPresent ? C.cloneElement(a, { ref: d }) : null;
}, "Presence");
function xS(e) {
  const [n, o] = C.useState(), i = C.useRef(null), a = C.useRef(e), d = C.useRef("none"), c = C.useRef(void 0), p = e ? "mounted" : "unmounted", [m, y] = wS(p, {
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
    m === "mounted" ? (d.current = c.current ?? so(i.current), c.current = void 0) : d.current = "none";
  }, [m]), Zn(() => {
    const g = i.current, l = a.current;
    if (l !== e) {
      const S = d.current, x = so(g);
      e ? (c.current = x, y("MOUNT")) : x === "none" || (g == null ? void 0 : g.display) === "none" ? y("UNMOUNT") : y(l && S !== x ? "ANIMATION_OUT" : "UNMOUNT"), a.current = e;
    }
  }, [e, y]), Zn(() => {
    if (n) {
      let g;
      const l = n.ownerDocument.defaultView ?? window, f = /* @__PURE__ */ wn((x) => {
        const A = so(i.current).includes(CSS.escape(x.animationName));
        if (x.target === n && A && (y("ANIMATION_END"), !a.current)) {
          const T = n.style.animationFillMode;
          n.style.animationFillMode = "forwards", g = l.setTimeout(() => {
            n.style.animationFillMode === "forwards" && (n.style.animationFillMode = T);
          });
        }
      }, "handleAnimationEnd"), S = /* @__PURE__ */ wn((x) => {
        x.target === n && (d.current = so(i.current));
      }, "handleAnimationStart");
      return n.addEventListener("animationstart", S), n.addEventListener("animationcancel", f), n.addEventListener("animationend", f), () => {
        l.clearTimeout(g), n.removeEventListener("animationstart", S), n.removeEventListener("animationcancel", f), n.removeEventListener("animationend", f);
      };
    } else
      y("ANIMATION_END");
  }, [n, y]), {
    isPresent: ["mounted", "unmountSuspended"].includes(m),
    ref: C.useCallback((g) => {
      if (g) {
        const l = getComputedStyle(g);
        i.current = l, c.current = so(l);
      } else
        i.current = null;
      o(g);
    }, [])
  };
}
wn(xS, "usePresence");
function md(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
wn(md, "setRef");
function _S(...e) {
  const n = C.useRef(e);
  return n.current = e, C.useCallback((o) => {
    const i = n.current;
    let a = !1;
    const d = i.map((c) => {
      const p = md(c, o);
      return !a && typeof p == "function" && (a = !0), p;
    });
    if (a)
      return () => {
        for (let c = 0; c < d.length; c++) {
          const p = d[c];
          typeof p == "function" ? p() : md(i[c], null);
        }
      };
  }, []);
}
wn(_S, "useStableComposedRefs");
function so(e) {
  return (e == null ? void 0 : e.animationName) || "none";
}
wn(so, "getAnimationName");
function TS(e) {
  var i, a;
  let n = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = n && "isReactWarning" in n && n.isReactWarning;
  return o ? e.ref : (n = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = n && "isReactWarning" in n && n.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
wn(TS, "getElementRef");
var aE = Object.defineProperty, mf = (e, n) => aE(e, "name", { value: n, configurable: !0 }), ta = 0, Jt = null;
function lE(e) {
  return hf(), e.children;
}
mf(lE, "FocusGuards");
function hf() {
  C.useEffect(() => {
    Jt || (Jt = { start: hd(), end: hd() });
    const { start: e, end: n } = Jt;
    return document.body.firstElementChild !== e && document.body.insertAdjacentElement("afterbegin", e), document.body.lastElementChild !== n && document.body.insertAdjacentElement("beforeend", n), ta++, () => {
      ta === 1 && (Jt == null || Jt.start.remove(), Jt == null || Jt.end.remove(), Jt = null), ta = Math.max(0, ta - 1);
    };
  }, []);
}
mf(hf, "useFocusGuards");
function hd() {
  const e = document.createElement("span");
  return e.setAttribute("data-radix-focus-guard", ""), e.tabIndex = 0, e.style.outline = "none", e.style.opacity = "0", e.style.position = "fixed", e.style.pointerEvents = "none", e;
}
mf(hd, "createFocusGuard");
var tn = function() {
  return tn = Object.assign || function(n) {
    for (var o, i = 1, a = arguments.length; i < a; i++) {
      o = arguments[i];
      for (var d in o) Object.prototype.hasOwnProperty.call(o, d) && (n[d] = o[d]);
    }
    return n;
  }, tn.apply(this, arguments);
};
function kS(e, n) {
  var o = {};
  for (var i in e) Object.prototype.hasOwnProperty.call(e, i) && n.indexOf(i) < 0 && (o[i] = e[i]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var a = 0, i = Object.getOwnPropertySymbols(e); a < i.length; a++)
      n.indexOf(i[a]) < 0 && Object.prototype.propertyIsEnumerable.call(e, i[a]) && (o[i[a]] = e[i[a]]);
  return o;
}
function uE(e, n, o) {
  if (o || arguments.length === 2) for (var i = 0, a = n.length, d; i < a; i++)
    (d || !(i in n)) && (d || (d = Array.prototype.slice.call(n, 0, i)), d[i] = n[i]);
  return e.concat(d || Array.prototype.slice.call(n));
}
var Sa = "right-scroll-bar-position", wa = "width-before-scroll-bar", cE = "with-scroll-bars-hidden", dE = "--removed-body-scroll-bar-size";
function gc(e, n) {
  return typeof e == "function" ? e(n) : e && (e.current = n), e;
}
function fE(e, n) {
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
var pE = typeof window < "u" ? C.useLayoutEffect : C.useEffect, gg = /* @__PURE__ */ new WeakMap();
function mE(e, n) {
  var o = fE(null, function(i) {
    return e.forEach(function(a) {
      return gc(a, i);
    });
  });
  return pE(function() {
    var i = gg.get(o);
    if (i) {
      var a = new Set(i), d = new Set(e), c = o.current;
      a.forEach(function(p) {
        d.has(p) || gc(p, null);
      }), d.forEach(function(p) {
        a.has(p) || gc(p, c);
      });
    }
    gg.set(o, e);
  }, [e]), o;
}
function hE(e) {
  return e;
}
function yE(e, n) {
  n === void 0 && (n = hE);
  var o = [], i = !1, a = {
    read: function() {
      if (i)
        throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");
      return o.length ? o[o.length - 1] : e;
    },
    useMedium: function(d) {
      var c = n(d, i);
      return o.push(c), function() {
        o = o.filter(function(p) {
          return p !== c;
        });
      };
    },
    assignSyncMedium: function(d) {
      for (i = !0; o.length; ) {
        var c = o;
        o = [], c.forEach(d);
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
      var c = [];
      if (o.length) {
        var p = o;
        o = [], p.forEach(d), c = o;
      }
      var m = function() {
        var g = c;
        c = [], g.forEach(d);
      }, y = function() {
        return Promise.resolve().then(m);
      };
      y(), o = {
        push: function(g) {
          c.push(g), y();
        },
        filter: function(g) {
          return c = c.filter(g), o;
        }
      };
    }
  };
  return a;
}
function gE(e) {
  e === void 0 && (e = {});
  var n = yE(null);
  return n.options = tn({ async: !0, ssr: !1 }, e), n;
}
var AS = function(e) {
  var n = e.sideCar, o = kS(e, ["sideCar"]);
  if (!n)
    throw new Error("Sidecar: please provide `sideCar` property to import the right car");
  var i = n.read();
  if (!i)
    throw new Error("Sidecar medium not found");
  return C.createElement(i, tn({}, o));
};
AS.isSideCarExport = !0;
function vE(e, n) {
  return e.useMedium(n), AS;
}
var CS = gE(), vc = function() {
}, Za = C.forwardRef(function(e, n) {
  var o = C.useRef(null), i = C.useState({
    onScrollCapture: vc,
    onWheelCapture: vc,
    onTouchMoveCapture: vc
  }), a = i[0], d = i[1], c = e.forwardProps, p = e.children, m = e.className, y = e.removeScrollBar, g = e.enabled, l = e.shards, f = e.sideCar, S = e.noRelative, x = e.noIsolation, k = e.inert, A = e.allowPinchZoom, T = e.as, b = T === void 0 ? "div" : T, E = e.gapMode, D = kS(e, ["forwardProps", "children", "className", "removeScrollBar", "enabled", "shards", "sideCar", "noRelative", "noIsolation", "inert", "allowPinchZoom", "as", "gapMode"]), O = f, H = mE([o, n]), W = tn(tn({}, D), a);
  return C.createElement(
    C.Fragment,
    null,
    g && C.createElement(O, { sideCar: CS, removeScrollBar: y, shards: l, noRelative: S, noIsolation: x, inert: k, setCallbacks: d, allowPinchZoom: !!A, lockRef: o, gapMode: E }),
    c ? C.cloneElement(C.Children.only(p), tn(tn({}, W), { ref: H })) : C.createElement(b, tn({}, W, { className: m, ref: H }), p)
  );
});
Za.defaultProps = {
  enabled: !0,
  removeScrollBar: !0,
  inert: !1
};
Za.classNames = {
  fullWidth: wa,
  zeroRight: Sa
};
var SE = function() {
  if (typeof __webpack_nonce__ < "u")
    return __webpack_nonce__;
};
function wE() {
  if (!document)
    return null;
  var e = document.createElement("style");
  e.type = "text/css";
  var n = SE();
  return n && e.setAttribute("nonce", n), e;
}
function xE(e, n) {
  e.styleSheet ? e.styleSheet.cssText = n : e.appendChild(document.createTextNode(n));
}
function _E(e) {
  var n = document.head || document.getElementsByTagName("head")[0];
  n.appendChild(e);
}
var TE = function() {
  var e = 0, n = null;
  return {
    add: function(o) {
      e == 0 && (n = wE()) && (xE(n, o), _E(n)), e++;
    },
    remove: function() {
      e--, !e && n && (n.parentNode && n.parentNode.removeChild(n), n = null);
    }
  };
}, kE = function() {
  var e = TE();
  return function(n, o) {
    C.useEffect(function() {
      return e.add(n), function() {
        e.remove();
      };
    }, [n && o]);
  };
}, bS = function() {
  var e = kE(), n = function(o) {
    var i = o.styles, a = o.dynamic;
    return e(i, a), null;
  };
  return n;
}, AE = {
  left: 0,
  top: 0,
  right: 0,
  gap: 0
}, Sc = function(e) {
  return parseInt(e || "", 10) || 0;
}, CE = function(e) {
  var n = window.getComputedStyle(document.body), o = n[e === "padding" ? "paddingLeft" : "marginLeft"], i = n[e === "padding" ? "paddingTop" : "marginTop"], a = n[e === "padding" ? "paddingRight" : "marginRight"];
  return [Sc(o), Sc(i), Sc(a)];
}, bE = function(e) {
  if (e === void 0 && (e = "margin"), typeof window > "u")
    return AE;
  var n = CE(e), o = document.documentElement.clientWidth, i = window.innerWidth;
  return {
    left: n[0],
    top: n[1],
    right: n[2],
    gap: Math.max(0, i - o + n[2] - n[0])
  };
}, PE = bS(), po = "data-scroll-locked", EE = function(e, n, o, i) {
  var a = e.left, d = e.top, c = e.right, p = e.gap;
  return o === void 0 && (o = "margin"), `
  .`.concat(cE, ` {
   overflow: hidden `).concat(i, `;
   padding-right: `).concat(p, "px ").concat(i, `;
  }
  body[`).concat(po, `] {
    overflow: hidden `).concat(i, `;
    overscroll-behavior: contain;
    `).concat([
    n && "position: relative ".concat(i, ";"),
    o === "margin" && `
    padding-left: `.concat(a, `px;
    padding-top: `).concat(d, `px;
    padding-right: `).concat(c, `px;
    margin-left:0;
    margin-top:0;
    margin-right: `).concat(p, "px ").concat(i, `;
    `),
    o === "padding" && "padding-right: ".concat(p, "px ").concat(i, ";")
  ].filter(Boolean).join(""), `
  }
  
  .`).concat(Sa, ` {
    right: `).concat(p, "px ").concat(i, `;
  }
  
  .`).concat(wa, ` {
    margin-right: `).concat(p, "px ").concat(i, `;
  }
  
  .`).concat(Sa, " .").concat(Sa, ` {
    right: 0 `).concat(i, `;
  }
  
  .`).concat(wa, " .").concat(wa, ` {
    margin-right: 0 `).concat(i, `;
  }
  
  body[`).concat(po, `] {
    `).concat(dE, ": ").concat(p, `px;
  }
`);
}, vg = function() {
  var e = parseInt(document.body.getAttribute(po) || "0", 10);
  return isFinite(e) ? e : 0;
}, ME = function() {
  C.useEffect(function() {
    return document.body.setAttribute(po, (vg() + 1).toString()), function() {
      var e = vg() - 1;
      e <= 0 ? document.body.removeAttribute(po) : document.body.setAttribute(po, e.toString());
    };
  }, []);
}, RE = function(e) {
  var n = e.noRelative, o = e.noImportant, i = e.gapMode, a = i === void 0 ? "margin" : i;
  ME();
  var d = C.useMemo(function() {
    return bE(a);
  }, [a]);
  return C.createElement(PE, { styles: EE(d, !n, a, o ? "" : "!important") });
}, yd = !1;
if (typeof window < "u")
  try {
    var na = Object.defineProperty({}, "passive", {
      get: function() {
        return yd = !0, !0;
      }
    });
    window.addEventListener("test", na, na), window.removeEventListener("test", na, na);
  } catch {
    yd = !1;
  }
var no = yd ? { passive: !1 } : !1, DE = function(e) {
  return e.tagName === "TEXTAREA";
}, PS = function(e, n) {
  if (!(e instanceof Element))
    return !1;
  var o = window.getComputedStyle(e);
  return (
    // not-not-scrollable
    o[n] !== "hidden" && // contains scroll inside self
    !(o.overflowY === o.overflowX && !DE(e) && o[n] === "visible")
  );
}, NE = function(e) {
  return PS(e, "overflowY");
}, jE = function(e) {
  return PS(e, "overflowX");
}, Sg = function(e, n) {
  var o = n.ownerDocument, i = n;
  do {
    typeof ShadowRoot < "u" && i instanceof ShadowRoot && (i = i.host);
    var a = ES(e, i);
    if (a) {
      var d = MS(e, i), c = d[1], p = d[2];
      if (c > p)
        return !0;
    }
    i = i.parentNode;
  } while (i && i !== o.body);
  return !1;
}, IE = function(e) {
  var n = e.scrollTop, o = e.scrollHeight, i = e.clientHeight;
  return [
    n,
    o,
    i
  ];
}, FE = function(e) {
  var n = e.scrollLeft, o = e.scrollWidth, i = e.clientWidth;
  return [
    n,
    o,
    i
  ];
}, ES = function(e, n) {
  return e === "v" ? NE(n) : jE(n);
}, MS = function(e, n) {
  return e === "v" ? IE(n) : FE(n);
}, OE = function(e, n) {
  return e === "h" && n === "rtl" ? -1 : 1;
}, LE = function(e, n, o, i, a) {
  var d = OE(e, window.getComputedStyle(n).direction), c = d * i, p = o.target, m = n.contains(p), y = !1, g = c > 0, l = 0, f = 0;
  do {
    if (!p)
      break;
    var S = MS(e, p), x = S[0], k = S[1], A = S[2], T = k - A - d * x;
    (x || T) && ES(e, p) && (l += T, f += x);
    var b = p.parentNode;
    p = b && b.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? b.host : b;
  } while (
    // portaled content
    !m && p !== document.body || // self content
    m && (n.contains(p) || n === p)
  );
  return (g && Math.abs(l) < 1 || !g && Math.abs(f) < 1) && (y = !0), y;
}, ra = function(e) {
  return "changedTouches" in e ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY] : [0, 0];
}, wg = function(e) {
  return [e.deltaX, e.deltaY];
}, xg = function(e) {
  return e && "current" in e ? e.current : e;
}, VE = function(e, n) {
  return e[0] === n[0] && e[1] === n[1];
}, BE = function(e) {
  return `
  .block-interactivity-`.concat(e, ` {pointer-events: none;}
  .allow-interactivity-`).concat(e, ` {pointer-events: all;}
`);
}, zE = 0, ro = [];
function $E(e) {
  var n = C.useRef([]), o = C.useRef([0, 0]), i = C.useRef(), a = C.useState(zE++)[0], d = C.useState(bS)[0], c = C.useRef(e);
  C.useEffect(function() {
    c.current = e;
  }, [e]), C.useEffect(function() {
    if (e.inert) {
      document.body.classList.add("block-interactivity-".concat(a));
      var k = uE([e.lockRef.current], (e.shards || []).map(xg), !0).filter(Boolean);
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
      return !c.current.allowPinchZoom;
    var T = ra(k), b = o.current, E = "deltaX" in k ? k.deltaX : b[0] - T[0], D = "deltaY" in k ? k.deltaY : b[1] - T[1], O, H = k.target, W = Math.abs(E) > Math.abs(D) ? "h" : "v";
    if ("touches" in k && W === "h" && H.type === "range")
      return !1;
    var G = window.getSelection(), K = G && G.anchorNode, X = K ? K === H || K.contains(H) : !1;
    if (X)
      return !1;
    var se = Sg(W, H);
    if (!se)
      return !0;
    if (se ? O = W : (O = W === "v" ? "h" : "v", se = Sg(W, H)), !se)
      return !1;
    if (!i.current && "changedTouches" in k && (E || D) && (i.current = O), !O)
      return !0;
    var Z = i.current || O;
    return LE(Z, A, k, Z === "h" ? E : D);
  }, []), m = C.useCallback(function(k) {
    var A = k;
    if (!(!ro.length || ro[ro.length - 1] !== d)) {
      var T = "deltaY" in A ? wg(A) : ra(A), b = n.current.filter(function(O) {
        return O.name === A.type && (O.target === A.target || A.target === O.shadowParent) && VE(O.delta, T);
      })[0];
      if (b && b.should) {
        A.cancelable && A.preventDefault();
        return;
      }
      if (!b) {
        var E = (c.current.shards || []).map(xg).filter(Boolean).filter(function(O) {
          return O.contains(A.target);
        }), D = E.length > 0 ? p(A, E[0]) : !c.current.noIsolation;
        D && A.cancelable && A.preventDefault();
      }
    }
  }, []), y = C.useCallback(function(k, A, T, b) {
    var E = { name: k, delta: A, target: T, should: b, shadowParent: UE(T) };
    n.current.push(E), setTimeout(function() {
      n.current = n.current.filter(function(D) {
        return D !== E;
      });
    }, 1);
  }, []), g = C.useCallback(function(k) {
    o.current = ra(k), i.current = void 0;
  }, []), l = C.useCallback(function(k) {
    y(k.type, wg(k), k.target, p(k, e.lockRef.current));
  }, []), f = C.useCallback(function(k) {
    y(k.type, ra(k), k.target, p(k, e.lockRef.current));
  }, []);
  C.useEffect(function() {
    return ro.push(d), e.setCallbacks({
      onScrollCapture: l,
      onWheelCapture: l,
      onTouchMoveCapture: f
    }), document.addEventListener("wheel", m, no), document.addEventListener("touchmove", m, no), document.addEventListener("touchstart", g, no), function() {
      ro = ro.filter(function(k) {
        return k !== d;
      }), document.removeEventListener("wheel", m, no), document.removeEventListener("touchmove", m, no), document.removeEventListener("touchstart", g, no);
    };
  }, []);
  var S = e.removeScrollBar, x = e.inert;
  return C.createElement(
    C.Fragment,
    null,
    x ? C.createElement(d, { styles: BE(a) }) : null,
    S ? C.createElement(RE, { noRelative: e.noRelative, gapMode: e.gapMode }) : null
  );
}
function UE(e) {
  for (var n = null; e !== null; )
    e instanceof ShadowRoot && (n = e.host, e = e.host), e = e.parentNode;
  return n;
}
const HE = vE(CS, $E);
var RS = C.forwardRef(function(e, n) {
  return C.createElement(Za, tn({}, e, { ref: n, sideCar: HE }));
});
RS.classNames = Za.classNames;
var WE = function(e) {
  if (typeof document > "u")
    return null;
  var n = Array.isArray(e) ? e[0] : e;
  return n.ownerDocument.body;
}, oo = /* @__PURE__ */ new WeakMap(), oa = /* @__PURE__ */ new WeakMap(), ia = {}, wc = 0, DS = function(e) {
  return e && (e.host || DS(e.parentNode));
}, GE = function(e, n) {
  return n.map(function(o) {
    if (e.contains(o))
      return o;
    var i = DS(o);
    return i && e.contains(i) ? i : (console.error("aria-hidden", o, "in not contained inside", e, ". Doing nothing"), null);
  }).filter(function(o) {
    return !!o;
  });
}, KE = function(e, n, o, i) {
  var a = GE(n, Array.isArray(e) ? e : [e]);
  ia[o] || (ia[o] = /* @__PURE__ */ new WeakMap());
  var d = ia[o], c = [], p = /* @__PURE__ */ new Set(), m = new Set(a), y = function(l) {
    !l || p.has(l) || (p.add(l), y(l.parentNode));
  };
  a.forEach(y);
  var g = function(l) {
    !l || m.has(l) || Array.prototype.forEach.call(l.children, function(f) {
      if (p.has(f))
        g(f);
      else
        try {
          var S = f.getAttribute(i), x = S !== null && S !== "false", k = (oo.get(f) || 0) + 1, A = (d.get(f) || 0) + 1;
          oo.set(f, k), d.set(f, A), c.push(f), k === 1 && x && oa.set(f, !0), A === 1 && f.setAttribute(o, "true"), x || f.setAttribute(i, "true");
        } catch (T) {
          console.error("aria-hidden: cannot operate on ", f, T);
        }
    });
  };
  return g(n), p.clear(), wc++, function() {
    c.forEach(function(l) {
      var f = oo.get(l) - 1, S = d.get(l) - 1;
      oo.set(l, f), d.set(l, S), f || (oa.has(l) || l.removeAttribute(i), oa.delete(l)), S || l.removeAttribute(o);
    }), wc--, wc || (oo = /* @__PURE__ */ new WeakMap(), oo = /* @__PURE__ */ new WeakMap(), oa = /* @__PURE__ */ new WeakMap(), ia = {});
  };
}, YE = function(e, n, o) {
  o === void 0 && (o = "data-aria-hidden");
  var i = Array.from(Array.isArray(e) ? e : [e]), a = WE(e);
  return a ? (i.push.apply(i, Array.from(a.querySelectorAll("[aria-live], script"))), KE(i, a, o, "aria-hidden")) : function() {
    return null;
  };
}, QE = Object.defineProperty, Gt = (e, n) => QE(e, "name", { value: n, configurable: !0 }), yf = "Dialog", [NS, WR] = /* @__PURE__ */ Z0(yf), [XE, xn] = NS(yf), ZE = /* @__PURE__ */ Gt((e) => {
  const {
    __scopeDialog: n,
    children: o,
    open: i,
    defaultOpen: a,
    onOpenChange: d,
    modal: c = !0
  } = e, p = C.useRef(null), m = C.useRef(null), [y, g] = eS({
    prop: i,
    defaultProp: a ?? !1,
    onChange: d,
    caller: yf
  }), [l, f] = C.useState(0), [S, x] = C.useState(0);
  return /* @__PURE__ */ w.jsx(
    XE,
    {
      scope: n,
      triggerRef: p,
      contentRef: m,
      contentId: va(),
      titleId: va(),
      descriptionId: va(),
      titlePresent: l > 0,
      descriptionPresent: S > 0,
      setTitleCount: f,
      setDescriptionCount: x,
      open: y,
      onOpenChange: g,
      onOpenToggle: C.useCallback(() => g((k) => !k), [g]),
      modal: c,
      children: o
    }
  );
}, "Dialog"), jS = "DialogPortal", [JE, IS] = NS(jS, {
  forceMount: void 0
}), qE = /* @__PURE__ */ Gt((e) => {
  const { __scopeDialog: n, forceMount: o, children: i, container: a } = e, d = xn(jS, n);
  return /* @__PURE__ */ w.jsx(JE, { scope: n, forceMount: o, children: C.Children.map(i, (c) => /* @__PURE__ */ w.jsx(pf, { present: o || d.open, children: /* @__PURE__ */ w.jsx(iE, { asChild: !0, container: a, children: c }) })) });
}, "DialogPortal"), gd = "DialogOverlay", eM = /* @__PURE__ */ C.forwardRef(
  /* @__PURE__ */ Gt(function(n, o) {
    const i = IS(gd, n.__scopeDialog), { forceMount: a = i.forceMount, ...d } = n, c = xn(gd, n.__scopeDialog);
    return c.modal ? /* @__PURE__ */ w.jsx(pf, { present: a || c.open, children: /* @__PURE__ */ w.jsx(nM, { ...d, ref: o }) }) : null;
  }, "DialogOverlay")
), tM = /* @__PURE__ */ cf("DialogOverlay.RemoveScroll"), nM = /* @__PURE__ */ C.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Gt(function(n, o) {
    const { __scopeDialog: i, ...a } = n, d = xn(gd, i), c = dS(), p = _o(o, c);
    return (
      // Make sure `Content` is scrollable even when it doesn't live inside `RemoveScroll`
      // ie. when `Overlay` and `Content` are siblings
      /* @__PURE__ */ w.jsx(RS, { as: tM, allowPinchZoom: !0, shards: [d.contentRef], children: /* @__PURE__ */ w.jsx(
        To.div,
        {
          "data-state": gf(d.open),
          ...a,
          ref: p,
          style: { pointerEvents: "auto", ...a.style }
        }
      ) })
    );
  }, "DialogOverlayImpl")
), Ci = "DialogContent", rM = /* @__PURE__ */ C.forwardRef(
  /* @__PURE__ */ Gt(function(n, o) {
    const i = IS(Ci, n.__scopeDialog), { forceMount: a = i.forceMount, ...d } = n, c = xn(Ci, n.__scopeDialog);
    return /* @__PURE__ */ w.jsx(pf, { present: a || c.open, children: c.modal ? /* @__PURE__ */ w.jsx(oM, { ...d, ref: o }) : /* @__PURE__ */ w.jsx(iM, { ...d, ref: o }) });
  }, "DialogContent")
), oM = /* @__PURE__ */ C.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Gt(function(n, o) {
    const i = xn(Ci, n.__scopeDialog), a = C.useRef(null), d = _o(o, i.contentRef, a);
    return C.useEffect(() => {
      const c = a.current;
      if (c) return YE(c);
    }, []), /* @__PURE__ */ w.jsx(
      FS,
      {
        ...n,
        ref: d,
        trapFocus: i.open,
        disableOutsidePointerEvents: i.open,
        onCloseAutoFocus: Cr(n.onCloseAutoFocus, (c) => {
          var p;
          c.preventDefault(), (p = i.triggerRef.current) == null || p.focus();
        }),
        onPointerDownOutside: Cr(n.onPointerDownOutside, (c) => {
          const p = c.detail.originalEvent, m = p.button === 0 && p.ctrlKey === !0;
          (p.button === 2 || m) && c.preventDefault();
        }),
        onFocusOutside: Cr(
          n.onFocusOutside,
          (c) => c.preventDefault()
        )
      }
    );
  }, "DialogContentModal")
), iM = /* @__PURE__ */ C.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Gt(function(n, o) {
    const i = xn(Ci, n.__scopeDialog), a = C.useRef(!1), d = C.useRef(!1);
    return /* @__PURE__ */ w.jsx(
      FS,
      {
        ...n,
        ref: o,
        trapFocus: !1,
        disableOutsidePointerEvents: !1,
        onCloseAutoFocus: (c) => {
          var p, m;
          (p = n.onCloseAutoFocus) == null || p.call(n, c), c.defaultPrevented || (a.current || (m = i.triggerRef.current) == null || m.focus(), c.preventDefault()), a.current = !1, d.current = !1;
        },
        onInteractOutside: (c) => {
          var y, g;
          (y = n.onInteractOutside) == null || y.call(n, c), c.defaultPrevented || (a.current = !0, c.detail.originalEvent.type === "pointerdown" && (d.current = !0));
          const p = c.target;
          ((g = i.triggerRef.current) == null ? void 0 : g.contains(p)) && c.preventDefault(), c.detail.originalEvent.type === "focusin" && d.current && c.preventDefault();
        }
      }
    );
  }, "DialogContentNonModal")
), FS = /* @__PURE__ */ C.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Gt(function(n, o) {
    const { __scopeDialog: i, trapFocus: a, onOpenAutoFocus: d, onCloseAutoFocus: c, ...p } = n, m = xn(Ci, i);
    return hf(), /* @__PURE__ */ w.jsx(w.Fragment, { children: /* @__PURE__ */ w.jsx(
      nE,
      {
        asChild: !0,
        loop: !0,
        trapped: a,
        onMountAutoFocus: d,
        onUnmountAutoFocus: c,
        children: /* @__PURE__ */ w.jsx(
          qP,
          {
            role: "dialog",
            id: m.contentId,
            "aria-describedby": m.descriptionPresent ? m.descriptionId : void 0,
            "aria-labelledby": m.titlePresent ? m.titleId : void 0,
            "data-state": gf(m.open),
            ...p,
            ref: o,
            deferPointerDownOutside: !0,
            onDismiss: () => m.onOpenChange(!1)
          }
        )
      }
    ) });
  }, "DialogContentImpl")
), sM = "DialogTitle", aM = /* @__PURE__ */ C.forwardRef(
  /* @__PURE__ */ Gt(function(n, o) {
    const { __scopeDialog: i, ...a } = n, d = xn(sM, i), { setTitleCount: c } = d;
    return Zn(() => (c((p) => p + 1), () => c((p) => p - 1)), [c]), /* @__PURE__ */ w.jsx(To.h2, { id: d.titleId, ...a, ref: o });
  }, "DialogTitle")
), lM = "DialogDescription", uM = /* @__PURE__ */ C.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Gt(function(n, o) {
    const { __scopeDialog: i, ...a } = n, d = xn(lM, i), { setDescriptionCount: c } = d;
    return Zn(() => (c((p) => p + 1), () => c((p) => p - 1)), [c]), /* @__PURE__ */ w.jsx(To.p, { id: d.descriptionId, ...a, ref: o });
  }, "DialogDescription")
);
function gf(e) {
  return e ? "open" : "closed";
}
Gt(gf, "getState");
function cM() {
  const e = Y((a) => a.summaryRecord), n = Y((a) => a.closeSummary), o = Y((a) => a.startTimer), i = gn(e == null ? void 0 : e.selectedScene);
  return /* @__PURE__ */ w.jsx(ZE, { open: !!e, onOpenChange: (a) => !a && n(), children: /* @__PURE__ */ w.jsx(Wa, { children: e ? /* @__PURE__ */ w.jsxs(qE, { forceMount: !0, children: [
    /* @__PURE__ */ w.jsx(eM, { asChild: !0, children: /* @__PURE__ */ w.jsx(
      vn.div,
      {
        className: "summary-overlay",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
      }
    ) }),
    /* @__PURE__ */ w.jsx(rM, { asChild: !0, children: /* @__PURE__ */ w.jsxs(
      vn.article,
      {
        className: "summary-card liquid-glass",
        initial: { opacity: 0, y: 18, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 18, scale: 0.98 },
        children: [
          /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Session complete" }),
          /* @__PURE__ */ w.jsx(aM, { children: "Focus block complete" }),
          /* @__PURE__ */ w.jsx(uM, { className: "sr-only", children: "Summary of the completed focus block." }),
          /* @__PURE__ */ w.jsx("p", { children: "You protected a focused block in your quiet study room." }),
          /* @__PURE__ */ w.jsxs("div", { className: "summary-grid", children: [
            /* @__PURE__ */ w.jsxs("div", { className: "summary-stat liquid-glass-lite", children: [
              /* @__PURE__ */ w.jsx("span", { children: "Focus time" }),
              /* @__PURE__ */ w.jsx("strong", { children: D0(e.totalFocusTime) })
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
            /* @__PURE__ */ w.jsx(Pe, { variant: "primary", onClick: () => {
              n(), o();
            }, children: "Continue studying" }),
            /* @__PURE__ */ w.jsx(Pe, { onClick: n, children: "Done" })
          ] })
        ]
      }
    ) })
  ] }) : null }) });
}
function OS(e, [n, o]) {
  return Math.min(o, Math.max(n, e));
}
function co(e, n, { checkForDefaultPrevented: o = !0 } = {}) {
  return function(a) {
    if (e == null || e(a), o === !1 || !a.defaultPrevented)
      return n == null ? void 0 : n(a);
  };
}
function _g(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function dM(...e) {
  return (n) => {
    let o = !1;
    const i = e.map((a) => {
      const d = _g(a, n);
      return !o && typeof d == "function" && (o = !0), d;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const d = i[a];
          typeof d == "function" ? d() : _g(e[a], null);
        }
      };
  };
}
function Jn(...e) {
  return C.useCallback(dM(...e), e);
}
function LS(e, n = []) {
  let o = [];
  function i(d, c) {
    const p = C.createContext(c);
    p.displayName = d + "Context";
    const m = o.length;
    o = [...o, c];
    const y = (l) => {
      var T;
      const { scope: f, children: S, ...x } = l, k = ((T = f == null ? void 0 : f[e]) == null ? void 0 : T[m]) || p, A = C.useMemo(() => x, Object.values(x));
      return /* @__PURE__ */ w.jsx(k.Provider, { value: A, children: S });
    };
    y.displayName = d + "Provider";
    function g(l, f) {
      var k;
      const S = ((k = f == null ? void 0 : f[e]) == null ? void 0 : k[m]) || p, x = C.useContext(S);
      if (x) return x;
      if (c !== void 0) return c;
      throw new Error(`\`${l}\` must be used within \`${d}\``);
    }
    return [y, g];
  }
  const a = () => {
    const d = o.map((c) => C.createContext(c));
    return function(p) {
      const m = (p == null ? void 0 : p[e]) || d;
      return C.useMemo(
        () => ({ [`__scope${e}`]: { ...p, [e]: m } }),
        [p, m]
      );
    };
  };
  return a.scopeName = e, [i, fM(a, ...n)];
}
function fM(...e) {
  const n = e[0];
  if (e.length === 1) return n;
  const o = () => {
    const i = e.map((a) => ({
      useScope: a(),
      scopeName: a.scopeName
    }));
    return function(d) {
      const c = i.reduce((p, { useScope: m, scopeName: y }) => {
        const l = m(d)[`__scope${y}`];
        return { ...p, ...l };
      }, {});
      return C.useMemo(() => ({ [`__scope${n.scopeName}`]: c }), [c]);
    };
  };
  return o.scopeName = n.scopeName, o;
}
var VS = globalThis != null && globalThis.document ? C.useLayoutEffect : () => {
}, pM = Pr[" useInsertionEffect ".trim().toString()] || VS;
function mM({
  prop: e,
  defaultProp: n,
  onChange: o = () => {
  },
  caller: i
}) {
  const [a, d, c] = hM({
    defaultProp: n,
    onChange: o
  }), p = e !== void 0, m = p ? e : a;
  {
    const g = C.useRef(e !== void 0);
    C.useEffect(() => {
      const l = g.current;
      l !== p && console.warn(
        `${i} is changing from ${l ? "controlled" : "uncontrolled"} to ${p ? "controlled" : "uncontrolled"}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
      ), g.current = p;
    }, [p, i]);
  }
  const y = C.useCallback(
    (g) => {
      var l;
      if (p) {
        const f = yM(g) ? g(e) : g;
        f !== e && ((l = c.current) == null || l.call(c, f));
      } else
        d(g);
    },
    [p, e, d, c]
  );
  return [m, y];
}
function hM({
  defaultProp: e,
  onChange: n
}) {
  const [o, i] = C.useState(e), a = C.useRef(o), d = C.useRef(n);
  return pM(() => {
    d.current = n;
  }, [n]), C.useEffect(() => {
    var c;
    a.current !== o && ((c = d.current) == null || c.call(d, o), a.current = o);
  }, [o, a]), [o, i, d];
}
function yM(e) {
  return typeof e == "function";
}
var gM = C.createContext(void 0);
function vM(e) {
  const n = C.useContext(gM);
  return e || n || "ltr";
}
function SM(e) {
  const n = C.useRef({ value: e, previous: e });
  return C.useMemo(() => (n.current.value !== e && (n.current.previous = n.current.value, n.current.value = e), n.current.previous), [e]);
}
function wM(e) {
  const [n, o] = C.useState(void 0);
  return VS(() => {
    if (e) {
      o({ width: e.offsetWidth, height: e.offsetHeight });
      const i = new ResizeObserver((a) => {
        if (!Array.isArray(a) || !a.length)
          return;
        const d = a[0];
        let c, p;
        if ("borderBoxSize" in d) {
          const m = d.borderBoxSize, y = Array.isArray(m) ? m[0] : m;
          c = y.inlineSize, p = y.blockSize;
        } else
          c = e.offsetWidth, p = e.offsetHeight;
        o({ width: c, height: p });
      });
      return i.observe(e, { box: "border-box" }), () => i.unobserve(e);
    } else
      o(void 0);
  }, [e]), n;
}
// @__NO_SIDE_EFFECTS__
function vd(e) {
  const n = C.forwardRef((o, i) => {
    let { children: a, ...d } = o, c = null, p = !1;
    const m = [];
    Tg(a) && typeof sa == "function" && (a = sa(a._payload)), C.Children.forEach(a, (f) => {
      var S;
      if (AM(f)) {
        p = !0;
        const x = f;
        let k = "child" in x.props ? x.props.child : x.props.children;
        Tg(k) && typeof sa == "function" && (k = sa(k._payload)), c = _M(x, k), m.push((S = c == null ? void 0 : c.props) == null ? void 0 : S.children);
      } else
        m.push(f);
    }), c ? c = C.cloneElement(c, void 0, m) : (
      // A `Slottable` was found but it didn't resolve to a single element (e.g.
      // it wrapped multiple elements, text, or a render-prop `child` that
      // wasn't an element). Don't fall back to treating the `Slottable` wrapper
      // itself as the slot target — throw a descriptive error below instead.
      !p && C.Children.count(a) === 1 && C.isValidElement(a) && (c = a)
    );
    const y = c ? kM(c) : void 0, g = Jn(i, y);
    if (!c) {
      if (a || a === 0)
        throw new Error(
          p ? EM(e) : PM(e)
        );
      return a;
    }
    const l = TM(d, c.props ?? {});
    return c.type !== C.Fragment && (l.ref = i ? g : y), C.cloneElement(c, l);
  });
  return n.displayName = `${e}.Slot`, n;
}
var xM = Symbol.for("radix.slottable"), _M = (e, n) => {
  if ("child" in e.props) {
    const o = e.props.child;
    return C.isValidElement(o) ? C.cloneElement(o, void 0, e.props.children(o.props.children)) : null;
  }
  return C.isValidElement(n) ? n : null;
};
function TM(e, n) {
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
function kM(e) {
  var i, a;
  let n = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = n && "isReactWarning" in n && n.isReactWarning;
  return o ? e.ref : (n = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = n && "isReactWarning" in n && n.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
function AM(e) {
  return C.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === xM;
}
var CM = Symbol.for("react.lazy");
function Tg(e) {
  return e != null && typeof e == "object" && "$$typeof" in e && e.$$typeof === CM && "_payload" in e && bM(e._payload);
}
function bM(e) {
  return typeof e == "object" && e !== null && "then" in e;
}
var PM = (e) => `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`, EM = (e) => `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`, sa = Pr[" use ".trim().toString()], MM = [
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
], ji = MM.reduce((e, n) => {
  const o = /* @__PURE__ */ vd(`Primitive.${n}`), i = C.forwardRef((a, d) => {
    const { asChild: c, ...p } = a, m = c ? o : n;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ w.jsx(m, { ...p, ref: d });
  });
  return i.displayName = `Primitive.${n}`, { ...e, [n]: i };
}, {});
function RM(e) {
  const n = e + "CollectionProvider", [o, i] = LS(n), [a, d] = o(
    n,
    { collectionRef: { current: null }, itemMap: /* @__PURE__ */ new Map() }
  ), c = (k) => {
    const { scope: A, children: T } = k, b = C.useRef(null), E = C.useRef(/* @__PURE__ */ new Map()).current;
    return /* @__PURE__ */ w.jsx(a, { scope: A, itemMap: E, collectionRef: b, children: T });
  };
  c.displayName = n;
  const p = e + "CollectionSlot", m = /* @__PURE__ */ vd(p), y = C.forwardRef(
    (k, A) => {
      const { scope: T, children: b } = k, E = d(p, T), D = Jn(A, E.collectionRef);
      return /* @__PURE__ */ w.jsx(m, { ref: D, children: b });
    }
  );
  y.displayName = p;
  const g = e + "CollectionItemSlot", l = "data-radix-collection-item", f = /* @__PURE__ */ vd(g), S = C.forwardRef(
    (k, A) => {
      const { scope: T, children: b, ...E } = k, D = C.useRef(null), O = Jn(A, D), H = d(g, T);
      return C.useEffect(() => (H.itemMap.set(D, { ref: D, ...E }), () => void H.itemMap.delete(D))), /* @__PURE__ */ w.jsx(f, { [l]: "", ref: O, children: b });
    }
  );
  S.displayName = g;
  function x(k) {
    const A = d(e + "CollectionConsumer", k);
    return C.useCallback(() => {
      const b = A.collectionRef.current;
      if (!b) return [];
      const E = Array.from(b.querySelectorAll(`[${l}]`));
      return Array.from(A.itemMap.values()).sort(
        (H, W) => E.indexOf(H.ref.current) - E.indexOf(W.ref.current)
      );
    }, [A.collectionRef, A.itemMap]);
  }
  return [
    { Provider: c, Slot: y, ItemSlot: S },
    x,
    i
  ];
}
var BS = ["PageUp", "PageDown"], zS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"], $S = {
  "from-left": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-right": ["Home", "PageDown", "ArrowDown", "ArrowRight"],
  "from-bottom": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-top": ["Home", "PageDown", "ArrowUp", "ArrowLeft"]
}, ko = "Slider", [Sd, DM, NM] = RM(ko), [vf] = LS(ko, [
  NM
]), [jM, Ii] = vf(ko), Sf = C.forwardRef(
  (e, n) => {
    const {
      name: o,
      min: i = 0,
      max: a = 100,
      step: d = 1,
      orientation: c = "horizontal",
      disabled: p = !1,
      minStepsBetweenThumbs: m = 0,
      defaultValue: y = [i],
      value: g,
      onValueChange: l = () => {
      },
      onValueCommit: f = () => {
      },
      inverted: S = !1,
      form: x,
      ...k
    } = e, A = C.useRef(/* @__PURE__ */ new Set()), T = C.useRef(0), b = C.useRef(!1), D = c === "horizontal" ? IM : FM, [O = [], H] = mM({
      prop: g,
      defaultProp: y,
      onChange: (Z) => {
        var ce;
        (ce = [...A.current][T.current]) == null || ce.focus({
          preventScroll: !0,
          focusVisible: b.current
        }), b.current = !1, l(Z);
      }
    }), W = C.useRef(O);
    function G(Z) {
      const de = BM(O, Z);
      se(Z, de);
    }
    function K(Z) {
      se(Z, T.current);
    }
    function X() {
      const Z = W.current[T.current];
      O[T.current] !== Z && f(O);
    }
    function se(Z, de, { commit: ce } = { commit: !1 }) {
      const Se = HM(d), re = WM(Math.round((Z - i) / d) * d + i, Se), we = OS(re, [i, a]);
      H((z = []) => {
        const J = LM(z, we, de);
        if (UM(J, m * d)) {
          T.current = J.indexOf(we);
          const Q = String(J) !== String(z);
          return Q && ce && f(J), Q ? J : z;
        } else
          return z;
      });
    }
    return /* @__PURE__ */ w.jsx(
      jM,
      {
        scope: e.__scopeSlider,
        name: o,
        disabled: p,
        min: i,
        max: a,
        valueIndexToChangeRef: T,
        thumbs: A.current,
        values: O,
        orientation: c,
        form: x,
        children: /* @__PURE__ */ w.jsx(Sd.Provider, { scope: e.__scopeSlider, children: /* @__PURE__ */ w.jsx(Sd.Slot, { scope: e.__scopeSlider, children: /* @__PURE__ */ w.jsx(
          D,
          {
            "aria-disabled": p,
            "data-disabled": p ? "" : void 0,
            ...k,
            ref: n,
            onPointerDown: co(k.onPointerDown, () => {
              p || (W.current = O, b.current = !1);
            }),
            min: i,
            max: a,
            inverted: S,
            onSlideStart: p ? void 0 : G,
            onSlideMove: p ? void 0 : K,
            onSlideEnd: p ? void 0 : X,
            onHomeKeyDown: () => {
              p || (b.current = !0, se(i, 0, { commit: !0 }));
            },
            onEndKeyDown: () => {
              p || (b.current = !0, se(a, O.length - 1, { commit: !0 }));
            },
            onStepKeyDown: ({ event: Z, direction: de }) => {
              if (!p) {
                b.current = !0;
                const re = BS.includes(Z.key) || Z.shiftKey && zS.includes(Z.key) ? 10 : 1, we = T.current, z = O[we], J = d * re * de;
                se(z + J, we, { commit: !0 });
              }
            }
          }
        ) }) })
      }
    );
  }
);
Sf.displayName = ko;
var [US, HS] = vf(ko, {
  startEdge: "left",
  endEdge: "right",
  size: "width",
  direction: 1
}), IM = C.forwardRef(
  (e, n) => {
    const {
      min: o,
      max: i,
      dir: a,
      inverted: d,
      onSlideStart: c,
      onSlideMove: p,
      onSlideEnd: m,
      onStepKeyDown: y,
      ...g
    } = e, [l, f] = C.useState(null), S = Jn(n, (E) => f(E)), x = C.useRef(void 0), k = vM(a), A = k === "ltr", T = A && !d || !A && d;
    function b(E) {
      const D = x.current || l.getBoundingClientRect(), O = [0, D.width], W = Tf(O, T ? [o, i] : [i, o]);
      return x.current = D, W(E - D.left);
    }
    return /* @__PURE__ */ w.jsx(
      US,
      {
        scope: e.__scopeSlider,
        startEdge: T ? "left" : "right",
        endEdge: T ? "right" : "left",
        direction: T ? 1 : -1,
        size: "width",
        children: /* @__PURE__ */ w.jsx(
          WS,
          {
            dir: k,
            "data-orientation": "horizontal",
            ...g,
            ref: S,
            style: {
              ...g.style,
              "--radix-slider-thumb-transform": "translateX(-50%)"
            },
            onSlideStart: (E) => {
              const D = b(E.clientX);
              c == null || c(D);
            },
            onSlideMove: (E) => {
              const D = b(E.clientX);
              p == null || p(D);
            },
            onSlideEnd: () => {
              x.current = void 0, m == null || m();
            },
            onStepKeyDown: (E) => {
              const O = $S[T ? "from-left" : "from-right"].includes(E.key);
              y == null || y({ event: E, direction: O ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), FM = C.forwardRef(
  (e, n) => {
    const {
      min: o,
      max: i,
      inverted: a,
      onSlideStart: d,
      onSlideMove: c,
      onSlideEnd: p,
      onStepKeyDown: m,
      ...y
    } = e, g = C.useRef(null), l = Jn(n, g), f = C.useRef(void 0), S = !a;
    function x(k) {
      const A = f.current || g.current.getBoundingClientRect(), T = [0, A.height], E = Tf(T, S ? [i, o] : [o, i]);
      return f.current = A, E(k - A.top);
    }
    return /* @__PURE__ */ w.jsx(
      US,
      {
        scope: e.__scopeSlider,
        startEdge: S ? "bottom" : "top",
        endEdge: S ? "top" : "bottom",
        size: "height",
        direction: S ? 1 : -1,
        children: /* @__PURE__ */ w.jsx(
          WS,
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
              c == null || c(A);
            },
            onSlideEnd: () => {
              f.current = void 0, p == null || p();
            },
            onStepKeyDown: (k) => {
              const T = $S[S ? "from-bottom" : "from-top"].includes(k.key);
              m == null || m({ event: k, direction: T ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), WS = C.forwardRef(
  (e, n) => {
    const {
      __scopeSlider: o,
      onSlideStart: i,
      onSlideMove: a,
      onSlideEnd: d,
      onHomeKeyDown: c,
      onEndKeyDown: p,
      onStepKeyDown: m,
      ...y
    } = e, g = Ii(ko, o);
    return /* @__PURE__ */ w.jsx(
      ji.span,
      {
        ...y,
        ref: n,
        onKeyDown: co(e.onKeyDown, (l) => {
          l.key === "Home" ? (c(l), l.preventDefault()) : l.key === "End" ? (p(l), l.preventDefault()) : BS.concat(zS).includes(l.key) && (m(l), l.preventDefault());
        }),
        onPointerDown: co(e.onPointerDown, (l) => {
          const f = l.target;
          f.setPointerCapture(l.pointerId), l.preventDefault(), g.thumbs.has(f) ? f.focus({ preventScroll: !0, focusVisible: !1 }) : i(l);
        }),
        onPointerMove: co(e.onPointerMove, (l) => {
          l.target.hasPointerCapture(l.pointerId) && a(l);
        }),
        onPointerUp: co(e.onPointerUp, (l) => {
          const f = l.target;
          f.hasPointerCapture(l.pointerId) && (f.releasePointerCapture(l.pointerId), d(l));
        })
      }
    );
  }
), GS = "SliderTrack", wf = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Ii(GS, o);
    return /* @__PURE__ */ w.jsx(
      ji.span,
      {
        "data-disabled": a.disabled ? "" : void 0,
        "data-orientation": a.orientation,
        ...i,
        ref: n
      }
    );
  }
);
wf.displayName = GS;
var wd = "SliderRange", xf = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Ii(wd, o), d = HS(wd, o), c = C.useRef(null), p = Jn(n, c), m = a.values.length, y = a.values.map(
      (f) => ew(f, a.min, a.max)
    ), g = m > 1 ? Math.min(...y) : 0, l = 100 - Math.max(...y);
    return /* @__PURE__ */ w.jsx(
      ji.span,
      {
        "data-orientation": a.orientation,
        "data-disabled": a.disabled ? "" : void 0,
        ...i,
        ref: p,
        style: {
          ...e.style,
          [d.startEdge]: g + "%",
          [d.endEdge]: l + "%"
        }
      }
    );
  }
);
xf.displayName = wd;
var KS = "SliderThumb", [OM, YS] = vf(KS), QS = "SliderThumbProvider";
function XS(e) {
  const {
    __scopeSlider: n,
    name: o,
    children: i,
    // @ts-expect-error internal render prop
    internal_do_not_use_render: a
  } = e, d = Ii(QS, n), c = DM(n), [p, m] = C.useState(null), y = C.useMemo(
    () => p ? c().findIndex((A) => A.ref.current === p) : -1,
    [c, p]
  ), g = wM(p), l = p ? !!d.form || !!p.closest("form") : !0, f = d.values[y], S = o ?? (d.name ? d.name + (d.values.length > 1 ? "[]" : "") : void 0), x = f === void 0 ? 0 : ew(f, d.min, d.max);
  C.useEffect(() => {
    if (p)
      return d.thumbs.add(p), () => {
        d.thumbs.delete(p);
      };
  }, [p, d.thumbs]);
  const k = {
    value: f,
    name: S,
    form: d.form,
    isFormControl: l,
    index: y,
    thumb: p,
    onThumbChange: m,
    percent: x,
    size: g
  };
  return /* @__PURE__ */ w.jsx(OM, { scope: n, ...k, children: GM(a) ? a(k) : i });
}
XS.displayName = QS;
var xa = "SliderThumbTrigger", ZS = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Ii(xa, o), d = HS(xa, o), { index: c, value: p, percent: m, size: y, onThumbChange: g } = YS(
      xa,
      o
    ), l = Jn(n, (k) => g(k)), f = VM(c, a.values.length), S = y == null ? void 0 : y[d.size], x = S ? zM(S, m, d.direction) : 0;
    return /* @__PURE__ */ w.jsx(
      "span",
      {
        style: {
          transform: "var(--radix-slider-thumb-transform)",
          position: "absolute",
          [d.startEdge]: `calc(${m}% + ${x}px)`
        },
        children: /* @__PURE__ */ w.jsx(Sd.ItemSlot, { scope: o, children: /* @__PURE__ */ w.jsx(
          ji.span,
          {
            role: "slider",
            "aria-label": e["aria-label"] || f,
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
            onFocus: co(e.onFocus, () => {
              a.valueIndexToChangeRef.current = c;
            })
          }
        ) })
      }
    );
  }
);
ZS.displayName = xa;
var _f = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, name: i, ...a } = e;
    return /* @__PURE__ */ w.jsx(
      XS,
      {
        __scopeSlider: o,
        name: i,
        internal_do_not_use_render: ({ index: d, isFormControl: c }) => /* @__PURE__ */ w.jsxs(w.Fragment, { children: [
          /* @__PURE__ */ w.jsx(
            ZS,
            {
              ...a,
              ref: n,
              __scopeSlider: o
            }
          ),
          c ? /* @__PURE__ */ w.jsx(
            qS,
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
_f.displayName = KS;
var JS = "SliderBubbleInput", qS = C.forwardRef(
  ({ __scopeSlider: e, ...n }, o) => {
    const { value: i, name: a, form: d } = YS(JS, e), c = C.useRef(null), p = Jn(c, o), m = SM(i);
    return C.useEffect(() => {
      const y = c.current;
      if (!y) return;
      const g = window.HTMLInputElement.prototype, f = Object.getOwnPropertyDescriptor(g, "value").set;
      if (m !== i && f) {
        const S = new Event("input", { bubbles: !0 });
        f.call(y, i), y.dispatchEvent(S);
      }
    }, [m, i]), /* @__PURE__ */ w.jsx(
      ji.input,
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
qS.displayName = JS;
function LM(e = [], n, o) {
  const i = [...e];
  return i[o] = n, i.sort((a, d) => a - d);
}
function ew(e, n, o) {
  const d = 100 / (o - n) * (e - n);
  return OS(d, [0, 100]);
}
function VM(e, n) {
  return n > 2 ? `Value ${e + 1} of ${n}` : n === 2 ? ["Minimum", "Maximum"][e] : void 0;
}
function BM(e, n) {
  if (e.length === 1) return 0;
  const o = e.map((a) => Math.abs(a - n)), i = Math.min(...o);
  return o.indexOf(i);
}
function zM(e, n, o) {
  const i = e / 2, d = Tf([0, 50], [0, i]);
  return (i - d(n) * o) * o;
}
function $M(e) {
  return e.slice(0, -1).map((n, o) => e[o + 1] - n);
}
function UM(e, n) {
  if (n > 0) {
    const o = $M(e);
    return Math.min(...o) >= n;
  }
  return !0;
}
function Tf(e, n) {
  return (o) => {
    if (e[0] === e[1] || n[0] === n[1]) return n[0];
    const i = (n[1] - n[0]) / (e[1] - e[0]);
    return n[0] + i * (o - e[0]);
  };
}
function HM(e) {
  if (!Number.isFinite(e)) return 0;
  const n = e.toString();
  if (n.includes("e")) {
    const [i, a] = n.split("e"), d = i.split(".")[1] || "", c = Number(a);
    return Math.max(0, d.length - c);
  }
  const o = n.split(".")[1];
  return o ? o.length : 0;
}
function WM(e, n) {
  const o = Math.pow(10, n);
  return Math.round(e * o) / o;
}
function GM(e) {
  return typeof e == "function";
}
function kg({ label: e, icon: n, value: o, onChange: i }) {
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
      Sf,
      {
        className: "radix-slider-root",
        value: [o],
        min: 0,
        max: 100,
        step: 1,
        onValueChange: (a) => i(a[0]),
        children: [
          /* @__PURE__ */ w.jsx(wf, { className: "radix-slider-track", children: /* @__PURE__ */ w.jsx(xf, { className: "radix-slider-range" }) }),
          /* @__PURE__ */ w.jsx(_f, { className: "radix-slider-thumb", "aria-label": e })
        ]
      }
    )
  ] });
}
function KM({ audioState: e }) {
  const n = Y((g) => g.musicType), o = Y((g) => g.ambientSound), i = Y((g) => g.musicVolume), a = Y((g) => g.ambientVolume), d = Y((g) => g.audioPlaying), c = Y((g) => g.setSound), p = Y((g) => g.toggleAudio), m = Ka({ musicType: n, ambientSound: o }), y = m.ambientLayers.map((g) => g.title).filter(Boolean).join(" + ");
  return /* @__PURE__ */ w.jsxs("div", { className: "sound-panel", children: [
    /* @__PURE__ */ w.jsxs("label", { className: "focus-field", children: [
      "Music selector",
      /* @__PURE__ */ w.jsx("select", { value: n, onChange: (g) => c("musicType", g.target.value), children: Kn.map((g) => /* @__PURE__ */ w.jsx("option", { value: g.label, children: g.label }, g.label)) })
    ] }),
    /* @__PURE__ */ w.jsx(
      kg,
      {
        label: "Music volume",
        icon: /* @__PURE__ */ w.jsx(Xa, { size: 16, "aria-hidden": "true" }),
        value: i,
        onChange: (g) => c("musicVolume", g)
      }
    ),
    /* @__PURE__ */ w.jsxs("label", { className: "focus-field", children: [
      "Ambient sound selector",
      /* @__PURE__ */ w.jsx("select", { value: o, onChange: (g) => c("ambientSound", g.target.value), children: Yn.map((g) => /* @__PURE__ */ w.jsx("option", { value: g.label, children: g.label }, g.label)) })
    ] }),
    /* @__PURE__ */ w.jsx(
      kg,
      {
        label: "Ambient volume",
        icon: /* @__PURE__ */ w.jsx(rf, { size: 16, "aria-hidden": "true" }),
        value: a,
        onChange: (g) => c("ambientVolume", g)
      }
    ),
    /* @__PURE__ */ w.jsxs("div", { className: "audio-preview liquid-glass-lite", children: [
      /* @__PURE__ */ w.jsxs("div", { children: [
        /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Theme audio preview" }),
        /* @__PURE__ */ w.jsx("strong", { children: m.musicTrack.title }),
        /* @__PURE__ */ w.jsx("p", { children: y }),
        e != null && e.error ? /* @__PURE__ */ w.jsx("p", { className: "audio-error", children: e.error }) : null
      ] }),
      /* @__PURE__ */ w.jsx(Pe, { variant: d ? "primary" : "ghost", onClick: p, children: d ? "Pause audio" : "Play audio" })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "audio-links", children: [m.musicTrack, ...m.ambientLayers].filter((g) => g == null ? void 0 : g.pageUrl).map((g) => /* @__PURE__ */ w.jsx("a", { href: g.pageUrl, target: "_blank", rel: "noreferrer", children: g.title || g.label || "Audio source" }, g.pageUrl)) })
  ] });
}
const YM = [
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
], QM = [
  ["white-noise", "White noise"],
  ["pink-noise", "Pink noise"],
  ["brown-noise", "Brown noise"]
], XM = [
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
function aa({ id: e, label: n, value: o, icon: i = null, onChange: a, card: d = !1 }) {
  const c = Number.isFinite(Number(o)) ? Number(o) : 0, p = c > 0;
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
        c,
        "%"
      ] })
    ] }),
    /* @__PURE__ */ w.jsxs(
      Sf,
      {
        className: "radix-slider-root",
        value: [c],
        min: 0,
        max: 100,
        step: 1,
        onValueChange: (m) => a(e, m[0]),
        children: [
          /* @__PURE__ */ w.jsx(wf, { className: "radix-slider-track", children: /* @__PURE__ */ w.jsx(xf, { className: "radix-slider-range" }) }),
          /* @__PURE__ */ w.jsx(_f, { className: "radix-slider-thumb", "aria-label": `${n} volume` })
        ]
      }
    )
  ] });
}
function ZM({ audioState: e, scene: n, onClose: o }) {
  const i = Y((T) => T.audioChannels), a = Y((T) => T.setSound), d = Y((T) => T.returnToSetup), c = Y((T) => T.musicType), p = Y((T) => T.ambientSound), m = Y((T) => T.musicVolume), y = Y((T) => T.ambientVolume), [g, l] = C.useState(!1), f = (T, b) => {
    l(!1), a(`audioChannel:${T}`, b);
  }, S = (T, b) => a("musicVolume", b), x = (T, b) => a("ambientVolume", b), k = () => {
    const T = Kn[Math.floor(Math.random() * Kn.length)], b = Yn[Math.floor(Math.random() * Yn.length)];
    a("musicType", T.label), a("ambientSound", b.label), l(!1);
  }, A = () => {
    a("musicType", (n == null ? void 0 : n.musicType) || "Deep Focus"), a("ambientSound", (n == null ? void 0 : n.ambientSound) || "Nature"), l(!0);
  };
  return /* @__PURE__ */ w.jsxs(
    vn.aside,
    {
      className: "focus-utility-panel room-control-panel liquid-glass",
      initial: { opacity: 0, y: 18 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 14 },
      transition: Na,
      role: "dialog",
      "aria-label": "Room settings",
      children: [
        /* @__PURE__ */ w.jsxs("header", { className: "room-control-head", children: [
          /* @__PURE__ */ w.jsxs("div", { children: [
            /* @__PURE__ */ w.jsx("span", { className: "control-eyebrow", children: "Control" }),
            /* @__PURE__ */ w.jsx("h2", { children: "Room settings" })
          ] }),
          /* @__PURE__ */ w.jsx(Pe, { className: "room-control-close", "aria-label": "Close room settings", onClick: o, children: /* @__PURE__ */ w.jsx($0, { size: 16, "aria-hidden": "true" }) })
        ] }),
        /* @__PURE__ */ w.jsx("div", { className: "room-control-divider", "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("div", { className: "room-control-setup-actions", children: /* @__PURE__ */ w.jsx(
          Pe,
          {
            className: "room-control-setup-btn",
            onClick: () => {
              o == null || o(), d();
            },
            "data-focus-return-setup": "true",
            children: "Change scene & setup"
          }
        ) }),
        /* @__PURE__ */ w.jsx("section", { className: "room-control-topics", "aria-label": "Focus topics", children: /* @__PURE__ */ w.jsx(W0, {}) }),
        /* @__PURE__ */ w.jsxs("div", { className: "room-control-grid", children: [
          /* @__PURE__ */ w.jsxs("section", { className: "room-control-col room-control-scenes", "aria-label": "Scenes", children: [
            /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Scenes" }),
            /* @__PURE__ */ w.jsx(sf, {})
          ] }),
          /* @__PURE__ */ w.jsxs("section", { className: "room-control-col room-control-audio", children: [
            /* @__PURE__ */ w.jsxs("div", { className: "room-control-masters", children: [
              /* @__PURE__ */ w.jsxs("div", { className: "room-control-block", children: [
                /* @__PURE__ */ w.jsxs("div", { className: "room-control-block-head", children: [
                  /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Music" }),
                  /* @__PURE__ */ w.jsx(Pe, { className: "room-control-icon-btn", "aria-label": "Shuffle to a random track", onClick: k, children: /* @__PURE__ */ w.jsx(Ub, { size: 15, "aria-hidden": "true" }) })
                ] }),
                /* @__PURE__ */ w.jsxs("label", { className: "room-select-field", children: [
                  /* @__PURE__ */ w.jsx("span", { className: "sr-only", children: "Music track" }),
                  /* @__PURE__ */ w.jsx("select", { value: c, onChange: (T) => {
                    l(!1), a("musicType", T.target.value);
                  }, children: Kn.map((T) => /* @__PURE__ */ w.jsx("option", { value: T.label, children: T.label }, T.label)) })
                ] }),
                /* @__PURE__ */ w.jsx(aa, { id: "music-volume", label: "Music volume", icon: /* @__PURE__ */ w.jsx(Xa, { size: 15, "aria-hidden": "true" }), value: m, onChange: S })
              ] }),
              /* @__PURE__ */ w.jsxs("div", { className: "room-control-block", children: [
                /* @__PURE__ */ w.jsxs("div", { className: "room-control-block-head", children: [
                  /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Scene sound" }),
                  /* @__PURE__ */ w.jsx(Pe, { className: "room-control-icon-btn", "aria-label": g ? "Mix saved" : "Save current mix", onClick: () => l(!0), children: g ? /* @__PURE__ */ w.jsx(Qa, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(B0, { size: 15, "aria-hidden": "true" }) })
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
                  }, children: Yn.map((T) => /* @__PURE__ */ w.jsx("option", { value: T.label, children: T.label }, T.label)) })
                ] }),
                /* @__PURE__ */ w.jsx(aa, { id: "ambient-volume", label: "Ambient volume", icon: /* @__PURE__ */ w.jsx(rf, { size: 15, "aria-hidden": "true" }), value: y, onChange: x })
              ] })
            ] }),
            /* @__PURE__ */ w.jsxs("div", { className: "room-control-block", children: [
              /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Focus noise" }),
              /* @__PURE__ */ w.jsx("div", { className: "room-noise-row", children: QM.map(([T, b]) => /* @__PURE__ */ w.jsx(aa, { id: T, label: b, value: i == null ? void 0 : i[T], onChange: f, card: !0 }, T)) })
            ] }),
            /* @__PURE__ */ w.jsxs("div", { className: "room-control-block", children: [
              /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Ambient atmosphere" }),
              /* @__PURE__ */ w.jsx("div", { className: "room-ambient-grid", children: XM.map(([T, b]) => /* @__PURE__ */ w.jsx(aa, { id: T, label: b, value: i == null ? void 0 : i[T], onChange: f, card: !0 }, T)) })
            ] }),
            e != null && e.error ? /* @__PURE__ */ w.jsx("p", { className: "audio-error", children: e.error }) : null
          ] })
        ] })
      ]
    }
  );
}
function la({ title: e, kicker: n, icon: o, children: i, onClose: a, className: d = "" }) {
  return /* @__PURE__ */ w.jsxs(vn.aside, { className: `focus-utility-panel liquid-glass ${d}`.trim(), initial: { opacity: 0, y: 12, x: -18 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: 10, x: -18 }, transition: Na, role: "dialog", "aria-label": e, children: [
    /* @__PURE__ */ w.jsxs("div", { className: "drawer-head", children: [
      /* @__PURE__ */ w.jsxs("div", { className: "utility-title", children: [
        /* @__PURE__ */ w.jsx("span", { className: "utility-title-icon", children: o }),
        /* @__PURE__ */ w.jsxs("div", { children: [
          /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: n }),
          /* @__PURE__ */ w.jsx("h2", { children: e })
        ] })
      ] }),
      /* @__PURE__ */ w.jsx(Pe, { "aria-label": `Close ${e}`, onClick: a, children: /* @__PURE__ */ w.jsx($0, { size: 16, "aria-hidden": "true" }) })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "utility-panel-body", children: i })
  ] });
}
function JM({ audioState: e, scene: n }) {
  const o = Y((y) => y.audioChannels), i = Y((y) => y.setSound), [a, d] = C.useState(!1), c = (y, g) => {
    d(!1), i(`audioChannel:${y}`, g);
  }, p = () => {
    const y = Kn[Math.floor(Math.random() * Kn.length)], g = Yn[Math.floor(Math.random() * Yn.length)];
    i("musicType", y.label), i("ambientSound", g.label), d(!0);
  }, m = () => {
    i("musicType", (n == null ? void 0 : n.musicType) || "Deep Focus"), i("ambientSound", (n == null ? void 0 : n.ambientSound) || "Nature"), d(!0);
  };
  return /* @__PURE__ */ w.jsxs("div", { className: "sound-mixer", children: [
    /* @__PURE__ */ w.jsxs("div", { className: "mixer-featured-row", children: [
      /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Music library" }),
      /* @__PURE__ */ w.jsxs(Pe, { onClick: p, children: [
        /* @__PURE__ */ w.jsx(Sb, { size: 14, "aria-hidden": "true" }),
        " Random track"
      ] })
    ] }),
    /* @__PURE__ */ w.jsx(KM, { audioState: e, compact: !0 }),
    /* @__PURE__ */ w.jsxs("div", { className: "mixer-preset-row", children: [
      /* @__PURE__ */ w.jsxs("button", { type: "button", className: "mixer-preset-button", onClick: m, children: [
        "Apply scene mix ",
        /* @__PURE__ */ w.jsx("span", { children: "↗" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { onClick: () => d(!0), children: [
        a ? /* @__PURE__ */ w.jsx(Qa, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(B0, { size: 14, "aria-hidden": "true" }),
        " ",
        a ? "Saved" : "Save current mix"
      ] })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "mixer-channel-grid", children: YM.map(([y, g]) => /* @__PURE__ */ w.jsxs("label", { className: "mixer-channel", children: [
      /* @__PURE__ */ w.jsxs("span", { children: [
        /* @__PURE__ */ w.jsx("i", { className: `mixer-channel-dot mixer-${y}` }),
        g
      ] }),
      /* @__PURE__ */ w.jsxs("strong", { children: [
        o[y],
        "%"
      ] }),
      /* @__PURE__ */ w.jsx("input", { type: "range", min: "0", max: "100", value: o[y], "aria-label": `${g} volume`, onChange: (l) => c(y, l.target.value) })
    ] }, y)) }),
    e != null && e.error ? /* @__PURE__ */ w.jsx("p", { className: "audio-error", children: e.error }) : null
  ] });
}
function qM() {
  const e = () => {
    var i, a, d;
    return ((d = (a = (i = globalThis.window) == null ? void 0 : i.SynapseAuth) == null ? void 0 : a.getStoredSession) == null ? void 0 : d.call(a)) || null;
  }, [n, o] = C.useState(e);
  return C.useEffect(() => {
    var c, p, m, y;
    let i = !0;
    const a = (g) => {
      var l;
      i && o(((l = g == null ? void 0 : g.detail) == null ? void 0 : l.session) || e());
    };
    (c = globalThis.window) == null || c.addEventListener("synapse-auth-changed", a);
    const d = (y = (m = (p = globalThis.window) == null ? void 0 : p.SynapseAuth) == null ? void 0 : m.syncSessionFromProvider) == null ? void 0 : y.call(m);
    return Promise.resolve(d).finally(() => a()), () => {
      var g;
      i = !1, (g = globalThis.window) == null || g.removeEventListener("synapse-auth-changed", a);
    };
  }, []), n;
}
function eR({ onWorkspace: e, session: n }) {
  return !!n ? /* @__PURE__ */ w.jsxs("div", { className: "utility-empty-state", children: [
    /* @__PURE__ */ w.jsx(Oa, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Your Focus Trail" }),
    /* @__PURE__ */ w.jsx("p", { children: "Recent sessions and progress remain available through Synapse history." }),
    /* @__PURE__ */ w.jsx(Pe, { variant: "primary", onClick: () => e == null ? void 0 : e("", "history"), children: "Open session history" })
  ] }) : /* @__PURE__ */ w.jsxs("div", { className: "utility-login-state", children: [
    /* @__PURE__ */ w.jsx(Oa, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Your rhythm, remembered" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Sign in to view your Focus Trail" }),
    /* @__PURE__ */ w.jsx("p", { children: "Track deep-work time, completed goals, and your study streak across devices." }),
    /* @__PURE__ */ w.jsx(Pe, { variant: "primary", onClick: () => e == null ? void 0 : e(), children: "Sign in with Synapse" }),
    /* @__PURE__ */ w.jsx("small", { children: "Your current session continues without an account." })
  ] });
}
function tR({ onWorkspace: e, session: n }) {
  return !!n ? /* @__PURE__ */ w.jsxs("div", { className: "utility-empty-state", children: [
    /* @__PURE__ */ w.jsx(La, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Companion Room" }),
    /* @__PURE__ */ w.jsx("p", { children: "Invite a study partner from your Synapse workspace to share this quiet room." }),
    /* @__PURE__ */ w.jsx(Pe, { variant: "primary", onClick: () => e == null ? void 0 : e("", "companion"), children: "Open Companion Room" })
  ] }) : /* @__PURE__ */ w.jsxs("div", { className: "utility-login-state", children: [
    /* @__PURE__ */ w.jsx(La, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Study alongside someone" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Sign in to use Companion Room" }),
    /* @__PURE__ */ w.jsx("p", { children: "Keep your own goal private while sharing the feeling of showing up together." }),
    /* @__PURE__ */ w.jsx(Pe, { variant: "primary", onClick: () => e == null ? void 0 : e(), children: "Go to sign in" }),
    /* @__PURE__ */ w.jsx("small", { children: "No companion data is created in Focus Room." })
  ] });
}
function nR({ audioState: e, utilityPanel: n, onClose: o, onWorkspace: i }) {
  const a = Y((y) => y.activeDrawer), d = Y((y) => y.closeDrawer), c = Y((y) => y.selectedScene), p = qM(), m = C.useMemo(() => Sn.find((y) => y.id === c) || Sn[0], [c]);
  return /* @__PURE__ */ w.jsxs(Wa, { children: [
    n === "trail" ? /* @__PURE__ */ w.jsx(la, { title: "Focus Trail", kicker: "Your progress", icon: /* @__PURE__ */ w.jsx(Oa, { size: 16 }), onClose: o, children: /* @__PURE__ */ w.jsx(eR, { onWorkspace: i, session: p }) }) : null,
    n === "companion" ? /* @__PURE__ */ w.jsx(la, { title: "Companion Room", kicker: "Shared focus", icon: /* @__PURE__ */ w.jsx(La, { size: 16 }), onClose: o, children: /* @__PURE__ */ w.jsx(tR, { onWorkspace: i, session: p }) }) : null,
    n === "settings" ? /* @__PURE__ */ w.jsx(ZM, { audioState: e, scene: m, onClose: o }) : null,
    !n && a === "scene" ? /* @__PURE__ */ w.jsx(la, { title: "Choose scene", kicker: "Scene", icon: /* @__PURE__ */ w.jsx(z0, { size: 16 }), onClose: d, children: /* @__PURE__ */ w.jsx(sf, {}) }) : null,
    !n && a === "music" ? /* @__PURE__ */ w.jsx(la, { title: "Sound atmosphere", kicker: "Room audio", icon: /* @__PURE__ */ w.jsx(Xa, { size: 16 }), onClose: d, children: /* @__PURE__ */ w.jsx(JM, { audioState: e, scene: m }) }) : null
  ] });
}
function rR(e, n) {
  return n ? Math.min(100, Math.max(0, e / n * 100)) : 0;
}
function oR({ onExit: e }) {
  const n = Y((y) => y.elapsedSeconds), o = Y((y) => y.pomodoroDuration), i = Y((y) => y.pomodoroDurationSeconds), a = Y((y) => y.timerMode), d = Y((y) => y.timerStatus), c = Y((y) => y.currentSession), p = Number(i) || (Number(o) || 0) * 60, m = a === "countup" ? n : Math.max(0, p - n);
  return /* @__PURE__ */ w.jsxs("div", { className: "compact-focus-mode-card", "aria-label": "Distraction-free focus timer", children: [
    /* @__PURE__ */ w.jsxs("div", { className: "compact-focus-card-top", children: [
      /* @__PURE__ */ w.jsxs("span", { children: [
        "POMODORO #",
        (c == null ? void 0 : c.pomodoroNumber) || 1
      ] }),
      /* @__PURE__ */ w.jsx(Pe, { className: "compact-exit-button", onClick: e, "aria-label": "Exit Focus Mode", children: /* @__PURE__ */ w.jsx(Cb, { size: 14, "aria-hidden": "true" }) })
    ] }),
    /* @__PURE__ */ w.jsxs("span", { className: "compact-focus-status", children: [
      /* @__PURE__ */ w.jsx("i", {}),
      d === "paused" ? "Paused" : "In focus"
    ] }),
    /* @__PURE__ */ w.jsx("strong", { children: td(m) }),
    /* @__PURE__ */ w.jsx("div", { className: "compact-focus-progress", children: /* @__PURE__ */ w.jsx("span", { style: { width: `${rR(n, p)}%` } }) }),
    /* @__PURE__ */ w.jsxs("small", { children: [
      lf(p),
      " session"
    ] }),
    /* @__PURE__ */ w.jsx("span", { className: "sr-only", children: "Press Escape to exit Focus Mode." })
  ] });
}
var xc = {};
/*!
 *  howler.js v2.2.4
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */
var Ag;
function iR() {
  return Ag || (Ag = 1, (function(e) {
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
          var f = this || o;
          if (l = parseFloat(l), f.ctx || g(), typeof l < "u" && l >= 0 && l <= 1) {
            if (f._volume = l, f._muted)
              return f;
            f.usingWebAudio && f.masterGain.gain.setValueAtTime(l, o.ctx.currentTime);
            for (var S = 0; S < f._howls.length; S++)
              if (!f._howls[S]._webAudio)
                for (var x = f._howls[S]._getSoundIds(), k = 0; k < x.length; k++) {
                  var A = f._howls[S]._soundById(x[k]);
                  A && A._node && (A._node.volume = A._volume * l);
                }
            return f;
          }
          return f._volume;
        },
        /**
         * Handle muting and unmuting globally.
         * @param  {Boolean} muted Is muted or not.
         */
        mute: function(l) {
          var f = this || o;
          f.ctx || g(), f._muted = l, f.usingWebAudio && f.masterGain.gain.setValueAtTime(l ? 0 : f._volume, o.ctx.currentTime);
          for (var S = 0; S < f._howls.length; S++)
            if (!f._howls[S]._webAudio)
              for (var x = f._howls[S]._getSoundIds(), k = 0; k < x.length; k++) {
                var A = f._howls[S]._soundById(x[k]);
                A && A._node && (A._node.muted = l ? !0 : A._muted);
              }
          return f;
        },
        /**
         * Handle stopping all sounds globally.
         */
        stop: function() {
          for (var l = this || o, f = 0; f < l._howls.length; f++)
            l._howls[f].stop();
          return l;
        },
        /**
         * Unload and destroy all currently loaded Howl objects.
         * @return {Howler}
         */
        unload: function() {
          for (var l = this || o, f = l._howls.length - 1; f >= 0; f--)
            l._howls[f].unload();
          return l.usingWebAudio && l.ctx && typeof l.ctx.close < "u" && (l.ctx.close(), l.ctx = null, g()), l;
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
                var f = new Audio();
                typeof f.oncanplaythrough > "u" && (l._canPlayEvent = "canplay");
              } catch {
                l.noAudio = !0;
              }
            else
              l.noAudio = !0;
          try {
            var f = new Audio();
            f.muted && (l.noAudio = !0);
          } catch {
          }
          return l.noAudio || l._setupCodecs(), l;
        },
        /**
         * Check for browser support for various codecs and cache the results.
         * @return {Howler}
         */
        _setupCodecs: function() {
          var l = this || o, f = null;
          try {
            f = typeof Audio < "u" ? new Audio() : null;
          } catch {
            return l;
          }
          if (!f || typeof f.canPlayType != "function")
            return l;
          var S = f.canPlayType("audio/mpeg;").replace(/^no$/, ""), x = l._navigator ? l._navigator.userAgent : "", k = x.match(/OPR\/(\d+)/g), A = k && parseInt(k[0].split("/")[1], 10) < 33, T = x.indexOf("Safari") !== -1 && x.indexOf("Chrome") === -1, b = x.match(/Version\/(.*?) /), E = T && b && parseInt(b[1], 10) < 15;
          return l._codecs = {
            mp3: !!(!A && (S || f.canPlayType("audio/mp3;").replace(/^no$/, ""))),
            mpeg: !!S,
            opus: !!f.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, ""),
            ogg: !!f.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ""),
            oga: !!f.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ""),
            wav: !!(f.canPlayType('audio/wav; codecs="1"') || f.canPlayType("audio/wav")).replace(/^no$/, ""),
            aac: !!f.canPlayType("audio/aac;").replace(/^no$/, ""),
            caf: !!f.canPlayType("audio/x-caf;").replace(/^no$/, ""),
            m4a: !!(f.canPlayType("audio/x-m4a;") || f.canPlayType("audio/m4a;") || f.canPlayType("audio/aac;")).replace(/^no$/, ""),
            m4b: !!(f.canPlayType("audio/x-m4b;") || f.canPlayType("audio/m4b;") || f.canPlayType("audio/aac;")).replace(/^no$/, ""),
            mp4: !!(f.canPlayType("audio/x-mp4;") || f.canPlayType("audio/mp4;") || f.canPlayType("audio/aac;")).replace(/^no$/, ""),
            weba: !!(!E && f.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, "")),
            webm: !!(!E && f.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, "")),
            dolby: !!f.canPlayType('audio/mp4; codecs="ec-3"').replace(/^no$/, ""),
            flac: !!(f.canPlayType("audio/x-flac;") || f.canPlayType("audio/flac;")).replace(/^no$/, "")
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
            var f = function(S) {
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
                  for (var A = l._howls[k]._getSoundIds(), T = 0; T < A.length; T++) {
                    var b = l._howls[k]._soundById(A[T]);
                    b && b._node && !b._node._unlocked && (b._node._unlocked = !0, b._node.load());
                  }
              l._autoResume();
              var E = l.ctx.createBufferSource();
              E.buffer = l._scratchBuffer, E.connect(l.ctx.destination), typeof E.start > "u" ? E.noteOn(0) : E.start(0), typeof l.ctx.resume == "function" && l.ctx.resume(), E.onended = function() {
                E.disconnect(0), l._audioUnlocked = !0, document.removeEventListener("touchstart", f, !0), document.removeEventListener("touchend", f, !0), document.removeEventListener("click", f, !0), document.removeEventListener("keydown", f, !0);
                for (var D = 0; D < l._howls.length; D++)
                  l._howls[D]._emit("unlock");
              };
            };
            return document.addEventListener("touchstart", f, !0), document.addEventListener("touchend", f, !0), document.addEventListener("click", f, !0), document.addEventListener("keydown", f, !0), l;
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
          var f = new Audio().play();
          return f && typeof Promise < "u" && (f instanceof Promise || typeof f.then == "function") && f.catch(function() {
            console.warn("HTML5 Audio pool exhausted, returning potentially locked audio object.");
          }), new Audio();
        },
        /**
         * Return an activated HTML5 Audio object to the pool.
         * @return {Howler}
         */
        _releaseHtml5Audio: function(l) {
          var f = this || o;
          return l._unlocked && f._html5AudioPool.push(l), f;
        },
        /**
         * Automatically suspend the Web Audio AudioContext after no sound has played for 30 seconds.
         * This saves processing/energy and fixes various browser-specific bugs with audio getting stuck.
         * @return {Howler}
         */
        _autoSuspend: function() {
          var l = this;
          if (!(!l.autoSuspend || !l.ctx || typeof l.ctx.suspend > "u" || !o.usingWebAudio)) {
            for (var f = 0; f < l._howls.length; f++)
              if (l._howls[f]._webAudio) {
                for (var S = 0; S < l._howls[f]._sounds.length; S++)
                  if (!l._howls[f]._sounds[S]._paused)
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
              for (var f = 0; f < l._howls.length; f++)
                l._howls[f]._emit("resume");
            }), l._suspendTimer && (clearTimeout(l._suspendTimer), l._suspendTimer = null)) : l.state === "suspending" && (l._resumeAfterSuspend = !0), l;
        }
      };
      var o = new n(), i = function(l) {
        var f = this;
        if (!l.src || l.src.length === 0) {
          console.error("An array of source files must be passed with any new Howl.");
          return;
        }
        f.init(l);
      };
      i.prototype = {
        /**
         * Initialize a new Howl group object.
         * @param  {Object} o Passed in properties for this group.
         * @return {Howl}
         */
        init: function(l) {
          var f = this;
          return o.ctx || g(), f._autoplay = l.autoplay || !1, f._format = typeof l.format != "string" ? l.format : [l.format], f._html5 = l.html5 || !1, f._muted = l.mute || !1, f._loop = l.loop || !1, f._pool = l.pool || 5, f._preload = typeof l.preload == "boolean" || l.preload === "metadata" ? l.preload : !0, f._rate = l.rate || 1, f._sprite = l.sprite || {}, f._src = typeof l.src != "string" ? l.src : [l.src], f._volume = l.volume !== void 0 ? l.volume : 1, f._xhr = {
            method: l.xhr && l.xhr.method ? l.xhr.method : "GET",
            headers: l.xhr && l.xhr.headers ? l.xhr.headers : null,
            withCredentials: l.xhr && l.xhr.withCredentials ? l.xhr.withCredentials : !1
          }, f._duration = 0, f._state = "unloaded", f._sounds = [], f._endTimers = {}, f._queue = [], f._playLock = !1, f._onend = l.onend ? [{ fn: l.onend }] : [], f._onfade = l.onfade ? [{ fn: l.onfade }] : [], f._onload = l.onload ? [{ fn: l.onload }] : [], f._onloaderror = l.onloaderror ? [{ fn: l.onloaderror }] : [], f._onplayerror = l.onplayerror ? [{ fn: l.onplayerror }] : [], f._onpause = l.onpause ? [{ fn: l.onpause }] : [], f._onplay = l.onplay ? [{ fn: l.onplay }] : [], f._onstop = l.onstop ? [{ fn: l.onstop }] : [], f._onmute = l.onmute ? [{ fn: l.onmute }] : [], f._onvolume = l.onvolume ? [{ fn: l.onvolume }] : [], f._onrate = l.onrate ? [{ fn: l.onrate }] : [], f._onseek = l.onseek ? [{ fn: l.onseek }] : [], f._onunlock = l.onunlock ? [{ fn: l.onunlock }] : [], f._onresume = [], f._webAudio = o.usingWebAudio && !f._html5, typeof o.ctx < "u" && o.ctx && o.autoUnlock && o._unlockAudio(), o._howls.push(f), f._autoplay && f._queue.push({
            event: "play",
            action: function() {
              f.play();
            }
          }), f._preload && f._preload !== "none" && f.load(), f;
        },
        /**
         * Load the audio file.
         * @return {Howler}
         */
        load: function() {
          var l = this, f = null;
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
              f = l._src[S];
              break;
            }
          }
          if (!f) {
            l._emit("loaderror", null, "No codec support for selected audio sources.");
            return;
          }
          return l._src = f, l._state = "loading", window.location.protocol === "https:" && f.slice(0, 5) === "http:" && (l._html5 = !0, l._webAudio = !1), new a(l), l._webAudio && c(l), l;
        },
        /**
         * Play a sound or resume previous playback.
         * @param  {String/Number} sprite   Sprite name for sprite playback or sound id to continue previous.
         * @param  {Boolean} internal Internal Use: true prevents event firing.
         * @return {Number}          Sound ID.
         */
        play: function(l, f) {
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
          var T = x ? S._soundById(x) : S._inactiveSound();
          if (!T)
            return null;
          if (x && !l && (l = T._sprite || "__default"), S._state !== "loaded") {
            T._sprite = l, T._ended = !1;
            var b = T._id;
            return S._queue.push({
              event: "play",
              action: function() {
                S.play(b);
              }
            }), b;
          }
          if (x && !T._paused)
            return f || S._loadQueue("play"), T._id;
          S._webAudio && o._autoResume();
          var E = Math.max(0, T._seek > 0 ? T._seek : S._sprite[l][0] / 1e3), D = Math.max(0, (S._sprite[l][0] + S._sprite[l][1]) / 1e3 - E), O = D * 1e3 / Math.abs(T._rate), H = S._sprite[l][0] / 1e3, W = (S._sprite[l][0] + S._sprite[l][1]) / 1e3;
          T._sprite = l, T._ended = !1;
          var G = function() {
            T._paused = !1, T._seek = E, T._start = H, T._stop = W, T._loop = !!(T._loop || S._sprite[l][2]);
          };
          if (E >= W) {
            S._ended(T);
            return;
          }
          var K = T._node;
          if (S._webAudio) {
            var X = function() {
              S._playLock = !1, G(), S._refreshBuffer(T);
              var ce = T._muted || S._muted ? 0 : T._volume;
              K.gain.setValueAtTime(ce, o.ctx.currentTime), T._playStart = o.ctx.currentTime, typeof K.bufferSource.start > "u" ? T._loop ? K.bufferSource.noteGrainOn(0, E, 86400) : K.bufferSource.noteGrainOn(0, E, D) : T._loop ? K.bufferSource.start(0, E, 86400) : K.bufferSource.start(0, E, D), O !== 1 / 0 && (S._endTimers[T._id] = setTimeout(S._ended.bind(S, T), O)), f || setTimeout(function() {
                S._emit("play", T._id), S._loadQueue();
              }, 0);
            };
            o.state === "running" && o.ctx.state !== "interrupted" ? X() : (S._playLock = !0, S.once("resume", X), S._clearTimer(T._id));
          } else {
            var se = function() {
              K.currentTime = E, K.muted = T._muted || S._muted || o._muted || K.muted, K.volume = T._volume * o.volume(), K.playbackRate = T._rate;
              try {
                var ce = K.play();
                if (ce && typeof Promise < "u" && (ce instanceof Promise || typeof ce.then == "function") ? (S._playLock = !0, G(), ce.then(function() {
                  S._playLock = !1, K._unlocked = !0, f ? S._loadQueue() : S._emit("play", T._id);
                }).catch(function() {
                  S._playLock = !1, S._emit("playerror", T._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction."), T._ended = !0, T._paused = !0;
                })) : f || (S._playLock = !1, G(), S._emit("play", T._id)), K.playbackRate = T._rate, K.paused) {
                  S._emit("playerror", T._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.");
                  return;
                }
                l !== "__default" || T._loop ? S._endTimers[T._id] = setTimeout(S._ended.bind(S, T), O) : (S._endTimers[T._id] = function() {
                  S._ended(T), K.removeEventListener("ended", S._endTimers[T._id], !1);
                }, K.addEventListener("ended", S._endTimers[T._id], !1));
              } catch (Se) {
                S._emit("playerror", T._id, Se);
              }
            };
            K.src === "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA" && (K.src = S._src, K.load());
            var Z = window && window.ejecta || !K.readyState && o._navigator.isCocoonJS;
            if (K.readyState >= 3 || Z)
              se();
            else {
              S._playLock = !0, S._state = "loading";
              var de = function() {
                S._state = "loaded", se(), K.removeEventListener(o._canPlayEvent, de, !1);
              };
              K.addEventListener(o._canPlayEvent, de, !1), S._clearTimer(T._id);
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
          var f = this;
          if (f._state !== "loaded" || f._playLock)
            return f._queue.push({
              event: "pause",
              action: function() {
                f.pause(l);
              }
            }), f;
          for (var S = f._getSoundIds(l), x = 0; x < S.length; x++) {
            f._clearTimer(S[x]);
            var k = f._soundById(S[x]);
            if (k && !k._paused && (k._seek = f.seek(S[x]), k._rateSeek = 0, k._paused = !0, f._stopFade(S[x]), k._node))
              if (f._webAudio) {
                if (!k._node.bufferSource)
                  continue;
                typeof k._node.bufferSource.stop > "u" ? k._node.bufferSource.noteOff(0) : k._node.bufferSource.stop(0), f._cleanBuffer(k._node);
              } else (!isNaN(k._node.duration) || k._node.duration === 1 / 0) && k._node.pause();
            arguments[1] || f._emit("pause", k ? k._id : null);
          }
          return f;
        },
        /**
         * Stop playback and reset to start.
         * @param  {Number} id The sound ID (empty to stop all in group).
         * @param  {Boolean} internal Internal Use: true prevents event firing.
         * @return {Howl}
         */
        stop: function(l, f) {
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
            A && (A._seek = A._start || 0, A._rateSeek = 0, A._paused = !0, A._ended = !0, S._stopFade(x[k]), A._node && (S._webAudio ? A._node.bufferSource && (typeof A._node.bufferSource.stop > "u" ? A._node.bufferSource.noteOff(0) : A._node.bufferSource.stop(0), S._cleanBuffer(A._node)) : (!isNaN(A._node.duration) || A._node.duration === 1 / 0) && (A._node.currentTime = A._start || 0, A._node.pause(), A._node.duration === 1 / 0 && S._clearSound(A._node))), f || S._emit("stop", A._id));
          }
          return S;
        },
        /**
         * Mute/unmute a single sound or all sounds in this Howl group.
         * @param  {Boolean} muted Set to true to mute and false to unmute.
         * @param  {Number} id    The sound ID to update (omit to mute/unmute all).
         * @return {Howl}
         */
        mute: function(l, f) {
          var S = this;
          if (S._state !== "loaded" || S._playLock)
            return S._queue.push({
              event: "mute",
              action: function() {
                S.mute(l, f);
              }
            }), S;
          if (typeof f > "u")
            if (typeof l == "boolean")
              S._muted = l;
            else
              return S._muted;
          for (var x = S._getSoundIds(f), k = 0; k < x.length; k++) {
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
          var l = this, f = arguments, S, x;
          if (f.length === 0)
            return l._volume;
          if (f.length === 1 || f.length === 2 && typeof f[1] > "u") {
            var k = l._getSoundIds(), A = k.indexOf(f[0]);
            A >= 0 ? x = parseInt(f[0], 10) : S = parseFloat(f[0]);
          } else f.length >= 2 && (S = parseFloat(f[0]), x = parseInt(f[1], 10));
          var T;
          if (typeof S < "u" && S >= 0 && S <= 1) {
            if (l._state !== "loaded" || l._playLock)
              return l._queue.push({
                event: "volume",
                action: function() {
                  l.volume.apply(l, f);
                }
              }), l;
            typeof x > "u" && (l._volume = S), x = l._getSoundIds(x);
            for (var b = 0; b < x.length; b++)
              T = l._soundById(x[b]), T && (T._volume = S, f[2] || l._stopFade(x[b]), l._webAudio && T._node && !T._muted ? T._node.gain.setValueAtTime(S, o.ctx.currentTime) : T._node && !T._muted && (T._node.volume = S * o.volume()), l._emit("volume", T._id));
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
        fade: function(l, f, S, x) {
          var k = this;
          if (k._state !== "loaded" || k._playLock)
            return k._queue.push({
              event: "fade",
              action: function() {
                k.fade(l, f, S, x);
              }
            }), k;
          l = Math.min(Math.max(0, parseFloat(l)), 1), f = Math.min(Math.max(0, parseFloat(f)), 1), S = parseFloat(S), k.volume(l, x);
          for (var A = k._getSoundIds(x), T = 0; T < A.length; T++) {
            var b = k._soundById(A[T]);
            if (b) {
              if (x || k._stopFade(A[T]), k._webAudio && !b._muted) {
                var E = o.ctx.currentTime, D = E + S / 1e3;
                b._volume = l, b._node.gain.setValueAtTime(l, E), b._node.gain.linearRampToValueAtTime(f, D);
              }
              k._startFadeInterval(b, l, f, S, A[T], typeof x > "u");
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
        _startFadeInterval: function(l, f, S, x, k, A) {
          var T = this, b = f, E = S - f, D = Math.abs(E / 0.01), O = Math.max(4, D > 0 ? x / D : x), H = Date.now();
          l._fadeTo = S, l._interval = setInterval(function() {
            var W = (Date.now() - H) / x;
            H = Date.now(), b += E * W, b = Math.round(b * 100) / 100, E < 0 ? b = Math.max(S, b) : b = Math.min(S, b), T._webAudio ? l._volume = b : T.volume(b, l._id, !0), A && (T._volume = b), (S < f && b <= S || S > f && b >= S) && (clearInterval(l._interval), l._interval = null, l._fadeTo = null, T.volume(S, l._id), T._emit("fade", l._id));
          }, O);
        },
        /**
         * Internal method that stops the currently playing fade when
         * a new fade starts, volume is changed or the sound is stopped.
         * @param  {Number} id The sound id.
         * @return {Howl}
         */
        _stopFade: function(l) {
          var f = this, S = f._soundById(l);
          return S && S._interval && (f._webAudio && S._node.gain.cancelScheduledValues(o.ctx.currentTime), clearInterval(S._interval), S._interval = null, f.volume(S._fadeTo, l), S._fadeTo = null, f._emit("fade", l)), f;
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
          var l = this, f = arguments, S, x, k;
          if (f.length === 0)
            return l._loop;
          if (f.length === 1)
            if (typeof f[0] == "boolean")
              S = f[0], l._loop = S;
            else
              return k = l._soundById(parseInt(f[0], 10)), k ? k._loop : !1;
          else f.length === 2 && (S = f[0], x = parseInt(f[1], 10));
          for (var A = l._getSoundIds(x), T = 0; T < A.length; T++)
            k = l._soundById(A[T]), k && (k._loop = S, l._webAudio && k._node && k._node.bufferSource && (k._node.bufferSource.loop = S, S && (k._node.bufferSource.loopStart = k._start || 0, k._node.bufferSource.loopEnd = k._stop, l.playing(A[T]) && (l.pause(A[T], !0), l.play(A[T], !0)))));
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
          var l = this, f = arguments, S, x;
          if (f.length === 0)
            x = l._sounds[0]._id;
          else if (f.length === 1) {
            var k = l._getSoundIds(), A = k.indexOf(f[0]);
            A >= 0 ? x = parseInt(f[0], 10) : S = parseFloat(f[0]);
          } else f.length === 2 && (S = parseFloat(f[0]), x = parseInt(f[1], 10));
          var T;
          if (typeof S == "number") {
            if (l._state !== "loaded" || l._playLock)
              return l._queue.push({
                event: "rate",
                action: function() {
                  l.rate.apply(l, f);
                }
              }), l;
            typeof x > "u" && (l._rate = S), x = l._getSoundIds(x);
            for (var b = 0; b < x.length; b++)
              if (T = l._soundById(x[b]), T) {
                l.playing(x[b]) && (T._rateSeek = l.seek(x[b]), T._playStart = l._webAudio ? o.ctx.currentTime : T._playStart), T._rate = S, l._webAudio && T._node && T._node.bufferSource ? T._node.bufferSource.playbackRate.setValueAtTime(S, o.ctx.currentTime) : T._node && (T._node.playbackRate = S);
                var E = l.seek(x[b]), D = (l._sprite[T._sprite][0] + l._sprite[T._sprite][1]) / 1e3 - E, O = D * 1e3 / Math.abs(T._rate);
                (l._endTimers[x[b]] || !T._paused) && (l._clearTimer(x[b]), l._endTimers[x[b]] = setTimeout(l._ended.bind(l, T), O)), l._emit("rate", T._id);
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
          var l = this, f = arguments, S, x;
          if (f.length === 0)
            l._sounds.length && (x = l._sounds[0]._id);
          else if (f.length === 1) {
            var k = l._getSoundIds(), A = k.indexOf(f[0]);
            A >= 0 ? x = parseInt(f[0], 10) : l._sounds.length && (x = l._sounds[0]._id, S = parseFloat(f[0]));
          } else f.length === 2 && (S = parseFloat(f[0]), x = parseInt(f[1], 10));
          if (typeof x > "u")
            return 0;
          if (typeof S == "number" && (l._state !== "loaded" || l._playLock))
            return l._queue.push({
              event: "seek",
              action: function() {
                l.seek.apply(l, f);
              }
            }), l;
          var T = l._soundById(x);
          if (T)
            if (typeof S == "number" && S >= 0) {
              var b = l.playing(x);
              b && l.pause(x, !0), T._seek = S, T._ended = !1, l._clearTimer(x), !l._webAudio && T._node && !isNaN(T._node.duration) && (T._node.currentTime = S);
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
              var O = l.playing(x) ? o.ctx.currentTime - T._playStart : 0, H = T._rateSeek ? T._rateSeek - T._seek : 0;
              return T._seek + (H + O * Math.abs(T._rate));
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
          var f = this;
          if (typeof l == "number") {
            var S = f._soundById(l);
            return S ? !S._paused : !1;
          }
          for (var x = 0; x < f._sounds.length; x++)
            if (!f._sounds[x]._paused)
              return !0;
          return !1;
        },
        /**
         * Get the duration of this sound. Passing a sound id will return the sprite duration.
         * @param  {Number} id The sound id to check. If none is passed, return full source duration.
         * @return {Number} Audio duration in seconds.
         */
        duration: function(l) {
          var f = this, S = f._duration, x = f._soundById(l);
          return x && (S = f._sprite[x._sprite][1] / 1e3), S;
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
          for (var l = this, f = l._sounds, S = 0; S < f.length; S++)
            f[S]._paused || l.stop(f[S]._id), l._webAudio || (l._clearSound(f[S]._node), f[S]._node.removeEventListener("error", f[S]._errorFn, !1), f[S]._node.removeEventListener(o._canPlayEvent, f[S]._loadFn, !1), f[S]._node.removeEventListener("ended", f[S]._endFn, !1), o._releaseHtml5Audio(f[S]._node)), delete f[S]._node, l._clearTimer(f[S]._id);
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
        on: function(l, f, S, x) {
          var k = this, A = k["_on" + l];
          return typeof f == "function" && A.push(x ? { id: S, fn: f, once: x } : { id: S, fn: f }), k;
        },
        /**
         * Remove a custom event. Call without parameters to remove all events.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to remove. Leave empty to remove all.
         * @param  {Number}   id    (optional) Only remove events for this sound.
         * @return {Howl}
         */
        off: function(l, f, S) {
          var x = this, k = x["_on" + l], A = 0;
          if (typeof f == "number" && (S = f, f = null), f || S)
            for (A = 0; A < k.length; A++) {
              var T = S === k[A].id;
              if (f === k[A].fn && T || !f && T) {
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
        once: function(l, f, S) {
          var x = this;
          return x.on(l, f, S, 1), x;
        },
        /**
         * Emit all events of a specific type and pass the sound id.
         * @param  {String} event Event name.
         * @param  {Number} id    Sound ID.
         * @param  {Number} msg   Message to go with event.
         * @return {Howl}
         */
        _emit: function(l, f, S) {
          for (var x = this, k = x["_on" + l], A = k.length - 1; A >= 0; A--)
            (!k[A].id || k[A].id === f || l === "load") && (setTimeout((function(T) {
              T.call(this, f, S);
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
          var f = this;
          if (f._queue.length > 0) {
            var S = f._queue[0];
            S.event === l && (f._queue.shift(), f._loadQueue()), l || S.action();
          }
          return f;
        },
        /**
         * Fired when playback ends at the end of the duration.
         * @param  {Sound} sound The sound object to work with.
         * @return {Howl}
         */
        _ended: function(l) {
          var f = this, S = l._sprite;
          if (!f._webAudio && l._node && !l._node.paused && !l._node.ended && l._node.currentTime < l._stop)
            return setTimeout(f._ended.bind(f, l), 100), f;
          var x = !!(l._loop || f._sprite[S][2]);
          if (f._emit("end", l._id), !f._webAudio && x && f.stop(l._id, !0).play(l._id), f._webAudio && x) {
            f._emit("play", l._id), l._seek = l._start || 0, l._rateSeek = 0, l._playStart = o.ctx.currentTime;
            var k = (l._stop - l._start) * 1e3 / Math.abs(l._rate);
            f._endTimers[l._id] = setTimeout(f._ended.bind(f, l), k);
          }
          return f._webAudio && !x && (l._paused = !0, l._ended = !0, l._seek = l._start || 0, l._rateSeek = 0, f._clearTimer(l._id), f._cleanBuffer(l._node), o._autoSuspend()), !f._webAudio && !x && f.stop(l._id, !0), f;
        },
        /**
         * Clear the end timer for a sound playback.
         * @param  {Number} id The sound ID.
         * @return {Howl}
         */
        _clearTimer: function(l) {
          var f = this;
          if (f._endTimers[l]) {
            if (typeof f._endTimers[l] != "function")
              clearTimeout(f._endTimers[l]);
            else {
              var S = f._soundById(l);
              S && S._node && S._node.removeEventListener("ended", f._endTimers[l], !1);
            }
            delete f._endTimers[l];
          }
          return f;
        },
        /**
         * Return the sound identified by this ID, or return null.
         * @param  {Number} id Sound ID
         * @return {Object}    Sound object or null.
         */
        _soundById: function(l) {
          for (var f = this, S = 0; S < f._sounds.length; S++)
            if (l === f._sounds[S]._id)
              return f._sounds[S];
          return null;
        },
        /**
         * Return an inactive sound from the pool or create a new one.
         * @return {Sound} Sound playback object.
         */
        _inactiveSound: function() {
          var l = this;
          l._drain();
          for (var f = 0; f < l._sounds.length; f++)
            if (l._sounds[f]._ended)
              return l._sounds[f].reset();
          return new a(l);
        },
        /**
         * Drain excess inactive sounds from the pool.
         */
        _drain: function() {
          var l = this, f = l._pool, S = 0, x = 0;
          if (!(l._sounds.length < f)) {
            for (x = 0; x < l._sounds.length; x++)
              l._sounds[x]._ended && S++;
            for (x = l._sounds.length - 1; x >= 0; x--) {
              if (S <= f)
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
          var f = this;
          if (typeof l > "u") {
            for (var S = [], x = 0; x < f._sounds.length; x++)
              S.push(f._sounds[x]._id);
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
          var f = this;
          return l._node.bufferSource = o.ctx.createBufferSource(), l._node.bufferSource.buffer = d[f._src], l._panner ? l._node.bufferSource.connect(l._panner) : l._node.bufferSource.connect(l._node), l._node.bufferSource.loop = l._loop, l._loop && (l._node.bufferSource.loopStart = l._start || 0, l._node.bufferSource.loopEnd = l._stop || 0), l._node.bufferSource.playbackRate.setValueAtTime(l._rate, o.ctx.currentTime), f;
        },
        /**
         * Prevent memory leaks by cleaning up the buffer source after playback.
         * @param  {Object} node Sound's audio node containing the buffer source.
         * @return {Howl}
         */
        _cleanBuffer: function(l) {
          var f = this, S = o._navigator && o._navigator.vendor.indexOf("Apple") >= 0;
          if (!l.bufferSource)
            return f;
          if (o._scratchBuffer && l.bufferSource && (l.bufferSource.onended = null, l.bufferSource.disconnect(0), S))
            try {
              l.bufferSource.buffer = o._scratchBuffer;
            } catch {
            }
          return l.bufferSource = null, f;
        },
        /**
         * Set the source to a 0-second silence to stop any downloading (except in IE).
         * @param  {Object} node Audio node to clear.
         */
        _clearSound: function(l) {
          var f = /MSIE |Trident\//.test(o._navigator && o._navigator.userAgent);
          f || (l.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
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
          var l = this, f = l._parent;
          return l._muted = f._muted, l._loop = f._loop, l._volume = f._volume, l._rate = f._rate, l._seek = 0, l._paused = !0, l._ended = !0, l._sprite = "__default", l._id = ++o._counter, f._sounds.push(l), l.create(), l;
        },
        /**
         * Create and setup a new sound object, whether HTML5 Audio or Web Audio.
         * @return {Sound}
         */
        create: function() {
          var l = this, f = l._parent, S = o._muted || l._muted || l._parent._muted ? 0 : l._volume;
          return f._webAudio ? (l._node = typeof o.ctx.createGain > "u" ? o.ctx.createGainNode() : o.ctx.createGain(), l._node.gain.setValueAtTime(S, o.ctx.currentTime), l._node.paused = !0, l._node.connect(o.masterGain)) : o.noAudio || (l._node = o._obtainHtml5Audio(), l._errorFn = l._errorListener.bind(l), l._node.addEventListener("error", l._errorFn, !1), l._loadFn = l._loadListener.bind(l), l._node.addEventListener(o._canPlayEvent, l._loadFn, !1), l._endFn = l._endListener.bind(l), l._node.addEventListener("ended", l._endFn, !1), l._node.src = f._src, l._node.preload = f._preload === !0 ? "auto" : f._preload, l._node.volume = S * o.volume(), l._node.load()), l;
        },
        /**
         * Reset the parameters of this sound to the original state (for recycle).
         * @return {Sound}
         */
        reset: function() {
          var l = this, f = l._parent;
          return l._muted = f._muted, l._loop = f._loop, l._volume = f._volume, l._rate = f._rate, l._seek = 0, l._rateSeek = 0, l._paused = !0, l._ended = !0, l._sprite = "__default", l._id = ++o._counter, l;
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
          var l = this, f = l._parent;
          f._duration = Math.ceil(l._node.duration * 10) / 10, Object.keys(f._sprite).length === 0 && (f._sprite = { __default: [0, f._duration * 1e3] }), f._state !== "loaded" && (f._state = "loaded", f._emit("load"), f._loadQueue()), l._node.removeEventListener(o._canPlayEvent, l._loadFn, !1);
        },
        /**
         * HTML5 Audio ended listener callback.
         */
        _endListener: function() {
          var l = this, f = l._parent;
          f._duration === 1 / 0 && (f._duration = Math.ceil(l._node.duration * 10) / 10, f._sprite.__default[1] === 1 / 0 && (f._sprite.__default[1] = f._duration * 1e3), f._ended(l)), l._node.removeEventListener("ended", l._endFn, !1);
        }
      };
      var d = {}, c = function(l) {
        var f = l._src;
        if (d[f]) {
          l._duration = d[f].duration, y(l);
          return;
        }
        if (/^data:[^;]+;base64,/.test(f)) {
          for (var S = atob(f.split(",")[1]), x = new Uint8Array(S.length), k = 0; k < S.length; ++k)
            x[k] = S.charCodeAt(k);
          m(x.buffer, l);
        } else {
          var A = new XMLHttpRequest();
          A.open(l._xhr.method, f, !0), A.withCredentials = l._xhr.withCredentials, A.responseType = "arraybuffer", l._xhr.headers && Object.keys(l._xhr.headers).forEach(function(T) {
            A.setRequestHeader(T, l._xhr.headers[T]);
          }), A.onload = function() {
            var T = (A.status + "")[0];
            if (T !== "0" && T !== "2" && T !== "3") {
              l._emit("loaderror", null, "Failed loading audio file with status: " + A.status + ".");
              return;
            }
            m(A.response, l);
          }, A.onerror = function() {
            l._webAudio && (l._html5 = !0, l._webAudio = !1, l._sounds = [], delete d[f], l.load());
          }, p(A);
        }
      }, p = function(l) {
        try {
          l.send();
        } catch {
          l.onerror();
        }
      }, m = function(l, f) {
        var S = function() {
          f._emit("loaderror", null, "Decoding audio data failed.");
        }, x = function(k) {
          k && f._sounds.length > 0 ? (d[f._src] = k, y(f, k)) : S();
        };
        typeof Promise < "u" && o.ctx.decodeAudioData.length === 1 ? o.ctx.decodeAudioData(l).then(x).catch(S) : o.ctx.decodeAudioData(l, x, S);
      }, y = function(l, f) {
        f && !l._duration && (l._duration = f.duration), Object.keys(l._sprite).length === 0 && (l._sprite = { __default: [0, l._duration * 1e3] }), l._state !== "loaded" && (l._state = "loaded", l._emit("load"), l._loadQueue());
      }, g = function() {
        if (o.usingWebAudio) {
          try {
            typeof AudioContext < "u" ? o.ctx = new AudioContext() : typeof webkitAudioContext < "u" ? o.ctx = new webkitAudioContext() : o.usingWebAudio = !1;
          } catch {
            o.usingWebAudio = !1;
          }
          o.ctx || (o.usingWebAudio = !1);
          var l = /iP(hone|od|ad)/.test(o._navigator && o._navigator.platform), f = o._navigator && o._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/), S = f ? parseInt(f[1], 10) : null;
          if (l && S && S < 9) {
            var x = /safari/.test(o._navigator && o._navigator.userAgent.toLowerCase());
            o._navigator && !x && (o.usingWebAudio = !1);
          }
          o.usingWebAudio && (o.masterGain = typeof o.ctx.createGain > "u" ? o.ctx.createGainNode() : o.ctx.createGain(), o.masterGain.gain.setValueAtTime(o._muted ? 0 : o._volume, o.ctx.currentTime), o.masterGain.connect(o.ctx.destination)), o._setup();
        }
      };
      e.Howler = o, e.Howl = i, typeof ci < "u" ? (ci.HowlerGlobal = n, ci.Howler = o, ci.Howl = i, ci.Sound = a) : typeof window < "u" && (window.HowlerGlobal = n, window.Howler = o, window.Howl = i, window.Sound = a);
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
      }, HowlerGlobal.prototype.orientation = function(o, i, a, d, c, p) {
        var m = this;
        if (!m.ctx || !m.ctx.listener)
          return m;
        var y = m._orientation;
        if (i = typeof i != "number" ? y[1] : i, a = typeof a != "number" ? y[2] : a, d = typeof d != "number" ? y[3] : d, c = typeof c != "number" ? y[4] : c, p = typeof p != "number" ? y[5] : p, typeof o == "number")
          m._orientation = [o, i, a, d, c, p], typeof m.ctx.listener.forwardX < "u" ? (m.ctx.listener.forwardX.setTargetAtTime(o, Howler.ctx.currentTime, 0.1), m.ctx.listener.forwardY.setTargetAtTime(i, Howler.ctx.currentTime, 0.1), m.ctx.listener.forwardZ.setTargetAtTime(a, Howler.ctx.currentTime, 0.1), m.ctx.listener.upX.setTargetAtTime(d, Howler.ctx.currentTime, 0.1), m.ctx.listener.upY.setTargetAtTime(c, Howler.ctx.currentTime, 0.1), m.ctx.listener.upZ.setTargetAtTime(p, Howler.ctx.currentTime, 0.1)) : m.ctx.listener.setOrientation(o, i, a, d, c, p);
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
        for (var c = a._getSoundIds(i), p = 0; p < c.length; p++) {
          var m = a._soundById(c[p]);
          if (m)
            if (typeof o == "number")
              m._stereo = o, m._pos = [o, 0, 0], m._node && (m._pannerAttr.panningModel = "equalpower", (!m._panner || !m._panner.pan) && n(m, d), d === "spatial" ? typeof m._panner.positionX < "u" ? (m._panner.positionX.setValueAtTime(o, Howler.ctx.currentTime), m._panner.positionY.setValueAtTime(0, Howler.ctx.currentTime), m._panner.positionZ.setValueAtTime(0, Howler.ctx.currentTime)) : m._panner.setPosition(o, 0, 0) : m._panner.pan.setValueAtTime(o, Howler.ctx.currentTime)), a._emit("stereo", m._id);
            else
              return m._stereo;
        }
        return a;
      }, Howl.prototype.pos = function(o, i, a, d) {
        var c = this;
        if (!c._webAudio)
          return c;
        if (c._state !== "loaded")
          return c._queue.push({
            event: "pos",
            action: function() {
              c.pos(o, i, a, d);
            }
          }), c;
        if (i = typeof i != "number" ? 0 : i, a = typeof a != "number" ? -0.5 : a, typeof d > "u")
          if (typeof o == "number")
            c._pos = [o, i, a];
          else
            return c._pos;
        for (var p = c._getSoundIds(d), m = 0; m < p.length; m++) {
          var y = c._soundById(p[m]);
          if (y)
            if (typeof o == "number")
              y._pos = [o, i, a], y._node && ((!y._panner || y._panner.pan) && n(y, "spatial"), typeof y._panner.positionX < "u" ? (y._panner.positionX.setValueAtTime(o, Howler.ctx.currentTime), y._panner.positionY.setValueAtTime(i, Howler.ctx.currentTime), y._panner.positionZ.setValueAtTime(a, Howler.ctx.currentTime)) : y._panner.setPosition(o, i, a)), c._emit("pos", y._id);
            else
              return y._pos;
        }
        return c;
      }, Howl.prototype.orientation = function(o, i, a, d) {
        var c = this;
        if (!c._webAudio)
          return c;
        if (c._state !== "loaded")
          return c._queue.push({
            event: "orientation",
            action: function() {
              c.orientation(o, i, a, d);
            }
          }), c;
        if (i = typeof i != "number" ? c._orientation[1] : i, a = typeof a != "number" ? c._orientation[2] : a, typeof d > "u")
          if (typeof o == "number")
            c._orientation = [o, i, a];
          else
            return c._orientation;
        for (var p = c._getSoundIds(d), m = 0; m < p.length; m++) {
          var y = c._soundById(p[m]);
          if (y)
            if (typeof o == "number")
              y._orientation = [o, i, a], y._node && (y._panner || (y._pos || (y._pos = c._pos || [0, 0, -0.5]), n(y, "spatial")), typeof y._panner.orientationX < "u" ? (y._panner.orientationX.setValueAtTime(o, Howler.ctx.currentTime), y._panner.orientationY.setValueAtTime(i, Howler.ctx.currentTime), y._panner.orientationZ.setValueAtTime(a, Howler.ctx.currentTime)) : y._panner.setOrientation(o, i, a)), c._emit("orientation", y._id);
            else
              return y._orientation;
        }
        return c;
      }, Howl.prototype.pannerAttr = function() {
        var o = this, i = arguments, a, d, c;
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
            return c = o._soundById(parseInt(i[0], 10)), c ? c._pannerAttr : o._pannerAttr;
        else i.length === 2 && (a = i[0], d = parseInt(i[1], 10));
        for (var p = o._getSoundIds(d), m = 0; m < p.length; m++)
          if (c = o._soundById(p[m]), c) {
            var y = c._pannerAttr;
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
            var g = c._panner;
            g || (c._pos || (c._pos = o._pos || [0, 0, -0.5]), n(c, "spatial"), g = c._panner), g.coneInnerAngle = y.coneInnerAngle, g.coneOuterAngle = y.coneOuterAngle, g.coneOuterGain = y.coneOuterGain, g.distanceModel = y.distanceModel, g.maxDistance = y.maxDistance, g.refDistance = y.refDistance, g.rolloffFactor = y.rolloffFactor, g.panningModel = y.panningModel;
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
  })(xc)), xc;
}
var sR = iR();
const aR = /* @__PURE__ */ Ng(sR), { Howl: tw } = aR, xd = 500, Mt = {
  music: null,
  ambient: /* @__PURE__ */ new Map()
};
let gr = {}, wi = !1, _d = "";
function bi() {
  return typeof tw == "function";
}
function _c(e, n = 50) {
  const o = Number(e), i = Number.isFinite(o) ? o : n;
  return Math.min(1, Math.max(0, i / 100));
}
function nw(e) {
  return new tw({
    src: [e],
    loop: !0,
    html5: !0,
    preload: !0,
    volume: 0
  });
}
function rw(e, n, o = xd) {
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
function Ja(e, { unload: n = !1 } = {}) {
  var o;
  e && (rw(e, 0, Math.min(xd, 300)), (o = globalThis.setTimeout) == null || o.call(globalThis, () => {
    try {
      e.pause(), n && e.unload();
    } catch {
    }
  }, Math.min(xd, 320)));
}
function lR(e) {
  return !(e != null && e.streamUrl) || !bi() ? null : ((!Mt.music || Mt.music.__synapseSrc !== e.streamUrl) && (Ja(Mt.music, { unload: !0 }), Mt.music = nw(e.streamUrl), Mt.music.__synapseSrc = e.streamUrl), Mt.music);
}
function uR(e) {
  if (!(e != null && e.streamUrl) || !bi()) return null;
  const n = e.id || e.streamUrl, o = Mt.ambient.get(n);
  if (o && o.__synapseSrc === e.streamUrl) return o;
  Ja(o, { unload: !0 });
  const i = nw(e.streamUrl);
  return i.__synapseSrc = e.streamUrl, Mt.ambient.set(n, i), i;
}
function cR() {
  return [
    Mt.music,
    ...Mt.ambient.values()
  ].filter(Boolean);
}
function ow() {
  cR().forEach((e) => Ja(e));
}
function dR(e) {
  for (const [n, o] of Mt.ambient.entries())
    e.has(n) || (Ja(o, { unload: !0 }), Mt.ambient.delete(n));
}
function Cg(e, n) {
  if (e)
    try {
      e.playing() || e.play(), rw(e, n), _d = "";
    } catch (o) {
      _d = (o == null ? void 0 : o.message) || "Audio playback is blocked until the browser receives a user action.";
    }
}
async function fR(e = {}) {
  gr = { ...gr, ...e };
  const n = Ka(gr);
  if (!bi()) return _a(n);
  if (!wi)
    return ow(), _a(n);
  const o = lR(n.musicTrack), i = _c(gr.musicVolume, 60), a = _c(gr.ambientVolume, 50), d = /* @__PURE__ */ new Set(), c = [];
  return n.ambientLayers.forEach((p) => {
    var f;
    const m = p.id || p.streamUrl;
    d.add(m);
    const y = uR(p), g = Number((f = gr.audioChannels) == null ? void 0 : f[p.id]), l = Number.isFinite(g) ? _c(g, 0) : Math.min(1, Math.max(0, a * (p.volumeBias ?? 1)));
    c.push([y, l]);
  }), dR(d), Cg(o, i), c.forEach(([p, m]) => Cg(p, m)), _a(n);
}
function pR(e) {
  return wi = !!e, wi || ow(), wi;
}
function _a(e = Ka(gr)) {
  var n, o, i, a;
  return {
    available: bi(),
    playing: wi && bi(),
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
const mR = "synapse.focusRoom.audioPrefs.v1";
function hR(e) {
  var n;
  try {
    (n = globalThis.localStorage) == null || n.setItem(mR, JSON.stringify({
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
function yR() {
  const e = Y((m) => m.musicType), n = Y((m) => m.ambientSound), o = Y((m) => m.musicVolume), i = Y((m) => m.ambientVolume), a = Y((m) => m.audioChannels), d = Y((m) => m.audioPlaying), [c, p] = C.useState(() => _a(Ka({
    musicType: e,
    ambientSound: n
  })));
  return C.useEffect(() => {
    const m = { musicType: e, ambientSound: n, musicVolume: o, ambientVolume: i, audioChannels: a };
    let y = !1;
    return pR(d), hR(m), fR(m).then((g) => {
      y || p(g);
    }), () => {
      y = !0;
    };
  }, [n, i, a, d, e, o]), c;
}
function gR() {
  const e = Y(), n = C.useCallback(async (i = "", a = "", d = {}) => {
    var g;
    e.pauseTimer({ pauseAudio: !0 }), e.closeSummary();
    const c = typeof i == "string" || typeof i == "number" ? i : "", p = typeof a == "string" ? a : "", m = vR(p, d), y = String(c || e.selectedMaterialId || ((g = e.selectedMaterial) == null ? void 0 : g.materialId) || "");
    if (typeof globalThis.returnFromFocusRoomToWorkspace == "function")
      try {
        const l = globalThis.returnFromFocusRoomToWorkspace(y, m);
        l && typeof l.then == "function" && await l, bg(m.action || p, m);
        return;
      } catch (l) {
        console.error("Could not return from Focus Room:", l);
      }
    globalThis.location.hash = "", bg(m.action || p, m);
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
function iw(e) {
  const n = String(e || "").trim().toLowerCase();
  return ["flashcards", "quiz", "assistant", "mindmap", "timeline", "source", "notes"].includes(n) ? n : "";
}
function vR(e, n = {}) {
  const o = n && typeof n == "object" && !Array.isArray(n) ? n : {}, i = iw(e || o.action);
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
function bg(e, n = {}) {
  const o = iw(e);
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
function SR(e = 3e3) {
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
function wR() {
  const e = Y((i) => i.timerState || (i.timerStatus === "studying" ? "running" : i.timerStatus)), n = Y((i) => i.view), o = Y((i) => i.tickTimer);
  C.useEffect(() => {
    if (n !== "session" || e !== "running" || typeof window > "u") return;
    let i = !0;
    const a = () => {
      i && o();
    }, d = window.setInterval(a, 1e3), c = () => {
      document.visibilityState === "visible" && a();
    };
    return document.addEventListener("visibilitychange", c), a(), () => {
      i = !1, window.clearInterval(d), document.removeEventListener("visibilitychange", c);
    };
  }, [o, e, n]);
}
function xR() {
  const e = Y((n) => n.selectedScene);
  return gn(e);
}
function _R(e) {
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
function TR() {
  const [e, n] = C.useState(""), [o, i] = C.useState(!1), [a, d] = C.useState(!1), c = Y((T) => T.view), p = SR(3e3), m = xR(), y = yR(), g = gR();
  wR();
  const l = Y(A1(_R)), f = Y((T) => T.summaryRecord), S = Y((T) => T.endSession), x = Y((T) => T.initializeFocusRoom);
  C.useEffect(() => {
    x();
  }, [x]), C.useEffect(() => {
    var D;
    const T = document.documentElement, b = T.dataset.theme, E = T.style.colorScheme;
    return T.dataset.theme = "dark", T.style.colorScheme = "dark", (D = document.body) == null || D.classList.add("synapse-theme-dark"), () => {
      var O;
      (O = document.body) != null && O.classList.contains("focus-room-standalone") || (b && (T.dataset.theme = b), T.style.colorScheme = E);
    };
  }, []), C.useEffect(() => {
    l != null && l.materialId && ef(l.materialId, l);
  }, [l]), C.useEffect(() => {
    c === "session" || !f || ga("focus-room");
  }, [f, c]), C.useEffect(() => {
    c !== "session" && (i(!1), n(""), d(!1));
  }, [c]), C.useEffect(() => {
    const T = (b) => {
      b.key === "Escape" && (o ? (b.preventDefault(), i(!1)) : e ? n("") : a && d(!1));
    };
    return window.addEventListener("keydown", T), () => window.removeEventListener("keydown", T);
  }, [a, o, e]);
  const k = (...T) => {
    g.returnToWorkspace(...T);
  }, A = async () => {
    d(!1), i(!1), n(""), S(), await k();
  };
  return /* @__PURE__ */ w.jsxs(
    "main",
    {
      id: "focusRoomSurface",
      className: `focus-room-surface react-focus-room ${p ? "is-idle" : ""} ${c === "setup" ? "is-setup is-innook-setup" : "is-session"}`.trim(),
      "aria-live": "polite",
      "data-focus-room-view": c,
      children: [
        /* @__PURE__ */ w.jsx(tb, { scene: m }),
        /* @__PURE__ */ w.jsxs(Wa, { mode: "wait", children: [
          c === "setup" ? /* @__PURE__ */ w.jsx(
            vn.div,
            {
              className: "focus-room-view focus-setup-view",
              initial: { opacity: 0, y: 16 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -10 },
              transition: Na,
              children: /* @__PURE__ */ w.jsx(hP, { audioState: y, onWorkspace: k })
            },
            "setup"
          ) : null,
          c === "session" ? /* @__PURE__ */ w.jsxs(
            vn.div,
            {
              className: "focus-room-view focus-session-view",
              initial: { opacity: 0, y: 14 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -8 },
              transition: Na,
              children: [
                o ? /* @__PURE__ */ w.jsx("button", { type: "button", className: "focus-mode-exit-hit-area", onClick: () => i(!1), children: "Exit Focus Mode" }) : /* @__PURE__ */ w.jsx(yP, { onWorkspace: k, onOpenTrail: () => n("trail"), onOpenCompanion: () => n("companion"), onOpenSettings: () => n("settings"), onExit: () => d(!0) }),
                /* @__PURE__ */ w.jsx("section", { className: `focus-session-stage ${o ? "is-focus-mode" : ""}`.trim(), "aria-hidden": "true" }),
                o ? /* @__PURE__ */ w.jsx(oR, { onExit: () => i(!1) }) : /* @__PURE__ */ w.jsx(kP, { audioState: y, onFocusMode: () => i(!0) }),
                o ? null : /* @__PURE__ */ w.jsx(nR, { audioState: y, utilityPanel: e, onClose: () => n(""), onWorkspace: k }),
                /* @__PURE__ */ w.jsx(cM, {}),
                /* @__PURE__ */ w.jsx(kR, { open: a, onClose: () => d(!1), onConfirm: A })
              ]
            },
            "session"
          ) : null
        ] })
      ]
    }
  );
}
function kR({ open: e, onClose: n, onConfirm: o }) {
  return e ? /* @__PURE__ */ w.jsx("div", { className: "focus-exit-overlay", role: "presentation", children: /* @__PURE__ */ w.jsxs("div", { className: "focus-exit-dialog liquid-glass", role: "dialog", "aria-modal": "true", "aria-labelledby": "focus-exit-title", children: [
    /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Leave this room?" }),
    /* @__PURE__ */ w.jsx("h2", { id: "focus-exit-title", children: "End focus session" }),
    /* @__PURE__ */ w.jsx("p", { children: "Your focused time will be saved to your Focus Trail." }),
    /* @__PURE__ */ w.jsxs("div", { className: "focus-button-row", children: [
      /* @__PURE__ */ w.jsx(Pe, { onClick: n, children: "Continue focusing" }),
      /* @__PURE__ */ w.jsx(Pe, { variant: "primary", onClick: o, children: "End and exit" })
    ] })
  ] }) }) : null;
}
let Tc = null;
function AR(e, n) {
  const o = globalThis.__synapseFocusRoomApi || {};
  if (typeof o[e] != "function") {
    console.warn(`Synapse Focus Room action "${e}" is not available yet.`);
    return;
  }
  return o[e](...n);
}
function CR() {
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
    globalThis[n] = (...i) => AR(o, i);
  });
}
function bR(e = {}) {
  CR();
  const n = e.root || document.getElementById("focusRoomRoot");
  if (!n)
    throw new Error("Focus Room root element was not found.");
  Tc || (Tc = w1.createRoot(n), Tc.render(
    yn.createElement(
      yn.StrictMode,
      null,
      yn.createElement(TR)
    )
  ));
}
const PR = "synapse.generated.history.v6", sw = "synapse.active.generated.v6", ER = "synapse.flashcards.deck.v1", MR = "synapse.quiz.history.v1", RR = "synapse.focusRoom.return-target.v1";
function kf(e, n) {
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
function DR(e, n) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, n), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function NR(e, n) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, JSON.stringify(n)), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function aw() {
  const e = kf(PR, []);
  return Array.isArray(e) ? e : [];
}
function jR(e) {
  const n = String((e == null ? void 0 : e.title) || "").trim();
  return n || String((e == null ? void 0 : e.summary) || "").split(/\n+/).map((i) => i.replace(/^#+\s*/, "").trim()).find((i) => i.length > 4) || "Generated Study Notes";
}
function lw(e = {}) {
  return [
    e.id ? `history:${e.id}` : "",
    e.sourceFingerprint ? `fingerprint:${e.sourceFingerprint}` : "",
    e.clientFingerprint ? `fingerprint:${e.clientFingerprint}` : ""
  ].filter(Boolean);
}
function IR(e = {}) {
  const n = kf(ER, {}), i = lw(e).map((a) => n == null ? void 0 : n[a]).find((a) => a && Array.isArray(a.cards) && a.cards.length);
  return (i == null ? void 0 : i.cards) || [];
}
function FR(e = {}) {
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
function OR(e = []) {
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
function LR(e = {}) {
  const n = kf(MR, {}), i = lw(e).flatMap((d) => Array.isArray(n == null ? void 0 : n[d]) ? n[d] : []), a = /* @__PURE__ */ new Set();
  return OR(i).filter((d) => {
    const c = FR(d);
    return !c || a.has(c) ? !1 : (a.add(c), !0);
  }).sort((d, c) => new Date(c.createdAt || 0) - new Date(d.createdAt || 0));
}
function VR(e = {}) {
  return {
    materialId: String(e.id || e.sourceFingerprint || e.clientFingerprint || "current-material"),
    materialTitle: jR(e),
    materialType: "Generated notes",
    uploadedContent: "",
    aiSummary: e.summary || "",
    sections: e.sections || {},
    flashcards: IR(e),
    quizzes: LR(e),
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
function uw() {
  return aw().filter((e) => e && (e.id || e.summary) && e.kind !== "companion" && !String(e.id || "").startsWith("companion:")).map(VR);
}
function cw(e = "") {
  const n = String(e || "");
  return n && uw().find(
    (o) => o.materialId === n || o.sourceFingerprint === n || o.clientFingerprint === n
  ) || null;
}
function dw() {
  var n;
  const e = ((n = globalThis.localStorage) == null ? void 0 : n.getItem(sw)) || "";
  return cw(e);
}
function BR(e = "") {
  var i;
  const n = e || ((i = dw()) == null ? void 0 : i.materialId) || "", o = n ? `/${encodeURIComponent(n)}` : "";
  globalThis.location.hash = `#/focus-room${o}`;
}
function zR(e = "", n = {}) {
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
async function $R(e = "", n = {}) {
  const o = String(e || ""), i = aw().find(
    (c) => String((c == null ? void 0 : c.id) || "") === o || String((c == null ? void 0 : c.sourceFingerprint) || (c == null ? void 0 : c.source_fingerprint) || "") === o || String((c == null ? void 0 : c.clientFingerprint) || (c == null ? void 0 : c.client_fingerprint) || "") === o
  ) || null, a = String((i == null ? void 0 : i.id) || "");
  a && DR(sw, a);
  const d = zR(a, n);
  d.action && NR(RR, d), globalThis.location.href = a ? `index.html?focusReturn=${encodeURIComponent(a)}` : "index.html";
}
function UR() {
  Object.assign(globalThis, {
    getSynapseFocusRoomCurrentMaterial: dw,
    getSynapseFocusRoomMaterial: cw,
    getSynapseFocusRoomMaterials: uw,
    openSynapseFocusRoom: BR,
    returnFromFocusRoomToWorkspace: $R
  });
}
const fw = document.getElementById("focusRoomRoot");
if (!fw)
  throw new Error("Focus Room root element was not found.");
var Mg;
(Mg = document.getElementById("focusRoomFallbackTitle")) == null || Mg.remove();
globalThis.apiClient = new Dg(f1);
UR();
(!globalThis.location.hash || globalThis.location.hash === "#") && (globalThis.location.hash = "#/focus-room");
bR({ root: fw });
