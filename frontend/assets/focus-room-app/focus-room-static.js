function h1(e, n) {
  for (var o = 0; o < n.length; o++) {
    const i = n[o];
    if (typeof i != "string" && !Array.isArray(i)) {
      for (const a in i)
        if (a !== "default" && !(a in e)) {
          const f = Object.getOwnPropertyDescriptor(i, a);
          f && Object.defineProperty(e, a, f.get ? f : {
            enumerable: !0,
            get: () => i[a]
          });
        }
    }
  }
  return Object.freeze(Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }));
}
function y1(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function jg(e) {
  const n = String(e || "").toLowerCase();
  return n === "127.0.0.1" || n === "localhost" || n === "::1" || n === "[::1]";
}
function _h(e) {
  return jg(e) || y1(e);
}
function g1(e) {
  return !e || jg(e) ? "127.0.0.1" : e;
}
const v1 = (() => {
  var p, m, y, S;
  const { protocol: e, hostname: n, port: o } = window.location, i = String(window.SYNAPSE_BACKEND_PORT || ((m = (p = document.body) == null ? void 0 : p.dataset) == null ? void 0 : m.apiPort) || "8001").trim(), a = `http://${g1(n)}:${i || "8001"}`, f = String(window.SYNAPSE_API_BASE || ((S = (y = document.body) == null ? void 0 : y.dataset) == null ? void 0 : S.apiBase) || "").replace(/\/+$/, ""), d = `${e}//${window.location.host}`.replace(/\/+$/, "");
  return f && !(_h(n) && o !== i && f === d) ? f : e === "file:" || _h(n) && o !== i ? a : `${e}//${window.location.host}`;
})();
class to extends Error {
  constructor(n, { cause: o, code: i } = {}) {
    super(n), this.name = "ApiConnectionError", this.cause = o, this.code = i || "connection_error";
  }
}
const Th = "synapse.client.id.v1";
function Un() {
  return globalThis.window || globalThis;
}
function no(e, n = 220) {
  return String(e || "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
}
function kh() {
  const e = globalThis.crypto || Un().crypto;
  return e != null && e.randomUUID ? e.randomUUID() : `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
function S1() {
  var n, o;
  const e = Un();
  try {
    const i = (n = e.localStorage) == null ? void 0 : n.getItem(Th);
    if (i) return i;
    const a = kh();
    return (o = e.localStorage) == null || o.setItem(Th, a), a;
  } catch {
    return kh();
  }
}
function w1(e = {}) {
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
    var a, f;
    const i = Un();
    this.baseUrl = String(n || "").replace(/\/+$/, ""), this.fetchImpl = o || ((a = i.fetch) == null ? void 0 : a.bind(i)) || ((f = globalThis.fetch) == null ? void 0 : f.bind(globalThis));
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
    var f, d, p;
    const o = Un(), i = w1(n);
    i["X-Synapse-Client-Id"] = no(S1(), 160);
    const a = (d = (f = o.SynapseAuth) == null ? void 0 : f.getStoredSession) == null ? void 0 : d.call(f);
    if (a && typeof a == "object" && (a.accountId && (i["X-Synapse-User-Id"] = no(a.accountId, 160)), a.email && (i["X-Synapse-User-Email"] = no(a.email, 220)), a.displayName && (i["X-Synapse-User-Name"] = no(a.displayName, 180)), a.authMode && (i["X-Synapse-Auth-Mode"] = no(a.authMode, 60)), a.role && (i["X-Synapse-User-Role"] = no(a.role, 80))), (p = o.SynapseAuth) != null && p.authHeaders && !i.Authorization && !i.authorization)
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
    const i = this.endpoint(n), { timeoutMs: a, ...f } = o || {};
    f.headers = await this.requestHeaders(f.headers || {});
    const d = Number(a || 0);
    let p = null, m = null, y = null;
    const S = f.signal;
    d > 0 && typeof AbortController < "u" && (p = new AbortController(), y = () => p.abort(), S && (S.aborted ? p.abort() : S.addEventListener("abort", y, { once: !0 })), m = Un().setTimeout(() => p.abort(), d), f.signal = p.signal);
    try {
      return await this.fetchImpl(i, f);
    } catch (c) {
      throw (l = p == null ? void 0 : p.signal) != null && l.aborted && !(S != null && S.aborted) ? new to(this.timeoutMessage(d), {
        cause: c,
        code: "timeout"
      }) : S != null && S.aborted ? new to("Analysis was cancelled.", {
        cause: c,
        code: "cancelled"
      }) : new to(this.connectionMessage(), {
        cause: c,
        code: "unreachable"
      });
    } finally {
      m && Un().clearTimeout(m), S && y && S.removeEventListener("abort", y);
    }
  }
  async warmup({ attempts: n = 2, retryDelayMs: o = 1500, timeoutMs: i = 6e4, maxWaitMs: a = 0, signal: f } = {}) {
    const d = Math.max(1, Math.floor(Number(n) || 1)), p = Math.max(0, Number(a) || 0), m = Date.now();
    let y = null;
    for (let S = 0; S < d; S += 1) {
      const l = Date.now() - m, c = p > 0 ? p - l : 0;
      if (p > 0 && c <= 0) break;
      try {
        const v = await this.fetch("/healthz", {
          method: "GET",
          signal: f,
          timeoutMs: p > 0 ? Math.min(i, c) : i
        });
        if (v != null && v.ok) return v;
        y = new to(
          `Synapse hosted service returned ${(v == null ? void 0 : v.status) || "an unexpected status"} while preparing your analysis.`,
          { code: "warmup_status" }
        );
      } catch (v) {
        y = v;
      }
      if (S < d - 1 && o > 0) {
        const v = p > 0 ? p - (Date.now() - m) : o;
        if (p > 0 && v <= 0) break;
        await new Promise((w) => Un().setTimeout(w, Math.min(o, v)));
      }
    }
    throw y || new to(this.connectionMessage(), { code: "warmup_failed" });
  }
  isRetryableResponse(n) {
    return [502, 503, 504].includes(Number(n == null ? void 0 : n.status));
  }
  isRetryableConnectionError(n) {
    return !(!(n instanceof to) || n.code === "cancelled" || n.code === "timeout");
  }
  async fetchWithRetry(n, o = {}, {
    attempts: i = 3,
    retryDelayMs: a = 3e3,
    retryOnConnectionError: f = !0,
    onRetry: d
  } = {}) {
    const p = Math.max(1, Math.floor(Number(i) || 1));
    let m = null, y = null;
    for (let S = 0; S < p; S += 1) {
      try {
        const l = typeof o == "function" ? o(S) : o;
        if (m = await this.fetch(n, l), !this.isRetryableResponse(m) || S === p - 1) return m;
        d == null || d({
          attempt: S + 1,
          totalAttempts: p,
          reason: `HTTP ${m.status}`
        });
      } catch (l) {
        if (y = l, !(f && this.isRetryableConnectionError(l) && S < p - 1)) throw l;
        d == null || d({
          attempt: S + 1,
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
var di = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Fg(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var Yu = { exports: {} }, pe = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Ah;
function x1() {
  if (Ah) return pe;
  Ah = 1;
  var e = Symbol.for("react.element"), n = Symbol.for("react.portal"), o = Symbol.for("react.fragment"), i = Symbol.for("react.strict_mode"), a = Symbol.for("react.profiler"), f = Symbol.for("react.provider"), d = Symbol.for("react.context"), p = Symbol.for("react.forward_ref"), m = Symbol.for("react.suspense"), y = Symbol.for("react.memo"), S = Symbol.for("react.lazy"), l = Symbol.iterator;
  function c(N) {
    return N === null || typeof N != "object" ? null : (N = l && N[l] || N["@@iterator"], typeof N == "function" ? N : null);
  }
  var v = { isMounted: function() {
    return !1;
  }, enqueueForceUpdate: function() {
  }, enqueueReplaceState: function() {
  }, enqueueSetState: function() {
  } }, w = Object.assign, T = {};
  function A(N, V, fe) {
    this.props = N, this.context = V, this.refs = T, this.updater = fe || v;
  }
  A.prototype.isReactComponent = {}, A.prototype.setState = function(N, V) {
    if (typeof N != "object" && typeof N != "function" && N != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
    this.updater.enqueueSetState(this, N, V, "setState");
  }, A.prototype.forceUpdate = function(N) {
    this.updater.enqueueForceUpdate(this, N, "forceUpdate");
  };
  function _() {
  }
  _.prototype = A.prototype;
  function C(N, V, fe) {
    this.props = N, this.context = V, this.refs = T, this.updater = fe || v;
  }
  var E = C.prototype = new _();
  E.constructor = C, w(E, A.prototype), E.isPureReactComponent = !0;
  var D = Array.isArray, O = Object.prototype.hasOwnProperty, W = { current: null }, H = { key: !0, ref: !0, __self: !0, __source: !0 };
  function Y(N, V, fe) {
    var me, ge = {}, ve = null, Pe = null;
    if (V != null) for (me in V.ref !== void 0 && (Pe = V.ref), V.key !== void 0 && (ve = "" + V.key), V) O.call(V, me) && !H.hasOwnProperty(me) && (ge[me] = V[me]);
    var xe = arguments.length - 2;
    if (xe === 1) ge.children = fe;
    else if (1 < xe) {
      for (var De = Array(xe), vt = 0; vt < xe; vt++) De[vt] = arguments[vt + 2];
      ge.children = De;
    }
    if (N && N.defaultProps) for (me in xe = N.defaultProps, xe) ge[me] === void 0 && (ge[me] = xe[me]);
    return { $$typeof: e, type: N, key: ve, ref: Pe, props: ge, _owner: W.current };
  }
  function L(N, V) {
    return { $$typeof: e, type: N.type, key: V, ref: N.ref, props: N.props, _owner: N._owner };
  }
  function X(N) {
    return typeof N == "object" && N !== null && N.$$typeof === e;
  }
  function se(N) {
    var V = { "=": "=0", ":": "=2" };
    return "$" + N.replace(/[=:]/g, function(fe) {
      return V[fe];
    });
  }
  var Z = /\/+/g;
  function de(N, V) {
    return typeof N == "object" && N !== null && N.key != null ? se("" + N.key) : V.toString(36);
  }
  function ce(N, V, fe, me, ge) {
    var ve = typeof N;
    (ve === "undefined" || ve === "boolean") && (N = null);
    var Pe = !1;
    if (N === null) Pe = !0;
    else switch (ve) {
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
    if (Pe) return Pe = N, ge = ge(Pe), N = me === "" ? "." + de(Pe, 0) : me, D(ge) ? (fe = "", N != null && (fe = N.replace(Z, "$&/") + "/"), ce(ge, V, fe, "", function(vt) {
      return vt;
    })) : ge != null && (X(ge) && (ge = L(ge, fe + (!ge.key || Pe && Pe.key === ge.key ? "" : ("" + ge.key).replace(Z, "$&/") + "/") + N)), V.push(ge)), 1;
    if (Pe = 0, me = me === "" ? "." : me + ":", D(N)) for (var xe = 0; xe < N.length; xe++) {
      ve = N[xe];
      var De = me + de(ve, xe);
      Pe += ce(ve, V, fe, De, ge);
    }
    else if (De = c(N), typeof De == "function") for (N = De.call(N), xe = 0; !(ve = N.next()).done; ) ve = ve.value, De = me + de(ve, xe++), Pe += ce(ve, V, fe, De, ge);
    else if (ve === "object") throw V = String(N), Error("Objects are not valid as a React child (found: " + (V === "[object Object]" ? "object with keys {" + Object.keys(N).join(", ") + "}" : V) + "). If you meant to render a collection of children, use an array instead.");
    return Pe;
  }
  function ye(N, V, fe) {
    if (N == null) return N;
    var me = [], ge = 0;
    return ce(N, me, "", "", function(ve) {
      return V.call(fe, ve, ge++);
    }), me;
  }
  function ee(N) {
    if (N._status === -1) {
      var V = N._result;
      V = V(), V.then(function(fe) {
        (N._status === 0 || N._status === -1) && (N._status = 1, N._result = fe);
      }, function(fe) {
        (N._status === 0 || N._status === -1) && (N._status = 2, N._result = fe);
      }), N._status === -1 && (N._status = 0, N._result = V);
    }
    if (N._status === 1) return N._result.default;
    throw N._result;
  }
  var we = { current: null }, $ = { transition: null }, J = { ReactCurrentDispatcher: we, ReactCurrentBatchConfig: $, ReactCurrentOwner: W };
  function Q() {
    throw Error("act(...) is not supported in production builds of React.");
  }
  return pe.Children = { map: ye, forEach: function(N, V, fe) {
    ye(N, function() {
      V.apply(this, arguments);
    }, fe);
  }, count: function(N) {
    var V = 0;
    return ye(N, function() {
      V++;
    }), V;
  }, toArray: function(N) {
    return ye(N, function(V) {
      return V;
    }) || [];
  }, only: function(N) {
    if (!X(N)) throw Error("React.Children.only expected to receive a single React element child.");
    return N;
  } }, pe.Component = A, pe.Fragment = o, pe.Profiler = a, pe.PureComponent = C, pe.StrictMode = i, pe.Suspense = m, pe.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = J, pe.act = Q, pe.cloneElement = function(N, V, fe) {
    if (N == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + N + ".");
    var me = w({}, N.props), ge = N.key, ve = N.ref, Pe = N._owner;
    if (V != null) {
      if (V.ref !== void 0 && (ve = V.ref, Pe = W.current), V.key !== void 0 && (ge = "" + V.key), N.type && N.type.defaultProps) var xe = N.type.defaultProps;
      for (De in V) O.call(V, De) && !H.hasOwnProperty(De) && (me[De] = V[De] === void 0 && xe !== void 0 ? xe[De] : V[De]);
    }
    var De = arguments.length - 2;
    if (De === 1) me.children = fe;
    else if (1 < De) {
      xe = Array(De);
      for (var vt = 0; vt < De; vt++) xe[vt] = arguments[vt + 2];
      me.children = xe;
    }
    return { $$typeof: e, type: N.type, key: ge, ref: ve, props: me, _owner: Pe };
  }, pe.createContext = function(N) {
    return N = { $$typeof: d, _currentValue: N, _currentValue2: N, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, N.Provider = { $$typeof: f, _context: N }, N.Consumer = N;
  }, pe.createElement = Y, pe.createFactory = function(N) {
    var V = Y.bind(null, N);
    return V.type = N, V;
  }, pe.createRef = function() {
    return { current: null };
  }, pe.forwardRef = function(N) {
    return { $$typeof: p, render: N };
  }, pe.isValidElement = X, pe.lazy = function(N) {
    return { $$typeof: S, _payload: { _status: -1, _result: N }, _init: ee };
  }, pe.memo = function(N, V) {
    return { $$typeof: y, type: N, compare: V === void 0 ? null : V };
  }, pe.startTransition = function(N) {
    var V = $.transition;
    $.transition = {};
    try {
      N();
    } finally {
      $.transition = V;
    }
  }, pe.unstable_act = Q, pe.useCallback = function(N, V) {
    return we.current.useCallback(N, V);
  }, pe.useContext = function(N) {
    return we.current.useContext(N);
  }, pe.useDebugValue = function() {
  }, pe.useDeferredValue = function(N) {
    return we.current.useDeferredValue(N);
  }, pe.useEffect = function(N, V) {
    return we.current.useEffect(N, V);
  }, pe.useId = function() {
    return we.current.useId();
  }, pe.useImperativeHandle = function(N, V, fe) {
    return we.current.useImperativeHandle(N, V, fe);
  }, pe.useInsertionEffect = function(N, V) {
    return we.current.useInsertionEffect(N, V);
  }, pe.useLayoutEffect = function(N, V) {
    return we.current.useLayoutEffect(N, V);
  }, pe.useMemo = function(N, V) {
    return we.current.useMemo(N, V);
  }, pe.useReducer = function(N, V, fe) {
    return we.current.useReducer(N, V, fe);
  }, pe.useRef = function(N) {
    return we.current.useRef(N);
  }, pe.useState = function(N) {
    return we.current.useState(N);
  }, pe.useSyncExternalStore = function(N, V, fe) {
    return we.current.useSyncExternalStore(N, V, fe);
  }, pe.useTransition = function() {
    return we.current.useTransition();
  }, pe.version = "18.3.1", pe;
}
var bh;
function bd() {
  return bh || (bh = 1, Yu.exports = x1()), Yu.exports;
}
var b = bd();
const gn = /* @__PURE__ */ Fg(b), Er = /* @__PURE__ */ h1({
  __proto__: null,
  default: gn
}, [b]);
var Ys = {}, Qu = { exports: {} }, yt = {}, Xu = { exports: {} }, Zu = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Ch;
function _1() {
  return Ch || (Ch = 1, (function(e) {
    function n($, J) {
      var Q = $.length;
      $.push(J);
      e: for (; 0 < Q; ) {
        var N = Q - 1 >>> 1, V = $[N];
        if (0 < a(V, J)) $[N] = J, $[Q] = V, Q = N;
        else break e;
      }
    }
    function o($) {
      return $.length === 0 ? null : $[0];
    }
    function i($) {
      if ($.length === 0) return null;
      var J = $[0], Q = $.pop();
      if (Q !== J) {
        $[0] = Q;
        e: for (var N = 0, V = $.length, fe = V >>> 1; N < fe; ) {
          var me = 2 * (N + 1) - 1, ge = $[me], ve = me + 1, Pe = $[ve];
          if (0 > a(ge, Q)) ve < V && 0 > a(Pe, ge) ? ($[N] = Pe, $[ve] = Q, N = ve) : ($[N] = ge, $[me] = Q, N = me);
          else if (ve < V && 0 > a(Pe, Q)) $[N] = Pe, $[ve] = Q, N = ve;
          else break e;
        }
      }
      return J;
    }
    function a($, J) {
      var Q = $.sortIndex - J.sortIndex;
      return Q !== 0 ? Q : $.id - J.id;
    }
    if (typeof performance == "object" && typeof performance.now == "function") {
      var f = performance;
      e.unstable_now = function() {
        return f.now();
      };
    } else {
      var d = Date, p = d.now();
      e.unstable_now = function() {
        return d.now() - p;
      };
    }
    var m = [], y = [], S = 1, l = null, c = 3, v = !1, w = !1, T = !1, A = typeof setTimeout == "function" ? setTimeout : null, _ = typeof clearTimeout == "function" ? clearTimeout : null, C = typeof setImmediate < "u" ? setImmediate : null;
    typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
    function E($) {
      for (var J = o(y); J !== null; ) {
        if (J.callback === null) i(y);
        else if (J.startTime <= $) i(y), J.sortIndex = J.expirationTime, n(m, J);
        else break;
        J = o(y);
      }
    }
    function D($) {
      if (T = !1, E($), !w) if (o(m) !== null) w = !0, ee(O);
      else {
        var J = o(y);
        J !== null && we(D, J.startTime - $);
      }
    }
    function O($, J) {
      w = !1, T && (T = !1, _(Y), Y = -1), v = !0;
      var Q = c;
      try {
        for (E(J), l = o(m); l !== null && (!(l.expirationTime > J) || $ && !se()); ) {
          var N = l.callback;
          if (typeof N == "function") {
            l.callback = null, c = l.priorityLevel;
            var V = N(l.expirationTime <= J);
            J = e.unstable_now(), typeof V == "function" ? l.callback = V : l === o(m) && i(m), E(J);
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
        l = null, c = Q, v = !1;
      }
    }
    var W = !1, H = null, Y = -1, L = 5, X = -1;
    function se() {
      return !(e.unstable_now() - X < L);
    }
    function Z() {
      if (H !== null) {
        var $ = e.unstable_now();
        X = $;
        var J = !0;
        try {
          J = H(!0, $);
        } finally {
          J ? de() : (W = !1, H = null);
        }
      } else W = !1;
    }
    var de;
    if (typeof C == "function") de = function() {
      C(Z);
    };
    else if (typeof MessageChannel < "u") {
      var ce = new MessageChannel(), ye = ce.port2;
      ce.port1.onmessage = Z, de = function() {
        ye.postMessage(null);
      };
    } else de = function() {
      A(Z, 0);
    };
    function ee($) {
      H = $, W || (W = !0, de());
    }
    function we($, J) {
      Y = A(function() {
        $(e.unstable_now());
      }, J);
    }
    e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function($) {
      $.callback = null;
    }, e.unstable_continueExecution = function() {
      w || v || (w = !0, ee(O));
    }, e.unstable_forceFrameRate = function($) {
      0 > $ || 125 < $ ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : L = 0 < $ ? Math.floor(1e3 / $) : 5;
    }, e.unstable_getCurrentPriorityLevel = function() {
      return c;
    }, e.unstable_getFirstCallbackNode = function() {
      return o(m);
    }, e.unstable_next = function($) {
      switch (c) {
        case 1:
        case 2:
        case 3:
          var J = 3;
          break;
        default:
          J = c;
      }
      var Q = c;
      c = J;
      try {
        return $();
      } finally {
        c = Q;
      }
    }, e.unstable_pauseExecution = function() {
    }, e.unstable_requestPaint = function() {
    }, e.unstable_runWithPriority = function($, J) {
      switch ($) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          $ = 3;
      }
      var Q = c;
      c = $;
      try {
        return J();
      } finally {
        c = Q;
      }
    }, e.unstable_scheduleCallback = function($, J, Q) {
      var N = e.unstable_now();
      switch (typeof Q == "object" && Q !== null ? (Q = Q.delay, Q = typeof Q == "number" && 0 < Q ? N + Q : N) : Q = N, $) {
        case 1:
          var V = -1;
          break;
        case 2:
          V = 250;
          break;
        case 5:
          V = 1073741823;
          break;
        case 4:
          V = 1e4;
          break;
        default:
          V = 5e3;
      }
      return V = Q + V, $ = { id: S++, callback: J, priorityLevel: $, startTime: Q, expirationTime: V, sortIndex: -1 }, Q > N ? ($.sortIndex = Q, n(y, $), o(m) === null && $ === o(y) && (T ? (_(Y), Y = -1) : T = !0, we(D, Q - N))) : ($.sortIndex = V, n(m, $), w || v || (w = !0, ee(O))), $;
    }, e.unstable_shouldYield = se, e.unstable_wrapCallback = function($) {
      var J = c;
      return function() {
        var Q = c;
        c = J;
        try {
          return $.apply(this, arguments);
        } finally {
          c = Q;
        }
      };
    };
  })(Zu)), Zu;
}
var Ph;
function T1() {
  return Ph || (Ph = 1, Xu.exports = _1()), Xu.exports;
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
var Eh;
function k1() {
  if (Eh) return yt;
  Eh = 1;
  var e = bd(), n = T1();
  function o(t) {
    for (var r = "https://reactjs.org/docs/error-decoder.html?invariant=" + t, s = 1; s < arguments.length; s++) r += "&args[]=" + encodeURIComponent(arguments[s]);
    return "Minified React error #" + t + "; visit " + r + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  var i = /* @__PURE__ */ new Set(), a = {};
  function f(t, r) {
    d(t, r), d(t + "Capture", r);
  }
  function d(t, r) {
    for (a[t] = r, t = 0; t < r.length; t++) i.add(r[t]);
  }
  var p = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), m = Object.prototype.hasOwnProperty, y = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, S = {}, l = {};
  function c(t) {
    return m.call(l, t) ? !0 : m.call(S, t) ? !1 : y.test(t) ? l[t] = !0 : (S[t] = !0, !1);
  }
  function v(t, r, s, u) {
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
  function w(t, r, s, u) {
    if (r === null || typeof r > "u" || v(t, r, s, u)) return !0;
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
  function T(t, r, s, u, h, g, k) {
    this.acceptsBooleans = r === 2 || r === 3 || r === 4, this.attributeName = u, this.attributeNamespace = h, this.mustUseProperty = s, this.propertyName = t, this.type = r, this.sanitizeURL = g, this.removeEmptyString = k;
  }
  var A = {};
  "children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(t) {
    A[t] = new T(t, 0, !1, t, null, !1, !1);
  }), [["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(t) {
    var r = t[0];
    A[r] = new T(r, 1, !1, t[1], null, !1, !1);
  }), ["contentEditable", "draggable", "spellCheck", "value"].forEach(function(t) {
    A[t] = new T(t, 2, !1, t.toLowerCase(), null, !1, !1);
  }), ["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(t) {
    A[t] = new T(t, 2, !1, t, null, !1, !1);
  }), "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(t) {
    A[t] = new T(t, 3, !1, t.toLowerCase(), null, !1, !1);
  }), ["checked", "multiple", "muted", "selected"].forEach(function(t) {
    A[t] = new T(t, 3, !0, t, null, !1, !1);
  }), ["capture", "download"].forEach(function(t) {
    A[t] = new T(t, 4, !1, t, null, !1, !1);
  }), ["cols", "rows", "size", "span"].forEach(function(t) {
    A[t] = new T(t, 6, !1, t, null, !1, !1);
  }), ["rowSpan", "start"].forEach(function(t) {
    A[t] = new T(t, 5, !1, t.toLowerCase(), null, !1, !1);
  });
  var _ = /[\-:]([a-z])/g;
  function C(t) {
    return t[1].toUpperCase();
  }
  "accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(t) {
    var r = t.replace(
      _,
      C
    );
    A[r] = new T(r, 1, !1, t, null, !1, !1);
  }), "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(t) {
    var r = t.replace(_, C);
    A[r] = new T(r, 1, !1, t, "http://www.w3.org/1999/xlink", !1, !1);
  }), ["xml:base", "xml:lang", "xml:space"].forEach(function(t) {
    var r = t.replace(_, C);
    A[r] = new T(r, 1, !1, t, "http://www.w3.org/XML/1998/namespace", !1, !1);
  }), ["tabIndex", "crossOrigin"].forEach(function(t) {
    A[t] = new T(t, 1, !1, t.toLowerCase(), null, !1, !1);
  }), A.xlinkHref = new T("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1), ["src", "href", "action", "formAction"].forEach(function(t) {
    A[t] = new T(t, 1, !1, t.toLowerCase(), null, !0, !0);
  });
  function E(t, r, s, u) {
    var h = A.hasOwnProperty(r) ? A[r] : null;
    (h !== null ? h.type !== 0 : u || !(2 < r.length) || r[0] !== "o" && r[0] !== "O" || r[1] !== "n" && r[1] !== "N") && (w(r, s, h, u) && (s = null), u || h === null ? c(r) && (s === null ? t.removeAttribute(r) : t.setAttribute(r, "" + s)) : h.mustUseProperty ? t[h.propertyName] = s === null ? h.type === 3 ? !1 : "" : s : (r = h.attributeName, u = h.attributeNamespace, s === null ? t.removeAttribute(r) : (h = h.type, s = h === 3 || h === 4 && s === !0 ? "" : "" + s, u ? t.setAttributeNS(u, r, s) : t.setAttribute(r, s))));
  }
  var D = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, O = Symbol.for("react.element"), W = Symbol.for("react.portal"), H = Symbol.for("react.fragment"), Y = Symbol.for("react.strict_mode"), L = Symbol.for("react.profiler"), X = Symbol.for("react.provider"), se = Symbol.for("react.context"), Z = Symbol.for("react.forward_ref"), de = Symbol.for("react.suspense"), ce = Symbol.for("react.suspense_list"), ye = Symbol.for("react.memo"), ee = Symbol.for("react.lazy"), we = Symbol.for("react.offscreen"), $ = Symbol.iterator;
  function J(t) {
    return t === null || typeof t != "object" ? null : (t = $ && t[$] || t["@@iterator"], typeof t == "function" ? t : null);
  }
  var Q = Object.assign, N;
  function V(t) {
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
`), g = u.stack.split(`
`), k = h.length - 1, P = g.length - 1; 1 <= k && 0 <= P && h[k] !== g[P]; ) P--;
        for (; 1 <= k && 0 <= P; k--, P--) if (h[k] !== g[P]) {
          if (k !== 1 || P !== 1)
            do
              if (k--, P--, 0 > P || h[k] !== g[P]) {
                var M = `
` + h[k].replace(" at new ", " at ");
                return t.displayName && M.includes("<anonymous>") && (M = M.replace("<anonymous>", t.displayName)), M;
              }
            while (1 <= k && 0 <= P);
          break;
        }
      }
    } finally {
      fe = !1, Error.prepareStackTrace = s;
    }
    return (t = t ? t.displayName || t.name : "") ? V(t) : "";
  }
  function ge(t) {
    switch (t.tag) {
      case 5:
        return V(t.type);
      case 16:
        return V("Lazy");
      case 13:
        return V("Suspense");
      case 19:
        return V("SuspenseList");
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
  function ve(t) {
    if (t == null) return null;
    if (typeof t == "function") return t.displayName || t.name || null;
    if (typeof t == "string") return t;
    switch (t) {
      case H:
        return "Fragment";
      case W:
        return "Portal";
      case L:
        return "Profiler";
      case Y:
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
      case ye:
        return r = t.displayName || null, r !== null ? r : ve(t.type) || "Memo";
      case ee:
        r = t._payload, t = t._init;
        try {
          return ve(t(r));
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
        return ve(r);
      case 8:
        return r === Y ? "StrictMode" : "Mode";
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
  function De(t) {
    var r = t.type;
    return (t = t.nodeName) && t.toLowerCase() === "input" && (r === "checkbox" || r === "radio");
  }
  function vt(t) {
    var r = De(t) ? "checked" : "value", s = Object.getOwnPropertyDescriptor(t.constructor.prototype, r), u = "" + t[r];
    if (!t.hasOwnProperty(r) && typeof s < "u" && typeof s.get == "function" && typeof s.set == "function") {
      var h = s.get, g = s.set;
      return Object.defineProperty(t, r, { configurable: !0, get: function() {
        return h.call(this);
      }, set: function(k) {
        u = "" + k, g.call(this, k);
      } }), Object.defineProperty(t, r, { enumerable: s.enumerable }), { getValue: function() {
        return u;
      }, setValue: function(k) {
        u = "" + k;
      }, stopTracking: function() {
        t._valueTracker = null, delete t[r];
      } };
    }
  }
  function Li(t) {
    t._valueTracker || (t._valueTracker = vt(t));
  }
  function Pf(t) {
    if (!t) return !1;
    var r = t._valueTracker;
    if (!r) return !0;
    var s = r.getValue(), u = "";
    return t && (u = De(t) ? t.checked ? "true" : "false" : t.value), t = u, t !== s ? (r.setValue(t), !0) : !1;
  }
  function Vi(t) {
    if (t = t || (typeof document < "u" ? document : void 0), typeof t > "u") return null;
    try {
      return t.activeElement || t.body;
    } catch {
      return t.body;
    }
  }
  function tl(t, r) {
    var s = r.checked;
    return Q({}, r, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: s ?? t._wrapperState.initialChecked });
  }
  function Ef(t, r) {
    var s = r.defaultValue == null ? "" : r.defaultValue, u = r.checked != null ? r.checked : r.defaultChecked;
    s = xe(r.value != null ? r.value : s), t._wrapperState = { initialChecked: u, initialValue: s, controlled: r.type === "checkbox" || r.type === "radio" ? r.checked != null : r.value != null };
  }
  function Mf(t, r) {
    r = r.checked, r != null && E(t, "checked", r, !1);
  }
  function nl(t, r) {
    Mf(t, r);
    var s = xe(r.value), u = r.type;
    if (s != null) u === "number" ? (s === 0 && t.value === "" || t.value != s) && (t.value = "" + s) : t.value !== "" + s && (t.value = "" + s);
    else if (u === "submit" || u === "reset") {
      t.removeAttribute("value");
      return;
    }
    r.hasOwnProperty("value") ? rl(t, r.type, s) : r.hasOwnProperty("defaultValue") && rl(t, r.type, xe(r.defaultValue)), r.checked == null && r.defaultChecked != null && (t.defaultChecked = !!r.defaultChecked);
  }
  function Rf(t, r, s) {
    if (r.hasOwnProperty("value") || r.hasOwnProperty("defaultValue")) {
      var u = r.type;
      if (!(u !== "submit" && u !== "reset" || r.value !== void 0 && r.value !== null)) return;
      r = "" + t._wrapperState.initialValue, s || r === t.value || (t.value = r), t.defaultValue = r;
    }
    s = t.name, s !== "" && (t.name = ""), t.defaultChecked = !!t._wrapperState.initialChecked, s !== "" && (t.name = s);
  }
  function rl(t, r, s) {
    (r !== "number" || Vi(t.ownerDocument) !== t) && (s == null ? t.defaultValue = "" + t._wrapperState.initialValue : t.defaultValue !== "" + s && (t.defaultValue = "" + s));
  }
  var bo = Array.isArray;
  function Mr(t, r, s, u) {
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
  function ol(t, r) {
    if (r.dangerouslySetInnerHTML != null) throw Error(o(91));
    return Q({}, r, { value: void 0, defaultValue: void 0, children: "" + t._wrapperState.initialValue });
  }
  function Df(t, r) {
    var s = r.value;
    if (s == null) {
      if (s = r.children, r = r.defaultValue, s != null) {
        if (r != null) throw Error(o(92));
        if (bo(s)) {
          if (1 < s.length) throw Error(o(93));
          s = s[0];
        }
        r = s;
      }
      r == null && (r = ""), s = r;
    }
    t._wrapperState = { initialValue: xe(s) };
  }
  function Nf(t, r) {
    var s = xe(r.value), u = xe(r.defaultValue);
    s != null && (s = "" + s, s !== t.value && (t.value = s), r.defaultValue == null && t.defaultValue !== s && (t.defaultValue = s)), u != null && (t.defaultValue = "" + u);
  }
  function jf(t) {
    var r = t.textContent;
    r === t._wrapperState.initialValue && r !== "" && r !== null && (t.value = r);
  }
  function If(t) {
    switch (t) {
      case "svg":
        return "http://www.w3.org/2000/svg";
      case "math":
        return "http://www.w3.org/1998/Math/MathML";
      default:
        return "http://www.w3.org/1999/xhtml";
    }
  }
  function il(t, r) {
    return t == null || t === "http://www.w3.org/1999/xhtml" ? If(r) : t === "http://www.w3.org/2000/svg" && r === "foreignObject" ? "http://www.w3.org/1999/xhtml" : t;
  }
  var zi, Ff = (function(t) {
    return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(r, s, u, h) {
      MSApp.execUnsafeLocalFunction(function() {
        return t(r, s, u, h);
      });
    } : t;
  })(function(t, r) {
    if (t.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in t) t.innerHTML = r;
    else {
      for (zi = zi || document.createElement("div"), zi.innerHTML = "<svg>" + r.valueOf().toString() + "</svg>", r = zi.firstChild; t.firstChild; ) t.removeChild(t.firstChild);
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
  var Po = {
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
  }, Sw = ["Webkit", "ms", "Moz", "O"];
  Object.keys(Po).forEach(function(t) {
    Sw.forEach(function(r) {
      r = r + t.charAt(0).toUpperCase() + t.substring(1), Po[r] = Po[t];
    });
  });
  function Of(t, r, s) {
    return r == null || typeof r == "boolean" || r === "" ? "" : s || typeof r != "number" || r === 0 || Po.hasOwnProperty(t) && Po[t] ? ("" + r).trim() : r + "px";
  }
  function Lf(t, r) {
    t = t.style;
    for (var s in r) if (r.hasOwnProperty(s)) {
      var u = s.indexOf("--") === 0, h = Of(s, r[s], u);
      s === "float" && (s = "cssFloat"), u ? t.setProperty(s, h) : t[s] = h;
    }
  }
  var ww = Q({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
  function sl(t, r) {
    if (r) {
      if (ww[t] && (r.children != null || r.dangerouslySetInnerHTML != null)) throw Error(o(137, t));
      if (r.dangerouslySetInnerHTML != null) {
        if (r.children != null) throw Error(o(60));
        if (typeof r.dangerouslySetInnerHTML != "object" || !("__html" in r.dangerouslySetInnerHTML)) throw Error(o(61));
      }
      if (r.style != null && typeof r.style != "object") throw Error(o(62));
    }
  }
  function al(t, r) {
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
  var ll = null;
  function ul(t) {
    return t = t.target || t.srcElement || window, t.correspondingUseElement && (t = t.correspondingUseElement), t.nodeType === 3 ? t.parentNode : t;
  }
  var cl = null, Rr = null, Dr = null;
  function Vf(t) {
    if (t = Xo(t)) {
      if (typeof cl != "function") throw Error(o(280));
      var r = t.stateNode;
      r && (r = us(r), cl(t.stateNode, t.type, r));
    }
  }
  function zf(t) {
    Rr ? Dr ? Dr.push(t) : Dr = [t] : Rr = t;
  }
  function Bf() {
    if (Rr) {
      var t = Rr, r = Dr;
      if (Dr = Rr = null, Vf(t), r) for (t = 0; t < r.length; t++) Vf(r[t]);
    }
  }
  function $f(t, r) {
    return t(r);
  }
  function Uf() {
  }
  var dl = !1;
  function Hf(t, r, s) {
    if (dl) return t(r, s);
    dl = !0;
    try {
      return $f(t, r, s);
    } finally {
      dl = !1, (Rr !== null || Dr !== null) && (Uf(), Bf());
    }
  }
  function Eo(t, r) {
    var s = t.stateNode;
    if (s === null) return null;
    var u = us(s);
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
  var fl = !1;
  if (p) try {
    var Mo = {};
    Object.defineProperty(Mo, "passive", { get: function() {
      fl = !0;
    } }), window.addEventListener("test", Mo, Mo), window.removeEventListener("test", Mo, Mo);
  } catch {
    fl = !1;
  }
  function xw(t, r, s, u, h, g, k, P, M) {
    var F = Array.prototype.slice.call(arguments, 3);
    try {
      r.apply(s, F);
    } catch (B) {
      this.onError(B);
    }
  }
  var Ro = !1, Bi = null, $i = !1, pl = null, _w = { onError: function(t) {
    Ro = !0, Bi = t;
  } };
  function Tw(t, r, s, u, h, g, k, P, M) {
    Ro = !1, Bi = null, xw.apply(_w, arguments);
  }
  function kw(t, r, s, u, h, g, k, P, M) {
    if (Tw.apply(this, arguments), Ro) {
      if (Ro) {
        var F = Bi;
        Ro = !1, Bi = null;
      } else throw Error(o(198));
      $i || ($i = !0, pl = F);
    }
  }
  function tr(t) {
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
  function Wf(t) {
    if (t.tag === 13) {
      var r = t.memoizedState;
      if (r === null && (t = t.alternate, t !== null && (r = t.memoizedState)), r !== null) return r.dehydrated;
    }
    return null;
  }
  function Gf(t) {
    if (tr(t) !== t) throw Error(o(188));
  }
  function Aw(t) {
    var r = t.alternate;
    if (!r) {
      if (r = tr(t), r === null) throw Error(o(188));
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
          if (g === s) return Gf(h), t;
          if (g === u) return Gf(h), r;
          g = g.sibling;
        }
        throw Error(o(188));
      }
      if (s.return !== u.return) s = h, u = g;
      else {
        for (var k = !1, P = h.child; P; ) {
          if (P === s) {
            k = !0, s = h, u = g;
            break;
          }
          if (P === u) {
            k = !0, u = h, s = g;
            break;
          }
          P = P.sibling;
        }
        if (!k) {
          for (P = g.child; P; ) {
            if (P === s) {
              k = !0, s = g, u = h;
              break;
            }
            if (P === u) {
              k = !0, u = g, s = h;
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
  function Kf(t) {
    return t = Aw(t), t !== null ? Yf(t) : null;
  }
  function Yf(t) {
    if (t.tag === 5 || t.tag === 6) return t;
    for (t = t.child; t !== null; ) {
      var r = Yf(t);
      if (r !== null) return r;
      t = t.sibling;
    }
    return null;
  }
  var Qf = n.unstable_scheduleCallback, Xf = n.unstable_cancelCallback, bw = n.unstable_shouldYield, Cw = n.unstable_requestPaint, Le = n.unstable_now, Pw = n.unstable_getCurrentPriorityLevel, ml = n.unstable_ImmediatePriority, Zf = n.unstable_UserBlockingPriority, Ui = n.unstable_NormalPriority, Ew = n.unstable_LowPriority, Jf = n.unstable_IdlePriority, Hi = null, Yt = null;
  function Mw(t) {
    if (Yt && typeof Yt.onCommitFiberRoot == "function") try {
      Yt.onCommitFiberRoot(Hi, t, void 0, (t.current.flags & 128) === 128);
    } catch {
    }
  }
  var It = Math.clz32 ? Math.clz32 : Nw, Rw = Math.log, Dw = Math.LN2;
  function Nw(t) {
    return t >>>= 0, t === 0 ? 32 : 31 - (Rw(t) / Dw | 0) | 0;
  }
  var Wi = 64, Gi = 4194304;
  function Do(t) {
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
  function Ki(t, r) {
    var s = t.pendingLanes;
    if (s === 0) return 0;
    var u = 0, h = t.suspendedLanes, g = t.pingedLanes, k = s & 268435455;
    if (k !== 0) {
      var P = k & ~h;
      P !== 0 ? u = Do(P) : (g &= k, g !== 0 && (u = Do(g)));
    } else k = s & ~h, k !== 0 ? u = Do(k) : g !== 0 && (u = Do(g));
    if (u === 0) return 0;
    if (r !== 0 && r !== u && (r & h) === 0 && (h = u & -u, g = r & -r, h >= g || h === 16 && (g & 4194240) !== 0)) return r;
    if ((u & 4) !== 0 && (u |= s & 16), r = t.entangledLanes, r !== 0) for (t = t.entanglements, r &= u; 0 < r; ) s = 31 - It(r), h = 1 << s, u |= t[s], r &= ~h;
    return u;
  }
  function jw(t, r) {
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
  function Iw(t, r) {
    for (var s = t.suspendedLanes, u = t.pingedLanes, h = t.expirationTimes, g = t.pendingLanes; 0 < g; ) {
      var k = 31 - It(g), P = 1 << k, M = h[k];
      M === -1 ? ((P & s) === 0 || (P & u) !== 0) && (h[k] = jw(P, r)) : M <= r && (t.expiredLanes |= P), g &= ~P;
    }
  }
  function hl(t) {
    return t = t.pendingLanes & -1073741825, t !== 0 ? t : t & 1073741824 ? 1073741824 : 0;
  }
  function qf() {
    var t = Wi;
    return Wi <<= 1, (Wi & 4194240) === 0 && (Wi = 64), t;
  }
  function yl(t) {
    for (var r = [], s = 0; 31 > s; s++) r.push(t);
    return r;
  }
  function No(t, r, s) {
    t.pendingLanes |= r, r !== 536870912 && (t.suspendedLanes = 0, t.pingedLanes = 0), t = t.eventTimes, r = 31 - It(r), t[r] = s;
  }
  function Fw(t, r) {
    var s = t.pendingLanes & ~r;
    t.pendingLanes = r, t.suspendedLanes = 0, t.pingedLanes = 0, t.expiredLanes &= r, t.mutableReadLanes &= r, t.entangledLanes &= r, r = t.entanglements;
    var u = t.eventTimes;
    for (t = t.expirationTimes; 0 < s; ) {
      var h = 31 - It(s), g = 1 << h;
      r[h] = 0, u[h] = -1, t[h] = -1, s &= ~g;
    }
  }
  function gl(t, r) {
    var s = t.entangledLanes |= r;
    for (t = t.entanglements; s; ) {
      var u = 31 - It(s), h = 1 << u;
      h & r | t[u] & r && (t[u] |= r), s &= ~h;
    }
  }
  var _e = 0;
  function ep(t) {
    return t &= -t, 1 < t ? 4 < t ? (t & 268435455) !== 0 ? 16 : 536870912 : 4 : 1;
  }
  var tp, vl, np, rp, op, Sl = !1, Yi = [], _n = null, Tn = null, kn = null, jo = /* @__PURE__ */ new Map(), Io = /* @__PURE__ */ new Map(), An = [], Ow = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
  function ip(t, r) {
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
        jo.delete(r.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        Io.delete(r.pointerId);
    }
  }
  function Fo(t, r, s, u, h, g) {
    return t === null || t.nativeEvent !== g ? (t = { blockedOn: r, domEventName: s, eventSystemFlags: u, nativeEvent: g, targetContainers: [h] }, r !== null && (r = Xo(r), r !== null && vl(r)), t) : (t.eventSystemFlags |= u, r = t.targetContainers, h !== null && r.indexOf(h) === -1 && r.push(h), t);
  }
  function Lw(t, r, s, u, h) {
    switch (r) {
      case "focusin":
        return _n = Fo(_n, t, r, s, u, h), !0;
      case "dragenter":
        return Tn = Fo(Tn, t, r, s, u, h), !0;
      case "mouseover":
        return kn = Fo(kn, t, r, s, u, h), !0;
      case "pointerover":
        var g = h.pointerId;
        return jo.set(g, Fo(jo.get(g) || null, t, r, s, u, h)), !0;
      case "gotpointercapture":
        return g = h.pointerId, Io.set(g, Fo(Io.get(g) || null, t, r, s, u, h)), !0;
    }
    return !1;
  }
  function sp(t) {
    var r = nr(t.target);
    if (r !== null) {
      var s = tr(r);
      if (s !== null) {
        if (r = s.tag, r === 13) {
          if (r = Wf(s), r !== null) {
            t.blockedOn = r, op(t.priority, function() {
              np(s);
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
  function Qi(t) {
    if (t.blockedOn !== null) return !1;
    for (var r = t.targetContainers; 0 < r.length; ) {
      var s = xl(t.domEventName, t.eventSystemFlags, r[0], t.nativeEvent);
      if (s === null) {
        s = t.nativeEvent;
        var u = new s.constructor(s.type, s);
        ll = u, s.target.dispatchEvent(u), ll = null;
      } else return r = Xo(s), r !== null && vl(r), t.blockedOn = s, !1;
      r.shift();
    }
    return !0;
  }
  function ap(t, r, s) {
    Qi(t) && s.delete(r);
  }
  function Vw() {
    Sl = !1, _n !== null && Qi(_n) && (_n = null), Tn !== null && Qi(Tn) && (Tn = null), kn !== null && Qi(kn) && (kn = null), jo.forEach(ap), Io.forEach(ap);
  }
  function Oo(t, r) {
    t.blockedOn === r && (t.blockedOn = null, Sl || (Sl = !0, n.unstable_scheduleCallback(n.unstable_NormalPriority, Vw)));
  }
  function Lo(t) {
    function r(h) {
      return Oo(h, t);
    }
    if (0 < Yi.length) {
      Oo(Yi[0], t);
      for (var s = 1; s < Yi.length; s++) {
        var u = Yi[s];
        u.blockedOn === t && (u.blockedOn = null);
      }
    }
    for (_n !== null && Oo(_n, t), Tn !== null && Oo(Tn, t), kn !== null && Oo(kn, t), jo.forEach(r), Io.forEach(r), s = 0; s < An.length; s++) u = An[s], u.blockedOn === t && (u.blockedOn = null);
    for (; 0 < An.length && (s = An[0], s.blockedOn === null); ) sp(s), s.blockedOn === null && An.shift();
  }
  var Nr = D.ReactCurrentBatchConfig, Xi = !0;
  function zw(t, r, s, u) {
    var h = _e, g = Nr.transition;
    Nr.transition = null;
    try {
      _e = 1, wl(t, r, s, u);
    } finally {
      _e = h, Nr.transition = g;
    }
  }
  function Bw(t, r, s, u) {
    var h = _e, g = Nr.transition;
    Nr.transition = null;
    try {
      _e = 4, wl(t, r, s, u);
    } finally {
      _e = h, Nr.transition = g;
    }
  }
  function wl(t, r, s, u) {
    if (Xi) {
      var h = xl(t, r, s, u);
      if (h === null) Ll(t, r, u, Zi, s), ip(t, u);
      else if (Lw(h, t, r, s, u)) u.stopPropagation();
      else if (ip(t, u), r & 4 && -1 < Ow.indexOf(t)) {
        for (; h !== null; ) {
          var g = Xo(h);
          if (g !== null && tp(g), g = xl(t, r, s, u), g === null && Ll(t, r, u, Zi, s), g === h) break;
          h = g;
        }
        h !== null && u.stopPropagation();
      } else Ll(t, r, u, null, s);
    }
  }
  var Zi = null;
  function xl(t, r, s, u) {
    if (Zi = null, t = ul(u), t = nr(t), t !== null) if (r = tr(t), r === null) t = null;
    else if (s = r.tag, s === 13) {
      if (t = Wf(r), t !== null) return t;
      t = null;
    } else if (s === 3) {
      if (r.stateNode.current.memoizedState.isDehydrated) return r.tag === 3 ? r.stateNode.containerInfo : null;
      t = null;
    } else r !== t && (t = null);
    return Zi = t, null;
  }
  function lp(t) {
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
        switch (Pw()) {
          case ml:
            return 1;
          case Zf:
            return 4;
          case Ui:
          case Ew:
            return 16;
          case Jf:
            return 536870912;
          default:
            return 16;
        }
      default:
        return 16;
    }
  }
  var bn = null, _l = null, Ji = null;
  function up() {
    if (Ji) return Ji;
    var t, r = _l, s = r.length, u, h = "value" in bn ? bn.value : bn.textContent, g = h.length;
    for (t = 0; t < s && r[t] === h[t]; t++) ;
    var k = s - t;
    for (u = 1; u <= k && r[s - u] === h[g - u]; u++) ;
    return Ji = h.slice(t, 1 < u ? 1 - u : void 0);
  }
  function qi(t) {
    var r = t.keyCode;
    return "charCode" in t ? (t = t.charCode, t === 0 && r === 13 && (t = 13)) : t = r, t === 10 && (t = 13), 32 <= t || t === 13 ? t : 0;
  }
  function es() {
    return !0;
  }
  function cp() {
    return !1;
  }
  function St(t) {
    function r(s, u, h, g, k) {
      this._reactName = s, this._targetInst = h, this.type = u, this.nativeEvent = g, this.target = k, this.currentTarget = null;
      for (var P in t) t.hasOwnProperty(P) && (s = t[P], this[P] = s ? s(g) : g[P]);
      return this.isDefaultPrevented = (g.defaultPrevented != null ? g.defaultPrevented : g.returnValue === !1) ? es : cp, this.isPropagationStopped = cp, this;
    }
    return Q(r.prototype, { preventDefault: function() {
      this.defaultPrevented = !0;
      var s = this.nativeEvent;
      s && (s.preventDefault ? s.preventDefault() : typeof s.returnValue != "unknown" && (s.returnValue = !1), this.isDefaultPrevented = es);
    }, stopPropagation: function() {
      var s = this.nativeEvent;
      s && (s.stopPropagation ? s.stopPropagation() : typeof s.cancelBubble != "unknown" && (s.cancelBubble = !0), this.isPropagationStopped = es);
    }, persist: function() {
    }, isPersistent: es }), r;
  }
  var jr = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(t) {
    return t.timeStamp || Date.now();
  }, defaultPrevented: 0, isTrusted: 0 }, Tl = St(jr), Vo = Q({}, jr, { view: 0, detail: 0 }), $w = St(Vo), kl, Al, zo, ts = Q({}, Vo, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: Cl, button: 0, buttons: 0, relatedTarget: function(t) {
    return t.relatedTarget === void 0 ? t.fromElement === t.srcElement ? t.toElement : t.fromElement : t.relatedTarget;
  }, movementX: function(t) {
    return "movementX" in t ? t.movementX : (t !== zo && (zo && t.type === "mousemove" ? (kl = t.screenX - zo.screenX, Al = t.screenY - zo.screenY) : Al = kl = 0, zo = t), kl);
  }, movementY: function(t) {
    return "movementY" in t ? t.movementY : Al;
  } }), dp = St(ts), Uw = Q({}, ts, { dataTransfer: 0 }), Hw = St(Uw), Ww = Q({}, Vo, { relatedTarget: 0 }), bl = St(Ww), Gw = Q({}, jr, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), Kw = St(Gw), Yw = Q({}, jr, { clipboardData: function(t) {
    return "clipboardData" in t ? t.clipboardData : window.clipboardData;
  } }), Qw = St(Yw), Xw = Q({}, jr, { data: 0 }), fp = St(Xw), Zw = {
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
  }, Jw = {
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
  }, qw = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
  function ex(t) {
    var r = this.nativeEvent;
    return r.getModifierState ? r.getModifierState(t) : (t = qw[t]) ? !!r[t] : !1;
  }
  function Cl() {
    return ex;
  }
  var tx = Q({}, Vo, { key: function(t) {
    if (t.key) {
      var r = Zw[t.key] || t.key;
      if (r !== "Unidentified") return r;
    }
    return t.type === "keypress" ? (t = qi(t), t === 13 ? "Enter" : String.fromCharCode(t)) : t.type === "keydown" || t.type === "keyup" ? Jw[t.keyCode] || "Unidentified" : "";
  }, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: Cl, charCode: function(t) {
    return t.type === "keypress" ? qi(t) : 0;
  }, keyCode: function(t) {
    return t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
  }, which: function(t) {
    return t.type === "keypress" ? qi(t) : t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
  } }), nx = St(tx), rx = Q({}, ts, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), pp = St(rx), ox = Q({}, Vo, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: Cl }), ix = St(ox), sx = Q({}, jr, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), ax = St(sx), lx = Q({}, ts, {
    deltaX: function(t) {
      return "deltaX" in t ? t.deltaX : "wheelDeltaX" in t ? -t.wheelDeltaX : 0;
    },
    deltaY: function(t) {
      return "deltaY" in t ? t.deltaY : "wheelDeltaY" in t ? -t.wheelDeltaY : "wheelDelta" in t ? -t.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), ux = St(lx), cx = [9, 13, 27, 32], Pl = p && "CompositionEvent" in window, Bo = null;
  p && "documentMode" in document && (Bo = document.documentMode);
  var dx = p && "TextEvent" in window && !Bo, mp = p && (!Pl || Bo && 8 < Bo && 11 >= Bo), hp = " ", yp = !1;
  function gp(t, r) {
    switch (t) {
      case "keyup":
        return cx.indexOf(r.keyCode) !== -1;
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
  function vp(t) {
    return t = t.detail, typeof t == "object" && "data" in t ? t.data : null;
  }
  var Ir = !1;
  function fx(t, r) {
    switch (t) {
      case "compositionend":
        return vp(r);
      case "keypress":
        return r.which !== 32 ? null : (yp = !0, hp);
      case "textInput":
        return t = r.data, t === hp && yp ? null : t;
      default:
        return null;
    }
  }
  function px(t, r) {
    if (Ir) return t === "compositionend" || !Pl && gp(t, r) ? (t = up(), Ji = _l = bn = null, Ir = !1, t) : null;
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
        return mp && r.locale !== "ko" ? null : r.data;
      default:
        return null;
    }
  }
  var mx = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
  function Sp(t) {
    var r = t && t.nodeName && t.nodeName.toLowerCase();
    return r === "input" ? !!mx[t.type] : r === "textarea";
  }
  function wp(t, r, s, u) {
    zf(u), r = ss(r, "onChange"), 0 < r.length && (s = new Tl("onChange", "change", null, s, u), t.push({ event: s, listeners: r }));
  }
  var $o = null, Uo = null;
  function hx(t) {
    Lp(t, 0);
  }
  function ns(t) {
    var r = zr(t);
    if (Pf(r)) return t;
  }
  function yx(t, r) {
    if (t === "change") return r;
  }
  var xp = !1;
  if (p) {
    var El;
    if (p) {
      var Ml = "oninput" in document;
      if (!Ml) {
        var _p = document.createElement("div");
        _p.setAttribute("oninput", "return;"), Ml = typeof _p.oninput == "function";
      }
      El = Ml;
    } else El = !1;
    xp = El && (!document.documentMode || 9 < document.documentMode);
  }
  function Tp() {
    $o && ($o.detachEvent("onpropertychange", kp), Uo = $o = null);
  }
  function kp(t) {
    if (t.propertyName === "value" && ns(Uo)) {
      var r = [];
      wp(r, Uo, t, ul(t)), Hf(hx, r);
    }
  }
  function gx(t, r, s) {
    t === "focusin" ? (Tp(), $o = r, Uo = s, $o.attachEvent("onpropertychange", kp)) : t === "focusout" && Tp();
  }
  function vx(t) {
    if (t === "selectionchange" || t === "keyup" || t === "keydown") return ns(Uo);
  }
  function Sx(t, r) {
    if (t === "click") return ns(r);
  }
  function wx(t, r) {
    if (t === "input" || t === "change") return ns(r);
  }
  function xx(t, r) {
    return t === r && (t !== 0 || 1 / t === 1 / r) || t !== t && r !== r;
  }
  var Ft = typeof Object.is == "function" ? Object.is : xx;
  function Ho(t, r) {
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
  function Ap(t) {
    for (; t && t.firstChild; ) t = t.firstChild;
    return t;
  }
  function bp(t, r) {
    var s = Ap(t);
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
      s = Ap(s);
    }
  }
  function Cp(t, r) {
    return t && r ? t === r ? !0 : t && t.nodeType === 3 ? !1 : r && r.nodeType === 3 ? Cp(t, r.parentNode) : "contains" in t ? t.contains(r) : t.compareDocumentPosition ? !!(t.compareDocumentPosition(r) & 16) : !1 : !1;
  }
  function Pp() {
    for (var t = window, r = Vi(); r instanceof t.HTMLIFrameElement; ) {
      try {
        var s = typeof r.contentWindow.location.href == "string";
      } catch {
        s = !1;
      }
      if (s) t = r.contentWindow;
      else break;
      r = Vi(t.document);
    }
    return r;
  }
  function Rl(t) {
    var r = t && t.nodeName && t.nodeName.toLowerCase();
    return r && (r === "input" && (t.type === "text" || t.type === "search" || t.type === "tel" || t.type === "url" || t.type === "password") || r === "textarea" || t.contentEditable === "true");
  }
  function _x(t) {
    var r = Pp(), s = t.focusedElem, u = t.selectionRange;
    if (r !== s && s && s.ownerDocument && Cp(s.ownerDocument.documentElement, s)) {
      if (u !== null && Rl(s)) {
        if (r = u.start, t = u.end, t === void 0 && (t = r), "selectionStart" in s) s.selectionStart = r, s.selectionEnd = Math.min(t, s.value.length);
        else if (t = (r = s.ownerDocument || document) && r.defaultView || window, t.getSelection) {
          t = t.getSelection();
          var h = s.textContent.length, g = Math.min(u.start, h);
          u = u.end === void 0 ? g : Math.min(u.end, h), !t.extend && g > u && (h = u, u = g, g = h), h = bp(s, g);
          var k = bp(
            s,
            u
          );
          h && k && (t.rangeCount !== 1 || t.anchorNode !== h.node || t.anchorOffset !== h.offset || t.focusNode !== k.node || t.focusOffset !== k.offset) && (r = r.createRange(), r.setStart(h.node, h.offset), t.removeAllRanges(), g > u ? (t.addRange(r), t.extend(k.node, k.offset)) : (r.setEnd(k.node, k.offset), t.addRange(r)));
        }
      }
      for (r = [], t = s; t = t.parentNode; ) t.nodeType === 1 && r.push({ element: t, left: t.scrollLeft, top: t.scrollTop });
      for (typeof s.focus == "function" && s.focus(), s = 0; s < r.length; s++) t = r[s], t.element.scrollLeft = t.left, t.element.scrollTop = t.top;
    }
  }
  var Tx = p && "documentMode" in document && 11 >= document.documentMode, Fr = null, Dl = null, Wo = null, Nl = !1;
  function Ep(t, r, s) {
    var u = s.window === s ? s.document : s.nodeType === 9 ? s : s.ownerDocument;
    Nl || Fr == null || Fr !== Vi(u) || (u = Fr, "selectionStart" in u && Rl(u) ? u = { start: u.selectionStart, end: u.selectionEnd } : (u = (u.ownerDocument && u.ownerDocument.defaultView || window).getSelection(), u = { anchorNode: u.anchorNode, anchorOffset: u.anchorOffset, focusNode: u.focusNode, focusOffset: u.focusOffset }), Wo && Ho(Wo, u) || (Wo = u, u = ss(Dl, "onSelect"), 0 < u.length && (r = new Tl("onSelect", "select", null, r, s), t.push({ event: r, listeners: u }), r.target = Fr)));
  }
  function rs(t, r) {
    var s = {};
    return s[t.toLowerCase()] = r.toLowerCase(), s["Webkit" + t] = "webkit" + r, s["Moz" + t] = "moz" + r, s;
  }
  var Or = { animationend: rs("Animation", "AnimationEnd"), animationiteration: rs("Animation", "AnimationIteration"), animationstart: rs("Animation", "AnimationStart"), transitionend: rs("Transition", "TransitionEnd") }, jl = {}, Mp = {};
  p && (Mp = document.createElement("div").style, "AnimationEvent" in window || (delete Or.animationend.animation, delete Or.animationiteration.animation, delete Or.animationstart.animation), "TransitionEvent" in window || delete Or.transitionend.transition);
  function os(t) {
    if (jl[t]) return jl[t];
    if (!Or[t]) return t;
    var r = Or[t], s;
    for (s in r) if (r.hasOwnProperty(s) && s in Mp) return jl[t] = r[s];
    return t;
  }
  var Rp = os("animationend"), Dp = os("animationiteration"), Np = os("animationstart"), jp = os("transitionend"), Ip = /* @__PURE__ */ new Map(), Fp = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
  function Cn(t, r) {
    Ip.set(t, r), f(r, [t]);
  }
  for (var Il = 0; Il < Fp.length; Il++) {
    var Fl = Fp[Il], kx = Fl.toLowerCase(), Ax = Fl[0].toUpperCase() + Fl.slice(1);
    Cn(kx, "on" + Ax);
  }
  Cn(Rp, "onAnimationEnd"), Cn(Dp, "onAnimationIteration"), Cn(Np, "onAnimationStart"), Cn("dblclick", "onDoubleClick"), Cn("focusin", "onFocus"), Cn("focusout", "onBlur"), Cn(jp, "onTransitionEnd"), d("onMouseEnter", ["mouseout", "mouseover"]), d("onMouseLeave", ["mouseout", "mouseover"]), d("onPointerEnter", ["pointerout", "pointerover"]), d("onPointerLeave", ["pointerout", "pointerover"]), f("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), f("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), f("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]), f("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), f("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), f("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
  var Go = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), bx = new Set("cancel close invalid load scroll toggle".split(" ").concat(Go));
  function Op(t, r, s) {
    var u = t.type || "unknown-event";
    t.currentTarget = s, kw(u, r, void 0, t), t.currentTarget = null;
  }
  function Lp(t, r) {
    r = (r & 4) !== 0;
    for (var s = 0; s < t.length; s++) {
      var u = t[s], h = u.event;
      u = u.listeners;
      e: {
        var g = void 0;
        if (r) for (var k = u.length - 1; 0 <= k; k--) {
          var P = u[k], M = P.instance, F = P.currentTarget;
          if (P = P.listener, M !== g && h.isPropagationStopped()) break e;
          Op(h, P, F), g = M;
        }
        else for (k = 0; k < u.length; k++) {
          if (P = u[k], M = P.instance, F = P.currentTarget, P = P.listener, M !== g && h.isPropagationStopped()) break e;
          Op(h, P, F), g = M;
        }
      }
    }
    if ($i) throw t = pl, $i = !1, pl = null, t;
  }
  function Me(t, r) {
    var s = r[Hl];
    s === void 0 && (s = r[Hl] = /* @__PURE__ */ new Set());
    var u = t + "__bubble";
    s.has(u) || (Vp(r, t, 2, !1), s.add(u));
  }
  function Ol(t, r, s) {
    var u = 0;
    r && (u |= 4), Vp(s, t, u, r);
  }
  var is = "_reactListening" + Math.random().toString(36).slice(2);
  function Ko(t) {
    if (!t[is]) {
      t[is] = !0, i.forEach(function(s) {
        s !== "selectionchange" && (bx.has(s) || Ol(s, !1, t), Ol(s, !0, t));
      });
      var r = t.nodeType === 9 ? t : t.ownerDocument;
      r === null || r[is] || (r[is] = !0, Ol("selectionchange", !1, r));
    }
  }
  function Vp(t, r, s, u) {
    switch (lp(r)) {
      case 1:
        var h = zw;
        break;
      case 4:
        h = Bw;
        break;
      default:
        h = wl;
    }
    s = h.bind(null, r, s, t), h = void 0, !fl || r !== "touchstart" && r !== "touchmove" && r !== "wheel" || (h = !0), u ? h !== void 0 ? t.addEventListener(r, s, { capture: !0, passive: h }) : t.addEventListener(r, s, !0) : h !== void 0 ? t.addEventListener(r, s, { passive: h }) : t.addEventListener(r, s, !1);
  }
  function Ll(t, r, s, u, h) {
    var g = u;
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
          if (k = nr(P), k === null) return;
          if (M = k.tag, M === 5 || M === 6) {
            u = g = k;
            continue e;
          }
          P = P.parentNode;
        }
      }
      u = u.return;
    }
    Hf(function() {
      var F = g, B = ul(s), U = [];
      e: {
        var z = Ip.get(t);
        if (z !== void 0) {
          var q = Tl, ne = t;
          switch (t) {
            case "keypress":
              if (qi(s) === 0) break e;
            case "keydown":
            case "keyup":
              q = nx;
              break;
            case "focusin":
              ne = "focus", q = bl;
              break;
            case "focusout":
              ne = "blur", q = bl;
              break;
            case "beforeblur":
            case "afterblur":
              q = bl;
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
              q = dp;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              q = Hw;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              q = ix;
              break;
            case Rp:
            case Dp:
            case Np:
              q = Kw;
              break;
            case jp:
              q = ax;
              break;
            case "scroll":
              q = $w;
              break;
            case "wheel":
              q = ux;
              break;
            case "copy":
            case "cut":
            case "paste":
              q = Qw;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              q = pp;
          }
          var oe = (r & 4) !== 0, Ve = !oe && t === "scroll", j = oe ? z !== null ? z + "Capture" : null : z;
          oe = [];
          for (var R = F, I; R !== null; ) {
            I = R;
            var G = I.stateNode;
            if (I.tag === 5 && G !== null && (I = G, j !== null && (G = Eo(R, j), G != null && oe.push(Yo(R, G, I)))), Ve) break;
            R = R.return;
          }
          0 < oe.length && (z = new q(z, ne, null, s, B), U.push({ event: z, listeners: oe }));
        }
      }
      if ((r & 7) === 0) {
        e: {
          if (z = t === "mouseover" || t === "pointerover", q = t === "mouseout" || t === "pointerout", z && s !== ll && (ne = s.relatedTarget || s.fromElement) && (nr(ne) || ne[an])) break e;
          if ((q || z) && (z = B.window === B ? B : (z = B.ownerDocument) ? z.defaultView || z.parentWindow : window, q ? (ne = s.relatedTarget || s.toElement, q = F, ne = ne ? nr(ne) : null, ne !== null && (Ve = tr(ne), ne !== Ve || ne.tag !== 5 && ne.tag !== 6) && (ne = null)) : (q = null, ne = F), q !== ne)) {
            if (oe = dp, G = "onMouseLeave", j = "onMouseEnter", R = "mouse", (t === "pointerout" || t === "pointerover") && (oe = pp, G = "onPointerLeave", j = "onPointerEnter", R = "pointer"), Ve = q == null ? z : zr(q), I = ne == null ? z : zr(ne), z = new oe(G, R + "leave", q, s, B), z.target = Ve, z.relatedTarget = I, G = null, nr(B) === F && (oe = new oe(j, R + "enter", ne, s, B), oe.target = I, oe.relatedTarget = Ve, G = oe), Ve = G, q && ne) t: {
              for (oe = q, j = ne, R = 0, I = oe; I; I = Lr(I)) R++;
              for (I = 0, G = j; G; G = Lr(G)) I++;
              for (; 0 < R - I; ) oe = Lr(oe), R--;
              for (; 0 < I - R; ) j = Lr(j), I--;
              for (; R--; ) {
                if (oe === j || j !== null && oe === j.alternate) break t;
                oe = Lr(oe), j = Lr(j);
              }
              oe = null;
            }
            else oe = null;
            q !== null && zp(U, z, q, oe, !1), ne !== null && Ve !== null && zp(U, Ve, ne, oe, !0);
          }
        }
        e: {
          if (z = F ? zr(F) : window, q = z.nodeName && z.nodeName.toLowerCase(), q === "select" || q === "input" && z.type === "file") var ie = yx;
          else if (Sp(z)) if (xp) ie = wx;
          else {
            ie = vx;
            var ae = gx;
          }
          else (q = z.nodeName) && q.toLowerCase() === "input" && (z.type === "checkbox" || z.type === "radio") && (ie = Sx);
          if (ie && (ie = ie(t, F))) {
            wp(U, ie, s, B);
            break e;
          }
          ae && ae(t, z, F), t === "focusout" && (ae = z._wrapperState) && ae.controlled && z.type === "number" && rl(z, "number", z.value);
        }
        switch (ae = F ? zr(F) : window, t) {
          case "focusin":
            (Sp(ae) || ae.contentEditable === "true") && (Fr = ae, Dl = F, Wo = null);
            break;
          case "focusout":
            Wo = Dl = Fr = null;
            break;
          case "mousedown":
            Nl = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            Nl = !1, Ep(U, s, B);
            break;
          case "selectionchange":
            if (Tx) break;
          case "keydown":
          case "keyup":
            Ep(U, s, B);
        }
        var le;
        if (Pl) e: {
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
        else Ir ? gp(t, s) && (ue = "onCompositionEnd") : t === "keydown" && s.keyCode === 229 && (ue = "onCompositionStart");
        ue && (mp && s.locale !== "ko" && (Ir || ue !== "onCompositionStart" ? ue === "onCompositionEnd" && Ir && (le = up()) : (bn = B, _l = "value" in bn ? bn.value : bn.textContent, Ir = !0)), ae = ss(F, ue), 0 < ae.length && (ue = new fp(ue, t, null, s, B), U.push({ event: ue, listeners: ae }), le ? ue.data = le : (le = vp(s), le !== null && (ue.data = le)))), (le = dx ? fx(t, s) : px(t, s)) && (F = ss(F, "onBeforeInput"), 0 < F.length && (B = new fp("onBeforeInput", "beforeinput", null, s, B), U.push({ event: B, listeners: F }), B.data = le));
      }
      Lp(U, r);
    });
  }
  function Yo(t, r, s) {
    return { instance: t, listener: r, currentTarget: s };
  }
  function ss(t, r) {
    for (var s = r + "Capture", u = []; t !== null; ) {
      var h = t, g = h.stateNode;
      h.tag === 5 && g !== null && (h = g, g = Eo(t, s), g != null && u.unshift(Yo(t, g, h)), g = Eo(t, r), g != null && u.push(Yo(t, g, h))), t = t.return;
    }
    return u;
  }
  function Lr(t) {
    if (t === null) return null;
    do
      t = t.return;
    while (t && t.tag !== 5);
    return t || null;
  }
  function zp(t, r, s, u, h) {
    for (var g = r._reactName, k = []; s !== null && s !== u; ) {
      var P = s, M = P.alternate, F = P.stateNode;
      if (M !== null && M === u) break;
      P.tag === 5 && F !== null && (P = F, h ? (M = Eo(s, g), M != null && k.unshift(Yo(s, M, P))) : h || (M = Eo(s, g), M != null && k.push(Yo(s, M, P)))), s = s.return;
    }
    k.length !== 0 && t.push({ event: r, listeners: k });
  }
  var Cx = /\r\n?/g, Px = /\u0000|\uFFFD/g;
  function Bp(t) {
    return (typeof t == "string" ? t : "" + t).replace(Cx, `
`).replace(Px, "");
  }
  function as(t, r, s) {
    if (r = Bp(r), Bp(t) !== r && s) throw Error(o(425));
  }
  function ls() {
  }
  var Vl = null, zl = null;
  function Bl(t, r) {
    return t === "textarea" || t === "noscript" || typeof r.children == "string" || typeof r.children == "number" || typeof r.dangerouslySetInnerHTML == "object" && r.dangerouslySetInnerHTML !== null && r.dangerouslySetInnerHTML.__html != null;
  }
  var $l = typeof setTimeout == "function" ? setTimeout : void 0, Ex = typeof clearTimeout == "function" ? clearTimeout : void 0, $p = typeof Promise == "function" ? Promise : void 0, Mx = typeof queueMicrotask == "function" ? queueMicrotask : typeof $p < "u" ? function(t) {
    return $p.resolve(null).then(t).catch(Rx);
  } : $l;
  function Rx(t) {
    setTimeout(function() {
      throw t;
    });
  }
  function Ul(t, r) {
    var s = r, u = 0;
    do {
      var h = s.nextSibling;
      if (t.removeChild(s), h && h.nodeType === 8) if (s = h.data, s === "/$") {
        if (u === 0) {
          t.removeChild(h), Lo(r);
          return;
        }
        u--;
      } else s !== "$" && s !== "$?" && s !== "$!" || u++;
      s = h;
    } while (s);
    Lo(r);
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
  function Up(t) {
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
  var Vr = Math.random().toString(36).slice(2), Qt = "__reactFiber$" + Vr, Qo = "__reactProps$" + Vr, an = "__reactContainer$" + Vr, Hl = "__reactEvents$" + Vr, Dx = "__reactListeners$" + Vr, Nx = "__reactHandles$" + Vr;
  function nr(t) {
    var r = t[Qt];
    if (r) return r;
    for (var s = t.parentNode; s; ) {
      if (r = s[an] || s[Qt]) {
        if (s = r.alternate, r.child !== null || s !== null && s.child !== null) for (t = Up(t); t !== null; ) {
          if (s = t[Qt]) return s;
          t = Up(t);
        }
        return r;
      }
      t = s, s = t.parentNode;
    }
    return null;
  }
  function Xo(t) {
    return t = t[Qt] || t[an], !t || t.tag !== 5 && t.tag !== 6 && t.tag !== 13 && t.tag !== 3 ? null : t;
  }
  function zr(t) {
    if (t.tag === 5 || t.tag === 6) return t.stateNode;
    throw Error(o(33));
  }
  function us(t) {
    return t[Qo] || null;
  }
  var Wl = [], Br = -1;
  function En(t) {
    return { current: t };
  }
  function Re(t) {
    0 > Br || (t.current = Wl[Br], Wl[Br] = null, Br--);
  }
  function Ee(t, r) {
    Br++, Wl[Br] = t.current, t.current = r;
  }
  var Mn = {}, et = En(Mn), dt = En(!1), rr = Mn;
  function $r(t, r) {
    var s = t.type.contextTypes;
    if (!s) return Mn;
    var u = t.stateNode;
    if (u && u.__reactInternalMemoizedUnmaskedChildContext === r) return u.__reactInternalMemoizedMaskedChildContext;
    var h = {}, g;
    for (g in s) h[g] = r[g];
    return u && (t = t.stateNode, t.__reactInternalMemoizedUnmaskedChildContext = r, t.__reactInternalMemoizedMaskedChildContext = h), h;
  }
  function ft(t) {
    return t = t.childContextTypes, t != null;
  }
  function cs() {
    Re(dt), Re(et);
  }
  function Hp(t, r, s) {
    if (et.current !== Mn) throw Error(o(168));
    Ee(et, r), Ee(dt, s);
  }
  function Wp(t, r, s) {
    var u = t.stateNode;
    if (r = r.childContextTypes, typeof u.getChildContext != "function") return s;
    u = u.getChildContext();
    for (var h in u) if (!(h in r)) throw Error(o(108, Pe(t) || "Unknown", h));
    return Q({}, s, u);
  }
  function ds(t) {
    return t = (t = t.stateNode) && t.__reactInternalMemoizedMergedChildContext || Mn, rr = et.current, Ee(et, t), Ee(dt, dt.current), !0;
  }
  function Gp(t, r, s) {
    var u = t.stateNode;
    if (!u) throw Error(o(169));
    s ? (t = Wp(t, r, rr), u.__reactInternalMemoizedMergedChildContext = t, Re(dt), Re(et), Ee(et, t)) : Re(dt), Ee(dt, s);
  }
  var ln = null, fs = !1, Gl = !1;
  function Kp(t) {
    ln === null ? ln = [t] : ln.push(t);
  }
  function jx(t) {
    fs = !0, Kp(t);
  }
  function Rn() {
    if (!Gl && ln !== null) {
      Gl = !0;
      var t = 0, r = _e;
      try {
        var s = ln;
        for (_e = 1; t < s.length; t++) {
          var u = s[t];
          do
            u = u(!0);
          while (u !== null);
        }
        ln = null, fs = !1;
      } catch (h) {
        throw ln !== null && (ln = ln.slice(t + 1)), Qf(ml, Rn), h;
      } finally {
        _e = r, Gl = !1;
      }
    }
    return null;
  }
  var Ur = [], Hr = 0, ps = null, ms = 0, kt = [], At = 0, or = null, un = 1, cn = "";
  function ir(t, r) {
    Ur[Hr++] = ms, Ur[Hr++] = ps, ps = t, ms = r;
  }
  function Yp(t, r, s) {
    kt[At++] = un, kt[At++] = cn, kt[At++] = or, or = t;
    var u = un;
    t = cn;
    var h = 32 - It(u) - 1;
    u &= ~(1 << h), s += 1;
    var g = 32 - It(r) + h;
    if (30 < g) {
      var k = h - h % 5;
      g = (u & (1 << k) - 1).toString(32), u >>= k, h -= k, un = 1 << 32 - It(r) + h | s << h | u, cn = g + t;
    } else un = 1 << g | s << h | u, cn = t;
  }
  function Kl(t) {
    t.return !== null && (ir(t, 1), Yp(t, 1, 0));
  }
  function Yl(t) {
    for (; t === ps; ) ps = Ur[--Hr], Ur[Hr] = null, ms = Ur[--Hr], Ur[Hr] = null;
    for (; t === or; ) or = kt[--At], kt[At] = null, cn = kt[--At], kt[At] = null, un = kt[--At], kt[At] = null;
  }
  var wt = null, xt = null, Ne = !1, Ot = null;
  function Qp(t, r) {
    var s = Et(5, null, null, 0);
    s.elementType = "DELETED", s.stateNode = r, s.return = t, r = t.deletions, r === null ? (t.deletions = [s], t.flags |= 16) : r.push(s);
  }
  function Xp(t, r) {
    switch (t.tag) {
      case 5:
        var s = t.type;
        return r = r.nodeType !== 1 || s.toLowerCase() !== r.nodeName.toLowerCase() ? null : r, r !== null ? (t.stateNode = r, wt = t, xt = Pn(r.firstChild), !0) : !1;
      case 6:
        return r = t.pendingProps === "" || r.nodeType !== 3 ? null : r, r !== null ? (t.stateNode = r, wt = t, xt = null, !0) : !1;
      case 13:
        return r = r.nodeType !== 8 ? null : r, r !== null ? (s = or !== null ? { id: un, overflow: cn } : null, t.memoizedState = { dehydrated: r, treeContext: s, retryLane: 1073741824 }, s = Et(18, null, null, 0), s.stateNode = r, s.return = t, t.child = s, wt = t, xt = null, !0) : !1;
      default:
        return !1;
    }
  }
  function Ql(t) {
    return (t.mode & 1) !== 0 && (t.flags & 128) === 0;
  }
  function Xl(t) {
    if (Ne) {
      var r = xt;
      if (r) {
        var s = r;
        if (!Xp(t, r)) {
          if (Ql(t)) throw Error(o(418));
          r = Pn(s.nextSibling);
          var u = wt;
          r && Xp(t, r) ? Qp(u, s) : (t.flags = t.flags & -4097 | 2, Ne = !1, wt = t);
        }
      } else {
        if (Ql(t)) throw Error(o(418));
        t.flags = t.flags & -4097 | 2, Ne = !1, wt = t;
      }
    }
  }
  function Zp(t) {
    for (t = t.return; t !== null && t.tag !== 5 && t.tag !== 3 && t.tag !== 13; ) t = t.return;
    wt = t;
  }
  function hs(t) {
    if (t !== wt) return !1;
    if (!Ne) return Zp(t), Ne = !0, !1;
    var r;
    if ((r = t.tag !== 3) && !(r = t.tag !== 5) && (r = t.type, r = r !== "head" && r !== "body" && !Bl(t.type, t.memoizedProps)), r && (r = xt)) {
      if (Ql(t)) throw Jp(), Error(o(418));
      for (; r; ) Qp(t, r), r = Pn(r.nextSibling);
    }
    if (Zp(t), t.tag === 13) {
      if (t = t.memoizedState, t = t !== null ? t.dehydrated : null, !t) throw Error(o(317));
      e: {
        for (t = t.nextSibling, r = 0; t; ) {
          if (t.nodeType === 8) {
            var s = t.data;
            if (s === "/$") {
              if (r === 0) {
                xt = Pn(t.nextSibling);
                break e;
              }
              r--;
            } else s !== "$" && s !== "$!" && s !== "$?" || r++;
          }
          t = t.nextSibling;
        }
        xt = null;
      }
    } else xt = wt ? Pn(t.stateNode.nextSibling) : null;
    return !0;
  }
  function Jp() {
    for (var t = xt; t; ) t = Pn(t.nextSibling);
  }
  function Wr() {
    xt = wt = null, Ne = !1;
  }
  function Zl(t) {
    Ot === null ? Ot = [t] : Ot.push(t);
  }
  var Ix = D.ReactCurrentBatchConfig;
  function Zo(t, r, s) {
    if (t = s.ref, t !== null && typeof t != "function" && typeof t != "object") {
      if (s._owner) {
        if (s = s._owner, s) {
          if (s.tag !== 1) throw Error(o(309));
          var u = s.stateNode;
        }
        if (!u) throw Error(o(147, t));
        var h = u, g = "" + t;
        return r !== null && r.ref !== null && typeof r.ref == "function" && r.ref._stringRef === g ? r.ref : (r = function(k) {
          var P = h.refs;
          k === null ? delete P[g] : P[g] = k;
        }, r._stringRef = g, r);
      }
      if (typeof t != "string") throw Error(o(284));
      if (!s._owner) throw Error(o(290, t));
    }
    return t;
  }
  function ys(t, r) {
    throw t = Object.prototype.toString.call(r), Error(o(31, t === "[object Object]" ? "object with keys {" + Object.keys(r).join(", ") + "}" : t));
  }
  function qp(t) {
    var r = t._init;
    return r(t._payload);
  }
  function em(t) {
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
    function g(j, R, I) {
      return j.index = I, t ? (I = j.alternate, I !== null ? (I = I.index, I < R ? (j.flags |= 2, R) : I) : (j.flags |= 2, R)) : (j.flags |= 1048576, R);
    }
    function k(j) {
      return t && j.alternate === null && (j.flags |= 2), j;
    }
    function P(j, R, I, G) {
      return R === null || R.tag !== 6 ? (R = $u(I, j.mode, G), R.return = j, R) : (R = h(R, I), R.return = j, R);
    }
    function M(j, R, I, G) {
      var ie = I.type;
      return ie === H ? B(j, R, I.props.children, G, I.key) : R !== null && (R.elementType === ie || typeof ie == "object" && ie !== null && ie.$$typeof === ee && qp(ie) === R.type) ? (G = h(R, I.props), G.ref = Zo(j, R, I), G.return = j, G) : (G = zs(I.type, I.key, I.props, null, j.mode, G), G.ref = Zo(j, R, I), G.return = j, G);
    }
    function F(j, R, I, G) {
      return R === null || R.tag !== 4 || R.stateNode.containerInfo !== I.containerInfo || R.stateNode.implementation !== I.implementation ? (R = Uu(I, j.mode, G), R.return = j, R) : (R = h(R, I.children || []), R.return = j, R);
    }
    function B(j, R, I, G, ie) {
      return R === null || R.tag !== 7 ? (R = pr(I, j.mode, G, ie), R.return = j, R) : (R = h(R, I), R.return = j, R);
    }
    function U(j, R, I) {
      if (typeof R == "string" && R !== "" || typeof R == "number") return R = $u("" + R, j.mode, I), R.return = j, R;
      if (typeof R == "object" && R !== null) {
        switch (R.$$typeof) {
          case O:
            return I = zs(R.type, R.key, R.props, null, j.mode, I), I.ref = Zo(j, null, R), I.return = j, I;
          case W:
            return R = Uu(R, j.mode, I), R.return = j, R;
          case ee:
            var G = R._init;
            return U(j, G(R._payload), I);
        }
        if (bo(R) || J(R)) return R = pr(R, j.mode, I, null), R.return = j, R;
        ys(j, R);
      }
      return null;
    }
    function z(j, R, I, G) {
      var ie = R !== null ? R.key : null;
      if (typeof I == "string" && I !== "" || typeof I == "number") return ie !== null ? null : P(j, R, "" + I, G);
      if (typeof I == "object" && I !== null) {
        switch (I.$$typeof) {
          case O:
            return I.key === ie ? M(j, R, I, G) : null;
          case W:
            return I.key === ie ? F(j, R, I, G) : null;
          case ee:
            return ie = I._init, z(
              j,
              R,
              ie(I._payload),
              G
            );
        }
        if (bo(I) || J(I)) return ie !== null ? null : B(j, R, I, G, null);
        ys(j, I);
      }
      return null;
    }
    function q(j, R, I, G, ie) {
      if (typeof G == "string" && G !== "" || typeof G == "number") return j = j.get(I) || null, P(R, j, "" + G, ie);
      if (typeof G == "object" && G !== null) {
        switch (G.$$typeof) {
          case O:
            return j = j.get(G.key === null ? I : G.key) || null, M(R, j, G, ie);
          case W:
            return j = j.get(G.key === null ? I : G.key) || null, F(R, j, G, ie);
          case ee:
            var ae = G._init;
            return q(j, R, I, ae(G._payload), ie);
        }
        if (bo(G) || J(G)) return j = j.get(I) || null, B(R, j, G, ie, null);
        ys(R, G);
      }
      return null;
    }
    function ne(j, R, I, G) {
      for (var ie = null, ae = null, le = R, ue = R = 0, Ke = null; le !== null && ue < I.length; ue++) {
        le.index > ue ? (Ke = le, le = null) : Ke = le.sibling;
        var Se = z(j, le, I[ue], G);
        if (Se === null) {
          le === null && (le = Ke);
          break;
        }
        t && le && Se.alternate === null && r(j, le), R = g(Se, R, ue), ae === null ? ie = Se : ae.sibling = Se, ae = Se, le = Ke;
      }
      if (ue === I.length) return s(j, le), Ne && ir(j, ue), ie;
      if (le === null) {
        for (; ue < I.length; ue++) le = U(j, I[ue], G), le !== null && (R = g(le, R, ue), ae === null ? ie = le : ae.sibling = le, ae = le);
        return Ne && ir(j, ue), ie;
      }
      for (le = u(j, le); ue < I.length; ue++) Ke = q(le, j, ue, I[ue], G), Ke !== null && (t && Ke.alternate !== null && le.delete(Ke.key === null ? ue : Ke.key), R = g(Ke, R, ue), ae === null ? ie = Ke : ae.sibling = Ke, ae = Ke);
      return t && le.forEach(function(zn) {
        return r(j, zn);
      }), Ne && ir(j, ue), ie;
    }
    function oe(j, R, I, G) {
      var ie = J(I);
      if (typeof ie != "function") throw Error(o(150));
      if (I = ie.call(I), I == null) throw Error(o(151));
      for (var ae = ie = null, le = R, ue = R = 0, Ke = null, Se = I.next(); le !== null && !Se.done; ue++, Se = I.next()) {
        le.index > ue ? (Ke = le, le = null) : Ke = le.sibling;
        var zn = z(j, le, Se.value, G);
        if (zn === null) {
          le === null && (le = Ke);
          break;
        }
        t && le && zn.alternate === null && r(j, le), R = g(zn, R, ue), ae === null ? ie = zn : ae.sibling = zn, ae = zn, le = Ke;
      }
      if (Se.done) return s(
        j,
        le
      ), Ne && ir(j, ue), ie;
      if (le === null) {
        for (; !Se.done; ue++, Se = I.next()) Se = U(j, Se.value, G), Se !== null && (R = g(Se, R, ue), ae === null ? ie = Se : ae.sibling = Se, ae = Se);
        return Ne && ir(j, ue), ie;
      }
      for (le = u(j, le); !Se.done; ue++, Se = I.next()) Se = q(le, j, ue, Se.value, G), Se !== null && (t && Se.alternate !== null && le.delete(Se.key === null ? ue : Se.key), R = g(Se, R, ue), ae === null ? ie = Se : ae.sibling = Se, ae = Se);
      return t && le.forEach(function(m1) {
        return r(j, m1);
      }), Ne && ir(j, ue), ie;
    }
    function Ve(j, R, I, G) {
      if (typeof I == "object" && I !== null && I.type === H && I.key === null && (I = I.props.children), typeof I == "object" && I !== null) {
        switch (I.$$typeof) {
          case O:
            e: {
              for (var ie = I.key, ae = R; ae !== null; ) {
                if (ae.key === ie) {
                  if (ie = I.type, ie === H) {
                    if (ae.tag === 7) {
                      s(j, ae.sibling), R = h(ae, I.props.children), R.return = j, j = R;
                      break e;
                    }
                  } else if (ae.elementType === ie || typeof ie == "object" && ie !== null && ie.$$typeof === ee && qp(ie) === ae.type) {
                    s(j, ae.sibling), R = h(ae, I.props), R.ref = Zo(j, ae, I), R.return = j, j = R;
                    break e;
                  }
                  s(j, ae);
                  break;
                } else r(j, ae);
                ae = ae.sibling;
              }
              I.type === H ? (R = pr(I.props.children, j.mode, G, I.key), R.return = j, j = R) : (G = zs(I.type, I.key, I.props, null, j.mode, G), G.ref = Zo(j, R, I), G.return = j, j = G);
            }
            return k(j);
          case W:
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
              R = Uu(I, j.mode, G), R.return = j, j = R;
            }
            return k(j);
          case ee:
            return ae = I._init, Ve(j, R, ae(I._payload), G);
        }
        if (bo(I)) return ne(j, R, I, G);
        if (J(I)) return oe(j, R, I, G);
        ys(j, I);
      }
      return typeof I == "string" && I !== "" || typeof I == "number" ? (I = "" + I, R !== null && R.tag === 6 ? (s(j, R.sibling), R = h(R, I), R.return = j, j = R) : (s(j, R), R = $u(I, j.mode, G), R.return = j, j = R), k(j)) : s(j, R);
    }
    return Ve;
  }
  var Gr = em(!0), tm = em(!1), gs = En(null), vs = null, Kr = null, Jl = null;
  function ql() {
    Jl = Kr = vs = null;
  }
  function eu(t) {
    var r = gs.current;
    Re(gs), t._currentValue = r;
  }
  function tu(t, r, s) {
    for (; t !== null; ) {
      var u = t.alternate;
      if ((t.childLanes & r) !== r ? (t.childLanes |= r, u !== null && (u.childLanes |= r)) : u !== null && (u.childLanes & r) !== r && (u.childLanes |= r), t === s) break;
      t = t.return;
    }
  }
  function Yr(t, r) {
    vs = t, Jl = Kr = null, t = t.dependencies, t !== null && t.firstContext !== null && ((t.lanes & r) !== 0 && (pt = !0), t.firstContext = null);
  }
  function bt(t) {
    var r = t._currentValue;
    if (Jl !== t) if (t = { context: t, memoizedValue: r, next: null }, Kr === null) {
      if (vs === null) throw Error(o(308));
      Kr = t, vs.dependencies = { lanes: 0, firstContext: t };
    } else Kr = Kr.next = t;
    return r;
  }
  var sr = null;
  function nu(t) {
    sr === null ? sr = [t] : sr.push(t);
  }
  function nm(t, r, s, u) {
    var h = r.interleaved;
    return h === null ? (s.next = s, nu(r)) : (s.next = h.next, h.next = s), r.interleaved = s, dn(t, u);
  }
  function dn(t, r) {
    t.lanes |= r;
    var s = t.alternate;
    for (s !== null && (s.lanes |= r), s = t, t = t.return; t !== null; ) t.childLanes |= r, s = t.alternate, s !== null && (s.childLanes |= r), s = t, t = t.return;
    return s.tag === 3 ? s.stateNode : null;
  }
  var Dn = !1;
  function ru(t) {
    t.updateQueue = { baseState: t.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
  }
  function rm(t, r) {
    t = t.updateQueue, r.updateQueue === t && (r.updateQueue = { baseState: t.baseState, firstBaseUpdate: t.firstBaseUpdate, lastBaseUpdate: t.lastBaseUpdate, shared: t.shared, effects: t.effects });
  }
  function fn(t, r) {
    return { eventTime: t, lane: r, tag: 0, payload: null, callback: null, next: null };
  }
  function Nn(t, r, s) {
    var u = t.updateQueue;
    if (u === null) return null;
    if (u = u.shared, (he & 2) !== 0) {
      var h = u.pending;
      return h === null ? r.next = r : (r.next = h.next, h.next = r), u.pending = r, dn(t, s);
    }
    return h = u.interleaved, h === null ? (r.next = r, nu(u)) : (r.next = h.next, h.next = r), u.interleaved = r, dn(t, s);
  }
  function Ss(t, r, s) {
    if (r = r.updateQueue, r !== null && (r = r.shared, (s & 4194240) !== 0)) {
      var u = r.lanes;
      u &= t.pendingLanes, s |= u, r.lanes = s, gl(t, s);
    }
  }
  function om(t, r) {
    var s = t.updateQueue, u = t.alternate;
    if (u !== null && (u = u.updateQueue, s === u)) {
      var h = null, g = null;
      if (s = s.firstBaseUpdate, s !== null) {
        do {
          var k = { eventTime: s.eventTime, lane: s.lane, tag: s.tag, payload: s.payload, callback: s.callback, next: null };
          g === null ? h = g = k : g = g.next = k, s = s.next;
        } while (s !== null);
        g === null ? h = g = r : g = g.next = r;
      } else h = g = r;
      s = { baseState: u.baseState, firstBaseUpdate: h, lastBaseUpdate: g, shared: u.shared, effects: u.effects }, t.updateQueue = s;
      return;
    }
    t = s.lastBaseUpdate, t === null ? s.firstBaseUpdate = r : t.next = r, s.lastBaseUpdate = r;
  }
  function ws(t, r, s, u) {
    var h = t.updateQueue;
    Dn = !1;
    var g = h.firstBaseUpdate, k = h.lastBaseUpdate, P = h.shared.pending;
    if (P !== null) {
      h.shared.pending = null;
      var M = P, F = M.next;
      M.next = null, k === null ? g = F : k.next = F, k = M;
      var B = t.alternate;
      B !== null && (B = B.updateQueue, P = B.lastBaseUpdate, P !== k && (P === null ? B.firstBaseUpdate = F : P.next = F, B.lastBaseUpdate = M));
    }
    if (g !== null) {
      var U = h.baseState;
      k = 0, B = F = M = null, P = g;
      do {
        var z = P.lane, q = P.eventTime;
        if ((u & z) === z) {
          B !== null && (B = B.next = {
            eventTime: q,
            lane: 0,
            tag: P.tag,
            payload: P.payload,
            callback: P.callback,
            next: null
          });
          e: {
            var ne = t, oe = P;
            switch (z = r, q = s, oe.tag) {
              case 1:
                if (ne = oe.payload, typeof ne == "function") {
                  U = ne.call(q, U, z);
                  break e;
                }
                U = ne;
                break e;
              case 3:
                ne.flags = ne.flags & -65537 | 128;
              case 0:
                if (ne = oe.payload, z = typeof ne == "function" ? ne.call(q, U, z) : ne, z == null) break e;
                U = Q({}, U, z);
                break e;
              case 2:
                Dn = !0;
            }
          }
          P.callback !== null && P.lane !== 0 && (t.flags |= 64, z = h.effects, z === null ? h.effects = [P] : z.push(P));
        } else q = { eventTime: q, lane: z, tag: P.tag, payload: P.payload, callback: P.callback, next: null }, B === null ? (F = B = q, M = U) : B = B.next = q, k |= z;
        if (P = P.next, P === null) {
          if (P = h.shared.pending, P === null) break;
          z = P, P = z.next, z.next = null, h.lastBaseUpdate = z, h.shared.pending = null;
        }
      } while (!0);
      if (B === null && (M = U), h.baseState = M, h.firstBaseUpdate = F, h.lastBaseUpdate = B, r = h.shared.interleaved, r !== null) {
        h = r;
        do
          k |= h.lane, h = h.next;
        while (h !== r);
      } else g === null && (h.shared.lanes = 0);
      ur |= k, t.lanes = k, t.memoizedState = U;
    }
  }
  function im(t, r, s) {
    if (t = r.effects, r.effects = null, t !== null) for (r = 0; r < t.length; r++) {
      var u = t[r], h = u.callback;
      if (h !== null) {
        if (u.callback = null, u = s, typeof h != "function") throw Error(o(191, h));
        h.call(u);
      }
    }
  }
  var Jo = {}, Xt = En(Jo), qo = En(Jo), ei = En(Jo);
  function ar(t) {
    if (t === Jo) throw Error(o(174));
    return t;
  }
  function ou(t, r) {
    switch (Ee(ei, r), Ee(qo, t), Ee(Xt, Jo), t = r.nodeType, t) {
      case 9:
      case 11:
        r = (r = r.documentElement) ? r.namespaceURI : il(null, "");
        break;
      default:
        t = t === 8 ? r.parentNode : r, r = t.namespaceURI || null, t = t.tagName, r = il(r, t);
    }
    Re(Xt), Ee(Xt, r);
  }
  function Qr() {
    Re(Xt), Re(qo), Re(ei);
  }
  function sm(t) {
    ar(ei.current);
    var r = ar(Xt.current), s = il(r, t.type);
    r !== s && (Ee(qo, t), Ee(Xt, s));
  }
  function iu(t) {
    qo.current === t && (Re(Xt), Re(qo));
  }
  var je = En(0);
  function xs(t) {
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
  var su = [];
  function au() {
    for (var t = 0; t < su.length; t++) su[t]._workInProgressVersionPrimary = null;
    su.length = 0;
  }
  var _s = D.ReactCurrentDispatcher, lu = D.ReactCurrentBatchConfig, lr = 0, Ie = null, $e = null, We = null, Ts = !1, ti = !1, ni = 0, Fx = 0;
  function tt() {
    throw Error(o(321));
  }
  function uu(t, r) {
    if (r === null) return !1;
    for (var s = 0; s < r.length && s < t.length; s++) if (!Ft(t[s], r[s])) return !1;
    return !0;
  }
  function cu(t, r, s, u, h, g) {
    if (lr = g, Ie = r, r.memoizedState = null, r.updateQueue = null, r.lanes = 0, _s.current = t === null || t.memoizedState === null ? zx : Bx, t = s(u, h), ti) {
      g = 0;
      do {
        if (ti = !1, ni = 0, 25 <= g) throw Error(o(301));
        g += 1, We = $e = null, r.updateQueue = null, _s.current = $x, t = s(u, h);
      } while (ti);
    }
    if (_s.current = bs, r = $e !== null && $e.next !== null, lr = 0, We = $e = Ie = null, Ts = !1, r) throw Error(o(300));
    return t;
  }
  function du() {
    var t = ni !== 0;
    return ni = 0, t;
  }
  function Zt() {
    var t = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
    return We === null ? Ie.memoizedState = We = t : We = We.next = t, We;
  }
  function Ct() {
    if ($e === null) {
      var t = Ie.alternate;
      t = t !== null ? t.memoizedState : null;
    } else t = $e.next;
    var r = We === null ? Ie.memoizedState : We.next;
    if (r !== null) We = r, $e = t;
    else {
      if (t === null) throw Error(o(310));
      $e = t, t = { memoizedState: $e.memoizedState, baseState: $e.baseState, baseQueue: $e.baseQueue, queue: $e.queue, next: null }, We === null ? Ie.memoizedState = We = t : We = We.next = t;
    }
    return We;
  }
  function ri(t, r) {
    return typeof r == "function" ? r(t) : r;
  }
  function fu(t) {
    var r = Ct(), s = r.queue;
    if (s === null) throw Error(o(311));
    s.lastRenderedReducer = t;
    var u = $e, h = u.baseQueue, g = s.pending;
    if (g !== null) {
      if (h !== null) {
        var k = h.next;
        h.next = g.next, g.next = k;
      }
      u.baseQueue = h = g, s.pending = null;
    }
    if (h !== null) {
      g = h.next, u = u.baseState;
      var P = k = null, M = null, F = g;
      do {
        var B = F.lane;
        if ((lr & B) === B) M !== null && (M = M.next = { lane: 0, action: F.action, hasEagerState: F.hasEagerState, eagerState: F.eagerState, next: null }), u = F.hasEagerState ? F.eagerState : t(u, F.action);
        else {
          var U = {
            lane: B,
            action: F.action,
            hasEagerState: F.hasEagerState,
            eagerState: F.eagerState,
            next: null
          };
          M === null ? (P = M = U, k = u) : M = M.next = U, Ie.lanes |= B, ur |= B;
        }
        F = F.next;
      } while (F !== null && F !== g);
      M === null ? k = u : M.next = P, Ft(u, r.memoizedState) || (pt = !0), r.memoizedState = u, r.baseState = k, r.baseQueue = M, s.lastRenderedState = u;
    }
    if (t = s.interleaved, t !== null) {
      h = t;
      do
        g = h.lane, Ie.lanes |= g, ur |= g, h = h.next;
      while (h !== t);
    } else h === null && (s.lanes = 0);
    return [r.memoizedState, s.dispatch];
  }
  function pu(t) {
    var r = Ct(), s = r.queue;
    if (s === null) throw Error(o(311));
    s.lastRenderedReducer = t;
    var u = s.dispatch, h = s.pending, g = r.memoizedState;
    if (h !== null) {
      s.pending = null;
      var k = h = h.next;
      do
        g = t(g, k.action), k = k.next;
      while (k !== h);
      Ft(g, r.memoizedState) || (pt = !0), r.memoizedState = g, r.baseQueue === null && (r.baseState = g), s.lastRenderedState = g;
    }
    return [g, u];
  }
  function am() {
  }
  function lm(t, r) {
    var s = Ie, u = Ct(), h = r(), g = !Ft(u.memoizedState, h);
    if (g && (u.memoizedState = h, pt = !0), u = u.queue, mu(dm.bind(null, s, u, t), [t]), u.getSnapshot !== r || g || We !== null && We.memoizedState.tag & 1) {
      if (s.flags |= 2048, oi(9, cm.bind(null, s, u, h, r), void 0, null), Ge === null) throw Error(o(349));
      (lr & 30) !== 0 || um(s, r, h);
    }
    return h;
  }
  function um(t, r, s) {
    t.flags |= 16384, t = { getSnapshot: r, value: s }, r = Ie.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, Ie.updateQueue = r, r.stores = [t]) : (s = r.stores, s === null ? r.stores = [t] : s.push(t));
  }
  function cm(t, r, s, u) {
    r.value = s, r.getSnapshot = u, fm(r) && pm(t);
  }
  function dm(t, r, s) {
    return s(function() {
      fm(r) && pm(t);
    });
  }
  function fm(t) {
    var r = t.getSnapshot;
    t = t.value;
    try {
      var s = r();
      return !Ft(t, s);
    } catch {
      return !0;
    }
  }
  function pm(t) {
    var r = dn(t, 1);
    r !== null && Bt(r, t, 1, -1);
  }
  function mm(t) {
    var r = Zt();
    return typeof t == "function" && (t = t()), r.memoizedState = r.baseState = t, t = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: ri, lastRenderedState: t }, r.queue = t, t = t.dispatch = Vx.bind(null, Ie, t), [r.memoizedState, t];
  }
  function oi(t, r, s, u) {
    return t = { tag: t, create: r, destroy: s, deps: u, next: null }, r = Ie.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, Ie.updateQueue = r, r.lastEffect = t.next = t) : (s = r.lastEffect, s === null ? r.lastEffect = t.next = t : (u = s.next, s.next = t, t.next = u, r.lastEffect = t)), t;
  }
  function hm() {
    return Ct().memoizedState;
  }
  function ks(t, r, s, u) {
    var h = Zt();
    Ie.flags |= t, h.memoizedState = oi(1 | r, s, void 0, u === void 0 ? null : u);
  }
  function As(t, r, s, u) {
    var h = Ct();
    u = u === void 0 ? null : u;
    var g = void 0;
    if ($e !== null) {
      var k = $e.memoizedState;
      if (g = k.destroy, u !== null && uu(u, k.deps)) {
        h.memoizedState = oi(r, s, g, u);
        return;
      }
    }
    Ie.flags |= t, h.memoizedState = oi(1 | r, s, g, u);
  }
  function ym(t, r) {
    return ks(8390656, 8, t, r);
  }
  function mu(t, r) {
    return As(2048, 8, t, r);
  }
  function gm(t, r) {
    return As(4, 2, t, r);
  }
  function vm(t, r) {
    return As(4, 4, t, r);
  }
  function Sm(t, r) {
    if (typeof r == "function") return t = t(), r(t), function() {
      r(null);
    };
    if (r != null) return t = t(), r.current = t, function() {
      r.current = null;
    };
  }
  function wm(t, r, s) {
    return s = s != null ? s.concat([t]) : null, As(4, 4, Sm.bind(null, r, t), s);
  }
  function hu() {
  }
  function xm(t, r) {
    var s = Ct();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && uu(r, u[1]) ? u[0] : (s.memoizedState = [t, r], t);
  }
  function _m(t, r) {
    var s = Ct();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && uu(r, u[1]) ? u[0] : (t = t(), s.memoizedState = [t, r], t);
  }
  function Tm(t, r, s) {
    return (lr & 21) === 0 ? (t.baseState && (t.baseState = !1, pt = !0), t.memoizedState = s) : (Ft(s, r) || (s = qf(), Ie.lanes |= s, ur |= s, t.baseState = !0), r);
  }
  function Ox(t, r) {
    var s = _e;
    _e = s !== 0 && 4 > s ? s : 4, t(!0);
    var u = lu.transition;
    lu.transition = {};
    try {
      t(!1), r();
    } finally {
      _e = s, lu.transition = u;
    }
  }
  function km() {
    return Ct().memoizedState;
  }
  function Lx(t, r, s) {
    var u = On(t);
    if (s = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null }, Am(t)) bm(r, s);
    else if (s = nm(t, r, s, u), s !== null) {
      var h = st();
      Bt(s, t, u, h), Cm(s, r, u);
    }
  }
  function Vx(t, r, s) {
    var u = On(t), h = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null };
    if (Am(t)) bm(r, h);
    else {
      var g = t.alternate;
      if (t.lanes === 0 && (g === null || g.lanes === 0) && (g = r.lastRenderedReducer, g !== null)) try {
        var k = r.lastRenderedState, P = g(k, s);
        if (h.hasEagerState = !0, h.eagerState = P, Ft(P, k)) {
          var M = r.interleaved;
          M === null ? (h.next = h, nu(r)) : (h.next = M.next, M.next = h), r.interleaved = h;
          return;
        }
      } catch {
      } finally {
      }
      s = nm(t, r, h, u), s !== null && (h = st(), Bt(s, t, u, h), Cm(s, r, u));
    }
  }
  function Am(t) {
    var r = t.alternate;
    return t === Ie || r !== null && r === Ie;
  }
  function bm(t, r) {
    ti = Ts = !0;
    var s = t.pending;
    s === null ? r.next = r : (r.next = s.next, s.next = r), t.pending = r;
  }
  function Cm(t, r, s) {
    if ((s & 4194240) !== 0) {
      var u = r.lanes;
      u &= t.pendingLanes, s |= u, r.lanes = s, gl(t, s);
    }
  }
  var bs = { readContext: bt, useCallback: tt, useContext: tt, useEffect: tt, useImperativeHandle: tt, useInsertionEffect: tt, useLayoutEffect: tt, useMemo: tt, useReducer: tt, useRef: tt, useState: tt, useDebugValue: tt, useDeferredValue: tt, useTransition: tt, useMutableSource: tt, useSyncExternalStore: tt, useId: tt, unstable_isNewReconciler: !1 }, zx = { readContext: bt, useCallback: function(t, r) {
    return Zt().memoizedState = [t, r === void 0 ? null : r], t;
  }, useContext: bt, useEffect: ym, useImperativeHandle: function(t, r, s) {
    return s = s != null ? s.concat([t]) : null, ks(
      4194308,
      4,
      Sm.bind(null, r, t),
      s
    );
  }, useLayoutEffect: function(t, r) {
    return ks(4194308, 4, t, r);
  }, useInsertionEffect: function(t, r) {
    return ks(4, 2, t, r);
  }, useMemo: function(t, r) {
    var s = Zt();
    return r = r === void 0 ? null : r, t = t(), s.memoizedState = [t, r], t;
  }, useReducer: function(t, r, s) {
    var u = Zt();
    return r = s !== void 0 ? s(r) : r, u.memoizedState = u.baseState = r, t = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: t, lastRenderedState: r }, u.queue = t, t = t.dispatch = Lx.bind(null, Ie, t), [u.memoizedState, t];
  }, useRef: function(t) {
    var r = Zt();
    return t = { current: t }, r.memoizedState = t;
  }, useState: mm, useDebugValue: hu, useDeferredValue: function(t) {
    return Zt().memoizedState = t;
  }, useTransition: function() {
    var t = mm(!1), r = t[0];
    return t = Ox.bind(null, t[1]), Zt().memoizedState = t, [r, t];
  }, useMutableSource: function() {
  }, useSyncExternalStore: function(t, r, s) {
    var u = Ie, h = Zt();
    if (Ne) {
      if (s === void 0) throw Error(o(407));
      s = s();
    } else {
      if (s = r(), Ge === null) throw Error(o(349));
      (lr & 30) !== 0 || um(u, r, s);
    }
    h.memoizedState = s;
    var g = { value: s, getSnapshot: r };
    return h.queue = g, ym(dm.bind(
      null,
      u,
      g,
      t
    ), [t]), u.flags |= 2048, oi(9, cm.bind(null, u, g, s, r), void 0, null), s;
  }, useId: function() {
    var t = Zt(), r = Ge.identifierPrefix;
    if (Ne) {
      var s = cn, u = un;
      s = (u & ~(1 << 32 - It(u) - 1)).toString(32) + s, r = ":" + r + "R" + s, s = ni++, 0 < s && (r += "H" + s.toString(32)), r += ":";
    } else s = Fx++, r = ":" + r + "r" + s.toString(32) + ":";
    return t.memoizedState = r;
  }, unstable_isNewReconciler: !1 }, Bx = {
    readContext: bt,
    useCallback: xm,
    useContext: bt,
    useEffect: mu,
    useImperativeHandle: wm,
    useInsertionEffect: gm,
    useLayoutEffect: vm,
    useMemo: _m,
    useReducer: fu,
    useRef: hm,
    useState: function() {
      return fu(ri);
    },
    useDebugValue: hu,
    useDeferredValue: function(t) {
      var r = Ct();
      return Tm(r, $e.memoizedState, t);
    },
    useTransition: function() {
      var t = fu(ri)[0], r = Ct().memoizedState;
      return [t, r];
    },
    useMutableSource: am,
    useSyncExternalStore: lm,
    useId: km,
    unstable_isNewReconciler: !1
  }, $x = { readContext: bt, useCallback: xm, useContext: bt, useEffect: mu, useImperativeHandle: wm, useInsertionEffect: gm, useLayoutEffect: vm, useMemo: _m, useReducer: pu, useRef: hm, useState: function() {
    return pu(ri);
  }, useDebugValue: hu, useDeferredValue: function(t) {
    var r = Ct();
    return $e === null ? r.memoizedState = t : Tm(r, $e.memoizedState, t);
  }, useTransition: function() {
    var t = pu(ri)[0], r = Ct().memoizedState;
    return [t, r];
  }, useMutableSource: am, useSyncExternalStore: lm, useId: km, unstable_isNewReconciler: !1 };
  function Lt(t, r) {
    if (t && t.defaultProps) {
      r = Q({}, r), t = t.defaultProps;
      for (var s in t) r[s] === void 0 && (r[s] = t[s]);
      return r;
    }
    return r;
  }
  function yu(t, r, s, u) {
    r = t.memoizedState, s = s(u, r), s = s == null ? r : Q({}, r, s), t.memoizedState = s, t.lanes === 0 && (t.updateQueue.baseState = s);
  }
  var Cs = { isMounted: function(t) {
    return (t = t._reactInternals) ? tr(t) === t : !1;
  }, enqueueSetState: function(t, r, s) {
    t = t._reactInternals;
    var u = st(), h = On(t), g = fn(u, h);
    g.payload = r, s != null && (g.callback = s), r = Nn(t, g, h), r !== null && (Bt(r, t, h, u), Ss(r, t, h));
  }, enqueueReplaceState: function(t, r, s) {
    t = t._reactInternals;
    var u = st(), h = On(t), g = fn(u, h);
    g.tag = 1, g.payload = r, s != null && (g.callback = s), r = Nn(t, g, h), r !== null && (Bt(r, t, h, u), Ss(r, t, h));
  }, enqueueForceUpdate: function(t, r) {
    t = t._reactInternals;
    var s = st(), u = On(t), h = fn(s, u);
    h.tag = 2, r != null && (h.callback = r), r = Nn(t, h, u), r !== null && (Bt(r, t, u, s), Ss(r, t, u));
  } };
  function Pm(t, r, s, u, h, g, k) {
    return t = t.stateNode, typeof t.shouldComponentUpdate == "function" ? t.shouldComponentUpdate(u, g, k) : r.prototype && r.prototype.isPureReactComponent ? !Ho(s, u) || !Ho(h, g) : !0;
  }
  function Em(t, r, s) {
    var u = !1, h = Mn, g = r.contextType;
    return typeof g == "object" && g !== null ? g = bt(g) : (h = ft(r) ? rr : et.current, u = r.contextTypes, g = (u = u != null) ? $r(t, h) : Mn), r = new r(s, g), t.memoizedState = r.state !== null && r.state !== void 0 ? r.state : null, r.updater = Cs, t.stateNode = r, r._reactInternals = t, u && (t = t.stateNode, t.__reactInternalMemoizedUnmaskedChildContext = h, t.__reactInternalMemoizedMaskedChildContext = g), r;
  }
  function Mm(t, r, s, u) {
    t = r.state, typeof r.componentWillReceiveProps == "function" && r.componentWillReceiveProps(s, u), typeof r.UNSAFE_componentWillReceiveProps == "function" && r.UNSAFE_componentWillReceiveProps(s, u), r.state !== t && Cs.enqueueReplaceState(r, r.state, null);
  }
  function gu(t, r, s, u) {
    var h = t.stateNode;
    h.props = s, h.state = t.memoizedState, h.refs = {}, ru(t);
    var g = r.contextType;
    typeof g == "object" && g !== null ? h.context = bt(g) : (g = ft(r) ? rr : et.current, h.context = $r(t, g)), h.state = t.memoizedState, g = r.getDerivedStateFromProps, typeof g == "function" && (yu(t, r, g, s), h.state = t.memoizedState), typeof r.getDerivedStateFromProps == "function" || typeof h.getSnapshotBeforeUpdate == "function" || typeof h.UNSAFE_componentWillMount != "function" && typeof h.componentWillMount != "function" || (r = h.state, typeof h.componentWillMount == "function" && h.componentWillMount(), typeof h.UNSAFE_componentWillMount == "function" && h.UNSAFE_componentWillMount(), r !== h.state && Cs.enqueueReplaceState(h, h.state, null), ws(t, s, h, u), h.state = t.memoizedState), typeof h.componentDidMount == "function" && (t.flags |= 4194308);
  }
  function Xr(t, r) {
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
  function vu(t, r, s) {
    return { value: t, source: null, stack: s ?? null, digest: r ?? null };
  }
  function Su(t, r) {
    try {
      console.error(r.value);
    } catch (s) {
      setTimeout(function() {
        throw s;
      });
    }
  }
  var Ux = typeof WeakMap == "function" ? WeakMap : Map;
  function Rm(t, r, s) {
    s = fn(-1, s), s.tag = 3, s.payload = { element: null };
    var u = r.value;
    return s.callback = function() {
      js || (js = !0, ju = u), Su(t, r);
    }, s;
  }
  function Dm(t, r, s) {
    s = fn(-1, s), s.tag = 3;
    var u = t.type.getDerivedStateFromError;
    if (typeof u == "function") {
      var h = r.value;
      s.payload = function() {
        return u(h);
      }, s.callback = function() {
        Su(t, r);
      };
    }
    var g = t.stateNode;
    return g !== null && typeof g.componentDidCatch == "function" && (s.callback = function() {
      Su(t, r), typeof u != "function" && (In === null ? In = /* @__PURE__ */ new Set([this]) : In.add(this));
      var k = r.stack;
      this.componentDidCatch(r.value, { componentStack: k !== null ? k : "" });
    }), s;
  }
  function Nm(t, r, s) {
    var u = t.pingCache;
    if (u === null) {
      u = t.pingCache = new Ux();
      var h = /* @__PURE__ */ new Set();
      u.set(r, h);
    } else h = u.get(r), h === void 0 && (h = /* @__PURE__ */ new Set(), u.set(r, h));
    h.has(s) || (h.add(s), t = r1.bind(null, t, r, s), r.then(t, t));
  }
  function jm(t) {
    do {
      var r;
      if ((r = t.tag === 13) && (r = t.memoizedState, r = r !== null ? r.dehydrated !== null : !0), r) return t;
      t = t.return;
    } while (t !== null);
    return null;
  }
  function Im(t, r, s, u, h) {
    return (t.mode & 1) === 0 ? (t === r ? t.flags |= 65536 : (t.flags |= 128, s.flags |= 131072, s.flags &= -52805, s.tag === 1 && (s.alternate === null ? s.tag = 17 : (r = fn(-1, 1), r.tag = 2, Nn(s, r, 1))), s.lanes |= 1), t) : (t.flags |= 65536, t.lanes = h, t);
  }
  var Hx = D.ReactCurrentOwner, pt = !1;
  function it(t, r, s, u) {
    r.child = t === null ? tm(r, null, s, u) : Gr(r, t.child, s, u);
  }
  function Fm(t, r, s, u, h) {
    s = s.render;
    var g = r.ref;
    return Yr(r, h), u = cu(t, r, s, u, g, h), s = du(), t !== null && !pt ? (r.updateQueue = t.updateQueue, r.flags &= -2053, t.lanes &= ~h, pn(t, r, h)) : (Ne && s && Kl(r), r.flags |= 1, it(t, r, u, h), r.child);
  }
  function Om(t, r, s, u, h) {
    if (t === null) {
      var g = s.type;
      return typeof g == "function" && !Bu(g) && g.defaultProps === void 0 && s.compare === null && s.defaultProps === void 0 ? (r.tag = 15, r.type = g, Lm(t, r, g, u, h)) : (t = zs(s.type, null, u, r, r.mode, h), t.ref = r.ref, t.return = r, r.child = t);
    }
    if (g = t.child, (t.lanes & h) === 0) {
      var k = g.memoizedProps;
      if (s = s.compare, s = s !== null ? s : Ho, s(k, u) && t.ref === r.ref) return pn(t, r, h);
    }
    return r.flags |= 1, t = Vn(g, u), t.ref = r.ref, t.return = r, r.child = t;
  }
  function Lm(t, r, s, u, h) {
    if (t !== null) {
      var g = t.memoizedProps;
      if (Ho(g, u) && t.ref === r.ref) if (pt = !1, r.pendingProps = u = g, (t.lanes & h) !== 0) (t.flags & 131072) !== 0 && (pt = !0);
      else return r.lanes = t.lanes, pn(t, r, h);
    }
    return wu(t, r, s, u, h);
  }
  function Vm(t, r, s) {
    var u = r.pendingProps, h = u.children, g = t !== null ? t.memoizedState : null;
    if (u.mode === "hidden") if ((r.mode & 1) === 0) r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, Ee(Jr, _t), _t |= s;
    else {
      if ((s & 1073741824) === 0) return t = g !== null ? g.baseLanes | s : s, r.lanes = r.childLanes = 1073741824, r.memoizedState = { baseLanes: t, cachePool: null, transitions: null }, r.updateQueue = null, Ee(Jr, _t), _t |= t, null;
      r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, u = g !== null ? g.baseLanes : s, Ee(Jr, _t), _t |= u;
    }
    else g !== null ? (u = g.baseLanes | s, r.memoizedState = null) : u = s, Ee(Jr, _t), _t |= u;
    return it(t, r, h, s), r.child;
  }
  function zm(t, r) {
    var s = r.ref;
    (t === null && s !== null || t !== null && t.ref !== s) && (r.flags |= 512, r.flags |= 2097152);
  }
  function wu(t, r, s, u, h) {
    var g = ft(s) ? rr : et.current;
    return g = $r(r, g), Yr(r, h), s = cu(t, r, s, u, g, h), u = du(), t !== null && !pt ? (r.updateQueue = t.updateQueue, r.flags &= -2053, t.lanes &= ~h, pn(t, r, h)) : (Ne && u && Kl(r), r.flags |= 1, it(t, r, s, h), r.child);
  }
  function Bm(t, r, s, u, h) {
    if (ft(s)) {
      var g = !0;
      ds(r);
    } else g = !1;
    if (Yr(r, h), r.stateNode === null) Es(t, r), Em(r, s, u), gu(r, s, u, h), u = !0;
    else if (t === null) {
      var k = r.stateNode, P = r.memoizedProps;
      k.props = P;
      var M = k.context, F = s.contextType;
      typeof F == "object" && F !== null ? F = bt(F) : (F = ft(s) ? rr : et.current, F = $r(r, F));
      var B = s.getDerivedStateFromProps, U = typeof B == "function" || typeof k.getSnapshotBeforeUpdate == "function";
      U || typeof k.UNSAFE_componentWillReceiveProps != "function" && typeof k.componentWillReceiveProps != "function" || (P !== u || M !== F) && Mm(r, k, u, F), Dn = !1;
      var z = r.memoizedState;
      k.state = z, ws(r, u, k, h), M = r.memoizedState, P !== u || z !== M || dt.current || Dn ? (typeof B == "function" && (yu(r, s, B, u), M = r.memoizedState), (P = Dn || Pm(r, s, P, u, z, M, F)) ? (U || typeof k.UNSAFE_componentWillMount != "function" && typeof k.componentWillMount != "function" || (typeof k.componentWillMount == "function" && k.componentWillMount(), typeof k.UNSAFE_componentWillMount == "function" && k.UNSAFE_componentWillMount()), typeof k.componentDidMount == "function" && (r.flags |= 4194308)) : (typeof k.componentDidMount == "function" && (r.flags |= 4194308), r.memoizedProps = u, r.memoizedState = M), k.props = u, k.state = M, k.context = F, u = P) : (typeof k.componentDidMount == "function" && (r.flags |= 4194308), u = !1);
    } else {
      k = r.stateNode, rm(t, r), P = r.memoizedProps, F = r.type === r.elementType ? P : Lt(r.type, P), k.props = F, U = r.pendingProps, z = k.context, M = s.contextType, typeof M == "object" && M !== null ? M = bt(M) : (M = ft(s) ? rr : et.current, M = $r(r, M));
      var q = s.getDerivedStateFromProps;
      (B = typeof q == "function" || typeof k.getSnapshotBeforeUpdate == "function") || typeof k.UNSAFE_componentWillReceiveProps != "function" && typeof k.componentWillReceiveProps != "function" || (P !== U || z !== M) && Mm(r, k, u, M), Dn = !1, z = r.memoizedState, k.state = z, ws(r, u, k, h);
      var ne = r.memoizedState;
      P !== U || z !== ne || dt.current || Dn ? (typeof q == "function" && (yu(r, s, q, u), ne = r.memoizedState), (F = Dn || Pm(r, s, F, u, z, ne, M) || !1) ? (B || typeof k.UNSAFE_componentWillUpdate != "function" && typeof k.componentWillUpdate != "function" || (typeof k.componentWillUpdate == "function" && k.componentWillUpdate(u, ne, M), typeof k.UNSAFE_componentWillUpdate == "function" && k.UNSAFE_componentWillUpdate(u, ne, M)), typeof k.componentDidUpdate == "function" && (r.flags |= 4), typeof k.getSnapshotBeforeUpdate == "function" && (r.flags |= 1024)) : (typeof k.componentDidUpdate != "function" || P === t.memoizedProps && z === t.memoizedState || (r.flags |= 4), typeof k.getSnapshotBeforeUpdate != "function" || P === t.memoizedProps && z === t.memoizedState || (r.flags |= 1024), r.memoizedProps = u, r.memoizedState = ne), k.props = u, k.state = ne, k.context = M, u = F) : (typeof k.componentDidUpdate != "function" || P === t.memoizedProps && z === t.memoizedState || (r.flags |= 4), typeof k.getSnapshotBeforeUpdate != "function" || P === t.memoizedProps && z === t.memoizedState || (r.flags |= 1024), u = !1);
    }
    return xu(t, r, s, u, g, h);
  }
  function xu(t, r, s, u, h, g) {
    zm(t, r);
    var k = (r.flags & 128) !== 0;
    if (!u && !k) return h && Gp(r, s, !1), pn(t, r, g);
    u = r.stateNode, Hx.current = r;
    var P = k && typeof s.getDerivedStateFromError != "function" ? null : u.render();
    return r.flags |= 1, t !== null && k ? (r.child = Gr(r, t.child, null, g), r.child = Gr(r, null, P, g)) : it(t, r, P, g), r.memoizedState = u.state, h && Gp(r, s, !0), r.child;
  }
  function $m(t) {
    var r = t.stateNode;
    r.pendingContext ? Hp(t, r.pendingContext, r.pendingContext !== r.context) : r.context && Hp(t, r.context, !1), ou(t, r.containerInfo);
  }
  function Um(t, r, s, u, h) {
    return Wr(), Zl(h), r.flags |= 256, it(t, r, s, u), r.child;
  }
  var _u = { dehydrated: null, treeContext: null, retryLane: 0 };
  function Tu(t) {
    return { baseLanes: t, cachePool: null, transitions: null };
  }
  function Hm(t, r, s) {
    var u = r.pendingProps, h = je.current, g = !1, k = (r.flags & 128) !== 0, P;
    if ((P = k) || (P = t !== null && t.memoizedState === null ? !1 : (h & 2) !== 0), P ? (g = !0, r.flags &= -129) : (t === null || t.memoizedState !== null) && (h |= 1), Ee(je, h & 1), t === null)
      return Xl(r), t = r.memoizedState, t !== null && (t = t.dehydrated, t !== null) ? ((r.mode & 1) === 0 ? r.lanes = 1 : t.data === "$!" ? r.lanes = 8 : r.lanes = 1073741824, null) : (k = u.children, t = u.fallback, g ? (u = r.mode, g = r.child, k = { mode: "hidden", children: k }, (u & 1) === 0 && g !== null ? (g.childLanes = 0, g.pendingProps = k) : g = Bs(k, u, 0, null), t = pr(t, u, s, null), g.return = r, t.return = r, g.sibling = t, r.child = g, r.child.memoizedState = Tu(s), r.memoizedState = _u, t) : ku(r, k));
    if (h = t.memoizedState, h !== null && (P = h.dehydrated, P !== null)) return Wx(t, r, k, u, P, h, s);
    if (g) {
      g = u.fallback, k = r.mode, h = t.child, P = h.sibling;
      var M = { mode: "hidden", children: u.children };
      return (k & 1) === 0 && r.child !== h ? (u = r.child, u.childLanes = 0, u.pendingProps = M, r.deletions = null) : (u = Vn(h, M), u.subtreeFlags = h.subtreeFlags & 14680064), P !== null ? g = Vn(P, g) : (g = pr(g, k, s, null), g.flags |= 2), g.return = r, u.return = r, u.sibling = g, r.child = u, u = g, g = r.child, k = t.child.memoizedState, k = k === null ? Tu(s) : { baseLanes: k.baseLanes | s, cachePool: null, transitions: k.transitions }, g.memoizedState = k, g.childLanes = t.childLanes & ~s, r.memoizedState = _u, u;
    }
    return g = t.child, t = g.sibling, u = Vn(g, { mode: "visible", children: u.children }), (r.mode & 1) === 0 && (u.lanes = s), u.return = r, u.sibling = null, t !== null && (s = r.deletions, s === null ? (r.deletions = [t], r.flags |= 16) : s.push(t)), r.child = u, r.memoizedState = null, u;
  }
  function ku(t, r) {
    return r = Bs({ mode: "visible", children: r }, t.mode, 0, null), r.return = t, t.child = r;
  }
  function Ps(t, r, s, u) {
    return u !== null && Zl(u), Gr(r, t.child, null, s), t = ku(r, r.pendingProps.children), t.flags |= 2, r.memoizedState = null, t;
  }
  function Wx(t, r, s, u, h, g, k) {
    if (s)
      return r.flags & 256 ? (r.flags &= -257, u = vu(Error(o(422))), Ps(t, r, k, u)) : r.memoizedState !== null ? (r.child = t.child, r.flags |= 128, null) : (g = u.fallback, h = r.mode, u = Bs({ mode: "visible", children: u.children }, h, 0, null), g = pr(g, h, k, null), g.flags |= 2, u.return = r, g.return = r, u.sibling = g, r.child = u, (r.mode & 1) !== 0 && Gr(r, t.child, null, k), r.child.memoizedState = Tu(k), r.memoizedState = _u, g);
    if ((r.mode & 1) === 0) return Ps(t, r, k, null);
    if (h.data === "$!") {
      if (u = h.nextSibling && h.nextSibling.dataset, u) var P = u.dgst;
      return u = P, g = Error(o(419)), u = vu(g, u, void 0), Ps(t, r, k, u);
    }
    if (P = (k & t.childLanes) !== 0, pt || P) {
      if (u = Ge, u !== null) {
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
        h = (h & (u.suspendedLanes | k)) !== 0 ? 0 : h, h !== 0 && h !== g.retryLane && (g.retryLane = h, dn(t, h), Bt(u, t, h, -1));
      }
      return zu(), u = vu(Error(o(421))), Ps(t, r, k, u);
    }
    return h.data === "$?" ? (r.flags |= 128, r.child = t.child, r = o1.bind(null, t), h._reactRetry = r, null) : (t = g.treeContext, xt = Pn(h.nextSibling), wt = r, Ne = !0, Ot = null, t !== null && (kt[At++] = un, kt[At++] = cn, kt[At++] = or, un = t.id, cn = t.overflow, or = r), r = ku(r, u.children), r.flags |= 4096, r);
  }
  function Wm(t, r, s) {
    t.lanes |= r;
    var u = t.alternate;
    u !== null && (u.lanes |= r), tu(t.return, r, s);
  }
  function Au(t, r, s, u, h) {
    var g = t.memoizedState;
    g === null ? t.memoizedState = { isBackwards: r, rendering: null, renderingStartTime: 0, last: u, tail: s, tailMode: h } : (g.isBackwards = r, g.rendering = null, g.renderingStartTime = 0, g.last = u, g.tail = s, g.tailMode = h);
  }
  function Gm(t, r, s) {
    var u = r.pendingProps, h = u.revealOrder, g = u.tail;
    if (it(t, r, u.children, s), u = je.current, (u & 2) !== 0) u = u & 1 | 2, r.flags |= 128;
    else {
      if (t !== null && (t.flags & 128) !== 0) e: for (t = r.child; t !== null; ) {
        if (t.tag === 13) t.memoizedState !== null && Wm(t, s, r);
        else if (t.tag === 19) Wm(t, s, r);
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
        for (s = r.child, h = null; s !== null; ) t = s.alternate, t !== null && xs(t) === null && (h = s), s = s.sibling;
        s = h, s === null ? (h = r.child, r.child = null) : (h = s.sibling, s.sibling = null), Au(r, !1, h, s, g);
        break;
      case "backwards":
        for (s = null, h = r.child, r.child = null; h !== null; ) {
          if (t = h.alternate, t !== null && xs(t) === null) {
            r.child = h;
            break;
          }
          t = h.sibling, h.sibling = s, s = h, h = t;
        }
        Au(r, !0, s, null, g);
        break;
      case "together":
        Au(r, !1, null, null, void 0);
        break;
      default:
        r.memoizedState = null;
    }
    return r.child;
  }
  function Es(t, r) {
    (r.mode & 1) === 0 && t !== null && (t.alternate = null, r.alternate = null, r.flags |= 2);
  }
  function pn(t, r, s) {
    if (t !== null && (r.dependencies = t.dependencies), ur |= r.lanes, (s & r.childLanes) === 0) return null;
    if (t !== null && r.child !== t.child) throw Error(o(153));
    if (r.child !== null) {
      for (t = r.child, s = Vn(t, t.pendingProps), r.child = s, s.return = r; t.sibling !== null; ) t = t.sibling, s = s.sibling = Vn(t, t.pendingProps), s.return = r;
      s.sibling = null;
    }
    return r.child;
  }
  function Gx(t, r, s) {
    switch (r.tag) {
      case 3:
        $m(r), Wr();
        break;
      case 5:
        sm(r);
        break;
      case 1:
        ft(r.type) && ds(r);
        break;
      case 4:
        ou(r, r.stateNode.containerInfo);
        break;
      case 10:
        var u = r.type._context, h = r.memoizedProps.value;
        Ee(gs, u._currentValue), u._currentValue = h;
        break;
      case 13:
        if (u = r.memoizedState, u !== null)
          return u.dehydrated !== null ? (Ee(je, je.current & 1), r.flags |= 128, null) : (s & r.child.childLanes) !== 0 ? Hm(t, r, s) : (Ee(je, je.current & 1), t = pn(t, r, s), t !== null ? t.sibling : null);
        Ee(je, je.current & 1);
        break;
      case 19:
        if (u = (s & r.childLanes) !== 0, (t.flags & 128) !== 0) {
          if (u) return Gm(t, r, s);
          r.flags |= 128;
        }
        if (h = r.memoizedState, h !== null && (h.rendering = null, h.tail = null, h.lastEffect = null), Ee(je, je.current), u) break;
        return null;
      case 22:
      case 23:
        return r.lanes = 0, Vm(t, r, s);
    }
    return pn(t, r, s);
  }
  var Km, bu, Ym, Qm;
  Km = function(t, r) {
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
  }, bu = function() {
  }, Ym = function(t, r, s, u) {
    var h = t.memoizedProps;
    if (h !== u) {
      t = r.stateNode, ar(Xt.current);
      var g = null;
      switch (s) {
        case "input":
          h = tl(t, h), u = tl(t, u), g = [];
          break;
        case "select":
          h = Q({}, h, { value: void 0 }), u = Q({}, u, { value: void 0 }), g = [];
          break;
        case "textarea":
          h = ol(t, h), u = ol(t, u), g = [];
          break;
        default:
          typeof h.onClick != "function" && typeof u.onClick == "function" && (t.onclick = ls);
      }
      sl(s, u);
      var k;
      s = null;
      for (F in h) if (!u.hasOwnProperty(F) && h.hasOwnProperty(F) && h[F] != null) if (F === "style") {
        var P = h[F];
        for (k in P) P.hasOwnProperty(k) && (s || (s = {}), s[k] = "");
      } else F !== "dangerouslySetInnerHTML" && F !== "children" && F !== "suppressContentEditableWarning" && F !== "suppressHydrationWarning" && F !== "autoFocus" && (a.hasOwnProperty(F) ? g || (g = []) : (g = g || []).push(F, null));
      for (F in u) {
        var M = u[F];
        if (P = h != null ? h[F] : void 0, u.hasOwnProperty(F) && M !== P && (M != null || P != null)) if (F === "style") if (P) {
          for (k in P) !P.hasOwnProperty(k) || M && M.hasOwnProperty(k) || (s || (s = {}), s[k] = "");
          for (k in M) M.hasOwnProperty(k) && P[k] !== M[k] && (s || (s = {}), s[k] = M[k]);
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
  }, Qm = function(t, r, s, u) {
    s !== u && (r.flags |= 4);
  };
  function ii(t, r) {
    if (!Ne) switch (t.tailMode) {
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
  function nt(t) {
    var r = t.alternate !== null && t.alternate.child === t.child, s = 0, u = 0;
    if (r) for (var h = t.child; h !== null; ) s |= h.lanes | h.childLanes, u |= h.subtreeFlags & 14680064, u |= h.flags & 14680064, h.return = t, h = h.sibling;
    else for (h = t.child; h !== null; ) s |= h.lanes | h.childLanes, u |= h.subtreeFlags, u |= h.flags, h.return = t, h = h.sibling;
    return t.subtreeFlags |= u, t.childLanes = s, r;
  }
  function Kx(t, r, s) {
    var u = r.pendingProps;
    switch (Yl(r), r.tag) {
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
        return nt(r), null;
      case 1:
        return ft(r.type) && cs(), nt(r), null;
      case 3:
        return u = r.stateNode, Qr(), Re(dt), Re(et), au(), u.pendingContext && (u.context = u.pendingContext, u.pendingContext = null), (t === null || t.child === null) && (hs(r) ? r.flags |= 4 : t === null || t.memoizedState.isDehydrated && (r.flags & 256) === 0 || (r.flags |= 1024, Ot !== null && (Ou(Ot), Ot = null))), bu(t, r), nt(r), null;
      case 5:
        iu(r);
        var h = ar(ei.current);
        if (s = r.type, t !== null && r.stateNode != null) Ym(t, r, s, u, h), t.ref !== r.ref && (r.flags |= 512, r.flags |= 2097152);
        else {
          if (!u) {
            if (r.stateNode === null) throw Error(o(166));
            return nt(r), null;
          }
          if (t = ar(Xt.current), hs(r)) {
            u = r.stateNode, s = r.type;
            var g = r.memoizedProps;
            switch (u[Qt] = r, u[Qo] = g, t = (r.mode & 1) !== 0, s) {
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
                for (h = 0; h < Go.length; h++) Me(Go[h], u);
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
                Ef(u, g), Me("invalid", u);
                break;
              case "select":
                u._wrapperState = { wasMultiple: !!g.multiple }, Me("invalid", u);
                break;
              case "textarea":
                Df(u, g), Me("invalid", u);
            }
            sl(s, g), h = null;
            for (var k in g) if (g.hasOwnProperty(k)) {
              var P = g[k];
              k === "children" ? typeof P == "string" ? u.textContent !== P && (g.suppressHydrationWarning !== !0 && as(u.textContent, P, t), h = ["children", P]) : typeof P == "number" && u.textContent !== "" + P && (g.suppressHydrationWarning !== !0 && as(
                u.textContent,
                P,
                t
              ), h = ["children", "" + P]) : a.hasOwnProperty(k) && P != null && k === "onScroll" && Me("scroll", u);
            }
            switch (s) {
              case "input":
                Li(u), Rf(u, g, !0);
                break;
              case "textarea":
                Li(u), jf(u);
                break;
              case "select":
              case "option":
                break;
              default:
                typeof g.onClick == "function" && (u.onclick = ls);
            }
            u = h, r.updateQueue = u, u !== null && (r.flags |= 4);
          } else {
            k = h.nodeType === 9 ? h : h.ownerDocument, t === "http://www.w3.org/1999/xhtml" && (t = If(s)), t === "http://www.w3.org/1999/xhtml" ? s === "script" ? (t = k.createElement("div"), t.innerHTML = "<script><\/script>", t = t.removeChild(t.firstChild)) : typeof u.is == "string" ? t = k.createElement(s, { is: u.is }) : (t = k.createElement(s), s === "select" && (k = t, u.multiple ? k.multiple = !0 : u.size && (k.size = u.size))) : t = k.createElementNS(t, s), t[Qt] = r, t[Qo] = u, Km(t, r, !1, !1), r.stateNode = t;
            e: {
              switch (k = al(s, u), s) {
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
                  for (h = 0; h < Go.length; h++) Me(Go[h], t);
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
                  Ef(t, u), h = tl(t, u), Me("invalid", t);
                  break;
                case "option":
                  h = u;
                  break;
                case "select":
                  t._wrapperState = { wasMultiple: !!u.multiple }, h = Q({}, u, { value: void 0 }), Me("invalid", t);
                  break;
                case "textarea":
                  Df(t, u), h = ol(t, u), Me("invalid", t);
                  break;
                default:
                  h = u;
              }
              sl(s, h), P = h;
              for (g in P) if (P.hasOwnProperty(g)) {
                var M = P[g];
                g === "style" ? Lf(t, M) : g === "dangerouslySetInnerHTML" ? (M = M ? M.__html : void 0, M != null && Ff(t, M)) : g === "children" ? typeof M == "string" ? (s !== "textarea" || M !== "") && Co(t, M) : typeof M == "number" && Co(t, "" + M) : g !== "suppressContentEditableWarning" && g !== "suppressHydrationWarning" && g !== "autoFocus" && (a.hasOwnProperty(g) ? M != null && g === "onScroll" && Me("scroll", t) : M != null && E(t, g, M, k));
              }
              switch (s) {
                case "input":
                  Li(t), Rf(t, u, !1);
                  break;
                case "textarea":
                  Li(t), jf(t);
                  break;
                case "option":
                  u.value != null && t.setAttribute("value", "" + xe(u.value));
                  break;
                case "select":
                  t.multiple = !!u.multiple, g = u.value, g != null ? Mr(t, !!u.multiple, g, !1) : u.defaultValue != null && Mr(
                    t,
                    !!u.multiple,
                    u.defaultValue,
                    !0
                  );
                  break;
                default:
                  typeof h.onClick == "function" && (t.onclick = ls);
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
        return nt(r), null;
      case 6:
        if (t && r.stateNode != null) Qm(t, r, t.memoizedProps, u);
        else {
          if (typeof u != "string" && r.stateNode === null) throw Error(o(166));
          if (s = ar(ei.current), ar(Xt.current), hs(r)) {
            if (u = r.stateNode, s = r.memoizedProps, u[Qt] = r, (g = u.nodeValue !== s) && (t = wt, t !== null)) switch (t.tag) {
              case 3:
                as(u.nodeValue, s, (t.mode & 1) !== 0);
                break;
              case 5:
                t.memoizedProps.suppressHydrationWarning !== !0 && as(u.nodeValue, s, (t.mode & 1) !== 0);
            }
            g && (r.flags |= 4);
          } else u = (s.nodeType === 9 ? s : s.ownerDocument).createTextNode(u), u[Qt] = r, r.stateNode = u;
        }
        return nt(r), null;
      case 13:
        if (Re(je), u = r.memoizedState, t === null || t.memoizedState !== null && t.memoizedState.dehydrated !== null) {
          if (Ne && xt !== null && (r.mode & 1) !== 0 && (r.flags & 128) === 0) Jp(), Wr(), r.flags |= 98560, g = !1;
          else if (g = hs(r), u !== null && u.dehydrated !== null) {
            if (t === null) {
              if (!g) throw Error(o(318));
              if (g = r.memoizedState, g = g !== null ? g.dehydrated : null, !g) throw Error(o(317));
              g[Qt] = r;
            } else Wr(), (r.flags & 128) === 0 && (r.memoizedState = null), r.flags |= 4;
            nt(r), g = !1;
          } else Ot !== null && (Ou(Ot), Ot = null), g = !0;
          if (!g) return r.flags & 65536 ? r : null;
        }
        return (r.flags & 128) !== 0 ? (r.lanes = s, r) : (u = u !== null, u !== (t !== null && t.memoizedState !== null) && u && (r.child.flags |= 8192, (r.mode & 1) !== 0 && (t === null || (je.current & 1) !== 0 ? Ue === 0 && (Ue = 3) : zu())), r.updateQueue !== null && (r.flags |= 4), nt(r), null);
      case 4:
        return Qr(), bu(t, r), t === null && Ko(r.stateNode.containerInfo), nt(r), null;
      case 10:
        return eu(r.type._context), nt(r), null;
      case 17:
        return ft(r.type) && cs(), nt(r), null;
      case 19:
        if (Re(je), g = r.memoizedState, g === null) return nt(r), null;
        if (u = (r.flags & 128) !== 0, k = g.rendering, k === null) if (u) ii(g, !1);
        else {
          if (Ue !== 0 || t !== null && (t.flags & 128) !== 0) for (t = r.child; t !== null; ) {
            if (k = xs(t), k !== null) {
              for (r.flags |= 128, ii(g, !1), u = k.updateQueue, u !== null && (r.updateQueue = u, r.flags |= 4), r.subtreeFlags = 0, u = s, s = r.child; s !== null; ) g = s, t = u, g.flags &= 14680066, k = g.alternate, k === null ? (g.childLanes = 0, g.lanes = t, g.child = null, g.subtreeFlags = 0, g.memoizedProps = null, g.memoizedState = null, g.updateQueue = null, g.dependencies = null, g.stateNode = null) : (g.childLanes = k.childLanes, g.lanes = k.lanes, g.child = k.child, g.subtreeFlags = 0, g.deletions = null, g.memoizedProps = k.memoizedProps, g.memoizedState = k.memoizedState, g.updateQueue = k.updateQueue, g.type = k.type, t = k.dependencies, g.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }), s = s.sibling;
              return Ee(je, je.current & 1 | 2), r.child;
            }
            t = t.sibling;
          }
          g.tail !== null && Le() > qr && (r.flags |= 128, u = !0, ii(g, !1), r.lanes = 4194304);
        }
        else {
          if (!u) if (t = xs(k), t !== null) {
            if (r.flags |= 128, u = !0, s = t.updateQueue, s !== null && (r.updateQueue = s, r.flags |= 4), ii(g, !0), g.tail === null && g.tailMode === "hidden" && !k.alternate && !Ne) return nt(r), null;
          } else 2 * Le() - g.renderingStartTime > qr && s !== 1073741824 && (r.flags |= 128, u = !0, ii(g, !1), r.lanes = 4194304);
          g.isBackwards ? (k.sibling = r.child, r.child = k) : (s = g.last, s !== null ? s.sibling = k : r.child = k, g.last = k);
        }
        return g.tail !== null ? (r = g.tail, g.rendering = r, g.tail = r.sibling, g.renderingStartTime = Le(), r.sibling = null, s = je.current, Ee(je, u ? s & 1 | 2 : s & 1), r) : (nt(r), null);
      case 22:
      case 23:
        return Vu(), u = r.memoizedState !== null, t !== null && t.memoizedState !== null !== u && (r.flags |= 8192), u && (r.mode & 1) !== 0 ? (_t & 1073741824) !== 0 && (nt(r), r.subtreeFlags & 6 && (r.flags |= 8192)) : nt(r), null;
      case 24:
        return null;
      case 25:
        return null;
    }
    throw Error(o(156, r.tag));
  }
  function Yx(t, r) {
    switch (Yl(r), r.tag) {
      case 1:
        return ft(r.type) && cs(), t = r.flags, t & 65536 ? (r.flags = t & -65537 | 128, r) : null;
      case 3:
        return Qr(), Re(dt), Re(et), au(), t = r.flags, (t & 65536) !== 0 && (t & 128) === 0 ? (r.flags = t & -65537 | 128, r) : null;
      case 5:
        return iu(r), null;
      case 13:
        if (Re(je), t = r.memoizedState, t !== null && t.dehydrated !== null) {
          if (r.alternate === null) throw Error(o(340));
          Wr();
        }
        return t = r.flags, t & 65536 ? (r.flags = t & -65537 | 128, r) : null;
      case 19:
        return Re(je), null;
      case 4:
        return Qr(), null;
      case 10:
        return eu(r.type._context), null;
      case 22:
      case 23:
        return Vu(), null;
      case 24:
        return null;
      default:
        return null;
    }
  }
  var Ms = !1, rt = !1, Qx = typeof WeakSet == "function" ? WeakSet : Set, te = null;
  function Zr(t, r) {
    var s = t.ref;
    if (s !== null) if (typeof s == "function") try {
      s(null);
    } catch (u) {
      Oe(t, r, u);
    }
    else s.current = null;
  }
  function Cu(t, r, s) {
    try {
      s();
    } catch (u) {
      Oe(t, r, u);
    }
  }
  var Xm = !1;
  function Xx(t, r) {
    if (Vl = Xi, t = Pp(), Rl(t)) {
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
          var k = 0, P = -1, M = -1, F = 0, B = 0, U = t, z = null;
          t: for (; ; ) {
            for (var q; U !== s || h !== 0 && U.nodeType !== 3 || (P = k + h), U !== g || u !== 0 && U.nodeType !== 3 || (M = k + u), U.nodeType === 3 && (k += U.nodeValue.length), (q = U.firstChild) !== null; )
              z = U, U = q;
            for (; ; ) {
              if (U === t) break t;
              if (z === s && ++F === h && (P = k), z === g && ++B === u && (M = k), (q = U.nextSibling) !== null) break;
              U = z, z = U.parentNode;
            }
            U = q;
          }
          s = P === -1 || M === -1 ? null : { start: P, end: M };
        } else s = null;
      }
      s = s || { start: 0, end: 0 };
    } else s = null;
    for (zl = { focusedElem: t, selectionRange: s }, Xi = !1, te = r; te !== null; ) if (r = te, t = r.child, (r.subtreeFlags & 1028) !== 0 && t !== null) t.return = r, te = t;
    else for (; te !== null; ) {
      r = te;
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
      } catch (G) {
        Oe(r, r.return, G);
      }
      if (t = r.sibling, t !== null) {
        t.return = r.return, te = t;
        break;
      }
      te = r.return;
    }
    return ne = Xm, Xm = !1, ne;
  }
  function si(t, r, s) {
    var u = r.updateQueue;
    if (u = u !== null ? u.lastEffect : null, u !== null) {
      var h = u = u.next;
      do {
        if ((h.tag & t) === t) {
          var g = h.destroy;
          h.destroy = void 0, g !== void 0 && Cu(r, s, g);
        }
        h = h.next;
      } while (h !== u);
    }
  }
  function Rs(t, r) {
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
  function Pu(t) {
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
  function Zm(t) {
    var r = t.alternate;
    r !== null && (t.alternate = null, Zm(r)), t.child = null, t.deletions = null, t.sibling = null, t.tag === 5 && (r = t.stateNode, r !== null && (delete r[Qt], delete r[Qo], delete r[Hl], delete r[Dx], delete r[Nx])), t.stateNode = null, t.return = null, t.dependencies = null, t.memoizedProps = null, t.memoizedState = null, t.pendingProps = null, t.stateNode = null, t.updateQueue = null;
  }
  function Jm(t) {
    return t.tag === 5 || t.tag === 3 || t.tag === 4;
  }
  function qm(t) {
    e: for (; ; ) {
      for (; t.sibling === null; ) {
        if (t.return === null || Jm(t.return)) return null;
        t = t.return;
      }
      for (t.sibling.return = t.return, t = t.sibling; t.tag !== 5 && t.tag !== 6 && t.tag !== 18; ) {
        if (t.flags & 2 || t.child === null || t.tag === 4) continue e;
        t.child.return = t, t = t.child;
      }
      if (!(t.flags & 2)) return t.stateNode;
    }
  }
  function Eu(t, r, s) {
    var u = t.tag;
    if (u === 5 || u === 6) t = t.stateNode, r ? s.nodeType === 8 ? s.parentNode.insertBefore(t, r) : s.insertBefore(t, r) : (s.nodeType === 8 ? (r = s.parentNode, r.insertBefore(t, s)) : (r = s, r.appendChild(t)), s = s._reactRootContainer, s != null || r.onclick !== null || (r.onclick = ls));
    else if (u !== 4 && (t = t.child, t !== null)) for (Eu(t, r, s), t = t.sibling; t !== null; ) Eu(t, r, s), t = t.sibling;
  }
  function Mu(t, r, s) {
    var u = t.tag;
    if (u === 5 || u === 6) t = t.stateNode, r ? s.insertBefore(t, r) : s.appendChild(t);
    else if (u !== 4 && (t = t.child, t !== null)) for (Mu(t, r, s), t = t.sibling; t !== null; ) Mu(t, r, s), t = t.sibling;
  }
  var Xe = null, Vt = !1;
  function jn(t, r, s) {
    for (s = s.child; s !== null; ) eh(t, r, s), s = s.sibling;
  }
  function eh(t, r, s) {
    if (Yt && typeof Yt.onCommitFiberUnmount == "function") try {
      Yt.onCommitFiberUnmount(Hi, s);
    } catch {
    }
    switch (s.tag) {
      case 5:
        rt || Zr(s, r);
      case 6:
        var u = Xe, h = Vt;
        Xe = null, jn(t, r, s), Xe = u, Vt = h, Xe !== null && (Vt ? (t = Xe, s = s.stateNode, t.nodeType === 8 ? t.parentNode.removeChild(s) : t.removeChild(s)) : Xe.removeChild(s.stateNode));
        break;
      case 18:
        Xe !== null && (Vt ? (t = Xe, s = s.stateNode, t.nodeType === 8 ? Ul(t.parentNode, s) : t.nodeType === 1 && Ul(t, s), Lo(t)) : Ul(Xe, s.stateNode));
        break;
      case 4:
        u = Xe, h = Vt, Xe = s.stateNode.containerInfo, Vt = !0, jn(t, r, s), Xe = u, Vt = h;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        if (!rt && (u = s.updateQueue, u !== null && (u = u.lastEffect, u !== null))) {
          h = u = u.next;
          do {
            var g = h, k = g.destroy;
            g = g.tag, k !== void 0 && ((g & 2) !== 0 || (g & 4) !== 0) && Cu(s, r, k), h = h.next;
          } while (h !== u);
        }
        jn(t, r, s);
        break;
      case 1:
        if (!rt && (Zr(s, r), u = s.stateNode, typeof u.componentWillUnmount == "function")) try {
          u.props = s.memoizedProps, u.state = s.memoizedState, u.componentWillUnmount();
        } catch (P) {
          Oe(s, r, P);
        }
        jn(t, r, s);
        break;
      case 21:
        jn(t, r, s);
        break;
      case 22:
        s.mode & 1 ? (rt = (u = rt) || s.memoizedState !== null, jn(t, r, s), rt = u) : jn(t, r, s);
        break;
      default:
        jn(t, r, s);
    }
  }
  function th(t) {
    var r = t.updateQueue;
    if (r !== null) {
      t.updateQueue = null;
      var s = t.stateNode;
      s === null && (s = t.stateNode = new Qx()), r.forEach(function(u) {
        var h = i1.bind(null, t, u);
        s.has(u) || (s.add(u), u.then(h, h));
      });
    }
  }
  function zt(t, r) {
    var s = r.deletions;
    if (s !== null) for (var u = 0; u < s.length; u++) {
      var h = s[u];
      try {
        var g = t, k = r, P = k;
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
        eh(g, k, h), Xe = null, Vt = !1;
        var M = h.alternate;
        M !== null && (M.return = null), h.return = null;
      } catch (F) {
        Oe(h, r, F);
      }
    }
    if (r.subtreeFlags & 12854) for (r = r.child; r !== null; ) nh(r, t), r = r.sibling;
  }
  function nh(t, r) {
    var s = t.alternate, u = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (zt(r, t), Jt(t), u & 4) {
          try {
            si(3, t, t.return), Rs(3, t);
          } catch (oe) {
            Oe(t, t.return, oe);
          }
          try {
            si(5, t, t.return);
          } catch (oe) {
            Oe(t, t.return, oe);
          }
        }
        break;
      case 1:
        zt(r, t), Jt(t), u & 512 && s !== null && Zr(s, s.return);
        break;
      case 5:
        if (zt(r, t), Jt(t), u & 512 && s !== null && Zr(s, s.return), t.flags & 32) {
          var h = t.stateNode;
          try {
            Co(h, "");
          } catch (oe) {
            Oe(t, t.return, oe);
          }
        }
        if (u & 4 && (h = t.stateNode, h != null)) {
          var g = t.memoizedProps, k = s !== null ? s.memoizedProps : g, P = t.type, M = t.updateQueue;
          if (t.updateQueue = null, M !== null) try {
            P === "input" && g.type === "radio" && g.name != null && Mf(h, g), al(P, k);
            var F = al(P, g);
            for (k = 0; k < M.length; k += 2) {
              var B = M[k], U = M[k + 1];
              B === "style" ? Lf(h, U) : B === "dangerouslySetInnerHTML" ? Ff(h, U) : B === "children" ? Co(h, U) : E(h, B, U, F);
            }
            switch (P) {
              case "input":
                nl(h, g);
                break;
              case "textarea":
                Nf(h, g);
                break;
              case "select":
                var z = h._wrapperState.wasMultiple;
                h._wrapperState.wasMultiple = !!g.multiple;
                var q = g.value;
                q != null ? Mr(h, !!g.multiple, q, !1) : z !== !!g.multiple && (g.defaultValue != null ? Mr(
                  h,
                  !!g.multiple,
                  g.defaultValue,
                  !0
                ) : Mr(h, !!g.multiple, g.multiple ? [] : "", !1));
            }
            h[Qo] = g;
          } catch (oe) {
            Oe(t, t.return, oe);
          }
        }
        break;
      case 6:
        if (zt(r, t), Jt(t), u & 4) {
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
        if (zt(r, t), Jt(t), u & 4 && s !== null && s.memoizedState.isDehydrated) try {
          Lo(r.containerInfo);
        } catch (oe) {
          Oe(t, t.return, oe);
        }
        break;
      case 4:
        zt(r, t), Jt(t);
        break;
      case 13:
        zt(r, t), Jt(t), h = t.child, h.flags & 8192 && (g = h.memoizedState !== null, h.stateNode.isHidden = g, !g || h.alternate !== null && h.alternate.memoizedState !== null || (Nu = Le())), u & 4 && th(t);
        break;
      case 22:
        if (B = s !== null && s.memoizedState !== null, t.mode & 1 ? (rt = (F = rt) || B, zt(r, t), rt = F) : zt(r, t), Jt(t), u & 8192) {
          if (F = t.memoizedState !== null, (t.stateNode.isHidden = F) && !B && (t.mode & 1) !== 0) for (te = t, B = t.child; B !== null; ) {
            for (U = te = B; te !== null; ) {
              switch (z = te, q = z.child, z.tag) {
                case 0:
                case 11:
                case 14:
                case 15:
                  si(4, z, z.return);
                  break;
                case 1:
                  Zr(z, z.return);
                  var ne = z.stateNode;
                  if (typeof ne.componentWillUnmount == "function") {
                    u = z, s = z.return;
                    try {
                      r = u, ne.props = r.memoizedProps, ne.state = r.memoizedState, ne.componentWillUnmount();
                    } catch (oe) {
                      Oe(u, s, oe);
                    }
                  }
                  break;
                case 5:
                  Zr(z, z.return);
                  break;
                case 22:
                  if (z.memoizedState !== null) {
                    ih(U);
                    continue;
                  }
              }
              q !== null ? (q.return = z, te = q) : ih(U);
            }
            B = B.sibling;
          }
          e: for (B = null, U = t; ; ) {
            if (U.tag === 5) {
              if (B === null) {
                B = U;
                try {
                  h = U.stateNode, F ? (g = h.style, typeof g.setProperty == "function" ? g.setProperty("display", "none", "important") : g.display = "none") : (P = U.stateNode, M = U.memoizedProps.style, k = M != null && M.hasOwnProperty("display") ? M.display : null, P.style.display = Of("display", k));
                } catch (oe) {
                  Oe(t, t.return, oe);
                }
              }
            } else if (U.tag === 6) {
              if (B === null) try {
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
              B === U && (B = null), U = U.return;
            }
            B === U && (B = null), U.sibling.return = U.return, U = U.sibling;
          }
        }
        break;
      case 19:
        zt(r, t), Jt(t), u & 4 && th(t);
        break;
      case 21:
        break;
      default:
        zt(
          r,
          t
        ), Jt(t);
    }
  }
  function Jt(t) {
    var r = t.flags;
    if (r & 2) {
      try {
        e: {
          for (var s = t.return; s !== null; ) {
            if (Jm(s)) {
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
            var g = qm(t);
            Mu(t, g, h);
            break;
          case 3:
          case 4:
            var k = u.stateNode.containerInfo, P = qm(t);
            Eu(t, P, k);
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
  function Zx(t, r, s) {
    te = t, rh(t);
  }
  function rh(t, r, s) {
    for (var u = (t.mode & 1) !== 0; te !== null; ) {
      var h = te, g = h.child;
      if (h.tag === 22 && u) {
        var k = h.memoizedState !== null || Ms;
        if (!k) {
          var P = h.alternate, M = P !== null && P.memoizedState !== null || rt;
          P = Ms;
          var F = rt;
          if (Ms = k, (rt = M) && !F) for (te = h; te !== null; ) k = te, M = k.child, k.tag === 22 && k.memoizedState !== null ? sh(h) : M !== null ? (M.return = k, te = M) : sh(h);
          for (; g !== null; ) te = g, rh(g), g = g.sibling;
          te = h, Ms = P, rt = F;
        }
        oh(t);
      } else (h.subtreeFlags & 8772) !== 0 && g !== null ? (g.return = h, te = g) : oh(t);
    }
  }
  function oh(t) {
    for (; te !== null; ) {
      var r = te;
      if ((r.flags & 8772) !== 0) {
        var s = r.alternate;
        try {
          if ((r.flags & 8772) !== 0) switch (r.tag) {
            case 0:
            case 11:
            case 15:
              rt || Rs(5, r);
              break;
            case 1:
              var u = r.stateNode;
              if (r.flags & 4 && !rt) if (s === null) u.componentDidMount();
              else {
                var h = r.elementType === r.type ? s.memoizedProps : Lt(r.type, s.memoizedProps);
                u.componentDidUpdate(h, s.memoizedState, u.__reactInternalSnapshotBeforeUpdate);
              }
              var g = r.updateQueue;
              g !== null && im(r, g, u);
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
                im(r, k, s);
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
                    var U = B.dehydrated;
                    U !== null && Lo(U);
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
          rt || r.flags & 512 && Pu(r);
        } catch (z) {
          Oe(r, r.return, z);
        }
      }
      if (r === t) {
        te = null;
        break;
      }
      if (s = r.sibling, s !== null) {
        s.return = r.return, te = s;
        break;
      }
      te = r.return;
    }
  }
  function ih(t) {
    for (; te !== null; ) {
      var r = te;
      if (r === t) {
        te = null;
        break;
      }
      var s = r.sibling;
      if (s !== null) {
        s.return = r.return, te = s;
        break;
      }
      te = r.return;
    }
  }
  function sh(t) {
    for (; te !== null; ) {
      var r = te;
      try {
        switch (r.tag) {
          case 0:
          case 11:
          case 15:
            var s = r.return;
            try {
              Rs(4, r);
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
              Pu(r);
            } catch (M) {
              Oe(r, g, M);
            }
            break;
          case 5:
            var k = r.return;
            try {
              Pu(r);
            } catch (M) {
              Oe(r, k, M);
            }
        }
      } catch (M) {
        Oe(r, r.return, M);
      }
      if (r === t) {
        te = null;
        break;
      }
      var P = r.sibling;
      if (P !== null) {
        P.return = r.return, te = P;
        break;
      }
      te = r.return;
    }
  }
  var Jx = Math.ceil, Ds = D.ReactCurrentDispatcher, Ru = D.ReactCurrentOwner, Pt = D.ReactCurrentBatchConfig, he = 0, Ge = null, ze = null, Ze = 0, _t = 0, Jr = En(0), Ue = 0, ai = null, ur = 0, Ns = 0, Du = 0, li = null, mt = null, Nu = 0, qr = 1 / 0, mn = null, js = !1, ju = null, In = null, Is = !1, Fn = null, Fs = 0, ui = 0, Iu = null, Os = -1, Ls = 0;
  function st() {
    return (he & 6) !== 0 ? Le() : Os !== -1 ? Os : Os = Le();
  }
  function On(t) {
    return (t.mode & 1) === 0 ? 1 : (he & 2) !== 0 && Ze !== 0 ? Ze & -Ze : Ix.transition !== null ? (Ls === 0 && (Ls = qf()), Ls) : (t = _e, t !== 0 || (t = window.event, t = t === void 0 ? 16 : lp(t.type)), t);
  }
  function Bt(t, r, s, u) {
    if (50 < ui) throw ui = 0, Iu = null, Error(o(185));
    No(t, s, u), ((he & 2) === 0 || t !== Ge) && (t === Ge && ((he & 2) === 0 && (Ns |= s), Ue === 4 && Ln(t, Ze)), ht(t, u), s === 1 && he === 0 && (r.mode & 1) === 0 && (qr = Le() + 500, fs && Rn()));
  }
  function ht(t, r) {
    var s = t.callbackNode;
    Iw(t, r);
    var u = Ki(t, t === Ge ? Ze : 0);
    if (u === 0) s !== null && Xf(s), t.callbackNode = null, t.callbackPriority = 0;
    else if (r = u & -u, t.callbackPriority !== r) {
      if (s != null && Xf(s), r === 1) t.tag === 0 ? jx(lh.bind(null, t)) : Kp(lh.bind(null, t)), Mx(function() {
        (he & 6) === 0 && Rn();
      }), s = null;
      else {
        switch (ep(u)) {
          case 1:
            s = ml;
            break;
          case 4:
            s = Zf;
            break;
          case 16:
            s = Ui;
            break;
          case 536870912:
            s = Jf;
            break;
          default:
            s = Ui;
        }
        s = yh(s, ah.bind(null, t));
      }
      t.callbackPriority = r, t.callbackNode = s;
    }
  }
  function ah(t, r) {
    if (Os = -1, Ls = 0, (he & 6) !== 0) throw Error(o(327));
    var s = t.callbackNode;
    if (eo() && t.callbackNode !== s) return null;
    var u = Ki(t, t === Ge ? Ze : 0);
    if (u === 0) return null;
    if ((u & 30) !== 0 || (u & t.expiredLanes) !== 0 || r) r = Vs(t, u);
    else {
      r = u;
      var h = he;
      he |= 2;
      var g = ch();
      (Ge !== t || Ze !== r) && (mn = null, qr = Le() + 500, dr(t, r));
      do
        try {
          t1();
          break;
        } catch (P) {
          uh(t, P);
        }
      while (!0);
      ql(), Ds.current = g, he = h, ze !== null ? r = 0 : (Ge = null, Ze = 0, r = Ue);
    }
    if (r !== 0) {
      if (r === 2 && (h = hl(t), h !== 0 && (u = h, r = Fu(t, h))), r === 1) throw s = ai, dr(t, 0), Ln(t, u), ht(t, Le()), s;
      if (r === 6) Ln(t, u);
      else {
        if (h = t.current.alternate, (u & 30) === 0 && !qx(h) && (r = Vs(t, u), r === 2 && (g = hl(t), g !== 0 && (u = g, r = Fu(t, g))), r === 1)) throw s = ai, dr(t, 0), Ln(t, u), ht(t, Le()), s;
        switch (t.finishedWork = h, t.finishedLanes = u, r) {
          case 0:
          case 1:
            throw Error(o(345));
          case 2:
            fr(t, mt, mn);
            break;
          case 3:
            if (Ln(t, u), (u & 130023424) === u && (r = Nu + 500 - Le(), 10 < r)) {
              if (Ki(t, 0) !== 0) break;
              if (h = t.suspendedLanes, (h & u) !== u) {
                st(), t.pingedLanes |= t.suspendedLanes & h;
                break;
              }
              t.timeoutHandle = $l(fr.bind(null, t, mt, mn), r);
              break;
            }
            fr(t, mt, mn);
            break;
          case 4:
            if (Ln(t, u), (u & 4194240) === u) break;
            for (r = t.eventTimes, h = -1; 0 < u; ) {
              var k = 31 - It(u);
              g = 1 << k, k = r[k], k > h && (h = k), u &= ~g;
            }
            if (u = h, u = Le() - u, u = (120 > u ? 120 : 480 > u ? 480 : 1080 > u ? 1080 : 1920 > u ? 1920 : 3e3 > u ? 3e3 : 4320 > u ? 4320 : 1960 * Jx(u / 1960)) - u, 10 < u) {
              t.timeoutHandle = $l(fr.bind(null, t, mt, mn), u);
              break;
            }
            fr(t, mt, mn);
            break;
          case 5:
            fr(t, mt, mn);
            break;
          default:
            throw Error(o(329));
        }
      }
    }
    return ht(t, Le()), t.callbackNode === s ? ah.bind(null, t) : null;
  }
  function Fu(t, r) {
    var s = li;
    return t.current.memoizedState.isDehydrated && (dr(t, r).flags |= 256), t = Vs(t, r), t !== 2 && (r = mt, mt = s, r !== null && Ou(r)), t;
  }
  function Ou(t) {
    mt === null ? mt = t : mt.push.apply(mt, t);
  }
  function qx(t) {
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
  function Ln(t, r) {
    for (r &= ~Du, r &= ~Ns, t.suspendedLanes |= r, t.pingedLanes &= ~r, t = t.expirationTimes; 0 < r; ) {
      var s = 31 - It(r), u = 1 << s;
      t[s] = -1, r &= ~u;
    }
  }
  function lh(t) {
    if ((he & 6) !== 0) throw Error(o(327));
    eo();
    var r = Ki(t, 0);
    if ((r & 1) === 0) return ht(t, Le()), null;
    var s = Vs(t, r);
    if (t.tag !== 0 && s === 2) {
      var u = hl(t);
      u !== 0 && (r = u, s = Fu(t, u));
    }
    if (s === 1) throw s = ai, dr(t, 0), Ln(t, r), ht(t, Le()), s;
    if (s === 6) throw Error(o(345));
    return t.finishedWork = t.current.alternate, t.finishedLanes = r, fr(t, mt, mn), ht(t, Le()), null;
  }
  function Lu(t, r) {
    var s = he;
    he |= 1;
    try {
      return t(r);
    } finally {
      he = s, he === 0 && (qr = Le() + 500, fs && Rn());
    }
  }
  function cr(t) {
    Fn !== null && Fn.tag === 0 && (he & 6) === 0 && eo();
    var r = he;
    he |= 1;
    var s = Pt.transition, u = _e;
    try {
      if (Pt.transition = null, _e = 1, t) return t();
    } finally {
      _e = u, Pt.transition = s, he = r, (he & 6) === 0 && Rn();
    }
  }
  function Vu() {
    _t = Jr.current, Re(Jr);
  }
  function dr(t, r) {
    t.finishedWork = null, t.finishedLanes = 0;
    var s = t.timeoutHandle;
    if (s !== -1 && (t.timeoutHandle = -1, Ex(s)), ze !== null) for (s = ze.return; s !== null; ) {
      var u = s;
      switch (Yl(u), u.tag) {
        case 1:
          u = u.type.childContextTypes, u != null && cs();
          break;
        case 3:
          Qr(), Re(dt), Re(et), au();
          break;
        case 5:
          iu(u);
          break;
        case 4:
          Qr();
          break;
        case 13:
          Re(je);
          break;
        case 19:
          Re(je);
          break;
        case 10:
          eu(u.type._context);
          break;
        case 22:
        case 23:
          Vu();
      }
      s = s.return;
    }
    if (Ge = t, ze = t = Vn(t.current, null), Ze = _t = r, Ue = 0, ai = null, Du = Ns = ur = 0, mt = li = null, sr !== null) {
      for (r = 0; r < sr.length; r++) if (s = sr[r], u = s.interleaved, u !== null) {
        s.interleaved = null;
        var h = u.next, g = s.pending;
        if (g !== null) {
          var k = g.next;
          g.next = h, u.next = k;
        }
        s.pending = u;
      }
      sr = null;
    }
    return t;
  }
  function uh(t, r) {
    do {
      var s = ze;
      try {
        if (ql(), _s.current = bs, Ts) {
          for (var u = Ie.memoizedState; u !== null; ) {
            var h = u.queue;
            h !== null && (h.pending = null), u = u.next;
          }
          Ts = !1;
        }
        if (lr = 0, We = $e = Ie = null, ti = !1, ni = 0, Ru.current = null, s === null || s.return === null) {
          Ue = 1, ai = r, ze = null;
          break;
        }
        e: {
          var g = t, k = s.return, P = s, M = r;
          if (r = Ze, P.flags |= 32768, M !== null && typeof M == "object" && typeof M.then == "function") {
            var F = M, B = P, U = B.tag;
            if ((B.mode & 1) === 0 && (U === 0 || U === 11 || U === 15)) {
              var z = B.alternate;
              z ? (B.updateQueue = z.updateQueue, B.memoizedState = z.memoizedState, B.lanes = z.lanes) : (B.updateQueue = null, B.memoizedState = null);
            }
            var q = jm(k);
            if (q !== null) {
              q.flags &= -257, Im(q, k, P, g, r), q.mode & 1 && Nm(g, F, r), r = q, M = F;
              var ne = r.updateQueue;
              if (ne === null) {
                var oe = /* @__PURE__ */ new Set();
                oe.add(M), r.updateQueue = oe;
              } else ne.add(M);
              break e;
            } else {
              if ((r & 1) === 0) {
                Nm(g, F, r), zu();
                break e;
              }
              M = Error(o(426));
            }
          } else if (Ne && P.mode & 1) {
            var Ve = jm(k);
            if (Ve !== null) {
              (Ve.flags & 65536) === 0 && (Ve.flags |= 256), Im(Ve, k, P, g, r), Zl(Xr(M, P));
              break e;
            }
          }
          g = M = Xr(M, P), Ue !== 4 && (Ue = 2), li === null ? li = [g] : li.push(g), g = k;
          do {
            switch (g.tag) {
              case 3:
                g.flags |= 65536, r &= -r, g.lanes |= r;
                var j = Rm(g, M, r);
                om(g, j);
                break e;
              case 1:
                P = M;
                var R = g.type, I = g.stateNode;
                if ((g.flags & 128) === 0 && (typeof R.getDerivedStateFromError == "function" || I !== null && typeof I.componentDidCatch == "function" && (In === null || !In.has(I)))) {
                  g.flags |= 65536, r &= -r, g.lanes |= r;
                  var G = Dm(g, P, r);
                  om(g, G);
                  break e;
                }
            }
            g = g.return;
          } while (g !== null);
        }
        fh(s);
      } catch (ie) {
        r = ie, ze === s && s !== null && (ze = s = s.return);
        continue;
      }
      break;
    } while (!0);
  }
  function ch() {
    var t = Ds.current;
    return Ds.current = bs, t === null ? bs : t;
  }
  function zu() {
    (Ue === 0 || Ue === 3 || Ue === 2) && (Ue = 4), Ge === null || (ur & 268435455) === 0 && (Ns & 268435455) === 0 || Ln(Ge, Ze);
  }
  function Vs(t, r) {
    var s = he;
    he |= 2;
    var u = ch();
    (Ge !== t || Ze !== r) && (mn = null, dr(t, r));
    do
      try {
        e1();
        break;
      } catch (h) {
        uh(t, h);
      }
    while (!0);
    if (ql(), he = s, Ds.current = u, ze !== null) throw Error(o(261));
    return Ge = null, Ze = 0, Ue;
  }
  function e1() {
    for (; ze !== null; ) dh(ze);
  }
  function t1() {
    for (; ze !== null && !bw(); ) dh(ze);
  }
  function dh(t) {
    var r = hh(t.alternate, t, _t);
    t.memoizedProps = t.pendingProps, r === null ? fh(t) : ze = r, Ru.current = null;
  }
  function fh(t) {
    var r = t;
    do {
      var s = r.alternate;
      if (t = r.return, (r.flags & 32768) === 0) {
        if (s = Kx(s, r, _t), s !== null) {
          ze = s;
          return;
        }
      } else {
        if (s = Yx(s, r), s !== null) {
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
  function fr(t, r, s) {
    var u = _e, h = Pt.transition;
    try {
      Pt.transition = null, _e = 1, n1(t, r, s, u);
    } finally {
      Pt.transition = h, _e = u;
    }
    return null;
  }
  function n1(t, r, s, u) {
    do
      eo();
    while (Fn !== null);
    if ((he & 6) !== 0) throw Error(o(327));
    s = t.finishedWork;
    var h = t.finishedLanes;
    if (s === null) return null;
    if (t.finishedWork = null, t.finishedLanes = 0, s === t.current) throw Error(o(177));
    t.callbackNode = null, t.callbackPriority = 0;
    var g = s.lanes | s.childLanes;
    if (Fw(t, g), t === Ge && (ze = Ge = null, Ze = 0), (s.subtreeFlags & 2064) === 0 && (s.flags & 2064) === 0 || Is || (Is = !0, yh(Ui, function() {
      return eo(), null;
    })), g = (s.flags & 15990) !== 0, (s.subtreeFlags & 15990) !== 0 || g) {
      g = Pt.transition, Pt.transition = null;
      var k = _e;
      _e = 1;
      var P = he;
      he |= 4, Ru.current = null, Xx(t, s), nh(s, t), _x(zl), Xi = !!Vl, zl = Vl = null, t.current = s, Zx(s), Cw(), he = P, _e = k, Pt.transition = g;
    } else t.current = s;
    if (Is && (Is = !1, Fn = t, Fs = h), g = t.pendingLanes, g === 0 && (In = null), Mw(s.stateNode), ht(t, Le()), r !== null) for (u = t.onRecoverableError, s = 0; s < r.length; s++) h = r[s], u(h.value, { componentStack: h.stack, digest: h.digest });
    if (js) throw js = !1, t = ju, ju = null, t;
    return (Fs & 1) !== 0 && t.tag !== 0 && eo(), g = t.pendingLanes, (g & 1) !== 0 ? t === Iu ? ui++ : (ui = 0, Iu = t) : ui = 0, Rn(), null;
  }
  function eo() {
    if (Fn !== null) {
      var t = ep(Fs), r = Pt.transition, s = _e;
      try {
        if (Pt.transition = null, _e = 16 > t ? 16 : t, Fn === null) var u = !1;
        else {
          if (t = Fn, Fn = null, Fs = 0, (he & 6) !== 0) throw Error(o(331));
          var h = he;
          for (he |= 4, te = t.current; te !== null; ) {
            var g = te, k = g.child;
            if ((te.flags & 16) !== 0) {
              var P = g.deletions;
              if (P !== null) {
                for (var M = 0; M < P.length; M++) {
                  var F = P[M];
                  for (te = F; te !== null; ) {
                    var B = te;
                    switch (B.tag) {
                      case 0:
                      case 11:
                      case 15:
                        si(8, B, g);
                    }
                    var U = B.child;
                    if (U !== null) U.return = B, te = U;
                    else for (; te !== null; ) {
                      B = te;
                      var z = B.sibling, q = B.return;
                      if (Zm(B), B === F) {
                        te = null;
                        break;
                      }
                      if (z !== null) {
                        z.return = q, te = z;
                        break;
                      }
                      te = q;
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
                te = g;
              }
            }
            if ((g.subtreeFlags & 2064) !== 0 && k !== null) k.return = g, te = k;
            else e: for (; te !== null; ) {
              if (g = te, (g.flags & 2048) !== 0) switch (g.tag) {
                case 0:
                case 11:
                case 15:
                  si(9, g, g.return);
              }
              var j = g.sibling;
              if (j !== null) {
                j.return = g.return, te = j;
                break e;
              }
              te = g.return;
            }
          }
          var R = t.current;
          for (te = R; te !== null; ) {
            k = te;
            var I = k.child;
            if ((k.subtreeFlags & 2064) !== 0 && I !== null) I.return = k, te = I;
            else e: for (k = R; te !== null; ) {
              if (P = te, (P.flags & 2048) !== 0) try {
                switch (P.tag) {
                  case 0:
                  case 11:
                  case 15:
                    Rs(9, P);
                }
              } catch (ie) {
                Oe(P, P.return, ie);
              }
              if (P === k) {
                te = null;
                break e;
              }
              var G = P.sibling;
              if (G !== null) {
                G.return = P.return, te = G;
                break e;
              }
              te = P.return;
            }
          }
          if (he = h, Rn(), Yt && typeof Yt.onPostCommitFiberRoot == "function") try {
            Yt.onPostCommitFiberRoot(Hi, t);
          } catch {
          }
          u = !0;
        }
        return u;
      } finally {
        _e = s, Pt.transition = r;
      }
    }
    return !1;
  }
  function ph(t, r, s) {
    r = Xr(s, r), r = Rm(t, r, 1), t = Nn(t, r, 1), r = st(), t !== null && (No(t, 1, r), ht(t, r));
  }
  function Oe(t, r, s) {
    if (t.tag === 3) ph(t, t, s);
    else for (; r !== null; ) {
      if (r.tag === 3) {
        ph(r, t, s);
        break;
      } else if (r.tag === 1) {
        var u = r.stateNode;
        if (typeof r.type.getDerivedStateFromError == "function" || typeof u.componentDidCatch == "function" && (In === null || !In.has(u))) {
          t = Xr(s, t), t = Dm(r, t, 1), r = Nn(r, t, 1), t = st(), r !== null && (No(r, 1, t), ht(r, t));
          break;
        }
      }
      r = r.return;
    }
  }
  function r1(t, r, s) {
    var u = t.pingCache;
    u !== null && u.delete(r), r = st(), t.pingedLanes |= t.suspendedLanes & s, Ge === t && (Ze & s) === s && (Ue === 4 || Ue === 3 && (Ze & 130023424) === Ze && 500 > Le() - Nu ? dr(t, 0) : Du |= s), ht(t, r);
  }
  function mh(t, r) {
    r === 0 && ((t.mode & 1) === 0 ? r = 1 : (r = Gi, Gi <<= 1, (Gi & 130023424) === 0 && (Gi = 4194304)));
    var s = st();
    t = dn(t, r), t !== null && (No(t, r, s), ht(t, s));
  }
  function o1(t) {
    var r = t.memoizedState, s = 0;
    r !== null && (s = r.retryLane), mh(t, s);
  }
  function i1(t, r) {
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
    u !== null && u.delete(r), mh(t, s);
  }
  var hh;
  hh = function(t, r, s) {
    if (t !== null) if (t.memoizedProps !== r.pendingProps || dt.current) pt = !0;
    else {
      if ((t.lanes & s) === 0 && (r.flags & 128) === 0) return pt = !1, Gx(t, r, s);
      pt = (t.flags & 131072) !== 0;
    }
    else pt = !1, Ne && (r.flags & 1048576) !== 0 && Yp(r, ms, r.index);
    switch (r.lanes = 0, r.tag) {
      case 2:
        var u = r.type;
        Es(t, r), t = r.pendingProps;
        var h = $r(r, et.current);
        Yr(r, s), h = cu(null, r, u, t, h, s);
        var g = du();
        return r.flags |= 1, typeof h == "object" && h !== null && typeof h.render == "function" && h.$$typeof === void 0 ? (r.tag = 1, r.memoizedState = null, r.updateQueue = null, ft(u) ? (g = !0, ds(r)) : g = !1, r.memoizedState = h.state !== null && h.state !== void 0 ? h.state : null, ru(r), h.updater = Cs, r.stateNode = h, h._reactInternals = r, gu(r, u, t, s), r = xu(null, r, u, !0, g, s)) : (r.tag = 0, Ne && g && Kl(r), it(null, r, h, s), r = r.child), r;
      case 16:
        u = r.elementType;
        e: {
          switch (Es(t, r), t = r.pendingProps, h = u._init, u = h(u._payload), r.type = u, h = r.tag = a1(u), t = Lt(u, t), h) {
            case 0:
              r = wu(null, r, u, t, s);
              break e;
            case 1:
              r = Bm(null, r, u, t, s);
              break e;
            case 11:
              r = Fm(null, r, u, t, s);
              break e;
            case 14:
              r = Om(null, r, u, Lt(u.type, t), s);
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
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Lt(u, h), wu(t, r, u, h, s);
      case 1:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Lt(u, h), Bm(t, r, u, h, s);
      case 3:
        e: {
          if ($m(r), t === null) throw Error(o(387));
          u = r.pendingProps, g = r.memoizedState, h = g.element, rm(t, r), ws(r, u, null, s);
          var k = r.memoizedState;
          if (u = k.element, g.isDehydrated) if (g = { element: u, isDehydrated: !1, cache: k.cache, pendingSuspenseBoundaries: k.pendingSuspenseBoundaries, transitions: k.transitions }, r.updateQueue.baseState = g, r.memoizedState = g, r.flags & 256) {
            h = Xr(Error(o(423)), r), r = Um(t, r, u, s, h);
            break e;
          } else if (u !== h) {
            h = Xr(Error(o(424)), r), r = Um(t, r, u, s, h);
            break e;
          } else for (xt = Pn(r.stateNode.containerInfo.firstChild), wt = r, Ne = !0, Ot = null, s = tm(r, null, u, s), r.child = s; s; ) s.flags = s.flags & -3 | 4096, s = s.sibling;
          else {
            if (Wr(), u === h) {
              r = pn(t, r, s);
              break e;
            }
            it(t, r, u, s);
          }
          r = r.child;
        }
        return r;
      case 5:
        return sm(r), t === null && Xl(r), u = r.type, h = r.pendingProps, g = t !== null ? t.memoizedProps : null, k = h.children, Bl(u, h) ? k = null : g !== null && Bl(u, g) && (r.flags |= 32), zm(t, r), it(t, r, k, s), r.child;
      case 6:
        return t === null && Xl(r), null;
      case 13:
        return Hm(t, r, s);
      case 4:
        return ou(r, r.stateNode.containerInfo), u = r.pendingProps, t === null ? r.child = Gr(r, null, u, s) : it(t, r, u, s), r.child;
      case 11:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Lt(u, h), Fm(t, r, u, h, s);
      case 7:
        return it(t, r, r.pendingProps, s), r.child;
      case 8:
        return it(t, r, r.pendingProps.children, s), r.child;
      case 12:
        return it(t, r, r.pendingProps.children, s), r.child;
      case 10:
        e: {
          if (u = r.type._context, h = r.pendingProps, g = r.memoizedProps, k = h.value, Ee(gs, u._currentValue), u._currentValue = k, g !== null) if (Ft(g.value, k)) {
            if (g.children === h.children && !dt.current) {
              r = pn(t, r, s);
              break e;
            }
          } else for (g = r.child, g !== null && (g.return = r); g !== null; ) {
            var P = g.dependencies;
            if (P !== null) {
              k = g.child;
              for (var M = P.firstContext; M !== null; ) {
                if (M.context === u) {
                  if (g.tag === 1) {
                    M = fn(-1, s & -s), M.tag = 2;
                    var F = g.updateQueue;
                    if (F !== null) {
                      F = F.shared;
                      var B = F.pending;
                      B === null ? M.next = M : (M.next = B.next, B.next = M), F.pending = M;
                    }
                  }
                  g.lanes |= s, M = g.alternate, M !== null && (M.lanes |= s), tu(
                    g.return,
                    s,
                    r
                  ), P.lanes |= s;
                  break;
                }
                M = M.next;
              }
            } else if (g.tag === 10) k = g.type === r.type ? null : g.child;
            else if (g.tag === 18) {
              if (k = g.return, k === null) throw Error(o(341));
              k.lanes |= s, P = k.alternate, P !== null && (P.lanes |= s), tu(k, s, r), k = g.sibling;
            } else k = g.child;
            if (k !== null) k.return = g;
            else for (k = g; k !== null; ) {
              if (k === r) {
                k = null;
                break;
              }
              if (g = k.sibling, g !== null) {
                g.return = k.return, k = g;
                break;
              }
              k = k.return;
            }
            g = k;
          }
          it(t, r, h.children, s), r = r.child;
        }
        return r;
      case 9:
        return h = r.type, u = r.pendingProps.children, Yr(r, s), h = bt(h), u = u(h), r.flags |= 1, it(t, r, u, s), r.child;
      case 14:
        return u = r.type, h = Lt(u, r.pendingProps), h = Lt(u.type, h), Om(t, r, u, h, s);
      case 15:
        return Lm(t, r, r.type, r.pendingProps, s);
      case 17:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Lt(u, h), Es(t, r), r.tag = 1, ft(u) ? (t = !0, ds(r)) : t = !1, Yr(r, s), Em(r, u, h), gu(r, u, h, s), xu(null, r, u, !0, t, s);
      case 19:
        return Gm(t, r, s);
      case 22:
        return Vm(t, r, s);
    }
    throw Error(o(156, r.tag));
  };
  function yh(t, r) {
    return Qf(t, r);
  }
  function s1(t, r, s, u) {
    this.tag = t, this.key = s, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = r, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = u, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function Et(t, r, s, u) {
    return new s1(t, r, s, u);
  }
  function Bu(t) {
    return t = t.prototype, !(!t || !t.isReactComponent);
  }
  function a1(t) {
    if (typeof t == "function") return Bu(t) ? 1 : 0;
    if (t != null) {
      if (t = t.$$typeof, t === Z) return 11;
      if (t === ye) return 14;
    }
    return 2;
  }
  function Vn(t, r) {
    var s = t.alternate;
    return s === null ? (s = Et(t.tag, r, t.key, t.mode), s.elementType = t.elementType, s.type = t.type, s.stateNode = t.stateNode, s.alternate = t, t.alternate = s) : (s.pendingProps = r, s.type = t.type, s.flags = 0, s.subtreeFlags = 0, s.deletions = null), s.flags = t.flags & 14680064, s.childLanes = t.childLanes, s.lanes = t.lanes, s.child = t.child, s.memoizedProps = t.memoizedProps, s.memoizedState = t.memoizedState, s.updateQueue = t.updateQueue, r = t.dependencies, s.dependencies = r === null ? null : { lanes: r.lanes, firstContext: r.firstContext }, s.sibling = t.sibling, s.index = t.index, s.ref = t.ref, s;
  }
  function zs(t, r, s, u, h, g) {
    var k = 2;
    if (u = t, typeof t == "function") Bu(t) && (k = 1);
    else if (typeof t == "string") k = 5;
    else e: switch (t) {
      case H:
        return pr(s.children, h, g, r);
      case Y:
        k = 8, h |= 8;
        break;
      case L:
        return t = Et(12, s, r, h | 2), t.elementType = L, t.lanes = g, t;
      case de:
        return t = Et(13, s, r, h), t.elementType = de, t.lanes = g, t;
      case ce:
        return t = Et(19, s, r, h), t.elementType = ce, t.lanes = g, t;
      case we:
        return Bs(s, h, g, r);
      default:
        if (typeof t == "object" && t !== null) switch (t.$$typeof) {
          case X:
            k = 10;
            break e;
          case se:
            k = 9;
            break e;
          case Z:
            k = 11;
            break e;
          case ye:
            k = 14;
            break e;
          case ee:
            k = 16, u = null;
            break e;
        }
        throw Error(o(130, t == null ? t : typeof t, ""));
    }
    return r = Et(k, s, r, h), r.elementType = t, r.type = u, r.lanes = g, r;
  }
  function pr(t, r, s, u) {
    return t = Et(7, t, u, r), t.lanes = s, t;
  }
  function Bs(t, r, s, u) {
    return t = Et(22, t, u, r), t.elementType = we, t.lanes = s, t.stateNode = { isHidden: !1 }, t;
  }
  function $u(t, r, s) {
    return t = Et(6, t, null, r), t.lanes = s, t;
  }
  function Uu(t, r, s) {
    return r = Et(4, t.children !== null ? t.children : [], t.key, r), r.lanes = s, r.stateNode = { containerInfo: t.containerInfo, pendingChildren: null, implementation: t.implementation }, r;
  }
  function l1(t, r, s, u, h) {
    this.tag = r, this.containerInfo = t, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = yl(0), this.expirationTimes = yl(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = yl(0), this.identifierPrefix = u, this.onRecoverableError = h, this.mutableSourceEagerHydrationData = null;
  }
  function Hu(t, r, s, u, h, g, k, P, M) {
    return t = new l1(t, r, s, P, M), r === 1 ? (r = 1, g === !0 && (r |= 8)) : r = 0, g = Et(3, null, null, r), t.current = g, g.stateNode = t, g.memoizedState = { element: u, isDehydrated: s, cache: null, transitions: null, pendingSuspenseBoundaries: null }, ru(g), t;
  }
  function u1(t, r, s) {
    var u = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return { $$typeof: W, key: u == null ? null : "" + u, children: t, containerInfo: r, implementation: s };
  }
  function gh(t) {
    if (!t) return Mn;
    t = t._reactInternals;
    e: {
      if (tr(t) !== t || t.tag !== 1) throw Error(o(170));
      var r = t;
      do {
        switch (r.tag) {
          case 3:
            r = r.stateNode.context;
            break e;
          case 1:
            if (ft(r.type)) {
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
      if (ft(s)) return Wp(t, s, r);
    }
    return r;
  }
  function vh(t, r, s, u, h, g, k, P, M) {
    return t = Hu(s, u, !0, t, h, g, k, P, M), t.context = gh(null), s = t.current, u = st(), h = On(s), g = fn(u, h), g.callback = r ?? null, Nn(s, g, h), t.current.lanes = h, No(t, h, u), ht(t, u), t;
  }
  function $s(t, r, s, u) {
    var h = r.current, g = st(), k = On(h);
    return s = gh(s), r.context === null ? r.context = s : r.pendingContext = s, r = fn(g, k), r.payload = { element: t }, u = u === void 0 ? null : u, u !== null && (r.callback = u), t = Nn(h, r, k), t !== null && (Bt(t, h, k, g), Ss(t, h, k)), k;
  }
  function Us(t) {
    if (t = t.current, !t.child) return null;
    switch (t.child.tag) {
      case 5:
        return t.child.stateNode;
      default:
        return t.child.stateNode;
    }
  }
  function Sh(t, r) {
    if (t = t.memoizedState, t !== null && t.dehydrated !== null) {
      var s = t.retryLane;
      t.retryLane = s !== 0 && s < r ? s : r;
    }
  }
  function Wu(t, r) {
    Sh(t, r), (t = t.alternate) && Sh(t, r);
  }
  function c1() {
    return null;
  }
  var wh = typeof reportError == "function" ? reportError : function(t) {
    console.error(t);
  };
  function Gu(t) {
    this._internalRoot = t;
  }
  Hs.prototype.render = Gu.prototype.render = function(t) {
    var r = this._internalRoot;
    if (r === null) throw Error(o(409));
    $s(t, r, null, null);
  }, Hs.prototype.unmount = Gu.prototype.unmount = function() {
    var t = this._internalRoot;
    if (t !== null) {
      this._internalRoot = null;
      var r = t.containerInfo;
      cr(function() {
        $s(null, t, null, null);
      }), r[an] = null;
    }
  };
  function Hs(t) {
    this._internalRoot = t;
  }
  Hs.prototype.unstable_scheduleHydration = function(t) {
    if (t) {
      var r = rp();
      t = { blockedOn: null, target: t, priority: r };
      for (var s = 0; s < An.length && r !== 0 && r < An[s].priority; s++) ;
      An.splice(s, 0, t), s === 0 && sp(t);
    }
  };
  function Ku(t) {
    return !(!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11);
  }
  function Ws(t) {
    return !(!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11 && (t.nodeType !== 8 || t.nodeValue !== " react-mount-point-unstable "));
  }
  function xh() {
  }
  function d1(t, r, s, u, h) {
    if (h) {
      if (typeof u == "function") {
        var g = u;
        u = function() {
          var F = Us(k);
          g.call(F);
        };
      }
      var k = vh(r, u, t, 0, null, !1, !1, "", xh);
      return t._reactRootContainer = k, t[an] = k.current, Ko(t.nodeType === 8 ? t.parentNode : t), cr(), k;
    }
    for (; h = t.lastChild; ) t.removeChild(h);
    if (typeof u == "function") {
      var P = u;
      u = function() {
        var F = Us(M);
        P.call(F);
      };
    }
    var M = Hu(t, 0, !1, null, null, !1, !1, "", xh);
    return t._reactRootContainer = M, t[an] = M.current, Ko(t.nodeType === 8 ? t.parentNode : t), cr(function() {
      $s(r, M, s, u);
    }), M;
  }
  function Gs(t, r, s, u, h) {
    var g = s._reactRootContainer;
    if (g) {
      var k = g;
      if (typeof h == "function") {
        var P = h;
        h = function() {
          var M = Us(k);
          P.call(M);
        };
      }
      $s(r, k, t, h);
    } else k = d1(s, r, t, h, u);
    return Us(k);
  }
  tp = function(t) {
    switch (t.tag) {
      case 3:
        var r = t.stateNode;
        if (r.current.memoizedState.isDehydrated) {
          var s = Do(r.pendingLanes);
          s !== 0 && (gl(r, s | 1), ht(r, Le()), (he & 6) === 0 && (qr = Le() + 500, Rn()));
        }
        break;
      case 13:
        cr(function() {
          var u = dn(t, 1);
          if (u !== null) {
            var h = st();
            Bt(u, t, 1, h);
          }
        }), Wu(t, 1);
    }
  }, vl = function(t) {
    if (t.tag === 13) {
      var r = dn(t, 134217728);
      if (r !== null) {
        var s = st();
        Bt(r, t, 134217728, s);
      }
      Wu(t, 134217728);
    }
  }, np = function(t) {
    if (t.tag === 13) {
      var r = On(t), s = dn(t, r);
      if (s !== null) {
        var u = st();
        Bt(s, t, r, u);
      }
      Wu(t, r);
    }
  }, rp = function() {
    return _e;
  }, op = function(t, r) {
    var s = _e;
    try {
      return _e = t, r();
    } finally {
      _e = s;
    }
  }, cl = function(t, r, s) {
    switch (r) {
      case "input":
        if (nl(t, s), r = s.name, s.type === "radio" && r != null) {
          for (s = t; s.parentNode; ) s = s.parentNode;
          for (s = s.querySelectorAll("input[name=" + JSON.stringify("" + r) + '][type="radio"]'), r = 0; r < s.length; r++) {
            var u = s[r];
            if (u !== t && u.form === t.form) {
              var h = us(u);
              if (!h) throw Error(o(90));
              Pf(u), nl(u, h);
            }
          }
        }
        break;
      case "textarea":
        Nf(t, s);
        break;
      case "select":
        r = s.value, r != null && Mr(t, !!s.multiple, r, !1);
    }
  }, $f = Lu, Uf = cr;
  var f1 = { usingClientEntryPoint: !1, Events: [Xo, zr, us, zf, Bf, Lu] }, ci = { findFiberByHostInstance: nr, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, p1 = { bundleType: ci.bundleType, version: ci.version, rendererPackageName: ci.rendererPackageName, rendererConfig: ci.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: D.ReactCurrentDispatcher, findHostInstanceByFiber: function(t) {
    return t = Kf(t), t === null ? null : t.stateNode;
  }, findFiberByHostInstance: ci.findFiberByHostInstance || c1, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Ks = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Ks.isDisabled && Ks.supportsFiber) try {
      Hi = Ks.inject(p1), Yt = Ks;
    } catch {
    }
  }
  return yt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = f1, yt.createPortal = function(t, r) {
    var s = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!Ku(r)) throw Error(o(200));
    return u1(t, r, null, s);
  }, yt.createRoot = function(t, r) {
    if (!Ku(t)) throw Error(o(299));
    var s = !1, u = "", h = wh;
    return r != null && (r.unstable_strictMode === !0 && (s = !0), r.identifierPrefix !== void 0 && (u = r.identifierPrefix), r.onRecoverableError !== void 0 && (h = r.onRecoverableError)), r = Hu(t, 1, !1, null, null, s, !1, u, h), t[an] = r.current, Ko(t.nodeType === 8 ? t.parentNode : t), new Gu(r);
  }, yt.findDOMNode = function(t) {
    if (t == null) return null;
    if (t.nodeType === 1) return t;
    var r = t._reactInternals;
    if (r === void 0)
      throw typeof t.render == "function" ? Error(o(188)) : (t = Object.keys(t).join(","), Error(o(268, t)));
    return t = Kf(r), t = t === null ? null : t.stateNode, t;
  }, yt.flushSync = function(t) {
    return cr(t);
  }, yt.hydrate = function(t, r, s) {
    if (!Ws(r)) throw Error(o(200));
    return Gs(null, t, r, !0, s);
  }, yt.hydrateRoot = function(t, r, s) {
    if (!Ku(t)) throw Error(o(405));
    var u = s != null && s.hydratedSources || null, h = !1, g = "", k = wh;
    if (s != null && (s.unstable_strictMode === !0 && (h = !0), s.identifierPrefix !== void 0 && (g = s.identifierPrefix), s.onRecoverableError !== void 0 && (k = s.onRecoverableError)), r = vh(r, null, t, 1, s ?? null, h, !1, g, k), t[an] = r.current, Ko(t), u) for (t = 0; t < u.length; t++) s = u[t], h = s._getVersion, h = h(s._source), r.mutableSourceEagerHydrationData == null ? r.mutableSourceEagerHydrationData = [s, h] : r.mutableSourceEagerHydrationData.push(
      s,
      h
    );
    return new Hs(r);
  }, yt.render = function(t, r, s) {
    if (!Ws(r)) throw Error(o(200));
    return Gs(null, t, r, !1, s);
  }, yt.unmountComponentAtNode = function(t) {
    if (!Ws(t)) throw Error(o(40));
    return t._reactRootContainer ? (cr(function() {
      Gs(null, null, t, !1, function() {
        t._reactRootContainer = null, t[an] = null;
      });
    }), !0) : !1;
  }, yt.unstable_batchedUpdates = Lu, yt.unstable_renderSubtreeIntoContainer = function(t, r, s, u) {
    if (!Ws(s)) throw Error(o(200));
    if (t == null || t._reactInternals === void 0) throw Error(o(38));
    return Gs(t, r, s, !1, u);
  }, yt.version = "18.3.1-next-f1338f8080-20240426", yt;
}
var Mh;
function Og() {
  if (Mh) return Qu.exports;
  Mh = 1;
  function e() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(e);
      } catch (n) {
        console.error(n);
      }
  }
  return e(), Qu.exports = k1(), Qu.exports;
}
var Rh;
function A1() {
  if (Rh) return Ys;
  Rh = 1;
  var e = Og();
  return Ys.createRoot = e.createRoot, Ys.hydrateRoot = e.hydrateRoot, Ys;
}
var b1 = A1(), Ju = { exports: {} }, fi = {};
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Dh;
function C1() {
  if (Dh) return fi;
  Dh = 1;
  var e = bd(), n = Symbol.for("react.element"), o = Symbol.for("react.fragment"), i = Object.prototype.hasOwnProperty, a = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, f = { key: !0, ref: !0, __self: !0, __source: !0 };
  function d(p, m, y) {
    var S, l = {}, c = null, v = null;
    y !== void 0 && (c = "" + y), m.key !== void 0 && (c = "" + m.key), m.ref !== void 0 && (v = m.ref);
    for (S in m) i.call(m, S) && !f.hasOwnProperty(S) && (l[S] = m[S]);
    if (p && p.defaultProps) for (S in m = p.defaultProps, m) l[S] === void 0 && (l[S] = m[S]);
    return { $$typeof: n, type: p, key: c, ref: v, props: l, _owner: a.current };
  }
  return fi.Fragment = o, fi.jsx = d, fi.jsxs = d, fi;
}
var Nh;
function P1() {
  return Nh || (Nh = 1, Ju.exports = C1()), Ju.exports;
}
var x = P1();
const jh = (e) => Symbol.iterator in e, Ih = (e) => (
  // HACK: avoid checking entries type
  "entries" in e
), Fh = (e, n) => {
  const o = e instanceof Map ? e : new Map(e.entries()), i = n instanceof Map ? n : new Map(n.entries());
  if (o.size !== i.size)
    return !1;
  for (const [a, f] of o)
    if (!i.has(a) || !Object.is(f, i.get(a)))
      return !1;
  return !0;
}, E1 = (e, n) => {
  const o = e[Symbol.iterator](), i = n[Symbol.iterator]();
  let a = o.next(), f = i.next();
  for (; !a.done && !f.done; ) {
    if (!Object.is(a.value, f.value))
      return !1;
    a = o.next(), f = i.next();
  }
  return !!a.done && !!f.done;
};
function M1(e, n) {
  return Object.is(e, n) ? !0 : typeof e != "object" || e === null || typeof n != "object" || n === null || Object.getPrototypeOf(e) !== Object.getPrototypeOf(n) ? !1 : jh(e) && jh(n) ? Ih(e) && Ih(n) ? Fh(e, n) : E1(e, n) : Fh(
    { entries: () => Object.entries(e) },
    { entries: () => Object.entries(n) }
  );
}
function R1(e) {
  const n = gn.useRef(void 0);
  return (o) => {
    const i = e(o);
    return M1(n.current, i) ? n.current : n.current = i;
  };
}
const Cd = b.createContext({});
function Pd(e) {
  const n = b.useRef(null);
  return n.current === null && (n.current = e()), n.current;
}
const D1 = typeof window < "u", Lg = D1 ? b.useLayoutEffect : b.useEffect, Ua = /* @__PURE__ */ b.createContext(null);
function Ed(e, n) {
  e.indexOf(n) === -1 && e.push(n);
}
function Aa(e, n) {
  const o = e.indexOf(n);
  o > -1 && e.splice(o, 1);
}
const sn = (e, n, o) => o > n ? n : o < e ? e : o;
function Oh(e, n) {
  return n ? `${e}. For more information and steps for solving, visit https://motion.dev/troubleshooting/${n}` : e;
}
let Mi = () => {
}, Pr = () => {
};
var Rg;
typeof process < "u" && ((Rg = process.env) == null ? void 0 : Rg.NODE_ENV) !== "production" && (Mi = (e, n, o) => {
  !e && typeof console < "u" && console.warn(Oh(n, o));
}, Pr = (e, n, o) => {
  if (!e)
    throw new Error(Oh(n, o));
});
const Qn = {}, Vg = (e) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(e), zg = (e) => typeof e == "object" && e !== null, Bg = (e) => /^0[^.\s]+$/u.test(e);
// @__NO_SIDE_EFFECTS__
function $g(e) {
  let n;
  return () => (n === void 0 && (n = e()), n);
}
const jt = /* @__NO_SIDE_EFFECTS__ */ (e) => e, Ri = (...e) => e.reduce((n, o) => (i) => o(n(i))), Ti = /* @__NO_SIDE_EFFECTS__ */ (e, n, o) => {
  const i = n - e;
  return i ? (o - e) / i : 1;
};
class Md {
  constructor() {
    this.subscriptions = [];
  }
  add(n) {
    return Ed(this.subscriptions, n), () => Aa(this.subscriptions, n);
  }
  notify(n, o, i) {
    const a = this.subscriptions.length;
    if (a)
      if (a === 1)
        this.subscriptions[0](n, o, i);
      else
        for (let f = 0; f < a; f++) {
          const d = this.subscriptions[f];
          d && d(n, o, i);
        }
  }
  getSize() {
    return this.subscriptions.length;
  }
  clear() {
    this.subscriptions.length = 0;
  }
}
const gt = /* @__NO_SIDE_EFFECTS__ */ (e) => e * 1e3, Nt = /* @__NO_SIDE_EFFECTS__ */ (e) => e / 1e3, Ug = /* @__NO_SIDE_EFFECTS__ */ (e, n) => n ? e * (1e3 / n) : 0, Hg = (e, n, o) => (((1 - 3 * o + 3 * n) * e + (3 * o - 6 * n)) * e + 3 * n) * e, N1 = 1e-7, j1 = 12;
function I1(e, n, o, i, a) {
  let f, d, p = 0;
  do
    d = n + (o - n) / 2, f = Hg(d, i, a) - e, f > 0 ? o = d : n = d;
  while (Math.abs(f) > N1 && ++p < j1);
  return d;
}
// @__NO_SIDE_EFFECTS__
function Di(e, n, o, i) {
  if (e === n && o === i)
    return jt;
  const a = (f) => I1(f, 0, 1, e, o);
  return (f) => f === 0 || f === 1 ? f : Hg(a(f), n, i);
}
const Wg = /* @__NO_SIDE_EFFECTS__ */ (e) => (n) => n <= 0.5 ? e(2 * n) / 2 : (2 - e(2 * (1 - n))) / 2, Gg = /* @__NO_SIDE_EFFECTS__ */ (e) => (n) => 1 - e(1 - n), Kg = /* @__PURE__ */ Di(0.33, 1.53, 0.69, 0.99), Rd = /* @__PURE__ */ Gg(Kg), Yg = /* @__PURE__ */ Wg(Rd), Qg = (e) => e >= 1 ? 1 : (e *= 2) < 1 ? 0.5 * Rd(e) : 0.5 * (2 - Math.pow(2, -10 * (e - 1))), Dd = (e) => 1 - Math.sin(Math.acos(e)), Xg = /* @__PURE__ */ Gg(Dd), Zg = /* @__PURE__ */ Wg(Dd), F1 = /* @__PURE__ */ Di(0.42, 0, 1, 1), O1 = /* @__PURE__ */ Di(0, 0, 0.58, 1), Jg = /* @__PURE__ */ Di(0.42, 0, 0.58, 1), L1 = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] != "number", qg = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] == "number", Lh = {
  linear: jt,
  easeIn: F1,
  easeInOut: Jg,
  easeOut: O1,
  circIn: Dd,
  circInOut: Zg,
  circOut: Xg,
  backIn: Rd,
  backInOut: Yg,
  backOut: Kg,
  anticipate: Qg
}, V1 = (e) => typeof e == "string", Vh = (e) => {
  if (/* @__PURE__ */ qg(e)) {
    Pr(e.length === 4, "Cubic bezier arrays must contain four numerical values.", "cubic-bezier-length");
    const [n, o, i, a] = e;
    return /* @__PURE__ */ Di(n, o, i, a);
  } else if (V1(e))
    return Pr(Lh[e] !== void 0, `Invalid easing type '${e}'`, "invalid-easing-type"), Lh[e];
  return e;
}, Qs = [
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
function z1(e, n) {
  let o = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Set(), a = !1, f = !1;
  const d = /* @__PURE__ */ new WeakSet();
  let p = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  };
  function m(S) {
    d.has(S) && (y.schedule(S), e()), S(p);
  }
  const y = {
    /**
     * Schedule a process to run on the next frame.
     */
    schedule: (S, l = !1, c = !1) => {
      const w = c && a ? o : i;
      return l && d.add(S), w.add(S), S;
    },
    /**
     * Cancel the provided callback from running on the next frame.
     */
    cancel: (S) => {
      i.delete(S), d.delete(S);
    },
    /**
     * Execute all schedule callbacks.
     */
    process: (S) => {
      if (p = S, a) {
        f = !0;
        return;
      }
      a = !0;
      const l = o;
      o = i, i = l, o.forEach(m), o.clear(), a = !1, f && (f = !1, y.process(S));
    }
  };
  return y;
}
const B1 = 40;
function ev(e, n) {
  let o = !1, i = !0;
  const a = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  }, f = () => o = !0, d = Qs.reduce((E, D) => (E[D] = z1(f), E), {}), { setup: p, read: m, resolveKeyframes: y, preUpdate: S, update: l, preRender: c, render: v, postRender: w } = d, T = () => {
    const E = Qn.useManualTiming, D = E ? a.timestamp : performance.now();
    o = !1, E || (a.delta = i ? 1e3 / 60 : Math.max(Math.min(D - a.timestamp, B1), 1)), a.timestamp = D, a.isProcessing = !0, p.process(a), m.process(a), y.process(a), S.process(a), l.process(a), c.process(a), v.process(a), w.process(a), a.isProcessing = !1, o && n && (i = !1, e(T));
  }, A = () => {
    o = !0, i = !0, a.isProcessing || e(T);
  };
  return { schedule: Qs.reduce((E, D) => {
    const O = d[D];
    return E[D] = (W, H = !1, Y = !1) => (o || A(), O.schedule(W, H, Y)), E;
  }, {}), cancel: (E) => {
    for (let D = 0; D < Qs.length; D++)
      d[Qs[D]].cancel(E);
  }, state: a, steps: d };
}
const { schedule: Ce, cancel: Xn, state: Je, steps: qu } = /* @__PURE__ */ ev(typeof requestAnimationFrame < "u" ? requestAnimationFrame : jt, !0);
let da;
function $1() {
  da = void 0;
}
const lt = {
  now: () => (da === void 0 && lt.set(Je.isProcessing || Qn.useManualTiming ? Je.timestamp : performance.now()), da),
  set: (e) => {
    da = e, queueMicrotask($1);
  }
}, tv = (e) => (n) => typeof n == "string" && n.startsWith(e), nv = /* @__PURE__ */ tv("--"), U1 = /* @__PURE__ */ tv("var(--"), Nd = (e) => U1(e) ? H1.test(e.split("/*")[0].trim()) : !1, H1 = /var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;
function zh(e) {
  return typeof e != "string" ? !1 : e.split("/*")[0].includes("var(--");
}
const So = {
  test: (e) => typeof e == "number",
  parse: parseFloat,
  transform: (e) => e
}, ki = {
  ...So,
  transform: (e) => sn(0, 1, e)
}, Xs = {
  ...So,
  default: 1
}, yi = (e) => Math.round(e * 1e5) / 1e5, jd = /-?(?:\d+(?:\.\d+)?|\.\d+)/gu;
function W1(e) {
  return e == null;
}
const G1 = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu, Id = (e, n) => (o) => !!(typeof o == "string" && G1.test(o) && o.startsWith(e) || n && !W1(o) && Object.prototype.hasOwnProperty.call(o, n)), rv = (e, n, o) => (i) => {
  if (typeof i != "string")
    return i;
  const [a, f, d, p] = i.match(jd);
  return {
    [e]: parseFloat(a),
    [n]: parseFloat(f),
    [o]: parseFloat(d),
    alpha: p !== void 0 ? parseFloat(p) : 1
  };
}, K1 = (e) => sn(0, 255, e), ec = {
  ...So,
  transform: (e) => Math.round(K1(e))
}, wr = {
  test: /* @__PURE__ */ Id("rgb", "red"),
  parse: /* @__PURE__ */ rv("red", "green", "blue"),
  transform: ({ red: e, green: n, blue: o, alpha: i = 1 }) => "rgba(" + ec.transform(e) + ", " + ec.transform(n) + ", " + ec.transform(o) + ", " + yi(ki.transform(i)) + ")"
};
function Y1(e) {
  let n = "", o = "", i = "", a = "";
  return e.length > 5 ? (n = e.substring(1, 3), o = e.substring(3, 5), i = e.substring(5, 7), a = e.substring(7, 9)) : (n = e.substring(1, 2), o = e.substring(2, 3), i = e.substring(3, 4), a = e.substring(4, 5), n += n, o += o, i += i, a += a), {
    red: parseInt(n, 16),
    green: parseInt(o, 16),
    blue: parseInt(i, 16),
    alpha: a ? parseInt(a, 16) / 255 : 1
  };
}
const bc = {
  test: /* @__PURE__ */ Id("#"),
  parse: Y1,
  transform: wr.transform
}, Ni = /* @__NO_SIDE_EFFECTS__ */ (e) => ({
  test: (n) => typeof n == "string" && n.endsWith(e) && n.split(" ").length === 1,
  parse: parseFloat,
  transform: (n) => `${n}${e}`
}), hn = /* @__PURE__ */ Ni("deg"), on = /* @__PURE__ */ Ni("%"), re = /* @__PURE__ */ Ni("px"), Q1 = /* @__PURE__ */ Ni("vh"), X1 = /* @__PURE__ */ Ni("vw"), Bh = {
  ...on,
  parse: (e) => on.parse(e) / 100,
  transform: (e) => on.transform(e * 100)
}, lo = {
  test: /* @__PURE__ */ Id("hsl", "hue"),
  parse: /* @__PURE__ */ rv("hue", "saturation", "lightness"),
  transform: ({ hue: e, saturation: n, lightness: o, alpha: i = 1 }) => "hsla(" + Math.round(e) + ", " + on.transform(yi(n)) + ", " + on.transform(yi(o)) + ", " + yi(ki.transform(i)) + ")"
}, Be = {
  test: (e) => wr.test(e) || bc.test(e) || lo.test(e),
  parse: (e) => wr.test(e) ? wr.parse(e) : lo.test(e) ? lo.parse(e) : bc.parse(e),
  transform: (e) => typeof e == "string" ? e : e.hasOwnProperty("red") ? wr.transform(e) : lo.transform(e),
  getAnimatableNone: (e) => {
    const n = Be.parse(e);
    return n.alpha = 0, Be.transform(n);
  }
}, Z1 = /(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;
function J1(e) {
  var n, o;
  return isNaN(e) && typeof e == "string" && (((n = e.match(jd)) == null ? void 0 : n.length) || 0) + (((o = e.match(Z1)) == null ? void 0 : o.length) || 0) > 0;
}
const ov = "number", iv = "color", q1 = "var", e_ = "var(", $h = "${}", t_ = /var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;
function ho(e) {
  const n = e.toString(), o = [], i = {
    color: [],
    number: [],
    var: []
  }, a = [];
  let f = 0;
  const p = n.replace(t_, (m) => (Be.test(m) ? (i.color.push(f), a.push(iv), o.push(Be.parse(m))) : m.startsWith(e_) ? (i.var.push(f), a.push(q1), o.push(m)) : (i.number.push(f), a.push(ov), o.push(parseFloat(m))), ++f, $h)).split($h);
  return { values: o, split: p, indexes: i, types: a };
}
function n_(e) {
  return ho(e).values;
}
function sv({ split: e, types: n }) {
  const o = e.length;
  return (i) => {
    let a = "";
    for (let f = 0; f < o; f++)
      if (a += e[f], i[f] !== void 0) {
        const d = n[f];
        d === ov ? a += yi(i[f]) : d === iv ? a += Be.transform(i[f]) : a += i[f];
      }
    return a;
  };
}
function r_(e) {
  return sv(ho(e));
}
const o_ = (e) => typeof e == "number" ? 0 : Be.test(e) ? Be.getAnimatableNone(e) : e, i_ = (e, n) => typeof e == "number" ? n != null && n.trim().endsWith("/") ? e : 0 : o_(e);
function s_(e) {
  const n = ho(e);
  return sv(n)(n.values.map((i, a) => i_(i, n.split[a])));
}
const Wt = {
  test: J1,
  parse: n_,
  createTransformer: r_,
  getAnimatableNone: s_
};
function tc(e, n, o) {
  return o < 0 && (o += 1), o > 1 && (o -= 1), o < 1 / 6 ? e + (n - e) * 6 * o : o < 1 / 2 ? n : o < 2 / 3 ? e + (n - e) * (2 / 3 - o) * 6 : e;
}
function a_({ hue: e, saturation: n, lightness: o, alpha: i }) {
  e /= 360, n /= 100, o /= 100;
  let a = 0, f = 0, d = 0;
  if (!n)
    a = f = d = o;
  else {
    const p = o < 0.5 ? o * (1 + n) : o + n - o * n, m = 2 * o - p;
    a = tc(m, p, e + 1 / 3), f = tc(m, p, e), d = tc(m, p, e - 1 / 3);
  }
  return {
    red: Math.round(a * 255),
    green: Math.round(f * 255),
    blue: Math.round(d * 255),
    alpha: i
  };
}
function ba(e, n) {
  return (o) => o > 0 ? n : e;
}
const be = (e, n, o) => e + (n - e) * o, nc = (e, n, o) => {
  const i = e * e, a = o * (n * n - i) + i;
  return a < 0 ? 0 : Math.sqrt(a);
}, l_ = [bc, wr, lo], u_ = (e) => l_.find((n) => n.test(e));
function Uh(e) {
  const n = u_(e);
  if (Mi(!!n, `'${e}' is not an animatable color. Use the equivalent color code instead.`, "color-not-animatable"), !n)
    return !1;
  let o = n.parse(e);
  return n === lo && (o = a_(o)), o;
}
const Hh = (e, n) => {
  const o = Uh(e), i = Uh(n);
  if (!o || !i)
    return ba(e, n);
  const a = { ...o };
  return (f) => (a.red = nc(o.red, i.red, f), a.green = nc(o.green, i.green, f), a.blue = nc(o.blue, i.blue, f), a.alpha = be(o.alpha, i.alpha, f), wr.transform(a));
}, Cc = /* @__PURE__ */ new Set(["none", "hidden"]);
function c_(e, n) {
  return Cc.has(e) ? (o) => o <= 0 ? e : n : (o) => o >= 1 ? n : e;
}
function d_(e, n) {
  return (o) => be(e, n, o);
}
function Fd(e) {
  return typeof e == "number" ? d_ : typeof e == "string" ? Nd(e) ? ba : Be.test(e) ? Hh : m_ : Array.isArray(e) ? av : typeof e == "object" ? Be.test(e) ? Hh : f_ : ba;
}
function av(e, n) {
  const o = [...e], i = o.length, a = e.map((f, d) => Fd(f)(f, n[d]));
  return (f) => {
    for (let d = 0; d < i; d++)
      o[d] = a[d](f);
    return o;
  };
}
function f_(e, n) {
  const o = { ...e, ...n }, i = {};
  for (const a in o)
    e[a] !== void 0 && n[a] !== void 0 && (i[a] = Fd(e[a])(e[a], n[a]));
  return (a) => {
    for (const f in i)
      o[f] = i[f](a);
    return o;
  };
}
function p_(e, n) {
  const o = [], i = { color: 0, var: 0, number: 0 };
  for (let a = 0; a < n.values.length; a++) {
    const f = n.types[a], d = e.indexes[f][i[f]], p = e.values[d] ?? 0;
    o[a] = p, i[f]++;
  }
  return o;
}
const m_ = (e, n) => {
  const o = Wt.createTransformer(n), i = ho(e), a = ho(n);
  return i.indexes.var.length === a.indexes.var.length && i.indexes.color.length === a.indexes.color.length && i.indexes.number.length >= a.indexes.number.length ? Cc.has(e) && !a.values.length || Cc.has(n) && !i.values.length ? c_(e, n) : Ri(av(p_(i, a), a.values), o) : (Mi(!0, `Complex values '${e}' and '${n}' too different to mix. Ensure all colors are of the same type, and that each contains the same quantity of number and color values. Falling back to instant transition.`, "complex-values-different"), ba(e, n));
};
function lv(e, n, o) {
  return typeof e == "number" && typeof n == "number" && typeof o == "number" ? be(e, n, o) : Fd(e)(e, n);
}
const h_ = (e) => {
  const n = ({ timestamp: o }) => e(o);
  return {
    start: (o = !0) => Ce.update(n, o),
    stop: () => Xn(n),
    /**
     * If we're processing this frame we can use the
     * framelocked timestamp to keep things in sync.
     */
    now: () => Je.isProcessing ? Je.timestamp : lt.now()
  };
}, uv = (e, n, o = 10) => {
  let i = "";
  const a = Math.max(Math.round(n / o), 2);
  for (let f = 0; f < a; f++)
    i += Math.round(e(f / (a - 1)) * 1e4) / 1e4 + ", ";
  return `linear(${i.substring(0, i.length - 2)})`;
}, Ca = 2e4;
function Od(e) {
  let n = 0;
  const o = 50;
  let i = e.next(n);
  for (; !i.done && n < Ca; )
    n += o, i = e.next(n);
  return n >= Ca ? 1 / 0 : n;
}
function y_(e, n = 100, o) {
  const i = o({ ...e, keyframes: [0, n] }), a = Math.min(Od(i), Ca);
  return {
    type: "keyframes",
    ease: (f) => i.next(a * f).value / n,
    duration: /* @__PURE__ */ Nt(a)
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
function Pc(e, n) {
  return e * Math.sqrt(1 - n * n);
}
const g_ = 12;
function v_(e, n, o) {
  let i = o;
  for (let a = 1; a < g_; a++)
    i = i - e(i) / n(i);
  return i;
}
const rc = 1e-3;
function S_({ duration: e = Fe.duration, bounce: n = Fe.bounce, velocity: o = Fe.velocity, mass: i = Fe.mass }) {
  let a, f;
  Mi(e <= /* @__PURE__ */ gt(Fe.maxDuration), "Spring duration must be 10 seconds or less", "spring-duration-limit");
  let d = 1 - n;
  d = sn(Fe.minDamping, Fe.maxDamping, d), e = sn(Fe.minDuration, Fe.maxDuration, /* @__PURE__ */ Nt(e)), d < 1 ? (a = (y) => {
    const S = y * d, l = S * e, c = S - o, v = Pc(y, d), w = Math.exp(-l);
    return rc - c / v * w;
  }, f = (y) => {
    const l = y * d * e, c = l * o + o, v = Math.pow(d, 2) * Math.pow(y, 2) * e, w = Math.exp(-l), T = Pc(Math.pow(y, 2), d);
    return (-a(y) + rc > 0 ? -1 : 1) * ((c - v) * w) / T;
  }) : (a = (y) => {
    const S = Math.exp(-y * e), l = (y - o) * e + 1;
    return -rc + S * l;
  }, f = (y) => {
    const S = Math.exp(-y * e), l = (o - y) * (e * e);
    return S * l;
  });
  const p = 5 / e, m = v_(a, f, p);
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
      damping: d * 2 * Math.sqrt(i * y),
      duration: e
    };
  }
}
const w_ = ["duration", "bounce"], x_ = ["stiffness", "damping", "mass"];
function Wh(e, n) {
  return n.some((o) => e[o] !== void 0);
}
function __(e) {
  let n = {
    velocity: Fe.velocity,
    stiffness: Fe.stiffness,
    damping: Fe.damping,
    mass: Fe.mass,
    isResolvedFromDuration: !1,
    ...e
  };
  if (!Wh(e, x_) && Wh(e, w_))
    if (n.velocity = 0, e.visualDuration) {
      const o = e.visualDuration, i = 2 * Math.PI / (o * 1.2), a = i * i, f = 2 * sn(0.05, 1, 1 - (e.bounce || 0)) * Math.sqrt(a);
      n = {
        ...n,
        mass: Fe.mass,
        stiffness: a,
        damping: f
      };
    } else {
      const o = S_({ ...e, velocity: 0 });
      n = {
        ...n,
        ...o,
        mass: Fe.mass
      }, n.isResolvedFromDuration = !0;
    }
  return n;
}
function Pa(e = Fe.visualDuration, n = Fe.bounce) {
  const o = typeof e != "object" ? {
    visualDuration: e,
    keyframes: [0, 1],
    bounce: n
  } : e;
  let { restSpeed: i, restDelta: a } = o;
  const f = o.keyframes[0], d = o.keyframes[o.keyframes.length - 1], p = { done: !1, value: f }, { stiffness: m, damping: y, mass: S, duration: l, velocity: c, isResolvedFromDuration: v } = __({
    ...o,
    velocity: -/* @__PURE__ */ Nt(o.velocity || 0)
  }), w = c || 0, T = y / (2 * Math.sqrt(m * S)), A = d - f, _ = /* @__PURE__ */ Nt(Math.sqrt(m / S)), C = Math.abs(A) < 5;
  i || (i = C ? Fe.restSpeed.granular : Fe.restSpeed.default), a || (a = C ? Fe.restDelta.granular : Fe.restDelta.default);
  let E, D, O, W, H, Y;
  if (T < 1)
    O = Pc(_, T), W = (w + T * _ * A) / O, E = (X) => {
      const se = Math.exp(-T * _ * X);
      return d - se * (W * Math.sin(O * X) + A * Math.cos(O * X));
    }, H = T * _ * W + A * O, Y = T * _ * A - W * O, D = (X) => Math.exp(-T * _ * X) * (H * Math.sin(O * X) + Y * Math.cos(O * X));
  else if (T === 1) {
    E = (se) => d - Math.exp(-_ * se) * (A + (w + _ * A) * se);
    const X = w + _ * A;
    D = (se) => Math.exp(-_ * se) * (_ * X * se - w);
  } else {
    const X = _ * Math.sqrt(T * T - 1);
    E = (ce) => {
      const ye = Math.exp(-T * _ * ce), ee = Math.min(X * ce, 300);
      return d - ye * ((w + T * _ * A) * Math.sinh(ee) + X * A * Math.cosh(ee)) / X;
    };
    const se = (w + T * _ * A) / X, Z = T * _ * se - A * X, de = T * _ * A - se * X;
    D = (ce) => {
      const ye = Math.exp(-T * _ * ce), ee = Math.min(X * ce, 300);
      return ye * (Z * Math.sinh(ee) + de * Math.cosh(ee));
    };
  }
  const L = {
    calculatedDuration: v && l || null,
    velocity: (X) => /* @__PURE__ */ gt(D(X)),
    next: (X) => {
      if (!v && T < 1) {
        const Z = Math.exp(-T * _ * X), de = Math.sin(O * X), ce = Math.cos(O * X), ye = d - Z * (W * de + A * ce), ee = /* @__PURE__ */ gt(Z * (H * de + Y * ce));
        return p.done = Math.abs(ee) <= i && Math.abs(d - ye) <= a, p.value = p.done ? d : ye, p;
      }
      const se = E(X);
      if (v)
        p.done = X >= l;
      else {
        const Z = /* @__PURE__ */ gt(D(X));
        p.done = Math.abs(Z) <= i && Math.abs(d - se) <= a;
      }
      return p.value = p.done ? d : se, p;
    },
    toString: () => {
      const X = Math.min(Od(L), Ca), se = uv((Z) => L.next(X * Z).value, X, 30);
      return X + "ms " + se;
    },
    toTransition: () => {
    }
  };
  return L;
}
Pa.applyToOptions = (e) => {
  const n = y_(e, 100, Pa);
  return e.ease = n.ease, e.duration = /* @__PURE__ */ gt(n.duration), e.type = "keyframes", e;
};
const T_ = 5;
function cv(e, n, o) {
  const i = Math.max(n - T_, 0);
  return /* @__PURE__ */ Ug(o - e(i), n - i);
}
function Ec({ keyframes: e, velocity: n = 0, power: o = 0.8, timeConstant: i = 325, bounceDamping: a = 10, bounceStiffness: f = 500, modifyTarget: d, min: p, max: m, restDelta: y = 0.5, restSpeed: S }) {
  const l = e[0], c = {
    done: !1,
    value: l
  }, v = (Y) => p !== void 0 && Y < p || m !== void 0 && Y > m, w = (Y) => p === void 0 ? m : m === void 0 || Math.abs(p - Y) < Math.abs(m - Y) ? p : m;
  let T = o * n;
  const A = l + T, _ = d === void 0 ? A : d(A);
  _ !== A && (T = _ - l);
  const C = (Y) => -T * Math.exp(-Y / i), E = (Y) => _ + C(Y), D = (Y) => {
    const L = C(Y), X = E(Y);
    c.done = Math.abs(L) <= y, c.value = c.done ? _ : X;
  };
  let O, W;
  const H = (Y) => {
    v(c.value) && (O = Y, W = Pa({
      keyframes: [c.value, w(c.value)],
      velocity: cv(E, Y, c.value),
      // TODO: This should be passing * 1000
      damping: a,
      stiffness: f,
      restDelta: y,
      restSpeed: S
    }));
  };
  return H(0), {
    calculatedDuration: null,
    next: (Y) => {
      let L = !1;
      return !W && O === void 0 && (L = !0, D(Y), H(Y)), O !== void 0 && Y >= O ? W.next(Y - O) : (!L && D(Y), c);
    }
  };
}
function k_(e, n, o) {
  const i = [], a = o || Qn.mix || lv, f = e.length - 1;
  for (let d = 0; d < f; d++) {
    let p = a(e[d], e[d + 1]);
    if (n) {
      const m = Array.isArray(n) ? n[d] || jt : n;
      p = Ri(m, p);
    }
    i.push(p);
  }
  return i;
}
function A_(e, n, { clamp: o = !0, ease: i, mixer: a } = {}) {
  const f = e.length;
  if (Pr(f === n.length, "Both input and output ranges must be the same length", "range-length"), f === 1)
    return () => n[0];
  if (f === 2 && n[0] === n[1])
    return () => n[1];
  const d = e[0] === e[1];
  e[0] > e[f - 1] && (e = [...e].reverse(), n = [...n].reverse());
  const p = k_(n, i, a), m = p.length, y = (S) => {
    if (d && S < e[0])
      return n[0];
    let l = 0;
    if (m > 1)
      for (; l < e.length - 2 && !(S < e[l + 1]); l++)
        ;
    const c = /* @__PURE__ */ Ti(e[l], e[l + 1], S);
    return p[l](c);
  };
  return o ? (S) => y(sn(e[0], e[f - 1], S)) : y;
}
function b_(e, n) {
  const o = e[e.length - 1];
  for (let i = 1; i <= n; i++) {
    const a = /* @__PURE__ */ Ti(0, n, i);
    e.push(be(o, 1, a));
  }
}
function C_(e) {
  const n = [0];
  return b_(n, e.length - 1), n;
}
function P_(e, n) {
  return e.map((o) => o * n);
}
function E_(e, n) {
  return e.map(() => n || Jg).splice(0, e.length - 1);
}
function gi({ duration: e = 300, keyframes: n, times: o, ease: i = "easeInOut" }) {
  const a = /* @__PURE__ */ L1(i) ? i.map(Vh) : Vh(i), f = {
    done: !1,
    value: n[0]
  }, d = P_(
    // Only use the provided offsets if they're the correct length
    // TODO Maybe we should warn here if there's a length mismatch
    o && o.length === n.length ? o : C_(n),
    e
  ), p = A_(d, n, {
    ease: Array.isArray(a) ? a : E_(n, a)
  });
  return {
    calculatedDuration: e,
    next: (m) => (f.value = p(m), f.done = m >= e, f)
  };
}
const M_ = (e) => e !== null;
function Ha(e, { repeat: n, repeatType: o = "loop" }, i, a = 1) {
  const f = e.filter(M_), p = a < 0 || n && o !== "loop" && n % 2 === 1 ? 0 : f.length - 1;
  return !p || i === void 0 ? f[p] : i;
}
const R_ = {
  decay: Ec,
  inertia: Ec,
  tween: gi,
  keyframes: gi,
  spring: Pa
};
function dv(e) {
  typeof e.type == "string" && (e.type = R_[e.type]);
}
class Ld {
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
const D_ = (e) => e / 100;
class Ea extends Ld {
  constructor(n) {
    super(), this.state = "idle", this.startTime = null, this.isStopped = !1, this.currentTime = 0, this.holdTime = null, this.playbackSpeed = 1, this.delayState = {
      done: !1,
      value: void 0
    }, this.stop = () => {
      var i, a;
      const { motionValue: o } = this.options;
      o && o.updatedAt !== lt.now() && this.tick(lt.now()), this.isStopped = !0, this.state !== "idle" && (this.teardown(), (a = (i = this.options).onStop) == null || a.call(i));
    }, this.options = n, this.initAnimation(), this.play(), n.autoplay === !1 && this.pause();
  }
  initAnimation() {
    const { options: n } = this;
    dv(n);
    const { type: o = gi, repeat: i = 0, repeatDelay: a = 0, repeatType: f, velocity: d = 0 } = n;
    let { keyframes: p } = n;
    const m = o || gi;
    m !== gi && typeof p[0] != "number" && (this.mixKeyframes = Ri(D_, lv(p[0], p[1])), p = [0, 100]);
    const y = m({ ...n, keyframes: p });
    f === "mirror" && (this.mirroredGenerator = m({
      ...n,
      keyframes: [...p].reverse(),
      velocity: -d
    })), y.calculatedDuration === null && (y.calculatedDuration = Od(y));
    const { calculatedDuration: S } = y;
    this.calculatedDuration = S, this.resolvedDuration = S + a, this.totalDuration = this.resolvedDuration * (i + 1) - a, this.generator = y;
  }
  updateTime(n) {
    const o = Math.round(n - this.startTime) * this.playbackSpeed;
    this.holdTime !== null ? this.currentTime = this.holdTime : this.currentTime = o;
  }
  tick(n, o = !1) {
    const { generator: i, totalDuration: a, mixKeyframes: f, mirroredGenerator: d, resolvedDuration: p, calculatedDuration: m } = this;
    if (this.startTime === null)
      return i.next(0);
    const { delay: y = 0, keyframes: S, repeat: l, repeatType: c, repeatDelay: v, type: w, onUpdate: T, finalKeyframe: A } = this.options;
    this.speed > 0 ? this.startTime = Math.min(this.startTime, n) : this.speed < 0 && (this.startTime = Math.min(n - a / this.speed, this.startTime)), o ? this.currentTime = n : this.updateTime(n);
    const _ = this.currentTime - y * (this.playbackSpeed >= 0 ? 1 : -1), C = this.playbackSpeed >= 0 ? _ < 0 : _ > a;
    this.currentTime = Math.max(_, 0), this.state === "finished" && this.holdTime === null && (this.currentTime = a);
    let E = this.currentTime, D = i;
    if (l) {
      const Y = Math.min(this.currentTime, a) / p;
      let L = Math.floor(Y), X = Y % 1;
      !X && Y >= 1 && (X = 1), X === 1 && L--, L = Math.min(L, l + 1), !!(L % 2) && (c === "reverse" ? (X = 1 - X, v && (X -= v / p)) : c === "mirror" && (D = d)), E = sn(0, 1, X) * p;
    }
    let O;
    C ? (this.delayState.value = S[0], O = this.delayState) : O = D.next(E), f && !C && (O.value = f(O.value));
    let { done: W } = O;
    !C && m !== null && (W = this.playbackSpeed >= 0 ? this.currentTime >= a : this.currentTime <= 0);
    const H = this.holdTime === null && (this.state === "finished" || this.state === "running" && W);
    return H && w !== Ec && (O.value = Ha(S, this.options, A, this.speed)), T && T(O.value), H && this.finish(), O;
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
    return /* @__PURE__ */ Nt(this.calculatedDuration);
  }
  get iterationDuration() {
    const { delay: n = 0 } = this.options || {};
    return this.duration + /* @__PURE__ */ Nt(n);
  }
  get time() {
    return /* @__PURE__ */ Nt(this.currentTime);
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
    return cv((i) => this.generator.next(i).value, n, o);
  }
  get speed() {
    return this.playbackSpeed;
  }
  set speed(n) {
    const o = this.playbackSpeed !== n;
    o && this.driver && this.updateTime(lt.now()), this.playbackSpeed = n, o && this.driver && (this.time = /* @__PURE__ */ Nt(this.currentTime));
  }
  play() {
    var a, f;
    if (this.isStopped)
      return;
    const { driver: n = h_, startTime: o } = this.options;
    this.driver || (this.driver = n((d) => this.tick(d))), (f = (a = this.options).onPlay) == null || f.call(a);
    const i = this.driver.now();
    this.state === "finished" ? (this.updateFinished(), this.startTime = i) : this.holdTime !== null ? this.startTime = i - this.holdTime : this.startTime || (this.startTime = o ?? i), this.state === "finished" && this.speed < 0 && (this.startTime += this.calculatedDuration), this.holdTime = null, this.state = "running", this.driver.start();
  }
  pause() {
    this.state = "paused", this.updateTime(lt.now()), this.holdTime = this.currentTime;
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
function N_(e) {
  for (let n = 1; n < e.length; n++)
    e[n] ?? (e[n] = e[n - 1]);
}
const xr = (e) => e * 180 / Math.PI, Mc = (e) => {
  const n = xr(Math.atan2(e[1], e[0]));
  return Rc(n);
}, j_ = {
  x: 4,
  y: 5,
  translateX: 4,
  translateY: 5,
  scaleX: 0,
  scaleY: 3,
  scale: (e) => (Math.abs(e[0]) + Math.abs(e[3])) / 2,
  rotate: Mc,
  rotateZ: Mc,
  skewX: (e) => xr(Math.atan(e[1])),
  skewY: (e) => xr(Math.atan(e[2])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[2])) / 2
}, Rc = (e) => (e = e % 360, e < 0 && (e += 360), e), Gh = Mc, Kh = (e) => Math.sqrt(e[0] * e[0] + e[1] * e[1]), Yh = (e) => Math.sqrt(e[4] * e[4] + e[5] * e[5]), I_ = {
  x: 12,
  y: 13,
  z: 14,
  translateX: 12,
  translateY: 13,
  translateZ: 14,
  scaleX: Kh,
  scaleY: Yh,
  scale: (e) => (Kh(e) + Yh(e)) / 2,
  rotateX: (e) => Rc(xr(Math.atan2(e[6], e[5]))),
  rotateY: (e) => Rc(xr(Math.atan2(-e[2], e[0]))),
  rotateZ: Gh,
  rotate: Gh,
  skewX: (e) => xr(Math.atan(e[4])),
  skewY: (e) => xr(Math.atan(e[1])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[4])) / 2
};
function Dc(e) {
  return e.includes("scale") ? 1 : 0;
}
function Nc(e, n) {
  if (!e || e === "none")
    return Dc(n);
  const o = e.match(/^matrix3d\(([-\d.e\s,]+)\)$/u);
  let i, a;
  if (o)
    i = I_, a = o;
  else {
    const p = e.match(/^matrix\(([-\d.e\s,]+)\)$/u);
    i = j_, a = p;
  }
  if (!a)
    return Dc(n);
  const f = i[n], d = a[1].split(",").map(O_);
  return typeof f == "function" ? f(d) : d[f];
}
const F_ = (e, n) => {
  const { transform: o = "none" } = getComputedStyle(e);
  return Nc(o, n);
};
function O_(e) {
  return parseFloat(e.trim());
}
const wo = [
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
], xo = /* @__PURE__ */ new Set([...wo, "pathRotation"]), Qh = (e) => e === So || e === re, L_ = /* @__PURE__ */ new Set(["x", "y", "z"]), V_ = wo.filter((e) => !L_.has(e));
function z_(e) {
  const n = [];
  return V_.forEach((o) => {
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
  x: (e, { transform: n }) => Nc(n, "x"),
  y: (e, { transform: n }) => Nc(n, "y")
};
Gn.translateX = Gn.x;
Gn.translateY = Gn.y;
const Tr = /* @__PURE__ */ new Set();
let jc = !1, Ic = !1, Fc = !1;
function fv() {
  if (Ic) {
    const e = Array.from(Tr).filter((i) => i.needsMeasurement), n = new Set(e.map((i) => i.element)), o = /* @__PURE__ */ new Map();
    n.forEach((i) => {
      const a = z_(i);
      a.length && (o.set(i, a), i.render());
    }), e.forEach((i) => i.measureInitialState()), n.forEach((i) => {
      i.render();
      const a = o.get(i);
      a && a.forEach(([f, d]) => {
        var p;
        (p = i.getValue(f)) == null || p.set(d);
      });
    }), e.forEach((i) => i.measureEndState()), e.forEach((i) => {
      i.suspendedScrollY !== void 0 && window.scrollTo(0, i.suspendedScrollY);
    });
  }
  Ic = !1, jc = !1, Tr.forEach((e) => e.complete(Fc)), Tr.clear();
}
function pv() {
  Tr.forEach((e) => {
    e.readKeyframes(), e.needsMeasurement && (Ic = !0);
  });
}
function B_() {
  Fc = !0, pv(), fv(), Fc = !1;
}
class Vd {
  constructor(n, o, i, a, f, d = !1) {
    this.state = "pending", this.isAsync = !1, this.needsMeasurement = !1, this.unresolvedKeyframes = [...n], this.onComplete = o, this.name = i, this.motionValue = a, this.element = f, this.isAsync = d;
  }
  scheduleResolve() {
    this.state = "scheduled", this.isAsync ? (Tr.add(this), jc || (jc = !0, Ce.read(pv), Ce.resolveKeyframes(fv))) : (this.readKeyframes(), this.complete());
  }
  readKeyframes() {
    const { unresolvedKeyframes: n, name: o, element: i, motionValue: a } = this;
    if (n[0] === null) {
      const f = a == null ? void 0 : a.get(), d = n[n.length - 1];
      if (f !== void 0)
        n[0] = f;
      else if (i && o) {
        const p = i.readValue(o, d);
        p != null && (n[0] = p);
      }
      n[0] === void 0 && (n[0] = d), a && f === void 0 && a.set(n[0]);
    }
    N_(n);
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
    this.state = "complete", this.onComplete(this.unresolvedKeyframes, this.finalKeyframe, n), Tr.delete(this);
  }
  cancel() {
    this.state === "scheduled" && (Tr.delete(this), this.state = "pending");
  }
  resume() {
    this.state === "pending" && this.scheduleResolve();
  }
}
const $_ = (e) => e.startsWith("--");
function mv(e, n, o) {
  $_(n) ? e.style.setProperty(n, o) : e.style[n] = o;
}
const U_ = {};
function hv(e, n) {
  const o = /* @__PURE__ */ $g(e);
  return () => U_[n] ?? o();
}
const H_ = /* @__PURE__ */ hv(() => window.ScrollTimeline !== void 0, "scrollTimeline"), yv = /* @__PURE__ */ hv(() => {
  try {
    document.createElement("div").animate({ opacity: 0 }, { easing: "linear(0, 1)" });
  } catch {
    return !1;
  }
  return !0;
}, "linearEasing"), mi = ([e, n, o, i]) => `cubic-bezier(${e}, ${n}, ${o}, ${i})`, Xh = {
  linear: "linear",
  ease: "ease",
  easeIn: "ease-in",
  easeOut: "ease-out",
  easeInOut: "ease-in-out",
  circIn: /* @__PURE__ */ mi([0, 0.65, 0.55, 1]),
  circOut: /* @__PURE__ */ mi([0.55, 0, 1, 0.45]),
  backIn: /* @__PURE__ */ mi([0.31, 0.01, 0.66, -0.59]),
  backOut: /* @__PURE__ */ mi([0.33, 1.53, 0.69, 0.99])
};
function gv(e, n) {
  if (e)
    return typeof e == "function" ? yv() ? uv(e, n) : "ease-out" : /* @__PURE__ */ qg(e) ? mi(e) : Array.isArray(e) ? e.map((o) => gv(o, n) || Xh.easeOut) : Xh[e];
}
function W_(e, n, o, { delay: i = 0, duration: a = 300, repeat: f = 0, repeatType: d = "loop", ease: p = "easeOut", times: m } = {}, y = void 0) {
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
    iterations: f + 1,
    direction: d === "reverse" ? "alternate" : "normal"
  };
  return y && (c.pseudoElement = y), e.animate(S, c);
}
function vv(e) {
  return typeof e == "function" && "applyToOptions" in e;
}
function G_({ type: e, ...n }) {
  return vv(e) && yv() ? e.applyToOptions(n) : (n.duration ?? (n.duration = 300), n.ease ?? (n.ease = "easeOut"), n);
}
class Sv extends Ld {
  constructor(n) {
    if (super(), this.finishedTime = null, this.isStopped = !1, this.manualStartTime = null, !n)
      return;
    const { element: o, name: i, keyframes: a, pseudoElement: f, allowFlatten: d = !1, finalKeyframe: p, onComplete: m } = n;
    this.isPseudoElement = !!f, this.allowFlatten = d, this.options = n, Pr(typeof n.type != "string", `Mini animate() doesn't support "type" as a string.`, "mini-spring");
    const y = G_(n);
    this.animation = W_(o, i, a, y, f), y.autoplay === !1 && this.animation.pause(), this.animation.onfinish = () => {
      if (this.finishedTime = this.time, !f) {
        const S = Ha(a, this.options, p, this.speed);
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
    return /* @__PURE__ */ Nt(Number(n));
  }
  get iterationDuration() {
    const { delay: n = 0 } = this.options || {};
    return this.duration + /* @__PURE__ */ Nt(n);
  }
  get time() {
    return /* @__PURE__ */ Nt(Number(this.animation.currentTime) || 0);
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
    var f;
    return this.allowFlatten && ((f = this.animation.effect) == null || f.updateTiming({ easing: "linear" })), this.animation.onfinish = null, n && H_() ? (this.animation.timeline = n, o && (this.animation.rangeStart = o), i && (this.animation.rangeEnd = i), jt) : a(this);
  }
}
const wv = {
  anticipate: Qg,
  backInOut: Yg,
  circInOut: Zg
};
function K_(e) {
  return e in wv;
}
function Y_(e) {
  typeof e.ease == "string" && K_(e.ease) && (e.ease = wv[e.ease]);
}
const oc = 10;
class Q_ extends Sv {
  constructor(n) {
    Y_(n), dv(n), super(n), n.startTime !== void 0 && n.autoplay !== !1 && (this.startTime = n.startTime), this.options = n;
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
    const { motionValue: o, onUpdate: i, onComplete: a, element: f, ...d } = this.options;
    if (!o)
      return;
    if (n !== void 0) {
      o.set(n);
      return;
    }
    const p = new Ea({
      ...d,
      autoplay: !1
    }), m = Math.max(oc, lt.now() - this.startTime), y = sn(0, oc, m - oc), S = p.sample(m).value, { name: l } = this.options;
    f && l && mv(f, l, S), o.setWithVelocity(p.sample(Math.max(0, m - y)).value, S, y), p.stop();
  }
}
const Zh = (e, n) => n === "zIndex" ? !1 : !!(typeof e == "number" || Array.isArray(e) || typeof e == "string" && // It's animatable if we have a string
(Wt.test(e) || e === "0") && // And it contains numbers and/or colors
!e.startsWith("url("));
function X_(e) {
  const n = e[0];
  if (e.length === 1)
    return !0;
  for (let o = 0; o < e.length; o++)
    if (e[o] !== n)
      return !0;
}
function Z_(e, n, o, i) {
  const a = e[0];
  if (a === null)
    return !1;
  if (n === "display" || n === "visibility")
    return !0;
  const f = e[e.length - 1], d = Zh(a, n), p = Zh(f, n);
  return Mi(d === p, `You are trying to animate ${n} from "${a}" to "${f}". "${d ? f : a}" is not an animatable value.`, "value-not-animatable"), !d || !p ? !1 : X_(e) || (o === "spring" || vv(o)) && i;
}
function Oc(e) {
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
]), J_ = /^(?:oklch|oklab|lab|lch|color|color-mix|light-dark)\(/;
function q_(e) {
  for (let n = 0; n < e.length; n++)
    if (typeof e[n] == "string" && J_.test(e[n]))
      return !0;
  return !1;
}
const eT = /* @__PURE__ */ new Set([
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
]), tT = /* @__PURE__ */ $g(() => Object.hasOwnProperty.call(Element.prototype, "animate"));
function nT(e) {
  var l;
  const { motionValue: n, name: o, repeatDelay: i, repeatType: a, damping: f, type: d, keyframes: p } = e;
  if (!(((l = n == null ? void 0 : n.owner) == null ? void 0 : l.current) instanceof HTMLElement))
    return !1;
  const { onUpdate: y, transformTemplate: S } = n.owner.getProps();
  return tT() && o && /**
   * Force WAAPI for color properties with browser-only color formats
   * (oklch, oklab, lab, lch, etc.) that the JS animation path can't parse.
   */
  (xv.has(o) || eT.has(o) && q_(p)) && (o !== "transform" || !S) && /**
   * If we're outputting values to onUpdate then we can't use WAAPI as there's
   * no way to read the value from WAAPI every frame.
   */
  !y && !i && a !== "mirror" && f !== 0 && d !== "inertia";
}
const rT = 40;
class oT extends Ld {
  constructor({ autoplay: n = !0, delay: o = 0, type: i = "keyframes", repeat: a = 0, repeatDelay: f = 0, repeatType: d = "loop", keyframes: p, name: m, motionValue: y, element: S, ...l }) {
    var w;
    super(), this.stop = () => {
      var T, A;
      this._animation && (this._animation.stop(), (T = this.stopTimeline) == null || T.call(this)), (A = this.keyframeResolver) == null || A.cancel();
    }, this.createdAt = lt.now();
    const c = {
      autoplay: n,
      delay: o,
      type: i,
      repeat: a,
      repeatDelay: f,
      repeatType: d,
      name: m,
      motionValue: y,
      element: S,
      ...l
    }, v = (S == null ? void 0 : S.KeyframeResolver) || Vd;
    this.keyframeResolver = new v(p, (T, A, _) => this.onKeyframesResolved(T, A, c, !_), m, y, S), (w = this.keyframeResolver) == null || w.scheduleResolve();
  }
  onKeyframesResolved(n, o, i, a) {
    var _, C;
    this.keyframeResolver = void 0;
    const { name: f, type: d, velocity: p, delay: m, isHandoff: y, onUpdate: S } = i;
    this.resolvedAt = lt.now();
    let l = !0;
    Z_(n, f, d, p) || (l = !1, (Qn.instantAnimations || !m) && (S == null || S(Ha(n, i, o))), n[0] = n[n.length - 1], Oc(i), i.repeat = 0);
    const v = {
      startTime: a ? this.resolvedAt ? this.resolvedAt - this.createdAt > rT ? this.resolvedAt : this.createdAt : this.createdAt : void 0,
      finalKeyframe: o,
      ...i,
      keyframes: n
    }, w = l && !y && nT(v), T = (C = (_ = v.motionValue) == null ? void 0 : _.owner) == null ? void 0 : C.current;
    let A;
    if (w)
      try {
        A = new Q_({
          ...v,
          element: T
        });
      } catch {
        A = new Ea(v);
      }
    else
      A = new Ea(v);
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
    return this._animation || ((n = this.keyframeResolver) == null || n.resume(), B_()), this._animation;
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
  const f = Array.from(e).sort((y, S) => y.sortNodePosition(S)).indexOf(n), d = e.size, p = (d - 1) * i;
  return typeof o == "function" ? o(f, d) : a === 1 ? f * i : p - f * i;
}
const Jh = 30, iT = (e) => !isNaN(parseFloat(e));
class sT {
  /**
   * @param init - The initiating value
   * @param config - Optional configuration options
   *
   * -  `transformer`: A function to transform incoming values with.
   */
  constructor(n, o = {}) {
    this.canTrackVelocity = null, this.events = {}, this.updateAndNotify = (i) => {
      var f;
      const a = lt.now();
      if (this.updatedAt !== a && this.setPrevFrameValue(), this.prev = this.current, this.setCurrent(i), this.current !== this.prev && ((f = this.events.change) == null || f.notify(this.current), this.dependents))
        for (const d of this.dependents)
          d.dirty();
    }, this.hasAnimated = !1, this.setCurrent(n), this.owner = o.owner;
  }
  setCurrent(n) {
    this.current = n, this.updatedAt = lt.now(), this.canTrackVelocity === null && n !== void 0 && (this.canTrackVelocity = iT(this.current));
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
    this.events[n] || (this.events[n] = new Md());
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
    const n = lt.now();
    if (!this.canTrackVelocity || this.prevFrameValue === void 0 || n - this.updatedAt > Jh)
      return 0;
    const o = Math.min(this.updatedAt - this.prevUpdatedAt, Jh);
    return /* @__PURE__ */ Ug(parseFloat(this.current) - parseFloat(this.prevFrameValue), o);
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
function yo(e, n) {
  return new sT(e, n);
}
function Tv(e, n) {
  if (e != null && e.inherit && n) {
    const { inherit: o, ...i } = e;
    return { ...n, ...i };
  }
  return e;
}
function zd(e, n) {
  const o = (e == null ? void 0 : e[n]) ?? (e == null ? void 0 : e.default) ?? e;
  return o !== e ? Tv(o, e) : o;
}
const aT = {
  type: "spring",
  stiffness: 500,
  damping: 25,
  restSpeed: 10
}, lT = (e) => ({
  type: "spring",
  stiffness: 550,
  damping: e === 0 ? 2 * Math.sqrt(550) : 30,
  restSpeed: 10
}), uT = {
  type: "keyframes",
  duration: 0.8
}, cT = {
  type: "keyframes",
  ease: [0.25, 0.1, 0.35, 1],
  duration: 0.3
}, dT = (e, { keyframes: n }) => n.length > 2 ? uT : xo.has(e) ? e.startsWith("scale") ? lT(n[1]) : aT : cT, fT = /* @__PURE__ */ new Set([
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
function pT(e) {
  for (const n in e)
    if (!fT.has(n))
      return !0;
  return !1;
}
const Bd = (e, n, o, i = {}, a, f) => (d) => {
  const p = zd(i, e) || {}, m = p.delay || i.delay || 0;
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
      d(), p.onComplete && p.onComplete();
    },
    name: e,
    motionValue: n,
    element: f ? void 0 : a
  };
  pT(p) || Object.assign(S, dT(e, S)), S.duration && (S.duration = /* @__PURE__ */ gt(S.duration)), S.repeatDelay && (S.repeatDelay = /* @__PURE__ */ gt(S.repeatDelay)), S.from !== void 0 && (S.keyframes[0] = S.from);
  let l = !1;
  if ((S.type === !1 || S.duration === 0 && !S.repeatDelay) && (Oc(S), S.delay === 0 && (l = !0)), (Qn.instantAnimations || Qn.skipAnimations || a != null && a.shouldSkipAnimations || p.skipAnimations) && (l = !0, Oc(S), S.delay = 0), S.allowFlatten = !p.type && !p.ease, l && !f && n.get() !== void 0) {
    const c = Ha(S.keyframes, p);
    if (c !== void 0) {
      Ce.update(() => {
        S.onUpdate(c), S.onComplete();
      });
      return;
    }
  }
  return p.isSync ? new Ea(S) : new oT(S);
}, mT = (
  // eslint-disable-next-line redos-detector/no-unsafe-regex -- false positive, as it can match a lot of words
  /^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u
);
function hT(e) {
  const n = mT.exec(e);
  if (!n)
    return [,];
  const [, o, i, a] = n;
  return [`--${o ?? i}`, a];
}
const yT = 4;
function kv(e, n, o = 1) {
  Pr(o <= yT, `Max CSS variable fallback depth detected in property "${e}". This may indicate a circular fallback dependency.`, "max-css-var-depth");
  const [i, a] = hT(e);
  if (!i)
    return;
  const f = window.getComputedStyle(n).getPropertyValue(i);
  if (f) {
    const d = f.trim();
    return Vg(d) ? parseFloat(d) : d;
  }
  return Nd(a) ? kv(a, n, o + 1) : a;
}
function qh(e) {
  const n = [{}, {}];
  return e == null || e.values.forEach((o, i) => {
    n[0][i] = o.get(), n[1][i] = o.getVelocity();
  }), n;
}
function $d(e, n, o, i) {
  if (typeof n == "function") {
    const [a, f] = qh(i);
    n = n(o !== void 0 ? o : e.custom, a, f);
  }
  if (typeof n == "string" && (n = e.variants && e.variants[n]), typeof n == "function") {
    const [a, f] = qh(i);
    n = n(o !== void 0 ? o : e.custom, a, f);
  }
  return n;
}
function kr(e, n, o) {
  const i = e.getProps();
  return $d(i, n, o !== void 0 ? o : i.custom, e);
}
const Av = /* @__PURE__ */ new Set([
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
  ...wo
]), Lc = (e) => Array.isArray(e);
function gT(e, n, o) {
  e.hasValue(n) ? e.getValue(n).set(o) : e.addValue(n, yo(o));
}
function vT(e) {
  return Lc(e) ? e[e.length - 1] || 0 : e;
}
function ST(e, n) {
  const o = kr(e, n);
  let { transitionEnd: i = {}, transition: a = {}, ...f } = o || {};
  f = { ...f, ...i };
  for (const d in f) {
    const p = vT(f[d]);
    gT(e, d, p);
  }
}
const qe = (e) => !!(e && e.getVelocity);
function wT(e) {
  return !!(qe(e) && e.add);
}
function Vc(e, n) {
  const o = e.getValue("willChange");
  if (wT(o))
    return o.add(n);
  if (!o && Qn.WillChange) {
    const i = new Qn.WillChange("auto");
    e.addValue("willChange", i), i.add(n);
  }
}
function Ud(e) {
  return e.replace(/([A-Z])/g, (n) => `-${n.toLowerCase()}`);
}
const xT = "framerAppearId", bv = "data-" + Ud(xT);
function Cv(e) {
  return e.props[bv];
}
function _T({ protectedKeys: e, needsAnimating: n }, o) {
  const i = e.hasOwnProperty(o) && n[o] !== !0;
  return n[o] = !1, i;
}
function Pv(e, n, { delay: o = 0, transitionOverride: i, type: a } = {}) {
  let { transition: f, transitionEnd: d, ...p } = n;
  const m = e.getDefaultTransition();
  f = f ? Tv(f, m) : m;
  const y = f == null ? void 0 : f.reduceMotion, S = f == null ? void 0 : f.skipAnimations;
  i && (f = i);
  const l = [], c = a && e.animationState && e.animationState.getState()[a], v = f == null ? void 0 : f.path;
  v && v.animateVisualElement(e, p, f, o, l);
  for (const w in p) {
    const T = e.getValue(w, e.latestValues[w] ?? null), A = p[w];
    if (A === void 0 || c && _T(c, w))
      continue;
    const _ = {
      delay: o,
      ...zd(f || {}, w)
    };
    S && (_.skipAnimations = !0);
    const C = T.get();
    if (C !== void 0 && !T.isAnimating() && !Array.isArray(A) && A === C && !_.velocity) {
      Ce.update(() => T.set(A));
      continue;
    }
    let E = !1;
    if (window.MotionHandoffAnimation) {
      const W = Cv(e);
      if (W) {
        const H = window.MotionHandoffAnimation(W, w, Ce);
        H !== null && (_.startTime = H, E = !0);
      }
    }
    Vc(e, w);
    const D = y ?? e.shouldReduceMotion;
    T.start(Bd(w, T, A, D && Av.has(w) ? { type: !1 } : _, e, E));
    const O = T.animation;
    O && l.push(O);
  }
  if (d) {
    const w = () => Ce.update(() => {
      d && ST(e, d);
    });
    l.length ? Promise.all(l).then(w) : w();
  }
  return l;
}
function zc(e, n, o = {}) {
  var m;
  const i = kr(e, n, o.type === "exit" ? (m = e.presenceContext) == null ? void 0 : m.custom : void 0);
  let { transition: a = e.getDefaultTransition() || {} } = i || {};
  o.transitionOverride && (a = o.transitionOverride);
  const f = i ? () => Promise.all(Pv(e, i, o)) : () => Promise.resolve(), d = e.variantChildren && e.variantChildren.size ? (y = 0) => {
    const { delayChildren: S = 0, staggerChildren: l, staggerDirection: c } = a;
    return TT(e, n, y, S, l, c, o);
  } : () => Promise.resolve(), { when: p } = a;
  if (p) {
    const [y, S] = p === "beforeChildren" ? [f, d] : [d, f];
    return y().then(() => S());
  } else
    return Promise.all([f(), d(o.delay)]);
}
function TT(e, n, o = 0, i = 0, a = 0, f = 1, d) {
  const p = [];
  for (const m of e.variantChildren)
    m.notify("AnimationStart", n), p.push(zc(m, n, {
      ...d,
      delay: o + (typeof i == "function" ? 0 : i) + _v(e.variantChildren, m, i, a, f)
    }).then(() => m.notify("AnimationComplete", n)));
  return Promise.all(p);
}
function kT(e, n, o = {}) {
  e.notify("AnimationStart", n);
  let i;
  if (Array.isArray(n)) {
    const a = n.map((f) => zc(e, f, o));
    i = Promise.all(a);
  } else if (typeof n == "string")
    i = zc(e, n, o);
  else {
    const a = typeof n == "function" ? kr(e, n, o.custom) : n;
    i = Promise.all(Pv(e, a, o));
  }
  return i.then(() => {
    e.notify("AnimationComplete", n);
  });
}
const AT = {
  test: (e) => e === "auto",
  parse: (e) => e
}, Ev = (e) => (n) => n.test(e), Mv = [So, re, on, hn, X1, Q1, AT], ey = (e) => Mv.find(Ev(e));
function bT(e) {
  return typeof e == "number" ? e === 0 : e !== null ? e === "none" || e === "0" || Bg(e) : !0;
}
const CT = /* @__PURE__ */ new Set(["brightness", "contrast", "saturate", "opacity"]);
function PT(e) {
  const [n, o] = e.slice(0, -1).split("(");
  if (n === "drop-shadow")
    return e;
  const [i] = o.match(jd) || [];
  if (!i)
    return e;
  const a = o.replace(i, "");
  let f = CT.has(n) ? 1 : 0;
  return i !== o && (f *= 100), n + "(" + f + a + ")";
}
const ET = /\b([a-z-]*)\(.*?\)/gu, Bc = {
  ...Wt,
  getAnimatableNone: (e) => {
    const n = e.match(ET);
    return n ? n.map(PT).join(" ") : e;
  }
}, $c = {
  ...Wt,
  getAnimatableNone: (e) => {
    const n = Wt.parse(e);
    return Wt.createTransformer(e)(n.map((i) => typeof i == "number" ? 0 : typeof i == "object" ? { ...i, alpha: 1 } : i));
  }
}, ty = {
  ...So,
  transform: Math.round
}, MT = {
  rotate: hn,
  /**
   * Internal channel for `transition.path` orientToPath. Composed onto
   * `rotate` at the transform-build sites so the user's `rotate` is
   * never read or overwritten. Not part of `transformPropOrder`.
   */
  pathRotation: hn,
  rotateX: hn,
  rotateY: hn,
  rotateZ: hn,
  scale: Xs,
  scaleX: Xs,
  scaleY: Xs,
  scaleZ: Xs,
  skew: hn,
  skewX: hn,
  skewY: hn,
  distance: re,
  translateX: re,
  translateY: re,
  translateZ: re,
  x: re,
  y: re,
  z: re,
  perspective: re,
  transformPerspective: re,
  opacity: ki,
  originX: Bh,
  originY: Bh,
  originZ: re
}, Ma = {
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
  ...MT,
  zIndex: ty,
  // SVG
  fillOpacity: ki,
  strokeOpacity: ki,
  numOctaves: ty
}, RT = {
  ...Ma,
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
  filter: Bc,
  WebkitFilter: Bc,
  mask: $c,
  WebkitMask: $c
}, Rv = (e) => RT[e], DT = /* @__PURE__ */ new Set([Bc, $c]);
function Dv(e, n) {
  let o = Rv(e);
  return DT.has(o) || (o = Wt), o.getAnimatableNone ? o.getAnimatableNone(n) : void 0;
}
const NT = /* @__PURE__ */ new Set(["auto", "none", "0"]);
function jT(e, n, o) {
  let i = 0, a;
  for (; i < e.length && !a; ) {
    const f = e[i];
    typeof f == "string" && !NT.has(f) && ho(f).values.length && (a = e[i]), i++;
  }
  if (a && o)
    for (const f of n)
      e[f] = Dv(o, a);
}
class IT extends Vd {
  constructor(n, o, i, a, f) {
    super(n, o, i, a, f, !0);
  }
  readKeyframes() {
    const { unresolvedKeyframes: n, element: o, name: i } = this;
    if (!o || !o.current)
      return;
    super.readKeyframes();
    for (let S = 0; S < n.length; S++) {
      let l = n[S];
      if (typeof l == "string" && (l = l.trim(), Nd(l))) {
        const c = kv(l, o.current);
        c !== void 0 && (n[S] = c), S === n.length - 1 && (this.finalKeyframe = l);
      }
    }
    if (this.resolveNoneKeyframes(), !Av.has(i) || n.length !== 2)
      return;
    const [a, f] = n, d = ey(a), p = ey(f), m = zh(a), y = zh(f);
    if (m !== y && Gn[i]) {
      this.needsMeasurement = !0;
      return;
    }
    if (d !== p)
      if (Qh(d) && Qh(p))
        for (let S = 0; S < n.length; S++) {
          const l = n[S];
          typeof l == "string" && (n[S] = parseFloat(l));
        }
      else Gn[i] && (this.needsMeasurement = !0);
  }
  resolveNoneKeyframes() {
    const { unresolvedKeyframes: n, name: o } = this, i = [];
    for (let a = 0; a < n.length; a++)
      (n[a] === null || bT(n[a])) && i.push(a);
    i.length && jT(n, i, o);
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
    const f = i.length - 1, d = i[f];
    i[f] = Gn[o](n.measureViewportBox(), window.getComputedStyle(n.current)), d !== null && this.finalKeyframe === void 0 && (this.finalKeyframe = d), (p = this.removedTransforms) != null && p.length && this.removedTransforms.forEach(([m, y]) => {
      n.getValue(m).set(y);
    }), this.resolveNoneKeyframes();
  }
}
function Nv(e, n, o) {
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
const Uc = (e, n) => n && typeof e == "number" ? n.transform(e) : e;
function fa(e) {
  return zg(e) && "offsetHeight" in e && !("ownerSVGElement" in e);
}
const { schedule: Hd } = /* @__PURE__ */ ev(queueMicrotask, !1), Ut = {
  x: !1,
  y: !1
};
function jv() {
  return Ut.x || Ut.y;
}
function FT(e) {
  return e === "x" || e === "y" ? Ut[e] ? null : (Ut[e] = !0, () => {
    Ut[e] = !1;
  }) : Ut.x || Ut.y ? null : (Ut.x = Ut.y = !0, () => {
    Ut.x = Ut.y = !1;
  });
}
function Iv(e, n) {
  const o = Nv(e), i = new AbortController(), a = {
    passive: !0,
    ...n,
    signal: i.signal
  };
  return [o, a, () => i.abort()];
}
function OT(e) {
  return !(e.pointerType === "touch" || jv());
}
function LT(e, n, o = {}) {
  const [i, a, f] = Iv(e, o);
  return i.forEach((d) => {
    let p = !1, m = !1, y;
    const S = () => {
      d.removeEventListener("pointerleave", w);
    }, l = (A) => {
      y && (y(A), y = void 0), S();
    }, c = (A) => {
      p = !1, window.removeEventListener("pointerup", c), window.removeEventListener("pointercancel", c), m && (m = !1, l(A));
    }, v = () => {
      p = !0, window.addEventListener("pointerup", c, a), window.addEventListener("pointercancel", c, a);
    }, w = (A) => {
      if (A.pointerType !== "touch") {
        if (p) {
          m = !0;
          return;
        }
        l(A);
      }
    }, T = (A) => {
      if (!OT(A))
        return;
      m = !1;
      const _ = n(d, A);
      typeof _ == "function" && (y = _, d.addEventListener("pointerleave", w, a));
    };
    d.addEventListener("pointerenter", T, a), d.addEventListener("pointerdown", v, a);
  }), f;
}
const Fv = (e, n) => n ? e === n ? !0 : Fv(e, n.parentElement) : !1, Wd = (e) => e.pointerType === "mouse" ? typeof e.button != "number" || e.button <= 0 : e.isPrimary !== !1, VT = /* @__PURE__ */ new Set([
  "BUTTON",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "A"
]);
function zT(e) {
  return VT.has(e.tagName) || e.isContentEditable === !0;
}
const BT = /* @__PURE__ */ new Set(["INPUT", "SELECT", "TEXTAREA"]);
function $T(e) {
  return BT.has(e.tagName) || e.isContentEditable === !0;
}
const pa = /* @__PURE__ */ new WeakSet();
function ny(e) {
  return (n) => {
    n.key === "Enter" && e(n);
  };
}
function ic(e, n) {
  e.dispatchEvent(new PointerEvent("pointer" + n, { isPrimary: !0, bubbles: !0 }));
}
const UT = (e, n) => {
  const o = e.currentTarget;
  if (!o)
    return;
  const i = ny(() => {
    if (pa.has(o))
      return;
    ic(o, "down");
    const a = ny(() => {
      ic(o, "up");
    }), f = () => ic(o, "cancel");
    o.addEventListener("keyup", a, n), o.addEventListener("blur", f, n);
  });
  o.addEventListener("keydown", i, n), o.addEventListener("blur", () => o.removeEventListener("keydown", i), n);
};
function ry(e) {
  return Wd(e) && !jv();
}
const oy = /* @__PURE__ */ new WeakSet();
function HT(e, n, o = {}) {
  const [i, a, f] = Iv(e, o), d = (p) => {
    const m = p.currentTarget;
    if (!ry(p) || oy.has(p))
      return;
    pa.add(m), o.stopPropagation && oy.add(p);
    const y = n(m, p), S = (v, w) => {
      window.removeEventListener("pointerup", l), window.removeEventListener("pointercancel", c), pa.has(m) && pa.delete(m), ry(v) && typeof y == "function" && y(v, { success: w });
    }, l = (v) => {
      S(v, m === window || m === document || o.useGlobalTarget || Fv(m, v.target));
    }, c = (v) => {
      S(v, !1);
    };
    window.addEventListener("pointerup", l, a), window.addEventListener("pointercancel", c, a);
  };
  return i.forEach((p) => {
    (o.useGlobalTarget ? window : p).addEventListener("pointerdown", d, a), fa(p) && (p.addEventListener("focus", (y) => UT(y, a)), !zT(p) && !p.hasAttribute("tabindex") && (p.tabIndex = 0));
  }), f;
}
function Gd(e) {
  return zg(e) && "ownerSVGElement" in e;
}
const ma = /* @__PURE__ */ new WeakMap();
let $n;
const Ov = (e, n, o) => (i, a) => a && a[0] ? a[0][e + "Size"] : Gd(i) && "getBBox" in i ? i.getBBox()[n] : i[o], WT = /* @__PURE__ */ Ov("inline", "width", "offsetWidth"), GT = /* @__PURE__ */ Ov("block", "height", "offsetHeight");
function KT({ target: e, borderBoxSize: n }) {
  var o;
  (o = ma.get(e)) == null || o.forEach((i) => {
    i(e, {
      get width() {
        return WT(e, n);
      },
      get height() {
        return GT(e, n);
      }
    });
  });
}
function YT(e) {
  e.forEach(KT);
}
function QT() {
  typeof ResizeObserver > "u" || ($n = new ResizeObserver(YT));
}
function XT(e, n) {
  $n || QT();
  const o = Nv(e);
  return o.forEach((i) => {
    let a = ma.get(i);
    a || (a = /* @__PURE__ */ new Set(), ma.set(i, a)), a.add(n), $n == null || $n.observe(i);
  }), () => {
    o.forEach((i) => {
      const a = ma.get(i);
      a == null || a.delete(n), a != null && a.size || $n == null || $n.unobserve(i);
    });
  };
}
const ha = /* @__PURE__ */ new Set();
let uo;
function ZT() {
  uo = () => {
    const e = {
      get width() {
        return window.innerWidth;
      },
      get height() {
        return window.innerHeight;
      }
    };
    ha.forEach((n) => n(e));
  }, window.addEventListener("resize", uo);
}
function JT(e) {
  return ha.add(e), uo || ZT(), () => {
    ha.delete(e), !ha.size && typeof uo == "function" && (window.removeEventListener("resize", uo), uo = void 0);
  };
}
function iy(e, n) {
  return typeof e == "function" ? JT(e) : XT(e, n);
}
function qT(e) {
  return Gd(e) && e.tagName === "svg";
}
const ek = [...Mv, Be, Wt], tk = (e) => ek.find(Ev(e)), sy = () => ({
  translate: 0,
  scale: 1,
  origin: 0,
  originPoint: 0
}), co = () => ({
  x: sy(),
  y: sy()
}), ay = () => ({ min: 0, max: 0 }), He = () => ({
  x: ay(),
  y: ay()
}), nk = /* @__PURE__ */ new WeakMap();
function Wa(e) {
  return e !== null && typeof e == "object" && typeof e.start == "function";
}
function Ai(e) {
  return typeof e == "string" || Array.isArray(e);
}
const Kd = [
  "animate",
  "whileInView",
  "whileFocus",
  "whileHover",
  "whileTap",
  "whileDrag",
  "exit"
], Yd = ["initial", ...Kd];
function Ga(e) {
  return Wa(e.animate) || Yd.some((n) => Ai(e[n]));
}
function Lv(e) {
  return !!(Ga(e) || e.variants);
}
function rk(e, n, o) {
  for (const i in n) {
    const a = n[i], f = o[i];
    if (qe(a))
      e.addValue(i, a);
    else if (qe(f))
      e.addValue(i, yo(a, { owner: e }));
    else if (f !== a)
      if (e.hasValue(i)) {
        const d = e.getValue(i);
        d.liveStyle === !0 ? d.jump(a) : d.hasAnimated || d.set(a);
      } else {
        const d = e.getStaticValue(i);
        e.addValue(i, yo(d !== void 0 ? d : a, { owner: e }));
      }
  }
  for (const i in o)
    n[i] === void 0 && e.removeValue(i);
  return n;
}
const Hc = { current: null }, Vv = { current: !1 }, ok = typeof window < "u";
function ik() {
  if (Vv.current = !0, !!ok)
    if (window.matchMedia) {
      const e = window.matchMedia("(prefers-reduced-motion)"), n = () => Hc.current = e.matches;
      e.addEventListener("change", n), n();
    } else
      Hc.current = !1;
}
const ly = [
  "AnimationStart",
  "AnimationComplete",
  "Update",
  "BeforeLayoutMeasure",
  "LayoutMeasure",
  "LayoutAnimationStart",
  "LayoutAnimationComplete"
];
let Ra = {};
function zv(e) {
  Ra = e;
}
function sk() {
  return Ra;
}
class ak {
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
  constructor({ parent: n, props: o, presenceContext: i, reducedMotionConfig: a, skipAnimations: f, blockInitialAnimation: d, visualState: p }, m = {}) {
    this.current = null, this.children = /* @__PURE__ */ new Set(), this.isVariantNode = !1, this.isControllingVariants = !1, this.shouldReduceMotion = null, this.shouldSkipAnimations = !1, this.values = /* @__PURE__ */ new Map(), this.KeyframeResolver = Vd, this.features = {}, this.valueSubscriptions = /* @__PURE__ */ new Map(), this.prevMotionValues = {}, this.hasBeenMounted = !1, this.events = {}, this.propEventSubscriptions = {}, this.notifyUpdate = () => this.notify("Update", this.latestValues), this.render = () => {
      this.current && (this.triggerBuild(), this.renderInstance(this.current, this.renderState, this.props.style, this.projection));
    }, this.renderScheduledAt = 0, this.scheduleRender = () => {
      const v = lt.now();
      this.renderScheduledAt < v && (this.renderScheduledAt = v, Ce.render(this.render, !1, !0));
    };
    const { latestValues: y, renderState: S } = p;
    this.latestValues = y, this.baseTarget = { ...y }, this.initialValues = o.initial ? { ...y } : {}, this.renderState = S, this.parent = n, this.props = o, this.presenceContext = i, this.depth = n ? n.depth + 1 : 0, this.reducedMotionConfig = a, this.skipAnimationsConfig = f, this.options = m, this.blockInitialAnimation = !!d, this.isControllingVariants = Ga(o), this.isVariantNode = Lv(o), this.isVariantNode && (this.variantChildren = /* @__PURE__ */ new Set()), this.manuallyAnimateOnMount = !!(n && n.current);
    const { willChange: l, ...c } = this.scrapeMotionValuesFromProps(o, {}, this);
    for (const v in c) {
      const w = c[v];
      y[v] !== void 0 && qe(w) && w.set(y[v]);
    }
  }
  mount(n) {
    var o, i;
    if (this.hasBeenMounted)
      for (const a in this.initialValues)
        (o = this.values.get(a)) == null || o.jump(this.initialValues[a]), this.latestValues[a] = this.initialValues[a];
    this.current = n, nk.set(n, this), this.projection && !this.projection.instance && this.projection.mount(n), this.parent && this.isVariantNode && !this.isControllingVariants && (this.removeFromVariantTree = this.parent.addVariantChild(this)), this.values.forEach((a, f) => this.bindToMotionValue(f, a)), this.reducedMotionConfig === "never" ? this.shouldReduceMotion = !1 : this.reducedMotionConfig === "always" ? this.shouldReduceMotion = !0 : (Vv.current || ik(), this.shouldReduceMotion = Hc.current), this.shouldSkipAnimations = this.skipAnimationsConfig ?? !1, (i = this.parent) == null || i.addChild(this), this.update(this.props, this.presenceContext), this.hasBeenMounted = !0;
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
    if (this.valueSubscriptions.has(n) && this.valueSubscriptions.get(n)(), o.accelerate && xv.has(n) && this.current instanceof HTMLElement) {
      const { factory: d, keyframes: p, times: m, ease: y, duration: S } = o.accelerate, l = new Sv({
        element: this.current,
        name: n,
        keyframes: p,
        times: m,
        ease: y,
        duration: /* @__PURE__ */ gt(S)
      }), c = d(l);
      this.valueSubscriptions.set(n, () => {
        c(), l.cancel();
      });
      return;
    }
    const i = xo.has(n);
    i && this.onBindTransform && this.onBindTransform();
    const a = o.on("change", (d) => {
      this.latestValues[n] = d, this.props.onUpdate && Ce.preRender(this.notifyUpdate), i && this.projection && (this.projection.isTransformDirty = !0), this.scheduleRender();
    });
    let f;
    typeof window < "u" && window.MotionCheckAppearSync && (f = window.MotionCheckAppearSync(this, n, o)), this.valueSubscriptions.set(n, () => {
      a(), f && f();
    });
  }
  sortNodePosition(n) {
    return !this.current || !this.sortInstanceNodePosition || this.type !== n.type ? 0 : this.sortInstanceNodePosition(this.current, n.current);
  }
  updateFeatures() {
    let n = "animation";
    for (n in Ra) {
      const o = Ra[n];
      if (!o)
        continue;
      const { isEnabled: i, Feature: a } = o;
      if (!this.features[n] && a && i(this.props) && (this.features[n] = new a(this)), this.features[n]) {
        const f = this.features[n];
        f.isMounted ? f.update() : (f.mount(), f.isMounted = !0);
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
    for (let i = 0; i < ly.length; i++) {
      const a = ly[i];
      this.propEventSubscriptions[a] && (this.propEventSubscriptions[a](), delete this.propEventSubscriptions[a]);
      const f = "on" + a, d = n[f];
      d && (this.propEventSubscriptions[a] = this.on(a, d));
    }
    this.prevMotionValues = rk(this, this.scrapeMotionValuesFromProps(n, this.prevProps || {}, this), this.prevMotionValues), this.handleChildMotionValue && this.handleChildMotionValue();
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
    return i === void 0 && o !== void 0 && (i = yo(o === null ? void 0 : o, { owner: this }), this.addValue(n, i)), i;
  }
  /**
   * If we're trying to animate to a previously unencountered value,
   * we need to check for it in our state and as a last resort read it
   * directly from the instance (which might have performance implications).
   */
  readValue(n, o) {
    let i = this.latestValues[n] !== void 0 || !this.current ? this.latestValues[n] : this.getBaseTargetFromProps(this.props, n) ?? this.readValueFromInstance(this.current, n, this.options);
    return i != null && (typeof i == "string" && (Vg(i) || Bg(i)) ? i = parseFloat(i) : !tk(i) && Wt.test(o) && (i = Dv(n, o)), this.setBaseTarget(n, qe(i) ? i.get() : i)), qe(i) ? i.get() : i;
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
    var f;
    const { initial: o } = this.props;
    let i;
    if (typeof o == "string" || typeof o == "object") {
      const d = $d(this.props, o, (f = this.presenceContext) == null ? void 0 : f.custom);
      d && (i = d[n]);
    }
    if (o && i !== void 0)
      return i;
    const a = this.getBaseTargetFromProps(this.props, n);
    return a !== void 0 && !qe(a) ? a : this.initialValues[n] !== void 0 && i === void 0 ? void 0 : this.baseTarget[n];
  }
  on(n, o) {
    return this.events[n] || (this.events[n] = new Md()), this.events[n].add(o);
  }
  notify(n, ...o) {
    this.events[n] && this.events[n].notify(...o);
  }
  scheduleRenderMicrotask() {
    Hd.render(this.render);
  }
}
class Bv extends ak {
  constructor() {
    super(...arguments), this.KeyframeResolver = IT;
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
    qe(n) && (this.childSubscription = n.on("change", (o) => {
      this.current && (this.current.textContent = `${o}`);
    }));
  }
}
class er {
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
function lk({ x: e, y: n }) {
  return { top: n.min, right: e.max, bottom: n.max, left: e.min };
}
function uk(e, n) {
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
function sc(e) {
  return e === void 0 || e === 1;
}
function Wc({ scale: e, scaleX: n, scaleY: o }) {
  return !sc(e) || !sc(n) || !sc(o);
}
function hr(e) {
  return Wc(e) || Uv(e) || e.z || e.rotate || e.rotateX || e.rotateY || e.skewX || e.skewY;
}
function Uv(e) {
  return uy(e.x) || uy(e.y);
}
function uy(e) {
  return e && e !== "0%";
}
function Da(e, n, o) {
  const i = e - o, a = n * i;
  return o + a;
}
function cy(e, n, o, i, a) {
  return a !== void 0 && (e = Da(e, a, i)), Da(e, o, i) + n;
}
function Gc(e, n = 0, o = 1, i, a) {
  e.min = cy(e.min, n, o, i, a), e.max = cy(e.max, n, o, i, a);
}
function Hv(e, { x: n, y: o }) {
  Gc(e.x, n.translate, n.scale, n.originPoint), Gc(e.y, o.translate, o.scale, o.originPoint);
}
const dy = 0.999999999999, fy = 1.0000000000001;
function ck(e, n, o, i = !1) {
  var p;
  const a = o.length;
  if (!a)
    return;
  n.x = n.y = 1;
  let f, d;
  for (let m = 0; m < a; m++) {
    f = o[m], d = f.projectionDelta;
    const { visualElement: y } = f.options;
    y && y.props.style && y.props.style.display === "contents" || (i && f.options.layoutScroll && f.scroll && f !== f.root && (tn(e.x, -f.scroll.offset.x), tn(e.y, -f.scroll.offset.y)), d && (n.x *= d.x.scale, n.y *= d.y.scale, Hv(e, d)), i && hr(f.latestValues) && ya(e, f.latestValues, (p = f.layout) == null ? void 0 : p.layoutBox));
  }
  n.x < fy && n.x > dy && (n.x = 1), n.y < fy && n.y > dy && (n.y = 1);
}
function tn(e, n) {
  e.min += n, e.max += n;
}
function py(e, n, o, i, a = 0.5) {
  const f = be(e.min, e.max, a);
  Gc(e, n, o, f, i);
}
function my(e, n) {
  return typeof e == "string" ? parseFloat(e) / 100 * (n.max - n.min) : e;
}
function ya(e, n, o) {
  const i = o ?? e;
  py(e.x, my(n.x, i.x), n.scaleX, n.scale, n.originX), py(e.y, my(n.y, i.y), n.scaleY, n.scale, n.originY);
}
function Wv(e, n) {
  return $v(uk(e.getBoundingClientRect(), n));
}
function dk(e, n, o) {
  const i = Wv(e, o), { scroll: a } = n;
  return a && (tn(i.x, a.offset.x), tn(i.y, a.offset.y)), i;
}
const fk = {
  x: "translateX",
  y: "translateY",
  z: "translateZ",
  transformPerspective: "perspective"
}, pk = wo.length;
function mk(e, n, o) {
  let i = "", a = !0;
  for (let d = 0; d < pk; d++) {
    const p = wo[d], m = e[p];
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
      const S = Uc(m, Ma[p]);
      if (!y) {
        a = !1;
        const l = fk[p] || p;
        i += `${l}(${S}) `;
      }
      o && (n[p] = S);
    }
  }
  const f = e.pathRotation;
  return f && (a = !1, i += `rotate(${Uc(f, Ma.pathRotation)}) `), i = i.trim(), o ? i = o(n, a ? "" : i) : a && (i = "none"), i;
}
function Qd(e, n, o) {
  const { style: i, vars: a, transformOrigin: f } = e;
  let d = !1, p = !1;
  for (const m in n) {
    const y = n[m];
    if (xo.has(m)) {
      d = !0;
      continue;
    } else if (nv(m)) {
      a[m] = y;
      continue;
    } else {
      const S = Uc(y, Ma[m]);
      m.startsWith("origin") ? (p = !0, f[m] = S) : i[m] = S;
    }
  }
  if (n.transform || (d || o ? i.transform = mk(n, e.transform, o) : i.transform && (i.transform = "none")), p) {
    const { originX: m = "50%", originY: y = "50%", originZ: S = 0 } = f;
    i.transformOrigin = `${m} ${y} ${S}`;
  }
}
function Gv(e, { style: n, vars: o }, i, a) {
  const f = e.style;
  let d;
  for (d in n)
    f[d] = n[d];
  a == null || a.applyProjectionStyles(f, i);
  for (d in o)
    f.setProperty(d, o[d]);
}
function hy(e, n) {
  return n.max === n.min ? 0 : e / (n.max - n.min) * 100;
}
const pi = {
  correct: (e, n) => {
    if (!n.target)
      return e;
    if (typeof e == "string")
      if (re.test(e))
        e = parseFloat(e);
      else
        return e;
    const o = hy(e, n.target.x), i = hy(e, n.target.y);
    return `${o}% ${i}%`;
  }
}, hk = {
  correct: (e, { treeScale: n, projectionDelta: o }) => {
    const i = e, a = Wt.parse(e);
    if (a.length > 5)
      return i;
    const f = Wt.createTransformer(e), d = typeof a[0] != "number" ? 1 : 0, p = o.x.scale * n.x, m = o.y.scale * n.y;
    a[0 + d] /= p, a[1 + d] /= m;
    const y = be(p, m, 0.5);
    return typeof a[2 + d] == "number" && (a[2 + d] /= y), typeof a[3 + d] == "number" && (a[3 + d] /= y), f(a);
  }
}, Kc = {
  borderRadius: {
    ...pi,
    applyTo: [
      "borderTopLeftRadius",
      "borderTopRightRadius",
      "borderBottomLeftRadius",
      "borderBottomRightRadius"
    ]
  },
  borderTopLeftRadius: pi,
  borderTopRightRadius: pi,
  borderBottomLeftRadius: pi,
  borderBottomRightRadius: pi,
  boxShadow: hk
};
function Kv(e, { layout: n, layoutId: o }) {
  return xo.has(e) || e.startsWith("origin") || (n || o !== void 0) && (!!Kc[e] || e === "opacity");
}
function Xd(e, n, o) {
  var d;
  const i = e.style, a = n == null ? void 0 : n.style, f = {};
  if (!i)
    return f;
  for (const p in i)
    (qe(i[p]) || a && qe(a[p]) || Kv(p, e) || ((d = o == null ? void 0 : o.getValue(p)) == null ? void 0 : d.liveStyle) !== void 0) && (f[p] = i[p]);
  return f;
}
function yk(e) {
  return window.getComputedStyle(e);
}
class gk extends Bv {
  constructor() {
    super(...arguments), this.type = "html", this.renderInstance = Gv;
  }
  readValueFromInstance(n, o) {
    var i;
    if (xo.has(o))
      return (i = this.projection) != null && i.isProjecting ? Dc(o) : F_(n, o);
    {
      const a = yk(n), f = (nv(o) ? a.getPropertyValue(o) : a[o]) || 0;
      return typeof f == "string" ? f.trim() : f;
    }
  }
  measureInstanceViewportBox(n, { transformPagePoint: o }) {
    return Wv(n, o);
  }
  build(n, o, i) {
    Qd(n, o, i.transformTemplate);
  }
  scrapeMotionValuesFromProps(n, o, i) {
    return Xd(n, o, i);
  }
}
const vk = {
  offset: "stroke-dashoffset",
  array: "stroke-dasharray"
}, Sk = {
  offset: "strokeDashoffset",
  array: "strokeDasharray"
};
function wk(e, n, o = 1, i = 0, a = !0) {
  e.pathLength = 1;
  const f = a ? vk : Sk;
  e[f.offset] = `${-i}`, e[f.array] = `${n} ${o}`;
}
const xk = [
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
  pathSpacing: f = 1,
  pathOffset: d = 0,
  // This is object creation, which we try to avoid per-frame.
  ...p
}, m, y, S) {
  if (Qd(e, p, y), m) {
    e.style.viewBox && (e.attrs.viewBox = e.style.viewBox);
    return;
  }
  e.attrs = e.style, e.style = {};
  const { attrs: l, style: c } = e;
  l.transform && (c.transform = l.transform, delete l.transform), (c.transform || l.transformOrigin) && (c.transformOrigin = l.transformOrigin ?? "50% 50%", delete l.transformOrigin), c.transform && (c.transformBox = (S == null ? void 0 : S.transformBox) ?? "fill-box", delete l.transformBox);
  for (const v of xk)
    l[v] !== void 0 && (c[v] = l[v], delete l[v]);
  n !== void 0 && (l.x = n), o !== void 0 && (l.y = o), i !== void 0 && (l.scale = i), a !== void 0 && wk(l, a, f, d, !1);
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
function _k(e, n, o, i) {
  Gv(e, n, void 0, i);
  for (const a in n.attrs)
    e.setAttribute(Qv.has(a) ? a : Ud(a), n.attrs[a]);
}
function Zv(e, n, o) {
  const i = Xd(e, n, o);
  for (const a in e)
    if (qe(e[a]) || qe(n[a])) {
      const f = wo.indexOf(a) !== -1 ? "attr" + a.charAt(0).toUpperCase() + a.substring(1) : a;
      i[f] = e[a];
    }
  return i;
}
class Tk extends Bv {
  constructor() {
    super(...arguments), this.type = "svg", this.isSVGTag = !1, this.measureInstanceViewportBox = He;
  }
  getBaseTargetFromProps(n, o) {
    return n[o];
  }
  readValueFromInstance(n, o) {
    if (xo.has(o)) {
      const i = Rv(o);
      return i && i.default || 0;
    }
    return o = Qv.has(o) ? o : Ud(o), n.getAttribute(o);
  }
  scrapeMotionValuesFromProps(n, o, i) {
    return Zv(n, o, i);
  }
  build(n, o, i) {
    Yv(n, o, this.isSVGTag, i.transformTemplate, i.style);
  }
  renderInstance(n, o, i, a) {
    _k(n, o, i, a);
  }
  mount(n) {
    this.isSVGTag = Xv(n.tagName), super.mount(n);
  }
}
const kk = Yd.length;
function Jv(e) {
  if (!e)
    return;
  if (!e.isControllingVariants) {
    const o = e.parent ? Jv(e.parent) || {} : {};
    return e.props.initial !== void 0 && (o.initial = e.props.initial), o;
  }
  const n = {};
  for (let o = 0; o < kk; o++) {
    const i = Yd[o], a = e.props[i];
    (Ai(a) || a === !1) && (n[i] = a);
  }
  return n;
}
function qv(e, n) {
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
const Ak = [...Kd].reverse(), bk = Kd.length;
function Ck(e) {
  return (n) => Promise.all(n.map(({ animation: o, options: i }) => kT(e, o, i)));
}
function Pk(e) {
  let n = Ck(e), o = yy(), i = !0, a = !1;
  const f = (y) => (S, l) => {
    var v;
    const c = kr(e, l, y === "exit" ? (v = e.presenceContext) == null ? void 0 : v.custom : void 0);
    if (c) {
      const { transition: w, transitionEnd: T, ...A } = c;
      S = { ...S, ...A, ...T };
    }
    return S;
  };
  function d(y) {
    n = y(e);
  }
  function p(y) {
    const { props: S } = e, l = Jv(e.parent) || {}, c = [], v = /* @__PURE__ */ new Set();
    let w = {}, T = 1 / 0;
    for (let _ = 0; _ < bk; _++) {
      const C = Ak[_], E = o[C], D = S[C] !== void 0 ? S[C] : l[C], O = Ai(D), W = C === y ? E.isActive : null;
      W === !1 && (T = _);
      let H = D === l[C] && D !== S[C] && O;
      if (H && (i || a) && e.manuallyAnimateOnMount && (H = !1), E.protectedKeys = { ...w }, // If it isn't active and hasn't *just* been set as inactive
      !E.isActive && W === null || // If we didn't and don't have any defined prop for this animation type
      !D && !E.prevProp || // Or if the prop doesn't define an animation
      Wa(D) || typeof D == "boolean")
        continue;
      if (C === "exit" && E.isActive && W !== !0) {
        E.prevResolvedValues && (w = {
          ...w,
          ...E.prevResolvedValues
        });
        continue;
      }
      const Y = Ek(E.prevProp, D);
      let L = Y || // If we're making this variant active, we want to always make it active
      C === y && E.isActive && !H && O || // If we removed a higher-priority variant (i is in reverse order)
      _ > T && O, X = !1;
      const se = Array.isArray(D) ? D : [D];
      let Z = se.reduce(f(C), {});
      W === !1 && (Z = {});
      const { prevResolvedValues: de = {} } = E, ce = {
        ...de,
        ...Z
      }, ye = ($) => {
        L = !0, v.has($) && (X = !0, v.delete($)), E.needsAnimating[$] = !0;
        const J = e.getValue($);
        J && (J.liveStyle = !1);
      };
      for (const $ in ce) {
        const J = Z[$], Q = de[$];
        if (w.hasOwnProperty($))
          continue;
        let N = !1;
        Lc(J) && Lc(Q) ? N = !qv(J, Q) || Y : N = J !== Q, N ? J != null ? ye($) : v.add($) : J !== void 0 && v.has($) ? ye($) : E.protectedKeys[$] = !0;
      }
      E.prevProp = D, E.prevResolvedValues = Z, E.isActive && (w = { ...w, ...Z }), (i || a) && e.blockInitialAnimation && (L = !1);
      const ee = H && Y;
      L && (!ee || X) && c.push(...se.map(($) => {
        const J = { type: C };
        if (typeof $ == "string" && (i || a) && !ee && e.manuallyAnimateOnMount && e.parent) {
          const { parent: Q } = e, N = kr(Q, $);
          if (Q.enteringChildren && N) {
            const { delayChildren: V } = N.transition || {};
            J.delay = _v(Q.enteringChildren, e, V);
          }
        }
        return {
          animation: $,
          options: J
        };
      }));
    }
    if (v.size) {
      const _ = {};
      if (typeof S.initial != "boolean") {
        const C = kr(e, Array.isArray(S.initial) ? S.initial[0] : S.initial);
        C && C.transition && (_.transition = C.transition);
      }
      v.forEach((C) => {
        const E = e.getBaseTarget(C), D = e.getValue(C);
        D && (D.liveStyle = !0), _[C] = E ?? null;
      }), c.push({ animation: _ });
    }
    let A = !!c.length;
    return i && (S.initial === !1 || S.initial === S.animate) && !e.manuallyAnimateOnMount && (A = !1), i = !1, a = !1, A ? n(c) : Promise.resolve();
  }
  function m(y, S) {
    var c;
    if (o[y].isActive === S)
      return Promise.resolve();
    (c = e.variantChildren) == null || c.forEach((v) => {
      var w;
      return (w = v.animationState) == null ? void 0 : w.setActive(y, S);
    }), o[y].isActive = S;
    const l = p(y);
    for (const v in o)
      o[v].protectedKeys = {};
    return l;
  }
  return {
    animateChanges: p,
    setActive: m,
    setAnimateFunction: d,
    getState: () => o,
    reset: () => {
      o = yy(), a = !0;
    }
  };
}
function Ek(e, n) {
  return typeof n == "string" ? n !== e : Array.isArray(n) ? !qv(n, e) : !1;
}
function mr(e = !1) {
  return {
    isActive: e,
    protectedKeys: {},
    needsAnimating: {},
    prevResolvedValues: {}
  };
}
function yy() {
  return {
    animate: mr(!0),
    whileInView: mr(),
    whileHover: mr(),
    whileTap: mr(),
    whileDrag: mr(),
    whileFocus: mr(),
    exit: mr()
  };
}
function Yc(e, n) {
  e.min = n.min, e.max = n.max;
}
function $t(e, n) {
  Yc(e.x, n.x), Yc(e.y, n.y);
}
function gy(e, n) {
  e.translate = n.translate, e.scale = n.scale, e.originPoint = n.originPoint, e.origin = n.origin;
}
const e0 = 1e-4, Mk = 1 - e0, Rk = 1 + e0, t0 = 0.01, Dk = 0 - t0, Nk = 0 + t0;
function ut(e) {
  return e.max - e.min;
}
function jk(e, n, o) {
  return Math.abs(e - n) <= o;
}
function vy(e, n, o, i = 0.5) {
  e.origin = i, e.originPoint = be(n.min, n.max, e.origin), e.scale = ut(o) / ut(n), e.translate = be(o.min, o.max, e.origin) - e.originPoint, (e.scale >= Mk && e.scale <= Rk || isNaN(e.scale)) && (e.scale = 1), (e.translate >= Dk && e.translate <= Nk || isNaN(e.translate)) && (e.translate = 0);
}
function vi(e, n, o, i) {
  vy(e.x, n.x, o.x, i ? i.originX : void 0), vy(e.y, n.y, o.y, i ? i.originY : void 0);
}
function Sy(e, n, o, i = 0) {
  const a = i ? be(o.min, o.max, i) : o.min;
  e.min = a + n.min, e.max = e.min + ut(n);
}
function Ik(e, n, o, i) {
  Sy(e.x, n.x, o.x, i == null ? void 0 : i.x), Sy(e.y, n.y, o.y, i == null ? void 0 : i.y);
}
function wy(e, n, o, i = 0) {
  const a = i ? be(o.min, o.max, i) : o.min;
  e.min = n.min - a, e.max = e.min + ut(n);
}
function Na(e, n, o, i) {
  wy(e.x, n.x, o.x, i == null ? void 0 : i.x), wy(e.y, n.y, o.y, i == null ? void 0 : i.y);
}
function xy(e, n, o, i, a) {
  return e -= n, e = Da(e, 1 / o, i), a !== void 0 && (e = Da(e, 1 / a, i)), e;
}
function Fk(e, n = 0, o = 1, i = 0.5, a, f = e, d = e) {
  if (on.test(n) && (n = parseFloat(n), n = be(d.min, d.max, n / 100) - d.min), typeof n != "number")
    return;
  let p = be(f.min, f.max, i);
  e === f && (p -= n), e.min = xy(e.min, n, o, p, a), e.max = xy(e.max, n, o, p, a);
}
function _y(e, n, [o, i, a], f, d) {
  Fk(e, n[o], n[i], n[a], n.scale, f, d);
}
const Ok = ["x", "scaleX", "originX"], Lk = ["y", "scaleY", "originY"];
function Ty(e, n, o, i) {
  _y(e.x, n, Ok, o ? o.x : void 0, i ? i.x : void 0), _y(e.y, n, Lk, o ? o.y : void 0, i ? i.y : void 0);
}
function ky(e) {
  return e.translate === 0 && e.scale === 1;
}
function n0(e) {
  return ky(e.x) && ky(e.y);
}
function Ay(e, n) {
  return e.min === n.min && e.max === n.max;
}
function Vk(e, n) {
  return Ay(e.x, n.x) && Ay(e.y, n.y);
}
function by(e, n) {
  return Math.round(e.min) === Math.round(n.min) && Math.round(e.max) === Math.round(n.max);
}
function r0(e, n) {
  return by(e.x, n.x) && by(e.y, n.y);
}
function Cy(e) {
  return ut(e.x) / ut(e.y);
}
function Py(e, n) {
  return e.translate === n.translate && e.scale === n.scale && e.originPoint === n.originPoint;
}
function en(e) {
  return [e("x"), e("y")];
}
function zk(e, n, o) {
  let i = "";
  const a = e.x.translate / n.x, f = e.y.translate / n.y, d = (o == null ? void 0 : o.z) || 0;
  if ((a || f || d) && (i = `translate3d(${a}px, ${f}px, ${d}px) `), (n.x !== 1 || n.y !== 1) && (i += `scale(${1 / n.x}, ${1 / n.y}) `), o) {
    const { transformPerspective: y, rotate: S, pathRotation: l, rotateX: c, rotateY: v, skewX: w, skewY: T } = o;
    y && (i = `perspective(${y}px) ${i}`), S && (i += `rotate(${S}deg) `), l && (i += `rotate(${l}deg) `), c && (i += `rotateX(${c}deg) `), v && (i += `rotateY(${v}deg) `), w && (i += `skewX(${w}deg) `), T && (i += `skewY(${T}deg) `);
  }
  const p = e.x.scale * n.x, m = e.y.scale * n.y;
  return (p !== 1 || m !== 1) && (i += `scale(${p}, ${m})`), i || "none";
}
const o0 = [
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius"
], Bk = o0.length, Ey = (e) => typeof e == "string" ? parseFloat(e) : e, My = (e) => typeof e == "number" || re.test(e);
function $k(e, n, o, i, a, f) {
  a ? (e.opacity = be(0, o.opacity ?? 1, Uk(i)), e.opacityExit = be(n.opacity ?? 1, 0, Hk(i))) : f && (e.opacity = be(n.opacity ?? 1, o.opacity ?? 1, i));
  for (let d = 0; d < Bk; d++) {
    const p = o0[d];
    let m = Ry(n, p), y = Ry(o, p);
    if (m === void 0 && y === void 0)
      continue;
    m || (m = 0), y || (y = 0), m === 0 || y === 0 || My(m) === My(y) ? (e[p] = Math.max(be(Ey(m), Ey(y), i), 0), (on.test(y) || on.test(m)) && (e[p] += "%")) : e[p] = y;
  }
  (n.rotate || o.rotate) && (e.rotate = be(n.rotate || 0, o.rotate || 0, i));
}
function Ry(e, n) {
  return e[n] !== void 0 ? e[n] : e.borderRadius;
}
const Uk = /* @__PURE__ */ i0(0, 0.5, Xg), Hk = /* @__PURE__ */ i0(0.5, 0.95, jt);
function i0(e, n, o) {
  return (i) => i < e ? 0 : i > n ? 1 : o(/* @__PURE__ */ Ti(e, n, i));
}
function Wk(e, n, o) {
  const i = qe(e) ? e : yo(e);
  return i.start(Bd("", i, n, o)), i.animation;
}
function bi(e, n, o, i = { passive: !0 }) {
  return e.addEventListener(n, o, i), () => e.removeEventListener(n, o);
}
const Gk = (e, n) => e.depth - n.depth;
class Kk {
  constructor() {
    this.children = [], this.isDirty = !1;
  }
  add(n) {
    Ed(this.children, n), this.isDirty = !0;
  }
  remove(n) {
    Aa(this.children, n), this.isDirty = !0;
  }
  forEach(n) {
    this.isDirty && this.children.sort(Gk), this.isDirty = !1, this.children.forEach(n);
  }
}
function Yk(e, n) {
  const o = lt.now(), i = ({ timestamp: a }) => {
    const f = a - o;
    f >= n && (Xn(i), e(f - n));
  };
  return Ce.setup(i, !0), () => Xn(i);
}
function ga(e) {
  return qe(e) ? e.get() : e;
}
class Qk {
  constructor() {
    this.members = [];
  }
  add(n) {
    Ed(this.members, n);
    for (let o = this.members.length - 1; o >= 0; o--) {
      const i = this.members[o];
      if (i === n || i === this.lead || i === this.prevLead)
        continue;
      const a = i.instance;
      (!a || a.isConnected === !1) && !i.snapshot && (Aa(this.members, i), i.unmount());
    }
    n.scheduleRender();
  }
  remove(n) {
    if (Aa(this.members, n), n === this.prevLead && (this.prevLead = void 0), n === this.lead) {
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
      const { layoutDependency: f } = i.options, { layoutDependency: d } = n.options;
      (f === void 0 || f !== d) && (n.resumeFrom = i, o && (i.preserveOpacity = !0), i.snapshot && (n.snapshot = i.snapshot, n.snapshot.latestValues = i.animationValues || i.latestValues), (a = n.root) != null && a.isUpdating && (n.isLayoutDirty = !0)), n.options.crossfade === !1 && i.hide();
    }
  }
  exitAnimationComplete() {
    this.members.forEach((n) => {
      var o, i, a, f, d;
      (i = (o = n.options).onExitComplete) == null || i.call(o), (d = (a = n.resumingFrom) == null ? void 0 : (f = a.options).onExitComplete) == null || d.call(f);
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
const va = {
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
}, ac = ["", "X", "Y", "Z"], Xk = 1e3;
let Zk = 0;
function lc(e, n, o, i) {
  const { latestValues: a } = n;
  a[e] && (o[e] = a[e], n.setStaticValue(e, 0), i && (i[e] = 0));
}
function s0(e) {
  if (e.hasCheckedOptimisedAppear = !0, e.root === e)
    return;
  const { visualElement: n } = e.options;
  if (!n)
    return;
  const o = Cv(n);
  if (window.MotionHasOptimisedAnimation(o, "transform")) {
    const { layout: a, layoutId: f } = e.options;
    window.MotionCancelOptimisedAnimation(o, "transform", Ce, !(a || f));
  }
  const { parent: i } = e;
  i && !i.hasCheckedOptimisedAppear && s0(i);
}
function a0({ attachResizeListener: e, defaultParent: n, measureScroll: o, checkIsScrollRoot: i, resetTransform: a }) {
  return class {
    constructor(d = {}, p = n == null ? void 0 : n()) {
      this.id = Zk++, this.animationId = 0, this.animationCommitId = 0, this.children = /* @__PURE__ */ new Set(), this.options = {}, this.isTreeAnimating = !1, this.isAnimationBlocked = !1, this.isLayoutDirty = !1, this.isProjectionDirty = !1, this.isSharedProjectionDirty = !1, this.isTransformDirty = !1, this.updateManuallyBlocked = !1, this.updateBlockedByResize = !1, this.isUpdating = !1, this.isSVG = !1, this.needsReset = !1, this.shouldResetTransform = !1, this.hasCheckedOptimisedAppear = !1, this.treeScale = { x: 1, y: 1 }, this.eventHandlers = /* @__PURE__ */ new Map(), this.hasTreeAnimated = !1, this.layoutVersion = 0, this.updateScheduled = !1, this.scheduleUpdate = () => this.update(), this.projectionUpdateScheduled = !1, this.checkUpdateFailed = () => {
        this.isUpdating && (this.isUpdating = !1, this.clearAllSnapshots());
      }, this.updateProjection = () => {
        this.projectionUpdateScheduled = !1, this.nodes.forEach(eA), this.nodes.forEach(sA), this.nodes.forEach(aA), this.nodes.forEach(tA);
      }, this.resolvedRelativeTargetAt = 0, this.linkedParentVersion = 0, this.hasProjected = !1, this.isVisible = !0, this.animationProgress = 0, this.sharedNodes = /* @__PURE__ */ new Map(), this.latestValues = d, this.root = p ? p.root || p : this, this.path = p ? [...p.path, p] : [], this.parent = p, this.depth = p ? p.depth + 1 : 0;
      for (let m = 0; m < this.path.length; m++)
        this.path[m].shouldResetTransform = !0;
      this.root === this && (this.nodes = new Kk());
    }
    addEventListener(d, p) {
      return this.eventHandlers.has(d) || this.eventHandlers.set(d, new Md()), this.eventHandlers.get(d).add(p);
    }
    notifyListeners(d, ...p) {
      const m = this.eventHandlers.get(d);
      m && m.notify(...p);
    }
    hasListeners(d) {
      return this.eventHandlers.has(d);
    }
    /**
     * Lifecycles
     */
    mount(d) {
      if (this.instance)
        return;
      this.isSVG = Gd(d) && !qT(d), this.instance = d;
      const { layoutId: p, layout: m, visualElement: y } = this.options;
      if (y && !y.current && y.mount(d), this.root.nodes.add(this), this.parent && this.parent.children.add(this), this.root.hasTreeAnimated && (m || p) && (this.isLayoutDirty = !0), e) {
        let S, l = 0;
        const c = () => this.root.updateBlockedByResize = !1;
        Ce.read(() => {
          l = window.innerWidth;
        }), e(d, () => {
          const v = window.innerWidth;
          v !== l && (l = v, this.root.updateBlockedByResize = !0, S && S(), S = Yk(c, 250), va.hasAnimatedSinceResize && (va.hasAnimatedSinceResize = !1, this.nodes.forEach(jy)));
        });
      }
      p && this.root.registerSharedNode(p, this), this.options.animate !== !1 && y && (p || m) && this.addEventListener("didUpdate", ({ delta: S, hasLayoutChanged: l, hasRelativeLayoutChanged: c, layout: v }) => {
        if (this.isTreeAnimationBlocked()) {
          this.target = void 0, this.relativeTarget = void 0;
          return;
        }
        const w = this.options.transition || y.getDefaultTransition() || fA, { onLayoutAnimationStart: T, onLayoutAnimationComplete: A } = y.getProps(), _ = !this.targetLayout || !r0(this.targetLayout, v), C = !l && c;
        if (this.options.layoutRoot || this.resumeFrom || C || l && (_ || !this.currentAnimation)) {
          this.resumeFrom && (this.resumingFrom = this.resumeFrom, this.resumingFrom.resumingFrom = void 0);
          const E = {
            ...zd(w, "layout"),
            onPlay: T,
            onComplete: A
          };
          (y.shouldReduceMotion || this.options.layoutRoot) && (E.delay = 0, E.type = !1), this.startAnimation(E), this.setAnimationOrigin(S, C, E.path);
        } else
          l || jy(this), this.isLead() && this.options.onExitComplete && this.options.onExitComplete();
        this.targetLayout = v;
      });
    }
    unmount() {
      this.options.layoutId && this.willUpdate(), this.root.nodes.remove(this);
      const d = this.getStack();
      d && d.remove(this), this.parent && this.parent.children.delete(this), this.instance = void 0, this.eventHandlers.clear(), Xn(this.updateProjection);
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
      this.isUpdateBlocked() || (this.isUpdating = !0, this.nodes && this.nodes.forEach(lA), this.animationId++);
    }
    getTransformTemplate() {
      const { visualElement: d } = this.options;
      return d && d.getProps().transformTemplate;
    }
    willUpdate(d = !0) {
      if (this.root.hasTreeAnimated = !0, this.root.isUpdateBlocked()) {
        this.options.onExitComplete && this.options.onExitComplete();
        return;
      }
      if (window.MotionCancelOptimisedAnimation && !this.hasCheckedOptimisedAppear && s0(this), !this.root.isUpdating && this.root.startUpdate(), this.isLayoutDirty)
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
      this.prevTransformTemplateValue = y ? y(this.latestValues, "") : void 0, this.updateSnapshot(), d && this.notifyListeners("willUpdate");
    }
    update() {
      if (this.updateScheduled = !1, this.isUpdateBlocked()) {
        const m = this.updateBlockedByResize;
        this.unblockUpdate(), this.updateBlockedByResize = !1, this.clearAllSnapshots(), m && this.nodes.forEach(rA), this.nodes.forEach(Dy);
        return;
      }
      if (this.animationId <= this.animationCommitId) {
        this.nodes.forEach(Ny);
        return;
      }
      this.animationCommitId = this.animationId, this.isUpdating ? (this.isUpdating = !1, this.nodes.forEach(oA), this.nodes.forEach(iA), this.nodes.forEach(Jk), this.nodes.forEach(qk)) : this.nodes.forEach(Ny), this.clearAllSnapshots();
      const p = lt.now();
      Je.delta = sn(0, 1e3 / 60, p - Je.timestamp), Je.timestamp = p, Je.isProcessing = !0, qu.update.process(Je), qu.preRender.process(Je), qu.render.process(Je), Je.isProcessing = !1;
    }
    didUpdate() {
      this.updateScheduled || (this.updateScheduled = !0, Hd.read(this.scheduleUpdate));
    }
    clearAllSnapshots() {
      this.nodes.forEach(nA), this.sharedNodes.forEach(uA);
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
      this.snapshot || !this.instance || (this.snapshot = this.measure(), this.snapshot && !ut(this.snapshot.measuredBox.x) && !ut(this.snapshot.measuredBox.y) && (this.snapshot = void 0));
    }
    updateLayout() {
      if (!this.instance || (this.updateScroll(), !(this.options.alwaysMeasureLayout && this.isLead()) && !this.isLayoutDirty))
        return;
      if (this.resumeFrom && !this.resumeFrom.instance)
        for (let m = 0; m < this.path.length; m++)
          this.path[m].updateScroll();
      const d = this.layout;
      this.layout = this.measure(!1), this.layoutVersion++, this.layoutCorrected || (this.layoutCorrected = He()), this.isLayoutDirty = !1, this.projectionDelta = void 0, this.notifyListeners("measure", this.layout.layoutBox);
      const { visualElement: p } = this.options;
      p && p.notify("LayoutMeasure", this.layout.layoutBox, d ? d.layoutBox : void 0);
    }
    updateScroll(d = "measure") {
      let p = !!(this.options.layoutScroll && this.instance);
      if (this.scroll && this.scroll.animationId === this.root.animationId && this.scroll.phase === d && (p = !1), p && this.instance) {
        const m = i(this.instance);
        this.scroll = {
          animationId: this.root.animationId,
          phase: d,
          isRoot: m,
          offset: o(this.instance),
          wasRoot: this.scroll ? this.scroll.isRoot : m
        };
      }
    }
    resetTransform() {
      if (!a)
        return;
      const d = this.isLayoutDirty || this.shouldResetTransform || this.options.alwaysMeasureLayout, p = this.projectionDelta && !n0(this.projectionDelta), m = this.getTransformTemplate(), y = m ? m(this.latestValues, "") : void 0, S = y !== this.prevTransformTemplateValue;
      d && this.instance && (p || hr(this.latestValues) || S) && (a(this.instance, y), this.shouldResetTransform = !1, this.scheduleRender());
    }
    measure(d = !0) {
      const p = this.measurePageBox();
      let m = this.removeElementScroll(p);
      return d && (m = this.removeTransform(m)), pA(m), {
        animationId: this.root.animationId,
        measuredBox: p,
        layoutBox: m,
        latestValues: {},
        source: this.id
      };
    }
    measurePageBox() {
      var y;
      const { visualElement: d } = this.options;
      if (!d)
        return He();
      const p = d.measureViewportBox();
      if (!(((y = this.scroll) == null ? void 0 : y.wasRoot) || this.path.some(mA))) {
        const { scroll: S } = this.root;
        S && (tn(p.x, S.offset.x), tn(p.y, S.offset.y));
      }
      return p;
    }
    removeElementScroll(d) {
      var m;
      const p = He();
      if ($t(p, d), (m = this.scroll) != null && m.wasRoot)
        return p;
      for (let y = 0; y < this.path.length; y++) {
        const S = this.path[y], { scroll: l, options: c } = S;
        S !== this.root && l && c.layoutScroll && (l.wasRoot && $t(p, d), tn(p.x, l.offset.x), tn(p.y, l.offset.y));
      }
      return p;
    }
    applyTransform(d, p = !1, m) {
      var S, l;
      const y = m || He();
      $t(y, d);
      for (let c = 0; c < this.path.length; c++) {
        const v = this.path[c];
        !p && v.options.layoutScroll && v.scroll && v !== v.root && (tn(y.x, -v.scroll.offset.x), tn(y.y, -v.scroll.offset.y)), hr(v.latestValues) && ya(y, v.latestValues, (S = v.layout) == null ? void 0 : S.layoutBox);
      }
      return hr(this.latestValues) && ya(y, this.latestValues, (l = this.layout) == null ? void 0 : l.layoutBox), y;
    }
    removeTransform(d) {
      var m;
      const p = He();
      $t(p, d);
      for (let y = 0; y < this.path.length; y++) {
        const S = this.path[y];
        if (!hr(S.latestValues))
          continue;
        let l;
        S.instance && (Wc(S.latestValues) && S.updateSnapshot(), l = He(), $t(l, S.measurePageBox())), Ty(p, S.latestValues, (m = S.snapshot) == null ? void 0 : m.layoutBox, l);
      }
      return hr(this.latestValues) && Ty(p, this.latestValues), p;
    }
    setTargetDelta(d) {
      this.targetDelta = d, this.root.scheduleUpdateProjection(), this.isProjectionDirty = !0;
    }
    setOptions(d) {
      this.options = {
        ...this.options,
        ...d,
        crossfade: d.crossfade !== void 0 ? d.crossfade : !0
      };
    }
    clearMeasurements() {
      this.scroll = void 0, this.layout = void 0, this.snapshot = void 0, this.prevTransformTemplateValue = void 0, this.targetDelta = void 0, this.target = void 0, this.isLayoutDirty = !1;
    }
    forceRelativeParentToResolveTarget() {
      this.relativeParent && this.relativeParent.resolvedRelativeTargetAt !== Je.timestamp && this.relativeParent.resolveTargetDelta(!0);
    }
    resolveTargetDelta(d = !1) {
      var v;
      const p = this.getLead();
      this.isProjectionDirty || (this.isProjectionDirty = p.isProjectionDirty), this.isTransformDirty || (this.isTransformDirty = p.isTransformDirty), this.isSharedProjectionDirty || (this.isSharedProjectionDirty = p.isSharedProjectionDirty);
      const m = !!this.resumingFrom || this !== p;
      if (!(d || m && this.isSharedProjectionDirty || this.isProjectionDirty || (v = this.parent) != null && v.isProjectionDirty || this.attemptToResolveRelativeTarget || this.root.updateBlockedByResize))
        return;
      const { layout: S, layoutId: l } = this.options;
      if (!this.layout || !(S || l))
        return;
      this.resolvedRelativeTargetAt = Je.timestamp;
      const c = this.getClosestProjectingParent();
      c && this.linkedParentVersion !== c.layoutVersion && !c.options.layoutRoot && this.removeRelativeTarget(), !this.targetDelta && !this.relativeTarget && (this.options.layoutAnchor !== !1 && c && c.layout ? this.createRelativeTarget(c, this.layout.layoutBox, c.layout.layoutBox) : this.removeRelativeTarget()), !(!this.relativeTarget && !this.targetDelta) && (this.target || (this.target = He(), this.targetWithTransforms = He()), this.relativeTarget && this.relativeTargetOrigin && this.relativeParent && this.relativeParent.target ? (this.forceRelativeParentToResolveTarget(), Ik(this.target, this.relativeTarget, this.relativeParent.target, this.options.layoutAnchor || void 0)) : this.targetDelta ? (this.resumingFrom ? this.applyTransform(this.layout.layoutBox, !1, this.target) : $t(this.target, this.layout.layoutBox), Hv(this.target, this.targetDelta)) : $t(this.target, this.layout.layoutBox), this.attemptToResolveRelativeTarget && (this.attemptToResolveRelativeTarget = !1, this.options.layoutAnchor !== !1 && c && !!c.resumingFrom == !!this.resumingFrom && !c.options.layoutScroll && c.target && this.animationProgress !== 1 ? this.createRelativeTarget(c, this.target, c.target) : this.relativeParent = this.relativeTarget = void 0));
    }
    getClosestProjectingParent() {
      if (!(!this.parent || Wc(this.parent.latestValues) || Uv(this.parent.latestValues)))
        return this.parent.isProjecting() ? this.parent : this.parent.getClosestProjectingParent();
    }
    isProjecting() {
      return !!((this.relativeTarget || this.targetDelta || this.options.layoutRoot) && this.layout);
    }
    createRelativeTarget(d, p, m) {
      this.relativeParent = d, this.linkedParentVersion = d.layoutVersion, this.forceRelativeParentToResolveTarget(), this.relativeTarget = He(), this.relativeTargetOrigin = He(), Na(this.relativeTargetOrigin, p, m, this.options.layoutAnchor || void 0), $t(this.relativeTarget, this.relativeTargetOrigin);
    }
    removeRelativeTarget() {
      this.relativeParent = this.relativeTarget = void 0;
    }
    calcProjection() {
      var w;
      const d = this.getLead(), p = !!this.resumingFrom || this !== d;
      let m = !0;
      if ((this.isProjectionDirty || (w = this.parent) != null && w.isProjectionDirty) && (m = !1), p && (this.isSharedProjectionDirty || this.isTransformDirty) && (m = !1), this.resolvedRelativeTargetAt === Je.timestamp && (m = !1), m)
        return;
      const { layout: y, layoutId: S } = this.options;
      if (this.isTreeAnimating = !!(this.parent && this.parent.isTreeAnimating || this.currentAnimation || this.pendingAnimation), this.isTreeAnimating || (this.targetDelta = this.relativeTarget = void 0), !this.layout || !(y || S))
        return;
      $t(this.layoutCorrected, this.layout.layoutBox);
      const l = this.treeScale.x, c = this.treeScale.y;
      ck(this.layoutCorrected, this.treeScale, this.path, p), d.layout && !d.target && (this.treeScale.x !== 1 || this.treeScale.y !== 1) && (d.target = d.layout.layoutBox, d.targetWithTransforms = He());
      const { target: v } = d;
      if (!v) {
        this.prevProjectionDelta && (this.createProjectionDeltas(), this.scheduleRender());
        return;
      }
      !this.projectionDelta || !this.prevProjectionDelta ? this.createProjectionDeltas() : (gy(this.prevProjectionDelta.x, this.projectionDelta.x), gy(this.prevProjectionDelta.y, this.projectionDelta.y)), vi(this.projectionDelta, this.layoutCorrected, v, this.latestValues), (this.treeScale.x !== l || this.treeScale.y !== c || !Py(this.projectionDelta.x, this.prevProjectionDelta.x) || !Py(this.projectionDelta.y, this.prevProjectionDelta.y)) && (this.hasProjected = !0, this.scheduleRender(), this.notifyListeners("projectionUpdate", v));
    }
    hide() {
      this.isVisible = !1;
    }
    show() {
      this.isVisible = !0;
    }
    scheduleRender(d = !0) {
      var p;
      if ((p = this.options.visualElement) == null || p.scheduleRender(), d) {
        const m = this.getStack();
        m && m.scheduleRender();
      }
      this.resumingFrom && !this.resumingFrom.instance && (this.resumingFrom = void 0);
    }
    createProjectionDeltas() {
      this.prevProjectionDelta = co(), this.projectionDelta = co(), this.projectionDeltaWithTransform = co();
    }
    setAnimationOrigin(d, p = !1, m) {
      const y = this.snapshot, S = y ? y.latestValues : {}, l = { ...this.latestValues }, c = co();
      (!this.relativeParent || !this.relativeParent.options.layoutRoot) && (this.relativeTarget = this.relativeTargetOrigin = void 0), this.attemptToResolveRelativeTarget = !p;
      const v = He(), w = y ? y.source : void 0, T = this.layout ? this.layout.source : void 0, A = w !== T, _ = this.getStack(), C = !_ || _.members.length <= 1, E = !!(A && !C && this.options.crossfade === !0 && !this.path.some(dA));
      this.animationProgress = 0;
      let D;
      const O = m == null ? void 0 : m.interpolateProjection(d);
      this.mixTargetDelta = (W) => {
        const H = W / 1e3, Y = O == null ? void 0 : O(H);
        Y ? (c.x.translate = Y.x, c.x.scale = be(d.x.scale, 1, H), c.x.origin = d.x.origin, c.x.originPoint = d.x.originPoint, c.y.translate = Y.y, c.y.scale = be(d.y.scale, 1, H), c.y.origin = d.y.origin, c.y.originPoint = d.y.originPoint) : (Iy(c.x, d.x, H), Iy(c.y, d.y, H)), this.setTargetDelta(c), this.relativeTarget && this.relativeTargetOrigin && this.layout && this.relativeParent && this.relativeParent.layout && (Na(v, this.layout.layoutBox, this.relativeParent.layout.layoutBox, this.options.layoutAnchor || void 0), cA(this.relativeTarget, this.relativeTargetOrigin, v, H), D && Vk(this.relativeTarget, D) && (this.isProjectionDirty = !1), D || (D = He()), $t(D, this.relativeTarget)), A && (this.animationValues = l, $k(l, S, this.latestValues, H, E, C)), Y && Y.rotate !== void 0 && (this.animationValues || (this.animationValues = l), this.animationValues.pathRotation = Y.rotate), this.root.scheduleUpdateProjection(), this.scheduleRender(), this.animationProgress = H;
      }, this.mixTargetDelta(this.options.layoutRoot ? 1e3 : 0);
    }
    startAnimation(d) {
      var p, m, y;
      this.notifyListeners("animationStart"), (p = this.currentAnimation) == null || p.stop(), (y = (m = this.resumingFrom) == null ? void 0 : m.currentAnimation) == null || y.stop(), this.pendingAnimation && (Xn(this.pendingAnimation), this.pendingAnimation = void 0), this.pendingAnimation = Ce.update(() => {
        va.hasAnimatedSinceResize = !0, this.motionValue || (this.motionValue = yo(0)), this.motionValue.jump(0, !1), this.currentAnimation = Wk(this.motionValue, [0, 1e3], {
          ...d,
          velocity: 0,
          isSync: !0,
          onUpdate: (S) => {
            this.mixTargetDelta(S), d.onUpdate && d.onUpdate(S);
          },
          onStop: () => {
          },
          onComplete: () => {
            d.onComplete && d.onComplete(), this.completeAnimation();
          }
        }), this.resumingFrom && (this.resumingFrom.currentAnimation = this.currentAnimation), this.pendingAnimation = void 0;
      });
    }
    completeAnimation() {
      this.resumingFrom && (this.resumingFrom.currentAnimation = void 0, this.resumingFrom.preserveOpacity = void 0);
      const d = this.getStack();
      d && d.exitAnimationComplete(), this.resumingFrom = this.currentAnimation = this.animationValues = void 0, this.notifyListeners("animationComplete");
    }
    finishAnimation() {
      this.currentAnimation && (this.mixTargetDelta && this.mixTargetDelta(Xk), this.currentAnimation.stop()), this.completeAnimation();
    }
    applyTransformsToTarget() {
      const d = this.getLead();
      let { targetWithTransforms: p, target: m, layout: y, latestValues: S } = d;
      if (!(!p || !m || !y)) {
        if (this !== d && this.layout && y && l0(this.options.animationType, this.layout.layoutBox, y.layoutBox)) {
          m = this.target || He();
          const l = ut(this.layout.layoutBox.x);
          m.x.min = d.target.x.min, m.x.max = m.x.min + l;
          const c = ut(this.layout.layoutBox.y);
          m.y.min = d.target.y.min, m.y.max = m.y.min + c;
        }
        $t(p, m), ya(p, S), vi(this.projectionDeltaWithTransform, this.layoutCorrected, p, S);
      }
    }
    registerSharedNode(d, p) {
      this.sharedNodes.has(d) || this.sharedNodes.set(d, new Qk()), this.sharedNodes.get(d).add(p);
      const y = p.options.initialPromotionConfig;
      p.promote({
        transition: y ? y.transition : void 0,
        preserveFollowOpacity: y && y.shouldPreserveFollowOpacity ? y.shouldPreserveFollowOpacity(p) : void 0
      });
    }
    isLead() {
      const d = this.getStack();
      return d ? d.lead === this : !0;
    }
    getLead() {
      var p;
      const { layoutId: d } = this.options;
      return d ? ((p = this.getStack()) == null ? void 0 : p.lead) || this : this;
    }
    getPrevLead() {
      var p;
      const { layoutId: d } = this.options;
      return d ? (p = this.getStack()) == null ? void 0 : p.prevLead : void 0;
    }
    getStack() {
      const { layoutId: d } = this.options;
      if (d)
        return this.root.sharedNodes.get(d);
    }
    promote({ needsReset: d, transition: p, preserveFollowOpacity: m } = {}) {
      const y = this.getStack();
      y && y.promote(this, m), d && (this.projectionDelta = void 0, this.needsReset = !0), p && this.setOptions({ transition: p });
    }
    relegate() {
      const d = this.getStack();
      return d ? d.relegate(this) : !1;
    }
    resetSkewAndRotation() {
      const { visualElement: d } = this.options;
      if (!d)
        return;
      let p = !1;
      const { latestValues: m } = d;
      if ((m.z || m.rotate || m.rotateX || m.rotateY || m.rotateZ || m.skewX || m.skewY) && (p = !0), !p)
        return;
      const y = {};
      m.z && lc("z", d, y, this.animationValues);
      for (let S = 0; S < ac.length; S++)
        lc(`rotate${ac[S]}`, d, y, this.animationValues), lc(`skew${ac[S]}`, d, y, this.animationValues);
      d.render();
      for (const S in y)
        d.setStaticValue(S, y[S]), this.animationValues && (this.animationValues[S] = y[S]);
      d.scheduleRender();
    }
    applyProjectionStyles(d, p) {
      if (!this.instance || this.isSVG)
        return;
      if (!this.isVisible) {
        d.visibility = "hidden";
        return;
      }
      const m = this.getTransformTemplate();
      if (this.needsReset) {
        this.needsReset = !1, d.visibility = "", d.opacity = "", d.pointerEvents = ga(p == null ? void 0 : p.pointerEvents) || "", d.transform = m ? m(this.latestValues, "") : "none";
        return;
      }
      const y = this.getLead();
      if (!this.projectionDelta || !this.layout || !y.target) {
        this.options.layoutId && (d.opacity = this.latestValues.opacity !== void 0 ? this.latestValues.opacity : 1, d.pointerEvents = ga(p == null ? void 0 : p.pointerEvents) || ""), this.hasProjected && !hr(this.latestValues) && (d.transform = m ? m({}, "") : "none", this.hasProjected = !1);
        return;
      }
      d.visibility = "";
      const S = y.animationValues || y.latestValues;
      this.applyTransformsToTarget();
      let l = zk(this.projectionDeltaWithTransform, this.treeScale, S);
      m && (l = m(S, l)), d.transform = l;
      const { x: c, y: v } = this.projectionDelta;
      d.transformOrigin = `${c.origin * 100}% ${v.origin * 100}% 0`, y.animationValues ? d.opacity = y === this ? S.opacity ?? this.latestValues.opacity ?? 1 : this.preserveOpacity ? this.latestValues.opacity : S.opacityExit : d.opacity = y === this ? S.opacity !== void 0 ? S.opacity : "" : S.opacityExit !== void 0 ? S.opacityExit : 0;
      for (const w in Kc) {
        if (S[w] === void 0)
          continue;
        const { correct: T, applyTo: A, isCSSVariable: _ } = Kc[w], C = l === "none" ? S[w] : T(S[w], y);
        if (A) {
          const E = A.length;
          for (let D = 0; D < E; D++)
            d[A[D]] = C;
        } else
          _ ? this.options.visualElement.renderState.vars[w] = C : d[w] = C;
      }
      this.options.layoutId && (d.pointerEvents = y === this ? ga(p == null ? void 0 : p.pointerEvents) || "" : "none");
    }
    clearSnapshot() {
      this.resumeFrom = this.snapshot = void 0;
    }
    // Only run on root
    resetTree() {
      this.root.nodes.forEach((d) => {
        var p;
        return (p = d.currentAnimation) == null ? void 0 : p.stop();
      }), this.root.nodes.forEach(Dy), this.root.sharedNodes.clear();
    }
  };
}
function Jk(e) {
  e.updateLayout();
}
function qk(e) {
  var o;
  const n = ((o = e.resumeFrom) == null ? void 0 : o.snapshot) || e.snapshot;
  if (e.isLead() && e.layout && n && e.hasListeners("didUpdate")) {
    const { layoutBox: i, measuredBox: a } = e.layout, { animationType: f } = e.options, d = n.source !== e.layout.source;
    if (f === "size")
      en((l) => {
        const c = d ? n.measuredBox[l] : n.layoutBox[l], v = ut(c);
        c.min = i[l].min, c.max = c.min + v;
      });
    else if (f === "x" || f === "y") {
      const l = f === "x" ? "y" : "x";
      Yc(d ? n.measuredBox[l] : n.layoutBox[l], i[l]);
    } else l0(f, n.layoutBox, i) && en((l) => {
      const c = d ? n.measuredBox[l] : n.layoutBox[l], v = ut(i[l]);
      c.max = c.min + v, e.relativeTarget && !e.currentAnimation && (e.isProjectionDirty = !0, e.relativeTarget[l].max = e.relativeTarget[l].min + v);
    });
    const p = co();
    vi(p, i, n.layoutBox);
    const m = co();
    d ? vi(m, e.applyTransform(a, !0), n.measuredBox) : vi(m, i, n.layoutBox);
    const y = !n0(p);
    let S = !1;
    if (!e.resumeFrom) {
      const l = e.getClosestProjectingParent();
      if (l && !l.resumeFrom) {
        const { snapshot: c, layout: v } = l;
        if (c && v) {
          const w = e.options.layoutAnchor || void 0, T = He();
          Na(T, n.layoutBox, c.layoutBox, w);
          const A = He();
          Na(A, i, v.layoutBox, w), r0(T, A) || (S = !0), l.options.layoutRoot && (e.relativeTarget = A, e.relativeTargetOrigin = T, e.relativeParent = l);
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
function eA(e) {
  e.parent && (e.isProjecting() || (e.isProjectionDirty = e.parent.isProjectionDirty), e.isSharedProjectionDirty || (e.isSharedProjectionDirty = !!(e.isProjectionDirty || e.parent.isProjectionDirty || e.parent.isSharedProjectionDirty)), e.isTransformDirty || (e.isTransformDirty = e.parent.isTransformDirty));
}
function tA(e) {
  e.isProjectionDirty = e.isSharedProjectionDirty = e.isTransformDirty = !1;
}
function nA(e) {
  e.clearSnapshot();
}
function Dy(e) {
  e.clearMeasurements();
}
function rA(e) {
  e.isLayoutDirty = !0, e.updateLayout();
}
function Ny(e) {
  e.isLayoutDirty = !1;
}
function oA(e) {
  e.isAnimationBlocked && e.layout && !e.isLayoutDirty && (e.snapshot = e.layout, e.isLayoutDirty = !0);
}
function iA(e) {
  const { visualElement: n } = e.options;
  n && n.getProps().onBeforeLayoutMeasure && n.notify("BeforeLayoutMeasure"), e.resetTransform();
}
function jy(e) {
  e.finishAnimation(), e.targetDelta = e.relativeTarget = e.target = void 0, e.isProjectionDirty = !0;
}
function sA(e) {
  e.resolveTargetDelta();
}
function aA(e) {
  e.calcProjection();
}
function lA(e) {
  e.resetSkewAndRotation();
}
function uA(e) {
  e.removeLeadSnapshot();
}
function Iy(e, n, o) {
  e.translate = be(n.translate, 0, o), e.scale = be(n.scale, 1, o), e.origin = n.origin, e.originPoint = n.originPoint;
}
function Fy(e, n, o, i) {
  e.min = be(n.min, o.min, i), e.max = be(n.max, o.max, i);
}
function cA(e, n, o, i) {
  Fy(e.x, n.x, o.x, i), Fy(e.y, n.y, o.y, i);
}
function dA(e) {
  return e.animationValues && e.animationValues.opacityExit !== void 0;
}
const fA = {
  duration: 0.45,
  ease: [0.4, 0, 0.1, 1]
}, Oy = (e) => typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().includes(e), Ly = Oy("applewebkit/") && !Oy("chrome/") ? Math.round : jt;
function Vy(e) {
  e.min = Ly(e.min), e.max = Ly(e.max);
}
function pA(e) {
  Vy(e.x), Vy(e.y);
}
function l0(e, n, o) {
  return e === "position" || e === "preserve-aspect" && !jk(Cy(n), Cy(o), 0.2);
}
function mA(e) {
  var n;
  return e !== e.root && ((n = e.scroll) == null ? void 0 : n.wasRoot);
}
const hA = a0({
  attachResizeListener: (e, n) => bi(e, "resize", n),
  measureScroll: () => {
    var e, n;
    return {
      x: document.documentElement.scrollLeft || ((e = document.body) == null ? void 0 : e.scrollLeft) || 0,
      y: document.documentElement.scrollTop || ((n = document.body) == null ? void 0 : n.scrollTop) || 0
    };
  },
  checkIsScrollRoot: () => !0
}), uc = {
  current: void 0
}, u0 = a0({
  measureScroll: (e) => ({
    x: e.scrollLeft,
    y: e.scrollTop
  }),
  defaultParent: () => {
    if (!uc.current) {
      const e = new hA({});
      e.mount(window), e.setOptions({ layoutScroll: !0 }), uc.current = e;
    }
    return uc.current;
  },
  resetTransform: (e, n) => {
    e.style.transform = n !== void 0 ? n : "none";
  },
  checkIsScrollRoot: (e) => window.getComputedStyle(e).position === "fixed"
}), Zd = b.createContext({
  transformPagePoint: (e) => e,
  isStatic: !1,
  reducedMotion: "never"
});
function zy(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function yA(...e) {
  return (n) => {
    let o = !1;
    const i = e.map((a) => {
      const f = zy(a, n);
      return !o && typeof f == "function" && (o = !0), f;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const f = i[a];
          typeof f == "function" ? f() : zy(e[a], null);
        }
      };
  };
}
function gA(...e) {
  return b.useCallback(yA(...e), e);
}
class vA extends b.Component {
  getSnapshotBeforeUpdate(n) {
    const o = this.props.childRef.current;
    if (fa(o) && n.isPresent && !this.props.isPresent && this.props.pop !== !1) {
      const i = o.offsetParent, a = fa(i) && i.offsetWidth || 0, f = fa(i) && i.offsetHeight || 0, d = getComputedStyle(o), p = this.props.sizeRef.current;
      p.height = parseFloat(d.height), p.width = parseFloat(d.width), p.top = o.offsetTop, p.left = o.offsetLeft, p.right = a - p.width - p.left, p.bottom = f - p.height - p.top, p.direction = d.direction;
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
function SA({ children: e, isPresent: n, anchorX: o, anchorY: i, root: a, pop: f }) {
  var c;
  const d = b.useId(), p = b.useRef(null), m = b.useRef({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    direction: "ltr"
  }), { nonce: y } = b.useContext(Zd), S = ((c = e.props) == null ? void 0 : c.ref) ?? (e == null ? void 0 : e.ref), l = gA(p, S);
  return b.useInsertionEffect(() => {
    const { width: v, height: w, top: T, left: A, right: _, bottom: C, direction: E } = m.current;
    if (n || f === !1 || !p.current || !v || !w)
      return;
    const D = E === "rtl", O = o === "left" ? D ? `right: ${_}` : `left: ${A}` : D ? `left: ${A}` : `right: ${_}`, W = i === "bottom" ? `bottom: ${C}` : `top: ${T}`;
    p.current.dataset.motionPopId = d;
    const H = document.createElement("style");
    y && (H.nonce = y);
    const Y = a ?? document.head;
    return Y.appendChild(H), H.sheet && H.sheet.insertRule(`
          [data-motion-pop-id="${d}"] {
            position: absolute !important;
            width: ${v}px !important;
            height: ${w}px !important;
            ${O}px !important;
            ${W}px !important;
          }
        `), () => {
      var L;
      (L = p.current) == null || L.removeAttribute("data-motion-pop-id"), Y.contains(H) && Y.removeChild(H);
    };
  }, [n]), x.jsx(vA, { isPresent: n, childRef: p, sizeRef: m, pop: f, children: f === !1 ? e : b.cloneElement(e, { ref: l }) });
}
const wA = ({ children: e, initial: n, isPresent: o, onExitComplete: i, custom: a, presenceAffectsLayout: f, mode: d, anchorX: p, anchorY: m, root: y }) => {
  const S = Pd(xA), l = b.useId();
  let c = !0, v = b.useMemo(() => (c = !1, {
    id: l,
    initial: n,
    isPresent: o,
    custom: a,
    onExitComplete: (w) => {
      S.set(w, !0);
      for (const T of S.values())
        if (!T)
          return;
      i && i();
    },
    register: (w) => (S.set(w, !1), () => S.delete(w))
  }), [o, S, i]);
  return f && c && (v = { ...v }), b.useMemo(() => {
    S.forEach((w, T) => S.set(T, !1));
  }, [o]), b.useEffect(() => {
    !o && !S.size && i && i();
  }, [o]), e = x.jsx(SA, { pop: d === "popLayout", isPresent: o, anchorX: p, anchorY: m, root: y, children: e }), x.jsx(Ua.Provider, { value: v, children: e });
};
function xA() {
  return /* @__PURE__ */ new Map();
}
function c0(e = !0) {
  const n = b.useContext(Ua);
  if (n === null)
    return [!0, null];
  const { isPresent: o, onExitComplete: i, register: a } = n, f = b.useId();
  b.useEffect(() => {
    if (e)
      return a(f);
  }, [e]);
  const d = b.useCallback(() => e && i && i(f), [f, i, e]);
  return !o && i ? [!1, d] : [!0];
}
const Zs = (e) => e.key || "";
function By(e) {
  const n = [];
  return b.Children.forEach(e, (o) => {
    b.isValidElement(o) && n.push(o);
  }), n;
}
const Ka = ({ children: e, custom: n, initial: o = !0, onExitComplete: i, presenceAffectsLayout: a = !0, mode: f = "sync", propagate: d = !1, anchorX: p = "left", anchorY: m = "top", root: y }) => {
  const [S, l] = c0(d), c = b.useMemo(() => By(e), [e]), v = d && !S ? [] : c.map(Zs), w = b.useRef(!0), T = b.useRef(c), A = Pd(() => /* @__PURE__ */ new Map()), _ = b.useRef(/* @__PURE__ */ new Set()), [C, E] = b.useState(c), [D, O] = b.useState(c);
  Lg(() => {
    w.current = !1, T.current = c;
    for (let Y = 0; Y < D.length; Y++) {
      const L = Zs(D[Y]);
      v.includes(L) ? (A.delete(L), _.current.delete(L)) : A.get(L) !== !0 && A.set(L, !1);
    }
  }, [D, v.length, v.join("-")]);
  const W = [];
  if (c !== C) {
    let Y = [...c];
    for (let L = 0; L < D.length; L++) {
      const X = D[L], se = Zs(X);
      v.includes(se) || (Y.splice(L, 0, X), W.push(X));
    }
    return f === "wait" && W.length && (Y = W), O(By(Y)), E(c), null;
  }
  const { forceRender: H } = b.useContext(Cd);
  return x.jsx(x.Fragment, { children: D.map((Y) => {
    const L = Zs(Y), X = d && !S ? !1 : c === D || v.includes(L), se = () => {
      if (_.current.has(L))
        return;
      if (A.has(L))
        _.current.add(L), A.set(L, !0);
      else
        return;
      let Z = !0;
      A.forEach((de) => {
        de || (Z = !1);
      }), Z && (H == null || H(), O(T.current), d && (l == null || l()), i && i());
    };
    return x.jsx(wA, { isPresent: X, initial: !w.current || o ? void 0 : !1, custom: n, presenceAffectsLayout: a, mode: f, root: y, onExitComplete: X ? void 0 : se, anchorX: p, anchorY: m, children: Y }, L);
  }) });
}, d0 = b.createContext({ strict: !1 }), $y = {
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
let Uy = !1;
function _A() {
  if (Uy)
    return;
  const e = {};
  for (const n in $y)
    e[n] = {
      isEnabled: (o) => $y[n].some((i) => !!o[i])
    };
  zv(e), Uy = !0;
}
function f0() {
  return _A(), sk();
}
function TA(e) {
  const n = f0();
  for (const o in e)
    n[o] = {
      ...n[o],
      ...e[o]
    };
  zv(n);
}
const kA = /* @__PURE__ */ new Set([
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
function ja(e) {
  return e.startsWith("while") || e.startsWith("drag") && e !== "draggable" || e.startsWith("layout") || e.startsWith("onTap") || e.startsWith("onPan") || e.startsWith("onLayout") || kA.has(e);
}
let p0 = (e) => !ja(e);
function AA(e) {
  typeof e == "function" && (p0 = (n) => n.startsWith("on") ? !ja(n) : e(n));
}
try {
  AA(require("@emotion/is-prop-valid").default);
} catch {
}
function bA(e, n, o) {
  const i = {};
  for (const a in e)
    a === "values" && typeof e.values == "object" || qe(e[a]) || (p0(a) || o === !0 && ja(a) || !n && !ja(a) || // If trying to use native HTML drag events, forward drag listeners
    e.draggable && a.startsWith("onDrag")) && (i[a] = e[a]);
  return i;
}
const Ya = /* @__PURE__ */ b.createContext({});
function CA(e, n) {
  if (Ga(e)) {
    const { initial: o, animate: i } = e;
    return {
      initial: o === !1 || Ai(o) ? o : void 0,
      animate: Ai(i) ? i : void 0
    };
  }
  return e.inherit !== !1 ? n : {};
}
function PA(e) {
  const { initial: n, animate: o } = CA(e, b.useContext(Ya));
  return b.useMemo(() => ({ initial: n, animate: o }), [Hy(n), Hy(o)]);
}
function Hy(e) {
  return Array.isArray(e) ? e.join(" ") : e;
}
const Jd = () => ({
  style: {},
  transform: {},
  transformOrigin: {},
  vars: {}
});
function m0(e, n, o) {
  for (const i in n)
    !qe(n[i]) && !Kv(i, o) && (e[i] = n[i]);
}
function EA({ transformTemplate: e }, n) {
  return b.useMemo(() => {
    const o = Jd();
    return Qd(o, n, e), Object.assign({}, o.vars, o.style);
  }, [n]);
}
function MA(e, n) {
  const o = e.style || {}, i = {};
  return m0(i, o, e), Object.assign(i, EA(e, n)), i;
}
function RA(e, n) {
  const o = {}, i = MA(e, n);
  return e.drag && e.dragListener !== !1 && (o.draggable = !1, i.userSelect = i.WebkitUserSelect = i.WebkitTouchCallout = "none", i.touchAction = e.drag === !0 ? "none" : `pan-${e.drag === "x" ? "y" : "x"}`), e.tabIndex === void 0 && (e.onTap || e.onTapStart || e.whileTap) && (o.tabIndex = 0), o.style = i, o;
}
const h0 = () => ({
  ...Jd(),
  attrs: {}
});
function DA(e, n, o, i) {
  const a = b.useMemo(() => {
    const f = h0();
    return Yv(f, n, Xv(i), e.transformTemplate, e.style), {
      ...f.attrs,
      style: { ...f.style }
    };
  }, [n]);
  if (e.style) {
    const f = {};
    m0(f, e.style, e), a.style = { ...f, ...a.style };
  }
  return a;
}
const NA = [
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
function qd(e) {
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
      !!(NA.indexOf(e) > -1 || /**
       * If it contains a capital letter, it's an SVG component
       */
      /[A-Z]/u.test(e))
    )
  );
}
function jA(e, n, o, { latestValues: i }, a, f = !1, d) {
  const m = (d ?? qd(e) ? DA : RA)(n, i, a, e), y = bA(n, typeof e == "string", f), S = e !== b.Fragment ? { ...y, ...m, ref: o } : {}, { children: l } = n, c = b.useMemo(() => qe(l) ? l.get() : l, [l]);
  return b.createElement(e, {
    ...S,
    children: c
  });
}
function IA({ scrapeMotionValuesFromProps: e, createRenderState: n }, o, i, a) {
  return {
    latestValues: FA(o, i, a, e),
    renderState: n()
  };
}
function FA(e, n, o, i) {
  const a = {}, f = i(e, {});
  for (const c in f)
    a[c] = ga(f[c]);
  let { initial: d, animate: p } = e;
  const m = Ga(e), y = Lv(e);
  n && y && !m && e.inherit !== !1 && (d === void 0 && (d = n.initial), p === void 0 && (p = n.animate));
  let S = o ? o.initial === !1 : !1;
  S = S || d === !1;
  const l = S ? p : d;
  if (l && typeof l != "boolean" && !Wa(l)) {
    const c = Array.isArray(l) ? l : [l];
    for (let v = 0; v < c.length; v++) {
      const w = $d(e, c[v]);
      if (w) {
        const { transitionEnd: T, transition: A, ..._ } = w;
        for (const C in _) {
          let E = _[C];
          if (Array.isArray(E)) {
            const D = S ? E.length - 1 : 0;
            E = E[D];
          }
          E !== null && (a[C] = E);
        }
        for (const C in T)
          a[C] = T[C];
      }
    }
  }
  return a;
}
const y0 = (e) => (n, o) => {
  const i = b.useContext(Ya), a = b.useContext(Ua), f = () => IA(e, n, i, a);
  return o ? f() : Pd(f);
}, OA = /* @__PURE__ */ y0({
  scrapeMotionValuesFromProps: Xd,
  createRenderState: Jd
}), LA = /* @__PURE__ */ y0({
  scrapeMotionValuesFromProps: Zv,
  createRenderState: h0
}), VA = Symbol.for("motionComponentSymbol");
function zA(e, n, o) {
  const i = b.useRef(o);
  b.useInsertionEffect(() => {
    i.current = o;
  });
  const a = b.useRef(null);
  return b.useCallback((f) => {
    var p;
    f && ((p = e.onMount) == null || p.call(e, f)), n && (f ? n.mount(f) : n.unmount());
    const d = i.current;
    if (typeof d == "function")
      if (f) {
        const m = d(f);
        typeof m == "function" && (a.current = m);
      } else a.current ? (a.current(), a.current = null) : d(f);
    else d && (d.current = f);
  }, [n]);
}
const g0 = b.createContext({});
function so(e) {
  return e && typeof e == "object" && Object.prototype.hasOwnProperty.call(e, "current");
}
function BA(e, n, o, i, a, f) {
  var E, D;
  const { visualElement: d } = b.useContext(Ya), p = b.useContext(d0), m = b.useContext(Ua), y = b.useContext(Zd), S = y.reducedMotion, l = y.skipAnimations, c = b.useRef(null), v = b.useRef(!1);
  i = i || p.renderer, !c.current && i && (c.current = i(e, {
    visualState: n,
    parent: d,
    props: o,
    presenceContext: m,
    blockInitialAnimation: m ? m.initial === !1 : !1,
    reducedMotionConfig: S,
    skipAnimations: l,
    isSVG: f
  }), v.current && c.current && (c.current.manuallyAnimateOnMount = !0));
  const w = c.current, T = b.useContext(g0);
  w && !w.projection && a && (w.type === "html" || w.type === "svg") && $A(c.current, o, a, T);
  const A = b.useRef(!1);
  b.useInsertionEffect(() => {
    w && A.current && w.update(o, m);
  });
  const _ = o[bv], C = b.useRef(!!_ && typeof window < "u" && !((E = window.MotionHandoffIsComplete) != null && E.call(window, _)) && ((D = window.MotionHasOptimisedAnimation) == null ? void 0 : D.call(window, _)));
  return Lg(() => {
    v.current = !0, w && (A.current = !0, window.MotionIsMounted = !0, w.updateFeatures(), w.scheduleRenderMicrotask(), C.current && w.animationState && w.animationState.animateChanges());
  }), b.useEffect(() => {
    w && (!C.current && w.animationState && w.animationState.animateChanges(), C.current && (queueMicrotask(() => {
      var O;
      (O = window.MotionHandoffMarkAsComplete) == null || O.call(window, _);
    }), C.current = !1), w.enteringChildren = void 0);
  }), w;
}
function $A(e, n, o, i) {
  const { layoutId: a, layout: f, drag: d, dragConstraints: p, layoutScroll: m, layoutRoot: y, layoutAnchor: S, layoutCrossfade: l } = n;
  e.projection = new o(e.latestValues, n["data-framer-portal-id"] ? void 0 : v0(e.parent)), e.projection.setOptions({
    layoutId: a,
    layout: f,
    alwaysMeasureLayout: !!d || p && so(p),
    visualElement: e,
    /**
     * TODO: Update options in an effect. This could be tricky as it'll be too late
     * to update by the time layout animations run.
     * We also need to fix this safeToRemove by linking it up to the one returned by usePresence,
     * ensuring it gets called if there's no potential layout animations.
     *
     */
    animationType: typeof f == "string" ? f : "both",
    initialPromotionConfig: i,
    crossfade: l,
    layoutScroll: m,
    layoutRoot: y,
    layoutAnchor: S
  });
}
function v0(e) {
  if (e)
    return e.options.allowProjection !== !1 ? e.projection : v0(e.parent);
}
function cc(e, { forwardMotionProps: n = !1, type: o } = {}, i, a) {
  i && TA(i);
  const f = o ? o === "svg" : qd(e), d = f ? LA : OA;
  function p(y, S) {
    let l;
    const c = {
      ...b.useContext(Zd),
      ...y,
      layoutId: UA(y)
    }, { isStatic: v } = c, w = PA(y), T = d(y, v);
    if (!v && typeof window < "u") {
      HA();
      const A = WA(c);
      l = A.MeasureLayout, w.visualElement = BA(e, T, c, a, A.ProjectionNode, f);
    }
    return x.jsxs(Ya.Provider, { value: w, children: [l && w.visualElement ? x.jsx(l, { visualElement: w.visualElement, ...c }) : null, jA(e, y, zA(T, w.visualElement, S), T, v, n, f)] });
  }
  p.displayName = `motion.${typeof e == "string" ? e : `create(${e.displayName ?? e.name ?? ""})`}`;
  const m = b.forwardRef(p);
  return m[VA] = e, m;
}
function UA({ layoutId: e }) {
  const n = b.useContext(Cd).id;
  return n && e !== void 0 ? n + "-" + e : e;
}
function HA(e, n) {
  b.useContext(d0).strict;
}
function WA(e) {
  const n = f0(), { drag: o, layout: i } = n;
  if (!o && !i)
    return {};
  const a = { ...o, ...i };
  return {
    MeasureLayout: o != null && o.isEnabled(e) || i != null && i.isEnabled(e) ? a.MeasureLayout : void 0,
    ProjectionNode: a.ProjectionNode
  };
}
function GA(e, n) {
  if (typeof Proxy > "u")
    return cc;
  const o = /* @__PURE__ */ new Map(), i = (f, d) => cc(f, d, e, n), a = (f, d) => i(f, d);
  return new Proxy(a, {
    /**
     * Called when `motion` is referenced with a prop: `motion.div`, `motion.input` etc.
     * The prop name is passed through as `key` and we can use that to generate a `motion`
     * DOM component with that name.
     */
    get: (f, d) => d === "create" ? i : (o.has(d) || o.set(d, cc(d, void 0, e, n)), o.get(d))
  });
}
const KA = (e, n) => n.isSVG ?? qd(e) ? new Tk(n) : new gk(n, {
  allowProjection: e !== b.Fragment
});
class YA extends er {
  /**
   * We dynamically generate the AnimationState manager as it contains a reference
   * to the underlying animation library. We only want to load that if we load this,
   * so people can optionally code split it out using the `m` component.
   */
  constructor(n) {
    super(n), n.animationState || (n.animationState = Pk(n));
  }
  updateAnimationControlsSubscription() {
    const { animate: n } = this.node.getProps();
    Wa(n) && (this.unmountControls = n.subscribe(this.node));
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
let QA = 0;
class XA extends er {
  constructor() {
    super(...arguments), this.id = QA++, this.isExitComplete = !1;
  }
  update() {
    var f;
    if (!this.node.presenceContext)
      return;
    const { isPresent: n, onExitComplete: o } = this.node.presenceContext, { isPresent: i } = this.node.prevPresenceContext || {};
    if (!this.node.animationState || n === i)
      return;
    if (n && i === !1) {
      if (this.isExitComplete) {
        const { initial: d, custom: p } = this.node.getProps();
        if (typeof d == "string" || typeof d == "object" && d !== null && !Array.isArray(d)) {
          const m = kr(this.node, d, p);
          if (m) {
            const { transition: y, transitionEnd: S, ...l } = m;
            for (const c in l)
              (f = this.node.getValue(c)) == null || f.jump(l[c]);
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
const ZA = {
  animation: {
    Feature: YA
  },
  exit: {
    Feature: XA
  }
};
function ji(e) {
  return {
    point: {
      x: e.pageX,
      y: e.pageY
    }
  };
}
const JA = (e) => (n) => Wd(n) && e(n, ji(n));
function Si(e, n, o, i) {
  return bi(e, n, JA(o), i);
}
const S0 = ({ current: e }) => e ? e.ownerDocument.defaultView : null, Wy = (e, n) => Math.abs(e - n);
function qA(e, n) {
  const o = Wy(e.x, n.x), i = Wy(e.y, n.y);
  return Math.sqrt(o ** 2 + i ** 2);
}
const Gy = /* @__PURE__ */ new Set(["auto", "scroll"]);
class w0 {
  constructor(n, o, { transformPagePoint: i, contextWindow: a = window, dragSnapToOrigin: f = !1, distanceThreshold: d = 3, element: p } = {}) {
    if (this.startEvent = null, this.lastMoveEvent = null, this.lastMoveEventInfo = null, this.lastRawMoveEventInfo = null, this.handlers = {}, this.contextWindow = window, this.scrollPositions = /* @__PURE__ */ new Map(), this.removeScrollListeners = null, this.onElementScroll = (v) => {
      this.handleScroll(v.target);
    }, this.onWindowScroll = () => {
      this.handleScroll(window);
    }, this.updatePoint = () => {
      if (!(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      this.lastRawMoveEventInfo && (this.lastMoveEventInfo = Js(this.lastRawMoveEventInfo, this.transformPagePoint));
      const v = dc(this.lastMoveEventInfo, this.history), w = this.startEvent !== null, T = qA(v.offset, { x: 0, y: 0 }) >= this.distanceThreshold;
      if (!w && !T)
        return;
      const { point: A } = v, { timestamp: _ } = Je;
      this.history.push({ ...A, timestamp: _ });
      const { onStart: C, onMove: E } = this.handlers;
      w || (C && C(this.lastMoveEvent, v), this.startEvent = this.lastMoveEvent), E && E(this.lastMoveEvent, v);
    }, this.handlePointerMove = (v, w) => {
      this.lastMoveEvent = v, this.lastRawMoveEventInfo = w, this.lastMoveEventInfo = Js(w, this.transformPagePoint), Ce.update(this.updatePoint, !0);
    }, this.handlePointerUp = (v, w) => {
      this.end();
      const { onEnd: T, onSessionEnd: A, resumeAnimation: _ } = this.handlers;
      if ((this.dragSnapToOrigin || !this.startEvent) && _ && _(), !(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      const C = dc(v.type === "pointercancel" ? this.lastMoveEventInfo : Js(w, this.transformPagePoint), this.history);
      this.startEvent && T && T(v, C), A && A(v, C);
    }, !Wd(n))
      return;
    this.dragSnapToOrigin = f, this.handlers = o, this.transformPagePoint = i, this.distanceThreshold = d, this.contextWindow = a || window;
    const m = ji(n), y = Js(m, this.transformPagePoint), { point: S } = y, { timestamp: l } = Je;
    this.history = [{ ...S, timestamp: l }];
    const { onSessionStart: c } = o;
    c && c(n, dc(y, this.history)), this.removeListeners = Ri(Si(this.contextWindow, "pointermove", this.handlePointerMove), Si(this.contextWindow, "pointerup", this.handlePointerUp), Si(this.contextWindow, "pointercancel", this.handlePointerUp)), p && this.startScrollTracking(p);
  }
  /**
   * Start tracking scroll on ancestors and window.
   */
  startScrollTracking(n) {
    let o = n.parentElement;
    for (; o; ) {
      const i = getComputedStyle(o);
      (Gy.has(i.overflowX) || Gy.has(i.overflowY)) && this.scrollPositions.set(o, {
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
    }, f = { x: a.x - o.x, y: a.y - o.y };
    f.x === 0 && f.y === 0 || (i ? this.lastMoveEventInfo && (this.lastMoveEventInfo.point.x += f.x, this.lastMoveEventInfo.point.y += f.y) : this.history.length > 0 && (this.history[0].x -= f.x, this.history[0].y -= f.y), this.scrollPositions.set(n, a), Ce.update(this.updatePoint, !0));
  }
  updateHandlers(n) {
    this.handlers = n;
  }
  end() {
    this.removeListeners && this.removeListeners(), this.removeScrollListeners && this.removeScrollListeners(), this.scrollPositions.clear(), Xn(this.updatePoint);
  }
}
function Js(e, n) {
  return n ? { point: n(e.point) } : e;
}
function Ky(e, n) {
  return { x: e.x - n.x, y: e.y - n.y };
}
function dc({ point: e }, n) {
  return {
    point: e,
    delta: Ky(e, x0(n)),
    offset: Ky(e, eb(n)),
    velocity: tb(n, 0.1)
  };
}
function eb(e) {
  return e[0];
}
function x0(e) {
  return e[e.length - 1];
}
function tb(e, n) {
  if (e.length < 2)
    return { x: 0, y: 0 };
  let o = e.length - 1, i = null;
  const a = x0(e);
  for (; o >= 0 && (i = e[o], !(a.timestamp - i.timestamp > /* @__PURE__ */ gt(n))); )
    o--;
  if (!i)
    return { x: 0, y: 0 };
  i === e[0] && e.length > 2 && a.timestamp - i.timestamp > /* @__PURE__ */ gt(n) * 2 && (i = e[1]);
  const f = /* @__PURE__ */ Nt(a.timestamp - i.timestamp);
  if (f === 0)
    return { x: 0, y: 0 };
  const d = {
    x: (a.x - i.x) / f,
    y: (a.y - i.y) / f
  };
  return d.x === 1 / 0 && (d.x = 0), d.y === 1 / 0 && (d.y = 0), d;
}
function nb(e, { min: n, max: o }, i) {
  return n !== void 0 && e < n ? e = i ? be(n, e, i.min) : Math.max(e, n) : o !== void 0 && e > o && (e = i ? be(o, e, i.max) : Math.min(e, o)), e;
}
function Yy(e, n, o) {
  return {
    min: n !== void 0 ? e.min + n : void 0,
    max: o !== void 0 ? e.max + o - (e.max - e.min) : void 0
  };
}
function rb(e, { top: n, left: o, bottom: i, right: a }) {
  return {
    x: Yy(e.x, o, a),
    y: Yy(e.y, n, i)
  };
}
function Qy(e, n) {
  let o = n.min - e.min, i = n.max - e.max;
  return n.max - n.min < e.max - e.min && ([o, i] = [i, o]), { min: o, max: i };
}
function ob(e, n) {
  return {
    x: Qy(e.x, n.x),
    y: Qy(e.y, n.y)
  };
}
function ib(e, n) {
  let o = 0.5;
  const i = ut(e), a = ut(n);
  return a > i ? o = /* @__PURE__ */ Ti(n.min, n.max - i, e.min) : i > a && (o = /* @__PURE__ */ Ti(e.min, e.max - a, n.min)), sn(0, 1, o);
}
function sb(e, n) {
  const o = {};
  return n.min !== void 0 && (o.min = n.min - e.min), n.max !== void 0 && (o.max = n.max - e.min), o;
}
const Qc = 0.35;
function ab(e = Qc) {
  return e === !1 ? e = 0 : e === !0 && (e = Qc), {
    x: Xy(e, "left", "right"),
    y: Xy(e, "top", "bottom")
  };
}
function Xy(e, n, o) {
  return {
    min: Zy(e, n),
    max: Zy(e, o)
  };
}
function Zy(e, n) {
  return typeof e == "number" ? e : e[n] || 0;
}
const lb = /* @__PURE__ */ new WeakMap();
class ub {
  constructor(n) {
    this.openDragLock = null, this.isDragging = !1, this.currentDirection = null, this.originPoint = { x: 0, y: 0 }, this.constraints = !1, this.hasMutatedConstraints = !1, this.elastic = He(), this.latestPointerEvent = null, this.latestPanInfo = null, this.visualElement = n;
  }
  start(n, { snapToCursor: o = !1, distanceThreshold: i } = {}) {
    const { presenceContext: a } = this.visualElement;
    if (a && a.isPresent === !1)
      return;
    const f = (l) => {
      o && this.snapToCursor(ji(l).point), this.stopAnimation();
    }, d = (l, c) => {
      const { drag: v, dragPropagation: w, onDragStart: T } = this.getProps();
      if (v && !w && (this.openDragLock && this.openDragLock(), this.openDragLock = FT(v), !this.openDragLock))
        return;
      this.latestPointerEvent = l, this.latestPanInfo = c, this.isDragging = !0, this.currentDirection = null, this.resolveConstraints(), this.visualElement.projection && (this.visualElement.projection.isAnimationBlocked = !0, this.visualElement.projection.target = void 0), en((_) => {
        let C = this.getAxisMotionValue(_).get() || 0;
        if (on.test(C)) {
          const { projection: E } = this.visualElement;
          if (E && E.layout) {
            const D = E.layout.layoutBox[_];
            D && (C = ut(D) * (parseFloat(C) / 100));
          }
        }
        this.originPoint[_] = C;
      }), T && Ce.update(() => T(l, c), !1, !0), Vc(this.visualElement, "transform");
      const { animationState: A } = this.visualElement;
      A && A.setActive("whileDrag", !0);
    }, p = (l, c) => {
      this.latestPointerEvent = l, this.latestPanInfo = c;
      const { dragPropagation: v, dragDirectionLock: w, onDirectionLock: T, onDrag: A } = this.getProps();
      if (!v && !this.openDragLock)
        return;
      const { offset: _ } = c;
      if (w && this.currentDirection === null) {
        this.currentDirection = db(_), this.currentDirection !== null && T && T(this.currentDirection);
        return;
      }
      this.updateAxis("x", c.point, _), this.updateAxis("y", c.point, _), this.visualElement.render(), A && Ce.update(() => A(l, c), !1, !0);
    }, m = (l, c) => {
      this.latestPointerEvent = l, this.latestPanInfo = c, this.stop(l, c), this.latestPointerEvent = null, this.latestPanInfo = null;
    }, y = () => {
      const { dragSnapToOrigin: l } = this.getProps();
      (l || this.constraints) && this.startAnimation({ x: 0, y: 0 });
    }, { dragSnapToOrigin: S } = this.getProps();
    this.panSession = new w0(n, {
      onSessionStart: f,
      onStart: d,
      onMove: p,
      onSessionEnd: m,
      resumeAnimation: y
    }, {
      transformPagePoint: this.visualElement.getTransformPagePoint(),
      dragSnapToOrigin: S,
      distanceThreshold: i,
      contextWindow: S0(this.visualElement),
      element: this.visualElement.current
    });
  }
  /**
   * @internal
   */
  stop(n, o) {
    const i = n || this.latestPointerEvent, a = o || this.latestPanInfo, f = this.isDragging;
    if (this.cancel(), !f || !a || !i)
      return;
    const { velocity: d } = a;
    this.startAnimation(d);
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
    if (!i || !qs(n, a, this.currentDirection))
      return;
    const f = this.getAxisMotionValue(n);
    let d = this.originPoint[n] + i[n];
    this.constraints && this.constraints[n] && (d = nb(d, this.constraints[n], this.elastic[n])), f.set(d);
  }
  resolveConstraints() {
    var f;
    const { dragConstraints: n, dragElastic: o } = this.getProps(), i = this.visualElement.projection && !this.visualElement.projection.layout ? this.visualElement.projection.measure(!1) : (f = this.visualElement.projection) == null ? void 0 : f.layout, a = this.constraints;
    n && so(n) ? this.constraints || (this.constraints = this.resolveRefConstraints()) : n && i ? this.constraints = rb(i.layoutBox, n) : this.constraints = !1, this.elastic = ab(o), a !== this.constraints && !so(n) && i && this.constraints && !this.hasMutatedConstraints && en((d) => {
      this.constraints !== !1 && this.getAxisMotionValue(d) && (this.constraints[d] = sb(i.layoutBox[d], this.constraints[d]));
    });
  }
  resolveRefConstraints() {
    const { dragConstraints: n, onMeasureDragConstraints: o } = this.getProps();
    if (!n || !so(n))
      return !1;
    const i = n.current;
    Pr(i !== null, "If `dragConstraints` is set as a React ref, that ref must be passed to another component's `ref` prop.", "drag-constraints-ref");
    const { projection: a } = this.visualElement;
    if (!a || !a.layout)
      return !1;
    a.root && (a.root.scroll = void 0, a.root.updateScroll());
    const f = dk(i, a.root, this.visualElement.getTransformPagePoint());
    let d = ob(a.layout.layoutBox, f);
    if (o) {
      const p = o(lk(d));
      this.hasMutatedConstraints = !!p, p && (d = $v(p));
    }
    return d;
  }
  startAnimation(n) {
    const { drag: o, dragMomentum: i, dragElastic: a, dragTransition: f, dragSnapToOrigin: d, onDragTransitionEnd: p } = this.getProps(), m = this.constraints || {}, y = en((S) => {
      if (!qs(S, o, this.currentDirection))
        return;
      let l = m && m[S] || {};
      (d === !0 || d === S) && (l = { min: 0, max: 0 });
      const c = a ? 200 : 1e6, v = a ? 40 : 1e7, w = {
        type: "inertia",
        velocity: i ? n[S] : 0,
        bounceStiffness: c,
        bounceDamping: v,
        timeConstant: 750,
        restDelta: 1,
        restSpeed: 10,
        ...f,
        ...l
      };
      return this.startAxisValueAnimation(S, w);
    });
    return Promise.all(y).then(p);
  }
  startAxisValueAnimation(n, o) {
    const i = this.getAxisMotionValue(n);
    return Vc(this.visualElement, n), i.start(Bd(n, i, 0, o, this.visualElement, !1));
  }
  stopAnimation() {
    en((n) => this.getAxisMotionValue(n).stop());
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
    en((o) => {
      const { drag: i } = this.getProps();
      if (!qs(o, i, this.currentDirection))
        return;
      const { projection: a } = this.visualElement, f = this.getAxisMotionValue(o);
      if (a && a.layout) {
        const { min: d, max: p } = a.layout.layoutBox[o], m = f.get() || 0;
        f.set(n[o] - be(d, p, 0.5) + m);
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
    if (!so(o) || !i || !this.constraints)
      return;
    this.stopAnimation();
    const a = { x: 0, y: 0 };
    en((d) => {
      const p = this.getAxisMotionValue(d);
      if (p && this.constraints !== !1) {
        const m = p.get();
        a[d] = ib({ min: m, max: m }, this.constraints[d]);
      }
    });
    const { transformTemplate: f } = this.visualElement.getProps();
    this.visualElement.current.style.transform = f ? f({}, "") : "none", i.root && i.root.updateScroll(), i.updateLayout(), this.constraints = !1, this.resolveConstraints(), en((d) => {
      if (!qs(d, n, null))
        return;
      const p = this.getAxisMotionValue(d), { min: m, max: y } = this.constraints[d];
      p.set(be(m, y, a[d]));
    }), this.visualElement.render();
  }
  addListeners() {
    if (!this.visualElement.current)
      return;
    lb.set(this.visualElement, this);
    const n = this.visualElement.current, o = Si(n, "pointerdown", (y) => {
      const { drag: S, dragListener: l = !0 } = this.getProps(), c = y.target, v = c !== n && $T(c);
      S && l && !v && this.start(y);
    });
    let i;
    const a = () => {
      const { dragConstraints: y } = this.getProps();
      so(y) && y.current && (this.constraints = this.resolveRefConstraints(), i || (i = cb(n, y.current, () => this.scalePositionWithinConstraints())));
    }, { projection: f } = this.visualElement, d = f.addEventListener("measure", a);
    f && !f.layout && (f.root && f.root.updateScroll(), f.updateLayout()), Ce.read(a);
    const p = bi(window, "resize", () => this.scalePositionWithinConstraints()), m = f.addEventListener("didUpdate", (({ delta: y, hasLayoutChanged: S }) => {
      this.isDragging && S && (en((l) => {
        const c = this.getAxisMotionValue(l);
        c && (this.originPoint[l] += y[l].translate, c.set(c.get() + y[l].translate));
      }), this.visualElement.render());
    }));
    return () => {
      p(), o(), d(), m && m(), i && i();
    };
  }
  getProps() {
    const n = this.visualElement.getProps(), { drag: o = !1, dragDirectionLock: i = !1, dragPropagation: a = !1, dragConstraints: f = !1, dragElastic: d = Qc, dragMomentum: p = !0 } = n;
    return {
      ...n,
      drag: o,
      dragDirectionLock: i,
      dragPropagation: a,
      dragConstraints: f,
      dragElastic: d,
      dragMomentum: p
    };
  }
}
function Jy(e) {
  let n = !0;
  return () => {
    if (n) {
      n = !1;
      return;
    }
    e();
  };
}
function cb(e, n, o) {
  const i = iy(e, Jy(o)), a = iy(n, Jy(o));
  return () => {
    i(), a();
  };
}
function qs(e, n, o) {
  return (n === !0 || n === e) && (o === null || o === e);
}
function db(e, n = 10) {
  let o = null;
  return Math.abs(e.y) > n ? o = "y" : Math.abs(e.x) > n && (o = "x"), o;
}
class fb extends er {
  constructor(n) {
    super(n), this.removeGroupControls = jt, this.removeListeners = jt, this.controls = new ub(n);
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
const fc = (e) => (n, o) => {
  e && Ce.update(() => e(n, o), !1, !0);
};
class pb extends er {
  constructor() {
    super(...arguments), this.removePointerDownListener = jt;
  }
  onPointerDown(n) {
    this.session = new w0(n, this.createPanHandlers(), {
      transformPagePoint: this.node.getTransformPagePoint(),
      contextWindow: S0(this.node)
    });
  }
  createPanHandlers() {
    const { onPanSessionStart: n, onPanStart: o, onPan: i, onPanEnd: a } = this.node.getProps();
    return {
      onSessionStart: fc(n),
      onStart: fc(o),
      onMove: fc(i),
      onEnd: (f, d) => {
        delete this.session, a && Ce.postRender(() => a(f, d));
      }
    };
  }
  mount() {
    this.removePointerDownListener = Si(this.node.current, "pointerdown", (n) => this.onPointerDown(n));
  }
  update() {
    this.session && this.session.updateHandlers(this.createPanHandlers());
  }
  unmount() {
    this.removePointerDownListener(), this.session && this.session.end();
  }
}
let pc = !1;
class mb extends b.Component {
  /**
   * This only mounts projection nodes for components that
   * need measuring, we might want to do it for all components
   * in order to incorporate transforms
   */
  componentDidMount() {
    const { visualElement: n, layoutGroup: o, switchLayoutGroup: i, layoutId: a } = this.props, { projection: f } = n;
    f && (o.group && o.group.add(f), i && i.register && a && i.register(f), pc && f.root.didUpdate(), f.addEventListener("animationComplete", () => {
      this.safeToRemove();
    }), f.setOptions({
      ...f.options,
      layoutDependency: this.props.layoutDependency,
      onExitComplete: () => this.safeToRemove()
    })), va.hasEverUpdated = !0;
  }
  getSnapshotBeforeUpdate(n) {
    const { layoutDependency: o, visualElement: i, drag: a, isPresent: f } = this.props, { projection: d } = i;
    return d && (d.isPresent = f, n.layoutDependency !== o && d.setOptions({
      ...d.options,
      layoutDependency: o
    }), pc = !0, a || n.layoutDependency !== o || o === void 0 || n.isPresent !== f ? d.willUpdate() : this.safeToRemove(), n.isPresent !== f && (f ? d.promote() : d.relegate() || Ce.postRender(() => {
      const p = d.getStack();
      (!p || !p.members.length) && this.safeToRemove();
    }))), null;
  }
  componentDidUpdate() {
    const { visualElement: n, layoutAnchor: o } = this.props, { projection: i } = n;
    i && (i.options.layoutAnchor = o, i.root.didUpdate(), Hd.postRender(() => {
      !i.currentAnimation && i.isLead() && this.safeToRemove();
    }));
  }
  componentWillUnmount() {
    const { visualElement: n, layoutGroup: o, switchLayoutGroup: i } = this.props, { projection: a } = n;
    pc = !0, a && (a.scheduleCheckAfterUnmount(), o && o.group && o.group.remove(a), i && i.deregister && i.deregister(a));
  }
  safeToRemove() {
    const { safeToRemove: n } = this.props;
    n && n();
  }
  render() {
    return null;
  }
}
function _0(e) {
  const [n, o] = c0(), i = b.useContext(Cd);
  return x.jsx(mb, { ...e, layoutGroup: i, switchLayoutGroup: b.useContext(g0), isPresent: n, safeToRemove: o });
}
const hb = {
  pan: {
    Feature: pb
  },
  drag: {
    Feature: fb,
    ProjectionNode: u0,
    MeasureLayout: _0
  }
};
function qy(e, n, o) {
  const { props: i } = e;
  e.animationState && i.whileHover && e.animationState.setActive("whileHover", o === "Start");
  const a = "onHover" + o, f = i[a];
  f && Ce.postRender(() => f(n, ji(n)));
}
class yb extends er {
  mount() {
    const { current: n } = this.node;
    n && (this.unmount = LT(n, (o, i) => (qy(this.node, i, "Start"), (a) => qy(this.node, a, "End"))));
  }
  unmount() {
  }
}
class gb extends er {
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
    this.unmount = Ri(bi(this.node.current, "focus", () => this.onFocus()), bi(this.node.current, "blur", () => this.onBlur()));
  }
  unmount() {
  }
}
function eg(e, n, o) {
  const { props: i } = e;
  if (e.current instanceof HTMLButtonElement && e.current.disabled)
    return;
  e.animationState && i.whileTap && e.animationState.setActive("whileTap", o === "Start");
  const a = "onTap" + (o === "End" ? "" : o), f = i[a];
  f && Ce.postRender(() => f(n, ji(n)));
}
class vb extends er {
  mount() {
    const { current: n } = this.node;
    if (!n)
      return;
    const { globalTapTarget: o, propagate: i } = this.node.props;
    this.unmount = HT(n, (a, f) => (eg(this.node, f, "Start"), (d, { success: p }) => eg(this.node, d, p ? "End" : "Cancel")), {
      useGlobalTarget: o,
      stopPropagation: (i == null ? void 0 : i.tap) === !1
    });
  }
  unmount() {
  }
}
const Xc = /* @__PURE__ */ new WeakMap(), mc = /* @__PURE__ */ new WeakMap(), Sb = (e) => {
  const n = Xc.get(e.target);
  n && n(e);
}, wb = (e) => {
  e.forEach(Sb);
};
function xb({ root: e, ...n }) {
  const o = e || document;
  mc.has(o) || mc.set(o, {});
  const i = mc.get(o), a = JSON.stringify(n);
  return i[a] || (i[a] = new IntersectionObserver(wb, { root: e, ...n })), i[a];
}
function _b(e, n, o) {
  const i = xb(n);
  return Xc.set(e, o), i.observe(e), () => {
    Xc.delete(e), i.unobserve(e);
  };
}
const Tb = {
  some: 0,
  all: 1
};
class kb extends er {
  constructor() {
    super(...arguments), this.hasEnteredView = !1, this.isInView = !1;
  }
  startObserver() {
    var m;
    (m = this.stopObserver) == null || m.call(this);
    const { viewport: n = {} } = this.node.getProps(), { root: o, margin: i, amount: a = "some", once: f } = n, d = {
      root: o ? o.current : void 0,
      rootMargin: i,
      threshold: typeof a == "number" ? a : Tb[a]
    }, p = (y) => {
      const { isIntersecting: S } = y;
      if (this.isInView === S || (this.isInView = S, f && !S && this.hasEnteredView))
        return;
      S && (this.hasEnteredView = !0), this.node.animationState && this.node.animationState.setActive("whileInView", S);
      const { onViewportEnter: l, onViewportLeave: c } = this.node.getProps(), v = S ? l : c;
      v && v(y);
    };
    this.stopObserver = _b(this.node.current, d, p);
  }
  mount() {
    this.startObserver();
  }
  update() {
    if (typeof IntersectionObserver > "u")
      return;
    const { props: n, prevProps: o } = this.node;
    ["amount", "margin", "root"].some(Ab(n, o)) && this.startObserver();
  }
  unmount() {
    var n;
    (n = this.stopObserver) == null || n.call(this), this.hasEnteredView = !1, this.isInView = !1;
  }
}
function Ab({ viewport: e = {} }, { viewport: n = {} } = {}) {
  return (o) => e[o] !== n[o];
}
const bb = {
  inView: {
    Feature: kb
  },
  tap: {
    Feature: vb
  },
  focus: {
    Feature: gb
  },
  hover: {
    Feature: yb
  }
}, Cb = {
  layout: {
    ProjectionNode: u0,
    MeasureLayout: _0
  }
}, Pb = {
  ...ZA,
  ...bb,
  ...hb,
  ...Cb
}, Sn = /* @__PURE__ */ GA(Pb, KA);
function Eb(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function T0(e) {
  const n = String(e || "").toLowerCase();
  return n === "127.0.0.1" || n === "localhost" || n === "::1" || n === "[::1]";
}
function tg(e) {
  return T0(e) || Eb(e);
}
function Mb(e) {
  return !e || T0(e) ? "127.0.0.1" : e;
}
const Rb = (() => {
  var S, l, c, v;
  const e = globalThis.window || globalThis, n = globalThis.document || {}, o = e.location || {}, i = String(e.SYNAPSE_DATA_API_PORT || ((l = (S = n.body) == null ? void 0 : S.dataset) == null ? void 0 : l.dataApiPort) || "3001").trim(), { protocol: a = "file:", hostname: f = "127.0.0.1", port: d = "" } = o, p = `http://${Mb(f)}:${i || "3001"}`, m = String(e.SYNAPSE_DATA_API_BASE || ((v = (c = n.body) == null ? void 0 : c.dataset) == null ? void 0 : v.dataApiBase) || "").replace(/\/+$/, ""), y = `${a}//${o.host || (d ? `${f}:${d}` : f)}`.replace(/\/+$/, "");
  return m && !(tg(f) && d !== i && m === y) ? m : a === "file:" || tg(f) && d !== i ? p : `${a}//${o.host || f}`;
})(), Db = new Ig(Rb), hc = Number((globalThis.window || globalThis).SYNAPSE_DATA_API_TIMEOUT_MS || 6e3), Nb = Number.isFinite(hc) && hc > 0 ? hc : 6e3;
function jb(e, n) {
  typeof window > "u" || console.warn(e, n);
}
async function Ib(e) {
  var i, a;
  const o = (((a = (i = e.headers) == null ? void 0 : i.get) == null ? void 0 : a.call(i, "content-type")) || "").includes("application/json") ? await e.json() : {};
  if (!e.ok || (o == null ? void 0 : o.ok) === !1)
    throw new Error((o == null ? void 0 : o.error) || `Synapse data API returned HTTP ${e.status}`);
  return o;
}
async function Fb(e, n = {}) {
  const o = await Db.fetch(e, {
    timeoutMs: Nb,
    ...n
  });
  return Ib(o);
}
async function Ob(e) {
  try {
    return (await Fb("/api/focus-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(e || {})
    })).item || null;
  } catch (n) {
    return jb("Synapse data API focus-session save skipped:", n), null;
  }
}
class Lb {
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
const k0 = new Lb();
function ef(e, n) {
  return k0.readJSON(e, n);
}
function tf(e, n) {
  return k0.writeJSON(e, n);
}
const A0 = "synapse.focusRoom.sessions.v1", b0 = "synapse.focusRoom.draft.v1", C0 = "synapse.focusRoom.active-session.v1", Zc = 40, ng = Object.freeze([
  "idle",
  "running",
  "paused",
  "completed",
  "break",
  "restoring"
]), Vb = Object.freeze({
  studying: "running",
  running: "running",
  idle: "idle",
  paused: "paused",
  completed: "completed",
  break: "break",
  restoring: "restoring"
});
let Jc = [];
const yr = (e) => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURI(e)}`, Kn = [
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
    streamUrl: yr("Raspberrymusic_-_Lofi_Hip_Hop_Upbeat.ogg"),
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
], wi = Object.freeze([
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
function zb(e = "") {
  const n = String(e || "");
  return wi.find((o) => o.id === n) || wi[wi.length - 1];
}
function Bb(e = {}) {
  return wi.find((n) => n.musicType === String((e == null ? void 0 : e.musicType) || "") && n.ambientSound === String((e == null ? void 0 : e.ambientSound) || "")) || null;
}
const Ye = {
  nature: {
    id: "nature-forest",
    title: "Forest ambience",
    artist: "nille",
    streamUrl: yr("20090610_0_ambience.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:20090610_0_ambience.ogg",
    license: "Public domain",
    attribution: "Forest ambience by nille",
    volumeBias: 1
  },
  cafe: {
    id: "cafe-ambiance",
    title: "Cafe ambiance",
    artist: "Marble Toast",
    streamUrl: yr("Cafe_ambiance.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Cafe_ambiance.ogg",
    license: "CC0",
    attribution: "Cafe ambiance by Marble Toast",
    volumeBias: 0.72
  },
  rain: {
    id: "rain",
    title: "Rain",
    artist: "ezwa",
    streamUrl: yr("Rain_(1).ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Rain_(1).ogg",
    license: "Public domain",
    attribution: "Rain by ezwa",
    volumeBias: 0.48
  },
  whiteNoise: {
    id: "white-noise",
    title: "White noise",
    artist: "Bautsch",
    streamUrl: yr("White.Noise.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:White.Noise.ogg",
    license: "Public domain",
    attribution: "White noise by Bautsch",
    volumeBias: 1
  },
  ocean: {
    id: "ocean-waves",
    title: "Waves",
    artist: "Dsw4",
    streamUrl: yr("Waves.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Waves.ogg",
    license: "CC BY 3.0",
    attribution: "Waves by Dsw4",
    volumeBias: 1
  },
  wind: {
    id: "howling-wind",
    title: "Howling wind",
    artist: "Tvabutzku1234",
    streamUrl: yr("Howling_wind.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Howling_wind.ogg",
    license: "CC0",
    attribution: "Howling wind by Tvabutzku1234",
    volumeBias: 0.78
  }
}, Yn = [
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
], Zn = [
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
], $b = Zn, P0 = [25, 45, 50, 90];
function Ub(e = "") {
  const n = String(e || "");
  return Kn.find((o) => o.label === n) || Kn[0];
}
function Hb(e = "") {
  const n = String(e || "");
  return Yn.find((o) => o.label === n) || Yn[0];
}
function Qa(e = {}) {
  const n = Ub(e == null ? void 0 : e.musicType), o = Hb(e == null ? void 0 : e.ambientSound);
  return {
    musicTrack: n,
    ambientSound: o,
    ambientLayers: o.layers.map((i) => ({
      ...i,
      volumeBias: Hn(i.volumeBias, 1)
    }))
  };
}
function Wb(e) {
  return e && typeof e == "object" && !Array.isArray(e) ? e : {};
}
function E0(e) {
  return String(e || "").trim();
}
function Gb({ material: e, goal: n, durationMinutes: o }) {
  var S;
  const i = Math.max(10, Number(o) || 25), a = (S = e == null ? void 0 : e.studyHeadings) != null && S.length ? e.studyHeadings : ["Key ideas", "Examples", "Practice", "Review"], f = String(n || "").trim() || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`, d = Math.max(1, Math.floor(i * 0.2)), p = Math.max(1, Math.floor(i * 0.4)), m = Math.max(1, Math.floor(i * 0.2)), y = Math.max(1, i - d - p - m);
  return [
    { minutes: d, task: `Set the goal: ${f}` },
    { minutes: p, task: `Review ${a[0] || "the core ideas"}` },
    { minutes: m, task: `Practice with ${a[1] || a[0] || "the generated examples"}` },
    { minutes: y, task: "Summarize mistakes and choose the next study step" }
  ];
}
function M0() {
  return ef(b0, null);
}
function Kb(e) {
  return tf(b0, e || null);
}
function R0(e) {
  if (!e || typeof e != "object")
    return { materials: {} };
  const n = Wb(e.materials);
  return {
    ...e,
    materials: { ...n }
  };
}
function go(e, n = "idle") {
  const o = Vb[String(e || "").trim().toLowerCase()];
  return o && ng.includes(o) ? o : ng.includes(n) ? n : "idle";
}
function nf(e) {
  return go(e) === "running" ? "studying" : go(e);
}
function D0(e = {}, n = {}) {
  const o = e && typeof e == "object" ? e : {}, i = n && typeof n == "object" ? n : {}, a = Object.prototype.hasOwnProperty.call(o, "timerStatus"), f = Object.prototype.hasOwnProperty.call(o, "timerState") || Object.prototype.hasOwnProperty.call(o, "timerPhase"), d = go(
    f ? o.timerState || o.timerPhase : a ? o.timerStatus : o.status || i.timerState,
    go(i.timerState || i.timerPhase || i.timerStatus)
  ), p = o.timerMode === "countup" || i.timerMode === "countup" && !Object.prototype.hasOwnProperty.call(o, "timerMode") ? "countup" : "countdown", y = Object.fromEntries(["timerAnchorAtMs", "timerPausedAtMs", "timerUpdatedAtMs", "timerRestoredAtMs"].map((l) => {
    const c = Object.prototype.hasOwnProperty.call(o, l) ? o[l] : i[l], v = Number(c);
    return [l, Number.isFinite(v) && v > 0 ? v : null];
  })), S = Math.max(0, Hn(
    Object.prototype.hasOwnProperty.call(o, "elapsedSeconds") ? o.elapsedSeconds : i.elapsedSeconds,
    0
  ));
  return {
    ...i,
    ...o,
    timerState: d,
    timerPhase: d,
    status: d,
    timerStatus: nf(d),
    timerMode: p,
    elapsedSeconds: S,
    ...y
  };
}
function N0() {
  return R0(ef(C0, null));
}
function Yb(e) {
  return tf(C0, R0(e));
}
function j0(e) {
  const n = E0(e);
  if (!n) return null;
  const i = N0().materials[n];
  return i && typeof i == "object" ? D0(i) : null;
}
function rf(e, n) {
  const o = E0(e);
  if (!o) return !1;
  const i = N0();
  return n && typeof n == "object" ? i.materials[o] = {
    ...D0(n, i.materials[o]),
    materialId: o,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  } : delete i.materials[o], Yb(i);
}
function Sa(e) {
  return rf(e, null);
}
function qc() {
  const e = ef(A0, []), n = Array.isArray(e) ? e : [], o = /* @__PURE__ */ new Set();
  return [...Jc, ...n].filter((i) => {
    const a = String((i == null ? void 0 : i.sessionId) || "");
    return !a || o.has(a) ? !1 : (o.add(a), !0);
  }).slice(0, Zc);
}
function Hn(e, n) {
  const o = Number(e);
  return Number.isFinite(o) ? o : n;
}
function Qb(e = {}) {
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
  }, persisted: !0 }, a = qc().filter((m) => m.sessionId !== i.sessionId), f = [i, ...a.map((m) => ({ ...m, persisted: !0 }))].slice(0, Zc), d = tf(A0, f), p = { ...i, persisted: d };
  return Ob(p).catch((m) => {
    console.warn("Synapse data API focus-session background save failed:", m);
  }), d ? Jc = [] : Jc = [p, ...a].slice(0, Zc), p;
}
function I0(e) {
  const n = Math.max(0, Hn(e || 0, 0)), o = Math.floor(n / 3600), i = Math.floor(n % 3600 / 60);
  return o ? `${o}h ${i}m` : `${i}m`;
}
const Ae = (e, n, o, i) => Object.freeze({ kind: e, duration: n, intensity: o, density: i }), rg = Object.freeze({
  "morning-window": Object.freeze({
    id: "morning-window",
    layers: Object.freeze([Ae("camera", 32, 0.34, 0.42), Ae("foliage", 18, 0.24, 0.38), Ae("light", 26, 0.2, 0.3)])
  }),
  "cabin-twilight": Object.freeze({
    id: "cabin-twilight",
    layers: Object.freeze([Ae("camera", 38, 0.28, 0.32), Ae("mist", 34, 0.2, 0.35), Ae("light", 22, 0.2, 0.28)])
  }),
  "last-light-lounge": Object.freeze({
    id: "last-light-lounge",
    layers: Object.freeze([Ae("camera", 36, 0.24, 0.3), Ae("rain", 16, 0.28, 0.42), Ae("mist", 32, 0.18, 0.28), Ae("light", 24, 0.18, 0.24)])
  }),
  "garden-cafe": Object.freeze({
    id: "garden-cafe",
    layers: Object.freeze([Ae("camera", 34, 0.26, 0.32), Ae("rain", 14, 0.34, 0.52), Ae("foliage", 20, 0.2, 0.38), Ae("light", 28, 0.18, 0.26)])
  }),
  "sunset-classroom": Object.freeze({
    id: "sunset-classroom",
    layers: Object.freeze([Ae("camera", 40, 0.2, 0.25), Ae("light", 20, 0.3, 0.36), Ae("foliage", 28, 0.14, 0.22)])
  }),
  "tokyo-night": Object.freeze({
    id: "tokyo-night",
    layers: Object.freeze([Ae("camera", 42, 0.2, 0.26), Ae("mist", 36, 0.16, 0.24), Ae("light", 18, 0.24, 0.44)])
  }),
  "snow-window-cabin": Object.freeze({
    id: "snow-window-cabin",
    layers: Object.freeze([Ae("camera", 38, 0.24, 0.28), Ae("snow", 18, 0.34, 0.48), Ae("light", 26, 0.2, 0.28)])
  }),
  "bamboo-cabin": Object.freeze({
    id: "bamboo-cabin",
    layers: Object.freeze([Ae("camera", 36, 0.24, 0.3), Ae("foliage", 16, 0.24, 0.46), Ae("water", 24, 0.2, 0.36), Ae("mist", 32, 0.16, 0.26)])
  })
});
function Xb(e = "") {
  return rg[String(e || "")] || rg["morning-window"];
}
var Dg;
const ed = ((Dg = Zn[0]) == null ? void 0 : Dg.id) || "morning-window", po = P0[0] || 25, Zb = 10, Xa = 180, of = 60, F0 = Xa * 60, Jb = 0, qb = 100, eC = ["materials", "notes", "sources", "chat", "quiz", "flashcards", "mindmap", "plan", "workspace", "history"], td = new Set(eC), Ia = {
  type: "spring",
  stiffness: 120,
  damping: 18,
  mass: 0.8
};
function tC(e, n, o, i) {
  const a = Number(e);
  return Number.isFinite(a) ? Math.min(i, Math.max(o, a)) : n;
}
function Ar(e, n, o, i) {
  return Math.round(tC(e, n, o, i));
}
function Tt(e, n = 50) {
  return Ar(e, n, Jb, qb);
}
function _r(e, n = po) {
  return Ar(e, n, Zb, Xa);
}
function rn(e, n = po * 60) {
  return Ar(e, n, of, F0);
}
function Fa(e) {
  return Zn.find((n) => n.id === e) || null;
}
function vn(e = ed) {
  return Fa(e) || Zn[0] || {
    id: ed,
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
    minutes: Ar(n == null ? void 0 : n.minutes, 5, 1, Xa),
    task: String((n == null ? void 0 : n.task) || "").trim()
  })).filter((n) => n.task) : [];
}
function hi(e) {
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
function nd(e, n, o) {
  return e ? Gb({
    material: e,
    goal: n,
    durationMinutes: o
  }) : [];
}
function Ci(e) {
  const n = _r(e);
  return n > 0 ? n * 60 : 0;
}
function rd(e) {
  const n = Math.max(0, Math.floor(Number(e) || 0)), o = Math.floor(n / 3600), i = Math.floor(n % 3600 / 60), a = n % 60, f = (d) => String(d).padStart(2, "0");
  return o ? `${o}:${f(i)}:${f(a)}` : `${f(i)}:${f(a)}`;
}
function og(e) {
  const n = (e == null ? void 0 : e.flashcards) || [];
  return Array.isArray(n) ? n.slice(0, 24) : [];
}
function nC(e, n) {
  return String((e == null ? void 0 : e.id) || (e == null ? void 0 : e.front) || (e == null ? void 0 : e.term) || n);
}
function rC(e) {
  var n;
  return Array.isArray(e == null ? void 0 : e.questions) ? e.questions : Array.isArray((n = e == null ? void 0 : e.quiz) == null ? void 0 : n.questions) ? e.quiz.questions : [];
}
function od(e) {
  return (Array.isArray(e == null ? void 0 : e.quizzes) ? e.quizzes : []).flatMap((o) => rC(o).map((i) => {
    var a;
    return {
      ...i,
      quizTitle: (o == null ? void 0 : o.title) || ((a = o == null ? void 0 : o.quiz) == null ? void 0 : a.title) || "Saved quiz"
    };
  })).slice(0, 12);
}
function oC(e, n) {
  return (e == null ? void 0 : e.question) || (e == null ? void 0 : e.prompt) || (e == null ? void 0 : e.stem) || `Question ${n + 1}`;
}
function sf(e) {
  return String((e == null ? void 0 : e.type) || "").toLowerCase();
}
function iC(e) {
  return String((e == null ? void 0 : e.label) || (e == null ? void 0 : e.text) || e).trim();
}
function Oa(e) {
  const n = (e == null ? void 0 : e.choices) || (e == null ? void 0 : e.options) || (e == null ? void 0 : e.answers);
  return Array.isArray(n) && n.length ? n.map(iC).filter(Boolean) : sf(e) === "true_false" ? ["True", "False"] : [];
}
function id(e) {
  const n = (e == null ? void 0 : e.correctOptionIndexes) || (e == null ? void 0 : e.correct_option_indexes) || (e == null ? void 0 : e.correctIndexes);
  return Array.isArray(n) ? n.map((o) => Number(o)).filter(Number.isInteger) : [];
}
function sC(e, n) {
  const o = Array.isArray(e) ? [...e].map(Number).filter(Number.isInteger).sort((a, f) => a - f) : [], i = Array.isArray(n) ? [...n].map(Number).filter(Number.isInteger).sort((a, f) => a - f) : [];
  return o.length === i.length && o.every((a, f) => a === i[f]);
}
function br(e) {
  return String(e || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function La(e, n) {
  if (Number.isInteger(n)) return n;
  const o = Number(n);
  if (typeof n != "string" && Number.isInteger(o)) return o;
  const i = Oa(e), a = br(n);
  return i.findIndex((f) => br(f) === a);
}
function V0(e, n) {
  if (typeof n == "boolean") return n;
  if (n === 0) return !0;
  if (n === 1) return !1;
  const o = Oa(e), i = br(n);
  return i === "true" ? !0 : i === "false" ? !1 : br(o[0]) === i ? !0 : br(o[1]) === i ? !1 : null;
}
function aC(e, n, o) {
  const i = sf(e);
  if (i === "multiple_choice") {
    const a = La(e, n);
    if (!Number.isInteger(a) || a < 0) return [];
    const f = Array.isArray(o) ? [...o] : [];
    return f.includes(a) ? f.filter((d) => d !== a) : [...f, a].sort((d, p) => d - p);
  }
  if (i === "single_choice") {
    const a = La(e, n);
    return Number.isInteger(a) && a >= 0 ? a : "";
  }
  if (i === "true_false") {
    const a = V0(e, n);
    return a === null ? "" : a;
  }
  return String(n || "");
}
function z0(e) {
  const n = (e == null ? void 0 : e.correctAnswer) ?? (e == null ? void 0 : e.correct_answer) ?? (e == null ? void 0 : e.answer) ?? (e == null ? void 0 : e.correct), o = id(e);
  if (o.length) {
    const i = Oa(e);
    return o.map((a) => i[a] || "").filter(Boolean).join(", ");
  }
  if (typeof (e == null ? void 0 : e.correctBoolean) == "boolean" || typeof (e == null ? void 0 : e.correct_boolean) == "boolean") {
    const i = Oa(e);
    return (typeof e.correctBoolean == "boolean" ? e.correctBoolean : e.correct_boolean) ? i[0] || "True" : i[1] || "False";
  }
  return e != null && e.expectedAnswer || e != null && e.expected_answer ? String(e.expectedAnswer || e.expected_answer || "").trim() : Array.isArray(n) ? n.map((i) => String(i)).join(", ") : String(n || "").trim();
}
function lC(e, n) {
  const o = sf(e);
  if (o === "single_choice") {
    const a = id(e)[0], f = La(e, n);
    return Number.isInteger(a) ? f === a : null;
  }
  if (o === "multiple_choice") {
    const a = id(e), f = Array.isArray(n) ? n : [La(e, n)].filter(Number.isInteger);
    return a.length ? sC(f, a) : null;
  }
  if (o === "true_false") {
    const a = typeof (e == null ? void 0 : e.correctBoolean) == "boolean" ? e.correctBoolean : e == null ? void 0 : e.correct_boolean, f = V0(e, n);
    return typeof a == "boolean" && f !== null ? f === a : null;
  }
  const i = z0(e);
  return i ? br(n) === br(i) : null;
}
function B0(e, n, o) {
  var p;
  const i = String(e || "").trim(), a = String((n == null ? void 0 : n.summaryText) || (n == null ? void 0 : n.aiSummary) || "").slice(0, 420), f = ((p = n == null ? void 0 : n.studyHeadings) == null ? void 0 : p[0]) || (n == null ? void 0 : n.materialTitle) || "this material", d = o || `Study ${(n == null ? void 0 : n.materialTitle) || "this material"}`;
  return i ? [
    `For ${f}: ${a || "use the selected material as your main source."}`,
    `Your current goal is: ${d}.`,
    "Try explaining the idea in one sentence, then test yourself with one example before moving on."
  ].join(" ") : "";
}
function uC() {
  return /* @__PURE__ */ x.jsx("svg", { className: "liquid-glass-filter-defs", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ x.jsx("defs", { children: /* @__PURE__ */ x.jsxs("filter", { id: "liquid-glass-displacement", x: "-12%", y: "-12%", width: "124%", height: "124%", colorInterpolationFilters: "sRGB", children: [
    /* @__PURE__ */ x.jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.012 0.024", numOctaves: "2", seed: "17", result: "liquid-noise" }),
    /* @__PURE__ */ x.jsx("feDisplacementMap", { in: "SourceGraphic", in2: "liquid-noise", scale: "7", xChannelSelector: "R", yChannelSelector: "B", result: "refracted-surface" }),
    /* @__PURE__ */ x.jsx("feColorMatrix", { in: "refracted-surface", type: "matrix", values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.04 0", result: "edge-alpha" }),
    /* @__PURE__ */ x.jsx("feGaussianBlur", { in: "edge-alpha", stdDeviation: "0.25", result: "soft-edge" }),
    /* @__PURE__ */ x.jsx("feBlend", { in: "soft-edge", in2: "refracted-surface", mode: "screen" })
  ] }) }) });
}
function cC({ profile: e, paused: n = !1, reducedMotion: o = !1 }) {
  var a;
  if (o || !((a = e == null ? void 0 : e.layers) != null && a.length)) return null;
  const i = e.layers.filter((f) => f.kind !== "camera");
  return /* @__PURE__ */ x.jsx("div", { className: `scene-motion-layer ${n ? "is-paused" : ""}`.trim(), "aria-hidden": "true", children: i.map((f, d) => /* @__PURE__ */ x.jsx(
    "span",
    {
      className: `scene-motion scene-motion-${f.kind}`,
      style: {
        "--motion-duration": `${f.duration}s`,
        "--motion-intensity": f.intensity,
        "--motion-density": f.density,
        "--motion-delay": `${-d * 3.7}s`
      }
    },
    `${e.id}-${f.kind}-${d}`
  )) });
}
function dC({ scene: e }) {
  const [n, o] = b.useState(e), [i, a] = b.useState(!1), [f, d] = b.useState(!1), [p, m] = b.useState(() => {
    var v;
    return ((v = globalThis.document) == null ? void 0 : v.visibilityState) === "hidden";
  }), [y, S] = b.useState(() => {
    var v, w;
    return ((w = (v = globalThis.matchMedia) == null ? void 0 : v.call(globalThis, "(prefers-reduced-motion: reduce)")) == null ? void 0 : w.matches) || !1;
  });
  b.useEffect(() => {
    a(!1), d(!1);
  }, [n == null ? void 0 : n.id]), b.useEffect(() => {
    if (!(e != null && e.id) || e.id === (n == null ? void 0 : n.id)) return;
    let v = !1;
    const w = new Image();
    return w.onload = () => {
      v || o(e);
    }, w.onerror = () => {
      v || d(!0);
    }, w.src = e.image, () => {
      v = !0, w.onload = null, w.onerror = null;
    };
  }, [n == null ? void 0 : n.id, e]), b.useEffect(() => {
    var w, T;
    const v = () => {
      var A;
      return m(((A = globalThis.document) == null ? void 0 : A.visibilityState) === "hidden");
    };
    return (T = (w = globalThis.document) == null ? void 0 : w.addEventListener) == null || T.call(w, "visibilitychange", v), () => {
      var A, _;
      return (_ = (A = globalThis.document) == null ? void 0 : A.removeEventListener) == null ? void 0 : _.call(A, "visibilitychange", v);
    };
  }, []), b.useEffect(() => {
    var T, A;
    const v = (T = globalThis.matchMedia) == null ? void 0 : T.call(globalThis, "(prefers-reduced-motion: reduce)");
    if (!v) return;
    const w = (_) => S(!!_.matches);
    return S(!!v.matches), (A = v.addEventListener) == null || A.call(v, "change", w), () => {
      var _;
      return (_ = v.removeEventListener) == null ? void 0 : _.call(v, "change", w);
    };
  }, []);
  const l = Xb((n == null ? void 0 : n.motionProfile) || (n == null ? void 0 : n.id)), c = l.layers.find((v) => v.kind === "camera");
  return /* @__PURE__ */ x.jsxs("div", { className: "focus-background-wrap", "aria-hidden": "true", children: [
    /* @__PURE__ */ x.jsx(uC, {}),
    /* @__PURE__ */ x.jsx(Ka, { mode: "sync", children: /* @__PURE__ */ x.jsxs(
      Sn.div,
      {
        className: `focus-background ${i && !y ? "has-scene-motion" : ""} ${p ? "is-motion-paused" : ""}`.trim(),
        style: { backgroundImage: f ? "none" : void 0 },
        initial: { opacity: 0, scale: 1.035 },
        animate: { opacity: 1, scale: 1.02 },
        exit: { opacity: 0, scale: 1.015 },
        transition: { duration: 0.8, ease: "easeOut" },
        children: [
          n != null && n.image ? /* @__PURE__ */ x.jsx(
            "img",
            {
              className: `focus-background-media focus-background-poster ${i ? "is-ready" : ""}`.trim(),
              src: n.image,
              alt: "",
              style: { "--scene-camera-duration": `${(c == null ? void 0 : c.duration) || 36}s`, "--scene-camera-intensity": (c == null ? void 0 : c.intensity) || 0.2 },
              onLoad: () => a(!0),
              onError: () => d(!0)
            }
          ) : null,
          n != null && n.video ? /* @__PURE__ */ x.jsx(
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
              onError: () => d(!0)
            }
          ) : null,
          /* @__PURE__ */ x.jsx(cC, { profile: l, paused: p, reducedMotion: y })
        ]
      },
      (n == null ? void 0 : n.id) || "focus-background"
    ) }),
    /* @__PURE__ */ x.jsx("div", { className: "focus-overlay" }),
    /* @__PURE__ */ x.jsx("div", { className: "focus-vignette" })
  ] });
}
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const fC = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), pC = (e) => e.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (n, o, i) => i ? i.toUpperCase() : o.toLowerCase()
), ig = (e) => {
  const n = pC(e);
  return n.charAt(0).toUpperCase() + n.slice(1);
}, $0 = (...e) => e.filter((n, o, i) => !!n && n.trim() !== "" && i.indexOf(n) === o).join(" ").trim(), mC = (e) => {
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
var hC = {
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
const yC = b.forwardRef(
  ({
    color: e = "currentColor",
    size: n = 24,
    strokeWidth: o = 2,
    absoluteStrokeWidth: i,
    className: a = "",
    children: f,
    iconNode: d,
    ...p
  }, m) => b.createElement(
    "svg",
    {
      ref: m,
      ...hC,
      width: n,
      height: n,
      stroke: e,
      strokeWidth: i ? Number(o) * 24 / Number(n) : o,
      className: $0("lucide", a),
      ...!f && !mC(p) && { "aria-hidden": "true" },
      ...p
    },
    [
      ...d.map(([y, S]) => b.createElement(y, S)),
      ...Array.isArray(f) ? f : [f]
    ]
  )
);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ke = (e, n) => {
  const o = b.forwardRef(
    ({ className: i, ...a }, f) => b.createElement(yC, {
      ref: f,
      iconNode: n,
      className: $0(
        `lucide-${fC(ig(e))}`,
        `lucide-${e}`,
        i
      ),
      ...a
    })
  );
  return o.displayName = ig(e), o;
};
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const gC = [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
], vC = ke("arrow-left", gC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const SC = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
], wC = ke("arrow-right", SC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const xC = [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]], Za = ke("check", xC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const _C = [["path", { d: "m15 18-6-6 6-6", key: "1wnfg3" }]], TC = ke("chevron-left", _C);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const kC = [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]], AC = ke("chevron-right", kC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const bC = [
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
], CC = ke("coffee", bC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const PC = [
  ["rect", { width: "12", height: "12", x: "2", y: "10", rx: "2", ry: "2", key: "6agr2n" }],
  [
    "path",
    { d: "m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6", key: "1o487t" }
  ],
  ["path", { d: "M6 18h.01", key: "uhywen" }],
  ["path", { d: "M10 14h.01", key: "ssrbsk" }],
  ["path", { d: "M15 6h.01", key: "cblpky" }],
  ["path", { d: "M18 9h.01", key: "2061c0" }]
], EC = ke("dices", PC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const MC = [
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
], RC = ke("door-open", MC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const DC = [
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
], Va = ke("footprints", DC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const NC = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }],
  ["path", { d: "M12 7v5l4 2", key: "1fdv2h" }]
], jC = ke("history", NC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const IC = [
  ["path", { d: "m14 10 7-7", key: "oa77jy" }],
  ["path", { d: "M20 10h-6V4", key: "mjg0md" }],
  ["path", { d: "m3 21 7-7", key: "tjx5ai" }],
  ["path", { d: "M4 14h6v6", key: "rmj7iw" }]
], FC = ke("minimize-2", IC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const OC = [
  ["circle", { cx: "8", cy: "18", r: "4", key: "1fc0mg" }],
  ["path", { d: "M12 18V2l7 4", key: "g04rme" }]
], LC = ke("music-2", OC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const VC = [
  ["rect", { x: "14", y: "4", width: "4", height: "16", rx: "1", key: "zuxfzm" }],
  ["rect", { x: "6", y: "4", width: "4", height: "16", rx: "1", key: "1okwgv" }]
], sd = ke("pause", VC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const zC = [
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
], BC = ke("piano", zC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const $C = [["polygon", { points: "6 3 20 12 6 21 6 3", key: "1oa8hb" }]], U0 = ke("play", $C);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const UC = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
], HC = ke("plus", UC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const WC = [
  ["path", { d: "M4.9 19.1C1 15.2 1 8.8 4.9 4.9", key: "1vaf9d" }],
  ["path", { d: "M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5", key: "u1ii0m" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }],
  ["path", { d: "M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5", key: "1j5fej" }],
  ["path", { d: "M19.1 4.9C23 8.8 23 15.1 19.1 19", key: "10b0cb" }]
], GC = ke("radio", WC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const KC = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
], H0 = ke("rotate-ccw", KC);
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
      d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
      key: "1c8476"
    }
  ],
  ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7", key: "1ydtos" }],
  ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7", key: "t51u73" }]
], W0 = ke("save", YC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const QC = [
  ["path", { d: "M14 17H5", key: "gfn3mx" }],
  ["path", { d: "M19 7h-9", key: "6i9tg" }],
  ["circle", { cx: "17", cy: "17", r: "3", key: "18b49y" }],
  ["circle", { cx: "7", cy: "7", r: "3", key: "dfmy0x" }]
], G0 = ke("settings-2", QC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const XC = [
  ["path", { d: "m18 14 4 4-4 4", key: "10pe0f" }],
  ["path", { d: "m18 2 4 4-4 4", key: "pucp1d" }],
  ["path", { d: "M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22", key: "1ailkh" }],
  ["path", { d: "M2 6h1.972a4 4 0 0 1 3.6 2.2", key: "km57vx" }],
  ["path", { d: "M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45", key: "os18l9" }]
], ZC = ke("shuffle", XC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const JC = [
  ["polygon", { points: "5 4 15 12 5 20 5 4", key: "16p6eg" }],
  ["line", { x1: "19", x2: "19", y1: "5", y2: "19", key: "futhcm" }]
], K0 = ke("skip-forward", JC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const qC = [
  ["line", { x1: "21", x2: "14", y1: "4", y2: "4", key: "obuewd" }],
  ["line", { x1: "10", x2: "3", y1: "4", y2: "4", key: "1q6298" }],
  ["line", { x1: "21", x2: "12", y1: "12", y2: "12", key: "1iu8h1" }],
  ["line", { x1: "8", x2: "3", y1: "12", y2: "12", key: "ntss68" }],
  ["line", { x1: "21", x2: "16", y1: "20", y2: "20", key: "14d8ph" }],
  ["line", { x1: "12", x2: "3", y1: "20", y2: "20", key: "m0wm8r" }],
  ["line", { x1: "14", x2: "14", y1: "2", y2: "6", key: "14e1ph" }],
  ["line", { x1: "8", x2: "8", y1: "10", y2: "14", key: "1i6ji0" }],
  ["line", { x1: "16", x2: "16", y1: "18", y2: "22", key: "1lctlv" }]
], eP = ke("sliders-horizontal", qC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const tP = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["circle", { cx: "12", cy: "12", r: "6", key: "1vlfrh" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }]
], nP = ke("target", tP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const rP = [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
], oP = ke("trash-2", rP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const iP = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744", key: "16gr8j" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }]
], za = ke("users", iP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const sP = [
  [
    "path",
    {
      d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
      key: "uqj9uw"
    }
  ],
  ["path", { d: "M16 9a5 5 0 0 1 0 6", key: "1q6k2b" }],
  ["path", { d: "M19.364 18.364a9 9 0 0 0 0-12.728", key: "ijwkga" }]
], Ja = ke("volume-2", sP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const aP = [
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
], af = ke("waves", aP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const lP = [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
], Y0 = ke("x", lP), sg = (e) => {
  let n;
  const o = /* @__PURE__ */ new Set(), i = (y, S) => {
    const l = typeof y == "function" ? y(n) : y;
    if (!Object.is(l, n)) {
      const c = n;
      n = S ?? (typeof l != "object" || l === null) ? l : Object.assign({}, n, l), o.forEach((v) => v(n, c));
    }
  }, a = () => n, p = { setState: i, getState: a, getInitialState: () => m, subscribe: (y) => (o.add(y), () => o.delete(y)) }, m = n = e(i, a, p);
  return p;
}, uP = ((e) => e ? sg(e) : sg), cP = (e) => e;
function dP(e, n = cP) {
  const o = gn.useSyncExternalStore(
    e.subscribe,
    gn.useCallback(() => n(e.getState()), [e, n]),
    gn.useCallback(() => n(e.getInitialState()), [e, n])
  );
  return gn.useDebugValue(o), o;
}
const ag = (e) => {
  const n = uP(e), o = (i) => dP(n, i);
  return Object.assign(o, n), o;
}, fP = ((e) => e ? ag(e) : ag), pP = /* @__PURE__ */ new Set(["pending", "active", "done"]);
function Q0() {
  return `topic-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function Ba(e = {}, n = "pending") {
  const o = String(e.title || e.name || "").trim(), i = String(e.description || e.detail || e.notes || "").trim(), a = pP.has(e.status) ? e.status : n;
  return {
    id: String(e.id || "").trim() || Q0(),
    title: o || "Untitled topic",
    description: i,
    status: a
  };
}
function gr(e, n = "Deep work block") {
  const o = Array.isArray(e) ? e.map((d) => Ba(d)).filter(Boolean) : [];
  if (!o.length) {
    const d = Ba({
      title: String(n || "Deep work block").trim() || "Deep work block",
      description: "",
      status: "active"
    }, "active");
    return { focusTopics: [d], activeTopicId: d.id, studyGoal: d.title };
  }
  let i = "";
  const a = o.map((d, p) => d.status === "active" && !i ? (i = d.id, d) : d.status === "active" && i ? { ...d, status: "pending" } : d);
  if (!i) {
    const d = a.find((p) => p.status !== "done") || a[0];
    return i = d.id, {
      focusTopics: a.map((p) => p.id === i ? { ...p, status: "active" } : p.status === "active" ? { ...p, status: "pending" } : p),
      activeTopicId: i,
      studyGoal: d.title
    };
  }
  const f = a.find((d) => d.id === i) || a[0];
  return {
    focusTopics: a,
    activeTopicId: i,
    studyGoal: (f == null ? void 0 : f.title) || String(n || "Deep work block")
  };
}
function lf(e = [], n = "") {
  const o = Array.isArray(e) ? e : [];
  return o.find((i) => i.id === n) || o.find((i) => i.status === "active") || o.find((i) => i.status !== "done") || o[0] || null;
}
function yc(e = [], n = "") {
  var f;
  const o = Array.isArray(e) ? e.map((d) => ({ ...d })) : [];
  if (!o.length)
    return gr([], "Deep work block");
  const i = n ? o.find((d) => d.id === n && d.status !== "done") : o.find((d) => d.status === "pending") || o.find((d) => d.status !== "done");
  return i ? {
    focusTopics: o.map((d) => d.id === i.id ? { ...d, status: "active" } : d.status === "active" ? { ...d, status: "pending" } : d),
    activeTopicId: i.id,
    studyGoal: i.title
  } : {
    focusTopics: o,
    activeTopicId: "",
    studyGoal: ((f = o[o.length - 1]) == null ? void 0 : f.title) || "Deep work block"
  };
}
function mP(e, n, o) {
  return B0(e, n, o);
}
async function hP({
  question: e,
  chatHistory: n = [],
  material: o = null,
  assistantContext: i = {},
  studyGoal: a = "",
  apiClient: f = globalThis.apiClient,
  preferredLanguage: d = ((p) => (p = globalThis.preferredLanguage) == null ? void 0 : p.value)() || "auto"
} = {}) {
  var S;
  if (!f || typeof f.fetch != "function")
    return {
      answer: mP(e, o, a),
      offline: !0
    };
  const m = await f.fetch("/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: e,
      selected_section: i.sectionTitle || ((S = o == null ? void 0 : o.studyHeadings) == null ? void 0 : S[0]) || "",
      selected_excerpt: i.excerpt || "",
      source_strict: !!(o != null && o.isSourceRestricted),
      preferred_language: d,
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
const xi = Object.freeze({
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
function yP() {
  return Zn[0] || vn(ed);
}
function ad(e) {
  const n = String(e || "");
  if (!n) return null;
  const i = L0(M0()).materials[n];
  return i && typeof i == "object" ? i : null;
}
function ot(e) {
  var i;
  const n = String(e.selectedMaterialId || ((i = e.selectedMaterial) == null ? void 0 : i.materialId) || "");
  if (!n) return;
  const o = L0(M0());
  o.materials[n] = {
    materialId: n,
    selectedScene: e.selectedScene,
    musicType: e.musicType,
    ambientSound: e.ambientSound,
    musicVolume: Tt(e.musicVolume),
    ambientVolume: Tt(e.ambientVolume),
    audioChannels: { ...xi, ...e.audioChannels || {} },
    durationMinutes: _r(e.pomodoroDuration),
    durationSeconds: rn(e.pomodoroDurationSeconds, Ci(e.pomodoroDuration)),
    studyGoal: e.studyGoal,
    focusTopics: Array.isArray(e.focusTopics) ? e.focusTopics : [],
    activeTopicId: String(e.activeTopicId || ""),
    studyPlan: O0(e.studyPlan),
    completedTasks: Array.isArray(e.completedTasks) ? e.completedTasks.filter(Boolean) : [],
    workspaceNotes: String(e.workspaceNotes || ""),
    workspaceUpdatedAt: e.workspaceUpdatedAt || "",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }, Kb(o);
}
function gP(e) {
  return Array.isArray(e == null ? void 0 : e.completedTasks) ? e.completedTasks.map((n) => String(n || "").trim()).filter(Boolean) : [];
}
function ld(e = {}) {
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
function at() {
  const e = Date.now();
  return Number.isFinite(e) ? e : 0;
}
function Ht(e = {}) {
  return go(e.timerState || e.timerPhase || e.status || e.timerStatus);
}
function Sr(e = {}) {
  const n = Number(e.pomodoroDurationSeconds);
  return Number.isFinite(n) && n > 0 ? rn(n, Ci(e.pomodoroDuration)) : Ci(e.pomodoroDuration);
}
function Wn(e = {}) {
  if (e.timerMode === "countup") return 0;
  const n = Number(e.timerDurationSeconds);
  return Number.isFinite(n) && n > 0 ? n : Sr(e);
}
function $a(e = {}, n = at()) {
  const o = Math.max(0, Number(e.elapsedSeconds) || 0);
  if (Ht(e) !== "running") return o;
  const i = Number(e.timerAnchorAtMs);
  return !Number.isFinite(i) || i <= 0 ? o : Math.max(o, Math.floor(Math.max(0, n - i) / 1e3));
}
function Mt(e, n = at()) {
  const o = go(e);
  return {
    timerState: o,
    timerPhase: o,
    status: o,
    timerStatus: nf(o),
    timerUpdatedAtMs: n
  };
}
function vP(e = {}) {
  const n = Ht(e);
  return {
    timerState: n,
    timerPhase: n,
    status: n,
    timerStatus: nf(n),
    timerMode: e.timerMode === "countup" ? "countup" : "countdown",
    timerAnchorAtMs: Number.isFinite(Number(e.timerAnchorAtMs)) ? Number(e.timerAnchorAtMs) : null,
    timerPausedAtMs: Number.isFinite(Number(e.timerPausedAtMs)) ? Number(e.timerPausedAtMs) : null,
    timerUpdatedAtMs: Number.isFinite(Number(e.timerUpdatedAtMs)) ? Number(e.timerUpdatedAtMs) : null,
    timerRestoredAtMs: Number.isFinite(Number(e.timerRestoredAtMs)) ? Number(e.timerRestoredAtMs) : null,
    timerDurationSeconds: Wn(e),
    pomodoroDuration: e.pomodoroDuration,
    pomodoroDurationSeconds: Sr(e),
    elapsedSeconds: Math.max(0, Number(e.elapsedSeconds) || 0),
    startedAt: e.startedAt || null,
    currentSession: e.currentSession || null,
    view: e.view
  };
}
function Bn(e) {
  var o;
  const n = String(e.selectedMaterialId || ((o = e.selectedMaterial) == null ? void 0 : o.materialId) || "");
  return !n || e.view !== "session" ? !1 : rf(n, vP(e));
}
function lg(e, n = at()) {
  const o = $a(e, n), i = Wn(e), a = e.timerMode !== "countup" && i > 0 && o >= i, f = a ? "completed" : Ht(e);
  return {
    ...Mt(f, n),
    elapsedSeconds: a ? i : o,
    timerAnchorAtMs: f === "running" ? e.timerAnchorAtMs : null,
    timerPausedAtMs: f === "running" ? null : e.timerPausedAtMs || n,
    audioPlaying: f === "running" ? e.audioPlaying : !1
  };
}
function SP(e, n = {}) {
  const o = vn(n.selectedScene), i = ad(e == null ? void 0 : e.materialId), a = Fa(i == null ? void 0 : i.selectedScene) ? i.selectedScene : o.id, f = vn(a), d = String((i == null ? void 0 : i.musicType) || f.musicType || "Deep Focus"), p = String((i == null ? void 0 : i.ambientSound) || f.ambientSound || "Nature"), m = Tt(i == null ? void 0 : i.musicVolume, n.musicVolume ?? 60), y = Tt(i == null ? void 0 : i.ambientVolume, n.ambientVolume ?? 50), S = _r(i == null ? void 0 : i.durationMinutes, n.pomodoroDuration ?? po), l = rn(
    i == null ? void 0 : i.durationSeconds,
    n.pomodoroDurationSeconds ?? S * 60
  ), c = String((i == null ? void 0 : i.studyGoal) || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`), v = O0(i == null ? void 0 : i.studyPlan), w = v.length ? v : nd(e, c, S), T = gP(i), A = String((i == null ? void 0 : i.workspaceNotes) || ""), _ = (i == null ? void 0 : i.workspaceUpdatedAt) || (i == null ? void 0 : i.updatedAt) || "";
  return {
    selectedScene: a,
    musicType: d,
    ambientSound: p,
    musicVolume: m,
    ambientVolume: y,
    audioChannels: { ...xi, ...(i == null ? void 0 : i.audioChannels) || n.audioChannels || {} },
    pomodoroDuration: S,
    pomodoroDurationSeconds: l,
    studyGoal: c,
    studyPlan: w,
    completedTasks: T,
    workspaceNotes: A,
    workspaceUpdatedAt: _
  };
}
function ug(e) {
  const n = j0(e);
  if (!n || typeof n != "object") return null;
  const o = Ht(n), i = at(), a = Number(n.timerAnchorAtMs), f = Date.parse(n.startedAt || ""), d = Number.isFinite(f) ? f : NaN, p = o === "running" ? $a({
    ...n,
    timerState: "running",
    timerAnchorAtMs: Number.isFinite(a) && a > 0 ? a : d
  }, i) : Math.max(0, Number(n.elapsedSeconds) || 0), m = Wn(n), y = o === "running" ? m > 0 && p >= m ? "completed" : "paused" : o, S = o === "running";
  return {
    route: n.view === "session" ? "session" : "setup",
    view: n.view === "session" ? "session" : "setup",
    ...Mt(S ? "restoring" : y, i),
    timerRestoreTarget: S ? y : null,
    timerMode: n.timerMode === "countup" ? "countup" : "countdown",
    timerAnchorAtMs: null,
    timerPausedAtMs: S ? null : Number(n.timerPausedAtMs) || null,
    timerRestoredAtMs: S ? null : i,
    timerDurationSeconds: m,
    ...Number(n.pomodoroDurationSeconds) > 0 ? { pomodoroDurationSeconds: rn(n.pomodoroDurationSeconds) } : {},
    elapsedSeconds: m > 0 ? Math.min(m, p) : p,
    startedAt: n.startedAt || null,
    currentSession: n.currentSession || null,
    completedTasks: Array.isArray(n.completedTasks) ? n.completedTasks.filter(Boolean) : [],
    flashcardIndex: Math.max(0, Number(n.flashcardIndex) || 0),
    flashcardSide: n.flashcardSide === "back" ? "back" : "front",
    flashcardProgress: n.flashcardProgress && typeof n.flashcardProgress == "object" && !Array.isArray(n.flashcardProgress) ? n.flashcardProgress : {},
    quizAnswers: n.quizAnswers && typeof n.quizAnswers == "object" && !Array.isArray(n.quizAnswers) ? n.quizAnswers : {},
    quizChecked: n.quizChecked && typeof n.quizChecked == "object" && !Array.isArray(n.quizChecked) ? n.quizChecked : {},
    chatMessages: hi(n.chatMessages),
    chatPending: !1,
    chatError: "",
    panelTab: td.has(n.panelTab) ? n.panelTab : "materials",
    workspaceNotes: String(n.workspaceNotes || ""),
    workspaceUpdatedAt: n.workspaceUpdatedAt || n.updatedAt || "",
    activeNoteSection: String(n.activeNoteSection || ""),
    activeSourceHighlight: X0(n.activeSourceHighlight),
    assistantContext: ld(n.assistantContext),
    audioPlaying: !1
  };
}
function ea() {
  return {
    completedTasks: [],
    flashcardIndex: 0,
    flashcardSide: "front",
    flashcardProgress: {},
    quizAnswers: {},
    quizChecked: {}
  };
}
function wP(e) {
  return Object.values(e.flashcardProgress || {}).filter((n) => n && n.difficulty).length;
}
function xP(e) {
  const n = Object.values(e.quizChecked || {}).filter((i) => i && i.hasKnownAnswer);
  if (!n.length) return null;
  const o = n.filter((i) => i.correct).length;
  return Math.round(o / n.length * 100);
}
function _P(e) {
  const n = od(e.selectedMaterial);
  return Object.entries(e.quizChecked || {}).filter(([, o]) => o && o.hasKnownAnswer && !o.correct).map(([o]) => oC(n[Number(o)], Number(o))).filter(Boolean);
}
const K = fP((e, n) => {
  const o = yP(), i = ad("focus-room"), a = Fa(i == null ? void 0 : i.selectedScene) ? vn(i.selectedScene) : o, f = _r(i == null ? void 0 : i.durationMinutes, po), d = rn(
    i == null ? void 0 : i.durationSeconds,
    Ci(f)
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
    musicVolume: Tt(i == null ? void 0 : i.musicVolume, 60),
    ambientVolume: Tt(i == null ? void 0 : i.ambientVolume, 50),
    audioChannels: { ...xi, ...(i == null ? void 0 : i.audioChannels) || {} },
    pomodoroDuration: f,
    pomodoroDurationSeconds: d,
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
    timerDurationSeconds: d,
    ...gr(i == null ? void 0 : i.focusTopics, (i == null ? void 0 : i.studyGoal) || "Deep work block"),
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
      const p = n(), m = j0("focus-room"), y = ug("focus-room"), S = Ht(m || {});
      if (!!((y == null ? void 0 : y.view) === "session" && y.currentSession && S === "running")) {
        const A = vn((m == null ? void 0 : m.selectedScene) || p.selectedScene);
        e({
          selectedMaterialId: "focus-room",
          selectedMaterial: null,
          studyPlan: Array.isArray(m == null ? void 0 : m.studyPlan) ? m.studyPlan : [],
          selectedScene: A.id,
          musicType: (m == null ? void 0 : m.musicType) || p.musicType,
          ambientSound: (m == null ? void 0 : m.ambientSound) || p.ambientSound,
          musicVolume: Tt(m == null ? void 0 : m.musicVolume, p.musicVolume),
          ambientVolume: Tt(m == null ? void 0 : m.ambientVolume, p.ambientVolume),
          audioChannels: { ...xi, ...(m == null ? void 0 : m.audioChannels) || p.audioChannels || {} },
          pomodoroDuration: _r(m == null ? void 0 : m.pomodoroDuration, p.pomodoroDuration),
          pomodoroDurationSeconds: rn(
            m == null ? void 0 : m.pomodoroDurationSeconds,
            p.pomodoroDurationSeconds
          ),
          ...gr(
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
      Sa("focus-room");
      const c = ad("focus-room"), v = vn((c == null ? void 0 : c.selectedScene) || p.selectedScene), w = _r(c == null ? void 0 : c.durationMinutes, p.pomodoroDuration || po), T = rn(
        c == null ? void 0 : c.durationSeconds,
        p.pomodoroDurationSeconds || Ci(w)
      );
      e({
        route: "setup",
        view: "setup",
        selectedMaterialId: "focus-room",
        selectedMaterial: null,
        selectedScene: v.id,
        musicType: String((c == null ? void 0 : c.musicType) || v.musicType || p.musicType || "Deep Focus"),
        ambientSound: String((c == null ? void 0 : c.ambientSound) || v.ambientSound || p.ambientSound || "Nature"),
        musicVolume: Tt(c == null ? void 0 : c.musicVolume, p.musicVolume ?? 60),
        ambientVolume: Tt(c == null ? void 0 : c.ambientVolume, p.ambientVolume ?? 50),
        audioChannels: { ...xi, ...(c == null ? void 0 : c.audioChannels) || p.audioChannels || {} },
        pomodoroDuration: w,
        pomodoroDurationSeconds: T,
        timerDurationSeconds: T,
        ...gr(
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
        ...Mt("idle", at()),
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
      ot(p), Sa("focus-room"), e({
        route: "setup",
        view: "setup",
        currentSession: null,
        summaryRecord: null,
        audioPlaying: !1,
        aiPanelOpen: !1,
        activeDrawer: "",
        elapsedSeconds: 0,
        startedAt: null,
        ...Mt("idle", at()),
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        timerDurationSeconds: Sr(p)
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
      const v = S.selectedMaterialId === c, w = v && y ? null : ug(c), T = v && y ? {} : SP(m, S), A = v && y ? {} : {
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
        timerDurationSeconds: Sr({
          pomodoroDuration: T.pomodoroDuration || po,
          pomodoroDurationSeconds: T.pomodoroDurationSeconds
        }),
        elapsedSeconds: 0,
        startedAt: null,
        currentSession: null,
        ...ea(),
        chatMessages: [],
        chatPending: !1,
        chatError: "",
        activeNoteSection: "",
        activeSourceHighlight: null,
        assistantContext: { sectionTitle: "", excerpt: "" }
      }, _ = v && y ? S.view === "session" ? "session" : "setup" : (w == null ? void 0 : w.view) === "session" ? "session" : "setup";
      if (e({
        ...T,
        ...A,
        ...w,
        route: _,
        view: _,
        selectedMaterialId: c,
        selectedMaterial: m,
        aiPanelOpen: !1,
        activeDrawer: "",
        summaryRecord: null
      }), (w == null ? void 0 : w.timerState) === "restoring") {
        const C = w.timerRestoreTarget || "paused";
        Promise.resolve().then(() => {
          const E = n();
          if (E.selectedMaterialId !== c || E.timerState !== "restoring") return;
          const D = at(), O = Wn(E), W = O > 0 ? Math.min(O, Math.max(0, Number(E.elapsedSeconds) || 0)) : Math.max(0, Number(E.elapsedSeconds) || 0), H = {
            ...Mt(C, D),
            timerRestoreTarget: null,
            timerAnchorAtMs: null,
            timerPausedAtMs: C === "paused" ? D : null,
            timerRestoredAtMs: D,
            elapsedSeconds: W,
            audioPlaying: !1
          };
          e(H), Bn({ ...E, ...H });
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
        sessionHistory: qc()
      });
    },
    selectScene(p) {
      const m = Fa(p);
      m && e((y) => {
        const S = {
          selectedScene: m.id,
          musicType: m.musicType || y.musicType,
          ambientSound: m.ambientSound || y.ambientSound
        }, l = { ...y, ...S };
        return ot(l), S;
      });
    },
    setPomodoroDurationSeconds(p) {
      e((m) => {
        const y = rn(p, m.pomodoroDurationSeconds), S = Math.max(1, Math.round(y / 60)), l = m.selectedMaterial ? nd(m.selectedMaterial, m.studyGoal, S) : [], c = {
          pomodoroDuration: S,
          pomodoroDurationSeconds: y,
          studyPlan: l,
          timerDurationSeconds: m.timerMode === "countup" ? 0 : y
        };
        return ot({ ...m, ...c }), c;
      });
    },
    setPomodoroDuration(p) {
      const m = _r(p, n().pomodoroDuration);
      n().setPomodoroDurationSeconds(m * 60);
    },
    setStudyGoal(p) {
      e((m) => {
        var v;
        const y = String(p ?? ""), S = m.selectedMaterial ? nd(m.selectedMaterial, y, m.pomodoroDuration) : [], l = Array.isArray(m.focusTopics) ? m.focusTopics.map((w) => w.id === m.activeTopicId || w.status === "active" ? { ...w, title: y || w.title, status: "active" } : w) : gr([], y).focusTopics, c = {
          studyGoal: y,
          studyPlan: S,
          focusTopics: l,
          activeTopicId: m.activeTopicId || ((v = l.find((w) => w.status === "active")) == null ? void 0 : v.id) || ""
        };
        return ot({ ...m, ...c }), c;
      });
    },
    addFocusTopic(p = {}) {
      e((m) => {
        const y = (m.focusTopics || []).some((v) => v.status === "active"), S = Ba({
          id: Q0(),
          title: p.title || `Topic ${(m.focusTopics || []).length + 1}`,
          description: p.description || "",
          status: y ? "pending" : "active"
        }, y ? "pending" : "active"), c = {
          focusTopics: [...m.focusTopics || [], S],
          activeTopicId: y ? m.activeTopicId : S.id,
          studyGoal: y ? m.studyGoal : S.title
        };
        return ot({ ...m, ...c }), c;
      });
    },
    updateFocusTopic(p, m = {}) {
      e((y) => {
        const S = (y.focusTopics || []).map((v) => v.id !== p ? v : Ba({
          ...v,
          ...m,
          id: v.id,
          status: v.status
        }, v.status)), l = lf(S, y.activeTopicId), c = {
          focusTopics: S,
          activeTopicId: (l == null ? void 0 : l.id) || y.activeTopicId || "",
          studyGoal: (l == null ? void 0 : l.title) || y.studyGoal
        };
        return ot({ ...y, ...c }), c;
      });
    },
    activateFocusTopic(p) {
      e((m) => {
        const y = yc(m.focusTopics, p);
        return ot({ ...m, ...y }), y;
      });
    },
    finishFocusTopic(p = "") {
      e((m) => {
        const y = String(p || m.activeTopicId || ""), S = (m.focusTopics || []).map((c) => c.id === y ? { ...c, status: "done" } : c), l = yc(S);
        return ot({ ...m, ...l }), l;
      });
    },
    removeFocusTopic(p) {
      e((m) => {
        const y = (m.focusTopics || []).filter((c) => c.id !== p);
        if (!y.length) {
          const c = gr([], m.studyGoal || "Deep work block");
          return ot({ ...m, ...c }), c;
        }
        const l = m.activeTopicId === p || (m.focusTopics || []).some((c) => c.id === p && c.status === "active") ? yc(y) : gr(y, m.studyGoal);
        return ot({ ...m, ...l }), l;
      });
    },
    setSound(p, m) {
      e((y) => {
        var l;
        let S = {};
        if (p === "musicVolume" && (S = { musicVolume: Tt(m, y.musicVolume) }), p === "ambientVolume" && (S = { ambientVolume: Tt(m, y.ambientVolume) }), p === "musicType" && (S = { musicType: String(m || y.musicType) }), p === "ambientSound" && (S = { ambientSound: String(m || y.ambientSound) }), String(p).startsWith("audioChannel:")) {
          const c = String(p).slice(13);
          S = { audioChannels: { ...y.audioChannels, [c]: Tt(m, ((l = y.audioChannels) == null ? void 0 : l[c]) ?? 0) } };
        }
        return ot({ ...y, ...S }), S;
      });
    },
    applyAudioPreset(p) {
      e((m) => {
        const y = zb(p), S = {
          musicType: y.musicType,
          ambientSound: y.ambientSound
        };
        return ot({ ...m, ...S }), S;
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
      const m = td.has(String(p || "")) ? String(p) : "materials";
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
        assistantContext: y ? ld({
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
        panelTab: td.has(m) ? m : "materials",
        aiPanelOpen: !0,
        activeDrawer: ""
      });
    },
    startSession() {
      const p = n(), m = p.timerMode === "countup" ? "countup" : "countdown";
      ot(p), e({
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
        timerUpdatedAtMs: at(),
        timerRestoredAtMs: null,
        timerDurationSeconds: m === "countup" ? 0 : Sr(p),
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
        ...ea(),
        chatMessages: [],
        chatPending: !1,
        chatError: ""
      });
    },
    startTimer() {
      const p = n();
      (!p.currentSession || p.view !== "session") && n().startSession();
      const m = n(), y = at(), S = Ht(m);
      if (S === "running") {
        n().tickTimer();
        return;
      }
      const l = Wn(m), c = S === "completed" || S === "break" || l > 0 && m.elapsedSeconds >= l, v = c ? 0 : Math.max(0, Number(m.elapsedSeconds) || 0), w = {
        view: "session",
        route: "session",
        ...Mt("running", y),
        audioPlaying: p.audioPlaying,
        summaryRecord: null,
        elapsedSeconds: v,
        startedAt: !m.startedAt || c ? new Date(y).toISOString() : m.startedAt,
        timerAnchorAtMs: y - v * 1e3,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        timerDurationSeconds: l,
        ...c ? ea() : {}
      };
      e(w), Bn({ ...m, ...w });
    },
    pauseTimer({ pauseAudio: p = !0 } = {}) {
      const m = n(), y = at();
      if (Ht(m) !== "running") {
        p && m.audioPlaying && e({ audioPlaying: !1 });
        return;
      }
      const S = lg(m, y), l = {
        ...S,
        ...Mt(S.timerState === "completed" ? "completed" : "paused", y),
        timerAnchorAtMs: null,
        timerPausedAtMs: y,
        audioPlaying: p ? !1 : m.audioPlaying
      };
      e(l), Bn({ ...m, ...l });
    },
    resetTimer() {
      const p = at(), m = {
        ...Mt("idle", p),
        timerRestoreTarget: null,
        timerMode: "countdown",
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerDurationSeconds: Sr(n()),
        audioPlaying: !1,
        startedAt: null,
        elapsedSeconds: 0,
        summaryRecord: null,
        ...ea()
      };
      e(m), Bn({ ...n(), ...m });
    },
    skipTimer() {
      const p = n(), m = at(), y = Wn(p), S = {
        ...Mt("completed", m),
        elapsedSeconds: y || Math.max(0, Number(p.elapsedSeconds) || 0),
        audioPlaying: !1,
        startedAt: p.startedAt || new Date(m).toISOString(),
        timerAnchorAtMs: null,
        timerPausedAtMs: m,
        timerDurationSeconds: y
      };
      e(S), Bn({ ...p, ...S });
    },
    tickTimer() {
      const p = n();
      if (p.view !== "session" || Ht(p) !== "running") return;
      const m = at(), y = Wn(p), S = y ? Math.min(y, $a(p, m)) : $a(p, m), l = y > 0 && S >= y ? "completed" : "running", c = {
        ...Mt(l, m),
        elapsedSeconds: S,
        timerAnchorAtMs: l === "running" ? p.timerAnchorAtMs : null,
        timerPausedAtMs: l === "running" ? null : m,
        timerDurationSeconds: y,
        audioPlaying: l === "running" ? p.audioPlaying : !1
      };
      S === p.elapsedSeconds && l === Ht(p) || (e(c), Bn({ ...p, ...c }));
    },
    setTimerMode(p = "countdown") {
      const m = p === "countup" ? "countup" : "countdown", y = {
        timerMode: m,
        timerDurationSeconds: m === "countup" ? 0 : Sr(n())
      };
      e(y), Bn({ ...n(), ...y });
    },
    startBreak() {
      const p = at(), m = {
        ...Mt("break", p),
        timerRestoreTarget: null,
        timerAnchorAtMs: null,
        timerPausedAtMs: p,
        timerDurationSeconds: 0,
        audioPlaying: !1
      };
      e(m), Bn({ ...n(), ...m });
    },
    getTimerState() {
      return Ht(n());
    },
    endSession() {
      var w;
      const p = n(), m = at(), y = new Date(m).toISOString(), S = Ht(p) === "running" ? lg(p, m) : p, l = Wn(S), c = l ? Math.min(l, S.elapsedSeconds) : S.elapsedSeconds, v = Qb({
        sessionId: (w = p.currentSession) == null ? void 0 : w.sessionId,
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
      Sa("focus-room"), e({
        summaryRecord: v,
        sessionHistory: qc(),
        ...Mt("completed", m),
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
        return ot({ ...m, ...y }), y;
      });
    },
    setAssistantContext(p = {}) {
      e({ assistantContext: ld(p) });
    },
    toggleTask(p) {
      e((m) => {
        const y = m.studyPlan[Number(p)];
        if (!y) return {};
        const S = String(y.task || ""), l = m.completedTasks.includes(S) ? m.completedTasks.filter((c) => c !== S) : [...m.completedTasks, S];
        return ot({ ...m, completedTasks: l }), { completedTasks: l };
      });
    },
    updatePlanTask(p, m = null, y = null) {
      e((S) => {
        const l = Number(p), c = S.studyPlan[l];
        if (!c) return {};
        const v = String(c.task || ""), w = y == null ? v : String(y || "").trim(), T = m == null ? c.minutes : Ar(m, c.minutes, 1, Xa), A = S.studyPlan.map((E, D) => D === l ? { minutes: T, task: w || v } : E);
        let _ = S.completedTasks;
        v && v !== A[l].task && _.includes(v) && (_ = _.filter((E) => E !== v).concat(A[l].task));
        const C = { studyPlan: A, completedTasks: _ };
        return ot({ ...S, ...C }), C;
      });
    },
    setFlashcardIndex(p) {
      const m = og(n().selectedMaterial);
      e({
        flashcardIndex: Ar(p, n().flashcardIndex, 0, Math.max(0, m.length - 1)),
        flashcardSide: "front"
      });
    },
    flipFlashcard() {
      e((p) => ({
        flashcardSide: p.flashcardSide === "back" ? "front" : "back"
      }));
    },
    rateFlashcard(p) {
      const m = n(), y = og(m.selectedMaterial);
      if (!y.length) return;
      const S = Ar(m.flashcardIndex, 0, 0, y.length - 1), l = y[S], c = ["easy", "medium", "hard"].includes(String(p)) ? String(p) : "medium";
      e({
        flashcardProgress: {
          ...m.flashcardProgress,
          [nC(l, S)]: {
            difficulty: c,
            reviewedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        },
        flashcardSide: "front",
        flashcardIndex: S < y.length - 1 ? S + 1 : S
      });
    },
    answerQuizQuestion(p, m) {
      const y = Number(p), S = od(n().selectedMaterial)[y];
      if (!S) return;
      const l = String(y);
      e((c) => ({
        quizAnswers: {
          ...c.quizAnswers,
          [l]: aC(S, m, c.quizAnswers[l])
        }
      }));
    },
    checkQuizQuestion(p) {
      const m = od(n().selectedMaterial), y = Number(p), S = m[y];
      if (!S) return;
      const l = String(y), c = n(), v = Object.prototype.hasOwnProperty.call(c.quizAnswers, l) ? c.quizAnswers[l] : "", w = lC(S, v), T = z0(S);
      e({
        quizChecked: {
          ...c.quizChecked,
          [l]: {
            answer: v,
            correct: w === null ? !1 : w,
            hasKnownAnswer: w !== null,
            explanation: S.explanation || S.rationale || (T ? `Correct answer: ${T}` : ""),
            checkedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        }
      });
    },
    async askAssistant(p) {
      const m = String(p || "").trim();
      if (!m) return;
      const y = n(), S = y.selectedMaterial, l = hi(y.chatMessages).slice(-10).map((c) => ({
        role: c.role === "user" ? "user" : "assistant",
        content: c.text
      }));
      e({
        chatMessages: hi([
          ...y.chatMessages,
          { role: "user", text: m, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
        ]),
        chatPending: !0,
        chatError: ""
      });
      try {
        const c = await hP({
          question: m,
          chatHistory: l,
          material: S,
          assistantContext: y.assistantContext,
          studyGoal: y.studyGoal
        });
        e((v) => ({
          chatMessages: hi([
            ...v.chatMessages,
            { role: "assistant", text: c.answer, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: c.offline ? "Using a local Focus Room reply because the AI tutor service is not connected." : ""
        }));
      } catch (c) {
        e((v) => ({
          chatMessages: hi([
            ...v.chatMessages,
            { role: "assistant", text: B0(m, S, n().studyGoal), createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: `AI tutor unavailable: ${c.message || "request failed"}`
        }));
      } finally {
        e({ chatPending: !1 });
      }
    },
    focusFlashcardsCompletedCount() {
      return wP(n());
    },
    focusQuizScore() {
      return xP(n());
    },
    focusQuizMistakes() {
      return _P(n());
    },
    formatFocusedTime() {
      return I0(n().elapsedSeconds);
    }
  };
});
function Z0({ compact: e = !1, className: n = "" }) {
  const o = K((c) => c.focusTopics), i = K((c) => c.activeTopicId), a = K((c) => c.addFocusTopic), f = K((c) => c.updateFocusTopic), d = K((c) => c.finishFocusTopic), p = K((c) => c.removeFocusTopic), m = K((c) => c.activateFocusTopic), y = lf(o, i), S = (o || []).filter((c) => c.status !== "done").length, l = (o || []).filter((c) => c.status === "done").length;
  return /* @__PURE__ */ x.jsxs(
    "section",
    {
      className: `focus-topics-panel ${e ? "is-compact" : ""} ${n}`.trim(),
      "aria-label": "Focus topics",
      "data-focus-topics": "true",
      children: [
        /* @__PURE__ */ x.jsxs("header", { className: "focus-topics-head", children: [
          /* @__PURE__ */ x.jsxs("div", { children: [
            /* @__PURE__ */ x.jsx("span", { className: "focus-topics-eyebrow", children: "Topics queue" }),
            /* @__PURE__ */ x.jsx("h3", { children: "What will you protect?" })
          ] }),
          /* @__PURE__ */ x.jsxs(
            "button",
            {
              type: "button",
              className: "focus-topics-add",
              onClick: () => a(),
              "aria-label": "Add focus topic",
              "data-focus-topic-add": "true",
              children: [
                /* @__PURE__ */ x.jsx(HC, { size: 14, "aria-hidden": "true" }),
                "Add"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ x.jsxs("p", { className: "focus-topics-hint", children: [
          "Finish or remove the active topic to switch into the next one automatically.",
          l ? ` ${l} done · ${S} open.` : null
        ] }),
        /* @__PURE__ */ x.jsx("div", { className: "focus-topics-list", children: (o || []).map((c, v) => {
          const w = c.id === (y == null ? void 0 : y.id), T = c.status === "done";
          return /* @__PURE__ */ x.jsxs(
            "article",
            {
              className: `focus-topic-card ${w ? "is-active" : ""} ${T ? "is-done" : ""}`.trim(),
              "data-focus-topic-id": c.id,
              "data-focus-topic-status": c.status,
              children: [
                /* @__PURE__ */ x.jsxs("div", { className: "focus-topic-card-top", children: [
                  /* @__PURE__ */ x.jsx("span", { className: "focus-topic-index", children: String(v + 1).padStart(2, "0") }),
                  /* @__PURE__ */ x.jsx("span", { className: "focus-topic-status", children: T ? "Done" : w ? "Active" : "Next" }),
                  /* @__PURE__ */ x.jsxs("div", { className: "focus-topic-actions", children: [
                    !T && !w ? /* @__PURE__ */ x.jsx(
                      "button",
                      {
                        type: "button",
                        className: "focus-topic-action",
                        onClick: () => m(c.id),
                        "aria-label": `Activate topic ${c.title}`,
                        children: "Use"
                      }
                    ) : null,
                    T ? null : /* @__PURE__ */ x.jsxs(
                      "button",
                      {
                        type: "button",
                        className: "focus-topic-action is-success",
                        onClick: () => d(c.id),
                        "aria-label": `Mark topic ${c.title} as done`,
                        "data-focus-topic-finish": c.id,
                        children: [
                          /* @__PURE__ */ x.jsx(Za, { size: 13, "aria-hidden": "true" }),
                          "Done"
                        ]
                      }
                    ),
                    /* @__PURE__ */ x.jsx(
                      "button",
                      {
                        type: "button",
                        className: "focus-topic-action is-danger",
                        onClick: () => p(c.id),
                        "aria-label": `Delete topic ${c.title}`,
                        "data-focus-topic-remove": c.id,
                        disabled: (o || []).length <= 1,
                        children: /* @__PURE__ */ x.jsx(oP, { size: 13, "aria-hidden": "true" })
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ x.jsxs("label", { className: "focus-topic-field", children: [
                  /* @__PURE__ */ x.jsx("span", { children: "Topic" }),
                  /* @__PURE__ */ x.jsx(
                    "input",
                    {
                      type: "text",
                      value: c.title,
                      onChange: (A) => f(c.id, { title: A.target.value }),
                      placeholder: "Topic title",
                      disabled: T,
                      "data-focus-topic-title": c.id
                    }
                  )
                ] }),
                /* @__PURE__ */ x.jsxs("label", { className: "focus-topic-field", children: [
                  /* @__PURE__ */ x.jsx("span", { children: "Description" }),
                  /* @__PURE__ */ x.jsx(
                    "textarea",
                    {
                      value: c.description,
                      onChange: (A) => f(c.id, { description: A.target.value }),
                      placeholder: "What will you do in this block?",
                      rows: e ? 2 : 3,
                      disabled: T,
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
function cg({ scene: e, active: n, onSelect: o, variant: i = "default" }) {
  return i === "gallery" ? /* @__PURE__ */ x.jsxs(
    Sn.button,
    {
      className: `scene-card scene-card-gallery ${n ? "active" : ""}`.trim(),
      type: "button",
      "aria-pressed": n,
      "aria-label": `${e.name}: ${e.description}`,
      onClick: () => o(e.id),
      whileHover: { y: -2 },
      whileTap: { scale: 0.985 },
      children: [
        /* @__PURE__ */ x.jsx(
          "span",
          {
            className: "scene-card-gallery-media",
            style: { backgroundImage: `url("${e.image}")` },
            children: n ? /* @__PURE__ */ x.jsx("span", { className: "scene-card-check", "aria-hidden": "true", children: "✓" }) : null
          }
        ),
        /* @__PURE__ */ x.jsxs("span", { className: "scene-card-gallery-copy", children: [
          /* @__PURE__ */ x.jsx("strong", { children: e.name }),
          /* @__PURE__ */ x.jsx("small", { children: e.kicker })
        ] })
      ]
    }
  ) : /* @__PURE__ */ x.jsxs(
    Sn.button,
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
        /* @__PURE__ */ x.jsx("span", { className: "focus-pill", children: e.kicker }),
        /* @__PURE__ */ x.jsx("strong", { children: e.name }),
        /* @__PURE__ */ x.jsx("span", { children: e.description })
      ]
    }
  );
}
const ta = 8;
function uf({ variant: e = "default" }) {
  const n = K((y) => y.selectedScene), o = K((y) => y.selectScene), [i, a] = b.useState(0), f = b.useMemo(() => e === "gallery" ? $b : Zn.filter((y) => !y.galleryOnly || y.id === n), [n, e]), d = Math.max(1, Math.ceil(f.length / ta)), p = Math.min(i, d - 1), m = e === "gallery" ? f.slice(p * ta, p * ta + ta) : f;
  return e !== "gallery" ? /* @__PURE__ */ x.jsx("div", { className: "scene-selector", "aria-label": "Study scenes", children: m.map((y) => /* @__PURE__ */ x.jsx(
    cg,
    {
      scene: y,
      active: y.id === n,
      onSelect: o
    },
    y.id
  )) }) : /* @__PURE__ */ x.jsxs("div", { className: "scene-selector-wrap", "aria-label": "Study scenes", children: [
    /* @__PURE__ */ x.jsx("div", { className: "scene-selector scene-selector-gallery", children: m.map((y) => /* @__PURE__ */ x.jsx(
      cg,
      {
        scene: y,
        active: y.id === n,
        onSelect: o,
        variant: "gallery"
      },
      y.id
    )) }),
    d > 1 ? /* @__PURE__ */ x.jsxs("div", { className: "scene-pagination", "aria-label": "Scene pages", children: [
      /* @__PURE__ */ x.jsx(
        "button",
        {
          type: "button",
          className: "scene-page-arrow scene-page-button-left",
          onClick: () => a((y) => Math.max(0, y - 1)),
          disabled: p <= 0,
          "aria-label": "Previous scenes",
          children: /* @__PURE__ */ x.jsx(TC, { size: 18, "aria-hidden": "true" })
        }
      ),
      /* @__PURE__ */ x.jsx(
        "button",
        {
          type: "button",
          className: "scene-page-arrow scene-page-button-right",
          onClick: () => a((y) => Math.min(d - 1, y + 1)),
          disabled: p >= d - 1,
          "aria-label": "Next scenes",
          children: /* @__PURE__ */ x.jsx(AC, { size: 18, "aria-hidden": "true" })
        }
      )
    ] }) : null
  ] });
}
const dg = [
  { label: "Lo-fi Chill", icon: LC, musicType: "Lo-fi", ambientSound: "Cafe Rain" },
  { label: "Ambient Piano", icon: BC, musicType: "Piano", ambientSound: "Nature" },
  { label: "Nature Ambient", icon: af, musicType: "Deep Focus", ambientSound: "Nature" },
  { label: "Acoustic Warm", icon: CC, musicType: "Minimal", ambientSound: "White Noise" },
  { label: "Deep Focus", icon: GC, musicType: "Deep Focus", ambientSound: "White Noise" }
];
function TP({ onWorkspace: e }) {
  const n = K((C) => C.selectedScene), o = K((C) => C.pomodoroDuration), i = K((C) => C.timerMode), a = K((C) => C.musicType), f = K((C) => C.focusTopics), d = K((C) => C.setPomodoroDuration), p = K((C) => C.setTimerMode), m = K((C) => C.setSound), y = K((C) => C.startSession), [S, l] = b.useState(!1), c = b.useMemo(
    () => {
      var C;
      return ((C = dg.find((E) => E.musicType === a)) == null ? void 0 : C.label) || "";
    },
    [a]
  ), v = (f || []).filter((C) => C.status !== "done").length, w = (C) => {
    m("musicType", C.musicType), m("ambientSound", C.ambientSound);
  }, T = (C) => {
    p("countdown"), d(C);
  }, A = () => {
    n && y();
  }, _ = () => {
    e == null || e("", "history");
  };
  return /* @__PURE__ */ x.jsxs("section", { className: "focus-setup-stage innook-scene-setup", "aria-label": "Focus Room setup", "data-focus-setup": "true", children: [
    /* @__PURE__ */ x.jsxs("header", { className: "innook-setup-header", children: [
      /* @__PURE__ */ x.jsxs("button", { type: "button", className: "innook-setup-brand", onClick: e, "aria-label": "Return to Synapse workspace", children: [
        /* @__PURE__ */ x.jsx("span", { className: "innook-brand-mark", children: "S" }),
        /* @__PURE__ */ x.jsxs("span", { children: [
          /* @__PURE__ */ x.jsx("strong", { children: "synapse" }),
          /* @__PURE__ */ x.jsx("small", { children: "Focus Room" })
        ] })
      ] }),
      /* @__PURE__ */ x.jsxs("div", { className: "innook-setup-header-actions", children: [
        /* @__PURE__ */ x.jsx(
          "button",
          {
            type: "button",
            className: "innook-header-action",
            onClick: _,
            "aria-label": "Open Focus Trail",
            title: "Open Focus Trail",
            children: /* @__PURE__ */ x.jsx(jC, { size: 18, "aria-hidden": "true" })
          }
        ),
        /* @__PURE__ */ x.jsx(
          "button",
          {
            type: "button",
            className: "innook-header-action",
            onClick: e,
            "aria-label": "Return to Synapse workspace",
            title: "Return to workspace",
            children: /* @__PURE__ */ x.jsx(vC, { size: 20, "aria-hidden": "true" })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ x.jsxs("div", { className: "innook-setup-layout", children: [
      /* @__PURE__ */ x.jsxs("section", { className: "innook-scene-panel", "aria-labelledby": "innook-scene-title", children: [
        /* @__PURE__ */ x.jsxs("div", { className: "innook-panel-heading", children: [
          /* @__PURE__ */ x.jsx("span", { children: "STEP 01" }),
          /* @__PURE__ */ x.jsx("h1", { id: "innook-scene-title", children: "Choose a study scene" })
        ] }),
        /* @__PURE__ */ x.jsx(uf, { variant: "gallery" })
      ] }),
      /* @__PURE__ */ x.jsxs("aside", { className: "innook-control-rail", "aria-label": "Study settings", children: [
        /* @__PURE__ */ x.jsx("div", { className: "innook-rail-group", "aria-label": "Music atmosphere", children: dg.map((C) => {
          const E = C.icon, D = c === C.label;
          return /* @__PURE__ */ x.jsx(
            "button",
            {
              type: "button",
              className: `innook-rail-icon ${D ? "is-active" : ""}`.trim(),
              onClick: () => w(C),
              "aria-label": `Music style: ${C.label}`,
              "aria-pressed": D,
              title: C.label,
              children: /* @__PURE__ */ x.jsx(E, { size: 16, "aria-hidden": "true" })
            },
            C.label
          );
        }) }),
        /* @__PURE__ */ x.jsx("div", { className: "innook-rail-divider" }),
        /* @__PURE__ */ x.jsxs("div", { className: "innook-duration-list", "aria-label": "Focus duration", children: [
          P0.map((C) => {
            const E = i !== "countup" && C === o;
            return /* @__PURE__ */ x.jsx(
              "button",
              {
                type: "button",
                className: `innook-duration ${E ? "is-active" : ""}`.trim(),
                onClick: () => T(C),
                "aria-pressed": E,
                children: C
              },
              C
            );
          }),
          /* @__PURE__ */ x.jsx(
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
        /* @__PURE__ */ x.jsx("div", { className: "innook-rail-divider" }),
        /* @__PURE__ */ x.jsxs(
          "button",
          {
            type: "button",
            className: `innook-rail-icon ${S ? "is-active" : ""}`.trim(),
            onClick: () => l((C) => !C),
            "aria-label": "Edit focus topics",
            "aria-expanded": S,
            title: "Edit focus topics",
            "data-focus-topics-toggle": "true",
            children: [
              /* @__PURE__ */ x.jsx(nP, { size: 16, "aria-hidden": "true" }),
              v > 1 ? /* @__PURE__ */ x.jsx("span", { className: "innook-rail-badge", children: v }) : null
            ]
          }
        ),
        /* @__PURE__ */ x.jsx(
          "button",
          {
            type: "button",
            className: "innook-enter-button",
            onClick: A,
            disabled: !n,
            "data-focus-enter": "true",
            "aria-label": "Enter Focus Room",
            title: "Enter Focus Room",
            children: /* @__PURE__ */ x.jsx(wC, { size: 22, "aria-hidden": "true" })
          }
        ),
        S ? /* @__PURE__ */ x.jsx("div", { className: "innook-goal-popover innook-topics-popover", "data-focus-topics-popover": "true", children: /* @__PURE__ */ x.jsx(Z0, { compact: !0 }) }) : null
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
  const { onPointerMove: f, onPointerLeave: d, ...p } = a;
  return /* @__PURE__ */ x.jsx(
    "button",
    {
      className: `glass-button glass-button-${o} ${n}`.trim(),
      type: i,
      onPointerMove: (m) => {
        const y = m.currentTarget.getBoundingClientRect();
        m.currentTarget.style.setProperty("--glass-x", `${Math.max(0, Math.min(100, (m.clientX - y.left) / y.width * 100))}%`), m.currentTarget.style.setProperty("--glass-y", `${Math.max(0, Math.min(100, (m.clientY - y.top) / y.height * 100))}%`), f == null || f(m);
      },
      onPointerLeave: (m) => {
        m.currentTarget.style.setProperty("--glass-x", "50%"), m.currentTarget.style.setProperty("--glass-y", "0%"), d == null || d(m);
      },
      ...p,
      children: e
    }
  );
}
function kP({ onWorkspace: e, onOpenTrail: n, onOpenCompanion: o, onOpenSettings: i, onExit: a }) {
  const f = K((p) => p.selectedScene), d = vn(f);
  return /* @__PURE__ */ x.jsxs("header", { className: "focus-room-header", children: [
    /* @__PURE__ */ x.jsxs("button", { type: "button", className: "focus-wordmark", onClick: e, "aria-label": "Return to Synapse workspace", children: [
      /* @__PURE__ */ x.jsx("span", { className: "focus-wordmark-mark", children: "S" }),
      /* @__PURE__ */ x.jsx("span", { children: "synapse" })
    ] }),
    /* @__PURE__ */ x.jsxs("div", { className: "focus-room-context", "aria-label": "Current focus context", children: [
      /* @__PURE__ */ x.jsx("span", { children: d.name }),
      /* @__PURE__ */ x.jsx("small", { children: "Quiet study room" })
    ] }),
    /* @__PURE__ */ x.jsxs("nav", { className: "focus-room-header-actions", "aria-label": "Focus Room controls", children: [
      /* @__PURE__ */ x.jsxs(Te, { className: "header-icon-button", onClick: n, title: "Open Focus Trail", "aria-label": "Open Focus Trail", children: [
        /* @__PURE__ */ x.jsx(Va, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: "Focus Trail" })
      ] }),
      /* @__PURE__ */ x.jsxs(Te, { className: "header-icon-button", onClick: o, title: "Open Companion Room", "aria-label": "Open Companion Room", children: [
        /* @__PURE__ */ x.jsx(za, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: "Companion" })
      ] }),
      /* @__PURE__ */ x.jsxs(Te, { className: "header-icon-button", onClick: i, title: "Open room settings", "aria-label": "Open room settings", children: [
        /* @__PURE__ */ x.jsx(G0, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: "Settings" })
      ] }),
      /* @__PURE__ */ x.jsxs(Te, { className: "header-icon-button header-exit-button", onClick: a, title: "Exit Focus Room", "aria-label": "Exit Focus Room", children: [
        /* @__PURE__ */ x.jsx(RC, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: "Exit" })
      ] })
    ] })
  ] });
}
const J0 = {
  minutes: Math.floor(F0 / 60),
  seconds: 59
}, AP = {
  minutes: 3,
  seconds: 2
};
function cf(e) {
  const n = rn(e, of);
  return {
    minutes: Math.floor(n / 60),
    seconds: n % 60
  };
}
function fg(e, n) {
  const o = Math.max(0, Math.floor(Number(e) || 0)), i = Math.max(0, Math.floor(Number(n) || 0));
  return rn(o * 60 + i, of);
}
function ud(e, n) {
  return String(Math.max(0, Math.floor(Number(e) || 0))).padStart(2, "0");
}
function df(e) {
  const { minutes: n, seconds: o } = cf(e);
  return `${ud(n, "minutes")}:${ud(o, "seconds")}`;
}
function bP(e, n, o) {
  const i = AP[o] || 2;
  return `${String(e || "").replace(/\D/g, "")}${String(n).replace(/\D/g, "")}`.slice(-i) || "";
}
function CP(e, n) {
  const o = Number(String(e || "").replace(/\D/g, "")) || 0;
  return Math.min(J0[n], o);
}
function PP(e, n, o) {
  const i = cf(e), a = CP(o, n);
  return n === "seconds" ? fg(i.minutes, a) : fg(a, i.seconds);
}
const EP = { minutes: "Minutes", seconds: "Seconds" };
function pg({
  segment: e,
  value: n,
  disabled: o,
  active: i,
  onFocusSegment: a,
  onType: f,
  onCommit: d,
  onMove: p,
  segmentRef: m
}) {
  const y = EP[e], S = (l) => {
    if (o) return;
    const { key: c } = l;
    if (c >= "0" && c <= "9") {
      l.preventDefault(), f(e, c);
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
    (c === "Backspace" || c === "Delete") && (l.preventDefault(), d());
  };
  return /* @__PURE__ */ x.jsx("span", { className: `timer-editor-segment${i ? " is-active" : ""}`, children: /* @__PURE__ */ x.jsx(
    "span",
    {
      ref: m,
      className: "timer-editor-digits",
      role: "spinbutton",
      tabIndex: o ? -1 : 0,
      "aria-label": y,
      "aria-valuemin": 0,
      "aria-valuemax": J0[e],
      "aria-valuenow": n,
      "aria-valuetext": `${n} ${y.toLowerCase()}`,
      "aria-disabled": o || void 0,
      onFocus: () => a(e),
      onKeyDown: S,
      children: ud(n, e)
    }
  ) });
}
function MP({
  valueSeconds: e,
  onChange: n,
  disabled: o = !1,
  size: i = "hero",
  ariaLabel: a = "Set focus block length",
  className: f = ""
}) {
  const { minutes: d, seconds: p } = cf(e), [m, y] = b.useState(null), S = b.useRef(""), l = b.useRef(null), c = b.useRef(null), v = b.useRef(null), w = b.useCallback(() => {
    S.current = "";
  }, []), T = b.useCallback((E) => {
    S.current = "", y(E);
  }, []), A = b.useCallback(
    (E, D) => {
      if (o) return;
      const O = bP(S.current, D, E);
      S.current = O, y(E), n == null || n(PP(e, E, O));
    },
    [o, n, e]
  ), _ = b.useCallback((E) => {
    var O;
    const D = E < 0 ? "minutes" : "seconds";
    S.current = "", y(D), (O = (E < 0 ? l : c).current) == null || O.focus();
  }, []), C = (E) => {
    var D;
    (D = v.current) != null && D.contains(E.relatedTarget) || (w(), y(null));
  };
  return /* @__PURE__ */ x.jsxs(
    "div",
    {
      ref: v,
      className: `timer-editor timer-editor-${i}${o ? " is-readonly" : ""} ${f}`.trim(),
      role: "group",
      "aria-label": a,
      onBlur: C,
      children: [
        o ? /* @__PURE__ */ x.jsx("span", { className: "timer-editor-static", "aria-hidden": "true", children: df(e) }) : /* @__PURE__ */ x.jsxs(x.Fragment, { children: [
          /* @__PURE__ */ x.jsx(
            pg,
            {
              segment: "minutes",
              value: d,
              disabled: o,
              active: m === "minutes",
              segmentRef: l,
              onFocusSegment: T,
              onType: A,
              onCommit: w,
              onMove: _
            }
          ),
          /* @__PURE__ */ x.jsx("span", { className: "timer-editor-colon", "aria-hidden": "true", children: ":" }),
          /* @__PURE__ */ x.jsx(
            pg,
            {
              segment: "seconds",
              value: p,
              disabled: o,
              active: m === "seconds",
              segmentRef: c,
              onFocusSegment: T,
              onType: A,
              onCommit: w,
              onMove: _
            }
          )
        ] }),
        !o && /* @__PURE__ */ x.jsx("span", { className: "sr-only", children: "Editable focus timer. Click minutes or seconds, then type digits to set the value." })
      ]
    }
  );
}
function RP(e, n) {
  return n ? Math.min(100, Math.max(0, e / n * 100)) : 0;
}
function DP({ onFocusMode: e, audioState: n }) {
  const o = K((ee) => ee.timerStatus), i = K((ee) => ee.elapsedSeconds), a = K((ee) => ee.pomodoroDuration), f = K((ee) => ee.pomodoroDurationSeconds), d = K((ee) => ee.timerMode), p = K((ee) => ee.studyGoal), m = K((ee) => ee.focusTopics), y = K((ee) => ee.activeTopicId), S = K((ee) => ee.currentSession), l = K((ee) => ee.startTimer), c = K((ee) => ee.pauseTimer), v = K((ee) => ee.resetTimer), w = K((ee) => ee.skipTimer), T = K((ee) => ee.toggleAudio), A = K((ee) => ee.audioPlaying), _ = K((ee) => ee.setPomodoroDurationSeconds), C = K((ee) => ee.finishFocusTopic), E = lf(m, y), D = Number(f) || (Number(a) || 0) * 60, O = d === "countup" ? i : Math.max(0, D - i), W = o === "paused", H = o === "studying", Y = o === "completed", L = o === "idle" && d !== "countup", X = Y && d !== "countup" ? "00:00" : rd(O), se = W ? "Paused" : Y ? "Complete" : H ? "In focus" : "Ready", Z = W ? "Resume timer" : H ? "Pause timer" : "Start timer", de = (E == null ? void 0 : E.title) || p || "A quiet block for meaningful progress", ce = (E == null ? void 0 : E.description) || "", ye = !!(E && E.status !== "done");
  return /* @__PURE__ */ x.jsxs("div", { className: "focus-session-dock liquid-glass", "aria-label": "Focus session controls", children: [
    /* @__PURE__ */ x.jsxs("div", { className: "dock-timer-block", children: [
      /* @__PURE__ */ x.jsxs("div", { className: "dock-eyebrow", children: [
        "POMODORO #",
        (S == null ? void 0 : S.pomodoroNumber) || 1
      ] }),
      /* @__PURE__ */ x.jsxs("div", { className: "dock-status", children: [
        /* @__PURE__ */ x.jsx("span", { className: `dock-status-dot ${W || !H ? "is-paused" : ""}` }),
        se
      ] }),
      L ? /* @__PURE__ */ x.jsx(
        MP,
        {
          className: "dock-time-editor",
          valueSeconds: D,
          onChange: _,
          size: "dock",
          ariaLabel: "Set focus block length"
        }
      ) : /* @__PURE__ */ x.jsx("strong", { className: "dock-time", "aria-live": "off", children: X }),
      /* @__PURE__ */ x.jsx("div", { className: "dock-progress", "aria-hidden": "true", children: /* @__PURE__ */ x.jsx("span", { style: { width: `${RP(i, D)}%` } }) })
    ] }),
    /* @__PURE__ */ x.jsxs("div", { className: "dock-goal-block", "data-focus-active-topic": "true", children: [
      /* @__PURE__ */ x.jsx("span", { className: "dock-eyebrow", children: "ACTIVE TOPIC" }),
      /* @__PURE__ */ x.jsx("strong", { children: de }),
      ce ? /* @__PURE__ */ x.jsx("span", { className: "dock-goal-description", children: ce }) : null,
      /* @__PURE__ */ x.jsxs("span", { className: "dock-goal-meta", children: [
        d === "countup" ? "Count-up" : `${df(D)} block`,
        " · ",
        rd(i),
        " focused"
      ] }),
      ye ? /* @__PURE__ */ x.jsxs(
        "button",
        {
          type: "button",
          className: "dock-topic-finish",
          onClick: () => C(E.id),
          "data-focus-topic-finish-dock": "true",
          "aria-label": "Mark active topic done and switch to the next",
          children: [
            /* @__PURE__ */ x.jsx(Za, { size: 13, "aria-hidden": "true" }),
            "Done · next topic"
          ]
        }
      ) : null
    ] }),
    /* @__PURE__ */ x.jsxs("div", { className: "dock-action-block", children: [
      /* @__PURE__ */ x.jsxs(Te, { className: "dock-action-button", onClick: T, "aria-label": A ? "Pause room audio" : "Play room audio", children: [
        A ? /* @__PURE__ */ x.jsx(sd, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ x.jsx(Ja, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: n != null && n.playing ? "Pause audio" : "Audio" })
      ] }),
      /* @__PURE__ */ x.jsxs(Te, { className: "dock-action-button", onClick: () => H ? c() : l(), variant: "primary", "aria-label": Z, children: [
        H ? /* @__PURE__ */ x.jsx(sd, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ x.jsx(U0, { size: 15, fill: "currentColor", "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: W ? "Resume" : H ? "Pause" : "Start" })
      ] }),
      /* @__PURE__ */ x.jsxs(Te, { className: "dock-action-button", onClick: w, "aria-label": "Skip timer", children: [
        /* @__PURE__ */ x.jsx(K0, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: "Skip" })
      ] }),
      /* @__PURE__ */ x.jsxs(Te, { className: "dock-action-button", onClick: v, "aria-label": "Reset timer", children: [
        /* @__PURE__ */ x.jsx(H0, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: "Reset" })
      ] }),
      /* @__PURE__ */ x.jsxs(Te, { className: "dock-focus-mode", onClick: e, "aria-label": "Enter distraction-free Focus Mode", children: [
        /* @__PURE__ */ x.jsx(eP, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: "Focus Mode" })
      ] })
    ] })
  ] });
}
var NP = Object.defineProperty, _o = (e, n) => NP(e, "name", { value: n, configurable: !0 }), q0 = !!(typeof window < "u" && window.document && window.document.createElement);
function Cr(e, n, { checkForDefaultPrevented: o = !0 } = {}) {
  return /* @__PURE__ */ _o(function(a) {
    if (e == null || e(a), o === !1 || !a || !a.defaultPrevented)
      return n == null ? void 0 : n(a);
  }, "handleEvent");
}
_o(Cr, "composeEventHandlers");
function jP(e) {
  var n;
  if (!q0)
    throw new Error("Cannot access window outside of the DOM");
  return ((n = e == null ? void 0 : e.ownerDocument) == null ? void 0 : n.defaultView) ?? window;
}
_o(jP, "getOwnerWindow");
function cd(e) {
  if (!q0)
    throw new Error("Cannot access document outside of the DOM");
  return (e == null ? void 0 : e.ownerDocument) ?? document;
}
_o(cd, "getOwnerDocument");
function eS(e, n = !1) {
  const { activeElement: o } = cd(e);
  if (!(o != null && o.nodeName))
    return null;
  if (tS(o) && o.contentDocument)
    return eS(o.contentDocument.body, n);
  if (n) {
    const i = o.getAttribute("aria-activedescendant");
    if (i) {
      const a = cd(o).getElementById(i);
      if (a)
        return a;
    }
  }
  return o;
}
_o(eS, "getActiveElement");
function tS(e) {
  return e.tagName === "IFRAME";
}
_o(tS, "isFrame");
var IP = Object.defineProperty, ff = (e, n) => IP(e, "name", { value: n, configurable: !0 });
function dd(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
ff(dd, "setRef");
function nS(...e) {
  return (n) => {
    let o = !1;
    const i = e.map((a) => {
      const f = dd(a, n);
      return !o && typeof f == "function" && (o = !0), f;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const f = i[a];
          typeof f == "function" ? f() : dd(e[a], null);
        }
      };
  };
}
ff(nS, "composeRefs");
function To(...e) {
  return b.useCallback(nS(...e), e);
}
ff(To, "useComposedRefs");
var FP = Object.defineProperty, Dt = (e, n) => FP(e, "name", { value: n, configurable: !0 });
// @__NO_SIDE_EFFECTS__
function OP(e, n) {
  const o = b.createContext(n);
  o.displayName = e + "Context";
  const i = /* @__PURE__ */ Dt((f) => {
    const { children: d, ...p } = f, m = b.useMemo(() => p, Object.values(p));
    return /* @__PURE__ */ x.jsx(o.Provider, { value: m, children: d });
  }, "Provider");
  i.displayName = e + "Provider";
  function a(f, d = {}) {
    const { optional: p = !1 } = d, m = b.useContext(o);
    if (m) return m;
    if (n !== void 0) return n;
    if (!p)
      throw new Error(`\`${f}\` must be used within \`${e}\``);
  }
  return Dt(a, "useContext"), [i, a];
}
Dt(OP, "createContext");
// @__NO_SIDE_EFFECTS__
function rS(e, n = []) {
  let o = [];
  function i(f, d) {
    const p = b.createContext(d);
    p.displayName = f + "Context";
    const m = o.length;
    o = [...o, d];
    const y = /* @__PURE__ */ Dt((l) => {
      var _;
      const { scope: c, children: v, ...w } = l, T = ((_ = c == null ? void 0 : c[e]) == null ? void 0 : _[m]) || p, A = b.useMemo(() => w, Object.values(w));
      return /* @__PURE__ */ x.jsx(T.Provider, { value: A, children: v });
    }, "Provider");
    y.displayName = f + "Provider";
    function S(l, c, v = {}) {
      var _;
      const { optional: w = !1 } = v, T = ((_ = c == null ? void 0 : c[e]) == null ? void 0 : _[m]) || p, A = b.useContext(T);
      if (A) return A;
      if (d !== void 0) return d;
      if (!w)
        throw new Error(`\`${l}\` must be used within \`${f}\``);
    }
    return Dt(S, "useContext"), [y, S];
  }
  Dt(i, "createContext");
  const a = /* @__PURE__ */ Dt(() => {
    const f = o.map((d) => b.createContext(d));
    return /* @__PURE__ */ Dt(function(p) {
      const m = (p == null ? void 0 : p[e]) || f;
      return b.useMemo(
        () => ({ [`__scope${e}`]: { ...p, [e]: m } }),
        [p, m]
      );
    }, "useScope");
  }, "createScope");
  return a.scopeName = e, [i, oS(a, ...n)];
}
Dt(rS, "createContextScope");
function oS(...e) {
  const n = e[0];
  if (e.length === 1) return n;
  const o = /* @__PURE__ */ Dt(() => {
    const i = e.map((a) => ({
      useScope: a(),
      scopeName: a.scopeName
    }));
    return /* @__PURE__ */ Dt(function(f) {
      const d = i.reduce((p, { useScope: m, scopeName: y }) => {
        const l = m(f)[`__scope${y}`];
        return { ...p, ...l };
      }, {});
      return b.useMemo(() => ({ [`__scope${n.scopeName}`]: d }), [d]);
    }, "useComposedScopes");
  }, "createScope");
  return o.scopeName = n.scopeName, o;
}
Dt(oS, "composeContextScopes");
var Jn = globalThis != null && globalThis.document ? b.useLayoutEffect : () => {
}, LP = Object.defineProperty, VP = (e, n) => LP(e, "name", { value: n, configurable: !0 }), zP = Er[" useId ".trim().toString()] || (() => {
}), BP = 0;
function wa(e) {
  const [n, o] = b.useState(zP());
  return Jn(() => {
    e || o((i) => i ?? String(BP++));
  }, [e]), e || (n ? `radix-${n}` : "");
}
VP(wa, "useId");
var $P = Object.defineProperty, UP = (e, n) => $P(e, "name", { value: n, configurable: !0 }), mg = Er[" useEffectEvent ".trim().toString()], hg = Er[" useInsertionEffect ".trim().toString()];
function iS(e) {
  if (typeof mg == "function")
    return mg(e);
  const n = b.useRef(() => {
    throw new Error("Cannot call an event handler while rendering.");
  });
  return typeof hg == "function" ? hg(() => {
    n.current = e;
  }) : Jn(() => {
    n.current = e;
  }), b.useMemo(() => ((...o) => {
    var i;
    return (i = n.current) == null ? void 0 : i.call(n, ...o);
  }), []);
}
UP(iS, "useEffectEvent");
var HP = Object.defineProperty, Ii = (e, n) => HP(e, "name", { value: n, configurable: !0 }), WP = Er[" useInsertionEffect ".trim().toString()] || Jn;
function sS({
  prop: e,
  defaultProp: n,
  onChange: o = /* @__PURE__ */ Ii(() => {
  }, "onChange"),
  caller: i
}) {
  const [a, f, d] = aS({
    defaultProp: n,
    onChange: o
  }), p = e !== void 0, m = p ? e : a, y = b.useCallback(
    (S) => {
      var l;
      if (p) {
        const c = lS(S) ? S(e) : S;
        c !== e && ((l = d.current) == null || l.call(d, c));
      } else
        f(S);
    },
    [p, e, f, d]
  );
  return [m, y];
}
Ii(sS, "useControllableState");
function aS({
  defaultProp: e,
  onChange: n
}) {
  const [o, i] = b.useState(e), a = b.useRef(o), f = b.useRef(n);
  return WP(() => {
    f.current = n;
  }, [n]), b.useEffect(() => {
    var d;
    a.current !== o && ((d = f.current) == null || d.call(f, o), a.current = o);
  }, [o, a]), [o, i, f];
}
Ii(aS, "useUncontrolledState");
function lS(e) {
  return typeof e == "function";
}
Ii(lS, "isFunction");
var yg = Symbol("RADIX:SYNC_STATE");
function GP(e, n, o, i) {
  const { prop: a, defaultProp: f, onChange: d, caller: p } = n, m = a !== void 0, y = iS(d), S = [{ ...o, state: f }];
  i && S.push(i);
  const [l, c] = b.useReducer(
    (A, _) => {
      if (_.type === yg)
        return { ...A, state: _.state };
      const C = e(A, _);
      return m && !Object.is(C.state, A.state) && y(C.state), C;
    },
    ...S
  ), v = l.state, w = b.useRef(v);
  b.useEffect(() => {
    w.current !== v && (w.current = v, m || y(v));
  }, [v, w, m]);
  const T = b.useMemo(() => a !== void 0 ? { ...l, state: a } : l, [l, a]);
  return b.useEffect(() => {
    m && !Object.is(a, l.state) && c({ type: yg, state: a });
  }, [a, l.state, m]), [T, c];
}
Ii(GP, "useControllableStateReducer");
var uS = Og(), KP = Object.defineProperty, Gt = (e, n) => KP(e, "name", { value: n, configurable: !0 });
// @__NO_SIDE_EFFECTS__
function pf(e) {
  const n = b.forwardRef((o, i) => {
    let { children: a, ...f } = o, d = null, p = !1;
    const m = [];
    fd(a) && typeof na == "function" && (a = na(a._payload)), b.Children.forEach(a, (c) => {
      var v;
      if (pS(c)) {
        p = !0;
        const w = c;
        let T = "child" in w.props ? w.props.child : w.props.children;
        fd(T) && typeof na == "function" && (T = na(T._payload)), d = QP(w, T), m.push((v = d == null ? void 0 : d.props) == null ? void 0 : v.children);
      } else
        m.push(c);
    }), d ? d = b.cloneElement(d, void 0, m) : (
      // A `Slottable` was found but it didn't resolve to a single element (e.g.
      // it wrapped multiple elements, text, or a render-prop `child` that
      // wasn't an element). Don't fall back to treating the `Slottable` wrapper
      // itself as the slot target — throw a descriptive error below instead.
      !p && b.Children.count(a) === 1 && b.isValidElement(a) && (d = a)
    );
    const y = d ? fS(d) : void 0, S = To(i, y);
    if (!d) {
      if (a || a === 0)
        throw new Error(
          p ? JP(e) : ZP(e)
        );
      return a;
    }
    const l = dS(f, d.props ?? {});
    return d.type !== b.Fragment && (l.ref = i ? S : y), b.cloneElement(d, l);
  });
  return n.displayName = `${e}.Slot`, n;
}
Gt(pf, "createSlot");
var cS = Symbol.for("radix.slottable");
// @__NO_SIDE_EFFECTS__
function YP(e) {
  const n = /* @__PURE__ */ Gt((o) => "child" in o ? o.children(o.child) : o.children, "Slottable");
  return n.displayName = `${e}.Slottable`, n.__radixId = cS, n;
}
Gt(YP, "createSlottable");
var QP = /* @__PURE__ */ Gt((e, n) => {
  if ("child" in e.props) {
    const o = e.props.child;
    return b.isValidElement(o) ? b.cloneElement(o, void 0, e.props.children(o.props.children)) : null;
  }
  return b.isValidElement(n) ? n : null;
}, "getSlottableElementFromSlottable");
function dS(e, n) {
  const o = { ...n };
  for (const i in n) {
    const a = e[i], f = n[i];
    /^on[A-Z]/.test(i) ? a && f ? o[i] = (...p) => {
      const m = f(...p);
      return a(...p), m;
    } : a && (o[i] = a) : i === "style" ? o[i] = { ...a, ...f } : i === "className" && (o[i] = [a, f].filter(Boolean).join(" "));
  }
  return { ...e, ...o };
}
Gt(dS, "mergeProps");
function fS(e) {
  var i, a;
  let n = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = n && "isReactWarning" in n && n.isReactWarning;
  return o ? e.ref : (n = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = n && "isReactWarning" in n && n.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
Gt(fS, "getElementRef");
function pS(e) {
  return b.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === cS;
}
Gt(pS, "isSlottable");
var XP = Symbol.for("react.lazy");
function fd(e) {
  return e != null && typeof e == "object" && "$$typeof" in e && e.$$typeof === XP && "_payload" in e && mS(e._payload);
}
Gt(fd, "isLazyComponent");
function mS(e) {
  return typeof e == "object" && e !== null && "then" in e;
}
Gt(mS, "isPromiseLike");
var ZP = /* @__PURE__ */ Gt((e) => `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`, "createSlotError"), JP = /* @__PURE__ */ Gt((e) => `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`, "createSlottableError"), na = Er[" use ".trim().toString()], qP = Object.defineProperty, eE = (e, n) => qP(e, "name", { value: n, configurable: !0 }), tE = [
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
], ko = tE.reduce((e, n) => {
  const o = /* @__PURE__ */ pf(`Primitive.${n}`), i = b.forwardRef((a, f) => {
    const { asChild: d, ...p } = a, m = d ? o : n;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ x.jsx(m, { ...p, ref: f });
  });
  return i.displayName = `Primitive.${n}`, { ...e, [n]: i };
}, {});
function hS(e, n) {
  e && uS.flushSync(() => e.dispatchEvent(n));
}
eE(hS, "dispatchDiscreteCustomEvent");
var nE = Object.defineProperty, rE = (e, n) => nE(e, "name", { value: n, configurable: !0 });
function vo(e) {
  const n = b.useRef(e);
  return b.useEffect(() => {
    n.current = e;
  }), b.useMemo(() => ((...o) => {
    var i;
    return (i = n.current) == null ? void 0 : i.call(n, ...o);
  }), []);
}
rE(vo, "useCallbackRef");
var oE = Object.defineProperty, Qe = (e, n) => oE(e, "name", { value: n, configurable: !0 }), pd = "dismissableLayer.update", iE = "dismissableLayer.pointerDownOutside", sE = "dismissableLayer.focusOutside", gg, yS = b.createContext({
  layers: /* @__PURE__ */ new Set(),
  layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
  branches: /* @__PURE__ */ new Set(),
  // Outside elements that belong to a layer's own dismiss affordance (eg, a
  // dialog overlay). Pressing them should dismiss the layer regardless of
  // whether or not they stop propagation.
  //
  // See https://github.com/radix-ui/primitives/issues/3346
  dismissableSurfaces: /* @__PURE__ */ new Set()
}), aE = /* @__PURE__ */ b.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Qe(function(n, o) {
    const {
      disableOutsidePointerEvents: i = !1,
      deferPointerDownOutside: a = !1,
      onEscapeKeyDown: f,
      onPointerDownOutside: d,
      onFocusOutside: p,
      onInteractOutside: m,
      onDismiss: y,
      ...S
    } = n, l = b.useContext(yS), [c, v] = b.useState(null), w = (c == null ? void 0 : c.ownerDocument) ?? (globalThis == null ? void 0 : globalThis.document), [, T] = b.useState({}), A = To(o, v), _ = Array.from(l.layers), [C] = [
      ...l.layersWithOutsidePointerEventsDisabled
    ].slice(-1), E = C ? _.indexOf(C) : -1, D = c ? _.indexOf(c) : -1, O = l.layersWithOutsidePointerEventsDisabled.size > 0, W = D >= E, H = b.useRef(!1), Y = vS(
      (Z) => {
        d == null || d(Z), m == null || m(Z), Z.defaultPrevented || y == null || y();
      },
      {
        ownerDocument: w,
        deferPointerDownOutside: a,
        isDeferredPointerDownOutsideRef: H,
        dismissableSurfaces: l.dismissableSurfaces,
        shouldHandlePointerDownOutside: b.useCallback(
          (Z) => {
            if (!(Z instanceof Node))
              return !1;
            const de = [...l.branches].some(
              (ce) => ce.contains(Z)
            );
            return W && !de;
          },
          [l.branches, W]
        )
      }
    ), L = SS((Z) => {
      if (a && H.current)
        return;
      const de = Z.target;
      [...l.branches].some((ye) => ye.contains(de)) || (p == null || p(Z), m == null || m(Z), Z.defaultPrevented || y == null || y());
    }, w), X = c ? D === _.length - 1 : !1, se = vo((Z) => {
      Z.key === "Escape" && (f == null || f(Z), !Z.defaultPrevented && y && (Z.preventDefault(), y()));
    });
    return b.useEffect(() => {
      if (X)
        return w.addEventListener("keydown", se, { capture: !0 }), () => w.removeEventListener("keydown", se, { capture: !0 });
    }, [w, X, se]), b.useEffect(() => {
      if (c)
        return i && (l.layersWithOutsidePointerEventsDisabled.size === 0 && (gg = w.body.style.pointerEvents, w.body.style.pointerEvents = "none"), l.layersWithOutsidePointerEventsDisabled.add(c)), l.layers.add(c), md(), () => {
          i && (l.layersWithOutsidePointerEventsDisabled.delete(c), l.layersWithOutsidePointerEventsDisabled.size === 0 && (w.body.style.pointerEvents = gg));
        };
    }, [c, w, i, l]), b.useEffect(() => () => {
      c && (l.layers.delete(c), l.layersWithOutsidePointerEventsDisabled.delete(c), md());
    }, [c, l]), b.useEffect(() => {
      const Z = /* @__PURE__ */ Qe(() => T({}), "handleUpdate");
      return document.addEventListener(pd, Z), () => document.removeEventListener(pd, Z);
    }, []), /* @__PURE__ */ x.jsx(
      ko.div,
      {
        ...S,
        ref: A,
        style: {
          pointerEvents: O ? W ? "auto" : "none" : void 0,
          ...n.style
        },
        onFocusCapture: Cr(n.onFocusCapture, L.onFocusCapture),
        onBlurCapture: Cr(n.onBlurCapture, L.onBlurCapture),
        onPointerDownCapture: Cr(
          n.onPointerDownCapture,
          Y.onPointerDownCapture
        )
      }
    );
  }, "DismissableLayer")
);
function gS() {
  const e = b.useContext(yS), [n, o] = b.useState(null);
  return b.useEffect(() => {
    if (n)
      return e.dismissableSurfaces.add(n), () => {
        e.dismissableSurfaces.delete(n);
      };
  }, [n, e.dismissableSurfaces]), o;
}
Qe(gS, "useDismissableLayerSurface");
var lE = /* @__PURE__ */ Qe(() => !0, "IS_TRUE");
function vS(e, n) {
  const {
    ownerDocument: o = globalThis == null ? void 0 : globalThis.document,
    deferPointerDownOutside: i = !1,
    isDeferredPointerDownOutsideRef: a,
    dismissableSurfaces: f,
    shouldHandlePointerDownOutside: d = lE
  } = n, p = vo(e), m = b.useRef(!1), y = b.useRef(!1), S = b.useRef(/* @__PURE__ */ new Map()), l = b.useRef(() => {
  });
  return b.useEffect(() => {
    function c() {
      y.current = !1, a.current = !1, S.current.clear();
    }
    Qe(c, "resetOutsideInteraction");
    function v() {
      return Array.from(S.current.values()).some(Boolean);
    }
    Qe(v, "isOutsideInteractionIntercepted");
    function w(E) {
      if (!y.current)
        return;
      const D = E.target;
      D instanceof Node && [...f].some((W) => W.contains(D)) || S.current.set(E.type, !0), E.type === "click" && window.setTimeout(() => {
        y.current && l.current();
      }, 0);
    }
    Qe(w, "handleInteractionCapture");
    function T(E) {
      y.current && S.current.set(E.type, !1);
    }
    Qe(T, "handleInteractionBubble");
    const A = /* @__PURE__ */ Qe((E) => {
      if (E.target && !m.current) {
        let D = function() {
          o.removeEventListener("click", l.current);
          const W = v();
          c(), W || mf(
            iE,
            p,
            O,
            { discrete: !0 }
          );
        };
        if (Qe(D, "handleAndDispatchPointerDownOutsideEvent"), !d(E.target)) {
          o.removeEventListener("click", l.current), c(), m.current = !1;
          return;
        }
        const O = { originalEvent: E };
        y.current = !0, a.current = i && E.button === 0, S.current.clear(), !i || E.button !== 0 ? D() : (o.removeEventListener("click", l.current), l.current = D, o.addEventListener("click", l.current, { once: !0 }));
      } else
        o.removeEventListener("click", l.current), c();
      m.current = !1;
    }, "handlePointerDown"), _ = [
      "pointerup",
      "mousedown",
      "mouseup",
      "touchstart",
      "touchend",
      "click"
    ];
    for (const E of _)
      o.addEventListener(E, w, !0), o.addEventListener(E, T);
    const C = window.setTimeout(() => {
      o.addEventListener("pointerdown", A);
    }, 0);
    return () => {
      window.clearTimeout(C), o.removeEventListener("pointerdown", A), o.removeEventListener("click", l.current);
      for (const E of _)
        o.removeEventListener(E, w, !0), o.removeEventListener(E, T);
    };
  }, [
    o,
    p,
    i,
    a,
    f,
    d
  ]), {
    // ensures we check React component tree (not just DOM tree)
    onPointerDownCapture: /* @__PURE__ */ Qe(() => m.current = !0, "onPointerDownCapture")
  };
}
Qe(vS, "usePointerDownOutside");
function SS(e, n = globalThis == null ? void 0 : globalThis.document) {
  const o = vo(e), i = b.useRef(!1);
  return b.useEffect(() => {
    const a = /* @__PURE__ */ Qe((f) => {
      f.target && !i.current && mf(sE, o, { originalEvent: f }, {
        discrete: !1
      });
    }, "handleFocus");
    return n.addEventListener("focusin", a), () => n.removeEventListener("focusin", a);
  }, [n, o]), {
    onFocusCapture: /* @__PURE__ */ Qe(() => i.current = !0, "onFocusCapture"),
    onBlurCapture: /* @__PURE__ */ Qe(() => i.current = !1, "onBlurCapture")
  };
}
Qe(SS, "useFocusOutside");
function md() {
  const e = new CustomEvent(pd);
  document.dispatchEvent(e);
}
Qe(md, "dispatchUpdate");
function mf(e, n, o, { discrete: i }) {
  const a = o.originalEvent.target, f = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: o });
  n && a.addEventListener(e, n, { once: !0 }), i ? hS(a, f) : a.dispatchEvent(f);
}
Qe(mf, "handleAndDispatchCustomEvent");
var uE = Object.defineProperty, ct = (e, n) => uE(e, "name", { value: n, configurable: !0 }), gc = "focusScope.autoFocusOnMount", vc = "focusScope.autoFocusOnUnmount", vg = { bubbles: !1, cancelable: !0 }, cE = /* @__PURE__ */ b.forwardRef(
  /* @__PURE__ */ ct(function(n, o) {
    const {
      loop: i = !1,
      trapped: a = !1,
      onMountAutoFocus: f,
      onUnmountAutoFocus: d,
      ...p
    } = n, [m, y] = b.useState(null), S = vo(f), l = vo(d), c = b.useRef(null), v = To(o, y), w = b.useRef({
      paused: !1,
      pause() {
        this.paused = !0;
      },
      resume() {
        this.paused = !1;
      }
    }).current;
    b.useEffect(() => {
      if (a) {
        let A = function(D) {
          if (w.paused || !m) return;
          const O = D.target;
          m.contains(O) ? c.current = O : yn(c.current, { select: !0 });
        }, _ = function(D) {
          if (w.paused || !m) return;
          const O = D.relatedTarget;
          O !== null && (m.contains(O) || yn(c.current, { select: !0 }));
        }, C = function(D) {
          if (document.activeElement === document.body)
            for (const W of D)
              W.removedNodes.length > 0 && yn(m);
        };
        ct(A, "handleFocusIn"), ct(_, "handleFocusOut"), ct(C, "handleMutations"), document.addEventListener("focusin", A), document.addEventListener("focusout", _);
        const E = new MutationObserver(C);
        return m && E.observe(m, { childList: !0, subtree: !0 }), () => {
          document.removeEventListener("focusin", A), document.removeEventListener("focusout", _), E.disconnect();
        };
      }
    }, [a, m, w.paused]), b.useEffect(() => {
      if (m) {
        Sg.add(w);
        const A = document.activeElement;
        if (!m.contains(A)) {
          const C = new CustomEvent(gc, vg);
          m.addEventListener(gc, S), m.dispatchEvent(C), C.defaultPrevented || (wS(AS(hf(m)), { select: !0 }), document.activeElement === A && yn(m));
        }
        return () => {
          m.removeEventListener(gc, S), setTimeout(() => {
            const C = new CustomEvent(vc, vg);
            m.addEventListener(vc, l), m.dispatchEvent(C), C.defaultPrevented || yn(A ?? document.body, { select: !0 }), m.removeEventListener(vc, l), Sg.remove(w);
          }, 0);
        };
      }
    }, [m, S, l, w]);
    const T = b.useCallback(
      (A) => {
        if (!i && !a || w.paused) return;
        const _ = A.key === "Tab" && !A.altKey && !A.ctrlKey && !A.metaKey, C = document.activeElement;
        if (_ && C) {
          const E = A.currentTarget, [D, O] = xS(E);
          D && O ? !A.shiftKey && C === O ? (A.preventDefault(), i && yn(D, { select: !0 })) : A.shiftKey && C === D && (A.preventDefault(), i && yn(O, { select: !0 })) : C === E && A.preventDefault();
        }
      },
      [i, a, w.paused]
    );
    return /* @__PURE__ */ x.jsx(ko.div, { tabIndex: -1, ...p, ref: v, onKeyDown: T });
  }, "FocusScope")
);
function wS(e, { select: n = !1 } = {}) {
  const o = document.activeElement;
  for (const i of e)
    if (yn(i, { select: n }), document.activeElement !== o) return;
}
ct(wS, "focusFirst");
function xS(e) {
  const n = hf(e), o = hd(n, e), i = hd(n.reverse(), e);
  return [o, i];
}
ct(xS, "getTabbableEdges");
function hf(e) {
  const n = [], o = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
    acceptNode: /* @__PURE__ */ ct((i) => {
      const a = i.tagName === "INPUT" && i.type === "hidden";
      return i.disabled || i.hidden || a ? NodeFilter.FILTER_SKIP : i.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }, "acceptNode")
  });
  for (; o.nextNode(); ) n.push(o.currentNode);
  return n;
}
ct(hf, "getTabbableCandidates");
function hd(e, n) {
  const o = typeof n.checkVisibility == "function" && n.checkVisibility({ checkVisibilityCSS: !0 });
  for (const i of e)
    if (!(o ? !i.checkVisibility({ checkVisibilityCSS: !0 }) : _S(i, { upTo: n })))
      return i;
}
ct(hd, "findVisible");
function _S(e, { upTo: n }) {
  if (getComputedStyle(e).visibility === "hidden") return !0;
  for (; e; ) {
    if (n !== void 0 && e === n) return !1;
    if (getComputedStyle(e).display === "none") return !0;
    e = e.parentElement;
  }
  return !1;
}
ct(_S, "isHidden");
function TS(e) {
  return e instanceof HTMLInputElement && "select" in e;
}
ct(TS, "isSelectableInput");
function yn(e, { select: n = !1 } = {}) {
  if (e && e.focus) {
    const o = document.activeElement;
    e.focus({ preventScroll: !0 }), e !== o && TS(e) && n && e.select();
  }
}
ct(yn, "focus");
var Sg = kS();
function kS() {
  let e = [];
  return {
    add(n) {
      const o = e[0];
      n !== o && (o == null || o.pause()), e = yd(e, n), e.unshift(n);
    },
    remove(n) {
      var o;
      e = yd(e, n), (o = e[0]) == null || o.resume();
    }
  };
}
ct(kS, "createFocusScopesStack");
function yd(e, n) {
  const o = [...e], i = o.indexOf(n);
  return i !== -1 && o.splice(i, 1), o;
}
ct(yd, "arrayRemove");
function AS(e) {
  return e.filter((n) => n.tagName !== "A");
}
ct(AS, "removeLinks");
var dE = Object.defineProperty, fE = (e, n) => dE(e, "name", { value: n, configurable: !0 }), pE = /* @__PURE__ */ b.forwardRef(
  /* @__PURE__ */ fE(function(n, o) {
    var m;
    const { container: i, ...a } = n, [f, d] = b.useState(!1);
    Jn(() => d(!0), []);
    const p = i || f && ((m = globalThis == null ? void 0 : globalThis.document) == null ? void 0 : m.body);
    return p ? uS.createPortal(/* @__PURE__ */ x.jsx(ko.div, { ...a, ref: o }), p) : null;
  }, "Portal")
), mE = Object.defineProperty, wn = (e, n) => mE(e, "name", { value: n, configurable: !0 });
function bS(e, n) {
  return b.useReducer((o, i) => n[o][i] ?? o, e);
}
wn(bS, "useStateMachine");
var yf = /* @__PURE__ */ wn((e) => {
  const { present: n, children: o } = e, i = CS(n), a = typeof o == "function" ? o({ present: i.isPresent }) : b.Children.only(o), f = PS(i.ref, ES(a));
  return typeof o == "function" || i.isPresent ? b.cloneElement(a, { ref: f }) : null;
}, "Presence");
function CS(e) {
  const [n, o] = b.useState(), i = b.useRef(null), a = b.useRef(e), f = b.useRef("none"), d = b.useRef(void 0), p = e ? "mounted" : "unmounted", [m, y] = bS(p, {
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
  return b.useEffect(() => {
    m === "mounted" ? (f.current = d.current ?? ao(i.current), d.current = void 0) : f.current = "none";
  }, [m]), Jn(() => {
    const S = i.current, l = a.current;
    if (l !== e) {
      const v = f.current, w = ao(S);
      e ? (d.current = w, y("MOUNT")) : w === "none" || (S == null ? void 0 : S.display) === "none" ? y("UNMOUNT") : y(l && v !== w ? "ANIMATION_OUT" : "UNMOUNT"), a.current = e;
    }
  }, [e, y]), Jn(() => {
    if (n) {
      let S;
      const l = n.ownerDocument.defaultView ?? window, c = /* @__PURE__ */ wn((w) => {
        const A = ao(i.current).includes(CSS.escape(w.animationName));
        if (w.target === n && A && (y("ANIMATION_END"), !a.current)) {
          const _ = n.style.animationFillMode;
          n.style.animationFillMode = "forwards", S = l.setTimeout(() => {
            n.style.animationFillMode === "forwards" && (n.style.animationFillMode = _);
          });
        }
      }, "handleAnimationEnd"), v = /* @__PURE__ */ wn((w) => {
        w.target === n && (f.current = ao(i.current));
      }, "handleAnimationStart");
      return n.addEventListener("animationstart", v), n.addEventListener("animationcancel", c), n.addEventListener("animationend", c), () => {
        l.clearTimeout(S), n.removeEventListener("animationstart", v), n.removeEventListener("animationcancel", c), n.removeEventListener("animationend", c);
      };
    } else
      y("ANIMATION_END");
  }, [n, y]), {
    isPresent: ["mounted", "unmountSuspended"].includes(m),
    ref: b.useCallback((S) => {
      if (S) {
        const l = getComputedStyle(S);
        i.current = l, d.current = ao(l);
      } else
        i.current = null;
      o(S);
    }, [])
  };
}
wn(CS, "usePresence");
function gd(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
wn(gd, "setRef");
function PS(...e) {
  const n = b.useRef(e);
  return n.current = e, b.useCallback((o) => {
    const i = n.current;
    let a = !1;
    const f = i.map((d) => {
      const p = gd(d, o);
      return !a && typeof p == "function" && (a = !0), p;
    });
    if (a)
      return () => {
        for (let d = 0; d < f.length; d++) {
          const p = f[d];
          typeof p == "function" ? p() : gd(i[d], null);
        }
      };
  }, []);
}
wn(PS, "useStableComposedRefs");
function ao(e) {
  return (e == null ? void 0 : e.animationName) || "none";
}
wn(ao, "getAnimationName");
function ES(e) {
  var i, a;
  let n = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = n && "isReactWarning" in n && n.isReactWarning;
  return o ? e.ref : (n = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = n && "isReactWarning" in n && n.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
wn(ES, "getElementRef");
var hE = Object.defineProperty, gf = (e, n) => hE(e, "name", { value: n, configurable: !0 }), ra = 0, qt = null;
function yE(e) {
  return vf(), e.children;
}
gf(yE, "FocusGuards");
function vf() {
  b.useEffect(() => {
    qt || (qt = { start: vd(), end: vd() });
    const { start: e, end: n } = qt;
    return document.body.firstElementChild !== e && document.body.insertAdjacentElement("afterbegin", e), document.body.lastElementChild !== n && document.body.insertAdjacentElement("beforeend", n), ra++, () => {
      ra === 1 && (qt == null || qt.start.remove(), qt == null || qt.end.remove(), qt = null), ra = Math.max(0, ra - 1);
    };
  }, []);
}
gf(vf, "useFocusGuards");
function vd() {
  const e = document.createElement("span");
  return e.setAttribute("data-radix-focus-guard", ""), e.tabIndex = 0, e.style.outline = "none", e.style.opacity = "0", e.style.position = "fixed", e.style.pointerEvents = "none", e;
}
gf(vd, "createFocusGuard");
var nn = function() {
  return nn = Object.assign || function(n) {
    for (var o, i = 1, a = arguments.length; i < a; i++) {
      o = arguments[i];
      for (var f in o) Object.prototype.hasOwnProperty.call(o, f) && (n[f] = o[f]);
    }
    return n;
  }, nn.apply(this, arguments);
};
function MS(e, n) {
  var o = {};
  for (var i in e) Object.prototype.hasOwnProperty.call(e, i) && n.indexOf(i) < 0 && (o[i] = e[i]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var a = 0, i = Object.getOwnPropertySymbols(e); a < i.length; a++)
      n.indexOf(i[a]) < 0 && Object.prototype.propertyIsEnumerable.call(e, i[a]) && (o[i[a]] = e[i[a]]);
  return o;
}
function gE(e, n, o) {
  if (o || arguments.length === 2) for (var i = 0, a = n.length, f; i < a; i++)
    (f || !(i in n)) && (f || (f = Array.prototype.slice.call(n, 0, i)), f[i] = n[i]);
  return e.concat(f || Array.prototype.slice.call(n));
}
var xa = "right-scroll-bar-position", _a = "width-before-scroll-bar", vE = "with-scroll-bars-hidden", SE = "--removed-body-scroll-bar-size";
function Sc(e, n) {
  return typeof e == "function" ? e(n) : e && (e.current = n), e;
}
function wE(e, n) {
  var o = b.useState(function() {
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
var xE = typeof window < "u" ? b.useLayoutEffect : b.useEffect, wg = /* @__PURE__ */ new WeakMap();
function _E(e, n) {
  var o = wE(null, function(i) {
    return e.forEach(function(a) {
      return Sc(a, i);
    });
  });
  return xE(function() {
    var i = wg.get(o);
    if (i) {
      var a = new Set(i), f = new Set(e), d = o.current;
      a.forEach(function(p) {
        f.has(p) || Sc(p, null);
      }), f.forEach(function(p) {
        a.has(p) || Sc(p, d);
      });
    }
    wg.set(o, e);
  }, [e]), o;
}
function TE(e) {
  return e;
}
function kE(e, n) {
  n === void 0 && (n = TE);
  var o = [], i = !1, a = {
    read: function() {
      if (i)
        throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");
      return o.length ? o[o.length - 1] : e;
    },
    useMedium: function(f) {
      var d = n(f, i);
      return o.push(d), function() {
        o = o.filter(function(p) {
          return p !== d;
        });
      };
    },
    assignSyncMedium: function(f) {
      for (i = !0; o.length; ) {
        var d = o;
        o = [], d.forEach(f);
      }
      o = {
        push: function(p) {
          return f(p);
        },
        filter: function() {
          return o;
        }
      };
    },
    assignMedium: function(f) {
      i = !0;
      var d = [];
      if (o.length) {
        var p = o;
        o = [], p.forEach(f), d = o;
      }
      var m = function() {
        var S = d;
        d = [], S.forEach(f);
      }, y = function() {
        return Promise.resolve().then(m);
      };
      y(), o = {
        push: function(S) {
          d.push(S), y();
        },
        filter: function(S) {
          return d = d.filter(S), o;
        }
      };
    }
  };
  return a;
}
function AE(e) {
  e === void 0 && (e = {});
  var n = kE(null);
  return n.options = nn({ async: !0, ssr: !1 }, e), n;
}
var RS = function(e) {
  var n = e.sideCar, o = MS(e, ["sideCar"]);
  if (!n)
    throw new Error("Sidecar: please provide `sideCar` property to import the right car");
  var i = n.read();
  if (!i)
    throw new Error("Sidecar medium not found");
  return b.createElement(i, nn({}, o));
};
RS.isSideCarExport = !0;
function bE(e, n) {
  return e.useMedium(n), RS;
}
var DS = AE(), wc = function() {
}, qa = b.forwardRef(function(e, n) {
  var o = b.useRef(null), i = b.useState({
    onScrollCapture: wc,
    onWheelCapture: wc,
    onTouchMoveCapture: wc
  }), a = i[0], f = i[1], d = e.forwardProps, p = e.children, m = e.className, y = e.removeScrollBar, S = e.enabled, l = e.shards, c = e.sideCar, v = e.noRelative, w = e.noIsolation, T = e.inert, A = e.allowPinchZoom, _ = e.as, C = _ === void 0 ? "div" : _, E = e.gapMode, D = MS(e, ["forwardProps", "children", "className", "removeScrollBar", "enabled", "shards", "sideCar", "noRelative", "noIsolation", "inert", "allowPinchZoom", "as", "gapMode"]), O = c, W = _E([o, n]), H = nn(nn({}, D), a);
  return b.createElement(
    b.Fragment,
    null,
    S && b.createElement(O, { sideCar: DS, removeScrollBar: y, shards: l, noRelative: v, noIsolation: w, inert: T, setCallbacks: f, allowPinchZoom: !!A, lockRef: o, gapMode: E }),
    d ? b.cloneElement(b.Children.only(p), nn(nn({}, H), { ref: W })) : b.createElement(C, nn({}, H, { className: m, ref: W }), p)
  );
});
qa.defaultProps = {
  enabled: !0,
  removeScrollBar: !0,
  inert: !1
};
qa.classNames = {
  fullWidth: _a,
  zeroRight: xa
};
var CE = function() {
  if (typeof __webpack_nonce__ < "u")
    return __webpack_nonce__;
};
function PE() {
  if (!document)
    return null;
  var e = document.createElement("style");
  e.type = "text/css";
  var n = CE();
  return n && e.setAttribute("nonce", n), e;
}
function EE(e, n) {
  e.styleSheet ? e.styleSheet.cssText = n : e.appendChild(document.createTextNode(n));
}
function ME(e) {
  var n = document.head || document.getElementsByTagName("head")[0];
  n.appendChild(e);
}
var RE = function() {
  var e = 0, n = null;
  return {
    add: function(o) {
      e == 0 && (n = PE()) && (EE(n, o), ME(n)), e++;
    },
    remove: function() {
      e--, !e && n && (n.parentNode && n.parentNode.removeChild(n), n = null);
    }
  };
}, DE = function() {
  var e = RE();
  return function(n, o) {
    b.useEffect(function() {
      return e.add(n), function() {
        e.remove();
      };
    }, [n && o]);
  };
}, NS = function() {
  var e = DE(), n = function(o) {
    var i = o.styles, a = o.dynamic;
    return e(i, a), null;
  };
  return n;
}, NE = {
  left: 0,
  top: 0,
  right: 0,
  gap: 0
}, xc = function(e) {
  return parseInt(e || "", 10) || 0;
}, jE = function(e) {
  var n = window.getComputedStyle(document.body), o = n[e === "padding" ? "paddingLeft" : "marginLeft"], i = n[e === "padding" ? "paddingTop" : "marginTop"], a = n[e === "padding" ? "paddingRight" : "marginRight"];
  return [xc(o), xc(i), xc(a)];
}, IE = function(e) {
  if (e === void 0 && (e = "margin"), typeof window > "u")
    return NE;
  var n = jE(e), o = document.documentElement.clientWidth, i = window.innerWidth;
  return {
    left: n[0],
    top: n[1],
    right: n[2],
    gap: Math.max(0, i - o + n[2] - n[0])
  };
}, FE = NS(), mo = "data-scroll-locked", OE = function(e, n, o, i) {
  var a = e.left, f = e.top, d = e.right, p = e.gap;
  return o === void 0 && (o = "margin"), `
  .`.concat(vE, ` {
   overflow: hidden `).concat(i, `;
   padding-right: `).concat(p, "px ").concat(i, `;
  }
  body[`).concat(mo, `] {
    overflow: hidden `).concat(i, `;
    overscroll-behavior: contain;
    `).concat([
    n && "position: relative ".concat(i, ";"),
    o === "margin" && `
    padding-left: `.concat(a, `px;
    padding-top: `).concat(f, `px;
    padding-right: `).concat(d, `px;
    margin-left:0;
    margin-top:0;
    margin-right: `).concat(p, "px ").concat(i, `;
    `),
    o === "padding" && "padding-right: ".concat(p, "px ").concat(i, ";")
  ].filter(Boolean).join(""), `
  }
  
  .`).concat(xa, ` {
    right: `).concat(p, "px ").concat(i, `;
  }
  
  .`).concat(_a, ` {
    margin-right: `).concat(p, "px ").concat(i, `;
  }
  
  .`).concat(xa, " .").concat(xa, ` {
    right: 0 `).concat(i, `;
  }
  
  .`).concat(_a, " .").concat(_a, ` {
    margin-right: 0 `).concat(i, `;
  }
  
  body[`).concat(mo, `] {
    `).concat(SE, ": ").concat(p, `px;
  }
`);
}, xg = function() {
  var e = parseInt(document.body.getAttribute(mo) || "0", 10);
  return isFinite(e) ? e : 0;
}, LE = function() {
  b.useEffect(function() {
    return document.body.setAttribute(mo, (xg() + 1).toString()), function() {
      var e = xg() - 1;
      e <= 0 ? document.body.removeAttribute(mo) : document.body.setAttribute(mo, e.toString());
    };
  }, []);
}, VE = function(e) {
  var n = e.noRelative, o = e.noImportant, i = e.gapMode, a = i === void 0 ? "margin" : i;
  LE();
  var f = b.useMemo(function() {
    return IE(a);
  }, [a]);
  return b.createElement(FE, { styles: OE(f, !n, a, o ? "" : "!important") });
}, Sd = !1;
if (typeof window < "u")
  try {
    var oa = Object.defineProperty({}, "passive", {
      get: function() {
        return Sd = !0, !0;
      }
    });
    window.addEventListener("test", oa, oa), window.removeEventListener("test", oa, oa);
  } catch {
    Sd = !1;
  }
var ro = Sd ? { passive: !1 } : !1, zE = function(e) {
  return e.tagName === "TEXTAREA";
}, jS = function(e, n) {
  if (!(e instanceof Element))
    return !1;
  var o = window.getComputedStyle(e);
  return (
    // not-not-scrollable
    o[n] !== "hidden" && // contains scroll inside self
    !(o.overflowY === o.overflowX && !zE(e) && o[n] === "visible")
  );
}, BE = function(e) {
  return jS(e, "overflowY");
}, $E = function(e) {
  return jS(e, "overflowX");
}, _g = function(e, n) {
  var o = n.ownerDocument, i = n;
  do {
    typeof ShadowRoot < "u" && i instanceof ShadowRoot && (i = i.host);
    var a = IS(e, i);
    if (a) {
      var f = FS(e, i), d = f[1], p = f[2];
      if (d > p)
        return !0;
    }
    i = i.parentNode;
  } while (i && i !== o.body);
  return !1;
}, UE = function(e) {
  var n = e.scrollTop, o = e.scrollHeight, i = e.clientHeight;
  return [
    n,
    o,
    i
  ];
}, HE = function(e) {
  var n = e.scrollLeft, o = e.scrollWidth, i = e.clientWidth;
  return [
    n,
    o,
    i
  ];
}, IS = function(e, n) {
  return e === "v" ? BE(n) : $E(n);
}, FS = function(e, n) {
  return e === "v" ? UE(n) : HE(n);
}, WE = function(e, n) {
  return e === "h" && n === "rtl" ? -1 : 1;
}, GE = function(e, n, o, i, a) {
  var f = WE(e, window.getComputedStyle(n).direction), d = f * i, p = o.target, m = n.contains(p), y = !1, S = d > 0, l = 0, c = 0;
  do {
    if (!p)
      break;
    var v = FS(e, p), w = v[0], T = v[1], A = v[2], _ = T - A - f * w;
    (w || _) && IS(e, p) && (l += _, c += w);
    var C = p.parentNode;
    p = C && C.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? C.host : C;
  } while (
    // portaled content
    !m && p !== document.body || // self content
    m && (n.contains(p) || n === p)
  );
  return (S && Math.abs(l) < 1 || !S && Math.abs(c) < 1) && (y = !0), y;
}, ia = function(e) {
  return "changedTouches" in e ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY] : [0, 0];
}, Tg = function(e) {
  return [e.deltaX, e.deltaY];
}, kg = function(e) {
  return e && "current" in e ? e.current : e;
}, KE = function(e, n) {
  return e[0] === n[0] && e[1] === n[1];
}, YE = function(e) {
  return `
  .block-interactivity-`.concat(e, ` {pointer-events: none;}
  .allow-interactivity-`).concat(e, ` {pointer-events: all;}
`);
}, QE = 0, oo = [];
function XE(e) {
  var n = b.useRef([]), o = b.useRef([0, 0]), i = b.useRef(), a = b.useState(QE++)[0], f = b.useState(NS)[0], d = b.useRef(e);
  b.useEffect(function() {
    d.current = e;
  }, [e]), b.useEffect(function() {
    if (e.inert) {
      document.body.classList.add("block-interactivity-".concat(a));
      var T = gE([e.lockRef.current], (e.shards || []).map(kg), !0).filter(Boolean);
      return T.forEach(function(A) {
        return A.classList.add("allow-interactivity-".concat(a));
      }), function() {
        document.body.classList.remove("block-interactivity-".concat(a)), T.forEach(function(A) {
          return A.classList.remove("allow-interactivity-".concat(a));
        });
      };
    }
  }, [e.inert, e.lockRef.current, e.shards]);
  var p = b.useCallback(function(T, A) {
    if ("touches" in T && T.touches.length === 2 || T.type === "wheel" && T.ctrlKey)
      return !d.current.allowPinchZoom;
    var _ = ia(T), C = o.current, E = "deltaX" in T ? T.deltaX : C[0] - _[0], D = "deltaY" in T ? T.deltaY : C[1] - _[1], O, W = T.target, H = Math.abs(E) > Math.abs(D) ? "h" : "v";
    if ("touches" in T && H === "h" && W.type === "range")
      return !1;
    var Y = window.getSelection(), L = Y && Y.anchorNode, X = L ? L === W || L.contains(W) : !1;
    if (X)
      return !1;
    var se = _g(H, W);
    if (!se)
      return !0;
    if (se ? O = H : (O = H === "v" ? "h" : "v", se = _g(H, W)), !se)
      return !1;
    if (!i.current && "changedTouches" in T && (E || D) && (i.current = O), !O)
      return !0;
    var Z = i.current || O;
    return GE(Z, A, T, Z === "h" ? E : D);
  }, []), m = b.useCallback(function(T) {
    var A = T;
    if (!(!oo.length || oo[oo.length - 1] !== f)) {
      var _ = "deltaY" in A ? Tg(A) : ia(A), C = n.current.filter(function(O) {
        return O.name === A.type && (O.target === A.target || A.target === O.shadowParent) && KE(O.delta, _);
      })[0];
      if (C && C.should) {
        A.cancelable && A.preventDefault();
        return;
      }
      if (!C) {
        var E = (d.current.shards || []).map(kg).filter(Boolean).filter(function(O) {
          return O.contains(A.target);
        }), D = E.length > 0 ? p(A, E[0]) : !d.current.noIsolation;
        D && A.cancelable && A.preventDefault();
      }
    }
  }, []), y = b.useCallback(function(T, A, _, C) {
    var E = { name: T, delta: A, target: _, should: C, shadowParent: ZE(_) };
    n.current.push(E), setTimeout(function() {
      n.current = n.current.filter(function(D) {
        return D !== E;
      });
    }, 1);
  }, []), S = b.useCallback(function(T) {
    o.current = ia(T), i.current = void 0;
  }, []), l = b.useCallback(function(T) {
    y(T.type, Tg(T), T.target, p(T, e.lockRef.current));
  }, []), c = b.useCallback(function(T) {
    y(T.type, ia(T), T.target, p(T, e.lockRef.current));
  }, []);
  b.useEffect(function() {
    return oo.push(f), e.setCallbacks({
      onScrollCapture: l,
      onWheelCapture: l,
      onTouchMoveCapture: c
    }), document.addEventListener("wheel", m, ro), document.addEventListener("touchmove", m, ro), document.addEventListener("touchstart", S, ro), function() {
      oo = oo.filter(function(T) {
        return T !== f;
      }), document.removeEventListener("wheel", m, ro), document.removeEventListener("touchmove", m, ro), document.removeEventListener("touchstart", S, ro);
    };
  }, []);
  var v = e.removeScrollBar, w = e.inert;
  return b.createElement(
    b.Fragment,
    null,
    w ? b.createElement(f, { styles: YE(a) }) : null,
    v ? b.createElement(VE, { noRelative: e.noRelative, gapMode: e.gapMode }) : null
  );
}
function ZE(e) {
  for (var n = null; e !== null; )
    e instanceof ShadowRoot && (n = e.host, e = e.host), e = e.parentNode;
  return n;
}
const JE = bE(DS, XE);
var OS = b.forwardRef(function(e, n) {
  return b.createElement(qa, nn({}, e, { ref: n, sideCar: JE }));
});
OS.classNames = qa.classNames;
var qE = function(e) {
  if (typeof document > "u")
    return null;
  var n = Array.isArray(e) ? e[0] : e;
  return n.ownerDocument.body;
}, io = /* @__PURE__ */ new WeakMap(), sa = /* @__PURE__ */ new WeakMap(), aa = {}, _c = 0, LS = function(e) {
  return e && (e.host || LS(e.parentNode));
}, eM = function(e, n) {
  return n.map(function(o) {
    if (e.contains(o))
      return o;
    var i = LS(o);
    return i && e.contains(i) ? i : (console.error("aria-hidden", o, "in not contained inside", e, ". Doing nothing"), null);
  }).filter(function(o) {
    return !!o;
  });
}, tM = function(e, n, o, i) {
  var a = eM(n, Array.isArray(e) ? e : [e]);
  aa[o] || (aa[o] = /* @__PURE__ */ new WeakMap());
  var f = aa[o], d = [], p = /* @__PURE__ */ new Set(), m = new Set(a), y = function(l) {
    !l || p.has(l) || (p.add(l), y(l.parentNode));
  };
  a.forEach(y);
  var S = function(l) {
    !l || m.has(l) || Array.prototype.forEach.call(l.children, function(c) {
      if (p.has(c))
        S(c);
      else
        try {
          var v = c.getAttribute(i), w = v !== null && v !== "false", T = (io.get(c) || 0) + 1, A = (f.get(c) || 0) + 1;
          io.set(c, T), f.set(c, A), d.push(c), T === 1 && w && sa.set(c, !0), A === 1 && c.setAttribute(o, "true"), w || c.setAttribute(i, "true");
        } catch (_) {
          console.error("aria-hidden: cannot operate on ", c, _);
        }
    });
  };
  return S(n), p.clear(), _c++, function() {
    d.forEach(function(l) {
      var c = io.get(l) - 1, v = f.get(l) - 1;
      io.set(l, c), f.set(l, v), c || (sa.has(l) || l.removeAttribute(i), sa.delete(l)), v || l.removeAttribute(o);
    }), _c--, _c || (io = /* @__PURE__ */ new WeakMap(), io = /* @__PURE__ */ new WeakMap(), sa = /* @__PURE__ */ new WeakMap(), aa = {});
  };
}, nM = function(e, n, o) {
  o === void 0 && (o = "data-aria-hidden");
  var i = Array.from(Array.isArray(e) ? e : [e]), a = qE(e);
  return a ? (i.push.apply(i, Array.from(a.querySelectorAll("[aria-live], script"))), tM(i, a, o, "aria-hidden")) : function() {
    return null;
  };
}, rM = Object.defineProperty, Kt = (e, n) => rM(e, "name", { value: n, configurable: !0 }), Sf = "Dialog", [VS, nD] = /* @__PURE__ */ rS(Sf), [oM, xn] = VS(Sf), iM = /* @__PURE__ */ Kt((e) => {
  const {
    __scopeDialog: n,
    children: o,
    open: i,
    defaultOpen: a,
    onOpenChange: f,
    modal: d = !0
  } = e, p = b.useRef(null), m = b.useRef(null), [y, S] = sS({
    prop: i,
    defaultProp: a ?? !1,
    onChange: f,
    caller: Sf
  }), [l, c] = b.useState(0), [v, w] = b.useState(0);
  return /* @__PURE__ */ x.jsx(
    oM,
    {
      scope: n,
      triggerRef: p,
      contentRef: m,
      contentId: wa(),
      titleId: wa(),
      descriptionId: wa(),
      titlePresent: l > 0,
      descriptionPresent: v > 0,
      setTitleCount: c,
      setDescriptionCount: w,
      open: y,
      onOpenChange: S,
      onOpenToggle: b.useCallback(() => S((T) => !T), [S]),
      modal: d,
      children: o
    }
  );
}, "Dialog"), zS = "DialogPortal", [sM, BS] = VS(zS, {
  forceMount: void 0
}), aM = /* @__PURE__ */ Kt((e) => {
  const { __scopeDialog: n, forceMount: o, children: i, container: a } = e, f = xn(zS, n);
  return /* @__PURE__ */ x.jsx(sM, { scope: n, forceMount: o, children: b.Children.map(i, (d) => /* @__PURE__ */ x.jsx(yf, { present: o || f.open, children: /* @__PURE__ */ x.jsx(pE, { asChild: !0, container: a, children: d }) })) });
}, "DialogPortal"), wd = "DialogOverlay", lM = /* @__PURE__ */ b.forwardRef(
  /* @__PURE__ */ Kt(function(n, o) {
    const i = BS(wd, n.__scopeDialog), { forceMount: a = i.forceMount, ...f } = n, d = xn(wd, n.__scopeDialog);
    return d.modal ? /* @__PURE__ */ x.jsx(yf, { present: a || d.open, children: /* @__PURE__ */ x.jsx(cM, { ...f, ref: o }) }) : null;
  }, "DialogOverlay")
), uM = /* @__PURE__ */ pf("DialogOverlay.RemoveScroll"), cM = /* @__PURE__ */ b.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Kt(function(n, o) {
    const { __scopeDialog: i, ...a } = n, f = xn(wd, i), d = gS(), p = To(o, d);
    return (
      // Make sure `Content` is scrollable even when it doesn't live inside `RemoveScroll`
      // ie. when `Overlay` and `Content` are siblings
      /* @__PURE__ */ x.jsx(OS, { as: uM, allowPinchZoom: !0, shards: [f.contentRef], children: /* @__PURE__ */ x.jsx(
        ko.div,
        {
          "data-state": wf(f.open),
          ...a,
          ref: p,
          style: { pointerEvents: "auto", ...a.style }
        }
      ) })
    );
  }, "DialogOverlayImpl")
), Pi = "DialogContent", dM = /* @__PURE__ */ b.forwardRef(
  /* @__PURE__ */ Kt(function(n, o) {
    const i = BS(Pi, n.__scopeDialog), { forceMount: a = i.forceMount, ...f } = n, d = xn(Pi, n.__scopeDialog);
    return /* @__PURE__ */ x.jsx(yf, { present: a || d.open, children: d.modal ? /* @__PURE__ */ x.jsx(fM, { ...f, ref: o }) : /* @__PURE__ */ x.jsx(pM, { ...f, ref: o }) });
  }, "DialogContent")
), fM = /* @__PURE__ */ b.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Kt(function(n, o) {
    const i = xn(Pi, n.__scopeDialog), a = b.useRef(null), f = To(o, i.contentRef, a);
    return b.useEffect(() => {
      const d = a.current;
      if (d) return nM(d);
    }, []), /* @__PURE__ */ x.jsx(
      $S,
      {
        ...n,
        ref: f,
        trapFocus: i.open,
        disableOutsidePointerEvents: i.open,
        onCloseAutoFocus: Cr(n.onCloseAutoFocus, (d) => {
          var p;
          d.preventDefault(), (p = i.triggerRef.current) == null || p.focus();
        }),
        onPointerDownOutside: Cr(n.onPointerDownOutside, (d) => {
          const p = d.detail.originalEvent, m = p.button === 0 && p.ctrlKey === !0;
          (p.button === 2 || m) && d.preventDefault();
        }),
        onFocusOutside: Cr(
          n.onFocusOutside,
          (d) => d.preventDefault()
        )
      }
    );
  }, "DialogContentModal")
), pM = /* @__PURE__ */ b.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Kt(function(n, o) {
    const i = xn(Pi, n.__scopeDialog), a = b.useRef(!1), f = b.useRef(!1);
    return /* @__PURE__ */ x.jsx(
      $S,
      {
        ...n,
        ref: o,
        trapFocus: !1,
        disableOutsidePointerEvents: !1,
        onCloseAutoFocus: (d) => {
          var p, m;
          (p = n.onCloseAutoFocus) == null || p.call(n, d), d.defaultPrevented || (a.current || (m = i.triggerRef.current) == null || m.focus(), d.preventDefault()), a.current = !1, f.current = !1;
        },
        onInteractOutside: (d) => {
          var y, S;
          (y = n.onInteractOutside) == null || y.call(n, d), d.defaultPrevented || (a.current = !0, d.detail.originalEvent.type === "pointerdown" && (f.current = !0));
          const p = d.target;
          ((S = i.triggerRef.current) == null ? void 0 : S.contains(p)) && d.preventDefault(), d.detail.originalEvent.type === "focusin" && f.current && d.preventDefault();
        }
      }
    );
  }, "DialogContentNonModal")
), $S = /* @__PURE__ */ b.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Kt(function(n, o) {
    const { __scopeDialog: i, trapFocus: a, onOpenAutoFocus: f, onCloseAutoFocus: d, ...p } = n, m = xn(Pi, i);
    return vf(), /* @__PURE__ */ x.jsx(x.Fragment, { children: /* @__PURE__ */ x.jsx(
      cE,
      {
        asChild: !0,
        loop: !0,
        trapped: a,
        onMountAutoFocus: f,
        onUnmountAutoFocus: d,
        children: /* @__PURE__ */ x.jsx(
          aE,
          {
            role: "dialog",
            id: m.contentId,
            "aria-describedby": m.descriptionPresent ? m.descriptionId : void 0,
            "aria-labelledby": m.titlePresent ? m.titleId : void 0,
            "data-state": wf(m.open),
            ...p,
            ref: o,
            deferPointerDownOutside: !0,
            onDismiss: () => m.onOpenChange(!1)
          }
        )
      }
    ) });
  }, "DialogContentImpl")
), mM = "DialogTitle", hM = /* @__PURE__ */ b.forwardRef(
  /* @__PURE__ */ Kt(function(n, o) {
    const { __scopeDialog: i, ...a } = n, f = xn(mM, i), { setTitleCount: d } = f;
    return Jn(() => (d((p) => p + 1), () => d((p) => p - 1)), [d]), /* @__PURE__ */ x.jsx(ko.h2, { id: f.titleId, ...a, ref: o });
  }, "DialogTitle")
), yM = "DialogDescription", gM = /* @__PURE__ */ b.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Kt(function(n, o) {
    const { __scopeDialog: i, ...a } = n, f = xn(yM, i), { setDescriptionCount: d } = f;
    return Jn(() => (d((p) => p + 1), () => d((p) => p - 1)), [d]), /* @__PURE__ */ x.jsx(ko.p, { id: f.descriptionId, ...a, ref: o });
  }, "DialogDescription")
);
function wf(e) {
  return e ? "open" : "closed";
}
Kt(wf, "getState");
function vM() {
  const e = K((a) => a.summaryRecord), n = K((a) => a.closeSummary), o = K((a) => a.startTimer), i = vn(e == null ? void 0 : e.selectedScene);
  return /* @__PURE__ */ x.jsx(iM, { open: !!e, onOpenChange: (a) => !a && n(), children: /* @__PURE__ */ x.jsx(Ka, { children: e ? /* @__PURE__ */ x.jsxs(aM, { forceMount: !0, children: [
    /* @__PURE__ */ x.jsx(lM, { asChild: !0, children: /* @__PURE__ */ x.jsx(
      Sn.div,
      {
        className: "summary-overlay",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
      }
    ) }),
    /* @__PURE__ */ x.jsx(dM, { asChild: !0, children: /* @__PURE__ */ x.jsxs(
      Sn.article,
      {
        className: "summary-card liquid-glass",
        initial: { opacity: 0, y: 18, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 18, scale: 0.98 },
        children: [
          /* @__PURE__ */ x.jsx("span", { className: "focus-kicker", children: "Session complete" }),
          /* @__PURE__ */ x.jsx(hM, { children: "Focus block complete" }),
          /* @__PURE__ */ x.jsx(gM, { className: "sr-only", children: "Summary of the completed focus block." }),
          /* @__PURE__ */ x.jsx("p", { children: "You protected a focused block in your quiet study room." }),
          /* @__PURE__ */ x.jsxs("div", { className: "summary-grid", children: [
            /* @__PURE__ */ x.jsxs("div", { className: "summary-stat liquid-glass-lite", children: [
              /* @__PURE__ */ x.jsx("span", { children: "Focus time" }),
              /* @__PURE__ */ x.jsx("strong", { children: I0(e.totalFocusTime) })
            ] }),
            /* @__PURE__ */ x.jsxs("div", { className: "summary-stat liquid-glass-lite", children: [
              /* @__PURE__ */ x.jsx("span", { children: "Planned block" }),
              /* @__PURE__ */ x.jsxs("strong", { children: [
                e.pomodoroDuration,
                "m"
              ] })
            ] }),
            /* @__PURE__ */ x.jsxs("div", { className: "summary-stat liquid-glass-lite", children: [
              /* @__PURE__ */ x.jsx("span", { children: "Scene" }),
              /* @__PURE__ */ x.jsx("strong", { children: i.name })
            ] }),
            /* @__PURE__ */ x.jsxs("div", { className: "summary-stat liquid-glass-lite", children: [
              /* @__PURE__ */ x.jsx("span", { children: "Room state" }),
              /* @__PURE__ */ x.jsx("strong", { children: "Saved" })
            ] })
          ] }),
          e.persisted === !1 ? /* @__PURE__ */ x.jsx("p", { children: "This session is visible for now, but could not be saved to this device history." }) : null,
          /* @__PURE__ */ x.jsxs("div", { className: "focus-button-row", children: [
            /* @__PURE__ */ x.jsx(Te, { variant: "primary", onClick: () => {
              n(), o();
            }, children: "Continue studying" }),
            /* @__PURE__ */ x.jsx(Te, { onClick: n, children: "Done" })
          ] })
        ]
      }
    ) })
  ] }) : null }) });
}
function US(e, [n, o]) {
  return Math.min(o, Math.max(n, e));
}
function fo(e, n, { checkForDefaultPrevented: o = !0 } = {}) {
  return function(a) {
    if (e == null || e(a), o === !1 || !a.defaultPrevented)
      return n == null ? void 0 : n(a);
  };
}
function Ag(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function SM(...e) {
  return (n) => {
    let o = !1;
    const i = e.map((a) => {
      const f = Ag(a, n);
      return !o && typeof f == "function" && (o = !0), f;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const f = i[a];
          typeof f == "function" ? f() : Ag(e[a], null);
        }
      };
  };
}
function qn(...e) {
  return b.useCallback(SM(...e), e);
}
function HS(e, n = []) {
  let o = [];
  function i(f, d) {
    const p = b.createContext(d);
    p.displayName = f + "Context";
    const m = o.length;
    o = [...o, d];
    const y = (l) => {
      var _;
      const { scope: c, children: v, ...w } = l, T = ((_ = c == null ? void 0 : c[e]) == null ? void 0 : _[m]) || p, A = b.useMemo(() => w, Object.values(w));
      return /* @__PURE__ */ x.jsx(T.Provider, { value: A, children: v });
    };
    y.displayName = f + "Provider";
    function S(l, c) {
      var T;
      const v = ((T = c == null ? void 0 : c[e]) == null ? void 0 : T[m]) || p, w = b.useContext(v);
      if (w) return w;
      if (d !== void 0) return d;
      throw new Error(`\`${l}\` must be used within \`${f}\``);
    }
    return [y, S];
  }
  const a = () => {
    const f = o.map((d) => b.createContext(d));
    return function(p) {
      const m = (p == null ? void 0 : p[e]) || f;
      return b.useMemo(
        () => ({ [`__scope${e}`]: { ...p, [e]: m } }),
        [p, m]
      );
    };
  };
  return a.scopeName = e, [i, wM(a, ...n)];
}
function wM(...e) {
  const n = e[0];
  if (e.length === 1) return n;
  const o = () => {
    const i = e.map((a) => ({
      useScope: a(),
      scopeName: a.scopeName
    }));
    return function(f) {
      const d = i.reduce((p, { useScope: m, scopeName: y }) => {
        const l = m(f)[`__scope${y}`];
        return { ...p, ...l };
      }, {});
      return b.useMemo(() => ({ [`__scope${n.scopeName}`]: d }), [d]);
    };
  };
  return o.scopeName = n.scopeName, o;
}
var WS = globalThis != null && globalThis.document ? b.useLayoutEffect : () => {
}, xM = Er[" useInsertionEffect ".trim().toString()] || WS;
function _M({
  prop: e,
  defaultProp: n,
  onChange: o = () => {
  },
  caller: i
}) {
  const [a, f, d] = TM({
    defaultProp: n,
    onChange: o
  }), p = e !== void 0, m = p ? e : a;
  {
    const S = b.useRef(e !== void 0);
    b.useEffect(() => {
      const l = S.current;
      l !== p && console.warn(
        `${i} is changing from ${l ? "controlled" : "uncontrolled"} to ${p ? "controlled" : "uncontrolled"}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
      ), S.current = p;
    }, [p, i]);
  }
  const y = b.useCallback(
    (S) => {
      var l;
      if (p) {
        const c = kM(S) ? S(e) : S;
        c !== e && ((l = d.current) == null || l.call(d, c));
      } else
        f(S);
    },
    [p, e, f, d]
  );
  return [m, y];
}
function TM({
  defaultProp: e,
  onChange: n
}) {
  const [o, i] = b.useState(e), a = b.useRef(o), f = b.useRef(n);
  return xM(() => {
    f.current = n;
  }, [n]), b.useEffect(() => {
    var d;
    a.current !== o && ((d = f.current) == null || d.call(f, o), a.current = o);
  }, [o, a]), [o, i, f];
}
function kM(e) {
  return typeof e == "function";
}
var AM = b.createContext(void 0);
function bM(e) {
  const n = b.useContext(AM);
  return e || n || "ltr";
}
function CM(e) {
  const n = b.useRef({ value: e, previous: e });
  return b.useMemo(() => (n.current.value !== e && (n.current.previous = n.current.value, n.current.value = e), n.current.previous), [e]);
}
function PM(e) {
  const [n, o] = b.useState(void 0);
  return WS(() => {
    if (e) {
      o({ width: e.offsetWidth, height: e.offsetHeight });
      const i = new ResizeObserver((a) => {
        if (!Array.isArray(a) || !a.length)
          return;
        const f = a[0];
        let d, p;
        if ("borderBoxSize" in f) {
          const m = f.borderBoxSize, y = Array.isArray(m) ? m[0] : m;
          d = y.inlineSize, p = y.blockSize;
        } else
          d = e.offsetWidth, p = e.offsetHeight;
        o({ width: d, height: p });
      });
      return i.observe(e, { box: "border-box" }), () => i.unobserve(e);
    } else
      o(void 0);
  }, [e]), n;
}
// @__NO_SIDE_EFFECTS__
function xd(e) {
  const n = b.forwardRef((o, i) => {
    let { children: a, ...f } = o, d = null, p = !1;
    const m = [];
    bg(a) && typeof la == "function" && (a = la(a._payload)), b.Children.forEach(a, (c) => {
      var v;
      if (NM(c)) {
        p = !0;
        const w = c;
        let T = "child" in w.props ? w.props.child : w.props.children;
        bg(T) && typeof la == "function" && (T = la(T._payload)), d = MM(w, T), m.push((v = d == null ? void 0 : d.props) == null ? void 0 : v.children);
      } else
        m.push(c);
    }), d ? d = b.cloneElement(d, void 0, m) : (
      // A `Slottable` was found but it didn't resolve to a single element (e.g.
      // it wrapped multiple elements, text, or a render-prop `child` that
      // wasn't an element). Don't fall back to treating the `Slottable` wrapper
      // itself as the slot target — throw a descriptive error below instead.
      !p && b.Children.count(a) === 1 && b.isValidElement(a) && (d = a)
    );
    const y = d ? DM(d) : void 0, S = qn(i, y);
    if (!d) {
      if (a || a === 0)
        throw new Error(
          p ? OM(e) : FM(e)
        );
      return a;
    }
    const l = RM(f, d.props ?? {});
    return d.type !== b.Fragment && (l.ref = i ? S : y), b.cloneElement(d, l);
  });
  return n.displayName = `${e}.Slot`, n;
}
var EM = Symbol.for("radix.slottable"), MM = (e, n) => {
  if ("child" in e.props) {
    const o = e.props.child;
    return b.isValidElement(o) ? b.cloneElement(o, void 0, e.props.children(o.props.children)) : null;
  }
  return b.isValidElement(n) ? n : null;
};
function RM(e, n) {
  const o = { ...n };
  for (const i in n) {
    const a = e[i], f = n[i];
    /^on[A-Z]/.test(i) ? a && f ? o[i] = (...p) => {
      const m = f(...p);
      return a(...p), m;
    } : a && (o[i] = a) : i === "style" ? o[i] = { ...a, ...f } : i === "className" && (o[i] = [a, f].filter(Boolean).join(" "));
  }
  return { ...e, ...o };
}
function DM(e) {
  var i, a;
  let n = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = n && "isReactWarning" in n && n.isReactWarning;
  return o ? e.ref : (n = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = n && "isReactWarning" in n && n.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
function NM(e) {
  return b.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === EM;
}
var jM = Symbol.for("react.lazy");
function bg(e) {
  return e != null && typeof e == "object" && "$$typeof" in e && e.$$typeof === jM && "_payload" in e && IM(e._payload);
}
function IM(e) {
  return typeof e == "object" && e !== null && "then" in e;
}
var FM = (e) => `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`, OM = (e) => `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`, la = Er[" use ".trim().toString()], LM = [
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
], Fi = LM.reduce((e, n) => {
  const o = /* @__PURE__ */ xd(`Primitive.${n}`), i = b.forwardRef((a, f) => {
    const { asChild: d, ...p } = a, m = d ? o : n;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ x.jsx(m, { ...p, ref: f });
  });
  return i.displayName = `Primitive.${n}`, { ...e, [n]: i };
}, {});
function VM(e) {
  const n = e + "CollectionProvider", [o, i] = HS(n), [a, f] = o(
    n,
    { collectionRef: { current: null }, itemMap: /* @__PURE__ */ new Map() }
  ), d = (T) => {
    const { scope: A, children: _ } = T, C = b.useRef(null), E = b.useRef(/* @__PURE__ */ new Map()).current;
    return /* @__PURE__ */ x.jsx(a, { scope: A, itemMap: E, collectionRef: C, children: _ });
  };
  d.displayName = n;
  const p = e + "CollectionSlot", m = /* @__PURE__ */ xd(p), y = b.forwardRef(
    (T, A) => {
      const { scope: _, children: C } = T, E = f(p, _), D = qn(A, E.collectionRef);
      return /* @__PURE__ */ x.jsx(m, { ref: D, children: C });
    }
  );
  y.displayName = p;
  const S = e + "CollectionItemSlot", l = "data-radix-collection-item", c = /* @__PURE__ */ xd(S), v = b.forwardRef(
    (T, A) => {
      const { scope: _, children: C, ...E } = T, D = b.useRef(null), O = qn(A, D), W = f(S, _);
      return b.useEffect(() => (W.itemMap.set(D, { ref: D, ...E }), () => void W.itemMap.delete(D))), /* @__PURE__ */ x.jsx(c, { [l]: "", ref: O, children: C });
    }
  );
  v.displayName = S;
  function w(T) {
    const A = f(e + "CollectionConsumer", T);
    return b.useCallback(() => {
      const C = A.collectionRef.current;
      if (!C) return [];
      const E = Array.from(C.querySelectorAll(`[${l}]`));
      return Array.from(A.itemMap.values()).sort(
        (W, H) => E.indexOf(W.ref.current) - E.indexOf(H.ref.current)
      );
    }, [A.collectionRef, A.itemMap]);
  }
  return [
    { Provider: d, Slot: y, ItemSlot: v },
    w,
    i
  ];
}
var GS = ["PageUp", "PageDown"], KS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"], YS = {
  "from-left": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-right": ["Home", "PageDown", "ArrowDown", "ArrowRight"],
  "from-bottom": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-top": ["Home", "PageDown", "ArrowUp", "ArrowLeft"]
}, Ao = "Slider", [_d, zM, BM] = VM(Ao), [xf] = HS(Ao, [
  BM
]), [$M, Oi] = xf(Ao), _f = b.forwardRef(
  (e, n) => {
    const {
      name: o,
      min: i = 0,
      max: a = 100,
      step: f = 1,
      orientation: d = "horizontal",
      disabled: p = !1,
      minStepsBetweenThumbs: m = 0,
      defaultValue: y = [i],
      value: S,
      onValueChange: l = () => {
      },
      onValueCommit: c = () => {
      },
      inverted: v = !1,
      form: w,
      ...T
    } = e, A = b.useRef(/* @__PURE__ */ new Set()), _ = b.useRef(0), C = b.useRef(!1), D = d === "horizontal" ? UM : HM, [O = [], W] = _M({
      prop: S,
      defaultProp: y,
      onChange: (Z) => {
        var ce;
        (ce = [...A.current][_.current]) == null || ce.focus({
          preventScroll: !0,
          focusVisible: C.current
        }), C.current = !1, l(Z);
      }
    }), H = b.useRef(O);
    function Y(Z) {
      const de = YM(O, Z);
      se(Z, de);
    }
    function L(Z) {
      se(Z, _.current);
    }
    function X() {
      const Z = H.current[_.current];
      O[_.current] !== Z && c(O);
    }
    function se(Z, de, { commit: ce } = { commit: !1 }) {
      const ye = JM(f), ee = qM(Math.round((Z - i) / f) * f + i, ye), we = US(ee, [i, a]);
      W(($ = []) => {
        const J = GM($, we, de);
        if (ZM(J, m * f)) {
          _.current = J.indexOf(we);
          const Q = String(J) !== String($);
          return Q && ce && c(J), Q ? J : $;
        } else
          return $;
      });
    }
    return /* @__PURE__ */ x.jsx(
      $M,
      {
        scope: e.__scopeSlider,
        name: o,
        disabled: p,
        min: i,
        max: a,
        valueIndexToChangeRef: _,
        thumbs: A.current,
        values: O,
        orientation: d,
        form: w,
        children: /* @__PURE__ */ x.jsx(_d.Provider, { scope: e.__scopeSlider, children: /* @__PURE__ */ x.jsx(_d.Slot, { scope: e.__scopeSlider, children: /* @__PURE__ */ x.jsx(
          D,
          {
            "aria-disabled": p,
            "data-disabled": p ? "" : void 0,
            ...T,
            ref: n,
            onPointerDown: fo(T.onPointerDown, () => {
              p || (H.current = O, C.current = !1);
            }),
            min: i,
            max: a,
            inverted: v,
            onSlideStart: p ? void 0 : Y,
            onSlideMove: p ? void 0 : L,
            onSlideEnd: p ? void 0 : X,
            onHomeKeyDown: () => {
              p || (C.current = !0, se(i, 0, { commit: !0 }));
            },
            onEndKeyDown: () => {
              p || (C.current = !0, se(a, O.length - 1, { commit: !0 }));
            },
            onStepKeyDown: ({ event: Z, direction: de }) => {
              if (!p) {
                C.current = !0;
                const ee = GS.includes(Z.key) || Z.shiftKey && KS.includes(Z.key) ? 10 : 1, we = _.current, $ = O[we], J = f * ee * de;
                se($ + J, we, { commit: !0 });
              }
            }
          }
        ) }) })
      }
    );
  }
);
_f.displayName = Ao;
var [QS, XS] = xf(Ao, {
  startEdge: "left",
  endEdge: "right",
  size: "width",
  direction: 1
}), UM = b.forwardRef(
  (e, n) => {
    const {
      min: o,
      max: i,
      dir: a,
      inverted: f,
      onSlideStart: d,
      onSlideMove: p,
      onSlideEnd: m,
      onStepKeyDown: y,
      ...S
    } = e, [l, c] = b.useState(null), v = qn(n, (E) => c(E)), w = b.useRef(void 0), T = bM(a), A = T === "ltr", _ = A && !f || !A && f;
    function C(E) {
      const D = w.current || l.getBoundingClientRect(), O = [0, D.width], H = bf(O, _ ? [o, i] : [i, o]);
      return w.current = D, H(E - D.left);
    }
    return /* @__PURE__ */ x.jsx(
      QS,
      {
        scope: e.__scopeSlider,
        startEdge: _ ? "left" : "right",
        endEdge: _ ? "right" : "left",
        direction: _ ? 1 : -1,
        size: "width",
        children: /* @__PURE__ */ x.jsx(
          ZS,
          {
            dir: T,
            "data-orientation": "horizontal",
            ...S,
            ref: v,
            style: {
              ...S.style,
              "--radix-slider-thumb-transform": "translateX(-50%)"
            },
            onSlideStart: (E) => {
              const D = C(E.clientX);
              d == null || d(D);
            },
            onSlideMove: (E) => {
              const D = C(E.clientX);
              p == null || p(D);
            },
            onSlideEnd: () => {
              w.current = void 0, m == null || m();
            },
            onStepKeyDown: (E) => {
              const O = YS[_ ? "from-left" : "from-right"].includes(E.key);
              y == null || y({ event: E, direction: O ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), HM = b.forwardRef(
  (e, n) => {
    const {
      min: o,
      max: i,
      inverted: a,
      onSlideStart: f,
      onSlideMove: d,
      onSlideEnd: p,
      onStepKeyDown: m,
      ...y
    } = e, S = b.useRef(null), l = qn(n, S), c = b.useRef(void 0), v = !a;
    function w(T) {
      const A = c.current || S.current.getBoundingClientRect(), _ = [0, A.height], E = bf(_, v ? [i, o] : [o, i]);
      return c.current = A, E(T - A.top);
    }
    return /* @__PURE__ */ x.jsx(
      QS,
      {
        scope: e.__scopeSlider,
        startEdge: v ? "bottom" : "top",
        endEdge: v ? "top" : "bottom",
        size: "height",
        direction: v ? 1 : -1,
        children: /* @__PURE__ */ x.jsx(
          ZS,
          {
            "data-orientation": "vertical",
            ...y,
            ref: l,
            style: {
              ...y.style,
              "--radix-slider-thumb-transform": "translateY(50%)"
            },
            onSlideStart: (T) => {
              const A = w(T.clientY);
              f == null || f(A);
            },
            onSlideMove: (T) => {
              const A = w(T.clientY);
              d == null || d(A);
            },
            onSlideEnd: () => {
              c.current = void 0, p == null || p();
            },
            onStepKeyDown: (T) => {
              const _ = YS[v ? "from-bottom" : "from-top"].includes(T.key);
              m == null || m({ event: T, direction: _ ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), ZS = b.forwardRef(
  (e, n) => {
    const {
      __scopeSlider: o,
      onSlideStart: i,
      onSlideMove: a,
      onSlideEnd: f,
      onHomeKeyDown: d,
      onEndKeyDown: p,
      onStepKeyDown: m,
      ...y
    } = e, S = Oi(Ao, o);
    return /* @__PURE__ */ x.jsx(
      Fi.span,
      {
        ...y,
        ref: n,
        onKeyDown: fo(e.onKeyDown, (l) => {
          l.key === "Home" ? (d(l), l.preventDefault()) : l.key === "End" ? (p(l), l.preventDefault()) : GS.concat(KS).includes(l.key) && (m(l), l.preventDefault());
        }),
        onPointerDown: fo(e.onPointerDown, (l) => {
          const c = l.target;
          c.setPointerCapture(l.pointerId), l.preventDefault(), S.thumbs.has(c) ? c.focus({ preventScroll: !0, focusVisible: !1 }) : i(l);
        }),
        onPointerMove: fo(e.onPointerMove, (l) => {
          l.target.hasPointerCapture(l.pointerId) && a(l);
        }),
        onPointerUp: fo(e.onPointerUp, (l) => {
          const c = l.target;
          c.hasPointerCapture(l.pointerId) && (c.releasePointerCapture(l.pointerId), f(l));
        })
      }
    );
  }
), JS = "SliderTrack", Tf = b.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Oi(JS, o);
    return /* @__PURE__ */ x.jsx(
      Fi.span,
      {
        "data-disabled": a.disabled ? "" : void 0,
        "data-orientation": a.orientation,
        ...i,
        ref: n
      }
    );
  }
);
Tf.displayName = JS;
var Td = "SliderRange", kf = b.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Oi(Td, o), f = XS(Td, o), d = b.useRef(null), p = qn(n, d), m = a.values.length, y = a.values.map(
      (c) => sw(c, a.min, a.max)
    ), S = m > 1 ? Math.min(...y) : 0, l = 100 - Math.max(...y);
    return /* @__PURE__ */ x.jsx(
      Fi.span,
      {
        "data-orientation": a.orientation,
        "data-disabled": a.disabled ? "" : void 0,
        ...i,
        ref: p,
        style: {
          ...e.style,
          [f.startEdge]: S + "%",
          [f.endEdge]: l + "%"
        }
      }
    );
  }
);
kf.displayName = Td;
var qS = "SliderThumb", [WM, ew] = xf(qS), tw = "SliderThumbProvider";
function nw(e) {
  const {
    __scopeSlider: n,
    name: o,
    children: i,
    // @ts-expect-error internal render prop
    internal_do_not_use_render: a
  } = e, f = Oi(tw, n), d = zM(n), [p, m] = b.useState(null), y = b.useMemo(
    () => p ? d().findIndex((A) => A.ref.current === p) : -1,
    [d, p]
  ), S = PM(p), l = p ? !!f.form || !!p.closest("form") : !0, c = f.values[y], v = o ?? (f.name ? f.name + (f.values.length > 1 ? "[]" : "") : void 0), w = c === void 0 ? 0 : sw(c, f.min, f.max);
  b.useEffect(() => {
    if (p)
      return f.thumbs.add(p), () => {
        f.thumbs.delete(p);
      };
  }, [p, f.thumbs]);
  const T = {
    value: c,
    name: v,
    form: f.form,
    isFormControl: l,
    index: y,
    thumb: p,
    onThumbChange: m,
    percent: w,
    size: S
  };
  return /* @__PURE__ */ x.jsx(WM, { scope: n, ...T, children: eR(a) ? a(T) : i });
}
nw.displayName = tw;
var Ta = "SliderThumbTrigger", rw = b.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Oi(Ta, o), f = XS(Ta, o), { index: d, value: p, percent: m, size: y, onThumbChange: S } = ew(
      Ta,
      o
    ), l = qn(n, (T) => S(T)), c = KM(d, a.values.length), v = y == null ? void 0 : y[f.size], w = v ? QM(v, m, f.direction) : 0;
    return /* @__PURE__ */ x.jsx(
      "span",
      {
        style: {
          transform: "var(--radix-slider-thumb-transform)",
          position: "absolute",
          [f.startEdge]: `calc(${m}% + ${w}px)`
        },
        children: /* @__PURE__ */ x.jsx(_d.ItemSlot, { scope: o, children: /* @__PURE__ */ x.jsx(
          Fi.span,
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
            onFocus: fo(e.onFocus, () => {
              a.valueIndexToChangeRef.current = d;
            })
          }
        ) })
      }
    );
  }
);
rw.displayName = Ta;
var Af = b.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, name: i, ...a } = e;
    return /* @__PURE__ */ x.jsx(
      nw,
      {
        __scopeSlider: o,
        name: i,
        internal_do_not_use_render: ({ index: f, isFormControl: d }) => /* @__PURE__ */ x.jsxs(x.Fragment, { children: [
          /* @__PURE__ */ x.jsx(
            rw,
            {
              ...a,
              ref: n,
              __scopeSlider: o
            }
          ),
          d ? /* @__PURE__ */ x.jsx(
            iw,
            {
              __scopeSlider: o
            },
            f
          ) : null
        ] })
      }
    );
  }
);
Af.displayName = qS;
var ow = "SliderBubbleInput", iw = b.forwardRef(
  ({ __scopeSlider: e, ...n }, o) => {
    const { value: i, name: a, form: f } = ew(ow, e), d = b.useRef(null), p = qn(d, o), m = CM(i);
    return b.useEffect(() => {
      const y = d.current;
      if (!y) return;
      const S = window.HTMLInputElement.prototype, c = Object.getOwnPropertyDescriptor(S, "value").set;
      if (m !== i && c) {
        const v = new Event("input", { bubbles: !0 });
        c.call(y, i), y.dispatchEvent(v);
      }
    }, [m, i]), /* @__PURE__ */ x.jsx(
      Fi.input,
      {
        style: { display: "none" },
        name: a,
        form: f,
        ...n,
        ref: p,
        defaultValue: i
      }
    );
  }
);
iw.displayName = ow;
function GM(e = [], n, o) {
  const i = [...e];
  return i[o] = n, i.sort((a, f) => a - f);
}
function sw(e, n, o) {
  const f = 100 / (o - n) * (e - n);
  return US(f, [0, 100]);
}
function KM(e, n) {
  return n > 2 ? `Value ${e + 1} of ${n}` : n === 2 ? ["Minimum", "Maximum"][e] : void 0;
}
function YM(e, n) {
  if (e.length === 1) return 0;
  const o = e.map((a) => Math.abs(a - n)), i = Math.min(...o);
  return o.indexOf(i);
}
function QM(e, n, o) {
  const i = e / 2, f = bf([0, 50], [0, i]);
  return (i - f(n) * o) * o;
}
function XM(e) {
  return e.slice(0, -1).map((n, o) => e[o + 1] - n);
}
function ZM(e, n) {
  if (n > 0) {
    const o = XM(e);
    return Math.min(...o) >= n;
  }
  return !0;
}
function bf(e, n) {
  return (o) => {
    if (e[0] === e[1] || n[0] === n[1]) return n[0];
    const i = (n[1] - n[0]) / (e[1] - e[0]);
    return n[0] + i * (o - e[0]);
  };
}
function JM(e) {
  if (!Number.isFinite(e)) return 0;
  const n = e.toString();
  if (n.includes("e")) {
    const [i, a] = n.split("e"), f = i.split(".")[1] || "", d = Number(a);
    return Math.max(0, f.length - d);
  }
  const o = n.split(".")[1];
  return o ? o.length : 0;
}
function qM(e, n) {
  const o = Math.pow(10, n);
  return Math.round(e * o) / o;
}
function eR(e) {
  return typeof e == "function";
}
function Cg({ label: e, icon: n, value: o, onChange: i }) {
  return /* @__PURE__ */ x.jsxs("label", { className: "sound-slider", children: [
    /* @__PURE__ */ x.jsxs("span", { className: "sound-slider-head", children: [
      /* @__PURE__ */ x.jsxs("span", { className: "sound-slider-label", children: [
        n,
        /* @__PURE__ */ x.jsx("span", { children: e })
      ] }),
      /* @__PURE__ */ x.jsxs("strong", { children: [
        o,
        "%"
      ] })
    ] }),
    /* @__PURE__ */ x.jsxs(
      _f,
      {
        className: "radix-slider-root",
        value: [o],
        min: 0,
        max: 100,
        step: 1,
        onValueChange: (a) => i(a[0]),
        children: [
          /* @__PURE__ */ x.jsx(Tf, { className: "radix-slider-track", children: /* @__PURE__ */ x.jsx(kf, { className: "radix-slider-range" }) }),
          /* @__PURE__ */ x.jsx(Af, { className: "radix-slider-thumb", "aria-label": e })
        ]
      }
    )
  ] });
}
function tR({ audioState: e }) {
  const n = K((c) => c.musicType), o = K((c) => c.ambientSound), i = K((c) => c.musicVolume), a = K((c) => c.ambientVolume), f = K((c) => c.audioPlaying), d = K((c) => c.setSound), p = K((c) => c.applyAudioPreset), m = K((c) => c.toggleAudio), y = Qa({ musicType: n, ambientSound: o }), S = Bb({ musicType: n, ambientSound: o }), l = y.ambientLayers.map((c) => c.title).filter(Boolean).join(" + ");
  return /* @__PURE__ */ x.jsxs("div", { className: "sound-panel", children: [
    /* @__PURE__ */ x.jsx("div", { className: "sound-preset-list", "aria-label": "Focus audio presets", children: wi.map((c) => /* @__PURE__ */ x.jsxs(
      "button",
      {
        type: "button",
        className: (S == null ? void 0 : S.id) === c.id ? "is-active" : "",
        "aria-pressed": (S == null ? void 0 : S.id) === c.id,
        title: c.description,
        onClick: () => p(c.id),
        children: [
          /* @__PURE__ */ x.jsx("strong", { children: c.label }),
          /* @__PURE__ */ x.jsx("small", { children: c.description })
        ]
      },
      c.id
    )) }),
    /* @__PURE__ */ x.jsxs("label", { className: "focus-field", children: [
      "Music selector",
      /* @__PURE__ */ x.jsx("select", { value: n, onChange: (c) => d("musicType", c.target.value), children: Kn.map((c) => /* @__PURE__ */ x.jsx("option", { value: c.label, children: c.label }, c.label)) })
    ] }),
    /* @__PURE__ */ x.jsx(
      Cg,
      {
        label: "Music volume",
        icon: /* @__PURE__ */ x.jsx(Ja, { size: 16, "aria-hidden": "true" }),
        value: i,
        onChange: (c) => d("musicVolume", c)
      }
    ),
    /* @__PURE__ */ x.jsxs("label", { className: "focus-field", children: [
      "Ambient sound selector",
      /* @__PURE__ */ x.jsx("select", { value: o, onChange: (c) => d("ambientSound", c.target.value), children: Yn.map((c) => /* @__PURE__ */ x.jsx("option", { value: c.label, children: c.label }, c.label)) })
    ] }),
    /* @__PURE__ */ x.jsx(
      Cg,
      {
        label: "Ambient volume",
        icon: /* @__PURE__ */ x.jsx(af, { size: 16, "aria-hidden": "true" }),
        value: a,
        onChange: (c) => d("ambientVolume", c)
      }
    ),
    /* @__PURE__ */ x.jsxs("div", { className: "audio-preview liquid-glass-lite", children: [
      /* @__PURE__ */ x.jsxs("div", { children: [
        /* @__PURE__ */ x.jsx("span", { className: "focus-kicker", children: "Theme audio preview" }),
        /* @__PURE__ */ x.jsx("strong", { children: y.musicTrack.title }),
        /* @__PURE__ */ x.jsx("p", { children: l }),
        e != null && e.error ? /* @__PURE__ */ x.jsx("p", { className: "audio-error", children: e.error }) : null
      ] }),
      /* @__PURE__ */ x.jsx(Te, { variant: f ? "primary" : "ghost", onClick: m, children: f ? "Pause audio" : "Play audio" })
    ] }),
    /* @__PURE__ */ x.jsx("div", { className: "audio-links", children: [y.musicTrack, ...y.ambientLayers].filter((c) => c == null ? void 0 : c.pageUrl).map((c) => /* @__PURE__ */ x.jsx("a", { href: c.pageUrl, target: "_blank", rel: "noreferrer", children: c.title || c.label || "Audio source" }, c.pageUrl)) })
  ] });
}
const nR = [
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
], rR = [
  ["white-noise", "White noise"],
  ["pink-noise", "Pink noise"],
  ["brown-noise", "Brown noise"]
], oR = [
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
function ua({ id: e, label: n, value: o, icon: i = null, onChange: a, card: f = !1 }) {
  const d = Number.isFinite(Number(o)) ? Number(o) : 0, p = d > 0;
  return /* @__PURE__ */ x.jsxs("label", { className: [
    "room-channel",
    i ? "room-channel-master" : "",
    f ? "room-channel-card" : "",
    p ? "is-active" : ""
  ].filter(Boolean).join(" "), children: [
    /* @__PURE__ */ x.jsxs("span", { className: "room-channel-head", children: [
      /* @__PURE__ */ x.jsxs("span", { className: "room-channel-label", children: [
        i || /* @__PURE__ */ x.jsx("i", { className: `mixer-channel-dot mixer-${e}`, "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: n })
      ] }),
      /* @__PURE__ */ x.jsxs("strong", { children: [
        d,
        "%"
      ] })
    ] }),
    /* @__PURE__ */ x.jsxs(
      _f,
      {
        className: "radix-slider-root",
        value: [d],
        min: 0,
        max: 100,
        step: 1,
        onValueChange: (m) => a(e, m[0]),
        children: [
          /* @__PURE__ */ x.jsx(Tf, { className: "radix-slider-track", children: /* @__PURE__ */ x.jsx(kf, { className: "radix-slider-range" }) }),
          /* @__PURE__ */ x.jsx(Af, { className: "radix-slider-thumb", "aria-label": `${n} volume` })
        ]
      }
    )
  ] });
}
function iR({ audioState: e, scene: n, onClose: o }) {
  const i = K((_) => _.audioChannels), a = K((_) => _.setSound), f = K((_) => _.returnToSetup), d = K((_) => _.musicType), p = K((_) => _.ambientSound), m = K((_) => _.musicVolume), y = K((_) => _.ambientVolume), [S, l] = b.useState(!1), c = (_, C) => {
    l(!1), a(`audioChannel:${_}`, C);
  }, v = (_, C) => a("musicVolume", C), w = (_, C) => a("ambientVolume", C), T = () => {
    const _ = Kn[Math.floor(Math.random() * Kn.length)], C = Yn[Math.floor(Math.random() * Yn.length)];
    a("musicType", _.label), a("ambientSound", C.label), l(!1);
  }, A = () => {
    a("musicType", (n == null ? void 0 : n.musicType) || "Deep Focus"), a("ambientSound", (n == null ? void 0 : n.ambientSound) || "Nature"), l(!0);
  };
  return /* @__PURE__ */ x.jsxs(
    Sn.aside,
    {
      className: "focus-utility-panel room-control-panel liquid-glass",
      initial: { opacity: 0, y: 18 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 14 },
      transition: Ia,
      role: "dialog",
      "aria-label": "Room settings",
      children: [
        /* @__PURE__ */ x.jsxs("header", { className: "room-control-head", children: [
          /* @__PURE__ */ x.jsxs("div", { children: [
            /* @__PURE__ */ x.jsx("span", { className: "control-eyebrow", children: "Control" }),
            /* @__PURE__ */ x.jsx("h2", { children: "Room settings" })
          ] }),
          /* @__PURE__ */ x.jsx(Te, { className: "room-control-close", "aria-label": "Close room settings", onClick: o, children: /* @__PURE__ */ x.jsx(Y0, { size: 16, "aria-hidden": "true" }) })
        ] }),
        /* @__PURE__ */ x.jsx("div", { className: "room-control-divider", "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("div", { className: "room-control-setup-actions", children: /* @__PURE__ */ x.jsx(
          Te,
          {
            className: "room-control-setup-btn",
            onClick: () => {
              o == null || o(), f();
            },
            "data-focus-return-setup": "true",
            children: "Change scene & setup"
          }
        ) }),
        /* @__PURE__ */ x.jsx("section", { className: "room-control-topics", "aria-label": "Focus topics", children: /* @__PURE__ */ x.jsx(Z0, {}) }),
        /* @__PURE__ */ x.jsxs("div", { className: "room-control-grid", children: [
          /* @__PURE__ */ x.jsxs("section", { className: "room-control-col room-control-scenes", "aria-label": "Scenes", children: [
            /* @__PURE__ */ x.jsx("h3", { className: "room-control-section-title", children: "Scenes" }),
            /* @__PURE__ */ x.jsx(uf, {})
          ] }),
          /* @__PURE__ */ x.jsxs("section", { className: "room-control-col room-control-audio", children: [
            /* @__PURE__ */ x.jsxs("div", { className: "room-control-masters", children: [
              /* @__PURE__ */ x.jsxs("div", { className: "room-control-block", children: [
                /* @__PURE__ */ x.jsxs("div", { className: "room-control-block-head", children: [
                  /* @__PURE__ */ x.jsx("h3", { className: "room-control-section-title", children: "Music" }),
                  /* @__PURE__ */ x.jsx(Te, { className: "room-control-icon-btn", "aria-label": "Shuffle to a random track", onClick: T, children: /* @__PURE__ */ x.jsx(ZC, { size: 15, "aria-hidden": "true" }) })
                ] }),
                /* @__PURE__ */ x.jsxs("label", { className: "room-select-field", children: [
                  /* @__PURE__ */ x.jsx("span", { className: "sr-only", children: "Music track" }),
                  /* @__PURE__ */ x.jsx("select", { value: d, onChange: (_) => {
                    l(!1), a("musicType", _.target.value);
                  }, children: Kn.map((_) => /* @__PURE__ */ x.jsx("option", { value: _.label, children: _.label }, _.label)) })
                ] }),
                /* @__PURE__ */ x.jsx(ua, { id: "music-volume", label: "Music volume", icon: /* @__PURE__ */ x.jsx(Ja, { size: 15, "aria-hidden": "true" }), value: m, onChange: v })
              ] }),
              /* @__PURE__ */ x.jsxs("div", { className: "room-control-block", children: [
                /* @__PURE__ */ x.jsxs("div", { className: "room-control-block-head", children: [
                  /* @__PURE__ */ x.jsx("h3", { className: "room-control-section-title", children: "Scene sound" }),
                  /* @__PURE__ */ x.jsx(Te, { className: "room-control-icon-btn", "aria-label": S ? "Mix saved" : "Save current mix", onClick: () => l(!0), children: S ? /* @__PURE__ */ x.jsx(Za, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ x.jsx(W0, { size: 15, "aria-hidden": "true" }) })
                ] }),
                /* @__PURE__ */ x.jsxs("p", { className: "room-scene-recommend", children: [
                  "Recommended for ",
                  /* @__PURE__ */ x.jsx("strong", { children: n == null ? void 0 : n.name }),
                  /* @__PURE__ */ x.jsxs("span", { children: [
                    n == null ? void 0 : n.musicType,
                    " · ",
                    n == null ? void 0 : n.ambientSound
                  ] })
                ] }),
                /* @__PURE__ */ x.jsxs("button", { type: "button", className: "room-scene-apply", onClick: A, children: [
                  "Apply scene mix ",
                  /* @__PURE__ */ x.jsx("span", { "aria-hidden": "true", children: "↗" })
                ] }),
                /* @__PURE__ */ x.jsxs("label", { className: "room-select-field", children: [
                  /* @__PURE__ */ x.jsx("span", { className: "sr-only", children: "Ambient sound" }),
                  /* @__PURE__ */ x.jsx("select", { value: p, onChange: (_) => {
                    l(!1), a("ambientSound", _.target.value);
                  }, children: Yn.map((_) => /* @__PURE__ */ x.jsx("option", { value: _.label, children: _.label }, _.label)) })
                ] }),
                /* @__PURE__ */ x.jsx(ua, { id: "ambient-volume", label: "Ambient volume", icon: /* @__PURE__ */ x.jsx(af, { size: 15, "aria-hidden": "true" }), value: y, onChange: w })
              ] })
            ] }),
            /* @__PURE__ */ x.jsxs("div", { className: "room-control-block", children: [
              /* @__PURE__ */ x.jsx("h3", { className: "room-control-section-title", children: "Focus noise" }),
              /* @__PURE__ */ x.jsx("div", { className: "room-noise-row", children: rR.map(([_, C]) => /* @__PURE__ */ x.jsx(ua, { id: _, label: C, value: i == null ? void 0 : i[_], onChange: c, card: !0 }, _)) })
            ] }),
            /* @__PURE__ */ x.jsxs("div", { className: "room-control-block", children: [
              /* @__PURE__ */ x.jsx("h3", { className: "room-control-section-title", children: "Ambient atmosphere" }),
              /* @__PURE__ */ x.jsx("div", { className: "room-ambient-grid", children: oR.map(([_, C]) => /* @__PURE__ */ x.jsx(ua, { id: _, label: C, value: i == null ? void 0 : i[_], onChange: c, card: !0 }, _)) })
            ] }),
            e != null && e.error ? /* @__PURE__ */ x.jsx("p", { className: "audio-error", children: e.error }) : null
          ] })
        ] })
      ]
    }
  );
}
function ca({ title: e, kicker: n, icon: o, children: i, onClose: a, className: f = "" }) {
  return /* @__PURE__ */ x.jsxs(Sn.aside, { className: `focus-utility-panel liquid-glass ${f}`.trim(), initial: { opacity: 0, y: 12, x: -18 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: 10, x: -18 }, transition: Ia, role: "dialog", "aria-label": e, children: [
    /* @__PURE__ */ x.jsxs("div", { className: "drawer-head", children: [
      /* @__PURE__ */ x.jsxs("div", { className: "utility-title", children: [
        /* @__PURE__ */ x.jsx("span", { className: "utility-title-icon", children: o }),
        /* @__PURE__ */ x.jsxs("div", { children: [
          /* @__PURE__ */ x.jsx("span", { className: "focus-kicker", children: n }),
          /* @__PURE__ */ x.jsx("h2", { children: e })
        ] })
      ] }),
      /* @__PURE__ */ x.jsx(Te, { "aria-label": `Close ${e}`, onClick: a, children: /* @__PURE__ */ x.jsx(Y0, { size: 16, "aria-hidden": "true" }) })
    ] }),
    /* @__PURE__ */ x.jsx("div", { className: "utility-panel-body", children: i })
  ] });
}
function sR({ audioState: e, scene: n }) {
  const o = K((y) => y.audioChannels), i = K((y) => y.setSound), [a, f] = b.useState(!1), d = (y, S) => {
    f(!1), i(`audioChannel:${y}`, S);
  }, p = () => {
    const y = Kn[Math.floor(Math.random() * Kn.length)], S = Yn[Math.floor(Math.random() * Yn.length)];
    i("musicType", y.label), i("ambientSound", S.label), f(!0);
  }, m = () => {
    i("musicType", (n == null ? void 0 : n.musicType) || "Deep Focus"), i("ambientSound", (n == null ? void 0 : n.ambientSound) || "Nature"), f(!0);
  };
  return /* @__PURE__ */ x.jsxs("div", { className: "sound-mixer", children: [
    /* @__PURE__ */ x.jsxs("div", { className: "mixer-featured-row", children: [
      /* @__PURE__ */ x.jsx("span", { className: "focus-kicker", children: "Music library" }),
      /* @__PURE__ */ x.jsxs(Te, { onClick: p, children: [
        /* @__PURE__ */ x.jsx(EC, { size: 14, "aria-hidden": "true" }),
        " Random track"
      ] })
    ] }),
    /* @__PURE__ */ x.jsx(tR, { audioState: e, compact: !0 }),
    /* @__PURE__ */ x.jsxs("div", { className: "mixer-preset-row", children: [
      /* @__PURE__ */ x.jsxs("button", { type: "button", className: "mixer-preset-button", onClick: m, children: [
        "Apply scene mix ",
        /* @__PURE__ */ x.jsx("span", { children: "↗" })
      ] }),
      /* @__PURE__ */ x.jsxs(Te, { onClick: () => f(!0), children: [
        a ? /* @__PURE__ */ x.jsx(Za, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ x.jsx(W0, { size: 14, "aria-hidden": "true" }),
        " ",
        a ? "Saved" : "Save current mix"
      ] })
    ] }),
    /* @__PURE__ */ x.jsx("div", { className: "mixer-channel-grid", children: nR.map(([y, S]) => /* @__PURE__ */ x.jsxs("label", { className: "mixer-channel", children: [
      /* @__PURE__ */ x.jsxs("span", { children: [
        /* @__PURE__ */ x.jsx("i", { className: `mixer-channel-dot mixer-${y}` }),
        S
      ] }),
      /* @__PURE__ */ x.jsxs("strong", { children: [
        o[y],
        "%"
      ] }),
      /* @__PURE__ */ x.jsx("input", { type: "range", min: "0", max: "100", value: o[y], "aria-label": `${S} volume`, onChange: (l) => d(y, l.target.value) })
    ] }, y)) }),
    e != null && e.error ? /* @__PURE__ */ x.jsx("p", { className: "audio-error", children: e.error }) : null
  ] });
}
function aR() {
  const e = () => {
    var i, a, f;
    return ((f = (a = (i = globalThis.window) == null ? void 0 : i.SynapseAuth) == null ? void 0 : a.getStoredSession) == null ? void 0 : f.call(a)) || null;
  }, [n, o] = b.useState(e);
  return b.useEffect(() => {
    var d, p, m, y;
    let i = !0;
    const a = (S) => {
      var l;
      i && o(((l = S == null ? void 0 : S.detail) == null ? void 0 : l.session) || e());
    };
    (d = globalThis.window) == null || d.addEventListener("synapse-auth-changed", a);
    const f = (y = (m = (p = globalThis.window) == null ? void 0 : p.SynapseAuth) == null ? void 0 : m.syncSessionFromProvider) == null ? void 0 : y.call(m);
    return Promise.resolve(f).finally(() => a()), () => {
      var S;
      i = !1, (S = globalThis.window) == null || S.removeEventListener("synapse-auth-changed", a);
    };
  }, []), n;
}
function lR({ onWorkspace: e, session: n }) {
  return !!n ? /* @__PURE__ */ x.jsxs("div", { className: "utility-empty-state", children: [
    /* @__PURE__ */ x.jsx(Va, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ x.jsx("h3", { children: "Your Focus Trail" }),
    /* @__PURE__ */ x.jsx("p", { children: "Recent sessions and progress remain available through Synapse history." }),
    /* @__PURE__ */ x.jsx(Te, { variant: "primary", onClick: () => e == null ? void 0 : e("", "history"), children: "Open session history" })
  ] }) : /* @__PURE__ */ x.jsxs("div", { className: "utility-login-state", children: [
    /* @__PURE__ */ x.jsx(Va, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ x.jsx("span", { className: "focus-kicker", children: "Your rhythm, remembered" }),
    /* @__PURE__ */ x.jsx("h3", { children: "Sign in to view your Focus Trail" }),
    /* @__PURE__ */ x.jsx("p", { children: "Track deep-work time, completed goals, and your study streak across devices." }),
    /* @__PURE__ */ x.jsx(Te, { variant: "primary", onClick: () => e == null ? void 0 : e(), children: "Sign in with Synapse" }),
    /* @__PURE__ */ x.jsx("small", { children: "Your current session continues without an account." })
  ] });
}
function uR({ onWorkspace: e, session: n }) {
  return !!n ? /* @__PURE__ */ x.jsxs("div", { className: "utility-empty-state", children: [
    /* @__PURE__ */ x.jsx(za, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ x.jsx("h3", { children: "Companion Room" }),
    /* @__PURE__ */ x.jsx("p", { children: "Invite a study partner from your Synapse workspace to share this quiet room." }),
    /* @__PURE__ */ x.jsx(Te, { variant: "primary", onClick: () => e == null ? void 0 : e("", "companion"), children: "Open Companion Room" })
  ] }) : /* @__PURE__ */ x.jsxs("div", { className: "utility-login-state", children: [
    /* @__PURE__ */ x.jsx(za, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ x.jsx("span", { className: "focus-kicker", children: "Study alongside someone" }),
    /* @__PURE__ */ x.jsx("h3", { children: "Sign in to use Companion Room" }),
    /* @__PURE__ */ x.jsx("p", { children: "Keep your own goal private while sharing the feeling of showing up together." }),
    /* @__PURE__ */ x.jsx(Te, { variant: "primary", onClick: () => e == null ? void 0 : e(), children: "Go to sign in" }),
    /* @__PURE__ */ x.jsx("small", { children: "No companion data is created in Focus Room." })
  ] });
}
function cR({ audioState: e, utilityPanel: n, onClose: o, onWorkspace: i }) {
  const a = K((y) => y.activeDrawer), f = K((y) => y.closeDrawer), d = K((y) => y.selectedScene), p = aR(), m = b.useMemo(() => Zn.find((y) => y.id === d) || Zn[0], [d]);
  return /* @__PURE__ */ x.jsxs(Ka, { children: [
    n === "trail" ? /* @__PURE__ */ x.jsx(ca, { title: "Focus Trail", kicker: "Your progress", icon: /* @__PURE__ */ x.jsx(Va, { size: 16 }), onClose: o, children: /* @__PURE__ */ x.jsx(lR, { onWorkspace: i, session: p }) }) : null,
    n === "companion" ? /* @__PURE__ */ x.jsx(ca, { title: "Companion Room", kicker: "Shared focus", icon: /* @__PURE__ */ x.jsx(za, { size: 16 }), onClose: o, children: /* @__PURE__ */ x.jsx(uR, { onWorkspace: i, session: p }) }) : null,
    n === "settings" ? /* @__PURE__ */ x.jsx(iR, { audioState: e, scene: m, onClose: o }) : null,
    !n && a === "scene" ? /* @__PURE__ */ x.jsx(ca, { title: "Choose scene", kicker: "Scene", icon: /* @__PURE__ */ x.jsx(G0, { size: 16 }), onClose: f, children: /* @__PURE__ */ x.jsx(uf, {}) }) : null,
    !n && a === "music" ? /* @__PURE__ */ x.jsx(ca, { title: "Sound atmosphere", kicker: "Room audio", icon: /* @__PURE__ */ x.jsx(Ja, { size: 16 }), onClose: f, children: /* @__PURE__ */ x.jsx(sR, { audioState: e, scene: m }) }) : null
  ] });
}
const dR = 2800;
function fR(e = "idle") {
  return e === "studying" ? { action: "pause", label: "Pause timer" } : e === "paused" ? { action: "start", label: "Resume timer" } : { action: "start", label: "Start timer" };
}
function pR({ pointerWithin: e = !1, focusWithin: n = !1 } = {}) {
  return !e && !n;
}
function mR(e, n) {
  return n ? Math.min(100, Math.max(0, e / n * 100)) : 0;
}
function hR({ onExit: e }) {
  const n = K((L) => L.elapsedSeconds), o = K((L) => L.pomodoroDuration), i = K((L) => L.pomodoroDurationSeconds), a = K((L) => L.timerMode), f = K((L) => L.timerStatus), d = K((L) => L.currentSession), p = K((L) => L.startTimer), m = K((L) => L.pauseTimer), y = K((L) => L.resetTimer), S = K((L) => L.skipTimer), [l, c] = b.useState(!1), v = b.useRef(null), w = b.useRef(!1), T = b.useRef(!1), A = b.useRef("pointer"), _ = Number(i) || (Number(o) || 0) * 60, C = a === "countup" ? n : Math.max(0, _ - n), E = fR(f), D = f === "paused" ? "Paused" : f === "completed" ? "Complete" : f === "studying" ? "In focus" : "Ready", O = b.useCallback(() => {
    v.current && (globalThis.clearTimeout(v.current), v.current = null);
  }, []), W = b.useCallback(() => {
    O(), v.current = globalThis.setTimeout(() => {
      pR({
        pointerWithin: w.current,
        focusWithin: T.current
      }) && c(!1);
    }, dR);
  }, [O]), H = b.useCallback(() => {
    c(!0), W();
  }, [W]);
  b.useEffect(() => {
    var se, Z, de;
    const L = () => {
      A.current = "pointer", T.current = !1, H();
    }, X = () => {
      A.current = "keyboard", H();
    };
    return (se = globalThis.addEventListener) == null || se.call(globalThis, "pointermove", L, { passive: !0 }), (Z = globalThis.addEventListener) == null || Z.call(globalThis, "pointerdown", L, { passive: !0 }), (de = globalThis.addEventListener) == null || de.call(globalThis, "keydown", X), () => {
      var ce, ye, ee;
      O(), (ce = globalThis.removeEventListener) == null || ce.call(globalThis, "pointermove", L), (ye = globalThis.removeEventListener) == null || ye.call(globalThis, "pointerdown", L), (ee = globalThis.removeEventListener) == null || ee.call(globalThis, "keydown", X);
    };
  }, [O, H]);
  const Y = () => {
    E.action === "pause" ? m() : p();
  };
  return /* @__PURE__ */ x.jsxs(
    "div",
    {
      className: `compact-focus-mode-card ${l ? "has-timer-controls" : ""}`.trim(),
      "aria-label": "Distraction-free focus timer",
      "data-timer-controls-visible": l ? "true" : "false",
      onPointerEnter: () => {
        w.current = !0, H();
      },
      onPointerLeave: () => {
        w.current = !1, W();
      },
      onFocusCapture: () => {
        T.current = A.current === "keyboard", H();
      },
      onBlurCapture: (L) => {
        T.current = !!L.currentTarget.contains(L.relatedTarget), W();
      },
      children: [
        /* @__PURE__ */ x.jsxs("div", { className: "compact-focus-card-top", children: [
          /* @__PURE__ */ x.jsxs("span", { children: [
            "POMODORO #",
            (d == null ? void 0 : d.pomodoroNumber) || 1
          ] }),
          /* @__PURE__ */ x.jsx(Te, { className: "compact-exit-button", onClick: e, "aria-label": "Exit Focus Mode", children: /* @__PURE__ */ x.jsx(FC, { size: 14, "aria-hidden": "true" }) })
        ] }),
        /* @__PURE__ */ x.jsxs("span", { className: "compact-focus-status", children: [
          /* @__PURE__ */ x.jsx("i", {}),
          D
        ] }),
        /* @__PURE__ */ x.jsx("strong", { "aria-live": "off", children: rd(C) }),
        /* @__PURE__ */ x.jsx("div", { className: "compact-focus-progress", "aria-hidden": "true", children: /* @__PURE__ */ x.jsx("span", { style: { width: `${mR(n, _)}%` } }) }),
        /* @__PURE__ */ x.jsxs("small", { children: [
          df(_),
          " session"
        ] }),
        /* @__PURE__ */ x.jsxs("div", { className: "compact-timer-controls", "aria-hidden": !l, inert: l ? void 0 : "", children: [
          /* @__PURE__ */ x.jsx(Te, { className: "compact-timer-control compact-timer-control-primary", variant: "primary", onClick: Y, "aria-label": E.label, title: E.label, children: E.action === "pause" ? /* @__PURE__ */ x.jsx(sd, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ x.jsx(U0, { size: 15, fill: "currentColor", "aria-hidden": "true" }) }),
          /* @__PURE__ */ x.jsx(Te, { className: "compact-timer-control", onClick: y, "aria-label": "Reset timer", title: "Reset timer", children: /* @__PURE__ */ x.jsx(H0, { size: 15, "aria-hidden": "true" }) }),
          /* @__PURE__ */ x.jsx(Te, { className: "compact-timer-control", onClick: S, "aria-label": "Skip timer", title: "Skip timer", children: /* @__PURE__ */ x.jsx(K0, { size: 15, "aria-hidden": "true" }) })
        ] }),
        /* @__PURE__ */ x.jsx("span", { className: "sr-only", children: "Move the pointer, tap, or use the keyboard to reveal timer controls. Press Escape to exit Focus Mode." })
      ]
    }
  );
}
var Tc = {};
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
function yR() {
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
            for (var v = 0; v < c._howls.length; v++)
              if (!c._howls[v]._webAudio)
                for (var w = c._howls[v]._getSoundIds(), T = 0; T < w.length; T++) {
                  var A = c._howls[v]._soundById(w[T]);
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
          for (var v = 0; v < c._howls.length; v++)
            if (!c._howls[v]._webAudio)
              for (var w = c._howls[v]._getSoundIds(), T = 0; T < w.length; T++) {
                var A = c._howls[v]._soundById(w[T]);
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
          var v = c.canPlayType("audio/mpeg;").replace(/^no$/, ""), w = l._navigator ? l._navigator.userAgent : "", T = w.match(/OPR\/(\d+)/g), A = T && parseInt(T[0].split("/")[1], 10) < 33, _ = w.indexOf("Safari") !== -1 && w.indexOf("Chrome") === -1, C = w.match(/Version\/(.*?) /), E = _ && C && parseInt(C[1], 10) < 15;
          return l._codecs = {
            mp3: !!(!A && (v || c.canPlayType("audio/mp3;").replace(/^no$/, ""))),
            mpeg: !!v,
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
            var c = function(v) {
              for (; l._html5AudioPool.length < l.html5PoolSize; )
                try {
                  var w = new Audio();
                  w._unlocked = !0, l._releaseHtml5Audio(w);
                } catch {
                  l.noAudio = !0;
                  break;
                }
              for (var T = 0; T < l._howls.length; T++)
                if (!l._howls[T]._webAudio)
                  for (var A = l._howls[T]._getSoundIds(), _ = 0; _ < A.length; _++) {
                    var C = l._howls[T]._soundById(A[_]);
                    C && C._node && !C._node._unlocked && (C._node._unlocked = !0, C._node.load());
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
                for (var v = 0; v < l._howls[c]._sounds.length; v++)
                  if (!l._howls[c]._sounds[v]._paused)
                    return l;
              }
            return l._suspendTimer && clearTimeout(l._suspendTimer), l._suspendTimer = setTimeout(function() {
              if (l.autoSuspend) {
                l._suspendTimer = null, l.state = "suspending";
                var w = function() {
                  l.state = "suspended", l._resumeAfterSuspend && (delete l._resumeAfterSuspend, l._autoResume());
                };
                l.ctx.suspend().then(w, w);
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
          for (var v = 0; v < l._src.length; v++) {
            var w, T;
            if (l._format && l._format[v])
              w = l._format[v];
            else {
              if (T = l._src[v], typeof T != "string") {
                l._emit("loaderror", null, "Non-string found in selected audio sources - ignoring.");
                continue;
              }
              w = /^data:audio\/([^;,]+);/i.exec(T), w || (w = /\.([^.]+)$/.exec(T.split("?", 1)[0])), w && (w = w[1].toLowerCase());
            }
            if (w || console.warn('No file extension was found. Consider using the "format" property or specify an extension.'), w && o.codecs(w)) {
              c = l._src[v];
              break;
            }
          }
          if (!c) {
            l._emit("loaderror", null, "No codec support for selected audio sources.");
            return;
          }
          return l._src = c, l._state = "loading", window.location.protocol === "https:" && c.slice(0, 5) === "http:" && (l._html5 = !0, l._webAudio = !1), new a(l), l._webAudio && d(l), l;
        },
        /**
         * Play a sound or resume previous playback.
         * @param  {String/Number} sprite   Sprite name for sprite playback or sound id to continue previous.
         * @param  {Boolean} internal Internal Use: true prevents event firing.
         * @return {Number}          Sound ID.
         */
        play: function(l, c) {
          var v = this, w = null;
          if (typeof l == "number")
            w = l, l = null;
          else {
            if (typeof l == "string" && v._state === "loaded" && !v._sprite[l])
              return null;
            if (typeof l > "u" && (l = "__default", !v._playLock)) {
              for (var T = 0, A = 0; A < v._sounds.length; A++)
                v._sounds[A]._paused && !v._sounds[A]._ended && (T++, w = v._sounds[A]._id);
              T === 1 ? l = null : w = null;
            }
          }
          var _ = w ? v._soundById(w) : v._inactiveSound();
          if (!_)
            return null;
          if (w && !l && (l = _._sprite || "__default"), v._state !== "loaded") {
            _._sprite = l, _._ended = !1;
            var C = _._id;
            return v._queue.push({
              event: "play",
              action: function() {
                v.play(C);
              }
            }), C;
          }
          if (w && !_._paused)
            return c || v._loadQueue("play"), _._id;
          v._webAudio && o._autoResume();
          var E = Math.max(0, _._seek > 0 ? _._seek : v._sprite[l][0] / 1e3), D = Math.max(0, (v._sprite[l][0] + v._sprite[l][1]) / 1e3 - E), O = D * 1e3 / Math.abs(_._rate), W = v._sprite[l][0] / 1e3, H = (v._sprite[l][0] + v._sprite[l][1]) / 1e3;
          _._sprite = l, _._ended = !1;
          var Y = function() {
            _._paused = !1, _._seek = E, _._start = W, _._stop = H, _._loop = !!(_._loop || v._sprite[l][2]);
          };
          if (E >= H) {
            v._ended(_);
            return;
          }
          var L = _._node;
          if (v._webAudio) {
            var X = function() {
              v._playLock = !1, Y(), v._refreshBuffer(_);
              var ce = _._muted || v._muted ? 0 : _._volume;
              L.gain.setValueAtTime(ce, o.ctx.currentTime), _._playStart = o.ctx.currentTime, typeof L.bufferSource.start > "u" ? _._loop ? L.bufferSource.noteGrainOn(0, E, 86400) : L.bufferSource.noteGrainOn(0, E, D) : _._loop ? L.bufferSource.start(0, E, 86400) : L.bufferSource.start(0, E, D), O !== 1 / 0 && (v._endTimers[_._id] = setTimeout(v._ended.bind(v, _), O)), c || setTimeout(function() {
                v._emit("play", _._id), v._loadQueue();
              }, 0);
            };
            o.state === "running" && o.ctx.state !== "interrupted" ? X() : (v._playLock = !0, v.once("resume", X), v._clearTimer(_._id));
          } else {
            var se = function() {
              L.currentTime = E, L.muted = _._muted || v._muted || o._muted || L.muted, L.volume = _._volume * o.volume(), L.playbackRate = _._rate;
              try {
                var ce = L.play();
                if (ce && typeof Promise < "u" && (ce instanceof Promise || typeof ce.then == "function") ? (v._playLock = !0, Y(), ce.then(function() {
                  v._playLock = !1, L._unlocked = !0, c ? v._loadQueue() : v._emit("play", _._id);
                }).catch(function() {
                  v._playLock = !1, v._emit("playerror", _._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction."), _._ended = !0, _._paused = !0;
                })) : c || (v._playLock = !1, Y(), v._emit("play", _._id)), L.playbackRate = _._rate, L.paused) {
                  v._emit("playerror", _._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.");
                  return;
                }
                l !== "__default" || _._loop ? v._endTimers[_._id] = setTimeout(v._ended.bind(v, _), O) : (v._endTimers[_._id] = function() {
                  v._ended(_), L.removeEventListener("ended", v._endTimers[_._id], !1);
                }, L.addEventListener("ended", v._endTimers[_._id], !1));
              } catch (ye) {
                v._emit("playerror", _._id, ye);
              }
            };
            L.src === "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA" && (L.src = v._src, L.load());
            var Z = window && window.ejecta || !L.readyState && o._navigator.isCocoonJS;
            if (L.readyState >= 3 || Z)
              se();
            else {
              v._playLock = !0, v._state = "loading";
              var de = function() {
                v._state = "loaded", se(), L.removeEventListener(o._canPlayEvent, de, !1);
              };
              L.addEventListener(o._canPlayEvent, de, !1), v._clearTimer(_._id);
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
          for (var v = c._getSoundIds(l), w = 0; w < v.length; w++) {
            c._clearTimer(v[w]);
            var T = c._soundById(v[w]);
            if (T && !T._paused && (T._seek = c.seek(v[w]), T._rateSeek = 0, T._paused = !0, c._stopFade(v[w]), T._node))
              if (c._webAudio) {
                if (!T._node.bufferSource)
                  continue;
                typeof T._node.bufferSource.stop > "u" ? T._node.bufferSource.noteOff(0) : T._node.bufferSource.stop(0), c._cleanBuffer(T._node);
              } else (!isNaN(T._node.duration) || T._node.duration === 1 / 0) && T._node.pause();
            arguments[1] || c._emit("pause", T ? T._id : null);
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
          var v = this;
          if (v._state !== "loaded" || v._playLock)
            return v._queue.push({
              event: "stop",
              action: function() {
                v.stop(l);
              }
            }), v;
          for (var w = v._getSoundIds(l), T = 0; T < w.length; T++) {
            v._clearTimer(w[T]);
            var A = v._soundById(w[T]);
            A && (A._seek = A._start || 0, A._rateSeek = 0, A._paused = !0, A._ended = !0, v._stopFade(w[T]), A._node && (v._webAudio ? A._node.bufferSource && (typeof A._node.bufferSource.stop > "u" ? A._node.bufferSource.noteOff(0) : A._node.bufferSource.stop(0), v._cleanBuffer(A._node)) : (!isNaN(A._node.duration) || A._node.duration === 1 / 0) && (A._node.currentTime = A._start || 0, A._node.pause(), A._node.duration === 1 / 0 && v._clearSound(A._node))), c || v._emit("stop", A._id));
          }
          return v;
        },
        /**
         * Mute/unmute a single sound or all sounds in this Howl group.
         * @param  {Boolean} muted Set to true to mute and false to unmute.
         * @param  {Number} id    The sound ID to update (omit to mute/unmute all).
         * @return {Howl}
         */
        mute: function(l, c) {
          var v = this;
          if (v._state !== "loaded" || v._playLock)
            return v._queue.push({
              event: "mute",
              action: function() {
                v.mute(l, c);
              }
            }), v;
          if (typeof c > "u")
            if (typeof l == "boolean")
              v._muted = l;
            else
              return v._muted;
          for (var w = v._getSoundIds(c), T = 0; T < w.length; T++) {
            var A = v._soundById(w[T]);
            A && (A._muted = l, A._interval && v._stopFade(A._id), v._webAudio && A._node ? A._node.gain.setValueAtTime(l ? 0 : A._volume, o.ctx.currentTime) : A._node && (A._node.muted = o._muted ? !0 : l), v._emit("mute", A._id));
          }
          return v;
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
          var l = this, c = arguments, v, w;
          if (c.length === 0)
            return l._volume;
          if (c.length === 1 || c.length === 2 && typeof c[1] > "u") {
            var T = l._getSoundIds(), A = T.indexOf(c[0]);
            A >= 0 ? w = parseInt(c[0], 10) : v = parseFloat(c[0]);
          } else c.length >= 2 && (v = parseFloat(c[0]), w = parseInt(c[1], 10));
          var _;
          if (typeof v < "u" && v >= 0 && v <= 1) {
            if (l._state !== "loaded" || l._playLock)
              return l._queue.push({
                event: "volume",
                action: function() {
                  l.volume.apply(l, c);
                }
              }), l;
            typeof w > "u" && (l._volume = v), w = l._getSoundIds(w);
            for (var C = 0; C < w.length; C++)
              _ = l._soundById(w[C]), _ && (_._volume = v, c[2] || l._stopFade(w[C]), l._webAudio && _._node && !_._muted ? _._node.gain.setValueAtTime(v, o.ctx.currentTime) : _._node && !_._muted && (_._node.volume = v * o.volume()), l._emit("volume", _._id));
          } else
            return _ = w ? l._soundById(w) : l._sounds[0], _ ? _._volume : 0;
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
        fade: function(l, c, v, w) {
          var T = this;
          if (T._state !== "loaded" || T._playLock)
            return T._queue.push({
              event: "fade",
              action: function() {
                T.fade(l, c, v, w);
              }
            }), T;
          l = Math.min(Math.max(0, parseFloat(l)), 1), c = Math.min(Math.max(0, parseFloat(c)), 1), v = parseFloat(v), T.volume(l, w);
          for (var A = T._getSoundIds(w), _ = 0; _ < A.length; _++) {
            var C = T._soundById(A[_]);
            if (C) {
              if (w || T._stopFade(A[_]), T._webAudio && !C._muted) {
                var E = o.ctx.currentTime, D = E + v / 1e3;
                C._volume = l, C._node.gain.setValueAtTime(l, E), C._node.gain.linearRampToValueAtTime(c, D);
              }
              T._startFadeInterval(C, l, c, v, A[_], typeof w > "u");
            }
          }
          return T;
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
        _startFadeInterval: function(l, c, v, w, T, A) {
          var _ = this, C = c, E = v - c, D = Math.abs(E / 0.01), O = Math.max(4, D > 0 ? w / D : w), W = Date.now();
          l._fadeTo = v, l._interval = setInterval(function() {
            var H = (Date.now() - W) / w;
            W = Date.now(), C += E * H, C = Math.round(C * 100) / 100, E < 0 ? C = Math.max(v, C) : C = Math.min(v, C), _._webAudio ? l._volume = C : _.volume(C, l._id, !0), A && (_._volume = C), (v < c && C <= v || v > c && C >= v) && (clearInterval(l._interval), l._interval = null, l._fadeTo = null, _.volume(v, l._id), _._emit("fade", l._id));
          }, O);
        },
        /**
         * Internal method that stops the currently playing fade when
         * a new fade starts, volume is changed or the sound is stopped.
         * @param  {Number} id The sound id.
         * @return {Howl}
         */
        _stopFade: function(l) {
          var c = this, v = c._soundById(l);
          return v && v._interval && (c._webAudio && v._node.gain.cancelScheduledValues(o.ctx.currentTime), clearInterval(v._interval), v._interval = null, c.volume(v._fadeTo, l), v._fadeTo = null, c._emit("fade", l)), c;
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
          var l = this, c = arguments, v, w, T;
          if (c.length === 0)
            return l._loop;
          if (c.length === 1)
            if (typeof c[0] == "boolean")
              v = c[0], l._loop = v;
            else
              return T = l._soundById(parseInt(c[0], 10)), T ? T._loop : !1;
          else c.length === 2 && (v = c[0], w = parseInt(c[1], 10));
          for (var A = l._getSoundIds(w), _ = 0; _ < A.length; _++)
            T = l._soundById(A[_]), T && (T._loop = v, l._webAudio && T._node && T._node.bufferSource && (T._node.bufferSource.loop = v, v && (T._node.bufferSource.loopStart = T._start || 0, T._node.bufferSource.loopEnd = T._stop, l.playing(A[_]) && (l.pause(A[_], !0), l.play(A[_], !0)))));
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
          var l = this, c = arguments, v, w;
          if (c.length === 0)
            w = l._sounds[0]._id;
          else if (c.length === 1) {
            var T = l._getSoundIds(), A = T.indexOf(c[0]);
            A >= 0 ? w = parseInt(c[0], 10) : v = parseFloat(c[0]);
          } else c.length === 2 && (v = parseFloat(c[0]), w = parseInt(c[1], 10));
          var _;
          if (typeof v == "number") {
            if (l._state !== "loaded" || l._playLock)
              return l._queue.push({
                event: "rate",
                action: function() {
                  l.rate.apply(l, c);
                }
              }), l;
            typeof w > "u" && (l._rate = v), w = l._getSoundIds(w);
            for (var C = 0; C < w.length; C++)
              if (_ = l._soundById(w[C]), _) {
                l.playing(w[C]) && (_._rateSeek = l.seek(w[C]), _._playStart = l._webAudio ? o.ctx.currentTime : _._playStart), _._rate = v, l._webAudio && _._node && _._node.bufferSource ? _._node.bufferSource.playbackRate.setValueAtTime(v, o.ctx.currentTime) : _._node && (_._node.playbackRate = v);
                var E = l.seek(w[C]), D = (l._sprite[_._sprite][0] + l._sprite[_._sprite][1]) / 1e3 - E, O = D * 1e3 / Math.abs(_._rate);
                (l._endTimers[w[C]] || !_._paused) && (l._clearTimer(w[C]), l._endTimers[w[C]] = setTimeout(l._ended.bind(l, _), O)), l._emit("rate", _._id);
              }
          } else
            return _ = l._soundById(w), _ ? _._rate : l._rate;
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
          var l = this, c = arguments, v, w;
          if (c.length === 0)
            l._sounds.length && (w = l._sounds[0]._id);
          else if (c.length === 1) {
            var T = l._getSoundIds(), A = T.indexOf(c[0]);
            A >= 0 ? w = parseInt(c[0], 10) : l._sounds.length && (w = l._sounds[0]._id, v = parseFloat(c[0]));
          } else c.length === 2 && (v = parseFloat(c[0]), w = parseInt(c[1], 10));
          if (typeof w > "u")
            return 0;
          if (typeof v == "number" && (l._state !== "loaded" || l._playLock))
            return l._queue.push({
              event: "seek",
              action: function() {
                l.seek.apply(l, c);
              }
            }), l;
          var _ = l._soundById(w);
          if (_)
            if (typeof v == "number" && v >= 0) {
              var C = l.playing(w);
              C && l.pause(w, !0), _._seek = v, _._ended = !1, l._clearTimer(w), !l._webAudio && _._node && !isNaN(_._node.duration) && (_._node.currentTime = v);
              var E = function() {
                C && l.play(w, !0), l._emit("seek", w);
              };
              if (C && !l._webAudio) {
                var D = function() {
                  l._playLock ? setTimeout(D, 0) : E();
                };
                setTimeout(D, 0);
              } else
                E();
            } else if (l._webAudio) {
              var O = l.playing(w) ? o.ctx.currentTime - _._playStart : 0, W = _._rateSeek ? _._rateSeek - _._seek : 0;
              return _._seek + (W + O * Math.abs(_._rate));
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
            var v = c._soundById(l);
            return v ? !v._paused : !1;
          }
          for (var w = 0; w < c._sounds.length; w++)
            if (!c._sounds[w]._paused)
              return !0;
          return !1;
        },
        /**
         * Get the duration of this sound. Passing a sound id will return the sprite duration.
         * @param  {Number} id The sound id to check. If none is passed, return full source duration.
         * @return {Number} Audio duration in seconds.
         */
        duration: function(l) {
          var c = this, v = c._duration, w = c._soundById(l);
          return w && (v = c._sprite[w._sprite][1] / 1e3), v;
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
          for (var l = this, c = l._sounds, v = 0; v < c.length; v++)
            c[v]._paused || l.stop(c[v]._id), l._webAudio || (l._clearSound(c[v]._node), c[v]._node.removeEventListener("error", c[v]._errorFn, !1), c[v]._node.removeEventListener(o._canPlayEvent, c[v]._loadFn, !1), c[v]._node.removeEventListener("ended", c[v]._endFn, !1), o._releaseHtml5Audio(c[v]._node)), delete c[v]._node, l._clearTimer(c[v]._id);
          var w = o._howls.indexOf(l);
          w >= 0 && o._howls.splice(w, 1);
          var T = !0;
          for (v = 0; v < o._howls.length; v++)
            if (o._howls[v]._src === l._src || l._src.indexOf(o._howls[v]._src) >= 0) {
              T = !1;
              break;
            }
          return f && T && delete f[l._src], o.noAudio = !1, l._state = "unloaded", l._sounds = [], l = null, null;
        },
        /**
         * Listen to a custom event.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to call.
         * @param  {Number}   id    (optional) Only listen to events for this sound.
         * @param  {Number}   once  (INTERNAL) Marks event to fire only once.
         * @return {Howl}
         */
        on: function(l, c, v, w) {
          var T = this, A = T["_on" + l];
          return typeof c == "function" && A.push(w ? { id: v, fn: c, once: w } : { id: v, fn: c }), T;
        },
        /**
         * Remove a custom event. Call without parameters to remove all events.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to remove. Leave empty to remove all.
         * @param  {Number}   id    (optional) Only remove events for this sound.
         * @return {Howl}
         */
        off: function(l, c, v) {
          var w = this, T = w["_on" + l], A = 0;
          if (typeof c == "number" && (v = c, c = null), c || v)
            for (A = 0; A < T.length; A++) {
              var _ = v === T[A].id;
              if (c === T[A].fn && _ || !c && _) {
                T.splice(A, 1);
                break;
              }
            }
          else if (l)
            w["_on" + l] = [];
          else {
            var C = Object.keys(w);
            for (A = 0; A < C.length; A++)
              C[A].indexOf("_on") === 0 && Array.isArray(w[C[A]]) && (w[C[A]] = []);
          }
          return w;
        },
        /**
         * Listen to a custom event and remove it once fired.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to call.
         * @param  {Number}   id    (optional) Only listen to events for this sound.
         * @return {Howl}
         */
        once: function(l, c, v) {
          var w = this;
          return w.on(l, c, v, 1), w;
        },
        /**
         * Emit all events of a specific type and pass the sound id.
         * @param  {String} event Event name.
         * @param  {Number} id    Sound ID.
         * @param  {Number} msg   Message to go with event.
         * @return {Howl}
         */
        _emit: function(l, c, v) {
          for (var w = this, T = w["_on" + l], A = T.length - 1; A >= 0; A--)
            (!T[A].id || T[A].id === c || l === "load") && (setTimeout((function(_) {
              _.call(this, c, v);
            }).bind(w, T[A].fn), 0), T[A].once && w.off(l, T[A].fn, T[A].id));
          return w._loadQueue(l), w;
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
            var v = c._queue[0];
            v.event === l && (c._queue.shift(), c._loadQueue()), l || v.action();
          }
          return c;
        },
        /**
         * Fired when playback ends at the end of the duration.
         * @param  {Sound} sound The sound object to work with.
         * @return {Howl}
         */
        _ended: function(l) {
          var c = this, v = l._sprite;
          if (!c._webAudio && l._node && !l._node.paused && !l._node.ended && l._node.currentTime < l._stop)
            return setTimeout(c._ended.bind(c, l), 100), c;
          var w = !!(l._loop || c._sprite[v][2]);
          if (c._emit("end", l._id), !c._webAudio && w && c.stop(l._id, !0).play(l._id), c._webAudio && w) {
            c._emit("play", l._id), l._seek = l._start || 0, l._rateSeek = 0, l._playStart = o.ctx.currentTime;
            var T = (l._stop - l._start) * 1e3 / Math.abs(l._rate);
            c._endTimers[l._id] = setTimeout(c._ended.bind(c, l), T);
          }
          return c._webAudio && !w && (l._paused = !0, l._ended = !0, l._seek = l._start || 0, l._rateSeek = 0, c._clearTimer(l._id), c._cleanBuffer(l._node), o._autoSuspend()), !c._webAudio && !w && c.stop(l._id, !0), c;
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
              var v = c._soundById(l);
              v && v._node && v._node.removeEventListener("ended", c._endTimers[l], !1);
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
          for (var c = this, v = 0; v < c._sounds.length; v++)
            if (l === c._sounds[v]._id)
              return c._sounds[v];
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
          var l = this, c = l._pool, v = 0, w = 0;
          if (!(l._sounds.length < c)) {
            for (w = 0; w < l._sounds.length; w++)
              l._sounds[w]._ended && v++;
            for (w = l._sounds.length - 1; w >= 0; w--) {
              if (v <= c)
                return;
              l._sounds[w]._ended && (l._webAudio && l._sounds[w]._node && l._sounds[w]._node.disconnect(0), l._sounds.splice(w, 1), v--);
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
            for (var v = [], w = 0; w < c._sounds.length; w++)
              v.push(c._sounds[w]._id);
            return v;
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
          return l._node.bufferSource = o.ctx.createBufferSource(), l._node.bufferSource.buffer = f[c._src], l._panner ? l._node.bufferSource.connect(l._panner) : l._node.bufferSource.connect(l._node), l._node.bufferSource.loop = l._loop, l._loop && (l._node.bufferSource.loopStart = l._start || 0, l._node.bufferSource.loopEnd = l._stop || 0), l._node.bufferSource.playbackRate.setValueAtTime(l._rate, o.ctx.currentTime), c;
        },
        /**
         * Prevent memory leaks by cleaning up the buffer source after playback.
         * @param  {Object} node Sound's audio node containing the buffer source.
         * @return {Howl}
         */
        _cleanBuffer: function(l) {
          var c = this, v = o._navigator && o._navigator.vendor.indexOf("Apple") >= 0;
          if (!l.bufferSource)
            return c;
          if (o._scratchBuffer && l.bufferSource && (l.bufferSource.onended = null, l.bufferSource.disconnect(0), v))
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
          var l = this, c = l._parent, v = o._muted || l._muted || l._parent._muted ? 0 : l._volume;
          return c._webAudio ? (l._node = typeof o.ctx.createGain > "u" ? o.ctx.createGainNode() : o.ctx.createGain(), l._node.gain.setValueAtTime(v, o.ctx.currentTime), l._node.paused = !0, l._node.connect(o.masterGain)) : o.noAudio || (l._node = o._obtainHtml5Audio(), l._errorFn = l._errorListener.bind(l), l._node.addEventListener("error", l._errorFn, !1), l._loadFn = l._loadListener.bind(l), l._node.addEventListener(o._canPlayEvent, l._loadFn, !1), l._endFn = l._endListener.bind(l), l._node.addEventListener("ended", l._endFn, !1), l._node.src = c._src, l._node.preload = c._preload === !0 ? "auto" : c._preload, l._node.volume = v * o.volume(), l._node.load()), l;
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
      var f = {}, d = function(l) {
        var c = l._src;
        if (f[c]) {
          l._duration = f[c].duration, y(l);
          return;
        }
        if (/^data:[^;]+;base64,/.test(c)) {
          for (var v = atob(c.split(",")[1]), w = new Uint8Array(v.length), T = 0; T < v.length; ++T)
            w[T] = v.charCodeAt(T);
          m(w.buffer, l);
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
            l._webAudio && (l._html5 = !0, l._webAudio = !1, l._sounds = [], delete f[c], l.load());
          }, p(A);
        }
      }, p = function(l) {
        try {
          l.send();
        } catch {
          l.onerror();
        }
      }, m = function(l, c) {
        var v = function() {
          c._emit("loaderror", null, "Decoding audio data failed.");
        }, w = function(T) {
          T && c._sounds.length > 0 ? (f[c._src] = T, y(c, T)) : v();
        };
        typeof Promise < "u" && o.ctx.decodeAudioData.length === 1 ? o.ctx.decodeAudioData(l).then(w).catch(v) : o.ctx.decodeAudioData(l, w, v);
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
          var l = /iP(hone|od|ad)/.test(o._navigator && o._navigator.platform), c = o._navigator && o._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/), v = c ? parseInt(c[1], 10) : null;
          if (l && v && v < 9) {
            var w = /safari/.test(o._navigator && o._navigator.userAgent.toLowerCase());
            o._navigator && !w && (o.usingWebAudio = !1);
          }
          o.usingWebAudio && (o.masterGain = typeof o.ctx.createGain > "u" ? o.ctx.createGainNode() : o.ctx.createGain(), o.masterGain.gain.setValueAtTime(o._muted ? 0 : o._volume, o.ctx.currentTime), o.masterGain.connect(o.ctx.destination)), o._setup();
        }
      };
      e.Howler = o, e.Howl = i, typeof di < "u" ? (di.HowlerGlobal = n, di.Howler = o, di.Howl = i, di.Sound = a) : typeof window < "u" && (window.HowlerGlobal = n, window.Howler = o, window.Howl = i, window.Sound = a);
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
        var f = this;
        if (!f.ctx || !f.ctx.listener)
          return f;
        if (i = typeof i != "number" ? f._pos[1] : i, a = typeof a != "number" ? f._pos[2] : a, typeof o == "number")
          f._pos = [o, i, a], typeof f.ctx.listener.positionX < "u" ? (f.ctx.listener.positionX.setTargetAtTime(f._pos[0], Howler.ctx.currentTime, 0.1), f.ctx.listener.positionY.setTargetAtTime(f._pos[1], Howler.ctx.currentTime, 0.1), f.ctx.listener.positionZ.setTargetAtTime(f._pos[2], Howler.ctx.currentTime, 0.1)) : f.ctx.listener.setPosition(f._pos[0], f._pos[1], f._pos[2]);
        else
          return f._pos;
        return f;
      }, HowlerGlobal.prototype.orientation = function(o, i, a, f, d, p) {
        var m = this;
        if (!m.ctx || !m.ctx.listener)
          return m;
        var y = m._orientation;
        if (i = typeof i != "number" ? y[1] : i, a = typeof a != "number" ? y[2] : a, f = typeof f != "number" ? y[3] : f, d = typeof d != "number" ? y[4] : d, p = typeof p != "number" ? y[5] : p, typeof o == "number")
          m._orientation = [o, i, a, f, d, p], typeof m.ctx.listener.forwardX < "u" ? (m.ctx.listener.forwardX.setTargetAtTime(o, Howler.ctx.currentTime, 0.1), m.ctx.listener.forwardY.setTargetAtTime(i, Howler.ctx.currentTime, 0.1), m.ctx.listener.forwardZ.setTargetAtTime(a, Howler.ctx.currentTime, 0.1), m.ctx.listener.upX.setTargetAtTime(f, Howler.ctx.currentTime, 0.1), m.ctx.listener.upY.setTargetAtTime(d, Howler.ctx.currentTime, 0.1), m.ctx.listener.upZ.setTargetAtTime(p, Howler.ctx.currentTime, 0.1)) : m.ctx.listener.setOrientation(o, i, a, f, d, p);
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
        var f = typeof Howler.ctx.createStereoPanner > "u" ? "spatial" : "stereo";
        if (typeof i > "u")
          if (typeof o == "number")
            a._stereo = o, a._pos = [o, 0, 0];
          else
            return a._stereo;
        for (var d = a._getSoundIds(i), p = 0; p < d.length; p++) {
          var m = a._soundById(d[p]);
          if (m)
            if (typeof o == "number")
              m._stereo = o, m._pos = [o, 0, 0], m._node && (m._pannerAttr.panningModel = "equalpower", (!m._panner || !m._panner.pan) && n(m, f), f === "spatial" ? typeof m._panner.positionX < "u" ? (m._panner.positionX.setValueAtTime(o, Howler.ctx.currentTime), m._panner.positionY.setValueAtTime(0, Howler.ctx.currentTime), m._panner.positionZ.setValueAtTime(0, Howler.ctx.currentTime)) : m._panner.setPosition(o, 0, 0) : m._panner.pan.setValueAtTime(o, Howler.ctx.currentTime)), a._emit("stereo", m._id);
            else
              return m._stereo;
        }
        return a;
      }, Howl.prototype.pos = function(o, i, a, f) {
        var d = this;
        if (!d._webAudio)
          return d;
        if (d._state !== "loaded")
          return d._queue.push({
            event: "pos",
            action: function() {
              d.pos(o, i, a, f);
            }
          }), d;
        if (i = typeof i != "number" ? 0 : i, a = typeof a != "number" ? -0.5 : a, typeof f > "u")
          if (typeof o == "number")
            d._pos = [o, i, a];
          else
            return d._pos;
        for (var p = d._getSoundIds(f), m = 0; m < p.length; m++) {
          var y = d._soundById(p[m]);
          if (y)
            if (typeof o == "number")
              y._pos = [o, i, a], y._node && ((!y._panner || y._panner.pan) && n(y, "spatial"), typeof y._panner.positionX < "u" ? (y._panner.positionX.setValueAtTime(o, Howler.ctx.currentTime), y._panner.positionY.setValueAtTime(i, Howler.ctx.currentTime), y._panner.positionZ.setValueAtTime(a, Howler.ctx.currentTime)) : y._panner.setPosition(o, i, a)), d._emit("pos", y._id);
            else
              return y._pos;
        }
        return d;
      }, Howl.prototype.orientation = function(o, i, a, f) {
        var d = this;
        if (!d._webAudio)
          return d;
        if (d._state !== "loaded")
          return d._queue.push({
            event: "orientation",
            action: function() {
              d.orientation(o, i, a, f);
            }
          }), d;
        if (i = typeof i != "number" ? d._orientation[1] : i, a = typeof a != "number" ? d._orientation[2] : a, typeof f > "u")
          if (typeof o == "number")
            d._orientation = [o, i, a];
          else
            return d._orientation;
        for (var p = d._getSoundIds(f), m = 0; m < p.length; m++) {
          var y = d._soundById(p[m]);
          if (y)
            if (typeof o == "number")
              y._orientation = [o, i, a], y._node && (y._panner || (y._pos || (y._pos = d._pos || [0, 0, -0.5]), n(y, "spatial")), typeof y._panner.orientationX < "u" ? (y._panner.orientationX.setValueAtTime(o, Howler.ctx.currentTime), y._panner.orientationY.setValueAtTime(i, Howler.ctx.currentTime), y._panner.orientationZ.setValueAtTime(a, Howler.ctx.currentTime)) : y._panner.setOrientation(o, i, a)), d._emit("orientation", y._id);
            else
              return y._orientation;
        }
        return d;
      }, Howl.prototype.pannerAttr = function() {
        var o = this, i = arguments, a, f, d;
        if (!o._webAudio)
          return o;
        if (i.length === 0)
          return o._pannerAttr;
        if (i.length === 1)
          if (typeof i[0] == "object")
            a = i[0], typeof f > "u" && (a.pannerAttr || (a.pannerAttr = {
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
            return d = o._soundById(parseInt(i[0], 10)), d ? d._pannerAttr : o._pannerAttr;
        else i.length === 2 && (a = i[0], f = parseInt(i[1], 10));
        for (var p = o._getSoundIds(f), m = 0; m < p.length; m++)
          if (d = o._soundById(p[m]), d) {
            var y = d._pannerAttr;
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
            var S = d._panner;
            S || (d._pos || (d._pos = o._pos || [0, 0, -0.5]), n(d, "spatial"), S = d._panner), S.coneInnerAngle = y.coneInnerAngle, S.coneOuterAngle = y.coneOuterAngle, S.coneOuterGain = y.coneOuterGain, S.distanceModel = y.distanceModel, S.maxDistance = y.maxDistance, S.refDistance = y.refDistance, S.rolloffFactor = y.rolloffFactor, S.panningModel = y.panningModel;
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
  })(Tc)), Tc;
}
var gR = yR();
const vR = /* @__PURE__ */ Fg(gR), { Howl: aw } = vR, kd = 500, Rt = {
  music: null,
  ambient: /* @__PURE__ */ new Map()
};
let vr = {}, _i = !1, Ad = "";
function Ei() {
  return typeof aw == "function";
}
function kc(e, n = 50) {
  const o = Number(e), i = Number.isFinite(o) ? o : n;
  return Math.min(1, Math.max(0, i / 100));
}
function lw(e) {
  return new aw({
    src: [e],
    loop: !0,
    html5: !0,
    preload: !0,
    volume: 0
  });
}
function uw(e, n, o = kd) {
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
function el(e, { unload: n = !1 } = {}) {
  var o;
  e && (uw(e, 0, Math.min(kd, 300)), (o = globalThis.setTimeout) == null || o.call(globalThis, () => {
    try {
      e.pause(), n && e.unload();
    } catch {
    }
  }, Math.min(kd, 320)));
}
function SR(e) {
  return !(e != null && e.streamUrl) || !Ei() ? null : ((!Rt.music || Rt.music.__synapseSrc !== e.streamUrl) && (el(Rt.music, { unload: !0 }), Rt.music = lw(e.streamUrl), Rt.music.__synapseSrc = e.streamUrl), Rt.music);
}
function wR(e) {
  if (!(e != null && e.streamUrl) || !Ei()) return null;
  const n = e.id || e.streamUrl, o = Rt.ambient.get(n);
  if (o && o.__synapseSrc === e.streamUrl) return o;
  el(o, { unload: !0 });
  const i = lw(e.streamUrl);
  return i.__synapseSrc = e.streamUrl, Rt.ambient.set(n, i), i;
}
function xR() {
  return [
    Rt.music,
    ...Rt.ambient.values()
  ].filter(Boolean);
}
function cw() {
  xR().forEach((e) => el(e));
}
function _R(e) {
  for (const [n, o] of Rt.ambient.entries())
    e.has(n) || (el(o, { unload: !0 }), Rt.ambient.delete(n));
}
function Eg(e, n) {
  if (e)
    try {
      e.playing() || e.play(), uw(e, n), Ad = "";
    } catch (o) {
      Ad = (o == null ? void 0 : o.message) || "Audio playback is blocked until the browser receives a user action.";
    }
}
async function TR(e = {}) {
  vr = { ...vr, ...e };
  const n = Qa(vr);
  if (!Ei()) return ka(n);
  if (!_i)
    return cw(), ka(n);
  const o = SR(n.musicTrack), i = kc(vr.musicVolume, 60), a = kc(vr.ambientVolume, 50), f = /* @__PURE__ */ new Set(), d = [];
  return n.ambientLayers.forEach((p) => {
    var c;
    const m = p.id || p.streamUrl;
    f.add(m);
    const y = wR(p), S = Number((c = vr.audioChannels) == null ? void 0 : c[p.id]), l = Number.isFinite(S) ? kc(S, 0) : Math.min(1, Math.max(0, a * (p.volumeBias ?? 1)));
    d.push([y, l]);
  }), _R(f), Eg(o, i), d.forEach(([p, m]) => Eg(p, m)), ka(n);
}
function kR(e) {
  return _i = !!e, _i || cw(), _i;
}
function ka(e = Qa(vr)) {
  var n, o, i, a;
  return {
    available: Ei(),
    playing: _i && Ei(),
    musicTitle: ((n = e.musicTrack) == null ? void 0 : n.title) || "",
    musicArtist: ((o = e.musicTrack) == null ? void 0 : o.artist) || "",
    musicPageUrl: ((i = e.musicTrack) == null ? void 0 : i.pageUrl) || "",
    musicAttribution: ((a = e.musicTrack) == null ? void 0 : a.attribution) || "",
    ambientTitles: e.ambientLayers.map((f) => f.title).filter(Boolean),
    ambientPageUrls: e.ambientLayers.map((f) => f.pageUrl).filter(Boolean),
    ambientAttributions: e.ambientLayers.map((f) => f.attribution).filter(Boolean),
    error: Ad
  };
}
const AR = "synapse.focusRoom.audioPrefs.v1";
function bR(e) {
  var n;
  try {
    (n = globalThis.localStorage) == null || n.setItem(AR, JSON.stringify({
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
function CR() {
  const e = K((m) => m.musicType), n = K((m) => m.ambientSound), o = K((m) => m.musicVolume), i = K((m) => m.ambientVolume), a = K((m) => m.audioChannels), f = K((m) => m.audioPlaying), [d, p] = b.useState(() => ka(Qa({
    musicType: e,
    ambientSound: n
  })));
  return b.useEffect(() => {
    const m = { musicType: e, ambientSound: n, musicVolume: o, ambientVolume: i, audioChannels: a };
    let y = !1;
    return kR(f), bR(m), TR(m).then((S) => {
      y || p(S);
    }), () => {
      y = !0;
    };
  }, [n, i, a, f, e, o]), d;
}
function PR() {
  const e = K(), n = b.useCallback(async (i = "", a = "", f = {}) => {
    var S;
    e.pauseTimer({ pauseAudio: !0 }), e.closeSummary();
    const d = typeof i == "string" || typeof i == "number" ? i : "", p = typeof a == "string" ? a : "", m = ER(p, f), y = String(d || e.selectedMaterialId || ((S = e.selectedMaterial) == null ? void 0 : S.materialId) || "");
    if (typeof globalThis.returnFromFocusRoomToWorkspace == "function")
      try {
        const l = globalThis.returnFromFocusRoomToWorkspace(y, m);
        l && typeof l.then == "function" && await l, Mg(m.action || p, m);
        return;
      } catch (l) {
        console.error("Could not return from Focus Room:", l);
      }
    globalThis.location.hash = "", Mg(m.action || p, m);
  }, [e]), o = b.useMemo(() => ({
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
  return globalThis.__synapseFocusRoomApi = o, b.useEffect(() => {
    globalThis.__synapseFocusRoomApi = o;
  }, [o]), {
    ...e,
    returnToWorkspace: n
  };
}
function dw(e) {
  const n = String(e || "").trim().toLowerCase();
  return ["flashcards", "quiz", "assistant", "mindmap", "timeline", "source", "notes"].includes(n) ? n : "";
}
function ER(e, n = {}) {
  const o = n && typeof n == "object" && !Array.isArray(n) ? n : {}, i = dw(e || o.action);
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
  const o = dw(e);
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
function MR(e = 3e3) {
  const n = K((i) => i.setIdle), o = K((i) => i.isIdle);
  return b.useEffect(() => {
    let i;
    const a = () => {
      n(!1), clearTimeout(i), i = setTimeout(() => n(!0), e);
    };
    return window.addEventListener("mousemove", a), window.addEventListener("keydown", a), window.addEventListener("click", a), a(), () => {
      clearTimeout(i), window.removeEventListener("mousemove", a), window.removeEventListener("keydown", a), window.removeEventListener("click", a);
    };
  }, [e, n]), o;
}
function RR() {
  const e = K((i) => i.timerState || (i.timerStatus === "studying" ? "running" : i.timerStatus)), n = K((i) => i.view), o = K((i) => i.tickTimer);
  b.useEffect(() => {
    if (n !== "session" || e !== "running" || typeof window > "u") return;
    let i = !0;
    const a = () => {
      i && o();
    }, f = window.setInterval(a, 1e3), d = () => {
      document.visibilityState === "visible" && a();
    };
    return document.addEventListener("visibilitychange", d), a(), () => {
      i = !1, window.clearInterval(f), document.removeEventListener("visibilitychange", d);
    };
  }, [o, e, n]);
}
function DR() {
  const e = K((n) => n.selectedScene);
  return vn(e);
}
function NR(e) {
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
function jR() {
  const [e, n] = b.useState(""), [o, i] = b.useState(!1), [a, f] = b.useState(!1), d = K((_) => _.view), p = MR(3e3), m = DR(), y = CR(), S = PR();
  RR();
  const l = K(R1(NR)), c = K((_) => _.summaryRecord), v = K((_) => _.endSession), w = K((_) => _.initializeFocusRoom);
  b.useEffect(() => {
    w();
  }, [w]), b.useEffect(() => {
    var D;
    const _ = document.documentElement, C = _.dataset.theme, E = _.style.colorScheme;
    return _.dataset.theme = "dark", _.style.colorScheme = "dark", (D = document.body) == null || D.classList.add("synapse-theme-dark"), () => {
      var O;
      (O = document.body) != null && O.classList.contains("focus-room-standalone") || (C && (_.dataset.theme = C), _.style.colorScheme = E);
    };
  }, []), b.useEffect(() => {
    l != null && l.materialId && rf(l.materialId, l);
  }, [l]), b.useEffect(() => {
    d === "session" || !c || Sa("focus-room");
  }, [c, d]), b.useEffect(() => {
    d !== "session" && (i(!1), n(""), f(!1));
  }, [d]), b.useEffect(() => {
    const _ = (C) => {
      C.key === "Escape" && (o ? (C.preventDefault(), i(!1)) : e ? n("") : a && f(!1));
    };
    return window.addEventListener("keydown", _), () => window.removeEventListener("keydown", _);
  }, [a, o, e]);
  const T = (..._) => {
    S.returnToWorkspace(..._);
  }, A = async () => {
    f(!1), i(!1), n(""), v(), await T();
  };
  return /* @__PURE__ */ x.jsxs(
    "main",
    {
      id: "focusRoomSurface",
      className: `focus-room-surface react-focus-room ${p ? "is-idle" : ""} ${d === "setup" ? "is-setup is-innook-setup" : "is-session"}`.trim(),
      "aria-live": "polite",
      "data-focus-room-view": d,
      children: [
        /* @__PURE__ */ x.jsx(dC, { scene: m }),
        /* @__PURE__ */ x.jsxs(Ka, { mode: "wait", children: [
          d === "setup" ? /* @__PURE__ */ x.jsx(
            Sn.div,
            {
              className: "focus-room-view focus-setup-view",
              initial: { opacity: 0, y: 16 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -10 },
              transition: Ia,
              children: /* @__PURE__ */ x.jsx(TP, { audioState: y, onWorkspace: T })
            },
            "setup"
          ) : null,
          d === "session" ? /* @__PURE__ */ x.jsxs(
            Sn.div,
            {
              className: "focus-room-view focus-session-view",
              initial: { opacity: 0, y: 14 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -8 },
              transition: Ia,
              children: [
                o ? /* @__PURE__ */ x.jsx("button", { type: "button", className: "focus-mode-exit-hit-area", onClick: () => i(!1), children: "Exit Focus Mode" }) : /* @__PURE__ */ x.jsx(kP, { onWorkspace: T, onOpenTrail: () => n("trail"), onOpenCompanion: () => n("companion"), onOpenSettings: () => n("settings"), onExit: () => f(!0) }),
                /* @__PURE__ */ x.jsx("section", { className: `focus-session-stage ${o ? "is-focus-mode" : ""}`.trim(), "aria-hidden": "true" }),
                o ? /* @__PURE__ */ x.jsx(hR, { onExit: () => i(!1) }) : /* @__PURE__ */ x.jsx(DP, { audioState: y, onFocusMode: () => i(!0) }),
                o ? null : /* @__PURE__ */ x.jsx(cR, { audioState: y, utilityPanel: e, onClose: () => n(""), onWorkspace: T }),
                /* @__PURE__ */ x.jsx(vM, {}),
                /* @__PURE__ */ x.jsx(IR, { open: a, onClose: () => f(!1), onConfirm: A })
              ]
            },
            "session"
          ) : null
        ] })
      ]
    }
  );
}
function IR({ open: e, onClose: n, onConfirm: o }) {
  return e ? /* @__PURE__ */ x.jsx("div", { className: "focus-exit-overlay", role: "presentation", children: /* @__PURE__ */ x.jsxs("div", { className: "focus-exit-dialog liquid-glass", role: "dialog", "aria-modal": "true", "aria-labelledby": "focus-exit-title", children: [
    /* @__PURE__ */ x.jsx("span", { className: "focus-kicker", children: "Leave this room?" }),
    /* @__PURE__ */ x.jsx("h2", { id: "focus-exit-title", children: "End focus session" }),
    /* @__PURE__ */ x.jsx("p", { children: "Your focused time will be saved to your Focus Trail." }),
    /* @__PURE__ */ x.jsxs("div", { className: "focus-button-row", children: [
      /* @__PURE__ */ x.jsx(Te, { onClick: n, children: "Continue focusing" }),
      /* @__PURE__ */ x.jsx(Te, { variant: "primary", onClick: o, children: "End and exit" })
    ] })
  ] }) }) : null;
}
let Ac = null;
function FR(e, n) {
  const o = globalThis.__synapseFocusRoomApi || {};
  if (typeof o[e] != "function") {
    console.warn(`Synapse Focus Room action "${e}" is not available yet.`);
    return;
  }
  return o[e](...n);
}
function OR() {
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
    globalThis[n] = (...i) => FR(o, i);
  });
}
function LR(e = {}) {
  OR();
  const n = e.root || document.getElementById("focusRoomRoot");
  if (!n)
    throw new Error("Focus Room root element was not found.");
  Ac || (Ac = b1.createRoot(n), Ac.render(
    gn.createElement(
      gn.StrictMode,
      null,
      gn.createElement(jR)
    )
  ));
}
const VR = "synapse.generated.history.v6", fw = "synapse.active.generated.v6", zR = "synapse.flashcards.deck.v1", BR = "synapse.quiz.history.v1", $R = "synapse.focusRoom.return-target.v1";
function Cf(e, n) {
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
function UR(e, n) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, n), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function HR(e, n) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, JSON.stringify(n)), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function pw() {
  const e = Cf(VR, []);
  return Array.isArray(e) ? e : [];
}
function WR(e) {
  const n = String((e == null ? void 0 : e.title) || "").trim();
  return n || String((e == null ? void 0 : e.summary) || "").split(/\n+/).map((i) => i.replace(/^#+\s*/, "").trim()).find((i) => i.length > 4) || "Generated Study Notes";
}
function mw(e = {}) {
  return [
    e.id ? `history:${e.id}` : "",
    e.sourceFingerprint ? `fingerprint:${e.sourceFingerprint}` : "",
    e.clientFingerprint ? `fingerprint:${e.clientFingerprint}` : ""
  ].filter(Boolean);
}
function GR(e = {}) {
  const n = Cf(zR, {}), i = mw(e).map((a) => n == null ? void 0 : n[a]).find((a) => a && Array.isArray(a.cards) && a.cards.length);
  return (i == null ? void 0 : i.cards) || [];
}
function KR(e = {}) {
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
function YR(e = []) {
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
function QR(e = {}) {
  const n = Cf(BR, {}), i = mw(e).flatMap((f) => Array.isArray(n == null ? void 0 : n[f]) ? n[f] : []), a = /* @__PURE__ */ new Set();
  return YR(i).filter((f) => {
    const d = KR(f);
    return !d || a.has(d) ? !1 : (a.add(d), !0);
  }).sort((f, d) => new Date(d.createdAt || 0) - new Date(f.createdAt || 0));
}
function XR(e = {}) {
  return {
    materialId: String(e.id || e.sourceFingerprint || e.clientFingerprint || "current-material"),
    materialTitle: WR(e),
    materialType: "Generated notes",
    uploadedContent: "",
    aiSummary: e.summary || "",
    sections: e.sections || {},
    flashcards: GR(e),
    quizzes: QR(e),
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
function hw() {
  return pw().filter((e) => e && (e.id || e.summary) && e.kind !== "companion" && !String(e.id || "").startsWith("companion:")).map(XR);
}
function yw(e = "") {
  const n = String(e || "");
  return n && hw().find(
    (o) => o.materialId === n || o.sourceFingerprint === n || o.clientFingerprint === n
  ) || null;
}
function gw() {
  var n;
  const e = ((n = globalThis.localStorage) == null ? void 0 : n.getItem(fw)) || "";
  return yw(e);
}
function ZR(e = "") {
  var i;
  const n = e || ((i = gw()) == null ? void 0 : i.materialId) || "", o = n ? `/${encodeURIComponent(n)}` : "";
  globalThis.location.hash = `#/focus-room${o}`;
}
function JR(e = "", n = {}) {
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
async function qR(e = "", n = {}) {
  const o = String(e || ""), i = pw().find(
    (d) => String((d == null ? void 0 : d.id) || "") === o || String((d == null ? void 0 : d.sourceFingerprint) || (d == null ? void 0 : d.source_fingerprint) || "") === o || String((d == null ? void 0 : d.clientFingerprint) || (d == null ? void 0 : d.client_fingerprint) || "") === o
  ) || null, a = String((i == null ? void 0 : i.id) || "");
  a && UR(fw, a);
  const f = JR(a, n);
  f.action && HR($R, f), globalThis.location.href = a ? `index.html?focusReturn=${encodeURIComponent(a)}` : "index.html";
}
function eD() {
  Object.assign(globalThis, {
    getSynapseFocusRoomCurrentMaterial: gw,
    getSynapseFocusRoomMaterial: yw,
    getSynapseFocusRoomMaterials: hw,
    openSynapseFocusRoom: ZR,
    returnFromFocusRoomToWorkspace: qR
  });
}
const vw = document.getElementById("focusRoomRoot");
if (!vw)
  throw new Error("Focus Room root element was not found.");
var Ng;
(Ng = document.getElementById("focusRoomFallbackTitle")) == null || Ng.remove();
globalThis.apiClient = new Ig(v1);
eD();
(!globalThis.location.hash || globalThis.location.hash === "#") && (globalThis.location.hash = "#/focus-room");
LR({ root: vw });
