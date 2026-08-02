function p1(e, n) {
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
function h1(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function Zy(e) {
  const n = String(e || "").toLowerCase();
  return n === "127.0.0.1" || n === "localhost" || n === "::1" || n === "[::1]";
}
function Uh(e) {
  return Zy(e) || h1(e);
}
function m1(e) {
  return !e || Zy(e) ? "127.0.0.1" : e;
}
const y1 = (() => {
  var f, y, v, S;
  const { protocol: e, hostname: n, port: o } = window.location, i = String(window.SYNAPSE_BACKEND_PORT || ((y = (f = document.body) == null ? void 0 : f.dataset) == null ? void 0 : y.apiPort) || "8001").trim(), a = `http://${m1(n)}:${i || "8001"}`, c = String(window.SYNAPSE_API_BASE || ((S = (v = document.body) == null ? void 0 : v.dataset) == null ? void 0 : S.apiBase) || "").replace(/\/+$/, ""), d = `${e}//${window.location.host}`.replace(/\/+$/, "");
  return c && !(Uh(n) && o !== i && c === d) ? c : e === "file:" || Uh(n) && o !== i ? a : `${e}//${window.location.host}`;
})();
class Fs extends Error {
  constructor(n, { cause: o } = {}) {
    super(n), this.name = "ApiConnectionError", this.cause = o;
  }
}
const $h = "synapse.client.id.v1";
function Vn() {
  return globalThis.window || globalThis;
}
function Hr(e, n = 220) {
  return String(e || "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
}
function Hh() {
  const e = globalThis.crypto || Vn().crypto;
  return e != null && e.randomUUID ? e.randomUUID() : `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
function g1() {
  var n, o;
  const e = Vn();
  try {
    const i = (n = e.localStorage) == null ? void 0 : n.getItem($h);
    if (i) return i;
    const a = Hh();
    return (o = e.localStorage) == null || o.setItem($h, a), a;
  } catch {
    return Hh();
  }
}
function v1(e = {}) {
  if (typeof Headers < "u" && e instanceof Headers) {
    const n = {};
    return e.forEach((o, i) => {
      n[i] = o;
    }), n;
  }
  return Array.isArray(e) ? Object.fromEntries(e) : { ...e || {} };
}
class qy {
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
    var c, d, f;
    const o = Vn(), i = v1(n);
    i["X-Synapse-Client-Id"] = Hr(g1(), 160);
    const a = (d = (c = o.SynapseAuth) == null ? void 0 : c.getStoredSession) == null ? void 0 : d.call(c);
    if (a && typeof a == "object" && (a.accountId && (i["X-Synapse-User-Id"] = Hr(a.accountId, 160)), a.email && (i["X-Synapse-User-Email"] = Hr(a.email, 220)), a.displayName && (i["X-Synapse-User-Name"] = Hr(a.displayName, 180)), a.authMode && (i["X-Synapse-Auth-Mode"] = Hr(a.authMode, 60)), a.role && (i["X-Synapse-User-Role"] = Hr(a.role, 80))), (f = o.SynapseAuth) != null && f.authHeaders && !i.Authorization && !i.authorization)
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
    let f = null, y = null, v = null, S = !1;
    const l = c.signal;
    d > 0 && typeof AbortController < "u" && (f = new AbortController(), v = () => f.abort(), l && (l.aborted ? f.abort() : l.addEventListener("abort", v, { once: !0 })), y = Vn().setTimeout(() => {
      S = !0, f.abort();
    }, d), c.signal = f.signal);
    try {
      return await this.fetchImpl(i, c);
    } catch (h) {
      throw S ? new Fs(this.timeoutMessage(d), { cause: h }) : l != null && l.aborted ? h : new Fs(this.connectionMessage(), { cause: h });
    } finally {
      y && Vn().clearTimeout(y), l && v && l.removeEventListener("abort", v);
    }
  }
  async warmup({ attempts: n = 2, retryDelayMs: o = 1500, timeoutMs: i = 6e4, maxWaitMs: a = 0, signal: c } = {}) {
    const d = Math.max(1, Math.floor(Number(n) || 1)), f = Math.max(0, Number(a) || 0), y = Date.now();
    let v = null;
    for (let S = 0; S < d; S += 1) {
      const l = Date.now() - y, h = f > 0 ? f - l : 0;
      if (f > 0 && h <= 0) break;
      try {
        const g = await this.fetch("/healthz", {
          method: "GET",
          signal: c,
          timeoutMs: f > 0 ? Math.min(i, h) : i
        });
        if (g != null && g.ok) return g;
        v = new Fs(
          `Synapse hosted service returned ${(g == null ? void 0 : g.status) || "an unexpected status"} while preparing your analysis.`
        );
      } catch (g) {
        v = g;
      }
      if (S < d - 1 && o > 0) {
        const g = f > 0 ? f - (Date.now() - y) : o;
        if (f > 0 && g <= 0) break;
        await new Promise((x) => Vn().setTimeout(x, Math.min(o, g)));
      }
    }
    throw v || new Fs(this.connectionMessage());
  }
  isRetryableResponse(n) {
    return [502, 503, 504].includes(Number(n == null ? void 0 : n.status));
  }
  async fetchWithRetry(n, o = {}, { attempts: i = 3, retryDelayMs: a = 3e3 } = {}) {
    const c = Math.max(1, Math.floor(Number(i) || 1));
    let d = null;
    for (let f = 0; f < c; f += 1) {
      if (d = await this.fetch(n, o), !this.isRetryableResponse(d) || f === c - 1) return d;
      a > 0 && await new Promise((y) => Vn().setTimeout(y, a));
    }
    return d;
  }
}
var Zo = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Jy(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var Du = { exports: {} }, Se = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Wh;
function S1() {
  if (Wh) return Se;
  Wh = 1;
  var e = Symbol.for("react.element"), n = Symbol.for("react.portal"), o = Symbol.for("react.fragment"), i = Symbol.for("react.strict_mode"), a = Symbol.for("react.profiler"), c = Symbol.for("react.provider"), d = Symbol.for("react.context"), f = Symbol.for("react.forward_ref"), y = Symbol.for("react.suspense"), v = Symbol.for("react.memo"), S = Symbol.for("react.lazy"), l = Symbol.iterator;
  function h(E) {
    return E === null || typeof E != "object" ? null : (E = l && E[l] || E["@@iterator"], typeof E == "function" ? E : null);
  }
  var g = { isMounted: function() {
    return !1;
  }, enqueueForceUpdate: function() {
  }, enqueueReplaceState: function() {
  }, enqueueSetState: function() {
  } }, x = Object.assign, k = {};
  function T(E, O, le) {
    this.props = E, this.context = O, this.refs = k, this.updater = le || g;
  }
  T.prototype.isReactComponent = {}, T.prototype.setState = function(E, O) {
    if (typeof E != "object" && typeof E != "function" && E != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
    this.updater.enqueueSetState(this, E, O, "setState");
  }, T.prototype.forceUpdate = function(E) {
    this.updater.enqueueForceUpdate(this, E, "forceUpdate");
  };
  function A() {
  }
  A.prototype = T.prototype;
  function R(E, O, le) {
    this.props = E, this.context = O, this.refs = k, this.updater = le || g;
  }
  var b = R.prototype = new A();
  b.constructor = R, x(b, T.prototype), b.isPureReactComponent = !0;
  var D = Array.isArray, L = Object.prototype.hasOwnProperty, X = { current: null }, Z = { key: !0, ref: !0, __self: !0, __source: !0 };
  function U(E, O, le) {
    var fe, me = {}, xe = null, W = null;
    if (O != null) for (fe in O.ref !== void 0 && (W = O.ref), O.key !== void 0 && (xe = "" + O.key), O) L.call(O, fe) && !Z.hasOwnProperty(fe) && (me[fe] = O[fe]);
    var pe = arguments.length - 2;
    if (pe === 1) me.children = le;
    else if (1 < pe) {
      for (var ve = Array(pe), De = 0; De < pe; De++) ve[De] = arguments[De + 2];
      me.children = ve;
    }
    if (E && E.defaultProps) for (fe in pe = E.defaultProps, pe) me[fe] === void 0 && (me[fe] = pe[fe]);
    return { $$typeof: e, type: E, key: xe, ref: W, props: me, _owner: X.current };
  }
  function G(E, O) {
    return { $$typeof: e, type: E.type, key: O, ref: E.ref, props: E.props, _owner: E._owner };
  }
  function Q(E) {
    return typeof E == "object" && E !== null && E.$$typeof === e;
  }
  function J(E) {
    var O = { "=": "=0", ":": "=2" };
    return "$" + E.replace(/[=:]/g, function(le) {
      return O[le];
    });
  }
  var ce = /\/+/g;
  function ye(E, O) {
    return typeof E == "object" && E !== null && E.key != null ? J("" + E.key) : O.toString(36);
  }
  function he(E, O, le, fe, me) {
    var xe = typeof E;
    (xe === "undefined" || xe === "boolean") && (E = null);
    var W = !1;
    if (E === null) W = !0;
    else switch (xe) {
      case "string":
      case "number":
        W = !0;
        break;
      case "object":
        switch (E.$$typeof) {
          case e:
          case n:
            W = !0;
        }
    }
    if (W) return W = E, me = me(W), E = fe === "" ? "." + ye(W, 0) : fe, D(me) ? (le = "", E != null && (le = E.replace(ce, "$&/") + "/"), he(me, O, le, "", function(De) {
      return De;
    })) : me != null && (Q(me) && (me = G(me, le + (!me.key || W && W.key === me.key ? "" : ("" + me.key).replace(ce, "$&/") + "/") + E)), O.push(me)), 1;
    if (W = 0, fe = fe === "" ? "." : fe + ":", D(E)) for (var pe = 0; pe < E.length; pe++) {
      xe = E[pe];
      var ve = fe + ye(xe, pe);
      W += he(xe, O, le, ve, me);
    }
    else if (ve = h(E), typeof ve == "function") for (E = ve.call(E), pe = 0; !(xe = E.next()).done; ) xe = xe.value, ve = fe + ye(xe, pe++), W += he(xe, O, le, ve, me);
    else if (xe === "object") throw O = String(E), Error("Objects are not valid as a React child (found: " + (O === "[object Object]" ? "object with keys {" + Object.keys(E).join(", ") + "}" : O) + "). If you meant to render a collection of children, use an array instead.");
    return W;
  }
  function we(E, O, le) {
    if (E == null) return E;
    var fe = [], me = 0;
    return he(E, fe, "", "", function(xe) {
      return O.call(le, xe, me++);
    }), fe;
  }
  function ue(E) {
    if (E._status === -1) {
      var O = E._result;
      O = O(), O.then(function(le) {
        (E._status === 0 || E._status === -1) && (E._status = 1, E._result = le);
      }, function(le) {
        (E._status === 0 || E._status === -1) && (E._status = 2, E._result = le);
      }), E._status === -1 && (E._status = 0, E._result = O);
    }
    if (E._status === 1) return E._result.default;
    throw E._result;
  }
  var ge = { current: null }, V = { transition: null }, q = { ReactCurrentDispatcher: ge, ReactCurrentBatchConfig: V, ReactCurrentOwner: X };
  function K() {
    throw Error("act(...) is not supported in production builds of React.");
  }
  return Se.Children = { map: we, forEach: function(E, O, le) {
    we(E, function() {
      O.apply(this, arguments);
    }, le);
  }, count: function(E) {
    var O = 0;
    return we(E, function() {
      O++;
    }), O;
  }, toArray: function(E) {
    return we(E, function(O) {
      return O;
    }) || [];
  }, only: function(E) {
    if (!Q(E)) throw Error("React.Children.only expected to receive a single React element child.");
    return E;
  } }, Se.Component = T, Se.Fragment = o, Se.Profiler = a, Se.PureComponent = R, Se.StrictMode = i, Se.Suspense = y, Se.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = q, Se.act = K, Se.cloneElement = function(E, O, le) {
    if (E == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + E + ".");
    var fe = x({}, E.props), me = E.key, xe = E.ref, W = E._owner;
    if (O != null) {
      if (O.ref !== void 0 && (xe = O.ref, W = X.current), O.key !== void 0 && (me = "" + O.key), E.type && E.type.defaultProps) var pe = E.type.defaultProps;
      for (ve in O) L.call(O, ve) && !Z.hasOwnProperty(ve) && (fe[ve] = O[ve] === void 0 && pe !== void 0 ? pe[ve] : O[ve]);
    }
    var ve = arguments.length - 2;
    if (ve === 1) fe.children = le;
    else if (1 < ve) {
      pe = Array(ve);
      for (var De = 0; De < ve; De++) pe[De] = arguments[De + 2];
      fe.children = pe;
    }
    return { $$typeof: e, type: E.type, key: me, ref: xe, props: fe, _owner: W };
  }, Se.createContext = function(E) {
    return E = { $$typeof: d, _currentValue: E, _currentValue2: E, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, E.Provider = { $$typeof: c, _context: E }, E.Consumer = E;
  }, Se.createElement = U, Se.createFactory = function(E) {
    var O = U.bind(null, E);
    return O.type = E, O;
  }, Se.createRef = function() {
    return { current: null };
  }, Se.forwardRef = function(E) {
    return { $$typeof: f, render: E };
  }, Se.isValidElement = Q, Se.lazy = function(E) {
    return { $$typeof: S, _payload: { _status: -1, _result: E }, _init: ue };
  }, Se.memo = function(E, O) {
    return { $$typeof: v, type: E, compare: O === void 0 ? null : O };
  }, Se.startTransition = function(E) {
    var O = V.transition;
    V.transition = {};
    try {
      E();
    } finally {
      V.transition = O;
    }
  }, Se.unstable_act = K, Se.useCallback = function(E, O) {
    return ge.current.useCallback(E, O);
  }, Se.useContext = function(E) {
    return ge.current.useContext(E);
  }, Se.useDebugValue = function() {
  }, Se.useDeferredValue = function(E) {
    return ge.current.useDeferredValue(E);
  }, Se.useEffect = function(E, O) {
    return ge.current.useEffect(E, O);
  }, Se.useId = function() {
    return ge.current.useId();
  }, Se.useImperativeHandle = function(E, O, le) {
    return ge.current.useImperativeHandle(E, O, le);
  }, Se.useInsertionEffect = function(E, O) {
    return ge.current.useInsertionEffect(E, O);
  }, Se.useLayoutEffect = function(E, O) {
    return ge.current.useLayoutEffect(E, O);
  }, Se.useMemo = function(E, O) {
    return ge.current.useMemo(E, O);
  }, Se.useReducer = function(E, O, le) {
    return ge.current.useReducer(E, O, le);
  }, Se.useRef = function(E) {
    return ge.current.useRef(E);
  }, Se.useState = function(E) {
    return ge.current.useState(E);
  }, Se.useSyncExternalStore = function(E, O, le) {
    return ge.current.useSyncExternalStore(E, O, le);
  }, Se.useTransition = function() {
    return ge.current.useTransition();
  }, Se.version = "18.3.1", Se;
}
var Gh;
function Jc() {
  return Gh || (Gh = 1, Du.exports = S1()), Du.exports;
}
var C = Jc();
const yn = /* @__PURE__ */ Jy(C), ed = /* @__PURE__ */ p1({
  __proto__: null,
  default: yn
}, [C]);
var Os = {}, ju = { exports: {} }, pt = {}, Iu = { exports: {} }, Fu = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Kh;
function w1() {
  return Kh || (Kh = 1, (function(e) {
    function n(V, q) {
      var K = V.length;
      V.push(q);
      e: for (; 0 < K; ) {
        var E = K - 1 >>> 1, O = V[E];
        if (0 < a(O, q)) V[E] = q, V[K] = O, K = E;
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
        e: for (var E = 0, O = V.length, le = O >>> 1; E < le; ) {
          var fe = 2 * (E + 1) - 1, me = V[fe], xe = fe + 1, W = V[xe];
          if (0 > a(me, K)) xe < O && 0 > a(W, me) ? (V[E] = W, V[xe] = K, E = xe) : (V[E] = me, V[fe] = K, E = fe);
          else if (xe < O && 0 > a(W, K)) V[E] = W, V[xe] = K, E = xe;
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
      var d = Date, f = d.now();
      e.unstable_now = function() {
        return d.now() - f;
      };
    }
    var y = [], v = [], S = 1, l = null, h = 3, g = !1, x = !1, k = !1, T = typeof setTimeout == "function" ? setTimeout : null, A = typeof clearTimeout == "function" ? clearTimeout : null, R = typeof setImmediate < "u" ? setImmediate : null;
    typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
    function b(V) {
      for (var q = o(v); q !== null; ) {
        if (q.callback === null) i(v);
        else if (q.startTime <= V) i(v), q.sortIndex = q.expirationTime, n(y, q);
        else break;
        q = o(v);
      }
    }
    function D(V) {
      if (k = !1, b(V), !x) if (o(y) !== null) x = !0, ue(L);
      else {
        var q = o(v);
        q !== null && ge(D, q.startTime - V);
      }
    }
    function L(V, q) {
      x = !1, k && (k = !1, A(U), U = -1), g = !0;
      var K = h;
      try {
        for (b(q), l = o(y); l !== null && (!(l.expirationTime > q) || V && !J()); ) {
          var E = l.callback;
          if (typeof E == "function") {
            l.callback = null, h = l.priorityLevel;
            var O = E(l.expirationTime <= q);
            q = e.unstable_now(), typeof O == "function" ? l.callback = O : l === o(y) && i(y), b(q);
          } else i(y);
          l = o(y);
        }
        if (l !== null) var le = !0;
        else {
          var fe = o(v);
          fe !== null && ge(D, fe.startTime - q), le = !1;
        }
        return le;
      } finally {
        l = null, h = K, g = !1;
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
      T(ce, 0);
    };
    function ue(V) {
      Z = V, X || (X = !0, ye());
    }
    function ge(V, q) {
      U = T(function() {
        V(e.unstable_now());
      }, q);
    }
    e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(V) {
      V.callback = null;
    }, e.unstable_continueExecution = function() {
      x || g || (x = !0, ue(L));
    }, e.unstable_forceFrameRate = function(V) {
      0 > V || 125 < V ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : G = 0 < V ? Math.floor(1e3 / V) : 5;
    }, e.unstable_getCurrentPriorityLevel = function() {
      return h;
    }, e.unstable_getFirstCallbackNode = function() {
      return o(y);
    }, e.unstable_next = function(V) {
      switch (h) {
        case 1:
        case 2:
        case 3:
          var q = 3;
          break;
        default:
          q = h;
      }
      var K = h;
      h = q;
      try {
        return V();
      } finally {
        h = K;
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
      var K = h;
      h = V;
      try {
        return q();
      } finally {
        h = K;
      }
    }, e.unstable_scheduleCallback = function(V, q, K) {
      var E = e.unstable_now();
      switch (typeof K == "object" && K !== null ? (K = K.delay, K = typeof K == "number" && 0 < K ? E + K : E) : K = E, V) {
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
      return O = K + O, V = { id: S++, callback: q, priorityLevel: V, startTime: K, expirationTime: O, sortIndex: -1 }, K > E ? (V.sortIndex = K, n(v, V), o(y) === null && V === o(v) && (k ? (A(U), U = -1) : k = !0, ge(D, K - E))) : (V.sortIndex = O, n(y, V), x || g || (x = !0, ue(L))), V;
    }, e.unstable_shouldYield = J, e.unstable_wrapCallback = function(V) {
      var q = h;
      return function() {
        var K = h;
        h = q;
        try {
          return V.apply(this, arguments);
        } finally {
          h = K;
        }
      };
    };
  })(Fu)), Fu;
}
var Yh;
function x1() {
  return Yh || (Yh = 1, Iu.exports = w1()), Iu.exports;
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
var Qh;
function _1() {
  if (Qh) return pt;
  Qh = 1;
  var e = Jc(), n = x1();
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
  var f = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), y = Object.prototype.hasOwnProperty, v = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, S = {}, l = {};
  function h(t) {
    return y.call(l, t) ? !0 : y.call(S, t) ? !1 : v.test(t) ? l[t] = !0 : (S[t] = !0, !1);
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
  function k(t, r, s, u, p, m, _) {
    this.acceptsBooleans = r === 2 || r === 3 || r === 4, this.attributeName = u, this.attributeNamespace = p, this.mustUseProperty = s, this.propertyName = t, this.type = r, this.sanitizeURL = m, this.removeEmptyString = _;
  }
  var T = {};
  "children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(t) {
    T[t] = new k(t, 0, !1, t, null, !1, !1);
  }), [["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(t) {
    var r = t[0];
    T[r] = new k(r, 1, !1, t[1], null, !1, !1);
  }), ["contentEditable", "draggable", "spellCheck", "value"].forEach(function(t) {
    T[t] = new k(t, 2, !1, t.toLowerCase(), null, !1, !1);
  }), ["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(t) {
    T[t] = new k(t, 2, !1, t, null, !1, !1);
  }), "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(t) {
    T[t] = new k(t, 3, !1, t.toLowerCase(), null, !1, !1);
  }), ["checked", "multiple", "muted", "selected"].forEach(function(t) {
    T[t] = new k(t, 3, !0, t, null, !1, !1);
  }), ["capture", "download"].forEach(function(t) {
    T[t] = new k(t, 4, !1, t, null, !1, !1);
  }), ["cols", "rows", "size", "span"].forEach(function(t) {
    T[t] = new k(t, 6, !1, t, null, !1, !1);
  }), ["rowSpan", "start"].forEach(function(t) {
    T[t] = new k(t, 5, !1, t.toLowerCase(), null, !1, !1);
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
    T[r] = new k(r, 1, !1, t, null, !1, !1);
  }), "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(t) {
    var r = t.replace(A, R);
    T[r] = new k(r, 1, !1, t, "http://www.w3.org/1999/xlink", !1, !1);
  }), ["xml:base", "xml:lang", "xml:space"].forEach(function(t) {
    var r = t.replace(A, R);
    T[r] = new k(r, 1, !1, t, "http://www.w3.org/XML/1998/namespace", !1, !1);
  }), ["tabIndex", "crossOrigin"].forEach(function(t) {
    T[t] = new k(t, 1, !1, t.toLowerCase(), null, !1, !1);
  }), T.xlinkHref = new k("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1), ["src", "href", "action", "formAction"].forEach(function(t) {
    T[t] = new k(t, 1, !1, t.toLowerCase(), null, !0, !0);
  });
  function b(t, r, s, u) {
    var p = T.hasOwnProperty(r) ? T[r] : null;
    (p !== null ? p.type !== 0 : u || !(2 < r.length) || r[0] !== "o" && r[0] !== "O" || r[1] !== "n" && r[1] !== "N") && (x(r, s, p, u) && (s = null), u || p === null ? h(r) && (s === null ? t.removeAttribute(r) : t.setAttribute(r, "" + s)) : p.mustUseProperty ? t[p.propertyName] = s === null ? p.type === 3 ? !1 : "" : s : (r = p.attributeName, u = p.attributeNamespace, s === null ? t.removeAttribute(r) : (p = p.type, s = p === 3 || p === 4 && s === !0 ? "" : "" + s, u ? t.setAttributeNS(u, r, s) : t.setAttribute(r, s))));
  }
  var D = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, L = Symbol.for("react.element"), X = Symbol.for("react.portal"), Z = Symbol.for("react.fragment"), U = Symbol.for("react.strict_mode"), G = Symbol.for("react.profiler"), Q = Symbol.for("react.provider"), J = Symbol.for("react.context"), ce = Symbol.for("react.forward_ref"), ye = Symbol.for("react.suspense"), he = Symbol.for("react.suspense_list"), we = Symbol.for("react.memo"), ue = Symbol.for("react.lazy"), ge = Symbol.for("react.offscreen"), V = Symbol.iterator;
  function q(t) {
    return t === null || typeof t != "object" ? null : (t = V && t[V] || t["@@iterator"], typeof t == "function" ? t : null);
  }
  var K = Object.assign, E;
  function O(t) {
    if (E === void 0) try {
      throw Error();
    } catch (s) {
      var r = s.stack.trim().match(/\n( *(at )?)/);
      E = r && r[1] || "";
    }
    return `
` + E + t;
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
        for (var p = F.stack.split(`
`), m = u.stack.split(`
`), _ = p.length - 1, P = m.length - 1; 1 <= _ && 0 <= P && p[_] !== m[P]; ) P--;
        for (; 1 <= _ && 0 <= P; _--, P--) if (p[_] !== m[P]) {
          if (_ !== 1 || P !== 1)
            do
              if (_--, P--, 0 > P || p[_] !== m[P]) {
                var M = `
` + p[_].replace(" at new ", " at ");
                return t.displayName && M.includes("<anonymous>") && (M = M.replace("<anonymous>", t.displayName)), M;
              }
            while (1 <= _ && 0 <= P);
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
      var p = s.get, m = s.set;
      return Object.defineProperty(t, r, { configurable: !0, get: function() {
        return p.call(this);
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
  function co(t) {
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
  function za(t, r) {
    var s = r.checked;
    return K({}, r, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: s ?? t._wrapperState.initialChecked });
  }
  function Yd(t, r) {
    var s = r.defaultValue == null ? "" : r.defaultValue, u = r.checked != null ? r.checked : r.defaultChecked;
    s = pe(r.value != null ? r.value : s), t._wrapperState = { initialChecked: u, initialValue: s, controlled: r.type === "checkbox" || r.type === "radio" ? r.checked != null : r.value != null };
  }
  function Qd(t, r) {
    r = r.checked, r != null && b(t, "checked", r, !1);
  }
  function Ba(t, r) {
    Qd(t, r);
    var s = pe(r.value), u = r.type;
    if (s != null) u === "number" ? (s === 0 && t.value === "" || t.value != s) && (t.value = "" + s) : t.value !== "" + s && (t.value = "" + s);
    else if (u === "submit" || u === "reset") {
      t.removeAttribute("value");
      return;
    }
    r.hasOwnProperty("value") ? Ua(t, r.type, s) : r.hasOwnProperty("defaultValue") && Ua(t, r.type, pe(r.defaultValue)), r.checked == null && r.defaultChecked != null && (t.defaultChecked = !!r.defaultChecked);
  }
  function Xd(t, r, s) {
    if (r.hasOwnProperty("value") || r.hasOwnProperty("defaultValue")) {
      var u = r.type;
      if (!(u !== "submit" && u !== "reset" || r.value !== void 0 && r.value !== null)) return;
      r = "" + t._wrapperState.initialValue, s || r === t.value || (t.value = r), t.defaultValue = r;
    }
    s = t.name, s !== "" && (t.name = ""), t.defaultChecked = !!t._wrapperState.initialChecked, s !== "" && (t.name = s);
  }
  function Ua(t, r, s) {
    (r !== "number" || Yn(t.ownerDocument) !== t) && (s == null ? t.defaultValue = "" + t._wrapperState.initialValue : t.defaultValue !== "" + s && (t.defaultValue = "" + s));
  }
  var fo = Array.isArray;
  function Sr(t, r, s, u) {
    if (t = t.options, r) {
      r = {};
      for (var p = 0; p < s.length; p++) r["$" + s[p]] = !0;
      for (s = 0; s < t.length; s++) p = r.hasOwnProperty("$" + t[s].value), t[s].selected !== p && (t[s].selected = p), p && u && (t[s].defaultSelected = !0);
    } else {
      for (s = "" + pe(s), r = null, p = 0; p < t.length; p++) {
        if (t[p].value === s) {
          t[p].selected = !0, u && (t[p].defaultSelected = !0);
          return;
        }
        r !== null || t[p].disabled || (r = t[p]);
      }
      r !== null && (r.selected = !0);
    }
  }
  function $a(t, r) {
    if (r.dangerouslySetInnerHTML != null) throw Error(o(91));
    return K({}, r, { value: void 0, defaultValue: void 0, children: "" + t._wrapperState.initialValue });
  }
  function Zd(t, r) {
    var s = r.value;
    if (s == null) {
      if (s = r.children, r = r.defaultValue, s != null) {
        if (r != null) throw Error(o(92));
        if (fo(s)) {
          if (1 < s.length) throw Error(o(93));
          s = s[0];
        }
        r = s;
      }
      r == null && (r = ""), s = r;
    }
    t._wrapperState = { initialValue: pe(s) };
  }
  function qd(t, r) {
    var s = pe(r.value), u = pe(r.defaultValue);
    s != null && (s = "" + s, s !== t.value && (t.value = s), r.defaultValue == null && t.defaultValue !== s && (t.defaultValue = s)), u != null && (t.defaultValue = "" + u);
  }
  function Jd(t) {
    var r = t.textContent;
    r === t._wrapperState.initialValue && r !== "" && r !== null && (t.value = r);
  }
  function ef(t) {
    switch (t) {
      case "svg":
        return "http://www.w3.org/2000/svg";
      case "math":
        return "http://www.w3.org/1998/Math/MathML";
      default:
        return "http://www.w3.org/1999/xhtml";
    }
  }
  function Ha(t, r) {
    return t == null || t === "http://www.w3.org/1999/xhtml" ? ef(r) : t === "http://www.w3.org/2000/svg" && r === "foreignObject" ? "http://www.w3.org/1999/xhtml" : t;
  }
  var Pi, tf = (function(t) {
    return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(r, s, u, p) {
      MSApp.execUnsafeLocalFunction(function() {
        return t(r, s, u, p);
      });
    } : t;
  })(function(t, r) {
    if (t.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in t) t.innerHTML = r;
    else {
      for (Pi = Pi || document.createElement("div"), Pi.innerHTML = "<svg>" + r.valueOf().toString() + "</svg>", r = Pi.firstChild; t.firstChild; ) t.removeChild(t.firstChild);
      for (; r.firstChild; ) t.appendChild(r.firstChild);
    }
  });
  function po(t, r) {
    if (r) {
      var s = t.firstChild;
      if (s && s === t.lastChild && s.nodeType === 3) {
        s.nodeValue = r;
        return;
      }
    }
    t.textContent = r;
  }
  var ho = {
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
  }, gS = ["Webkit", "ms", "Moz", "O"];
  Object.keys(ho).forEach(function(t) {
    gS.forEach(function(r) {
      r = r + t.charAt(0).toUpperCase() + t.substring(1), ho[r] = ho[t];
    });
  });
  function nf(t, r, s) {
    return r == null || typeof r == "boolean" || r === "" ? "" : s || typeof r != "number" || r === 0 || ho.hasOwnProperty(t) && ho[t] ? ("" + r).trim() : r + "px";
  }
  function rf(t, r) {
    t = t.style;
    for (var s in r) if (r.hasOwnProperty(s)) {
      var u = s.indexOf("--") === 0, p = nf(s, r[s], u);
      s === "float" && (s = "cssFloat"), u ? t.setProperty(s, p) : t[s] = p;
    }
  }
  var vS = K({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
  function Wa(t, r) {
    if (r) {
      if (vS[t] && (r.children != null || r.dangerouslySetInnerHTML != null)) throw Error(o(137, t));
      if (r.dangerouslySetInnerHTML != null) {
        if (r.children != null) throw Error(o(60));
        if (typeof r.dangerouslySetInnerHTML != "object" || !("__html" in r.dangerouslySetInnerHTML)) throw Error(o(61));
      }
      if (r.style != null && typeof r.style != "object") throw Error(o(62));
    }
  }
  function Ga(t, r) {
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
  var Ka = null;
  function Ya(t) {
    return t = t.target || t.srcElement || window, t.correspondingUseElement && (t = t.correspondingUseElement), t.nodeType === 3 ? t.parentNode : t;
  }
  var Qa = null, wr = null, xr = null;
  function of(t) {
    if (t = Fo(t)) {
      if (typeof Qa != "function") throw Error(o(280));
      var r = t.stateNode;
      r && (r = Zi(r), Qa(t.stateNode, t.type, r));
    }
  }
  function sf(t) {
    wr ? xr ? xr.push(t) : xr = [t] : wr = t;
  }
  function af() {
    if (wr) {
      var t = wr, r = xr;
      if (xr = wr = null, of(t), r) for (t = 0; t < r.length; t++) of(r[t]);
    }
  }
  function lf(t, r) {
    return t(r);
  }
  function uf() {
  }
  var Xa = !1;
  function cf(t, r, s) {
    if (Xa) return t(r, s);
    Xa = !0;
    try {
      return lf(t, r, s);
    } finally {
      Xa = !1, (wr !== null || xr !== null) && (uf(), af());
    }
  }
  function mo(t, r) {
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
  var Za = !1;
  if (f) try {
    var yo = {};
    Object.defineProperty(yo, "passive", { get: function() {
      Za = !0;
    } }), window.addEventListener("test", yo, yo), window.removeEventListener("test", yo, yo);
  } catch {
    Za = !1;
  }
  function SS(t, r, s, u, p, m, _, P, M) {
    var F = Array.prototype.slice.call(arguments, 3);
    try {
      r.apply(s, F);
    } catch (B) {
      this.onError(B);
    }
  }
  var go = !1, bi = null, Mi = !1, qa = null, wS = { onError: function(t) {
    go = !0, bi = t;
  } };
  function xS(t, r, s, u, p, m, _, P, M) {
    go = !1, bi = null, SS.apply(wS, arguments);
  }
  function _S(t, r, s, u, p, m, _, P, M) {
    if (xS.apply(this, arguments), go) {
      if (go) {
        var F = bi;
        go = !1, bi = null;
      } else throw Error(o(198));
      Mi || (Mi = !0, qa = F);
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
  function df(t) {
    if (t.tag === 13) {
      var r = t.memoizedState;
      if (r === null && (t = t.alternate, t !== null && (r = t.memoizedState)), r !== null) return r.dehydrated;
    }
    return null;
  }
  function ff(t) {
    if (Qn(t) !== t) throw Error(o(188));
  }
  function kS(t) {
    var r = t.alternate;
    if (!r) {
      if (r = Qn(t), r === null) throw Error(o(188));
      return r !== t ? null : t;
    }
    for (var s = t, u = r; ; ) {
      var p = s.return;
      if (p === null) break;
      var m = p.alternate;
      if (m === null) {
        if (u = p.return, u !== null) {
          s = u;
          continue;
        }
        break;
      }
      if (p.child === m.child) {
        for (m = p.child; m; ) {
          if (m === s) return ff(p), t;
          if (m === u) return ff(p), r;
          m = m.sibling;
        }
        throw Error(o(188));
      }
      if (s.return !== u.return) s = p, u = m;
      else {
        for (var _ = !1, P = p.child; P; ) {
          if (P === s) {
            _ = !0, s = p, u = m;
            break;
          }
          if (P === u) {
            _ = !0, u = p, s = m;
            break;
          }
          P = P.sibling;
        }
        if (!_) {
          for (P = m.child; P; ) {
            if (P === s) {
              _ = !0, s = m, u = p;
              break;
            }
            if (P === u) {
              _ = !0, u = m, s = p;
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
  function pf(t) {
    return t = kS(t), t !== null ? hf(t) : null;
  }
  function hf(t) {
    if (t.tag === 5 || t.tag === 6) return t;
    for (t = t.child; t !== null; ) {
      var r = hf(t);
      if (r !== null) return r;
      t = t.sibling;
    }
    return null;
  }
  var mf = n.unstable_scheduleCallback, yf = n.unstable_cancelCallback, TS = n.unstable_shouldYield, AS = n.unstable_requestPaint, Le = n.unstable_now, CS = n.unstable_getCurrentPriorityLevel, Ja = n.unstable_ImmediatePriority, gf = n.unstable_UserBlockingPriority, Ri = n.unstable_NormalPriority, ES = n.unstable_LowPriority, vf = n.unstable_IdlePriority, Ni = null, Wt = null;
  function PS(t) {
    if (Wt && typeof Wt.onCommitFiberRoot == "function") try {
      Wt.onCommitFiberRoot(Ni, t, void 0, (t.current.flags & 128) === 128);
    } catch {
    }
  }
  var Rt = Math.clz32 ? Math.clz32 : RS, bS = Math.log, MS = Math.LN2;
  function RS(t) {
    return t >>>= 0, t === 0 ? 32 : 31 - (bS(t) / MS | 0) | 0;
  }
  var Di = 64, ji = 4194304;
  function vo(t) {
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
    var u = 0, p = t.suspendedLanes, m = t.pingedLanes, _ = s & 268435455;
    if (_ !== 0) {
      var P = _ & ~p;
      P !== 0 ? u = vo(P) : (m &= _, m !== 0 && (u = vo(m)));
    } else _ = s & ~p, _ !== 0 ? u = vo(_) : m !== 0 && (u = vo(m));
    if (u === 0) return 0;
    if (r !== 0 && r !== u && (r & p) === 0 && (p = u & -u, m = r & -r, p >= m || p === 16 && (m & 4194240) !== 0)) return r;
    if ((u & 4) !== 0 && (u |= s & 16), r = t.entangledLanes, r !== 0) for (t = t.entanglements, r &= u; 0 < r; ) s = 31 - Rt(r), p = 1 << s, u |= t[s], r &= ~p;
    return u;
  }
  function NS(t, r) {
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
  function DS(t, r) {
    for (var s = t.suspendedLanes, u = t.pingedLanes, p = t.expirationTimes, m = t.pendingLanes; 0 < m; ) {
      var _ = 31 - Rt(m), P = 1 << _, M = p[_];
      M === -1 ? ((P & s) === 0 || (P & u) !== 0) && (p[_] = NS(P, r)) : M <= r && (t.expiredLanes |= P), m &= ~P;
    }
  }
  function el(t) {
    return t = t.pendingLanes & -1073741825, t !== 0 ? t : t & 1073741824 ? 1073741824 : 0;
  }
  function Sf() {
    var t = Di;
    return Di <<= 1, (Di & 4194240) === 0 && (Di = 64), t;
  }
  function tl(t) {
    for (var r = [], s = 0; 31 > s; s++) r.push(t);
    return r;
  }
  function So(t, r, s) {
    t.pendingLanes |= r, r !== 536870912 && (t.suspendedLanes = 0, t.pingedLanes = 0), t = t.eventTimes, r = 31 - Rt(r), t[r] = s;
  }
  function jS(t, r) {
    var s = t.pendingLanes & ~r;
    t.pendingLanes = r, t.suspendedLanes = 0, t.pingedLanes = 0, t.expiredLanes &= r, t.mutableReadLanes &= r, t.entangledLanes &= r, r = t.entanglements;
    var u = t.eventTimes;
    for (t = t.expirationTimes; 0 < s; ) {
      var p = 31 - Rt(s), m = 1 << p;
      r[p] = 0, u[p] = -1, t[p] = -1, s &= ~m;
    }
  }
  function nl(t, r) {
    var s = t.entangledLanes |= r;
    for (t = t.entanglements; s; ) {
      var u = 31 - Rt(s), p = 1 << u;
      p & r | t[u] & r && (t[u] |= r), s &= ~p;
    }
  }
  var Ae = 0;
  function wf(t) {
    return t &= -t, 1 < t ? 4 < t ? (t & 268435455) !== 0 ? 16 : 536870912 : 4 : 1;
  }
  var xf, rl, _f, kf, Tf, ol = !1, Fi = [], vn = null, Sn = null, wn = null, wo = /* @__PURE__ */ new Map(), xo = /* @__PURE__ */ new Map(), xn = [], IS = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
  function Af(t, r) {
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
        wo.delete(r.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        xo.delete(r.pointerId);
    }
  }
  function _o(t, r, s, u, p, m) {
    return t === null || t.nativeEvent !== m ? (t = { blockedOn: r, domEventName: s, eventSystemFlags: u, nativeEvent: m, targetContainers: [p] }, r !== null && (r = Fo(r), r !== null && rl(r)), t) : (t.eventSystemFlags |= u, r = t.targetContainers, p !== null && r.indexOf(p) === -1 && r.push(p), t);
  }
  function FS(t, r, s, u, p) {
    switch (r) {
      case "focusin":
        return vn = _o(vn, t, r, s, u, p), !0;
      case "dragenter":
        return Sn = _o(Sn, t, r, s, u, p), !0;
      case "mouseover":
        return wn = _o(wn, t, r, s, u, p), !0;
      case "pointerover":
        var m = p.pointerId;
        return wo.set(m, _o(wo.get(m) || null, t, r, s, u, p)), !0;
      case "gotpointercapture":
        return m = p.pointerId, xo.set(m, _o(xo.get(m) || null, t, r, s, u, p)), !0;
    }
    return !1;
  }
  function Cf(t) {
    var r = Xn(t.target);
    if (r !== null) {
      var s = Qn(r);
      if (s !== null) {
        if (r = s.tag, r === 13) {
          if (r = df(s), r !== null) {
            t.blockedOn = r, Tf(t.priority, function() {
              _f(s);
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
      var s = sl(t.domEventName, t.eventSystemFlags, r[0], t.nativeEvent);
      if (s === null) {
        s = t.nativeEvent;
        var u = new s.constructor(s.type, s);
        Ka = u, s.target.dispatchEvent(u), Ka = null;
      } else return r = Fo(s), r !== null && rl(r), t.blockedOn = s, !1;
      r.shift();
    }
    return !0;
  }
  function Ef(t, r, s) {
    Oi(t) && s.delete(r);
  }
  function OS() {
    ol = !1, vn !== null && Oi(vn) && (vn = null), Sn !== null && Oi(Sn) && (Sn = null), wn !== null && Oi(wn) && (wn = null), wo.forEach(Ef), xo.forEach(Ef);
  }
  function ko(t, r) {
    t.blockedOn === r && (t.blockedOn = null, ol || (ol = !0, n.unstable_scheduleCallback(n.unstable_NormalPriority, OS)));
  }
  function To(t) {
    function r(p) {
      return ko(p, t);
    }
    if (0 < Fi.length) {
      ko(Fi[0], t);
      for (var s = 1; s < Fi.length; s++) {
        var u = Fi[s];
        u.blockedOn === t && (u.blockedOn = null);
      }
    }
    for (vn !== null && ko(vn, t), Sn !== null && ko(Sn, t), wn !== null && ko(wn, t), wo.forEach(r), xo.forEach(r), s = 0; s < xn.length; s++) u = xn[s], u.blockedOn === t && (u.blockedOn = null);
    for (; 0 < xn.length && (s = xn[0], s.blockedOn === null); ) Cf(s), s.blockedOn === null && xn.shift();
  }
  var _r = D.ReactCurrentBatchConfig, Li = !0;
  function LS(t, r, s, u) {
    var p = Ae, m = _r.transition;
    _r.transition = null;
    try {
      Ae = 1, il(t, r, s, u);
    } finally {
      Ae = p, _r.transition = m;
    }
  }
  function VS(t, r, s, u) {
    var p = Ae, m = _r.transition;
    _r.transition = null;
    try {
      Ae = 4, il(t, r, s, u);
    } finally {
      Ae = p, _r.transition = m;
    }
  }
  function il(t, r, s, u) {
    if (Li) {
      var p = sl(t, r, s, u);
      if (p === null) kl(t, r, u, Vi, s), Af(t, u);
      else if (FS(p, t, r, s, u)) u.stopPropagation();
      else if (Af(t, u), r & 4 && -1 < IS.indexOf(t)) {
        for (; p !== null; ) {
          var m = Fo(p);
          if (m !== null && xf(m), m = sl(t, r, s, u), m === null && kl(t, r, u, Vi, s), m === p) break;
          p = m;
        }
        p !== null && u.stopPropagation();
      } else kl(t, r, u, null, s);
    }
  }
  var Vi = null;
  function sl(t, r, s, u) {
    if (Vi = null, t = Ya(u), t = Xn(t), t !== null) if (r = Qn(t), r === null) t = null;
    else if (s = r.tag, s === 13) {
      if (t = df(r), t !== null) return t;
      t = null;
    } else if (s === 3) {
      if (r.stateNode.current.memoizedState.isDehydrated) return r.tag === 3 ? r.stateNode.containerInfo : null;
      t = null;
    } else r !== t && (t = null);
    return Vi = t, null;
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
        switch (CS()) {
          case Ja:
            return 1;
          case gf:
            return 4;
          case Ri:
          case ES:
            return 16;
          case vf:
            return 536870912;
          default:
            return 16;
        }
      default:
        return 16;
    }
  }
  var _n = null, al = null, zi = null;
  function bf() {
    if (zi) return zi;
    var t, r = al, s = r.length, u, p = "value" in _n ? _n.value : _n.textContent, m = p.length;
    for (t = 0; t < s && r[t] === p[t]; t++) ;
    var _ = s - t;
    for (u = 1; u <= _ && r[s - u] === p[m - u]; u++) ;
    return zi = p.slice(t, 1 < u ? 1 - u : void 0);
  }
  function Bi(t) {
    var r = t.keyCode;
    return "charCode" in t ? (t = t.charCode, t === 0 && r === 13 && (t = 13)) : t = r, t === 10 && (t = 13), 32 <= t || t === 13 ? t : 0;
  }
  function Ui() {
    return !0;
  }
  function Mf() {
    return !1;
  }
  function vt(t) {
    function r(s, u, p, m, _) {
      this._reactName = s, this._targetInst = p, this.type = u, this.nativeEvent = m, this.target = _, this.currentTarget = null;
      for (var P in t) t.hasOwnProperty(P) && (s = t[P], this[P] = s ? s(m) : m[P]);
      return this.isDefaultPrevented = (m.defaultPrevented != null ? m.defaultPrevented : m.returnValue === !1) ? Ui : Mf, this.isPropagationStopped = Mf, this;
    }
    return K(r.prototype, { preventDefault: function() {
      this.defaultPrevented = !0;
      var s = this.nativeEvent;
      s && (s.preventDefault ? s.preventDefault() : typeof s.returnValue != "unknown" && (s.returnValue = !1), this.isDefaultPrevented = Ui);
    }, stopPropagation: function() {
      var s = this.nativeEvent;
      s && (s.stopPropagation ? s.stopPropagation() : typeof s.cancelBubble != "unknown" && (s.cancelBubble = !0), this.isPropagationStopped = Ui);
    }, persist: function() {
    }, isPersistent: Ui }), r;
  }
  var kr = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(t) {
    return t.timeStamp || Date.now();
  }, defaultPrevented: 0, isTrusted: 0 }, ll = vt(kr), Ao = K({}, kr, { view: 0, detail: 0 }), zS = vt(Ao), ul, cl, Co, $i = K({}, Ao, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: fl, button: 0, buttons: 0, relatedTarget: function(t) {
    return t.relatedTarget === void 0 ? t.fromElement === t.srcElement ? t.toElement : t.fromElement : t.relatedTarget;
  }, movementX: function(t) {
    return "movementX" in t ? t.movementX : (t !== Co && (Co && t.type === "mousemove" ? (ul = t.screenX - Co.screenX, cl = t.screenY - Co.screenY) : cl = ul = 0, Co = t), ul);
  }, movementY: function(t) {
    return "movementY" in t ? t.movementY : cl;
  } }), Rf = vt($i), BS = K({}, $i, { dataTransfer: 0 }), US = vt(BS), $S = K({}, Ao, { relatedTarget: 0 }), dl = vt($S), HS = K({}, kr, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), WS = vt(HS), GS = K({}, kr, { clipboardData: function(t) {
    return "clipboardData" in t ? t.clipboardData : window.clipboardData;
  } }), KS = vt(GS), YS = K({}, kr, { data: 0 }), Nf = vt(YS), QS = {
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
  }, XS = {
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
  }, ZS = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
  function qS(t) {
    var r = this.nativeEvent;
    return r.getModifierState ? r.getModifierState(t) : (t = ZS[t]) ? !!r[t] : !1;
  }
  function fl() {
    return qS;
  }
  var JS = K({}, Ao, { key: function(t) {
    if (t.key) {
      var r = QS[t.key] || t.key;
      if (r !== "Unidentified") return r;
    }
    return t.type === "keypress" ? (t = Bi(t), t === 13 ? "Enter" : String.fromCharCode(t)) : t.type === "keydown" || t.type === "keyup" ? XS[t.keyCode] || "Unidentified" : "";
  }, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: fl, charCode: function(t) {
    return t.type === "keypress" ? Bi(t) : 0;
  }, keyCode: function(t) {
    return t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
  }, which: function(t) {
    return t.type === "keypress" ? Bi(t) : t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
  } }), ew = vt(JS), tw = K({}, $i, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), Df = vt(tw), nw = K({}, Ao, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: fl }), rw = vt(nw), ow = K({}, kr, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), iw = vt(ow), sw = K({}, $i, {
    deltaX: function(t) {
      return "deltaX" in t ? t.deltaX : "wheelDeltaX" in t ? -t.wheelDeltaX : 0;
    },
    deltaY: function(t) {
      return "deltaY" in t ? t.deltaY : "wheelDeltaY" in t ? -t.wheelDeltaY : "wheelDelta" in t ? -t.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), aw = vt(sw), lw = [9, 13, 27, 32], pl = f && "CompositionEvent" in window, Eo = null;
  f && "documentMode" in document && (Eo = document.documentMode);
  var uw = f && "TextEvent" in window && !Eo, jf = f && (!pl || Eo && 8 < Eo && 11 >= Eo), If = " ", Ff = !1;
  function Of(t, r) {
    switch (t) {
      case "keyup":
        return lw.indexOf(r.keyCode) !== -1;
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
  function Lf(t) {
    return t = t.detail, typeof t == "object" && "data" in t ? t.data : null;
  }
  var Tr = !1;
  function cw(t, r) {
    switch (t) {
      case "compositionend":
        return Lf(r);
      case "keypress":
        return r.which !== 32 ? null : (Ff = !0, If);
      case "textInput":
        return t = r.data, t === If && Ff ? null : t;
      default:
        return null;
    }
  }
  function dw(t, r) {
    if (Tr) return t === "compositionend" || !pl && Of(t, r) ? (t = bf(), zi = al = _n = null, Tr = !1, t) : null;
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
        return jf && r.locale !== "ko" ? null : r.data;
      default:
        return null;
    }
  }
  var fw = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
  function Vf(t) {
    var r = t && t.nodeName && t.nodeName.toLowerCase();
    return r === "input" ? !!fw[t.type] : r === "textarea";
  }
  function zf(t, r, s, u) {
    sf(u), r = Yi(r, "onChange"), 0 < r.length && (s = new ll("onChange", "change", null, s, u), t.push({ event: s, listeners: r }));
  }
  var Po = null, bo = null;
  function pw(t) {
    op(t, 0);
  }
  function Hi(t) {
    var r = br(t);
    if (co(r)) return t;
  }
  function hw(t, r) {
    if (t === "change") return r;
  }
  var Bf = !1;
  if (f) {
    var hl;
    if (f) {
      var ml = "oninput" in document;
      if (!ml) {
        var Uf = document.createElement("div");
        Uf.setAttribute("oninput", "return;"), ml = typeof Uf.oninput == "function";
      }
      hl = ml;
    } else hl = !1;
    Bf = hl && (!document.documentMode || 9 < document.documentMode);
  }
  function $f() {
    Po && (Po.detachEvent("onpropertychange", Hf), bo = Po = null);
  }
  function Hf(t) {
    if (t.propertyName === "value" && Hi(bo)) {
      var r = [];
      zf(r, bo, t, Ya(t)), cf(pw, r);
    }
  }
  function mw(t, r, s) {
    t === "focusin" ? ($f(), Po = r, bo = s, Po.attachEvent("onpropertychange", Hf)) : t === "focusout" && $f();
  }
  function yw(t) {
    if (t === "selectionchange" || t === "keyup" || t === "keydown") return Hi(bo);
  }
  function gw(t, r) {
    if (t === "click") return Hi(r);
  }
  function vw(t, r) {
    if (t === "input" || t === "change") return Hi(r);
  }
  function Sw(t, r) {
    return t === r && (t !== 0 || 1 / t === 1 / r) || t !== t && r !== r;
  }
  var Nt = typeof Object.is == "function" ? Object.is : Sw;
  function Mo(t, r) {
    if (Nt(t, r)) return !0;
    if (typeof t != "object" || t === null || typeof r != "object" || r === null) return !1;
    var s = Object.keys(t), u = Object.keys(r);
    if (s.length !== u.length) return !1;
    for (u = 0; u < s.length; u++) {
      var p = s[u];
      if (!y.call(r, p) || !Nt(t[p], r[p])) return !1;
    }
    return !0;
  }
  function Wf(t) {
    for (; t && t.firstChild; ) t = t.firstChild;
    return t;
  }
  function Gf(t, r) {
    var s = Wf(t);
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
      s = Wf(s);
    }
  }
  function Kf(t, r) {
    return t && r ? t === r ? !0 : t && t.nodeType === 3 ? !1 : r && r.nodeType === 3 ? Kf(t, r.parentNode) : "contains" in t ? t.contains(r) : t.compareDocumentPosition ? !!(t.compareDocumentPosition(r) & 16) : !1 : !1;
  }
  function Yf() {
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
  function yl(t) {
    var r = t && t.nodeName && t.nodeName.toLowerCase();
    return r && (r === "input" && (t.type === "text" || t.type === "search" || t.type === "tel" || t.type === "url" || t.type === "password") || r === "textarea" || t.contentEditable === "true");
  }
  function ww(t) {
    var r = Yf(), s = t.focusedElem, u = t.selectionRange;
    if (r !== s && s && s.ownerDocument && Kf(s.ownerDocument.documentElement, s)) {
      if (u !== null && yl(s)) {
        if (r = u.start, t = u.end, t === void 0 && (t = r), "selectionStart" in s) s.selectionStart = r, s.selectionEnd = Math.min(t, s.value.length);
        else if (t = (r = s.ownerDocument || document) && r.defaultView || window, t.getSelection) {
          t = t.getSelection();
          var p = s.textContent.length, m = Math.min(u.start, p);
          u = u.end === void 0 ? m : Math.min(u.end, p), !t.extend && m > u && (p = u, u = m, m = p), p = Gf(s, m);
          var _ = Gf(
            s,
            u
          );
          p && _ && (t.rangeCount !== 1 || t.anchorNode !== p.node || t.anchorOffset !== p.offset || t.focusNode !== _.node || t.focusOffset !== _.offset) && (r = r.createRange(), r.setStart(p.node, p.offset), t.removeAllRanges(), m > u ? (t.addRange(r), t.extend(_.node, _.offset)) : (r.setEnd(_.node, _.offset), t.addRange(r)));
        }
      }
      for (r = [], t = s; t = t.parentNode; ) t.nodeType === 1 && r.push({ element: t, left: t.scrollLeft, top: t.scrollTop });
      for (typeof s.focus == "function" && s.focus(), s = 0; s < r.length; s++) t = r[s], t.element.scrollLeft = t.left, t.element.scrollTop = t.top;
    }
  }
  var xw = f && "documentMode" in document && 11 >= document.documentMode, Ar = null, gl = null, Ro = null, vl = !1;
  function Qf(t, r, s) {
    var u = s.window === s ? s.document : s.nodeType === 9 ? s : s.ownerDocument;
    vl || Ar == null || Ar !== Yn(u) || (u = Ar, "selectionStart" in u && yl(u) ? u = { start: u.selectionStart, end: u.selectionEnd } : (u = (u.ownerDocument && u.ownerDocument.defaultView || window).getSelection(), u = { anchorNode: u.anchorNode, anchorOffset: u.anchorOffset, focusNode: u.focusNode, focusOffset: u.focusOffset }), Ro && Mo(Ro, u) || (Ro = u, u = Yi(gl, "onSelect"), 0 < u.length && (r = new ll("onSelect", "select", null, r, s), t.push({ event: r, listeners: u }), r.target = Ar)));
  }
  function Wi(t, r) {
    var s = {};
    return s[t.toLowerCase()] = r.toLowerCase(), s["Webkit" + t] = "webkit" + r, s["Moz" + t] = "moz" + r, s;
  }
  var Cr = { animationend: Wi("Animation", "AnimationEnd"), animationiteration: Wi("Animation", "AnimationIteration"), animationstart: Wi("Animation", "AnimationStart"), transitionend: Wi("Transition", "TransitionEnd") }, Sl = {}, Xf = {};
  f && (Xf = document.createElement("div").style, "AnimationEvent" in window || (delete Cr.animationend.animation, delete Cr.animationiteration.animation, delete Cr.animationstart.animation), "TransitionEvent" in window || delete Cr.transitionend.transition);
  function Gi(t) {
    if (Sl[t]) return Sl[t];
    if (!Cr[t]) return t;
    var r = Cr[t], s;
    for (s in r) if (r.hasOwnProperty(s) && s in Xf) return Sl[t] = r[s];
    return t;
  }
  var Zf = Gi("animationend"), qf = Gi("animationiteration"), Jf = Gi("animationstart"), ep = Gi("transitionend"), tp = /* @__PURE__ */ new Map(), np = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
  function kn(t, r) {
    tp.set(t, r), c(r, [t]);
  }
  for (var wl = 0; wl < np.length; wl++) {
    var xl = np[wl], _w = xl.toLowerCase(), kw = xl[0].toUpperCase() + xl.slice(1);
    kn(_w, "on" + kw);
  }
  kn(Zf, "onAnimationEnd"), kn(qf, "onAnimationIteration"), kn(Jf, "onAnimationStart"), kn("dblclick", "onDoubleClick"), kn("focusin", "onFocus"), kn("focusout", "onBlur"), kn(ep, "onTransitionEnd"), d("onMouseEnter", ["mouseout", "mouseover"]), d("onMouseLeave", ["mouseout", "mouseover"]), d("onPointerEnter", ["pointerout", "pointerover"]), d("onPointerLeave", ["pointerout", "pointerover"]), c("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), c("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), c("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]), c("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), c("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), c("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
  var No = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), Tw = new Set("cancel close invalid load scroll toggle".split(" ").concat(No));
  function rp(t, r, s) {
    var u = t.type || "unknown-event";
    t.currentTarget = s, _S(u, r, void 0, t), t.currentTarget = null;
  }
  function op(t, r) {
    r = (r & 4) !== 0;
    for (var s = 0; s < t.length; s++) {
      var u = t[s], p = u.event;
      u = u.listeners;
      e: {
        var m = void 0;
        if (r) for (var _ = u.length - 1; 0 <= _; _--) {
          var P = u[_], M = P.instance, F = P.currentTarget;
          if (P = P.listener, M !== m && p.isPropagationStopped()) break e;
          rp(p, P, F), m = M;
        }
        else for (_ = 0; _ < u.length; _++) {
          if (P = u[_], M = P.instance, F = P.currentTarget, P = P.listener, M !== m && p.isPropagationStopped()) break e;
          rp(p, P, F), m = M;
        }
      }
    }
    if (Mi) throw t = qa, Mi = !1, qa = null, t;
  }
  function Me(t, r) {
    var s = r[bl];
    s === void 0 && (s = r[bl] = /* @__PURE__ */ new Set());
    var u = t + "__bubble";
    s.has(u) || (ip(r, t, 2, !1), s.add(u));
  }
  function _l(t, r, s) {
    var u = 0;
    r && (u |= 4), ip(s, t, u, r);
  }
  var Ki = "_reactListening" + Math.random().toString(36).slice(2);
  function Do(t) {
    if (!t[Ki]) {
      t[Ki] = !0, i.forEach(function(s) {
        s !== "selectionchange" && (Tw.has(s) || _l(s, !1, t), _l(s, !0, t));
      });
      var r = t.nodeType === 9 ? t : t.ownerDocument;
      r === null || r[Ki] || (r[Ki] = !0, _l("selectionchange", !1, r));
    }
  }
  function ip(t, r, s, u) {
    switch (Pf(r)) {
      case 1:
        var p = LS;
        break;
      case 4:
        p = VS;
        break;
      default:
        p = il;
    }
    s = p.bind(null, r, s, t), p = void 0, !Za || r !== "touchstart" && r !== "touchmove" && r !== "wheel" || (p = !0), u ? p !== void 0 ? t.addEventListener(r, s, { capture: !0, passive: p }) : t.addEventListener(r, s, !0) : p !== void 0 ? t.addEventListener(r, s, { passive: p }) : t.addEventListener(r, s, !1);
  }
  function kl(t, r, s, u, p) {
    var m = u;
    if ((r & 1) === 0 && (r & 2) === 0 && u !== null) e: for (; ; ) {
      if (u === null) return;
      var _ = u.tag;
      if (_ === 3 || _ === 4) {
        var P = u.stateNode.containerInfo;
        if (P === p || P.nodeType === 8 && P.parentNode === p) break;
        if (_ === 4) for (_ = u.return; _ !== null; ) {
          var M = _.tag;
          if ((M === 3 || M === 4) && (M = _.stateNode.containerInfo, M === p || M.nodeType === 8 && M.parentNode === p)) return;
          _ = _.return;
        }
        for (; P !== null; ) {
          if (_ = Xn(P), _ === null) return;
          if (M = _.tag, M === 5 || M === 6) {
            u = m = _;
            continue e;
          }
          P = P.parentNode;
        }
      }
      u = u.return;
    }
    cf(function() {
      var F = m, B = Ya(s), H = [];
      e: {
        var z = tp.get(t);
        if (z !== void 0) {
          var ee = ll, ne = t;
          switch (t) {
            case "keypress":
              if (Bi(s) === 0) break e;
            case "keydown":
            case "keyup":
              ee = ew;
              break;
            case "focusin":
              ne = "focus", ee = dl;
              break;
            case "focusout":
              ne = "blur", ee = dl;
              break;
            case "beforeblur":
            case "afterblur":
              ee = dl;
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
              ee = Rf;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              ee = US;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              ee = rw;
              break;
            case Zf:
            case qf:
            case Jf:
              ee = WS;
              break;
            case ep:
              ee = iw;
              break;
            case "scroll":
              ee = zS;
              break;
            case "wheel":
              ee = aw;
              break;
            case "copy":
            case "cut":
            case "paste":
              ee = KS;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              ee = Df;
          }
          var oe = (r & 4) !== 0, Ve = !oe && t === "scroll", j = oe ? z !== null ? z + "Capture" : null : z;
          oe = [];
          for (var N = F, I; N !== null; ) {
            I = N;
            var Y = I.stateNode;
            if (I.tag === 5 && Y !== null && (I = Y, j !== null && (Y = mo(N, j), Y != null && oe.push(jo(N, Y, I)))), Ve) break;
            N = N.return;
          }
          0 < oe.length && (z = new ee(z, ne, null, s, B), H.push({ event: z, listeners: oe }));
        }
      }
      if ((r & 7) === 0) {
        e: {
          if (z = t === "mouseover" || t === "pointerover", ee = t === "mouseout" || t === "pointerout", z && s !== Ka && (ne = s.relatedTarget || s.fromElement) && (Xn(ne) || ne[on])) break e;
          if ((ee || z) && (z = B.window === B ? B : (z = B.ownerDocument) ? z.defaultView || z.parentWindow : window, ee ? (ne = s.relatedTarget || s.toElement, ee = F, ne = ne ? Xn(ne) : null, ne !== null && (Ve = Qn(ne), ne !== Ve || ne.tag !== 5 && ne.tag !== 6) && (ne = null)) : (ee = null, ne = F), ee !== ne)) {
            if (oe = Rf, Y = "onMouseLeave", j = "onMouseEnter", N = "mouse", (t === "pointerout" || t === "pointerover") && (oe = Df, Y = "onPointerLeave", j = "onPointerEnter", N = "pointer"), Ve = ee == null ? z : br(ee), I = ne == null ? z : br(ne), z = new oe(Y, N + "leave", ee, s, B), z.target = Ve, z.relatedTarget = I, Y = null, Xn(B) === F && (oe = new oe(j, N + "enter", ne, s, B), oe.target = I, oe.relatedTarget = Ve, Y = oe), Ve = Y, ee && ne) t: {
              for (oe = ee, j = ne, N = 0, I = oe; I; I = Er(I)) N++;
              for (I = 0, Y = j; Y; Y = Er(Y)) I++;
              for (; 0 < N - I; ) oe = Er(oe), N--;
              for (; 0 < I - N; ) j = Er(j), I--;
              for (; N--; ) {
                if (oe === j || j !== null && oe === j.alternate) break t;
                oe = Er(oe), j = Er(j);
              }
              oe = null;
            }
            else oe = null;
            ee !== null && sp(H, z, ee, oe, !1), ne !== null && Ve !== null && sp(H, Ve, ne, oe, !0);
          }
        }
        e: {
          if (z = F ? br(F) : window, ee = z.nodeName && z.nodeName.toLowerCase(), ee === "select" || ee === "input" && z.type === "file") var ie = hw;
          else if (Vf(z)) if (Bf) ie = vw;
          else {
            ie = yw;
            var se = mw;
          }
          else (ee = z.nodeName) && ee.toLowerCase() === "input" && (z.type === "checkbox" || z.type === "radio") && (ie = gw);
          if (ie && (ie = ie(t, F))) {
            zf(H, ie, s, B);
            break e;
          }
          se && se(t, z, F), t === "focusout" && (se = z._wrapperState) && se.controlled && z.type === "number" && Ua(z, "number", z.value);
        }
        switch (se = F ? br(F) : window, t) {
          case "focusin":
            (Vf(se) || se.contentEditable === "true") && (Ar = se, gl = F, Ro = null);
            break;
          case "focusout":
            Ro = gl = Ar = null;
            break;
          case "mousedown":
            vl = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            vl = !1, Qf(H, s, B);
            break;
          case "selectionchange":
            if (xw) break;
          case "keydown":
          case "keyup":
            Qf(H, s, B);
        }
        var ae;
        if (pl) e: {
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
        else Tr ? Of(t, s) && (de = "onCompositionEnd") : t === "keydown" && s.keyCode === 229 && (de = "onCompositionStart");
        de && (jf && s.locale !== "ko" && (Tr || de !== "onCompositionStart" ? de === "onCompositionEnd" && Tr && (ae = bf()) : (_n = B, al = "value" in _n ? _n.value : _n.textContent, Tr = !0)), se = Yi(F, de), 0 < se.length && (de = new Nf(de, t, null, s, B), H.push({ event: de, listeners: se }), ae ? de.data = ae : (ae = Lf(s), ae !== null && (de.data = ae)))), (ae = uw ? cw(t, s) : dw(t, s)) && (F = Yi(F, "onBeforeInput"), 0 < F.length && (B = new Nf("onBeforeInput", "beforeinput", null, s, B), H.push({ event: B, listeners: F }), B.data = ae));
      }
      op(H, r);
    });
  }
  function jo(t, r, s) {
    return { instance: t, listener: r, currentTarget: s };
  }
  function Yi(t, r) {
    for (var s = r + "Capture", u = []; t !== null; ) {
      var p = t, m = p.stateNode;
      p.tag === 5 && m !== null && (p = m, m = mo(t, s), m != null && u.unshift(jo(t, m, p)), m = mo(t, r), m != null && u.push(jo(t, m, p))), t = t.return;
    }
    return u;
  }
  function Er(t) {
    if (t === null) return null;
    do
      t = t.return;
    while (t && t.tag !== 5);
    return t || null;
  }
  function sp(t, r, s, u, p) {
    for (var m = r._reactName, _ = []; s !== null && s !== u; ) {
      var P = s, M = P.alternate, F = P.stateNode;
      if (M !== null && M === u) break;
      P.tag === 5 && F !== null && (P = F, p ? (M = mo(s, m), M != null && _.unshift(jo(s, M, P))) : p || (M = mo(s, m), M != null && _.push(jo(s, M, P)))), s = s.return;
    }
    _.length !== 0 && t.push({ event: r, listeners: _ });
  }
  var Aw = /\r\n?/g, Cw = /\u0000|\uFFFD/g;
  function ap(t) {
    return (typeof t == "string" ? t : "" + t).replace(Aw, `
`).replace(Cw, "");
  }
  function Qi(t, r, s) {
    if (r = ap(r), ap(t) !== r && s) throw Error(o(425));
  }
  function Xi() {
  }
  var Tl = null, Al = null;
  function Cl(t, r) {
    return t === "textarea" || t === "noscript" || typeof r.children == "string" || typeof r.children == "number" || typeof r.dangerouslySetInnerHTML == "object" && r.dangerouslySetInnerHTML !== null && r.dangerouslySetInnerHTML.__html != null;
  }
  var El = typeof setTimeout == "function" ? setTimeout : void 0, Ew = typeof clearTimeout == "function" ? clearTimeout : void 0, lp = typeof Promise == "function" ? Promise : void 0, Pw = typeof queueMicrotask == "function" ? queueMicrotask : typeof lp < "u" ? function(t) {
    return lp.resolve(null).then(t).catch(bw);
  } : El;
  function bw(t) {
    setTimeout(function() {
      throw t;
    });
  }
  function Pl(t, r) {
    var s = r, u = 0;
    do {
      var p = s.nextSibling;
      if (t.removeChild(s), p && p.nodeType === 8) if (s = p.data, s === "/$") {
        if (u === 0) {
          t.removeChild(p), To(r);
          return;
        }
        u--;
      } else s !== "$" && s !== "$?" && s !== "$!" || u++;
      s = p;
    } while (s);
    To(r);
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
  function up(t) {
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
  var Pr = Math.random().toString(36).slice(2), Gt = "__reactFiber$" + Pr, Io = "__reactProps$" + Pr, on = "__reactContainer$" + Pr, bl = "__reactEvents$" + Pr, Mw = "__reactListeners$" + Pr, Rw = "__reactHandles$" + Pr;
  function Xn(t) {
    var r = t[Gt];
    if (r) return r;
    for (var s = t.parentNode; s; ) {
      if (r = s[on] || s[Gt]) {
        if (s = r.alternate, r.child !== null || s !== null && s.child !== null) for (t = up(t); t !== null; ) {
          if (s = t[Gt]) return s;
          t = up(t);
        }
        return r;
      }
      t = s, s = t.parentNode;
    }
    return null;
  }
  function Fo(t) {
    return t = t[Gt] || t[on], !t || t.tag !== 5 && t.tag !== 6 && t.tag !== 13 && t.tag !== 3 ? null : t;
  }
  function br(t) {
    if (t.tag === 5 || t.tag === 6) return t.stateNode;
    throw Error(o(33));
  }
  function Zi(t) {
    return t[Io] || null;
  }
  var Ml = [], Mr = -1;
  function An(t) {
    return { current: t };
  }
  function Re(t) {
    0 > Mr || (t.current = Ml[Mr], Ml[Mr] = null, Mr--);
  }
  function Pe(t, r) {
    Mr++, Ml[Mr] = t.current, t.current = r;
  }
  var Cn = {}, Je = An(Cn), lt = An(!1), Zn = Cn;
  function Rr(t, r) {
    var s = t.type.contextTypes;
    if (!s) return Cn;
    var u = t.stateNode;
    if (u && u.__reactInternalMemoizedUnmaskedChildContext === r) return u.__reactInternalMemoizedMaskedChildContext;
    var p = {}, m;
    for (m in s) p[m] = r[m];
    return u && (t = t.stateNode, t.__reactInternalMemoizedUnmaskedChildContext = r, t.__reactInternalMemoizedMaskedChildContext = p), p;
  }
  function ut(t) {
    return t = t.childContextTypes, t != null;
  }
  function qi() {
    Re(lt), Re(Je);
  }
  function cp(t, r, s) {
    if (Je.current !== Cn) throw Error(o(168));
    Pe(Je, r), Pe(lt, s);
  }
  function dp(t, r, s) {
    var u = t.stateNode;
    if (r = r.childContextTypes, typeof u.getChildContext != "function") return s;
    u = u.getChildContext();
    for (var p in u) if (!(p in r)) throw Error(o(108, W(t) || "Unknown", p));
    return K({}, s, u);
  }
  function Ji(t) {
    return t = (t = t.stateNode) && t.__reactInternalMemoizedMergedChildContext || Cn, Zn = Je.current, Pe(Je, t), Pe(lt, lt.current), !0;
  }
  function fp(t, r, s) {
    var u = t.stateNode;
    if (!u) throw Error(o(169));
    s ? (t = dp(t, r, Zn), u.__reactInternalMemoizedMergedChildContext = t, Re(lt), Re(Je), Pe(Je, t)) : Re(lt), Pe(lt, s);
  }
  var sn = null, es = !1, Rl = !1;
  function pp(t) {
    sn === null ? sn = [t] : sn.push(t);
  }
  function Nw(t) {
    es = !0, pp(t);
  }
  function En() {
    if (!Rl && sn !== null) {
      Rl = !0;
      var t = 0, r = Ae;
      try {
        var s = sn;
        for (Ae = 1; t < s.length; t++) {
          var u = s[t];
          do
            u = u(!0);
          while (u !== null);
        }
        sn = null, es = !1;
      } catch (p) {
        throw sn !== null && (sn = sn.slice(t + 1)), mf(Ja, En), p;
      } finally {
        Ae = r, Rl = !1;
      }
    }
    return null;
  }
  var Nr = [], Dr = 0, ts = null, ns = 0, _t = [], kt = 0, qn = null, an = 1, ln = "";
  function Jn(t, r) {
    Nr[Dr++] = ns, Nr[Dr++] = ts, ts = t, ns = r;
  }
  function hp(t, r, s) {
    _t[kt++] = an, _t[kt++] = ln, _t[kt++] = qn, qn = t;
    var u = an;
    t = ln;
    var p = 32 - Rt(u) - 1;
    u &= ~(1 << p), s += 1;
    var m = 32 - Rt(r) + p;
    if (30 < m) {
      var _ = p - p % 5;
      m = (u & (1 << _) - 1).toString(32), u >>= _, p -= _, an = 1 << 32 - Rt(r) + p | s << p | u, ln = m + t;
    } else an = 1 << m | s << p | u, ln = t;
  }
  function Nl(t) {
    t.return !== null && (Jn(t, 1), hp(t, 1, 0));
  }
  function Dl(t) {
    for (; t === ts; ) ts = Nr[--Dr], Nr[Dr] = null, ns = Nr[--Dr], Nr[Dr] = null;
    for (; t === qn; ) qn = _t[--kt], _t[kt] = null, ln = _t[--kt], _t[kt] = null, an = _t[--kt], _t[kt] = null;
  }
  var St = null, wt = null, Ne = !1, Dt = null;
  function mp(t, r) {
    var s = Et(5, null, null, 0);
    s.elementType = "DELETED", s.stateNode = r, s.return = t, r = t.deletions, r === null ? (t.deletions = [s], t.flags |= 16) : r.push(s);
  }
  function yp(t, r) {
    switch (t.tag) {
      case 5:
        var s = t.type;
        return r = r.nodeType !== 1 || s.toLowerCase() !== r.nodeName.toLowerCase() ? null : r, r !== null ? (t.stateNode = r, St = t, wt = Tn(r.firstChild), !0) : !1;
      case 6:
        return r = t.pendingProps === "" || r.nodeType !== 3 ? null : r, r !== null ? (t.stateNode = r, St = t, wt = null, !0) : !1;
      case 13:
        return r = r.nodeType !== 8 ? null : r, r !== null ? (s = qn !== null ? { id: an, overflow: ln } : null, t.memoizedState = { dehydrated: r, treeContext: s, retryLane: 1073741824 }, s = Et(18, null, null, 0), s.stateNode = r, s.return = t, t.child = s, St = t, wt = null, !0) : !1;
      default:
        return !1;
    }
  }
  function jl(t) {
    return (t.mode & 1) !== 0 && (t.flags & 128) === 0;
  }
  function Il(t) {
    if (Ne) {
      var r = wt;
      if (r) {
        var s = r;
        if (!yp(t, r)) {
          if (jl(t)) throw Error(o(418));
          r = Tn(s.nextSibling);
          var u = St;
          r && yp(t, r) ? mp(u, s) : (t.flags = t.flags & -4097 | 2, Ne = !1, St = t);
        }
      } else {
        if (jl(t)) throw Error(o(418));
        t.flags = t.flags & -4097 | 2, Ne = !1, St = t;
      }
    }
  }
  function gp(t) {
    for (t = t.return; t !== null && t.tag !== 5 && t.tag !== 3 && t.tag !== 13; ) t = t.return;
    St = t;
  }
  function rs(t) {
    if (t !== St) return !1;
    if (!Ne) return gp(t), Ne = !0, !1;
    var r;
    if ((r = t.tag !== 3) && !(r = t.tag !== 5) && (r = t.type, r = r !== "head" && r !== "body" && !Cl(t.type, t.memoizedProps)), r && (r = wt)) {
      if (jl(t)) throw vp(), Error(o(418));
      for (; r; ) mp(t, r), r = Tn(r.nextSibling);
    }
    if (gp(t), t.tag === 13) {
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
  function vp() {
    for (var t = wt; t; ) t = Tn(t.nextSibling);
  }
  function jr() {
    wt = St = null, Ne = !1;
  }
  function Fl(t) {
    Dt === null ? Dt = [t] : Dt.push(t);
  }
  var Dw = D.ReactCurrentBatchConfig;
  function Oo(t, r, s) {
    if (t = s.ref, t !== null && typeof t != "function" && typeof t != "object") {
      if (s._owner) {
        if (s = s._owner, s) {
          if (s.tag !== 1) throw Error(o(309));
          var u = s.stateNode;
        }
        if (!u) throw Error(o(147, t));
        var p = u, m = "" + t;
        return r !== null && r.ref !== null && typeof r.ref == "function" && r.ref._stringRef === m ? r.ref : (r = function(_) {
          var P = p.refs;
          _ === null ? delete P[m] : P[m] = _;
        }, r._stringRef = m, r);
      }
      if (typeof t != "string") throw Error(o(284));
      if (!s._owner) throw Error(o(290, t));
    }
    return t;
  }
  function os(t, r) {
    throw t = Object.prototype.toString.call(r), Error(o(31, t === "[object Object]" ? "object with keys {" + Object.keys(r).join(", ") + "}" : t));
  }
  function Sp(t) {
    var r = t._init;
    return r(t._payload);
  }
  function wp(t) {
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
    function p(j, N) {
      return j = In(j, N), j.index = 0, j.sibling = null, j;
    }
    function m(j, N, I) {
      return j.index = I, t ? (I = j.alternate, I !== null ? (I = I.index, I < N ? (j.flags |= 2, N) : I) : (j.flags |= 2, N)) : (j.flags |= 1048576, N);
    }
    function _(j) {
      return t && j.alternate === null && (j.flags |= 2), j;
    }
    function P(j, N, I, Y) {
      return N === null || N.tag !== 6 ? (N = Eu(I, j.mode, Y), N.return = j, N) : (N = p(N, I), N.return = j, N);
    }
    function M(j, N, I, Y) {
      var ie = I.type;
      return ie === Z ? B(j, N, I.props.children, Y, I.key) : N !== null && (N.elementType === ie || typeof ie == "object" && ie !== null && ie.$$typeof === ue && Sp(ie) === N.type) ? (Y = p(N, I.props), Y.ref = Oo(j, N, I), Y.return = j, Y) : (Y = Ps(I.type, I.key, I.props, null, j.mode, Y), Y.ref = Oo(j, N, I), Y.return = j, Y);
    }
    function F(j, N, I, Y) {
      return N === null || N.tag !== 4 || N.stateNode.containerInfo !== I.containerInfo || N.stateNode.implementation !== I.implementation ? (N = Pu(I, j.mode, Y), N.return = j, N) : (N = p(N, I.children || []), N.return = j, N);
    }
    function B(j, N, I, Y, ie) {
      return N === null || N.tag !== 7 ? (N = ar(I, j.mode, Y, ie), N.return = j, N) : (N = p(N, I), N.return = j, N);
    }
    function H(j, N, I) {
      if (typeof N == "string" && N !== "" || typeof N == "number") return N = Eu("" + N, j.mode, I), N.return = j, N;
      if (typeof N == "object" && N !== null) {
        switch (N.$$typeof) {
          case L:
            return I = Ps(N.type, N.key, N.props, null, j.mode, I), I.ref = Oo(j, null, N), I.return = j, I;
          case X:
            return N = Pu(N, j.mode, I), N.return = j, N;
          case ue:
            var Y = N._init;
            return H(j, Y(N._payload), I);
        }
        if (fo(N) || q(N)) return N = ar(N, j.mode, I, null), N.return = j, N;
        os(j, N);
      }
      return null;
    }
    function z(j, N, I, Y) {
      var ie = N !== null ? N.key : null;
      if (typeof I == "string" && I !== "" || typeof I == "number") return ie !== null ? null : P(j, N, "" + I, Y);
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
        if (fo(I) || q(I)) return ie !== null ? null : B(j, N, I, Y, null);
        os(j, I);
      }
      return null;
    }
    function ee(j, N, I, Y, ie) {
      if (typeof Y == "string" && Y !== "" || typeof Y == "number") return j = j.get(I) || null, P(N, j, "" + Y, ie);
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
        if (fo(Y) || q(Y)) return j = j.get(I) || null, B(N, j, Y, ie, null);
        os(N, Y);
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
      return t && ae.forEach(function(f1) {
        return r(j, f1);
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
                      s(j, se.sibling), N = p(se, I.props.children), N.return = j, j = N;
                      break e;
                    }
                  } else if (se.elementType === ie || typeof ie == "object" && ie !== null && ie.$$typeof === ue && Sp(ie) === se.type) {
                    s(j, se.sibling), N = p(se, I.props), N.ref = Oo(j, se, I), N.return = j, j = N;
                    break e;
                  }
                  s(j, se);
                  break;
                } else r(j, se);
                se = se.sibling;
              }
              I.type === Z ? (N = ar(I.props.children, j.mode, Y, I.key), N.return = j, j = N) : (Y = Ps(I.type, I.key, I.props, null, j.mode, Y), Y.ref = Oo(j, N, I), Y.return = j, j = Y);
            }
            return _(j);
          case X:
            e: {
              for (se = I.key; N !== null; ) {
                if (N.key === se) if (N.tag === 4 && N.stateNode.containerInfo === I.containerInfo && N.stateNode.implementation === I.implementation) {
                  s(j, N.sibling), N = p(N, I.children || []), N.return = j, j = N;
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
        if (fo(I)) return ne(j, N, I, Y);
        if (q(I)) return oe(j, N, I, Y);
        os(j, I);
      }
      return typeof I == "string" && I !== "" || typeof I == "number" ? (I = "" + I, N !== null && N.tag === 6 ? (s(j, N.sibling), N = p(N, I), N.return = j, j = N) : (s(j, N), N = Eu(I, j.mode, Y), N.return = j, j = N), _(j)) : s(j, N);
    }
    return Ve;
  }
  var Ir = wp(!0), xp = wp(!1), is = An(null), ss = null, Fr = null, Ol = null;
  function Ll() {
    Ol = Fr = ss = null;
  }
  function Vl(t) {
    var r = is.current;
    Re(is), t._currentValue = r;
  }
  function zl(t, r, s) {
    for (; t !== null; ) {
      var u = t.alternate;
      if ((t.childLanes & r) !== r ? (t.childLanes |= r, u !== null && (u.childLanes |= r)) : u !== null && (u.childLanes & r) !== r && (u.childLanes |= r), t === s) break;
      t = t.return;
    }
  }
  function Or(t, r) {
    ss = t, Ol = Fr = null, t = t.dependencies, t !== null && t.firstContext !== null && ((t.lanes & r) !== 0 && (ct = !0), t.firstContext = null);
  }
  function Tt(t) {
    var r = t._currentValue;
    if (Ol !== t) if (t = { context: t, memoizedValue: r, next: null }, Fr === null) {
      if (ss === null) throw Error(o(308));
      Fr = t, ss.dependencies = { lanes: 0, firstContext: t };
    } else Fr = Fr.next = t;
    return r;
  }
  var er = null;
  function Bl(t) {
    er === null ? er = [t] : er.push(t);
  }
  function _p(t, r, s, u) {
    var p = r.interleaved;
    return p === null ? (s.next = s, Bl(r)) : (s.next = p.next, p.next = s), r.interleaved = s, un(t, u);
  }
  function un(t, r) {
    t.lanes |= r;
    var s = t.alternate;
    for (s !== null && (s.lanes |= r), s = t, t = t.return; t !== null; ) t.childLanes |= r, s = t.alternate, s !== null && (s.childLanes |= r), s = t, t = t.return;
    return s.tag === 3 ? s.stateNode : null;
  }
  var Pn = !1;
  function Ul(t) {
    t.updateQueue = { baseState: t.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
  }
  function kp(t, r) {
    t = t.updateQueue, r.updateQueue === t && (r.updateQueue = { baseState: t.baseState, firstBaseUpdate: t.firstBaseUpdate, lastBaseUpdate: t.lastBaseUpdate, shared: t.shared, effects: t.effects });
  }
  function cn(t, r) {
    return { eventTime: t, lane: r, tag: 0, payload: null, callback: null, next: null };
  }
  function bn(t, r, s) {
    var u = t.updateQueue;
    if (u === null) return null;
    if (u = u.shared, (_e & 2) !== 0) {
      var p = u.pending;
      return p === null ? r.next = r : (r.next = p.next, p.next = r), u.pending = r, un(t, s);
    }
    return p = u.interleaved, p === null ? (r.next = r, Bl(u)) : (r.next = p.next, p.next = r), u.interleaved = r, un(t, s);
  }
  function as(t, r, s) {
    if (r = r.updateQueue, r !== null && (r = r.shared, (s & 4194240) !== 0)) {
      var u = r.lanes;
      u &= t.pendingLanes, s |= u, r.lanes = s, nl(t, s);
    }
  }
  function Tp(t, r) {
    var s = t.updateQueue, u = t.alternate;
    if (u !== null && (u = u.updateQueue, s === u)) {
      var p = null, m = null;
      if (s = s.firstBaseUpdate, s !== null) {
        do {
          var _ = { eventTime: s.eventTime, lane: s.lane, tag: s.tag, payload: s.payload, callback: s.callback, next: null };
          m === null ? p = m = _ : m = m.next = _, s = s.next;
        } while (s !== null);
        m === null ? p = m = r : m = m.next = r;
      } else p = m = r;
      s = { baseState: u.baseState, firstBaseUpdate: p, lastBaseUpdate: m, shared: u.shared, effects: u.effects }, t.updateQueue = s;
      return;
    }
    t = s.lastBaseUpdate, t === null ? s.firstBaseUpdate = r : t.next = r, s.lastBaseUpdate = r;
  }
  function ls(t, r, s, u) {
    var p = t.updateQueue;
    Pn = !1;
    var m = p.firstBaseUpdate, _ = p.lastBaseUpdate, P = p.shared.pending;
    if (P !== null) {
      p.shared.pending = null;
      var M = P, F = M.next;
      M.next = null, _ === null ? m = F : _.next = F, _ = M;
      var B = t.alternate;
      B !== null && (B = B.updateQueue, P = B.lastBaseUpdate, P !== _ && (P === null ? B.firstBaseUpdate = F : P.next = F, B.lastBaseUpdate = M));
    }
    if (m !== null) {
      var H = p.baseState;
      _ = 0, B = F = M = null, P = m;
      do {
        var z = P.lane, ee = P.eventTime;
        if ((u & z) === z) {
          B !== null && (B = B.next = {
            eventTime: ee,
            lane: 0,
            tag: P.tag,
            payload: P.payload,
            callback: P.callback,
            next: null
          });
          e: {
            var ne = t, oe = P;
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
                Pn = !0;
            }
          }
          P.callback !== null && P.lane !== 0 && (t.flags |= 64, z = p.effects, z === null ? p.effects = [P] : z.push(P));
        } else ee = { eventTime: ee, lane: z, tag: P.tag, payload: P.payload, callback: P.callback, next: null }, B === null ? (F = B = ee, M = H) : B = B.next = ee, _ |= z;
        if (P = P.next, P === null) {
          if (P = p.shared.pending, P === null) break;
          z = P, P = z.next, z.next = null, p.lastBaseUpdate = z, p.shared.pending = null;
        }
      } while (!0);
      if (B === null && (M = H), p.baseState = M, p.firstBaseUpdate = F, p.lastBaseUpdate = B, r = p.shared.interleaved, r !== null) {
        p = r;
        do
          _ |= p.lane, p = p.next;
        while (p !== r);
      } else m === null && (p.shared.lanes = 0);
      rr |= _, t.lanes = _, t.memoizedState = H;
    }
  }
  function Ap(t, r, s) {
    if (t = r.effects, r.effects = null, t !== null) for (r = 0; r < t.length; r++) {
      var u = t[r], p = u.callback;
      if (p !== null) {
        if (u.callback = null, u = s, typeof p != "function") throw Error(o(191, p));
        p.call(u);
      }
    }
  }
  var Lo = {}, Kt = An(Lo), Vo = An(Lo), zo = An(Lo);
  function tr(t) {
    if (t === Lo) throw Error(o(174));
    return t;
  }
  function $l(t, r) {
    switch (Pe(zo, r), Pe(Vo, t), Pe(Kt, Lo), t = r.nodeType, t) {
      case 9:
      case 11:
        r = (r = r.documentElement) ? r.namespaceURI : Ha(null, "");
        break;
      default:
        t = t === 8 ? r.parentNode : r, r = t.namespaceURI || null, t = t.tagName, r = Ha(r, t);
    }
    Re(Kt), Pe(Kt, r);
  }
  function Lr() {
    Re(Kt), Re(Vo), Re(zo);
  }
  function Cp(t) {
    tr(zo.current);
    var r = tr(Kt.current), s = Ha(r, t.type);
    r !== s && (Pe(Vo, t), Pe(Kt, s));
  }
  function Hl(t) {
    Vo.current === t && (Re(Kt), Re(Vo));
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
  var Wl = [];
  function Gl() {
    for (var t = 0; t < Wl.length; t++) Wl[t]._workInProgressVersionPrimary = null;
    Wl.length = 0;
  }
  var cs = D.ReactCurrentDispatcher, Kl = D.ReactCurrentBatchConfig, nr = 0, Ie = null, Ue = null, We = null, ds = !1, Bo = !1, Uo = 0, jw = 0;
  function et() {
    throw Error(o(321));
  }
  function Yl(t, r) {
    if (r === null) return !1;
    for (var s = 0; s < r.length && s < t.length; s++) if (!Nt(t[s], r[s])) return !1;
    return !0;
  }
  function Ql(t, r, s, u, p, m) {
    if (nr = m, Ie = r, r.memoizedState = null, r.updateQueue = null, r.lanes = 0, cs.current = t === null || t.memoizedState === null ? Lw : Vw, t = s(u, p), Bo) {
      m = 0;
      do {
        if (Bo = !1, Uo = 0, 25 <= m) throw Error(o(301));
        m += 1, We = Ue = null, r.updateQueue = null, cs.current = zw, t = s(u, p);
      } while (Bo);
    }
    if (cs.current = hs, r = Ue !== null && Ue.next !== null, nr = 0, We = Ue = Ie = null, ds = !1, r) throw Error(o(300));
    return t;
  }
  function Xl() {
    var t = Uo !== 0;
    return Uo = 0, t;
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
  function $o(t, r) {
    return typeof r == "function" ? r(t) : r;
  }
  function Zl(t) {
    var r = At(), s = r.queue;
    if (s === null) throw Error(o(311));
    s.lastRenderedReducer = t;
    var u = Ue, p = u.baseQueue, m = s.pending;
    if (m !== null) {
      if (p !== null) {
        var _ = p.next;
        p.next = m.next, m.next = _;
      }
      u.baseQueue = p = m, s.pending = null;
    }
    if (p !== null) {
      m = p.next, u = u.baseState;
      var P = _ = null, M = null, F = m;
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
          M === null ? (P = M = H, _ = u) : M = M.next = H, Ie.lanes |= B, rr |= B;
        }
        F = F.next;
      } while (F !== null && F !== m);
      M === null ? _ = u : M.next = P, Nt(u, r.memoizedState) || (ct = !0), r.memoizedState = u, r.baseState = _, r.baseQueue = M, s.lastRenderedState = u;
    }
    if (t = s.interleaved, t !== null) {
      p = t;
      do
        m = p.lane, Ie.lanes |= m, rr |= m, p = p.next;
      while (p !== t);
    } else p === null && (s.lanes = 0);
    return [r.memoizedState, s.dispatch];
  }
  function ql(t) {
    var r = At(), s = r.queue;
    if (s === null) throw Error(o(311));
    s.lastRenderedReducer = t;
    var u = s.dispatch, p = s.pending, m = r.memoizedState;
    if (p !== null) {
      s.pending = null;
      var _ = p = p.next;
      do
        m = t(m, _.action), _ = _.next;
      while (_ !== p);
      Nt(m, r.memoizedState) || (ct = !0), r.memoizedState = m, r.baseQueue === null && (r.baseState = m), s.lastRenderedState = m;
    }
    return [m, u];
  }
  function Ep() {
  }
  function Pp(t, r) {
    var s = Ie, u = At(), p = r(), m = !Nt(u.memoizedState, p);
    if (m && (u.memoizedState = p, ct = !0), u = u.queue, Jl(Rp.bind(null, s, u, t), [t]), u.getSnapshot !== r || m || We !== null && We.memoizedState.tag & 1) {
      if (s.flags |= 2048, Ho(9, Mp.bind(null, s, u, p, r), void 0, null), Ge === null) throw Error(o(349));
      (nr & 30) !== 0 || bp(s, r, p);
    }
    return p;
  }
  function bp(t, r, s) {
    t.flags |= 16384, t = { getSnapshot: r, value: s }, r = Ie.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, Ie.updateQueue = r, r.stores = [t]) : (s = r.stores, s === null ? r.stores = [t] : s.push(t));
  }
  function Mp(t, r, s, u) {
    r.value = s, r.getSnapshot = u, Np(r) && Dp(t);
  }
  function Rp(t, r, s) {
    return s(function() {
      Np(r) && Dp(t);
    });
  }
  function Np(t) {
    var r = t.getSnapshot;
    t = t.value;
    try {
      var s = r();
      return !Nt(t, s);
    } catch {
      return !0;
    }
  }
  function Dp(t) {
    var r = un(t, 1);
    r !== null && Ot(r, t, 1, -1);
  }
  function jp(t) {
    var r = Yt();
    return typeof t == "function" && (t = t()), r.memoizedState = r.baseState = t, t = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: $o, lastRenderedState: t }, r.queue = t, t = t.dispatch = Ow.bind(null, Ie, t), [r.memoizedState, t];
  }
  function Ho(t, r, s, u) {
    return t = { tag: t, create: r, destroy: s, deps: u, next: null }, r = Ie.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, Ie.updateQueue = r, r.lastEffect = t.next = t) : (s = r.lastEffect, s === null ? r.lastEffect = t.next = t : (u = s.next, s.next = t, t.next = u, r.lastEffect = t)), t;
  }
  function Ip() {
    return At().memoizedState;
  }
  function fs(t, r, s, u) {
    var p = Yt();
    Ie.flags |= t, p.memoizedState = Ho(1 | r, s, void 0, u === void 0 ? null : u);
  }
  function ps(t, r, s, u) {
    var p = At();
    u = u === void 0 ? null : u;
    var m = void 0;
    if (Ue !== null) {
      var _ = Ue.memoizedState;
      if (m = _.destroy, u !== null && Yl(u, _.deps)) {
        p.memoizedState = Ho(r, s, m, u);
        return;
      }
    }
    Ie.flags |= t, p.memoizedState = Ho(1 | r, s, m, u);
  }
  function Fp(t, r) {
    return fs(8390656, 8, t, r);
  }
  function Jl(t, r) {
    return ps(2048, 8, t, r);
  }
  function Op(t, r) {
    return ps(4, 2, t, r);
  }
  function Lp(t, r) {
    return ps(4, 4, t, r);
  }
  function Vp(t, r) {
    if (typeof r == "function") return t = t(), r(t), function() {
      r(null);
    };
    if (r != null) return t = t(), r.current = t, function() {
      r.current = null;
    };
  }
  function zp(t, r, s) {
    return s = s != null ? s.concat([t]) : null, ps(4, 4, Vp.bind(null, r, t), s);
  }
  function eu() {
  }
  function Bp(t, r) {
    var s = At();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && Yl(r, u[1]) ? u[0] : (s.memoizedState = [t, r], t);
  }
  function Up(t, r) {
    var s = At();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && Yl(r, u[1]) ? u[0] : (t = t(), s.memoizedState = [t, r], t);
  }
  function $p(t, r, s) {
    return (nr & 21) === 0 ? (t.baseState && (t.baseState = !1, ct = !0), t.memoizedState = s) : (Nt(s, r) || (s = Sf(), Ie.lanes |= s, rr |= s, t.baseState = !0), r);
  }
  function Iw(t, r) {
    var s = Ae;
    Ae = s !== 0 && 4 > s ? s : 4, t(!0);
    var u = Kl.transition;
    Kl.transition = {};
    try {
      t(!1), r();
    } finally {
      Ae = s, Kl.transition = u;
    }
  }
  function Hp() {
    return At().memoizedState;
  }
  function Fw(t, r, s) {
    var u = Dn(t);
    if (s = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null }, Wp(t)) Gp(r, s);
    else if (s = _p(t, r, s, u), s !== null) {
      var p = ot();
      Ot(s, t, u, p), Kp(s, r, u);
    }
  }
  function Ow(t, r, s) {
    var u = Dn(t), p = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null };
    if (Wp(t)) Gp(r, p);
    else {
      var m = t.alternate;
      if (t.lanes === 0 && (m === null || m.lanes === 0) && (m = r.lastRenderedReducer, m !== null)) try {
        var _ = r.lastRenderedState, P = m(_, s);
        if (p.hasEagerState = !0, p.eagerState = P, Nt(P, _)) {
          var M = r.interleaved;
          M === null ? (p.next = p, Bl(r)) : (p.next = M.next, M.next = p), r.interleaved = p;
          return;
        }
      } catch {
      } finally {
      }
      s = _p(t, r, p, u), s !== null && (p = ot(), Ot(s, t, u, p), Kp(s, r, u));
    }
  }
  function Wp(t) {
    var r = t.alternate;
    return t === Ie || r !== null && r === Ie;
  }
  function Gp(t, r) {
    Bo = ds = !0;
    var s = t.pending;
    s === null ? r.next = r : (r.next = s.next, s.next = r), t.pending = r;
  }
  function Kp(t, r, s) {
    if ((s & 4194240) !== 0) {
      var u = r.lanes;
      u &= t.pendingLanes, s |= u, r.lanes = s, nl(t, s);
    }
  }
  var hs = { readContext: Tt, useCallback: et, useContext: et, useEffect: et, useImperativeHandle: et, useInsertionEffect: et, useLayoutEffect: et, useMemo: et, useReducer: et, useRef: et, useState: et, useDebugValue: et, useDeferredValue: et, useTransition: et, useMutableSource: et, useSyncExternalStore: et, useId: et, unstable_isNewReconciler: !1 }, Lw = { readContext: Tt, useCallback: function(t, r) {
    return Yt().memoizedState = [t, r === void 0 ? null : r], t;
  }, useContext: Tt, useEffect: Fp, useImperativeHandle: function(t, r, s) {
    return s = s != null ? s.concat([t]) : null, fs(
      4194308,
      4,
      Vp.bind(null, r, t),
      s
    );
  }, useLayoutEffect: function(t, r) {
    return fs(4194308, 4, t, r);
  }, useInsertionEffect: function(t, r) {
    return fs(4, 2, t, r);
  }, useMemo: function(t, r) {
    var s = Yt();
    return r = r === void 0 ? null : r, t = t(), s.memoizedState = [t, r], t;
  }, useReducer: function(t, r, s) {
    var u = Yt();
    return r = s !== void 0 ? s(r) : r, u.memoizedState = u.baseState = r, t = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: t, lastRenderedState: r }, u.queue = t, t = t.dispatch = Fw.bind(null, Ie, t), [u.memoizedState, t];
  }, useRef: function(t) {
    var r = Yt();
    return t = { current: t }, r.memoizedState = t;
  }, useState: jp, useDebugValue: eu, useDeferredValue: function(t) {
    return Yt().memoizedState = t;
  }, useTransition: function() {
    var t = jp(!1), r = t[0];
    return t = Iw.bind(null, t[1]), Yt().memoizedState = t, [r, t];
  }, useMutableSource: function() {
  }, useSyncExternalStore: function(t, r, s) {
    var u = Ie, p = Yt();
    if (Ne) {
      if (s === void 0) throw Error(o(407));
      s = s();
    } else {
      if (s = r(), Ge === null) throw Error(o(349));
      (nr & 30) !== 0 || bp(u, r, s);
    }
    p.memoizedState = s;
    var m = { value: s, getSnapshot: r };
    return p.queue = m, Fp(Rp.bind(
      null,
      u,
      m,
      t
    ), [t]), u.flags |= 2048, Ho(9, Mp.bind(null, u, m, s, r), void 0, null), s;
  }, useId: function() {
    var t = Yt(), r = Ge.identifierPrefix;
    if (Ne) {
      var s = ln, u = an;
      s = (u & ~(1 << 32 - Rt(u) - 1)).toString(32) + s, r = ":" + r + "R" + s, s = Uo++, 0 < s && (r += "H" + s.toString(32)), r += ":";
    } else s = jw++, r = ":" + r + "r" + s.toString(32) + ":";
    return t.memoizedState = r;
  }, unstable_isNewReconciler: !1 }, Vw = {
    readContext: Tt,
    useCallback: Bp,
    useContext: Tt,
    useEffect: Jl,
    useImperativeHandle: zp,
    useInsertionEffect: Op,
    useLayoutEffect: Lp,
    useMemo: Up,
    useReducer: Zl,
    useRef: Ip,
    useState: function() {
      return Zl($o);
    },
    useDebugValue: eu,
    useDeferredValue: function(t) {
      var r = At();
      return $p(r, Ue.memoizedState, t);
    },
    useTransition: function() {
      var t = Zl($o)[0], r = At().memoizedState;
      return [t, r];
    },
    useMutableSource: Ep,
    useSyncExternalStore: Pp,
    useId: Hp,
    unstable_isNewReconciler: !1
  }, zw = { readContext: Tt, useCallback: Bp, useContext: Tt, useEffect: Jl, useImperativeHandle: zp, useInsertionEffect: Op, useLayoutEffect: Lp, useMemo: Up, useReducer: ql, useRef: Ip, useState: function() {
    return ql($o);
  }, useDebugValue: eu, useDeferredValue: function(t) {
    var r = At();
    return Ue === null ? r.memoizedState = t : $p(r, Ue.memoizedState, t);
  }, useTransition: function() {
    var t = ql($o)[0], r = At().memoizedState;
    return [t, r];
  }, useMutableSource: Ep, useSyncExternalStore: Pp, useId: Hp, unstable_isNewReconciler: !1 };
  function jt(t, r) {
    if (t && t.defaultProps) {
      r = K({}, r), t = t.defaultProps;
      for (var s in t) r[s] === void 0 && (r[s] = t[s]);
      return r;
    }
    return r;
  }
  function tu(t, r, s, u) {
    r = t.memoizedState, s = s(u, r), s = s == null ? r : K({}, r, s), t.memoizedState = s, t.lanes === 0 && (t.updateQueue.baseState = s);
  }
  var ms = { isMounted: function(t) {
    return (t = t._reactInternals) ? Qn(t) === t : !1;
  }, enqueueSetState: function(t, r, s) {
    t = t._reactInternals;
    var u = ot(), p = Dn(t), m = cn(u, p);
    m.payload = r, s != null && (m.callback = s), r = bn(t, m, p), r !== null && (Ot(r, t, p, u), as(r, t, p));
  }, enqueueReplaceState: function(t, r, s) {
    t = t._reactInternals;
    var u = ot(), p = Dn(t), m = cn(u, p);
    m.tag = 1, m.payload = r, s != null && (m.callback = s), r = bn(t, m, p), r !== null && (Ot(r, t, p, u), as(r, t, p));
  }, enqueueForceUpdate: function(t, r) {
    t = t._reactInternals;
    var s = ot(), u = Dn(t), p = cn(s, u);
    p.tag = 2, r != null && (p.callback = r), r = bn(t, p, u), r !== null && (Ot(r, t, u, s), as(r, t, u));
  } };
  function Yp(t, r, s, u, p, m, _) {
    return t = t.stateNode, typeof t.shouldComponentUpdate == "function" ? t.shouldComponentUpdate(u, m, _) : r.prototype && r.prototype.isPureReactComponent ? !Mo(s, u) || !Mo(p, m) : !0;
  }
  function Qp(t, r, s) {
    var u = !1, p = Cn, m = r.contextType;
    return typeof m == "object" && m !== null ? m = Tt(m) : (p = ut(r) ? Zn : Je.current, u = r.contextTypes, m = (u = u != null) ? Rr(t, p) : Cn), r = new r(s, m), t.memoizedState = r.state !== null && r.state !== void 0 ? r.state : null, r.updater = ms, t.stateNode = r, r._reactInternals = t, u && (t = t.stateNode, t.__reactInternalMemoizedUnmaskedChildContext = p, t.__reactInternalMemoizedMaskedChildContext = m), r;
  }
  function Xp(t, r, s, u) {
    t = r.state, typeof r.componentWillReceiveProps == "function" && r.componentWillReceiveProps(s, u), typeof r.UNSAFE_componentWillReceiveProps == "function" && r.UNSAFE_componentWillReceiveProps(s, u), r.state !== t && ms.enqueueReplaceState(r, r.state, null);
  }
  function nu(t, r, s, u) {
    var p = t.stateNode;
    p.props = s, p.state = t.memoizedState, p.refs = {}, Ul(t);
    var m = r.contextType;
    typeof m == "object" && m !== null ? p.context = Tt(m) : (m = ut(r) ? Zn : Je.current, p.context = Rr(t, m)), p.state = t.memoizedState, m = r.getDerivedStateFromProps, typeof m == "function" && (tu(t, r, m, s), p.state = t.memoizedState), typeof r.getDerivedStateFromProps == "function" || typeof p.getSnapshotBeforeUpdate == "function" || typeof p.UNSAFE_componentWillMount != "function" && typeof p.componentWillMount != "function" || (r = p.state, typeof p.componentWillMount == "function" && p.componentWillMount(), typeof p.UNSAFE_componentWillMount == "function" && p.UNSAFE_componentWillMount(), r !== p.state && ms.enqueueReplaceState(p, p.state, null), ls(t, s, p, u), p.state = t.memoizedState), typeof p.componentDidMount == "function" && (t.flags |= 4194308);
  }
  function Vr(t, r) {
    try {
      var s = "", u = r;
      do
        s += me(u), u = u.return;
      while (u);
      var p = s;
    } catch (m) {
      p = `
Error generating stack: ` + m.message + `
` + m.stack;
    }
    return { value: t, source: r, stack: p, digest: null };
  }
  function ru(t, r, s) {
    return { value: t, source: null, stack: s ?? null, digest: r ?? null };
  }
  function ou(t, r) {
    try {
      console.error(r.value);
    } catch (s) {
      setTimeout(function() {
        throw s;
      });
    }
  }
  var Bw = typeof WeakMap == "function" ? WeakMap : Map;
  function Zp(t, r, s) {
    s = cn(-1, s), s.tag = 3, s.payload = { element: null };
    var u = r.value;
    return s.callback = function() {
      _s || (_s = !0, Su = u), ou(t, r);
    }, s;
  }
  function qp(t, r, s) {
    s = cn(-1, s), s.tag = 3;
    var u = t.type.getDerivedStateFromError;
    if (typeof u == "function") {
      var p = r.value;
      s.payload = function() {
        return u(p);
      }, s.callback = function() {
        ou(t, r);
      };
    }
    var m = t.stateNode;
    return m !== null && typeof m.componentDidCatch == "function" && (s.callback = function() {
      ou(t, r), typeof u != "function" && (Rn === null ? Rn = /* @__PURE__ */ new Set([this]) : Rn.add(this));
      var _ = r.stack;
      this.componentDidCatch(r.value, { componentStack: _ !== null ? _ : "" });
    }), s;
  }
  function Jp(t, r, s) {
    var u = t.pingCache;
    if (u === null) {
      u = t.pingCache = new Bw();
      var p = /* @__PURE__ */ new Set();
      u.set(r, p);
    } else p = u.get(r), p === void 0 && (p = /* @__PURE__ */ new Set(), u.set(r, p));
    p.has(s) || (p.add(s), t = t1.bind(null, t, r, s), r.then(t, t));
  }
  function eh(t) {
    do {
      var r;
      if ((r = t.tag === 13) && (r = t.memoizedState, r = r !== null ? r.dehydrated !== null : !0), r) return t;
      t = t.return;
    } while (t !== null);
    return null;
  }
  function th(t, r, s, u, p) {
    return (t.mode & 1) === 0 ? (t === r ? t.flags |= 65536 : (t.flags |= 128, s.flags |= 131072, s.flags &= -52805, s.tag === 1 && (s.alternate === null ? s.tag = 17 : (r = cn(-1, 1), r.tag = 2, bn(s, r, 1))), s.lanes |= 1), t) : (t.flags |= 65536, t.lanes = p, t);
  }
  var Uw = D.ReactCurrentOwner, ct = !1;
  function rt(t, r, s, u) {
    r.child = t === null ? xp(r, null, s, u) : Ir(r, t.child, s, u);
  }
  function nh(t, r, s, u, p) {
    s = s.render;
    var m = r.ref;
    return Or(r, p), u = Ql(t, r, s, u, m, p), s = Xl(), t !== null && !ct ? (r.updateQueue = t.updateQueue, r.flags &= -2053, t.lanes &= ~p, dn(t, r, p)) : (Ne && s && Nl(r), r.flags |= 1, rt(t, r, u, p), r.child);
  }
  function rh(t, r, s, u, p) {
    if (t === null) {
      var m = s.type;
      return typeof m == "function" && !Cu(m) && m.defaultProps === void 0 && s.compare === null && s.defaultProps === void 0 ? (r.tag = 15, r.type = m, oh(t, r, m, u, p)) : (t = Ps(s.type, null, u, r, r.mode, p), t.ref = r.ref, t.return = r, r.child = t);
    }
    if (m = t.child, (t.lanes & p) === 0) {
      var _ = m.memoizedProps;
      if (s = s.compare, s = s !== null ? s : Mo, s(_, u) && t.ref === r.ref) return dn(t, r, p);
    }
    return r.flags |= 1, t = In(m, u), t.ref = r.ref, t.return = r, r.child = t;
  }
  function oh(t, r, s, u, p) {
    if (t !== null) {
      var m = t.memoizedProps;
      if (Mo(m, u) && t.ref === r.ref) if (ct = !1, r.pendingProps = u = m, (t.lanes & p) !== 0) (t.flags & 131072) !== 0 && (ct = !0);
      else return r.lanes = t.lanes, dn(t, r, p);
    }
    return iu(t, r, s, u, p);
  }
  function ih(t, r, s) {
    var u = r.pendingProps, p = u.children, m = t !== null ? t.memoizedState : null;
    if (u.mode === "hidden") if ((r.mode & 1) === 0) r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, Pe(Br, xt), xt |= s;
    else {
      if ((s & 1073741824) === 0) return t = m !== null ? m.baseLanes | s : s, r.lanes = r.childLanes = 1073741824, r.memoizedState = { baseLanes: t, cachePool: null, transitions: null }, r.updateQueue = null, Pe(Br, xt), xt |= t, null;
      r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, u = m !== null ? m.baseLanes : s, Pe(Br, xt), xt |= u;
    }
    else m !== null ? (u = m.baseLanes | s, r.memoizedState = null) : u = s, Pe(Br, xt), xt |= u;
    return rt(t, r, p, s), r.child;
  }
  function sh(t, r) {
    var s = r.ref;
    (t === null && s !== null || t !== null && t.ref !== s) && (r.flags |= 512, r.flags |= 2097152);
  }
  function iu(t, r, s, u, p) {
    var m = ut(s) ? Zn : Je.current;
    return m = Rr(r, m), Or(r, p), s = Ql(t, r, s, u, m, p), u = Xl(), t !== null && !ct ? (r.updateQueue = t.updateQueue, r.flags &= -2053, t.lanes &= ~p, dn(t, r, p)) : (Ne && u && Nl(r), r.flags |= 1, rt(t, r, s, p), r.child);
  }
  function ah(t, r, s, u, p) {
    if (ut(s)) {
      var m = !0;
      Ji(r);
    } else m = !1;
    if (Or(r, p), r.stateNode === null) gs(t, r), Qp(r, s, u), nu(r, s, u, p), u = !0;
    else if (t === null) {
      var _ = r.stateNode, P = r.memoizedProps;
      _.props = P;
      var M = _.context, F = s.contextType;
      typeof F == "object" && F !== null ? F = Tt(F) : (F = ut(s) ? Zn : Je.current, F = Rr(r, F));
      var B = s.getDerivedStateFromProps, H = typeof B == "function" || typeof _.getSnapshotBeforeUpdate == "function";
      H || typeof _.UNSAFE_componentWillReceiveProps != "function" && typeof _.componentWillReceiveProps != "function" || (P !== u || M !== F) && Xp(r, _, u, F), Pn = !1;
      var z = r.memoizedState;
      _.state = z, ls(r, u, _, p), M = r.memoizedState, P !== u || z !== M || lt.current || Pn ? (typeof B == "function" && (tu(r, s, B, u), M = r.memoizedState), (P = Pn || Yp(r, s, P, u, z, M, F)) ? (H || typeof _.UNSAFE_componentWillMount != "function" && typeof _.componentWillMount != "function" || (typeof _.componentWillMount == "function" && _.componentWillMount(), typeof _.UNSAFE_componentWillMount == "function" && _.UNSAFE_componentWillMount()), typeof _.componentDidMount == "function" && (r.flags |= 4194308)) : (typeof _.componentDidMount == "function" && (r.flags |= 4194308), r.memoizedProps = u, r.memoizedState = M), _.props = u, _.state = M, _.context = F, u = P) : (typeof _.componentDidMount == "function" && (r.flags |= 4194308), u = !1);
    } else {
      _ = r.stateNode, kp(t, r), P = r.memoizedProps, F = r.type === r.elementType ? P : jt(r.type, P), _.props = F, H = r.pendingProps, z = _.context, M = s.contextType, typeof M == "object" && M !== null ? M = Tt(M) : (M = ut(s) ? Zn : Je.current, M = Rr(r, M));
      var ee = s.getDerivedStateFromProps;
      (B = typeof ee == "function" || typeof _.getSnapshotBeforeUpdate == "function") || typeof _.UNSAFE_componentWillReceiveProps != "function" && typeof _.componentWillReceiveProps != "function" || (P !== H || z !== M) && Xp(r, _, u, M), Pn = !1, z = r.memoizedState, _.state = z, ls(r, u, _, p);
      var ne = r.memoizedState;
      P !== H || z !== ne || lt.current || Pn ? (typeof ee == "function" && (tu(r, s, ee, u), ne = r.memoizedState), (F = Pn || Yp(r, s, F, u, z, ne, M) || !1) ? (B || typeof _.UNSAFE_componentWillUpdate != "function" && typeof _.componentWillUpdate != "function" || (typeof _.componentWillUpdate == "function" && _.componentWillUpdate(u, ne, M), typeof _.UNSAFE_componentWillUpdate == "function" && _.UNSAFE_componentWillUpdate(u, ne, M)), typeof _.componentDidUpdate == "function" && (r.flags |= 4), typeof _.getSnapshotBeforeUpdate == "function" && (r.flags |= 1024)) : (typeof _.componentDidUpdate != "function" || P === t.memoizedProps && z === t.memoizedState || (r.flags |= 4), typeof _.getSnapshotBeforeUpdate != "function" || P === t.memoizedProps && z === t.memoizedState || (r.flags |= 1024), r.memoizedProps = u, r.memoizedState = ne), _.props = u, _.state = ne, _.context = M, u = F) : (typeof _.componentDidUpdate != "function" || P === t.memoizedProps && z === t.memoizedState || (r.flags |= 4), typeof _.getSnapshotBeforeUpdate != "function" || P === t.memoizedProps && z === t.memoizedState || (r.flags |= 1024), u = !1);
    }
    return su(t, r, s, u, m, p);
  }
  function su(t, r, s, u, p, m) {
    sh(t, r);
    var _ = (r.flags & 128) !== 0;
    if (!u && !_) return p && fp(r, s, !1), dn(t, r, m);
    u = r.stateNode, Uw.current = r;
    var P = _ && typeof s.getDerivedStateFromError != "function" ? null : u.render();
    return r.flags |= 1, t !== null && _ ? (r.child = Ir(r, t.child, null, m), r.child = Ir(r, null, P, m)) : rt(t, r, P, m), r.memoizedState = u.state, p && fp(r, s, !0), r.child;
  }
  function lh(t) {
    var r = t.stateNode;
    r.pendingContext ? cp(t, r.pendingContext, r.pendingContext !== r.context) : r.context && cp(t, r.context, !1), $l(t, r.containerInfo);
  }
  function uh(t, r, s, u, p) {
    return jr(), Fl(p), r.flags |= 256, rt(t, r, s, u), r.child;
  }
  var au = { dehydrated: null, treeContext: null, retryLane: 0 };
  function lu(t) {
    return { baseLanes: t, cachePool: null, transitions: null };
  }
  function ch(t, r, s) {
    var u = r.pendingProps, p = je.current, m = !1, _ = (r.flags & 128) !== 0, P;
    if ((P = _) || (P = t !== null && t.memoizedState === null ? !1 : (p & 2) !== 0), P ? (m = !0, r.flags &= -129) : (t === null || t.memoizedState !== null) && (p |= 1), Pe(je, p & 1), t === null)
      return Il(r), t = r.memoizedState, t !== null && (t = t.dehydrated, t !== null) ? ((r.mode & 1) === 0 ? r.lanes = 1 : t.data === "$!" ? r.lanes = 8 : r.lanes = 1073741824, null) : (_ = u.children, t = u.fallback, m ? (u = r.mode, m = r.child, _ = { mode: "hidden", children: _ }, (u & 1) === 0 && m !== null ? (m.childLanes = 0, m.pendingProps = _) : m = bs(_, u, 0, null), t = ar(t, u, s, null), m.return = r, t.return = r, m.sibling = t, r.child = m, r.child.memoizedState = lu(s), r.memoizedState = au, t) : uu(r, _));
    if (p = t.memoizedState, p !== null && (P = p.dehydrated, P !== null)) return $w(t, r, _, u, P, p, s);
    if (m) {
      m = u.fallback, _ = r.mode, p = t.child, P = p.sibling;
      var M = { mode: "hidden", children: u.children };
      return (_ & 1) === 0 && r.child !== p ? (u = r.child, u.childLanes = 0, u.pendingProps = M, r.deletions = null) : (u = In(p, M), u.subtreeFlags = p.subtreeFlags & 14680064), P !== null ? m = In(P, m) : (m = ar(m, _, s, null), m.flags |= 2), m.return = r, u.return = r, u.sibling = m, r.child = u, u = m, m = r.child, _ = t.child.memoizedState, _ = _ === null ? lu(s) : { baseLanes: _.baseLanes | s, cachePool: null, transitions: _.transitions }, m.memoizedState = _, m.childLanes = t.childLanes & ~s, r.memoizedState = au, u;
    }
    return m = t.child, t = m.sibling, u = In(m, { mode: "visible", children: u.children }), (r.mode & 1) === 0 && (u.lanes = s), u.return = r, u.sibling = null, t !== null && (s = r.deletions, s === null ? (r.deletions = [t], r.flags |= 16) : s.push(t)), r.child = u, r.memoizedState = null, u;
  }
  function uu(t, r) {
    return r = bs({ mode: "visible", children: r }, t.mode, 0, null), r.return = t, t.child = r;
  }
  function ys(t, r, s, u) {
    return u !== null && Fl(u), Ir(r, t.child, null, s), t = uu(r, r.pendingProps.children), t.flags |= 2, r.memoizedState = null, t;
  }
  function $w(t, r, s, u, p, m, _) {
    if (s)
      return r.flags & 256 ? (r.flags &= -257, u = ru(Error(o(422))), ys(t, r, _, u)) : r.memoizedState !== null ? (r.child = t.child, r.flags |= 128, null) : (m = u.fallback, p = r.mode, u = bs({ mode: "visible", children: u.children }, p, 0, null), m = ar(m, p, _, null), m.flags |= 2, u.return = r, m.return = r, u.sibling = m, r.child = u, (r.mode & 1) !== 0 && Ir(r, t.child, null, _), r.child.memoizedState = lu(_), r.memoizedState = au, m);
    if ((r.mode & 1) === 0) return ys(t, r, _, null);
    if (p.data === "$!") {
      if (u = p.nextSibling && p.nextSibling.dataset, u) var P = u.dgst;
      return u = P, m = Error(o(419)), u = ru(m, u, void 0), ys(t, r, _, u);
    }
    if (P = (_ & t.childLanes) !== 0, ct || P) {
      if (u = Ge, u !== null) {
        switch (_ & -_) {
          case 4:
            p = 2;
            break;
          case 16:
            p = 8;
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
            p = 32;
            break;
          case 536870912:
            p = 268435456;
            break;
          default:
            p = 0;
        }
        p = (p & (u.suspendedLanes | _)) !== 0 ? 0 : p, p !== 0 && p !== m.retryLane && (m.retryLane = p, un(t, p), Ot(u, t, p, -1));
      }
      return Au(), u = ru(Error(o(421))), ys(t, r, _, u);
    }
    return p.data === "$?" ? (r.flags |= 128, r.child = t.child, r = n1.bind(null, t), p._reactRetry = r, null) : (t = m.treeContext, wt = Tn(p.nextSibling), St = r, Ne = !0, Dt = null, t !== null && (_t[kt++] = an, _t[kt++] = ln, _t[kt++] = qn, an = t.id, ln = t.overflow, qn = r), r = uu(r, u.children), r.flags |= 4096, r);
  }
  function dh(t, r, s) {
    t.lanes |= r;
    var u = t.alternate;
    u !== null && (u.lanes |= r), zl(t.return, r, s);
  }
  function cu(t, r, s, u, p) {
    var m = t.memoizedState;
    m === null ? t.memoizedState = { isBackwards: r, rendering: null, renderingStartTime: 0, last: u, tail: s, tailMode: p } : (m.isBackwards = r, m.rendering = null, m.renderingStartTime = 0, m.last = u, m.tail = s, m.tailMode = p);
  }
  function fh(t, r, s) {
    var u = r.pendingProps, p = u.revealOrder, m = u.tail;
    if (rt(t, r, u.children, s), u = je.current, (u & 2) !== 0) u = u & 1 | 2, r.flags |= 128;
    else {
      if (t !== null && (t.flags & 128) !== 0) e: for (t = r.child; t !== null; ) {
        if (t.tag === 13) t.memoizedState !== null && dh(t, s, r);
        else if (t.tag === 19) dh(t, s, r);
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
    else switch (p) {
      case "forwards":
        for (s = r.child, p = null; s !== null; ) t = s.alternate, t !== null && us(t) === null && (p = s), s = s.sibling;
        s = p, s === null ? (p = r.child, r.child = null) : (p = s.sibling, s.sibling = null), cu(r, !1, p, s, m);
        break;
      case "backwards":
        for (s = null, p = r.child, r.child = null; p !== null; ) {
          if (t = p.alternate, t !== null && us(t) === null) {
            r.child = p;
            break;
          }
          t = p.sibling, p.sibling = s, s = p, p = t;
        }
        cu(r, !0, s, null, m);
        break;
      case "together":
        cu(r, !1, null, null, void 0);
        break;
      default:
        r.memoizedState = null;
    }
    return r.child;
  }
  function gs(t, r) {
    (r.mode & 1) === 0 && t !== null && (t.alternate = null, r.alternate = null, r.flags |= 2);
  }
  function dn(t, r, s) {
    if (t !== null && (r.dependencies = t.dependencies), rr |= r.lanes, (s & r.childLanes) === 0) return null;
    if (t !== null && r.child !== t.child) throw Error(o(153));
    if (r.child !== null) {
      for (t = r.child, s = In(t, t.pendingProps), r.child = s, s.return = r; t.sibling !== null; ) t = t.sibling, s = s.sibling = In(t, t.pendingProps), s.return = r;
      s.sibling = null;
    }
    return r.child;
  }
  function Hw(t, r, s) {
    switch (r.tag) {
      case 3:
        lh(r), jr();
        break;
      case 5:
        Cp(r);
        break;
      case 1:
        ut(r.type) && Ji(r);
        break;
      case 4:
        $l(r, r.stateNode.containerInfo);
        break;
      case 10:
        var u = r.type._context, p = r.memoizedProps.value;
        Pe(is, u._currentValue), u._currentValue = p;
        break;
      case 13:
        if (u = r.memoizedState, u !== null)
          return u.dehydrated !== null ? (Pe(je, je.current & 1), r.flags |= 128, null) : (s & r.child.childLanes) !== 0 ? ch(t, r, s) : (Pe(je, je.current & 1), t = dn(t, r, s), t !== null ? t.sibling : null);
        Pe(je, je.current & 1);
        break;
      case 19:
        if (u = (s & r.childLanes) !== 0, (t.flags & 128) !== 0) {
          if (u) return fh(t, r, s);
          r.flags |= 128;
        }
        if (p = r.memoizedState, p !== null && (p.rendering = null, p.tail = null, p.lastEffect = null), Pe(je, je.current), u) break;
        return null;
      case 22:
      case 23:
        return r.lanes = 0, ih(t, r, s);
    }
    return dn(t, r, s);
  }
  var ph, du, hh, mh;
  ph = function(t, r) {
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
  }, du = function() {
  }, hh = function(t, r, s, u) {
    var p = t.memoizedProps;
    if (p !== u) {
      t = r.stateNode, tr(Kt.current);
      var m = null;
      switch (s) {
        case "input":
          p = za(t, p), u = za(t, u), m = [];
          break;
        case "select":
          p = K({}, p, { value: void 0 }), u = K({}, u, { value: void 0 }), m = [];
          break;
        case "textarea":
          p = $a(t, p), u = $a(t, u), m = [];
          break;
        default:
          typeof p.onClick != "function" && typeof u.onClick == "function" && (t.onclick = Xi);
      }
      Wa(s, u);
      var _;
      s = null;
      for (F in p) if (!u.hasOwnProperty(F) && p.hasOwnProperty(F) && p[F] != null) if (F === "style") {
        var P = p[F];
        for (_ in P) P.hasOwnProperty(_) && (s || (s = {}), s[_] = "");
      } else F !== "dangerouslySetInnerHTML" && F !== "children" && F !== "suppressContentEditableWarning" && F !== "suppressHydrationWarning" && F !== "autoFocus" && (a.hasOwnProperty(F) ? m || (m = []) : (m = m || []).push(F, null));
      for (F in u) {
        var M = u[F];
        if (P = p != null ? p[F] : void 0, u.hasOwnProperty(F) && M !== P && (M != null || P != null)) if (F === "style") if (P) {
          for (_ in P) !P.hasOwnProperty(_) || M && M.hasOwnProperty(_) || (s || (s = {}), s[_] = "");
          for (_ in M) M.hasOwnProperty(_) && P[_] !== M[_] && (s || (s = {}), s[_] = M[_]);
        } else s || (m || (m = []), m.push(
          F,
          s
        )), s = M;
        else F === "dangerouslySetInnerHTML" ? (M = M ? M.__html : void 0, P = P ? P.__html : void 0, M != null && P !== M && (m = m || []).push(F, M)) : F === "children" ? typeof M != "string" && typeof M != "number" || (m = m || []).push(F, "" + M) : F !== "suppressContentEditableWarning" && F !== "suppressHydrationWarning" && (a.hasOwnProperty(F) ? (M != null && F === "onScroll" && Me("scroll", t), m || P === M || (m = [])) : (m = m || []).push(F, M));
      }
      s && (m = m || []).push("style", s);
      var F = m;
      (r.updateQueue = F) && (r.flags |= 4);
    }
  }, mh = function(t, r, s, u) {
    s !== u && (r.flags |= 4);
  };
  function Wo(t, r) {
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
    if (r) for (var p = t.child; p !== null; ) s |= p.lanes | p.childLanes, u |= p.subtreeFlags & 14680064, u |= p.flags & 14680064, p.return = t, p = p.sibling;
    else for (p = t.child; p !== null; ) s |= p.lanes | p.childLanes, u |= p.subtreeFlags, u |= p.flags, p.return = t, p = p.sibling;
    return t.subtreeFlags |= u, t.childLanes = s, r;
  }
  function Ww(t, r, s) {
    var u = r.pendingProps;
    switch (Dl(r), r.tag) {
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
        return ut(r.type) && qi(), tt(r), null;
      case 3:
        return u = r.stateNode, Lr(), Re(lt), Re(Je), Gl(), u.pendingContext && (u.context = u.pendingContext, u.pendingContext = null), (t === null || t.child === null) && (rs(r) ? r.flags |= 4 : t === null || t.memoizedState.isDehydrated && (r.flags & 256) === 0 || (r.flags |= 1024, Dt !== null && (_u(Dt), Dt = null))), du(t, r), tt(r), null;
      case 5:
        Hl(r);
        var p = tr(zo.current);
        if (s = r.type, t !== null && r.stateNode != null) hh(t, r, s, u, p), t.ref !== r.ref && (r.flags |= 512, r.flags |= 2097152);
        else {
          if (!u) {
            if (r.stateNode === null) throw Error(o(166));
            return tt(r), null;
          }
          if (t = tr(Kt.current), rs(r)) {
            u = r.stateNode, s = r.type;
            var m = r.memoizedProps;
            switch (u[Gt] = r, u[Io] = m, t = (r.mode & 1) !== 0, s) {
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
                for (p = 0; p < No.length; p++) Me(No[p], u);
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
                Yd(u, m), Me("invalid", u);
                break;
              case "select":
                u._wrapperState = { wasMultiple: !!m.multiple }, Me("invalid", u);
                break;
              case "textarea":
                Zd(u, m), Me("invalid", u);
            }
            Wa(s, m), p = null;
            for (var _ in m) if (m.hasOwnProperty(_)) {
              var P = m[_];
              _ === "children" ? typeof P == "string" ? u.textContent !== P && (m.suppressHydrationWarning !== !0 && Qi(u.textContent, P, t), p = ["children", P]) : typeof P == "number" && u.textContent !== "" + P && (m.suppressHydrationWarning !== !0 && Qi(
                u.textContent,
                P,
                t
              ), p = ["children", "" + P]) : a.hasOwnProperty(_) && P != null && _ === "onScroll" && Me("scroll", u);
            }
            switch (s) {
              case "input":
                Kn(u), Xd(u, m, !0);
                break;
              case "textarea":
                Kn(u), Jd(u);
                break;
              case "select":
              case "option":
                break;
              default:
                typeof m.onClick == "function" && (u.onclick = Xi);
            }
            u = p, r.updateQueue = u, u !== null && (r.flags |= 4);
          } else {
            _ = p.nodeType === 9 ? p : p.ownerDocument, t === "http://www.w3.org/1999/xhtml" && (t = ef(s)), t === "http://www.w3.org/1999/xhtml" ? s === "script" ? (t = _.createElement("div"), t.innerHTML = "<script><\/script>", t = t.removeChild(t.firstChild)) : typeof u.is == "string" ? t = _.createElement(s, { is: u.is }) : (t = _.createElement(s), s === "select" && (_ = t, u.multiple ? _.multiple = !0 : u.size && (_.size = u.size))) : t = _.createElementNS(t, s), t[Gt] = r, t[Io] = u, ph(t, r, !1, !1), r.stateNode = t;
            e: {
              switch (_ = Ga(s, u), s) {
                case "dialog":
                  Me("cancel", t), Me("close", t), p = u;
                  break;
                case "iframe":
                case "object":
                case "embed":
                  Me("load", t), p = u;
                  break;
                case "video":
                case "audio":
                  for (p = 0; p < No.length; p++) Me(No[p], t);
                  p = u;
                  break;
                case "source":
                  Me("error", t), p = u;
                  break;
                case "img":
                case "image":
                case "link":
                  Me(
                    "error",
                    t
                  ), Me("load", t), p = u;
                  break;
                case "details":
                  Me("toggle", t), p = u;
                  break;
                case "input":
                  Yd(t, u), p = za(t, u), Me("invalid", t);
                  break;
                case "option":
                  p = u;
                  break;
                case "select":
                  t._wrapperState = { wasMultiple: !!u.multiple }, p = K({}, u, { value: void 0 }), Me("invalid", t);
                  break;
                case "textarea":
                  Zd(t, u), p = $a(t, u), Me("invalid", t);
                  break;
                default:
                  p = u;
              }
              Wa(s, p), P = p;
              for (m in P) if (P.hasOwnProperty(m)) {
                var M = P[m];
                m === "style" ? rf(t, M) : m === "dangerouslySetInnerHTML" ? (M = M ? M.__html : void 0, M != null && tf(t, M)) : m === "children" ? typeof M == "string" ? (s !== "textarea" || M !== "") && po(t, M) : typeof M == "number" && po(t, "" + M) : m !== "suppressContentEditableWarning" && m !== "suppressHydrationWarning" && m !== "autoFocus" && (a.hasOwnProperty(m) ? M != null && m === "onScroll" && Me("scroll", t) : M != null && b(t, m, M, _));
              }
              switch (s) {
                case "input":
                  Kn(t), Xd(t, u, !1);
                  break;
                case "textarea":
                  Kn(t), Jd(t);
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
                  typeof p.onClick == "function" && (t.onclick = Xi);
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
        if (t && r.stateNode != null) mh(t, r, t.memoizedProps, u);
        else {
          if (typeof u != "string" && r.stateNode === null) throw Error(o(166));
          if (s = tr(zo.current), tr(Kt.current), rs(r)) {
            if (u = r.stateNode, s = r.memoizedProps, u[Gt] = r, (m = u.nodeValue !== s) && (t = St, t !== null)) switch (t.tag) {
              case 3:
                Qi(u.nodeValue, s, (t.mode & 1) !== 0);
                break;
              case 5:
                t.memoizedProps.suppressHydrationWarning !== !0 && Qi(u.nodeValue, s, (t.mode & 1) !== 0);
            }
            m && (r.flags |= 4);
          } else u = (s.nodeType === 9 ? s : s.ownerDocument).createTextNode(u), u[Gt] = r, r.stateNode = u;
        }
        return tt(r), null;
      case 13:
        if (Re(je), u = r.memoizedState, t === null || t.memoizedState !== null && t.memoizedState.dehydrated !== null) {
          if (Ne && wt !== null && (r.mode & 1) !== 0 && (r.flags & 128) === 0) vp(), jr(), r.flags |= 98560, m = !1;
          else if (m = rs(r), u !== null && u.dehydrated !== null) {
            if (t === null) {
              if (!m) throw Error(o(318));
              if (m = r.memoizedState, m = m !== null ? m.dehydrated : null, !m) throw Error(o(317));
              m[Gt] = r;
            } else jr(), (r.flags & 128) === 0 && (r.memoizedState = null), r.flags |= 4;
            tt(r), m = !1;
          } else Dt !== null && (_u(Dt), Dt = null), m = !0;
          if (!m) return r.flags & 65536 ? r : null;
        }
        return (r.flags & 128) !== 0 ? (r.lanes = s, r) : (u = u !== null, u !== (t !== null && t.memoizedState !== null) && u && (r.child.flags |= 8192, (r.mode & 1) !== 0 && (t === null || (je.current & 1) !== 0 ? $e === 0 && ($e = 3) : Au())), r.updateQueue !== null && (r.flags |= 4), tt(r), null);
      case 4:
        return Lr(), du(t, r), t === null && Do(r.stateNode.containerInfo), tt(r), null;
      case 10:
        return Vl(r.type._context), tt(r), null;
      case 17:
        return ut(r.type) && qi(), tt(r), null;
      case 19:
        if (Re(je), m = r.memoizedState, m === null) return tt(r), null;
        if (u = (r.flags & 128) !== 0, _ = m.rendering, _ === null) if (u) Wo(m, !1);
        else {
          if ($e !== 0 || t !== null && (t.flags & 128) !== 0) for (t = r.child; t !== null; ) {
            if (_ = us(t), _ !== null) {
              for (r.flags |= 128, Wo(m, !1), u = _.updateQueue, u !== null && (r.updateQueue = u, r.flags |= 4), r.subtreeFlags = 0, u = s, s = r.child; s !== null; ) m = s, t = u, m.flags &= 14680066, _ = m.alternate, _ === null ? (m.childLanes = 0, m.lanes = t, m.child = null, m.subtreeFlags = 0, m.memoizedProps = null, m.memoizedState = null, m.updateQueue = null, m.dependencies = null, m.stateNode = null) : (m.childLanes = _.childLanes, m.lanes = _.lanes, m.child = _.child, m.subtreeFlags = 0, m.deletions = null, m.memoizedProps = _.memoizedProps, m.memoizedState = _.memoizedState, m.updateQueue = _.updateQueue, m.type = _.type, t = _.dependencies, m.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }), s = s.sibling;
              return Pe(je, je.current & 1 | 2), r.child;
            }
            t = t.sibling;
          }
          m.tail !== null && Le() > Ur && (r.flags |= 128, u = !0, Wo(m, !1), r.lanes = 4194304);
        }
        else {
          if (!u) if (t = us(_), t !== null) {
            if (r.flags |= 128, u = !0, s = t.updateQueue, s !== null && (r.updateQueue = s, r.flags |= 4), Wo(m, !0), m.tail === null && m.tailMode === "hidden" && !_.alternate && !Ne) return tt(r), null;
          } else 2 * Le() - m.renderingStartTime > Ur && s !== 1073741824 && (r.flags |= 128, u = !0, Wo(m, !1), r.lanes = 4194304);
          m.isBackwards ? (_.sibling = r.child, r.child = _) : (s = m.last, s !== null ? s.sibling = _ : r.child = _, m.last = _);
        }
        return m.tail !== null ? (r = m.tail, m.rendering = r, m.tail = r.sibling, m.renderingStartTime = Le(), r.sibling = null, s = je.current, Pe(je, u ? s & 1 | 2 : s & 1), r) : (tt(r), null);
      case 22:
      case 23:
        return Tu(), u = r.memoizedState !== null, t !== null && t.memoizedState !== null !== u && (r.flags |= 8192), u && (r.mode & 1) !== 0 ? (xt & 1073741824) !== 0 && (tt(r), r.subtreeFlags & 6 && (r.flags |= 8192)) : tt(r), null;
      case 24:
        return null;
      case 25:
        return null;
    }
    throw Error(o(156, r.tag));
  }
  function Gw(t, r) {
    switch (Dl(r), r.tag) {
      case 1:
        return ut(r.type) && qi(), t = r.flags, t & 65536 ? (r.flags = t & -65537 | 128, r) : null;
      case 3:
        return Lr(), Re(lt), Re(Je), Gl(), t = r.flags, (t & 65536) !== 0 && (t & 128) === 0 ? (r.flags = t & -65537 | 128, r) : null;
      case 5:
        return Hl(r), null;
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
        return Vl(r.type._context), null;
      case 22:
      case 23:
        return Tu(), null;
      case 24:
        return null;
      default:
        return null;
    }
  }
  var vs = !1, nt = !1, Kw = typeof WeakSet == "function" ? WeakSet : Set, te = null;
  function zr(t, r) {
    var s = t.ref;
    if (s !== null) if (typeof s == "function") try {
      s(null);
    } catch (u) {
      Oe(t, r, u);
    }
    else s.current = null;
  }
  function fu(t, r, s) {
    try {
      s();
    } catch (u) {
      Oe(t, r, u);
    }
  }
  var yh = !1;
  function Yw(t, r) {
    if (Tl = Li, t = Yf(), yl(t)) {
      if ("selectionStart" in t) var s = { start: t.selectionStart, end: t.selectionEnd };
      else e: {
        s = (s = t.ownerDocument) && s.defaultView || window;
        var u = s.getSelection && s.getSelection();
        if (u && u.rangeCount !== 0) {
          s = u.anchorNode;
          var p = u.anchorOffset, m = u.focusNode;
          u = u.focusOffset;
          try {
            s.nodeType, m.nodeType;
          } catch {
            s = null;
            break e;
          }
          var _ = 0, P = -1, M = -1, F = 0, B = 0, H = t, z = null;
          t: for (; ; ) {
            for (var ee; H !== s || p !== 0 && H.nodeType !== 3 || (P = _ + p), H !== m || u !== 0 && H.nodeType !== 3 || (M = _ + u), H.nodeType === 3 && (_ += H.nodeValue.length), (ee = H.firstChild) !== null; )
              z = H, H = ee;
            for (; ; ) {
              if (H === t) break t;
              if (z === s && ++F === p && (P = _), z === m && ++B === u && (M = _), (ee = H.nextSibling) !== null) break;
              H = z, z = H.parentNode;
            }
            H = ee;
          }
          s = P === -1 || M === -1 ? null : { start: P, end: M };
        } else s = null;
      }
      s = s || { start: 0, end: 0 };
    } else s = null;
    for (Al = { focusedElem: t, selectionRange: s }, Li = !1, te = r; te !== null; ) if (r = te, t = r.child, (r.subtreeFlags & 1028) !== 0 && t !== null) t.return = r, te = t;
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
    return ne = yh, yh = !1, ne;
  }
  function Go(t, r, s) {
    var u = r.updateQueue;
    if (u = u !== null ? u.lastEffect : null, u !== null) {
      var p = u = u.next;
      do {
        if ((p.tag & t) === t) {
          var m = p.destroy;
          p.destroy = void 0, m !== void 0 && fu(r, s, m);
        }
        p = p.next;
      } while (p !== u);
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
  function pu(t) {
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
  function gh(t) {
    var r = t.alternate;
    r !== null && (t.alternate = null, gh(r)), t.child = null, t.deletions = null, t.sibling = null, t.tag === 5 && (r = t.stateNode, r !== null && (delete r[Gt], delete r[Io], delete r[bl], delete r[Mw], delete r[Rw])), t.stateNode = null, t.return = null, t.dependencies = null, t.memoizedProps = null, t.memoizedState = null, t.pendingProps = null, t.stateNode = null, t.updateQueue = null;
  }
  function vh(t) {
    return t.tag === 5 || t.tag === 3 || t.tag === 4;
  }
  function Sh(t) {
    e: for (; ; ) {
      for (; t.sibling === null; ) {
        if (t.return === null || vh(t.return)) return null;
        t = t.return;
      }
      for (t.sibling.return = t.return, t = t.sibling; t.tag !== 5 && t.tag !== 6 && t.tag !== 18; ) {
        if (t.flags & 2 || t.child === null || t.tag === 4) continue e;
        t.child.return = t, t = t.child;
      }
      if (!(t.flags & 2)) return t.stateNode;
    }
  }
  function hu(t, r, s) {
    var u = t.tag;
    if (u === 5 || u === 6) t = t.stateNode, r ? s.nodeType === 8 ? s.parentNode.insertBefore(t, r) : s.insertBefore(t, r) : (s.nodeType === 8 ? (r = s.parentNode, r.insertBefore(t, s)) : (r = s, r.appendChild(t)), s = s._reactRootContainer, s != null || r.onclick !== null || (r.onclick = Xi));
    else if (u !== 4 && (t = t.child, t !== null)) for (hu(t, r, s), t = t.sibling; t !== null; ) hu(t, r, s), t = t.sibling;
  }
  function mu(t, r, s) {
    var u = t.tag;
    if (u === 5 || u === 6) t = t.stateNode, r ? s.insertBefore(t, r) : s.appendChild(t);
    else if (u !== 4 && (t = t.child, t !== null)) for (mu(t, r, s), t = t.sibling; t !== null; ) mu(t, r, s), t = t.sibling;
  }
  var Qe = null, It = !1;
  function Mn(t, r, s) {
    for (s = s.child; s !== null; ) wh(t, r, s), s = s.sibling;
  }
  function wh(t, r, s) {
    if (Wt && typeof Wt.onCommitFiberUnmount == "function") try {
      Wt.onCommitFiberUnmount(Ni, s);
    } catch {
    }
    switch (s.tag) {
      case 5:
        nt || zr(s, r);
      case 6:
        var u = Qe, p = It;
        Qe = null, Mn(t, r, s), Qe = u, It = p, Qe !== null && (It ? (t = Qe, s = s.stateNode, t.nodeType === 8 ? t.parentNode.removeChild(s) : t.removeChild(s)) : Qe.removeChild(s.stateNode));
        break;
      case 18:
        Qe !== null && (It ? (t = Qe, s = s.stateNode, t.nodeType === 8 ? Pl(t.parentNode, s) : t.nodeType === 1 && Pl(t, s), To(t)) : Pl(Qe, s.stateNode));
        break;
      case 4:
        u = Qe, p = It, Qe = s.stateNode.containerInfo, It = !0, Mn(t, r, s), Qe = u, It = p;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        if (!nt && (u = s.updateQueue, u !== null && (u = u.lastEffect, u !== null))) {
          p = u = u.next;
          do {
            var m = p, _ = m.destroy;
            m = m.tag, _ !== void 0 && ((m & 2) !== 0 || (m & 4) !== 0) && fu(s, r, _), p = p.next;
          } while (p !== u);
        }
        Mn(t, r, s);
        break;
      case 1:
        if (!nt && (zr(s, r), u = s.stateNode, typeof u.componentWillUnmount == "function")) try {
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
  function xh(t) {
    var r = t.updateQueue;
    if (r !== null) {
      t.updateQueue = null;
      var s = t.stateNode;
      s === null && (s = t.stateNode = new Kw()), r.forEach(function(u) {
        var p = r1.bind(null, t, u);
        s.has(u) || (s.add(u), u.then(p, p));
      });
    }
  }
  function Ft(t, r) {
    var s = r.deletions;
    if (s !== null) for (var u = 0; u < s.length; u++) {
      var p = s[u];
      try {
        var m = t, _ = r, P = _;
        e: for (; P !== null; ) {
          switch (P.tag) {
            case 5:
              Qe = P.stateNode, It = !1;
              break e;
            case 3:
              Qe = P.stateNode.containerInfo, It = !0;
              break e;
            case 4:
              Qe = P.stateNode.containerInfo, It = !0;
              break e;
          }
          P = P.return;
        }
        if (Qe === null) throw Error(o(160));
        wh(m, _, p), Qe = null, It = !1;
        var M = p.alternate;
        M !== null && (M.return = null), p.return = null;
      } catch (F) {
        Oe(p, r, F);
      }
    }
    if (r.subtreeFlags & 12854) for (r = r.child; r !== null; ) _h(r, t), r = r.sibling;
  }
  function _h(t, r) {
    var s = t.alternate, u = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (Ft(r, t), Qt(t), u & 4) {
          try {
            Go(3, t, t.return), Ss(3, t);
          } catch (oe) {
            Oe(t, t.return, oe);
          }
          try {
            Go(5, t, t.return);
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
          var p = t.stateNode;
          try {
            po(p, "");
          } catch (oe) {
            Oe(t, t.return, oe);
          }
        }
        if (u & 4 && (p = t.stateNode, p != null)) {
          var m = t.memoizedProps, _ = s !== null ? s.memoizedProps : m, P = t.type, M = t.updateQueue;
          if (t.updateQueue = null, M !== null) try {
            P === "input" && m.type === "radio" && m.name != null && Qd(p, m), Ga(P, _);
            var F = Ga(P, m);
            for (_ = 0; _ < M.length; _ += 2) {
              var B = M[_], H = M[_ + 1];
              B === "style" ? rf(p, H) : B === "dangerouslySetInnerHTML" ? tf(p, H) : B === "children" ? po(p, H) : b(p, B, H, F);
            }
            switch (P) {
              case "input":
                Ba(p, m);
                break;
              case "textarea":
                qd(p, m);
                break;
              case "select":
                var z = p._wrapperState.wasMultiple;
                p._wrapperState.wasMultiple = !!m.multiple;
                var ee = m.value;
                ee != null ? Sr(p, !!m.multiple, ee, !1) : z !== !!m.multiple && (m.defaultValue != null ? Sr(
                  p,
                  !!m.multiple,
                  m.defaultValue,
                  !0
                ) : Sr(p, !!m.multiple, m.multiple ? [] : "", !1));
            }
            p[Io] = m;
          } catch (oe) {
            Oe(t, t.return, oe);
          }
        }
        break;
      case 6:
        if (Ft(r, t), Qt(t), u & 4) {
          if (t.stateNode === null) throw Error(o(162));
          p = t.stateNode, m = t.memoizedProps;
          try {
            p.nodeValue = m;
          } catch (oe) {
            Oe(t, t.return, oe);
          }
        }
        break;
      case 3:
        if (Ft(r, t), Qt(t), u & 4 && s !== null && s.memoizedState.isDehydrated) try {
          To(r.containerInfo);
        } catch (oe) {
          Oe(t, t.return, oe);
        }
        break;
      case 4:
        Ft(r, t), Qt(t);
        break;
      case 13:
        Ft(r, t), Qt(t), p = t.child, p.flags & 8192 && (m = p.memoizedState !== null, p.stateNode.isHidden = m, !m || p.alternate !== null && p.alternate.memoizedState !== null || (vu = Le())), u & 4 && xh(t);
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
                  Go(4, z, z.return);
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
                    Ah(H);
                    continue;
                  }
              }
              ee !== null ? (ee.return = z, te = ee) : Ah(H);
            }
            B = B.sibling;
          }
          e: for (B = null, H = t; ; ) {
            if (H.tag === 5) {
              if (B === null) {
                B = H;
                try {
                  p = H.stateNode, F ? (m = p.style, typeof m.setProperty == "function" ? m.setProperty("display", "none", "important") : m.display = "none") : (P = H.stateNode, M = H.memoizedProps.style, _ = M != null && M.hasOwnProperty("display") ? M.display : null, P.style.display = nf("display", _));
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
        Ft(r, t), Qt(t), u & 4 && xh(t);
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
            if (vh(s)) {
              var u = s;
              break e;
            }
            s = s.return;
          }
          throw Error(o(160));
        }
        switch (u.tag) {
          case 5:
            var p = u.stateNode;
            u.flags & 32 && (po(p, ""), u.flags &= -33);
            var m = Sh(t);
            mu(t, m, p);
            break;
          case 3:
          case 4:
            var _ = u.stateNode.containerInfo, P = Sh(t);
            hu(t, P, _);
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
  function Qw(t, r, s) {
    te = t, kh(t);
  }
  function kh(t, r, s) {
    for (var u = (t.mode & 1) !== 0; te !== null; ) {
      var p = te, m = p.child;
      if (p.tag === 22 && u) {
        var _ = p.memoizedState !== null || vs;
        if (!_) {
          var P = p.alternate, M = P !== null && P.memoizedState !== null || nt;
          P = vs;
          var F = nt;
          if (vs = _, (nt = M) && !F) for (te = p; te !== null; ) _ = te, M = _.child, _.tag === 22 && _.memoizedState !== null ? Ch(p) : M !== null ? (M.return = _, te = M) : Ch(p);
          for (; m !== null; ) te = m, kh(m), m = m.sibling;
          te = p, vs = P, nt = F;
        }
        Th(t);
      } else (p.subtreeFlags & 8772) !== 0 && m !== null ? (m.return = p, te = m) : Th(t);
    }
  }
  function Th(t) {
    for (; te !== null; ) {
      var r = te;
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
                var p = r.elementType === r.type ? s.memoizedProps : jt(r.type, s.memoizedProps);
                u.componentDidUpdate(p, s.memoizedState, u.__reactInternalSnapshotBeforeUpdate);
              }
              var m = r.updateQueue;
              m !== null && Ap(r, m, u);
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
                Ap(r, _, s);
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
                    var H = B.dehydrated;
                    H !== null && To(H);
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
          nt || r.flags & 512 && pu(r);
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
  function Ah(t) {
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
  function Ch(t) {
    for (; te !== null; ) {
      var r = te;
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
              var p = r.return;
              try {
                u.componentDidMount();
              } catch (M) {
                Oe(r, p, M);
              }
            }
            var m = r.return;
            try {
              pu(r);
            } catch (M) {
              Oe(r, m, M);
            }
            break;
          case 5:
            var _ = r.return;
            try {
              pu(r);
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
      var P = r.sibling;
      if (P !== null) {
        P.return = r.return, te = P;
        break;
      }
      te = r.return;
    }
  }
  var Xw = Math.ceil, ws = D.ReactCurrentDispatcher, yu = D.ReactCurrentOwner, Ct = D.ReactCurrentBatchConfig, _e = 0, Ge = null, ze = null, Xe = 0, xt = 0, Br = An(0), $e = 0, Ko = null, rr = 0, xs = 0, gu = 0, Yo = null, dt = null, vu = 0, Ur = 1 / 0, fn = null, _s = !1, Su = null, Rn = null, ks = !1, Nn = null, Ts = 0, Qo = 0, wu = null, As = -1, Cs = 0;
  function ot() {
    return (_e & 6) !== 0 ? Le() : As !== -1 ? As : As = Le();
  }
  function Dn(t) {
    return (t.mode & 1) === 0 ? 1 : (_e & 2) !== 0 && Xe !== 0 ? Xe & -Xe : Dw.transition !== null ? (Cs === 0 && (Cs = Sf()), Cs) : (t = Ae, t !== 0 || (t = window.event, t = t === void 0 ? 16 : Pf(t.type)), t);
  }
  function Ot(t, r, s, u) {
    if (50 < Qo) throw Qo = 0, wu = null, Error(o(185));
    So(t, s, u), ((_e & 2) === 0 || t !== Ge) && (t === Ge && ((_e & 2) === 0 && (xs |= s), $e === 4 && jn(t, Xe)), ft(t, u), s === 1 && _e === 0 && (r.mode & 1) === 0 && (Ur = Le() + 500, es && En()));
  }
  function ft(t, r) {
    var s = t.callbackNode;
    DS(t, r);
    var u = Ii(t, t === Ge ? Xe : 0);
    if (u === 0) s !== null && yf(s), t.callbackNode = null, t.callbackPriority = 0;
    else if (r = u & -u, t.callbackPriority !== r) {
      if (s != null && yf(s), r === 1) t.tag === 0 ? Nw(Ph.bind(null, t)) : pp(Ph.bind(null, t)), Pw(function() {
        (_e & 6) === 0 && En();
      }), s = null;
      else {
        switch (wf(u)) {
          case 1:
            s = Ja;
            break;
          case 4:
            s = gf;
            break;
          case 16:
            s = Ri;
            break;
          case 536870912:
            s = vf;
            break;
          default:
            s = Ri;
        }
        s = Fh(s, Eh.bind(null, t));
      }
      t.callbackPriority = r, t.callbackNode = s;
    }
  }
  function Eh(t, r) {
    if (As = -1, Cs = 0, (_e & 6) !== 0) throw Error(o(327));
    var s = t.callbackNode;
    if ($r() && t.callbackNode !== s) return null;
    var u = Ii(t, t === Ge ? Xe : 0);
    if (u === 0) return null;
    if ((u & 30) !== 0 || (u & t.expiredLanes) !== 0 || r) r = Es(t, u);
    else {
      r = u;
      var p = _e;
      _e |= 2;
      var m = Mh();
      (Ge !== t || Xe !== r) && (fn = null, Ur = Le() + 500, ir(t, r));
      do
        try {
          Jw();
          break;
        } catch (P) {
          bh(t, P);
        }
      while (!0);
      Ll(), ws.current = m, _e = p, ze !== null ? r = 0 : (Ge = null, Xe = 0, r = $e);
    }
    if (r !== 0) {
      if (r === 2 && (p = el(t), p !== 0 && (u = p, r = xu(t, p))), r === 1) throw s = Ko, ir(t, 0), jn(t, u), ft(t, Le()), s;
      if (r === 6) jn(t, u);
      else {
        if (p = t.current.alternate, (u & 30) === 0 && !Zw(p) && (r = Es(t, u), r === 2 && (m = el(t), m !== 0 && (u = m, r = xu(t, m))), r === 1)) throw s = Ko, ir(t, 0), jn(t, u), ft(t, Le()), s;
        switch (t.finishedWork = p, t.finishedLanes = u, r) {
          case 0:
          case 1:
            throw Error(o(345));
          case 2:
            sr(t, dt, fn);
            break;
          case 3:
            if (jn(t, u), (u & 130023424) === u && (r = vu + 500 - Le(), 10 < r)) {
              if (Ii(t, 0) !== 0) break;
              if (p = t.suspendedLanes, (p & u) !== u) {
                ot(), t.pingedLanes |= t.suspendedLanes & p;
                break;
              }
              t.timeoutHandle = El(sr.bind(null, t, dt, fn), r);
              break;
            }
            sr(t, dt, fn);
            break;
          case 4:
            if (jn(t, u), (u & 4194240) === u) break;
            for (r = t.eventTimes, p = -1; 0 < u; ) {
              var _ = 31 - Rt(u);
              m = 1 << _, _ = r[_], _ > p && (p = _), u &= ~m;
            }
            if (u = p, u = Le() - u, u = (120 > u ? 120 : 480 > u ? 480 : 1080 > u ? 1080 : 1920 > u ? 1920 : 3e3 > u ? 3e3 : 4320 > u ? 4320 : 1960 * Xw(u / 1960)) - u, 10 < u) {
              t.timeoutHandle = El(sr.bind(null, t, dt, fn), u);
              break;
            }
            sr(t, dt, fn);
            break;
          case 5:
            sr(t, dt, fn);
            break;
          default:
            throw Error(o(329));
        }
      }
    }
    return ft(t, Le()), t.callbackNode === s ? Eh.bind(null, t) : null;
  }
  function xu(t, r) {
    var s = Yo;
    return t.current.memoizedState.isDehydrated && (ir(t, r).flags |= 256), t = Es(t, r), t !== 2 && (r = dt, dt = s, r !== null && _u(r)), t;
  }
  function _u(t) {
    dt === null ? dt = t : dt.push.apply(dt, t);
  }
  function Zw(t) {
    for (var r = t; ; ) {
      if (r.flags & 16384) {
        var s = r.updateQueue;
        if (s !== null && (s = s.stores, s !== null)) for (var u = 0; u < s.length; u++) {
          var p = s[u], m = p.getSnapshot;
          p = p.value;
          try {
            if (!Nt(m(), p)) return !1;
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
    for (r &= ~gu, r &= ~xs, t.suspendedLanes |= r, t.pingedLanes &= ~r, t = t.expirationTimes; 0 < r; ) {
      var s = 31 - Rt(r), u = 1 << s;
      t[s] = -1, r &= ~u;
    }
  }
  function Ph(t) {
    if ((_e & 6) !== 0) throw Error(o(327));
    $r();
    var r = Ii(t, 0);
    if ((r & 1) === 0) return ft(t, Le()), null;
    var s = Es(t, r);
    if (t.tag !== 0 && s === 2) {
      var u = el(t);
      u !== 0 && (r = u, s = xu(t, u));
    }
    if (s === 1) throw s = Ko, ir(t, 0), jn(t, r), ft(t, Le()), s;
    if (s === 6) throw Error(o(345));
    return t.finishedWork = t.current.alternate, t.finishedLanes = r, sr(t, dt, fn), ft(t, Le()), null;
  }
  function ku(t, r) {
    var s = _e;
    _e |= 1;
    try {
      return t(r);
    } finally {
      _e = s, _e === 0 && (Ur = Le() + 500, es && En());
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
      Ae = u, Ct.transition = s, _e = r, (_e & 6) === 0 && En();
    }
  }
  function Tu() {
    xt = Br.current, Re(Br);
  }
  function ir(t, r) {
    t.finishedWork = null, t.finishedLanes = 0;
    var s = t.timeoutHandle;
    if (s !== -1 && (t.timeoutHandle = -1, Ew(s)), ze !== null) for (s = ze.return; s !== null; ) {
      var u = s;
      switch (Dl(u), u.tag) {
        case 1:
          u = u.type.childContextTypes, u != null && qi();
          break;
        case 3:
          Lr(), Re(lt), Re(Je), Gl();
          break;
        case 5:
          Hl(u);
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
          Vl(u.type._context);
          break;
        case 22:
        case 23:
          Tu();
      }
      s = s.return;
    }
    if (Ge = t, ze = t = In(t.current, null), Xe = xt = r, $e = 0, Ko = null, gu = xs = rr = 0, dt = Yo = null, er !== null) {
      for (r = 0; r < er.length; r++) if (s = er[r], u = s.interleaved, u !== null) {
        s.interleaved = null;
        var p = u.next, m = s.pending;
        if (m !== null) {
          var _ = m.next;
          m.next = p, u.next = _;
        }
        s.pending = u;
      }
      er = null;
    }
    return t;
  }
  function bh(t, r) {
    do {
      var s = ze;
      try {
        if (Ll(), cs.current = hs, ds) {
          for (var u = Ie.memoizedState; u !== null; ) {
            var p = u.queue;
            p !== null && (p.pending = null), u = u.next;
          }
          ds = !1;
        }
        if (nr = 0, We = Ue = Ie = null, Bo = !1, Uo = 0, yu.current = null, s === null || s.return === null) {
          $e = 1, Ko = r, ze = null;
          break;
        }
        e: {
          var m = t, _ = s.return, P = s, M = r;
          if (r = Xe, P.flags |= 32768, M !== null && typeof M == "object" && typeof M.then == "function") {
            var F = M, B = P, H = B.tag;
            if ((B.mode & 1) === 0 && (H === 0 || H === 11 || H === 15)) {
              var z = B.alternate;
              z ? (B.updateQueue = z.updateQueue, B.memoizedState = z.memoizedState, B.lanes = z.lanes) : (B.updateQueue = null, B.memoizedState = null);
            }
            var ee = eh(_);
            if (ee !== null) {
              ee.flags &= -257, th(ee, _, P, m, r), ee.mode & 1 && Jp(m, F, r), r = ee, M = F;
              var ne = r.updateQueue;
              if (ne === null) {
                var oe = /* @__PURE__ */ new Set();
                oe.add(M), r.updateQueue = oe;
              } else ne.add(M);
              break e;
            } else {
              if ((r & 1) === 0) {
                Jp(m, F, r), Au();
                break e;
              }
              M = Error(o(426));
            }
          } else if (Ne && P.mode & 1) {
            var Ve = eh(_);
            if (Ve !== null) {
              (Ve.flags & 65536) === 0 && (Ve.flags |= 256), th(Ve, _, P, m, r), Fl(Vr(M, P));
              break e;
            }
          }
          m = M = Vr(M, P), $e !== 4 && ($e = 2), Yo === null ? Yo = [m] : Yo.push(m), m = _;
          do {
            switch (m.tag) {
              case 3:
                m.flags |= 65536, r &= -r, m.lanes |= r;
                var j = Zp(m, M, r);
                Tp(m, j);
                break e;
              case 1:
                P = M;
                var N = m.type, I = m.stateNode;
                if ((m.flags & 128) === 0 && (typeof N.getDerivedStateFromError == "function" || I !== null && typeof I.componentDidCatch == "function" && (Rn === null || !Rn.has(I)))) {
                  m.flags |= 65536, r &= -r, m.lanes |= r;
                  var Y = qp(m, P, r);
                  Tp(m, Y);
                  break e;
                }
            }
            m = m.return;
          } while (m !== null);
        }
        Nh(s);
      } catch (ie) {
        r = ie, ze === s && s !== null && (ze = s = s.return);
        continue;
      }
      break;
    } while (!0);
  }
  function Mh() {
    var t = ws.current;
    return ws.current = hs, t === null ? hs : t;
  }
  function Au() {
    ($e === 0 || $e === 3 || $e === 2) && ($e = 4), Ge === null || (rr & 268435455) === 0 && (xs & 268435455) === 0 || jn(Ge, Xe);
  }
  function Es(t, r) {
    var s = _e;
    _e |= 2;
    var u = Mh();
    (Ge !== t || Xe !== r) && (fn = null, ir(t, r));
    do
      try {
        qw();
        break;
      } catch (p) {
        bh(t, p);
      }
    while (!0);
    if (Ll(), _e = s, ws.current = u, ze !== null) throw Error(o(261));
    return Ge = null, Xe = 0, $e;
  }
  function qw() {
    for (; ze !== null; ) Rh(ze);
  }
  function Jw() {
    for (; ze !== null && !TS(); ) Rh(ze);
  }
  function Rh(t) {
    var r = Ih(t.alternate, t, xt);
    t.memoizedProps = t.pendingProps, r === null ? Nh(t) : ze = r, yu.current = null;
  }
  function Nh(t) {
    var r = t;
    do {
      var s = r.alternate;
      if (t = r.return, (r.flags & 32768) === 0) {
        if (s = Ww(s, r, xt), s !== null) {
          ze = s;
          return;
        }
      } else {
        if (s = Gw(s, r), s !== null) {
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
    var u = Ae, p = Ct.transition;
    try {
      Ct.transition = null, Ae = 1, e1(t, r, s, u);
    } finally {
      Ct.transition = p, Ae = u;
    }
    return null;
  }
  function e1(t, r, s, u) {
    do
      $r();
    while (Nn !== null);
    if ((_e & 6) !== 0) throw Error(o(327));
    s = t.finishedWork;
    var p = t.finishedLanes;
    if (s === null) return null;
    if (t.finishedWork = null, t.finishedLanes = 0, s === t.current) throw Error(o(177));
    t.callbackNode = null, t.callbackPriority = 0;
    var m = s.lanes | s.childLanes;
    if (jS(t, m), t === Ge && (ze = Ge = null, Xe = 0), (s.subtreeFlags & 2064) === 0 && (s.flags & 2064) === 0 || ks || (ks = !0, Fh(Ri, function() {
      return $r(), null;
    })), m = (s.flags & 15990) !== 0, (s.subtreeFlags & 15990) !== 0 || m) {
      m = Ct.transition, Ct.transition = null;
      var _ = Ae;
      Ae = 1;
      var P = _e;
      _e |= 4, yu.current = null, Yw(t, s), _h(s, t), ww(Al), Li = !!Tl, Al = Tl = null, t.current = s, Qw(s), AS(), _e = P, Ae = _, Ct.transition = m;
    } else t.current = s;
    if (ks && (ks = !1, Nn = t, Ts = p), m = t.pendingLanes, m === 0 && (Rn = null), PS(s.stateNode), ft(t, Le()), r !== null) for (u = t.onRecoverableError, s = 0; s < r.length; s++) p = r[s], u(p.value, { componentStack: p.stack, digest: p.digest });
    if (_s) throw _s = !1, t = Su, Su = null, t;
    return (Ts & 1) !== 0 && t.tag !== 0 && $r(), m = t.pendingLanes, (m & 1) !== 0 ? t === wu ? Qo++ : (Qo = 0, wu = t) : Qo = 0, En(), null;
  }
  function $r() {
    if (Nn !== null) {
      var t = wf(Ts), r = Ct.transition, s = Ae;
      try {
        if (Ct.transition = null, Ae = 16 > t ? 16 : t, Nn === null) var u = !1;
        else {
          if (t = Nn, Nn = null, Ts = 0, (_e & 6) !== 0) throw Error(o(331));
          var p = _e;
          for (_e |= 4, te = t.current; te !== null; ) {
            var m = te, _ = m.child;
            if ((te.flags & 16) !== 0) {
              var P = m.deletions;
              if (P !== null) {
                for (var M = 0; M < P.length; M++) {
                  var F = P[M];
                  for (te = F; te !== null; ) {
                    var B = te;
                    switch (B.tag) {
                      case 0:
                      case 11:
                      case 15:
                        Go(8, B, m);
                    }
                    var H = B.child;
                    if (H !== null) H.return = B, te = H;
                    else for (; te !== null; ) {
                      B = te;
                      var z = B.sibling, ee = B.return;
                      if (gh(B), B === F) {
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
                  Go(9, m, m.return);
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
              if (P = te, (P.flags & 2048) !== 0) try {
                switch (P.tag) {
                  case 0:
                  case 11:
                  case 15:
                    Ss(9, P);
                }
              } catch (ie) {
                Oe(P, P.return, ie);
              }
              if (P === _) {
                te = null;
                break e;
              }
              var Y = P.sibling;
              if (Y !== null) {
                Y.return = P.return, te = Y;
                break e;
              }
              te = P.return;
            }
          }
          if (_e = p, En(), Wt && typeof Wt.onPostCommitFiberRoot == "function") try {
            Wt.onPostCommitFiberRoot(Ni, t);
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
  function Dh(t, r, s) {
    r = Vr(s, r), r = Zp(t, r, 1), t = bn(t, r, 1), r = ot(), t !== null && (So(t, 1, r), ft(t, r));
  }
  function Oe(t, r, s) {
    if (t.tag === 3) Dh(t, t, s);
    else for (; r !== null; ) {
      if (r.tag === 3) {
        Dh(r, t, s);
        break;
      } else if (r.tag === 1) {
        var u = r.stateNode;
        if (typeof r.type.getDerivedStateFromError == "function" || typeof u.componentDidCatch == "function" && (Rn === null || !Rn.has(u))) {
          t = Vr(s, t), t = qp(r, t, 1), r = bn(r, t, 1), t = ot(), r !== null && (So(r, 1, t), ft(r, t));
          break;
        }
      }
      r = r.return;
    }
  }
  function t1(t, r, s) {
    var u = t.pingCache;
    u !== null && u.delete(r), r = ot(), t.pingedLanes |= t.suspendedLanes & s, Ge === t && (Xe & s) === s && ($e === 4 || $e === 3 && (Xe & 130023424) === Xe && 500 > Le() - vu ? ir(t, 0) : gu |= s), ft(t, r);
  }
  function jh(t, r) {
    r === 0 && ((t.mode & 1) === 0 ? r = 1 : (r = ji, ji <<= 1, (ji & 130023424) === 0 && (ji = 4194304)));
    var s = ot();
    t = un(t, r), t !== null && (So(t, r, s), ft(t, s));
  }
  function n1(t) {
    var r = t.memoizedState, s = 0;
    r !== null && (s = r.retryLane), jh(t, s);
  }
  function r1(t, r) {
    var s = 0;
    switch (t.tag) {
      case 13:
        var u = t.stateNode, p = t.memoizedState;
        p !== null && (s = p.retryLane);
        break;
      case 19:
        u = t.stateNode;
        break;
      default:
        throw Error(o(314));
    }
    u !== null && u.delete(r), jh(t, s);
  }
  var Ih;
  Ih = function(t, r, s) {
    if (t !== null) if (t.memoizedProps !== r.pendingProps || lt.current) ct = !0;
    else {
      if ((t.lanes & s) === 0 && (r.flags & 128) === 0) return ct = !1, Hw(t, r, s);
      ct = (t.flags & 131072) !== 0;
    }
    else ct = !1, Ne && (r.flags & 1048576) !== 0 && hp(r, ns, r.index);
    switch (r.lanes = 0, r.tag) {
      case 2:
        var u = r.type;
        gs(t, r), t = r.pendingProps;
        var p = Rr(r, Je.current);
        Or(r, s), p = Ql(null, r, u, t, p, s);
        var m = Xl();
        return r.flags |= 1, typeof p == "object" && p !== null && typeof p.render == "function" && p.$$typeof === void 0 ? (r.tag = 1, r.memoizedState = null, r.updateQueue = null, ut(u) ? (m = !0, Ji(r)) : m = !1, r.memoizedState = p.state !== null && p.state !== void 0 ? p.state : null, Ul(r), p.updater = ms, r.stateNode = p, p._reactInternals = r, nu(r, u, t, s), r = su(null, r, u, !0, m, s)) : (r.tag = 0, Ne && m && Nl(r), rt(null, r, p, s), r = r.child), r;
      case 16:
        u = r.elementType;
        e: {
          switch (gs(t, r), t = r.pendingProps, p = u._init, u = p(u._payload), r.type = u, p = r.tag = i1(u), t = jt(u, t), p) {
            case 0:
              r = iu(null, r, u, t, s);
              break e;
            case 1:
              r = ah(null, r, u, t, s);
              break e;
            case 11:
              r = nh(null, r, u, t, s);
              break e;
            case 14:
              r = rh(null, r, u, jt(u.type, t), s);
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
        return u = r.type, p = r.pendingProps, p = r.elementType === u ? p : jt(u, p), iu(t, r, u, p, s);
      case 1:
        return u = r.type, p = r.pendingProps, p = r.elementType === u ? p : jt(u, p), ah(t, r, u, p, s);
      case 3:
        e: {
          if (lh(r), t === null) throw Error(o(387));
          u = r.pendingProps, m = r.memoizedState, p = m.element, kp(t, r), ls(r, u, null, s);
          var _ = r.memoizedState;
          if (u = _.element, m.isDehydrated) if (m = { element: u, isDehydrated: !1, cache: _.cache, pendingSuspenseBoundaries: _.pendingSuspenseBoundaries, transitions: _.transitions }, r.updateQueue.baseState = m, r.memoizedState = m, r.flags & 256) {
            p = Vr(Error(o(423)), r), r = uh(t, r, u, s, p);
            break e;
          } else if (u !== p) {
            p = Vr(Error(o(424)), r), r = uh(t, r, u, s, p);
            break e;
          } else for (wt = Tn(r.stateNode.containerInfo.firstChild), St = r, Ne = !0, Dt = null, s = xp(r, null, u, s), r.child = s; s; ) s.flags = s.flags & -3 | 4096, s = s.sibling;
          else {
            if (jr(), u === p) {
              r = dn(t, r, s);
              break e;
            }
            rt(t, r, u, s);
          }
          r = r.child;
        }
        return r;
      case 5:
        return Cp(r), t === null && Il(r), u = r.type, p = r.pendingProps, m = t !== null ? t.memoizedProps : null, _ = p.children, Cl(u, p) ? _ = null : m !== null && Cl(u, m) && (r.flags |= 32), sh(t, r), rt(t, r, _, s), r.child;
      case 6:
        return t === null && Il(r), null;
      case 13:
        return ch(t, r, s);
      case 4:
        return $l(r, r.stateNode.containerInfo), u = r.pendingProps, t === null ? r.child = Ir(r, null, u, s) : rt(t, r, u, s), r.child;
      case 11:
        return u = r.type, p = r.pendingProps, p = r.elementType === u ? p : jt(u, p), nh(t, r, u, p, s);
      case 7:
        return rt(t, r, r.pendingProps, s), r.child;
      case 8:
        return rt(t, r, r.pendingProps.children, s), r.child;
      case 12:
        return rt(t, r, r.pendingProps.children, s), r.child;
      case 10:
        e: {
          if (u = r.type._context, p = r.pendingProps, m = r.memoizedProps, _ = p.value, Pe(is, u._currentValue), u._currentValue = _, m !== null) if (Nt(m.value, _)) {
            if (m.children === p.children && !lt.current) {
              r = dn(t, r, s);
              break e;
            }
          } else for (m = r.child, m !== null && (m.return = r); m !== null; ) {
            var P = m.dependencies;
            if (P !== null) {
              _ = m.child;
              for (var M = P.firstContext; M !== null; ) {
                if (M.context === u) {
                  if (m.tag === 1) {
                    M = cn(-1, s & -s), M.tag = 2;
                    var F = m.updateQueue;
                    if (F !== null) {
                      F = F.shared;
                      var B = F.pending;
                      B === null ? M.next = M : (M.next = B.next, B.next = M), F.pending = M;
                    }
                  }
                  m.lanes |= s, M = m.alternate, M !== null && (M.lanes |= s), zl(
                    m.return,
                    s,
                    r
                  ), P.lanes |= s;
                  break;
                }
                M = M.next;
              }
            } else if (m.tag === 10) _ = m.type === r.type ? null : m.child;
            else if (m.tag === 18) {
              if (_ = m.return, _ === null) throw Error(o(341));
              _.lanes |= s, P = _.alternate, P !== null && (P.lanes |= s), zl(_, s, r), _ = m.sibling;
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
          rt(t, r, p.children, s), r = r.child;
        }
        return r;
      case 9:
        return p = r.type, u = r.pendingProps.children, Or(r, s), p = Tt(p), u = u(p), r.flags |= 1, rt(t, r, u, s), r.child;
      case 14:
        return u = r.type, p = jt(u, r.pendingProps), p = jt(u.type, p), rh(t, r, u, p, s);
      case 15:
        return oh(t, r, r.type, r.pendingProps, s);
      case 17:
        return u = r.type, p = r.pendingProps, p = r.elementType === u ? p : jt(u, p), gs(t, r), r.tag = 1, ut(u) ? (t = !0, Ji(r)) : t = !1, Or(r, s), Qp(r, u, p), nu(r, u, p, s), su(null, r, u, !0, t, s);
      case 19:
        return fh(t, r, s);
      case 22:
        return ih(t, r, s);
    }
    throw Error(o(156, r.tag));
  };
  function Fh(t, r) {
    return mf(t, r);
  }
  function o1(t, r, s, u) {
    this.tag = t, this.key = s, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = r, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = u, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function Et(t, r, s, u) {
    return new o1(t, r, s, u);
  }
  function Cu(t) {
    return t = t.prototype, !(!t || !t.isReactComponent);
  }
  function i1(t) {
    if (typeof t == "function") return Cu(t) ? 1 : 0;
    if (t != null) {
      if (t = t.$$typeof, t === ce) return 11;
      if (t === we) return 14;
    }
    return 2;
  }
  function In(t, r) {
    var s = t.alternate;
    return s === null ? (s = Et(t.tag, r, t.key, t.mode), s.elementType = t.elementType, s.type = t.type, s.stateNode = t.stateNode, s.alternate = t, t.alternate = s) : (s.pendingProps = r, s.type = t.type, s.flags = 0, s.subtreeFlags = 0, s.deletions = null), s.flags = t.flags & 14680064, s.childLanes = t.childLanes, s.lanes = t.lanes, s.child = t.child, s.memoizedProps = t.memoizedProps, s.memoizedState = t.memoizedState, s.updateQueue = t.updateQueue, r = t.dependencies, s.dependencies = r === null ? null : { lanes: r.lanes, firstContext: r.firstContext }, s.sibling = t.sibling, s.index = t.index, s.ref = t.ref, s;
  }
  function Ps(t, r, s, u, p, m) {
    var _ = 2;
    if (u = t, typeof t == "function") Cu(t) && (_ = 1);
    else if (typeof t == "string") _ = 5;
    else e: switch (t) {
      case Z:
        return ar(s.children, p, m, r);
      case U:
        _ = 8, p |= 8;
        break;
      case G:
        return t = Et(12, s, r, p | 2), t.elementType = G, t.lanes = m, t;
      case ye:
        return t = Et(13, s, r, p), t.elementType = ye, t.lanes = m, t;
      case he:
        return t = Et(19, s, r, p), t.elementType = he, t.lanes = m, t;
      case ge:
        return bs(s, p, m, r);
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
    return r = Et(_, s, r, p), r.elementType = t, r.type = u, r.lanes = m, r;
  }
  function ar(t, r, s, u) {
    return t = Et(7, t, u, r), t.lanes = s, t;
  }
  function bs(t, r, s, u) {
    return t = Et(22, t, u, r), t.elementType = ge, t.lanes = s, t.stateNode = { isHidden: !1 }, t;
  }
  function Eu(t, r, s) {
    return t = Et(6, t, null, r), t.lanes = s, t;
  }
  function Pu(t, r, s) {
    return r = Et(4, t.children !== null ? t.children : [], t.key, r), r.lanes = s, r.stateNode = { containerInfo: t.containerInfo, pendingChildren: null, implementation: t.implementation }, r;
  }
  function s1(t, r, s, u, p) {
    this.tag = r, this.containerInfo = t, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = tl(0), this.expirationTimes = tl(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = tl(0), this.identifierPrefix = u, this.onRecoverableError = p, this.mutableSourceEagerHydrationData = null;
  }
  function bu(t, r, s, u, p, m, _, P, M) {
    return t = new s1(t, r, s, P, M), r === 1 ? (r = 1, m === !0 && (r |= 8)) : r = 0, m = Et(3, null, null, r), t.current = m, m.stateNode = t, m.memoizedState = { element: u, isDehydrated: s, cache: null, transitions: null, pendingSuspenseBoundaries: null }, Ul(m), t;
  }
  function a1(t, r, s) {
    var u = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return { $$typeof: X, key: u == null ? null : "" + u, children: t, containerInfo: r, implementation: s };
  }
  function Oh(t) {
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
      if (ut(s)) return dp(t, s, r);
    }
    return r;
  }
  function Lh(t, r, s, u, p, m, _, P, M) {
    return t = bu(s, u, !0, t, p, m, _, P, M), t.context = Oh(null), s = t.current, u = ot(), p = Dn(s), m = cn(u, p), m.callback = r ?? null, bn(s, m, p), t.current.lanes = p, So(t, p, u), ft(t, u), t;
  }
  function Ms(t, r, s, u) {
    var p = r.current, m = ot(), _ = Dn(p);
    return s = Oh(s), r.context === null ? r.context = s : r.pendingContext = s, r = cn(m, _), r.payload = { element: t }, u = u === void 0 ? null : u, u !== null && (r.callback = u), t = bn(p, r, _), t !== null && (Ot(t, p, _, m), as(t, p, _)), _;
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
  function Vh(t, r) {
    if (t = t.memoizedState, t !== null && t.dehydrated !== null) {
      var s = t.retryLane;
      t.retryLane = s !== 0 && s < r ? s : r;
    }
  }
  function Mu(t, r) {
    Vh(t, r), (t = t.alternate) && Vh(t, r);
  }
  function l1() {
    return null;
  }
  var zh = typeof reportError == "function" ? reportError : function(t) {
    console.error(t);
  };
  function Ru(t) {
    this._internalRoot = t;
  }
  Ns.prototype.render = Ru.prototype.render = function(t) {
    var r = this._internalRoot;
    if (r === null) throw Error(o(409));
    Ms(t, r, null, null);
  }, Ns.prototype.unmount = Ru.prototype.unmount = function() {
    var t = this._internalRoot;
    if (t !== null) {
      this._internalRoot = null;
      var r = t.containerInfo;
      or(function() {
        Ms(null, t, null, null);
      }), r[on] = null;
    }
  };
  function Ns(t) {
    this._internalRoot = t;
  }
  Ns.prototype.unstable_scheduleHydration = function(t) {
    if (t) {
      var r = kf();
      t = { blockedOn: null, target: t, priority: r };
      for (var s = 0; s < xn.length && r !== 0 && r < xn[s].priority; s++) ;
      xn.splice(s, 0, t), s === 0 && Cf(t);
    }
  };
  function Nu(t) {
    return !(!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11);
  }
  function Ds(t) {
    return !(!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11 && (t.nodeType !== 8 || t.nodeValue !== " react-mount-point-unstable "));
  }
  function Bh() {
  }
  function u1(t, r, s, u, p) {
    if (p) {
      if (typeof u == "function") {
        var m = u;
        u = function() {
          var F = Rs(_);
          m.call(F);
        };
      }
      var _ = Lh(r, u, t, 0, null, !1, !1, "", Bh);
      return t._reactRootContainer = _, t[on] = _.current, Do(t.nodeType === 8 ? t.parentNode : t), or(), _;
    }
    for (; p = t.lastChild; ) t.removeChild(p);
    if (typeof u == "function") {
      var P = u;
      u = function() {
        var F = Rs(M);
        P.call(F);
      };
    }
    var M = bu(t, 0, !1, null, null, !1, !1, "", Bh);
    return t._reactRootContainer = M, t[on] = M.current, Do(t.nodeType === 8 ? t.parentNode : t), or(function() {
      Ms(r, M, s, u);
    }), M;
  }
  function js(t, r, s, u, p) {
    var m = s._reactRootContainer;
    if (m) {
      var _ = m;
      if (typeof p == "function") {
        var P = p;
        p = function() {
          var M = Rs(_);
          P.call(M);
        };
      }
      Ms(r, _, t, p);
    } else _ = u1(s, r, t, p, u);
    return Rs(_);
  }
  xf = function(t) {
    switch (t.tag) {
      case 3:
        var r = t.stateNode;
        if (r.current.memoizedState.isDehydrated) {
          var s = vo(r.pendingLanes);
          s !== 0 && (nl(r, s | 1), ft(r, Le()), (_e & 6) === 0 && (Ur = Le() + 500, En()));
        }
        break;
      case 13:
        or(function() {
          var u = un(t, 1);
          if (u !== null) {
            var p = ot();
            Ot(u, t, 1, p);
          }
        }), Mu(t, 1);
    }
  }, rl = function(t) {
    if (t.tag === 13) {
      var r = un(t, 134217728);
      if (r !== null) {
        var s = ot();
        Ot(r, t, 134217728, s);
      }
      Mu(t, 134217728);
    }
  }, _f = function(t) {
    if (t.tag === 13) {
      var r = Dn(t), s = un(t, r);
      if (s !== null) {
        var u = ot();
        Ot(s, t, r, u);
      }
      Mu(t, r);
    }
  }, kf = function() {
    return Ae;
  }, Tf = function(t, r) {
    var s = Ae;
    try {
      return Ae = t, r();
    } finally {
      Ae = s;
    }
  }, Qa = function(t, r, s) {
    switch (r) {
      case "input":
        if (Ba(t, s), r = s.name, s.type === "radio" && r != null) {
          for (s = t; s.parentNode; ) s = s.parentNode;
          for (s = s.querySelectorAll("input[name=" + JSON.stringify("" + r) + '][type="radio"]'), r = 0; r < s.length; r++) {
            var u = s[r];
            if (u !== t && u.form === t.form) {
              var p = Zi(u);
              if (!p) throw Error(o(90));
              co(u), Ba(u, p);
            }
          }
        }
        break;
      case "textarea":
        qd(t, s);
        break;
      case "select":
        r = s.value, r != null && Sr(t, !!s.multiple, r, !1);
    }
  }, lf = ku, uf = or;
  var c1 = { usingClientEntryPoint: !1, Events: [Fo, br, Zi, sf, af, ku] }, Xo = { findFiberByHostInstance: Xn, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, d1 = { bundleType: Xo.bundleType, version: Xo.version, rendererPackageName: Xo.rendererPackageName, rendererConfig: Xo.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: D.ReactCurrentDispatcher, findHostInstanceByFiber: function(t) {
    return t = pf(t), t === null ? null : t.stateNode;
  }, findFiberByHostInstance: Xo.findFiberByHostInstance || l1, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Is = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Is.isDisabled && Is.supportsFiber) try {
      Ni = Is.inject(d1), Wt = Is;
    } catch {
    }
  }
  return pt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = c1, pt.createPortal = function(t, r) {
    var s = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!Nu(r)) throw Error(o(200));
    return a1(t, r, null, s);
  }, pt.createRoot = function(t, r) {
    if (!Nu(t)) throw Error(o(299));
    var s = !1, u = "", p = zh;
    return r != null && (r.unstable_strictMode === !0 && (s = !0), r.identifierPrefix !== void 0 && (u = r.identifierPrefix), r.onRecoverableError !== void 0 && (p = r.onRecoverableError)), r = bu(t, 1, !1, null, null, s, !1, u, p), t[on] = r.current, Do(t.nodeType === 8 ? t.parentNode : t), new Ru(r);
  }, pt.findDOMNode = function(t) {
    if (t == null) return null;
    if (t.nodeType === 1) return t;
    var r = t._reactInternals;
    if (r === void 0)
      throw typeof t.render == "function" ? Error(o(188)) : (t = Object.keys(t).join(","), Error(o(268, t)));
    return t = pf(r), t = t === null ? null : t.stateNode, t;
  }, pt.flushSync = function(t) {
    return or(t);
  }, pt.hydrate = function(t, r, s) {
    if (!Ds(r)) throw Error(o(200));
    return js(null, t, r, !0, s);
  }, pt.hydrateRoot = function(t, r, s) {
    if (!Nu(t)) throw Error(o(405));
    var u = s != null && s.hydratedSources || null, p = !1, m = "", _ = zh;
    if (s != null && (s.unstable_strictMode === !0 && (p = !0), s.identifierPrefix !== void 0 && (m = s.identifierPrefix), s.onRecoverableError !== void 0 && (_ = s.onRecoverableError)), r = Lh(r, null, t, 1, s ?? null, p, !1, m, _), t[on] = r.current, Do(t), u) for (t = 0; t < u.length; t++) s = u[t], p = s._getVersion, p = p(s._source), r.mutableSourceEagerHydrationData == null ? r.mutableSourceEagerHydrationData = [s, p] : r.mutableSourceEagerHydrationData.push(
      s,
      p
    );
    return new Ns(r);
  }, pt.render = function(t, r, s) {
    if (!Ds(r)) throw Error(o(200));
    return js(null, t, r, !1, s);
  }, pt.unmountComponentAtNode = function(t) {
    if (!Ds(t)) throw Error(o(40));
    return t._reactRootContainer ? (or(function() {
      js(null, null, t, !1, function() {
        t._reactRootContainer = null, t[on] = null;
      });
    }), !0) : !1;
  }, pt.unstable_batchedUpdates = ku, pt.unstable_renderSubtreeIntoContainer = function(t, r, s, u) {
    if (!Ds(s)) throw Error(o(200));
    if (t == null || t._reactInternals === void 0) throw Error(o(38));
    return js(t, r, s, !1, u);
  }, pt.version = "18.3.1-next-f1338f8080-20240426", pt;
}
var Xh;
function eg() {
  if (Xh) return ju.exports;
  Xh = 1;
  function e() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(e);
      } catch (n) {
        console.error(n);
      }
  }
  return e(), ju.exports = _1(), ju.exports;
}
var Zh;
function k1() {
  if (Zh) return Os;
  Zh = 1;
  var e = eg();
  return Os.createRoot = e.createRoot, Os.hydrateRoot = e.hydrateRoot, Os;
}
var T1 = k1(), Ou = { exports: {} }, qo = {};
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var qh;
function A1() {
  if (qh) return qo;
  qh = 1;
  var e = Jc(), n = Symbol.for("react.element"), o = Symbol.for("react.fragment"), i = Object.prototype.hasOwnProperty, a = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, c = { key: !0, ref: !0, __self: !0, __source: !0 };
  function d(f, y, v) {
    var S, l = {}, h = null, g = null;
    v !== void 0 && (h = "" + v), y.key !== void 0 && (h = "" + y.key), y.ref !== void 0 && (g = y.ref);
    for (S in y) i.call(y, S) && !c.hasOwnProperty(S) && (l[S] = y[S]);
    if (f && f.defaultProps) for (S in y = f.defaultProps, y) l[S] === void 0 && (l[S] = y[S]);
    return { $$typeof: n, type: f, key: h, ref: g, props: l, _owner: a.current };
  }
  return qo.Fragment = o, qo.jsx = d, qo.jsxs = d, qo;
}
var Jh;
function C1() {
  return Jh || (Jh = 1, Ou.exports = A1()), Ou.exports;
}
var w = C1();
const em = (e) => Symbol.iterator in e, tm = (e) => (
  // HACK: avoid checking entries type
  "entries" in e
), nm = (e, n) => {
  const o = e instanceof Map ? e : new Map(e.entries()), i = n instanceof Map ? n : new Map(n.entries());
  if (o.size !== i.size)
    return !1;
  for (const [a, c] of o)
    if (!i.has(a) || !Object.is(c, i.get(a)))
      return !1;
  return !0;
}, E1 = (e, n) => {
  const o = e[Symbol.iterator](), i = n[Symbol.iterator]();
  let a = o.next(), c = i.next();
  for (; !a.done && !c.done; ) {
    if (!Object.is(a.value, c.value))
      return !1;
    a = o.next(), c = i.next();
  }
  return !!a.done && !!c.done;
};
function P1(e, n) {
  return Object.is(e, n) ? !0 : typeof e != "object" || e === null || typeof n != "object" || n === null || Object.getPrototypeOf(e) !== Object.getPrototypeOf(n) ? !1 : em(e) && em(n) ? tm(e) && tm(n) ? nm(e, n) : E1(e, n) : nm(
    { entries: () => Object.entries(e) },
    { entries: () => Object.entries(n) }
  );
}
function b1(e) {
  const n = yn.useRef(void 0);
  return (o) => {
    const i = e(o);
    return P1(n.current, i) ? n.current : n.current = i;
  };
}
const td = C.createContext({});
function nd(e) {
  const n = C.useRef(null);
  return n.current === null && (n.current = e()), n.current;
}
const M1 = typeof window < "u", rd = M1 ? C.useLayoutEffect : C.useEffect, Pa = /* @__PURE__ */ C.createContext(null);
function od(e, n) {
  e.indexOf(n) === -1 && e.push(n);
}
function ca(e, n) {
  const o = e.indexOf(n);
  o > -1 && e.splice(o, 1);
}
const rn = (e, n, o) => o > n ? n : o < e ? e : o;
function rm(e, n) {
  return n ? `${e}. For more information and steps for solving, visit https://motion.dev/troubleshooting/${n}` : e;
}
let _i = () => {
}, vr = () => {
};
var Yy;
typeof process < "u" && ((Yy = process.env) == null ? void 0 : Yy.NODE_ENV) !== "production" && (_i = (e, n, o) => {
  !e && typeof console < "u" && console.warn(rm(n, o));
}, vr = (e, n, o) => {
  if (!e)
    throw new Error(rm(n, o));
});
const $n = {}, tg = (e) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(e), ng = (e) => typeof e == "object" && e !== null, rg = (e) => /^0[^.\s]+$/u.test(e);
// @__NO_SIDE_EFFECTS__
function og(e) {
  let n;
  return () => (n === void 0 && (n = e()), n);
}
const Mt = /* @__NO_SIDE_EFFECTS__ */ (e) => e, ki = (...e) => e.reduce((n, o) => (i) => o(n(i))), fi = /* @__NO_SIDE_EFFECTS__ */ (e, n, o) => {
  const i = n - e;
  return i ? (o - e) / i : 1;
};
class id {
  constructor() {
    this.subscriptions = [];
  }
  add(n) {
    return od(this.subscriptions, n), () => ca(this.subscriptions, n);
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
const yt = /* @__NO_SIDE_EFFECTS__ */ (e) => e * 1e3, bt = /* @__NO_SIDE_EFFECTS__ */ (e) => e / 1e3, ig = /* @__NO_SIDE_EFFECTS__ */ (e, n) => n ? e * (1e3 / n) : 0, sg = (e, n, o) => (((1 - 3 * o + 3 * n) * e + (3 * o - 6 * n)) * e + 3 * n) * e, R1 = 1e-7, N1 = 12;
function D1(e, n, o, i, a) {
  let c, d, f = 0;
  do
    d = n + (o - n) / 2, c = sg(d, i, a) - e, c > 0 ? o = d : n = d;
  while (Math.abs(c) > R1 && ++f < N1);
  return d;
}
// @__NO_SIDE_EFFECTS__
function Ti(e, n, o, i) {
  if (e === n && o === i)
    return Mt;
  const a = (c) => D1(c, 0, 1, e, o);
  return (c) => c === 0 || c === 1 ? c : sg(a(c), n, i);
}
const ag = /* @__NO_SIDE_EFFECTS__ */ (e) => (n) => n <= 0.5 ? e(2 * n) / 2 : (2 - e(2 * (1 - n))) / 2, lg = /* @__NO_SIDE_EFFECTS__ */ (e) => (n) => 1 - e(1 - n), ug = /* @__PURE__ */ Ti(0.33, 1.53, 0.69, 0.99), sd = /* @__PURE__ */ lg(ug), cg = /* @__PURE__ */ ag(sd), dg = (e) => e >= 1 ? 1 : (e *= 2) < 1 ? 0.5 * sd(e) : 0.5 * (2 - Math.pow(2, -10 * (e - 1))), ad = (e) => 1 - Math.sin(Math.acos(e)), fg = /* @__PURE__ */ lg(ad), pg = /* @__PURE__ */ ag(ad), j1 = /* @__PURE__ */ Ti(0.42, 0, 1, 1), I1 = /* @__PURE__ */ Ti(0, 0, 0.58, 1), hg = /* @__PURE__ */ Ti(0.42, 0, 0.58, 1), F1 = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] != "number", mg = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] == "number", om = {
  linear: Mt,
  easeIn: j1,
  easeInOut: hg,
  easeOut: I1,
  circIn: ad,
  circInOut: pg,
  circOut: fg,
  backIn: sd,
  backInOut: cg,
  backOut: ug,
  anticipate: dg
}, O1 = (e) => typeof e == "string", im = (e) => {
  if (/* @__PURE__ */ mg(e)) {
    vr(e.length === 4, "Cubic bezier arrays must contain four numerical values.", "cubic-bezier-length");
    const [n, o, i, a] = e;
    return /* @__PURE__ */ Ti(n, o, i, a);
  } else if (O1(e))
    return vr(om[e] !== void 0, `Invalid easing type '${e}'`, "invalid-easing-type"), om[e];
  return e;
}, Ls = [
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
function L1(e) {
  let n = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set(), i = !1, a = !1;
  const c = /* @__PURE__ */ new WeakSet();
  let d = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  };
  function f(v) {
    c.has(v) && (y.schedule(v), e()), v(d);
  }
  const y = {
    /**
     * Schedule a process to run on the next frame.
     */
    schedule: (v, S = !1, l = !1) => {
      const g = l && i ? n : o;
      return S && c.add(v), g.add(v), v;
    },
    /**
     * Cancel the provided callback from running on the next frame.
     */
    cancel: (v) => {
      o.delete(v), c.delete(v);
    },
    /**
     * Execute all schedule callbacks.
     */
    process: (v) => {
      if (d = v, i) {
        a = !0;
        return;
      }
      i = !0;
      const S = n;
      n = o, o = S, n.forEach(f), n.clear(), i = !1, a && (a = !1, y.process(v));
    }
  };
  return y;
}
const V1 = 40;
function yg(e, n) {
  let o = !1, i = !0;
  const a = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  }, c = () => o = !0, d = Ls.reduce((b, D) => (b[D] = L1(c), b), {}), { setup: f, read: y, resolveKeyframes: v, preUpdate: S, update: l, preRender: h, render: g, postRender: x } = d, k = () => {
    const b = $n.useManualTiming, D = b ? a.timestamp : performance.now();
    o = !1, b || (a.delta = i ? 1e3 / 60 : Math.max(Math.min(D - a.timestamp, V1), 1)), a.timestamp = D, a.isProcessing = !0, f.process(a), y.process(a), v.process(a), S.process(a), l.process(a), h.process(a), g.process(a), x.process(a), a.isProcessing = !1, o && n && (i = !1, e(k));
  }, T = () => {
    o = !0, i = !0, a.isProcessing || e(k);
  };
  return { schedule: Ls.reduce((b, D) => {
    const L = d[D];
    return b[D] = (X, Z = !1, U = !1) => (o || T(), L.schedule(X, Z, U)), b;
  }, {}), cancel: (b) => {
    for (let D = 0; D < Ls.length; D++)
      d[Ls[D]].cancel(b);
  }, state: a, steps: d };
}
const { schedule: Ee, cancel: Hn, state: Ze, steps: Lu } = /* @__PURE__ */ yg(typeof requestAnimationFrame < "u" ? requestAnimationFrame : Mt, !0);
let Xs;
function z1() {
  Xs = void 0;
}
const it = {
  now: () => (Xs === void 0 && it.set(Ze.isProcessing || $n.useManualTiming ? Ze.timestamp : performance.now()), Xs),
  set: (e) => {
    Xs = e, queueMicrotask(z1);
  }
}, gg = (e) => (n) => typeof n == "string" && n.startsWith(e), vg = /* @__PURE__ */ gg("--"), B1 = /* @__PURE__ */ gg("var(--"), ld = (e) => B1(e) ? U1.test(e.split("/*")[0].trim()) : !1, U1 = /var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;
function sm(e) {
  return typeof e != "string" ? !1 : e.split("/*")[0].includes("var(--");
}
const so = {
  test: (e) => typeof e == "number",
  parse: parseFloat,
  transform: (e) => e
}, pi = {
  ...so,
  transform: (e) => rn(0, 1, e)
}, Vs = {
  ...so,
  default: 1
}, ii = (e) => Math.round(e * 1e5) / 1e5, ud = /-?(?:\d+(?:\.\d+)?|\.\d+)/gu;
function $1(e) {
  return e == null;
}
const H1 = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu, cd = (e, n) => (o) => !!(typeof o == "string" && H1.test(o) && o.startsWith(e) || n && !$1(o) && Object.prototype.hasOwnProperty.call(o, n)), Sg = (e, n, o) => (i) => {
  if (typeof i != "string")
    return i;
  const [a, c, d, f] = i.match(ud);
  return {
    [e]: parseFloat(a),
    [n]: parseFloat(c),
    [o]: parseFloat(d),
    alpha: f !== void 0 ? parseFloat(f) : 1
  };
}, W1 = (e) => rn(0, 255, e), Vu = {
  ...so,
  transform: (e) => Math.round(W1(e))
}, fr = {
  test: /* @__PURE__ */ cd("rgb", "red"),
  parse: /* @__PURE__ */ Sg("red", "green", "blue"),
  transform: ({ red: e, green: n, blue: o, alpha: i = 1 }) => "rgba(" + Vu.transform(e) + ", " + Vu.transform(n) + ", " + Vu.transform(o) + ", " + ii(pi.transform(i)) + ")"
};
function G1(e) {
  let n = "", o = "", i = "", a = "";
  return e.length > 5 ? (n = e.substring(1, 3), o = e.substring(3, 5), i = e.substring(5, 7), a = e.substring(7, 9)) : (n = e.substring(1, 2), o = e.substring(2, 3), i = e.substring(3, 4), a = e.substring(4, 5), n += n, o += o, i += i, a += a), {
    red: parseInt(n, 16),
    green: parseInt(o, 16),
    blue: parseInt(i, 16),
    alpha: a ? parseInt(a, 16) / 255 : 1
  };
}
const dc = {
  test: /* @__PURE__ */ cd("#"),
  parse: G1,
  transform: fr.transform
}, Ai = /* @__NO_SIDE_EFFECTS__ */ (e) => ({
  test: (n) => typeof n == "string" && n.endsWith(e) && n.split(" ").length === 1,
  parse: parseFloat,
  transform: (n) => `${n}${e}`
}), mn = /* @__PURE__ */ Ai("deg"), tn = /* @__PURE__ */ Ai("%"), re = /* @__PURE__ */ Ai("px"), K1 = /* @__PURE__ */ Ai("vh"), Y1 = /* @__PURE__ */ Ai("vw"), am = {
  ...tn,
  parse: (e) => tn.parse(e) / 100,
  transform: (e) => tn.transform(e * 100)
}, Qr = {
  test: /* @__PURE__ */ cd("hsl", "hue"),
  parse: /* @__PURE__ */ Sg("hue", "saturation", "lightness"),
  transform: ({ hue: e, saturation: n, lightness: o, alpha: i = 1 }) => "hsla(" + Math.round(e) + ", " + tn.transform(ii(n)) + ", " + tn.transform(ii(o)) + ", " + ii(pi.transform(i)) + ")"
}, Be = {
  test: (e) => fr.test(e) || dc.test(e) || Qr.test(e),
  parse: (e) => fr.test(e) ? fr.parse(e) : Qr.test(e) ? Qr.parse(e) : dc.parse(e),
  transform: (e) => typeof e == "string" ? e : e.hasOwnProperty("red") ? fr.transform(e) : Qr.transform(e),
  getAnimatableNone: (e) => {
    const n = Be.parse(e);
    return n.alpha = 0, Be.transform(n);
  }
}, Q1 = /(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;
function X1(e) {
  var n, o;
  return isNaN(e) && typeof e == "string" && (((n = e.match(ud)) == null ? void 0 : n.length) || 0) + (((o = e.match(Q1)) == null ? void 0 : o.length) || 0) > 0;
}
const wg = "number", xg = "color", Z1 = "var", q1 = "var(", lm = "${}", J1 = /var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;
function to(e) {
  const n = e.toString(), o = [], i = {
    color: [],
    number: [],
    var: []
  }, a = [];
  let c = 0;
  const f = n.replace(J1, (y) => (Be.test(y) ? (i.color.push(c), a.push(xg), o.push(Be.parse(y))) : y.startsWith(q1) ? (i.var.push(c), a.push(Z1), o.push(y)) : (i.number.push(c), a.push(wg), o.push(parseFloat(y))), ++c, lm)).split(lm);
  return { values: o, split: f, indexes: i, types: a };
}
function ex(e) {
  return to(e).values;
}
function _g({ split: e, types: n }) {
  const o = e.length;
  return (i) => {
    let a = "";
    for (let c = 0; c < o; c++)
      if (a += e[c], i[c] !== void 0) {
        const d = n[c];
        d === wg ? a += ii(i[c]) : d === xg ? a += Be.transform(i[c]) : a += i[c];
      }
    return a;
  };
}
function tx(e) {
  return _g(to(e));
}
const nx = (e) => typeof e == "number" ? 0 : Be.test(e) ? Be.getAnimatableNone(e) : e, rx = (e, n) => typeof e == "number" ? n != null && n.trim().endsWith("/") ? e : 0 : nx(e);
function ox(e) {
  const n = to(e);
  return _g(n)(n.values.map((i, a) => rx(i, n.split[a])));
}
const $t = {
  test: X1,
  parse: ex,
  createTransformer: tx,
  getAnimatableNone: ox
};
function zu(e, n, o) {
  return o < 0 && (o += 1), o > 1 && (o -= 1), o < 1 / 6 ? e + (n - e) * 6 * o : o < 1 / 2 ? n : o < 2 / 3 ? e + (n - e) * (2 / 3 - o) * 6 : e;
}
function ix({ hue: e, saturation: n, lightness: o, alpha: i }) {
  e /= 360, n /= 100, o /= 100;
  let a = 0, c = 0, d = 0;
  if (!n)
    a = c = d = o;
  else {
    const f = o < 0.5 ? o * (1 + n) : o + n - o * n, y = 2 * o - f;
    a = zu(y, f, e + 1 / 3), c = zu(y, f, e), d = zu(y, f, e - 1 / 3);
  }
  return {
    red: Math.round(a * 255),
    green: Math.round(c * 255),
    blue: Math.round(d * 255),
    alpha: i
  };
}
function da(e, n) {
  return (o) => o > 0 ? n : e;
}
const Ce = (e, n, o) => e + (n - e) * o, Bu = (e, n, o) => {
  const i = e * e, a = o * (n * n - i) + i;
  return a < 0 ? 0 : Math.sqrt(a);
}, sx = [dc, fr, Qr], ax = (e) => sx.find((n) => n.test(e));
function um(e) {
  const n = ax(e);
  if (_i(!!n, `'${e}' is not an animatable color. Use the equivalent color code instead.`, "color-not-animatable"), !n)
    return !1;
  let o = n.parse(e);
  return n === Qr && (o = ix(o)), o;
}
const cm = (e, n) => {
  const o = um(e), i = um(n);
  if (!o || !i)
    return da(e, n);
  const a = { ...o };
  return (c) => (a.red = Bu(o.red, i.red, c), a.green = Bu(o.green, i.green, c), a.blue = Bu(o.blue, i.blue, c), a.alpha = Ce(o.alpha, i.alpha, c), fr.transform(a));
}, fc = /* @__PURE__ */ new Set(["none", "hidden"]);
function lx(e, n) {
  return fc.has(e) ? (o) => o <= 0 ? e : n : (o) => o >= 1 ? n : e;
}
function ux(e, n) {
  return (o) => Ce(e, n, o);
}
function dd(e) {
  return typeof e == "number" ? ux : typeof e == "string" ? ld(e) ? da : Be.test(e) ? cm : fx : Array.isArray(e) ? kg : typeof e == "object" ? Be.test(e) ? cm : cx : da;
}
function kg(e, n) {
  const o = [...e], i = o.length, a = e.map((c, d) => dd(c)(c, n[d]));
  return (c) => {
    for (let d = 0; d < i; d++)
      o[d] = a[d](c);
    return o;
  };
}
function cx(e, n) {
  const o = { ...e, ...n }, i = {};
  for (const a in o)
    e[a] !== void 0 && n[a] !== void 0 && (i[a] = dd(e[a])(e[a], n[a]));
  return (a) => {
    for (const c in i)
      o[c] = i[c](a);
    return o;
  };
}
function dx(e, n) {
  const o = [], i = { color: 0, var: 0, number: 0 };
  for (let a = 0; a < n.values.length; a++) {
    const c = n.types[a], d = e.indexes[c][i[c]], f = e.values[d] ?? 0;
    o[a] = f, i[c]++;
  }
  return o;
}
const fx = (e, n) => {
  const o = $t.createTransformer(n), i = to(e), a = to(n);
  return i.indexes.var.length === a.indexes.var.length && i.indexes.color.length === a.indexes.color.length && i.indexes.number.length >= a.indexes.number.length ? fc.has(e) && !a.values.length || fc.has(n) && !i.values.length ? lx(e, n) : ki(kg(dx(i, a), a.values), o) : (_i(!0, `Complex values '${e}' and '${n}' too different to mix. Ensure all colors are of the same type, and that each contains the same quantity of number and color values. Falling back to instant transition.`, "complex-values-different"), da(e, n));
};
function Tg(e, n, o) {
  return typeof e == "number" && typeof n == "number" && typeof o == "number" ? Ce(e, n, o) : dd(e)(e, n);
}
const px = (e) => {
  const n = ({ timestamp: o }) => e(o);
  return {
    start: (o = !0) => Ee.update(n, o),
    stop: () => Hn(n),
    /**
     * If we're processing this frame we can use the
     * framelocked timestamp to keep things in sync.
     */
    now: () => Ze.isProcessing ? Ze.timestamp : it.now()
  };
}, Ag = (e, n, o = 10) => {
  let i = "";
  const a = Math.max(Math.round(n / o), 2);
  for (let c = 0; c < a; c++)
    i += Math.round(e(c / (a - 1)) * 1e4) / 1e4 + ", ";
  return `linear(${i.substring(0, i.length - 2)})`;
}, fa = 2e4;
function fd(e) {
  let n = 0;
  const o = 50;
  let i = e.next(n);
  for (; !i.done && n < fa; )
    n += o, i = e.next(n);
  return n >= fa ? 1 / 0 : n;
}
function hx(e, n = 100, o) {
  const i = o({ ...e, keyframes: [0, n] }), a = Math.min(fd(i), fa);
  return {
    type: "keyframes",
    ease: (c) => i.next(a * c).value / n,
    duration: /* @__PURE__ */ bt(a)
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
function pc(e, n) {
  return e * Math.sqrt(1 - n * n);
}
const mx = 12;
function yx(e, n, o) {
  let i = o;
  for (let a = 1; a < mx; a++)
    i = i - e(i) / n(i);
  return i;
}
const Uu = 1e-3;
function gx({ duration: e = Fe.duration, bounce: n = Fe.bounce, velocity: o = Fe.velocity, mass: i = Fe.mass }) {
  let a, c;
  _i(e <= /* @__PURE__ */ yt(Fe.maxDuration), "Spring duration must be 10 seconds or less", "spring-duration-limit");
  let d = 1 - n;
  d = rn(Fe.minDamping, Fe.maxDamping, d), e = rn(Fe.minDuration, Fe.maxDuration, /* @__PURE__ */ bt(e)), d < 1 ? (a = (v) => {
    const S = v * d, l = S * e, h = S - o, g = pc(v, d), x = Math.exp(-l);
    return Uu - h / g * x;
  }, c = (v) => {
    const l = v * d * e, h = l * o + o, g = Math.pow(d, 2) * Math.pow(v, 2) * e, x = Math.exp(-l), k = pc(Math.pow(v, 2), d);
    return (-a(v) + Uu > 0 ? -1 : 1) * ((h - g) * x) / k;
  }) : (a = (v) => {
    const S = Math.exp(-v * e), l = (v - o) * e + 1;
    return -Uu + S * l;
  }, c = (v) => {
    const S = Math.exp(-v * e), l = (o - v) * (e * e);
    return S * l;
  });
  const f = 5 / e, y = yx(a, c, f);
  if (e = /* @__PURE__ */ yt(e), isNaN(y))
    return {
      stiffness: Fe.stiffness,
      damping: Fe.damping,
      duration: e
    };
  {
    const v = Math.pow(y, 2) * i;
    return {
      stiffness: v,
      damping: d * 2 * Math.sqrt(i * v),
      duration: e
    };
  }
}
const vx = ["duration", "bounce"], Sx = ["stiffness", "damping", "mass"];
function dm(e, n) {
  return n.some((o) => e[o] !== void 0);
}
function wx(e) {
  let n = {
    velocity: Fe.velocity,
    stiffness: Fe.stiffness,
    damping: Fe.damping,
    mass: Fe.mass,
    isResolvedFromDuration: !1,
    ...e
  };
  if (!dm(e, Sx) && dm(e, vx))
    if (n.velocity = 0, e.visualDuration) {
      const o = e.visualDuration, i = 2 * Math.PI / (o * 1.2), a = i * i, c = 2 * rn(0.05, 1, 1 - (e.bounce || 0)) * Math.sqrt(a);
      n = {
        ...n,
        mass: Fe.mass,
        stiffness: a,
        damping: c
      };
    } else {
      const o = gx({ ...e, velocity: 0 });
      n = {
        ...n,
        ...o,
        mass: Fe.mass
      }, n.isResolvedFromDuration = !0;
    }
  return n;
}
function pa(e = Fe.visualDuration, n = Fe.bounce) {
  const o = typeof e != "object" ? {
    visualDuration: e,
    keyframes: [0, 1],
    bounce: n
  } : e;
  let { restSpeed: i, restDelta: a } = o;
  const c = o.keyframes[0], d = o.keyframes[o.keyframes.length - 1], f = { done: !1, value: c }, { stiffness: y, damping: v, mass: S, duration: l, velocity: h, isResolvedFromDuration: g } = wx({
    ...o,
    velocity: -/* @__PURE__ */ bt(o.velocity || 0)
  }), x = h || 0, k = v / (2 * Math.sqrt(y * S)), T = d - c, A = /* @__PURE__ */ bt(Math.sqrt(y / S)), R = Math.abs(T) < 5;
  i || (i = R ? Fe.restSpeed.granular : Fe.restSpeed.default), a || (a = R ? Fe.restDelta.granular : Fe.restDelta.default);
  let b, D, L, X, Z, U;
  if (k < 1)
    L = pc(A, k), X = (x + k * A * T) / L, b = (Q) => {
      const J = Math.exp(-k * A * Q);
      return d - J * (X * Math.sin(L * Q) + T * Math.cos(L * Q));
    }, Z = k * A * X + T * L, U = k * A * T - X * L, D = (Q) => Math.exp(-k * A * Q) * (Z * Math.sin(L * Q) + U * Math.cos(L * Q));
  else if (k === 1) {
    b = (J) => d - Math.exp(-A * J) * (T + (x + A * T) * J);
    const Q = x + A * T;
    D = (J) => Math.exp(-A * J) * (A * Q * J - x);
  } else {
    const Q = A * Math.sqrt(k * k - 1);
    b = (he) => {
      const we = Math.exp(-k * A * he), ue = Math.min(Q * he, 300);
      return d - we * ((x + k * A * T) * Math.sinh(ue) + Q * T * Math.cosh(ue)) / Q;
    };
    const J = (x + k * A * T) / Q, ce = k * A * J - T * Q, ye = k * A * T - J * Q;
    D = (he) => {
      const we = Math.exp(-k * A * he), ue = Math.min(Q * he, 300);
      return we * (ce * Math.sinh(ue) + ye * Math.cosh(ue));
    };
  }
  const G = {
    calculatedDuration: g && l || null,
    velocity: (Q) => /* @__PURE__ */ yt(D(Q)),
    next: (Q) => {
      if (!g && k < 1) {
        const ce = Math.exp(-k * A * Q), ye = Math.sin(L * Q), he = Math.cos(L * Q), we = d - ce * (X * ye + T * he), ue = /* @__PURE__ */ yt(ce * (Z * ye + U * he));
        return f.done = Math.abs(ue) <= i && Math.abs(d - we) <= a, f.value = f.done ? d : we, f;
      }
      const J = b(Q);
      if (g)
        f.done = Q >= l;
      else {
        const ce = /* @__PURE__ */ yt(D(Q));
        f.done = Math.abs(ce) <= i && Math.abs(d - J) <= a;
      }
      return f.value = f.done ? d : J, f;
    },
    toString: () => {
      const Q = Math.min(fd(G), fa), J = Ag((ce) => G.next(Q * ce).value, Q, 30);
      return Q + "ms " + J;
    },
    toTransition: () => {
    }
  };
  return G;
}
pa.applyToOptions = (e) => {
  const n = hx(e, 100, pa);
  return e.ease = n.ease, e.duration = /* @__PURE__ */ yt(n.duration), e.type = "keyframes", e;
};
const xx = 5;
function Cg(e, n, o) {
  const i = Math.max(n - xx, 0);
  return /* @__PURE__ */ ig(o - e(i), n - i);
}
function hc({ keyframes: e, velocity: n = 0, power: o = 0.8, timeConstant: i = 325, bounceDamping: a = 10, bounceStiffness: c = 500, modifyTarget: d, min: f, max: y, restDelta: v = 0.5, restSpeed: S }) {
  const l = e[0], h = {
    done: !1,
    value: l
  }, g = (U) => f !== void 0 && U < f || y !== void 0 && U > y, x = (U) => f === void 0 ? y : y === void 0 || Math.abs(f - U) < Math.abs(y - U) ? f : y;
  let k = o * n;
  const T = l + k, A = d === void 0 ? T : d(T);
  A !== T && (k = A - l);
  const R = (U) => -k * Math.exp(-U / i), b = (U) => A + R(U), D = (U) => {
    const G = R(U), Q = b(U);
    h.done = Math.abs(G) <= v, h.value = h.done ? A : Q;
  };
  let L, X;
  const Z = (U) => {
    g(h.value) && (L = U, X = pa({
      keyframes: [h.value, x(h.value)],
      velocity: Cg(b, U, h.value),
      // TODO: This should be passing * 1000
      damping: a,
      stiffness: c,
      restDelta: v,
      restSpeed: S
    }));
  };
  return Z(0), {
    calculatedDuration: null,
    next: (U) => {
      let G = !1;
      return !X && L === void 0 && (G = !0, D(U), Z(U)), L !== void 0 && U >= L ? X.next(U - L) : (!G && D(U), h);
    }
  };
}
function _x(e, n, o) {
  const i = [], a = o || $n.mix || Tg, c = e.length - 1;
  for (let d = 0; d < c; d++) {
    let f = a(e[d], e[d + 1]);
    if (n) {
      const y = Array.isArray(n) ? n[d] || Mt : n;
      f = ki(y, f);
    }
    i.push(f);
  }
  return i;
}
function kx(e, n, { clamp: o = !0, ease: i, mixer: a } = {}) {
  const c = e.length;
  if (vr(c === n.length, "Both input and output ranges must be the same length", "range-length"), c === 1)
    return () => n[0];
  if (c === 2 && n[0] === n[1])
    return () => n[1];
  const d = e[0] === e[1];
  e[0] > e[c - 1] && (e = [...e].reverse(), n = [...n].reverse());
  const f = _x(n, i, a), y = f.length, v = (S) => {
    if (d && S < e[0])
      return n[0];
    let l = 0;
    if (y > 1)
      for (; l < e.length - 2 && !(S < e[l + 1]); l++)
        ;
    const h = /* @__PURE__ */ fi(e[l], e[l + 1], S);
    return f[l](h);
  };
  return o ? (S) => v(rn(e[0], e[c - 1], S)) : v;
}
function Tx(e, n) {
  const o = e[e.length - 1];
  for (let i = 1; i <= n; i++) {
    const a = /* @__PURE__ */ fi(0, n, i);
    e.push(Ce(o, 1, a));
  }
}
function Ax(e) {
  const n = [0];
  return Tx(n, e.length - 1), n;
}
function Cx(e, n) {
  return e.map((o) => o * n);
}
function Ex(e, n) {
  return e.map(() => n || hg).splice(0, e.length - 1);
}
function si({ duration: e = 300, keyframes: n, times: o, ease: i = "easeInOut" }) {
  const a = /* @__PURE__ */ F1(i) ? i.map(im) : im(i), c = {
    done: !1,
    value: n[0]
  }, d = Cx(
    // Only use the provided offsets if they're the correct length
    // TODO Maybe we should warn here if there's a length mismatch
    o && o.length === n.length ? o : Ax(n),
    e
  ), f = kx(d, n, {
    ease: Array.isArray(a) ? a : Ex(n, a)
  });
  return {
    calculatedDuration: e,
    next: (y) => (c.value = f(y), c.done = y >= e, c)
  };
}
const Px = (e) => e !== null;
function ba(e, { repeat: n, repeatType: o = "loop" }, i, a = 1) {
  const c = e.filter(Px), f = a < 0 || n && o !== "loop" && n % 2 === 1 ? 0 : c.length - 1;
  return !f || i === void 0 ? c[f] : i;
}
const bx = {
  decay: hc,
  inertia: hc,
  tween: si,
  keyframes: si,
  spring: pa
};
function Eg(e) {
  typeof e.type == "string" && (e.type = bx[e.type]);
}
class pd {
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
const Mx = (e) => e / 100;
class ha extends pd {
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
    const { type: o = si, repeat: i = 0, repeatDelay: a = 0, repeatType: c, velocity: d = 0 } = n;
    let { keyframes: f } = n;
    const y = o || si;
    y !== si && typeof f[0] != "number" && (this.mixKeyframes = ki(Mx, Tg(f[0], f[1])), f = [0, 100]);
    const v = y({ ...n, keyframes: f });
    c === "mirror" && (this.mirroredGenerator = y({
      ...n,
      keyframes: [...f].reverse(),
      velocity: -d
    })), v.calculatedDuration === null && (v.calculatedDuration = fd(v));
    const { calculatedDuration: S } = v;
    this.calculatedDuration = S, this.resolvedDuration = S + a, this.totalDuration = this.resolvedDuration * (i + 1) - a, this.generator = v;
  }
  updateTime(n) {
    const o = Math.round(n - this.startTime) * this.playbackSpeed;
    this.holdTime !== null ? this.currentTime = this.holdTime : this.currentTime = o;
  }
  tick(n, o = !1) {
    const { generator: i, totalDuration: a, mixKeyframes: c, mirroredGenerator: d, resolvedDuration: f, calculatedDuration: y } = this;
    if (this.startTime === null)
      return i.next(0);
    const { delay: v = 0, keyframes: S, repeat: l, repeatType: h, repeatDelay: g, type: x, onUpdate: k, finalKeyframe: T } = this.options;
    this.speed > 0 ? this.startTime = Math.min(this.startTime, n) : this.speed < 0 && (this.startTime = Math.min(n - a / this.speed, this.startTime)), o ? this.currentTime = n : this.updateTime(n);
    const A = this.currentTime - v * (this.playbackSpeed >= 0 ? 1 : -1), R = this.playbackSpeed >= 0 ? A < 0 : A > a;
    this.currentTime = Math.max(A, 0), this.state === "finished" && this.holdTime === null && (this.currentTime = a);
    let b = this.currentTime, D = i;
    if (l) {
      const U = Math.min(this.currentTime, a) / f;
      let G = Math.floor(U), Q = U % 1;
      !Q && U >= 1 && (Q = 1), Q === 1 && G--, G = Math.min(G, l + 1), !!(G % 2) && (h === "reverse" ? (Q = 1 - Q, g && (Q -= g / f)) : h === "mirror" && (D = d)), b = rn(0, 1, Q) * f;
    }
    let L;
    R ? (this.delayState.value = S[0], L = this.delayState) : L = D.next(b), c && !R && (L.value = c(L.value));
    let { done: X } = L;
    !R && y !== null && (X = this.playbackSpeed >= 0 ? this.currentTime >= a : this.currentTime <= 0);
    const Z = this.holdTime === null && (this.state === "finished" || this.state === "running" && X);
    return Z && x !== hc && (L.value = ba(S, this.options, T, this.speed)), k && k(L.value), Z && this.finish(), L;
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
    return /* @__PURE__ */ bt(this.calculatedDuration);
  }
  get iterationDuration() {
    const { delay: n = 0 } = this.options || {};
    return this.duration + /* @__PURE__ */ bt(n);
  }
  get time() {
    return /* @__PURE__ */ bt(this.currentTime);
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
    return Cg((i) => this.generator.next(i).value, n, o);
  }
  get speed() {
    return this.playbackSpeed;
  }
  set speed(n) {
    const o = this.playbackSpeed !== n;
    o && this.driver && this.updateTime(it.now()), this.playbackSpeed = n, o && this.driver && (this.time = /* @__PURE__ */ bt(this.currentTime));
  }
  play() {
    var a, c;
    if (this.isStopped)
      return;
    const { driver: n = px, startTime: o } = this.options;
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
function Rx(e) {
  for (let n = 1; n < e.length; n++)
    e[n] ?? (e[n] = e[n - 1]);
}
const pr = (e) => e * 180 / Math.PI, mc = (e) => {
  const n = pr(Math.atan2(e[1], e[0]));
  return yc(n);
}, Nx = {
  x: 4,
  y: 5,
  translateX: 4,
  translateY: 5,
  scaleX: 0,
  scaleY: 3,
  scale: (e) => (Math.abs(e[0]) + Math.abs(e[3])) / 2,
  rotate: mc,
  rotateZ: mc,
  skewX: (e) => pr(Math.atan(e[1])),
  skewY: (e) => pr(Math.atan(e[2])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[2])) / 2
}, yc = (e) => (e = e % 360, e < 0 && (e += 360), e), fm = mc, pm = (e) => Math.sqrt(e[0] * e[0] + e[1] * e[1]), hm = (e) => Math.sqrt(e[4] * e[4] + e[5] * e[5]), Dx = {
  x: 12,
  y: 13,
  z: 14,
  translateX: 12,
  translateY: 13,
  translateZ: 14,
  scaleX: pm,
  scaleY: hm,
  scale: (e) => (pm(e) + hm(e)) / 2,
  rotateX: (e) => yc(pr(Math.atan2(e[6], e[5]))),
  rotateY: (e) => yc(pr(Math.atan2(-e[2], e[0]))),
  rotateZ: fm,
  rotate: fm,
  skewX: (e) => pr(Math.atan(e[4])),
  skewY: (e) => pr(Math.atan(e[1])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[4])) / 2
};
function gc(e) {
  return e.includes("scale") ? 1 : 0;
}
function vc(e, n) {
  if (!e || e === "none")
    return gc(n);
  const o = e.match(/^matrix3d\(([-\d.e\s,]+)\)$/u);
  let i, a;
  if (o)
    i = Dx, a = o;
  else {
    const f = e.match(/^matrix\(([-\d.e\s,]+)\)$/u);
    i = Nx, a = f;
  }
  if (!a)
    return gc(n);
  const c = i[n], d = a[1].split(",").map(Ix);
  return typeof c == "function" ? c(d) : d[c];
}
const jx = (e, n) => {
  const { transform: o = "none" } = getComputedStyle(e);
  return vc(o, n);
};
function Ix(e) {
  return parseFloat(e.trim());
}
const ao = [
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
], lo = /* @__PURE__ */ new Set([...ao, "pathRotation"]), mm = (e) => e === so || e === re, Fx = /* @__PURE__ */ new Set(["x", "y", "z"]), Ox = ao.filter((e) => !Fx.has(e));
function Lx(e) {
  const n = [];
  return Ox.forEach((o) => {
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
  x: (e, { transform: n }) => vc(n, "x"),
  y: (e, { transform: n }) => vc(n, "y")
};
Un.translateX = Un.x;
Un.translateY = Un.y;
const hr = /* @__PURE__ */ new Set();
let Sc = !1, wc = !1, xc = !1;
function Pg() {
  if (wc) {
    const e = Array.from(hr).filter((i) => i.needsMeasurement), n = new Set(e.map((i) => i.element)), o = /* @__PURE__ */ new Map();
    n.forEach((i) => {
      const a = Lx(i);
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
  wc = !1, Sc = !1, hr.forEach((e) => e.complete(xc)), hr.clear();
}
function bg() {
  hr.forEach((e) => {
    e.readKeyframes(), e.needsMeasurement && (wc = !0);
  });
}
function Vx() {
  xc = !0, bg(), Pg(), xc = !1;
}
class hd {
  constructor(n, o, i, a, c, d = !1) {
    this.state = "pending", this.isAsync = !1, this.needsMeasurement = !1, this.unresolvedKeyframes = [...n], this.onComplete = o, this.name = i, this.motionValue = a, this.element = c, this.isAsync = d;
  }
  scheduleResolve() {
    this.state = "scheduled", this.isAsync ? (hr.add(this), Sc || (Sc = !0, Ee.read(bg), Ee.resolveKeyframes(Pg))) : (this.readKeyframes(), this.complete());
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
    Rx(n);
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
const zx = (e) => e.startsWith("--");
function Mg(e, n, o) {
  zx(n) ? e.style.setProperty(n, o) : e.style[n] = o;
}
const Bx = {};
function Rg(e, n) {
  const o = /* @__PURE__ */ og(e);
  return () => Bx[n] ?? o();
}
const Ux = /* @__PURE__ */ Rg(() => window.ScrollTimeline !== void 0, "scrollTimeline"), Ng = /* @__PURE__ */ Rg(() => {
  try {
    document.createElement("div").animate({ opacity: 0 }, { easing: "linear(0, 1)" });
  } catch {
    return !1;
  }
  return !0;
}, "linearEasing"), ri = ([e, n, o, i]) => `cubic-bezier(${e}, ${n}, ${o}, ${i})`, ym = {
  linear: "linear",
  ease: "ease",
  easeIn: "ease-in",
  easeOut: "ease-out",
  easeInOut: "ease-in-out",
  circIn: /* @__PURE__ */ ri([0, 0.65, 0.55, 1]),
  circOut: /* @__PURE__ */ ri([0.55, 0, 1, 0.45]),
  backIn: /* @__PURE__ */ ri([0.31, 0.01, 0.66, -0.59]),
  backOut: /* @__PURE__ */ ri([0.33, 1.53, 0.69, 0.99])
};
function Dg(e, n) {
  if (e)
    return typeof e == "function" ? Ng() ? Ag(e, n) : "ease-out" : /* @__PURE__ */ mg(e) ? ri(e) : Array.isArray(e) ? e.map((o) => Dg(o, n) || ym.easeOut) : ym[e];
}
function $x(e, n, o, { delay: i = 0, duration: a = 300, repeat: c = 0, repeatType: d = "loop", ease: f = "easeOut", times: y } = {}, v = void 0) {
  const S = {
    [n]: o
  };
  y && (S.offset = y);
  const l = Dg(f, a);
  Array.isArray(l) && (S.easing = l);
  const h = {
    delay: i,
    duration: a,
    easing: Array.isArray(l) ? "linear" : l,
    fill: "both",
    iterations: c + 1,
    direction: d === "reverse" ? "alternate" : "normal"
  };
  return v && (h.pseudoElement = v), e.animate(S, h);
}
function jg(e) {
  return typeof e == "function" && "applyToOptions" in e;
}
function Hx({ type: e, ...n }) {
  return jg(e) && Ng() ? e.applyToOptions(n) : (n.duration ?? (n.duration = 300), n.ease ?? (n.ease = "easeOut"), n);
}
class Ig extends pd {
  constructor(n) {
    if (super(), this.finishedTime = null, this.isStopped = !1, this.manualStartTime = null, !n)
      return;
    const { element: o, name: i, keyframes: a, pseudoElement: c, allowFlatten: d = !1, finalKeyframe: f, onComplete: y } = n;
    this.isPseudoElement = !!c, this.allowFlatten = d, this.options = n, vr(typeof n.type != "string", `Mini animate() doesn't support "type" as a string.`, "mini-spring");
    const v = Hx(n);
    this.animation = $x(o, i, a, v, c), v.autoplay === !1 && this.animation.pause(), this.animation.onfinish = () => {
      if (this.finishedTime = this.time, !c) {
        const S = ba(a, this.options, f, this.speed);
        this.updateMotionValue && this.updateMotionValue(S), Mg(o, i, S), this.animation.cancel();
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
    return /* @__PURE__ */ bt(Number(n));
  }
  get iterationDuration() {
    const { delay: n = 0 } = this.options || {};
    return this.duration + /* @__PURE__ */ bt(n);
  }
  get time() {
    return /* @__PURE__ */ bt(Number(this.animation.currentTime) || 0);
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
    return this.allowFlatten && ((c = this.animation.effect) == null || c.updateTiming({ easing: "linear" })), this.animation.onfinish = null, n && Ux() ? (this.animation.timeline = n, o && (this.animation.rangeStart = o), i && (this.animation.rangeEnd = i), Mt) : a(this);
  }
}
const Fg = {
  anticipate: dg,
  backInOut: cg,
  circInOut: pg
};
function Wx(e) {
  return e in Fg;
}
function Gx(e) {
  typeof e.ease == "string" && Wx(e.ease) && (e.ease = Fg[e.ease]);
}
const $u = 10;
class Kx extends Ig {
  constructor(n) {
    Gx(n), Eg(n), super(n), n.startTime !== void 0 && n.autoplay !== !1 && (this.startTime = n.startTime), this.options = n;
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
    const f = new ha({
      ...d,
      autoplay: !1
    }), y = Math.max($u, it.now() - this.startTime), v = rn(0, $u, y - $u), S = f.sample(y).value, { name: l } = this.options;
    c && l && Mg(c, l, S), o.setWithVelocity(f.sample(Math.max(0, y - v)).value, S, v), f.stop();
  }
}
const gm = (e, n) => n === "zIndex" ? !1 : !!(typeof e == "number" || Array.isArray(e) || typeof e == "string" && // It's animatable if we have a string
($t.test(e) || e === "0") && // And it contains numbers and/or colors
!e.startsWith("url("));
function Yx(e) {
  const n = e[0];
  if (e.length === 1)
    return !0;
  for (let o = 0; o < e.length; o++)
    if (e[o] !== n)
      return !0;
}
function Qx(e, n, o, i) {
  const a = e[0];
  if (a === null)
    return !1;
  if (n === "display" || n === "visibility")
    return !0;
  const c = e[e.length - 1], d = gm(a, n), f = gm(c, n);
  return _i(d === f, `You are trying to animate ${n} from "${a}" to "${c}". "${d ? c : a}" is not an animatable value.`, "value-not-animatable"), !d || !f ? !1 : Yx(e) || (o === "spring" || jg(o)) && i;
}
function _c(e) {
  e.duration = 0, e.type = "keyframes";
}
const Og = /* @__PURE__ */ new Set([
  "opacity",
  "clipPath",
  "filter",
  "transform"
  // TODO: Can be accelerated but currently disabled until https://issues.chromium.org/issues/41491098 is resolved
  // or until we implement support for linear() easing.
  // "background-color"
]), Xx = /^(?:oklch|oklab|lab|lch|color|color-mix|light-dark)\(/;
function Zx(e) {
  for (let n = 0; n < e.length; n++)
    if (typeof e[n] == "string" && Xx.test(e[n]))
      return !0;
  return !1;
}
const qx = /* @__PURE__ */ new Set([
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
]), Jx = /* @__PURE__ */ og(() => Object.hasOwnProperty.call(Element.prototype, "animate"));
function e_(e) {
  var l;
  const { motionValue: n, name: o, repeatDelay: i, repeatType: a, damping: c, type: d, keyframes: f } = e;
  if (!(((l = n == null ? void 0 : n.owner) == null ? void 0 : l.current) instanceof HTMLElement))
    return !1;
  const { onUpdate: v, transformTemplate: S } = n.owner.getProps();
  return Jx() && o && /**
   * Force WAAPI for color properties with browser-only color formats
   * (oklch, oklab, lab, lch, etc.) that the JS animation path can't parse.
   */
  (Og.has(o) || qx.has(o) && Zx(f)) && (o !== "transform" || !S) && /**
   * If we're outputting values to onUpdate then we can't use WAAPI as there's
   * no way to read the value from WAAPI every frame.
   */
  !v && !i && a !== "mirror" && c !== 0 && d !== "inertia";
}
const t_ = 40;
class n_ extends pd {
  constructor({ autoplay: n = !0, delay: o = 0, type: i = "keyframes", repeat: a = 0, repeatDelay: c = 0, repeatType: d = "loop", keyframes: f, name: y, motionValue: v, element: S, ...l }) {
    var x;
    super(), this.stop = () => {
      var k, T;
      this._animation && (this._animation.stop(), (k = this.stopTimeline) == null || k.call(this)), (T = this.keyframeResolver) == null || T.cancel();
    }, this.createdAt = it.now();
    const h = {
      autoplay: n,
      delay: o,
      type: i,
      repeat: a,
      repeatDelay: c,
      repeatType: d,
      name: y,
      motionValue: v,
      element: S,
      ...l
    }, g = (S == null ? void 0 : S.KeyframeResolver) || hd;
    this.keyframeResolver = new g(f, (k, T, A) => this.onKeyframesResolved(k, T, h, !A), y, v, S), (x = this.keyframeResolver) == null || x.scheduleResolve();
  }
  onKeyframesResolved(n, o, i, a) {
    var A, R;
    this.keyframeResolver = void 0;
    const { name: c, type: d, velocity: f, delay: y, isHandoff: v, onUpdate: S } = i;
    this.resolvedAt = it.now();
    let l = !0;
    Qx(n, c, d, f) || (l = !1, ($n.instantAnimations || !y) && (S == null || S(ba(n, i, o))), n[0] = n[n.length - 1], _c(i), i.repeat = 0);
    const g = {
      startTime: a ? this.resolvedAt ? this.resolvedAt - this.createdAt > t_ ? this.resolvedAt : this.createdAt : this.createdAt : void 0,
      finalKeyframe: o,
      ...i,
      keyframes: n
    }, x = l && !v && e_(g), k = (R = (A = g.motionValue) == null ? void 0 : A.owner) == null ? void 0 : R.current;
    let T;
    if (x)
      try {
        T = new Kx({
          ...g,
          element: k
        });
      } catch {
        T = new ha(g);
      }
    else
      T = new ha(g);
    T.finished.then(() => {
      this.notifyFinished();
    }).catch(Mt), this.pendingTimeline && (this.stopTimeline = T.attachTimeline(this.pendingTimeline), this.pendingTimeline = void 0), this._animation = T;
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
    return this._animation || ((n = this.keyframeResolver) == null || n.resume(), Vx()), this._animation;
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
function Lg(e, n, o, i = 0, a = 1) {
  const c = Array.from(e).sort((v, S) => v.sortNodePosition(S)).indexOf(n), d = e.size, f = (d - 1) * i;
  return typeof o == "function" ? o(c, d) : a === 1 ? c * i : f - c * i;
}
const vm = 30, r_ = (e) => !isNaN(parseFloat(e));
class o_ {
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
    this.current = n, this.updatedAt = it.now(), this.canTrackVelocity === null && n !== void 0 && (this.canTrackVelocity = r_(this.current));
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
    this.events[n] || (this.events[n] = new id());
    const i = this.events[n].add(o);
    return n === "change" ? () => {
      i(), Ee.read(() => {
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
    if (!this.canTrackVelocity || this.prevFrameValue === void 0 || n - this.updatedAt > vm)
      return 0;
    const o = Math.min(this.updatedAt - this.prevUpdatedAt, vm);
    return /* @__PURE__ */ ig(parseFloat(this.current) - parseFloat(this.prevFrameValue), o);
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
function no(e, n) {
  return new o_(e, n);
}
function Vg(e, n) {
  if (e != null && e.inherit && n) {
    const { inherit: o, ...i } = e;
    return { ...n, ...i };
  }
  return e;
}
function md(e, n) {
  const o = (e == null ? void 0 : e[n]) ?? (e == null ? void 0 : e.default) ?? e;
  return o !== e ? Vg(o, e) : o;
}
const i_ = {
  type: "spring",
  stiffness: 500,
  damping: 25,
  restSpeed: 10
}, s_ = (e) => ({
  type: "spring",
  stiffness: 550,
  damping: e === 0 ? 2 * Math.sqrt(550) : 30,
  restSpeed: 10
}), a_ = {
  type: "keyframes",
  duration: 0.8
}, l_ = {
  type: "keyframes",
  ease: [0.25, 0.1, 0.35, 1],
  duration: 0.3
}, u_ = (e, { keyframes: n }) => n.length > 2 ? a_ : lo.has(e) ? e.startsWith("scale") ? s_(n[1]) : i_ : l_, c_ = /* @__PURE__ */ new Set([
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
function d_(e) {
  for (const n in e)
    if (!c_.has(n))
      return !0;
  return !1;
}
const yd = (e, n, o, i = {}, a, c) => (d) => {
  const f = md(i, e) || {}, y = f.delay || i.delay || 0;
  let { elapsed: v = 0 } = i;
  v = v - /* @__PURE__ */ yt(y);
  const S = {
    keyframes: Array.isArray(o) ? o : [null, o],
    ease: "easeOut",
    velocity: n.getVelocity(),
    ...f,
    delay: -v,
    onUpdate: (h) => {
      n.set(h), f.onUpdate && f.onUpdate(h);
    },
    onComplete: () => {
      d(), f.onComplete && f.onComplete();
    },
    name: e,
    motionValue: n,
    element: c ? void 0 : a
  };
  d_(f) || Object.assign(S, u_(e, S)), S.duration && (S.duration = /* @__PURE__ */ yt(S.duration)), S.repeatDelay && (S.repeatDelay = /* @__PURE__ */ yt(S.repeatDelay)), S.from !== void 0 && (S.keyframes[0] = S.from);
  let l = !1;
  if ((S.type === !1 || S.duration === 0 && !S.repeatDelay) && (_c(S), S.delay === 0 && (l = !0)), ($n.instantAnimations || $n.skipAnimations || a != null && a.shouldSkipAnimations || f.skipAnimations) && (l = !0, _c(S), S.delay = 0), S.allowFlatten = !f.type && !f.ease, l && !c && n.get() !== void 0) {
    const h = ba(S.keyframes, f);
    if (h !== void 0) {
      Ee.update(() => {
        S.onUpdate(h), S.onComplete();
      });
      return;
    }
  }
  return f.isSync ? new ha(S) : new n_(S);
}, f_ = (
  // eslint-disable-next-line redos-detector/no-unsafe-regex -- false positive, as it can match a lot of words
  /^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u
);
function p_(e) {
  const n = f_.exec(e);
  if (!n)
    return [,];
  const [, o, i, a] = n;
  return [`--${o ?? i}`, a];
}
const h_ = 4;
function zg(e, n, o = 1) {
  vr(o <= h_, `Max CSS variable fallback depth detected in property "${e}". This may indicate a circular fallback dependency.`, "max-css-var-depth");
  const [i, a] = p_(e);
  if (!i)
    return;
  const c = window.getComputedStyle(n).getPropertyValue(i);
  if (c) {
    const d = c.trim();
    return tg(d) ? parseFloat(d) : d;
  }
  return ld(a) ? zg(a, n, o + 1) : a;
}
function Sm(e) {
  const n = [{}, {}];
  return e == null || e.values.forEach((o, i) => {
    n[0][i] = o.get(), n[1][i] = o.getVelocity();
  }), n;
}
function gd(e, n, o, i) {
  if (typeof n == "function") {
    const [a, c] = Sm(i);
    n = n(o !== void 0 ? o : e.custom, a, c);
  }
  if (typeof n == "string" && (n = e.variants && e.variants[n]), typeof n == "function") {
    const [a, c] = Sm(i);
    n = n(o !== void 0 ? o : e.custom, a, c);
  }
  return n;
}
function mr(e, n, o) {
  const i = e.getProps();
  return gd(i, n, o !== void 0 ? o : i.custom, e);
}
const Bg = /* @__PURE__ */ new Set([
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
  ...ao
]), kc = (e) => Array.isArray(e);
function m_(e, n, o) {
  e.hasValue(n) ? e.getValue(n).set(o) : e.addValue(n, no(o));
}
function y_(e) {
  return kc(e) ? e[e.length - 1] || 0 : e;
}
function g_(e, n) {
  const o = mr(e, n);
  let { transitionEnd: i = {}, transition: a = {}, ...c } = o || {};
  c = { ...c, ...i };
  for (const d in c) {
    const f = y_(c[d]);
    m_(e, d, f);
  }
}
const qe = (e) => !!(e && e.getVelocity);
function v_(e) {
  return !!(qe(e) && e.add);
}
function Tc(e, n) {
  const o = e.getValue("willChange");
  if (v_(o))
    return o.add(n);
  if (!o && $n.WillChange) {
    const i = new $n.WillChange("auto");
    e.addValue("willChange", i), i.add(n);
  }
}
function vd(e) {
  return e.replace(/([A-Z])/g, (n) => `-${n.toLowerCase()}`);
}
const S_ = "framerAppearId", Ug = "data-" + vd(S_);
function $g(e) {
  return e.props[Ug];
}
function w_({ protectedKeys: e, needsAnimating: n }, o) {
  const i = e.hasOwnProperty(o) && n[o] !== !0;
  return n[o] = !1, i;
}
function Hg(e, n, { delay: o = 0, transitionOverride: i, type: a } = {}) {
  let { transition: c, transitionEnd: d, ...f } = n;
  const y = e.getDefaultTransition();
  c = c ? Vg(c, y) : y;
  const v = c == null ? void 0 : c.reduceMotion, S = c == null ? void 0 : c.skipAnimations;
  i && (c = i);
  const l = [], h = a && e.animationState && e.animationState.getState()[a], g = c == null ? void 0 : c.path;
  g && g.animateVisualElement(e, f, c, o, l);
  for (const x in f) {
    const k = e.getValue(x, e.latestValues[x] ?? null), T = f[x];
    if (T === void 0 || h && w_(h, x))
      continue;
    const A = {
      delay: o,
      ...md(c || {}, x)
    };
    S && (A.skipAnimations = !0);
    const R = k.get();
    if (R !== void 0 && !k.isAnimating() && !Array.isArray(T) && T === R && !A.velocity) {
      Ee.update(() => k.set(T));
      continue;
    }
    let b = !1;
    if (window.MotionHandoffAnimation) {
      const X = $g(e);
      if (X) {
        const Z = window.MotionHandoffAnimation(X, x, Ee);
        Z !== null && (A.startTime = Z, b = !0);
      }
    }
    Tc(e, x);
    const D = v ?? e.shouldReduceMotion;
    k.start(yd(x, k, T, D && Bg.has(x) ? { type: !1 } : A, e, b));
    const L = k.animation;
    L && l.push(L);
  }
  if (d) {
    const x = () => Ee.update(() => {
      d && g_(e, d);
    });
    l.length ? Promise.all(l).then(x) : x();
  }
  return l;
}
function Ac(e, n, o = {}) {
  var y;
  const i = mr(e, n, o.type === "exit" ? (y = e.presenceContext) == null ? void 0 : y.custom : void 0);
  let { transition: a = e.getDefaultTransition() || {} } = i || {};
  o.transitionOverride && (a = o.transitionOverride);
  const c = i ? () => Promise.all(Hg(e, i, o)) : () => Promise.resolve(), d = e.variantChildren && e.variantChildren.size ? (v = 0) => {
    const { delayChildren: S = 0, staggerChildren: l, staggerDirection: h } = a;
    return x_(e, n, v, S, l, h, o);
  } : () => Promise.resolve(), { when: f } = a;
  if (f) {
    const [v, S] = f === "beforeChildren" ? [c, d] : [d, c];
    return v().then(() => S());
  } else
    return Promise.all([c(), d(o.delay)]);
}
function x_(e, n, o = 0, i = 0, a = 0, c = 1, d) {
  const f = [];
  for (const y of e.variantChildren)
    y.notify("AnimationStart", n), f.push(Ac(y, n, {
      ...d,
      delay: o + (typeof i == "function" ? 0 : i) + Lg(e.variantChildren, y, i, a, c)
    }).then(() => y.notify("AnimationComplete", n)));
  return Promise.all(f);
}
function __(e, n, o = {}) {
  e.notify("AnimationStart", n);
  let i;
  if (Array.isArray(n)) {
    const a = n.map((c) => Ac(e, c, o));
    i = Promise.all(a);
  } else if (typeof n == "string")
    i = Ac(e, n, o);
  else {
    const a = typeof n == "function" ? mr(e, n, o.custom) : n;
    i = Promise.all(Hg(e, a, o));
  }
  return i.then(() => {
    e.notify("AnimationComplete", n);
  });
}
const k_ = {
  test: (e) => e === "auto",
  parse: (e) => e
}, Wg = (e) => (n) => n.test(e), Gg = [so, re, tn, mn, Y1, K1, k_], wm = (e) => Gg.find(Wg(e));
function T_(e) {
  return typeof e == "number" ? e === 0 : e !== null ? e === "none" || e === "0" || rg(e) : !0;
}
const A_ = /* @__PURE__ */ new Set(["brightness", "contrast", "saturate", "opacity"]);
function C_(e) {
  const [n, o] = e.slice(0, -1).split("(");
  if (n === "drop-shadow")
    return e;
  const [i] = o.match(ud) || [];
  if (!i)
    return e;
  const a = o.replace(i, "");
  let c = A_.has(n) ? 1 : 0;
  return i !== o && (c *= 100), n + "(" + c + a + ")";
}
const E_ = /\b([a-z-]*)\(.*?\)/gu, Cc = {
  ...$t,
  getAnimatableNone: (e) => {
    const n = e.match(E_);
    return n ? n.map(C_).join(" ") : e;
  }
}, Ec = {
  ...$t,
  getAnimatableNone: (e) => {
    const n = $t.parse(e);
    return $t.createTransformer(e)(n.map((i) => typeof i == "number" ? 0 : typeof i == "object" ? { ...i, alpha: 1 } : i));
  }
}, xm = {
  ...so,
  transform: Math.round
}, P_ = {
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
  scale: Vs,
  scaleX: Vs,
  scaleY: Vs,
  scaleZ: Vs,
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
  opacity: pi,
  originX: am,
  originY: am,
  originZ: re
}, ma = {
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
  ...P_,
  zIndex: xm,
  // SVG
  fillOpacity: pi,
  strokeOpacity: pi,
  numOctaves: xm
}, b_ = {
  ...ma,
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
  filter: Cc,
  WebkitFilter: Cc,
  mask: Ec,
  WebkitMask: Ec
}, Kg = (e) => b_[e], M_ = /* @__PURE__ */ new Set([Cc, Ec]);
function Yg(e, n) {
  let o = Kg(e);
  return M_.has(o) || (o = $t), o.getAnimatableNone ? o.getAnimatableNone(n) : void 0;
}
const R_ = /* @__PURE__ */ new Set(["auto", "none", "0"]);
function N_(e, n, o) {
  let i = 0, a;
  for (; i < e.length && !a; ) {
    const c = e[i];
    typeof c == "string" && !R_.has(c) && to(c).values.length && (a = e[i]), i++;
  }
  if (a && o)
    for (const c of n)
      e[c] = Yg(o, a);
}
class D_ extends hd {
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
      if (typeof l == "string" && (l = l.trim(), ld(l))) {
        const h = zg(l, o.current);
        h !== void 0 && (n[S] = h), S === n.length - 1 && (this.finalKeyframe = l);
      }
    }
    if (this.resolveNoneKeyframes(), !Bg.has(i) || n.length !== 2)
      return;
    const [a, c] = n, d = wm(a), f = wm(c), y = sm(a), v = sm(c);
    if (y !== v && Un[i]) {
      this.needsMeasurement = !0;
      return;
    }
    if (d !== f)
      if (mm(d) && mm(f))
        for (let S = 0; S < n.length; S++) {
          const l = n[S];
          typeof l == "string" && (n[S] = parseFloat(l));
        }
      else Un[i] && (this.needsMeasurement = !0);
  }
  resolveNoneKeyframes() {
    const { unresolvedKeyframes: n, name: o } = this, i = [];
    for (let a = 0; a < n.length; a++)
      (n[a] === null || T_(n[a])) && i.push(a);
    i.length && N_(n, i, o);
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
    var f;
    const { element: n, name: o, unresolvedKeyframes: i } = this;
    if (!n || !n.current)
      return;
    const a = n.getValue(o);
    a && a.jump(this.measuredOrigin, !1);
    const c = i.length - 1, d = i[c];
    i[c] = Un[o](n.measureViewportBox(), window.getComputedStyle(n.current)), d !== null && this.finalKeyframe === void 0 && (this.finalKeyframe = d), (f = this.removedTransforms) != null && f.length && this.removedTransforms.forEach(([y, v]) => {
      n.getValue(y).set(v);
    }), this.resolveNoneKeyframes();
  }
}
const Sd = [
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomRightRadius",
  "borderBottomLeftRadius"
];
function Qg(e, n, o) {
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
function Zs(e) {
  return ng(e) && "offsetHeight" in e && !("ownerSVGElement" in e);
}
const { schedule: wd } = /* @__PURE__ */ yg(queueMicrotask, !1), zt = {
  x: !1,
  y: !1
};
function Xg() {
  return zt.x || zt.y;
}
function j_(e) {
  return e === "x" || e === "y" ? zt[e] ? null : (zt[e] = !0, () => {
    zt[e] = !1;
  }) : zt.x || zt.y ? null : (zt.x = zt.y = !0, () => {
    zt.x = zt.y = !1;
  });
}
function Zg(e, n) {
  const o = Qg(e), i = new AbortController(), a = {
    passive: !0,
    ...n,
    signal: i.signal
  };
  return [o, a, () => i.abort()];
}
function I_(e) {
  return !(e.pointerType === "touch" || Xg());
}
function F_(e, n, o = {}) {
  const [i, a, c] = Zg(e, o);
  return i.forEach((d) => {
    let f = !1, y = !1, v;
    const S = () => {
      d.removeEventListener("pointerleave", x);
    }, l = (T) => {
      v && (v(T), v = void 0), S();
    }, h = (T) => {
      f = !1, window.removeEventListener("pointerup", h), window.removeEventListener("pointercancel", h), y && (y = !1, l(T));
    }, g = () => {
      f = !0, window.addEventListener("pointerup", h, a), window.addEventListener("pointercancel", h, a);
    }, x = (T) => {
      if (T.pointerType !== "touch") {
        if (f) {
          y = !0;
          return;
        }
        l(T);
      }
    }, k = (T) => {
      if (!I_(T))
        return;
      y = !1;
      const A = n(d, T);
      typeof A == "function" && (v = A, d.addEventListener("pointerleave", x, a));
    };
    d.addEventListener("pointerenter", k, a), d.addEventListener("pointerdown", g, a);
  }), c;
}
const qg = (e, n) => n ? e === n ? !0 : qg(e, n.parentElement) : !1, xd = (e) => e.pointerType === "mouse" ? typeof e.button != "number" || e.button <= 0 : e.isPrimary !== !1, O_ = /* @__PURE__ */ new Set([
  "BUTTON",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "A"
]);
function L_(e) {
  return O_.has(e.tagName) || e.isContentEditable === !0;
}
const V_ = /* @__PURE__ */ new Set(["INPUT", "SELECT", "TEXTAREA"]);
function z_(e) {
  return V_.has(e.tagName) || e.isContentEditable === !0;
}
const qs = /* @__PURE__ */ new WeakSet();
function _m(e) {
  return (n) => {
    n.key === "Enter" && e(n);
  };
}
function Hu(e, n) {
  e.dispatchEvent(new PointerEvent("pointer" + n, { isPrimary: !0, bubbles: !0 }));
}
const B_ = (e, n) => {
  const o = e.currentTarget;
  if (!o)
    return;
  const i = _m(() => {
    if (qs.has(o))
      return;
    Hu(o, "down");
    const a = _m(() => {
      Hu(o, "up");
    }), c = () => Hu(o, "cancel");
    o.addEventListener("keyup", a, n), o.addEventListener("blur", c, n);
  });
  o.addEventListener("keydown", i, n), o.addEventListener("blur", () => o.removeEventListener("keydown", i), n);
};
function km(e) {
  return xd(e) && !Xg();
}
const Tm = /* @__PURE__ */ new WeakSet();
function U_(e, n, o = {}) {
  const [i, a, c] = Zg(e, o), d = (f) => {
    const y = f.currentTarget;
    if (!km(f) || Tm.has(f))
      return;
    qs.add(y), o.stopPropagation && Tm.add(f);
    const v = n(y, f), S = { ...a, capture: !0 }, l = (x, k) => {
      window.removeEventListener("pointerup", h, S), window.removeEventListener("pointercancel", g, S), qs.has(y) && qs.delete(y), km(x) && typeof v == "function" && v(x, { success: k });
    }, h = (x) => {
      l(x, y === window || y === document || o.useGlobalTarget || qg(y, x.target));
    }, g = (x) => {
      l(x, !1);
    };
    window.addEventListener("pointerup", h, S), window.addEventListener("pointercancel", g, S);
  };
  return i.forEach((f) => {
    (o.useGlobalTarget ? window : f).addEventListener("pointerdown", d, a), Zs(f) && (f.addEventListener("focus", (v) => B_(v, a)), !L_(f) && !f.hasAttribute("tabindex") && (f.tabIndex = 0));
  }), c;
}
function _d(e) {
  return ng(e) && "ownerSVGElement" in e;
}
const Js = /* @__PURE__ */ new WeakMap();
let On;
const Jg = (e, n, o) => (i, a) => a && a[0] ? a[0][e + "Size"] : _d(i) && "getBBox" in i ? i.getBBox()[n] : i[o], $_ = /* @__PURE__ */ Jg("inline", "width", "offsetWidth"), H_ = /* @__PURE__ */ Jg("block", "height", "offsetHeight");
function W_({ target: e, borderBoxSize: n }) {
  var o;
  (o = Js.get(e)) == null || o.forEach((i) => {
    i(e, {
      get width() {
        return $_(e, n);
      },
      get height() {
        return H_(e, n);
      }
    });
  });
}
function G_(e) {
  e.forEach(W_);
}
function K_() {
  typeof ResizeObserver > "u" || (On = new ResizeObserver(G_));
}
function Y_(e, n) {
  On || K_();
  const o = Qg(e);
  return o.forEach((i) => {
    let a = Js.get(i);
    a || (a = /* @__PURE__ */ new Set(), Js.set(i, a)), a.add(n), On == null || On.observe(i);
  }), () => {
    o.forEach((i) => {
      const a = Js.get(i);
      a == null || a.delete(n), a != null && a.size || On == null || On.unobserve(i);
    });
  };
}
const ea = /* @__PURE__ */ new Set();
let Xr;
function Q_() {
  Xr = () => {
    const e = {
      get width() {
        return window.innerWidth;
      },
      get height() {
        return window.innerHeight;
      }
    };
    ea.forEach((n) => n(e));
  }, window.addEventListener("resize", Xr);
}
function X_(e) {
  return ea.add(e), Xr || Q_(), () => {
    ea.delete(e), !ea.size && typeof Xr == "function" && (window.removeEventListener("resize", Xr), Xr = void 0);
  };
}
function Am(e, n) {
  return typeof e == "function" ? X_(e) : Y_(e, n);
}
function Z_(e) {
  return _d(e) && e.tagName === "svg";
}
const q_ = [...Gg, Be, $t], J_ = (e) => q_.find(Wg(e)), Cm = () => ({
  translate: 0,
  scale: 1,
  origin: 0,
  originPoint: 0
}), Zr = () => ({
  x: Cm(),
  y: Cm()
}), Em = () => ({ min: 0, max: 0 }), He = () => ({
  x: Em(),
  y: Em()
}), ek = /* @__PURE__ */ new WeakMap();
function Ma(e) {
  return e !== null && typeof e == "object" && typeof e.start == "function";
}
function hi(e) {
  return typeof e == "string" || Array.isArray(e);
}
const kd = [
  "animate",
  "whileInView",
  "whileFocus",
  "whileHover",
  "whileTap",
  "whileDrag",
  "exit"
], Td = ["initial", ...kd];
function Ra(e) {
  return Ma(e.animate) || Td.some((n) => hi(e[n]));
}
function ev(e) {
  return !!(Ra(e) || e.variants);
}
function tk(e, n, o) {
  for (const i in n) {
    const a = n[i], c = o[i];
    if (qe(a))
      e.addValue(i, a);
    else if (qe(c))
      e.addValue(i, no(a, { owner: e }));
    else if (c !== a)
      if (e.hasValue(i)) {
        const d = e.getValue(i);
        d.liveStyle === !0 ? d.jump(a) : d.hasAnimated || d.set(a);
      } else {
        const d = e.getStaticValue(i);
        e.addValue(i, no(d !== void 0 ? d : a, { owner: e }));
      }
  }
  for (const i in o)
    n[i] === void 0 && e.removeValue(i);
  return n;
}
const bc = { current: null }, tv = { current: !1 }, nk = typeof window < "u";
function rk() {
  if (tv.current = !0, !!nk)
    if (window.matchMedia) {
      const e = window.matchMedia("(prefers-reduced-motion)"), n = () => bc.current = e.matches;
      e.addEventListener("change", n), n();
    } else
      bc.current = !1;
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
let ya = {};
function nv(e) {
  ya = e;
}
function ok() {
  return ya;
}
class ik {
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
  constructor({ parent: n, props: o, presenceContext: i, reducedMotionConfig: a, skipAnimations: c, blockInitialAnimation: d, visualState: f }, y = {}) {
    this.current = null, this.children = /* @__PURE__ */ new Set(), this.isVariantNode = !1, this.isControllingVariants = !1, this.shouldReduceMotion = null, this.shouldSkipAnimations = !1, this.values = /* @__PURE__ */ new Map(), this.KeyframeResolver = hd, this.features = {}, this.valueSubscriptions = /* @__PURE__ */ new Map(), this.prevMotionValues = {}, this.hasBeenMounted = !1, this.events = {}, this.propEventSubscriptions = {}, this.notifyUpdate = () => this.notify("Update", this.latestValues), this.render = () => {
      this.current && (this.triggerBuild(), this.renderInstance(this.current, this.renderState, this.props.style, this.projection));
    }, this.renderScheduledAt = 0, this.scheduleRender = () => {
      const g = it.now();
      this.renderScheduledAt < g && (this.renderScheduledAt = g, Ee.render(this.render, !1, !0));
    };
    const { latestValues: v, renderState: S } = f;
    this.latestValues = v, this.baseTarget = { ...v }, this.initialValues = o.initial ? { ...v } : {}, this.renderState = S, this.parent = n, this.props = o, this.presenceContext = i, this.depth = n ? n.depth + 1 : 0, this.reducedMotionConfig = a, this.skipAnimationsConfig = c, this.options = y, this.blockInitialAnimation = !!d, this.isControllingVariants = Ra(o), this.isVariantNode = ev(o), this.isVariantNode && (this.variantChildren = /* @__PURE__ */ new Set()), this.manuallyAnimateOnMount = !!(n && n.current);
    const { willChange: l, ...h } = this.scrapeMotionValuesFromProps(o, {}, this);
    for (const g in h) {
      const x = h[g];
      v[g] !== void 0 && qe(x) && x.set(v[g]);
    }
  }
  mount(n) {
    var o, i;
    if (this.hasBeenMounted)
      for (const a in this.initialValues)
        (o = this.values.get(a)) == null || o.jump(this.initialValues[a]), this.latestValues[a] = this.initialValues[a];
    this.current = n, ek.set(n, this), this.projection && !this.projection.instance && this.projection.mount(n), this.parent && this.isVariantNode && !this.isControllingVariants && (this.removeFromVariantTree = this.parent.addVariantChild(this)), this.values.forEach((a, c) => this.bindToMotionValue(c, a)), this.reducedMotionConfig === "never" ? this.shouldReduceMotion = !1 : this.reducedMotionConfig === "always" ? this.shouldReduceMotion = !0 : (tv.current || rk(), this.shouldReduceMotion = bc.current), this.shouldSkipAnimations = this.skipAnimationsConfig ?? !1, (i = this.parent) == null || i.addChild(this), this.update(this.props, this.presenceContext), this.hasBeenMounted = !0;
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
    if (this.valueSubscriptions.has(n) && this.valueSubscriptions.get(n)(), o.accelerate && Og.has(n) && this.current instanceof HTMLElement) {
      const { factory: d, keyframes: f, times: y, ease: v, duration: S } = o.accelerate, l = new Ig({
        element: this.current,
        name: n,
        keyframes: f,
        times: y,
        ease: v,
        duration: /* @__PURE__ */ yt(S)
      }), h = d(l);
      this.valueSubscriptions.set(n, () => {
        h(), l.cancel();
      });
      return;
    }
    const i = lo.has(n);
    i && this.onBindTransform && this.onBindTransform();
    const a = o.on("change", (d) => {
      this.latestValues[n] = d, this.props.onUpdate && Ee.preRender(this.notifyUpdate), i && this.projection && (this.projection.isTransformDirty = !0), this.scheduleRender();
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
    for (n in ya) {
      const o = ya[n];
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
    this.prevMotionValues = tk(this, this.scrapeMotionValuesFromProps(n, this.prevProps || {}, this), this.prevMotionValues), this.handleChildMotionValue && this.handleChildMotionValue();
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
    return i === void 0 && o !== void 0 && (i = no(o === null ? void 0 : o, { owner: this }), this.addValue(n, i)), i;
  }
  /**
   * If we're trying to animate to a previously unencountered value,
   * we need to check for it in our state and as a last resort read it
   * directly from the instance (which might have performance implications).
   */
  readValue(n, o) {
    let i = this.latestValues[n] !== void 0 || !this.current ? this.latestValues[n] : this.getBaseTargetFromProps(this.props, n) ?? this.readValueFromInstance(this.current, n, this.options);
    return i != null && (typeof i == "string" && (tg(i) || rg(i)) ? i = parseFloat(i) : !J_(i) && $t.test(o) && (i = Yg(n, o)), this.setBaseTarget(n, qe(i) ? i.get() : i)), qe(i) ? i.get() : i;
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
      const d = gd(this.props, o, (c = this.presenceContext) == null ? void 0 : c.custom);
      d && (i = d[n]);
    }
    if (o && i !== void 0)
      return i;
    const a = this.getBaseTargetFromProps(this.props, n);
    return a !== void 0 && !qe(a) ? a : this.initialValues[n] !== void 0 && i === void 0 ? void 0 : this.baseTarget[n];
  }
  on(n, o) {
    return this.events[n] || (this.events[n] = new id()), this.events[n].add(o);
  }
  notify(n, ...o) {
    this.events[n] && this.events[n].notify(...o);
  }
  scheduleRenderMicrotask() {
    wd.render(this.render);
  }
}
class rv extends ik {
  constructor() {
    super(...arguments), this.KeyframeResolver = D_;
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
function ov({ top: e, left: n, right: o, bottom: i }) {
  return {
    x: { min: n, max: o },
    y: { min: e, max: i }
  };
}
function sk({ x: e, y: n }) {
  return { top: n.min, right: e.max, bottom: n.max, left: e.min };
}
function ak(e, n) {
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
function Wu(e) {
  return e === void 0 || e === 1;
}
function Mc({ scale: e, scaleX: n, scaleY: o }) {
  return !Wu(e) || !Wu(n) || !Wu(o);
}
function ur(e) {
  return Mc(e) || iv(e) || e.z || e.rotate || e.rotateX || e.rotateY || e.skewX || e.skewY;
}
function iv(e) {
  return bm(e.x) || bm(e.y);
}
function bm(e) {
  return e && e !== "0%";
}
function ga(e, n, o) {
  const i = e - o, a = n * i;
  return o + a;
}
function Mm(e, n, o, i, a) {
  return a !== void 0 && (e = ga(e, a, i)), ga(e, o, i) + n;
}
function Rc(e, n = 0, o = 1, i, a) {
  e.min = Mm(e.min, n, o, i, a), e.max = Mm(e.max, n, o, i, a);
}
function sv(e, { x: n, y: o }) {
  Rc(e.x, n.translate, n.scale, n.originPoint), Rc(e.y, o.translate, o.scale, o.originPoint);
}
const Rm = 0.999999999999, Nm = 1.0000000000001;
function lk(e, n, o, i = !1) {
  var f;
  const a = o.length;
  if (!a)
    return;
  n.x = n.y = 1;
  let c, d;
  for (let y = 0; y < a; y++) {
    c = o[y], d = c.projectionDelta;
    const { visualElement: v } = c.options;
    v && v.props.style && v.props.style.display === "contents" || (i && c.options.layoutScroll && c.scroll && c !== c.root && (Jt(e.x, -c.scroll.offset.x), Jt(e.y, -c.scroll.offset.y)), d && (n.x *= d.x.scale, n.y *= d.y.scale, sv(e, d)), i && ur(c.latestValues) && ta(e, c.latestValues, (f = c.layout) == null ? void 0 : f.layoutBox));
  }
  n.x < Nm && n.x > Rm && (n.x = 1), n.y < Nm && n.y > Rm && (n.y = 1);
}
function Jt(e, n) {
  e.min += n, e.max += n;
}
function Dm(e, n, o, i, a = 0.5) {
  const c = Ce(e.min, e.max, a);
  Rc(e, n, o, c, i);
}
function jm(e, n) {
  return typeof e == "string" ? parseFloat(e) / 100 * (n.max - n.min) : e;
}
function ta(e, n, o) {
  const i = o ?? e;
  Dm(e.x, jm(n.x, i.x), n.scaleX, n.scale, n.originX), Dm(e.y, jm(n.y, i.y), n.scaleY, n.scale, n.originY);
}
function av(e, n) {
  return ov(ak(e.getBoundingClientRect(), n));
}
function uk(e, n, o) {
  const i = av(e, o), { scroll: a } = n;
  return a && (Jt(i.x, a.offset.x), Jt(i.y, a.offset.y)), i;
}
const ck = {
  x: "translateX",
  y: "translateY",
  z: "translateZ",
  transformPerspective: "perspective"
}, dk = ao.length;
function fk(e, n, o) {
  let i = "", a = !0;
  for (let d = 0; d < dk; d++) {
    const f = ao[d], y = e[f];
    if (y === void 0)
      continue;
    let v = !0;
    if (typeof y == "number")
      v = y === (f.startsWith("scale") ? 1 : 0);
    else {
      const S = parseFloat(y);
      v = f.startsWith("scale") ? S === 1 : S === 0;
    }
    if (!v || o) {
      const S = Pc(y, ma[f]);
      if (!v) {
        a = !1;
        const l = ck[f] || f;
        i += `${l}(${S}) `;
      }
      o && (n[f] = S);
    }
  }
  const c = e.pathRotation;
  return c && (a = !1, i += `rotate(${Pc(c, ma.pathRotation)}) `), i = i.trim(), o ? i = o(n, a ? "" : i) : a && (i = "none"), i;
}
function Ad(e, n, o) {
  const { style: i, vars: a, transformOrigin: c } = e;
  let d = !1, f = !1;
  for (const y in n) {
    const v = n[y];
    if (lo.has(y)) {
      d = !0;
      continue;
    } else if (vg(y)) {
      a[y] = v;
      continue;
    } else {
      const S = Pc(v, ma[y]);
      y.startsWith("origin") ? (f = !0, c[y] = S) : i[y] = S;
    }
  }
  if (n.transform || (d || o ? i.transform = fk(n, e.transform, o) : i.transform && (i.transform = "none")), f) {
    const { originX: y = "50%", originY: v = "50%", originZ: S = 0 } = c;
    i.transformOrigin = `${y} ${v} ${S}`;
  }
}
function lv(e, { style: n, vars: o }, i, a) {
  const c = e.style;
  let d;
  for (d in n)
    c[d] = n[d];
  a == null || a.applyProjectionStyles(c, i);
  for (d in o)
    c.setProperty(d, o[d]);
}
function Im(e, n) {
  return n.max === n.min ? 0 : e / (n.max - n.min) * 100;
}
const Jo = {
  correct: (e, n) => {
    if (!n.target)
      return e;
    if (typeof e == "string")
      if (re.test(e))
        e = parseFloat(e);
      else
        return e;
    const o = Im(e, n.target.x), i = Im(e, n.target.y);
    return `${o}% ${i}%`;
  }
}, pk = {
  correct: (e, { treeScale: n, projectionDelta: o }) => {
    const i = e, a = $t.parse(e);
    if (a.length > 5)
      return i;
    const c = $t.createTransformer(e), d = typeof a[0] != "number" ? 1 : 0, f = o.x.scale * n.x, y = o.y.scale * n.y;
    a[0 + d] /= f, a[1 + d] /= y;
    const v = Ce(f, y, 0.5);
    return typeof a[2 + d] == "number" && (a[2 + d] /= v), typeof a[3 + d] == "number" && (a[3 + d] /= v), c(a);
  }
}, Nc = {
  borderRadius: {
    ...Jo,
    applyTo: [...Sd]
  },
  borderTopLeftRadius: Jo,
  borderTopRightRadius: Jo,
  borderBottomLeftRadius: Jo,
  borderBottomRightRadius: Jo,
  boxShadow: pk
};
function uv(e, { layout: n, layoutId: o }) {
  return lo.has(e) || e.startsWith("origin") || (n || o !== void 0) && (!!Nc[e] || e === "opacity");
}
function Cd(e, n, o) {
  var d;
  const i = e.style, a = n == null ? void 0 : n.style, c = {};
  if (!i)
    return c;
  for (const f in i)
    (qe(i[f]) || a && qe(a[f]) || uv(f, e) || ((d = o == null ? void 0 : o.getValue(f)) == null ? void 0 : d.liveStyle) !== void 0) && (c[f] = i[f]);
  return c;
}
function hk(e) {
  return window.getComputedStyle(e);
}
class mk extends rv {
  constructor() {
    super(...arguments), this.type = "html", this.renderInstance = lv;
  }
  readValueFromInstance(n, o) {
    var i;
    if (lo.has(o))
      return (i = this.projection) != null && i.isProjecting ? gc(o) : jx(n, o);
    {
      const a = hk(n), c = (vg(o) ? a.getPropertyValue(o) : a[o]) || 0;
      return typeof c == "string" ? c.trim() : c;
    }
  }
  measureInstanceViewportBox(n, { transformPagePoint: o }) {
    return av(n, o);
  }
  build(n, o, i) {
    Ad(n, o, i.transformTemplate);
  }
  scrapeMotionValuesFromProps(n, o, i) {
    return Cd(n, o, i);
  }
}
const yk = {
  offset: "stroke-dashoffset",
  array: "stroke-dasharray"
}, gk = {
  offset: "strokeDashoffset",
  array: "strokeDasharray"
};
function vk(e, n, o = 1, i = 0, a = !0) {
  e.pathLength = 1;
  const c = a ? yk : gk;
  e[c.offset] = `${-i}`, e[c.array] = `${n} ${o}`;
}
const Sk = [
  "offsetDistance",
  "offsetPath",
  "offsetRotate",
  "offsetAnchor"
];
function cv(e, {
  attrX: n,
  attrY: o,
  attrScale: i,
  pathLength: a,
  pathSpacing: c = 1,
  pathOffset: d = 0,
  // This is object creation, which we try to avoid per-frame.
  ...f
}, y, v, S) {
  if (Ad(e, f, v), y) {
    e.style.viewBox && (e.attrs.viewBox = e.style.viewBox);
    return;
  }
  e.attrs = e.style, e.style = {};
  const { attrs: l, style: h } = e;
  l.transform && (h.transform = l.transform, delete l.transform), (h.transform || l.transformOrigin) && (h.transformOrigin = l.transformOrigin ?? "50% 50%", delete l.transformOrigin), h.transform && (h.transformBox = (S == null ? void 0 : S.transformBox) ?? "fill-box", delete l.transformBox);
  for (const g of Sk)
    l[g] !== void 0 && (h[g] = l[g], delete l[g]);
  n !== void 0 && (l.x = n), o !== void 0 && (l.y = o), i !== void 0 && (l.scale = i), a !== void 0 && vk(l, a, c, d, !1);
}
const dv = /* @__PURE__ */ new Set([
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
]), fv = (e) => typeof e == "string" && e.toLowerCase() === "svg";
function wk(e, n, o, i) {
  lv(e, n, void 0, i);
  for (const a in n.attrs)
    e.setAttribute(dv.has(a) ? a : vd(a), n.attrs[a]);
}
function pv(e, n, o) {
  const i = Cd(e, n, o);
  for (const a in e)
    if (qe(e[a]) || qe(n[a])) {
      const c = ao.indexOf(a) !== -1 ? "attr" + a.charAt(0).toUpperCase() + a.substring(1) : a;
      i[c] = e[a];
    }
  return i;
}
class xk extends rv {
  constructor() {
    super(...arguments), this.type = "svg", this.isSVGTag = !1, this.measureInstanceViewportBox = He;
  }
  getBaseTargetFromProps(n, o) {
    return n[o];
  }
  readValueFromInstance(n, o) {
    if (lo.has(o)) {
      const i = Kg(o);
      return i && i.default || 0;
    }
    return o = dv.has(o) ? o : vd(o), n.getAttribute(o);
  }
  scrapeMotionValuesFromProps(n, o, i) {
    return pv(n, o, i);
  }
  build(n, o, i) {
    cv(n, o, this.isSVGTag, i.transformTemplate, i.style);
  }
  renderInstance(n, o, i, a) {
    wk(n, o, i, a);
  }
  mount(n) {
    this.isSVGTag = fv(n.tagName), super.mount(n);
  }
}
const _k = Td.length;
function hv(e) {
  if (!e)
    return;
  if (!e.isControllingVariants) {
    const o = e.parent ? hv(e.parent) || {} : {};
    return e.props.initial !== void 0 && (o.initial = e.props.initial), o;
  }
  const n = {};
  for (let o = 0; o < _k; o++) {
    const i = Td[o], a = e.props[i];
    (hi(a) || a === !1) && (n[i] = a);
  }
  return n;
}
function mv(e, n) {
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
const kk = [...kd].reverse(), Tk = kd.length;
function Ak(e) {
  return (n) => Promise.all(n.map(({ animation: o, options: i }) => __(e, o, i)));
}
function Ck(e) {
  let n = Ak(e), o = Fm(), i = !0, a = !1;
  const c = (v) => (S, l) => {
    var g;
    const h = mr(e, l, v === "exit" ? (g = e.presenceContext) == null ? void 0 : g.custom : void 0);
    if (h) {
      const { transition: x, transitionEnd: k, ...T } = h;
      S = { ...S, ...T, ...k };
    }
    return S;
  };
  function d(v) {
    n = v(e);
  }
  function f(v) {
    const { props: S } = e, l = hv(e.parent) || {}, h = [], g = /* @__PURE__ */ new Set();
    let x = {}, k = 1 / 0;
    for (let A = 0; A < Tk; A++) {
      const R = kk[A], b = o[R], D = S[R] !== void 0 ? S[R] : l[R], L = hi(D), X = R === v ? b.isActive : null;
      X === !1 && (k = A);
      let Z = D === l[R] && D !== S[R] && L;
      if (Z && (i || a) && e.manuallyAnimateOnMount && (Z = !1), b.protectedKeys = { ...x }, // If it isn't active and hasn't *just* been set as inactive
      !b.isActive && X === null || // If we didn't and don't have any defined prop for this animation type
      !D && !b.prevProp || // Or if the prop doesn't define an animation
      Ma(D) || typeof D == "boolean")
        continue;
      if (R === "exit" && b.isActive && X !== !0) {
        b.prevResolvedValues && (x = {
          ...x,
          ...b.prevResolvedValues
        });
        continue;
      }
      const U = Ek(b.prevProp, D);
      let G = U || // If we're making this variant active, we want to always make it active
      R === v && b.isActive && !Z && L || // If we removed a higher-priority variant (i is in reverse order)
      A > k && L, Q = !1;
      const J = Array.isArray(D) ? D : [D];
      let ce = J.reduce(c(R), {});
      X === !1 && (ce = {});
      const { prevResolvedValues: ye = {} } = b, he = {
        ...ye,
        ...ce
      }, we = (V) => {
        G = !0, g.has(V) && (Q = !0, g.delete(V)), b.needsAnimating[V] = !0;
        const q = e.getValue(V);
        q && (q.liveStyle = !1);
      };
      for (const V in he) {
        const q = ce[V], K = ye[V];
        if (x.hasOwnProperty(V))
          continue;
        let E = !1;
        kc(q) && kc(K) ? E = !mv(q, K) || U : E = q !== K, E ? q != null ? we(V) : g.add(V) : q !== void 0 && g.has(V) ? we(V) : b.protectedKeys[V] = !0;
      }
      b.prevProp = D, b.prevResolvedValues = ce, b.isActive && (x = { ...x, ...ce }), (i || a) && e.blockInitialAnimation && (G = !1);
      const ue = Z && U;
      G && (!ue || Q) && h.push(...J.map((V) => {
        const q = { type: R };
        if (typeof V == "string" && (i || a) && !ue && e.manuallyAnimateOnMount && e.parent) {
          const { parent: K } = e, E = mr(K, V);
          if (K.enteringChildren && E) {
            const { delayChildren: O } = E.transition || {};
            q.delay = Lg(K.enteringChildren, e, O);
          }
        }
        return {
          animation: V,
          options: q
        };
      }));
    }
    if (g.size) {
      const A = {};
      if (typeof S.initial != "boolean") {
        const R = mr(e, Array.isArray(S.initial) ? S.initial[0] : S.initial);
        R && R.transition && (A.transition = R.transition);
      }
      g.forEach((R) => {
        const b = e.getBaseTarget(R), D = e.getValue(R);
        D && (D.liveStyle = !0), A[R] = b ?? null;
      }), h.push({ animation: A });
    }
    let T = !!h.length;
    return i && (S.initial === !1 || S.initial === S.animate) && !e.manuallyAnimateOnMount && (T = !1), i = !1, a = !1, T ? n(h) : Promise.resolve();
  }
  function y(v, S) {
    var h;
    if (o[v].isActive === S)
      return Promise.resolve();
    (h = e.variantChildren) == null || h.forEach((g) => {
      var x;
      return (x = g.animationState) == null ? void 0 : x.setActive(v, S);
    }), o[v].isActive = S;
    const l = f(v);
    for (const g in o)
      o[g].protectedKeys = {};
    return l;
  }
  return {
    animateChanges: f,
    setActive: y,
    setAnimateFunction: d,
    getState: () => o,
    reset: () => {
      o = Fm(), a = !0;
    }
  };
}
function Ek(e, n) {
  return typeof n == "string" ? n !== e : Array.isArray(n) ? !mv(n, e) : !1;
}
function lr(e = !1) {
  return {
    isActive: e,
    protectedKeys: {},
    needsAnimating: {},
    prevResolvedValues: {}
  };
}
function Fm() {
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
function Dc(e, n) {
  e.min = n.min, e.max = n.max;
}
function Lt(e, n) {
  Dc(e.x, n.x), Dc(e.y, n.y);
}
function Om(e, n) {
  e.translate = n.translate, e.scale = n.scale, e.originPoint = n.originPoint, e.origin = n.origin;
}
const yv = 1e-4, Pk = 1 - yv, bk = 1 + yv, gv = 0.01, Mk = 0 - gv, Rk = 0 + gv;
function st(e) {
  return e.max - e.min;
}
function Nk(e, n, o) {
  return Math.abs(e - n) <= o;
}
function Lm(e, n, o, i = 0.5) {
  e.origin = i, e.originPoint = Ce(n.min, n.max, e.origin), e.scale = st(o) / st(n), e.translate = Ce(o.min, o.max, e.origin) - e.originPoint, (e.scale >= Pk && e.scale <= bk || isNaN(e.scale)) && (e.scale = 1), (e.translate >= Mk && e.translate <= Rk || isNaN(e.translate)) && (e.translate = 0);
}
function ai(e, n, o, i) {
  Lm(e.x, n.x, o.x, i ? i.originX : void 0), Lm(e.y, n.y, o.y, i ? i.originY : void 0);
}
function Vm(e, n, o, i = 0) {
  const a = i ? Ce(o.min, o.max, i) : o.min;
  e.min = a + n.min, e.max = e.min + st(n);
}
function Dk(e, n, o, i) {
  Vm(e.x, n.x, o.x, i == null ? void 0 : i.x), Vm(e.y, n.y, o.y, i == null ? void 0 : i.y);
}
function zm(e, n, o, i = 0) {
  const a = i ? Ce(o.min, o.max, i) : o.min;
  e.min = n.min - a, e.max = e.min + st(n);
}
function va(e, n, o, i) {
  zm(e.x, n.x, o.x, i == null ? void 0 : i.x), zm(e.y, n.y, o.y, i == null ? void 0 : i.y);
}
function Bm(e, n, o, i, a) {
  return e -= n, e = ga(e, 1 / o, i), a !== void 0 && (e = ga(e, 1 / a, i)), e;
}
function jk(e, n = 0, o = 1, i = 0.5, a, c = e, d = e) {
  if (tn.test(n) && (n = parseFloat(n), n = Ce(d.min, d.max, n / 100) - d.min), typeof n != "number")
    return;
  let f = Ce(c.min, c.max, i);
  e === c && (f -= n), e.min = Bm(e.min, n, o, f, a), e.max = Bm(e.max, n, o, f, a);
}
function Um(e, n, [o, i, a], c, d) {
  jk(e, n[o], n[i], n[a], n.scale, c, d);
}
const Ik = ["x", "scaleX", "originX"], Fk = ["y", "scaleY", "originY"];
function $m(e, n, o, i) {
  Um(e.x, n, Ik, o ? o.x : void 0, i ? i.x : void 0), Um(e.y, n, Fk, o ? o.y : void 0, i ? i.y : void 0);
}
function Hm(e) {
  return e.translate === 0 && e.scale === 1;
}
function vv(e) {
  return Hm(e.x) && Hm(e.y);
}
function Wm(e, n) {
  return e.min === n.min && e.max === n.max;
}
function Ok(e, n) {
  return Wm(e.x, n.x) && Wm(e.y, n.y);
}
function Gm(e, n) {
  return Math.round(e.min) === Math.round(n.min) && Math.round(e.max) === Math.round(n.max);
}
function Sv(e, n) {
  return Gm(e.x, n.x) && Gm(e.y, n.y);
}
function Km(e) {
  return st(e.x) / st(e.y);
}
function Ym(e, n) {
  return e.translate === n.translate && e.scale === n.scale && e.originPoint === n.originPoint;
}
function qt(e) {
  return [e("x"), e("y")];
}
function Lk(e, n, o) {
  let i = "";
  const a = e.x.translate / n.x, c = e.y.translate / n.y, d = (o == null ? void 0 : o.z) || 0;
  if ((a || c || d) && (i = `translate3d(${a}px, ${c}px, ${d}px) `), (n.x !== 1 || n.y !== 1) && (i += `scale(${1 / n.x}, ${1 / n.y}) `), o) {
    const { transformPerspective: v, rotate: S, pathRotation: l, rotateX: h, rotateY: g, skewX: x, skewY: k } = o;
    v && (i = `perspective(${v}px) ${i}`), S && (i += `rotate(${S}deg) `), l && (i += `rotate(${l}deg) `), h && (i += `rotateX(${h}deg) `), g && (i += `rotateY(${g}deg) `), x && (i += `skewX(${x}deg) `), k && (i += `skewY(${k}deg) `);
  }
  const f = e.x.scale * n.x, y = e.y.scale * n.y;
  return (f !== 1 || y !== 1) && (i += `scale(${f}, ${y})`), i || "none";
}
const Vk = Sd.length, Qm = (e) => typeof e == "string" ? parseFloat(e) : e, Xm = (e) => typeof e == "number" || re.test(e);
function zk(e, n, o, i, a, c) {
  a ? (e.opacity = Ce(0, o.opacity ?? 1, Bk(i)), e.opacityExit = Ce(n.opacity ?? 1, 0, Uk(i))) : c && (e.opacity = Ce(n.opacity ?? 1, o.opacity ?? 1, i));
  for (let d = 0; d < Vk; d++) {
    const f = Sd[d];
    let y = Zm(n, f), v = Zm(o, f);
    if (y === void 0 && v === void 0)
      continue;
    y || (y = 0), v || (v = 0), y === 0 || v === 0 || Xm(y) === Xm(v) ? (e[f] = Math.max(Ce(Qm(y), Qm(v), i), 0), (tn.test(v) || tn.test(y)) && (e[f] += "%")) : e[f] = v;
  }
  (n.rotate || o.rotate) && (e.rotate = Ce(n.rotate || 0, o.rotate || 0, i));
}
function Zm(e, n) {
  return e[n] !== void 0 ? e[n] : e.borderRadius;
}
const Bk = /* @__PURE__ */ wv(0, 0.5, fg), Uk = /* @__PURE__ */ wv(0.5, 0.95, Mt);
function wv(e, n, o) {
  return (i) => i < e ? 0 : i > n ? 1 : o(/* @__PURE__ */ fi(e, n, i));
}
function $k(e, n, o) {
  const i = qe(e) ? e : no(e);
  return i.start(yd("", i, n, o)), i.animation;
}
function mi(e, n, o, i = { passive: !0 }) {
  return e.addEventListener(n, o, i), () => e.removeEventListener(n, o, i);
}
const Hk = (e, n) => e.depth - n.depth;
class Wk {
  constructor() {
    this.children = [], this.isDirty = !1;
  }
  add(n) {
    od(this.children, n), this.isDirty = !0;
  }
  remove(n) {
    ca(this.children, n), this.isDirty = !0;
  }
  forEach(n) {
    this.isDirty && this.children.sort(Hk), this.isDirty = !1, this.children.forEach(n);
  }
}
function Gk(e, n) {
  const o = it.now(), i = ({ timestamp: a }) => {
    const c = a - o;
    c >= n && (Hn(i), e(c - n));
  };
  return Ee.setup(i, !0), () => Hn(i);
}
function na(e) {
  return qe(e) ? e.get() : e;
}
class Kk {
  constructor() {
    this.members = [];
  }
  add(n) {
    od(this.members, n);
    for (let o = this.members.length - 1; o >= 0; o--) {
      const i = this.members[o];
      if (i === n || i === this.lead || i === this.prevLead)
        continue;
      const a = i.instance;
      (!a || a.isConnected === !1) && !i.snapshot && (ca(this.members, i), i.unmount());
    }
    n.scheduleRender();
  }
  remove(n) {
    if (ca(this.members, n), n === this.prevLead && (this.prevLead = void 0), n === this.lead) {
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
const ra = {
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
}, Gu = ["", "X", "Y", "Z"], Yk = 1e3;
let Qk = 0;
function Ku(e, n, o, i) {
  const { latestValues: a } = n;
  a[e] && (o[e] = a[e], n.setStaticValue(e, 0), i && (i[e] = 0));
}
function xv(e) {
  if (e.hasCheckedOptimisedAppear = !0, e.root === e)
    return;
  const { visualElement: n } = e.options;
  if (!n)
    return;
  const o = $g(n);
  if (window.MotionHasOptimisedAnimation(o, "transform")) {
    const { layout: a, layoutId: c } = e.options;
    window.MotionCancelOptimisedAnimation(o, "transform", Ee, !(a || c));
  }
  const { parent: i } = e;
  i && !i.hasCheckedOptimisedAppear && xv(i);
}
function _v({ attachResizeListener: e, defaultParent: n, measureScroll: o, checkIsScrollRoot: i, resetTransform: a }) {
  return class {
    constructor(d = {}, f = n == null ? void 0 : n()) {
      this.id = Qk++, this.animationId = 0, this.animationCommitId = 0, this.children = /* @__PURE__ */ new Set(), this.options = {}, this.isTreeAnimating = !1, this.isAnimationBlocked = !1, this.isLayoutDirty = !1, this.isProjectionDirty = !1, this.isSharedProjectionDirty = !1, this.isTransformDirty = !1, this.updateManuallyBlocked = !1, this.updateBlockedByResize = !1, this.isUpdating = !1, this.isSVG = !1, this.needsReset = !1, this.shouldResetTransform = !1, this.hasCheckedOptimisedAppear = !1, this.treeScale = { x: 1, y: 1 }, this.eventHandlers = /* @__PURE__ */ new Map(), this.hasTreeAnimated = !1, this.layoutVersion = 0, this.updateScheduled = !1, this.scheduleUpdate = () => this.update(), this.projectionUpdateScheduled = !1, this.checkUpdateFailed = () => {
        this.isUpdating && (this.isUpdating = !1, this.clearAllSnapshots());
      }, this.updateProjection = () => {
        this.projectionUpdateScheduled = !1, this.nodes.forEach(qk), this.nodes.forEach(oT), this.nodes.forEach(iT), this.nodes.forEach(Jk);
      }, this.resolvedRelativeTargetAt = 0, this.linkedParentVersion = 0, this.hasProjected = !1, this.isVisible = !0, this.animationProgress = 0, this.sharedNodes = /* @__PURE__ */ new Map(), this.latestValues = d, this.root = f ? f.root || f : this, this.path = f ? [...f.path, f] : [], this.parent = f, this.depth = f ? f.depth + 1 : 0;
      for (let y = 0; y < this.path.length; y++)
        this.path[y].shouldResetTransform = !0;
      this.root === this && (this.nodes = new Wk());
    }
    addEventListener(d, f) {
      return this.eventHandlers.has(d) || this.eventHandlers.set(d, new id()), this.eventHandlers.get(d).add(f);
    }
    notifyListeners(d, ...f) {
      const y = this.eventHandlers.get(d);
      y && y.notify(...f);
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
      this.isSVG = _d(d) && !Z_(d), this.instance = d;
      const { layoutId: f, layout: y, visualElement: v } = this.options;
      if (v && !v.current && v.mount(d), this.root.nodes.add(this), this.parent && this.parent.children.add(this), this.root.hasTreeAnimated && (y || f) && (this.isLayoutDirty = !0), e) {
        let S, l = 0;
        const h = () => this.root.updateBlockedByResize = !1;
        Ee.read(() => {
          l = window.innerWidth;
        }), e(d, () => {
          const g = window.innerWidth;
          g !== l && (l = g, this.root.updateBlockedByResize = !0, S && S(), S = Gk(h, 250), ra.hasAnimatedSinceResize && (ra.hasAnimatedSinceResize = !1, this.nodes.forEach(ey)));
        });
      }
      f && this.root.registerSharedNode(f, this), this.options.animate !== !1 && v && (f || y) && this.addEventListener("didUpdate", ({ delta: S, hasLayoutChanged: l, hasRelativeLayoutChanged: h, layout: g }) => {
        if (this.isTreeAnimationBlocked()) {
          this.target = void 0, this.relativeTarget = void 0;
          return;
        }
        const x = this.options.transition || v.getDefaultTransition() || cT, { onLayoutAnimationStart: k, onLayoutAnimationComplete: T } = v.getProps(), A = !this.targetLayout || !Sv(this.targetLayout, g), R = !l && h;
        if (this.options.layoutRoot || this.resumeFrom || R || l && (A || !this.currentAnimation)) {
          this.resumeFrom && (this.resumingFrom = this.resumeFrom, this.resumingFrom.resumingFrom = void 0);
          const b = {
            ...md(x, "layout"),
            onPlay: k,
            onComplete: T
          };
          (v.shouldReduceMotion || this.options.layoutRoot) && (b.delay = 0, b.type = !1), this.startAnimation(b), this.setAnimationOrigin(S, R, b.path);
        } else
          l || ey(this), this.isLead() && this.options.onExitComplete && this.options.onExitComplete();
        this.targetLayout = g;
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
      this.isUpdateBlocked() || (this.isUpdating = !0, this.nodes && this.nodes.forEach(sT), this.animationId++);
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
      if (window.MotionCancelOptimisedAnimation && !this.hasCheckedOptimisedAppear && xv(this), !this.root.isUpdating && this.root.startUpdate(), this.isLayoutDirty)
        return;
      this.isLayoutDirty = !0;
      for (let S = 0; S < this.path.length; S++) {
        const l = this.path[S];
        l.shouldResetTransform = !0, (typeof l.latestValues.x == "string" || typeof l.latestValues.y == "string") && (l.isLayoutDirty = !0), l.updateScroll("snapshot"), l.options.layoutRoot && l.willUpdate(!1);
      }
      const { layoutId: f, layout: y } = this.options;
      if (f === void 0 && !y)
        return;
      const v = this.getTransformTemplate();
      this.prevTransformTemplateValue = v ? v(this.latestValues, "") : void 0, this.updateSnapshot(), d && this.notifyListeners("willUpdate");
    }
    update() {
      if (this.updateScheduled = !1, this.isUpdateBlocked()) {
        const y = this.updateBlockedByResize;
        this.unblockUpdate(), this.updateBlockedByResize = !1, this.clearAllSnapshots(), y && this.nodes.forEach(tT), this.nodes.forEach(qm);
        return;
      }
      if (this.animationId <= this.animationCommitId) {
        this.nodes.forEach(Jm);
        return;
      }
      this.animationCommitId = this.animationId, this.isUpdating ? (this.isUpdating = !1, this.nodes.forEach(nT), this.nodes.forEach(rT), this.nodes.forEach(Xk), this.nodes.forEach(Zk)) : this.nodes.forEach(Jm), this.clearAllSnapshots();
      const f = it.now();
      Ze.delta = rn(0, 1e3 / 60, f - Ze.timestamp), Ze.timestamp = f, Ze.isProcessing = !0, Lu.update.process(Ze), Lu.preRender.process(Ze), Lu.render.process(Ze), Ze.isProcessing = !1;
    }
    didUpdate() {
      this.updateScheduled || (this.updateScheduled = !0, wd.read(this.scheduleUpdate));
    }
    clearAllSnapshots() {
      this.nodes.forEach(eT), this.sharedNodes.forEach(aT);
    }
    scheduleUpdateProjection() {
      this.projectionUpdateScheduled || (this.projectionUpdateScheduled = !0, Ee.preRender(this.updateProjection, !1, !0));
    }
    scheduleCheckAfterUnmount() {
      Ee.postRender(() => {
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
      const { visualElement: f } = this.options;
      f && f.notify("LayoutMeasure", this.layout.layoutBox, d ? d.layoutBox : void 0);
    }
    updateScroll(d = "measure") {
      let f = !!(this.options.layoutScroll && this.instance);
      if (this.scroll && this.scroll.animationId === this.root.animationId && this.scroll.phase === d && (f = !1), f && this.instance) {
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
      const d = this.isLayoutDirty || this.shouldResetTransform || this.options.alwaysMeasureLayout, f = this.projectionDelta && !vv(this.projectionDelta), y = this.getTransformTemplate(), v = y ? y(this.latestValues, "") : void 0, S = v !== this.prevTransformTemplateValue;
      d && this.instance && (f || ur(this.latestValues) || S) && (a(this.instance, v), this.shouldResetTransform = !1, this.scheduleRender());
    }
    measure(d = !0) {
      const f = this.measurePageBox();
      let y = this.removeElementScroll(f);
      return d && (y = this.removeTransform(y)), dT(y), {
        animationId: this.root.animationId,
        measuredBox: f,
        layoutBox: y,
        latestValues: {},
        source: this.id
      };
    }
    measurePageBox() {
      var v;
      const { visualElement: d } = this.options;
      if (!d)
        return He();
      const f = d.measureViewportBox();
      if (!(((v = this.scroll) == null ? void 0 : v.wasRoot) || this.path.some(fT))) {
        const { scroll: S } = this.root;
        S && (Jt(f.x, S.offset.x), Jt(f.y, S.offset.y));
      }
      return f;
    }
    removeElementScroll(d) {
      var y;
      const f = He();
      if (Lt(f, d), (y = this.scroll) != null && y.wasRoot)
        return f;
      for (let v = 0; v < this.path.length; v++) {
        const S = this.path[v], { scroll: l, options: h } = S;
        S !== this.root && l && h.layoutScroll && (l.wasRoot && Lt(f, d), Jt(f.x, l.offset.x), Jt(f.y, l.offset.y));
      }
      return f;
    }
    applyTransform(d, f = !1, y) {
      var S, l;
      const v = y || He();
      Lt(v, d);
      for (let h = 0; h < this.path.length; h++) {
        const g = this.path[h];
        !f && g.options.layoutScroll && g.scroll && g !== g.root && (Jt(v.x, -g.scroll.offset.x), Jt(v.y, -g.scroll.offset.y)), ur(g.latestValues) && ta(v, g.latestValues, (S = g.layout) == null ? void 0 : S.layoutBox);
      }
      return ur(this.latestValues) && ta(v, this.latestValues, (l = this.layout) == null ? void 0 : l.layoutBox), v;
    }
    removeTransform(d) {
      var y;
      const f = He();
      Lt(f, d);
      for (let v = 0; v < this.path.length; v++) {
        const S = this.path[v];
        if (!ur(S.latestValues))
          continue;
        let l;
        S.instance && (Mc(S.latestValues) && S.updateSnapshot(), l = He(), Lt(l, S.measurePageBox())), $m(f, S.latestValues, (y = S.snapshot) == null ? void 0 : y.layoutBox, l);
      }
      return ur(this.latestValues) && $m(f, this.latestValues), f;
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
      var g;
      const f = this.getLead();
      this.isProjectionDirty || (this.isProjectionDirty = f.isProjectionDirty), this.isTransformDirty || (this.isTransformDirty = f.isTransformDirty), this.isSharedProjectionDirty || (this.isSharedProjectionDirty = f.isSharedProjectionDirty);
      const y = !!this.resumingFrom || this !== f;
      if (!(d || y && this.isSharedProjectionDirty || this.isProjectionDirty || (g = this.parent) != null && g.isProjectionDirty || this.attemptToResolveRelativeTarget || this.root.updateBlockedByResize))
        return;
      const { layout: S, layoutId: l } = this.options;
      if (!this.layout || !(S || l))
        return;
      this.resolvedRelativeTargetAt = Ze.timestamp;
      const h = this.getClosestProjectingParent();
      h && this.linkedParentVersion !== h.layoutVersion && !h.options.layoutRoot && this.removeRelativeTarget(), !this.targetDelta && !this.relativeTarget && (this.options.layoutAnchor !== !1 && h && h.layout ? this.createRelativeTarget(h, this.layout.layoutBox, h.layout.layoutBox) : this.removeRelativeTarget()), !(!this.relativeTarget && !this.targetDelta) && (this.target || (this.target = He(), this.targetWithTransforms = He()), this.relativeTarget && this.relativeTargetOrigin && this.relativeParent && this.relativeParent.target ? (this.forceRelativeParentToResolveTarget(), Dk(this.target, this.relativeTarget, this.relativeParent.target, this.options.layoutAnchor || void 0)) : this.targetDelta ? (this.resumingFrom ? this.applyTransform(this.layout.layoutBox, !1, this.target) : Lt(this.target, this.layout.layoutBox), sv(this.target, this.targetDelta)) : Lt(this.target, this.layout.layoutBox), this.attemptToResolveRelativeTarget && (this.attemptToResolveRelativeTarget = !1, this.options.layoutAnchor !== !1 && h && !!h.resumingFrom == !!this.resumingFrom && !h.options.layoutScroll && h.target && this.animationProgress !== 1 ? this.createRelativeTarget(h, this.target, h.target) : this.relativeParent = this.relativeTarget = void 0));
    }
    getClosestProjectingParent() {
      if (!(!this.parent || Mc(this.parent.latestValues) || iv(this.parent.latestValues)))
        return this.parent.isProjecting() ? this.parent : this.parent.getClosestProjectingParent();
    }
    isProjecting() {
      return !!((this.relativeTarget || this.targetDelta || this.options.layoutRoot) && this.layout);
    }
    createRelativeTarget(d, f, y) {
      this.relativeParent = d, this.linkedParentVersion = d.layoutVersion, this.forceRelativeParentToResolveTarget(), this.relativeTarget = He(), this.relativeTargetOrigin = He(), va(this.relativeTargetOrigin, f, y, this.options.layoutAnchor || void 0), Lt(this.relativeTarget, this.relativeTargetOrigin);
    }
    removeRelativeTarget() {
      this.relativeParent = this.relativeTarget = void 0;
    }
    calcProjection() {
      var x;
      const d = this.getLead(), f = !!this.resumingFrom || this !== d;
      let y = !0;
      if ((this.isProjectionDirty || (x = this.parent) != null && x.isProjectionDirty) && (y = !1), f && (this.isSharedProjectionDirty || this.isTransformDirty) && (y = !1), this.resolvedRelativeTargetAt === Ze.timestamp && (y = !1), y)
        return;
      const { layout: v, layoutId: S } = this.options;
      if (this.isTreeAnimating = !!(this.parent && this.parent.isTreeAnimating || this.currentAnimation || this.pendingAnimation), this.isTreeAnimating || (this.targetDelta = this.relativeTarget = void 0), !this.layout || !(v || S))
        return;
      Lt(this.layoutCorrected, this.layout.layoutBox);
      const l = this.treeScale.x, h = this.treeScale.y;
      lk(this.layoutCorrected, this.treeScale, this.path, f), d.layout && !d.target && (this.treeScale.x !== 1 || this.treeScale.y !== 1) && (d.target = d.layout.layoutBox, d.targetWithTransforms = He());
      const { target: g } = d;
      if (!g) {
        this.prevProjectionDelta && (this.createProjectionDeltas(), this.scheduleRender());
        return;
      }
      !this.projectionDelta || !this.prevProjectionDelta ? this.createProjectionDeltas() : (Om(this.prevProjectionDelta.x, this.projectionDelta.x), Om(this.prevProjectionDelta.y, this.projectionDelta.y)), ai(this.projectionDelta, this.layoutCorrected, g, this.latestValues), (this.treeScale.x !== l || this.treeScale.y !== h || !Ym(this.projectionDelta.x, this.prevProjectionDelta.x) || !Ym(this.projectionDelta.y, this.prevProjectionDelta.y)) && (this.hasProjected = !0, this.scheduleRender(), this.notifyListeners("projectionUpdate", g));
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
        const y = this.getStack();
        y && y.scheduleRender();
      }
      this.resumingFrom && !this.resumingFrom.instance && (this.resumingFrom = void 0);
    }
    createProjectionDeltas() {
      this.prevProjectionDelta = Zr(), this.projectionDelta = Zr(), this.projectionDeltaWithTransform = Zr();
    }
    setAnimationOrigin(d, f = !1, y) {
      const v = this.snapshot, S = v ? v.latestValues : {}, l = { ...this.latestValues }, h = Zr();
      (!this.relativeParent || !this.relativeParent.options.layoutRoot) && (this.relativeTarget = this.relativeTargetOrigin = void 0), this.attemptToResolveRelativeTarget = !f;
      const g = He(), x = v ? v.source : void 0, k = this.layout ? this.layout.source : void 0, T = x !== k, A = this.getStack(), R = !A || A.members.length <= 1, b = !!(T && !R && this.options.crossfade === !0 && !this.path.some(uT));
      this.animationProgress = 0;
      let D;
      const L = y == null ? void 0 : y.interpolateProjection(d);
      this.mixTargetDelta = (X) => {
        const Z = X / 1e3, U = L == null ? void 0 : L(Z);
        U ? (h.x.translate = U.x, h.x.scale = Ce(d.x.scale, 1, Z), h.x.origin = d.x.origin, h.x.originPoint = d.x.originPoint, h.y.translate = U.y, h.y.scale = Ce(d.y.scale, 1, Z), h.y.origin = d.y.origin, h.y.originPoint = d.y.originPoint) : (ty(h.x, d.x, Z), ty(h.y, d.y, Z)), this.setTargetDelta(h), this.relativeTarget && this.relativeTargetOrigin && this.layout && this.relativeParent && this.relativeParent.layout && (va(g, this.layout.layoutBox, this.relativeParent.layout.layoutBox, this.options.layoutAnchor || void 0), lT(this.relativeTarget, this.relativeTargetOrigin, g, Z), D && Ok(this.relativeTarget, D) && (this.isProjectionDirty = !1), D || (D = He()), Lt(D, this.relativeTarget)), T && (this.animationValues = l, zk(l, S, this.latestValues, Z, b, R)), U && U.rotate !== void 0 && (this.animationValues || (this.animationValues = l), this.animationValues.pathRotation = U.rotate), this.root.scheduleUpdateProjection(), this.scheduleRender(), this.animationProgress = Z;
      }, this.mixTargetDelta(this.options.layoutRoot ? 1e3 : 0);
    }
    startAnimation(d) {
      var f, y, v;
      this.notifyListeners("animationStart"), (f = this.currentAnimation) == null || f.stop(), (v = (y = this.resumingFrom) == null ? void 0 : y.currentAnimation) == null || v.stop(), this.pendingAnimation && (Hn(this.pendingAnimation), this.pendingAnimation = void 0), this.pendingAnimation = Ee.update(() => {
        ra.hasAnimatedSinceResize = !0, this.motionValue || (this.motionValue = no(0)), this.motionValue.jump(0, !1), this.currentAnimation = $k(this.motionValue, [0, 1e3], {
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
      this.currentAnimation && (this.mixTargetDelta && this.mixTargetDelta(Yk), this.currentAnimation.stop()), this.completeAnimation();
    }
    applyTransformsToTarget() {
      const d = this.getLead();
      let { targetWithTransforms: f, target: y, layout: v, latestValues: S } = d;
      if (!(!f || !y || !v)) {
        if (this !== d && this.layout && v && kv(this.options.animationType, this.layout.layoutBox, v.layoutBox)) {
          y = this.target || He();
          const l = st(this.layout.layoutBox.x);
          y.x.min = d.target.x.min, y.x.max = y.x.min + l;
          const h = st(this.layout.layoutBox.y);
          y.y.min = d.target.y.min, y.y.max = y.y.min + h;
        }
        Lt(f, y), ta(f, S), ai(this.projectionDeltaWithTransform, this.layoutCorrected, f, S);
      }
    }
    registerSharedNode(d, f) {
      this.sharedNodes.has(d) || this.sharedNodes.set(d, new Kk()), this.sharedNodes.get(d).add(f);
      const v = f.options.initialPromotionConfig;
      f.promote({
        transition: v ? v.transition : void 0,
        preserveFollowOpacity: v && v.shouldPreserveFollowOpacity ? v.shouldPreserveFollowOpacity(f) : void 0
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
    promote({ needsReset: d, transition: f, preserveFollowOpacity: y } = {}) {
      const v = this.getStack();
      v && v.promote(this, y), d && (this.projectionDelta = void 0, this.needsReset = !0), f && this.setOptions({ transition: f });
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
      const { latestValues: y } = d;
      if ((y.z || y.rotate || y.rotateX || y.rotateY || y.rotateZ || y.skewX || y.skewY) && (f = !0), !f)
        return;
      const v = {};
      y.z && Ku("z", d, v, this.animationValues);
      for (let S = 0; S < Gu.length; S++)
        Ku(`rotate${Gu[S]}`, d, v, this.animationValues), Ku(`skew${Gu[S]}`, d, v, this.animationValues);
      d.render();
      for (const S in v)
        d.setStaticValue(S, v[S]), this.animationValues && (this.animationValues[S] = v[S]);
      d.scheduleRender();
    }
    applyProjectionStyles(d, f) {
      if (!this.instance || this.isSVG)
        return;
      if (!this.isVisible) {
        d.visibility = "hidden";
        return;
      }
      const y = this.getTransformTemplate();
      if (this.needsReset) {
        this.needsReset = !1, d.visibility = "", d.opacity = "", d.pointerEvents = na(f == null ? void 0 : f.pointerEvents) || "", d.transform = y ? y(this.latestValues, "") : "none";
        return;
      }
      const v = this.getLead();
      if (!this.projectionDelta || !this.layout || !v.target) {
        this.options.layoutId && (d.opacity = this.latestValues.opacity !== void 0 ? this.latestValues.opacity : 1, d.pointerEvents = na(f == null ? void 0 : f.pointerEvents) || ""), this.hasProjected && !ur(this.latestValues) && (d.transform = y ? y({}, "") : "none", this.hasProjected = !1);
        return;
      }
      d.visibility = "";
      const S = v.animationValues || v.latestValues;
      this.applyTransformsToTarget();
      let l = Lk(this.projectionDeltaWithTransform, this.treeScale, S);
      y && (l = y(S, l)), d.transform = l;
      const { x: h, y: g } = this.projectionDelta;
      d.transformOrigin = `${h.origin * 100}% ${g.origin * 100}% 0`, v.animationValues ? d.opacity = v === this ? S.opacity ?? this.latestValues.opacity ?? 1 : this.preserveOpacity ? this.latestValues.opacity : S.opacityExit : d.opacity = v === this ? S.opacity !== void 0 ? S.opacity : "" : S.opacityExit !== void 0 ? S.opacityExit : 0;
      for (const x in Nc) {
        if (S[x] === void 0)
          continue;
        const { correct: k, applyTo: T, isCSSVariable: A } = Nc[x], R = l === "none" ? S[x] : k(S[x], v);
        if (T) {
          const b = T.length;
          for (let D = 0; D < b; D++)
            d[T[D]] = R;
        } else
          A ? this.options.visualElement.renderState.vars[x] = R : d[x] = R;
      }
      this.options.layoutId && (d.pointerEvents = v === this ? na(f == null ? void 0 : f.pointerEvents) || "" : "none");
    }
    clearSnapshot() {
      this.resumeFrom = this.snapshot = void 0;
    }
    // Only run on root
    resetTree() {
      this.root.nodes.forEach((d) => {
        var f;
        return (f = d.currentAnimation) == null ? void 0 : f.stop();
      }), this.root.nodes.forEach(qm), this.root.sharedNodes.clear();
    }
  };
}
function Xk(e) {
  e.updateLayout();
}
function Zk(e) {
  var o;
  const n = ((o = e.resumeFrom) == null ? void 0 : o.snapshot) || e.snapshot;
  if (e.isLead() && e.layout && n && e.hasListeners("didUpdate")) {
    const { layoutBox: i, measuredBox: a } = e.layout, { animationType: c } = e.options, d = n.source !== e.layout.source;
    if (c === "size")
      qt((l) => {
        const h = d ? n.measuredBox[l] : n.layoutBox[l], g = st(h);
        h.min = i[l].min, h.max = h.min + g;
      });
    else if (c === "x" || c === "y") {
      const l = c === "x" ? "y" : "x";
      Dc(d ? n.measuredBox[l] : n.layoutBox[l], i[l]);
    } else kv(c, n.layoutBox, i) && qt((l) => {
      const h = d ? n.measuredBox[l] : n.layoutBox[l], g = st(i[l]);
      h.max = h.min + g, e.relativeTarget && !e.currentAnimation && (e.isProjectionDirty = !0, e.relativeTarget[l].max = e.relativeTarget[l].min + g);
    });
    const f = Zr();
    ai(f, i, n.layoutBox);
    const y = Zr();
    d ? ai(y, e.applyTransform(a, !0), n.measuredBox) : ai(y, i, n.layoutBox);
    const v = !vv(f);
    let S = !1;
    if (!e.resumeFrom) {
      const l = e.getClosestProjectingParent();
      if (l && !l.resumeFrom) {
        const { snapshot: h, layout: g } = l;
        if (h && g) {
          const x = e.options.layoutAnchor || void 0, k = He();
          va(k, n.layoutBox, h.layoutBox, x);
          const T = He();
          va(T, i, g.layoutBox, x), Sv(k, T) || (S = !0), l.options.layoutRoot && (e.relativeTarget = T, e.relativeTargetOrigin = k, e.relativeParent = l);
        }
      }
    }
    e.notifyListeners("didUpdate", {
      layout: i,
      snapshot: n,
      delta: y,
      layoutDelta: f,
      hasLayoutChanged: v,
      hasRelativeLayoutChanged: S
    });
  } else if (e.isLead()) {
    const { onExitComplete: i } = e.options;
    i && i();
  }
  e.options.transition = void 0;
}
function qk(e) {
  e.parent && (e.isProjecting() || (e.isProjectionDirty = e.parent.isProjectionDirty), e.isSharedProjectionDirty || (e.isSharedProjectionDirty = !!(e.isProjectionDirty || e.parent.isProjectionDirty || e.parent.isSharedProjectionDirty)), e.isTransformDirty || (e.isTransformDirty = e.parent.isTransformDirty));
}
function Jk(e) {
  e.isProjectionDirty = e.isSharedProjectionDirty = e.isTransformDirty = !1;
}
function eT(e) {
  e.clearSnapshot();
}
function qm(e) {
  e.clearMeasurements();
}
function tT(e) {
  e.isLayoutDirty = !0, e.updateLayout();
}
function Jm(e) {
  e.isLayoutDirty = !1;
}
function nT(e) {
  e.isAnimationBlocked && e.layout && !e.isLayoutDirty && (e.snapshot = e.layout, e.isLayoutDirty = !0);
}
function rT(e) {
  const { visualElement: n } = e.options;
  n && n.getProps().onBeforeLayoutMeasure && n.notify("BeforeLayoutMeasure"), e.resetTransform();
}
function ey(e) {
  e.finishAnimation(), e.targetDelta = e.relativeTarget = e.target = void 0, e.isProjectionDirty = !0;
}
function oT(e) {
  e.resolveTargetDelta();
}
function iT(e) {
  e.calcProjection();
}
function sT(e) {
  e.resetSkewAndRotation();
}
function aT(e) {
  e.removeLeadSnapshot();
}
function ty(e, n, o) {
  e.translate = Ce(n.translate, 0, o), e.scale = Ce(n.scale, 1, o), e.origin = n.origin, e.originPoint = n.originPoint;
}
function ny(e, n, o, i) {
  e.min = Ce(n.min, o.min, i), e.max = Ce(n.max, o.max, i);
}
function lT(e, n, o, i) {
  ny(e.x, n.x, o.x, i), ny(e.y, n.y, o.y, i);
}
function uT(e) {
  return e.animationValues && e.animationValues.opacityExit !== void 0;
}
const cT = {
  duration: 0.45,
  ease: [0.4, 0, 0.1, 1]
}, ry = (e) => typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().includes(e), oy = ry("applewebkit/") && !ry("chrome/") ? Math.round : Mt;
function iy(e) {
  e.min = oy(e.min), e.max = oy(e.max);
}
function dT(e) {
  iy(e.x), iy(e.y);
}
function kv(e, n, o) {
  return e === "position" || e === "preserve-aspect" && !Nk(Km(n), Km(o), 0.2);
}
function fT(e) {
  var n;
  return e !== e.root && ((n = e.scroll) == null ? void 0 : n.wasRoot);
}
const pT = _v({
  attachResizeListener: (e, n) => mi(e, "resize", n),
  measureScroll: () => {
    var e, n;
    return {
      x: document.documentElement.scrollLeft || ((e = document.body) == null ? void 0 : e.scrollLeft) || 0,
      y: document.documentElement.scrollTop || ((n = document.body) == null ? void 0 : n.scrollTop) || 0
    };
  },
  checkIsScrollRoot: () => !0
}), Yu = {
  current: void 0
}, Tv = _v({
  measureScroll: (e) => ({
    x: e.scrollLeft,
    y: e.scrollTop
  }),
  defaultParent: () => {
    if (!Yu.current) {
      const e = new pT({});
      e.mount(window), e.setOptions({ layoutScroll: !0 }), Yu.current = e;
    }
    return Yu.current;
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
function sy(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function hT(...e) {
  return (n) => {
    let o = !1;
    const i = e.map((a) => {
      const c = sy(a, n);
      return !o && typeof c == "function" && (o = !0), c;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const c = i[a];
          typeof c == "function" ? c() : sy(e[a], null);
        }
      };
  };
}
function mT(...e) {
  return C.useCallback(hT(...e), e);
}
class yT extends C.Component {
  getSnapshotBeforeUpdate(n) {
    const o = this.props.childRef.current;
    if (Zs(o) && n.isPresent && !this.props.isPresent && this.props.pop !== !1) {
      const i = o.offsetParent, a = Zs(i) && i.offsetWidth || 0, c = Zs(i) && i.offsetHeight || 0, d = getComputedStyle(o), f = this.props.sizeRef.current;
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
function gT({ children: e, isPresent: n, anchorX: o, anchorY: i, root: a, pop: c }) {
  var h;
  const d = C.useId(), f = C.useRef(null), y = C.useRef({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    direction: "ltr"
  }), { nonce: v } = C.useContext(Ed), S = ((h = e.props) == null ? void 0 : h.ref) ?? (e == null ? void 0 : e.ref), l = mT(f, S);
  return C.useInsertionEffect(() => {
    const { width: g, height: x, top: k, left: T, right: A, bottom: R, direction: b } = y.current;
    if (n || c === !1 || !f.current || !g || !x)
      return;
    const D = b === "rtl", L = o === "left" ? D ? `right: ${A}` : `left: ${T}` : D ? `left: ${T}` : `right: ${A}`, X = i === "bottom" ? `bottom: ${R}` : `top: ${k}`;
    f.current.dataset.motionPopId = d;
    const Z = document.createElement("style");
    v && (Z.nonce = v);
    const U = a ?? document.head;
    return U.appendChild(Z), Z.sheet && Z.sheet.insertRule(`
          [data-motion-pop-id="${d}"] {
            position: absolute !important;
            width: ${g}px !important;
            height: ${x}px !important;
            ${L}px !important;
            ${X}px !important;
          }
        `), () => {
      var G;
      (G = f.current) == null || G.removeAttribute("data-motion-pop-id"), U.contains(Z) && U.removeChild(Z);
    };
  }, [n]), w.jsx(yT, { isPresent: n, childRef: f, sizeRef: y, pop: c, children: c === !1 ? e : C.cloneElement(e, { ref: l }) });
}
const vT = ({ children: e, initial: n, isPresent: o, onExitComplete: i, custom: a, presenceAffectsLayout: c, mode: d, anchorX: f, anchorY: y, root: v }) => {
  const S = nd(ST), l = C.useId(), h = C.useRef(o), g = C.useRef(i);
  rd(() => {
    h.current = o, g.current = i;
  });
  let x = !0, k = C.useMemo(() => (x = !1, {
    id: l,
    initial: n,
    isPresent: o,
    custom: a,
    onExitComplete: (T) => {
      S.set(T, !0);
      for (const A of S.values())
        if (!A)
          return;
      i && i();
    },
    register: (T) => (S.set(T, !1), () => {
      var A;
      S.delete(T), !h.current && !S.size && ((A = g.current) == null || A.call(g));
    })
  }), [o, S, i]);
  return c && x && (k = { ...k }), C.useMemo(() => {
    S.forEach((T, A) => S.set(A, !1));
  }, [o]), C.useEffect(() => {
    !o && !S.size && i && i();
  }, [o]), e = w.jsx(gT, { pop: d === "popLayout", isPresent: o, anchorX: f, anchorY: y, root: v, children: e }), w.jsx(Pa.Provider, { value: k, children: e });
};
function ST() {
  return /* @__PURE__ */ new Map();
}
function Av(e = !0) {
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
const zs = (e) => e.key || "";
function ay(e) {
  const n = [];
  return C.Children.forEach(e, (o) => {
    C.isValidElement(o) && n.push(o);
  }), n;
}
const Na = ({ children: e, custom: n, initial: o = !0, onExitComplete: i, presenceAffectsLayout: a = !0, mode: c = "sync", propagate: d = !1, anchorX: f = "left", anchorY: y = "top", root: v }) => {
  const [S, l] = Av(d), h = C.useMemo(() => ay(e), [e]), g = d && !S ? [] : h.map(zs), x = C.useRef(!0), k = C.useRef(h), T = nd(() => /* @__PURE__ */ new Map()), A = C.useRef(/* @__PURE__ */ new Set()), [R, b] = C.useState(h), [D, L] = C.useState(h);
  rd(() => {
    x.current = !1, k.current = h;
    for (let U = 0; U < D.length; U++) {
      const G = zs(D[U]);
      g.includes(G) ? (T.delete(G), A.current.delete(G)) : T.get(G) !== !0 && T.set(G, !1);
    }
  }, [D, g.length, g.join("-")]);
  const X = [];
  if (h !== R) {
    let U = [...h];
    for (let G = 0; G < D.length; G++) {
      const Q = D[G], J = zs(Q);
      g.includes(J) || (U.splice(G, 0, Q), X.push(Q));
    }
    return c === "wait" && X.length && (U = X), L(ay(U)), b(h), null;
  }
  const { forceRender: Z } = C.useContext(td);
  return w.jsx(w.Fragment, { children: D.map((U) => {
    const G = zs(U), Q = d && !S ? !1 : h === D || g.includes(G), J = () => {
      if (A.current.has(G))
        return;
      if (T.has(G))
        A.current.add(G), T.set(G, !0);
      else
        return;
      let ce = !0;
      T.forEach((ye) => {
        ye || (ce = !1);
      }), ce && (Z == null || Z(), L(k.current), d && (l == null || l()), i && i());
    };
    return w.jsx(vT, { isPresent: Q, initial: !x.current || o ? void 0 : !1, custom: n, presenceAffectsLayout: a, mode: c, root: v, onExitComplete: Q ? void 0 : J, anchorX: f, anchorY: y, children: U }, G);
  }) });
}, Cv = C.createContext({ strict: !1 }), ly = {
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
let uy = !1;
function wT() {
  if (uy)
    return;
  const e = {};
  for (const n in ly)
    e[n] = {
      isEnabled: (o) => ly[n].some((i) => !!o[i])
    };
  nv(e), uy = !0;
}
function Ev() {
  return wT(), ok();
}
function xT(e) {
  const n = Ev();
  for (const o in e)
    n[o] = {
      ...n[o],
      ...e[o]
    };
  nv(n);
}
const _T = /* @__PURE__ */ new Set([
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
function Sa(e) {
  return e.startsWith("while") || e.startsWith("drag") && e !== "draggable" || e.startsWith("layout") || e.startsWith("onTap") || e.startsWith("onPan") || e.startsWith("onLayout") || _T.has(e);
}
let Pv = (e) => !Sa(e);
function kT(e) {
  typeof e == "function" && (Pv = (n) => n.startsWith("on") ? !Sa(n) : e(n));
}
try {
  kT(require("@emotion/is-prop-valid").default);
} catch {
}
function TT(e, n, o) {
  const i = {};
  for (const a in e)
    a === "values" && typeof e.values == "object" || qe(e[a]) || (Pv(a) || o === !0 && Sa(a) || !n && !Sa(a) || // If trying to use native HTML drag events, forward drag listeners
    e.draggable && a.startsWith("onDrag")) && (i[a] = e[a]);
  return i;
}
const Da = /* @__PURE__ */ C.createContext({});
function AT(e, n) {
  if (Ra(e)) {
    const { initial: o, animate: i } = e;
    return {
      initial: o === !1 || hi(o) ? o : void 0,
      animate: hi(i) ? i : void 0
    };
  }
  return e.inherit !== !1 ? n : {};
}
function CT(e) {
  const { initial: n, animate: o } = AT(e, C.useContext(Da));
  return C.useMemo(() => ({ initial: n, animate: o }), [cy(n), cy(o)]);
}
function cy(e) {
  return Array.isArray(e) ? e.join(" ") : e;
}
const Pd = () => ({
  style: {},
  transform: {},
  transformOrigin: {},
  vars: {}
});
function bv(e, n, o) {
  for (const i in n)
    !qe(n[i]) && !uv(i, o) && (e[i] = n[i]);
}
function ET({ transformTemplate: e }, n) {
  return C.useMemo(() => {
    const o = Pd();
    return Ad(o, n, e), Object.assign({}, o.vars, o.style);
  }, [n]);
}
function PT(e, n) {
  const o = e.style || {}, i = {};
  return bv(i, o, e), Object.assign(i, ET(e, n)), i;
}
function bT(e, n) {
  const o = {}, i = PT(e, n);
  return e.drag && e.dragListener !== !1 && (o.draggable = !1, i.userSelect = i.WebkitUserSelect = i.WebkitTouchCallout = "none", i.touchAction = e.drag === !0 ? "none" : `pan-${e.drag === "x" ? "y" : "x"}`), e.tabIndex === void 0 && (e.onTap || e.onTapStart || e.whileTap) && (o.tabIndex = 0), o.style = i, o;
}
const Mv = () => ({
  ...Pd(),
  attrs: {}
});
function MT(e, n, o, i) {
  const a = C.useMemo(() => {
    const c = Mv();
    return cv(c, n, fv(i), e.transformTemplate, e.style), {
      ...c.attrs,
      style: { ...c.style }
    };
  }, [n]);
  if (e.style) {
    const c = {};
    bv(c, e.style, e), a.style = { ...c, ...a.style };
  }
  return a;
}
const RT = [
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
function bd(e) {
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
      !!(RT.indexOf(e) > -1 || /**
       * If it contains a capital letter, it's an SVG component
       */
      /[A-Z]/u.test(e))
    )
  );
}
function NT(e, n, o, { latestValues: i }, a, c = !1, d) {
  const y = (d ?? bd(e) ? MT : bT)(n, i, a, e), v = TT(n, typeof e == "string", c), S = e !== C.Fragment ? { ...v, ...y, ref: o } : {}, { children: l } = n, h = C.useMemo(() => qe(l) ? l.get() : l, [l]);
  return C.createElement(e, {
    ...S,
    children: h
  });
}
function DT({ scrapeMotionValuesFromProps: e, createRenderState: n }, o, i, a) {
  return {
    latestValues: jT(o, i, a, e),
    renderState: n()
  };
}
function jT(e, n, o, i) {
  const a = {}, c = i(e, {});
  for (const h in c)
    a[h] = na(c[h]);
  let { initial: d, animate: f } = e;
  const y = Ra(e), v = ev(e);
  n && v && !y && e.inherit !== !1 && (d === void 0 && (d = n.initial), f === void 0 && (f = n.animate));
  let S = o ? o.initial === !1 : !1;
  S = S || d === !1;
  const l = S ? f : d;
  if (l && typeof l != "boolean" && !Ma(l)) {
    const h = Array.isArray(l) ? l : [l];
    for (let g = 0; g < h.length; g++) {
      const x = gd(e, h[g]);
      if (x) {
        const { transitionEnd: k, transition: T, ...A } = x;
        for (const R in A) {
          let b = A[R];
          if (Array.isArray(b)) {
            const D = S ? b.length - 1 : 0;
            b = b[D];
          }
          b !== null && (a[R] = b);
        }
        for (const R in k)
          a[R] = k[R];
      }
    }
  }
  return a;
}
const Rv = (e) => (n, o) => {
  const i = C.useContext(Da), a = C.useContext(Pa), c = () => DT(e, n, i, a);
  return o ? c() : nd(c);
}, IT = /* @__PURE__ */ Rv({
  scrapeMotionValuesFromProps: Cd,
  createRenderState: Pd
}), FT = /* @__PURE__ */ Rv({
  scrapeMotionValuesFromProps: pv,
  createRenderState: Mv
}), OT = Symbol.for("motionComponentSymbol");
function LT(e, n, o) {
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
        const y = d(c);
        typeof y == "function" && (a.current = y);
      } else a.current ? (a.current(), a.current = null) : d(c);
    else d && (d.current = c);
  }, [n]);
}
const Nv = C.createContext({});
function Yr(e) {
  return e && typeof e == "object" && Object.prototype.hasOwnProperty.call(e, "current");
}
function VT(e, n, o, i, a, c) {
  var b, D;
  const { visualElement: d } = C.useContext(Da), f = C.useContext(Cv), y = C.useContext(Pa), v = C.useContext(Ed), S = v.reducedMotion, l = v.skipAnimations, h = C.useRef(null), g = C.useRef(!1);
  i = i || f.renderer, !h.current && i && (h.current = i(e, {
    visualState: n,
    parent: d,
    props: o,
    presenceContext: y,
    blockInitialAnimation: y ? y.initial === !1 : !1,
    reducedMotionConfig: S,
    skipAnimations: l,
    isSVG: c
  }), g.current && h.current && (h.current.manuallyAnimateOnMount = !0));
  const x = h.current, k = C.useContext(Nv);
  x && !x.projection && a && (x.type === "html" || x.type === "svg") && zT(h.current, o, a, k);
  const T = C.useRef(!1);
  C.useInsertionEffect(() => {
    x && T.current && x.update(o, y);
  });
  const A = o[Ug], R = C.useRef(!!A && typeof window < "u" && !((b = window.MotionHandoffIsComplete) != null && b.call(window, A)) && ((D = window.MotionHasOptimisedAnimation) == null ? void 0 : D.call(window, A)));
  return rd(() => {
    g.current = !0, x && (T.current = !0, window.MotionIsMounted = !0, x.updateFeatures(), x.scheduleRenderMicrotask(), R.current && x.animationState && x.animationState.animateChanges());
  }), C.useEffect(() => {
    x && (!R.current && x.animationState && x.animationState.animateChanges(), R.current && (queueMicrotask(() => {
      var L;
      (L = window.MotionHandoffMarkAsComplete) == null || L.call(window, A);
    }), R.current = !1), x.enteringChildren = void 0);
  }), x;
}
function zT(e, n, o, i) {
  const { layoutId: a, layout: c, drag: d, dragConstraints: f, layoutScroll: y, layoutRoot: v, layoutAnchor: S, layoutCrossfade: l } = n;
  e.projection = new o(e.latestValues, n["data-framer-portal-id"] ? void 0 : Dv(e.parent)), e.projection.setOptions({
    layoutId: a,
    layout: c,
    alwaysMeasureLayout: !!d || f && Yr(f),
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
    layoutRoot: v,
    layoutAnchor: S
  });
}
function Dv(e) {
  if (e)
    return e.options.allowProjection !== !1 ? e.projection : Dv(e.parent);
}
function Qu(e, { forwardMotionProps: n = !1, type: o } = {}, i, a) {
  i && xT(i);
  const c = o ? o === "svg" : bd(e), d = c ? FT : IT;
  function f(v, S) {
    let l;
    const h = {
      ...C.useContext(Ed),
      ...v,
      layoutId: BT(v)
    }, { isStatic: g } = h, x = CT(v), k = d(v, g);
    if (!g && typeof window < "u") {
      UT();
      const T = $T(h);
      l = T.MeasureLayout, x.visualElement = VT(e, k, h, a, T.ProjectionNode, c);
    }
    return w.jsxs(Da.Provider, { value: x, children: [l && x.visualElement ? w.jsx(l, { visualElement: x.visualElement, ...h }) : null, NT(e, v, LT(k, x.visualElement, S), k, g, n, c)] });
  }
  f.displayName = `motion.${typeof e == "string" ? e : `create(${e.displayName ?? e.name ?? ""})`}`;
  const y = C.forwardRef(f);
  return y[OT] = e, y;
}
function BT({ layoutId: e }) {
  const n = C.useContext(td).id;
  return n && e !== void 0 ? n + "-" + e : e;
}
function UT(e, n) {
  C.useContext(Cv).strict;
}
function $T(e) {
  const n = Ev(), { drag: o, layout: i } = n;
  if (!o && !i)
    return {};
  const a = { ...o, ...i };
  return {
    MeasureLayout: o != null && o.isEnabled(e) || i != null && i.isEnabled(e) ? a.MeasureLayout : void 0,
    ProjectionNode: a.ProjectionNode
  };
}
function HT(e, n) {
  if (typeof Proxy > "u")
    return Qu;
  const o = /* @__PURE__ */ new Map(), i = (c, d) => Qu(c, d, e, n), a = (c, d) => i(c, d);
  return new Proxy(a, {
    /**
     * Called when `motion` is referenced with a prop: `motion.div`, `motion.input` etc.
     * The prop name is passed through as `key` and we can use that to generate a `motion`
     * DOM component with that name.
     */
    get: (c, d) => d === "create" ? i : (o.has(d) || o.set(d, Qu(d, void 0, e, n)), o.get(d))
  });
}
const WT = (e, n) => n.isSVG ?? bd(e) ? new xk(n) : new mk(n, {
  allowProjection: e !== C.Fragment
});
class GT extends Gn {
  /**
   * We dynamically generate the AnimationState manager as it contains a reference
   * to the underlying animation library. We only want to load that if we load this,
   * so people can optionally code split it out using the `m` component.
   */
  constructor(n) {
    super(n), n.animationState || (n.animationState = Ck(n));
  }
  updateAnimationControlsSubscription() {
    const { animate: n } = this.node.getProps();
    Ma(n) && (this.unmountControls = n.subscribe(this.node));
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
let KT = 0;
class YT extends Gn {
  constructor() {
    super(...arguments), this.id = KT++, this.isExitComplete = !1;
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
          const y = mr(this.node, d, f);
          if (y) {
            const { transition: v, transitionEnd: S, ...l } = y;
            for (const h in l)
              (c = this.node.getValue(h)) == null || c.jump(l[h]);
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
const QT = {
  animation: {
    Feature: GT
  },
  exit: {
    Feature: YT
  }
};
function Ci(e) {
  return {
    point: {
      x: e.pageX,
      y: e.pageY
    }
  };
}
const XT = (e) => (n) => xd(n) && e(n, Ci(n));
function li(e, n, o, i) {
  return mi(e, n, XT(o), i);
}
const jv = ({ current: e }) => e ? e.ownerDocument.defaultView : null, dy = (e, n) => Math.abs(e - n);
function ZT(e, n) {
  const o = dy(e.x, n.x), i = dy(e.y, n.y);
  return Math.sqrt(o ** 2 + i ** 2);
}
const fy = /* @__PURE__ */ new Set(["auto", "scroll"]);
class Iv {
  constructor(n, o, { transformPagePoint: i, contextWindow: a = window, dragSnapToOrigin: c = !1, distanceThreshold: d = 3, element: f } = {}) {
    if (this.startEvent = null, this.lastMoveEvent = null, this.lastMoveEventInfo = null, this.lastRawMoveEventInfo = null, this.handlers = {}, this.contextWindow = window, this.scrollPositions = /* @__PURE__ */ new Map(), this.removeScrollListeners = null, this.onElementScroll = (x) => {
      this.handleScroll(x.target);
    }, this.onWindowScroll = () => {
      this.handleScroll(window);
    }, this.updatePoint = () => {
      if (!(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      this.lastRawMoveEventInfo && (this.lastMoveEventInfo = Bs(this.lastRawMoveEventInfo, this.transformPagePoint));
      const x = Xu(this.lastMoveEventInfo, this.history), k = this.startEvent !== null, T = ZT(x.offset, { x: 0, y: 0 }) >= this.distanceThreshold;
      if (!k && !T)
        return;
      const { point: A } = x, { timestamp: R } = Ze;
      this.history.push({ ...A, timestamp: R });
      const { onStart: b, onMove: D } = this.handlers;
      k || (b && b(this.lastMoveEvent, x), this.startEvent = this.lastMoveEvent), D && D(this.lastMoveEvent, x);
    }, this.handlePointerMove = (x, k) => {
      this.lastMoveEvent = x, this.lastRawMoveEventInfo = k, this.lastMoveEventInfo = Bs(k, this.transformPagePoint), Ee.update(this.updatePoint, !0);
    }, this.handlePointerUp = (x, k) => {
      this.end();
      const { onEnd: T, onSessionEnd: A, resumeAnimation: R } = this.handlers;
      if ((this.dragSnapToOrigin || !this.startEvent) && R && R(), !(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      const b = Xu(x.type === "pointercancel" ? this.lastMoveEventInfo : Bs(k, this.transformPagePoint), this.history);
      this.startEvent && T && T(x, b), A && A(x, b);
    }, !xd(n))
      return;
    this.dragSnapToOrigin = c, this.handlers = o, this.transformPagePoint = i, this.distanceThreshold = d, this.contextWindow = a || window;
    const y = Ci(n), v = Bs(y, this.transformPagePoint), { point: S } = v, { timestamp: l } = Ze;
    this.history = [{ ...S, timestamp: l }];
    const { onSessionStart: h } = o;
    h && h(n, Xu(v, this.history));
    const g = { passive: !0, capture: !0 };
    this.removeListeners = ki(li(this.contextWindow, "pointermove", this.handlePointerMove, g), li(this.contextWindow, "pointerup", this.handlePointerUp, g), li(this.contextWindow, "pointercancel", this.handlePointerUp, g)), f && this.startScrollTracking(f);
  }
  /**
   * Start tracking scroll on ancestors and window.
   */
  startScrollTracking(n) {
    let o = n.parentElement;
    for (; o; ) {
      const i = getComputedStyle(o);
      (fy.has(i.overflowX) || fy.has(i.overflowY)) && this.scrollPositions.set(o, {
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
    c.x === 0 && c.y === 0 || (i ? this.lastMoveEventInfo && (this.lastMoveEventInfo.point.x += c.x, this.lastMoveEventInfo.point.y += c.y) : this.history.length > 0 && (this.history[0].x -= c.x, this.history[0].y -= c.y), this.scrollPositions.set(n, a), Ee.update(this.updatePoint, !0));
  }
  updateHandlers(n) {
    this.handlers = n;
  }
  end() {
    this.removeListeners && this.removeListeners(), this.removeScrollListeners && this.removeScrollListeners(), this.scrollPositions.clear(), Hn(this.updatePoint);
  }
}
function Bs(e, n) {
  return n ? { point: n(e.point) } : e;
}
function py(e, n) {
  return { x: e.x - n.x, y: e.y - n.y };
}
function Xu({ point: e }, n) {
  return {
    point: e,
    delta: py(e, Fv(n)),
    offset: py(e, qT(n)),
    velocity: JT(n, 0.1)
  };
}
function qT(e) {
  return e[0];
}
function Fv(e) {
  return e[e.length - 1];
}
function JT(e, n) {
  if (e.length < 2)
    return { x: 0, y: 0 };
  let o = e.length - 1, i = null;
  const a = Fv(e);
  for (; o >= 0 && (i = e[o], !(a.timestamp - i.timestamp > /* @__PURE__ */ yt(n))); )
    o--;
  if (!i)
    return { x: 0, y: 0 };
  i === e[0] && e.length > 2 && a.timestamp - i.timestamp > /* @__PURE__ */ yt(n) * 2 && (i = e[1]);
  const c = /* @__PURE__ */ bt(a.timestamp - i.timestamp);
  if (c === 0)
    return { x: 0, y: 0 };
  const d = {
    x: (a.x - i.x) / c,
    y: (a.y - i.y) / c
  };
  return d.x === 1 / 0 && (d.x = 0), d.y === 1 / 0 && (d.y = 0), d;
}
function eA(e, { min: n, max: o }, i) {
  return n !== void 0 && e < n ? e = i ? Ce(n, e, i.min) : Math.max(e, n) : o !== void 0 && e > o && (e = i ? Ce(o, e, i.max) : Math.min(e, o)), e;
}
function hy(e, n, o) {
  return {
    min: n !== void 0 ? e.min + n : void 0,
    max: o !== void 0 ? e.max + o - (e.max - e.min) : void 0
  };
}
function tA(e, { top: n, left: o, bottom: i, right: a }) {
  return {
    x: hy(e.x, o, a),
    y: hy(e.y, n, i)
  };
}
function my(e, n) {
  let o = n.min - e.min, i = n.max - e.max;
  return n.max - n.min < e.max - e.min && ([o, i] = [i, o]), { min: o, max: i };
}
function nA(e, n) {
  return {
    x: my(e.x, n.x),
    y: my(e.y, n.y)
  };
}
function rA(e, n) {
  let o = 0.5;
  const i = st(e), a = st(n);
  return a > i ? o = /* @__PURE__ */ fi(n.min, n.max - i, e.min) : i > a && (o = /* @__PURE__ */ fi(e.min, e.max - a, n.min)), rn(0, 1, o);
}
function oA(e, n) {
  const o = {};
  return n.min !== void 0 && (o.min = n.min - e.min), n.max !== void 0 && (o.max = n.max - e.min), o;
}
const jc = 0.35;
function iA(e = jc) {
  return e === !1 ? e = 0 : e === !0 && (e = jc), {
    x: yy(e, "left", "right"),
    y: yy(e, "top", "bottom")
  };
}
function yy(e, n, o) {
  return {
    min: gy(e, n),
    max: gy(e, o)
  };
}
function gy(e, n) {
  return typeof e == "number" ? e : e[n] || 0;
}
const sA = /* @__PURE__ */ new WeakMap();
class aA {
  constructor(n) {
    this.openDragLock = null, this.isDragging = !1, this.currentDirection = null, this.originPoint = { x: 0, y: 0 }, this.constraints = !1, this.hasMutatedConstraints = !1, this.elastic = He(), this.latestPointerEvent = null, this.latestPanInfo = null, this.visualElement = n;
  }
  start(n, { snapToCursor: o = !1, distanceThreshold: i } = {}) {
    const { presenceContext: a } = this.visualElement;
    if (a && a.isPresent === !1)
      return;
    const c = (l) => {
      o && this.snapToCursor(Ci(l).point), this.stopAnimation();
    }, d = (l, h) => {
      const { drag: g, dragPropagation: x, onDragStart: k } = this.getProps();
      if (g && !x && (this.openDragLock && this.openDragLock(), this.openDragLock = j_(g), !this.openDragLock))
        return;
      this.latestPointerEvent = l, this.latestPanInfo = h, this.isDragging = !0, this.currentDirection = null, this.resolveConstraints(), this.visualElement.projection && (this.visualElement.projection.isAnimationBlocked = !0, this.visualElement.projection.target = void 0), qt((A) => {
        let R = this.getAxisMotionValue(A).get() || 0;
        if (tn.test(R)) {
          const { projection: b } = this.visualElement;
          if (b && b.layout) {
            const D = b.layout.layoutBox[A];
            D && (R = st(D) * (parseFloat(R) / 100));
          }
        }
        this.originPoint[A] = R;
      }), k && Ee.update(() => k(l, h), !1, !0), Tc(this.visualElement, "transform");
      const { animationState: T } = this.visualElement;
      T && T.setActive("whileDrag", !0);
    }, f = (l, h) => {
      this.latestPointerEvent = l, this.latestPanInfo = h;
      const { dragPropagation: g, dragDirectionLock: x, onDirectionLock: k, onDrag: T } = this.getProps();
      if (!g && !this.openDragLock)
        return;
      const { offset: A } = h;
      if (x && this.currentDirection === null) {
        this.currentDirection = uA(A), this.currentDirection !== null && k && k(this.currentDirection);
        return;
      }
      this.updateAxis("x", h.point, A), this.updateAxis("y", h.point, A), this.visualElement.render(), T && Ee.update(() => T(l, h), !1, !0);
    }, y = (l, h) => {
      this.latestPointerEvent = l, this.latestPanInfo = h, this.stop(l, h), this.latestPointerEvent = null, this.latestPanInfo = null;
    }, v = () => {
      const { dragSnapToOrigin: l } = this.getProps();
      (l || this.constraints) && this.startAnimation({ x: 0, y: 0 });
    }, { dragSnapToOrigin: S } = this.getProps();
    this.panSession = new Iv(n, {
      onSessionStart: c,
      onStart: d,
      onMove: f,
      onSessionEnd: y,
      resumeAnimation: v
    }, {
      transformPagePoint: this.visualElement.getTransformPagePoint(),
      dragSnapToOrigin: S,
      distanceThreshold: i,
      contextWindow: jv(this.visualElement),
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
    f && Ee.postRender(() => f(i, a));
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
    if (!i || !Us(n, a, this.currentDirection))
      return;
    const c = this.getAxisMotionValue(n);
    let d = this.originPoint[n] + i[n];
    this.constraints && this.constraints[n] && (d = eA(d, this.constraints[n], this.elastic[n])), c.set(d);
  }
  resolveConstraints() {
    var c;
    const { dragConstraints: n, dragElastic: o } = this.getProps(), i = this.visualElement.projection && !this.visualElement.projection.layout ? this.visualElement.projection.measure(!1) : (c = this.visualElement.projection) == null ? void 0 : c.layout, a = this.constraints;
    n && Yr(n) ? this.constraints || (this.constraints = this.resolveRefConstraints()) : n && i ? this.constraints = tA(i.layoutBox, n) : this.constraints = !1, this.elastic = iA(o), a !== this.constraints && !Yr(n) && i && this.constraints && !this.hasMutatedConstraints && qt((d) => {
      this.constraints !== !1 && this.getAxisMotionValue(d) && (this.constraints[d] = oA(i.layoutBox[d], this.constraints[d]));
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
    const c = uk(i, a.root, this.visualElement.getTransformPagePoint());
    let d = nA(a.layout.layoutBox, c);
    if (o) {
      const f = o(sk(d));
      this.hasMutatedConstraints = !!f, f && (d = ov(f));
    }
    return d;
  }
  startAnimation(n) {
    const { drag: o, dragMomentum: i, dragElastic: a, dragTransition: c, dragSnapToOrigin: d, onDragTransitionEnd: f } = this.getProps(), y = this.constraints || {}, v = qt((S) => {
      if (!Us(S, o, this.currentDirection))
        return;
      let l = y && y[S] || {};
      (d === !0 || d === S) && (l = { min: 0, max: 0 });
      const h = a ? 200 : 1e6, g = a ? 40 : 1e7, x = {
        type: "inertia",
        velocity: i ? n[S] : 0,
        bounceStiffness: h,
        bounceDamping: g,
        timeConstant: 750,
        restDelta: 1,
        restSpeed: 10,
        ...c,
        ...l
      };
      return this.startAxisValueAnimation(S, x);
    });
    return Promise.all(v).then(f);
  }
  startAxisValueAnimation(n, o) {
    const i = this.getAxisMotionValue(n);
    return Tc(this.visualElement, n), i.start(yd(n, i, 0, o, this.visualElement, !1));
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
      if (!Us(o, i, this.currentDirection))
        return;
      const { projection: a } = this.visualElement, c = this.getAxisMotionValue(o);
      if (a && a.layout) {
        const { min: d, max: f } = a.layout.layoutBox[o], y = c.get() || 0;
        c.set(n[o] - Ce(d, f, 0.5) + y);
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
    qt((d) => {
      const f = this.getAxisMotionValue(d);
      if (f && this.constraints !== !1) {
        const y = f.get();
        a[d] = rA({ min: y, max: y }, this.constraints[d]);
      }
    });
    const { transformTemplate: c } = this.visualElement.getProps();
    this.visualElement.current.style.transform = c ? c({}, "") : "none", i.root && i.root.updateScroll(), i.updateLayout(), this.constraints = !1, this.resolveConstraints(), qt((d) => {
      if (!Us(d, n, null))
        return;
      const f = this.getAxisMotionValue(d), { min: y, max: v } = this.constraints[d];
      f.set(Ce(y, v, a[d]));
    }), this.visualElement.render();
  }
  addListeners() {
    if (!this.visualElement.current)
      return;
    sA.set(this.visualElement, this);
    const n = this.visualElement.current, o = li(n, "pointerdown", (v) => {
      const { drag: S, dragListener: l = !0 } = this.getProps(), h = v.target, g = h !== n && z_(h);
      S && l && !g && this.start(v);
    });
    let i;
    const a = () => {
      const { dragConstraints: v } = this.getProps();
      Yr(v) && v.current && (this.constraints = this.resolveRefConstraints(), i || (i = lA(n, v.current, () => this.scalePositionWithinConstraints())));
    }, { projection: c } = this.visualElement, d = c.addEventListener("measure", a);
    c && !c.layout && (c.root && c.root.updateScroll(), c.updateLayout()), Ee.read(a);
    const f = mi(window, "resize", () => this.scalePositionWithinConstraints()), y = c.addEventListener("didUpdate", (({ delta: v, hasLayoutChanged: S }) => {
      this.isDragging && S && (qt((l) => {
        const h = this.getAxisMotionValue(l);
        h && (this.originPoint[l] += v[l].translate, h.set(h.get() + v[l].translate));
      }), this.visualElement.render());
    }));
    return () => {
      f(), o(), d(), y && y(), i && i();
    };
  }
  getProps() {
    const n = this.visualElement.getProps(), { drag: o = !1, dragDirectionLock: i = !1, dragPropagation: a = !1, dragConstraints: c = !1, dragElastic: d = jc, dragMomentum: f = !0 } = n;
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
function vy(e) {
  let n = !0;
  return () => {
    if (n) {
      n = !1;
      return;
    }
    e();
  };
}
function lA(e, n, o) {
  const i = Am(e, vy(o)), a = Am(n, vy(o));
  return () => {
    i(), a();
  };
}
function Us(e, n, o) {
  return (n === !0 || n === e) && (o === null || o === e);
}
function uA(e, n = 10) {
  let o = null;
  return Math.abs(e.y) > n ? o = "y" : Math.abs(e.x) > n && (o = "x"), o;
}
class cA extends Gn {
  constructor(n) {
    super(n), this.removeGroupControls = Mt, this.removeListeners = Mt, this.controls = new aA(n);
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
const Zu = (e) => (n, o) => {
  e && Ee.update(() => e(n, o), !1, !0);
};
class dA extends Gn {
  constructor() {
    super(...arguments), this.removePointerDownListener = Mt;
  }
  onPointerDown(n) {
    this.session = new Iv(n, this.createPanHandlers(), {
      transformPagePoint: this.node.getTransformPagePoint(),
      contextWindow: jv(this.node)
    });
  }
  createPanHandlers() {
    const { onPanSessionStart: n, onPanStart: o, onPan: i, onPanEnd: a } = this.node.getProps();
    return {
      onSessionStart: Zu(n),
      onStart: Zu(o),
      onMove: Zu(i),
      onEnd: (c, d) => {
        delete this.session, a && Ee.postRender(() => a(c, d));
      }
    };
  }
  mount() {
    this.removePointerDownListener = li(this.node.current, "pointerdown", (n) => this.onPointerDown(n));
  }
  update() {
    this.session && this.session.updateHandlers(this.createPanHandlers());
  }
  unmount() {
    this.removePointerDownListener(), this.session && this.session.end();
  }
}
let qu = !1;
class fA extends C.Component {
  /**
   * This only mounts projection nodes for components that
   * need measuring, we might want to do it for all components
   * in order to incorporate transforms
   */
  componentDidMount() {
    const { visualElement: n, layoutGroup: o, switchLayoutGroup: i, layoutId: a } = this.props, { projection: c } = n;
    c && (o.group && o.group.add(c), i && i.register && a && i.register(c), qu && c.root.didUpdate(), c.addEventListener("animationComplete", () => {
      this.safeToRemove();
    }), c.setOptions({
      ...c.options,
      layoutDependency: this.props.layoutDependency,
      onExitComplete: () => this.safeToRemove()
    })), ra.hasEverUpdated = !0;
  }
  getSnapshotBeforeUpdate(n) {
    const { layoutDependency: o, visualElement: i, drag: a, isPresent: c } = this.props, { projection: d } = i;
    return d && (d.isPresent = c, n.layoutDependency !== o && d.setOptions({
      ...d.options,
      layoutDependency: o
    }), qu = !0, a || n.layoutDependency !== o || o === void 0 || n.isPresent !== c ? d.willUpdate() : this.safeToRemove(), n.isPresent !== c && (c ? d.promote() : d.relegate() || Ee.postRender(() => {
      const f = d.getStack();
      (!f || !f.members.length) && this.safeToRemove();
    }))), null;
  }
  componentDidUpdate() {
    const { visualElement: n, layoutAnchor: o } = this.props, { projection: i } = n;
    i && (i.options.layoutAnchor = o, i.root.didUpdate(), wd.postRender(() => {
      !i.currentAnimation && i.isLead() && this.safeToRemove();
    }));
  }
  componentWillUnmount() {
    const { visualElement: n, layoutGroup: o, switchLayoutGroup: i } = this.props, { projection: a } = n;
    qu = !0, a && (a.scheduleCheckAfterUnmount(), o && o.group && o.group.remove(a), i && i.deregister && i.deregister(a));
  }
  safeToRemove() {
    const { safeToRemove: n } = this.props;
    n && n();
  }
  render() {
    return null;
  }
}
function Ov(e) {
  const [n, o] = Av(), i = C.useContext(td);
  return w.jsx(fA, { ...e, layoutGroup: i, switchLayoutGroup: C.useContext(Nv), isPresent: n, safeToRemove: o });
}
const pA = {
  pan: {
    Feature: dA
  },
  drag: {
    Feature: cA,
    ProjectionNode: Tv,
    MeasureLayout: Ov
  }
};
function Sy(e, n, o) {
  const { props: i } = e;
  e.animationState && i.whileHover && e.animationState.setActive("whileHover", o === "Start");
  const a = "onHover" + o, c = i[a];
  c && Ee.postRender(() => c(n, Ci(n)));
}
class hA extends Gn {
  mount() {
    const { current: n } = this.node;
    n && (this.unmount = F_(n, (o, i) => (Sy(this.node, i, "Start"), (a) => Sy(this.node, a, "End"))));
  }
  unmount() {
  }
}
class mA extends Gn {
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
    this.unmount = ki(mi(this.node.current, "focus", () => this.onFocus()), mi(this.node.current, "blur", () => this.onBlur()));
  }
  unmount() {
  }
}
function wy(e, n, o) {
  const { props: i } = e;
  if (e.current instanceof HTMLButtonElement && e.current.disabled)
    return;
  e.animationState && i.whileTap && e.animationState.setActive("whileTap", o === "Start");
  const a = "onTap" + (o === "End" ? "" : o), c = i[a];
  c && Ee.postRender(() => c(n, Ci(n)));
}
class yA extends Gn {
  mount() {
    const { current: n } = this.node;
    if (!n)
      return;
    const { globalTapTarget: o, propagate: i } = this.node.props;
    this.unmount = U_(n, (a, c) => (wy(this.node, c, "Start"), (d, { success: f }) => wy(this.node, d, f ? "End" : "Cancel")), {
      useGlobalTarget: o,
      stopPropagation: (i == null ? void 0 : i.tap) === !1
    });
  }
  unmount() {
  }
}
const Ic = /* @__PURE__ */ new WeakMap(), Ju = /* @__PURE__ */ new WeakMap(), gA = (e) => {
  const n = Ic.get(e.target);
  n && n(e);
}, vA = (e) => {
  e.forEach(gA);
};
function SA({ root: e, ...n }) {
  const o = e || document;
  Ju.has(o) || Ju.set(o, {});
  const i = Ju.get(o), a = JSON.stringify(n);
  return i[a] || (i[a] = new IntersectionObserver(vA, { root: e, ...n })), i[a];
}
function wA(e, n, o) {
  const i = SA(n);
  return Ic.set(e, o), i.observe(e), () => {
    Ic.delete(e), i.unobserve(e);
  };
}
const xA = {
  some: 0,
  all: 1
};
class _A extends Gn {
  constructor() {
    super(...arguments), this.hasEnteredView = !1, this.isInView = !1;
  }
  startObserver() {
    var y;
    (y = this.stopObserver) == null || y.call(this);
    const { viewport: n = {} } = this.node.getProps(), { root: o, margin: i, amount: a = "some", once: c } = n, d = {
      root: o ? o.current : void 0,
      rootMargin: i,
      threshold: typeof a == "number" ? a : xA[a]
    }, f = (v) => {
      const { isIntersecting: S } = v;
      if (this.isInView === S || (this.isInView = S, c && !S && this.hasEnteredView))
        return;
      S && (this.hasEnteredView = !0), this.node.animationState && this.node.animationState.setActive("whileInView", S);
      const { onViewportEnter: l, onViewportLeave: h } = this.node.getProps(), g = S ? l : h;
      g && g(v);
    };
    this.stopObserver = wA(this.node.current, d, f);
  }
  mount() {
    this.startObserver();
  }
  update() {
    if (typeof IntersectionObserver > "u")
      return;
    const { props: n, prevProps: o } = this.node;
    ["amount", "margin", "root"].some(kA(n, o)) && this.startObserver();
  }
  unmount() {
    var n;
    (n = this.stopObserver) == null || n.call(this), this.hasEnteredView = !1, this.isInView = !1;
  }
}
function kA({ viewport: e = {} }, { viewport: n = {} } = {}) {
  return (o) => e[o] !== n[o];
}
const TA = {
  inView: {
    Feature: _A
  },
  tap: {
    Feature: yA
  },
  focus: {
    Feature: mA
  },
  hover: {
    Feature: hA
  }
}, AA = {
  layout: {
    ProjectionNode: Tv,
    MeasureLayout: Ov
  }
}, CA = {
  ...QT,
  ...TA,
  ...pA,
  ...AA
}, EA = /* @__PURE__ */ HT(CA, WT), nn = EA;
function PA(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function Lv(e) {
  const n = String(e || "").toLowerCase();
  return n === "127.0.0.1" || n === "localhost" || n === "::1" || n === "[::1]";
}
function xy(e) {
  return Lv(e) || PA(e);
}
function bA(e) {
  return !e || Lv(e) ? "127.0.0.1" : e;
}
const MA = (() => {
  var S, l, h, g;
  const e = globalThis.window || globalThis, n = globalThis.document || {}, o = e.location || {}, i = String(e.SYNAPSE_DATA_API_PORT || ((l = (S = n.body) == null ? void 0 : S.dataset) == null ? void 0 : l.dataApiPort) || "3001").trim(), { protocol: a = "file:", hostname: c = "127.0.0.1", port: d = "" } = o, f = `http://${bA(c)}:${i || "3001"}`, y = String(e.SYNAPSE_DATA_API_BASE || ((g = (h = n.body) == null ? void 0 : h.dataset) == null ? void 0 : g.dataApiBase) || "").replace(/\/+$/, ""), v = `${a}//${o.host || (d ? `${c}:${d}` : c)}`.replace(/\/+$/, "");
  return y && !(xy(c) && d !== i && y === v) ? y : a === "file:" || xy(c) && d !== i ? f : `${a}//${o.host || c}`;
})(), RA = new qy(MA), ec = Number((globalThis.window || globalThis).SYNAPSE_DATA_API_TIMEOUT_MS || 6e3), NA = Number.isFinite(ec) && ec > 0 ? ec : 6e3;
function DA(e, n) {
  typeof window > "u" || console.warn(e, n);
}
async function jA(e) {
  var i, a;
  const o = (((a = (i = e.headers) == null ? void 0 : i.get) == null ? void 0 : a.call(i, "content-type")) || "").includes("application/json") ? await e.json() : {};
  if (!e.ok || (o == null ? void 0 : o.ok) === !1)
    throw new Error((o == null ? void 0 : o.error) || `Synapse data API returned HTTP ${e.status}`);
  return o;
}
async function IA(e, n = {}) {
  const o = await RA.fetch(e, {
    timeoutMs: NA,
    ...n
  });
  return jA(o);
}
async function FA(e) {
  try {
    return (await IA("/api/focus-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(e || {})
    })).item || null;
  } catch (n) {
    return DA("Synapse data API focus-session save skipped:", n), null;
  }
}
class OA {
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
const Vv = new OA();
function Md(e, n) {
  return Vv.readJSON(e, n);
}
function Rd(e, n) {
  return Vv.writeJSON(e, n);
}
const zv = "synapse.focusRoom.sessions.v1", Bv = "synapse.focusRoom.draft.v1", Uv = "synapse.focusRoom.active-session.v1", Fc = 40, _y = Object.freeze([
  "idle",
  "running",
  "paused",
  "completed",
  "break",
  "restoring"
]), LA = Object.freeze({
  studying: "running",
  running: "running",
  idle: "idle",
  paused: "paused",
  completed: "completed",
  break: "break",
  restoring: "restoring"
});
let Oc = [];
const cr = (e) => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURI(e)}`, yi = [
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
], Ye = {
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
}, gi = [
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
], VA = [
  {
    ...gn[0],
    name: "清晨窗边",
    kicker: "晨光 · 植物",
    description: "A bright morning desk beside a leafy window.",
    image: "./assets/focus-room/innook/morning-window.jpg"
  },
  ...gn.filter((e) => e.galleryOnly)
], $v = [25, 45, 50, 90];
function zA(e = "") {
  const n = String(e || "");
  return yi.find((o) => o.label === n) || yi[0];
}
function BA(e = "") {
  const n = String(e || "");
  return gi.find((o) => o.label === n) || gi[0];
}
function ja(e = {}) {
  const n = zA(e == null ? void 0 : e.musicType), o = BA(e == null ? void 0 : e.ambientSound);
  return {
    musicTrack: n,
    ambientSound: o,
    ambientLayers: o.layers.map((i) => ({
      ...i,
      volumeBias: zn(i.volumeBias, 1)
    }))
  };
}
function UA(e) {
  return e && typeof e == "object" && !Array.isArray(e) ? e : {};
}
function Hv(e) {
  return String(e || "").trim();
}
function $A({ material: e, goal: n, durationMinutes: o }) {
  var S;
  const i = Math.max(10, Number(o) || 25), a = (S = e == null ? void 0 : e.studyHeadings) != null && S.length ? e.studyHeadings : ["Key ideas", "Examples", "Practice", "Review"], c = String(n || "").trim() || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`, d = Math.max(1, Math.floor(i * 0.2)), f = Math.max(1, Math.floor(i * 0.4)), y = Math.max(1, Math.floor(i * 0.2)), v = Math.max(1, i - d - f - y);
  return [
    { minutes: d, task: `Set the goal: ${c}` },
    { minutes: f, task: `Review ${a[0] || "the core ideas"}` },
    { minutes: y, task: `Practice with ${a[1] || a[0] || "the generated examples"}` },
    { minutes: v, task: "Summarize mistakes and choose the next study step" }
  ];
}
function Wv() {
  return Md(Bv, null);
}
function HA(e) {
  return Rd(Bv, e || null);
}
function Gv(e) {
  if (!e || typeof e != "object")
    return { materials: {} };
  const n = UA(e.materials);
  return {
    ...e,
    materials: { ...n }
  };
}
function ro(e, n = "idle") {
  const o = LA[String(e || "").trim().toLowerCase()];
  return o && _y.includes(o) ? o : _y.includes(n) ? n : "idle";
}
function Nd(e) {
  return ro(e) === "running" ? "studying" : ro(e);
}
function Kv(e = {}, n = {}) {
  const o = e && typeof e == "object" ? e : {}, i = n && typeof n == "object" ? n : {}, a = Object.prototype.hasOwnProperty.call(o, "timerStatus"), c = Object.prototype.hasOwnProperty.call(o, "timerState") || Object.prototype.hasOwnProperty.call(o, "timerPhase"), d = ro(
    c ? o.timerState || o.timerPhase : a ? o.timerStatus : o.status || i.timerState,
    ro(i.timerState || i.timerPhase || i.timerStatus)
  ), f = o.timerMode === "countup" || i.timerMode === "countup" && !Object.prototype.hasOwnProperty.call(o, "timerMode") ? "countup" : "countdown", v = Object.fromEntries(["timerAnchorAtMs", "timerPausedAtMs", "timerUpdatedAtMs", "timerRestoredAtMs"].map((l) => {
    const h = Object.prototype.hasOwnProperty.call(o, l) ? o[l] : i[l], g = Number(h);
    return [l, Number.isFinite(g) && g > 0 ? g : null];
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
    timerStatus: Nd(d),
    timerMode: f,
    elapsedSeconds: S,
    ...v
  };
}
function Yv() {
  return Gv(Md(Uv, null));
}
function WA(e) {
  return Rd(Uv, Gv(e));
}
function GA(e) {
  const n = Hv(e);
  if (!n) return null;
  const i = Yv().materials[n];
  return i && typeof i == "object" ? Kv(i) : null;
}
function Dd(e, n) {
  const o = Hv(e);
  if (!o) return !1;
  const i = Yv();
  return n && typeof n == "object" ? i.materials[o] = {
    ...Kv(n, i.materials[o]),
    materialId: o,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  } : delete i.materials[o], WA(i);
}
function Qv(e) {
  return Dd(e, null);
}
function Lc() {
  const e = Md(zv, []), n = Array.isArray(e) ? e : [], o = /* @__PURE__ */ new Set();
  return [...Oc, ...n].filter((i) => {
    const a = String((i == null ? void 0 : i.sessionId) || "");
    return !a || o.has(a) ? !1 : (o.add(a), !0);
  }).slice(0, Fc);
}
function zn(e, n) {
  const o = Number(e);
  return Number.isFinite(o) ? o : n;
}
function KA(e = {}) {
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
  }, persisted: !0 }, a = Lc().filter((y) => y.sessionId !== i.sessionId), c = [i, ...a.map((y) => ({ ...y, persisted: !0 }))].slice(0, Fc), d = Rd(zv, c), f = { ...i, persisted: d };
  return FA(f).catch((y) => {
    console.warn("Synapse data API focus-session background save failed:", y);
  }), d ? Oc = [] : Oc = [f, ...a].slice(0, Fc), f;
}
function jd(e) {
  const n = Math.max(0, zn(e || 0, 0)), o = Math.floor(n / 3600), i = Math.floor(n % 3600 / 60);
  return o ? `${o}h ${i}m` : `${i}m`;
}
var Qy;
const Vc = ((Qy = gn[0]) == null ? void 0 : Qy.id) || "morning-window", qr = $v[0] || 25, Xv = 10, wa = 180, YA = 0, QA = 100, XA = ["materials", "notes", "sources", "chat", "quiz", "flashcards", "mindmap", "plan", "workspace", "history"], zc = new Set(XA), oa = {
  type: "spring",
  stiffness: 120,
  damping: 18,
  mass: 0.8
};
function ZA(e, n, o, i) {
  const a = Number(e);
  return Number.isFinite(a) ? Math.min(i, Math.max(o, a)) : n;
}
function Jr(e, n, o, i) {
  return Math.round(ZA(e, n, o, i));
}
function yr(e, n = 50) {
  return Jr(e, n, YA, QA);
}
function vi(e, n = qr) {
  return Jr(e, n, Xv, wa);
}
function Id(e) {
  return gn.find((n) => n.id === e) || null;
}
function Wn(e = Vc) {
  return Id(e) || gn[0] || {
    id: Vc,
    name: "Focus Room",
    kicker: "Focus",
    description: "A quiet study space.",
    image: "",
    ambientSound: "Nature",
    musicType: "Deep Focus"
  };
}
function Zv(e) {
  return Array.isArray(e) ? e.map((n) => ({
    minutes: Jr(n == null ? void 0 : n.minutes, 5, 1, wa),
    task: String((n == null ? void 0 : n.task) || "").trim()
  })).filter((n) => n.task) : [];
}
function oi(e) {
  return Array.isArray(e) ? e.map((n) => ({
    role: String((n == null ? void 0 : n.role) || "assistant") === "user" ? "user" : "assistant",
    text: String((n == null ? void 0 : n.text) || "").trim(),
    createdAt: (n == null ? void 0 : n.createdAt) || (/* @__PURE__ */ new Date()).toISOString()
  })).filter((n) => n.text).slice(-24) : [];
}
function qv(e) {
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
function Bc(e, n, o) {
  return e ? $A({
    material: e,
    goal: n,
    durationMinutes: o
  }) : [];
}
function Zt(e) {
  const n = vi(e);
  return n > 0 ? n * 60 : 0;
}
function ui(e) {
  const n = Math.max(0, Math.floor(Number(e) || 0)), o = Math.floor(n / 3600), i = Math.floor(n % 3600 / 60), a = n % 60, c = (d) => String(d).padStart(2, "0");
  return o ? `${o}:${c(i)}:${c(a)}` : `${c(i)}:${c(a)}`;
}
function ky(e) {
  const n = (e == null ? void 0 : e.flashcards) || [];
  return Array.isArray(n) ? n.slice(0, 24) : [];
}
function qA(e, n) {
  return String((e == null ? void 0 : e.id) || (e == null ? void 0 : e.front) || (e == null ? void 0 : e.term) || n);
}
function JA(e) {
  var n;
  return Array.isArray(e == null ? void 0 : e.questions) ? e.questions : Array.isArray((n = e == null ? void 0 : e.quiz) == null ? void 0 : n.questions) ? e.quiz.questions : [];
}
function Uc(e) {
  return (Array.isArray(e == null ? void 0 : e.quizzes) ? e.quizzes : []).flatMap((o) => JA(o).map((i) => {
    var a;
    return {
      ...i,
      quizTitle: (o == null ? void 0 : o.title) || ((a = o == null ? void 0 : o.quiz) == null ? void 0 : a.title) || "Saved quiz"
    };
  })).slice(0, 12);
}
function eC(e, n) {
  return (e == null ? void 0 : e.question) || (e == null ? void 0 : e.prompt) || (e == null ? void 0 : e.stem) || `Question ${n + 1}`;
}
function Fd(e) {
  return String((e == null ? void 0 : e.type) || "").toLowerCase();
}
function tC(e) {
  return String((e == null ? void 0 : e.label) || (e == null ? void 0 : e.text) || e).trim();
}
function xa(e) {
  const n = (e == null ? void 0 : e.choices) || (e == null ? void 0 : e.options) || (e == null ? void 0 : e.answers);
  return Array.isArray(n) && n.length ? n.map(tC).filter(Boolean) : Fd(e) === "true_false" ? ["True", "False"] : [];
}
function $c(e) {
  const n = (e == null ? void 0 : e.correctOptionIndexes) || (e == null ? void 0 : e.correct_option_indexes) || (e == null ? void 0 : e.correctIndexes);
  return Array.isArray(n) ? n.map((o) => Number(o)).filter(Number.isInteger) : [];
}
function nC(e, n) {
  const o = Array.isArray(e) ? [...e].map(Number).filter(Number.isInteger).sort((a, c) => a - c) : [], i = Array.isArray(n) ? [...n].map(Number).filter(Number.isInteger).sort((a, c) => a - c) : [];
  return o.length === i.length && o.every((a, c) => a === i[c]);
}
function gr(e) {
  return String(e || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function _a(e, n) {
  if (Number.isInteger(n)) return n;
  const o = Number(n);
  if (typeof n != "string" && Number.isInteger(o)) return o;
  const i = xa(e), a = gr(n);
  return i.findIndex((c) => gr(c) === a);
}
function Jv(e, n) {
  if (typeof n == "boolean") return n;
  if (n === 0) return !0;
  if (n === 1) return !1;
  const o = xa(e), i = gr(n);
  return i === "true" ? !0 : i === "false" ? !1 : gr(o[0]) === i ? !0 : gr(o[1]) === i ? !1 : null;
}
function rC(e, n, o) {
  const i = Fd(e);
  if (i === "multiple_choice") {
    const a = _a(e, n);
    if (!Number.isInteger(a) || a < 0) return [];
    const c = Array.isArray(o) ? [...o] : [];
    return c.includes(a) ? c.filter((d) => d !== a) : [...c, a].sort((d, f) => d - f);
  }
  if (i === "single_choice") {
    const a = _a(e, n);
    return Number.isInteger(a) && a >= 0 ? a : "";
  }
  if (i === "true_false") {
    const a = Jv(e, n);
    return a === null ? "" : a;
  }
  return String(n || "");
}
function e0(e) {
  const n = (e == null ? void 0 : e.correctAnswer) ?? (e == null ? void 0 : e.correct_answer) ?? (e == null ? void 0 : e.answer) ?? (e == null ? void 0 : e.correct), o = $c(e);
  if (o.length) {
    const i = xa(e);
    return o.map((a) => i[a] || "").filter(Boolean).join(", ");
  }
  if (typeof (e == null ? void 0 : e.correctBoolean) == "boolean" || typeof (e == null ? void 0 : e.correct_boolean) == "boolean") {
    const i = xa(e);
    return (typeof e.correctBoolean == "boolean" ? e.correctBoolean : e.correct_boolean) ? i[0] || "True" : i[1] || "False";
  }
  return e != null && e.expectedAnswer || e != null && e.expected_answer ? String(e.expectedAnswer || e.expected_answer || "").trim() : Array.isArray(n) ? n.map((i) => String(i)).join(", ") : String(n || "").trim();
}
function oC(e, n) {
  const o = Fd(e);
  if (o === "single_choice") {
    const a = $c(e)[0], c = _a(e, n);
    return Number.isInteger(a) ? c === a : null;
  }
  if (o === "multiple_choice") {
    const a = $c(e), c = Array.isArray(n) ? n : [_a(e, n)].filter(Number.isInteger);
    return a.length ? nC(c, a) : null;
  }
  if (o === "true_false") {
    const a = typeof (e == null ? void 0 : e.correctBoolean) == "boolean" ? e.correctBoolean : e == null ? void 0 : e.correct_boolean, c = Jv(e, n);
    return typeof a == "boolean" && c !== null ? c === a : null;
  }
  const i = e0(e);
  return i ? gr(n) === gr(i) : null;
}
function t0(e, n, o) {
  var f;
  const i = String(e || "").trim(), a = String((n == null ? void 0 : n.summaryText) || (n == null ? void 0 : n.aiSummary) || "").slice(0, 420), c = ((f = n == null ? void 0 : n.studyHeadings) == null ? void 0 : f[0]) || (n == null ? void 0 : n.materialTitle) || "this material", d = o || `Study ${(n == null ? void 0 : n.materialTitle) || "this material"}`;
  return i ? [
    `For ${c}: ${a || "use the selected material as your main source."}`,
    `Your current goal is: ${d}.`,
    "Try explaining the idea in one sentence, then test yourself with one example before moving on."
  ].join(" ") : "";
}
function iC() {
  return /* @__PURE__ */ w.jsx("svg", { className: "liquid-glass-filter-defs", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ w.jsx("defs", { children: /* @__PURE__ */ w.jsxs("filter", { id: "liquid-glass-displacement", x: "-12%", y: "-12%", width: "124%", height: "124%", colorInterpolationFilters: "sRGB", children: [
    /* @__PURE__ */ w.jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.012 0.024", numOctaves: "2", seed: "17", result: "liquid-noise" }),
    /* @__PURE__ */ w.jsx("feDisplacementMap", { in: "SourceGraphic", in2: "liquid-noise", scale: "7", xChannelSelector: "R", yChannelSelector: "B", result: "refracted-surface" }),
    /* @__PURE__ */ w.jsx("feColorMatrix", { in: "refracted-surface", type: "matrix", values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.04 0", result: "edge-alpha" }),
    /* @__PURE__ */ w.jsx("feGaussianBlur", { in: "edge-alpha", stdDeviation: "0.25", result: "soft-edge" }),
    /* @__PURE__ */ w.jsx("feBlend", { in: "soft-edge", in2: "refracted-surface", mode: "screen" })
  ] }) }) });
}
function sC({ scene: e }) {
  const [n, o] = C.useState(!1), [i, a] = C.useState(!1);
  return C.useEffect(() => {
    o(!1), a(!1);
  }, [e == null ? void 0 : e.id]), /* @__PURE__ */ w.jsxs("div", { className: "focus-background-wrap", "aria-hidden": "true", children: [
    /* @__PURE__ */ w.jsx(iC, {}),
    /* @__PURE__ */ w.jsx(Na, { mode: "wait", children: /* @__PURE__ */ w.jsxs(
      nn.div,
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
const aC = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), lC = (e) => e.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (n, o, i) => i ? i.toUpperCase() : o.toLowerCase()
), Ty = (e) => {
  const n = lC(e);
  return n.charAt(0).toUpperCase() + n.slice(1);
}, n0 = (...e) => e.filter((n, o, i) => !!n && n.trim() !== "" && i.indexOf(n) === o).join(" ").trim(), uC = (e) => {
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
var cC = {
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
const dC = C.forwardRef(
  ({
    color: e = "currentColor",
    size: n = 24,
    strokeWidth: o = 2,
    absoluteStrokeWidth: i,
    className: a = "",
    children: c,
    iconNode: d,
    ...f
  }, y) => C.createElement(
    "svg",
    {
      ref: y,
      ...cC,
      width: n,
      height: n,
      stroke: e,
      strokeWidth: i ? Number(o) * 24 / Number(n) : o,
      className: n0("lucide", a),
      ...!c && !uC(f) && { "aria-hidden": "true" },
      ...f
    },
    [
      ...d.map(([v, S]) => C.createElement(v, S)),
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
    ({ className: i, ...a }, c) => C.createElement(dC, {
      ref: c,
      iconNode: n,
      className: n0(
        `lucide-${aC(Ty(e))}`,
        `lucide-${e}`,
        i
      ),
      ...a
    })
  );
  return o.displayName = Ty(e), o;
};
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const fC = [
  ["circle", { cx: "12", cy: "13", r: "8", key: "3y4lt7" }],
  ["path", { d: "M5 3 2 6", key: "18tl5t" }],
  ["path", { d: "m22 6-3-3", key: "1opdir" }],
  ["path", { d: "M6.38 18.7 4 21", key: "17xu3x" }],
  ["path", { d: "M17.64 18.67 20 21", key: "kv2oe2" }],
  ["path", { d: "M12 10v6", key: "1bos4e" }],
  ["path", { d: "M9 13h6", key: "1uhe8q" }]
], pC = ke("alarm-clock-plus", fC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const hC = [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
], mC = ke("arrow-left", hC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const yC = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
], Hc = ke("arrow-right", yC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const gC = [
  ["path", { d: "M12 7v14", key: "1akyts" }],
  [
    "path",
    {
      d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
      key: "ruj8y"
    }
  ]
], vC = ke("book-open", gC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const SC = [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]], wC = ke("check", SC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const xC = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", key: "1u773s" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }]
], _C = ke("circle-help", xC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const kC = [
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
], TC = ke("coffee", kC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const AC = [
  ["rect", { width: "12", height: "12", x: "2", y: "10", rx: "2", ry: "2", key: "6agr2n" }],
  [
    "path",
    { d: "m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6", key: "1o487t" }
  ],
  ["path", { d: "M6 18h.01", key: "uhywen" }],
  ["path", { d: "M10 14h.01", key: "ssrbsk" }],
  ["path", { d: "M15 6h.01", key: "cblpky" }],
  ["path", { d: "M18 9h.01", key: "2061c0" }]
], CC = ke("dices", AC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const EC = [
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
], PC = ke("door-open", EC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const bC = [
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
], ka = ke("footprints", bC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const MC = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }],
  ["path", { d: "M12 7v5l4 2", key: "1fdv2h" }]
], Wc = ke("history", MC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const RC = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2", key: "1m3agn" }],
  ["circle", { cx: "9", cy: "9", r: "2", key: "af1f0g" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "1xmnt7" }]
], NC = ke("image", RC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const DC = [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 9.9-1", key: "1mm8w8" }]
], jC = ke("lock-open", DC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const IC = [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4", key: "fwvmzm" }]
], FC = ke("lock", IC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const OC = [
  ["path", { d: "m14 10 7-7", key: "oa77jy" }],
  ["path", { d: "M20 10h-6V4", key: "mjg0md" }],
  ["path", { d: "m3 21 7-7", key: "tjx5ai" }],
  ["path", { d: "M4 14h6v6", key: "rmj7iw" }]
], LC = ke("minimize-2", OC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const VC = [
  ["circle", { cx: "8", cy: "18", r: "4", key: "1fc0mg" }],
  ["path", { d: "M12 18V2l7 4", key: "g04rme" }]
], r0 = ke("music-2", VC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const zC = [
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
], BC = ke("notebook-pen", zC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const UC = [
  ["rect", { x: "14", y: "4", width: "4", height: "16", rx: "1", key: "zuxfzm" }],
  ["rect", { x: "6", y: "4", width: "4", height: "16", rx: "1", key: "1okwgv" }]
], Ta = ke("pause", UC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const $C = [
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
], HC = ke("piano", $C);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const WC = [["polygon", { points: "6 3 20 12 6 21 6 3", key: "1oa8hb" }]], Od = ke("play", WC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const GC = [
  ["path", { d: "M4.9 19.1C1 15.2 1 8.8 4.9 4.9", key: "1vaf9d" }],
  ["path", { d: "M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5", key: "u1ii0m" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }],
  ["path", { d: "M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5", key: "1j5fej" }],
  ["path", { d: "M19.1 4.9C23 8.8 23 15.1 19.1 19", key: "10b0cb" }]
], KC = ke("radio", GC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const YC = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
], o0 = ke("rotate-ccw", YC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const QC = [
  [
    "path",
    {
      d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
      key: "1c8476"
    }
  ],
  ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7", key: "1ydtos" }],
  ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7", key: "t51u73" }]
], XC = ke("save", QC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ZC = [
  ["path", { d: "M14 17H5", key: "gfn3mx" }],
  ["path", { d: "M19 7h-9", key: "6i9tg" }],
  ["circle", { cx: "17", cy: "17", r: "3", key: "18b49y" }],
  ["circle", { cx: "7", cy: "7", r: "3", key: "dfmy0x" }]
], Si = ke("settings-2", ZC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const qC = [
  ["polygon", { points: "5 4 15 12 5 20 5 4", key: "16p6eg" }],
  ["line", { x1: "19", x2: "19", y1: "5", y2: "19", key: "futhcm" }]
], Ld = ke("skip-forward", qC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const JC = [
  ["line", { x1: "21", x2: "14", y1: "4", y2: "4", key: "obuewd" }],
  ["line", { x1: "10", x2: "3", y1: "4", y2: "4", key: "1q6298" }],
  ["line", { x1: "21", x2: "12", y1: "12", y2: "12", key: "1iu8h1" }],
  ["line", { x1: "8", x2: "3", y1: "12", y2: "12", key: "ntss68" }],
  ["line", { x1: "21", x2: "16", y1: "20", y2: "20", key: "14d8ph" }],
  ["line", { x1: "12", x2: "3", y1: "20", y2: "20", key: "m0wm8r" }],
  ["line", { x1: "14", x2: "14", y1: "2", y2: "6", key: "14e1ph" }],
  ["line", { x1: "8", x2: "8", y1: "10", y2: "14", key: "1i6ji0" }],
  ["line", { x1: "16", x2: "16", y1: "18", y2: "22", key: "1lctlv" }]
], eE = ke("sliders-horizontal", JC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const tE = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
], nE = ke("square-check", tE);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const rE = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["circle", { cx: "12", cy: "12", r: "6", key: "1vlfrh" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }]
], oE = ke("target", rE);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const iE = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744", key: "16gr8j" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }]
], Aa = ke("users", iE);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const sE = [
  [
    "path",
    {
      d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
      key: "uqj9uw"
    }
  ],
  ["path", { d: "M16 9a5 5 0 0 1 0 6", key: "1q6k2b" }],
  ["path", { d: "M19.364 18.364a9 9 0 0 0 0-12.728", key: "ijwkga" }]
], Ia = ke("volume-2", sE);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const aE = [
  [
    "path",
    {
      d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
      key: "uqj9uw"
    }
  ],
  ["line", { x1: "22", x2: "16", y1: "9", y2: "15", key: "1ewh16" }],
  ["line", { x1: "16", x2: "22", y1: "9", y2: "15", key: "5ykzw1" }]
], lE = ke("volume-x", aE);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const uE = [
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
], i0 = ke("waves", uE);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const cE = [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
], s0 = ke("x", cE);
function dE({ onStart: e, onWorkspace: n, onHistory: o }) {
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
        /* @__PURE__ */ w.jsx("button", { type: "button", className: "focus-landing-icon", onClick: o, "aria-label": "Open Focus Trail", title: "Open Focus Trail", children: /* @__PURE__ */ w.jsx(Wc, { size: 16, "aria-hidden": "true" }) }),
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
        /* @__PURE__ */ w.jsx(Hc, { size: 17, "aria-hidden": "true" })
      ] }),
      /* @__PURE__ */ w.jsxs("div", { className: "focus-landing-secondary", "aria-label": "Synapse Focus Room shortcuts", children: [
        /* @__PURE__ */ w.jsxs("span", { children: [
          /* @__PURE__ */ w.jsx(vC, { size: 13, "aria-hidden": "true" }),
          " Synapse Study Space"
        ] }),
        /* @__PURE__ */ w.jsxs("button", { type: "button", onClick: n, children: [
          /* @__PURE__ */ w.jsx(Si, { size: 13, "aria-hidden": "true" }),
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
          /* @__PURE__ */ w.jsx("button", { type: "button", className: "focus-landing-icon", onClick: o, "aria-label": "Open Focus Trail", title: "Open Focus Trail", children: /* @__PURE__ */ w.jsx(Wc, { size: 17, "aria-hidden": "true" }) }),
          /* @__PURE__ */ w.jsx("button", { type: "button", className: "focus-landing-icon", onClick: n, "aria-label": "Open Synapse workspace", title: "Open Synapse workspace", children: /* @__PURE__ */ w.jsx(Si, { size: 17, "aria-hidden": "true" }) }),
          /* @__PURE__ */ w.jsx("button", { type: "button", className: "focus-landing-icon", onClick: e, "aria-label": "Start studying", title: "Start studying", children: /* @__PURE__ */ w.jsx(Hc, { size: 17, "aria-hidden": "true" }) })
        ] })
      ] }),
      /* @__PURE__ */ w.jsx("div", { className: "focus-landing-footer-meta", children: "Synapse Focus Room · Your materials, your pace, your space" })
    ] })
  ] });
}
const Ay = (e) => {
  let n;
  const o = /* @__PURE__ */ new Set(), i = (v, S) => {
    const l = typeof v == "function" ? v(n) : v;
    if (!Object.is(l, n)) {
      const h = n;
      n = S ?? (typeof l != "object" || l === null) ? l : Object.assign({}, n, l), o.forEach((g) => g(n, h));
    }
  }, a = () => n, f = { setState: i, getState: a, getInitialState: () => y, subscribe: (v) => (o.add(v), () => o.delete(v)) }, y = n = e(i, a, f);
  return f;
}, fE = ((e) => e ? Ay(e) : Ay), pE = (e) => e;
function hE(e, n = pE) {
  const o = yn.useSyncExternalStore(
    e.subscribe,
    yn.useCallback(() => n(e.getState()), [e, n]),
    yn.useCallback(() => n(e.getInitialState()), [e, n])
  );
  return yn.useDebugValue(o), o;
}
const Cy = (e) => {
  const n = fE(e), o = (i) => hE(n, i);
  return Object.assign(o, n), o;
}, mE = ((e) => e ? Cy(e) : Cy), Vd = Object.freeze({
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
function yE() {
  return gn[0] || Wn(Vc);
}
function gE(e) {
  const n = String(e || "");
  if (!n) return null;
  const i = qv(Wv()).materials[n];
  return i && typeof i == "object" ? i : null;
}
function pn(e) {
  var i;
  const n = String(e.selectedMaterialId || ((i = e.selectedMaterial) == null ? void 0 : i.materialId) || "");
  if (!n) return;
  const o = qv(Wv());
  o.materials[n] = {
    materialId: n,
    selectedScene: e.selectedScene,
    musicType: e.musicType,
    ambientSound: e.ambientSound,
    musicVolume: yr(e.musicVolume),
    ambientVolume: yr(e.ambientVolume),
    audioChannels: { ...Vd, ...e.audioChannels || {} },
    durationMinutes: vi(e.pomodoroDuration),
    studyGoal: e.studyGoal,
    studyPlan: Zv(e.studyPlan),
    completedTasks: Array.isArray(e.completedTasks) ? e.completedTasks.filter(Boolean) : [],
    workspaceNotes: String(e.workspaceNotes || ""),
    workspaceUpdatedAt: e.workspaceUpdatedAt || "",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }, HA(o);
}
function vE(e) {
  return Array.isArray(e == null ? void 0 : e.completedTasks) ? e.completedTasks.map((n) => String(n || "").trim()).filter(Boolean) : [];
}
function Gc(e = {}) {
  return {
    sectionTitle: String(e.sectionTitle || "").trim(),
    excerpt: String(e.excerpt || "").trim().slice(0, 1800)
  };
}
function a0(e = null) {
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
  return ro(e.timerState || e.timerPhase || e.status || e.timerStatus);
}
function Bn(e = {}) {
  if (e.timerMode === "countup") return 0;
  const n = Number(e.timerDurationSeconds);
  return Number.isFinite(n) && n > 0 ? n : Zt(e.pomodoroDuration);
}
function ci(e = {}, n = ht()) {
  const o = Math.max(0, Number(e.elapsedSeconds) || 0);
  if (Ut(e) !== "running") return o;
  const i = Number(e.timerAnchorAtMs);
  return !Number.isFinite(i) || i <= 0 ? o : Math.max(o, Math.floor(Math.max(0, n - i) / 1e3));
}
function Bt(e, n = ht()) {
  const o = ro(e);
  return {
    timerState: o,
    timerPhase: o,
    status: o,
    timerStatus: Nd(o),
    timerUpdatedAtMs: n
  };
}
function SE(e = {}) {
  const n = Ut(e);
  return {
    timerState: n,
    timerPhase: n,
    status: n,
    timerStatus: Nd(n),
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
  return !n || e.view !== "session" ? !1 : Dd(n, SE(e));
}
function Ey(e, n = ht()) {
  const o = ci(e, n), i = Bn(e), a = e.timerMode !== "countup" && i > 0 && o >= i, c = a ? "completed" : Ut(e);
  return {
    ...Bt(c, n),
    elapsedSeconds: a ? i : o,
    timerAnchorAtMs: c === "running" ? e.timerAnchorAtMs : null,
    timerPausedAtMs: c === "running" ? null : e.timerPausedAtMs || n,
    audioPlaying: c === "running" ? e.audioPlaying : !1
  };
}
function wE(e, n = {}) {
  const o = Wn(n.selectedScene), i = gE(e == null ? void 0 : e.materialId), a = Id(i == null ? void 0 : i.selectedScene) ? i.selectedScene : o.id, c = Wn(a), d = String((i == null ? void 0 : i.musicType) || c.musicType || "Deep Focus"), f = String((i == null ? void 0 : i.ambientSound) || c.ambientSound || "Nature"), y = yr(i == null ? void 0 : i.musicVolume, n.musicVolume ?? 60), v = yr(i == null ? void 0 : i.ambientVolume, n.ambientVolume ?? 50), S = vi(i == null ? void 0 : i.durationMinutes, n.pomodoroDuration ?? qr), l = String((i == null ? void 0 : i.studyGoal) || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`), h = Zv(i == null ? void 0 : i.studyPlan), g = h.length ? h : Bc(e, l, S), x = vE(i), k = String((i == null ? void 0 : i.workspaceNotes) || ""), T = (i == null ? void 0 : i.workspaceUpdatedAt) || (i == null ? void 0 : i.updatedAt) || "";
  return {
    selectedScene: a,
    musicType: d,
    ambientSound: f,
    musicVolume: y,
    ambientVolume: v,
    audioChannels: { ...Vd, ...(i == null ? void 0 : i.audioChannels) || n.audioChannels || {} },
    pomodoroDuration: S,
    studyGoal: l,
    studyPlan: g,
    completedTasks: x,
    workspaceNotes: k,
    workspaceUpdatedAt: T
  };
}
function xE(e) {
  const n = GA(e);
  if (!n || typeof n != "object") return null;
  const o = Ut(n), i = ht(), a = Number(n.timerAnchorAtMs), c = Date.parse(n.startedAt || ""), d = Number.isFinite(c) ? c : NaN, f = o === "running" ? ci({
    ...n,
    timerState: "running",
    timerAnchorAtMs: Number.isFinite(a) && a > 0 ? a : d
  }, i) : Math.max(0, Number(n.elapsedSeconds) || 0), y = Bn(n), v = o === "running" ? y > 0 && f >= y ? "completed" : "paused" : o, S = o === "running";
  return {
    route: n.view === "session" ? "session" : "setup",
    view: n.view === "session" ? "session" : "setup",
    ...Bt(S ? "restoring" : v, i),
    timerRestoreTarget: S ? v : null,
    timerMode: n.timerMode === "countup" ? "countup" : "countdown",
    timerAnchorAtMs: null,
    timerPausedAtMs: S ? null : Number(n.timerPausedAtMs) || null,
    timerRestoredAtMs: S ? null : i,
    timerDurationSeconds: y,
    elapsedSeconds: y > 0 ? Math.min(y, f) : f,
    startedAt: n.startedAt || null,
    currentSession: n.currentSession || null,
    completedTasks: Array.isArray(n.completedTasks) ? n.completedTasks.filter(Boolean) : [],
    flashcardIndex: Math.max(0, Number(n.flashcardIndex) || 0),
    flashcardSide: n.flashcardSide === "back" ? "back" : "front",
    flashcardProgress: n.flashcardProgress && typeof n.flashcardProgress == "object" && !Array.isArray(n.flashcardProgress) ? n.flashcardProgress : {},
    quizAnswers: n.quizAnswers && typeof n.quizAnswers == "object" && !Array.isArray(n.quizAnswers) ? n.quizAnswers : {},
    quizChecked: n.quizChecked && typeof n.quizChecked == "object" && !Array.isArray(n.quizChecked) ? n.quizChecked : {},
    chatMessages: oi(n.chatMessages),
    chatPending: !1,
    chatError: "",
    panelTab: zc.has(n.panelTab) ? n.panelTab : "materials",
    workspaceNotes: String(n.workspaceNotes || ""),
    workspaceUpdatedAt: n.workspaceUpdatedAt || n.updatedAt || "",
    activeNoteSection: String(n.activeNoteSection || ""),
    activeSourceHighlight: a0(n.activeSourceHighlight),
    assistantContext: Gc(n.assistantContext),
    audioPlaying: !1
  };
}
function $s() {
  return {
    completedTasks: [],
    flashcardIndex: 0,
    flashcardSide: "front",
    flashcardProgress: {},
    quizAnswers: {},
    quizChecked: {}
  };
}
function _E(e) {
  return Object.values(e.flashcardProgress || {}).filter((n) => n && n.difficulty).length;
}
function kE(e) {
  const n = Object.values(e.quizChecked || {}).filter((i) => i && i.hasKnownAnswer);
  if (!n.length) return null;
  const o = n.filter((i) => i.correct).length;
  return Math.round(o / n.length * 100);
}
function TE(e) {
  const n = Uc(e.selectedMaterial);
  return Object.entries(e.quizChecked || {}).filter(([, o]) => o && o.hasKnownAnswer && !o.correct).map(([o]) => eC(n[Number(o)], Number(o))).filter(Boolean);
}
async function AE(e, n, o, i = {}) {
  var d, f;
  if (!globalThis.apiClient || typeof globalThis.apiClient.fetch != "function")
    return {
      answer: t0(e, o, $.getState().studyGoal),
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
const $ = mE((e, n) => {
  const o = yE();
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
    audioChannels: { ...Vd },
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
    timerDurationSeconds: Zt(qr),
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
      const d = n(), f = !!a, y = f ? a.materialId : String(i.materialId || "");
      if (!f) {
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
      const v = d.selectedMaterialId === y, S = v && c ? null : xE(y), l = v && c ? {} : wE(a, d), h = v && c ? {} : {
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
        timerDurationSeconds: Zt(l.pomodoroDuration || qr),
        elapsedSeconds: 0,
        startedAt: null,
        currentSession: null,
        ...$s(),
        chatMessages: [],
        chatPending: !1,
        chatError: "",
        activeNoteSection: "",
        activeSourceHighlight: null,
        assistantContext: { sectionTitle: "", excerpt: "" }
      }, g = v && c ? d.view === "session" ? "session" : "setup" : (S == null ? void 0 : S.view) === "session" ? "session" : "setup";
      if (e({
        ...l,
        ...h,
        ...S,
        route: g,
        view: g,
        selectedMaterialId: y,
        selectedMaterial: a,
        aiPanelOpen: !1,
        activeDrawer: "",
        summaryRecord: null
      }), (S == null ? void 0 : S.timerState) === "restoring") {
        const x = S.timerRestoreTarget || "paused";
        Promise.resolve().then(() => {
          const k = n();
          if (k.selectedMaterialId !== y || k.timerState !== "restoring") return;
          const T = ht(), A = Bn(k), R = A > 0 ? Math.min(A, Math.max(0, Number(k.elapsedSeconds) || 0)) : Math.max(0, Number(k.elapsedSeconds) || 0), b = {
            ...Bt(x, T),
            timerRestoreTarget: null,
            timerAnchorAtMs: null,
            timerPausedAtMs: x === "paused" ? T : null,
            timerRestoredAtMs: T,
            elapsedSeconds: R,
            audioPlaying: !1
          };
          e(b), hn({ ...k, ...b });
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
        sessionHistory: Lc()
      });
    },
    selectScene(i) {
      const a = Id(i);
      a && e((c) => {
        const d = {
          selectedScene: a.id,
          musicType: a.musicType || c.musicType,
          ambientSound: a.ambientSound || c.ambientSound
        }, f = { ...c, ...d };
        return pn(f), d;
      });
    },
    setPomodoroDuration(i) {
      e((a) => {
        const c = vi(i, a.pomodoroDuration), d = a.selectedMaterial ? Bc(a.selectedMaterial, a.studyGoal, c) : [], f = {
          pomodoroDuration: c,
          studyPlan: d,
          timerDurationSeconds: a.timerMode === "countup" ? 0 : Zt(c)
        };
        return pn({ ...a, ...f }), f;
      });
    },
    setSessionDuration(i, a = 0) {
      e((c) => {
        const d = Math.max(0, Number.parseInt(i, 10) || 0), f = Math.min(59, Math.max(0, Number.parseInt(a, 10) || 0)), y = d * 60 + f, v = Zt(Xv), S = Zt(wa), l = c.timerMode === "countup" ? 0 : Math.min(S, Math.max(v, y || Zt(c.pomodoroDuration))), h = c.timerMode === "countup" ? vi(i, c.pomodoroDuration) : Math.floor(l / 60), g = ht(), x = Ut(c), k = ci(c, g), T = c.timerMode === "countup" ? k : Math.min(k, l), A = x === "completed" ? "paused" : x, R = {
          pomodoroDuration: h,
          timerDurationSeconds: l,
          elapsedSeconds: T,
          ...Bt(A, g),
          timerAnchorAtMs: A === "running" ? g - T * 1e3 : null,
          timerPausedAtMs: A === "paused" ? g : null
        };
        return pn({ ...c, ...R }), hn({ ...c, ...R }), R;
      });
    },
    setStudyGoal(i) {
      e((a) => {
        const c = String(i ?? ""), d = a.selectedMaterial ? Bc(a.selectedMaterial, c, a.pomodoroDuration) : [], f = { studyGoal: c, studyPlan: d };
        return pn({ ...a, ...f }), f;
      });
    },
    setSound(i, a) {
      e((c) => {
        var f;
        let d = {};
        if (i === "musicVolume" && (d = { musicVolume: yr(a, c.musicVolume) }), i === "ambientVolume" && (d = { ambientVolume: yr(a, c.ambientVolume) }), i === "musicType" && (d = { musicType: String(a || c.musicType) }), i === "ambientSound" && (d = { ambientSound: String(a || c.ambientSound) }), String(i).startsWith("audioChannel:")) {
          const y = String(i).slice(13);
          d = { audioChannels: { ...c.audioChannels, [y]: yr(a, ((f = c.audioChannels) == null ? void 0 : f[y]) ?? 0) } };
        }
        return pn({ ...c, ...d }), d;
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
      const a = zc.has(String(i || "")) ? String(i) : "materials";
      e({
        panelTab: a,
        aiPanelOpen: !0,
        activeDrawer: ""
      });
    },
    selectSourceHighlight(i = null, { openPanel: a = !0 } = {}) {
      const c = a0(i);
      e({
        activeSourceHighlight: c,
        activeNoteSection: (c == null ? void 0 : c.sectionTitle) || n().activeNoteSection || "",
        assistantContext: c ? Gc({
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
        panelTab: zc.has(a) ? a : "materials",
        aiPanelOpen: !0,
        activeDrawer: ""
      });
    },
    startSession() {
      const i = n();
      pn(i), e({
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
        timerDurationSeconds: Zt(i.pomodoroDuration),
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
        ...$s(),
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
      const d = Bn(i), f = c === "completed" || c === "break" || d > 0 && i.elapsedSeconds >= d, y = f ? 0 : Math.max(0, Number(i.elapsedSeconds) || 0), v = {
        view: "session",
        route: "session",
        ...Bt("running", a),
        audioPlaying: !0,
        summaryRecord: null,
        elapsedSeconds: y,
        startedAt: !i.startedAt || f ? new Date(a).toISOString() : i.startedAt,
        timerAnchorAtMs: a - y * 1e3,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        timerDurationSeconds: d,
        ...f ? $s() : {}
      };
      e(v), hn({ ...i, ...v });
    },
    pauseTimer({ pauseAudio: i = !0 } = {}) {
      const a = n(), c = ht();
      if (Ut(a) !== "running") {
        i && a.audioPlaying && e({ audioPlaying: !1 });
        return;
      }
      const d = Ey(a, c), f = {
        ...d,
        ...Bt(d.timerState === "completed" ? "completed" : "paused", c),
        timerAnchorAtMs: null,
        timerPausedAtMs: c,
        audioPlaying: i ? !1 : a.audioPlaying
      };
      e(f), hn({ ...a, ...f });
    },
    resetTimer() {
      const i = ht(), a = {
        ...Bt("idle", i),
        timerRestoreTarget: null,
        timerMode: "countdown",
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerDurationSeconds: Zt(n().pomodoroDuration),
        audioPlaying: !1,
        startedAt: null,
        elapsedSeconds: 0,
        summaryRecord: null,
        ...$s()
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
      const a = ht(), c = Bn(i), d = c ? Math.min(c, ci(i, a)) : ci(i, a), f = c > 0 && d >= c ? "completed" : "running", y = {
        ...Bt(f, a),
        elapsedSeconds: d,
        timerAnchorAtMs: f === "running" ? i.timerAnchorAtMs : null,
        timerPausedAtMs: f === "running" ? null : a,
        timerDurationSeconds: c,
        audioPlaying: f === "running" ? i.audioPlaying : !1
      };
      d === i.elapsedSeconds && f === Ut(i) || (e(y), hn({ ...i, ...y }));
    },
    setTimerMode(i = "countdown") {
      const a = i === "countup" ? "countup" : "countdown", c = {
        timerMode: a,
        timerDurationSeconds: a === "countup" ? 0 : Zt(n().pomodoroDuration)
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
      const i = n(), a = ht(), c = new Date(a).toISOString(), d = Ut(i) === "running" ? Ey(i, a) : i, f = Bn(d), y = f ? Math.min(f, d.elapsedSeconds) : d.elapsedSeconds, v = KA({
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
      Qv("focus-room"), e({
        summaryRecord: v,
        sessionHistory: Lc(),
        ...Bt("completed", a),
        audioPlaying: !1,
        timerAnchorAtMs: null,
        timerPausedAtMs: a,
        timerDurationSeconds: f,
        elapsedSeconds: f ? Math.min(f, d.elapsedSeconds) : d.elapsedSeconds,
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
        return pn({ ...a, ...c }), c;
      });
    },
    setAssistantContext(i = {}) {
      e({ assistantContext: Gc(i) });
    },
    toggleTask(i) {
      e((a) => {
        const c = a.studyPlan[Number(i)];
        if (!c) return {};
        const d = String(c.task || ""), f = a.completedTasks.includes(d) ? a.completedTasks.filter((y) => y !== d) : [...a.completedTasks, d];
        return pn({ ...a, completedTasks: f }), { completedTasks: f };
      });
    },
    updatePlanTask(i, a = null, c = null) {
      e((d) => {
        const f = Number(i), y = d.studyPlan[f];
        if (!y) return {};
        const v = String(y.task || ""), S = c == null ? v : String(c || "").trim(), l = a == null ? y.minutes : Jr(a, y.minutes, 1, wa), h = d.studyPlan.map((k, T) => T === f ? { minutes: l, task: S || v } : k);
        let g = d.completedTasks;
        v && v !== h[f].task && g.includes(v) && (g = g.filter((k) => k !== v).concat(h[f].task));
        const x = { studyPlan: h, completedTasks: g };
        return pn({ ...d, ...x }), x;
      });
    },
    setFlashcardIndex(i) {
      const a = ky(n().selectedMaterial);
      e({
        flashcardIndex: Jr(i, n().flashcardIndex, 0, Math.max(0, a.length - 1)),
        flashcardSide: "front"
      });
    },
    flipFlashcard() {
      e((i) => ({
        flashcardSide: i.flashcardSide === "back" ? "front" : "back"
      }));
    },
    rateFlashcard(i) {
      const a = n(), c = ky(a.selectedMaterial);
      if (!c.length) return;
      const d = Jr(a.flashcardIndex, 0, 0, c.length - 1), f = c[d], y = ["easy", "medium", "hard"].includes(String(i)) ? String(i) : "medium";
      e({
        flashcardProgress: {
          ...a.flashcardProgress,
          [qA(f, d)]: {
            difficulty: y,
            reviewedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        },
        flashcardSide: "front",
        flashcardIndex: d < c.length - 1 ? d + 1 : d
      });
    },
    answerQuizQuestion(i, a) {
      const c = Number(i), d = Uc(n().selectedMaterial)[c];
      if (!d) return;
      const f = String(c);
      e((y) => ({
        quizAnswers: {
          ...y.quizAnswers,
          [f]: rC(d, a, y.quizAnswers[f])
        }
      }));
    },
    checkQuizQuestion(i) {
      const a = Uc(n().selectedMaterial), c = Number(i), d = a[c];
      if (!d) return;
      const f = String(c), y = n(), v = Object.prototype.hasOwnProperty.call(y.quizAnswers, f) ? y.quizAnswers[f] : "", S = oC(d, v), l = e0(d);
      e({
        quizChecked: {
          ...y.quizChecked,
          [f]: {
            answer: v,
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
      const c = n(), d = c.selectedMaterial, f = oi(c.chatMessages).slice(-10).map((y) => ({
        role: y.role === "user" ? "user" : "assistant",
        content: y.text
      }));
      e({
        chatMessages: oi([
          ...c.chatMessages,
          { role: "user", text: a, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
        ]),
        chatPending: !0,
        chatError: ""
      });
      try {
        const y = await AE(a, f, d, c.assistantContext);
        e((v) => ({
          chatMessages: oi([
            ...v.chatMessages,
            { role: "assistant", text: y.answer, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: y.offline ? "Using a local Focus Room reply because the AI tutor service is not connected." : ""
        }));
      } catch (y) {
        e((v) => ({
          chatMessages: oi([
            ...v.chatMessages,
            { role: "assistant", text: t0(a, d, n().studyGoal), createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: `AI tutor unavailable: ${y.message || "request failed"}`
        }));
      } finally {
        e({ chatPending: !1 });
      }
    },
    focusFlashcardsCompletedCount() {
      return _E(n());
    },
    focusQuizScore() {
      return kE(n());
    },
    focusQuizMistakes() {
      return TE(n());
    },
    formatFocusedTime() {
      return jd(n().elapsedSeconds);
    }
  };
});
function CE({ scene: e, active: n, onSelect: o, variant: i = "default" }) {
  return i === "gallery" ? /* @__PURE__ */ w.jsxs(
    nn.button,
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
    nn.button,
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
function zd({ variant: e = "default" }) {
  const n = $((a) => a.selectedScene), o = $((a) => a.selectScene), i = e === "gallery" ? VA : gn.filter((a) => !a.galleryOnly);
  return /* @__PURE__ */ w.jsx("div", { className: `scene-selector scene-selector-${e}`.trim(), "aria-label": "Study scenes", children: i.map((a) => /* @__PURE__ */ w.jsx(CE, { scene: a, active: a.id === n, onSelect: o, variant: e }, a.id)) });
}
const EE = [
  { label: "Piano", icon: HC, musicType: "Piano", ambientSound: "Nature" },
  { label: "Lo-fi", icon: r0, musicType: "Lo-fi", ambientSound: "Cafe Rain" },
  { label: "Nature", icon: i0, musicType: "Deep Focus", ambientSound: "Nature" },
  { label: "Ambient", icon: TC, musicType: "Minimal", ambientSound: "White Noise" },
  { label: "Deep Focus", icon: KC, musicType: "Deep Focus", ambientSound: "White Noise" }
];
function PE() {
  const e = $((g) => g.pomodoroDuration), n = $((g) => g.timerMode), o = $((g) => g.studyGoal), i = $((g) => g.setPomodoroDuration), a = $((g) => g.setTimerMode), c = $((g) => g.setStudyGoal), d = $((g) => g.setSound), f = $((g) => g.openLanding), y = $((g) => g.startSession), [v, S] = C.useState(!1), l = (g) => {
    d("musicType", g.musicType), d("ambientSound", g.ambientSound);
  }, h = (g) => {
    a("countdown"), i(g);
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
        /* @__PURE__ */ w.jsx("button", { type: "button", className: "innook-header-action", "aria-label": "Focus Room history", title: "Focus Room history", children: /* @__PURE__ */ w.jsx(Wc, { size: 18, "aria-hidden": "true" }) }),
        /* @__PURE__ */ w.jsx("button", { type: "button", className: "innook-header-action", onClick: f, "aria-label": "Back to Focus Room welcome", title: "Back to Focus Room welcome", children: /* @__PURE__ */ w.jsx(mC, { size: 20, "aria-hidden": "true" }) })
      ] })
    ] }),
    /* @__PURE__ */ w.jsxs("div", { className: "innook-setup-layout", children: [
      /* @__PURE__ */ w.jsxs("section", { className: "innook-scene-panel", "aria-labelledby": "innook-scene-title", children: [
        /* @__PURE__ */ w.jsxs("div", { className: "innook-panel-heading", children: [
          /* @__PURE__ */ w.jsx("span", { children: "Step 01" }),
          /* @__PURE__ */ w.jsx("h1", { id: "innook-scene-title", children: "选择学习场景" })
        ] }),
        /* @__PURE__ */ w.jsx(zd, { variant: "gallery" })
      ] }),
      /* @__PURE__ */ w.jsxs("aside", { className: "innook-control-rail", "aria-label": "Study settings", children: [
        /* @__PURE__ */ w.jsx("div", { className: "innook-rail-group", "aria-label": "Music atmosphere", children: EE.map((g) => {
          const x = g.icon;
          return /* @__PURE__ */ w.jsx("button", { type: "button", className: "innook-rail-icon", onClick: () => l(g), "aria-label": `Use ${g.label} atmosphere`, title: g.label, children: /* @__PURE__ */ w.jsx(x, { size: 16, "aria-hidden": "true" }) }, g.label);
        }) }),
        /* @__PURE__ */ w.jsx("div", { className: "innook-rail-divider" }),
        /* @__PURE__ */ w.jsxs("div", { className: "innook-duration-list", "aria-label": "Focus duration", children: [
          $v.map((g) => /* @__PURE__ */ w.jsx("button", { type: "button", className: `innook-duration ${n !== "countup" && g === e ? "is-active" : ""}`.trim(), onClick: () => h(g), "aria-pressed": n !== "countup" && g === e, children: g }, g)),
          /* @__PURE__ */ w.jsx("button", { type: "button", className: `innook-duration innook-duration-infinity ${n === "countup" ? "is-active" : ""}`.trim(), onClick: () => a("countup"), "aria-label": "Count up timer", "aria-pressed": n === "countup", children: "∞" })
        ] }),
        /* @__PURE__ */ w.jsx("div", { className: "innook-rail-divider" }),
        /* @__PURE__ */ w.jsx("button", { type: "button", className: `innook-rail-icon ${v ? "is-active" : ""}`.trim(), onClick: () => S((g) => !g), "aria-label": "Edit focus intention", title: "Edit focus intention", children: /* @__PURE__ */ w.jsx(oE, { size: 16, "aria-hidden": "true" }) }),
        /* @__PURE__ */ w.jsx("button", { type: "button", className: "innook-enter-button", onClick: y, "aria-label": "Enter Focus Room", title: "Enter Focus Room", children: /* @__PURE__ */ w.jsx(Hc, { size: 22, "aria-hidden": "true" }) }),
        v ? /* @__PURE__ */ w.jsxs("label", { className: "innook-goal-popover", children: [
          "今日目标",
          /* @__PURE__ */ w.jsx("textarea", { value: o, onChange: (g) => c(g.target.value), autoFocus: !0 })
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
  return /* @__PURE__ */ w.jsx(
    "button",
    {
      className: `glass-button glass-button-${o} ${n}`.trim(),
      type: i,
      onPointerMove: (y) => {
        const v = y.currentTarget.getBoundingClientRect();
        y.currentTarget.style.setProperty("--glass-x", `${Math.max(0, Math.min(100, (y.clientX - v.left) / v.width * 100))}%`), y.currentTarget.style.setProperty("--glass-y", `${Math.max(0, Math.min(100, (y.clientY - v.top) / v.height * 100))}%`), c == null || c(y);
      },
      onPointerLeave: (y) => {
        y.currentTarget.style.setProperty("--glass-x", "50%"), y.currentTarget.style.setProperty("--glass-y", "0%"), d == null || d(y);
      },
      ...f,
      children: e
    }
  );
}
function bE(e) {
  return e === "paused" ? "Resume" : e === "completed" ? "Restart" : "Start";
}
function ME() {
  const e = $((D) => D.elapsedSeconds), n = $((D) => D.pomodoroDuration), o = $((D) => D.timerDurationSeconds), i = $((D) => D.timerStatus), a = $((D) => D.isIdle), c = $((D) => D.studyGoal), d = $((D) => D.selectedScene), f = $((D) => D.musicType), y = $((D) => D.ambientSound), v = $((D) => D.startTimer), S = $((D) => D.pauseTimer), l = $((D) => D.resetTimer), h = $((D) => D.skipTimer), g = i === "studying", x = Number(o) || n * 60, k = Math.max(0, x - e), T = x ? Math.min(100, Math.max(0, e / x * 100)) : 0, A = a ? 0.96 : 1, R = i === "studying" ? { scale: [A, A + 0.012, A] } : { scale: A }, b = Wn(d);
  return /* @__PURE__ */ w.jsxs(
    nn.article,
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
            /* @__PURE__ */ w.jsx("p", { children: b.name })
          ] }),
          /* @__PURE__ */ w.jsxs("div", { className: "timer-pill-row", children: [
            /* @__PURE__ */ w.jsxs("span", { className: "focus-pill", children: [
              f,
              " / ",
              y
            ] }),
            /* @__PURE__ */ w.jsx("span", { className: "focus-pill", children: "Quiet room" })
          ] })
        ] }),
        /* @__PURE__ */ w.jsx("div", { className: "timer-value", "aria-live": "polite", children: ui(k) }),
        /* @__PURE__ */ w.jsxs("div", { className: "timer-meta-grid", children: [
          /* @__PURE__ */ w.jsxs("div", { className: "timer-meta-card", children: [
            /* @__PURE__ */ w.jsx("span", { children: "Focused" }),
            /* @__PURE__ */ w.jsx("strong", { children: jd(e) })
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
            /* @__PURE__ */ w.jsx("strong", { children: b.name })
          ] })
        ] }),
        /* @__PURE__ */ w.jsx("div", { className: "focus-progress-track", "aria-label": "Focus progress", children: /* @__PURE__ */ w.jsx("div", { className: "focus-progress-fill", style: { width: `${T.toFixed(1)}%` } }) }),
        /* @__PURE__ */ w.jsxs("div", { className: "timer-actions", children: [
          /* @__PURE__ */ w.jsxs(be, { variant: i === "studying" ? "primary" : "ghost", onClick: v, children: [
            /* @__PURE__ */ w.jsx(Od, { size: 16, "aria-hidden": "true" }),
            " ",
            bE(i)
          ] }),
          /* @__PURE__ */ w.jsxs(be, { onClick: () => S(), disabled: !g, "aria-label": g ? "Pause timer" : "Pause timer unavailable", children: [
            /* @__PURE__ */ w.jsx(Ta, { size: 16, "aria-hidden": "true" }),
            " Pause"
          ] }),
          /* @__PURE__ */ w.jsxs(be, { onClick: l, children: [
            /* @__PURE__ */ w.jsx(o0, { size: 16, "aria-hidden": "true" }),
            " Reset"
          ] }),
          /* @__PURE__ */ w.jsxs(be, { onClick: h, children: [
            /* @__PURE__ */ w.jsx(Ld, { size: 16, "aria-hidden": "true" }),
            " Skip"
          ] })
        ] })
      ]
    }
  );
}
function RE() {
  return /* @__PURE__ */ w.jsx(ME, {});
}
function NE({ onWorkspace: e, onOpenTrail: n, onOpenCompanion: o, onOpenSettings: i, onExit: a }) {
  const c = $((f) => f.selectedScene), d = Wn(c);
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
      /* @__PURE__ */ w.jsxs(be, { className: "header-icon-button", onClick: n, title: "Open Focus Trail", "aria-label": "Open Focus Trail", children: [
        /* @__PURE__ */ w.jsx(ka, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Focus Trail" })
      ] }),
      /* @__PURE__ */ w.jsxs(be, { className: "header-icon-button", onClick: o, title: "Open Companion Room", "aria-label": "Open Companion Room", children: [
        /* @__PURE__ */ w.jsx(Aa, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Companion" })
      ] }),
      /* @__PURE__ */ w.jsxs(be, { className: "header-icon-button", onClick: i, title: "Open room settings", "aria-label": "Open room settings", children: [
        /* @__PURE__ */ w.jsx(Si, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Settings" })
      ] }),
      /* @__PURE__ */ w.jsxs(be, { className: "header-icon-button header-exit-button", onClick: a, title: "Exit Focus Room", "aria-label": "Exit Focus Room", children: [
        /* @__PURE__ */ w.jsx(PC, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Exit" })
      ] })
    ] })
  ] });
}
function DE({ onFocusMode: e, audioState: n }) {
  const o = $((E) => E.timerStatus), i = $((E) => E.elapsedSeconds), a = $((E) => E.pomodoroDuration), c = $((E) => E.timerDurationSeconds), d = $((E) => E.timerMode), f = $((E) => E.studyGoal), y = $((E) => E.currentSession), v = $((E) => E.startTimer), S = $((E) => E.pauseTimer), l = $((E) => E.resetTimer), h = $((E) => E.skipTimer), g = $((E) => E.setSessionDuration), x = $((E) => E.toggleAudio), k = $((E) => E.audioPlaying), T = $((E) => E.setStudyGoal), [A, R] = C.useState(!1), [b, D] = C.useState("25:00"), [L, X] = C.useState(!1), [Z, U] = C.useState(""), G = d === "countup" ? 0 : Number(c) || (Number(a) || 0) * 60, Q = d === "countup" ? i : Math.max(0, G - i), J = o === "paused", ce = o === "studying", ye = o === "completed", he = ye && d !== "countup" ? "00:00" : ui(Q), we = J ? "Paused" : ye ? "Complete" : "In focus", ue = J ? "Resume timer" : ce ? "Pause timer" : "Start timer", ge = () => {
    D(he), R(!0);
  }, V = () => {
    const [E = "", O = "0"] = String(b).split(":");
    g(E, O), R(!1);
  }, q = () => {
    U(f || ""), X(!0);
  }, K = () => {
    const E = Z.trim();
    E && T(E), X(!1);
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
          value: b,
          "aria-label": "Focus duration in minutes and seconds",
          onChange: (E) => D(E.target.value.replace(/[^0-9:]/g, "")),
          onFocus: (E) => E.currentTarget.select(),
          onKeyDown: (E) => {
            E.key === "Enter" && (E.preventDefault(), V()), E.key === "Escape" && (E.preventDefault(), E.currentTarget.dataset.cancel = "true", R(!1));
          },
          onBlur: (E) => {
            E.currentTarget.dataset.cancel !== "true" && V();
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
          onChange: (E) => U(E.target.value),
          onFocus: (E) => E.currentTarget.select(),
          onKeyDown: (E) => {
            E.key === "Enter" && (E.preventDefault(), K()), E.key === "Escape" && (E.preventDefault(), E.currentTarget.dataset.cancel = "true", X(!1));
          },
          onBlur: (E) => {
            E.currentTarget.dataset.cancel !== "true" && K();
          }
        }
      ) : /* @__PURE__ */ w.jsx(
        "button",
        {
          type: "button",
          className: "dock-goal-edit",
          onClick: q,
          "aria-label": `Edit today's goal, currently ${f || "a quiet block for meaningful progress"}`,
          title: "Click to edit today's goal",
          children: /* @__PURE__ */ w.jsx("strong", { children: f || "A quiet block for meaningful progress" })
        }
      ),
      /* @__PURE__ */ w.jsxs("span", { className: "dock-goal-meta", children: [
        d === "countup" ? "Count-up" : `${ui(G)} session`,
        " · ",
        ui(i),
        " focused"
      ] })
    ] }),
    /* @__PURE__ */ w.jsxs("div", { className: "dock-action-block", children: [
      /* @__PURE__ */ w.jsxs(be, { className: "dock-action-button", onClick: x, "aria-label": k ? "Pause room audio" : "Play room audio", children: [
        k ? /* @__PURE__ */ w.jsx(Ta, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(Ia, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: n != null && n.playing ? "Pause audio" : "Audio" })
      ] }),
      /* @__PURE__ */ w.jsxs(be, { className: "dock-action-button", onClick: () => ce ? S() : v(), variant: "primary", "aria-label": ue, children: [
        ce ? /* @__PURE__ */ w.jsx(Ta, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(Od, { size: 15, fill: "currentColor", "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: J ? "Resume" : ce ? "Pause" : "Start" })
      ] }),
      /* @__PURE__ */ w.jsxs(be, { className: "dock-action-button", onClick: h, "aria-label": "Skip timer", children: [
        /* @__PURE__ */ w.jsx(Ld, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Skip" })
      ] }),
      /* @__PURE__ */ w.jsxs(be, { className: "dock-action-button", onClick: l, "aria-label": "Reset timer", children: [
        /* @__PURE__ */ w.jsx(o0, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Reset" })
      ] }),
      /* @__PURE__ */ w.jsxs(be, { className: "dock-focus-mode", onClick: e, "aria-label": "Enter distraction-free Focus Mode", children: [
        /* @__PURE__ */ w.jsx(eE, { size: 15, "aria-hidden": "true" }),
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
function jE(...e) {
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
  return C.useCallback(jE(...e), e);
}
function Bd(e, n = []) {
  let o = [];
  function i(c, d) {
    const f = C.createContext(d);
    f.displayName = c + "Context";
    const y = o.length;
    o = [...o, d];
    const v = (l) => {
      var A;
      const { scope: h, children: g, ...x } = l, k = ((A = h == null ? void 0 : h[e]) == null ? void 0 : A[y]) || f, T = C.useMemo(() => x, Object.values(x));
      return /* @__PURE__ */ w.jsx(k.Provider, { value: T, children: g });
    };
    v.displayName = c + "Provider";
    function S(l, h, g = {}) {
      var A;
      const { optional: x = !1 } = g, k = ((A = h == null ? void 0 : h[e]) == null ? void 0 : A[y]) || f, T = C.useContext(k);
      if (T) return T;
      if (d !== void 0) return d;
      if (!x)
        throw new Error(`\`${l}\` must be used within \`${c}\``);
    }
    return [v, S];
  }
  const a = () => {
    const c = o.map((d) => C.createContext(d));
    return function(f) {
      const y = (f == null ? void 0 : f[e]) || c;
      return C.useMemo(
        () => ({ [`__scope${e}`]: { ...f, [e]: y } }),
        [f, y]
      );
    };
  };
  return a.scopeName = e, [i, IE(a, ...n)];
}
function IE(...e) {
  const n = e[0];
  if (e.length === 1) return n;
  const o = () => {
    const i = e.map((a) => ({
      useScope: a(),
      scopeName: a.scopeName
    }));
    return function(c) {
      const d = i.reduce((f, { useScope: y, scopeName: v }) => {
        const l = y(c)[`__scope${v}`];
        return { ...f, ...l };
      }, {});
      return C.useMemo(() => ({ [`__scope${n.scopeName}`]: d }), [d]);
    };
  };
  return o.scopeName = n.scopeName, o;
}
var oo = globalThis != null && globalThis.document ? C.useLayoutEffect : () => {
}, FE = ed[" useId ".trim().toString()] || (() => {
}), OE = 0;
function tc(e) {
  const [n, o] = C.useState(FE());
  return oo(() => {
    o((i) => i ?? String(OE++));
  }, [e]), e || (n ? `radix-${n}` : "");
}
var LE = ed[" useInsertionEffect ".trim().toString()] || oo;
function l0({
  prop: e,
  defaultProp: n,
  onChange: o = () => {
  },
  caller: i
}) {
  const [a, c, d] = VE({
    defaultProp: n,
    onChange: o
  }), f = e !== void 0, y = f ? e : a;
  {
    const S = C.useRef(e !== void 0);
    C.useEffect(() => {
      const l = S.current;
      l !== f && console.warn(
        `${i} is changing from ${l ? "controlled" : "uncontrolled"} to ${f ? "controlled" : "uncontrolled"}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
      ), S.current = f;
    }, [f, i]);
  }
  const v = C.useCallback(
    (S) => {
      var l;
      if (f) {
        const h = zE(S) ? S(e) : S;
        h !== e && ((l = d.current) == null || l.call(d, h));
      } else
        c(S);
    },
    [f, e, c, d]
  );
  return [y, v];
}
function VE({
  defaultProp: e,
  onChange: n
}) {
  const [o, i] = C.useState(e), a = C.useRef(o), c = C.useRef(n);
  return LE(() => {
    c.current = n;
  }, [n]), C.useEffect(() => {
    var d;
    a.current !== o && ((d = c.current) == null || d.call(c, o), a.current = o);
  }, [o, a]), [o, i, c];
}
function zE(e) {
  return typeof e == "function";
}
var u0 = eg();
// @__NO_SIDE_EFFECTS__
function Ca(e) {
  const n = C.forwardRef((o, i) => {
    let { children: a, ...c } = o, d = null, f = !1;
    const y = [];
    by(a) && typeof Hs == "function" && (a = Hs(a._payload)), C.Children.forEach(a, (h) => {
      var g;
      if (WE(h)) {
        f = !0;
        const x = h;
        let k = "child" in x.props ? x.props.child : x.props.children;
        by(k) && typeof Hs == "function" && (k = Hs(k._payload)), d = UE(x, k), y.push((g = d == null ? void 0 : d.props) == null ? void 0 : g.children);
      } else
        y.push(h);
    }), d ? d = C.cloneElement(d, void 0, y) : (
      // A `Slottable` was found but it didn't resolve to a single element (e.g.
      // it wrapped multiple elements, text, or a render-prop `child` that
      // wasn't an element). Don't fall back to treating the `Slottable` wrapper
      // itself as the slot target — throw a descriptive error below instead.
      !f && C.Children.count(a) === 1 && C.isValidElement(a) && (d = a)
    );
    const v = d ? HE(d) : void 0, S = at(i, v);
    if (!d) {
      if (a || a === 0)
        throw new Error(
          f ? QE(e) : YE(e)
        );
      return a;
    }
    const l = $E(c, d.props ?? {});
    return d.type !== C.Fragment && (l.ref = i ? S : v), C.cloneElement(d, l);
  });
  return n.displayName = `${e}.Slot`, n;
}
var BE = Symbol.for("radix.slottable"), UE = (e, n) => {
  if ("child" in e.props) {
    const o = e.props.child;
    return C.isValidElement(o) ? C.cloneElement(o, void 0, e.props.children(o.props.children)) : null;
  }
  return C.isValidElement(n) ? n : null;
};
function $E(e, n) {
  const o = { ...n };
  for (const i in n) {
    const a = e[i], c = n[i];
    /^on[A-Z]/.test(i) ? a && c ? o[i] = (...f) => {
      const y = c(...f);
      return a(...f), y;
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
  return C.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === BE;
}
var GE = Symbol.for("react.lazy");
function by(e) {
  return e != null && typeof e == "object" && "$$typeof" in e && e.$$typeof === GE && "_payload" in e && KE(e._payload);
}
function KE(e) {
  return typeof e == "object" && e !== null && "then" in e;
}
var YE = (e) => `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`, QE = (e) => `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`, Hs = ed[" use ".trim().toString()], XE = [
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
], gt = XE.reduce((e, n) => {
  const o = /* @__PURE__ */ Ca(`Primitive.${n}`), i = C.forwardRef((a, c) => {
    const { asChild: d, ...f } = a, y = d ? o : n;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ w.jsx(y, { ...f, ref: c });
  });
  return i.displayName = `Primitive.${n}`, { ...e, [n]: i };
}, {});
function ZE(e, n) {
  e && u0.flushSync(() => e.dispatchEvent(n));
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
var qE = "DismissableLayer", Kc = "dismissableLayer.update", JE = "dismissableLayer.pointerDownOutside", eP = "dismissableLayer.focusOutside", My, Ud = C.createContext({
  layers: /* @__PURE__ */ new Set(),
  layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
  branches: /* @__PURE__ */ new Set(),
  // Outside elements that belong to a layer's own dismiss affordance (eg, a
  // dialog overlay). Pressing them should dismiss the layer regardless of
  // whether or not they stop propagation.
  //
  // See https://github.com/radix-ui/primitives/issues/3346
  dismissableSurfaces: /* @__PURE__ */ new Set()
}), c0 = C.forwardRef(
  (e, n) => {
    const {
      disableOutsidePointerEvents: o = !1,
      deferPointerDownOutside: i = !1,
      onEscapeKeyDown: a,
      onPointerDownOutside: c,
      onFocusOutside: d,
      onInteractOutside: f,
      onDismiss: y,
      ...v
    } = e, S = C.useContext(Ud), [l, h] = C.useState(null), g = (l == null ? void 0 : l.ownerDocument) ?? (globalThis == null ? void 0 : globalThis.document), [, x] = C.useState({}), k = at(n, h), T = Array.from(S.layers), [A] = [
      ...S.layersWithOutsidePointerEventsDisabled
    ].slice(-1), R = A ? T.indexOf(A) : -1, b = l ? T.indexOf(l) : -1, D = S.layersWithOutsidePointerEventsDisabled.size > 0, L = b >= R, X = C.useRef(!1), Z = iP(
      (J) => {
        c == null || c(J), f == null || f(J), J.defaultPrevented || y == null || y();
      },
      {
        ownerDocument: g,
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
    ), U = sP((J) => {
      if (i && X.current)
        return;
      const ce = J.target;
      [...S.branches].some((he) => he.contains(ce)) || (d == null || d(J), f == null || f(J), J.defaultPrevented || y == null || y());
    }, g), G = l ? b === T.length - 1 : !1, Q = wi((J) => {
      J.key === "Escape" && (a == null || a(J), !J.defaultPrevented && y && (J.preventDefault(), y()));
    });
    return C.useEffect(() => {
      if (G)
        return g.addEventListener("keydown", Q, { capture: !0 }), () => g.removeEventListener("keydown", Q, { capture: !0 });
    }, [g, G, Q]), C.useEffect(() => {
      if (l)
        return o && (S.layersWithOutsidePointerEventsDisabled.size === 0 && (My = g.body.style.pointerEvents, g.body.style.pointerEvents = "none"), S.layersWithOutsidePointerEventsDisabled.add(l)), S.layers.add(l), Ry(), () => {
          o && (S.layersWithOutsidePointerEventsDisabled.delete(l), S.layersWithOutsidePointerEventsDisabled.size === 0 && (g.body.style.pointerEvents = My));
        };
    }, [l, g, o, S]), C.useEffect(() => () => {
      l && (S.layers.delete(l), S.layersWithOutsidePointerEventsDisabled.delete(l), Ry());
    }, [l, S]), C.useEffect(() => {
      const J = () => x({});
      return document.addEventListener(Kc, J), () => document.removeEventListener(Kc, J);
    }, []), /* @__PURE__ */ w.jsx(
      gt.div,
      {
        ...v,
        ref: k,
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
c0.displayName = qE;
var tP = "DismissableLayerBranch", nP = C.forwardRef((e, n) => {
  const o = C.useContext(Ud), i = C.useRef(null), a = at(n, i);
  return C.useEffect(() => {
    const c = i.current;
    if (c)
      return o.branches.add(c), () => {
        o.branches.delete(c);
      };
  }, [o.branches]), /* @__PURE__ */ w.jsx(gt.div, { ...e, ref: a });
});
nP.displayName = tP;
function rP() {
  const e = C.useContext(Ud), [n, o] = C.useState(null);
  return C.useEffect(() => {
    if (n)
      return e.dismissableSurfaces.add(n), () => {
        e.dismissableSurfaces.delete(n);
      };
  }, [n, e.dismissableSurfaces]), o;
}
var oP = () => !0;
function iP(e, n) {
  const {
    ownerDocument: o = globalThis == null ? void 0 : globalThis.document,
    deferPointerDownOutside: i = !1,
    isDeferredPointerDownOutsideRef: a,
    dismissableSurfaces: c,
    shouldHandlePointerDownOutside: d = oP
  } = n, f = wi(e), y = C.useRef(!1), v = C.useRef(!1), S = C.useRef(/* @__PURE__ */ new Map()), l = C.useRef(() => {
  });
  return C.useEffect(() => {
    function h() {
      v.current = !1, a.current = !1, S.current.clear();
    }
    function g() {
      return Array.from(S.current.values()).some(Boolean);
    }
    function x(b) {
      if (!v.current)
        return;
      const D = b.target;
      D instanceof Node && [...c].some((X) => X.contains(D)) || S.current.set(b.type, !0), b.type === "click" && window.setTimeout(() => {
        v.current && l.current();
      }, 0);
    }
    function k(b) {
      v.current && S.current.set(b.type, !1);
    }
    const T = (b) => {
      if (b.target && !y.current) {
        let D = function() {
          o.removeEventListener("click", l.current);
          const X = g();
          h(), X || d0(
            JE,
            f,
            L,
            { discrete: !0 }
          );
        };
        if (!d(b.target)) {
          o.removeEventListener("click", l.current), h(), y.current = !1;
          return;
        }
        const L = { originalEvent: b };
        v.current = !0, a.current = i && b.button === 0, S.current.clear(), !i || b.button !== 0 ? D() : (o.removeEventListener("click", l.current), l.current = D, o.addEventListener("click", l.current, { once: !0 }));
      } else
        o.removeEventListener("click", l.current), h();
      y.current = !1;
    }, A = [
      "pointerup",
      "mousedown",
      "mouseup",
      "touchstart",
      "touchend",
      "click"
    ];
    for (const b of A)
      o.addEventListener(b, x, !0), o.addEventListener(b, k);
    const R = window.setTimeout(() => {
      o.addEventListener("pointerdown", T);
    }, 0);
    return () => {
      window.clearTimeout(R), o.removeEventListener("pointerdown", T), o.removeEventListener("click", l.current);
      for (const b of A)
        o.removeEventListener(b, x, !0), o.removeEventListener(b, k);
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
    onPointerDownCapture: () => y.current = !0
  };
}
function sP(e, n = globalThis == null ? void 0 : globalThis.document) {
  const o = wi(e), i = C.useRef(!1);
  return C.useEffect(() => {
    const a = (c) => {
      c.target && !i.current && d0(eP, o, { originalEvent: c }, {
        discrete: !1
      });
    };
    return n.addEventListener("focusin", a), () => n.removeEventListener("focusin", a);
  }, [n, o]), {
    onFocusCapture: () => i.current = !0,
    onBlurCapture: () => i.current = !1
  };
}
function Ry() {
  const e = new CustomEvent(Kc);
  document.dispatchEvent(e);
}
function d0(e, n, o, { discrete: i }) {
  const a = o.originalEvent.target, c = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: o });
  n && a.addEventListener(e, n, { once: !0 }), i ? ZE(a, c) : a.dispatchEvent(c);
}
var nc = "focusScope.autoFocusOnMount", rc = "focusScope.autoFocusOnUnmount", Ny = { bubbles: !1, cancelable: !0 }, aP = "FocusScope", f0 = C.forwardRef((e, n) => {
  const {
    loop: o = !1,
    trapped: i = !1,
    onMountAutoFocus: a,
    onUnmountAutoFocus: c,
    ...d
  } = e, [f, y] = C.useState(null), v = wi(a), S = wi(c), l = C.useRef(null), h = at(n, y), g = C.useRef({
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
      let k = function(b) {
        if (g.paused || !f) return;
        const D = b.target;
        f.contains(D) ? l.current = D : Ln(l.current, { select: !0 });
      }, T = function(b) {
        if (g.paused || !f) return;
        const D = b.relatedTarget;
        D !== null && (f.contains(D) || Ln(l.current, { select: !0 }));
      }, A = function(b) {
        if (document.activeElement === document.body)
          for (const L of b)
            L.removedNodes.length > 0 && Ln(f);
      };
      document.addEventListener("focusin", k), document.addEventListener("focusout", T);
      const R = new MutationObserver(A);
      return f && R.observe(f, { childList: !0, subtree: !0 }), () => {
        document.removeEventListener("focusin", k), document.removeEventListener("focusout", T), R.disconnect();
      };
    }
  }, [i, f, g.paused]), C.useEffect(() => {
    if (f) {
      jy.add(g);
      const k = document.activeElement;
      if (!f.contains(k)) {
        const A = new CustomEvent(nc, Ny);
        f.addEventListener(nc, v), f.dispatchEvent(A), A.defaultPrevented || (lP(pP(p0(f)), { select: !0 }), document.activeElement === k && Ln(f));
      }
      return () => {
        f.removeEventListener(nc, v), setTimeout(() => {
          const A = new CustomEvent(rc, Ny);
          f.addEventListener(rc, S), f.dispatchEvent(A), A.defaultPrevented || Ln(k ?? document.body, { select: !0 }), f.removeEventListener(rc, S), jy.remove(g);
        }, 0);
      };
    }
  }, [f, v, S, g]);
  const x = C.useCallback(
    (k) => {
      if (!o && !i || g.paused) return;
      const T = k.key === "Tab" && !k.altKey && !k.ctrlKey && !k.metaKey, A = document.activeElement;
      if (T && A) {
        const R = k.currentTarget, [b, D] = uP(R);
        b && D ? !k.shiftKey && A === D ? (k.preventDefault(), o && Ln(b, { select: !0 })) : k.shiftKey && A === b && (k.preventDefault(), o && Ln(D, { select: !0 })) : A === R && k.preventDefault();
      }
    },
    [o, i, g.paused]
  );
  return /* @__PURE__ */ w.jsx(gt.div, { tabIndex: -1, ...d, ref: h, onKeyDown: x });
});
f0.displayName = aP;
function lP(e, { select: n = !1 } = {}) {
  const o = document.activeElement;
  for (const i of e)
    if (Ln(i, { select: n }), document.activeElement !== o) return;
}
function uP(e) {
  const n = p0(e), o = Dy(n, e), i = Dy(n.reverse(), e);
  return [o, i];
}
function p0(e) {
  const n = [], o = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (i) => {
      const a = i.tagName === "INPUT" && i.type === "hidden";
      return i.disabled || i.hidden || a ? NodeFilter.FILTER_SKIP : i.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  for (; o.nextNode(); ) n.push(o.currentNode);
  return n;
}
function Dy(e, n) {
  const o = typeof n.checkVisibility == "function" && n.checkVisibility({ checkVisibilityCSS: !0 });
  for (const i of e)
    if (!(o ? !i.checkVisibility({ checkVisibilityCSS: !0 }) : cP(i, { upTo: n })))
      return i;
}
function cP(e, { upTo: n }) {
  if (getComputedStyle(e).visibility === "hidden") return !0;
  for (; e; ) {
    if (n !== void 0 && e === n) return !1;
    if (getComputedStyle(e).display === "none") return !0;
    e = e.parentElement;
  }
  return !1;
}
function dP(e) {
  return e instanceof HTMLInputElement && "select" in e;
}
function Ln(e, { select: n = !1 } = {}) {
  if (e && e.focus) {
    const o = document.activeElement;
    e.focus({ preventScroll: !0 }), e !== o && dP(e) && n && e.select();
  }
}
var jy = fP();
function fP() {
  let e = [];
  return {
    add(n) {
      const o = e[0];
      n !== o && (o == null || o.pause()), e = Iy(e, n), e.unshift(n);
    },
    remove(n) {
      var o;
      e = Iy(e, n), (o = e[0]) == null || o.resume();
    }
  };
}
function Iy(e, n) {
  const o = [...e], i = o.indexOf(n);
  return i !== -1 && o.splice(i, 1), o;
}
function pP(e) {
  return e.filter((n) => n.tagName !== "A");
}
var hP = "Portal", h0 = C.forwardRef((e, n) => {
  var f;
  const { container: o, ...i } = e, [a, c] = C.useState(!1);
  oo(() => c(!0), []);
  const d = o || a && ((f = globalThis == null ? void 0 : globalThis.document) == null ? void 0 : f.body);
  return d ? u0.createPortal(/* @__PURE__ */ w.jsx(gt.div, { ...i, ref: n }), d) : null;
});
h0.displayName = hP;
function mP(e, n) {
  return C.useReducer((o, i) => n[o][i] ?? o, e);
}
var Fa = (e) => {
  const { present: n, children: o } = e, i = yP(n), a = typeof o == "function" ? o({ present: i.isPresent }) : C.Children.only(o), c = gP(i.ref, vP(a));
  return typeof o == "function" || i.isPresent ? C.cloneElement(a, { ref: c }) : null;
};
Fa.displayName = "Presence";
function yP(e) {
  const [n, o] = C.useState(), i = C.useRef(null), a = C.useRef(e), c = C.useRef("none"), d = C.useRef(void 0), f = e ? "mounted" : "unmounted", [y, v] = mP(f, {
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
    y === "mounted" ? (c.current = d.current ?? ei(i.current), d.current = void 0) : c.current = "none";
  }, [y]), oo(() => {
    const S = i.current, l = a.current;
    if (l !== e) {
      const g = c.current, x = ei(S);
      e ? (d.current = x, v("MOUNT")) : x === "none" || (S == null ? void 0 : S.display) === "none" ? v("UNMOUNT") : v(l && g !== x ? "ANIMATION_OUT" : "UNMOUNT"), a.current = e;
    }
  }, [e, v]), oo(() => {
    if (n) {
      let S;
      const l = n.ownerDocument.defaultView ?? window, h = (x) => {
        const T = ei(i.current).includes(CSS.escape(x.animationName));
        if (x.target === n && T && (v("ANIMATION_END"), !a.current)) {
          const A = n.style.animationFillMode;
          n.style.animationFillMode = "forwards", S = l.setTimeout(() => {
            n.style.animationFillMode === "forwards" && (n.style.animationFillMode = A);
          });
        }
      }, g = (x) => {
        x.target === n && (c.current = ei(i.current));
      };
      return n.addEventListener("animationstart", g), n.addEventListener("animationcancel", h), n.addEventListener("animationend", h), () => {
        l.clearTimeout(S), n.removeEventListener("animationstart", g), n.removeEventListener("animationcancel", h), n.removeEventListener("animationend", h);
      };
    } else
      v("ANIMATION_END");
  }, [n, v]), {
    isPresent: ["mounted", "unmountSuspended"].includes(y),
    ref: C.useCallback((S) => {
      if (S) {
        const l = getComputedStyle(S);
        i.current = l, d.current = ei(l);
      } else
        i.current = null;
      o(S);
    }, [])
  };
}
function Fy(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function gP(...e) {
  const n = C.useRef(e);
  return n.current = e, C.useCallback((o) => {
    const i = n.current;
    let a = !1;
    const c = i.map((d) => {
      const f = Fy(d, o);
      return !a && typeof f == "function" && (a = !0), f;
    });
    if (a)
      return () => {
        for (let d = 0; d < c.length; d++) {
          const f = c[d];
          typeof f == "function" ? f() : Fy(i[d], null);
        }
      };
  }, []);
}
function ei(e) {
  return (e == null ? void 0 : e.animationName) || "none";
}
function vP(e) {
  var i, a;
  let n = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = n && "isReactWarning" in n && n.isReactWarning;
  return o ? e.ref : (n = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = n && "isReactWarning" in n && n.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
var Ws = 0, Xt = null;
function SP() {
  C.useEffect(() => {
    Xt || (Xt = { start: Oy(), end: Oy() });
    const { start: e, end: n } = Xt;
    return document.body.firstElementChild !== e && document.body.insertAdjacentElement("afterbegin", e), document.body.lastElementChild !== n && document.body.insertAdjacentElement("beforeend", n), Ws++, () => {
      Ws === 1 && (Xt == null || Xt.start.remove(), Xt == null || Xt.end.remove(), Xt = null), Ws = Math.max(0, Ws - 1);
    };
  }, []);
}
function Oy() {
  const e = document.createElement("span");
  return e.setAttribute("data-radix-focus-guard", ""), e.tabIndex = 0, e.style.outline = "none", e.style.opacity = "0", e.style.position = "fixed", e.style.pointerEvents = "none", e;
}
var en = function() {
  return en = Object.assign || function(n) {
    for (var o, i = 1, a = arguments.length; i < a; i++) {
      o = arguments[i];
      for (var c in o) Object.prototype.hasOwnProperty.call(o, c) && (n[c] = o[c]);
    }
    return n;
  }, en.apply(this, arguments);
};
function m0(e, n) {
  var o = {};
  for (var i in e) Object.prototype.hasOwnProperty.call(e, i) && n.indexOf(i) < 0 && (o[i] = e[i]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var a = 0, i = Object.getOwnPropertySymbols(e); a < i.length; a++)
      n.indexOf(i[a]) < 0 && Object.prototype.propertyIsEnumerable.call(e, i[a]) && (o[i[a]] = e[i[a]]);
  return o;
}
function wP(e, n, o) {
  if (o || arguments.length === 2) for (var i = 0, a = n.length, c; i < a; i++)
    (c || !(i in n)) && (c || (c = Array.prototype.slice.call(n, 0, i)), c[i] = n[i]);
  return e.concat(c || Array.prototype.slice.call(n));
}
var ia = "right-scroll-bar-position", sa = "width-before-scroll-bar", xP = "with-scroll-bars-hidden", _P = "--removed-body-scroll-bar-size";
function oc(e, n) {
  return typeof e == "function" ? e(n) : e && (e.current = n), e;
}
function kP(e, n) {
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
var TP = typeof window < "u" ? C.useLayoutEffect : C.useEffect, Ly = /* @__PURE__ */ new WeakMap();
function AP(e, n) {
  var o = kP(null, function(i) {
    return e.forEach(function(a) {
      return oc(a, i);
    });
  });
  return TP(function() {
    var i = Ly.get(o);
    if (i) {
      var a = new Set(i), c = new Set(e), d = o.current;
      a.forEach(function(f) {
        c.has(f) || oc(f, null);
      }), c.forEach(function(f) {
        a.has(f) || oc(f, d);
      });
    }
    Ly.set(o, e);
  }, [e]), o;
}
function CP(e) {
  return e;
}
function EP(e, n) {
  n === void 0 && (n = CP);
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
      var y = function() {
        var S = d;
        d = [], S.forEach(c);
      }, v = function() {
        return Promise.resolve().then(y);
      };
      v(), o = {
        push: function(S) {
          d.push(S), v();
        },
        filter: function(S) {
          return d = d.filter(S), o;
        }
      };
    }
  };
  return a;
}
function PP(e) {
  e === void 0 && (e = {});
  var n = EP(null);
  return n.options = en({ async: !0, ssr: !1 }, e), n;
}
var y0 = function(e) {
  var n = e.sideCar, o = m0(e, ["sideCar"]);
  if (!n)
    throw new Error("Sidecar: please provide `sideCar` property to import the right car");
  var i = n.read();
  if (!i)
    throw new Error("Sidecar medium not found");
  return C.createElement(i, en({}, o));
};
y0.isSideCarExport = !0;
function bP(e, n) {
  return e.useMedium(n), y0;
}
var g0 = PP(), ic = function() {
}, Oa = C.forwardRef(function(e, n) {
  var o = C.useRef(null), i = C.useState({
    onScrollCapture: ic,
    onWheelCapture: ic,
    onTouchMoveCapture: ic
  }), a = i[0], c = i[1], d = e.forwardProps, f = e.children, y = e.className, v = e.removeScrollBar, S = e.enabled, l = e.shards, h = e.sideCar, g = e.noRelative, x = e.noIsolation, k = e.inert, T = e.allowPinchZoom, A = e.as, R = A === void 0 ? "div" : A, b = e.gapMode, D = m0(e, ["forwardProps", "children", "className", "removeScrollBar", "enabled", "shards", "sideCar", "noRelative", "noIsolation", "inert", "allowPinchZoom", "as", "gapMode"]), L = h, X = AP([o, n]), Z = en(en({}, D), a);
  return C.createElement(
    C.Fragment,
    null,
    S && C.createElement(L, { sideCar: g0, removeScrollBar: v, shards: l, noRelative: g, noIsolation: x, inert: k, setCallbacks: c, allowPinchZoom: !!T, lockRef: o, gapMode: b }),
    d ? C.cloneElement(C.Children.only(f), en(en({}, Z), { ref: X })) : C.createElement(R, en({}, Z, { className: y, ref: X }), f)
  );
});
Oa.defaultProps = {
  enabled: !0,
  removeScrollBar: !0,
  inert: !1
};
Oa.classNames = {
  fullWidth: sa,
  zeroRight: ia
};
var MP = function() {
  if (typeof __webpack_nonce__ < "u")
    return __webpack_nonce__;
};
function RP() {
  if (!document)
    return null;
  var e = document.createElement("style");
  e.type = "text/css";
  var n = MP();
  return n && e.setAttribute("nonce", n), e;
}
function NP(e, n) {
  e.styleSheet ? e.styleSheet.cssText = n : e.appendChild(document.createTextNode(n));
}
function DP(e) {
  var n = document.head || document.getElementsByTagName("head")[0];
  n.appendChild(e);
}
var jP = function() {
  var e = 0, n = null;
  return {
    add: function(o) {
      e == 0 && (n = RP()) && (NP(n, o), DP(n)), e++;
    },
    remove: function() {
      e--, !e && n && (n.parentNode && n.parentNode.removeChild(n), n = null);
    }
  };
}, IP = function() {
  var e = jP();
  return function(n, o) {
    C.useEffect(function() {
      return e.add(n), function() {
        e.remove();
      };
    }, [n && o]);
  };
}, v0 = function() {
  var e = IP(), n = function(o) {
    var i = o.styles, a = o.dynamic;
    return e(i, a), null;
  };
  return n;
}, FP = {
  left: 0,
  top: 0,
  right: 0,
  gap: 0
}, sc = function(e) {
  return parseInt(e || "", 10) || 0;
}, OP = function(e) {
  var n = window.getComputedStyle(document.body), o = n[e === "padding" ? "paddingLeft" : "marginLeft"], i = n[e === "padding" ? "paddingTop" : "marginTop"], a = n[e === "padding" ? "paddingRight" : "marginRight"];
  return [sc(o), sc(i), sc(a)];
}, LP = function(e) {
  if (e === void 0 && (e = "margin"), typeof window > "u")
    return FP;
  var n = OP(e), o = document.documentElement.clientWidth, i = window.innerWidth;
  return {
    left: n[0],
    top: n[1],
    right: n[2],
    gap: Math.max(0, i - o + n[2] - n[0])
  };
}, VP = v0(), eo = "data-scroll-locked", zP = function(e, n, o, i) {
  var a = e.left, c = e.top, d = e.right, f = e.gap;
  return o === void 0 && (o = "margin"), `
  .`.concat(xP, ` {
   overflow: hidden `).concat(i, `;
   padding-right: `).concat(f, "px ").concat(i, `;
  }
  body[`).concat(eo, `] {
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
  
  .`).concat(ia, ` {
    right: `).concat(f, "px ").concat(i, `;
  }
  
  .`).concat(sa, ` {
    margin-right: `).concat(f, "px ").concat(i, `;
  }
  
  .`).concat(ia, " .").concat(ia, ` {
    right: 0 `).concat(i, `;
  }
  
  .`).concat(sa, " .").concat(sa, ` {
    margin-right: 0 `).concat(i, `;
  }
  
  body[`).concat(eo, `] {
    `).concat(_P, ": ").concat(f, `px;
  }
`);
}, Vy = function() {
  var e = parseInt(document.body.getAttribute(eo) || "0", 10);
  return isFinite(e) ? e : 0;
}, BP = function() {
  C.useEffect(function() {
    return document.body.setAttribute(eo, (Vy() + 1).toString()), function() {
      var e = Vy() - 1;
      e <= 0 ? document.body.removeAttribute(eo) : document.body.setAttribute(eo, e.toString());
    };
  }, []);
}, UP = function(e) {
  var n = e.noRelative, o = e.noImportant, i = e.gapMode, a = i === void 0 ? "margin" : i;
  BP();
  var c = C.useMemo(function() {
    return LP(a);
  }, [a]);
  return C.createElement(VP, { styles: zP(c, !n, a, o ? "" : "!important") });
}, Yc = !1;
if (typeof window < "u")
  try {
    var Gs = Object.defineProperty({}, "passive", {
      get: function() {
        return Yc = !0, !0;
      }
    });
    window.addEventListener("test", Gs, Gs), window.removeEventListener("test", Gs, Gs);
  } catch {
    Yc = !1;
  }
var Wr = Yc ? { passive: !1 } : !1, $P = function(e) {
  return e.tagName === "TEXTAREA";
}, S0 = function(e, n) {
  if (!(e instanceof Element))
    return !1;
  var o = window.getComputedStyle(e);
  return (
    // not-not-scrollable
    o[n] !== "hidden" && // contains scroll inside self
    !(o.overflowY === o.overflowX && !$P(e) && o[n] === "visible")
  );
}, HP = function(e) {
  return S0(e, "overflowY");
}, WP = function(e) {
  return S0(e, "overflowX");
}, zy = function(e, n) {
  var o = n.ownerDocument, i = n;
  do {
    typeof ShadowRoot < "u" && i instanceof ShadowRoot && (i = i.host);
    var a = w0(e, i);
    if (a) {
      var c = x0(e, i), d = c[1], f = c[2];
      if (d > f)
        return !0;
    }
    i = i.parentNode;
  } while (i && i !== o.body);
  return !1;
}, GP = function(e) {
  var n = e.scrollTop, o = e.scrollHeight, i = e.clientHeight;
  return [
    n,
    o,
    i
  ];
}, KP = function(e) {
  var n = e.scrollLeft, o = e.scrollWidth, i = e.clientWidth;
  return [
    n,
    o,
    i
  ];
}, w0 = function(e, n) {
  return e === "v" ? HP(n) : WP(n);
}, x0 = function(e, n) {
  return e === "v" ? GP(n) : KP(n);
}, YP = function(e, n) {
  return e === "h" && n === "rtl" ? -1 : 1;
}, QP = function(e, n, o, i, a) {
  var c = YP(e, window.getComputedStyle(n).direction), d = c * i, f = o.target, y = n.contains(f), v = !1, S = d > 0, l = 0, h = 0;
  do {
    if (!f)
      break;
    var g = x0(e, f), x = g[0], k = g[1], T = g[2], A = k - T - c * x;
    (x || A) && w0(e, f) && (l += A, h += x);
    var R = f.parentNode;
    f = R && R.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? R.host : R;
  } while (
    // portaled content
    !y && f !== document.body || // self content
    y && (n.contains(f) || n === f)
  );
  return (S && Math.abs(l) < 1 || !S && Math.abs(h) < 1) && (v = !0), v;
}, Ks = function(e) {
  return "changedTouches" in e ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY] : [0, 0];
}, By = function(e) {
  return [e.deltaX, e.deltaY];
}, Uy = function(e) {
  return e && "current" in e ? e.current : e;
}, XP = function(e, n) {
  return e[0] === n[0] && e[1] === n[1];
}, ZP = function(e) {
  return `
  .block-interactivity-`.concat(e, ` {pointer-events: none;}
  .allow-interactivity-`).concat(e, ` {pointer-events: all;}
`);
}, qP = 0, Gr = [];
function JP(e) {
  var n = C.useRef([]), o = C.useRef([0, 0]), i = C.useRef(), a = C.useState(qP++)[0], c = C.useState(v0)[0], d = C.useRef(e);
  C.useEffect(function() {
    d.current = e;
  }, [e]), C.useEffect(function() {
    if (e.inert) {
      document.body.classList.add("block-interactivity-".concat(a));
      var k = wP([e.lockRef.current], (e.shards || []).map(Uy), !0).filter(Boolean);
      return k.forEach(function(T) {
        return T.classList.add("allow-interactivity-".concat(a));
      }), function() {
        document.body.classList.remove("block-interactivity-".concat(a)), k.forEach(function(T) {
          return T.classList.remove("allow-interactivity-".concat(a));
        });
      };
    }
  }, [e.inert, e.lockRef.current, e.shards]);
  var f = C.useCallback(function(k, T) {
    if ("touches" in k && k.touches.length === 2 || k.type === "wheel" && k.ctrlKey)
      return !d.current.allowPinchZoom;
    var A = Ks(k), R = o.current, b = "deltaX" in k ? k.deltaX : R[0] - A[0], D = "deltaY" in k ? k.deltaY : R[1] - A[1], L, X = k.target, Z = Math.abs(b) > Math.abs(D) ? "h" : "v";
    if ("touches" in k && Z === "h" && X.type === "range")
      return !1;
    var U = window.getSelection(), G = U && U.anchorNode, Q = G ? G === X || G.contains(X) : !1;
    if (Q)
      return !1;
    var J = zy(Z, X);
    if (!J)
      return !0;
    if (J ? L = Z : (L = Z === "v" ? "h" : "v", J = zy(Z, X)), !J)
      return !1;
    if (!i.current && "changedTouches" in k && (b || D) && (i.current = L), !L)
      return !0;
    var ce = i.current || L;
    return QP(ce, T, k, ce === "h" ? b : D);
  }, []), y = C.useCallback(function(k) {
    var T = k;
    if (!(!Gr.length || Gr[Gr.length - 1] !== c)) {
      var A = "deltaY" in T ? By(T) : Ks(T), R = n.current.filter(function(L) {
        return L.name === T.type && (L.target === T.target || T.target === L.shadowParent) && XP(L.delta, A);
      })[0];
      if (R && R.should) {
        T.cancelable && T.preventDefault();
        return;
      }
      if (!R) {
        var b = (d.current.shards || []).map(Uy).filter(Boolean).filter(function(L) {
          return L.contains(T.target);
        }), D = b.length > 0 ? f(T, b[0]) : !d.current.noIsolation;
        D && T.cancelable && T.preventDefault();
      }
    }
  }, []), v = C.useCallback(function(k, T, A, R) {
    var b = { name: k, delta: T, target: A, should: R, shadowParent: eb(A) };
    n.current.push(b), setTimeout(function() {
      n.current = n.current.filter(function(D) {
        return D !== b;
      });
    }, 1);
  }, []), S = C.useCallback(function(k) {
    o.current = Ks(k), i.current = void 0;
  }, []), l = C.useCallback(function(k) {
    v(k.type, By(k), k.target, f(k, e.lockRef.current));
  }, []), h = C.useCallback(function(k) {
    v(k.type, Ks(k), k.target, f(k, e.lockRef.current));
  }, []);
  C.useEffect(function() {
    return Gr.push(c), e.setCallbacks({
      onScrollCapture: l,
      onWheelCapture: l,
      onTouchMoveCapture: h
    }), document.addEventListener("wheel", y, Wr), document.addEventListener("touchmove", y, Wr), document.addEventListener("touchstart", S, Wr), function() {
      Gr = Gr.filter(function(k) {
        return k !== c;
      }), document.removeEventListener("wheel", y, Wr), document.removeEventListener("touchmove", y, Wr), document.removeEventListener("touchstart", S, Wr);
    };
  }, []);
  var g = e.removeScrollBar, x = e.inert;
  return C.createElement(
    C.Fragment,
    null,
    x ? C.createElement(c, { styles: ZP(a) }) : null,
    g ? C.createElement(UP, { noRelative: e.noRelative, gapMode: e.gapMode }) : null
  );
}
function eb(e) {
  for (var n = null; e !== null; )
    e instanceof ShadowRoot && (n = e.host, e = e.host), e = e.parentNode;
  return n;
}
const tb = bP(g0, JP);
var _0 = C.forwardRef(function(e, n) {
  return C.createElement(Oa, en({}, e, { ref: n, sideCar: tb }));
});
_0.classNames = Oa.classNames;
var nb = function(e) {
  if (typeof document > "u")
    return null;
  var n = Array.isArray(e) ? e[0] : e;
  return n.ownerDocument.body;
}, Kr = /* @__PURE__ */ new WeakMap(), Ys = /* @__PURE__ */ new WeakMap(), Qs = {}, ac = 0, k0 = function(e) {
  return e && (e.host || k0(e.parentNode));
}, rb = function(e, n) {
  return n.map(function(o) {
    if (e.contains(o))
      return o;
    var i = k0(o);
    return i && e.contains(i) ? i : (console.error("aria-hidden", o, "in not contained inside", e, ". Doing nothing"), null);
  }).filter(function(o) {
    return !!o;
  });
}, ob = function(e, n, o, i) {
  var a = rb(n, Array.isArray(e) ? e : [e]);
  Qs[o] || (Qs[o] = /* @__PURE__ */ new WeakMap());
  var c = Qs[o], d = [], f = /* @__PURE__ */ new Set(), y = new Set(a), v = function(l) {
    !l || f.has(l) || (f.add(l), v(l.parentNode));
  };
  a.forEach(v);
  var S = function(l) {
    !l || y.has(l) || Array.prototype.forEach.call(l.children, function(h) {
      if (f.has(h))
        S(h);
      else
        try {
          var g = h.getAttribute(i), x = g !== null && g !== "false", k = (Kr.get(h) || 0) + 1, T = (c.get(h) || 0) + 1;
          Kr.set(h, k), c.set(h, T), d.push(h), k === 1 && x && Ys.set(h, !0), T === 1 && h.setAttribute(o, "true"), x || h.setAttribute(i, "true");
        } catch (A) {
          console.error("aria-hidden: cannot operate on ", h, A);
        }
    });
  };
  return S(n), f.clear(), ac++, function() {
    d.forEach(function(l) {
      var h = Kr.get(l) - 1, g = c.get(l) - 1;
      Kr.set(l, h), c.set(l, g), h || (Ys.has(l) || l.removeAttribute(i), Ys.delete(l)), g || l.removeAttribute(o);
    }), ac--, ac || (Kr = /* @__PURE__ */ new WeakMap(), Kr = /* @__PURE__ */ new WeakMap(), Ys = /* @__PURE__ */ new WeakMap(), Qs = {});
  };
}, ib = function(e, n, o) {
  o === void 0 && (o = "data-aria-hidden");
  var i = Array.from(Array.isArray(e) ? e : [e]), a = nb(e);
  return a ? (i.push.apply(i, Array.from(a.querySelectorAll("[aria-live], script"))), ob(i, a, o, "aria-hidden")) : function() {
    return null;
  };
}, La = "Dialog", [T0] = Bd(La), [sb, Ht] = T0(La), A0 = (e) => {
  const {
    __scopeDialog: n,
    children: o,
    open: i,
    defaultOpen: a,
    onOpenChange: c,
    modal: d = !0
  } = e, f = C.useRef(null), y = C.useRef(null), [v, S] = l0({
    prop: i,
    defaultProp: a ?? !1,
    onChange: c,
    caller: La
  });
  return /* @__PURE__ */ w.jsx(
    sb,
    {
      scope: n,
      triggerRef: f,
      contentRef: y,
      contentId: tc(),
      titleId: tc(),
      descriptionId: tc(),
      open: v,
      onOpenChange: S,
      onOpenToggle: C.useCallback(() => S((l) => !l), [S]),
      modal: d,
      children: o
    }
  );
};
A0.displayName = La;
var C0 = "DialogTrigger", ab = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Ht(C0, o), c = at(n, a.triggerRef);
    return /* @__PURE__ */ w.jsx(
      gt.button,
      {
        type: "button",
        "aria-haspopup": "dialog",
        "aria-expanded": a.open,
        "aria-controls": a.open ? a.contentId : void 0,
        "data-state": Hd(a.open),
        ...i,
        ref: c,
        onClick: mt(e.onClick, a.onOpenToggle)
      }
    );
  }
);
ab.displayName = C0;
var $d = "DialogPortal", [lb, E0] = T0($d, {
  forceMount: void 0
}), P0 = (e) => {
  const { __scopeDialog: n, forceMount: o, children: i, container: a } = e, c = Ht($d, n);
  return /* @__PURE__ */ w.jsx(lb, { scope: n, forceMount: o, children: C.Children.map(i, (d) => /* @__PURE__ */ w.jsx(Fa, { present: o || c.open, children: /* @__PURE__ */ w.jsx(h0, { asChild: !0, container: a, children: d }) })) });
};
P0.displayName = $d;
var Ea = "DialogOverlay", b0 = C.forwardRef(
  (e, n) => {
    const o = E0(Ea, e.__scopeDialog), { forceMount: i = o.forceMount, ...a } = e, c = Ht(Ea, e.__scopeDialog);
    return c.modal ? /* @__PURE__ */ w.jsx(Fa, { present: i || c.open, children: /* @__PURE__ */ w.jsx(cb, { ...a, ref: n }) }) : null;
  }
);
b0.displayName = Ea;
var ub = /* @__PURE__ */ Ca("DialogOverlay.RemoveScroll"), cb = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Ht(Ea, o), c = rP(), d = at(n, c);
    return (
      // Make sure `Content` is scrollable even when it doesn't live inside `RemoveScroll`
      // ie. when `Overlay` and `Content` are siblings
      /* @__PURE__ */ w.jsx(_0, { as: ub, allowPinchZoom: !0, shards: [a.contentRef], children: /* @__PURE__ */ w.jsx(
        gt.div,
        {
          "data-state": Hd(a.open),
          ...i,
          ref: d,
          style: { pointerEvents: "auto", ...i.style }
        }
      ) })
    );
  }
), io = "DialogContent", M0 = C.forwardRef(
  (e, n) => {
    const o = E0(io, e.__scopeDialog), { forceMount: i = o.forceMount, ...a } = e, c = Ht(io, e.__scopeDialog);
    return /* @__PURE__ */ w.jsx(Fa, { present: i || c.open, children: c.modal ? /* @__PURE__ */ w.jsx(db, { ...a, ref: n }) : /* @__PURE__ */ w.jsx(fb, { ...a, ref: n }) });
  }
);
M0.displayName = io;
var db = C.forwardRef(
  (e, n) => {
    const o = Ht(io, e.__scopeDialog), i = C.useRef(null), a = at(n, o.contentRef, i);
    return C.useEffect(() => {
      const c = i.current;
      if (c) return ib(c);
    }, []), /* @__PURE__ */ w.jsx(
      R0,
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
          const d = c.detail.originalEvent, f = d.button === 0 && d.ctrlKey === !0;
          (d.button === 2 || f) && c.preventDefault();
        }),
        onFocusOutside: mt(
          e.onFocusOutside,
          (c) => c.preventDefault()
        )
      }
    );
  }
), fb = C.forwardRef(
  (e, n) => {
    const o = Ht(io, e.__scopeDialog), i = C.useRef(!1), a = C.useRef(!1);
    return /* @__PURE__ */ w.jsx(
      R0,
      {
        ...e,
        ref: n,
        trapFocus: !1,
        disableOutsidePointerEvents: !1,
        onCloseAutoFocus: (c) => {
          var d, f;
          (d = e.onCloseAutoFocus) == null || d.call(e, c), c.defaultPrevented || (i.current || (f = o.triggerRef.current) == null || f.focus(), c.preventDefault()), i.current = !1, a.current = !1;
        },
        onInteractOutside: (c) => {
          var y, v;
          (y = e.onInteractOutside) == null || y.call(e, c), c.defaultPrevented || (i.current = !0, c.detail.originalEvent.type === "pointerdown" && (a.current = !0));
          const d = c.target;
          ((v = o.triggerRef.current) == null ? void 0 : v.contains(d)) && c.preventDefault(), c.detail.originalEvent.type === "focusin" && a.current && c.preventDefault();
        }
      }
    );
  }
), R0 = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, trapFocus: i, onOpenAutoFocus: a, onCloseAutoFocus: c, ...d } = e, f = Ht(io, o);
    return SP(), /* @__PURE__ */ w.jsx(w.Fragment, { children: /* @__PURE__ */ w.jsx(
      f0,
      {
        asChild: !0,
        loop: !0,
        trapped: i,
        onMountAutoFocus: a,
        onUnmountAutoFocus: c,
        children: /* @__PURE__ */ w.jsx(
          c0,
          {
            role: "dialog",
            id: f.contentId,
            "aria-describedby": f.descriptionId,
            "aria-labelledby": f.titleId,
            "data-state": Hd(f.open),
            ...d,
            ref: n,
            deferPointerDownOutside: !0,
            onDismiss: () => f.onOpenChange(!1)
          }
        )
      }
    ) });
  }
), N0 = "DialogTitle", D0 = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Ht(N0, o);
    return /* @__PURE__ */ w.jsx(gt.h2, { id: a.titleId, ...i, ref: n });
  }
);
D0.displayName = N0;
var j0 = "DialogDescription", I0 = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Ht(j0, o);
    return /* @__PURE__ */ w.jsx(gt.p, { id: a.descriptionId, ...i, ref: n });
  }
);
I0.displayName = j0;
var F0 = "DialogClose", pb = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Ht(F0, o);
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
pb.displayName = F0;
function Hd(e) {
  return e ? "open" : "closed";
}
function hb() {
  const e = $((a) => a.summaryRecord), n = $((a) => a.closeSummary), o = $((a) => a.startTimer), i = Wn(e == null ? void 0 : e.selectedScene);
  return /* @__PURE__ */ w.jsx(A0, { open: !!e, onOpenChange: (a) => !a && n(), children: /* @__PURE__ */ w.jsx(Na, { children: e ? /* @__PURE__ */ w.jsxs(P0, { forceMount: !0, children: [
    /* @__PURE__ */ w.jsx(b0, { asChild: !0, children: /* @__PURE__ */ w.jsx(
      nn.div,
      {
        className: "summary-overlay",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
      }
    ) }),
    /* @__PURE__ */ w.jsx(M0, { asChild: !0, children: /* @__PURE__ */ w.jsxs(
      nn.article,
      {
        className: "summary-card liquid-glass",
        initial: { opacity: 0, y: 18, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 18, scale: 0.98 },
        children: [
          /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Session complete" }),
          /* @__PURE__ */ w.jsx(D0, { children: "Focus block complete" }),
          /* @__PURE__ */ w.jsx(I0, { className: "sr-only", children: "Summary of the completed focus block." }),
          /* @__PURE__ */ w.jsx("p", { children: "You protected a focused block in your quiet study room." }),
          /* @__PURE__ */ w.jsxs("div", { className: "summary-grid", children: [
            /* @__PURE__ */ w.jsxs("div", { className: "summary-stat liquid-glass-lite", children: [
              /* @__PURE__ */ w.jsx("span", { children: "Focus time" }),
              /* @__PURE__ */ w.jsx("strong", { children: jd(e.totalFocusTime) })
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
            /* @__PURE__ */ w.jsx(be, { variant: "primary", onClick: () => {
              n(), o();
            }, children: "Continue studying" }),
            /* @__PURE__ */ w.jsx(be, { onClick: n, children: "Done" })
          ] })
        ]
      }
    ) })
  ] }) : null }) });
}
function O0(e, [n, o]) {
  return Math.min(o, Math.max(n, e));
}
var mb = C.createContext(void 0);
function yb(e) {
  const n = C.useContext(mb);
  return e || n || "ltr";
}
function gb(e) {
  const n = C.useRef({ value: e, previous: e });
  return C.useMemo(() => (n.current.value !== e && (n.current.previous = n.current.value, n.current.value = e), n.current.previous), [e]);
}
function vb(e) {
  const [n, o] = C.useState(void 0);
  return oo(() => {
    if (e) {
      o({ width: e.offsetWidth, height: e.offsetHeight });
      const i = new ResizeObserver((a) => {
        if (!Array.isArray(a) || !a.length)
          return;
        const c = a[0];
        let d, f;
        if ("borderBoxSize" in c) {
          const y = c.borderBoxSize, v = Array.isArray(y) ? y[0] : y;
          d = v.inlineSize, f = v.blockSize;
        } else
          d = e.offsetWidth, f = e.offsetHeight;
        o({ width: d, height: f });
      });
      return i.observe(e, { box: "border-box" }), () => i.unobserve(e);
    } else
      o(void 0);
  }, [e]), n;
}
function Sb(e) {
  const n = e + "CollectionProvider", [o, i] = Bd(n), [a, c] = o(
    n,
    { collectionRef: { current: null }, itemMap: /* @__PURE__ */ new Map() }
  ), d = (k) => {
    const { scope: T, children: A } = k, R = C.useRef(null), b = C.useRef(/* @__PURE__ */ new Map()).current;
    return /* @__PURE__ */ w.jsx(a, { scope: T, itemMap: b, collectionRef: R, children: A });
  };
  d.displayName = n;
  const f = e + "CollectionSlot", y = /* @__PURE__ */ Ca(f), v = C.forwardRef(
    (k, T) => {
      const { scope: A, children: R } = k, b = c(f, A), D = at(T, b.collectionRef);
      return /* @__PURE__ */ w.jsx(y, { ref: D, children: R });
    }
  );
  v.displayName = f;
  const S = e + "CollectionItemSlot", l = "data-radix-collection-item", h = /* @__PURE__ */ Ca(S), g = C.forwardRef(
    (k, T) => {
      const { scope: A, children: R, ...b } = k, D = C.useRef(null), L = at(T, D), X = c(S, A);
      return C.useEffect(() => (X.itemMap.set(D, { ref: D, ...b }), () => void X.itemMap.delete(D))), /* @__PURE__ */ w.jsx(h, { [l]: "", ref: L, children: R });
    }
  );
  g.displayName = S;
  function x(k) {
    const T = c(e + "CollectionConsumer", k);
    return C.useCallback(() => {
      const R = T.collectionRef.current;
      if (!R) return [];
      const b = Array.from(R.querySelectorAll(`[${l}]`));
      return Array.from(T.itemMap.values()).sort(
        (X, Z) => b.indexOf(X.ref.current) - b.indexOf(Z.ref.current)
      );
    }, [T.collectionRef, T.itemMap]);
  }
  return [
    { Provider: d, Slot: v, ItemSlot: g },
    x,
    i
  ];
}
var L0 = ["PageUp", "PageDown"], V0 = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"], z0 = {
  "from-left": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-right": ["Home", "PageDown", "ArrowDown", "ArrowRight"],
  "from-bottom": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-top": ["Home", "PageDown", "ArrowUp", "ArrowLeft"]
}, uo = "Slider", [Qc, wb, xb] = Sb(uo), [Wd] = Bd(uo, [
  xb
]), [_b, Ei] = Wd(uo), B0 = C.forwardRef(
  (e, n) => {
    const {
      name: o,
      min: i = 0,
      max: a = 100,
      step: c = 1,
      orientation: d = "horizontal",
      disabled: f = !1,
      minStepsBetweenThumbs: y = 0,
      defaultValue: v = [i],
      value: S,
      onValueChange: l = () => {
      },
      onValueCommit: h = () => {
      },
      inverted: g = !1,
      form: x,
      ...k
    } = e, T = C.useRef(/* @__PURE__ */ new Set()), A = C.useRef(0), R = C.useRef(!1), D = d === "horizontal" ? kb : Tb, [L, X] = C.useState(null), Z = at(n, X), [U = [], G] = l0({
      prop: S,
      defaultProp: v,
      onChange: (ue) => {
        var V;
        (V = [...T.current][A.current]) == null || V.focus({
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
      const ge = Pb(U, ue);
      we(ue, ge);
    }
    function ye(ue) {
      we(ue, A.current);
    }
    function he() {
      const ue = Q.current[A.current];
      U[A.current] !== ue && h(U);
    }
    function we(ue, ge, { commit: V } = { commit: !1 }) {
      const q = rS(c), K = la(Math.round((ue - i) / c) * c + i, q), E = O0(K, [i, a]);
      G((O = []) => {
        const le = Cb(O, E, ge);
        if (Rb(le, y * c)) {
          A.current = le.indexOf(E);
          const fe = String(le) !== String(O);
          return fe && V && h(le), fe ? le : O;
        } else
          return O;
      });
    }
    return /* @__PURE__ */ w.jsx(
      _b,
      {
        scope: e.__scopeSlider,
        name: o,
        disabled: f,
        min: i,
        max: a,
        valueIndexToChangeRef: A,
        thumbs: T.current,
        values: U,
        orientation: d,
        form: x,
        children: /* @__PURE__ */ w.jsx(Qc.Provider, { scope: e.__scopeSlider, children: /* @__PURE__ */ w.jsx(Qc.Slot, { scope: e.__scopeSlider, children: /* @__PURE__ */ w.jsx(
          D,
          {
            "aria-disabled": f,
            "data-disabled": f ? "" : void 0,
            ...k,
            ref: Z,
            onPointerDown: mt(k.onPointerDown, () => {
              f || (Q.current = U, R.current = !1);
            }),
            min: i,
            max: a,
            inverted: g,
            onSlideStart: f ? void 0 : ce,
            onSlideMove: f ? void 0 : ye,
            onSlideEnd: f ? void 0 : he,
            onHomeKeyDown: () => {
              f || (R.current = !0, we(i, 0, { commit: !0 }));
            },
            onEndKeyDown: () => {
              f || (R.current = !0, we(a, U.length - 1, { commit: !0 }));
            },
            onStepKeyDown: ({ event: ue, direction: ge }) => {
              if (!f) {
                R.current = !0;
                const K = L0.includes(ue.key) || ue.shiftKey && V0.includes(ue.key) ? 10 : 1, E = A.current, O = U[E], le = Nb(O, {
                  min: i,
                  step: c,
                  direction: ge,
                  multiplier: K
                });
                we(le, E, { commit: !0 });
              }
            }
          }
        ) }) })
      }
    );
  }
);
B0.displayName = uo;
var [U0, $0] = Wd(uo, {
  startEdge: "left",
  endEdge: "right",
  size: "width",
  direction: 1
}), kb = C.forwardRef(
  (e, n) => {
    const {
      min: o,
      max: i,
      dir: a,
      inverted: c,
      onSlideStart: d,
      onSlideMove: f,
      onSlideEnd: y,
      onStepKeyDown: v,
      ...S
    } = e, [l, h] = C.useState(null), g = at(n, h), x = C.useRef(void 0), k = yb(a), T = k === "ltr", A = T && !c || !T && c;
    function R(b) {
      const D = x.current || l.getBoundingClientRect(), L = [0, D.width], Z = Gd(L, A ? [o, i] : [i, o]);
      return x.current = D, Z(b - D.left);
    }
    return /* @__PURE__ */ w.jsx(
      U0,
      {
        scope: e.__scopeSlider,
        startEdge: A ? "left" : "right",
        endEdge: A ? "right" : "left",
        direction: A ? 1 : -1,
        size: "width",
        children: /* @__PURE__ */ w.jsx(
          H0,
          {
            dir: k,
            "data-orientation": "horizontal",
            ...S,
            ref: g,
            style: {
              ...S.style,
              "--radix-slider-thumb-transform": "translateX(-50%)"
            },
            onSlideStart: (b) => {
              const D = R(b.clientX);
              d == null || d(D);
            },
            onSlideMove: (b) => {
              const D = R(b.clientX);
              f == null || f(D);
            },
            onSlideEnd: () => {
              x.current = void 0, y == null || y();
            },
            onStepKeyDown: (b) => {
              const L = z0[A ? "from-left" : "from-right"].includes(b.key);
              v == null || v({ event: b, direction: L ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), Tb = C.forwardRef(
  (e, n) => {
    const {
      min: o,
      max: i,
      inverted: a,
      onSlideStart: c,
      onSlideMove: d,
      onSlideEnd: f,
      onStepKeyDown: y,
      ...v
    } = e, S = C.useRef(null), l = at(n, S), h = C.useRef(void 0), g = !a;
    function x(k) {
      const T = h.current || S.current.getBoundingClientRect(), A = [0, T.height], b = Gd(A, g ? [i, o] : [o, i]);
      return h.current = T, b(k - T.top);
    }
    return /* @__PURE__ */ w.jsx(
      U0,
      {
        scope: e.__scopeSlider,
        startEdge: g ? "bottom" : "top",
        endEdge: g ? "top" : "bottom",
        size: "height",
        direction: g ? 1 : -1,
        children: /* @__PURE__ */ w.jsx(
          H0,
          {
            "data-orientation": "vertical",
            ...v,
            ref: l,
            style: {
              ...v.style,
              "--radix-slider-thumb-transform": "translateY(50%)"
            },
            onSlideStart: (k) => {
              const T = x(k.clientY);
              c == null || c(T);
            },
            onSlideMove: (k) => {
              const T = x(k.clientY);
              d == null || d(T);
            },
            onSlideEnd: () => {
              h.current = void 0, f == null || f();
            },
            onStepKeyDown: (k) => {
              const A = z0[g ? "from-bottom" : "from-top"].includes(k.key);
              y == null || y({ event: k, direction: A ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), H0 = C.forwardRef(
  (e, n) => {
    const {
      __scopeSlider: o,
      onSlideStart: i,
      onSlideMove: a,
      onSlideEnd: c,
      onHomeKeyDown: d,
      onEndKeyDown: f,
      onStepKeyDown: y,
      ...v
    } = e, S = Ei(uo, o);
    return /* @__PURE__ */ w.jsx(
      gt.span,
      {
        ...v,
        ref: n,
        onKeyDown: mt(e.onKeyDown, (l) => {
          l.key === "Home" ? (d(l), l.preventDefault()) : l.key === "End" ? (f(l), l.preventDefault()) : L0.concat(V0).includes(l.key) && (y(l), l.preventDefault());
        }),
        onPointerDown: mt(e.onPointerDown, (l) => {
          const h = l.target;
          h.setPointerCapture(l.pointerId), l.preventDefault(), S.thumbs.has(h) ? h.focus({ preventScroll: !0, focusVisible: !1 }) : i(l);
        }),
        onPointerMove: mt(e.onPointerMove, (l) => {
          l.target.hasPointerCapture(l.pointerId) && a(l);
        }),
        onPointerUp: mt(e.onPointerUp, (l) => {
          const h = l.target;
          h.hasPointerCapture(l.pointerId) && (h.releasePointerCapture(l.pointerId), c(l));
        })
      }
    );
  }
), W0 = "SliderTrack", G0 = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Ei(W0, o);
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
G0.displayName = W0;
var Xc = "SliderRange", K0 = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Ei(Xc, o), c = $0(Xc, o), d = C.useRef(null), f = at(n, d), y = a.values.length, v = a.values.map(
      (h) => nS(h, a.min, a.max)
    ), S = y > 1 ? Math.min(...v) : 0, l = 100 - Math.max(...v);
    return /* @__PURE__ */ w.jsx(
      gt.span,
      {
        "data-orientation": a.orientation,
        "data-disabled": a.disabled ? "" : void 0,
        ...i,
        ref: f,
        style: {
          ...e.style,
          [c.startEdge]: S + "%",
          [c.endEdge]: l + "%"
        }
      }
    );
  }
);
K0.displayName = Xc;
var Y0 = "SliderThumb", [Ab, Q0] = Wd(Y0), X0 = "SliderThumbProvider";
function Z0(e) {
  const {
    __scopeSlider: n,
    name: o,
    children: i,
    // @ts-expect-error internal render prop
    internal_do_not_use_render: a
  } = e, c = Ei(X0, n), d = wb(n), [f, y] = C.useState(null), v = C.useMemo(
    () => f ? d().findIndex((T) => T.ref.current === f) : -1,
    [d, f]
  ), S = vb(f), l = f ? !!c.form || !!f.closest("form") : !0, h = c.values[v], g = o ?? (c.name ? c.name + (c.values.length > 1 ? "[]" : "") : void 0), x = h === void 0 ? 0 : nS(h, c.min, c.max);
  C.useEffect(() => {
    if (f)
      return c.thumbs.add(f), () => {
        c.thumbs.delete(f);
      };
  }, [f, c.thumbs]);
  const k = {
    value: h,
    name: g,
    form: c.form,
    isFormControl: l,
    index: v,
    thumb: f,
    onThumbChange: y,
    percent: x,
    size: S
  };
  return /* @__PURE__ */ w.jsx(Ab, { scope: n, ...k, children: Db(a) ? a(k) : i });
}
Z0.displayName = X0;
var aa = "SliderThumbTrigger", q0 = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Ei(aa, o), c = $0(aa, o), { index: d, value: f, percent: y, size: v, onThumbChange: S } = Q0(
      aa,
      o
    ), l = at(n, S), h = Eb(d, a.values.length), g = v == null ? void 0 : v[c.size], x = g ? bb(g, y, c.direction) : 0;
    return /* @__PURE__ */ w.jsx(
      "span",
      {
        style: {
          transform: "var(--radix-slider-thumb-transform)",
          position: "absolute",
          [c.startEdge]: `calc(${y}% + ${x}px)`
        },
        children: /* @__PURE__ */ w.jsx(Qc.ItemSlot, { scope: o, children: /* @__PURE__ */ w.jsx(
          gt.span,
          {
            role: "slider",
            "aria-label": e["aria-label"] || h,
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
            onFocus: mt(e.onFocus, () => {
              a.valueIndexToChangeRef.current = d;
            })
          }
        ) })
      }
    );
  }
);
q0.displayName = aa;
var J0 = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, name: i, ...a } = e;
    return /* @__PURE__ */ w.jsx(
      Z0,
      {
        __scopeSlider: o,
        name: i,
        internal_do_not_use_render: ({ index: c, isFormControl: d }) => /* @__PURE__ */ w.jsxs(w.Fragment, { children: [
          /* @__PURE__ */ w.jsx(
            q0,
            {
              ...a,
              ref: n,
              __scopeSlider: o
            }
          ),
          d ? /* @__PURE__ */ w.jsx(
            tS,
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
J0.displayName = Y0;
var eS = "SliderBubbleInput", tS = C.forwardRef(
  ({ __scopeSlider: e, ...n }, o) => {
    const { value: i, name: a, form: c } = Q0(eS, e), d = C.useRef(null), f = at(d, o), y = gb(i);
    return C.useEffect(() => {
      const v = d.current;
      if (!v) return;
      const S = window.HTMLInputElement.prototype, h = Object.getOwnPropertyDescriptor(S, "value").set;
      if (y !== i && h) {
        const g = new Event("input", { bubbles: !0 });
        h.call(v, i), v.dispatchEvent(g);
      }
    }, [y, i]), /* @__PURE__ */ w.jsx(
      gt.input,
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
tS.displayName = eS;
function Cb(e = [], n, o) {
  const i = [...e];
  return i[o] = n, i.sort((a, c) => a - c);
}
function nS(e, n, o) {
  const c = 100 / (o - n) * (e - n);
  return O0(c, [0, 100]);
}
function Eb(e, n) {
  return n > 2 ? `Value ${e + 1} of ${n}` : n === 2 ? ["Minimum", "Maximum"][e] : void 0;
}
function Pb(e, n) {
  if (e.length === 1) return 0;
  const o = e.map((a) => Math.abs(a - n)), i = Math.min(...o);
  return o.indexOf(i);
}
function bb(e, n, o) {
  const i = e / 2, c = Gd([0, 50], [0, i]);
  return (i - c(n) * o) * o;
}
function Mb(e) {
  return e.slice(0, -1).map((n, o) => e[o + 1] - n);
}
function Rb(e, n) {
  if (n > 0) {
    const o = Mb(e);
    return Math.min(...o) >= n;
  }
  return !0;
}
function Gd(e, n) {
  return (o) => {
    if (e[0] === e[1] || n[0] === n[1]) return n[0];
    const i = (n[1] - n[0]) / (e[1] - e[0]);
    return n[0] + i * (o - e[0]);
  };
}
function rS(e) {
  if (!Number.isFinite(e)) return 0;
  const n = e.toString();
  if (n.includes("e")) {
    const [i, a] = n.split("e"), c = i.split(".")[1] || "", d = Number(a);
    return Math.max(0, c.length - d);
  }
  const o = n.split(".")[1];
  return o ? o.length : 0;
}
function la(e, n) {
  const o = Math.pow(10, n);
  return Math.round(e * o) / o;
}
function Nb(e, {
  min: n,
  step: o,
  direction: i,
  multiplier: a
}) {
  const c = rS(o), d = (e - n) / o, f = Math.round(d), y = la(f * o + n, c) === la(e, c);
  let v;
  return y ? v = f + a * i : i > 0 ? v = Math.ceil(d) : v = Math.floor(d), la(v * o + n, c);
}
function Db(e) {
  return typeof e == "function";
}
function $y({ label: e, icon: n, value: o, onChange: i }) {
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
      B0,
      {
        className: "radix-slider-root",
        value: [o],
        min: 0,
        max: 100,
        step: 1,
        onValueChange: (a) => i(a[0]),
        children: [
          /* @__PURE__ */ w.jsx(G0, { className: "radix-slider-track", children: /* @__PURE__ */ w.jsx(K0, { className: "radix-slider-range" }) }),
          /* @__PURE__ */ w.jsx(J0, { className: "radix-slider-thumb", "aria-label": e })
        ]
      }
    )
  ] });
}
function oS({ audioState: e }) {
  const n = $((S) => S.musicType), o = $((S) => S.ambientSound), i = $((S) => S.musicVolume), a = $((S) => S.ambientVolume), c = $((S) => S.audioPlaying), d = $((S) => S.setSound), f = $((S) => S.toggleAudio), y = ja({ musicType: n, ambientSound: o }), v = y.ambientLayers.map((S) => S.title).filter(Boolean).join(" + ");
  return /* @__PURE__ */ w.jsxs("div", { className: "sound-panel", children: [
    /* @__PURE__ */ w.jsxs("label", { className: "focus-field", children: [
      "Music selector",
      /* @__PURE__ */ w.jsx("select", { value: n, onChange: (S) => d("musicType", S.target.value), children: yi.map((S) => /* @__PURE__ */ w.jsx("option", { value: S.label, children: S.label }, S.label)) })
    ] }),
    /* @__PURE__ */ w.jsx(
      $y,
      {
        label: "Music volume",
        icon: /* @__PURE__ */ w.jsx(Ia, { size: 16, "aria-hidden": "true" }),
        value: i,
        onChange: (S) => d("musicVolume", S)
      }
    ),
    /* @__PURE__ */ w.jsxs("label", { className: "focus-field", children: [
      "Ambient sound selector",
      /* @__PURE__ */ w.jsx("select", { value: o, onChange: (S) => d("ambientSound", S.target.value), children: gi.map((S) => /* @__PURE__ */ w.jsx("option", { value: S.label, children: S.label }, S.label)) })
    ] }),
    /* @__PURE__ */ w.jsx(
      $y,
      {
        label: "Ambient volume",
        icon: /* @__PURE__ */ w.jsx(i0, { size: 16, "aria-hidden": "true" }),
        value: a,
        onChange: (S) => d("ambientVolume", S)
      }
    ),
    /* @__PURE__ */ w.jsxs("div", { className: "audio-preview liquid-glass-lite", children: [
      /* @__PURE__ */ w.jsxs("div", { children: [
        /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Theme audio preview" }),
        /* @__PURE__ */ w.jsx("strong", { children: y.musicTrack.title }),
        /* @__PURE__ */ w.jsx("p", { children: v }),
        e != null && e.error ? /* @__PURE__ */ w.jsx("p", { className: "audio-error", children: e.error }) : null
      ] }),
      /* @__PURE__ */ w.jsx(be, { variant: c ? "primary" : "ghost", onClick: f, children: c ? "Pause audio" : "Play audio" })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "audio-links", children: [y.musicTrack, ...y.ambientLayers].filter((S) => S == null ? void 0 : S.pageUrl).map((S) => /* @__PURE__ */ w.jsx("a", { href: S.pageUrl, target: "_blank", rel: "noreferrer", children: S.title || S.label || "Audio source" }, S.pageUrl)) })
  ] });
}
const jb = [
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
function ti({ title: e, kicker: n, icon: o, children: i, onClose: a, className: c = "" }) {
  return /* @__PURE__ */ w.jsxs(nn.aside, { className: `focus-utility-panel liquid-glass ${c}`.trim(), initial: { opacity: 0, y: 12, x: 18 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: 10, x: 18 }, transition: oa, role: "dialog", "aria-label": e, children: [
    /* @__PURE__ */ w.jsxs("div", { className: "drawer-head", children: [
      /* @__PURE__ */ w.jsxs("div", { className: "utility-title", children: [
        /* @__PURE__ */ w.jsx("span", { className: "utility-title-icon", children: o }),
        /* @__PURE__ */ w.jsxs("div", { children: [
          /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: n }),
          /* @__PURE__ */ w.jsx("h2", { children: e })
        ] })
      ] }),
      /* @__PURE__ */ w.jsx(be, { "aria-label": `Close ${e}`, onClick: a, children: /* @__PURE__ */ w.jsx(s0, { size: 16, "aria-hidden": "true" }) })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "utility-panel-body", children: i })
  ] });
}
function Hy({ audioState: e, scene: n }) {
  const o = $((v) => v.audioChannels), i = $((v) => v.setSound), [a, c] = C.useState(!1), d = (v, S) => {
    c(!1), i(`audioChannel:${v}`, S);
  }, f = () => {
    const v = yi[Math.floor(Math.random() * yi.length)], S = gi[Math.floor(Math.random() * gi.length)];
    i("musicType", v.label), i("ambientSound", S.label), c(!0);
  }, y = () => {
    i("musicType", (n == null ? void 0 : n.musicType) || "Deep Focus"), i("ambientSound", (n == null ? void 0 : n.ambientSound) || "Nature"), c(!0);
  };
  return /* @__PURE__ */ w.jsxs("div", { className: "sound-mixer", children: [
    /* @__PURE__ */ w.jsxs("div", { className: "mixer-featured-row", children: [
      /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Music library" }),
      /* @__PURE__ */ w.jsxs(be, { onClick: f, children: [
        /* @__PURE__ */ w.jsx(CC, { size: 14, "aria-hidden": "true" }),
        " Random track"
      ] })
    ] }),
    /* @__PURE__ */ w.jsx(oS, { audioState: e, compact: !0 }),
    /* @__PURE__ */ w.jsxs("div", { className: "mixer-preset-row", children: [
      /* @__PURE__ */ w.jsxs("button", { type: "button", className: "mixer-preset-button", onClick: y, children: [
        "Apply scene mix ",
        /* @__PURE__ */ w.jsx("span", { children: "↗" })
      ] }),
      /* @__PURE__ */ w.jsxs(be, { onClick: () => c(!0), children: [
        a ? /* @__PURE__ */ w.jsx(wC, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(XC, { size: 14, "aria-hidden": "true" }),
        " ",
        a ? "Saved" : "Save current mix"
      ] })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "mixer-channel-grid", children: jb.map(([v, S]) => /* @__PURE__ */ w.jsxs("label", { className: "mixer-channel", children: [
      /* @__PURE__ */ w.jsxs("span", { children: [
        /* @__PURE__ */ w.jsx("i", { className: `mixer-channel-dot mixer-${v}` }),
        S
      ] }),
      /* @__PURE__ */ w.jsxs("strong", { children: [
        o[v],
        "%"
      ] }),
      /* @__PURE__ */ w.jsx("input", { type: "range", min: "0", max: "100", value: o[v], "aria-label": `${S} volume`, onChange: (l) => d(v, l.target.value) })
    ] }, v)) }),
    e != null && e.error ? /* @__PURE__ */ w.jsx("p", { className: "audio-error", children: e.error }) : null
  ] });
}
function Ib() {
  const e = () => {
    var i, a, c;
    return ((c = (a = (i = globalThis.window) == null ? void 0 : i.SynapseAuth) == null ? void 0 : a.getStoredSession) == null ? void 0 : c.call(a)) || null;
  }, [n, o] = C.useState(e);
  return C.useEffect(() => {
    var d, f, y, v;
    let i = !0;
    const a = (S) => {
      var l;
      i && o(((l = S == null ? void 0 : S.detail) == null ? void 0 : l.session) || e());
    };
    (d = globalThis.window) == null || d.addEventListener("synapse-auth-changed", a);
    const c = (v = (y = (f = globalThis.window) == null ? void 0 : f.SynapseAuth) == null ? void 0 : y.syncSessionFromProvider) == null ? void 0 : v.call(y);
    return Promise.resolve(c).finally(() => a()), () => {
      var S;
      i = !1, (S = globalThis.window) == null || S.removeEventListener("synapse-auth-changed", a);
    };
  }, []), n;
}
function Fb({ onWorkspace: e, session: n }) {
  return !!n ? /* @__PURE__ */ w.jsxs("div", { className: "utility-empty-state", children: [
    /* @__PURE__ */ w.jsx(ka, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Your Focus Trail" }),
    /* @__PURE__ */ w.jsx("p", { children: "Recent sessions and progress remain available through Synapse history." }),
    /* @__PURE__ */ w.jsx(be, { variant: "primary", onClick: () => e == null ? void 0 : e("", "history"), children: "Open session history" })
  ] }) : /* @__PURE__ */ w.jsxs("div", { className: "utility-login-state", children: [
    /* @__PURE__ */ w.jsx(ka, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Your rhythm, remembered" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Sign in to view your Focus Trail" }),
    /* @__PURE__ */ w.jsx("p", { children: "Track deep-work time, completed goals, and your study streak across devices." }),
    /* @__PURE__ */ w.jsx(be, { variant: "primary", onClick: () => e == null ? void 0 : e(), children: "Sign in with Synapse" }),
    /* @__PURE__ */ w.jsx("small", { children: "Your current session continues without an account." })
  ] });
}
function Ob({ onWorkspace: e, session: n }) {
  return !!n ? /* @__PURE__ */ w.jsxs("div", { className: "utility-empty-state", children: [
    /* @__PURE__ */ w.jsx(Aa, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Companion Room" }),
    /* @__PURE__ */ w.jsx("p", { children: "Invite a study partner from your Synapse workspace to share this quiet room." }),
    /* @__PURE__ */ w.jsx(be, { variant: "primary", onClick: () => e == null ? void 0 : e("", "companion"), children: "Open Companion Room" })
  ] }) : /* @__PURE__ */ w.jsxs("div", { className: "utility-login-state", children: [
    /* @__PURE__ */ w.jsx(Aa, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Study alongside someone" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Sign in to use Companion Room" }),
    /* @__PURE__ */ w.jsx("p", { children: "Keep your own goal private while sharing the feeling of showing up together." }),
    /* @__PURE__ */ w.jsx(be, { variant: "primary", onClick: () => e == null ? void 0 : e(), children: "Go to sign in" }),
    /* @__PURE__ */ w.jsx("small", { children: "No companion data is created in Focus Room." })
  ] });
}
function Lb({ audioState: e, utilityPanel: n, onClose: o, onWorkspace: i }) {
  const a = $((S) => S.activeDrawer), c = $((S) => S.closeDrawer), d = $((S) => S.selectedScene), f = $((S) => S.openDrawer), y = Ib(), v = C.useMemo(() => gn.find((S) => S.id === d) || gn[0], [d]);
  return /* @__PURE__ */ w.jsxs(Na, { children: [
    n === "trail" ? /* @__PURE__ */ w.jsx(ti, { title: "Focus Trail", kicker: "Your progress", icon: /* @__PURE__ */ w.jsx(ka, { size: 16 }), onClose: o, children: /* @__PURE__ */ w.jsx(Fb, { onWorkspace: i, session: y }) }) : null,
    n === "companion" ? /* @__PURE__ */ w.jsx(ti, { title: "Companion Room", kicker: "Shared focus", icon: /* @__PURE__ */ w.jsx(Aa, { size: 16 }), onClose: o, children: /* @__PURE__ */ w.jsx(Ob, { onWorkspace: i, session: y }) }) : null,
    n === "settings" ? /* @__PURE__ */ w.jsxs(ti, { title: "Room settings", kicker: "Customize your atmosphere", icon: /* @__PURE__ */ w.jsx(Si, { size: 16 }), onClose: o, className: "room-settings-utility", children: [
      /* @__PURE__ */ w.jsxs("div", { className: "settings-scene-summary", children: [
        /* @__PURE__ */ w.jsx("span", { className: "settings-scene-image", style: { backgroundImage: `url(${(v == null ? void 0 : v.image) || ""})` } }),
        /* @__PURE__ */ w.jsxs("div", { children: [
          /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Current scene" }),
          /* @__PURE__ */ w.jsx("strong", { children: v == null ? void 0 : v.name }),
          /* @__PURE__ */ w.jsx("small", { children: v == null ? void 0 : v.description })
        ] })
      ] }),
      /* @__PURE__ */ w.jsx(be, { onClick: () => {
        o == null || o(), f("scene");
      }, children: "Change scene" }),
      /* @__PURE__ */ w.jsx("h3", { className: "utility-section-title", children: "Sound mixer" }),
      /* @__PURE__ */ w.jsx(Hy, { audioState: e, scene: v })
    ] }) : null,
    !n && a === "scene" ? /* @__PURE__ */ w.jsx(ti, { title: "Choose scene", kicker: "Scene", icon: /* @__PURE__ */ w.jsx(Si, { size: 16 }), onClose: c, children: /* @__PURE__ */ w.jsx(zd, {}) }) : null,
    !n && a === "music" ? /* @__PURE__ */ w.jsx(ti, { title: "Sound atmosphere", kicker: "Room audio", icon: /* @__PURE__ */ w.jsx(Ia, { size: 16 }), onClose: c, children: /* @__PURE__ */ w.jsx(Hy, { audioState: e, scene: v }) }) : null
  ] });
}
const Vb = 2800;
function zb(e) {
  const n = String((e == null ? void 0 : e.tagName) || "").toLowerCase();
  return !!(e != null && e.isContentEditable || ["input", "textarea", "select"].includes(n));
}
function Bb(e = {}) {
  if (zb(e.target)) return "";
  const n = String(e.key || "").toLowerCase();
  return n === " " || n === "spacebar" ? "toggle-timer" : n === "m" ? "toggle-audio" : n === "n" ? "note" : n === "t" ? "tasks" : n === "s" ? "scene" : n === "?" ? "shortcuts" : n === "escape" ? "escape" : "";
}
function Ub(e) {
  return String((e == null ? void 0 : e.materialTitle) || "").trim() || "Focus Room";
}
function $b(e, n = 300) {
  const o = Math.max(0, Math.floor(Number(e) || 0)), i = Math.max(0, Math.floor(Number(n) || 0)), a = o + i;
  return {
    minutes: Math.floor(a / 60),
    seconds: a % 60
  };
}
function Hb({ pinned: e = !1, popoverOpen: n = !1, focusWithin: o = !1 } = {}) {
  return !e && !n && !o;
}
function Wb(e, n) {
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
function Gb({
  audioPlaying: e,
  canAddTime: n,
  isRunning: o,
  pinned: i,
  onAddFiveMinutes: a,
  onExit: c,
  onOpen: d,
  onSkip: f,
  onToggleAudio: y,
  onTogglePinned: v,
  onToggleTimer: S
}) {
  return /* @__PURE__ */ w.jsxs("div", { className: "focus-mode-controls", "aria-label": "Focus Mode controls", children: [
    /* @__PURE__ */ w.jsx(Vt, { label: o ? "Pause timer" : "Start timer", onClick: S, primary: !0, children: o ? /* @__PURE__ */ w.jsx(Ta, { size: 17, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(Od, { size: 17, fill: "currentColor", "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(Vt, { label: "Add five minutes", onClick: a, disabled: !n, children: /* @__PURE__ */ w.jsx(pC, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(Vt, { label: "Skip to next phase", onClick: f, children: /* @__PURE__ */ w.jsx(Ld, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(Vt, { label: e ? "Mute room audio" : "Resume room audio", onClick: y, pressed: e, children: e ? /* @__PURE__ */ w.jsx(Ia, { size: 17, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(lE, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(Vt, { label: "Quick Note", onClick: () => d("note"), children: /* @__PURE__ */ w.jsx(BC, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(Vt, { label: "Session tasks", onClick: () => d("tasks"), children: /* @__PURE__ */ w.jsx(nE, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(Vt, { label: "Change scene", onClick: () => d("scene"), children: /* @__PURE__ */ w.jsx(NC, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(Vt, { label: "Sound settings", onClick: () => d("audio"), children: /* @__PURE__ */ w.jsx(r0, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(Vt, { label: "Keyboard shortcuts", onClick: () => d("shortcuts"), children: /* @__PURE__ */ w.jsx(_C, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(Vt, { label: i ? "Unpin controls" : "Pin controls", onClick: v, pressed: i, children: i ? /* @__PURE__ */ w.jsx(FC, { size: 17, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(jC, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(Vt, { label: "Exit Focus Mode", onClick: c, children: /* @__PURE__ */ w.jsx(LC, { size: 17, "aria-hidden": "true" }) })
  ] });
}
function ni({ id: e, title: n, onClose: o, children: i }) {
  const a = `focus-mode-${e}-title`;
  return /* @__PURE__ */ w.jsxs("section", { className: "focus-mode-popover", role: "dialog", "aria-modal": "false", "aria-labelledby": a, children: [
    /* @__PURE__ */ w.jsxs("header", { className: "focus-mode-popover-head", children: [
      /* @__PURE__ */ w.jsx("h2", { id: a, children: n }),
      /* @__PURE__ */ w.jsx("button", { type: "button", onClick: o, "aria-label": `Close ${n}`, children: /* @__PURE__ */ w.jsx(s0, { size: 16, "aria-hidden": "true" }) })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "focus-mode-popover-body", children: i })
  ] });
}
const Kb = [
  ["Space", "Start or pause timer"],
  ["M", "Mute or resume audio"],
  ["N", "Quick Note"],
  ["T", "Session tasks"],
  ["S", "Change scene"],
  ["?", "Keyboard shortcuts"],
  ["Esc", "Close panel or exit Focus Mode"]
];
function Yb({ audioState: e, onExit: n }) {
  const o = $((W) => W.selectedMaterial), i = $((W) => W.studyGoal), a = $((W) => W.studyPlan), c = $((W) => W.completedTasks), d = $((W) => W.workspaceNotes), f = $((W) => W.workspaceUpdatedAt), y = $((W) => W.elapsedSeconds), v = $((W) => W.pomodoroDuration), S = $((W) => W.timerDurationSeconds), l = $((W) => W.timerMode), h = $((W) => W.timerState), g = $((W) => W.currentSession), x = $((W) => W.audioPlaying), k = $((W) => W.startTimer), T = $((W) => W.pauseTimer), A = $((W) => W.skipTimer), R = $((W) => W.setSessionDuration), b = $((W) => W.toggleAudio), D = $((W) => W.setWorkspaceNotes), L = $((W) => W.toggleTask), [X, Z] = C.useState(!0), [U, G] = C.useState(!1), [Q, J] = C.useState(""), ce = C.useRef(null), ye = C.useRef(null), he = h === "running", we = l === "countup" ? 0 : Number(S) || (Number(v) || 0) * 60, ue = l === "countup" ? y : Math.max(0, we - y), ge = we ? Math.min(100, Math.max(0, y / we * 100)) : 0, V = C.useMemo(
    () => Wb(a, c),
    [c, a]
  ), q = C.useCallback(() => {
    ye.current && (globalThis.clearTimeout(ye.current), ye.current = null);
  }, []), K = C.useCallback(() => {
    q(), ye.current = globalThis.setTimeout(() => {
      var pe, ve;
      const W = !!((ve = ce.current) != null && ve.contains((pe = globalThis.document) == null ? void 0 : pe.activeElement));
      Hb({ pinned: U, popoverOpen: !!Q, focusWithin: W }) && Z(!1);
    }, Vb);
  }, [Q, q, U]), E = C.useCallback(() => {
    Z(!0), K();
  }, [K]), O = C.useCallback(() => {
    he ? T() : k();
  }, [he, T, k]), le = C.useCallback(() => {
    if (l === "countup") return;
    const W = $b(we);
    R(W.minutes, W.seconds);
  }, [R, l, we]), fe = C.useCallback((W) => {
    J(W), Z(!0), q();
  }, [q]), me = C.useCallback(() => {
    J(""), K();
  }, [K]);
  C.useEffect(() => {
    var pe, ve, De;
    const W = () => E();
    return (pe = globalThis.addEventListener) == null || pe.call(globalThis, "pointermove", W, { passive: !0 }), (ve = globalThis.addEventListener) == null || ve.call(globalThis, "pointerdown", W, { passive: !0 }), (De = globalThis.addEventListener) == null || De.call(globalThis, "focusin", W), K(), () => {
      var Kn, co, Yn;
      q(), (Kn = globalThis.removeEventListener) == null || Kn.call(globalThis, "pointermove", W), (co = globalThis.removeEventListener) == null || co.call(globalThis, "pointerdown", W), (Yn = globalThis.removeEventListener) == null || Yn.call(globalThis, "focusin", W);
    };
  }, [q, E, K]), C.useEffect(() => {
    var pe;
    const W = (ve) => {
      const De = Bb(ve);
      De && (ve.preventDefault(), E(), De === "toggle-timer" && O(), De === "toggle-audio" && b(), ["note", "tasks", "scene", "shortcuts"].includes(De) && fe(De), De === "escape" && (Q ? me() : n == null || n()));
    };
    return (pe = globalThis.addEventListener) == null || pe.call(globalThis, "keydown", W), () => {
      var ve;
      return (ve = globalThis.removeEventListener) == null ? void 0 : ve.call(globalThis, "keydown", W);
    };
  }, [Q, me, n, fe, E, b, O]), C.useEffect(() => {
    U || Q ? (q(), Z(!0)) : K();
  }, [Q, q, U, K]);
  const xe = Q === "note" ? /* @__PURE__ */ w.jsxs(ni, { id: "note", title: "Quick Note", onClose: me, children: [
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
    /* @__PURE__ */ w.jsx("small", { children: f ? "Autosaved just now" : "Autosave on" })
  ] }) : Q === "tasks" ? /* @__PURE__ */ w.jsx(ni, { id: "tasks", title: "Session tasks", onClose: me, children: a.length ? /* @__PURE__ */ w.jsx("div", { className: "focus-mode-task-list", children: a.map((W, pe) => {
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
  }) }) : /* @__PURE__ */ w.jsx("p", { className: "focus-mode-empty", children: "Add a study topic from the workspace to receive a session task plan." }) }) : Q === "scene" ? /* @__PURE__ */ w.jsx(ni, { id: "scene", title: "Change scene", onClose: me, children: /* @__PURE__ */ w.jsx(zd, {}) }) : Q === "audio" ? /* @__PURE__ */ w.jsx(ni, { id: "audio", title: "Sound settings", onClose: me, children: /* @__PURE__ */ w.jsx(oS, { audioState: e }) }) : Q === "shortcuts" ? /* @__PURE__ */ w.jsx(ni, { id: "shortcuts", title: "Keyboard shortcuts", onClose: me, children: /* @__PURE__ */ w.jsx("dl", { className: "focus-mode-shortcuts", children: Kb.map(([W, pe]) => /* @__PURE__ */ w.jsxs("div", { children: [
    /* @__PURE__ */ w.jsx("dt", { children: /* @__PURE__ */ w.jsx("kbd", { children: W }) }),
    /* @__PURE__ */ w.jsx("dd", { children: pe })
  ] }, W)) }) }) : null;
  return /* @__PURE__ */ w.jsxs(
    "aside",
    {
      ref: ce,
      className: `focus-mode-hud liquid-glass ${X ? "has-controls" : "is-quiet"} ${U ? "is-pinned" : ""}`.trim(),
      "aria-label": "Enhanced Focus Mode",
      onPointerEnter: E,
      onFocusCapture: E,
      children: [
        /* @__PURE__ */ w.jsxs("div", { className: "focus-mode-primary", children: [
          /* @__PURE__ */ w.jsxs("div", { className: "focus-mode-session-line", children: [
            /* @__PURE__ */ w.jsxs("span", { children: [
              "POMODORO #",
              (g == null ? void 0 : g.pomodoroNumber) || 1
            ] }),
            /* @__PURE__ */ w.jsxs("span", { className: `focus-mode-state ${he ? "is-running" : ""}`, children: [
              /* @__PURE__ */ w.jsx("i", {}),
              he ? "In focus" : h === "paused" ? "Paused" : "Ready"
            ] })
          ] }),
          /* @__PURE__ */ w.jsx("p", { className: "focus-mode-topic", children: Ub(o) }),
          /* @__PURE__ */ w.jsx("strong", { className: "focus-mode-clock", children: ui(ue) }),
          /* @__PURE__ */ w.jsx("div", { className: "focus-mode-progress", "aria-label": `${Math.round(ge)}% complete`, children: /* @__PURE__ */ w.jsx("span", { style: { width: `${ge}%` } }) }),
          /* @__PURE__ */ w.jsx("p", { className: "focus-mode-goal", children: i || "A quiet block for meaningful progress" }),
          /* @__PURE__ */ w.jsx("small", { children: V.total ? `${V.completed}/${V.total} tasks` : l === "countup" ? "Count-up session" : `${v} min session` })
        ] }),
        /* @__PURE__ */ w.jsx("div", { className: "focus-mode-reveal", "aria-hidden": !X, children: /* @__PURE__ */ w.jsx(
          Gb,
          {
            audioPlaying: x,
            canAddTime: l !== "countup",
            isRunning: he,
            pinned: U,
            onAddFiveMinutes: le,
            onExit: n,
            onOpen: fe,
            onSkip: A,
            onToggleAudio: b,
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
var lc = {};
/*!
 *  howler.js v2.2.4
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */
var Wy;
function Qb() {
  return Wy || (Wy = 1, (function(e) {
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
          var h = this || o;
          if (l = parseFloat(l), h.ctx || S(), typeof l < "u" && l >= 0 && l <= 1) {
            if (h._volume = l, h._muted)
              return h;
            h.usingWebAudio && h.masterGain.gain.setValueAtTime(l, o.ctx.currentTime);
            for (var g = 0; g < h._howls.length; g++)
              if (!h._howls[g]._webAudio)
                for (var x = h._howls[g]._getSoundIds(), k = 0; k < x.length; k++) {
                  var T = h._howls[g]._soundById(x[k]);
                  T && T._node && (T._node.volume = T._volume * l);
                }
            return h;
          }
          return h._volume;
        },
        /**
         * Handle muting and unmuting globally.
         * @param  {Boolean} muted Is muted or not.
         */
        mute: function(l) {
          var h = this || o;
          h.ctx || S(), h._muted = l, h.usingWebAudio && h.masterGain.gain.setValueAtTime(l ? 0 : h._volume, o.ctx.currentTime);
          for (var g = 0; g < h._howls.length; g++)
            if (!h._howls[g]._webAudio)
              for (var x = h._howls[g]._getSoundIds(), k = 0; k < x.length; k++) {
                var T = h._howls[g]._soundById(x[k]);
                T && T._node && (T._node.muted = l ? !0 : T._muted);
              }
          return h;
        },
        /**
         * Handle stopping all sounds globally.
         */
        stop: function() {
          for (var l = this || o, h = 0; h < l._howls.length; h++)
            l._howls[h].stop();
          return l;
        },
        /**
         * Unload and destroy all currently loaded Howl objects.
         * @return {Howler}
         */
        unload: function() {
          for (var l = this || o, h = l._howls.length - 1; h >= 0; h--)
            l._howls[h].unload();
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
                var h = new Audio();
                typeof h.oncanplaythrough > "u" && (l._canPlayEvent = "canplay");
              } catch {
                l.noAudio = !0;
              }
            else
              l.noAudio = !0;
          try {
            var h = new Audio();
            h.muted && (l.noAudio = !0);
          } catch {
          }
          return l.noAudio || l._setupCodecs(), l;
        },
        /**
         * Check for browser support for various codecs and cache the results.
         * @return {Howler}
         */
        _setupCodecs: function() {
          var l = this || o, h = null;
          try {
            h = typeof Audio < "u" ? new Audio() : null;
          } catch {
            return l;
          }
          if (!h || typeof h.canPlayType != "function")
            return l;
          var g = h.canPlayType("audio/mpeg;").replace(/^no$/, ""), x = l._navigator ? l._navigator.userAgent : "", k = x.match(/OPR\/(\d+)/g), T = k && parseInt(k[0].split("/")[1], 10) < 33, A = x.indexOf("Safari") !== -1 && x.indexOf("Chrome") === -1, R = x.match(/Version\/(.*?) /), b = A && R && parseInt(R[1], 10) < 15;
          return l._codecs = {
            mp3: !!(!T && (g || h.canPlayType("audio/mp3;").replace(/^no$/, ""))),
            mpeg: !!g,
            opus: !!h.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, ""),
            ogg: !!h.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ""),
            oga: !!h.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ""),
            wav: !!(h.canPlayType('audio/wav; codecs="1"') || h.canPlayType("audio/wav")).replace(/^no$/, ""),
            aac: !!h.canPlayType("audio/aac;").replace(/^no$/, ""),
            caf: !!h.canPlayType("audio/x-caf;").replace(/^no$/, ""),
            m4a: !!(h.canPlayType("audio/x-m4a;") || h.canPlayType("audio/m4a;") || h.canPlayType("audio/aac;")).replace(/^no$/, ""),
            m4b: !!(h.canPlayType("audio/x-m4b;") || h.canPlayType("audio/m4b;") || h.canPlayType("audio/aac;")).replace(/^no$/, ""),
            mp4: !!(h.canPlayType("audio/x-mp4;") || h.canPlayType("audio/mp4;") || h.canPlayType("audio/aac;")).replace(/^no$/, ""),
            weba: !!(!b && h.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, "")),
            webm: !!(!b && h.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, "")),
            dolby: !!h.canPlayType('audio/mp4; codecs="ec-3"').replace(/^no$/, ""),
            flac: !!(h.canPlayType("audio/x-flac;") || h.canPlayType("audio/flac;")).replace(/^no$/, "")
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
            var h = function(g) {
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
                  for (var T = l._howls[k]._getSoundIds(), A = 0; A < T.length; A++) {
                    var R = l._howls[k]._soundById(T[A]);
                    R && R._node && !R._node._unlocked && (R._node._unlocked = !0, R._node.load());
                  }
              l._autoResume();
              var b = l.ctx.createBufferSource();
              b.buffer = l._scratchBuffer, b.connect(l.ctx.destination), typeof b.start > "u" ? b.noteOn(0) : b.start(0), typeof l.ctx.resume == "function" && l.ctx.resume(), b.onended = function() {
                b.disconnect(0), l._audioUnlocked = !0, document.removeEventListener("touchstart", h, !0), document.removeEventListener("touchend", h, !0), document.removeEventListener("click", h, !0), document.removeEventListener("keydown", h, !0);
                for (var D = 0; D < l._howls.length; D++)
                  l._howls[D]._emit("unlock");
              };
            };
            return document.addEventListener("touchstart", h, !0), document.addEventListener("touchend", h, !0), document.addEventListener("click", h, !0), document.addEventListener("keydown", h, !0), l;
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
          var h = new Audio().play();
          return h && typeof Promise < "u" && (h instanceof Promise || typeof h.then == "function") && h.catch(function() {
            console.warn("HTML5 Audio pool exhausted, returning potentially locked audio object.");
          }), new Audio();
        },
        /**
         * Return an activated HTML5 Audio object to the pool.
         * @return {Howler}
         */
        _releaseHtml5Audio: function(l) {
          var h = this || o;
          return l._unlocked && h._html5AudioPool.push(l), h;
        },
        /**
         * Automatically suspend the Web Audio AudioContext after no sound has played for 30 seconds.
         * This saves processing/energy and fixes various browser-specific bugs with audio getting stuck.
         * @return {Howler}
         */
        _autoSuspend: function() {
          var l = this;
          if (!(!l.autoSuspend || !l.ctx || typeof l.ctx.suspend > "u" || !o.usingWebAudio)) {
            for (var h = 0; h < l._howls.length; h++)
              if (l._howls[h]._webAudio) {
                for (var g = 0; g < l._howls[h]._sounds.length; g++)
                  if (!l._howls[h]._sounds[g]._paused)
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
              for (var h = 0; h < l._howls.length; h++)
                l._howls[h]._emit("resume");
            }), l._suspendTimer && (clearTimeout(l._suspendTimer), l._suspendTimer = null)) : l.state === "suspending" && (l._resumeAfterSuspend = !0), l;
        }
      };
      var o = new n(), i = function(l) {
        var h = this;
        if (!l.src || l.src.length === 0) {
          console.error("An array of source files must be passed with any new Howl.");
          return;
        }
        h.init(l);
      };
      i.prototype = {
        /**
         * Initialize a new Howl group object.
         * @param  {Object} o Passed in properties for this group.
         * @return {Howl}
         */
        init: function(l) {
          var h = this;
          return o.ctx || S(), h._autoplay = l.autoplay || !1, h._format = typeof l.format != "string" ? l.format : [l.format], h._html5 = l.html5 || !1, h._muted = l.mute || !1, h._loop = l.loop || !1, h._pool = l.pool || 5, h._preload = typeof l.preload == "boolean" || l.preload === "metadata" ? l.preload : !0, h._rate = l.rate || 1, h._sprite = l.sprite || {}, h._src = typeof l.src != "string" ? l.src : [l.src], h._volume = l.volume !== void 0 ? l.volume : 1, h._xhr = {
            method: l.xhr && l.xhr.method ? l.xhr.method : "GET",
            headers: l.xhr && l.xhr.headers ? l.xhr.headers : null,
            withCredentials: l.xhr && l.xhr.withCredentials ? l.xhr.withCredentials : !1
          }, h._duration = 0, h._state = "unloaded", h._sounds = [], h._endTimers = {}, h._queue = [], h._playLock = !1, h._onend = l.onend ? [{ fn: l.onend }] : [], h._onfade = l.onfade ? [{ fn: l.onfade }] : [], h._onload = l.onload ? [{ fn: l.onload }] : [], h._onloaderror = l.onloaderror ? [{ fn: l.onloaderror }] : [], h._onplayerror = l.onplayerror ? [{ fn: l.onplayerror }] : [], h._onpause = l.onpause ? [{ fn: l.onpause }] : [], h._onplay = l.onplay ? [{ fn: l.onplay }] : [], h._onstop = l.onstop ? [{ fn: l.onstop }] : [], h._onmute = l.onmute ? [{ fn: l.onmute }] : [], h._onvolume = l.onvolume ? [{ fn: l.onvolume }] : [], h._onrate = l.onrate ? [{ fn: l.onrate }] : [], h._onseek = l.onseek ? [{ fn: l.onseek }] : [], h._onunlock = l.onunlock ? [{ fn: l.onunlock }] : [], h._onresume = [], h._webAudio = o.usingWebAudio && !h._html5, typeof o.ctx < "u" && o.ctx && o.autoUnlock && o._unlockAudio(), o._howls.push(h), h._autoplay && h._queue.push({
            event: "play",
            action: function() {
              h.play();
            }
          }), h._preload && h._preload !== "none" && h.load(), h;
        },
        /**
         * Load the audio file.
         * @return {Howler}
         */
        load: function() {
          var l = this, h = null;
          if (o.noAudio) {
            l._emit("loaderror", null, "No audio support.");
            return;
          }
          typeof l._src == "string" && (l._src = [l._src]);
          for (var g = 0; g < l._src.length; g++) {
            var x, k;
            if (l._format && l._format[g])
              x = l._format[g];
            else {
              if (k = l._src[g], typeof k != "string") {
                l._emit("loaderror", null, "Non-string found in selected audio sources - ignoring.");
                continue;
              }
              x = /^data:audio\/([^;,]+);/i.exec(k), x || (x = /\.([^.]+)$/.exec(k.split("?", 1)[0])), x && (x = x[1].toLowerCase());
            }
            if (x || console.warn('No file extension was found. Consider using the "format" property or specify an extension.'), x && o.codecs(x)) {
              h = l._src[g];
              break;
            }
          }
          if (!h) {
            l._emit("loaderror", null, "No codec support for selected audio sources.");
            return;
          }
          return l._src = h, l._state = "loading", window.location.protocol === "https:" && h.slice(0, 5) === "http:" && (l._html5 = !0, l._webAudio = !1), new a(l), l._webAudio && d(l), l;
        },
        /**
         * Play a sound or resume previous playback.
         * @param  {String/Number} sprite   Sprite name for sprite playback or sound id to continue previous.
         * @param  {Boolean} internal Internal Use: true prevents event firing.
         * @return {Number}          Sound ID.
         */
        play: function(l, h) {
          var g = this, x = null;
          if (typeof l == "number")
            x = l, l = null;
          else {
            if (typeof l == "string" && g._state === "loaded" && !g._sprite[l])
              return null;
            if (typeof l > "u" && (l = "__default", !g._playLock)) {
              for (var k = 0, T = 0; T < g._sounds.length; T++)
                g._sounds[T]._paused && !g._sounds[T]._ended && (k++, x = g._sounds[T]._id);
              k === 1 ? l = null : x = null;
            }
          }
          var A = x ? g._soundById(x) : g._inactiveSound();
          if (!A)
            return null;
          if (x && !l && (l = A._sprite || "__default"), g._state !== "loaded") {
            A._sprite = l, A._ended = !1;
            var R = A._id;
            return g._queue.push({
              event: "play",
              action: function() {
                g.play(R);
              }
            }), R;
          }
          if (x && !A._paused)
            return h || g._loadQueue("play"), A._id;
          g._webAudio && o._autoResume();
          var b = Math.max(0, A._seek > 0 ? A._seek : g._sprite[l][0] / 1e3), D = Math.max(0, (g._sprite[l][0] + g._sprite[l][1]) / 1e3 - b), L = D * 1e3 / Math.abs(A._rate), X = g._sprite[l][0] / 1e3, Z = (g._sprite[l][0] + g._sprite[l][1]) / 1e3;
          A._sprite = l, A._ended = !1;
          var U = function() {
            A._paused = !1, A._seek = b, A._start = X, A._stop = Z, A._loop = !!(A._loop || g._sprite[l][2]);
          };
          if (b >= Z) {
            g._ended(A);
            return;
          }
          var G = A._node;
          if (g._webAudio) {
            var Q = function() {
              g._playLock = !1, U(), g._refreshBuffer(A);
              var he = A._muted || g._muted ? 0 : A._volume;
              G.gain.setValueAtTime(he, o.ctx.currentTime), A._playStart = o.ctx.currentTime, typeof G.bufferSource.start > "u" ? A._loop ? G.bufferSource.noteGrainOn(0, b, 86400) : G.bufferSource.noteGrainOn(0, b, D) : A._loop ? G.bufferSource.start(0, b, 86400) : G.bufferSource.start(0, b, D), L !== 1 / 0 && (g._endTimers[A._id] = setTimeout(g._ended.bind(g, A), L)), h || setTimeout(function() {
                g._emit("play", A._id), g._loadQueue();
              }, 0);
            };
            o.state === "running" && o.ctx.state !== "interrupted" ? Q() : (g._playLock = !0, g.once("resume", Q), g._clearTimer(A._id));
          } else {
            var J = function() {
              G.currentTime = b, G.muted = A._muted || g._muted || o._muted || G.muted, G.volume = A._volume * o.volume(), G.playbackRate = A._rate;
              try {
                var he = G.play();
                if (he && typeof Promise < "u" && (he instanceof Promise || typeof he.then == "function") ? (g._playLock = !0, U(), he.then(function() {
                  g._playLock = !1, G._unlocked = !0, h ? g._loadQueue() : g._emit("play", A._id);
                }).catch(function() {
                  g._playLock = !1, g._emit("playerror", A._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction."), A._ended = !0, A._paused = !0;
                })) : h || (g._playLock = !1, U(), g._emit("play", A._id)), G.playbackRate = A._rate, G.paused) {
                  g._emit("playerror", A._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.");
                  return;
                }
                l !== "__default" || A._loop ? g._endTimers[A._id] = setTimeout(g._ended.bind(g, A), L) : (g._endTimers[A._id] = function() {
                  g._ended(A), G.removeEventListener("ended", g._endTimers[A._id], !1);
                }, G.addEventListener("ended", g._endTimers[A._id], !1));
              } catch (we) {
                g._emit("playerror", A._id, we);
              }
            };
            G.src === "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA" && (G.src = g._src, G.load());
            var ce = window && window.ejecta || !G.readyState && o._navigator.isCocoonJS;
            if (G.readyState >= 3 || ce)
              J();
            else {
              g._playLock = !0, g._state = "loading";
              var ye = function() {
                g._state = "loaded", J(), G.removeEventListener(o._canPlayEvent, ye, !1);
              };
              G.addEventListener(o._canPlayEvent, ye, !1), g._clearTimer(A._id);
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
          var h = this;
          if (h._state !== "loaded" || h._playLock)
            return h._queue.push({
              event: "pause",
              action: function() {
                h.pause(l);
              }
            }), h;
          for (var g = h._getSoundIds(l), x = 0; x < g.length; x++) {
            h._clearTimer(g[x]);
            var k = h._soundById(g[x]);
            if (k && !k._paused && (k._seek = h.seek(g[x]), k._rateSeek = 0, k._paused = !0, h._stopFade(g[x]), k._node))
              if (h._webAudio) {
                if (!k._node.bufferSource)
                  continue;
                typeof k._node.bufferSource.stop > "u" ? k._node.bufferSource.noteOff(0) : k._node.bufferSource.stop(0), h._cleanBuffer(k._node);
              } else (!isNaN(k._node.duration) || k._node.duration === 1 / 0) && k._node.pause();
            arguments[1] || h._emit("pause", k ? k._id : null);
          }
          return h;
        },
        /**
         * Stop playback and reset to start.
         * @param  {Number} id The sound ID (empty to stop all in group).
         * @param  {Boolean} internal Internal Use: true prevents event firing.
         * @return {Howl}
         */
        stop: function(l, h) {
          var g = this;
          if (g._state !== "loaded" || g._playLock)
            return g._queue.push({
              event: "stop",
              action: function() {
                g.stop(l);
              }
            }), g;
          for (var x = g._getSoundIds(l), k = 0; k < x.length; k++) {
            g._clearTimer(x[k]);
            var T = g._soundById(x[k]);
            T && (T._seek = T._start || 0, T._rateSeek = 0, T._paused = !0, T._ended = !0, g._stopFade(x[k]), T._node && (g._webAudio ? T._node.bufferSource && (typeof T._node.bufferSource.stop > "u" ? T._node.bufferSource.noteOff(0) : T._node.bufferSource.stop(0), g._cleanBuffer(T._node)) : (!isNaN(T._node.duration) || T._node.duration === 1 / 0) && (T._node.currentTime = T._start || 0, T._node.pause(), T._node.duration === 1 / 0 && g._clearSound(T._node))), h || g._emit("stop", T._id));
          }
          return g;
        },
        /**
         * Mute/unmute a single sound or all sounds in this Howl group.
         * @param  {Boolean} muted Set to true to mute and false to unmute.
         * @param  {Number} id    The sound ID to update (omit to mute/unmute all).
         * @return {Howl}
         */
        mute: function(l, h) {
          var g = this;
          if (g._state !== "loaded" || g._playLock)
            return g._queue.push({
              event: "mute",
              action: function() {
                g.mute(l, h);
              }
            }), g;
          if (typeof h > "u")
            if (typeof l == "boolean")
              g._muted = l;
            else
              return g._muted;
          for (var x = g._getSoundIds(h), k = 0; k < x.length; k++) {
            var T = g._soundById(x[k]);
            T && (T._muted = l, T._interval && g._stopFade(T._id), g._webAudio && T._node ? T._node.gain.setValueAtTime(l ? 0 : T._volume, o.ctx.currentTime) : T._node && (T._node.muted = o._muted ? !0 : l), g._emit("mute", T._id));
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
          var l = this, h = arguments, g, x;
          if (h.length === 0)
            return l._volume;
          if (h.length === 1 || h.length === 2 && typeof h[1] > "u") {
            var k = l._getSoundIds(), T = k.indexOf(h[0]);
            T >= 0 ? x = parseInt(h[0], 10) : g = parseFloat(h[0]);
          } else h.length >= 2 && (g = parseFloat(h[0]), x = parseInt(h[1], 10));
          var A;
          if (typeof g < "u" && g >= 0 && g <= 1) {
            if (l._state !== "loaded" || l._playLock)
              return l._queue.push({
                event: "volume",
                action: function() {
                  l.volume.apply(l, h);
                }
              }), l;
            typeof x > "u" && (l._volume = g), x = l._getSoundIds(x);
            for (var R = 0; R < x.length; R++)
              A = l._soundById(x[R]), A && (A._volume = g, h[2] || l._stopFade(x[R]), l._webAudio && A._node && !A._muted ? A._node.gain.setValueAtTime(g, o.ctx.currentTime) : A._node && !A._muted && (A._node.volume = g * o.volume()), l._emit("volume", A._id));
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
        fade: function(l, h, g, x) {
          var k = this;
          if (k._state !== "loaded" || k._playLock)
            return k._queue.push({
              event: "fade",
              action: function() {
                k.fade(l, h, g, x);
              }
            }), k;
          l = Math.min(Math.max(0, parseFloat(l)), 1), h = Math.min(Math.max(0, parseFloat(h)), 1), g = parseFloat(g), k.volume(l, x);
          for (var T = k._getSoundIds(x), A = 0; A < T.length; A++) {
            var R = k._soundById(T[A]);
            if (R) {
              if (x || k._stopFade(T[A]), k._webAudio && !R._muted) {
                var b = o.ctx.currentTime, D = b + g / 1e3;
                R._volume = l, R._node.gain.setValueAtTime(l, b), R._node.gain.linearRampToValueAtTime(h, D);
              }
              k._startFadeInterval(R, l, h, g, T[A], typeof x > "u");
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
        _startFadeInterval: function(l, h, g, x, k, T) {
          var A = this, R = h, b = g - h, D = Math.abs(b / 0.01), L = Math.max(4, D > 0 ? x / D : x), X = Date.now();
          l._fadeTo = g, l._interval = setInterval(function() {
            var Z = (Date.now() - X) / x;
            X = Date.now(), R += b * Z, R = Math.round(R * 100) / 100, b < 0 ? R = Math.max(g, R) : R = Math.min(g, R), A._webAudio ? l._volume = R : A.volume(R, l._id, !0), T && (A._volume = R), (g < h && R <= g || g > h && R >= g) && (clearInterval(l._interval), l._interval = null, l._fadeTo = null, A.volume(g, l._id), A._emit("fade", l._id));
          }, L);
        },
        /**
         * Internal method that stops the currently playing fade when
         * a new fade starts, volume is changed or the sound is stopped.
         * @param  {Number} id The sound id.
         * @return {Howl}
         */
        _stopFade: function(l) {
          var h = this, g = h._soundById(l);
          return g && g._interval && (h._webAudio && g._node.gain.cancelScheduledValues(o.ctx.currentTime), clearInterval(g._interval), g._interval = null, h.volume(g._fadeTo, l), g._fadeTo = null, h._emit("fade", l)), h;
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
          var l = this, h = arguments, g, x, k;
          if (h.length === 0)
            return l._loop;
          if (h.length === 1)
            if (typeof h[0] == "boolean")
              g = h[0], l._loop = g;
            else
              return k = l._soundById(parseInt(h[0], 10)), k ? k._loop : !1;
          else h.length === 2 && (g = h[0], x = parseInt(h[1], 10));
          for (var T = l._getSoundIds(x), A = 0; A < T.length; A++)
            k = l._soundById(T[A]), k && (k._loop = g, l._webAudio && k._node && k._node.bufferSource && (k._node.bufferSource.loop = g, g && (k._node.bufferSource.loopStart = k._start || 0, k._node.bufferSource.loopEnd = k._stop, l.playing(T[A]) && (l.pause(T[A], !0), l.play(T[A], !0)))));
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
          var l = this, h = arguments, g, x;
          if (h.length === 0)
            x = l._sounds[0]._id;
          else if (h.length === 1) {
            var k = l._getSoundIds(), T = k.indexOf(h[0]);
            T >= 0 ? x = parseInt(h[0], 10) : g = parseFloat(h[0]);
          } else h.length === 2 && (g = parseFloat(h[0]), x = parseInt(h[1], 10));
          var A;
          if (typeof g == "number") {
            if (l._state !== "loaded" || l._playLock)
              return l._queue.push({
                event: "rate",
                action: function() {
                  l.rate.apply(l, h);
                }
              }), l;
            typeof x > "u" && (l._rate = g), x = l._getSoundIds(x);
            for (var R = 0; R < x.length; R++)
              if (A = l._soundById(x[R]), A) {
                l.playing(x[R]) && (A._rateSeek = l.seek(x[R]), A._playStart = l._webAudio ? o.ctx.currentTime : A._playStart), A._rate = g, l._webAudio && A._node && A._node.bufferSource ? A._node.bufferSource.playbackRate.setValueAtTime(g, o.ctx.currentTime) : A._node && (A._node.playbackRate = g);
                var b = l.seek(x[R]), D = (l._sprite[A._sprite][0] + l._sprite[A._sprite][1]) / 1e3 - b, L = D * 1e3 / Math.abs(A._rate);
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
          var l = this, h = arguments, g, x;
          if (h.length === 0)
            l._sounds.length && (x = l._sounds[0]._id);
          else if (h.length === 1) {
            var k = l._getSoundIds(), T = k.indexOf(h[0]);
            T >= 0 ? x = parseInt(h[0], 10) : l._sounds.length && (x = l._sounds[0]._id, g = parseFloat(h[0]));
          } else h.length === 2 && (g = parseFloat(h[0]), x = parseInt(h[1], 10));
          if (typeof x > "u")
            return 0;
          if (typeof g == "number" && (l._state !== "loaded" || l._playLock))
            return l._queue.push({
              event: "seek",
              action: function() {
                l.seek.apply(l, h);
              }
            }), l;
          var A = l._soundById(x);
          if (A)
            if (typeof g == "number" && g >= 0) {
              var R = l.playing(x);
              R && l.pause(x, !0), A._seek = g, A._ended = !1, l._clearTimer(x), !l._webAudio && A._node && !isNaN(A._node.duration) && (A._node.currentTime = g);
              var b = function() {
                R && l.play(x, !0), l._emit("seek", x);
              };
              if (R && !l._webAudio) {
                var D = function() {
                  l._playLock ? setTimeout(D, 0) : b();
                };
                setTimeout(D, 0);
              } else
                b();
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
          var h = this;
          if (typeof l == "number") {
            var g = h._soundById(l);
            return g ? !g._paused : !1;
          }
          for (var x = 0; x < h._sounds.length; x++)
            if (!h._sounds[x]._paused)
              return !0;
          return !1;
        },
        /**
         * Get the duration of this sound. Passing a sound id will return the sprite duration.
         * @param  {Number} id The sound id to check. If none is passed, return full source duration.
         * @return {Number} Audio duration in seconds.
         */
        duration: function(l) {
          var h = this, g = h._duration, x = h._soundById(l);
          return x && (g = h._sprite[x._sprite][1] / 1e3), g;
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
          for (var l = this, h = l._sounds, g = 0; g < h.length; g++)
            h[g]._paused || l.stop(h[g]._id), l._webAudio || (l._clearSound(h[g]._node), h[g]._node.removeEventListener("error", h[g]._errorFn, !1), h[g]._node.removeEventListener(o._canPlayEvent, h[g]._loadFn, !1), h[g]._node.removeEventListener("ended", h[g]._endFn, !1), o._releaseHtml5Audio(h[g]._node)), delete h[g]._node, l._clearTimer(h[g]._id);
          var x = o._howls.indexOf(l);
          x >= 0 && o._howls.splice(x, 1);
          var k = !0;
          for (g = 0; g < o._howls.length; g++)
            if (o._howls[g]._src === l._src || l._src.indexOf(o._howls[g]._src) >= 0) {
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
        on: function(l, h, g, x) {
          var k = this, T = k["_on" + l];
          return typeof h == "function" && T.push(x ? { id: g, fn: h, once: x } : { id: g, fn: h }), k;
        },
        /**
         * Remove a custom event. Call without parameters to remove all events.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to remove. Leave empty to remove all.
         * @param  {Number}   id    (optional) Only remove events for this sound.
         * @return {Howl}
         */
        off: function(l, h, g) {
          var x = this, k = x["_on" + l], T = 0;
          if (typeof h == "number" && (g = h, h = null), h || g)
            for (T = 0; T < k.length; T++) {
              var A = g === k[T].id;
              if (h === k[T].fn && A || !h && A) {
                k.splice(T, 1);
                break;
              }
            }
          else if (l)
            x["_on" + l] = [];
          else {
            var R = Object.keys(x);
            for (T = 0; T < R.length; T++)
              R[T].indexOf("_on") === 0 && Array.isArray(x[R[T]]) && (x[R[T]] = []);
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
        once: function(l, h, g) {
          var x = this;
          return x.on(l, h, g, 1), x;
        },
        /**
         * Emit all events of a specific type and pass the sound id.
         * @param  {String} event Event name.
         * @param  {Number} id    Sound ID.
         * @param  {Number} msg   Message to go with event.
         * @return {Howl}
         */
        _emit: function(l, h, g) {
          for (var x = this, k = x["_on" + l], T = k.length - 1; T >= 0; T--)
            (!k[T].id || k[T].id === h || l === "load") && (setTimeout((function(A) {
              A.call(this, h, g);
            }).bind(x, k[T].fn), 0), k[T].once && x.off(l, k[T].fn, k[T].id));
          return x._loadQueue(l), x;
        },
        /**
         * Queue of actions initiated before the sound has loaded.
         * These will be called in sequence, with the next only firing
         * after the previous has finished executing (even if async like play).
         * @return {Howl}
         */
        _loadQueue: function(l) {
          var h = this;
          if (h._queue.length > 0) {
            var g = h._queue[0];
            g.event === l && (h._queue.shift(), h._loadQueue()), l || g.action();
          }
          return h;
        },
        /**
         * Fired when playback ends at the end of the duration.
         * @param  {Sound} sound The sound object to work with.
         * @return {Howl}
         */
        _ended: function(l) {
          var h = this, g = l._sprite;
          if (!h._webAudio && l._node && !l._node.paused && !l._node.ended && l._node.currentTime < l._stop)
            return setTimeout(h._ended.bind(h, l), 100), h;
          var x = !!(l._loop || h._sprite[g][2]);
          if (h._emit("end", l._id), !h._webAudio && x && h.stop(l._id, !0).play(l._id), h._webAudio && x) {
            h._emit("play", l._id), l._seek = l._start || 0, l._rateSeek = 0, l._playStart = o.ctx.currentTime;
            var k = (l._stop - l._start) * 1e3 / Math.abs(l._rate);
            h._endTimers[l._id] = setTimeout(h._ended.bind(h, l), k);
          }
          return h._webAudio && !x && (l._paused = !0, l._ended = !0, l._seek = l._start || 0, l._rateSeek = 0, h._clearTimer(l._id), h._cleanBuffer(l._node), o._autoSuspend()), !h._webAudio && !x && h.stop(l._id, !0), h;
        },
        /**
         * Clear the end timer for a sound playback.
         * @param  {Number} id The sound ID.
         * @return {Howl}
         */
        _clearTimer: function(l) {
          var h = this;
          if (h._endTimers[l]) {
            if (typeof h._endTimers[l] != "function")
              clearTimeout(h._endTimers[l]);
            else {
              var g = h._soundById(l);
              g && g._node && g._node.removeEventListener("ended", h._endTimers[l], !1);
            }
            delete h._endTimers[l];
          }
          return h;
        },
        /**
         * Return the sound identified by this ID, or return null.
         * @param  {Number} id Sound ID
         * @return {Object}    Sound object or null.
         */
        _soundById: function(l) {
          for (var h = this, g = 0; g < h._sounds.length; g++)
            if (l === h._sounds[g]._id)
              return h._sounds[g];
          return null;
        },
        /**
         * Return an inactive sound from the pool or create a new one.
         * @return {Sound} Sound playback object.
         */
        _inactiveSound: function() {
          var l = this;
          l._drain();
          for (var h = 0; h < l._sounds.length; h++)
            if (l._sounds[h]._ended)
              return l._sounds[h].reset();
          return new a(l);
        },
        /**
         * Drain excess inactive sounds from the pool.
         */
        _drain: function() {
          var l = this, h = l._pool, g = 0, x = 0;
          if (!(l._sounds.length < h)) {
            for (x = 0; x < l._sounds.length; x++)
              l._sounds[x]._ended && g++;
            for (x = l._sounds.length - 1; x >= 0; x--) {
              if (g <= h)
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
          var h = this;
          if (typeof l > "u") {
            for (var g = [], x = 0; x < h._sounds.length; x++)
              g.push(h._sounds[x]._id);
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
          var h = this;
          return l._node.bufferSource = o.ctx.createBufferSource(), l._node.bufferSource.buffer = c[h._src], l._panner ? l._node.bufferSource.connect(l._panner) : l._node.bufferSource.connect(l._node), l._node.bufferSource.loop = l._loop, l._loop && (l._node.bufferSource.loopStart = l._start || 0, l._node.bufferSource.loopEnd = l._stop || 0), l._node.bufferSource.playbackRate.setValueAtTime(l._rate, o.ctx.currentTime), h;
        },
        /**
         * Prevent memory leaks by cleaning up the buffer source after playback.
         * @param  {Object} node Sound's audio node containing the buffer source.
         * @return {Howl}
         */
        _cleanBuffer: function(l) {
          var h = this, g = o._navigator && o._navigator.vendor.indexOf("Apple") >= 0;
          if (!l.bufferSource)
            return h;
          if (o._scratchBuffer && l.bufferSource && (l.bufferSource.onended = null, l.bufferSource.disconnect(0), g))
            try {
              l.bufferSource.buffer = o._scratchBuffer;
            } catch {
            }
          return l.bufferSource = null, h;
        },
        /**
         * Set the source to a 0-second silence to stop any downloading (except in IE).
         * @param  {Object} node Audio node to clear.
         */
        _clearSound: function(l) {
          var h = /MSIE |Trident\//.test(o._navigator && o._navigator.userAgent);
          h || (l.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
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
          var l = this, h = l._parent;
          return l._muted = h._muted, l._loop = h._loop, l._volume = h._volume, l._rate = h._rate, l._seek = 0, l._paused = !0, l._ended = !0, l._sprite = "__default", l._id = ++o._counter, h._sounds.push(l), l.create(), l;
        },
        /**
         * Create and setup a new sound object, whether HTML5 Audio or Web Audio.
         * @return {Sound}
         */
        create: function() {
          var l = this, h = l._parent, g = o._muted || l._muted || l._parent._muted ? 0 : l._volume;
          return h._webAudio ? (l._node = typeof o.ctx.createGain > "u" ? o.ctx.createGainNode() : o.ctx.createGain(), l._node.gain.setValueAtTime(g, o.ctx.currentTime), l._node.paused = !0, l._node.connect(o.masterGain)) : o.noAudio || (l._node = o._obtainHtml5Audio(), l._errorFn = l._errorListener.bind(l), l._node.addEventListener("error", l._errorFn, !1), l._loadFn = l._loadListener.bind(l), l._node.addEventListener(o._canPlayEvent, l._loadFn, !1), l._endFn = l._endListener.bind(l), l._node.addEventListener("ended", l._endFn, !1), l._node.src = h._src, l._node.preload = h._preload === !0 ? "auto" : h._preload, l._node.volume = g * o.volume(), l._node.load()), l;
        },
        /**
         * Reset the parameters of this sound to the original state (for recycle).
         * @return {Sound}
         */
        reset: function() {
          var l = this, h = l._parent;
          return l._muted = h._muted, l._loop = h._loop, l._volume = h._volume, l._rate = h._rate, l._seek = 0, l._rateSeek = 0, l._paused = !0, l._ended = !0, l._sprite = "__default", l._id = ++o._counter, l;
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
          var l = this, h = l._parent;
          h._duration = Math.ceil(l._node.duration * 10) / 10, Object.keys(h._sprite).length === 0 && (h._sprite = { __default: [0, h._duration * 1e3] }), h._state !== "loaded" && (h._state = "loaded", h._emit("load"), h._loadQueue()), l._node.removeEventListener(o._canPlayEvent, l._loadFn, !1);
        },
        /**
         * HTML5 Audio ended listener callback.
         */
        _endListener: function() {
          var l = this, h = l._parent;
          h._duration === 1 / 0 && (h._duration = Math.ceil(l._node.duration * 10) / 10, h._sprite.__default[1] === 1 / 0 && (h._sprite.__default[1] = h._duration * 1e3), h._ended(l)), l._node.removeEventListener("ended", l._endFn, !1);
        }
      };
      var c = {}, d = function(l) {
        var h = l._src;
        if (c[h]) {
          l._duration = c[h].duration, v(l);
          return;
        }
        if (/^data:[^;]+;base64,/.test(h)) {
          for (var g = atob(h.split(",")[1]), x = new Uint8Array(g.length), k = 0; k < g.length; ++k)
            x[k] = g.charCodeAt(k);
          y(x.buffer, l);
        } else {
          var T = new XMLHttpRequest();
          T.open(l._xhr.method, h, !0), T.withCredentials = l._xhr.withCredentials, T.responseType = "arraybuffer", l._xhr.headers && Object.keys(l._xhr.headers).forEach(function(A) {
            T.setRequestHeader(A, l._xhr.headers[A]);
          }), T.onload = function() {
            var A = (T.status + "")[0];
            if (A !== "0" && A !== "2" && A !== "3") {
              l._emit("loaderror", null, "Failed loading audio file with status: " + T.status + ".");
              return;
            }
            y(T.response, l);
          }, T.onerror = function() {
            l._webAudio && (l._html5 = !0, l._webAudio = !1, l._sounds = [], delete c[h], l.load());
          }, f(T);
        }
      }, f = function(l) {
        try {
          l.send();
        } catch {
          l.onerror();
        }
      }, y = function(l, h) {
        var g = function() {
          h._emit("loaderror", null, "Decoding audio data failed.");
        }, x = function(k) {
          k && h._sounds.length > 0 ? (c[h._src] = k, v(h, k)) : g();
        };
        typeof Promise < "u" && o.ctx.decodeAudioData.length === 1 ? o.ctx.decodeAudioData(l).then(x).catch(g) : o.ctx.decodeAudioData(l, x, g);
      }, v = function(l, h) {
        h && !l._duration && (l._duration = h.duration), Object.keys(l._sprite).length === 0 && (l._sprite = { __default: [0, l._duration * 1e3] }), l._state !== "loaded" && (l._state = "loaded", l._emit("load"), l._loadQueue());
      }, S = function() {
        if (o.usingWebAudio) {
          try {
            typeof AudioContext < "u" ? o.ctx = new AudioContext() : typeof webkitAudioContext < "u" ? o.ctx = new webkitAudioContext() : o.usingWebAudio = !1;
          } catch {
            o.usingWebAudio = !1;
          }
          o.ctx || (o.usingWebAudio = !1);
          var l = /iP(hone|od|ad)/.test(o._navigator && o._navigator.platform), h = o._navigator && o._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/), g = h ? parseInt(h[1], 10) : null;
          if (l && g && g < 9) {
            var x = /safari/.test(o._navigator && o._navigator.userAgent.toLowerCase());
            o._navigator && !x && (o.usingWebAudio = !1);
          }
          o.usingWebAudio && (o.masterGain = typeof o.ctx.createGain > "u" ? o.ctx.createGainNode() : o.ctx.createGain(), o.masterGain.gain.setValueAtTime(o._muted ? 0 : o._volume, o.ctx.currentTime), o.masterGain.connect(o.ctx.destination)), o._setup();
        }
      };
      e.Howler = o, e.Howl = i, typeof Zo < "u" ? (Zo.HowlerGlobal = n, Zo.Howler = o, Zo.Howl = i, Zo.Sound = a) : typeof window < "u" && (window.HowlerGlobal = n, window.Howler = o, window.Howl = i, window.Sound = a);
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
        var y = this;
        if (!y.ctx || !y.ctx.listener)
          return y;
        var v = y._orientation;
        if (i = typeof i != "number" ? v[1] : i, a = typeof a != "number" ? v[2] : a, c = typeof c != "number" ? v[3] : c, d = typeof d != "number" ? v[4] : d, f = typeof f != "number" ? v[5] : f, typeof o == "number")
          y._orientation = [o, i, a, c, d, f], typeof y.ctx.listener.forwardX < "u" ? (y.ctx.listener.forwardX.setTargetAtTime(o, Howler.ctx.currentTime, 0.1), y.ctx.listener.forwardY.setTargetAtTime(i, Howler.ctx.currentTime, 0.1), y.ctx.listener.forwardZ.setTargetAtTime(a, Howler.ctx.currentTime, 0.1), y.ctx.listener.upX.setTargetAtTime(c, Howler.ctx.currentTime, 0.1), y.ctx.listener.upY.setTargetAtTime(d, Howler.ctx.currentTime, 0.1), y.ctx.listener.upZ.setTargetAtTime(f, Howler.ctx.currentTime, 0.1)) : y.ctx.listener.setOrientation(o, i, a, c, d, f);
        else
          return v;
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
        for (var d = a._getSoundIds(i), f = 0; f < d.length; f++) {
          var y = a._soundById(d[f]);
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
        for (var f = d._getSoundIds(c), y = 0; y < f.length; y++) {
          var v = d._soundById(f[y]);
          if (v)
            if (typeof o == "number")
              v._pos = [o, i, a], v._node && ((!v._panner || v._panner.pan) && n(v, "spatial"), typeof v._panner.positionX < "u" ? (v._panner.positionX.setValueAtTime(o, Howler.ctx.currentTime), v._panner.positionY.setValueAtTime(i, Howler.ctx.currentTime), v._panner.positionZ.setValueAtTime(a, Howler.ctx.currentTime)) : v._panner.setPosition(o, i, a)), d._emit("pos", v._id);
            else
              return v._pos;
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
        for (var f = d._getSoundIds(c), y = 0; y < f.length; y++) {
          var v = d._soundById(f[y]);
          if (v)
            if (typeof o == "number")
              v._orientation = [o, i, a], v._node && (v._panner || (v._pos || (v._pos = d._pos || [0, 0, -0.5]), n(v, "spatial")), typeof v._panner.orientationX < "u" ? (v._panner.orientationX.setValueAtTime(o, Howler.ctx.currentTime), v._panner.orientationY.setValueAtTime(i, Howler.ctx.currentTime), v._panner.orientationZ.setValueAtTime(a, Howler.ctx.currentTime)) : v._panner.setOrientation(o, i, a)), d._emit("orientation", v._id);
            else
              return v._orientation;
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
        for (var f = o._getSoundIds(c), y = 0; y < f.length; y++)
          if (d = o._soundById(f[y]), d) {
            var v = d._pannerAttr;
            v = {
              coneInnerAngle: typeof a.coneInnerAngle < "u" ? a.coneInnerAngle : v.coneInnerAngle,
              coneOuterAngle: typeof a.coneOuterAngle < "u" ? a.coneOuterAngle : v.coneOuterAngle,
              coneOuterGain: typeof a.coneOuterGain < "u" ? a.coneOuterGain : v.coneOuterGain,
              distanceModel: typeof a.distanceModel < "u" ? a.distanceModel : v.distanceModel,
              maxDistance: typeof a.maxDistance < "u" ? a.maxDistance : v.maxDistance,
              refDistance: typeof a.refDistance < "u" ? a.refDistance : v.refDistance,
              rolloffFactor: typeof a.rolloffFactor < "u" ? a.rolloffFactor : v.rolloffFactor,
              panningModel: typeof a.panningModel < "u" ? a.panningModel : v.panningModel
            };
            var S = d._panner;
            S || (d._pos || (d._pos = o._pos || [0, 0, -0.5]), n(d, "spatial"), S = d._panner), S.coneInnerAngle = v.coneInnerAngle, S.coneOuterAngle = v.coneOuterAngle, S.coneOuterGain = v.coneOuterGain, S.distanceModel = v.distanceModel, S.maxDistance = v.maxDistance, S.refDistance = v.refDistance, S.rolloffFactor = v.rolloffFactor, S.panningModel = v.panningModel;
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
  })(lc)), lc;
}
var Xb = Qb();
const Zb = /* @__PURE__ */ Jy(Xb), { Howl: iS } = Zb, Zc = 500, Pt = {
  music: null,
  ambient: /* @__PURE__ */ new Map()
};
let dr = {}, di = !1, qc = "";
function xi() {
  return typeof iS == "function";
}
function uc(e, n = 50) {
  const o = Number(e), i = Number.isFinite(o) ? o : n;
  return Math.min(1, Math.max(0, i / 100));
}
function sS(e) {
  return new iS({
    src: [e],
    loop: !0,
    html5: !0,
    preload: !0,
    volume: 0
  });
}
function aS(e, n, o = Zc) {
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
function Va(e, { unload: n = !1 } = {}) {
  var o;
  e && (aS(e, 0, Math.min(Zc, 300)), (o = globalThis.setTimeout) == null || o.call(globalThis, () => {
    try {
      e.pause(), n && e.unload();
    } catch {
    }
  }, Math.min(Zc, 320)));
}
function qb(e) {
  return !(e != null && e.streamUrl) || !xi() ? null : ((!Pt.music || Pt.music.__synapseSrc !== e.streamUrl) && (Va(Pt.music, { unload: !0 }), Pt.music = sS(e.streamUrl), Pt.music.__synapseSrc = e.streamUrl), Pt.music);
}
function Jb(e) {
  if (!(e != null && e.streamUrl) || !xi()) return null;
  const n = e.id || e.streamUrl, o = Pt.ambient.get(n);
  if (o && o.__synapseSrc === e.streamUrl) return o;
  Va(o, { unload: !0 });
  const i = sS(e.streamUrl);
  return i.__synapseSrc = e.streamUrl, Pt.ambient.set(n, i), i;
}
function eM() {
  return [
    Pt.music,
    ...Pt.ambient.values()
  ].filter(Boolean);
}
function lS() {
  eM().forEach((e) => Va(e));
}
function tM(e) {
  for (const [n, o] of Pt.ambient.entries())
    e.has(n) || (Va(o, { unload: !0 }), Pt.ambient.delete(n));
}
function Gy(e, n) {
  if (e)
    try {
      e.playing() || e.play(), aS(e, n), qc = "";
    } catch (o) {
      qc = (o == null ? void 0 : o.message) || "Audio playback is blocked until the browser receives a user action.";
    }
}
async function nM(e = {}) {
  dr = { ...dr, ...e };
  const n = ja(dr);
  if (!xi()) return ua(n);
  if (!di)
    return lS(), ua(n);
  const o = qb(n.musicTrack), i = uc(dr.musicVolume, 60), a = uc(dr.ambientVolume, 50), c = /* @__PURE__ */ new Set(), d = [];
  return n.ambientLayers.forEach((f) => {
    var h;
    const y = f.id || f.streamUrl;
    c.add(y);
    const v = Jb(f), S = Number((h = dr.audioChannels) == null ? void 0 : h[f.id]), l = Number.isFinite(S) ? uc(S, 0) : Math.min(1, Math.max(0, a * (f.volumeBias ?? 1)));
    d.push([v, l]);
  }), tM(c), Gy(o, i), d.forEach(([f, y]) => Gy(f, y)), ua(n);
}
function rM(e) {
  return di = !!e, di || lS(), di;
}
function ua(e = ja(dr)) {
  var n, o, i, a;
  return {
    available: xi(),
    playing: di && xi(),
    musicTitle: ((n = e.musicTrack) == null ? void 0 : n.title) || "",
    musicArtist: ((o = e.musicTrack) == null ? void 0 : o.artist) || "",
    musicPageUrl: ((i = e.musicTrack) == null ? void 0 : i.pageUrl) || "",
    musicAttribution: ((a = e.musicTrack) == null ? void 0 : a.attribution) || "",
    ambientTitles: e.ambientLayers.map((c) => c.title).filter(Boolean),
    ambientPageUrls: e.ambientLayers.map((c) => c.pageUrl).filter(Boolean),
    ambientAttributions: e.ambientLayers.map((c) => c.attribution).filter(Boolean),
    error: qc
  };
}
const oM = "synapse.focusRoom.audioPrefs.v1";
function iM(e) {
  var n;
  try {
    (n = globalThis.localStorage) == null || n.setItem(oM, JSON.stringify({
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
function sM() {
  const e = $((y) => y.musicType), n = $((y) => y.ambientSound), o = $((y) => y.musicVolume), i = $((y) => y.ambientVolume), a = $((y) => y.audioChannels), c = $((y) => y.audioPlaying), [d, f] = C.useState(() => ua(ja({
    musicType: e,
    ambientSound: n
  })));
  return C.useEffect(() => {
    const y = { musicType: e, ambientSound: n, musicVolume: o, ambientVolume: i, audioChannels: a };
    let v = !1;
    return rM(c), iM(y), nM(y).then((S) => {
      v || f(S);
    }), () => {
      v = !0;
    };
  }, [n, i, a, c, e, o]), d;
}
function aM() {
  const e = $(), n = C.useCallback(async (i = "", a = "", c = {}) => {
    var S;
    e.pauseTimer({ pauseAudio: !0 }), e.closeSummary();
    const d = typeof i == "string" || typeof i == "number" ? i : "", f = typeof a == "string" ? a : "", y = lM(f, c), v = String(d || e.selectedMaterialId || ((S = e.selectedMaterial) == null ? void 0 : S.materialId) || "");
    if (typeof globalThis.returnFromFocusRoomToWorkspace == "function")
      try {
        const l = globalThis.returnFromFocusRoomToWorkspace(v, y);
        l && typeof l.then == "function" && await l, Ky(y.action || f, y);
        return;
      } catch (l) {
        console.error("Could not return from Focus Room:", l);
      }
    globalThis.location.hash = "", Ky(y.action || f, y);
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
function uS(e) {
  const n = String(e || "").trim().toLowerCase();
  return ["flashcards", "quiz", "assistant", "mindmap", "timeline", "source", "notes"].includes(n) ? n : "";
}
function lM(e, n = {}) {
  const o = n && typeof n == "object" && !Array.isArray(n) ? n : {}, i = uS(e || o.action);
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
function Ky(e, n = {}) {
  const o = uS(e);
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
function uM(e = 3e3) {
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
function cM() {
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
function dM() {
  const e = $((n) => n.selectedScene);
  return Wn(e);
}
function fM(e) {
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
function pM() {
  const [e, n] = C.useState(""), [o, i] = C.useState(!1), [a, c] = C.useState(!1), d = $((b) => b.view), f = uM(3e3), y = dM(), v = sM(), S = aM();
  cM();
  const l = $(b1(fM)), h = $((b) => b.summaryRecord), g = $((b) => b.endSession), x = $((b) => b.initializeFocusRoom), k = $((b) => b.openSetup), T = $((b) => b.showStudyHistory);
  C.useEffect(() => {
    x();
  }, [x]), C.useEffect(() => {
    l != null && l.materialId && Dd(l.materialId, l);
  }, [l]), C.useEffect(() => {
    d === "session" || !h || Qv("focus-room");
  }, [h, d]), C.useEffect(() => {
    d !== "session" && (i(!1), n(""), c(!1));
  }, [d]), C.useEffect(() => {
    const b = (D) => {
      D.key === "Escape" && (o || (e ? n("") : a && c(!1)));
    };
    return window.addEventListener("keydown", b), () => window.removeEventListener("keydown", b);
  }, [a, o, e]);
  const A = (...b) => {
    S.returnToWorkspace(...b);
  }, R = async () => {
    c(!1), i(!1), n(""), g(), await A();
  };
  return /* @__PURE__ */ w.jsxs(
    "main",
    {
      id: "focusRoomSurface",
      className: `focus-room-surface react-focus-room ${f ? "is-idle" : ""} ${d === "setup" ? "is-innook-setup" : ""}`.trim(),
      "aria-live": "polite",
      children: [
        /* @__PURE__ */ w.jsx(sC, { scene: y }),
        /* @__PURE__ */ w.jsx(Na, { mode: "wait", children: d === "landing" ? /* @__PURE__ */ w.jsx(
          nn.div,
          {
            className: "focus-room-view focus-landing-view",
            initial: { opacity: 0, y: 14 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -8 },
            transition: oa,
            children: /* @__PURE__ */ w.jsx(dE, { onStart: k, onWorkspace: A, onHistory: T })
          },
          "landing"
        ) : d === "setup" ? /* @__PURE__ */ w.jsx(
          nn.div,
          {
            className: "focus-room-view focus-setup-view",
            initial: { opacity: 0, y: 14 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -8 },
            transition: oa,
            children: /* @__PURE__ */ w.jsx(PE, {})
          },
          "setup"
        ) : /* @__PURE__ */ w.jsxs(
          nn.div,
          {
            className: "focus-room-view focus-session-view",
            initial: { opacity: 0, y: 14 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -8 },
            transition: oa,
            children: [
              o ? null : /* @__PURE__ */ w.jsx(NE, { onWorkspace: A, onOpenTrail: () => n("trail"), onOpenCompanion: () => n("companion"), onOpenSettings: () => n("settings"), onExit: () => c(!0) }),
              /* @__PURE__ */ w.jsx("section", { className: `focus-session-stage ${o ? "is-focus-mode" : ""}`.trim(), children: /* @__PURE__ */ w.jsx("div", { className: "focus-session-grid", children: /* @__PURE__ */ w.jsx(RE, {}) }) }),
              o ? /* @__PURE__ */ w.jsx(Yb, { audioState: v, onExit: () => i(!1) }) : /* @__PURE__ */ w.jsx(DE, { audioState: v, onFocusMode: () => i(!0) }),
              o ? null : /* @__PURE__ */ w.jsx(Lb, { audioState: v, utilityPanel: e, onClose: () => n(""), onWorkspace: A }),
              /* @__PURE__ */ w.jsx(hb, {}),
              /* @__PURE__ */ w.jsx(hM, { open: a, onClose: () => c(!1), onConfirm: R })
            ]
          },
          "session"
        ) })
      ]
    }
  );
}
function hM({ open: e, onClose: n, onConfirm: o }) {
  return e ? /* @__PURE__ */ w.jsx("div", { className: "focus-exit-overlay", role: "presentation", children: /* @__PURE__ */ w.jsxs("div", { className: "focus-exit-dialog liquid-glass", role: "dialog", "aria-modal": "true", "aria-labelledby": "focus-exit-title", children: [
    /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Leave this room?" }),
    /* @__PURE__ */ w.jsx("h2", { id: "focus-exit-title", children: "End focus session" }),
    /* @__PURE__ */ w.jsx("p", { children: "Your focused time will be saved to your Focus Trail." }),
    /* @__PURE__ */ w.jsxs("div", { className: "focus-button-row", children: [
      /* @__PURE__ */ w.jsx(be, { onClick: n, children: "Continue focusing" }),
      /* @__PURE__ */ w.jsx(be, { variant: "primary", onClick: o, children: "End and exit" })
    ] })
  ] }) }) : null;
}
let cc = null;
function mM(e, n) {
  const o = globalThis.__synapseFocusRoomApi || {};
  if (typeof o[e] != "function") {
    console.warn(`Synapse Focus Room action "${e}" is not available yet.`);
    return;
  }
  return o[e](...n);
}
function yM() {
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
    globalThis[n] = (...i) => mM(o, i);
  });
}
function gM(e = {}) {
  yM();
  const n = e.root || document.getElementById("focusRoomRoot");
  if (!n)
    throw new Error("Focus Room root element was not found.");
  cc || (cc = T1.createRoot(n), cc.render(
    yn.createElement(
      yn.StrictMode,
      null,
      yn.createElement(pM)
    )
  ));
}
const vM = "synapse.generated.history.v6", cS = "synapse.active.generated.v6", SM = "synapse.flashcards.deck.v1", wM = "synapse.quiz.history.v1", xM = "synapse.focusRoom.return-target.v1";
function Kd(e, n) {
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
function _M(e, n) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, n), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function kM(e, n) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, JSON.stringify(n)), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function dS() {
  const e = Kd(vM, []);
  return Array.isArray(e) ? e : [];
}
function TM(e) {
  const n = String((e == null ? void 0 : e.title) || "").trim();
  return n || String((e == null ? void 0 : e.summary) || "").split(/\n+/).map((i) => i.replace(/^#+\s*/, "").trim()).find((i) => i.length > 4) || "Generated Study Notes";
}
function fS(e = {}) {
  return [
    e.id ? `history:${e.id}` : "",
    e.sourceFingerprint ? `fingerprint:${e.sourceFingerprint}` : "",
    e.clientFingerprint ? `fingerprint:${e.clientFingerprint}` : ""
  ].filter(Boolean);
}
function AM(e = {}) {
  const n = Kd(SM, {}), i = fS(e).map((a) => n == null ? void 0 : n[a]).find((a) => a && Array.isArray(a.cards) && a.cards.length);
  return (i == null ? void 0 : i.cards) || [];
}
function CM(e = {}) {
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
function EM(e = []) {
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
function PM(e = {}) {
  const n = Kd(wM, {}), i = fS(e).flatMap((c) => Array.isArray(n == null ? void 0 : n[c]) ? n[c] : []), a = /* @__PURE__ */ new Set();
  return EM(i).filter((c) => {
    const d = CM(c);
    return !d || a.has(d) ? !1 : (a.add(d), !0);
  }).sort((c, d) => new Date(d.createdAt || 0) - new Date(c.createdAt || 0));
}
function bM(e = {}) {
  return {
    materialId: String(e.id || e.sourceFingerprint || e.clientFingerprint || "current-material"),
    materialTitle: TM(e),
    materialType: "Generated notes",
    uploadedContent: "",
    aiSummary: e.summary || "",
    sections: e.sections || {},
    flashcards: AM(e),
    quizzes: PM(e),
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
function pS() {
  return dS().filter((e) => e && (e.id || e.summary)).map(bM);
}
function hS(e = "") {
  const n = String(e || "");
  return n && pS().find(
    (o) => o.materialId === n || o.sourceFingerprint === n || o.clientFingerprint === n
  ) || null;
}
function mS() {
  var n;
  const e = ((n = globalThis.localStorage) == null ? void 0 : n.getItem(cS)) || "";
  return hS(e);
}
function MM(e = "") {
  var i;
  const n = e || ((i = mS()) == null ? void 0 : i.materialId) || "", o = n ? `/${encodeURIComponent(n)}` : "";
  globalThis.location.hash = `#/focus-room${o}`;
}
function RM(e = "", n = {}) {
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
async function NM(e = "", n = {}) {
  const o = String(e || ""), i = dS().find(
    (d) => String((d == null ? void 0 : d.id) || "") === o || String((d == null ? void 0 : d.sourceFingerprint) || (d == null ? void 0 : d.source_fingerprint) || "") === o || String((d == null ? void 0 : d.clientFingerprint) || (d == null ? void 0 : d.client_fingerprint) || "") === o
  ) || null, a = String((i == null ? void 0 : i.id) || "");
  a && _M(cS, a);
  const c = RM(a, n);
  c.action && kM(xM, c), globalThis.location.href = a ? `index.html?focusReturn=${encodeURIComponent(a)}` : "index.html";
}
function DM() {
  Object.assign(globalThis, {
    getSynapseFocusRoomCurrentMaterial: mS,
    getSynapseFocusRoomMaterial: hS,
    getSynapseFocusRoomMaterials: pS,
    openSynapseFocusRoom: MM,
    returnFromFocusRoomToWorkspace: NM
  });
}
const yS = document.getElementById("focusRoomRoot");
if (!yS)
  throw new Error("Focus Room root element was not found.");
var Xy;
(Xy = document.getElementById("focusRoomFallbackTitle")) == null || Xy.remove();
globalThis.apiClient = new qy(y1);
DM();
(!globalThis.location.hash || globalThis.location.hash === "#") && (globalThis.location.hash = "#/focus-room");
gM({ root: yS });
