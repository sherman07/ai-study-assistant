function Vx(e, n) {
  for (var o = 0; o < n.length; o++) {
    const i = n[o];
    if (typeof i != "string" && !Array.isArray(i)) {
      for (const a in i)
        if (a !== "default" && !(a in e)) {
          const c = Object.getOwnPropertyDescriptor(i, a);
          c && Object.defineProperty(e, a, c.get ? c : {
            enumerable: !0,
            get: () => i[a]
          });
        }
    }
  }
  return Object.freeze(Object.defineProperty(e, Symbol.toStringTag, { value: "Module" }));
}
function Bx(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function vg(e) {
  const n = String(e || "").toLowerCase();
  return n === "127.0.0.1" || n === "localhost" || n === "::1" || n === "[::1]";
}
function oh(e) {
  return vg(e) || Bx(e);
}
function zx(e) {
  return !e || vg(e) ? "127.0.0.1" : e;
}
const $x = (() => {
  var f, m, y, v;
  const { protocol: e, hostname: n, port: o } = window.location, i = String(window.SYNAPSE_BACKEND_PORT || ((m = (f = document.body) == null ? void 0 : f.dataset) == null ? void 0 : m.apiPort) || "8001").trim(), a = `http://${zx(n)}:${i || "8001"}`, c = String(window.SYNAPSE_API_BASE || ((v = (y = document.body) == null ? void 0 : y.dataset) == null ? void 0 : v.apiBase) || "").replace(/\/+$/, ""), d = `${e}//${window.location.host}`.replace(/\/+$/, "");
  return c && !(oh(n) && o !== i && c === d) ? c : e === "file:" || oh(n) && o !== i ? a : `${e}//${window.location.host}`;
})();
class zs extends Error {
  constructor(n, { cause: o } = {}) {
    super(n), this.name = "ApiConnectionError", this.cause = o;
  }
}
const ih = "synapse.client.id.v1";
function Un() {
  return globalThis.window || globalThis;
}
function Zr(e, n = 220) {
  return String(e || "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
}
function sh() {
  const e = globalThis.crypto || Un().crypto;
  return e != null && e.randomUUID ? e.randomUUID() : `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
function Ux() {
  var n, o;
  const e = Un();
  try {
    const i = (n = e.localStorage) == null ? void 0 : n.getItem(ih);
    if (i) return i;
    const a = sh();
    return (o = e.localStorage) == null || o.setItem(ih, a), a;
  } catch {
    return sh();
  }
}
function Hx(e = {}) {
  if (typeof Headers < "u" && e instanceof Headers) {
    const n = {};
    return e.forEach((o, i) => {
      n[i] = o;
    }), n;
  }
  return Array.isArray(e) ? Object.fromEntries(e) : { ...e || {} };
}
class Sg {
  constructor(n, { fetchImpl: o } = {}) {
    var a, c;
    const i = Un();
    this.baseUrl = String(n || "").replace(/\/+$/, ""), this.fetchImpl = o || ((a = i.fetch) == null ? void 0 : a.bind(i)) || ((c = globalThis.fetch) == null ? void 0 : c.bind(globalThis));
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
  async requestHeaders(n = {}) {
    var c, d, f;
    const o = Un(), i = Hx(n);
    i["X-Synapse-Client-Id"] = Zr(Ux(), 160);
    const a = (d = (c = o.SynapseAuth) == null ? void 0 : c.getStoredSession) == null ? void 0 : d.call(c);
    if (a && typeof a == "object" && (a.accountId && (i["X-Synapse-User-Id"] = Zr(a.accountId, 160)), a.email && (i["X-Synapse-User-Email"] = Zr(a.email, 220)), a.displayName && (i["X-Synapse-User-Name"] = Zr(a.displayName, 180)), a.authMode && (i["X-Synapse-Auth-Mode"] = Zr(a.authMode, 60)), a.role && (i["X-Synapse-User-Role"] = Zr(a.role, 80))), (f = o.SynapseAuth) != null && f.authHeaders && !i.Authorization && !i.authorization)
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
    const i = this.endpoint(n), { timeoutMs: a, ...c } = o || {};
    c.headers = await this.requestHeaders(c.headers || {});
    const d = Number(a || 0);
    let f = null, m = null, y = null;
    const v = c.signal;
    d > 0 && typeof AbortController < "u" && (f = new AbortController(), y = () => f.abort(), v && (v.aborted ? f.abort() : v.addEventListener("abort", y, { once: !0 })), m = Un().setTimeout(() => f.abort(), d), c.signal = f.signal);
    try {
      return await this.fetchImpl(i, c);
    } catch (p) {
      throw (l = f == null ? void 0 : f.signal) != null && l.aborted ? new zs(this.timeoutMessage(d), { cause: p }) : new zs(this.connectionMessage(), { cause: p });
    } finally {
      m && Un().clearTimeout(m), v && y && v.removeEventListener("abort", y);
    }
  }
  async warmup({ attempts: n = 2, retryDelayMs: o = 1500, timeoutMs: i = 6e4, maxWaitMs: a = 0, signal: c } = {}) {
    const d = Math.max(1, Math.floor(Number(n) || 1)), f = Math.max(0, Number(a) || 0), m = Date.now();
    let y = null;
    for (let v = 0; v < d; v += 1) {
      const l = Date.now() - m, p = f > 0 ? f - l : 0;
      if (f > 0 && p <= 0) break;
      try {
        const S = await this.fetch("/healthz", {
          method: "GET",
          signal: c,
          timeoutMs: f > 0 ? Math.min(i, p) : i
        });
        if (S != null && S.ok) return S;
        y = new zs(
          `Synapse hosted service returned ${(S == null ? void 0 : S.status) || "an unexpected status"} while preparing your analysis.`
        );
      } catch (S) {
        y = S;
      }
      if (v < d - 1 && o > 0) {
        const S = f > 0 ? f - (Date.now() - m) : o;
        if (f > 0 && S <= 0) break;
        await new Promise((w) => Un().setTimeout(w, Math.min(o, S)));
      }
    }
    throw y || new zs(this.connectionMessage());
  }
  isRetryableResponse(n) {
    return [502, 503, 504].includes(Number(n == null ? void 0 : n.status));
  }
  async fetchWithRetry(n, o = {}, { attempts: i = 3, retryDelayMs: a = 3e3 } = {}) {
    const c = Math.max(1, Math.floor(Number(i) || 1));
    let d = null;
    for (let f = 0; f < c; f += 1) {
      if (d = await this.fetch(n, o), !this.isRetryableResponse(d) || f === c - 1) return d;
      a > 0 && await new Promise((m) => Un().setTimeout(m, a));
    }
    return d;
  }
}
var oi = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function wg(e) {
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
var ah;
function Wx() {
  if (ah) return fe;
  ah = 1;
  var e = Symbol.for("react.element"), n = Symbol.for("react.portal"), o = Symbol.for("react.fragment"), i = Symbol.for("react.strict_mode"), a = Symbol.for("react.profiler"), c = Symbol.for("react.provider"), d = Symbol.for("react.context"), f = Symbol.for("react.forward_ref"), m = Symbol.for("react.suspense"), y = Symbol.for("react.memo"), v = Symbol.for("react.lazy"), l = Symbol.iterator;
  function p(D) {
    return D === null || typeof D != "object" ? null : (D = l && D[l] || D["@@iterator"], typeof D == "function" ? D : null);
  }
  var S = { isMounted: function() {
    return !1;
  }, enqueueForceUpdate: function() {
  }, enqueueReplaceState: function() {
  }, enqueueSetState: function() {
  } }, w = Object.assign, k = {};
  function A(D, V, ce) {
    this.props = D, this.context = V, this.refs = k, this.updater = ce || S;
  }
  A.prototype.isReactComponent = {}, A.prototype.setState = function(D, V) {
    if (typeof D != "object" && typeof D != "function" && D != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
    this.updater.enqueueSetState(this, D, V, "setState");
  }, A.prototype.forceUpdate = function(D) {
    this.updater.enqueueForceUpdate(this, D, "forceUpdate");
  };
  function T() {
  }
  T.prototype = A.prototype;
  function P(D, V, ce) {
    this.props = D, this.context = V, this.refs = k, this.updater = ce || S;
  }
  var E = P.prototype = new T();
  E.constructor = P, w(E, A.prototype), E.isPureReactComponent = !0;
  var N = Array.isArray, O = Object.prototype.hasOwnProperty, W = { current: null }, G = { key: !0, ref: !0, __self: !0, __source: !0 };
  function K(D, V, ce) {
    var pe, he = {}, ye = null, Ce = null;
    if (V != null) for (pe in V.ref !== void 0 && (Ce = V.ref), V.key !== void 0 && (ye = "" + V.key), V) O.call(V, pe) && !G.hasOwnProperty(pe) && (he[pe] = V[pe]);
    var we = arguments.length - 2;
    if (we === 1) he.children = ce;
    else if (1 < we) {
      for (var Re = Array(we), yt = 0; yt < we; yt++) Re[yt] = arguments[yt + 2];
      he.children = Re;
    }
    if (D && D.defaultProps) for (pe in we = D.defaultProps, we) he[pe] === void 0 && (he[pe] = we[pe]);
    return { $$typeof: e, type: D, key: ye, ref: Ce, props: he, _owner: W.current };
  }
  function L(D, V) {
    return { $$typeof: e, type: D.type, key: V, ref: D.ref, props: D.props, _owner: D._owner };
  }
  function X(D) {
    return typeof D == "object" && D !== null && D.$$typeof === e;
  }
  function ae(D) {
    var V = { "=": "=0", ":": "=2" };
    return "$" + D.replace(/[=:]/g, function(ce) {
      return V[ce];
    });
  }
  var q = /\/+/g;
  function de(D, V) {
    return typeof D == "object" && D !== null && D.key != null ? ae("" + D.key) : V.toString(36);
  }
  function ue(D, V, ce, pe, he) {
    var ye = typeof D;
    (ye === "undefined" || ye === "boolean") && (D = null);
    var Ce = !1;
    if (D === null) Ce = !0;
    else switch (ye) {
      case "string":
      case "number":
        Ce = !0;
        break;
      case "object":
        switch (D.$$typeof) {
          case e:
          case n:
            Ce = !0;
        }
    }
    if (Ce) return Ce = D, he = he(Ce), D = pe === "" ? "." + de(Ce, 0) : pe, N(he) ? (ce = "", D != null && (ce = D.replace(q, "$&/") + "/"), ue(he, V, ce, "", function(yt) {
      return yt;
    })) : he != null && (X(he) && (he = L(he, ce + (!he.key || Ce && Ce.key === he.key ? "" : ("" + he.key).replace(q, "$&/") + "/") + D)), V.push(he)), 1;
    if (Ce = 0, pe = pe === "" ? "." : pe + ":", N(D)) for (var we = 0; we < D.length; we++) {
      ye = D[we];
      var Re = pe + de(ye, we);
      Ce += ue(ye, V, ce, Re, he);
    }
    else if (Re = p(D), typeof Re == "function") for (D = Re.call(D), we = 0; !(ye = D.next()).done; ) ye = ye.value, Re = pe + de(ye, we++), Ce += ue(ye, V, ce, Re, he);
    else if (ye === "object") throw V = String(D), Error("Objects are not valid as a React child (found: " + (V === "[object Object]" ? "object with keys {" + Object.keys(D).join(", ") + "}" : V) + "). If you meant to render a collection of children, use an array instead.");
    return Ce;
  }
  function _e(D, V, ce) {
    if (D == null) return D;
    var pe = [], he = 0;
    return ue(D, pe, "", "", function(ye) {
      return V.call(ce, ye, he++);
    }), pe;
  }
  function ve(D) {
    if (D._status === -1) {
      var V = D._result;
      V = V(), V.then(function(ce) {
        (D._status === 0 || D._status === -1) && (D._status = 1, D._result = ce);
      }, function(ce) {
        (D._status === 0 || D._status === -1) && (D._status = 2, D._result = ce);
      }), D._status === -1 && (D._status = 0, D._result = V);
    }
    if (D._status === 1) return D._result.default;
    throw D._result;
  }
  var Se = { current: null }, $ = { transition: null }, Z = { ReactCurrentDispatcher: Se, ReactCurrentBatchConfig: $, ReactCurrentOwner: W };
  function Y() {
    throw Error("act(...) is not supported in production builds of React.");
  }
  return fe.Children = { map: _e, forEach: function(D, V, ce) {
    _e(D, function() {
      V.apply(this, arguments);
    }, ce);
  }, count: function(D) {
    var V = 0;
    return _e(D, function() {
      V++;
    }), V;
  }, toArray: function(D) {
    return _e(D, function(V) {
      return V;
    }) || [];
  }, only: function(D) {
    if (!X(D)) throw Error("React.Children.only expected to receive a single React element child.");
    return D;
  } }, fe.Component = A, fe.Fragment = o, fe.Profiler = a, fe.PureComponent = P, fe.StrictMode = i, fe.Suspense = m, fe.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Z, fe.act = Y, fe.cloneElement = function(D, V, ce) {
    if (D == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + D + ".");
    var pe = w({}, D.props), he = D.key, ye = D.ref, Ce = D._owner;
    if (V != null) {
      if (V.ref !== void 0 && (ye = V.ref, Ce = W.current), V.key !== void 0 && (he = "" + V.key), D.type && D.type.defaultProps) var we = D.type.defaultProps;
      for (Re in V) O.call(V, Re) && !G.hasOwnProperty(Re) && (pe[Re] = V[Re] === void 0 && we !== void 0 ? we[Re] : V[Re]);
    }
    var Re = arguments.length - 2;
    if (Re === 1) pe.children = ce;
    else if (1 < Re) {
      we = Array(Re);
      for (var yt = 0; yt < Re; yt++) we[yt] = arguments[yt + 2];
      pe.children = we;
    }
    return { $$typeof: e, type: D.type, key: he, ref: ye, props: pe, _owner: Ce };
  }, fe.createContext = function(D) {
    return D = { $$typeof: d, _currentValue: D, _currentValue2: D, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, D.Provider = { $$typeof: c, _context: D }, D.Consumer = D;
  }, fe.createElement = K, fe.createFactory = function(D) {
    var V = K.bind(null, D);
    return V.type = D, V;
  }, fe.createRef = function() {
    return { current: null };
  }, fe.forwardRef = function(D) {
    return { $$typeof: f, render: D };
  }, fe.isValidElement = X, fe.lazy = function(D) {
    return { $$typeof: v, _payload: { _status: -1, _result: D }, _init: ve };
  }, fe.memo = function(D, V) {
    return { $$typeof: y, type: D, compare: V === void 0 ? null : V };
  }, fe.startTransition = function(D) {
    var V = $.transition;
    $.transition = {};
    try {
      D();
    } finally {
      $.transition = V;
    }
  }, fe.unstable_act = Y, fe.useCallback = function(D, V) {
    return Se.current.useCallback(D, V);
  }, fe.useContext = function(D) {
    return Se.current.useContext(D);
  }, fe.useDebugValue = function() {
  }, fe.useDeferredValue = function(D) {
    return Se.current.useDeferredValue(D);
  }, fe.useEffect = function(D, V) {
    return Se.current.useEffect(D, V);
  }, fe.useId = function() {
    return Se.current.useId();
  }, fe.useImperativeHandle = function(D, V, ce) {
    return Se.current.useImperativeHandle(D, V, ce);
  }, fe.useInsertionEffect = function(D, V) {
    return Se.current.useInsertionEffect(D, V);
  }, fe.useLayoutEffect = function(D, V) {
    return Se.current.useLayoutEffect(D, V);
  }, fe.useMemo = function(D, V) {
    return Se.current.useMemo(D, V);
  }, fe.useReducer = function(D, V, ce) {
    return Se.current.useReducer(D, V, ce);
  }, fe.useRef = function(D) {
    return Se.current.useRef(D);
  }, fe.useState = function(D) {
    return Se.current.useState(D);
  }, fe.useSyncExternalStore = function(D, V, ce) {
    return Se.current.useSyncExternalStore(D, V, ce);
  }, fe.useTransition = function() {
    return Se.current.useTransition();
  }, fe.version = "18.3.1", fe;
}
var lh;
function pd() {
  return lh || (lh = 1, Vu.exports = Wx()), Vu.exports;
}
var C = pd();
const yn = /* @__PURE__ */ wg(C), Ar = /* @__PURE__ */ Vx({
  __proto__: null,
  default: yn
}, [C]);
var $s = {}, Bu = { exports: {} }, mt = {}, zu = { exports: {} }, $u = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var uh;
function Gx() {
  return uh || (uh = 1, (function(e) {
    function n($, Z) {
      var Y = $.length;
      $.push(Z);
      e: for (; 0 < Y; ) {
        var D = Y - 1 >>> 1, V = $[D];
        if (0 < a(V, Z)) $[D] = Z, $[Y] = V, Y = D;
        else break e;
      }
    }
    function o($) {
      return $.length === 0 ? null : $[0];
    }
    function i($) {
      if ($.length === 0) return null;
      var Z = $[0], Y = $.pop();
      if (Y !== Z) {
        $[0] = Y;
        e: for (var D = 0, V = $.length, ce = V >>> 1; D < ce; ) {
          var pe = 2 * (D + 1) - 1, he = $[pe], ye = pe + 1, Ce = $[ye];
          if (0 > a(he, Y)) ye < V && 0 > a(Ce, he) ? ($[D] = Ce, $[ye] = Y, D = ye) : ($[D] = he, $[pe] = Y, D = pe);
          else if (ye < V && 0 > a(Ce, Y)) $[D] = Ce, $[ye] = Y, D = ye;
          else break e;
        }
      }
      return Z;
    }
    function a($, Z) {
      var Y = $.sortIndex - Z.sortIndex;
      return Y !== 0 ? Y : $.id - Z.id;
    }
    if (typeof performance == "object" && typeof performance.now == "function") {
      var c = performance;
      e.unstable_now = function() {
        return c.now();
      };
    } else {
      var d = Date, f = d.now();
      e.unstable_now = function() {
        return d.now() - f;
      };
    }
    var m = [], y = [], v = 1, l = null, p = 3, S = !1, w = !1, k = !1, A = typeof setTimeout == "function" ? setTimeout : null, T = typeof clearTimeout == "function" ? clearTimeout : null, P = typeof setImmediate < "u" ? setImmediate : null;
    typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
    function E($) {
      for (var Z = o(y); Z !== null; ) {
        if (Z.callback === null) i(y);
        else if (Z.startTime <= $) i(y), Z.sortIndex = Z.expirationTime, n(m, Z);
        else break;
        Z = o(y);
      }
    }
    function N($) {
      if (k = !1, E($), !w) if (o(m) !== null) w = !0, ve(O);
      else {
        var Z = o(y);
        Z !== null && Se(N, Z.startTime - $);
      }
    }
    function O($, Z) {
      w = !1, k && (k = !1, T(K), K = -1), S = !0;
      var Y = p;
      try {
        for (E(Z), l = o(m); l !== null && (!(l.expirationTime > Z) || $ && !ae()); ) {
          var D = l.callback;
          if (typeof D == "function") {
            l.callback = null, p = l.priorityLevel;
            var V = D(l.expirationTime <= Z);
            Z = e.unstable_now(), typeof V == "function" ? l.callback = V : l === o(m) && i(m), E(Z);
          } else i(m);
          l = o(m);
        }
        if (l !== null) var ce = !0;
        else {
          var pe = o(y);
          pe !== null && Se(N, pe.startTime - Z), ce = !1;
        }
        return ce;
      } finally {
        l = null, p = Y, S = !1;
      }
    }
    var W = !1, G = null, K = -1, L = 5, X = -1;
    function ae() {
      return !(e.unstable_now() - X < L);
    }
    function q() {
      if (G !== null) {
        var $ = e.unstable_now();
        X = $;
        var Z = !0;
        try {
          Z = G(!0, $);
        } finally {
          Z ? de() : (W = !1, G = null);
        }
      } else W = !1;
    }
    var de;
    if (typeof P == "function") de = function() {
      P(q);
    };
    else if (typeof MessageChannel < "u") {
      var ue = new MessageChannel(), _e = ue.port2;
      ue.port1.onmessage = q, de = function() {
        _e.postMessage(null);
      };
    } else de = function() {
      A(q, 0);
    };
    function ve($) {
      G = $, W || (W = !0, de());
    }
    function Se($, Z) {
      K = A(function() {
        $(e.unstable_now());
      }, Z);
    }
    e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function($) {
      $.callback = null;
    }, e.unstable_continueExecution = function() {
      w || S || (w = !0, ve(O));
    }, e.unstable_forceFrameRate = function($) {
      0 > $ || 125 < $ ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : L = 0 < $ ? Math.floor(1e3 / $) : 5;
    }, e.unstable_getCurrentPriorityLevel = function() {
      return p;
    }, e.unstable_getFirstCallbackNode = function() {
      return o(m);
    }, e.unstable_next = function($) {
      switch (p) {
        case 1:
        case 2:
        case 3:
          var Z = 3;
          break;
        default:
          Z = p;
      }
      var Y = p;
      p = Z;
      try {
        return $();
      } finally {
        p = Y;
      }
    }, e.unstable_pauseExecution = function() {
    }, e.unstable_requestPaint = function() {
    }, e.unstable_runWithPriority = function($, Z) {
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
      var Y = p;
      p = $;
      try {
        return Z();
      } finally {
        p = Y;
      }
    }, e.unstable_scheduleCallback = function($, Z, Y) {
      var D = e.unstable_now();
      switch (typeof Y == "object" && Y !== null ? (Y = Y.delay, Y = typeof Y == "number" && 0 < Y ? D + Y : D) : Y = D, $) {
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
      return V = Y + V, $ = { id: v++, callback: Z, priorityLevel: $, startTime: Y, expirationTime: V, sortIndex: -1 }, Y > D ? ($.sortIndex = Y, n(y, $), o(m) === null && $ === o(y) && (k ? (T(K), K = -1) : k = !0, Se(N, Y - D))) : ($.sortIndex = V, n(m, $), w || S || (w = !0, ve(O))), $;
    }, e.unstable_shouldYield = ae, e.unstable_wrapCallback = function($) {
      var Z = p;
      return function() {
        var Y = p;
        p = Z;
        try {
          return $.apply(this, arguments);
        } finally {
          p = Y;
        }
      };
    };
  })($u)), $u;
}
var ch;
function Kx() {
  return ch || (ch = 1, zu.exports = Gx()), zu.exports;
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
var dh;
function Yx() {
  if (dh) return mt;
  dh = 1;
  var e = pd(), n = Kx();
  function o(t) {
    for (var r = "https://reactjs.org/docs/error-decoder.html?invariant=" + t, s = 1; s < arguments.length; s++) r += "&args[]=" + encodeURIComponent(arguments[s]);
    return "Minified React error #" + t + "; visit " + r + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  var i = /* @__PURE__ */ new Set(), a = {};
  function c(t, r) {
    d(t, r), d(t + "Capture", r);
  }
  function d(t, r) {
    for (a[t] = r, t = 0; t < r.length; t++) i.add(r[t]);
  }
  var f = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), m = Object.prototype.hasOwnProperty, y = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, v = {}, l = {};
  function p(t) {
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
  function w(t, r, s, u) {
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
  function k(t, r, s, u, h, g, _) {
    this.acceptsBooleans = r === 2 || r === 3 || r === 4, this.attributeName = u, this.attributeNamespace = h, this.mustUseProperty = s, this.propertyName = t, this.type = r, this.sanitizeURL = g, this.removeEmptyString = _;
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
  function P(t) {
    return t[1].toUpperCase();
  }
  "accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(t) {
    var r = t.replace(
      T,
      P
    );
    A[r] = new k(r, 1, !1, t, null, !1, !1);
  }), "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(t) {
    var r = t.replace(T, P);
    A[r] = new k(r, 1, !1, t, "http://www.w3.org/1999/xlink", !1, !1);
  }), ["xml:base", "xml:lang", "xml:space"].forEach(function(t) {
    var r = t.replace(T, P);
    A[r] = new k(r, 1, !1, t, "http://www.w3.org/XML/1998/namespace", !1, !1);
  }), ["tabIndex", "crossOrigin"].forEach(function(t) {
    A[t] = new k(t, 1, !1, t.toLowerCase(), null, !1, !1);
  }), A.xlinkHref = new k("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1), ["src", "href", "action", "formAction"].forEach(function(t) {
    A[t] = new k(t, 1, !1, t.toLowerCase(), null, !0, !0);
  });
  function E(t, r, s, u) {
    var h = A.hasOwnProperty(r) ? A[r] : null;
    (h !== null ? h.type !== 0 : u || !(2 < r.length) || r[0] !== "o" && r[0] !== "O" || r[1] !== "n" && r[1] !== "N") && (w(r, s, h, u) && (s = null), u || h === null ? p(r) && (s === null ? t.removeAttribute(r) : t.setAttribute(r, "" + s)) : h.mustUseProperty ? t[h.propertyName] = s === null ? h.type === 3 ? !1 : "" : s : (r = h.attributeName, u = h.attributeNamespace, s === null ? t.removeAttribute(r) : (h = h.type, s = h === 3 || h === 4 && s === !0 ? "" : "" + s, u ? t.setAttributeNS(u, r, s) : t.setAttribute(r, s))));
  }
  var N = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, O = Symbol.for("react.element"), W = Symbol.for("react.portal"), G = Symbol.for("react.fragment"), K = Symbol.for("react.strict_mode"), L = Symbol.for("react.profiler"), X = Symbol.for("react.provider"), ae = Symbol.for("react.context"), q = Symbol.for("react.forward_ref"), de = Symbol.for("react.suspense"), ue = Symbol.for("react.suspense_list"), _e = Symbol.for("react.memo"), ve = Symbol.for("react.lazy"), Se = Symbol.for("react.offscreen"), $ = Symbol.iterator;
  function Z(t) {
    return t === null || typeof t != "object" ? null : (t = $ && t[$] || t["@@iterator"], typeof t == "function" ? t : null);
  }
  var Y = Object.assign, D;
  function V(t) {
    if (D === void 0) try {
      throw Error();
    } catch (s) {
      var r = s.stack.trim().match(/\n( *(at )?)/);
      D = r && r[1] || "";
    }
    return `
` + D + t;
  }
  var ce = !1;
  function pe(t, r) {
    if (!t || ce) return "";
    ce = !0;
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
`), _ = h.length - 1, b = g.length - 1; 1 <= _ && 0 <= b && h[_] !== g[b]; ) b--;
        for (; 1 <= _ && 0 <= b; _--, b--) if (h[_] !== g[b]) {
          if (_ !== 1 || b !== 1)
            do
              if (_--, b--, 0 > b || h[_] !== g[b]) {
                var M = `
` + h[_].replace(" at new ", " at ");
                return t.displayName && M.includes("<anonymous>") && (M = M.replace("<anonymous>", t.displayName)), M;
              }
            while (1 <= _ && 0 <= b);
          break;
        }
      }
    } finally {
      ce = !1, Error.prepareStackTrace = s;
    }
    return (t = t ? t.displayName || t.name : "") ? V(t) : "";
  }
  function he(t) {
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
        return t = pe(t.type, !1), t;
      case 11:
        return t = pe(t.type.render, !1), t;
      case 1:
        return t = pe(t.type, !0), t;
      default:
        return "";
    }
  }
  function ye(t) {
    if (t == null) return null;
    if (typeof t == "function") return t.displayName || t.name || null;
    if (typeof t == "string") return t;
    switch (t) {
      case G:
        return "Fragment";
      case W:
        return "Portal";
      case L:
        return "Profiler";
      case K:
        return "StrictMode";
      case de:
        return "Suspense";
      case ue:
        return "SuspenseList";
    }
    if (typeof t == "object") switch (t.$$typeof) {
      case ae:
        return (t.displayName || "Context") + ".Consumer";
      case X:
        return (t._context.displayName || "Context") + ".Provider";
      case q:
        var r = t.render;
        return t = t.displayName, t || (t = r.displayName || r.name || "", t = t !== "" ? "ForwardRef(" + t + ")" : "ForwardRef"), t;
      case _e:
        return r = t.displayName || null, r !== null ? r : ye(t.type) || "Memo";
      case ve:
        r = t._payload, t = t._init;
        try {
          return ye(t(r));
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
        return ye(r);
      case 8:
        return r === K ? "StrictMode" : "Mode";
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
  function we(t) {
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
  function yt(t) {
    var r = Re(t) ? "checked" : "value", s = Object.getOwnPropertyDescriptor(t.constructor.prototype, r), u = "" + t[r];
    if (!t.hasOwnProperty(r) && typeof s < "u" && typeof s.get == "function" && typeof s.set == "function") {
      var h = s.get, g = s.set;
      return Object.defineProperty(t, r, { configurable: !0, get: function() {
        return h.call(this);
      }, set: function(_) {
        u = "" + _, g.call(this, _);
      } }), Object.defineProperty(t, r, { enumerable: s.enumerable }), { getValue: function() {
        return u;
      }, setValue: function(_) {
        u = "" + _;
      }, stopTracking: function() {
        t._valueTracker = null, delete t[r];
      } };
    }
  }
  function Ri(t) {
    t._valueTracker || (t._valueTracker = yt(t));
  }
  function cf(t) {
    if (!t) return !1;
    var r = t._valueTracker;
    if (!r) return !0;
    var s = r.getValue(), u = "";
    return t && (u = Re(t) ? t.checked ? "true" : "false" : t.value), t = u, t !== s ? (r.setValue(t), !0) : !1;
  }
  function Di(t) {
    if (t = t || (typeof document < "u" ? document : void 0), typeof t > "u") return null;
    try {
      return t.activeElement || t.body;
    } catch {
      return t.body;
    }
  }
  function Ga(t, r) {
    var s = r.checked;
    return Y({}, r, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: s ?? t._wrapperState.initialChecked });
  }
  function df(t, r) {
    var s = r.defaultValue == null ? "" : r.defaultValue, u = r.checked != null ? r.checked : r.defaultChecked;
    s = we(r.value != null ? r.value : s), t._wrapperState = { initialChecked: u, initialValue: s, controlled: r.type === "checkbox" || r.type === "radio" ? r.checked != null : r.value != null };
  }
  function ff(t, r) {
    r = r.checked, r != null && E(t, "checked", r, !1);
  }
  function Ka(t, r) {
    ff(t, r);
    var s = we(r.value), u = r.type;
    if (s != null) u === "number" ? (s === 0 && t.value === "" || t.value != s) && (t.value = "" + s) : t.value !== "" + s && (t.value = "" + s);
    else if (u === "submit" || u === "reset") {
      t.removeAttribute("value");
      return;
    }
    r.hasOwnProperty("value") ? Ya(t, r.type, s) : r.hasOwnProperty("defaultValue") && Ya(t, r.type, we(r.defaultValue)), r.checked == null && r.defaultChecked != null && (t.defaultChecked = !!r.defaultChecked);
  }
  function pf(t, r, s) {
    if (r.hasOwnProperty("value") || r.hasOwnProperty("defaultValue")) {
      var u = r.type;
      if (!(u !== "submit" && u !== "reset" || r.value !== void 0 && r.value !== null)) return;
      r = "" + t._wrapperState.initialValue, s || r === t.value || (t.value = r), t.defaultValue = r;
    }
    s = t.name, s !== "" && (t.name = ""), t.defaultChecked = !!t._wrapperState.initialChecked, s !== "" && (t.name = s);
  }
  function Ya(t, r, s) {
    (r !== "number" || Di(t.ownerDocument) !== t) && (s == null ? t.defaultValue = "" + t._wrapperState.initialValue : t.defaultValue !== "" + s && (t.defaultValue = "" + s));
  }
  var So = Array.isArray;
  function Cr(t, r, s, u) {
    if (t = t.options, r) {
      r = {};
      for (var h = 0; h < s.length; h++) r["$" + s[h]] = !0;
      for (s = 0; s < t.length; s++) h = r.hasOwnProperty("$" + t[s].value), t[s].selected !== h && (t[s].selected = h), h && u && (t[s].defaultSelected = !0);
    } else {
      for (s = "" + we(s), r = null, h = 0; h < t.length; h++) {
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
    return Y({}, r, { value: void 0, defaultValue: void 0, children: "" + t._wrapperState.initialValue });
  }
  function mf(t, r) {
    var s = r.value;
    if (s == null) {
      if (s = r.children, r = r.defaultValue, s != null) {
        if (r != null) throw Error(o(92));
        if (So(s)) {
          if (1 < s.length) throw Error(o(93));
          s = s[0];
        }
        r = s;
      }
      r == null && (r = ""), s = r;
    }
    t._wrapperState = { initialValue: we(s) };
  }
  function hf(t, r) {
    var s = we(r.value), u = we(r.defaultValue);
    s != null && (s = "" + s, s !== t.value && (t.value = s), r.defaultValue == null && t.defaultValue !== s && (t.defaultValue = s)), u != null && (t.defaultValue = "" + u);
  }
  function yf(t) {
    var r = t.textContent;
    r === t._wrapperState.initialValue && r !== "" && r !== null && (t.value = r);
  }
  function gf(t) {
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
    return t == null || t === "http://www.w3.org/1999/xhtml" ? gf(r) : t === "http://www.w3.org/2000/svg" && r === "foreignObject" ? "http://www.w3.org/1999/xhtml" : t;
  }
  var Ni, vf = (function(t) {
    return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(r, s, u, h) {
      MSApp.execUnsafeLocalFunction(function() {
        return t(r, s, u, h);
      });
    } : t;
  })(function(t, r) {
    if (t.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in t) t.innerHTML = r;
    else {
      for (Ni = Ni || document.createElement("div"), Ni.innerHTML = "<svg>" + r.valueOf().toString() + "</svg>", r = Ni.firstChild; t.firstChild; ) t.removeChild(t.firstChild);
      for (; r.firstChild; ) t.appendChild(r.firstChild);
    }
  });
  function wo(t, r) {
    if (r) {
      var s = t.firstChild;
      if (s && s === t.lastChild && s.nodeType === 3) {
        s.nodeValue = r;
        return;
      }
    }
    t.textContent = r;
  }
  var xo = {
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
  }, US = ["Webkit", "ms", "Moz", "O"];
  Object.keys(xo).forEach(function(t) {
    US.forEach(function(r) {
      r = r + t.charAt(0).toUpperCase() + t.substring(1), xo[r] = xo[t];
    });
  });
  function Sf(t, r, s) {
    return r == null || typeof r == "boolean" || r === "" ? "" : s || typeof r != "number" || r === 0 || xo.hasOwnProperty(t) && xo[t] ? ("" + r).trim() : r + "px";
  }
  function wf(t, r) {
    t = t.style;
    for (var s in r) if (r.hasOwnProperty(s)) {
      var u = s.indexOf("--") === 0, h = Sf(s, r[s], u);
      s === "float" && (s = "cssFloat"), u ? t.setProperty(s, h) : t[s] = h;
    }
  }
  var HS = Y({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
  function Za(t, r) {
    if (r) {
      if (HS[t] && (r.children != null || r.dangerouslySetInnerHTML != null)) throw Error(o(137, t));
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
  var tl = null, Pr = null, br = null;
  function xf(t) {
    if (t = Uo(t)) {
      if (typeof tl != "function") throw Error(o(280));
      var r = t.stateNode;
      r && (r = ns(r), tl(t.stateNode, t.type, r));
    }
  }
  function _f(t) {
    Pr ? br ? br.push(t) : br = [t] : Pr = t;
  }
  function Tf() {
    if (Pr) {
      var t = Pr, r = br;
      if (br = Pr = null, xf(t), r) for (t = 0; t < r.length; t++) xf(r[t]);
    }
  }
  function kf(t, r) {
    return t(r);
  }
  function Af() {
  }
  var nl = !1;
  function Cf(t, r, s) {
    if (nl) return t(r, s);
    nl = !0;
    try {
      return kf(t, r, s);
    } finally {
      nl = !1, (Pr !== null || br !== null) && (Af(), Tf());
    }
  }
  function _o(t, r) {
    var s = t.stateNode;
    if (s === null) return null;
    var u = ns(s);
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
  if (f) try {
    var To = {};
    Object.defineProperty(To, "passive", { get: function() {
      rl = !0;
    } }), window.addEventListener("test", To, To), window.removeEventListener("test", To, To);
  } catch {
    rl = !1;
  }
  function WS(t, r, s, u, h, g, _, b, M) {
    var F = Array.prototype.slice.call(arguments, 3);
    try {
      r.apply(s, F);
    } catch (z) {
      this.onError(z);
    }
  }
  var ko = !1, ji = null, Ii = !1, ol = null, GS = { onError: function(t) {
    ko = !0, ji = t;
  } };
  function KS(t, r, s, u, h, g, _, b, M) {
    ko = !1, ji = null, WS.apply(GS, arguments);
  }
  function YS(t, r, s, u, h, g, _, b, M) {
    if (KS.apply(this, arguments), ko) {
      if (ko) {
        var F = ji;
        ko = !1, ji = null;
      } else throw Error(o(198));
      Ii || (Ii = !0, ol = F);
    }
  }
  function Jn(t) {
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
  function Pf(t) {
    if (t.tag === 13) {
      var r = t.memoizedState;
      if (r === null && (t = t.alternate, t !== null && (r = t.memoizedState)), r !== null) return r.dehydrated;
    }
    return null;
  }
  function bf(t) {
    if (Jn(t) !== t) throw Error(o(188));
  }
  function QS(t) {
    var r = t.alternate;
    if (!r) {
      if (r = Jn(t), r === null) throw Error(o(188));
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
          if (g === s) return bf(h), t;
          if (g === u) return bf(h), r;
          g = g.sibling;
        }
        throw Error(o(188));
      }
      if (s.return !== u.return) s = h, u = g;
      else {
        for (var _ = !1, b = h.child; b; ) {
          if (b === s) {
            _ = !0, s = h, u = g;
            break;
          }
          if (b === u) {
            _ = !0, u = h, s = g;
            break;
          }
          b = b.sibling;
        }
        if (!_) {
          for (b = g.child; b; ) {
            if (b === s) {
              _ = !0, s = g, u = h;
              break;
            }
            if (b === u) {
              _ = !0, u = g, s = h;
              break;
            }
            b = b.sibling;
          }
          if (!_) throw Error(o(189));
        }
      }
      if (s.alternate !== u) throw Error(o(190));
    }
    if (s.tag !== 3) throw Error(o(188));
    return s.stateNode.current === s ? t : r;
  }
  function Ef(t) {
    return t = QS(t), t !== null ? Mf(t) : null;
  }
  function Mf(t) {
    if (t.tag === 5 || t.tag === 6) return t;
    for (t = t.child; t !== null; ) {
      var r = Mf(t);
      if (r !== null) return r;
      t = t.sibling;
    }
    return null;
  }
  var Rf = n.unstable_scheduleCallback, Df = n.unstable_cancelCallback, XS = n.unstable_shouldYield, ZS = n.unstable_requestPaint, Oe = n.unstable_now, JS = n.unstable_getCurrentPriorityLevel, il = n.unstable_ImmediatePriority, Nf = n.unstable_UserBlockingPriority, Fi = n.unstable_NormalPriority, qS = n.unstable_LowPriority, jf = n.unstable_IdlePriority, Oi = null, Wt = null;
  function ew(t) {
    if (Wt && typeof Wt.onCommitFiberRoot == "function") try {
      Wt.onCommitFiberRoot(Oi, t, void 0, (t.current.flags & 128) === 128);
    } catch {
    }
  }
  var Nt = Math.clz32 ? Math.clz32 : rw, tw = Math.log, nw = Math.LN2;
  function rw(t) {
    return t >>>= 0, t === 0 ? 32 : 31 - (tw(t) / nw | 0) | 0;
  }
  var Li = 64, Vi = 4194304;
  function Ao(t) {
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
  function Bi(t, r) {
    var s = t.pendingLanes;
    if (s === 0) return 0;
    var u = 0, h = t.suspendedLanes, g = t.pingedLanes, _ = s & 268435455;
    if (_ !== 0) {
      var b = _ & ~h;
      b !== 0 ? u = Ao(b) : (g &= _, g !== 0 && (u = Ao(g)));
    } else _ = s & ~h, _ !== 0 ? u = Ao(_) : g !== 0 && (u = Ao(g));
    if (u === 0) return 0;
    if (r !== 0 && r !== u && (r & h) === 0 && (h = u & -u, g = r & -r, h >= g || h === 16 && (g & 4194240) !== 0)) return r;
    if ((u & 4) !== 0 && (u |= s & 16), r = t.entangledLanes, r !== 0) for (t = t.entanglements, r &= u; 0 < r; ) s = 31 - Nt(r), h = 1 << s, u |= t[s], r &= ~h;
    return u;
  }
  function ow(t, r) {
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
  function iw(t, r) {
    for (var s = t.suspendedLanes, u = t.pingedLanes, h = t.expirationTimes, g = t.pendingLanes; 0 < g; ) {
      var _ = 31 - Nt(g), b = 1 << _, M = h[_];
      M === -1 ? ((b & s) === 0 || (b & u) !== 0) && (h[_] = ow(b, r)) : M <= r && (t.expiredLanes |= b), g &= ~b;
    }
  }
  function sl(t) {
    return t = t.pendingLanes & -1073741825, t !== 0 ? t : t & 1073741824 ? 1073741824 : 0;
  }
  function If() {
    var t = Li;
    return Li <<= 1, (Li & 4194240) === 0 && (Li = 64), t;
  }
  function al(t) {
    for (var r = [], s = 0; 31 > s; s++) r.push(t);
    return r;
  }
  function Co(t, r, s) {
    t.pendingLanes |= r, r !== 536870912 && (t.suspendedLanes = 0, t.pingedLanes = 0), t = t.eventTimes, r = 31 - Nt(r), t[r] = s;
  }
  function sw(t, r) {
    var s = t.pendingLanes & ~r;
    t.pendingLanes = r, t.suspendedLanes = 0, t.pingedLanes = 0, t.expiredLanes &= r, t.mutableReadLanes &= r, t.entangledLanes &= r, r = t.entanglements;
    var u = t.eventTimes;
    for (t = t.expirationTimes; 0 < s; ) {
      var h = 31 - Nt(s), g = 1 << h;
      r[h] = 0, u[h] = -1, t[h] = -1, s &= ~g;
    }
  }
  function ll(t, r) {
    var s = t.entangledLanes |= r;
    for (t = t.entanglements; s; ) {
      var u = 31 - Nt(s), h = 1 << u;
      h & r | t[u] & r && (t[u] |= r), s &= ~h;
    }
  }
  var xe = 0;
  function Ff(t) {
    return t &= -t, 1 < t ? 4 < t ? (t & 268435455) !== 0 ? 16 : 536870912 : 4 : 1;
  }
  var Of, ul, Lf, Vf, Bf, cl = !1, zi = [], _n = null, Tn = null, kn = null, Po = /* @__PURE__ */ new Map(), bo = /* @__PURE__ */ new Map(), An = [], aw = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
  function zf(t, r) {
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
        Po.delete(r.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        bo.delete(r.pointerId);
    }
  }
  function Eo(t, r, s, u, h, g) {
    return t === null || t.nativeEvent !== g ? (t = { blockedOn: r, domEventName: s, eventSystemFlags: u, nativeEvent: g, targetContainers: [h] }, r !== null && (r = Uo(r), r !== null && ul(r)), t) : (t.eventSystemFlags |= u, r = t.targetContainers, h !== null && r.indexOf(h) === -1 && r.push(h), t);
  }
  function lw(t, r, s, u, h) {
    switch (r) {
      case "focusin":
        return _n = Eo(_n, t, r, s, u, h), !0;
      case "dragenter":
        return Tn = Eo(Tn, t, r, s, u, h), !0;
      case "mouseover":
        return kn = Eo(kn, t, r, s, u, h), !0;
      case "pointerover":
        var g = h.pointerId;
        return Po.set(g, Eo(Po.get(g) || null, t, r, s, u, h)), !0;
      case "gotpointercapture":
        return g = h.pointerId, bo.set(g, Eo(bo.get(g) || null, t, r, s, u, h)), !0;
    }
    return !1;
  }
  function $f(t) {
    var r = qn(t.target);
    if (r !== null) {
      var s = Jn(r);
      if (s !== null) {
        if (r = s.tag, r === 13) {
          if (r = Pf(s), r !== null) {
            t.blockedOn = r, Bf(t.priority, function() {
              Lf(s);
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
  function $i(t) {
    if (t.blockedOn !== null) return !1;
    for (var r = t.targetContainers; 0 < r.length; ) {
      var s = fl(t.domEventName, t.eventSystemFlags, r[0], t.nativeEvent);
      if (s === null) {
        s = t.nativeEvent;
        var u = new s.constructor(s.type, s);
        qa = u, s.target.dispatchEvent(u), qa = null;
      } else return r = Uo(s), r !== null && ul(r), t.blockedOn = s, !1;
      r.shift();
    }
    return !0;
  }
  function Uf(t, r, s) {
    $i(t) && s.delete(r);
  }
  function uw() {
    cl = !1, _n !== null && $i(_n) && (_n = null), Tn !== null && $i(Tn) && (Tn = null), kn !== null && $i(kn) && (kn = null), Po.forEach(Uf), bo.forEach(Uf);
  }
  function Mo(t, r) {
    t.blockedOn === r && (t.blockedOn = null, cl || (cl = !0, n.unstable_scheduleCallback(n.unstable_NormalPriority, uw)));
  }
  function Ro(t) {
    function r(h) {
      return Mo(h, t);
    }
    if (0 < zi.length) {
      Mo(zi[0], t);
      for (var s = 1; s < zi.length; s++) {
        var u = zi[s];
        u.blockedOn === t && (u.blockedOn = null);
      }
    }
    for (_n !== null && Mo(_n, t), Tn !== null && Mo(Tn, t), kn !== null && Mo(kn, t), Po.forEach(r), bo.forEach(r), s = 0; s < An.length; s++) u = An[s], u.blockedOn === t && (u.blockedOn = null);
    for (; 0 < An.length && (s = An[0], s.blockedOn === null); ) $f(s), s.blockedOn === null && An.shift();
  }
  var Er = N.ReactCurrentBatchConfig, Ui = !0;
  function cw(t, r, s, u) {
    var h = xe, g = Er.transition;
    Er.transition = null;
    try {
      xe = 1, dl(t, r, s, u);
    } finally {
      xe = h, Er.transition = g;
    }
  }
  function dw(t, r, s, u) {
    var h = xe, g = Er.transition;
    Er.transition = null;
    try {
      xe = 4, dl(t, r, s, u);
    } finally {
      xe = h, Er.transition = g;
    }
  }
  function dl(t, r, s, u) {
    if (Ui) {
      var h = fl(t, r, s, u);
      if (h === null) El(t, r, u, Hi, s), zf(t, u);
      else if (lw(h, t, r, s, u)) u.stopPropagation();
      else if (zf(t, u), r & 4 && -1 < aw.indexOf(t)) {
        for (; h !== null; ) {
          var g = Uo(h);
          if (g !== null && Of(g), g = fl(t, r, s, u), g === null && El(t, r, u, Hi, s), g === h) break;
          h = g;
        }
        h !== null && u.stopPropagation();
      } else El(t, r, u, null, s);
    }
  }
  var Hi = null;
  function fl(t, r, s, u) {
    if (Hi = null, t = el(u), t = qn(t), t !== null) if (r = Jn(t), r === null) t = null;
    else if (s = r.tag, s === 13) {
      if (t = Pf(r), t !== null) return t;
      t = null;
    } else if (s === 3) {
      if (r.stateNode.current.memoizedState.isDehydrated) return r.tag === 3 ? r.stateNode.containerInfo : null;
      t = null;
    } else r !== t && (t = null);
    return Hi = t, null;
  }
  function Hf(t) {
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
        switch (JS()) {
          case il:
            return 1;
          case Nf:
            return 4;
          case Fi:
          case qS:
            return 16;
          case jf:
            return 536870912;
          default:
            return 16;
        }
      default:
        return 16;
    }
  }
  var Cn = null, pl = null, Wi = null;
  function Wf() {
    if (Wi) return Wi;
    var t, r = pl, s = r.length, u, h = "value" in Cn ? Cn.value : Cn.textContent, g = h.length;
    for (t = 0; t < s && r[t] === h[t]; t++) ;
    var _ = s - t;
    for (u = 1; u <= _ && r[s - u] === h[g - u]; u++) ;
    return Wi = h.slice(t, 1 < u ? 1 - u : void 0);
  }
  function Gi(t) {
    var r = t.keyCode;
    return "charCode" in t ? (t = t.charCode, t === 0 && r === 13 && (t = 13)) : t = r, t === 10 && (t = 13), 32 <= t || t === 13 ? t : 0;
  }
  function Ki() {
    return !0;
  }
  function Gf() {
    return !1;
  }
  function gt(t) {
    function r(s, u, h, g, _) {
      this._reactName = s, this._targetInst = h, this.type = u, this.nativeEvent = g, this.target = _, this.currentTarget = null;
      for (var b in t) t.hasOwnProperty(b) && (s = t[b], this[b] = s ? s(g) : g[b]);
      return this.isDefaultPrevented = (g.defaultPrevented != null ? g.defaultPrevented : g.returnValue === !1) ? Ki : Gf, this.isPropagationStopped = Gf, this;
    }
    return Y(r.prototype, { preventDefault: function() {
      this.defaultPrevented = !0;
      var s = this.nativeEvent;
      s && (s.preventDefault ? s.preventDefault() : typeof s.returnValue != "unknown" && (s.returnValue = !1), this.isDefaultPrevented = Ki);
    }, stopPropagation: function() {
      var s = this.nativeEvent;
      s && (s.stopPropagation ? s.stopPropagation() : typeof s.cancelBubble != "unknown" && (s.cancelBubble = !0), this.isPropagationStopped = Ki);
    }, persist: function() {
    }, isPersistent: Ki }), r;
  }
  var Mr = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(t) {
    return t.timeStamp || Date.now();
  }, defaultPrevented: 0, isTrusted: 0 }, ml = gt(Mr), Do = Y({}, Mr, { view: 0, detail: 0 }), fw = gt(Do), hl, yl, No, Yi = Y({}, Do, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: vl, button: 0, buttons: 0, relatedTarget: function(t) {
    return t.relatedTarget === void 0 ? t.fromElement === t.srcElement ? t.toElement : t.fromElement : t.relatedTarget;
  }, movementX: function(t) {
    return "movementX" in t ? t.movementX : (t !== No && (No && t.type === "mousemove" ? (hl = t.screenX - No.screenX, yl = t.screenY - No.screenY) : yl = hl = 0, No = t), hl);
  }, movementY: function(t) {
    return "movementY" in t ? t.movementY : yl;
  } }), Kf = gt(Yi), pw = Y({}, Yi, { dataTransfer: 0 }), mw = gt(pw), hw = Y({}, Do, { relatedTarget: 0 }), gl = gt(hw), yw = Y({}, Mr, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), gw = gt(yw), vw = Y({}, Mr, { clipboardData: function(t) {
    return "clipboardData" in t ? t.clipboardData : window.clipboardData;
  } }), Sw = gt(vw), ww = Y({}, Mr, { data: 0 }), Yf = gt(ww), xw = {
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
  }, _w = {
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
  }, Tw = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
  function kw(t) {
    var r = this.nativeEvent;
    return r.getModifierState ? r.getModifierState(t) : (t = Tw[t]) ? !!r[t] : !1;
  }
  function vl() {
    return kw;
  }
  var Aw = Y({}, Do, { key: function(t) {
    if (t.key) {
      var r = xw[t.key] || t.key;
      if (r !== "Unidentified") return r;
    }
    return t.type === "keypress" ? (t = Gi(t), t === 13 ? "Enter" : String.fromCharCode(t)) : t.type === "keydown" || t.type === "keyup" ? _w[t.keyCode] || "Unidentified" : "";
  }, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: vl, charCode: function(t) {
    return t.type === "keypress" ? Gi(t) : 0;
  }, keyCode: function(t) {
    return t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
  }, which: function(t) {
    return t.type === "keypress" ? Gi(t) : t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
  } }), Cw = gt(Aw), Pw = Y({}, Yi, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), Qf = gt(Pw), bw = Y({}, Do, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: vl }), Ew = gt(bw), Mw = Y({}, Mr, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), Rw = gt(Mw), Dw = Y({}, Yi, {
    deltaX: function(t) {
      return "deltaX" in t ? t.deltaX : "wheelDeltaX" in t ? -t.wheelDeltaX : 0;
    },
    deltaY: function(t) {
      return "deltaY" in t ? t.deltaY : "wheelDeltaY" in t ? -t.wheelDeltaY : "wheelDelta" in t ? -t.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), Nw = gt(Dw), jw = [9, 13, 27, 32], Sl = f && "CompositionEvent" in window, jo = null;
  f && "documentMode" in document && (jo = document.documentMode);
  var Iw = f && "TextEvent" in window && !jo, Xf = f && (!Sl || jo && 8 < jo && 11 >= jo), Zf = " ", Jf = !1;
  function qf(t, r) {
    switch (t) {
      case "keyup":
        return jw.indexOf(r.keyCode) !== -1;
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
  function ep(t) {
    return t = t.detail, typeof t == "object" && "data" in t ? t.data : null;
  }
  var Rr = !1;
  function Fw(t, r) {
    switch (t) {
      case "compositionend":
        return ep(r);
      case "keypress":
        return r.which !== 32 ? null : (Jf = !0, Zf);
      case "textInput":
        return t = r.data, t === Zf && Jf ? null : t;
      default:
        return null;
    }
  }
  function Ow(t, r) {
    if (Rr) return t === "compositionend" || !Sl && qf(t, r) ? (t = Wf(), Wi = pl = Cn = null, Rr = !1, t) : null;
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
        return Xf && r.locale !== "ko" ? null : r.data;
      default:
        return null;
    }
  }
  var Lw = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
  function tp(t) {
    var r = t && t.nodeName && t.nodeName.toLowerCase();
    return r === "input" ? !!Lw[t.type] : r === "textarea";
  }
  function np(t, r, s, u) {
    _f(u), r = qi(r, "onChange"), 0 < r.length && (s = new ml("onChange", "change", null, s, u), t.push({ event: s, listeners: r }));
  }
  var Io = null, Fo = null;
  function Vw(t) {
    wp(t, 0);
  }
  function Qi(t) {
    var r = Fr(t);
    if (cf(r)) return t;
  }
  function Bw(t, r) {
    if (t === "change") return r;
  }
  var rp = !1;
  if (f) {
    var wl;
    if (f) {
      var xl = "oninput" in document;
      if (!xl) {
        var op = document.createElement("div");
        op.setAttribute("oninput", "return;"), xl = typeof op.oninput == "function";
      }
      wl = xl;
    } else wl = !1;
    rp = wl && (!document.documentMode || 9 < document.documentMode);
  }
  function ip() {
    Io && (Io.detachEvent("onpropertychange", sp), Fo = Io = null);
  }
  function sp(t) {
    if (t.propertyName === "value" && Qi(Fo)) {
      var r = [];
      np(r, Fo, t, el(t)), Cf(Vw, r);
    }
  }
  function zw(t, r, s) {
    t === "focusin" ? (ip(), Io = r, Fo = s, Io.attachEvent("onpropertychange", sp)) : t === "focusout" && ip();
  }
  function $w(t) {
    if (t === "selectionchange" || t === "keyup" || t === "keydown") return Qi(Fo);
  }
  function Uw(t, r) {
    if (t === "click") return Qi(r);
  }
  function Hw(t, r) {
    if (t === "input" || t === "change") return Qi(r);
  }
  function Ww(t, r) {
    return t === r && (t !== 0 || 1 / t === 1 / r) || t !== t && r !== r;
  }
  var jt = typeof Object.is == "function" ? Object.is : Ww;
  function Oo(t, r) {
    if (jt(t, r)) return !0;
    if (typeof t != "object" || t === null || typeof r != "object" || r === null) return !1;
    var s = Object.keys(t), u = Object.keys(r);
    if (s.length !== u.length) return !1;
    for (u = 0; u < s.length; u++) {
      var h = s[u];
      if (!m.call(r, h) || !jt(t[h], r[h])) return !1;
    }
    return !0;
  }
  function ap(t) {
    for (; t && t.firstChild; ) t = t.firstChild;
    return t;
  }
  function lp(t, r) {
    var s = ap(t);
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
      s = ap(s);
    }
  }
  function up(t, r) {
    return t && r ? t === r ? !0 : t && t.nodeType === 3 ? !1 : r && r.nodeType === 3 ? up(t, r.parentNode) : "contains" in t ? t.contains(r) : t.compareDocumentPosition ? !!(t.compareDocumentPosition(r) & 16) : !1 : !1;
  }
  function cp() {
    for (var t = window, r = Di(); r instanceof t.HTMLIFrameElement; ) {
      try {
        var s = typeof r.contentWindow.location.href == "string";
      } catch {
        s = !1;
      }
      if (s) t = r.contentWindow;
      else break;
      r = Di(t.document);
    }
    return r;
  }
  function _l(t) {
    var r = t && t.nodeName && t.nodeName.toLowerCase();
    return r && (r === "input" && (t.type === "text" || t.type === "search" || t.type === "tel" || t.type === "url" || t.type === "password") || r === "textarea" || t.contentEditable === "true");
  }
  function Gw(t) {
    var r = cp(), s = t.focusedElem, u = t.selectionRange;
    if (r !== s && s && s.ownerDocument && up(s.ownerDocument.documentElement, s)) {
      if (u !== null && _l(s)) {
        if (r = u.start, t = u.end, t === void 0 && (t = r), "selectionStart" in s) s.selectionStart = r, s.selectionEnd = Math.min(t, s.value.length);
        else if (t = (r = s.ownerDocument || document) && r.defaultView || window, t.getSelection) {
          t = t.getSelection();
          var h = s.textContent.length, g = Math.min(u.start, h);
          u = u.end === void 0 ? g : Math.min(u.end, h), !t.extend && g > u && (h = u, u = g, g = h), h = lp(s, g);
          var _ = lp(
            s,
            u
          );
          h && _ && (t.rangeCount !== 1 || t.anchorNode !== h.node || t.anchorOffset !== h.offset || t.focusNode !== _.node || t.focusOffset !== _.offset) && (r = r.createRange(), r.setStart(h.node, h.offset), t.removeAllRanges(), g > u ? (t.addRange(r), t.extend(_.node, _.offset)) : (r.setEnd(_.node, _.offset), t.addRange(r)));
        }
      }
      for (r = [], t = s; t = t.parentNode; ) t.nodeType === 1 && r.push({ element: t, left: t.scrollLeft, top: t.scrollTop });
      for (typeof s.focus == "function" && s.focus(), s = 0; s < r.length; s++) t = r[s], t.element.scrollLeft = t.left, t.element.scrollTop = t.top;
    }
  }
  var Kw = f && "documentMode" in document && 11 >= document.documentMode, Dr = null, Tl = null, Lo = null, kl = !1;
  function dp(t, r, s) {
    var u = s.window === s ? s.document : s.nodeType === 9 ? s : s.ownerDocument;
    kl || Dr == null || Dr !== Di(u) || (u = Dr, "selectionStart" in u && _l(u) ? u = { start: u.selectionStart, end: u.selectionEnd } : (u = (u.ownerDocument && u.ownerDocument.defaultView || window).getSelection(), u = { anchorNode: u.anchorNode, anchorOffset: u.anchorOffset, focusNode: u.focusNode, focusOffset: u.focusOffset }), Lo && Oo(Lo, u) || (Lo = u, u = qi(Tl, "onSelect"), 0 < u.length && (r = new ml("onSelect", "select", null, r, s), t.push({ event: r, listeners: u }), r.target = Dr)));
  }
  function Xi(t, r) {
    var s = {};
    return s[t.toLowerCase()] = r.toLowerCase(), s["Webkit" + t] = "webkit" + r, s["Moz" + t] = "moz" + r, s;
  }
  var Nr = { animationend: Xi("Animation", "AnimationEnd"), animationiteration: Xi("Animation", "AnimationIteration"), animationstart: Xi("Animation", "AnimationStart"), transitionend: Xi("Transition", "TransitionEnd") }, Al = {}, fp = {};
  f && (fp = document.createElement("div").style, "AnimationEvent" in window || (delete Nr.animationend.animation, delete Nr.animationiteration.animation, delete Nr.animationstart.animation), "TransitionEvent" in window || delete Nr.transitionend.transition);
  function Zi(t) {
    if (Al[t]) return Al[t];
    if (!Nr[t]) return t;
    var r = Nr[t], s;
    for (s in r) if (r.hasOwnProperty(s) && s in fp) return Al[t] = r[s];
    return t;
  }
  var pp = Zi("animationend"), mp = Zi("animationiteration"), hp = Zi("animationstart"), yp = Zi("transitionend"), gp = /* @__PURE__ */ new Map(), vp = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
  function Pn(t, r) {
    gp.set(t, r), c(r, [t]);
  }
  for (var Cl = 0; Cl < vp.length; Cl++) {
    var Pl = vp[Cl], Yw = Pl.toLowerCase(), Qw = Pl[0].toUpperCase() + Pl.slice(1);
    Pn(Yw, "on" + Qw);
  }
  Pn(pp, "onAnimationEnd"), Pn(mp, "onAnimationIteration"), Pn(hp, "onAnimationStart"), Pn("dblclick", "onDoubleClick"), Pn("focusin", "onFocus"), Pn("focusout", "onBlur"), Pn(yp, "onTransitionEnd"), d("onMouseEnter", ["mouseout", "mouseover"]), d("onMouseLeave", ["mouseout", "mouseover"]), d("onPointerEnter", ["pointerout", "pointerover"]), d("onPointerLeave", ["pointerout", "pointerover"]), c("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), c("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), c("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]), c("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), c("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), c("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
  var Vo = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), Xw = new Set("cancel close invalid load scroll toggle".split(" ").concat(Vo));
  function Sp(t, r, s) {
    var u = t.type || "unknown-event";
    t.currentTarget = s, YS(u, r, void 0, t), t.currentTarget = null;
  }
  function wp(t, r) {
    r = (r & 4) !== 0;
    for (var s = 0; s < t.length; s++) {
      var u = t[s], h = u.event;
      u = u.listeners;
      e: {
        var g = void 0;
        if (r) for (var _ = u.length - 1; 0 <= _; _--) {
          var b = u[_], M = b.instance, F = b.currentTarget;
          if (b = b.listener, M !== g && h.isPropagationStopped()) break e;
          Sp(h, b, F), g = M;
        }
        else for (_ = 0; _ < u.length; _++) {
          if (b = u[_], M = b.instance, F = b.currentTarget, b = b.listener, M !== g && h.isPropagationStopped()) break e;
          Sp(h, b, F), g = M;
        }
      }
    }
    if (Ii) throw t = ol, Ii = !1, ol = null, t;
  }
  function Ee(t, r) {
    var s = r[Il];
    s === void 0 && (s = r[Il] = /* @__PURE__ */ new Set());
    var u = t + "__bubble";
    s.has(u) || (xp(r, t, 2, !1), s.add(u));
  }
  function bl(t, r, s) {
    var u = 0;
    r && (u |= 4), xp(s, t, u, r);
  }
  var Ji = "_reactListening" + Math.random().toString(36).slice(2);
  function Bo(t) {
    if (!t[Ji]) {
      t[Ji] = !0, i.forEach(function(s) {
        s !== "selectionchange" && (Xw.has(s) || bl(s, !1, t), bl(s, !0, t));
      });
      var r = t.nodeType === 9 ? t : t.ownerDocument;
      r === null || r[Ji] || (r[Ji] = !0, bl("selectionchange", !1, r));
    }
  }
  function xp(t, r, s, u) {
    switch (Hf(r)) {
      case 1:
        var h = cw;
        break;
      case 4:
        h = dw;
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
      var _ = u.tag;
      if (_ === 3 || _ === 4) {
        var b = u.stateNode.containerInfo;
        if (b === h || b.nodeType === 8 && b.parentNode === h) break;
        if (_ === 4) for (_ = u.return; _ !== null; ) {
          var M = _.tag;
          if ((M === 3 || M === 4) && (M = _.stateNode.containerInfo, M === h || M.nodeType === 8 && M.parentNode === h)) return;
          _ = _.return;
        }
        for (; b !== null; ) {
          if (_ = qn(b), _ === null) return;
          if (M = _.tag, M === 5 || M === 6) {
            u = g = _;
            continue e;
          }
          b = b.parentNode;
        }
      }
      u = u.return;
    }
    Cf(function() {
      var F = g, z = el(s), U = [];
      e: {
        var B = gp.get(t);
        if (B !== void 0) {
          var J = ml, te = t;
          switch (t) {
            case "keypress":
              if (Gi(s) === 0) break e;
            case "keydown":
            case "keyup":
              J = Cw;
              break;
            case "focusin":
              te = "focus", J = gl;
              break;
            case "focusout":
              te = "blur", J = gl;
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
              J = Kf;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              J = mw;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              J = Ew;
              break;
            case pp:
            case mp:
            case hp:
              J = gw;
              break;
            case yp:
              J = Rw;
              break;
            case "scroll":
              J = fw;
              break;
            case "wheel":
              J = Nw;
              break;
            case "copy":
            case "cut":
            case "paste":
              J = Sw;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              J = Qf;
          }
          var re = (r & 4) !== 0, Le = !re && t === "scroll", j = re ? B !== null ? B + "Capture" : null : B;
          re = [];
          for (var R = F, I; R !== null; ) {
            I = R;
            var H = I.stateNode;
            if (I.tag === 5 && H !== null && (I = H, j !== null && (H = _o(R, j), H != null && re.push(zo(R, H, I)))), Le) break;
            R = R.return;
          }
          0 < re.length && (B = new J(B, te, null, s, z), U.push({ event: B, listeners: re }));
        }
      }
      if ((r & 7) === 0) {
        e: {
          if (B = t === "mouseover" || t === "pointerover", J = t === "mouseout" || t === "pointerout", B && s !== qa && (te = s.relatedTarget || s.fromElement) && (qn(te) || te[on])) break e;
          if ((J || B) && (B = z.window === z ? z : (B = z.ownerDocument) ? B.defaultView || B.parentWindow : window, J ? (te = s.relatedTarget || s.toElement, J = F, te = te ? qn(te) : null, te !== null && (Le = Jn(te), te !== Le || te.tag !== 5 && te.tag !== 6) && (te = null)) : (J = null, te = F), J !== te)) {
            if (re = Kf, H = "onMouseLeave", j = "onMouseEnter", R = "mouse", (t === "pointerout" || t === "pointerover") && (re = Qf, H = "onPointerLeave", j = "onPointerEnter", R = "pointer"), Le = J == null ? B : Fr(J), I = te == null ? B : Fr(te), B = new re(H, R + "leave", J, s, z), B.target = Le, B.relatedTarget = I, H = null, qn(z) === F && (re = new re(j, R + "enter", te, s, z), re.target = I, re.relatedTarget = Le, H = re), Le = H, J && te) t: {
              for (re = J, j = te, R = 0, I = re; I; I = jr(I)) R++;
              for (I = 0, H = j; H; H = jr(H)) I++;
              for (; 0 < R - I; ) re = jr(re), R--;
              for (; 0 < I - R; ) j = jr(j), I--;
              for (; R--; ) {
                if (re === j || j !== null && re === j.alternate) break t;
                re = jr(re), j = jr(j);
              }
              re = null;
            }
            else re = null;
            J !== null && _p(U, B, J, re, !1), te !== null && Le !== null && _p(U, Le, te, re, !0);
          }
        }
        e: {
          if (B = F ? Fr(F) : window, J = B.nodeName && B.nodeName.toLowerCase(), J === "select" || J === "input" && B.type === "file") var oe = Bw;
          else if (tp(B)) if (rp) oe = Hw;
          else {
            oe = $w;
            var ie = zw;
          }
          else (J = B.nodeName) && J.toLowerCase() === "input" && (B.type === "checkbox" || B.type === "radio") && (oe = Uw);
          if (oe && (oe = oe(t, F))) {
            np(U, oe, s, z);
            break e;
          }
          ie && ie(t, B, F), t === "focusout" && (ie = B._wrapperState) && ie.controlled && B.type === "number" && Ya(B, "number", B.value);
        }
        switch (ie = F ? Fr(F) : window, t) {
          case "focusin":
            (tp(ie) || ie.contentEditable === "true") && (Dr = ie, Tl = F, Lo = null);
            break;
          case "focusout":
            Lo = Tl = Dr = null;
            break;
          case "mousedown":
            kl = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            kl = !1, dp(U, s, z);
            break;
          case "selectionchange":
            if (Kw) break;
          case "keydown":
          case "keyup":
            dp(U, s, z);
        }
        var se;
        if (Sl) e: {
          switch (t) {
            case "compositionstart":
              var le = "onCompositionStart";
              break e;
            case "compositionend":
              le = "onCompositionEnd";
              break e;
            case "compositionupdate":
              le = "onCompositionUpdate";
              break e;
          }
          le = void 0;
        }
        else Rr ? qf(t, s) && (le = "onCompositionEnd") : t === "keydown" && s.keyCode === 229 && (le = "onCompositionStart");
        le && (Xf && s.locale !== "ko" && (Rr || le !== "onCompositionStart" ? le === "onCompositionEnd" && Rr && (se = Wf()) : (Cn = z, pl = "value" in Cn ? Cn.value : Cn.textContent, Rr = !0)), ie = qi(F, le), 0 < ie.length && (le = new Yf(le, t, null, s, z), U.push({ event: le, listeners: ie }), se ? le.data = se : (se = ep(s), se !== null && (le.data = se)))), (se = Iw ? Fw(t, s) : Ow(t, s)) && (F = qi(F, "onBeforeInput"), 0 < F.length && (z = new Yf("onBeforeInput", "beforeinput", null, s, z), U.push({ event: z, listeners: F }), z.data = se));
      }
      wp(U, r);
    });
  }
  function zo(t, r, s) {
    return { instance: t, listener: r, currentTarget: s };
  }
  function qi(t, r) {
    for (var s = r + "Capture", u = []; t !== null; ) {
      var h = t, g = h.stateNode;
      h.tag === 5 && g !== null && (h = g, g = _o(t, s), g != null && u.unshift(zo(t, g, h)), g = _o(t, r), g != null && u.push(zo(t, g, h))), t = t.return;
    }
    return u;
  }
  function jr(t) {
    if (t === null) return null;
    do
      t = t.return;
    while (t && t.tag !== 5);
    return t || null;
  }
  function _p(t, r, s, u, h) {
    for (var g = r._reactName, _ = []; s !== null && s !== u; ) {
      var b = s, M = b.alternate, F = b.stateNode;
      if (M !== null && M === u) break;
      b.tag === 5 && F !== null && (b = F, h ? (M = _o(s, g), M != null && _.unshift(zo(s, M, b))) : h || (M = _o(s, g), M != null && _.push(zo(s, M, b)))), s = s.return;
    }
    _.length !== 0 && t.push({ event: r, listeners: _ });
  }
  var Zw = /\r\n?/g, Jw = /\u0000|\uFFFD/g;
  function Tp(t) {
    return (typeof t == "string" ? t : "" + t).replace(Zw, `
`).replace(Jw, "");
  }
  function es(t, r, s) {
    if (r = Tp(r), Tp(t) !== r && s) throw Error(o(425));
  }
  function ts() {
  }
  var Ml = null, Rl = null;
  function Dl(t, r) {
    return t === "textarea" || t === "noscript" || typeof r.children == "string" || typeof r.children == "number" || typeof r.dangerouslySetInnerHTML == "object" && r.dangerouslySetInnerHTML !== null && r.dangerouslySetInnerHTML.__html != null;
  }
  var Nl = typeof setTimeout == "function" ? setTimeout : void 0, qw = typeof clearTimeout == "function" ? clearTimeout : void 0, kp = typeof Promise == "function" ? Promise : void 0, ex = typeof queueMicrotask == "function" ? queueMicrotask : typeof kp < "u" ? function(t) {
    return kp.resolve(null).then(t).catch(tx);
  } : Nl;
  function tx(t) {
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
          t.removeChild(h), Ro(r);
          return;
        }
        u--;
      } else s !== "$" && s !== "$?" && s !== "$!" || u++;
      s = h;
    } while (s);
    Ro(r);
  }
  function bn(t) {
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
  function Ap(t) {
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
  var Ir = Math.random().toString(36).slice(2), Gt = "__reactFiber$" + Ir, $o = "__reactProps$" + Ir, on = "__reactContainer$" + Ir, Il = "__reactEvents$" + Ir, nx = "__reactListeners$" + Ir, rx = "__reactHandles$" + Ir;
  function qn(t) {
    var r = t[Gt];
    if (r) return r;
    for (var s = t.parentNode; s; ) {
      if (r = s[on] || s[Gt]) {
        if (s = r.alternate, r.child !== null || s !== null && s.child !== null) for (t = Ap(t); t !== null; ) {
          if (s = t[Gt]) return s;
          t = Ap(t);
        }
        return r;
      }
      t = s, s = t.parentNode;
    }
    return null;
  }
  function Uo(t) {
    return t = t[Gt] || t[on], !t || t.tag !== 5 && t.tag !== 6 && t.tag !== 13 && t.tag !== 3 ? null : t;
  }
  function Fr(t) {
    if (t.tag === 5 || t.tag === 6) return t.stateNode;
    throw Error(o(33));
  }
  function ns(t) {
    return t[$o] || null;
  }
  var Fl = [], Or = -1;
  function En(t) {
    return { current: t };
  }
  function Me(t) {
    0 > Or || (t.current = Fl[Or], Fl[Or] = null, Or--);
  }
  function Pe(t, r) {
    Or++, Fl[Or] = t.current, t.current = r;
  }
  var Mn = {}, qe = En(Mn), ut = En(!1), er = Mn;
  function Lr(t, r) {
    var s = t.type.contextTypes;
    if (!s) return Mn;
    var u = t.stateNode;
    if (u && u.__reactInternalMemoizedUnmaskedChildContext === r) return u.__reactInternalMemoizedMaskedChildContext;
    var h = {}, g;
    for (g in s) h[g] = r[g];
    return u && (t = t.stateNode, t.__reactInternalMemoizedUnmaskedChildContext = r, t.__reactInternalMemoizedMaskedChildContext = h), h;
  }
  function ct(t) {
    return t = t.childContextTypes, t != null;
  }
  function rs() {
    Me(ut), Me(qe);
  }
  function Cp(t, r, s) {
    if (qe.current !== Mn) throw Error(o(168));
    Pe(qe, r), Pe(ut, s);
  }
  function Pp(t, r, s) {
    var u = t.stateNode;
    if (r = r.childContextTypes, typeof u.getChildContext != "function") return s;
    u = u.getChildContext();
    for (var h in u) if (!(h in r)) throw Error(o(108, Ce(t) || "Unknown", h));
    return Y({}, s, u);
  }
  function os(t) {
    return t = (t = t.stateNode) && t.__reactInternalMemoizedMergedChildContext || Mn, er = qe.current, Pe(qe, t), Pe(ut, ut.current), !0;
  }
  function bp(t, r, s) {
    var u = t.stateNode;
    if (!u) throw Error(o(169));
    s ? (t = Pp(t, r, er), u.__reactInternalMemoizedMergedChildContext = t, Me(ut), Me(qe), Pe(qe, t)) : Me(ut), Pe(ut, s);
  }
  var sn = null, is = !1, Ol = !1;
  function Ep(t) {
    sn === null ? sn = [t] : sn.push(t);
  }
  function ox(t) {
    is = !0, Ep(t);
  }
  function Rn() {
    if (!Ol && sn !== null) {
      Ol = !0;
      var t = 0, r = xe;
      try {
        var s = sn;
        for (xe = 1; t < s.length; t++) {
          var u = s[t];
          do
            u = u(!0);
          while (u !== null);
        }
        sn = null, is = !1;
      } catch (h) {
        throw sn !== null && (sn = sn.slice(t + 1)), Rf(il, Rn), h;
      } finally {
        xe = r, Ol = !1;
      }
    }
    return null;
  }
  var Vr = [], Br = 0, ss = null, as = 0, Tt = [], kt = 0, tr = null, an = 1, ln = "";
  function nr(t, r) {
    Vr[Br++] = as, Vr[Br++] = ss, ss = t, as = r;
  }
  function Mp(t, r, s) {
    Tt[kt++] = an, Tt[kt++] = ln, Tt[kt++] = tr, tr = t;
    var u = an;
    t = ln;
    var h = 32 - Nt(u) - 1;
    u &= ~(1 << h), s += 1;
    var g = 32 - Nt(r) + h;
    if (30 < g) {
      var _ = h - h % 5;
      g = (u & (1 << _) - 1).toString(32), u >>= _, h -= _, an = 1 << 32 - Nt(r) + h | s << h | u, ln = g + t;
    } else an = 1 << g | s << h | u, ln = t;
  }
  function Ll(t) {
    t.return !== null && (nr(t, 1), Mp(t, 1, 0));
  }
  function Vl(t) {
    for (; t === ss; ) ss = Vr[--Br], Vr[Br] = null, as = Vr[--Br], Vr[Br] = null;
    for (; t === tr; ) tr = Tt[--kt], Tt[kt] = null, ln = Tt[--kt], Tt[kt] = null, an = Tt[--kt], Tt[kt] = null;
  }
  var vt = null, St = null, De = !1, It = null;
  function Rp(t, r) {
    var s = bt(5, null, null, 0);
    s.elementType = "DELETED", s.stateNode = r, s.return = t, r = t.deletions, r === null ? (t.deletions = [s], t.flags |= 16) : r.push(s);
  }
  function Dp(t, r) {
    switch (t.tag) {
      case 5:
        var s = t.type;
        return r = r.nodeType !== 1 || s.toLowerCase() !== r.nodeName.toLowerCase() ? null : r, r !== null ? (t.stateNode = r, vt = t, St = bn(r.firstChild), !0) : !1;
      case 6:
        return r = t.pendingProps === "" || r.nodeType !== 3 ? null : r, r !== null ? (t.stateNode = r, vt = t, St = null, !0) : !1;
      case 13:
        return r = r.nodeType !== 8 ? null : r, r !== null ? (s = tr !== null ? { id: an, overflow: ln } : null, t.memoizedState = { dehydrated: r, treeContext: s, retryLane: 1073741824 }, s = bt(18, null, null, 0), s.stateNode = r, s.return = t, t.child = s, vt = t, St = null, !0) : !1;
      default:
        return !1;
    }
  }
  function Bl(t) {
    return (t.mode & 1) !== 0 && (t.flags & 128) === 0;
  }
  function zl(t) {
    if (De) {
      var r = St;
      if (r) {
        var s = r;
        if (!Dp(t, r)) {
          if (Bl(t)) throw Error(o(418));
          r = bn(s.nextSibling);
          var u = vt;
          r && Dp(t, r) ? Rp(u, s) : (t.flags = t.flags & -4097 | 2, De = !1, vt = t);
        }
      } else {
        if (Bl(t)) throw Error(o(418));
        t.flags = t.flags & -4097 | 2, De = !1, vt = t;
      }
    }
  }
  function Np(t) {
    for (t = t.return; t !== null && t.tag !== 5 && t.tag !== 3 && t.tag !== 13; ) t = t.return;
    vt = t;
  }
  function ls(t) {
    if (t !== vt) return !1;
    if (!De) return Np(t), De = !0, !1;
    var r;
    if ((r = t.tag !== 3) && !(r = t.tag !== 5) && (r = t.type, r = r !== "head" && r !== "body" && !Dl(t.type, t.memoizedProps)), r && (r = St)) {
      if (Bl(t)) throw jp(), Error(o(418));
      for (; r; ) Rp(t, r), r = bn(r.nextSibling);
    }
    if (Np(t), t.tag === 13) {
      if (t = t.memoizedState, t = t !== null ? t.dehydrated : null, !t) throw Error(o(317));
      e: {
        for (t = t.nextSibling, r = 0; t; ) {
          if (t.nodeType === 8) {
            var s = t.data;
            if (s === "/$") {
              if (r === 0) {
                St = bn(t.nextSibling);
                break e;
              }
              r--;
            } else s !== "$" && s !== "$!" && s !== "$?" || r++;
          }
          t = t.nextSibling;
        }
        St = null;
      }
    } else St = vt ? bn(t.stateNode.nextSibling) : null;
    return !0;
  }
  function jp() {
    for (var t = St; t; ) t = bn(t.nextSibling);
  }
  function zr() {
    St = vt = null, De = !1;
  }
  function $l(t) {
    It === null ? It = [t] : It.push(t);
  }
  var ix = N.ReactCurrentBatchConfig;
  function Ho(t, r, s) {
    if (t = s.ref, t !== null && typeof t != "function" && typeof t != "object") {
      if (s._owner) {
        if (s = s._owner, s) {
          if (s.tag !== 1) throw Error(o(309));
          var u = s.stateNode;
        }
        if (!u) throw Error(o(147, t));
        var h = u, g = "" + t;
        return r !== null && r.ref !== null && typeof r.ref == "function" && r.ref._stringRef === g ? r.ref : (r = function(_) {
          var b = h.refs;
          _ === null ? delete b[g] : b[g] = _;
        }, r._stringRef = g, r);
      }
      if (typeof t != "string") throw Error(o(284));
      if (!s._owner) throw Error(o(290, t));
    }
    return t;
  }
  function us(t, r) {
    throw t = Object.prototype.toString.call(r), Error(o(31, t === "[object Object]" ? "object with keys {" + Object.keys(r).join(", ") + "}" : t));
  }
  function Ip(t) {
    var r = t._init;
    return r(t._payload);
  }
  function Fp(t) {
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
    function _(j) {
      return t && j.alternate === null && (j.flags |= 2), j;
    }
    function b(j, R, I, H) {
      return R === null || R.tag !== 6 ? (R = Nu(I, j.mode, H), R.return = j, R) : (R = h(R, I), R.return = j, R);
    }
    function M(j, R, I, H) {
      var oe = I.type;
      return oe === G ? z(j, R, I.props.children, H, I.key) : R !== null && (R.elementType === oe || typeof oe == "object" && oe !== null && oe.$$typeof === ve && Ip(oe) === R.type) ? (H = h(R, I.props), H.ref = Ho(j, R, I), H.return = j, H) : (H = Ns(I.type, I.key, I.props, null, j.mode, H), H.ref = Ho(j, R, I), H.return = j, H);
    }
    function F(j, R, I, H) {
      return R === null || R.tag !== 4 || R.stateNode.containerInfo !== I.containerInfo || R.stateNode.implementation !== I.implementation ? (R = ju(I, j.mode, H), R.return = j, R) : (R = h(R, I.children || []), R.return = j, R);
    }
    function z(j, R, I, H, oe) {
      return R === null || R.tag !== 7 ? (R = cr(I, j.mode, H, oe), R.return = j, R) : (R = h(R, I), R.return = j, R);
    }
    function U(j, R, I) {
      if (typeof R == "string" && R !== "" || typeof R == "number") return R = Nu("" + R, j.mode, I), R.return = j, R;
      if (typeof R == "object" && R !== null) {
        switch (R.$$typeof) {
          case O:
            return I = Ns(R.type, R.key, R.props, null, j.mode, I), I.ref = Ho(j, null, R), I.return = j, I;
          case W:
            return R = ju(R, j.mode, I), R.return = j, R;
          case ve:
            var H = R._init;
            return U(j, H(R._payload), I);
        }
        if (So(R) || Z(R)) return R = cr(R, j.mode, I, null), R.return = j, R;
        us(j, R);
      }
      return null;
    }
    function B(j, R, I, H) {
      var oe = R !== null ? R.key : null;
      if (typeof I == "string" && I !== "" || typeof I == "number") return oe !== null ? null : b(j, R, "" + I, H);
      if (typeof I == "object" && I !== null) {
        switch (I.$$typeof) {
          case O:
            return I.key === oe ? M(j, R, I, H) : null;
          case W:
            return I.key === oe ? F(j, R, I, H) : null;
          case ve:
            return oe = I._init, B(
              j,
              R,
              oe(I._payload),
              H
            );
        }
        if (So(I) || Z(I)) return oe !== null ? null : z(j, R, I, H, null);
        us(j, I);
      }
      return null;
    }
    function J(j, R, I, H, oe) {
      if (typeof H == "string" && H !== "" || typeof H == "number") return j = j.get(I) || null, b(R, j, "" + H, oe);
      if (typeof H == "object" && H !== null) {
        switch (H.$$typeof) {
          case O:
            return j = j.get(H.key === null ? I : H.key) || null, M(R, j, H, oe);
          case W:
            return j = j.get(H.key === null ? I : H.key) || null, F(R, j, H, oe);
          case ve:
            var ie = H._init;
            return J(j, R, I, ie(H._payload), oe);
        }
        if (So(H) || Z(H)) return j = j.get(I) || null, z(R, j, H, oe, null);
        us(R, H);
      }
      return null;
    }
    function te(j, R, I, H) {
      for (var oe = null, ie = null, se = R, le = R = 0, Ge = null; se !== null && le < I.length; le++) {
        se.index > le ? (Ge = se, se = null) : Ge = se.sibling;
        var ge = B(j, se, I[le], H);
        if (ge === null) {
          se === null && (se = Ge);
          break;
        }
        t && se && ge.alternate === null && r(j, se), R = g(ge, R, le), ie === null ? oe = ge : ie.sibling = ge, ie = ge, se = Ge;
      }
      if (le === I.length) return s(j, se), De && nr(j, le), oe;
      if (se === null) {
        for (; le < I.length; le++) se = U(j, I[le], H), se !== null && (R = g(se, R, le), ie === null ? oe = se : ie.sibling = se, ie = se);
        return De && nr(j, le), oe;
      }
      for (se = u(j, se); le < I.length; le++) Ge = J(se, j, le, I[le], H), Ge !== null && (t && Ge.alternate !== null && se.delete(Ge.key === null ? le : Ge.key), R = g(Ge, R, le), ie === null ? oe = Ge : ie.sibling = Ge, ie = Ge);
      return t && se.forEach(function(Bn) {
        return r(j, Bn);
      }), De && nr(j, le), oe;
    }
    function re(j, R, I, H) {
      var oe = Z(I);
      if (typeof oe != "function") throw Error(o(150));
      if (I = oe.call(I), I == null) throw Error(o(151));
      for (var ie = oe = null, se = R, le = R = 0, Ge = null, ge = I.next(); se !== null && !ge.done; le++, ge = I.next()) {
        se.index > le ? (Ge = se, se = null) : Ge = se.sibling;
        var Bn = B(j, se, ge.value, H);
        if (Bn === null) {
          se === null && (se = Ge);
          break;
        }
        t && se && Bn.alternate === null && r(j, se), R = g(Bn, R, le), ie === null ? oe = Bn : ie.sibling = Bn, ie = Bn, se = Ge;
      }
      if (ge.done) return s(
        j,
        se
      ), De && nr(j, le), oe;
      if (se === null) {
        for (; !ge.done; le++, ge = I.next()) ge = U(j, ge.value, H), ge !== null && (R = g(ge, R, le), ie === null ? oe = ge : ie.sibling = ge, ie = ge);
        return De && nr(j, le), oe;
      }
      for (se = u(j, se); !ge.done; le++, ge = I.next()) ge = J(se, j, le, ge.value, H), ge !== null && (t && ge.alternate !== null && se.delete(ge.key === null ? le : ge.key), R = g(ge, R, le), ie === null ? oe = ge : ie.sibling = ge, ie = ge);
      return t && se.forEach(function(Lx) {
        return r(j, Lx);
      }), De && nr(j, le), oe;
    }
    function Le(j, R, I, H) {
      if (typeof I == "object" && I !== null && I.type === G && I.key === null && (I = I.props.children), typeof I == "object" && I !== null) {
        switch (I.$$typeof) {
          case O:
            e: {
              for (var oe = I.key, ie = R; ie !== null; ) {
                if (ie.key === oe) {
                  if (oe = I.type, oe === G) {
                    if (ie.tag === 7) {
                      s(j, ie.sibling), R = h(ie, I.props.children), R.return = j, j = R;
                      break e;
                    }
                  } else if (ie.elementType === oe || typeof oe == "object" && oe !== null && oe.$$typeof === ve && Ip(oe) === ie.type) {
                    s(j, ie.sibling), R = h(ie, I.props), R.ref = Ho(j, ie, I), R.return = j, j = R;
                    break e;
                  }
                  s(j, ie);
                  break;
                } else r(j, ie);
                ie = ie.sibling;
              }
              I.type === G ? (R = cr(I.props.children, j.mode, H, I.key), R.return = j, j = R) : (H = Ns(I.type, I.key, I.props, null, j.mode, H), H.ref = Ho(j, R, I), H.return = j, j = H);
            }
            return _(j);
          case W:
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
              R = ju(I, j.mode, H), R.return = j, j = R;
            }
            return _(j);
          case ve:
            return ie = I._init, Le(j, R, ie(I._payload), H);
        }
        if (So(I)) return te(j, R, I, H);
        if (Z(I)) return re(j, R, I, H);
        us(j, I);
      }
      return typeof I == "string" && I !== "" || typeof I == "number" ? (I = "" + I, R !== null && R.tag === 6 ? (s(j, R.sibling), R = h(R, I), R.return = j, j = R) : (s(j, R), R = Nu(I, j.mode, H), R.return = j, j = R), _(j)) : s(j, R);
    }
    return Le;
  }
  var $r = Fp(!0), Op = Fp(!1), cs = En(null), ds = null, Ur = null, Ul = null;
  function Hl() {
    Ul = Ur = ds = null;
  }
  function Wl(t) {
    var r = cs.current;
    Me(cs), t._currentValue = r;
  }
  function Gl(t, r, s) {
    for (; t !== null; ) {
      var u = t.alternate;
      if ((t.childLanes & r) !== r ? (t.childLanes |= r, u !== null && (u.childLanes |= r)) : u !== null && (u.childLanes & r) !== r && (u.childLanes |= r), t === s) break;
      t = t.return;
    }
  }
  function Hr(t, r) {
    ds = t, Ul = Ur = null, t = t.dependencies, t !== null && t.firstContext !== null && ((t.lanes & r) !== 0 && (dt = !0), t.firstContext = null);
  }
  function At(t) {
    var r = t._currentValue;
    if (Ul !== t) if (t = { context: t, memoizedValue: r, next: null }, Ur === null) {
      if (ds === null) throw Error(o(308));
      Ur = t, ds.dependencies = { lanes: 0, firstContext: t };
    } else Ur = Ur.next = t;
    return r;
  }
  var rr = null;
  function Kl(t) {
    rr === null ? rr = [t] : rr.push(t);
  }
  function Lp(t, r, s, u) {
    var h = r.interleaved;
    return h === null ? (s.next = s, Kl(r)) : (s.next = h.next, h.next = s), r.interleaved = s, un(t, u);
  }
  function un(t, r) {
    t.lanes |= r;
    var s = t.alternate;
    for (s !== null && (s.lanes |= r), s = t, t = t.return; t !== null; ) t.childLanes |= r, s = t.alternate, s !== null && (s.childLanes |= r), s = t, t = t.return;
    return s.tag === 3 ? s.stateNode : null;
  }
  var Dn = !1;
  function Yl(t) {
    t.updateQueue = { baseState: t.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
  }
  function Vp(t, r) {
    t = t.updateQueue, r.updateQueue === t && (r.updateQueue = { baseState: t.baseState, firstBaseUpdate: t.firstBaseUpdate, lastBaseUpdate: t.lastBaseUpdate, shared: t.shared, effects: t.effects });
  }
  function cn(t, r) {
    return { eventTime: t, lane: r, tag: 0, payload: null, callback: null, next: null };
  }
  function Nn(t, r, s) {
    var u = t.updateQueue;
    if (u === null) return null;
    if (u = u.shared, (me & 2) !== 0) {
      var h = u.pending;
      return h === null ? r.next = r : (r.next = h.next, h.next = r), u.pending = r, un(t, s);
    }
    return h = u.interleaved, h === null ? (r.next = r, Kl(u)) : (r.next = h.next, h.next = r), u.interleaved = r, un(t, s);
  }
  function fs(t, r, s) {
    if (r = r.updateQueue, r !== null && (r = r.shared, (s & 4194240) !== 0)) {
      var u = r.lanes;
      u &= t.pendingLanes, s |= u, r.lanes = s, ll(t, s);
    }
  }
  function Bp(t, r) {
    var s = t.updateQueue, u = t.alternate;
    if (u !== null && (u = u.updateQueue, s === u)) {
      var h = null, g = null;
      if (s = s.firstBaseUpdate, s !== null) {
        do {
          var _ = { eventTime: s.eventTime, lane: s.lane, tag: s.tag, payload: s.payload, callback: s.callback, next: null };
          g === null ? h = g = _ : g = g.next = _, s = s.next;
        } while (s !== null);
        g === null ? h = g = r : g = g.next = r;
      } else h = g = r;
      s = { baseState: u.baseState, firstBaseUpdate: h, lastBaseUpdate: g, shared: u.shared, effects: u.effects }, t.updateQueue = s;
      return;
    }
    t = s.lastBaseUpdate, t === null ? s.firstBaseUpdate = r : t.next = r, s.lastBaseUpdate = r;
  }
  function ps(t, r, s, u) {
    var h = t.updateQueue;
    Dn = !1;
    var g = h.firstBaseUpdate, _ = h.lastBaseUpdate, b = h.shared.pending;
    if (b !== null) {
      h.shared.pending = null;
      var M = b, F = M.next;
      M.next = null, _ === null ? g = F : _.next = F, _ = M;
      var z = t.alternate;
      z !== null && (z = z.updateQueue, b = z.lastBaseUpdate, b !== _ && (b === null ? z.firstBaseUpdate = F : b.next = F, z.lastBaseUpdate = M));
    }
    if (g !== null) {
      var U = h.baseState;
      _ = 0, z = F = M = null, b = g;
      do {
        var B = b.lane, J = b.eventTime;
        if ((u & B) === B) {
          z !== null && (z = z.next = {
            eventTime: J,
            lane: 0,
            tag: b.tag,
            payload: b.payload,
            callback: b.callback,
            next: null
          });
          e: {
            var te = t, re = b;
            switch (B = r, J = s, re.tag) {
              case 1:
                if (te = re.payload, typeof te == "function") {
                  U = te.call(J, U, B);
                  break e;
                }
                U = te;
                break e;
              case 3:
                te.flags = te.flags & -65537 | 128;
              case 0:
                if (te = re.payload, B = typeof te == "function" ? te.call(J, U, B) : te, B == null) break e;
                U = Y({}, U, B);
                break e;
              case 2:
                Dn = !0;
            }
          }
          b.callback !== null && b.lane !== 0 && (t.flags |= 64, B = h.effects, B === null ? h.effects = [b] : B.push(b));
        } else J = { eventTime: J, lane: B, tag: b.tag, payload: b.payload, callback: b.callback, next: null }, z === null ? (F = z = J, M = U) : z = z.next = J, _ |= B;
        if (b = b.next, b === null) {
          if (b = h.shared.pending, b === null) break;
          B = b, b = B.next, B.next = null, h.lastBaseUpdate = B, h.shared.pending = null;
        }
      } while (!0);
      if (z === null && (M = U), h.baseState = M, h.firstBaseUpdate = F, h.lastBaseUpdate = z, r = h.shared.interleaved, r !== null) {
        h = r;
        do
          _ |= h.lane, h = h.next;
        while (h !== r);
      } else g === null && (h.shared.lanes = 0);
      sr |= _, t.lanes = _, t.memoizedState = U;
    }
  }
  function zp(t, r, s) {
    if (t = r.effects, r.effects = null, t !== null) for (r = 0; r < t.length; r++) {
      var u = t[r], h = u.callback;
      if (h !== null) {
        if (u.callback = null, u = s, typeof h != "function") throw Error(o(191, h));
        h.call(u);
      }
    }
  }
  var Wo = {}, Kt = En(Wo), Go = En(Wo), Ko = En(Wo);
  function or(t) {
    if (t === Wo) throw Error(o(174));
    return t;
  }
  function Ql(t, r) {
    switch (Pe(Ko, r), Pe(Go, t), Pe(Kt, Wo), t = r.nodeType, t) {
      case 9:
      case 11:
        r = (r = r.documentElement) ? r.namespaceURI : Xa(null, "");
        break;
      default:
        t = t === 8 ? r.parentNode : r, r = t.namespaceURI || null, t = t.tagName, r = Xa(r, t);
    }
    Me(Kt), Pe(Kt, r);
  }
  function Wr() {
    Me(Kt), Me(Go), Me(Ko);
  }
  function $p(t) {
    or(Ko.current);
    var r = or(Kt.current), s = Xa(r, t.type);
    r !== s && (Pe(Go, t), Pe(Kt, s));
  }
  function Xl(t) {
    Go.current === t && (Me(Kt), Me(Go));
  }
  var Ne = En(0);
  function ms(t) {
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
  var hs = N.ReactCurrentDispatcher, ql = N.ReactCurrentBatchConfig, ir = 0, je = null, ze = null, He = null, ys = !1, Yo = !1, Qo = 0, sx = 0;
  function et() {
    throw Error(o(321));
  }
  function eu(t, r) {
    if (r === null) return !1;
    for (var s = 0; s < r.length && s < t.length; s++) if (!jt(t[s], r[s])) return !1;
    return !0;
  }
  function tu(t, r, s, u, h, g) {
    if (ir = g, je = r, r.memoizedState = null, r.updateQueue = null, r.lanes = 0, hs.current = t === null || t.memoizedState === null ? cx : dx, t = s(u, h), Yo) {
      g = 0;
      do {
        if (Yo = !1, Qo = 0, 25 <= g) throw Error(o(301));
        g += 1, He = ze = null, r.updateQueue = null, hs.current = fx, t = s(u, h);
      } while (Yo);
    }
    if (hs.current = Ss, r = ze !== null && ze.next !== null, ir = 0, He = ze = je = null, ys = !1, r) throw Error(o(300));
    return t;
  }
  function nu() {
    var t = Qo !== 0;
    return Qo = 0, t;
  }
  function Yt() {
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
  function Xo(t, r) {
    return typeof r == "function" ? r(t) : r;
  }
  function ru(t) {
    var r = Ct(), s = r.queue;
    if (s === null) throw Error(o(311));
    s.lastRenderedReducer = t;
    var u = ze, h = u.baseQueue, g = s.pending;
    if (g !== null) {
      if (h !== null) {
        var _ = h.next;
        h.next = g.next, g.next = _;
      }
      u.baseQueue = h = g, s.pending = null;
    }
    if (h !== null) {
      g = h.next, u = u.baseState;
      var b = _ = null, M = null, F = g;
      do {
        var z = F.lane;
        if ((ir & z) === z) M !== null && (M = M.next = { lane: 0, action: F.action, hasEagerState: F.hasEagerState, eagerState: F.eagerState, next: null }), u = F.hasEagerState ? F.eagerState : t(u, F.action);
        else {
          var U = {
            lane: z,
            action: F.action,
            hasEagerState: F.hasEagerState,
            eagerState: F.eagerState,
            next: null
          };
          M === null ? (b = M = U, _ = u) : M = M.next = U, je.lanes |= z, sr |= z;
        }
        F = F.next;
      } while (F !== null && F !== g);
      M === null ? _ = u : M.next = b, jt(u, r.memoizedState) || (dt = !0), r.memoizedState = u, r.baseState = _, r.baseQueue = M, s.lastRenderedState = u;
    }
    if (t = s.interleaved, t !== null) {
      h = t;
      do
        g = h.lane, je.lanes |= g, sr |= g, h = h.next;
      while (h !== t);
    } else h === null && (s.lanes = 0);
    return [r.memoizedState, s.dispatch];
  }
  function ou(t) {
    var r = Ct(), s = r.queue;
    if (s === null) throw Error(o(311));
    s.lastRenderedReducer = t;
    var u = s.dispatch, h = s.pending, g = r.memoizedState;
    if (h !== null) {
      s.pending = null;
      var _ = h = h.next;
      do
        g = t(g, _.action), _ = _.next;
      while (_ !== h);
      jt(g, r.memoizedState) || (dt = !0), r.memoizedState = g, r.baseQueue === null && (r.baseState = g), s.lastRenderedState = g;
    }
    return [g, u];
  }
  function Up() {
  }
  function Hp(t, r) {
    var s = je, u = Ct(), h = r(), g = !jt(u.memoizedState, h);
    if (g && (u.memoizedState = h, dt = !0), u = u.queue, iu(Kp.bind(null, s, u, t), [t]), u.getSnapshot !== r || g || He !== null && He.memoizedState.tag & 1) {
      if (s.flags |= 2048, Zo(9, Gp.bind(null, s, u, h, r), void 0, null), We === null) throw Error(o(349));
      (ir & 30) !== 0 || Wp(s, r, h);
    }
    return h;
  }
  function Wp(t, r, s) {
    t.flags |= 16384, t = { getSnapshot: r, value: s }, r = je.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, je.updateQueue = r, r.stores = [t]) : (s = r.stores, s === null ? r.stores = [t] : s.push(t));
  }
  function Gp(t, r, s, u) {
    r.value = s, r.getSnapshot = u, Yp(r) && Qp(t);
  }
  function Kp(t, r, s) {
    return s(function() {
      Yp(r) && Qp(t);
    });
  }
  function Yp(t) {
    var r = t.getSnapshot;
    t = t.value;
    try {
      var s = r();
      return !jt(t, s);
    } catch {
      return !0;
    }
  }
  function Qp(t) {
    var r = un(t, 1);
    r !== null && Vt(r, t, 1, -1);
  }
  function Xp(t) {
    var r = Yt();
    return typeof t == "function" && (t = t()), r.memoizedState = r.baseState = t, t = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: Xo, lastRenderedState: t }, r.queue = t, t = t.dispatch = ux.bind(null, je, t), [r.memoizedState, t];
  }
  function Zo(t, r, s, u) {
    return t = { tag: t, create: r, destroy: s, deps: u, next: null }, r = je.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, je.updateQueue = r, r.lastEffect = t.next = t) : (s = r.lastEffect, s === null ? r.lastEffect = t.next = t : (u = s.next, s.next = t, t.next = u, r.lastEffect = t)), t;
  }
  function Zp() {
    return Ct().memoizedState;
  }
  function gs(t, r, s, u) {
    var h = Yt();
    je.flags |= t, h.memoizedState = Zo(1 | r, s, void 0, u === void 0 ? null : u);
  }
  function vs(t, r, s, u) {
    var h = Ct();
    u = u === void 0 ? null : u;
    var g = void 0;
    if (ze !== null) {
      var _ = ze.memoizedState;
      if (g = _.destroy, u !== null && eu(u, _.deps)) {
        h.memoizedState = Zo(r, s, g, u);
        return;
      }
    }
    je.flags |= t, h.memoizedState = Zo(1 | r, s, g, u);
  }
  function Jp(t, r) {
    return gs(8390656, 8, t, r);
  }
  function iu(t, r) {
    return vs(2048, 8, t, r);
  }
  function qp(t, r) {
    return vs(4, 2, t, r);
  }
  function em(t, r) {
    return vs(4, 4, t, r);
  }
  function tm(t, r) {
    if (typeof r == "function") return t = t(), r(t), function() {
      r(null);
    };
    if (r != null) return t = t(), r.current = t, function() {
      r.current = null;
    };
  }
  function nm(t, r, s) {
    return s = s != null ? s.concat([t]) : null, vs(4, 4, tm.bind(null, r, t), s);
  }
  function su() {
  }
  function rm(t, r) {
    var s = Ct();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && eu(r, u[1]) ? u[0] : (s.memoizedState = [t, r], t);
  }
  function om(t, r) {
    var s = Ct();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && eu(r, u[1]) ? u[0] : (t = t(), s.memoizedState = [t, r], t);
  }
  function im(t, r, s) {
    return (ir & 21) === 0 ? (t.baseState && (t.baseState = !1, dt = !0), t.memoizedState = s) : (jt(s, r) || (s = If(), je.lanes |= s, sr |= s, t.baseState = !0), r);
  }
  function ax(t, r) {
    var s = xe;
    xe = s !== 0 && 4 > s ? s : 4, t(!0);
    var u = ql.transition;
    ql.transition = {};
    try {
      t(!1), r();
    } finally {
      xe = s, ql.transition = u;
    }
  }
  function sm() {
    return Ct().memoizedState;
  }
  function lx(t, r, s) {
    var u = On(t);
    if (s = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null }, am(t)) lm(r, s);
    else if (s = Lp(t, r, s, u), s !== null) {
      var h = ot();
      Vt(s, t, u, h), um(s, r, u);
    }
  }
  function ux(t, r, s) {
    var u = On(t), h = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null };
    if (am(t)) lm(r, h);
    else {
      var g = t.alternate;
      if (t.lanes === 0 && (g === null || g.lanes === 0) && (g = r.lastRenderedReducer, g !== null)) try {
        var _ = r.lastRenderedState, b = g(_, s);
        if (h.hasEagerState = !0, h.eagerState = b, jt(b, _)) {
          var M = r.interleaved;
          M === null ? (h.next = h, Kl(r)) : (h.next = M.next, M.next = h), r.interleaved = h;
          return;
        }
      } catch {
      } finally {
      }
      s = Lp(t, r, h, u), s !== null && (h = ot(), Vt(s, t, u, h), um(s, r, u));
    }
  }
  function am(t) {
    var r = t.alternate;
    return t === je || r !== null && r === je;
  }
  function lm(t, r) {
    Yo = ys = !0;
    var s = t.pending;
    s === null ? r.next = r : (r.next = s.next, s.next = r), t.pending = r;
  }
  function um(t, r, s) {
    if ((s & 4194240) !== 0) {
      var u = r.lanes;
      u &= t.pendingLanes, s |= u, r.lanes = s, ll(t, s);
    }
  }
  var Ss = { readContext: At, useCallback: et, useContext: et, useEffect: et, useImperativeHandle: et, useInsertionEffect: et, useLayoutEffect: et, useMemo: et, useReducer: et, useRef: et, useState: et, useDebugValue: et, useDeferredValue: et, useTransition: et, useMutableSource: et, useSyncExternalStore: et, useId: et, unstable_isNewReconciler: !1 }, cx = { readContext: At, useCallback: function(t, r) {
    return Yt().memoizedState = [t, r === void 0 ? null : r], t;
  }, useContext: At, useEffect: Jp, useImperativeHandle: function(t, r, s) {
    return s = s != null ? s.concat([t]) : null, gs(
      4194308,
      4,
      tm.bind(null, r, t),
      s
    );
  }, useLayoutEffect: function(t, r) {
    return gs(4194308, 4, t, r);
  }, useInsertionEffect: function(t, r) {
    return gs(4, 2, t, r);
  }, useMemo: function(t, r) {
    var s = Yt();
    return r = r === void 0 ? null : r, t = t(), s.memoizedState = [t, r], t;
  }, useReducer: function(t, r, s) {
    var u = Yt();
    return r = s !== void 0 ? s(r) : r, u.memoizedState = u.baseState = r, t = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: t, lastRenderedState: r }, u.queue = t, t = t.dispatch = lx.bind(null, je, t), [u.memoizedState, t];
  }, useRef: function(t) {
    var r = Yt();
    return t = { current: t }, r.memoizedState = t;
  }, useState: Xp, useDebugValue: su, useDeferredValue: function(t) {
    return Yt().memoizedState = t;
  }, useTransition: function() {
    var t = Xp(!1), r = t[0];
    return t = ax.bind(null, t[1]), Yt().memoizedState = t, [r, t];
  }, useMutableSource: function() {
  }, useSyncExternalStore: function(t, r, s) {
    var u = je, h = Yt();
    if (De) {
      if (s === void 0) throw Error(o(407));
      s = s();
    } else {
      if (s = r(), We === null) throw Error(o(349));
      (ir & 30) !== 0 || Wp(u, r, s);
    }
    h.memoizedState = s;
    var g = { value: s, getSnapshot: r };
    return h.queue = g, Jp(Kp.bind(
      null,
      u,
      g,
      t
    ), [t]), u.flags |= 2048, Zo(9, Gp.bind(null, u, g, s, r), void 0, null), s;
  }, useId: function() {
    var t = Yt(), r = We.identifierPrefix;
    if (De) {
      var s = ln, u = an;
      s = (u & ~(1 << 32 - Nt(u) - 1)).toString(32) + s, r = ":" + r + "R" + s, s = Qo++, 0 < s && (r += "H" + s.toString(32)), r += ":";
    } else s = sx++, r = ":" + r + "r" + s.toString(32) + ":";
    return t.memoizedState = r;
  }, unstable_isNewReconciler: !1 }, dx = {
    readContext: At,
    useCallback: rm,
    useContext: At,
    useEffect: iu,
    useImperativeHandle: nm,
    useInsertionEffect: qp,
    useLayoutEffect: em,
    useMemo: om,
    useReducer: ru,
    useRef: Zp,
    useState: function() {
      return ru(Xo);
    },
    useDebugValue: su,
    useDeferredValue: function(t) {
      var r = Ct();
      return im(r, ze.memoizedState, t);
    },
    useTransition: function() {
      var t = ru(Xo)[0], r = Ct().memoizedState;
      return [t, r];
    },
    useMutableSource: Up,
    useSyncExternalStore: Hp,
    useId: sm,
    unstable_isNewReconciler: !1
  }, fx = { readContext: At, useCallback: rm, useContext: At, useEffect: iu, useImperativeHandle: nm, useInsertionEffect: qp, useLayoutEffect: em, useMemo: om, useReducer: ou, useRef: Zp, useState: function() {
    return ou(Xo);
  }, useDebugValue: su, useDeferredValue: function(t) {
    var r = Ct();
    return ze === null ? r.memoizedState = t : im(r, ze.memoizedState, t);
  }, useTransition: function() {
    var t = ou(Xo)[0], r = Ct().memoizedState;
    return [t, r];
  }, useMutableSource: Up, useSyncExternalStore: Hp, useId: sm, unstable_isNewReconciler: !1 };
  function Ft(t, r) {
    if (t && t.defaultProps) {
      r = Y({}, r), t = t.defaultProps;
      for (var s in t) r[s] === void 0 && (r[s] = t[s]);
      return r;
    }
    return r;
  }
  function au(t, r, s, u) {
    r = t.memoizedState, s = s(u, r), s = s == null ? r : Y({}, r, s), t.memoizedState = s, t.lanes === 0 && (t.updateQueue.baseState = s);
  }
  var ws = { isMounted: function(t) {
    return (t = t._reactInternals) ? Jn(t) === t : !1;
  }, enqueueSetState: function(t, r, s) {
    t = t._reactInternals;
    var u = ot(), h = On(t), g = cn(u, h);
    g.payload = r, s != null && (g.callback = s), r = Nn(t, g, h), r !== null && (Vt(r, t, h, u), fs(r, t, h));
  }, enqueueReplaceState: function(t, r, s) {
    t = t._reactInternals;
    var u = ot(), h = On(t), g = cn(u, h);
    g.tag = 1, g.payload = r, s != null && (g.callback = s), r = Nn(t, g, h), r !== null && (Vt(r, t, h, u), fs(r, t, h));
  }, enqueueForceUpdate: function(t, r) {
    t = t._reactInternals;
    var s = ot(), u = On(t), h = cn(s, u);
    h.tag = 2, r != null && (h.callback = r), r = Nn(t, h, u), r !== null && (Vt(r, t, u, s), fs(r, t, u));
  } };
  function cm(t, r, s, u, h, g, _) {
    return t = t.stateNode, typeof t.shouldComponentUpdate == "function" ? t.shouldComponentUpdate(u, g, _) : r.prototype && r.prototype.isPureReactComponent ? !Oo(s, u) || !Oo(h, g) : !0;
  }
  function dm(t, r, s) {
    var u = !1, h = Mn, g = r.contextType;
    return typeof g == "object" && g !== null ? g = At(g) : (h = ct(r) ? er : qe.current, u = r.contextTypes, g = (u = u != null) ? Lr(t, h) : Mn), r = new r(s, g), t.memoizedState = r.state !== null && r.state !== void 0 ? r.state : null, r.updater = ws, t.stateNode = r, r._reactInternals = t, u && (t = t.stateNode, t.__reactInternalMemoizedUnmaskedChildContext = h, t.__reactInternalMemoizedMaskedChildContext = g), r;
  }
  function fm(t, r, s, u) {
    t = r.state, typeof r.componentWillReceiveProps == "function" && r.componentWillReceiveProps(s, u), typeof r.UNSAFE_componentWillReceiveProps == "function" && r.UNSAFE_componentWillReceiveProps(s, u), r.state !== t && ws.enqueueReplaceState(r, r.state, null);
  }
  function lu(t, r, s, u) {
    var h = t.stateNode;
    h.props = s, h.state = t.memoizedState, h.refs = {}, Yl(t);
    var g = r.contextType;
    typeof g == "object" && g !== null ? h.context = At(g) : (g = ct(r) ? er : qe.current, h.context = Lr(t, g)), h.state = t.memoizedState, g = r.getDerivedStateFromProps, typeof g == "function" && (au(t, r, g, s), h.state = t.memoizedState), typeof r.getDerivedStateFromProps == "function" || typeof h.getSnapshotBeforeUpdate == "function" || typeof h.UNSAFE_componentWillMount != "function" && typeof h.componentWillMount != "function" || (r = h.state, typeof h.componentWillMount == "function" && h.componentWillMount(), typeof h.UNSAFE_componentWillMount == "function" && h.UNSAFE_componentWillMount(), r !== h.state && ws.enqueueReplaceState(h, h.state, null), ps(t, s, h, u), h.state = t.memoizedState), typeof h.componentDidMount == "function" && (t.flags |= 4194308);
  }
  function Gr(t, r) {
    try {
      var s = "", u = r;
      do
        s += he(u), u = u.return;
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
  var px = typeof WeakMap == "function" ? WeakMap : Map;
  function pm(t, r, s) {
    s = cn(-1, s), s.tag = 3, s.payload = { element: null };
    var u = r.value;
    return s.callback = function() {
      Ps || (Ps = !0, Au = u), cu(t, r);
    }, s;
  }
  function mm(t, r, s) {
    s = cn(-1, s), s.tag = 3;
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
      cu(t, r), typeof u != "function" && (In === null ? In = /* @__PURE__ */ new Set([this]) : In.add(this));
      var _ = r.stack;
      this.componentDidCatch(r.value, { componentStack: _ !== null ? _ : "" });
    }), s;
  }
  function hm(t, r, s) {
    var u = t.pingCache;
    if (u === null) {
      u = t.pingCache = new px();
      var h = /* @__PURE__ */ new Set();
      u.set(r, h);
    } else h = u.get(r), h === void 0 && (h = /* @__PURE__ */ new Set(), u.set(r, h));
    h.has(s) || (h.add(s), t = Px.bind(null, t, r, s), r.then(t, t));
  }
  function ym(t) {
    do {
      var r;
      if ((r = t.tag === 13) && (r = t.memoizedState, r = r !== null ? r.dehydrated !== null : !0), r) return t;
      t = t.return;
    } while (t !== null);
    return null;
  }
  function gm(t, r, s, u, h) {
    return (t.mode & 1) === 0 ? (t === r ? t.flags |= 65536 : (t.flags |= 128, s.flags |= 131072, s.flags &= -52805, s.tag === 1 && (s.alternate === null ? s.tag = 17 : (r = cn(-1, 1), r.tag = 2, Nn(s, r, 1))), s.lanes |= 1), t) : (t.flags |= 65536, t.lanes = h, t);
  }
  var mx = N.ReactCurrentOwner, dt = !1;
  function rt(t, r, s, u) {
    r.child = t === null ? Op(r, null, s, u) : $r(r, t.child, s, u);
  }
  function vm(t, r, s, u, h) {
    s = s.render;
    var g = r.ref;
    return Hr(r, h), u = tu(t, r, s, u, g, h), s = nu(), t !== null && !dt ? (r.updateQueue = t.updateQueue, r.flags &= -2053, t.lanes &= ~h, dn(t, r, h)) : (De && s && Ll(r), r.flags |= 1, rt(t, r, u, h), r.child);
  }
  function Sm(t, r, s, u, h) {
    if (t === null) {
      var g = s.type;
      return typeof g == "function" && !Du(g) && g.defaultProps === void 0 && s.compare === null && s.defaultProps === void 0 ? (r.tag = 15, r.type = g, wm(t, r, g, u, h)) : (t = Ns(s.type, null, u, r, r.mode, h), t.ref = r.ref, t.return = r, r.child = t);
    }
    if (g = t.child, (t.lanes & h) === 0) {
      var _ = g.memoizedProps;
      if (s = s.compare, s = s !== null ? s : Oo, s(_, u) && t.ref === r.ref) return dn(t, r, h);
    }
    return r.flags |= 1, t = Vn(g, u), t.ref = r.ref, t.return = r, r.child = t;
  }
  function wm(t, r, s, u, h) {
    if (t !== null) {
      var g = t.memoizedProps;
      if (Oo(g, u) && t.ref === r.ref) if (dt = !1, r.pendingProps = u = g, (t.lanes & h) !== 0) (t.flags & 131072) !== 0 && (dt = !0);
      else return r.lanes = t.lanes, dn(t, r, h);
    }
    return du(t, r, s, u, h);
  }
  function xm(t, r, s) {
    var u = r.pendingProps, h = u.children, g = t !== null ? t.memoizedState : null;
    if (u.mode === "hidden") if ((r.mode & 1) === 0) r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, Pe(Yr, wt), wt |= s;
    else {
      if ((s & 1073741824) === 0) return t = g !== null ? g.baseLanes | s : s, r.lanes = r.childLanes = 1073741824, r.memoizedState = { baseLanes: t, cachePool: null, transitions: null }, r.updateQueue = null, Pe(Yr, wt), wt |= t, null;
      r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, u = g !== null ? g.baseLanes : s, Pe(Yr, wt), wt |= u;
    }
    else g !== null ? (u = g.baseLanes | s, r.memoizedState = null) : u = s, Pe(Yr, wt), wt |= u;
    return rt(t, r, h, s), r.child;
  }
  function _m(t, r) {
    var s = r.ref;
    (t === null && s !== null || t !== null && t.ref !== s) && (r.flags |= 512, r.flags |= 2097152);
  }
  function du(t, r, s, u, h) {
    var g = ct(s) ? er : qe.current;
    return g = Lr(r, g), Hr(r, h), s = tu(t, r, s, u, g, h), u = nu(), t !== null && !dt ? (r.updateQueue = t.updateQueue, r.flags &= -2053, t.lanes &= ~h, dn(t, r, h)) : (De && u && Ll(r), r.flags |= 1, rt(t, r, s, h), r.child);
  }
  function Tm(t, r, s, u, h) {
    if (ct(s)) {
      var g = !0;
      os(r);
    } else g = !1;
    if (Hr(r, h), r.stateNode === null) _s(t, r), dm(r, s, u), lu(r, s, u, h), u = !0;
    else if (t === null) {
      var _ = r.stateNode, b = r.memoizedProps;
      _.props = b;
      var M = _.context, F = s.contextType;
      typeof F == "object" && F !== null ? F = At(F) : (F = ct(s) ? er : qe.current, F = Lr(r, F));
      var z = s.getDerivedStateFromProps, U = typeof z == "function" || typeof _.getSnapshotBeforeUpdate == "function";
      U || typeof _.UNSAFE_componentWillReceiveProps != "function" && typeof _.componentWillReceiveProps != "function" || (b !== u || M !== F) && fm(r, _, u, F), Dn = !1;
      var B = r.memoizedState;
      _.state = B, ps(r, u, _, h), M = r.memoizedState, b !== u || B !== M || ut.current || Dn ? (typeof z == "function" && (au(r, s, z, u), M = r.memoizedState), (b = Dn || cm(r, s, b, u, B, M, F)) ? (U || typeof _.UNSAFE_componentWillMount != "function" && typeof _.componentWillMount != "function" || (typeof _.componentWillMount == "function" && _.componentWillMount(), typeof _.UNSAFE_componentWillMount == "function" && _.UNSAFE_componentWillMount()), typeof _.componentDidMount == "function" && (r.flags |= 4194308)) : (typeof _.componentDidMount == "function" && (r.flags |= 4194308), r.memoizedProps = u, r.memoizedState = M), _.props = u, _.state = M, _.context = F, u = b) : (typeof _.componentDidMount == "function" && (r.flags |= 4194308), u = !1);
    } else {
      _ = r.stateNode, Vp(t, r), b = r.memoizedProps, F = r.type === r.elementType ? b : Ft(r.type, b), _.props = F, U = r.pendingProps, B = _.context, M = s.contextType, typeof M == "object" && M !== null ? M = At(M) : (M = ct(s) ? er : qe.current, M = Lr(r, M));
      var J = s.getDerivedStateFromProps;
      (z = typeof J == "function" || typeof _.getSnapshotBeforeUpdate == "function") || typeof _.UNSAFE_componentWillReceiveProps != "function" && typeof _.componentWillReceiveProps != "function" || (b !== U || B !== M) && fm(r, _, u, M), Dn = !1, B = r.memoizedState, _.state = B, ps(r, u, _, h);
      var te = r.memoizedState;
      b !== U || B !== te || ut.current || Dn ? (typeof J == "function" && (au(r, s, J, u), te = r.memoizedState), (F = Dn || cm(r, s, F, u, B, te, M) || !1) ? (z || typeof _.UNSAFE_componentWillUpdate != "function" && typeof _.componentWillUpdate != "function" || (typeof _.componentWillUpdate == "function" && _.componentWillUpdate(u, te, M), typeof _.UNSAFE_componentWillUpdate == "function" && _.UNSAFE_componentWillUpdate(u, te, M)), typeof _.componentDidUpdate == "function" && (r.flags |= 4), typeof _.getSnapshotBeforeUpdate == "function" && (r.flags |= 1024)) : (typeof _.componentDidUpdate != "function" || b === t.memoizedProps && B === t.memoizedState || (r.flags |= 4), typeof _.getSnapshotBeforeUpdate != "function" || b === t.memoizedProps && B === t.memoizedState || (r.flags |= 1024), r.memoizedProps = u, r.memoizedState = te), _.props = u, _.state = te, _.context = M, u = F) : (typeof _.componentDidUpdate != "function" || b === t.memoizedProps && B === t.memoizedState || (r.flags |= 4), typeof _.getSnapshotBeforeUpdate != "function" || b === t.memoizedProps && B === t.memoizedState || (r.flags |= 1024), u = !1);
    }
    return fu(t, r, s, u, g, h);
  }
  function fu(t, r, s, u, h, g) {
    _m(t, r);
    var _ = (r.flags & 128) !== 0;
    if (!u && !_) return h && bp(r, s, !1), dn(t, r, g);
    u = r.stateNode, mx.current = r;
    var b = _ && typeof s.getDerivedStateFromError != "function" ? null : u.render();
    return r.flags |= 1, t !== null && _ ? (r.child = $r(r, t.child, null, g), r.child = $r(r, null, b, g)) : rt(t, r, b, g), r.memoizedState = u.state, h && bp(r, s, !0), r.child;
  }
  function km(t) {
    var r = t.stateNode;
    r.pendingContext ? Cp(t, r.pendingContext, r.pendingContext !== r.context) : r.context && Cp(t, r.context, !1), Ql(t, r.containerInfo);
  }
  function Am(t, r, s, u, h) {
    return zr(), $l(h), r.flags |= 256, rt(t, r, s, u), r.child;
  }
  var pu = { dehydrated: null, treeContext: null, retryLane: 0 };
  function mu(t) {
    return { baseLanes: t, cachePool: null, transitions: null };
  }
  function Cm(t, r, s) {
    var u = r.pendingProps, h = Ne.current, g = !1, _ = (r.flags & 128) !== 0, b;
    if ((b = _) || (b = t !== null && t.memoizedState === null ? !1 : (h & 2) !== 0), b ? (g = !0, r.flags &= -129) : (t === null || t.memoizedState !== null) && (h |= 1), Pe(Ne, h & 1), t === null)
      return zl(r), t = r.memoizedState, t !== null && (t = t.dehydrated, t !== null) ? ((r.mode & 1) === 0 ? r.lanes = 1 : t.data === "$!" ? r.lanes = 8 : r.lanes = 1073741824, null) : (_ = u.children, t = u.fallback, g ? (u = r.mode, g = r.child, _ = { mode: "hidden", children: _ }, (u & 1) === 0 && g !== null ? (g.childLanes = 0, g.pendingProps = _) : g = js(_, u, 0, null), t = cr(t, u, s, null), g.return = r, t.return = r, g.sibling = t, r.child = g, r.child.memoizedState = mu(s), r.memoizedState = pu, t) : hu(r, _));
    if (h = t.memoizedState, h !== null && (b = h.dehydrated, b !== null)) return hx(t, r, _, u, b, h, s);
    if (g) {
      g = u.fallback, _ = r.mode, h = t.child, b = h.sibling;
      var M = { mode: "hidden", children: u.children };
      return (_ & 1) === 0 && r.child !== h ? (u = r.child, u.childLanes = 0, u.pendingProps = M, r.deletions = null) : (u = Vn(h, M), u.subtreeFlags = h.subtreeFlags & 14680064), b !== null ? g = Vn(b, g) : (g = cr(g, _, s, null), g.flags |= 2), g.return = r, u.return = r, u.sibling = g, r.child = u, u = g, g = r.child, _ = t.child.memoizedState, _ = _ === null ? mu(s) : { baseLanes: _.baseLanes | s, cachePool: null, transitions: _.transitions }, g.memoizedState = _, g.childLanes = t.childLanes & ~s, r.memoizedState = pu, u;
    }
    return g = t.child, t = g.sibling, u = Vn(g, { mode: "visible", children: u.children }), (r.mode & 1) === 0 && (u.lanes = s), u.return = r, u.sibling = null, t !== null && (s = r.deletions, s === null ? (r.deletions = [t], r.flags |= 16) : s.push(t)), r.child = u, r.memoizedState = null, u;
  }
  function hu(t, r) {
    return r = js({ mode: "visible", children: r }, t.mode, 0, null), r.return = t, t.child = r;
  }
  function xs(t, r, s, u) {
    return u !== null && $l(u), $r(r, t.child, null, s), t = hu(r, r.pendingProps.children), t.flags |= 2, r.memoizedState = null, t;
  }
  function hx(t, r, s, u, h, g, _) {
    if (s)
      return r.flags & 256 ? (r.flags &= -257, u = uu(Error(o(422))), xs(t, r, _, u)) : r.memoizedState !== null ? (r.child = t.child, r.flags |= 128, null) : (g = u.fallback, h = r.mode, u = js({ mode: "visible", children: u.children }, h, 0, null), g = cr(g, h, _, null), g.flags |= 2, u.return = r, g.return = r, u.sibling = g, r.child = u, (r.mode & 1) !== 0 && $r(r, t.child, null, _), r.child.memoizedState = mu(_), r.memoizedState = pu, g);
    if ((r.mode & 1) === 0) return xs(t, r, _, null);
    if (h.data === "$!") {
      if (u = h.nextSibling && h.nextSibling.dataset, u) var b = u.dgst;
      return u = b, g = Error(o(419)), u = uu(g, u, void 0), xs(t, r, _, u);
    }
    if (b = (_ & t.childLanes) !== 0, dt || b) {
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
        h = (h & (u.suspendedLanes | _)) !== 0 ? 0 : h, h !== 0 && h !== g.retryLane && (g.retryLane = h, un(t, h), Vt(u, t, h, -1));
      }
      return Ru(), u = uu(Error(o(421))), xs(t, r, _, u);
    }
    return h.data === "$?" ? (r.flags |= 128, r.child = t.child, r = bx.bind(null, t), h._reactRetry = r, null) : (t = g.treeContext, St = bn(h.nextSibling), vt = r, De = !0, It = null, t !== null && (Tt[kt++] = an, Tt[kt++] = ln, Tt[kt++] = tr, an = t.id, ln = t.overflow, tr = r), r = hu(r, u.children), r.flags |= 4096, r);
  }
  function Pm(t, r, s) {
    t.lanes |= r;
    var u = t.alternate;
    u !== null && (u.lanes |= r), Gl(t.return, r, s);
  }
  function yu(t, r, s, u, h) {
    var g = t.memoizedState;
    g === null ? t.memoizedState = { isBackwards: r, rendering: null, renderingStartTime: 0, last: u, tail: s, tailMode: h } : (g.isBackwards = r, g.rendering = null, g.renderingStartTime = 0, g.last = u, g.tail = s, g.tailMode = h);
  }
  function bm(t, r, s) {
    var u = r.pendingProps, h = u.revealOrder, g = u.tail;
    if (rt(t, r, u.children, s), u = Ne.current, (u & 2) !== 0) u = u & 1 | 2, r.flags |= 128;
    else {
      if (t !== null && (t.flags & 128) !== 0) e: for (t = r.child; t !== null; ) {
        if (t.tag === 13) t.memoizedState !== null && Pm(t, s, r);
        else if (t.tag === 19) Pm(t, s, r);
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
    if (Pe(Ne, u), (r.mode & 1) === 0) r.memoizedState = null;
    else switch (h) {
      case "forwards":
        for (s = r.child, h = null; s !== null; ) t = s.alternate, t !== null && ms(t) === null && (h = s), s = s.sibling;
        s = h, s === null ? (h = r.child, r.child = null) : (h = s.sibling, s.sibling = null), yu(r, !1, h, s, g);
        break;
      case "backwards":
        for (s = null, h = r.child, r.child = null; h !== null; ) {
          if (t = h.alternate, t !== null && ms(t) === null) {
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
  function _s(t, r) {
    (r.mode & 1) === 0 && t !== null && (t.alternate = null, r.alternate = null, r.flags |= 2);
  }
  function dn(t, r, s) {
    if (t !== null && (r.dependencies = t.dependencies), sr |= r.lanes, (s & r.childLanes) === 0) return null;
    if (t !== null && r.child !== t.child) throw Error(o(153));
    if (r.child !== null) {
      for (t = r.child, s = Vn(t, t.pendingProps), r.child = s, s.return = r; t.sibling !== null; ) t = t.sibling, s = s.sibling = Vn(t, t.pendingProps), s.return = r;
      s.sibling = null;
    }
    return r.child;
  }
  function yx(t, r, s) {
    switch (r.tag) {
      case 3:
        km(r), zr();
        break;
      case 5:
        $p(r);
        break;
      case 1:
        ct(r.type) && os(r);
        break;
      case 4:
        Ql(r, r.stateNode.containerInfo);
        break;
      case 10:
        var u = r.type._context, h = r.memoizedProps.value;
        Pe(cs, u._currentValue), u._currentValue = h;
        break;
      case 13:
        if (u = r.memoizedState, u !== null)
          return u.dehydrated !== null ? (Pe(Ne, Ne.current & 1), r.flags |= 128, null) : (s & r.child.childLanes) !== 0 ? Cm(t, r, s) : (Pe(Ne, Ne.current & 1), t = dn(t, r, s), t !== null ? t.sibling : null);
        Pe(Ne, Ne.current & 1);
        break;
      case 19:
        if (u = (s & r.childLanes) !== 0, (t.flags & 128) !== 0) {
          if (u) return bm(t, r, s);
          r.flags |= 128;
        }
        if (h = r.memoizedState, h !== null && (h.rendering = null, h.tail = null, h.lastEffect = null), Pe(Ne, Ne.current), u) break;
        return null;
      case 22:
      case 23:
        return r.lanes = 0, xm(t, r, s);
    }
    return dn(t, r, s);
  }
  var Em, gu, Mm, Rm;
  Em = function(t, r) {
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
  }, Mm = function(t, r, s, u) {
    var h = t.memoizedProps;
    if (h !== u) {
      t = r.stateNode, or(Kt.current);
      var g = null;
      switch (s) {
        case "input":
          h = Ga(t, h), u = Ga(t, u), g = [];
          break;
        case "select":
          h = Y({}, h, { value: void 0 }), u = Y({}, u, { value: void 0 }), g = [];
          break;
        case "textarea":
          h = Qa(t, h), u = Qa(t, u), g = [];
          break;
        default:
          typeof h.onClick != "function" && typeof u.onClick == "function" && (t.onclick = ts);
      }
      Za(s, u);
      var _;
      s = null;
      for (F in h) if (!u.hasOwnProperty(F) && h.hasOwnProperty(F) && h[F] != null) if (F === "style") {
        var b = h[F];
        for (_ in b) b.hasOwnProperty(_) && (s || (s = {}), s[_] = "");
      } else F !== "dangerouslySetInnerHTML" && F !== "children" && F !== "suppressContentEditableWarning" && F !== "suppressHydrationWarning" && F !== "autoFocus" && (a.hasOwnProperty(F) ? g || (g = []) : (g = g || []).push(F, null));
      for (F in u) {
        var M = u[F];
        if (b = h != null ? h[F] : void 0, u.hasOwnProperty(F) && M !== b && (M != null || b != null)) if (F === "style") if (b) {
          for (_ in b) !b.hasOwnProperty(_) || M && M.hasOwnProperty(_) || (s || (s = {}), s[_] = "");
          for (_ in M) M.hasOwnProperty(_) && b[_] !== M[_] && (s || (s = {}), s[_] = M[_]);
        } else s || (g || (g = []), g.push(
          F,
          s
        )), s = M;
        else F === "dangerouslySetInnerHTML" ? (M = M ? M.__html : void 0, b = b ? b.__html : void 0, M != null && b !== M && (g = g || []).push(F, M)) : F === "children" ? typeof M != "string" && typeof M != "number" || (g = g || []).push(F, "" + M) : F !== "suppressContentEditableWarning" && F !== "suppressHydrationWarning" && (a.hasOwnProperty(F) ? (M != null && F === "onScroll" && Ee("scroll", t), g || b === M || (g = [])) : (g = g || []).push(F, M));
      }
      s && (g = g || []).push("style", s);
      var F = g;
      (r.updateQueue = F) && (r.flags |= 4);
    }
  }, Rm = function(t, r, s, u) {
    s !== u && (r.flags |= 4);
  };
  function Jo(t, r) {
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
  function gx(t, r, s) {
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
        return ct(r.type) && rs(), tt(r), null;
      case 3:
        return u = r.stateNode, Wr(), Me(ut), Me(qe), Jl(), u.pendingContext && (u.context = u.pendingContext, u.pendingContext = null), (t === null || t.child === null) && (ls(r) ? r.flags |= 4 : t === null || t.memoizedState.isDehydrated && (r.flags & 256) === 0 || (r.flags |= 1024, It !== null && (bu(It), It = null))), gu(t, r), tt(r), null;
      case 5:
        Xl(r);
        var h = or(Ko.current);
        if (s = r.type, t !== null && r.stateNode != null) Mm(t, r, s, u, h), t.ref !== r.ref && (r.flags |= 512, r.flags |= 2097152);
        else {
          if (!u) {
            if (r.stateNode === null) throw Error(o(166));
            return tt(r), null;
          }
          if (t = or(Kt.current), ls(r)) {
            u = r.stateNode, s = r.type;
            var g = r.memoizedProps;
            switch (u[Gt] = r, u[$o] = g, t = (r.mode & 1) !== 0, s) {
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
                for (h = 0; h < Vo.length; h++) Ee(Vo[h], u);
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
                df(u, g), Ee("invalid", u);
                break;
              case "select":
                u._wrapperState = { wasMultiple: !!g.multiple }, Ee("invalid", u);
                break;
              case "textarea":
                mf(u, g), Ee("invalid", u);
            }
            Za(s, g), h = null;
            for (var _ in g) if (g.hasOwnProperty(_)) {
              var b = g[_];
              _ === "children" ? typeof b == "string" ? u.textContent !== b && (g.suppressHydrationWarning !== !0 && es(u.textContent, b, t), h = ["children", b]) : typeof b == "number" && u.textContent !== "" + b && (g.suppressHydrationWarning !== !0 && es(
                u.textContent,
                b,
                t
              ), h = ["children", "" + b]) : a.hasOwnProperty(_) && b != null && _ === "onScroll" && Ee("scroll", u);
            }
            switch (s) {
              case "input":
                Ri(u), pf(u, g, !0);
                break;
              case "textarea":
                Ri(u), yf(u);
                break;
              case "select":
              case "option":
                break;
              default:
                typeof g.onClick == "function" && (u.onclick = ts);
            }
            u = h, r.updateQueue = u, u !== null && (r.flags |= 4);
          } else {
            _ = h.nodeType === 9 ? h : h.ownerDocument, t === "http://www.w3.org/1999/xhtml" && (t = gf(s)), t === "http://www.w3.org/1999/xhtml" ? s === "script" ? (t = _.createElement("div"), t.innerHTML = "<script><\/script>", t = t.removeChild(t.firstChild)) : typeof u.is == "string" ? t = _.createElement(s, { is: u.is }) : (t = _.createElement(s), s === "select" && (_ = t, u.multiple ? _.multiple = !0 : u.size && (_.size = u.size))) : t = _.createElementNS(t, s), t[Gt] = r, t[$o] = u, Em(t, r, !1, !1), r.stateNode = t;
            e: {
              switch (_ = Ja(s, u), s) {
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
                  for (h = 0; h < Vo.length; h++) Ee(Vo[h], t);
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
                  df(t, u), h = Ga(t, u), Ee("invalid", t);
                  break;
                case "option":
                  h = u;
                  break;
                case "select":
                  t._wrapperState = { wasMultiple: !!u.multiple }, h = Y({}, u, { value: void 0 }), Ee("invalid", t);
                  break;
                case "textarea":
                  mf(t, u), h = Qa(t, u), Ee("invalid", t);
                  break;
                default:
                  h = u;
              }
              Za(s, h), b = h;
              for (g in b) if (b.hasOwnProperty(g)) {
                var M = b[g];
                g === "style" ? wf(t, M) : g === "dangerouslySetInnerHTML" ? (M = M ? M.__html : void 0, M != null && vf(t, M)) : g === "children" ? typeof M == "string" ? (s !== "textarea" || M !== "") && wo(t, M) : typeof M == "number" && wo(t, "" + M) : g !== "suppressContentEditableWarning" && g !== "suppressHydrationWarning" && g !== "autoFocus" && (a.hasOwnProperty(g) ? M != null && g === "onScroll" && Ee("scroll", t) : M != null && E(t, g, M, _));
              }
              switch (s) {
                case "input":
                  Ri(t), pf(t, u, !1);
                  break;
                case "textarea":
                  Ri(t), yf(t);
                  break;
                case "option":
                  u.value != null && t.setAttribute("value", "" + we(u.value));
                  break;
                case "select":
                  t.multiple = !!u.multiple, g = u.value, g != null ? Cr(t, !!u.multiple, g, !1) : u.defaultValue != null && Cr(
                    t,
                    !!u.multiple,
                    u.defaultValue,
                    !0
                  );
                  break;
                default:
                  typeof h.onClick == "function" && (t.onclick = ts);
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
        if (t && r.stateNode != null) Rm(t, r, t.memoizedProps, u);
        else {
          if (typeof u != "string" && r.stateNode === null) throw Error(o(166));
          if (s = or(Ko.current), or(Kt.current), ls(r)) {
            if (u = r.stateNode, s = r.memoizedProps, u[Gt] = r, (g = u.nodeValue !== s) && (t = vt, t !== null)) switch (t.tag) {
              case 3:
                es(u.nodeValue, s, (t.mode & 1) !== 0);
                break;
              case 5:
                t.memoizedProps.suppressHydrationWarning !== !0 && es(u.nodeValue, s, (t.mode & 1) !== 0);
            }
            g && (r.flags |= 4);
          } else u = (s.nodeType === 9 ? s : s.ownerDocument).createTextNode(u), u[Gt] = r, r.stateNode = u;
        }
        return tt(r), null;
      case 13:
        if (Me(Ne), u = r.memoizedState, t === null || t.memoizedState !== null && t.memoizedState.dehydrated !== null) {
          if (De && St !== null && (r.mode & 1) !== 0 && (r.flags & 128) === 0) jp(), zr(), r.flags |= 98560, g = !1;
          else if (g = ls(r), u !== null && u.dehydrated !== null) {
            if (t === null) {
              if (!g) throw Error(o(318));
              if (g = r.memoizedState, g = g !== null ? g.dehydrated : null, !g) throw Error(o(317));
              g[Gt] = r;
            } else zr(), (r.flags & 128) === 0 && (r.memoizedState = null), r.flags |= 4;
            tt(r), g = !1;
          } else It !== null && (bu(It), It = null), g = !0;
          if (!g) return r.flags & 65536 ? r : null;
        }
        return (r.flags & 128) !== 0 ? (r.lanes = s, r) : (u = u !== null, u !== (t !== null && t.memoizedState !== null) && u && (r.child.flags |= 8192, (r.mode & 1) !== 0 && (t === null || (Ne.current & 1) !== 0 ? $e === 0 && ($e = 3) : Ru())), r.updateQueue !== null && (r.flags |= 4), tt(r), null);
      case 4:
        return Wr(), gu(t, r), t === null && Bo(r.stateNode.containerInfo), tt(r), null;
      case 10:
        return Wl(r.type._context), tt(r), null;
      case 17:
        return ct(r.type) && rs(), tt(r), null;
      case 19:
        if (Me(Ne), g = r.memoizedState, g === null) return tt(r), null;
        if (u = (r.flags & 128) !== 0, _ = g.rendering, _ === null) if (u) Jo(g, !1);
        else {
          if ($e !== 0 || t !== null && (t.flags & 128) !== 0) for (t = r.child; t !== null; ) {
            if (_ = ms(t), _ !== null) {
              for (r.flags |= 128, Jo(g, !1), u = _.updateQueue, u !== null && (r.updateQueue = u, r.flags |= 4), r.subtreeFlags = 0, u = s, s = r.child; s !== null; ) g = s, t = u, g.flags &= 14680066, _ = g.alternate, _ === null ? (g.childLanes = 0, g.lanes = t, g.child = null, g.subtreeFlags = 0, g.memoizedProps = null, g.memoizedState = null, g.updateQueue = null, g.dependencies = null, g.stateNode = null) : (g.childLanes = _.childLanes, g.lanes = _.lanes, g.child = _.child, g.subtreeFlags = 0, g.deletions = null, g.memoizedProps = _.memoizedProps, g.memoizedState = _.memoizedState, g.updateQueue = _.updateQueue, g.type = _.type, t = _.dependencies, g.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }), s = s.sibling;
              return Pe(Ne, Ne.current & 1 | 2), r.child;
            }
            t = t.sibling;
          }
          g.tail !== null && Oe() > Qr && (r.flags |= 128, u = !0, Jo(g, !1), r.lanes = 4194304);
        }
        else {
          if (!u) if (t = ms(_), t !== null) {
            if (r.flags |= 128, u = !0, s = t.updateQueue, s !== null && (r.updateQueue = s, r.flags |= 4), Jo(g, !0), g.tail === null && g.tailMode === "hidden" && !_.alternate && !De) return tt(r), null;
          } else 2 * Oe() - g.renderingStartTime > Qr && s !== 1073741824 && (r.flags |= 128, u = !0, Jo(g, !1), r.lanes = 4194304);
          g.isBackwards ? (_.sibling = r.child, r.child = _) : (s = g.last, s !== null ? s.sibling = _ : r.child = _, g.last = _);
        }
        return g.tail !== null ? (r = g.tail, g.rendering = r, g.tail = r.sibling, g.renderingStartTime = Oe(), r.sibling = null, s = Ne.current, Pe(Ne, u ? s & 1 | 2 : s & 1), r) : (tt(r), null);
      case 22:
      case 23:
        return Mu(), u = r.memoizedState !== null, t !== null && t.memoizedState !== null !== u && (r.flags |= 8192), u && (r.mode & 1) !== 0 ? (wt & 1073741824) !== 0 && (tt(r), r.subtreeFlags & 6 && (r.flags |= 8192)) : tt(r), null;
      case 24:
        return null;
      case 25:
        return null;
    }
    throw Error(o(156, r.tag));
  }
  function vx(t, r) {
    switch (Vl(r), r.tag) {
      case 1:
        return ct(r.type) && rs(), t = r.flags, t & 65536 ? (r.flags = t & -65537 | 128, r) : null;
      case 3:
        return Wr(), Me(ut), Me(qe), Jl(), t = r.flags, (t & 65536) !== 0 && (t & 128) === 0 ? (r.flags = t & -65537 | 128, r) : null;
      case 5:
        return Xl(r), null;
      case 13:
        if (Me(Ne), t = r.memoizedState, t !== null && t.dehydrated !== null) {
          if (r.alternate === null) throw Error(o(340));
          zr();
        }
        return t = r.flags, t & 65536 ? (r.flags = t & -65537 | 128, r) : null;
      case 19:
        return Me(Ne), null;
      case 4:
        return Wr(), null;
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
  var Ts = !1, nt = !1, Sx = typeof WeakSet == "function" ? WeakSet : Set, ee = null;
  function Kr(t, r) {
    var s = t.ref;
    if (s !== null) if (typeof s == "function") try {
      s(null);
    } catch (u) {
      Fe(t, r, u);
    }
    else s.current = null;
  }
  function vu(t, r, s) {
    try {
      s();
    } catch (u) {
      Fe(t, r, u);
    }
  }
  var Dm = !1;
  function wx(t, r) {
    if (Ml = Ui, t = cp(), _l(t)) {
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
          var _ = 0, b = -1, M = -1, F = 0, z = 0, U = t, B = null;
          t: for (; ; ) {
            for (var J; U !== s || h !== 0 && U.nodeType !== 3 || (b = _ + h), U !== g || u !== 0 && U.nodeType !== 3 || (M = _ + u), U.nodeType === 3 && (_ += U.nodeValue.length), (J = U.firstChild) !== null; )
              B = U, U = J;
            for (; ; ) {
              if (U === t) break t;
              if (B === s && ++F === h && (b = _), B === g && ++z === u && (M = _), (J = U.nextSibling) !== null) break;
              U = B, B = U.parentNode;
            }
            U = J;
          }
          s = b === -1 || M === -1 ? null : { start: b, end: M };
        } else s = null;
      }
      s = s || { start: 0, end: 0 };
    } else s = null;
    for (Rl = { focusedElem: t, selectionRange: s }, Ui = !1, ee = r; ee !== null; ) if (r = ee, t = r.child, (r.subtreeFlags & 1028) !== 0 && t !== null) t.return = r, ee = t;
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
              var re = te.memoizedProps, Le = te.memoizedState, j = r.stateNode, R = j.getSnapshotBeforeUpdate(r.elementType === r.type ? re : Ft(r.type, re), Le);
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
        Fe(r, r.return, H);
      }
      if (t = r.sibling, t !== null) {
        t.return = r.return, ee = t;
        break;
      }
      ee = r.return;
    }
    return te = Dm, Dm = !1, te;
  }
  function qo(t, r, s) {
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
  function ks(t, r) {
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
  function Nm(t) {
    var r = t.alternate;
    r !== null && (t.alternate = null, Nm(r)), t.child = null, t.deletions = null, t.sibling = null, t.tag === 5 && (r = t.stateNode, r !== null && (delete r[Gt], delete r[$o], delete r[Il], delete r[nx], delete r[rx])), t.stateNode = null, t.return = null, t.dependencies = null, t.memoizedProps = null, t.memoizedState = null, t.pendingProps = null, t.stateNode = null, t.updateQueue = null;
  }
  function jm(t) {
    return t.tag === 5 || t.tag === 3 || t.tag === 4;
  }
  function Im(t) {
    e: for (; ; ) {
      for (; t.sibling === null; ) {
        if (t.return === null || jm(t.return)) return null;
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
    if (u === 5 || u === 6) t = t.stateNode, r ? s.nodeType === 8 ? s.parentNode.insertBefore(t, r) : s.insertBefore(t, r) : (s.nodeType === 8 ? (r = s.parentNode, r.insertBefore(t, s)) : (r = s, r.appendChild(t)), s = s._reactRootContainer, s != null || r.onclick !== null || (r.onclick = ts));
    else if (u !== 4 && (t = t.child, t !== null)) for (wu(t, r, s), t = t.sibling; t !== null; ) wu(t, r, s), t = t.sibling;
  }
  function xu(t, r, s) {
    var u = t.tag;
    if (u === 5 || u === 6) t = t.stateNode, r ? s.insertBefore(t, r) : s.appendChild(t);
    else if (u !== 4 && (t = t.child, t !== null)) for (xu(t, r, s), t = t.sibling; t !== null; ) xu(t, r, s), t = t.sibling;
  }
  var Qe = null, Ot = !1;
  function jn(t, r, s) {
    for (s = s.child; s !== null; ) Fm(t, r, s), s = s.sibling;
  }
  function Fm(t, r, s) {
    if (Wt && typeof Wt.onCommitFiberUnmount == "function") try {
      Wt.onCommitFiberUnmount(Oi, s);
    } catch {
    }
    switch (s.tag) {
      case 5:
        nt || Kr(s, r);
      case 6:
        var u = Qe, h = Ot;
        Qe = null, jn(t, r, s), Qe = u, Ot = h, Qe !== null && (Ot ? (t = Qe, s = s.stateNode, t.nodeType === 8 ? t.parentNode.removeChild(s) : t.removeChild(s)) : Qe.removeChild(s.stateNode));
        break;
      case 18:
        Qe !== null && (Ot ? (t = Qe, s = s.stateNode, t.nodeType === 8 ? jl(t.parentNode, s) : t.nodeType === 1 && jl(t, s), Ro(t)) : jl(Qe, s.stateNode));
        break;
      case 4:
        u = Qe, h = Ot, Qe = s.stateNode.containerInfo, Ot = !0, jn(t, r, s), Qe = u, Ot = h;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        if (!nt && (u = s.updateQueue, u !== null && (u = u.lastEffect, u !== null))) {
          h = u = u.next;
          do {
            var g = h, _ = g.destroy;
            g = g.tag, _ !== void 0 && ((g & 2) !== 0 || (g & 4) !== 0) && vu(s, r, _), h = h.next;
          } while (h !== u);
        }
        jn(t, r, s);
        break;
      case 1:
        if (!nt && (Kr(s, r), u = s.stateNode, typeof u.componentWillUnmount == "function")) try {
          u.props = s.memoizedProps, u.state = s.memoizedState, u.componentWillUnmount();
        } catch (b) {
          Fe(s, r, b);
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
  function Om(t) {
    var r = t.updateQueue;
    if (r !== null) {
      t.updateQueue = null;
      var s = t.stateNode;
      s === null && (s = t.stateNode = new Sx()), r.forEach(function(u) {
        var h = Ex.bind(null, t, u);
        s.has(u) || (s.add(u), u.then(h, h));
      });
    }
  }
  function Lt(t, r) {
    var s = r.deletions;
    if (s !== null) for (var u = 0; u < s.length; u++) {
      var h = s[u];
      try {
        var g = t, _ = r, b = _;
        e: for (; b !== null; ) {
          switch (b.tag) {
            case 5:
              Qe = b.stateNode, Ot = !1;
              break e;
            case 3:
              Qe = b.stateNode.containerInfo, Ot = !0;
              break e;
            case 4:
              Qe = b.stateNode.containerInfo, Ot = !0;
              break e;
          }
          b = b.return;
        }
        if (Qe === null) throw Error(o(160));
        Fm(g, _, h), Qe = null, Ot = !1;
        var M = h.alternate;
        M !== null && (M.return = null), h.return = null;
      } catch (F) {
        Fe(h, r, F);
      }
    }
    if (r.subtreeFlags & 12854) for (r = r.child; r !== null; ) Lm(r, t), r = r.sibling;
  }
  function Lm(t, r) {
    var s = t.alternate, u = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (Lt(r, t), Qt(t), u & 4) {
          try {
            qo(3, t, t.return), ks(3, t);
          } catch (re) {
            Fe(t, t.return, re);
          }
          try {
            qo(5, t, t.return);
          } catch (re) {
            Fe(t, t.return, re);
          }
        }
        break;
      case 1:
        Lt(r, t), Qt(t), u & 512 && s !== null && Kr(s, s.return);
        break;
      case 5:
        if (Lt(r, t), Qt(t), u & 512 && s !== null && Kr(s, s.return), t.flags & 32) {
          var h = t.stateNode;
          try {
            wo(h, "");
          } catch (re) {
            Fe(t, t.return, re);
          }
        }
        if (u & 4 && (h = t.stateNode, h != null)) {
          var g = t.memoizedProps, _ = s !== null ? s.memoizedProps : g, b = t.type, M = t.updateQueue;
          if (t.updateQueue = null, M !== null) try {
            b === "input" && g.type === "radio" && g.name != null && ff(h, g), Ja(b, _);
            var F = Ja(b, g);
            for (_ = 0; _ < M.length; _ += 2) {
              var z = M[_], U = M[_ + 1];
              z === "style" ? wf(h, U) : z === "dangerouslySetInnerHTML" ? vf(h, U) : z === "children" ? wo(h, U) : E(h, z, U, F);
            }
            switch (b) {
              case "input":
                Ka(h, g);
                break;
              case "textarea":
                hf(h, g);
                break;
              case "select":
                var B = h._wrapperState.wasMultiple;
                h._wrapperState.wasMultiple = !!g.multiple;
                var J = g.value;
                J != null ? Cr(h, !!g.multiple, J, !1) : B !== !!g.multiple && (g.defaultValue != null ? Cr(
                  h,
                  !!g.multiple,
                  g.defaultValue,
                  !0
                ) : Cr(h, !!g.multiple, g.multiple ? [] : "", !1));
            }
            h[$o] = g;
          } catch (re) {
            Fe(t, t.return, re);
          }
        }
        break;
      case 6:
        if (Lt(r, t), Qt(t), u & 4) {
          if (t.stateNode === null) throw Error(o(162));
          h = t.stateNode, g = t.memoizedProps;
          try {
            h.nodeValue = g;
          } catch (re) {
            Fe(t, t.return, re);
          }
        }
        break;
      case 3:
        if (Lt(r, t), Qt(t), u & 4 && s !== null && s.memoizedState.isDehydrated) try {
          Ro(r.containerInfo);
        } catch (re) {
          Fe(t, t.return, re);
        }
        break;
      case 4:
        Lt(r, t), Qt(t);
        break;
      case 13:
        Lt(r, t), Qt(t), h = t.child, h.flags & 8192 && (g = h.memoizedState !== null, h.stateNode.isHidden = g, !g || h.alternate !== null && h.alternate.memoizedState !== null || (ku = Oe())), u & 4 && Om(t);
        break;
      case 22:
        if (z = s !== null && s.memoizedState !== null, t.mode & 1 ? (nt = (F = nt) || z, Lt(r, t), nt = F) : Lt(r, t), Qt(t), u & 8192) {
          if (F = t.memoizedState !== null, (t.stateNode.isHidden = F) && !z && (t.mode & 1) !== 0) for (ee = t, z = t.child; z !== null; ) {
            for (U = ee = z; ee !== null; ) {
              switch (B = ee, J = B.child, B.tag) {
                case 0:
                case 11:
                case 14:
                case 15:
                  qo(4, B, B.return);
                  break;
                case 1:
                  Kr(B, B.return);
                  var te = B.stateNode;
                  if (typeof te.componentWillUnmount == "function") {
                    u = B, s = B.return;
                    try {
                      r = u, te.props = r.memoizedProps, te.state = r.memoizedState, te.componentWillUnmount();
                    } catch (re) {
                      Fe(u, s, re);
                    }
                  }
                  break;
                case 5:
                  Kr(B, B.return);
                  break;
                case 22:
                  if (B.memoizedState !== null) {
                    zm(U);
                    continue;
                  }
              }
              J !== null ? (J.return = B, ee = J) : zm(U);
            }
            z = z.sibling;
          }
          e: for (z = null, U = t; ; ) {
            if (U.tag === 5) {
              if (z === null) {
                z = U;
                try {
                  h = U.stateNode, F ? (g = h.style, typeof g.setProperty == "function" ? g.setProperty("display", "none", "important") : g.display = "none") : (b = U.stateNode, M = U.memoizedProps.style, _ = M != null && M.hasOwnProperty("display") ? M.display : null, b.style.display = Sf("display", _));
                } catch (re) {
                  Fe(t, t.return, re);
                }
              }
            } else if (U.tag === 6) {
              if (z === null) try {
                U.stateNode.nodeValue = F ? "" : U.memoizedProps;
              } catch (re) {
                Fe(t, t.return, re);
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
        Lt(r, t), Qt(t), u & 4 && Om(t);
        break;
      case 21:
        break;
      default:
        Lt(
          r,
          t
        ), Qt(t);
    }
  }
  function Qt(t) {
    var r = t.flags;
    if (r & 2) {
      try {
        e: {
          for (var s = t.return; s !== null; ) {
            if (jm(s)) {
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
            u.flags & 32 && (wo(h, ""), u.flags &= -33);
            var g = Im(t);
            xu(t, g, h);
            break;
          case 3:
          case 4:
            var _ = u.stateNode.containerInfo, b = Im(t);
            wu(t, b, _);
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
  function xx(t, r, s) {
    ee = t, Vm(t);
  }
  function Vm(t, r, s) {
    for (var u = (t.mode & 1) !== 0; ee !== null; ) {
      var h = ee, g = h.child;
      if (h.tag === 22 && u) {
        var _ = h.memoizedState !== null || Ts;
        if (!_) {
          var b = h.alternate, M = b !== null && b.memoizedState !== null || nt;
          b = Ts;
          var F = nt;
          if (Ts = _, (nt = M) && !F) for (ee = h; ee !== null; ) _ = ee, M = _.child, _.tag === 22 && _.memoizedState !== null ? $m(h) : M !== null ? (M.return = _, ee = M) : $m(h);
          for (; g !== null; ) ee = g, Vm(g), g = g.sibling;
          ee = h, Ts = b, nt = F;
        }
        Bm(t);
      } else (h.subtreeFlags & 8772) !== 0 && g !== null ? (g.return = h, ee = g) : Bm(t);
    }
  }
  function Bm(t) {
    for (; ee !== null; ) {
      var r = ee;
      if ((r.flags & 8772) !== 0) {
        var s = r.alternate;
        try {
          if ((r.flags & 8772) !== 0) switch (r.tag) {
            case 0:
            case 11:
            case 15:
              nt || ks(5, r);
              break;
            case 1:
              var u = r.stateNode;
              if (r.flags & 4 && !nt) if (s === null) u.componentDidMount();
              else {
                var h = r.elementType === r.type ? s.memoizedProps : Ft(r.type, s.memoizedProps);
                u.componentDidUpdate(h, s.memoizedState, u.__reactInternalSnapshotBeforeUpdate);
              }
              var g = r.updateQueue;
              g !== null && zp(r, g, u);
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
                zp(r, _, s);
              }
              break;
            case 5:
              var b = r.stateNode;
              if (s === null && r.flags & 4) {
                s = b;
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
                    U !== null && Ro(U);
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
        } catch (B) {
          Fe(r, r.return, B);
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
  function zm(t) {
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
  function $m(t) {
    for (; ee !== null; ) {
      var r = ee;
      try {
        switch (r.tag) {
          case 0:
          case 11:
          case 15:
            var s = r.return;
            try {
              ks(4, r);
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
            var g = r.return;
            try {
              Su(r);
            } catch (M) {
              Fe(r, g, M);
            }
            break;
          case 5:
            var _ = r.return;
            try {
              Su(r);
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
      var b = r.sibling;
      if (b !== null) {
        b.return = r.return, ee = b;
        break;
      }
      ee = r.return;
    }
  }
  var _x = Math.ceil, As = N.ReactCurrentDispatcher, _u = N.ReactCurrentOwner, Pt = N.ReactCurrentBatchConfig, me = 0, We = null, Ve = null, Xe = 0, wt = 0, Yr = En(0), $e = 0, ei = null, sr = 0, Cs = 0, Tu = 0, ti = null, ft = null, ku = 0, Qr = 1 / 0, fn = null, Ps = !1, Au = null, In = null, bs = !1, Fn = null, Es = 0, ni = 0, Cu = null, Ms = -1, Rs = 0;
  function ot() {
    return (me & 6) !== 0 ? Oe() : Ms !== -1 ? Ms : Ms = Oe();
  }
  function On(t) {
    return (t.mode & 1) === 0 ? 1 : (me & 2) !== 0 && Xe !== 0 ? Xe & -Xe : ix.transition !== null ? (Rs === 0 && (Rs = If()), Rs) : (t = xe, t !== 0 || (t = window.event, t = t === void 0 ? 16 : Hf(t.type)), t);
  }
  function Vt(t, r, s, u) {
    if (50 < ni) throw ni = 0, Cu = null, Error(o(185));
    Co(t, s, u), ((me & 2) === 0 || t !== We) && (t === We && ((me & 2) === 0 && (Cs |= s), $e === 4 && Ln(t, Xe)), pt(t, u), s === 1 && me === 0 && (r.mode & 1) === 0 && (Qr = Oe() + 500, is && Rn()));
  }
  function pt(t, r) {
    var s = t.callbackNode;
    iw(t, r);
    var u = Bi(t, t === We ? Xe : 0);
    if (u === 0) s !== null && Df(s), t.callbackNode = null, t.callbackPriority = 0;
    else if (r = u & -u, t.callbackPriority !== r) {
      if (s != null && Df(s), r === 1) t.tag === 0 ? ox(Hm.bind(null, t)) : Ep(Hm.bind(null, t)), ex(function() {
        (me & 6) === 0 && Rn();
      }), s = null;
      else {
        switch (Ff(u)) {
          case 1:
            s = il;
            break;
          case 4:
            s = Nf;
            break;
          case 16:
            s = Fi;
            break;
          case 536870912:
            s = jf;
            break;
          default:
            s = Fi;
        }
        s = Jm(s, Um.bind(null, t));
      }
      t.callbackPriority = r, t.callbackNode = s;
    }
  }
  function Um(t, r) {
    if (Ms = -1, Rs = 0, (me & 6) !== 0) throw Error(o(327));
    var s = t.callbackNode;
    if (Xr() && t.callbackNode !== s) return null;
    var u = Bi(t, t === We ? Xe : 0);
    if (u === 0) return null;
    if ((u & 30) !== 0 || (u & t.expiredLanes) !== 0 || r) r = Ds(t, u);
    else {
      r = u;
      var h = me;
      me |= 2;
      var g = Gm();
      (We !== t || Xe !== r) && (fn = null, Qr = Oe() + 500, lr(t, r));
      do
        try {
          Ax();
          break;
        } catch (b) {
          Wm(t, b);
        }
      while (!0);
      Hl(), As.current = g, me = h, Ve !== null ? r = 0 : (We = null, Xe = 0, r = $e);
    }
    if (r !== 0) {
      if (r === 2 && (h = sl(t), h !== 0 && (u = h, r = Pu(t, h))), r === 1) throw s = ei, lr(t, 0), Ln(t, u), pt(t, Oe()), s;
      if (r === 6) Ln(t, u);
      else {
        if (h = t.current.alternate, (u & 30) === 0 && !Tx(h) && (r = Ds(t, u), r === 2 && (g = sl(t), g !== 0 && (u = g, r = Pu(t, g))), r === 1)) throw s = ei, lr(t, 0), Ln(t, u), pt(t, Oe()), s;
        switch (t.finishedWork = h, t.finishedLanes = u, r) {
          case 0:
          case 1:
            throw Error(o(345));
          case 2:
            ur(t, ft, fn);
            break;
          case 3:
            if (Ln(t, u), (u & 130023424) === u && (r = ku + 500 - Oe(), 10 < r)) {
              if (Bi(t, 0) !== 0) break;
              if (h = t.suspendedLanes, (h & u) !== u) {
                ot(), t.pingedLanes |= t.suspendedLanes & h;
                break;
              }
              t.timeoutHandle = Nl(ur.bind(null, t, ft, fn), r);
              break;
            }
            ur(t, ft, fn);
            break;
          case 4:
            if (Ln(t, u), (u & 4194240) === u) break;
            for (r = t.eventTimes, h = -1; 0 < u; ) {
              var _ = 31 - Nt(u);
              g = 1 << _, _ = r[_], _ > h && (h = _), u &= ~g;
            }
            if (u = h, u = Oe() - u, u = (120 > u ? 120 : 480 > u ? 480 : 1080 > u ? 1080 : 1920 > u ? 1920 : 3e3 > u ? 3e3 : 4320 > u ? 4320 : 1960 * _x(u / 1960)) - u, 10 < u) {
              t.timeoutHandle = Nl(ur.bind(null, t, ft, fn), u);
              break;
            }
            ur(t, ft, fn);
            break;
          case 5:
            ur(t, ft, fn);
            break;
          default:
            throw Error(o(329));
        }
      }
    }
    return pt(t, Oe()), t.callbackNode === s ? Um.bind(null, t) : null;
  }
  function Pu(t, r) {
    var s = ti;
    return t.current.memoizedState.isDehydrated && (lr(t, r).flags |= 256), t = Ds(t, r), t !== 2 && (r = ft, ft = s, r !== null && bu(r)), t;
  }
  function bu(t) {
    ft === null ? ft = t : ft.push.apply(ft, t);
  }
  function Tx(t) {
    for (var r = t; ; ) {
      if (r.flags & 16384) {
        var s = r.updateQueue;
        if (s !== null && (s = s.stores, s !== null)) for (var u = 0; u < s.length; u++) {
          var h = s[u], g = h.getSnapshot;
          h = h.value;
          try {
            if (!jt(g(), h)) return !1;
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
    for (r &= ~Tu, r &= ~Cs, t.suspendedLanes |= r, t.pingedLanes &= ~r, t = t.expirationTimes; 0 < r; ) {
      var s = 31 - Nt(r), u = 1 << s;
      t[s] = -1, r &= ~u;
    }
  }
  function Hm(t) {
    if ((me & 6) !== 0) throw Error(o(327));
    Xr();
    var r = Bi(t, 0);
    if ((r & 1) === 0) return pt(t, Oe()), null;
    var s = Ds(t, r);
    if (t.tag !== 0 && s === 2) {
      var u = sl(t);
      u !== 0 && (r = u, s = Pu(t, u));
    }
    if (s === 1) throw s = ei, lr(t, 0), Ln(t, r), pt(t, Oe()), s;
    if (s === 6) throw Error(o(345));
    return t.finishedWork = t.current.alternate, t.finishedLanes = r, ur(t, ft, fn), pt(t, Oe()), null;
  }
  function Eu(t, r) {
    var s = me;
    me |= 1;
    try {
      return t(r);
    } finally {
      me = s, me === 0 && (Qr = Oe() + 500, is && Rn());
    }
  }
  function ar(t) {
    Fn !== null && Fn.tag === 0 && (me & 6) === 0 && Xr();
    var r = me;
    me |= 1;
    var s = Pt.transition, u = xe;
    try {
      if (Pt.transition = null, xe = 1, t) return t();
    } finally {
      xe = u, Pt.transition = s, me = r, (me & 6) === 0 && Rn();
    }
  }
  function Mu() {
    wt = Yr.current, Me(Yr);
  }
  function lr(t, r) {
    t.finishedWork = null, t.finishedLanes = 0;
    var s = t.timeoutHandle;
    if (s !== -1 && (t.timeoutHandle = -1, qw(s)), Ve !== null) for (s = Ve.return; s !== null; ) {
      var u = s;
      switch (Vl(u), u.tag) {
        case 1:
          u = u.type.childContextTypes, u != null && rs();
          break;
        case 3:
          Wr(), Me(ut), Me(qe), Jl();
          break;
        case 5:
          Xl(u);
          break;
        case 4:
          Wr();
          break;
        case 13:
          Me(Ne);
          break;
        case 19:
          Me(Ne);
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
    if (We = t, Ve = t = Vn(t.current, null), Xe = wt = r, $e = 0, ei = null, Tu = Cs = sr = 0, ft = ti = null, rr !== null) {
      for (r = 0; r < rr.length; r++) if (s = rr[r], u = s.interleaved, u !== null) {
        s.interleaved = null;
        var h = u.next, g = s.pending;
        if (g !== null) {
          var _ = g.next;
          g.next = h, u.next = _;
        }
        s.pending = u;
      }
      rr = null;
    }
    return t;
  }
  function Wm(t, r) {
    do {
      var s = Ve;
      try {
        if (Hl(), hs.current = Ss, ys) {
          for (var u = je.memoizedState; u !== null; ) {
            var h = u.queue;
            h !== null && (h.pending = null), u = u.next;
          }
          ys = !1;
        }
        if (ir = 0, He = ze = je = null, Yo = !1, Qo = 0, _u.current = null, s === null || s.return === null) {
          $e = 1, ei = r, Ve = null;
          break;
        }
        e: {
          var g = t, _ = s.return, b = s, M = r;
          if (r = Xe, b.flags |= 32768, M !== null && typeof M == "object" && typeof M.then == "function") {
            var F = M, z = b, U = z.tag;
            if ((z.mode & 1) === 0 && (U === 0 || U === 11 || U === 15)) {
              var B = z.alternate;
              B ? (z.updateQueue = B.updateQueue, z.memoizedState = B.memoizedState, z.lanes = B.lanes) : (z.updateQueue = null, z.memoizedState = null);
            }
            var J = ym(_);
            if (J !== null) {
              J.flags &= -257, gm(J, _, b, g, r), J.mode & 1 && hm(g, F, r), r = J, M = F;
              var te = r.updateQueue;
              if (te === null) {
                var re = /* @__PURE__ */ new Set();
                re.add(M), r.updateQueue = re;
              } else te.add(M);
              break e;
            } else {
              if ((r & 1) === 0) {
                hm(g, F, r), Ru();
                break e;
              }
              M = Error(o(426));
            }
          } else if (De && b.mode & 1) {
            var Le = ym(_);
            if (Le !== null) {
              (Le.flags & 65536) === 0 && (Le.flags |= 256), gm(Le, _, b, g, r), $l(Gr(M, b));
              break e;
            }
          }
          g = M = Gr(M, b), $e !== 4 && ($e = 2), ti === null ? ti = [g] : ti.push(g), g = _;
          do {
            switch (g.tag) {
              case 3:
                g.flags |= 65536, r &= -r, g.lanes |= r;
                var j = pm(g, M, r);
                Bp(g, j);
                break e;
              case 1:
                b = M;
                var R = g.type, I = g.stateNode;
                if ((g.flags & 128) === 0 && (typeof R.getDerivedStateFromError == "function" || I !== null && typeof I.componentDidCatch == "function" && (In === null || !In.has(I)))) {
                  g.flags |= 65536, r &= -r, g.lanes |= r;
                  var H = mm(g, b, r);
                  Bp(g, H);
                  break e;
                }
            }
            g = g.return;
          } while (g !== null);
        }
        Ym(s);
      } catch (oe) {
        r = oe, Ve === s && s !== null && (Ve = s = s.return);
        continue;
      }
      break;
    } while (!0);
  }
  function Gm() {
    var t = As.current;
    return As.current = Ss, t === null ? Ss : t;
  }
  function Ru() {
    ($e === 0 || $e === 3 || $e === 2) && ($e = 4), We === null || (sr & 268435455) === 0 && (Cs & 268435455) === 0 || Ln(We, Xe);
  }
  function Ds(t, r) {
    var s = me;
    me |= 2;
    var u = Gm();
    (We !== t || Xe !== r) && (fn = null, lr(t, r));
    do
      try {
        kx();
        break;
      } catch (h) {
        Wm(t, h);
      }
    while (!0);
    if (Hl(), me = s, As.current = u, Ve !== null) throw Error(o(261));
    return We = null, Xe = 0, $e;
  }
  function kx() {
    for (; Ve !== null; ) Km(Ve);
  }
  function Ax() {
    for (; Ve !== null && !XS(); ) Km(Ve);
  }
  function Km(t) {
    var r = Zm(t.alternate, t, wt);
    t.memoizedProps = t.pendingProps, r === null ? Ym(t) : Ve = r, _u.current = null;
  }
  function Ym(t) {
    var r = t;
    do {
      var s = r.alternate;
      if (t = r.return, (r.flags & 32768) === 0) {
        if (s = gx(s, r, wt), s !== null) {
          Ve = s;
          return;
        }
      } else {
        if (s = vx(s, r), s !== null) {
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
  function ur(t, r, s) {
    var u = xe, h = Pt.transition;
    try {
      Pt.transition = null, xe = 1, Cx(t, r, s, u);
    } finally {
      Pt.transition = h, xe = u;
    }
    return null;
  }
  function Cx(t, r, s, u) {
    do
      Xr();
    while (Fn !== null);
    if ((me & 6) !== 0) throw Error(o(327));
    s = t.finishedWork;
    var h = t.finishedLanes;
    if (s === null) return null;
    if (t.finishedWork = null, t.finishedLanes = 0, s === t.current) throw Error(o(177));
    t.callbackNode = null, t.callbackPriority = 0;
    var g = s.lanes | s.childLanes;
    if (sw(t, g), t === We && (Ve = We = null, Xe = 0), (s.subtreeFlags & 2064) === 0 && (s.flags & 2064) === 0 || bs || (bs = !0, Jm(Fi, function() {
      return Xr(), null;
    })), g = (s.flags & 15990) !== 0, (s.subtreeFlags & 15990) !== 0 || g) {
      g = Pt.transition, Pt.transition = null;
      var _ = xe;
      xe = 1;
      var b = me;
      me |= 4, _u.current = null, wx(t, s), Lm(s, t), Gw(Rl), Ui = !!Ml, Rl = Ml = null, t.current = s, xx(s), ZS(), me = b, xe = _, Pt.transition = g;
    } else t.current = s;
    if (bs && (bs = !1, Fn = t, Es = h), g = t.pendingLanes, g === 0 && (In = null), ew(s.stateNode), pt(t, Oe()), r !== null) for (u = t.onRecoverableError, s = 0; s < r.length; s++) h = r[s], u(h.value, { componentStack: h.stack, digest: h.digest });
    if (Ps) throw Ps = !1, t = Au, Au = null, t;
    return (Es & 1) !== 0 && t.tag !== 0 && Xr(), g = t.pendingLanes, (g & 1) !== 0 ? t === Cu ? ni++ : (ni = 0, Cu = t) : ni = 0, Rn(), null;
  }
  function Xr() {
    if (Fn !== null) {
      var t = Ff(Es), r = Pt.transition, s = xe;
      try {
        if (Pt.transition = null, xe = 16 > t ? 16 : t, Fn === null) var u = !1;
        else {
          if (t = Fn, Fn = null, Es = 0, (me & 6) !== 0) throw Error(o(331));
          var h = me;
          for (me |= 4, ee = t.current; ee !== null; ) {
            var g = ee, _ = g.child;
            if ((ee.flags & 16) !== 0) {
              var b = g.deletions;
              if (b !== null) {
                for (var M = 0; M < b.length; M++) {
                  var F = b[M];
                  for (ee = F; ee !== null; ) {
                    var z = ee;
                    switch (z.tag) {
                      case 0:
                      case 11:
                      case 15:
                        qo(8, z, g);
                    }
                    var U = z.child;
                    if (U !== null) U.return = z, ee = U;
                    else for (; ee !== null; ) {
                      z = ee;
                      var B = z.sibling, J = z.return;
                      if (Nm(z), z === F) {
                        ee = null;
                        break;
                      }
                      if (B !== null) {
                        B.return = J, ee = B;
                        break;
                      }
                      ee = J;
                    }
                  }
                }
                var te = g.alternate;
                if (te !== null) {
                  var re = te.child;
                  if (re !== null) {
                    te.child = null;
                    do {
                      var Le = re.sibling;
                      re.sibling = null, re = Le;
                    } while (re !== null);
                  }
                }
                ee = g;
              }
            }
            if ((g.subtreeFlags & 2064) !== 0 && _ !== null) _.return = g, ee = _;
            else e: for (; ee !== null; ) {
              if (g = ee, (g.flags & 2048) !== 0) switch (g.tag) {
                case 0:
                case 11:
                case 15:
                  qo(9, g, g.return);
              }
              var j = g.sibling;
              if (j !== null) {
                j.return = g.return, ee = j;
                break e;
              }
              ee = g.return;
            }
          }
          var R = t.current;
          for (ee = R; ee !== null; ) {
            _ = ee;
            var I = _.child;
            if ((_.subtreeFlags & 2064) !== 0 && I !== null) I.return = _, ee = I;
            else e: for (_ = R; ee !== null; ) {
              if (b = ee, (b.flags & 2048) !== 0) try {
                switch (b.tag) {
                  case 0:
                  case 11:
                  case 15:
                    ks(9, b);
                }
              } catch (oe) {
                Fe(b, b.return, oe);
              }
              if (b === _) {
                ee = null;
                break e;
              }
              var H = b.sibling;
              if (H !== null) {
                H.return = b.return, ee = H;
                break e;
              }
              ee = b.return;
            }
          }
          if (me = h, Rn(), Wt && typeof Wt.onPostCommitFiberRoot == "function") try {
            Wt.onPostCommitFiberRoot(Oi, t);
          } catch {
          }
          u = !0;
        }
        return u;
      } finally {
        xe = s, Pt.transition = r;
      }
    }
    return !1;
  }
  function Qm(t, r, s) {
    r = Gr(s, r), r = pm(t, r, 1), t = Nn(t, r, 1), r = ot(), t !== null && (Co(t, 1, r), pt(t, r));
  }
  function Fe(t, r, s) {
    if (t.tag === 3) Qm(t, t, s);
    else for (; r !== null; ) {
      if (r.tag === 3) {
        Qm(r, t, s);
        break;
      } else if (r.tag === 1) {
        var u = r.stateNode;
        if (typeof r.type.getDerivedStateFromError == "function" || typeof u.componentDidCatch == "function" && (In === null || !In.has(u))) {
          t = Gr(s, t), t = mm(r, t, 1), r = Nn(r, t, 1), t = ot(), r !== null && (Co(r, 1, t), pt(r, t));
          break;
        }
      }
      r = r.return;
    }
  }
  function Px(t, r, s) {
    var u = t.pingCache;
    u !== null && u.delete(r), r = ot(), t.pingedLanes |= t.suspendedLanes & s, We === t && (Xe & s) === s && ($e === 4 || $e === 3 && (Xe & 130023424) === Xe && 500 > Oe() - ku ? lr(t, 0) : Tu |= s), pt(t, r);
  }
  function Xm(t, r) {
    r === 0 && ((t.mode & 1) === 0 ? r = 1 : (r = Vi, Vi <<= 1, (Vi & 130023424) === 0 && (Vi = 4194304)));
    var s = ot();
    t = un(t, r), t !== null && (Co(t, r, s), pt(t, s));
  }
  function bx(t) {
    var r = t.memoizedState, s = 0;
    r !== null && (s = r.retryLane), Xm(t, s);
  }
  function Ex(t, r) {
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
    u !== null && u.delete(r), Xm(t, s);
  }
  var Zm;
  Zm = function(t, r, s) {
    if (t !== null) if (t.memoizedProps !== r.pendingProps || ut.current) dt = !0;
    else {
      if ((t.lanes & s) === 0 && (r.flags & 128) === 0) return dt = !1, yx(t, r, s);
      dt = (t.flags & 131072) !== 0;
    }
    else dt = !1, De && (r.flags & 1048576) !== 0 && Mp(r, as, r.index);
    switch (r.lanes = 0, r.tag) {
      case 2:
        var u = r.type;
        _s(t, r), t = r.pendingProps;
        var h = Lr(r, qe.current);
        Hr(r, s), h = tu(null, r, u, t, h, s);
        var g = nu();
        return r.flags |= 1, typeof h == "object" && h !== null && typeof h.render == "function" && h.$$typeof === void 0 ? (r.tag = 1, r.memoizedState = null, r.updateQueue = null, ct(u) ? (g = !0, os(r)) : g = !1, r.memoizedState = h.state !== null && h.state !== void 0 ? h.state : null, Yl(r), h.updater = ws, r.stateNode = h, h._reactInternals = r, lu(r, u, t, s), r = fu(null, r, u, !0, g, s)) : (r.tag = 0, De && g && Ll(r), rt(null, r, h, s), r = r.child), r;
      case 16:
        u = r.elementType;
        e: {
          switch (_s(t, r), t = r.pendingProps, h = u._init, u = h(u._payload), r.type = u, h = r.tag = Rx(u), t = Ft(u, t), h) {
            case 0:
              r = du(null, r, u, t, s);
              break e;
            case 1:
              r = Tm(null, r, u, t, s);
              break e;
            case 11:
              r = vm(null, r, u, t, s);
              break e;
            case 14:
              r = Sm(null, r, u, Ft(u.type, t), s);
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
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Ft(u, h), du(t, r, u, h, s);
      case 1:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Ft(u, h), Tm(t, r, u, h, s);
      case 3:
        e: {
          if (km(r), t === null) throw Error(o(387));
          u = r.pendingProps, g = r.memoizedState, h = g.element, Vp(t, r), ps(r, u, null, s);
          var _ = r.memoizedState;
          if (u = _.element, g.isDehydrated) if (g = { element: u, isDehydrated: !1, cache: _.cache, pendingSuspenseBoundaries: _.pendingSuspenseBoundaries, transitions: _.transitions }, r.updateQueue.baseState = g, r.memoizedState = g, r.flags & 256) {
            h = Gr(Error(o(423)), r), r = Am(t, r, u, s, h);
            break e;
          } else if (u !== h) {
            h = Gr(Error(o(424)), r), r = Am(t, r, u, s, h);
            break e;
          } else for (St = bn(r.stateNode.containerInfo.firstChild), vt = r, De = !0, It = null, s = Op(r, null, u, s), r.child = s; s; ) s.flags = s.flags & -3 | 4096, s = s.sibling;
          else {
            if (zr(), u === h) {
              r = dn(t, r, s);
              break e;
            }
            rt(t, r, u, s);
          }
          r = r.child;
        }
        return r;
      case 5:
        return $p(r), t === null && zl(r), u = r.type, h = r.pendingProps, g = t !== null ? t.memoizedProps : null, _ = h.children, Dl(u, h) ? _ = null : g !== null && Dl(u, g) && (r.flags |= 32), _m(t, r), rt(t, r, _, s), r.child;
      case 6:
        return t === null && zl(r), null;
      case 13:
        return Cm(t, r, s);
      case 4:
        return Ql(r, r.stateNode.containerInfo), u = r.pendingProps, t === null ? r.child = $r(r, null, u, s) : rt(t, r, u, s), r.child;
      case 11:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Ft(u, h), vm(t, r, u, h, s);
      case 7:
        return rt(t, r, r.pendingProps, s), r.child;
      case 8:
        return rt(t, r, r.pendingProps.children, s), r.child;
      case 12:
        return rt(t, r, r.pendingProps.children, s), r.child;
      case 10:
        e: {
          if (u = r.type._context, h = r.pendingProps, g = r.memoizedProps, _ = h.value, Pe(cs, u._currentValue), u._currentValue = _, g !== null) if (jt(g.value, _)) {
            if (g.children === h.children && !ut.current) {
              r = dn(t, r, s);
              break e;
            }
          } else for (g = r.child, g !== null && (g.return = r); g !== null; ) {
            var b = g.dependencies;
            if (b !== null) {
              _ = g.child;
              for (var M = b.firstContext; M !== null; ) {
                if (M.context === u) {
                  if (g.tag === 1) {
                    M = cn(-1, s & -s), M.tag = 2;
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
                  ), b.lanes |= s;
                  break;
                }
                M = M.next;
              }
            } else if (g.tag === 10) _ = g.type === r.type ? null : g.child;
            else if (g.tag === 18) {
              if (_ = g.return, _ === null) throw Error(o(341));
              _.lanes |= s, b = _.alternate, b !== null && (b.lanes |= s), Gl(_, s, r), _ = g.sibling;
            } else _ = g.child;
            if (_ !== null) _.return = g;
            else for (_ = g; _ !== null; ) {
              if (_ === r) {
                _ = null;
                break;
              }
              if (g = _.sibling, g !== null) {
                g.return = _.return, _ = g;
                break;
              }
              _ = _.return;
            }
            g = _;
          }
          rt(t, r, h.children, s), r = r.child;
        }
        return r;
      case 9:
        return h = r.type, u = r.pendingProps.children, Hr(r, s), h = At(h), u = u(h), r.flags |= 1, rt(t, r, u, s), r.child;
      case 14:
        return u = r.type, h = Ft(u, r.pendingProps), h = Ft(u.type, h), Sm(t, r, u, h, s);
      case 15:
        return wm(t, r, r.type, r.pendingProps, s);
      case 17:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Ft(u, h), _s(t, r), r.tag = 1, ct(u) ? (t = !0, os(r)) : t = !1, Hr(r, s), dm(r, u, h), lu(r, u, h, s), fu(null, r, u, !0, t, s);
      case 19:
        return bm(t, r, s);
      case 22:
        return xm(t, r, s);
    }
    throw Error(o(156, r.tag));
  };
  function Jm(t, r) {
    return Rf(t, r);
  }
  function Mx(t, r, s, u) {
    this.tag = t, this.key = s, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = r, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = u, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function bt(t, r, s, u) {
    return new Mx(t, r, s, u);
  }
  function Du(t) {
    return t = t.prototype, !(!t || !t.isReactComponent);
  }
  function Rx(t) {
    if (typeof t == "function") return Du(t) ? 1 : 0;
    if (t != null) {
      if (t = t.$$typeof, t === q) return 11;
      if (t === _e) return 14;
    }
    return 2;
  }
  function Vn(t, r) {
    var s = t.alternate;
    return s === null ? (s = bt(t.tag, r, t.key, t.mode), s.elementType = t.elementType, s.type = t.type, s.stateNode = t.stateNode, s.alternate = t, t.alternate = s) : (s.pendingProps = r, s.type = t.type, s.flags = 0, s.subtreeFlags = 0, s.deletions = null), s.flags = t.flags & 14680064, s.childLanes = t.childLanes, s.lanes = t.lanes, s.child = t.child, s.memoizedProps = t.memoizedProps, s.memoizedState = t.memoizedState, s.updateQueue = t.updateQueue, r = t.dependencies, s.dependencies = r === null ? null : { lanes: r.lanes, firstContext: r.firstContext }, s.sibling = t.sibling, s.index = t.index, s.ref = t.ref, s;
  }
  function Ns(t, r, s, u, h, g) {
    var _ = 2;
    if (u = t, typeof t == "function") Du(t) && (_ = 1);
    else if (typeof t == "string") _ = 5;
    else e: switch (t) {
      case G:
        return cr(s.children, h, g, r);
      case K:
        _ = 8, h |= 8;
        break;
      case L:
        return t = bt(12, s, r, h | 2), t.elementType = L, t.lanes = g, t;
      case de:
        return t = bt(13, s, r, h), t.elementType = de, t.lanes = g, t;
      case ue:
        return t = bt(19, s, r, h), t.elementType = ue, t.lanes = g, t;
      case Se:
        return js(s, h, g, r);
      default:
        if (typeof t == "object" && t !== null) switch (t.$$typeof) {
          case X:
            _ = 10;
            break e;
          case ae:
            _ = 9;
            break e;
          case q:
            _ = 11;
            break e;
          case _e:
            _ = 14;
            break e;
          case ve:
            _ = 16, u = null;
            break e;
        }
        throw Error(o(130, t == null ? t : typeof t, ""));
    }
    return r = bt(_, s, r, h), r.elementType = t, r.type = u, r.lanes = g, r;
  }
  function cr(t, r, s, u) {
    return t = bt(7, t, u, r), t.lanes = s, t;
  }
  function js(t, r, s, u) {
    return t = bt(22, t, u, r), t.elementType = Se, t.lanes = s, t.stateNode = { isHidden: !1 }, t;
  }
  function Nu(t, r, s) {
    return t = bt(6, t, null, r), t.lanes = s, t;
  }
  function ju(t, r, s) {
    return r = bt(4, t.children !== null ? t.children : [], t.key, r), r.lanes = s, r.stateNode = { containerInfo: t.containerInfo, pendingChildren: null, implementation: t.implementation }, r;
  }
  function Dx(t, r, s, u, h) {
    this.tag = r, this.containerInfo = t, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = al(0), this.expirationTimes = al(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = al(0), this.identifierPrefix = u, this.onRecoverableError = h, this.mutableSourceEagerHydrationData = null;
  }
  function Iu(t, r, s, u, h, g, _, b, M) {
    return t = new Dx(t, r, s, b, M), r === 1 ? (r = 1, g === !0 && (r |= 8)) : r = 0, g = bt(3, null, null, r), t.current = g, g.stateNode = t, g.memoizedState = { element: u, isDehydrated: s, cache: null, transitions: null, pendingSuspenseBoundaries: null }, Yl(g), t;
  }
  function Nx(t, r, s) {
    var u = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return { $$typeof: W, key: u == null ? null : "" + u, children: t, containerInfo: r, implementation: s };
  }
  function qm(t) {
    if (!t) return Mn;
    t = t._reactInternals;
    e: {
      if (Jn(t) !== t || t.tag !== 1) throw Error(o(170));
      var r = t;
      do {
        switch (r.tag) {
          case 3:
            r = r.stateNode.context;
            break e;
          case 1:
            if (ct(r.type)) {
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
      if (ct(s)) return Pp(t, s, r);
    }
    return r;
  }
  function eh(t, r, s, u, h, g, _, b, M) {
    return t = Iu(s, u, !0, t, h, g, _, b, M), t.context = qm(null), s = t.current, u = ot(), h = On(s), g = cn(u, h), g.callback = r ?? null, Nn(s, g, h), t.current.lanes = h, Co(t, h, u), pt(t, u), t;
  }
  function Is(t, r, s, u) {
    var h = r.current, g = ot(), _ = On(h);
    return s = qm(s), r.context === null ? r.context = s : r.pendingContext = s, r = cn(g, _), r.payload = { element: t }, u = u === void 0 ? null : u, u !== null && (r.callback = u), t = Nn(h, r, _), t !== null && (Vt(t, h, _, g), fs(t, h, _)), _;
  }
  function Fs(t) {
    if (t = t.current, !t.child) return null;
    switch (t.child.tag) {
      case 5:
        return t.child.stateNode;
      default:
        return t.child.stateNode;
    }
  }
  function th(t, r) {
    if (t = t.memoizedState, t !== null && t.dehydrated !== null) {
      var s = t.retryLane;
      t.retryLane = s !== 0 && s < r ? s : r;
    }
  }
  function Fu(t, r) {
    th(t, r), (t = t.alternate) && th(t, r);
  }
  function jx() {
    return null;
  }
  var nh = typeof reportError == "function" ? reportError : function(t) {
    console.error(t);
  };
  function Ou(t) {
    this._internalRoot = t;
  }
  Os.prototype.render = Ou.prototype.render = function(t) {
    var r = this._internalRoot;
    if (r === null) throw Error(o(409));
    Is(t, r, null, null);
  }, Os.prototype.unmount = Ou.prototype.unmount = function() {
    var t = this._internalRoot;
    if (t !== null) {
      this._internalRoot = null;
      var r = t.containerInfo;
      ar(function() {
        Is(null, t, null, null);
      }), r[on] = null;
    }
  };
  function Os(t) {
    this._internalRoot = t;
  }
  Os.prototype.unstable_scheduleHydration = function(t) {
    if (t) {
      var r = Vf();
      t = { blockedOn: null, target: t, priority: r };
      for (var s = 0; s < An.length && r !== 0 && r < An[s].priority; s++) ;
      An.splice(s, 0, t), s === 0 && $f(t);
    }
  };
  function Lu(t) {
    return !(!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11);
  }
  function Ls(t) {
    return !(!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11 && (t.nodeType !== 8 || t.nodeValue !== " react-mount-point-unstable "));
  }
  function rh() {
  }
  function Ix(t, r, s, u, h) {
    if (h) {
      if (typeof u == "function") {
        var g = u;
        u = function() {
          var F = Fs(_);
          g.call(F);
        };
      }
      var _ = eh(r, u, t, 0, null, !1, !1, "", rh);
      return t._reactRootContainer = _, t[on] = _.current, Bo(t.nodeType === 8 ? t.parentNode : t), ar(), _;
    }
    for (; h = t.lastChild; ) t.removeChild(h);
    if (typeof u == "function") {
      var b = u;
      u = function() {
        var F = Fs(M);
        b.call(F);
      };
    }
    var M = Iu(t, 0, !1, null, null, !1, !1, "", rh);
    return t._reactRootContainer = M, t[on] = M.current, Bo(t.nodeType === 8 ? t.parentNode : t), ar(function() {
      Is(r, M, s, u);
    }), M;
  }
  function Vs(t, r, s, u, h) {
    var g = s._reactRootContainer;
    if (g) {
      var _ = g;
      if (typeof h == "function") {
        var b = h;
        h = function() {
          var M = Fs(_);
          b.call(M);
        };
      }
      Is(r, _, t, h);
    } else _ = Ix(s, r, t, h, u);
    return Fs(_);
  }
  Of = function(t) {
    switch (t.tag) {
      case 3:
        var r = t.stateNode;
        if (r.current.memoizedState.isDehydrated) {
          var s = Ao(r.pendingLanes);
          s !== 0 && (ll(r, s | 1), pt(r, Oe()), (me & 6) === 0 && (Qr = Oe() + 500, Rn()));
        }
        break;
      case 13:
        ar(function() {
          var u = un(t, 1);
          if (u !== null) {
            var h = ot();
            Vt(u, t, 1, h);
          }
        }), Fu(t, 1);
    }
  }, ul = function(t) {
    if (t.tag === 13) {
      var r = un(t, 134217728);
      if (r !== null) {
        var s = ot();
        Vt(r, t, 134217728, s);
      }
      Fu(t, 134217728);
    }
  }, Lf = function(t) {
    if (t.tag === 13) {
      var r = On(t), s = un(t, r);
      if (s !== null) {
        var u = ot();
        Vt(s, t, r, u);
      }
      Fu(t, r);
    }
  }, Vf = function() {
    return xe;
  }, Bf = function(t, r) {
    var s = xe;
    try {
      return xe = t, r();
    } finally {
      xe = s;
    }
  }, tl = function(t, r, s) {
    switch (r) {
      case "input":
        if (Ka(t, s), r = s.name, s.type === "radio" && r != null) {
          for (s = t; s.parentNode; ) s = s.parentNode;
          for (s = s.querySelectorAll("input[name=" + JSON.stringify("" + r) + '][type="radio"]'), r = 0; r < s.length; r++) {
            var u = s[r];
            if (u !== t && u.form === t.form) {
              var h = ns(u);
              if (!h) throw Error(o(90));
              cf(u), Ka(u, h);
            }
          }
        }
        break;
      case "textarea":
        hf(t, s);
        break;
      case "select":
        r = s.value, r != null && Cr(t, !!s.multiple, r, !1);
    }
  }, kf = Eu, Af = ar;
  var Fx = { usingClientEntryPoint: !1, Events: [Uo, Fr, ns, _f, Tf, Eu] }, ri = { findFiberByHostInstance: qn, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, Ox = { bundleType: ri.bundleType, version: ri.version, rendererPackageName: ri.rendererPackageName, rendererConfig: ri.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: N.ReactCurrentDispatcher, findHostInstanceByFiber: function(t) {
    return t = Ef(t), t === null ? null : t.stateNode;
  }, findFiberByHostInstance: ri.findFiberByHostInstance || jx, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Bs = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Bs.isDisabled && Bs.supportsFiber) try {
      Oi = Bs.inject(Ox), Wt = Bs;
    } catch {
    }
  }
  return mt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Fx, mt.createPortal = function(t, r) {
    var s = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!Lu(r)) throw Error(o(200));
    return Nx(t, r, null, s);
  }, mt.createRoot = function(t, r) {
    if (!Lu(t)) throw Error(o(299));
    var s = !1, u = "", h = nh;
    return r != null && (r.unstable_strictMode === !0 && (s = !0), r.identifierPrefix !== void 0 && (u = r.identifierPrefix), r.onRecoverableError !== void 0 && (h = r.onRecoverableError)), r = Iu(t, 1, !1, null, null, s, !1, u, h), t[on] = r.current, Bo(t.nodeType === 8 ? t.parentNode : t), new Ou(r);
  }, mt.findDOMNode = function(t) {
    if (t == null) return null;
    if (t.nodeType === 1) return t;
    var r = t._reactInternals;
    if (r === void 0)
      throw typeof t.render == "function" ? Error(o(188)) : (t = Object.keys(t).join(","), Error(o(268, t)));
    return t = Ef(r), t = t === null ? null : t.stateNode, t;
  }, mt.flushSync = function(t) {
    return ar(t);
  }, mt.hydrate = function(t, r, s) {
    if (!Ls(r)) throw Error(o(200));
    return Vs(null, t, r, !0, s);
  }, mt.hydrateRoot = function(t, r, s) {
    if (!Lu(t)) throw Error(o(405));
    var u = s != null && s.hydratedSources || null, h = !1, g = "", _ = nh;
    if (s != null && (s.unstable_strictMode === !0 && (h = !0), s.identifierPrefix !== void 0 && (g = s.identifierPrefix), s.onRecoverableError !== void 0 && (_ = s.onRecoverableError)), r = eh(r, null, t, 1, s ?? null, h, !1, g, _), t[on] = r.current, Bo(t), u) for (t = 0; t < u.length; t++) s = u[t], h = s._getVersion, h = h(s._source), r.mutableSourceEagerHydrationData == null ? r.mutableSourceEagerHydrationData = [s, h] : r.mutableSourceEagerHydrationData.push(
      s,
      h
    );
    return new Os(r);
  }, mt.render = function(t, r, s) {
    if (!Ls(r)) throw Error(o(200));
    return Vs(null, t, r, !1, s);
  }, mt.unmountComponentAtNode = function(t) {
    if (!Ls(t)) throw Error(o(40));
    return t._reactRootContainer ? (ar(function() {
      Vs(null, null, t, !1, function() {
        t._reactRootContainer = null, t[on] = null;
      });
    }), !0) : !1;
  }, mt.unstable_batchedUpdates = Eu, mt.unstable_renderSubtreeIntoContainer = function(t, r, s, u) {
    if (!Ls(s)) throw Error(o(200));
    if (t == null || t._reactInternals === void 0) throw Error(o(38));
    return Vs(t, r, s, !1, u);
  }, mt.version = "18.3.1-next-f1338f8080-20240426", mt;
}
var fh;
function xg() {
  if (fh) return Bu.exports;
  fh = 1;
  function e() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(e);
      } catch (n) {
        console.error(n);
      }
  }
  return e(), Bu.exports = Yx(), Bu.exports;
}
var ph;
function Qx() {
  if (ph) return $s;
  ph = 1;
  var e = xg();
  return $s.createRoot = e.createRoot, $s.hydrateRoot = e.hydrateRoot, $s;
}
var Xx = Qx(), Uu = { exports: {} }, ii = {};
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var mh;
function Zx() {
  if (mh) return ii;
  mh = 1;
  var e = pd(), n = Symbol.for("react.element"), o = Symbol.for("react.fragment"), i = Object.prototype.hasOwnProperty, a = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, c = { key: !0, ref: !0, __self: !0, __source: !0 };
  function d(f, m, y) {
    var v, l = {}, p = null, S = null;
    y !== void 0 && (p = "" + y), m.key !== void 0 && (p = "" + m.key), m.ref !== void 0 && (S = m.ref);
    for (v in m) i.call(m, v) && !c.hasOwnProperty(v) && (l[v] = m[v]);
    if (f && f.defaultProps) for (v in m = f.defaultProps, m) l[v] === void 0 && (l[v] = m[v]);
    return { $$typeof: n, type: f, key: p, ref: S, props: l, _owner: a.current };
  }
  return ii.Fragment = o, ii.jsx = d, ii.jsxs = d, ii;
}
var hh;
function Jx() {
  return hh || (hh = 1, Uu.exports = Zx()), Uu.exports;
}
var x = Jx();
const yh = (e) => Symbol.iterator in e, gh = (e) => (
  // HACK: avoid checking entries type
  "entries" in e
), vh = (e, n) => {
  const o = e instanceof Map ? e : new Map(e.entries()), i = n instanceof Map ? n : new Map(n.entries());
  if (o.size !== i.size)
    return !1;
  for (const [a, c] of o)
    if (!i.has(a) || !Object.is(c, i.get(a)))
      return !1;
  return !0;
}, qx = (e, n) => {
  const o = e[Symbol.iterator](), i = n[Symbol.iterator]();
  let a = o.next(), c = i.next();
  for (; !a.done && !c.done; ) {
    if (!Object.is(a.value, c.value))
      return !1;
    a = o.next(), c = i.next();
  }
  return !!a.done && !!c.done;
};
function e1(e, n) {
  return Object.is(e, n) ? !0 : typeof e != "object" || e === null || typeof n != "object" || n === null || Object.getPrototypeOf(e) !== Object.getPrototypeOf(n) ? !1 : yh(e) && yh(n) ? gh(e) && gh(n) ? vh(e, n) : qx(e, n) : vh(
    { entries: () => Object.entries(e) },
    { entries: () => Object.entries(n) }
  );
}
function t1(e) {
  const n = yn.useRef(void 0);
  return (o) => {
    const i = e(o);
    return e1(n.current, i) ? n.current : n.current = i;
  };
}
const md = C.createContext({});
function hd(e) {
  const n = C.useRef(null);
  return n.current === null && (n.current = e()), n.current;
}
const n1 = typeof window < "u", _g = n1 ? C.useLayoutEffect : C.useEffect, Ia = /* @__PURE__ */ C.createContext(null);
function yd(e, n) {
  e.indexOf(n) === -1 && e.push(n);
}
function va(e, n) {
  const o = e.indexOf(n);
  o > -1 && e.splice(o, 1);
}
const nn = (e, n, o) => o > n ? n : o < e ? e : o;
function Sh(e, n) {
  return n ? `${e}. For more information and steps for solving, visit https://motion.dev/troubleshooting/${n}` : e;
}
let Ti = () => {
}, kr = () => {
};
var hg;
typeof process < "u" && ((hg = process.env) == null ? void 0 : hg.NODE_ENV) !== "production" && (Ti = (e, n, o) => {
  !e && typeof console < "u" && console.warn(Sh(n, o));
}, kr = (e, n, o) => {
  if (!e)
    throw new Error(Sh(n, o));
});
const Qn = {}, Tg = (e) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(e), kg = (e) => typeof e == "object" && e !== null, Ag = (e) => /^0[^.\s]+$/u.test(e);
// @__NO_SIDE_EFFECTS__
function Cg(e) {
  let n;
  return () => (n === void 0 && (n = e()), n);
}
const Dt = /* @__NO_SIDE_EFFECTS__ */ (e) => e, ki = (...e) => e.reduce((n, o) => (i) => o(n(i))), hi = /* @__NO_SIDE_EFFECTS__ */ (e, n, o) => {
  const i = n - e;
  return i ? (o - e) / i : 1;
};
class gd {
  constructor() {
    this.subscriptions = [];
  }
  add(n) {
    return yd(this.subscriptions, n), () => va(this.subscriptions, n);
  }
  notify(n, o, i) {
    const a = this.subscriptions.length;
    if (a)
      if (a === 1)
        this.subscriptions[0](n, o, i);
      else
        for (let c = 0; c < a; c++) {
          const d = this.subscriptions[c];
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
const ht = /* @__NO_SIDE_EFFECTS__ */ (e) => e * 1e3, Rt = /* @__NO_SIDE_EFFECTS__ */ (e) => e / 1e3, Pg = /* @__NO_SIDE_EFFECTS__ */ (e, n) => n ? e * (1e3 / n) : 0, bg = (e, n, o) => (((1 - 3 * o + 3 * n) * e + (3 * o - 6 * n)) * e + 3 * n) * e, r1 = 1e-7, o1 = 12;
function i1(e, n, o, i, a) {
  let c, d, f = 0;
  do
    d = n + (o - n) / 2, c = bg(d, i, a) - e, c > 0 ? o = d : n = d;
  while (Math.abs(c) > r1 && ++f < o1);
  return d;
}
// @__NO_SIDE_EFFECTS__
function Ai(e, n, o, i) {
  if (e === n && o === i)
    return Dt;
  const a = (c) => i1(c, 0, 1, e, o);
  return (c) => c === 0 || c === 1 ? c : bg(a(c), n, i);
}
const Eg = /* @__NO_SIDE_EFFECTS__ */ (e) => (n) => n <= 0.5 ? e(2 * n) / 2 : (2 - e(2 * (1 - n))) / 2, Mg = /* @__NO_SIDE_EFFECTS__ */ (e) => (n) => 1 - e(1 - n), Rg = /* @__PURE__ */ Ai(0.33, 1.53, 0.69, 0.99), vd = /* @__PURE__ */ Mg(Rg), Dg = /* @__PURE__ */ Eg(vd), Ng = (e) => e >= 1 ? 1 : (e *= 2) < 1 ? 0.5 * vd(e) : 0.5 * (2 - Math.pow(2, -10 * (e - 1))), Sd = (e) => 1 - Math.sin(Math.acos(e)), jg = /* @__PURE__ */ Mg(Sd), Ig = /* @__PURE__ */ Eg(Sd), s1 = /* @__PURE__ */ Ai(0.42, 0, 1, 1), a1 = /* @__PURE__ */ Ai(0, 0, 0.58, 1), Fg = /* @__PURE__ */ Ai(0.42, 0, 0.58, 1), l1 = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] != "number", Og = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] == "number", wh = {
  linear: Dt,
  easeIn: s1,
  easeInOut: Fg,
  easeOut: a1,
  circIn: Sd,
  circInOut: Ig,
  circOut: jg,
  backIn: vd,
  backInOut: Dg,
  backOut: Rg,
  anticipate: Ng
}, u1 = (e) => typeof e == "string", xh = (e) => {
  if (/* @__PURE__ */ Og(e)) {
    kr(e.length === 4, "Cubic bezier arrays must contain four numerical values.", "cubic-bezier-length");
    const [n, o, i, a] = e;
    return /* @__PURE__ */ Ai(n, o, i, a);
  } else if (u1(e))
    return kr(wh[e] !== void 0, `Invalid easing type '${e}'`, "invalid-easing-type"), wh[e];
  return e;
}, Us = [
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
function c1(e, n) {
  let o = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Set(), a = !1, c = !1;
  const d = /* @__PURE__ */ new WeakSet();
  let f = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  };
  function m(v) {
    d.has(v) && (y.schedule(v), e()), v(f);
  }
  const y = {
    /**
     * Schedule a process to run on the next frame.
     */
    schedule: (v, l = !1, p = !1) => {
      const w = p && a ? o : i;
      return l && d.add(v), w.add(v), v;
    },
    /**
     * Cancel the provided callback from running on the next frame.
     */
    cancel: (v) => {
      i.delete(v), d.delete(v);
    },
    /**
     * Execute all schedule callbacks.
     */
    process: (v) => {
      if (f = v, a) {
        c = !0;
        return;
      }
      a = !0;
      const l = o;
      o = i, i = l, o.forEach(m), o.clear(), a = !1, c && (c = !1, y.process(v));
    }
  };
  return y;
}
const d1 = 40;
function Lg(e, n) {
  let o = !1, i = !0;
  const a = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  }, c = () => o = !0, d = Us.reduce((E, N) => (E[N] = c1(c), E), {}), { setup: f, read: m, resolveKeyframes: y, preUpdate: v, update: l, preRender: p, render: S, postRender: w } = d, k = () => {
    const E = Qn.useManualTiming, N = E ? a.timestamp : performance.now();
    o = !1, E || (a.delta = i ? 1e3 / 60 : Math.max(Math.min(N - a.timestamp, d1), 1)), a.timestamp = N, a.isProcessing = !0, f.process(a), m.process(a), y.process(a), v.process(a), l.process(a), p.process(a), S.process(a), w.process(a), a.isProcessing = !1, o && n && (i = !1, e(k));
  }, A = () => {
    o = !0, i = !0, a.isProcessing || e(k);
  };
  return { schedule: Us.reduce((E, N) => {
    const O = d[N];
    return E[N] = (W, G = !1, K = !1) => (o || A(), O.schedule(W, G, K)), E;
  }, {}), cancel: (E) => {
    for (let N = 0; N < Us.length; N++)
      d[Us[N]].cancel(E);
  }, state: a, steps: d };
}
const { schedule: ke, cancel: Xn, state: Ze, steps: Hu } = /* @__PURE__ */ Lg(typeof requestAnimationFrame < "u" ? requestAnimationFrame : Dt, !0);
let ia;
function f1() {
  ia = void 0;
}
const st = {
  now: () => (ia === void 0 && st.set(Ze.isProcessing || Qn.useManualTiming ? Ze.timestamp : performance.now()), ia),
  set: (e) => {
    ia = e, queueMicrotask(f1);
  }
}, Vg = (e) => (n) => typeof n == "string" && n.startsWith(e), Bg = /* @__PURE__ */ Vg("--"), p1 = /* @__PURE__ */ Vg("var(--"), wd = (e) => p1(e) ? m1.test(e.split("/*")[0].trim()) : !1, m1 = /var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;
function _h(e) {
  return typeof e != "string" ? !1 : e.split("/*")[0].includes("var(--");
}
const po = {
  test: (e) => typeof e == "number",
  parse: parseFloat,
  transform: (e) => e
}, yi = {
  ...po,
  transform: (e) => nn(0, 1, e)
}, Hs = {
  ...po,
  default: 1
}, ui = (e) => Math.round(e * 1e5) / 1e5, xd = /-?(?:\d+(?:\.\d+)?|\.\d+)/gu;
function h1(e) {
  return e == null;
}
const y1 = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu, _d = (e, n) => (o) => !!(typeof o == "string" && y1.test(o) && o.startsWith(e) || n && !h1(o) && Object.prototype.hasOwnProperty.call(o, n)), zg = (e, n, o) => (i) => {
  if (typeof i != "string")
    return i;
  const [a, c, d, f] = i.match(xd);
  return {
    [e]: parseFloat(a),
    [n]: parseFloat(c),
    [o]: parseFloat(d),
    alpha: f !== void 0 ? parseFloat(f) : 1
  };
}, g1 = (e) => nn(0, 255, e), Wu = {
  ...po,
  transform: (e) => Math.round(g1(e))
}, yr = {
  test: /* @__PURE__ */ _d("rgb", "red"),
  parse: /* @__PURE__ */ zg("red", "green", "blue"),
  transform: ({ red: e, green: n, blue: o, alpha: i = 1 }) => "rgba(" + Wu.transform(e) + ", " + Wu.transform(n) + ", " + Wu.transform(o) + ", " + ui(yi.transform(i)) + ")"
};
function v1(e) {
  let n = "", o = "", i = "", a = "";
  return e.length > 5 ? (n = e.substring(1, 3), o = e.substring(3, 5), i = e.substring(5, 7), a = e.substring(7, 9)) : (n = e.substring(1, 2), o = e.substring(2, 3), i = e.substring(3, 4), a = e.substring(4, 5), n += n, o += o, i += i, a += a), {
    red: parseInt(n, 16),
    green: parseInt(o, 16),
    blue: parseInt(i, 16),
    alpha: a ? parseInt(a, 16) / 255 : 1
  };
}
const gc = {
  test: /* @__PURE__ */ _d("#"),
  parse: v1,
  transform: yr.transform
}, Ci = /* @__NO_SIDE_EFFECTS__ */ (e) => ({
  test: (n) => typeof n == "string" && n.endsWith(e) && n.split(" ").length === 1,
  parse: parseFloat,
  transform: (n) => `${n}${e}`
}), mn = /* @__PURE__ */ Ci("deg"), tn = /* @__PURE__ */ Ci("%"), ne = /* @__PURE__ */ Ci("px"), S1 = /* @__PURE__ */ Ci("vh"), w1 = /* @__PURE__ */ Ci("vw"), Th = {
  ...tn,
  parse: (e) => tn.parse(e) / 100,
  transform: (e) => tn.transform(e * 100)
}, ro = {
  test: /* @__PURE__ */ _d("hsl", "hue"),
  parse: /* @__PURE__ */ zg("hue", "saturation", "lightness"),
  transform: ({ hue: e, saturation: n, lightness: o, alpha: i = 1 }) => "hsla(" + Math.round(e) + ", " + tn.transform(ui(n)) + ", " + tn.transform(ui(o)) + ", " + ui(yi.transform(i)) + ")"
}, Be = {
  test: (e) => yr.test(e) || gc.test(e) || ro.test(e),
  parse: (e) => yr.test(e) ? yr.parse(e) : ro.test(e) ? ro.parse(e) : gc.parse(e),
  transform: (e) => typeof e == "string" ? e : e.hasOwnProperty("red") ? yr.transform(e) : ro.transform(e),
  getAnimatableNone: (e) => {
    const n = Be.parse(e);
    return n.alpha = 0, Be.transform(n);
  }
}, x1 = /(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;
function _1(e) {
  var n, o;
  return isNaN(e) && typeof e == "string" && (((n = e.match(xd)) == null ? void 0 : n.length) || 0) + (((o = e.match(x1)) == null ? void 0 : o.length) || 0) > 0;
}
const $g = "number", Ug = "color", T1 = "var", k1 = "var(", kh = "${}", A1 = /var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;
function uo(e) {
  const n = e.toString(), o = [], i = {
    color: [],
    number: [],
    var: []
  }, a = [];
  let c = 0;
  const f = n.replace(A1, (m) => (Be.test(m) ? (i.color.push(c), a.push(Ug), o.push(Be.parse(m))) : m.startsWith(k1) ? (i.var.push(c), a.push(T1), o.push(m)) : (i.number.push(c), a.push($g), o.push(parseFloat(m))), ++c, kh)).split(kh);
  return { values: o, split: f, indexes: i, types: a };
}
function C1(e) {
  return uo(e).values;
}
function Hg({ split: e, types: n }) {
  const o = e.length;
  return (i) => {
    let a = "";
    for (let c = 0; c < o; c++)
      if (a += e[c], i[c] !== void 0) {
        const d = n[c];
        d === $g ? a += ui(i[c]) : d === Ug ? a += Be.transform(i[c]) : a += i[c];
      }
    return a;
  };
}
function P1(e) {
  return Hg(uo(e));
}
const b1 = (e) => typeof e == "number" ? 0 : Be.test(e) ? Be.getAnimatableNone(e) : e, E1 = (e, n) => typeof e == "number" ? n != null && n.trim().endsWith("/") ? e : 0 : b1(e);
function M1(e) {
  const n = uo(e);
  return Hg(n)(n.values.map((i, a) => E1(i, n.split[a])));
}
const Ut = {
  test: _1,
  parse: C1,
  createTransformer: P1,
  getAnimatableNone: M1
};
function Gu(e, n, o) {
  return o < 0 && (o += 1), o > 1 && (o -= 1), o < 1 / 6 ? e + (n - e) * 6 * o : o < 1 / 2 ? n : o < 2 / 3 ? e + (n - e) * (2 / 3 - o) * 6 : e;
}
function R1({ hue: e, saturation: n, lightness: o, alpha: i }) {
  e /= 360, n /= 100, o /= 100;
  let a = 0, c = 0, d = 0;
  if (!n)
    a = c = d = o;
  else {
    const f = o < 0.5 ? o * (1 + n) : o + n - o * n, m = 2 * o - f;
    a = Gu(m, f, e + 1 / 3), c = Gu(m, f, e), d = Gu(m, f, e - 1 / 3);
  }
  return {
    red: Math.round(a * 255),
    green: Math.round(c * 255),
    blue: Math.round(d * 255),
    alpha: i
  };
}
function Sa(e, n) {
  return (o) => o > 0 ? n : e;
}
const Te = (e, n, o) => e + (n - e) * o, Ku = (e, n, o) => {
  const i = e * e, a = o * (n * n - i) + i;
  return a < 0 ? 0 : Math.sqrt(a);
}, D1 = [gc, yr, ro], N1 = (e) => D1.find((n) => n.test(e));
function Ah(e) {
  const n = N1(e);
  if (Ti(!!n, `'${e}' is not an animatable color. Use the equivalent color code instead.`, "color-not-animatable"), !n)
    return !1;
  let o = n.parse(e);
  return n === ro && (o = R1(o)), o;
}
const Ch = (e, n) => {
  const o = Ah(e), i = Ah(n);
  if (!o || !i)
    return Sa(e, n);
  const a = { ...o };
  return (c) => (a.red = Ku(o.red, i.red, c), a.green = Ku(o.green, i.green, c), a.blue = Ku(o.blue, i.blue, c), a.alpha = Te(o.alpha, i.alpha, c), yr.transform(a));
}, vc = /* @__PURE__ */ new Set(["none", "hidden"]);
function j1(e, n) {
  return vc.has(e) ? (o) => o <= 0 ? e : n : (o) => o >= 1 ? n : e;
}
function I1(e, n) {
  return (o) => Te(e, n, o);
}
function Td(e) {
  return typeof e == "number" ? I1 : typeof e == "string" ? wd(e) ? Sa : Be.test(e) ? Ch : L1 : Array.isArray(e) ? Wg : typeof e == "object" ? Be.test(e) ? Ch : F1 : Sa;
}
function Wg(e, n) {
  const o = [...e], i = o.length, a = e.map((c, d) => Td(c)(c, n[d]));
  return (c) => {
    for (let d = 0; d < i; d++)
      o[d] = a[d](c);
    return o;
  };
}
function F1(e, n) {
  const o = { ...e, ...n }, i = {};
  for (const a in o)
    e[a] !== void 0 && n[a] !== void 0 && (i[a] = Td(e[a])(e[a], n[a]));
  return (a) => {
    for (const c in i)
      o[c] = i[c](a);
    return o;
  };
}
function O1(e, n) {
  const o = [], i = { color: 0, var: 0, number: 0 };
  for (let a = 0; a < n.values.length; a++) {
    const c = n.types[a], d = e.indexes[c][i[c]], f = e.values[d] ?? 0;
    o[a] = f, i[c]++;
  }
  return o;
}
const L1 = (e, n) => {
  const o = Ut.createTransformer(n), i = uo(e), a = uo(n);
  return i.indexes.var.length === a.indexes.var.length && i.indexes.color.length === a.indexes.color.length && i.indexes.number.length >= a.indexes.number.length ? vc.has(e) && !a.values.length || vc.has(n) && !i.values.length ? j1(e, n) : ki(Wg(O1(i, a), a.values), o) : (Ti(!0, `Complex values '${e}' and '${n}' too different to mix. Ensure all colors are of the same type, and that each contains the same quantity of number and color values. Falling back to instant transition.`, "complex-values-different"), Sa(e, n));
};
function Gg(e, n, o) {
  return typeof e == "number" && typeof n == "number" && typeof o == "number" ? Te(e, n, o) : Td(e)(e, n);
}
const V1 = (e) => {
  const n = ({ timestamp: o }) => e(o);
  return {
    start: (o = !0) => ke.update(n, o),
    stop: () => Xn(n),
    /**
     * If we're processing this frame we can use the
     * framelocked timestamp to keep things in sync.
     */
    now: () => Ze.isProcessing ? Ze.timestamp : st.now()
  };
}, Kg = (e, n, o = 10) => {
  let i = "";
  const a = Math.max(Math.round(n / o), 2);
  for (let c = 0; c < a; c++)
    i += Math.round(e(c / (a - 1)) * 1e4) / 1e4 + ", ";
  return `linear(${i.substring(0, i.length - 2)})`;
}, wa = 2e4;
function kd(e) {
  let n = 0;
  const o = 50;
  let i = e.next(n);
  for (; !i.done && n < wa; )
    n += o, i = e.next(n);
  return n >= wa ? 1 / 0 : n;
}
function B1(e, n = 100, o) {
  const i = o({ ...e, keyframes: [0, n] }), a = Math.min(kd(i), wa);
  return {
    type: "keyframes",
    ease: (c) => i.next(a * c).value / n,
    duration: /* @__PURE__ */ Rt(a)
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
function Sc(e, n) {
  return e * Math.sqrt(1 - n * n);
}
const z1 = 12;
function $1(e, n, o) {
  let i = o;
  for (let a = 1; a < z1; a++)
    i = i - e(i) / n(i);
  return i;
}
const Yu = 1e-3;
function U1({ duration: e = Ie.duration, bounce: n = Ie.bounce, velocity: o = Ie.velocity, mass: i = Ie.mass }) {
  let a, c;
  Ti(e <= /* @__PURE__ */ ht(Ie.maxDuration), "Spring duration must be 10 seconds or less", "spring-duration-limit");
  let d = 1 - n;
  d = nn(Ie.minDamping, Ie.maxDamping, d), e = nn(Ie.minDuration, Ie.maxDuration, /* @__PURE__ */ Rt(e)), d < 1 ? (a = (y) => {
    const v = y * d, l = v * e, p = v - o, S = Sc(y, d), w = Math.exp(-l);
    return Yu - p / S * w;
  }, c = (y) => {
    const l = y * d * e, p = l * o + o, S = Math.pow(d, 2) * Math.pow(y, 2) * e, w = Math.exp(-l), k = Sc(Math.pow(y, 2), d);
    return (-a(y) + Yu > 0 ? -1 : 1) * ((p - S) * w) / k;
  }) : (a = (y) => {
    const v = Math.exp(-y * e), l = (y - o) * e + 1;
    return -Yu + v * l;
  }, c = (y) => {
    const v = Math.exp(-y * e), l = (o - y) * (e * e);
    return v * l;
  });
  const f = 5 / e, m = $1(a, c, f);
  if (e = /* @__PURE__ */ ht(e), isNaN(m))
    return {
      stiffness: Ie.stiffness,
      damping: Ie.damping,
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
const H1 = ["duration", "bounce"], W1 = ["stiffness", "damping", "mass"];
function Ph(e, n) {
  return n.some((o) => e[o] !== void 0);
}
function G1(e) {
  let n = {
    velocity: Ie.velocity,
    stiffness: Ie.stiffness,
    damping: Ie.damping,
    mass: Ie.mass,
    isResolvedFromDuration: !1,
    ...e
  };
  if (!Ph(e, W1) && Ph(e, H1))
    if (n.velocity = 0, e.visualDuration) {
      const o = e.visualDuration, i = 2 * Math.PI / (o * 1.2), a = i * i, c = 2 * nn(0.05, 1, 1 - (e.bounce || 0)) * Math.sqrt(a);
      n = {
        ...n,
        mass: Ie.mass,
        stiffness: a,
        damping: c
      };
    } else {
      const o = U1({ ...e, velocity: 0 });
      n = {
        ...n,
        ...o,
        mass: Ie.mass
      }, n.isResolvedFromDuration = !0;
    }
  return n;
}
function xa(e = Ie.visualDuration, n = Ie.bounce) {
  const o = typeof e != "object" ? {
    visualDuration: e,
    keyframes: [0, 1],
    bounce: n
  } : e;
  let { restSpeed: i, restDelta: a } = o;
  const c = o.keyframes[0], d = o.keyframes[o.keyframes.length - 1], f = { done: !1, value: c }, { stiffness: m, damping: y, mass: v, duration: l, velocity: p, isResolvedFromDuration: S } = G1({
    ...o,
    velocity: -/* @__PURE__ */ Rt(o.velocity || 0)
  }), w = p || 0, k = y / (2 * Math.sqrt(m * v)), A = d - c, T = /* @__PURE__ */ Rt(Math.sqrt(m / v)), P = Math.abs(A) < 5;
  i || (i = P ? Ie.restSpeed.granular : Ie.restSpeed.default), a || (a = P ? Ie.restDelta.granular : Ie.restDelta.default);
  let E, N, O, W, G, K;
  if (k < 1)
    O = Sc(T, k), W = (w + k * T * A) / O, E = (X) => {
      const ae = Math.exp(-k * T * X);
      return d - ae * (W * Math.sin(O * X) + A * Math.cos(O * X));
    }, G = k * T * W + A * O, K = k * T * A - W * O, N = (X) => Math.exp(-k * T * X) * (G * Math.sin(O * X) + K * Math.cos(O * X));
  else if (k === 1) {
    E = (ae) => d - Math.exp(-T * ae) * (A + (w + T * A) * ae);
    const X = w + T * A;
    N = (ae) => Math.exp(-T * ae) * (T * X * ae - w);
  } else {
    const X = T * Math.sqrt(k * k - 1);
    E = (ue) => {
      const _e = Math.exp(-k * T * ue), ve = Math.min(X * ue, 300);
      return d - _e * ((w + k * T * A) * Math.sinh(ve) + X * A * Math.cosh(ve)) / X;
    };
    const ae = (w + k * T * A) / X, q = k * T * ae - A * X, de = k * T * A - ae * X;
    N = (ue) => {
      const _e = Math.exp(-k * T * ue), ve = Math.min(X * ue, 300);
      return _e * (q * Math.sinh(ve) + de * Math.cosh(ve));
    };
  }
  const L = {
    calculatedDuration: S && l || null,
    velocity: (X) => /* @__PURE__ */ ht(N(X)),
    next: (X) => {
      if (!S && k < 1) {
        const q = Math.exp(-k * T * X), de = Math.sin(O * X), ue = Math.cos(O * X), _e = d - q * (W * de + A * ue), ve = /* @__PURE__ */ ht(q * (G * de + K * ue));
        return f.done = Math.abs(ve) <= i && Math.abs(d - _e) <= a, f.value = f.done ? d : _e, f;
      }
      const ae = E(X);
      if (S)
        f.done = X >= l;
      else {
        const q = /* @__PURE__ */ ht(N(X));
        f.done = Math.abs(q) <= i && Math.abs(d - ae) <= a;
      }
      return f.value = f.done ? d : ae, f;
    },
    toString: () => {
      const X = Math.min(kd(L), wa), ae = Kg((q) => L.next(X * q).value, X, 30);
      return X + "ms " + ae;
    },
    toTransition: () => {
    }
  };
  return L;
}
xa.applyToOptions = (e) => {
  const n = B1(e, 100, xa);
  return e.ease = n.ease, e.duration = /* @__PURE__ */ ht(n.duration), e.type = "keyframes", e;
};
const K1 = 5;
function Yg(e, n, o) {
  const i = Math.max(n - K1, 0);
  return /* @__PURE__ */ Pg(o - e(i), n - i);
}
function wc({ keyframes: e, velocity: n = 0, power: o = 0.8, timeConstant: i = 325, bounceDamping: a = 10, bounceStiffness: c = 500, modifyTarget: d, min: f, max: m, restDelta: y = 0.5, restSpeed: v }) {
  const l = e[0], p = {
    done: !1,
    value: l
  }, S = (K) => f !== void 0 && K < f || m !== void 0 && K > m, w = (K) => f === void 0 ? m : m === void 0 || Math.abs(f - K) < Math.abs(m - K) ? f : m;
  let k = o * n;
  const A = l + k, T = d === void 0 ? A : d(A);
  T !== A && (k = T - l);
  const P = (K) => -k * Math.exp(-K / i), E = (K) => T + P(K), N = (K) => {
    const L = P(K), X = E(K);
    p.done = Math.abs(L) <= y, p.value = p.done ? T : X;
  };
  let O, W;
  const G = (K) => {
    S(p.value) && (O = K, W = xa({
      keyframes: [p.value, w(p.value)],
      velocity: Yg(E, K, p.value),
      // TODO: This should be passing * 1000
      damping: a,
      stiffness: c,
      restDelta: y,
      restSpeed: v
    }));
  };
  return G(0), {
    calculatedDuration: null,
    next: (K) => {
      let L = !1;
      return !W && O === void 0 && (L = !0, N(K), G(K)), O !== void 0 && K >= O ? W.next(K - O) : (!L && N(K), p);
    }
  };
}
function Y1(e, n, o) {
  const i = [], a = o || Qn.mix || Gg, c = e.length - 1;
  for (let d = 0; d < c; d++) {
    let f = a(e[d], e[d + 1]);
    if (n) {
      const m = Array.isArray(n) ? n[d] || Dt : n;
      f = ki(m, f);
    }
    i.push(f);
  }
  return i;
}
function Q1(e, n, { clamp: o = !0, ease: i, mixer: a } = {}) {
  const c = e.length;
  if (kr(c === n.length, "Both input and output ranges must be the same length", "range-length"), c === 1)
    return () => n[0];
  if (c === 2 && n[0] === n[1])
    return () => n[1];
  const d = e[0] === e[1];
  e[0] > e[c - 1] && (e = [...e].reverse(), n = [...n].reverse());
  const f = Y1(n, i, a), m = f.length, y = (v) => {
    if (d && v < e[0])
      return n[0];
    let l = 0;
    if (m > 1)
      for (; l < e.length - 2 && !(v < e[l + 1]); l++)
        ;
    const p = /* @__PURE__ */ hi(e[l], e[l + 1], v);
    return f[l](p);
  };
  return o ? (v) => y(nn(e[0], e[c - 1], v)) : y;
}
function X1(e, n) {
  const o = e[e.length - 1];
  for (let i = 1; i <= n; i++) {
    const a = /* @__PURE__ */ hi(0, n, i);
    e.push(Te(o, 1, a));
  }
}
function Z1(e) {
  const n = [0];
  return X1(n, e.length - 1), n;
}
function J1(e, n) {
  return e.map((o) => o * n);
}
function q1(e, n) {
  return e.map(() => n || Fg).splice(0, e.length - 1);
}
function ci({ duration: e = 300, keyframes: n, times: o, ease: i = "easeInOut" }) {
  const a = /* @__PURE__ */ l1(i) ? i.map(xh) : xh(i), c = {
    done: !1,
    value: n[0]
  }, d = J1(
    // Only use the provided offsets if they're the correct length
    // TODO Maybe we should warn here if there's a length mismatch
    o && o.length === n.length ? o : Z1(n),
    e
  ), f = Q1(d, n, {
    ease: Array.isArray(a) ? a : q1(n, a)
  });
  return {
    calculatedDuration: e,
    next: (m) => (c.value = f(m), c.done = m >= e, c)
  };
}
const e_ = (e) => e !== null;
function Fa(e, { repeat: n, repeatType: o = "loop" }, i, a = 1) {
  const c = e.filter(e_), f = a < 0 || n && o !== "loop" && n % 2 === 1 ? 0 : c.length - 1;
  return !f || i === void 0 ? c[f] : i;
}
const t_ = {
  decay: wc,
  inertia: wc,
  tween: ci,
  keyframes: ci,
  spring: xa
};
function Qg(e) {
  typeof e.type == "string" && (e.type = t_[e.type]);
}
class Ad {
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
const n_ = (e) => e / 100;
class _a extends Ad {
  constructor(n) {
    super(), this.state = "idle", this.startTime = null, this.isStopped = !1, this.currentTime = 0, this.holdTime = null, this.playbackSpeed = 1, this.delayState = {
      done: !1,
      value: void 0
    }, this.stop = () => {
      var i, a;
      const { motionValue: o } = this.options;
      o && o.updatedAt !== st.now() && this.tick(st.now()), this.isStopped = !0, this.state !== "idle" && (this.teardown(), (a = (i = this.options).onStop) == null || a.call(i));
    }, this.options = n, this.initAnimation(), this.play(), n.autoplay === !1 && this.pause();
  }
  initAnimation() {
    const { options: n } = this;
    Qg(n);
    const { type: o = ci, repeat: i = 0, repeatDelay: a = 0, repeatType: c, velocity: d = 0 } = n;
    let { keyframes: f } = n;
    const m = o || ci;
    m !== ci && typeof f[0] != "number" && (this.mixKeyframes = ki(n_, Gg(f[0], f[1])), f = [0, 100]);
    const y = m({ ...n, keyframes: f });
    c === "mirror" && (this.mirroredGenerator = m({
      ...n,
      keyframes: [...f].reverse(),
      velocity: -d
    })), y.calculatedDuration === null && (y.calculatedDuration = kd(y));
    const { calculatedDuration: v } = y;
    this.calculatedDuration = v, this.resolvedDuration = v + a, this.totalDuration = this.resolvedDuration * (i + 1) - a, this.generator = y;
  }
  updateTime(n) {
    const o = Math.round(n - this.startTime) * this.playbackSpeed;
    this.holdTime !== null ? this.currentTime = this.holdTime : this.currentTime = o;
  }
  tick(n, o = !1) {
    const { generator: i, totalDuration: a, mixKeyframes: c, mirroredGenerator: d, resolvedDuration: f, calculatedDuration: m } = this;
    if (this.startTime === null)
      return i.next(0);
    const { delay: y = 0, keyframes: v, repeat: l, repeatType: p, repeatDelay: S, type: w, onUpdate: k, finalKeyframe: A } = this.options;
    this.speed > 0 ? this.startTime = Math.min(this.startTime, n) : this.speed < 0 && (this.startTime = Math.min(n - a / this.speed, this.startTime)), o ? this.currentTime = n : this.updateTime(n);
    const T = this.currentTime - y * (this.playbackSpeed >= 0 ? 1 : -1), P = this.playbackSpeed >= 0 ? T < 0 : T > a;
    this.currentTime = Math.max(T, 0), this.state === "finished" && this.holdTime === null && (this.currentTime = a);
    let E = this.currentTime, N = i;
    if (l) {
      const K = Math.min(this.currentTime, a) / f;
      let L = Math.floor(K), X = K % 1;
      !X && K >= 1 && (X = 1), X === 1 && L--, L = Math.min(L, l + 1), !!(L % 2) && (p === "reverse" ? (X = 1 - X, S && (X -= S / f)) : p === "mirror" && (N = d)), E = nn(0, 1, X) * f;
    }
    let O;
    P ? (this.delayState.value = v[0], O = this.delayState) : O = N.next(E), c && !P && (O.value = c(O.value));
    let { done: W } = O;
    !P && m !== null && (W = this.playbackSpeed >= 0 ? this.currentTime >= a : this.currentTime <= 0);
    const G = this.holdTime === null && (this.state === "finished" || this.state === "running" && W);
    return G && w !== wc && (O.value = Fa(v, this.options, A, this.speed)), k && k(O.value), G && this.finish(), O;
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
    return /* @__PURE__ */ Rt(this.calculatedDuration);
  }
  get iterationDuration() {
    const { delay: n = 0 } = this.options || {};
    return this.duration + /* @__PURE__ */ Rt(n);
  }
  get time() {
    return /* @__PURE__ */ Rt(this.currentTime);
  }
  set time(n) {
    n = /* @__PURE__ */ ht(n), this.currentTime = n, this.startTime === null || this.holdTime !== null || this.playbackSpeed === 0 ? this.holdTime = n : this.driver && (this.startTime = this.driver.now() - n / this.playbackSpeed), this.driver ? this.driver.start(!1) : (this.startTime = 0, this.state = "paused", this.holdTime = n, this.tick(n));
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
    return Yg((i) => this.generator.next(i).value, n, o);
  }
  get speed() {
    return this.playbackSpeed;
  }
  set speed(n) {
    const o = this.playbackSpeed !== n;
    o && this.driver && this.updateTime(st.now()), this.playbackSpeed = n, o && this.driver && (this.time = /* @__PURE__ */ Rt(this.currentTime));
  }
  play() {
    var a, c;
    if (this.isStopped)
      return;
    const { driver: n = V1, startTime: o } = this.options;
    this.driver || (this.driver = n((d) => this.tick(d))), (c = (a = this.options).onPlay) == null || c.call(a);
    const i = this.driver.now();
    this.state === "finished" ? (this.updateFinished(), this.startTime = i) : this.holdTime !== null ? this.startTime = i - this.holdTime : this.startTime || (this.startTime = o ?? i), this.state === "finished" && this.speed < 0 && (this.startTime += this.calculatedDuration), this.holdTime = null, this.state = "running", this.driver.start();
  }
  pause() {
    this.state = "paused", this.updateTime(st.now()), this.holdTime = this.currentTime;
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
function r_(e) {
  for (let n = 1; n < e.length; n++)
    e[n] ?? (e[n] = e[n - 1]);
}
const gr = (e) => e * 180 / Math.PI, xc = (e) => {
  const n = gr(Math.atan2(e[1], e[0]));
  return _c(n);
}, o_ = {
  x: 4,
  y: 5,
  translateX: 4,
  translateY: 5,
  scaleX: 0,
  scaleY: 3,
  scale: (e) => (Math.abs(e[0]) + Math.abs(e[3])) / 2,
  rotate: xc,
  rotateZ: xc,
  skewX: (e) => gr(Math.atan(e[1])),
  skewY: (e) => gr(Math.atan(e[2])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[2])) / 2
}, _c = (e) => (e = e % 360, e < 0 && (e += 360), e), bh = xc, Eh = (e) => Math.sqrt(e[0] * e[0] + e[1] * e[1]), Mh = (e) => Math.sqrt(e[4] * e[4] + e[5] * e[5]), i_ = {
  x: 12,
  y: 13,
  z: 14,
  translateX: 12,
  translateY: 13,
  translateZ: 14,
  scaleX: Eh,
  scaleY: Mh,
  scale: (e) => (Eh(e) + Mh(e)) / 2,
  rotateX: (e) => _c(gr(Math.atan2(e[6], e[5]))),
  rotateY: (e) => _c(gr(Math.atan2(-e[2], e[0]))),
  rotateZ: bh,
  rotate: bh,
  skewX: (e) => gr(Math.atan(e[4])),
  skewY: (e) => gr(Math.atan(e[1])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[4])) / 2
};
function Tc(e) {
  return e.includes("scale") ? 1 : 0;
}
function kc(e, n) {
  if (!e || e === "none")
    return Tc(n);
  const o = e.match(/^matrix3d\(([-\d.e\s,]+)\)$/u);
  let i, a;
  if (o)
    i = i_, a = o;
  else {
    const f = e.match(/^matrix\(([-\d.e\s,]+)\)$/u);
    i = o_, a = f;
  }
  if (!a)
    return Tc(n);
  const c = i[n], d = a[1].split(",").map(a_);
  return typeof c == "function" ? c(d) : d[c];
}
const s_ = (e, n) => {
  const { transform: o = "none" } = getComputedStyle(e);
  return kc(o, n);
};
function a_(e) {
  return parseFloat(e.trim());
}
const mo = [
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
], ho = /* @__PURE__ */ new Set([...mo, "pathRotation"]), Rh = (e) => e === po || e === ne, l_ = /* @__PURE__ */ new Set(["x", "y", "z"]), u_ = mo.filter((e) => !l_.has(e));
function c_(e) {
  const n = [];
  return u_.forEach((o) => {
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
  x: (e, { transform: n }) => kc(n, "x"),
  y: (e, { transform: n }) => kc(n, "y")
};
Gn.translateX = Gn.x;
Gn.translateY = Gn.y;
const Sr = /* @__PURE__ */ new Set();
let Ac = !1, Cc = !1, Pc = !1;
function Xg() {
  if (Cc) {
    const e = Array.from(Sr).filter((i) => i.needsMeasurement), n = new Set(e.map((i) => i.element)), o = /* @__PURE__ */ new Map();
    n.forEach((i) => {
      const a = c_(i);
      a.length && (o.set(i, a), i.render());
    }), e.forEach((i) => i.measureInitialState()), n.forEach((i) => {
      i.render();
      const a = o.get(i);
      a && a.forEach(([c, d]) => {
        var f;
        (f = i.getValue(c)) == null || f.set(d);
      });
    }), e.forEach((i) => i.measureEndState()), e.forEach((i) => {
      i.suspendedScrollY !== void 0 && window.scrollTo(0, i.suspendedScrollY);
    });
  }
  Cc = !1, Ac = !1, Sr.forEach((e) => e.complete(Pc)), Sr.clear();
}
function Zg() {
  Sr.forEach((e) => {
    e.readKeyframes(), e.needsMeasurement && (Cc = !0);
  });
}
function d_() {
  Pc = !0, Zg(), Xg(), Pc = !1;
}
class Cd {
  constructor(n, o, i, a, c, d = !1) {
    this.state = "pending", this.isAsync = !1, this.needsMeasurement = !1, this.unresolvedKeyframes = [...n], this.onComplete = o, this.name = i, this.motionValue = a, this.element = c, this.isAsync = d;
  }
  scheduleResolve() {
    this.state = "scheduled", this.isAsync ? (Sr.add(this), Ac || (Ac = !0, ke.read(Zg), ke.resolveKeyframes(Xg))) : (this.readKeyframes(), this.complete());
  }
  readKeyframes() {
    const { unresolvedKeyframes: n, name: o, element: i, motionValue: a } = this;
    if (n[0] === null) {
      const c = a == null ? void 0 : a.get(), d = n[n.length - 1];
      if (c !== void 0)
        n[0] = c;
      else if (i && o) {
        const f = i.readValue(o, d);
        f != null && (n[0] = f);
      }
      n[0] === void 0 && (n[0] = d), a && c === void 0 && a.set(n[0]);
    }
    r_(n);
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
    this.state = "complete", this.onComplete(this.unresolvedKeyframes, this.finalKeyframe, n), Sr.delete(this);
  }
  cancel() {
    this.state === "scheduled" && (Sr.delete(this), this.state = "pending");
  }
  resume() {
    this.state === "pending" && this.scheduleResolve();
  }
}
const f_ = (e) => e.startsWith("--");
function Jg(e, n, o) {
  f_(n) ? e.style.setProperty(n, o) : e.style[n] = o;
}
const p_ = {};
function qg(e, n) {
  const o = /* @__PURE__ */ Cg(e);
  return () => p_[n] ?? o();
}
const m_ = /* @__PURE__ */ qg(() => window.ScrollTimeline !== void 0, "scrollTimeline"), ev = /* @__PURE__ */ qg(() => {
  try {
    document.createElement("div").animate({ opacity: 0 }, { easing: "linear(0, 1)" });
  } catch {
    return !1;
  }
  return !0;
}, "linearEasing"), ai = ([e, n, o, i]) => `cubic-bezier(${e}, ${n}, ${o}, ${i})`, Dh = {
  linear: "linear",
  ease: "ease",
  easeIn: "ease-in",
  easeOut: "ease-out",
  easeInOut: "ease-in-out",
  circIn: /* @__PURE__ */ ai([0, 0.65, 0.55, 1]),
  circOut: /* @__PURE__ */ ai([0.55, 0, 1, 0.45]),
  backIn: /* @__PURE__ */ ai([0.31, 0.01, 0.66, -0.59]),
  backOut: /* @__PURE__ */ ai([0.33, 1.53, 0.69, 0.99])
};
function tv(e, n) {
  if (e)
    return typeof e == "function" ? ev() ? Kg(e, n) : "ease-out" : /* @__PURE__ */ Og(e) ? ai(e) : Array.isArray(e) ? e.map((o) => tv(o, n) || Dh.easeOut) : Dh[e];
}
function h_(e, n, o, { delay: i = 0, duration: a = 300, repeat: c = 0, repeatType: d = "loop", ease: f = "easeOut", times: m } = {}, y = void 0) {
  const v = {
    [n]: o
  };
  m && (v.offset = m);
  const l = tv(f, a);
  Array.isArray(l) && (v.easing = l);
  const p = {
    delay: i,
    duration: a,
    easing: Array.isArray(l) ? "linear" : l,
    fill: "both",
    iterations: c + 1,
    direction: d === "reverse" ? "alternate" : "normal"
  };
  return y && (p.pseudoElement = y), e.animate(v, p);
}
function nv(e) {
  return typeof e == "function" && "applyToOptions" in e;
}
function y_({ type: e, ...n }) {
  return nv(e) && ev() ? e.applyToOptions(n) : (n.duration ?? (n.duration = 300), n.ease ?? (n.ease = "easeOut"), n);
}
class rv extends Ad {
  constructor(n) {
    if (super(), this.finishedTime = null, this.isStopped = !1, this.manualStartTime = null, !n)
      return;
    const { element: o, name: i, keyframes: a, pseudoElement: c, allowFlatten: d = !1, finalKeyframe: f, onComplete: m } = n;
    this.isPseudoElement = !!c, this.allowFlatten = d, this.options = n, kr(typeof n.type != "string", `Mini animate() doesn't support "type" as a string.`, "mini-spring");
    const y = y_(n);
    this.animation = h_(o, i, a, y, c), y.autoplay === !1 && this.animation.pause(), this.animation.onfinish = () => {
      if (this.finishedTime = this.time, !c) {
        const v = Fa(a, this.options, f, this.speed);
        this.updateMotionValue && this.updateMotionValue(v), Jg(o, i, v), this.animation.cancel();
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
    return /* @__PURE__ */ Rt(Number(n));
  }
  get iterationDuration() {
    const { delay: n = 0 } = this.options || {};
    return this.duration + /* @__PURE__ */ Rt(n);
  }
  get time() {
    return /* @__PURE__ */ Rt(Number(this.animation.currentTime) || 0);
  }
  set time(n) {
    const o = this.finishedTime !== null;
    this.manualStartTime = null, this.finishedTime = null, this.animation.currentTime = /* @__PURE__ */ ht(n), o && this.animation.pause();
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
    var c;
    return this.allowFlatten && ((c = this.animation.effect) == null || c.updateTiming({ easing: "linear" })), this.animation.onfinish = null, n && m_() ? (this.animation.timeline = n, o && (this.animation.rangeStart = o), i && (this.animation.rangeEnd = i), Dt) : a(this);
  }
}
const ov = {
  anticipate: Ng,
  backInOut: Dg,
  circInOut: Ig
};
function g_(e) {
  return e in ov;
}
function v_(e) {
  typeof e.ease == "string" && g_(e.ease) && (e.ease = ov[e.ease]);
}
const Qu = 10;
class S_ extends rv {
  constructor(n) {
    v_(n), Qg(n), super(n), n.startTime !== void 0 && n.autoplay !== !1 && (this.startTime = n.startTime), this.options = n;
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
    const { motionValue: o, onUpdate: i, onComplete: a, element: c, ...d } = this.options;
    if (!o)
      return;
    if (n !== void 0) {
      o.set(n);
      return;
    }
    const f = new _a({
      ...d,
      autoplay: !1
    }), m = Math.max(Qu, st.now() - this.startTime), y = nn(0, Qu, m - Qu), v = f.sample(m).value, { name: l } = this.options;
    c && l && Jg(c, l, v), o.setWithVelocity(f.sample(Math.max(0, m - y)).value, v, y), f.stop();
  }
}
const Nh = (e, n) => n === "zIndex" ? !1 : !!(typeof e == "number" || Array.isArray(e) || typeof e == "string" && // It's animatable if we have a string
(Ut.test(e) || e === "0") && // And it contains numbers and/or colors
!e.startsWith("url("));
function w_(e) {
  const n = e[0];
  if (e.length === 1)
    return !0;
  for (let o = 0; o < e.length; o++)
    if (e[o] !== n)
      return !0;
}
function x_(e, n, o, i) {
  const a = e[0];
  if (a === null)
    return !1;
  if (n === "display" || n === "visibility")
    return !0;
  const c = e[e.length - 1], d = Nh(a, n), f = Nh(c, n);
  return Ti(d === f, `You are trying to animate ${n} from "${a}" to "${c}". "${d ? c : a}" is not an animatable value.`, "value-not-animatable"), !d || !f ? !1 : w_(e) || (o === "spring" || nv(o)) && i;
}
function bc(e) {
  e.duration = 0, e.type = "keyframes";
}
const iv = /* @__PURE__ */ new Set([
  "opacity",
  "clipPath",
  "filter",
  "transform"
  // TODO: Can be accelerated but currently disabled until https://issues.chromium.org/issues/41491098 is resolved
  // or until we implement support for linear() easing.
  // "background-color"
]), __ = /^(?:oklch|oklab|lab|lch|color|color-mix|light-dark)\(/;
function T_(e) {
  for (let n = 0; n < e.length; n++)
    if (typeof e[n] == "string" && __.test(e[n]))
      return !0;
  return !1;
}
const k_ = /* @__PURE__ */ new Set([
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
]), A_ = /* @__PURE__ */ Cg(() => Object.hasOwnProperty.call(Element.prototype, "animate"));
function C_(e) {
  var l;
  const { motionValue: n, name: o, repeatDelay: i, repeatType: a, damping: c, type: d, keyframes: f } = e;
  if (!(((l = n == null ? void 0 : n.owner) == null ? void 0 : l.current) instanceof HTMLElement))
    return !1;
  const { onUpdate: y, transformTemplate: v } = n.owner.getProps();
  return A_() && o && /**
   * Force WAAPI for color properties with browser-only color formats
   * (oklch, oklab, lab, lch, etc.) that the JS animation path can't parse.
   */
  (iv.has(o) || k_.has(o) && T_(f)) && (o !== "transform" || !v) && /**
   * If we're outputting values to onUpdate then we can't use WAAPI as there's
   * no way to read the value from WAAPI every frame.
   */
  !y && !i && a !== "mirror" && c !== 0 && d !== "inertia";
}
const P_ = 40;
class b_ extends Ad {
  constructor({ autoplay: n = !0, delay: o = 0, type: i = "keyframes", repeat: a = 0, repeatDelay: c = 0, repeatType: d = "loop", keyframes: f, name: m, motionValue: y, element: v, ...l }) {
    var w;
    super(), this.stop = () => {
      var k, A;
      this._animation && (this._animation.stop(), (k = this.stopTimeline) == null || k.call(this)), (A = this.keyframeResolver) == null || A.cancel();
    }, this.createdAt = st.now();
    const p = {
      autoplay: n,
      delay: o,
      type: i,
      repeat: a,
      repeatDelay: c,
      repeatType: d,
      name: m,
      motionValue: y,
      element: v,
      ...l
    }, S = (v == null ? void 0 : v.KeyframeResolver) || Cd;
    this.keyframeResolver = new S(f, (k, A, T) => this.onKeyframesResolved(k, A, p, !T), m, y, v), (w = this.keyframeResolver) == null || w.scheduleResolve();
  }
  onKeyframesResolved(n, o, i, a) {
    var T, P;
    this.keyframeResolver = void 0;
    const { name: c, type: d, velocity: f, delay: m, isHandoff: y, onUpdate: v } = i;
    this.resolvedAt = st.now();
    let l = !0;
    x_(n, c, d, f) || (l = !1, (Qn.instantAnimations || !m) && (v == null || v(Fa(n, i, o))), n[0] = n[n.length - 1], bc(i), i.repeat = 0);
    const S = {
      startTime: a ? this.resolvedAt ? this.resolvedAt - this.createdAt > P_ ? this.resolvedAt : this.createdAt : this.createdAt : void 0,
      finalKeyframe: o,
      ...i,
      keyframes: n
    }, w = l && !y && C_(S), k = (P = (T = S.motionValue) == null ? void 0 : T.owner) == null ? void 0 : P.current;
    let A;
    if (w)
      try {
        A = new S_({
          ...S,
          element: k
        });
      } catch {
        A = new _a(S);
      }
    else
      A = new _a(S);
    A.finished.then(() => {
      this.notifyFinished();
    }).catch(Dt), this.pendingTimeline && (this.stopTimeline = A.attachTimeline(this.pendingTimeline), this.pendingTimeline = void 0), this._animation = A;
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
    return this._animation || ((n = this.keyframeResolver) == null || n.resume(), d_()), this._animation;
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
function sv(e, n, o, i = 0, a = 1) {
  const c = Array.from(e).sort((y, v) => y.sortNodePosition(v)).indexOf(n), d = e.size, f = (d - 1) * i;
  return typeof o == "function" ? o(c, d) : a === 1 ? c * i : f - c * i;
}
const jh = 30, E_ = (e) => !isNaN(parseFloat(e));
class M_ {
  /**
   * @param init - The initiating value
   * @param config - Optional configuration options
   *
   * -  `transformer`: A function to transform incoming values with.
   */
  constructor(n, o = {}) {
    this.canTrackVelocity = null, this.events = {}, this.updateAndNotify = (i) => {
      var c;
      const a = st.now();
      if (this.updatedAt !== a && this.setPrevFrameValue(), this.prev = this.current, this.setCurrent(i), this.current !== this.prev && ((c = this.events.change) == null || c.notify(this.current), this.dependents))
        for (const d of this.dependents)
          d.dirty();
    }, this.hasAnimated = !1, this.setCurrent(n), this.owner = o.owner;
  }
  setCurrent(n) {
    this.current = n, this.updatedAt = st.now(), this.canTrackVelocity === null && n !== void 0 && (this.canTrackVelocity = E_(this.current));
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
    this.events[n] || (this.events[n] = new gd());
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
    const n = st.now();
    if (!this.canTrackVelocity || this.prevFrameValue === void 0 || n - this.updatedAt > jh)
      return 0;
    const o = Math.min(this.updatedAt - this.prevUpdatedAt, jh);
    return /* @__PURE__ */ Pg(parseFloat(this.current) - parseFloat(this.prevFrameValue), o);
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
function co(e, n) {
  return new M_(e, n);
}
function av(e, n) {
  if (e != null && e.inherit && n) {
    const { inherit: o, ...i } = e;
    return { ...n, ...i };
  }
  return e;
}
function Pd(e, n) {
  const o = (e == null ? void 0 : e[n]) ?? (e == null ? void 0 : e.default) ?? e;
  return o !== e ? av(o, e) : o;
}
const R_ = {
  type: "spring",
  stiffness: 500,
  damping: 25,
  restSpeed: 10
}, D_ = (e) => ({
  type: "spring",
  stiffness: 550,
  damping: e === 0 ? 2 * Math.sqrt(550) : 30,
  restSpeed: 10
}), N_ = {
  type: "keyframes",
  duration: 0.8
}, j_ = {
  type: "keyframes",
  ease: [0.25, 0.1, 0.35, 1],
  duration: 0.3
}, I_ = (e, { keyframes: n }) => n.length > 2 ? N_ : ho.has(e) ? e.startsWith("scale") ? D_(n[1]) : R_ : j_, F_ = /* @__PURE__ */ new Set([
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
function O_(e) {
  for (const n in e)
    if (!F_.has(n))
      return !0;
  return !1;
}
const bd = (e, n, o, i = {}, a, c) => (d) => {
  const f = Pd(i, e) || {}, m = f.delay || i.delay || 0;
  let { elapsed: y = 0 } = i;
  y = y - /* @__PURE__ */ ht(m);
  const v = {
    keyframes: Array.isArray(o) ? o : [null, o],
    ease: "easeOut",
    velocity: n.getVelocity(),
    ...f,
    delay: -y,
    onUpdate: (p) => {
      n.set(p), f.onUpdate && f.onUpdate(p);
    },
    onComplete: () => {
      d(), f.onComplete && f.onComplete();
    },
    name: e,
    motionValue: n,
    element: c ? void 0 : a
  };
  O_(f) || Object.assign(v, I_(e, v)), v.duration && (v.duration = /* @__PURE__ */ ht(v.duration)), v.repeatDelay && (v.repeatDelay = /* @__PURE__ */ ht(v.repeatDelay)), v.from !== void 0 && (v.keyframes[0] = v.from);
  let l = !1;
  if ((v.type === !1 || v.duration === 0 && !v.repeatDelay) && (bc(v), v.delay === 0 && (l = !0)), (Qn.instantAnimations || Qn.skipAnimations || a != null && a.shouldSkipAnimations || f.skipAnimations) && (l = !0, bc(v), v.delay = 0), v.allowFlatten = !f.type && !f.ease, l && !c && n.get() !== void 0) {
    const p = Fa(v.keyframes, f);
    if (p !== void 0) {
      ke.update(() => {
        v.onUpdate(p), v.onComplete();
      });
      return;
    }
  }
  return f.isSync ? new _a(v) : new b_(v);
}, L_ = (
  // eslint-disable-next-line redos-detector/no-unsafe-regex -- false positive, as it can match a lot of words
  /^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u
);
function V_(e) {
  const n = L_.exec(e);
  if (!n)
    return [,];
  const [, o, i, a] = n;
  return [`--${o ?? i}`, a];
}
const B_ = 4;
function lv(e, n, o = 1) {
  kr(o <= B_, `Max CSS variable fallback depth detected in property "${e}". This may indicate a circular fallback dependency.`, "max-css-var-depth");
  const [i, a] = V_(e);
  if (!i)
    return;
  const c = window.getComputedStyle(n).getPropertyValue(i);
  if (c) {
    const d = c.trim();
    return Tg(d) ? parseFloat(d) : d;
  }
  return wd(a) ? lv(a, n, o + 1) : a;
}
function Ih(e) {
  const n = [{}, {}];
  return e == null || e.values.forEach((o, i) => {
    n[0][i] = o.get(), n[1][i] = o.getVelocity();
  }), n;
}
function Ed(e, n, o, i) {
  if (typeof n == "function") {
    const [a, c] = Ih(i);
    n = n(o !== void 0 ? o : e.custom, a, c);
  }
  if (typeof n == "string" && (n = e.variants && e.variants[n]), typeof n == "function") {
    const [a, c] = Ih(i);
    n = n(o !== void 0 ? o : e.custom, a, c);
  }
  return n;
}
function wr(e, n, o) {
  const i = e.getProps();
  return Ed(i, n, o !== void 0 ? o : i.custom, e);
}
const uv = /* @__PURE__ */ new Set([
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
  ...mo
]), Ec = (e) => Array.isArray(e);
function z_(e, n, o) {
  e.hasValue(n) ? e.getValue(n).set(o) : e.addValue(n, co(o));
}
function $_(e) {
  return Ec(e) ? e[e.length - 1] || 0 : e;
}
function U_(e, n) {
  const o = wr(e, n);
  let { transitionEnd: i = {}, transition: a = {}, ...c } = o || {};
  c = { ...c, ...i };
  for (const d in c) {
    const f = $_(c[d]);
    z_(e, d, f);
  }
}
const Je = (e) => !!(e && e.getVelocity);
function H_(e) {
  return !!(Je(e) && e.add);
}
function Mc(e, n) {
  const o = e.getValue("willChange");
  if (H_(o))
    return o.add(n);
  if (!o && Qn.WillChange) {
    const i = new Qn.WillChange("auto");
    e.addValue("willChange", i), i.add(n);
  }
}
function Md(e) {
  return e.replace(/([A-Z])/g, (n) => `-${n.toLowerCase()}`);
}
const W_ = "framerAppearId", cv = "data-" + Md(W_);
function dv(e) {
  return e.props[cv];
}
function G_({ protectedKeys: e, needsAnimating: n }, o) {
  const i = e.hasOwnProperty(o) && n[o] !== !0;
  return n[o] = !1, i;
}
function fv(e, n, { delay: o = 0, transitionOverride: i, type: a } = {}) {
  let { transition: c, transitionEnd: d, ...f } = n;
  const m = e.getDefaultTransition();
  c = c ? av(c, m) : m;
  const y = c == null ? void 0 : c.reduceMotion, v = c == null ? void 0 : c.skipAnimations;
  i && (c = i);
  const l = [], p = a && e.animationState && e.animationState.getState()[a], S = c == null ? void 0 : c.path;
  S && S.animateVisualElement(e, f, c, o, l);
  for (const w in f) {
    const k = e.getValue(w, e.latestValues[w] ?? null), A = f[w];
    if (A === void 0 || p && G_(p, w))
      continue;
    const T = {
      delay: o,
      ...Pd(c || {}, w)
    };
    v && (T.skipAnimations = !0);
    const P = k.get();
    if (P !== void 0 && !k.isAnimating() && !Array.isArray(A) && A === P && !T.velocity) {
      ke.update(() => k.set(A));
      continue;
    }
    let E = !1;
    if (window.MotionHandoffAnimation) {
      const W = dv(e);
      if (W) {
        const G = window.MotionHandoffAnimation(W, w, ke);
        G !== null && (T.startTime = G, E = !0);
      }
    }
    Mc(e, w);
    const N = y ?? e.shouldReduceMotion;
    k.start(bd(w, k, A, N && uv.has(w) ? { type: !1 } : T, e, E));
    const O = k.animation;
    O && l.push(O);
  }
  if (d) {
    const w = () => ke.update(() => {
      d && U_(e, d);
    });
    l.length ? Promise.all(l).then(w) : w();
  }
  return l;
}
function Rc(e, n, o = {}) {
  var m;
  const i = wr(e, n, o.type === "exit" ? (m = e.presenceContext) == null ? void 0 : m.custom : void 0);
  let { transition: a = e.getDefaultTransition() || {} } = i || {};
  o.transitionOverride && (a = o.transitionOverride);
  const c = i ? () => Promise.all(fv(e, i, o)) : () => Promise.resolve(), d = e.variantChildren && e.variantChildren.size ? (y = 0) => {
    const { delayChildren: v = 0, staggerChildren: l, staggerDirection: p } = a;
    return K_(e, n, y, v, l, p, o);
  } : () => Promise.resolve(), { when: f } = a;
  if (f) {
    const [y, v] = f === "beforeChildren" ? [c, d] : [d, c];
    return y().then(() => v());
  } else
    return Promise.all([c(), d(o.delay)]);
}
function K_(e, n, o = 0, i = 0, a = 0, c = 1, d) {
  const f = [];
  for (const m of e.variantChildren)
    m.notify("AnimationStart", n), f.push(Rc(m, n, {
      ...d,
      delay: o + (typeof i == "function" ? 0 : i) + sv(e.variantChildren, m, i, a, c)
    }).then(() => m.notify("AnimationComplete", n)));
  return Promise.all(f);
}
function Y_(e, n, o = {}) {
  e.notify("AnimationStart", n);
  let i;
  if (Array.isArray(n)) {
    const a = n.map((c) => Rc(e, c, o));
    i = Promise.all(a);
  } else if (typeof n == "string")
    i = Rc(e, n, o);
  else {
    const a = typeof n == "function" ? wr(e, n, o.custom) : n;
    i = Promise.all(fv(e, a, o));
  }
  return i.then(() => {
    e.notify("AnimationComplete", n);
  });
}
const Q_ = {
  test: (e) => e === "auto",
  parse: (e) => e
}, pv = (e) => (n) => n.test(e), mv = [po, ne, tn, mn, w1, S1, Q_], Fh = (e) => mv.find(pv(e));
function X_(e) {
  return typeof e == "number" ? e === 0 : e !== null ? e === "none" || e === "0" || Ag(e) : !0;
}
const Z_ = /* @__PURE__ */ new Set(["brightness", "contrast", "saturate", "opacity"]);
function J_(e) {
  const [n, o] = e.slice(0, -1).split("(");
  if (n === "drop-shadow")
    return e;
  const [i] = o.match(xd) || [];
  if (!i)
    return e;
  const a = o.replace(i, "");
  let c = Z_.has(n) ? 1 : 0;
  return i !== o && (c *= 100), n + "(" + c + a + ")";
}
const q_ = /\b([a-z-]*)\(.*?\)/gu, Dc = {
  ...Ut,
  getAnimatableNone: (e) => {
    const n = e.match(q_);
    return n ? n.map(J_).join(" ") : e;
  }
}, Nc = {
  ...Ut,
  getAnimatableNone: (e) => {
    const n = Ut.parse(e);
    return Ut.createTransformer(e)(n.map((i) => typeof i == "number" ? 0 : typeof i == "object" ? { ...i, alpha: 1 } : i));
  }
}, Oh = {
  ...po,
  transform: Math.round
}, eT = {
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
  scale: Hs,
  scaleX: Hs,
  scaleY: Hs,
  scaleZ: Hs,
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
  opacity: yi,
  originX: Th,
  originY: Th,
  originZ: ne
}, Ta = {
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
  ...eT,
  zIndex: Oh,
  // SVG
  fillOpacity: yi,
  strokeOpacity: yi,
  numOctaves: Oh
}, tT = {
  ...Ta,
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
  mask: Nc,
  WebkitMask: Nc
}, hv = (e) => tT[e], nT = /* @__PURE__ */ new Set([Dc, Nc]);
function yv(e, n) {
  let o = hv(e);
  return nT.has(o) || (o = Ut), o.getAnimatableNone ? o.getAnimatableNone(n) : void 0;
}
const rT = /* @__PURE__ */ new Set(["auto", "none", "0"]);
function oT(e, n, o) {
  let i = 0, a;
  for (; i < e.length && !a; ) {
    const c = e[i];
    typeof c == "string" && !rT.has(c) && uo(c).values.length && (a = e[i]), i++;
  }
  if (a && o)
    for (const c of n)
      e[c] = yv(o, a);
}
class iT extends Cd {
  constructor(n, o, i, a, c) {
    super(n, o, i, a, c, !0);
  }
  readKeyframes() {
    const { unresolvedKeyframes: n, element: o, name: i } = this;
    if (!o || !o.current)
      return;
    super.readKeyframes();
    for (let v = 0; v < n.length; v++) {
      let l = n[v];
      if (typeof l == "string" && (l = l.trim(), wd(l))) {
        const p = lv(l, o.current);
        p !== void 0 && (n[v] = p), v === n.length - 1 && (this.finalKeyframe = l);
      }
    }
    if (this.resolveNoneKeyframes(), !uv.has(i) || n.length !== 2)
      return;
    const [a, c] = n, d = Fh(a), f = Fh(c), m = _h(a), y = _h(c);
    if (m !== y && Gn[i]) {
      this.needsMeasurement = !0;
      return;
    }
    if (d !== f)
      if (Rh(d) && Rh(f))
        for (let v = 0; v < n.length; v++) {
          const l = n[v];
          typeof l == "string" && (n[v] = parseFloat(l));
        }
      else Gn[i] && (this.needsMeasurement = !0);
  }
  resolveNoneKeyframes() {
    const { unresolvedKeyframes: n, name: o } = this, i = [];
    for (let a = 0; a < n.length; a++)
      (n[a] === null || X_(n[a])) && i.push(a);
    i.length && oT(n, i, o);
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
    var f;
    const { element: n, name: o, unresolvedKeyframes: i } = this;
    if (!n || !n.current)
      return;
    const a = n.getValue(o);
    a && a.jump(this.measuredOrigin, !1);
    const c = i.length - 1, d = i[c];
    i[c] = Gn[o](n.measureViewportBox(), window.getComputedStyle(n.current)), d !== null && this.finalKeyframe === void 0 && (this.finalKeyframe = d), (f = this.removedTransforms) != null && f.length && this.removedTransforms.forEach(([m, y]) => {
      n.getValue(m).set(y);
    }), this.resolveNoneKeyframes();
  }
}
function gv(e, n, o) {
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
const jc = (e, n) => n && typeof e == "number" ? n.transform(e) : e;
function sa(e) {
  return kg(e) && "offsetHeight" in e && !("ownerSVGElement" in e);
}
const { schedule: Rd } = /* @__PURE__ */ Lg(queueMicrotask, !1), zt = {
  x: !1,
  y: !1
};
function vv() {
  return zt.x || zt.y;
}
function sT(e) {
  return e === "x" || e === "y" ? zt[e] ? null : (zt[e] = !0, () => {
    zt[e] = !1;
  }) : zt.x || zt.y ? null : (zt.x = zt.y = !0, () => {
    zt.x = zt.y = !1;
  });
}
function Sv(e, n) {
  const o = gv(e), i = new AbortController(), a = {
    passive: !0,
    ...n,
    signal: i.signal
  };
  return [o, a, () => i.abort()];
}
function aT(e) {
  return !(e.pointerType === "touch" || vv());
}
function lT(e, n, o = {}) {
  const [i, a, c] = Sv(e, o);
  return i.forEach((d) => {
    let f = !1, m = !1, y;
    const v = () => {
      d.removeEventListener("pointerleave", w);
    }, l = (A) => {
      y && (y(A), y = void 0), v();
    }, p = (A) => {
      f = !1, window.removeEventListener("pointerup", p), window.removeEventListener("pointercancel", p), m && (m = !1, l(A));
    }, S = () => {
      f = !0, window.addEventListener("pointerup", p, a), window.addEventListener("pointercancel", p, a);
    }, w = (A) => {
      if (A.pointerType !== "touch") {
        if (f) {
          m = !0;
          return;
        }
        l(A);
      }
    }, k = (A) => {
      if (!aT(A))
        return;
      m = !1;
      const T = n(d, A);
      typeof T == "function" && (y = T, d.addEventListener("pointerleave", w, a));
    };
    d.addEventListener("pointerenter", k, a), d.addEventListener("pointerdown", S, a);
  }), c;
}
const wv = (e, n) => n ? e === n ? !0 : wv(e, n.parentElement) : !1, Dd = (e) => e.pointerType === "mouse" ? typeof e.button != "number" || e.button <= 0 : e.isPrimary !== !1, uT = /* @__PURE__ */ new Set([
  "BUTTON",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "A"
]);
function cT(e) {
  return uT.has(e.tagName) || e.isContentEditable === !0;
}
const dT = /* @__PURE__ */ new Set(["INPUT", "SELECT", "TEXTAREA"]);
function fT(e) {
  return dT.has(e.tagName) || e.isContentEditable === !0;
}
const aa = /* @__PURE__ */ new WeakSet();
function Lh(e) {
  return (n) => {
    n.key === "Enter" && e(n);
  };
}
function Xu(e, n) {
  e.dispatchEvent(new PointerEvent("pointer" + n, { isPrimary: !0, bubbles: !0 }));
}
const pT = (e, n) => {
  const o = e.currentTarget;
  if (!o)
    return;
  const i = Lh(() => {
    if (aa.has(o))
      return;
    Xu(o, "down");
    const a = Lh(() => {
      Xu(o, "up");
    }), c = () => Xu(o, "cancel");
    o.addEventListener("keyup", a, n), o.addEventListener("blur", c, n);
  });
  o.addEventListener("keydown", i, n), o.addEventListener("blur", () => o.removeEventListener("keydown", i), n);
};
function Vh(e) {
  return Dd(e) && !vv();
}
const Bh = /* @__PURE__ */ new WeakSet();
function mT(e, n, o = {}) {
  const [i, a, c] = Sv(e, o), d = (f) => {
    const m = f.currentTarget;
    if (!Vh(f) || Bh.has(f))
      return;
    aa.add(m), o.stopPropagation && Bh.add(f);
    const y = n(m, f), v = (S, w) => {
      window.removeEventListener("pointerup", l), window.removeEventListener("pointercancel", p), aa.has(m) && aa.delete(m), Vh(S) && typeof y == "function" && y(S, { success: w });
    }, l = (S) => {
      v(S, m === window || m === document || o.useGlobalTarget || wv(m, S.target));
    }, p = (S) => {
      v(S, !1);
    };
    window.addEventListener("pointerup", l, a), window.addEventListener("pointercancel", p, a);
  };
  return i.forEach((f) => {
    (o.useGlobalTarget ? window : f).addEventListener("pointerdown", d, a), sa(f) && (f.addEventListener("focus", (y) => pT(y, a)), !cT(f) && !f.hasAttribute("tabindex") && (f.tabIndex = 0));
  }), c;
}
function Nd(e) {
  return kg(e) && "ownerSVGElement" in e;
}
const la = /* @__PURE__ */ new WeakMap();
let $n;
const xv = (e, n, o) => (i, a) => a && a[0] ? a[0][e + "Size"] : Nd(i) && "getBBox" in i ? i.getBBox()[n] : i[o], hT = /* @__PURE__ */ xv("inline", "width", "offsetWidth"), yT = /* @__PURE__ */ xv("block", "height", "offsetHeight");
function gT({ target: e, borderBoxSize: n }) {
  var o;
  (o = la.get(e)) == null || o.forEach((i) => {
    i(e, {
      get width() {
        return hT(e, n);
      },
      get height() {
        return yT(e, n);
      }
    });
  });
}
function vT(e) {
  e.forEach(gT);
}
function ST() {
  typeof ResizeObserver > "u" || ($n = new ResizeObserver(vT));
}
function wT(e, n) {
  $n || ST();
  const o = gv(e);
  return o.forEach((i) => {
    let a = la.get(i);
    a || (a = /* @__PURE__ */ new Set(), la.set(i, a)), a.add(n), $n == null || $n.observe(i);
  }), () => {
    o.forEach((i) => {
      const a = la.get(i);
      a == null || a.delete(n), a != null && a.size || $n == null || $n.unobserve(i);
    });
  };
}
const ua = /* @__PURE__ */ new Set();
let oo;
function xT() {
  oo = () => {
    const e = {
      get width() {
        return window.innerWidth;
      },
      get height() {
        return window.innerHeight;
      }
    };
    ua.forEach((n) => n(e));
  }, window.addEventListener("resize", oo);
}
function _T(e) {
  return ua.add(e), oo || xT(), () => {
    ua.delete(e), !ua.size && typeof oo == "function" && (window.removeEventListener("resize", oo), oo = void 0);
  };
}
function zh(e, n) {
  return typeof e == "function" ? _T(e) : wT(e, n);
}
function TT(e) {
  return Nd(e) && e.tagName === "svg";
}
const kT = [...mv, Be, Ut], AT = (e) => kT.find(pv(e)), $h = () => ({
  translate: 0,
  scale: 1,
  origin: 0,
  originPoint: 0
}), io = () => ({
  x: $h(),
  y: $h()
}), Uh = () => ({ min: 0, max: 0 }), Ue = () => ({
  x: Uh(),
  y: Uh()
}), CT = /* @__PURE__ */ new WeakMap();
function Oa(e) {
  return e !== null && typeof e == "object" && typeof e.start == "function";
}
function gi(e) {
  return typeof e == "string" || Array.isArray(e);
}
const jd = [
  "animate",
  "whileInView",
  "whileFocus",
  "whileHover",
  "whileTap",
  "whileDrag",
  "exit"
], Id = ["initial", ...jd];
function La(e) {
  return Oa(e.animate) || Id.some((n) => gi(e[n]));
}
function _v(e) {
  return !!(La(e) || e.variants);
}
function PT(e, n, o) {
  for (const i in n) {
    const a = n[i], c = o[i];
    if (Je(a))
      e.addValue(i, a);
    else if (Je(c))
      e.addValue(i, co(a, { owner: e }));
    else if (c !== a)
      if (e.hasValue(i)) {
        const d = e.getValue(i);
        d.liveStyle === !0 ? d.jump(a) : d.hasAnimated || d.set(a);
      } else {
        const d = e.getStaticValue(i);
        e.addValue(i, co(d !== void 0 ? d : a, { owner: e }));
      }
  }
  for (const i in o)
    n[i] === void 0 && e.removeValue(i);
  return n;
}
const Ic = { current: null }, Tv = { current: !1 }, bT = typeof window < "u";
function ET() {
  if (Tv.current = !0, !!bT)
    if (window.matchMedia) {
      const e = window.matchMedia("(prefers-reduced-motion)"), n = () => Ic.current = e.matches;
      e.addEventListener("change", n), n();
    } else
      Ic.current = !1;
}
const Hh = [
  "AnimationStart",
  "AnimationComplete",
  "Update",
  "BeforeLayoutMeasure",
  "LayoutMeasure",
  "LayoutAnimationStart",
  "LayoutAnimationComplete"
];
let ka = {};
function kv(e) {
  ka = e;
}
function MT() {
  return ka;
}
class RT {
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
  constructor({ parent: n, props: o, presenceContext: i, reducedMotionConfig: a, skipAnimations: c, blockInitialAnimation: d, visualState: f }, m = {}) {
    this.current = null, this.children = /* @__PURE__ */ new Set(), this.isVariantNode = !1, this.isControllingVariants = !1, this.shouldReduceMotion = null, this.shouldSkipAnimations = !1, this.values = /* @__PURE__ */ new Map(), this.KeyframeResolver = Cd, this.features = {}, this.valueSubscriptions = /* @__PURE__ */ new Map(), this.prevMotionValues = {}, this.hasBeenMounted = !1, this.events = {}, this.propEventSubscriptions = {}, this.notifyUpdate = () => this.notify("Update", this.latestValues), this.render = () => {
      this.current && (this.triggerBuild(), this.renderInstance(this.current, this.renderState, this.props.style, this.projection));
    }, this.renderScheduledAt = 0, this.scheduleRender = () => {
      const S = st.now();
      this.renderScheduledAt < S && (this.renderScheduledAt = S, ke.render(this.render, !1, !0));
    };
    const { latestValues: y, renderState: v } = f;
    this.latestValues = y, this.baseTarget = { ...y }, this.initialValues = o.initial ? { ...y } : {}, this.renderState = v, this.parent = n, this.props = o, this.presenceContext = i, this.depth = n ? n.depth + 1 : 0, this.reducedMotionConfig = a, this.skipAnimationsConfig = c, this.options = m, this.blockInitialAnimation = !!d, this.isControllingVariants = La(o), this.isVariantNode = _v(o), this.isVariantNode && (this.variantChildren = /* @__PURE__ */ new Set()), this.manuallyAnimateOnMount = !!(n && n.current);
    const { willChange: l, ...p } = this.scrapeMotionValuesFromProps(o, {}, this);
    for (const S in p) {
      const w = p[S];
      y[S] !== void 0 && Je(w) && w.set(y[S]);
    }
  }
  mount(n) {
    var o, i;
    if (this.hasBeenMounted)
      for (const a in this.initialValues)
        (o = this.values.get(a)) == null || o.jump(this.initialValues[a]), this.latestValues[a] = this.initialValues[a];
    this.current = n, CT.set(n, this), this.projection && !this.projection.instance && this.projection.mount(n), this.parent && this.isVariantNode && !this.isControllingVariants && (this.removeFromVariantTree = this.parent.addVariantChild(this)), this.values.forEach((a, c) => this.bindToMotionValue(c, a)), this.reducedMotionConfig === "never" ? this.shouldReduceMotion = !1 : this.reducedMotionConfig === "always" ? this.shouldReduceMotion = !0 : (Tv.current || ET(), this.shouldReduceMotion = Ic.current), this.shouldSkipAnimations = this.skipAnimationsConfig ?? !1, (i = this.parent) == null || i.addChild(this), this.update(this.props, this.presenceContext), this.hasBeenMounted = !0;
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
    if (this.valueSubscriptions.has(n) && this.valueSubscriptions.get(n)(), o.accelerate && iv.has(n) && this.current instanceof HTMLElement) {
      const { factory: d, keyframes: f, times: m, ease: y, duration: v } = o.accelerate, l = new rv({
        element: this.current,
        name: n,
        keyframes: f,
        times: m,
        ease: y,
        duration: /* @__PURE__ */ ht(v)
      }), p = d(l);
      this.valueSubscriptions.set(n, () => {
        p(), l.cancel();
      });
      return;
    }
    const i = ho.has(n);
    i && this.onBindTransform && this.onBindTransform();
    const a = o.on("change", (d) => {
      this.latestValues[n] = d, this.props.onUpdate && ke.preRender(this.notifyUpdate), i && this.projection && (this.projection.isTransformDirty = !0), this.scheduleRender();
    });
    let c;
    typeof window < "u" && window.MotionCheckAppearSync && (c = window.MotionCheckAppearSync(this, n, o)), this.valueSubscriptions.set(n, () => {
      a(), c && c();
    });
  }
  sortNodePosition(n) {
    return !this.current || !this.sortInstanceNodePosition || this.type !== n.type ? 0 : this.sortInstanceNodePosition(this.current, n.current);
  }
  updateFeatures() {
    let n = "animation";
    for (n in ka) {
      const o = ka[n];
      if (!o)
        continue;
      const { isEnabled: i, Feature: a } = o;
      if (!this.features[n] && a && i(this.props) && (this.features[n] = new a(this)), this.features[n]) {
        const c = this.features[n];
        c.isMounted ? c.update() : (c.mount(), c.isMounted = !0);
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
    for (let i = 0; i < Hh.length; i++) {
      const a = Hh[i];
      this.propEventSubscriptions[a] && (this.propEventSubscriptions[a](), delete this.propEventSubscriptions[a]);
      const c = "on" + a, d = n[c];
      d && (this.propEventSubscriptions[a] = this.on(a, d));
    }
    this.prevMotionValues = PT(this, this.scrapeMotionValuesFromProps(n, this.prevProps || {}, this), this.prevMotionValues), this.handleChildMotionValue && this.handleChildMotionValue();
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
    return i === void 0 && o !== void 0 && (i = co(o === null ? void 0 : o, { owner: this }), this.addValue(n, i)), i;
  }
  /**
   * If we're trying to animate to a previously unencountered value,
   * we need to check for it in our state and as a last resort read it
   * directly from the instance (which might have performance implications).
   */
  readValue(n, o) {
    let i = this.latestValues[n] !== void 0 || !this.current ? this.latestValues[n] : this.getBaseTargetFromProps(this.props, n) ?? this.readValueFromInstance(this.current, n, this.options);
    return i != null && (typeof i == "string" && (Tg(i) || Ag(i)) ? i = parseFloat(i) : !AT(i) && Ut.test(o) && (i = yv(n, o)), this.setBaseTarget(n, Je(i) ? i.get() : i)), Je(i) ? i.get() : i;
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
    var c;
    const { initial: o } = this.props;
    let i;
    if (typeof o == "string" || typeof o == "object") {
      const d = Ed(this.props, o, (c = this.presenceContext) == null ? void 0 : c.custom);
      d && (i = d[n]);
    }
    if (o && i !== void 0)
      return i;
    const a = this.getBaseTargetFromProps(this.props, n);
    return a !== void 0 && !Je(a) ? a : this.initialValues[n] !== void 0 && i === void 0 ? void 0 : this.baseTarget[n];
  }
  on(n, o) {
    return this.events[n] || (this.events[n] = new gd()), this.events[n].add(o);
  }
  notify(n, ...o) {
    this.events[n] && this.events[n].notify(...o);
  }
  scheduleRenderMicrotask() {
    Rd.render(this.render);
  }
}
class Av extends RT {
  constructor() {
    super(...arguments), this.KeyframeResolver = iT;
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
class Zn {
  constructor(n) {
    this.isMounted = !1, this.node = n;
  }
  update() {
  }
}
function Cv({ top: e, left: n, right: o, bottom: i }) {
  return {
    x: { min: n, max: o },
    y: { min: e, max: i }
  };
}
function DT({ x: e, y: n }) {
  return { top: n.min, right: e.max, bottom: n.max, left: e.min };
}
function NT(e, n) {
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
function Fc({ scale: e, scaleX: n, scaleY: o }) {
  return !Zu(e) || !Zu(n) || !Zu(o);
}
function fr(e) {
  return Fc(e) || Pv(e) || e.z || e.rotate || e.rotateX || e.rotateY || e.skewX || e.skewY;
}
function Pv(e) {
  return Wh(e.x) || Wh(e.y);
}
function Wh(e) {
  return e && e !== "0%";
}
function Aa(e, n, o) {
  const i = e - o, a = n * i;
  return o + a;
}
function Gh(e, n, o, i, a) {
  return a !== void 0 && (e = Aa(e, a, i)), Aa(e, o, i) + n;
}
function Oc(e, n = 0, o = 1, i, a) {
  e.min = Gh(e.min, n, o, i, a), e.max = Gh(e.max, n, o, i, a);
}
function bv(e, { x: n, y: o }) {
  Oc(e.x, n.translate, n.scale, n.originPoint), Oc(e.y, o.translate, o.scale, o.originPoint);
}
const Kh = 0.999999999999, Yh = 1.0000000000001;
function jT(e, n, o, i = !1) {
  var f;
  const a = o.length;
  if (!a)
    return;
  n.x = n.y = 1;
  let c, d;
  for (let m = 0; m < a; m++) {
    c = o[m], d = c.projectionDelta;
    const { visualElement: y } = c.options;
    y && y.props.style && y.props.style.display === "contents" || (i && c.options.layoutScroll && c.scroll && c !== c.root && (Jt(e.x, -c.scroll.offset.x), Jt(e.y, -c.scroll.offset.y)), d && (n.x *= d.x.scale, n.y *= d.y.scale, bv(e, d)), i && fr(c.latestValues) && ca(e, c.latestValues, (f = c.layout) == null ? void 0 : f.layoutBox));
  }
  n.x < Yh && n.x > Kh && (n.x = 1), n.y < Yh && n.y > Kh && (n.y = 1);
}
function Jt(e, n) {
  e.min += n, e.max += n;
}
function Qh(e, n, o, i, a = 0.5) {
  const c = Te(e.min, e.max, a);
  Oc(e, n, o, c, i);
}
function Xh(e, n) {
  return typeof e == "string" ? parseFloat(e) / 100 * (n.max - n.min) : e;
}
function ca(e, n, o) {
  const i = o ?? e;
  Qh(e.x, Xh(n.x, i.x), n.scaleX, n.scale, n.originX), Qh(e.y, Xh(n.y, i.y), n.scaleY, n.scale, n.originY);
}
function Ev(e, n) {
  return Cv(NT(e.getBoundingClientRect(), n));
}
function IT(e, n, o) {
  const i = Ev(e, o), { scroll: a } = n;
  return a && (Jt(i.x, a.offset.x), Jt(i.y, a.offset.y)), i;
}
const FT = {
  x: "translateX",
  y: "translateY",
  z: "translateZ",
  transformPerspective: "perspective"
}, OT = mo.length;
function LT(e, n, o) {
  let i = "", a = !0;
  for (let d = 0; d < OT; d++) {
    const f = mo[d], m = e[f];
    if (m === void 0)
      continue;
    let y = !0;
    if (typeof m == "number")
      y = m === (f.startsWith("scale") ? 1 : 0);
    else {
      const v = parseFloat(m);
      y = f.startsWith("scale") ? v === 1 : v === 0;
    }
    if (!y || o) {
      const v = jc(m, Ta[f]);
      if (!y) {
        a = !1;
        const l = FT[f] || f;
        i += `${l}(${v}) `;
      }
      o && (n[f] = v);
    }
  }
  const c = e.pathRotation;
  return c && (a = !1, i += `rotate(${jc(c, Ta.pathRotation)}) `), i = i.trim(), o ? i = o(n, a ? "" : i) : a && (i = "none"), i;
}
function Fd(e, n, o) {
  const { style: i, vars: a, transformOrigin: c } = e;
  let d = !1, f = !1;
  for (const m in n) {
    const y = n[m];
    if (ho.has(m)) {
      d = !0;
      continue;
    } else if (Bg(m)) {
      a[m] = y;
      continue;
    } else {
      const v = jc(y, Ta[m]);
      m.startsWith("origin") ? (f = !0, c[m] = v) : i[m] = v;
    }
  }
  if (n.transform || (d || o ? i.transform = LT(n, e.transform, o) : i.transform && (i.transform = "none")), f) {
    const { originX: m = "50%", originY: y = "50%", originZ: v = 0 } = c;
    i.transformOrigin = `${m} ${y} ${v}`;
  }
}
function Mv(e, { style: n, vars: o }, i, a) {
  const c = e.style;
  let d;
  for (d in n)
    c[d] = n[d];
  a == null || a.applyProjectionStyles(c, i);
  for (d in o)
    c.setProperty(d, o[d]);
}
function Zh(e, n) {
  return n.max === n.min ? 0 : e / (n.max - n.min) * 100;
}
const si = {
  correct: (e, n) => {
    if (!n.target)
      return e;
    if (typeof e == "string")
      if (ne.test(e))
        e = parseFloat(e);
      else
        return e;
    const o = Zh(e, n.target.x), i = Zh(e, n.target.y);
    return `${o}% ${i}%`;
  }
}, VT = {
  correct: (e, { treeScale: n, projectionDelta: o }) => {
    const i = e, a = Ut.parse(e);
    if (a.length > 5)
      return i;
    const c = Ut.createTransformer(e), d = typeof a[0] != "number" ? 1 : 0, f = o.x.scale * n.x, m = o.y.scale * n.y;
    a[0 + d] /= f, a[1 + d] /= m;
    const y = Te(f, m, 0.5);
    return typeof a[2 + d] == "number" && (a[2 + d] /= y), typeof a[3 + d] == "number" && (a[3 + d] /= y), c(a);
  }
}, Lc = {
  borderRadius: {
    ...si,
    applyTo: [
      "borderTopLeftRadius",
      "borderTopRightRadius",
      "borderBottomLeftRadius",
      "borderBottomRightRadius"
    ]
  },
  borderTopLeftRadius: si,
  borderTopRightRadius: si,
  borderBottomLeftRadius: si,
  borderBottomRightRadius: si,
  boxShadow: VT
};
function Rv(e, { layout: n, layoutId: o }) {
  return ho.has(e) || e.startsWith("origin") || (n || o !== void 0) && (!!Lc[e] || e === "opacity");
}
function Od(e, n, o) {
  var d;
  const i = e.style, a = n == null ? void 0 : n.style, c = {};
  if (!i)
    return c;
  for (const f in i)
    (Je(i[f]) || a && Je(a[f]) || Rv(f, e) || ((d = o == null ? void 0 : o.getValue(f)) == null ? void 0 : d.liveStyle) !== void 0) && (c[f] = i[f]);
  return c;
}
function BT(e) {
  return window.getComputedStyle(e);
}
class zT extends Av {
  constructor() {
    super(...arguments), this.type = "html", this.renderInstance = Mv;
  }
  readValueFromInstance(n, o) {
    var i;
    if (ho.has(o))
      return (i = this.projection) != null && i.isProjecting ? Tc(o) : s_(n, o);
    {
      const a = BT(n), c = (Bg(o) ? a.getPropertyValue(o) : a[o]) || 0;
      return typeof c == "string" ? c.trim() : c;
    }
  }
  measureInstanceViewportBox(n, { transformPagePoint: o }) {
    return Ev(n, o);
  }
  build(n, o, i) {
    Fd(n, o, i.transformTemplate);
  }
  scrapeMotionValuesFromProps(n, o, i) {
    return Od(n, o, i);
  }
}
const $T = {
  offset: "stroke-dashoffset",
  array: "stroke-dasharray"
}, UT = {
  offset: "strokeDashoffset",
  array: "strokeDasharray"
};
function HT(e, n, o = 1, i = 0, a = !0) {
  e.pathLength = 1;
  const c = a ? $T : UT;
  e[c.offset] = `${-i}`, e[c.array] = `${n} ${o}`;
}
const WT = [
  "offsetDistance",
  "offsetPath",
  "offsetRotate",
  "offsetAnchor"
];
function Dv(e, {
  attrX: n,
  attrY: o,
  attrScale: i,
  pathLength: a,
  pathSpacing: c = 1,
  pathOffset: d = 0,
  // This is object creation, which we try to avoid per-frame.
  ...f
}, m, y, v) {
  if (Fd(e, f, y), m) {
    e.style.viewBox && (e.attrs.viewBox = e.style.viewBox);
    return;
  }
  e.attrs = e.style, e.style = {};
  const { attrs: l, style: p } = e;
  l.transform && (p.transform = l.transform, delete l.transform), (p.transform || l.transformOrigin) && (p.transformOrigin = l.transformOrigin ?? "50% 50%", delete l.transformOrigin), p.transform && (p.transformBox = (v == null ? void 0 : v.transformBox) ?? "fill-box", delete l.transformBox);
  for (const S of WT)
    l[S] !== void 0 && (p[S] = l[S], delete l[S]);
  n !== void 0 && (l.x = n), o !== void 0 && (l.y = o), i !== void 0 && (l.scale = i), a !== void 0 && HT(l, a, c, d, !1);
}
const Nv = /* @__PURE__ */ new Set([
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
]), jv = (e) => typeof e == "string" && e.toLowerCase() === "svg";
function GT(e, n, o, i) {
  Mv(e, n, void 0, i);
  for (const a in n.attrs)
    e.setAttribute(Nv.has(a) ? a : Md(a), n.attrs[a]);
}
function Iv(e, n, o) {
  const i = Od(e, n, o);
  for (const a in e)
    if (Je(e[a]) || Je(n[a])) {
      const c = mo.indexOf(a) !== -1 ? "attr" + a.charAt(0).toUpperCase() + a.substring(1) : a;
      i[c] = e[a];
    }
  return i;
}
class KT extends Av {
  constructor() {
    super(...arguments), this.type = "svg", this.isSVGTag = !1, this.measureInstanceViewportBox = Ue;
  }
  getBaseTargetFromProps(n, o) {
    return n[o];
  }
  readValueFromInstance(n, o) {
    if (ho.has(o)) {
      const i = hv(o);
      return i && i.default || 0;
    }
    return o = Nv.has(o) ? o : Md(o), n.getAttribute(o);
  }
  scrapeMotionValuesFromProps(n, o, i) {
    return Iv(n, o, i);
  }
  build(n, o, i) {
    Dv(n, o, this.isSVGTag, i.transformTemplate, i.style);
  }
  renderInstance(n, o, i, a) {
    GT(n, o, i, a);
  }
  mount(n) {
    this.isSVGTag = jv(n.tagName), super.mount(n);
  }
}
const YT = Id.length;
function Fv(e) {
  if (!e)
    return;
  if (!e.isControllingVariants) {
    const o = e.parent ? Fv(e.parent) || {} : {};
    return e.props.initial !== void 0 && (o.initial = e.props.initial), o;
  }
  const n = {};
  for (let o = 0; o < YT; o++) {
    const i = Id[o], a = e.props[i];
    (gi(a) || a === !1) && (n[i] = a);
  }
  return n;
}
function Ov(e, n) {
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
const QT = [...jd].reverse(), XT = jd.length;
function ZT(e) {
  return (n) => Promise.all(n.map(({ animation: o, options: i }) => Y_(e, o, i)));
}
function JT(e) {
  let n = ZT(e), o = Jh(), i = !0, a = !1;
  const c = (y) => (v, l) => {
    var S;
    const p = wr(e, l, y === "exit" ? (S = e.presenceContext) == null ? void 0 : S.custom : void 0);
    if (p) {
      const { transition: w, transitionEnd: k, ...A } = p;
      v = { ...v, ...A, ...k };
    }
    return v;
  };
  function d(y) {
    n = y(e);
  }
  function f(y) {
    const { props: v } = e, l = Fv(e.parent) || {}, p = [], S = /* @__PURE__ */ new Set();
    let w = {}, k = 1 / 0;
    for (let T = 0; T < XT; T++) {
      const P = QT[T], E = o[P], N = v[P] !== void 0 ? v[P] : l[P], O = gi(N), W = P === y ? E.isActive : null;
      W === !1 && (k = T);
      let G = N === l[P] && N !== v[P] && O;
      if (G && (i || a) && e.manuallyAnimateOnMount && (G = !1), E.protectedKeys = { ...w }, // If it isn't active and hasn't *just* been set as inactive
      !E.isActive && W === null || // If we didn't and don't have any defined prop for this animation type
      !N && !E.prevProp || // Or if the prop doesn't define an animation
      Oa(N) || typeof N == "boolean")
        continue;
      if (P === "exit" && E.isActive && W !== !0) {
        E.prevResolvedValues && (w = {
          ...w,
          ...E.prevResolvedValues
        });
        continue;
      }
      const K = qT(E.prevProp, N);
      let L = K || // If we're making this variant active, we want to always make it active
      P === y && E.isActive && !G && O || // If we removed a higher-priority variant (i is in reverse order)
      T > k && O, X = !1;
      const ae = Array.isArray(N) ? N : [N];
      let q = ae.reduce(c(P), {});
      W === !1 && (q = {});
      const { prevResolvedValues: de = {} } = E, ue = {
        ...de,
        ...q
      }, _e = ($) => {
        L = !0, S.has($) && (X = !0, S.delete($)), E.needsAnimating[$] = !0;
        const Z = e.getValue($);
        Z && (Z.liveStyle = !1);
      };
      for (const $ in ue) {
        const Z = q[$], Y = de[$];
        if (w.hasOwnProperty($))
          continue;
        let D = !1;
        Ec(Z) && Ec(Y) ? D = !Ov(Z, Y) || K : D = Z !== Y, D ? Z != null ? _e($) : S.add($) : Z !== void 0 && S.has($) ? _e($) : E.protectedKeys[$] = !0;
      }
      E.prevProp = N, E.prevResolvedValues = q, E.isActive && (w = { ...w, ...q }), (i || a) && e.blockInitialAnimation && (L = !1);
      const ve = G && K;
      L && (!ve || X) && p.push(...ae.map(($) => {
        const Z = { type: P };
        if (typeof $ == "string" && (i || a) && !ve && e.manuallyAnimateOnMount && e.parent) {
          const { parent: Y } = e, D = wr(Y, $);
          if (Y.enteringChildren && D) {
            const { delayChildren: V } = D.transition || {};
            Z.delay = sv(Y.enteringChildren, e, V);
          }
        }
        return {
          animation: $,
          options: Z
        };
      }));
    }
    if (S.size) {
      const T = {};
      if (typeof v.initial != "boolean") {
        const P = wr(e, Array.isArray(v.initial) ? v.initial[0] : v.initial);
        P && P.transition && (T.transition = P.transition);
      }
      S.forEach((P) => {
        const E = e.getBaseTarget(P), N = e.getValue(P);
        N && (N.liveStyle = !0), T[P] = E ?? null;
      }), p.push({ animation: T });
    }
    let A = !!p.length;
    return i && (v.initial === !1 || v.initial === v.animate) && !e.manuallyAnimateOnMount && (A = !1), i = !1, a = !1, A ? n(p) : Promise.resolve();
  }
  function m(y, v) {
    var p;
    if (o[y].isActive === v)
      return Promise.resolve();
    (p = e.variantChildren) == null || p.forEach((S) => {
      var w;
      return (w = S.animationState) == null ? void 0 : w.setActive(y, v);
    }), o[y].isActive = v;
    const l = f(y);
    for (const S in o)
      o[S].protectedKeys = {};
    return l;
  }
  return {
    animateChanges: f,
    setActive: m,
    setAnimateFunction: d,
    getState: () => o,
    reset: () => {
      o = Jh(), a = !0;
    }
  };
}
function qT(e, n) {
  return typeof n == "string" ? n !== e : Array.isArray(n) ? !Ov(n, e) : !1;
}
function dr(e = !1) {
  return {
    isActive: e,
    protectedKeys: {},
    needsAnimating: {},
    prevResolvedValues: {}
  };
}
function Jh() {
  return {
    animate: dr(!0),
    whileInView: dr(),
    whileHover: dr(),
    whileTap: dr(),
    whileDrag: dr(),
    whileFocus: dr(),
    exit: dr()
  };
}
function Vc(e, n) {
  e.min = n.min, e.max = n.max;
}
function Bt(e, n) {
  Vc(e.x, n.x), Vc(e.y, n.y);
}
function qh(e, n) {
  e.translate = n.translate, e.scale = n.scale, e.originPoint = n.originPoint, e.origin = n.origin;
}
const Lv = 1e-4, ek = 1 - Lv, tk = 1 + Lv, Vv = 0.01, nk = 0 - Vv, rk = 0 + Vv;
function at(e) {
  return e.max - e.min;
}
function ok(e, n, o) {
  return Math.abs(e - n) <= o;
}
function ey(e, n, o, i = 0.5) {
  e.origin = i, e.originPoint = Te(n.min, n.max, e.origin), e.scale = at(o) / at(n), e.translate = Te(o.min, o.max, e.origin) - e.originPoint, (e.scale >= ek && e.scale <= tk || isNaN(e.scale)) && (e.scale = 1), (e.translate >= nk && e.translate <= rk || isNaN(e.translate)) && (e.translate = 0);
}
function di(e, n, o, i) {
  ey(e.x, n.x, o.x, i ? i.originX : void 0), ey(e.y, n.y, o.y, i ? i.originY : void 0);
}
function ty(e, n, o, i = 0) {
  const a = i ? Te(o.min, o.max, i) : o.min;
  e.min = a + n.min, e.max = e.min + at(n);
}
function ik(e, n, o, i) {
  ty(e.x, n.x, o.x, i == null ? void 0 : i.x), ty(e.y, n.y, o.y, i == null ? void 0 : i.y);
}
function ny(e, n, o, i = 0) {
  const a = i ? Te(o.min, o.max, i) : o.min;
  e.min = n.min - a, e.max = e.min + at(n);
}
function Ca(e, n, o, i) {
  ny(e.x, n.x, o.x, i == null ? void 0 : i.x), ny(e.y, n.y, o.y, i == null ? void 0 : i.y);
}
function ry(e, n, o, i, a) {
  return e -= n, e = Aa(e, 1 / o, i), a !== void 0 && (e = Aa(e, 1 / a, i)), e;
}
function sk(e, n = 0, o = 1, i = 0.5, a, c = e, d = e) {
  if (tn.test(n) && (n = parseFloat(n), n = Te(d.min, d.max, n / 100) - d.min), typeof n != "number")
    return;
  let f = Te(c.min, c.max, i);
  e === c && (f -= n), e.min = ry(e.min, n, o, f, a), e.max = ry(e.max, n, o, f, a);
}
function oy(e, n, [o, i, a], c, d) {
  sk(e, n[o], n[i], n[a], n.scale, c, d);
}
const ak = ["x", "scaleX", "originX"], lk = ["y", "scaleY", "originY"];
function iy(e, n, o, i) {
  oy(e.x, n, ak, o ? o.x : void 0, i ? i.x : void 0), oy(e.y, n, lk, o ? o.y : void 0, i ? i.y : void 0);
}
function sy(e) {
  return e.translate === 0 && e.scale === 1;
}
function Bv(e) {
  return sy(e.x) && sy(e.y);
}
function ay(e, n) {
  return e.min === n.min && e.max === n.max;
}
function uk(e, n) {
  return ay(e.x, n.x) && ay(e.y, n.y);
}
function ly(e, n) {
  return Math.round(e.min) === Math.round(n.min) && Math.round(e.max) === Math.round(n.max);
}
function zv(e, n) {
  return ly(e.x, n.x) && ly(e.y, n.y);
}
function uy(e) {
  return at(e.x) / at(e.y);
}
function cy(e, n) {
  return e.translate === n.translate && e.scale === n.scale && e.originPoint === n.originPoint;
}
function Zt(e) {
  return [e("x"), e("y")];
}
function ck(e, n, o) {
  let i = "";
  const a = e.x.translate / n.x, c = e.y.translate / n.y, d = (o == null ? void 0 : o.z) || 0;
  if ((a || c || d) && (i = `translate3d(${a}px, ${c}px, ${d}px) `), (n.x !== 1 || n.y !== 1) && (i += `scale(${1 / n.x}, ${1 / n.y}) `), o) {
    const { transformPerspective: y, rotate: v, pathRotation: l, rotateX: p, rotateY: S, skewX: w, skewY: k } = o;
    y && (i = `perspective(${y}px) ${i}`), v && (i += `rotate(${v}deg) `), l && (i += `rotate(${l}deg) `), p && (i += `rotateX(${p}deg) `), S && (i += `rotateY(${S}deg) `), w && (i += `skewX(${w}deg) `), k && (i += `skewY(${k}deg) `);
  }
  const f = e.x.scale * n.x, m = e.y.scale * n.y;
  return (f !== 1 || m !== 1) && (i += `scale(${f}, ${m})`), i || "none";
}
const $v = [
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius"
], dk = $v.length, dy = (e) => typeof e == "string" ? parseFloat(e) : e, fy = (e) => typeof e == "number" || ne.test(e);
function fk(e, n, o, i, a, c) {
  a ? (e.opacity = Te(0, o.opacity ?? 1, pk(i)), e.opacityExit = Te(n.opacity ?? 1, 0, mk(i))) : c && (e.opacity = Te(n.opacity ?? 1, o.opacity ?? 1, i));
  for (let d = 0; d < dk; d++) {
    const f = $v[d];
    let m = py(n, f), y = py(o, f);
    if (m === void 0 && y === void 0)
      continue;
    m || (m = 0), y || (y = 0), m === 0 || y === 0 || fy(m) === fy(y) ? (e[f] = Math.max(Te(dy(m), dy(y), i), 0), (tn.test(y) || tn.test(m)) && (e[f] += "%")) : e[f] = y;
  }
  (n.rotate || o.rotate) && (e.rotate = Te(n.rotate || 0, o.rotate || 0, i));
}
function py(e, n) {
  return e[n] !== void 0 ? e[n] : e.borderRadius;
}
const pk = /* @__PURE__ */ Uv(0, 0.5, jg), mk = /* @__PURE__ */ Uv(0.5, 0.95, Dt);
function Uv(e, n, o) {
  return (i) => i < e ? 0 : i > n ? 1 : o(/* @__PURE__ */ hi(e, n, i));
}
function hk(e, n, o) {
  const i = Je(e) ? e : co(e);
  return i.start(bd("", i, n, o)), i.animation;
}
function vi(e, n, o, i = { passive: !0 }) {
  return e.addEventListener(n, o, i), () => e.removeEventListener(n, o);
}
const yk = (e, n) => e.depth - n.depth;
class gk {
  constructor() {
    this.children = [], this.isDirty = !1;
  }
  add(n) {
    yd(this.children, n), this.isDirty = !0;
  }
  remove(n) {
    va(this.children, n), this.isDirty = !0;
  }
  forEach(n) {
    this.isDirty && this.children.sort(yk), this.isDirty = !1, this.children.forEach(n);
  }
}
function vk(e, n) {
  const o = st.now(), i = ({ timestamp: a }) => {
    const c = a - o;
    c >= n && (Xn(i), e(c - n));
  };
  return ke.setup(i, !0), () => Xn(i);
}
function da(e) {
  return Je(e) ? e.get() : e;
}
class Sk {
  constructor() {
    this.members = [];
  }
  add(n) {
    yd(this.members, n);
    for (let o = this.members.length - 1; o >= 0; o--) {
      const i = this.members[o];
      if (i === n || i === this.lead || i === this.prevLead)
        continue;
      const a = i.instance;
      (!a || a.isConnected === !1) && !i.snapshot && (va(this.members, i), i.unmount());
    }
    n.scheduleRender();
  }
  remove(n) {
    if (va(this.members, n), n === this.prevLead && (this.prevLead = void 0), n === this.lead) {
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
      const { layoutDependency: c } = i.options, { layoutDependency: d } = n.options;
      (c === void 0 || c !== d) && (n.resumeFrom = i, o && (i.preserveOpacity = !0), i.snapshot && (n.snapshot = i.snapshot, n.snapshot.latestValues = i.animationValues || i.latestValues), (a = n.root) != null && a.isUpdating && (n.isLayoutDirty = !0)), n.options.crossfade === !1 && i.hide();
    }
  }
  exitAnimationComplete() {
    this.members.forEach((n) => {
      var o, i, a, c, d;
      (i = (o = n.options).onExitComplete) == null || i.call(o), (d = (a = n.resumingFrom) == null ? void 0 : (c = a.options).onExitComplete) == null || d.call(c);
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
const fa = {
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
}, Ju = ["", "X", "Y", "Z"], wk = 1e3;
let xk = 0;
function qu(e, n, o, i) {
  const { latestValues: a } = n;
  a[e] && (o[e] = a[e], n.setStaticValue(e, 0), i && (i[e] = 0));
}
function Hv(e) {
  if (e.hasCheckedOptimisedAppear = !0, e.root === e)
    return;
  const { visualElement: n } = e.options;
  if (!n)
    return;
  const o = dv(n);
  if (window.MotionHasOptimisedAnimation(o, "transform")) {
    const { layout: a, layoutId: c } = e.options;
    window.MotionCancelOptimisedAnimation(o, "transform", ke, !(a || c));
  }
  const { parent: i } = e;
  i && !i.hasCheckedOptimisedAppear && Hv(i);
}
function Wv({ attachResizeListener: e, defaultParent: n, measureScroll: o, checkIsScrollRoot: i, resetTransform: a }) {
  return class {
    constructor(d = {}, f = n == null ? void 0 : n()) {
      this.id = xk++, this.animationId = 0, this.animationCommitId = 0, this.children = /* @__PURE__ */ new Set(), this.options = {}, this.isTreeAnimating = !1, this.isAnimationBlocked = !1, this.isLayoutDirty = !1, this.isProjectionDirty = !1, this.isSharedProjectionDirty = !1, this.isTransformDirty = !1, this.updateManuallyBlocked = !1, this.updateBlockedByResize = !1, this.isUpdating = !1, this.isSVG = !1, this.needsReset = !1, this.shouldResetTransform = !1, this.hasCheckedOptimisedAppear = !1, this.treeScale = { x: 1, y: 1 }, this.eventHandlers = /* @__PURE__ */ new Map(), this.hasTreeAnimated = !1, this.layoutVersion = 0, this.updateScheduled = !1, this.scheduleUpdate = () => this.update(), this.projectionUpdateScheduled = !1, this.checkUpdateFailed = () => {
        this.isUpdating && (this.isUpdating = !1, this.clearAllSnapshots());
      }, this.updateProjection = () => {
        this.projectionUpdateScheduled = !1, this.nodes.forEach(kk), this.nodes.forEach(Mk), this.nodes.forEach(Rk), this.nodes.forEach(Ak);
      }, this.resolvedRelativeTargetAt = 0, this.linkedParentVersion = 0, this.hasProjected = !1, this.isVisible = !0, this.animationProgress = 0, this.sharedNodes = /* @__PURE__ */ new Map(), this.latestValues = d, this.root = f ? f.root || f : this, this.path = f ? [...f.path, f] : [], this.parent = f, this.depth = f ? f.depth + 1 : 0;
      for (let m = 0; m < this.path.length; m++)
        this.path[m].shouldResetTransform = !0;
      this.root === this && (this.nodes = new gk());
    }
    addEventListener(d, f) {
      return this.eventHandlers.has(d) || this.eventHandlers.set(d, new gd()), this.eventHandlers.get(d).add(f);
    }
    notifyListeners(d, ...f) {
      const m = this.eventHandlers.get(d);
      m && m.notify(...f);
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
      this.isSVG = Nd(d) && !TT(d), this.instance = d;
      const { layoutId: f, layout: m, visualElement: y } = this.options;
      if (y && !y.current && y.mount(d), this.root.nodes.add(this), this.parent && this.parent.children.add(this), this.root.hasTreeAnimated && (m || f) && (this.isLayoutDirty = !0), e) {
        let v, l = 0;
        const p = () => this.root.updateBlockedByResize = !1;
        ke.read(() => {
          l = window.innerWidth;
        }), e(d, () => {
          const S = window.innerWidth;
          S !== l && (l = S, this.root.updateBlockedByResize = !0, v && v(), v = vk(p, 250), fa.hasAnimatedSinceResize && (fa.hasAnimatedSinceResize = !1, this.nodes.forEach(yy)));
        });
      }
      f && this.root.registerSharedNode(f, this), this.options.animate !== !1 && y && (f || m) && this.addEventListener("didUpdate", ({ delta: v, hasLayoutChanged: l, hasRelativeLayoutChanged: p, layout: S }) => {
        if (this.isTreeAnimationBlocked()) {
          this.target = void 0, this.relativeTarget = void 0;
          return;
        }
        const w = this.options.transition || y.getDefaultTransition() || Fk, { onLayoutAnimationStart: k, onLayoutAnimationComplete: A } = y.getProps(), T = !this.targetLayout || !zv(this.targetLayout, S), P = !l && p;
        if (this.options.layoutRoot || this.resumeFrom || P || l && (T || !this.currentAnimation)) {
          this.resumeFrom && (this.resumingFrom = this.resumeFrom, this.resumingFrom.resumingFrom = void 0);
          const E = {
            ...Pd(w, "layout"),
            onPlay: k,
            onComplete: A
          };
          (y.shouldReduceMotion || this.options.layoutRoot) && (E.delay = 0, E.type = !1), this.startAnimation(E), this.setAnimationOrigin(v, P, E.path);
        } else
          l || yy(this), this.isLead() && this.options.onExitComplete && this.options.onExitComplete();
        this.targetLayout = S;
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
      this.isUpdateBlocked() || (this.isUpdating = !0, this.nodes && this.nodes.forEach(Dk), this.animationId++);
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
      if (window.MotionCancelOptimisedAnimation && !this.hasCheckedOptimisedAppear && Hv(this), !this.root.isUpdating && this.root.startUpdate(), this.isLayoutDirty)
        return;
      this.isLayoutDirty = !0;
      for (let v = 0; v < this.path.length; v++) {
        const l = this.path[v];
        l.shouldResetTransform = !0, (typeof l.latestValues.x == "string" || typeof l.latestValues.y == "string") && (l.isLayoutDirty = !0), l.updateScroll("snapshot"), l.options.layoutRoot && l.willUpdate(!1);
      }
      const { layoutId: f, layout: m } = this.options;
      if (f === void 0 && !m)
        return;
      const y = this.getTransformTemplate();
      this.prevTransformTemplateValue = y ? y(this.latestValues, "") : void 0, this.updateSnapshot(), d && this.notifyListeners("willUpdate");
    }
    update() {
      if (this.updateScheduled = !1, this.isUpdateBlocked()) {
        const m = this.updateBlockedByResize;
        this.unblockUpdate(), this.updateBlockedByResize = !1, this.clearAllSnapshots(), m && this.nodes.forEach(Pk), this.nodes.forEach(my);
        return;
      }
      if (this.animationId <= this.animationCommitId) {
        this.nodes.forEach(hy);
        return;
      }
      this.animationCommitId = this.animationId, this.isUpdating ? (this.isUpdating = !1, this.nodes.forEach(bk), this.nodes.forEach(Ek), this.nodes.forEach(_k), this.nodes.forEach(Tk)) : this.nodes.forEach(hy), this.clearAllSnapshots();
      const f = st.now();
      Ze.delta = nn(0, 1e3 / 60, f - Ze.timestamp), Ze.timestamp = f, Ze.isProcessing = !0, Hu.update.process(Ze), Hu.preRender.process(Ze), Hu.render.process(Ze), Ze.isProcessing = !1;
    }
    didUpdate() {
      this.updateScheduled || (this.updateScheduled = !0, Rd.read(this.scheduleUpdate));
    }
    clearAllSnapshots() {
      this.nodes.forEach(Ck), this.sharedNodes.forEach(Nk);
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
      this.snapshot || !this.instance || (this.snapshot = this.measure(), this.snapshot && !at(this.snapshot.measuredBox.x) && !at(this.snapshot.measuredBox.y) && (this.snapshot = void 0));
    }
    updateLayout() {
      if (!this.instance || (this.updateScroll(), !(this.options.alwaysMeasureLayout && this.isLead()) && !this.isLayoutDirty))
        return;
      if (this.resumeFrom && !this.resumeFrom.instance)
        for (let m = 0; m < this.path.length; m++)
          this.path[m].updateScroll();
      const d = this.layout;
      this.layout = this.measure(!1), this.layoutVersion++, this.layoutCorrected || (this.layoutCorrected = Ue()), this.isLayoutDirty = !1, this.projectionDelta = void 0, this.notifyListeners("measure", this.layout.layoutBox);
      const { visualElement: f } = this.options;
      f && f.notify("LayoutMeasure", this.layout.layoutBox, d ? d.layoutBox : void 0);
    }
    updateScroll(d = "measure") {
      let f = !!(this.options.layoutScroll && this.instance);
      if (this.scroll && this.scroll.animationId === this.root.animationId && this.scroll.phase === d && (f = !1), f && this.instance) {
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
      const d = this.isLayoutDirty || this.shouldResetTransform || this.options.alwaysMeasureLayout, f = this.projectionDelta && !Bv(this.projectionDelta), m = this.getTransformTemplate(), y = m ? m(this.latestValues, "") : void 0, v = y !== this.prevTransformTemplateValue;
      d && this.instance && (f || fr(this.latestValues) || v) && (a(this.instance, y), this.shouldResetTransform = !1, this.scheduleRender());
    }
    measure(d = !0) {
      const f = this.measurePageBox();
      let m = this.removeElementScroll(f);
      return d && (m = this.removeTransform(m)), Ok(m), {
        animationId: this.root.animationId,
        measuredBox: f,
        layoutBox: m,
        latestValues: {},
        source: this.id
      };
    }
    measurePageBox() {
      var y;
      const { visualElement: d } = this.options;
      if (!d)
        return Ue();
      const f = d.measureViewportBox();
      if (!(((y = this.scroll) == null ? void 0 : y.wasRoot) || this.path.some(Lk))) {
        const { scroll: v } = this.root;
        v && (Jt(f.x, v.offset.x), Jt(f.y, v.offset.y));
      }
      return f;
    }
    removeElementScroll(d) {
      var m;
      const f = Ue();
      if (Bt(f, d), (m = this.scroll) != null && m.wasRoot)
        return f;
      for (let y = 0; y < this.path.length; y++) {
        const v = this.path[y], { scroll: l, options: p } = v;
        v !== this.root && l && p.layoutScroll && (l.wasRoot && Bt(f, d), Jt(f.x, l.offset.x), Jt(f.y, l.offset.y));
      }
      return f;
    }
    applyTransform(d, f = !1, m) {
      var v, l;
      const y = m || Ue();
      Bt(y, d);
      for (let p = 0; p < this.path.length; p++) {
        const S = this.path[p];
        !f && S.options.layoutScroll && S.scroll && S !== S.root && (Jt(y.x, -S.scroll.offset.x), Jt(y.y, -S.scroll.offset.y)), fr(S.latestValues) && ca(y, S.latestValues, (v = S.layout) == null ? void 0 : v.layoutBox);
      }
      return fr(this.latestValues) && ca(y, this.latestValues, (l = this.layout) == null ? void 0 : l.layoutBox), y;
    }
    removeTransform(d) {
      var m;
      const f = Ue();
      Bt(f, d);
      for (let y = 0; y < this.path.length; y++) {
        const v = this.path[y];
        if (!fr(v.latestValues))
          continue;
        let l;
        v.instance && (Fc(v.latestValues) && v.updateSnapshot(), l = Ue(), Bt(l, v.measurePageBox())), iy(f, v.latestValues, (m = v.snapshot) == null ? void 0 : m.layoutBox, l);
      }
      return fr(this.latestValues) && iy(f, this.latestValues), f;
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
      this.relativeParent && this.relativeParent.resolvedRelativeTargetAt !== Ze.timestamp && this.relativeParent.resolveTargetDelta(!0);
    }
    resolveTargetDelta(d = !1) {
      var S;
      const f = this.getLead();
      this.isProjectionDirty || (this.isProjectionDirty = f.isProjectionDirty), this.isTransformDirty || (this.isTransformDirty = f.isTransformDirty), this.isSharedProjectionDirty || (this.isSharedProjectionDirty = f.isSharedProjectionDirty);
      const m = !!this.resumingFrom || this !== f;
      if (!(d || m && this.isSharedProjectionDirty || this.isProjectionDirty || (S = this.parent) != null && S.isProjectionDirty || this.attemptToResolveRelativeTarget || this.root.updateBlockedByResize))
        return;
      const { layout: v, layoutId: l } = this.options;
      if (!this.layout || !(v || l))
        return;
      this.resolvedRelativeTargetAt = Ze.timestamp;
      const p = this.getClosestProjectingParent();
      p && this.linkedParentVersion !== p.layoutVersion && !p.options.layoutRoot && this.removeRelativeTarget(), !this.targetDelta && !this.relativeTarget && (this.options.layoutAnchor !== !1 && p && p.layout ? this.createRelativeTarget(p, this.layout.layoutBox, p.layout.layoutBox) : this.removeRelativeTarget()), !(!this.relativeTarget && !this.targetDelta) && (this.target || (this.target = Ue(), this.targetWithTransforms = Ue()), this.relativeTarget && this.relativeTargetOrigin && this.relativeParent && this.relativeParent.target ? (this.forceRelativeParentToResolveTarget(), ik(this.target, this.relativeTarget, this.relativeParent.target, this.options.layoutAnchor || void 0)) : this.targetDelta ? (this.resumingFrom ? this.applyTransform(this.layout.layoutBox, !1, this.target) : Bt(this.target, this.layout.layoutBox), bv(this.target, this.targetDelta)) : Bt(this.target, this.layout.layoutBox), this.attemptToResolveRelativeTarget && (this.attemptToResolveRelativeTarget = !1, this.options.layoutAnchor !== !1 && p && !!p.resumingFrom == !!this.resumingFrom && !p.options.layoutScroll && p.target && this.animationProgress !== 1 ? this.createRelativeTarget(p, this.target, p.target) : this.relativeParent = this.relativeTarget = void 0));
    }
    getClosestProjectingParent() {
      if (!(!this.parent || Fc(this.parent.latestValues) || Pv(this.parent.latestValues)))
        return this.parent.isProjecting() ? this.parent : this.parent.getClosestProjectingParent();
    }
    isProjecting() {
      return !!((this.relativeTarget || this.targetDelta || this.options.layoutRoot) && this.layout);
    }
    createRelativeTarget(d, f, m) {
      this.relativeParent = d, this.linkedParentVersion = d.layoutVersion, this.forceRelativeParentToResolveTarget(), this.relativeTarget = Ue(), this.relativeTargetOrigin = Ue(), Ca(this.relativeTargetOrigin, f, m, this.options.layoutAnchor || void 0), Bt(this.relativeTarget, this.relativeTargetOrigin);
    }
    removeRelativeTarget() {
      this.relativeParent = this.relativeTarget = void 0;
    }
    calcProjection() {
      var w;
      const d = this.getLead(), f = !!this.resumingFrom || this !== d;
      let m = !0;
      if ((this.isProjectionDirty || (w = this.parent) != null && w.isProjectionDirty) && (m = !1), f && (this.isSharedProjectionDirty || this.isTransformDirty) && (m = !1), this.resolvedRelativeTargetAt === Ze.timestamp && (m = !1), m)
        return;
      const { layout: y, layoutId: v } = this.options;
      if (this.isTreeAnimating = !!(this.parent && this.parent.isTreeAnimating || this.currentAnimation || this.pendingAnimation), this.isTreeAnimating || (this.targetDelta = this.relativeTarget = void 0), !this.layout || !(y || v))
        return;
      Bt(this.layoutCorrected, this.layout.layoutBox);
      const l = this.treeScale.x, p = this.treeScale.y;
      jT(this.layoutCorrected, this.treeScale, this.path, f), d.layout && !d.target && (this.treeScale.x !== 1 || this.treeScale.y !== 1) && (d.target = d.layout.layoutBox, d.targetWithTransforms = Ue());
      const { target: S } = d;
      if (!S) {
        this.prevProjectionDelta && (this.createProjectionDeltas(), this.scheduleRender());
        return;
      }
      !this.projectionDelta || !this.prevProjectionDelta ? this.createProjectionDeltas() : (qh(this.prevProjectionDelta.x, this.projectionDelta.x), qh(this.prevProjectionDelta.y, this.projectionDelta.y)), di(this.projectionDelta, this.layoutCorrected, S, this.latestValues), (this.treeScale.x !== l || this.treeScale.y !== p || !cy(this.projectionDelta.x, this.prevProjectionDelta.x) || !cy(this.projectionDelta.y, this.prevProjectionDelta.y)) && (this.hasProjected = !0, this.scheduleRender(), this.notifyListeners("projectionUpdate", S));
    }
    hide() {
      this.isVisible = !1;
    }
    show() {
      this.isVisible = !0;
    }
    scheduleRender(d = !0) {
      var f;
      if ((f = this.options.visualElement) == null || f.scheduleRender(), d) {
        const m = this.getStack();
        m && m.scheduleRender();
      }
      this.resumingFrom && !this.resumingFrom.instance && (this.resumingFrom = void 0);
    }
    createProjectionDeltas() {
      this.prevProjectionDelta = io(), this.projectionDelta = io(), this.projectionDeltaWithTransform = io();
    }
    setAnimationOrigin(d, f = !1, m) {
      const y = this.snapshot, v = y ? y.latestValues : {}, l = { ...this.latestValues }, p = io();
      (!this.relativeParent || !this.relativeParent.options.layoutRoot) && (this.relativeTarget = this.relativeTargetOrigin = void 0), this.attemptToResolveRelativeTarget = !f;
      const S = Ue(), w = y ? y.source : void 0, k = this.layout ? this.layout.source : void 0, A = w !== k, T = this.getStack(), P = !T || T.members.length <= 1, E = !!(A && !P && this.options.crossfade === !0 && !this.path.some(Ik));
      this.animationProgress = 0;
      let N;
      const O = m == null ? void 0 : m.interpolateProjection(d);
      this.mixTargetDelta = (W) => {
        const G = W / 1e3, K = O == null ? void 0 : O(G);
        K ? (p.x.translate = K.x, p.x.scale = Te(d.x.scale, 1, G), p.x.origin = d.x.origin, p.x.originPoint = d.x.originPoint, p.y.translate = K.y, p.y.scale = Te(d.y.scale, 1, G), p.y.origin = d.y.origin, p.y.originPoint = d.y.originPoint) : (gy(p.x, d.x, G), gy(p.y, d.y, G)), this.setTargetDelta(p), this.relativeTarget && this.relativeTargetOrigin && this.layout && this.relativeParent && this.relativeParent.layout && (Ca(S, this.layout.layoutBox, this.relativeParent.layout.layoutBox, this.options.layoutAnchor || void 0), jk(this.relativeTarget, this.relativeTargetOrigin, S, G), N && uk(this.relativeTarget, N) && (this.isProjectionDirty = !1), N || (N = Ue()), Bt(N, this.relativeTarget)), A && (this.animationValues = l, fk(l, v, this.latestValues, G, E, P)), K && K.rotate !== void 0 && (this.animationValues || (this.animationValues = l), this.animationValues.pathRotation = K.rotate), this.root.scheduleUpdateProjection(), this.scheduleRender(), this.animationProgress = G;
      }, this.mixTargetDelta(this.options.layoutRoot ? 1e3 : 0);
    }
    startAnimation(d) {
      var f, m, y;
      this.notifyListeners("animationStart"), (f = this.currentAnimation) == null || f.stop(), (y = (m = this.resumingFrom) == null ? void 0 : m.currentAnimation) == null || y.stop(), this.pendingAnimation && (Xn(this.pendingAnimation), this.pendingAnimation = void 0), this.pendingAnimation = ke.update(() => {
        fa.hasAnimatedSinceResize = !0, this.motionValue || (this.motionValue = co(0)), this.motionValue.jump(0, !1), this.currentAnimation = hk(this.motionValue, [0, 1e3], {
          ...d,
          velocity: 0,
          isSync: !0,
          onUpdate: (v) => {
            this.mixTargetDelta(v), d.onUpdate && d.onUpdate(v);
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
      this.currentAnimation && (this.mixTargetDelta && this.mixTargetDelta(wk), this.currentAnimation.stop()), this.completeAnimation();
    }
    applyTransformsToTarget() {
      const d = this.getLead();
      let { targetWithTransforms: f, target: m, layout: y, latestValues: v } = d;
      if (!(!f || !m || !y)) {
        if (this !== d && this.layout && y && Gv(this.options.animationType, this.layout.layoutBox, y.layoutBox)) {
          m = this.target || Ue();
          const l = at(this.layout.layoutBox.x);
          m.x.min = d.target.x.min, m.x.max = m.x.min + l;
          const p = at(this.layout.layoutBox.y);
          m.y.min = d.target.y.min, m.y.max = m.y.min + p;
        }
        Bt(f, m), ca(f, v), di(this.projectionDeltaWithTransform, this.layoutCorrected, f, v);
      }
    }
    registerSharedNode(d, f) {
      this.sharedNodes.has(d) || this.sharedNodes.set(d, new Sk()), this.sharedNodes.get(d).add(f);
      const y = f.options.initialPromotionConfig;
      f.promote({
        transition: y ? y.transition : void 0,
        preserveFollowOpacity: y && y.shouldPreserveFollowOpacity ? y.shouldPreserveFollowOpacity(f) : void 0
      });
    }
    isLead() {
      const d = this.getStack();
      return d ? d.lead === this : !0;
    }
    getLead() {
      var f;
      const { layoutId: d } = this.options;
      return d ? ((f = this.getStack()) == null ? void 0 : f.lead) || this : this;
    }
    getPrevLead() {
      var f;
      const { layoutId: d } = this.options;
      return d ? (f = this.getStack()) == null ? void 0 : f.prevLead : void 0;
    }
    getStack() {
      const { layoutId: d } = this.options;
      if (d)
        return this.root.sharedNodes.get(d);
    }
    promote({ needsReset: d, transition: f, preserveFollowOpacity: m } = {}) {
      const y = this.getStack();
      y && y.promote(this, m), d && (this.projectionDelta = void 0, this.needsReset = !0), f && this.setOptions({ transition: f });
    }
    relegate() {
      const d = this.getStack();
      return d ? d.relegate(this) : !1;
    }
    resetSkewAndRotation() {
      const { visualElement: d } = this.options;
      if (!d)
        return;
      let f = !1;
      const { latestValues: m } = d;
      if ((m.z || m.rotate || m.rotateX || m.rotateY || m.rotateZ || m.skewX || m.skewY) && (f = !0), !f)
        return;
      const y = {};
      m.z && qu("z", d, y, this.animationValues);
      for (let v = 0; v < Ju.length; v++)
        qu(`rotate${Ju[v]}`, d, y, this.animationValues), qu(`skew${Ju[v]}`, d, y, this.animationValues);
      d.render();
      for (const v in y)
        d.setStaticValue(v, y[v]), this.animationValues && (this.animationValues[v] = y[v]);
      d.scheduleRender();
    }
    applyProjectionStyles(d, f) {
      if (!this.instance || this.isSVG)
        return;
      if (!this.isVisible) {
        d.visibility = "hidden";
        return;
      }
      const m = this.getTransformTemplate();
      if (this.needsReset) {
        this.needsReset = !1, d.visibility = "", d.opacity = "", d.pointerEvents = da(f == null ? void 0 : f.pointerEvents) || "", d.transform = m ? m(this.latestValues, "") : "none";
        return;
      }
      const y = this.getLead();
      if (!this.projectionDelta || !this.layout || !y.target) {
        this.options.layoutId && (d.opacity = this.latestValues.opacity !== void 0 ? this.latestValues.opacity : 1, d.pointerEvents = da(f == null ? void 0 : f.pointerEvents) || ""), this.hasProjected && !fr(this.latestValues) && (d.transform = m ? m({}, "") : "none", this.hasProjected = !1);
        return;
      }
      d.visibility = "";
      const v = y.animationValues || y.latestValues;
      this.applyTransformsToTarget();
      let l = ck(this.projectionDeltaWithTransform, this.treeScale, v);
      m && (l = m(v, l)), d.transform = l;
      const { x: p, y: S } = this.projectionDelta;
      d.transformOrigin = `${p.origin * 100}% ${S.origin * 100}% 0`, y.animationValues ? d.opacity = y === this ? v.opacity ?? this.latestValues.opacity ?? 1 : this.preserveOpacity ? this.latestValues.opacity : v.opacityExit : d.opacity = y === this ? v.opacity !== void 0 ? v.opacity : "" : v.opacityExit !== void 0 ? v.opacityExit : 0;
      for (const w in Lc) {
        if (v[w] === void 0)
          continue;
        const { correct: k, applyTo: A, isCSSVariable: T } = Lc[w], P = l === "none" ? v[w] : k(v[w], y);
        if (A) {
          const E = A.length;
          for (let N = 0; N < E; N++)
            d[A[N]] = P;
        } else
          T ? this.options.visualElement.renderState.vars[w] = P : d[w] = P;
      }
      this.options.layoutId && (d.pointerEvents = y === this ? da(f == null ? void 0 : f.pointerEvents) || "" : "none");
    }
    clearSnapshot() {
      this.resumeFrom = this.snapshot = void 0;
    }
    // Only run on root
    resetTree() {
      this.root.nodes.forEach((d) => {
        var f;
        return (f = d.currentAnimation) == null ? void 0 : f.stop();
      }), this.root.nodes.forEach(my), this.root.sharedNodes.clear();
    }
  };
}
function _k(e) {
  e.updateLayout();
}
function Tk(e) {
  var o;
  const n = ((o = e.resumeFrom) == null ? void 0 : o.snapshot) || e.snapshot;
  if (e.isLead() && e.layout && n && e.hasListeners("didUpdate")) {
    const { layoutBox: i, measuredBox: a } = e.layout, { animationType: c } = e.options, d = n.source !== e.layout.source;
    if (c === "size")
      Zt((l) => {
        const p = d ? n.measuredBox[l] : n.layoutBox[l], S = at(p);
        p.min = i[l].min, p.max = p.min + S;
      });
    else if (c === "x" || c === "y") {
      const l = c === "x" ? "y" : "x";
      Vc(d ? n.measuredBox[l] : n.layoutBox[l], i[l]);
    } else Gv(c, n.layoutBox, i) && Zt((l) => {
      const p = d ? n.measuredBox[l] : n.layoutBox[l], S = at(i[l]);
      p.max = p.min + S, e.relativeTarget && !e.currentAnimation && (e.isProjectionDirty = !0, e.relativeTarget[l].max = e.relativeTarget[l].min + S);
    });
    const f = io();
    di(f, i, n.layoutBox);
    const m = io();
    d ? di(m, e.applyTransform(a, !0), n.measuredBox) : di(m, i, n.layoutBox);
    const y = !Bv(f);
    let v = !1;
    if (!e.resumeFrom) {
      const l = e.getClosestProjectingParent();
      if (l && !l.resumeFrom) {
        const { snapshot: p, layout: S } = l;
        if (p && S) {
          const w = e.options.layoutAnchor || void 0, k = Ue();
          Ca(k, n.layoutBox, p.layoutBox, w);
          const A = Ue();
          Ca(A, i, S.layoutBox, w), zv(k, A) || (v = !0), l.options.layoutRoot && (e.relativeTarget = A, e.relativeTargetOrigin = k, e.relativeParent = l);
        }
      }
    }
    e.notifyListeners("didUpdate", {
      layout: i,
      snapshot: n,
      delta: m,
      layoutDelta: f,
      hasLayoutChanged: y,
      hasRelativeLayoutChanged: v
    });
  } else if (e.isLead()) {
    const { onExitComplete: i } = e.options;
    i && i();
  }
  e.options.transition = void 0;
}
function kk(e) {
  e.parent && (e.isProjecting() || (e.isProjectionDirty = e.parent.isProjectionDirty), e.isSharedProjectionDirty || (e.isSharedProjectionDirty = !!(e.isProjectionDirty || e.parent.isProjectionDirty || e.parent.isSharedProjectionDirty)), e.isTransformDirty || (e.isTransformDirty = e.parent.isTransformDirty));
}
function Ak(e) {
  e.isProjectionDirty = e.isSharedProjectionDirty = e.isTransformDirty = !1;
}
function Ck(e) {
  e.clearSnapshot();
}
function my(e) {
  e.clearMeasurements();
}
function Pk(e) {
  e.isLayoutDirty = !0, e.updateLayout();
}
function hy(e) {
  e.isLayoutDirty = !1;
}
function bk(e) {
  e.isAnimationBlocked && e.layout && !e.isLayoutDirty && (e.snapshot = e.layout, e.isLayoutDirty = !0);
}
function Ek(e) {
  const { visualElement: n } = e.options;
  n && n.getProps().onBeforeLayoutMeasure && n.notify("BeforeLayoutMeasure"), e.resetTransform();
}
function yy(e) {
  e.finishAnimation(), e.targetDelta = e.relativeTarget = e.target = void 0, e.isProjectionDirty = !0;
}
function Mk(e) {
  e.resolveTargetDelta();
}
function Rk(e) {
  e.calcProjection();
}
function Dk(e) {
  e.resetSkewAndRotation();
}
function Nk(e) {
  e.removeLeadSnapshot();
}
function gy(e, n, o) {
  e.translate = Te(n.translate, 0, o), e.scale = Te(n.scale, 1, o), e.origin = n.origin, e.originPoint = n.originPoint;
}
function vy(e, n, o, i) {
  e.min = Te(n.min, o.min, i), e.max = Te(n.max, o.max, i);
}
function jk(e, n, o, i) {
  vy(e.x, n.x, o.x, i), vy(e.y, n.y, o.y, i);
}
function Ik(e) {
  return e.animationValues && e.animationValues.opacityExit !== void 0;
}
const Fk = {
  duration: 0.45,
  ease: [0.4, 0, 0.1, 1]
}, Sy = (e) => typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().includes(e), wy = Sy("applewebkit/") && !Sy("chrome/") ? Math.round : Dt;
function xy(e) {
  e.min = wy(e.min), e.max = wy(e.max);
}
function Ok(e) {
  xy(e.x), xy(e.y);
}
function Gv(e, n, o) {
  return e === "position" || e === "preserve-aspect" && !ok(uy(n), uy(o), 0.2);
}
function Lk(e) {
  var n;
  return e !== e.root && ((n = e.scroll) == null ? void 0 : n.wasRoot);
}
const Vk = Wv({
  attachResizeListener: (e, n) => vi(e, "resize", n),
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
}, Kv = Wv({
  measureScroll: (e) => ({
    x: e.scrollLeft,
    y: e.scrollTop
  }),
  defaultParent: () => {
    if (!ec.current) {
      const e = new Vk({});
      e.mount(window), e.setOptions({ layoutScroll: !0 }), ec.current = e;
    }
    return ec.current;
  },
  resetTransform: (e, n) => {
    e.style.transform = n !== void 0 ? n : "none";
  },
  checkIsScrollRoot: (e) => window.getComputedStyle(e).position === "fixed"
}), Ld = C.createContext({
  transformPagePoint: (e) => e,
  isStatic: !1,
  reducedMotion: "never"
});
function _y(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function Bk(...e) {
  return (n) => {
    let o = !1;
    const i = e.map((a) => {
      const c = _y(a, n);
      return !o && typeof c == "function" && (o = !0), c;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const c = i[a];
          typeof c == "function" ? c() : _y(e[a], null);
        }
      };
  };
}
function zk(...e) {
  return C.useCallback(Bk(...e), e);
}
class $k extends C.Component {
  getSnapshotBeforeUpdate(n) {
    const o = this.props.childRef.current;
    if (sa(o) && n.isPresent && !this.props.isPresent && this.props.pop !== !1) {
      const i = o.offsetParent, a = sa(i) && i.offsetWidth || 0, c = sa(i) && i.offsetHeight || 0, d = getComputedStyle(o), f = this.props.sizeRef.current;
      f.height = parseFloat(d.height), f.width = parseFloat(d.width), f.top = o.offsetTop, f.left = o.offsetLeft, f.right = a - f.width - f.left, f.bottom = c - f.height - f.top, f.direction = d.direction;
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
function Uk({ children: e, isPresent: n, anchorX: o, anchorY: i, root: a, pop: c }) {
  var p;
  const d = C.useId(), f = C.useRef(null), m = C.useRef({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    direction: "ltr"
  }), { nonce: y } = C.useContext(Ld), v = ((p = e.props) == null ? void 0 : p.ref) ?? (e == null ? void 0 : e.ref), l = zk(f, v);
  return C.useInsertionEffect(() => {
    const { width: S, height: w, top: k, left: A, right: T, bottom: P, direction: E } = m.current;
    if (n || c === !1 || !f.current || !S || !w)
      return;
    const N = E === "rtl", O = o === "left" ? N ? `right: ${T}` : `left: ${A}` : N ? `left: ${A}` : `right: ${T}`, W = i === "bottom" ? `bottom: ${P}` : `top: ${k}`;
    f.current.dataset.motionPopId = d;
    const G = document.createElement("style");
    y && (G.nonce = y);
    const K = a ?? document.head;
    return K.appendChild(G), G.sheet && G.sheet.insertRule(`
          [data-motion-pop-id="${d}"] {
            position: absolute !important;
            width: ${S}px !important;
            height: ${w}px !important;
            ${O}px !important;
            ${W}px !important;
          }
        `), () => {
      var L;
      (L = f.current) == null || L.removeAttribute("data-motion-pop-id"), K.contains(G) && K.removeChild(G);
    };
  }, [n]), x.jsx($k, { isPresent: n, childRef: f, sizeRef: m, pop: c, children: c === !1 ? e : C.cloneElement(e, { ref: l }) });
}
const Hk = ({ children: e, initial: n, isPresent: o, onExitComplete: i, custom: a, presenceAffectsLayout: c, mode: d, anchorX: f, anchorY: m, root: y }) => {
  const v = hd(Wk), l = C.useId();
  let p = !0, S = C.useMemo(() => (p = !1, {
    id: l,
    initial: n,
    isPresent: o,
    custom: a,
    onExitComplete: (w) => {
      v.set(w, !0);
      for (const k of v.values())
        if (!k)
          return;
      i && i();
    },
    register: (w) => (v.set(w, !1), () => v.delete(w))
  }), [o, v, i]);
  return c && p && (S = { ...S }), C.useMemo(() => {
    v.forEach((w, k) => v.set(k, !1));
  }, [o]), C.useEffect(() => {
    !o && !v.size && i && i();
  }, [o]), e = x.jsx(Uk, { pop: d === "popLayout", isPresent: o, anchorX: f, anchorY: m, root: y, children: e }), x.jsx(Ia.Provider, { value: S, children: e });
};
function Wk() {
  return /* @__PURE__ */ new Map();
}
function Yv(e = !0) {
  const n = C.useContext(Ia);
  if (n === null)
    return [!0, null];
  const { isPresent: o, onExitComplete: i, register: a } = n, c = C.useId();
  C.useEffect(() => {
    if (e)
      return a(c);
  }, [e]);
  const d = C.useCallback(() => e && i && i(c), [c, i, e]);
  return !o && i ? [!1, d] : [!0];
}
const Ws = (e) => e.key || "";
function Ty(e) {
  const n = [];
  return C.Children.forEach(e, (o) => {
    C.isValidElement(o) && n.push(o);
  }), n;
}
const Va = ({ children: e, custom: n, initial: o = !0, onExitComplete: i, presenceAffectsLayout: a = !0, mode: c = "sync", propagate: d = !1, anchorX: f = "left", anchorY: m = "top", root: y }) => {
  const [v, l] = Yv(d), p = C.useMemo(() => Ty(e), [e]), S = d && !v ? [] : p.map(Ws), w = C.useRef(!0), k = C.useRef(p), A = hd(() => /* @__PURE__ */ new Map()), T = C.useRef(/* @__PURE__ */ new Set()), [P, E] = C.useState(p), [N, O] = C.useState(p);
  _g(() => {
    w.current = !1, k.current = p;
    for (let K = 0; K < N.length; K++) {
      const L = Ws(N[K]);
      S.includes(L) ? (A.delete(L), T.current.delete(L)) : A.get(L) !== !0 && A.set(L, !1);
    }
  }, [N, S.length, S.join("-")]);
  const W = [];
  if (p !== P) {
    let K = [...p];
    for (let L = 0; L < N.length; L++) {
      const X = N[L], ae = Ws(X);
      S.includes(ae) || (K.splice(L, 0, X), W.push(X));
    }
    return c === "wait" && W.length && (K = W), O(Ty(K)), E(p), null;
  }
  const { forceRender: G } = C.useContext(md);
  return x.jsx(x.Fragment, { children: N.map((K) => {
    const L = Ws(K), X = d && !v ? !1 : p === N || S.includes(L), ae = () => {
      if (T.current.has(L))
        return;
      if (A.has(L))
        T.current.add(L), A.set(L, !0);
      else
        return;
      let q = !0;
      A.forEach((de) => {
        de || (q = !1);
      }), q && (G == null || G(), O(k.current), d && (l == null || l()), i && i());
    };
    return x.jsx(Hk, { isPresent: X, initial: !w.current || o ? void 0 : !1, custom: n, presenceAffectsLayout: a, mode: c, root: y, onExitComplete: X ? void 0 : ae, anchorX: f, anchorY: m, children: K }, L);
  }) });
}, Qv = C.createContext({ strict: !1 }), ky = {
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
let Ay = !1;
function Gk() {
  if (Ay)
    return;
  const e = {};
  for (const n in ky)
    e[n] = {
      isEnabled: (o) => ky[n].some((i) => !!o[i])
    };
  kv(e), Ay = !0;
}
function Xv() {
  return Gk(), MT();
}
function Kk(e) {
  const n = Xv();
  for (const o in e)
    n[o] = {
      ...n[o],
      ...e[o]
    };
  kv(n);
}
const Yk = /* @__PURE__ */ new Set([
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
function Pa(e) {
  return e.startsWith("while") || e.startsWith("drag") && e !== "draggable" || e.startsWith("layout") || e.startsWith("onTap") || e.startsWith("onPan") || e.startsWith("onLayout") || Yk.has(e);
}
let Zv = (e) => !Pa(e);
function Qk(e) {
  typeof e == "function" && (Zv = (n) => n.startsWith("on") ? !Pa(n) : e(n));
}
try {
  Qk(require("@emotion/is-prop-valid").default);
} catch {
}
function Xk(e, n, o) {
  const i = {};
  for (const a in e)
    a === "values" && typeof e.values == "object" || Je(e[a]) || (Zv(a) || o === !0 && Pa(a) || !n && !Pa(a) || // If trying to use native HTML drag events, forward drag listeners
    e.draggable && a.startsWith("onDrag")) && (i[a] = e[a]);
  return i;
}
const Ba = /* @__PURE__ */ C.createContext({});
function Zk(e, n) {
  if (La(e)) {
    const { initial: o, animate: i } = e;
    return {
      initial: o === !1 || gi(o) ? o : void 0,
      animate: gi(i) ? i : void 0
    };
  }
  return e.inherit !== !1 ? n : {};
}
function Jk(e) {
  const { initial: n, animate: o } = Zk(e, C.useContext(Ba));
  return C.useMemo(() => ({ initial: n, animate: o }), [Cy(n), Cy(o)]);
}
function Cy(e) {
  return Array.isArray(e) ? e.join(" ") : e;
}
const Vd = () => ({
  style: {},
  transform: {},
  transformOrigin: {},
  vars: {}
});
function Jv(e, n, o) {
  for (const i in n)
    !Je(n[i]) && !Rv(i, o) && (e[i] = n[i]);
}
function qk({ transformTemplate: e }, n) {
  return C.useMemo(() => {
    const o = Vd();
    return Fd(o, n, e), Object.assign({}, o.vars, o.style);
  }, [n]);
}
function eA(e, n) {
  const o = e.style || {}, i = {};
  return Jv(i, o, e), Object.assign(i, qk(e, n)), i;
}
function tA(e, n) {
  const o = {}, i = eA(e, n);
  return e.drag && e.dragListener !== !1 && (o.draggable = !1, i.userSelect = i.WebkitUserSelect = i.WebkitTouchCallout = "none", i.touchAction = e.drag === !0 ? "none" : `pan-${e.drag === "x" ? "y" : "x"}`), e.tabIndex === void 0 && (e.onTap || e.onTapStart || e.whileTap) && (o.tabIndex = 0), o.style = i, o;
}
const qv = () => ({
  ...Vd(),
  attrs: {}
});
function nA(e, n, o, i) {
  const a = C.useMemo(() => {
    const c = qv();
    return Dv(c, n, jv(i), e.transformTemplate, e.style), {
      ...c.attrs,
      style: { ...c.style }
    };
  }, [n]);
  if (e.style) {
    const c = {};
    Jv(c, e.style, e), a.style = { ...c, ...a.style };
  }
  return a;
}
const rA = [
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
function Bd(e) {
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
      !!(rA.indexOf(e) > -1 || /**
       * If it contains a capital letter, it's an SVG component
       */
      /[A-Z]/u.test(e))
    )
  );
}
function oA(e, n, o, { latestValues: i }, a, c = !1, d) {
  const m = (d ?? Bd(e) ? nA : tA)(n, i, a, e), y = Xk(n, typeof e == "string", c), v = e !== C.Fragment ? { ...y, ...m, ref: o } : {}, { children: l } = n, p = C.useMemo(() => Je(l) ? l.get() : l, [l]);
  return C.createElement(e, {
    ...v,
    children: p
  });
}
function iA({ scrapeMotionValuesFromProps: e, createRenderState: n }, o, i, a) {
  return {
    latestValues: sA(o, i, a, e),
    renderState: n()
  };
}
function sA(e, n, o, i) {
  const a = {}, c = i(e, {});
  for (const p in c)
    a[p] = da(c[p]);
  let { initial: d, animate: f } = e;
  const m = La(e), y = _v(e);
  n && y && !m && e.inherit !== !1 && (d === void 0 && (d = n.initial), f === void 0 && (f = n.animate));
  let v = o ? o.initial === !1 : !1;
  v = v || d === !1;
  const l = v ? f : d;
  if (l && typeof l != "boolean" && !Oa(l)) {
    const p = Array.isArray(l) ? l : [l];
    for (let S = 0; S < p.length; S++) {
      const w = Ed(e, p[S]);
      if (w) {
        const { transitionEnd: k, transition: A, ...T } = w;
        for (const P in T) {
          let E = T[P];
          if (Array.isArray(E)) {
            const N = v ? E.length - 1 : 0;
            E = E[N];
          }
          E !== null && (a[P] = E);
        }
        for (const P in k)
          a[P] = k[P];
      }
    }
  }
  return a;
}
const e0 = (e) => (n, o) => {
  const i = C.useContext(Ba), a = C.useContext(Ia), c = () => iA(e, n, i, a);
  return o ? c() : hd(c);
}, aA = /* @__PURE__ */ e0({
  scrapeMotionValuesFromProps: Od,
  createRenderState: Vd
}), lA = /* @__PURE__ */ e0({
  scrapeMotionValuesFromProps: Iv,
  createRenderState: qv
}), uA = Symbol.for("motionComponentSymbol");
function cA(e, n, o) {
  const i = C.useRef(o);
  C.useInsertionEffect(() => {
    i.current = o;
  });
  const a = C.useRef(null);
  return C.useCallback((c) => {
    var f;
    c && ((f = e.onMount) == null || f.call(e, c)), n && (c ? n.mount(c) : n.unmount());
    const d = i.current;
    if (typeof d == "function")
      if (c) {
        const m = d(c);
        typeof m == "function" && (a.current = m);
      } else a.current ? (a.current(), a.current = null) : d(c);
    else d && (d.current = c);
  }, [n]);
}
const t0 = C.createContext({});
function to(e) {
  return e && typeof e == "object" && Object.prototype.hasOwnProperty.call(e, "current");
}
function dA(e, n, o, i, a, c) {
  var E, N;
  const { visualElement: d } = C.useContext(Ba), f = C.useContext(Qv), m = C.useContext(Ia), y = C.useContext(Ld), v = y.reducedMotion, l = y.skipAnimations, p = C.useRef(null), S = C.useRef(!1);
  i = i || f.renderer, !p.current && i && (p.current = i(e, {
    visualState: n,
    parent: d,
    props: o,
    presenceContext: m,
    blockInitialAnimation: m ? m.initial === !1 : !1,
    reducedMotionConfig: v,
    skipAnimations: l,
    isSVG: c
  }), S.current && p.current && (p.current.manuallyAnimateOnMount = !0));
  const w = p.current, k = C.useContext(t0);
  w && !w.projection && a && (w.type === "html" || w.type === "svg") && fA(p.current, o, a, k);
  const A = C.useRef(!1);
  C.useInsertionEffect(() => {
    w && A.current && w.update(o, m);
  });
  const T = o[cv], P = C.useRef(!!T && typeof window < "u" && !((E = window.MotionHandoffIsComplete) != null && E.call(window, T)) && ((N = window.MotionHasOptimisedAnimation) == null ? void 0 : N.call(window, T)));
  return _g(() => {
    S.current = !0, w && (A.current = !0, window.MotionIsMounted = !0, w.updateFeatures(), w.scheduleRenderMicrotask(), P.current && w.animationState && w.animationState.animateChanges());
  }), C.useEffect(() => {
    w && (!P.current && w.animationState && w.animationState.animateChanges(), P.current && (queueMicrotask(() => {
      var O;
      (O = window.MotionHandoffMarkAsComplete) == null || O.call(window, T);
    }), P.current = !1), w.enteringChildren = void 0);
  }), w;
}
function fA(e, n, o, i) {
  const { layoutId: a, layout: c, drag: d, dragConstraints: f, layoutScroll: m, layoutRoot: y, layoutAnchor: v, layoutCrossfade: l } = n;
  e.projection = new o(e.latestValues, n["data-framer-portal-id"] ? void 0 : n0(e.parent)), e.projection.setOptions({
    layoutId: a,
    layout: c,
    alwaysMeasureLayout: !!d || f && to(f),
    visualElement: e,
    /**
     * TODO: Update options in an effect. This could be tricky as it'll be too late
     * to update by the time layout animations run.
     * We also need to fix this safeToRemove by linking it up to the one returned by usePresence,
     * ensuring it gets called if there's no potential layout animations.
     *
     */
    animationType: typeof c == "string" ? c : "both",
    initialPromotionConfig: i,
    crossfade: l,
    layoutScroll: m,
    layoutRoot: y,
    layoutAnchor: v
  });
}
function n0(e) {
  if (e)
    return e.options.allowProjection !== !1 ? e.projection : n0(e.parent);
}
function tc(e, { forwardMotionProps: n = !1, type: o } = {}, i, a) {
  i && Kk(i);
  const c = o ? o === "svg" : Bd(e), d = c ? lA : aA;
  function f(y, v) {
    let l;
    const p = {
      ...C.useContext(Ld),
      ...y,
      layoutId: pA(y)
    }, { isStatic: S } = p, w = Jk(y), k = d(y, S);
    if (!S && typeof window < "u") {
      mA();
      const A = hA(p);
      l = A.MeasureLayout, w.visualElement = dA(e, k, p, a, A.ProjectionNode, c);
    }
    return x.jsxs(Ba.Provider, { value: w, children: [l && w.visualElement ? x.jsx(l, { visualElement: w.visualElement, ...p }) : null, oA(e, y, cA(k, w.visualElement, v), k, S, n, c)] });
  }
  f.displayName = `motion.${typeof e == "string" ? e : `create(${e.displayName ?? e.name ?? ""})`}`;
  const m = C.forwardRef(f);
  return m[uA] = e, m;
}
function pA({ layoutId: e }) {
  const n = C.useContext(md).id;
  return n && e !== void 0 ? n + "-" + e : e;
}
function mA(e, n) {
  C.useContext(Qv).strict;
}
function hA(e) {
  const n = Xv(), { drag: o, layout: i } = n;
  if (!o && !i)
    return {};
  const a = { ...o, ...i };
  return {
    MeasureLayout: o != null && o.isEnabled(e) || i != null && i.isEnabled(e) ? a.MeasureLayout : void 0,
    ProjectionNode: a.ProjectionNode
  };
}
function yA(e, n) {
  if (typeof Proxy > "u")
    return tc;
  const o = /* @__PURE__ */ new Map(), i = (c, d) => tc(c, d, e, n), a = (c, d) => i(c, d);
  return new Proxy(a, {
    /**
     * Called when `motion` is referenced with a prop: `motion.div`, `motion.input` etc.
     * The prop name is passed through as `key` and we can use that to generate a `motion`
     * DOM component with that name.
     */
    get: (c, d) => d === "create" ? i : (o.has(d) || o.set(d, tc(d, void 0, e, n)), o.get(d))
  });
}
const gA = (e, n) => n.isSVG ?? Bd(e) ? new KT(n) : new zT(n, {
  allowProjection: e !== C.Fragment
});
class vA extends Zn {
  /**
   * We dynamically generate the AnimationState manager as it contains a reference
   * to the underlying animation library. We only want to load that if we load this,
   * so people can optionally code split it out using the `m` component.
   */
  constructor(n) {
    super(n), n.animationState || (n.animationState = JT(n));
  }
  updateAnimationControlsSubscription() {
    const { animate: n } = this.node.getProps();
    Oa(n) && (this.unmountControls = n.subscribe(this.node));
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
let SA = 0;
class wA extends Zn {
  constructor() {
    super(...arguments), this.id = SA++, this.isExitComplete = !1;
  }
  update() {
    var c;
    if (!this.node.presenceContext)
      return;
    const { isPresent: n, onExitComplete: o } = this.node.presenceContext, { isPresent: i } = this.node.prevPresenceContext || {};
    if (!this.node.animationState || n === i)
      return;
    if (n && i === !1) {
      if (this.isExitComplete) {
        const { initial: d, custom: f } = this.node.getProps();
        if (typeof d == "string" || typeof d == "object" && d !== null && !Array.isArray(d)) {
          const m = wr(this.node, d, f);
          if (m) {
            const { transition: y, transitionEnd: v, ...l } = m;
            for (const p in l)
              (c = this.node.getValue(p)) == null || c.jump(l[p]);
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
const xA = {
  animation: {
    Feature: vA
  },
  exit: {
    Feature: wA
  }
};
function Pi(e) {
  return {
    point: {
      x: e.pageX,
      y: e.pageY
    }
  };
}
const _A = (e) => (n) => Dd(n) && e(n, Pi(n));
function fi(e, n, o, i) {
  return vi(e, n, _A(o), i);
}
const r0 = ({ current: e }) => e ? e.ownerDocument.defaultView : null, Py = (e, n) => Math.abs(e - n);
function TA(e, n) {
  const o = Py(e.x, n.x), i = Py(e.y, n.y);
  return Math.sqrt(o ** 2 + i ** 2);
}
const by = /* @__PURE__ */ new Set(["auto", "scroll"]);
class o0 {
  constructor(n, o, { transformPagePoint: i, contextWindow: a = window, dragSnapToOrigin: c = !1, distanceThreshold: d = 3, element: f } = {}) {
    if (this.startEvent = null, this.lastMoveEvent = null, this.lastMoveEventInfo = null, this.lastRawMoveEventInfo = null, this.handlers = {}, this.contextWindow = window, this.scrollPositions = /* @__PURE__ */ new Map(), this.removeScrollListeners = null, this.onElementScroll = (S) => {
      this.handleScroll(S.target);
    }, this.onWindowScroll = () => {
      this.handleScroll(window);
    }, this.updatePoint = () => {
      if (!(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      this.lastRawMoveEventInfo && (this.lastMoveEventInfo = Gs(this.lastRawMoveEventInfo, this.transformPagePoint));
      const S = nc(this.lastMoveEventInfo, this.history), w = this.startEvent !== null, k = TA(S.offset, { x: 0, y: 0 }) >= this.distanceThreshold;
      if (!w && !k)
        return;
      const { point: A } = S, { timestamp: T } = Ze;
      this.history.push({ ...A, timestamp: T });
      const { onStart: P, onMove: E } = this.handlers;
      w || (P && P(this.lastMoveEvent, S), this.startEvent = this.lastMoveEvent), E && E(this.lastMoveEvent, S);
    }, this.handlePointerMove = (S, w) => {
      this.lastMoveEvent = S, this.lastRawMoveEventInfo = w, this.lastMoveEventInfo = Gs(w, this.transformPagePoint), ke.update(this.updatePoint, !0);
    }, this.handlePointerUp = (S, w) => {
      this.end();
      const { onEnd: k, onSessionEnd: A, resumeAnimation: T } = this.handlers;
      if ((this.dragSnapToOrigin || !this.startEvent) && T && T(), !(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      const P = nc(S.type === "pointercancel" ? this.lastMoveEventInfo : Gs(w, this.transformPagePoint), this.history);
      this.startEvent && k && k(S, P), A && A(S, P);
    }, !Dd(n))
      return;
    this.dragSnapToOrigin = c, this.handlers = o, this.transformPagePoint = i, this.distanceThreshold = d, this.contextWindow = a || window;
    const m = Pi(n), y = Gs(m, this.transformPagePoint), { point: v } = y, { timestamp: l } = Ze;
    this.history = [{ ...v, timestamp: l }];
    const { onSessionStart: p } = o;
    p && p(n, nc(y, this.history)), this.removeListeners = ki(fi(this.contextWindow, "pointermove", this.handlePointerMove), fi(this.contextWindow, "pointerup", this.handlePointerUp), fi(this.contextWindow, "pointercancel", this.handlePointerUp)), f && this.startScrollTracking(f);
  }
  /**
   * Start tracking scroll on ancestors and window.
   */
  startScrollTracking(n) {
    let o = n.parentElement;
    for (; o; ) {
      const i = getComputedStyle(o);
      (by.has(i.overflowX) || by.has(i.overflowY)) && this.scrollPositions.set(o, {
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
    }, c = { x: a.x - o.x, y: a.y - o.y };
    c.x === 0 && c.y === 0 || (i ? this.lastMoveEventInfo && (this.lastMoveEventInfo.point.x += c.x, this.lastMoveEventInfo.point.y += c.y) : this.history.length > 0 && (this.history[0].x -= c.x, this.history[0].y -= c.y), this.scrollPositions.set(n, a), ke.update(this.updatePoint, !0));
  }
  updateHandlers(n) {
    this.handlers = n;
  }
  end() {
    this.removeListeners && this.removeListeners(), this.removeScrollListeners && this.removeScrollListeners(), this.scrollPositions.clear(), Xn(this.updatePoint);
  }
}
function Gs(e, n) {
  return n ? { point: n(e.point) } : e;
}
function Ey(e, n) {
  return { x: e.x - n.x, y: e.y - n.y };
}
function nc({ point: e }, n) {
  return {
    point: e,
    delta: Ey(e, i0(n)),
    offset: Ey(e, kA(n)),
    velocity: AA(n, 0.1)
  };
}
function kA(e) {
  return e[0];
}
function i0(e) {
  return e[e.length - 1];
}
function AA(e, n) {
  if (e.length < 2)
    return { x: 0, y: 0 };
  let o = e.length - 1, i = null;
  const a = i0(e);
  for (; o >= 0 && (i = e[o], !(a.timestamp - i.timestamp > /* @__PURE__ */ ht(n))); )
    o--;
  if (!i)
    return { x: 0, y: 0 };
  i === e[0] && e.length > 2 && a.timestamp - i.timestamp > /* @__PURE__ */ ht(n) * 2 && (i = e[1]);
  const c = /* @__PURE__ */ Rt(a.timestamp - i.timestamp);
  if (c === 0)
    return { x: 0, y: 0 };
  const d = {
    x: (a.x - i.x) / c,
    y: (a.y - i.y) / c
  };
  return d.x === 1 / 0 && (d.x = 0), d.y === 1 / 0 && (d.y = 0), d;
}
function CA(e, { min: n, max: o }, i) {
  return n !== void 0 && e < n ? e = i ? Te(n, e, i.min) : Math.max(e, n) : o !== void 0 && e > o && (e = i ? Te(o, e, i.max) : Math.min(e, o)), e;
}
function My(e, n, o) {
  return {
    min: n !== void 0 ? e.min + n : void 0,
    max: o !== void 0 ? e.max + o - (e.max - e.min) : void 0
  };
}
function PA(e, { top: n, left: o, bottom: i, right: a }) {
  return {
    x: My(e.x, o, a),
    y: My(e.y, n, i)
  };
}
function Ry(e, n) {
  let o = n.min - e.min, i = n.max - e.max;
  return n.max - n.min < e.max - e.min && ([o, i] = [i, o]), { min: o, max: i };
}
function bA(e, n) {
  return {
    x: Ry(e.x, n.x),
    y: Ry(e.y, n.y)
  };
}
function EA(e, n) {
  let o = 0.5;
  const i = at(e), a = at(n);
  return a > i ? o = /* @__PURE__ */ hi(n.min, n.max - i, e.min) : i > a && (o = /* @__PURE__ */ hi(e.min, e.max - a, n.min)), nn(0, 1, o);
}
function MA(e, n) {
  const o = {};
  return n.min !== void 0 && (o.min = n.min - e.min), n.max !== void 0 && (o.max = n.max - e.min), o;
}
const Bc = 0.35;
function RA(e = Bc) {
  return e === !1 ? e = 0 : e === !0 && (e = Bc), {
    x: Dy(e, "left", "right"),
    y: Dy(e, "top", "bottom")
  };
}
function Dy(e, n, o) {
  return {
    min: Ny(e, n),
    max: Ny(e, o)
  };
}
function Ny(e, n) {
  return typeof e == "number" ? e : e[n] || 0;
}
const DA = /* @__PURE__ */ new WeakMap();
class NA {
  constructor(n) {
    this.openDragLock = null, this.isDragging = !1, this.currentDirection = null, this.originPoint = { x: 0, y: 0 }, this.constraints = !1, this.hasMutatedConstraints = !1, this.elastic = Ue(), this.latestPointerEvent = null, this.latestPanInfo = null, this.visualElement = n;
  }
  start(n, { snapToCursor: o = !1, distanceThreshold: i } = {}) {
    const { presenceContext: a } = this.visualElement;
    if (a && a.isPresent === !1)
      return;
    const c = (l) => {
      o && this.snapToCursor(Pi(l).point), this.stopAnimation();
    }, d = (l, p) => {
      const { drag: S, dragPropagation: w, onDragStart: k } = this.getProps();
      if (S && !w && (this.openDragLock && this.openDragLock(), this.openDragLock = sT(S), !this.openDragLock))
        return;
      this.latestPointerEvent = l, this.latestPanInfo = p, this.isDragging = !0, this.currentDirection = null, this.resolveConstraints(), this.visualElement.projection && (this.visualElement.projection.isAnimationBlocked = !0, this.visualElement.projection.target = void 0), Zt((T) => {
        let P = this.getAxisMotionValue(T).get() || 0;
        if (tn.test(P)) {
          const { projection: E } = this.visualElement;
          if (E && E.layout) {
            const N = E.layout.layoutBox[T];
            N && (P = at(N) * (parseFloat(P) / 100));
          }
        }
        this.originPoint[T] = P;
      }), k && ke.update(() => k(l, p), !1, !0), Mc(this.visualElement, "transform");
      const { animationState: A } = this.visualElement;
      A && A.setActive("whileDrag", !0);
    }, f = (l, p) => {
      this.latestPointerEvent = l, this.latestPanInfo = p;
      const { dragPropagation: S, dragDirectionLock: w, onDirectionLock: k, onDrag: A } = this.getProps();
      if (!S && !this.openDragLock)
        return;
      const { offset: T } = p;
      if (w && this.currentDirection === null) {
        this.currentDirection = IA(T), this.currentDirection !== null && k && k(this.currentDirection);
        return;
      }
      this.updateAxis("x", p.point, T), this.updateAxis("y", p.point, T), this.visualElement.render(), A && ke.update(() => A(l, p), !1, !0);
    }, m = (l, p) => {
      this.latestPointerEvent = l, this.latestPanInfo = p, this.stop(l, p), this.latestPointerEvent = null, this.latestPanInfo = null;
    }, y = () => {
      const { dragSnapToOrigin: l } = this.getProps();
      (l || this.constraints) && this.startAnimation({ x: 0, y: 0 });
    }, { dragSnapToOrigin: v } = this.getProps();
    this.panSession = new o0(n, {
      onSessionStart: c,
      onStart: d,
      onMove: f,
      onSessionEnd: m,
      resumeAnimation: y
    }, {
      transformPagePoint: this.visualElement.getTransformPagePoint(),
      dragSnapToOrigin: v,
      distanceThreshold: i,
      contextWindow: r0(this.visualElement),
      element: this.visualElement.current
    });
  }
  /**
   * @internal
   */
  stop(n, o) {
    const i = n || this.latestPointerEvent, a = o || this.latestPanInfo, c = this.isDragging;
    if (this.cancel(), !c || !a || !i)
      return;
    const { velocity: d } = a;
    this.startAnimation(d);
    const { onDragEnd: f } = this.getProps();
    f && ke.postRender(() => f(i, a));
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
    if (!i || !Ks(n, a, this.currentDirection))
      return;
    const c = this.getAxisMotionValue(n);
    let d = this.originPoint[n] + i[n];
    this.constraints && this.constraints[n] && (d = CA(d, this.constraints[n], this.elastic[n])), c.set(d);
  }
  resolveConstraints() {
    var c;
    const { dragConstraints: n, dragElastic: o } = this.getProps(), i = this.visualElement.projection && !this.visualElement.projection.layout ? this.visualElement.projection.measure(!1) : (c = this.visualElement.projection) == null ? void 0 : c.layout, a = this.constraints;
    n && to(n) ? this.constraints || (this.constraints = this.resolveRefConstraints()) : n && i ? this.constraints = PA(i.layoutBox, n) : this.constraints = !1, this.elastic = RA(o), a !== this.constraints && !to(n) && i && this.constraints && !this.hasMutatedConstraints && Zt((d) => {
      this.constraints !== !1 && this.getAxisMotionValue(d) && (this.constraints[d] = MA(i.layoutBox[d], this.constraints[d]));
    });
  }
  resolveRefConstraints() {
    const { dragConstraints: n, onMeasureDragConstraints: o } = this.getProps();
    if (!n || !to(n))
      return !1;
    const i = n.current;
    kr(i !== null, "If `dragConstraints` is set as a React ref, that ref must be passed to another component's `ref` prop.", "drag-constraints-ref");
    const { projection: a } = this.visualElement;
    if (!a || !a.layout)
      return !1;
    a.root && (a.root.scroll = void 0, a.root.updateScroll());
    const c = IT(i, a.root, this.visualElement.getTransformPagePoint());
    let d = bA(a.layout.layoutBox, c);
    if (o) {
      const f = o(DT(d));
      this.hasMutatedConstraints = !!f, f && (d = Cv(f));
    }
    return d;
  }
  startAnimation(n) {
    const { drag: o, dragMomentum: i, dragElastic: a, dragTransition: c, dragSnapToOrigin: d, onDragTransitionEnd: f } = this.getProps(), m = this.constraints || {}, y = Zt((v) => {
      if (!Ks(v, o, this.currentDirection))
        return;
      let l = m && m[v] || {};
      (d === !0 || d === v) && (l = { min: 0, max: 0 });
      const p = a ? 200 : 1e6, S = a ? 40 : 1e7, w = {
        type: "inertia",
        velocity: i ? n[v] : 0,
        bounceStiffness: p,
        bounceDamping: S,
        timeConstant: 750,
        restDelta: 1,
        restSpeed: 10,
        ...c,
        ...l
      };
      return this.startAxisValueAnimation(v, w);
    });
    return Promise.all(y).then(f);
  }
  startAxisValueAnimation(n, o) {
    const i = this.getAxisMotionValue(n);
    return Mc(this.visualElement, n), i.start(bd(n, i, 0, o, this.visualElement, !1));
  }
  stopAnimation() {
    Zt((n) => this.getAxisMotionValue(n).stop());
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
    Zt((o) => {
      const { drag: i } = this.getProps();
      if (!Ks(o, i, this.currentDirection))
        return;
      const { projection: a } = this.visualElement, c = this.getAxisMotionValue(o);
      if (a && a.layout) {
        const { min: d, max: f } = a.layout.layoutBox[o], m = c.get() || 0;
        c.set(n[o] - Te(d, f, 0.5) + m);
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
    Zt((d) => {
      const f = this.getAxisMotionValue(d);
      if (f && this.constraints !== !1) {
        const m = f.get();
        a[d] = EA({ min: m, max: m }, this.constraints[d]);
      }
    });
    const { transformTemplate: c } = this.visualElement.getProps();
    this.visualElement.current.style.transform = c ? c({}, "") : "none", i.root && i.root.updateScroll(), i.updateLayout(), this.constraints = !1, this.resolveConstraints(), Zt((d) => {
      if (!Ks(d, n, null))
        return;
      const f = this.getAxisMotionValue(d), { min: m, max: y } = this.constraints[d];
      f.set(Te(m, y, a[d]));
    }), this.visualElement.render();
  }
  addListeners() {
    if (!this.visualElement.current)
      return;
    DA.set(this.visualElement, this);
    const n = this.visualElement.current, o = fi(n, "pointerdown", (y) => {
      const { drag: v, dragListener: l = !0 } = this.getProps(), p = y.target, S = p !== n && fT(p);
      v && l && !S && this.start(y);
    });
    let i;
    const a = () => {
      const { dragConstraints: y } = this.getProps();
      to(y) && y.current && (this.constraints = this.resolveRefConstraints(), i || (i = jA(n, y.current, () => this.scalePositionWithinConstraints())));
    }, { projection: c } = this.visualElement, d = c.addEventListener("measure", a);
    c && !c.layout && (c.root && c.root.updateScroll(), c.updateLayout()), ke.read(a);
    const f = vi(window, "resize", () => this.scalePositionWithinConstraints()), m = c.addEventListener("didUpdate", (({ delta: y, hasLayoutChanged: v }) => {
      this.isDragging && v && (Zt((l) => {
        const p = this.getAxisMotionValue(l);
        p && (this.originPoint[l] += y[l].translate, p.set(p.get() + y[l].translate));
      }), this.visualElement.render());
    }));
    return () => {
      f(), o(), d(), m && m(), i && i();
    };
  }
  getProps() {
    const n = this.visualElement.getProps(), { drag: o = !1, dragDirectionLock: i = !1, dragPropagation: a = !1, dragConstraints: c = !1, dragElastic: d = Bc, dragMomentum: f = !0 } = n;
    return {
      ...n,
      drag: o,
      dragDirectionLock: i,
      dragPropagation: a,
      dragConstraints: c,
      dragElastic: d,
      dragMomentum: f
    };
  }
}
function jy(e) {
  let n = !0;
  return () => {
    if (n) {
      n = !1;
      return;
    }
    e();
  };
}
function jA(e, n, o) {
  const i = zh(e, jy(o)), a = zh(n, jy(o));
  return () => {
    i(), a();
  };
}
function Ks(e, n, o) {
  return (n === !0 || n === e) && (o === null || o === e);
}
function IA(e, n = 10) {
  let o = null;
  return Math.abs(e.y) > n ? o = "y" : Math.abs(e.x) > n && (o = "x"), o;
}
class FA extends Zn {
  constructor(n) {
    super(n), this.removeGroupControls = Dt, this.removeListeners = Dt, this.controls = new NA(n);
  }
  mount() {
    const { dragControls: n } = this.node.getProps();
    n && (this.removeGroupControls = n.subscribe(this.controls)), this.removeListeners = this.controls.addListeners() || Dt;
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
  e && ke.update(() => e(n, o), !1, !0);
};
class OA extends Zn {
  constructor() {
    super(...arguments), this.removePointerDownListener = Dt;
  }
  onPointerDown(n) {
    this.session = new o0(n, this.createPanHandlers(), {
      transformPagePoint: this.node.getTransformPagePoint(),
      contextWindow: r0(this.node)
    });
  }
  createPanHandlers() {
    const { onPanSessionStart: n, onPanStart: o, onPan: i, onPanEnd: a } = this.node.getProps();
    return {
      onSessionStart: rc(n),
      onStart: rc(o),
      onMove: rc(i),
      onEnd: (c, d) => {
        delete this.session, a && ke.postRender(() => a(c, d));
      }
    };
  }
  mount() {
    this.removePointerDownListener = fi(this.node.current, "pointerdown", (n) => this.onPointerDown(n));
  }
  update() {
    this.session && this.session.updateHandlers(this.createPanHandlers());
  }
  unmount() {
    this.removePointerDownListener(), this.session && this.session.end();
  }
}
let oc = !1;
class LA extends C.Component {
  /**
   * This only mounts projection nodes for components that
   * need measuring, we might want to do it for all components
   * in order to incorporate transforms
   */
  componentDidMount() {
    const { visualElement: n, layoutGroup: o, switchLayoutGroup: i, layoutId: a } = this.props, { projection: c } = n;
    c && (o.group && o.group.add(c), i && i.register && a && i.register(c), oc && c.root.didUpdate(), c.addEventListener("animationComplete", () => {
      this.safeToRemove();
    }), c.setOptions({
      ...c.options,
      layoutDependency: this.props.layoutDependency,
      onExitComplete: () => this.safeToRemove()
    })), fa.hasEverUpdated = !0;
  }
  getSnapshotBeforeUpdate(n) {
    const { layoutDependency: o, visualElement: i, drag: a, isPresent: c } = this.props, { projection: d } = i;
    return d && (d.isPresent = c, n.layoutDependency !== o && d.setOptions({
      ...d.options,
      layoutDependency: o
    }), oc = !0, a || n.layoutDependency !== o || o === void 0 || n.isPresent !== c ? d.willUpdate() : this.safeToRemove(), n.isPresent !== c && (c ? d.promote() : d.relegate() || ke.postRender(() => {
      const f = d.getStack();
      (!f || !f.members.length) && this.safeToRemove();
    }))), null;
  }
  componentDidUpdate() {
    const { visualElement: n, layoutAnchor: o } = this.props, { projection: i } = n;
    i && (i.options.layoutAnchor = o, i.root.didUpdate(), Rd.postRender(() => {
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
function s0(e) {
  const [n, o] = Yv(), i = C.useContext(md);
  return x.jsx(LA, { ...e, layoutGroup: i, switchLayoutGroup: C.useContext(t0), isPresent: n, safeToRemove: o });
}
const VA = {
  pan: {
    Feature: OA
  },
  drag: {
    Feature: FA,
    ProjectionNode: Kv,
    MeasureLayout: s0
  }
};
function Iy(e, n, o) {
  const { props: i } = e;
  e.animationState && i.whileHover && e.animationState.setActive("whileHover", o === "Start");
  const a = "onHover" + o, c = i[a];
  c && ke.postRender(() => c(n, Pi(n)));
}
class BA extends Zn {
  mount() {
    const { current: n } = this.node;
    n && (this.unmount = lT(n, (o, i) => (Iy(this.node, i, "Start"), (a) => Iy(this.node, a, "End"))));
  }
  unmount() {
  }
}
class zA extends Zn {
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
    this.unmount = ki(vi(this.node.current, "focus", () => this.onFocus()), vi(this.node.current, "blur", () => this.onBlur()));
  }
  unmount() {
  }
}
function Fy(e, n, o) {
  const { props: i } = e;
  if (e.current instanceof HTMLButtonElement && e.current.disabled)
    return;
  e.animationState && i.whileTap && e.animationState.setActive("whileTap", o === "Start");
  const a = "onTap" + (o === "End" ? "" : o), c = i[a];
  c && ke.postRender(() => c(n, Pi(n)));
}
class $A extends Zn {
  mount() {
    const { current: n } = this.node;
    if (!n)
      return;
    const { globalTapTarget: o, propagate: i } = this.node.props;
    this.unmount = mT(n, (a, c) => (Fy(this.node, c, "Start"), (d, { success: f }) => Fy(this.node, d, f ? "End" : "Cancel")), {
      useGlobalTarget: o,
      stopPropagation: (i == null ? void 0 : i.tap) === !1
    });
  }
  unmount() {
  }
}
const zc = /* @__PURE__ */ new WeakMap(), ic = /* @__PURE__ */ new WeakMap(), UA = (e) => {
  const n = zc.get(e.target);
  n && n(e);
}, HA = (e) => {
  e.forEach(UA);
};
function WA({ root: e, ...n }) {
  const o = e || document;
  ic.has(o) || ic.set(o, {});
  const i = ic.get(o), a = JSON.stringify(n);
  return i[a] || (i[a] = new IntersectionObserver(HA, { root: e, ...n })), i[a];
}
function GA(e, n, o) {
  const i = WA(n);
  return zc.set(e, o), i.observe(e), () => {
    zc.delete(e), i.unobserve(e);
  };
}
const KA = {
  some: 0,
  all: 1
};
class YA extends Zn {
  constructor() {
    super(...arguments), this.hasEnteredView = !1, this.isInView = !1;
  }
  startObserver() {
    var m;
    (m = this.stopObserver) == null || m.call(this);
    const { viewport: n = {} } = this.node.getProps(), { root: o, margin: i, amount: a = "some", once: c } = n, d = {
      root: o ? o.current : void 0,
      rootMargin: i,
      threshold: typeof a == "number" ? a : KA[a]
    }, f = (y) => {
      const { isIntersecting: v } = y;
      if (this.isInView === v || (this.isInView = v, c && !v && this.hasEnteredView))
        return;
      v && (this.hasEnteredView = !0), this.node.animationState && this.node.animationState.setActive("whileInView", v);
      const { onViewportEnter: l, onViewportLeave: p } = this.node.getProps(), S = v ? l : p;
      S && S(y);
    };
    this.stopObserver = GA(this.node.current, d, f);
  }
  mount() {
    this.startObserver();
  }
  update() {
    if (typeof IntersectionObserver > "u")
      return;
    const { props: n, prevProps: o } = this.node;
    ["amount", "margin", "root"].some(QA(n, o)) && this.startObserver();
  }
  unmount() {
    var n;
    (n = this.stopObserver) == null || n.call(this), this.hasEnteredView = !1, this.isInView = !1;
  }
}
function QA({ viewport: e = {} }, { viewport: n = {} } = {}) {
  return (o) => e[o] !== n[o];
}
const XA = {
  inView: {
    Feature: YA
  },
  tap: {
    Feature: $A
  },
  focus: {
    Feature: zA
  },
  hover: {
    Feature: BA
  }
}, ZA = {
  layout: {
    ProjectionNode: Kv,
    MeasureLayout: s0
  }
}, JA = {
  ...xA,
  ...XA,
  ...VA,
  ...ZA
}, vn = /* @__PURE__ */ yA(JA, gA);
function qA(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function a0(e) {
  const n = String(e || "").toLowerCase();
  return n === "127.0.0.1" || n === "localhost" || n === "::1" || n === "[::1]";
}
function Oy(e) {
  return a0(e) || qA(e);
}
function eC(e) {
  return !e || a0(e) ? "127.0.0.1" : e;
}
const tC = (() => {
  var v, l, p, S;
  const e = globalThis.window || globalThis, n = globalThis.document || {}, o = e.location || {}, i = String(e.SYNAPSE_DATA_API_PORT || ((l = (v = n.body) == null ? void 0 : v.dataset) == null ? void 0 : l.dataApiPort) || "3001").trim(), { protocol: a = "file:", hostname: c = "127.0.0.1", port: d = "" } = o, f = `http://${eC(c)}:${i || "3001"}`, m = String(e.SYNAPSE_DATA_API_BASE || ((S = (p = n.body) == null ? void 0 : p.dataset) == null ? void 0 : S.dataApiBase) || "").replace(/\/+$/, ""), y = `${a}//${o.host || (d ? `${c}:${d}` : c)}`.replace(/\/+$/, "");
  return m && !(Oy(c) && d !== i && m === y) ? m : a === "file:" || Oy(c) && d !== i ? f : `${a}//${o.host || c}`;
})(), nC = new Sg(tC), sc = Number((globalThis.window || globalThis).SYNAPSE_DATA_API_TIMEOUT_MS || 6e3), rC = Number.isFinite(sc) && sc > 0 ? sc : 6e3;
function oC(e, n) {
  typeof window > "u" || console.warn(e, n);
}
async function iC(e) {
  var i, a;
  const o = (((a = (i = e.headers) == null ? void 0 : i.get) == null ? void 0 : a.call(i, "content-type")) || "").includes("application/json") ? await e.json() : {};
  if (!e.ok || (o == null ? void 0 : o.ok) === !1)
    throw new Error((o == null ? void 0 : o.error) || `Synapse data API returned HTTP ${e.status}`);
  return o;
}
async function sC(e, n = {}) {
  const o = await nC.fetch(e, {
    timeoutMs: rC,
    ...n
  });
  return iC(o);
}
async function aC(e) {
  try {
    return (await sC("/api/focus-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(e || {})
    })).item || null;
  } catch (n) {
    return oC("Synapse data API focus-session save skipped:", n), null;
  }
}
class lC {
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
const l0 = new lC();
function zd(e, n) {
  return l0.readJSON(e, n);
}
function $d(e, n) {
  return l0.writeJSON(e, n);
}
const u0 = "synapse.focusRoom.sessions.v1", c0 = "synapse.focusRoom.draft.v1", d0 = "synapse.focusRoom.active-session.v1", $c = 40, Ly = Object.freeze([
  "idle",
  "running",
  "paused",
  "completed",
  "break",
  "restoring"
]), uC = Object.freeze({
  studying: "running",
  running: "running",
  idle: "idle",
  paused: "paused",
  completed: "completed",
  break: "break",
  restoring: "restoring"
});
let Uc = [];
const pr = (e) => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURI(e)}`, Kn = [
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
    streamUrl: pr("Raspberrymusic_-_Lofi_Hip_Hop_Upbeat.ogg"),
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
    streamUrl: pr("20090610_0_ambience.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:20090610_0_ambience.ogg",
    license: "Public domain",
    attribution: "Forest ambience by nille",
    volumeBias: 1
  },
  cafe: {
    id: "cafe-ambiance",
    title: "Cafe ambiance",
    artist: "Marble Toast",
    streamUrl: pr("Cafe_ambiance.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Cafe_ambiance.ogg",
    license: "CC0",
    attribution: "Cafe ambiance by Marble Toast",
    volumeBias: 0.72
  },
  rain: {
    id: "rain",
    title: "Rain",
    artist: "ezwa",
    streamUrl: pr("Rain_(1).ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Rain_(1).ogg",
    license: "Public domain",
    attribution: "Rain by ezwa",
    volumeBias: 0.48
  },
  whiteNoise: {
    id: "white-noise",
    title: "White noise",
    artist: "Bautsch",
    streamUrl: pr("White.Noise.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:White.Noise.ogg",
    license: "Public domain",
    attribution: "White noise by Bautsch",
    volumeBias: 1
  },
  ocean: {
    id: "ocean-waves",
    title: "Waves",
    artist: "Dsw4",
    streamUrl: pr("Waves.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Waves.ogg",
    license: "CC BY 3.0",
    attribution: "Waves by Dsw4",
    volumeBias: 1
  },
  wind: {
    id: "howling-wind",
    title: "Howling wind",
    artist: "Tvabutzku1234",
    streamUrl: pr("Howling_wind.ogg"),
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
    name: "木屋黄昏",
    kicker: "暖光 · 放松",
    description: "Warm cabin light and an unhurried focus block.",
    image: "./assets/focus-room/innook/cabin-twilight.jpg",
    ambientSound: "Nature",
    musicType: "Piano",
    galleryOnly: !0
  },
  {
    id: "innook-last-room",
    name: "末世客厅",
    kicker: "废土 · 微光",
    description: "A quiet room with distant, low-lit calm.",
    image: "./assets/focus-room/innook/last-room.jpg",
    ambientSound: "White Noise",
    musicType: "Minimal",
    galleryOnly: !0
  },
  {
    id: "innook-garden-cafe",
    name: "绿植咖啡",
    kicker: "绿植 · 咖啡",
    description: "Soft café ambience among abundant greenery.",
    image: "./assets/focus-room/innook/garden-cafe.jpg",
    ambientSound: "Cafe Rain",
    musicType: "Lo-fi",
    galleryOnly: !0
  },
  {
    id: "innook-sunset-classroom",
    name: "晚霞教室",
    kicker: "教室 · 晚霞",
    description: "An empty classroom in the fading evening light.",
    image: "./assets/focus-room/innook/sunset-classroom.jpg",
    ambientSound: "Nature",
    musicType: "Piano",
    galleryOnly: !0
  },
  {
    id: "innook-tokyo-night",
    name: "东京夜景",
    kicker: "城市 · 夜色",
    description: "A city-night view for steady late study.",
    image: "./assets/focus-room/innook/tokyo-night-view.jpg",
    ambientSound: "White Noise",
    musicType: "Deep Focus",
    galleryOnly: !0
  },
  {
    id: "innook-snow-window-cabin",
    name: "雪窗木屋",
    kicker: "雪夜 · 木屋",
    description: "Snow beyond the window, warmth at the desk.",
    image: "./assets/focus-room/innook/snow-window-cabin.jpg",
    ambientSound: "Wind",
    musicType: "Minimal",
    galleryOnly: !0
  },
  {
    id: "innook-bamboo-cabin",
    name: "竹林小屋",
    kicker: "竹影 · 安静",
    description: "A bamboo retreat made for quiet concentration.",
    image: "./assets/focus-room/innook/bamboo-cabin.jpg",
    ambientSound: "Nature",
    musicType: "Deep Focus",
    galleryOnly: !0
  },
  {
    id: "innook-snow-peak-window",
    name: "雪峰窗边",
    kicker: "雪山 · 冷静",
    description: "Cool alpine light through a quiet study window.",
    image: "./assets/focus-room/innook/snow-peak-window.jpg",
    ambientSound: "Wind",
    musicType: "Piano",
    galleryOnly: !0
  },
  {
    id: "innook-herbal-apothecary",
    name: "草药书桌",
    kicker: "本草 · 木色",
    description: "Warm wood shelves and a grounded herbal desk.",
    image: "./assets/focus-room/innook/herbal-apothecary.jpg",
    ambientSound: "Nature",
    musicType: "Minimal",
    galleryOnly: !0
  },
  {
    id: "innook-garden-study",
    name: "花园书房",
    kicker: "绿意 · 窗边",
    description: "Garden light and a calm reading desk.",
    image: "./assets/focus-room/innook/garden-study-window.jpg",
    ambientSound: "Nature",
    musicType: "Piano",
    galleryOnly: !0
  },
  {
    id: "innook-summer-green",
    name: "夏日绿窗",
    kicker: "绿荫 · 明亮",
    description: "Bright summer greens for a fresh focus block.",
    image: "./assets/focus-room/innook/summer-green-window.jpg",
    ambientSound: "Nature",
    musicType: "Lo-fi",
    galleryOnly: !0
  },
  {
    id: "innook-forest-chimes",
    name: "林间风铃",
    kicker: "森林 · 轻风",
    description: "Forest light and soft outdoor calm.",
    image: "./assets/focus-room/innook/forest-window-chimes.jpg",
    ambientSound: "Nature",
    musicType: "Deep Focus",
    galleryOnly: !0
  }
], cC = [
  {
    ...Sn[0],
    name: "清晨窗边",
    kicker: "晨光 · 植物",
    description: "A bright morning desk beside a leafy window."
  },
  ...Sn.filter((e) => e.galleryOnly)
], f0 = [25, 45, 50, 90];
function dC(e = "") {
  const n = String(e || "");
  return Kn.find((o) => o.label === n) || Kn[0];
}
function fC(e = "") {
  const n = String(e || "");
  return Yn.find((o) => o.label === n) || Yn[0];
}
function za(e = {}) {
  const n = dC(e == null ? void 0 : e.musicType), o = fC(e == null ? void 0 : e.ambientSound);
  return {
    musicTrack: n,
    ambientSound: o,
    ambientLayers: o.layers.map((i) => ({
      ...i,
      volumeBias: Hn(i.volumeBias, 1)
    }))
  };
}
function pC(e) {
  return e && typeof e == "object" && !Array.isArray(e) ? e : {};
}
function p0(e) {
  return String(e || "").trim();
}
function mC({ material: e, goal: n, durationMinutes: o }) {
  var v;
  const i = Math.max(10, Number(o) || 25), a = (v = e == null ? void 0 : e.studyHeadings) != null && v.length ? e.studyHeadings : ["Key ideas", "Examples", "Practice", "Review"], c = String(n || "").trim() || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`, d = Math.max(1, Math.floor(i * 0.2)), f = Math.max(1, Math.floor(i * 0.4)), m = Math.max(1, Math.floor(i * 0.2)), y = Math.max(1, i - d - f - m);
  return [
    { minutes: d, task: `Set the goal: ${c}` },
    { minutes: f, task: `Review ${a[0] || "the core ideas"}` },
    { minutes: m, task: `Practice with ${a[1] || a[0] || "the generated examples"}` },
    { minutes: y, task: "Summarize mistakes and choose the next study step" }
  ];
}
function m0() {
  return zd(c0, null);
}
function hC(e) {
  return $d(c0, e || null);
}
function h0(e) {
  if (!e || typeof e != "object")
    return { materials: {} };
  const n = pC(e.materials);
  return {
    ...e,
    materials: { ...n }
  };
}
function fo(e, n = "idle") {
  const o = uC[String(e || "").trim().toLowerCase()];
  return o && Ly.includes(o) ? o : Ly.includes(n) ? n : "idle";
}
function Ud(e) {
  return fo(e) === "running" ? "studying" : fo(e);
}
function y0(e = {}, n = {}) {
  const o = e && typeof e == "object" ? e : {}, i = n && typeof n == "object" ? n : {}, a = Object.prototype.hasOwnProperty.call(o, "timerStatus"), c = Object.prototype.hasOwnProperty.call(o, "timerState") || Object.prototype.hasOwnProperty.call(o, "timerPhase"), d = fo(
    c ? o.timerState || o.timerPhase : a ? o.timerStatus : o.status || i.timerState,
    fo(i.timerState || i.timerPhase || i.timerStatus)
  ), f = o.timerMode === "countup" || i.timerMode === "countup" && !Object.prototype.hasOwnProperty.call(o, "timerMode") ? "countup" : "countdown", y = Object.fromEntries(["timerAnchorAtMs", "timerPausedAtMs", "timerUpdatedAtMs", "timerRestoredAtMs"].map((l) => {
    const p = Object.prototype.hasOwnProperty.call(o, l) ? o[l] : i[l], S = Number(p);
    return [l, Number.isFinite(S) && S > 0 ? S : null];
  })), v = Math.max(0, Hn(
    Object.prototype.hasOwnProperty.call(o, "elapsedSeconds") ? o.elapsedSeconds : i.elapsedSeconds,
    0
  ));
  return {
    ...i,
    ...o,
    timerState: d,
    timerPhase: d,
    status: d,
    timerStatus: Ud(d),
    timerMode: f,
    elapsedSeconds: v,
    ...y
  };
}
function g0() {
  return h0(zd(d0, null));
}
function yC(e) {
  return $d(d0, h0(e));
}
function v0(e) {
  const n = p0(e);
  if (!n) return null;
  const i = g0().materials[n];
  return i && typeof i == "object" ? y0(i) : null;
}
function Hd(e, n) {
  const o = p0(e);
  if (!o) return !1;
  const i = g0();
  return n && typeof n == "object" ? i.materials[o] = {
    ...y0(n, i.materials[o]),
    materialId: o,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  } : delete i.materials[o], yC(i);
}
function pa(e) {
  return Hd(e, null);
}
function Hc() {
  const e = zd(u0, []), n = Array.isArray(e) ? e : [], o = /* @__PURE__ */ new Set();
  return [...Uc, ...n].filter((i) => {
    const a = String((i == null ? void 0 : i.sessionId) || "");
    return !a || o.has(a) ? !1 : (o.add(a), !0);
  }).slice(0, $c);
}
function Hn(e, n) {
  const o = Number(e);
  return Number.isFinite(o) ? o : n;
}
function gC(e = {}) {
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
  }, persisted: !0 }, a = Hc().filter((m) => m.sessionId !== i.sessionId), c = [i, ...a.map((m) => ({ ...m, persisted: !0 }))].slice(0, $c), d = $d(u0, c), f = { ...i, persisted: d };
  return aC(f).catch((m) => {
    console.warn("Synapse data API focus-session background save failed:", m);
  }), d ? Uc = [] : Uc = [f, ...a].slice(0, $c), f;
}
function S0(e) {
  const n = Math.max(0, Hn(e || 0, 0)), o = Math.floor(n / 3600), i = Math.floor(n % 3600 / 60);
  return o ? `${o}h ${i}m` : `${i}m`;
}
var yg;
const Wc = ((yg = Sn[0]) == null ? void 0 : yg.id) || "morning-window", ao = f0[0] || 25, vC = 10, $a = 180, Wd = 60, w0 = $a * 60, SC = 0, wC = 100, xC = ["materials", "notes", "sources", "chat", "quiz", "flashcards", "mindmap", "plan", "workspace", "history"], Gc = new Set(xC), ba = {
  type: "spring",
  stiffness: 120,
  damping: 18,
  mass: 0.8
};
function _C(e, n, o, i) {
  const a = Number(e);
  return Number.isFinite(a) ? Math.min(i, Math.max(o, a)) : n;
}
function xr(e, n, o, i) {
  return Math.round(_C(e, n, o, i));
}
function xt(e, n = 50) {
  return xr(e, n, SC, wC);
}
function vr(e, n = ao) {
  return xr(e, n, vC, $a);
}
function en(e, n = ao * 60) {
  return xr(e, n, Wd, w0);
}
function Ea(e) {
  return Sn.find((n) => n.id === e) || null;
}
function gn(e = Wc) {
  return Ea(e) || Sn[0] || {
    id: Wc,
    name: "Focus Room",
    kicker: "Focus",
    description: "A quiet study space.",
    image: "",
    ambientSound: "Nature",
    musicType: "Deep Focus"
  };
}
function x0(e) {
  return Array.isArray(e) ? e.map((n) => ({
    minutes: xr(n == null ? void 0 : n.minutes, 5, 1, $a),
    task: String((n == null ? void 0 : n.task) || "").trim()
  })).filter((n) => n.task) : [];
}
function li(e) {
  return Array.isArray(e) ? e.map((n) => ({
    role: String((n == null ? void 0 : n.role) || "assistant") === "user" ? "user" : "assistant",
    text: String((n == null ? void 0 : n.text) || "").trim(),
    createdAt: (n == null ? void 0 : n.createdAt) || (/* @__PURE__ */ new Date()).toISOString()
  })).filter((n) => n.text).slice(-24) : [];
}
function _0(e) {
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
function Kc(e, n, o) {
  return e ? mC({
    material: e,
    goal: n,
    durationMinutes: o
  }) : [];
}
function Si(e) {
  const n = vr(e);
  return n > 0 ? n * 60 : 0;
}
function Yc(e) {
  const n = Math.max(0, Math.floor(Number(e) || 0)), o = Math.floor(n / 3600), i = Math.floor(n % 3600 / 60), a = n % 60, c = (d) => String(d).padStart(2, "0");
  return o ? `${o}:${c(i)}:${c(a)}` : `${c(i)}:${c(a)}`;
}
function Vy(e) {
  const n = (e == null ? void 0 : e.flashcards) || [];
  return Array.isArray(n) ? n.slice(0, 24) : [];
}
function TC(e, n) {
  return String((e == null ? void 0 : e.id) || (e == null ? void 0 : e.front) || (e == null ? void 0 : e.term) || n);
}
function kC(e) {
  var n;
  return Array.isArray(e == null ? void 0 : e.questions) ? e.questions : Array.isArray((n = e == null ? void 0 : e.quiz) == null ? void 0 : n.questions) ? e.quiz.questions : [];
}
function Qc(e) {
  return (Array.isArray(e == null ? void 0 : e.quizzes) ? e.quizzes : []).flatMap((o) => kC(o).map((i) => {
    var a;
    return {
      ...i,
      quizTitle: (o == null ? void 0 : o.title) || ((a = o == null ? void 0 : o.quiz) == null ? void 0 : a.title) || "Saved quiz"
    };
  })).slice(0, 12);
}
function AC(e, n) {
  return (e == null ? void 0 : e.question) || (e == null ? void 0 : e.prompt) || (e == null ? void 0 : e.stem) || `Question ${n + 1}`;
}
function Gd(e) {
  return String((e == null ? void 0 : e.type) || "").toLowerCase();
}
function CC(e) {
  return String((e == null ? void 0 : e.label) || (e == null ? void 0 : e.text) || e).trim();
}
function Ma(e) {
  const n = (e == null ? void 0 : e.choices) || (e == null ? void 0 : e.options) || (e == null ? void 0 : e.answers);
  return Array.isArray(n) && n.length ? n.map(CC).filter(Boolean) : Gd(e) === "true_false" ? ["True", "False"] : [];
}
function Xc(e) {
  const n = (e == null ? void 0 : e.correctOptionIndexes) || (e == null ? void 0 : e.correct_option_indexes) || (e == null ? void 0 : e.correctIndexes);
  return Array.isArray(n) ? n.map((o) => Number(o)).filter(Number.isInteger) : [];
}
function PC(e, n) {
  const o = Array.isArray(e) ? [...e].map(Number).filter(Number.isInteger).sort((a, c) => a - c) : [], i = Array.isArray(n) ? [...n].map(Number).filter(Number.isInteger).sort((a, c) => a - c) : [];
  return o.length === i.length && o.every((a, c) => a === i[c]);
}
function _r(e) {
  return String(e || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function Ra(e, n) {
  if (Number.isInteger(n)) return n;
  const o = Number(n);
  if (typeof n != "string" && Number.isInteger(o)) return o;
  const i = Ma(e), a = _r(n);
  return i.findIndex((c) => _r(c) === a);
}
function T0(e, n) {
  if (typeof n == "boolean") return n;
  if (n === 0) return !0;
  if (n === 1) return !1;
  const o = Ma(e), i = _r(n);
  return i === "true" ? !0 : i === "false" ? !1 : _r(o[0]) === i ? !0 : _r(o[1]) === i ? !1 : null;
}
function bC(e, n, o) {
  const i = Gd(e);
  if (i === "multiple_choice") {
    const a = Ra(e, n);
    if (!Number.isInteger(a) || a < 0) return [];
    const c = Array.isArray(o) ? [...o] : [];
    return c.includes(a) ? c.filter((d) => d !== a) : [...c, a].sort((d, f) => d - f);
  }
  if (i === "single_choice") {
    const a = Ra(e, n);
    return Number.isInteger(a) && a >= 0 ? a : "";
  }
  if (i === "true_false") {
    const a = T0(e, n);
    return a === null ? "" : a;
  }
  return String(n || "");
}
function k0(e) {
  const n = (e == null ? void 0 : e.correctAnswer) ?? (e == null ? void 0 : e.correct_answer) ?? (e == null ? void 0 : e.answer) ?? (e == null ? void 0 : e.correct), o = Xc(e);
  if (o.length) {
    const i = Ma(e);
    return o.map((a) => i[a] || "").filter(Boolean).join(", ");
  }
  if (typeof (e == null ? void 0 : e.correctBoolean) == "boolean" || typeof (e == null ? void 0 : e.correct_boolean) == "boolean") {
    const i = Ma(e);
    return (typeof e.correctBoolean == "boolean" ? e.correctBoolean : e.correct_boolean) ? i[0] || "True" : i[1] || "False";
  }
  return e != null && e.expectedAnswer || e != null && e.expected_answer ? String(e.expectedAnswer || e.expected_answer || "").trim() : Array.isArray(n) ? n.map((i) => String(i)).join(", ") : String(n || "").trim();
}
function EC(e, n) {
  const o = Gd(e);
  if (o === "single_choice") {
    const a = Xc(e)[0], c = Ra(e, n);
    return Number.isInteger(a) ? c === a : null;
  }
  if (o === "multiple_choice") {
    const a = Xc(e), c = Array.isArray(n) ? n : [Ra(e, n)].filter(Number.isInteger);
    return a.length ? PC(c, a) : null;
  }
  if (o === "true_false") {
    const a = typeof (e == null ? void 0 : e.correctBoolean) == "boolean" ? e.correctBoolean : e == null ? void 0 : e.correct_boolean, c = T0(e, n);
    return typeof a == "boolean" && c !== null ? c === a : null;
  }
  const i = k0(e);
  return i ? _r(n) === _r(i) : null;
}
function A0(e, n, o) {
  var f;
  const i = String(e || "").trim(), a = String((n == null ? void 0 : n.summaryText) || (n == null ? void 0 : n.aiSummary) || "").slice(0, 420), c = ((f = n == null ? void 0 : n.studyHeadings) == null ? void 0 : f[0]) || (n == null ? void 0 : n.materialTitle) || "this material", d = o || `Study ${(n == null ? void 0 : n.materialTitle) || "this material"}`;
  return i ? [
    `For ${c}: ${a || "use the selected material as your main source."}`,
    `Your current goal is: ${d}.`,
    "Try explaining the idea in one sentence, then test yourself with one example before moving on."
  ].join(" ") : "";
}
function MC() {
  return /* @__PURE__ */ x.jsx("svg", { className: "liquid-glass-filter-defs", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ x.jsx("defs", { children: /* @__PURE__ */ x.jsxs("filter", { id: "liquid-glass-displacement", x: "-12%", y: "-12%", width: "124%", height: "124%", colorInterpolationFilters: "sRGB", children: [
    /* @__PURE__ */ x.jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.012 0.024", numOctaves: "2", seed: "17", result: "liquid-noise" }),
    /* @__PURE__ */ x.jsx("feDisplacementMap", { in: "SourceGraphic", in2: "liquid-noise", scale: "7", xChannelSelector: "R", yChannelSelector: "B", result: "refracted-surface" }),
    /* @__PURE__ */ x.jsx("feColorMatrix", { in: "refracted-surface", type: "matrix", values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.04 0", result: "edge-alpha" }),
    /* @__PURE__ */ x.jsx("feGaussianBlur", { in: "edge-alpha", stdDeviation: "0.25", result: "soft-edge" }),
    /* @__PURE__ */ x.jsx("feBlend", { in: "soft-edge", in2: "refracted-surface", mode: "screen" })
  ] }) }) });
}
function RC({ scene: e }) {
  const [n, o] = C.useState(!1), [i, a] = C.useState(!1);
  return C.useEffect(() => {
    o(!1), a(!1);
  }, [e == null ? void 0 : e.id]), /* @__PURE__ */ x.jsxs("div", { className: "focus-background-wrap", "aria-hidden": "true", children: [
    /* @__PURE__ */ x.jsx(MC, {}),
    /* @__PURE__ */ x.jsx(Va, { mode: "wait", children: /* @__PURE__ */ x.jsxs(
      vn.div,
      {
        className: "focus-background",
        style: { backgroundImage: i ? "none" : void 0 },
        initial: { opacity: 0, scale: 1.035 },
        animate: { opacity: 1, scale: 1.02 },
        exit: { opacity: 0, scale: 1.015 },
        transition: { duration: 0.8, ease: "easeOut" },
        children: [
          e != null && e.image ? /* @__PURE__ */ x.jsx(
            "img",
            {
              className: `focus-background-media focus-background-poster ${n ? "is-ready" : ""}`.trim(),
              src: e.image,
              alt: "",
              onLoad: () => o(!0),
              onError: () => a(!0)
            }
          ) : null,
          e != null && e.video ? /* @__PURE__ */ x.jsx(
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
const DC = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), NC = (e) => e.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (n, o, i) => i ? i.toUpperCase() : o.toLowerCase()
), By = (e) => {
  const n = NC(e);
  return n.charAt(0).toUpperCase() + n.slice(1);
}, C0 = (...e) => e.filter((n, o, i) => !!n && n.trim() !== "" && i.indexOf(n) === o).join(" ").trim(), jC = (e) => {
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
var IC = {
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
const FC = C.forwardRef(
  ({
    color: e = "currentColor",
    size: n = 24,
    strokeWidth: o = 2,
    absoluteStrokeWidth: i,
    className: a = "",
    children: c,
    iconNode: d,
    ...f
  }, m) => C.createElement(
    "svg",
    {
      ref: m,
      ...IC,
      width: n,
      height: n,
      stroke: e,
      strokeWidth: i ? Number(o) * 24 / Number(n) : o,
      className: C0("lucide", a),
      ...!c && !jC(f) && { "aria-hidden": "true" },
      ...f
    },
    [
      ...d.map(([y, v]) => C.createElement(y, v)),
      ...Array.isArray(c) ? c : [c]
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
    ({ className: i, ...a }, c) => C.createElement(FC, {
      ref: c,
      iconNode: n,
      className: C0(
        `lucide-${DC(By(e))}`,
        `lucide-${e}`,
        i
      ),
      ...a
    })
  );
  return o.displayName = By(e), o;
};
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const OC = [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
], LC = Ae("arrow-left", OC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const VC = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
], BC = Ae("arrow-right", VC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const zC = [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]], P0 = Ae("check", zC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const $C = [["path", { d: "m15 18-6-6 6-6", key: "1wnfg3" }]], UC = Ae("chevron-left", $C);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const HC = [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]], WC = Ae("chevron-right", HC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const GC = [
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
], KC = Ae("coffee", GC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const YC = [
  ["rect", { width: "12", height: "12", x: "2", y: "10", rx: "2", ry: "2", key: "6agr2n" }],
  [
    "path",
    { d: "m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6", key: "1o487t" }
  ],
  ["path", { d: "M6 18h.01", key: "uhywen" }],
  ["path", { d: "M10 14h.01", key: "ssrbsk" }],
  ["path", { d: "M15 6h.01", key: "cblpky" }],
  ["path", { d: "M18 9h.01", key: "2061c0" }]
], QC = Ae("dices", YC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const XC = [
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
], ZC = Ae("door-open", XC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const JC = [
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
], Da = Ae("footprints", JC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const qC = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }],
  ["path", { d: "M12 7v5l4 2", key: "1fdv2h" }]
], eP = Ae("history", qC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const tP = [
  ["path", { d: "m14 10 7-7", key: "oa77jy" }],
  ["path", { d: "M20 10h-6V4", key: "mjg0md" }],
  ["path", { d: "m3 21 7-7", key: "tjx5ai" }],
  ["path", { d: "M4 14h6v6", key: "rmj7iw" }]
], nP = Ae("minimize-2", tP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const rP = [
  ["circle", { cx: "8", cy: "18", r: "4", key: "1fc0mg" }],
  ["path", { d: "M12 18V2l7 4", key: "g04rme" }]
], oP = Ae("music-2", rP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const iP = [
  ["rect", { x: "14", y: "4", width: "4", height: "16", rx: "1", key: "zuxfzm" }],
  ["rect", { x: "6", y: "4", width: "4", height: "16", rx: "1", key: "1okwgv" }]
], zy = Ae("pause", iP);
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
      d: "M18.5 8c-1.4 0-2.6-.8-3.2-2A6.87 6.87 0 0 0 2 9v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.5C22 9.6 20.4 8 18.5 8",
      key: "lag0yf"
    }
  ],
  ["path", { d: "M2 14h20", key: "myj16y" }],
  ["path", { d: "M6 14v4", key: "9ng0ue" }],
  ["path", { d: "M10 14v4", key: "1v8uk5" }],
  ["path", { d: "M14 14v4", key: "1tqops" }],
  ["path", { d: "M18 14v4", key: "18uqwm" }]
], aP = Ae("piano", sP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const lP = [["polygon", { points: "6 3 20 12 6 21 6 3", key: "1oa8hb" }]], uP = Ae("play", lP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const cP = [
  ["path", { d: "M4.9 19.1C1 15.2 1 8.8 4.9 4.9", key: "1vaf9d" }],
  ["path", { d: "M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5", key: "u1ii0m" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }],
  ["path", { d: "M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5", key: "1j5fej" }],
  ["path", { d: "M19.1 4.9C23 8.8 23 15.1 19.1 19", key: "10b0cb" }]
], dP = Ae("radio", cP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const fP = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
], pP = Ae("rotate-ccw", fP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const mP = [
  [
    "path",
    {
      d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
      key: "1c8476"
    }
  ],
  ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7", key: "1ydtos" }],
  ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7", key: "t51u73" }]
], b0 = Ae("save", mP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const hP = [
  ["path", { d: "M14 17H5", key: "gfn3mx" }],
  ["path", { d: "M19 7h-9", key: "6i9tg" }],
  ["circle", { cx: "17", cy: "17", r: "3", key: "18b49y" }],
  ["circle", { cx: "7", cy: "7", r: "3", key: "dfmy0x" }]
], E0 = Ae("settings-2", hP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const yP = [
  ["path", { d: "m18 14 4 4-4 4", key: "10pe0f" }],
  ["path", { d: "m18 2 4 4-4 4", key: "pucp1d" }],
  ["path", { d: "M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22", key: "1ailkh" }],
  ["path", { d: "M2 6h1.972a4 4 0 0 1 3.6 2.2", key: "km57vx" }],
  ["path", { d: "M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45", key: "os18l9" }]
], gP = Ae("shuffle", yP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const vP = [
  ["polygon", { points: "5 4 15 12 5 20 5 4", key: "16p6eg" }],
  ["line", { x1: "19", x2: "19", y1: "5", y2: "19", key: "futhcm" }]
], SP = Ae("skip-forward", vP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const wP = [
  ["line", { x1: "21", x2: "14", y1: "4", y2: "4", key: "obuewd" }],
  ["line", { x1: "10", x2: "3", y1: "4", y2: "4", key: "1q6298" }],
  ["line", { x1: "21", x2: "12", y1: "12", y2: "12", key: "1iu8h1" }],
  ["line", { x1: "8", x2: "3", y1: "12", y2: "12", key: "ntss68" }],
  ["line", { x1: "21", x2: "16", y1: "20", y2: "20", key: "14d8ph" }],
  ["line", { x1: "12", x2: "3", y1: "20", y2: "20", key: "m0wm8r" }],
  ["line", { x1: "14", x2: "14", y1: "2", y2: "6", key: "14e1ph" }],
  ["line", { x1: "8", x2: "8", y1: "10", y2: "14", key: "1i6ji0" }],
  ["line", { x1: "16", x2: "16", y1: "18", y2: "22", key: "1lctlv" }]
], xP = Ae("sliders-horizontal", wP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const _P = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["circle", { cx: "12", cy: "12", r: "6", key: "1vlfrh" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }]
], TP = Ae("target", _P);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const kP = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744", key: "16gr8j" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }]
], Na = Ae("users", kP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const AP = [
  [
    "path",
    {
      d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
      key: "uqj9uw"
    }
  ],
  ["path", { d: "M16 9a5 5 0 0 1 0 6", key: "1q6k2b" }],
  ["path", { d: "M19.364 18.364a9 9 0 0 0 0-12.728", key: "ijwkga" }]
], Ua = Ae("volume-2", AP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const CP = [
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
], Kd = Ae("waves", CP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const PP = [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
], M0 = Ae("x", PP), $y = (e) => {
  let n;
  const o = /* @__PURE__ */ new Set(), i = (y, v) => {
    const l = typeof y == "function" ? y(n) : y;
    if (!Object.is(l, n)) {
      const p = n;
      n = v ?? (typeof l != "object" || l === null) ? l : Object.assign({}, n, l), o.forEach((S) => S(n, p));
    }
  }, a = () => n, f = { setState: i, getState: a, getInitialState: () => m, subscribe: (y) => (o.add(y), () => o.delete(y)) }, m = n = e(i, a, f);
  return f;
}, bP = ((e) => e ? $y(e) : $y), EP = (e) => e;
function MP(e, n = EP) {
  const o = yn.useSyncExternalStore(
    e.subscribe,
    yn.useCallback(() => n(e.getState()), [e, n]),
    yn.useCallback(() => n(e.getInitialState()), [e, n])
  );
  return yn.useDebugValue(o), o;
}
const Uy = (e) => {
  const n = bP(e), o = (i) => MP(n, i);
  return Object.assign(o, n), o;
}, RP = ((e) => e ? Uy(e) : Uy), pi = Object.freeze({
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
function DP() {
  return Sn[0] || gn(Wc);
}
function Zc(e) {
  const n = String(e || "");
  if (!n) return null;
  const i = _0(m0()).materials[n];
  return i && typeof i == "object" ? i : null;
}
function pn(e) {
  var i;
  const n = String(e.selectedMaterialId || ((i = e.selectedMaterial) == null ? void 0 : i.materialId) || "");
  if (!n) return;
  const o = _0(m0());
  o.materials[n] = {
    materialId: n,
    selectedScene: e.selectedScene,
    musicType: e.musicType,
    ambientSound: e.ambientSound,
    musicVolume: xt(e.musicVolume),
    ambientVolume: xt(e.ambientVolume),
    audioChannels: { ...pi, ...e.audioChannels || {} },
    durationMinutes: vr(e.pomodoroDuration),
    durationSeconds: en(e.pomodoroDurationSeconds, Si(e.pomodoroDuration)),
    studyGoal: e.studyGoal,
    studyPlan: x0(e.studyPlan),
    completedTasks: Array.isArray(e.completedTasks) ? e.completedTasks.filter(Boolean) : [],
    workspaceNotes: String(e.workspaceNotes || ""),
    workspaceUpdatedAt: e.workspaceUpdatedAt || "",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }, hC(o);
}
function NP(e) {
  return Array.isArray(e == null ? void 0 : e.completedTasks) ? e.completedTasks.map((n) => String(n || "").trim()).filter(Boolean) : [];
}
function Jc(e = {}) {
  return {
    sectionTitle: String(e.sectionTitle || "").trim(),
    excerpt: String(e.excerpt || "").trim().slice(0, 1800)
  };
}
function R0(e = null) {
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
function it() {
  const e = Date.now();
  return Number.isFinite(e) ? e : 0;
}
function $t(e = {}) {
  return fo(e.timerState || e.timerPhase || e.status || e.timerStatus);
}
function hr(e = {}) {
  const n = Number(e.pomodoroDurationSeconds);
  return Number.isFinite(n) && n > 0 ? en(n, Si(e.pomodoroDuration)) : Si(e.pomodoroDuration);
}
function Wn(e = {}) {
  if (e.timerMode === "countup") return 0;
  const n = Number(e.timerDurationSeconds);
  return Number.isFinite(n) && n > 0 ? n : hr(e);
}
function ja(e = {}, n = it()) {
  const o = Math.max(0, Number(e.elapsedSeconds) || 0);
  if ($t(e) !== "running") return o;
  const i = Number(e.timerAnchorAtMs);
  return !Number.isFinite(i) || i <= 0 ? o : Math.max(o, Math.floor(Math.max(0, n - i) / 1e3));
}
function Et(e, n = it()) {
  const o = fo(e);
  return {
    timerState: o,
    timerPhase: o,
    status: o,
    timerStatus: Ud(o),
    timerUpdatedAtMs: n
  };
}
function jP(e = {}) {
  const n = $t(e);
  return {
    timerState: n,
    timerPhase: n,
    status: n,
    timerStatus: Ud(n),
    timerMode: e.timerMode === "countup" ? "countup" : "countdown",
    timerAnchorAtMs: Number.isFinite(Number(e.timerAnchorAtMs)) ? Number(e.timerAnchorAtMs) : null,
    timerPausedAtMs: Number.isFinite(Number(e.timerPausedAtMs)) ? Number(e.timerPausedAtMs) : null,
    timerUpdatedAtMs: Number.isFinite(Number(e.timerUpdatedAtMs)) ? Number(e.timerUpdatedAtMs) : null,
    timerRestoredAtMs: Number.isFinite(Number(e.timerRestoredAtMs)) ? Number(e.timerRestoredAtMs) : null,
    timerDurationSeconds: Wn(e),
    pomodoroDuration: e.pomodoroDuration,
    pomodoroDurationSeconds: hr(e),
    elapsedSeconds: Math.max(0, Number(e.elapsedSeconds) || 0),
    startedAt: e.startedAt || null,
    currentSession: e.currentSession || null,
    view: e.view
  };
}
function zn(e) {
  var o;
  const n = String(e.selectedMaterialId || ((o = e.selectedMaterial) == null ? void 0 : o.materialId) || "");
  return !n || e.view !== "session" ? !1 : Hd(n, jP(e));
}
function Hy(e, n = it()) {
  const o = ja(e, n), i = Wn(e), a = e.timerMode !== "countup" && i > 0 && o >= i, c = a ? "completed" : $t(e);
  return {
    ...Et(c, n),
    elapsedSeconds: a ? i : o,
    timerAnchorAtMs: c === "running" ? e.timerAnchorAtMs : null,
    timerPausedAtMs: c === "running" ? null : e.timerPausedAtMs || n,
    audioPlaying: c === "running" ? e.audioPlaying : !1
  };
}
function IP(e, n = {}) {
  const o = gn(n.selectedScene), i = Zc(e == null ? void 0 : e.materialId), a = Ea(i == null ? void 0 : i.selectedScene) ? i.selectedScene : o.id, c = gn(a), d = String((i == null ? void 0 : i.musicType) || c.musicType || "Deep Focus"), f = String((i == null ? void 0 : i.ambientSound) || c.ambientSound || "Nature"), m = xt(i == null ? void 0 : i.musicVolume, n.musicVolume ?? 60), y = xt(i == null ? void 0 : i.ambientVolume, n.ambientVolume ?? 50), v = vr(i == null ? void 0 : i.durationMinutes, n.pomodoroDuration ?? ao), l = en(
    i == null ? void 0 : i.durationSeconds,
    n.pomodoroDurationSeconds ?? v * 60
  ), p = String((i == null ? void 0 : i.studyGoal) || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`), S = x0(i == null ? void 0 : i.studyPlan), w = S.length ? S : Kc(e, p, v), k = NP(i), A = String((i == null ? void 0 : i.workspaceNotes) || ""), T = (i == null ? void 0 : i.workspaceUpdatedAt) || (i == null ? void 0 : i.updatedAt) || "";
  return {
    selectedScene: a,
    musicType: d,
    ambientSound: f,
    musicVolume: m,
    ambientVolume: y,
    audioChannels: { ...pi, ...(i == null ? void 0 : i.audioChannels) || n.audioChannels || {} },
    pomodoroDuration: v,
    pomodoroDurationSeconds: l,
    studyGoal: p,
    studyPlan: w,
    completedTasks: k,
    workspaceNotes: A,
    workspaceUpdatedAt: T
  };
}
function Wy(e) {
  const n = v0(e);
  if (!n || typeof n != "object") return null;
  const o = $t(n), i = it(), a = Number(n.timerAnchorAtMs), c = Date.parse(n.startedAt || ""), d = Number.isFinite(c) ? c : NaN, f = o === "running" ? ja({
    ...n,
    timerState: "running",
    timerAnchorAtMs: Number.isFinite(a) && a > 0 ? a : d
  }, i) : Math.max(0, Number(n.elapsedSeconds) || 0), m = Wn(n), y = o === "running" ? m > 0 && f >= m ? "completed" : "paused" : o, v = o === "running";
  return {
    route: n.view === "session" ? "session" : "setup",
    view: n.view === "session" ? "session" : "setup",
    ...Et(v ? "restoring" : y, i),
    timerRestoreTarget: v ? y : null,
    timerMode: n.timerMode === "countup" ? "countup" : "countdown",
    timerAnchorAtMs: null,
    timerPausedAtMs: v ? null : Number(n.timerPausedAtMs) || null,
    timerRestoredAtMs: v ? null : i,
    timerDurationSeconds: m,
    ...Number(n.pomodoroDurationSeconds) > 0 ? { pomodoroDurationSeconds: en(n.pomodoroDurationSeconds) } : {},
    elapsedSeconds: m > 0 ? Math.min(m, f) : f,
    startedAt: n.startedAt || null,
    currentSession: n.currentSession || null,
    completedTasks: Array.isArray(n.completedTasks) ? n.completedTasks.filter(Boolean) : [],
    flashcardIndex: Math.max(0, Number(n.flashcardIndex) || 0),
    flashcardSide: n.flashcardSide === "back" ? "back" : "front",
    flashcardProgress: n.flashcardProgress && typeof n.flashcardProgress == "object" && !Array.isArray(n.flashcardProgress) ? n.flashcardProgress : {},
    quizAnswers: n.quizAnswers && typeof n.quizAnswers == "object" && !Array.isArray(n.quizAnswers) ? n.quizAnswers : {},
    quizChecked: n.quizChecked && typeof n.quizChecked == "object" && !Array.isArray(n.quizChecked) ? n.quizChecked : {},
    chatMessages: li(n.chatMessages),
    chatPending: !1,
    chatError: "",
    panelTab: Gc.has(n.panelTab) ? n.panelTab : "materials",
    workspaceNotes: String(n.workspaceNotes || ""),
    workspaceUpdatedAt: n.workspaceUpdatedAt || n.updatedAt || "",
    activeNoteSection: String(n.activeNoteSection || ""),
    activeSourceHighlight: R0(n.activeSourceHighlight),
    assistantContext: Jc(n.assistantContext),
    audioPlaying: !1
  };
}
function Ys() {
  return {
    completedTasks: [],
    flashcardIndex: 0,
    flashcardSide: "front",
    flashcardProgress: {},
    quizAnswers: {},
    quizChecked: {}
  };
}
function FP(e) {
  return Object.values(e.flashcardProgress || {}).filter((n) => n && n.difficulty).length;
}
function OP(e) {
  const n = Object.values(e.quizChecked || {}).filter((i) => i && i.hasKnownAnswer);
  if (!n.length) return null;
  const o = n.filter((i) => i.correct).length;
  return Math.round(o / n.length * 100);
}
function LP(e) {
  const n = Qc(e.selectedMaterial);
  return Object.entries(e.quizChecked || {}).filter(([, o]) => o && o.hasKnownAnswer && !o.correct).map(([o]) => AC(n[Number(o)], Number(o))).filter(Boolean);
}
async function VP(e, n, o, i = {}) {
  var d, f;
  if (!globalThis.apiClient || typeof globalThis.apiClient.fetch != "function")
    return {
      answer: A0(e, o, Q.getState().studyGoal),
      offline: !0
    };
  const a = await globalThis.apiClient.fetch("/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: e,
      selected_section: i.sectionTitle || ((d = o == null ? void 0 : o.studyHeadings) == null ? void 0 : d[0]) || "",
      selected_excerpt: i.excerpt || "",
      source_strict: !!(o != null && o.isSourceRestricted),
      preferred_language: ((f = globalThis.preferredLanguage) == null ? void 0 : f.value) || "auto",
      title: (o == null ? void 0 : o.materialTitle) || "Study material",
      summary: (o == null ? void 0 : o.aiSummary) || (o == null ? void 0 : o.summaryText) || "",
      sections: (o == null ? void 0 : o.sections) || {},
      source_identity: (o == null ? void 0 : o.materialId) || "",
      source_fingerprint: (o == null ? void 0 : o.sourceFingerprint) || "",
      chat_history: n
    })
  });
  let c = null;
  try {
    c = await a.json();
  } catch {
    throw new Error("Backend returned non-JSON response.");
  }
  if (!a.ok || c != null && c.error)
    throw new Error((c == null ? void 0 : c.error) || "AI request failed.");
  return {
    answer: (c == null ? void 0 : c.answer) || "No answer returned.",
    usedExternalResearch: !!(c != null && c.used_external_research),
    researchSources: Array.isArray(c == null ? void 0 : c.research_sources) ? c.research_sources : []
  };
}
const Q = RP((e, n) => {
  const o = DP(), i = Zc("focus-room"), a = Ea(i == null ? void 0 : i.selectedScene) ? gn(i.selectedScene) : o, c = vr(i == null ? void 0 : i.durationMinutes, ao), d = en(
    i == null ? void 0 : i.durationSeconds,
    Si(c)
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
    musicVolume: xt(i == null ? void 0 : i.musicVolume, 60),
    ambientVolume: xt(i == null ? void 0 : i.ambientVolume, 50),
    audioChannels: { ...pi, ...(i == null ? void 0 : i.audioChannels) || {} },
    pomodoroDuration: c,
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
    studyGoal: String((i == null ? void 0 : i.studyGoal) || "Deep work block"),
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
    setIdle: (f) => e({ isIdle: f }),
    initializeFocusRoom() {
      const f = n(), m = v0("focus-room"), y = Wy("focus-room"), v = $t(m || {});
      if (!!((y == null ? void 0 : y.view) === "session" && y.currentSession && v === "running")) {
        const A = gn((m == null ? void 0 : m.selectedScene) || f.selectedScene);
        e({
          selectedMaterialId: "focus-room",
          selectedMaterial: null,
          studyPlan: Array.isArray(m == null ? void 0 : m.studyPlan) ? m.studyPlan : [],
          selectedScene: A.id,
          musicType: (m == null ? void 0 : m.musicType) || f.musicType,
          ambientSound: (m == null ? void 0 : m.ambientSound) || f.ambientSound,
          musicVolume: xt(m == null ? void 0 : m.musicVolume, f.musicVolume),
          ambientVolume: xt(m == null ? void 0 : m.ambientVolume, f.ambientVolume),
          audioChannels: { ...pi, ...(m == null ? void 0 : m.audioChannels) || f.audioChannels || {} },
          pomodoroDuration: vr(m == null ? void 0 : m.pomodoroDuration, f.pomodoroDuration),
          pomodoroDurationSeconds: en(
            m == null ? void 0 : m.pomodoroDurationSeconds,
            f.pomodoroDurationSeconds
          ),
          studyGoal: String((m == null ? void 0 : m.studyGoal) || f.studyGoal || "Deep work block"),
          summaryRecord: null,
          ...y,
          route: "session",
          view: "session"
        });
        return;
      }
      pa("focus-room");
      const p = Zc("focus-room"), S = gn((p == null ? void 0 : p.selectedScene) || f.selectedScene), w = vr(p == null ? void 0 : p.durationMinutes, f.pomodoroDuration || ao), k = en(
        p == null ? void 0 : p.durationSeconds,
        f.pomodoroDurationSeconds || Si(w)
      );
      e({
        route: "setup",
        view: "setup",
        selectedMaterialId: "focus-room",
        selectedMaterial: null,
        selectedScene: S.id,
        musicType: String((p == null ? void 0 : p.musicType) || S.musicType || f.musicType || "Deep Focus"),
        ambientSound: String((p == null ? void 0 : p.ambientSound) || S.ambientSound || f.ambientSound || "Nature"),
        musicVolume: xt(p == null ? void 0 : p.musicVolume, f.musicVolume ?? 60),
        ambientVolume: xt(p == null ? void 0 : p.ambientVolume, f.ambientVolume ?? 50),
        audioChannels: { ...pi, ...(p == null ? void 0 : p.audioChannels) || f.audioChannels || {} },
        pomodoroDuration: w,
        pomodoroDurationSeconds: k,
        timerDurationSeconds: k,
        studyGoal: String((p == null ? void 0 : p.studyGoal) || f.studyGoal || "Deep work block"),
        studyPlan: [],
        completedTasks: [],
        currentSession: null,
        summaryRecord: null,
        audioPlaying: !1,
        elapsedSeconds: 0,
        startedAt: null,
        ...Et("idle", it()),
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        workspaceNotes: String((p == null ? void 0 : p.workspaceNotes) || f.workspaceNotes || ""),
        workspaceUpdatedAt: (p == null ? void 0 : p.workspaceUpdatedAt) || f.workspaceUpdatedAt || ""
      });
    },
    returnToSetup() {
      const f = n();
      pn(f), pa("focus-room"), e({
        route: "setup",
        view: "setup",
        currentSession: null,
        summaryRecord: null,
        audioPlaying: !1,
        aiPanelOpen: !1,
        activeDrawer: "",
        elapsedSeconds: 0,
        startedAt: null,
        ...Et("idle", it()),
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        timerDurationSeconds: hr(f)
      });
    },
    setMaterialsState({ items: f = [], status: m = "ready", error: y = "" } = {}) {
      e({
        materials: Array.isArray(f) ? f : [],
        materialsStatus: m === "error" ? "error" : m === "loading" ? "loading" : "ready",
        materialsError: String(y || "")
      });
    },
    hydrateFocusRoute(f, m, { preserveSession: y = !1 } = {}) {
      const v = n(), l = !!m, p = l ? m.materialId : String(f.materialId || "");
      if (!l) {
        e({
          route: "setup",
          view: "setup",
          selectedMaterialId: p,
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
      const S = v.selectedMaterialId === p, w = S && y ? null : Wy(p), k = S && y ? {} : IP(m, v), A = S && y ? {} : {
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
        timerDurationSeconds: hr({
          pomodoroDuration: k.pomodoroDuration || ao,
          pomodoroDurationSeconds: k.pomodoroDurationSeconds
        }),
        elapsedSeconds: 0,
        startedAt: null,
        currentSession: null,
        ...Ys(),
        chatMessages: [],
        chatPending: !1,
        chatError: "",
        activeNoteSection: "",
        activeSourceHighlight: null,
        assistantContext: { sectionTitle: "", excerpt: "" }
      }, T = S && y ? v.view === "session" ? "session" : "setup" : (w == null ? void 0 : w.view) === "session" ? "session" : "setup";
      if (e({
        ...k,
        ...A,
        ...w,
        route: T,
        view: T,
        selectedMaterialId: p,
        selectedMaterial: m,
        aiPanelOpen: !1,
        activeDrawer: "",
        summaryRecord: null
      }), (w == null ? void 0 : w.timerState) === "restoring") {
        const P = w.timerRestoreTarget || "paused";
        Promise.resolve().then(() => {
          const E = n();
          if (E.selectedMaterialId !== p || E.timerState !== "restoring") return;
          const N = it(), O = Wn(E), W = O > 0 ? Math.min(O, Math.max(0, Number(E.elapsedSeconds) || 0)) : Math.max(0, Number(E.elapsedSeconds) || 0), G = {
            ...Et(P, N),
            timerRestoreTarget: null,
            timerAnchorAtMs: null,
            timerPausedAtMs: P === "paused" ? N : null,
            timerRestoredAtMs: N,
            elapsedSeconds: W,
            audioPlaying: !1
          };
          e(G), zn({ ...E, ...G });
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
        sessionHistory: Hc()
      });
    },
    selectScene(f) {
      const m = Ea(f);
      m && e((y) => {
        const v = {
          selectedScene: m.id,
          musicType: m.musicType || y.musicType,
          ambientSound: m.ambientSound || y.ambientSound
        }, l = { ...y, ...v };
        return pn(l), v;
      });
    },
    setPomodoroDurationSeconds(f) {
      e((m) => {
        const y = en(f, m.pomodoroDurationSeconds), v = Math.max(1, Math.round(y / 60)), l = m.selectedMaterial ? Kc(m.selectedMaterial, m.studyGoal, v) : [], p = {
          pomodoroDuration: v,
          pomodoroDurationSeconds: y,
          studyPlan: l,
          timerDurationSeconds: m.timerMode === "countup" ? 0 : y
        };
        return pn({ ...m, ...p }), p;
      });
    },
    setPomodoroDuration(f) {
      const m = vr(f, n().pomodoroDuration);
      n().setPomodoroDurationSeconds(m * 60);
    },
    setStudyGoal(f) {
      e((m) => {
        const y = String(f ?? ""), v = m.selectedMaterial ? Kc(m.selectedMaterial, y, m.pomodoroDuration) : [], l = { studyGoal: y, studyPlan: v };
        return pn({ ...m, ...l }), l;
      });
    },
    setSound(f, m) {
      e((y) => {
        var l;
        let v = {};
        if (f === "musicVolume" && (v = { musicVolume: xt(m, y.musicVolume) }), f === "ambientVolume" && (v = { ambientVolume: xt(m, y.ambientVolume) }), f === "musicType" && (v = { musicType: String(m || y.musicType) }), f === "ambientSound" && (v = { ambientSound: String(m || y.ambientSound) }), String(f).startsWith("audioChannel:")) {
          const p = String(f).slice(13);
          v = { audioChannels: { ...y.audioChannels, [p]: xt(m, ((l = y.audioChannels) == null ? void 0 : l[p]) ?? 0) } };
        }
        return pn({ ...y, ...v }), v;
      });
    },
    toggleAudio() {
      e((f) => ({ audioPlaying: !f.audioPlaying }));
    },
    setAudioPlaying(f) {
      e({ audioPlaying: !!f });
    },
    openDrawer(f) {
      e({
        activeDrawer: f
      });
    },
    closeDrawer() {
      e({
        activeDrawer: ""
      });
    },
    toggleAIPanel(f = null) {
      e((m) => ({ aiPanelOpen: typeof f == "boolean" ? f : !m.aiPanelOpen }));
    },
    openStudyPanel(f = "materials") {
      const m = Gc.has(String(f || "")) ? String(f) : "materials";
      e({
        panelTab: m,
        aiPanelOpen: !0,
        activeDrawer: ""
      });
    },
    selectSourceHighlight(f = null, { openPanel: m = !0 } = {}) {
      const y = R0(f);
      e({
        activeSourceHighlight: y,
        activeNoteSection: (y == null ? void 0 : y.sectionTitle) || n().activeNoteSection || "",
        assistantContext: y ? Jc({
          sectionTitle: y.sectionTitle,
          excerpt: y.excerpt
        }) : n().assistantContext,
        ...m ? { panelTab: "sources", aiPanelOpen: !0, activeDrawer: "" } : {}
      });
    },
    setActiveNoteSection(f = "") {
      e({
        activeNoteSection: String(f || "").trim()
      });
    },
    setPanelTab(f) {
      const m = String(f || "materials");
      e({
        panelTab: Gc.has(m) ? m : "materials",
        aiPanelOpen: !0,
        activeDrawer: ""
      });
    },
    startSession() {
      const f = n(), m = f.timerMode === "countup" ? "countup" : "countdown";
      pn(f), e({
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
        timerUpdatedAtMs: it(),
        timerRestoredAtMs: null,
        timerDurationSeconds: m === "countup" ? 0 : hr(f),
        elapsedSeconds: 0,
        startedAt: null,
        summaryRecord: null,
        aiPanelOpen: !1,
        activeDrawer: "",
        currentSession: {
          sessionId: `focus-${Date.now()}`,
          materialId: "focus-room",
          studyGoal: f.studyGoal,
          selectedScene: f.selectedScene,
          musicType: f.musicType,
          ambientSound: f.ambientSound,
          musicVolume: f.musicVolume,
          ambientVolume: f.ambientVolume,
          pomodoroDuration: f.pomodoroDuration,
          startedAt: null
        },
        ...Ys(),
        chatMessages: [],
        chatPending: !1,
        chatError: ""
      });
    },
    startTimer() {
      const f = n();
      (!f.currentSession || f.view !== "session") && n().startSession();
      const m = n(), y = it(), v = $t(m);
      if (v === "running") {
        n().tickTimer();
        return;
      }
      const l = Wn(m), p = v === "completed" || v === "break" || l > 0 && m.elapsedSeconds >= l, S = p ? 0 : Math.max(0, Number(m.elapsedSeconds) || 0), w = {
        view: "session",
        route: "session",
        ...Et("running", y),
        audioPlaying: !0,
        summaryRecord: null,
        elapsedSeconds: S,
        startedAt: !m.startedAt || p ? new Date(y).toISOString() : m.startedAt,
        timerAnchorAtMs: y - S * 1e3,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        timerDurationSeconds: l,
        ...p ? Ys() : {}
      };
      e(w), zn({ ...m, ...w });
    },
    pauseTimer({ pauseAudio: f = !0 } = {}) {
      const m = n(), y = it();
      if ($t(m) !== "running") {
        f && m.audioPlaying && e({ audioPlaying: !1 });
        return;
      }
      const v = Hy(m, y), l = {
        ...v,
        ...Et(v.timerState === "completed" ? "completed" : "paused", y),
        timerAnchorAtMs: null,
        timerPausedAtMs: y,
        audioPlaying: f ? !1 : m.audioPlaying
      };
      e(l), zn({ ...m, ...l });
    },
    resetTimer() {
      const f = it(), m = {
        ...Et("idle", f),
        timerRestoreTarget: null,
        timerMode: "countdown",
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerDurationSeconds: hr(n()),
        audioPlaying: !1,
        startedAt: null,
        elapsedSeconds: 0,
        summaryRecord: null,
        ...Ys()
      };
      e(m), zn({ ...n(), ...m });
    },
    skipTimer() {
      const f = n(), m = it(), y = Wn(f), v = {
        ...Et("completed", m),
        elapsedSeconds: y || Math.max(0, Number(f.elapsedSeconds) || 0),
        audioPlaying: !1,
        startedAt: f.startedAt || new Date(m).toISOString(),
        timerAnchorAtMs: null,
        timerPausedAtMs: m,
        timerDurationSeconds: y
      };
      e(v), zn({ ...f, ...v });
    },
    tickTimer() {
      const f = n();
      if (f.view !== "session" || $t(f) !== "running") return;
      const m = it(), y = Wn(f), v = y ? Math.min(y, ja(f, m)) : ja(f, m), l = y > 0 && v >= y ? "completed" : "running", p = {
        ...Et(l, m),
        elapsedSeconds: v,
        timerAnchorAtMs: l === "running" ? f.timerAnchorAtMs : null,
        timerPausedAtMs: l === "running" ? null : m,
        timerDurationSeconds: y,
        audioPlaying: l === "running" ? f.audioPlaying : !1
      };
      v === f.elapsedSeconds && l === $t(f) || (e(p), zn({ ...f, ...p }));
    },
    setTimerMode(f = "countdown") {
      const m = f === "countup" ? "countup" : "countdown", y = {
        timerMode: m,
        timerDurationSeconds: m === "countup" ? 0 : hr(n())
      };
      e(y), zn({ ...n(), ...y });
    },
    startBreak() {
      const f = it(), m = {
        ...Et("break", f),
        timerRestoreTarget: null,
        timerAnchorAtMs: null,
        timerPausedAtMs: f,
        timerDurationSeconds: 0,
        audioPlaying: !1
      };
      e(m), zn({ ...n(), ...m });
    },
    getTimerState() {
      return $t(n());
    },
    endSession() {
      var w;
      const f = n(), m = it(), y = new Date(m).toISOString(), v = $t(f) === "running" ? Hy(f, m) : f, l = Wn(v), p = l ? Math.min(l, v.elapsedSeconds) : v.elapsedSeconds, S = gC({
        sessionId: (w = f.currentSession) == null ? void 0 : w.sessionId,
        materialId: "focus-room",
        materialTitle: "Focus Room",
        studyGoal: f.studyGoal,
        selectedScene: f.selectedScene,
        musicType: f.musicType,
        ambientSound: f.ambientSound,
        musicVolume: f.musicVolume,
        ambientVolume: f.ambientVolume,
        pomodoroDuration: f.pomodoroDuration,
        startedAt: f.startedAt || y,
        endedAt: y,
        totalFocusTime: p,
        flashcardsCompleted: 0,
        quizScore: null,
        mistakesMade: [],
        completedTasks: [],
        recommendedNextStep: "Start another protected focus block when you are ready."
      });
      pa("focus-room"), e({
        summaryRecord: S,
        sessionHistory: Hc(),
        ...Et("completed", m),
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
    setWorkspaceNotes(f) {
      e((m) => {
        const y = {
          workspaceNotes: String(f ?? ""),
          workspaceUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        return pn({ ...m, ...y }), y;
      });
    },
    setAssistantContext(f = {}) {
      e({ assistantContext: Jc(f) });
    },
    toggleTask(f) {
      e((m) => {
        const y = m.studyPlan[Number(f)];
        if (!y) return {};
        const v = String(y.task || ""), l = m.completedTasks.includes(v) ? m.completedTasks.filter((p) => p !== v) : [...m.completedTasks, v];
        return pn({ ...m, completedTasks: l }), { completedTasks: l };
      });
    },
    updatePlanTask(f, m = null, y = null) {
      e((v) => {
        const l = Number(f), p = v.studyPlan[l];
        if (!p) return {};
        const S = String(p.task || ""), w = y == null ? S : String(y || "").trim(), k = m == null ? p.minutes : xr(m, p.minutes, 1, $a), A = v.studyPlan.map((E, N) => N === l ? { minutes: k, task: w || S } : E);
        let T = v.completedTasks;
        S && S !== A[l].task && T.includes(S) && (T = T.filter((E) => E !== S).concat(A[l].task));
        const P = { studyPlan: A, completedTasks: T };
        return pn({ ...v, ...P }), P;
      });
    },
    setFlashcardIndex(f) {
      const m = Vy(n().selectedMaterial);
      e({
        flashcardIndex: xr(f, n().flashcardIndex, 0, Math.max(0, m.length - 1)),
        flashcardSide: "front"
      });
    },
    flipFlashcard() {
      e((f) => ({
        flashcardSide: f.flashcardSide === "back" ? "front" : "back"
      }));
    },
    rateFlashcard(f) {
      const m = n(), y = Vy(m.selectedMaterial);
      if (!y.length) return;
      const v = xr(m.flashcardIndex, 0, 0, y.length - 1), l = y[v], p = ["easy", "medium", "hard"].includes(String(f)) ? String(f) : "medium";
      e({
        flashcardProgress: {
          ...m.flashcardProgress,
          [TC(l, v)]: {
            difficulty: p,
            reviewedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        },
        flashcardSide: "front",
        flashcardIndex: v < y.length - 1 ? v + 1 : v
      });
    },
    answerQuizQuestion(f, m) {
      const y = Number(f), v = Qc(n().selectedMaterial)[y];
      if (!v) return;
      const l = String(y);
      e((p) => ({
        quizAnswers: {
          ...p.quizAnswers,
          [l]: bC(v, m, p.quizAnswers[l])
        }
      }));
    },
    checkQuizQuestion(f) {
      const m = Qc(n().selectedMaterial), y = Number(f), v = m[y];
      if (!v) return;
      const l = String(y), p = n(), S = Object.prototype.hasOwnProperty.call(p.quizAnswers, l) ? p.quizAnswers[l] : "", w = EC(v, S), k = k0(v);
      e({
        quizChecked: {
          ...p.quizChecked,
          [l]: {
            answer: S,
            correct: w === null ? !1 : w,
            hasKnownAnswer: w !== null,
            explanation: v.explanation || v.rationale || (k ? `Correct answer: ${k}` : ""),
            checkedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        }
      });
    },
    async askAssistant(f) {
      const m = String(f || "").trim();
      if (!m) return;
      const y = n(), v = y.selectedMaterial, l = li(y.chatMessages).slice(-10).map((p) => ({
        role: p.role === "user" ? "user" : "assistant",
        content: p.text
      }));
      e({
        chatMessages: li([
          ...y.chatMessages,
          { role: "user", text: m, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
        ]),
        chatPending: !0,
        chatError: ""
      });
      try {
        const p = await VP(m, l, v, y.assistantContext);
        e((S) => ({
          chatMessages: li([
            ...S.chatMessages,
            { role: "assistant", text: p.answer, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: p.offline ? "Using a local Focus Room reply because the AI tutor service is not connected." : ""
        }));
      } catch (p) {
        e((S) => ({
          chatMessages: li([
            ...S.chatMessages,
            { role: "assistant", text: A0(m, v, n().studyGoal), createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: `AI tutor unavailable: ${p.message || "request failed"}`
        }));
      } finally {
        e({ chatPending: !1 });
      }
    },
    focusFlashcardsCompletedCount() {
      return FP(n());
    },
    focusQuizScore() {
      return OP(n());
    },
    focusQuizMistakes() {
      return LP(n());
    },
    formatFocusedTime() {
      return S0(n().elapsedSeconds);
    }
  };
});
function Gy({ scene: e, active: n, onSelect: o, variant: i = "default" }) {
  return i === "gallery" ? /* @__PURE__ */ x.jsxs(
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
        /* @__PURE__ */ x.jsx("span", { className: "focus-pill", children: e.kicker }),
        /* @__PURE__ */ x.jsx("strong", { children: e.name }),
        /* @__PURE__ */ x.jsx("span", { children: e.description })
      ]
    }
  );
}
const Qs = 8;
function Yd({ variant: e = "default" }) {
  const n = Q((y) => y.selectedScene), o = Q((y) => y.selectScene), [i, a] = C.useState(0), c = C.useMemo(() => e === "gallery" ? cC : Sn.filter((y) => !y.galleryOnly || y.id === n), [n, e]), d = Math.max(1, Math.ceil(c.length / Qs)), f = Math.min(i, d - 1), m = e === "gallery" ? c.slice(f * Qs, f * Qs + Qs) : c;
  return e !== "gallery" ? /* @__PURE__ */ x.jsx("div", { className: "scene-selector", "aria-label": "Study scenes", children: m.map((y) => /* @__PURE__ */ x.jsx(
    Gy,
    {
      scene: y,
      active: y.id === n,
      onSelect: o
    },
    y.id
  )) }) : /* @__PURE__ */ x.jsxs("div", { className: "scene-selector-wrap", "aria-label": "Study scenes", children: [
    /* @__PURE__ */ x.jsx("div", { className: "scene-selector scene-selector-gallery", children: m.map((y) => /* @__PURE__ */ x.jsx(
      Gy,
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
          disabled: f <= 0,
          "aria-label": "Previous scenes",
          children: /* @__PURE__ */ x.jsx(UC, { size: 18, "aria-hidden": "true" })
        }
      ),
      /* @__PURE__ */ x.jsx(
        "button",
        {
          type: "button",
          className: "scene-page-arrow scene-page-button-right",
          onClick: () => a((y) => Math.min(d - 1, y + 1)),
          disabled: f >= d - 1,
          "aria-label": "Next scenes",
          children: /* @__PURE__ */ x.jsx(WC, { size: 18, "aria-hidden": "true" })
        }
      )
    ] }) : null
  ] });
}
const Ky = [
  { label: "Lo-fi Chill", icon: oP, musicType: "Lo-fi", ambientSound: "Cafe Rain" },
  { label: "Ambient Piano", icon: aP, musicType: "Piano", ambientSound: "Nature" },
  { label: "Nature Ambient", icon: Kd, musicType: "Deep Focus", ambientSound: "Nature" },
  { label: "Acoustic Warm", icon: KC, musicType: "Minimal", ambientSound: "White Noise" },
  { label: "Deep Focus", icon: dP, musicType: "Deep Focus", ambientSound: "White Noise" }
];
function BP({ onWorkspace: e }) {
  const n = Q((P) => P.selectedScene), o = Q((P) => P.pomodoroDuration), i = Q((P) => P.timerMode), a = Q((P) => P.musicType), c = Q((P) => P.studyGoal), d = Q((P) => P.setPomodoroDuration), f = Q((P) => P.setTimerMode), m = Q((P) => P.setStudyGoal), y = Q((P) => P.setSound), v = Q((P) => P.startSession), [l, p] = C.useState(!1), S = C.useMemo(
    () => {
      var P;
      return ((P = Ky.find((E) => E.musicType === a)) == null ? void 0 : P.label) || "";
    },
    [a]
  ), w = (P) => {
    y("musicType", P.musicType), y("ambientSound", P.ambientSound);
  }, k = (P) => {
    f("countdown"), d(P);
  }, A = () => {
    n && v();
  }, T = () => {
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
            onClick: T,
            "aria-label": "Open Focus Trail",
            title: "Open Focus Trail",
            children: /* @__PURE__ */ x.jsx(eP, { size: 18, "aria-hidden": "true" })
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
            children: /* @__PURE__ */ x.jsx(LC, { size: 20, "aria-hidden": "true" })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ x.jsxs("div", { className: "innook-setup-layout", children: [
      /* @__PURE__ */ x.jsxs("section", { className: "innook-scene-panel", "aria-labelledby": "innook-scene-title", children: [
        /* @__PURE__ */ x.jsxs("div", { className: "innook-panel-heading", children: [
          /* @__PURE__ */ x.jsx("span", { children: "STEP 01" }),
          /* @__PURE__ */ x.jsx("h1", { id: "innook-scene-title", children: "选择学习场景" })
        ] }),
        /* @__PURE__ */ x.jsx(Yd, { variant: "gallery" })
      ] }),
      /* @__PURE__ */ x.jsxs("aside", { className: "innook-control-rail", "aria-label": "Study settings", children: [
        /* @__PURE__ */ x.jsx("div", { className: "innook-rail-group", "aria-label": "Music atmosphere", children: Ky.map((P) => {
          const E = P.icon, N = S === P.label;
          return /* @__PURE__ */ x.jsx(
            "button",
            {
              type: "button",
              className: `innook-rail-icon ${N ? "is-active" : ""}`.trim(),
              onClick: () => w(P),
              "aria-label": `Music style: ${P.label}`,
              "aria-pressed": N,
              title: P.label,
              children: /* @__PURE__ */ x.jsx(E, { size: 16, "aria-hidden": "true" })
            },
            P.label
          );
        }) }),
        /* @__PURE__ */ x.jsx("div", { className: "innook-rail-divider" }),
        /* @__PURE__ */ x.jsxs("div", { className: "innook-duration-list", "aria-label": "Focus duration", children: [
          f0.map((P) => {
            const E = i !== "countup" && P === o;
            return /* @__PURE__ */ x.jsx(
              "button",
              {
                type: "button",
                className: `innook-duration ${E ? "is-active" : ""}`.trim(),
                onClick: () => k(P),
                "aria-pressed": E,
                children: P
              },
              P
            );
          }),
          /* @__PURE__ */ x.jsx(
            "button",
            {
              type: "button",
              className: `innook-duration innook-duration-infinity ${i === "countup" ? "is-active" : ""}`.trim(),
              onClick: () => f("countup"),
              "aria-label": "Count-up timer",
              "aria-pressed": i === "countup",
              title: "Count-up",
              children: "∞"
            }
          )
        ] }),
        /* @__PURE__ */ x.jsx("div", { className: "innook-rail-divider" }),
        /* @__PURE__ */ x.jsx(
          "button",
          {
            type: "button",
            className: `innook-rail-icon ${l ? "is-active" : ""}`.trim(),
            onClick: () => p((P) => !P),
            "aria-label": "Edit focus intention",
            title: "Edit focus intention",
            children: /* @__PURE__ */ x.jsx(TP, { size: 16, "aria-hidden": "true" })
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
            children: /* @__PURE__ */ x.jsx(BC, { size: 22, "aria-hidden": "true" })
          }
        ),
        l ? /* @__PURE__ */ x.jsxs("label", { className: "innook-goal-popover", children: [
          "今日目标",
          /* @__PURE__ */ x.jsx(
            "textarea",
            {
              value: c,
              onChange: (P) => m(P.target.value),
              placeholder: "What will you protect this block for?",
              rows: 3,
              autoFocus: !0
            }
          )
        ] }) : null
      ] })
    ] })
  ] });
}
function be({
  children: e,
  className: n = "",
  variant: o = "ghost",
  type: i = "button",
  ...a
}) {
  const { onPointerMove: c, onPointerLeave: d, ...f } = a;
  return /* @__PURE__ */ x.jsx(
    "button",
    {
      className: `glass-button glass-button-${o} ${n}`.trim(),
      type: i,
      onPointerMove: (m) => {
        const y = m.currentTarget.getBoundingClientRect();
        m.currentTarget.style.setProperty("--glass-x", `${Math.max(0, Math.min(100, (m.clientX - y.left) / y.width * 100))}%`), m.currentTarget.style.setProperty("--glass-y", `${Math.max(0, Math.min(100, (m.clientY - y.top) / y.height * 100))}%`), c == null || c(m);
      },
      onPointerLeave: (m) => {
        m.currentTarget.style.setProperty("--glass-x", "50%"), m.currentTarget.style.setProperty("--glass-y", "0%"), d == null || d(m);
      },
      ...f,
      children: e
    }
  );
}
function zP({ onWorkspace: e, onOpenTrail: n, onOpenCompanion: o, onOpenSettings: i, onExit: a }) {
  const c = Q((f) => f.selectedScene), d = gn(c);
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
      /* @__PURE__ */ x.jsxs(be, { className: "header-icon-button", onClick: n, title: "Open Focus Trail", "aria-label": "Open Focus Trail", children: [
        /* @__PURE__ */ x.jsx(Da, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: "Focus Trail" })
      ] }),
      /* @__PURE__ */ x.jsxs(be, { className: "header-icon-button", onClick: o, title: "Open Companion Room", "aria-label": "Open Companion Room", children: [
        /* @__PURE__ */ x.jsx(Na, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: "Companion" })
      ] }),
      /* @__PURE__ */ x.jsxs(be, { className: "header-icon-button", onClick: i, title: "Open room settings", "aria-label": "Open room settings", children: [
        /* @__PURE__ */ x.jsx(E0, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: "Settings" })
      ] }),
      /* @__PURE__ */ x.jsxs(be, { className: "header-icon-button header-exit-button", onClick: a, title: "Exit Focus Room", "aria-label": "Exit Focus Room", children: [
        /* @__PURE__ */ x.jsx(ZC, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: "Exit" })
      ] })
    ] })
  ] });
}
const D0 = {
  minutes: Math.floor(w0 / 60),
  seconds: 59
}, $P = {
  minutes: 3,
  seconds: 2
};
function Qd(e) {
  const n = en(e, Wd);
  return {
    minutes: Math.floor(n / 60),
    seconds: n % 60
  };
}
function Yy(e, n) {
  const o = Math.max(0, Math.floor(Number(e) || 0)), i = Math.max(0, Math.floor(Number(n) || 0));
  return en(o * 60 + i, Wd);
}
function qc(e, n) {
  return String(Math.max(0, Math.floor(Number(e) || 0))).padStart(2, "0");
}
function Xd(e) {
  const { minutes: n, seconds: o } = Qd(e);
  return `${qc(n, "minutes")}:${qc(o, "seconds")}`;
}
function UP(e, n, o) {
  const i = $P[o] || 2;
  return `${String(e || "").replace(/\D/g, "")}${String(n).replace(/\D/g, "")}`.slice(-i) || "";
}
function HP(e, n) {
  const o = Number(String(e || "").replace(/\D/g, "")) || 0;
  return Math.min(D0[n], o);
}
function WP(e, n, o) {
  const i = Qd(e), a = HP(o, n);
  return n === "seconds" ? Yy(i.minutes, a) : Yy(a, i.seconds);
}
const GP = { minutes: "Minutes", seconds: "Seconds" };
function Qy({
  segment: e,
  value: n,
  disabled: o,
  active: i,
  onFocusSegment: a,
  onType: c,
  onCommit: d,
  onMove: f,
  segmentRef: m
}) {
  const y = GP[e], v = (l) => {
    if (o) return;
    const { key: p } = l;
    if (p >= "0" && p <= "9") {
      l.preventDefault(), c(e, p);
      return;
    }
    if (p === "ArrowLeft") {
      l.preventDefault(), f(-1);
      return;
    }
    if (p === "ArrowRight" || p === "Tab" && !l.shiftKey && e === "minutes") {
      p === "ArrowRight" && (l.preventDefault(), f(1));
      return;
    }
    (p === "Backspace" || p === "Delete") && (l.preventDefault(), d());
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
      "aria-valuemax": D0[e],
      "aria-valuenow": n,
      "aria-valuetext": `${n} ${y.toLowerCase()}`,
      "aria-disabled": o || void 0,
      onFocus: () => a(e),
      onKeyDown: v,
      children: qc(n, e)
    }
  ) });
}
function KP({
  valueSeconds: e,
  onChange: n,
  disabled: o = !1,
  size: i = "hero",
  ariaLabel: a = "Set focus block length",
  className: c = ""
}) {
  const { minutes: d, seconds: f } = Qd(e), [m, y] = C.useState(null), v = C.useRef(""), l = C.useRef(null), p = C.useRef(null), S = C.useRef(null), w = C.useCallback(() => {
    v.current = "";
  }, []), k = C.useCallback((E) => {
    v.current = "", y(E);
  }, []), A = C.useCallback(
    (E, N) => {
      if (o) return;
      const O = UP(v.current, N, E);
      v.current = O, y(E), n == null || n(WP(e, E, O));
    },
    [o, n, e]
  ), T = C.useCallback((E) => {
    var O;
    const N = E < 0 ? "minutes" : "seconds";
    v.current = "", y(N), (O = (E < 0 ? l : p).current) == null || O.focus();
  }, []), P = (E) => {
    var N;
    (N = S.current) != null && N.contains(E.relatedTarget) || (w(), y(null));
  };
  return /* @__PURE__ */ x.jsxs(
    "div",
    {
      ref: S,
      className: `timer-editor timer-editor-${i}${o ? " is-readonly" : ""} ${c}`.trim(),
      role: "group",
      "aria-label": a,
      onBlur: P,
      children: [
        o ? /* @__PURE__ */ x.jsx("span", { className: "timer-editor-static", "aria-hidden": "true", children: Xd(e) }) : /* @__PURE__ */ x.jsxs(x.Fragment, { children: [
          /* @__PURE__ */ x.jsx(
            Qy,
            {
              segment: "minutes",
              value: d,
              disabled: o,
              active: m === "minutes",
              segmentRef: l,
              onFocusSegment: k,
              onType: A,
              onCommit: w,
              onMove: T
            }
          ),
          /* @__PURE__ */ x.jsx("span", { className: "timer-editor-colon", "aria-hidden": "true", children: ":" }),
          /* @__PURE__ */ x.jsx(
            Qy,
            {
              segment: "seconds",
              value: f,
              disabled: o,
              active: m === "seconds",
              segmentRef: p,
              onFocusSegment: k,
              onType: A,
              onCommit: w,
              onMove: T
            }
          )
        ] }),
        !o && /* @__PURE__ */ x.jsx("span", { className: "sr-only", children: "Editable focus timer. Click minutes or seconds, then type digits to set the value." })
      ]
    }
  );
}
function YP(e, n) {
  return n ? Math.min(100, Math.max(0, e / n * 100)) : 0;
}
function QP({ onFocusMode: e, audioState: n }) {
  const o = Q((L) => L.timerStatus), i = Q((L) => L.elapsedSeconds), a = Q((L) => L.pomodoroDuration), c = Q((L) => L.pomodoroDurationSeconds), d = Q((L) => L.timerMode), f = Q((L) => L.studyGoal), m = Q((L) => L.currentSession), y = Q((L) => L.startTimer), v = Q((L) => L.pauseTimer), l = Q((L) => L.resetTimer), p = Q((L) => L.skipTimer), S = Q((L) => L.toggleAudio), w = Q((L) => L.audioPlaying), k = Q((L) => L.setPomodoroDurationSeconds), A = Number(c) || (Number(a) || 0) * 60, T = d === "countup" ? i : Math.max(0, A - i), P = o === "paused", E = o === "studying", N = o === "completed", O = o === "idle" && d !== "countup", W = N && d !== "countup" ? "00:00" : Yc(T), G = P ? "Paused" : N ? "Complete" : E ? "In focus" : "Ready", K = P ? "Resume timer" : E ? "Pause timer" : "Start timer";
  return /* @__PURE__ */ x.jsxs("div", { className: "focus-session-dock liquid-glass", "aria-label": "Focus session controls", children: [
    /* @__PURE__ */ x.jsxs("div", { className: "dock-timer-block", children: [
      /* @__PURE__ */ x.jsxs("div", { className: "dock-eyebrow", children: [
        "POMODORO #",
        (m == null ? void 0 : m.pomodoroNumber) || 1
      ] }),
      /* @__PURE__ */ x.jsxs("div", { className: "dock-status", children: [
        /* @__PURE__ */ x.jsx("span", { className: `dock-status-dot ${P || !E ? "is-paused" : ""}` }),
        G
      ] }),
      O ? /* @__PURE__ */ x.jsx(
        KP,
        {
          className: "dock-time-editor",
          valueSeconds: A,
          onChange: k,
          size: "dock",
          ariaLabel: "Set focus block length"
        }
      ) : /* @__PURE__ */ x.jsx("strong", { className: "dock-time", "aria-live": "off", children: W }),
      /* @__PURE__ */ x.jsx("div", { className: "dock-progress", "aria-hidden": "true", children: /* @__PURE__ */ x.jsx("span", { style: { width: `${YP(i, A)}%` } }) })
    ] }),
    /* @__PURE__ */ x.jsxs("div", { className: "dock-goal-block", children: [
      /* @__PURE__ */ x.jsx("span", { className: "dock-eyebrow", children: "TODAY'S GOAL" }),
      /* @__PURE__ */ x.jsx("strong", { children: f || "A quiet block for meaningful progress" }),
      /* @__PURE__ */ x.jsxs("span", { className: "dock-goal-meta", children: [
        d === "countup" ? "Count-up" : `${Xd(A)} block`,
        " · ",
        Yc(i),
        " focused"
      ] })
    ] }),
    /* @__PURE__ */ x.jsxs("div", { className: "dock-action-block", children: [
      /* @__PURE__ */ x.jsxs(be, { className: "dock-action-button", onClick: S, "aria-label": w ? "Pause room audio" : "Play room audio", children: [
        w ? /* @__PURE__ */ x.jsx(zy, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ x.jsx(Ua, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: n != null && n.playing ? "Pause audio" : "Audio" })
      ] }),
      /* @__PURE__ */ x.jsxs(be, { className: "dock-action-button", onClick: () => E ? v() : y(), variant: "primary", "aria-label": K, children: [
        E ? /* @__PURE__ */ x.jsx(zy, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ x.jsx(uP, { size: 15, fill: "currentColor", "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: P ? "Resume" : E ? "Pause" : "Start" })
      ] }),
      /* @__PURE__ */ x.jsxs(be, { className: "dock-action-button", onClick: p, "aria-label": "Skip timer", children: [
        /* @__PURE__ */ x.jsx(SP, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: "Skip" })
      ] }),
      /* @__PURE__ */ x.jsxs(be, { className: "dock-action-button", onClick: l, "aria-label": "Reset timer", children: [
        /* @__PURE__ */ x.jsx(pP, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: "Reset" })
      ] }),
      /* @__PURE__ */ x.jsxs(be, { className: "dock-focus-mode", onClick: e, "aria-label": "Enter distraction-free Focus Mode", children: [
        /* @__PURE__ */ x.jsx(xP, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: "Focus Mode" })
      ] })
    ] })
  ] });
}
var XP = Object.defineProperty, yo = (e, n) => XP(e, "name", { value: n, configurable: !0 }), N0 = !!(typeof window < "u" && window.document && window.document.createElement);
function Tr(e, n, { checkForDefaultPrevented: o = !0 } = {}) {
  return /* @__PURE__ */ yo(function(a) {
    if (e == null || e(a), o === !1 || !a || !a.defaultPrevented)
      return n == null ? void 0 : n(a);
  }, "handleEvent");
}
yo(Tr, "composeEventHandlers");
function ZP(e) {
  var n;
  if (!N0)
    throw new Error("Cannot access window outside of the DOM");
  return ((n = e == null ? void 0 : e.ownerDocument) == null ? void 0 : n.defaultView) ?? window;
}
yo(ZP, "getOwnerWindow");
function ed(e) {
  if (!N0)
    throw new Error("Cannot access document outside of the DOM");
  return (e == null ? void 0 : e.ownerDocument) ?? document;
}
yo(ed, "getOwnerDocument");
function j0(e, n = !1) {
  const { activeElement: o } = ed(e);
  if (!(o != null && o.nodeName))
    return null;
  if (I0(o) && o.contentDocument)
    return j0(o.contentDocument.body, n);
  if (n) {
    const i = o.getAttribute("aria-activedescendant");
    if (i) {
      const a = ed(o).getElementById(i);
      if (a)
        return a;
    }
  }
  return o;
}
yo(j0, "getActiveElement");
function I0(e) {
  return e.tagName === "IFRAME";
}
yo(I0, "isFrame");
function Xy(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function JP(...e) {
  return (n) => {
    let o = !1;
    const i = e.map((a) => {
      const c = Xy(a, n);
      return !o && typeof c == "function" && (o = !0), c;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const c = i[a];
          typeof c == "function" ? c() : Xy(e[a], null);
        }
      };
  };
}
function _t(...e) {
  return C.useCallback(JP(...e), e);
}
function qP(e, n = []) {
  let o = [];
  function i(c, d) {
    const f = C.createContext(d);
    f.displayName = c + "Context";
    const m = o.length;
    o = [...o, d];
    const y = (l) => {
      var T;
      const { scope: p, children: S, ...w } = l, k = ((T = p == null ? void 0 : p[e]) == null ? void 0 : T[m]) || f, A = C.useMemo(() => w, Object.values(w));
      return /* @__PURE__ */ x.jsx(k.Provider, { value: A, children: S });
    };
    y.displayName = c + "Provider";
    function v(l, p, S = {}) {
      var T;
      const { optional: w = !1 } = S, k = ((T = p == null ? void 0 : p[e]) == null ? void 0 : T[m]) || f, A = C.useContext(k);
      if (A) return A;
      if (d !== void 0) return d;
      if (!w)
        throw new Error(`\`${l}\` must be used within \`${c}\``);
    }
    return [y, v];
  }
  const a = () => {
    const c = o.map((d) => C.createContext(d));
    return function(f) {
      const m = (f == null ? void 0 : f[e]) || c;
      return C.useMemo(
        () => ({ [`__scope${e}`]: { ...f, [e]: m } }),
        [f, m]
      );
    };
  };
  return a.scopeName = e, [i, eb(a, ...n)];
}
function eb(...e) {
  const n = e[0];
  if (e.length === 1) return n;
  const o = () => {
    const i = e.map((a) => ({
      useScope: a(),
      scopeName: a.scopeName
    }));
    return function(c) {
      const d = i.reduce((f, { useScope: m, scopeName: y }) => {
        const l = m(c)[`__scope${y}`];
        return { ...f, ...l };
      }, {});
      return C.useMemo(() => ({ [`__scope${n.scopeName}`]: d }), [d]);
    };
  };
  return o.scopeName = n.scopeName, o;
}
var rn = globalThis != null && globalThis.document ? C.useLayoutEffect : () => {
}, tb = Ar[" useId ".trim().toString()] || (() => {
}), nb = 0;
function ac(e) {
  const [n, o] = C.useState(tb());
  return rn(() => {
    o((i) => i ?? String(nb++));
  }, [e]), e || (n ? `radix-${n}` : "");
}
var Zy = Ar[" useEffectEvent ".trim().toString()], Jy = Ar[" useInsertionEffect ".trim().toString()];
function rb(e) {
  if (typeof Zy == "function")
    return Zy(e);
  const n = C.useRef(() => {
    throw new Error("Cannot call an event handler while rendering.");
  });
  return typeof Jy == "function" ? Jy(() => {
    n.current = e;
  }) : rn(() => {
    n.current = e;
  }), C.useMemo(() => ((...o) => {
    var i;
    return (i = n.current) == null ? void 0 : i.call(n, ...o);
  }), []);
}
var ob = Object.defineProperty, bi = (e, n) => ob(e, "name", { value: n, configurable: !0 }), ib = Ar[" useInsertionEffect ".trim().toString()] || rn;
function F0({
  prop: e,
  defaultProp: n,
  onChange: o = /* @__PURE__ */ bi(() => {
  }, "onChange"),
  caller: i
}) {
  const [a, c, d] = O0({
    defaultProp: n,
    onChange: o
  }), f = e !== void 0, m = f ? e : a, y = C.useCallback(
    (v) => {
      var l;
      if (f) {
        const p = L0(v) ? v(e) : v;
        p !== e && ((l = d.current) == null || l.call(d, p));
      } else
        c(v);
    },
    [f, e, c, d]
  );
  return [m, y];
}
bi(F0, "useControllableState");
function O0({
  defaultProp: e,
  onChange: n
}) {
  const [o, i] = C.useState(e), a = C.useRef(o), c = C.useRef(n);
  return ib(() => {
    c.current = n;
  }, [n]), C.useEffect(() => {
    var d;
    a.current !== o && ((d = c.current) == null || d.call(c, o), a.current = o);
  }, [o, a]), [o, i, c];
}
bi(O0, "useUncontrolledState");
function L0(e) {
  return typeof e == "function";
}
bi(L0, "isFunction");
var qy = Symbol("RADIX:SYNC_STATE");
function sb(e, n, o, i) {
  const { prop: a, defaultProp: c, onChange: d, caller: f } = n, m = a !== void 0, y = rb(d), v = [{ ...o, state: c }];
  i && v.push(i);
  const [l, p] = C.useReducer(
    (A, T) => {
      if (T.type === qy)
        return { ...A, state: T.state };
      const P = e(A, T);
      return m && !Object.is(P.state, A.state) && y(P.state), P;
    },
    ...v
  ), S = l.state, w = C.useRef(S);
  C.useEffect(() => {
    w.current !== S && (w.current = S, m || y(S));
  }, [S, w, m]);
  const k = C.useMemo(() => a !== void 0 ? { ...l, state: a } : l, [l, a]);
  return C.useEffect(() => {
    m && !Object.is(a, l.state) && p({ type: qy, state: a });
  }, [a, l.state, m]), [k, p];
}
bi(sb, "useControllableStateReducer");
var V0 = xg();
// @__NO_SIDE_EFFECTS__
function B0(e) {
  const n = C.forwardRef((o, i) => {
    let { children: a, ...c } = o, d = null, f = !1;
    const m = [];
    eg(a) && typeof Xs == "function" && (a = Xs(a._payload)), C.Children.forEach(a, (p) => {
      var S;
      if (db(p)) {
        f = !0;
        const w = p;
        let k = "child" in w.props ? w.props.child : w.props.children;
        eg(k) && typeof Xs == "function" && (k = Xs(k._payload)), d = lb(w, k), m.push((S = d == null ? void 0 : d.props) == null ? void 0 : S.children);
      } else
        m.push(p);
    }), d ? d = C.cloneElement(d, void 0, m) : (
      // A `Slottable` was found but it didn't resolve to a single element (e.g.
      // it wrapped multiple elements, text, or a render-prop `child` that
      // wasn't an element). Don't fall back to treating the `Slottable` wrapper
      // itself as the slot target — throw a descriptive error below instead.
      !f && C.Children.count(a) === 1 && C.isValidElement(a) && (d = a)
    );
    const y = d ? cb(d) : void 0, v = _t(i, y);
    if (!d) {
      if (a || a === 0)
        throw new Error(
          f ? hb(e) : mb(e)
        );
      return a;
    }
    const l = ub(c, d.props ?? {});
    return d.type !== C.Fragment && (l.ref = i ? v : y), C.cloneElement(d, l);
  });
  return n.displayName = `${e}.Slot`, n;
}
var ab = Symbol.for("radix.slottable"), lb = (e, n) => {
  if ("child" in e.props) {
    const o = e.props.child;
    return C.isValidElement(o) ? C.cloneElement(o, void 0, e.props.children(o.props.children)) : null;
  }
  return C.isValidElement(n) ? n : null;
};
function ub(e, n) {
  const o = { ...n };
  for (const i in n) {
    const a = e[i], c = n[i];
    /^on[A-Z]/.test(i) ? a && c ? o[i] = (...f) => {
      const m = c(...f);
      return a(...f), m;
    } : a && (o[i] = a) : i === "style" ? o[i] = { ...a, ...c } : i === "className" && (o[i] = [a, c].filter(Boolean).join(" "));
  }
  return { ...e, ...o };
}
function cb(e) {
  var i, a;
  let n = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = n && "isReactWarning" in n && n.isReactWarning;
  return o ? e.ref : (n = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = n && "isReactWarning" in n && n.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
function db(e) {
  return C.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === ab;
}
var fb = Symbol.for("react.lazy");
function eg(e) {
  return e != null && typeof e == "object" && "$$typeof" in e && e.$$typeof === fb && "_payload" in e && pb(e._payload);
}
function pb(e) {
  return typeof e == "object" && e !== null && "then" in e;
}
var mb = (e) => `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`, hb = (e) => `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`, Xs = Ar[" use ".trim().toString()], yb = [
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
], go = yb.reduce((e, n) => {
  const o = /* @__PURE__ */ B0(`Primitive.${n}`), i = C.forwardRef((a, c) => {
    const { asChild: d, ...f } = a, m = d ? o : n;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ x.jsx(m, { ...f, ref: c });
  });
  return i.displayName = `Primitive.${n}`, { ...e, [n]: i };
}, {});
function gb(e, n) {
  e && V0.flushSync(() => e.dispatchEvent(n));
}
function wi(e) {
  const n = C.useRef(e);
  return C.useEffect(() => {
    n.current = e;
  }), C.useMemo(() => ((...o) => {
    var i;
    return (i = n.current) == null ? void 0 : i.call(n, ...o);
  }), []);
}
var vb = Object.defineProperty, Ye = (e, n) => vb(e, "name", { value: n, configurable: !0 }), td = "dismissableLayer.update", Sb = "dismissableLayer.pointerDownOutside", wb = "dismissableLayer.focusOutside", tg, z0 = C.createContext({
  layers: /* @__PURE__ */ new Set(),
  layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
  branches: /* @__PURE__ */ new Set(),
  // Outside elements that belong to a layer's own dismiss affordance (eg, a
  // dialog overlay). Pressing them should dismiss the layer regardless of
  // whether or not they stop propagation.
  //
  // See https://github.com/radix-ui/primitives/issues/3346
  dismissableSurfaces: /* @__PURE__ */ new Set()
}), xb = /* @__PURE__ */ C.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Ye(function(n, o) {
    const {
      disableOutsidePointerEvents: i = !1,
      deferPointerDownOutside: a = !1,
      onEscapeKeyDown: c,
      onPointerDownOutside: d,
      onFocusOutside: f,
      onInteractOutside: m,
      onDismiss: y,
      ...v
    } = n, l = C.useContext(z0), [p, S] = C.useState(null), w = (p == null ? void 0 : p.ownerDocument) ?? (globalThis == null ? void 0 : globalThis.document), [, k] = C.useState({}), A = _t(o, S), T = Array.from(l.layers), [P] = [
      ...l.layersWithOutsidePointerEventsDisabled
    ].slice(-1), E = P ? T.indexOf(P) : -1, N = p ? T.indexOf(p) : -1, O = l.layersWithOutsidePointerEventsDisabled.size > 0, W = N >= E, G = C.useRef(!1), K = U0(
      (q) => {
        d == null || d(q), m == null || m(q), q.defaultPrevented || y == null || y();
      },
      {
        ownerDocument: w,
        deferPointerDownOutside: a,
        isDeferredPointerDownOutsideRef: G,
        dismissableSurfaces: l.dismissableSurfaces,
        shouldHandlePointerDownOutside: C.useCallback(
          (q) => {
            if (!(q instanceof Node))
              return !1;
            const de = [...l.branches].some(
              (ue) => ue.contains(q)
            );
            return W && !de;
          },
          [l.branches, W]
        )
      }
    ), L = H0((q) => {
      if (a && G.current)
        return;
      const de = q.target;
      [...l.branches].some((_e) => _e.contains(de)) || (f == null || f(q), m == null || m(q), q.defaultPrevented || y == null || y());
    }, w), X = p ? N === T.length - 1 : !1, ae = wi((q) => {
      q.key === "Escape" && (c == null || c(q), !q.defaultPrevented && y && (q.preventDefault(), y()));
    });
    return C.useEffect(() => {
      if (X)
        return w.addEventListener("keydown", ae, { capture: !0 }), () => w.removeEventListener("keydown", ae, { capture: !0 });
    }, [w, X, ae]), C.useEffect(() => {
      if (p)
        return i && (l.layersWithOutsidePointerEventsDisabled.size === 0 && (tg = w.body.style.pointerEvents, w.body.style.pointerEvents = "none"), l.layersWithOutsidePointerEventsDisabled.add(p)), l.layers.add(p), nd(), () => {
          i && (l.layersWithOutsidePointerEventsDisabled.delete(p), l.layersWithOutsidePointerEventsDisabled.size === 0 && (w.body.style.pointerEvents = tg));
        };
    }, [p, w, i, l]), C.useEffect(() => () => {
      p && (l.layers.delete(p), l.layersWithOutsidePointerEventsDisabled.delete(p), nd());
    }, [p, l]), C.useEffect(() => {
      const q = /* @__PURE__ */ Ye(() => k({}), "handleUpdate");
      return document.addEventListener(td, q), () => document.removeEventListener(td, q);
    }, []), /* @__PURE__ */ x.jsx(
      go.div,
      {
        ...v,
        ref: A,
        style: {
          pointerEvents: O ? W ? "auto" : "none" : void 0,
          ...n.style
        },
        onFocusCapture: Tr(n.onFocusCapture, L.onFocusCapture),
        onBlurCapture: Tr(n.onBlurCapture, L.onBlurCapture),
        onPointerDownCapture: Tr(
          n.onPointerDownCapture,
          K.onPointerDownCapture
        )
      }
    );
  }, "DismissableLayer")
);
function $0() {
  const e = C.useContext(z0), [n, o] = C.useState(null);
  return C.useEffect(() => {
    if (n)
      return e.dismissableSurfaces.add(n), () => {
        e.dismissableSurfaces.delete(n);
      };
  }, [n, e.dismissableSurfaces]), o;
}
Ye($0, "useDismissableLayerSurface");
var _b = /* @__PURE__ */ Ye(() => !0, "IS_TRUE");
function U0(e, n) {
  const {
    ownerDocument: o = globalThis == null ? void 0 : globalThis.document,
    deferPointerDownOutside: i = !1,
    isDeferredPointerDownOutsideRef: a,
    dismissableSurfaces: c,
    shouldHandlePointerDownOutside: d = _b
  } = n, f = wi(e), m = C.useRef(!1), y = C.useRef(!1), v = C.useRef(/* @__PURE__ */ new Map()), l = C.useRef(() => {
  });
  return C.useEffect(() => {
    function p() {
      y.current = !1, a.current = !1, v.current.clear();
    }
    Ye(p, "resetOutsideInteraction");
    function S() {
      return Array.from(v.current.values()).some(Boolean);
    }
    Ye(S, "isOutsideInteractionIntercepted");
    function w(E) {
      if (!y.current)
        return;
      const N = E.target;
      N instanceof Node && [...c].some((W) => W.contains(N)) || v.current.set(E.type, !0), E.type === "click" && window.setTimeout(() => {
        y.current && l.current();
      }, 0);
    }
    Ye(w, "handleInteractionCapture");
    function k(E) {
      y.current && v.current.set(E.type, !1);
    }
    Ye(k, "handleInteractionBubble");
    const A = /* @__PURE__ */ Ye((E) => {
      if (E.target && !m.current) {
        let N = function() {
          o.removeEventListener("click", l.current);
          const W = S();
          p(), W || Zd(
            Sb,
            f,
            O,
            { discrete: !0 }
          );
        };
        if (Ye(N, "handleAndDispatchPointerDownOutsideEvent"), !d(E.target)) {
          o.removeEventListener("click", l.current), p(), m.current = !1;
          return;
        }
        const O = { originalEvent: E };
        y.current = !0, a.current = i && E.button === 0, v.current.clear(), !i || E.button !== 0 ? N() : (o.removeEventListener("click", l.current), l.current = N, o.addEventListener("click", l.current, { once: !0 }));
      } else
        o.removeEventListener("click", l.current), p();
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
      o.addEventListener(E, w, !0), o.addEventListener(E, k);
    const P = window.setTimeout(() => {
      o.addEventListener("pointerdown", A);
    }, 0);
    return () => {
      window.clearTimeout(P), o.removeEventListener("pointerdown", A), o.removeEventListener("click", l.current);
      for (const E of T)
        o.removeEventListener(E, w, !0), o.removeEventListener(E, k);
    };
  }, [
    o,
    f,
    i,
    a,
    c,
    d
  ]), {
    // ensures we check React component tree (not just DOM tree)
    onPointerDownCapture: /* @__PURE__ */ Ye(() => m.current = !0, "onPointerDownCapture")
  };
}
Ye(U0, "usePointerDownOutside");
function H0(e, n = globalThis == null ? void 0 : globalThis.document) {
  const o = wi(e), i = C.useRef(!1);
  return C.useEffect(() => {
    const a = /* @__PURE__ */ Ye((c) => {
      c.target && !i.current && Zd(wb, o, { originalEvent: c }, {
        discrete: !1
      });
    }, "handleFocus");
    return n.addEventListener("focusin", a), () => n.removeEventListener("focusin", a);
  }, [n, o]), {
    onFocusCapture: /* @__PURE__ */ Ye(() => i.current = !0, "onFocusCapture"),
    onBlurCapture: /* @__PURE__ */ Ye(() => i.current = !1, "onBlurCapture")
  };
}
Ye(H0, "useFocusOutside");
function nd() {
  const e = new CustomEvent(td);
  document.dispatchEvent(e);
}
Ye(nd, "dispatchUpdate");
function Zd(e, n, o, { discrete: i }) {
  const a = o.originalEvent.target, c = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: o });
  n && a.addEventListener(e, n, { once: !0 }), i ? gb(a, c) : a.dispatchEvent(c);
}
Ye(Zd, "handleAndDispatchCustomEvent");
var Tb = Object.defineProperty, lt = (e, n) => Tb(e, "name", { value: n, configurable: !0 }), lc = "focusScope.autoFocusOnMount", uc = "focusScope.autoFocusOnUnmount", ng = { bubbles: !1, cancelable: !0 }, kb = /* @__PURE__ */ C.forwardRef(
  /* @__PURE__ */ lt(function(n, o) {
    const {
      loop: i = !1,
      trapped: a = !1,
      onMountAutoFocus: c,
      onUnmountAutoFocus: d,
      ...f
    } = n, [m, y] = C.useState(null), v = wi(c), l = wi(d), p = C.useRef(null), S = _t(o, y), w = C.useRef({
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
        let A = function(N) {
          if (w.paused || !m) return;
          const O = N.target;
          m.contains(O) ? p.current = O : hn(p.current, { select: !0 });
        }, T = function(N) {
          if (w.paused || !m) return;
          const O = N.relatedTarget;
          O !== null && (m.contains(O) || hn(p.current, { select: !0 }));
        }, P = function(N) {
          if (document.activeElement === document.body)
            for (const W of N)
              W.removedNodes.length > 0 && hn(m);
        };
        lt(A, "handleFocusIn"), lt(T, "handleFocusOut"), lt(P, "handleMutations"), document.addEventListener("focusin", A), document.addEventListener("focusout", T);
        const E = new MutationObserver(P);
        return m && E.observe(m, { childList: !0, subtree: !0 }), () => {
          document.removeEventListener("focusin", A), document.removeEventListener("focusout", T), E.disconnect();
        };
      }
    }, [a, m, w.paused]), C.useEffect(() => {
      if (m) {
        rg.add(w);
        const A = document.activeElement;
        if (!m.contains(A)) {
          const P = new CustomEvent(lc, ng);
          m.addEventListener(lc, v), m.dispatchEvent(P), P.defaultPrevented || (W0(X0(Jd(m)), { select: !0 }), document.activeElement === A && hn(m));
        }
        return () => {
          m.removeEventListener(lc, v), setTimeout(() => {
            const P = new CustomEvent(uc, ng);
            m.addEventListener(uc, l), m.dispatchEvent(P), P.defaultPrevented || hn(A ?? document.body, { select: !0 }), m.removeEventListener(uc, l), rg.remove(w);
          }, 0);
        };
      }
    }, [m, v, l, w]);
    const k = C.useCallback(
      (A) => {
        if (!i && !a || w.paused) return;
        const T = A.key === "Tab" && !A.altKey && !A.ctrlKey && !A.metaKey, P = document.activeElement;
        if (T && P) {
          const E = A.currentTarget, [N, O] = G0(E);
          N && O ? !A.shiftKey && P === O ? (A.preventDefault(), i && hn(N, { select: !0 })) : A.shiftKey && P === N && (A.preventDefault(), i && hn(O, { select: !0 })) : P === E && A.preventDefault();
        }
      },
      [i, a, w.paused]
    );
    return /* @__PURE__ */ x.jsx(go.div, { tabIndex: -1, ...f, ref: S, onKeyDown: k });
  }, "FocusScope")
);
function W0(e, { select: n = !1 } = {}) {
  const o = document.activeElement;
  for (const i of e)
    if (hn(i, { select: n }), document.activeElement !== o) return;
}
lt(W0, "focusFirst");
function G0(e) {
  const n = Jd(e), o = rd(n, e), i = rd(n.reverse(), e);
  return [o, i];
}
lt(G0, "getTabbableEdges");
function Jd(e) {
  const n = [], o = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
    acceptNode: /* @__PURE__ */ lt((i) => {
      const a = i.tagName === "INPUT" && i.type === "hidden";
      return i.disabled || i.hidden || a ? NodeFilter.FILTER_SKIP : i.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }, "acceptNode")
  });
  for (; o.nextNode(); ) n.push(o.currentNode);
  return n;
}
lt(Jd, "getTabbableCandidates");
function rd(e, n) {
  const o = typeof n.checkVisibility == "function" && n.checkVisibility({ checkVisibilityCSS: !0 });
  for (const i of e)
    if (!(o ? !i.checkVisibility({ checkVisibilityCSS: !0 }) : K0(i, { upTo: n })))
      return i;
}
lt(rd, "findVisible");
function K0(e, { upTo: n }) {
  if (getComputedStyle(e).visibility === "hidden") return !0;
  for (; e; ) {
    if (n !== void 0 && e === n) return !1;
    if (getComputedStyle(e).display === "none") return !0;
    e = e.parentElement;
  }
  return !1;
}
lt(K0, "isHidden");
function Y0(e) {
  return e instanceof HTMLInputElement && "select" in e;
}
lt(Y0, "isSelectableInput");
function hn(e, { select: n = !1 } = {}) {
  if (e && e.focus) {
    const o = document.activeElement;
    e.focus({ preventScroll: !0 }), e !== o && Y0(e) && n && e.select();
  }
}
lt(hn, "focus");
var rg = Q0();
function Q0() {
  let e = [];
  return {
    add(n) {
      const o = e[0];
      n !== o && (o == null || o.pause()), e = od(e, n), e.unshift(n);
    },
    remove(n) {
      var o;
      e = od(e, n), (o = e[0]) == null || o.resume();
    }
  };
}
lt(Q0, "createFocusScopesStack");
function od(e, n) {
  const o = [...e], i = o.indexOf(n);
  return i !== -1 && o.splice(i, 1), o;
}
lt(od, "arrayRemove");
function X0(e) {
  return e.filter((n) => n.tagName !== "A");
}
lt(X0, "removeLinks");
var Ab = Object.defineProperty, Cb = (e, n) => Ab(e, "name", { value: n, configurable: !0 }), Pb = /* @__PURE__ */ C.forwardRef(
  /* @__PURE__ */ Cb(function(n, o) {
    var m;
    const { container: i, ...a } = n, [c, d] = C.useState(!1);
    rn(() => d(!0), []);
    const f = i || c && ((m = globalThis == null ? void 0 : globalThis.document) == null ? void 0 : m.body);
    return f ? V0.createPortal(/* @__PURE__ */ x.jsx(go.div, { ...a, ref: o }), f) : null;
  }, "Portal")
), bb = Object.defineProperty, wn = (e, n) => bb(e, "name", { value: n, configurable: !0 });
function Z0(e, n) {
  return C.useReducer((o, i) => n[o][i] ?? o, e);
}
wn(Z0, "useStateMachine");
var qd = /* @__PURE__ */ wn((e) => {
  const { present: n, children: o } = e, i = J0(n), a = typeof o == "function" ? o({ present: i.isPresent }) : C.Children.only(o), c = q0(i.ref, eS(a));
  return typeof o == "function" || i.isPresent ? C.cloneElement(a, { ref: c }) : null;
}, "Presence");
function J0(e) {
  const [n, o] = C.useState(), i = C.useRef(null), a = C.useRef(e), c = C.useRef("none"), d = C.useRef(void 0), f = e ? "mounted" : "unmounted", [m, y] = Z0(f, {
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
    m === "mounted" ? (c.current = d.current ?? no(i.current), d.current = void 0) : c.current = "none";
  }, [m]), rn(() => {
    const v = i.current, l = a.current;
    if (l !== e) {
      const S = c.current, w = no(v);
      e ? (d.current = w, y("MOUNT")) : w === "none" || (v == null ? void 0 : v.display) === "none" ? y("UNMOUNT") : y(l && S !== w ? "ANIMATION_OUT" : "UNMOUNT"), a.current = e;
    }
  }, [e, y]), rn(() => {
    if (n) {
      let v;
      const l = n.ownerDocument.defaultView ?? window, p = /* @__PURE__ */ wn((w) => {
        const A = no(i.current).includes(CSS.escape(w.animationName));
        if (w.target === n && A && (y("ANIMATION_END"), !a.current)) {
          const T = n.style.animationFillMode;
          n.style.animationFillMode = "forwards", v = l.setTimeout(() => {
            n.style.animationFillMode === "forwards" && (n.style.animationFillMode = T);
          });
        }
      }, "handleAnimationEnd"), S = /* @__PURE__ */ wn((w) => {
        w.target === n && (c.current = no(i.current));
      }, "handleAnimationStart");
      return n.addEventListener("animationstart", S), n.addEventListener("animationcancel", p), n.addEventListener("animationend", p), () => {
        l.clearTimeout(v), n.removeEventListener("animationstart", S), n.removeEventListener("animationcancel", p), n.removeEventListener("animationend", p);
      };
    } else
      y("ANIMATION_END");
  }, [n, y]), {
    isPresent: ["mounted", "unmountSuspended"].includes(m),
    ref: C.useCallback((v) => {
      if (v) {
        const l = getComputedStyle(v);
        i.current = l, d.current = no(l);
      } else
        i.current = null;
      o(v);
    }, [])
  };
}
wn(J0, "usePresence");
function id(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
wn(id, "setRef");
function q0(...e) {
  const n = C.useRef(e);
  return n.current = e, C.useCallback((o) => {
    const i = n.current;
    let a = !1;
    const c = i.map((d) => {
      const f = id(d, o);
      return !a && typeof f == "function" && (a = !0), f;
    });
    if (a)
      return () => {
        for (let d = 0; d < c.length; d++) {
          const f = c[d];
          typeof f == "function" ? f() : id(i[d], null);
        }
      };
  }, []);
}
wn(q0, "useStableComposedRefs");
function no(e) {
  return (e == null ? void 0 : e.animationName) || "none";
}
wn(no, "getAnimationName");
function eS(e) {
  var i, a;
  let n = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = n && "isReactWarning" in n && n.isReactWarning;
  return o ? e.ref : (n = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = n && "isReactWarning" in n && n.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
wn(eS, "getElementRef");
var Zs = 0, Xt = null;
function Eb() {
  C.useEffect(() => {
    Xt || (Xt = { start: og(), end: og() });
    const { start: e, end: n } = Xt;
    return document.body.firstElementChild !== e && document.body.insertAdjacentElement("afterbegin", e), document.body.lastElementChild !== n && document.body.insertAdjacentElement("beforeend", n), Zs++, () => {
      Zs === 1 && (Xt == null || Xt.start.remove(), Xt == null || Xt.end.remove(), Xt = null), Zs = Math.max(0, Zs - 1);
    };
  }, []);
}
function og() {
  const e = document.createElement("span");
  return e.setAttribute("data-radix-focus-guard", ""), e.tabIndex = 0, e.style.outline = "none", e.style.opacity = "0", e.style.position = "fixed", e.style.pointerEvents = "none", e;
}
var qt = function() {
  return qt = Object.assign || function(n) {
    for (var o, i = 1, a = arguments.length; i < a; i++) {
      o = arguments[i];
      for (var c in o) Object.prototype.hasOwnProperty.call(o, c) && (n[c] = o[c]);
    }
    return n;
  }, qt.apply(this, arguments);
};
function tS(e, n) {
  var o = {};
  for (var i in e) Object.prototype.hasOwnProperty.call(e, i) && n.indexOf(i) < 0 && (o[i] = e[i]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var a = 0, i = Object.getOwnPropertySymbols(e); a < i.length; a++)
      n.indexOf(i[a]) < 0 && Object.prototype.propertyIsEnumerable.call(e, i[a]) && (o[i[a]] = e[i[a]]);
  return o;
}
function Mb(e, n, o) {
  if (o || arguments.length === 2) for (var i = 0, a = n.length, c; i < a; i++)
    (c || !(i in n)) && (c || (c = Array.prototype.slice.call(n, 0, i)), c[i] = n[i]);
  return e.concat(c || Array.prototype.slice.call(n));
}
var ma = "right-scroll-bar-position", ha = "width-before-scroll-bar", Rb = "with-scroll-bars-hidden", Db = "--removed-body-scroll-bar-size";
function cc(e, n) {
  return typeof e == "function" ? e(n) : e && (e.current = n), e;
}
function Nb(e, n) {
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
var jb = typeof window < "u" ? C.useLayoutEffect : C.useEffect, ig = /* @__PURE__ */ new WeakMap();
function Ib(e, n) {
  var o = Nb(null, function(i) {
    return e.forEach(function(a) {
      return cc(a, i);
    });
  });
  return jb(function() {
    var i = ig.get(o);
    if (i) {
      var a = new Set(i), c = new Set(e), d = o.current;
      a.forEach(function(f) {
        c.has(f) || cc(f, null);
      }), c.forEach(function(f) {
        a.has(f) || cc(f, d);
      });
    }
    ig.set(o, e);
  }, [e]), o;
}
function Fb(e) {
  return e;
}
function Ob(e, n) {
  n === void 0 && (n = Fb);
  var o = [], i = !1, a = {
    read: function() {
      if (i)
        throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");
      return o.length ? o[o.length - 1] : e;
    },
    useMedium: function(c) {
      var d = n(c, i);
      return o.push(d), function() {
        o = o.filter(function(f) {
          return f !== d;
        });
      };
    },
    assignSyncMedium: function(c) {
      for (i = !0; o.length; ) {
        var d = o;
        o = [], d.forEach(c);
      }
      o = {
        push: function(f) {
          return c(f);
        },
        filter: function() {
          return o;
        }
      };
    },
    assignMedium: function(c) {
      i = !0;
      var d = [];
      if (o.length) {
        var f = o;
        o = [], f.forEach(c), d = o;
      }
      var m = function() {
        var v = d;
        d = [], v.forEach(c);
      }, y = function() {
        return Promise.resolve().then(m);
      };
      y(), o = {
        push: function(v) {
          d.push(v), y();
        },
        filter: function(v) {
          return d = d.filter(v), o;
        }
      };
    }
  };
  return a;
}
function Lb(e) {
  e === void 0 && (e = {});
  var n = Ob(null);
  return n.options = qt({ async: !0, ssr: !1 }, e), n;
}
var nS = function(e) {
  var n = e.sideCar, o = tS(e, ["sideCar"]);
  if (!n)
    throw new Error("Sidecar: please provide `sideCar` property to import the right car");
  var i = n.read();
  if (!i)
    throw new Error("Sidecar medium not found");
  return C.createElement(i, qt({}, o));
};
nS.isSideCarExport = !0;
function Vb(e, n) {
  return e.useMedium(n), nS;
}
var rS = Lb(), dc = function() {
}, Ha = C.forwardRef(function(e, n) {
  var o = C.useRef(null), i = C.useState({
    onScrollCapture: dc,
    onWheelCapture: dc,
    onTouchMoveCapture: dc
  }), a = i[0], c = i[1], d = e.forwardProps, f = e.children, m = e.className, y = e.removeScrollBar, v = e.enabled, l = e.shards, p = e.sideCar, S = e.noRelative, w = e.noIsolation, k = e.inert, A = e.allowPinchZoom, T = e.as, P = T === void 0 ? "div" : T, E = e.gapMode, N = tS(e, ["forwardProps", "children", "className", "removeScrollBar", "enabled", "shards", "sideCar", "noRelative", "noIsolation", "inert", "allowPinchZoom", "as", "gapMode"]), O = p, W = Ib([o, n]), G = qt(qt({}, N), a);
  return C.createElement(
    C.Fragment,
    null,
    v && C.createElement(O, { sideCar: rS, removeScrollBar: y, shards: l, noRelative: S, noIsolation: w, inert: k, setCallbacks: c, allowPinchZoom: !!A, lockRef: o, gapMode: E }),
    d ? C.cloneElement(C.Children.only(f), qt(qt({}, G), { ref: W })) : C.createElement(P, qt({}, G, { className: m, ref: W }), f)
  );
});
Ha.defaultProps = {
  enabled: !0,
  removeScrollBar: !0,
  inert: !1
};
Ha.classNames = {
  fullWidth: ha,
  zeroRight: ma
};
var Bb = function() {
  if (typeof __webpack_nonce__ < "u")
    return __webpack_nonce__;
};
function zb() {
  if (!document)
    return null;
  var e = document.createElement("style");
  e.type = "text/css";
  var n = Bb();
  return n && e.setAttribute("nonce", n), e;
}
function $b(e, n) {
  e.styleSheet ? e.styleSheet.cssText = n : e.appendChild(document.createTextNode(n));
}
function Ub(e) {
  var n = document.head || document.getElementsByTagName("head")[0];
  n.appendChild(e);
}
var Hb = function() {
  var e = 0, n = null;
  return {
    add: function(o) {
      e == 0 && (n = zb()) && ($b(n, o), Ub(n)), e++;
    },
    remove: function() {
      e--, !e && n && (n.parentNode && n.parentNode.removeChild(n), n = null);
    }
  };
}, Wb = function() {
  var e = Hb();
  return function(n, o) {
    C.useEffect(function() {
      return e.add(n), function() {
        e.remove();
      };
    }, [n && o]);
  };
}, oS = function() {
  var e = Wb(), n = function(o) {
    var i = o.styles, a = o.dynamic;
    return e(i, a), null;
  };
  return n;
}, Gb = {
  left: 0,
  top: 0,
  right: 0,
  gap: 0
}, fc = function(e) {
  return parseInt(e || "", 10) || 0;
}, Kb = function(e) {
  var n = window.getComputedStyle(document.body), o = n[e === "padding" ? "paddingLeft" : "marginLeft"], i = n[e === "padding" ? "paddingTop" : "marginTop"], a = n[e === "padding" ? "paddingRight" : "marginRight"];
  return [fc(o), fc(i), fc(a)];
}, Yb = function(e) {
  if (e === void 0 && (e = "margin"), typeof window > "u")
    return Gb;
  var n = Kb(e), o = document.documentElement.clientWidth, i = window.innerWidth;
  return {
    left: n[0],
    top: n[1],
    right: n[2],
    gap: Math.max(0, i - o + n[2] - n[0])
  };
}, Qb = oS(), lo = "data-scroll-locked", Xb = function(e, n, o, i) {
  var a = e.left, c = e.top, d = e.right, f = e.gap;
  return o === void 0 && (o = "margin"), `
  .`.concat(Rb, ` {
   overflow: hidden `).concat(i, `;
   padding-right: `).concat(f, "px ").concat(i, `;
  }
  body[`).concat(lo, `] {
    overflow: hidden `).concat(i, `;
    overscroll-behavior: contain;
    `).concat([
    n && "position: relative ".concat(i, ";"),
    o === "margin" && `
    padding-left: `.concat(a, `px;
    padding-top: `).concat(c, `px;
    padding-right: `).concat(d, `px;
    margin-left:0;
    margin-top:0;
    margin-right: `).concat(f, "px ").concat(i, `;
    `),
    o === "padding" && "padding-right: ".concat(f, "px ").concat(i, ";")
  ].filter(Boolean).join(""), `
  }
  
  .`).concat(ma, ` {
    right: `).concat(f, "px ").concat(i, `;
  }
  
  .`).concat(ha, ` {
    margin-right: `).concat(f, "px ").concat(i, `;
  }
  
  .`).concat(ma, " .").concat(ma, ` {
    right: 0 `).concat(i, `;
  }
  
  .`).concat(ha, " .").concat(ha, ` {
    margin-right: 0 `).concat(i, `;
  }
  
  body[`).concat(lo, `] {
    `).concat(Db, ": ").concat(f, `px;
  }
`);
}, sg = function() {
  var e = parseInt(document.body.getAttribute(lo) || "0", 10);
  return isFinite(e) ? e : 0;
}, Zb = function() {
  C.useEffect(function() {
    return document.body.setAttribute(lo, (sg() + 1).toString()), function() {
      var e = sg() - 1;
      e <= 0 ? document.body.removeAttribute(lo) : document.body.setAttribute(lo, e.toString());
    };
  }, []);
}, Jb = function(e) {
  var n = e.noRelative, o = e.noImportant, i = e.gapMode, a = i === void 0 ? "margin" : i;
  Zb();
  var c = C.useMemo(function() {
    return Yb(a);
  }, [a]);
  return C.createElement(Qb, { styles: Xb(c, !n, a, o ? "" : "!important") });
}, sd = !1;
if (typeof window < "u")
  try {
    var Js = Object.defineProperty({}, "passive", {
      get: function() {
        return sd = !0, !0;
      }
    });
    window.addEventListener("test", Js, Js), window.removeEventListener("test", Js, Js);
  } catch {
    sd = !1;
  }
var Jr = sd ? { passive: !1 } : !1, qb = function(e) {
  return e.tagName === "TEXTAREA";
}, iS = function(e, n) {
  if (!(e instanceof Element))
    return !1;
  var o = window.getComputedStyle(e);
  return (
    // not-not-scrollable
    o[n] !== "hidden" && // contains scroll inside self
    !(o.overflowY === o.overflowX && !qb(e) && o[n] === "visible")
  );
}, eE = function(e) {
  return iS(e, "overflowY");
}, tE = function(e) {
  return iS(e, "overflowX");
}, ag = function(e, n) {
  var o = n.ownerDocument, i = n;
  do {
    typeof ShadowRoot < "u" && i instanceof ShadowRoot && (i = i.host);
    var a = sS(e, i);
    if (a) {
      var c = aS(e, i), d = c[1], f = c[2];
      if (d > f)
        return !0;
    }
    i = i.parentNode;
  } while (i && i !== o.body);
  return !1;
}, nE = function(e) {
  var n = e.scrollTop, o = e.scrollHeight, i = e.clientHeight;
  return [
    n,
    o,
    i
  ];
}, rE = function(e) {
  var n = e.scrollLeft, o = e.scrollWidth, i = e.clientWidth;
  return [
    n,
    o,
    i
  ];
}, sS = function(e, n) {
  return e === "v" ? eE(n) : tE(n);
}, aS = function(e, n) {
  return e === "v" ? nE(n) : rE(n);
}, oE = function(e, n) {
  return e === "h" && n === "rtl" ? -1 : 1;
}, iE = function(e, n, o, i, a) {
  var c = oE(e, window.getComputedStyle(n).direction), d = c * i, f = o.target, m = n.contains(f), y = !1, v = d > 0, l = 0, p = 0;
  do {
    if (!f)
      break;
    var S = aS(e, f), w = S[0], k = S[1], A = S[2], T = k - A - c * w;
    (w || T) && sS(e, f) && (l += T, p += w);
    var P = f.parentNode;
    f = P && P.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? P.host : P;
  } while (
    // portaled content
    !m && f !== document.body || // self content
    m && (n.contains(f) || n === f)
  );
  return (v && Math.abs(l) < 1 || !v && Math.abs(p) < 1) && (y = !0), y;
}, qs = function(e) {
  return "changedTouches" in e ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY] : [0, 0];
}, lg = function(e) {
  return [e.deltaX, e.deltaY];
}, ug = function(e) {
  return e && "current" in e ? e.current : e;
}, sE = function(e, n) {
  return e[0] === n[0] && e[1] === n[1];
}, aE = function(e) {
  return `
  .block-interactivity-`.concat(e, ` {pointer-events: none;}
  .allow-interactivity-`).concat(e, ` {pointer-events: all;}
`);
}, lE = 0, qr = [];
function uE(e) {
  var n = C.useRef([]), o = C.useRef([0, 0]), i = C.useRef(), a = C.useState(lE++)[0], c = C.useState(oS)[0], d = C.useRef(e);
  C.useEffect(function() {
    d.current = e;
  }, [e]), C.useEffect(function() {
    if (e.inert) {
      document.body.classList.add("block-interactivity-".concat(a));
      var k = Mb([e.lockRef.current], (e.shards || []).map(ug), !0).filter(Boolean);
      return k.forEach(function(A) {
        return A.classList.add("allow-interactivity-".concat(a));
      }), function() {
        document.body.classList.remove("block-interactivity-".concat(a)), k.forEach(function(A) {
          return A.classList.remove("allow-interactivity-".concat(a));
        });
      };
    }
  }, [e.inert, e.lockRef.current, e.shards]);
  var f = C.useCallback(function(k, A) {
    if ("touches" in k && k.touches.length === 2 || k.type === "wheel" && k.ctrlKey)
      return !d.current.allowPinchZoom;
    var T = qs(k), P = o.current, E = "deltaX" in k ? k.deltaX : P[0] - T[0], N = "deltaY" in k ? k.deltaY : P[1] - T[1], O, W = k.target, G = Math.abs(E) > Math.abs(N) ? "h" : "v";
    if ("touches" in k && G === "h" && W.type === "range")
      return !1;
    var K = window.getSelection(), L = K && K.anchorNode, X = L ? L === W || L.contains(W) : !1;
    if (X)
      return !1;
    var ae = ag(G, W);
    if (!ae)
      return !0;
    if (ae ? O = G : (O = G === "v" ? "h" : "v", ae = ag(G, W)), !ae)
      return !1;
    if (!i.current && "changedTouches" in k && (E || N) && (i.current = O), !O)
      return !0;
    var q = i.current || O;
    return iE(q, A, k, q === "h" ? E : N);
  }, []), m = C.useCallback(function(k) {
    var A = k;
    if (!(!qr.length || qr[qr.length - 1] !== c)) {
      var T = "deltaY" in A ? lg(A) : qs(A), P = n.current.filter(function(O) {
        return O.name === A.type && (O.target === A.target || A.target === O.shadowParent) && sE(O.delta, T);
      })[0];
      if (P && P.should) {
        A.cancelable && A.preventDefault();
        return;
      }
      if (!P) {
        var E = (d.current.shards || []).map(ug).filter(Boolean).filter(function(O) {
          return O.contains(A.target);
        }), N = E.length > 0 ? f(A, E[0]) : !d.current.noIsolation;
        N && A.cancelable && A.preventDefault();
      }
    }
  }, []), y = C.useCallback(function(k, A, T, P) {
    var E = { name: k, delta: A, target: T, should: P, shadowParent: cE(T) };
    n.current.push(E), setTimeout(function() {
      n.current = n.current.filter(function(N) {
        return N !== E;
      });
    }, 1);
  }, []), v = C.useCallback(function(k) {
    o.current = qs(k), i.current = void 0;
  }, []), l = C.useCallback(function(k) {
    y(k.type, lg(k), k.target, f(k, e.lockRef.current));
  }, []), p = C.useCallback(function(k) {
    y(k.type, qs(k), k.target, f(k, e.lockRef.current));
  }, []);
  C.useEffect(function() {
    return qr.push(c), e.setCallbacks({
      onScrollCapture: l,
      onWheelCapture: l,
      onTouchMoveCapture: p
    }), document.addEventListener("wheel", m, Jr), document.addEventListener("touchmove", m, Jr), document.addEventListener("touchstart", v, Jr), function() {
      qr = qr.filter(function(k) {
        return k !== c;
      }), document.removeEventListener("wheel", m, Jr), document.removeEventListener("touchmove", m, Jr), document.removeEventListener("touchstart", v, Jr);
    };
  }, []);
  var S = e.removeScrollBar, w = e.inert;
  return C.createElement(
    C.Fragment,
    null,
    w ? C.createElement(c, { styles: aE(a) }) : null,
    S ? C.createElement(Jb, { noRelative: e.noRelative, gapMode: e.gapMode }) : null
  );
}
function cE(e) {
  for (var n = null; e !== null; )
    e instanceof ShadowRoot && (n = e.host, e = e.host), e = e.parentNode;
  return n;
}
const dE = Vb(rS, uE);
var lS = C.forwardRef(function(e, n) {
  return C.createElement(Ha, qt({}, e, { ref: n, sideCar: dE }));
});
lS.classNames = Ha.classNames;
var fE = function(e) {
  if (typeof document > "u")
    return null;
  var n = Array.isArray(e) ? e[0] : e;
  return n.ownerDocument.body;
}, eo = /* @__PURE__ */ new WeakMap(), ea = /* @__PURE__ */ new WeakMap(), ta = {}, pc = 0, uS = function(e) {
  return e && (e.host || uS(e.parentNode));
}, pE = function(e, n) {
  return n.map(function(o) {
    if (e.contains(o))
      return o;
    var i = uS(o);
    return i && e.contains(i) ? i : (console.error("aria-hidden", o, "in not contained inside", e, ". Doing nothing"), null);
  }).filter(function(o) {
    return !!o;
  });
}, mE = function(e, n, o, i) {
  var a = pE(n, Array.isArray(e) ? e : [e]);
  ta[o] || (ta[o] = /* @__PURE__ */ new WeakMap());
  var c = ta[o], d = [], f = /* @__PURE__ */ new Set(), m = new Set(a), y = function(l) {
    !l || f.has(l) || (f.add(l), y(l.parentNode));
  };
  a.forEach(y);
  var v = function(l) {
    !l || m.has(l) || Array.prototype.forEach.call(l.children, function(p) {
      if (f.has(p))
        v(p);
      else
        try {
          var S = p.getAttribute(i), w = S !== null && S !== "false", k = (eo.get(p) || 0) + 1, A = (c.get(p) || 0) + 1;
          eo.set(p, k), c.set(p, A), d.push(p), k === 1 && w && ea.set(p, !0), A === 1 && p.setAttribute(o, "true"), w || p.setAttribute(i, "true");
        } catch (T) {
          console.error("aria-hidden: cannot operate on ", p, T);
        }
    });
  };
  return v(n), f.clear(), pc++, function() {
    d.forEach(function(l) {
      var p = eo.get(l) - 1, S = c.get(l) - 1;
      eo.set(l, p), c.set(l, S), p || (ea.has(l) || l.removeAttribute(i), ea.delete(l)), S || l.removeAttribute(o);
    }), pc--, pc || (eo = /* @__PURE__ */ new WeakMap(), eo = /* @__PURE__ */ new WeakMap(), ea = /* @__PURE__ */ new WeakMap(), ta = {});
  };
}, hE = function(e, n, o) {
  o === void 0 && (o = "data-aria-hidden");
  var i = Array.from(Array.isArray(e) ? e : [e]), a = fE(e);
  return a ? (i.push.apply(i, Array.from(a.querySelectorAll("[aria-live], script"))), mE(i, a, o, "aria-hidden")) : function() {
    return null;
  };
}, yE = Object.defineProperty, Ht = (e, n) => yE(e, "name", { value: n, configurable: !0 }), ef = "Dialog", [cS] = qP(ef), [gE, xn] = cS(ef), vE = /* @__PURE__ */ Ht((e) => {
  const {
    __scopeDialog: n,
    children: o,
    open: i,
    defaultOpen: a,
    onOpenChange: c,
    modal: d = !0
  } = e, f = C.useRef(null), m = C.useRef(null), [y, v] = F0({
    prop: i,
    defaultProp: a ?? !1,
    onChange: c,
    caller: ef
  }), [l, p] = C.useState(0), [S, w] = C.useState(0);
  return /* @__PURE__ */ x.jsx(
    gE,
    {
      scope: n,
      triggerRef: f,
      contentRef: m,
      contentId: ac(),
      titleId: ac(),
      descriptionId: ac(),
      titlePresent: l > 0,
      descriptionPresent: S > 0,
      setTitleCount: p,
      setDescriptionCount: w,
      open: y,
      onOpenChange: v,
      onOpenToggle: C.useCallback(() => v((k) => !k), [v]),
      modal: d,
      children: o
    }
  );
}, "Dialog"), dS = "DialogPortal", [SE, fS] = cS(dS, {
  forceMount: void 0
}), wE = /* @__PURE__ */ Ht((e) => {
  const { __scopeDialog: n, forceMount: o, children: i, container: a } = e, c = xn(dS, n);
  return /* @__PURE__ */ x.jsx(SE, { scope: n, forceMount: o, children: C.Children.map(i, (d) => /* @__PURE__ */ x.jsx(qd, { present: o || c.open, children: /* @__PURE__ */ x.jsx(Pb, { asChild: !0, container: a, children: d }) })) });
}, "DialogPortal"), ad = "DialogOverlay", xE = /* @__PURE__ */ C.forwardRef(
  /* @__PURE__ */ Ht(function(n, o) {
    const i = fS(ad, n.__scopeDialog), { forceMount: a = i.forceMount, ...c } = n, d = xn(ad, n.__scopeDialog);
    return d.modal ? /* @__PURE__ */ x.jsx(qd, { present: a || d.open, children: /* @__PURE__ */ x.jsx(TE, { ...c, ref: o }) }) : null;
  }, "DialogOverlay")
), _E = /* @__PURE__ */ B0("DialogOverlay.RemoveScroll"), TE = /* @__PURE__ */ C.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Ht(function(n, o) {
    const { __scopeDialog: i, ...a } = n, c = xn(ad, i), d = $0(), f = _t(o, d);
    return (
      // Make sure `Content` is scrollable even when it doesn't live inside `RemoveScroll`
      // ie. when `Overlay` and `Content` are siblings
      /* @__PURE__ */ x.jsx(lS, { as: _E, allowPinchZoom: !0, shards: [c.contentRef], children: /* @__PURE__ */ x.jsx(
        go.div,
        {
          "data-state": tf(c.open),
          ...a,
          ref: f,
          style: { pointerEvents: "auto", ...a.style }
        }
      ) })
    );
  }, "DialogOverlayImpl")
), xi = "DialogContent", kE = /* @__PURE__ */ C.forwardRef(
  /* @__PURE__ */ Ht(function(n, o) {
    const i = fS(xi, n.__scopeDialog), { forceMount: a = i.forceMount, ...c } = n, d = xn(xi, n.__scopeDialog);
    return /* @__PURE__ */ x.jsx(qd, { present: a || d.open, children: d.modal ? /* @__PURE__ */ x.jsx(AE, { ...c, ref: o }) : /* @__PURE__ */ x.jsx(CE, { ...c, ref: o }) });
  }, "DialogContent")
), AE = /* @__PURE__ */ C.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Ht(function(n, o) {
    const i = xn(xi, n.__scopeDialog), a = C.useRef(null), c = _t(o, i.contentRef, a);
    return C.useEffect(() => {
      const d = a.current;
      if (d) return hE(d);
    }, []), /* @__PURE__ */ x.jsx(
      pS,
      {
        ...n,
        ref: c,
        trapFocus: i.open,
        disableOutsidePointerEvents: i.open,
        onCloseAutoFocus: Tr(n.onCloseAutoFocus, (d) => {
          var f;
          d.preventDefault(), (f = i.triggerRef.current) == null || f.focus();
        }),
        onPointerDownOutside: Tr(n.onPointerDownOutside, (d) => {
          const f = d.detail.originalEvent, m = f.button === 0 && f.ctrlKey === !0;
          (f.button === 2 || m) && d.preventDefault();
        }),
        onFocusOutside: Tr(
          n.onFocusOutside,
          (d) => d.preventDefault()
        )
      }
    );
  }, "DialogContentModal")
), CE = /* @__PURE__ */ C.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Ht(function(n, o) {
    const i = xn(xi, n.__scopeDialog), a = C.useRef(!1), c = C.useRef(!1);
    return /* @__PURE__ */ x.jsx(
      pS,
      {
        ...n,
        ref: o,
        trapFocus: !1,
        disableOutsidePointerEvents: !1,
        onCloseAutoFocus: (d) => {
          var f, m;
          (f = n.onCloseAutoFocus) == null || f.call(n, d), d.defaultPrevented || (a.current || (m = i.triggerRef.current) == null || m.focus(), d.preventDefault()), a.current = !1, c.current = !1;
        },
        onInteractOutside: (d) => {
          var y, v;
          (y = n.onInteractOutside) == null || y.call(n, d), d.defaultPrevented || (a.current = !0, d.detail.originalEvent.type === "pointerdown" && (c.current = !0));
          const f = d.target;
          ((v = i.triggerRef.current) == null ? void 0 : v.contains(f)) && d.preventDefault(), d.detail.originalEvent.type === "focusin" && c.current && d.preventDefault();
        }
      }
    );
  }, "DialogContentNonModal")
), pS = /* @__PURE__ */ C.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Ht(function(n, o) {
    const { __scopeDialog: i, trapFocus: a, onOpenAutoFocus: c, onCloseAutoFocus: d, ...f } = n, m = xn(xi, i);
    return Eb(), /* @__PURE__ */ x.jsx(x.Fragment, { children: /* @__PURE__ */ x.jsx(
      kb,
      {
        asChild: !0,
        loop: !0,
        trapped: a,
        onMountAutoFocus: c,
        onUnmountAutoFocus: d,
        children: /* @__PURE__ */ x.jsx(
          xb,
          {
            role: "dialog",
            id: m.contentId,
            "aria-describedby": m.descriptionPresent ? m.descriptionId : void 0,
            "aria-labelledby": m.titlePresent ? m.titleId : void 0,
            "data-state": tf(m.open),
            ...f,
            ref: o,
            deferPointerDownOutside: !0,
            onDismiss: () => m.onOpenChange(!1)
          }
        )
      }
    ) });
  }, "DialogContentImpl")
), PE = "DialogTitle", bE = /* @__PURE__ */ C.forwardRef(
  /* @__PURE__ */ Ht(function(n, o) {
    const { __scopeDialog: i, ...a } = n, c = xn(PE, i), { setTitleCount: d } = c;
    return rn(() => (d((f) => f + 1), () => d((f) => f - 1)), [d]), /* @__PURE__ */ x.jsx(go.h2, { id: c.titleId, ...a, ref: o });
  }, "DialogTitle")
), EE = "DialogDescription", ME = /* @__PURE__ */ C.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Ht(function(n, o) {
    const { __scopeDialog: i, ...a } = n, c = xn(EE, i), { setDescriptionCount: d } = c;
    return rn(() => (d((f) => f + 1), () => d((f) => f - 1)), [d]), /* @__PURE__ */ x.jsx(go.p, { id: c.descriptionId, ...a, ref: o });
  }, "DialogDescription")
);
function tf(e) {
  return e ? "open" : "closed";
}
Ht(tf, "getState");
function RE() {
  const e = Q((a) => a.summaryRecord), n = Q((a) => a.closeSummary), o = Q((a) => a.startTimer), i = gn(e == null ? void 0 : e.selectedScene);
  return /* @__PURE__ */ x.jsx(vE, { open: !!e, onOpenChange: (a) => !a && n(), children: /* @__PURE__ */ x.jsx(Va, { children: e ? /* @__PURE__ */ x.jsxs(wE, { forceMount: !0, children: [
    /* @__PURE__ */ x.jsx(xE, { asChild: !0, children: /* @__PURE__ */ x.jsx(
      vn.div,
      {
        className: "summary-overlay",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
      }
    ) }),
    /* @__PURE__ */ x.jsx(kE, { asChild: !0, children: /* @__PURE__ */ x.jsxs(
      vn.article,
      {
        className: "summary-card liquid-glass",
        initial: { opacity: 0, y: 18, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 18, scale: 0.98 },
        children: [
          /* @__PURE__ */ x.jsx("span", { className: "focus-kicker", children: "Session complete" }),
          /* @__PURE__ */ x.jsx(bE, { children: "Focus block complete" }),
          /* @__PURE__ */ x.jsx(ME, { className: "sr-only", children: "Summary of the completed focus block." }),
          /* @__PURE__ */ x.jsx("p", { children: "You protected a focused block in your quiet study room." }),
          /* @__PURE__ */ x.jsxs("div", { className: "summary-grid", children: [
            /* @__PURE__ */ x.jsxs("div", { className: "summary-stat liquid-glass-lite", children: [
              /* @__PURE__ */ x.jsx("span", { children: "Focus time" }),
              /* @__PURE__ */ x.jsx("strong", { children: S0(e.totalFocusTime) })
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
            /* @__PURE__ */ x.jsx(be, { variant: "primary", onClick: () => {
              n(), o();
            }, children: "Continue studying" }),
            /* @__PURE__ */ x.jsx(be, { onClick: n, children: "Done" })
          ] })
        ]
      }
    ) })
  ] }) : null }) });
}
function mS(e, [n, o]) {
  return Math.min(o, Math.max(n, e));
}
function so(e, n, { checkForDefaultPrevented: o = !0 } = {}) {
  return function(a) {
    if (e == null || e(a), o === !1 || !a.defaultPrevented)
      return n == null ? void 0 : n(a);
  };
}
function hS(e, n = []) {
  let o = [];
  function i(c, d) {
    const f = C.createContext(d);
    f.displayName = c + "Context";
    const m = o.length;
    o = [...o, d];
    const y = (l) => {
      var T;
      const { scope: p, children: S, ...w } = l, k = ((T = p == null ? void 0 : p[e]) == null ? void 0 : T[m]) || f, A = C.useMemo(() => w, Object.values(w));
      return /* @__PURE__ */ x.jsx(k.Provider, { value: A, children: S });
    };
    y.displayName = c + "Provider";
    function v(l, p) {
      var k;
      const S = ((k = p == null ? void 0 : p[e]) == null ? void 0 : k[m]) || f, w = C.useContext(S);
      if (w) return w;
      if (d !== void 0) return d;
      throw new Error(`\`${l}\` must be used within \`${c}\``);
    }
    return [y, v];
  }
  const a = () => {
    const c = o.map((d) => C.createContext(d));
    return function(f) {
      const m = (f == null ? void 0 : f[e]) || c;
      return C.useMemo(
        () => ({ [`__scope${e}`]: { ...f, [e]: m } }),
        [f, m]
      );
    };
  };
  return a.scopeName = e, [i, DE(a, ...n)];
}
function DE(...e) {
  const n = e[0];
  if (e.length === 1) return n;
  const o = () => {
    const i = e.map((a) => ({
      useScope: a(),
      scopeName: a.scopeName
    }));
    return function(c) {
      const d = i.reduce((f, { useScope: m, scopeName: y }) => {
        const l = m(c)[`__scope${y}`];
        return { ...f, ...l };
      }, {});
      return C.useMemo(() => ({ [`__scope${n.scopeName}`]: d }), [d]);
    };
  };
  return o.scopeName = n.scopeName, o;
}
var NE = Ar[" useInsertionEffect ".trim().toString()] || rn;
function jE({
  prop: e,
  defaultProp: n,
  onChange: o = () => {
  },
  caller: i
}) {
  const [a, c, d] = IE({
    defaultProp: n,
    onChange: o
  }), f = e !== void 0, m = f ? e : a;
  {
    const v = C.useRef(e !== void 0);
    C.useEffect(() => {
      const l = v.current;
      l !== f && console.warn(
        `${i} is changing from ${l ? "controlled" : "uncontrolled"} to ${f ? "controlled" : "uncontrolled"}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
      ), v.current = f;
    }, [f, i]);
  }
  const y = C.useCallback(
    (v) => {
      var l;
      if (f) {
        const p = FE(v) ? v(e) : v;
        p !== e && ((l = d.current) == null || l.call(d, p));
      } else
        c(v);
    },
    [f, e, c, d]
  );
  return [m, y];
}
function IE({
  defaultProp: e,
  onChange: n
}) {
  const [o, i] = C.useState(e), a = C.useRef(o), c = C.useRef(n);
  return NE(() => {
    c.current = n;
  }, [n]), C.useEffect(() => {
    var d;
    a.current !== o && ((d = c.current) == null || d.call(c, o), a.current = o);
  }, [o, a]), [o, i, c];
}
function FE(e) {
  return typeof e == "function";
}
var OE = C.createContext(void 0);
function LE(e) {
  const n = C.useContext(OE);
  return e || n || "ltr";
}
function VE(e) {
  const n = C.useRef({ value: e, previous: e });
  return C.useMemo(() => (n.current.value !== e && (n.current.previous = n.current.value, n.current.value = e), n.current.previous), [e]);
}
function BE(e) {
  const [n, o] = C.useState(void 0);
  return rn(() => {
    if (e) {
      o({ width: e.offsetWidth, height: e.offsetHeight });
      const i = new ResizeObserver((a) => {
        if (!Array.isArray(a) || !a.length)
          return;
        const c = a[0];
        let d, f;
        if ("borderBoxSize" in c) {
          const m = c.borderBoxSize, y = Array.isArray(m) ? m[0] : m;
          d = y.inlineSize, f = y.blockSize;
        } else
          d = e.offsetWidth, f = e.offsetHeight;
        o({ width: d, height: f });
      });
      return i.observe(e, { box: "border-box" }), () => i.unobserve(e);
    } else
      o(void 0);
  }, [e]), n;
}
// @__NO_SIDE_EFFECTS__
function ld(e) {
  const n = C.forwardRef((o, i) => {
    let { children: a, ...c } = o, d = null, f = !1;
    const m = [];
    cg(a) && typeof na == "function" && (a = na(a._payload)), C.Children.forEach(a, (p) => {
      var S;
      if (WE(p)) {
        f = !0;
        const w = p;
        let k = "child" in w.props ? w.props.child : w.props.children;
        cg(k) && typeof na == "function" && (k = na(k._payload)), d = $E(w, k), m.push((S = d == null ? void 0 : d.props) == null ? void 0 : S.children);
      } else
        m.push(p);
    }), d ? d = C.cloneElement(d, void 0, m) : (
      // A `Slottable` was found but it didn't resolve to a single element (e.g.
      // it wrapped multiple elements, text, or a render-prop `child` that
      // wasn't an element). Don't fall back to treating the `Slottable` wrapper
      // itself as the slot target — throw a descriptive error below instead.
      !f && C.Children.count(a) === 1 && C.isValidElement(a) && (d = a)
    );
    const y = d ? HE(d) : void 0, v = _t(i, y);
    if (!d) {
      if (a || a === 0)
        throw new Error(
          f ? QE(e) : YE(e)
        );
      return a;
    }
    const l = UE(c, d.props ?? {});
    return d.type !== C.Fragment && (l.ref = i ? v : y), C.cloneElement(d, l);
  });
  return n.displayName = `${e}.Slot`, n;
}
var zE = Symbol.for("radix.slottable"), $E = (e, n) => {
  if ("child" in e.props) {
    const o = e.props.child;
    return C.isValidElement(o) ? C.cloneElement(o, void 0, e.props.children(o.props.children)) : null;
  }
  return C.isValidElement(n) ? n : null;
};
function UE(e, n) {
  const o = { ...n };
  for (const i in n) {
    const a = e[i], c = n[i];
    /^on[A-Z]/.test(i) ? a && c ? o[i] = (...f) => {
      const m = c(...f);
      return a(...f), m;
    } : a && (o[i] = a) : i === "style" ? o[i] = { ...a, ...c } : i === "className" && (o[i] = [a, c].filter(Boolean).join(" "));
  }
  return { ...e, ...o };
}
function HE(e) {
  var i, a;
  let n = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = n && "isReactWarning" in n && n.isReactWarning;
  return o ? e.ref : (n = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = n && "isReactWarning" in n && n.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
function WE(e) {
  return C.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === zE;
}
var GE = Symbol.for("react.lazy");
function cg(e) {
  return e != null && typeof e == "object" && "$$typeof" in e && e.$$typeof === GE && "_payload" in e && KE(e._payload);
}
function KE(e) {
  return typeof e == "object" && e !== null && "then" in e;
}
var YE = (e) => `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`, QE = (e) => `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`, na = Ar[" use ".trim().toString()], XE = [
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
], Ei = XE.reduce((e, n) => {
  const o = /* @__PURE__ */ ld(`Primitive.${n}`), i = C.forwardRef((a, c) => {
    const { asChild: d, ...f } = a, m = d ? o : n;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ x.jsx(m, { ...f, ref: c });
  });
  return i.displayName = `Primitive.${n}`, { ...e, [n]: i };
}, {});
function ZE(e) {
  const n = e + "CollectionProvider", [o, i] = hS(n), [a, c] = o(
    n,
    { collectionRef: { current: null }, itemMap: /* @__PURE__ */ new Map() }
  ), d = (k) => {
    const { scope: A, children: T } = k, P = C.useRef(null), E = C.useRef(/* @__PURE__ */ new Map()).current;
    return /* @__PURE__ */ x.jsx(a, { scope: A, itemMap: E, collectionRef: P, children: T });
  };
  d.displayName = n;
  const f = e + "CollectionSlot", m = /* @__PURE__ */ ld(f), y = C.forwardRef(
    (k, A) => {
      const { scope: T, children: P } = k, E = c(f, T), N = _t(A, E.collectionRef);
      return /* @__PURE__ */ x.jsx(m, { ref: N, children: P });
    }
  );
  y.displayName = f;
  const v = e + "CollectionItemSlot", l = "data-radix-collection-item", p = /* @__PURE__ */ ld(v), S = C.forwardRef(
    (k, A) => {
      const { scope: T, children: P, ...E } = k, N = C.useRef(null), O = _t(A, N), W = c(v, T);
      return C.useEffect(() => (W.itemMap.set(N, { ref: N, ...E }), () => void W.itemMap.delete(N))), /* @__PURE__ */ x.jsx(p, { [l]: "", ref: O, children: P });
    }
  );
  S.displayName = v;
  function w(k) {
    const A = c(e + "CollectionConsumer", k);
    return C.useCallback(() => {
      const P = A.collectionRef.current;
      if (!P) return [];
      const E = Array.from(P.querySelectorAll(`[${l}]`));
      return Array.from(A.itemMap.values()).sort(
        (W, G) => E.indexOf(W.ref.current) - E.indexOf(G.ref.current)
      );
    }, [A.collectionRef, A.itemMap]);
  }
  return [
    { Provider: d, Slot: y, ItemSlot: S },
    w,
    i
  ];
}
var yS = ["PageUp", "PageDown"], gS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"], vS = {
  "from-left": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-right": ["Home", "PageDown", "ArrowDown", "ArrowRight"],
  "from-bottom": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-top": ["Home", "PageDown", "ArrowUp", "ArrowLeft"]
}, vo = "Slider", [ud, JE, qE] = ZE(vo), [nf] = hS(vo, [
  qE
]), [eM, Mi] = nf(vo), rf = C.forwardRef(
  (e, n) => {
    const {
      name: o,
      min: i = 0,
      max: a = 100,
      step: c = 1,
      orientation: d = "horizontal",
      disabled: f = !1,
      minStepsBetweenThumbs: m = 0,
      defaultValue: y = [i],
      value: v,
      onValueChange: l = () => {
      },
      onValueCommit: p = () => {
      },
      inverted: S = !1,
      form: w,
      ...k
    } = e, A = C.useRef(/* @__PURE__ */ new Set()), T = C.useRef(0), P = C.useRef(!1), N = d === "horizontal" ? tM : nM, [O = [], W] = jE({
      prop: v,
      defaultProp: y,
      onChange: (q) => {
        var ue;
        (ue = [...A.current][T.current]) == null || ue.focus({
          preventScroll: !0,
          focusVisible: P.current
        }), P.current = !1, l(q);
      }
    }), G = C.useRef(O);
    function K(q) {
      const de = sM(O, q);
      ae(q, de);
    }
    function L(q) {
      ae(q, T.current);
    }
    function X() {
      const q = G.current[T.current];
      O[T.current] !== q && p(O);
    }
    function ae(q, de, { commit: ue } = { commit: !1 }) {
      const _e = cM(c), ve = dM(Math.round((q - i) / c) * c + i, _e), Se = mS(ve, [i, a]);
      W(($ = []) => {
        const Z = oM($, Se, de);
        if (uM(Z, m * c)) {
          T.current = Z.indexOf(Se);
          const Y = String(Z) !== String($);
          return Y && ue && p(Z), Y ? Z : $;
        } else
          return $;
      });
    }
    return /* @__PURE__ */ x.jsx(
      eM,
      {
        scope: e.__scopeSlider,
        name: o,
        disabled: f,
        min: i,
        max: a,
        valueIndexToChangeRef: T,
        thumbs: A.current,
        values: O,
        orientation: d,
        form: w,
        children: /* @__PURE__ */ x.jsx(ud.Provider, { scope: e.__scopeSlider, children: /* @__PURE__ */ x.jsx(ud.Slot, { scope: e.__scopeSlider, children: /* @__PURE__ */ x.jsx(
          N,
          {
            "aria-disabled": f,
            "data-disabled": f ? "" : void 0,
            ...k,
            ref: n,
            onPointerDown: so(k.onPointerDown, () => {
              f || (G.current = O, P.current = !1);
            }),
            min: i,
            max: a,
            inverted: S,
            onSlideStart: f ? void 0 : K,
            onSlideMove: f ? void 0 : L,
            onSlideEnd: f ? void 0 : X,
            onHomeKeyDown: () => {
              f || (P.current = !0, ae(i, 0, { commit: !0 }));
            },
            onEndKeyDown: () => {
              f || (P.current = !0, ae(a, O.length - 1, { commit: !0 }));
            },
            onStepKeyDown: ({ event: q, direction: de }) => {
              if (!f) {
                P.current = !0;
                const ve = yS.includes(q.key) || q.shiftKey && gS.includes(q.key) ? 10 : 1, Se = T.current, $ = O[Se], Z = c * ve * de;
                ae($ + Z, Se, { commit: !0 });
              }
            }
          }
        ) }) })
      }
    );
  }
);
rf.displayName = vo;
var [SS, wS] = nf(vo, {
  startEdge: "left",
  endEdge: "right",
  size: "width",
  direction: 1
}), tM = C.forwardRef(
  (e, n) => {
    const {
      min: o,
      max: i,
      dir: a,
      inverted: c,
      onSlideStart: d,
      onSlideMove: f,
      onSlideEnd: m,
      onStepKeyDown: y,
      ...v
    } = e, [l, p] = C.useState(null), S = _t(n, (E) => p(E)), w = C.useRef(void 0), k = LE(a), A = k === "ltr", T = A && !c || !A && c;
    function P(E) {
      const N = w.current || l.getBoundingClientRect(), O = [0, N.width], G = lf(O, T ? [o, i] : [i, o]);
      return w.current = N, G(E - N.left);
    }
    return /* @__PURE__ */ x.jsx(
      SS,
      {
        scope: e.__scopeSlider,
        startEdge: T ? "left" : "right",
        endEdge: T ? "right" : "left",
        direction: T ? 1 : -1,
        size: "width",
        children: /* @__PURE__ */ x.jsx(
          xS,
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
              const N = P(E.clientX);
              d == null || d(N);
            },
            onSlideMove: (E) => {
              const N = P(E.clientX);
              f == null || f(N);
            },
            onSlideEnd: () => {
              w.current = void 0, m == null || m();
            },
            onStepKeyDown: (E) => {
              const O = vS[T ? "from-left" : "from-right"].includes(E.key);
              y == null || y({ event: E, direction: O ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), nM = C.forwardRef(
  (e, n) => {
    const {
      min: o,
      max: i,
      inverted: a,
      onSlideStart: c,
      onSlideMove: d,
      onSlideEnd: f,
      onStepKeyDown: m,
      ...y
    } = e, v = C.useRef(null), l = _t(n, v), p = C.useRef(void 0), S = !a;
    function w(k) {
      const A = p.current || v.current.getBoundingClientRect(), T = [0, A.height], E = lf(T, S ? [i, o] : [o, i]);
      return p.current = A, E(k - A.top);
    }
    return /* @__PURE__ */ x.jsx(
      SS,
      {
        scope: e.__scopeSlider,
        startEdge: S ? "bottom" : "top",
        endEdge: S ? "top" : "bottom",
        size: "height",
        direction: S ? 1 : -1,
        children: /* @__PURE__ */ x.jsx(
          xS,
          {
            "data-orientation": "vertical",
            ...y,
            ref: l,
            style: {
              ...y.style,
              "--radix-slider-thumb-transform": "translateY(50%)"
            },
            onSlideStart: (k) => {
              const A = w(k.clientY);
              c == null || c(A);
            },
            onSlideMove: (k) => {
              const A = w(k.clientY);
              d == null || d(A);
            },
            onSlideEnd: () => {
              p.current = void 0, f == null || f();
            },
            onStepKeyDown: (k) => {
              const T = vS[S ? "from-bottom" : "from-top"].includes(k.key);
              m == null || m({ event: k, direction: T ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), xS = C.forwardRef(
  (e, n) => {
    const {
      __scopeSlider: o,
      onSlideStart: i,
      onSlideMove: a,
      onSlideEnd: c,
      onHomeKeyDown: d,
      onEndKeyDown: f,
      onStepKeyDown: m,
      ...y
    } = e, v = Mi(vo, o);
    return /* @__PURE__ */ x.jsx(
      Ei.span,
      {
        ...y,
        ref: n,
        onKeyDown: so(e.onKeyDown, (l) => {
          l.key === "Home" ? (d(l), l.preventDefault()) : l.key === "End" ? (f(l), l.preventDefault()) : yS.concat(gS).includes(l.key) && (m(l), l.preventDefault());
        }),
        onPointerDown: so(e.onPointerDown, (l) => {
          const p = l.target;
          p.setPointerCapture(l.pointerId), l.preventDefault(), v.thumbs.has(p) ? p.focus({ preventScroll: !0, focusVisible: !1 }) : i(l);
        }),
        onPointerMove: so(e.onPointerMove, (l) => {
          l.target.hasPointerCapture(l.pointerId) && a(l);
        }),
        onPointerUp: so(e.onPointerUp, (l) => {
          const p = l.target;
          p.hasPointerCapture(l.pointerId) && (p.releasePointerCapture(l.pointerId), c(l));
        })
      }
    );
  }
), _S = "SliderTrack", of = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Mi(_S, o);
    return /* @__PURE__ */ x.jsx(
      Ei.span,
      {
        "data-disabled": a.disabled ? "" : void 0,
        "data-orientation": a.orientation,
        ...i,
        ref: n
      }
    );
  }
);
of.displayName = _S;
var cd = "SliderRange", sf = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Mi(cd, o), c = wS(cd, o), d = C.useRef(null), f = _t(n, d), m = a.values.length, y = a.values.map(
      (p) => MS(p, a.min, a.max)
    ), v = m > 1 ? Math.min(...y) : 0, l = 100 - Math.max(...y);
    return /* @__PURE__ */ x.jsx(
      Ei.span,
      {
        "data-orientation": a.orientation,
        "data-disabled": a.disabled ? "" : void 0,
        ...i,
        ref: f,
        style: {
          ...e.style,
          [c.startEdge]: v + "%",
          [c.endEdge]: l + "%"
        }
      }
    );
  }
);
sf.displayName = cd;
var TS = "SliderThumb", [rM, kS] = nf(TS), AS = "SliderThumbProvider";
function CS(e) {
  const {
    __scopeSlider: n,
    name: o,
    children: i,
    // @ts-expect-error internal render prop
    internal_do_not_use_render: a
  } = e, c = Mi(AS, n), d = JE(n), [f, m] = C.useState(null), y = C.useMemo(
    () => f ? d().findIndex((A) => A.ref.current === f) : -1,
    [d, f]
  ), v = BE(f), l = f ? !!c.form || !!f.closest("form") : !0, p = c.values[y], S = o ?? (c.name ? c.name + (c.values.length > 1 ? "[]" : "") : void 0), w = p === void 0 ? 0 : MS(p, c.min, c.max);
  C.useEffect(() => {
    if (f)
      return c.thumbs.add(f), () => {
        c.thumbs.delete(f);
      };
  }, [f, c.thumbs]);
  const k = {
    value: p,
    name: S,
    form: c.form,
    isFormControl: l,
    index: y,
    thumb: f,
    onThumbChange: m,
    percent: w,
    size: v
  };
  return /* @__PURE__ */ x.jsx(rM, { scope: n, ...k, children: fM(a) ? a(k) : i });
}
CS.displayName = AS;
var ya = "SliderThumbTrigger", PS = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Mi(ya, o), c = wS(ya, o), { index: d, value: f, percent: m, size: y, onThumbChange: v } = kS(
      ya,
      o
    ), l = _t(n, (k) => v(k)), p = iM(d, a.values.length), S = y == null ? void 0 : y[c.size], w = S ? aM(S, m, c.direction) : 0;
    return /* @__PURE__ */ x.jsx(
      "span",
      {
        style: {
          transform: "var(--radix-slider-thumb-transform)",
          position: "absolute",
          [c.startEdge]: `calc(${m}% + ${w}px)`
        },
        children: /* @__PURE__ */ x.jsx(ud.ItemSlot, { scope: o, children: /* @__PURE__ */ x.jsx(
          Ei.span,
          {
            role: "slider",
            "aria-label": e["aria-label"] || p,
            "aria-valuemin": a.min,
            "aria-valuenow": f,
            "aria-valuemax": a.max,
            "aria-orientation": a.orientation,
            "data-orientation": a.orientation,
            "data-disabled": a.disabled ? "" : void 0,
            tabIndex: a.disabled ? void 0 : 0,
            ...i,
            ref: l,
            style: f === void 0 ? { display: "none" } : e.style,
            onFocus: so(e.onFocus, () => {
              a.valueIndexToChangeRef.current = d;
            })
          }
        ) })
      }
    );
  }
);
PS.displayName = ya;
var af = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, name: i, ...a } = e;
    return /* @__PURE__ */ x.jsx(
      CS,
      {
        __scopeSlider: o,
        name: i,
        internal_do_not_use_render: ({ index: c, isFormControl: d }) => /* @__PURE__ */ x.jsxs(x.Fragment, { children: [
          /* @__PURE__ */ x.jsx(
            PS,
            {
              ...a,
              ref: n,
              __scopeSlider: o
            }
          ),
          d ? /* @__PURE__ */ x.jsx(
            ES,
            {
              __scopeSlider: o
            },
            c
          ) : null
        ] })
      }
    );
  }
);
af.displayName = TS;
var bS = "SliderBubbleInput", ES = C.forwardRef(
  ({ __scopeSlider: e, ...n }, o) => {
    const { value: i, name: a, form: c } = kS(bS, e), d = C.useRef(null), f = _t(d, o), m = VE(i);
    return C.useEffect(() => {
      const y = d.current;
      if (!y) return;
      const v = window.HTMLInputElement.prototype, p = Object.getOwnPropertyDescriptor(v, "value").set;
      if (m !== i && p) {
        const S = new Event("input", { bubbles: !0 });
        p.call(y, i), y.dispatchEvent(S);
      }
    }, [m, i]), /* @__PURE__ */ x.jsx(
      Ei.input,
      {
        style: { display: "none" },
        name: a,
        form: c,
        ...n,
        ref: f,
        defaultValue: i
      }
    );
  }
);
ES.displayName = bS;
function oM(e = [], n, o) {
  const i = [...e];
  return i[o] = n, i.sort((a, c) => a - c);
}
function MS(e, n, o) {
  const c = 100 / (o - n) * (e - n);
  return mS(c, [0, 100]);
}
function iM(e, n) {
  return n > 2 ? `Value ${e + 1} of ${n}` : n === 2 ? ["Minimum", "Maximum"][e] : void 0;
}
function sM(e, n) {
  if (e.length === 1) return 0;
  const o = e.map((a) => Math.abs(a - n)), i = Math.min(...o);
  return o.indexOf(i);
}
function aM(e, n, o) {
  const i = e / 2, c = lf([0, 50], [0, i]);
  return (i - c(n) * o) * o;
}
function lM(e) {
  return e.slice(0, -1).map((n, o) => e[o + 1] - n);
}
function uM(e, n) {
  if (n > 0) {
    const o = lM(e);
    return Math.min(...o) >= n;
  }
  return !0;
}
function lf(e, n) {
  return (o) => {
    if (e[0] === e[1] || n[0] === n[1]) return n[0];
    const i = (n[1] - n[0]) / (e[1] - e[0]);
    return n[0] + i * (o - e[0]);
  };
}
function cM(e) {
  if (!Number.isFinite(e)) return 0;
  const n = e.toString();
  if (n.includes("e")) {
    const [i, a] = n.split("e"), c = i.split(".")[1] || "", d = Number(a);
    return Math.max(0, c.length - d);
  }
  const o = n.split(".")[1];
  return o ? o.length : 0;
}
function dM(e, n) {
  const o = Math.pow(10, n);
  return Math.round(e * o) / o;
}
function fM(e) {
  return typeof e == "function";
}
function dg({ label: e, icon: n, value: o, onChange: i }) {
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
      rf,
      {
        className: "radix-slider-root",
        value: [o],
        min: 0,
        max: 100,
        step: 1,
        onValueChange: (a) => i(a[0]),
        children: [
          /* @__PURE__ */ x.jsx(of, { className: "radix-slider-track", children: /* @__PURE__ */ x.jsx(sf, { className: "radix-slider-range" }) }),
          /* @__PURE__ */ x.jsx(af, { className: "radix-slider-thumb", "aria-label": e })
        ]
      }
    )
  ] });
}
function pM({ audioState: e }) {
  const n = Q((v) => v.musicType), o = Q((v) => v.ambientSound), i = Q((v) => v.musicVolume), a = Q((v) => v.ambientVolume), c = Q((v) => v.audioPlaying), d = Q((v) => v.setSound), f = Q((v) => v.toggleAudio), m = za({ musicType: n, ambientSound: o }), y = m.ambientLayers.map((v) => v.title).filter(Boolean).join(" + ");
  return /* @__PURE__ */ x.jsxs("div", { className: "sound-panel", children: [
    /* @__PURE__ */ x.jsxs("label", { className: "focus-field", children: [
      "Music selector",
      /* @__PURE__ */ x.jsx("select", { value: n, onChange: (v) => d("musicType", v.target.value), children: Kn.map((v) => /* @__PURE__ */ x.jsx("option", { value: v.label, children: v.label }, v.label)) })
    ] }),
    /* @__PURE__ */ x.jsx(
      dg,
      {
        label: "Music volume",
        icon: /* @__PURE__ */ x.jsx(Ua, { size: 16, "aria-hidden": "true" }),
        value: i,
        onChange: (v) => d("musicVolume", v)
      }
    ),
    /* @__PURE__ */ x.jsxs("label", { className: "focus-field", children: [
      "Ambient sound selector",
      /* @__PURE__ */ x.jsx("select", { value: o, onChange: (v) => d("ambientSound", v.target.value), children: Yn.map((v) => /* @__PURE__ */ x.jsx("option", { value: v.label, children: v.label }, v.label)) })
    ] }),
    /* @__PURE__ */ x.jsx(
      dg,
      {
        label: "Ambient volume",
        icon: /* @__PURE__ */ x.jsx(Kd, { size: 16, "aria-hidden": "true" }),
        value: a,
        onChange: (v) => d("ambientVolume", v)
      }
    ),
    /* @__PURE__ */ x.jsxs("div", { className: "audio-preview liquid-glass-lite", children: [
      /* @__PURE__ */ x.jsxs("div", { children: [
        /* @__PURE__ */ x.jsx("span", { className: "focus-kicker", children: "Theme audio preview" }),
        /* @__PURE__ */ x.jsx("strong", { children: m.musicTrack.title }),
        /* @__PURE__ */ x.jsx("p", { children: y }),
        e != null && e.error ? /* @__PURE__ */ x.jsx("p", { className: "audio-error", children: e.error }) : null
      ] }),
      /* @__PURE__ */ x.jsx(be, { variant: c ? "primary" : "ghost", onClick: f, children: c ? "Pause audio" : "Play audio" })
    ] }),
    /* @__PURE__ */ x.jsx("div", { className: "audio-links", children: [m.musicTrack, ...m.ambientLayers].filter((v) => v == null ? void 0 : v.pageUrl).map((v) => /* @__PURE__ */ x.jsx("a", { href: v.pageUrl, target: "_blank", rel: "noreferrer", children: v.title || v.label || "Audio source" }, v.pageUrl)) })
  ] });
}
const mM = [
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
], hM = [
  ["white-noise", "White noise"],
  ["pink-noise", "Pink noise"],
  ["brown-noise", "Brown noise"]
], yM = [
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
function ra({ id: e, label: n, value: o, icon: i = null, onChange: a, card: c = !1 }) {
  const d = Number.isFinite(Number(o)) ? Number(o) : 0, f = d > 0;
  return /* @__PURE__ */ x.jsxs("label", { className: [
    "room-channel",
    i ? "room-channel-master" : "",
    c ? "room-channel-card" : "",
    f ? "is-active" : ""
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
      rf,
      {
        className: "radix-slider-root",
        value: [d],
        min: 0,
        max: 100,
        step: 1,
        onValueChange: (m) => a(e, m[0]),
        children: [
          /* @__PURE__ */ x.jsx(of, { className: "radix-slider-track", children: /* @__PURE__ */ x.jsx(sf, { className: "radix-slider-range" }) }),
          /* @__PURE__ */ x.jsx(af, { className: "radix-slider-thumb", "aria-label": `${n} volume` })
        ]
      }
    )
  ] });
}
function gM({ audioState: e, scene: n, onClose: o }) {
  const i = Q((T) => T.audioChannels), a = Q((T) => T.setSound), c = Q((T) => T.returnToSetup), d = Q((T) => T.musicType), f = Q((T) => T.ambientSound), m = Q((T) => T.musicVolume), y = Q((T) => T.ambientVolume), [v, l] = C.useState(!1), p = (T, P) => {
    l(!1), a(`audioChannel:${T}`, P);
  }, S = (T, P) => a("musicVolume", P), w = (T, P) => a("ambientVolume", P), k = () => {
    const T = Kn[Math.floor(Math.random() * Kn.length)], P = Yn[Math.floor(Math.random() * Yn.length)];
    a("musicType", T.label), a("ambientSound", P.label), l(!1);
  }, A = () => {
    a("musicType", (n == null ? void 0 : n.musicType) || "Deep Focus"), a("ambientSound", (n == null ? void 0 : n.ambientSound) || "Nature"), l(!0);
  };
  return /* @__PURE__ */ x.jsxs(
    vn.aside,
    {
      className: "focus-utility-panel room-control-panel liquid-glass",
      initial: { opacity: 0, y: 18 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 14 },
      transition: ba,
      role: "dialog",
      "aria-label": "Room settings",
      children: [
        /* @__PURE__ */ x.jsxs("header", { className: "room-control-head", children: [
          /* @__PURE__ */ x.jsxs("div", { children: [
            /* @__PURE__ */ x.jsx("span", { className: "control-eyebrow", children: "Control" }),
            /* @__PURE__ */ x.jsx("h2", { children: "Room settings" })
          ] }),
          /* @__PURE__ */ x.jsx(be, { className: "room-control-close", "aria-label": "Close room settings", onClick: o, children: /* @__PURE__ */ x.jsx(M0, { size: 16, "aria-hidden": "true" }) })
        ] }),
        /* @__PURE__ */ x.jsx("div", { className: "room-control-divider", "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("div", { className: "room-control-setup-actions", children: /* @__PURE__ */ x.jsx(
          be,
          {
            className: "room-control-setup-btn",
            onClick: () => {
              o == null || o(), c();
            },
            "data-focus-return-setup": "true",
            children: "Change scene & setup"
          }
        ) }),
        /* @__PURE__ */ x.jsxs("div", { className: "room-control-grid", children: [
          /* @__PURE__ */ x.jsxs("section", { className: "room-control-col room-control-scenes", "aria-label": "Scenes", children: [
            /* @__PURE__ */ x.jsx("h3", { className: "room-control-section-title", children: "Scenes" }),
            /* @__PURE__ */ x.jsx(Yd, {})
          ] }),
          /* @__PURE__ */ x.jsxs("section", { className: "room-control-col room-control-audio", children: [
            /* @__PURE__ */ x.jsxs("div", { className: "room-control-masters", children: [
              /* @__PURE__ */ x.jsxs("div", { className: "room-control-block", children: [
                /* @__PURE__ */ x.jsxs("div", { className: "room-control-block-head", children: [
                  /* @__PURE__ */ x.jsx("h3", { className: "room-control-section-title", children: "Music" }),
                  /* @__PURE__ */ x.jsx(be, { className: "room-control-icon-btn", "aria-label": "Shuffle to a random track", onClick: k, children: /* @__PURE__ */ x.jsx(gP, { size: 15, "aria-hidden": "true" }) })
                ] }),
                /* @__PURE__ */ x.jsxs("label", { className: "room-select-field", children: [
                  /* @__PURE__ */ x.jsx("span", { className: "sr-only", children: "Music track" }),
                  /* @__PURE__ */ x.jsx("select", { value: d, onChange: (T) => {
                    l(!1), a("musicType", T.target.value);
                  }, children: Kn.map((T) => /* @__PURE__ */ x.jsx("option", { value: T.label, children: T.label }, T.label)) })
                ] }),
                /* @__PURE__ */ x.jsx(ra, { id: "music-volume", label: "Music volume", icon: /* @__PURE__ */ x.jsx(Ua, { size: 15, "aria-hidden": "true" }), value: m, onChange: S })
              ] }),
              /* @__PURE__ */ x.jsxs("div", { className: "room-control-block", children: [
                /* @__PURE__ */ x.jsxs("div", { className: "room-control-block-head", children: [
                  /* @__PURE__ */ x.jsx("h3", { className: "room-control-section-title", children: "Scene sound" }),
                  /* @__PURE__ */ x.jsx(be, { className: "room-control-icon-btn", "aria-label": v ? "Mix saved" : "Save current mix", onClick: () => l(!0), children: v ? /* @__PURE__ */ x.jsx(P0, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ x.jsx(b0, { size: 15, "aria-hidden": "true" }) })
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
                  /* @__PURE__ */ x.jsx("select", { value: f, onChange: (T) => {
                    l(!1), a("ambientSound", T.target.value);
                  }, children: Yn.map((T) => /* @__PURE__ */ x.jsx("option", { value: T.label, children: T.label }, T.label)) })
                ] }),
                /* @__PURE__ */ x.jsx(ra, { id: "ambient-volume", label: "Ambient volume", icon: /* @__PURE__ */ x.jsx(Kd, { size: 15, "aria-hidden": "true" }), value: y, onChange: w })
              ] })
            ] }),
            /* @__PURE__ */ x.jsxs("div", { className: "room-control-block", children: [
              /* @__PURE__ */ x.jsx("h3", { className: "room-control-section-title", children: "Focus noise" }),
              /* @__PURE__ */ x.jsx("div", { className: "room-noise-row", children: hM.map(([T, P]) => /* @__PURE__ */ x.jsx(ra, { id: T, label: P, value: i == null ? void 0 : i[T], onChange: p, card: !0 }, T)) })
            ] }),
            /* @__PURE__ */ x.jsxs("div", { className: "room-control-block", children: [
              /* @__PURE__ */ x.jsx("h3", { className: "room-control-section-title", children: "Ambient atmosphere" }),
              /* @__PURE__ */ x.jsx("div", { className: "room-ambient-grid", children: yM.map(([T, P]) => /* @__PURE__ */ x.jsx(ra, { id: T, label: P, value: i == null ? void 0 : i[T], onChange: p, card: !0 }, T)) })
            ] }),
            e != null && e.error ? /* @__PURE__ */ x.jsx("p", { className: "audio-error", children: e.error }) : null
          ] })
        ] })
      ]
    }
  );
}
function oa({ title: e, kicker: n, icon: o, children: i, onClose: a, className: c = "" }) {
  return /* @__PURE__ */ x.jsxs(vn.aside, { className: `focus-utility-panel liquid-glass ${c}`.trim(), initial: { opacity: 0, y: 12, x: -18 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: 10, x: -18 }, transition: ba, role: "dialog", "aria-label": e, children: [
    /* @__PURE__ */ x.jsxs("div", { className: "drawer-head", children: [
      /* @__PURE__ */ x.jsxs("div", { className: "utility-title", children: [
        /* @__PURE__ */ x.jsx("span", { className: "utility-title-icon", children: o }),
        /* @__PURE__ */ x.jsxs("div", { children: [
          /* @__PURE__ */ x.jsx("span", { className: "focus-kicker", children: n }),
          /* @__PURE__ */ x.jsx("h2", { children: e })
        ] })
      ] }),
      /* @__PURE__ */ x.jsx(be, { "aria-label": `Close ${e}`, onClick: a, children: /* @__PURE__ */ x.jsx(M0, { size: 16, "aria-hidden": "true" }) })
    ] }),
    /* @__PURE__ */ x.jsx("div", { className: "utility-panel-body", children: i })
  ] });
}
function vM({ audioState: e, scene: n }) {
  const o = Q((y) => y.audioChannels), i = Q((y) => y.setSound), [a, c] = C.useState(!1), d = (y, v) => {
    c(!1), i(`audioChannel:${y}`, v);
  }, f = () => {
    const y = Kn[Math.floor(Math.random() * Kn.length)], v = Yn[Math.floor(Math.random() * Yn.length)];
    i("musicType", y.label), i("ambientSound", v.label), c(!0);
  }, m = () => {
    i("musicType", (n == null ? void 0 : n.musicType) || "Deep Focus"), i("ambientSound", (n == null ? void 0 : n.ambientSound) || "Nature"), c(!0);
  };
  return /* @__PURE__ */ x.jsxs("div", { className: "sound-mixer", children: [
    /* @__PURE__ */ x.jsxs("div", { className: "mixer-featured-row", children: [
      /* @__PURE__ */ x.jsx("span", { className: "focus-kicker", children: "Music library" }),
      /* @__PURE__ */ x.jsxs(be, { onClick: f, children: [
        /* @__PURE__ */ x.jsx(QC, { size: 14, "aria-hidden": "true" }),
        " Random track"
      ] })
    ] }),
    /* @__PURE__ */ x.jsx(pM, { audioState: e, compact: !0 }),
    /* @__PURE__ */ x.jsxs("div", { className: "mixer-preset-row", children: [
      /* @__PURE__ */ x.jsxs("button", { type: "button", className: "mixer-preset-button", onClick: m, children: [
        "Apply scene mix ",
        /* @__PURE__ */ x.jsx("span", { children: "↗" })
      ] }),
      /* @__PURE__ */ x.jsxs(be, { onClick: () => c(!0), children: [
        a ? /* @__PURE__ */ x.jsx(P0, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ x.jsx(b0, { size: 14, "aria-hidden": "true" }),
        " ",
        a ? "Saved" : "Save current mix"
      ] })
    ] }),
    /* @__PURE__ */ x.jsx("div", { className: "mixer-channel-grid", children: mM.map(([y, v]) => /* @__PURE__ */ x.jsxs("label", { className: "mixer-channel", children: [
      /* @__PURE__ */ x.jsxs("span", { children: [
        /* @__PURE__ */ x.jsx("i", { className: `mixer-channel-dot mixer-${y}` }),
        v
      ] }),
      /* @__PURE__ */ x.jsxs("strong", { children: [
        o[y],
        "%"
      ] }),
      /* @__PURE__ */ x.jsx("input", { type: "range", min: "0", max: "100", value: o[y], "aria-label": `${v} volume`, onChange: (l) => d(y, l.target.value) })
    ] }, y)) }),
    e != null && e.error ? /* @__PURE__ */ x.jsx("p", { className: "audio-error", children: e.error }) : null
  ] });
}
function SM() {
  const e = () => {
    var i, a, c;
    return ((c = (a = (i = globalThis.window) == null ? void 0 : i.SynapseAuth) == null ? void 0 : a.getStoredSession) == null ? void 0 : c.call(a)) || null;
  }, [n, o] = C.useState(e);
  return C.useEffect(() => {
    var d, f, m, y;
    let i = !0;
    const a = (v) => {
      var l;
      i && o(((l = v == null ? void 0 : v.detail) == null ? void 0 : l.session) || e());
    };
    (d = globalThis.window) == null || d.addEventListener("synapse-auth-changed", a);
    const c = (y = (m = (f = globalThis.window) == null ? void 0 : f.SynapseAuth) == null ? void 0 : m.syncSessionFromProvider) == null ? void 0 : y.call(m);
    return Promise.resolve(c).finally(() => a()), () => {
      var v;
      i = !1, (v = globalThis.window) == null || v.removeEventListener("synapse-auth-changed", a);
    };
  }, []), n;
}
function wM({ onWorkspace: e, session: n }) {
  return !!n ? /* @__PURE__ */ x.jsxs("div", { className: "utility-empty-state", children: [
    /* @__PURE__ */ x.jsx(Da, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ x.jsx("h3", { children: "Your Focus Trail" }),
    /* @__PURE__ */ x.jsx("p", { children: "Recent sessions and progress remain available through Synapse history." }),
    /* @__PURE__ */ x.jsx(be, { variant: "primary", onClick: () => e == null ? void 0 : e("", "history"), children: "Open session history" })
  ] }) : /* @__PURE__ */ x.jsxs("div", { className: "utility-login-state", children: [
    /* @__PURE__ */ x.jsx(Da, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ x.jsx("span", { className: "focus-kicker", children: "Your rhythm, remembered" }),
    /* @__PURE__ */ x.jsx("h3", { children: "Sign in to view your Focus Trail" }),
    /* @__PURE__ */ x.jsx("p", { children: "Track deep-work time, completed goals, and your study streak across devices." }),
    /* @__PURE__ */ x.jsx(be, { variant: "primary", onClick: () => e == null ? void 0 : e(), children: "Sign in with Synapse" }),
    /* @__PURE__ */ x.jsx("small", { children: "Your current session continues without an account." })
  ] });
}
function xM({ onWorkspace: e, session: n }) {
  return !!n ? /* @__PURE__ */ x.jsxs("div", { className: "utility-empty-state", children: [
    /* @__PURE__ */ x.jsx(Na, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ x.jsx("h3", { children: "Companion Room" }),
    /* @__PURE__ */ x.jsx("p", { children: "Invite a study partner from your Synapse workspace to share this quiet room." }),
    /* @__PURE__ */ x.jsx(be, { variant: "primary", onClick: () => e == null ? void 0 : e("", "companion"), children: "Open Companion Room" })
  ] }) : /* @__PURE__ */ x.jsxs("div", { className: "utility-login-state", children: [
    /* @__PURE__ */ x.jsx(Na, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ x.jsx("span", { className: "focus-kicker", children: "Study alongside someone" }),
    /* @__PURE__ */ x.jsx("h3", { children: "Sign in to use Companion Room" }),
    /* @__PURE__ */ x.jsx("p", { children: "Keep your own goal private while sharing the feeling of showing up together." }),
    /* @__PURE__ */ x.jsx(be, { variant: "primary", onClick: () => e == null ? void 0 : e(), children: "Go to sign in" }),
    /* @__PURE__ */ x.jsx("small", { children: "No companion data is created in Focus Room." })
  ] });
}
function _M({ audioState: e, utilityPanel: n, onClose: o, onWorkspace: i }) {
  const a = Q((y) => y.activeDrawer), c = Q((y) => y.closeDrawer), d = Q((y) => y.selectedScene), f = SM(), m = C.useMemo(() => Sn.find((y) => y.id === d) || Sn[0], [d]);
  return /* @__PURE__ */ x.jsxs(Va, { children: [
    n === "trail" ? /* @__PURE__ */ x.jsx(oa, { title: "Focus Trail", kicker: "Your progress", icon: /* @__PURE__ */ x.jsx(Da, { size: 16 }), onClose: o, children: /* @__PURE__ */ x.jsx(wM, { onWorkspace: i, session: f }) }) : null,
    n === "companion" ? /* @__PURE__ */ x.jsx(oa, { title: "Companion Room", kicker: "Shared focus", icon: /* @__PURE__ */ x.jsx(Na, { size: 16 }), onClose: o, children: /* @__PURE__ */ x.jsx(xM, { onWorkspace: i, session: f }) }) : null,
    n === "settings" ? /* @__PURE__ */ x.jsx(gM, { audioState: e, scene: m, onClose: o }) : null,
    !n && a === "scene" ? /* @__PURE__ */ x.jsx(oa, { title: "Choose scene", kicker: "Scene", icon: /* @__PURE__ */ x.jsx(E0, { size: 16 }), onClose: c, children: /* @__PURE__ */ x.jsx(Yd, {}) }) : null,
    !n && a === "music" ? /* @__PURE__ */ x.jsx(oa, { title: "Sound atmosphere", kicker: "Room audio", icon: /* @__PURE__ */ x.jsx(Ua, { size: 16 }), onClose: c, children: /* @__PURE__ */ x.jsx(vM, { audioState: e, scene: m }) }) : null
  ] });
}
function TM(e, n) {
  return n ? Math.min(100, Math.max(0, e / n * 100)) : 0;
}
function kM({ onExit: e }) {
  const n = Q((y) => y.elapsedSeconds), o = Q((y) => y.pomodoroDuration), i = Q((y) => y.pomodoroDurationSeconds), a = Q((y) => y.timerMode), c = Q((y) => y.timerStatus), d = Q((y) => y.currentSession), f = Number(i) || (Number(o) || 0) * 60, m = a === "countup" ? n : Math.max(0, f - n);
  return /* @__PURE__ */ x.jsxs("div", { className: "compact-focus-mode-card", "aria-label": "Distraction-free focus timer", children: [
    /* @__PURE__ */ x.jsxs("div", { className: "compact-focus-card-top", children: [
      /* @__PURE__ */ x.jsxs("span", { children: [
        "POMODORO #",
        (d == null ? void 0 : d.pomodoroNumber) || 1
      ] }),
      /* @__PURE__ */ x.jsx(be, { className: "compact-exit-button", onClick: e, "aria-label": "Exit Focus Mode", children: /* @__PURE__ */ x.jsx(nP, { size: 14, "aria-hidden": "true" }) })
    ] }),
    /* @__PURE__ */ x.jsxs("span", { className: "compact-focus-status", children: [
      /* @__PURE__ */ x.jsx("i", {}),
      c === "paused" ? "Paused" : "In focus"
    ] }),
    /* @__PURE__ */ x.jsx("strong", { children: Yc(m) }),
    /* @__PURE__ */ x.jsx("div", { className: "compact-focus-progress", children: /* @__PURE__ */ x.jsx("span", { style: { width: `${TM(n, f)}%` } }) }),
    /* @__PURE__ */ x.jsxs("small", { children: [
      Xd(f),
      " session"
    ] }),
    /* @__PURE__ */ x.jsx("span", { className: "sr-only", children: "Press Escape to exit Focus Mode." })
  ] });
}
var mc = {};
/*!
 *  howler.js v2.2.4
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */
var fg;
function AM() {
  return fg || (fg = 1, (function(e) {
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
          var p = this || o;
          if (l = parseFloat(l), p.ctx || v(), typeof l < "u" && l >= 0 && l <= 1) {
            if (p._volume = l, p._muted)
              return p;
            p.usingWebAudio && p.masterGain.gain.setValueAtTime(l, o.ctx.currentTime);
            for (var S = 0; S < p._howls.length; S++)
              if (!p._howls[S]._webAudio)
                for (var w = p._howls[S]._getSoundIds(), k = 0; k < w.length; k++) {
                  var A = p._howls[S]._soundById(w[k]);
                  A && A._node && (A._node.volume = A._volume * l);
                }
            return p;
          }
          return p._volume;
        },
        /**
         * Handle muting and unmuting globally.
         * @param  {Boolean} muted Is muted or not.
         */
        mute: function(l) {
          var p = this || o;
          p.ctx || v(), p._muted = l, p.usingWebAudio && p.masterGain.gain.setValueAtTime(l ? 0 : p._volume, o.ctx.currentTime);
          for (var S = 0; S < p._howls.length; S++)
            if (!p._howls[S]._webAudio)
              for (var w = p._howls[S]._getSoundIds(), k = 0; k < w.length; k++) {
                var A = p._howls[S]._soundById(w[k]);
                A && A._node && (A._node.muted = l ? !0 : A._muted);
              }
          return p;
        },
        /**
         * Handle stopping all sounds globally.
         */
        stop: function() {
          for (var l = this || o, p = 0; p < l._howls.length; p++)
            l._howls[p].stop();
          return l;
        },
        /**
         * Unload and destroy all currently loaded Howl objects.
         * @return {Howler}
         */
        unload: function() {
          for (var l = this || o, p = l._howls.length - 1; p >= 0; p--)
            l._howls[p].unload();
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
                var p = new Audio();
                typeof p.oncanplaythrough > "u" && (l._canPlayEvent = "canplay");
              } catch {
                l.noAudio = !0;
              }
            else
              l.noAudio = !0;
          try {
            var p = new Audio();
            p.muted && (l.noAudio = !0);
          } catch {
          }
          return l.noAudio || l._setupCodecs(), l;
        },
        /**
         * Check for browser support for various codecs and cache the results.
         * @return {Howler}
         */
        _setupCodecs: function() {
          var l = this || o, p = null;
          try {
            p = typeof Audio < "u" ? new Audio() : null;
          } catch {
            return l;
          }
          if (!p || typeof p.canPlayType != "function")
            return l;
          var S = p.canPlayType("audio/mpeg;").replace(/^no$/, ""), w = l._navigator ? l._navigator.userAgent : "", k = w.match(/OPR\/(\d+)/g), A = k && parseInt(k[0].split("/")[1], 10) < 33, T = w.indexOf("Safari") !== -1 && w.indexOf("Chrome") === -1, P = w.match(/Version\/(.*?) /), E = T && P && parseInt(P[1], 10) < 15;
          return l._codecs = {
            mp3: !!(!A && (S || p.canPlayType("audio/mp3;").replace(/^no$/, ""))),
            mpeg: !!S,
            opus: !!p.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, ""),
            ogg: !!p.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ""),
            oga: !!p.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ""),
            wav: !!(p.canPlayType('audio/wav; codecs="1"') || p.canPlayType("audio/wav")).replace(/^no$/, ""),
            aac: !!p.canPlayType("audio/aac;").replace(/^no$/, ""),
            caf: !!p.canPlayType("audio/x-caf;").replace(/^no$/, ""),
            m4a: !!(p.canPlayType("audio/x-m4a;") || p.canPlayType("audio/m4a;") || p.canPlayType("audio/aac;")).replace(/^no$/, ""),
            m4b: !!(p.canPlayType("audio/x-m4b;") || p.canPlayType("audio/m4b;") || p.canPlayType("audio/aac;")).replace(/^no$/, ""),
            mp4: !!(p.canPlayType("audio/x-mp4;") || p.canPlayType("audio/mp4;") || p.canPlayType("audio/aac;")).replace(/^no$/, ""),
            weba: !!(!E && p.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, "")),
            webm: !!(!E && p.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, "")),
            dolby: !!p.canPlayType('audio/mp4; codecs="ec-3"').replace(/^no$/, ""),
            flac: !!(p.canPlayType("audio/x-flac;") || p.canPlayType("audio/flac;")).replace(/^no$/, "")
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
            var p = function(S) {
              for (; l._html5AudioPool.length < l.html5PoolSize; )
                try {
                  var w = new Audio();
                  w._unlocked = !0, l._releaseHtml5Audio(w);
                } catch {
                  l.noAudio = !0;
                  break;
                }
              for (var k = 0; k < l._howls.length; k++)
                if (!l._howls[k]._webAudio)
                  for (var A = l._howls[k]._getSoundIds(), T = 0; T < A.length; T++) {
                    var P = l._howls[k]._soundById(A[T]);
                    P && P._node && !P._node._unlocked && (P._node._unlocked = !0, P._node.load());
                  }
              l._autoResume();
              var E = l.ctx.createBufferSource();
              E.buffer = l._scratchBuffer, E.connect(l.ctx.destination), typeof E.start > "u" ? E.noteOn(0) : E.start(0), typeof l.ctx.resume == "function" && l.ctx.resume(), E.onended = function() {
                E.disconnect(0), l._audioUnlocked = !0, document.removeEventListener("touchstart", p, !0), document.removeEventListener("touchend", p, !0), document.removeEventListener("click", p, !0), document.removeEventListener("keydown", p, !0);
                for (var N = 0; N < l._howls.length; N++)
                  l._howls[N]._emit("unlock");
              };
            };
            return document.addEventListener("touchstart", p, !0), document.addEventListener("touchend", p, !0), document.addEventListener("click", p, !0), document.addEventListener("keydown", p, !0), l;
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
          var p = new Audio().play();
          return p && typeof Promise < "u" && (p instanceof Promise || typeof p.then == "function") && p.catch(function() {
            console.warn("HTML5 Audio pool exhausted, returning potentially locked audio object.");
          }), new Audio();
        },
        /**
         * Return an activated HTML5 Audio object to the pool.
         * @return {Howler}
         */
        _releaseHtml5Audio: function(l) {
          var p = this || o;
          return l._unlocked && p._html5AudioPool.push(l), p;
        },
        /**
         * Automatically suspend the Web Audio AudioContext after no sound has played for 30 seconds.
         * This saves processing/energy and fixes various browser-specific bugs with audio getting stuck.
         * @return {Howler}
         */
        _autoSuspend: function() {
          var l = this;
          if (!(!l.autoSuspend || !l.ctx || typeof l.ctx.suspend > "u" || !o.usingWebAudio)) {
            for (var p = 0; p < l._howls.length; p++)
              if (l._howls[p]._webAudio) {
                for (var S = 0; S < l._howls[p]._sounds.length; S++)
                  if (!l._howls[p]._sounds[S]._paused)
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
              for (var p = 0; p < l._howls.length; p++)
                l._howls[p]._emit("resume");
            }), l._suspendTimer && (clearTimeout(l._suspendTimer), l._suspendTimer = null)) : l.state === "suspending" && (l._resumeAfterSuspend = !0), l;
        }
      };
      var o = new n(), i = function(l) {
        var p = this;
        if (!l.src || l.src.length === 0) {
          console.error("An array of source files must be passed with any new Howl.");
          return;
        }
        p.init(l);
      };
      i.prototype = {
        /**
         * Initialize a new Howl group object.
         * @param  {Object} o Passed in properties for this group.
         * @return {Howl}
         */
        init: function(l) {
          var p = this;
          return o.ctx || v(), p._autoplay = l.autoplay || !1, p._format = typeof l.format != "string" ? l.format : [l.format], p._html5 = l.html5 || !1, p._muted = l.mute || !1, p._loop = l.loop || !1, p._pool = l.pool || 5, p._preload = typeof l.preload == "boolean" || l.preload === "metadata" ? l.preload : !0, p._rate = l.rate || 1, p._sprite = l.sprite || {}, p._src = typeof l.src != "string" ? l.src : [l.src], p._volume = l.volume !== void 0 ? l.volume : 1, p._xhr = {
            method: l.xhr && l.xhr.method ? l.xhr.method : "GET",
            headers: l.xhr && l.xhr.headers ? l.xhr.headers : null,
            withCredentials: l.xhr && l.xhr.withCredentials ? l.xhr.withCredentials : !1
          }, p._duration = 0, p._state = "unloaded", p._sounds = [], p._endTimers = {}, p._queue = [], p._playLock = !1, p._onend = l.onend ? [{ fn: l.onend }] : [], p._onfade = l.onfade ? [{ fn: l.onfade }] : [], p._onload = l.onload ? [{ fn: l.onload }] : [], p._onloaderror = l.onloaderror ? [{ fn: l.onloaderror }] : [], p._onplayerror = l.onplayerror ? [{ fn: l.onplayerror }] : [], p._onpause = l.onpause ? [{ fn: l.onpause }] : [], p._onplay = l.onplay ? [{ fn: l.onplay }] : [], p._onstop = l.onstop ? [{ fn: l.onstop }] : [], p._onmute = l.onmute ? [{ fn: l.onmute }] : [], p._onvolume = l.onvolume ? [{ fn: l.onvolume }] : [], p._onrate = l.onrate ? [{ fn: l.onrate }] : [], p._onseek = l.onseek ? [{ fn: l.onseek }] : [], p._onunlock = l.onunlock ? [{ fn: l.onunlock }] : [], p._onresume = [], p._webAudio = o.usingWebAudio && !p._html5, typeof o.ctx < "u" && o.ctx && o.autoUnlock && o._unlockAudio(), o._howls.push(p), p._autoplay && p._queue.push({
            event: "play",
            action: function() {
              p.play();
            }
          }), p._preload && p._preload !== "none" && p.load(), p;
        },
        /**
         * Load the audio file.
         * @return {Howler}
         */
        load: function() {
          var l = this, p = null;
          if (o.noAudio) {
            l._emit("loaderror", null, "No audio support.");
            return;
          }
          typeof l._src == "string" && (l._src = [l._src]);
          for (var S = 0; S < l._src.length; S++) {
            var w, k;
            if (l._format && l._format[S])
              w = l._format[S];
            else {
              if (k = l._src[S], typeof k != "string") {
                l._emit("loaderror", null, "Non-string found in selected audio sources - ignoring.");
                continue;
              }
              w = /^data:audio\/([^;,]+);/i.exec(k), w || (w = /\.([^.]+)$/.exec(k.split("?", 1)[0])), w && (w = w[1].toLowerCase());
            }
            if (w || console.warn('No file extension was found. Consider using the "format" property or specify an extension.'), w && o.codecs(w)) {
              p = l._src[S];
              break;
            }
          }
          if (!p) {
            l._emit("loaderror", null, "No codec support for selected audio sources.");
            return;
          }
          return l._src = p, l._state = "loading", window.location.protocol === "https:" && p.slice(0, 5) === "http:" && (l._html5 = !0, l._webAudio = !1), new a(l), l._webAudio && d(l), l;
        },
        /**
         * Play a sound or resume previous playback.
         * @param  {String/Number} sprite   Sprite name for sprite playback or sound id to continue previous.
         * @param  {Boolean} internal Internal Use: true prevents event firing.
         * @return {Number}          Sound ID.
         */
        play: function(l, p) {
          var S = this, w = null;
          if (typeof l == "number")
            w = l, l = null;
          else {
            if (typeof l == "string" && S._state === "loaded" && !S._sprite[l])
              return null;
            if (typeof l > "u" && (l = "__default", !S._playLock)) {
              for (var k = 0, A = 0; A < S._sounds.length; A++)
                S._sounds[A]._paused && !S._sounds[A]._ended && (k++, w = S._sounds[A]._id);
              k === 1 ? l = null : w = null;
            }
          }
          var T = w ? S._soundById(w) : S._inactiveSound();
          if (!T)
            return null;
          if (w && !l && (l = T._sprite || "__default"), S._state !== "loaded") {
            T._sprite = l, T._ended = !1;
            var P = T._id;
            return S._queue.push({
              event: "play",
              action: function() {
                S.play(P);
              }
            }), P;
          }
          if (w && !T._paused)
            return p || S._loadQueue("play"), T._id;
          S._webAudio && o._autoResume();
          var E = Math.max(0, T._seek > 0 ? T._seek : S._sprite[l][0] / 1e3), N = Math.max(0, (S._sprite[l][0] + S._sprite[l][1]) / 1e3 - E), O = N * 1e3 / Math.abs(T._rate), W = S._sprite[l][0] / 1e3, G = (S._sprite[l][0] + S._sprite[l][1]) / 1e3;
          T._sprite = l, T._ended = !1;
          var K = function() {
            T._paused = !1, T._seek = E, T._start = W, T._stop = G, T._loop = !!(T._loop || S._sprite[l][2]);
          };
          if (E >= G) {
            S._ended(T);
            return;
          }
          var L = T._node;
          if (S._webAudio) {
            var X = function() {
              S._playLock = !1, K(), S._refreshBuffer(T);
              var ue = T._muted || S._muted ? 0 : T._volume;
              L.gain.setValueAtTime(ue, o.ctx.currentTime), T._playStart = o.ctx.currentTime, typeof L.bufferSource.start > "u" ? T._loop ? L.bufferSource.noteGrainOn(0, E, 86400) : L.bufferSource.noteGrainOn(0, E, N) : T._loop ? L.bufferSource.start(0, E, 86400) : L.bufferSource.start(0, E, N), O !== 1 / 0 && (S._endTimers[T._id] = setTimeout(S._ended.bind(S, T), O)), p || setTimeout(function() {
                S._emit("play", T._id), S._loadQueue();
              }, 0);
            };
            o.state === "running" && o.ctx.state !== "interrupted" ? X() : (S._playLock = !0, S.once("resume", X), S._clearTimer(T._id));
          } else {
            var ae = function() {
              L.currentTime = E, L.muted = T._muted || S._muted || o._muted || L.muted, L.volume = T._volume * o.volume(), L.playbackRate = T._rate;
              try {
                var ue = L.play();
                if (ue && typeof Promise < "u" && (ue instanceof Promise || typeof ue.then == "function") ? (S._playLock = !0, K(), ue.then(function() {
                  S._playLock = !1, L._unlocked = !0, p ? S._loadQueue() : S._emit("play", T._id);
                }).catch(function() {
                  S._playLock = !1, S._emit("playerror", T._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction."), T._ended = !0, T._paused = !0;
                })) : p || (S._playLock = !1, K(), S._emit("play", T._id)), L.playbackRate = T._rate, L.paused) {
                  S._emit("playerror", T._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.");
                  return;
                }
                l !== "__default" || T._loop ? S._endTimers[T._id] = setTimeout(S._ended.bind(S, T), O) : (S._endTimers[T._id] = function() {
                  S._ended(T), L.removeEventListener("ended", S._endTimers[T._id], !1);
                }, L.addEventListener("ended", S._endTimers[T._id], !1));
              } catch (_e) {
                S._emit("playerror", T._id, _e);
              }
            };
            L.src === "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA" && (L.src = S._src, L.load());
            var q = window && window.ejecta || !L.readyState && o._navigator.isCocoonJS;
            if (L.readyState >= 3 || q)
              ae();
            else {
              S._playLock = !0, S._state = "loading";
              var de = function() {
                S._state = "loaded", ae(), L.removeEventListener(o._canPlayEvent, de, !1);
              };
              L.addEventListener(o._canPlayEvent, de, !1), S._clearTimer(T._id);
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
          var p = this;
          if (p._state !== "loaded" || p._playLock)
            return p._queue.push({
              event: "pause",
              action: function() {
                p.pause(l);
              }
            }), p;
          for (var S = p._getSoundIds(l), w = 0; w < S.length; w++) {
            p._clearTimer(S[w]);
            var k = p._soundById(S[w]);
            if (k && !k._paused && (k._seek = p.seek(S[w]), k._rateSeek = 0, k._paused = !0, p._stopFade(S[w]), k._node))
              if (p._webAudio) {
                if (!k._node.bufferSource)
                  continue;
                typeof k._node.bufferSource.stop > "u" ? k._node.bufferSource.noteOff(0) : k._node.bufferSource.stop(0), p._cleanBuffer(k._node);
              } else (!isNaN(k._node.duration) || k._node.duration === 1 / 0) && k._node.pause();
            arguments[1] || p._emit("pause", k ? k._id : null);
          }
          return p;
        },
        /**
         * Stop playback and reset to start.
         * @param  {Number} id The sound ID (empty to stop all in group).
         * @param  {Boolean} internal Internal Use: true prevents event firing.
         * @return {Howl}
         */
        stop: function(l, p) {
          var S = this;
          if (S._state !== "loaded" || S._playLock)
            return S._queue.push({
              event: "stop",
              action: function() {
                S.stop(l);
              }
            }), S;
          for (var w = S._getSoundIds(l), k = 0; k < w.length; k++) {
            S._clearTimer(w[k]);
            var A = S._soundById(w[k]);
            A && (A._seek = A._start || 0, A._rateSeek = 0, A._paused = !0, A._ended = !0, S._stopFade(w[k]), A._node && (S._webAudio ? A._node.bufferSource && (typeof A._node.bufferSource.stop > "u" ? A._node.bufferSource.noteOff(0) : A._node.bufferSource.stop(0), S._cleanBuffer(A._node)) : (!isNaN(A._node.duration) || A._node.duration === 1 / 0) && (A._node.currentTime = A._start || 0, A._node.pause(), A._node.duration === 1 / 0 && S._clearSound(A._node))), p || S._emit("stop", A._id));
          }
          return S;
        },
        /**
         * Mute/unmute a single sound or all sounds in this Howl group.
         * @param  {Boolean} muted Set to true to mute and false to unmute.
         * @param  {Number} id    The sound ID to update (omit to mute/unmute all).
         * @return {Howl}
         */
        mute: function(l, p) {
          var S = this;
          if (S._state !== "loaded" || S._playLock)
            return S._queue.push({
              event: "mute",
              action: function() {
                S.mute(l, p);
              }
            }), S;
          if (typeof p > "u")
            if (typeof l == "boolean")
              S._muted = l;
            else
              return S._muted;
          for (var w = S._getSoundIds(p), k = 0; k < w.length; k++) {
            var A = S._soundById(w[k]);
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
          var l = this, p = arguments, S, w;
          if (p.length === 0)
            return l._volume;
          if (p.length === 1 || p.length === 2 && typeof p[1] > "u") {
            var k = l._getSoundIds(), A = k.indexOf(p[0]);
            A >= 0 ? w = parseInt(p[0], 10) : S = parseFloat(p[0]);
          } else p.length >= 2 && (S = parseFloat(p[0]), w = parseInt(p[1], 10));
          var T;
          if (typeof S < "u" && S >= 0 && S <= 1) {
            if (l._state !== "loaded" || l._playLock)
              return l._queue.push({
                event: "volume",
                action: function() {
                  l.volume.apply(l, p);
                }
              }), l;
            typeof w > "u" && (l._volume = S), w = l._getSoundIds(w);
            for (var P = 0; P < w.length; P++)
              T = l._soundById(w[P]), T && (T._volume = S, p[2] || l._stopFade(w[P]), l._webAudio && T._node && !T._muted ? T._node.gain.setValueAtTime(S, o.ctx.currentTime) : T._node && !T._muted && (T._node.volume = S * o.volume()), l._emit("volume", T._id));
          } else
            return T = w ? l._soundById(w) : l._sounds[0], T ? T._volume : 0;
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
        fade: function(l, p, S, w) {
          var k = this;
          if (k._state !== "loaded" || k._playLock)
            return k._queue.push({
              event: "fade",
              action: function() {
                k.fade(l, p, S, w);
              }
            }), k;
          l = Math.min(Math.max(0, parseFloat(l)), 1), p = Math.min(Math.max(0, parseFloat(p)), 1), S = parseFloat(S), k.volume(l, w);
          for (var A = k._getSoundIds(w), T = 0; T < A.length; T++) {
            var P = k._soundById(A[T]);
            if (P) {
              if (w || k._stopFade(A[T]), k._webAudio && !P._muted) {
                var E = o.ctx.currentTime, N = E + S / 1e3;
                P._volume = l, P._node.gain.setValueAtTime(l, E), P._node.gain.linearRampToValueAtTime(p, N);
              }
              k._startFadeInterval(P, l, p, S, A[T], typeof w > "u");
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
        _startFadeInterval: function(l, p, S, w, k, A) {
          var T = this, P = p, E = S - p, N = Math.abs(E / 0.01), O = Math.max(4, N > 0 ? w / N : w), W = Date.now();
          l._fadeTo = S, l._interval = setInterval(function() {
            var G = (Date.now() - W) / w;
            W = Date.now(), P += E * G, P = Math.round(P * 100) / 100, E < 0 ? P = Math.max(S, P) : P = Math.min(S, P), T._webAudio ? l._volume = P : T.volume(P, l._id, !0), A && (T._volume = P), (S < p && P <= S || S > p && P >= S) && (clearInterval(l._interval), l._interval = null, l._fadeTo = null, T.volume(S, l._id), T._emit("fade", l._id));
          }, O);
        },
        /**
         * Internal method that stops the currently playing fade when
         * a new fade starts, volume is changed or the sound is stopped.
         * @param  {Number} id The sound id.
         * @return {Howl}
         */
        _stopFade: function(l) {
          var p = this, S = p._soundById(l);
          return S && S._interval && (p._webAudio && S._node.gain.cancelScheduledValues(o.ctx.currentTime), clearInterval(S._interval), S._interval = null, p.volume(S._fadeTo, l), S._fadeTo = null, p._emit("fade", l)), p;
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
          var l = this, p = arguments, S, w, k;
          if (p.length === 0)
            return l._loop;
          if (p.length === 1)
            if (typeof p[0] == "boolean")
              S = p[0], l._loop = S;
            else
              return k = l._soundById(parseInt(p[0], 10)), k ? k._loop : !1;
          else p.length === 2 && (S = p[0], w = parseInt(p[1], 10));
          for (var A = l._getSoundIds(w), T = 0; T < A.length; T++)
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
          var l = this, p = arguments, S, w;
          if (p.length === 0)
            w = l._sounds[0]._id;
          else if (p.length === 1) {
            var k = l._getSoundIds(), A = k.indexOf(p[0]);
            A >= 0 ? w = parseInt(p[0], 10) : S = parseFloat(p[0]);
          } else p.length === 2 && (S = parseFloat(p[0]), w = parseInt(p[1], 10));
          var T;
          if (typeof S == "number") {
            if (l._state !== "loaded" || l._playLock)
              return l._queue.push({
                event: "rate",
                action: function() {
                  l.rate.apply(l, p);
                }
              }), l;
            typeof w > "u" && (l._rate = S), w = l._getSoundIds(w);
            for (var P = 0; P < w.length; P++)
              if (T = l._soundById(w[P]), T) {
                l.playing(w[P]) && (T._rateSeek = l.seek(w[P]), T._playStart = l._webAudio ? o.ctx.currentTime : T._playStart), T._rate = S, l._webAudio && T._node && T._node.bufferSource ? T._node.bufferSource.playbackRate.setValueAtTime(S, o.ctx.currentTime) : T._node && (T._node.playbackRate = S);
                var E = l.seek(w[P]), N = (l._sprite[T._sprite][0] + l._sprite[T._sprite][1]) / 1e3 - E, O = N * 1e3 / Math.abs(T._rate);
                (l._endTimers[w[P]] || !T._paused) && (l._clearTimer(w[P]), l._endTimers[w[P]] = setTimeout(l._ended.bind(l, T), O)), l._emit("rate", T._id);
              }
          } else
            return T = l._soundById(w), T ? T._rate : l._rate;
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
          var l = this, p = arguments, S, w;
          if (p.length === 0)
            l._sounds.length && (w = l._sounds[0]._id);
          else if (p.length === 1) {
            var k = l._getSoundIds(), A = k.indexOf(p[0]);
            A >= 0 ? w = parseInt(p[0], 10) : l._sounds.length && (w = l._sounds[0]._id, S = parseFloat(p[0]));
          } else p.length === 2 && (S = parseFloat(p[0]), w = parseInt(p[1], 10));
          if (typeof w > "u")
            return 0;
          if (typeof S == "number" && (l._state !== "loaded" || l._playLock))
            return l._queue.push({
              event: "seek",
              action: function() {
                l.seek.apply(l, p);
              }
            }), l;
          var T = l._soundById(w);
          if (T)
            if (typeof S == "number" && S >= 0) {
              var P = l.playing(w);
              P && l.pause(w, !0), T._seek = S, T._ended = !1, l._clearTimer(w), !l._webAudio && T._node && !isNaN(T._node.duration) && (T._node.currentTime = S);
              var E = function() {
                P && l.play(w, !0), l._emit("seek", w);
              };
              if (P && !l._webAudio) {
                var N = function() {
                  l._playLock ? setTimeout(N, 0) : E();
                };
                setTimeout(N, 0);
              } else
                E();
            } else if (l._webAudio) {
              var O = l.playing(w) ? o.ctx.currentTime - T._playStart : 0, W = T._rateSeek ? T._rateSeek - T._seek : 0;
              return T._seek + (W + O * Math.abs(T._rate));
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
          var p = this;
          if (typeof l == "number") {
            var S = p._soundById(l);
            return S ? !S._paused : !1;
          }
          for (var w = 0; w < p._sounds.length; w++)
            if (!p._sounds[w]._paused)
              return !0;
          return !1;
        },
        /**
         * Get the duration of this sound. Passing a sound id will return the sprite duration.
         * @param  {Number} id The sound id to check. If none is passed, return full source duration.
         * @return {Number} Audio duration in seconds.
         */
        duration: function(l) {
          var p = this, S = p._duration, w = p._soundById(l);
          return w && (S = p._sprite[w._sprite][1] / 1e3), S;
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
          for (var l = this, p = l._sounds, S = 0; S < p.length; S++)
            p[S]._paused || l.stop(p[S]._id), l._webAudio || (l._clearSound(p[S]._node), p[S]._node.removeEventListener("error", p[S]._errorFn, !1), p[S]._node.removeEventListener(o._canPlayEvent, p[S]._loadFn, !1), p[S]._node.removeEventListener("ended", p[S]._endFn, !1), o._releaseHtml5Audio(p[S]._node)), delete p[S]._node, l._clearTimer(p[S]._id);
          var w = o._howls.indexOf(l);
          w >= 0 && o._howls.splice(w, 1);
          var k = !0;
          for (S = 0; S < o._howls.length; S++)
            if (o._howls[S]._src === l._src || l._src.indexOf(o._howls[S]._src) >= 0) {
              k = !1;
              break;
            }
          return c && k && delete c[l._src], o.noAudio = !1, l._state = "unloaded", l._sounds = [], l = null, null;
        },
        /**
         * Listen to a custom event.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to call.
         * @param  {Number}   id    (optional) Only listen to events for this sound.
         * @param  {Number}   once  (INTERNAL) Marks event to fire only once.
         * @return {Howl}
         */
        on: function(l, p, S, w) {
          var k = this, A = k["_on" + l];
          return typeof p == "function" && A.push(w ? { id: S, fn: p, once: w } : { id: S, fn: p }), k;
        },
        /**
         * Remove a custom event. Call without parameters to remove all events.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to remove. Leave empty to remove all.
         * @param  {Number}   id    (optional) Only remove events for this sound.
         * @return {Howl}
         */
        off: function(l, p, S) {
          var w = this, k = w["_on" + l], A = 0;
          if (typeof p == "number" && (S = p, p = null), p || S)
            for (A = 0; A < k.length; A++) {
              var T = S === k[A].id;
              if (p === k[A].fn && T || !p && T) {
                k.splice(A, 1);
                break;
              }
            }
          else if (l)
            w["_on" + l] = [];
          else {
            var P = Object.keys(w);
            for (A = 0; A < P.length; A++)
              P[A].indexOf("_on") === 0 && Array.isArray(w[P[A]]) && (w[P[A]] = []);
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
        once: function(l, p, S) {
          var w = this;
          return w.on(l, p, S, 1), w;
        },
        /**
         * Emit all events of a specific type and pass the sound id.
         * @param  {String} event Event name.
         * @param  {Number} id    Sound ID.
         * @param  {Number} msg   Message to go with event.
         * @return {Howl}
         */
        _emit: function(l, p, S) {
          for (var w = this, k = w["_on" + l], A = k.length - 1; A >= 0; A--)
            (!k[A].id || k[A].id === p || l === "load") && (setTimeout((function(T) {
              T.call(this, p, S);
            }).bind(w, k[A].fn), 0), k[A].once && w.off(l, k[A].fn, k[A].id));
          return w._loadQueue(l), w;
        },
        /**
         * Queue of actions initiated before the sound has loaded.
         * These will be called in sequence, with the next only firing
         * after the previous has finished executing (even if async like play).
         * @return {Howl}
         */
        _loadQueue: function(l) {
          var p = this;
          if (p._queue.length > 0) {
            var S = p._queue[0];
            S.event === l && (p._queue.shift(), p._loadQueue()), l || S.action();
          }
          return p;
        },
        /**
         * Fired when playback ends at the end of the duration.
         * @param  {Sound} sound The sound object to work with.
         * @return {Howl}
         */
        _ended: function(l) {
          var p = this, S = l._sprite;
          if (!p._webAudio && l._node && !l._node.paused && !l._node.ended && l._node.currentTime < l._stop)
            return setTimeout(p._ended.bind(p, l), 100), p;
          var w = !!(l._loop || p._sprite[S][2]);
          if (p._emit("end", l._id), !p._webAudio && w && p.stop(l._id, !0).play(l._id), p._webAudio && w) {
            p._emit("play", l._id), l._seek = l._start || 0, l._rateSeek = 0, l._playStart = o.ctx.currentTime;
            var k = (l._stop - l._start) * 1e3 / Math.abs(l._rate);
            p._endTimers[l._id] = setTimeout(p._ended.bind(p, l), k);
          }
          return p._webAudio && !w && (l._paused = !0, l._ended = !0, l._seek = l._start || 0, l._rateSeek = 0, p._clearTimer(l._id), p._cleanBuffer(l._node), o._autoSuspend()), !p._webAudio && !w && p.stop(l._id, !0), p;
        },
        /**
         * Clear the end timer for a sound playback.
         * @param  {Number} id The sound ID.
         * @return {Howl}
         */
        _clearTimer: function(l) {
          var p = this;
          if (p._endTimers[l]) {
            if (typeof p._endTimers[l] != "function")
              clearTimeout(p._endTimers[l]);
            else {
              var S = p._soundById(l);
              S && S._node && S._node.removeEventListener("ended", p._endTimers[l], !1);
            }
            delete p._endTimers[l];
          }
          return p;
        },
        /**
         * Return the sound identified by this ID, or return null.
         * @param  {Number} id Sound ID
         * @return {Object}    Sound object or null.
         */
        _soundById: function(l) {
          for (var p = this, S = 0; S < p._sounds.length; S++)
            if (l === p._sounds[S]._id)
              return p._sounds[S];
          return null;
        },
        /**
         * Return an inactive sound from the pool or create a new one.
         * @return {Sound} Sound playback object.
         */
        _inactiveSound: function() {
          var l = this;
          l._drain();
          for (var p = 0; p < l._sounds.length; p++)
            if (l._sounds[p]._ended)
              return l._sounds[p].reset();
          return new a(l);
        },
        /**
         * Drain excess inactive sounds from the pool.
         */
        _drain: function() {
          var l = this, p = l._pool, S = 0, w = 0;
          if (!(l._sounds.length < p)) {
            for (w = 0; w < l._sounds.length; w++)
              l._sounds[w]._ended && S++;
            for (w = l._sounds.length - 1; w >= 0; w--) {
              if (S <= p)
                return;
              l._sounds[w]._ended && (l._webAudio && l._sounds[w]._node && l._sounds[w]._node.disconnect(0), l._sounds.splice(w, 1), S--);
            }
          }
        },
        /**
         * Get all ID's from the sounds pool.
         * @param  {Number} id Only return one ID if one is passed.
         * @return {Array}    Array of IDs.
         */
        _getSoundIds: function(l) {
          var p = this;
          if (typeof l > "u") {
            for (var S = [], w = 0; w < p._sounds.length; w++)
              S.push(p._sounds[w]._id);
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
          var p = this;
          return l._node.bufferSource = o.ctx.createBufferSource(), l._node.bufferSource.buffer = c[p._src], l._panner ? l._node.bufferSource.connect(l._panner) : l._node.bufferSource.connect(l._node), l._node.bufferSource.loop = l._loop, l._loop && (l._node.bufferSource.loopStart = l._start || 0, l._node.bufferSource.loopEnd = l._stop || 0), l._node.bufferSource.playbackRate.setValueAtTime(l._rate, o.ctx.currentTime), p;
        },
        /**
         * Prevent memory leaks by cleaning up the buffer source after playback.
         * @param  {Object} node Sound's audio node containing the buffer source.
         * @return {Howl}
         */
        _cleanBuffer: function(l) {
          var p = this, S = o._navigator && o._navigator.vendor.indexOf("Apple") >= 0;
          if (!l.bufferSource)
            return p;
          if (o._scratchBuffer && l.bufferSource && (l.bufferSource.onended = null, l.bufferSource.disconnect(0), S))
            try {
              l.bufferSource.buffer = o._scratchBuffer;
            } catch {
            }
          return l.bufferSource = null, p;
        },
        /**
         * Set the source to a 0-second silence to stop any downloading (except in IE).
         * @param  {Object} node Audio node to clear.
         */
        _clearSound: function(l) {
          var p = /MSIE |Trident\//.test(o._navigator && o._navigator.userAgent);
          p || (l.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
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
          var l = this, p = l._parent;
          return l._muted = p._muted, l._loop = p._loop, l._volume = p._volume, l._rate = p._rate, l._seek = 0, l._paused = !0, l._ended = !0, l._sprite = "__default", l._id = ++o._counter, p._sounds.push(l), l.create(), l;
        },
        /**
         * Create and setup a new sound object, whether HTML5 Audio or Web Audio.
         * @return {Sound}
         */
        create: function() {
          var l = this, p = l._parent, S = o._muted || l._muted || l._parent._muted ? 0 : l._volume;
          return p._webAudio ? (l._node = typeof o.ctx.createGain > "u" ? o.ctx.createGainNode() : o.ctx.createGain(), l._node.gain.setValueAtTime(S, o.ctx.currentTime), l._node.paused = !0, l._node.connect(o.masterGain)) : o.noAudio || (l._node = o._obtainHtml5Audio(), l._errorFn = l._errorListener.bind(l), l._node.addEventListener("error", l._errorFn, !1), l._loadFn = l._loadListener.bind(l), l._node.addEventListener(o._canPlayEvent, l._loadFn, !1), l._endFn = l._endListener.bind(l), l._node.addEventListener("ended", l._endFn, !1), l._node.src = p._src, l._node.preload = p._preload === !0 ? "auto" : p._preload, l._node.volume = S * o.volume(), l._node.load()), l;
        },
        /**
         * Reset the parameters of this sound to the original state (for recycle).
         * @return {Sound}
         */
        reset: function() {
          var l = this, p = l._parent;
          return l._muted = p._muted, l._loop = p._loop, l._volume = p._volume, l._rate = p._rate, l._seek = 0, l._rateSeek = 0, l._paused = !0, l._ended = !0, l._sprite = "__default", l._id = ++o._counter, l;
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
          var l = this, p = l._parent;
          p._duration = Math.ceil(l._node.duration * 10) / 10, Object.keys(p._sprite).length === 0 && (p._sprite = { __default: [0, p._duration * 1e3] }), p._state !== "loaded" && (p._state = "loaded", p._emit("load"), p._loadQueue()), l._node.removeEventListener(o._canPlayEvent, l._loadFn, !1);
        },
        /**
         * HTML5 Audio ended listener callback.
         */
        _endListener: function() {
          var l = this, p = l._parent;
          p._duration === 1 / 0 && (p._duration = Math.ceil(l._node.duration * 10) / 10, p._sprite.__default[1] === 1 / 0 && (p._sprite.__default[1] = p._duration * 1e3), p._ended(l)), l._node.removeEventListener("ended", l._endFn, !1);
        }
      };
      var c = {}, d = function(l) {
        var p = l._src;
        if (c[p]) {
          l._duration = c[p].duration, y(l);
          return;
        }
        if (/^data:[^;]+;base64,/.test(p)) {
          for (var S = atob(p.split(",")[1]), w = new Uint8Array(S.length), k = 0; k < S.length; ++k)
            w[k] = S.charCodeAt(k);
          m(w.buffer, l);
        } else {
          var A = new XMLHttpRequest();
          A.open(l._xhr.method, p, !0), A.withCredentials = l._xhr.withCredentials, A.responseType = "arraybuffer", l._xhr.headers && Object.keys(l._xhr.headers).forEach(function(T) {
            A.setRequestHeader(T, l._xhr.headers[T]);
          }), A.onload = function() {
            var T = (A.status + "")[0];
            if (T !== "0" && T !== "2" && T !== "3") {
              l._emit("loaderror", null, "Failed loading audio file with status: " + A.status + ".");
              return;
            }
            m(A.response, l);
          }, A.onerror = function() {
            l._webAudio && (l._html5 = !0, l._webAudio = !1, l._sounds = [], delete c[p], l.load());
          }, f(A);
        }
      }, f = function(l) {
        try {
          l.send();
        } catch {
          l.onerror();
        }
      }, m = function(l, p) {
        var S = function() {
          p._emit("loaderror", null, "Decoding audio data failed.");
        }, w = function(k) {
          k && p._sounds.length > 0 ? (c[p._src] = k, y(p, k)) : S();
        };
        typeof Promise < "u" && o.ctx.decodeAudioData.length === 1 ? o.ctx.decodeAudioData(l).then(w).catch(S) : o.ctx.decodeAudioData(l, w, S);
      }, y = function(l, p) {
        p && !l._duration && (l._duration = p.duration), Object.keys(l._sprite).length === 0 && (l._sprite = { __default: [0, l._duration * 1e3] }), l._state !== "loaded" && (l._state = "loaded", l._emit("load"), l._loadQueue());
      }, v = function() {
        if (o.usingWebAudio) {
          try {
            typeof AudioContext < "u" ? o.ctx = new AudioContext() : typeof webkitAudioContext < "u" ? o.ctx = new webkitAudioContext() : o.usingWebAudio = !1;
          } catch {
            o.usingWebAudio = !1;
          }
          o.ctx || (o.usingWebAudio = !1);
          var l = /iP(hone|od|ad)/.test(o._navigator && o._navigator.platform), p = o._navigator && o._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/), S = p ? parseInt(p[1], 10) : null;
          if (l && S && S < 9) {
            var w = /safari/.test(o._navigator && o._navigator.userAgent.toLowerCase());
            o._navigator && !w && (o.usingWebAudio = !1);
          }
          o.usingWebAudio && (o.masterGain = typeof o.ctx.createGain > "u" ? o.ctx.createGainNode() : o.ctx.createGain(), o.masterGain.gain.setValueAtTime(o._muted ? 0 : o._volume, o.ctx.currentTime), o.masterGain.connect(o.ctx.destination)), o._setup();
        }
      };
      e.Howler = o, e.Howl = i, typeof oi < "u" ? (oi.HowlerGlobal = n, oi.Howler = o, oi.Howl = i, oi.Sound = a) : typeof window < "u" && (window.HowlerGlobal = n, window.Howler = o, window.Howl = i, window.Sound = a);
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
        var c = this;
        if (!c.ctx || !c.ctx.listener)
          return c;
        if (i = typeof i != "number" ? c._pos[1] : i, a = typeof a != "number" ? c._pos[2] : a, typeof o == "number")
          c._pos = [o, i, a], typeof c.ctx.listener.positionX < "u" ? (c.ctx.listener.positionX.setTargetAtTime(c._pos[0], Howler.ctx.currentTime, 0.1), c.ctx.listener.positionY.setTargetAtTime(c._pos[1], Howler.ctx.currentTime, 0.1), c.ctx.listener.positionZ.setTargetAtTime(c._pos[2], Howler.ctx.currentTime, 0.1)) : c.ctx.listener.setPosition(c._pos[0], c._pos[1], c._pos[2]);
        else
          return c._pos;
        return c;
      }, HowlerGlobal.prototype.orientation = function(o, i, a, c, d, f) {
        var m = this;
        if (!m.ctx || !m.ctx.listener)
          return m;
        var y = m._orientation;
        if (i = typeof i != "number" ? y[1] : i, a = typeof a != "number" ? y[2] : a, c = typeof c != "number" ? y[3] : c, d = typeof d != "number" ? y[4] : d, f = typeof f != "number" ? y[5] : f, typeof o == "number")
          m._orientation = [o, i, a, c, d, f], typeof m.ctx.listener.forwardX < "u" ? (m.ctx.listener.forwardX.setTargetAtTime(o, Howler.ctx.currentTime, 0.1), m.ctx.listener.forwardY.setTargetAtTime(i, Howler.ctx.currentTime, 0.1), m.ctx.listener.forwardZ.setTargetAtTime(a, Howler.ctx.currentTime, 0.1), m.ctx.listener.upX.setTargetAtTime(c, Howler.ctx.currentTime, 0.1), m.ctx.listener.upY.setTargetAtTime(d, Howler.ctx.currentTime, 0.1), m.ctx.listener.upZ.setTargetAtTime(f, Howler.ctx.currentTime, 0.1)) : m.ctx.listener.setOrientation(o, i, a, c, d, f);
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
        var c = typeof Howler.ctx.createStereoPanner > "u" ? "spatial" : "stereo";
        if (typeof i > "u")
          if (typeof o == "number")
            a._stereo = o, a._pos = [o, 0, 0];
          else
            return a._stereo;
        for (var d = a._getSoundIds(i), f = 0; f < d.length; f++) {
          var m = a._soundById(d[f]);
          if (m)
            if (typeof o == "number")
              m._stereo = o, m._pos = [o, 0, 0], m._node && (m._pannerAttr.panningModel = "equalpower", (!m._panner || !m._panner.pan) && n(m, c), c === "spatial" ? typeof m._panner.positionX < "u" ? (m._panner.positionX.setValueAtTime(o, Howler.ctx.currentTime), m._panner.positionY.setValueAtTime(0, Howler.ctx.currentTime), m._panner.positionZ.setValueAtTime(0, Howler.ctx.currentTime)) : m._panner.setPosition(o, 0, 0) : m._panner.pan.setValueAtTime(o, Howler.ctx.currentTime)), a._emit("stereo", m._id);
            else
              return m._stereo;
        }
        return a;
      }, Howl.prototype.pos = function(o, i, a, c) {
        var d = this;
        if (!d._webAudio)
          return d;
        if (d._state !== "loaded")
          return d._queue.push({
            event: "pos",
            action: function() {
              d.pos(o, i, a, c);
            }
          }), d;
        if (i = typeof i != "number" ? 0 : i, a = typeof a != "number" ? -0.5 : a, typeof c > "u")
          if (typeof o == "number")
            d._pos = [o, i, a];
          else
            return d._pos;
        for (var f = d._getSoundIds(c), m = 0; m < f.length; m++) {
          var y = d._soundById(f[m]);
          if (y)
            if (typeof o == "number")
              y._pos = [o, i, a], y._node && ((!y._panner || y._panner.pan) && n(y, "spatial"), typeof y._panner.positionX < "u" ? (y._panner.positionX.setValueAtTime(o, Howler.ctx.currentTime), y._panner.positionY.setValueAtTime(i, Howler.ctx.currentTime), y._panner.positionZ.setValueAtTime(a, Howler.ctx.currentTime)) : y._panner.setPosition(o, i, a)), d._emit("pos", y._id);
            else
              return y._pos;
        }
        return d;
      }, Howl.prototype.orientation = function(o, i, a, c) {
        var d = this;
        if (!d._webAudio)
          return d;
        if (d._state !== "loaded")
          return d._queue.push({
            event: "orientation",
            action: function() {
              d.orientation(o, i, a, c);
            }
          }), d;
        if (i = typeof i != "number" ? d._orientation[1] : i, a = typeof a != "number" ? d._orientation[2] : a, typeof c > "u")
          if (typeof o == "number")
            d._orientation = [o, i, a];
          else
            return d._orientation;
        for (var f = d._getSoundIds(c), m = 0; m < f.length; m++) {
          var y = d._soundById(f[m]);
          if (y)
            if (typeof o == "number")
              y._orientation = [o, i, a], y._node && (y._panner || (y._pos || (y._pos = d._pos || [0, 0, -0.5]), n(y, "spatial")), typeof y._panner.orientationX < "u" ? (y._panner.orientationX.setValueAtTime(o, Howler.ctx.currentTime), y._panner.orientationY.setValueAtTime(i, Howler.ctx.currentTime), y._panner.orientationZ.setValueAtTime(a, Howler.ctx.currentTime)) : y._panner.setOrientation(o, i, a)), d._emit("orientation", y._id);
            else
              return y._orientation;
        }
        return d;
      }, Howl.prototype.pannerAttr = function() {
        var o = this, i = arguments, a, c, d;
        if (!o._webAudio)
          return o;
        if (i.length === 0)
          return o._pannerAttr;
        if (i.length === 1)
          if (typeof i[0] == "object")
            a = i[0], typeof c > "u" && (a.pannerAttr || (a.pannerAttr = {
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
        else i.length === 2 && (a = i[0], c = parseInt(i[1], 10));
        for (var f = o._getSoundIds(c), m = 0; m < f.length; m++)
          if (d = o._soundById(f[m]), d) {
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
            var v = d._panner;
            v || (d._pos || (d._pos = o._pos || [0, 0, -0.5]), n(d, "spatial"), v = d._panner), v.coneInnerAngle = y.coneInnerAngle, v.coneOuterAngle = y.coneOuterAngle, v.coneOuterGain = y.coneOuterGain, v.distanceModel = y.distanceModel, v.maxDistance = y.maxDistance, v.refDistance = y.refDistance, v.rolloffFactor = y.rolloffFactor, v.panningModel = y.panningModel;
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
  })(mc)), mc;
}
var CM = AM();
const PM = /* @__PURE__ */ wg(CM), { Howl: RS } = PM, dd = 500, Mt = {
  music: null,
  ambient: /* @__PURE__ */ new Map()
};
let mr = {}, mi = !1, fd = "";
function _i() {
  return typeof RS == "function";
}
function hc(e, n = 50) {
  const o = Number(e), i = Number.isFinite(o) ? o : n;
  return Math.min(1, Math.max(0, i / 100));
}
function DS(e) {
  return new RS({
    src: [e],
    loop: !0,
    html5: !0,
    preload: !0,
    volume: 0
  });
}
function NS(e, n, o = dd) {
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
  e && (NS(e, 0, Math.min(dd, 300)), (o = globalThis.setTimeout) == null || o.call(globalThis, () => {
    try {
      e.pause(), n && e.unload();
    } catch {
    }
  }, Math.min(dd, 320)));
}
function bM(e) {
  return !(e != null && e.streamUrl) || !_i() ? null : ((!Mt.music || Mt.music.__synapseSrc !== e.streamUrl) && (Wa(Mt.music, { unload: !0 }), Mt.music = DS(e.streamUrl), Mt.music.__synapseSrc = e.streamUrl), Mt.music);
}
function EM(e) {
  if (!(e != null && e.streamUrl) || !_i()) return null;
  const n = e.id || e.streamUrl, o = Mt.ambient.get(n);
  if (o && o.__synapseSrc === e.streamUrl) return o;
  Wa(o, { unload: !0 });
  const i = DS(e.streamUrl);
  return i.__synapseSrc = e.streamUrl, Mt.ambient.set(n, i), i;
}
function MM() {
  return [
    Mt.music,
    ...Mt.ambient.values()
  ].filter(Boolean);
}
function jS() {
  MM().forEach((e) => Wa(e));
}
function RM(e) {
  for (const [n, o] of Mt.ambient.entries())
    e.has(n) || (Wa(o, { unload: !0 }), Mt.ambient.delete(n));
}
function pg(e, n) {
  if (e)
    try {
      e.playing() || e.play(), NS(e, n), fd = "";
    } catch (o) {
      fd = (o == null ? void 0 : o.message) || "Audio playback is blocked until the browser receives a user action.";
    }
}
async function DM(e = {}) {
  mr = { ...mr, ...e };
  const n = za(mr);
  if (!_i()) return ga(n);
  if (!mi)
    return jS(), ga(n);
  const o = bM(n.musicTrack), i = hc(mr.musicVolume, 60), a = hc(mr.ambientVolume, 50), c = /* @__PURE__ */ new Set(), d = [];
  return n.ambientLayers.forEach((f) => {
    var p;
    const m = f.id || f.streamUrl;
    c.add(m);
    const y = EM(f), v = Number((p = mr.audioChannels) == null ? void 0 : p[f.id]), l = Number.isFinite(v) ? hc(v, 0) : Math.min(1, Math.max(0, a * (f.volumeBias ?? 1)));
    d.push([y, l]);
  }), RM(c), pg(o, i), d.forEach(([f, m]) => pg(f, m)), ga(n);
}
function NM(e) {
  return mi = !!e, mi || jS(), mi;
}
function ga(e = za(mr)) {
  var n, o, i, a;
  return {
    available: _i(),
    playing: mi && _i(),
    musicTitle: ((n = e.musicTrack) == null ? void 0 : n.title) || "",
    musicArtist: ((o = e.musicTrack) == null ? void 0 : o.artist) || "",
    musicPageUrl: ((i = e.musicTrack) == null ? void 0 : i.pageUrl) || "",
    musicAttribution: ((a = e.musicTrack) == null ? void 0 : a.attribution) || "",
    ambientTitles: e.ambientLayers.map((c) => c.title).filter(Boolean),
    ambientPageUrls: e.ambientLayers.map((c) => c.pageUrl).filter(Boolean),
    ambientAttributions: e.ambientLayers.map((c) => c.attribution).filter(Boolean),
    error: fd
  };
}
const jM = "synapse.focusRoom.audioPrefs.v1";
function IM(e) {
  var n;
  try {
    (n = globalThis.localStorage) == null || n.setItem(jM, JSON.stringify({
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
function FM() {
  const e = Q((m) => m.musicType), n = Q((m) => m.ambientSound), o = Q((m) => m.musicVolume), i = Q((m) => m.ambientVolume), a = Q((m) => m.audioChannels), c = Q((m) => m.audioPlaying), [d, f] = C.useState(() => ga(za({
    musicType: e,
    ambientSound: n
  })));
  return C.useEffect(() => {
    const m = { musicType: e, ambientSound: n, musicVolume: o, ambientVolume: i, audioChannels: a };
    let y = !1;
    return NM(c), IM(m), DM(m).then((v) => {
      y || f(v);
    }), () => {
      y = !0;
    };
  }, [n, i, a, c, e, o]), d;
}
function OM() {
  const e = Q(), n = C.useCallback(async (i = "", a = "", c = {}) => {
    var v;
    e.pauseTimer({ pauseAudio: !0 }), e.closeSummary();
    const d = typeof i == "string" || typeof i == "number" ? i : "", f = typeof a == "string" ? a : "", m = LM(f, c), y = String(d || e.selectedMaterialId || ((v = e.selectedMaterial) == null ? void 0 : v.materialId) || "");
    if (typeof globalThis.returnFromFocusRoomToWorkspace == "function")
      try {
        const l = globalThis.returnFromFocusRoomToWorkspace(y, m);
        l && typeof l.then == "function" && await l, mg(m.action || f, m);
        return;
      } catch (l) {
        console.error("Could not return from Focus Room:", l);
      }
    globalThis.location.hash = "", mg(m.action || f, m);
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
function IS(e) {
  const n = String(e || "").trim().toLowerCase();
  return ["flashcards", "quiz", "assistant", "mindmap", "timeline", "source", "notes"].includes(n) ? n : "";
}
function LM(e, n = {}) {
  const o = n && typeof n == "object" && !Array.isArray(n) ? n : {}, i = IS(e || o.action);
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
function mg(e, n = {}) {
  const o = IS(e);
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
function VM(e = 3e3) {
  const n = Q((i) => i.setIdle), o = Q((i) => i.isIdle);
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
function BM() {
  const e = Q((i) => i.timerState || (i.timerStatus === "studying" ? "running" : i.timerStatus)), n = Q((i) => i.view), o = Q((i) => i.tickTimer);
  C.useEffect(() => {
    if (n !== "session" || e !== "running" || typeof window > "u") return;
    let i = !0;
    const a = () => {
      i && o();
    }, c = window.setInterval(a, 1e3), d = () => {
      document.visibilityState === "visible" && a();
    };
    return document.addEventListener("visibilitychange", d), a(), () => {
      i = !1, window.clearInterval(c), document.removeEventListener("visibilitychange", d);
    };
  }, [o, e, n]);
}
function zM() {
  const e = Q((n) => n.selectedScene);
  return gn(e);
}
function $M(e) {
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
    studyPlan: e.studyPlan,
    currentSession: e.currentSession,
    elapsedSeconds: e.elapsedSeconds,
    startedAt: e.startedAt
  };
}
function UM() {
  const [e, n] = C.useState(""), [o, i] = C.useState(!1), [a, c] = C.useState(!1), d = Q((T) => T.view), f = VM(3e3), m = zM(), y = FM(), v = OM();
  BM();
  const l = Q(t1($M)), p = Q((T) => T.summaryRecord), S = Q((T) => T.endSession), w = Q((T) => T.initializeFocusRoom);
  C.useEffect(() => {
    w();
  }, [w]), C.useEffect(() => {
    l != null && l.materialId && Hd(l.materialId, l);
  }, [l]), C.useEffect(() => {
    d === "session" || !p || pa("focus-room");
  }, [p, d]), C.useEffect(() => {
    d !== "session" && (i(!1), n(""), c(!1));
  }, [d]), C.useEffect(() => {
    const T = (P) => {
      P.key === "Escape" && (o ? (P.preventDefault(), i(!1)) : e ? n("") : a && c(!1));
    };
    return window.addEventListener("keydown", T), () => window.removeEventListener("keydown", T);
  }, [a, o, e]);
  const k = (...T) => {
    v.returnToWorkspace(...T);
  }, A = async () => {
    c(!1), i(!1), n(""), S(), await k();
  };
  return /* @__PURE__ */ x.jsxs(
    "main",
    {
      id: "focusRoomSurface",
      className: `focus-room-surface react-focus-room ${f ? "is-idle" : ""} ${d === "setup" ? "is-setup is-innook-setup" : "is-session"}`.trim(),
      "aria-live": "polite",
      "data-focus-room-view": d,
      children: [
        /* @__PURE__ */ x.jsx(RC, { scene: m }),
        /* @__PURE__ */ x.jsxs(Va, { mode: "wait", children: [
          d === "setup" ? /* @__PURE__ */ x.jsx(
            vn.div,
            {
              className: "focus-room-view focus-setup-view",
              initial: { opacity: 0, y: 16 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -10 },
              transition: ba,
              children: /* @__PURE__ */ x.jsx(BP, { audioState: y, onWorkspace: k })
            },
            "setup"
          ) : null,
          d === "session" ? /* @__PURE__ */ x.jsxs(
            vn.div,
            {
              className: "focus-room-view focus-session-view",
              initial: { opacity: 0, y: 14 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -8 },
              transition: ba,
              children: [
                o ? /* @__PURE__ */ x.jsx("button", { type: "button", className: "focus-mode-exit-hit-area", onClick: () => i(!1), children: "Exit Focus Mode" }) : /* @__PURE__ */ x.jsx(zP, { onWorkspace: k, onOpenTrail: () => n("trail"), onOpenCompanion: () => n("companion"), onOpenSettings: () => n("settings"), onExit: () => c(!0) }),
                /* @__PURE__ */ x.jsx("section", { className: `focus-session-stage ${o ? "is-focus-mode" : ""}`.trim(), "aria-hidden": "true" }),
                o ? /* @__PURE__ */ x.jsx(kM, { onExit: () => i(!1) }) : /* @__PURE__ */ x.jsx(QP, { audioState: y, onFocusMode: () => i(!0) }),
                o ? null : /* @__PURE__ */ x.jsx(_M, { audioState: y, utilityPanel: e, onClose: () => n(""), onWorkspace: k }),
                /* @__PURE__ */ x.jsx(RE, {}),
                /* @__PURE__ */ x.jsx(HM, { open: a, onClose: () => c(!1), onConfirm: A })
              ]
            },
            "session"
          ) : null
        ] })
      ]
    }
  );
}
function HM({ open: e, onClose: n, onConfirm: o }) {
  return e ? /* @__PURE__ */ x.jsx("div", { className: "focus-exit-overlay", role: "presentation", children: /* @__PURE__ */ x.jsxs("div", { className: "focus-exit-dialog liquid-glass", role: "dialog", "aria-modal": "true", "aria-labelledby": "focus-exit-title", children: [
    /* @__PURE__ */ x.jsx("span", { className: "focus-kicker", children: "Leave this room?" }),
    /* @__PURE__ */ x.jsx("h2", { id: "focus-exit-title", children: "End focus session" }),
    /* @__PURE__ */ x.jsx("p", { children: "Your focused time will be saved to your Focus Trail." }),
    /* @__PURE__ */ x.jsxs("div", { className: "focus-button-row", children: [
      /* @__PURE__ */ x.jsx(be, { onClick: n, children: "Continue focusing" }),
      /* @__PURE__ */ x.jsx(be, { variant: "primary", onClick: o, children: "End and exit" })
    ] })
  ] }) }) : null;
}
let yc = null;
function WM(e, n) {
  const o = globalThis.__synapseFocusRoomApi || {};
  if (typeof o[e] != "function") {
    console.warn(`Synapse Focus Room action "${e}" is not available yet.`);
    return;
  }
  return o[e](...n);
}
function GM() {
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
    globalThis[n] = (...i) => WM(o, i);
  });
}
function KM(e = {}) {
  GM();
  const n = e.root || document.getElementById("focusRoomRoot");
  if (!n)
    throw new Error("Focus Room root element was not found.");
  yc || (yc = Xx.createRoot(n), yc.render(
    yn.createElement(
      yn.StrictMode,
      null,
      yn.createElement(UM)
    )
  ));
}
const YM = "synapse.generated.history.v6", FS = "synapse.active.generated.v6", QM = "synapse.flashcards.deck.v1", XM = "synapse.quiz.history.v1", ZM = "synapse.focusRoom.return-target.v1";
function uf(e, n) {
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
function JM(e, n) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, n), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function qM(e, n) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, JSON.stringify(n)), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function OS() {
  const e = uf(YM, []);
  return Array.isArray(e) ? e : [];
}
function eR(e) {
  const n = String((e == null ? void 0 : e.title) || "").trim();
  return n || String((e == null ? void 0 : e.summary) || "").split(/\n+/).map((i) => i.replace(/^#+\s*/, "").trim()).find((i) => i.length > 4) || "Generated Study Notes";
}
function LS(e = {}) {
  return [
    e.id ? `history:${e.id}` : "",
    e.sourceFingerprint ? `fingerprint:${e.sourceFingerprint}` : "",
    e.clientFingerprint ? `fingerprint:${e.clientFingerprint}` : ""
  ].filter(Boolean);
}
function tR(e = {}) {
  const n = uf(QM, {}), i = LS(e).map((a) => n == null ? void 0 : n[a]).find((a) => a && Array.isArray(a.cards) && a.cards.length);
  return (i == null ? void 0 : i.cards) || [];
}
function nR(e = {}) {
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
function rR(e = []) {
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
function oR(e = {}) {
  const n = uf(XM, {}), i = LS(e).flatMap((c) => Array.isArray(n == null ? void 0 : n[c]) ? n[c] : []), a = /* @__PURE__ */ new Set();
  return rR(i).filter((c) => {
    const d = nR(c);
    return !d || a.has(d) ? !1 : (a.add(d), !0);
  }).sort((c, d) => new Date(d.createdAt || 0) - new Date(c.createdAt || 0));
}
function iR(e = {}) {
  return {
    materialId: String(e.id || e.sourceFingerprint || e.clientFingerprint || "current-material"),
    materialTitle: eR(e),
    materialType: "Generated notes",
    uploadedContent: "",
    aiSummary: e.summary || "",
    sections: e.sections || {},
    flashcards: tR(e),
    quizzes: oR(e),
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
function VS() {
  return OS().filter((e) => e && (e.id || e.summary) && e.kind !== "companion" && !String(e.id || "").startsWith("companion:")).map(iR);
}
function BS(e = "") {
  const n = String(e || "");
  return n && VS().find(
    (o) => o.materialId === n || o.sourceFingerprint === n || o.clientFingerprint === n
  ) || null;
}
function zS() {
  var n;
  const e = ((n = globalThis.localStorage) == null ? void 0 : n.getItem(FS)) || "";
  return BS(e);
}
function sR(e = "") {
  var i;
  const n = e || ((i = zS()) == null ? void 0 : i.materialId) || "", o = n ? `/${encodeURIComponent(n)}` : "";
  globalThis.location.hash = `#/focus-room${o}`;
}
function aR(e = "", n = {}) {
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
async function lR(e = "", n = {}) {
  const o = String(e || ""), i = OS().find(
    (d) => String((d == null ? void 0 : d.id) || "") === o || String((d == null ? void 0 : d.sourceFingerprint) || (d == null ? void 0 : d.source_fingerprint) || "") === o || String((d == null ? void 0 : d.clientFingerprint) || (d == null ? void 0 : d.client_fingerprint) || "") === o
  ) || null, a = String((i == null ? void 0 : i.id) || "");
  a && JM(FS, a);
  const c = aR(a, n);
  c.action && qM(ZM, c), globalThis.location.href = a ? `index.html?focusReturn=${encodeURIComponent(a)}` : "index.html";
}
function uR() {
  Object.assign(globalThis, {
    getSynapseFocusRoomCurrentMaterial: zS,
    getSynapseFocusRoomMaterial: BS,
    getSynapseFocusRoomMaterials: VS,
    openSynapseFocusRoom: sR,
    returnFromFocusRoomToWorkspace: lR
  });
}
const $S = document.getElementById("focusRoomRoot");
if (!$S)
  throw new Error("Focus Room root element was not found.");
var gg;
(gg = document.getElementById("focusRoomFallbackTitle")) == null || gg.remove();
globalThis.apiClient = new Sg($x);
uR();
(!globalThis.location.hash || globalThis.location.hash === "#") && (globalThis.location.hash = "#/focus-room");
KM({ root: $S });
