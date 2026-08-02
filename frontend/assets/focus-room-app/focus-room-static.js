function y1(e, n) {
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
function g1(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function qy(e) {
  const n = String(e || "").toLowerCase();
  return n === "127.0.0.1" || n === "localhost" || n === "::1" || n === "[::1]";
}
function $h(e) {
  return qy(e) || g1(e);
}
function v1(e) {
  return !e || qy(e) ? "127.0.0.1" : e;
}
const S1 = (() => {
  var p, y, g, S;
  const { protocol: e, hostname: n, port: o } = window.location, i = String(window.SYNAPSE_BACKEND_PORT || ((y = (p = document.body) == null ? void 0 : p.dataset) == null ? void 0 : y.apiPort) || "8001").trim(), a = `http://${v1(n)}:${i || "8001"}`, c = String(window.SYNAPSE_API_BASE || ((S = (g = document.body) == null ? void 0 : g.dataset) == null ? void 0 : S.apiBase) || "").replace(/\/+$/, ""), d = `${e}//${window.location.host}`.replace(/\/+$/, "");
  return c && !($h(n) && o !== i && c === d) ? c : e === "file:" || $h(n) && o !== i ? a : `${e}//${window.location.host}`;
})();
class Os extends Error {
  constructor(n, { cause: o } = {}) {
    super(n), this.name = "ApiConnectionError", this.cause = o;
  }
}
const Hh = "synapse.client.id.v1";
function Vn() {
  return globalThis.window || globalThis;
}
function Hr(e, n = 220) {
  return String(e || "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
}
function Wh() {
  const e = globalThis.crypto || Vn().crypto;
  return e != null && e.randomUUID ? e.randomUUID() : `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
function w1() {
  var n, o;
  const e = Vn();
  try {
    const i = (n = e.localStorage) == null ? void 0 : n.getItem(Hh);
    if (i) return i;
    const a = Wh();
    return (o = e.localStorage) == null || o.setItem(Hh, a), a;
  } catch {
    return Wh();
  }
}
function x1(e = {}) {
  if (typeof Headers < "u" && e instanceof Headers) {
    const n = {};
    return e.forEach((o, i) => {
      n[i] = o;
    }), n;
  }
  return Array.isArray(e) ? Object.fromEntries(e) : { ...e || {} };
}
class Jy {
  constructor(n, { fetchImpl: o } = {}) {
    var a, c;
    const i = Vn();
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
    var c, d, p;
    const o = Vn(), i = x1(n);
    i["X-Synapse-Client-Id"] = Hr(w1(), 160);
    const a = (d = (c = o.SynapseAuth) == null ? void 0 : c.getStoredSession) == null ? void 0 : d.call(c);
    if (a && typeof a == "object" && (a.accountId && (i["X-Synapse-User-Id"] = Hr(a.accountId, 160)), a.email && (i["X-Synapse-User-Email"] = Hr(a.email, 220)), a.displayName && (i["X-Synapse-User-Name"] = Hr(a.displayName, 180)), a.authMode && (i["X-Synapse-Auth-Mode"] = Hr(a.authMode, 60)), a.role && (i["X-Synapse-User-Role"] = Hr(a.role, 80))), (p = o.SynapseAuth) != null && p.authHeaders && !i.Authorization && !i.authorization)
      try {
        const y = await o.SynapseAuth.authHeaders({});
        y != null && y.Authorization && (i.Authorization = y.Authorization), y != null && y.authorization && (i.authorization = y.authorization);
      } catch (y) {
        console.warn("Synapse auth headers were not attached:", y);
      }
    return i;
  }
  async fetch(n, o = {}) {
    const i = this.endpoint(n), { timeoutMs: a, ...c } = o || {};
    c.headers = await this.requestHeaders(c.headers || {});
    const d = Number(a || 0);
    let p = null, y = null, g = null, S = !1;
    const l = c.signal;
    d > 0 && typeof AbortController < "u" && (p = new AbortController(), g = () => p.abort(), l && (l.aborted ? p.abort() : l.addEventListener("abort", g, { once: !0 })), y = Vn().setTimeout(() => {
      S = !0, p.abort();
    }, d), c.signal = p.signal);
    try {
      return await this.fetchImpl(i, c);
    } catch (f) {
      throw S ? new Os(this.timeoutMessage(d), { cause: f }) : l != null && l.aborted ? f : new Os(this.connectionMessage(), { cause: f });
    } finally {
      y && Vn().clearTimeout(y), l && g && l.removeEventListener("abort", g);
    }
  }
  async warmup({ attempts: n = 2, retryDelayMs: o = 1500, timeoutMs: i = 6e4, maxWaitMs: a = 0, signal: c } = {}) {
    const d = Math.max(1, Math.floor(Number(n) || 1)), p = Math.max(0, Number(a) || 0), y = Date.now();
    let g = null;
    for (let S = 0; S < d; S += 1) {
      const l = Date.now() - y, f = p > 0 ? p - l : 0;
      if (p > 0 && f <= 0) break;
      try {
        const v = await this.fetch("/healthz", {
          method: "GET",
          signal: c,
          timeoutMs: p > 0 ? Math.min(i, f) : i
        });
        if (v != null && v.ok) return v;
        g = new Os(
          `Synapse hosted service returned ${(v == null ? void 0 : v.status) || "an unexpected status"} while preparing your analysis.`
        );
      } catch (v) {
        g = v;
      }
      if (S < d - 1 && o > 0) {
        const v = p > 0 ? p - (Date.now() - y) : o;
        if (p > 0 && v <= 0) break;
        await new Promise((x) => Vn().setTimeout(x, Math.min(o, v)));
      }
    }
    throw g || new Os(this.connectionMessage());
  }
  isRetryableResponse(n) {
    return [502, 503, 504].includes(Number(n == null ? void 0 : n.status));
  }
  async fetchWithRetry(n, o = {}, { attempts: i = 3, retryDelayMs: a = 3e3 } = {}) {
    const c = Math.max(1, Math.floor(Number(i) || 1));
    let d = null;
    for (let p = 0; p < c; p += 1) {
      if (d = await this.fetch(n, o), !this.isRetryableResponse(d) || p === c - 1) return d;
      a > 0 && await new Promise((y) => Vn().setTimeout(y, a));
    }
    return d;
  }
}
var qo = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function eg(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var ju = { exports: {} }, Se = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Gh;
function _1() {
  if (Gh) return Se;
  Gh = 1;
  var e = Symbol.for("react.element"), n = Symbol.for("react.portal"), o = Symbol.for("react.fragment"), i = Symbol.for("react.strict_mode"), a = Symbol.for("react.profiler"), c = Symbol.for("react.provider"), d = Symbol.for("react.context"), p = Symbol.for("react.forward_ref"), y = Symbol.for("react.suspense"), g = Symbol.for("react.memo"), S = Symbol.for("react.lazy"), l = Symbol.iterator;
  function f(b) {
    return b === null || typeof b != "object" ? null : (b = l && b[l] || b["@@iterator"], typeof b == "function" ? b : null);
  }
  var v = { isMounted: function() {
    return !1;
  }, enqueueForceUpdate: function() {
  }, enqueueReplaceState: function() {
  }, enqueueSetState: function() {
  } }, x = Object.assign, T = {};
  function k(b, O, le) {
    this.props = b, this.context = O, this.refs = T, this.updater = le || v;
  }
  k.prototype.isReactComponent = {}, k.prototype.setState = function(b, O) {
    if (typeof b != "object" && typeof b != "function" && b != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
    this.updater.enqueueSetState(this, b, O, "setState");
  }, k.prototype.forceUpdate = function(b) {
    this.updater.enqueueForceUpdate(this, b, "forceUpdate");
  };
  function A() {
  }
  A.prototype = k.prototype;
  function R(b, O, le) {
    this.props = b, this.context = O, this.refs = T, this.updater = le || v;
  }
  var P = R.prototype = new A();
  P.constructor = R, x(P, k.prototype), P.isPureReactComponent = !0;
  var D = Array.isArray, L = Object.prototype.hasOwnProperty, X = { current: null }, Z = { key: !0, ref: !0, __self: !0, __source: !0 };
  function U(b, O, le) {
    var fe, me = {}, xe = null, W = null;
    if (O != null) for (fe in O.ref !== void 0 && (W = O.ref), O.key !== void 0 && (xe = "" + O.key), O) L.call(O, fe) && !Z.hasOwnProperty(fe) && (me[fe] = O[fe]);
    var pe = arguments.length - 2;
    if (pe === 1) me.children = le;
    else if (1 < pe) {
      for (var ve = Array(pe), De = 0; De < pe; De++) ve[De] = arguments[De + 2];
      me.children = ve;
    }
    if (b && b.defaultProps) for (fe in pe = b.defaultProps, pe) me[fe] === void 0 && (me[fe] = pe[fe]);
    return { $$typeof: e, type: b, key: xe, ref: W, props: me, _owner: X.current };
  }
  function G(b, O) {
    return { $$typeof: e, type: b.type, key: O, ref: b.ref, props: b.props, _owner: b._owner };
  }
  function Q(b) {
    return typeof b == "object" && b !== null && b.$$typeof === e;
  }
  function J(b) {
    var O = { "=": "=0", ":": "=2" };
    return "$" + b.replace(/[=:]/g, function(le) {
      return O[le];
    });
  }
  var ce = /\/+/g;
  function ye(b, O) {
    return typeof b == "object" && b !== null && b.key != null ? J("" + b.key) : O.toString(36);
  }
  function he(b, O, le, fe, me) {
    var xe = typeof b;
    (xe === "undefined" || xe === "boolean") && (b = null);
    var W = !1;
    if (b === null) W = !0;
    else switch (xe) {
      case "string":
      case "number":
        W = !0;
        break;
      case "object":
        switch (b.$$typeof) {
          case e:
          case n:
            W = !0;
        }
    }
    if (W) return W = b, me = me(W), b = fe === "" ? "." + ye(W, 0) : fe, D(me) ? (le = "", b != null && (le = b.replace(ce, "$&/") + "/"), he(me, O, le, "", function(De) {
      return De;
    })) : me != null && (Q(me) && (me = G(me, le + (!me.key || W && W.key === me.key ? "" : ("" + me.key).replace(ce, "$&/") + "/") + b)), O.push(me)), 1;
    if (W = 0, fe = fe === "" ? "." : fe + ":", D(b)) for (var pe = 0; pe < b.length; pe++) {
      xe = b[pe];
      var ve = fe + ye(xe, pe);
      W += he(xe, O, le, ve, me);
    }
    else if (ve = f(b), typeof ve == "function") for (b = ve.call(b), pe = 0; !(xe = b.next()).done; ) xe = xe.value, ve = fe + ye(xe, pe++), W += he(xe, O, le, ve, me);
    else if (xe === "object") throw O = String(b), Error("Objects are not valid as a React child (found: " + (O === "[object Object]" ? "object with keys {" + Object.keys(b).join(", ") + "}" : O) + "). If you meant to render a collection of children, use an array instead.");
    return W;
  }
  function we(b, O, le) {
    if (b == null) return b;
    var fe = [], me = 0;
    return he(b, fe, "", "", function(xe) {
      return O.call(le, xe, me++);
    }), fe;
  }
  function ue(b) {
    if (b._status === -1) {
      var O = b._result;
      O = O(), O.then(function(le) {
        (b._status === 0 || b._status === -1) && (b._status = 1, b._result = le);
      }, function(le) {
        (b._status === 0 || b._status === -1) && (b._status = 2, b._result = le);
      }), b._status === -1 && (b._status = 0, b._result = O);
    }
    if (b._status === 1) return b._result.default;
    throw b._result;
  }
  var ge = { current: null }, V = { transition: null }, q = { ReactCurrentDispatcher: ge, ReactCurrentBatchConfig: V, ReactCurrentOwner: X };
  function K() {
    throw Error("act(...) is not supported in production builds of React.");
  }
  return Se.Children = { map: we, forEach: function(b, O, le) {
    we(b, function() {
      O.apply(this, arguments);
    }, le);
  }, count: function(b) {
    var O = 0;
    return we(b, function() {
      O++;
    }), O;
  }, toArray: function(b) {
    return we(b, function(O) {
      return O;
    }) || [];
  }, only: function(b) {
    if (!Q(b)) throw Error("React.Children.only expected to receive a single React element child.");
    return b;
  } }, Se.Component = k, Se.Fragment = o, Se.Profiler = a, Se.PureComponent = R, Se.StrictMode = i, Se.Suspense = y, Se.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = q, Se.act = K, Se.cloneElement = function(b, O, le) {
    if (b == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + b + ".");
    var fe = x({}, b.props), me = b.key, xe = b.ref, W = b._owner;
    if (O != null) {
      if (O.ref !== void 0 && (xe = O.ref, W = X.current), O.key !== void 0 && (me = "" + O.key), b.type && b.type.defaultProps) var pe = b.type.defaultProps;
      for (ve in O) L.call(O, ve) && !Z.hasOwnProperty(ve) && (fe[ve] = O[ve] === void 0 && pe !== void 0 ? pe[ve] : O[ve]);
    }
    var ve = arguments.length - 2;
    if (ve === 1) fe.children = le;
    else if (1 < ve) {
      pe = Array(ve);
      for (var De = 0; De < ve; De++) pe[De] = arguments[De + 2];
      fe.children = pe;
    }
    return { $$typeof: e, type: b.type, key: me, ref: xe, props: fe, _owner: W };
  }, Se.createContext = function(b) {
    return b = { $$typeof: d, _currentValue: b, _currentValue2: b, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, b.Provider = { $$typeof: c, _context: b }, b.Consumer = b;
  }, Se.createElement = U, Se.createFactory = function(b) {
    var O = U.bind(null, b);
    return O.type = b, O;
  }, Se.createRef = function() {
    return { current: null };
  }, Se.forwardRef = function(b) {
    return { $$typeof: p, render: b };
  }, Se.isValidElement = Q, Se.lazy = function(b) {
    return { $$typeof: S, _payload: { _status: -1, _result: b }, _init: ue };
  }, Se.memo = function(b, O) {
    return { $$typeof: g, type: b, compare: O === void 0 ? null : O };
  }, Se.startTransition = function(b) {
    var O = V.transition;
    V.transition = {};
    try {
      b();
    } finally {
      V.transition = O;
    }
  }, Se.unstable_act = K, Se.useCallback = function(b, O) {
    return ge.current.useCallback(b, O);
  }, Se.useContext = function(b) {
    return ge.current.useContext(b);
  }, Se.useDebugValue = function() {
  }, Se.useDeferredValue = function(b) {
    return ge.current.useDeferredValue(b);
  }, Se.useEffect = function(b, O) {
    return ge.current.useEffect(b, O);
  }, Se.useId = function() {
    return ge.current.useId();
  }, Se.useImperativeHandle = function(b, O, le) {
    return ge.current.useImperativeHandle(b, O, le);
  }, Se.useInsertionEffect = function(b, O) {
    return ge.current.useInsertionEffect(b, O);
  }, Se.useLayoutEffect = function(b, O) {
    return ge.current.useLayoutEffect(b, O);
  }, Se.useMemo = function(b, O) {
    return ge.current.useMemo(b, O);
  }, Se.useReducer = function(b, O, le) {
    return ge.current.useReducer(b, O, le);
  }, Se.useRef = function(b) {
    return ge.current.useRef(b);
  }, Se.useState = function(b) {
    return ge.current.useState(b);
  }, Se.useSyncExternalStore = function(b, O, le) {
    return ge.current.useSyncExternalStore(b, O, le);
  }, Se.useTransition = function() {
    return ge.current.useTransition();
  }, Se.version = "18.3.1", Se;
}
var Kh;
function ed() {
  return Kh || (Kh = 1, ju.exports = _1()), ju.exports;
}
var C = ed();
const yn = /* @__PURE__ */ eg(C), td = /* @__PURE__ */ y1({
  __proto__: null,
  default: yn
}, [C]);
var Ls = {}, Iu = { exports: {} }, pt = {}, Fu = { exports: {} }, Ou = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Yh;
function k1() {
  return Yh || (Yh = 1, (function(e) {
    function n(V, q) {
      var K = V.length;
      V.push(q);
      e: for (; 0 < K; ) {
        var b = K - 1 >>> 1, O = V[b];
        if (0 < a(O, q)) V[b] = q, V[K] = O, K = b;
        else break e;
      }
    }
    function o(V) {
      return V.length === 0 ? null : V[0];
    }
    function i(V) {
      if (V.length === 0) return null;
      var q = V[0], K = V.pop();
      if (K !== q) {
        V[0] = K;
        e: for (var b = 0, O = V.length, le = O >>> 1; b < le; ) {
          var fe = 2 * (b + 1) - 1, me = V[fe], xe = fe + 1, W = V[xe];
          if (0 > a(me, K)) xe < O && 0 > a(W, me) ? (V[b] = W, V[xe] = K, b = xe) : (V[b] = me, V[fe] = K, b = fe);
          else if (xe < O && 0 > a(W, K)) V[b] = W, V[xe] = K, b = xe;
          else break e;
        }
      }
      return q;
    }
    function a(V, q) {
      var K = V.sortIndex - q.sortIndex;
      return K !== 0 ? K : V.id - q.id;
    }
    if (typeof performance == "object" && typeof performance.now == "function") {
      var c = performance;
      e.unstable_now = function() {
        return c.now();
      };
    } else {
      var d = Date, p = d.now();
      e.unstable_now = function() {
        return d.now() - p;
      };
    }
    var y = [], g = [], S = 1, l = null, f = 3, v = !1, x = !1, T = !1, k = typeof setTimeout == "function" ? setTimeout : null, A = typeof clearTimeout == "function" ? clearTimeout : null, R = typeof setImmediate < "u" ? setImmediate : null;
    typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
    function P(V) {
      for (var q = o(g); q !== null; ) {
        if (q.callback === null) i(g);
        else if (q.startTime <= V) i(g), q.sortIndex = q.expirationTime, n(y, q);
        else break;
        q = o(g);
      }
    }
    function D(V) {
      if (T = !1, P(V), !x) if (o(y) !== null) x = !0, ue(L);
      else {
        var q = o(g);
        q !== null && ge(D, q.startTime - V);
      }
    }
    function L(V, q) {
      x = !1, T && (T = !1, A(U), U = -1), v = !0;
      var K = f;
      try {
        for (P(q), l = o(y); l !== null && (!(l.expirationTime > q) || V && !J()); ) {
          var b = l.callback;
          if (typeof b == "function") {
            l.callback = null, f = l.priorityLevel;
            var O = b(l.expirationTime <= q);
            q = e.unstable_now(), typeof O == "function" ? l.callback = O : l === o(y) && i(y), P(q);
          } else i(y);
          l = o(y);
        }
        if (l !== null) var le = !0;
        else {
          var fe = o(g);
          fe !== null && ge(D, fe.startTime - q), le = !1;
        }
        return le;
      } finally {
        l = null, f = K, v = !1;
      }
    }
    var X = !1, Z = null, U = -1, G = 5, Q = -1;
    function J() {
      return !(e.unstable_now() - Q < G);
    }
    function ce() {
      if (Z !== null) {
        var V = e.unstable_now();
        Q = V;
        var q = !0;
        try {
          q = Z(!0, V);
        } finally {
          q ? ye() : (X = !1, Z = null);
        }
      } else X = !1;
    }
    var ye;
    if (typeof R == "function") ye = function() {
      R(ce);
    };
    else if (typeof MessageChannel < "u") {
      var he = new MessageChannel(), we = he.port2;
      he.port1.onmessage = ce, ye = function() {
        we.postMessage(null);
      };
    } else ye = function() {
      k(ce, 0);
    };
    function ue(V) {
      Z = V, X || (X = !0, ye());
    }
    function ge(V, q) {
      U = k(function() {
        V(e.unstable_now());
      }, q);
    }
    e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(V) {
      V.callback = null;
    }, e.unstable_continueExecution = function() {
      x || v || (x = !0, ue(L));
    }, e.unstable_forceFrameRate = function(V) {
      0 > V || 125 < V ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : G = 0 < V ? Math.floor(1e3 / V) : 5;
    }, e.unstable_getCurrentPriorityLevel = function() {
      return f;
    }, e.unstable_getFirstCallbackNode = function() {
      return o(y);
    }, e.unstable_next = function(V) {
      switch (f) {
        case 1:
        case 2:
        case 3:
          var q = 3;
          break;
        default:
          q = f;
      }
      var K = f;
      f = q;
      try {
        return V();
      } finally {
        f = K;
      }
    }, e.unstable_pauseExecution = function() {
    }, e.unstable_requestPaint = function() {
    }, e.unstable_runWithPriority = function(V, q) {
      switch (V) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          V = 3;
      }
      var K = f;
      f = V;
      try {
        return q();
      } finally {
        f = K;
      }
    }, e.unstable_scheduleCallback = function(V, q, K) {
      var b = e.unstable_now();
      switch (typeof K == "object" && K !== null ? (K = K.delay, K = typeof K == "number" && 0 < K ? b + K : b) : K = b, V) {
        case 1:
          var O = -1;
          break;
        case 2:
          O = 250;
          break;
        case 5:
          O = 1073741823;
          break;
        case 4:
          O = 1e4;
          break;
        default:
          O = 5e3;
      }
      return O = K + O, V = { id: S++, callback: q, priorityLevel: V, startTime: K, expirationTime: O, sortIndex: -1 }, K > b ? (V.sortIndex = K, n(g, V), o(y) === null && V === o(g) && (T ? (A(U), U = -1) : T = !0, ge(D, K - b))) : (V.sortIndex = O, n(y, V), x || v || (x = !0, ue(L))), V;
    }, e.unstable_shouldYield = J, e.unstable_wrapCallback = function(V) {
      var q = f;
      return function() {
        var K = f;
        f = q;
        try {
          return V.apply(this, arguments);
        } finally {
          f = K;
        }
      };
    };
  })(Ou)), Ou;
}
var Qh;
function T1() {
  return Qh || (Qh = 1, Fu.exports = k1()), Fu.exports;
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
var Xh;
function A1() {
  if (Xh) return pt;
  Xh = 1;
  var e = ed(), n = T1();
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
  var p = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), y = Object.prototype.hasOwnProperty, g = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, S = {}, l = {};
  function f(t) {
    return y.call(l, t) ? !0 : y.call(S, t) ? !1 : g.test(t) ? l[t] = !0 : (S[t] = !0, !1);
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
  function x(t, r, s, u) {
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
  function T(t, r, s, u, h, m, _) {
    this.acceptsBooleans = r === 2 || r === 3 || r === 4, this.attributeName = u, this.attributeNamespace = h, this.mustUseProperty = s, this.propertyName = t, this.type = r, this.sanitizeURL = m, this.removeEmptyString = _;
  }
  var k = {};
  "children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(t) {
    k[t] = new T(t, 0, !1, t, null, !1, !1);
  }), [["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(t) {
    var r = t[0];
    k[r] = new T(r, 1, !1, t[1], null, !1, !1);
  }), ["contentEditable", "draggable", "spellCheck", "value"].forEach(function(t) {
    k[t] = new T(t, 2, !1, t.toLowerCase(), null, !1, !1);
  }), ["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(t) {
    k[t] = new T(t, 2, !1, t, null, !1, !1);
  }), "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(t) {
    k[t] = new T(t, 3, !1, t.toLowerCase(), null, !1, !1);
  }), ["checked", "multiple", "muted", "selected"].forEach(function(t) {
    k[t] = new T(t, 3, !0, t, null, !1, !1);
  }), ["capture", "download"].forEach(function(t) {
    k[t] = new T(t, 4, !1, t, null, !1, !1);
  }), ["cols", "rows", "size", "span"].forEach(function(t) {
    k[t] = new T(t, 6, !1, t, null, !1, !1);
  }), ["rowSpan", "start"].forEach(function(t) {
    k[t] = new T(t, 5, !1, t.toLowerCase(), null, !1, !1);
  });
  var A = /[\-:]([a-z])/g;
  function R(t) {
    return t[1].toUpperCase();
  }
  "accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(t) {
    var r = t.replace(
      A,
      R
    );
    k[r] = new T(r, 1, !1, t, null, !1, !1);
  }), "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(t) {
    var r = t.replace(A, R);
    k[r] = new T(r, 1, !1, t, "http://www.w3.org/1999/xlink", !1, !1);
  }), ["xml:base", "xml:lang", "xml:space"].forEach(function(t) {
    var r = t.replace(A, R);
    k[r] = new T(r, 1, !1, t, "http://www.w3.org/XML/1998/namespace", !1, !1);
  }), ["tabIndex", "crossOrigin"].forEach(function(t) {
    k[t] = new T(t, 1, !1, t.toLowerCase(), null, !1, !1);
  }), k.xlinkHref = new T("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1), ["src", "href", "action", "formAction"].forEach(function(t) {
    k[t] = new T(t, 1, !1, t.toLowerCase(), null, !0, !0);
  });
  function P(t, r, s, u) {
    var h = k.hasOwnProperty(r) ? k[r] : null;
    (h !== null ? h.type !== 0 : u || !(2 < r.length) || r[0] !== "o" && r[0] !== "O" || r[1] !== "n" && r[1] !== "N") && (x(r, s, h, u) && (s = null), u || h === null ? f(r) && (s === null ? t.removeAttribute(r) : t.setAttribute(r, "" + s)) : h.mustUseProperty ? t[h.propertyName] = s === null ? h.type === 3 ? !1 : "" : s : (r = h.attributeName, u = h.attributeNamespace, s === null ? t.removeAttribute(r) : (h = h.type, s = h === 3 || h === 4 && s === !0 ? "" : "" + s, u ? t.setAttributeNS(u, r, s) : t.setAttribute(r, s))));
  }
  var D = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, L = Symbol.for("react.element"), X = Symbol.for("react.portal"), Z = Symbol.for("react.fragment"), U = Symbol.for("react.strict_mode"), G = Symbol.for("react.profiler"), Q = Symbol.for("react.provider"), J = Symbol.for("react.context"), ce = Symbol.for("react.forward_ref"), ye = Symbol.for("react.suspense"), he = Symbol.for("react.suspense_list"), we = Symbol.for("react.memo"), ue = Symbol.for("react.lazy"), ge = Symbol.for("react.offscreen"), V = Symbol.iterator;
  function q(t) {
    return t === null || typeof t != "object" ? null : (t = V && t[V] || t["@@iterator"], typeof t == "function" ? t : null);
  }
  var K = Object.assign, b;
  function O(t) {
    if (b === void 0) try {
      throw Error();
    } catch (s) {
      var r = s.stack.trim().match(/\n( *(at )?)/);
      b = r && r[1] || "";
    }
    return `
` + b + t;
  }
  var le = !1;
  function fe(t, r) {
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
`), m = u.stack.split(`
`), _ = h.length - 1, E = m.length - 1; 1 <= _ && 0 <= E && h[_] !== m[E]; ) E--;
        for (; 1 <= _ && 0 <= E; _--, E--) if (h[_] !== m[E]) {
          if (_ !== 1 || E !== 1)
            do
              if (_--, E--, 0 > E || h[_] !== m[E]) {
                var M = `
` + h[_].replace(" at new ", " at ");
                return t.displayName && M.includes("<anonymous>") && (M = M.replace("<anonymous>", t.displayName)), M;
              }
            while (1 <= _ && 0 <= E);
          break;
        }
      }
    } finally {
      le = !1, Error.prepareStackTrace = s;
    }
    return (t = t ? t.displayName || t.name : "") ? O(t) : "";
  }
  function me(t) {
    switch (t.tag) {
      case 5:
        return O(t.type);
      case 16:
        return O("Lazy");
      case 13:
        return O("Suspense");
      case 19:
        return O("SuspenseList");
      case 0:
      case 2:
      case 15:
        return t = fe(t.type, !1), t;
      case 11:
        return t = fe(t.type.render, !1), t;
      case 1:
        return t = fe(t.type, !0), t;
      default:
        return "";
    }
  }
  function xe(t) {
    if (t == null) return null;
    if (typeof t == "function") return t.displayName || t.name || null;
    if (typeof t == "string") return t;
    switch (t) {
      case Z:
        return "Fragment";
      case X:
        return "Portal";
      case G:
        return "Profiler";
      case U:
        return "StrictMode";
      case ye:
        return "Suspense";
      case he:
        return "SuspenseList";
    }
    if (typeof t == "object") switch (t.$$typeof) {
      case J:
        return (t.displayName || "Context") + ".Consumer";
      case Q:
        return (t._context.displayName || "Context") + ".Provider";
      case ce:
        var r = t.render;
        return t = t.displayName, t || (t = r.displayName || r.name || "", t = t !== "" ? "ForwardRef(" + t + ")" : "ForwardRef"), t;
      case we:
        return r = t.displayName || null, r !== null ? r : xe(t.type) || "Memo";
      case ue:
        r = t._payload, t = t._init;
        try {
          return xe(t(r));
        } catch {
        }
    }
    return null;
  }
  function W(t) {
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
        return xe(r);
      case 8:
        return r === U ? "StrictMode" : "Mode";
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
  function pe(t) {
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
  function ve(t) {
    var r = t.type;
    return (t = t.nodeName) && t.toLowerCase() === "input" && (r === "checkbox" || r === "radio");
  }
  function De(t) {
    var r = ve(t) ? "checked" : "value", s = Object.getOwnPropertyDescriptor(t.constructor.prototype, r), u = "" + t[r];
    if (!t.hasOwnProperty(r) && typeof s < "u" && typeof s.get == "function" && typeof s.set == "function") {
      var h = s.get, m = s.set;
      return Object.defineProperty(t, r, { configurable: !0, get: function() {
        return h.call(this);
      }, set: function(_) {
        u = "" + _, m.call(this, _);
      } }), Object.defineProperty(t, r, { enumerable: s.enumerable }), { getValue: function() {
        return u;
      }, setValue: function(_) {
        u = "" + _;
      }, stopTracking: function() {
        t._valueTracker = null, delete t[r];
      } };
    }
  }
  function Kn(t) {
    t._valueTracker || (t._valueTracker = De(t));
  }
  function fo(t) {
    if (!t) return !1;
    var r = t._valueTracker;
    if (!r) return !0;
    var s = r.getValue(), u = "";
    return t && (u = ve(t) ? t.checked ? "true" : "false" : t.value), t = u, t !== s ? (r.setValue(t), !0) : !1;
  }
  function Yn(t) {
    if (t = t || (typeof document < "u" ? document : void 0), typeof t > "u") return null;
    try {
      return t.activeElement || t.body;
    } catch {
      return t.body;
    }
  }
  function Ba(t, r) {
    var s = r.checked;
    return K({}, r, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: s ?? t._wrapperState.initialChecked });
  }
  function Qd(t, r) {
    var s = r.defaultValue == null ? "" : r.defaultValue, u = r.checked != null ? r.checked : r.defaultChecked;
    s = pe(r.value != null ? r.value : s), t._wrapperState = { initialChecked: u, initialValue: s, controlled: r.type === "checkbox" || r.type === "radio" ? r.checked != null : r.value != null };
  }
  function Xd(t, r) {
    r = r.checked, r != null && P(t, "checked", r, !1);
  }
  function Ua(t, r) {
    Xd(t, r);
    var s = pe(r.value), u = r.type;
    if (s != null) u === "number" ? (s === 0 && t.value === "" || t.value != s) && (t.value = "" + s) : t.value !== "" + s && (t.value = "" + s);
    else if (u === "submit" || u === "reset") {
      t.removeAttribute("value");
      return;
    }
    r.hasOwnProperty("value") ? $a(t, r.type, s) : r.hasOwnProperty("defaultValue") && $a(t, r.type, pe(r.defaultValue)), r.checked == null && r.defaultChecked != null && (t.defaultChecked = !!r.defaultChecked);
  }
  function Zd(t, r, s) {
    if (r.hasOwnProperty("value") || r.hasOwnProperty("defaultValue")) {
      var u = r.type;
      if (!(u !== "submit" && u !== "reset" || r.value !== void 0 && r.value !== null)) return;
      r = "" + t._wrapperState.initialValue, s || r === t.value || (t.value = r), t.defaultValue = r;
    }
    s = t.name, s !== "" && (t.name = ""), t.defaultChecked = !!t._wrapperState.initialChecked, s !== "" && (t.name = s);
  }
  function $a(t, r, s) {
    (r !== "number" || Yn(t.ownerDocument) !== t) && (s == null ? t.defaultValue = "" + t._wrapperState.initialValue : t.defaultValue !== "" + s && (t.defaultValue = "" + s));
  }
  var po = Array.isArray;
  function Sr(t, r, s, u) {
    if (t = t.options, r) {
      r = {};
      for (var h = 0; h < s.length; h++) r["$" + s[h]] = !0;
      for (s = 0; s < t.length; s++) h = r.hasOwnProperty("$" + t[s].value), t[s].selected !== h && (t[s].selected = h), h && u && (t[s].defaultSelected = !0);
    } else {
      for (s = "" + pe(s), r = null, h = 0; h < t.length; h++) {
        if (t[h].value === s) {
          t[h].selected = !0, u && (t[h].defaultSelected = !0);
          return;
        }
        r !== null || t[h].disabled || (r = t[h]);
      }
      r !== null && (r.selected = !0);
    }
  }
  function Ha(t, r) {
    if (r.dangerouslySetInnerHTML != null) throw Error(o(91));
    return K({}, r, { value: void 0, defaultValue: void 0, children: "" + t._wrapperState.initialValue });
  }
  function qd(t, r) {
    var s = r.value;
    if (s == null) {
      if (s = r.children, r = r.defaultValue, s != null) {
        if (r != null) throw Error(o(92));
        if (po(s)) {
          if (1 < s.length) throw Error(o(93));
          s = s[0];
        }
        r = s;
      }
      r == null && (r = ""), s = r;
    }
    t._wrapperState = { initialValue: pe(s) };
  }
  function Jd(t, r) {
    var s = pe(r.value), u = pe(r.defaultValue);
    s != null && (s = "" + s, s !== t.value && (t.value = s), r.defaultValue == null && t.defaultValue !== s && (t.defaultValue = s)), u != null && (t.defaultValue = "" + u);
  }
  function ef(t) {
    var r = t.textContent;
    r === t._wrapperState.initialValue && r !== "" && r !== null && (t.value = r);
  }
  function tf(t) {
    switch (t) {
      case "svg":
        return "http://www.w3.org/2000/svg";
      case "math":
        return "http://www.w3.org/1998/Math/MathML";
      default:
        return "http://www.w3.org/1999/xhtml";
    }
  }
  function Wa(t, r) {
    return t == null || t === "http://www.w3.org/1999/xhtml" ? tf(r) : t === "http://www.w3.org/2000/svg" && r === "foreignObject" ? "http://www.w3.org/1999/xhtml" : t;
  }
  var Pi, nf = (function(t) {
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
  function ho(t, r) {
    if (r) {
      var s = t.firstChild;
      if (s && s === t.lastChild && s.nodeType === 3) {
        s.nodeValue = r;
        return;
      }
    }
    t.textContent = r;
  }
  var mo = {
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
  }, wS = ["Webkit", "ms", "Moz", "O"];
  Object.keys(mo).forEach(function(t) {
    wS.forEach(function(r) {
      r = r + t.charAt(0).toUpperCase() + t.substring(1), mo[r] = mo[t];
    });
  });
  function rf(t, r, s) {
    return r == null || typeof r == "boolean" || r === "" ? "" : s || typeof r != "number" || r === 0 || mo.hasOwnProperty(t) && mo[t] ? ("" + r).trim() : r + "px";
  }
  function of(t, r) {
    t = t.style;
    for (var s in r) if (r.hasOwnProperty(s)) {
      var u = s.indexOf("--") === 0, h = rf(s, r[s], u);
      s === "float" && (s = "cssFloat"), u ? t.setProperty(s, h) : t[s] = h;
    }
  }
  var xS = K({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
  function Ga(t, r) {
    if (r) {
      if (xS[t] && (r.children != null || r.dangerouslySetInnerHTML != null)) throw Error(o(137, t));
      if (r.dangerouslySetInnerHTML != null) {
        if (r.children != null) throw Error(o(60));
        if (typeof r.dangerouslySetInnerHTML != "object" || !("__html" in r.dangerouslySetInnerHTML)) throw Error(o(61));
      }
      if (r.style != null && typeof r.style != "object") throw Error(o(62));
    }
  }
  function Ka(t, r) {
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
  var Ya = null;
  function Qa(t) {
    return t = t.target || t.srcElement || window, t.correspondingUseElement && (t = t.correspondingUseElement), t.nodeType === 3 ? t.parentNode : t;
  }
  var Xa = null, wr = null, xr = null;
  function sf(t) {
    if (t = Oo(t)) {
      if (typeof Xa != "function") throw Error(o(280));
      var r = t.stateNode;
      r && (r = qi(r), Xa(t.stateNode, t.type, r));
    }
  }
  function af(t) {
    wr ? xr ? xr.push(t) : xr = [t] : wr = t;
  }
  function lf() {
    if (wr) {
      var t = wr, r = xr;
      if (xr = wr = null, sf(t), r) for (t = 0; t < r.length; t++) sf(r[t]);
    }
  }
  function uf(t, r) {
    return t(r);
  }
  function cf() {
  }
  var Za = !1;
  function df(t, r, s) {
    if (Za) return t(r, s);
    Za = !0;
    try {
      return uf(t, r, s);
    } finally {
      Za = !1, (wr !== null || xr !== null) && (cf(), lf());
    }
  }
  function yo(t, r) {
    var s = t.stateNode;
    if (s === null) return null;
    var u = qi(s);
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
  var qa = !1;
  if (p) try {
    var go = {};
    Object.defineProperty(go, "passive", { get: function() {
      qa = !0;
    } }), window.addEventListener("test", go, go), window.removeEventListener("test", go, go);
  } catch {
    qa = !1;
  }
  function _S(t, r, s, u, h, m, _, E, M) {
    var F = Array.prototype.slice.call(arguments, 3);
    try {
      r.apply(s, F);
    } catch (B) {
      this.onError(B);
    }
  }
  var vo = !1, Mi = null, Ri = !1, Ja = null, kS = { onError: function(t) {
    vo = !0, Mi = t;
  } };
  function TS(t, r, s, u, h, m, _, E, M) {
    vo = !1, Mi = null, _S.apply(kS, arguments);
  }
  function AS(t, r, s, u, h, m, _, E, M) {
    if (TS.apply(this, arguments), vo) {
      if (vo) {
        var F = Mi;
        vo = !1, Mi = null;
      } else throw Error(o(198));
      Ri || (Ri = !0, Ja = F);
    }
  }
  function Qn(t) {
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
  function ff(t) {
    if (t.tag === 13) {
      var r = t.memoizedState;
      if (r === null && (t = t.alternate, t !== null && (r = t.memoizedState)), r !== null) return r.dehydrated;
    }
    return null;
  }
  function pf(t) {
    if (Qn(t) !== t) throw Error(o(188));
  }
  function CS(t) {
    var r = t.alternate;
    if (!r) {
      if (r = Qn(t), r === null) throw Error(o(188));
      return r !== t ? null : t;
    }
    for (var s = t, u = r; ; ) {
      var h = s.return;
      if (h === null) break;
      var m = h.alternate;
      if (m === null) {
        if (u = h.return, u !== null) {
          s = u;
          continue;
        }
        break;
      }
      if (h.child === m.child) {
        for (m = h.child; m; ) {
          if (m === s) return pf(h), t;
          if (m === u) return pf(h), r;
          m = m.sibling;
        }
        throw Error(o(188));
      }
      if (s.return !== u.return) s = h, u = m;
      else {
        for (var _ = !1, E = h.child; E; ) {
          if (E === s) {
            _ = !0, s = h, u = m;
            break;
          }
          if (E === u) {
            _ = !0, u = h, s = m;
            break;
          }
          E = E.sibling;
        }
        if (!_) {
          for (E = m.child; E; ) {
            if (E === s) {
              _ = !0, s = m, u = h;
              break;
            }
            if (E === u) {
              _ = !0, u = m, s = h;
              break;
            }
            E = E.sibling;
          }
          if (!_) throw Error(o(189));
        }
      }
      if (s.alternate !== u) throw Error(o(190));
    }
    if (s.tag !== 3) throw Error(o(188));
    return s.stateNode.current === s ? t : r;
  }
  function hf(t) {
    return t = CS(t), t !== null ? mf(t) : null;
  }
  function mf(t) {
    if (t.tag === 5 || t.tag === 6) return t;
    for (t = t.child; t !== null; ) {
      var r = mf(t);
      if (r !== null) return r;
      t = t.sibling;
    }
    return null;
  }
  var yf = n.unstable_scheduleCallback, gf = n.unstable_cancelCallback, bS = n.unstable_shouldYield, ES = n.unstable_requestPaint, Le = n.unstable_now, PS = n.unstable_getCurrentPriorityLevel, el = n.unstable_ImmediatePriority, vf = n.unstable_UserBlockingPriority, Ni = n.unstable_NormalPriority, MS = n.unstable_LowPriority, Sf = n.unstable_IdlePriority, Di = null, Wt = null;
  function RS(t) {
    if (Wt && typeof Wt.onCommitFiberRoot == "function") try {
      Wt.onCommitFiberRoot(Di, t, void 0, (t.current.flags & 128) === 128);
    } catch {
    }
  }
  var Rt = Math.clz32 ? Math.clz32 : jS, NS = Math.log, DS = Math.LN2;
  function jS(t) {
    return t >>>= 0, t === 0 ? 32 : 31 - (NS(t) / DS | 0) | 0;
  }
  var ji = 64, Ii = 4194304;
  function So(t) {
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
  function Fi(t, r) {
    var s = t.pendingLanes;
    if (s === 0) return 0;
    var u = 0, h = t.suspendedLanes, m = t.pingedLanes, _ = s & 268435455;
    if (_ !== 0) {
      var E = _ & ~h;
      E !== 0 ? u = So(E) : (m &= _, m !== 0 && (u = So(m)));
    } else _ = s & ~h, _ !== 0 ? u = So(_) : m !== 0 && (u = So(m));
    if (u === 0) return 0;
    if (r !== 0 && r !== u && (r & h) === 0 && (h = u & -u, m = r & -r, h >= m || h === 16 && (m & 4194240) !== 0)) return r;
    if ((u & 4) !== 0 && (u |= s & 16), r = t.entangledLanes, r !== 0) for (t = t.entanglements, r &= u; 0 < r; ) s = 31 - Rt(r), h = 1 << s, u |= t[s], r &= ~h;
    return u;
  }
  function IS(t, r) {
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
  function FS(t, r) {
    for (var s = t.suspendedLanes, u = t.pingedLanes, h = t.expirationTimes, m = t.pendingLanes; 0 < m; ) {
      var _ = 31 - Rt(m), E = 1 << _, M = h[_];
      M === -1 ? ((E & s) === 0 || (E & u) !== 0) && (h[_] = IS(E, r)) : M <= r && (t.expiredLanes |= E), m &= ~E;
    }
  }
  function tl(t) {
    return t = t.pendingLanes & -1073741825, t !== 0 ? t : t & 1073741824 ? 1073741824 : 0;
  }
  function wf() {
    var t = ji;
    return ji <<= 1, (ji & 4194240) === 0 && (ji = 64), t;
  }
  function nl(t) {
    for (var r = [], s = 0; 31 > s; s++) r.push(t);
    return r;
  }
  function wo(t, r, s) {
    t.pendingLanes |= r, r !== 536870912 && (t.suspendedLanes = 0, t.pingedLanes = 0), t = t.eventTimes, r = 31 - Rt(r), t[r] = s;
  }
  function OS(t, r) {
    var s = t.pendingLanes & ~r;
    t.pendingLanes = r, t.suspendedLanes = 0, t.pingedLanes = 0, t.expiredLanes &= r, t.mutableReadLanes &= r, t.entangledLanes &= r, r = t.entanglements;
    var u = t.eventTimes;
    for (t = t.expirationTimes; 0 < s; ) {
      var h = 31 - Rt(s), m = 1 << h;
      r[h] = 0, u[h] = -1, t[h] = -1, s &= ~m;
    }
  }
  function rl(t, r) {
    var s = t.entangledLanes |= r;
    for (t = t.entanglements; s; ) {
      var u = 31 - Rt(s), h = 1 << u;
      h & r | t[u] & r && (t[u] |= r), s &= ~h;
    }
  }
  var Ae = 0;
  function xf(t) {
    return t &= -t, 1 < t ? 4 < t ? (t & 268435455) !== 0 ? 16 : 536870912 : 4 : 1;
  }
  var _f, ol, kf, Tf, Af, il = !1, Oi = [], vn = null, Sn = null, wn = null, xo = /* @__PURE__ */ new Map(), _o = /* @__PURE__ */ new Map(), xn = [], LS = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
  function Cf(t, r) {
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
        xo.delete(r.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        _o.delete(r.pointerId);
    }
  }
  function ko(t, r, s, u, h, m) {
    return t === null || t.nativeEvent !== m ? (t = { blockedOn: r, domEventName: s, eventSystemFlags: u, nativeEvent: m, targetContainers: [h] }, r !== null && (r = Oo(r), r !== null && ol(r)), t) : (t.eventSystemFlags |= u, r = t.targetContainers, h !== null && r.indexOf(h) === -1 && r.push(h), t);
  }
  function VS(t, r, s, u, h) {
    switch (r) {
      case "focusin":
        return vn = ko(vn, t, r, s, u, h), !0;
      case "dragenter":
        return Sn = ko(Sn, t, r, s, u, h), !0;
      case "mouseover":
        return wn = ko(wn, t, r, s, u, h), !0;
      case "pointerover":
        var m = h.pointerId;
        return xo.set(m, ko(xo.get(m) || null, t, r, s, u, h)), !0;
      case "gotpointercapture":
        return m = h.pointerId, _o.set(m, ko(_o.get(m) || null, t, r, s, u, h)), !0;
    }
    return !1;
  }
  function bf(t) {
    var r = Xn(t.target);
    if (r !== null) {
      var s = Qn(r);
      if (s !== null) {
        if (r = s.tag, r === 13) {
          if (r = ff(s), r !== null) {
            t.blockedOn = r, Af(t.priority, function() {
              kf(s);
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
  function Li(t) {
    if (t.blockedOn !== null) return !1;
    for (var r = t.targetContainers; 0 < r.length; ) {
      var s = al(t.domEventName, t.eventSystemFlags, r[0], t.nativeEvent);
      if (s === null) {
        s = t.nativeEvent;
        var u = new s.constructor(s.type, s);
        Ya = u, s.target.dispatchEvent(u), Ya = null;
      } else return r = Oo(s), r !== null && ol(r), t.blockedOn = s, !1;
      r.shift();
    }
    return !0;
  }
  function Ef(t, r, s) {
    Li(t) && s.delete(r);
  }
  function zS() {
    il = !1, vn !== null && Li(vn) && (vn = null), Sn !== null && Li(Sn) && (Sn = null), wn !== null && Li(wn) && (wn = null), xo.forEach(Ef), _o.forEach(Ef);
  }
  function To(t, r) {
    t.blockedOn === r && (t.blockedOn = null, il || (il = !0, n.unstable_scheduleCallback(n.unstable_NormalPriority, zS)));
  }
  function Ao(t) {
    function r(h) {
      return To(h, t);
    }
    if (0 < Oi.length) {
      To(Oi[0], t);
      for (var s = 1; s < Oi.length; s++) {
        var u = Oi[s];
        u.blockedOn === t && (u.blockedOn = null);
      }
    }
    for (vn !== null && To(vn, t), Sn !== null && To(Sn, t), wn !== null && To(wn, t), xo.forEach(r), _o.forEach(r), s = 0; s < xn.length; s++) u = xn[s], u.blockedOn === t && (u.blockedOn = null);
    for (; 0 < xn.length && (s = xn[0], s.blockedOn === null); ) bf(s), s.blockedOn === null && xn.shift();
  }
  var _r = D.ReactCurrentBatchConfig, Vi = !0;
  function BS(t, r, s, u) {
    var h = Ae, m = _r.transition;
    _r.transition = null;
    try {
      Ae = 1, sl(t, r, s, u);
    } finally {
      Ae = h, _r.transition = m;
    }
  }
  function US(t, r, s, u) {
    var h = Ae, m = _r.transition;
    _r.transition = null;
    try {
      Ae = 4, sl(t, r, s, u);
    } finally {
      Ae = h, _r.transition = m;
    }
  }
  function sl(t, r, s, u) {
    if (Vi) {
      var h = al(t, r, s, u);
      if (h === null) Tl(t, r, u, zi, s), Cf(t, u);
      else if (VS(h, t, r, s, u)) u.stopPropagation();
      else if (Cf(t, u), r & 4 && -1 < LS.indexOf(t)) {
        for (; h !== null; ) {
          var m = Oo(h);
          if (m !== null && _f(m), m = al(t, r, s, u), m === null && Tl(t, r, u, zi, s), m === h) break;
          h = m;
        }
        h !== null && u.stopPropagation();
      } else Tl(t, r, u, null, s);
    }
  }
  var zi = null;
  function al(t, r, s, u) {
    if (zi = null, t = Qa(u), t = Xn(t), t !== null) if (r = Qn(t), r === null) t = null;
    else if (s = r.tag, s === 13) {
      if (t = ff(r), t !== null) return t;
      t = null;
    } else if (s === 3) {
      if (r.stateNode.current.memoizedState.isDehydrated) return r.tag === 3 ? r.stateNode.containerInfo : null;
      t = null;
    } else r !== t && (t = null);
    return zi = t, null;
  }
  function Pf(t) {
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
        switch (PS()) {
          case el:
            return 1;
          case vf:
            return 4;
          case Ni:
          case MS:
            return 16;
          case Sf:
            return 536870912;
          default:
            return 16;
        }
      default:
        return 16;
    }
  }
  var _n = null, ll = null, Bi = null;
  function Mf() {
    if (Bi) return Bi;
    var t, r = ll, s = r.length, u, h = "value" in _n ? _n.value : _n.textContent, m = h.length;
    for (t = 0; t < s && r[t] === h[t]; t++) ;
    var _ = s - t;
    for (u = 1; u <= _ && r[s - u] === h[m - u]; u++) ;
    return Bi = h.slice(t, 1 < u ? 1 - u : void 0);
  }
  function Ui(t) {
    var r = t.keyCode;
    return "charCode" in t ? (t = t.charCode, t === 0 && r === 13 && (t = 13)) : t = r, t === 10 && (t = 13), 32 <= t || t === 13 ? t : 0;
  }
  function $i() {
    return !0;
  }
  function Rf() {
    return !1;
  }
  function vt(t) {
    function r(s, u, h, m, _) {
      this._reactName = s, this._targetInst = h, this.type = u, this.nativeEvent = m, this.target = _, this.currentTarget = null;
      for (var E in t) t.hasOwnProperty(E) && (s = t[E], this[E] = s ? s(m) : m[E]);
      return this.isDefaultPrevented = (m.defaultPrevented != null ? m.defaultPrevented : m.returnValue === !1) ? $i : Rf, this.isPropagationStopped = Rf, this;
    }
    return K(r.prototype, { preventDefault: function() {
      this.defaultPrevented = !0;
      var s = this.nativeEvent;
      s && (s.preventDefault ? s.preventDefault() : typeof s.returnValue != "unknown" && (s.returnValue = !1), this.isDefaultPrevented = $i);
    }, stopPropagation: function() {
      var s = this.nativeEvent;
      s && (s.stopPropagation ? s.stopPropagation() : typeof s.cancelBubble != "unknown" && (s.cancelBubble = !0), this.isPropagationStopped = $i);
    }, persist: function() {
    }, isPersistent: $i }), r;
  }
  var kr = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(t) {
    return t.timeStamp || Date.now();
  }, defaultPrevented: 0, isTrusted: 0 }, ul = vt(kr), Co = K({}, kr, { view: 0, detail: 0 }), $S = vt(Co), cl, dl, bo, Hi = K({}, Co, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: pl, button: 0, buttons: 0, relatedTarget: function(t) {
    return t.relatedTarget === void 0 ? t.fromElement === t.srcElement ? t.toElement : t.fromElement : t.relatedTarget;
  }, movementX: function(t) {
    return "movementX" in t ? t.movementX : (t !== bo && (bo && t.type === "mousemove" ? (cl = t.screenX - bo.screenX, dl = t.screenY - bo.screenY) : dl = cl = 0, bo = t), cl);
  }, movementY: function(t) {
    return "movementY" in t ? t.movementY : dl;
  } }), Nf = vt(Hi), HS = K({}, Hi, { dataTransfer: 0 }), WS = vt(HS), GS = K({}, Co, { relatedTarget: 0 }), fl = vt(GS), KS = K({}, kr, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), YS = vt(KS), QS = K({}, kr, { clipboardData: function(t) {
    return "clipboardData" in t ? t.clipboardData : window.clipboardData;
  } }), XS = vt(QS), ZS = K({}, kr, { data: 0 }), Df = vt(ZS), qS = {
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
  }, JS = {
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
  }, ew = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
  function tw(t) {
    var r = this.nativeEvent;
    return r.getModifierState ? r.getModifierState(t) : (t = ew[t]) ? !!r[t] : !1;
  }
  function pl() {
    return tw;
  }
  var nw = K({}, Co, { key: function(t) {
    if (t.key) {
      var r = qS[t.key] || t.key;
      if (r !== "Unidentified") return r;
    }
    return t.type === "keypress" ? (t = Ui(t), t === 13 ? "Enter" : String.fromCharCode(t)) : t.type === "keydown" || t.type === "keyup" ? JS[t.keyCode] || "Unidentified" : "";
  }, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: pl, charCode: function(t) {
    return t.type === "keypress" ? Ui(t) : 0;
  }, keyCode: function(t) {
    return t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
  }, which: function(t) {
    return t.type === "keypress" ? Ui(t) : t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
  } }), rw = vt(nw), ow = K({}, Hi, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), jf = vt(ow), iw = K({}, Co, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: pl }), sw = vt(iw), aw = K({}, kr, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), lw = vt(aw), uw = K({}, Hi, {
    deltaX: function(t) {
      return "deltaX" in t ? t.deltaX : "wheelDeltaX" in t ? -t.wheelDeltaX : 0;
    },
    deltaY: function(t) {
      return "deltaY" in t ? t.deltaY : "wheelDeltaY" in t ? -t.wheelDeltaY : "wheelDelta" in t ? -t.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), cw = vt(uw), dw = [9, 13, 27, 32], hl = p && "CompositionEvent" in window, Eo = null;
  p && "documentMode" in document && (Eo = document.documentMode);
  var fw = p && "TextEvent" in window && !Eo, If = p && (!hl || Eo && 8 < Eo && 11 >= Eo), Ff = " ", Of = !1;
  function Lf(t, r) {
    switch (t) {
      case "keyup":
        return dw.indexOf(r.keyCode) !== -1;
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
  function Vf(t) {
    return t = t.detail, typeof t == "object" && "data" in t ? t.data : null;
  }
  var Tr = !1;
  function pw(t, r) {
    switch (t) {
      case "compositionend":
        return Vf(r);
      case "keypress":
        return r.which !== 32 ? null : (Of = !0, Ff);
      case "textInput":
        return t = r.data, t === Ff && Of ? null : t;
      default:
        return null;
    }
  }
  function hw(t, r) {
    if (Tr) return t === "compositionend" || !hl && Lf(t, r) ? (t = Mf(), Bi = ll = _n = null, Tr = !1, t) : null;
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
        return If && r.locale !== "ko" ? null : r.data;
      default:
        return null;
    }
  }
  var mw = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
  function zf(t) {
    var r = t && t.nodeName && t.nodeName.toLowerCase();
    return r === "input" ? !!mw[t.type] : r === "textarea";
  }
  function Bf(t, r, s, u) {
    af(u), r = Qi(r, "onChange"), 0 < r.length && (s = new ul("onChange", "change", null, s, u), t.push({ event: s, listeners: r }));
  }
  var Po = null, Mo = null;
  function yw(t) {
    ip(t, 0);
  }
  function Wi(t) {
    var r = Pr(t);
    if (fo(r)) return t;
  }
  function gw(t, r) {
    if (t === "change") return r;
  }
  var Uf = !1;
  if (p) {
    var ml;
    if (p) {
      var yl = "oninput" in document;
      if (!yl) {
        var $f = document.createElement("div");
        $f.setAttribute("oninput", "return;"), yl = typeof $f.oninput == "function";
      }
      ml = yl;
    } else ml = !1;
    Uf = ml && (!document.documentMode || 9 < document.documentMode);
  }
  function Hf() {
    Po && (Po.detachEvent("onpropertychange", Wf), Mo = Po = null);
  }
  function Wf(t) {
    if (t.propertyName === "value" && Wi(Mo)) {
      var r = [];
      Bf(r, Mo, t, Qa(t)), df(yw, r);
    }
  }
  function vw(t, r, s) {
    t === "focusin" ? (Hf(), Po = r, Mo = s, Po.attachEvent("onpropertychange", Wf)) : t === "focusout" && Hf();
  }
  function Sw(t) {
    if (t === "selectionchange" || t === "keyup" || t === "keydown") return Wi(Mo);
  }
  function ww(t, r) {
    if (t === "click") return Wi(r);
  }
  function xw(t, r) {
    if (t === "input" || t === "change") return Wi(r);
  }
  function _w(t, r) {
    return t === r && (t !== 0 || 1 / t === 1 / r) || t !== t && r !== r;
  }
  var Nt = typeof Object.is == "function" ? Object.is : _w;
  function Ro(t, r) {
    if (Nt(t, r)) return !0;
    if (typeof t != "object" || t === null || typeof r != "object" || r === null) return !1;
    var s = Object.keys(t), u = Object.keys(r);
    if (s.length !== u.length) return !1;
    for (u = 0; u < s.length; u++) {
      var h = s[u];
      if (!y.call(r, h) || !Nt(t[h], r[h])) return !1;
    }
    return !0;
  }
  function Gf(t) {
    for (; t && t.firstChild; ) t = t.firstChild;
    return t;
  }
  function Kf(t, r) {
    var s = Gf(t);
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
      s = Gf(s);
    }
  }
  function Yf(t, r) {
    return t && r ? t === r ? !0 : t && t.nodeType === 3 ? !1 : r && r.nodeType === 3 ? Yf(t, r.parentNode) : "contains" in t ? t.contains(r) : t.compareDocumentPosition ? !!(t.compareDocumentPosition(r) & 16) : !1 : !1;
  }
  function Qf() {
    for (var t = window, r = Yn(); r instanceof t.HTMLIFrameElement; ) {
      try {
        var s = typeof r.contentWindow.location.href == "string";
      } catch {
        s = !1;
      }
      if (s) t = r.contentWindow;
      else break;
      r = Yn(t.document);
    }
    return r;
  }
  function gl(t) {
    var r = t && t.nodeName && t.nodeName.toLowerCase();
    return r && (r === "input" && (t.type === "text" || t.type === "search" || t.type === "tel" || t.type === "url" || t.type === "password") || r === "textarea" || t.contentEditable === "true");
  }
  function kw(t) {
    var r = Qf(), s = t.focusedElem, u = t.selectionRange;
    if (r !== s && s && s.ownerDocument && Yf(s.ownerDocument.documentElement, s)) {
      if (u !== null && gl(s)) {
        if (r = u.start, t = u.end, t === void 0 && (t = r), "selectionStart" in s) s.selectionStart = r, s.selectionEnd = Math.min(t, s.value.length);
        else if (t = (r = s.ownerDocument || document) && r.defaultView || window, t.getSelection) {
          t = t.getSelection();
          var h = s.textContent.length, m = Math.min(u.start, h);
          u = u.end === void 0 ? m : Math.min(u.end, h), !t.extend && m > u && (h = u, u = m, m = h), h = Kf(s, m);
          var _ = Kf(
            s,
            u
          );
          h && _ && (t.rangeCount !== 1 || t.anchorNode !== h.node || t.anchorOffset !== h.offset || t.focusNode !== _.node || t.focusOffset !== _.offset) && (r = r.createRange(), r.setStart(h.node, h.offset), t.removeAllRanges(), m > u ? (t.addRange(r), t.extend(_.node, _.offset)) : (r.setEnd(_.node, _.offset), t.addRange(r)));
        }
      }
      for (r = [], t = s; t = t.parentNode; ) t.nodeType === 1 && r.push({ element: t, left: t.scrollLeft, top: t.scrollTop });
      for (typeof s.focus == "function" && s.focus(), s = 0; s < r.length; s++) t = r[s], t.element.scrollLeft = t.left, t.element.scrollTop = t.top;
    }
  }
  var Tw = p && "documentMode" in document && 11 >= document.documentMode, Ar = null, vl = null, No = null, Sl = !1;
  function Xf(t, r, s) {
    var u = s.window === s ? s.document : s.nodeType === 9 ? s : s.ownerDocument;
    Sl || Ar == null || Ar !== Yn(u) || (u = Ar, "selectionStart" in u && gl(u) ? u = { start: u.selectionStart, end: u.selectionEnd } : (u = (u.ownerDocument && u.ownerDocument.defaultView || window).getSelection(), u = { anchorNode: u.anchorNode, anchorOffset: u.anchorOffset, focusNode: u.focusNode, focusOffset: u.focusOffset }), No && Ro(No, u) || (No = u, u = Qi(vl, "onSelect"), 0 < u.length && (r = new ul("onSelect", "select", null, r, s), t.push({ event: r, listeners: u }), r.target = Ar)));
  }
  function Gi(t, r) {
    var s = {};
    return s[t.toLowerCase()] = r.toLowerCase(), s["Webkit" + t] = "webkit" + r, s["Moz" + t] = "moz" + r, s;
  }
  var Cr = { animationend: Gi("Animation", "AnimationEnd"), animationiteration: Gi("Animation", "AnimationIteration"), animationstart: Gi("Animation", "AnimationStart"), transitionend: Gi("Transition", "TransitionEnd") }, wl = {}, Zf = {};
  p && (Zf = document.createElement("div").style, "AnimationEvent" in window || (delete Cr.animationend.animation, delete Cr.animationiteration.animation, delete Cr.animationstart.animation), "TransitionEvent" in window || delete Cr.transitionend.transition);
  function Ki(t) {
    if (wl[t]) return wl[t];
    if (!Cr[t]) return t;
    var r = Cr[t], s;
    for (s in r) if (r.hasOwnProperty(s) && s in Zf) return wl[t] = r[s];
    return t;
  }
  var qf = Ki("animationend"), Jf = Ki("animationiteration"), ep = Ki("animationstart"), tp = Ki("transitionend"), np = /* @__PURE__ */ new Map(), rp = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
  function kn(t, r) {
    np.set(t, r), c(r, [t]);
  }
  for (var xl = 0; xl < rp.length; xl++) {
    var _l = rp[xl], Aw = _l.toLowerCase(), Cw = _l[0].toUpperCase() + _l.slice(1);
    kn(Aw, "on" + Cw);
  }
  kn(qf, "onAnimationEnd"), kn(Jf, "onAnimationIteration"), kn(ep, "onAnimationStart"), kn("dblclick", "onDoubleClick"), kn("focusin", "onFocus"), kn("focusout", "onBlur"), kn(tp, "onTransitionEnd"), d("onMouseEnter", ["mouseout", "mouseover"]), d("onMouseLeave", ["mouseout", "mouseover"]), d("onPointerEnter", ["pointerout", "pointerover"]), d("onPointerLeave", ["pointerout", "pointerover"]), c("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), c("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), c("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]), c("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), c("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), c("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
  var Do = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), bw = new Set("cancel close invalid load scroll toggle".split(" ").concat(Do));
  function op(t, r, s) {
    var u = t.type || "unknown-event";
    t.currentTarget = s, AS(u, r, void 0, t), t.currentTarget = null;
  }
  function ip(t, r) {
    r = (r & 4) !== 0;
    for (var s = 0; s < t.length; s++) {
      var u = t[s], h = u.event;
      u = u.listeners;
      e: {
        var m = void 0;
        if (r) for (var _ = u.length - 1; 0 <= _; _--) {
          var E = u[_], M = E.instance, F = E.currentTarget;
          if (E = E.listener, M !== m && h.isPropagationStopped()) break e;
          op(h, E, F), m = M;
        }
        else for (_ = 0; _ < u.length; _++) {
          if (E = u[_], M = E.instance, F = E.currentTarget, E = E.listener, M !== m && h.isPropagationStopped()) break e;
          op(h, E, F), m = M;
        }
      }
    }
    if (Ri) throw t = Ja, Ri = !1, Ja = null, t;
  }
  function Me(t, r) {
    var s = r[Ml];
    s === void 0 && (s = r[Ml] = /* @__PURE__ */ new Set());
    var u = t + "__bubble";
    s.has(u) || (sp(r, t, 2, !1), s.add(u));
  }
  function kl(t, r, s) {
    var u = 0;
    r && (u |= 4), sp(s, t, u, r);
  }
  var Yi = "_reactListening" + Math.random().toString(36).slice(2);
  function jo(t) {
    if (!t[Yi]) {
      t[Yi] = !0, i.forEach(function(s) {
        s !== "selectionchange" && (bw.has(s) || kl(s, !1, t), kl(s, !0, t));
      });
      var r = t.nodeType === 9 ? t : t.ownerDocument;
      r === null || r[Yi] || (r[Yi] = !0, kl("selectionchange", !1, r));
    }
  }
  function sp(t, r, s, u) {
    switch (Pf(r)) {
      case 1:
        var h = BS;
        break;
      case 4:
        h = US;
        break;
      default:
        h = sl;
    }
    s = h.bind(null, r, s, t), h = void 0, !qa || r !== "touchstart" && r !== "touchmove" && r !== "wheel" || (h = !0), u ? h !== void 0 ? t.addEventListener(r, s, { capture: !0, passive: h }) : t.addEventListener(r, s, !0) : h !== void 0 ? t.addEventListener(r, s, { passive: h }) : t.addEventListener(r, s, !1);
  }
  function Tl(t, r, s, u, h) {
    var m = u;
    if ((r & 1) === 0 && (r & 2) === 0 && u !== null) e: for (; ; ) {
      if (u === null) return;
      var _ = u.tag;
      if (_ === 3 || _ === 4) {
        var E = u.stateNode.containerInfo;
        if (E === h || E.nodeType === 8 && E.parentNode === h) break;
        if (_ === 4) for (_ = u.return; _ !== null; ) {
          var M = _.tag;
          if ((M === 3 || M === 4) && (M = _.stateNode.containerInfo, M === h || M.nodeType === 8 && M.parentNode === h)) return;
          _ = _.return;
        }
        for (; E !== null; ) {
          if (_ = Xn(E), _ === null) return;
          if (M = _.tag, M === 5 || M === 6) {
            u = m = _;
            continue e;
          }
          E = E.parentNode;
        }
      }
      u = u.return;
    }
    df(function() {
      var F = m, B = Qa(s), H = [];
      e: {
        var z = np.get(t);
        if (z !== void 0) {
          var ee = ul, ne = t;
          switch (t) {
            case "keypress":
              if (Ui(s) === 0) break e;
            case "keydown":
            case "keyup":
              ee = rw;
              break;
            case "focusin":
              ne = "focus", ee = fl;
              break;
            case "focusout":
              ne = "blur", ee = fl;
              break;
            case "beforeblur":
            case "afterblur":
              ee = fl;
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
              ee = Nf;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              ee = WS;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              ee = sw;
              break;
            case qf:
            case Jf:
            case ep:
              ee = YS;
              break;
            case tp:
              ee = lw;
              break;
            case "scroll":
              ee = $S;
              break;
            case "wheel":
              ee = cw;
              break;
            case "copy":
            case "cut":
            case "paste":
              ee = XS;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              ee = jf;
          }
          var oe = (r & 4) !== 0, Ve = !oe && t === "scroll", j = oe ? z !== null ? z + "Capture" : null : z;
          oe = [];
          for (var N = F, I; N !== null; ) {
            I = N;
            var Y = I.stateNode;
            if (I.tag === 5 && Y !== null && (I = Y, j !== null && (Y = yo(N, j), Y != null && oe.push(Io(N, Y, I)))), Ve) break;
            N = N.return;
          }
          0 < oe.length && (z = new ee(z, ne, null, s, B), H.push({ event: z, listeners: oe }));
        }
      }
      if ((r & 7) === 0) {
        e: {
          if (z = t === "mouseover" || t === "pointerover", ee = t === "mouseout" || t === "pointerout", z && s !== Ya && (ne = s.relatedTarget || s.fromElement) && (Xn(ne) || ne[sn])) break e;
          if ((ee || z) && (z = B.window === B ? B : (z = B.ownerDocument) ? z.defaultView || z.parentWindow : window, ee ? (ne = s.relatedTarget || s.toElement, ee = F, ne = ne ? Xn(ne) : null, ne !== null && (Ve = Qn(ne), ne !== Ve || ne.tag !== 5 && ne.tag !== 6) && (ne = null)) : (ee = null, ne = F), ee !== ne)) {
            if (oe = Nf, Y = "onMouseLeave", j = "onMouseEnter", N = "mouse", (t === "pointerout" || t === "pointerover") && (oe = jf, Y = "onPointerLeave", j = "onPointerEnter", N = "pointer"), Ve = ee == null ? z : Pr(ee), I = ne == null ? z : Pr(ne), z = new oe(Y, N + "leave", ee, s, B), z.target = Ve, z.relatedTarget = I, Y = null, Xn(B) === F && (oe = new oe(j, N + "enter", ne, s, B), oe.target = I, oe.relatedTarget = Ve, Y = oe), Ve = Y, ee && ne) t: {
              for (oe = ee, j = ne, N = 0, I = oe; I; I = br(I)) N++;
              for (I = 0, Y = j; Y; Y = br(Y)) I++;
              for (; 0 < N - I; ) oe = br(oe), N--;
              for (; 0 < I - N; ) j = br(j), I--;
              for (; N--; ) {
                if (oe === j || j !== null && oe === j.alternate) break t;
                oe = br(oe), j = br(j);
              }
              oe = null;
            }
            else oe = null;
            ee !== null && ap(H, z, ee, oe, !1), ne !== null && Ve !== null && ap(H, Ve, ne, oe, !0);
          }
        }
        e: {
          if (z = F ? Pr(F) : window, ee = z.nodeName && z.nodeName.toLowerCase(), ee === "select" || ee === "input" && z.type === "file") var ie = gw;
          else if (zf(z)) if (Uf) ie = xw;
          else {
            ie = Sw;
            var se = vw;
          }
          else (ee = z.nodeName) && ee.toLowerCase() === "input" && (z.type === "checkbox" || z.type === "radio") && (ie = ww);
          if (ie && (ie = ie(t, F))) {
            Bf(H, ie, s, B);
            break e;
          }
          se && se(t, z, F), t === "focusout" && (se = z._wrapperState) && se.controlled && z.type === "number" && $a(z, "number", z.value);
        }
        switch (se = F ? Pr(F) : window, t) {
          case "focusin":
            (zf(se) || se.contentEditable === "true") && (Ar = se, vl = F, No = null);
            break;
          case "focusout":
            No = vl = Ar = null;
            break;
          case "mousedown":
            Sl = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            Sl = !1, Xf(H, s, B);
            break;
          case "selectionchange":
            if (Tw) break;
          case "keydown":
          case "keyup":
            Xf(H, s, B);
        }
        var ae;
        if (hl) e: {
          switch (t) {
            case "compositionstart":
              var de = "onCompositionStart";
              break e;
            case "compositionend":
              de = "onCompositionEnd";
              break e;
            case "compositionupdate":
              de = "onCompositionUpdate";
              break e;
          }
          de = void 0;
        }
        else Tr ? Lf(t, s) && (de = "onCompositionEnd") : t === "keydown" && s.keyCode === 229 && (de = "onCompositionStart");
        de && (If && s.locale !== "ko" && (Tr || de !== "onCompositionStart" ? de === "onCompositionEnd" && Tr && (ae = Mf()) : (_n = B, ll = "value" in _n ? _n.value : _n.textContent, Tr = !0)), se = Qi(F, de), 0 < se.length && (de = new Df(de, t, null, s, B), H.push({ event: de, listeners: se }), ae ? de.data = ae : (ae = Vf(s), ae !== null && (de.data = ae)))), (ae = fw ? pw(t, s) : hw(t, s)) && (F = Qi(F, "onBeforeInput"), 0 < F.length && (B = new Df("onBeforeInput", "beforeinput", null, s, B), H.push({ event: B, listeners: F }), B.data = ae));
      }
      ip(H, r);
    });
  }
  function Io(t, r, s) {
    return { instance: t, listener: r, currentTarget: s };
  }
  function Qi(t, r) {
    for (var s = r + "Capture", u = []; t !== null; ) {
      var h = t, m = h.stateNode;
      h.tag === 5 && m !== null && (h = m, m = yo(t, s), m != null && u.unshift(Io(t, m, h)), m = yo(t, r), m != null && u.push(Io(t, m, h))), t = t.return;
    }
    return u;
  }
  function br(t) {
    if (t === null) return null;
    do
      t = t.return;
    while (t && t.tag !== 5);
    return t || null;
  }
  function ap(t, r, s, u, h) {
    for (var m = r._reactName, _ = []; s !== null && s !== u; ) {
      var E = s, M = E.alternate, F = E.stateNode;
      if (M !== null && M === u) break;
      E.tag === 5 && F !== null && (E = F, h ? (M = yo(s, m), M != null && _.unshift(Io(s, M, E))) : h || (M = yo(s, m), M != null && _.push(Io(s, M, E)))), s = s.return;
    }
    _.length !== 0 && t.push({ event: r, listeners: _ });
  }
  var Ew = /\r\n?/g, Pw = /\u0000|\uFFFD/g;
  function lp(t) {
    return (typeof t == "string" ? t : "" + t).replace(Ew, `
`).replace(Pw, "");
  }
  function Xi(t, r, s) {
    if (r = lp(r), lp(t) !== r && s) throw Error(o(425));
  }
  function Zi() {
  }
  var Al = null, Cl = null;
  function bl(t, r) {
    return t === "textarea" || t === "noscript" || typeof r.children == "string" || typeof r.children == "number" || typeof r.dangerouslySetInnerHTML == "object" && r.dangerouslySetInnerHTML !== null && r.dangerouslySetInnerHTML.__html != null;
  }
  var El = typeof setTimeout == "function" ? setTimeout : void 0, Mw = typeof clearTimeout == "function" ? clearTimeout : void 0, up = typeof Promise == "function" ? Promise : void 0, Rw = typeof queueMicrotask == "function" ? queueMicrotask : typeof up < "u" ? function(t) {
    return up.resolve(null).then(t).catch(Nw);
  } : El;
  function Nw(t) {
    setTimeout(function() {
      throw t;
    });
  }
  function Pl(t, r) {
    var s = r, u = 0;
    do {
      var h = s.nextSibling;
      if (t.removeChild(s), h && h.nodeType === 8) if (s = h.data, s === "/$") {
        if (u === 0) {
          t.removeChild(h), Ao(r);
          return;
        }
        u--;
      } else s !== "$" && s !== "$?" && s !== "$!" || u++;
      s = h;
    } while (s);
    Ao(r);
  }
  function Tn(t) {
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
  function cp(t) {
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
  var Er = Math.random().toString(36).slice(2), Gt = "__reactFiber$" + Er, Fo = "__reactProps$" + Er, sn = "__reactContainer$" + Er, Ml = "__reactEvents$" + Er, Dw = "__reactListeners$" + Er, jw = "__reactHandles$" + Er;
  function Xn(t) {
    var r = t[Gt];
    if (r) return r;
    for (var s = t.parentNode; s; ) {
      if (r = s[sn] || s[Gt]) {
        if (s = r.alternate, r.child !== null || s !== null && s.child !== null) for (t = cp(t); t !== null; ) {
          if (s = t[Gt]) return s;
          t = cp(t);
        }
        return r;
      }
      t = s, s = t.parentNode;
    }
    return null;
  }
  function Oo(t) {
    return t = t[Gt] || t[sn], !t || t.tag !== 5 && t.tag !== 6 && t.tag !== 13 && t.tag !== 3 ? null : t;
  }
  function Pr(t) {
    if (t.tag === 5 || t.tag === 6) return t.stateNode;
    throw Error(o(33));
  }
  function qi(t) {
    return t[Fo] || null;
  }
  var Rl = [], Mr = -1;
  function An(t) {
    return { current: t };
  }
  function Re(t) {
    0 > Mr || (t.current = Rl[Mr], Rl[Mr] = null, Mr--);
  }
  function Ee(t, r) {
    Mr++, Rl[Mr] = t.current, t.current = r;
  }
  var Cn = {}, Je = An(Cn), lt = An(!1), Zn = Cn;
  function Rr(t, r) {
    var s = t.type.contextTypes;
    if (!s) return Cn;
    var u = t.stateNode;
    if (u && u.__reactInternalMemoizedUnmaskedChildContext === r) return u.__reactInternalMemoizedMaskedChildContext;
    var h = {}, m;
    for (m in s) h[m] = r[m];
    return u && (t = t.stateNode, t.__reactInternalMemoizedUnmaskedChildContext = r, t.__reactInternalMemoizedMaskedChildContext = h), h;
  }
  function ut(t) {
    return t = t.childContextTypes, t != null;
  }
  function Ji() {
    Re(lt), Re(Je);
  }
  function dp(t, r, s) {
    if (Je.current !== Cn) throw Error(o(168));
    Ee(Je, r), Ee(lt, s);
  }
  function fp(t, r, s) {
    var u = t.stateNode;
    if (r = r.childContextTypes, typeof u.getChildContext != "function") return s;
    u = u.getChildContext();
    for (var h in u) if (!(h in r)) throw Error(o(108, W(t) || "Unknown", h));
    return K({}, s, u);
  }
  function es(t) {
    return t = (t = t.stateNode) && t.__reactInternalMemoizedMergedChildContext || Cn, Zn = Je.current, Ee(Je, t), Ee(lt, lt.current), !0;
  }
  function pp(t, r, s) {
    var u = t.stateNode;
    if (!u) throw Error(o(169));
    s ? (t = fp(t, r, Zn), u.__reactInternalMemoizedMergedChildContext = t, Re(lt), Re(Je), Ee(Je, t)) : Re(lt), Ee(lt, s);
  }
  var an = null, ts = !1, Nl = !1;
  function hp(t) {
    an === null ? an = [t] : an.push(t);
  }
  function Iw(t) {
    ts = !0, hp(t);
  }
  function bn() {
    if (!Nl && an !== null) {
      Nl = !0;
      var t = 0, r = Ae;
      try {
        var s = an;
        for (Ae = 1; t < s.length; t++) {
          var u = s[t];
          do
            u = u(!0);
          while (u !== null);
        }
        an = null, ts = !1;
      } catch (h) {
        throw an !== null && (an = an.slice(t + 1)), yf(el, bn), h;
      } finally {
        Ae = r, Nl = !1;
      }
    }
    return null;
  }
  var Nr = [], Dr = 0, ns = null, rs = 0, _t = [], kt = 0, qn = null, ln = 1, un = "";
  function Jn(t, r) {
    Nr[Dr++] = rs, Nr[Dr++] = ns, ns = t, rs = r;
  }
  function mp(t, r, s) {
    _t[kt++] = ln, _t[kt++] = un, _t[kt++] = qn, qn = t;
    var u = ln;
    t = un;
    var h = 32 - Rt(u) - 1;
    u &= ~(1 << h), s += 1;
    var m = 32 - Rt(r) + h;
    if (30 < m) {
      var _ = h - h % 5;
      m = (u & (1 << _) - 1).toString(32), u >>= _, h -= _, ln = 1 << 32 - Rt(r) + h | s << h | u, un = m + t;
    } else ln = 1 << m | s << h | u, un = t;
  }
  function Dl(t) {
    t.return !== null && (Jn(t, 1), mp(t, 1, 0));
  }
  function jl(t) {
    for (; t === ns; ) ns = Nr[--Dr], Nr[Dr] = null, rs = Nr[--Dr], Nr[Dr] = null;
    for (; t === qn; ) qn = _t[--kt], _t[kt] = null, un = _t[--kt], _t[kt] = null, ln = _t[--kt], _t[kt] = null;
  }
  var St = null, wt = null, Ne = !1, Dt = null;
  function yp(t, r) {
    var s = bt(5, null, null, 0);
    s.elementType = "DELETED", s.stateNode = r, s.return = t, r = t.deletions, r === null ? (t.deletions = [s], t.flags |= 16) : r.push(s);
  }
  function gp(t, r) {
    switch (t.tag) {
      case 5:
        var s = t.type;
        return r = r.nodeType !== 1 || s.toLowerCase() !== r.nodeName.toLowerCase() ? null : r, r !== null ? (t.stateNode = r, St = t, wt = Tn(r.firstChild), !0) : !1;
      case 6:
        return r = t.pendingProps === "" || r.nodeType !== 3 ? null : r, r !== null ? (t.stateNode = r, St = t, wt = null, !0) : !1;
      case 13:
        return r = r.nodeType !== 8 ? null : r, r !== null ? (s = qn !== null ? { id: ln, overflow: un } : null, t.memoizedState = { dehydrated: r, treeContext: s, retryLane: 1073741824 }, s = bt(18, null, null, 0), s.stateNode = r, s.return = t, t.child = s, St = t, wt = null, !0) : !1;
      default:
        return !1;
    }
  }
  function Il(t) {
    return (t.mode & 1) !== 0 && (t.flags & 128) === 0;
  }
  function Fl(t) {
    if (Ne) {
      var r = wt;
      if (r) {
        var s = r;
        if (!gp(t, r)) {
          if (Il(t)) throw Error(o(418));
          r = Tn(s.nextSibling);
          var u = St;
          r && gp(t, r) ? yp(u, s) : (t.flags = t.flags & -4097 | 2, Ne = !1, St = t);
        }
      } else {
        if (Il(t)) throw Error(o(418));
        t.flags = t.flags & -4097 | 2, Ne = !1, St = t;
      }
    }
  }
  function vp(t) {
    for (t = t.return; t !== null && t.tag !== 5 && t.tag !== 3 && t.tag !== 13; ) t = t.return;
    St = t;
  }
  function os(t) {
    if (t !== St) return !1;
    if (!Ne) return vp(t), Ne = !0, !1;
    var r;
    if ((r = t.tag !== 3) && !(r = t.tag !== 5) && (r = t.type, r = r !== "head" && r !== "body" && !bl(t.type, t.memoizedProps)), r && (r = wt)) {
      if (Il(t)) throw Sp(), Error(o(418));
      for (; r; ) yp(t, r), r = Tn(r.nextSibling);
    }
    if (vp(t), t.tag === 13) {
      if (t = t.memoizedState, t = t !== null ? t.dehydrated : null, !t) throw Error(o(317));
      e: {
        for (t = t.nextSibling, r = 0; t; ) {
          if (t.nodeType === 8) {
            var s = t.data;
            if (s === "/$") {
              if (r === 0) {
                wt = Tn(t.nextSibling);
                break e;
              }
              r--;
            } else s !== "$" && s !== "$!" && s !== "$?" || r++;
          }
          t = t.nextSibling;
        }
        wt = null;
      }
    } else wt = St ? Tn(t.stateNode.nextSibling) : null;
    return !0;
  }
  function Sp() {
    for (var t = wt; t; ) t = Tn(t.nextSibling);
  }
  function jr() {
    wt = St = null, Ne = !1;
  }
  function Ol(t) {
    Dt === null ? Dt = [t] : Dt.push(t);
  }
  var Fw = D.ReactCurrentBatchConfig;
  function Lo(t, r, s) {
    if (t = s.ref, t !== null && typeof t != "function" && typeof t != "object") {
      if (s._owner) {
        if (s = s._owner, s) {
          if (s.tag !== 1) throw Error(o(309));
          var u = s.stateNode;
        }
        if (!u) throw Error(o(147, t));
        var h = u, m = "" + t;
        return r !== null && r.ref !== null && typeof r.ref == "function" && r.ref._stringRef === m ? r.ref : (r = function(_) {
          var E = h.refs;
          _ === null ? delete E[m] : E[m] = _;
        }, r._stringRef = m, r);
      }
      if (typeof t != "string") throw Error(o(284));
      if (!s._owner) throw Error(o(290, t));
    }
    return t;
  }
  function is(t, r) {
    throw t = Object.prototype.toString.call(r), Error(o(31, t === "[object Object]" ? "object with keys {" + Object.keys(r).join(", ") + "}" : t));
  }
  function wp(t) {
    var r = t._init;
    return r(t._payload);
  }
  function xp(t) {
    function r(j, N) {
      if (t) {
        var I = j.deletions;
        I === null ? (j.deletions = [N], j.flags |= 16) : I.push(N);
      }
    }
    function s(j, N) {
      if (!t) return null;
      for (; N !== null; ) r(j, N), N = N.sibling;
      return null;
    }
    function u(j, N) {
      for (j = /* @__PURE__ */ new Map(); N !== null; ) N.key !== null ? j.set(N.key, N) : j.set(N.index, N), N = N.sibling;
      return j;
    }
    function h(j, N) {
      return j = In(j, N), j.index = 0, j.sibling = null, j;
    }
    function m(j, N, I) {
      return j.index = I, t ? (I = j.alternate, I !== null ? (I = I.index, I < N ? (j.flags |= 2, N) : I) : (j.flags |= 2, N)) : (j.flags |= 1048576, N);
    }
    function _(j) {
      return t && j.alternate === null && (j.flags |= 2), j;
    }
    function E(j, N, I, Y) {
      return N === null || N.tag !== 6 ? (N = Eu(I, j.mode, Y), N.return = j, N) : (N = h(N, I), N.return = j, N);
    }
    function M(j, N, I, Y) {
      var ie = I.type;
      return ie === Z ? B(j, N, I.props.children, Y, I.key) : N !== null && (N.elementType === ie || typeof ie == "object" && ie !== null && ie.$$typeof === ue && wp(ie) === N.type) ? (Y = h(N, I.props), Y.ref = Lo(j, N, I), Y.return = j, Y) : (Y = Ps(I.type, I.key, I.props, null, j.mode, Y), Y.ref = Lo(j, N, I), Y.return = j, Y);
    }
    function F(j, N, I, Y) {
      return N === null || N.tag !== 4 || N.stateNode.containerInfo !== I.containerInfo || N.stateNode.implementation !== I.implementation ? (N = Pu(I, j.mode, Y), N.return = j, N) : (N = h(N, I.children || []), N.return = j, N);
    }
    function B(j, N, I, Y, ie) {
      return N === null || N.tag !== 7 ? (N = ar(I, j.mode, Y, ie), N.return = j, N) : (N = h(N, I), N.return = j, N);
    }
    function H(j, N, I) {
      if (typeof N == "string" && N !== "" || typeof N == "number") return N = Eu("" + N, j.mode, I), N.return = j, N;
      if (typeof N == "object" && N !== null) {
        switch (N.$$typeof) {
          case L:
            return I = Ps(N.type, N.key, N.props, null, j.mode, I), I.ref = Lo(j, null, N), I.return = j, I;
          case X:
            return N = Pu(N, j.mode, I), N.return = j, N;
          case ue:
            var Y = N._init;
            return H(j, Y(N._payload), I);
        }
        if (po(N) || q(N)) return N = ar(N, j.mode, I, null), N.return = j, N;
        is(j, N);
      }
      return null;
    }
    function z(j, N, I, Y) {
      var ie = N !== null ? N.key : null;
      if (typeof I == "string" && I !== "" || typeof I == "number") return ie !== null ? null : E(j, N, "" + I, Y);
      if (typeof I == "object" && I !== null) {
        switch (I.$$typeof) {
          case L:
            return I.key === ie ? M(j, N, I, Y) : null;
          case X:
            return I.key === ie ? F(j, N, I, Y) : null;
          case ue:
            return ie = I._init, z(
              j,
              N,
              ie(I._payload),
              Y
            );
        }
        if (po(I) || q(I)) return ie !== null ? null : B(j, N, I, Y, null);
        is(j, I);
      }
      return null;
    }
    function ee(j, N, I, Y, ie) {
      if (typeof Y == "string" && Y !== "" || typeof Y == "number") return j = j.get(I) || null, E(N, j, "" + Y, ie);
      if (typeof Y == "object" && Y !== null) {
        switch (Y.$$typeof) {
          case L:
            return j = j.get(Y.key === null ? I : Y.key) || null, M(N, j, Y, ie);
          case X:
            return j = j.get(Y.key === null ? I : Y.key) || null, F(N, j, Y, ie);
          case ue:
            var se = Y._init;
            return ee(j, N, I, se(Y._payload), ie);
        }
        if (po(Y) || q(Y)) return j = j.get(I) || null, B(N, j, Y, ie, null);
        is(N, Y);
      }
      return null;
    }
    function ne(j, N, I, Y) {
      for (var ie = null, se = null, ae = N, de = N = 0, Ke = null; ae !== null && de < I.length; de++) {
        ae.index > de ? (Ke = ae, ae = null) : Ke = ae.sibling;
        var Te = z(j, ae, I[de], Y);
        if (Te === null) {
          ae === null && (ae = Ke);
          break;
        }
        t && ae && Te.alternate === null && r(j, ae), N = m(Te, N, de), se === null ? ie = Te : se.sibling = Te, se = Te, ae = Ke;
      }
      if (de === I.length) return s(j, ae), Ne && Jn(j, de), ie;
      if (ae === null) {
        for (; de < I.length; de++) ae = H(j, I[de], Y), ae !== null && (N = m(ae, N, de), se === null ? ie = ae : se.sibling = ae, se = ae);
        return Ne && Jn(j, de), ie;
      }
      for (ae = u(j, ae); de < I.length; de++) Ke = ee(ae, j, de, I[de], Y), Ke !== null && (t && Ke.alternate !== null && ae.delete(Ke.key === null ? de : Ke.key), N = m(Ke, N, de), se === null ? ie = Ke : se.sibling = Ke, se = Ke);
      return t && ae.forEach(function(Fn) {
        return r(j, Fn);
      }), Ne && Jn(j, de), ie;
    }
    function oe(j, N, I, Y) {
      var ie = q(I);
      if (typeof ie != "function") throw Error(o(150));
      if (I = ie.call(I), I == null) throw Error(o(151));
      for (var se = ie = null, ae = N, de = N = 0, Ke = null, Te = I.next(); ae !== null && !Te.done; de++, Te = I.next()) {
        ae.index > de ? (Ke = ae, ae = null) : Ke = ae.sibling;
        var Fn = z(j, ae, Te.value, Y);
        if (Fn === null) {
          ae === null && (ae = Ke);
          break;
        }
        t && ae && Fn.alternate === null && r(j, ae), N = m(Fn, N, de), se === null ? ie = Fn : se.sibling = Fn, se = Fn, ae = Ke;
      }
      if (Te.done) return s(
        j,
        ae
      ), Ne && Jn(j, de), ie;
      if (ae === null) {
        for (; !Te.done; de++, Te = I.next()) Te = H(j, Te.value, Y), Te !== null && (N = m(Te, N, de), se === null ? ie = Te : se.sibling = Te, se = Te);
        return Ne && Jn(j, de), ie;
      }
      for (ae = u(j, ae); !Te.done; de++, Te = I.next()) Te = ee(ae, j, de, Te.value, Y), Te !== null && (t && Te.alternate !== null && ae.delete(Te.key === null ? de : Te.key), N = m(Te, N, de), se === null ? ie = Te : se.sibling = Te, se = Te);
      return t && ae.forEach(function(m1) {
        return r(j, m1);
      }), Ne && Jn(j, de), ie;
    }
    function Ve(j, N, I, Y) {
      if (typeof I == "object" && I !== null && I.type === Z && I.key === null && (I = I.props.children), typeof I == "object" && I !== null) {
        switch (I.$$typeof) {
          case L:
            e: {
              for (var ie = I.key, se = N; se !== null; ) {
                if (se.key === ie) {
                  if (ie = I.type, ie === Z) {
                    if (se.tag === 7) {
                      s(j, se.sibling), N = h(se, I.props.children), N.return = j, j = N;
                      break e;
                    }
                  } else if (se.elementType === ie || typeof ie == "object" && ie !== null && ie.$$typeof === ue && wp(ie) === se.type) {
                    s(j, se.sibling), N = h(se, I.props), N.ref = Lo(j, se, I), N.return = j, j = N;
                    break e;
                  }
                  s(j, se);
                  break;
                } else r(j, se);
                se = se.sibling;
              }
              I.type === Z ? (N = ar(I.props.children, j.mode, Y, I.key), N.return = j, j = N) : (Y = Ps(I.type, I.key, I.props, null, j.mode, Y), Y.ref = Lo(j, N, I), Y.return = j, j = Y);
            }
            return _(j);
          case X:
            e: {
              for (se = I.key; N !== null; ) {
                if (N.key === se) if (N.tag === 4 && N.stateNode.containerInfo === I.containerInfo && N.stateNode.implementation === I.implementation) {
                  s(j, N.sibling), N = h(N, I.children || []), N.return = j, j = N;
                  break e;
                } else {
                  s(j, N);
                  break;
                }
                else r(j, N);
                N = N.sibling;
              }
              N = Pu(I, j.mode, Y), N.return = j, j = N;
            }
            return _(j);
          case ue:
            return se = I._init, Ve(j, N, se(I._payload), Y);
        }
        if (po(I)) return ne(j, N, I, Y);
        if (q(I)) return oe(j, N, I, Y);
        is(j, I);
      }
      return typeof I == "string" && I !== "" || typeof I == "number" ? (I = "" + I, N !== null && N.tag === 6 ? (s(j, N.sibling), N = h(N, I), N.return = j, j = N) : (s(j, N), N = Eu(I, j.mode, Y), N.return = j, j = N), _(j)) : s(j, N);
    }
    return Ve;
  }
  var Ir = xp(!0), _p = xp(!1), ss = An(null), as = null, Fr = null, Ll = null;
  function Vl() {
    Ll = Fr = as = null;
  }
  function zl(t) {
    var r = ss.current;
    Re(ss), t._currentValue = r;
  }
  function Bl(t, r, s) {
    for (; t !== null; ) {
      var u = t.alternate;
      if ((t.childLanes & r) !== r ? (t.childLanes |= r, u !== null && (u.childLanes |= r)) : u !== null && (u.childLanes & r) !== r && (u.childLanes |= r), t === s) break;
      t = t.return;
    }
  }
  function Or(t, r) {
    as = t, Ll = Fr = null, t = t.dependencies, t !== null && t.firstContext !== null && ((t.lanes & r) !== 0 && (ct = !0), t.firstContext = null);
  }
  function Tt(t) {
    var r = t._currentValue;
    if (Ll !== t) if (t = { context: t, memoizedValue: r, next: null }, Fr === null) {
      if (as === null) throw Error(o(308));
      Fr = t, as.dependencies = { lanes: 0, firstContext: t };
    } else Fr = Fr.next = t;
    return r;
  }
  var er = null;
  function Ul(t) {
    er === null ? er = [t] : er.push(t);
  }
  function kp(t, r, s, u) {
    var h = r.interleaved;
    return h === null ? (s.next = s, Ul(r)) : (s.next = h.next, h.next = s), r.interleaved = s, cn(t, u);
  }
  function cn(t, r) {
    t.lanes |= r;
    var s = t.alternate;
    for (s !== null && (s.lanes |= r), s = t, t = t.return; t !== null; ) t.childLanes |= r, s = t.alternate, s !== null && (s.childLanes |= r), s = t, t = t.return;
    return s.tag === 3 ? s.stateNode : null;
  }
  var En = !1;
  function $l(t) {
    t.updateQueue = { baseState: t.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
  }
  function Tp(t, r) {
    t = t.updateQueue, r.updateQueue === t && (r.updateQueue = { baseState: t.baseState, firstBaseUpdate: t.firstBaseUpdate, lastBaseUpdate: t.lastBaseUpdate, shared: t.shared, effects: t.effects });
  }
  function dn(t, r) {
    return { eventTime: t, lane: r, tag: 0, payload: null, callback: null, next: null };
  }
  function Pn(t, r, s) {
    var u = t.updateQueue;
    if (u === null) return null;
    if (u = u.shared, (_e & 2) !== 0) {
      var h = u.pending;
      return h === null ? r.next = r : (r.next = h.next, h.next = r), u.pending = r, cn(t, s);
    }
    return h = u.interleaved, h === null ? (r.next = r, Ul(u)) : (r.next = h.next, h.next = r), u.interleaved = r, cn(t, s);
  }
  function ls(t, r, s) {
    if (r = r.updateQueue, r !== null && (r = r.shared, (s & 4194240) !== 0)) {
      var u = r.lanes;
      u &= t.pendingLanes, s |= u, r.lanes = s, rl(t, s);
    }
  }
  function Ap(t, r) {
    var s = t.updateQueue, u = t.alternate;
    if (u !== null && (u = u.updateQueue, s === u)) {
      var h = null, m = null;
      if (s = s.firstBaseUpdate, s !== null) {
        do {
          var _ = { eventTime: s.eventTime, lane: s.lane, tag: s.tag, payload: s.payload, callback: s.callback, next: null };
          m === null ? h = m = _ : m = m.next = _, s = s.next;
        } while (s !== null);
        m === null ? h = m = r : m = m.next = r;
      } else h = m = r;
      s = { baseState: u.baseState, firstBaseUpdate: h, lastBaseUpdate: m, shared: u.shared, effects: u.effects }, t.updateQueue = s;
      return;
    }
    t = s.lastBaseUpdate, t === null ? s.firstBaseUpdate = r : t.next = r, s.lastBaseUpdate = r;
  }
  function us(t, r, s, u) {
    var h = t.updateQueue;
    En = !1;
    var m = h.firstBaseUpdate, _ = h.lastBaseUpdate, E = h.shared.pending;
    if (E !== null) {
      h.shared.pending = null;
      var M = E, F = M.next;
      M.next = null, _ === null ? m = F : _.next = F, _ = M;
      var B = t.alternate;
      B !== null && (B = B.updateQueue, E = B.lastBaseUpdate, E !== _ && (E === null ? B.firstBaseUpdate = F : E.next = F, B.lastBaseUpdate = M));
    }
    if (m !== null) {
      var H = h.baseState;
      _ = 0, B = F = M = null, E = m;
      do {
        var z = E.lane, ee = E.eventTime;
        if ((u & z) === z) {
          B !== null && (B = B.next = {
            eventTime: ee,
            lane: 0,
            tag: E.tag,
            payload: E.payload,
            callback: E.callback,
            next: null
          });
          e: {
            var ne = t, oe = E;
            switch (z = r, ee = s, oe.tag) {
              case 1:
                if (ne = oe.payload, typeof ne == "function") {
                  H = ne.call(ee, H, z);
                  break e;
                }
                H = ne;
                break e;
              case 3:
                ne.flags = ne.flags & -65537 | 128;
              case 0:
                if (ne = oe.payload, z = typeof ne == "function" ? ne.call(ee, H, z) : ne, z == null) break e;
                H = K({}, H, z);
                break e;
              case 2:
                En = !0;
            }
          }
          E.callback !== null && E.lane !== 0 && (t.flags |= 64, z = h.effects, z === null ? h.effects = [E] : z.push(E));
        } else ee = { eventTime: ee, lane: z, tag: E.tag, payload: E.payload, callback: E.callback, next: null }, B === null ? (F = B = ee, M = H) : B = B.next = ee, _ |= z;
        if (E = E.next, E === null) {
          if (E = h.shared.pending, E === null) break;
          z = E, E = z.next, z.next = null, h.lastBaseUpdate = z, h.shared.pending = null;
        }
      } while (!0);
      if (B === null && (M = H), h.baseState = M, h.firstBaseUpdate = F, h.lastBaseUpdate = B, r = h.shared.interleaved, r !== null) {
        h = r;
        do
          _ |= h.lane, h = h.next;
        while (h !== r);
      } else m === null && (h.shared.lanes = 0);
      rr |= _, t.lanes = _, t.memoizedState = H;
    }
  }
  function Cp(t, r, s) {
    if (t = r.effects, r.effects = null, t !== null) for (r = 0; r < t.length; r++) {
      var u = t[r], h = u.callback;
      if (h !== null) {
        if (u.callback = null, u = s, typeof h != "function") throw Error(o(191, h));
        h.call(u);
      }
    }
  }
  var Vo = {}, Kt = An(Vo), zo = An(Vo), Bo = An(Vo);
  function tr(t) {
    if (t === Vo) throw Error(o(174));
    return t;
  }
  function Hl(t, r) {
    switch (Ee(Bo, r), Ee(zo, t), Ee(Kt, Vo), t = r.nodeType, t) {
      case 9:
      case 11:
        r = (r = r.documentElement) ? r.namespaceURI : Wa(null, "");
        break;
      default:
        t = t === 8 ? r.parentNode : r, r = t.namespaceURI || null, t = t.tagName, r = Wa(r, t);
    }
    Re(Kt), Ee(Kt, r);
  }
  function Lr() {
    Re(Kt), Re(zo), Re(Bo);
  }
  function bp(t) {
    tr(Bo.current);
    var r = tr(Kt.current), s = Wa(r, t.type);
    r !== s && (Ee(zo, t), Ee(Kt, s));
  }
  function Wl(t) {
    zo.current === t && (Re(Kt), Re(zo));
  }
  var je = An(0);
  function cs(t) {
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
  var Gl = [];
  function Kl() {
    for (var t = 0; t < Gl.length; t++) Gl[t]._workInProgressVersionPrimary = null;
    Gl.length = 0;
  }
  var ds = D.ReactCurrentDispatcher, Yl = D.ReactCurrentBatchConfig, nr = 0, Ie = null, Ue = null, We = null, fs = !1, Uo = !1, $o = 0, Ow = 0;
  function et() {
    throw Error(o(321));
  }
  function Ql(t, r) {
    if (r === null) return !1;
    for (var s = 0; s < r.length && s < t.length; s++) if (!Nt(t[s], r[s])) return !1;
    return !0;
  }
  function Xl(t, r, s, u, h, m) {
    if (nr = m, Ie = r, r.memoizedState = null, r.updateQueue = null, r.lanes = 0, ds.current = t === null || t.memoizedState === null ? Bw : Uw, t = s(u, h), Uo) {
      m = 0;
      do {
        if (Uo = !1, $o = 0, 25 <= m) throw Error(o(301));
        m += 1, We = Ue = null, r.updateQueue = null, ds.current = $w, t = s(u, h);
      } while (Uo);
    }
    if (ds.current = ms, r = Ue !== null && Ue.next !== null, nr = 0, We = Ue = Ie = null, fs = !1, r) throw Error(o(300));
    return t;
  }
  function Zl() {
    var t = $o !== 0;
    return $o = 0, t;
  }
  function Yt() {
    var t = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
    return We === null ? Ie.memoizedState = We = t : We = We.next = t, We;
  }
  function At() {
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
  function Ho(t, r) {
    return typeof r == "function" ? r(t) : r;
  }
  function ql(t) {
    var r = At(), s = r.queue;
    if (s === null) throw Error(o(311));
    s.lastRenderedReducer = t;
    var u = Ue, h = u.baseQueue, m = s.pending;
    if (m !== null) {
      if (h !== null) {
        var _ = h.next;
        h.next = m.next, m.next = _;
      }
      u.baseQueue = h = m, s.pending = null;
    }
    if (h !== null) {
      m = h.next, u = u.baseState;
      var E = _ = null, M = null, F = m;
      do {
        var B = F.lane;
        if ((nr & B) === B) M !== null && (M = M.next = { lane: 0, action: F.action, hasEagerState: F.hasEagerState, eagerState: F.eagerState, next: null }), u = F.hasEagerState ? F.eagerState : t(u, F.action);
        else {
          var H = {
            lane: B,
            action: F.action,
            hasEagerState: F.hasEagerState,
            eagerState: F.eagerState,
            next: null
          };
          M === null ? (E = M = H, _ = u) : M = M.next = H, Ie.lanes |= B, rr |= B;
        }
        F = F.next;
      } while (F !== null && F !== m);
      M === null ? _ = u : M.next = E, Nt(u, r.memoizedState) || (ct = !0), r.memoizedState = u, r.baseState = _, r.baseQueue = M, s.lastRenderedState = u;
    }
    if (t = s.interleaved, t !== null) {
      h = t;
      do
        m = h.lane, Ie.lanes |= m, rr |= m, h = h.next;
      while (h !== t);
    } else h === null && (s.lanes = 0);
    return [r.memoizedState, s.dispatch];
  }
  function Jl(t) {
    var r = At(), s = r.queue;
    if (s === null) throw Error(o(311));
    s.lastRenderedReducer = t;
    var u = s.dispatch, h = s.pending, m = r.memoizedState;
    if (h !== null) {
      s.pending = null;
      var _ = h = h.next;
      do
        m = t(m, _.action), _ = _.next;
      while (_ !== h);
      Nt(m, r.memoizedState) || (ct = !0), r.memoizedState = m, r.baseQueue === null && (r.baseState = m), s.lastRenderedState = m;
    }
    return [m, u];
  }
  function Ep() {
  }
  function Pp(t, r) {
    var s = Ie, u = At(), h = r(), m = !Nt(u.memoizedState, h);
    if (m && (u.memoizedState = h, ct = !0), u = u.queue, eu(Np.bind(null, s, u, t), [t]), u.getSnapshot !== r || m || We !== null && We.memoizedState.tag & 1) {
      if (s.flags |= 2048, Wo(9, Rp.bind(null, s, u, h, r), void 0, null), Ge === null) throw Error(o(349));
      (nr & 30) !== 0 || Mp(s, r, h);
    }
    return h;
  }
  function Mp(t, r, s) {
    t.flags |= 16384, t = { getSnapshot: r, value: s }, r = Ie.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, Ie.updateQueue = r, r.stores = [t]) : (s = r.stores, s === null ? r.stores = [t] : s.push(t));
  }
  function Rp(t, r, s, u) {
    r.value = s, r.getSnapshot = u, Dp(r) && jp(t);
  }
  function Np(t, r, s) {
    return s(function() {
      Dp(r) && jp(t);
    });
  }
  function Dp(t) {
    var r = t.getSnapshot;
    t = t.value;
    try {
      var s = r();
      return !Nt(t, s);
    } catch {
      return !0;
    }
  }
  function jp(t) {
    var r = cn(t, 1);
    r !== null && Ot(r, t, 1, -1);
  }
  function Ip(t) {
    var r = Yt();
    return typeof t == "function" && (t = t()), r.memoizedState = r.baseState = t, t = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: Ho, lastRenderedState: t }, r.queue = t, t = t.dispatch = zw.bind(null, Ie, t), [r.memoizedState, t];
  }
  function Wo(t, r, s, u) {
    return t = { tag: t, create: r, destroy: s, deps: u, next: null }, r = Ie.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, Ie.updateQueue = r, r.lastEffect = t.next = t) : (s = r.lastEffect, s === null ? r.lastEffect = t.next = t : (u = s.next, s.next = t, t.next = u, r.lastEffect = t)), t;
  }
  function Fp() {
    return At().memoizedState;
  }
  function ps(t, r, s, u) {
    var h = Yt();
    Ie.flags |= t, h.memoizedState = Wo(1 | r, s, void 0, u === void 0 ? null : u);
  }
  function hs(t, r, s, u) {
    var h = At();
    u = u === void 0 ? null : u;
    var m = void 0;
    if (Ue !== null) {
      var _ = Ue.memoizedState;
      if (m = _.destroy, u !== null && Ql(u, _.deps)) {
        h.memoizedState = Wo(r, s, m, u);
        return;
      }
    }
    Ie.flags |= t, h.memoizedState = Wo(1 | r, s, m, u);
  }
  function Op(t, r) {
    return ps(8390656, 8, t, r);
  }
  function eu(t, r) {
    return hs(2048, 8, t, r);
  }
  function Lp(t, r) {
    return hs(4, 2, t, r);
  }
  function Vp(t, r) {
    return hs(4, 4, t, r);
  }
  function zp(t, r) {
    if (typeof r == "function") return t = t(), r(t), function() {
      r(null);
    };
    if (r != null) return t = t(), r.current = t, function() {
      r.current = null;
    };
  }
  function Bp(t, r, s) {
    return s = s != null ? s.concat([t]) : null, hs(4, 4, zp.bind(null, r, t), s);
  }
  function tu() {
  }
  function Up(t, r) {
    var s = At();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && Ql(r, u[1]) ? u[0] : (s.memoizedState = [t, r], t);
  }
  function $p(t, r) {
    var s = At();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && Ql(r, u[1]) ? u[0] : (t = t(), s.memoizedState = [t, r], t);
  }
  function Hp(t, r, s) {
    return (nr & 21) === 0 ? (t.baseState && (t.baseState = !1, ct = !0), t.memoizedState = s) : (Nt(s, r) || (s = wf(), Ie.lanes |= s, rr |= s, t.baseState = !0), r);
  }
  function Lw(t, r) {
    var s = Ae;
    Ae = s !== 0 && 4 > s ? s : 4, t(!0);
    var u = Yl.transition;
    Yl.transition = {};
    try {
      t(!1), r();
    } finally {
      Ae = s, Yl.transition = u;
    }
  }
  function Wp() {
    return At().memoizedState;
  }
  function Vw(t, r, s) {
    var u = Dn(t);
    if (s = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null }, Gp(t)) Kp(r, s);
    else if (s = kp(t, r, s, u), s !== null) {
      var h = ot();
      Ot(s, t, u, h), Yp(s, r, u);
    }
  }
  function zw(t, r, s) {
    var u = Dn(t), h = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null };
    if (Gp(t)) Kp(r, h);
    else {
      var m = t.alternate;
      if (t.lanes === 0 && (m === null || m.lanes === 0) && (m = r.lastRenderedReducer, m !== null)) try {
        var _ = r.lastRenderedState, E = m(_, s);
        if (h.hasEagerState = !0, h.eagerState = E, Nt(E, _)) {
          var M = r.interleaved;
          M === null ? (h.next = h, Ul(r)) : (h.next = M.next, M.next = h), r.interleaved = h;
          return;
        }
      } catch {
      } finally {
      }
      s = kp(t, r, h, u), s !== null && (h = ot(), Ot(s, t, u, h), Yp(s, r, u));
    }
  }
  function Gp(t) {
    var r = t.alternate;
    return t === Ie || r !== null && r === Ie;
  }
  function Kp(t, r) {
    Uo = fs = !0;
    var s = t.pending;
    s === null ? r.next = r : (r.next = s.next, s.next = r), t.pending = r;
  }
  function Yp(t, r, s) {
    if ((s & 4194240) !== 0) {
      var u = r.lanes;
      u &= t.pendingLanes, s |= u, r.lanes = s, rl(t, s);
    }
  }
  var ms = { readContext: Tt, useCallback: et, useContext: et, useEffect: et, useImperativeHandle: et, useInsertionEffect: et, useLayoutEffect: et, useMemo: et, useReducer: et, useRef: et, useState: et, useDebugValue: et, useDeferredValue: et, useTransition: et, useMutableSource: et, useSyncExternalStore: et, useId: et, unstable_isNewReconciler: !1 }, Bw = { readContext: Tt, useCallback: function(t, r) {
    return Yt().memoizedState = [t, r === void 0 ? null : r], t;
  }, useContext: Tt, useEffect: Op, useImperativeHandle: function(t, r, s) {
    return s = s != null ? s.concat([t]) : null, ps(
      4194308,
      4,
      zp.bind(null, r, t),
      s
    );
  }, useLayoutEffect: function(t, r) {
    return ps(4194308, 4, t, r);
  }, useInsertionEffect: function(t, r) {
    return ps(4, 2, t, r);
  }, useMemo: function(t, r) {
    var s = Yt();
    return r = r === void 0 ? null : r, t = t(), s.memoizedState = [t, r], t;
  }, useReducer: function(t, r, s) {
    var u = Yt();
    return r = s !== void 0 ? s(r) : r, u.memoizedState = u.baseState = r, t = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: t, lastRenderedState: r }, u.queue = t, t = t.dispatch = Vw.bind(null, Ie, t), [u.memoizedState, t];
  }, useRef: function(t) {
    var r = Yt();
    return t = { current: t }, r.memoizedState = t;
  }, useState: Ip, useDebugValue: tu, useDeferredValue: function(t) {
    return Yt().memoizedState = t;
  }, useTransition: function() {
    var t = Ip(!1), r = t[0];
    return t = Lw.bind(null, t[1]), Yt().memoizedState = t, [r, t];
  }, useMutableSource: function() {
  }, useSyncExternalStore: function(t, r, s) {
    var u = Ie, h = Yt();
    if (Ne) {
      if (s === void 0) throw Error(o(407));
      s = s();
    } else {
      if (s = r(), Ge === null) throw Error(o(349));
      (nr & 30) !== 0 || Mp(u, r, s);
    }
    h.memoizedState = s;
    var m = { value: s, getSnapshot: r };
    return h.queue = m, Op(Np.bind(
      null,
      u,
      m,
      t
    ), [t]), u.flags |= 2048, Wo(9, Rp.bind(null, u, m, s, r), void 0, null), s;
  }, useId: function() {
    var t = Yt(), r = Ge.identifierPrefix;
    if (Ne) {
      var s = un, u = ln;
      s = (u & ~(1 << 32 - Rt(u) - 1)).toString(32) + s, r = ":" + r + "R" + s, s = $o++, 0 < s && (r += "H" + s.toString(32)), r += ":";
    } else s = Ow++, r = ":" + r + "r" + s.toString(32) + ":";
    return t.memoizedState = r;
  }, unstable_isNewReconciler: !1 }, Uw = {
    readContext: Tt,
    useCallback: Up,
    useContext: Tt,
    useEffect: eu,
    useImperativeHandle: Bp,
    useInsertionEffect: Lp,
    useLayoutEffect: Vp,
    useMemo: $p,
    useReducer: ql,
    useRef: Fp,
    useState: function() {
      return ql(Ho);
    },
    useDebugValue: tu,
    useDeferredValue: function(t) {
      var r = At();
      return Hp(r, Ue.memoizedState, t);
    },
    useTransition: function() {
      var t = ql(Ho)[0], r = At().memoizedState;
      return [t, r];
    },
    useMutableSource: Ep,
    useSyncExternalStore: Pp,
    useId: Wp,
    unstable_isNewReconciler: !1
  }, $w = { readContext: Tt, useCallback: Up, useContext: Tt, useEffect: eu, useImperativeHandle: Bp, useInsertionEffect: Lp, useLayoutEffect: Vp, useMemo: $p, useReducer: Jl, useRef: Fp, useState: function() {
    return Jl(Ho);
  }, useDebugValue: tu, useDeferredValue: function(t) {
    var r = At();
    return Ue === null ? r.memoizedState = t : Hp(r, Ue.memoizedState, t);
  }, useTransition: function() {
    var t = Jl(Ho)[0], r = At().memoizedState;
    return [t, r];
  }, useMutableSource: Ep, useSyncExternalStore: Pp, useId: Wp, unstable_isNewReconciler: !1 };
  function jt(t, r) {
    if (t && t.defaultProps) {
      r = K({}, r), t = t.defaultProps;
      for (var s in t) r[s] === void 0 && (r[s] = t[s]);
      return r;
    }
    return r;
  }
  function nu(t, r, s, u) {
    r = t.memoizedState, s = s(u, r), s = s == null ? r : K({}, r, s), t.memoizedState = s, t.lanes === 0 && (t.updateQueue.baseState = s);
  }
  var ys = { isMounted: function(t) {
    return (t = t._reactInternals) ? Qn(t) === t : !1;
  }, enqueueSetState: function(t, r, s) {
    t = t._reactInternals;
    var u = ot(), h = Dn(t), m = dn(u, h);
    m.payload = r, s != null && (m.callback = s), r = Pn(t, m, h), r !== null && (Ot(r, t, h, u), ls(r, t, h));
  }, enqueueReplaceState: function(t, r, s) {
    t = t._reactInternals;
    var u = ot(), h = Dn(t), m = dn(u, h);
    m.tag = 1, m.payload = r, s != null && (m.callback = s), r = Pn(t, m, h), r !== null && (Ot(r, t, h, u), ls(r, t, h));
  }, enqueueForceUpdate: function(t, r) {
    t = t._reactInternals;
    var s = ot(), u = Dn(t), h = dn(s, u);
    h.tag = 2, r != null && (h.callback = r), r = Pn(t, h, u), r !== null && (Ot(r, t, u, s), ls(r, t, u));
  } };
  function Qp(t, r, s, u, h, m, _) {
    return t = t.stateNode, typeof t.shouldComponentUpdate == "function" ? t.shouldComponentUpdate(u, m, _) : r.prototype && r.prototype.isPureReactComponent ? !Ro(s, u) || !Ro(h, m) : !0;
  }
  function Xp(t, r, s) {
    var u = !1, h = Cn, m = r.contextType;
    return typeof m == "object" && m !== null ? m = Tt(m) : (h = ut(r) ? Zn : Je.current, u = r.contextTypes, m = (u = u != null) ? Rr(t, h) : Cn), r = new r(s, m), t.memoizedState = r.state !== null && r.state !== void 0 ? r.state : null, r.updater = ys, t.stateNode = r, r._reactInternals = t, u && (t = t.stateNode, t.__reactInternalMemoizedUnmaskedChildContext = h, t.__reactInternalMemoizedMaskedChildContext = m), r;
  }
  function Zp(t, r, s, u) {
    t = r.state, typeof r.componentWillReceiveProps == "function" && r.componentWillReceiveProps(s, u), typeof r.UNSAFE_componentWillReceiveProps == "function" && r.UNSAFE_componentWillReceiveProps(s, u), r.state !== t && ys.enqueueReplaceState(r, r.state, null);
  }
  function ru(t, r, s, u) {
    var h = t.stateNode;
    h.props = s, h.state = t.memoizedState, h.refs = {}, $l(t);
    var m = r.contextType;
    typeof m == "object" && m !== null ? h.context = Tt(m) : (m = ut(r) ? Zn : Je.current, h.context = Rr(t, m)), h.state = t.memoizedState, m = r.getDerivedStateFromProps, typeof m == "function" && (nu(t, r, m, s), h.state = t.memoizedState), typeof r.getDerivedStateFromProps == "function" || typeof h.getSnapshotBeforeUpdate == "function" || typeof h.UNSAFE_componentWillMount != "function" && typeof h.componentWillMount != "function" || (r = h.state, typeof h.componentWillMount == "function" && h.componentWillMount(), typeof h.UNSAFE_componentWillMount == "function" && h.UNSAFE_componentWillMount(), r !== h.state && ys.enqueueReplaceState(h, h.state, null), us(t, s, h, u), h.state = t.memoizedState), typeof h.componentDidMount == "function" && (t.flags |= 4194308);
  }
  function Vr(t, r) {
    try {
      var s = "", u = r;
      do
        s += me(u), u = u.return;
      while (u);
      var h = s;
    } catch (m) {
      h = `
Error generating stack: ` + m.message + `
` + m.stack;
    }
    return { value: t, source: r, stack: h, digest: null };
  }
  function ou(t, r, s) {
    return { value: t, source: null, stack: s ?? null, digest: r ?? null };
  }
  function iu(t, r) {
    try {
      console.error(r.value);
    } catch (s) {
      setTimeout(function() {
        throw s;
      });
    }
  }
  var Hw = typeof WeakMap == "function" ? WeakMap : Map;
  function qp(t, r, s) {
    s = dn(-1, s), s.tag = 3, s.payload = { element: null };
    var u = r.value;
    return s.callback = function() {
      ks || (ks = !0, wu = u), iu(t, r);
    }, s;
  }
  function Jp(t, r, s) {
    s = dn(-1, s), s.tag = 3;
    var u = t.type.getDerivedStateFromError;
    if (typeof u == "function") {
      var h = r.value;
      s.payload = function() {
        return u(h);
      }, s.callback = function() {
        iu(t, r);
      };
    }
    var m = t.stateNode;
    return m !== null && typeof m.componentDidCatch == "function" && (s.callback = function() {
      iu(t, r), typeof u != "function" && (Rn === null ? Rn = /* @__PURE__ */ new Set([this]) : Rn.add(this));
      var _ = r.stack;
      this.componentDidCatch(r.value, { componentStack: _ !== null ? _ : "" });
    }), s;
  }
  function eh(t, r, s) {
    var u = t.pingCache;
    if (u === null) {
      u = t.pingCache = new Hw();
      var h = /* @__PURE__ */ new Set();
      u.set(r, h);
    } else h = u.get(r), h === void 0 && (h = /* @__PURE__ */ new Set(), u.set(r, h));
    h.has(s) || (h.add(s), t = o1.bind(null, t, r, s), r.then(t, t));
  }
  function th(t) {
    do {
      var r;
      if ((r = t.tag === 13) && (r = t.memoizedState, r = r !== null ? r.dehydrated !== null : !0), r) return t;
      t = t.return;
    } while (t !== null);
    return null;
  }
  function nh(t, r, s, u, h) {
    return (t.mode & 1) === 0 ? (t === r ? t.flags |= 65536 : (t.flags |= 128, s.flags |= 131072, s.flags &= -52805, s.tag === 1 && (s.alternate === null ? s.tag = 17 : (r = dn(-1, 1), r.tag = 2, Pn(s, r, 1))), s.lanes |= 1), t) : (t.flags |= 65536, t.lanes = h, t);
  }
  var Ww = D.ReactCurrentOwner, ct = !1;
  function rt(t, r, s, u) {
    r.child = t === null ? _p(r, null, s, u) : Ir(r, t.child, s, u);
  }
  function rh(t, r, s, u, h) {
    s = s.render;
    var m = r.ref;
    return Or(r, h), u = Xl(t, r, s, u, m, h), s = Zl(), t !== null && !ct ? (r.updateQueue = t.updateQueue, r.flags &= -2053, t.lanes &= ~h, fn(t, r, h)) : (Ne && s && Dl(r), r.flags |= 1, rt(t, r, u, h), r.child);
  }
  function oh(t, r, s, u, h) {
    if (t === null) {
      var m = s.type;
      return typeof m == "function" && !bu(m) && m.defaultProps === void 0 && s.compare === null && s.defaultProps === void 0 ? (r.tag = 15, r.type = m, ih(t, r, m, u, h)) : (t = Ps(s.type, null, u, r, r.mode, h), t.ref = r.ref, t.return = r, r.child = t);
    }
    if (m = t.child, (t.lanes & h) === 0) {
      var _ = m.memoizedProps;
      if (s = s.compare, s = s !== null ? s : Ro, s(_, u) && t.ref === r.ref) return fn(t, r, h);
    }
    return r.flags |= 1, t = In(m, u), t.ref = r.ref, t.return = r, r.child = t;
  }
  function ih(t, r, s, u, h) {
    if (t !== null) {
      var m = t.memoizedProps;
      if (Ro(m, u) && t.ref === r.ref) if (ct = !1, r.pendingProps = u = m, (t.lanes & h) !== 0) (t.flags & 131072) !== 0 && (ct = !0);
      else return r.lanes = t.lanes, fn(t, r, h);
    }
    return su(t, r, s, u, h);
  }
  function sh(t, r, s) {
    var u = r.pendingProps, h = u.children, m = t !== null ? t.memoizedState : null;
    if (u.mode === "hidden") if ((r.mode & 1) === 0) r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, Ee(Br, xt), xt |= s;
    else {
      if ((s & 1073741824) === 0) return t = m !== null ? m.baseLanes | s : s, r.lanes = r.childLanes = 1073741824, r.memoizedState = { baseLanes: t, cachePool: null, transitions: null }, r.updateQueue = null, Ee(Br, xt), xt |= t, null;
      r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, u = m !== null ? m.baseLanes : s, Ee(Br, xt), xt |= u;
    }
    else m !== null ? (u = m.baseLanes | s, r.memoizedState = null) : u = s, Ee(Br, xt), xt |= u;
    return rt(t, r, h, s), r.child;
  }
  function ah(t, r) {
    var s = r.ref;
    (t === null && s !== null || t !== null && t.ref !== s) && (r.flags |= 512, r.flags |= 2097152);
  }
  function su(t, r, s, u, h) {
    var m = ut(s) ? Zn : Je.current;
    return m = Rr(r, m), Or(r, h), s = Xl(t, r, s, u, m, h), u = Zl(), t !== null && !ct ? (r.updateQueue = t.updateQueue, r.flags &= -2053, t.lanes &= ~h, fn(t, r, h)) : (Ne && u && Dl(r), r.flags |= 1, rt(t, r, s, h), r.child);
  }
  function lh(t, r, s, u, h) {
    if (ut(s)) {
      var m = !0;
      es(r);
    } else m = !1;
    if (Or(r, h), r.stateNode === null) vs(t, r), Xp(r, s, u), ru(r, s, u, h), u = !0;
    else if (t === null) {
      var _ = r.stateNode, E = r.memoizedProps;
      _.props = E;
      var M = _.context, F = s.contextType;
      typeof F == "object" && F !== null ? F = Tt(F) : (F = ut(s) ? Zn : Je.current, F = Rr(r, F));
      var B = s.getDerivedStateFromProps, H = typeof B == "function" || typeof _.getSnapshotBeforeUpdate == "function";
      H || typeof _.UNSAFE_componentWillReceiveProps != "function" && typeof _.componentWillReceiveProps != "function" || (E !== u || M !== F) && Zp(r, _, u, F), En = !1;
      var z = r.memoizedState;
      _.state = z, us(r, u, _, h), M = r.memoizedState, E !== u || z !== M || lt.current || En ? (typeof B == "function" && (nu(r, s, B, u), M = r.memoizedState), (E = En || Qp(r, s, E, u, z, M, F)) ? (H || typeof _.UNSAFE_componentWillMount != "function" && typeof _.componentWillMount != "function" || (typeof _.componentWillMount == "function" && _.componentWillMount(), typeof _.UNSAFE_componentWillMount == "function" && _.UNSAFE_componentWillMount()), typeof _.componentDidMount == "function" && (r.flags |= 4194308)) : (typeof _.componentDidMount == "function" && (r.flags |= 4194308), r.memoizedProps = u, r.memoizedState = M), _.props = u, _.state = M, _.context = F, u = E) : (typeof _.componentDidMount == "function" && (r.flags |= 4194308), u = !1);
    } else {
      _ = r.stateNode, Tp(t, r), E = r.memoizedProps, F = r.type === r.elementType ? E : jt(r.type, E), _.props = F, H = r.pendingProps, z = _.context, M = s.contextType, typeof M == "object" && M !== null ? M = Tt(M) : (M = ut(s) ? Zn : Je.current, M = Rr(r, M));
      var ee = s.getDerivedStateFromProps;
      (B = typeof ee == "function" || typeof _.getSnapshotBeforeUpdate == "function") || typeof _.UNSAFE_componentWillReceiveProps != "function" && typeof _.componentWillReceiveProps != "function" || (E !== H || z !== M) && Zp(r, _, u, M), En = !1, z = r.memoizedState, _.state = z, us(r, u, _, h);
      var ne = r.memoizedState;
      E !== H || z !== ne || lt.current || En ? (typeof ee == "function" && (nu(r, s, ee, u), ne = r.memoizedState), (F = En || Qp(r, s, F, u, z, ne, M) || !1) ? (B || typeof _.UNSAFE_componentWillUpdate != "function" && typeof _.componentWillUpdate != "function" || (typeof _.componentWillUpdate == "function" && _.componentWillUpdate(u, ne, M), typeof _.UNSAFE_componentWillUpdate == "function" && _.UNSAFE_componentWillUpdate(u, ne, M)), typeof _.componentDidUpdate == "function" && (r.flags |= 4), typeof _.getSnapshotBeforeUpdate == "function" && (r.flags |= 1024)) : (typeof _.componentDidUpdate != "function" || E === t.memoizedProps && z === t.memoizedState || (r.flags |= 4), typeof _.getSnapshotBeforeUpdate != "function" || E === t.memoizedProps && z === t.memoizedState || (r.flags |= 1024), r.memoizedProps = u, r.memoizedState = ne), _.props = u, _.state = ne, _.context = M, u = F) : (typeof _.componentDidUpdate != "function" || E === t.memoizedProps && z === t.memoizedState || (r.flags |= 4), typeof _.getSnapshotBeforeUpdate != "function" || E === t.memoizedProps && z === t.memoizedState || (r.flags |= 1024), u = !1);
    }
    return au(t, r, s, u, m, h);
  }
  function au(t, r, s, u, h, m) {
    ah(t, r);
    var _ = (r.flags & 128) !== 0;
    if (!u && !_) return h && pp(r, s, !1), fn(t, r, m);
    u = r.stateNode, Ww.current = r;
    var E = _ && typeof s.getDerivedStateFromError != "function" ? null : u.render();
    return r.flags |= 1, t !== null && _ ? (r.child = Ir(r, t.child, null, m), r.child = Ir(r, null, E, m)) : rt(t, r, E, m), r.memoizedState = u.state, h && pp(r, s, !0), r.child;
  }
  function uh(t) {
    var r = t.stateNode;
    r.pendingContext ? dp(t, r.pendingContext, r.pendingContext !== r.context) : r.context && dp(t, r.context, !1), Hl(t, r.containerInfo);
  }
  function ch(t, r, s, u, h) {
    return jr(), Ol(h), r.flags |= 256, rt(t, r, s, u), r.child;
  }
  var lu = { dehydrated: null, treeContext: null, retryLane: 0 };
  function uu(t) {
    return { baseLanes: t, cachePool: null, transitions: null };
  }
  function dh(t, r, s) {
    var u = r.pendingProps, h = je.current, m = !1, _ = (r.flags & 128) !== 0, E;
    if ((E = _) || (E = t !== null && t.memoizedState === null ? !1 : (h & 2) !== 0), E ? (m = !0, r.flags &= -129) : (t === null || t.memoizedState !== null) && (h |= 1), Ee(je, h & 1), t === null)
      return Fl(r), t = r.memoizedState, t !== null && (t = t.dehydrated, t !== null) ? ((r.mode & 1) === 0 ? r.lanes = 1 : t.data === "$!" ? r.lanes = 8 : r.lanes = 1073741824, null) : (_ = u.children, t = u.fallback, m ? (u = r.mode, m = r.child, _ = { mode: "hidden", children: _ }, (u & 1) === 0 && m !== null ? (m.childLanes = 0, m.pendingProps = _) : m = Ms(_, u, 0, null), t = ar(t, u, s, null), m.return = r, t.return = r, m.sibling = t, r.child = m, r.child.memoizedState = uu(s), r.memoizedState = lu, t) : cu(r, _));
    if (h = t.memoizedState, h !== null && (E = h.dehydrated, E !== null)) return Gw(t, r, _, u, E, h, s);
    if (m) {
      m = u.fallback, _ = r.mode, h = t.child, E = h.sibling;
      var M = { mode: "hidden", children: u.children };
      return (_ & 1) === 0 && r.child !== h ? (u = r.child, u.childLanes = 0, u.pendingProps = M, r.deletions = null) : (u = In(h, M), u.subtreeFlags = h.subtreeFlags & 14680064), E !== null ? m = In(E, m) : (m = ar(m, _, s, null), m.flags |= 2), m.return = r, u.return = r, u.sibling = m, r.child = u, u = m, m = r.child, _ = t.child.memoizedState, _ = _ === null ? uu(s) : { baseLanes: _.baseLanes | s, cachePool: null, transitions: _.transitions }, m.memoizedState = _, m.childLanes = t.childLanes & ~s, r.memoizedState = lu, u;
    }
    return m = t.child, t = m.sibling, u = In(m, { mode: "visible", children: u.children }), (r.mode & 1) === 0 && (u.lanes = s), u.return = r, u.sibling = null, t !== null && (s = r.deletions, s === null ? (r.deletions = [t], r.flags |= 16) : s.push(t)), r.child = u, r.memoizedState = null, u;
  }
  function cu(t, r) {
    return r = Ms({ mode: "visible", children: r }, t.mode, 0, null), r.return = t, t.child = r;
  }
  function gs(t, r, s, u) {
    return u !== null && Ol(u), Ir(r, t.child, null, s), t = cu(r, r.pendingProps.children), t.flags |= 2, r.memoizedState = null, t;
  }
  function Gw(t, r, s, u, h, m, _) {
    if (s)
      return r.flags & 256 ? (r.flags &= -257, u = ou(Error(o(422))), gs(t, r, _, u)) : r.memoizedState !== null ? (r.child = t.child, r.flags |= 128, null) : (m = u.fallback, h = r.mode, u = Ms({ mode: "visible", children: u.children }, h, 0, null), m = ar(m, h, _, null), m.flags |= 2, u.return = r, m.return = r, u.sibling = m, r.child = u, (r.mode & 1) !== 0 && Ir(r, t.child, null, _), r.child.memoizedState = uu(_), r.memoizedState = lu, m);
    if ((r.mode & 1) === 0) return gs(t, r, _, null);
    if (h.data === "$!") {
      if (u = h.nextSibling && h.nextSibling.dataset, u) var E = u.dgst;
      return u = E, m = Error(o(419)), u = ou(m, u, void 0), gs(t, r, _, u);
    }
    if (E = (_ & t.childLanes) !== 0, ct || E) {
      if (u = Ge, u !== null) {
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
        h = (h & (u.suspendedLanes | _)) !== 0 ? 0 : h, h !== 0 && h !== m.retryLane && (m.retryLane = h, cn(t, h), Ot(u, t, h, -1));
      }
      return Cu(), u = ou(Error(o(421))), gs(t, r, _, u);
    }
    return h.data === "$?" ? (r.flags |= 128, r.child = t.child, r = i1.bind(null, t), h._reactRetry = r, null) : (t = m.treeContext, wt = Tn(h.nextSibling), St = r, Ne = !0, Dt = null, t !== null && (_t[kt++] = ln, _t[kt++] = un, _t[kt++] = qn, ln = t.id, un = t.overflow, qn = r), r = cu(r, u.children), r.flags |= 4096, r);
  }
  function fh(t, r, s) {
    t.lanes |= r;
    var u = t.alternate;
    u !== null && (u.lanes |= r), Bl(t.return, r, s);
  }
  function du(t, r, s, u, h) {
    var m = t.memoizedState;
    m === null ? t.memoizedState = { isBackwards: r, rendering: null, renderingStartTime: 0, last: u, tail: s, tailMode: h } : (m.isBackwards = r, m.rendering = null, m.renderingStartTime = 0, m.last = u, m.tail = s, m.tailMode = h);
  }
  function ph(t, r, s) {
    var u = r.pendingProps, h = u.revealOrder, m = u.tail;
    if (rt(t, r, u.children, s), u = je.current, (u & 2) !== 0) u = u & 1 | 2, r.flags |= 128;
    else {
      if (t !== null && (t.flags & 128) !== 0) e: for (t = r.child; t !== null; ) {
        if (t.tag === 13) t.memoizedState !== null && fh(t, s, r);
        else if (t.tag === 19) fh(t, s, r);
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
        for (s = r.child, h = null; s !== null; ) t = s.alternate, t !== null && cs(t) === null && (h = s), s = s.sibling;
        s = h, s === null ? (h = r.child, r.child = null) : (h = s.sibling, s.sibling = null), du(r, !1, h, s, m);
        break;
      case "backwards":
        for (s = null, h = r.child, r.child = null; h !== null; ) {
          if (t = h.alternate, t !== null && cs(t) === null) {
            r.child = h;
            break;
          }
          t = h.sibling, h.sibling = s, s = h, h = t;
        }
        du(r, !0, s, null, m);
        break;
      case "together":
        du(r, !1, null, null, void 0);
        break;
      default:
        r.memoizedState = null;
    }
    return r.child;
  }
  function vs(t, r) {
    (r.mode & 1) === 0 && t !== null && (t.alternate = null, r.alternate = null, r.flags |= 2);
  }
  function fn(t, r, s) {
    if (t !== null && (r.dependencies = t.dependencies), rr |= r.lanes, (s & r.childLanes) === 0) return null;
    if (t !== null && r.child !== t.child) throw Error(o(153));
    if (r.child !== null) {
      for (t = r.child, s = In(t, t.pendingProps), r.child = s, s.return = r; t.sibling !== null; ) t = t.sibling, s = s.sibling = In(t, t.pendingProps), s.return = r;
      s.sibling = null;
    }
    return r.child;
  }
  function Kw(t, r, s) {
    switch (r.tag) {
      case 3:
        uh(r), jr();
        break;
      case 5:
        bp(r);
        break;
      case 1:
        ut(r.type) && es(r);
        break;
      case 4:
        Hl(r, r.stateNode.containerInfo);
        break;
      case 10:
        var u = r.type._context, h = r.memoizedProps.value;
        Ee(ss, u._currentValue), u._currentValue = h;
        break;
      case 13:
        if (u = r.memoizedState, u !== null)
          return u.dehydrated !== null ? (Ee(je, je.current & 1), r.flags |= 128, null) : (s & r.child.childLanes) !== 0 ? dh(t, r, s) : (Ee(je, je.current & 1), t = fn(t, r, s), t !== null ? t.sibling : null);
        Ee(je, je.current & 1);
        break;
      case 19:
        if (u = (s & r.childLanes) !== 0, (t.flags & 128) !== 0) {
          if (u) return ph(t, r, s);
          r.flags |= 128;
        }
        if (h = r.memoizedState, h !== null && (h.rendering = null, h.tail = null, h.lastEffect = null), Ee(je, je.current), u) break;
        return null;
      case 22:
      case 23:
        return r.lanes = 0, sh(t, r, s);
    }
    return fn(t, r, s);
  }
  var hh, fu, mh, yh;
  hh = function(t, r) {
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
  }, fu = function() {
  }, mh = function(t, r, s, u) {
    var h = t.memoizedProps;
    if (h !== u) {
      t = r.stateNode, tr(Kt.current);
      var m = null;
      switch (s) {
        case "input":
          h = Ba(t, h), u = Ba(t, u), m = [];
          break;
        case "select":
          h = K({}, h, { value: void 0 }), u = K({}, u, { value: void 0 }), m = [];
          break;
        case "textarea":
          h = Ha(t, h), u = Ha(t, u), m = [];
          break;
        default:
          typeof h.onClick != "function" && typeof u.onClick == "function" && (t.onclick = Zi);
      }
      Ga(s, u);
      var _;
      s = null;
      for (F in h) if (!u.hasOwnProperty(F) && h.hasOwnProperty(F) && h[F] != null) if (F === "style") {
        var E = h[F];
        for (_ in E) E.hasOwnProperty(_) && (s || (s = {}), s[_] = "");
      } else F !== "dangerouslySetInnerHTML" && F !== "children" && F !== "suppressContentEditableWarning" && F !== "suppressHydrationWarning" && F !== "autoFocus" && (a.hasOwnProperty(F) ? m || (m = []) : (m = m || []).push(F, null));
      for (F in u) {
        var M = u[F];
        if (E = h != null ? h[F] : void 0, u.hasOwnProperty(F) && M !== E && (M != null || E != null)) if (F === "style") if (E) {
          for (_ in E) !E.hasOwnProperty(_) || M && M.hasOwnProperty(_) || (s || (s = {}), s[_] = "");
          for (_ in M) M.hasOwnProperty(_) && E[_] !== M[_] && (s || (s = {}), s[_] = M[_]);
        } else s || (m || (m = []), m.push(
          F,
          s
        )), s = M;
        else F === "dangerouslySetInnerHTML" ? (M = M ? M.__html : void 0, E = E ? E.__html : void 0, M != null && E !== M && (m = m || []).push(F, M)) : F === "children" ? typeof M != "string" && typeof M != "number" || (m = m || []).push(F, "" + M) : F !== "suppressContentEditableWarning" && F !== "suppressHydrationWarning" && (a.hasOwnProperty(F) ? (M != null && F === "onScroll" && Me("scroll", t), m || E === M || (m = [])) : (m = m || []).push(F, M));
      }
      s && (m = m || []).push("style", s);
      var F = m;
      (r.updateQueue = F) && (r.flags |= 4);
    }
  }, yh = function(t, r, s, u) {
    s !== u && (r.flags |= 4);
  };
  function Go(t, r) {
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
  function tt(t) {
    var r = t.alternate !== null && t.alternate.child === t.child, s = 0, u = 0;
    if (r) for (var h = t.child; h !== null; ) s |= h.lanes | h.childLanes, u |= h.subtreeFlags & 14680064, u |= h.flags & 14680064, h.return = t, h = h.sibling;
    else for (h = t.child; h !== null; ) s |= h.lanes | h.childLanes, u |= h.subtreeFlags, u |= h.flags, h.return = t, h = h.sibling;
    return t.subtreeFlags |= u, t.childLanes = s, r;
  }
  function Yw(t, r, s) {
    var u = r.pendingProps;
    switch (jl(r), r.tag) {
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
        return ut(r.type) && Ji(), tt(r), null;
      case 3:
        return u = r.stateNode, Lr(), Re(lt), Re(Je), Kl(), u.pendingContext && (u.context = u.pendingContext, u.pendingContext = null), (t === null || t.child === null) && (os(r) ? r.flags |= 4 : t === null || t.memoizedState.isDehydrated && (r.flags & 256) === 0 || (r.flags |= 1024, Dt !== null && (ku(Dt), Dt = null))), fu(t, r), tt(r), null;
      case 5:
        Wl(r);
        var h = tr(Bo.current);
        if (s = r.type, t !== null && r.stateNode != null) mh(t, r, s, u, h), t.ref !== r.ref && (r.flags |= 512, r.flags |= 2097152);
        else {
          if (!u) {
            if (r.stateNode === null) throw Error(o(166));
            return tt(r), null;
          }
          if (t = tr(Kt.current), os(r)) {
            u = r.stateNode, s = r.type;
            var m = r.memoizedProps;
            switch (u[Gt] = r, u[Fo] = m, t = (r.mode & 1) !== 0, s) {
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
                for (h = 0; h < Do.length; h++) Me(Do[h], u);
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
                Qd(u, m), Me("invalid", u);
                break;
              case "select":
                u._wrapperState = { wasMultiple: !!m.multiple }, Me("invalid", u);
                break;
              case "textarea":
                qd(u, m), Me("invalid", u);
            }
            Ga(s, m), h = null;
            for (var _ in m) if (m.hasOwnProperty(_)) {
              var E = m[_];
              _ === "children" ? typeof E == "string" ? u.textContent !== E && (m.suppressHydrationWarning !== !0 && Xi(u.textContent, E, t), h = ["children", E]) : typeof E == "number" && u.textContent !== "" + E && (m.suppressHydrationWarning !== !0 && Xi(
                u.textContent,
                E,
                t
              ), h = ["children", "" + E]) : a.hasOwnProperty(_) && E != null && _ === "onScroll" && Me("scroll", u);
            }
            switch (s) {
              case "input":
                Kn(u), Zd(u, m, !0);
                break;
              case "textarea":
                Kn(u), ef(u);
                break;
              case "select":
              case "option":
                break;
              default:
                typeof m.onClick == "function" && (u.onclick = Zi);
            }
            u = h, r.updateQueue = u, u !== null && (r.flags |= 4);
          } else {
            _ = h.nodeType === 9 ? h : h.ownerDocument, t === "http://www.w3.org/1999/xhtml" && (t = tf(s)), t === "http://www.w3.org/1999/xhtml" ? s === "script" ? (t = _.createElement("div"), t.innerHTML = "<script><\/script>", t = t.removeChild(t.firstChild)) : typeof u.is == "string" ? t = _.createElement(s, { is: u.is }) : (t = _.createElement(s), s === "select" && (_ = t, u.multiple ? _.multiple = !0 : u.size && (_.size = u.size))) : t = _.createElementNS(t, s), t[Gt] = r, t[Fo] = u, hh(t, r, !1, !1), r.stateNode = t;
            e: {
              switch (_ = Ka(s, u), s) {
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
                  for (h = 0; h < Do.length; h++) Me(Do[h], t);
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
                  Qd(t, u), h = Ba(t, u), Me("invalid", t);
                  break;
                case "option":
                  h = u;
                  break;
                case "select":
                  t._wrapperState = { wasMultiple: !!u.multiple }, h = K({}, u, { value: void 0 }), Me("invalid", t);
                  break;
                case "textarea":
                  qd(t, u), h = Ha(t, u), Me("invalid", t);
                  break;
                default:
                  h = u;
              }
              Ga(s, h), E = h;
              for (m in E) if (E.hasOwnProperty(m)) {
                var M = E[m];
                m === "style" ? of(t, M) : m === "dangerouslySetInnerHTML" ? (M = M ? M.__html : void 0, M != null && nf(t, M)) : m === "children" ? typeof M == "string" ? (s !== "textarea" || M !== "") && ho(t, M) : typeof M == "number" && ho(t, "" + M) : m !== "suppressContentEditableWarning" && m !== "suppressHydrationWarning" && m !== "autoFocus" && (a.hasOwnProperty(m) ? M != null && m === "onScroll" && Me("scroll", t) : M != null && P(t, m, M, _));
              }
              switch (s) {
                case "input":
                  Kn(t), Zd(t, u, !1);
                  break;
                case "textarea":
                  Kn(t), ef(t);
                  break;
                case "option":
                  u.value != null && t.setAttribute("value", "" + pe(u.value));
                  break;
                case "select":
                  t.multiple = !!u.multiple, m = u.value, m != null ? Sr(t, !!u.multiple, m, !1) : u.defaultValue != null && Sr(
                    t,
                    !!u.multiple,
                    u.defaultValue,
                    !0
                  );
                  break;
                default:
                  typeof h.onClick == "function" && (t.onclick = Zi);
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
        if (t && r.stateNode != null) yh(t, r, t.memoizedProps, u);
        else {
          if (typeof u != "string" && r.stateNode === null) throw Error(o(166));
          if (s = tr(Bo.current), tr(Kt.current), os(r)) {
            if (u = r.stateNode, s = r.memoizedProps, u[Gt] = r, (m = u.nodeValue !== s) && (t = St, t !== null)) switch (t.tag) {
              case 3:
                Xi(u.nodeValue, s, (t.mode & 1) !== 0);
                break;
              case 5:
                t.memoizedProps.suppressHydrationWarning !== !0 && Xi(u.nodeValue, s, (t.mode & 1) !== 0);
            }
            m && (r.flags |= 4);
          } else u = (s.nodeType === 9 ? s : s.ownerDocument).createTextNode(u), u[Gt] = r, r.stateNode = u;
        }
        return tt(r), null;
      case 13:
        if (Re(je), u = r.memoizedState, t === null || t.memoizedState !== null && t.memoizedState.dehydrated !== null) {
          if (Ne && wt !== null && (r.mode & 1) !== 0 && (r.flags & 128) === 0) Sp(), jr(), r.flags |= 98560, m = !1;
          else if (m = os(r), u !== null && u.dehydrated !== null) {
            if (t === null) {
              if (!m) throw Error(o(318));
              if (m = r.memoizedState, m = m !== null ? m.dehydrated : null, !m) throw Error(o(317));
              m[Gt] = r;
            } else jr(), (r.flags & 128) === 0 && (r.memoizedState = null), r.flags |= 4;
            tt(r), m = !1;
          } else Dt !== null && (ku(Dt), Dt = null), m = !0;
          if (!m) return r.flags & 65536 ? r : null;
        }
        return (r.flags & 128) !== 0 ? (r.lanes = s, r) : (u = u !== null, u !== (t !== null && t.memoizedState !== null) && u && (r.child.flags |= 8192, (r.mode & 1) !== 0 && (t === null || (je.current & 1) !== 0 ? $e === 0 && ($e = 3) : Cu())), r.updateQueue !== null && (r.flags |= 4), tt(r), null);
      case 4:
        return Lr(), fu(t, r), t === null && jo(r.stateNode.containerInfo), tt(r), null;
      case 10:
        return zl(r.type._context), tt(r), null;
      case 17:
        return ut(r.type) && Ji(), tt(r), null;
      case 19:
        if (Re(je), m = r.memoizedState, m === null) return tt(r), null;
        if (u = (r.flags & 128) !== 0, _ = m.rendering, _ === null) if (u) Go(m, !1);
        else {
          if ($e !== 0 || t !== null && (t.flags & 128) !== 0) for (t = r.child; t !== null; ) {
            if (_ = cs(t), _ !== null) {
              for (r.flags |= 128, Go(m, !1), u = _.updateQueue, u !== null && (r.updateQueue = u, r.flags |= 4), r.subtreeFlags = 0, u = s, s = r.child; s !== null; ) m = s, t = u, m.flags &= 14680066, _ = m.alternate, _ === null ? (m.childLanes = 0, m.lanes = t, m.child = null, m.subtreeFlags = 0, m.memoizedProps = null, m.memoizedState = null, m.updateQueue = null, m.dependencies = null, m.stateNode = null) : (m.childLanes = _.childLanes, m.lanes = _.lanes, m.child = _.child, m.subtreeFlags = 0, m.deletions = null, m.memoizedProps = _.memoizedProps, m.memoizedState = _.memoizedState, m.updateQueue = _.updateQueue, m.type = _.type, t = _.dependencies, m.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }), s = s.sibling;
              return Ee(je, je.current & 1 | 2), r.child;
            }
            t = t.sibling;
          }
          m.tail !== null && Le() > Ur && (r.flags |= 128, u = !0, Go(m, !1), r.lanes = 4194304);
        }
        else {
          if (!u) if (t = cs(_), t !== null) {
            if (r.flags |= 128, u = !0, s = t.updateQueue, s !== null && (r.updateQueue = s, r.flags |= 4), Go(m, !0), m.tail === null && m.tailMode === "hidden" && !_.alternate && !Ne) return tt(r), null;
          } else 2 * Le() - m.renderingStartTime > Ur && s !== 1073741824 && (r.flags |= 128, u = !0, Go(m, !1), r.lanes = 4194304);
          m.isBackwards ? (_.sibling = r.child, r.child = _) : (s = m.last, s !== null ? s.sibling = _ : r.child = _, m.last = _);
        }
        return m.tail !== null ? (r = m.tail, m.rendering = r, m.tail = r.sibling, m.renderingStartTime = Le(), r.sibling = null, s = je.current, Ee(je, u ? s & 1 | 2 : s & 1), r) : (tt(r), null);
      case 22:
      case 23:
        return Au(), u = r.memoizedState !== null, t !== null && t.memoizedState !== null !== u && (r.flags |= 8192), u && (r.mode & 1) !== 0 ? (xt & 1073741824) !== 0 && (tt(r), r.subtreeFlags & 6 && (r.flags |= 8192)) : tt(r), null;
      case 24:
        return null;
      case 25:
        return null;
    }
    throw Error(o(156, r.tag));
  }
  function Qw(t, r) {
    switch (jl(r), r.tag) {
      case 1:
        return ut(r.type) && Ji(), t = r.flags, t & 65536 ? (r.flags = t & -65537 | 128, r) : null;
      case 3:
        return Lr(), Re(lt), Re(Je), Kl(), t = r.flags, (t & 65536) !== 0 && (t & 128) === 0 ? (r.flags = t & -65537 | 128, r) : null;
      case 5:
        return Wl(r), null;
      case 13:
        if (Re(je), t = r.memoizedState, t !== null && t.dehydrated !== null) {
          if (r.alternate === null) throw Error(o(340));
          jr();
        }
        return t = r.flags, t & 65536 ? (r.flags = t & -65537 | 128, r) : null;
      case 19:
        return Re(je), null;
      case 4:
        return Lr(), null;
      case 10:
        return zl(r.type._context), null;
      case 22:
      case 23:
        return Au(), null;
      case 24:
        return null;
      default:
        return null;
    }
  }
  var Ss = !1, nt = !1, Xw = typeof WeakSet == "function" ? WeakSet : Set, te = null;
  function zr(t, r) {
    var s = t.ref;
    if (s !== null) if (typeof s == "function") try {
      s(null);
    } catch (u) {
      Oe(t, r, u);
    }
    else s.current = null;
  }
  function pu(t, r, s) {
    try {
      s();
    } catch (u) {
      Oe(t, r, u);
    }
  }
  var gh = !1;
  function Zw(t, r) {
    if (Al = Vi, t = Qf(), gl(t)) {
      if ("selectionStart" in t) var s = { start: t.selectionStart, end: t.selectionEnd };
      else e: {
        s = (s = t.ownerDocument) && s.defaultView || window;
        var u = s.getSelection && s.getSelection();
        if (u && u.rangeCount !== 0) {
          s = u.anchorNode;
          var h = u.anchorOffset, m = u.focusNode;
          u = u.focusOffset;
          try {
            s.nodeType, m.nodeType;
          } catch {
            s = null;
            break e;
          }
          var _ = 0, E = -1, M = -1, F = 0, B = 0, H = t, z = null;
          t: for (; ; ) {
            for (var ee; H !== s || h !== 0 && H.nodeType !== 3 || (E = _ + h), H !== m || u !== 0 && H.nodeType !== 3 || (M = _ + u), H.nodeType === 3 && (_ += H.nodeValue.length), (ee = H.firstChild) !== null; )
              z = H, H = ee;
            for (; ; ) {
              if (H === t) break t;
              if (z === s && ++F === h && (E = _), z === m && ++B === u && (M = _), (ee = H.nextSibling) !== null) break;
              H = z, z = H.parentNode;
            }
            H = ee;
          }
          s = E === -1 || M === -1 ? null : { start: E, end: M };
        } else s = null;
      }
      s = s || { start: 0, end: 0 };
    } else s = null;
    for (Cl = { focusedElem: t, selectionRange: s }, Vi = !1, te = r; te !== null; ) if (r = te, t = r.child, (r.subtreeFlags & 1028) !== 0 && t !== null) t.return = r, te = t;
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
              var oe = ne.memoizedProps, Ve = ne.memoizedState, j = r.stateNode, N = j.getSnapshotBeforeUpdate(r.elementType === r.type ? oe : jt(r.type, oe), Ve);
              j.__reactInternalSnapshotBeforeUpdate = N;
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
      } catch (Y) {
        Oe(r, r.return, Y);
      }
      if (t = r.sibling, t !== null) {
        t.return = r.return, te = t;
        break;
      }
      te = r.return;
    }
    return ne = gh, gh = !1, ne;
  }
  function Ko(t, r, s) {
    var u = r.updateQueue;
    if (u = u !== null ? u.lastEffect : null, u !== null) {
      var h = u = u.next;
      do {
        if ((h.tag & t) === t) {
          var m = h.destroy;
          h.destroy = void 0, m !== void 0 && pu(r, s, m);
        }
        h = h.next;
      } while (h !== u);
    }
  }
  function ws(t, r) {
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
  function hu(t) {
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
  function vh(t) {
    var r = t.alternate;
    r !== null && (t.alternate = null, vh(r)), t.child = null, t.deletions = null, t.sibling = null, t.tag === 5 && (r = t.stateNode, r !== null && (delete r[Gt], delete r[Fo], delete r[Ml], delete r[Dw], delete r[jw])), t.stateNode = null, t.return = null, t.dependencies = null, t.memoizedProps = null, t.memoizedState = null, t.pendingProps = null, t.stateNode = null, t.updateQueue = null;
  }
  function Sh(t) {
    return t.tag === 5 || t.tag === 3 || t.tag === 4;
  }
  function wh(t) {
    e: for (; ; ) {
      for (; t.sibling === null; ) {
        if (t.return === null || Sh(t.return)) return null;
        t = t.return;
      }
      for (t.sibling.return = t.return, t = t.sibling; t.tag !== 5 && t.tag !== 6 && t.tag !== 18; ) {
        if (t.flags & 2 || t.child === null || t.tag === 4) continue e;
        t.child.return = t, t = t.child;
      }
      if (!(t.flags & 2)) return t.stateNode;
    }
  }
  function mu(t, r, s) {
    var u = t.tag;
    if (u === 5 || u === 6) t = t.stateNode, r ? s.nodeType === 8 ? s.parentNode.insertBefore(t, r) : s.insertBefore(t, r) : (s.nodeType === 8 ? (r = s.parentNode, r.insertBefore(t, s)) : (r = s, r.appendChild(t)), s = s._reactRootContainer, s != null || r.onclick !== null || (r.onclick = Zi));
    else if (u !== 4 && (t = t.child, t !== null)) for (mu(t, r, s), t = t.sibling; t !== null; ) mu(t, r, s), t = t.sibling;
  }
  function yu(t, r, s) {
    var u = t.tag;
    if (u === 5 || u === 6) t = t.stateNode, r ? s.insertBefore(t, r) : s.appendChild(t);
    else if (u !== 4 && (t = t.child, t !== null)) for (yu(t, r, s), t = t.sibling; t !== null; ) yu(t, r, s), t = t.sibling;
  }
  var Qe = null, It = !1;
  function Mn(t, r, s) {
    for (s = s.child; s !== null; ) xh(t, r, s), s = s.sibling;
  }
  function xh(t, r, s) {
    if (Wt && typeof Wt.onCommitFiberUnmount == "function") try {
      Wt.onCommitFiberUnmount(Di, s);
    } catch {
    }
    switch (s.tag) {
      case 5:
        nt || zr(s, r);
      case 6:
        var u = Qe, h = It;
        Qe = null, Mn(t, r, s), Qe = u, It = h, Qe !== null && (It ? (t = Qe, s = s.stateNode, t.nodeType === 8 ? t.parentNode.removeChild(s) : t.removeChild(s)) : Qe.removeChild(s.stateNode));
        break;
      case 18:
        Qe !== null && (It ? (t = Qe, s = s.stateNode, t.nodeType === 8 ? Pl(t.parentNode, s) : t.nodeType === 1 && Pl(t, s), Ao(t)) : Pl(Qe, s.stateNode));
        break;
      case 4:
        u = Qe, h = It, Qe = s.stateNode.containerInfo, It = !0, Mn(t, r, s), Qe = u, It = h;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        if (!nt && (u = s.updateQueue, u !== null && (u = u.lastEffect, u !== null))) {
          h = u = u.next;
          do {
            var m = h, _ = m.destroy;
            m = m.tag, _ !== void 0 && ((m & 2) !== 0 || (m & 4) !== 0) && pu(s, r, _), h = h.next;
          } while (h !== u);
        }
        Mn(t, r, s);
        break;
      case 1:
        if (!nt && (zr(s, r), u = s.stateNode, typeof u.componentWillUnmount == "function")) try {
          u.props = s.memoizedProps, u.state = s.memoizedState, u.componentWillUnmount();
        } catch (E) {
          Oe(s, r, E);
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
  function _h(t) {
    var r = t.updateQueue;
    if (r !== null) {
      t.updateQueue = null;
      var s = t.stateNode;
      s === null && (s = t.stateNode = new Xw()), r.forEach(function(u) {
        var h = s1.bind(null, t, u);
        s.has(u) || (s.add(u), u.then(h, h));
      });
    }
  }
  function Ft(t, r) {
    var s = r.deletions;
    if (s !== null) for (var u = 0; u < s.length; u++) {
      var h = s[u];
      try {
        var m = t, _ = r, E = _;
        e: for (; E !== null; ) {
          switch (E.tag) {
            case 5:
              Qe = E.stateNode, It = !1;
              break e;
            case 3:
              Qe = E.stateNode.containerInfo, It = !0;
              break e;
            case 4:
              Qe = E.stateNode.containerInfo, It = !0;
              break e;
          }
          E = E.return;
        }
        if (Qe === null) throw Error(o(160));
        xh(m, _, h), Qe = null, It = !1;
        var M = h.alternate;
        M !== null && (M.return = null), h.return = null;
      } catch (F) {
        Oe(h, r, F);
      }
    }
    if (r.subtreeFlags & 12854) for (r = r.child; r !== null; ) kh(r, t), r = r.sibling;
  }
  function kh(t, r) {
    var s = t.alternate, u = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (Ft(r, t), Qt(t), u & 4) {
          try {
            Ko(3, t, t.return), ws(3, t);
          } catch (oe) {
            Oe(t, t.return, oe);
          }
          try {
            Ko(5, t, t.return);
          } catch (oe) {
            Oe(t, t.return, oe);
          }
        }
        break;
      case 1:
        Ft(r, t), Qt(t), u & 512 && s !== null && zr(s, s.return);
        break;
      case 5:
        if (Ft(r, t), Qt(t), u & 512 && s !== null && zr(s, s.return), t.flags & 32) {
          var h = t.stateNode;
          try {
            ho(h, "");
          } catch (oe) {
            Oe(t, t.return, oe);
          }
        }
        if (u & 4 && (h = t.stateNode, h != null)) {
          var m = t.memoizedProps, _ = s !== null ? s.memoizedProps : m, E = t.type, M = t.updateQueue;
          if (t.updateQueue = null, M !== null) try {
            E === "input" && m.type === "radio" && m.name != null && Xd(h, m), Ka(E, _);
            var F = Ka(E, m);
            for (_ = 0; _ < M.length; _ += 2) {
              var B = M[_], H = M[_ + 1];
              B === "style" ? of(h, H) : B === "dangerouslySetInnerHTML" ? nf(h, H) : B === "children" ? ho(h, H) : P(h, B, H, F);
            }
            switch (E) {
              case "input":
                Ua(h, m);
                break;
              case "textarea":
                Jd(h, m);
                break;
              case "select":
                var z = h._wrapperState.wasMultiple;
                h._wrapperState.wasMultiple = !!m.multiple;
                var ee = m.value;
                ee != null ? Sr(h, !!m.multiple, ee, !1) : z !== !!m.multiple && (m.defaultValue != null ? Sr(
                  h,
                  !!m.multiple,
                  m.defaultValue,
                  !0
                ) : Sr(h, !!m.multiple, m.multiple ? [] : "", !1));
            }
            h[Fo] = m;
          } catch (oe) {
            Oe(t, t.return, oe);
          }
        }
        break;
      case 6:
        if (Ft(r, t), Qt(t), u & 4) {
          if (t.stateNode === null) throw Error(o(162));
          h = t.stateNode, m = t.memoizedProps;
          try {
            h.nodeValue = m;
          } catch (oe) {
            Oe(t, t.return, oe);
          }
        }
        break;
      case 3:
        if (Ft(r, t), Qt(t), u & 4 && s !== null && s.memoizedState.isDehydrated) try {
          Ao(r.containerInfo);
        } catch (oe) {
          Oe(t, t.return, oe);
        }
        break;
      case 4:
        Ft(r, t), Qt(t);
        break;
      case 13:
        Ft(r, t), Qt(t), h = t.child, h.flags & 8192 && (m = h.memoizedState !== null, h.stateNode.isHidden = m, !m || h.alternate !== null && h.alternate.memoizedState !== null || (Su = Le())), u & 4 && _h(t);
        break;
      case 22:
        if (B = s !== null && s.memoizedState !== null, t.mode & 1 ? (nt = (F = nt) || B, Ft(r, t), nt = F) : Ft(r, t), Qt(t), u & 8192) {
          if (F = t.memoizedState !== null, (t.stateNode.isHidden = F) && !B && (t.mode & 1) !== 0) for (te = t, B = t.child; B !== null; ) {
            for (H = te = B; te !== null; ) {
              switch (z = te, ee = z.child, z.tag) {
                case 0:
                case 11:
                case 14:
                case 15:
                  Ko(4, z, z.return);
                  break;
                case 1:
                  zr(z, z.return);
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
                  zr(z, z.return);
                  break;
                case 22:
                  if (z.memoizedState !== null) {
                    Ch(H);
                    continue;
                  }
              }
              ee !== null ? (ee.return = z, te = ee) : Ch(H);
            }
            B = B.sibling;
          }
          e: for (B = null, H = t; ; ) {
            if (H.tag === 5) {
              if (B === null) {
                B = H;
                try {
                  h = H.stateNode, F ? (m = h.style, typeof m.setProperty == "function" ? m.setProperty("display", "none", "important") : m.display = "none") : (E = H.stateNode, M = H.memoizedProps.style, _ = M != null && M.hasOwnProperty("display") ? M.display : null, E.style.display = rf("display", _));
                } catch (oe) {
                  Oe(t, t.return, oe);
                }
              }
            } else if (H.tag === 6) {
              if (B === null) try {
                H.stateNode.nodeValue = F ? "" : H.memoizedProps;
              } catch (oe) {
                Oe(t, t.return, oe);
              }
            } else if ((H.tag !== 22 && H.tag !== 23 || H.memoizedState === null || H === t) && H.child !== null) {
              H.child.return = H, H = H.child;
              continue;
            }
            if (H === t) break e;
            for (; H.sibling === null; ) {
              if (H.return === null || H.return === t) break e;
              B === H && (B = null), H = H.return;
            }
            B === H && (B = null), H.sibling.return = H.return, H = H.sibling;
          }
        }
        break;
      case 19:
        Ft(r, t), Qt(t), u & 4 && _h(t);
        break;
      case 21:
        break;
      default:
        Ft(
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
            if (Sh(s)) {
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
            u.flags & 32 && (ho(h, ""), u.flags &= -33);
            var m = wh(t);
            yu(t, m, h);
            break;
          case 3:
          case 4:
            var _ = u.stateNode.containerInfo, E = wh(t);
            mu(t, E, _);
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
  function qw(t, r, s) {
    te = t, Th(t);
  }
  function Th(t, r, s) {
    for (var u = (t.mode & 1) !== 0; te !== null; ) {
      var h = te, m = h.child;
      if (h.tag === 22 && u) {
        var _ = h.memoizedState !== null || Ss;
        if (!_) {
          var E = h.alternate, M = E !== null && E.memoizedState !== null || nt;
          E = Ss;
          var F = nt;
          if (Ss = _, (nt = M) && !F) for (te = h; te !== null; ) _ = te, M = _.child, _.tag === 22 && _.memoizedState !== null ? bh(h) : M !== null ? (M.return = _, te = M) : bh(h);
          for (; m !== null; ) te = m, Th(m), m = m.sibling;
          te = h, Ss = E, nt = F;
        }
        Ah(t);
      } else (h.subtreeFlags & 8772) !== 0 && m !== null ? (m.return = h, te = m) : Ah(t);
    }
  }
  function Ah(t) {
    for (; te !== null; ) {
      var r = te;
      if ((r.flags & 8772) !== 0) {
        var s = r.alternate;
        try {
          if ((r.flags & 8772) !== 0) switch (r.tag) {
            case 0:
            case 11:
            case 15:
              nt || ws(5, r);
              break;
            case 1:
              var u = r.stateNode;
              if (r.flags & 4 && !nt) if (s === null) u.componentDidMount();
              else {
                var h = r.elementType === r.type ? s.memoizedProps : jt(r.type, s.memoizedProps);
                u.componentDidUpdate(h, s.memoizedState, u.__reactInternalSnapshotBeforeUpdate);
              }
              var m = r.updateQueue;
              m !== null && Cp(r, m, u);
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
                Cp(r, _, s);
              }
              break;
            case 5:
              var E = r.stateNode;
              if (s === null && r.flags & 4) {
                s = E;
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
                    var H = B.dehydrated;
                    H !== null && Ao(H);
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
          nt || r.flags & 512 && hu(r);
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
  function Ch(t) {
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
  function bh(t) {
    for (; te !== null; ) {
      var r = te;
      try {
        switch (r.tag) {
          case 0:
          case 11:
          case 15:
            var s = r.return;
            try {
              ws(4, r);
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
            var m = r.return;
            try {
              hu(r);
            } catch (M) {
              Oe(r, m, M);
            }
            break;
          case 5:
            var _ = r.return;
            try {
              hu(r);
            } catch (M) {
              Oe(r, _, M);
            }
        }
      } catch (M) {
        Oe(r, r.return, M);
      }
      if (r === t) {
        te = null;
        break;
      }
      var E = r.sibling;
      if (E !== null) {
        E.return = r.return, te = E;
        break;
      }
      te = r.return;
    }
  }
  var Jw = Math.ceil, xs = D.ReactCurrentDispatcher, gu = D.ReactCurrentOwner, Ct = D.ReactCurrentBatchConfig, _e = 0, Ge = null, ze = null, Xe = 0, xt = 0, Br = An(0), $e = 0, Yo = null, rr = 0, _s = 0, vu = 0, Qo = null, dt = null, Su = 0, Ur = 1 / 0, pn = null, ks = !1, wu = null, Rn = null, Ts = !1, Nn = null, As = 0, Xo = 0, xu = null, Cs = -1, bs = 0;
  function ot() {
    return (_e & 6) !== 0 ? Le() : Cs !== -1 ? Cs : Cs = Le();
  }
  function Dn(t) {
    return (t.mode & 1) === 0 ? 1 : (_e & 2) !== 0 && Xe !== 0 ? Xe & -Xe : Fw.transition !== null ? (bs === 0 && (bs = wf()), bs) : (t = Ae, t !== 0 || (t = window.event, t = t === void 0 ? 16 : Pf(t.type)), t);
  }
  function Ot(t, r, s, u) {
    if (50 < Xo) throw Xo = 0, xu = null, Error(o(185));
    wo(t, s, u), ((_e & 2) === 0 || t !== Ge) && (t === Ge && ((_e & 2) === 0 && (_s |= s), $e === 4 && jn(t, Xe)), ft(t, u), s === 1 && _e === 0 && (r.mode & 1) === 0 && (Ur = Le() + 500, ts && bn()));
  }
  function ft(t, r) {
    var s = t.callbackNode;
    FS(t, r);
    var u = Fi(t, t === Ge ? Xe : 0);
    if (u === 0) s !== null && gf(s), t.callbackNode = null, t.callbackPriority = 0;
    else if (r = u & -u, t.callbackPriority !== r) {
      if (s != null && gf(s), r === 1) t.tag === 0 ? Iw(Ph.bind(null, t)) : hp(Ph.bind(null, t)), Rw(function() {
        (_e & 6) === 0 && bn();
      }), s = null;
      else {
        switch (xf(u)) {
          case 1:
            s = el;
            break;
          case 4:
            s = vf;
            break;
          case 16:
            s = Ni;
            break;
          case 536870912:
            s = Sf;
            break;
          default:
            s = Ni;
        }
        s = Oh(s, Eh.bind(null, t));
      }
      t.callbackPriority = r, t.callbackNode = s;
    }
  }
  function Eh(t, r) {
    if (Cs = -1, bs = 0, (_e & 6) !== 0) throw Error(o(327));
    var s = t.callbackNode;
    if ($r() && t.callbackNode !== s) return null;
    var u = Fi(t, t === Ge ? Xe : 0);
    if (u === 0) return null;
    if ((u & 30) !== 0 || (u & t.expiredLanes) !== 0 || r) r = Es(t, u);
    else {
      r = u;
      var h = _e;
      _e |= 2;
      var m = Rh();
      (Ge !== t || Xe !== r) && (pn = null, Ur = Le() + 500, ir(t, r));
      do
        try {
          n1();
          break;
        } catch (E) {
          Mh(t, E);
        }
      while (!0);
      Vl(), xs.current = m, _e = h, ze !== null ? r = 0 : (Ge = null, Xe = 0, r = $e);
    }
    if (r !== 0) {
      if (r === 2 && (h = tl(t), h !== 0 && (u = h, r = _u(t, h))), r === 1) throw s = Yo, ir(t, 0), jn(t, u), ft(t, Le()), s;
      if (r === 6) jn(t, u);
      else {
        if (h = t.current.alternate, (u & 30) === 0 && !e1(h) && (r = Es(t, u), r === 2 && (m = tl(t), m !== 0 && (u = m, r = _u(t, m))), r === 1)) throw s = Yo, ir(t, 0), jn(t, u), ft(t, Le()), s;
        switch (t.finishedWork = h, t.finishedLanes = u, r) {
          case 0:
          case 1:
            throw Error(o(345));
          case 2:
            sr(t, dt, pn);
            break;
          case 3:
            if (jn(t, u), (u & 130023424) === u && (r = Su + 500 - Le(), 10 < r)) {
              if (Fi(t, 0) !== 0) break;
              if (h = t.suspendedLanes, (h & u) !== u) {
                ot(), t.pingedLanes |= t.suspendedLanes & h;
                break;
              }
              t.timeoutHandle = El(sr.bind(null, t, dt, pn), r);
              break;
            }
            sr(t, dt, pn);
            break;
          case 4:
            if (jn(t, u), (u & 4194240) === u) break;
            for (r = t.eventTimes, h = -1; 0 < u; ) {
              var _ = 31 - Rt(u);
              m = 1 << _, _ = r[_], _ > h && (h = _), u &= ~m;
            }
            if (u = h, u = Le() - u, u = (120 > u ? 120 : 480 > u ? 480 : 1080 > u ? 1080 : 1920 > u ? 1920 : 3e3 > u ? 3e3 : 4320 > u ? 4320 : 1960 * Jw(u / 1960)) - u, 10 < u) {
              t.timeoutHandle = El(sr.bind(null, t, dt, pn), u);
              break;
            }
            sr(t, dt, pn);
            break;
          case 5:
            sr(t, dt, pn);
            break;
          default:
            throw Error(o(329));
        }
      }
    }
    return ft(t, Le()), t.callbackNode === s ? Eh.bind(null, t) : null;
  }
  function _u(t, r) {
    var s = Qo;
    return t.current.memoizedState.isDehydrated && (ir(t, r).flags |= 256), t = Es(t, r), t !== 2 && (r = dt, dt = s, r !== null && ku(r)), t;
  }
  function ku(t) {
    dt === null ? dt = t : dt.push.apply(dt, t);
  }
  function e1(t) {
    for (var r = t; ; ) {
      if (r.flags & 16384) {
        var s = r.updateQueue;
        if (s !== null && (s = s.stores, s !== null)) for (var u = 0; u < s.length; u++) {
          var h = s[u], m = h.getSnapshot;
          h = h.value;
          try {
            if (!Nt(m(), h)) return !1;
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
    for (r &= ~vu, r &= ~_s, t.suspendedLanes |= r, t.pingedLanes &= ~r, t = t.expirationTimes; 0 < r; ) {
      var s = 31 - Rt(r), u = 1 << s;
      t[s] = -1, r &= ~u;
    }
  }
  function Ph(t) {
    if ((_e & 6) !== 0) throw Error(o(327));
    $r();
    var r = Fi(t, 0);
    if ((r & 1) === 0) return ft(t, Le()), null;
    var s = Es(t, r);
    if (t.tag !== 0 && s === 2) {
      var u = tl(t);
      u !== 0 && (r = u, s = _u(t, u));
    }
    if (s === 1) throw s = Yo, ir(t, 0), jn(t, r), ft(t, Le()), s;
    if (s === 6) throw Error(o(345));
    return t.finishedWork = t.current.alternate, t.finishedLanes = r, sr(t, dt, pn), ft(t, Le()), null;
  }
  function Tu(t, r) {
    var s = _e;
    _e |= 1;
    try {
      return t(r);
    } finally {
      _e = s, _e === 0 && (Ur = Le() + 500, ts && bn());
    }
  }
  function or(t) {
    Nn !== null && Nn.tag === 0 && (_e & 6) === 0 && $r();
    var r = _e;
    _e |= 1;
    var s = Ct.transition, u = Ae;
    try {
      if (Ct.transition = null, Ae = 1, t) return t();
    } finally {
      Ae = u, Ct.transition = s, _e = r, (_e & 6) === 0 && bn();
    }
  }
  function Au() {
    xt = Br.current, Re(Br);
  }
  function ir(t, r) {
    t.finishedWork = null, t.finishedLanes = 0;
    var s = t.timeoutHandle;
    if (s !== -1 && (t.timeoutHandle = -1, Mw(s)), ze !== null) for (s = ze.return; s !== null; ) {
      var u = s;
      switch (jl(u), u.tag) {
        case 1:
          u = u.type.childContextTypes, u != null && Ji();
          break;
        case 3:
          Lr(), Re(lt), Re(Je), Kl();
          break;
        case 5:
          Wl(u);
          break;
        case 4:
          Lr();
          break;
        case 13:
          Re(je);
          break;
        case 19:
          Re(je);
          break;
        case 10:
          zl(u.type._context);
          break;
        case 22:
        case 23:
          Au();
      }
      s = s.return;
    }
    if (Ge = t, ze = t = In(t.current, null), Xe = xt = r, $e = 0, Yo = null, vu = _s = rr = 0, dt = Qo = null, er !== null) {
      for (r = 0; r < er.length; r++) if (s = er[r], u = s.interleaved, u !== null) {
        s.interleaved = null;
        var h = u.next, m = s.pending;
        if (m !== null) {
          var _ = m.next;
          m.next = h, u.next = _;
        }
        s.pending = u;
      }
      er = null;
    }
    return t;
  }
  function Mh(t, r) {
    do {
      var s = ze;
      try {
        if (Vl(), ds.current = ms, fs) {
          for (var u = Ie.memoizedState; u !== null; ) {
            var h = u.queue;
            h !== null && (h.pending = null), u = u.next;
          }
          fs = !1;
        }
        if (nr = 0, We = Ue = Ie = null, Uo = !1, $o = 0, gu.current = null, s === null || s.return === null) {
          $e = 1, Yo = r, ze = null;
          break;
        }
        e: {
          var m = t, _ = s.return, E = s, M = r;
          if (r = Xe, E.flags |= 32768, M !== null && typeof M == "object" && typeof M.then == "function") {
            var F = M, B = E, H = B.tag;
            if ((B.mode & 1) === 0 && (H === 0 || H === 11 || H === 15)) {
              var z = B.alternate;
              z ? (B.updateQueue = z.updateQueue, B.memoizedState = z.memoizedState, B.lanes = z.lanes) : (B.updateQueue = null, B.memoizedState = null);
            }
            var ee = th(_);
            if (ee !== null) {
              ee.flags &= -257, nh(ee, _, E, m, r), ee.mode & 1 && eh(m, F, r), r = ee, M = F;
              var ne = r.updateQueue;
              if (ne === null) {
                var oe = /* @__PURE__ */ new Set();
                oe.add(M), r.updateQueue = oe;
              } else ne.add(M);
              break e;
            } else {
              if ((r & 1) === 0) {
                eh(m, F, r), Cu();
                break e;
              }
              M = Error(o(426));
            }
          } else if (Ne && E.mode & 1) {
            var Ve = th(_);
            if (Ve !== null) {
              (Ve.flags & 65536) === 0 && (Ve.flags |= 256), nh(Ve, _, E, m, r), Ol(Vr(M, E));
              break e;
            }
          }
          m = M = Vr(M, E), $e !== 4 && ($e = 2), Qo === null ? Qo = [m] : Qo.push(m), m = _;
          do {
            switch (m.tag) {
              case 3:
                m.flags |= 65536, r &= -r, m.lanes |= r;
                var j = qp(m, M, r);
                Ap(m, j);
                break e;
              case 1:
                E = M;
                var N = m.type, I = m.stateNode;
                if ((m.flags & 128) === 0 && (typeof N.getDerivedStateFromError == "function" || I !== null && typeof I.componentDidCatch == "function" && (Rn === null || !Rn.has(I)))) {
                  m.flags |= 65536, r &= -r, m.lanes |= r;
                  var Y = Jp(m, E, r);
                  Ap(m, Y);
                  break e;
                }
            }
            m = m.return;
          } while (m !== null);
        }
        Dh(s);
      } catch (ie) {
        r = ie, ze === s && s !== null && (ze = s = s.return);
        continue;
      }
      break;
    } while (!0);
  }
  function Rh() {
    var t = xs.current;
    return xs.current = ms, t === null ? ms : t;
  }
  function Cu() {
    ($e === 0 || $e === 3 || $e === 2) && ($e = 4), Ge === null || (rr & 268435455) === 0 && (_s & 268435455) === 0 || jn(Ge, Xe);
  }
  function Es(t, r) {
    var s = _e;
    _e |= 2;
    var u = Rh();
    (Ge !== t || Xe !== r) && (pn = null, ir(t, r));
    do
      try {
        t1();
        break;
      } catch (h) {
        Mh(t, h);
      }
    while (!0);
    if (Vl(), _e = s, xs.current = u, ze !== null) throw Error(o(261));
    return Ge = null, Xe = 0, $e;
  }
  function t1() {
    for (; ze !== null; ) Nh(ze);
  }
  function n1() {
    for (; ze !== null && !bS(); ) Nh(ze);
  }
  function Nh(t) {
    var r = Fh(t.alternate, t, xt);
    t.memoizedProps = t.pendingProps, r === null ? Dh(t) : ze = r, gu.current = null;
  }
  function Dh(t) {
    var r = t;
    do {
      var s = r.alternate;
      if (t = r.return, (r.flags & 32768) === 0) {
        if (s = Yw(s, r, xt), s !== null) {
          ze = s;
          return;
        }
      } else {
        if (s = Qw(s, r), s !== null) {
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
  function sr(t, r, s) {
    var u = Ae, h = Ct.transition;
    try {
      Ct.transition = null, Ae = 1, r1(t, r, s, u);
    } finally {
      Ct.transition = h, Ae = u;
    }
    return null;
  }
  function r1(t, r, s, u) {
    do
      $r();
    while (Nn !== null);
    if ((_e & 6) !== 0) throw Error(o(327));
    s = t.finishedWork;
    var h = t.finishedLanes;
    if (s === null) return null;
    if (t.finishedWork = null, t.finishedLanes = 0, s === t.current) throw Error(o(177));
    t.callbackNode = null, t.callbackPriority = 0;
    var m = s.lanes | s.childLanes;
    if (OS(t, m), t === Ge && (ze = Ge = null, Xe = 0), (s.subtreeFlags & 2064) === 0 && (s.flags & 2064) === 0 || Ts || (Ts = !0, Oh(Ni, function() {
      return $r(), null;
    })), m = (s.flags & 15990) !== 0, (s.subtreeFlags & 15990) !== 0 || m) {
      m = Ct.transition, Ct.transition = null;
      var _ = Ae;
      Ae = 1;
      var E = _e;
      _e |= 4, gu.current = null, Zw(t, s), kh(s, t), kw(Cl), Vi = !!Al, Cl = Al = null, t.current = s, qw(s), ES(), _e = E, Ae = _, Ct.transition = m;
    } else t.current = s;
    if (Ts && (Ts = !1, Nn = t, As = h), m = t.pendingLanes, m === 0 && (Rn = null), RS(s.stateNode), ft(t, Le()), r !== null) for (u = t.onRecoverableError, s = 0; s < r.length; s++) h = r[s], u(h.value, { componentStack: h.stack, digest: h.digest });
    if (ks) throw ks = !1, t = wu, wu = null, t;
    return (As & 1) !== 0 && t.tag !== 0 && $r(), m = t.pendingLanes, (m & 1) !== 0 ? t === xu ? Xo++ : (Xo = 0, xu = t) : Xo = 0, bn(), null;
  }
  function $r() {
    if (Nn !== null) {
      var t = xf(As), r = Ct.transition, s = Ae;
      try {
        if (Ct.transition = null, Ae = 16 > t ? 16 : t, Nn === null) var u = !1;
        else {
          if (t = Nn, Nn = null, As = 0, (_e & 6) !== 0) throw Error(o(331));
          var h = _e;
          for (_e |= 4, te = t.current; te !== null; ) {
            var m = te, _ = m.child;
            if ((te.flags & 16) !== 0) {
              var E = m.deletions;
              if (E !== null) {
                for (var M = 0; M < E.length; M++) {
                  var F = E[M];
                  for (te = F; te !== null; ) {
                    var B = te;
                    switch (B.tag) {
                      case 0:
                      case 11:
                      case 15:
                        Ko(8, B, m);
                    }
                    var H = B.child;
                    if (H !== null) H.return = B, te = H;
                    else for (; te !== null; ) {
                      B = te;
                      var z = B.sibling, ee = B.return;
                      if (vh(B), B === F) {
                        te = null;
                        break;
                      }
                      if (z !== null) {
                        z.return = ee, te = z;
                        break;
                      }
                      te = ee;
                    }
                  }
                }
                var ne = m.alternate;
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
                te = m;
              }
            }
            if ((m.subtreeFlags & 2064) !== 0 && _ !== null) _.return = m, te = _;
            else e: for (; te !== null; ) {
              if (m = te, (m.flags & 2048) !== 0) switch (m.tag) {
                case 0:
                case 11:
                case 15:
                  Ko(9, m, m.return);
              }
              var j = m.sibling;
              if (j !== null) {
                j.return = m.return, te = j;
                break e;
              }
              te = m.return;
            }
          }
          var N = t.current;
          for (te = N; te !== null; ) {
            _ = te;
            var I = _.child;
            if ((_.subtreeFlags & 2064) !== 0 && I !== null) I.return = _, te = I;
            else e: for (_ = N; te !== null; ) {
              if (E = te, (E.flags & 2048) !== 0) try {
                switch (E.tag) {
                  case 0:
                  case 11:
                  case 15:
                    ws(9, E);
                }
              } catch (ie) {
                Oe(E, E.return, ie);
              }
              if (E === _) {
                te = null;
                break e;
              }
              var Y = E.sibling;
              if (Y !== null) {
                Y.return = E.return, te = Y;
                break e;
              }
              te = E.return;
            }
          }
          if (_e = h, bn(), Wt && typeof Wt.onPostCommitFiberRoot == "function") try {
            Wt.onPostCommitFiberRoot(Di, t);
          } catch {
          }
          u = !0;
        }
        return u;
      } finally {
        Ae = s, Ct.transition = r;
      }
    }
    return !1;
  }
  function jh(t, r, s) {
    r = Vr(s, r), r = qp(t, r, 1), t = Pn(t, r, 1), r = ot(), t !== null && (wo(t, 1, r), ft(t, r));
  }
  function Oe(t, r, s) {
    if (t.tag === 3) jh(t, t, s);
    else for (; r !== null; ) {
      if (r.tag === 3) {
        jh(r, t, s);
        break;
      } else if (r.tag === 1) {
        var u = r.stateNode;
        if (typeof r.type.getDerivedStateFromError == "function" || typeof u.componentDidCatch == "function" && (Rn === null || !Rn.has(u))) {
          t = Vr(s, t), t = Jp(r, t, 1), r = Pn(r, t, 1), t = ot(), r !== null && (wo(r, 1, t), ft(r, t));
          break;
        }
      }
      r = r.return;
    }
  }
  function o1(t, r, s) {
    var u = t.pingCache;
    u !== null && u.delete(r), r = ot(), t.pingedLanes |= t.suspendedLanes & s, Ge === t && (Xe & s) === s && ($e === 4 || $e === 3 && (Xe & 130023424) === Xe && 500 > Le() - Su ? ir(t, 0) : vu |= s), ft(t, r);
  }
  function Ih(t, r) {
    r === 0 && ((t.mode & 1) === 0 ? r = 1 : (r = Ii, Ii <<= 1, (Ii & 130023424) === 0 && (Ii = 4194304)));
    var s = ot();
    t = cn(t, r), t !== null && (wo(t, r, s), ft(t, s));
  }
  function i1(t) {
    var r = t.memoizedState, s = 0;
    r !== null && (s = r.retryLane), Ih(t, s);
  }
  function s1(t, r) {
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
    u !== null && u.delete(r), Ih(t, s);
  }
  var Fh;
  Fh = function(t, r, s) {
    if (t !== null) if (t.memoizedProps !== r.pendingProps || lt.current) ct = !0;
    else {
      if ((t.lanes & s) === 0 && (r.flags & 128) === 0) return ct = !1, Kw(t, r, s);
      ct = (t.flags & 131072) !== 0;
    }
    else ct = !1, Ne && (r.flags & 1048576) !== 0 && mp(r, rs, r.index);
    switch (r.lanes = 0, r.tag) {
      case 2:
        var u = r.type;
        vs(t, r), t = r.pendingProps;
        var h = Rr(r, Je.current);
        Or(r, s), h = Xl(null, r, u, t, h, s);
        var m = Zl();
        return r.flags |= 1, typeof h == "object" && h !== null && typeof h.render == "function" && h.$$typeof === void 0 ? (r.tag = 1, r.memoizedState = null, r.updateQueue = null, ut(u) ? (m = !0, es(r)) : m = !1, r.memoizedState = h.state !== null && h.state !== void 0 ? h.state : null, $l(r), h.updater = ys, r.stateNode = h, h._reactInternals = r, ru(r, u, t, s), r = au(null, r, u, !0, m, s)) : (r.tag = 0, Ne && m && Dl(r), rt(null, r, h, s), r = r.child), r;
      case 16:
        u = r.elementType;
        e: {
          switch (vs(t, r), t = r.pendingProps, h = u._init, u = h(u._payload), r.type = u, h = r.tag = l1(u), t = jt(u, t), h) {
            case 0:
              r = su(null, r, u, t, s);
              break e;
            case 1:
              r = lh(null, r, u, t, s);
              break e;
            case 11:
              r = rh(null, r, u, t, s);
              break e;
            case 14:
              r = oh(null, r, u, jt(u.type, t), s);
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
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : jt(u, h), su(t, r, u, h, s);
      case 1:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : jt(u, h), lh(t, r, u, h, s);
      case 3:
        e: {
          if (uh(r), t === null) throw Error(o(387));
          u = r.pendingProps, m = r.memoizedState, h = m.element, Tp(t, r), us(r, u, null, s);
          var _ = r.memoizedState;
          if (u = _.element, m.isDehydrated) if (m = { element: u, isDehydrated: !1, cache: _.cache, pendingSuspenseBoundaries: _.pendingSuspenseBoundaries, transitions: _.transitions }, r.updateQueue.baseState = m, r.memoizedState = m, r.flags & 256) {
            h = Vr(Error(o(423)), r), r = ch(t, r, u, s, h);
            break e;
          } else if (u !== h) {
            h = Vr(Error(o(424)), r), r = ch(t, r, u, s, h);
            break e;
          } else for (wt = Tn(r.stateNode.containerInfo.firstChild), St = r, Ne = !0, Dt = null, s = _p(r, null, u, s), r.child = s; s; ) s.flags = s.flags & -3 | 4096, s = s.sibling;
          else {
            if (jr(), u === h) {
              r = fn(t, r, s);
              break e;
            }
            rt(t, r, u, s);
          }
          r = r.child;
        }
        return r;
      case 5:
        return bp(r), t === null && Fl(r), u = r.type, h = r.pendingProps, m = t !== null ? t.memoizedProps : null, _ = h.children, bl(u, h) ? _ = null : m !== null && bl(u, m) && (r.flags |= 32), ah(t, r), rt(t, r, _, s), r.child;
      case 6:
        return t === null && Fl(r), null;
      case 13:
        return dh(t, r, s);
      case 4:
        return Hl(r, r.stateNode.containerInfo), u = r.pendingProps, t === null ? r.child = Ir(r, null, u, s) : rt(t, r, u, s), r.child;
      case 11:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : jt(u, h), rh(t, r, u, h, s);
      case 7:
        return rt(t, r, r.pendingProps, s), r.child;
      case 8:
        return rt(t, r, r.pendingProps.children, s), r.child;
      case 12:
        return rt(t, r, r.pendingProps.children, s), r.child;
      case 10:
        e: {
          if (u = r.type._context, h = r.pendingProps, m = r.memoizedProps, _ = h.value, Ee(ss, u._currentValue), u._currentValue = _, m !== null) if (Nt(m.value, _)) {
            if (m.children === h.children && !lt.current) {
              r = fn(t, r, s);
              break e;
            }
          } else for (m = r.child, m !== null && (m.return = r); m !== null; ) {
            var E = m.dependencies;
            if (E !== null) {
              _ = m.child;
              for (var M = E.firstContext; M !== null; ) {
                if (M.context === u) {
                  if (m.tag === 1) {
                    M = dn(-1, s & -s), M.tag = 2;
                    var F = m.updateQueue;
                    if (F !== null) {
                      F = F.shared;
                      var B = F.pending;
                      B === null ? M.next = M : (M.next = B.next, B.next = M), F.pending = M;
                    }
                  }
                  m.lanes |= s, M = m.alternate, M !== null && (M.lanes |= s), Bl(
                    m.return,
                    s,
                    r
                  ), E.lanes |= s;
                  break;
                }
                M = M.next;
              }
            } else if (m.tag === 10) _ = m.type === r.type ? null : m.child;
            else if (m.tag === 18) {
              if (_ = m.return, _ === null) throw Error(o(341));
              _.lanes |= s, E = _.alternate, E !== null && (E.lanes |= s), Bl(_, s, r), _ = m.sibling;
            } else _ = m.child;
            if (_ !== null) _.return = m;
            else for (_ = m; _ !== null; ) {
              if (_ === r) {
                _ = null;
                break;
              }
              if (m = _.sibling, m !== null) {
                m.return = _.return, _ = m;
                break;
              }
              _ = _.return;
            }
            m = _;
          }
          rt(t, r, h.children, s), r = r.child;
        }
        return r;
      case 9:
        return h = r.type, u = r.pendingProps.children, Or(r, s), h = Tt(h), u = u(h), r.flags |= 1, rt(t, r, u, s), r.child;
      case 14:
        return u = r.type, h = jt(u, r.pendingProps), h = jt(u.type, h), oh(t, r, u, h, s);
      case 15:
        return ih(t, r, r.type, r.pendingProps, s);
      case 17:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : jt(u, h), vs(t, r), r.tag = 1, ut(u) ? (t = !0, es(r)) : t = !1, Or(r, s), Xp(r, u, h), ru(r, u, h, s), au(null, r, u, !0, t, s);
      case 19:
        return ph(t, r, s);
      case 22:
        return sh(t, r, s);
    }
    throw Error(o(156, r.tag));
  };
  function Oh(t, r) {
    return yf(t, r);
  }
  function a1(t, r, s, u) {
    this.tag = t, this.key = s, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = r, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = u, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function bt(t, r, s, u) {
    return new a1(t, r, s, u);
  }
  function bu(t) {
    return t = t.prototype, !(!t || !t.isReactComponent);
  }
  function l1(t) {
    if (typeof t == "function") return bu(t) ? 1 : 0;
    if (t != null) {
      if (t = t.$$typeof, t === ce) return 11;
      if (t === we) return 14;
    }
    return 2;
  }
  function In(t, r) {
    var s = t.alternate;
    return s === null ? (s = bt(t.tag, r, t.key, t.mode), s.elementType = t.elementType, s.type = t.type, s.stateNode = t.stateNode, s.alternate = t, t.alternate = s) : (s.pendingProps = r, s.type = t.type, s.flags = 0, s.subtreeFlags = 0, s.deletions = null), s.flags = t.flags & 14680064, s.childLanes = t.childLanes, s.lanes = t.lanes, s.child = t.child, s.memoizedProps = t.memoizedProps, s.memoizedState = t.memoizedState, s.updateQueue = t.updateQueue, r = t.dependencies, s.dependencies = r === null ? null : { lanes: r.lanes, firstContext: r.firstContext }, s.sibling = t.sibling, s.index = t.index, s.ref = t.ref, s;
  }
  function Ps(t, r, s, u, h, m) {
    var _ = 2;
    if (u = t, typeof t == "function") bu(t) && (_ = 1);
    else if (typeof t == "string") _ = 5;
    else e: switch (t) {
      case Z:
        return ar(s.children, h, m, r);
      case U:
        _ = 8, h |= 8;
        break;
      case G:
        return t = bt(12, s, r, h | 2), t.elementType = G, t.lanes = m, t;
      case ye:
        return t = bt(13, s, r, h), t.elementType = ye, t.lanes = m, t;
      case he:
        return t = bt(19, s, r, h), t.elementType = he, t.lanes = m, t;
      case ge:
        return Ms(s, h, m, r);
      default:
        if (typeof t == "object" && t !== null) switch (t.$$typeof) {
          case Q:
            _ = 10;
            break e;
          case J:
            _ = 9;
            break e;
          case ce:
            _ = 11;
            break e;
          case we:
            _ = 14;
            break e;
          case ue:
            _ = 16, u = null;
            break e;
        }
        throw Error(o(130, t == null ? t : typeof t, ""));
    }
    return r = bt(_, s, r, h), r.elementType = t, r.type = u, r.lanes = m, r;
  }
  function ar(t, r, s, u) {
    return t = bt(7, t, u, r), t.lanes = s, t;
  }
  function Ms(t, r, s, u) {
    return t = bt(22, t, u, r), t.elementType = ge, t.lanes = s, t.stateNode = { isHidden: !1 }, t;
  }
  function Eu(t, r, s) {
    return t = bt(6, t, null, r), t.lanes = s, t;
  }
  function Pu(t, r, s) {
    return r = bt(4, t.children !== null ? t.children : [], t.key, r), r.lanes = s, r.stateNode = { containerInfo: t.containerInfo, pendingChildren: null, implementation: t.implementation }, r;
  }
  function u1(t, r, s, u, h) {
    this.tag = r, this.containerInfo = t, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = nl(0), this.expirationTimes = nl(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = nl(0), this.identifierPrefix = u, this.onRecoverableError = h, this.mutableSourceEagerHydrationData = null;
  }
  function Mu(t, r, s, u, h, m, _, E, M) {
    return t = new u1(t, r, s, E, M), r === 1 ? (r = 1, m === !0 && (r |= 8)) : r = 0, m = bt(3, null, null, r), t.current = m, m.stateNode = t, m.memoizedState = { element: u, isDehydrated: s, cache: null, transitions: null, pendingSuspenseBoundaries: null }, $l(m), t;
  }
  function c1(t, r, s) {
    var u = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return { $$typeof: X, key: u == null ? null : "" + u, children: t, containerInfo: r, implementation: s };
  }
  function Lh(t) {
    if (!t) return Cn;
    t = t._reactInternals;
    e: {
      if (Qn(t) !== t || t.tag !== 1) throw Error(o(170));
      var r = t;
      do {
        switch (r.tag) {
          case 3:
            r = r.stateNode.context;
            break e;
          case 1:
            if (ut(r.type)) {
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
      if (ut(s)) return fp(t, s, r);
    }
    return r;
  }
  function Vh(t, r, s, u, h, m, _, E, M) {
    return t = Mu(s, u, !0, t, h, m, _, E, M), t.context = Lh(null), s = t.current, u = ot(), h = Dn(s), m = dn(u, h), m.callback = r ?? null, Pn(s, m, h), t.current.lanes = h, wo(t, h, u), ft(t, u), t;
  }
  function Rs(t, r, s, u) {
    var h = r.current, m = ot(), _ = Dn(h);
    return s = Lh(s), r.context === null ? r.context = s : r.pendingContext = s, r = dn(m, _), r.payload = { element: t }, u = u === void 0 ? null : u, u !== null && (r.callback = u), t = Pn(h, r, _), t !== null && (Ot(t, h, _, m), ls(t, h, _)), _;
  }
  function Ns(t) {
    if (t = t.current, !t.child) return null;
    switch (t.child.tag) {
      case 5:
        return t.child.stateNode;
      default:
        return t.child.stateNode;
    }
  }
  function zh(t, r) {
    if (t = t.memoizedState, t !== null && t.dehydrated !== null) {
      var s = t.retryLane;
      t.retryLane = s !== 0 && s < r ? s : r;
    }
  }
  function Ru(t, r) {
    zh(t, r), (t = t.alternate) && zh(t, r);
  }
  function d1() {
    return null;
  }
  var Bh = typeof reportError == "function" ? reportError : function(t) {
    console.error(t);
  };
  function Nu(t) {
    this._internalRoot = t;
  }
  Ds.prototype.render = Nu.prototype.render = function(t) {
    var r = this._internalRoot;
    if (r === null) throw Error(o(409));
    Rs(t, r, null, null);
  }, Ds.prototype.unmount = Nu.prototype.unmount = function() {
    var t = this._internalRoot;
    if (t !== null) {
      this._internalRoot = null;
      var r = t.containerInfo;
      or(function() {
        Rs(null, t, null, null);
      }), r[sn] = null;
    }
  };
  function Ds(t) {
    this._internalRoot = t;
  }
  Ds.prototype.unstable_scheduleHydration = function(t) {
    if (t) {
      var r = Tf();
      t = { blockedOn: null, target: t, priority: r };
      for (var s = 0; s < xn.length && r !== 0 && r < xn[s].priority; s++) ;
      xn.splice(s, 0, t), s === 0 && bf(t);
    }
  };
  function Du(t) {
    return !(!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11);
  }
  function js(t) {
    return !(!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11 && (t.nodeType !== 8 || t.nodeValue !== " react-mount-point-unstable "));
  }
  function Uh() {
  }
  function f1(t, r, s, u, h) {
    if (h) {
      if (typeof u == "function") {
        var m = u;
        u = function() {
          var F = Ns(_);
          m.call(F);
        };
      }
      var _ = Vh(r, u, t, 0, null, !1, !1, "", Uh);
      return t._reactRootContainer = _, t[sn] = _.current, jo(t.nodeType === 8 ? t.parentNode : t), or(), _;
    }
    for (; h = t.lastChild; ) t.removeChild(h);
    if (typeof u == "function") {
      var E = u;
      u = function() {
        var F = Ns(M);
        E.call(F);
      };
    }
    var M = Mu(t, 0, !1, null, null, !1, !1, "", Uh);
    return t._reactRootContainer = M, t[sn] = M.current, jo(t.nodeType === 8 ? t.parentNode : t), or(function() {
      Rs(r, M, s, u);
    }), M;
  }
  function Is(t, r, s, u, h) {
    var m = s._reactRootContainer;
    if (m) {
      var _ = m;
      if (typeof h == "function") {
        var E = h;
        h = function() {
          var M = Ns(_);
          E.call(M);
        };
      }
      Rs(r, _, t, h);
    } else _ = f1(s, r, t, h, u);
    return Ns(_);
  }
  _f = function(t) {
    switch (t.tag) {
      case 3:
        var r = t.stateNode;
        if (r.current.memoizedState.isDehydrated) {
          var s = So(r.pendingLanes);
          s !== 0 && (rl(r, s | 1), ft(r, Le()), (_e & 6) === 0 && (Ur = Le() + 500, bn()));
        }
        break;
      case 13:
        or(function() {
          var u = cn(t, 1);
          if (u !== null) {
            var h = ot();
            Ot(u, t, 1, h);
          }
        }), Ru(t, 1);
    }
  }, ol = function(t) {
    if (t.tag === 13) {
      var r = cn(t, 134217728);
      if (r !== null) {
        var s = ot();
        Ot(r, t, 134217728, s);
      }
      Ru(t, 134217728);
    }
  }, kf = function(t) {
    if (t.tag === 13) {
      var r = Dn(t), s = cn(t, r);
      if (s !== null) {
        var u = ot();
        Ot(s, t, r, u);
      }
      Ru(t, r);
    }
  }, Tf = function() {
    return Ae;
  }, Af = function(t, r) {
    var s = Ae;
    try {
      return Ae = t, r();
    } finally {
      Ae = s;
    }
  }, Xa = function(t, r, s) {
    switch (r) {
      case "input":
        if (Ua(t, s), r = s.name, s.type === "radio" && r != null) {
          for (s = t; s.parentNode; ) s = s.parentNode;
          for (s = s.querySelectorAll("input[name=" + JSON.stringify("" + r) + '][type="radio"]'), r = 0; r < s.length; r++) {
            var u = s[r];
            if (u !== t && u.form === t.form) {
              var h = qi(u);
              if (!h) throw Error(o(90));
              fo(u), Ua(u, h);
            }
          }
        }
        break;
      case "textarea":
        Jd(t, s);
        break;
      case "select":
        r = s.value, r != null && Sr(t, !!s.multiple, r, !1);
    }
  }, uf = Tu, cf = or;
  var p1 = { usingClientEntryPoint: !1, Events: [Oo, Pr, qi, af, lf, Tu] }, Zo = { findFiberByHostInstance: Xn, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, h1 = { bundleType: Zo.bundleType, version: Zo.version, rendererPackageName: Zo.rendererPackageName, rendererConfig: Zo.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: D.ReactCurrentDispatcher, findHostInstanceByFiber: function(t) {
    return t = hf(t), t === null ? null : t.stateNode;
  }, findFiberByHostInstance: Zo.findFiberByHostInstance || d1, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Fs = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Fs.isDisabled && Fs.supportsFiber) try {
      Di = Fs.inject(h1), Wt = Fs;
    } catch {
    }
  }
  return pt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = p1, pt.createPortal = function(t, r) {
    var s = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!Du(r)) throw Error(o(200));
    return c1(t, r, null, s);
  }, pt.createRoot = function(t, r) {
    if (!Du(t)) throw Error(o(299));
    var s = !1, u = "", h = Bh;
    return r != null && (r.unstable_strictMode === !0 && (s = !0), r.identifierPrefix !== void 0 && (u = r.identifierPrefix), r.onRecoverableError !== void 0 && (h = r.onRecoverableError)), r = Mu(t, 1, !1, null, null, s, !1, u, h), t[sn] = r.current, jo(t.nodeType === 8 ? t.parentNode : t), new Nu(r);
  }, pt.findDOMNode = function(t) {
    if (t == null) return null;
    if (t.nodeType === 1) return t;
    var r = t._reactInternals;
    if (r === void 0)
      throw typeof t.render == "function" ? Error(o(188)) : (t = Object.keys(t).join(","), Error(o(268, t)));
    return t = hf(r), t = t === null ? null : t.stateNode, t;
  }, pt.flushSync = function(t) {
    return or(t);
  }, pt.hydrate = function(t, r, s) {
    if (!js(r)) throw Error(o(200));
    return Is(null, t, r, !0, s);
  }, pt.hydrateRoot = function(t, r, s) {
    if (!Du(t)) throw Error(o(405));
    var u = s != null && s.hydratedSources || null, h = !1, m = "", _ = Bh;
    if (s != null && (s.unstable_strictMode === !0 && (h = !0), s.identifierPrefix !== void 0 && (m = s.identifierPrefix), s.onRecoverableError !== void 0 && (_ = s.onRecoverableError)), r = Vh(r, null, t, 1, s ?? null, h, !1, m, _), t[sn] = r.current, jo(t), u) for (t = 0; t < u.length; t++) s = u[t], h = s._getVersion, h = h(s._source), r.mutableSourceEagerHydrationData == null ? r.mutableSourceEagerHydrationData = [s, h] : r.mutableSourceEagerHydrationData.push(
      s,
      h
    );
    return new Ds(r);
  }, pt.render = function(t, r, s) {
    if (!js(r)) throw Error(o(200));
    return Is(null, t, r, !1, s);
  }, pt.unmountComponentAtNode = function(t) {
    if (!js(t)) throw Error(o(40));
    return t._reactRootContainer ? (or(function() {
      Is(null, null, t, !1, function() {
        t._reactRootContainer = null, t[sn] = null;
      });
    }), !0) : !1;
  }, pt.unstable_batchedUpdates = Tu, pt.unstable_renderSubtreeIntoContainer = function(t, r, s, u) {
    if (!js(s)) throw Error(o(200));
    if (t == null || t._reactInternals === void 0) throw Error(o(38));
    return Is(t, r, s, !1, u);
  }, pt.version = "18.3.1-next-f1338f8080-20240426", pt;
}
var Zh;
function tg() {
  if (Zh) return Iu.exports;
  Zh = 1;
  function e() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(e);
      } catch (n) {
        console.error(n);
      }
  }
  return e(), Iu.exports = A1(), Iu.exports;
}
var qh;
function C1() {
  if (qh) return Ls;
  qh = 1;
  var e = tg();
  return Ls.createRoot = e.createRoot, Ls.hydrateRoot = e.hydrateRoot, Ls;
}
var b1 = C1(), Lu = { exports: {} }, Jo = {};
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Jh;
function E1() {
  if (Jh) return Jo;
  Jh = 1;
  var e = ed(), n = Symbol.for("react.element"), o = Symbol.for("react.fragment"), i = Object.prototype.hasOwnProperty, a = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, c = { key: !0, ref: !0, __self: !0, __source: !0 };
  function d(p, y, g) {
    var S, l = {}, f = null, v = null;
    g !== void 0 && (f = "" + g), y.key !== void 0 && (f = "" + y.key), y.ref !== void 0 && (v = y.ref);
    for (S in y) i.call(y, S) && !c.hasOwnProperty(S) && (l[S] = y[S]);
    if (p && p.defaultProps) for (S in y = p.defaultProps, y) l[S] === void 0 && (l[S] = y[S]);
    return { $$typeof: n, type: p, key: f, ref: v, props: l, _owner: a.current };
  }
  return Jo.Fragment = o, Jo.jsx = d, Jo.jsxs = d, Jo;
}
var em;
function P1() {
  return em || (em = 1, Lu.exports = E1()), Lu.exports;
}
var w = P1();
const tm = (e) => Symbol.iterator in e, nm = (e) => (
  // HACK: avoid checking entries type
  "entries" in e
), rm = (e, n) => {
  const o = e instanceof Map ? e : new Map(e.entries()), i = n instanceof Map ? n : new Map(n.entries());
  if (o.size !== i.size)
    return !1;
  for (const [a, c] of o)
    if (!i.has(a) || !Object.is(c, i.get(a)))
      return !1;
  return !0;
}, M1 = (e, n) => {
  const o = e[Symbol.iterator](), i = n[Symbol.iterator]();
  let a = o.next(), c = i.next();
  for (; !a.done && !c.done; ) {
    if (!Object.is(a.value, c.value))
      return !1;
    a = o.next(), c = i.next();
  }
  return !!a.done && !!c.done;
};
function R1(e, n) {
  return Object.is(e, n) ? !0 : typeof e != "object" || e === null || typeof n != "object" || n === null || Object.getPrototypeOf(e) !== Object.getPrototypeOf(n) ? !1 : tm(e) && tm(n) ? nm(e) && nm(n) ? rm(e, n) : M1(e, n) : rm(
    { entries: () => Object.entries(e) },
    { entries: () => Object.entries(n) }
  );
}
function N1(e) {
  const n = yn.useRef(void 0);
  return (o) => {
    const i = e(o);
    return R1(n.current, i) ? n.current : n.current = i;
  };
}
const nd = C.createContext({});
function rd(e) {
  const n = C.useRef(null);
  return n.current === null && (n.current = e()), n.current;
}
const D1 = typeof window < "u", od = D1 ? C.useLayoutEffect : C.useEffect, Pa = /* @__PURE__ */ C.createContext(null);
function id(e, n) {
  e.indexOf(n) === -1 && e.push(n);
}
function da(e, n) {
  const o = e.indexOf(n);
  o > -1 && e.splice(o, 1);
}
const on = (e, n, o) => o > n ? n : o < e ? e : o;
function om(e, n) {
  return n ? `${e}. For more information and steps for solving, visit https://motion.dev/troubleshooting/${n}` : e;
}
let ki = () => {
}, vr = () => {
};
var Qy;
typeof process < "u" && ((Qy = process.env) == null ? void 0 : Qy.NODE_ENV) !== "production" && (ki = (e, n, o) => {
  !e && typeof console < "u" && console.warn(om(n, o));
}, vr = (e, n, o) => {
  if (!e)
    throw new Error(om(n, o));
});
const $n = {}, ng = (e) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(e), rg = (e) => typeof e == "object" && e !== null, og = (e) => /^0[^.\s]+$/u.test(e);
// @__NO_SIDE_EFFECTS__
function ig(e) {
  let n;
  return () => (n === void 0 && (n = e()), n);
}
const Mt = /* @__NO_SIDE_EFFECTS__ */ (e) => e, Ti = (...e) => e.reduce((n, o) => (i) => o(n(i))), pi = /* @__NO_SIDE_EFFECTS__ */ (e, n, o) => {
  const i = n - e;
  return i ? (o - e) / i : 1;
};
class sd {
  constructor() {
    this.subscriptions = [];
  }
  add(n) {
    return id(this.subscriptions, n), () => da(this.subscriptions, n);
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
const yt = /* @__NO_SIDE_EFFECTS__ */ (e) => e * 1e3, Pt = /* @__NO_SIDE_EFFECTS__ */ (e) => e / 1e3, sg = /* @__NO_SIDE_EFFECTS__ */ (e, n) => n ? e * (1e3 / n) : 0, ag = (e, n, o) => (((1 - 3 * o + 3 * n) * e + (3 * o - 6 * n)) * e + 3 * n) * e, j1 = 1e-7, I1 = 12;
function F1(e, n, o, i, a) {
  let c, d, p = 0;
  do
    d = n + (o - n) / 2, c = ag(d, i, a) - e, c > 0 ? o = d : n = d;
  while (Math.abs(c) > j1 && ++p < I1);
  return d;
}
// @__NO_SIDE_EFFECTS__
function Ai(e, n, o, i) {
  if (e === n && o === i)
    return Mt;
  const a = (c) => F1(c, 0, 1, e, o);
  return (c) => c === 0 || c === 1 ? c : ag(a(c), n, i);
}
const lg = /* @__NO_SIDE_EFFECTS__ */ (e) => (n) => n <= 0.5 ? e(2 * n) / 2 : (2 - e(2 * (1 - n))) / 2, ug = /* @__NO_SIDE_EFFECTS__ */ (e) => (n) => 1 - e(1 - n), cg = /* @__PURE__ */ Ai(0.33, 1.53, 0.69, 0.99), ad = /* @__PURE__ */ ug(cg), dg = /* @__PURE__ */ lg(ad), fg = (e) => e >= 1 ? 1 : (e *= 2) < 1 ? 0.5 * ad(e) : 0.5 * (2 - Math.pow(2, -10 * (e - 1))), ld = (e) => 1 - Math.sin(Math.acos(e)), pg = /* @__PURE__ */ ug(ld), hg = /* @__PURE__ */ lg(ld), O1 = /* @__PURE__ */ Ai(0.42, 0, 1, 1), L1 = /* @__PURE__ */ Ai(0, 0, 0.58, 1), mg = /* @__PURE__ */ Ai(0.42, 0, 0.58, 1), V1 = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] != "number", yg = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] == "number", im = {
  linear: Mt,
  easeIn: O1,
  easeInOut: mg,
  easeOut: L1,
  circIn: ld,
  circInOut: hg,
  circOut: pg,
  backIn: ad,
  backInOut: dg,
  backOut: cg,
  anticipate: fg
}, z1 = (e) => typeof e == "string", sm = (e) => {
  if (/* @__PURE__ */ yg(e)) {
    vr(e.length === 4, "Cubic bezier arrays must contain four numerical values.", "cubic-bezier-length");
    const [n, o, i, a] = e;
    return /* @__PURE__ */ Ai(n, o, i, a);
  } else if (z1(e))
    return vr(im[e] !== void 0, `Invalid easing type '${e}'`, "invalid-easing-type"), im[e];
  return e;
}, Vs = [
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
function B1(e) {
  let n = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set(), i = !1, a = !1;
  const c = /* @__PURE__ */ new WeakSet();
  let d = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  };
  function p(g) {
    c.has(g) && (y.schedule(g), e()), g(d);
  }
  const y = {
    /**
     * Schedule a process to run on the next frame.
     */
    schedule: (g, S = !1, l = !1) => {
      const v = l && i ? n : o;
      return S && c.add(g), v.add(g), g;
    },
    /**
     * Cancel the provided callback from running on the next frame.
     */
    cancel: (g) => {
      o.delete(g), c.delete(g);
    },
    /**
     * Execute all schedule callbacks.
     */
    process: (g) => {
      if (d = g, i) {
        a = !0;
        return;
      }
      i = !0;
      const S = n;
      n = o, o = S, n.forEach(p), n.clear(), i = !1, a && (a = !1, y.process(g));
    }
  };
  return y;
}
const U1 = 40;
function gg(e, n) {
  let o = !1, i = !0;
  const a = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  }, c = () => o = !0, d = Vs.reduce((P, D) => (P[D] = B1(c), P), {}), { setup: p, read: y, resolveKeyframes: g, preUpdate: S, update: l, preRender: f, render: v, postRender: x } = d, T = () => {
    const P = $n.useManualTiming, D = P ? a.timestamp : performance.now();
    o = !1, P || (a.delta = i ? 1e3 / 60 : Math.max(Math.min(D - a.timestamp, U1), 1)), a.timestamp = D, a.isProcessing = !0, p.process(a), y.process(a), g.process(a), S.process(a), l.process(a), f.process(a), v.process(a), x.process(a), a.isProcessing = !1, o && n && (i = !1, e(T));
  }, k = () => {
    o = !0, i = !0, a.isProcessing || e(T);
  };
  return { schedule: Vs.reduce((P, D) => {
    const L = d[D];
    return P[D] = (X, Z = !1, U = !1) => (o || k(), L.schedule(X, Z, U)), P;
  }, {}), cancel: (P) => {
    for (let D = 0; D < Vs.length; D++)
      d[Vs[D]].cancel(P);
  }, state: a, steps: d };
}
const { schedule: be, cancel: Hn, state: Ze, steps: Vu } = /* @__PURE__ */ gg(typeof requestAnimationFrame < "u" ? requestAnimationFrame : Mt, !0);
let Zs;
function $1() {
  Zs = void 0;
}
const it = {
  now: () => (Zs === void 0 && it.set(Ze.isProcessing || $n.useManualTiming ? Ze.timestamp : performance.now()), Zs),
  set: (e) => {
    Zs = e, queueMicrotask($1);
  }
}, vg = (e) => (n) => typeof n == "string" && n.startsWith(e), Sg = /* @__PURE__ */ vg("--"), H1 = /* @__PURE__ */ vg("var(--"), ud = (e) => H1(e) ? W1.test(e.split("/*")[0].trim()) : !1, W1 = /var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;
function am(e) {
  return typeof e != "string" ? !1 : e.split("/*")[0].includes("var(--");
}
const ao = {
  test: (e) => typeof e == "number",
  parse: parseFloat,
  transform: (e) => e
}, hi = {
  ...ao,
  transform: (e) => on(0, 1, e)
}, zs = {
  ...ao,
  default: 1
}, si = (e) => Math.round(e * 1e5) / 1e5, cd = /-?(?:\d+(?:\.\d+)?|\.\d+)/gu;
function G1(e) {
  return e == null;
}
const K1 = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu, dd = (e, n) => (o) => !!(typeof o == "string" && K1.test(o) && o.startsWith(e) || n && !G1(o) && Object.prototype.hasOwnProperty.call(o, n)), wg = (e, n, o) => (i) => {
  if (typeof i != "string")
    return i;
  const [a, c, d, p] = i.match(cd);
  return {
    [e]: parseFloat(a),
    [n]: parseFloat(c),
    [o]: parseFloat(d),
    alpha: p !== void 0 ? parseFloat(p) : 1
  };
}, Y1 = (e) => on(0, 255, e), zu = {
  ...ao,
  transform: (e) => Math.round(Y1(e))
}, fr = {
  test: /* @__PURE__ */ dd("rgb", "red"),
  parse: /* @__PURE__ */ wg("red", "green", "blue"),
  transform: ({ red: e, green: n, blue: o, alpha: i = 1 }) => "rgba(" + zu.transform(e) + ", " + zu.transform(n) + ", " + zu.transform(o) + ", " + si(hi.transform(i)) + ")"
};
function Q1(e) {
  let n = "", o = "", i = "", a = "";
  return e.length > 5 ? (n = e.substring(1, 3), o = e.substring(3, 5), i = e.substring(5, 7), a = e.substring(7, 9)) : (n = e.substring(1, 2), o = e.substring(2, 3), i = e.substring(3, 4), a = e.substring(4, 5), n += n, o += o, i += i, a += a), {
    red: parseInt(n, 16),
    green: parseInt(o, 16),
    blue: parseInt(i, 16),
    alpha: a ? parseInt(a, 16) / 255 : 1
  };
}
const fc = {
  test: /* @__PURE__ */ dd("#"),
  parse: Q1,
  transform: fr.transform
}, Ci = /* @__NO_SIDE_EFFECTS__ */ (e) => ({
  test: (n) => typeof n == "string" && n.endsWith(e) && n.split(" ").length === 1,
  parse: parseFloat,
  transform: (n) => `${n}${e}`
}), mn = /* @__PURE__ */ Ci("deg"), nn = /* @__PURE__ */ Ci("%"), re = /* @__PURE__ */ Ci("px"), X1 = /* @__PURE__ */ Ci("vh"), Z1 = /* @__PURE__ */ Ci("vw"), lm = {
  ...nn,
  parse: (e) => nn.parse(e) / 100,
  transform: (e) => nn.transform(e * 100)
}, Qr = {
  test: /* @__PURE__ */ dd("hsl", "hue"),
  parse: /* @__PURE__ */ wg("hue", "saturation", "lightness"),
  transform: ({ hue: e, saturation: n, lightness: o, alpha: i = 1 }) => "hsla(" + Math.round(e) + ", " + nn.transform(si(n)) + ", " + nn.transform(si(o)) + ", " + si(hi.transform(i)) + ")"
}, Be = {
  test: (e) => fr.test(e) || fc.test(e) || Qr.test(e),
  parse: (e) => fr.test(e) ? fr.parse(e) : Qr.test(e) ? Qr.parse(e) : fc.parse(e),
  transform: (e) => typeof e == "string" ? e : e.hasOwnProperty("red") ? fr.transform(e) : Qr.transform(e),
  getAnimatableNone: (e) => {
    const n = Be.parse(e);
    return n.alpha = 0, Be.transform(n);
  }
}, q1 = /(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;
function J1(e) {
  var n, o;
  return isNaN(e) && typeof e == "string" && (((n = e.match(cd)) == null ? void 0 : n.length) || 0) + (((o = e.match(q1)) == null ? void 0 : o.length) || 0) > 0;
}
const xg = "number", _g = "color", ex = "var", tx = "var(", um = "${}", nx = /var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;
function no(e) {
  const n = e.toString(), o = [], i = {
    color: [],
    number: [],
    var: []
  }, a = [];
  let c = 0;
  const p = n.replace(nx, (y) => (Be.test(y) ? (i.color.push(c), a.push(_g), o.push(Be.parse(y))) : y.startsWith(tx) ? (i.var.push(c), a.push(ex), o.push(y)) : (i.number.push(c), a.push(xg), o.push(parseFloat(y))), ++c, um)).split(um);
  return { values: o, split: p, indexes: i, types: a };
}
function rx(e) {
  return no(e).values;
}
function kg({ split: e, types: n }) {
  const o = e.length;
  return (i) => {
    let a = "";
    for (let c = 0; c < o; c++)
      if (a += e[c], i[c] !== void 0) {
        const d = n[c];
        d === xg ? a += si(i[c]) : d === _g ? a += Be.transform(i[c]) : a += i[c];
      }
    return a;
  };
}
function ox(e) {
  return kg(no(e));
}
const ix = (e) => typeof e == "number" ? 0 : Be.test(e) ? Be.getAnimatableNone(e) : e, sx = (e, n) => typeof e == "number" ? n != null && n.trim().endsWith("/") ? e : 0 : ix(e);
function ax(e) {
  const n = no(e);
  return kg(n)(n.values.map((i, a) => sx(i, n.split[a])));
}
const $t = {
  test: J1,
  parse: rx,
  createTransformer: ox,
  getAnimatableNone: ax
};
function Bu(e, n, o) {
  return o < 0 && (o += 1), o > 1 && (o -= 1), o < 1 / 6 ? e + (n - e) * 6 * o : o < 1 / 2 ? n : o < 2 / 3 ? e + (n - e) * (2 / 3 - o) * 6 : e;
}
function lx({ hue: e, saturation: n, lightness: o, alpha: i }) {
  e /= 360, n /= 100, o /= 100;
  let a = 0, c = 0, d = 0;
  if (!n)
    a = c = d = o;
  else {
    const p = o < 0.5 ? o * (1 + n) : o + n - o * n, y = 2 * o - p;
    a = Bu(y, p, e + 1 / 3), c = Bu(y, p, e), d = Bu(y, p, e - 1 / 3);
  }
  return {
    red: Math.round(a * 255),
    green: Math.round(c * 255),
    blue: Math.round(d * 255),
    alpha: i
  };
}
function fa(e, n) {
  return (o) => o > 0 ? n : e;
}
const Ce = (e, n, o) => e + (n - e) * o, Uu = (e, n, o) => {
  const i = e * e, a = o * (n * n - i) + i;
  return a < 0 ? 0 : Math.sqrt(a);
}, ux = [fc, fr, Qr], cx = (e) => ux.find((n) => n.test(e));
function cm(e) {
  const n = cx(e);
  if (ki(!!n, `'${e}' is not an animatable color. Use the equivalent color code instead.`, "color-not-animatable"), !n)
    return !1;
  let o = n.parse(e);
  return n === Qr && (o = lx(o)), o;
}
const dm = (e, n) => {
  const o = cm(e), i = cm(n);
  if (!o || !i)
    return fa(e, n);
  const a = { ...o };
  return (c) => (a.red = Uu(o.red, i.red, c), a.green = Uu(o.green, i.green, c), a.blue = Uu(o.blue, i.blue, c), a.alpha = Ce(o.alpha, i.alpha, c), fr.transform(a));
}, pc = /* @__PURE__ */ new Set(["none", "hidden"]);
function dx(e, n) {
  return pc.has(e) ? (o) => o <= 0 ? e : n : (o) => o >= 1 ? n : e;
}
function fx(e, n) {
  return (o) => Ce(e, n, o);
}
function fd(e) {
  return typeof e == "number" ? fx : typeof e == "string" ? ud(e) ? fa : Be.test(e) ? dm : mx : Array.isArray(e) ? Tg : typeof e == "object" ? Be.test(e) ? dm : px : fa;
}
function Tg(e, n) {
  const o = [...e], i = o.length, a = e.map((c, d) => fd(c)(c, n[d]));
  return (c) => {
    for (let d = 0; d < i; d++)
      o[d] = a[d](c);
    return o;
  };
}
function px(e, n) {
  const o = { ...e, ...n }, i = {};
  for (const a in o)
    e[a] !== void 0 && n[a] !== void 0 && (i[a] = fd(e[a])(e[a], n[a]));
  return (a) => {
    for (const c in i)
      o[c] = i[c](a);
    return o;
  };
}
function hx(e, n) {
  const o = [], i = { color: 0, var: 0, number: 0 };
  for (let a = 0; a < n.values.length; a++) {
    const c = n.types[a], d = e.indexes[c][i[c]], p = e.values[d] ?? 0;
    o[a] = p, i[c]++;
  }
  return o;
}
const mx = (e, n) => {
  const o = $t.createTransformer(n), i = no(e), a = no(n);
  return i.indexes.var.length === a.indexes.var.length && i.indexes.color.length === a.indexes.color.length && i.indexes.number.length >= a.indexes.number.length ? pc.has(e) && !a.values.length || pc.has(n) && !i.values.length ? dx(e, n) : Ti(Tg(hx(i, a), a.values), o) : (ki(!0, `Complex values '${e}' and '${n}' too different to mix. Ensure all colors are of the same type, and that each contains the same quantity of number and color values. Falling back to instant transition.`, "complex-values-different"), fa(e, n));
};
function Ag(e, n, o) {
  return typeof e == "number" && typeof n == "number" && typeof o == "number" ? Ce(e, n, o) : fd(e)(e, n);
}
const yx = (e) => {
  const n = ({ timestamp: o }) => e(o);
  return {
    start: (o = !0) => be.update(n, o),
    stop: () => Hn(n),
    /**
     * If we're processing this frame we can use the
     * framelocked timestamp to keep things in sync.
     */
    now: () => Ze.isProcessing ? Ze.timestamp : it.now()
  };
}, Cg = (e, n, o = 10) => {
  let i = "";
  const a = Math.max(Math.round(n / o), 2);
  for (let c = 0; c < a; c++)
    i += Math.round(e(c / (a - 1)) * 1e4) / 1e4 + ", ";
  return `linear(${i.substring(0, i.length - 2)})`;
}, pa = 2e4;
function pd(e) {
  let n = 0;
  const o = 50;
  let i = e.next(n);
  for (; !i.done && n < pa; )
    n += o, i = e.next(n);
  return n >= pa ? 1 / 0 : n;
}
function gx(e, n = 100, o) {
  const i = o({ ...e, keyframes: [0, n] }), a = Math.min(pd(i), pa);
  return {
    type: "keyframes",
    ease: (c) => i.next(a * c).value / n,
    duration: /* @__PURE__ */ Pt(a)
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
function hc(e, n) {
  return e * Math.sqrt(1 - n * n);
}
const vx = 12;
function Sx(e, n, o) {
  let i = o;
  for (let a = 1; a < vx; a++)
    i = i - e(i) / n(i);
  return i;
}
const $u = 1e-3;
function wx({ duration: e = Fe.duration, bounce: n = Fe.bounce, velocity: o = Fe.velocity, mass: i = Fe.mass }) {
  let a, c;
  ki(e <= /* @__PURE__ */ yt(Fe.maxDuration), "Spring duration must be 10 seconds or less", "spring-duration-limit");
  let d = 1 - n;
  d = on(Fe.minDamping, Fe.maxDamping, d), e = on(Fe.minDuration, Fe.maxDuration, /* @__PURE__ */ Pt(e)), d < 1 ? (a = (g) => {
    const S = g * d, l = S * e, f = S - o, v = hc(g, d), x = Math.exp(-l);
    return $u - f / v * x;
  }, c = (g) => {
    const l = g * d * e, f = l * o + o, v = Math.pow(d, 2) * Math.pow(g, 2) * e, x = Math.exp(-l), T = hc(Math.pow(g, 2), d);
    return (-a(g) + $u > 0 ? -1 : 1) * ((f - v) * x) / T;
  }) : (a = (g) => {
    const S = Math.exp(-g * e), l = (g - o) * e + 1;
    return -$u + S * l;
  }, c = (g) => {
    const S = Math.exp(-g * e), l = (o - g) * (e * e);
    return S * l;
  });
  const p = 5 / e, y = Sx(a, c, p);
  if (e = /* @__PURE__ */ yt(e), isNaN(y))
    return {
      stiffness: Fe.stiffness,
      damping: Fe.damping,
      duration: e
    };
  {
    const g = Math.pow(y, 2) * i;
    return {
      stiffness: g,
      damping: d * 2 * Math.sqrt(i * g),
      duration: e
    };
  }
}
const xx = ["duration", "bounce"], _x = ["stiffness", "damping", "mass"];
function fm(e, n) {
  return n.some((o) => e[o] !== void 0);
}
function kx(e) {
  let n = {
    velocity: Fe.velocity,
    stiffness: Fe.stiffness,
    damping: Fe.damping,
    mass: Fe.mass,
    isResolvedFromDuration: !1,
    ...e
  };
  if (!fm(e, _x) && fm(e, xx))
    if (n.velocity = 0, e.visualDuration) {
      const o = e.visualDuration, i = 2 * Math.PI / (o * 1.2), a = i * i, c = 2 * on(0.05, 1, 1 - (e.bounce || 0)) * Math.sqrt(a);
      n = {
        ...n,
        mass: Fe.mass,
        stiffness: a,
        damping: c
      };
    } else {
      const o = wx({ ...e, velocity: 0 });
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
  const c = o.keyframes[0], d = o.keyframes[o.keyframes.length - 1], p = { done: !1, value: c }, { stiffness: y, damping: g, mass: S, duration: l, velocity: f, isResolvedFromDuration: v } = kx({
    ...o,
    velocity: -/* @__PURE__ */ Pt(o.velocity || 0)
  }), x = f || 0, T = g / (2 * Math.sqrt(y * S)), k = d - c, A = /* @__PURE__ */ Pt(Math.sqrt(y / S)), R = Math.abs(k) < 5;
  i || (i = R ? Fe.restSpeed.granular : Fe.restSpeed.default), a || (a = R ? Fe.restDelta.granular : Fe.restDelta.default);
  let P, D, L, X, Z, U;
  if (T < 1)
    L = hc(A, T), X = (x + T * A * k) / L, P = (Q) => {
      const J = Math.exp(-T * A * Q);
      return d - J * (X * Math.sin(L * Q) + k * Math.cos(L * Q));
    }, Z = T * A * X + k * L, U = T * A * k - X * L, D = (Q) => Math.exp(-T * A * Q) * (Z * Math.sin(L * Q) + U * Math.cos(L * Q));
  else if (T === 1) {
    P = (J) => d - Math.exp(-A * J) * (k + (x + A * k) * J);
    const Q = x + A * k;
    D = (J) => Math.exp(-A * J) * (A * Q * J - x);
  } else {
    const Q = A * Math.sqrt(T * T - 1);
    P = (he) => {
      const we = Math.exp(-T * A * he), ue = Math.min(Q * he, 300);
      return d - we * ((x + T * A * k) * Math.sinh(ue) + Q * k * Math.cosh(ue)) / Q;
    };
    const J = (x + T * A * k) / Q, ce = T * A * J - k * Q, ye = T * A * k - J * Q;
    D = (he) => {
      const we = Math.exp(-T * A * he), ue = Math.min(Q * he, 300);
      return we * (ce * Math.sinh(ue) + ye * Math.cosh(ue));
    };
  }
  const G = {
    calculatedDuration: v && l || null,
    velocity: (Q) => /* @__PURE__ */ yt(D(Q)),
    next: (Q) => {
      if (!v && T < 1) {
        const ce = Math.exp(-T * A * Q), ye = Math.sin(L * Q), he = Math.cos(L * Q), we = d - ce * (X * ye + k * he), ue = /* @__PURE__ */ yt(ce * (Z * ye + U * he));
        return p.done = Math.abs(ue) <= i && Math.abs(d - we) <= a, p.value = p.done ? d : we, p;
      }
      const J = P(Q);
      if (v)
        p.done = Q >= l;
      else {
        const ce = /* @__PURE__ */ yt(D(Q));
        p.done = Math.abs(ce) <= i && Math.abs(d - J) <= a;
      }
      return p.value = p.done ? d : J, p;
    },
    toString: () => {
      const Q = Math.min(pd(G), pa), J = Cg((ce) => G.next(Q * ce).value, Q, 30);
      return Q + "ms " + J;
    },
    toTransition: () => {
    }
  };
  return G;
}
ha.applyToOptions = (e) => {
  const n = gx(e, 100, ha);
  return e.ease = n.ease, e.duration = /* @__PURE__ */ yt(n.duration), e.type = "keyframes", e;
};
const Tx = 5;
function bg(e, n, o) {
  const i = Math.max(n - Tx, 0);
  return /* @__PURE__ */ sg(o - e(i), n - i);
}
function mc({ keyframes: e, velocity: n = 0, power: o = 0.8, timeConstant: i = 325, bounceDamping: a = 10, bounceStiffness: c = 500, modifyTarget: d, min: p, max: y, restDelta: g = 0.5, restSpeed: S }) {
  const l = e[0], f = {
    done: !1,
    value: l
  }, v = (U) => p !== void 0 && U < p || y !== void 0 && U > y, x = (U) => p === void 0 ? y : y === void 0 || Math.abs(p - U) < Math.abs(y - U) ? p : y;
  let T = o * n;
  const k = l + T, A = d === void 0 ? k : d(k);
  A !== k && (T = A - l);
  const R = (U) => -T * Math.exp(-U / i), P = (U) => A + R(U), D = (U) => {
    const G = R(U), Q = P(U);
    f.done = Math.abs(G) <= g, f.value = f.done ? A : Q;
  };
  let L, X;
  const Z = (U) => {
    v(f.value) && (L = U, X = ha({
      keyframes: [f.value, x(f.value)],
      velocity: bg(P, U, f.value),
      // TODO: This should be passing * 1000
      damping: a,
      stiffness: c,
      restDelta: g,
      restSpeed: S
    }));
  };
  return Z(0), {
    calculatedDuration: null,
    next: (U) => {
      let G = !1;
      return !X && L === void 0 && (G = !0, D(U), Z(U)), L !== void 0 && U >= L ? X.next(U - L) : (!G && D(U), f);
    }
  };
}
function Ax(e, n, o) {
  const i = [], a = o || $n.mix || Ag, c = e.length - 1;
  for (let d = 0; d < c; d++) {
    let p = a(e[d], e[d + 1]);
    if (n) {
      const y = Array.isArray(n) ? n[d] || Mt : n;
      p = Ti(y, p);
    }
    i.push(p);
  }
  return i;
}
function Cx(e, n, { clamp: o = !0, ease: i, mixer: a } = {}) {
  const c = e.length;
  if (vr(c === n.length, "Both input and output ranges must be the same length", "range-length"), c === 1)
    return () => n[0];
  if (c === 2 && n[0] === n[1])
    return () => n[1];
  const d = e[0] === e[1];
  e[0] > e[c - 1] && (e = [...e].reverse(), n = [...n].reverse());
  const p = Ax(n, i, a), y = p.length, g = (S) => {
    if (d && S < e[0])
      return n[0];
    let l = 0;
    if (y > 1)
      for (; l < e.length - 2 && !(S < e[l + 1]); l++)
        ;
    const f = /* @__PURE__ */ pi(e[l], e[l + 1], S);
    return p[l](f);
  };
  return o ? (S) => g(on(e[0], e[c - 1], S)) : g;
}
function bx(e, n) {
  const o = e[e.length - 1];
  for (let i = 1; i <= n; i++) {
    const a = /* @__PURE__ */ pi(0, n, i);
    e.push(Ce(o, 1, a));
  }
}
function Ex(e) {
  const n = [0];
  return bx(n, e.length - 1), n;
}
function Px(e, n) {
  return e.map((o) => o * n);
}
function Mx(e, n) {
  return e.map(() => n || mg).splice(0, e.length - 1);
}
function ai({ duration: e = 300, keyframes: n, times: o, ease: i = "easeInOut" }) {
  const a = /* @__PURE__ */ V1(i) ? i.map(sm) : sm(i), c = {
    done: !1,
    value: n[0]
  }, d = Px(
    // Only use the provided offsets if they're the correct length
    // TODO Maybe we should warn here if there's a length mismatch
    o && o.length === n.length ? o : Ex(n),
    e
  ), p = Cx(d, n, {
    ease: Array.isArray(a) ? a : Mx(n, a)
  });
  return {
    calculatedDuration: e,
    next: (y) => (c.value = p(y), c.done = y >= e, c)
  };
}
const Rx = (e) => e !== null;
function Ma(e, { repeat: n, repeatType: o = "loop" }, i, a = 1) {
  const c = e.filter(Rx), p = a < 0 || n && o !== "loop" && n % 2 === 1 ? 0 : c.length - 1;
  return !p || i === void 0 ? c[p] : i;
}
const Nx = {
  decay: mc,
  inertia: mc,
  tween: ai,
  keyframes: ai,
  spring: ha
};
function Eg(e) {
  typeof e.type == "string" && (e.type = Nx[e.type]);
}
class hd {
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
const Dx = (e) => e / 100;
class ma extends hd {
  constructor(n) {
    super(), this.state = "idle", this.startTime = null, this.isStopped = !1, this.currentTime = 0, this.holdTime = null, this.playbackSpeed = 1, this.delayState = {
      done: !1,
      value: void 0
    }, this.stop = () => {
      var i, a;
      const { motionValue: o } = this.options;
      o && o.updatedAt !== it.now() && this.tick(it.now()), this.isStopped = !0, this.state !== "idle" && (this.teardown(), (a = (i = this.options).onStop) == null || a.call(i));
    }, this.options = n, this.initAnimation(), this.play(), n.autoplay === !1 && this.pause();
  }
  initAnimation() {
    const { options: n } = this;
    Eg(n);
    const { type: o = ai, repeat: i = 0, repeatDelay: a = 0, repeatType: c, velocity: d = 0 } = n;
    let { keyframes: p } = n;
    const y = o || ai;
    y !== ai && typeof p[0] != "number" && (this.mixKeyframes = Ti(Dx, Ag(p[0], p[1])), p = [0, 100]);
    const g = y({ ...n, keyframes: p });
    c === "mirror" && (this.mirroredGenerator = y({
      ...n,
      keyframes: [...p].reverse(),
      velocity: -d
    })), g.calculatedDuration === null && (g.calculatedDuration = pd(g));
    const { calculatedDuration: S } = g;
    this.calculatedDuration = S, this.resolvedDuration = S + a, this.totalDuration = this.resolvedDuration * (i + 1) - a, this.generator = g;
  }
  updateTime(n) {
    const o = Math.round(n - this.startTime) * this.playbackSpeed;
    this.holdTime !== null ? this.currentTime = this.holdTime : this.currentTime = o;
  }
  tick(n, o = !1) {
    const { generator: i, totalDuration: a, mixKeyframes: c, mirroredGenerator: d, resolvedDuration: p, calculatedDuration: y } = this;
    if (this.startTime === null)
      return i.next(0);
    const { delay: g = 0, keyframes: S, repeat: l, repeatType: f, repeatDelay: v, type: x, onUpdate: T, finalKeyframe: k } = this.options;
    this.speed > 0 ? this.startTime = Math.min(this.startTime, n) : this.speed < 0 && (this.startTime = Math.min(n - a / this.speed, this.startTime)), o ? this.currentTime = n : this.updateTime(n);
    const A = this.currentTime - g * (this.playbackSpeed >= 0 ? 1 : -1), R = this.playbackSpeed >= 0 ? A < 0 : A > a;
    this.currentTime = Math.max(A, 0), this.state === "finished" && this.holdTime === null && (this.currentTime = a);
    let P = this.currentTime, D = i;
    if (l) {
      const U = Math.min(this.currentTime, a) / p;
      let G = Math.floor(U), Q = U % 1;
      !Q && U >= 1 && (Q = 1), Q === 1 && G--, G = Math.min(G, l + 1), !!(G % 2) && (f === "reverse" ? (Q = 1 - Q, v && (Q -= v / p)) : f === "mirror" && (D = d)), P = on(0, 1, Q) * p;
    }
    let L;
    R ? (this.delayState.value = S[0], L = this.delayState) : L = D.next(P), c && !R && (L.value = c(L.value));
    let { done: X } = L;
    !R && y !== null && (X = this.playbackSpeed >= 0 ? this.currentTime >= a : this.currentTime <= 0);
    const Z = this.holdTime === null && (this.state === "finished" || this.state === "running" && X);
    return Z && x !== mc && (L.value = Ma(S, this.options, k, this.speed)), T && T(L.value), Z && this.finish(), L;
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
    return /* @__PURE__ */ Pt(this.calculatedDuration);
  }
  get iterationDuration() {
    const { delay: n = 0 } = this.options || {};
    return this.duration + /* @__PURE__ */ Pt(n);
  }
  get time() {
    return /* @__PURE__ */ Pt(this.currentTime);
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
    return bg((i) => this.generator.next(i).value, n, o);
  }
  get speed() {
    return this.playbackSpeed;
  }
  set speed(n) {
    const o = this.playbackSpeed !== n;
    o && this.driver && this.updateTime(it.now()), this.playbackSpeed = n, o && this.driver && (this.time = /* @__PURE__ */ Pt(this.currentTime));
  }
  play() {
    var a, c;
    if (this.isStopped)
      return;
    const { driver: n = yx, startTime: o } = this.options;
    this.driver || (this.driver = n((d) => this.tick(d))), (c = (a = this.options).onPlay) == null || c.call(a);
    const i = this.driver.now();
    this.state === "finished" ? (this.updateFinished(), this.startTime = i) : this.holdTime !== null ? this.startTime = i - this.holdTime : this.startTime || (this.startTime = o ?? i), this.state === "finished" && this.speed < 0 && (this.startTime += this.calculatedDuration), this.holdTime = null, this.state = "running", this.driver.start();
  }
  pause() {
    this.state = "paused", this.updateTime(it.now()), this.holdTime = this.currentTime;
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
function jx(e) {
  for (let n = 1; n < e.length; n++)
    e[n] ?? (e[n] = e[n - 1]);
}
const pr = (e) => e * 180 / Math.PI, yc = (e) => {
  const n = pr(Math.atan2(e[1], e[0]));
  return gc(n);
}, Ix = {
  x: 4,
  y: 5,
  translateX: 4,
  translateY: 5,
  scaleX: 0,
  scaleY: 3,
  scale: (e) => (Math.abs(e[0]) + Math.abs(e[3])) / 2,
  rotate: yc,
  rotateZ: yc,
  skewX: (e) => pr(Math.atan(e[1])),
  skewY: (e) => pr(Math.atan(e[2])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[2])) / 2
}, gc = (e) => (e = e % 360, e < 0 && (e += 360), e), pm = yc, hm = (e) => Math.sqrt(e[0] * e[0] + e[1] * e[1]), mm = (e) => Math.sqrt(e[4] * e[4] + e[5] * e[5]), Fx = {
  x: 12,
  y: 13,
  z: 14,
  translateX: 12,
  translateY: 13,
  translateZ: 14,
  scaleX: hm,
  scaleY: mm,
  scale: (e) => (hm(e) + mm(e)) / 2,
  rotateX: (e) => gc(pr(Math.atan2(e[6], e[5]))),
  rotateY: (e) => gc(pr(Math.atan2(-e[2], e[0]))),
  rotateZ: pm,
  rotate: pm,
  skewX: (e) => pr(Math.atan(e[4])),
  skewY: (e) => pr(Math.atan(e[1])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[4])) / 2
};
function vc(e) {
  return e.includes("scale") ? 1 : 0;
}
function Sc(e, n) {
  if (!e || e === "none")
    return vc(n);
  const o = e.match(/^matrix3d\(([-\d.e\s,]+)\)$/u);
  let i, a;
  if (o)
    i = Fx, a = o;
  else {
    const p = e.match(/^matrix\(([-\d.e\s,]+)\)$/u);
    i = Ix, a = p;
  }
  if (!a)
    return vc(n);
  const c = i[n], d = a[1].split(",").map(Lx);
  return typeof c == "function" ? c(d) : d[c];
}
const Ox = (e, n) => {
  const { transform: o = "none" } = getComputedStyle(e);
  return Sc(o, n);
};
function Lx(e) {
  return parseFloat(e.trim());
}
const lo = [
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
], uo = /* @__PURE__ */ new Set([...lo, "pathRotation"]), ym = (e) => e === ao || e === re, Vx = /* @__PURE__ */ new Set(["x", "y", "z"]), zx = lo.filter((e) => !Vx.has(e));
function Bx(e) {
  const n = [];
  return zx.forEach((o) => {
    const i = e.getValue(o);
    i !== void 0 && (n.push([o, i.get()]), i.set(o.startsWith("scale") ? 1 : 0));
  }), n;
}
const Un = {
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
  x: (e, { transform: n }) => Sc(n, "x"),
  y: (e, { transform: n }) => Sc(n, "y")
};
Un.translateX = Un.x;
Un.translateY = Un.y;
const hr = /* @__PURE__ */ new Set();
let wc = !1, xc = !1, _c = !1;
function Pg() {
  if (xc) {
    const e = Array.from(hr).filter((i) => i.needsMeasurement), n = new Set(e.map((i) => i.element)), o = /* @__PURE__ */ new Map();
    n.forEach((i) => {
      const a = Bx(i);
      a.length && (o.set(i, a), i.render());
    }), e.forEach((i) => i.measureInitialState()), n.forEach((i) => {
      i.render();
      const a = o.get(i);
      a && a.forEach(([c, d]) => {
        var p;
        (p = i.getValue(c)) == null || p.set(d);
      });
    }), e.forEach((i) => i.measureEndState()), e.forEach((i) => {
      i.suspendedScrollY !== void 0 && window.scrollTo(0, i.suspendedScrollY);
    });
  }
  xc = !1, wc = !1, hr.forEach((e) => e.complete(_c)), hr.clear();
}
function Mg() {
  hr.forEach((e) => {
    e.readKeyframes(), e.needsMeasurement && (xc = !0);
  });
}
function Ux() {
  _c = !0, Mg(), Pg(), _c = !1;
}
class md {
  constructor(n, o, i, a, c, d = !1) {
    this.state = "pending", this.isAsync = !1, this.needsMeasurement = !1, this.unresolvedKeyframes = [...n], this.onComplete = o, this.name = i, this.motionValue = a, this.element = c, this.isAsync = d;
  }
  scheduleResolve() {
    this.state = "scheduled", this.isAsync ? (hr.add(this), wc || (wc = !0, be.read(Mg), be.resolveKeyframes(Pg))) : (this.readKeyframes(), this.complete());
  }
  readKeyframes() {
    const { unresolvedKeyframes: n, name: o, element: i, motionValue: a } = this;
    if (n[0] === null) {
      const c = a == null ? void 0 : a.get(), d = n[n.length - 1];
      if (c !== void 0)
        n[0] = c;
      else if (i && o) {
        const p = i.readValue(o, d);
        p != null && (n[0] = p);
      }
      n[0] === void 0 && (n[0] = d), a && c === void 0 && a.set(n[0]);
    }
    jx(n);
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
    this.state = "complete", this.onComplete(this.unresolvedKeyframes, this.finalKeyframe, n), hr.delete(this);
  }
  cancel() {
    this.state === "scheduled" && (hr.delete(this), this.state = "pending");
  }
  resume() {
    this.state === "pending" && this.scheduleResolve();
  }
}
const $x = (e) => e.startsWith("--");
function Rg(e, n, o) {
  $x(n) ? e.style.setProperty(n, o) : e.style[n] = o;
}
const Hx = {};
function Ng(e, n) {
  const o = /* @__PURE__ */ ig(e);
  return () => Hx[n] ?? o();
}
const Wx = /* @__PURE__ */ Ng(() => window.ScrollTimeline !== void 0, "scrollTimeline"), Dg = /* @__PURE__ */ Ng(() => {
  try {
    document.createElement("div").animate({ opacity: 0 }, { easing: "linear(0, 1)" });
  } catch {
    return !1;
  }
  return !0;
}, "linearEasing"), oi = ([e, n, o, i]) => `cubic-bezier(${e}, ${n}, ${o}, ${i})`, gm = {
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
function jg(e, n) {
  if (e)
    return typeof e == "function" ? Dg() ? Cg(e, n) : "ease-out" : /* @__PURE__ */ yg(e) ? oi(e) : Array.isArray(e) ? e.map((o) => jg(o, n) || gm.easeOut) : gm[e];
}
function Gx(e, n, o, { delay: i = 0, duration: a = 300, repeat: c = 0, repeatType: d = "loop", ease: p = "easeOut", times: y } = {}, g = void 0) {
  const S = {
    [n]: o
  };
  y && (S.offset = y);
  const l = jg(p, a);
  Array.isArray(l) && (S.easing = l);
  const f = {
    delay: i,
    duration: a,
    easing: Array.isArray(l) ? "linear" : l,
    fill: "both",
    iterations: c + 1,
    direction: d === "reverse" ? "alternate" : "normal"
  };
  return g && (f.pseudoElement = g), e.animate(S, f);
}
function Ig(e) {
  return typeof e == "function" && "applyToOptions" in e;
}
function Kx({ type: e, ...n }) {
  return Ig(e) && Dg() ? e.applyToOptions(n) : (n.duration ?? (n.duration = 300), n.ease ?? (n.ease = "easeOut"), n);
}
class Fg extends hd {
  constructor(n) {
    if (super(), this.finishedTime = null, this.isStopped = !1, this.manualStartTime = null, !n)
      return;
    const { element: o, name: i, keyframes: a, pseudoElement: c, allowFlatten: d = !1, finalKeyframe: p, onComplete: y } = n;
    this.isPseudoElement = !!c, this.allowFlatten = d, this.options = n, vr(typeof n.type != "string", `Mini animate() doesn't support "type" as a string.`, "mini-spring");
    const g = Kx(n);
    this.animation = Gx(o, i, a, g, c), g.autoplay === !1 && this.animation.pause(), this.animation.onfinish = () => {
      if (this.finishedTime = this.time, !c) {
        const S = Ma(a, this.options, p, this.speed);
        this.updateMotionValue && this.updateMotionValue(S), Rg(o, i, S), this.animation.cancel();
      }
      y == null || y(), this.notifyFinished();
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
    return /* @__PURE__ */ Pt(Number(n));
  }
  get iterationDuration() {
    const { delay: n = 0 } = this.options || {};
    return this.duration + /* @__PURE__ */ Pt(n);
  }
  get time() {
    return /* @__PURE__ */ Pt(Number(this.animation.currentTime) || 0);
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
    var c;
    return this.allowFlatten && ((c = this.animation.effect) == null || c.updateTiming({ easing: "linear" })), this.animation.onfinish = null, n && Wx() ? (this.animation.timeline = n, o && (this.animation.rangeStart = o), i && (this.animation.rangeEnd = i), Mt) : a(this);
  }
}
const Og = {
  anticipate: fg,
  backInOut: dg,
  circInOut: hg
};
function Yx(e) {
  return e in Og;
}
function Qx(e) {
  typeof e.ease == "string" && Yx(e.ease) && (e.ease = Og[e.ease]);
}
const Hu = 10;
class Xx extends Fg {
  constructor(n) {
    Qx(n), Eg(n), super(n), n.startTime !== void 0 && n.autoplay !== !1 && (this.startTime = n.startTime), this.options = n;
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
    const p = new ma({
      ...d,
      autoplay: !1
    }), y = Math.max(Hu, it.now() - this.startTime), g = on(0, Hu, y - Hu), S = p.sample(y).value, { name: l } = this.options;
    c && l && Rg(c, l, S), o.setWithVelocity(p.sample(Math.max(0, y - g)).value, S, g), p.stop();
  }
}
const vm = (e, n) => n === "zIndex" ? !1 : !!(typeof e == "number" || Array.isArray(e) || typeof e == "string" && // It's animatable if we have a string
($t.test(e) || e === "0") && // And it contains numbers and/or colors
!e.startsWith("url("));
function Zx(e) {
  const n = e[0];
  if (e.length === 1)
    return !0;
  for (let o = 0; o < e.length; o++)
    if (e[o] !== n)
      return !0;
}
function qx(e, n, o, i) {
  const a = e[0];
  if (a === null)
    return !1;
  if (n === "display" || n === "visibility")
    return !0;
  const c = e[e.length - 1], d = vm(a, n), p = vm(c, n);
  return ki(d === p, `You are trying to animate ${n} from "${a}" to "${c}". "${d ? c : a}" is not an animatable value.`, "value-not-animatable"), !d || !p ? !1 : Zx(e) || (o === "spring" || Ig(o)) && i;
}
function kc(e) {
  e.duration = 0, e.type = "keyframes";
}
const Lg = /* @__PURE__ */ new Set([
  "opacity",
  "clipPath",
  "filter",
  "transform"
  // TODO: Can be accelerated but currently disabled until https://issues.chromium.org/issues/41491098 is resolved
  // or until we implement support for linear() easing.
  // "background-color"
]), Jx = /^(?:oklch|oklab|lab|lch|color|color-mix|light-dark)\(/;
function e_(e) {
  for (let n = 0; n < e.length; n++)
    if (typeof e[n] == "string" && Jx.test(e[n]))
      return !0;
  return !1;
}
const t_ = /* @__PURE__ */ new Set([
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
]), n_ = /* @__PURE__ */ ig(() => Object.hasOwnProperty.call(Element.prototype, "animate"));
function r_(e) {
  var l;
  const { motionValue: n, name: o, repeatDelay: i, repeatType: a, damping: c, type: d, keyframes: p } = e;
  if (!(((l = n == null ? void 0 : n.owner) == null ? void 0 : l.current) instanceof HTMLElement))
    return !1;
  const { onUpdate: g, transformTemplate: S } = n.owner.getProps();
  return n_() && o && /**
   * Force WAAPI for color properties with browser-only color formats
   * (oklch, oklab, lab, lch, etc.) that the JS animation path can't parse.
   */
  (Lg.has(o) || t_.has(o) && e_(p)) && (o !== "transform" || !S) && /**
   * If we're outputting values to onUpdate then we can't use WAAPI as there's
   * no way to read the value from WAAPI every frame.
   */
  !g && !i && a !== "mirror" && c !== 0 && d !== "inertia";
}
const o_ = 40;
class i_ extends hd {
  constructor({ autoplay: n = !0, delay: o = 0, type: i = "keyframes", repeat: a = 0, repeatDelay: c = 0, repeatType: d = "loop", keyframes: p, name: y, motionValue: g, element: S, ...l }) {
    var x;
    super(), this.stop = () => {
      var T, k;
      this._animation && (this._animation.stop(), (T = this.stopTimeline) == null || T.call(this)), (k = this.keyframeResolver) == null || k.cancel();
    }, this.createdAt = it.now();
    const f = {
      autoplay: n,
      delay: o,
      type: i,
      repeat: a,
      repeatDelay: c,
      repeatType: d,
      name: y,
      motionValue: g,
      element: S,
      ...l
    }, v = (S == null ? void 0 : S.KeyframeResolver) || md;
    this.keyframeResolver = new v(p, (T, k, A) => this.onKeyframesResolved(T, k, f, !A), y, g, S), (x = this.keyframeResolver) == null || x.scheduleResolve();
  }
  onKeyframesResolved(n, o, i, a) {
    var A, R;
    this.keyframeResolver = void 0;
    const { name: c, type: d, velocity: p, delay: y, isHandoff: g, onUpdate: S } = i;
    this.resolvedAt = it.now();
    let l = !0;
    qx(n, c, d, p) || (l = !1, ($n.instantAnimations || !y) && (S == null || S(Ma(n, i, o))), n[0] = n[n.length - 1], kc(i), i.repeat = 0);
    const v = {
      startTime: a ? this.resolvedAt ? this.resolvedAt - this.createdAt > o_ ? this.resolvedAt : this.createdAt : this.createdAt : void 0,
      finalKeyframe: o,
      ...i,
      keyframes: n
    }, x = l && !g && r_(v), T = (R = (A = v.motionValue) == null ? void 0 : A.owner) == null ? void 0 : R.current;
    let k;
    if (x)
      try {
        k = new Xx({
          ...v,
          element: T
        });
      } catch {
        k = new ma(v);
      }
    else
      k = new ma(v);
    k.finished.then(() => {
      this.notifyFinished();
    }).catch(Mt), this.pendingTimeline && (this.stopTimeline = k.attachTimeline(this.pendingTimeline), this.pendingTimeline = void 0), this._animation = k;
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
    return this._animation || ((n = this.keyframeResolver) == null || n.resume(), Ux()), this._animation;
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
function Vg(e, n, o, i = 0, a = 1) {
  const c = Array.from(e).sort((g, S) => g.sortNodePosition(S)).indexOf(n), d = e.size, p = (d - 1) * i;
  return typeof o == "function" ? o(c, d) : a === 1 ? c * i : p - c * i;
}
const Sm = 30, s_ = (e) => !isNaN(parseFloat(e));
class a_ {
  /**
   * @param init - The initiating value
   * @param config - Optional configuration options
   *
   * -  `transformer`: A function to transform incoming values with.
   */
  constructor(n, o = {}) {
    this.canTrackVelocity = null, this.events = {}, this.updateAndNotify = (i) => {
      var c;
      const a = it.now();
      if (this.updatedAt !== a && this.setPrevFrameValue(), this.prev = this.current, this.setCurrent(i), this.current !== this.prev && ((c = this.events.change) == null || c.notify(this.current), this.dependents))
        for (const d of this.dependents)
          d.dirty();
    }, this.hasAnimated = !1, this.setCurrent(n), this.owner = o.owner;
  }
  setCurrent(n) {
    this.current = n, this.updatedAt = it.now(), this.canTrackVelocity === null && n !== void 0 && (this.canTrackVelocity = s_(this.current));
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
    this.events[n] || (this.events[n] = new sd());
    const i = this.events[n].add(o);
    return n === "change" ? () => {
      i(), be.read(() => {
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
    const n = it.now();
    if (!this.canTrackVelocity || this.prevFrameValue === void 0 || n - this.updatedAt > Sm)
      return 0;
    const o = Math.min(this.updatedAt - this.prevUpdatedAt, Sm);
    return /* @__PURE__ */ sg(parseFloat(this.current) - parseFloat(this.prevFrameValue), o);
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
function ro(e, n) {
  return new a_(e, n);
}
function zg(e, n) {
  if (e != null && e.inherit && n) {
    const { inherit: o, ...i } = e;
    return { ...n, ...i };
  }
  return e;
}
function yd(e, n) {
  const o = (e == null ? void 0 : e[n]) ?? (e == null ? void 0 : e.default) ?? e;
  return o !== e ? zg(o, e) : o;
}
const l_ = {
  type: "spring",
  stiffness: 500,
  damping: 25,
  restSpeed: 10
}, u_ = (e) => ({
  type: "spring",
  stiffness: 550,
  damping: e === 0 ? 2 * Math.sqrt(550) : 30,
  restSpeed: 10
}), c_ = {
  type: "keyframes",
  duration: 0.8
}, d_ = {
  type: "keyframes",
  ease: [0.25, 0.1, 0.35, 1],
  duration: 0.3
}, f_ = (e, { keyframes: n }) => n.length > 2 ? c_ : uo.has(e) ? e.startsWith("scale") ? u_(n[1]) : l_ : d_, p_ = /* @__PURE__ */ new Set([
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
function h_(e) {
  for (const n in e)
    if (!p_.has(n))
      return !0;
  return !1;
}
const gd = (e, n, o, i = {}, a, c) => (d) => {
  const p = yd(i, e) || {}, y = p.delay || i.delay || 0;
  let { elapsed: g = 0 } = i;
  g = g - /* @__PURE__ */ yt(y);
  const S = {
    keyframes: Array.isArray(o) ? o : [null, o],
    ease: "easeOut",
    velocity: n.getVelocity(),
    ...p,
    delay: -g,
    onUpdate: (f) => {
      n.set(f), p.onUpdate && p.onUpdate(f);
    },
    onComplete: () => {
      d(), p.onComplete && p.onComplete();
    },
    name: e,
    motionValue: n,
    element: c ? void 0 : a
  };
  h_(p) || Object.assign(S, f_(e, S)), S.duration && (S.duration = /* @__PURE__ */ yt(S.duration)), S.repeatDelay && (S.repeatDelay = /* @__PURE__ */ yt(S.repeatDelay)), S.from !== void 0 && (S.keyframes[0] = S.from);
  let l = !1;
  if ((S.type === !1 || S.duration === 0 && !S.repeatDelay) && (kc(S), S.delay === 0 && (l = !0)), ($n.instantAnimations || $n.skipAnimations || a != null && a.shouldSkipAnimations || p.skipAnimations) && (l = !0, kc(S), S.delay = 0), S.allowFlatten = !p.type && !p.ease, l && !c && n.get() !== void 0) {
    const f = Ma(S.keyframes, p);
    if (f !== void 0) {
      be.update(() => {
        S.onUpdate(f), S.onComplete();
      });
      return;
    }
  }
  return p.isSync ? new ma(S) : new i_(S);
}, m_ = (
  // eslint-disable-next-line redos-detector/no-unsafe-regex -- false positive, as it can match a lot of words
  /^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u
);
function y_(e) {
  const n = m_.exec(e);
  if (!n)
    return [,];
  const [, o, i, a] = n;
  return [`--${o ?? i}`, a];
}
const g_ = 4;
function Bg(e, n, o = 1) {
  vr(o <= g_, `Max CSS variable fallback depth detected in property "${e}". This may indicate a circular fallback dependency.`, "max-css-var-depth");
  const [i, a] = y_(e);
  if (!i)
    return;
  const c = window.getComputedStyle(n).getPropertyValue(i);
  if (c) {
    const d = c.trim();
    return ng(d) ? parseFloat(d) : d;
  }
  return ud(a) ? Bg(a, n, o + 1) : a;
}
function wm(e) {
  const n = [{}, {}];
  return e == null || e.values.forEach((o, i) => {
    n[0][i] = o.get(), n[1][i] = o.getVelocity();
  }), n;
}
function vd(e, n, o, i) {
  if (typeof n == "function") {
    const [a, c] = wm(i);
    n = n(o !== void 0 ? o : e.custom, a, c);
  }
  if (typeof n == "string" && (n = e.variants && e.variants[n]), typeof n == "function") {
    const [a, c] = wm(i);
    n = n(o !== void 0 ? o : e.custom, a, c);
  }
  return n;
}
function mr(e, n, o) {
  const i = e.getProps();
  return vd(i, n, o !== void 0 ? o : i.custom, e);
}
const Ug = /* @__PURE__ */ new Set([
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
  ...lo
]), Tc = (e) => Array.isArray(e);
function v_(e, n, o) {
  e.hasValue(n) ? e.getValue(n).set(o) : e.addValue(n, ro(o));
}
function S_(e) {
  return Tc(e) ? e[e.length - 1] || 0 : e;
}
function w_(e, n) {
  const o = mr(e, n);
  let { transitionEnd: i = {}, transition: a = {}, ...c } = o || {};
  c = { ...c, ...i };
  for (const d in c) {
    const p = S_(c[d]);
    v_(e, d, p);
  }
}
const qe = (e) => !!(e && e.getVelocity);
function x_(e) {
  return !!(qe(e) && e.add);
}
function Ac(e, n) {
  const o = e.getValue("willChange");
  if (x_(o))
    return o.add(n);
  if (!o && $n.WillChange) {
    const i = new $n.WillChange("auto");
    e.addValue("willChange", i), i.add(n);
  }
}
function Sd(e) {
  return e.replace(/([A-Z])/g, (n) => `-${n.toLowerCase()}`);
}
const __ = "framerAppearId", $g = "data-" + Sd(__);
function Hg(e) {
  return e.props[$g];
}
function k_({ protectedKeys: e, needsAnimating: n }, o) {
  const i = e.hasOwnProperty(o) && n[o] !== !0;
  return n[o] = !1, i;
}
function Wg(e, n, { delay: o = 0, transitionOverride: i, type: a } = {}) {
  let { transition: c, transitionEnd: d, ...p } = n;
  const y = e.getDefaultTransition();
  c = c ? zg(c, y) : y;
  const g = c == null ? void 0 : c.reduceMotion, S = c == null ? void 0 : c.skipAnimations;
  i && (c = i);
  const l = [], f = a && e.animationState && e.animationState.getState()[a], v = c == null ? void 0 : c.path;
  v && v.animateVisualElement(e, p, c, o, l);
  for (const x in p) {
    const T = e.getValue(x, e.latestValues[x] ?? null), k = p[x];
    if (k === void 0 || f && k_(f, x))
      continue;
    const A = {
      delay: o,
      ...yd(c || {}, x)
    };
    S && (A.skipAnimations = !0);
    const R = T.get();
    if (R !== void 0 && !T.isAnimating() && !Array.isArray(k) && k === R && !A.velocity) {
      be.update(() => T.set(k));
      continue;
    }
    let P = !1;
    if (window.MotionHandoffAnimation) {
      const X = Hg(e);
      if (X) {
        const Z = window.MotionHandoffAnimation(X, x, be);
        Z !== null && (A.startTime = Z, P = !0);
      }
    }
    Ac(e, x);
    const D = g ?? e.shouldReduceMotion;
    T.start(gd(x, T, k, D && Ug.has(x) ? { type: !1 } : A, e, P));
    const L = T.animation;
    L && l.push(L);
  }
  if (d) {
    const x = () => be.update(() => {
      d && w_(e, d);
    });
    l.length ? Promise.all(l).then(x) : x();
  }
  return l;
}
function Cc(e, n, o = {}) {
  var y;
  const i = mr(e, n, o.type === "exit" ? (y = e.presenceContext) == null ? void 0 : y.custom : void 0);
  let { transition: a = e.getDefaultTransition() || {} } = i || {};
  o.transitionOverride && (a = o.transitionOverride);
  const c = i ? () => Promise.all(Wg(e, i, o)) : () => Promise.resolve(), d = e.variantChildren && e.variantChildren.size ? (g = 0) => {
    const { delayChildren: S = 0, staggerChildren: l, staggerDirection: f } = a;
    return T_(e, n, g, S, l, f, o);
  } : () => Promise.resolve(), { when: p } = a;
  if (p) {
    const [g, S] = p === "beforeChildren" ? [c, d] : [d, c];
    return g().then(() => S());
  } else
    return Promise.all([c(), d(o.delay)]);
}
function T_(e, n, o = 0, i = 0, a = 0, c = 1, d) {
  const p = [];
  for (const y of e.variantChildren)
    y.notify("AnimationStart", n), p.push(Cc(y, n, {
      ...d,
      delay: o + (typeof i == "function" ? 0 : i) + Vg(e.variantChildren, y, i, a, c)
    }).then(() => y.notify("AnimationComplete", n)));
  return Promise.all(p);
}
function A_(e, n, o = {}) {
  e.notify("AnimationStart", n);
  let i;
  if (Array.isArray(n)) {
    const a = n.map((c) => Cc(e, c, o));
    i = Promise.all(a);
  } else if (typeof n == "string")
    i = Cc(e, n, o);
  else {
    const a = typeof n == "function" ? mr(e, n, o.custom) : n;
    i = Promise.all(Wg(e, a, o));
  }
  return i.then(() => {
    e.notify("AnimationComplete", n);
  });
}
const C_ = {
  test: (e) => e === "auto",
  parse: (e) => e
}, Gg = (e) => (n) => n.test(e), Kg = [ao, re, nn, mn, Z1, X1, C_], xm = (e) => Kg.find(Gg(e));
function b_(e) {
  return typeof e == "number" ? e === 0 : e !== null ? e === "none" || e === "0" || og(e) : !0;
}
const E_ = /* @__PURE__ */ new Set(["brightness", "contrast", "saturate", "opacity"]);
function P_(e) {
  const [n, o] = e.slice(0, -1).split("(");
  if (n === "drop-shadow")
    return e;
  const [i] = o.match(cd) || [];
  if (!i)
    return e;
  const a = o.replace(i, "");
  let c = E_.has(n) ? 1 : 0;
  return i !== o && (c *= 100), n + "(" + c + a + ")";
}
const M_ = /\b([a-z-]*)\(.*?\)/gu, bc = {
  ...$t,
  getAnimatableNone: (e) => {
    const n = e.match(M_);
    return n ? n.map(P_).join(" ") : e;
  }
}, Ec = {
  ...$t,
  getAnimatableNone: (e) => {
    const n = $t.parse(e);
    return $t.createTransformer(e)(n.map((i) => typeof i == "number" ? 0 : typeof i == "object" ? { ...i, alpha: 1 } : i));
  }
}, _m = {
  ...ao,
  transform: Math.round
}, R_ = {
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
  scale: zs,
  scaleX: zs,
  scaleY: zs,
  scaleZ: zs,
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
  opacity: hi,
  originX: lm,
  originY: lm,
  originZ: re
}, ya = {
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
  ...R_,
  zIndex: _m,
  // SVG
  fillOpacity: hi,
  strokeOpacity: hi,
  numOctaves: _m
}, N_ = {
  ...ya,
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
  filter: bc,
  WebkitFilter: bc,
  mask: Ec,
  WebkitMask: Ec
}, Yg = (e) => N_[e], D_ = /* @__PURE__ */ new Set([bc, Ec]);
function Qg(e, n) {
  let o = Yg(e);
  return D_.has(o) || (o = $t), o.getAnimatableNone ? o.getAnimatableNone(n) : void 0;
}
const j_ = /* @__PURE__ */ new Set(["auto", "none", "0"]);
function I_(e, n, o) {
  let i = 0, a;
  for (; i < e.length && !a; ) {
    const c = e[i];
    typeof c == "string" && !j_.has(c) && no(c).values.length && (a = e[i]), i++;
  }
  if (a && o)
    for (const c of n)
      e[c] = Qg(o, a);
}
class F_ extends md {
  constructor(n, o, i, a, c) {
    super(n, o, i, a, c, !0);
  }
  readKeyframes() {
    const { unresolvedKeyframes: n, element: o, name: i } = this;
    if (!o || !o.current)
      return;
    super.readKeyframes();
    for (let S = 0; S < n.length; S++) {
      let l = n[S];
      if (typeof l == "string" && (l = l.trim(), ud(l))) {
        const f = Bg(l, o.current);
        f !== void 0 && (n[S] = f), S === n.length - 1 && (this.finalKeyframe = l);
      }
    }
    if (this.resolveNoneKeyframes(), !Ug.has(i) || n.length !== 2)
      return;
    const [a, c] = n, d = xm(a), p = xm(c), y = am(a), g = am(c);
    if (y !== g && Un[i]) {
      this.needsMeasurement = !0;
      return;
    }
    if (d !== p)
      if (ym(d) && ym(p))
        for (let S = 0; S < n.length; S++) {
          const l = n[S];
          typeof l == "string" && (n[S] = parseFloat(l));
        }
      else Un[i] && (this.needsMeasurement = !0);
  }
  resolveNoneKeyframes() {
    const { unresolvedKeyframes: n, name: o } = this, i = [];
    for (let a = 0; a < n.length; a++)
      (n[a] === null || b_(n[a])) && i.push(a);
    i.length && I_(n, i, o);
  }
  measureInitialState() {
    const { element: n, unresolvedKeyframes: o, name: i } = this;
    if (!n || !n.current)
      return;
    i === "height" && (this.suspendedScrollY = window.pageYOffset), this.measuredOrigin = Un[i](n.measureViewportBox(), window.getComputedStyle(n.current)), o[0] = this.measuredOrigin;
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
    const c = i.length - 1, d = i[c];
    i[c] = Un[o](n.measureViewportBox(), window.getComputedStyle(n.current)), d !== null && this.finalKeyframe === void 0 && (this.finalKeyframe = d), (p = this.removedTransforms) != null && p.length && this.removedTransforms.forEach(([y, g]) => {
      n.getValue(y).set(g);
    }), this.resolveNoneKeyframes();
  }
}
const wd = [
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomRightRadius",
  "borderBottomLeftRadius"
];
function Xg(e, n, o) {
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
const Pc = (e, n) => n && typeof e == "number" ? n.transform(e) : e;
function qs(e) {
  return rg(e) && "offsetHeight" in e && !("ownerSVGElement" in e);
}
const { schedule: xd } = /* @__PURE__ */ gg(queueMicrotask, !1), zt = {
  x: !1,
  y: !1
};
function Zg() {
  return zt.x || zt.y;
}
function O_(e) {
  return e === "x" || e === "y" ? zt[e] ? null : (zt[e] = !0, () => {
    zt[e] = !1;
  }) : zt.x || zt.y ? null : (zt.x = zt.y = !0, () => {
    zt.x = zt.y = !1;
  });
}
function qg(e, n) {
  const o = Xg(e), i = new AbortController(), a = {
    passive: !0,
    ...n,
    signal: i.signal
  };
  return [o, a, () => i.abort()];
}
function L_(e) {
  return !(e.pointerType === "touch" || Zg());
}
function V_(e, n, o = {}) {
  const [i, a, c] = qg(e, o);
  return i.forEach((d) => {
    let p = !1, y = !1, g;
    const S = () => {
      d.removeEventListener("pointerleave", x);
    }, l = (k) => {
      g && (g(k), g = void 0), S();
    }, f = (k) => {
      p = !1, window.removeEventListener("pointerup", f), window.removeEventListener("pointercancel", f), y && (y = !1, l(k));
    }, v = () => {
      p = !0, window.addEventListener("pointerup", f, a), window.addEventListener("pointercancel", f, a);
    }, x = (k) => {
      if (k.pointerType !== "touch") {
        if (p) {
          y = !0;
          return;
        }
        l(k);
      }
    }, T = (k) => {
      if (!L_(k))
        return;
      y = !1;
      const A = n(d, k);
      typeof A == "function" && (g = A, d.addEventListener("pointerleave", x, a));
    };
    d.addEventListener("pointerenter", T, a), d.addEventListener("pointerdown", v, a);
  }), c;
}
const Jg = (e, n) => n ? e === n ? !0 : Jg(e, n.parentElement) : !1, _d = (e) => e.pointerType === "mouse" ? typeof e.button != "number" || e.button <= 0 : e.isPrimary !== !1, z_ = /* @__PURE__ */ new Set([
  "BUTTON",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "A"
]);
function B_(e) {
  return z_.has(e.tagName) || e.isContentEditable === !0;
}
const U_ = /* @__PURE__ */ new Set(["INPUT", "SELECT", "TEXTAREA"]);
function $_(e) {
  return U_.has(e.tagName) || e.isContentEditable === !0;
}
const Js = /* @__PURE__ */ new WeakSet();
function km(e) {
  return (n) => {
    n.key === "Enter" && e(n);
  };
}
function Wu(e, n) {
  e.dispatchEvent(new PointerEvent("pointer" + n, { isPrimary: !0, bubbles: !0 }));
}
const H_ = (e, n) => {
  const o = e.currentTarget;
  if (!o)
    return;
  const i = km(() => {
    if (Js.has(o))
      return;
    Wu(o, "down");
    const a = km(() => {
      Wu(o, "up");
    }), c = () => Wu(o, "cancel");
    o.addEventListener("keyup", a, n), o.addEventListener("blur", c, n);
  });
  o.addEventListener("keydown", i, n), o.addEventListener("blur", () => o.removeEventListener("keydown", i), n);
};
function Tm(e) {
  return _d(e) && !Zg();
}
const Am = /* @__PURE__ */ new WeakSet();
function W_(e, n, o = {}) {
  const [i, a, c] = qg(e, o), d = (p) => {
    const y = p.currentTarget;
    if (!Tm(p) || Am.has(p))
      return;
    Js.add(y), o.stopPropagation && Am.add(p);
    const g = n(y, p), S = { ...a, capture: !0 }, l = (x, T) => {
      window.removeEventListener("pointerup", f, S), window.removeEventListener("pointercancel", v, S), Js.has(y) && Js.delete(y), Tm(x) && typeof g == "function" && g(x, { success: T });
    }, f = (x) => {
      l(x, y === window || y === document || o.useGlobalTarget || Jg(y, x.target));
    }, v = (x) => {
      l(x, !1);
    };
    window.addEventListener("pointerup", f, S), window.addEventListener("pointercancel", v, S);
  };
  return i.forEach((p) => {
    (o.useGlobalTarget ? window : p).addEventListener("pointerdown", d, a), qs(p) && (p.addEventListener("focus", (g) => H_(g, a)), !B_(p) && !p.hasAttribute("tabindex") && (p.tabIndex = 0));
  }), c;
}
function kd(e) {
  return rg(e) && "ownerSVGElement" in e;
}
const ea = /* @__PURE__ */ new WeakMap();
let On;
const ev = (e, n, o) => (i, a) => a && a[0] ? a[0][e + "Size"] : kd(i) && "getBBox" in i ? i.getBBox()[n] : i[o], G_ = /* @__PURE__ */ ev("inline", "width", "offsetWidth"), K_ = /* @__PURE__ */ ev("block", "height", "offsetHeight");
function Y_({ target: e, borderBoxSize: n }) {
  var o;
  (o = ea.get(e)) == null || o.forEach((i) => {
    i(e, {
      get width() {
        return G_(e, n);
      },
      get height() {
        return K_(e, n);
      }
    });
  });
}
function Q_(e) {
  e.forEach(Y_);
}
function X_() {
  typeof ResizeObserver > "u" || (On = new ResizeObserver(Q_));
}
function Z_(e, n) {
  On || X_();
  const o = Xg(e);
  return o.forEach((i) => {
    let a = ea.get(i);
    a || (a = /* @__PURE__ */ new Set(), ea.set(i, a)), a.add(n), On == null || On.observe(i);
  }), () => {
    o.forEach((i) => {
      const a = ea.get(i);
      a == null || a.delete(n), a != null && a.size || On == null || On.unobserve(i);
    });
  };
}
const ta = /* @__PURE__ */ new Set();
let Xr;
function q_() {
  Xr = () => {
    const e = {
      get width() {
        return window.innerWidth;
      },
      get height() {
        return window.innerHeight;
      }
    };
    ta.forEach((n) => n(e));
  }, window.addEventListener("resize", Xr);
}
function J_(e) {
  return ta.add(e), Xr || q_(), () => {
    ta.delete(e), !ta.size && typeof Xr == "function" && (window.removeEventListener("resize", Xr), Xr = void 0);
  };
}
function Cm(e, n) {
  return typeof e == "function" ? J_(e) : Z_(e, n);
}
function ek(e) {
  return kd(e) && e.tagName === "svg";
}
const tk = [...Kg, Be, $t], nk = (e) => tk.find(Gg(e)), bm = () => ({
  translate: 0,
  scale: 1,
  origin: 0,
  originPoint: 0
}), Zr = () => ({
  x: bm(),
  y: bm()
}), Em = () => ({ min: 0, max: 0 }), He = () => ({
  x: Em(),
  y: Em()
}), rk = /* @__PURE__ */ new WeakMap();
function Ra(e) {
  return e !== null && typeof e == "object" && typeof e.start == "function";
}
function mi(e) {
  return typeof e == "string" || Array.isArray(e);
}
const Td = [
  "animate",
  "whileInView",
  "whileFocus",
  "whileHover",
  "whileTap",
  "whileDrag",
  "exit"
], Ad = ["initial", ...Td];
function Na(e) {
  return Ra(e.animate) || Ad.some((n) => mi(e[n]));
}
function tv(e) {
  return !!(Na(e) || e.variants);
}
function ok(e, n, o) {
  for (const i in n) {
    const a = n[i], c = o[i];
    if (qe(a))
      e.addValue(i, a);
    else if (qe(c))
      e.addValue(i, ro(a, { owner: e }));
    else if (c !== a)
      if (e.hasValue(i)) {
        const d = e.getValue(i);
        d.liveStyle === !0 ? d.jump(a) : d.hasAnimated || d.set(a);
      } else {
        const d = e.getStaticValue(i);
        e.addValue(i, ro(d !== void 0 ? d : a, { owner: e }));
      }
  }
  for (const i in o)
    n[i] === void 0 && e.removeValue(i);
  return n;
}
const Mc = { current: null }, nv = { current: !1 }, ik = typeof window < "u";
function sk() {
  if (nv.current = !0, !!ik)
    if (window.matchMedia) {
      const e = window.matchMedia("(prefers-reduced-motion)"), n = () => Mc.current = e.matches;
      e.addEventListener("change", n), n();
    } else
      Mc.current = !1;
}
const Pm = [
  "AnimationStart",
  "AnimationComplete",
  "Update",
  "BeforeLayoutMeasure",
  "LayoutMeasure",
  "LayoutAnimationStart",
  "LayoutAnimationComplete"
];
let ga = {};
function rv(e) {
  ga = e;
}
function ak() {
  return ga;
}
class lk {
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
  constructor({ parent: n, props: o, presenceContext: i, reducedMotionConfig: a, skipAnimations: c, blockInitialAnimation: d, visualState: p }, y = {}) {
    this.current = null, this.children = /* @__PURE__ */ new Set(), this.isVariantNode = !1, this.isControllingVariants = !1, this.shouldReduceMotion = null, this.shouldSkipAnimations = !1, this.values = /* @__PURE__ */ new Map(), this.KeyframeResolver = md, this.features = {}, this.valueSubscriptions = /* @__PURE__ */ new Map(), this.prevMotionValues = {}, this.hasBeenMounted = !1, this.events = {}, this.propEventSubscriptions = {}, this.notifyUpdate = () => this.notify("Update", this.latestValues), this.render = () => {
      this.current && (this.triggerBuild(), this.renderInstance(this.current, this.renderState, this.props.style, this.projection));
    }, this.renderScheduledAt = 0, this.scheduleRender = () => {
      const v = it.now();
      this.renderScheduledAt < v && (this.renderScheduledAt = v, be.render(this.render, !1, !0));
    };
    const { latestValues: g, renderState: S } = p;
    this.latestValues = g, this.baseTarget = { ...g }, this.initialValues = o.initial ? { ...g } : {}, this.renderState = S, this.parent = n, this.props = o, this.presenceContext = i, this.depth = n ? n.depth + 1 : 0, this.reducedMotionConfig = a, this.skipAnimationsConfig = c, this.options = y, this.blockInitialAnimation = !!d, this.isControllingVariants = Na(o), this.isVariantNode = tv(o), this.isVariantNode && (this.variantChildren = /* @__PURE__ */ new Set()), this.manuallyAnimateOnMount = !!(n && n.current);
    const { willChange: l, ...f } = this.scrapeMotionValuesFromProps(o, {}, this);
    for (const v in f) {
      const x = f[v];
      g[v] !== void 0 && qe(x) && x.set(g[v]);
    }
  }
  mount(n) {
    var o, i;
    if (this.hasBeenMounted)
      for (const a in this.initialValues)
        (o = this.values.get(a)) == null || o.jump(this.initialValues[a]), this.latestValues[a] = this.initialValues[a];
    this.current = n, rk.set(n, this), this.projection && !this.projection.instance && this.projection.mount(n), this.parent && this.isVariantNode && !this.isControllingVariants && (this.removeFromVariantTree = this.parent.addVariantChild(this)), this.values.forEach((a, c) => this.bindToMotionValue(c, a)), this.reducedMotionConfig === "never" ? this.shouldReduceMotion = !1 : this.reducedMotionConfig === "always" ? this.shouldReduceMotion = !0 : (nv.current || sk(), this.shouldReduceMotion = Mc.current), this.shouldSkipAnimations = this.skipAnimationsConfig ?? !1, (i = this.parent) == null || i.addChild(this), this.update(this.props, this.presenceContext), this.hasBeenMounted = !0;
  }
  unmount() {
    var n;
    this.projection && this.projection.unmount(), Hn(this.notifyUpdate), Hn(this.render), this.valueSubscriptions.forEach((o) => o()), this.valueSubscriptions.clear(), this.removeFromVariantTree && this.removeFromVariantTree(), (n = this.parent) == null || n.removeChild(this);
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
    if (this.valueSubscriptions.has(n) && this.valueSubscriptions.get(n)(), o.accelerate && Lg.has(n) && this.current instanceof HTMLElement) {
      const { factory: d, keyframes: p, times: y, ease: g, duration: S } = o.accelerate, l = new Fg({
        element: this.current,
        name: n,
        keyframes: p,
        times: y,
        ease: g,
        duration: /* @__PURE__ */ yt(S)
      }), f = d(l);
      this.valueSubscriptions.set(n, () => {
        f(), l.cancel();
      });
      return;
    }
    const i = uo.has(n);
    i && this.onBindTransform && this.onBindTransform();
    const a = o.on("change", (d) => {
      this.latestValues[n] = d, this.props.onUpdate && be.preRender(this.notifyUpdate), i && this.projection && (this.projection.isTransformDirty = !0), this.scheduleRender();
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
    for (n in ga) {
      const o = ga[n];
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
    for (let i = 0; i < Pm.length; i++) {
      const a = Pm[i];
      this.propEventSubscriptions[a] && (this.propEventSubscriptions[a](), delete this.propEventSubscriptions[a]);
      const c = "on" + a, d = n[c];
      d && (this.propEventSubscriptions[a] = this.on(a, d));
    }
    this.prevMotionValues = ok(this, this.scrapeMotionValuesFromProps(n, this.prevProps || {}, this), this.prevMotionValues), this.handleChildMotionValue && this.handleChildMotionValue();
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
    return i === void 0 && o !== void 0 && (i = ro(o === null ? void 0 : o, { owner: this }), this.addValue(n, i)), i;
  }
  /**
   * If we're trying to animate to a previously unencountered value,
   * we need to check for it in our state and as a last resort read it
   * directly from the instance (which might have performance implications).
   */
  readValue(n, o) {
    let i = this.latestValues[n] !== void 0 || !this.current ? this.latestValues[n] : this.getBaseTargetFromProps(this.props, n) ?? this.readValueFromInstance(this.current, n, this.options);
    return i != null && (typeof i == "string" && (ng(i) || og(i)) ? i = parseFloat(i) : !nk(i) && $t.test(o) && (i = Qg(n, o)), this.setBaseTarget(n, qe(i) ? i.get() : i)), qe(i) ? i.get() : i;
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
      const d = vd(this.props, o, (c = this.presenceContext) == null ? void 0 : c.custom);
      d && (i = d[n]);
    }
    if (o && i !== void 0)
      return i;
    const a = this.getBaseTargetFromProps(this.props, n);
    return a !== void 0 && !qe(a) ? a : this.initialValues[n] !== void 0 && i === void 0 ? void 0 : this.baseTarget[n];
  }
  on(n, o) {
    return this.events[n] || (this.events[n] = new sd()), this.events[n].add(o);
  }
  notify(n, ...o) {
    this.events[n] && this.events[n].notify(...o);
  }
  scheduleRenderMicrotask() {
    xd.render(this.render);
  }
}
class ov extends lk {
  constructor() {
    super(...arguments), this.KeyframeResolver = F_;
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
class Gn {
  constructor(n) {
    this.isMounted = !1, this.node = n;
  }
  update() {
  }
}
function iv({ top: e, left: n, right: o, bottom: i }) {
  return {
    x: { min: n, max: o },
    y: { min: e, max: i }
  };
}
function uk({ x: e, y: n }) {
  return { top: n.min, right: e.max, bottom: n.max, left: e.min };
}
function ck(e, n) {
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
function Gu(e) {
  return e === void 0 || e === 1;
}
function Rc({ scale: e, scaleX: n, scaleY: o }) {
  return !Gu(e) || !Gu(n) || !Gu(o);
}
function ur(e) {
  return Rc(e) || sv(e) || e.z || e.rotate || e.rotateX || e.rotateY || e.skewX || e.skewY;
}
function sv(e) {
  return Mm(e.x) || Mm(e.y);
}
function Mm(e) {
  return e && e !== "0%";
}
function va(e, n, o) {
  const i = e - o, a = n * i;
  return o + a;
}
function Rm(e, n, o, i, a) {
  return a !== void 0 && (e = va(e, a, i)), va(e, o, i) + n;
}
function Nc(e, n = 0, o = 1, i, a) {
  e.min = Rm(e.min, n, o, i, a), e.max = Rm(e.max, n, o, i, a);
}
function av(e, { x: n, y: o }) {
  Nc(e.x, n.translate, n.scale, n.originPoint), Nc(e.y, o.translate, o.scale, o.originPoint);
}
const Nm = 0.999999999999, Dm = 1.0000000000001;
function dk(e, n, o, i = !1) {
  var p;
  const a = o.length;
  if (!a)
    return;
  n.x = n.y = 1;
  let c, d;
  for (let y = 0; y < a; y++) {
    c = o[y], d = c.projectionDelta;
    const { visualElement: g } = c.options;
    g && g.props.style && g.props.style.display === "contents" || (i && c.options.layoutScroll && c.scroll && c !== c.root && (en(e.x, -c.scroll.offset.x), en(e.y, -c.scroll.offset.y)), d && (n.x *= d.x.scale, n.y *= d.y.scale, av(e, d)), i && ur(c.latestValues) && na(e, c.latestValues, (p = c.layout) == null ? void 0 : p.layoutBox));
  }
  n.x < Dm && n.x > Nm && (n.x = 1), n.y < Dm && n.y > Nm && (n.y = 1);
}
function en(e, n) {
  e.min += n, e.max += n;
}
function jm(e, n, o, i, a = 0.5) {
  const c = Ce(e.min, e.max, a);
  Nc(e, n, o, c, i);
}
function Im(e, n) {
  return typeof e == "string" ? parseFloat(e) / 100 * (n.max - n.min) : e;
}
function na(e, n, o) {
  const i = o ?? e;
  jm(e.x, Im(n.x, i.x), n.scaleX, n.scale, n.originX), jm(e.y, Im(n.y, i.y), n.scaleY, n.scale, n.originY);
}
function lv(e, n) {
  return iv(ck(e.getBoundingClientRect(), n));
}
function fk(e, n, o) {
  const i = lv(e, o), { scroll: a } = n;
  return a && (en(i.x, a.offset.x), en(i.y, a.offset.y)), i;
}
const pk = {
  x: "translateX",
  y: "translateY",
  z: "translateZ",
  transformPerspective: "perspective"
}, hk = lo.length;
function mk(e, n, o) {
  let i = "", a = !0;
  for (let d = 0; d < hk; d++) {
    const p = lo[d], y = e[p];
    if (y === void 0)
      continue;
    let g = !0;
    if (typeof y == "number")
      g = y === (p.startsWith("scale") ? 1 : 0);
    else {
      const S = parseFloat(y);
      g = p.startsWith("scale") ? S === 1 : S === 0;
    }
    if (!g || o) {
      const S = Pc(y, ya[p]);
      if (!g) {
        a = !1;
        const l = pk[p] || p;
        i += `${l}(${S}) `;
      }
      o && (n[p] = S);
    }
  }
  const c = e.pathRotation;
  return c && (a = !1, i += `rotate(${Pc(c, ya.pathRotation)}) `), i = i.trim(), o ? i = o(n, a ? "" : i) : a && (i = "none"), i;
}
function Cd(e, n, o) {
  const { style: i, vars: a, transformOrigin: c } = e;
  let d = !1, p = !1;
  for (const y in n) {
    const g = n[y];
    if (uo.has(y)) {
      d = !0;
      continue;
    } else if (Sg(y)) {
      a[y] = g;
      continue;
    } else {
      const S = Pc(g, ya[y]);
      y.startsWith("origin") ? (p = !0, c[y] = S) : i[y] = S;
    }
  }
  if (n.transform || (d || o ? i.transform = mk(n, e.transform, o) : i.transform && (i.transform = "none")), p) {
    const { originX: y = "50%", originY: g = "50%", originZ: S = 0 } = c;
    i.transformOrigin = `${y} ${g} ${S}`;
  }
}
function uv(e, { style: n, vars: o }, i, a) {
  const c = e.style;
  let d;
  for (d in n)
    c[d] = n[d];
  a == null || a.applyProjectionStyles(c, i);
  for (d in o)
    c.setProperty(d, o[d]);
}
function Fm(e, n) {
  return n.max === n.min ? 0 : e / (n.max - n.min) * 100;
}
const ei = {
  correct: (e, n) => {
    if (!n.target)
      return e;
    if (typeof e == "string")
      if (re.test(e))
        e = parseFloat(e);
      else
        return e;
    const o = Fm(e, n.target.x), i = Fm(e, n.target.y);
    return `${o}% ${i}%`;
  }
}, yk = {
  correct: (e, { treeScale: n, projectionDelta: o }) => {
    const i = e, a = $t.parse(e);
    if (a.length > 5)
      return i;
    const c = $t.createTransformer(e), d = typeof a[0] != "number" ? 1 : 0, p = o.x.scale * n.x, y = o.y.scale * n.y;
    a[0 + d] /= p, a[1 + d] /= y;
    const g = Ce(p, y, 0.5);
    return typeof a[2 + d] == "number" && (a[2 + d] /= g), typeof a[3 + d] == "number" && (a[3 + d] /= g), c(a);
  }
}, Dc = {
  borderRadius: {
    ...ei,
    applyTo: [...wd]
  },
  borderTopLeftRadius: ei,
  borderTopRightRadius: ei,
  borderBottomLeftRadius: ei,
  borderBottomRightRadius: ei,
  boxShadow: yk
};
function cv(e, { layout: n, layoutId: o }) {
  return uo.has(e) || e.startsWith("origin") || (n || o !== void 0) && (!!Dc[e] || e === "opacity");
}
function bd(e, n, o) {
  var d;
  const i = e.style, a = n == null ? void 0 : n.style, c = {};
  if (!i)
    return c;
  for (const p in i)
    (qe(i[p]) || a && qe(a[p]) || cv(p, e) || ((d = o == null ? void 0 : o.getValue(p)) == null ? void 0 : d.liveStyle) !== void 0) && (c[p] = i[p]);
  return c;
}
function gk(e) {
  return window.getComputedStyle(e);
}
class vk extends ov {
  constructor() {
    super(...arguments), this.type = "html", this.renderInstance = uv;
  }
  readValueFromInstance(n, o) {
    var i;
    if (uo.has(o))
      return (i = this.projection) != null && i.isProjecting ? vc(o) : Ox(n, o);
    {
      const a = gk(n), c = (Sg(o) ? a.getPropertyValue(o) : a[o]) || 0;
      return typeof c == "string" ? c.trim() : c;
    }
  }
  measureInstanceViewportBox(n, { transformPagePoint: o }) {
    return lv(n, o);
  }
  build(n, o, i) {
    Cd(n, o, i.transformTemplate);
  }
  scrapeMotionValuesFromProps(n, o, i) {
    return bd(n, o, i);
  }
}
const Sk = {
  offset: "stroke-dashoffset",
  array: "stroke-dasharray"
}, wk = {
  offset: "strokeDashoffset",
  array: "strokeDasharray"
};
function xk(e, n, o = 1, i = 0, a = !0) {
  e.pathLength = 1;
  const c = a ? Sk : wk;
  e[c.offset] = `${-i}`, e[c.array] = `${n} ${o}`;
}
const _k = [
  "offsetDistance",
  "offsetPath",
  "offsetRotate",
  "offsetAnchor"
];
function dv(e, {
  attrX: n,
  attrY: o,
  attrScale: i,
  pathLength: a,
  pathSpacing: c = 1,
  pathOffset: d = 0,
  // This is object creation, which we try to avoid per-frame.
  ...p
}, y, g, S) {
  if (Cd(e, p, g), y) {
    e.style.viewBox && (e.attrs.viewBox = e.style.viewBox);
    return;
  }
  e.attrs = e.style, e.style = {};
  const { attrs: l, style: f } = e;
  l.transform && (f.transform = l.transform, delete l.transform), (f.transform || l.transformOrigin) && (f.transformOrigin = l.transformOrigin ?? "50% 50%", delete l.transformOrigin), f.transform && (f.transformBox = (S == null ? void 0 : S.transformBox) ?? "fill-box", delete l.transformBox);
  for (const v of _k)
    l[v] !== void 0 && (f[v] = l[v], delete l[v]);
  n !== void 0 && (l.x = n), o !== void 0 && (l.y = o), i !== void 0 && (l.scale = i), a !== void 0 && xk(l, a, c, d, !1);
}
const fv = /* @__PURE__ */ new Set([
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
]), pv = (e) => typeof e == "string" && e.toLowerCase() === "svg";
function kk(e, n, o, i) {
  uv(e, n, void 0, i);
  for (const a in n.attrs)
    e.setAttribute(fv.has(a) ? a : Sd(a), n.attrs[a]);
}
function hv(e, n, o) {
  const i = bd(e, n, o);
  for (const a in e)
    if (qe(e[a]) || qe(n[a])) {
      const c = lo.indexOf(a) !== -1 ? "attr" + a.charAt(0).toUpperCase() + a.substring(1) : a;
      i[c] = e[a];
    }
  return i;
}
class Tk extends ov {
  constructor() {
    super(...arguments), this.type = "svg", this.isSVGTag = !1, this.measureInstanceViewportBox = He;
  }
  getBaseTargetFromProps(n, o) {
    return n[o];
  }
  readValueFromInstance(n, o) {
    if (uo.has(o)) {
      const i = Yg(o);
      return i && i.default || 0;
    }
    return o = fv.has(o) ? o : Sd(o), n.getAttribute(o);
  }
  scrapeMotionValuesFromProps(n, o, i) {
    return hv(n, o, i);
  }
  build(n, o, i) {
    dv(n, o, this.isSVGTag, i.transformTemplate, i.style);
  }
  renderInstance(n, o, i, a) {
    kk(n, o, i, a);
  }
  mount(n) {
    this.isSVGTag = pv(n.tagName), super.mount(n);
  }
}
const Ak = Ad.length;
function mv(e) {
  if (!e)
    return;
  if (!e.isControllingVariants) {
    const o = e.parent ? mv(e.parent) || {} : {};
    return e.props.initial !== void 0 && (o.initial = e.props.initial), o;
  }
  const n = {};
  for (let o = 0; o < Ak; o++) {
    const i = Ad[o], a = e.props[i];
    (mi(a) || a === !1) && (n[i] = a);
  }
  return n;
}
function yv(e, n) {
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
const Ck = [...Td].reverse(), bk = Td.length;
function Ek(e) {
  return (n) => Promise.all(n.map(({ animation: o, options: i }) => A_(e, o, i)));
}
function Pk(e) {
  let n = Ek(e), o = Om(), i = !0, a = !1;
  const c = (g) => (S, l) => {
    var v;
    const f = mr(e, l, g === "exit" ? (v = e.presenceContext) == null ? void 0 : v.custom : void 0);
    if (f) {
      const { transition: x, transitionEnd: T, ...k } = f;
      S = { ...S, ...k, ...T };
    }
    return S;
  };
  function d(g) {
    n = g(e);
  }
  function p(g) {
    const { props: S } = e, l = mv(e.parent) || {}, f = [], v = /* @__PURE__ */ new Set();
    let x = {}, T = 1 / 0;
    for (let A = 0; A < bk; A++) {
      const R = Ck[A], P = o[R], D = S[R] !== void 0 ? S[R] : l[R], L = mi(D), X = R === g ? P.isActive : null;
      X === !1 && (T = A);
      let Z = D === l[R] && D !== S[R] && L;
      if (Z && (i || a) && e.manuallyAnimateOnMount && (Z = !1), P.protectedKeys = { ...x }, // If it isn't active and hasn't *just* been set as inactive
      !P.isActive && X === null || // If we didn't and don't have any defined prop for this animation type
      !D && !P.prevProp || // Or if the prop doesn't define an animation
      Ra(D) || typeof D == "boolean")
        continue;
      if (R === "exit" && P.isActive && X !== !0) {
        P.prevResolvedValues && (x = {
          ...x,
          ...P.prevResolvedValues
        });
        continue;
      }
      const U = Mk(P.prevProp, D);
      let G = U || // If we're making this variant active, we want to always make it active
      R === g && P.isActive && !Z && L || // If we removed a higher-priority variant (i is in reverse order)
      A > T && L, Q = !1;
      const J = Array.isArray(D) ? D : [D];
      let ce = J.reduce(c(R), {});
      X === !1 && (ce = {});
      const { prevResolvedValues: ye = {} } = P, he = {
        ...ye,
        ...ce
      }, we = (V) => {
        G = !0, v.has(V) && (Q = !0, v.delete(V)), P.needsAnimating[V] = !0;
        const q = e.getValue(V);
        q && (q.liveStyle = !1);
      };
      for (const V in he) {
        const q = ce[V], K = ye[V];
        if (x.hasOwnProperty(V))
          continue;
        let b = !1;
        Tc(q) && Tc(K) ? b = !yv(q, K) || U : b = q !== K, b ? q != null ? we(V) : v.add(V) : q !== void 0 && v.has(V) ? we(V) : P.protectedKeys[V] = !0;
      }
      P.prevProp = D, P.prevResolvedValues = ce, P.isActive && (x = { ...x, ...ce }), (i || a) && e.blockInitialAnimation && (G = !1);
      const ue = Z && U;
      G && (!ue || Q) && f.push(...J.map((V) => {
        const q = { type: R };
        if (typeof V == "string" && (i || a) && !ue && e.manuallyAnimateOnMount && e.parent) {
          const { parent: K } = e, b = mr(K, V);
          if (K.enteringChildren && b) {
            const { delayChildren: O } = b.transition || {};
            q.delay = Vg(K.enteringChildren, e, O);
          }
        }
        return {
          animation: V,
          options: q
        };
      }));
    }
    if (v.size) {
      const A = {};
      if (typeof S.initial != "boolean") {
        const R = mr(e, Array.isArray(S.initial) ? S.initial[0] : S.initial);
        R && R.transition && (A.transition = R.transition);
      }
      v.forEach((R) => {
        const P = e.getBaseTarget(R), D = e.getValue(R);
        D && (D.liveStyle = !0), A[R] = P ?? null;
      }), f.push({ animation: A });
    }
    let k = !!f.length;
    return i && (S.initial === !1 || S.initial === S.animate) && !e.manuallyAnimateOnMount && (k = !1), i = !1, a = !1, k ? n(f) : Promise.resolve();
  }
  function y(g, S) {
    var f;
    if (o[g].isActive === S)
      return Promise.resolve();
    (f = e.variantChildren) == null || f.forEach((v) => {
      var x;
      return (x = v.animationState) == null ? void 0 : x.setActive(g, S);
    }), o[g].isActive = S;
    const l = p(g);
    for (const v in o)
      o[v].protectedKeys = {};
    return l;
  }
  return {
    animateChanges: p,
    setActive: y,
    setAnimateFunction: d,
    getState: () => o,
    reset: () => {
      o = Om(), a = !0;
    }
  };
}
function Mk(e, n) {
  return typeof n == "string" ? n !== e : Array.isArray(n) ? !yv(n, e) : !1;
}
function lr(e = !1) {
  return {
    isActive: e,
    protectedKeys: {},
    needsAnimating: {},
    prevResolvedValues: {}
  };
}
function Om() {
  return {
    animate: lr(!0),
    whileInView: lr(),
    whileHover: lr(),
    whileTap: lr(),
    whileDrag: lr(),
    whileFocus: lr(),
    exit: lr()
  };
}
function jc(e, n) {
  e.min = n.min, e.max = n.max;
}
function Lt(e, n) {
  jc(e.x, n.x), jc(e.y, n.y);
}
function Lm(e, n) {
  e.translate = n.translate, e.scale = n.scale, e.originPoint = n.originPoint, e.origin = n.origin;
}
const gv = 1e-4, Rk = 1 - gv, Nk = 1 + gv, vv = 0.01, Dk = 0 - vv, jk = 0 + vv;
function st(e) {
  return e.max - e.min;
}
function Ik(e, n, o) {
  return Math.abs(e - n) <= o;
}
function Vm(e, n, o, i = 0.5) {
  e.origin = i, e.originPoint = Ce(n.min, n.max, e.origin), e.scale = st(o) / st(n), e.translate = Ce(o.min, o.max, e.origin) - e.originPoint, (e.scale >= Rk && e.scale <= Nk || isNaN(e.scale)) && (e.scale = 1), (e.translate >= Dk && e.translate <= jk || isNaN(e.translate)) && (e.translate = 0);
}
function li(e, n, o, i) {
  Vm(e.x, n.x, o.x, i ? i.originX : void 0), Vm(e.y, n.y, o.y, i ? i.originY : void 0);
}
function zm(e, n, o, i = 0) {
  const a = i ? Ce(o.min, o.max, i) : o.min;
  e.min = a + n.min, e.max = e.min + st(n);
}
function Fk(e, n, o, i) {
  zm(e.x, n.x, o.x, i == null ? void 0 : i.x), zm(e.y, n.y, o.y, i == null ? void 0 : i.y);
}
function Bm(e, n, o, i = 0) {
  const a = i ? Ce(o.min, o.max, i) : o.min;
  e.min = n.min - a, e.max = e.min + st(n);
}
function Sa(e, n, o, i) {
  Bm(e.x, n.x, o.x, i == null ? void 0 : i.x), Bm(e.y, n.y, o.y, i == null ? void 0 : i.y);
}
function Um(e, n, o, i, a) {
  return e -= n, e = va(e, 1 / o, i), a !== void 0 && (e = va(e, 1 / a, i)), e;
}
function Ok(e, n = 0, o = 1, i = 0.5, a, c = e, d = e) {
  if (nn.test(n) && (n = parseFloat(n), n = Ce(d.min, d.max, n / 100) - d.min), typeof n != "number")
    return;
  let p = Ce(c.min, c.max, i);
  e === c && (p -= n), e.min = Um(e.min, n, o, p, a), e.max = Um(e.max, n, o, p, a);
}
function $m(e, n, [o, i, a], c, d) {
  Ok(e, n[o], n[i], n[a], n.scale, c, d);
}
const Lk = ["x", "scaleX", "originX"], Vk = ["y", "scaleY", "originY"];
function Hm(e, n, o, i) {
  $m(e.x, n, Lk, o ? o.x : void 0, i ? i.x : void 0), $m(e.y, n, Vk, o ? o.y : void 0, i ? i.y : void 0);
}
function Wm(e) {
  return e.translate === 0 && e.scale === 1;
}
function Sv(e) {
  return Wm(e.x) && Wm(e.y);
}
function Gm(e, n) {
  return e.min === n.min && e.max === n.max;
}
function zk(e, n) {
  return Gm(e.x, n.x) && Gm(e.y, n.y);
}
function Km(e, n) {
  return Math.round(e.min) === Math.round(n.min) && Math.round(e.max) === Math.round(n.max);
}
function wv(e, n) {
  return Km(e.x, n.x) && Km(e.y, n.y);
}
function Ym(e) {
  return st(e.x) / st(e.y);
}
function Qm(e, n) {
  return e.translate === n.translate && e.scale === n.scale && e.originPoint === n.originPoint;
}
function Jt(e) {
  return [e("x"), e("y")];
}
function Bk(e, n, o) {
  let i = "";
  const a = e.x.translate / n.x, c = e.y.translate / n.y, d = (o == null ? void 0 : o.z) || 0;
  if ((a || c || d) && (i = `translate3d(${a}px, ${c}px, ${d}px) `), (n.x !== 1 || n.y !== 1) && (i += `scale(${1 / n.x}, ${1 / n.y}) `), o) {
    const { transformPerspective: g, rotate: S, pathRotation: l, rotateX: f, rotateY: v, skewX: x, skewY: T } = o;
    g && (i = `perspective(${g}px) ${i}`), S && (i += `rotate(${S}deg) `), l && (i += `rotate(${l}deg) `), f && (i += `rotateX(${f}deg) `), v && (i += `rotateY(${v}deg) `), x && (i += `skewX(${x}deg) `), T && (i += `skewY(${T}deg) `);
  }
  const p = e.x.scale * n.x, y = e.y.scale * n.y;
  return (p !== 1 || y !== 1) && (i += `scale(${p}, ${y})`), i || "none";
}
const Uk = wd.length, Xm = (e) => typeof e == "string" ? parseFloat(e) : e, Zm = (e) => typeof e == "number" || re.test(e);
function $k(e, n, o, i, a, c) {
  a ? (e.opacity = Ce(0, o.opacity ?? 1, Hk(i)), e.opacityExit = Ce(n.opacity ?? 1, 0, Wk(i))) : c && (e.opacity = Ce(n.opacity ?? 1, o.opacity ?? 1, i));
  for (let d = 0; d < Uk; d++) {
    const p = wd[d];
    let y = qm(n, p), g = qm(o, p);
    if (y === void 0 && g === void 0)
      continue;
    y || (y = 0), g || (g = 0), y === 0 || g === 0 || Zm(y) === Zm(g) ? (e[p] = Math.max(Ce(Xm(y), Xm(g), i), 0), (nn.test(g) || nn.test(y)) && (e[p] += "%")) : e[p] = g;
  }
  (n.rotate || o.rotate) && (e.rotate = Ce(n.rotate || 0, o.rotate || 0, i));
}
function qm(e, n) {
  return e[n] !== void 0 ? e[n] : e.borderRadius;
}
const Hk = /* @__PURE__ */ xv(0, 0.5, pg), Wk = /* @__PURE__ */ xv(0.5, 0.95, Mt);
function xv(e, n, o) {
  return (i) => i < e ? 0 : i > n ? 1 : o(/* @__PURE__ */ pi(e, n, i));
}
function Gk(e, n, o) {
  const i = qe(e) ? e : ro(e);
  return i.start(gd("", i, n, o)), i.animation;
}
function yi(e, n, o, i = { passive: !0 }) {
  return e.addEventListener(n, o, i), () => e.removeEventListener(n, o, i);
}
const Kk = (e, n) => e.depth - n.depth;
class Yk {
  constructor() {
    this.children = [], this.isDirty = !1;
  }
  add(n) {
    id(this.children, n), this.isDirty = !0;
  }
  remove(n) {
    da(this.children, n), this.isDirty = !0;
  }
  forEach(n) {
    this.isDirty && this.children.sort(Kk), this.isDirty = !1, this.children.forEach(n);
  }
}
function Qk(e, n) {
  const o = it.now(), i = ({ timestamp: a }) => {
    const c = a - o;
    c >= n && (Hn(i), e(c - n));
  };
  return be.setup(i, !0), () => Hn(i);
}
function ra(e) {
  return qe(e) ? e.get() : e;
}
class Xk {
  constructor() {
    this.members = [];
  }
  add(n) {
    id(this.members, n);
    for (let o = this.members.length - 1; o >= 0; o--) {
      const i = this.members[o];
      if (i === n || i === this.lead || i === this.prevLead)
        continue;
      const a = i.instance;
      (!a || a.isConnected === !1) && !i.snapshot && (da(this.members, i), i.unmount());
    }
    n.scheduleRender();
  }
  remove(n) {
    if (da(this.members, n), n === this.prevLead && (this.prevLead = void 0), n === this.lead) {
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
const oa = {
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
}, Ku = ["", "X", "Y", "Z"], Zk = 1e3;
let qk = 0;
function Yu(e, n, o, i) {
  const { latestValues: a } = n;
  a[e] && (o[e] = a[e], n.setStaticValue(e, 0), i && (i[e] = 0));
}
function _v(e) {
  if (e.hasCheckedOptimisedAppear = !0, e.root === e)
    return;
  const { visualElement: n } = e.options;
  if (!n)
    return;
  const o = Hg(n);
  if (window.MotionHasOptimisedAnimation(o, "transform")) {
    const { layout: a, layoutId: c } = e.options;
    window.MotionCancelOptimisedAnimation(o, "transform", be, !(a || c));
  }
  const { parent: i } = e;
  i && !i.hasCheckedOptimisedAppear && _v(i);
}
function kv({ attachResizeListener: e, defaultParent: n, measureScroll: o, checkIsScrollRoot: i, resetTransform: a }) {
  return class {
    constructor(d = {}, p = n == null ? void 0 : n()) {
      this.id = qk++, this.animationId = 0, this.animationCommitId = 0, this.children = /* @__PURE__ */ new Set(), this.options = {}, this.isTreeAnimating = !1, this.isAnimationBlocked = !1, this.isLayoutDirty = !1, this.isProjectionDirty = !1, this.isSharedProjectionDirty = !1, this.isTransformDirty = !1, this.updateManuallyBlocked = !1, this.updateBlockedByResize = !1, this.isUpdating = !1, this.isSVG = !1, this.needsReset = !1, this.shouldResetTransform = !1, this.hasCheckedOptimisedAppear = !1, this.treeScale = { x: 1, y: 1 }, this.eventHandlers = /* @__PURE__ */ new Map(), this.hasTreeAnimated = !1, this.layoutVersion = 0, this.updateScheduled = !1, this.scheduleUpdate = () => this.update(), this.projectionUpdateScheduled = !1, this.checkUpdateFailed = () => {
        this.isUpdating && (this.isUpdating = !1, this.clearAllSnapshots());
      }, this.updateProjection = () => {
        this.projectionUpdateScheduled = !1, this.nodes.forEach(tT), this.nodes.forEach(aT), this.nodes.forEach(lT), this.nodes.forEach(nT);
      }, this.resolvedRelativeTargetAt = 0, this.linkedParentVersion = 0, this.hasProjected = !1, this.isVisible = !0, this.animationProgress = 0, this.sharedNodes = /* @__PURE__ */ new Map(), this.latestValues = d, this.root = p ? p.root || p : this, this.path = p ? [...p.path, p] : [], this.parent = p, this.depth = p ? p.depth + 1 : 0;
      for (let y = 0; y < this.path.length; y++)
        this.path[y].shouldResetTransform = !0;
      this.root === this && (this.nodes = new Yk());
    }
    addEventListener(d, p) {
      return this.eventHandlers.has(d) || this.eventHandlers.set(d, new sd()), this.eventHandlers.get(d).add(p);
    }
    notifyListeners(d, ...p) {
      const y = this.eventHandlers.get(d);
      y && y.notify(...p);
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
      this.isSVG = kd(d) && !ek(d), this.instance = d;
      const { layoutId: p, layout: y, visualElement: g } = this.options;
      if (g && !g.current && g.mount(d), this.root.nodes.add(this), this.parent && this.parent.children.add(this), this.root.hasTreeAnimated && (y || p) && (this.isLayoutDirty = !0), e) {
        let S, l = 0;
        const f = () => this.root.updateBlockedByResize = !1;
        be.read(() => {
          l = window.innerWidth;
        }), e(d, () => {
          const v = window.innerWidth;
          v !== l && (l = v, this.root.updateBlockedByResize = !0, S && S(), S = Qk(f, 250), oa.hasAnimatedSinceResize && (oa.hasAnimatedSinceResize = !1, this.nodes.forEach(ty)));
        });
      }
      p && this.root.registerSharedNode(p, this), this.options.animate !== !1 && g && (p || y) && this.addEventListener("didUpdate", ({ delta: S, hasLayoutChanged: l, hasRelativeLayoutChanged: f, layout: v }) => {
        if (this.isTreeAnimationBlocked()) {
          this.target = void 0, this.relativeTarget = void 0;
          return;
        }
        const x = this.options.transition || g.getDefaultTransition() || pT, { onLayoutAnimationStart: T, onLayoutAnimationComplete: k } = g.getProps(), A = !this.targetLayout || !wv(this.targetLayout, v), R = !l && f;
        if (this.options.layoutRoot || this.resumeFrom || R || l && (A || !this.currentAnimation)) {
          this.resumeFrom && (this.resumingFrom = this.resumeFrom, this.resumingFrom.resumingFrom = void 0);
          const P = {
            ...yd(x, "layout"),
            onPlay: T,
            onComplete: k
          };
          (g.shouldReduceMotion || this.options.layoutRoot) && (P.delay = 0, P.type = !1), this.startAnimation(P), this.setAnimationOrigin(S, R, P.path);
        } else
          l || ty(this), this.isLead() && this.options.onExitComplete && this.options.onExitComplete();
        this.targetLayout = v;
      });
    }
    unmount() {
      this.options.layoutId && this.willUpdate(), this.root.nodes.remove(this);
      const d = this.getStack();
      d && d.remove(this), this.parent && this.parent.children.delete(this), this.instance = void 0, this.eventHandlers.clear(), Hn(this.updateProjection);
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
      this.isUpdateBlocked() || (this.isUpdating = !0, this.nodes && this.nodes.forEach(uT), this.animationId++);
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
      if (window.MotionCancelOptimisedAnimation && !this.hasCheckedOptimisedAppear && _v(this), !this.root.isUpdating && this.root.startUpdate(), this.isLayoutDirty)
        return;
      this.isLayoutDirty = !0;
      for (let S = 0; S < this.path.length; S++) {
        const l = this.path[S];
        l.shouldResetTransform = !0, (typeof l.latestValues.x == "string" || typeof l.latestValues.y == "string") && (l.isLayoutDirty = !0), l.updateScroll("snapshot"), l.options.layoutRoot && l.willUpdate(!1);
      }
      const { layoutId: p, layout: y } = this.options;
      if (p === void 0 && !y)
        return;
      const g = this.getTransformTemplate();
      this.prevTransformTemplateValue = g ? g(this.latestValues, "") : void 0, this.updateSnapshot(), d && this.notifyListeners("willUpdate");
    }
    update() {
      if (this.updateScheduled = !1, this.isUpdateBlocked()) {
        const y = this.updateBlockedByResize;
        this.unblockUpdate(), this.updateBlockedByResize = !1, this.clearAllSnapshots(), y && this.nodes.forEach(oT), this.nodes.forEach(Jm);
        return;
      }
      if (this.animationId <= this.animationCommitId) {
        this.nodes.forEach(ey);
        return;
      }
      this.animationCommitId = this.animationId, this.isUpdating ? (this.isUpdating = !1, this.nodes.forEach(iT), this.nodes.forEach(sT), this.nodes.forEach(Jk), this.nodes.forEach(eT)) : this.nodes.forEach(ey), this.clearAllSnapshots();
      const p = it.now();
      Ze.delta = on(0, 1e3 / 60, p - Ze.timestamp), Ze.timestamp = p, Ze.isProcessing = !0, Vu.update.process(Ze), Vu.preRender.process(Ze), Vu.render.process(Ze), Ze.isProcessing = !1;
    }
    didUpdate() {
      this.updateScheduled || (this.updateScheduled = !0, xd.read(this.scheduleUpdate));
    }
    clearAllSnapshots() {
      this.nodes.forEach(rT), this.sharedNodes.forEach(cT);
    }
    scheduleUpdateProjection() {
      this.projectionUpdateScheduled || (this.projectionUpdateScheduled = !0, be.preRender(this.updateProjection, !1, !0));
    }
    scheduleCheckAfterUnmount() {
      be.postRender(() => {
        this.isLayoutDirty ? this.root.didUpdate() : this.root.checkUpdateFailed();
      });
    }
    /**
     * Update measurements
     */
    updateSnapshot() {
      this.snapshot || !this.instance || (this.snapshot = this.measure(), this.snapshot && !st(this.snapshot.measuredBox.x) && !st(this.snapshot.measuredBox.y) && (this.snapshot = void 0));
    }
    updateLayout() {
      if (!this.instance || (this.updateScroll(), !(this.options.alwaysMeasureLayout && this.isLead()) && !this.isLayoutDirty))
        return;
      if (this.resumeFrom && !this.resumeFrom.instance)
        for (let y = 0; y < this.path.length; y++)
          this.path[y].updateScroll();
      const d = this.layout;
      this.layout = this.measure(!1), this.layoutVersion++, this.layoutCorrected || (this.layoutCorrected = He()), this.isLayoutDirty = !1, this.projectionDelta = void 0, this.notifyListeners("measure", this.layout.layoutBox);
      const { visualElement: p } = this.options;
      p && p.notify("LayoutMeasure", this.layout.layoutBox, d ? d.layoutBox : void 0);
    }
    updateScroll(d = "measure") {
      let p = !!(this.options.layoutScroll && this.instance);
      if (this.scroll && this.scroll.animationId === this.root.animationId && this.scroll.phase === d && (p = !1), p && this.instance) {
        const y = i(this.instance);
        this.scroll = {
          animationId: this.root.animationId,
          phase: d,
          isRoot: y,
          offset: o(this.instance),
          wasRoot: this.scroll ? this.scroll.isRoot : y
        };
      }
    }
    resetTransform() {
      if (!a)
        return;
      const d = this.isLayoutDirty || this.shouldResetTransform || this.options.alwaysMeasureLayout, p = this.projectionDelta && !Sv(this.projectionDelta), y = this.getTransformTemplate(), g = y ? y(this.latestValues, "") : void 0, S = g !== this.prevTransformTemplateValue;
      d && this.instance && (p || ur(this.latestValues) || S) && (a(this.instance, g), this.shouldResetTransform = !1, this.scheduleRender());
    }
    measure(d = !0) {
      const p = this.measurePageBox();
      let y = this.removeElementScroll(p);
      return d && (y = this.removeTransform(y)), hT(y), {
        animationId: this.root.animationId,
        measuredBox: p,
        layoutBox: y,
        latestValues: {},
        source: this.id
      };
    }
    measurePageBox() {
      var g;
      const { visualElement: d } = this.options;
      if (!d)
        return He();
      const p = d.measureViewportBox();
      if (!(((g = this.scroll) == null ? void 0 : g.wasRoot) || this.path.some(mT))) {
        const { scroll: S } = this.root;
        S && (en(p.x, S.offset.x), en(p.y, S.offset.y));
      }
      return p;
    }
    removeElementScroll(d) {
      var y;
      const p = He();
      if (Lt(p, d), (y = this.scroll) != null && y.wasRoot)
        return p;
      for (let g = 0; g < this.path.length; g++) {
        const S = this.path[g], { scroll: l, options: f } = S;
        S !== this.root && l && f.layoutScroll && (l.wasRoot && Lt(p, d), en(p.x, l.offset.x), en(p.y, l.offset.y));
      }
      return p;
    }
    applyTransform(d, p = !1, y) {
      var S, l;
      const g = y || He();
      Lt(g, d);
      for (let f = 0; f < this.path.length; f++) {
        const v = this.path[f];
        !p && v.options.layoutScroll && v.scroll && v !== v.root && (en(g.x, -v.scroll.offset.x), en(g.y, -v.scroll.offset.y)), ur(v.latestValues) && na(g, v.latestValues, (S = v.layout) == null ? void 0 : S.layoutBox);
      }
      return ur(this.latestValues) && na(g, this.latestValues, (l = this.layout) == null ? void 0 : l.layoutBox), g;
    }
    removeTransform(d) {
      var y;
      const p = He();
      Lt(p, d);
      for (let g = 0; g < this.path.length; g++) {
        const S = this.path[g];
        if (!ur(S.latestValues))
          continue;
        let l;
        S.instance && (Rc(S.latestValues) && S.updateSnapshot(), l = He(), Lt(l, S.measurePageBox())), Hm(p, S.latestValues, (y = S.snapshot) == null ? void 0 : y.layoutBox, l);
      }
      return ur(this.latestValues) && Hm(p, this.latestValues), p;
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
      var v;
      const p = this.getLead();
      this.isProjectionDirty || (this.isProjectionDirty = p.isProjectionDirty), this.isTransformDirty || (this.isTransformDirty = p.isTransformDirty), this.isSharedProjectionDirty || (this.isSharedProjectionDirty = p.isSharedProjectionDirty);
      const y = !!this.resumingFrom || this !== p;
      if (!(d || y && this.isSharedProjectionDirty || this.isProjectionDirty || (v = this.parent) != null && v.isProjectionDirty || this.attemptToResolveRelativeTarget || this.root.updateBlockedByResize))
        return;
      const { layout: S, layoutId: l } = this.options;
      if (!this.layout || !(S || l))
        return;
      this.resolvedRelativeTargetAt = Ze.timestamp;
      const f = this.getClosestProjectingParent();
      f && this.linkedParentVersion !== f.layoutVersion && !f.options.layoutRoot && this.removeRelativeTarget(), !this.targetDelta && !this.relativeTarget && (this.options.layoutAnchor !== !1 && f && f.layout ? this.createRelativeTarget(f, this.layout.layoutBox, f.layout.layoutBox) : this.removeRelativeTarget()), !(!this.relativeTarget && !this.targetDelta) && (this.target || (this.target = He(), this.targetWithTransforms = He()), this.relativeTarget && this.relativeTargetOrigin && this.relativeParent && this.relativeParent.target ? (this.forceRelativeParentToResolveTarget(), Fk(this.target, this.relativeTarget, this.relativeParent.target, this.options.layoutAnchor || void 0)) : this.targetDelta ? (this.resumingFrom ? this.applyTransform(this.layout.layoutBox, !1, this.target) : Lt(this.target, this.layout.layoutBox), av(this.target, this.targetDelta)) : Lt(this.target, this.layout.layoutBox), this.attemptToResolveRelativeTarget && (this.attemptToResolveRelativeTarget = !1, this.options.layoutAnchor !== !1 && f && !!f.resumingFrom == !!this.resumingFrom && !f.options.layoutScroll && f.target && this.animationProgress !== 1 ? this.createRelativeTarget(f, this.target, f.target) : this.relativeParent = this.relativeTarget = void 0));
    }
    getClosestProjectingParent() {
      if (!(!this.parent || Rc(this.parent.latestValues) || sv(this.parent.latestValues)))
        return this.parent.isProjecting() ? this.parent : this.parent.getClosestProjectingParent();
    }
    isProjecting() {
      return !!((this.relativeTarget || this.targetDelta || this.options.layoutRoot) && this.layout);
    }
    createRelativeTarget(d, p, y) {
      this.relativeParent = d, this.linkedParentVersion = d.layoutVersion, this.forceRelativeParentToResolveTarget(), this.relativeTarget = He(), this.relativeTargetOrigin = He(), Sa(this.relativeTargetOrigin, p, y, this.options.layoutAnchor || void 0), Lt(this.relativeTarget, this.relativeTargetOrigin);
    }
    removeRelativeTarget() {
      this.relativeParent = this.relativeTarget = void 0;
    }
    calcProjection() {
      var x;
      const d = this.getLead(), p = !!this.resumingFrom || this !== d;
      let y = !0;
      if ((this.isProjectionDirty || (x = this.parent) != null && x.isProjectionDirty) && (y = !1), p && (this.isSharedProjectionDirty || this.isTransformDirty) && (y = !1), this.resolvedRelativeTargetAt === Ze.timestamp && (y = !1), y)
        return;
      const { layout: g, layoutId: S } = this.options;
      if (this.isTreeAnimating = !!(this.parent && this.parent.isTreeAnimating || this.currentAnimation || this.pendingAnimation), this.isTreeAnimating || (this.targetDelta = this.relativeTarget = void 0), !this.layout || !(g || S))
        return;
      Lt(this.layoutCorrected, this.layout.layoutBox);
      const l = this.treeScale.x, f = this.treeScale.y;
      dk(this.layoutCorrected, this.treeScale, this.path, p), d.layout && !d.target && (this.treeScale.x !== 1 || this.treeScale.y !== 1) && (d.target = d.layout.layoutBox, d.targetWithTransforms = He());
      const { target: v } = d;
      if (!v) {
        this.prevProjectionDelta && (this.createProjectionDeltas(), this.scheduleRender());
        return;
      }
      !this.projectionDelta || !this.prevProjectionDelta ? this.createProjectionDeltas() : (Lm(this.prevProjectionDelta.x, this.projectionDelta.x), Lm(this.prevProjectionDelta.y, this.projectionDelta.y)), li(this.projectionDelta, this.layoutCorrected, v, this.latestValues), (this.treeScale.x !== l || this.treeScale.y !== f || !Qm(this.projectionDelta.x, this.prevProjectionDelta.x) || !Qm(this.projectionDelta.y, this.prevProjectionDelta.y)) && (this.hasProjected = !0, this.scheduleRender(), this.notifyListeners("projectionUpdate", v));
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
        const y = this.getStack();
        y && y.scheduleRender();
      }
      this.resumingFrom && !this.resumingFrom.instance && (this.resumingFrom = void 0);
    }
    createProjectionDeltas() {
      this.prevProjectionDelta = Zr(), this.projectionDelta = Zr(), this.projectionDeltaWithTransform = Zr();
    }
    setAnimationOrigin(d, p = !1, y) {
      const g = this.snapshot, S = g ? g.latestValues : {}, l = { ...this.latestValues }, f = Zr();
      (!this.relativeParent || !this.relativeParent.options.layoutRoot) && (this.relativeTarget = this.relativeTargetOrigin = void 0), this.attemptToResolveRelativeTarget = !p;
      const v = He(), x = g ? g.source : void 0, T = this.layout ? this.layout.source : void 0, k = x !== T, A = this.getStack(), R = !A || A.members.length <= 1, P = !!(k && !R && this.options.crossfade === !0 && !this.path.some(fT));
      this.animationProgress = 0;
      let D;
      const L = y == null ? void 0 : y.interpolateProjection(d);
      this.mixTargetDelta = (X) => {
        const Z = X / 1e3, U = L == null ? void 0 : L(Z);
        U ? (f.x.translate = U.x, f.x.scale = Ce(d.x.scale, 1, Z), f.x.origin = d.x.origin, f.x.originPoint = d.x.originPoint, f.y.translate = U.y, f.y.scale = Ce(d.y.scale, 1, Z), f.y.origin = d.y.origin, f.y.originPoint = d.y.originPoint) : (ny(f.x, d.x, Z), ny(f.y, d.y, Z)), this.setTargetDelta(f), this.relativeTarget && this.relativeTargetOrigin && this.layout && this.relativeParent && this.relativeParent.layout && (Sa(v, this.layout.layoutBox, this.relativeParent.layout.layoutBox, this.options.layoutAnchor || void 0), dT(this.relativeTarget, this.relativeTargetOrigin, v, Z), D && zk(this.relativeTarget, D) && (this.isProjectionDirty = !1), D || (D = He()), Lt(D, this.relativeTarget)), k && (this.animationValues = l, $k(l, S, this.latestValues, Z, P, R)), U && U.rotate !== void 0 && (this.animationValues || (this.animationValues = l), this.animationValues.pathRotation = U.rotate), this.root.scheduleUpdateProjection(), this.scheduleRender(), this.animationProgress = Z;
      }, this.mixTargetDelta(this.options.layoutRoot ? 1e3 : 0);
    }
    startAnimation(d) {
      var p, y, g;
      this.notifyListeners("animationStart"), (p = this.currentAnimation) == null || p.stop(), (g = (y = this.resumingFrom) == null ? void 0 : y.currentAnimation) == null || g.stop(), this.pendingAnimation && (Hn(this.pendingAnimation), this.pendingAnimation = void 0), this.pendingAnimation = be.update(() => {
        oa.hasAnimatedSinceResize = !0, this.motionValue || (this.motionValue = ro(0)), this.motionValue.jump(0, !1), this.currentAnimation = Gk(this.motionValue, [0, 1e3], {
          ...d,
          velocity: 0,
          isSync: !0,
          onUpdate: (S) => {
            this.mixTargetDelta(S), d.onUpdate && d.onUpdate(S);
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
      this.currentAnimation && (this.mixTargetDelta && this.mixTargetDelta(Zk), this.currentAnimation.stop()), this.completeAnimation();
    }
    applyTransformsToTarget() {
      const d = this.getLead();
      let { targetWithTransforms: p, target: y, layout: g, latestValues: S } = d;
      if (!(!p || !y || !g)) {
        if (this !== d && this.layout && g && Tv(this.options.animationType, this.layout.layoutBox, g.layoutBox)) {
          y = this.target || He();
          const l = st(this.layout.layoutBox.x);
          y.x.min = d.target.x.min, y.x.max = y.x.min + l;
          const f = st(this.layout.layoutBox.y);
          y.y.min = d.target.y.min, y.y.max = y.y.min + f;
        }
        Lt(p, y), na(p, S), li(this.projectionDeltaWithTransform, this.layoutCorrected, p, S);
      }
    }
    registerSharedNode(d, p) {
      this.sharedNodes.has(d) || this.sharedNodes.set(d, new Xk()), this.sharedNodes.get(d).add(p);
      const g = p.options.initialPromotionConfig;
      p.promote({
        transition: g ? g.transition : void 0,
        preserveFollowOpacity: g && g.shouldPreserveFollowOpacity ? g.shouldPreserveFollowOpacity(p) : void 0
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
    promote({ needsReset: d, transition: p, preserveFollowOpacity: y } = {}) {
      const g = this.getStack();
      g && g.promote(this, y), d && (this.projectionDelta = void 0, this.needsReset = !0), p && this.setOptions({ transition: p });
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
      const { latestValues: y } = d;
      if ((y.z || y.rotate || y.rotateX || y.rotateY || y.rotateZ || y.skewX || y.skewY) && (p = !0), !p)
        return;
      const g = {};
      y.z && Yu("z", d, g, this.animationValues);
      for (let S = 0; S < Ku.length; S++)
        Yu(`rotate${Ku[S]}`, d, g, this.animationValues), Yu(`skew${Ku[S]}`, d, g, this.animationValues);
      d.render();
      for (const S in g)
        d.setStaticValue(S, g[S]), this.animationValues && (this.animationValues[S] = g[S]);
      d.scheduleRender();
    }
    applyProjectionStyles(d, p) {
      if (!this.instance || this.isSVG)
        return;
      if (!this.isVisible) {
        d.visibility = "hidden";
        return;
      }
      const y = this.getTransformTemplate();
      if (this.needsReset) {
        this.needsReset = !1, d.visibility = "", d.opacity = "", d.pointerEvents = ra(p == null ? void 0 : p.pointerEvents) || "", d.transform = y ? y(this.latestValues, "") : "none";
        return;
      }
      const g = this.getLead();
      if (!this.projectionDelta || !this.layout || !g.target) {
        this.options.layoutId && (d.opacity = this.latestValues.opacity !== void 0 ? this.latestValues.opacity : 1, d.pointerEvents = ra(p == null ? void 0 : p.pointerEvents) || ""), this.hasProjected && !ur(this.latestValues) && (d.transform = y ? y({}, "") : "none", this.hasProjected = !1);
        return;
      }
      d.visibility = "";
      const S = g.animationValues || g.latestValues;
      this.applyTransformsToTarget();
      let l = Bk(this.projectionDeltaWithTransform, this.treeScale, S);
      y && (l = y(S, l)), d.transform = l;
      const { x: f, y: v } = this.projectionDelta;
      d.transformOrigin = `${f.origin * 100}% ${v.origin * 100}% 0`, g.animationValues ? d.opacity = g === this ? S.opacity ?? this.latestValues.opacity ?? 1 : this.preserveOpacity ? this.latestValues.opacity : S.opacityExit : d.opacity = g === this ? S.opacity !== void 0 ? S.opacity : "" : S.opacityExit !== void 0 ? S.opacityExit : 0;
      for (const x in Dc) {
        if (S[x] === void 0)
          continue;
        const { correct: T, applyTo: k, isCSSVariable: A } = Dc[x], R = l === "none" ? S[x] : T(S[x], g);
        if (k) {
          const P = k.length;
          for (let D = 0; D < P; D++)
            d[k[D]] = R;
        } else
          A ? this.options.visualElement.renderState.vars[x] = R : d[x] = R;
      }
      this.options.layoutId && (d.pointerEvents = g === this ? ra(p == null ? void 0 : p.pointerEvents) || "" : "none");
    }
    clearSnapshot() {
      this.resumeFrom = this.snapshot = void 0;
    }
    // Only run on root
    resetTree() {
      this.root.nodes.forEach((d) => {
        var p;
        return (p = d.currentAnimation) == null ? void 0 : p.stop();
      }), this.root.nodes.forEach(Jm), this.root.sharedNodes.clear();
    }
  };
}
function Jk(e) {
  e.updateLayout();
}
function eT(e) {
  var o;
  const n = ((o = e.resumeFrom) == null ? void 0 : o.snapshot) || e.snapshot;
  if (e.isLead() && e.layout && n && e.hasListeners("didUpdate")) {
    const { layoutBox: i, measuredBox: a } = e.layout, { animationType: c } = e.options, d = n.source !== e.layout.source;
    if (c === "size")
      Jt((l) => {
        const f = d ? n.measuredBox[l] : n.layoutBox[l], v = st(f);
        f.min = i[l].min, f.max = f.min + v;
      });
    else if (c === "x" || c === "y") {
      const l = c === "x" ? "y" : "x";
      jc(d ? n.measuredBox[l] : n.layoutBox[l], i[l]);
    } else Tv(c, n.layoutBox, i) && Jt((l) => {
      const f = d ? n.measuredBox[l] : n.layoutBox[l], v = st(i[l]);
      f.max = f.min + v, e.relativeTarget && !e.currentAnimation && (e.isProjectionDirty = !0, e.relativeTarget[l].max = e.relativeTarget[l].min + v);
    });
    const p = Zr();
    li(p, i, n.layoutBox);
    const y = Zr();
    d ? li(y, e.applyTransform(a, !0), n.measuredBox) : li(y, i, n.layoutBox);
    const g = !Sv(p);
    let S = !1;
    if (!e.resumeFrom) {
      const l = e.getClosestProjectingParent();
      if (l && !l.resumeFrom) {
        const { snapshot: f, layout: v } = l;
        if (f && v) {
          const x = e.options.layoutAnchor || void 0, T = He();
          Sa(T, n.layoutBox, f.layoutBox, x);
          const k = He();
          Sa(k, i, v.layoutBox, x), wv(T, k) || (S = !0), l.options.layoutRoot && (e.relativeTarget = k, e.relativeTargetOrigin = T, e.relativeParent = l);
        }
      }
    }
    e.notifyListeners("didUpdate", {
      layout: i,
      snapshot: n,
      delta: y,
      layoutDelta: p,
      hasLayoutChanged: g,
      hasRelativeLayoutChanged: S
    });
  } else if (e.isLead()) {
    const { onExitComplete: i } = e.options;
    i && i();
  }
  e.options.transition = void 0;
}
function tT(e) {
  e.parent && (e.isProjecting() || (e.isProjectionDirty = e.parent.isProjectionDirty), e.isSharedProjectionDirty || (e.isSharedProjectionDirty = !!(e.isProjectionDirty || e.parent.isProjectionDirty || e.parent.isSharedProjectionDirty)), e.isTransformDirty || (e.isTransformDirty = e.parent.isTransformDirty));
}
function nT(e) {
  e.isProjectionDirty = e.isSharedProjectionDirty = e.isTransformDirty = !1;
}
function rT(e) {
  e.clearSnapshot();
}
function Jm(e) {
  e.clearMeasurements();
}
function oT(e) {
  e.isLayoutDirty = !0, e.updateLayout();
}
function ey(e) {
  e.isLayoutDirty = !1;
}
function iT(e) {
  e.isAnimationBlocked && e.layout && !e.isLayoutDirty && (e.snapshot = e.layout, e.isLayoutDirty = !0);
}
function sT(e) {
  const { visualElement: n } = e.options;
  n && n.getProps().onBeforeLayoutMeasure && n.notify("BeforeLayoutMeasure"), e.resetTransform();
}
function ty(e) {
  e.finishAnimation(), e.targetDelta = e.relativeTarget = e.target = void 0, e.isProjectionDirty = !0;
}
function aT(e) {
  e.resolveTargetDelta();
}
function lT(e) {
  e.calcProjection();
}
function uT(e) {
  e.resetSkewAndRotation();
}
function cT(e) {
  e.removeLeadSnapshot();
}
function ny(e, n, o) {
  e.translate = Ce(n.translate, 0, o), e.scale = Ce(n.scale, 1, o), e.origin = n.origin, e.originPoint = n.originPoint;
}
function ry(e, n, o, i) {
  e.min = Ce(n.min, o.min, i), e.max = Ce(n.max, o.max, i);
}
function dT(e, n, o, i) {
  ry(e.x, n.x, o.x, i), ry(e.y, n.y, o.y, i);
}
function fT(e) {
  return e.animationValues && e.animationValues.opacityExit !== void 0;
}
const pT = {
  duration: 0.45,
  ease: [0.4, 0, 0.1, 1]
}, oy = (e) => typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().includes(e), iy = oy("applewebkit/") && !oy("chrome/") ? Math.round : Mt;
function sy(e) {
  e.min = iy(e.min), e.max = iy(e.max);
}
function hT(e) {
  sy(e.x), sy(e.y);
}
function Tv(e, n, o) {
  return e === "position" || e === "preserve-aspect" && !Ik(Ym(n), Ym(o), 0.2);
}
function mT(e) {
  var n;
  return e !== e.root && ((n = e.scroll) == null ? void 0 : n.wasRoot);
}
const yT = kv({
  attachResizeListener: (e, n) => yi(e, "resize", n),
  measureScroll: () => {
    var e, n;
    return {
      x: document.documentElement.scrollLeft || ((e = document.body) == null ? void 0 : e.scrollLeft) || 0,
      y: document.documentElement.scrollTop || ((n = document.body) == null ? void 0 : n.scrollTop) || 0
    };
  },
  checkIsScrollRoot: () => !0
}), Qu = {
  current: void 0
}, Av = kv({
  measureScroll: (e) => ({
    x: e.scrollLeft,
    y: e.scrollTop
  }),
  defaultParent: () => {
    if (!Qu.current) {
      const e = new yT({});
      e.mount(window), e.setOptions({ layoutScroll: !0 }), Qu.current = e;
    }
    return Qu.current;
  },
  resetTransform: (e, n) => {
    e.style.transform = n !== void 0 ? n : "none";
  },
  checkIsScrollRoot: (e) => window.getComputedStyle(e).position === "fixed"
}), Ed = C.createContext({
  transformPagePoint: (e) => e,
  isStatic: !1,
  reducedMotion: "never"
});
function ay(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function gT(...e) {
  return (n) => {
    let o = !1;
    const i = e.map((a) => {
      const c = ay(a, n);
      return !o && typeof c == "function" && (o = !0), c;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const c = i[a];
          typeof c == "function" ? c() : ay(e[a], null);
        }
      };
  };
}
function vT(...e) {
  return C.useCallback(gT(...e), e);
}
class ST extends C.Component {
  getSnapshotBeforeUpdate(n) {
    const o = this.props.childRef.current;
    if (qs(o) && n.isPresent && !this.props.isPresent && this.props.pop !== !1) {
      const i = o.offsetParent, a = qs(i) && i.offsetWidth || 0, c = qs(i) && i.offsetHeight || 0, d = getComputedStyle(o), p = this.props.sizeRef.current;
      p.height = parseFloat(d.height), p.width = parseFloat(d.width), p.top = o.offsetTop, p.left = o.offsetLeft, p.right = a - p.width - p.left, p.bottom = c - p.height - p.top, p.direction = d.direction;
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
function wT({ children: e, isPresent: n, anchorX: o, anchorY: i, root: a, pop: c }) {
  var f;
  const d = C.useId(), p = C.useRef(null), y = C.useRef({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    direction: "ltr"
  }), { nonce: g } = C.useContext(Ed), S = ((f = e.props) == null ? void 0 : f.ref) ?? (e == null ? void 0 : e.ref), l = vT(p, S);
  return C.useInsertionEffect(() => {
    const { width: v, height: x, top: T, left: k, right: A, bottom: R, direction: P } = y.current;
    if (n || c === !1 || !p.current || !v || !x)
      return;
    const D = P === "rtl", L = o === "left" ? D ? `right: ${A}` : `left: ${k}` : D ? `left: ${k}` : `right: ${A}`, X = i === "bottom" ? `bottom: ${R}` : `top: ${T}`;
    p.current.dataset.motionPopId = d;
    const Z = document.createElement("style");
    g && (Z.nonce = g);
    const U = a ?? document.head;
    return U.appendChild(Z), Z.sheet && Z.sheet.insertRule(`
          [data-motion-pop-id="${d}"] {
            position: absolute !important;
            width: ${v}px !important;
            height: ${x}px !important;
            ${L}px !important;
            ${X}px !important;
          }
        `), () => {
      var G;
      (G = p.current) == null || G.removeAttribute("data-motion-pop-id"), U.contains(Z) && U.removeChild(Z);
    };
  }, [n]), w.jsx(ST, { isPresent: n, childRef: p, sizeRef: y, pop: c, children: c === !1 ? e : C.cloneElement(e, { ref: l }) });
}
const xT = ({ children: e, initial: n, isPresent: o, onExitComplete: i, custom: a, presenceAffectsLayout: c, mode: d, anchorX: p, anchorY: y, root: g }) => {
  const S = rd(_T), l = C.useId(), f = C.useRef(o), v = C.useRef(i);
  od(() => {
    f.current = o, v.current = i;
  });
  let x = !0, T = C.useMemo(() => (x = !1, {
    id: l,
    initial: n,
    isPresent: o,
    custom: a,
    onExitComplete: (k) => {
      S.set(k, !0);
      for (const A of S.values())
        if (!A)
          return;
      i && i();
    },
    register: (k) => (S.set(k, !1), () => {
      var A;
      S.delete(k), !f.current && !S.size && ((A = v.current) == null || A.call(v));
    })
  }), [o, S, i]);
  return c && x && (T = { ...T }), C.useMemo(() => {
    S.forEach((k, A) => S.set(A, !1));
  }, [o]), C.useEffect(() => {
    !o && !S.size && i && i();
  }, [o]), e = w.jsx(wT, { pop: d === "popLayout", isPresent: o, anchorX: p, anchorY: y, root: g, children: e }), w.jsx(Pa.Provider, { value: T, children: e });
};
function _T() {
  return /* @__PURE__ */ new Map();
}
function Cv(e = !0) {
  const n = C.useContext(Pa);
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
const Bs = (e) => e.key || "";
function ly(e) {
  const n = [];
  return C.Children.forEach(e, (o) => {
    C.isValidElement(o) && n.push(o);
  }), n;
}
const Da = ({ children: e, custom: n, initial: o = !0, onExitComplete: i, presenceAffectsLayout: a = !0, mode: c = "sync", propagate: d = !1, anchorX: p = "left", anchorY: y = "top", root: g }) => {
  const [S, l] = Cv(d), f = C.useMemo(() => ly(e), [e]), v = d && !S ? [] : f.map(Bs), x = C.useRef(!0), T = C.useRef(f), k = rd(() => /* @__PURE__ */ new Map()), A = C.useRef(/* @__PURE__ */ new Set()), [R, P] = C.useState(f), [D, L] = C.useState(f);
  od(() => {
    x.current = !1, T.current = f;
    for (let U = 0; U < D.length; U++) {
      const G = Bs(D[U]);
      v.includes(G) ? (k.delete(G), A.current.delete(G)) : k.get(G) !== !0 && k.set(G, !1);
    }
  }, [D, v.length, v.join("-")]);
  const X = [];
  if (f !== R) {
    let U = [...f];
    for (let G = 0; G < D.length; G++) {
      const Q = D[G], J = Bs(Q);
      v.includes(J) || (U.splice(G, 0, Q), X.push(Q));
    }
    return c === "wait" && X.length && (U = X), L(ly(U)), P(f), null;
  }
  const { forceRender: Z } = C.useContext(nd);
  return w.jsx(w.Fragment, { children: D.map((U) => {
    const G = Bs(U), Q = d && !S ? !1 : f === D || v.includes(G), J = () => {
      if (A.current.has(G))
        return;
      if (k.has(G))
        A.current.add(G), k.set(G, !0);
      else
        return;
      let ce = !0;
      k.forEach((ye) => {
        ye || (ce = !1);
      }), ce && (Z == null || Z(), L(T.current), d && (l == null || l()), i && i());
    };
    return w.jsx(xT, { isPresent: Q, initial: !x.current || o ? void 0 : !1, custom: n, presenceAffectsLayout: a, mode: c, root: g, onExitComplete: Q ? void 0 : J, anchorX: p, anchorY: y, children: U }, G);
  }) });
}, bv = C.createContext({ strict: !1 }), uy = {
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
let cy = !1;
function kT() {
  if (cy)
    return;
  const e = {};
  for (const n in uy)
    e[n] = {
      isEnabled: (o) => uy[n].some((i) => !!o[i])
    };
  rv(e), cy = !0;
}
function Ev() {
  return kT(), ak();
}
function TT(e) {
  const n = Ev();
  for (const o in e)
    n[o] = {
      ...n[o],
      ...e[o]
    };
  rv(n);
}
const AT = /* @__PURE__ */ new Set([
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
function wa(e) {
  return e.startsWith("while") || e.startsWith("drag") && e !== "draggable" || e.startsWith("layout") || e.startsWith("onTap") || e.startsWith("onPan") || e.startsWith("onLayout") || AT.has(e);
}
let Pv = (e) => !wa(e);
function CT(e) {
  typeof e == "function" && (Pv = (n) => n.startsWith("on") ? !wa(n) : e(n));
}
try {
  CT(require("@emotion/is-prop-valid").default);
} catch {
}
function bT(e, n, o) {
  const i = {};
  for (const a in e)
    a === "values" && typeof e.values == "object" || qe(e[a]) || (Pv(a) || o === !0 && wa(a) || !n && !wa(a) || // If trying to use native HTML drag events, forward drag listeners
    e.draggable && a.startsWith("onDrag")) && (i[a] = e[a]);
  return i;
}
const ja = /* @__PURE__ */ C.createContext({});
function ET(e, n) {
  if (Na(e)) {
    const { initial: o, animate: i } = e;
    return {
      initial: o === !1 || mi(o) ? o : void 0,
      animate: mi(i) ? i : void 0
    };
  }
  return e.inherit !== !1 ? n : {};
}
function PT(e) {
  const { initial: n, animate: o } = ET(e, C.useContext(ja));
  return C.useMemo(() => ({ initial: n, animate: o }), [dy(n), dy(o)]);
}
function dy(e) {
  return Array.isArray(e) ? e.join(" ") : e;
}
const Pd = () => ({
  style: {},
  transform: {},
  transformOrigin: {},
  vars: {}
});
function Mv(e, n, o) {
  for (const i in n)
    !qe(n[i]) && !cv(i, o) && (e[i] = n[i]);
}
function MT({ transformTemplate: e }, n) {
  return C.useMemo(() => {
    const o = Pd();
    return Cd(o, n, e), Object.assign({}, o.vars, o.style);
  }, [n]);
}
function RT(e, n) {
  const o = e.style || {}, i = {};
  return Mv(i, o, e), Object.assign(i, MT(e, n)), i;
}
function NT(e, n) {
  const o = {}, i = RT(e, n);
  return e.drag && e.dragListener !== !1 && (o.draggable = !1, i.userSelect = i.WebkitUserSelect = i.WebkitTouchCallout = "none", i.touchAction = e.drag === !0 ? "none" : `pan-${e.drag === "x" ? "y" : "x"}`), e.tabIndex === void 0 && (e.onTap || e.onTapStart || e.whileTap) && (o.tabIndex = 0), o.style = i, o;
}
const Rv = () => ({
  ...Pd(),
  attrs: {}
});
function DT(e, n, o, i) {
  const a = C.useMemo(() => {
    const c = Rv();
    return dv(c, n, pv(i), e.transformTemplate, e.style), {
      ...c.attrs,
      style: { ...c.style }
    };
  }, [n]);
  if (e.style) {
    const c = {};
    Mv(c, e.style, e), a.style = { ...c, ...a.style };
  }
  return a;
}
const jT = [
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
function Md(e) {
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
      !!(jT.indexOf(e) > -1 || /**
       * If it contains a capital letter, it's an SVG component
       */
      /[A-Z]/u.test(e))
    )
  );
}
function IT(e, n, o, { latestValues: i }, a, c = !1, d) {
  const y = (d ?? Md(e) ? DT : NT)(n, i, a, e), g = bT(n, typeof e == "string", c), S = e !== C.Fragment ? { ...g, ...y, ref: o } : {}, { children: l } = n, f = C.useMemo(() => qe(l) ? l.get() : l, [l]);
  return C.createElement(e, {
    ...S,
    children: f
  });
}
function FT({ scrapeMotionValuesFromProps: e, createRenderState: n }, o, i, a) {
  return {
    latestValues: OT(o, i, a, e),
    renderState: n()
  };
}
function OT(e, n, o, i) {
  const a = {}, c = i(e, {});
  for (const f in c)
    a[f] = ra(c[f]);
  let { initial: d, animate: p } = e;
  const y = Na(e), g = tv(e);
  n && g && !y && e.inherit !== !1 && (d === void 0 && (d = n.initial), p === void 0 && (p = n.animate));
  let S = o ? o.initial === !1 : !1;
  S = S || d === !1;
  const l = S ? p : d;
  if (l && typeof l != "boolean" && !Ra(l)) {
    const f = Array.isArray(l) ? l : [l];
    for (let v = 0; v < f.length; v++) {
      const x = vd(e, f[v]);
      if (x) {
        const { transitionEnd: T, transition: k, ...A } = x;
        for (const R in A) {
          let P = A[R];
          if (Array.isArray(P)) {
            const D = S ? P.length - 1 : 0;
            P = P[D];
          }
          P !== null && (a[R] = P);
        }
        for (const R in T)
          a[R] = T[R];
      }
    }
  }
  return a;
}
const Nv = (e) => (n, o) => {
  const i = C.useContext(ja), a = C.useContext(Pa), c = () => FT(e, n, i, a);
  return o ? c() : rd(c);
}, LT = /* @__PURE__ */ Nv({
  scrapeMotionValuesFromProps: bd,
  createRenderState: Pd
}), VT = /* @__PURE__ */ Nv({
  scrapeMotionValuesFromProps: hv,
  createRenderState: Rv
}), zT = Symbol.for("motionComponentSymbol");
function BT(e, n, o) {
  const i = C.useRef(o);
  C.useInsertionEffect(() => {
    i.current = o;
  });
  const a = C.useRef(null);
  return C.useCallback((c) => {
    var p;
    c && ((p = e.onMount) == null || p.call(e, c)), n && (c ? n.mount(c) : n.unmount());
    const d = i.current;
    if (typeof d == "function")
      if (c) {
        const y = d(c);
        typeof y == "function" && (a.current = y);
      } else a.current ? (a.current(), a.current = null) : d(c);
    else d && (d.current = c);
  }, [n]);
}
const Dv = C.createContext({});
function Yr(e) {
  return e && typeof e == "object" && Object.prototype.hasOwnProperty.call(e, "current");
}
function UT(e, n, o, i, a, c) {
  var P, D;
  const { visualElement: d } = C.useContext(ja), p = C.useContext(bv), y = C.useContext(Pa), g = C.useContext(Ed), S = g.reducedMotion, l = g.skipAnimations, f = C.useRef(null), v = C.useRef(!1);
  i = i || p.renderer, !f.current && i && (f.current = i(e, {
    visualState: n,
    parent: d,
    props: o,
    presenceContext: y,
    blockInitialAnimation: y ? y.initial === !1 : !1,
    reducedMotionConfig: S,
    skipAnimations: l,
    isSVG: c
  }), v.current && f.current && (f.current.manuallyAnimateOnMount = !0));
  const x = f.current, T = C.useContext(Dv);
  x && !x.projection && a && (x.type === "html" || x.type === "svg") && $T(f.current, o, a, T);
  const k = C.useRef(!1);
  C.useInsertionEffect(() => {
    x && k.current && x.update(o, y);
  });
  const A = o[$g], R = C.useRef(!!A && typeof window < "u" && !((P = window.MotionHandoffIsComplete) != null && P.call(window, A)) && ((D = window.MotionHasOptimisedAnimation) == null ? void 0 : D.call(window, A)));
  return od(() => {
    v.current = !0, x && (k.current = !0, window.MotionIsMounted = !0, x.updateFeatures(), x.scheduleRenderMicrotask(), R.current && x.animationState && x.animationState.animateChanges());
  }), C.useEffect(() => {
    x && (!R.current && x.animationState && x.animationState.animateChanges(), R.current && (queueMicrotask(() => {
      var L;
      (L = window.MotionHandoffMarkAsComplete) == null || L.call(window, A);
    }), R.current = !1), x.enteringChildren = void 0);
  }), x;
}
function $T(e, n, o, i) {
  const { layoutId: a, layout: c, drag: d, dragConstraints: p, layoutScroll: y, layoutRoot: g, layoutAnchor: S, layoutCrossfade: l } = n;
  e.projection = new o(e.latestValues, n["data-framer-portal-id"] ? void 0 : jv(e.parent)), e.projection.setOptions({
    layoutId: a,
    layout: c,
    alwaysMeasureLayout: !!d || p && Yr(p),
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
    layoutScroll: y,
    layoutRoot: g,
    layoutAnchor: S
  });
}
function jv(e) {
  if (e)
    return e.options.allowProjection !== !1 ? e.projection : jv(e.parent);
}
function Xu(e, { forwardMotionProps: n = !1, type: o } = {}, i, a) {
  i && TT(i);
  const c = o ? o === "svg" : Md(e), d = c ? VT : LT;
  function p(g, S) {
    let l;
    const f = {
      ...C.useContext(Ed),
      ...g,
      layoutId: HT(g)
    }, { isStatic: v } = f, x = PT(g), T = d(g, v);
    if (!v && typeof window < "u") {
      WT();
      const k = GT(f);
      l = k.MeasureLayout, x.visualElement = UT(e, T, f, a, k.ProjectionNode, c);
    }
    return w.jsxs(ja.Provider, { value: x, children: [l && x.visualElement ? w.jsx(l, { visualElement: x.visualElement, ...f }) : null, IT(e, g, BT(T, x.visualElement, S), T, v, n, c)] });
  }
  p.displayName = `motion.${typeof e == "string" ? e : `create(${e.displayName ?? e.name ?? ""})`}`;
  const y = C.forwardRef(p);
  return y[zT] = e, y;
}
function HT({ layoutId: e }) {
  const n = C.useContext(nd).id;
  return n && e !== void 0 ? n + "-" + e : e;
}
function WT(e, n) {
  C.useContext(bv).strict;
}
function GT(e) {
  const n = Ev(), { drag: o, layout: i } = n;
  if (!o && !i)
    return {};
  const a = { ...o, ...i };
  return {
    MeasureLayout: o != null && o.isEnabled(e) || i != null && i.isEnabled(e) ? a.MeasureLayout : void 0,
    ProjectionNode: a.ProjectionNode
  };
}
function KT(e, n) {
  if (typeof Proxy > "u")
    return Xu;
  const o = /* @__PURE__ */ new Map(), i = (c, d) => Xu(c, d, e, n), a = (c, d) => i(c, d);
  return new Proxy(a, {
    /**
     * Called when `motion` is referenced with a prop: `motion.div`, `motion.input` etc.
     * The prop name is passed through as `key` and we can use that to generate a `motion`
     * DOM component with that name.
     */
    get: (c, d) => d === "create" ? i : (o.has(d) || o.set(d, Xu(d, void 0, e, n)), o.get(d))
  });
}
const YT = (e, n) => n.isSVG ?? Md(e) ? new Tk(n) : new vk(n, {
  allowProjection: e !== C.Fragment
});
class QT extends Gn {
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
    Ra(n) && (this.unmountControls = n.subscribe(this.node));
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
let XT = 0;
class ZT extends Gn {
  constructor() {
    super(...arguments), this.id = XT++, this.isExitComplete = !1;
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
        const { initial: d, custom: p } = this.node.getProps();
        if (typeof d == "string" || typeof d == "object" && d !== null && !Array.isArray(d)) {
          const y = mr(this.node, d, p);
          if (y) {
            const { transition: g, transitionEnd: S, ...l } = y;
            for (const f in l)
              (c = this.node.getValue(f)) == null || c.jump(l[f]);
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
const qT = {
  animation: {
    Feature: QT
  },
  exit: {
    Feature: ZT
  }
};
function bi(e) {
  return {
    point: {
      x: e.pageX,
      y: e.pageY
    }
  };
}
const JT = (e) => (n) => _d(n) && e(n, bi(n));
function ui(e, n, o, i) {
  return yi(e, n, JT(o), i);
}
const Iv = ({ current: e }) => e ? e.ownerDocument.defaultView : null, fy = (e, n) => Math.abs(e - n);
function eA(e, n) {
  const o = fy(e.x, n.x), i = fy(e.y, n.y);
  return Math.sqrt(o ** 2 + i ** 2);
}
const py = /* @__PURE__ */ new Set(["auto", "scroll"]);
class Fv {
  constructor(n, o, { transformPagePoint: i, contextWindow: a = window, dragSnapToOrigin: c = !1, distanceThreshold: d = 3, element: p } = {}) {
    if (this.startEvent = null, this.lastMoveEvent = null, this.lastMoveEventInfo = null, this.lastRawMoveEventInfo = null, this.handlers = {}, this.contextWindow = window, this.scrollPositions = /* @__PURE__ */ new Map(), this.removeScrollListeners = null, this.onElementScroll = (x) => {
      this.handleScroll(x.target);
    }, this.onWindowScroll = () => {
      this.handleScroll(window);
    }, this.updatePoint = () => {
      if (!(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      this.lastRawMoveEventInfo && (this.lastMoveEventInfo = Us(this.lastRawMoveEventInfo, this.transformPagePoint));
      const x = Zu(this.lastMoveEventInfo, this.history), T = this.startEvent !== null, k = eA(x.offset, { x: 0, y: 0 }) >= this.distanceThreshold;
      if (!T && !k)
        return;
      const { point: A } = x, { timestamp: R } = Ze;
      this.history.push({ ...A, timestamp: R });
      const { onStart: P, onMove: D } = this.handlers;
      T || (P && P(this.lastMoveEvent, x), this.startEvent = this.lastMoveEvent), D && D(this.lastMoveEvent, x);
    }, this.handlePointerMove = (x, T) => {
      this.lastMoveEvent = x, this.lastRawMoveEventInfo = T, this.lastMoveEventInfo = Us(T, this.transformPagePoint), be.update(this.updatePoint, !0);
    }, this.handlePointerUp = (x, T) => {
      this.end();
      const { onEnd: k, onSessionEnd: A, resumeAnimation: R } = this.handlers;
      if ((this.dragSnapToOrigin || !this.startEvent) && R && R(), !(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      const P = Zu(x.type === "pointercancel" ? this.lastMoveEventInfo : Us(T, this.transformPagePoint), this.history);
      this.startEvent && k && k(x, P), A && A(x, P);
    }, !_d(n))
      return;
    this.dragSnapToOrigin = c, this.handlers = o, this.transformPagePoint = i, this.distanceThreshold = d, this.contextWindow = a || window;
    const y = bi(n), g = Us(y, this.transformPagePoint), { point: S } = g, { timestamp: l } = Ze;
    this.history = [{ ...S, timestamp: l }];
    const { onSessionStart: f } = o;
    f && f(n, Zu(g, this.history));
    const v = { passive: !0, capture: !0 };
    this.removeListeners = Ti(ui(this.contextWindow, "pointermove", this.handlePointerMove, v), ui(this.contextWindow, "pointerup", this.handlePointerUp, v), ui(this.contextWindow, "pointercancel", this.handlePointerUp, v)), p && this.startScrollTracking(p);
  }
  /**
   * Start tracking scroll on ancestors and window.
   */
  startScrollTracking(n) {
    let o = n.parentElement;
    for (; o; ) {
      const i = getComputedStyle(o);
      (py.has(i.overflowX) || py.has(i.overflowY)) && this.scrollPositions.set(o, {
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
    c.x === 0 && c.y === 0 || (i ? this.lastMoveEventInfo && (this.lastMoveEventInfo.point.x += c.x, this.lastMoveEventInfo.point.y += c.y) : this.history.length > 0 && (this.history[0].x -= c.x, this.history[0].y -= c.y), this.scrollPositions.set(n, a), be.update(this.updatePoint, !0));
  }
  updateHandlers(n) {
    this.handlers = n;
  }
  end() {
    this.removeListeners && this.removeListeners(), this.removeScrollListeners && this.removeScrollListeners(), this.scrollPositions.clear(), Hn(this.updatePoint);
  }
}
function Us(e, n) {
  return n ? { point: n(e.point) } : e;
}
function hy(e, n) {
  return { x: e.x - n.x, y: e.y - n.y };
}
function Zu({ point: e }, n) {
  return {
    point: e,
    delta: hy(e, Ov(n)),
    offset: hy(e, tA(n)),
    velocity: nA(n, 0.1)
  };
}
function tA(e) {
  return e[0];
}
function Ov(e) {
  return e[e.length - 1];
}
function nA(e, n) {
  if (e.length < 2)
    return { x: 0, y: 0 };
  let o = e.length - 1, i = null;
  const a = Ov(e);
  for (; o >= 0 && (i = e[o], !(a.timestamp - i.timestamp > /* @__PURE__ */ yt(n))); )
    o--;
  if (!i)
    return { x: 0, y: 0 };
  i === e[0] && e.length > 2 && a.timestamp - i.timestamp > /* @__PURE__ */ yt(n) * 2 && (i = e[1]);
  const c = /* @__PURE__ */ Pt(a.timestamp - i.timestamp);
  if (c === 0)
    return { x: 0, y: 0 };
  const d = {
    x: (a.x - i.x) / c,
    y: (a.y - i.y) / c
  };
  return d.x === 1 / 0 && (d.x = 0), d.y === 1 / 0 && (d.y = 0), d;
}
function rA(e, { min: n, max: o }, i) {
  return n !== void 0 && e < n ? e = i ? Ce(n, e, i.min) : Math.max(e, n) : o !== void 0 && e > o && (e = i ? Ce(o, e, i.max) : Math.min(e, o)), e;
}
function my(e, n, o) {
  return {
    min: n !== void 0 ? e.min + n : void 0,
    max: o !== void 0 ? e.max + o - (e.max - e.min) : void 0
  };
}
function oA(e, { top: n, left: o, bottom: i, right: a }) {
  return {
    x: my(e.x, o, a),
    y: my(e.y, n, i)
  };
}
function yy(e, n) {
  let o = n.min - e.min, i = n.max - e.max;
  return n.max - n.min < e.max - e.min && ([o, i] = [i, o]), { min: o, max: i };
}
function iA(e, n) {
  return {
    x: yy(e.x, n.x),
    y: yy(e.y, n.y)
  };
}
function sA(e, n) {
  let o = 0.5;
  const i = st(e), a = st(n);
  return a > i ? o = /* @__PURE__ */ pi(n.min, n.max - i, e.min) : i > a && (o = /* @__PURE__ */ pi(e.min, e.max - a, n.min)), on(0, 1, o);
}
function aA(e, n) {
  const o = {};
  return n.min !== void 0 && (o.min = n.min - e.min), n.max !== void 0 && (o.max = n.max - e.min), o;
}
const Ic = 0.35;
function lA(e = Ic) {
  return e === !1 ? e = 0 : e === !0 && (e = Ic), {
    x: gy(e, "left", "right"),
    y: gy(e, "top", "bottom")
  };
}
function gy(e, n, o) {
  return {
    min: vy(e, n),
    max: vy(e, o)
  };
}
function vy(e, n) {
  return typeof e == "number" ? e : e[n] || 0;
}
const uA = /* @__PURE__ */ new WeakMap();
class cA {
  constructor(n) {
    this.openDragLock = null, this.isDragging = !1, this.currentDirection = null, this.originPoint = { x: 0, y: 0 }, this.constraints = !1, this.hasMutatedConstraints = !1, this.elastic = He(), this.latestPointerEvent = null, this.latestPanInfo = null, this.visualElement = n;
  }
  start(n, { snapToCursor: o = !1, distanceThreshold: i } = {}) {
    const { presenceContext: a } = this.visualElement;
    if (a && a.isPresent === !1)
      return;
    const c = (l) => {
      o && this.snapToCursor(bi(l).point), this.stopAnimation();
    }, d = (l, f) => {
      const { drag: v, dragPropagation: x, onDragStart: T } = this.getProps();
      if (v && !x && (this.openDragLock && this.openDragLock(), this.openDragLock = O_(v), !this.openDragLock))
        return;
      this.latestPointerEvent = l, this.latestPanInfo = f, this.isDragging = !0, this.currentDirection = null, this.resolveConstraints(), this.visualElement.projection && (this.visualElement.projection.isAnimationBlocked = !0, this.visualElement.projection.target = void 0), Jt((A) => {
        let R = this.getAxisMotionValue(A).get() || 0;
        if (nn.test(R)) {
          const { projection: P } = this.visualElement;
          if (P && P.layout) {
            const D = P.layout.layoutBox[A];
            D && (R = st(D) * (parseFloat(R) / 100));
          }
        }
        this.originPoint[A] = R;
      }), T && be.update(() => T(l, f), !1, !0), Ac(this.visualElement, "transform");
      const { animationState: k } = this.visualElement;
      k && k.setActive("whileDrag", !0);
    }, p = (l, f) => {
      this.latestPointerEvent = l, this.latestPanInfo = f;
      const { dragPropagation: v, dragDirectionLock: x, onDirectionLock: T, onDrag: k } = this.getProps();
      if (!v && !this.openDragLock)
        return;
      const { offset: A } = f;
      if (x && this.currentDirection === null) {
        this.currentDirection = fA(A), this.currentDirection !== null && T && T(this.currentDirection);
        return;
      }
      this.updateAxis("x", f.point, A), this.updateAxis("y", f.point, A), this.visualElement.render(), k && be.update(() => k(l, f), !1, !0);
    }, y = (l, f) => {
      this.latestPointerEvent = l, this.latestPanInfo = f, this.stop(l, f), this.latestPointerEvent = null, this.latestPanInfo = null;
    }, g = () => {
      const { dragSnapToOrigin: l } = this.getProps();
      (l || this.constraints) && this.startAnimation({ x: 0, y: 0 });
    }, { dragSnapToOrigin: S } = this.getProps();
    this.panSession = new Fv(n, {
      onSessionStart: c,
      onStart: d,
      onMove: p,
      onSessionEnd: y,
      resumeAnimation: g
    }, {
      transformPagePoint: this.visualElement.getTransformPagePoint(),
      dragSnapToOrigin: S,
      distanceThreshold: i,
      contextWindow: Iv(this.visualElement),
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
    const { onDragEnd: p } = this.getProps();
    p && be.postRender(() => p(i, a));
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
    if (!i || !$s(n, a, this.currentDirection))
      return;
    const c = this.getAxisMotionValue(n);
    let d = this.originPoint[n] + i[n];
    this.constraints && this.constraints[n] && (d = rA(d, this.constraints[n], this.elastic[n])), c.set(d);
  }
  resolveConstraints() {
    var c;
    const { dragConstraints: n, dragElastic: o } = this.getProps(), i = this.visualElement.projection && !this.visualElement.projection.layout ? this.visualElement.projection.measure(!1) : (c = this.visualElement.projection) == null ? void 0 : c.layout, a = this.constraints;
    n && Yr(n) ? this.constraints || (this.constraints = this.resolveRefConstraints()) : n && i ? this.constraints = oA(i.layoutBox, n) : this.constraints = !1, this.elastic = lA(o), a !== this.constraints && !Yr(n) && i && this.constraints && !this.hasMutatedConstraints && Jt((d) => {
      this.constraints !== !1 && this.getAxisMotionValue(d) && (this.constraints[d] = aA(i.layoutBox[d], this.constraints[d]));
    });
  }
  resolveRefConstraints() {
    const { dragConstraints: n, onMeasureDragConstraints: o } = this.getProps();
    if (!n || !Yr(n))
      return !1;
    const i = n.current;
    vr(i !== null, "If `dragConstraints` is set as a React ref, that ref must be passed to another component's `ref` prop.", "drag-constraints-ref");
    const { projection: a } = this.visualElement;
    if (!a || !a.layout)
      return !1;
    a.root && (a.root.scroll = void 0, a.root.updateScroll());
    const c = fk(i, a.root, this.visualElement.getTransformPagePoint());
    let d = iA(a.layout.layoutBox, c);
    if (o) {
      const p = o(uk(d));
      this.hasMutatedConstraints = !!p, p && (d = iv(p));
    }
    return d;
  }
  startAnimation(n) {
    const { drag: o, dragMomentum: i, dragElastic: a, dragTransition: c, dragSnapToOrigin: d, onDragTransitionEnd: p } = this.getProps(), y = this.constraints || {}, g = Jt((S) => {
      if (!$s(S, o, this.currentDirection))
        return;
      let l = y && y[S] || {};
      (d === !0 || d === S) && (l = { min: 0, max: 0 });
      const f = a ? 200 : 1e6, v = a ? 40 : 1e7, x = {
        type: "inertia",
        velocity: i ? n[S] : 0,
        bounceStiffness: f,
        bounceDamping: v,
        timeConstant: 750,
        restDelta: 1,
        restSpeed: 10,
        ...c,
        ...l
      };
      return this.startAxisValueAnimation(S, x);
    });
    return Promise.all(g).then(p);
  }
  startAxisValueAnimation(n, o) {
    const i = this.getAxisMotionValue(n);
    return Ac(this.visualElement, n), i.start(gd(n, i, 0, o, this.visualElement, !1));
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
      if (!$s(o, i, this.currentDirection))
        return;
      const { projection: a } = this.visualElement, c = this.getAxisMotionValue(o);
      if (a && a.layout) {
        const { min: d, max: p } = a.layout.layoutBox[o], y = c.get() || 0;
        c.set(n[o] - Ce(d, p, 0.5) + y);
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
    if (!Yr(o) || !i || !this.constraints)
      return;
    this.stopAnimation();
    const a = { x: 0, y: 0 };
    Jt((d) => {
      const p = this.getAxisMotionValue(d);
      if (p && this.constraints !== !1) {
        const y = p.get();
        a[d] = sA({ min: y, max: y }, this.constraints[d]);
      }
    });
    const { transformTemplate: c } = this.visualElement.getProps();
    this.visualElement.current.style.transform = c ? c({}, "") : "none", i.root && i.root.updateScroll(), i.updateLayout(), this.constraints = !1, this.resolveConstraints(), Jt((d) => {
      if (!$s(d, n, null))
        return;
      const p = this.getAxisMotionValue(d), { min: y, max: g } = this.constraints[d];
      p.set(Ce(y, g, a[d]));
    }), this.visualElement.render();
  }
  addListeners() {
    if (!this.visualElement.current)
      return;
    uA.set(this.visualElement, this);
    const n = this.visualElement.current, o = ui(n, "pointerdown", (g) => {
      const { drag: S, dragListener: l = !0 } = this.getProps(), f = g.target, v = f !== n && $_(f);
      S && l && !v && this.start(g);
    });
    let i;
    const a = () => {
      const { dragConstraints: g } = this.getProps();
      Yr(g) && g.current && (this.constraints = this.resolveRefConstraints(), i || (i = dA(n, g.current, () => this.scalePositionWithinConstraints())));
    }, { projection: c } = this.visualElement, d = c.addEventListener("measure", a);
    c && !c.layout && (c.root && c.root.updateScroll(), c.updateLayout()), be.read(a);
    const p = yi(window, "resize", () => this.scalePositionWithinConstraints()), y = c.addEventListener("didUpdate", (({ delta: g, hasLayoutChanged: S }) => {
      this.isDragging && S && (Jt((l) => {
        const f = this.getAxisMotionValue(l);
        f && (this.originPoint[l] += g[l].translate, f.set(f.get() + g[l].translate));
      }), this.visualElement.render());
    }));
    return () => {
      p(), o(), d(), y && y(), i && i();
    };
  }
  getProps() {
    const n = this.visualElement.getProps(), { drag: o = !1, dragDirectionLock: i = !1, dragPropagation: a = !1, dragConstraints: c = !1, dragElastic: d = Ic, dragMomentum: p = !0 } = n;
    return {
      ...n,
      drag: o,
      dragDirectionLock: i,
      dragPropagation: a,
      dragConstraints: c,
      dragElastic: d,
      dragMomentum: p
    };
  }
}
function Sy(e) {
  let n = !0;
  return () => {
    if (n) {
      n = !1;
      return;
    }
    e();
  };
}
function dA(e, n, o) {
  const i = Cm(e, Sy(o)), a = Cm(n, Sy(o));
  return () => {
    i(), a();
  };
}
function $s(e, n, o) {
  return (n === !0 || n === e) && (o === null || o === e);
}
function fA(e, n = 10) {
  let o = null;
  return Math.abs(e.y) > n ? o = "y" : Math.abs(e.x) > n && (o = "x"), o;
}
class pA extends Gn {
  constructor(n) {
    super(n), this.removeGroupControls = Mt, this.removeListeners = Mt, this.controls = new cA(n);
  }
  mount() {
    const { dragControls: n } = this.node.getProps();
    n && (this.removeGroupControls = n.subscribe(this.controls)), this.removeListeners = this.controls.addListeners() || Mt;
  }
  update() {
    const { dragControls: n } = this.node.getProps(), { dragControls: o } = this.node.prevProps || {};
    n !== o && (this.removeGroupControls(), n && (this.removeGroupControls = n.subscribe(this.controls)));
  }
  unmount() {
    this.removeGroupControls(), this.removeListeners(), this.controls.isDragging || this.controls.endPanSession();
  }
}
const qu = (e) => (n, o) => {
  e && be.update(() => e(n, o), !1, !0);
};
class hA extends Gn {
  constructor() {
    super(...arguments), this.removePointerDownListener = Mt;
  }
  onPointerDown(n) {
    this.session = new Fv(n, this.createPanHandlers(), {
      transformPagePoint: this.node.getTransformPagePoint(),
      contextWindow: Iv(this.node)
    });
  }
  createPanHandlers() {
    const { onPanSessionStart: n, onPanStart: o, onPan: i, onPanEnd: a } = this.node.getProps();
    return {
      onSessionStart: qu(n),
      onStart: qu(o),
      onMove: qu(i),
      onEnd: (c, d) => {
        delete this.session, a && be.postRender(() => a(c, d));
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
let Ju = !1;
class mA extends C.Component {
  /**
   * This only mounts projection nodes for components that
   * need measuring, we might want to do it for all components
   * in order to incorporate transforms
   */
  componentDidMount() {
    const { visualElement: n, layoutGroup: o, switchLayoutGroup: i, layoutId: a } = this.props, { projection: c } = n;
    c && (o.group && o.group.add(c), i && i.register && a && i.register(c), Ju && c.root.didUpdate(), c.addEventListener("animationComplete", () => {
      this.safeToRemove();
    }), c.setOptions({
      ...c.options,
      layoutDependency: this.props.layoutDependency,
      onExitComplete: () => this.safeToRemove()
    })), oa.hasEverUpdated = !0;
  }
  getSnapshotBeforeUpdate(n) {
    const { layoutDependency: o, visualElement: i, drag: a, isPresent: c } = this.props, { projection: d } = i;
    return d && (d.isPresent = c, n.layoutDependency !== o && d.setOptions({
      ...d.options,
      layoutDependency: o
    }), Ju = !0, a || n.layoutDependency !== o || o === void 0 || n.isPresent !== c ? d.willUpdate() : this.safeToRemove(), n.isPresent !== c && (c ? d.promote() : d.relegate() || be.postRender(() => {
      const p = d.getStack();
      (!p || !p.members.length) && this.safeToRemove();
    }))), null;
  }
  componentDidUpdate() {
    const { visualElement: n, layoutAnchor: o } = this.props, { projection: i } = n;
    i && (i.options.layoutAnchor = o, i.root.didUpdate(), xd.postRender(() => {
      !i.currentAnimation && i.isLead() && this.safeToRemove();
    }));
  }
  componentWillUnmount() {
    const { visualElement: n, layoutGroup: o, switchLayoutGroup: i } = this.props, { projection: a } = n;
    Ju = !0, a && (a.scheduleCheckAfterUnmount(), o && o.group && o.group.remove(a), i && i.deregister && i.deregister(a));
  }
  safeToRemove() {
    const { safeToRemove: n } = this.props;
    n && n();
  }
  render() {
    return null;
  }
}
function Lv(e) {
  const [n, o] = Cv(), i = C.useContext(nd);
  return w.jsx(mA, { ...e, layoutGroup: i, switchLayoutGroup: C.useContext(Dv), isPresent: n, safeToRemove: o });
}
const yA = {
  pan: {
    Feature: hA
  },
  drag: {
    Feature: pA,
    ProjectionNode: Av,
    MeasureLayout: Lv
  }
};
function wy(e, n, o) {
  const { props: i } = e;
  e.animationState && i.whileHover && e.animationState.setActive("whileHover", o === "Start");
  const a = "onHover" + o, c = i[a];
  c && be.postRender(() => c(n, bi(n)));
}
class gA extends Gn {
  mount() {
    const { current: n } = this.node;
    n && (this.unmount = V_(n, (o, i) => (wy(this.node, i, "Start"), (a) => wy(this.node, a, "End"))));
  }
  unmount() {
  }
}
class vA extends Gn {
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
    this.unmount = Ti(yi(this.node.current, "focus", () => this.onFocus()), yi(this.node.current, "blur", () => this.onBlur()));
  }
  unmount() {
  }
}
function xy(e, n, o) {
  const { props: i } = e;
  if (e.current instanceof HTMLButtonElement && e.current.disabled)
    return;
  e.animationState && i.whileTap && e.animationState.setActive("whileTap", o === "Start");
  const a = "onTap" + (o === "End" ? "" : o), c = i[a];
  c && be.postRender(() => c(n, bi(n)));
}
class SA extends Gn {
  mount() {
    const { current: n } = this.node;
    if (!n)
      return;
    const { globalTapTarget: o, propagate: i } = this.node.props;
    this.unmount = W_(n, (a, c) => (xy(this.node, c, "Start"), (d, { success: p }) => xy(this.node, d, p ? "End" : "Cancel")), {
      useGlobalTarget: o,
      stopPropagation: (i == null ? void 0 : i.tap) === !1
    });
  }
  unmount() {
  }
}
const Fc = /* @__PURE__ */ new WeakMap(), ec = /* @__PURE__ */ new WeakMap(), wA = (e) => {
  const n = Fc.get(e.target);
  n && n(e);
}, xA = (e) => {
  e.forEach(wA);
};
function _A({ root: e, ...n }) {
  const o = e || document;
  ec.has(o) || ec.set(o, {});
  const i = ec.get(o), a = JSON.stringify(n);
  return i[a] || (i[a] = new IntersectionObserver(xA, { root: e, ...n })), i[a];
}
function kA(e, n, o) {
  const i = _A(n);
  return Fc.set(e, o), i.observe(e), () => {
    Fc.delete(e), i.unobserve(e);
  };
}
const TA = {
  some: 0,
  all: 1
};
class AA extends Gn {
  constructor() {
    super(...arguments), this.hasEnteredView = !1, this.isInView = !1;
  }
  startObserver() {
    var y;
    (y = this.stopObserver) == null || y.call(this);
    const { viewport: n = {} } = this.node.getProps(), { root: o, margin: i, amount: a = "some", once: c } = n, d = {
      root: o ? o.current : void 0,
      rootMargin: i,
      threshold: typeof a == "number" ? a : TA[a]
    }, p = (g) => {
      const { isIntersecting: S } = g;
      if (this.isInView === S || (this.isInView = S, c && !S && this.hasEnteredView))
        return;
      S && (this.hasEnteredView = !0), this.node.animationState && this.node.animationState.setActive("whileInView", S);
      const { onViewportEnter: l, onViewportLeave: f } = this.node.getProps(), v = S ? l : f;
      v && v(g);
    };
    this.stopObserver = kA(this.node.current, d, p);
  }
  mount() {
    this.startObserver();
  }
  update() {
    if (typeof IntersectionObserver > "u")
      return;
    const { props: n, prevProps: o } = this.node;
    ["amount", "margin", "root"].some(CA(n, o)) && this.startObserver();
  }
  unmount() {
    var n;
    (n = this.stopObserver) == null || n.call(this), this.hasEnteredView = !1, this.isInView = !1;
  }
}
function CA({ viewport: e = {} }, { viewport: n = {} } = {}) {
  return (o) => e[o] !== n[o];
}
const bA = {
  inView: {
    Feature: AA
  },
  tap: {
    Feature: SA
  },
  focus: {
    Feature: vA
  },
  hover: {
    Feature: gA
  }
}, EA = {
  layout: {
    ProjectionNode: Av,
    MeasureLayout: Lv
  }
}, PA = {
  ...qT,
  ...bA,
  ...yA,
  ...EA
}, MA = /* @__PURE__ */ KT(PA, YT), rn = MA;
function RA(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function Vv(e) {
  const n = String(e || "").toLowerCase();
  return n === "127.0.0.1" || n === "localhost" || n === "::1" || n === "[::1]";
}
function _y(e) {
  return Vv(e) || RA(e);
}
function NA(e) {
  return !e || Vv(e) ? "127.0.0.1" : e;
}
const DA = (() => {
  var S, l, f, v;
  const e = globalThis.window || globalThis, n = globalThis.document || {}, o = e.location || {}, i = String(e.SYNAPSE_DATA_API_PORT || ((l = (S = n.body) == null ? void 0 : S.dataset) == null ? void 0 : l.dataApiPort) || "3001").trim(), { protocol: a = "file:", hostname: c = "127.0.0.1", port: d = "" } = o, p = `http://${NA(c)}:${i || "3001"}`, y = String(e.SYNAPSE_DATA_API_BASE || ((v = (f = n.body) == null ? void 0 : f.dataset) == null ? void 0 : v.dataApiBase) || "").replace(/\/+$/, ""), g = `${a}//${o.host || (d ? `${c}:${d}` : c)}`.replace(/\/+$/, "");
  return y && !(_y(c) && d !== i && y === g) ? y : a === "file:" || _y(c) && d !== i ? p : `${a}//${o.host || c}`;
})(), jA = new Jy(DA), tc = Number((globalThis.window || globalThis).SYNAPSE_DATA_API_TIMEOUT_MS || 6e3), IA = Number.isFinite(tc) && tc > 0 ? tc : 6e3;
function FA(e, n) {
  typeof window > "u" || console.warn(e, n);
}
async function OA(e) {
  var i, a;
  const o = (((a = (i = e.headers) == null ? void 0 : i.get) == null ? void 0 : a.call(i, "content-type")) || "").includes("application/json") ? await e.json() : {};
  if (!e.ok || (o == null ? void 0 : o.ok) === !1)
    throw new Error((o == null ? void 0 : o.error) || `Synapse data API returned HTTP ${e.status}`);
  return o;
}
async function LA(e, n = {}) {
  const o = await jA.fetch(e, {
    timeoutMs: IA,
    ...n
  });
  return OA(o);
}
async function VA(e) {
  try {
    return (await LA("/api/focus-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(e || {})
    })).item || null;
  } catch (n) {
    return FA("Synapse data API focus-session save skipped:", n), null;
  }
}
class zA {
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
const zv = new zA();
function Rd(e, n) {
  return zv.readJSON(e, n);
}
function Nd(e, n) {
  return zv.writeJSON(e, n);
}
const Bv = "synapse.focusRoom.sessions.v1", Uv = "synapse.focusRoom.draft.v1", $v = "synapse.focusRoom.active-session.v1", Oc = 40, ky = Object.freeze([
  "idle",
  "running",
  "paused",
  "completed",
  "break",
  "restoring"
]), BA = Object.freeze({
  studying: "running",
  running: "running",
  idle: "idle",
  paused: "paused",
  completed: "completed",
  break: "break",
  restoring: "restoring"
});
let Lc = [];
const cr = (e) => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURI(e)}`, gi = [
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
    streamUrl: cr("Raspberrymusic_-_Lofi_Hip_Hop_Upbeat.ogg"),
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
], Jr = Object.freeze([
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
function UA(e = "") {
  const n = String(e || "");
  return Jr.find((o) => o.id === n) || Jr[Jr.length - 1];
}
function Hv(e = {}) {
  return Jr.find((n) => n.musicType === String((e == null ? void 0 : e.musicType) || "") && n.ambientSound === String((e == null ? void 0 : e.ambientSound) || "")) || null;
}
const Ye = {
  nature: {
    id: "nature-forest",
    title: "Forest ambience",
    artist: "nille",
    streamUrl: cr("20090610_0_ambience.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:20090610_0_ambience.ogg",
    license: "Public domain",
    attribution: "Forest ambience by nille",
    volumeBias: 1
  },
  cafe: {
    id: "cafe-ambiance",
    title: "Cafe ambiance",
    artist: "Marble Toast",
    streamUrl: cr("Cafe_ambiance.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Cafe_ambiance.ogg",
    license: "CC0",
    attribution: "Cafe ambiance by Marble Toast",
    volumeBias: 0.72
  },
  rain: {
    id: "rain",
    title: "Rain",
    artist: "ezwa",
    streamUrl: cr("Rain_(1).ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Rain_(1).ogg",
    license: "Public domain",
    attribution: "Rain by ezwa",
    volumeBias: 0.48
  },
  whiteNoise: {
    id: "white-noise",
    title: "White noise",
    artist: "Bautsch",
    streamUrl: cr("White.Noise.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:White.Noise.ogg",
    license: "Public domain",
    attribution: "White noise by Bautsch",
    volumeBias: 1
  },
  ocean: {
    id: "ocean-waves",
    title: "Waves",
    artist: "Dsw4",
    streamUrl: cr("Waves.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Waves.ogg",
    license: "CC BY 3.0",
    attribution: "Waves by Dsw4",
    volumeBias: 1
  },
  wind: {
    id: "howling-wind",
    title: "Howling wind",
    artist: "Tvabutzku1234",
    streamUrl: cr("Howling_wind.ogg"),
    pageUrl: "https://commons.wikimedia.org/wiki/File:Howling_wind.ogg",
    license: "CC0",
    attribution: "Howling wind by Tvabutzku1234",
    volumeBias: 0.78
  }
}, vi = [
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
], gn = [
  {
    id: "morning-window",
    name: "Morning Window",
    kicker: "Bright focus",
    description: "Soft daylight, quiet desk, gentle outdoor calm.",
    image: "./assets/focus-room/morning-window.webp",
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
  }
], $A = [
  {
    ...gn[0],
    name: "清晨窗边",
    kicker: "晨光 · 植物",
    description: "A bright morning desk beside a leafy window.",
    image: "./assets/focus-room/innook/morning-window.jpg"
  },
  ...gn.filter((e) => e.galleryOnly)
], Wv = [25, 45, 50, 90];
function HA(e = "") {
  const n = String(e || "");
  return gi.find((o) => o.label === n) || gi[0];
}
function WA(e = "") {
  const n = String(e || "");
  return vi.find((o) => o.label === n) || vi[0];
}
function Ia(e = {}) {
  const n = HA(e == null ? void 0 : e.musicType), o = WA(e == null ? void 0 : e.ambientSound);
  return {
    musicTrack: n,
    ambientSound: o,
    ambientLayers: o.layers.map((i) => ({
      ...i,
      volumeBias: zn(i.volumeBias, 1)
    }))
  };
}
function GA(e) {
  return e && typeof e == "object" && !Array.isArray(e) ? e : {};
}
function Gv(e) {
  return String(e || "").trim();
}
function KA({ material: e, goal: n, durationMinutes: o }) {
  var S;
  const i = Math.max(10, Number(o) || 25), a = (S = e == null ? void 0 : e.studyHeadings) != null && S.length ? e.studyHeadings : ["Key ideas", "Examples", "Practice", "Review"], c = String(n || "").trim() || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`, d = Math.max(1, Math.floor(i * 0.2)), p = Math.max(1, Math.floor(i * 0.4)), y = Math.max(1, Math.floor(i * 0.2)), g = Math.max(1, i - d - p - y);
  return [
    { minutes: d, task: `Set the goal: ${c}` },
    { minutes: p, task: `Review ${a[0] || "the core ideas"}` },
    { minutes: y, task: `Practice with ${a[1] || a[0] || "the generated examples"}` },
    { minutes: g, task: "Summarize mistakes and choose the next study step" }
  ];
}
function Kv() {
  return Rd(Uv, null);
}
function YA(e) {
  return Nd(Uv, e || null);
}
function Yv(e) {
  if (!e || typeof e != "object")
    return { materials: {} };
  const n = GA(e.materials);
  return {
    ...e,
    materials: { ...n }
  };
}
function oo(e, n = "idle") {
  const o = BA[String(e || "").trim().toLowerCase()];
  return o && ky.includes(o) ? o : ky.includes(n) ? n : "idle";
}
function Dd(e) {
  return oo(e) === "running" ? "studying" : oo(e);
}
function Qv(e = {}, n = {}) {
  const o = e && typeof e == "object" ? e : {}, i = n && typeof n == "object" ? n : {}, a = Object.prototype.hasOwnProperty.call(o, "timerStatus"), c = Object.prototype.hasOwnProperty.call(o, "timerState") || Object.prototype.hasOwnProperty.call(o, "timerPhase"), d = oo(
    c ? o.timerState || o.timerPhase : a ? o.timerStatus : o.status || i.timerState,
    oo(i.timerState || i.timerPhase || i.timerStatus)
  ), p = o.timerMode === "countup" || i.timerMode === "countup" && !Object.prototype.hasOwnProperty.call(o, "timerMode") ? "countup" : "countdown", g = Object.fromEntries(["timerAnchorAtMs", "timerPausedAtMs", "timerUpdatedAtMs", "timerRestoredAtMs"].map((l) => {
    const f = Object.prototype.hasOwnProperty.call(o, l) ? o[l] : i[l], v = Number(f);
    return [l, Number.isFinite(v) && v > 0 ? v : null];
  })), S = Math.max(0, zn(
    Object.prototype.hasOwnProperty.call(o, "elapsedSeconds") ? o.elapsedSeconds : i.elapsedSeconds,
    0
  ));
  return {
    ...i,
    ...o,
    timerState: d,
    timerPhase: d,
    status: d,
    timerStatus: Dd(d),
    timerMode: p,
    elapsedSeconds: S,
    ...g
  };
}
function Xv() {
  return Yv(Rd($v, null));
}
function QA(e) {
  return Nd($v, Yv(e));
}
function XA(e) {
  const n = Gv(e);
  if (!n) return null;
  const i = Xv().materials[n];
  return i && typeof i == "object" ? Qv(i) : null;
}
function jd(e, n) {
  const o = Gv(e);
  if (!o) return !1;
  const i = Xv();
  return n && typeof n == "object" ? i.materials[o] = {
    ...Qv(n, i.materials[o]),
    materialId: o,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  } : delete i.materials[o], QA(i);
}
function Zv(e) {
  return jd(e, null);
}
function Vc() {
  const e = Rd(Bv, []), n = Array.isArray(e) ? e : [], o = /* @__PURE__ */ new Set();
  return [...Lc, ...n].filter((i) => {
    const a = String((i == null ? void 0 : i.sessionId) || "");
    return !a || o.has(a) ? !1 : (o.add(a), !0);
  }).slice(0, Oc);
}
function zn(e, n) {
  const o = Number(e);
  return Number.isFinite(o) ? o : n;
}
function ZA(e = {}) {
  const n = (/* @__PURE__ */ new Date()).toISOString(), i = { ...{
    sessionId: e.sessionId || `focus-${Date.now()}`,
    materialId: String(e.materialId || ""),
    materialTitle: e.materialTitle || "Study material",
    studyGoal: e.studyGoal || "",
    selectedScene: e.selectedScene || "morning-window",
    musicType: e.musicType || "Deep Focus",
    ambientSound: e.ambientSound || "Nature",
    musicVolume: zn(e.musicVolume ?? 60, 60),
    ambientVolume: zn(e.ambientVolume ?? 50, 50),
    pomodoroDuration: zn(e.pomodoroDuration || 25, 25),
    startedAt: e.startedAt || n,
    endedAt: e.endedAt || n,
    totalFocusTime: Math.max(0, zn(e.totalFocusTime || 0, 0)),
    flashcardsCompleted: Math.max(0, zn(e.flashcardsCompleted || 0, 0)),
    quizScore: e.quizScore === null || e.quizScore === void 0 || e.quizScore === "" ? null : Number.isFinite(Number(e.quizScore)) ? Number(e.quizScore) : null,
    mistakesMade: Array.isArray(e.mistakesMade) ? e.mistakesMade : [],
    completedTasks: Array.isArray(e.completedTasks) ? e.completedTasks : [],
    aiReflection: e.aiReflection || "You protected a focused study block and created momentum for the next session.",
    recommendedNextStep: e.recommendedNextStep || "Review the hardest item, then start another short focus block.",
    sessionDate: e.sessionDate || n
  }, persisted: !0 }, a = Vc().filter((y) => y.sessionId !== i.sessionId), c = [i, ...a.map((y) => ({ ...y, persisted: !0 }))].slice(0, Oc), d = Nd(Bv, c), p = { ...i, persisted: d };
  return VA(p).catch((y) => {
    console.warn("Synapse data API focus-session background save failed:", y);
  }), d ? Lc = [] : Lc = [p, ...a].slice(0, Oc), p;
}
function Id(e) {
  const n = Math.max(0, zn(e || 0, 0)), o = Math.floor(n / 3600), i = Math.floor(n % 3600 / 60);
  return o ? `${o}h ${i}m` : `${i}m`;
}
var Xy;
const zc = ((Xy = gn[0]) == null ? void 0 : Xy.id) || "morning-window", qr = Wv[0] || 25, qv = 10, xa = 180, qA = 0, JA = 100, eC = ["materials", "notes", "sources", "chat", "quiz", "flashcards", "mindmap", "plan", "workspace", "history"], Bc = new Set(eC), ia = {
  type: "spring",
  stiffness: 120,
  damping: 18,
  mass: 0.8
};
function tC(e, n, o, i) {
  const a = Number(e);
  return Number.isFinite(a) ? Math.min(i, Math.max(o, a)) : n;
}
function eo(e, n, o, i) {
  return Math.round(tC(e, n, o, i));
}
function yr(e, n = 50) {
  return eo(e, n, qA, JA);
}
function Si(e, n = qr) {
  return eo(e, n, qv, xa);
}
function Fd(e) {
  return gn.find((n) => n.id === e) || null;
}
function Wn(e = zc) {
  return Fd(e) || gn[0] || {
    id: zc,
    name: "Focus Room",
    kicker: "Focus",
    description: "A quiet study space.",
    image: "",
    ambientSound: "Nature",
    musicType: "Deep Focus"
  };
}
function Jv(e) {
  return Array.isArray(e) ? e.map((n) => ({
    minutes: eo(n == null ? void 0 : n.minutes, 5, 1, xa),
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
function e0(e) {
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
function Uc(e, n, o) {
  return e ? KA({
    material: e,
    goal: n,
    durationMinutes: o
  }) : [];
}
function qt(e) {
  const n = Si(e);
  return n > 0 ? n * 60 : 0;
}
function ci(e) {
  const n = Math.max(0, Math.floor(Number(e) || 0)), o = Math.floor(n / 3600), i = Math.floor(n % 3600 / 60), a = n % 60, c = (d) => String(d).padStart(2, "0");
  return o ? `${o}:${c(i)}:${c(a)}` : `${c(i)}:${c(a)}`;
}
function Ty(e) {
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
function $c(e) {
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
function Od(e) {
  return String((e == null ? void 0 : e.type) || "").toLowerCase();
}
function iC(e) {
  return String((e == null ? void 0 : e.label) || (e == null ? void 0 : e.text) || e).trim();
}
function _a(e) {
  const n = (e == null ? void 0 : e.choices) || (e == null ? void 0 : e.options) || (e == null ? void 0 : e.answers);
  return Array.isArray(n) && n.length ? n.map(iC).filter(Boolean) : Od(e) === "true_false" ? ["True", "False"] : [];
}
function Hc(e) {
  const n = (e == null ? void 0 : e.correctOptionIndexes) || (e == null ? void 0 : e.correct_option_indexes) || (e == null ? void 0 : e.correctIndexes);
  return Array.isArray(n) ? n.map((o) => Number(o)).filter(Number.isInteger) : [];
}
function sC(e, n) {
  const o = Array.isArray(e) ? [...e].map(Number).filter(Number.isInteger).sort((a, c) => a - c) : [], i = Array.isArray(n) ? [...n].map(Number).filter(Number.isInteger).sort((a, c) => a - c) : [];
  return o.length === i.length && o.every((a, c) => a === i[c]);
}
function gr(e) {
  return String(e || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function ka(e, n) {
  if (Number.isInteger(n)) return n;
  const o = Number(n);
  if (typeof n != "string" && Number.isInteger(o)) return o;
  const i = _a(e), a = gr(n);
  return i.findIndex((c) => gr(c) === a);
}
function t0(e, n) {
  if (typeof n == "boolean") return n;
  if (n === 0) return !0;
  if (n === 1) return !1;
  const o = _a(e), i = gr(n);
  return i === "true" ? !0 : i === "false" ? !1 : gr(o[0]) === i ? !0 : gr(o[1]) === i ? !1 : null;
}
function aC(e, n, o) {
  const i = Od(e);
  if (i === "multiple_choice") {
    const a = ka(e, n);
    if (!Number.isInteger(a) || a < 0) return [];
    const c = Array.isArray(o) ? [...o] : [];
    return c.includes(a) ? c.filter((d) => d !== a) : [...c, a].sort((d, p) => d - p);
  }
  if (i === "single_choice") {
    const a = ka(e, n);
    return Number.isInteger(a) && a >= 0 ? a : "";
  }
  if (i === "true_false") {
    const a = t0(e, n);
    return a === null ? "" : a;
  }
  return String(n || "");
}
function n0(e) {
  const n = (e == null ? void 0 : e.correctAnswer) ?? (e == null ? void 0 : e.correct_answer) ?? (e == null ? void 0 : e.answer) ?? (e == null ? void 0 : e.correct), o = Hc(e);
  if (o.length) {
    const i = _a(e);
    return o.map((a) => i[a] || "").filter(Boolean).join(", ");
  }
  if (typeof (e == null ? void 0 : e.correctBoolean) == "boolean" || typeof (e == null ? void 0 : e.correct_boolean) == "boolean") {
    const i = _a(e);
    return (typeof e.correctBoolean == "boolean" ? e.correctBoolean : e.correct_boolean) ? i[0] || "True" : i[1] || "False";
  }
  return e != null && e.expectedAnswer || e != null && e.expected_answer ? String(e.expectedAnswer || e.expected_answer || "").trim() : Array.isArray(n) ? n.map((i) => String(i)).join(", ") : String(n || "").trim();
}
function lC(e, n) {
  const o = Od(e);
  if (o === "single_choice") {
    const a = Hc(e)[0], c = ka(e, n);
    return Number.isInteger(a) ? c === a : null;
  }
  if (o === "multiple_choice") {
    const a = Hc(e), c = Array.isArray(n) ? n : [ka(e, n)].filter(Number.isInteger);
    return a.length ? sC(c, a) : null;
  }
  if (o === "true_false") {
    const a = typeof (e == null ? void 0 : e.correctBoolean) == "boolean" ? e.correctBoolean : e == null ? void 0 : e.correct_boolean, c = t0(e, n);
    return typeof a == "boolean" && c !== null ? c === a : null;
  }
  const i = n0(e);
  return i ? gr(n) === gr(i) : null;
}
function r0(e, n, o) {
  var p;
  const i = String(e || "").trim(), a = String((n == null ? void 0 : n.summaryText) || (n == null ? void 0 : n.aiSummary) || "").slice(0, 420), c = ((p = n == null ? void 0 : n.studyHeadings) == null ? void 0 : p[0]) || (n == null ? void 0 : n.materialTitle) || "this material", d = o || `Study ${(n == null ? void 0 : n.materialTitle) || "this material"}`;
  return i ? [
    `For ${c}: ${a || "use the selected material as your main source."}`,
    `Your current goal is: ${d}.`,
    "Try explaining the idea in one sentence, then test yourself with one example before moving on."
  ].join(" ") : "";
}
function uC() {
  return /* @__PURE__ */ w.jsx("svg", { className: "liquid-glass-filter-defs", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ w.jsx("defs", { children: /* @__PURE__ */ w.jsxs("filter", { id: "liquid-glass-displacement", x: "-12%", y: "-12%", width: "124%", height: "124%", colorInterpolationFilters: "sRGB", children: [
    /* @__PURE__ */ w.jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.012 0.024", numOctaves: "2", seed: "17", result: "liquid-noise" }),
    /* @__PURE__ */ w.jsx("feDisplacementMap", { in: "SourceGraphic", in2: "liquid-noise", scale: "7", xChannelSelector: "R", yChannelSelector: "B", result: "refracted-surface" }),
    /* @__PURE__ */ w.jsx("feColorMatrix", { in: "refracted-surface", type: "matrix", values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.04 0", result: "edge-alpha" }),
    /* @__PURE__ */ w.jsx("feGaussianBlur", { in: "edge-alpha", stdDeviation: "0.25", result: "soft-edge" }),
    /* @__PURE__ */ w.jsx("feBlend", { in: "soft-edge", in2: "refracted-surface", mode: "screen" })
  ] }) }) });
}
function cC({ scene: e }) {
  const [n, o] = C.useState(!1), [i, a] = C.useState(!1);
  return C.useEffect(() => {
    o(!1), a(!1);
  }, [e == null ? void 0 : e.id]), /* @__PURE__ */ w.jsxs("div", { className: "focus-background-wrap", "aria-hidden": "true", children: [
    /* @__PURE__ */ w.jsx(uC, {}),
    /* @__PURE__ */ w.jsx(Da, { mode: "wait", children: /* @__PURE__ */ w.jsxs(
      rn.div,
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
const dC = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), fC = (e) => e.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (n, o, i) => i ? i.toUpperCase() : o.toLowerCase()
), Ay = (e) => {
  const n = fC(e);
  return n.charAt(0).toUpperCase() + n.slice(1);
}, o0 = (...e) => e.filter((n, o, i) => !!n && n.trim() !== "" && i.indexOf(n) === o).join(" ").trim(), pC = (e) => {
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
const mC = C.forwardRef(
  ({
    color: e = "currentColor",
    size: n = 24,
    strokeWidth: o = 2,
    absoluteStrokeWidth: i,
    className: a = "",
    children: c,
    iconNode: d,
    ...p
  }, y) => C.createElement(
    "svg",
    {
      ref: y,
      ...hC,
      width: n,
      height: n,
      stroke: e,
      strokeWidth: i ? Number(o) * 24 / Number(n) : o,
      className: o0("lucide", a),
      ...!c && !pC(p) && { "aria-hidden": "true" },
      ...p
    },
    [
      ...d.map(([g, S]) => C.createElement(g, S)),
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
const ke = (e, n) => {
  const o = C.forwardRef(
    ({ className: i, ...a }, c) => C.createElement(mC, {
      ref: c,
      iconNode: n,
      className: o0(
        `lucide-${dC(Ay(e))}`,
        `lucide-${e}`,
        i
      ),
      ...a
    })
  );
  return o.displayName = Ay(e), o;
};
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const yC = [
  ["circle", { cx: "12", cy: "13", r: "8", key: "3y4lt7" }],
  ["path", { d: "M5 3 2 6", key: "18tl5t" }],
  ["path", { d: "m22 6-3-3", key: "1opdir" }],
  ["path", { d: "M6.38 18.7 4 21", key: "17xu3x" }],
  ["path", { d: "M17.64 18.67 20 21", key: "kv2oe2" }],
  ["path", { d: "M12 10v6", key: "1bos4e" }],
  ["path", { d: "M9 13h6", key: "1uhe8q" }]
], gC = ke("alarm-clock-plus", yC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const vC = [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
], SC = ke("arrow-left", vC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const wC = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
], Wc = ke("arrow-right", wC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const xC = [
  ["path", { d: "M12 7v14", key: "1akyts" }],
  [
    "path",
    {
      d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
      key: "ruj8y"
    }
  ]
], _C = ke("book-open", xC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const kC = [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]], TC = ke("check", kC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const AC = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", key: "1u773s" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }]
], CC = ke("circle-help", AC);
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
], EC = ke("coffee", bC);
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
], MC = ke("dices", PC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const RC = [
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
], NC = ke("door-open", RC);
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
], Ta = ke("footprints", DC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const jC = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }],
  ["path", { d: "M12 7v5l4 2", key: "1fdv2h" }]
], Gc = ke("history", jC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const IC = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2", key: "1m3agn" }],
  ["circle", { cx: "9", cy: "9", r: "2", key: "af1f0g" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "1xmnt7" }]
], FC = ke("image", IC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const OC = [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 9.9-1", key: "1mm8w8" }]
], LC = ke("lock-open", OC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const VC = [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4", key: "fwvmzm" }]
], zC = ke("lock", VC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const BC = [
  ["path", { d: "m14 10 7-7", key: "oa77jy" }],
  ["path", { d: "M20 10h-6V4", key: "mjg0md" }],
  ["path", { d: "m3 21 7-7", key: "tjx5ai" }],
  ["path", { d: "M4 14h6v6", key: "rmj7iw" }]
], UC = ke("minimize-2", BC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const $C = [
  ["circle", { cx: "8", cy: "18", r: "4", key: "1fc0mg" }],
  ["path", { d: "M12 18V2l7 4", key: "g04rme" }]
], i0 = ke("music-2", $C);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const HC = [
  ["path", { d: "M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4", key: "re6nr2" }],
  ["path", { d: "M2 6h4", key: "aawbzj" }],
  ["path", { d: "M2 10h4", key: "l0bgd4" }],
  ["path", { d: "M2 14h4", key: "1gsvsf" }],
  ["path", { d: "M2 18h4", key: "1bu2t1" }],
  [
    "path",
    {
      d: "M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z",
      key: "pqwjuv"
    }
  ]
], WC = ke("notebook-pen", HC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const GC = [
  ["rect", { x: "14", y: "4", width: "4", height: "16", rx: "1", key: "zuxfzm" }],
  ["rect", { x: "6", y: "4", width: "4", height: "16", rx: "1", key: "1okwgv" }]
], Aa = ke("pause", GC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const KC = [
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
], YC = ke("piano", KC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const QC = [["polygon", { points: "6 3 20 12 6 21 6 3", key: "1oa8hb" }]], Ld = ke("play", QC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const XC = [
  ["path", { d: "M4.9 19.1C1 15.2 1 8.8 4.9 4.9", key: "1vaf9d" }],
  ["path", { d: "M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5", key: "u1ii0m" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }],
  ["path", { d: "M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5", key: "1j5fej" }],
  ["path", { d: "M19.1 4.9C23 8.8 23 15.1 19.1 19", key: "10b0cb" }]
], s0 = ke("radio", XC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ZC = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
], a0 = ke("rotate-ccw", ZC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const qC = [
  [
    "path",
    {
      d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
      key: "1c8476"
    }
  ],
  ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7", key: "1ydtos" }],
  ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7", key: "t51u73" }]
], JC = ke("save", qC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const eb = [
  ["path", { d: "M14 17H5", key: "gfn3mx" }],
  ["path", { d: "M19 7h-9", key: "6i9tg" }],
  ["circle", { cx: "17", cy: "17", r: "3", key: "18b49y" }],
  ["circle", { cx: "7", cy: "7", r: "3", key: "dfmy0x" }]
], wi = ke("settings-2", eb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const tb = [
  ["polygon", { points: "5 4 15 12 5 20 5 4", key: "16p6eg" }],
  ["line", { x1: "19", x2: "19", y1: "5", y2: "19", key: "futhcm" }]
], Vd = ke("skip-forward", tb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const nb = [
  ["line", { x1: "21", x2: "14", y1: "4", y2: "4", key: "obuewd" }],
  ["line", { x1: "10", x2: "3", y1: "4", y2: "4", key: "1q6298" }],
  ["line", { x1: "21", x2: "12", y1: "12", y2: "12", key: "1iu8h1" }],
  ["line", { x1: "8", x2: "3", y1: "12", y2: "12", key: "ntss68" }],
  ["line", { x1: "21", x2: "16", y1: "20", y2: "20", key: "14d8ph" }],
  ["line", { x1: "12", x2: "3", y1: "20", y2: "20", key: "m0wm8r" }],
  ["line", { x1: "14", x2: "14", y1: "2", y2: "6", key: "14e1ph" }],
  ["line", { x1: "8", x2: "8", y1: "10", y2: "14", key: "1i6ji0" }],
  ["line", { x1: "16", x2: "16", y1: "18", y2: "22", key: "1lctlv" }]
], rb = ke("sliders-horizontal", nb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ob = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
], ib = ke("square-check", ob);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const sb = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["circle", { cx: "12", cy: "12", r: "6", key: "1vlfrh" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }]
], ab = ke("target", sb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const lb = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744", key: "16gr8j" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }]
], Ca = ke("users", lb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ub = [
  [
    "path",
    {
      d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
      key: "uqj9uw"
    }
  ],
  ["path", { d: "M16 9a5 5 0 0 1 0 6", key: "1q6k2b" }],
  ["path", { d: "M19.364 18.364a9 9 0 0 0 0-12.728", key: "ijwkga" }]
], Fa = ke("volume-2", ub);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const cb = [
  [
    "path",
    {
      d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
      key: "uqj9uw"
    }
  ],
  ["line", { x1: "22", x2: "16", y1: "9", y2: "15", key: "1ewh16" }],
  ["line", { x1: "16", x2: "22", y1: "9", y2: "15", key: "5ykzw1" }]
], db = ke("volume-x", cb);
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
], l0 = ke("waves", fb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const pb = [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
], u0 = ke("x", pb);
function hb({ onStart: e, onWorkspace: n, onHistory: o }) {
  return /* @__PURE__ */ w.jsxs("div", { className: "focus-landing-shell", children: [
    /* @__PURE__ */ w.jsxs("header", { className: "focus-landing-header", children: [
      /* @__PURE__ */ w.jsxs("button", { type: "button", className: "focus-landing-brand", onClick: n, "aria-label": "Return to Synapse workspace", children: [
        /* @__PURE__ */ w.jsx("span", { className: "focus-wordmark-mark", children: "S" }),
        /* @__PURE__ */ w.jsxs("span", { className: "focus-landing-brand-copy", children: [
          /* @__PURE__ */ w.jsx("strong", { children: "synapse" }),
          /* @__PURE__ */ w.jsx("small", { children: "Focus Room" })
        ] })
      ] }),
      /* @__PURE__ */ w.jsxs("nav", { className: "focus-landing-actions", "aria-label": "Focus Room navigation", children: [
        /* @__PURE__ */ w.jsx("button", { type: "button", className: "focus-landing-icon", onClick: o, "aria-label": "Open Focus Trail", title: "Open Focus Trail", children: /* @__PURE__ */ w.jsx(Gc, { size: 16, "aria-hidden": "true" }) }),
        /* @__PURE__ */ w.jsxs("button", { type: "button", className: "focus-landing-language", "aria-label": "Current language", children: [
          "中文 ",
          /* @__PURE__ */ w.jsx("span", { "aria-hidden": "true", children: "⌄" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ w.jsxs("section", { className: "focus-landing-hero", "aria-labelledby": "focus-landing-title", children: [
      /* @__PURE__ */ w.jsx("p", { className: "focus-landing-eyebrow", children: "FOCUS · LEARN · GROW" }),
      /* @__PURE__ */ w.jsx("h1", { id: "focus-landing-title", children: "开启你的专注空间" }),
      /* @__PURE__ */ w.jsx("p", { className: "focus-landing-subtitle", children: "选择场景、音乐与节奏，把最清醒的时间留给真正重要的学习。" }),
      /* @__PURE__ */ w.jsxs("button", { type: "button", className: "focus-landing-enter", onClick: e, children: [
        /* @__PURE__ */ w.jsx("span", { children: "开始学习" }),
        /* @__PURE__ */ w.jsx(Wc, { size: 17, "aria-hidden": "true" })
      ] }),
      /* @__PURE__ */ w.jsxs("div", { className: "focus-landing-secondary", "aria-label": "Synapse Focus Room shortcuts", children: [
        /* @__PURE__ */ w.jsxs("span", { children: [
          /* @__PURE__ */ w.jsx(_C, { size: 13, "aria-hidden": "true" }),
          " Synapse Study Space"
        ] }),
        /* @__PURE__ */ w.jsxs("button", { type: "button", onClick: n, children: [
          /* @__PURE__ */ w.jsx(wi, { size: 13, "aria-hidden": "true" }),
          " Workspace"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ w.jsxs("footer", { className: "focus-landing-footer liquid-glass", children: [
      /* @__PURE__ */ w.jsxs("div", { className: "focus-landing-footer-grid", children: [
        /* @__PURE__ */ w.jsxs("div", { className: "focus-landing-footer-brand", children: [
          /* @__PURE__ */ w.jsxs("div", { className: "focus-landing-footer-lockup", children: [
            /* @__PURE__ */ w.jsx("span", { className: "focus-wordmark-mark", children: "S" }),
            /* @__PURE__ */ w.jsxs("span", { children: [
              /* @__PURE__ */ w.jsx("strong", { children: "synapse" }),
              /* @__PURE__ */ w.jsx("small", { children: "AI Study Assistant" })
            ] })
          ] }),
          /* @__PURE__ */ w.jsx("p", { children: "一个专注学习与成长的空间，让每一次学习都更有深度。" })
        ] }),
        /* @__PURE__ */ w.jsxs("div", { className: "focus-landing-footer-resource", children: [
          /* @__PURE__ */ w.jsx("strong", { children: "学习资源" }),
          /* @__PURE__ */ w.jsx("p", { children: "生成笔记、AI Tutor 与学习工具都会在你的 Focus Room 中保留。" })
        ] }),
        /* @__PURE__ */ w.jsxs("div", { className: "focus-landing-footer-actions", children: [
          /* @__PURE__ */ w.jsx("button", { type: "button", className: "focus-landing-icon", onClick: o, "aria-label": "Open Focus Trail", title: "Open Focus Trail", children: /* @__PURE__ */ w.jsx(Gc, { size: 17, "aria-hidden": "true" }) }),
          /* @__PURE__ */ w.jsx("button", { type: "button", className: "focus-landing-icon", onClick: n, "aria-label": "Open Synapse workspace", title: "Open Synapse workspace", children: /* @__PURE__ */ w.jsx(wi, { size: 17, "aria-hidden": "true" }) }),
          /* @__PURE__ */ w.jsx("button", { type: "button", className: "focus-landing-icon", onClick: e, "aria-label": "Start studying", title: "Start studying", children: /* @__PURE__ */ w.jsx(Wc, { size: 17, "aria-hidden": "true" }) })
        ] })
      ] }),
      /* @__PURE__ */ w.jsx("div", { className: "focus-landing-footer-meta", children: "Synapse Focus Room · Your materials, your pace, your space" })
    ] })
  ] });
}
const Cy = (e) => {
  let n;
  const o = /* @__PURE__ */ new Set(), i = (g, S) => {
    const l = typeof g == "function" ? g(n) : g;
    if (!Object.is(l, n)) {
      const f = n;
      n = S ?? (typeof l != "object" || l === null) ? l : Object.assign({}, n, l), o.forEach((v) => v(n, f));
    }
  }, a = () => n, p = { setState: i, getState: a, getInitialState: () => y, subscribe: (g) => (o.add(g), () => o.delete(g)) }, y = n = e(i, a, p);
  return p;
}, mb = ((e) => e ? Cy(e) : Cy), yb = (e) => e;
function gb(e, n = yb) {
  const o = yn.useSyncExternalStore(
    e.subscribe,
    yn.useCallback(() => n(e.getState()), [e, n]),
    yn.useCallback(() => n(e.getInitialState()), [e, n])
  );
  return yn.useDebugValue(o), o;
}
const by = (e) => {
  const n = mb(e), o = (i) => gb(n, i);
  return Object.assign(o, n), o;
}, vb = ((e) => e ? by(e) : by), zd = Object.freeze({
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
function Sb() {
  return gn[0] || Wn(zc);
}
function wb(e) {
  const n = String(e || "");
  if (!n) return null;
  const i = e0(Kv()).materials[n];
  return i && typeof i == "object" ? i : null;
}
function Xt(e) {
  var i;
  const n = String(e.selectedMaterialId || ((i = e.selectedMaterial) == null ? void 0 : i.materialId) || "");
  if (!n) return;
  const o = e0(Kv());
  o.materials[n] = {
    materialId: n,
    selectedScene: e.selectedScene,
    musicType: e.musicType,
    ambientSound: e.ambientSound,
    musicVolume: yr(e.musicVolume),
    ambientVolume: yr(e.ambientVolume),
    audioChannels: { ...zd, ...e.audioChannels || {} },
    durationMinutes: Si(e.pomodoroDuration),
    studyGoal: e.studyGoal,
    studyPlan: Jv(e.studyPlan),
    completedTasks: Array.isArray(e.completedTasks) ? e.completedTasks.filter(Boolean) : [],
    workspaceNotes: String(e.workspaceNotes || ""),
    workspaceUpdatedAt: e.workspaceUpdatedAt || "",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }, YA(o);
}
function xb(e) {
  return Array.isArray(e == null ? void 0 : e.completedTasks) ? e.completedTasks.map((n) => String(n || "").trim()).filter(Boolean) : [];
}
function Kc(e = {}) {
  return {
    sectionTitle: String(e.sectionTitle || "").trim(),
    excerpt: String(e.excerpt || "").trim().slice(0, 1800)
  };
}
function c0(e = null) {
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
function ht() {
  const e = Date.now();
  return Number.isFinite(e) ? e : 0;
}
function Ut(e = {}) {
  return oo(e.timerState || e.timerPhase || e.status || e.timerStatus);
}
function Bn(e = {}) {
  if (e.timerMode === "countup") return 0;
  const n = Number(e.timerDurationSeconds);
  return Number.isFinite(n) && n > 0 ? n : qt(e.pomodoroDuration);
}
function di(e = {}, n = ht()) {
  const o = Math.max(0, Number(e.elapsedSeconds) || 0);
  if (Ut(e) !== "running") return o;
  const i = Number(e.timerAnchorAtMs);
  return !Number.isFinite(i) || i <= 0 ? o : Math.max(o, Math.floor(Math.max(0, n - i) / 1e3));
}
function Bt(e, n = ht()) {
  const o = oo(e);
  return {
    timerState: o,
    timerPhase: o,
    status: o,
    timerStatus: Dd(o),
    timerUpdatedAtMs: n
  };
}
function _b(e = {}) {
  const n = Ut(e);
  return {
    timerState: n,
    timerPhase: n,
    status: n,
    timerStatus: Dd(n),
    timerMode: e.timerMode === "countup" ? "countup" : "countdown",
    timerAnchorAtMs: Number.isFinite(Number(e.timerAnchorAtMs)) ? Number(e.timerAnchorAtMs) : null,
    timerPausedAtMs: Number.isFinite(Number(e.timerPausedAtMs)) ? Number(e.timerPausedAtMs) : null,
    timerUpdatedAtMs: Number.isFinite(Number(e.timerUpdatedAtMs)) ? Number(e.timerUpdatedAtMs) : null,
    timerRestoredAtMs: Number.isFinite(Number(e.timerRestoredAtMs)) ? Number(e.timerRestoredAtMs) : null,
    timerDurationSeconds: Bn(e),
    pomodoroDuration: e.pomodoroDuration,
    elapsedSeconds: Math.max(0, Number(e.elapsedSeconds) || 0),
    startedAt: e.startedAt || null,
    currentSession: e.currentSession || null,
    view: e.view
  };
}
function hn(e) {
  var o;
  const n = String(e.selectedMaterialId || ((o = e.selectedMaterial) == null ? void 0 : o.materialId) || "");
  return !n || e.view !== "session" ? !1 : jd(n, _b(e));
}
function Ey(e, n = ht()) {
  const o = di(e, n), i = Bn(e), a = e.timerMode !== "countup" && i > 0 && o >= i, c = a ? "completed" : Ut(e);
  return {
    ...Bt(c, n),
    elapsedSeconds: a ? i : o,
    timerAnchorAtMs: c === "running" ? e.timerAnchorAtMs : null,
    timerPausedAtMs: c === "running" ? null : e.timerPausedAtMs || n,
    audioPlaying: c === "running" ? e.audioPlaying : !1
  };
}
function kb(e, n = {}) {
  const o = Wn(n.selectedScene), i = wb(e == null ? void 0 : e.materialId), a = Fd(i == null ? void 0 : i.selectedScene) ? i.selectedScene : o.id, c = Wn(a), d = String((i == null ? void 0 : i.musicType) || c.musicType || "Deep Focus"), p = String((i == null ? void 0 : i.ambientSound) || c.ambientSound || "Nature"), y = yr(i == null ? void 0 : i.musicVolume, n.musicVolume ?? 60), g = yr(i == null ? void 0 : i.ambientVolume, n.ambientVolume ?? 50), S = Si(i == null ? void 0 : i.durationMinutes, n.pomodoroDuration ?? qr), l = String((i == null ? void 0 : i.studyGoal) || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`), f = Jv(i == null ? void 0 : i.studyPlan), v = f.length ? f : Uc(e, l, S), x = xb(i), T = String((i == null ? void 0 : i.workspaceNotes) || ""), k = (i == null ? void 0 : i.workspaceUpdatedAt) || (i == null ? void 0 : i.updatedAt) || "";
  return {
    selectedScene: a,
    musicType: d,
    ambientSound: p,
    musicVolume: y,
    ambientVolume: g,
    audioChannels: { ...zd, ...(i == null ? void 0 : i.audioChannels) || n.audioChannels || {} },
    pomodoroDuration: S,
    studyGoal: l,
    studyPlan: v,
    completedTasks: x,
    workspaceNotes: T,
    workspaceUpdatedAt: k
  };
}
function Tb(e) {
  const n = XA(e);
  if (!n || typeof n != "object") return null;
  const o = Ut(n), i = ht(), a = Number(n.timerAnchorAtMs), c = Date.parse(n.startedAt || ""), d = Number.isFinite(c) ? c : NaN, p = o === "running" ? di({
    ...n,
    timerState: "running",
    timerAnchorAtMs: Number.isFinite(a) && a > 0 ? a : d
  }, i) : Math.max(0, Number(n.elapsedSeconds) || 0), y = Bn(n), g = o === "running" ? y > 0 && p >= y ? "completed" : "paused" : o, S = o === "running";
  return {
    route: n.view === "session" ? "session" : "setup",
    view: n.view === "session" ? "session" : "setup",
    ...Bt(S ? "restoring" : g, i),
    timerRestoreTarget: S ? g : null,
    timerMode: n.timerMode === "countup" ? "countup" : "countdown",
    timerAnchorAtMs: null,
    timerPausedAtMs: S ? null : Number(n.timerPausedAtMs) || null,
    timerRestoredAtMs: S ? null : i,
    timerDurationSeconds: y,
    elapsedSeconds: y > 0 ? Math.min(y, p) : p,
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
    panelTab: Bc.has(n.panelTab) ? n.panelTab : "materials",
    workspaceNotes: String(n.workspaceNotes || ""),
    workspaceUpdatedAt: n.workspaceUpdatedAt || n.updatedAt || "",
    activeNoteSection: String(n.activeNoteSection || ""),
    activeSourceHighlight: c0(n.activeSourceHighlight),
    assistantContext: Kc(n.assistantContext),
    audioPlaying: !1
  };
}
function Hs() {
  return {
    completedTasks: [],
    flashcardIndex: 0,
    flashcardSide: "front",
    flashcardProgress: {},
    quizAnswers: {},
    quizChecked: {}
  };
}
function Ab(e) {
  return Object.values(e.flashcardProgress || {}).filter((n) => n && n.difficulty).length;
}
function Cb(e) {
  const n = Object.values(e.quizChecked || {}).filter((i) => i && i.hasKnownAnswer);
  if (!n.length) return null;
  const o = n.filter((i) => i.correct).length;
  return Math.round(o / n.length * 100);
}
function bb(e) {
  const n = $c(e.selectedMaterial);
  return Object.entries(e.quizChecked || {}).filter(([, o]) => o && o.hasKnownAnswer && !o.correct).map(([o]) => oC(n[Number(o)], Number(o))).filter(Boolean);
}
async function Eb(e, n, o, i = {}) {
  var d, p;
  if (!globalThis.apiClient || typeof globalThis.apiClient.fetch != "function")
    return {
      answer: r0(e, o, $.getState().studyGoal),
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
      preferred_language: ((p = globalThis.preferredLanguage) == null ? void 0 : p.value) || "auto",
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
const $ = vb((e, n) => {
  const o = Sb();
  return {
    route: "landing",
    view: "landing",
    materials: [],
    materialsStatus: "idle",
    materialsError: "",
    selectedMaterialId: "focus-room",
    selectedMaterial: null,
    selectedScene: o.id,
    musicType: o.musicType || "Deep Focus",
    ambientSound: o.ambientSound || "Nature",
    musicVolume: 60,
    ambientVolume: 50,
    audioChannels: { ...zd },
    pomodoroDuration: qr,
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
    timerDurationSeconds: qt(qr),
    studyGoal: "Deep work block",
    studyPlan: [],
    aiPanelOpen: !1,
    isIdle: !1,
    currentSession: {
      sessionId: `focus-${Date.now()}`,
      materialId: "focus-room",
      studyGoal: "Deep work block",
      selectedScene: o.id,
      musicType: o.musicType || "Deep Focus",
      ambientSound: o.ambientSound || "Nature",
      musicVolume: 60,
      ambientVolume: 50,
      pomodoroDuration: qr,
      startedAt: null
    },
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
    workspaceNotes: "",
    workspaceUpdatedAt: "",
    activeNoteSection: "",
    activeSourceHighlight: null,
    assistantContext: { sectionTitle: "", excerpt: "" },
    chatMessages: [],
    chatPending: !1,
    chatError: "",
    setIdle: (i) => e({ isIdle: i }),
    initializeFocusRoom() {
      const i = n();
      if (["landing", "setup", "session"].includes(i.view) && i.selectedMaterialId === "focus-room") return;
      const a = Wn(i.selectedScene);
      e({
        route: "landing",
        view: "landing",
        selectedMaterialId: "focus-room",
        selectedMaterial: null,
        studyGoal: i.studyGoal || "Deep work block",
        studyPlan: [],
        completedTasks: [],
        currentSession: {
          sessionId: `focus-${Date.now()}`,
          materialId: "focus-room",
          studyGoal: i.studyGoal || "Deep work block",
          selectedScene: a.id,
          musicType: i.musicType,
          ambientSound: i.ambientSound,
          musicVolume: i.musicVolume,
          ambientVolume: i.ambientVolume,
          pomodoroDuration: i.pomodoroDuration,
          startedAt: null
        }
      });
    },
    openSetup() {
      e({
        route: "setup",
        view: "setup",
        aiPanelOpen: !1,
        activeDrawer: "",
        summaryRecord: null
      });
    },
    openLanding() {
      e({
        route: "landing",
        view: "landing",
        aiPanelOpen: !1,
        activeDrawer: "",
        summaryRecord: null
      });
    },
    setMaterialsState({ items: i = [], status: a = "ready", error: c = "" } = {}) {
      e({
        materials: Array.isArray(i) ? i : [],
        materialsStatus: a === "error" ? "error" : a === "loading" ? "loading" : "ready",
        materialsError: String(c || "")
      });
    },
    hydrateFocusRoute(i, a, { preserveSession: c = !1 } = {}) {
      const d = n(), p = !!a, y = p ? a.materialId : String(i.materialId || "");
      if (!p) {
        e({
          route: "setup",
          view: "setup",
          selectedMaterialId: y,
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
      const g = d.selectedMaterialId === y, S = g && c ? null : Tb(y), l = g && c ? {} : kb(a, d), f = g && c ? {} : {
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
        timerDurationSeconds: qt(l.pomodoroDuration || qr),
        elapsedSeconds: 0,
        startedAt: null,
        currentSession: null,
        ...Hs(),
        chatMessages: [],
        chatPending: !1,
        chatError: "",
        activeNoteSection: "",
        activeSourceHighlight: null,
        assistantContext: { sectionTitle: "", excerpt: "" }
      }, v = g && c ? d.view === "session" ? "session" : "setup" : (S == null ? void 0 : S.view) === "session" ? "session" : "setup";
      if (e({
        ...l,
        ...f,
        ...S,
        route: v,
        view: v,
        selectedMaterialId: y,
        selectedMaterial: a,
        aiPanelOpen: !1,
        activeDrawer: "",
        summaryRecord: null
      }), (S == null ? void 0 : S.timerState) === "restoring") {
        const x = S.timerRestoreTarget || "paused";
        Promise.resolve().then(() => {
          const T = n();
          if (T.selectedMaterialId !== y || T.timerState !== "restoring") return;
          const k = ht(), A = Bn(T), R = A > 0 ? Math.min(A, Math.max(0, Number(T.elapsedSeconds) || 0)) : Math.max(0, Number(T.elapsedSeconds) || 0), P = {
            ...Bt(x, k),
            timerRestoreTarget: null,
            timerAnchorAtMs: null,
            timerPausedAtMs: x === "paused" ? k : null,
            timerRestoredAtMs: k,
            elapsedSeconds: R,
            audioPlaying: !1
          };
          e(P), hn({ ...T, ...P });
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
        sessionHistory: Vc()
      });
    },
    selectScene(i) {
      const a = Fd(i);
      a && e((c) => {
        const d = {
          selectedScene: a.id,
          musicType: a.musicType || c.musicType,
          ambientSound: a.ambientSound || c.ambientSound
        }, p = { ...c, ...d };
        return Xt(p), d;
      });
    },
    setPomodoroDuration(i) {
      e((a) => {
        const c = Si(i, a.pomodoroDuration), d = a.selectedMaterial ? Uc(a.selectedMaterial, a.studyGoal, c) : [], p = {
          pomodoroDuration: c,
          studyPlan: d,
          timerDurationSeconds: a.timerMode === "countup" ? 0 : qt(c)
        };
        return Xt({ ...a, ...p }), p;
      });
    },
    setSessionDuration(i, a = 0) {
      e((c) => {
        const d = Math.max(0, Number.parseInt(i, 10) || 0), p = Math.min(59, Math.max(0, Number.parseInt(a, 10) || 0)), y = d * 60 + p, g = qt(qv), S = qt(xa), l = c.timerMode === "countup" ? 0 : Math.min(S, Math.max(g, y || qt(c.pomodoroDuration))), f = c.timerMode === "countup" ? Si(i, c.pomodoroDuration) : Math.floor(l / 60), v = ht(), x = Ut(c), T = di(c, v), k = c.timerMode === "countup" ? T : Math.min(T, l), A = x === "completed" ? "paused" : x, R = {
          pomodoroDuration: f,
          timerDurationSeconds: l,
          elapsedSeconds: k,
          ...Bt(A, v),
          timerAnchorAtMs: A === "running" ? v - k * 1e3 : null,
          timerPausedAtMs: A === "paused" ? v : null
        };
        return Xt({ ...c, ...R }), hn({ ...c, ...R }), R;
      });
    },
    setStudyGoal(i) {
      e((a) => {
        const c = String(i ?? ""), d = a.selectedMaterial ? Uc(a.selectedMaterial, c, a.pomodoroDuration) : [], p = { studyGoal: c, studyPlan: d };
        return Xt({ ...a, ...p }), p;
      });
    },
    setSound(i, a) {
      e((c) => {
        var p;
        let d = {};
        if (i === "musicVolume" && (d = { musicVolume: yr(a, c.musicVolume) }), i === "ambientVolume" && (d = { ambientVolume: yr(a, c.ambientVolume) }), i === "musicType" && (d = { musicType: String(a || c.musicType) }), i === "ambientSound" && (d = { ambientSound: String(a || c.ambientSound) }), String(i).startsWith("audioChannel:")) {
          const y = String(i).slice(13);
          d = { audioChannels: { ...c.audioChannels, [y]: yr(a, ((p = c.audioChannels) == null ? void 0 : p[y]) ?? 0) } };
        }
        return Xt({ ...c, ...d }), d;
      });
    },
    applyAudioPreset(i) {
      e((a) => {
        const c = UA(i), d = {
          musicType: c.musicType,
          ambientSound: c.ambientSound
        };
        return Xt({ ...a, ...d }), d;
      });
    },
    toggleAudio() {
      e((i) => ({ audioPlaying: !i.audioPlaying }));
    },
    setAudioPlaying(i) {
      e({ audioPlaying: !!i });
    },
    openDrawer(i) {
      e({
        activeDrawer: i
      });
    },
    closeDrawer() {
      e({
        activeDrawer: ""
      });
    },
    toggleAIPanel(i = null) {
      e((a) => ({ aiPanelOpen: typeof i == "boolean" ? i : !a.aiPanelOpen }));
    },
    openStudyPanel(i = "materials") {
      const a = Bc.has(String(i || "")) ? String(i) : "materials";
      e({
        panelTab: a,
        aiPanelOpen: !0,
        activeDrawer: ""
      });
    },
    selectSourceHighlight(i = null, { openPanel: a = !0 } = {}) {
      const c = c0(i);
      e({
        activeSourceHighlight: c,
        activeNoteSection: (c == null ? void 0 : c.sectionTitle) || n().activeNoteSection || "",
        assistantContext: c ? Kc({
          sectionTitle: c.sectionTitle,
          excerpt: c.excerpt
        }) : n().assistantContext,
        ...a ? { panelTab: "sources", aiPanelOpen: !0, activeDrawer: "" } : {}
      });
    },
    setActiveNoteSection(i = "") {
      e({
        activeNoteSection: String(i || "").trim()
      });
    },
    setPanelTab(i) {
      const a = String(i || "materials");
      e({
        panelTab: Bc.has(a) ? a : "materials",
        aiPanelOpen: !0,
        activeDrawer: ""
      });
    },
    startSession() {
      const i = n();
      Xt(i), e({
        route: "session",
        view: "session",
        timerStatus: "idle",
        timerState: "idle",
        timerPhase: "idle",
        status: "idle",
        timerRestoreTarget: null,
        timerMode: "countdown",
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerUpdatedAtMs: ht(),
        timerRestoredAtMs: null,
        timerDurationSeconds: qt(i.pomodoroDuration),
        elapsedSeconds: 0,
        startedAt: null,
        summaryRecord: null,
        aiPanelOpen: !1,
        activeDrawer: "",
        currentSession: {
          sessionId: `focus-${Date.now()}`,
          materialId: "focus-room",
          studyGoal: i.studyGoal,
          selectedScene: i.selectedScene,
          musicType: i.musicType,
          ambientSound: i.ambientSound,
          musicVolume: i.musicVolume,
          ambientVolume: i.ambientVolume,
          pomodoroDuration: i.pomodoroDuration,
          startedAt: null
        },
        ...Hs(),
        chatMessages: [],
        chatPending: !1,
        chatError: ""
      });
    },
    startTimer() {
      const i = n(), a = ht(), c = Ut(i);
      if (c === "running") {
        n().tickTimer();
        return;
      }
      const d = Bn(i), p = c === "completed" || c === "break" || d > 0 && i.elapsedSeconds >= d, y = p ? 0 : Math.max(0, Number(i.elapsedSeconds) || 0), g = {
        view: "session",
        route: "session",
        ...Bt("running", a),
        audioPlaying: !0,
        summaryRecord: null,
        elapsedSeconds: y,
        startedAt: !i.startedAt || p ? new Date(a).toISOString() : i.startedAt,
        timerAnchorAtMs: a - y * 1e3,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        timerDurationSeconds: d,
        ...p ? Hs() : {}
      };
      e(g), hn({ ...i, ...g });
    },
    pauseTimer({ pauseAudio: i = !0 } = {}) {
      const a = n(), c = ht();
      if (Ut(a) !== "running") {
        i && a.audioPlaying && e({ audioPlaying: !1 });
        return;
      }
      const d = Ey(a, c), p = {
        ...d,
        ...Bt(d.timerState === "completed" ? "completed" : "paused", c),
        timerAnchorAtMs: null,
        timerPausedAtMs: c,
        audioPlaying: i ? !1 : a.audioPlaying
      };
      e(p), hn({ ...a, ...p });
    },
    resetTimer() {
      const i = ht(), a = {
        ...Bt("idle", i),
        timerRestoreTarget: null,
        timerMode: "countdown",
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerDurationSeconds: qt(n().pomodoroDuration),
        audioPlaying: !1,
        startedAt: null,
        elapsedSeconds: 0,
        summaryRecord: null,
        ...Hs()
      };
      e(a), hn({ ...n(), ...a });
    },
    skipTimer() {
      const i = n(), a = ht(), c = Bn(i), d = {
        ...Bt("completed", a),
        elapsedSeconds: c || Math.max(0, Number(i.elapsedSeconds) || 0),
        audioPlaying: !1,
        startedAt: i.startedAt || new Date(a).toISOString(),
        timerAnchorAtMs: null,
        timerPausedAtMs: a,
        timerDurationSeconds: c
      };
      e(d), hn({ ...i, ...d });
    },
    tickTimer() {
      const i = n();
      if (i.view !== "session" || Ut(i) !== "running") return;
      const a = ht(), c = Bn(i), d = c ? Math.min(c, di(i, a)) : di(i, a), p = c > 0 && d >= c ? "completed" : "running", y = {
        ...Bt(p, a),
        elapsedSeconds: d,
        timerAnchorAtMs: p === "running" ? i.timerAnchorAtMs : null,
        timerPausedAtMs: p === "running" ? null : a,
        timerDurationSeconds: c,
        audioPlaying: p === "running" ? i.audioPlaying : !1
      };
      d === i.elapsedSeconds && p === Ut(i) || (e(y), hn({ ...i, ...y }));
    },
    setTimerMode(i = "countdown") {
      const a = i === "countup" ? "countup" : "countdown", c = {
        timerMode: a,
        timerDurationSeconds: a === "countup" ? 0 : qt(n().pomodoroDuration)
      };
      e(c), hn({ ...n(), ...c });
    },
    startBreak() {
      const i = ht(), a = {
        ...Bt("break", i),
        timerRestoreTarget: null,
        timerAnchorAtMs: null,
        timerPausedAtMs: i,
        timerDurationSeconds: 0,
        audioPlaying: !1
      };
      e(a), hn({ ...n(), ...a });
    },
    getTimerState() {
      return Ut(n());
    },
    endSession() {
      var S;
      const i = n(), a = ht(), c = new Date(a).toISOString(), d = Ut(i) === "running" ? Ey(i, a) : i, p = Bn(d), y = p ? Math.min(p, d.elapsedSeconds) : d.elapsedSeconds, g = ZA({
        sessionId: (S = i.currentSession) == null ? void 0 : S.sessionId,
        materialId: "focus-room",
        materialTitle: "Focus Room",
        studyGoal: i.studyGoal,
        selectedScene: i.selectedScene,
        musicType: i.musicType,
        ambientSound: i.ambientSound,
        musicVolume: i.musicVolume,
        ambientVolume: i.ambientVolume,
        pomodoroDuration: i.pomodoroDuration,
        startedAt: i.startedAt || c,
        endedAt: c,
        totalFocusTime: y,
        flashcardsCompleted: 0,
        quizScore: null,
        mistakesMade: [],
        completedTasks: [],
        recommendedNextStep: "Start another protected focus block when you are ready."
      });
      Zv("focus-room"), e({
        summaryRecord: g,
        sessionHistory: Vc(),
        ...Bt("completed", a),
        audioPlaying: !1,
        timerAnchorAtMs: null,
        timerPausedAtMs: a,
        timerDurationSeconds: p,
        elapsedSeconds: p ? Math.min(p, d.elapsedSeconds) : d.elapsedSeconds,
        currentSession: null
      });
    },
    closeSummary() {
      e({ summaryRecord: null });
    },
    setWorkspaceNotes(i) {
      e((a) => {
        const c = {
          workspaceNotes: String(i ?? ""),
          workspaceUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        return Xt({ ...a, ...c }), c;
      });
    },
    setAssistantContext(i = {}) {
      e({ assistantContext: Kc(i) });
    },
    toggleTask(i) {
      e((a) => {
        const c = a.studyPlan[Number(i)];
        if (!c) return {};
        const d = String(c.task || ""), p = a.completedTasks.includes(d) ? a.completedTasks.filter((y) => y !== d) : [...a.completedTasks, d];
        return Xt({ ...a, completedTasks: p }), { completedTasks: p };
      });
    },
    updatePlanTask(i, a = null, c = null) {
      e((d) => {
        const p = Number(i), y = d.studyPlan[p];
        if (!y) return {};
        const g = String(y.task || ""), S = c == null ? g : String(c || "").trim(), l = a == null ? y.minutes : eo(a, y.minutes, 1, xa), f = d.studyPlan.map((T, k) => k === p ? { minutes: l, task: S || g } : T);
        let v = d.completedTasks;
        g && g !== f[p].task && v.includes(g) && (v = v.filter((T) => T !== g).concat(f[p].task));
        const x = { studyPlan: f, completedTasks: v };
        return Xt({ ...d, ...x }), x;
      });
    },
    setFlashcardIndex(i) {
      const a = Ty(n().selectedMaterial);
      e({
        flashcardIndex: eo(i, n().flashcardIndex, 0, Math.max(0, a.length - 1)),
        flashcardSide: "front"
      });
    },
    flipFlashcard() {
      e((i) => ({
        flashcardSide: i.flashcardSide === "back" ? "front" : "back"
      }));
    },
    rateFlashcard(i) {
      const a = n(), c = Ty(a.selectedMaterial);
      if (!c.length) return;
      const d = eo(a.flashcardIndex, 0, 0, c.length - 1), p = c[d], y = ["easy", "medium", "hard"].includes(String(i)) ? String(i) : "medium";
      e({
        flashcardProgress: {
          ...a.flashcardProgress,
          [nC(p, d)]: {
            difficulty: y,
            reviewedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        },
        flashcardSide: "front",
        flashcardIndex: d < c.length - 1 ? d + 1 : d
      });
    },
    answerQuizQuestion(i, a) {
      const c = Number(i), d = $c(n().selectedMaterial)[c];
      if (!d) return;
      const p = String(c);
      e((y) => ({
        quizAnswers: {
          ...y.quizAnswers,
          [p]: aC(d, a, y.quizAnswers[p])
        }
      }));
    },
    checkQuizQuestion(i) {
      const a = $c(n().selectedMaterial), c = Number(i), d = a[c];
      if (!d) return;
      const p = String(c), y = n(), g = Object.prototype.hasOwnProperty.call(y.quizAnswers, p) ? y.quizAnswers[p] : "", S = lC(d, g), l = n0(d);
      e({
        quizChecked: {
          ...y.quizChecked,
          [p]: {
            answer: g,
            correct: S === null ? !1 : S,
            hasKnownAnswer: S !== null,
            explanation: d.explanation || d.rationale || (l ? `Correct answer: ${l}` : ""),
            checkedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        }
      });
    },
    async askAssistant(i) {
      const a = String(i || "").trim();
      if (!a) return;
      const c = n(), d = c.selectedMaterial, p = ii(c.chatMessages).slice(-10).map((y) => ({
        role: y.role === "user" ? "user" : "assistant",
        content: y.text
      }));
      e({
        chatMessages: ii([
          ...c.chatMessages,
          { role: "user", text: a, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
        ]),
        chatPending: !0,
        chatError: ""
      });
      try {
        const y = await Eb(a, p, d, c.assistantContext);
        e((g) => ({
          chatMessages: ii([
            ...g.chatMessages,
            { role: "assistant", text: y.answer, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: y.offline ? "Using a local Focus Room reply because the AI tutor service is not connected." : ""
        }));
      } catch (y) {
        e((g) => ({
          chatMessages: ii([
            ...g.chatMessages,
            { role: "assistant", text: r0(a, d, n().studyGoal), createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: `AI tutor unavailable: ${y.message || "request failed"}`
        }));
      } finally {
        e({ chatPending: !1 });
      }
    },
    focusFlashcardsCompletedCount() {
      return Ab(n());
    },
    focusQuizScore() {
      return Cb(n());
    },
    focusQuizMistakes() {
      return bb(n());
    },
    formatFocusedTime() {
      return Id(n().elapsedSeconds);
    }
  };
});
function Pb({ scene: e, active: n, onSelect: o, variant: i = "default" }) {
  return i === "gallery" ? /* @__PURE__ */ w.jsxs(
    rn.button,
    {
      className: `scene-card scene-card-gallery ${n ? "active" : ""}`.trim(),
      type: "button",
      "aria-pressed": n,
      "aria-label": `${e.name}: ${e.description}`,
      onClick: () => o(e.id),
      whileHover: { y: -2 },
      whileTap: { scale: 0.985 },
      children: [
        /* @__PURE__ */ w.jsx("span", { className: "scene-card-gallery-media", style: { backgroundImage: `url("${e.image}")` }, children: /* @__PURE__ */ w.jsx("span", { children: e.kicker }) }),
        /* @__PURE__ */ w.jsxs("span", { className: "scene-card-gallery-copy", children: [
          /* @__PURE__ */ w.jsx("strong", { children: e.name }),
          /* @__PURE__ */ w.jsx("small", { children: e.kicker })
        ] })
      ]
    }
  ) : /* @__PURE__ */ w.jsxs(
    rn.button,
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
function Bd({ variant: e = "default" }) {
  const n = $((a) => a.selectedScene), o = $((a) => a.selectScene), i = e === "gallery" ? $A : gn.filter((a) => !a.galleryOnly);
  return /* @__PURE__ */ w.jsx("div", { className: `scene-selector scene-selector-${e}`.trim(), "aria-label": "Study scenes", children: i.map((a) => /* @__PURE__ */ w.jsx(Pb, { scene: a, active: a.id === n, onSelect: o, variant: e }, a.id)) });
}
const Mb = {
  "soft-piano": YC,
  "lofi-cafe": i0,
  "nature-flow": l0,
  "warm-ambience": EC,
  "deep-focus": s0
};
function Rb() {
  const e = $((k) => k.pomodoroDuration), n = $((k) => k.timerMode), o = $((k) => k.studyGoal), i = $((k) => k.musicType), a = $((k) => k.ambientSound), c = $((k) => k.setPomodoroDuration), d = $((k) => k.setTimerMode), p = $((k) => k.setStudyGoal), y = $((k) => k.applyAudioPreset), g = $((k) => k.openLanding), S = $((k) => k.startSession), [l, f] = C.useState(!1), v = Hv({ musicType: i, ambientSound: a }), x = (k) => {
    y(k.id);
  }, T = (k) => {
    d("countdown"), c(k);
  };
  return /* @__PURE__ */ w.jsxs("section", { className: "focus-setup-stage innook-scene-setup", "aria-label": "Focus Room setup", children: [
    /* @__PURE__ */ w.jsxs("header", { className: "innook-setup-header", children: [
      /* @__PURE__ */ w.jsxs("div", { className: "innook-setup-brand", "aria-label": "Synapse Focus Room", children: [
        /* @__PURE__ */ w.jsx("span", { className: "innook-brand-mark", children: "S" }),
        /* @__PURE__ */ w.jsxs("span", { children: [
          /* @__PURE__ */ w.jsx("strong", { children: "synapse" }),
          /* @__PURE__ */ w.jsx("small", { children: "Focus Room" })
        ] })
      ] }),
      /* @__PURE__ */ w.jsxs("div", { className: "innook-setup-header-actions", children: [
        /* @__PURE__ */ w.jsx("button", { type: "button", className: "innook-header-action", "aria-label": "Focus Room history", title: "Focus Room history", children: /* @__PURE__ */ w.jsx(Gc, { size: 18, "aria-hidden": "true" }) }),
        /* @__PURE__ */ w.jsx("button", { type: "button", className: "innook-header-action", onClick: g, "aria-label": "Back to Focus Room welcome", title: "Back to Focus Room welcome", children: /* @__PURE__ */ w.jsx(SC, { size: 20, "aria-hidden": "true" }) })
      ] })
    ] }),
    /* @__PURE__ */ w.jsxs("div", { className: "innook-setup-layout", children: [
      /* @__PURE__ */ w.jsxs("section", { className: "innook-scene-panel", "aria-labelledby": "innook-scene-title", children: [
        /* @__PURE__ */ w.jsxs("div", { className: "innook-panel-heading", children: [
          /* @__PURE__ */ w.jsx("span", { children: "Step 01" }),
          /* @__PURE__ */ w.jsx("h1", { id: "innook-scene-title", children: "选择学习场景" })
        ] }),
        /* @__PURE__ */ w.jsx(Bd, { variant: "gallery" })
      ] }),
      /* @__PURE__ */ w.jsxs("aside", { className: "innook-control-rail", "aria-label": "Study settings", children: [
        /* @__PURE__ */ w.jsxs("div", { className: "innook-rail-group", "aria-label": "Music atmosphere", children: [
          Jr.map((k) => {
            const A = Mb[k.id] || s0, R = (v == null ? void 0 : v.id) === k.id;
            return /* @__PURE__ */ w.jsx("button", { type: "button", className: `innook-rail-icon innook-audio-preset ${R ? "is-active" : ""}`.trim(), onClick: () => x(k), "aria-label": `Use ${k.label}: ${k.description}`, "aria-pressed": R, title: `${k.label} — ${k.description}`, children: /* @__PURE__ */ w.jsx(A, { size: 16, "aria-hidden": "true" }) }, k.id);
          }),
          /* @__PURE__ */ w.jsx("span", { className: "innook-audio-preset-status", "aria-live": "polite", children: (v == null ? void 0 : v.label) || "Custom mix" })
        ] }),
        /* @__PURE__ */ w.jsx("div", { className: "innook-rail-divider" }),
        /* @__PURE__ */ w.jsxs("div", { className: "innook-duration-list", "aria-label": "Focus duration", children: [
          Wv.map((k) => /* @__PURE__ */ w.jsx("button", { type: "button", className: `innook-duration ${n !== "countup" && k === e ? "is-active" : ""}`.trim(), onClick: () => T(k), "aria-pressed": n !== "countup" && k === e, children: k }, k)),
          /* @__PURE__ */ w.jsx("button", { type: "button", className: `innook-duration innook-duration-infinity ${n === "countup" ? "is-active" : ""}`.trim(), onClick: () => d("countup"), "aria-label": "Count up timer", "aria-pressed": n === "countup", children: "∞" })
        ] }),
        /* @__PURE__ */ w.jsx("div", { className: "innook-rail-divider" }),
        /* @__PURE__ */ w.jsx("button", { type: "button", className: `innook-rail-icon ${l ? "is-active" : ""}`.trim(), onClick: () => f((k) => !k), "aria-label": "Edit focus intention", title: "Edit focus intention", children: /* @__PURE__ */ w.jsx(ab, { size: 16, "aria-hidden": "true" }) }),
        /* @__PURE__ */ w.jsx("button", { type: "button", className: "innook-enter-button", onClick: S, "aria-label": "Enter Focus Room", title: "Enter Focus Room", children: /* @__PURE__ */ w.jsx(Wc, { size: 22, "aria-hidden": "true" }) }),
        l ? /* @__PURE__ */ w.jsxs("label", { className: "innook-goal-popover", children: [
          "今日目标",
          /* @__PURE__ */ w.jsx("textarea", { value: o, onChange: (k) => p(k.target.value), autoFocus: !0 })
        ] }) : null
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
  const { onPointerMove: c, onPointerLeave: d, ...p } = a;
  return /* @__PURE__ */ w.jsx(
    "button",
    {
      className: `glass-button glass-button-${o} ${n}`.trim(),
      type: i,
      onPointerMove: (y) => {
        const g = y.currentTarget.getBoundingClientRect();
        y.currentTarget.style.setProperty("--glass-x", `${Math.max(0, Math.min(100, (y.clientX - g.left) / g.width * 100))}%`), y.currentTarget.style.setProperty("--glass-y", `${Math.max(0, Math.min(100, (y.clientY - g.top) / g.height * 100))}%`), c == null || c(y);
      },
      onPointerLeave: (y) => {
        y.currentTarget.style.setProperty("--glass-x", "50%"), y.currentTarget.style.setProperty("--glass-y", "0%"), d == null || d(y);
      },
      ...p,
      children: e
    }
  );
}
function Nb(e) {
  return e === "paused" ? "Resume" : e === "completed" ? "Restart" : "Start";
}
function Db() {
  const e = $((D) => D.elapsedSeconds), n = $((D) => D.pomodoroDuration), o = $((D) => D.timerDurationSeconds), i = $((D) => D.timerStatus), a = $((D) => D.isIdle), c = $((D) => D.studyGoal), d = $((D) => D.selectedScene), p = $((D) => D.musicType), y = $((D) => D.ambientSound), g = $((D) => D.startTimer), S = $((D) => D.pauseTimer), l = $((D) => D.resetTimer), f = $((D) => D.skipTimer), v = i === "studying", x = Number(o) || n * 60, T = Math.max(0, x - e), k = x ? Math.min(100, Math.max(0, e / x * 100)) : 0, A = a ? 0.96 : 1, R = i === "studying" ? { scale: [A, A + 0.012, A] } : { scale: A }, P = Wn(d);
  return /* @__PURE__ */ w.jsxs(
    rn.article,
    {
      className: "timer-card liquid-glass",
      animate: R,
      transition: i === "studying" ? { duration: 4, repeat: 1 / 0, ease: "easeInOut" } : { duration: 0.2 },
      children: [
        /* @__PURE__ */ w.jsxs("span", { className: "focus-kicker", children: [
          "Focus Block / ",
          i
        ] }),
        /* @__PURE__ */ w.jsxs("div", { className: "timer-card-head", children: [
          /* @__PURE__ */ w.jsxs("div", { children: [
            /* @__PURE__ */ w.jsx("h2", { children: c || "Deep work block" }),
            /* @__PURE__ */ w.jsx("p", { children: P.name })
          ] }),
          /* @__PURE__ */ w.jsxs("div", { className: "timer-pill-row", children: [
            /* @__PURE__ */ w.jsxs("span", { className: "focus-pill", children: [
              p,
              " / ",
              y
            ] }),
            /* @__PURE__ */ w.jsx("span", { className: "focus-pill", children: "Quiet room" })
          ] })
        ] }),
        /* @__PURE__ */ w.jsx("div", { className: "timer-value", "aria-live": "polite", children: ci(T) }),
        /* @__PURE__ */ w.jsxs("div", { className: "timer-meta-grid", children: [
          /* @__PURE__ */ w.jsxs("div", { className: "timer-meta-card", children: [
            /* @__PURE__ */ w.jsx("span", { children: "Focused" }),
            /* @__PURE__ */ w.jsx("strong", { children: Id(e) })
          ] }),
          /* @__PURE__ */ w.jsxs("div", { className: "timer-meta-card", children: [
            /* @__PURE__ */ w.jsx("span", { children: "Block" }),
            /* @__PURE__ */ w.jsxs("strong", { children: [
              n,
              "m"
            ] })
          ] }),
          /* @__PURE__ */ w.jsxs("div", { className: "timer-meta-card", children: [
            /* @__PURE__ */ w.jsx("span", { children: "Scene" }),
            /* @__PURE__ */ w.jsx("strong", { children: P.name })
          ] })
        ] }),
        /* @__PURE__ */ w.jsx("div", { className: "focus-progress-track", "aria-label": "Focus progress", children: /* @__PURE__ */ w.jsx("div", { className: "focus-progress-fill", style: { width: `${k.toFixed(1)}%` } }) }),
        /* @__PURE__ */ w.jsxs("div", { className: "timer-actions", children: [
          /* @__PURE__ */ w.jsxs(Pe, { variant: i === "studying" ? "primary" : "ghost", onClick: g, children: [
            /* @__PURE__ */ w.jsx(Ld, { size: 16, "aria-hidden": "true" }),
            " ",
            Nb(i)
          ] }),
          /* @__PURE__ */ w.jsxs(Pe, { onClick: () => S(), disabled: !v, "aria-label": v ? "Pause timer" : "Pause timer unavailable", children: [
            /* @__PURE__ */ w.jsx(Aa, { size: 16, "aria-hidden": "true" }),
            " Pause"
          ] }),
          /* @__PURE__ */ w.jsxs(Pe, { onClick: l, children: [
            /* @__PURE__ */ w.jsx(a0, { size: 16, "aria-hidden": "true" }),
            " Reset"
          ] }),
          /* @__PURE__ */ w.jsxs(Pe, { onClick: f, children: [
            /* @__PURE__ */ w.jsx(Vd, { size: 16, "aria-hidden": "true" }),
            " Skip"
          ] })
        ] })
      ]
    }
  );
}
function jb() {
  return /* @__PURE__ */ w.jsx(Db, {});
}
function Ib({ onWorkspace: e, onOpenTrail: n, onOpenCompanion: o, onOpenSettings: i, onExit: a }) {
  const c = $((p) => p.selectedScene), d = Wn(c);
  return /* @__PURE__ */ w.jsxs("header", { className: "focus-room-header", children: [
    /* @__PURE__ */ w.jsxs("button", { type: "button", className: "focus-wordmark", onClick: e, "aria-label": "Return to Synapse workspace", children: [
      /* @__PURE__ */ w.jsx("span", { className: "focus-wordmark-mark", children: "S" }),
      /* @__PURE__ */ w.jsx("span", { children: "synapse" })
    ] }),
    /* @__PURE__ */ w.jsxs("div", { className: "focus-room-context", "aria-label": "Current focus context", children: [
      /* @__PURE__ */ w.jsx("span", { children: d.name }),
      /* @__PURE__ */ w.jsx("small", { children: "Quiet study room" })
    ] }),
    /* @__PURE__ */ w.jsxs("nav", { className: "focus-room-header-actions", "aria-label": "Focus Room controls", children: [
      /* @__PURE__ */ w.jsxs(Pe, { className: "header-icon-button", onClick: n, title: "Open Focus Trail", "aria-label": "Open Focus Trail", children: [
        /* @__PURE__ */ w.jsx(Ta, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Focus Trail" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { className: "header-icon-button", onClick: o, title: "Open Companion Room", "aria-label": "Open Companion Room", children: [
        /* @__PURE__ */ w.jsx(Ca, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Companion" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { className: "header-icon-button", onClick: i, title: "Open room settings", "aria-label": "Open room settings", children: [
        /* @__PURE__ */ w.jsx(wi, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Settings" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { className: "header-icon-button header-exit-button", onClick: a, title: "Exit Focus Room", "aria-label": "Exit Focus Room", children: [
        /* @__PURE__ */ w.jsx(NC, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Exit" })
      ] })
    ] })
  ] });
}
function Fb({ onFocusMode: e, audioState: n }) {
  const o = $((b) => b.timerStatus), i = $((b) => b.elapsedSeconds), a = $((b) => b.pomodoroDuration), c = $((b) => b.timerDurationSeconds), d = $((b) => b.timerMode), p = $((b) => b.studyGoal), y = $((b) => b.currentSession), g = $((b) => b.startTimer), S = $((b) => b.pauseTimer), l = $((b) => b.resetTimer), f = $((b) => b.skipTimer), v = $((b) => b.setSessionDuration), x = $((b) => b.toggleAudio), T = $((b) => b.audioPlaying), k = $((b) => b.setStudyGoal), [A, R] = C.useState(!1), [P, D] = C.useState("25:00"), [L, X] = C.useState(!1), [Z, U] = C.useState(""), G = d === "countup" ? 0 : Number(c) || (Number(a) || 0) * 60, Q = d === "countup" ? i : Math.max(0, G - i), J = o === "paused", ce = o === "studying", ye = o === "completed", he = ye && d !== "countup" ? "00:00" : ci(Q), we = J ? "Paused" : ye ? "Complete" : "In focus", ue = J ? "Resume timer" : ce ? "Pause timer" : "Start timer", ge = () => {
    D(he), R(!0);
  }, V = () => {
    const [b = "", O = "0"] = String(P).split(":");
    v(b, O), R(!1);
  }, q = () => {
    U(p || ""), X(!0);
  }, K = () => {
    const b = Z.trim();
    b && k(b), X(!1);
  };
  return /* @__PURE__ */ w.jsxs("div", { className: "focus-session-dock liquid-glass", "aria-label": "Focus session controls", children: [
    /* @__PURE__ */ w.jsxs("div", { className: "dock-timer-block", children: [
      /* @__PURE__ */ w.jsxs("div", { className: "dock-eyebrow", children: [
        "POMODORO #",
        (y == null ? void 0 : y.pomodoroNumber) || 1
      ] }),
      /* @__PURE__ */ w.jsxs("div", { className: "dock-status", children: [
        /* @__PURE__ */ w.jsx("span", { className: `dock-status-dot ${J ? "is-paused" : ""}` }),
        we
      ] }),
      A ? /* @__PURE__ */ w.jsx(
        "input",
        {
          autoFocus: !0,
          className: "dock-time-input",
          type: "text",
          inputMode: "text",
          maxLength: 6,
          value: P,
          "aria-label": "Focus duration in minutes and seconds",
          onChange: (b) => D(b.target.value.replace(/[^0-9:]/g, "")),
          onFocus: (b) => b.currentTarget.select(),
          onKeyDown: (b) => {
            b.key === "Enter" && (b.preventDefault(), V()), b.key === "Escape" && (b.preventDefault(), b.currentTarget.dataset.cancel = "true", R(!1));
          },
          onBlur: (b) => {
            b.currentTarget.dataset.cancel !== "true" && V();
          }
        }
      ) : /* @__PURE__ */ w.jsx("button", { type: "button", className: "dock-time-edit", onClick: ge, "aria-label": `Change focus duration, currently ${a} minutes`, title: "Click to change focus duration", children: /* @__PURE__ */ w.jsx("strong", { className: "dock-time", "aria-live": "off", children: he }) }),
      /* @__PURE__ */ w.jsx("div", { className: "dock-progress", "aria-hidden": "true", children: /* @__PURE__ */ w.jsx("span", { style: { width: `${G ? Math.min(100, Math.max(0, i / G * 100)) : 0}%` } }) })
    ] }),
    /* @__PURE__ */ w.jsxs("div", { className: "dock-goal-block", children: [
      /* @__PURE__ */ w.jsx("span", { className: "dock-eyebrow", children: "TODAY'S GOAL" }),
      L ? /* @__PURE__ */ w.jsx(
        "input",
        {
          autoFocus: !0,
          className: "dock-goal-input",
          type: "text",
          value: Z,
          maxLength: 140,
          "aria-label": "Edit today's goal",
          onChange: (b) => U(b.target.value),
          onFocus: (b) => b.currentTarget.select(),
          onKeyDown: (b) => {
            b.key === "Enter" && (b.preventDefault(), K()), b.key === "Escape" && (b.preventDefault(), b.currentTarget.dataset.cancel = "true", X(!1));
          },
          onBlur: (b) => {
            b.currentTarget.dataset.cancel !== "true" && K();
          }
        }
      ) : /* @__PURE__ */ w.jsx(
        "button",
        {
          type: "button",
          className: "dock-goal-edit",
          onClick: q,
          "aria-label": `Edit today's goal, currently ${p || "a quiet block for meaningful progress"}`,
          title: "Click to edit today's goal",
          children: /* @__PURE__ */ w.jsx("strong", { children: p || "A quiet block for meaningful progress" })
        }
      ),
      /* @__PURE__ */ w.jsxs("span", { className: "dock-goal-meta", children: [
        d === "countup" ? "Count-up" : `${ci(G)} session`,
        " · ",
        ci(i),
        " focused"
      ] })
    ] }),
    /* @__PURE__ */ w.jsxs("div", { className: "dock-action-block", children: [
      /* @__PURE__ */ w.jsxs(Pe, { className: "dock-action-button", onClick: x, "aria-label": T ? "Pause room audio" : "Play room audio", children: [
        T ? /* @__PURE__ */ w.jsx(Aa, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(Fa, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: n != null && n.playing ? "Pause audio" : "Audio" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { className: "dock-action-button", onClick: () => ce ? S() : g(), variant: "primary", "aria-label": ue, children: [
        ce ? /* @__PURE__ */ w.jsx(Aa, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(Ld, { size: 15, fill: "currentColor", "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: J ? "Resume" : ce ? "Pause" : "Start" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { className: "dock-action-button", onClick: f, "aria-label": "Skip timer", children: [
        /* @__PURE__ */ w.jsx(Vd, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Skip" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { className: "dock-action-button", onClick: l, "aria-label": "Reset timer", children: [
        /* @__PURE__ */ w.jsx(a0, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Reset" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { className: "dock-focus-mode", onClick: e, "aria-label": "Enter distraction-free Focus Mode", children: [
        /* @__PURE__ */ w.jsx(rb, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Focus Mode" })
      ] })
    ] })
  ] });
}
function mt(e, n, { checkForDefaultPrevented: o = !0 } = {}) {
  return function(a) {
    if (e == null || e(a), o === !1 || !a || !a.defaultPrevented)
      return n == null ? void 0 : n(a);
  };
}
function Py(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function Ob(...e) {
  return (n) => {
    let o = !1;
    const i = e.map((a) => {
      const c = Py(a, n);
      return !o && typeof c == "function" && (o = !0), c;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const c = i[a];
          typeof c == "function" ? c() : Py(e[a], null);
        }
      };
  };
}
function at(...e) {
  return C.useCallback(Ob(...e), e);
}
function Ud(e, n = []) {
  let o = [];
  function i(c, d) {
    const p = C.createContext(d);
    p.displayName = c + "Context";
    const y = o.length;
    o = [...o, d];
    const g = (l) => {
      var A;
      const { scope: f, children: v, ...x } = l, T = ((A = f == null ? void 0 : f[e]) == null ? void 0 : A[y]) || p, k = C.useMemo(() => x, Object.values(x));
      return /* @__PURE__ */ w.jsx(T.Provider, { value: k, children: v });
    };
    g.displayName = c + "Provider";
    function S(l, f, v = {}) {
      var A;
      const { optional: x = !1 } = v, T = ((A = f == null ? void 0 : f[e]) == null ? void 0 : A[y]) || p, k = C.useContext(T);
      if (k) return k;
      if (d !== void 0) return d;
      if (!x)
        throw new Error(`\`${l}\` must be used within \`${c}\``);
    }
    return [g, S];
  }
  const a = () => {
    const c = o.map((d) => C.createContext(d));
    return function(p) {
      const y = (p == null ? void 0 : p[e]) || c;
      return C.useMemo(
        () => ({ [`__scope${e}`]: { ...p, [e]: y } }),
        [p, y]
      );
    };
  };
  return a.scopeName = e, [i, Lb(a, ...n)];
}
function Lb(...e) {
  const n = e[0];
  if (e.length === 1) return n;
  const o = () => {
    const i = e.map((a) => ({
      useScope: a(),
      scopeName: a.scopeName
    }));
    return function(c) {
      const d = i.reduce((p, { useScope: y, scopeName: g }) => {
        const l = y(c)[`__scope${g}`];
        return { ...p, ...l };
      }, {});
      return C.useMemo(() => ({ [`__scope${n.scopeName}`]: d }), [d]);
    };
  };
  return o.scopeName = n.scopeName, o;
}
var io = globalThis != null && globalThis.document ? C.useLayoutEffect : () => {
}, Vb = td[" useId ".trim().toString()] || (() => {
}), zb = 0;
function nc(e) {
  const [n, o] = C.useState(Vb());
  return io(() => {
    o((i) => i ?? String(zb++));
  }, [e]), e || (n ? `radix-${n}` : "");
}
var Bb = td[" useInsertionEffect ".trim().toString()] || io;
function d0({
  prop: e,
  defaultProp: n,
  onChange: o = () => {
  },
  caller: i
}) {
  const [a, c, d] = Ub({
    defaultProp: n,
    onChange: o
  }), p = e !== void 0, y = p ? e : a;
  {
    const S = C.useRef(e !== void 0);
    C.useEffect(() => {
      const l = S.current;
      l !== p && console.warn(
        `${i} is changing from ${l ? "controlled" : "uncontrolled"} to ${p ? "controlled" : "uncontrolled"}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
      ), S.current = p;
    }, [p, i]);
  }
  const g = C.useCallback(
    (S) => {
      var l;
      if (p) {
        const f = $b(S) ? S(e) : S;
        f !== e && ((l = d.current) == null || l.call(d, f));
      } else
        c(S);
    },
    [p, e, c, d]
  );
  return [y, g];
}
function Ub({
  defaultProp: e,
  onChange: n
}) {
  const [o, i] = C.useState(e), a = C.useRef(o), c = C.useRef(n);
  return Bb(() => {
    c.current = n;
  }, [n]), C.useEffect(() => {
    var d;
    a.current !== o && ((d = c.current) == null || d.call(c, o), a.current = o);
  }, [o, a]), [o, i, c];
}
function $b(e) {
  return typeof e == "function";
}
var f0 = tg();
// @__NO_SIDE_EFFECTS__
function ba(e) {
  const n = C.forwardRef((o, i) => {
    let { children: a, ...c } = o, d = null, p = !1;
    const y = [];
    My(a) && typeof Ws == "function" && (a = Ws(a._payload)), C.Children.forEach(a, (f) => {
      var v;
      if (Yb(f)) {
        p = !0;
        const x = f;
        let T = "child" in x.props ? x.props.child : x.props.children;
        My(T) && typeof Ws == "function" && (T = Ws(T._payload)), d = Wb(x, T), y.push((v = d == null ? void 0 : d.props) == null ? void 0 : v.children);
      } else
        y.push(f);
    }), d ? d = C.cloneElement(d, void 0, y) : (
      // A `Slottable` was found but it didn't resolve to a single element (e.g.
      // it wrapped multiple elements, text, or a render-prop `child` that
      // wasn't an element). Don't fall back to treating the `Slottable` wrapper
      // itself as the slot target — throw a descriptive error below instead.
      !p && C.Children.count(a) === 1 && C.isValidElement(a) && (d = a)
    );
    const g = d ? Kb(d) : void 0, S = at(i, g);
    if (!d) {
      if (a || a === 0)
        throw new Error(
          p ? qb(e) : Zb(e)
        );
      return a;
    }
    const l = Gb(c, d.props ?? {});
    return d.type !== C.Fragment && (l.ref = i ? S : g), C.cloneElement(d, l);
  });
  return n.displayName = `${e}.Slot`, n;
}
var Hb = Symbol.for("radix.slottable"), Wb = (e, n) => {
  if ("child" in e.props) {
    const o = e.props.child;
    return C.isValidElement(o) ? C.cloneElement(o, void 0, e.props.children(o.props.children)) : null;
  }
  return C.isValidElement(n) ? n : null;
};
function Gb(e, n) {
  const o = { ...n };
  for (const i in n) {
    const a = e[i], c = n[i];
    /^on[A-Z]/.test(i) ? a && c ? o[i] = (...p) => {
      const y = c(...p);
      return a(...p), y;
    } : a && (o[i] = a) : i === "style" ? o[i] = { ...a, ...c } : i === "className" && (o[i] = [a, c].filter(Boolean).join(" "));
  }
  return { ...e, ...o };
}
function Kb(e) {
  var i, a;
  let n = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = n && "isReactWarning" in n && n.isReactWarning;
  return o ? e.ref : (n = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = n && "isReactWarning" in n && n.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
function Yb(e) {
  return C.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === Hb;
}
var Qb = Symbol.for("react.lazy");
function My(e) {
  return e != null && typeof e == "object" && "$$typeof" in e && e.$$typeof === Qb && "_payload" in e && Xb(e._payload);
}
function Xb(e) {
  return typeof e == "object" && e !== null && "then" in e;
}
var Zb = (e) => `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`, qb = (e) => `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`, Ws = td[" use ".trim().toString()], Jb = [
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
], gt = Jb.reduce((e, n) => {
  const o = /* @__PURE__ */ ba(`Primitive.${n}`), i = C.forwardRef((a, c) => {
    const { asChild: d, ...p } = a, y = d ? o : n;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ w.jsx(y, { ...p, ref: c });
  });
  return i.displayName = `Primitive.${n}`, { ...e, [n]: i };
}, {});
function eE(e, n) {
  e && f0.flushSync(() => e.dispatchEvent(n));
}
function xi(e) {
  const n = C.useRef(e);
  return C.useEffect(() => {
    n.current = e;
  }), C.useMemo(() => ((...o) => {
    var i;
    return (i = n.current) == null ? void 0 : i.call(n, ...o);
  }), []);
}
var tE = "DismissableLayer", Yc = "dismissableLayer.update", nE = "dismissableLayer.pointerDownOutside", rE = "dismissableLayer.focusOutside", Ry, $d = C.createContext({
  layers: /* @__PURE__ */ new Set(),
  layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
  branches: /* @__PURE__ */ new Set(),
  // Outside elements that belong to a layer's own dismiss affordance (eg, a
  // dialog overlay). Pressing them should dismiss the layer regardless of
  // whether or not they stop propagation.
  //
  // See https://github.com/radix-ui/primitives/issues/3346
  dismissableSurfaces: /* @__PURE__ */ new Set()
}), p0 = C.forwardRef(
  (e, n) => {
    const {
      disableOutsidePointerEvents: o = !1,
      deferPointerDownOutside: i = !1,
      onEscapeKeyDown: a,
      onPointerDownOutside: c,
      onFocusOutside: d,
      onInteractOutside: p,
      onDismiss: y,
      ...g
    } = e, S = C.useContext($d), [l, f] = C.useState(null), v = (l == null ? void 0 : l.ownerDocument) ?? (globalThis == null ? void 0 : globalThis.document), [, x] = C.useState({}), T = at(n, f), k = Array.from(S.layers), [A] = [
      ...S.layersWithOutsidePointerEventsDisabled
    ].slice(-1), R = A ? k.indexOf(A) : -1, P = l ? k.indexOf(l) : -1, D = S.layersWithOutsidePointerEventsDisabled.size > 0, L = P >= R, X = C.useRef(!1), Z = lE(
      (J) => {
        c == null || c(J), p == null || p(J), J.defaultPrevented || y == null || y();
      },
      {
        ownerDocument: v,
        deferPointerDownOutside: i,
        isDeferredPointerDownOutsideRef: X,
        dismissableSurfaces: S.dismissableSurfaces,
        shouldHandlePointerDownOutside: C.useCallback(
          (J) => {
            if (!(J instanceof Node))
              return !1;
            const ce = [...S.branches].some(
              (ye) => ye.contains(J)
            );
            return L && !ce;
          },
          [S.branches, L]
        )
      }
    ), U = uE((J) => {
      if (i && X.current)
        return;
      const ce = J.target;
      [...S.branches].some((he) => he.contains(ce)) || (d == null || d(J), p == null || p(J), J.defaultPrevented || y == null || y());
    }, v), G = l ? P === k.length - 1 : !1, Q = xi((J) => {
      J.key === "Escape" && (a == null || a(J), !J.defaultPrevented && y && (J.preventDefault(), y()));
    });
    return C.useEffect(() => {
      if (G)
        return v.addEventListener("keydown", Q, { capture: !0 }), () => v.removeEventListener("keydown", Q, { capture: !0 });
    }, [v, G, Q]), C.useEffect(() => {
      if (l)
        return o && (S.layersWithOutsidePointerEventsDisabled.size === 0 && (Ry = v.body.style.pointerEvents, v.body.style.pointerEvents = "none"), S.layersWithOutsidePointerEventsDisabled.add(l)), S.layers.add(l), Ny(), () => {
          o && (S.layersWithOutsidePointerEventsDisabled.delete(l), S.layersWithOutsidePointerEventsDisabled.size === 0 && (v.body.style.pointerEvents = Ry));
        };
    }, [l, v, o, S]), C.useEffect(() => () => {
      l && (S.layers.delete(l), S.layersWithOutsidePointerEventsDisabled.delete(l), Ny());
    }, [l, S]), C.useEffect(() => {
      const J = () => x({});
      return document.addEventListener(Yc, J), () => document.removeEventListener(Yc, J);
    }, []), /* @__PURE__ */ w.jsx(
      gt.div,
      {
        ...g,
        ref: T,
        style: {
          pointerEvents: D ? L ? "auto" : "none" : void 0,
          ...e.style
        },
        onFocusCapture: mt(e.onFocusCapture, U.onFocusCapture),
        onBlurCapture: mt(e.onBlurCapture, U.onBlurCapture),
        onPointerDownCapture: mt(
          e.onPointerDownCapture,
          Z.onPointerDownCapture
        )
      }
    );
  }
);
p0.displayName = tE;
var oE = "DismissableLayerBranch", iE = C.forwardRef((e, n) => {
  const o = C.useContext($d), i = C.useRef(null), a = at(n, i);
  return C.useEffect(() => {
    const c = i.current;
    if (c)
      return o.branches.add(c), () => {
        o.branches.delete(c);
      };
  }, [o.branches]), /* @__PURE__ */ w.jsx(gt.div, { ...e, ref: a });
});
iE.displayName = oE;
function sE() {
  const e = C.useContext($d), [n, o] = C.useState(null);
  return C.useEffect(() => {
    if (n)
      return e.dismissableSurfaces.add(n), () => {
        e.dismissableSurfaces.delete(n);
      };
  }, [n, e.dismissableSurfaces]), o;
}
var aE = () => !0;
function lE(e, n) {
  const {
    ownerDocument: o = globalThis == null ? void 0 : globalThis.document,
    deferPointerDownOutside: i = !1,
    isDeferredPointerDownOutsideRef: a,
    dismissableSurfaces: c,
    shouldHandlePointerDownOutside: d = aE
  } = n, p = xi(e), y = C.useRef(!1), g = C.useRef(!1), S = C.useRef(/* @__PURE__ */ new Map()), l = C.useRef(() => {
  });
  return C.useEffect(() => {
    function f() {
      g.current = !1, a.current = !1, S.current.clear();
    }
    function v() {
      return Array.from(S.current.values()).some(Boolean);
    }
    function x(P) {
      if (!g.current)
        return;
      const D = P.target;
      D instanceof Node && [...c].some((X) => X.contains(D)) || S.current.set(P.type, !0), P.type === "click" && window.setTimeout(() => {
        g.current && l.current();
      }, 0);
    }
    function T(P) {
      g.current && S.current.set(P.type, !1);
    }
    const k = (P) => {
      if (P.target && !y.current) {
        let D = function() {
          o.removeEventListener("click", l.current);
          const X = v();
          f(), X || h0(
            nE,
            p,
            L,
            { discrete: !0 }
          );
        };
        if (!d(P.target)) {
          o.removeEventListener("click", l.current), f(), y.current = !1;
          return;
        }
        const L = { originalEvent: P };
        g.current = !0, a.current = i && P.button === 0, S.current.clear(), !i || P.button !== 0 ? D() : (o.removeEventListener("click", l.current), l.current = D, o.addEventListener("click", l.current, { once: !0 }));
      } else
        o.removeEventListener("click", l.current), f();
      y.current = !1;
    }, A = [
      "pointerup",
      "mousedown",
      "mouseup",
      "touchstart",
      "touchend",
      "click"
    ];
    for (const P of A)
      o.addEventListener(P, x, !0), o.addEventListener(P, T);
    const R = window.setTimeout(() => {
      o.addEventListener("pointerdown", k);
    }, 0);
    return () => {
      window.clearTimeout(R), o.removeEventListener("pointerdown", k), o.removeEventListener("click", l.current);
      for (const P of A)
        o.removeEventListener(P, x, !0), o.removeEventListener(P, T);
    };
  }, [
    o,
    p,
    i,
    a,
    c,
    d
  ]), {
    // ensures we check React component tree (not just DOM tree)
    onPointerDownCapture: () => y.current = !0
  };
}
function uE(e, n = globalThis == null ? void 0 : globalThis.document) {
  const o = xi(e), i = C.useRef(!1);
  return C.useEffect(() => {
    const a = (c) => {
      c.target && !i.current && h0(rE, o, { originalEvent: c }, {
        discrete: !1
      });
    };
    return n.addEventListener("focusin", a), () => n.removeEventListener("focusin", a);
  }, [n, o]), {
    onFocusCapture: () => i.current = !0,
    onBlurCapture: () => i.current = !1
  };
}
function Ny() {
  const e = new CustomEvent(Yc);
  document.dispatchEvent(e);
}
function h0(e, n, o, { discrete: i }) {
  const a = o.originalEvent.target, c = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: o });
  n && a.addEventListener(e, n, { once: !0 }), i ? eE(a, c) : a.dispatchEvent(c);
}
var rc = "focusScope.autoFocusOnMount", oc = "focusScope.autoFocusOnUnmount", Dy = { bubbles: !1, cancelable: !0 }, cE = "FocusScope", m0 = C.forwardRef((e, n) => {
  const {
    loop: o = !1,
    trapped: i = !1,
    onMountAutoFocus: a,
    onUnmountAutoFocus: c,
    ...d
  } = e, [p, y] = C.useState(null), g = xi(a), S = xi(c), l = C.useRef(null), f = at(n, y), v = C.useRef({
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
      let T = function(P) {
        if (v.paused || !p) return;
        const D = P.target;
        p.contains(D) ? l.current = D : Ln(l.current, { select: !0 });
      }, k = function(P) {
        if (v.paused || !p) return;
        const D = P.relatedTarget;
        D !== null && (p.contains(D) || Ln(l.current, { select: !0 }));
      }, A = function(P) {
        if (document.activeElement === document.body)
          for (const L of P)
            L.removedNodes.length > 0 && Ln(p);
      };
      document.addEventListener("focusin", T), document.addEventListener("focusout", k);
      const R = new MutationObserver(A);
      return p && R.observe(p, { childList: !0, subtree: !0 }), () => {
        document.removeEventListener("focusin", T), document.removeEventListener("focusout", k), R.disconnect();
      };
    }
  }, [i, p, v.paused]), C.useEffect(() => {
    if (p) {
      Iy.add(v);
      const T = document.activeElement;
      if (!p.contains(T)) {
        const A = new CustomEvent(rc, Dy);
        p.addEventListener(rc, g), p.dispatchEvent(A), A.defaultPrevented || (dE(yE(y0(p)), { select: !0 }), document.activeElement === T && Ln(p));
      }
      return () => {
        p.removeEventListener(rc, g), setTimeout(() => {
          const A = new CustomEvent(oc, Dy);
          p.addEventListener(oc, S), p.dispatchEvent(A), A.defaultPrevented || Ln(T ?? document.body, { select: !0 }), p.removeEventListener(oc, S), Iy.remove(v);
        }, 0);
      };
    }
  }, [p, g, S, v]);
  const x = C.useCallback(
    (T) => {
      if (!o && !i || v.paused) return;
      const k = T.key === "Tab" && !T.altKey && !T.ctrlKey && !T.metaKey, A = document.activeElement;
      if (k && A) {
        const R = T.currentTarget, [P, D] = fE(R);
        P && D ? !T.shiftKey && A === D ? (T.preventDefault(), o && Ln(P, { select: !0 })) : T.shiftKey && A === P && (T.preventDefault(), o && Ln(D, { select: !0 })) : A === R && T.preventDefault();
      }
    },
    [o, i, v.paused]
  );
  return /* @__PURE__ */ w.jsx(gt.div, { tabIndex: -1, ...d, ref: f, onKeyDown: x });
});
m0.displayName = cE;
function dE(e, { select: n = !1 } = {}) {
  const o = document.activeElement;
  for (const i of e)
    if (Ln(i, { select: n }), document.activeElement !== o) return;
}
function fE(e) {
  const n = y0(e), o = jy(n, e), i = jy(n.reverse(), e);
  return [o, i];
}
function y0(e) {
  const n = [], o = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (i) => {
      const a = i.tagName === "INPUT" && i.type === "hidden";
      return i.disabled || i.hidden || a ? NodeFilter.FILTER_SKIP : i.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  for (; o.nextNode(); ) n.push(o.currentNode);
  return n;
}
function jy(e, n) {
  const o = typeof n.checkVisibility == "function" && n.checkVisibility({ checkVisibilityCSS: !0 });
  for (const i of e)
    if (!(o ? !i.checkVisibility({ checkVisibilityCSS: !0 }) : pE(i, { upTo: n })))
      return i;
}
function pE(e, { upTo: n }) {
  if (getComputedStyle(e).visibility === "hidden") return !0;
  for (; e; ) {
    if (n !== void 0 && e === n) return !1;
    if (getComputedStyle(e).display === "none") return !0;
    e = e.parentElement;
  }
  return !1;
}
function hE(e) {
  return e instanceof HTMLInputElement && "select" in e;
}
function Ln(e, { select: n = !1 } = {}) {
  if (e && e.focus) {
    const o = document.activeElement;
    e.focus({ preventScroll: !0 }), e !== o && hE(e) && n && e.select();
  }
}
var Iy = mE();
function mE() {
  let e = [];
  return {
    add(n) {
      const o = e[0];
      n !== o && (o == null || o.pause()), e = Fy(e, n), e.unshift(n);
    },
    remove(n) {
      var o;
      e = Fy(e, n), (o = e[0]) == null || o.resume();
    }
  };
}
function Fy(e, n) {
  const o = [...e], i = o.indexOf(n);
  return i !== -1 && o.splice(i, 1), o;
}
function yE(e) {
  return e.filter((n) => n.tagName !== "A");
}
var gE = "Portal", g0 = C.forwardRef((e, n) => {
  var p;
  const { container: o, ...i } = e, [a, c] = C.useState(!1);
  io(() => c(!0), []);
  const d = o || a && ((p = globalThis == null ? void 0 : globalThis.document) == null ? void 0 : p.body);
  return d ? f0.createPortal(/* @__PURE__ */ w.jsx(gt.div, { ...i, ref: n }), d) : null;
});
g0.displayName = gE;
function vE(e, n) {
  return C.useReducer((o, i) => n[o][i] ?? o, e);
}
var Oa = (e) => {
  const { present: n, children: o } = e, i = SE(n), a = typeof o == "function" ? o({ present: i.isPresent }) : C.Children.only(o), c = wE(i.ref, xE(a));
  return typeof o == "function" || i.isPresent ? C.cloneElement(a, { ref: c }) : null;
};
Oa.displayName = "Presence";
function SE(e) {
  const [n, o] = C.useState(), i = C.useRef(null), a = C.useRef(e), c = C.useRef("none"), d = C.useRef(void 0), p = e ? "mounted" : "unmounted", [y, g] = vE(p, {
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
    y === "mounted" ? (c.current = d.current ?? ti(i.current), d.current = void 0) : c.current = "none";
  }, [y]), io(() => {
    const S = i.current, l = a.current;
    if (l !== e) {
      const v = c.current, x = ti(S);
      e ? (d.current = x, g("MOUNT")) : x === "none" || (S == null ? void 0 : S.display) === "none" ? g("UNMOUNT") : g(l && v !== x ? "ANIMATION_OUT" : "UNMOUNT"), a.current = e;
    }
  }, [e, g]), io(() => {
    if (n) {
      let S;
      const l = n.ownerDocument.defaultView ?? window, f = (x) => {
        const k = ti(i.current).includes(CSS.escape(x.animationName));
        if (x.target === n && k && (g("ANIMATION_END"), !a.current)) {
          const A = n.style.animationFillMode;
          n.style.animationFillMode = "forwards", S = l.setTimeout(() => {
            n.style.animationFillMode === "forwards" && (n.style.animationFillMode = A);
          });
        }
      }, v = (x) => {
        x.target === n && (c.current = ti(i.current));
      };
      return n.addEventListener("animationstart", v), n.addEventListener("animationcancel", f), n.addEventListener("animationend", f), () => {
        l.clearTimeout(S), n.removeEventListener("animationstart", v), n.removeEventListener("animationcancel", f), n.removeEventListener("animationend", f);
      };
    } else
      g("ANIMATION_END");
  }, [n, g]), {
    isPresent: ["mounted", "unmountSuspended"].includes(y),
    ref: C.useCallback((S) => {
      if (S) {
        const l = getComputedStyle(S);
        i.current = l, d.current = ti(l);
      } else
        i.current = null;
      o(S);
    }, [])
  };
}
function Oy(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function wE(...e) {
  const n = C.useRef(e);
  return n.current = e, C.useCallback((o) => {
    const i = n.current;
    let a = !1;
    const c = i.map((d) => {
      const p = Oy(d, o);
      return !a && typeof p == "function" && (a = !0), p;
    });
    if (a)
      return () => {
        for (let d = 0; d < c.length; d++) {
          const p = c[d];
          typeof p == "function" ? p() : Oy(i[d], null);
        }
      };
  }, []);
}
function ti(e) {
  return (e == null ? void 0 : e.animationName) || "none";
}
function xE(e) {
  var i, a;
  let n = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = n && "isReactWarning" in n && n.isReactWarning;
  return o ? e.ref : (n = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = n && "isReactWarning" in n && n.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
var Gs = 0, Zt = null;
function _E() {
  C.useEffect(() => {
    Zt || (Zt = { start: Ly(), end: Ly() });
    const { start: e, end: n } = Zt;
    return document.body.firstElementChild !== e && document.body.insertAdjacentElement("afterbegin", e), document.body.lastElementChild !== n && document.body.insertAdjacentElement("beforeend", n), Gs++, () => {
      Gs === 1 && (Zt == null || Zt.start.remove(), Zt == null || Zt.end.remove(), Zt = null), Gs = Math.max(0, Gs - 1);
    };
  }, []);
}
function Ly() {
  const e = document.createElement("span");
  return e.setAttribute("data-radix-focus-guard", ""), e.tabIndex = 0, e.style.outline = "none", e.style.opacity = "0", e.style.position = "fixed", e.style.pointerEvents = "none", e;
}
var tn = function() {
  return tn = Object.assign || function(n) {
    for (var o, i = 1, a = arguments.length; i < a; i++) {
      o = arguments[i];
      for (var c in o) Object.prototype.hasOwnProperty.call(o, c) && (n[c] = o[c]);
    }
    return n;
  }, tn.apply(this, arguments);
};
function v0(e, n) {
  var o = {};
  for (var i in e) Object.prototype.hasOwnProperty.call(e, i) && n.indexOf(i) < 0 && (o[i] = e[i]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var a = 0, i = Object.getOwnPropertySymbols(e); a < i.length; a++)
      n.indexOf(i[a]) < 0 && Object.prototype.propertyIsEnumerable.call(e, i[a]) && (o[i[a]] = e[i[a]]);
  return o;
}
function kE(e, n, o) {
  if (o || arguments.length === 2) for (var i = 0, a = n.length, c; i < a; i++)
    (c || !(i in n)) && (c || (c = Array.prototype.slice.call(n, 0, i)), c[i] = n[i]);
  return e.concat(c || Array.prototype.slice.call(n));
}
var sa = "right-scroll-bar-position", aa = "width-before-scroll-bar", TE = "with-scroll-bars-hidden", AE = "--removed-body-scroll-bar-size";
function ic(e, n) {
  return typeof e == "function" ? e(n) : e && (e.current = n), e;
}
function CE(e, n) {
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
var bE = typeof window < "u" ? C.useLayoutEffect : C.useEffect, Vy = /* @__PURE__ */ new WeakMap();
function EE(e, n) {
  var o = CE(null, function(i) {
    return e.forEach(function(a) {
      return ic(a, i);
    });
  });
  return bE(function() {
    var i = Vy.get(o);
    if (i) {
      var a = new Set(i), c = new Set(e), d = o.current;
      a.forEach(function(p) {
        c.has(p) || ic(p, null);
      }), c.forEach(function(p) {
        a.has(p) || ic(p, d);
      });
    }
    Vy.set(o, e);
  }, [e]), o;
}
function PE(e) {
  return e;
}
function ME(e, n) {
  n === void 0 && (n = PE);
  var o = [], i = !1, a = {
    read: function() {
      if (i)
        throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");
      return o.length ? o[o.length - 1] : e;
    },
    useMedium: function(c) {
      var d = n(c, i);
      return o.push(d), function() {
        o = o.filter(function(p) {
          return p !== d;
        });
      };
    },
    assignSyncMedium: function(c) {
      for (i = !0; o.length; ) {
        var d = o;
        o = [], d.forEach(c);
      }
      o = {
        push: function(p) {
          return c(p);
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
        var p = o;
        o = [], p.forEach(c), d = o;
      }
      var y = function() {
        var S = d;
        d = [], S.forEach(c);
      }, g = function() {
        return Promise.resolve().then(y);
      };
      g(), o = {
        push: function(S) {
          d.push(S), g();
        },
        filter: function(S) {
          return d = d.filter(S), o;
        }
      };
    }
  };
  return a;
}
function RE(e) {
  e === void 0 && (e = {});
  var n = ME(null);
  return n.options = tn({ async: !0, ssr: !1 }, e), n;
}
var S0 = function(e) {
  var n = e.sideCar, o = v0(e, ["sideCar"]);
  if (!n)
    throw new Error("Sidecar: please provide `sideCar` property to import the right car");
  var i = n.read();
  if (!i)
    throw new Error("Sidecar medium not found");
  return C.createElement(i, tn({}, o));
};
S0.isSideCarExport = !0;
function NE(e, n) {
  return e.useMedium(n), S0;
}
var w0 = RE(), sc = function() {
}, La = C.forwardRef(function(e, n) {
  var o = C.useRef(null), i = C.useState({
    onScrollCapture: sc,
    onWheelCapture: sc,
    onTouchMoveCapture: sc
  }), a = i[0], c = i[1], d = e.forwardProps, p = e.children, y = e.className, g = e.removeScrollBar, S = e.enabled, l = e.shards, f = e.sideCar, v = e.noRelative, x = e.noIsolation, T = e.inert, k = e.allowPinchZoom, A = e.as, R = A === void 0 ? "div" : A, P = e.gapMode, D = v0(e, ["forwardProps", "children", "className", "removeScrollBar", "enabled", "shards", "sideCar", "noRelative", "noIsolation", "inert", "allowPinchZoom", "as", "gapMode"]), L = f, X = EE([o, n]), Z = tn(tn({}, D), a);
  return C.createElement(
    C.Fragment,
    null,
    S && C.createElement(L, { sideCar: w0, removeScrollBar: g, shards: l, noRelative: v, noIsolation: x, inert: T, setCallbacks: c, allowPinchZoom: !!k, lockRef: o, gapMode: P }),
    d ? C.cloneElement(C.Children.only(p), tn(tn({}, Z), { ref: X })) : C.createElement(R, tn({}, Z, { className: y, ref: X }), p)
  );
});
La.defaultProps = {
  enabled: !0,
  removeScrollBar: !0,
  inert: !1
};
La.classNames = {
  fullWidth: aa,
  zeroRight: sa
};
var DE = function() {
  if (typeof __webpack_nonce__ < "u")
    return __webpack_nonce__;
};
function jE() {
  if (!document)
    return null;
  var e = document.createElement("style");
  e.type = "text/css";
  var n = DE();
  return n && e.setAttribute("nonce", n), e;
}
function IE(e, n) {
  e.styleSheet ? e.styleSheet.cssText = n : e.appendChild(document.createTextNode(n));
}
function FE(e) {
  var n = document.head || document.getElementsByTagName("head")[0];
  n.appendChild(e);
}
var OE = function() {
  var e = 0, n = null;
  return {
    add: function(o) {
      e == 0 && (n = jE()) && (IE(n, o), FE(n)), e++;
    },
    remove: function() {
      e--, !e && n && (n.parentNode && n.parentNode.removeChild(n), n = null);
    }
  };
}, LE = function() {
  var e = OE();
  return function(n, o) {
    C.useEffect(function() {
      return e.add(n), function() {
        e.remove();
      };
    }, [n && o]);
  };
}, x0 = function() {
  var e = LE(), n = function(o) {
    var i = o.styles, a = o.dynamic;
    return e(i, a), null;
  };
  return n;
}, VE = {
  left: 0,
  top: 0,
  right: 0,
  gap: 0
}, ac = function(e) {
  return parseInt(e || "", 10) || 0;
}, zE = function(e) {
  var n = window.getComputedStyle(document.body), o = n[e === "padding" ? "paddingLeft" : "marginLeft"], i = n[e === "padding" ? "paddingTop" : "marginTop"], a = n[e === "padding" ? "paddingRight" : "marginRight"];
  return [ac(o), ac(i), ac(a)];
}, BE = function(e) {
  if (e === void 0 && (e = "margin"), typeof window > "u")
    return VE;
  var n = zE(e), o = document.documentElement.clientWidth, i = window.innerWidth;
  return {
    left: n[0],
    top: n[1],
    right: n[2],
    gap: Math.max(0, i - o + n[2] - n[0])
  };
}, UE = x0(), to = "data-scroll-locked", $E = function(e, n, o, i) {
  var a = e.left, c = e.top, d = e.right, p = e.gap;
  return o === void 0 && (o = "margin"), `
  .`.concat(TE, ` {
   overflow: hidden `).concat(i, `;
   padding-right: `).concat(p, "px ").concat(i, `;
  }
  body[`).concat(to, `] {
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
    margin-right: `).concat(p, "px ").concat(i, `;
    `),
    o === "padding" && "padding-right: ".concat(p, "px ").concat(i, ";")
  ].filter(Boolean).join(""), `
  }
  
  .`).concat(sa, ` {
    right: `).concat(p, "px ").concat(i, `;
  }
  
  .`).concat(aa, ` {
    margin-right: `).concat(p, "px ").concat(i, `;
  }
  
  .`).concat(sa, " .").concat(sa, ` {
    right: 0 `).concat(i, `;
  }
  
  .`).concat(aa, " .").concat(aa, ` {
    margin-right: 0 `).concat(i, `;
  }
  
  body[`).concat(to, `] {
    `).concat(AE, ": ").concat(p, `px;
  }
`);
}, zy = function() {
  var e = parseInt(document.body.getAttribute(to) || "0", 10);
  return isFinite(e) ? e : 0;
}, HE = function() {
  C.useEffect(function() {
    return document.body.setAttribute(to, (zy() + 1).toString()), function() {
      var e = zy() - 1;
      e <= 0 ? document.body.removeAttribute(to) : document.body.setAttribute(to, e.toString());
    };
  }, []);
}, WE = function(e) {
  var n = e.noRelative, o = e.noImportant, i = e.gapMode, a = i === void 0 ? "margin" : i;
  HE();
  var c = C.useMemo(function() {
    return BE(a);
  }, [a]);
  return C.createElement(UE, { styles: $E(c, !n, a, o ? "" : "!important") });
}, Qc = !1;
if (typeof window < "u")
  try {
    var Ks = Object.defineProperty({}, "passive", {
      get: function() {
        return Qc = !0, !0;
      }
    });
    window.addEventListener("test", Ks, Ks), window.removeEventListener("test", Ks, Ks);
  } catch {
    Qc = !1;
  }
var Wr = Qc ? { passive: !1 } : !1, GE = function(e) {
  return e.tagName === "TEXTAREA";
}, _0 = function(e, n) {
  if (!(e instanceof Element))
    return !1;
  var o = window.getComputedStyle(e);
  return (
    // not-not-scrollable
    o[n] !== "hidden" && // contains scroll inside self
    !(o.overflowY === o.overflowX && !GE(e) && o[n] === "visible")
  );
}, KE = function(e) {
  return _0(e, "overflowY");
}, YE = function(e) {
  return _0(e, "overflowX");
}, By = function(e, n) {
  var o = n.ownerDocument, i = n;
  do {
    typeof ShadowRoot < "u" && i instanceof ShadowRoot && (i = i.host);
    var a = k0(e, i);
    if (a) {
      var c = T0(e, i), d = c[1], p = c[2];
      if (d > p)
        return !0;
    }
    i = i.parentNode;
  } while (i && i !== o.body);
  return !1;
}, QE = function(e) {
  var n = e.scrollTop, o = e.scrollHeight, i = e.clientHeight;
  return [
    n,
    o,
    i
  ];
}, XE = function(e) {
  var n = e.scrollLeft, o = e.scrollWidth, i = e.clientWidth;
  return [
    n,
    o,
    i
  ];
}, k0 = function(e, n) {
  return e === "v" ? KE(n) : YE(n);
}, T0 = function(e, n) {
  return e === "v" ? QE(n) : XE(n);
}, ZE = function(e, n) {
  return e === "h" && n === "rtl" ? -1 : 1;
}, qE = function(e, n, o, i, a) {
  var c = ZE(e, window.getComputedStyle(n).direction), d = c * i, p = o.target, y = n.contains(p), g = !1, S = d > 0, l = 0, f = 0;
  do {
    if (!p)
      break;
    var v = T0(e, p), x = v[0], T = v[1], k = v[2], A = T - k - c * x;
    (x || A) && k0(e, p) && (l += A, f += x);
    var R = p.parentNode;
    p = R && R.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? R.host : R;
  } while (
    // portaled content
    !y && p !== document.body || // self content
    y && (n.contains(p) || n === p)
  );
  return (S && Math.abs(l) < 1 || !S && Math.abs(f) < 1) && (g = !0), g;
}, Ys = function(e) {
  return "changedTouches" in e ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY] : [0, 0];
}, Uy = function(e) {
  return [e.deltaX, e.deltaY];
}, $y = function(e) {
  return e && "current" in e ? e.current : e;
}, JE = function(e, n) {
  return e[0] === n[0] && e[1] === n[1];
}, eP = function(e) {
  return `
  .block-interactivity-`.concat(e, ` {pointer-events: none;}
  .allow-interactivity-`).concat(e, ` {pointer-events: all;}
`);
}, tP = 0, Gr = [];
function nP(e) {
  var n = C.useRef([]), o = C.useRef([0, 0]), i = C.useRef(), a = C.useState(tP++)[0], c = C.useState(x0)[0], d = C.useRef(e);
  C.useEffect(function() {
    d.current = e;
  }, [e]), C.useEffect(function() {
    if (e.inert) {
      document.body.classList.add("block-interactivity-".concat(a));
      var T = kE([e.lockRef.current], (e.shards || []).map($y), !0).filter(Boolean);
      return T.forEach(function(k) {
        return k.classList.add("allow-interactivity-".concat(a));
      }), function() {
        document.body.classList.remove("block-interactivity-".concat(a)), T.forEach(function(k) {
          return k.classList.remove("allow-interactivity-".concat(a));
        });
      };
    }
  }, [e.inert, e.lockRef.current, e.shards]);
  var p = C.useCallback(function(T, k) {
    if ("touches" in T && T.touches.length === 2 || T.type === "wheel" && T.ctrlKey)
      return !d.current.allowPinchZoom;
    var A = Ys(T), R = o.current, P = "deltaX" in T ? T.deltaX : R[0] - A[0], D = "deltaY" in T ? T.deltaY : R[1] - A[1], L, X = T.target, Z = Math.abs(P) > Math.abs(D) ? "h" : "v";
    if ("touches" in T && Z === "h" && X.type === "range")
      return !1;
    var U = window.getSelection(), G = U && U.anchorNode, Q = G ? G === X || G.contains(X) : !1;
    if (Q)
      return !1;
    var J = By(Z, X);
    if (!J)
      return !0;
    if (J ? L = Z : (L = Z === "v" ? "h" : "v", J = By(Z, X)), !J)
      return !1;
    if (!i.current && "changedTouches" in T && (P || D) && (i.current = L), !L)
      return !0;
    var ce = i.current || L;
    return qE(ce, k, T, ce === "h" ? P : D);
  }, []), y = C.useCallback(function(T) {
    var k = T;
    if (!(!Gr.length || Gr[Gr.length - 1] !== c)) {
      var A = "deltaY" in k ? Uy(k) : Ys(k), R = n.current.filter(function(L) {
        return L.name === k.type && (L.target === k.target || k.target === L.shadowParent) && JE(L.delta, A);
      })[0];
      if (R && R.should) {
        k.cancelable && k.preventDefault();
        return;
      }
      if (!R) {
        var P = (d.current.shards || []).map($y).filter(Boolean).filter(function(L) {
          return L.contains(k.target);
        }), D = P.length > 0 ? p(k, P[0]) : !d.current.noIsolation;
        D && k.cancelable && k.preventDefault();
      }
    }
  }, []), g = C.useCallback(function(T, k, A, R) {
    var P = { name: T, delta: k, target: A, should: R, shadowParent: rP(A) };
    n.current.push(P), setTimeout(function() {
      n.current = n.current.filter(function(D) {
        return D !== P;
      });
    }, 1);
  }, []), S = C.useCallback(function(T) {
    o.current = Ys(T), i.current = void 0;
  }, []), l = C.useCallback(function(T) {
    g(T.type, Uy(T), T.target, p(T, e.lockRef.current));
  }, []), f = C.useCallback(function(T) {
    g(T.type, Ys(T), T.target, p(T, e.lockRef.current));
  }, []);
  C.useEffect(function() {
    return Gr.push(c), e.setCallbacks({
      onScrollCapture: l,
      onWheelCapture: l,
      onTouchMoveCapture: f
    }), document.addEventListener("wheel", y, Wr), document.addEventListener("touchmove", y, Wr), document.addEventListener("touchstart", S, Wr), function() {
      Gr = Gr.filter(function(T) {
        return T !== c;
      }), document.removeEventListener("wheel", y, Wr), document.removeEventListener("touchmove", y, Wr), document.removeEventListener("touchstart", S, Wr);
    };
  }, []);
  var v = e.removeScrollBar, x = e.inert;
  return C.createElement(
    C.Fragment,
    null,
    x ? C.createElement(c, { styles: eP(a) }) : null,
    v ? C.createElement(WE, { noRelative: e.noRelative, gapMode: e.gapMode }) : null
  );
}
function rP(e) {
  for (var n = null; e !== null; )
    e instanceof ShadowRoot && (n = e.host, e = e.host), e = e.parentNode;
  return n;
}
const oP = NE(w0, nP);
var A0 = C.forwardRef(function(e, n) {
  return C.createElement(La, tn({}, e, { ref: n, sideCar: oP }));
});
A0.classNames = La.classNames;
var iP = function(e) {
  if (typeof document > "u")
    return null;
  var n = Array.isArray(e) ? e[0] : e;
  return n.ownerDocument.body;
}, Kr = /* @__PURE__ */ new WeakMap(), Qs = /* @__PURE__ */ new WeakMap(), Xs = {}, lc = 0, C0 = function(e) {
  return e && (e.host || C0(e.parentNode));
}, sP = function(e, n) {
  return n.map(function(o) {
    if (e.contains(o))
      return o;
    var i = C0(o);
    return i && e.contains(i) ? i : (console.error("aria-hidden", o, "in not contained inside", e, ". Doing nothing"), null);
  }).filter(function(o) {
    return !!o;
  });
}, aP = function(e, n, o, i) {
  var a = sP(n, Array.isArray(e) ? e : [e]);
  Xs[o] || (Xs[o] = /* @__PURE__ */ new WeakMap());
  var c = Xs[o], d = [], p = /* @__PURE__ */ new Set(), y = new Set(a), g = function(l) {
    !l || p.has(l) || (p.add(l), g(l.parentNode));
  };
  a.forEach(g);
  var S = function(l) {
    !l || y.has(l) || Array.prototype.forEach.call(l.children, function(f) {
      if (p.has(f))
        S(f);
      else
        try {
          var v = f.getAttribute(i), x = v !== null && v !== "false", T = (Kr.get(f) || 0) + 1, k = (c.get(f) || 0) + 1;
          Kr.set(f, T), c.set(f, k), d.push(f), T === 1 && x && Qs.set(f, !0), k === 1 && f.setAttribute(o, "true"), x || f.setAttribute(i, "true");
        } catch (A) {
          console.error("aria-hidden: cannot operate on ", f, A);
        }
    });
  };
  return S(n), p.clear(), lc++, function() {
    d.forEach(function(l) {
      var f = Kr.get(l) - 1, v = c.get(l) - 1;
      Kr.set(l, f), c.set(l, v), f || (Qs.has(l) || l.removeAttribute(i), Qs.delete(l)), v || l.removeAttribute(o);
    }), lc--, lc || (Kr = /* @__PURE__ */ new WeakMap(), Kr = /* @__PURE__ */ new WeakMap(), Qs = /* @__PURE__ */ new WeakMap(), Xs = {});
  };
}, lP = function(e, n, o) {
  o === void 0 && (o = "data-aria-hidden");
  var i = Array.from(Array.isArray(e) ? e : [e]), a = iP(e);
  return a ? (i.push.apply(i, Array.from(a.querySelectorAll("[aria-live], script"))), aP(i, a, o, "aria-hidden")) : function() {
    return null;
  };
}, Va = "Dialog", [b0] = Ud(Va), [uP, Ht] = b0(Va), E0 = (e) => {
  const {
    __scopeDialog: n,
    children: o,
    open: i,
    defaultOpen: a,
    onOpenChange: c,
    modal: d = !0
  } = e, p = C.useRef(null), y = C.useRef(null), [g, S] = d0({
    prop: i,
    defaultProp: a ?? !1,
    onChange: c,
    caller: Va
  });
  return /* @__PURE__ */ w.jsx(
    uP,
    {
      scope: n,
      triggerRef: p,
      contentRef: y,
      contentId: nc(),
      titleId: nc(),
      descriptionId: nc(),
      open: g,
      onOpenChange: S,
      onOpenToggle: C.useCallback(() => S((l) => !l), [S]),
      modal: d,
      children: o
    }
  );
};
E0.displayName = Va;
var P0 = "DialogTrigger", cP = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Ht(P0, o), c = at(n, a.triggerRef);
    return /* @__PURE__ */ w.jsx(
      gt.button,
      {
        type: "button",
        "aria-haspopup": "dialog",
        "aria-expanded": a.open,
        "aria-controls": a.open ? a.contentId : void 0,
        "data-state": Wd(a.open),
        ...i,
        ref: c,
        onClick: mt(e.onClick, a.onOpenToggle)
      }
    );
  }
);
cP.displayName = P0;
var Hd = "DialogPortal", [dP, M0] = b0(Hd, {
  forceMount: void 0
}), R0 = (e) => {
  const { __scopeDialog: n, forceMount: o, children: i, container: a } = e, c = Ht(Hd, n);
  return /* @__PURE__ */ w.jsx(dP, { scope: n, forceMount: o, children: C.Children.map(i, (d) => /* @__PURE__ */ w.jsx(Oa, { present: o || c.open, children: /* @__PURE__ */ w.jsx(g0, { asChild: !0, container: a, children: d }) })) });
};
R0.displayName = Hd;
var Ea = "DialogOverlay", N0 = C.forwardRef(
  (e, n) => {
    const o = M0(Ea, e.__scopeDialog), { forceMount: i = o.forceMount, ...a } = e, c = Ht(Ea, e.__scopeDialog);
    return c.modal ? /* @__PURE__ */ w.jsx(Oa, { present: i || c.open, children: /* @__PURE__ */ w.jsx(pP, { ...a, ref: n }) }) : null;
  }
);
N0.displayName = Ea;
var fP = /* @__PURE__ */ ba("DialogOverlay.RemoveScroll"), pP = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Ht(Ea, o), c = sE(), d = at(n, c);
    return (
      // Make sure `Content` is scrollable even when it doesn't live inside `RemoveScroll`
      // ie. when `Overlay` and `Content` are siblings
      /* @__PURE__ */ w.jsx(A0, { as: fP, allowPinchZoom: !0, shards: [a.contentRef], children: /* @__PURE__ */ w.jsx(
        gt.div,
        {
          "data-state": Wd(a.open),
          ...i,
          ref: d,
          style: { pointerEvents: "auto", ...i.style }
        }
      ) })
    );
  }
), so = "DialogContent", D0 = C.forwardRef(
  (e, n) => {
    const o = M0(so, e.__scopeDialog), { forceMount: i = o.forceMount, ...a } = e, c = Ht(so, e.__scopeDialog);
    return /* @__PURE__ */ w.jsx(Oa, { present: i || c.open, children: c.modal ? /* @__PURE__ */ w.jsx(hP, { ...a, ref: n }) : /* @__PURE__ */ w.jsx(mP, { ...a, ref: n }) });
  }
);
D0.displayName = so;
var hP = C.forwardRef(
  (e, n) => {
    const o = Ht(so, e.__scopeDialog), i = C.useRef(null), a = at(n, o.contentRef, i);
    return C.useEffect(() => {
      const c = i.current;
      if (c) return lP(c);
    }, []), /* @__PURE__ */ w.jsx(
      j0,
      {
        ...e,
        ref: a,
        trapFocus: o.open,
        disableOutsidePointerEvents: o.open,
        onCloseAutoFocus: mt(e.onCloseAutoFocus, (c) => {
          var d;
          c.preventDefault(), (d = o.triggerRef.current) == null || d.focus();
        }),
        onPointerDownOutside: mt(e.onPointerDownOutside, (c) => {
          const d = c.detail.originalEvent, p = d.button === 0 && d.ctrlKey === !0;
          (d.button === 2 || p) && c.preventDefault();
        }),
        onFocusOutside: mt(
          e.onFocusOutside,
          (c) => c.preventDefault()
        )
      }
    );
  }
), mP = C.forwardRef(
  (e, n) => {
    const o = Ht(so, e.__scopeDialog), i = C.useRef(!1), a = C.useRef(!1);
    return /* @__PURE__ */ w.jsx(
      j0,
      {
        ...e,
        ref: n,
        trapFocus: !1,
        disableOutsidePointerEvents: !1,
        onCloseAutoFocus: (c) => {
          var d, p;
          (d = e.onCloseAutoFocus) == null || d.call(e, c), c.defaultPrevented || (i.current || (p = o.triggerRef.current) == null || p.focus(), c.preventDefault()), i.current = !1, a.current = !1;
        },
        onInteractOutside: (c) => {
          var y, g;
          (y = e.onInteractOutside) == null || y.call(e, c), c.defaultPrevented || (i.current = !0, c.detail.originalEvent.type === "pointerdown" && (a.current = !0));
          const d = c.target;
          ((g = o.triggerRef.current) == null ? void 0 : g.contains(d)) && c.preventDefault(), c.detail.originalEvent.type === "focusin" && a.current && c.preventDefault();
        }
      }
    );
  }
), j0 = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, trapFocus: i, onOpenAutoFocus: a, onCloseAutoFocus: c, ...d } = e, p = Ht(so, o);
    return _E(), /* @__PURE__ */ w.jsx(w.Fragment, { children: /* @__PURE__ */ w.jsx(
      m0,
      {
        asChild: !0,
        loop: !0,
        trapped: i,
        onMountAutoFocus: a,
        onUnmountAutoFocus: c,
        children: /* @__PURE__ */ w.jsx(
          p0,
          {
            role: "dialog",
            id: p.contentId,
            "aria-describedby": p.descriptionId,
            "aria-labelledby": p.titleId,
            "data-state": Wd(p.open),
            ...d,
            ref: n,
            deferPointerDownOutside: !0,
            onDismiss: () => p.onOpenChange(!1)
          }
        )
      }
    ) });
  }
), I0 = "DialogTitle", F0 = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Ht(I0, o);
    return /* @__PURE__ */ w.jsx(gt.h2, { id: a.titleId, ...i, ref: n });
  }
);
F0.displayName = I0;
var O0 = "DialogDescription", L0 = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Ht(O0, o);
    return /* @__PURE__ */ w.jsx(gt.p, { id: a.descriptionId, ...i, ref: n });
  }
);
L0.displayName = O0;
var V0 = "DialogClose", yP = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Ht(V0, o);
    return /* @__PURE__ */ w.jsx(
      gt.button,
      {
        type: "button",
        ...i,
        ref: n,
        onClick: mt(e.onClick, () => a.onOpenChange(!1))
      }
    );
  }
);
yP.displayName = V0;
function Wd(e) {
  return e ? "open" : "closed";
}
function gP() {
  const e = $((a) => a.summaryRecord), n = $((a) => a.closeSummary), o = $((a) => a.startTimer), i = Wn(e == null ? void 0 : e.selectedScene);
  return /* @__PURE__ */ w.jsx(E0, { open: !!e, onOpenChange: (a) => !a && n(), children: /* @__PURE__ */ w.jsx(Da, { children: e ? /* @__PURE__ */ w.jsxs(R0, { forceMount: !0, children: [
    /* @__PURE__ */ w.jsx(N0, { asChild: !0, children: /* @__PURE__ */ w.jsx(
      rn.div,
      {
        className: "summary-overlay",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
      }
    ) }),
    /* @__PURE__ */ w.jsx(D0, { asChild: !0, children: /* @__PURE__ */ w.jsxs(
      rn.article,
      {
        className: "summary-card liquid-glass",
        initial: { opacity: 0, y: 18, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 18, scale: 0.98 },
        children: [
          /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Session complete" }),
          /* @__PURE__ */ w.jsx(F0, { children: "Focus block complete" }),
          /* @__PURE__ */ w.jsx(L0, { className: "sr-only", children: "Summary of the completed focus block." }),
          /* @__PURE__ */ w.jsx("p", { children: "You protected a focused block in your quiet study room." }),
          /* @__PURE__ */ w.jsxs("div", { className: "summary-grid", children: [
            /* @__PURE__ */ w.jsxs("div", { className: "summary-stat liquid-glass-lite", children: [
              /* @__PURE__ */ w.jsx("span", { children: "Focus time" }),
              /* @__PURE__ */ w.jsx("strong", { children: Id(e.totalFocusTime) })
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
function z0(e, [n, o]) {
  return Math.min(o, Math.max(n, e));
}
var vP = C.createContext(void 0);
function SP(e) {
  const n = C.useContext(vP);
  return e || n || "ltr";
}
function wP(e) {
  const n = C.useRef({ value: e, previous: e });
  return C.useMemo(() => (n.current.value !== e && (n.current.previous = n.current.value, n.current.value = e), n.current.previous), [e]);
}
function xP(e) {
  const [n, o] = C.useState(void 0);
  return io(() => {
    if (e) {
      o({ width: e.offsetWidth, height: e.offsetHeight });
      const i = new ResizeObserver((a) => {
        if (!Array.isArray(a) || !a.length)
          return;
        const c = a[0];
        let d, p;
        if ("borderBoxSize" in c) {
          const y = c.borderBoxSize, g = Array.isArray(y) ? y[0] : y;
          d = g.inlineSize, p = g.blockSize;
        } else
          d = e.offsetWidth, p = e.offsetHeight;
        o({ width: d, height: p });
      });
      return i.observe(e, { box: "border-box" }), () => i.unobserve(e);
    } else
      o(void 0);
  }, [e]), n;
}
function _P(e) {
  const n = e + "CollectionProvider", [o, i] = Ud(n), [a, c] = o(
    n,
    { collectionRef: { current: null }, itemMap: /* @__PURE__ */ new Map() }
  ), d = (T) => {
    const { scope: k, children: A } = T, R = C.useRef(null), P = C.useRef(/* @__PURE__ */ new Map()).current;
    return /* @__PURE__ */ w.jsx(a, { scope: k, itemMap: P, collectionRef: R, children: A });
  };
  d.displayName = n;
  const p = e + "CollectionSlot", y = /* @__PURE__ */ ba(p), g = C.forwardRef(
    (T, k) => {
      const { scope: A, children: R } = T, P = c(p, A), D = at(k, P.collectionRef);
      return /* @__PURE__ */ w.jsx(y, { ref: D, children: R });
    }
  );
  g.displayName = p;
  const S = e + "CollectionItemSlot", l = "data-radix-collection-item", f = /* @__PURE__ */ ba(S), v = C.forwardRef(
    (T, k) => {
      const { scope: A, children: R, ...P } = T, D = C.useRef(null), L = at(k, D), X = c(S, A);
      return C.useEffect(() => (X.itemMap.set(D, { ref: D, ...P }), () => void X.itemMap.delete(D))), /* @__PURE__ */ w.jsx(f, { [l]: "", ref: L, children: R });
    }
  );
  v.displayName = S;
  function x(T) {
    const k = c(e + "CollectionConsumer", T);
    return C.useCallback(() => {
      const R = k.collectionRef.current;
      if (!R) return [];
      const P = Array.from(R.querySelectorAll(`[${l}]`));
      return Array.from(k.itemMap.values()).sort(
        (X, Z) => P.indexOf(X.ref.current) - P.indexOf(Z.ref.current)
      );
    }, [k.collectionRef, k.itemMap]);
  }
  return [
    { Provider: d, Slot: g, ItemSlot: v },
    x,
    i
  ];
}
var B0 = ["PageUp", "PageDown"], U0 = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"], $0 = {
  "from-left": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-right": ["Home", "PageDown", "ArrowDown", "ArrowRight"],
  "from-bottom": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-top": ["Home", "PageDown", "ArrowUp", "ArrowLeft"]
}, co = "Slider", [Xc, kP, TP] = _P(co), [Gd] = Ud(co, [
  TP
]), [AP, Ei] = Gd(co), H0 = C.forwardRef(
  (e, n) => {
    const {
      name: o,
      min: i = 0,
      max: a = 100,
      step: c = 1,
      orientation: d = "horizontal",
      disabled: p = !1,
      minStepsBetweenThumbs: y = 0,
      defaultValue: g = [i],
      value: S,
      onValueChange: l = () => {
      },
      onValueCommit: f = () => {
      },
      inverted: v = !1,
      form: x,
      ...T
    } = e, k = C.useRef(/* @__PURE__ */ new Set()), A = C.useRef(0), R = C.useRef(!1), D = d === "horizontal" ? CP : bP, [L, X] = C.useState(null), Z = at(n, X), [U = [], G] = d0({
      prop: S,
      defaultProp: g,
      onChange: (ue) => {
        var V;
        (V = [...k.current][A.current]) == null || V.focus({
          preventScroll: !0,
          focusVisible: R.current
        }), R.current = !1, l(ue);
      }
    }), Q = C.useRef(U), J = C.useRef(U);
    C.useEffect(() => {
      const ue = x ? L == null ? void 0 : L.ownerDocument.getElementById(x) : L == null ? void 0 : L.closest("form");
      if (ue instanceof HTMLFormElement) {
        const ge = () => G(J.current);
        return ue.addEventListener("reset", ge), () => ue.removeEventListener("reset", ge);
      }
    }, [L, x, G]);
    function ce(ue) {
      const ge = RP(U, ue);
      we(ue, ge);
    }
    function ye(ue) {
      we(ue, A.current);
    }
    function he() {
      const ue = Q.current[A.current];
      U[A.current] !== ue && f(U);
    }
    function we(ue, ge, { commit: V } = { commit: !1 }) {
      const q = sS(c), K = ua(Math.round((ue - i) / c) * c + i, q), b = z0(K, [i, a]);
      G((O = []) => {
        const le = PP(O, b, ge);
        if (jP(le, y * c)) {
          A.current = le.indexOf(b);
          const fe = String(le) !== String(O);
          return fe && V && f(le), fe ? le : O;
        } else
          return O;
      });
    }
    return /* @__PURE__ */ w.jsx(
      AP,
      {
        scope: e.__scopeSlider,
        name: o,
        disabled: p,
        min: i,
        max: a,
        valueIndexToChangeRef: A,
        thumbs: k.current,
        values: U,
        orientation: d,
        form: x,
        children: /* @__PURE__ */ w.jsx(Xc.Provider, { scope: e.__scopeSlider, children: /* @__PURE__ */ w.jsx(Xc.Slot, { scope: e.__scopeSlider, children: /* @__PURE__ */ w.jsx(
          D,
          {
            "aria-disabled": p,
            "data-disabled": p ? "" : void 0,
            ...T,
            ref: Z,
            onPointerDown: mt(T.onPointerDown, () => {
              p || (Q.current = U, R.current = !1);
            }),
            min: i,
            max: a,
            inverted: v,
            onSlideStart: p ? void 0 : ce,
            onSlideMove: p ? void 0 : ye,
            onSlideEnd: p ? void 0 : he,
            onHomeKeyDown: () => {
              p || (R.current = !0, we(i, 0, { commit: !0 }));
            },
            onEndKeyDown: () => {
              p || (R.current = !0, we(a, U.length - 1, { commit: !0 }));
            },
            onStepKeyDown: ({ event: ue, direction: ge }) => {
              if (!p) {
                R.current = !0;
                const K = B0.includes(ue.key) || ue.shiftKey && U0.includes(ue.key) ? 10 : 1, b = A.current, O = U[b], le = IP(O, {
                  min: i,
                  step: c,
                  direction: ge,
                  multiplier: K
                });
                we(le, b, { commit: !0 });
              }
            }
          }
        ) }) })
      }
    );
  }
);
H0.displayName = co;
var [W0, G0] = Gd(co, {
  startEdge: "left",
  endEdge: "right",
  size: "width",
  direction: 1
}), CP = C.forwardRef(
  (e, n) => {
    const {
      min: o,
      max: i,
      dir: a,
      inverted: c,
      onSlideStart: d,
      onSlideMove: p,
      onSlideEnd: y,
      onStepKeyDown: g,
      ...S
    } = e, [l, f] = C.useState(null), v = at(n, f), x = C.useRef(void 0), T = SP(a), k = T === "ltr", A = k && !c || !k && c;
    function R(P) {
      const D = x.current || l.getBoundingClientRect(), L = [0, D.width], Z = Kd(L, A ? [o, i] : [i, o]);
      return x.current = D, Z(P - D.left);
    }
    return /* @__PURE__ */ w.jsx(
      W0,
      {
        scope: e.__scopeSlider,
        startEdge: A ? "left" : "right",
        endEdge: A ? "right" : "left",
        direction: A ? 1 : -1,
        size: "width",
        children: /* @__PURE__ */ w.jsx(
          K0,
          {
            dir: T,
            "data-orientation": "horizontal",
            ...S,
            ref: v,
            style: {
              ...S.style,
              "--radix-slider-thumb-transform": "translateX(-50%)"
            },
            onSlideStart: (P) => {
              const D = R(P.clientX);
              d == null || d(D);
            },
            onSlideMove: (P) => {
              const D = R(P.clientX);
              p == null || p(D);
            },
            onSlideEnd: () => {
              x.current = void 0, y == null || y();
            },
            onStepKeyDown: (P) => {
              const L = $0[A ? "from-left" : "from-right"].includes(P.key);
              g == null || g({ event: P, direction: L ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), bP = C.forwardRef(
  (e, n) => {
    const {
      min: o,
      max: i,
      inverted: a,
      onSlideStart: c,
      onSlideMove: d,
      onSlideEnd: p,
      onStepKeyDown: y,
      ...g
    } = e, S = C.useRef(null), l = at(n, S), f = C.useRef(void 0), v = !a;
    function x(T) {
      const k = f.current || S.current.getBoundingClientRect(), A = [0, k.height], P = Kd(A, v ? [i, o] : [o, i]);
      return f.current = k, P(T - k.top);
    }
    return /* @__PURE__ */ w.jsx(
      W0,
      {
        scope: e.__scopeSlider,
        startEdge: v ? "bottom" : "top",
        endEdge: v ? "top" : "bottom",
        size: "height",
        direction: v ? 1 : -1,
        children: /* @__PURE__ */ w.jsx(
          K0,
          {
            "data-orientation": "vertical",
            ...g,
            ref: l,
            style: {
              ...g.style,
              "--radix-slider-thumb-transform": "translateY(50%)"
            },
            onSlideStart: (T) => {
              const k = x(T.clientY);
              c == null || c(k);
            },
            onSlideMove: (T) => {
              const k = x(T.clientY);
              d == null || d(k);
            },
            onSlideEnd: () => {
              f.current = void 0, p == null || p();
            },
            onStepKeyDown: (T) => {
              const A = $0[v ? "from-bottom" : "from-top"].includes(T.key);
              y == null || y({ event: T, direction: A ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), K0 = C.forwardRef(
  (e, n) => {
    const {
      __scopeSlider: o,
      onSlideStart: i,
      onSlideMove: a,
      onSlideEnd: c,
      onHomeKeyDown: d,
      onEndKeyDown: p,
      onStepKeyDown: y,
      ...g
    } = e, S = Ei(co, o);
    return /* @__PURE__ */ w.jsx(
      gt.span,
      {
        ...g,
        ref: n,
        onKeyDown: mt(e.onKeyDown, (l) => {
          l.key === "Home" ? (d(l), l.preventDefault()) : l.key === "End" ? (p(l), l.preventDefault()) : B0.concat(U0).includes(l.key) && (y(l), l.preventDefault());
        }),
        onPointerDown: mt(e.onPointerDown, (l) => {
          const f = l.target;
          f.setPointerCapture(l.pointerId), l.preventDefault(), S.thumbs.has(f) ? f.focus({ preventScroll: !0, focusVisible: !1 }) : i(l);
        }),
        onPointerMove: mt(e.onPointerMove, (l) => {
          l.target.hasPointerCapture(l.pointerId) && a(l);
        }),
        onPointerUp: mt(e.onPointerUp, (l) => {
          const f = l.target;
          f.hasPointerCapture(l.pointerId) && (f.releasePointerCapture(l.pointerId), c(l));
        })
      }
    );
  }
), Y0 = "SliderTrack", Q0 = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Ei(Y0, o);
    return /* @__PURE__ */ w.jsx(
      gt.span,
      {
        "data-disabled": a.disabled ? "" : void 0,
        "data-orientation": a.orientation,
        ...i,
        ref: n
      }
    );
  }
);
Q0.displayName = Y0;
var Zc = "SliderRange", X0 = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Ei(Zc, o), c = G0(Zc, o), d = C.useRef(null), p = at(n, d), y = a.values.length, g = a.values.map(
      (f) => iS(f, a.min, a.max)
    ), S = y > 1 ? Math.min(...g) : 0, l = 100 - Math.max(...g);
    return /* @__PURE__ */ w.jsx(
      gt.span,
      {
        "data-orientation": a.orientation,
        "data-disabled": a.disabled ? "" : void 0,
        ...i,
        ref: p,
        style: {
          ...e.style,
          [c.startEdge]: S + "%",
          [c.endEdge]: l + "%"
        }
      }
    );
  }
);
X0.displayName = Zc;
var Z0 = "SliderThumb", [EP, q0] = Gd(Z0), J0 = "SliderThumbProvider";
function eS(e) {
  const {
    __scopeSlider: n,
    name: o,
    children: i,
    // @ts-expect-error internal render prop
    internal_do_not_use_render: a
  } = e, c = Ei(J0, n), d = kP(n), [p, y] = C.useState(null), g = C.useMemo(
    () => p ? d().findIndex((k) => k.ref.current === p) : -1,
    [d, p]
  ), S = xP(p), l = p ? !!c.form || !!p.closest("form") : !0, f = c.values[g], v = o ?? (c.name ? c.name + (c.values.length > 1 ? "[]" : "") : void 0), x = f === void 0 ? 0 : iS(f, c.min, c.max);
  C.useEffect(() => {
    if (p)
      return c.thumbs.add(p), () => {
        c.thumbs.delete(p);
      };
  }, [p, c.thumbs]);
  const T = {
    value: f,
    name: v,
    form: c.form,
    isFormControl: l,
    index: g,
    thumb: p,
    onThumbChange: y,
    percent: x,
    size: S
  };
  return /* @__PURE__ */ w.jsx(EP, { scope: n, ...T, children: FP(a) ? a(T) : i });
}
eS.displayName = J0;
var la = "SliderThumbTrigger", tS = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Ei(la, o), c = G0(la, o), { index: d, value: p, percent: y, size: g, onThumbChange: S } = q0(
      la,
      o
    ), l = at(n, S), f = MP(d, a.values.length), v = g == null ? void 0 : g[c.size], x = v ? NP(v, y, c.direction) : 0;
    return /* @__PURE__ */ w.jsx(
      "span",
      {
        style: {
          transform: "var(--radix-slider-thumb-transform)",
          position: "absolute",
          [c.startEdge]: `calc(${y}% + ${x}px)`
        },
        children: /* @__PURE__ */ w.jsx(Xc.ItemSlot, { scope: o, children: /* @__PURE__ */ w.jsx(
          gt.span,
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
            onFocus: mt(e.onFocus, () => {
              a.valueIndexToChangeRef.current = d;
            })
          }
        ) })
      }
    );
  }
);
tS.displayName = la;
var nS = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, name: i, ...a } = e;
    return /* @__PURE__ */ w.jsx(
      eS,
      {
        __scopeSlider: o,
        name: i,
        internal_do_not_use_render: ({ index: c, isFormControl: d }) => /* @__PURE__ */ w.jsxs(w.Fragment, { children: [
          /* @__PURE__ */ w.jsx(
            tS,
            {
              ...a,
              ref: n,
              __scopeSlider: o
            }
          ),
          d ? /* @__PURE__ */ w.jsx(
            oS,
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
nS.displayName = Z0;
var rS = "SliderBubbleInput", oS = C.forwardRef(
  ({ __scopeSlider: e, ...n }, o) => {
    const { value: i, name: a, form: c } = q0(rS, e), d = C.useRef(null), p = at(d, o), y = wP(i);
    return C.useEffect(() => {
      const g = d.current;
      if (!g) return;
      const S = window.HTMLInputElement.prototype, f = Object.getOwnPropertyDescriptor(S, "value").set;
      if (y !== i && f) {
        const v = new Event("input", { bubbles: !0 });
        f.call(g, i), g.dispatchEvent(v);
      }
    }, [y, i]), /* @__PURE__ */ w.jsx(
      gt.input,
      {
        style: { display: "none" },
        name: a,
        form: c,
        ...n,
        ref: p,
        defaultValue: i
      }
    );
  }
);
oS.displayName = rS;
function PP(e = [], n, o) {
  const i = [...e];
  return i[o] = n, i.sort((a, c) => a - c);
}
function iS(e, n, o) {
  const c = 100 / (o - n) * (e - n);
  return z0(c, [0, 100]);
}
function MP(e, n) {
  return n > 2 ? `Value ${e + 1} of ${n}` : n === 2 ? ["Minimum", "Maximum"][e] : void 0;
}
function RP(e, n) {
  if (e.length === 1) return 0;
  const o = e.map((a) => Math.abs(a - n)), i = Math.min(...o);
  return o.indexOf(i);
}
function NP(e, n, o) {
  const i = e / 2, c = Kd([0, 50], [0, i]);
  return (i - c(n) * o) * o;
}
function DP(e) {
  return e.slice(0, -1).map((n, o) => e[o + 1] - n);
}
function jP(e, n) {
  if (n > 0) {
    const o = DP(e);
    return Math.min(...o) >= n;
  }
  return !0;
}
function Kd(e, n) {
  return (o) => {
    if (e[0] === e[1] || n[0] === n[1]) return n[0];
    const i = (n[1] - n[0]) / (e[1] - e[0]);
    return n[0] + i * (o - e[0]);
  };
}
function sS(e) {
  if (!Number.isFinite(e)) return 0;
  const n = e.toString();
  if (n.includes("e")) {
    const [i, a] = n.split("e"), c = i.split(".")[1] || "", d = Number(a);
    return Math.max(0, c.length - d);
  }
  const o = n.split(".")[1];
  return o ? o.length : 0;
}
function ua(e, n) {
  const o = Math.pow(10, n);
  return Math.round(e * o) / o;
}
function IP(e, {
  min: n,
  step: o,
  direction: i,
  multiplier: a
}) {
  const c = sS(o), d = (e - n) / o, p = Math.round(d), y = ua(p * o + n, c) === ua(e, c);
  let g;
  return y ? g = p + a * i : i > 0 ? g = Math.ceil(d) : g = Math.floor(d), ua(g * o + n, c);
}
function FP(e) {
  return typeof e == "function";
}
function Hy({ label: e, icon: n, value: o, onChange: i }) {
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
      H0,
      {
        className: "radix-slider-root",
        value: [o],
        min: 0,
        max: 100,
        step: 1,
        onValueChange: (a) => i(a[0]),
        children: [
          /* @__PURE__ */ w.jsx(Q0, { className: "radix-slider-track", children: /* @__PURE__ */ w.jsx(X0, { className: "radix-slider-range" }) }),
          /* @__PURE__ */ w.jsx(nS, { className: "radix-slider-thumb", "aria-label": e })
        ]
      }
    )
  ] });
}
function aS({ audioState: e }) {
  const n = $((f) => f.musicType), o = $((f) => f.ambientSound), i = $((f) => f.musicVolume), a = $((f) => f.ambientVolume), c = $((f) => f.audioPlaying), d = $((f) => f.setSound), p = $((f) => f.applyAudioPreset), y = $((f) => f.toggleAudio), g = Ia({ musicType: n, ambientSound: o }), S = Hv({ musicType: n, ambientSound: o }), l = g.ambientLayers.map((f) => f.title).filter(Boolean).join(" + ");
  return /* @__PURE__ */ w.jsxs("div", { className: "sound-panel", children: [
    /* @__PURE__ */ w.jsx("div", { className: "sound-preset-list", "aria-label": "Focus audio presets", children: Jr.map((f) => /* @__PURE__ */ w.jsxs(
      "button",
      {
        type: "button",
        className: (S == null ? void 0 : S.id) === f.id ? "is-active" : "",
        "aria-pressed": (S == null ? void 0 : S.id) === f.id,
        title: f.description,
        onClick: () => p(f.id),
        children: [
          /* @__PURE__ */ w.jsx("strong", { children: f.label }),
          /* @__PURE__ */ w.jsx("small", { children: f.description })
        ]
      },
      f.id
    )) }),
    /* @__PURE__ */ w.jsxs("label", { className: "focus-field", children: [
      "Music selector",
      /* @__PURE__ */ w.jsx("select", { value: n, onChange: (f) => d("musicType", f.target.value), children: gi.map((f) => /* @__PURE__ */ w.jsx("option", { value: f.label, children: f.label }, f.label)) })
    ] }),
    /* @__PURE__ */ w.jsx(
      Hy,
      {
        label: "Music volume",
        icon: /* @__PURE__ */ w.jsx(Fa, { size: 16, "aria-hidden": "true" }),
        value: i,
        onChange: (f) => d("musicVolume", f)
      }
    ),
    /* @__PURE__ */ w.jsxs("label", { className: "focus-field", children: [
      "Ambient sound selector",
      /* @__PURE__ */ w.jsx("select", { value: o, onChange: (f) => d("ambientSound", f.target.value), children: vi.map((f) => /* @__PURE__ */ w.jsx("option", { value: f.label, children: f.label }, f.label)) })
    ] }),
    /* @__PURE__ */ w.jsx(
      Hy,
      {
        label: "Ambient volume",
        icon: /* @__PURE__ */ w.jsx(l0, { size: 16, "aria-hidden": "true" }),
        value: a,
        onChange: (f) => d("ambientVolume", f)
      }
    ),
    /* @__PURE__ */ w.jsxs("div", { className: "audio-preview liquid-glass-lite", children: [
      /* @__PURE__ */ w.jsxs("div", { children: [
        /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Theme audio preview" }),
        /* @__PURE__ */ w.jsx("strong", { children: g.musicTrack.title }),
        /* @__PURE__ */ w.jsx("p", { children: l }),
        e != null && e.error ? /* @__PURE__ */ w.jsx("p", { className: "audio-error", children: e.error }) : null
      ] }),
      /* @__PURE__ */ w.jsx(Pe, { variant: c ? "primary" : "ghost", onClick: y, children: c ? "Pause audio" : "Play audio" })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "audio-links", children: [g.musicTrack, ...g.ambientLayers].filter((f) => f == null ? void 0 : f.pageUrl).map((f) => /* @__PURE__ */ w.jsx("a", { href: f.pageUrl, target: "_blank", rel: "noreferrer", children: f.title || f.label || "Audio source" }, f.pageUrl)) })
  ] });
}
const OP = [
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
];
function ni({ title: e, kicker: n, icon: o, children: i, onClose: a, className: c = "" }) {
  return /* @__PURE__ */ w.jsxs(rn.aside, { className: `focus-utility-panel liquid-glass ${c}`.trim(), initial: { opacity: 0, y: 12, x: 18 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: 10, x: 18 }, transition: ia, role: "dialog", "aria-label": e, children: [
    /* @__PURE__ */ w.jsxs("div", { className: "drawer-head", children: [
      /* @__PURE__ */ w.jsxs("div", { className: "utility-title", children: [
        /* @__PURE__ */ w.jsx("span", { className: "utility-title-icon", children: o }),
        /* @__PURE__ */ w.jsxs("div", { children: [
          /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: n }),
          /* @__PURE__ */ w.jsx("h2", { children: e })
        ] })
      ] }),
      /* @__PURE__ */ w.jsx(Pe, { "aria-label": `Close ${e}`, onClick: a, children: /* @__PURE__ */ w.jsx(u0, { size: 16, "aria-hidden": "true" }) })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "utility-panel-body", children: i })
  ] });
}
function Wy({ audioState: e, scene: n }) {
  const o = $((g) => g.audioChannels), i = $((g) => g.setSound), [a, c] = C.useState(!1), d = (g, S) => {
    c(!1), i(`audioChannel:${g}`, S);
  }, p = () => {
    const g = gi[Math.floor(Math.random() * gi.length)], S = vi[Math.floor(Math.random() * vi.length)];
    i("musicType", g.label), i("ambientSound", S.label), c(!0);
  }, y = () => {
    i("musicType", (n == null ? void 0 : n.musicType) || "Deep Focus"), i("ambientSound", (n == null ? void 0 : n.ambientSound) || "Nature"), c(!0);
  };
  return /* @__PURE__ */ w.jsxs("div", { className: "sound-mixer", children: [
    /* @__PURE__ */ w.jsxs("div", { className: "mixer-featured-row", children: [
      /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Music library" }),
      /* @__PURE__ */ w.jsxs(Pe, { onClick: p, children: [
        /* @__PURE__ */ w.jsx(MC, { size: 14, "aria-hidden": "true" }),
        " Random track"
      ] })
    ] }),
    /* @__PURE__ */ w.jsx(aS, { audioState: e, compact: !0 }),
    /* @__PURE__ */ w.jsxs("div", { className: "mixer-preset-row", children: [
      /* @__PURE__ */ w.jsxs("button", { type: "button", className: "mixer-preset-button", onClick: y, children: [
        "Apply scene mix ",
        /* @__PURE__ */ w.jsx("span", { children: "↗" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { onClick: () => c(!0), children: [
        a ? /* @__PURE__ */ w.jsx(TC, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(JC, { size: 14, "aria-hidden": "true" }),
        " ",
        a ? "Saved" : "Save current mix"
      ] })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "mixer-channel-grid", children: OP.map(([g, S]) => /* @__PURE__ */ w.jsxs("label", { className: "mixer-channel", children: [
      /* @__PURE__ */ w.jsxs("span", { children: [
        /* @__PURE__ */ w.jsx("i", { className: `mixer-channel-dot mixer-${g}` }),
        S
      ] }),
      /* @__PURE__ */ w.jsxs("strong", { children: [
        o[g],
        "%"
      ] }),
      /* @__PURE__ */ w.jsx("input", { type: "range", min: "0", max: "100", value: o[g], "aria-label": `${S} volume`, onChange: (l) => d(g, l.target.value) })
    ] }, g)) }),
    e != null && e.error ? /* @__PURE__ */ w.jsx("p", { className: "audio-error", children: e.error }) : null
  ] });
}
function LP() {
  const e = () => {
    var i, a, c;
    return ((c = (a = (i = globalThis.window) == null ? void 0 : i.SynapseAuth) == null ? void 0 : a.getStoredSession) == null ? void 0 : c.call(a)) || null;
  }, [n, o] = C.useState(e);
  return C.useEffect(() => {
    var d, p, y, g;
    let i = !0;
    const a = (S) => {
      var l;
      i && o(((l = S == null ? void 0 : S.detail) == null ? void 0 : l.session) || e());
    };
    (d = globalThis.window) == null || d.addEventListener("synapse-auth-changed", a);
    const c = (g = (y = (p = globalThis.window) == null ? void 0 : p.SynapseAuth) == null ? void 0 : y.syncSessionFromProvider) == null ? void 0 : g.call(y);
    return Promise.resolve(c).finally(() => a()), () => {
      var S;
      i = !1, (S = globalThis.window) == null || S.removeEventListener("synapse-auth-changed", a);
    };
  }, []), n;
}
function VP({ onWorkspace: e, session: n }) {
  return !!n ? /* @__PURE__ */ w.jsxs("div", { className: "utility-empty-state", children: [
    /* @__PURE__ */ w.jsx(Ta, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Your Focus Trail" }),
    /* @__PURE__ */ w.jsx("p", { children: "Recent sessions and progress remain available through Synapse history." }),
    /* @__PURE__ */ w.jsx(Pe, { variant: "primary", onClick: () => e == null ? void 0 : e("", "history"), children: "Open session history" })
  ] }) : /* @__PURE__ */ w.jsxs("div", { className: "utility-login-state", children: [
    /* @__PURE__ */ w.jsx(Ta, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Your rhythm, remembered" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Sign in to view your Focus Trail" }),
    /* @__PURE__ */ w.jsx("p", { children: "Track deep-work time, completed goals, and your study streak across devices." }),
    /* @__PURE__ */ w.jsx(Pe, { variant: "primary", onClick: () => e == null ? void 0 : e(), children: "Sign in with Synapse" }),
    /* @__PURE__ */ w.jsx("small", { children: "Your current session continues without an account." })
  ] });
}
function zP({ onWorkspace: e, session: n }) {
  return !!n ? /* @__PURE__ */ w.jsxs("div", { className: "utility-empty-state", children: [
    /* @__PURE__ */ w.jsx(Ca, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Companion Room" }),
    /* @__PURE__ */ w.jsx("p", { children: "Invite a study partner from your Synapse workspace to share this quiet room." }),
    /* @__PURE__ */ w.jsx(Pe, { variant: "primary", onClick: () => e == null ? void 0 : e("", "companion"), children: "Open Companion Room" })
  ] }) : /* @__PURE__ */ w.jsxs("div", { className: "utility-login-state", children: [
    /* @__PURE__ */ w.jsx(Ca, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Study alongside someone" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Sign in to use Companion Room" }),
    /* @__PURE__ */ w.jsx("p", { children: "Keep your own goal private while sharing the feeling of showing up together." }),
    /* @__PURE__ */ w.jsx(Pe, { variant: "primary", onClick: () => e == null ? void 0 : e(), children: "Go to sign in" }),
    /* @__PURE__ */ w.jsx("small", { children: "No companion data is created in Focus Room." })
  ] });
}
function BP({ audioState: e, utilityPanel: n, onClose: o, onWorkspace: i }) {
  const a = $((S) => S.activeDrawer), c = $((S) => S.closeDrawer), d = $((S) => S.selectedScene), p = $((S) => S.openDrawer), y = LP(), g = C.useMemo(() => gn.find((S) => S.id === d) || gn[0], [d]);
  return /* @__PURE__ */ w.jsxs(Da, { children: [
    n === "trail" ? /* @__PURE__ */ w.jsx(ni, { title: "Focus Trail", kicker: "Your progress", icon: /* @__PURE__ */ w.jsx(Ta, { size: 16 }), onClose: o, children: /* @__PURE__ */ w.jsx(VP, { onWorkspace: i, session: y }) }) : null,
    n === "companion" ? /* @__PURE__ */ w.jsx(ni, { title: "Companion Room", kicker: "Shared focus", icon: /* @__PURE__ */ w.jsx(Ca, { size: 16 }), onClose: o, children: /* @__PURE__ */ w.jsx(zP, { onWorkspace: i, session: y }) }) : null,
    n === "settings" ? /* @__PURE__ */ w.jsxs(ni, { title: "Room settings", kicker: "Customize your atmosphere", icon: /* @__PURE__ */ w.jsx(wi, { size: 16 }), onClose: o, className: "room-settings-utility", children: [
      /* @__PURE__ */ w.jsxs("div", { className: "settings-scene-summary", children: [
        /* @__PURE__ */ w.jsx("span", { className: "settings-scene-image", style: { backgroundImage: `url(${(g == null ? void 0 : g.image) || ""})` } }),
        /* @__PURE__ */ w.jsxs("div", { children: [
          /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Current scene" }),
          /* @__PURE__ */ w.jsx("strong", { children: g == null ? void 0 : g.name }),
          /* @__PURE__ */ w.jsx("small", { children: g == null ? void 0 : g.description })
        ] })
      ] }),
      /* @__PURE__ */ w.jsx(Pe, { onClick: () => {
        o == null || o(), p("scene");
      }, children: "Change scene" }),
      /* @__PURE__ */ w.jsx("h3", { className: "utility-section-title", children: "Sound mixer" }),
      /* @__PURE__ */ w.jsx(Wy, { audioState: e, scene: g })
    ] }) : null,
    !n && a === "scene" ? /* @__PURE__ */ w.jsx(ni, { title: "Choose scene", kicker: "Scene", icon: /* @__PURE__ */ w.jsx(wi, { size: 16 }), onClose: c, children: /* @__PURE__ */ w.jsx(Bd, {}) }) : null,
    !n && a === "music" ? /* @__PURE__ */ w.jsx(ni, { title: "Sound atmosphere", kicker: "Room audio", icon: /* @__PURE__ */ w.jsx(Fa, { size: 16 }), onClose: c, children: /* @__PURE__ */ w.jsx(Wy, { audioState: e, scene: g }) }) : null
  ] });
}
const UP = 2800;
function $P(e) {
  const n = String((e == null ? void 0 : e.tagName) || "").toLowerCase();
  return !!(e != null && e.isContentEditable || ["input", "textarea", "select"].includes(n));
}
function HP(e = {}) {
  if ($P(e.target)) return "";
  const n = String(e.key || "").toLowerCase();
  return n === " " || n === "spacebar" ? "toggle-timer" : n === "m" ? "toggle-audio" : n === "n" ? "note" : n === "t" ? "tasks" : n === "s" ? "scene" : n === "?" ? "shortcuts" : n === "escape" ? "escape" : "";
}
function WP(e) {
  return String((e == null ? void 0 : e.materialTitle) || "").trim() || "Focus Room";
}
function GP(e, n = 300) {
  const o = Math.max(0, Math.floor(Number(e) || 0)), i = Math.max(0, Math.floor(Number(n) || 0)), a = o + i;
  return {
    minutes: Math.floor(a / 60),
    seconds: a % 60
  };
}
function KP({ pinned: e = !1, popoverOpen: n = !1, focusWithin: o = !1 } = {}) {
  return !e && !n && !o;
}
function YP(e, n) {
  const o = Array.isArray(e) ? e : [], i = new Set(Array.isArray(n) ? n : []);
  return {
    completed: o.filter((a) => i.has(String((a == null ? void 0 : a.task) || ""))).length,
    total: o.length
  };
}
function Vt({ label: e, onClick: n, children: o, pressed: i, disabled: a = !1, primary: c = !1 }) {
  return /* @__PURE__ */ w.jsx(
    "button",
    {
      type: "button",
      className: `focus-mode-control ${c ? "is-primary" : ""}`.trim(),
      "aria-label": e,
      "aria-pressed": typeof i == "boolean" ? i : void 0,
      "data-tooltip": e,
      disabled: a,
      onClick: n,
      children: o
    }
  );
}
function QP({
  audioPlaying: e,
  canAddTime: n,
  isRunning: o,
  pinned: i,
  onAddFiveMinutes: a,
  onExit: c,
  onOpen: d,
  onSkip: p,
  onToggleAudio: y,
  onTogglePinned: g,
  onToggleTimer: S
}) {
  return /* @__PURE__ */ w.jsxs("div", { className: "focus-mode-controls", "aria-label": "Focus Mode controls", children: [
    /* @__PURE__ */ w.jsx(Vt, { label: o ? "Pause timer" : "Start timer", onClick: S, primary: !0, children: o ? /* @__PURE__ */ w.jsx(Aa, { size: 17, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(Ld, { size: 17, fill: "currentColor", "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(Vt, { label: "Add five minutes", onClick: a, disabled: !n, children: /* @__PURE__ */ w.jsx(gC, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(Vt, { label: "Skip to next phase", onClick: p, children: /* @__PURE__ */ w.jsx(Vd, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(Vt, { label: e ? "Mute room audio" : "Resume room audio", onClick: y, pressed: e, children: e ? /* @__PURE__ */ w.jsx(Fa, { size: 17, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(db, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(Vt, { label: "Quick Note", onClick: () => d("note"), children: /* @__PURE__ */ w.jsx(WC, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(Vt, { label: "Session tasks", onClick: () => d("tasks"), children: /* @__PURE__ */ w.jsx(ib, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(Vt, { label: "Change scene", onClick: () => d("scene"), children: /* @__PURE__ */ w.jsx(FC, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(Vt, { label: "Sound settings", onClick: () => d("audio"), children: /* @__PURE__ */ w.jsx(i0, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(Vt, { label: "Keyboard shortcuts", onClick: () => d("shortcuts"), children: /* @__PURE__ */ w.jsx(CC, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(Vt, { label: i ? "Unpin controls" : "Pin controls", onClick: g, pressed: i, children: i ? /* @__PURE__ */ w.jsx(zC, { size: 17, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(LC, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(Vt, { label: "Exit Focus Mode", onClick: c, children: /* @__PURE__ */ w.jsx(UC, { size: 17, "aria-hidden": "true" }) })
  ] });
}
function ri({ id: e, title: n, onClose: o, children: i }) {
  const a = `focus-mode-${e}-title`;
  return /* @__PURE__ */ w.jsxs("section", { className: "focus-mode-popover", role: "dialog", "aria-modal": "false", "aria-labelledby": a, children: [
    /* @__PURE__ */ w.jsxs("header", { className: "focus-mode-popover-head", children: [
      /* @__PURE__ */ w.jsx("h2", { id: a, children: n }),
      /* @__PURE__ */ w.jsx("button", { type: "button", onClick: o, "aria-label": `Close ${n}`, children: /* @__PURE__ */ w.jsx(u0, { size: 16, "aria-hidden": "true" }) })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "focus-mode-popover-body", children: i })
  ] });
}
const XP = [
  ["Space", "Start or pause timer"],
  ["M", "Mute or resume audio"],
  ["N", "Quick Note"],
  ["T", "Session tasks"],
  ["S", "Change scene"],
  ["?", "Keyboard shortcuts"],
  ["Esc", "Close panel or exit Focus Mode"]
];
function ZP({ audioState: e, onExit: n }) {
  const o = $((W) => W.selectedMaterial), i = $((W) => W.studyGoal), a = $((W) => W.studyPlan), c = $((W) => W.completedTasks), d = $((W) => W.workspaceNotes), p = $((W) => W.workspaceUpdatedAt), y = $((W) => W.elapsedSeconds), g = $((W) => W.pomodoroDuration), S = $((W) => W.timerDurationSeconds), l = $((W) => W.timerMode), f = $((W) => W.timerState), v = $((W) => W.currentSession), x = $((W) => W.audioPlaying), T = $((W) => W.startTimer), k = $((W) => W.pauseTimer), A = $((W) => W.skipTimer), R = $((W) => W.setSessionDuration), P = $((W) => W.toggleAudio), D = $((W) => W.setWorkspaceNotes), L = $((W) => W.toggleTask), [X, Z] = C.useState(!0), [U, G] = C.useState(!1), [Q, J] = C.useState(""), ce = C.useRef(null), ye = C.useRef(null), he = f === "running", we = l === "countup" ? 0 : Number(S) || (Number(g) || 0) * 60, ue = l === "countup" ? y : Math.max(0, we - y), ge = we ? Math.min(100, Math.max(0, y / we * 100)) : 0, V = C.useMemo(
    () => YP(a, c),
    [c, a]
  ), q = C.useCallback(() => {
    ye.current && (globalThis.clearTimeout(ye.current), ye.current = null);
  }, []), K = C.useCallback(() => {
    q(), ye.current = globalThis.setTimeout(() => {
      var pe, ve;
      const W = !!((ve = ce.current) != null && ve.contains((pe = globalThis.document) == null ? void 0 : pe.activeElement));
      KP({ pinned: U, popoverOpen: !!Q, focusWithin: W }) && Z(!1);
    }, UP);
  }, [Q, q, U]), b = C.useCallback(() => {
    Z(!0), K();
  }, [K]), O = C.useCallback(() => {
    he ? k() : T();
  }, [he, k, T]), le = C.useCallback(() => {
    if (l === "countup") return;
    const W = GP(we);
    R(W.minutes, W.seconds);
  }, [R, l, we]), fe = C.useCallback((W) => {
    J(W), Z(!0), q();
  }, [q]), me = C.useCallback(() => {
    J(""), K();
  }, [K]);
  C.useEffect(() => {
    var pe, ve, De;
    const W = () => b();
    return (pe = globalThis.addEventListener) == null || pe.call(globalThis, "pointermove", W, { passive: !0 }), (ve = globalThis.addEventListener) == null || ve.call(globalThis, "pointerdown", W, { passive: !0 }), (De = globalThis.addEventListener) == null || De.call(globalThis, "focusin", W), K(), () => {
      var Kn, fo, Yn;
      q(), (Kn = globalThis.removeEventListener) == null || Kn.call(globalThis, "pointermove", W), (fo = globalThis.removeEventListener) == null || fo.call(globalThis, "pointerdown", W), (Yn = globalThis.removeEventListener) == null || Yn.call(globalThis, "focusin", W);
    };
  }, [q, b, K]), C.useEffect(() => {
    var pe;
    const W = (ve) => {
      const De = HP(ve);
      De && (ve.preventDefault(), b(), De === "toggle-timer" && O(), De === "toggle-audio" && P(), ["note", "tasks", "scene", "shortcuts"].includes(De) && fe(De), De === "escape" && (Q ? me() : n == null || n()));
    };
    return (pe = globalThis.addEventListener) == null || pe.call(globalThis, "keydown", W), () => {
      var ve;
      return (ve = globalThis.removeEventListener) == null ? void 0 : ve.call(globalThis, "keydown", W);
    };
  }, [Q, me, n, fe, b, P, O]), C.useEffect(() => {
    U || Q ? (q(), Z(!0)) : K();
  }, [Q, q, U, K]);
  const xe = Q === "note" ? /* @__PURE__ */ w.jsxs(ri, { id: "note", title: "Quick Note", onClose: me, children: [
    /* @__PURE__ */ w.jsx(
      "textarea",
      {
        className: "focus-mode-note",
        value: d,
        onChange: (W) => D(W.target.value),
        placeholder: "Capture a question, connection, or next step…",
        autoFocus: !0
      }
    ),
    /* @__PURE__ */ w.jsx("small", { children: p ? "Autosaved just now" : "Autosave on" })
  ] }) : Q === "tasks" ? /* @__PURE__ */ w.jsx(ri, { id: "tasks", title: "Session tasks", onClose: me, children: a.length ? /* @__PURE__ */ w.jsx("div", { className: "focus-mode-task-list", children: a.map((W, pe) => {
    const ve = c.includes(W.task);
    return /* @__PURE__ */ w.jsxs("label", { children: [
      /* @__PURE__ */ w.jsx("input", { type: "checkbox", checked: ve, onChange: () => L(pe) }),
      /* @__PURE__ */ w.jsxs("span", { children: [
        /* @__PURE__ */ w.jsx("strong", { children: W.task }),
        /* @__PURE__ */ w.jsxs("small", { children: [
          W.minutes,
          " min"
        ] })
      ] })
    ] }, `${W.task}-${pe}`);
  }) }) : /* @__PURE__ */ w.jsx("p", { className: "focus-mode-empty", children: "Add a study topic from the workspace to receive a session task plan." }) }) : Q === "scene" ? /* @__PURE__ */ w.jsx(ri, { id: "scene", title: "Change scene", onClose: me, children: /* @__PURE__ */ w.jsx(Bd, {}) }) : Q === "audio" ? /* @__PURE__ */ w.jsx(ri, { id: "audio", title: "Sound settings", onClose: me, children: /* @__PURE__ */ w.jsx(aS, { audioState: e }) }) : Q === "shortcuts" ? /* @__PURE__ */ w.jsx(ri, { id: "shortcuts", title: "Keyboard shortcuts", onClose: me, children: /* @__PURE__ */ w.jsx("dl", { className: "focus-mode-shortcuts", children: XP.map(([W, pe]) => /* @__PURE__ */ w.jsxs("div", { children: [
    /* @__PURE__ */ w.jsx("dt", { children: /* @__PURE__ */ w.jsx("kbd", { children: W }) }),
    /* @__PURE__ */ w.jsx("dd", { children: pe })
  ] }, W)) }) }) : null;
  return /* @__PURE__ */ w.jsxs(
    "aside",
    {
      ref: ce,
      className: `focus-mode-hud liquid-glass ${X ? "has-controls" : "is-quiet"} ${U ? "is-pinned" : ""}`.trim(),
      "aria-label": "Enhanced Focus Mode",
      onPointerEnter: b,
      onFocusCapture: b,
      children: [
        /* @__PURE__ */ w.jsxs("div", { className: "focus-mode-primary", children: [
          /* @__PURE__ */ w.jsxs("div", { className: "focus-mode-session-line", children: [
            /* @__PURE__ */ w.jsxs("span", { children: [
              "POMODORO #",
              (v == null ? void 0 : v.pomodoroNumber) || 1
            ] }),
            /* @__PURE__ */ w.jsxs("span", { className: `focus-mode-state ${he ? "is-running" : ""}`, children: [
              /* @__PURE__ */ w.jsx("i", {}),
              he ? "In focus" : f === "paused" ? "Paused" : "Ready"
            ] })
          ] }),
          /* @__PURE__ */ w.jsx("p", { className: "focus-mode-topic", children: WP(o) }),
          /* @__PURE__ */ w.jsx("strong", { className: "focus-mode-clock", children: ci(ue) }),
          /* @__PURE__ */ w.jsx("div", { className: "focus-mode-progress", "aria-label": `${Math.round(ge)}% complete`, children: /* @__PURE__ */ w.jsx("span", { style: { width: `${ge}%` } }) }),
          /* @__PURE__ */ w.jsx("p", { className: "focus-mode-goal", children: i || "A quiet block for meaningful progress" }),
          /* @__PURE__ */ w.jsx("small", { children: V.total ? `${V.completed}/${V.total} tasks` : l === "countup" ? "Count-up session" : `${g} min session` })
        ] }),
        /* @__PURE__ */ w.jsx("div", { className: "focus-mode-reveal", "aria-hidden": !X, children: /* @__PURE__ */ w.jsx(
          QP,
          {
            audioPlaying: x,
            canAddTime: l !== "countup",
            isRunning: he,
            pinned: U,
            onAddFiveMinutes: le,
            onExit: n,
            onOpen: fe,
            onSkip: A,
            onToggleAudio: P,
            onTogglePinned: () => G((W) => !W),
            onToggleTimer: O
          }
        ) }),
        xe,
        /* @__PURE__ */ w.jsx("span", { className: "sr-only", children: "Move the pointer, tap, or press a shortcut to reveal controls." })
      ]
    }
  );
}
var uc = {};
/*!
 *  howler.js v2.2.4
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */
var Gy;
function qP() {
  return Gy || (Gy = 1, (function(e) {
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
          if (l = parseFloat(l), f.ctx || S(), typeof l < "u" && l >= 0 && l <= 1) {
            if (f._volume = l, f._muted)
              return f;
            f.usingWebAudio && f.masterGain.gain.setValueAtTime(l, o.ctx.currentTime);
            for (var v = 0; v < f._howls.length; v++)
              if (!f._howls[v]._webAudio)
                for (var x = f._howls[v]._getSoundIds(), T = 0; T < x.length; T++) {
                  var k = f._howls[v]._soundById(x[T]);
                  k && k._node && (k._node.volume = k._volume * l);
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
          f.ctx || S(), f._muted = l, f.usingWebAudio && f.masterGain.gain.setValueAtTime(l ? 0 : f._volume, o.ctx.currentTime);
          for (var v = 0; v < f._howls.length; v++)
            if (!f._howls[v]._webAudio)
              for (var x = f._howls[v]._getSoundIds(), T = 0; T < x.length; T++) {
                var k = f._howls[v]._soundById(x[T]);
                k && k._node && (k._node.muted = l ? !0 : k._muted);
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
          var v = f.canPlayType("audio/mpeg;").replace(/^no$/, ""), x = l._navigator ? l._navigator.userAgent : "", T = x.match(/OPR\/(\d+)/g), k = T && parseInt(T[0].split("/")[1], 10) < 33, A = x.indexOf("Safari") !== -1 && x.indexOf("Chrome") === -1, R = x.match(/Version\/(.*?) /), P = A && R && parseInt(R[1], 10) < 15;
          return l._codecs = {
            mp3: !!(!k && (v || f.canPlayType("audio/mp3;").replace(/^no$/, ""))),
            mpeg: !!v,
            opus: !!f.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, ""),
            ogg: !!f.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ""),
            oga: !!f.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ""),
            wav: !!(f.canPlayType('audio/wav; codecs="1"') || f.canPlayType("audio/wav")).replace(/^no$/, ""),
            aac: !!f.canPlayType("audio/aac;").replace(/^no$/, ""),
            caf: !!f.canPlayType("audio/x-caf;").replace(/^no$/, ""),
            m4a: !!(f.canPlayType("audio/x-m4a;") || f.canPlayType("audio/m4a;") || f.canPlayType("audio/aac;")).replace(/^no$/, ""),
            m4b: !!(f.canPlayType("audio/x-m4b;") || f.canPlayType("audio/m4b;") || f.canPlayType("audio/aac;")).replace(/^no$/, ""),
            mp4: !!(f.canPlayType("audio/x-mp4;") || f.canPlayType("audio/mp4;") || f.canPlayType("audio/aac;")).replace(/^no$/, ""),
            weba: !!(!P && f.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, "")),
            webm: !!(!P && f.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, "")),
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
            var f = function(v) {
              for (; l._html5AudioPool.length < l.html5PoolSize; )
                try {
                  var x = new Audio();
                  x._unlocked = !0, l._releaseHtml5Audio(x);
                } catch {
                  l.noAudio = !0;
                  break;
                }
              for (var T = 0; T < l._howls.length; T++)
                if (!l._howls[T]._webAudio)
                  for (var k = l._howls[T]._getSoundIds(), A = 0; A < k.length; A++) {
                    var R = l._howls[T]._soundById(k[A]);
                    R && R._node && !R._node._unlocked && (R._node._unlocked = !0, R._node.load());
                  }
              l._autoResume();
              var P = l.ctx.createBufferSource();
              P.buffer = l._scratchBuffer, P.connect(l.ctx.destination), typeof P.start > "u" ? P.noteOn(0) : P.start(0), typeof l.ctx.resume == "function" && l.ctx.resume(), P.onended = function() {
                P.disconnect(0), l._audioUnlocked = !0, document.removeEventListener("touchstart", f, !0), document.removeEventListener("touchend", f, !0), document.removeEventListener("click", f, !0), document.removeEventListener("keydown", f, !0);
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
                for (var v = 0; v < l._howls[f]._sounds.length; v++)
                  if (!l._howls[f]._sounds[v]._paused)
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
          return o.ctx || S(), f._autoplay = l.autoplay || !1, f._format = typeof l.format != "string" ? l.format : [l.format], f._html5 = l.html5 || !1, f._muted = l.mute || !1, f._loop = l.loop || !1, f._pool = l.pool || 5, f._preload = typeof l.preload == "boolean" || l.preload === "metadata" ? l.preload : !0, f._rate = l.rate || 1, f._sprite = l.sprite || {}, f._src = typeof l.src != "string" ? l.src : [l.src], f._volume = l.volume !== void 0 ? l.volume : 1, f._xhr = {
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
          for (var v = 0; v < l._src.length; v++) {
            var x, T;
            if (l._format && l._format[v])
              x = l._format[v];
            else {
              if (T = l._src[v], typeof T != "string") {
                l._emit("loaderror", null, "Non-string found in selected audio sources - ignoring.");
                continue;
              }
              x = /^data:audio\/([^;,]+);/i.exec(T), x || (x = /\.([^.]+)$/.exec(T.split("?", 1)[0])), x && (x = x[1].toLowerCase());
            }
            if (x || console.warn('No file extension was found. Consider using the "format" property or specify an extension.'), x && o.codecs(x)) {
              f = l._src[v];
              break;
            }
          }
          if (!f) {
            l._emit("loaderror", null, "No codec support for selected audio sources.");
            return;
          }
          return l._src = f, l._state = "loading", window.location.protocol === "https:" && f.slice(0, 5) === "http:" && (l._html5 = !0, l._webAudio = !1), new a(l), l._webAudio && d(l), l;
        },
        /**
         * Play a sound or resume previous playback.
         * @param  {String/Number} sprite   Sprite name for sprite playback or sound id to continue previous.
         * @param  {Boolean} internal Internal Use: true prevents event firing.
         * @return {Number}          Sound ID.
         */
        play: function(l, f) {
          var v = this, x = null;
          if (typeof l == "number")
            x = l, l = null;
          else {
            if (typeof l == "string" && v._state === "loaded" && !v._sprite[l])
              return null;
            if (typeof l > "u" && (l = "__default", !v._playLock)) {
              for (var T = 0, k = 0; k < v._sounds.length; k++)
                v._sounds[k]._paused && !v._sounds[k]._ended && (T++, x = v._sounds[k]._id);
              T === 1 ? l = null : x = null;
            }
          }
          var A = x ? v._soundById(x) : v._inactiveSound();
          if (!A)
            return null;
          if (x && !l && (l = A._sprite || "__default"), v._state !== "loaded") {
            A._sprite = l, A._ended = !1;
            var R = A._id;
            return v._queue.push({
              event: "play",
              action: function() {
                v.play(R);
              }
            }), R;
          }
          if (x && !A._paused)
            return f || v._loadQueue("play"), A._id;
          v._webAudio && o._autoResume();
          var P = Math.max(0, A._seek > 0 ? A._seek : v._sprite[l][0] / 1e3), D = Math.max(0, (v._sprite[l][0] + v._sprite[l][1]) / 1e3 - P), L = D * 1e3 / Math.abs(A._rate), X = v._sprite[l][0] / 1e3, Z = (v._sprite[l][0] + v._sprite[l][1]) / 1e3;
          A._sprite = l, A._ended = !1;
          var U = function() {
            A._paused = !1, A._seek = P, A._start = X, A._stop = Z, A._loop = !!(A._loop || v._sprite[l][2]);
          };
          if (P >= Z) {
            v._ended(A);
            return;
          }
          var G = A._node;
          if (v._webAudio) {
            var Q = function() {
              v._playLock = !1, U(), v._refreshBuffer(A);
              var he = A._muted || v._muted ? 0 : A._volume;
              G.gain.setValueAtTime(he, o.ctx.currentTime), A._playStart = o.ctx.currentTime, typeof G.bufferSource.start > "u" ? A._loop ? G.bufferSource.noteGrainOn(0, P, 86400) : G.bufferSource.noteGrainOn(0, P, D) : A._loop ? G.bufferSource.start(0, P, 86400) : G.bufferSource.start(0, P, D), L !== 1 / 0 && (v._endTimers[A._id] = setTimeout(v._ended.bind(v, A), L)), f || setTimeout(function() {
                v._emit("play", A._id), v._loadQueue();
              }, 0);
            };
            o.state === "running" && o.ctx.state !== "interrupted" ? Q() : (v._playLock = !0, v.once("resume", Q), v._clearTimer(A._id));
          } else {
            var J = function() {
              G.currentTime = P, G.muted = A._muted || v._muted || o._muted || G.muted, G.volume = A._volume * o.volume(), G.playbackRate = A._rate;
              try {
                var he = G.play();
                if (he && typeof Promise < "u" && (he instanceof Promise || typeof he.then == "function") ? (v._playLock = !0, U(), he.then(function() {
                  v._playLock = !1, G._unlocked = !0, f ? v._loadQueue() : v._emit("play", A._id);
                }).catch(function() {
                  v._playLock = !1, v._emit("playerror", A._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction."), A._ended = !0, A._paused = !0;
                })) : f || (v._playLock = !1, U(), v._emit("play", A._id)), G.playbackRate = A._rate, G.paused) {
                  v._emit("playerror", A._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.");
                  return;
                }
                l !== "__default" || A._loop ? v._endTimers[A._id] = setTimeout(v._ended.bind(v, A), L) : (v._endTimers[A._id] = function() {
                  v._ended(A), G.removeEventListener("ended", v._endTimers[A._id], !1);
                }, G.addEventListener("ended", v._endTimers[A._id], !1));
              } catch (we) {
                v._emit("playerror", A._id, we);
              }
            };
            G.src === "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA" && (G.src = v._src, G.load());
            var ce = window && window.ejecta || !G.readyState && o._navigator.isCocoonJS;
            if (G.readyState >= 3 || ce)
              J();
            else {
              v._playLock = !0, v._state = "loading";
              var ye = function() {
                v._state = "loaded", J(), G.removeEventListener(o._canPlayEvent, ye, !1);
              };
              G.addEventListener(o._canPlayEvent, ye, !1), v._clearTimer(A._id);
            }
          }
          return A._id;
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
          for (var v = f._getSoundIds(l), x = 0; x < v.length; x++) {
            f._clearTimer(v[x]);
            var T = f._soundById(v[x]);
            if (T && !T._paused && (T._seek = f.seek(v[x]), T._rateSeek = 0, T._paused = !0, f._stopFade(v[x]), T._node))
              if (f._webAudio) {
                if (!T._node.bufferSource)
                  continue;
                typeof T._node.bufferSource.stop > "u" ? T._node.bufferSource.noteOff(0) : T._node.bufferSource.stop(0), f._cleanBuffer(T._node);
              } else (!isNaN(T._node.duration) || T._node.duration === 1 / 0) && T._node.pause();
            arguments[1] || f._emit("pause", T ? T._id : null);
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
          var v = this;
          if (v._state !== "loaded" || v._playLock)
            return v._queue.push({
              event: "stop",
              action: function() {
                v.stop(l);
              }
            }), v;
          for (var x = v._getSoundIds(l), T = 0; T < x.length; T++) {
            v._clearTimer(x[T]);
            var k = v._soundById(x[T]);
            k && (k._seek = k._start || 0, k._rateSeek = 0, k._paused = !0, k._ended = !0, v._stopFade(x[T]), k._node && (v._webAudio ? k._node.bufferSource && (typeof k._node.bufferSource.stop > "u" ? k._node.bufferSource.noteOff(0) : k._node.bufferSource.stop(0), v._cleanBuffer(k._node)) : (!isNaN(k._node.duration) || k._node.duration === 1 / 0) && (k._node.currentTime = k._start || 0, k._node.pause(), k._node.duration === 1 / 0 && v._clearSound(k._node))), f || v._emit("stop", k._id));
          }
          return v;
        },
        /**
         * Mute/unmute a single sound or all sounds in this Howl group.
         * @param  {Boolean} muted Set to true to mute and false to unmute.
         * @param  {Number} id    The sound ID to update (omit to mute/unmute all).
         * @return {Howl}
         */
        mute: function(l, f) {
          var v = this;
          if (v._state !== "loaded" || v._playLock)
            return v._queue.push({
              event: "mute",
              action: function() {
                v.mute(l, f);
              }
            }), v;
          if (typeof f > "u")
            if (typeof l == "boolean")
              v._muted = l;
            else
              return v._muted;
          for (var x = v._getSoundIds(f), T = 0; T < x.length; T++) {
            var k = v._soundById(x[T]);
            k && (k._muted = l, k._interval && v._stopFade(k._id), v._webAudio && k._node ? k._node.gain.setValueAtTime(l ? 0 : k._volume, o.ctx.currentTime) : k._node && (k._node.muted = o._muted ? !0 : l), v._emit("mute", k._id));
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
          var l = this, f = arguments, v, x;
          if (f.length === 0)
            return l._volume;
          if (f.length === 1 || f.length === 2 && typeof f[1] > "u") {
            var T = l._getSoundIds(), k = T.indexOf(f[0]);
            k >= 0 ? x = parseInt(f[0], 10) : v = parseFloat(f[0]);
          } else f.length >= 2 && (v = parseFloat(f[0]), x = parseInt(f[1], 10));
          var A;
          if (typeof v < "u" && v >= 0 && v <= 1) {
            if (l._state !== "loaded" || l._playLock)
              return l._queue.push({
                event: "volume",
                action: function() {
                  l.volume.apply(l, f);
                }
              }), l;
            typeof x > "u" && (l._volume = v), x = l._getSoundIds(x);
            for (var R = 0; R < x.length; R++)
              A = l._soundById(x[R]), A && (A._volume = v, f[2] || l._stopFade(x[R]), l._webAudio && A._node && !A._muted ? A._node.gain.setValueAtTime(v, o.ctx.currentTime) : A._node && !A._muted && (A._node.volume = v * o.volume()), l._emit("volume", A._id));
          } else
            return A = x ? l._soundById(x) : l._sounds[0], A ? A._volume : 0;
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
        fade: function(l, f, v, x) {
          var T = this;
          if (T._state !== "loaded" || T._playLock)
            return T._queue.push({
              event: "fade",
              action: function() {
                T.fade(l, f, v, x);
              }
            }), T;
          l = Math.min(Math.max(0, parseFloat(l)), 1), f = Math.min(Math.max(0, parseFloat(f)), 1), v = parseFloat(v), T.volume(l, x);
          for (var k = T._getSoundIds(x), A = 0; A < k.length; A++) {
            var R = T._soundById(k[A]);
            if (R) {
              if (x || T._stopFade(k[A]), T._webAudio && !R._muted) {
                var P = o.ctx.currentTime, D = P + v / 1e3;
                R._volume = l, R._node.gain.setValueAtTime(l, P), R._node.gain.linearRampToValueAtTime(f, D);
              }
              T._startFadeInterval(R, l, f, v, k[A], typeof x > "u");
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
        _startFadeInterval: function(l, f, v, x, T, k) {
          var A = this, R = f, P = v - f, D = Math.abs(P / 0.01), L = Math.max(4, D > 0 ? x / D : x), X = Date.now();
          l._fadeTo = v, l._interval = setInterval(function() {
            var Z = (Date.now() - X) / x;
            X = Date.now(), R += P * Z, R = Math.round(R * 100) / 100, P < 0 ? R = Math.max(v, R) : R = Math.min(v, R), A._webAudio ? l._volume = R : A.volume(R, l._id, !0), k && (A._volume = R), (v < f && R <= v || v > f && R >= v) && (clearInterval(l._interval), l._interval = null, l._fadeTo = null, A.volume(v, l._id), A._emit("fade", l._id));
          }, L);
        },
        /**
         * Internal method that stops the currently playing fade when
         * a new fade starts, volume is changed or the sound is stopped.
         * @param  {Number} id The sound id.
         * @return {Howl}
         */
        _stopFade: function(l) {
          var f = this, v = f._soundById(l);
          return v && v._interval && (f._webAudio && v._node.gain.cancelScheduledValues(o.ctx.currentTime), clearInterval(v._interval), v._interval = null, f.volume(v._fadeTo, l), v._fadeTo = null, f._emit("fade", l)), f;
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
          var l = this, f = arguments, v, x, T;
          if (f.length === 0)
            return l._loop;
          if (f.length === 1)
            if (typeof f[0] == "boolean")
              v = f[0], l._loop = v;
            else
              return T = l._soundById(parseInt(f[0], 10)), T ? T._loop : !1;
          else f.length === 2 && (v = f[0], x = parseInt(f[1], 10));
          for (var k = l._getSoundIds(x), A = 0; A < k.length; A++)
            T = l._soundById(k[A]), T && (T._loop = v, l._webAudio && T._node && T._node.bufferSource && (T._node.bufferSource.loop = v, v && (T._node.bufferSource.loopStart = T._start || 0, T._node.bufferSource.loopEnd = T._stop, l.playing(k[A]) && (l.pause(k[A], !0), l.play(k[A], !0)))));
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
          var l = this, f = arguments, v, x;
          if (f.length === 0)
            x = l._sounds[0]._id;
          else if (f.length === 1) {
            var T = l._getSoundIds(), k = T.indexOf(f[0]);
            k >= 0 ? x = parseInt(f[0], 10) : v = parseFloat(f[0]);
          } else f.length === 2 && (v = parseFloat(f[0]), x = parseInt(f[1], 10));
          var A;
          if (typeof v == "number") {
            if (l._state !== "loaded" || l._playLock)
              return l._queue.push({
                event: "rate",
                action: function() {
                  l.rate.apply(l, f);
                }
              }), l;
            typeof x > "u" && (l._rate = v), x = l._getSoundIds(x);
            for (var R = 0; R < x.length; R++)
              if (A = l._soundById(x[R]), A) {
                l.playing(x[R]) && (A._rateSeek = l.seek(x[R]), A._playStart = l._webAudio ? o.ctx.currentTime : A._playStart), A._rate = v, l._webAudio && A._node && A._node.bufferSource ? A._node.bufferSource.playbackRate.setValueAtTime(v, o.ctx.currentTime) : A._node && (A._node.playbackRate = v);
                var P = l.seek(x[R]), D = (l._sprite[A._sprite][0] + l._sprite[A._sprite][1]) / 1e3 - P, L = D * 1e3 / Math.abs(A._rate);
                (l._endTimers[x[R]] || !A._paused) && (l._clearTimer(x[R]), l._endTimers[x[R]] = setTimeout(l._ended.bind(l, A), L)), l._emit("rate", A._id);
              }
          } else
            return A = l._soundById(x), A ? A._rate : l._rate;
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
          var l = this, f = arguments, v, x;
          if (f.length === 0)
            l._sounds.length && (x = l._sounds[0]._id);
          else if (f.length === 1) {
            var T = l._getSoundIds(), k = T.indexOf(f[0]);
            k >= 0 ? x = parseInt(f[0], 10) : l._sounds.length && (x = l._sounds[0]._id, v = parseFloat(f[0]));
          } else f.length === 2 && (v = parseFloat(f[0]), x = parseInt(f[1], 10));
          if (typeof x > "u")
            return 0;
          if (typeof v == "number" && (l._state !== "loaded" || l._playLock))
            return l._queue.push({
              event: "seek",
              action: function() {
                l.seek.apply(l, f);
              }
            }), l;
          var A = l._soundById(x);
          if (A)
            if (typeof v == "number" && v >= 0) {
              var R = l.playing(x);
              R && l.pause(x, !0), A._seek = v, A._ended = !1, l._clearTimer(x), !l._webAudio && A._node && !isNaN(A._node.duration) && (A._node.currentTime = v);
              var P = function() {
                R && l.play(x, !0), l._emit("seek", x);
              };
              if (R && !l._webAudio) {
                var D = function() {
                  l._playLock ? setTimeout(D, 0) : P();
                };
                setTimeout(D, 0);
              } else
                P();
            } else if (l._webAudio) {
              var L = l.playing(x) ? o.ctx.currentTime - A._playStart : 0, X = A._rateSeek ? A._rateSeek - A._seek : 0;
              return A._seek + (X + L * Math.abs(A._rate));
            } else
              return A._node.currentTime;
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
            var v = f._soundById(l);
            return v ? !v._paused : !1;
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
          var f = this, v = f._duration, x = f._soundById(l);
          return x && (v = f._sprite[x._sprite][1] / 1e3), v;
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
          for (var l = this, f = l._sounds, v = 0; v < f.length; v++)
            f[v]._paused || l.stop(f[v]._id), l._webAudio || (l._clearSound(f[v]._node), f[v]._node.removeEventListener("error", f[v]._errorFn, !1), f[v]._node.removeEventListener(o._canPlayEvent, f[v]._loadFn, !1), f[v]._node.removeEventListener("ended", f[v]._endFn, !1), o._releaseHtml5Audio(f[v]._node)), delete f[v]._node, l._clearTimer(f[v]._id);
          var x = o._howls.indexOf(l);
          x >= 0 && o._howls.splice(x, 1);
          var T = !0;
          for (v = 0; v < o._howls.length; v++)
            if (o._howls[v]._src === l._src || l._src.indexOf(o._howls[v]._src) >= 0) {
              T = !1;
              break;
            }
          return c && T && delete c[l._src], o.noAudio = !1, l._state = "unloaded", l._sounds = [], l = null, null;
        },
        /**
         * Listen to a custom event.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to call.
         * @param  {Number}   id    (optional) Only listen to events for this sound.
         * @param  {Number}   once  (INTERNAL) Marks event to fire only once.
         * @return {Howl}
         */
        on: function(l, f, v, x) {
          var T = this, k = T["_on" + l];
          return typeof f == "function" && k.push(x ? { id: v, fn: f, once: x } : { id: v, fn: f }), T;
        },
        /**
         * Remove a custom event. Call without parameters to remove all events.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to remove. Leave empty to remove all.
         * @param  {Number}   id    (optional) Only remove events for this sound.
         * @return {Howl}
         */
        off: function(l, f, v) {
          var x = this, T = x["_on" + l], k = 0;
          if (typeof f == "number" && (v = f, f = null), f || v)
            for (k = 0; k < T.length; k++) {
              var A = v === T[k].id;
              if (f === T[k].fn && A || !f && A) {
                T.splice(k, 1);
                break;
              }
            }
          else if (l)
            x["_on" + l] = [];
          else {
            var R = Object.keys(x);
            for (k = 0; k < R.length; k++)
              R[k].indexOf("_on") === 0 && Array.isArray(x[R[k]]) && (x[R[k]] = []);
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
        once: function(l, f, v) {
          var x = this;
          return x.on(l, f, v, 1), x;
        },
        /**
         * Emit all events of a specific type and pass the sound id.
         * @param  {String} event Event name.
         * @param  {Number} id    Sound ID.
         * @param  {Number} msg   Message to go with event.
         * @return {Howl}
         */
        _emit: function(l, f, v) {
          for (var x = this, T = x["_on" + l], k = T.length - 1; k >= 0; k--)
            (!T[k].id || T[k].id === f || l === "load") && (setTimeout((function(A) {
              A.call(this, f, v);
            }).bind(x, T[k].fn), 0), T[k].once && x.off(l, T[k].fn, T[k].id));
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
            var v = f._queue[0];
            v.event === l && (f._queue.shift(), f._loadQueue()), l || v.action();
          }
          return f;
        },
        /**
         * Fired when playback ends at the end of the duration.
         * @param  {Sound} sound The sound object to work with.
         * @return {Howl}
         */
        _ended: function(l) {
          var f = this, v = l._sprite;
          if (!f._webAudio && l._node && !l._node.paused && !l._node.ended && l._node.currentTime < l._stop)
            return setTimeout(f._ended.bind(f, l), 100), f;
          var x = !!(l._loop || f._sprite[v][2]);
          if (f._emit("end", l._id), !f._webAudio && x && f.stop(l._id, !0).play(l._id), f._webAudio && x) {
            f._emit("play", l._id), l._seek = l._start || 0, l._rateSeek = 0, l._playStart = o.ctx.currentTime;
            var T = (l._stop - l._start) * 1e3 / Math.abs(l._rate);
            f._endTimers[l._id] = setTimeout(f._ended.bind(f, l), T);
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
              var v = f._soundById(l);
              v && v._node && v._node.removeEventListener("ended", f._endTimers[l], !1);
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
          for (var f = this, v = 0; v < f._sounds.length; v++)
            if (l === f._sounds[v]._id)
              return f._sounds[v];
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
          var l = this, f = l._pool, v = 0, x = 0;
          if (!(l._sounds.length < f)) {
            for (x = 0; x < l._sounds.length; x++)
              l._sounds[x]._ended && v++;
            for (x = l._sounds.length - 1; x >= 0; x--) {
              if (v <= f)
                return;
              l._sounds[x]._ended && (l._webAudio && l._sounds[x]._node && l._sounds[x]._node.disconnect(0), l._sounds.splice(x, 1), v--);
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
            for (var v = [], x = 0; x < f._sounds.length; x++)
              v.push(f._sounds[x]._id);
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
          var f = this;
          return l._node.bufferSource = o.ctx.createBufferSource(), l._node.bufferSource.buffer = c[f._src], l._panner ? l._node.bufferSource.connect(l._panner) : l._node.bufferSource.connect(l._node), l._node.bufferSource.loop = l._loop, l._loop && (l._node.bufferSource.loopStart = l._start || 0, l._node.bufferSource.loopEnd = l._stop || 0), l._node.bufferSource.playbackRate.setValueAtTime(l._rate, o.ctx.currentTime), f;
        },
        /**
         * Prevent memory leaks by cleaning up the buffer source after playback.
         * @param  {Object} node Sound's audio node containing the buffer source.
         * @return {Howl}
         */
        _cleanBuffer: function(l) {
          var f = this, v = o._navigator && o._navigator.vendor.indexOf("Apple") >= 0;
          if (!l.bufferSource)
            return f;
          if (o._scratchBuffer && l.bufferSource && (l.bufferSource.onended = null, l.bufferSource.disconnect(0), v))
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
          var l = this, f = l._parent, v = o._muted || l._muted || l._parent._muted ? 0 : l._volume;
          return f._webAudio ? (l._node = typeof o.ctx.createGain > "u" ? o.ctx.createGainNode() : o.ctx.createGain(), l._node.gain.setValueAtTime(v, o.ctx.currentTime), l._node.paused = !0, l._node.connect(o.masterGain)) : o.noAudio || (l._node = o._obtainHtml5Audio(), l._errorFn = l._errorListener.bind(l), l._node.addEventListener("error", l._errorFn, !1), l._loadFn = l._loadListener.bind(l), l._node.addEventListener(o._canPlayEvent, l._loadFn, !1), l._endFn = l._endListener.bind(l), l._node.addEventListener("ended", l._endFn, !1), l._node.src = f._src, l._node.preload = f._preload === !0 ? "auto" : f._preload, l._node.volume = v * o.volume(), l._node.load()), l;
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
      var c = {}, d = function(l) {
        var f = l._src;
        if (c[f]) {
          l._duration = c[f].duration, g(l);
          return;
        }
        if (/^data:[^;]+;base64,/.test(f)) {
          for (var v = atob(f.split(",")[1]), x = new Uint8Array(v.length), T = 0; T < v.length; ++T)
            x[T] = v.charCodeAt(T);
          y(x.buffer, l);
        } else {
          var k = new XMLHttpRequest();
          k.open(l._xhr.method, f, !0), k.withCredentials = l._xhr.withCredentials, k.responseType = "arraybuffer", l._xhr.headers && Object.keys(l._xhr.headers).forEach(function(A) {
            k.setRequestHeader(A, l._xhr.headers[A]);
          }), k.onload = function() {
            var A = (k.status + "")[0];
            if (A !== "0" && A !== "2" && A !== "3") {
              l._emit("loaderror", null, "Failed loading audio file with status: " + k.status + ".");
              return;
            }
            y(k.response, l);
          }, k.onerror = function() {
            l._webAudio && (l._html5 = !0, l._webAudio = !1, l._sounds = [], delete c[f], l.load());
          }, p(k);
        }
      }, p = function(l) {
        try {
          l.send();
        } catch {
          l.onerror();
        }
      }, y = function(l, f) {
        var v = function() {
          f._emit("loaderror", null, "Decoding audio data failed.");
        }, x = function(T) {
          T && f._sounds.length > 0 ? (c[f._src] = T, g(f, T)) : v();
        };
        typeof Promise < "u" && o.ctx.decodeAudioData.length === 1 ? o.ctx.decodeAudioData(l).then(x).catch(v) : o.ctx.decodeAudioData(l, x, v);
      }, g = function(l, f) {
        f && !l._duration && (l._duration = f.duration), Object.keys(l._sprite).length === 0 && (l._sprite = { __default: [0, l._duration * 1e3] }), l._state !== "loaded" && (l._state = "loaded", l._emit("load"), l._loadQueue());
      }, S = function() {
        if (o.usingWebAudio) {
          try {
            typeof AudioContext < "u" ? o.ctx = new AudioContext() : typeof webkitAudioContext < "u" ? o.ctx = new webkitAudioContext() : o.usingWebAudio = !1;
          } catch {
            o.usingWebAudio = !1;
          }
          o.ctx || (o.usingWebAudio = !1);
          var l = /iP(hone|od|ad)/.test(o._navigator && o._navigator.platform), f = o._navigator && o._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/), v = f ? parseInt(f[1], 10) : null;
          if (l && v && v < 9) {
            var x = /safari/.test(o._navigator && o._navigator.userAgent.toLowerCase());
            o._navigator && !x && (o.usingWebAudio = !1);
          }
          o.usingWebAudio && (o.masterGain = typeof o.ctx.createGain > "u" ? o.ctx.createGainNode() : o.ctx.createGain(), o.masterGain.gain.setValueAtTime(o._muted ? 0 : o._volume, o.ctx.currentTime), o.masterGain.connect(o.ctx.destination)), o._setup();
        }
      };
      e.Howler = o, e.Howl = i, typeof qo < "u" ? (qo.HowlerGlobal = n, qo.Howler = o, qo.Howl = i, qo.Sound = a) : typeof window < "u" && (window.HowlerGlobal = n, window.Howler = o, window.Howl = i, window.Sound = a);
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
      }, HowlerGlobal.prototype.orientation = function(o, i, a, c, d, p) {
        var y = this;
        if (!y.ctx || !y.ctx.listener)
          return y;
        var g = y._orientation;
        if (i = typeof i != "number" ? g[1] : i, a = typeof a != "number" ? g[2] : a, c = typeof c != "number" ? g[3] : c, d = typeof d != "number" ? g[4] : d, p = typeof p != "number" ? g[5] : p, typeof o == "number")
          y._orientation = [o, i, a, c, d, p], typeof y.ctx.listener.forwardX < "u" ? (y.ctx.listener.forwardX.setTargetAtTime(o, Howler.ctx.currentTime, 0.1), y.ctx.listener.forwardY.setTargetAtTime(i, Howler.ctx.currentTime, 0.1), y.ctx.listener.forwardZ.setTargetAtTime(a, Howler.ctx.currentTime, 0.1), y.ctx.listener.upX.setTargetAtTime(c, Howler.ctx.currentTime, 0.1), y.ctx.listener.upY.setTargetAtTime(d, Howler.ctx.currentTime, 0.1), y.ctx.listener.upZ.setTargetAtTime(p, Howler.ctx.currentTime, 0.1)) : y.ctx.listener.setOrientation(o, i, a, c, d, p);
        else
          return g;
        return y;
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
        for (var d = a._getSoundIds(i), p = 0; p < d.length; p++) {
          var y = a._soundById(d[p]);
          if (y)
            if (typeof o == "number")
              y._stereo = o, y._pos = [o, 0, 0], y._node && (y._pannerAttr.panningModel = "equalpower", (!y._panner || !y._panner.pan) && n(y, c), c === "spatial" ? typeof y._panner.positionX < "u" ? (y._panner.positionX.setValueAtTime(o, Howler.ctx.currentTime), y._panner.positionY.setValueAtTime(0, Howler.ctx.currentTime), y._panner.positionZ.setValueAtTime(0, Howler.ctx.currentTime)) : y._panner.setPosition(o, 0, 0) : y._panner.pan.setValueAtTime(o, Howler.ctx.currentTime)), a._emit("stereo", y._id);
            else
              return y._stereo;
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
        for (var p = d._getSoundIds(c), y = 0; y < p.length; y++) {
          var g = d._soundById(p[y]);
          if (g)
            if (typeof o == "number")
              g._pos = [o, i, a], g._node && ((!g._panner || g._panner.pan) && n(g, "spatial"), typeof g._panner.positionX < "u" ? (g._panner.positionX.setValueAtTime(o, Howler.ctx.currentTime), g._panner.positionY.setValueAtTime(i, Howler.ctx.currentTime), g._panner.positionZ.setValueAtTime(a, Howler.ctx.currentTime)) : g._panner.setPosition(o, i, a)), d._emit("pos", g._id);
            else
              return g._pos;
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
        for (var p = d._getSoundIds(c), y = 0; y < p.length; y++) {
          var g = d._soundById(p[y]);
          if (g)
            if (typeof o == "number")
              g._orientation = [o, i, a], g._node && (g._panner || (g._pos || (g._pos = d._pos || [0, 0, -0.5]), n(g, "spatial")), typeof g._panner.orientationX < "u" ? (g._panner.orientationX.setValueAtTime(o, Howler.ctx.currentTime), g._panner.orientationY.setValueAtTime(i, Howler.ctx.currentTime), g._panner.orientationZ.setValueAtTime(a, Howler.ctx.currentTime)) : g._panner.setOrientation(o, i, a)), d._emit("orientation", g._id);
            else
              return g._orientation;
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
        for (var p = o._getSoundIds(c), y = 0; y < p.length; y++)
          if (d = o._soundById(p[y]), d) {
            var g = d._pannerAttr;
            g = {
              coneInnerAngle: typeof a.coneInnerAngle < "u" ? a.coneInnerAngle : g.coneInnerAngle,
              coneOuterAngle: typeof a.coneOuterAngle < "u" ? a.coneOuterAngle : g.coneOuterAngle,
              coneOuterGain: typeof a.coneOuterGain < "u" ? a.coneOuterGain : g.coneOuterGain,
              distanceModel: typeof a.distanceModel < "u" ? a.distanceModel : g.distanceModel,
              maxDistance: typeof a.maxDistance < "u" ? a.maxDistance : g.maxDistance,
              refDistance: typeof a.refDistance < "u" ? a.refDistance : g.refDistance,
              rolloffFactor: typeof a.rolloffFactor < "u" ? a.rolloffFactor : g.rolloffFactor,
              panningModel: typeof a.panningModel < "u" ? a.panningModel : g.panningModel
            };
            var S = d._panner;
            S || (d._pos || (d._pos = o._pos || [0, 0, -0.5]), n(d, "spatial"), S = d._panner), S.coneInnerAngle = g.coneInnerAngle, S.coneOuterAngle = g.coneOuterAngle, S.coneOuterGain = g.coneOuterGain, S.distanceModel = g.distanceModel, S.maxDistance = g.maxDistance, S.refDistance = g.refDistance, S.rolloffFactor = g.rolloffFactor, S.panningModel = g.panningModel;
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
  })(uc)), uc;
}
var JP = qP();
const eM = /* @__PURE__ */ eg(JP), { Howl: lS } = eM, qc = 500, Et = {
  music: null,
  ambient: /* @__PURE__ */ new Map()
};
let dr = {}, fi = !1, Jc = "";
function _i() {
  return typeof lS == "function";
}
function cc(e, n = 50) {
  const o = Number(e), i = Number.isFinite(o) ? o : n;
  return Math.min(1, Math.max(0, i / 100));
}
function uS(e) {
  return new lS({
    src: [e],
    loop: !0,
    html5: !0,
    preload: !0,
    volume: 0
  });
}
function cS(e, n, o = qc) {
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
function za(e, { unload: n = !1 } = {}) {
  var o;
  e && (cS(e, 0, Math.min(qc, 300)), (o = globalThis.setTimeout) == null || o.call(globalThis, () => {
    try {
      e.pause(), n && e.unload();
    } catch {
    }
  }, Math.min(qc, 320)));
}
function tM(e) {
  return !(e != null && e.streamUrl) || !_i() ? null : ((!Et.music || Et.music.__synapseSrc !== e.streamUrl) && (za(Et.music, { unload: !0 }), Et.music = uS(e.streamUrl), Et.music.__synapseSrc = e.streamUrl), Et.music);
}
function nM(e) {
  if (!(e != null && e.streamUrl) || !_i()) return null;
  const n = e.id || e.streamUrl, o = Et.ambient.get(n);
  if (o && o.__synapseSrc === e.streamUrl) return o;
  za(o, { unload: !0 });
  const i = uS(e.streamUrl);
  return i.__synapseSrc = e.streamUrl, Et.ambient.set(n, i), i;
}
function rM() {
  return [
    Et.music,
    ...Et.ambient.values()
  ].filter(Boolean);
}
function dS() {
  rM().forEach((e) => za(e));
}
function oM(e) {
  for (const [n, o] of Et.ambient.entries())
    e.has(n) || (za(o, { unload: !0 }), Et.ambient.delete(n));
}
function Ky(e, n) {
  if (e)
    try {
      e.playing() || e.play(), cS(e, n), Jc = "";
    } catch (o) {
      Jc = (o == null ? void 0 : o.message) || "Audio playback is blocked until the browser receives a user action.";
    }
}
async function iM(e = {}) {
  dr = { ...dr, ...e };
  const n = Ia(dr);
  if (!_i()) return ca(n);
  if (!fi)
    return dS(), ca(n);
  const o = tM(n.musicTrack), i = cc(dr.musicVolume, 60), a = cc(dr.ambientVolume, 50), c = /* @__PURE__ */ new Set(), d = [];
  return n.ambientLayers.forEach((p) => {
    var f;
    const y = p.id || p.streamUrl;
    c.add(y);
    const g = nM(p), S = Number((f = dr.audioChannels) == null ? void 0 : f[p.id]), l = Number.isFinite(S) ? cc(S, 0) : Math.min(1, Math.max(0, a * (p.volumeBias ?? 1)));
    d.push([g, l]);
  }), oM(c), Ky(o, i), d.forEach(([p, y]) => Ky(p, y)), ca(n);
}
function sM(e) {
  return fi = !!e, fi || dS(), fi;
}
function ca(e = Ia(dr)) {
  var n, o, i, a;
  return {
    available: _i(),
    playing: fi && _i(),
    musicTitle: ((n = e.musicTrack) == null ? void 0 : n.title) || "",
    musicArtist: ((o = e.musicTrack) == null ? void 0 : o.artist) || "",
    musicPageUrl: ((i = e.musicTrack) == null ? void 0 : i.pageUrl) || "",
    musicAttribution: ((a = e.musicTrack) == null ? void 0 : a.attribution) || "",
    ambientTitles: e.ambientLayers.map((c) => c.title).filter(Boolean),
    ambientPageUrls: e.ambientLayers.map((c) => c.pageUrl).filter(Boolean),
    ambientAttributions: e.ambientLayers.map((c) => c.attribution).filter(Boolean),
    error: Jc
  };
}
const aM = "synapse.focusRoom.audioPrefs.v1";
function lM(e) {
  var n;
  try {
    (n = globalThis.localStorage) == null || n.setItem(aM, JSON.stringify({
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
function uM() {
  const e = $((y) => y.musicType), n = $((y) => y.ambientSound), o = $((y) => y.musicVolume), i = $((y) => y.ambientVolume), a = $((y) => y.audioChannels), c = $((y) => y.audioPlaying), [d, p] = C.useState(() => ca(Ia({
    musicType: e,
    ambientSound: n
  })));
  return C.useEffect(() => {
    const y = { musicType: e, ambientSound: n, musicVolume: o, ambientVolume: i, audioChannels: a };
    let g = !1;
    return sM(c), lM(y), iM(y).then((S) => {
      g || p(S);
    }), () => {
      g = !0;
    };
  }, [n, i, a, c, e, o]), d;
}
function cM() {
  const e = $(), n = C.useCallback(async (i = "", a = "", c = {}) => {
    var S;
    e.pauseTimer({ pauseAudio: !0 }), e.closeSummary();
    const d = typeof i == "string" || typeof i == "number" ? i : "", p = typeof a == "string" ? a : "", y = dM(p, c), g = String(d || e.selectedMaterialId || ((S = e.selectedMaterial) == null ? void 0 : S.materialId) || "");
    if (typeof globalThis.returnFromFocusRoomToWorkspace == "function")
      try {
        const l = globalThis.returnFromFocusRoomToWorkspace(g, y);
        l && typeof l.then == "function" && await l, Yy(y.action || p, y);
        return;
      } catch (l) {
        console.error("Could not return from Focus Room:", l);
      }
    globalThis.location.hash = "", Yy(y.action || p, y);
  }, [e]), o = C.useMemo(() => ({
    answerFocusQuizQuestion: e.answerQuizQuestion,
    askFocusAssistant: e.askAssistant,
    checkFocusQuizQuestion: e.checkQuizQuestion,
    closeFocusSummary: e.closeSummary,
    endFocusRoomSession: e.endSession,
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
function fS(e) {
  const n = String(e || "").trim().toLowerCase();
  return ["flashcards", "quiz", "assistant", "mindmap", "timeline", "source", "notes"].includes(n) ? n : "";
}
function dM(e, n = {}) {
  const o = n && typeof n == "object" && !Array.isArray(n) ? n : {}, i = fS(e || o.action);
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
function Yy(e, n = {}) {
  const o = fS(e);
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
function fM(e = 3e3) {
  const n = $((i) => i.setIdle), o = $((i) => i.isIdle);
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
function pM() {
  const e = $((i) => i.timerState || (i.timerStatus === "studying" ? "running" : i.timerStatus)), n = $((i) => i.view), o = $((i) => i.tickTimer);
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
function hM() {
  const e = $((n) => n.selectedScene);
  return Wn(e);
}
function mM(e) {
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
function yM() {
  const [e, n] = C.useState(""), [o, i] = C.useState(!1), [a, c] = C.useState(!1), d = $((P) => P.view), p = fM(3e3), y = hM(), g = uM(), S = cM();
  pM();
  const l = $(N1(mM)), f = $((P) => P.summaryRecord), v = $((P) => P.endSession), x = $((P) => P.initializeFocusRoom), T = $((P) => P.openSetup), k = $((P) => P.showStudyHistory);
  C.useEffect(() => {
    x();
  }, [x]), C.useEffect(() => {
    l != null && l.materialId && jd(l.materialId, l);
  }, [l]), C.useEffect(() => {
    d === "session" || !f || Zv("focus-room");
  }, [f, d]), C.useEffect(() => {
    d !== "session" && (i(!1), n(""), c(!1));
  }, [d]), C.useEffect(() => {
    const P = (D) => {
      D.key === "Escape" && (o || (e ? n("") : a && c(!1)));
    };
    return window.addEventListener("keydown", P), () => window.removeEventListener("keydown", P);
  }, [a, o, e]);
  const A = (...P) => {
    S.returnToWorkspace(...P);
  }, R = async () => {
    c(!1), i(!1), n(""), v(), await A();
  };
  return /* @__PURE__ */ w.jsxs(
    "main",
    {
      id: "focusRoomSurface",
      className: `focus-room-surface react-focus-room ${p ? "is-idle" : ""} ${d === "setup" ? "is-innook-setup" : ""}`.trim(),
      "aria-live": "polite",
      children: [
        /* @__PURE__ */ w.jsx(cC, { scene: y }),
        /* @__PURE__ */ w.jsx(Da, { mode: "wait", children: d === "landing" ? /* @__PURE__ */ w.jsx(
          rn.div,
          {
            className: "focus-room-view focus-landing-view",
            initial: { opacity: 0, y: 14 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -8 },
            transition: ia,
            children: /* @__PURE__ */ w.jsx(hb, { onStart: T, onWorkspace: A, onHistory: k })
          },
          "landing"
        ) : d === "setup" ? /* @__PURE__ */ w.jsx(
          rn.div,
          {
            className: "focus-room-view focus-setup-view",
            initial: { opacity: 0, y: 14 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -8 },
            transition: ia,
            children: /* @__PURE__ */ w.jsx(Rb, {})
          },
          "setup"
        ) : /* @__PURE__ */ w.jsxs(
          rn.div,
          {
            className: "focus-room-view focus-session-view",
            initial: { opacity: 0, y: 14 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -8 },
            transition: ia,
            children: [
              o ? null : /* @__PURE__ */ w.jsx(Ib, { onWorkspace: A, onOpenTrail: () => n("trail"), onOpenCompanion: () => n("companion"), onOpenSettings: () => n("settings"), onExit: () => c(!0) }),
              /* @__PURE__ */ w.jsx("section", { className: `focus-session-stage ${o ? "is-focus-mode" : ""}`.trim(), children: /* @__PURE__ */ w.jsx("div", { className: "focus-session-grid", children: /* @__PURE__ */ w.jsx(jb, {}) }) }),
              o ? /* @__PURE__ */ w.jsx(ZP, { audioState: g, onExit: () => i(!1) }) : /* @__PURE__ */ w.jsx(Fb, { audioState: g, onFocusMode: () => i(!0) }),
              o ? null : /* @__PURE__ */ w.jsx(BP, { audioState: g, utilityPanel: e, onClose: () => n(""), onWorkspace: A }),
              /* @__PURE__ */ w.jsx(gP, {}),
              /* @__PURE__ */ w.jsx(gM, { open: a, onClose: () => c(!1), onConfirm: R })
            ]
          },
          "session"
        ) })
      ]
    }
  );
}
function gM({ open: e, onClose: n, onConfirm: o }) {
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
let dc = null;
function vM(e, n) {
  const o = globalThis.__synapseFocusRoomApi || {};
  if (typeof o[e] != "function") {
    console.warn(`Synapse Focus Room action "${e}" is not available yet.`);
    return;
  }
  return o[e](...n);
}
function SM() {
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
    globalThis[n] = (...i) => vM(o, i);
  });
}
function wM(e = {}) {
  SM();
  const n = e.root || document.getElementById("focusRoomRoot");
  if (!n)
    throw new Error("Focus Room root element was not found.");
  dc || (dc = b1.createRoot(n), dc.render(
    yn.createElement(
      yn.StrictMode,
      null,
      yn.createElement(yM)
    )
  ));
}
const xM = "synapse.generated.history.v6", pS = "synapse.active.generated.v6", _M = "synapse.flashcards.deck.v1", kM = "synapse.quiz.history.v1", TM = "synapse.focusRoom.return-target.v1";
function Yd(e, n) {
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
function AM(e, n) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, n), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function CM(e, n) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, JSON.stringify(n)), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function hS() {
  const e = Yd(xM, []);
  return Array.isArray(e) ? e : [];
}
function bM(e) {
  const n = String((e == null ? void 0 : e.title) || "").trim();
  return n || String((e == null ? void 0 : e.summary) || "").split(/\n+/).map((i) => i.replace(/^#+\s*/, "").trim()).find((i) => i.length > 4) || "Generated Study Notes";
}
function mS(e = {}) {
  return [
    e.id ? `history:${e.id}` : "",
    e.sourceFingerprint ? `fingerprint:${e.sourceFingerprint}` : "",
    e.clientFingerprint ? `fingerprint:${e.clientFingerprint}` : ""
  ].filter(Boolean);
}
function EM(e = {}) {
  const n = Yd(_M, {}), i = mS(e).map((a) => n == null ? void 0 : n[a]).find((a) => a && Array.isArray(a.cards) && a.cards.length);
  return (i == null ? void 0 : i.cards) || [];
}
function PM(e = {}) {
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
function MM(e = []) {
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
function RM(e = {}) {
  const n = Yd(kM, {}), i = mS(e).flatMap((c) => Array.isArray(n == null ? void 0 : n[c]) ? n[c] : []), a = /* @__PURE__ */ new Set();
  return MM(i).filter((c) => {
    const d = PM(c);
    return !d || a.has(d) ? !1 : (a.add(d), !0);
  }).sort((c, d) => new Date(d.createdAt || 0) - new Date(c.createdAt || 0));
}
function NM(e = {}) {
  return {
    materialId: String(e.id || e.sourceFingerprint || e.clientFingerprint || "current-material"),
    materialTitle: bM(e),
    materialType: "Generated notes",
    uploadedContent: "",
    aiSummary: e.summary || "",
    sections: e.sections || {},
    flashcards: EM(e),
    quizzes: RM(e),
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
function yS() {
  return hS().filter((e) => e && (e.id || e.summary)).map(NM);
}
function gS(e = "") {
  const n = String(e || "");
  return n && yS().find(
    (o) => o.materialId === n || o.sourceFingerprint === n || o.clientFingerprint === n
  ) || null;
}
function vS() {
  var n;
  const e = ((n = globalThis.localStorage) == null ? void 0 : n.getItem(pS)) || "";
  return gS(e);
}
function DM(e = "") {
  var i;
  const n = e || ((i = vS()) == null ? void 0 : i.materialId) || "", o = n ? `/${encodeURIComponent(n)}` : "";
  globalThis.location.hash = `#/focus-room${o}`;
}
function jM(e = "", n = {}) {
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
async function IM(e = "", n = {}) {
  const o = String(e || ""), i = hS().find(
    (d) => String((d == null ? void 0 : d.id) || "") === o || String((d == null ? void 0 : d.sourceFingerprint) || (d == null ? void 0 : d.source_fingerprint) || "") === o || String((d == null ? void 0 : d.clientFingerprint) || (d == null ? void 0 : d.client_fingerprint) || "") === o
  ) || null, a = String((i == null ? void 0 : i.id) || "");
  a && AM(pS, a);
  const c = jM(a, n);
  c.action && CM(TM, c), globalThis.location.href = a ? `index.html?focusReturn=${encodeURIComponent(a)}` : "index.html";
}
function FM() {
  Object.assign(globalThis, {
    getSynapseFocusRoomCurrentMaterial: vS,
    getSynapseFocusRoomMaterial: gS,
    getSynapseFocusRoomMaterials: yS,
    openSynapseFocusRoom: DM,
    returnFromFocusRoomToWorkspace: IM
  });
}
const SS = document.getElementById("focusRoomRoot");
if (!SS)
  throw new Error("Focus Room root element was not found.");
var Zy;
(Zy = document.getElementById("focusRoomFallbackTitle")) == null || Zy.remove();
globalThis.apiClient = new Jy(S1);
FM();
(!globalThis.location.hash || globalThis.location.hash === "#") && (globalThis.location.hash = "#/focus-room");
wM({ root: SS });
