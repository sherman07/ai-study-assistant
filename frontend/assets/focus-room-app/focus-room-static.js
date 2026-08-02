function Sx(e, n) {
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
function wx(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function eg(e) {
  const n = String(e || "").toLowerCase();
  return n === "127.0.0.1" || n === "localhost" || n === "::1" || n === "[::1]";
}
function Hh(e) {
  return eg(e) || wx(e);
}
function xx(e) {
  return !e || eg(e) ? "127.0.0.1" : e;
}
const _x = (() => {
  var p, y, v, S;
  const { protocol: e, hostname: n, port: o } = window.location, i = String(window.SYNAPSE_BACKEND_PORT || ((y = (p = document.body) == null ? void 0 : p.dataset) == null ? void 0 : y.apiPort) || "8001").trim(), a = `http://${xx(n)}:${i || "8001"}`, c = String(window.SYNAPSE_API_BASE || ((S = (v = document.body) == null ? void 0 : v.dataset) == null ? void 0 : S.apiBase) || "").replace(/\/+$/, ""), d = `${e}//${window.location.host}`.replace(/\/+$/, "");
  return c && !(Hh(n) && o !== i && c === d) ? c : e === "file:" || Hh(n) && o !== i ? a : `${e}//${window.location.host}`;
})();
class Ls extends Error {
  constructor(n, { cause: o } = {}) {
    super(n), this.name = "ApiConnectionError", this.cause = o;
  }
}
const Wh = "synapse.client.id.v1";
function Vn() {
  return globalThis.window || globalThis;
}
function Hr(e, n = 220) {
  return String(e || "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
}
function Gh() {
  const e = globalThis.crypto || Vn().crypto;
  return e != null && e.randomUUID ? e.randomUUID() : `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
function kx() {
  var n, o;
  const e = Vn();
  try {
    const i = (n = e.localStorage) == null ? void 0 : n.getItem(Wh);
    if (i) return i;
    const a = Gh();
    return (o = e.localStorage) == null || o.setItem(Wh, a), a;
  } catch {
    return Gh();
  }
}
function Tx(e = {}) {
  if (typeof Headers < "u" && e instanceof Headers) {
    const n = {};
    return e.forEach((o, i) => {
      n[i] = o;
    }), n;
  }
  return Array.isArray(e) ? Object.fromEntries(e) : { ...e || {} };
}
class tg {
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
    const o = Vn(), i = Tx(n);
    i["X-Synapse-Client-Id"] = Hr(kx(), 160);
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
    let p = null, y = null, v = null, S = !1;
    const l = c.signal;
    d > 0 && typeof AbortController < "u" && (p = new AbortController(), v = () => p.abort(), l && (l.aborted ? p.abort() : l.addEventListener("abort", v, { once: !0 })), y = Vn().setTimeout(() => {
      S = !0, p.abort();
    }, d), c.signal = p.signal);
    try {
      return await this.fetchImpl(i, c);
    } catch (f) {
      throw S ? new Ls(this.timeoutMessage(d), { cause: f }) : l != null && l.aborted ? f : new Ls(this.connectionMessage(), { cause: f });
    } finally {
      y && Vn().clearTimeout(y), l && v && l.removeEventListener("abort", v);
    }
  }
  async warmup({ attempts: n = 2, retryDelayMs: o = 1500, timeoutMs: i = 6e4, maxWaitMs: a = 0, signal: c } = {}) {
    const d = Math.max(1, Math.floor(Number(n) || 1)), p = Math.max(0, Number(a) || 0), y = Date.now();
    let v = null;
    for (let S = 0; S < d; S += 1) {
      const l = Date.now() - y, f = p > 0 ? p - l : 0;
      if (p > 0 && f <= 0) break;
      try {
        const g = await this.fetch("/healthz", {
          method: "GET",
          signal: c,
          timeoutMs: p > 0 ? Math.min(i, f) : i
        });
        if (g != null && g.ok) return g;
        v = new Ls(
          `Synapse hosted service returned ${(g == null ? void 0 : g.status) || "an unexpected status"} while preparing your analysis.`
        );
      } catch (g) {
        v = g;
      }
      if (S < d - 1 && o > 0) {
        const g = p > 0 ? p - (Date.now() - y) : o;
        if (p > 0 && g <= 0) break;
        await new Promise((x) => Vn().setTimeout(x, Math.min(o, g)));
      }
    }
    throw v || new Ls(this.connectionMessage());
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
function ng(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var Iu = { exports: {} }, ve = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Kh;
function Ax() {
  if (Kh) return ve;
  Kh = 1;
  var e = Symbol.for("react.element"), n = Symbol.for("react.portal"), o = Symbol.for("react.fragment"), i = Symbol.for("react.strict_mode"), a = Symbol.for("react.profiler"), c = Symbol.for("react.provider"), d = Symbol.for("react.context"), p = Symbol.for("react.forward_ref"), y = Symbol.for("react.suspense"), v = Symbol.for("react.memo"), S = Symbol.for("react.lazy"), l = Symbol.iterator;
  function f(b) {
    return b === null || typeof b != "object" ? null : (b = l && b[l] || b["@@iterator"], typeof b == "function" ? b : null);
  }
  var g = { isMounted: function() {
    return !1;
  }, enqueueForceUpdate: function() {
  }, enqueueReplaceState: function() {
  }, enqueueSetState: function() {
  } }, x = Object.assign, T = {};
  function _(b, O, le) {
    this.props = b, this.context = O, this.refs = T, this.updater = le || g;
  }
  _.prototype.isReactComponent = {}, _.prototype.setState = function(b, O) {
    if (typeof b != "object" && typeof b != "function" && b != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
    this.updater.enqueueSetState(this, b, O, "setState");
  }, _.prototype.forceUpdate = function(b) {
    this.updater.enqueueForceUpdate(this, b, "forceUpdate");
  };
  function A() {
  }
  A.prototype = _.prototype;
  function R(b, O, le) {
    this.props = b, this.context = O, this.refs = T, this.updater = le || g;
  }
  var P = R.prototype = new A();
  P.constructor = R, x(P, _.prototype), P.isPureReactComponent = !0;
  var D = Array.isArray, L = Object.prototype.hasOwnProperty, X = { current: null }, Z = { key: !0, ref: !0, __self: !0, __source: !0 };
  function U(b, O, le) {
    var ce, we = {}, H = null, me = null;
    if (O != null) for (ce in O.ref !== void 0 && (me = O.ref), O.key !== void 0 && (H = "" + O.key), O) L.call(O, ce) && !Z.hasOwnProperty(ce) && (we[ce] = O[ce]);
    var pe = arguments.length - 2;
    if (pe === 1) we.children = le;
    else if (1 < pe) {
      for (var xe = Array(pe), Je = 0; Je < pe; Je++) xe[Je] = arguments[Je + 2];
      we.children = xe;
    }
    if (b && b.defaultProps) for (ce in pe = b.defaultProps, pe) we[ce] === void 0 && (we[ce] = pe[ce]);
    return { $$typeof: e, type: b, key: H, ref: me, props: we, _owner: X.current };
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
  var de = /\/+/g;
  function ye(b, O) {
    return typeof b == "object" && b !== null && b.key != null ? J("" + b.key) : O.toString(36);
  }
  function he(b, O, le, ce, we) {
    var H = typeof b;
    (H === "undefined" || H === "boolean") && (b = null);
    var me = !1;
    if (b === null) me = !0;
    else switch (H) {
      case "string":
      case "number":
        me = !0;
        break;
      case "object":
        switch (b.$$typeof) {
          case e:
          case n:
            me = !0;
        }
    }
    if (me) return me = b, we = we(me), b = ce === "" ? "." + ye(me, 0) : ce, D(we) ? (le = "", b != null && (le = b.replace(de, "$&/") + "/"), he(we, O, le, "", function(Je) {
      return Je;
    })) : we != null && (Q(we) && (we = G(we, le + (!we.key || me && me.key === we.key ? "" : ("" + we.key).replace(de, "$&/") + "/") + b)), O.push(we)), 1;
    if (me = 0, ce = ce === "" ? "." : ce + ":", D(b)) for (var pe = 0; pe < b.length; pe++) {
      H = b[pe];
      var xe = ce + ye(H, pe);
      me += he(H, O, le, xe, we);
    }
    else if (xe = f(b), typeof xe == "function") for (b = xe.call(b), pe = 0; !(H = b.next()).done; ) H = H.value, xe = ce + ye(H, pe++), me += he(H, O, le, xe, we);
    else if (H === "object") throw O = String(b), Error("Objects are not valid as a React child (found: " + (O === "[object Object]" ? "object with keys {" + Object.keys(b).join(", ") + "}" : O) + "). If you meant to render a collection of children, use an array instead.");
    return me;
  }
  function Se(b, O, le) {
    if (b == null) return b;
    var ce = [], we = 0;
    return he(b, ce, "", "", function(H) {
      return O.call(le, H, we++);
    }), ce;
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
  return ve.Children = { map: Se, forEach: function(b, O, le) {
    Se(b, function() {
      O.apply(this, arguments);
    }, le);
  }, count: function(b) {
    var O = 0;
    return Se(b, function() {
      O++;
    }), O;
  }, toArray: function(b) {
    return Se(b, function(O) {
      return O;
    }) || [];
  }, only: function(b) {
    if (!Q(b)) throw Error("React.Children.only expected to receive a single React element child.");
    return b;
  } }, ve.Component = _, ve.Fragment = o, ve.Profiler = a, ve.PureComponent = R, ve.StrictMode = i, ve.Suspense = y, ve.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = q, ve.act = K, ve.cloneElement = function(b, O, le) {
    if (b == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + b + ".");
    var ce = x({}, b.props), we = b.key, H = b.ref, me = b._owner;
    if (O != null) {
      if (O.ref !== void 0 && (H = O.ref, me = X.current), O.key !== void 0 && (we = "" + O.key), b.type && b.type.defaultProps) var pe = b.type.defaultProps;
      for (xe in O) L.call(O, xe) && !Z.hasOwnProperty(xe) && (ce[xe] = O[xe] === void 0 && pe !== void 0 ? pe[xe] : O[xe]);
    }
    var xe = arguments.length - 2;
    if (xe === 1) ce.children = le;
    else if (1 < xe) {
      pe = Array(xe);
      for (var Je = 0; Je < xe; Je++) pe[Je] = arguments[Je + 2];
      ce.children = pe;
    }
    return { $$typeof: e, type: b.type, key: we, ref: H, props: ce, _owner: me };
  }, ve.createContext = function(b) {
    return b = { $$typeof: d, _currentValue: b, _currentValue2: b, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, b.Provider = { $$typeof: c, _context: b }, b.Consumer = b;
  }, ve.createElement = U, ve.createFactory = function(b) {
    var O = U.bind(null, b);
    return O.type = b, O;
  }, ve.createRef = function() {
    return { current: null };
  }, ve.forwardRef = function(b) {
    return { $$typeof: p, render: b };
  }, ve.isValidElement = Q, ve.lazy = function(b) {
    return { $$typeof: S, _payload: { _status: -1, _result: b }, _init: ue };
  }, ve.memo = function(b, O) {
    return { $$typeof: v, type: b, compare: O === void 0 ? null : O };
  }, ve.startTransition = function(b) {
    var O = V.transition;
    V.transition = {};
    try {
      b();
    } finally {
      V.transition = O;
    }
  }, ve.unstable_act = K, ve.useCallback = function(b, O) {
    return ge.current.useCallback(b, O);
  }, ve.useContext = function(b) {
    return ge.current.useContext(b);
  }, ve.useDebugValue = function() {
  }, ve.useDeferredValue = function(b) {
    return ge.current.useDeferredValue(b);
  }, ve.useEffect = function(b, O) {
    return ge.current.useEffect(b, O);
  }, ve.useId = function() {
    return ge.current.useId();
  }, ve.useImperativeHandle = function(b, O, le) {
    return ge.current.useImperativeHandle(b, O, le);
  }, ve.useInsertionEffect = function(b, O) {
    return ge.current.useInsertionEffect(b, O);
  }, ve.useLayoutEffect = function(b, O) {
    return ge.current.useLayoutEffect(b, O);
  }, ve.useMemo = function(b, O) {
    return ge.current.useMemo(b, O);
  }, ve.useReducer = function(b, O, le) {
    return ge.current.useReducer(b, O, le);
  }, ve.useRef = function(b) {
    return ge.current.useRef(b);
  }, ve.useState = function(b) {
    return ge.current.useState(b);
  }, ve.useSyncExternalStore = function(b, O, le) {
    return ge.current.useSyncExternalStore(b, O, le);
  }, ve.useTransition = function() {
    return ge.current.useTransition();
  }, ve.version = "18.3.1", ve;
}
var Yh;
function td() {
  return Yh || (Yh = 1, Iu.exports = Ax()), Iu.exports;
}
var C = td();
const gn = /* @__PURE__ */ ng(C), nd = /* @__PURE__ */ Sx({
  __proto__: null,
  default: gn
}, [C]);
var Vs = {}, Fu = { exports: {} }, ht = {}, Ou = { exports: {} }, Lu = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Qh;
function Cx() {
  return Qh || (Qh = 1, (function(e) {
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
          var ce = 2 * (b + 1) - 1, we = V[ce], H = ce + 1, me = V[H];
          if (0 > a(we, K)) H < O && 0 > a(me, we) ? (V[b] = me, V[H] = K, b = H) : (V[b] = we, V[ce] = K, b = ce);
          else if (H < O && 0 > a(me, K)) V[b] = me, V[H] = K, b = H;
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
    var y = [], v = [], S = 1, l = null, f = 3, g = !1, x = !1, T = !1, _ = typeof setTimeout == "function" ? setTimeout : null, A = typeof clearTimeout == "function" ? clearTimeout : null, R = typeof setImmediate < "u" ? setImmediate : null;
    typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
    function P(V) {
      for (var q = o(v); q !== null; ) {
        if (q.callback === null) i(v);
        else if (q.startTime <= V) i(v), q.sortIndex = q.expirationTime, n(y, q);
        else break;
        q = o(v);
      }
    }
    function D(V) {
      if (T = !1, P(V), !x) if (o(y) !== null) x = !0, ue(L);
      else {
        var q = o(v);
        q !== null && ge(D, q.startTime - V);
      }
    }
    function L(V, q) {
      x = !1, T && (T = !1, A(U), U = -1), g = !0;
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
          var ce = o(v);
          ce !== null && ge(D, ce.startTime - q), le = !1;
        }
        return le;
      } finally {
        l = null, f = K, g = !1;
      }
    }
    var X = !1, Z = null, U = -1, G = 5, Q = -1;
    function J() {
      return !(e.unstable_now() - Q < G);
    }
    function de() {
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
      R(de);
    };
    else if (typeof MessageChannel < "u") {
      var he = new MessageChannel(), Se = he.port2;
      he.port1.onmessage = de, ye = function() {
        Se.postMessage(null);
      };
    } else ye = function() {
      _(de, 0);
    };
    function ue(V) {
      Z = V, X || (X = !0, ye());
    }
    function ge(V, q) {
      U = _(function() {
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
      return O = K + O, V = { id: S++, callback: q, priorityLevel: V, startTime: K, expirationTime: O, sortIndex: -1 }, K > b ? (V.sortIndex = K, n(v, V), o(y) === null && V === o(v) && (T ? (A(U), U = -1) : T = !0, ge(D, K - b))) : (V.sortIndex = O, n(y, V), x || g || (x = !0, ue(L))), V;
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
  })(Lu)), Lu;
}
var Xh;
function bx() {
  return Xh || (Xh = 1, Ou.exports = Cx()), Ou.exports;
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
var Zh;
function Ex() {
  if (Zh) return ht;
  Zh = 1;
  var e = td(), n = bx();
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
  var p = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), y = Object.prototype.hasOwnProperty, v = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, S = {}, l = {};
  function f(t) {
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
  function T(t, r, s, u, h, m, k) {
    this.acceptsBooleans = r === 2 || r === 3 || r === 4, this.attributeName = u, this.attributeNamespace = h, this.mustUseProperty = s, this.propertyName = t, this.type = r, this.sanitizeURL = m, this.removeEmptyString = k;
  }
  var _ = {};
  "children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(t) {
    _[t] = new T(t, 0, !1, t, null, !1, !1);
  }), [["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(t) {
    var r = t[0];
    _[r] = new T(r, 1, !1, t[1], null, !1, !1);
  }), ["contentEditable", "draggable", "spellCheck", "value"].forEach(function(t) {
    _[t] = new T(t, 2, !1, t.toLowerCase(), null, !1, !1);
  }), ["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(t) {
    _[t] = new T(t, 2, !1, t, null, !1, !1);
  }), "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(t) {
    _[t] = new T(t, 3, !1, t.toLowerCase(), null, !1, !1);
  }), ["checked", "multiple", "muted", "selected"].forEach(function(t) {
    _[t] = new T(t, 3, !0, t, null, !1, !1);
  }), ["capture", "download"].forEach(function(t) {
    _[t] = new T(t, 4, !1, t, null, !1, !1);
  }), ["cols", "rows", "size", "span"].forEach(function(t) {
    _[t] = new T(t, 6, !1, t, null, !1, !1);
  }), ["rowSpan", "start"].forEach(function(t) {
    _[t] = new T(t, 5, !1, t.toLowerCase(), null, !1, !1);
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
    _[r] = new T(r, 1, !1, t, null, !1, !1);
  }), "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(t) {
    var r = t.replace(A, R);
    _[r] = new T(r, 1, !1, t, "http://www.w3.org/1999/xlink", !1, !1);
  }), ["xml:base", "xml:lang", "xml:space"].forEach(function(t) {
    var r = t.replace(A, R);
    _[r] = new T(r, 1, !1, t, "http://www.w3.org/XML/1998/namespace", !1, !1);
  }), ["tabIndex", "crossOrigin"].forEach(function(t) {
    _[t] = new T(t, 1, !1, t.toLowerCase(), null, !1, !1);
  }), _.xlinkHref = new T("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1), ["src", "href", "action", "formAction"].forEach(function(t) {
    _[t] = new T(t, 1, !1, t.toLowerCase(), null, !0, !0);
  });
  function P(t, r, s, u) {
    var h = _.hasOwnProperty(r) ? _[r] : null;
    (h !== null ? h.type !== 0 : u || !(2 < r.length) || r[0] !== "o" && r[0] !== "O" || r[1] !== "n" && r[1] !== "N") && (x(r, s, h, u) && (s = null), u || h === null ? f(r) && (s === null ? t.removeAttribute(r) : t.setAttribute(r, "" + s)) : h.mustUseProperty ? t[h.propertyName] = s === null ? h.type === 3 ? !1 : "" : s : (r = h.attributeName, u = h.attributeNamespace, s === null ? t.removeAttribute(r) : (h = h.type, s = h === 3 || h === 4 && s === !0 ? "" : "" + s, u ? t.setAttributeNS(u, r, s) : t.setAttribute(r, s))));
  }
  var D = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, L = Symbol.for("react.element"), X = Symbol.for("react.portal"), Z = Symbol.for("react.fragment"), U = Symbol.for("react.strict_mode"), G = Symbol.for("react.profiler"), Q = Symbol.for("react.provider"), J = Symbol.for("react.context"), de = Symbol.for("react.forward_ref"), ye = Symbol.for("react.suspense"), he = Symbol.for("react.suspense_list"), Se = Symbol.for("react.memo"), ue = Symbol.for("react.lazy"), ge = Symbol.for("react.offscreen"), V = Symbol.iterator;
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
  function ce(t, r) {
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
`), k = h.length - 1, E = m.length - 1; 1 <= k && 0 <= E && h[k] !== m[E]; ) E--;
        for (; 1 <= k && 0 <= E; k--, E--) if (h[k] !== m[E]) {
          if (k !== 1 || E !== 1)
            do
              if (k--, E--, 0 > E || h[k] !== m[E]) {
                var M = `
` + h[k].replace(" at new ", " at ");
                return t.displayName && M.includes("<anonymous>") && (M = M.replace("<anonymous>", t.displayName)), M;
              }
            while (1 <= k && 0 <= E);
          break;
        }
      }
    } finally {
      le = !1, Error.prepareStackTrace = s;
    }
    return (t = t ? t.displayName || t.name : "") ? O(t) : "";
  }
  function we(t) {
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
        return t = ce(t.type, !1), t;
      case 11:
        return t = ce(t.type.render, !1), t;
      case 1:
        return t = ce(t.type, !0), t;
      default:
        return "";
    }
  }
  function H(t) {
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
      case de:
        var r = t.render;
        return t = t.displayName, t || (t = r.displayName || r.name || "", t = t !== "" ? "ForwardRef(" + t + ")" : "ForwardRef"), t;
      case Se:
        return r = t.displayName || null, r !== null ? r : H(t.type) || "Memo";
      case ue:
        r = t._payload, t = t._init;
        try {
          return H(t(r));
        } catch {
        }
    }
    return null;
  }
  function me(t) {
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
        return H(r);
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
  function xe(t) {
    var r = t.type;
    return (t = t.nodeName) && t.toLowerCase() === "input" && (r === "checkbox" || r === "radio");
  }
  function Je(t) {
    var r = xe(t) ? "checked" : "value", s = Object.getOwnPropertyDescriptor(t.constructor.prototype, r), u = "" + t[r];
    if (!t.hasOwnProperty(r) && typeof s < "u" && typeof s.get == "function" && typeof s.set == "function") {
      var h = s.get, m = s.set;
      return Object.defineProperty(t, r, { configurable: !0, get: function() {
        return h.call(this);
      }, set: function(k) {
        u = "" + k, m.call(this, k);
      } }), Object.defineProperty(t, r, { enumerable: s.enumerable }), { getValue: function() {
        return u;
      }, setValue: function(k) {
        u = "" + k;
      }, stopTracking: function() {
        t._valueTracker = null, delete t[r];
      } };
    }
  }
  function Yn(t) {
    t._valueTracker || (t._valueTracker = Je(t));
  }
  function fo(t) {
    if (!t) return !1;
    var r = t._valueTracker;
    if (!r) return !0;
    var s = r.getValue(), u = "";
    return t && (u = xe(t) ? t.checked ? "true" : "false" : t.value), t = u, t !== s ? (r.setValue(t), !0) : !1;
  }
  function Pi(t) {
    if (t = t || (typeof document < "u" ? document : void 0), typeof t > "u") return null;
    try {
      return t.activeElement || t.body;
    } catch {
      return t.body;
    }
  }
  function Ua(t, r) {
    var s = r.checked;
    return K({}, r, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: s ?? t._wrapperState.initialChecked });
  }
  function Xd(t, r) {
    var s = r.defaultValue == null ? "" : r.defaultValue, u = r.checked != null ? r.checked : r.defaultChecked;
    s = pe(r.value != null ? r.value : s), t._wrapperState = { initialChecked: u, initialValue: s, controlled: r.type === "checkbox" || r.type === "radio" ? r.checked != null : r.value != null };
  }
  function Zd(t, r) {
    r = r.checked, r != null && P(t, "checked", r, !1);
  }
  function $a(t, r) {
    Zd(t, r);
    var s = pe(r.value), u = r.type;
    if (s != null) u === "number" ? (s === 0 && t.value === "" || t.value != s) && (t.value = "" + s) : t.value !== "" + s && (t.value = "" + s);
    else if (u === "submit" || u === "reset") {
      t.removeAttribute("value");
      return;
    }
    r.hasOwnProperty("value") ? Ha(t, r.type, s) : r.hasOwnProperty("defaultValue") && Ha(t, r.type, pe(r.defaultValue)), r.checked == null && r.defaultChecked != null && (t.defaultChecked = !!r.defaultChecked);
  }
  function qd(t, r, s) {
    if (r.hasOwnProperty("value") || r.hasOwnProperty("defaultValue")) {
      var u = r.type;
      if (!(u !== "submit" && u !== "reset" || r.value !== void 0 && r.value !== null)) return;
      r = "" + t._wrapperState.initialValue, s || r === t.value || (t.value = r), t.defaultValue = r;
    }
    s = t.name, s !== "" && (t.name = ""), t.defaultChecked = !!t._wrapperState.initialChecked, s !== "" && (t.name = s);
  }
  function Ha(t, r, s) {
    (r !== "number" || Pi(t.ownerDocument) !== t) && (s == null ? t.defaultValue = "" + t._wrapperState.initialValue : t.defaultValue !== "" + s && (t.defaultValue = "" + s));
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
  function Wa(t, r) {
    if (r.dangerouslySetInnerHTML != null) throw Error(o(91));
    return K({}, r, { value: void 0, defaultValue: void 0, children: "" + t._wrapperState.initialValue });
  }
  function Jd(t, r) {
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
  function ef(t, r) {
    var s = pe(r.value), u = pe(r.defaultValue);
    s != null && (s = "" + s, s !== t.value && (t.value = s), r.defaultValue == null && t.defaultValue !== s && (t.defaultValue = s)), u != null && (t.defaultValue = "" + u);
  }
  function tf(t) {
    var r = t.textContent;
    r === t._wrapperState.initialValue && r !== "" && r !== null && (t.value = r);
  }
  function nf(t) {
    switch (t) {
      case "svg":
        return "http://www.w3.org/2000/svg";
      case "math":
        return "http://www.w3.org/1998/Math/MathML";
      default:
        return "http://www.w3.org/1999/xhtml";
    }
  }
  function Ga(t, r) {
    return t == null || t === "http://www.w3.org/1999/xhtml" ? nf(r) : t === "http://www.w3.org/2000/svg" && r === "foreignObject" ? "http://www.w3.org/1999/xhtml" : t;
  }
  var Mi, rf = (function(t) {
    return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(r, s, u, h) {
      MSApp.execUnsafeLocalFunction(function() {
        return t(r, s, u, h);
      });
    } : t;
  })(function(t, r) {
    if (t.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in t) t.innerHTML = r;
    else {
      for (Mi = Mi || document.createElement("div"), Mi.innerHTML = "<svg>" + r.valueOf().toString() + "</svg>", r = Mi.firstChild; t.firstChild; ) t.removeChild(t.firstChild);
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
  }, kS = ["Webkit", "ms", "Moz", "O"];
  Object.keys(mo).forEach(function(t) {
    kS.forEach(function(r) {
      r = r + t.charAt(0).toUpperCase() + t.substring(1), mo[r] = mo[t];
    });
  });
  function of(t, r, s) {
    return r == null || typeof r == "boolean" || r === "" ? "" : s || typeof r != "number" || r === 0 || mo.hasOwnProperty(t) && mo[t] ? ("" + r).trim() : r + "px";
  }
  function sf(t, r) {
    t = t.style;
    for (var s in r) if (r.hasOwnProperty(s)) {
      var u = s.indexOf("--") === 0, h = of(s, r[s], u);
      s === "float" && (s = "cssFloat"), u ? t.setProperty(s, h) : t[s] = h;
    }
  }
  var TS = K({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
  function Ka(t, r) {
    if (r) {
      if (TS[t] && (r.children != null || r.dangerouslySetInnerHTML != null)) throw Error(o(137, t));
      if (r.dangerouslySetInnerHTML != null) {
        if (r.children != null) throw Error(o(60));
        if (typeof r.dangerouslySetInnerHTML != "object" || !("__html" in r.dangerouslySetInnerHTML)) throw Error(o(61));
      }
      if (r.style != null && typeof r.style != "object") throw Error(o(62));
    }
  }
  function Ya(t, r) {
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
  var Qa = null;
  function Xa(t) {
    return t = t.target || t.srcElement || window, t.correspondingUseElement && (t = t.correspondingUseElement), t.nodeType === 3 ? t.parentNode : t;
  }
  var Za = null, wr = null, xr = null;
  function af(t) {
    if (t = Oo(t)) {
      if (typeof Za != "function") throw Error(o(280));
      var r = t.stateNode;
      r && (r = Ji(r), Za(t.stateNode, t.type, r));
    }
  }
  function lf(t) {
    wr ? xr ? xr.push(t) : xr = [t] : wr = t;
  }
  function uf() {
    if (wr) {
      var t = wr, r = xr;
      if (xr = wr = null, af(t), r) for (t = 0; t < r.length; t++) af(r[t]);
    }
  }
  function cf(t, r) {
    return t(r);
  }
  function df() {
  }
  var qa = !1;
  function ff(t, r, s) {
    if (qa) return t(r, s);
    qa = !0;
    try {
      return cf(t, r, s);
    } finally {
      qa = !1, (wr !== null || xr !== null) && (df(), uf());
    }
  }
  function yo(t, r) {
    var s = t.stateNode;
    if (s === null) return null;
    var u = Ji(s);
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
  var Ja = !1;
  if (p) try {
    var go = {};
    Object.defineProperty(go, "passive", { get: function() {
      Ja = !0;
    } }), window.addEventListener("test", go, go), window.removeEventListener("test", go, go);
  } catch {
    Ja = !1;
  }
  function AS(t, r, s, u, h, m, k, E, M) {
    var F = Array.prototype.slice.call(arguments, 3);
    try {
      r.apply(s, F);
    } catch (B) {
      this.onError(B);
    }
  }
  var vo = !1, Ri = null, Ni = !1, el = null, CS = { onError: function(t) {
    vo = !0, Ri = t;
  } };
  function bS(t, r, s, u, h, m, k, E, M) {
    vo = !1, Ri = null, AS.apply(CS, arguments);
  }
  function ES(t, r, s, u, h, m, k, E, M) {
    if (bS.apply(this, arguments), vo) {
      if (vo) {
        var F = Ri;
        vo = !1, Ri = null;
      } else throw Error(o(198));
      Ni || (Ni = !0, el = F);
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
  function pf(t) {
    if (t.tag === 13) {
      var r = t.memoizedState;
      if (r === null && (t = t.alternate, t !== null && (r = t.memoizedState)), r !== null) return r.dehydrated;
    }
    return null;
  }
  function hf(t) {
    if (Qn(t) !== t) throw Error(o(188));
  }
  function PS(t) {
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
          if (m === s) return hf(h), t;
          if (m === u) return hf(h), r;
          m = m.sibling;
        }
        throw Error(o(188));
      }
      if (s.return !== u.return) s = h, u = m;
      else {
        for (var k = !1, E = h.child; E; ) {
          if (E === s) {
            k = !0, s = h, u = m;
            break;
          }
          if (E === u) {
            k = !0, u = h, s = m;
            break;
          }
          E = E.sibling;
        }
        if (!k) {
          for (E = m.child; E; ) {
            if (E === s) {
              k = !0, s = m, u = h;
              break;
            }
            if (E === u) {
              k = !0, u = m, s = h;
              break;
            }
            E = E.sibling;
          }
          if (!k) throw Error(o(189));
        }
      }
      if (s.alternate !== u) throw Error(o(190));
    }
    if (s.tag !== 3) throw Error(o(188));
    return s.stateNode.current === s ? t : r;
  }
  function mf(t) {
    return t = PS(t), t !== null ? yf(t) : null;
  }
  function yf(t) {
    if (t.tag === 5 || t.tag === 6) return t;
    for (t = t.child; t !== null; ) {
      var r = yf(t);
      if (r !== null) return r;
      t = t.sibling;
    }
    return null;
  }
  var gf = n.unstable_scheduleCallback, vf = n.unstable_cancelCallback, MS = n.unstable_shouldYield, RS = n.unstable_requestPaint, Le = n.unstable_now, NS = n.unstable_getCurrentPriorityLevel, tl = n.unstable_ImmediatePriority, Sf = n.unstable_UserBlockingPriority, Di = n.unstable_NormalPriority, DS = n.unstable_LowPriority, wf = n.unstable_IdlePriority, ji = null, Wt = null;
  function jS(t) {
    if (Wt && typeof Wt.onCommitFiberRoot == "function") try {
      Wt.onCommitFiberRoot(ji, t, void 0, (t.current.flags & 128) === 128);
    } catch {
    }
  }
  var Nt = Math.clz32 ? Math.clz32 : OS, IS = Math.log, FS = Math.LN2;
  function OS(t) {
    return t >>>= 0, t === 0 ? 32 : 31 - (IS(t) / FS | 0) | 0;
  }
  var Ii = 64, Fi = 4194304;
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
  function Oi(t, r) {
    var s = t.pendingLanes;
    if (s === 0) return 0;
    var u = 0, h = t.suspendedLanes, m = t.pingedLanes, k = s & 268435455;
    if (k !== 0) {
      var E = k & ~h;
      E !== 0 ? u = So(E) : (m &= k, m !== 0 && (u = So(m)));
    } else k = s & ~h, k !== 0 ? u = So(k) : m !== 0 && (u = So(m));
    if (u === 0) return 0;
    if (r !== 0 && r !== u && (r & h) === 0 && (h = u & -u, m = r & -r, h >= m || h === 16 && (m & 4194240) !== 0)) return r;
    if ((u & 4) !== 0 && (u |= s & 16), r = t.entangledLanes, r !== 0) for (t = t.entanglements, r &= u; 0 < r; ) s = 31 - Nt(r), h = 1 << s, u |= t[s], r &= ~h;
    return u;
  }
  function LS(t, r) {
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
  function VS(t, r) {
    for (var s = t.suspendedLanes, u = t.pingedLanes, h = t.expirationTimes, m = t.pendingLanes; 0 < m; ) {
      var k = 31 - Nt(m), E = 1 << k, M = h[k];
      M === -1 ? ((E & s) === 0 || (E & u) !== 0) && (h[k] = LS(E, r)) : M <= r && (t.expiredLanes |= E), m &= ~E;
    }
  }
  function nl(t) {
    return t = t.pendingLanes & -1073741825, t !== 0 ? t : t & 1073741824 ? 1073741824 : 0;
  }
  function xf() {
    var t = Ii;
    return Ii <<= 1, (Ii & 4194240) === 0 && (Ii = 64), t;
  }
  function rl(t) {
    for (var r = [], s = 0; 31 > s; s++) r.push(t);
    return r;
  }
  function wo(t, r, s) {
    t.pendingLanes |= r, r !== 536870912 && (t.suspendedLanes = 0, t.pingedLanes = 0), t = t.eventTimes, r = 31 - Nt(r), t[r] = s;
  }
  function zS(t, r) {
    var s = t.pendingLanes & ~r;
    t.pendingLanes = r, t.suspendedLanes = 0, t.pingedLanes = 0, t.expiredLanes &= r, t.mutableReadLanes &= r, t.entangledLanes &= r, r = t.entanglements;
    var u = t.eventTimes;
    for (t = t.expirationTimes; 0 < s; ) {
      var h = 31 - Nt(s), m = 1 << h;
      r[h] = 0, u[h] = -1, t[h] = -1, s &= ~m;
    }
  }
  function ol(t, r) {
    var s = t.entangledLanes |= r;
    for (t = t.entanglements; s; ) {
      var u = 31 - Nt(s), h = 1 << u;
      h & r | t[u] & r && (t[u] |= r), s &= ~h;
    }
  }
  var Ae = 0;
  function _f(t) {
    return t &= -t, 1 < t ? 4 < t ? (t & 268435455) !== 0 ? 16 : 536870912 : 4 : 1;
  }
  var kf, il, Tf, Af, Cf, sl = !1, Li = [], vn = null, Sn = null, wn = null, xo = /* @__PURE__ */ new Map(), _o = /* @__PURE__ */ new Map(), xn = [], BS = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
  function bf(t, r) {
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
    return t === null || t.nativeEvent !== m ? (t = { blockedOn: r, domEventName: s, eventSystemFlags: u, nativeEvent: m, targetContainers: [h] }, r !== null && (r = Oo(r), r !== null && il(r)), t) : (t.eventSystemFlags |= u, r = t.targetContainers, h !== null && r.indexOf(h) === -1 && r.push(h), t);
  }
  function US(t, r, s, u, h) {
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
  function Ef(t) {
    var r = Xn(t.target);
    if (r !== null) {
      var s = Qn(r);
      if (s !== null) {
        if (r = s.tag, r === 13) {
          if (r = pf(s), r !== null) {
            t.blockedOn = r, Cf(t.priority, function() {
              Tf(s);
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
  function Vi(t) {
    if (t.blockedOn !== null) return !1;
    for (var r = t.targetContainers; 0 < r.length; ) {
      var s = ll(t.domEventName, t.eventSystemFlags, r[0], t.nativeEvent);
      if (s === null) {
        s = t.nativeEvent;
        var u = new s.constructor(s.type, s);
        Qa = u, s.target.dispatchEvent(u), Qa = null;
      } else return r = Oo(s), r !== null && il(r), t.blockedOn = s, !1;
      r.shift();
    }
    return !0;
  }
  function Pf(t, r, s) {
    Vi(t) && s.delete(r);
  }
  function $S() {
    sl = !1, vn !== null && Vi(vn) && (vn = null), Sn !== null && Vi(Sn) && (Sn = null), wn !== null && Vi(wn) && (wn = null), xo.forEach(Pf), _o.forEach(Pf);
  }
  function To(t, r) {
    t.blockedOn === r && (t.blockedOn = null, sl || (sl = !0, n.unstable_scheduleCallback(n.unstable_NormalPriority, $S)));
  }
  function Ao(t) {
    function r(h) {
      return To(h, t);
    }
    if (0 < Li.length) {
      To(Li[0], t);
      for (var s = 1; s < Li.length; s++) {
        var u = Li[s];
        u.blockedOn === t && (u.blockedOn = null);
      }
    }
    for (vn !== null && To(vn, t), Sn !== null && To(Sn, t), wn !== null && To(wn, t), xo.forEach(r), _o.forEach(r), s = 0; s < xn.length; s++) u = xn[s], u.blockedOn === t && (u.blockedOn = null);
    for (; 0 < xn.length && (s = xn[0], s.blockedOn === null); ) Ef(s), s.blockedOn === null && xn.shift();
  }
  var _r = D.ReactCurrentBatchConfig, zi = !0;
  function HS(t, r, s, u) {
    var h = Ae, m = _r.transition;
    _r.transition = null;
    try {
      Ae = 1, al(t, r, s, u);
    } finally {
      Ae = h, _r.transition = m;
    }
  }
  function WS(t, r, s, u) {
    var h = Ae, m = _r.transition;
    _r.transition = null;
    try {
      Ae = 4, al(t, r, s, u);
    } finally {
      Ae = h, _r.transition = m;
    }
  }
  function al(t, r, s, u) {
    if (zi) {
      var h = ll(t, r, s, u);
      if (h === null) Al(t, r, u, Bi, s), bf(t, u);
      else if (US(h, t, r, s, u)) u.stopPropagation();
      else if (bf(t, u), r & 4 && -1 < BS.indexOf(t)) {
        for (; h !== null; ) {
          var m = Oo(h);
          if (m !== null && kf(m), m = ll(t, r, s, u), m === null && Al(t, r, u, Bi, s), m === h) break;
          h = m;
        }
        h !== null && u.stopPropagation();
      } else Al(t, r, u, null, s);
    }
  }
  var Bi = null;
  function ll(t, r, s, u) {
    if (Bi = null, t = Xa(u), t = Xn(t), t !== null) if (r = Qn(t), r === null) t = null;
    else if (s = r.tag, s === 13) {
      if (t = pf(r), t !== null) return t;
      t = null;
    } else if (s === 3) {
      if (r.stateNode.current.memoizedState.isDehydrated) return r.tag === 3 ? r.stateNode.containerInfo : null;
      t = null;
    } else r !== t && (t = null);
    return Bi = t, null;
  }
  function Mf(t) {
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
        switch (NS()) {
          case tl:
            return 1;
          case Sf:
            return 4;
          case Di:
          case DS:
            return 16;
          case wf:
            return 536870912;
          default:
            return 16;
        }
      default:
        return 16;
    }
  }
  var _n = null, ul = null, Ui = null;
  function Rf() {
    if (Ui) return Ui;
    var t, r = ul, s = r.length, u, h = "value" in _n ? _n.value : _n.textContent, m = h.length;
    for (t = 0; t < s && r[t] === h[t]; t++) ;
    var k = s - t;
    for (u = 1; u <= k && r[s - u] === h[m - u]; u++) ;
    return Ui = h.slice(t, 1 < u ? 1 - u : void 0);
  }
  function $i(t) {
    var r = t.keyCode;
    return "charCode" in t ? (t = t.charCode, t === 0 && r === 13 && (t = 13)) : t = r, t === 10 && (t = 13), 32 <= t || t === 13 ? t : 0;
  }
  function Hi() {
    return !0;
  }
  function Nf() {
    return !1;
  }
  function St(t) {
    function r(s, u, h, m, k) {
      this._reactName = s, this._targetInst = h, this.type = u, this.nativeEvent = m, this.target = k, this.currentTarget = null;
      for (var E in t) t.hasOwnProperty(E) && (s = t[E], this[E] = s ? s(m) : m[E]);
      return this.isDefaultPrevented = (m.defaultPrevented != null ? m.defaultPrevented : m.returnValue === !1) ? Hi : Nf, this.isPropagationStopped = Nf, this;
    }
    return K(r.prototype, { preventDefault: function() {
      this.defaultPrevented = !0;
      var s = this.nativeEvent;
      s && (s.preventDefault ? s.preventDefault() : typeof s.returnValue != "unknown" && (s.returnValue = !1), this.isDefaultPrevented = Hi);
    }, stopPropagation: function() {
      var s = this.nativeEvent;
      s && (s.stopPropagation ? s.stopPropagation() : typeof s.cancelBubble != "unknown" && (s.cancelBubble = !0), this.isPropagationStopped = Hi);
    }, persist: function() {
    }, isPersistent: Hi }), r;
  }
  var kr = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(t) {
    return t.timeStamp || Date.now();
  }, defaultPrevented: 0, isTrusted: 0 }, cl = St(kr), Co = K({}, kr, { view: 0, detail: 0 }), GS = St(Co), dl, fl, bo, Wi = K({}, Co, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: hl, button: 0, buttons: 0, relatedTarget: function(t) {
    return t.relatedTarget === void 0 ? t.fromElement === t.srcElement ? t.toElement : t.fromElement : t.relatedTarget;
  }, movementX: function(t) {
    return "movementX" in t ? t.movementX : (t !== bo && (bo && t.type === "mousemove" ? (dl = t.screenX - bo.screenX, fl = t.screenY - bo.screenY) : fl = dl = 0, bo = t), dl);
  }, movementY: function(t) {
    return "movementY" in t ? t.movementY : fl;
  } }), Df = St(Wi), KS = K({}, Wi, { dataTransfer: 0 }), YS = St(KS), QS = K({}, Co, { relatedTarget: 0 }), pl = St(QS), XS = K({}, kr, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), ZS = St(XS), qS = K({}, kr, { clipboardData: function(t) {
    return "clipboardData" in t ? t.clipboardData : window.clipboardData;
  } }), JS = St(qS), ew = K({}, kr, { data: 0 }), jf = St(ew), tw = {
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
  }, nw = {
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
  }, rw = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
  function ow(t) {
    var r = this.nativeEvent;
    return r.getModifierState ? r.getModifierState(t) : (t = rw[t]) ? !!r[t] : !1;
  }
  function hl() {
    return ow;
  }
  var iw = K({}, Co, { key: function(t) {
    if (t.key) {
      var r = tw[t.key] || t.key;
      if (r !== "Unidentified") return r;
    }
    return t.type === "keypress" ? (t = $i(t), t === 13 ? "Enter" : String.fromCharCode(t)) : t.type === "keydown" || t.type === "keyup" ? nw[t.keyCode] || "Unidentified" : "";
  }, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: hl, charCode: function(t) {
    return t.type === "keypress" ? $i(t) : 0;
  }, keyCode: function(t) {
    return t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
  }, which: function(t) {
    return t.type === "keypress" ? $i(t) : t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
  } }), sw = St(iw), aw = K({}, Wi, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), If = St(aw), lw = K({}, Co, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: hl }), uw = St(lw), cw = K({}, kr, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), dw = St(cw), fw = K({}, Wi, {
    deltaX: function(t) {
      return "deltaX" in t ? t.deltaX : "wheelDeltaX" in t ? -t.wheelDeltaX : 0;
    },
    deltaY: function(t) {
      return "deltaY" in t ? t.deltaY : "wheelDeltaY" in t ? -t.wheelDeltaY : "wheelDelta" in t ? -t.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), pw = St(fw), hw = [9, 13, 27, 32], ml = p && "CompositionEvent" in window, Eo = null;
  p && "documentMode" in document && (Eo = document.documentMode);
  var mw = p && "TextEvent" in window && !Eo, Ff = p && (!ml || Eo && 8 < Eo && 11 >= Eo), Of = " ", Lf = !1;
  function Vf(t, r) {
    switch (t) {
      case "keyup":
        return hw.indexOf(r.keyCode) !== -1;
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
  function zf(t) {
    return t = t.detail, typeof t == "object" && "data" in t ? t.data : null;
  }
  var Tr = !1;
  function yw(t, r) {
    switch (t) {
      case "compositionend":
        return zf(r);
      case "keypress":
        return r.which !== 32 ? null : (Lf = !0, Of);
      case "textInput":
        return t = r.data, t === Of && Lf ? null : t;
      default:
        return null;
    }
  }
  function gw(t, r) {
    if (Tr) return t === "compositionend" || !ml && Vf(t, r) ? (t = Rf(), Ui = ul = _n = null, Tr = !1, t) : null;
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
        return Ff && r.locale !== "ko" ? null : r.data;
      default:
        return null;
    }
  }
  var vw = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
  function Bf(t) {
    var r = t && t.nodeName && t.nodeName.toLowerCase();
    return r === "input" ? !!vw[t.type] : r === "textarea";
  }
  function Uf(t, r, s, u) {
    lf(u), r = Xi(r, "onChange"), 0 < r.length && (s = new cl("onChange", "change", null, s, u), t.push({ event: s, listeners: r }));
  }
  var Po = null, Mo = null;
  function Sw(t) {
    sp(t, 0);
  }
  function Gi(t) {
    var r = Pr(t);
    if (fo(r)) return t;
  }
  function ww(t, r) {
    if (t === "change") return r;
  }
  var $f = !1;
  if (p) {
    var yl;
    if (p) {
      var gl = "oninput" in document;
      if (!gl) {
        var Hf = document.createElement("div");
        Hf.setAttribute("oninput", "return;"), gl = typeof Hf.oninput == "function";
      }
      yl = gl;
    } else yl = !1;
    $f = yl && (!document.documentMode || 9 < document.documentMode);
  }
  function Wf() {
    Po && (Po.detachEvent("onpropertychange", Gf), Mo = Po = null);
  }
  function Gf(t) {
    if (t.propertyName === "value" && Gi(Mo)) {
      var r = [];
      Uf(r, Mo, t, Xa(t)), ff(Sw, r);
    }
  }
  function xw(t, r, s) {
    t === "focusin" ? (Wf(), Po = r, Mo = s, Po.attachEvent("onpropertychange", Gf)) : t === "focusout" && Wf();
  }
  function _w(t) {
    if (t === "selectionchange" || t === "keyup" || t === "keydown") return Gi(Mo);
  }
  function kw(t, r) {
    if (t === "click") return Gi(r);
  }
  function Tw(t, r) {
    if (t === "input" || t === "change") return Gi(r);
  }
  function Aw(t, r) {
    return t === r && (t !== 0 || 1 / t === 1 / r) || t !== t && r !== r;
  }
  var Dt = typeof Object.is == "function" ? Object.is : Aw;
  function Ro(t, r) {
    if (Dt(t, r)) return !0;
    if (typeof t != "object" || t === null || typeof r != "object" || r === null) return !1;
    var s = Object.keys(t), u = Object.keys(r);
    if (s.length !== u.length) return !1;
    for (u = 0; u < s.length; u++) {
      var h = s[u];
      if (!y.call(r, h) || !Dt(t[h], r[h])) return !1;
    }
    return !0;
  }
  function Kf(t) {
    for (; t && t.firstChild; ) t = t.firstChild;
    return t;
  }
  function Yf(t, r) {
    var s = Kf(t);
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
      s = Kf(s);
    }
  }
  function Qf(t, r) {
    return t && r ? t === r ? !0 : t && t.nodeType === 3 ? !1 : r && r.nodeType === 3 ? Qf(t, r.parentNode) : "contains" in t ? t.contains(r) : t.compareDocumentPosition ? !!(t.compareDocumentPosition(r) & 16) : !1 : !1;
  }
  function Xf() {
    for (var t = window, r = Pi(); r instanceof t.HTMLIFrameElement; ) {
      try {
        var s = typeof r.contentWindow.location.href == "string";
      } catch {
        s = !1;
      }
      if (s) t = r.contentWindow;
      else break;
      r = Pi(t.document);
    }
    return r;
  }
  function vl(t) {
    var r = t && t.nodeName && t.nodeName.toLowerCase();
    return r && (r === "input" && (t.type === "text" || t.type === "search" || t.type === "tel" || t.type === "url" || t.type === "password") || r === "textarea" || t.contentEditable === "true");
  }
  function Cw(t) {
    var r = Xf(), s = t.focusedElem, u = t.selectionRange;
    if (r !== s && s && s.ownerDocument && Qf(s.ownerDocument.documentElement, s)) {
      if (u !== null && vl(s)) {
        if (r = u.start, t = u.end, t === void 0 && (t = r), "selectionStart" in s) s.selectionStart = r, s.selectionEnd = Math.min(t, s.value.length);
        else if (t = (r = s.ownerDocument || document) && r.defaultView || window, t.getSelection) {
          t = t.getSelection();
          var h = s.textContent.length, m = Math.min(u.start, h);
          u = u.end === void 0 ? m : Math.min(u.end, h), !t.extend && m > u && (h = u, u = m, m = h), h = Yf(s, m);
          var k = Yf(
            s,
            u
          );
          h && k && (t.rangeCount !== 1 || t.anchorNode !== h.node || t.anchorOffset !== h.offset || t.focusNode !== k.node || t.focusOffset !== k.offset) && (r = r.createRange(), r.setStart(h.node, h.offset), t.removeAllRanges(), m > u ? (t.addRange(r), t.extend(k.node, k.offset)) : (r.setEnd(k.node, k.offset), t.addRange(r)));
        }
      }
      for (r = [], t = s; t = t.parentNode; ) t.nodeType === 1 && r.push({ element: t, left: t.scrollLeft, top: t.scrollTop });
      for (typeof s.focus == "function" && s.focus(), s = 0; s < r.length; s++) t = r[s], t.element.scrollLeft = t.left, t.element.scrollTop = t.top;
    }
  }
  var bw = p && "documentMode" in document && 11 >= document.documentMode, Ar = null, Sl = null, No = null, wl = !1;
  function Zf(t, r, s) {
    var u = s.window === s ? s.document : s.nodeType === 9 ? s : s.ownerDocument;
    wl || Ar == null || Ar !== Pi(u) || (u = Ar, "selectionStart" in u && vl(u) ? u = { start: u.selectionStart, end: u.selectionEnd } : (u = (u.ownerDocument && u.ownerDocument.defaultView || window).getSelection(), u = { anchorNode: u.anchorNode, anchorOffset: u.anchorOffset, focusNode: u.focusNode, focusOffset: u.focusOffset }), No && Ro(No, u) || (No = u, u = Xi(Sl, "onSelect"), 0 < u.length && (r = new cl("onSelect", "select", null, r, s), t.push({ event: r, listeners: u }), r.target = Ar)));
  }
  function Ki(t, r) {
    var s = {};
    return s[t.toLowerCase()] = r.toLowerCase(), s["Webkit" + t] = "webkit" + r, s["Moz" + t] = "moz" + r, s;
  }
  var Cr = { animationend: Ki("Animation", "AnimationEnd"), animationiteration: Ki("Animation", "AnimationIteration"), animationstart: Ki("Animation", "AnimationStart"), transitionend: Ki("Transition", "TransitionEnd") }, xl = {}, qf = {};
  p && (qf = document.createElement("div").style, "AnimationEvent" in window || (delete Cr.animationend.animation, delete Cr.animationiteration.animation, delete Cr.animationstart.animation), "TransitionEvent" in window || delete Cr.transitionend.transition);
  function Yi(t) {
    if (xl[t]) return xl[t];
    if (!Cr[t]) return t;
    var r = Cr[t], s;
    for (s in r) if (r.hasOwnProperty(s) && s in qf) return xl[t] = r[s];
    return t;
  }
  var Jf = Yi("animationend"), ep = Yi("animationiteration"), tp = Yi("animationstart"), np = Yi("transitionend"), rp = /* @__PURE__ */ new Map(), op = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
  function kn(t, r) {
    rp.set(t, r), c(r, [t]);
  }
  for (var _l = 0; _l < op.length; _l++) {
    var kl = op[_l], Ew = kl.toLowerCase(), Pw = kl[0].toUpperCase() + kl.slice(1);
    kn(Ew, "on" + Pw);
  }
  kn(Jf, "onAnimationEnd"), kn(ep, "onAnimationIteration"), kn(tp, "onAnimationStart"), kn("dblclick", "onDoubleClick"), kn("focusin", "onFocus"), kn("focusout", "onBlur"), kn(np, "onTransitionEnd"), d("onMouseEnter", ["mouseout", "mouseover"]), d("onMouseLeave", ["mouseout", "mouseover"]), d("onPointerEnter", ["pointerout", "pointerover"]), d("onPointerLeave", ["pointerout", "pointerover"]), c("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), c("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), c("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]), c("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), c("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), c("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
  var Do = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), Mw = new Set("cancel close invalid load scroll toggle".split(" ").concat(Do));
  function ip(t, r, s) {
    var u = t.type || "unknown-event";
    t.currentTarget = s, ES(u, r, void 0, t), t.currentTarget = null;
  }
  function sp(t, r) {
    r = (r & 4) !== 0;
    for (var s = 0; s < t.length; s++) {
      var u = t[s], h = u.event;
      u = u.listeners;
      e: {
        var m = void 0;
        if (r) for (var k = u.length - 1; 0 <= k; k--) {
          var E = u[k], M = E.instance, F = E.currentTarget;
          if (E = E.listener, M !== m && h.isPropagationStopped()) break e;
          ip(h, E, F), m = M;
        }
        else for (k = 0; k < u.length; k++) {
          if (E = u[k], M = E.instance, F = E.currentTarget, E = E.listener, M !== m && h.isPropagationStopped()) break e;
          ip(h, E, F), m = M;
        }
      }
    }
    if (Ni) throw t = el, Ni = !1, el = null, t;
  }
  function Re(t, r) {
    var s = r[Rl];
    s === void 0 && (s = r[Rl] = /* @__PURE__ */ new Set());
    var u = t + "__bubble";
    s.has(u) || (ap(r, t, 2, !1), s.add(u));
  }
  function Tl(t, r, s) {
    var u = 0;
    r && (u |= 4), ap(s, t, u, r);
  }
  var Qi = "_reactListening" + Math.random().toString(36).slice(2);
  function jo(t) {
    if (!t[Qi]) {
      t[Qi] = !0, i.forEach(function(s) {
        s !== "selectionchange" && (Mw.has(s) || Tl(s, !1, t), Tl(s, !0, t));
      });
      var r = t.nodeType === 9 ? t : t.ownerDocument;
      r === null || r[Qi] || (r[Qi] = !0, Tl("selectionchange", !1, r));
    }
  }
  function ap(t, r, s, u) {
    switch (Mf(r)) {
      case 1:
        var h = HS;
        break;
      case 4:
        h = WS;
        break;
      default:
        h = al;
    }
    s = h.bind(null, r, s, t), h = void 0, !Ja || r !== "touchstart" && r !== "touchmove" && r !== "wheel" || (h = !0), u ? h !== void 0 ? t.addEventListener(r, s, { capture: !0, passive: h }) : t.addEventListener(r, s, !0) : h !== void 0 ? t.addEventListener(r, s, { passive: h }) : t.addEventListener(r, s, !1);
  }
  function Al(t, r, s, u, h) {
    var m = u;
    if ((r & 1) === 0 && (r & 2) === 0 && u !== null) e: for (; ; ) {
      if (u === null) return;
      var k = u.tag;
      if (k === 3 || k === 4) {
        var E = u.stateNode.containerInfo;
        if (E === h || E.nodeType === 8 && E.parentNode === h) break;
        if (k === 4) for (k = u.return; k !== null; ) {
          var M = k.tag;
          if ((M === 3 || M === 4) && (M = k.stateNode.containerInfo, M === h || M.nodeType === 8 && M.parentNode === h)) return;
          k = k.return;
        }
        for (; E !== null; ) {
          if (k = Xn(E), k === null) return;
          if (M = k.tag, M === 5 || M === 6) {
            u = m = k;
            continue e;
          }
          E = E.parentNode;
        }
      }
      u = u.return;
    }
    ff(function() {
      var F = m, B = Xa(s), W = [];
      e: {
        var z = rp.get(t);
        if (z !== void 0) {
          var ee = cl, ne = t;
          switch (t) {
            case "keypress":
              if ($i(s) === 0) break e;
            case "keydown":
            case "keyup":
              ee = sw;
              break;
            case "focusin":
              ne = "focus", ee = pl;
              break;
            case "focusout":
              ne = "blur", ee = pl;
              break;
            case "beforeblur":
            case "afterblur":
              ee = pl;
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
              ee = Df;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              ee = YS;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              ee = uw;
              break;
            case Jf:
            case ep:
            case tp:
              ee = ZS;
              break;
            case np:
              ee = dw;
              break;
            case "scroll":
              ee = GS;
              break;
            case "wheel":
              ee = pw;
              break;
            case "copy":
            case "cut":
            case "paste":
              ee = JS;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              ee = If;
          }
          var oe = (r & 4) !== 0, Ve = !oe && t === "scroll", j = oe ? z !== null ? z + "Capture" : null : z;
          oe = [];
          for (var N = F, I; N !== null; ) {
            I = N;
            var Y = I.stateNode;
            if (I.tag === 5 && Y !== null && (I = Y, j !== null && (Y = yo(N, j), Y != null && oe.push(Io(N, Y, I)))), Ve) break;
            N = N.return;
          }
          0 < oe.length && (z = new ee(z, ne, null, s, B), W.push({ event: z, listeners: oe }));
        }
      }
      if ((r & 7) === 0) {
        e: {
          if (z = t === "mouseover" || t === "pointerover", ee = t === "mouseout" || t === "pointerout", z && s !== Qa && (ne = s.relatedTarget || s.fromElement) && (Xn(ne) || ne[an])) break e;
          if ((ee || z) && (z = B.window === B ? B : (z = B.ownerDocument) ? z.defaultView || z.parentWindow : window, ee ? (ne = s.relatedTarget || s.toElement, ee = F, ne = ne ? Xn(ne) : null, ne !== null && (Ve = Qn(ne), ne !== Ve || ne.tag !== 5 && ne.tag !== 6) && (ne = null)) : (ee = null, ne = F), ee !== ne)) {
            if (oe = Df, Y = "onMouseLeave", j = "onMouseEnter", N = "mouse", (t === "pointerout" || t === "pointerover") && (oe = If, Y = "onPointerLeave", j = "onPointerEnter", N = "pointer"), Ve = ee == null ? z : Pr(ee), I = ne == null ? z : Pr(ne), z = new oe(Y, N + "leave", ee, s, B), z.target = Ve, z.relatedTarget = I, Y = null, Xn(B) === F && (oe = new oe(j, N + "enter", ne, s, B), oe.target = I, oe.relatedTarget = Ve, Y = oe), Ve = Y, ee && ne) t: {
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
            ee !== null && lp(W, z, ee, oe, !1), ne !== null && Ve !== null && lp(W, Ve, ne, oe, !0);
          }
        }
        e: {
          if (z = F ? Pr(F) : window, ee = z.nodeName && z.nodeName.toLowerCase(), ee === "select" || ee === "input" && z.type === "file") var ie = ww;
          else if (Bf(z)) if ($f) ie = Tw;
          else {
            ie = _w;
            var se = xw;
          }
          else (ee = z.nodeName) && ee.toLowerCase() === "input" && (z.type === "checkbox" || z.type === "radio") && (ie = kw);
          if (ie && (ie = ie(t, F))) {
            Uf(W, ie, s, B);
            break e;
          }
          se && se(t, z, F), t === "focusout" && (se = z._wrapperState) && se.controlled && z.type === "number" && Ha(z, "number", z.value);
        }
        switch (se = F ? Pr(F) : window, t) {
          case "focusin":
            (Bf(se) || se.contentEditable === "true") && (Ar = se, Sl = F, No = null);
            break;
          case "focusout":
            No = Sl = Ar = null;
            break;
          case "mousedown":
            wl = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            wl = !1, Zf(W, s, B);
            break;
          case "selectionchange":
            if (bw) break;
          case "keydown":
          case "keyup":
            Zf(W, s, B);
        }
        var ae;
        if (ml) e: {
          switch (t) {
            case "compositionstart":
              var fe = "onCompositionStart";
              break e;
            case "compositionend":
              fe = "onCompositionEnd";
              break e;
            case "compositionupdate":
              fe = "onCompositionUpdate";
              break e;
          }
          fe = void 0;
        }
        else Tr ? Vf(t, s) && (fe = "onCompositionEnd") : t === "keydown" && s.keyCode === 229 && (fe = "onCompositionStart");
        fe && (Ff && s.locale !== "ko" && (Tr || fe !== "onCompositionStart" ? fe === "onCompositionEnd" && Tr && (ae = Rf()) : (_n = B, ul = "value" in _n ? _n.value : _n.textContent, Tr = !0)), se = Xi(F, fe), 0 < se.length && (fe = new jf(fe, t, null, s, B), W.push({ event: fe, listeners: se }), ae ? fe.data = ae : (ae = zf(s), ae !== null && (fe.data = ae)))), (ae = mw ? yw(t, s) : gw(t, s)) && (F = Xi(F, "onBeforeInput"), 0 < F.length && (B = new jf("onBeforeInput", "beforeinput", null, s, B), W.push({ event: B, listeners: F }), B.data = ae));
      }
      sp(W, r);
    });
  }
  function Io(t, r, s) {
    return { instance: t, listener: r, currentTarget: s };
  }
  function Xi(t, r) {
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
  function lp(t, r, s, u, h) {
    for (var m = r._reactName, k = []; s !== null && s !== u; ) {
      var E = s, M = E.alternate, F = E.stateNode;
      if (M !== null && M === u) break;
      E.tag === 5 && F !== null && (E = F, h ? (M = yo(s, m), M != null && k.unshift(Io(s, M, E))) : h || (M = yo(s, m), M != null && k.push(Io(s, M, E)))), s = s.return;
    }
    k.length !== 0 && t.push({ event: r, listeners: k });
  }
  var Rw = /\r\n?/g, Nw = /\u0000|\uFFFD/g;
  function up(t) {
    return (typeof t == "string" ? t : "" + t).replace(Rw, `
`).replace(Nw, "");
  }
  function Zi(t, r, s) {
    if (r = up(r), up(t) !== r && s) throw Error(o(425));
  }
  function qi() {
  }
  var Cl = null, bl = null;
  function El(t, r) {
    return t === "textarea" || t === "noscript" || typeof r.children == "string" || typeof r.children == "number" || typeof r.dangerouslySetInnerHTML == "object" && r.dangerouslySetInnerHTML !== null && r.dangerouslySetInnerHTML.__html != null;
  }
  var Pl = typeof setTimeout == "function" ? setTimeout : void 0, Dw = typeof clearTimeout == "function" ? clearTimeout : void 0, cp = typeof Promise == "function" ? Promise : void 0, jw = typeof queueMicrotask == "function" ? queueMicrotask : typeof cp < "u" ? function(t) {
    return cp.resolve(null).then(t).catch(Iw);
  } : Pl;
  function Iw(t) {
    setTimeout(function() {
      throw t;
    });
  }
  function Ml(t, r) {
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
  function dp(t) {
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
  var Er = Math.random().toString(36).slice(2), Gt = "__reactFiber$" + Er, Fo = "__reactProps$" + Er, an = "__reactContainer$" + Er, Rl = "__reactEvents$" + Er, Fw = "__reactListeners$" + Er, Ow = "__reactHandles$" + Er;
  function Xn(t) {
    var r = t[Gt];
    if (r) return r;
    for (var s = t.parentNode; s; ) {
      if (r = s[an] || s[Gt]) {
        if (s = r.alternate, r.child !== null || s !== null && s.child !== null) for (t = dp(t); t !== null; ) {
          if (s = t[Gt]) return s;
          t = dp(t);
        }
        return r;
      }
      t = s, s = t.parentNode;
    }
    return null;
  }
  function Oo(t) {
    return t = t[Gt] || t[an], !t || t.tag !== 5 && t.tag !== 6 && t.tag !== 13 && t.tag !== 3 ? null : t;
  }
  function Pr(t) {
    if (t.tag === 5 || t.tag === 6) return t.stateNode;
    throw Error(o(33));
  }
  function Ji(t) {
    return t[Fo] || null;
  }
  var Nl = [], Mr = -1;
  function An(t) {
    return { current: t };
  }
  function Ne(t) {
    0 > Mr || (t.current = Nl[Mr], Nl[Mr] = null, Mr--);
  }
  function Me(t, r) {
    Mr++, Nl[Mr] = t.current, t.current = r;
  }
  var Cn = {}, et = An(Cn), ut = An(!1), Zn = Cn;
  function Rr(t, r) {
    var s = t.type.contextTypes;
    if (!s) return Cn;
    var u = t.stateNode;
    if (u && u.__reactInternalMemoizedUnmaskedChildContext === r) return u.__reactInternalMemoizedMaskedChildContext;
    var h = {}, m;
    for (m in s) h[m] = r[m];
    return u && (t = t.stateNode, t.__reactInternalMemoizedUnmaskedChildContext = r, t.__reactInternalMemoizedMaskedChildContext = h), h;
  }
  function ct(t) {
    return t = t.childContextTypes, t != null;
  }
  function es() {
    Ne(ut), Ne(et);
  }
  function fp(t, r, s) {
    if (et.current !== Cn) throw Error(o(168));
    Me(et, r), Me(ut, s);
  }
  function pp(t, r, s) {
    var u = t.stateNode;
    if (r = r.childContextTypes, typeof u.getChildContext != "function") return s;
    u = u.getChildContext();
    for (var h in u) if (!(h in r)) throw Error(o(108, me(t) || "Unknown", h));
    return K({}, s, u);
  }
  function ts(t) {
    return t = (t = t.stateNode) && t.__reactInternalMemoizedMergedChildContext || Cn, Zn = et.current, Me(et, t), Me(ut, ut.current), !0;
  }
  function hp(t, r, s) {
    var u = t.stateNode;
    if (!u) throw Error(o(169));
    s ? (t = pp(t, r, Zn), u.__reactInternalMemoizedMergedChildContext = t, Ne(ut), Ne(et), Me(et, t)) : Ne(ut), Me(ut, s);
  }
  var ln = null, ns = !1, Dl = !1;
  function mp(t) {
    ln === null ? ln = [t] : ln.push(t);
  }
  function Lw(t) {
    ns = !0, mp(t);
  }
  function bn() {
    if (!Dl && ln !== null) {
      Dl = !0;
      var t = 0, r = Ae;
      try {
        var s = ln;
        for (Ae = 1; t < s.length; t++) {
          var u = s[t];
          do
            u = u(!0);
          while (u !== null);
        }
        ln = null, ns = !1;
      } catch (h) {
        throw ln !== null && (ln = ln.slice(t + 1)), gf(tl, bn), h;
      } finally {
        Ae = r, Dl = !1;
      }
    }
    return null;
  }
  var Nr = [], Dr = 0, rs = null, os = 0, kt = [], Tt = 0, qn = null, un = 1, cn = "";
  function Jn(t, r) {
    Nr[Dr++] = os, Nr[Dr++] = rs, rs = t, os = r;
  }
  function yp(t, r, s) {
    kt[Tt++] = un, kt[Tt++] = cn, kt[Tt++] = qn, qn = t;
    var u = un;
    t = cn;
    var h = 32 - Nt(u) - 1;
    u &= ~(1 << h), s += 1;
    var m = 32 - Nt(r) + h;
    if (30 < m) {
      var k = h - h % 5;
      m = (u & (1 << k) - 1).toString(32), u >>= k, h -= k, un = 1 << 32 - Nt(r) + h | s << h | u, cn = m + t;
    } else un = 1 << m | s << h | u, cn = t;
  }
  function jl(t) {
    t.return !== null && (Jn(t, 1), yp(t, 1, 0));
  }
  function Il(t) {
    for (; t === rs; ) rs = Nr[--Dr], Nr[Dr] = null, os = Nr[--Dr], Nr[Dr] = null;
    for (; t === qn; ) qn = kt[--Tt], kt[Tt] = null, cn = kt[--Tt], kt[Tt] = null, un = kt[--Tt], kt[Tt] = null;
  }
  var wt = null, xt = null, De = !1, jt = null;
  function gp(t, r) {
    var s = Et(5, null, null, 0);
    s.elementType = "DELETED", s.stateNode = r, s.return = t, r = t.deletions, r === null ? (t.deletions = [s], t.flags |= 16) : r.push(s);
  }
  function vp(t, r) {
    switch (t.tag) {
      case 5:
        var s = t.type;
        return r = r.nodeType !== 1 || s.toLowerCase() !== r.nodeName.toLowerCase() ? null : r, r !== null ? (t.stateNode = r, wt = t, xt = Tn(r.firstChild), !0) : !1;
      case 6:
        return r = t.pendingProps === "" || r.nodeType !== 3 ? null : r, r !== null ? (t.stateNode = r, wt = t, xt = null, !0) : !1;
      case 13:
        return r = r.nodeType !== 8 ? null : r, r !== null ? (s = qn !== null ? { id: un, overflow: cn } : null, t.memoizedState = { dehydrated: r, treeContext: s, retryLane: 1073741824 }, s = Et(18, null, null, 0), s.stateNode = r, s.return = t, t.child = s, wt = t, xt = null, !0) : !1;
      default:
        return !1;
    }
  }
  function Fl(t) {
    return (t.mode & 1) !== 0 && (t.flags & 128) === 0;
  }
  function Ol(t) {
    if (De) {
      var r = xt;
      if (r) {
        var s = r;
        if (!vp(t, r)) {
          if (Fl(t)) throw Error(o(418));
          r = Tn(s.nextSibling);
          var u = wt;
          r && vp(t, r) ? gp(u, s) : (t.flags = t.flags & -4097 | 2, De = !1, wt = t);
        }
      } else {
        if (Fl(t)) throw Error(o(418));
        t.flags = t.flags & -4097 | 2, De = !1, wt = t;
      }
    }
  }
  function Sp(t) {
    for (t = t.return; t !== null && t.tag !== 5 && t.tag !== 3 && t.tag !== 13; ) t = t.return;
    wt = t;
  }
  function is(t) {
    if (t !== wt) return !1;
    if (!De) return Sp(t), De = !0, !1;
    var r;
    if ((r = t.tag !== 3) && !(r = t.tag !== 5) && (r = t.type, r = r !== "head" && r !== "body" && !El(t.type, t.memoizedProps)), r && (r = xt)) {
      if (Fl(t)) throw wp(), Error(o(418));
      for (; r; ) gp(t, r), r = Tn(r.nextSibling);
    }
    if (Sp(t), t.tag === 13) {
      if (t = t.memoizedState, t = t !== null ? t.dehydrated : null, !t) throw Error(o(317));
      e: {
        for (t = t.nextSibling, r = 0; t; ) {
          if (t.nodeType === 8) {
            var s = t.data;
            if (s === "/$") {
              if (r === 0) {
                xt = Tn(t.nextSibling);
                break e;
              }
              r--;
            } else s !== "$" && s !== "$!" && s !== "$?" || r++;
          }
          t = t.nextSibling;
        }
        xt = null;
      }
    } else xt = wt ? Tn(t.stateNode.nextSibling) : null;
    return !0;
  }
  function wp() {
    for (var t = xt; t; ) t = Tn(t.nextSibling);
  }
  function jr() {
    xt = wt = null, De = !1;
  }
  function Ll(t) {
    jt === null ? jt = [t] : jt.push(t);
  }
  var Vw = D.ReactCurrentBatchConfig;
  function Lo(t, r, s) {
    if (t = s.ref, t !== null && typeof t != "function" && typeof t != "object") {
      if (s._owner) {
        if (s = s._owner, s) {
          if (s.tag !== 1) throw Error(o(309));
          var u = s.stateNode;
        }
        if (!u) throw Error(o(147, t));
        var h = u, m = "" + t;
        return r !== null && r.ref !== null && typeof r.ref == "function" && r.ref._stringRef === m ? r.ref : (r = function(k) {
          var E = h.refs;
          k === null ? delete E[m] : E[m] = k;
        }, r._stringRef = m, r);
      }
      if (typeof t != "string") throw Error(o(284));
      if (!s._owner) throw Error(o(290, t));
    }
    return t;
  }
  function ss(t, r) {
    throw t = Object.prototype.toString.call(r), Error(o(31, t === "[object Object]" ? "object with keys {" + Object.keys(r).join(", ") + "}" : t));
  }
  function xp(t) {
    var r = t._init;
    return r(t._payload);
  }
  function _p(t) {
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
    function k(j) {
      return t && j.alternate === null && (j.flags |= 2), j;
    }
    function E(j, N, I, Y) {
      return N === null || N.tag !== 6 ? (N = Pu(I, j.mode, Y), N.return = j, N) : (N = h(N, I), N.return = j, N);
    }
    function M(j, N, I, Y) {
      var ie = I.type;
      return ie === Z ? B(j, N, I.props.children, Y, I.key) : N !== null && (N.elementType === ie || typeof ie == "object" && ie !== null && ie.$$typeof === ue && xp(ie) === N.type) ? (Y = h(N, I.props), Y.ref = Lo(j, N, I), Y.return = j, Y) : (Y = Ms(I.type, I.key, I.props, null, j.mode, Y), Y.ref = Lo(j, N, I), Y.return = j, Y);
    }
    function F(j, N, I, Y) {
      return N === null || N.tag !== 4 || N.stateNode.containerInfo !== I.containerInfo || N.stateNode.implementation !== I.implementation ? (N = Mu(I, j.mode, Y), N.return = j, N) : (N = h(N, I.children || []), N.return = j, N);
    }
    function B(j, N, I, Y, ie) {
      return N === null || N.tag !== 7 ? (N = ar(I, j.mode, Y, ie), N.return = j, N) : (N = h(N, I), N.return = j, N);
    }
    function W(j, N, I) {
      if (typeof N == "string" && N !== "" || typeof N == "number") return N = Pu("" + N, j.mode, I), N.return = j, N;
      if (typeof N == "object" && N !== null) {
        switch (N.$$typeof) {
          case L:
            return I = Ms(N.type, N.key, N.props, null, j.mode, I), I.ref = Lo(j, null, N), I.return = j, I;
          case X:
            return N = Mu(N, j.mode, I), N.return = j, N;
          case ue:
            var Y = N._init;
            return W(j, Y(N._payload), I);
        }
        if (po(N) || q(N)) return N = ar(N, j.mode, I, null), N.return = j, N;
        ss(j, N);
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
        ss(j, I);
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
        ss(N, Y);
      }
      return null;
    }
    function ne(j, N, I, Y) {
      for (var ie = null, se = null, ae = N, fe = N = 0, Ke = null; ae !== null && fe < I.length; fe++) {
        ae.index > fe ? (Ke = ae, ae = null) : Ke = ae.sibling;
        var ke = z(j, ae, I[fe], Y);
        if (ke === null) {
          ae === null && (ae = Ke);
          break;
        }
        t && ae && ke.alternate === null && r(j, ae), N = m(ke, N, fe), se === null ? ie = ke : se.sibling = ke, se = ke, ae = Ke;
      }
      if (fe === I.length) return s(j, ae), De && Jn(j, fe), ie;
      if (ae === null) {
        for (; fe < I.length; fe++) ae = W(j, I[fe], Y), ae !== null && (N = m(ae, N, fe), se === null ? ie = ae : se.sibling = ae, se = ae);
        return De && Jn(j, fe), ie;
      }
      for (ae = u(j, ae); fe < I.length; fe++) Ke = ee(ae, j, fe, I[fe], Y), Ke !== null && (t && Ke.alternate !== null && ae.delete(Ke.key === null ? fe : Ke.key), N = m(Ke, N, fe), se === null ? ie = Ke : se.sibling = Ke, se = Ke);
      return t && ae.forEach(function(Fn) {
        return r(j, Fn);
      }), De && Jn(j, fe), ie;
    }
    function oe(j, N, I, Y) {
      var ie = q(I);
      if (typeof ie != "function") throw Error(o(150));
      if (I = ie.call(I), I == null) throw Error(o(151));
      for (var se = ie = null, ae = N, fe = N = 0, Ke = null, ke = I.next(); ae !== null && !ke.done; fe++, ke = I.next()) {
        ae.index > fe ? (Ke = ae, ae = null) : Ke = ae.sibling;
        var Fn = z(j, ae, ke.value, Y);
        if (Fn === null) {
          ae === null && (ae = Ke);
          break;
        }
        t && ae && Fn.alternate === null && r(j, ae), N = m(Fn, N, fe), se === null ? ie = Fn : se.sibling = Fn, se = Fn, ae = Ke;
      }
      if (ke.done) return s(
        j,
        ae
      ), De && Jn(j, fe), ie;
      if (ae === null) {
        for (; !ke.done; fe++, ke = I.next()) ke = W(j, ke.value, Y), ke !== null && (N = m(ke, N, fe), se === null ? ie = ke : se.sibling = ke, se = ke);
        return De && Jn(j, fe), ie;
      }
      for (ae = u(j, ae); !ke.done; fe++, ke = I.next()) ke = ee(ae, j, fe, ke.value, Y), ke !== null && (t && ke.alternate !== null && ae.delete(ke.key === null ? fe : ke.key), N = m(ke, N, fe), se === null ? ie = ke : se.sibling = ke, se = ke);
      return t && ae.forEach(function(vx) {
        return r(j, vx);
      }), De && Jn(j, fe), ie;
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
                  } else if (se.elementType === ie || typeof ie == "object" && ie !== null && ie.$$typeof === ue && xp(ie) === se.type) {
                    s(j, se.sibling), N = h(se, I.props), N.ref = Lo(j, se, I), N.return = j, j = N;
                    break e;
                  }
                  s(j, se);
                  break;
                } else r(j, se);
                se = se.sibling;
              }
              I.type === Z ? (N = ar(I.props.children, j.mode, Y, I.key), N.return = j, j = N) : (Y = Ms(I.type, I.key, I.props, null, j.mode, Y), Y.ref = Lo(j, N, I), Y.return = j, j = Y);
            }
            return k(j);
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
              N = Mu(I, j.mode, Y), N.return = j, j = N;
            }
            return k(j);
          case ue:
            return se = I._init, Ve(j, N, se(I._payload), Y);
        }
        if (po(I)) return ne(j, N, I, Y);
        if (q(I)) return oe(j, N, I, Y);
        ss(j, I);
      }
      return typeof I == "string" && I !== "" || typeof I == "number" ? (I = "" + I, N !== null && N.tag === 6 ? (s(j, N.sibling), N = h(N, I), N.return = j, j = N) : (s(j, N), N = Pu(I, j.mode, Y), N.return = j, j = N), k(j)) : s(j, N);
    }
    return Ve;
  }
  var Ir = _p(!0), kp = _p(!1), as = An(null), ls = null, Fr = null, Vl = null;
  function zl() {
    Vl = Fr = ls = null;
  }
  function Bl(t) {
    var r = as.current;
    Ne(as), t._currentValue = r;
  }
  function Ul(t, r, s) {
    for (; t !== null; ) {
      var u = t.alternate;
      if ((t.childLanes & r) !== r ? (t.childLanes |= r, u !== null && (u.childLanes |= r)) : u !== null && (u.childLanes & r) !== r && (u.childLanes |= r), t === s) break;
      t = t.return;
    }
  }
  function Or(t, r) {
    ls = t, Vl = Fr = null, t = t.dependencies, t !== null && t.firstContext !== null && ((t.lanes & r) !== 0 && (dt = !0), t.firstContext = null);
  }
  function At(t) {
    var r = t._currentValue;
    if (Vl !== t) if (t = { context: t, memoizedValue: r, next: null }, Fr === null) {
      if (ls === null) throw Error(o(308));
      Fr = t, ls.dependencies = { lanes: 0, firstContext: t };
    } else Fr = Fr.next = t;
    return r;
  }
  var er = null;
  function $l(t) {
    er === null ? er = [t] : er.push(t);
  }
  function Tp(t, r, s, u) {
    var h = r.interleaved;
    return h === null ? (s.next = s, $l(r)) : (s.next = h.next, h.next = s), r.interleaved = s, dn(t, u);
  }
  function dn(t, r) {
    t.lanes |= r;
    var s = t.alternate;
    for (s !== null && (s.lanes |= r), s = t, t = t.return; t !== null; ) t.childLanes |= r, s = t.alternate, s !== null && (s.childLanes |= r), s = t, t = t.return;
    return s.tag === 3 ? s.stateNode : null;
  }
  var En = !1;
  function Hl(t) {
    t.updateQueue = { baseState: t.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
  }
  function Ap(t, r) {
    t = t.updateQueue, r.updateQueue === t && (r.updateQueue = { baseState: t.baseState, firstBaseUpdate: t.firstBaseUpdate, lastBaseUpdate: t.lastBaseUpdate, shared: t.shared, effects: t.effects });
  }
  function fn(t, r) {
    return { eventTime: t, lane: r, tag: 0, payload: null, callback: null, next: null };
  }
  function Pn(t, r, s) {
    var u = t.updateQueue;
    if (u === null) return null;
    if (u = u.shared, (_e & 2) !== 0) {
      var h = u.pending;
      return h === null ? r.next = r : (r.next = h.next, h.next = r), u.pending = r, dn(t, s);
    }
    return h = u.interleaved, h === null ? (r.next = r, $l(u)) : (r.next = h.next, h.next = r), u.interleaved = r, dn(t, s);
  }
  function us(t, r, s) {
    if (r = r.updateQueue, r !== null && (r = r.shared, (s & 4194240) !== 0)) {
      var u = r.lanes;
      u &= t.pendingLanes, s |= u, r.lanes = s, ol(t, s);
    }
  }
  function Cp(t, r) {
    var s = t.updateQueue, u = t.alternate;
    if (u !== null && (u = u.updateQueue, s === u)) {
      var h = null, m = null;
      if (s = s.firstBaseUpdate, s !== null) {
        do {
          var k = { eventTime: s.eventTime, lane: s.lane, tag: s.tag, payload: s.payload, callback: s.callback, next: null };
          m === null ? h = m = k : m = m.next = k, s = s.next;
        } while (s !== null);
        m === null ? h = m = r : m = m.next = r;
      } else h = m = r;
      s = { baseState: u.baseState, firstBaseUpdate: h, lastBaseUpdate: m, shared: u.shared, effects: u.effects }, t.updateQueue = s;
      return;
    }
    t = s.lastBaseUpdate, t === null ? s.firstBaseUpdate = r : t.next = r, s.lastBaseUpdate = r;
  }
  function cs(t, r, s, u) {
    var h = t.updateQueue;
    En = !1;
    var m = h.firstBaseUpdate, k = h.lastBaseUpdate, E = h.shared.pending;
    if (E !== null) {
      h.shared.pending = null;
      var M = E, F = M.next;
      M.next = null, k === null ? m = F : k.next = F, k = M;
      var B = t.alternate;
      B !== null && (B = B.updateQueue, E = B.lastBaseUpdate, E !== k && (E === null ? B.firstBaseUpdate = F : E.next = F, B.lastBaseUpdate = M));
    }
    if (m !== null) {
      var W = h.baseState;
      k = 0, B = F = M = null, E = m;
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
                  W = ne.call(ee, W, z);
                  break e;
                }
                W = ne;
                break e;
              case 3:
                ne.flags = ne.flags & -65537 | 128;
              case 0:
                if (ne = oe.payload, z = typeof ne == "function" ? ne.call(ee, W, z) : ne, z == null) break e;
                W = K({}, W, z);
                break e;
              case 2:
                En = !0;
            }
          }
          E.callback !== null && E.lane !== 0 && (t.flags |= 64, z = h.effects, z === null ? h.effects = [E] : z.push(E));
        } else ee = { eventTime: ee, lane: z, tag: E.tag, payload: E.payload, callback: E.callback, next: null }, B === null ? (F = B = ee, M = W) : B = B.next = ee, k |= z;
        if (E = E.next, E === null) {
          if (E = h.shared.pending, E === null) break;
          z = E, E = z.next, z.next = null, h.lastBaseUpdate = z, h.shared.pending = null;
        }
      } while (!0);
      if (B === null && (M = W), h.baseState = M, h.firstBaseUpdate = F, h.lastBaseUpdate = B, r = h.shared.interleaved, r !== null) {
        h = r;
        do
          k |= h.lane, h = h.next;
        while (h !== r);
      } else m === null && (h.shared.lanes = 0);
      rr |= k, t.lanes = k, t.memoizedState = W;
    }
  }
  function bp(t, r, s) {
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
  function Wl(t, r) {
    switch (Me(Bo, r), Me(zo, t), Me(Kt, Vo), t = r.nodeType, t) {
      case 9:
      case 11:
        r = (r = r.documentElement) ? r.namespaceURI : Ga(null, "");
        break;
      default:
        t = t === 8 ? r.parentNode : r, r = t.namespaceURI || null, t = t.tagName, r = Ga(r, t);
    }
    Ne(Kt), Me(Kt, r);
  }
  function Lr() {
    Ne(Kt), Ne(zo), Ne(Bo);
  }
  function Ep(t) {
    tr(Bo.current);
    var r = tr(Kt.current), s = Ga(r, t.type);
    r !== s && (Me(zo, t), Me(Kt, s));
  }
  function Gl(t) {
    zo.current === t && (Ne(Kt), Ne(zo));
  }
  var je = An(0);
  function ds(t) {
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
  var Kl = [];
  function Yl() {
    for (var t = 0; t < Kl.length; t++) Kl[t]._workInProgressVersionPrimary = null;
    Kl.length = 0;
  }
  var fs = D.ReactCurrentDispatcher, Ql = D.ReactCurrentBatchConfig, nr = 0, Ie = null, Ue = null, We = null, ps = !1, Uo = !1, $o = 0, zw = 0;
  function tt() {
    throw Error(o(321));
  }
  function Xl(t, r) {
    if (r === null) return !1;
    for (var s = 0; s < r.length && s < t.length; s++) if (!Dt(t[s], r[s])) return !1;
    return !0;
  }
  function Zl(t, r, s, u, h, m) {
    if (nr = m, Ie = r, r.memoizedState = null, r.updateQueue = null, r.lanes = 0, fs.current = t === null || t.memoizedState === null ? Hw : Ww, t = s(u, h), Uo) {
      m = 0;
      do {
        if (Uo = !1, $o = 0, 25 <= m) throw Error(o(301));
        m += 1, We = Ue = null, r.updateQueue = null, fs.current = Gw, t = s(u, h);
      } while (Uo);
    }
    if (fs.current = ys, r = Ue !== null && Ue.next !== null, nr = 0, We = Ue = Ie = null, ps = !1, r) throw Error(o(300));
    return t;
  }
  function ql() {
    var t = $o !== 0;
    return $o = 0, t;
  }
  function Yt() {
    var t = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
    return We === null ? Ie.memoizedState = We = t : We = We.next = t, We;
  }
  function Ct() {
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
  function Jl(t) {
    var r = Ct(), s = r.queue;
    if (s === null) throw Error(o(311));
    s.lastRenderedReducer = t;
    var u = Ue, h = u.baseQueue, m = s.pending;
    if (m !== null) {
      if (h !== null) {
        var k = h.next;
        h.next = m.next, m.next = k;
      }
      u.baseQueue = h = m, s.pending = null;
    }
    if (h !== null) {
      m = h.next, u = u.baseState;
      var E = k = null, M = null, F = m;
      do {
        var B = F.lane;
        if ((nr & B) === B) M !== null && (M = M.next = { lane: 0, action: F.action, hasEagerState: F.hasEagerState, eagerState: F.eagerState, next: null }), u = F.hasEagerState ? F.eagerState : t(u, F.action);
        else {
          var W = {
            lane: B,
            action: F.action,
            hasEagerState: F.hasEagerState,
            eagerState: F.eagerState,
            next: null
          };
          M === null ? (E = M = W, k = u) : M = M.next = W, Ie.lanes |= B, rr |= B;
        }
        F = F.next;
      } while (F !== null && F !== m);
      M === null ? k = u : M.next = E, Dt(u, r.memoizedState) || (dt = !0), r.memoizedState = u, r.baseState = k, r.baseQueue = M, s.lastRenderedState = u;
    }
    if (t = s.interleaved, t !== null) {
      h = t;
      do
        m = h.lane, Ie.lanes |= m, rr |= m, h = h.next;
      while (h !== t);
    } else h === null && (s.lanes = 0);
    return [r.memoizedState, s.dispatch];
  }
  function eu(t) {
    var r = Ct(), s = r.queue;
    if (s === null) throw Error(o(311));
    s.lastRenderedReducer = t;
    var u = s.dispatch, h = s.pending, m = r.memoizedState;
    if (h !== null) {
      s.pending = null;
      var k = h = h.next;
      do
        m = t(m, k.action), k = k.next;
      while (k !== h);
      Dt(m, r.memoizedState) || (dt = !0), r.memoizedState = m, r.baseQueue === null && (r.baseState = m), s.lastRenderedState = m;
    }
    return [m, u];
  }
  function Pp() {
  }
  function Mp(t, r) {
    var s = Ie, u = Ct(), h = r(), m = !Dt(u.memoizedState, h);
    if (m && (u.memoizedState = h, dt = !0), u = u.queue, tu(Dp.bind(null, s, u, t), [t]), u.getSnapshot !== r || m || We !== null && We.memoizedState.tag & 1) {
      if (s.flags |= 2048, Wo(9, Np.bind(null, s, u, h, r), void 0, null), Ge === null) throw Error(o(349));
      (nr & 30) !== 0 || Rp(s, r, h);
    }
    return h;
  }
  function Rp(t, r, s) {
    t.flags |= 16384, t = { getSnapshot: r, value: s }, r = Ie.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, Ie.updateQueue = r, r.stores = [t]) : (s = r.stores, s === null ? r.stores = [t] : s.push(t));
  }
  function Np(t, r, s, u) {
    r.value = s, r.getSnapshot = u, jp(r) && Ip(t);
  }
  function Dp(t, r, s) {
    return s(function() {
      jp(r) && Ip(t);
    });
  }
  function jp(t) {
    var r = t.getSnapshot;
    t = t.value;
    try {
      var s = r();
      return !Dt(t, s);
    } catch {
      return !0;
    }
  }
  function Ip(t) {
    var r = dn(t, 1);
    r !== null && Lt(r, t, 1, -1);
  }
  function Fp(t) {
    var r = Yt();
    return typeof t == "function" && (t = t()), r.memoizedState = r.baseState = t, t = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: Ho, lastRenderedState: t }, r.queue = t, t = t.dispatch = $w.bind(null, Ie, t), [r.memoizedState, t];
  }
  function Wo(t, r, s, u) {
    return t = { tag: t, create: r, destroy: s, deps: u, next: null }, r = Ie.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, Ie.updateQueue = r, r.lastEffect = t.next = t) : (s = r.lastEffect, s === null ? r.lastEffect = t.next = t : (u = s.next, s.next = t, t.next = u, r.lastEffect = t)), t;
  }
  function Op() {
    return Ct().memoizedState;
  }
  function hs(t, r, s, u) {
    var h = Yt();
    Ie.flags |= t, h.memoizedState = Wo(1 | r, s, void 0, u === void 0 ? null : u);
  }
  function ms(t, r, s, u) {
    var h = Ct();
    u = u === void 0 ? null : u;
    var m = void 0;
    if (Ue !== null) {
      var k = Ue.memoizedState;
      if (m = k.destroy, u !== null && Xl(u, k.deps)) {
        h.memoizedState = Wo(r, s, m, u);
        return;
      }
    }
    Ie.flags |= t, h.memoizedState = Wo(1 | r, s, m, u);
  }
  function Lp(t, r) {
    return hs(8390656, 8, t, r);
  }
  function tu(t, r) {
    return ms(2048, 8, t, r);
  }
  function Vp(t, r) {
    return ms(4, 2, t, r);
  }
  function zp(t, r) {
    return ms(4, 4, t, r);
  }
  function Bp(t, r) {
    if (typeof r == "function") return t = t(), r(t), function() {
      r(null);
    };
    if (r != null) return t = t(), r.current = t, function() {
      r.current = null;
    };
  }
  function Up(t, r, s) {
    return s = s != null ? s.concat([t]) : null, ms(4, 4, Bp.bind(null, r, t), s);
  }
  function nu() {
  }
  function $p(t, r) {
    var s = Ct();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && Xl(r, u[1]) ? u[0] : (s.memoizedState = [t, r], t);
  }
  function Hp(t, r) {
    var s = Ct();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && Xl(r, u[1]) ? u[0] : (t = t(), s.memoizedState = [t, r], t);
  }
  function Wp(t, r, s) {
    return (nr & 21) === 0 ? (t.baseState && (t.baseState = !1, dt = !0), t.memoizedState = s) : (Dt(s, r) || (s = xf(), Ie.lanes |= s, rr |= s, t.baseState = !0), r);
  }
  function Bw(t, r) {
    var s = Ae;
    Ae = s !== 0 && 4 > s ? s : 4, t(!0);
    var u = Ql.transition;
    Ql.transition = {};
    try {
      t(!1), r();
    } finally {
      Ae = s, Ql.transition = u;
    }
  }
  function Gp() {
    return Ct().memoizedState;
  }
  function Uw(t, r, s) {
    var u = Dn(t);
    if (s = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null }, Kp(t)) Yp(r, s);
    else if (s = Tp(t, r, s, u), s !== null) {
      var h = it();
      Lt(s, t, u, h), Qp(s, r, u);
    }
  }
  function $w(t, r, s) {
    var u = Dn(t), h = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null };
    if (Kp(t)) Yp(r, h);
    else {
      var m = t.alternate;
      if (t.lanes === 0 && (m === null || m.lanes === 0) && (m = r.lastRenderedReducer, m !== null)) try {
        var k = r.lastRenderedState, E = m(k, s);
        if (h.hasEagerState = !0, h.eagerState = E, Dt(E, k)) {
          var M = r.interleaved;
          M === null ? (h.next = h, $l(r)) : (h.next = M.next, M.next = h), r.interleaved = h;
          return;
        }
      } catch {
      } finally {
      }
      s = Tp(t, r, h, u), s !== null && (h = it(), Lt(s, t, u, h), Qp(s, r, u));
    }
  }
  function Kp(t) {
    var r = t.alternate;
    return t === Ie || r !== null && r === Ie;
  }
  function Yp(t, r) {
    Uo = ps = !0;
    var s = t.pending;
    s === null ? r.next = r : (r.next = s.next, s.next = r), t.pending = r;
  }
  function Qp(t, r, s) {
    if ((s & 4194240) !== 0) {
      var u = r.lanes;
      u &= t.pendingLanes, s |= u, r.lanes = s, ol(t, s);
    }
  }
  var ys = { readContext: At, useCallback: tt, useContext: tt, useEffect: tt, useImperativeHandle: tt, useInsertionEffect: tt, useLayoutEffect: tt, useMemo: tt, useReducer: tt, useRef: tt, useState: tt, useDebugValue: tt, useDeferredValue: tt, useTransition: tt, useMutableSource: tt, useSyncExternalStore: tt, useId: tt, unstable_isNewReconciler: !1 }, Hw = { readContext: At, useCallback: function(t, r) {
    return Yt().memoizedState = [t, r === void 0 ? null : r], t;
  }, useContext: At, useEffect: Lp, useImperativeHandle: function(t, r, s) {
    return s = s != null ? s.concat([t]) : null, hs(
      4194308,
      4,
      Bp.bind(null, r, t),
      s
    );
  }, useLayoutEffect: function(t, r) {
    return hs(4194308, 4, t, r);
  }, useInsertionEffect: function(t, r) {
    return hs(4, 2, t, r);
  }, useMemo: function(t, r) {
    var s = Yt();
    return r = r === void 0 ? null : r, t = t(), s.memoizedState = [t, r], t;
  }, useReducer: function(t, r, s) {
    var u = Yt();
    return r = s !== void 0 ? s(r) : r, u.memoizedState = u.baseState = r, t = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: t, lastRenderedState: r }, u.queue = t, t = t.dispatch = Uw.bind(null, Ie, t), [u.memoizedState, t];
  }, useRef: function(t) {
    var r = Yt();
    return t = { current: t }, r.memoizedState = t;
  }, useState: Fp, useDebugValue: nu, useDeferredValue: function(t) {
    return Yt().memoizedState = t;
  }, useTransition: function() {
    var t = Fp(!1), r = t[0];
    return t = Bw.bind(null, t[1]), Yt().memoizedState = t, [r, t];
  }, useMutableSource: function() {
  }, useSyncExternalStore: function(t, r, s) {
    var u = Ie, h = Yt();
    if (De) {
      if (s === void 0) throw Error(o(407));
      s = s();
    } else {
      if (s = r(), Ge === null) throw Error(o(349));
      (nr & 30) !== 0 || Rp(u, r, s);
    }
    h.memoizedState = s;
    var m = { value: s, getSnapshot: r };
    return h.queue = m, Lp(Dp.bind(
      null,
      u,
      m,
      t
    ), [t]), u.flags |= 2048, Wo(9, Np.bind(null, u, m, s, r), void 0, null), s;
  }, useId: function() {
    var t = Yt(), r = Ge.identifierPrefix;
    if (De) {
      var s = cn, u = un;
      s = (u & ~(1 << 32 - Nt(u) - 1)).toString(32) + s, r = ":" + r + "R" + s, s = $o++, 0 < s && (r += "H" + s.toString(32)), r += ":";
    } else s = zw++, r = ":" + r + "r" + s.toString(32) + ":";
    return t.memoizedState = r;
  }, unstable_isNewReconciler: !1 }, Ww = {
    readContext: At,
    useCallback: $p,
    useContext: At,
    useEffect: tu,
    useImperativeHandle: Up,
    useInsertionEffect: Vp,
    useLayoutEffect: zp,
    useMemo: Hp,
    useReducer: Jl,
    useRef: Op,
    useState: function() {
      return Jl(Ho);
    },
    useDebugValue: nu,
    useDeferredValue: function(t) {
      var r = Ct();
      return Wp(r, Ue.memoizedState, t);
    },
    useTransition: function() {
      var t = Jl(Ho)[0], r = Ct().memoizedState;
      return [t, r];
    },
    useMutableSource: Pp,
    useSyncExternalStore: Mp,
    useId: Gp,
    unstable_isNewReconciler: !1
  }, Gw = { readContext: At, useCallback: $p, useContext: At, useEffect: tu, useImperativeHandle: Up, useInsertionEffect: Vp, useLayoutEffect: zp, useMemo: Hp, useReducer: eu, useRef: Op, useState: function() {
    return eu(Ho);
  }, useDebugValue: nu, useDeferredValue: function(t) {
    var r = Ct();
    return Ue === null ? r.memoizedState = t : Wp(r, Ue.memoizedState, t);
  }, useTransition: function() {
    var t = eu(Ho)[0], r = Ct().memoizedState;
    return [t, r];
  }, useMutableSource: Pp, useSyncExternalStore: Mp, useId: Gp, unstable_isNewReconciler: !1 };
  function It(t, r) {
    if (t && t.defaultProps) {
      r = K({}, r), t = t.defaultProps;
      for (var s in t) r[s] === void 0 && (r[s] = t[s]);
      return r;
    }
    return r;
  }
  function ru(t, r, s, u) {
    r = t.memoizedState, s = s(u, r), s = s == null ? r : K({}, r, s), t.memoizedState = s, t.lanes === 0 && (t.updateQueue.baseState = s);
  }
  var gs = { isMounted: function(t) {
    return (t = t._reactInternals) ? Qn(t) === t : !1;
  }, enqueueSetState: function(t, r, s) {
    t = t._reactInternals;
    var u = it(), h = Dn(t), m = fn(u, h);
    m.payload = r, s != null && (m.callback = s), r = Pn(t, m, h), r !== null && (Lt(r, t, h, u), us(r, t, h));
  }, enqueueReplaceState: function(t, r, s) {
    t = t._reactInternals;
    var u = it(), h = Dn(t), m = fn(u, h);
    m.tag = 1, m.payload = r, s != null && (m.callback = s), r = Pn(t, m, h), r !== null && (Lt(r, t, h, u), us(r, t, h));
  }, enqueueForceUpdate: function(t, r) {
    t = t._reactInternals;
    var s = it(), u = Dn(t), h = fn(s, u);
    h.tag = 2, r != null && (h.callback = r), r = Pn(t, h, u), r !== null && (Lt(r, t, u, s), us(r, t, u));
  } };
  function Xp(t, r, s, u, h, m, k) {
    return t = t.stateNode, typeof t.shouldComponentUpdate == "function" ? t.shouldComponentUpdate(u, m, k) : r.prototype && r.prototype.isPureReactComponent ? !Ro(s, u) || !Ro(h, m) : !0;
  }
  function Zp(t, r, s) {
    var u = !1, h = Cn, m = r.contextType;
    return typeof m == "object" && m !== null ? m = At(m) : (h = ct(r) ? Zn : et.current, u = r.contextTypes, m = (u = u != null) ? Rr(t, h) : Cn), r = new r(s, m), t.memoizedState = r.state !== null && r.state !== void 0 ? r.state : null, r.updater = gs, t.stateNode = r, r._reactInternals = t, u && (t = t.stateNode, t.__reactInternalMemoizedUnmaskedChildContext = h, t.__reactInternalMemoizedMaskedChildContext = m), r;
  }
  function qp(t, r, s, u) {
    t = r.state, typeof r.componentWillReceiveProps == "function" && r.componentWillReceiveProps(s, u), typeof r.UNSAFE_componentWillReceiveProps == "function" && r.UNSAFE_componentWillReceiveProps(s, u), r.state !== t && gs.enqueueReplaceState(r, r.state, null);
  }
  function ou(t, r, s, u) {
    var h = t.stateNode;
    h.props = s, h.state = t.memoizedState, h.refs = {}, Hl(t);
    var m = r.contextType;
    typeof m == "object" && m !== null ? h.context = At(m) : (m = ct(r) ? Zn : et.current, h.context = Rr(t, m)), h.state = t.memoizedState, m = r.getDerivedStateFromProps, typeof m == "function" && (ru(t, r, m, s), h.state = t.memoizedState), typeof r.getDerivedStateFromProps == "function" || typeof h.getSnapshotBeforeUpdate == "function" || typeof h.UNSAFE_componentWillMount != "function" && typeof h.componentWillMount != "function" || (r = h.state, typeof h.componentWillMount == "function" && h.componentWillMount(), typeof h.UNSAFE_componentWillMount == "function" && h.UNSAFE_componentWillMount(), r !== h.state && gs.enqueueReplaceState(h, h.state, null), cs(t, s, h, u), h.state = t.memoizedState), typeof h.componentDidMount == "function" && (t.flags |= 4194308);
  }
  function Vr(t, r) {
    try {
      var s = "", u = r;
      do
        s += we(u), u = u.return;
      while (u);
      var h = s;
    } catch (m) {
      h = `
Error generating stack: ` + m.message + `
` + m.stack;
    }
    return { value: t, source: r, stack: h, digest: null };
  }
  function iu(t, r, s) {
    return { value: t, source: null, stack: s ?? null, digest: r ?? null };
  }
  function su(t, r) {
    try {
      console.error(r.value);
    } catch (s) {
      setTimeout(function() {
        throw s;
      });
    }
  }
  var Kw = typeof WeakMap == "function" ? WeakMap : Map;
  function Jp(t, r, s) {
    s = fn(-1, s), s.tag = 3, s.payload = { element: null };
    var u = r.value;
    return s.callback = function() {
      Ts || (Ts = !0, xu = u), su(t, r);
    }, s;
  }
  function eh(t, r, s) {
    s = fn(-1, s), s.tag = 3;
    var u = t.type.getDerivedStateFromError;
    if (typeof u == "function") {
      var h = r.value;
      s.payload = function() {
        return u(h);
      }, s.callback = function() {
        su(t, r);
      };
    }
    var m = t.stateNode;
    return m !== null && typeof m.componentDidCatch == "function" && (s.callback = function() {
      su(t, r), typeof u != "function" && (Rn === null ? Rn = /* @__PURE__ */ new Set([this]) : Rn.add(this));
      var k = r.stack;
      this.componentDidCatch(r.value, { componentStack: k !== null ? k : "" });
    }), s;
  }
  function th(t, r, s) {
    var u = t.pingCache;
    if (u === null) {
      u = t.pingCache = new Kw();
      var h = /* @__PURE__ */ new Set();
      u.set(r, h);
    } else h = u.get(r), h === void 0 && (h = /* @__PURE__ */ new Set(), u.set(r, h));
    h.has(s) || (h.add(s), t = ax.bind(null, t, r, s), r.then(t, t));
  }
  function nh(t) {
    do {
      var r;
      if ((r = t.tag === 13) && (r = t.memoizedState, r = r !== null ? r.dehydrated !== null : !0), r) return t;
      t = t.return;
    } while (t !== null);
    return null;
  }
  function rh(t, r, s, u, h) {
    return (t.mode & 1) === 0 ? (t === r ? t.flags |= 65536 : (t.flags |= 128, s.flags |= 131072, s.flags &= -52805, s.tag === 1 && (s.alternate === null ? s.tag = 17 : (r = fn(-1, 1), r.tag = 2, Pn(s, r, 1))), s.lanes |= 1), t) : (t.flags |= 65536, t.lanes = h, t);
  }
  var Yw = D.ReactCurrentOwner, dt = !1;
  function ot(t, r, s, u) {
    r.child = t === null ? kp(r, null, s, u) : Ir(r, t.child, s, u);
  }
  function oh(t, r, s, u, h) {
    s = s.render;
    var m = r.ref;
    return Or(r, h), u = Zl(t, r, s, u, m, h), s = ql(), t !== null && !dt ? (r.updateQueue = t.updateQueue, r.flags &= -2053, t.lanes &= ~h, pn(t, r, h)) : (De && s && jl(r), r.flags |= 1, ot(t, r, u, h), r.child);
  }
  function ih(t, r, s, u, h) {
    if (t === null) {
      var m = s.type;
      return typeof m == "function" && !Eu(m) && m.defaultProps === void 0 && s.compare === null && s.defaultProps === void 0 ? (r.tag = 15, r.type = m, sh(t, r, m, u, h)) : (t = Ms(s.type, null, u, r, r.mode, h), t.ref = r.ref, t.return = r, r.child = t);
    }
    if (m = t.child, (t.lanes & h) === 0) {
      var k = m.memoizedProps;
      if (s = s.compare, s = s !== null ? s : Ro, s(k, u) && t.ref === r.ref) return pn(t, r, h);
    }
    return r.flags |= 1, t = In(m, u), t.ref = r.ref, t.return = r, r.child = t;
  }
  function sh(t, r, s, u, h) {
    if (t !== null) {
      var m = t.memoizedProps;
      if (Ro(m, u) && t.ref === r.ref) if (dt = !1, r.pendingProps = u = m, (t.lanes & h) !== 0) (t.flags & 131072) !== 0 && (dt = !0);
      else return r.lanes = t.lanes, pn(t, r, h);
    }
    return au(t, r, s, u, h);
  }
  function ah(t, r, s) {
    var u = r.pendingProps, h = u.children, m = t !== null ? t.memoizedState : null;
    if (u.mode === "hidden") if ((r.mode & 1) === 0) r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, Me(Br, _t), _t |= s;
    else {
      if ((s & 1073741824) === 0) return t = m !== null ? m.baseLanes | s : s, r.lanes = r.childLanes = 1073741824, r.memoizedState = { baseLanes: t, cachePool: null, transitions: null }, r.updateQueue = null, Me(Br, _t), _t |= t, null;
      r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, u = m !== null ? m.baseLanes : s, Me(Br, _t), _t |= u;
    }
    else m !== null ? (u = m.baseLanes | s, r.memoizedState = null) : u = s, Me(Br, _t), _t |= u;
    return ot(t, r, h, s), r.child;
  }
  function lh(t, r) {
    var s = r.ref;
    (t === null && s !== null || t !== null && t.ref !== s) && (r.flags |= 512, r.flags |= 2097152);
  }
  function au(t, r, s, u, h) {
    var m = ct(s) ? Zn : et.current;
    return m = Rr(r, m), Or(r, h), s = Zl(t, r, s, u, m, h), u = ql(), t !== null && !dt ? (r.updateQueue = t.updateQueue, r.flags &= -2053, t.lanes &= ~h, pn(t, r, h)) : (De && u && jl(r), r.flags |= 1, ot(t, r, s, h), r.child);
  }
  function uh(t, r, s, u, h) {
    if (ct(s)) {
      var m = !0;
      ts(r);
    } else m = !1;
    if (Or(r, h), r.stateNode === null) Ss(t, r), Zp(r, s, u), ou(r, s, u, h), u = !0;
    else if (t === null) {
      var k = r.stateNode, E = r.memoizedProps;
      k.props = E;
      var M = k.context, F = s.contextType;
      typeof F == "object" && F !== null ? F = At(F) : (F = ct(s) ? Zn : et.current, F = Rr(r, F));
      var B = s.getDerivedStateFromProps, W = typeof B == "function" || typeof k.getSnapshotBeforeUpdate == "function";
      W || typeof k.UNSAFE_componentWillReceiveProps != "function" && typeof k.componentWillReceiveProps != "function" || (E !== u || M !== F) && qp(r, k, u, F), En = !1;
      var z = r.memoizedState;
      k.state = z, cs(r, u, k, h), M = r.memoizedState, E !== u || z !== M || ut.current || En ? (typeof B == "function" && (ru(r, s, B, u), M = r.memoizedState), (E = En || Xp(r, s, E, u, z, M, F)) ? (W || typeof k.UNSAFE_componentWillMount != "function" && typeof k.componentWillMount != "function" || (typeof k.componentWillMount == "function" && k.componentWillMount(), typeof k.UNSAFE_componentWillMount == "function" && k.UNSAFE_componentWillMount()), typeof k.componentDidMount == "function" && (r.flags |= 4194308)) : (typeof k.componentDidMount == "function" && (r.flags |= 4194308), r.memoizedProps = u, r.memoizedState = M), k.props = u, k.state = M, k.context = F, u = E) : (typeof k.componentDidMount == "function" && (r.flags |= 4194308), u = !1);
    } else {
      k = r.stateNode, Ap(t, r), E = r.memoizedProps, F = r.type === r.elementType ? E : It(r.type, E), k.props = F, W = r.pendingProps, z = k.context, M = s.contextType, typeof M == "object" && M !== null ? M = At(M) : (M = ct(s) ? Zn : et.current, M = Rr(r, M));
      var ee = s.getDerivedStateFromProps;
      (B = typeof ee == "function" || typeof k.getSnapshotBeforeUpdate == "function") || typeof k.UNSAFE_componentWillReceiveProps != "function" && typeof k.componentWillReceiveProps != "function" || (E !== W || z !== M) && qp(r, k, u, M), En = !1, z = r.memoizedState, k.state = z, cs(r, u, k, h);
      var ne = r.memoizedState;
      E !== W || z !== ne || ut.current || En ? (typeof ee == "function" && (ru(r, s, ee, u), ne = r.memoizedState), (F = En || Xp(r, s, F, u, z, ne, M) || !1) ? (B || typeof k.UNSAFE_componentWillUpdate != "function" && typeof k.componentWillUpdate != "function" || (typeof k.componentWillUpdate == "function" && k.componentWillUpdate(u, ne, M), typeof k.UNSAFE_componentWillUpdate == "function" && k.UNSAFE_componentWillUpdate(u, ne, M)), typeof k.componentDidUpdate == "function" && (r.flags |= 4), typeof k.getSnapshotBeforeUpdate == "function" && (r.flags |= 1024)) : (typeof k.componentDidUpdate != "function" || E === t.memoizedProps && z === t.memoizedState || (r.flags |= 4), typeof k.getSnapshotBeforeUpdate != "function" || E === t.memoizedProps && z === t.memoizedState || (r.flags |= 1024), r.memoizedProps = u, r.memoizedState = ne), k.props = u, k.state = ne, k.context = M, u = F) : (typeof k.componentDidUpdate != "function" || E === t.memoizedProps && z === t.memoizedState || (r.flags |= 4), typeof k.getSnapshotBeforeUpdate != "function" || E === t.memoizedProps && z === t.memoizedState || (r.flags |= 1024), u = !1);
    }
    return lu(t, r, s, u, m, h);
  }
  function lu(t, r, s, u, h, m) {
    lh(t, r);
    var k = (r.flags & 128) !== 0;
    if (!u && !k) return h && hp(r, s, !1), pn(t, r, m);
    u = r.stateNode, Yw.current = r;
    var E = k && typeof s.getDerivedStateFromError != "function" ? null : u.render();
    return r.flags |= 1, t !== null && k ? (r.child = Ir(r, t.child, null, m), r.child = Ir(r, null, E, m)) : ot(t, r, E, m), r.memoizedState = u.state, h && hp(r, s, !0), r.child;
  }
  function ch(t) {
    var r = t.stateNode;
    r.pendingContext ? fp(t, r.pendingContext, r.pendingContext !== r.context) : r.context && fp(t, r.context, !1), Wl(t, r.containerInfo);
  }
  function dh(t, r, s, u, h) {
    return jr(), Ll(h), r.flags |= 256, ot(t, r, s, u), r.child;
  }
  var uu = { dehydrated: null, treeContext: null, retryLane: 0 };
  function cu(t) {
    return { baseLanes: t, cachePool: null, transitions: null };
  }
  function fh(t, r, s) {
    var u = r.pendingProps, h = je.current, m = !1, k = (r.flags & 128) !== 0, E;
    if ((E = k) || (E = t !== null && t.memoizedState === null ? !1 : (h & 2) !== 0), E ? (m = !0, r.flags &= -129) : (t === null || t.memoizedState !== null) && (h |= 1), Me(je, h & 1), t === null)
      return Ol(r), t = r.memoizedState, t !== null && (t = t.dehydrated, t !== null) ? ((r.mode & 1) === 0 ? r.lanes = 1 : t.data === "$!" ? r.lanes = 8 : r.lanes = 1073741824, null) : (k = u.children, t = u.fallback, m ? (u = r.mode, m = r.child, k = { mode: "hidden", children: k }, (u & 1) === 0 && m !== null ? (m.childLanes = 0, m.pendingProps = k) : m = Rs(k, u, 0, null), t = ar(t, u, s, null), m.return = r, t.return = r, m.sibling = t, r.child = m, r.child.memoizedState = cu(s), r.memoizedState = uu, t) : du(r, k));
    if (h = t.memoizedState, h !== null && (E = h.dehydrated, E !== null)) return Qw(t, r, k, u, E, h, s);
    if (m) {
      m = u.fallback, k = r.mode, h = t.child, E = h.sibling;
      var M = { mode: "hidden", children: u.children };
      return (k & 1) === 0 && r.child !== h ? (u = r.child, u.childLanes = 0, u.pendingProps = M, r.deletions = null) : (u = In(h, M), u.subtreeFlags = h.subtreeFlags & 14680064), E !== null ? m = In(E, m) : (m = ar(m, k, s, null), m.flags |= 2), m.return = r, u.return = r, u.sibling = m, r.child = u, u = m, m = r.child, k = t.child.memoizedState, k = k === null ? cu(s) : { baseLanes: k.baseLanes | s, cachePool: null, transitions: k.transitions }, m.memoizedState = k, m.childLanes = t.childLanes & ~s, r.memoizedState = uu, u;
    }
    return m = t.child, t = m.sibling, u = In(m, { mode: "visible", children: u.children }), (r.mode & 1) === 0 && (u.lanes = s), u.return = r, u.sibling = null, t !== null && (s = r.deletions, s === null ? (r.deletions = [t], r.flags |= 16) : s.push(t)), r.child = u, r.memoizedState = null, u;
  }
  function du(t, r) {
    return r = Rs({ mode: "visible", children: r }, t.mode, 0, null), r.return = t, t.child = r;
  }
  function vs(t, r, s, u) {
    return u !== null && Ll(u), Ir(r, t.child, null, s), t = du(r, r.pendingProps.children), t.flags |= 2, r.memoizedState = null, t;
  }
  function Qw(t, r, s, u, h, m, k) {
    if (s)
      return r.flags & 256 ? (r.flags &= -257, u = iu(Error(o(422))), vs(t, r, k, u)) : r.memoizedState !== null ? (r.child = t.child, r.flags |= 128, null) : (m = u.fallback, h = r.mode, u = Rs({ mode: "visible", children: u.children }, h, 0, null), m = ar(m, h, k, null), m.flags |= 2, u.return = r, m.return = r, u.sibling = m, r.child = u, (r.mode & 1) !== 0 && Ir(r, t.child, null, k), r.child.memoizedState = cu(k), r.memoizedState = uu, m);
    if ((r.mode & 1) === 0) return vs(t, r, k, null);
    if (h.data === "$!") {
      if (u = h.nextSibling && h.nextSibling.dataset, u) var E = u.dgst;
      return u = E, m = Error(o(419)), u = iu(m, u, void 0), vs(t, r, k, u);
    }
    if (E = (k & t.childLanes) !== 0, dt || E) {
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
        h = (h & (u.suspendedLanes | k)) !== 0 ? 0 : h, h !== 0 && h !== m.retryLane && (m.retryLane = h, dn(t, h), Lt(u, t, h, -1));
      }
      return bu(), u = iu(Error(o(421))), vs(t, r, k, u);
    }
    return h.data === "$?" ? (r.flags |= 128, r.child = t.child, r = lx.bind(null, t), h._reactRetry = r, null) : (t = m.treeContext, xt = Tn(h.nextSibling), wt = r, De = !0, jt = null, t !== null && (kt[Tt++] = un, kt[Tt++] = cn, kt[Tt++] = qn, un = t.id, cn = t.overflow, qn = r), r = du(r, u.children), r.flags |= 4096, r);
  }
  function ph(t, r, s) {
    t.lanes |= r;
    var u = t.alternate;
    u !== null && (u.lanes |= r), Ul(t.return, r, s);
  }
  function fu(t, r, s, u, h) {
    var m = t.memoizedState;
    m === null ? t.memoizedState = { isBackwards: r, rendering: null, renderingStartTime: 0, last: u, tail: s, tailMode: h } : (m.isBackwards = r, m.rendering = null, m.renderingStartTime = 0, m.last = u, m.tail = s, m.tailMode = h);
  }
  function hh(t, r, s) {
    var u = r.pendingProps, h = u.revealOrder, m = u.tail;
    if (ot(t, r, u.children, s), u = je.current, (u & 2) !== 0) u = u & 1 | 2, r.flags |= 128;
    else {
      if (t !== null && (t.flags & 128) !== 0) e: for (t = r.child; t !== null; ) {
        if (t.tag === 13) t.memoizedState !== null && ph(t, s, r);
        else if (t.tag === 19) ph(t, s, r);
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
    if (Me(je, u), (r.mode & 1) === 0) r.memoizedState = null;
    else switch (h) {
      case "forwards":
        for (s = r.child, h = null; s !== null; ) t = s.alternate, t !== null && ds(t) === null && (h = s), s = s.sibling;
        s = h, s === null ? (h = r.child, r.child = null) : (h = s.sibling, s.sibling = null), fu(r, !1, h, s, m);
        break;
      case "backwards":
        for (s = null, h = r.child, r.child = null; h !== null; ) {
          if (t = h.alternate, t !== null && ds(t) === null) {
            r.child = h;
            break;
          }
          t = h.sibling, h.sibling = s, s = h, h = t;
        }
        fu(r, !0, s, null, m);
        break;
      case "together":
        fu(r, !1, null, null, void 0);
        break;
      default:
        r.memoizedState = null;
    }
    return r.child;
  }
  function Ss(t, r) {
    (r.mode & 1) === 0 && t !== null && (t.alternate = null, r.alternate = null, r.flags |= 2);
  }
  function pn(t, r, s) {
    if (t !== null && (r.dependencies = t.dependencies), rr |= r.lanes, (s & r.childLanes) === 0) return null;
    if (t !== null && r.child !== t.child) throw Error(o(153));
    if (r.child !== null) {
      for (t = r.child, s = In(t, t.pendingProps), r.child = s, s.return = r; t.sibling !== null; ) t = t.sibling, s = s.sibling = In(t, t.pendingProps), s.return = r;
      s.sibling = null;
    }
    return r.child;
  }
  function Xw(t, r, s) {
    switch (r.tag) {
      case 3:
        ch(r), jr();
        break;
      case 5:
        Ep(r);
        break;
      case 1:
        ct(r.type) && ts(r);
        break;
      case 4:
        Wl(r, r.stateNode.containerInfo);
        break;
      case 10:
        var u = r.type._context, h = r.memoizedProps.value;
        Me(as, u._currentValue), u._currentValue = h;
        break;
      case 13:
        if (u = r.memoizedState, u !== null)
          return u.dehydrated !== null ? (Me(je, je.current & 1), r.flags |= 128, null) : (s & r.child.childLanes) !== 0 ? fh(t, r, s) : (Me(je, je.current & 1), t = pn(t, r, s), t !== null ? t.sibling : null);
        Me(je, je.current & 1);
        break;
      case 19:
        if (u = (s & r.childLanes) !== 0, (t.flags & 128) !== 0) {
          if (u) return hh(t, r, s);
          r.flags |= 128;
        }
        if (h = r.memoizedState, h !== null && (h.rendering = null, h.tail = null, h.lastEffect = null), Me(je, je.current), u) break;
        return null;
      case 22:
      case 23:
        return r.lanes = 0, ah(t, r, s);
    }
    return pn(t, r, s);
  }
  var mh, pu, yh, gh;
  mh = function(t, r) {
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
  }, pu = function() {
  }, yh = function(t, r, s, u) {
    var h = t.memoizedProps;
    if (h !== u) {
      t = r.stateNode, tr(Kt.current);
      var m = null;
      switch (s) {
        case "input":
          h = Ua(t, h), u = Ua(t, u), m = [];
          break;
        case "select":
          h = K({}, h, { value: void 0 }), u = K({}, u, { value: void 0 }), m = [];
          break;
        case "textarea":
          h = Wa(t, h), u = Wa(t, u), m = [];
          break;
        default:
          typeof h.onClick != "function" && typeof u.onClick == "function" && (t.onclick = qi);
      }
      Ka(s, u);
      var k;
      s = null;
      for (F in h) if (!u.hasOwnProperty(F) && h.hasOwnProperty(F) && h[F] != null) if (F === "style") {
        var E = h[F];
        for (k in E) E.hasOwnProperty(k) && (s || (s = {}), s[k] = "");
      } else F !== "dangerouslySetInnerHTML" && F !== "children" && F !== "suppressContentEditableWarning" && F !== "suppressHydrationWarning" && F !== "autoFocus" && (a.hasOwnProperty(F) ? m || (m = []) : (m = m || []).push(F, null));
      for (F in u) {
        var M = u[F];
        if (E = h != null ? h[F] : void 0, u.hasOwnProperty(F) && M !== E && (M != null || E != null)) if (F === "style") if (E) {
          for (k in E) !E.hasOwnProperty(k) || M && M.hasOwnProperty(k) || (s || (s = {}), s[k] = "");
          for (k in M) M.hasOwnProperty(k) && E[k] !== M[k] && (s || (s = {}), s[k] = M[k]);
        } else s || (m || (m = []), m.push(
          F,
          s
        )), s = M;
        else F === "dangerouslySetInnerHTML" ? (M = M ? M.__html : void 0, E = E ? E.__html : void 0, M != null && E !== M && (m = m || []).push(F, M)) : F === "children" ? typeof M != "string" && typeof M != "number" || (m = m || []).push(F, "" + M) : F !== "suppressContentEditableWarning" && F !== "suppressHydrationWarning" && (a.hasOwnProperty(F) ? (M != null && F === "onScroll" && Re("scroll", t), m || E === M || (m = [])) : (m = m || []).push(F, M));
      }
      s && (m = m || []).push("style", s);
      var F = m;
      (r.updateQueue = F) && (r.flags |= 4);
    }
  }, gh = function(t, r, s, u) {
    s !== u && (r.flags |= 4);
  };
  function Go(t, r) {
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
  function nt(t) {
    var r = t.alternate !== null && t.alternate.child === t.child, s = 0, u = 0;
    if (r) for (var h = t.child; h !== null; ) s |= h.lanes | h.childLanes, u |= h.subtreeFlags & 14680064, u |= h.flags & 14680064, h.return = t, h = h.sibling;
    else for (h = t.child; h !== null; ) s |= h.lanes | h.childLanes, u |= h.subtreeFlags, u |= h.flags, h.return = t, h = h.sibling;
    return t.subtreeFlags |= u, t.childLanes = s, r;
  }
  function Zw(t, r, s) {
    var u = r.pendingProps;
    switch (Il(r), r.tag) {
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
        return ct(r.type) && es(), nt(r), null;
      case 3:
        return u = r.stateNode, Lr(), Ne(ut), Ne(et), Yl(), u.pendingContext && (u.context = u.pendingContext, u.pendingContext = null), (t === null || t.child === null) && (is(r) ? r.flags |= 4 : t === null || t.memoizedState.isDehydrated && (r.flags & 256) === 0 || (r.flags |= 1024, jt !== null && (Tu(jt), jt = null))), pu(t, r), nt(r), null;
      case 5:
        Gl(r);
        var h = tr(Bo.current);
        if (s = r.type, t !== null && r.stateNode != null) yh(t, r, s, u, h), t.ref !== r.ref && (r.flags |= 512, r.flags |= 2097152);
        else {
          if (!u) {
            if (r.stateNode === null) throw Error(o(166));
            return nt(r), null;
          }
          if (t = tr(Kt.current), is(r)) {
            u = r.stateNode, s = r.type;
            var m = r.memoizedProps;
            switch (u[Gt] = r, u[Fo] = m, t = (r.mode & 1) !== 0, s) {
              case "dialog":
                Re("cancel", u), Re("close", u);
                break;
              case "iframe":
              case "object":
              case "embed":
                Re("load", u);
                break;
              case "video":
              case "audio":
                for (h = 0; h < Do.length; h++) Re(Do[h], u);
                break;
              case "source":
                Re("error", u);
                break;
              case "img":
              case "image":
              case "link":
                Re(
                  "error",
                  u
                ), Re("load", u);
                break;
              case "details":
                Re("toggle", u);
                break;
              case "input":
                Xd(u, m), Re("invalid", u);
                break;
              case "select":
                u._wrapperState = { wasMultiple: !!m.multiple }, Re("invalid", u);
                break;
              case "textarea":
                Jd(u, m), Re("invalid", u);
            }
            Ka(s, m), h = null;
            for (var k in m) if (m.hasOwnProperty(k)) {
              var E = m[k];
              k === "children" ? typeof E == "string" ? u.textContent !== E && (m.suppressHydrationWarning !== !0 && Zi(u.textContent, E, t), h = ["children", E]) : typeof E == "number" && u.textContent !== "" + E && (m.suppressHydrationWarning !== !0 && Zi(
                u.textContent,
                E,
                t
              ), h = ["children", "" + E]) : a.hasOwnProperty(k) && E != null && k === "onScroll" && Re("scroll", u);
            }
            switch (s) {
              case "input":
                Yn(u), qd(u, m, !0);
                break;
              case "textarea":
                Yn(u), tf(u);
                break;
              case "select":
              case "option":
                break;
              default:
                typeof m.onClick == "function" && (u.onclick = qi);
            }
            u = h, r.updateQueue = u, u !== null && (r.flags |= 4);
          } else {
            k = h.nodeType === 9 ? h : h.ownerDocument, t === "http://www.w3.org/1999/xhtml" && (t = nf(s)), t === "http://www.w3.org/1999/xhtml" ? s === "script" ? (t = k.createElement("div"), t.innerHTML = "<script><\/script>", t = t.removeChild(t.firstChild)) : typeof u.is == "string" ? t = k.createElement(s, { is: u.is }) : (t = k.createElement(s), s === "select" && (k = t, u.multiple ? k.multiple = !0 : u.size && (k.size = u.size))) : t = k.createElementNS(t, s), t[Gt] = r, t[Fo] = u, mh(t, r, !1, !1), r.stateNode = t;
            e: {
              switch (k = Ya(s, u), s) {
                case "dialog":
                  Re("cancel", t), Re("close", t), h = u;
                  break;
                case "iframe":
                case "object":
                case "embed":
                  Re("load", t), h = u;
                  break;
                case "video":
                case "audio":
                  for (h = 0; h < Do.length; h++) Re(Do[h], t);
                  h = u;
                  break;
                case "source":
                  Re("error", t), h = u;
                  break;
                case "img":
                case "image":
                case "link":
                  Re(
                    "error",
                    t
                  ), Re("load", t), h = u;
                  break;
                case "details":
                  Re("toggle", t), h = u;
                  break;
                case "input":
                  Xd(t, u), h = Ua(t, u), Re("invalid", t);
                  break;
                case "option":
                  h = u;
                  break;
                case "select":
                  t._wrapperState = { wasMultiple: !!u.multiple }, h = K({}, u, { value: void 0 }), Re("invalid", t);
                  break;
                case "textarea":
                  Jd(t, u), h = Wa(t, u), Re("invalid", t);
                  break;
                default:
                  h = u;
              }
              Ka(s, h), E = h;
              for (m in E) if (E.hasOwnProperty(m)) {
                var M = E[m];
                m === "style" ? sf(t, M) : m === "dangerouslySetInnerHTML" ? (M = M ? M.__html : void 0, M != null && rf(t, M)) : m === "children" ? typeof M == "string" ? (s !== "textarea" || M !== "") && ho(t, M) : typeof M == "number" && ho(t, "" + M) : m !== "suppressContentEditableWarning" && m !== "suppressHydrationWarning" && m !== "autoFocus" && (a.hasOwnProperty(m) ? M != null && m === "onScroll" && Re("scroll", t) : M != null && P(t, m, M, k));
              }
              switch (s) {
                case "input":
                  Yn(t), qd(t, u, !1);
                  break;
                case "textarea":
                  Yn(t), tf(t);
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
                  typeof h.onClick == "function" && (t.onclick = qi);
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
        if (t && r.stateNode != null) gh(t, r, t.memoizedProps, u);
        else {
          if (typeof u != "string" && r.stateNode === null) throw Error(o(166));
          if (s = tr(Bo.current), tr(Kt.current), is(r)) {
            if (u = r.stateNode, s = r.memoizedProps, u[Gt] = r, (m = u.nodeValue !== s) && (t = wt, t !== null)) switch (t.tag) {
              case 3:
                Zi(u.nodeValue, s, (t.mode & 1) !== 0);
                break;
              case 5:
                t.memoizedProps.suppressHydrationWarning !== !0 && Zi(u.nodeValue, s, (t.mode & 1) !== 0);
            }
            m && (r.flags |= 4);
          } else u = (s.nodeType === 9 ? s : s.ownerDocument).createTextNode(u), u[Gt] = r, r.stateNode = u;
        }
        return nt(r), null;
      case 13:
        if (Ne(je), u = r.memoizedState, t === null || t.memoizedState !== null && t.memoizedState.dehydrated !== null) {
          if (De && xt !== null && (r.mode & 1) !== 0 && (r.flags & 128) === 0) wp(), jr(), r.flags |= 98560, m = !1;
          else if (m = is(r), u !== null && u.dehydrated !== null) {
            if (t === null) {
              if (!m) throw Error(o(318));
              if (m = r.memoizedState, m = m !== null ? m.dehydrated : null, !m) throw Error(o(317));
              m[Gt] = r;
            } else jr(), (r.flags & 128) === 0 && (r.memoizedState = null), r.flags |= 4;
            nt(r), m = !1;
          } else jt !== null && (Tu(jt), jt = null), m = !0;
          if (!m) return r.flags & 65536 ? r : null;
        }
        return (r.flags & 128) !== 0 ? (r.lanes = s, r) : (u = u !== null, u !== (t !== null && t.memoizedState !== null) && u && (r.child.flags |= 8192, (r.mode & 1) !== 0 && (t === null || (je.current & 1) !== 0 ? $e === 0 && ($e = 3) : bu())), r.updateQueue !== null && (r.flags |= 4), nt(r), null);
      case 4:
        return Lr(), pu(t, r), t === null && jo(r.stateNode.containerInfo), nt(r), null;
      case 10:
        return Bl(r.type._context), nt(r), null;
      case 17:
        return ct(r.type) && es(), nt(r), null;
      case 19:
        if (Ne(je), m = r.memoizedState, m === null) return nt(r), null;
        if (u = (r.flags & 128) !== 0, k = m.rendering, k === null) if (u) Go(m, !1);
        else {
          if ($e !== 0 || t !== null && (t.flags & 128) !== 0) for (t = r.child; t !== null; ) {
            if (k = ds(t), k !== null) {
              for (r.flags |= 128, Go(m, !1), u = k.updateQueue, u !== null && (r.updateQueue = u, r.flags |= 4), r.subtreeFlags = 0, u = s, s = r.child; s !== null; ) m = s, t = u, m.flags &= 14680066, k = m.alternate, k === null ? (m.childLanes = 0, m.lanes = t, m.child = null, m.subtreeFlags = 0, m.memoizedProps = null, m.memoizedState = null, m.updateQueue = null, m.dependencies = null, m.stateNode = null) : (m.childLanes = k.childLanes, m.lanes = k.lanes, m.child = k.child, m.subtreeFlags = 0, m.deletions = null, m.memoizedProps = k.memoizedProps, m.memoizedState = k.memoizedState, m.updateQueue = k.updateQueue, m.type = k.type, t = k.dependencies, m.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }), s = s.sibling;
              return Me(je, je.current & 1 | 2), r.child;
            }
            t = t.sibling;
          }
          m.tail !== null && Le() > Ur && (r.flags |= 128, u = !0, Go(m, !1), r.lanes = 4194304);
        }
        else {
          if (!u) if (t = ds(k), t !== null) {
            if (r.flags |= 128, u = !0, s = t.updateQueue, s !== null && (r.updateQueue = s, r.flags |= 4), Go(m, !0), m.tail === null && m.tailMode === "hidden" && !k.alternate && !De) return nt(r), null;
          } else 2 * Le() - m.renderingStartTime > Ur && s !== 1073741824 && (r.flags |= 128, u = !0, Go(m, !1), r.lanes = 4194304);
          m.isBackwards ? (k.sibling = r.child, r.child = k) : (s = m.last, s !== null ? s.sibling = k : r.child = k, m.last = k);
        }
        return m.tail !== null ? (r = m.tail, m.rendering = r, m.tail = r.sibling, m.renderingStartTime = Le(), r.sibling = null, s = je.current, Me(je, u ? s & 1 | 2 : s & 1), r) : (nt(r), null);
      case 22:
      case 23:
        return Cu(), u = r.memoizedState !== null, t !== null && t.memoizedState !== null !== u && (r.flags |= 8192), u && (r.mode & 1) !== 0 ? (_t & 1073741824) !== 0 && (nt(r), r.subtreeFlags & 6 && (r.flags |= 8192)) : nt(r), null;
      case 24:
        return null;
      case 25:
        return null;
    }
    throw Error(o(156, r.tag));
  }
  function qw(t, r) {
    switch (Il(r), r.tag) {
      case 1:
        return ct(r.type) && es(), t = r.flags, t & 65536 ? (r.flags = t & -65537 | 128, r) : null;
      case 3:
        return Lr(), Ne(ut), Ne(et), Yl(), t = r.flags, (t & 65536) !== 0 && (t & 128) === 0 ? (r.flags = t & -65537 | 128, r) : null;
      case 5:
        return Gl(r), null;
      case 13:
        if (Ne(je), t = r.memoizedState, t !== null && t.dehydrated !== null) {
          if (r.alternate === null) throw Error(o(340));
          jr();
        }
        return t = r.flags, t & 65536 ? (r.flags = t & -65537 | 128, r) : null;
      case 19:
        return Ne(je), null;
      case 4:
        return Lr(), null;
      case 10:
        return Bl(r.type._context), null;
      case 22:
      case 23:
        return Cu(), null;
      case 24:
        return null;
      default:
        return null;
    }
  }
  var ws = !1, rt = !1, Jw = typeof WeakSet == "function" ? WeakSet : Set, te = null;
  function zr(t, r) {
    var s = t.ref;
    if (s !== null) if (typeof s == "function") try {
      s(null);
    } catch (u) {
      Oe(t, r, u);
    }
    else s.current = null;
  }
  function hu(t, r, s) {
    try {
      s();
    } catch (u) {
      Oe(t, r, u);
    }
  }
  var vh = !1;
  function ex(t, r) {
    if (Cl = zi, t = Xf(), vl(t)) {
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
          var k = 0, E = -1, M = -1, F = 0, B = 0, W = t, z = null;
          t: for (; ; ) {
            for (var ee; W !== s || h !== 0 && W.nodeType !== 3 || (E = k + h), W !== m || u !== 0 && W.nodeType !== 3 || (M = k + u), W.nodeType === 3 && (k += W.nodeValue.length), (ee = W.firstChild) !== null; )
              z = W, W = ee;
            for (; ; ) {
              if (W === t) break t;
              if (z === s && ++F === h && (E = k), z === m && ++B === u && (M = k), (ee = W.nextSibling) !== null) break;
              W = z, z = W.parentNode;
            }
            W = ee;
          }
          s = E === -1 || M === -1 ? null : { start: E, end: M };
        } else s = null;
      }
      s = s || { start: 0, end: 0 };
    } else s = null;
    for (bl = { focusedElem: t, selectionRange: s }, zi = !1, te = r; te !== null; ) if (r = te, t = r.child, (r.subtreeFlags & 1028) !== 0 && t !== null) t.return = r, te = t;
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
              var oe = ne.memoizedProps, Ve = ne.memoizedState, j = r.stateNode, N = j.getSnapshotBeforeUpdate(r.elementType === r.type ? oe : It(r.type, oe), Ve);
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
    return ne = vh, vh = !1, ne;
  }
  function Ko(t, r, s) {
    var u = r.updateQueue;
    if (u = u !== null ? u.lastEffect : null, u !== null) {
      var h = u = u.next;
      do {
        if ((h.tag & t) === t) {
          var m = h.destroy;
          h.destroy = void 0, m !== void 0 && hu(r, s, m);
        }
        h = h.next;
      } while (h !== u);
    }
  }
  function xs(t, r) {
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
  function mu(t) {
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
  function Sh(t) {
    var r = t.alternate;
    r !== null && (t.alternate = null, Sh(r)), t.child = null, t.deletions = null, t.sibling = null, t.tag === 5 && (r = t.stateNode, r !== null && (delete r[Gt], delete r[Fo], delete r[Rl], delete r[Fw], delete r[Ow])), t.stateNode = null, t.return = null, t.dependencies = null, t.memoizedProps = null, t.memoizedState = null, t.pendingProps = null, t.stateNode = null, t.updateQueue = null;
  }
  function wh(t) {
    return t.tag === 5 || t.tag === 3 || t.tag === 4;
  }
  function xh(t) {
    e: for (; ; ) {
      for (; t.sibling === null; ) {
        if (t.return === null || wh(t.return)) return null;
        t = t.return;
      }
      for (t.sibling.return = t.return, t = t.sibling; t.tag !== 5 && t.tag !== 6 && t.tag !== 18; ) {
        if (t.flags & 2 || t.child === null || t.tag === 4) continue e;
        t.child.return = t, t = t.child;
      }
      if (!(t.flags & 2)) return t.stateNode;
    }
  }
  function yu(t, r, s) {
    var u = t.tag;
    if (u === 5 || u === 6) t = t.stateNode, r ? s.nodeType === 8 ? s.parentNode.insertBefore(t, r) : s.insertBefore(t, r) : (s.nodeType === 8 ? (r = s.parentNode, r.insertBefore(t, s)) : (r = s, r.appendChild(t)), s = s._reactRootContainer, s != null || r.onclick !== null || (r.onclick = qi));
    else if (u !== 4 && (t = t.child, t !== null)) for (yu(t, r, s), t = t.sibling; t !== null; ) yu(t, r, s), t = t.sibling;
  }
  function gu(t, r, s) {
    var u = t.tag;
    if (u === 5 || u === 6) t = t.stateNode, r ? s.insertBefore(t, r) : s.appendChild(t);
    else if (u !== 4 && (t = t.child, t !== null)) for (gu(t, r, s), t = t.sibling; t !== null; ) gu(t, r, s), t = t.sibling;
  }
  var Qe = null, Ft = !1;
  function Mn(t, r, s) {
    for (s = s.child; s !== null; ) _h(t, r, s), s = s.sibling;
  }
  function _h(t, r, s) {
    if (Wt && typeof Wt.onCommitFiberUnmount == "function") try {
      Wt.onCommitFiberUnmount(ji, s);
    } catch {
    }
    switch (s.tag) {
      case 5:
        rt || zr(s, r);
      case 6:
        var u = Qe, h = Ft;
        Qe = null, Mn(t, r, s), Qe = u, Ft = h, Qe !== null && (Ft ? (t = Qe, s = s.stateNode, t.nodeType === 8 ? t.parentNode.removeChild(s) : t.removeChild(s)) : Qe.removeChild(s.stateNode));
        break;
      case 18:
        Qe !== null && (Ft ? (t = Qe, s = s.stateNode, t.nodeType === 8 ? Ml(t.parentNode, s) : t.nodeType === 1 && Ml(t, s), Ao(t)) : Ml(Qe, s.stateNode));
        break;
      case 4:
        u = Qe, h = Ft, Qe = s.stateNode.containerInfo, Ft = !0, Mn(t, r, s), Qe = u, Ft = h;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        if (!rt && (u = s.updateQueue, u !== null && (u = u.lastEffect, u !== null))) {
          h = u = u.next;
          do {
            var m = h, k = m.destroy;
            m = m.tag, k !== void 0 && ((m & 2) !== 0 || (m & 4) !== 0) && hu(s, r, k), h = h.next;
          } while (h !== u);
        }
        Mn(t, r, s);
        break;
      case 1:
        if (!rt && (zr(s, r), u = s.stateNode, typeof u.componentWillUnmount == "function")) try {
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
        s.mode & 1 ? (rt = (u = rt) || s.memoizedState !== null, Mn(t, r, s), rt = u) : Mn(t, r, s);
        break;
      default:
        Mn(t, r, s);
    }
  }
  function kh(t) {
    var r = t.updateQueue;
    if (r !== null) {
      t.updateQueue = null;
      var s = t.stateNode;
      s === null && (s = t.stateNode = new Jw()), r.forEach(function(u) {
        var h = ux.bind(null, t, u);
        s.has(u) || (s.add(u), u.then(h, h));
      });
    }
  }
  function Ot(t, r) {
    var s = r.deletions;
    if (s !== null) for (var u = 0; u < s.length; u++) {
      var h = s[u];
      try {
        var m = t, k = r, E = k;
        e: for (; E !== null; ) {
          switch (E.tag) {
            case 5:
              Qe = E.stateNode, Ft = !1;
              break e;
            case 3:
              Qe = E.stateNode.containerInfo, Ft = !0;
              break e;
            case 4:
              Qe = E.stateNode.containerInfo, Ft = !0;
              break e;
          }
          E = E.return;
        }
        if (Qe === null) throw Error(o(160));
        _h(m, k, h), Qe = null, Ft = !1;
        var M = h.alternate;
        M !== null && (M.return = null), h.return = null;
      } catch (F) {
        Oe(h, r, F);
      }
    }
    if (r.subtreeFlags & 12854) for (r = r.child; r !== null; ) Th(r, t), r = r.sibling;
  }
  function Th(t, r) {
    var s = t.alternate, u = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (Ot(r, t), Qt(t), u & 4) {
          try {
            Ko(3, t, t.return), xs(3, t);
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
        Ot(r, t), Qt(t), u & 512 && s !== null && zr(s, s.return);
        break;
      case 5:
        if (Ot(r, t), Qt(t), u & 512 && s !== null && zr(s, s.return), t.flags & 32) {
          var h = t.stateNode;
          try {
            ho(h, "");
          } catch (oe) {
            Oe(t, t.return, oe);
          }
        }
        if (u & 4 && (h = t.stateNode, h != null)) {
          var m = t.memoizedProps, k = s !== null ? s.memoizedProps : m, E = t.type, M = t.updateQueue;
          if (t.updateQueue = null, M !== null) try {
            E === "input" && m.type === "radio" && m.name != null && Zd(h, m), Ya(E, k);
            var F = Ya(E, m);
            for (k = 0; k < M.length; k += 2) {
              var B = M[k], W = M[k + 1];
              B === "style" ? sf(h, W) : B === "dangerouslySetInnerHTML" ? rf(h, W) : B === "children" ? ho(h, W) : P(h, B, W, F);
            }
            switch (E) {
              case "input":
                $a(h, m);
                break;
              case "textarea":
                ef(h, m);
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
        if (Ot(r, t), Qt(t), u & 4) {
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
        if (Ot(r, t), Qt(t), u & 4 && s !== null && s.memoizedState.isDehydrated) try {
          Ao(r.containerInfo);
        } catch (oe) {
          Oe(t, t.return, oe);
        }
        break;
      case 4:
        Ot(r, t), Qt(t);
        break;
      case 13:
        Ot(r, t), Qt(t), h = t.child, h.flags & 8192 && (m = h.memoizedState !== null, h.stateNode.isHidden = m, !m || h.alternate !== null && h.alternate.memoizedState !== null || (wu = Le())), u & 4 && kh(t);
        break;
      case 22:
        if (B = s !== null && s.memoizedState !== null, t.mode & 1 ? (rt = (F = rt) || B, Ot(r, t), rt = F) : Ot(r, t), Qt(t), u & 8192) {
          if (F = t.memoizedState !== null, (t.stateNode.isHidden = F) && !B && (t.mode & 1) !== 0) for (te = t, B = t.child; B !== null; ) {
            for (W = te = B; te !== null; ) {
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
                    bh(W);
                    continue;
                  }
              }
              ee !== null ? (ee.return = z, te = ee) : bh(W);
            }
            B = B.sibling;
          }
          e: for (B = null, W = t; ; ) {
            if (W.tag === 5) {
              if (B === null) {
                B = W;
                try {
                  h = W.stateNode, F ? (m = h.style, typeof m.setProperty == "function" ? m.setProperty("display", "none", "important") : m.display = "none") : (E = W.stateNode, M = W.memoizedProps.style, k = M != null && M.hasOwnProperty("display") ? M.display : null, E.style.display = of("display", k));
                } catch (oe) {
                  Oe(t, t.return, oe);
                }
              }
            } else if (W.tag === 6) {
              if (B === null) try {
                W.stateNode.nodeValue = F ? "" : W.memoizedProps;
              } catch (oe) {
                Oe(t, t.return, oe);
              }
            } else if ((W.tag !== 22 && W.tag !== 23 || W.memoizedState === null || W === t) && W.child !== null) {
              W.child.return = W, W = W.child;
              continue;
            }
            if (W === t) break e;
            for (; W.sibling === null; ) {
              if (W.return === null || W.return === t) break e;
              B === W && (B = null), W = W.return;
            }
            B === W && (B = null), W.sibling.return = W.return, W = W.sibling;
          }
        }
        break;
      case 19:
        Ot(r, t), Qt(t), u & 4 && kh(t);
        break;
      case 21:
        break;
      default:
        Ot(
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
            if (wh(s)) {
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
            var m = xh(t);
            gu(t, m, h);
            break;
          case 3:
          case 4:
            var k = u.stateNode.containerInfo, E = xh(t);
            yu(t, E, k);
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
  function tx(t, r, s) {
    te = t, Ah(t);
  }
  function Ah(t, r, s) {
    for (var u = (t.mode & 1) !== 0; te !== null; ) {
      var h = te, m = h.child;
      if (h.tag === 22 && u) {
        var k = h.memoizedState !== null || ws;
        if (!k) {
          var E = h.alternate, M = E !== null && E.memoizedState !== null || rt;
          E = ws;
          var F = rt;
          if (ws = k, (rt = M) && !F) for (te = h; te !== null; ) k = te, M = k.child, k.tag === 22 && k.memoizedState !== null ? Eh(h) : M !== null ? (M.return = k, te = M) : Eh(h);
          for (; m !== null; ) te = m, Ah(m), m = m.sibling;
          te = h, ws = E, rt = F;
        }
        Ch(t);
      } else (h.subtreeFlags & 8772) !== 0 && m !== null ? (m.return = h, te = m) : Ch(t);
    }
  }
  function Ch(t) {
    for (; te !== null; ) {
      var r = te;
      if ((r.flags & 8772) !== 0) {
        var s = r.alternate;
        try {
          if ((r.flags & 8772) !== 0) switch (r.tag) {
            case 0:
            case 11:
            case 15:
              rt || xs(5, r);
              break;
            case 1:
              var u = r.stateNode;
              if (r.flags & 4 && !rt) if (s === null) u.componentDidMount();
              else {
                var h = r.elementType === r.type ? s.memoizedProps : It(r.type, s.memoizedProps);
                u.componentDidUpdate(h, s.memoizedState, u.__reactInternalSnapshotBeforeUpdate);
              }
              var m = r.updateQueue;
              m !== null && bp(r, m, u);
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
                bp(r, k, s);
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
                    var W = B.dehydrated;
                    W !== null && Ao(W);
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
          rt || r.flags & 512 && mu(r);
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
  function bh(t) {
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
  function Eh(t) {
    for (; te !== null; ) {
      var r = te;
      try {
        switch (r.tag) {
          case 0:
          case 11:
          case 15:
            var s = r.return;
            try {
              xs(4, r);
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
              mu(r);
            } catch (M) {
              Oe(r, m, M);
            }
            break;
          case 5:
            var k = r.return;
            try {
              mu(r);
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
      var E = r.sibling;
      if (E !== null) {
        E.return = r.return, te = E;
        break;
      }
      te = r.return;
    }
  }
  var nx = Math.ceil, _s = D.ReactCurrentDispatcher, vu = D.ReactCurrentOwner, bt = D.ReactCurrentBatchConfig, _e = 0, Ge = null, ze = null, Xe = 0, _t = 0, Br = An(0), $e = 0, Yo = null, rr = 0, ks = 0, Su = 0, Qo = null, ft = null, wu = 0, Ur = 1 / 0, hn = null, Ts = !1, xu = null, Rn = null, As = !1, Nn = null, Cs = 0, Xo = 0, _u = null, bs = -1, Es = 0;
  function it() {
    return (_e & 6) !== 0 ? Le() : bs !== -1 ? bs : bs = Le();
  }
  function Dn(t) {
    return (t.mode & 1) === 0 ? 1 : (_e & 2) !== 0 && Xe !== 0 ? Xe & -Xe : Vw.transition !== null ? (Es === 0 && (Es = xf()), Es) : (t = Ae, t !== 0 || (t = window.event, t = t === void 0 ? 16 : Mf(t.type)), t);
  }
  function Lt(t, r, s, u) {
    if (50 < Xo) throw Xo = 0, _u = null, Error(o(185));
    wo(t, s, u), ((_e & 2) === 0 || t !== Ge) && (t === Ge && ((_e & 2) === 0 && (ks |= s), $e === 4 && jn(t, Xe)), pt(t, u), s === 1 && _e === 0 && (r.mode & 1) === 0 && (Ur = Le() + 500, ns && bn()));
  }
  function pt(t, r) {
    var s = t.callbackNode;
    VS(t, r);
    var u = Oi(t, t === Ge ? Xe : 0);
    if (u === 0) s !== null && vf(s), t.callbackNode = null, t.callbackPriority = 0;
    else if (r = u & -u, t.callbackPriority !== r) {
      if (s != null && vf(s), r === 1) t.tag === 0 ? Lw(Mh.bind(null, t)) : mp(Mh.bind(null, t)), jw(function() {
        (_e & 6) === 0 && bn();
      }), s = null;
      else {
        switch (_f(u)) {
          case 1:
            s = tl;
            break;
          case 4:
            s = Sf;
            break;
          case 16:
            s = Di;
            break;
          case 536870912:
            s = wf;
            break;
          default:
            s = Di;
        }
        s = Lh(s, Ph.bind(null, t));
      }
      t.callbackPriority = r, t.callbackNode = s;
    }
  }
  function Ph(t, r) {
    if (bs = -1, Es = 0, (_e & 6) !== 0) throw Error(o(327));
    var s = t.callbackNode;
    if ($r() && t.callbackNode !== s) return null;
    var u = Oi(t, t === Ge ? Xe : 0);
    if (u === 0) return null;
    if ((u & 30) !== 0 || (u & t.expiredLanes) !== 0 || r) r = Ps(t, u);
    else {
      r = u;
      var h = _e;
      _e |= 2;
      var m = Nh();
      (Ge !== t || Xe !== r) && (hn = null, Ur = Le() + 500, ir(t, r));
      do
        try {
          ix();
          break;
        } catch (E) {
          Rh(t, E);
        }
      while (!0);
      zl(), _s.current = m, _e = h, ze !== null ? r = 0 : (Ge = null, Xe = 0, r = $e);
    }
    if (r !== 0) {
      if (r === 2 && (h = nl(t), h !== 0 && (u = h, r = ku(t, h))), r === 1) throw s = Yo, ir(t, 0), jn(t, u), pt(t, Le()), s;
      if (r === 6) jn(t, u);
      else {
        if (h = t.current.alternate, (u & 30) === 0 && !rx(h) && (r = Ps(t, u), r === 2 && (m = nl(t), m !== 0 && (u = m, r = ku(t, m))), r === 1)) throw s = Yo, ir(t, 0), jn(t, u), pt(t, Le()), s;
        switch (t.finishedWork = h, t.finishedLanes = u, r) {
          case 0:
          case 1:
            throw Error(o(345));
          case 2:
            sr(t, ft, hn);
            break;
          case 3:
            if (jn(t, u), (u & 130023424) === u && (r = wu + 500 - Le(), 10 < r)) {
              if (Oi(t, 0) !== 0) break;
              if (h = t.suspendedLanes, (h & u) !== u) {
                it(), t.pingedLanes |= t.suspendedLanes & h;
                break;
              }
              t.timeoutHandle = Pl(sr.bind(null, t, ft, hn), r);
              break;
            }
            sr(t, ft, hn);
            break;
          case 4:
            if (jn(t, u), (u & 4194240) === u) break;
            for (r = t.eventTimes, h = -1; 0 < u; ) {
              var k = 31 - Nt(u);
              m = 1 << k, k = r[k], k > h && (h = k), u &= ~m;
            }
            if (u = h, u = Le() - u, u = (120 > u ? 120 : 480 > u ? 480 : 1080 > u ? 1080 : 1920 > u ? 1920 : 3e3 > u ? 3e3 : 4320 > u ? 4320 : 1960 * nx(u / 1960)) - u, 10 < u) {
              t.timeoutHandle = Pl(sr.bind(null, t, ft, hn), u);
              break;
            }
            sr(t, ft, hn);
            break;
          case 5:
            sr(t, ft, hn);
            break;
          default:
            throw Error(o(329));
        }
      }
    }
    return pt(t, Le()), t.callbackNode === s ? Ph.bind(null, t) : null;
  }
  function ku(t, r) {
    var s = Qo;
    return t.current.memoizedState.isDehydrated && (ir(t, r).flags |= 256), t = Ps(t, r), t !== 2 && (r = ft, ft = s, r !== null && Tu(r)), t;
  }
  function Tu(t) {
    ft === null ? ft = t : ft.push.apply(ft, t);
  }
  function rx(t) {
    for (var r = t; ; ) {
      if (r.flags & 16384) {
        var s = r.updateQueue;
        if (s !== null && (s = s.stores, s !== null)) for (var u = 0; u < s.length; u++) {
          var h = s[u], m = h.getSnapshot;
          h = h.value;
          try {
            if (!Dt(m(), h)) return !1;
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
    for (r &= ~Su, r &= ~ks, t.suspendedLanes |= r, t.pingedLanes &= ~r, t = t.expirationTimes; 0 < r; ) {
      var s = 31 - Nt(r), u = 1 << s;
      t[s] = -1, r &= ~u;
    }
  }
  function Mh(t) {
    if ((_e & 6) !== 0) throw Error(o(327));
    $r();
    var r = Oi(t, 0);
    if ((r & 1) === 0) return pt(t, Le()), null;
    var s = Ps(t, r);
    if (t.tag !== 0 && s === 2) {
      var u = nl(t);
      u !== 0 && (r = u, s = ku(t, u));
    }
    if (s === 1) throw s = Yo, ir(t, 0), jn(t, r), pt(t, Le()), s;
    if (s === 6) throw Error(o(345));
    return t.finishedWork = t.current.alternate, t.finishedLanes = r, sr(t, ft, hn), pt(t, Le()), null;
  }
  function Au(t, r) {
    var s = _e;
    _e |= 1;
    try {
      return t(r);
    } finally {
      _e = s, _e === 0 && (Ur = Le() + 500, ns && bn());
    }
  }
  function or(t) {
    Nn !== null && Nn.tag === 0 && (_e & 6) === 0 && $r();
    var r = _e;
    _e |= 1;
    var s = bt.transition, u = Ae;
    try {
      if (bt.transition = null, Ae = 1, t) return t();
    } finally {
      Ae = u, bt.transition = s, _e = r, (_e & 6) === 0 && bn();
    }
  }
  function Cu() {
    _t = Br.current, Ne(Br);
  }
  function ir(t, r) {
    t.finishedWork = null, t.finishedLanes = 0;
    var s = t.timeoutHandle;
    if (s !== -1 && (t.timeoutHandle = -1, Dw(s)), ze !== null) for (s = ze.return; s !== null; ) {
      var u = s;
      switch (Il(u), u.tag) {
        case 1:
          u = u.type.childContextTypes, u != null && es();
          break;
        case 3:
          Lr(), Ne(ut), Ne(et), Yl();
          break;
        case 5:
          Gl(u);
          break;
        case 4:
          Lr();
          break;
        case 13:
          Ne(je);
          break;
        case 19:
          Ne(je);
          break;
        case 10:
          Bl(u.type._context);
          break;
        case 22:
        case 23:
          Cu();
      }
      s = s.return;
    }
    if (Ge = t, ze = t = In(t.current, null), Xe = _t = r, $e = 0, Yo = null, Su = ks = rr = 0, ft = Qo = null, er !== null) {
      for (r = 0; r < er.length; r++) if (s = er[r], u = s.interleaved, u !== null) {
        s.interleaved = null;
        var h = u.next, m = s.pending;
        if (m !== null) {
          var k = m.next;
          m.next = h, u.next = k;
        }
        s.pending = u;
      }
      er = null;
    }
    return t;
  }
  function Rh(t, r) {
    do {
      var s = ze;
      try {
        if (zl(), fs.current = ys, ps) {
          for (var u = Ie.memoizedState; u !== null; ) {
            var h = u.queue;
            h !== null && (h.pending = null), u = u.next;
          }
          ps = !1;
        }
        if (nr = 0, We = Ue = Ie = null, Uo = !1, $o = 0, vu.current = null, s === null || s.return === null) {
          $e = 1, Yo = r, ze = null;
          break;
        }
        e: {
          var m = t, k = s.return, E = s, M = r;
          if (r = Xe, E.flags |= 32768, M !== null && typeof M == "object" && typeof M.then == "function") {
            var F = M, B = E, W = B.tag;
            if ((B.mode & 1) === 0 && (W === 0 || W === 11 || W === 15)) {
              var z = B.alternate;
              z ? (B.updateQueue = z.updateQueue, B.memoizedState = z.memoizedState, B.lanes = z.lanes) : (B.updateQueue = null, B.memoizedState = null);
            }
            var ee = nh(k);
            if (ee !== null) {
              ee.flags &= -257, rh(ee, k, E, m, r), ee.mode & 1 && th(m, F, r), r = ee, M = F;
              var ne = r.updateQueue;
              if (ne === null) {
                var oe = /* @__PURE__ */ new Set();
                oe.add(M), r.updateQueue = oe;
              } else ne.add(M);
              break e;
            } else {
              if ((r & 1) === 0) {
                th(m, F, r), bu();
                break e;
              }
              M = Error(o(426));
            }
          } else if (De && E.mode & 1) {
            var Ve = nh(k);
            if (Ve !== null) {
              (Ve.flags & 65536) === 0 && (Ve.flags |= 256), rh(Ve, k, E, m, r), Ll(Vr(M, E));
              break e;
            }
          }
          m = M = Vr(M, E), $e !== 4 && ($e = 2), Qo === null ? Qo = [m] : Qo.push(m), m = k;
          do {
            switch (m.tag) {
              case 3:
                m.flags |= 65536, r &= -r, m.lanes |= r;
                var j = Jp(m, M, r);
                Cp(m, j);
                break e;
              case 1:
                E = M;
                var N = m.type, I = m.stateNode;
                if ((m.flags & 128) === 0 && (typeof N.getDerivedStateFromError == "function" || I !== null && typeof I.componentDidCatch == "function" && (Rn === null || !Rn.has(I)))) {
                  m.flags |= 65536, r &= -r, m.lanes |= r;
                  var Y = eh(m, E, r);
                  Cp(m, Y);
                  break e;
                }
            }
            m = m.return;
          } while (m !== null);
        }
        jh(s);
      } catch (ie) {
        r = ie, ze === s && s !== null && (ze = s = s.return);
        continue;
      }
      break;
    } while (!0);
  }
  function Nh() {
    var t = _s.current;
    return _s.current = ys, t === null ? ys : t;
  }
  function bu() {
    ($e === 0 || $e === 3 || $e === 2) && ($e = 4), Ge === null || (rr & 268435455) === 0 && (ks & 268435455) === 0 || jn(Ge, Xe);
  }
  function Ps(t, r) {
    var s = _e;
    _e |= 2;
    var u = Nh();
    (Ge !== t || Xe !== r) && (hn = null, ir(t, r));
    do
      try {
        ox();
        break;
      } catch (h) {
        Rh(t, h);
      }
    while (!0);
    if (zl(), _e = s, _s.current = u, ze !== null) throw Error(o(261));
    return Ge = null, Xe = 0, $e;
  }
  function ox() {
    for (; ze !== null; ) Dh(ze);
  }
  function ix() {
    for (; ze !== null && !MS(); ) Dh(ze);
  }
  function Dh(t) {
    var r = Oh(t.alternate, t, _t);
    t.memoizedProps = t.pendingProps, r === null ? jh(t) : ze = r, vu.current = null;
  }
  function jh(t) {
    var r = t;
    do {
      var s = r.alternate;
      if (t = r.return, (r.flags & 32768) === 0) {
        if (s = Zw(s, r, _t), s !== null) {
          ze = s;
          return;
        }
      } else {
        if (s = qw(s, r), s !== null) {
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
    var u = Ae, h = bt.transition;
    try {
      bt.transition = null, Ae = 1, sx(t, r, s, u);
    } finally {
      bt.transition = h, Ae = u;
    }
    return null;
  }
  function sx(t, r, s, u) {
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
    if (zS(t, m), t === Ge && (ze = Ge = null, Xe = 0), (s.subtreeFlags & 2064) === 0 && (s.flags & 2064) === 0 || As || (As = !0, Lh(Di, function() {
      return $r(), null;
    })), m = (s.flags & 15990) !== 0, (s.subtreeFlags & 15990) !== 0 || m) {
      m = bt.transition, bt.transition = null;
      var k = Ae;
      Ae = 1;
      var E = _e;
      _e |= 4, vu.current = null, ex(t, s), Th(s, t), Cw(bl), zi = !!Cl, bl = Cl = null, t.current = s, tx(s), RS(), _e = E, Ae = k, bt.transition = m;
    } else t.current = s;
    if (As && (As = !1, Nn = t, Cs = h), m = t.pendingLanes, m === 0 && (Rn = null), jS(s.stateNode), pt(t, Le()), r !== null) for (u = t.onRecoverableError, s = 0; s < r.length; s++) h = r[s], u(h.value, { componentStack: h.stack, digest: h.digest });
    if (Ts) throw Ts = !1, t = xu, xu = null, t;
    return (Cs & 1) !== 0 && t.tag !== 0 && $r(), m = t.pendingLanes, (m & 1) !== 0 ? t === _u ? Xo++ : (Xo = 0, _u = t) : Xo = 0, bn(), null;
  }
  function $r() {
    if (Nn !== null) {
      var t = _f(Cs), r = bt.transition, s = Ae;
      try {
        if (bt.transition = null, Ae = 16 > t ? 16 : t, Nn === null) var u = !1;
        else {
          if (t = Nn, Nn = null, Cs = 0, (_e & 6) !== 0) throw Error(o(331));
          var h = _e;
          for (_e |= 4, te = t.current; te !== null; ) {
            var m = te, k = m.child;
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
                    var W = B.child;
                    if (W !== null) W.return = B, te = W;
                    else for (; te !== null; ) {
                      B = te;
                      var z = B.sibling, ee = B.return;
                      if (Sh(B), B === F) {
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
            if ((m.subtreeFlags & 2064) !== 0 && k !== null) k.return = m, te = k;
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
            k = te;
            var I = k.child;
            if ((k.subtreeFlags & 2064) !== 0 && I !== null) I.return = k, te = I;
            else e: for (k = N; te !== null; ) {
              if (E = te, (E.flags & 2048) !== 0) try {
                switch (E.tag) {
                  case 0:
                  case 11:
                  case 15:
                    xs(9, E);
                }
              } catch (ie) {
                Oe(E, E.return, ie);
              }
              if (E === k) {
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
            Wt.onPostCommitFiberRoot(ji, t);
          } catch {
          }
          u = !0;
        }
        return u;
      } finally {
        Ae = s, bt.transition = r;
      }
    }
    return !1;
  }
  function Ih(t, r, s) {
    r = Vr(s, r), r = Jp(t, r, 1), t = Pn(t, r, 1), r = it(), t !== null && (wo(t, 1, r), pt(t, r));
  }
  function Oe(t, r, s) {
    if (t.tag === 3) Ih(t, t, s);
    else for (; r !== null; ) {
      if (r.tag === 3) {
        Ih(r, t, s);
        break;
      } else if (r.tag === 1) {
        var u = r.stateNode;
        if (typeof r.type.getDerivedStateFromError == "function" || typeof u.componentDidCatch == "function" && (Rn === null || !Rn.has(u))) {
          t = Vr(s, t), t = eh(r, t, 1), r = Pn(r, t, 1), t = it(), r !== null && (wo(r, 1, t), pt(r, t));
          break;
        }
      }
      r = r.return;
    }
  }
  function ax(t, r, s) {
    var u = t.pingCache;
    u !== null && u.delete(r), r = it(), t.pingedLanes |= t.suspendedLanes & s, Ge === t && (Xe & s) === s && ($e === 4 || $e === 3 && (Xe & 130023424) === Xe && 500 > Le() - wu ? ir(t, 0) : Su |= s), pt(t, r);
  }
  function Fh(t, r) {
    r === 0 && ((t.mode & 1) === 0 ? r = 1 : (r = Fi, Fi <<= 1, (Fi & 130023424) === 0 && (Fi = 4194304)));
    var s = it();
    t = dn(t, r), t !== null && (wo(t, r, s), pt(t, s));
  }
  function lx(t) {
    var r = t.memoizedState, s = 0;
    r !== null && (s = r.retryLane), Fh(t, s);
  }
  function ux(t, r) {
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
    u !== null && u.delete(r), Fh(t, s);
  }
  var Oh;
  Oh = function(t, r, s) {
    if (t !== null) if (t.memoizedProps !== r.pendingProps || ut.current) dt = !0;
    else {
      if ((t.lanes & s) === 0 && (r.flags & 128) === 0) return dt = !1, Xw(t, r, s);
      dt = (t.flags & 131072) !== 0;
    }
    else dt = !1, De && (r.flags & 1048576) !== 0 && yp(r, os, r.index);
    switch (r.lanes = 0, r.tag) {
      case 2:
        var u = r.type;
        Ss(t, r), t = r.pendingProps;
        var h = Rr(r, et.current);
        Or(r, s), h = Zl(null, r, u, t, h, s);
        var m = ql();
        return r.flags |= 1, typeof h == "object" && h !== null && typeof h.render == "function" && h.$$typeof === void 0 ? (r.tag = 1, r.memoizedState = null, r.updateQueue = null, ct(u) ? (m = !0, ts(r)) : m = !1, r.memoizedState = h.state !== null && h.state !== void 0 ? h.state : null, Hl(r), h.updater = gs, r.stateNode = h, h._reactInternals = r, ou(r, u, t, s), r = lu(null, r, u, !0, m, s)) : (r.tag = 0, De && m && jl(r), ot(null, r, h, s), r = r.child), r;
      case 16:
        u = r.elementType;
        e: {
          switch (Ss(t, r), t = r.pendingProps, h = u._init, u = h(u._payload), r.type = u, h = r.tag = dx(u), t = It(u, t), h) {
            case 0:
              r = au(null, r, u, t, s);
              break e;
            case 1:
              r = uh(null, r, u, t, s);
              break e;
            case 11:
              r = oh(null, r, u, t, s);
              break e;
            case 14:
              r = ih(null, r, u, It(u.type, t), s);
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
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : It(u, h), au(t, r, u, h, s);
      case 1:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : It(u, h), uh(t, r, u, h, s);
      case 3:
        e: {
          if (ch(r), t === null) throw Error(o(387));
          u = r.pendingProps, m = r.memoizedState, h = m.element, Ap(t, r), cs(r, u, null, s);
          var k = r.memoizedState;
          if (u = k.element, m.isDehydrated) if (m = { element: u, isDehydrated: !1, cache: k.cache, pendingSuspenseBoundaries: k.pendingSuspenseBoundaries, transitions: k.transitions }, r.updateQueue.baseState = m, r.memoizedState = m, r.flags & 256) {
            h = Vr(Error(o(423)), r), r = dh(t, r, u, s, h);
            break e;
          } else if (u !== h) {
            h = Vr(Error(o(424)), r), r = dh(t, r, u, s, h);
            break e;
          } else for (xt = Tn(r.stateNode.containerInfo.firstChild), wt = r, De = !0, jt = null, s = kp(r, null, u, s), r.child = s; s; ) s.flags = s.flags & -3 | 4096, s = s.sibling;
          else {
            if (jr(), u === h) {
              r = pn(t, r, s);
              break e;
            }
            ot(t, r, u, s);
          }
          r = r.child;
        }
        return r;
      case 5:
        return Ep(r), t === null && Ol(r), u = r.type, h = r.pendingProps, m = t !== null ? t.memoizedProps : null, k = h.children, El(u, h) ? k = null : m !== null && El(u, m) && (r.flags |= 32), lh(t, r), ot(t, r, k, s), r.child;
      case 6:
        return t === null && Ol(r), null;
      case 13:
        return fh(t, r, s);
      case 4:
        return Wl(r, r.stateNode.containerInfo), u = r.pendingProps, t === null ? r.child = Ir(r, null, u, s) : ot(t, r, u, s), r.child;
      case 11:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : It(u, h), oh(t, r, u, h, s);
      case 7:
        return ot(t, r, r.pendingProps, s), r.child;
      case 8:
        return ot(t, r, r.pendingProps.children, s), r.child;
      case 12:
        return ot(t, r, r.pendingProps.children, s), r.child;
      case 10:
        e: {
          if (u = r.type._context, h = r.pendingProps, m = r.memoizedProps, k = h.value, Me(as, u._currentValue), u._currentValue = k, m !== null) if (Dt(m.value, k)) {
            if (m.children === h.children && !ut.current) {
              r = pn(t, r, s);
              break e;
            }
          } else for (m = r.child, m !== null && (m.return = r); m !== null; ) {
            var E = m.dependencies;
            if (E !== null) {
              k = m.child;
              for (var M = E.firstContext; M !== null; ) {
                if (M.context === u) {
                  if (m.tag === 1) {
                    M = fn(-1, s & -s), M.tag = 2;
                    var F = m.updateQueue;
                    if (F !== null) {
                      F = F.shared;
                      var B = F.pending;
                      B === null ? M.next = M : (M.next = B.next, B.next = M), F.pending = M;
                    }
                  }
                  m.lanes |= s, M = m.alternate, M !== null && (M.lanes |= s), Ul(
                    m.return,
                    s,
                    r
                  ), E.lanes |= s;
                  break;
                }
                M = M.next;
              }
            } else if (m.tag === 10) k = m.type === r.type ? null : m.child;
            else if (m.tag === 18) {
              if (k = m.return, k === null) throw Error(o(341));
              k.lanes |= s, E = k.alternate, E !== null && (E.lanes |= s), Ul(k, s, r), k = m.sibling;
            } else k = m.child;
            if (k !== null) k.return = m;
            else for (k = m; k !== null; ) {
              if (k === r) {
                k = null;
                break;
              }
              if (m = k.sibling, m !== null) {
                m.return = k.return, k = m;
                break;
              }
              k = k.return;
            }
            m = k;
          }
          ot(t, r, h.children, s), r = r.child;
        }
        return r;
      case 9:
        return h = r.type, u = r.pendingProps.children, Or(r, s), h = At(h), u = u(h), r.flags |= 1, ot(t, r, u, s), r.child;
      case 14:
        return u = r.type, h = It(u, r.pendingProps), h = It(u.type, h), ih(t, r, u, h, s);
      case 15:
        return sh(t, r, r.type, r.pendingProps, s);
      case 17:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : It(u, h), Ss(t, r), r.tag = 1, ct(u) ? (t = !0, ts(r)) : t = !1, Or(r, s), Zp(r, u, h), ou(r, u, h, s), lu(null, r, u, !0, t, s);
      case 19:
        return hh(t, r, s);
      case 22:
        return ah(t, r, s);
    }
    throw Error(o(156, r.tag));
  };
  function Lh(t, r) {
    return gf(t, r);
  }
  function cx(t, r, s, u) {
    this.tag = t, this.key = s, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = r, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = u, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function Et(t, r, s, u) {
    return new cx(t, r, s, u);
  }
  function Eu(t) {
    return t = t.prototype, !(!t || !t.isReactComponent);
  }
  function dx(t) {
    if (typeof t == "function") return Eu(t) ? 1 : 0;
    if (t != null) {
      if (t = t.$$typeof, t === de) return 11;
      if (t === Se) return 14;
    }
    return 2;
  }
  function In(t, r) {
    var s = t.alternate;
    return s === null ? (s = Et(t.tag, r, t.key, t.mode), s.elementType = t.elementType, s.type = t.type, s.stateNode = t.stateNode, s.alternate = t, t.alternate = s) : (s.pendingProps = r, s.type = t.type, s.flags = 0, s.subtreeFlags = 0, s.deletions = null), s.flags = t.flags & 14680064, s.childLanes = t.childLanes, s.lanes = t.lanes, s.child = t.child, s.memoizedProps = t.memoizedProps, s.memoizedState = t.memoizedState, s.updateQueue = t.updateQueue, r = t.dependencies, s.dependencies = r === null ? null : { lanes: r.lanes, firstContext: r.firstContext }, s.sibling = t.sibling, s.index = t.index, s.ref = t.ref, s;
  }
  function Ms(t, r, s, u, h, m) {
    var k = 2;
    if (u = t, typeof t == "function") Eu(t) && (k = 1);
    else if (typeof t == "string") k = 5;
    else e: switch (t) {
      case Z:
        return ar(s.children, h, m, r);
      case U:
        k = 8, h |= 8;
        break;
      case G:
        return t = Et(12, s, r, h | 2), t.elementType = G, t.lanes = m, t;
      case ye:
        return t = Et(13, s, r, h), t.elementType = ye, t.lanes = m, t;
      case he:
        return t = Et(19, s, r, h), t.elementType = he, t.lanes = m, t;
      case ge:
        return Rs(s, h, m, r);
      default:
        if (typeof t == "object" && t !== null) switch (t.$$typeof) {
          case Q:
            k = 10;
            break e;
          case J:
            k = 9;
            break e;
          case de:
            k = 11;
            break e;
          case Se:
            k = 14;
            break e;
          case ue:
            k = 16, u = null;
            break e;
        }
        throw Error(o(130, t == null ? t : typeof t, ""));
    }
    return r = Et(k, s, r, h), r.elementType = t, r.type = u, r.lanes = m, r;
  }
  function ar(t, r, s, u) {
    return t = Et(7, t, u, r), t.lanes = s, t;
  }
  function Rs(t, r, s, u) {
    return t = Et(22, t, u, r), t.elementType = ge, t.lanes = s, t.stateNode = { isHidden: !1 }, t;
  }
  function Pu(t, r, s) {
    return t = Et(6, t, null, r), t.lanes = s, t;
  }
  function Mu(t, r, s) {
    return r = Et(4, t.children !== null ? t.children : [], t.key, r), r.lanes = s, r.stateNode = { containerInfo: t.containerInfo, pendingChildren: null, implementation: t.implementation }, r;
  }
  function fx(t, r, s, u, h) {
    this.tag = r, this.containerInfo = t, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = rl(0), this.expirationTimes = rl(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = rl(0), this.identifierPrefix = u, this.onRecoverableError = h, this.mutableSourceEagerHydrationData = null;
  }
  function Ru(t, r, s, u, h, m, k, E, M) {
    return t = new fx(t, r, s, E, M), r === 1 ? (r = 1, m === !0 && (r |= 8)) : r = 0, m = Et(3, null, null, r), t.current = m, m.stateNode = t, m.memoizedState = { element: u, isDehydrated: s, cache: null, transitions: null, pendingSuspenseBoundaries: null }, Hl(m), t;
  }
  function px(t, r, s) {
    var u = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return { $$typeof: X, key: u == null ? null : "" + u, children: t, containerInfo: r, implementation: s };
  }
  function Vh(t) {
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
      if (ct(s)) return pp(t, s, r);
    }
    return r;
  }
  function zh(t, r, s, u, h, m, k, E, M) {
    return t = Ru(s, u, !0, t, h, m, k, E, M), t.context = Vh(null), s = t.current, u = it(), h = Dn(s), m = fn(u, h), m.callback = r ?? null, Pn(s, m, h), t.current.lanes = h, wo(t, h, u), pt(t, u), t;
  }
  function Ns(t, r, s, u) {
    var h = r.current, m = it(), k = Dn(h);
    return s = Vh(s), r.context === null ? r.context = s : r.pendingContext = s, r = fn(m, k), r.payload = { element: t }, u = u === void 0 ? null : u, u !== null && (r.callback = u), t = Pn(h, r, k), t !== null && (Lt(t, h, k, m), us(t, h, k)), k;
  }
  function Ds(t) {
    if (t = t.current, !t.child) return null;
    switch (t.child.tag) {
      case 5:
        return t.child.stateNode;
      default:
        return t.child.stateNode;
    }
  }
  function Bh(t, r) {
    if (t = t.memoizedState, t !== null && t.dehydrated !== null) {
      var s = t.retryLane;
      t.retryLane = s !== 0 && s < r ? s : r;
    }
  }
  function Nu(t, r) {
    Bh(t, r), (t = t.alternate) && Bh(t, r);
  }
  function hx() {
    return null;
  }
  var Uh = typeof reportError == "function" ? reportError : function(t) {
    console.error(t);
  };
  function Du(t) {
    this._internalRoot = t;
  }
  js.prototype.render = Du.prototype.render = function(t) {
    var r = this._internalRoot;
    if (r === null) throw Error(o(409));
    Ns(t, r, null, null);
  }, js.prototype.unmount = Du.prototype.unmount = function() {
    var t = this._internalRoot;
    if (t !== null) {
      this._internalRoot = null;
      var r = t.containerInfo;
      or(function() {
        Ns(null, t, null, null);
      }), r[an] = null;
    }
  };
  function js(t) {
    this._internalRoot = t;
  }
  js.prototype.unstable_scheduleHydration = function(t) {
    if (t) {
      var r = Af();
      t = { blockedOn: null, target: t, priority: r };
      for (var s = 0; s < xn.length && r !== 0 && r < xn[s].priority; s++) ;
      xn.splice(s, 0, t), s === 0 && Ef(t);
    }
  };
  function ju(t) {
    return !(!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11);
  }
  function Is(t) {
    return !(!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11 && (t.nodeType !== 8 || t.nodeValue !== " react-mount-point-unstable "));
  }
  function $h() {
  }
  function mx(t, r, s, u, h) {
    if (h) {
      if (typeof u == "function") {
        var m = u;
        u = function() {
          var F = Ds(k);
          m.call(F);
        };
      }
      var k = zh(r, u, t, 0, null, !1, !1, "", $h);
      return t._reactRootContainer = k, t[an] = k.current, jo(t.nodeType === 8 ? t.parentNode : t), or(), k;
    }
    for (; h = t.lastChild; ) t.removeChild(h);
    if (typeof u == "function") {
      var E = u;
      u = function() {
        var F = Ds(M);
        E.call(F);
      };
    }
    var M = Ru(t, 0, !1, null, null, !1, !1, "", $h);
    return t._reactRootContainer = M, t[an] = M.current, jo(t.nodeType === 8 ? t.parentNode : t), or(function() {
      Ns(r, M, s, u);
    }), M;
  }
  function Fs(t, r, s, u, h) {
    var m = s._reactRootContainer;
    if (m) {
      var k = m;
      if (typeof h == "function") {
        var E = h;
        h = function() {
          var M = Ds(k);
          E.call(M);
        };
      }
      Ns(r, k, t, h);
    } else k = mx(s, r, t, h, u);
    return Ds(k);
  }
  kf = function(t) {
    switch (t.tag) {
      case 3:
        var r = t.stateNode;
        if (r.current.memoizedState.isDehydrated) {
          var s = So(r.pendingLanes);
          s !== 0 && (ol(r, s | 1), pt(r, Le()), (_e & 6) === 0 && (Ur = Le() + 500, bn()));
        }
        break;
      case 13:
        or(function() {
          var u = dn(t, 1);
          if (u !== null) {
            var h = it();
            Lt(u, t, 1, h);
          }
        }), Nu(t, 1);
    }
  }, il = function(t) {
    if (t.tag === 13) {
      var r = dn(t, 134217728);
      if (r !== null) {
        var s = it();
        Lt(r, t, 134217728, s);
      }
      Nu(t, 134217728);
    }
  }, Tf = function(t) {
    if (t.tag === 13) {
      var r = Dn(t), s = dn(t, r);
      if (s !== null) {
        var u = it();
        Lt(s, t, r, u);
      }
      Nu(t, r);
    }
  }, Af = function() {
    return Ae;
  }, Cf = function(t, r) {
    var s = Ae;
    try {
      return Ae = t, r();
    } finally {
      Ae = s;
    }
  }, Za = function(t, r, s) {
    switch (r) {
      case "input":
        if ($a(t, s), r = s.name, s.type === "radio" && r != null) {
          for (s = t; s.parentNode; ) s = s.parentNode;
          for (s = s.querySelectorAll("input[name=" + JSON.stringify("" + r) + '][type="radio"]'), r = 0; r < s.length; r++) {
            var u = s[r];
            if (u !== t && u.form === t.form) {
              var h = Ji(u);
              if (!h) throw Error(o(90));
              fo(u), $a(u, h);
            }
          }
        }
        break;
      case "textarea":
        ef(t, s);
        break;
      case "select":
        r = s.value, r != null && Sr(t, !!s.multiple, r, !1);
    }
  }, cf = Au, df = or;
  var yx = { usingClientEntryPoint: !1, Events: [Oo, Pr, Ji, lf, uf, Au] }, Zo = { findFiberByHostInstance: Xn, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, gx = { bundleType: Zo.bundleType, version: Zo.version, rendererPackageName: Zo.rendererPackageName, rendererConfig: Zo.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: D.ReactCurrentDispatcher, findHostInstanceByFiber: function(t) {
    return t = mf(t), t === null ? null : t.stateNode;
  }, findFiberByHostInstance: Zo.findFiberByHostInstance || hx, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Os = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Os.isDisabled && Os.supportsFiber) try {
      ji = Os.inject(gx), Wt = Os;
    } catch {
    }
  }
  return ht.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = yx, ht.createPortal = function(t, r) {
    var s = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!ju(r)) throw Error(o(200));
    return px(t, r, null, s);
  }, ht.createRoot = function(t, r) {
    if (!ju(t)) throw Error(o(299));
    var s = !1, u = "", h = Uh;
    return r != null && (r.unstable_strictMode === !0 && (s = !0), r.identifierPrefix !== void 0 && (u = r.identifierPrefix), r.onRecoverableError !== void 0 && (h = r.onRecoverableError)), r = Ru(t, 1, !1, null, null, s, !1, u, h), t[an] = r.current, jo(t.nodeType === 8 ? t.parentNode : t), new Du(r);
  }, ht.findDOMNode = function(t) {
    if (t == null) return null;
    if (t.nodeType === 1) return t;
    var r = t._reactInternals;
    if (r === void 0)
      throw typeof t.render == "function" ? Error(o(188)) : (t = Object.keys(t).join(","), Error(o(268, t)));
    return t = mf(r), t = t === null ? null : t.stateNode, t;
  }, ht.flushSync = function(t) {
    return or(t);
  }, ht.hydrate = function(t, r, s) {
    if (!Is(r)) throw Error(o(200));
    return Fs(null, t, r, !0, s);
  }, ht.hydrateRoot = function(t, r, s) {
    if (!ju(t)) throw Error(o(405));
    var u = s != null && s.hydratedSources || null, h = !1, m = "", k = Uh;
    if (s != null && (s.unstable_strictMode === !0 && (h = !0), s.identifierPrefix !== void 0 && (m = s.identifierPrefix), s.onRecoverableError !== void 0 && (k = s.onRecoverableError)), r = zh(r, null, t, 1, s ?? null, h, !1, m, k), t[an] = r.current, jo(t), u) for (t = 0; t < u.length; t++) s = u[t], h = s._getVersion, h = h(s._source), r.mutableSourceEagerHydrationData == null ? r.mutableSourceEagerHydrationData = [s, h] : r.mutableSourceEagerHydrationData.push(
      s,
      h
    );
    return new js(r);
  }, ht.render = function(t, r, s) {
    if (!Is(r)) throw Error(o(200));
    return Fs(null, t, r, !1, s);
  }, ht.unmountComponentAtNode = function(t) {
    if (!Is(t)) throw Error(o(40));
    return t._reactRootContainer ? (or(function() {
      Fs(null, null, t, !1, function() {
        t._reactRootContainer = null, t[an] = null;
      });
    }), !0) : !1;
  }, ht.unstable_batchedUpdates = Au, ht.unstable_renderSubtreeIntoContainer = function(t, r, s, u) {
    if (!Is(s)) throw Error(o(200));
    if (t == null || t._reactInternals === void 0) throw Error(o(38));
    return Fs(t, r, s, !1, u);
  }, ht.version = "18.3.1-next-f1338f8080-20240426", ht;
}
var qh;
function rg() {
  if (qh) return Fu.exports;
  qh = 1;
  function e() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(e);
      } catch (n) {
        console.error(n);
      }
  }
  return e(), Fu.exports = Ex(), Fu.exports;
}
var Jh;
function Px() {
  if (Jh) return Vs;
  Jh = 1;
  var e = rg();
  return Vs.createRoot = e.createRoot, Vs.hydrateRoot = e.hydrateRoot, Vs;
}
var Mx = Px(), Vu = { exports: {} }, Jo = {};
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var em;
function Rx() {
  if (em) return Jo;
  em = 1;
  var e = td(), n = Symbol.for("react.element"), o = Symbol.for("react.fragment"), i = Object.prototype.hasOwnProperty, a = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, c = { key: !0, ref: !0, __self: !0, __source: !0 };
  function d(p, y, v) {
    var S, l = {}, f = null, g = null;
    v !== void 0 && (f = "" + v), y.key !== void 0 && (f = "" + y.key), y.ref !== void 0 && (g = y.ref);
    for (S in y) i.call(y, S) && !c.hasOwnProperty(S) && (l[S] = y[S]);
    if (p && p.defaultProps) for (S in y = p.defaultProps, y) l[S] === void 0 && (l[S] = y[S]);
    return { $$typeof: n, type: p, key: f, ref: g, props: l, _owner: a.current };
  }
  return Jo.Fragment = o, Jo.jsx = d, Jo.jsxs = d, Jo;
}
var tm;
function Nx() {
  return tm || (tm = 1, Vu.exports = Rx()), Vu.exports;
}
var w = Nx();
const nm = (e) => Symbol.iterator in e, rm = (e) => (
  // HACK: avoid checking entries type
  "entries" in e
), om = (e, n) => {
  const o = e instanceof Map ? e : new Map(e.entries()), i = n instanceof Map ? n : new Map(n.entries());
  if (o.size !== i.size)
    return !1;
  for (const [a, c] of o)
    if (!i.has(a) || !Object.is(c, i.get(a)))
      return !1;
  return !0;
}, Dx = (e, n) => {
  const o = e[Symbol.iterator](), i = n[Symbol.iterator]();
  let a = o.next(), c = i.next();
  for (; !a.done && !c.done; ) {
    if (!Object.is(a.value, c.value))
      return !1;
    a = o.next(), c = i.next();
  }
  return !!a.done && !!c.done;
};
function jx(e, n) {
  return Object.is(e, n) ? !0 : typeof e != "object" || e === null || typeof n != "object" || n === null || Object.getPrototypeOf(e) !== Object.getPrototypeOf(n) ? !1 : nm(e) && nm(n) ? rm(e) && rm(n) ? om(e, n) : Dx(e, n) : om(
    { entries: () => Object.entries(e) },
    { entries: () => Object.entries(n) }
  );
}
function Ix(e) {
  const n = gn.useRef(void 0);
  return (o) => {
    const i = e(o);
    return jx(n.current, i) ? n.current : n.current = i;
  };
}
const rd = C.createContext({});
function od(e) {
  const n = C.useRef(null);
  return n.current === null && (n.current = e()), n.current;
}
const Fx = typeof window < "u", id = Fx ? C.useLayoutEffect : C.useEffect, Ma = /* @__PURE__ */ C.createContext(null);
function sd(e, n) {
  e.indexOf(n) === -1 && e.push(n);
}
function fa(e, n) {
  const o = e.indexOf(n);
  o > -1 && e.splice(o, 1);
}
const sn = (e, n, o) => o > n ? n : o < e ? e : o;
function im(e, n) {
  return n ? `${e}. For more information and steps for solving, visit https://motion.dev/troubleshooting/${n}` : e;
}
let ki = () => {
}, vr = () => {
};
var Zy;
typeof process < "u" && ((Zy = process.env) == null ? void 0 : Zy.NODE_ENV) !== "production" && (ki = (e, n, o) => {
  !e && typeof console < "u" && console.warn(im(n, o));
}, vr = (e, n, o) => {
  if (!e)
    throw new Error(im(n, o));
});
const $n = {}, og = (e) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(e), ig = (e) => typeof e == "object" && e !== null, sg = (e) => /^0[^.\s]+$/u.test(e);
// @__NO_SIDE_EFFECTS__
function ag(e) {
  let n;
  return () => (n === void 0 && (n = e()), n);
}
const Rt = /* @__NO_SIDE_EFFECTS__ */ (e) => e, Ti = (...e) => e.reduce((n, o) => (i) => o(n(i))), pi = /* @__NO_SIDE_EFFECTS__ */ (e, n, o) => {
  const i = n - e;
  return i ? (o - e) / i : 1;
};
class ad {
  constructor() {
    this.subscriptions = [];
  }
  add(n) {
    return sd(this.subscriptions, n), () => fa(this.subscriptions, n);
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
const gt = /* @__NO_SIDE_EFFECTS__ */ (e) => e * 1e3, Mt = /* @__NO_SIDE_EFFECTS__ */ (e) => e / 1e3, lg = /* @__NO_SIDE_EFFECTS__ */ (e, n) => n ? e * (1e3 / n) : 0, ug = (e, n, o) => (((1 - 3 * o + 3 * n) * e + (3 * o - 6 * n)) * e + 3 * n) * e, Ox = 1e-7, Lx = 12;
function Vx(e, n, o, i, a) {
  let c, d, p = 0;
  do
    d = n + (o - n) / 2, c = ug(d, i, a) - e, c > 0 ? o = d : n = d;
  while (Math.abs(c) > Ox && ++p < Lx);
  return d;
}
// @__NO_SIDE_EFFECTS__
function Ai(e, n, o, i) {
  if (e === n && o === i)
    return Rt;
  const a = (c) => Vx(c, 0, 1, e, o);
  return (c) => c === 0 || c === 1 ? c : ug(a(c), n, i);
}
const cg = /* @__NO_SIDE_EFFECTS__ */ (e) => (n) => n <= 0.5 ? e(2 * n) / 2 : (2 - e(2 * (1 - n))) / 2, dg = /* @__NO_SIDE_EFFECTS__ */ (e) => (n) => 1 - e(1 - n), fg = /* @__PURE__ */ Ai(0.33, 1.53, 0.69, 0.99), ld = /* @__PURE__ */ dg(fg), pg = /* @__PURE__ */ cg(ld), hg = (e) => e >= 1 ? 1 : (e *= 2) < 1 ? 0.5 * ld(e) : 0.5 * (2 - Math.pow(2, -10 * (e - 1))), ud = (e) => 1 - Math.sin(Math.acos(e)), mg = /* @__PURE__ */ dg(ud), yg = /* @__PURE__ */ cg(ud), zx = /* @__PURE__ */ Ai(0.42, 0, 1, 1), Bx = /* @__PURE__ */ Ai(0, 0, 0.58, 1), gg = /* @__PURE__ */ Ai(0.42, 0, 0.58, 1), Ux = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] != "number", vg = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] == "number", sm = {
  linear: Rt,
  easeIn: zx,
  easeInOut: gg,
  easeOut: Bx,
  circIn: ud,
  circInOut: yg,
  circOut: mg,
  backIn: ld,
  backInOut: pg,
  backOut: fg,
  anticipate: hg
}, $x = (e) => typeof e == "string", am = (e) => {
  if (/* @__PURE__ */ vg(e)) {
    vr(e.length === 4, "Cubic bezier arrays must contain four numerical values.", "cubic-bezier-length");
    const [n, o, i, a] = e;
    return /* @__PURE__ */ Ai(n, o, i, a);
  } else if ($x(e))
    return vr(sm[e] !== void 0, `Invalid easing type '${e}'`, "invalid-easing-type"), sm[e];
  return e;
}, zs = [
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
function Hx(e) {
  let n = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set(), i = !1, a = !1;
  const c = /* @__PURE__ */ new WeakSet();
  let d = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  };
  function p(v) {
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
      n = o, o = S, n.forEach(p), n.clear(), i = !1, a && (a = !1, y.process(v));
    }
  };
  return y;
}
const Wx = 40;
function Sg(e, n) {
  let o = !1, i = !0;
  const a = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  }, c = () => o = !0, d = zs.reduce((P, D) => (P[D] = Hx(c), P), {}), { setup: p, read: y, resolveKeyframes: v, preUpdate: S, update: l, preRender: f, render: g, postRender: x } = d, T = () => {
    const P = $n.useManualTiming, D = P ? a.timestamp : performance.now();
    o = !1, P || (a.delta = i ? 1e3 / 60 : Math.max(Math.min(D - a.timestamp, Wx), 1)), a.timestamp = D, a.isProcessing = !0, p.process(a), y.process(a), v.process(a), S.process(a), l.process(a), f.process(a), g.process(a), x.process(a), a.isProcessing = !1, o && n && (i = !1, e(T));
  }, _ = () => {
    o = !0, i = !0, a.isProcessing || e(T);
  };
  return { schedule: zs.reduce((P, D) => {
    const L = d[D];
    return P[D] = (X, Z = !1, U = !1) => (o || _(), L.schedule(X, Z, U)), P;
  }, {}), cancel: (P) => {
    for (let D = 0; D < zs.length; D++)
      d[zs[D]].cancel(P);
  }, state: a, steps: d };
}
const { schedule: Pe, cancel: Hn, state: Ze, steps: zu } = /* @__PURE__ */ Sg(typeof requestAnimationFrame < "u" ? requestAnimationFrame : Rt, !0);
let qs;
function Gx() {
  qs = void 0;
}
const st = {
  now: () => (qs === void 0 && st.set(Ze.isProcessing || $n.useManualTiming ? Ze.timestamp : performance.now()), qs),
  set: (e) => {
    qs = e, queueMicrotask(Gx);
  }
}, wg = (e) => (n) => typeof n == "string" && n.startsWith(e), xg = /* @__PURE__ */ wg("--"), Kx = /* @__PURE__ */ wg("var(--"), cd = (e) => Kx(e) ? Yx.test(e.split("/*")[0].trim()) : !1, Yx = /var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;
function lm(e) {
  return typeof e != "string" ? !1 : e.split("/*")[0].includes("var(--");
}
const ao = {
  test: (e) => typeof e == "number",
  parse: parseFloat,
  transform: (e) => e
}, hi = {
  ...ao,
  transform: (e) => sn(0, 1, e)
}, Bs = {
  ...ao,
  default: 1
}, si = (e) => Math.round(e * 1e5) / 1e5, dd = /-?(?:\d+(?:\.\d+)?|\.\d+)/gu;
function Qx(e) {
  return e == null;
}
const Xx = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu, fd = (e, n) => (o) => !!(typeof o == "string" && Xx.test(o) && o.startsWith(e) || n && !Qx(o) && Object.prototype.hasOwnProperty.call(o, n)), _g = (e, n, o) => (i) => {
  if (typeof i != "string")
    return i;
  const [a, c, d, p] = i.match(dd);
  return {
    [e]: parseFloat(a),
    [n]: parseFloat(c),
    [o]: parseFloat(d),
    alpha: p !== void 0 ? parseFloat(p) : 1
  };
}, Zx = (e) => sn(0, 255, e), Bu = {
  ...ao,
  transform: (e) => Math.round(Zx(e))
}, fr = {
  test: /* @__PURE__ */ fd("rgb", "red"),
  parse: /* @__PURE__ */ _g("red", "green", "blue"),
  transform: ({ red: e, green: n, blue: o, alpha: i = 1 }) => "rgba(" + Bu.transform(e) + ", " + Bu.transform(n) + ", " + Bu.transform(o) + ", " + si(hi.transform(i)) + ")"
};
function qx(e) {
  let n = "", o = "", i = "", a = "";
  return e.length > 5 ? (n = e.substring(1, 3), o = e.substring(3, 5), i = e.substring(5, 7), a = e.substring(7, 9)) : (n = e.substring(1, 2), o = e.substring(2, 3), i = e.substring(3, 4), a = e.substring(4, 5), n += n, o += o, i += i, a += a), {
    red: parseInt(n, 16),
    green: parseInt(o, 16),
    blue: parseInt(i, 16),
    alpha: a ? parseInt(a, 16) / 255 : 1
  };
}
const pc = {
  test: /* @__PURE__ */ fd("#"),
  parse: qx,
  transform: fr.transform
}, Ci = /* @__NO_SIDE_EFFECTS__ */ (e) => ({
  test: (n) => typeof n == "string" && n.endsWith(e) && n.split(" ").length === 1,
  parse: parseFloat,
  transform: (n) => `${n}${e}`
}), yn = /* @__PURE__ */ Ci("deg"), rn = /* @__PURE__ */ Ci("%"), re = /* @__PURE__ */ Ci("px"), Jx = /* @__PURE__ */ Ci("vh"), e1 = /* @__PURE__ */ Ci("vw"), um = {
  ...rn,
  parse: (e) => rn.parse(e) / 100,
  transform: (e) => rn.transform(e * 100)
}, Qr = {
  test: /* @__PURE__ */ fd("hsl", "hue"),
  parse: /* @__PURE__ */ _g("hue", "saturation", "lightness"),
  transform: ({ hue: e, saturation: n, lightness: o, alpha: i = 1 }) => "hsla(" + Math.round(e) + ", " + rn.transform(si(n)) + ", " + rn.transform(si(o)) + ", " + si(hi.transform(i)) + ")"
}, Be = {
  test: (e) => fr.test(e) || pc.test(e) || Qr.test(e),
  parse: (e) => fr.test(e) ? fr.parse(e) : Qr.test(e) ? Qr.parse(e) : pc.parse(e),
  transform: (e) => typeof e == "string" ? e : e.hasOwnProperty("red") ? fr.transform(e) : Qr.transform(e),
  getAnimatableNone: (e) => {
    const n = Be.parse(e);
    return n.alpha = 0, Be.transform(n);
  }
}, t1 = /(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;
function n1(e) {
  var n, o;
  return isNaN(e) && typeof e == "string" && (((n = e.match(dd)) == null ? void 0 : n.length) || 0) + (((o = e.match(t1)) == null ? void 0 : o.length) || 0) > 0;
}
const kg = "number", Tg = "color", r1 = "var", o1 = "var(", cm = "${}", i1 = /var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;
function no(e) {
  const n = e.toString(), o = [], i = {
    color: [],
    number: [],
    var: []
  }, a = [];
  let c = 0;
  const p = n.replace(i1, (y) => (Be.test(y) ? (i.color.push(c), a.push(Tg), o.push(Be.parse(y))) : y.startsWith(o1) ? (i.var.push(c), a.push(r1), o.push(y)) : (i.number.push(c), a.push(kg), o.push(parseFloat(y))), ++c, cm)).split(cm);
  return { values: o, split: p, indexes: i, types: a };
}
function s1(e) {
  return no(e).values;
}
function Ag({ split: e, types: n }) {
  const o = e.length;
  return (i) => {
    let a = "";
    for (let c = 0; c < o; c++)
      if (a += e[c], i[c] !== void 0) {
        const d = n[c];
        d === kg ? a += si(i[c]) : d === Tg ? a += Be.transform(i[c]) : a += i[c];
      }
    return a;
  };
}
function a1(e) {
  return Ag(no(e));
}
const l1 = (e) => typeof e == "number" ? 0 : Be.test(e) ? Be.getAnimatableNone(e) : e, u1 = (e, n) => typeof e == "number" ? n != null && n.trim().endsWith("/") ? e : 0 : l1(e);
function c1(e) {
  const n = no(e);
  return Ag(n)(n.values.map((i, a) => u1(i, n.split[a])));
}
const $t = {
  test: n1,
  parse: s1,
  createTransformer: a1,
  getAnimatableNone: c1
};
function Uu(e, n, o) {
  return o < 0 && (o += 1), o > 1 && (o -= 1), o < 1 / 6 ? e + (n - e) * 6 * o : o < 1 / 2 ? n : o < 2 / 3 ? e + (n - e) * (2 / 3 - o) * 6 : e;
}
function d1({ hue: e, saturation: n, lightness: o, alpha: i }) {
  e /= 360, n /= 100, o /= 100;
  let a = 0, c = 0, d = 0;
  if (!n)
    a = c = d = o;
  else {
    const p = o < 0.5 ? o * (1 + n) : o + n - o * n, y = 2 * o - p;
    a = Uu(y, p, e + 1 / 3), c = Uu(y, p, e), d = Uu(y, p, e - 1 / 3);
  }
  return {
    red: Math.round(a * 255),
    green: Math.round(c * 255),
    blue: Math.round(d * 255),
    alpha: i
  };
}
function pa(e, n) {
  return (o) => o > 0 ? n : e;
}
const be = (e, n, o) => e + (n - e) * o, $u = (e, n, o) => {
  const i = e * e, a = o * (n * n - i) + i;
  return a < 0 ? 0 : Math.sqrt(a);
}, f1 = [pc, fr, Qr], p1 = (e) => f1.find((n) => n.test(e));
function dm(e) {
  const n = p1(e);
  if (ki(!!n, `'${e}' is not an animatable color. Use the equivalent color code instead.`, "color-not-animatable"), !n)
    return !1;
  let o = n.parse(e);
  return n === Qr && (o = d1(o)), o;
}
const fm = (e, n) => {
  const o = dm(e), i = dm(n);
  if (!o || !i)
    return pa(e, n);
  const a = { ...o };
  return (c) => (a.red = $u(o.red, i.red, c), a.green = $u(o.green, i.green, c), a.blue = $u(o.blue, i.blue, c), a.alpha = be(o.alpha, i.alpha, c), fr.transform(a));
}, hc = /* @__PURE__ */ new Set(["none", "hidden"]);
function h1(e, n) {
  return hc.has(e) ? (o) => o <= 0 ? e : n : (o) => o >= 1 ? n : e;
}
function m1(e, n) {
  return (o) => be(e, n, o);
}
function pd(e) {
  return typeof e == "number" ? m1 : typeof e == "string" ? cd(e) ? pa : Be.test(e) ? fm : v1 : Array.isArray(e) ? Cg : typeof e == "object" ? Be.test(e) ? fm : y1 : pa;
}
function Cg(e, n) {
  const o = [...e], i = o.length, a = e.map((c, d) => pd(c)(c, n[d]));
  return (c) => {
    for (let d = 0; d < i; d++)
      o[d] = a[d](c);
    return o;
  };
}
function y1(e, n) {
  const o = { ...e, ...n }, i = {};
  for (const a in o)
    e[a] !== void 0 && n[a] !== void 0 && (i[a] = pd(e[a])(e[a], n[a]));
  return (a) => {
    for (const c in i)
      o[c] = i[c](a);
    return o;
  };
}
function g1(e, n) {
  const o = [], i = { color: 0, var: 0, number: 0 };
  for (let a = 0; a < n.values.length; a++) {
    const c = n.types[a], d = e.indexes[c][i[c]], p = e.values[d] ?? 0;
    o[a] = p, i[c]++;
  }
  return o;
}
const v1 = (e, n) => {
  const o = $t.createTransformer(n), i = no(e), a = no(n);
  return i.indexes.var.length === a.indexes.var.length && i.indexes.color.length === a.indexes.color.length && i.indexes.number.length >= a.indexes.number.length ? hc.has(e) && !a.values.length || hc.has(n) && !i.values.length ? h1(e, n) : Ti(Cg(g1(i, a), a.values), o) : (ki(!0, `Complex values '${e}' and '${n}' too different to mix. Ensure all colors are of the same type, and that each contains the same quantity of number and color values. Falling back to instant transition.`, "complex-values-different"), pa(e, n));
};
function bg(e, n, o) {
  return typeof e == "number" && typeof n == "number" && typeof o == "number" ? be(e, n, o) : pd(e)(e, n);
}
const S1 = (e) => {
  const n = ({ timestamp: o }) => e(o);
  return {
    start: (o = !0) => Pe.update(n, o),
    stop: () => Hn(n),
    /**
     * If we're processing this frame we can use the
     * framelocked timestamp to keep things in sync.
     */
    now: () => Ze.isProcessing ? Ze.timestamp : st.now()
  };
}, Eg = (e, n, o = 10) => {
  let i = "";
  const a = Math.max(Math.round(n / o), 2);
  for (let c = 0; c < a; c++)
    i += Math.round(e(c / (a - 1)) * 1e4) / 1e4 + ", ";
  return `linear(${i.substring(0, i.length - 2)})`;
}, ha = 2e4;
function hd(e) {
  let n = 0;
  const o = 50;
  let i = e.next(n);
  for (; !i.done && n < ha; )
    n += o, i = e.next(n);
  return n >= ha ? 1 / 0 : n;
}
function w1(e, n = 100, o) {
  const i = o({ ...e, keyframes: [0, n] }), a = Math.min(hd(i), ha);
  return {
    type: "keyframes",
    ease: (c) => i.next(a * c).value / n,
    duration: /* @__PURE__ */ Mt(a)
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
function mc(e, n) {
  return e * Math.sqrt(1 - n * n);
}
const x1 = 12;
function _1(e, n, o) {
  let i = o;
  for (let a = 1; a < x1; a++)
    i = i - e(i) / n(i);
  return i;
}
const Hu = 1e-3;
function k1({ duration: e = Fe.duration, bounce: n = Fe.bounce, velocity: o = Fe.velocity, mass: i = Fe.mass }) {
  let a, c;
  ki(e <= /* @__PURE__ */ gt(Fe.maxDuration), "Spring duration must be 10 seconds or less", "spring-duration-limit");
  let d = 1 - n;
  d = sn(Fe.minDamping, Fe.maxDamping, d), e = sn(Fe.minDuration, Fe.maxDuration, /* @__PURE__ */ Mt(e)), d < 1 ? (a = (v) => {
    const S = v * d, l = S * e, f = S - o, g = mc(v, d), x = Math.exp(-l);
    return Hu - f / g * x;
  }, c = (v) => {
    const l = v * d * e, f = l * o + o, g = Math.pow(d, 2) * Math.pow(v, 2) * e, x = Math.exp(-l), T = mc(Math.pow(v, 2), d);
    return (-a(v) + Hu > 0 ? -1 : 1) * ((f - g) * x) / T;
  }) : (a = (v) => {
    const S = Math.exp(-v * e), l = (v - o) * e + 1;
    return -Hu + S * l;
  }, c = (v) => {
    const S = Math.exp(-v * e), l = (o - v) * (e * e);
    return S * l;
  });
  const p = 5 / e, y = _1(a, c, p);
  if (e = /* @__PURE__ */ gt(e), isNaN(y))
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
const T1 = ["duration", "bounce"], A1 = ["stiffness", "damping", "mass"];
function pm(e, n) {
  return n.some((o) => e[o] !== void 0);
}
function C1(e) {
  let n = {
    velocity: Fe.velocity,
    stiffness: Fe.stiffness,
    damping: Fe.damping,
    mass: Fe.mass,
    isResolvedFromDuration: !1,
    ...e
  };
  if (!pm(e, A1) && pm(e, T1))
    if (n.velocity = 0, e.visualDuration) {
      const o = e.visualDuration, i = 2 * Math.PI / (o * 1.2), a = i * i, c = 2 * sn(0.05, 1, 1 - (e.bounce || 0)) * Math.sqrt(a);
      n = {
        ...n,
        mass: Fe.mass,
        stiffness: a,
        damping: c
      };
    } else {
      const o = k1({ ...e, velocity: 0 });
      n = {
        ...n,
        ...o,
        mass: Fe.mass
      }, n.isResolvedFromDuration = !0;
    }
  return n;
}
function ma(e = Fe.visualDuration, n = Fe.bounce) {
  const o = typeof e != "object" ? {
    visualDuration: e,
    keyframes: [0, 1],
    bounce: n
  } : e;
  let { restSpeed: i, restDelta: a } = o;
  const c = o.keyframes[0], d = o.keyframes[o.keyframes.length - 1], p = { done: !1, value: c }, { stiffness: y, damping: v, mass: S, duration: l, velocity: f, isResolvedFromDuration: g } = C1({
    ...o,
    velocity: -/* @__PURE__ */ Mt(o.velocity || 0)
  }), x = f || 0, T = v / (2 * Math.sqrt(y * S)), _ = d - c, A = /* @__PURE__ */ Mt(Math.sqrt(y / S)), R = Math.abs(_) < 5;
  i || (i = R ? Fe.restSpeed.granular : Fe.restSpeed.default), a || (a = R ? Fe.restDelta.granular : Fe.restDelta.default);
  let P, D, L, X, Z, U;
  if (T < 1)
    L = mc(A, T), X = (x + T * A * _) / L, P = (Q) => {
      const J = Math.exp(-T * A * Q);
      return d - J * (X * Math.sin(L * Q) + _ * Math.cos(L * Q));
    }, Z = T * A * X + _ * L, U = T * A * _ - X * L, D = (Q) => Math.exp(-T * A * Q) * (Z * Math.sin(L * Q) + U * Math.cos(L * Q));
  else if (T === 1) {
    P = (J) => d - Math.exp(-A * J) * (_ + (x + A * _) * J);
    const Q = x + A * _;
    D = (J) => Math.exp(-A * J) * (A * Q * J - x);
  } else {
    const Q = A * Math.sqrt(T * T - 1);
    P = (he) => {
      const Se = Math.exp(-T * A * he), ue = Math.min(Q * he, 300);
      return d - Se * ((x + T * A * _) * Math.sinh(ue) + Q * _ * Math.cosh(ue)) / Q;
    };
    const J = (x + T * A * _) / Q, de = T * A * J - _ * Q, ye = T * A * _ - J * Q;
    D = (he) => {
      const Se = Math.exp(-T * A * he), ue = Math.min(Q * he, 300);
      return Se * (de * Math.sinh(ue) + ye * Math.cosh(ue));
    };
  }
  const G = {
    calculatedDuration: g && l || null,
    velocity: (Q) => /* @__PURE__ */ gt(D(Q)),
    next: (Q) => {
      if (!g && T < 1) {
        const de = Math.exp(-T * A * Q), ye = Math.sin(L * Q), he = Math.cos(L * Q), Se = d - de * (X * ye + _ * he), ue = /* @__PURE__ */ gt(de * (Z * ye + U * he));
        return p.done = Math.abs(ue) <= i && Math.abs(d - Se) <= a, p.value = p.done ? d : Se, p;
      }
      const J = P(Q);
      if (g)
        p.done = Q >= l;
      else {
        const de = /* @__PURE__ */ gt(D(Q));
        p.done = Math.abs(de) <= i && Math.abs(d - J) <= a;
      }
      return p.value = p.done ? d : J, p;
    },
    toString: () => {
      const Q = Math.min(hd(G), ha), J = Eg((de) => G.next(Q * de).value, Q, 30);
      return Q + "ms " + J;
    },
    toTransition: () => {
    }
  };
  return G;
}
ma.applyToOptions = (e) => {
  const n = w1(e, 100, ma);
  return e.ease = n.ease, e.duration = /* @__PURE__ */ gt(n.duration), e.type = "keyframes", e;
};
const b1 = 5;
function Pg(e, n, o) {
  const i = Math.max(n - b1, 0);
  return /* @__PURE__ */ lg(o - e(i), n - i);
}
function yc({ keyframes: e, velocity: n = 0, power: o = 0.8, timeConstant: i = 325, bounceDamping: a = 10, bounceStiffness: c = 500, modifyTarget: d, min: p, max: y, restDelta: v = 0.5, restSpeed: S }) {
  const l = e[0], f = {
    done: !1,
    value: l
  }, g = (U) => p !== void 0 && U < p || y !== void 0 && U > y, x = (U) => p === void 0 ? y : y === void 0 || Math.abs(p - U) < Math.abs(y - U) ? p : y;
  let T = o * n;
  const _ = l + T, A = d === void 0 ? _ : d(_);
  A !== _ && (T = A - l);
  const R = (U) => -T * Math.exp(-U / i), P = (U) => A + R(U), D = (U) => {
    const G = R(U), Q = P(U);
    f.done = Math.abs(G) <= v, f.value = f.done ? A : Q;
  };
  let L, X;
  const Z = (U) => {
    g(f.value) && (L = U, X = ma({
      keyframes: [f.value, x(f.value)],
      velocity: Pg(P, U, f.value),
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
      return !X && L === void 0 && (G = !0, D(U), Z(U)), L !== void 0 && U >= L ? X.next(U - L) : (!G && D(U), f);
    }
  };
}
function E1(e, n, o) {
  const i = [], a = o || $n.mix || bg, c = e.length - 1;
  for (let d = 0; d < c; d++) {
    let p = a(e[d], e[d + 1]);
    if (n) {
      const y = Array.isArray(n) ? n[d] || Rt : n;
      p = Ti(y, p);
    }
    i.push(p);
  }
  return i;
}
function P1(e, n, { clamp: o = !0, ease: i, mixer: a } = {}) {
  const c = e.length;
  if (vr(c === n.length, "Both input and output ranges must be the same length", "range-length"), c === 1)
    return () => n[0];
  if (c === 2 && n[0] === n[1])
    return () => n[1];
  const d = e[0] === e[1];
  e[0] > e[c - 1] && (e = [...e].reverse(), n = [...n].reverse());
  const p = E1(n, i, a), y = p.length, v = (S) => {
    if (d && S < e[0])
      return n[0];
    let l = 0;
    if (y > 1)
      for (; l < e.length - 2 && !(S < e[l + 1]); l++)
        ;
    const f = /* @__PURE__ */ pi(e[l], e[l + 1], S);
    return p[l](f);
  };
  return o ? (S) => v(sn(e[0], e[c - 1], S)) : v;
}
function M1(e, n) {
  const o = e[e.length - 1];
  for (let i = 1; i <= n; i++) {
    const a = /* @__PURE__ */ pi(0, n, i);
    e.push(be(o, 1, a));
  }
}
function R1(e) {
  const n = [0];
  return M1(n, e.length - 1), n;
}
function N1(e, n) {
  return e.map((o) => o * n);
}
function D1(e, n) {
  return e.map(() => n || gg).splice(0, e.length - 1);
}
function ai({ duration: e = 300, keyframes: n, times: o, ease: i = "easeInOut" }) {
  const a = /* @__PURE__ */ Ux(i) ? i.map(am) : am(i), c = {
    done: !1,
    value: n[0]
  }, d = N1(
    // Only use the provided offsets if they're the correct length
    // TODO Maybe we should warn here if there's a length mismatch
    o && o.length === n.length ? o : R1(n),
    e
  ), p = P1(d, n, {
    ease: Array.isArray(a) ? a : D1(n, a)
  });
  return {
    calculatedDuration: e,
    next: (y) => (c.value = p(y), c.done = y >= e, c)
  };
}
const j1 = (e) => e !== null;
function Ra(e, { repeat: n, repeatType: o = "loop" }, i, a = 1) {
  const c = e.filter(j1), p = a < 0 || n && o !== "loop" && n % 2 === 1 ? 0 : c.length - 1;
  return !p || i === void 0 ? c[p] : i;
}
const I1 = {
  decay: yc,
  inertia: yc,
  tween: ai,
  keyframes: ai,
  spring: ma
};
function Mg(e) {
  typeof e.type == "string" && (e.type = I1[e.type]);
}
class md {
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
const F1 = (e) => e / 100;
class ya extends md {
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
    Mg(n);
    const { type: o = ai, repeat: i = 0, repeatDelay: a = 0, repeatType: c, velocity: d = 0 } = n;
    let { keyframes: p } = n;
    const y = o || ai;
    y !== ai && typeof p[0] != "number" && (this.mixKeyframes = Ti(F1, bg(p[0], p[1])), p = [0, 100]);
    const v = y({ ...n, keyframes: p });
    c === "mirror" && (this.mirroredGenerator = y({
      ...n,
      keyframes: [...p].reverse(),
      velocity: -d
    })), v.calculatedDuration === null && (v.calculatedDuration = hd(v));
    const { calculatedDuration: S } = v;
    this.calculatedDuration = S, this.resolvedDuration = S + a, this.totalDuration = this.resolvedDuration * (i + 1) - a, this.generator = v;
  }
  updateTime(n) {
    const o = Math.round(n - this.startTime) * this.playbackSpeed;
    this.holdTime !== null ? this.currentTime = this.holdTime : this.currentTime = o;
  }
  tick(n, o = !1) {
    const { generator: i, totalDuration: a, mixKeyframes: c, mirroredGenerator: d, resolvedDuration: p, calculatedDuration: y } = this;
    if (this.startTime === null)
      return i.next(0);
    const { delay: v = 0, keyframes: S, repeat: l, repeatType: f, repeatDelay: g, type: x, onUpdate: T, finalKeyframe: _ } = this.options;
    this.speed > 0 ? this.startTime = Math.min(this.startTime, n) : this.speed < 0 && (this.startTime = Math.min(n - a / this.speed, this.startTime)), o ? this.currentTime = n : this.updateTime(n);
    const A = this.currentTime - v * (this.playbackSpeed >= 0 ? 1 : -1), R = this.playbackSpeed >= 0 ? A < 0 : A > a;
    this.currentTime = Math.max(A, 0), this.state === "finished" && this.holdTime === null && (this.currentTime = a);
    let P = this.currentTime, D = i;
    if (l) {
      const U = Math.min(this.currentTime, a) / p;
      let G = Math.floor(U), Q = U % 1;
      !Q && U >= 1 && (Q = 1), Q === 1 && G--, G = Math.min(G, l + 1), !!(G % 2) && (f === "reverse" ? (Q = 1 - Q, g && (Q -= g / p)) : f === "mirror" && (D = d)), P = sn(0, 1, Q) * p;
    }
    let L;
    R ? (this.delayState.value = S[0], L = this.delayState) : L = D.next(P), c && !R && (L.value = c(L.value));
    let { done: X } = L;
    !R && y !== null && (X = this.playbackSpeed >= 0 ? this.currentTime >= a : this.currentTime <= 0);
    const Z = this.holdTime === null && (this.state === "finished" || this.state === "running" && X);
    return Z && x !== yc && (L.value = Ra(S, this.options, _, this.speed)), T && T(L.value), Z && this.finish(), L;
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
    return /* @__PURE__ */ Mt(this.calculatedDuration);
  }
  get iterationDuration() {
    const { delay: n = 0 } = this.options || {};
    return this.duration + /* @__PURE__ */ Mt(n);
  }
  get time() {
    return /* @__PURE__ */ Mt(this.currentTime);
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
    return Pg((i) => this.generator.next(i).value, n, o);
  }
  get speed() {
    return this.playbackSpeed;
  }
  set speed(n) {
    const o = this.playbackSpeed !== n;
    o && this.driver && this.updateTime(st.now()), this.playbackSpeed = n, o && this.driver && (this.time = /* @__PURE__ */ Mt(this.currentTime));
  }
  play() {
    var a, c;
    if (this.isStopped)
      return;
    const { driver: n = S1, startTime: o } = this.options;
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
function O1(e) {
  for (let n = 1; n < e.length; n++)
    e[n] ?? (e[n] = e[n - 1]);
}
const pr = (e) => e * 180 / Math.PI, gc = (e) => {
  const n = pr(Math.atan2(e[1], e[0]));
  return vc(n);
}, L1 = {
  x: 4,
  y: 5,
  translateX: 4,
  translateY: 5,
  scaleX: 0,
  scaleY: 3,
  scale: (e) => (Math.abs(e[0]) + Math.abs(e[3])) / 2,
  rotate: gc,
  rotateZ: gc,
  skewX: (e) => pr(Math.atan(e[1])),
  skewY: (e) => pr(Math.atan(e[2])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[2])) / 2
}, vc = (e) => (e = e % 360, e < 0 && (e += 360), e), hm = gc, mm = (e) => Math.sqrt(e[0] * e[0] + e[1] * e[1]), ym = (e) => Math.sqrt(e[4] * e[4] + e[5] * e[5]), V1 = {
  x: 12,
  y: 13,
  z: 14,
  translateX: 12,
  translateY: 13,
  translateZ: 14,
  scaleX: mm,
  scaleY: ym,
  scale: (e) => (mm(e) + ym(e)) / 2,
  rotateX: (e) => vc(pr(Math.atan2(e[6], e[5]))),
  rotateY: (e) => vc(pr(Math.atan2(-e[2], e[0]))),
  rotateZ: hm,
  rotate: hm,
  skewX: (e) => pr(Math.atan(e[4])),
  skewY: (e) => pr(Math.atan(e[1])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[4])) / 2
};
function Sc(e) {
  return e.includes("scale") ? 1 : 0;
}
function wc(e, n) {
  if (!e || e === "none")
    return Sc(n);
  const o = e.match(/^matrix3d\(([-\d.e\s,]+)\)$/u);
  let i, a;
  if (o)
    i = V1, a = o;
  else {
    const p = e.match(/^matrix\(([-\d.e\s,]+)\)$/u);
    i = L1, a = p;
  }
  if (!a)
    return Sc(n);
  const c = i[n], d = a[1].split(",").map(B1);
  return typeof c == "function" ? c(d) : d[c];
}
const z1 = (e, n) => {
  const { transform: o = "none" } = getComputedStyle(e);
  return wc(o, n);
};
function B1(e) {
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
], uo = /* @__PURE__ */ new Set([...lo, "pathRotation"]), gm = (e) => e === ao || e === re, U1 = /* @__PURE__ */ new Set(["x", "y", "z"]), $1 = lo.filter((e) => !U1.has(e));
function H1(e) {
  const n = [];
  return $1.forEach((o) => {
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
  x: (e, { transform: n }) => wc(n, "x"),
  y: (e, { transform: n }) => wc(n, "y")
};
Un.translateX = Un.x;
Un.translateY = Un.y;
const hr = /* @__PURE__ */ new Set();
let xc = !1, _c = !1, kc = !1;
function Rg() {
  if (_c) {
    const e = Array.from(hr).filter((i) => i.needsMeasurement), n = new Set(e.map((i) => i.element)), o = /* @__PURE__ */ new Map();
    n.forEach((i) => {
      const a = H1(i);
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
  _c = !1, xc = !1, hr.forEach((e) => e.complete(kc)), hr.clear();
}
function Ng() {
  hr.forEach((e) => {
    e.readKeyframes(), e.needsMeasurement && (_c = !0);
  });
}
function W1() {
  kc = !0, Ng(), Rg(), kc = !1;
}
class yd {
  constructor(n, o, i, a, c, d = !1) {
    this.state = "pending", this.isAsync = !1, this.needsMeasurement = !1, this.unresolvedKeyframes = [...n], this.onComplete = o, this.name = i, this.motionValue = a, this.element = c, this.isAsync = d;
  }
  scheduleResolve() {
    this.state = "scheduled", this.isAsync ? (hr.add(this), xc || (xc = !0, Pe.read(Ng), Pe.resolveKeyframes(Rg))) : (this.readKeyframes(), this.complete());
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
    O1(n);
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
const G1 = (e) => e.startsWith("--");
function Dg(e, n, o) {
  G1(n) ? e.style.setProperty(n, o) : e.style[n] = o;
}
const K1 = {};
function jg(e, n) {
  const o = /* @__PURE__ */ ag(e);
  return () => K1[n] ?? o();
}
const Y1 = /* @__PURE__ */ jg(() => window.ScrollTimeline !== void 0, "scrollTimeline"), Ig = /* @__PURE__ */ jg(() => {
  try {
    document.createElement("div").animate({ opacity: 0 }, { easing: "linear(0, 1)" });
  } catch {
    return !1;
  }
  return !0;
}, "linearEasing"), oi = ([e, n, o, i]) => `cubic-bezier(${e}, ${n}, ${o}, ${i})`, vm = {
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
function Fg(e, n) {
  if (e)
    return typeof e == "function" ? Ig() ? Eg(e, n) : "ease-out" : /* @__PURE__ */ vg(e) ? oi(e) : Array.isArray(e) ? e.map((o) => Fg(o, n) || vm.easeOut) : vm[e];
}
function Q1(e, n, o, { delay: i = 0, duration: a = 300, repeat: c = 0, repeatType: d = "loop", ease: p = "easeOut", times: y } = {}, v = void 0) {
  const S = {
    [n]: o
  };
  y && (S.offset = y);
  const l = Fg(p, a);
  Array.isArray(l) && (S.easing = l);
  const f = {
    delay: i,
    duration: a,
    easing: Array.isArray(l) ? "linear" : l,
    fill: "both",
    iterations: c + 1,
    direction: d === "reverse" ? "alternate" : "normal"
  };
  return v && (f.pseudoElement = v), e.animate(S, f);
}
function Og(e) {
  return typeof e == "function" && "applyToOptions" in e;
}
function X1({ type: e, ...n }) {
  return Og(e) && Ig() ? e.applyToOptions(n) : (n.duration ?? (n.duration = 300), n.ease ?? (n.ease = "easeOut"), n);
}
class Lg extends md {
  constructor(n) {
    if (super(), this.finishedTime = null, this.isStopped = !1, this.manualStartTime = null, !n)
      return;
    const { element: o, name: i, keyframes: a, pseudoElement: c, allowFlatten: d = !1, finalKeyframe: p, onComplete: y } = n;
    this.isPseudoElement = !!c, this.allowFlatten = d, this.options = n, vr(typeof n.type != "string", `Mini animate() doesn't support "type" as a string.`, "mini-spring");
    const v = X1(n);
    this.animation = Q1(o, i, a, v, c), v.autoplay === !1 && this.animation.pause(), this.animation.onfinish = () => {
      if (this.finishedTime = this.time, !c) {
        const S = Ra(a, this.options, p, this.speed);
        this.updateMotionValue && this.updateMotionValue(S), Dg(o, i, S), this.animation.cancel();
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
    return /* @__PURE__ */ Mt(Number(n));
  }
  get iterationDuration() {
    const { delay: n = 0 } = this.options || {};
    return this.duration + /* @__PURE__ */ Mt(n);
  }
  get time() {
    return /* @__PURE__ */ Mt(Number(this.animation.currentTime) || 0);
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
    var c;
    return this.allowFlatten && ((c = this.animation.effect) == null || c.updateTiming({ easing: "linear" })), this.animation.onfinish = null, n && Y1() ? (this.animation.timeline = n, o && (this.animation.rangeStart = o), i && (this.animation.rangeEnd = i), Rt) : a(this);
  }
}
const Vg = {
  anticipate: hg,
  backInOut: pg,
  circInOut: yg
};
function Z1(e) {
  return e in Vg;
}
function q1(e) {
  typeof e.ease == "string" && Z1(e.ease) && (e.ease = Vg[e.ease]);
}
const Wu = 10;
class J1 extends Lg {
  constructor(n) {
    q1(n), Mg(n), super(n), n.startTime !== void 0 && n.autoplay !== !1 && (this.startTime = n.startTime), this.options = n;
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
    const p = new ya({
      ...d,
      autoplay: !1
    }), y = Math.max(Wu, st.now() - this.startTime), v = sn(0, Wu, y - Wu), S = p.sample(y).value, { name: l } = this.options;
    c && l && Dg(c, l, S), o.setWithVelocity(p.sample(Math.max(0, y - v)).value, S, v), p.stop();
  }
}
const Sm = (e, n) => n === "zIndex" ? !1 : !!(typeof e == "number" || Array.isArray(e) || typeof e == "string" && // It's animatable if we have a string
($t.test(e) || e === "0") && // And it contains numbers and/or colors
!e.startsWith("url("));
function e_(e) {
  const n = e[0];
  if (e.length === 1)
    return !0;
  for (let o = 0; o < e.length; o++)
    if (e[o] !== n)
      return !0;
}
function t_(e, n, o, i) {
  const a = e[0];
  if (a === null)
    return !1;
  if (n === "display" || n === "visibility")
    return !0;
  const c = e[e.length - 1], d = Sm(a, n), p = Sm(c, n);
  return ki(d === p, `You are trying to animate ${n} from "${a}" to "${c}". "${d ? c : a}" is not an animatable value.`, "value-not-animatable"), !d || !p ? !1 : e_(e) || (o === "spring" || Og(o)) && i;
}
function Tc(e) {
  e.duration = 0, e.type = "keyframes";
}
const zg = /* @__PURE__ */ new Set([
  "opacity",
  "clipPath",
  "filter",
  "transform"
  // TODO: Can be accelerated but currently disabled until https://issues.chromium.org/issues/41491098 is resolved
  // or until we implement support for linear() easing.
  // "background-color"
]), n_ = /^(?:oklch|oklab|lab|lch|color|color-mix|light-dark)\(/;
function r_(e) {
  for (let n = 0; n < e.length; n++)
    if (typeof e[n] == "string" && n_.test(e[n]))
      return !0;
  return !1;
}
const o_ = /* @__PURE__ */ new Set([
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
]), i_ = /* @__PURE__ */ ag(() => Object.hasOwnProperty.call(Element.prototype, "animate"));
function s_(e) {
  var l;
  const { motionValue: n, name: o, repeatDelay: i, repeatType: a, damping: c, type: d, keyframes: p } = e;
  if (!(((l = n == null ? void 0 : n.owner) == null ? void 0 : l.current) instanceof HTMLElement))
    return !1;
  const { onUpdate: v, transformTemplate: S } = n.owner.getProps();
  return i_() && o && /**
   * Force WAAPI for color properties with browser-only color formats
   * (oklch, oklab, lab, lch, etc.) that the JS animation path can't parse.
   */
  (zg.has(o) || o_.has(o) && r_(p)) && (o !== "transform" || !S) && /**
   * If we're outputting values to onUpdate then we can't use WAAPI as there's
   * no way to read the value from WAAPI every frame.
   */
  !v && !i && a !== "mirror" && c !== 0 && d !== "inertia";
}
const a_ = 40;
class l_ extends md {
  constructor({ autoplay: n = !0, delay: o = 0, type: i = "keyframes", repeat: a = 0, repeatDelay: c = 0, repeatType: d = "loop", keyframes: p, name: y, motionValue: v, element: S, ...l }) {
    var x;
    super(), this.stop = () => {
      var T, _;
      this._animation && (this._animation.stop(), (T = this.stopTimeline) == null || T.call(this)), (_ = this.keyframeResolver) == null || _.cancel();
    }, this.createdAt = st.now();
    const f = {
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
    }, g = (S == null ? void 0 : S.KeyframeResolver) || yd;
    this.keyframeResolver = new g(p, (T, _, A) => this.onKeyframesResolved(T, _, f, !A), y, v, S), (x = this.keyframeResolver) == null || x.scheduleResolve();
  }
  onKeyframesResolved(n, o, i, a) {
    var A, R;
    this.keyframeResolver = void 0;
    const { name: c, type: d, velocity: p, delay: y, isHandoff: v, onUpdate: S } = i;
    this.resolvedAt = st.now();
    let l = !0;
    t_(n, c, d, p) || (l = !1, ($n.instantAnimations || !y) && (S == null || S(Ra(n, i, o))), n[0] = n[n.length - 1], Tc(i), i.repeat = 0);
    const g = {
      startTime: a ? this.resolvedAt ? this.resolvedAt - this.createdAt > a_ ? this.resolvedAt : this.createdAt : this.createdAt : void 0,
      finalKeyframe: o,
      ...i,
      keyframes: n
    }, x = l && !v && s_(g), T = (R = (A = g.motionValue) == null ? void 0 : A.owner) == null ? void 0 : R.current;
    let _;
    if (x)
      try {
        _ = new J1({
          ...g,
          element: T
        });
      } catch {
        _ = new ya(g);
      }
    else
      _ = new ya(g);
    _.finished.then(() => {
      this.notifyFinished();
    }).catch(Rt), this.pendingTimeline && (this.stopTimeline = _.attachTimeline(this.pendingTimeline), this.pendingTimeline = void 0), this._animation = _;
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
    return this._animation || ((n = this.keyframeResolver) == null || n.resume(), W1()), this._animation;
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
function Bg(e, n, o, i = 0, a = 1) {
  const c = Array.from(e).sort((v, S) => v.sortNodePosition(S)).indexOf(n), d = e.size, p = (d - 1) * i;
  return typeof o == "function" ? o(c, d) : a === 1 ? c * i : p - c * i;
}
const wm = 30, u_ = (e) => !isNaN(parseFloat(e));
class c_ {
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
    this.current = n, this.updatedAt = st.now(), this.canTrackVelocity === null && n !== void 0 && (this.canTrackVelocity = u_(this.current));
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
    this.events[n] || (this.events[n] = new ad());
    const i = this.events[n].add(o);
    return n === "change" ? () => {
      i(), Pe.read(() => {
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
    if (!this.canTrackVelocity || this.prevFrameValue === void 0 || n - this.updatedAt > wm)
      return 0;
    const o = Math.min(this.updatedAt - this.prevUpdatedAt, wm);
    return /* @__PURE__ */ lg(parseFloat(this.current) - parseFloat(this.prevFrameValue), o);
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
  return new c_(e, n);
}
function Ug(e, n) {
  if (e != null && e.inherit && n) {
    const { inherit: o, ...i } = e;
    return { ...n, ...i };
  }
  return e;
}
function gd(e, n) {
  const o = (e == null ? void 0 : e[n]) ?? (e == null ? void 0 : e.default) ?? e;
  return o !== e ? Ug(o, e) : o;
}
const d_ = {
  type: "spring",
  stiffness: 500,
  damping: 25,
  restSpeed: 10
}, f_ = (e) => ({
  type: "spring",
  stiffness: 550,
  damping: e === 0 ? 2 * Math.sqrt(550) : 30,
  restSpeed: 10
}), p_ = {
  type: "keyframes",
  duration: 0.8
}, h_ = {
  type: "keyframes",
  ease: [0.25, 0.1, 0.35, 1],
  duration: 0.3
}, m_ = (e, { keyframes: n }) => n.length > 2 ? p_ : uo.has(e) ? e.startsWith("scale") ? f_(n[1]) : d_ : h_, y_ = /* @__PURE__ */ new Set([
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
function g_(e) {
  for (const n in e)
    if (!y_.has(n))
      return !0;
  return !1;
}
const vd = (e, n, o, i = {}, a, c) => (d) => {
  const p = gd(i, e) || {}, y = p.delay || i.delay || 0;
  let { elapsed: v = 0 } = i;
  v = v - /* @__PURE__ */ gt(y);
  const S = {
    keyframes: Array.isArray(o) ? o : [null, o],
    ease: "easeOut",
    velocity: n.getVelocity(),
    ...p,
    delay: -v,
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
  g_(p) || Object.assign(S, m_(e, S)), S.duration && (S.duration = /* @__PURE__ */ gt(S.duration)), S.repeatDelay && (S.repeatDelay = /* @__PURE__ */ gt(S.repeatDelay)), S.from !== void 0 && (S.keyframes[0] = S.from);
  let l = !1;
  if ((S.type === !1 || S.duration === 0 && !S.repeatDelay) && (Tc(S), S.delay === 0 && (l = !0)), ($n.instantAnimations || $n.skipAnimations || a != null && a.shouldSkipAnimations || p.skipAnimations) && (l = !0, Tc(S), S.delay = 0), S.allowFlatten = !p.type && !p.ease, l && !c && n.get() !== void 0) {
    const f = Ra(S.keyframes, p);
    if (f !== void 0) {
      Pe.update(() => {
        S.onUpdate(f), S.onComplete();
      });
      return;
    }
  }
  return p.isSync ? new ya(S) : new l_(S);
}, v_ = (
  // eslint-disable-next-line redos-detector/no-unsafe-regex -- false positive, as it can match a lot of words
  /^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u
);
function S_(e) {
  const n = v_.exec(e);
  if (!n)
    return [,];
  const [, o, i, a] = n;
  return [`--${o ?? i}`, a];
}
const w_ = 4;
function $g(e, n, o = 1) {
  vr(o <= w_, `Max CSS variable fallback depth detected in property "${e}". This may indicate a circular fallback dependency.`, "max-css-var-depth");
  const [i, a] = S_(e);
  if (!i)
    return;
  const c = window.getComputedStyle(n).getPropertyValue(i);
  if (c) {
    const d = c.trim();
    return og(d) ? parseFloat(d) : d;
  }
  return cd(a) ? $g(a, n, o + 1) : a;
}
function xm(e) {
  const n = [{}, {}];
  return e == null || e.values.forEach((o, i) => {
    n[0][i] = o.get(), n[1][i] = o.getVelocity();
  }), n;
}
function Sd(e, n, o, i) {
  if (typeof n == "function") {
    const [a, c] = xm(i);
    n = n(o !== void 0 ? o : e.custom, a, c);
  }
  if (typeof n == "string" && (n = e.variants && e.variants[n]), typeof n == "function") {
    const [a, c] = xm(i);
    n = n(o !== void 0 ? o : e.custom, a, c);
  }
  return n;
}
function mr(e, n, o) {
  const i = e.getProps();
  return Sd(i, n, o !== void 0 ? o : i.custom, e);
}
const Hg = /* @__PURE__ */ new Set([
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
  ...lo
]), Ac = (e) => Array.isArray(e);
function x_(e, n, o) {
  e.hasValue(n) ? e.getValue(n).set(o) : e.addValue(n, ro(o));
}
function __(e) {
  return Ac(e) ? e[e.length - 1] || 0 : e;
}
function k_(e, n) {
  const o = mr(e, n);
  let { transitionEnd: i = {}, transition: a = {}, ...c } = o || {};
  c = { ...c, ...i };
  for (const d in c) {
    const p = __(c[d]);
    x_(e, d, p);
  }
}
const qe = (e) => !!(e && e.getVelocity);
function T_(e) {
  return !!(qe(e) && e.add);
}
function Cc(e, n) {
  const o = e.getValue("willChange");
  if (T_(o))
    return o.add(n);
  if (!o && $n.WillChange) {
    const i = new $n.WillChange("auto");
    e.addValue("willChange", i), i.add(n);
  }
}
function wd(e) {
  return e.replace(/([A-Z])/g, (n) => `-${n.toLowerCase()}`);
}
const A_ = "framerAppearId", Wg = "data-" + wd(A_);
function Gg(e) {
  return e.props[Wg];
}
function C_({ protectedKeys: e, needsAnimating: n }, o) {
  const i = e.hasOwnProperty(o) && n[o] !== !0;
  return n[o] = !1, i;
}
function Kg(e, n, { delay: o = 0, transitionOverride: i, type: a } = {}) {
  let { transition: c, transitionEnd: d, ...p } = n;
  const y = e.getDefaultTransition();
  c = c ? Ug(c, y) : y;
  const v = c == null ? void 0 : c.reduceMotion, S = c == null ? void 0 : c.skipAnimations;
  i && (c = i);
  const l = [], f = a && e.animationState && e.animationState.getState()[a], g = c == null ? void 0 : c.path;
  g && g.animateVisualElement(e, p, c, o, l);
  for (const x in p) {
    const T = e.getValue(x, e.latestValues[x] ?? null), _ = p[x];
    if (_ === void 0 || f && C_(f, x))
      continue;
    const A = {
      delay: o,
      ...gd(c || {}, x)
    };
    S && (A.skipAnimations = !0);
    const R = T.get();
    if (R !== void 0 && !T.isAnimating() && !Array.isArray(_) && _ === R && !A.velocity) {
      Pe.update(() => T.set(_));
      continue;
    }
    let P = !1;
    if (window.MotionHandoffAnimation) {
      const X = Gg(e);
      if (X) {
        const Z = window.MotionHandoffAnimation(X, x, Pe);
        Z !== null && (A.startTime = Z, P = !0);
      }
    }
    Cc(e, x);
    const D = v ?? e.shouldReduceMotion;
    T.start(vd(x, T, _, D && Hg.has(x) ? { type: !1 } : A, e, P));
    const L = T.animation;
    L && l.push(L);
  }
  if (d) {
    const x = () => Pe.update(() => {
      d && k_(e, d);
    });
    l.length ? Promise.all(l).then(x) : x();
  }
  return l;
}
function bc(e, n, o = {}) {
  var y;
  const i = mr(e, n, o.type === "exit" ? (y = e.presenceContext) == null ? void 0 : y.custom : void 0);
  let { transition: a = e.getDefaultTransition() || {} } = i || {};
  o.transitionOverride && (a = o.transitionOverride);
  const c = i ? () => Promise.all(Kg(e, i, o)) : () => Promise.resolve(), d = e.variantChildren && e.variantChildren.size ? (v = 0) => {
    const { delayChildren: S = 0, staggerChildren: l, staggerDirection: f } = a;
    return b_(e, n, v, S, l, f, o);
  } : () => Promise.resolve(), { when: p } = a;
  if (p) {
    const [v, S] = p === "beforeChildren" ? [c, d] : [d, c];
    return v().then(() => S());
  } else
    return Promise.all([c(), d(o.delay)]);
}
function b_(e, n, o = 0, i = 0, a = 0, c = 1, d) {
  const p = [];
  for (const y of e.variantChildren)
    y.notify("AnimationStart", n), p.push(bc(y, n, {
      ...d,
      delay: o + (typeof i == "function" ? 0 : i) + Bg(e.variantChildren, y, i, a, c)
    }).then(() => y.notify("AnimationComplete", n)));
  return Promise.all(p);
}
function E_(e, n, o = {}) {
  e.notify("AnimationStart", n);
  let i;
  if (Array.isArray(n)) {
    const a = n.map((c) => bc(e, c, o));
    i = Promise.all(a);
  } else if (typeof n == "string")
    i = bc(e, n, o);
  else {
    const a = typeof n == "function" ? mr(e, n, o.custom) : n;
    i = Promise.all(Kg(e, a, o));
  }
  return i.then(() => {
    e.notify("AnimationComplete", n);
  });
}
const P_ = {
  test: (e) => e === "auto",
  parse: (e) => e
}, Yg = (e) => (n) => n.test(e), Qg = [ao, re, rn, yn, e1, Jx, P_], _m = (e) => Qg.find(Yg(e));
function M_(e) {
  return typeof e == "number" ? e === 0 : e !== null ? e === "none" || e === "0" || sg(e) : !0;
}
const R_ = /* @__PURE__ */ new Set(["brightness", "contrast", "saturate", "opacity"]);
function N_(e) {
  const [n, o] = e.slice(0, -1).split("(");
  if (n === "drop-shadow")
    return e;
  const [i] = o.match(dd) || [];
  if (!i)
    return e;
  const a = o.replace(i, "");
  let c = R_.has(n) ? 1 : 0;
  return i !== o && (c *= 100), n + "(" + c + a + ")";
}
const D_ = /\b([a-z-]*)\(.*?\)/gu, Ec = {
  ...$t,
  getAnimatableNone: (e) => {
    const n = e.match(D_);
    return n ? n.map(N_).join(" ") : e;
  }
}, Pc = {
  ...$t,
  getAnimatableNone: (e) => {
    const n = $t.parse(e);
    return $t.createTransformer(e)(n.map((i) => typeof i == "number" ? 0 : typeof i == "object" ? { ...i, alpha: 1 } : i));
  }
}, km = {
  ...ao,
  transform: Math.round
}, j_ = {
  rotate: yn,
  /**
   * Internal channel for `transition.path` orientToPath. Composed onto
   * `rotate` at the transform-build sites so the user's `rotate` is
   * never read or overwritten. Not part of `transformPropOrder`.
   */
  pathRotation: yn,
  rotateX: yn,
  rotateY: yn,
  rotateZ: yn,
  scale: Bs,
  scaleX: Bs,
  scaleY: Bs,
  scaleZ: Bs,
  skew: yn,
  skewX: yn,
  skewY: yn,
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
  originX: um,
  originY: um,
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
  ...j_,
  zIndex: km,
  // SVG
  fillOpacity: hi,
  strokeOpacity: hi,
  numOctaves: km
}, I_ = {
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
  filter: Ec,
  WebkitFilter: Ec,
  mask: Pc,
  WebkitMask: Pc
}, Xg = (e) => I_[e], F_ = /* @__PURE__ */ new Set([Ec, Pc]);
function Zg(e, n) {
  let o = Xg(e);
  return F_.has(o) || (o = $t), o.getAnimatableNone ? o.getAnimatableNone(n) : void 0;
}
const O_ = /* @__PURE__ */ new Set(["auto", "none", "0"]);
function L_(e, n, o) {
  let i = 0, a;
  for (; i < e.length && !a; ) {
    const c = e[i];
    typeof c == "string" && !O_.has(c) && no(c).values.length && (a = e[i]), i++;
  }
  if (a && o)
    for (const c of n)
      e[c] = Zg(o, a);
}
class V_ extends yd {
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
      if (typeof l == "string" && (l = l.trim(), cd(l))) {
        const f = $g(l, o.current);
        f !== void 0 && (n[S] = f), S === n.length - 1 && (this.finalKeyframe = l);
      }
    }
    if (this.resolveNoneKeyframes(), !Hg.has(i) || n.length !== 2)
      return;
    const [a, c] = n, d = _m(a), p = _m(c), y = lm(a), v = lm(c);
    if (y !== v && Un[i]) {
      this.needsMeasurement = !0;
      return;
    }
    if (d !== p)
      if (gm(d) && gm(p))
        for (let S = 0; S < n.length; S++) {
          const l = n[S];
          typeof l == "string" && (n[S] = parseFloat(l));
        }
      else Un[i] && (this.needsMeasurement = !0);
  }
  resolveNoneKeyframes() {
    const { unresolvedKeyframes: n, name: o } = this, i = [];
    for (let a = 0; a < n.length; a++)
      (n[a] === null || M_(n[a])) && i.push(a);
    i.length && L_(n, i, o);
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
    i[c] = Un[o](n.measureViewportBox(), window.getComputedStyle(n.current)), d !== null && this.finalKeyframe === void 0 && (this.finalKeyframe = d), (p = this.removedTransforms) != null && p.length && this.removedTransforms.forEach(([y, v]) => {
      n.getValue(y).set(v);
    }), this.resolveNoneKeyframes();
  }
}
const xd = [
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomRightRadius",
  "borderBottomLeftRadius"
];
function qg(e, n, o) {
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
const Mc = (e, n) => n && typeof e == "number" ? n.transform(e) : e;
function Js(e) {
  return ig(e) && "offsetHeight" in e && !("ownerSVGElement" in e);
}
const { schedule: _d } = /* @__PURE__ */ Sg(queueMicrotask, !1), zt = {
  x: !1,
  y: !1
};
function Jg() {
  return zt.x || zt.y;
}
function z_(e) {
  return e === "x" || e === "y" ? zt[e] ? null : (zt[e] = !0, () => {
    zt[e] = !1;
  }) : zt.x || zt.y ? null : (zt.x = zt.y = !0, () => {
    zt.x = zt.y = !1;
  });
}
function ev(e, n) {
  const o = qg(e), i = new AbortController(), a = {
    passive: !0,
    ...n,
    signal: i.signal
  };
  return [o, a, () => i.abort()];
}
function B_(e) {
  return !(e.pointerType === "touch" || Jg());
}
function U_(e, n, o = {}) {
  const [i, a, c] = ev(e, o);
  return i.forEach((d) => {
    let p = !1, y = !1, v;
    const S = () => {
      d.removeEventListener("pointerleave", x);
    }, l = (_) => {
      v && (v(_), v = void 0), S();
    }, f = (_) => {
      p = !1, window.removeEventListener("pointerup", f), window.removeEventListener("pointercancel", f), y && (y = !1, l(_));
    }, g = () => {
      p = !0, window.addEventListener("pointerup", f, a), window.addEventListener("pointercancel", f, a);
    }, x = (_) => {
      if (_.pointerType !== "touch") {
        if (p) {
          y = !0;
          return;
        }
        l(_);
      }
    }, T = (_) => {
      if (!B_(_))
        return;
      y = !1;
      const A = n(d, _);
      typeof A == "function" && (v = A, d.addEventListener("pointerleave", x, a));
    };
    d.addEventListener("pointerenter", T, a), d.addEventListener("pointerdown", g, a);
  }), c;
}
const tv = (e, n) => n ? e === n ? !0 : tv(e, n.parentElement) : !1, kd = (e) => e.pointerType === "mouse" ? typeof e.button != "number" || e.button <= 0 : e.isPrimary !== !1, $_ = /* @__PURE__ */ new Set([
  "BUTTON",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "A"
]);
function H_(e) {
  return $_.has(e.tagName) || e.isContentEditable === !0;
}
const W_ = /* @__PURE__ */ new Set(["INPUT", "SELECT", "TEXTAREA"]);
function G_(e) {
  return W_.has(e.tagName) || e.isContentEditable === !0;
}
const ea = /* @__PURE__ */ new WeakSet();
function Tm(e) {
  return (n) => {
    n.key === "Enter" && e(n);
  };
}
function Gu(e, n) {
  e.dispatchEvent(new PointerEvent("pointer" + n, { isPrimary: !0, bubbles: !0 }));
}
const K_ = (e, n) => {
  const o = e.currentTarget;
  if (!o)
    return;
  const i = Tm(() => {
    if (ea.has(o))
      return;
    Gu(o, "down");
    const a = Tm(() => {
      Gu(o, "up");
    }), c = () => Gu(o, "cancel");
    o.addEventListener("keyup", a, n), o.addEventListener("blur", c, n);
  });
  o.addEventListener("keydown", i, n), o.addEventListener("blur", () => o.removeEventListener("keydown", i), n);
};
function Am(e) {
  return kd(e) && !Jg();
}
const Cm = /* @__PURE__ */ new WeakSet();
function Y_(e, n, o = {}) {
  const [i, a, c] = ev(e, o), d = (p) => {
    const y = p.currentTarget;
    if (!Am(p) || Cm.has(p))
      return;
    ea.add(y), o.stopPropagation && Cm.add(p);
    const v = n(y, p), S = { ...a, capture: !0 }, l = (x, T) => {
      window.removeEventListener("pointerup", f, S), window.removeEventListener("pointercancel", g, S), ea.has(y) && ea.delete(y), Am(x) && typeof v == "function" && v(x, { success: T });
    }, f = (x) => {
      l(x, y === window || y === document || o.useGlobalTarget || tv(y, x.target));
    }, g = (x) => {
      l(x, !1);
    };
    window.addEventListener("pointerup", f, S), window.addEventListener("pointercancel", g, S);
  };
  return i.forEach((p) => {
    (o.useGlobalTarget ? window : p).addEventListener("pointerdown", d, a), Js(p) && (p.addEventListener("focus", (v) => K_(v, a)), !H_(p) && !p.hasAttribute("tabindex") && (p.tabIndex = 0));
  }), c;
}
function Td(e) {
  return ig(e) && "ownerSVGElement" in e;
}
const ta = /* @__PURE__ */ new WeakMap();
let On;
const nv = (e, n, o) => (i, a) => a && a[0] ? a[0][e + "Size"] : Td(i) && "getBBox" in i ? i.getBBox()[n] : i[o], Q_ = /* @__PURE__ */ nv("inline", "width", "offsetWidth"), X_ = /* @__PURE__ */ nv("block", "height", "offsetHeight");
function Z_({ target: e, borderBoxSize: n }) {
  var o;
  (o = ta.get(e)) == null || o.forEach((i) => {
    i(e, {
      get width() {
        return Q_(e, n);
      },
      get height() {
        return X_(e, n);
      }
    });
  });
}
function q_(e) {
  e.forEach(Z_);
}
function J_() {
  typeof ResizeObserver > "u" || (On = new ResizeObserver(q_));
}
function ek(e, n) {
  On || J_();
  const o = qg(e);
  return o.forEach((i) => {
    let a = ta.get(i);
    a || (a = /* @__PURE__ */ new Set(), ta.set(i, a)), a.add(n), On == null || On.observe(i);
  }), () => {
    o.forEach((i) => {
      const a = ta.get(i);
      a == null || a.delete(n), a != null && a.size || On == null || On.unobserve(i);
    });
  };
}
const na = /* @__PURE__ */ new Set();
let Xr;
function tk() {
  Xr = () => {
    const e = {
      get width() {
        return window.innerWidth;
      },
      get height() {
        return window.innerHeight;
      }
    };
    na.forEach((n) => n(e));
  }, window.addEventListener("resize", Xr);
}
function nk(e) {
  return na.add(e), Xr || tk(), () => {
    na.delete(e), !na.size && typeof Xr == "function" && (window.removeEventListener("resize", Xr), Xr = void 0);
  };
}
function bm(e, n) {
  return typeof e == "function" ? nk(e) : ek(e, n);
}
function rk(e) {
  return Td(e) && e.tagName === "svg";
}
const ok = [...Qg, Be, $t], ik = (e) => ok.find(Yg(e)), Em = () => ({
  translate: 0,
  scale: 1,
  origin: 0,
  originPoint: 0
}), Zr = () => ({
  x: Em(),
  y: Em()
}), Pm = () => ({ min: 0, max: 0 }), He = () => ({
  x: Pm(),
  y: Pm()
}), sk = /* @__PURE__ */ new WeakMap();
function Na(e) {
  return e !== null && typeof e == "object" && typeof e.start == "function";
}
function mi(e) {
  return typeof e == "string" || Array.isArray(e);
}
const Ad = [
  "animate",
  "whileInView",
  "whileFocus",
  "whileHover",
  "whileTap",
  "whileDrag",
  "exit"
], Cd = ["initial", ...Ad];
function Da(e) {
  return Na(e.animate) || Cd.some((n) => mi(e[n]));
}
function rv(e) {
  return !!(Da(e) || e.variants);
}
function ak(e, n, o) {
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
const Rc = { current: null }, ov = { current: !1 }, lk = typeof window < "u";
function uk() {
  if (ov.current = !0, !!lk)
    if (window.matchMedia) {
      const e = window.matchMedia("(prefers-reduced-motion)"), n = () => Rc.current = e.matches;
      e.addEventListener("change", n), n();
    } else
      Rc.current = !1;
}
const Mm = [
  "AnimationStart",
  "AnimationComplete",
  "Update",
  "BeforeLayoutMeasure",
  "LayoutMeasure",
  "LayoutAnimationStart",
  "LayoutAnimationComplete"
];
let va = {};
function iv(e) {
  va = e;
}
function ck() {
  return va;
}
class dk {
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
    this.current = null, this.children = /* @__PURE__ */ new Set(), this.isVariantNode = !1, this.isControllingVariants = !1, this.shouldReduceMotion = null, this.shouldSkipAnimations = !1, this.values = /* @__PURE__ */ new Map(), this.KeyframeResolver = yd, this.features = {}, this.valueSubscriptions = /* @__PURE__ */ new Map(), this.prevMotionValues = {}, this.hasBeenMounted = !1, this.events = {}, this.propEventSubscriptions = {}, this.notifyUpdate = () => this.notify("Update", this.latestValues), this.render = () => {
      this.current && (this.triggerBuild(), this.renderInstance(this.current, this.renderState, this.props.style, this.projection));
    }, this.renderScheduledAt = 0, this.scheduleRender = () => {
      const g = st.now();
      this.renderScheduledAt < g && (this.renderScheduledAt = g, Pe.render(this.render, !1, !0));
    };
    const { latestValues: v, renderState: S } = p;
    this.latestValues = v, this.baseTarget = { ...v }, this.initialValues = o.initial ? { ...v } : {}, this.renderState = S, this.parent = n, this.props = o, this.presenceContext = i, this.depth = n ? n.depth + 1 : 0, this.reducedMotionConfig = a, this.skipAnimationsConfig = c, this.options = y, this.blockInitialAnimation = !!d, this.isControllingVariants = Da(o), this.isVariantNode = rv(o), this.isVariantNode && (this.variantChildren = /* @__PURE__ */ new Set()), this.manuallyAnimateOnMount = !!(n && n.current);
    const { willChange: l, ...f } = this.scrapeMotionValuesFromProps(o, {}, this);
    for (const g in f) {
      const x = f[g];
      v[g] !== void 0 && qe(x) && x.set(v[g]);
    }
  }
  mount(n) {
    var o, i;
    if (this.hasBeenMounted)
      for (const a in this.initialValues)
        (o = this.values.get(a)) == null || o.jump(this.initialValues[a]), this.latestValues[a] = this.initialValues[a];
    this.current = n, sk.set(n, this), this.projection && !this.projection.instance && this.projection.mount(n), this.parent && this.isVariantNode && !this.isControllingVariants && (this.removeFromVariantTree = this.parent.addVariantChild(this)), this.values.forEach((a, c) => this.bindToMotionValue(c, a)), this.reducedMotionConfig === "never" ? this.shouldReduceMotion = !1 : this.reducedMotionConfig === "always" ? this.shouldReduceMotion = !0 : (ov.current || uk(), this.shouldReduceMotion = Rc.current), this.shouldSkipAnimations = this.skipAnimationsConfig ?? !1, (i = this.parent) == null || i.addChild(this), this.update(this.props, this.presenceContext), this.hasBeenMounted = !0;
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
    if (this.valueSubscriptions.has(n) && this.valueSubscriptions.get(n)(), o.accelerate && zg.has(n) && this.current instanceof HTMLElement) {
      const { factory: d, keyframes: p, times: y, ease: v, duration: S } = o.accelerate, l = new Lg({
        element: this.current,
        name: n,
        keyframes: p,
        times: y,
        ease: v,
        duration: /* @__PURE__ */ gt(S)
      }), f = d(l);
      this.valueSubscriptions.set(n, () => {
        f(), l.cancel();
      });
      return;
    }
    const i = uo.has(n);
    i && this.onBindTransform && this.onBindTransform();
    const a = o.on("change", (d) => {
      this.latestValues[n] = d, this.props.onUpdate && Pe.preRender(this.notifyUpdate), i && this.projection && (this.projection.isTransformDirty = !0), this.scheduleRender();
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
    for (n in va) {
      const o = va[n];
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
    for (let i = 0; i < Mm.length; i++) {
      const a = Mm[i];
      this.propEventSubscriptions[a] && (this.propEventSubscriptions[a](), delete this.propEventSubscriptions[a]);
      const c = "on" + a, d = n[c];
      d && (this.propEventSubscriptions[a] = this.on(a, d));
    }
    this.prevMotionValues = ak(this, this.scrapeMotionValuesFromProps(n, this.prevProps || {}, this), this.prevMotionValues), this.handleChildMotionValue && this.handleChildMotionValue();
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
    return i != null && (typeof i == "string" && (og(i) || sg(i)) ? i = parseFloat(i) : !ik(i) && $t.test(o) && (i = Zg(n, o)), this.setBaseTarget(n, qe(i) ? i.get() : i)), qe(i) ? i.get() : i;
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
      const d = Sd(this.props, o, (c = this.presenceContext) == null ? void 0 : c.custom);
      d && (i = d[n]);
    }
    if (o && i !== void 0)
      return i;
    const a = this.getBaseTargetFromProps(this.props, n);
    return a !== void 0 && !qe(a) ? a : this.initialValues[n] !== void 0 && i === void 0 ? void 0 : this.baseTarget[n];
  }
  on(n, o) {
    return this.events[n] || (this.events[n] = new ad()), this.events[n].add(o);
  }
  notify(n, ...o) {
    this.events[n] && this.events[n].notify(...o);
  }
  scheduleRenderMicrotask() {
    _d.render(this.render);
  }
}
class sv extends dk {
  constructor() {
    super(...arguments), this.KeyframeResolver = V_;
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
class Kn {
  constructor(n) {
    this.isMounted = !1, this.node = n;
  }
  update() {
  }
}
function av({ top: e, left: n, right: o, bottom: i }) {
  return {
    x: { min: n, max: o },
    y: { min: e, max: i }
  };
}
function fk({ x: e, y: n }) {
  return { top: n.min, right: e.max, bottom: n.max, left: e.min };
}
function pk(e, n) {
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
function Ku(e) {
  return e === void 0 || e === 1;
}
function Nc({ scale: e, scaleX: n, scaleY: o }) {
  return !Ku(e) || !Ku(n) || !Ku(o);
}
function ur(e) {
  return Nc(e) || lv(e) || e.z || e.rotate || e.rotateX || e.rotateY || e.skewX || e.skewY;
}
function lv(e) {
  return Rm(e.x) || Rm(e.y);
}
function Rm(e) {
  return e && e !== "0%";
}
function Sa(e, n, o) {
  const i = e - o, a = n * i;
  return o + a;
}
function Nm(e, n, o, i, a) {
  return a !== void 0 && (e = Sa(e, a, i)), Sa(e, o, i) + n;
}
function Dc(e, n = 0, o = 1, i, a) {
  e.min = Nm(e.min, n, o, i, a), e.max = Nm(e.max, n, o, i, a);
}
function uv(e, { x: n, y: o }) {
  Dc(e.x, n.translate, n.scale, n.originPoint), Dc(e.y, o.translate, o.scale, o.originPoint);
}
const Dm = 0.999999999999, jm = 1.0000000000001;
function hk(e, n, o, i = !1) {
  var p;
  const a = o.length;
  if (!a)
    return;
  n.x = n.y = 1;
  let c, d;
  for (let y = 0; y < a; y++) {
    c = o[y], d = c.projectionDelta;
    const { visualElement: v } = c.options;
    v && v.props.style && v.props.style.display === "contents" || (i && c.options.layoutScroll && c.scroll && c !== c.root && (tn(e.x, -c.scroll.offset.x), tn(e.y, -c.scroll.offset.y)), d && (n.x *= d.x.scale, n.y *= d.y.scale, uv(e, d)), i && ur(c.latestValues) && ra(e, c.latestValues, (p = c.layout) == null ? void 0 : p.layoutBox));
  }
  n.x < jm && n.x > Dm && (n.x = 1), n.y < jm && n.y > Dm && (n.y = 1);
}
function tn(e, n) {
  e.min += n, e.max += n;
}
function Im(e, n, o, i, a = 0.5) {
  const c = be(e.min, e.max, a);
  Dc(e, n, o, c, i);
}
function Fm(e, n) {
  return typeof e == "string" ? parseFloat(e) / 100 * (n.max - n.min) : e;
}
function ra(e, n, o) {
  const i = o ?? e;
  Im(e.x, Fm(n.x, i.x), n.scaleX, n.scale, n.originX), Im(e.y, Fm(n.y, i.y), n.scaleY, n.scale, n.originY);
}
function cv(e, n) {
  return av(pk(e.getBoundingClientRect(), n));
}
function mk(e, n, o) {
  const i = cv(e, o), { scroll: a } = n;
  return a && (tn(i.x, a.offset.x), tn(i.y, a.offset.y)), i;
}
const yk = {
  x: "translateX",
  y: "translateY",
  z: "translateZ",
  transformPerspective: "perspective"
}, gk = lo.length;
function vk(e, n, o) {
  let i = "", a = !0;
  for (let d = 0; d < gk; d++) {
    const p = lo[d], y = e[p];
    if (y === void 0)
      continue;
    let v = !0;
    if (typeof y == "number")
      v = y === (p.startsWith("scale") ? 1 : 0);
    else {
      const S = parseFloat(y);
      v = p.startsWith("scale") ? S === 1 : S === 0;
    }
    if (!v || o) {
      const S = Mc(y, ga[p]);
      if (!v) {
        a = !1;
        const l = yk[p] || p;
        i += `${l}(${S}) `;
      }
      o && (n[p] = S);
    }
  }
  const c = e.pathRotation;
  return c && (a = !1, i += `rotate(${Mc(c, ga.pathRotation)}) `), i = i.trim(), o ? i = o(n, a ? "" : i) : a && (i = "none"), i;
}
function bd(e, n, o) {
  const { style: i, vars: a, transformOrigin: c } = e;
  let d = !1, p = !1;
  for (const y in n) {
    const v = n[y];
    if (uo.has(y)) {
      d = !0;
      continue;
    } else if (xg(y)) {
      a[y] = v;
      continue;
    } else {
      const S = Mc(v, ga[y]);
      y.startsWith("origin") ? (p = !0, c[y] = S) : i[y] = S;
    }
  }
  if (n.transform || (d || o ? i.transform = vk(n, e.transform, o) : i.transform && (i.transform = "none")), p) {
    const { originX: y = "50%", originY: v = "50%", originZ: S = 0 } = c;
    i.transformOrigin = `${y} ${v} ${S}`;
  }
}
function dv(e, { style: n, vars: o }, i, a) {
  const c = e.style;
  let d;
  for (d in n)
    c[d] = n[d];
  a == null || a.applyProjectionStyles(c, i);
  for (d in o)
    c.setProperty(d, o[d]);
}
function Om(e, n) {
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
    const o = Om(e, n.target.x), i = Om(e, n.target.y);
    return `${o}% ${i}%`;
  }
}, Sk = {
  correct: (e, { treeScale: n, projectionDelta: o }) => {
    const i = e, a = $t.parse(e);
    if (a.length > 5)
      return i;
    const c = $t.createTransformer(e), d = typeof a[0] != "number" ? 1 : 0, p = o.x.scale * n.x, y = o.y.scale * n.y;
    a[0 + d] /= p, a[1 + d] /= y;
    const v = be(p, y, 0.5);
    return typeof a[2 + d] == "number" && (a[2 + d] /= v), typeof a[3 + d] == "number" && (a[3 + d] /= v), c(a);
  }
}, jc = {
  borderRadius: {
    ...ei,
    applyTo: [...xd]
  },
  borderTopLeftRadius: ei,
  borderTopRightRadius: ei,
  borderBottomLeftRadius: ei,
  borderBottomRightRadius: ei,
  boxShadow: Sk
};
function fv(e, { layout: n, layoutId: o }) {
  return uo.has(e) || e.startsWith("origin") || (n || o !== void 0) && (!!jc[e] || e === "opacity");
}
function Ed(e, n, o) {
  var d;
  const i = e.style, a = n == null ? void 0 : n.style, c = {};
  if (!i)
    return c;
  for (const p in i)
    (qe(i[p]) || a && qe(a[p]) || fv(p, e) || ((d = o == null ? void 0 : o.getValue(p)) == null ? void 0 : d.liveStyle) !== void 0) && (c[p] = i[p]);
  return c;
}
function wk(e) {
  return window.getComputedStyle(e);
}
class xk extends sv {
  constructor() {
    super(...arguments), this.type = "html", this.renderInstance = dv;
  }
  readValueFromInstance(n, o) {
    var i;
    if (uo.has(o))
      return (i = this.projection) != null && i.isProjecting ? Sc(o) : z1(n, o);
    {
      const a = wk(n), c = (xg(o) ? a.getPropertyValue(o) : a[o]) || 0;
      return typeof c == "string" ? c.trim() : c;
    }
  }
  measureInstanceViewportBox(n, { transformPagePoint: o }) {
    return cv(n, o);
  }
  build(n, o, i) {
    bd(n, o, i.transformTemplate);
  }
  scrapeMotionValuesFromProps(n, o, i) {
    return Ed(n, o, i);
  }
}
const _k = {
  offset: "stroke-dashoffset",
  array: "stroke-dasharray"
}, kk = {
  offset: "strokeDashoffset",
  array: "strokeDasharray"
};
function Tk(e, n, o = 1, i = 0, a = !0) {
  e.pathLength = 1;
  const c = a ? _k : kk;
  e[c.offset] = `${-i}`, e[c.array] = `${n} ${o}`;
}
const Ak = [
  "offsetDistance",
  "offsetPath",
  "offsetRotate",
  "offsetAnchor"
];
function pv(e, {
  attrX: n,
  attrY: o,
  attrScale: i,
  pathLength: a,
  pathSpacing: c = 1,
  pathOffset: d = 0,
  // This is object creation, which we try to avoid per-frame.
  ...p
}, y, v, S) {
  if (bd(e, p, v), y) {
    e.style.viewBox && (e.attrs.viewBox = e.style.viewBox);
    return;
  }
  e.attrs = e.style, e.style = {};
  const { attrs: l, style: f } = e;
  l.transform && (f.transform = l.transform, delete l.transform), (f.transform || l.transformOrigin) && (f.transformOrigin = l.transformOrigin ?? "50% 50%", delete l.transformOrigin), f.transform && (f.transformBox = (S == null ? void 0 : S.transformBox) ?? "fill-box", delete l.transformBox);
  for (const g of Ak)
    l[g] !== void 0 && (f[g] = l[g], delete l[g]);
  n !== void 0 && (l.x = n), o !== void 0 && (l.y = o), i !== void 0 && (l.scale = i), a !== void 0 && Tk(l, a, c, d, !1);
}
const hv = /* @__PURE__ */ new Set([
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
]), mv = (e) => typeof e == "string" && e.toLowerCase() === "svg";
function Ck(e, n, o, i) {
  dv(e, n, void 0, i);
  for (const a in n.attrs)
    e.setAttribute(hv.has(a) ? a : wd(a), n.attrs[a]);
}
function yv(e, n, o) {
  const i = Ed(e, n, o);
  for (const a in e)
    if (qe(e[a]) || qe(n[a])) {
      const c = lo.indexOf(a) !== -1 ? "attr" + a.charAt(0).toUpperCase() + a.substring(1) : a;
      i[c] = e[a];
    }
  return i;
}
class bk extends sv {
  constructor() {
    super(...arguments), this.type = "svg", this.isSVGTag = !1, this.measureInstanceViewportBox = He;
  }
  getBaseTargetFromProps(n, o) {
    return n[o];
  }
  readValueFromInstance(n, o) {
    if (uo.has(o)) {
      const i = Xg(o);
      return i && i.default || 0;
    }
    return o = hv.has(o) ? o : wd(o), n.getAttribute(o);
  }
  scrapeMotionValuesFromProps(n, o, i) {
    return yv(n, o, i);
  }
  build(n, o, i) {
    pv(n, o, this.isSVGTag, i.transformTemplate, i.style);
  }
  renderInstance(n, o, i, a) {
    Ck(n, o, i, a);
  }
  mount(n) {
    this.isSVGTag = mv(n.tagName), super.mount(n);
  }
}
const Ek = Cd.length;
function gv(e) {
  if (!e)
    return;
  if (!e.isControllingVariants) {
    const o = e.parent ? gv(e.parent) || {} : {};
    return e.props.initial !== void 0 && (o.initial = e.props.initial), o;
  }
  const n = {};
  for (let o = 0; o < Ek; o++) {
    const i = Cd[o], a = e.props[i];
    (mi(a) || a === !1) && (n[i] = a);
  }
  return n;
}
function vv(e, n) {
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
const Pk = [...Ad].reverse(), Mk = Ad.length;
function Rk(e) {
  return (n) => Promise.all(n.map(({ animation: o, options: i }) => E_(e, o, i)));
}
function Nk(e) {
  let n = Rk(e), o = Lm(), i = !0, a = !1;
  const c = (v) => (S, l) => {
    var g;
    const f = mr(e, l, v === "exit" ? (g = e.presenceContext) == null ? void 0 : g.custom : void 0);
    if (f) {
      const { transition: x, transitionEnd: T, ..._ } = f;
      S = { ...S, ..._, ...T };
    }
    return S;
  };
  function d(v) {
    n = v(e);
  }
  function p(v) {
    const { props: S } = e, l = gv(e.parent) || {}, f = [], g = /* @__PURE__ */ new Set();
    let x = {}, T = 1 / 0;
    for (let A = 0; A < Mk; A++) {
      const R = Pk[A], P = o[R], D = S[R] !== void 0 ? S[R] : l[R], L = mi(D), X = R === v ? P.isActive : null;
      X === !1 && (T = A);
      let Z = D === l[R] && D !== S[R] && L;
      if (Z && (i || a) && e.manuallyAnimateOnMount && (Z = !1), P.protectedKeys = { ...x }, // If it isn't active and hasn't *just* been set as inactive
      !P.isActive && X === null || // If we didn't and don't have any defined prop for this animation type
      !D && !P.prevProp || // Or if the prop doesn't define an animation
      Na(D) || typeof D == "boolean")
        continue;
      if (R === "exit" && P.isActive && X !== !0) {
        P.prevResolvedValues && (x = {
          ...x,
          ...P.prevResolvedValues
        });
        continue;
      }
      const U = Dk(P.prevProp, D);
      let G = U || // If we're making this variant active, we want to always make it active
      R === v && P.isActive && !Z && L || // If we removed a higher-priority variant (i is in reverse order)
      A > T && L, Q = !1;
      const J = Array.isArray(D) ? D : [D];
      let de = J.reduce(c(R), {});
      X === !1 && (de = {});
      const { prevResolvedValues: ye = {} } = P, he = {
        ...ye,
        ...de
      }, Se = (V) => {
        G = !0, g.has(V) && (Q = !0, g.delete(V)), P.needsAnimating[V] = !0;
        const q = e.getValue(V);
        q && (q.liveStyle = !1);
      };
      for (const V in he) {
        const q = de[V], K = ye[V];
        if (x.hasOwnProperty(V))
          continue;
        let b = !1;
        Ac(q) && Ac(K) ? b = !vv(q, K) || U : b = q !== K, b ? q != null ? Se(V) : g.add(V) : q !== void 0 && g.has(V) ? Se(V) : P.protectedKeys[V] = !0;
      }
      P.prevProp = D, P.prevResolvedValues = de, P.isActive && (x = { ...x, ...de }), (i || a) && e.blockInitialAnimation && (G = !1);
      const ue = Z && U;
      G && (!ue || Q) && f.push(...J.map((V) => {
        const q = { type: R };
        if (typeof V == "string" && (i || a) && !ue && e.manuallyAnimateOnMount && e.parent) {
          const { parent: K } = e, b = mr(K, V);
          if (K.enteringChildren && b) {
            const { delayChildren: O } = b.transition || {};
            q.delay = Bg(K.enteringChildren, e, O);
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
        const P = e.getBaseTarget(R), D = e.getValue(R);
        D && (D.liveStyle = !0), A[R] = P ?? null;
      }), f.push({ animation: A });
    }
    let _ = !!f.length;
    return i && (S.initial === !1 || S.initial === S.animate) && !e.manuallyAnimateOnMount && (_ = !1), i = !1, a = !1, _ ? n(f) : Promise.resolve();
  }
  function y(v, S) {
    var f;
    if (o[v].isActive === S)
      return Promise.resolve();
    (f = e.variantChildren) == null || f.forEach((g) => {
      var x;
      return (x = g.animationState) == null ? void 0 : x.setActive(v, S);
    }), o[v].isActive = S;
    const l = p(v);
    for (const g in o)
      o[g].protectedKeys = {};
    return l;
  }
  return {
    animateChanges: p,
    setActive: y,
    setAnimateFunction: d,
    getState: () => o,
    reset: () => {
      o = Lm(), a = !0;
    }
  };
}
function Dk(e, n) {
  return typeof n == "string" ? n !== e : Array.isArray(n) ? !vv(n, e) : !1;
}
function lr(e = !1) {
  return {
    isActive: e,
    protectedKeys: {},
    needsAnimating: {},
    prevResolvedValues: {}
  };
}
function Lm() {
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
function Ic(e, n) {
  e.min = n.min, e.max = n.max;
}
function Vt(e, n) {
  Ic(e.x, n.x), Ic(e.y, n.y);
}
function Vm(e, n) {
  e.translate = n.translate, e.scale = n.scale, e.originPoint = n.originPoint, e.origin = n.origin;
}
const Sv = 1e-4, jk = 1 - Sv, Ik = 1 + Sv, wv = 0.01, Fk = 0 - wv, Ok = 0 + wv;
function at(e) {
  return e.max - e.min;
}
function Lk(e, n, o) {
  return Math.abs(e - n) <= o;
}
function zm(e, n, o, i = 0.5) {
  e.origin = i, e.originPoint = be(n.min, n.max, e.origin), e.scale = at(o) / at(n), e.translate = be(o.min, o.max, e.origin) - e.originPoint, (e.scale >= jk && e.scale <= Ik || isNaN(e.scale)) && (e.scale = 1), (e.translate >= Fk && e.translate <= Ok || isNaN(e.translate)) && (e.translate = 0);
}
function li(e, n, o, i) {
  zm(e.x, n.x, o.x, i ? i.originX : void 0), zm(e.y, n.y, o.y, i ? i.originY : void 0);
}
function Bm(e, n, o, i = 0) {
  const a = i ? be(o.min, o.max, i) : o.min;
  e.min = a + n.min, e.max = e.min + at(n);
}
function Vk(e, n, o, i) {
  Bm(e.x, n.x, o.x, i == null ? void 0 : i.x), Bm(e.y, n.y, o.y, i == null ? void 0 : i.y);
}
function Um(e, n, o, i = 0) {
  const a = i ? be(o.min, o.max, i) : o.min;
  e.min = n.min - a, e.max = e.min + at(n);
}
function wa(e, n, o, i) {
  Um(e.x, n.x, o.x, i == null ? void 0 : i.x), Um(e.y, n.y, o.y, i == null ? void 0 : i.y);
}
function $m(e, n, o, i, a) {
  return e -= n, e = Sa(e, 1 / o, i), a !== void 0 && (e = Sa(e, 1 / a, i)), e;
}
function zk(e, n = 0, o = 1, i = 0.5, a, c = e, d = e) {
  if (rn.test(n) && (n = parseFloat(n), n = be(d.min, d.max, n / 100) - d.min), typeof n != "number")
    return;
  let p = be(c.min, c.max, i);
  e === c && (p -= n), e.min = $m(e.min, n, o, p, a), e.max = $m(e.max, n, o, p, a);
}
function Hm(e, n, [o, i, a], c, d) {
  zk(e, n[o], n[i], n[a], n.scale, c, d);
}
const Bk = ["x", "scaleX", "originX"], Uk = ["y", "scaleY", "originY"];
function Wm(e, n, o, i) {
  Hm(e.x, n, Bk, o ? o.x : void 0, i ? i.x : void 0), Hm(e.y, n, Uk, o ? o.y : void 0, i ? i.y : void 0);
}
function Gm(e) {
  return e.translate === 0 && e.scale === 1;
}
function xv(e) {
  return Gm(e.x) && Gm(e.y);
}
function Km(e, n) {
  return e.min === n.min && e.max === n.max;
}
function $k(e, n) {
  return Km(e.x, n.x) && Km(e.y, n.y);
}
function Ym(e, n) {
  return Math.round(e.min) === Math.round(n.min) && Math.round(e.max) === Math.round(n.max);
}
function _v(e, n) {
  return Ym(e.x, n.x) && Ym(e.y, n.y);
}
function Qm(e) {
  return at(e.x) / at(e.y);
}
function Xm(e, n) {
  return e.translate === n.translate && e.scale === n.scale && e.originPoint === n.originPoint;
}
function en(e) {
  return [e("x"), e("y")];
}
function Hk(e, n, o) {
  let i = "";
  const a = e.x.translate / n.x, c = e.y.translate / n.y, d = (o == null ? void 0 : o.z) || 0;
  if ((a || c || d) && (i = `translate3d(${a}px, ${c}px, ${d}px) `), (n.x !== 1 || n.y !== 1) && (i += `scale(${1 / n.x}, ${1 / n.y}) `), o) {
    const { transformPerspective: v, rotate: S, pathRotation: l, rotateX: f, rotateY: g, skewX: x, skewY: T } = o;
    v && (i = `perspective(${v}px) ${i}`), S && (i += `rotate(${S}deg) `), l && (i += `rotate(${l}deg) `), f && (i += `rotateX(${f}deg) `), g && (i += `rotateY(${g}deg) `), x && (i += `skewX(${x}deg) `), T && (i += `skewY(${T}deg) `);
  }
  const p = e.x.scale * n.x, y = e.y.scale * n.y;
  return (p !== 1 || y !== 1) && (i += `scale(${p}, ${y})`), i || "none";
}
const Wk = xd.length, Zm = (e) => typeof e == "string" ? parseFloat(e) : e, qm = (e) => typeof e == "number" || re.test(e);
function Gk(e, n, o, i, a, c) {
  a ? (e.opacity = be(0, o.opacity ?? 1, Kk(i)), e.opacityExit = be(n.opacity ?? 1, 0, Yk(i))) : c && (e.opacity = be(n.opacity ?? 1, o.opacity ?? 1, i));
  for (let d = 0; d < Wk; d++) {
    const p = xd[d];
    let y = Jm(n, p), v = Jm(o, p);
    if (y === void 0 && v === void 0)
      continue;
    y || (y = 0), v || (v = 0), y === 0 || v === 0 || qm(y) === qm(v) ? (e[p] = Math.max(be(Zm(y), Zm(v), i), 0), (rn.test(v) || rn.test(y)) && (e[p] += "%")) : e[p] = v;
  }
  (n.rotate || o.rotate) && (e.rotate = be(n.rotate || 0, o.rotate || 0, i));
}
function Jm(e, n) {
  return e[n] !== void 0 ? e[n] : e.borderRadius;
}
const Kk = /* @__PURE__ */ kv(0, 0.5, mg), Yk = /* @__PURE__ */ kv(0.5, 0.95, Rt);
function kv(e, n, o) {
  return (i) => i < e ? 0 : i > n ? 1 : o(/* @__PURE__ */ pi(e, n, i));
}
function Qk(e, n, o) {
  const i = qe(e) ? e : ro(e);
  return i.start(vd("", i, n, o)), i.animation;
}
function yi(e, n, o, i = { passive: !0 }) {
  return e.addEventListener(n, o, i), () => e.removeEventListener(n, o, i);
}
const Xk = (e, n) => e.depth - n.depth;
class Zk {
  constructor() {
    this.children = [], this.isDirty = !1;
  }
  add(n) {
    sd(this.children, n), this.isDirty = !0;
  }
  remove(n) {
    fa(this.children, n), this.isDirty = !0;
  }
  forEach(n) {
    this.isDirty && this.children.sort(Xk), this.isDirty = !1, this.children.forEach(n);
  }
}
function qk(e, n) {
  const o = st.now(), i = ({ timestamp: a }) => {
    const c = a - o;
    c >= n && (Hn(i), e(c - n));
  };
  return Pe.setup(i, !0), () => Hn(i);
}
function oa(e) {
  return qe(e) ? e.get() : e;
}
class Jk {
  constructor() {
    this.members = [];
  }
  add(n) {
    sd(this.members, n);
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
}, Yu = ["", "X", "Y", "Z"], eT = 1e3;
let tT = 0;
function Qu(e, n, o, i) {
  const { latestValues: a } = n;
  a[e] && (o[e] = a[e], n.setStaticValue(e, 0), i && (i[e] = 0));
}
function Tv(e) {
  if (e.hasCheckedOptimisedAppear = !0, e.root === e)
    return;
  const { visualElement: n } = e.options;
  if (!n)
    return;
  const o = Gg(n);
  if (window.MotionHasOptimisedAnimation(o, "transform")) {
    const { layout: a, layoutId: c } = e.options;
    window.MotionCancelOptimisedAnimation(o, "transform", Pe, !(a || c));
  }
  const { parent: i } = e;
  i && !i.hasCheckedOptimisedAppear && Tv(i);
}
function Av({ attachResizeListener: e, defaultParent: n, measureScroll: o, checkIsScrollRoot: i, resetTransform: a }) {
  return class {
    constructor(d = {}, p = n == null ? void 0 : n()) {
      this.id = tT++, this.animationId = 0, this.animationCommitId = 0, this.children = /* @__PURE__ */ new Set(), this.options = {}, this.isTreeAnimating = !1, this.isAnimationBlocked = !1, this.isLayoutDirty = !1, this.isProjectionDirty = !1, this.isSharedProjectionDirty = !1, this.isTransformDirty = !1, this.updateManuallyBlocked = !1, this.updateBlockedByResize = !1, this.isUpdating = !1, this.isSVG = !1, this.needsReset = !1, this.shouldResetTransform = !1, this.hasCheckedOptimisedAppear = !1, this.treeScale = { x: 1, y: 1 }, this.eventHandlers = /* @__PURE__ */ new Map(), this.hasTreeAnimated = !1, this.layoutVersion = 0, this.updateScheduled = !1, this.scheduleUpdate = () => this.update(), this.projectionUpdateScheduled = !1, this.checkUpdateFailed = () => {
        this.isUpdating && (this.isUpdating = !1, this.clearAllSnapshots());
      }, this.updateProjection = () => {
        this.projectionUpdateScheduled = !1, this.nodes.forEach(oT), this.nodes.forEach(cT), this.nodes.forEach(dT), this.nodes.forEach(iT);
      }, this.resolvedRelativeTargetAt = 0, this.linkedParentVersion = 0, this.hasProjected = !1, this.isVisible = !0, this.animationProgress = 0, this.sharedNodes = /* @__PURE__ */ new Map(), this.latestValues = d, this.root = p ? p.root || p : this, this.path = p ? [...p.path, p] : [], this.parent = p, this.depth = p ? p.depth + 1 : 0;
      for (let y = 0; y < this.path.length; y++)
        this.path[y].shouldResetTransform = !0;
      this.root === this && (this.nodes = new Zk());
    }
    addEventListener(d, p) {
      return this.eventHandlers.has(d) || this.eventHandlers.set(d, new ad()), this.eventHandlers.get(d).add(p);
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
      this.isSVG = Td(d) && !rk(d), this.instance = d;
      const { layoutId: p, layout: y, visualElement: v } = this.options;
      if (v && !v.current && v.mount(d), this.root.nodes.add(this), this.parent && this.parent.children.add(this), this.root.hasTreeAnimated && (y || p) && (this.isLayoutDirty = !0), e) {
        let S, l = 0;
        const f = () => this.root.updateBlockedByResize = !1;
        Pe.read(() => {
          l = window.innerWidth;
        }), e(d, () => {
          const g = window.innerWidth;
          g !== l && (l = g, this.root.updateBlockedByResize = !0, S && S(), S = qk(f, 250), ia.hasAnimatedSinceResize && (ia.hasAnimatedSinceResize = !1, this.nodes.forEach(ny)));
        });
      }
      p && this.root.registerSharedNode(p, this), this.options.animate !== !1 && v && (p || y) && this.addEventListener("didUpdate", ({ delta: S, hasLayoutChanged: l, hasRelativeLayoutChanged: f, layout: g }) => {
        if (this.isTreeAnimationBlocked()) {
          this.target = void 0, this.relativeTarget = void 0;
          return;
        }
        const x = this.options.transition || v.getDefaultTransition() || yT, { onLayoutAnimationStart: T, onLayoutAnimationComplete: _ } = v.getProps(), A = !this.targetLayout || !_v(this.targetLayout, g), R = !l && f;
        if (this.options.layoutRoot || this.resumeFrom || R || l && (A || !this.currentAnimation)) {
          this.resumeFrom && (this.resumingFrom = this.resumeFrom, this.resumingFrom.resumingFrom = void 0);
          const P = {
            ...gd(x, "layout"),
            onPlay: T,
            onComplete: _
          };
          (v.shouldReduceMotion || this.options.layoutRoot) && (P.delay = 0, P.type = !1), this.startAnimation(P), this.setAnimationOrigin(S, R, P.path);
        } else
          l || ny(this), this.isLead() && this.options.onExitComplete && this.options.onExitComplete();
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
      this.isUpdateBlocked() || (this.isUpdating = !0, this.nodes && this.nodes.forEach(fT), this.animationId++);
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
      if (window.MotionCancelOptimisedAnimation && !this.hasCheckedOptimisedAppear && Tv(this), !this.root.isUpdating && this.root.startUpdate(), this.isLayoutDirty)
        return;
      this.isLayoutDirty = !0;
      for (let S = 0; S < this.path.length; S++) {
        const l = this.path[S];
        l.shouldResetTransform = !0, (typeof l.latestValues.x == "string" || typeof l.latestValues.y == "string") && (l.isLayoutDirty = !0), l.updateScroll("snapshot"), l.options.layoutRoot && l.willUpdate(!1);
      }
      const { layoutId: p, layout: y } = this.options;
      if (p === void 0 && !y)
        return;
      const v = this.getTransformTemplate();
      this.prevTransformTemplateValue = v ? v(this.latestValues, "") : void 0, this.updateSnapshot(), d && this.notifyListeners("willUpdate");
    }
    update() {
      if (this.updateScheduled = !1, this.isUpdateBlocked()) {
        const y = this.updateBlockedByResize;
        this.unblockUpdate(), this.updateBlockedByResize = !1, this.clearAllSnapshots(), y && this.nodes.forEach(aT), this.nodes.forEach(ey);
        return;
      }
      if (this.animationId <= this.animationCommitId) {
        this.nodes.forEach(ty);
        return;
      }
      this.animationCommitId = this.animationId, this.isUpdating ? (this.isUpdating = !1, this.nodes.forEach(lT), this.nodes.forEach(uT), this.nodes.forEach(nT), this.nodes.forEach(rT)) : this.nodes.forEach(ty), this.clearAllSnapshots();
      const p = st.now();
      Ze.delta = sn(0, 1e3 / 60, p - Ze.timestamp), Ze.timestamp = p, Ze.isProcessing = !0, zu.update.process(Ze), zu.preRender.process(Ze), zu.render.process(Ze), Ze.isProcessing = !1;
    }
    didUpdate() {
      this.updateScheduled || (this.updateScheduled = !0, _d.read(this.scheduleUpdate));
    }
    clearAllSnapshots() {
      this.nodes.forEach(sT), this.sharedNodes.forEach(pT);
    }
    scheduleUpdateProjection() {
      this.projectionUpdateScheduled || (this.projectionUpdateScheduled = !0, Pe.preRender(this.updateProjection, !1, !0));
    }
    scheduleCheckAfterUnmount() {
      Pe.postRender(() => {
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
      const d = this.isLayoutDirty || this.shouldResetTransform || this.options.alwaysMeasureLayout, p = this.projectionDelta && !xv(this.projectionDelta), y = this.getTransformTemplate(), v = y ? y(this.latestValues, "") : void 0, S = v !== this.prevTransformTemplateValue;
      d && this.instance && (p || ur(this.latestValues) || S) && (a(this.instance, v), this.shouldResetTransform = !1, this.scheduleRender());
    }
    measure(d = !0) {
      const p = this.measurePageBox();
      let y = this.removeElementScroll(p);
      return d && (y = this.removeTransform(y)), gT(y), {
        animationId: this.root.animationId,
        measuredBox: p,
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
      const p = d.measureViewportBox();
      if (!(((v = this.scroll) == null ? void 0 : v.wasRoot) || this.path.some(vT))) {
        const { scroll: S } = this.root;
        S && (tn(p.x, S.offset.x), tn(p.y, S.offset.y));
      }
      return p;
    }
    removeElementScroll(d) {
      var y;
      const p = He();
      if (Vt(p, d), (y = this.scroll) != null && y.wasRoot)
        return p;
      for (let v = 0; v < this.path.length; v++) {
        const S = this.path[v], { scroll: l, options: f } = S;
        S !== this.root && l && f.layoutScroll && (l.wasRoot && Vt(p, d), tn(p.x, l.offset.x), tn(p.y, l.offset.y));
      }
      return p;
    }
    applyTransform(d, p = !1, y) {
      var S, l;
      const v = y || He();
      Vt(v, d);
      for (let f = 0; f < this.path.length; f++) {
        const g = this.path[f];
        !p && g.options.layoutScroll && g.scroll && g !== g.root && (tn(v.x, -g.scroll.offset.x), tn(v.y, -g.scroll.offset.y)), ur(g.latestValues) && ra(v, g.latestValues, (S = g.layout) == null ? void 0 : S.layoutBox);
      }
      return ur(this.latestValues) && ra(v, this.latestValues, (l = this.layout) == null ? void 0 : l.layoutBox), v;
    }
    removeTransform(d) {
      var y;
      const p = He();
      Vt(p, d);
      for (let v = 0; v < this.path.length; v++) {
        const S = this.path[v];
        if (!ur(S.latestValues))
          continue;
        let l;
        S.instance && (Nc(S.latestValues) && S.updateSnapshot(), l = He(), Vt(l, S.measurePageBox())), Wm(p, S.latestValues, (y = S.snapshot) == null ? void 0 : y.layoutBox, l);
      }
      return ur(this.latestValues) && Wm(p, this.latestValues), p;
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
      const p = this.getLead();
      this.isProjectionDirty || (this.isProjectionDirty = p.isProjectionDirty), this.isTransformDirty || (this.isTransformDirty = p.isTransformDirty), this.isSharedProjectionDirty || (this.isSharedProjectionDirty = p.isSharedProjectionDirty);
      const y = !!this.resumingFrom || this !== p;
      if (!(d || y && this.isSharedProjectionDirty || this.isProjectionDirty || (g = this.parent) != null && g.isProjectionDirty || this.attemptToResolveRelativeTarget || this.root.updateBlockedByResize))
        return;
      const { layout: S, layoutId: l } = this.options;
      if (!this.layout || !(S || l))
        return;
      this.resolvedRelativeTargetAt = Ze.timestamp;
      const f = this.getClosestProjectingParent();
      f && this.linkedParentVersion !== f.layoutVersion && !f.options.layoutRoot && this.removeRelativeTarget(), !this.targetDelta && !this.relativeTarget && (this.options.layoutAnchor !== !1 && f && f.layout ? this.createRelativeTarget(f, this.layout.layoutBox, f.layout.layoutBox) : this.removeRelativeTarget()), !(!this.relativeTarget && !this.targetDelta) && (this.target || (this.target = He(), this.targetWithTransforms = He()), this.relativeTarget && this.relativeTargetOrigin && this.relativeParent && this.relativeParent.target ? (this.forceRelativeParentToResolveTarget(), Vk(this.target, this.relativeTarget, this.relativeParent.target, this.options.layoutAnchor || void 0)) : this.targetDelta ? (this.resumingFrom ? this.applyTransform(this.layout.layoutBox, !1, this.target) : Vt(this.target, this.layout.layoutBox), uv(this.target, this.targetDelta)) : Vt(this.target, this.layout.layoutBox), this.attemptToResolveRelativeTarget && (this.attemptToResolveRelativeTarget = !1, this.options.layoutAnchor !== !1 && f && !!f.resumingFrom == !!this.resumingFrom && !f.options.layoutScroll && f.target && this.animationProgress !== 1 ? this.createRelativeTarget(f, this.target, f.target) : this.relativeParent = this.relativeTarget = void 0));
    }
    getClosestProjectingParent() {
      if (!(!this.parent || Nc(this.parent.latestValues) || lv(this.parent.latestValues)))
        return this.parent.isProjecting() ? this.parent : this.parent.getClosestProjectingParent();
    }
    isProjecting() {
      return !!((this.relativeTarget || this.targetDelta || this.options.layoutRoot) && this.layout);
    }
    createRelativeTarget(d, p, y) {
      this.relativeParent = d, this.linkedParentVersion = d.layoutVersion, this.forceRelativeParentToResolveTarget(), this.relativeTarget = He(), this.relativeTargetOrigin = He(), wa(this.relativeTargetOrigin, p, y, this.options.layoutAnchor || void 0), Vt(this.relativeTarget, this.relativeTargetOrigin);
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
      const { layout: v, layoutId: S } = this.options;
      if (this.isTreeAnimating = !!(this.parent && this.parent.isTreeAnimating || this.currentAnimation || this.pendingAnimation), this.isTreeAnimating || (this.targetDelta = this.relativeTarget = void 0), !this.layout || !(v || S))
        return;
      Vt(this.layoutCorrected, this.layout.layoutBox);
      const l = this.treeScale.x, f = this.treeScale.y;
      hk(this.layoutCorrected, this.treeScale, this.path, p), d.layout && !d.target && (this.treeScale.x !== 1 || this.treeScale.y !== 1) && (d.target = d.layout.layoutBox, d.targetWithTransforms = He());
      const { target: g } = d;
      if (!g) {
        this.prevProjectionDelta && (this.createProjectionDeltas(), this.scheduleRender());
        return;
      }
      !this.projectionDelta || !this.prevProjectionDelta ? this.createProjectionDeltas() : (Vm(this.prevProjectionDelta.x, this.projectionDelta.x), Vm(this.prevProjectionDelta.y, this.projectionDelta.y)), li(this.projectionDelta, this.layoutCorrected, g, this.latestValues), (this.treeScale.x !== l || this.treeScale.y !== f || !Xm(this.projectionDelta.x, this.prevProjectionDelta.x) || !Xm(this.projectionDelta.y, this.prevProjectionDelta.y)) && (this.hasProjected = !0, this.scheduleRender(), this.notifyListeners("projectionUpdate", g));
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
      const v = this.snapshot, S = v ? v.latestValues : {}, l = { ...this.latestValues }, f = Zr();
      (!this.relativeParent || !this.relativeParent.options.layoutRoot) && (this.relativeTarget = this.relativeTargetOrigin = void 0), this.attemptToResolveRelativeTarget = !p;
      const g = He(), x = v ? v.source : void 0, T = this.layout ? this.layout.source : void 0, _ = x !== T, A = this.getStack(), R = !A || A.members.length <= 1, P = !!(_ && !R && this.options.crossfade === !0 && !this.path.some(mT));
      this.animationProgress = 0;
      let D;
      const L = y == null ? void 0 : y.interpolateProjection(d);
      this.mixTargetDelta = (X) => {
        const Z = X / 1e3, U = L == null ? void 0 : L(Z);
        U ? (f.x.translate = U.x, f.x.scale = be(d.x.scale, 1, Z), f.x.origin = d.x.origin, f.x.originPoint = d.x.originPoint, f.y.translate = U.y, f.y.scale = be(d.y.scale, 1, Z), f.y.origin = d.y.origin, f.y.originPoint = d.y.originPoint) : (ry(f.x, d.x, Z), ry(f.y, d.y, Z)), this.setTargetDelta(f), this.relativeTarget && this.relativeTargetOrigin && this.layout && this.relativeParent && this.relativeParent.layout && (wa(g, this.layout.layoutBox, this.relativeParent.layout.layoutBox, this.options.layoutAnchor || void 0), hT(this.relativeTarget, this.relativeTargetOrigin, g, Z), D && $k(this.relativeTarget, D) && (this.isProjectionDirty = !1), D || (D = He()), Vt(D, this.relativeTarget)), _ && (this.animationValues = l, Gk(l, S, this.latestValues, Z, P, R)), U && U.rotate !== void 0 && (this.animationValues || (this.animationValues = l), this.animationValues.pathRotation = U.rotate), this.root.scheduleUpdateProjection(), this.scheduleRender(), this.animationProgress = Z;
      }, this.mixTargetDelta(this.options.layoutRoot ? 1e3 : 0);
    }
    startAnimation(d) {
      var p, y, v;
      this.notifyListeners("animationStart"), (p = this.currentAnimation) == null || p.stop(), (v = (y = this.resumingFrom) == null ? void 0 : y.currentAnimation) == null || v.stop(), this.pendingAnimation && (Hn(this.pendingAnimation), this.pendingAnimation = void 0), this.pendingAnimation = Pe.update(() => {
        ia.hasAnimatedSinceResize = !0, this.motionValue || (this.motionValue = ro(0)), this.motionValue.jump(0, !1), this.currentAnimation = Qk(this.motionValue, [0, 1e3], {
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
      this.currentAnimation && (this.mixTargetDelta && this.mixTargetDelta(eT), this.currentAnimation.stop()), this.completeAnimation();
    }
    applyTransformsToTarget() {
      const d = this.getLead();
      let { targetWithTransforms: p, target: y, layout: v, latestValues: S } = d;
      if (!(!p || !y || !v)) {
        if (this !== d && this.layout && v && Cv(this.options.animationType, this.layout.layoutBox, v.layoutBox)) {
          y = this.target || He();
          const l = at(this.layout.layoutBox.x);
          y.x.min = d.target.x.min, y.x.max = y.x.min + l;
          const f = at(this.layout.layoutBox.y);
          y.y.min = d.target.y.min, y.y.max = y.y.min + f;
        }
        Vt(p, y), ra(p, S), li(this.projectionDeltaWithTransform, this.layoutCorrected, p, S);
      }
    }
    registerSharedNode(d, p) {
      this.sharedNodes.has(d) || this.sharedNodes.set(d, new Jk()), this.sharedNodes.get(d).add(p);
      const v = p.options.initialPromotionConfig;
      p.promote({
        transition: v ? v.transition : void 0,
        preserveFollowOpacity: v && v.shouldPreserveFollowOpacity ? v.shouldPreserveFollowOpacity(p) : void 0
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
      const v = this.getStack();
      v && v.promote(this, y), d && (this.projectionDelta = void 0, this.needsReset = !0), p && this.setOptions({ transition: p });
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
      const v = {};
      y.z && Qu("z", d, v, this.animationValues);
      for (let S = 0; S < Yu.length; S++)
        Qu(`rotate${Yu[S]}`, d, v, this.animationValues), Qu(`skew${Yu[S]}`, d, v, this.animationValues);
      d.render();
      for (const S in v)
        d.setStaticValue(S, v[S]), this.animationValues && (this.animationValues[S] = v[S]);
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
        this.needsReset = !1, d.visibility = "", d.opacity = "", d.pointerEvents = oa(p == null ? void 0 : p.pointerEvents) || "", d.transform = y ? y(this.latestValues, "") : "none";
        return;
      }
      const v = this.getLead();
      if (!this.projectionDelta || !this.layout || !v.target) {
        this.options.layoutId && (d.opacity = this.latestValues.opacity !== void 0 ? this.latestValues.opacity : 1, d.pointerEvents = oa(p == null ? void 0 : p.pointerEvents) || ""), this.hasProjected && !ur(this.latestValues) && (d.transform = y ? y({}, "") : "none", this.hasProjected = !1);
        return;
      }
      d.visibility = "";
      const S = v.animationValues || v.latestValues;
      this.applyTransformsToTarget();
      let l = Hk(this.projectionDeltaWithTransform, this.treeScale, S);
      y && (l = y(S, l)), d.transform = l;
      const { x: f, y: g } = this.projectionDelta;
      d.transformOrigin = `${f.origin * 100}% ${g.origin * 100}% 0`, v.animationValues ? d.opacity = v === this ? S.opacity ?? this.latestValues.opacity ?? 1 : this.preserveOpacity ? this.latestValues.opacity : S.opacityExit : d.opacity = v === this ? S.opacity !== void 0 ? S.opacity : "" : S.opacityExit !== void 0 ? S.opacityExit : 0;
      for (const x in jc) {
        if (S[x] === void 0)
          continue;
        const { correct: T, applyTo: _, isCSSVariable: A } = jc[x], R = l === "none" ? S[x] : T(S[x], v);
        if (_) {
          const P = _.length;
          for (let D = 0; D < P; D++)
            d[_[D]] = R;
        } else
          A ? this.options.visualElement.renderState.vars[x] = R : d[x] = R;
      }
      this.options.layoutId && (d.pointerEvents = v === this ? oa(p == null ? void 0 : p.pointerEvents) || "" : "none");
    }
    clearSnapshot() {
      this.resumeFrom = this.snapshot = void 0;
    }
    // Only run on root
    resetTree() {
      this.root.nodes.forEach((d) => {
        var p;
        return (p = d.currentAnimation) == null ? void 0 : p.stop();
      }), this.root.nodes.forEach(ey), this.root.sharedNodes.clear();
    }
  };
}
function nT(e) {
  e.updateLayout();
}
function rT(e) {
  var o;
  const n = ((o = e.resumeFrom) == null ? void 0 : o.snapshot) || e.snapshot;
  if (e.isLead() && e.layout && n && e.hasListeners("didUpdate")) {
    const { layoutBox: i, measuredBox: a } = e.layout, { animationType: c } = e.options, d = n.source !== e.layout.source;
    if (c === "size")
      en((l) => {
        const f = d ? n.measuredBox[l] : n.layoutBox[l], g = at(f);
        f.min = i[l].min, f.max = f.min + g;
      });
    else if (c === "x" || c === "y") {
      const l = c === "x" ? "y" : "x";
      Ic(d ? n.measuredBox[l] : n.layoutBox[l], i[l]);
    } else Cv(c, n.layoutBox, i) && en((l) => {
      const f = d ? n.measuredBox[l] : n.layoutBox[l], g = at(i[l]);
      f.max = f.min + g, e.relativeTarget && !e.currentAnimation && (e.isProjectionDirty = !0, e.relativeTarget[l].max = e.relativeTarget[l].min + g);
    });
    const p = Zr();
    li(p, i, n.layoutBox);
    const y = Zr();
    d ? li(y, e.applyTransform(a, !0), n.measuredBox) : li(y, i, n.layoutBox);
    const v = !xv(p);
    let S = !1;
    if (!e.resumeFrom) {
      const l = e.getClosestProjectingParent();
      if (l && !l.resumeFrom) {
        const { snapshot: f, layout: g } = l;
        if (f && g) {
          const x = e.options.layoutAnchor || void 0, T = He();
          wa(T, n.layoutBox, f.layoutBox, x);
          const _ = He();
          wa(_, i, g.layoutBox, x), _v(T, _) || (S = !0), l.options.layoutRoot && (e.relativeTarget = _, e.relativeTargetOrigin = T, e.relativeParent = l);
        }
      }
    }
    e.notifyListeners("didUpdate", {
      layout: i,
      snapshot: n,
      delta: y,
      layoutDelta: p,
      hasLayoutChanged: v,
      hasRelativeLayoutChanged: S
    });
  } else if (e.isLead()) {
    const { onExitComplete: i } = e.options;
    i && i();
  }
  e.options.transition = void 0;
}
function oT(e) {
  e.parent && (e.isProjecting() || (e.isProjectionDirty = e.parent.isProjectionDirty), e.isSharedProjectionDirty || (e.isSharedProjectionDirty = !!(e.isProjectionDirty || e.parent.isProjectionDirty || e.parent.isSharedProjectionDirty)), e.isTransformDirty || (e.isTransformDirty = e.parent.isTransformDirty));
}
function iT(e) {
  e.isProjectionDirty = e.isSharedProjectionDirty = e.isTransformDirty = !1;
}
function sT(e) {
  e.clearSnapshot();
}
function ey(e) {
  e.clearMeasurements();
}
function aT(e) {
  e.isLayoutDirty = !0, e.updateLayout();
}
function ty(e) {
  e.isLayoutDirty = !1;
}
function lT(e) {
  e.isAnimationBlocked && e.layout && !e.isLayoutDirty && (e.snapshot = e.layout, e.isLayoutDirty = !0);
}
function uT(e) {
  const { visualElement: n } = e.options;
  n && n.getProps().onBeforeLayoutMeasure && n.notify("BeforeLayoutMeasure"), e.resetTransform();
}
function ny(e) {
  e.finishAnimation(), e.targetDelta = e.relativeTarget = e.target = void 0, e.isProjectionDirty = !0;
}
function cT(e) {
  e.resolveTargetDelta();
}
function dT(e) {
  e.calcProjection();
}
function fT(e) {
  e.resetSkewAndRotation();
}
function pT(e) {
  e.removeLeadSnapshot();
}
function ry(e, n, o) {
  e.translate = be(n.translate, 0, o), e.scale = be(n.scale, 1, o), e.origin = n.origin, e.originPoint = n.originPoint;
}
function oy(e, n, o, i) {
  e.min = be(n.min, o.min, i), e.max = be(n.max, o.max, i);
}
function hT(e, n, o, i) {
  oy(e.x, n.x, o.x, i), oy(e.y, n.y, o.y, i);
}
function mT(e) {
  return e.animationValues && e.animationValues.opacityExit !== void 0;
}
const yT = {
  duration: 0.45,
  ease: [0.4, 0, 0.1, 1]
}, iy = (e) => typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().includes(e), sy = iy("applewebkit/") && !iy("chrome/") ? Math.round : Rt;
function ay(e) {
  e.min = sy(e.min), e.max = sy(e.max);
}
function gT(e) {
  ay(e.x), ay(e.y);
}
function Cv(e, n, o) {
  return e === "position" || e === "preserve-aspect" && !Lk(Qm(n), Qm(o), 0.2);
}
function vT(e) {
  var n;
  return e !== e.root && ((n = e.scroll) == null ? void 0 : n.wasRoot);
}
const ST = Av({
  attachResizeListener: (e, n) => yi(e, "resize", n),
  measureScroll: () => {
    var e, n;
    return {
      x: document.documentElement.scrollLeft || ((e = document.body) == null ? void 0 : e.scrollLeft) || 0,
      y: document.documentElement.scrollTop || ((n = document.body) == null ? void 0 : n.scrollTop) || 0
    };
  },
  checkIsScrollRoot: () => !0
}), Xu = {
  current: void 0
}, bv = Av({
  measureScroll: (e) => ({
    x: e.scrollLeft,
    y: e.scrollTop
  }),
  defaultParent: () => {
    if (!Xu.current) {
      const e = new ST({});
      e.mount(window), e.setOptions({ layoutScroll: !0 }), Xu.current = e;
    }
    return Xu.current;
  },
  resetTransform: (e, n) => {
    e.style.transform = n !== void 0 ? n : "none";
  },
  checkIsScrollRoot: (e) => window.getComputedStyle(e).position === "fixed"
}), Pd = C.createContext({
  transformPagePoint: (e) => e,
  isStatic: !1,
  reducedMotion: "never"
});
function ly(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function wT(...e) {
  return (n) => {
    let o = !1;
    const i = e.map((a) => {
      const c = ly(a, n);
      return !o && typeof c == "function" && (o = !0), c;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const c = i[a];
          typeof c == "function" ? c() : ly(e[a], null);
        }
      };
  };
}
function xT(...e) {
  return C.useCallback(wT(...e), e);
}
class _T extends C.Component {
  getSnapshotBeforeUpdate(n) {
    const o = this.props.childRef.current;
    if (Js(o) && n.isPresent && !this.props.isPresent && this.props.pop !== !1) {
      const i = o.offsetParent, a = Js(i) && i.offsetWidth || 0, c = Js(i) && i.offsetHeight || 0, d = getComputedStyle(o), p = this.props.sizeRef.current;
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
function kT({ children: e, isPresent: n, anchorX: o, anchorY: i, root: a, pop: c }) {
  var f;
  const d = C.useId(), p = C.useRef(null), y = C.useRef({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    direction: "ltr"
  }), { nonce: v } = C.useContext(Pd), S = ((f = e.props) == null ? void 0 : f.ref) ?? (e == null ? void 0 : e.ref), l = xT(p, S);
  return C.useInsertionEffect(() => {
    const { width: g, height: x, top: T, left: _, right: A, bottom: R, direction: P } = y.current;
    if (n || c === !1 || !p.current || !g || !x)
      return;
    const D = P === "rtl", L = o === "left" ? D ? `right: ${A}` : `left: ${_}` : D ? `left: ${_}` : `right: ${A}`, X = i === "bottom" ? `bottom: ${R}` : `top: ${T}`;
    p.current.dataset.motionPopId = d;
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
      (G = p.current) == null || G.removeAttribute("data-motion-pop-id"), U.contains(Z) && U.removeChild(Z);
    };
  }, [n]), w.jsx(_T, { isPresent: n, childRef: p, sizeRef: y, pop: c, children: c === !1 ? e : C.cloneElement(e, { ref: l }) });
}
const TT = ({ children: e, initial: n, isPresent: o, onExitComplete: i, custom: a, presenceAffectsLayout: c, mode: d, anchorX: p, anchorY: y, root: v }) => {
  const S = od(AT), l = C.useId(), f = C.useRef(o), g = C.useRef(i);
  id(() => {
    f.current = o, g.current = i;
  });
  let x = !0, T = C.useMemo(() => (x = !1, {
    id: l,
    initial: n,
    isPresent: o,
    custom: a,
    onExitComplete: (_) => {
      S.set(_, !0);
      for (const A of S.values())
        if (!A)
          return;
      i && i();
    },
    register: (_) => (S.set(_, !1), () => {
      var A;
      S.delete(_), !f.current && !S.size && ((A = g.current) == null || A.call(g));
    })
  }), [o, S, i]);
  return c && x && (T = { ...T }), C.useMemo(() => {
    S.forEach((_, A) => S.set(A, !1));
  }, [o]), C.useEffect(() => {
    !o && !S.size && i && i();
  }, [o]), e = w.jsx(kT, { pop: d === "popLayout", isPresent: o, anchorX: p, anchorY: y, root: v, children: e }), w.jsx(Ma.Provider, { value: T, children: e });
};
function AT() {
  return /* @__PURE__ */ new Map();
}
function Ev(e = !0) {
  const n = C.useContext(Ma);
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
const Us = (e) => e.key || "";
function uy(e) {
  const n = [];
  return C.Children.forEach(e, (o) => {
    C.isValidElement(o) && n.push(o);
  }), n;
}
const ja = ({ children: e, custom: n, initial: o = !0, onExitComplete: i, presenceAffectsLayout: a = !0, mode: c = "sync", propagate: d = !1, anchorX: p = "left", anchorY: y = "top", root: v }) => {
  const [S, l] = Ev(d), f = C.useMemo(() => uy(e), [e]), g = d && !S ? [] : f.map(Us), x = C.useRef(!0), T = C.useRef(f), _ = od(() => /* @__PURE__ */ new Map()), A = C.useRef(/* @__PURE__ */ new Set()), [R, P] = C.useState(f), [D, L] = C.useState(f);
  id(() => {
    x.current = !1, T.current = f;
    for (let U = 0; U < D.length; U++) {
      const G = Us(D[U]);
      g.includes(G) ? (_.delete(G), A.current.delete(G)) : _.get(G) !== !0 && _.set(G, !1);
    }
  }, [D, g.length, g.join("-")]);
  const X = [];
  if (f !== R) {
    let U = [...f];
    for (let G = 0; G < D.length; G++) {
      const Q = D[G], J = Us(Q);
      g.includes(J) || (U.splice(G, 0, Q), X.push(Q));
    }
    return c === "wait" && X.length && (U = X), L(uy(U)), P(f), null;
  }
  const { forceRender: Z } = C.useContext(rd);
  return w.jsx(w.Fragment, { children: D.map((U) => {
    const G = Us(U), Q = d && !S ? !1 : f === D || g.includes(G), J = () => {
      if (A.current.has(G))
        return;
      if (_.has(G))
        A.current.add(G), _.set(G, !0);
      else
        return;
      let de = !0;
      _.forEach((ye) => {
        ye || (de = !1);
      }), de && (Z == null || Z(), L(T.current), d && (l == null || l()), i && i());
    };
    return w.jsx(TT, { isPresent: Q, initial: !x.current || o ? void 0 : !1, custom: n, presenceAffectsLayout: a, mode: c, root: v, onExitComplete: Q ? void 0 : J, anchorX: p, anchorY: y, children: U }, G);
  }) });
}, Pv = C.createContext({ strict: !1 }), cy = {
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
let dy = !1;
function CT() {
  if (dy)
    return;
  const e = {};
  for (const n in cy)
    e[n] = {
      isEnabled: (o) => cy[n].some((i) => !!o[i])
    };
  iv(e), dy = !0;
}
function Mv() {
  return CT(), ck();
}
function bT(e) {
  const n = Mv();
  for (const o in e)
    n[o] = {
      ...n[o],
      ...e[o]
    };
  iv(n);
}
const ET = /* @__PURE__ */ new Set([
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
  return e.startsWith("while") || e.startsWith("drag") && e !== "draggable" || e.startsWith("layout") || e.startsWith("onTap") || e.startsWith("onPan") || e.startsWith("onLayout") || ET.has(e);
}
let Rv = (e) => !xa(e);
function PT(e) {
  typeof e == "function" && (Rv = (n) => n.startsWith("on") ? !xa(n) : e(n));
}
try {
  PT(require("@emotion/is-prop-valid").default);
} catch {
}
function MT(e, n, o) {
  const i = {};
  for (const a in e)
    a === "values" && typeof e.values == "object" || qe(e[a]) || (Rv(a) || o === !0 && xa(a) || !n && !xa(a) || // If trying to use native HTML drag events, forward drag listeners
    e.draggable && a.startsWith("onDrag")) && (i[a] = e[a]);
  return i;
}
const Ia = /* @__PURE__ */ C.createContext({});
function RT(e, n) {
  if (Da(e)) {
    const { initial: o, animate: i } = e;
    return {
      initial: o === !1 || mi(o) ? o : void 0,
      animate: mi(i) ? i : void 0
    };
  }
  return e.inherit !== !1 ? n : {};
}
function NT(e) {
  const { initial: n, animate: o } = RT(e, C.useContext(Ia));
  return C.useMemo(() => ({ initial: n, animate: o }), [fy(n), fy(o)]);
}
function fy(e) {
  return Array.isArray(e) ? e.join(" ") : e;
}
const Md = () => ({
  style: {},
  transform: {},
  transformOrigin: {},
  vars: {}
});
function Nv(e, n, o) {
  for (const i in n)
    !qe(n[i]) && !fv(i, o) && (e[i] = n[i]);
}
function DT({ transformTemplate: e }, n) {
  return C.useMemo(() => {
    const o = Md();
    return bd(o, n, e), Object.assign({}, o.vars, o.style);
  }, [n]);
}
function jT(e, n) {
  const o = e.style || {}, i = {};
  return Nv(i, o, e), Object.assign(i, DT(e, n)), i;
}
function IT(e, n) {
  const o = {}, i = jT(e, n);
  return e.drag && e.dragListener !== !1 && (o.draggable = !1, i.userSelect = i.WebkitUserSelect = i.WebkitTouchCallout = "none", i.touchAction = e.drag === !0 ? "none" : `pan-${e.drag === "x" ? "y" : "x"}`), e.tabIndex === void 0 && (e.onTap || e.onTapStart || e.whileTap) && (o.tabIndex = 0), o.style = i, o;
}
const Dv = () => ({
  ...Md(),
  attrs: {}
});
function FT(e, n, o, i) {
  const a = C.useMemo(() => {
    const c = Dv();
    return pv(c, n, mv(i), e.transformTemplate, e.style), {
      ...c.attrs,
      style: { ...c.style }
    };
  }, [n]);
  if (e.style) {
    const c = {};
    Nv(c, e.style, e), a.style = { ...c, ...a.style };
  }
  return a;
}
const OT = [
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
function Rd(e) {
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
      !!(OT.indexOf(e) > -1 || /**
       * If it contains a capital letter, it's an SVG component
       */
      /[A-Z]/u.test(e))
    )
  );
}
function LT(e, n, o, { latestValues: i }, a, c = !1, d) {
  const y = (d ?? Rd(e) ? FT : IT)(n, i, a, e), v = MT(n, typeof e == "string", c), S = e !== C.Fragment ? { ...v, ...y, ref: o } : {}, { children: l } = n, f = C.useMemo(() => qe(l) ? l.get() : l, [l]);
  return C.createElement(e, {
    ...S,
    children: f
  });
}
function VT({ scrapeMotionValuesFromProps: e, createRenderState: n }, o, i, a) {
  return {
    latestValues: zT(o, i, a, e),
    renderState: n()
  };
}
function zT(e, n, o, i) {
  const a = {}, c = i(e, {});
  for (const f in c)
    a[f] = oa(c[f]);
  let { initial: d, animate: p } = e;
  const y = Da(e), v = rv(e);
  n && v && !y && e.inherit !== !1 && (d === void 0 && (d = n.initial), p === void 0 && (p = n.animate));
  let S = o ? o.initial === !1 : !1;
  S = S || d === !1;
  const l = S ? p : d;
  if (l && typeof l != "boolean" && !Na(l)) {
    const f = Array.isArray(l) ? l : [l];
    for (let g = 0; g < f.length; g++) {
      const x = Sd(e, f[g]);
      if (x) {
        const { transitionEnd: T, transition: _, ...A } = x;
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
const jv = (e) => (n, o) => {
  const i = C.useContext(Ia), a = C.useContext(Ma), c = () => VT(e, n, i, a);
  return o ? c() : od(c);
}, BT = /* @__PURE__ */ jv({
  scrapeMotionValuesFromProps: Ed,
  createRenderState: Md
}), UT = /* @__PURE__ */ jv({
  scrapeMotionValuesFromProps: yv,
  createRenderState: Dv
}), $T = Symbol.for("motionComponentSymbol");
function HT(e, n, o) {
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
const Iv = C.createContext({});
function Yr(e) {
  return e && typeof e == "object" && Object.prototype.hasOwnProperty.call(e, "current");
}
function WT(e, n, o, i, a, c) {
  var P, D;
  const { visualElement: d } = C.useContext(Ia), p = C.useContext(Pv), y = C.useContext(Ma), v = C.useContext(Pd), S = v.reducedMotion, l = v.skipAnimations, f = C.useRef(null), g = C.useRef(!1);
  i = i || p.renderer, !f.current && i && (f.current = i(e, {
    visualState: n,
    parent: d,
    props: o,
    presenceContext: y,
    blockInitialAnimation: y ? y.initial === !1 : !1,
    reducedMotionConfig: S,
    skipAnimations: l,
    isSVG: c
  }), g.current && f.current && (f.current.manuallyAnimateOnMount = !0));
  const x = f.current, T = C.useContext(Iv);
  x && !x.projection && a && (x.type === "html" || x.type === "svg") && GT(f.current, o, a, T);
  const _ = C.useRef(!1);
  C.useInsertionEffect(() => {
    x && _.current && x.update(o, y);
  });
  const A = o[Wg], R = C.useRef(!!A && typeof window < "u" && !((P = window.MotionHandoffIsComplete) != null && P.call(window, A)) && ((D = window.MotionHasOptimisedAnimation) == null ? void 0 : D.call(window, A)));
  return id(() => {
    g.current = !0, x && (_.current = !0, window.MotionIsMounted = !0, x.updateFeatures(), x.scheduleRenderMicrotask(), R.current && x.animationState && x.animationState.animateChanges());
  }), C.useEffect(() => {
    x && (!R.current && x.animationState && x.animationState.animateChanges(), R.current && (queueMicrotask(() => {
      var L;
      (L = window.MotionHandoffMarkAsComplete) == null || L.call(window, A);
    }), R.current = !1), x.enteringChildren = void 0);
  }), x;
}
function GT(e, n, o, i) {
  const { layoutId: a, layout: c, drag: d, dragConstraints: p, layoutScroll: y, layoutRoot: v, layoutAnchor: S, layoutCrossfade: l } = n;
  e.projection = new o(e.latestValues, n["data-framer-portal-id"] ? void 0 : Fv(e.parent)), e.projection.setOptions({
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
    layoutRoot: v,
    layoutAnchor: S
  });
}
function Fv(e) {
  if (e)
    return e.options.allowProjection !== !1 ? e.projection : Fv(e.parent);
}
function Zu(e, { forwardMotionProps: n = !1, type: o } = {}, i, a) {
  i && bT(i);
  const c = o ? o === "svg" : Rd(e), d = c ? UT : BT;
  function p(v, S) {
    let l;
    const f = {
      ...C.useContext(Pd),
      ...v,
      layoutId: KT(v)
    }, { isStatic: g } = f, x = NT(v), T = d(v, g);
    if (!g && typeof window < "u") {
      YT();
      const _ = QT(f);
      l = _.MeasureLayout, x.visualElement = WT(e, T, f, a, _.ProjectionNode, c);
    }
    return w.jsxs(Ia.Provider, { value: x, children: [l && x.visualElement ? w.jsx(l, { visualElement: x.visualElement, ...f }) : null, LT(e, v, HT(T, x.visualElement, S), T, g, n, c)] });
  }
  p.displayName = `motion.${typeof e == "string" ? e : `create(${e.displayName ?? e.name ?? ""})`}`;
  const y = C.forwardRef(p);
  return y[$T] = e, y;
}
function KT({ layoutId: e }) {
  const n = C.useContext(rd).id;
  return n && e !== void 0 ? n + "-" + e : e;
}
function YT(e, n) {
  C.useContext(Pv).strict;
}
function QT(e) {
  const n = Mv(), { drag: o, layout: i } = n;
  if (!o && !i)
    return {};
  const a = { ...o, ...i };
  return {
    MeasureLayout: o != null && o.isEnabled(e) || i != null && i.isEnabled(e) ? a.MeasureLayout : void 0,
    ProjectionNode: a.ProjectionNode
  };
}
function XT(e, n) {
  if (typeof Proxy > "u")
    return Zu;
  const o = /* @__PURE__ */ new Map(), i = (c, d) => Zu(c, d, e, n), a = (c, d) => i(c, d);
  return new Proxy(a, {
    /**
     * Called when `motion` is referenced with a prop: `motion.div`, `motion.input` etc.
     * The prop name is passed through as `key` and we can use that to generate a `motion`
     * DOM component with that name.
     */
    get: (c, d) => d === "create" ? i : (o.has(d) || o.set(d, Zu(d, void 0, e, n)), o.get(d))
  });
}
const ZT = (e, n) => n.isSVG ?? Rd(e) ? new bk(n) : new xk(n, {
  allowProjection: e !== C.Fragment
});
class qT extends Kn {
  /**
   * We dynamically generate the AnimationState manager as it contains a reference
   * to the underlying animation library. We only want to load that if we load this,
   * so people can optionally code split it out using the `m` component.
   */
  constructor(n) {
    super(n), n.animationState || (n.animationState = Nk(n));
  }
  updateAnimationControlsSubscription() {
    const { animate: n } = this.node.getProps();
    Na(n) && (this.unmountControls = n.subscribe(this.node));
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
let JT = 0;
class eA extends Kn {
  constructor() {
    super(...arguments), this.id = JT++, this.isExitComplete = !1;
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
            const { transition: v, transitionEnd: S, ...l } = y;
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
const tA = {
  animation: {
    Feature: qT
  },
  exit: {
    Feature: eA
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
const nA = (e) => (n) => kd(n) && e(n, bi(n));
function ui(e, n, o, i) {
  return yi(e, n, nA(o), i);
}
const Ov = ({ current: e }) => e ? e.ownerDocument.defaultView : null, py = (e, n) => Math.abs(e - n);
function rA(e, n) {
  const o = py(e.x, n.x), i = py(e.y, n.y);
  return Math.sqrt(o ** 2 + i ** 2);
}
const hy = /* @__PURE__ */ new Set(["auto", "scroll"]);
class Lv {
  constructor(n, o, { transformPagePoint: i, contextWindow: a = window, dragSnapToOrigin: c = !1, distanceThreshold: d = 3, element: p } = {}) {
    if (this.startEvent = null, this.lastMoveEvent = null, this.lastMoveEventInfo = null, this.lastRawMoveEventInfo = null, this.handlers = {}, this.contextWindow = window, this.scrollPositions = /* @__PURE__ */ new Map(), this.removeScrollListeners = null, this.onElementScroll = (x) => {
      this.handleScroll(x.target);
    }, this.onWindowScroll = () => {
      this.handleScroll(window);
    }, this.updatePoint = () => {
      if (!(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      this.lastRawMoveEventInfo && (this.lastMoveEventInfo = $s(this.lastRawMoveEventInfo, this.transformPagePoint));
      const x = qu(this.lastMoveEventInfo, this.history), T = this.startEvent !== null, _ = rA(x.offset, { x: 0, y: 0 }) >= this.distanceThreshold;
      if (!T && !_)
        return;
      const { point: A } = x, { timestamp: R } = Ze;
      this.history.push({ ...A, timestamp: R });
      const { onStart: P, onMove: D } = this.handlers;
      T || (P && P(this.lastMoveEvent, x), this.startEvent = this.lastMoveEvent), D && D(this.lastMoveEvent, x);
    }, this.handlePointerMove = (x, T) => {
      this.lastMoveEvent = x, this.lastRawMoveEventInfo = T, this.lastMoveEventInfo = $s(T, this.transformPagePoint), Pe.update(this.updatePoint, !0);
    }, this.handlePointerUp = (x, T) => {
      this.end();
      const { onEnd: _, onSessionEnd: A, resumeAnimation: R } = this.handlers;
      if ((this.dragSnapToOrigin || !this.startEvent) && R && R(), !(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      const P = qu(x.type === "pointercancel" ? this.lastMoveEventInfo : $s(T, this.transformPagePoint), this.history);
      this.startEvent && _ && _(x, P), A && A(x, P);
    }, !kd(n))
      return;
    this.dragSnapToOrigin = c, this.handlers = o, this.transformPagePoint = i, this.distanceThreshold = d, this.contextWindow = a || window;
    const y = bi(n), v = $s(y, this.transformPagePoint), { point: S } = v, { timestamp: l } = Ze;
    this.history = [{ ...S, timestamp: l }];
    const { onSessionStart: f } = o;
    f && f(n, qu(v, this.history));
    const g = { passive: !0, capture: !0 };
    this.removeListeners = Ti(ui(this.contextWindow, "pointermove", this.handlePointerMove, g), ui(this.contextWindow, "pointerup", this.handlePointerUp, g), ui(this.contextWindow, "pointercancel", this.handlePointerUp, g)), p && this.startScrollTracking(p);
  }
  /**
   * Start tracking scroll on ancestors and window.
   */
  startScrollTracking(n) {
    let o = n.parentElement;
    for (; o; ) {
      const i = getComputedStyle(o);
      (hy.has(i.overflowX) || hy.has(i.overflowY)) && this.scrollPositions.set(o, {
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
    c.x === 0 && c.y === 0 || (i ? this.lastMoveEventInfo && (this.lastMoveEventInfo.point.x += c.x, this.lastMoveEventInfo.point.y += c.y) : this.history.length > 0 && (this.history[0].x -= c.x, this.history[0].y -= c.y), this.scrollPositions.set(n, a), Pe.update(this.updatePoint, !0));
  }
  updateHandlers(n) {
    this.handlers = n;
  }
  end() {
    this.removeListeners && this.removeListeners(), this.removeScrollListeners && this.removeScrollListeners(), this.scrollPositions.clear(), Hn(this.updatePoint);
  }
}
function $s(e, n) {
  return n ? { point: n(e.point) } : e;
}
function my(e, n) {
  return { x: e.x - n.x, y: e.y - n.y };
}
function qu({ point: e }, n) {
  return {
    point: e,
    delta: my(e, Vv(n)),
    offset: my(e, oA(n)),
    velocity: iA(n, 0.1)
  };
}
function oA(e) {
  return e[0];
}
function Vv(e) {
  return e[e.length - 1];
}
function iA(e, n) {
  if (e.length < 2)
    return { x: 0, y: 0 };
  let o = e.length - 1, i = null;
  const a = Vv(e);
  for (; o >= 0 && (i = e[o], !(a.timestamp - i.timestamp > /* @__PURE__ */ gt(n))); )
    o--;
  if (!i)
    return { x: 0, y: 0 };
  i === e[0] && e.length > 2 && a.timestamp - i.timestamp > /* @__PURE__ */ gt(n) * 2 && (i = e[1]);
  const c = /* @__PURE__ */ Mt(a.timestamp - i.timestamp);
  if (c === 0)
    return { x: 0, y: 0 };
  const d = {
    x: (a.x - i.x) / c,
    y: (a.y - i.y) / c
  };
  return d.x === 1 / 0 && (d.x = 0), d.y === 1 / 0 && (d.y = 0), d;
}
function sA(e, { min: n, max: o }, i) {
  return n !== void 0 && e < n ? e = i ? be(n, e, i.min) : Math.max(e, n) : o !== void 0 && e > o && (e = i ? be(o, e, i.max) : Math.min(e, o)), e;
}
function yy(e, n, o) {
  return {
    min: n !== void 0 ? e.min + n : void 0,
    max: o !== void 0 ? e.max + o - (e.max - e.min) : void 0
  };
}
function aA(e, { top: n, left: o, bottom: i, right: a }) {
  return {
    x: yy(e.x, o, a),
    y: yy(e.y, n, i)
  };
}
function gy(e, n) {
  let o = n.min - e.min, i = n.max - e.max;
  return n.max - n.min < e.max - e.min && ([o, i] = [i, o]), { min: o, max: i };
}
function lA(e, n) {
  return {
    x: gy(e.x, n.x),
    y: gy(e.y, n.y)
  };
}
function uA(e, n) {
  let o = 0.5;
  const i = at(e), a = at(n);
  return a > i ? o = /* @__PURE__ */ pi(n.min, n.max - i, e.min) : i > a && (o = /* @__PURE__ */ pi(e.min, e.max - a, n.min)), sn(0, 1, o);
}
function cA(e, n) {
  const o = {};
  return n.min !== void 0 && (o.min = n.min - e.min), n.max !== void 0 && (o.max = n.max - e.min), o;
}
const Fc = 0.35;
function dA(e = Fc) {
  return e === !1 ? e = 0 : e === !0 && (e = Fc), {
    x: vy(e, "left", "right"),
    y: vy(e, "top", "bottom")
  };
}
function vy(e, n, o) {
  return {
    min: Sy(e, n),
    max: Sy(e, o)
  };
}
function Sy(e, n) {
  return typeof e == "number" ? e : e[n] || 0;
}
const fA = /* @__PURE__ */ new WeakMap();
class pA {
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
      const { drag: g, dragPropagation: x, onDragStart: T } = this.getProps();
      if (g && !x && (this.openDragLock && this.openDragLock(), this.openDragLock = z_(g), !this.openDragLock))
        return;
      this.latestPointerEvent = l, this.latestPanInfo = f, this.isDragging = !0, this.currentDirection = null, this.resolveConstraints(), this.visualElement.projection && (this.visualElement.projection.isAnimationBlocked = !0, this.visualElement.projection.target = void 0), en((A) => {
        let R = this.getAxisMotionValue(A).get() || 0;
        if (rn.test(R)) {
          const { projection: P } = this.visualElement;
          if (P && P.layout) {
            const D = P.layout.layoutBox[A];
            D && (R = at(D) * (parseFloat(R) / 100));
          }
        }
        this.originPoint[A] = R;
      }), T && Pe.update(() => T(l, f), !1, !0), Cc(this.visualElement, "transform");
      const { animationState: _ } = this.visualElement;
      _ && _.setActive("whileDrag", !0);
    }, p = (l, f) => {
      this.latestPointerEvent = l, this.latestPanInfo = f;
      const { dragPropagation: g, dragDirectionLock: x, onDirectionLock: T, onDrag: _ } = this.getProps();
      if (!g && !this.openDragLock)
        return;
      const { offset: A } = f;
      if (x && this.currentDirection === null) {
        this.currentDirection = mA(A), this.currentDirection !== null && T && T(this.currentDirection);
        return;
      }
      this.updateAxis("x", f.point, A), this.updateAxis("y", f.point, A), this.visualElement.render(), _ && Pe.update(() => _(l, f), !1, !0);
    }, y = (l, f) => {
      this.latestPointerEvent = l, this.latestPanInfo = f, this.stop(l, f), this.latestPointerEvent = null, this.latestPanInfo = null;
    }, v = () => {
      const { dragSnapToOrigin: l } = this.getProps();
      (l || this.constraints) && this.startAnimation({ x: 0, y: 0 });
    }, { dragSnapToOrigin: S } = this.getProps();
    this.panSession = new Lv(n, {
      onSessionStart: c,
      onStart: d,
      onMove: p,
      onSessionEnd: y,
      resumeAnimation: v
    }, {
      transformPagePoint: this.visualElement.getTransformPagePoint(),
      dragSnapToOrigin: S,
      distanceThreshold: i,
      contextWindow: Ov(this.visualElement),
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
    p && Pe.postRender(() => p(i, a));
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
    if (!i || !Hs(n, a, this.currentDirection))
      return;
    const c = this.getAxisMotionValue(n);
    let d = this.originPoint[n] + i[n];
    this.constraints && this.constraints[n] && (d = sA(d, this.constraints[n], this.elastic[n])), c.set(d);
  }
  resolveConstraints() {
    var c;
    const { dragConstraints: n, dragElastic: o } = this.getProps(), i = this.visualElement.projection && !this.visualElement.projection.layout ? this.visualElement.projection.measure(!1) : (c = this.visualElement.projection) == null ? void 0 : c.layout, a = this.constraints;
    n && Yr(n) ? this.constraints || (this.constraints = this.resolveRefConstraints()) : n && i ? this.constraints = aA(i.layoutBox, n) : this.constraints = !1, this.elastic = dA(o), a !== this.constraints && !Yr(n) && i && this.constraints && !this.hasMutatedConstraints && en((d) => {
      this.constraints !== !1 && this.getAxisMotionValue(d) && (this.constraints[d] = cA(i.layoutBox[d], this.constraints[d]));
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
    const c = mk(i, a.root, this.visualElement.getTransformPagePoint());
    let d = lA(a.layout.layoutBox, c);
    if (o) {
      const p = o(fk(d));
      this.hasMutatedConstraints = !!p, p && (d = av(p));
    }
    return d;
  }
  startAnimation(n) {
    const { drag: o, dragMomentum: i, dragElastic: a, dragTransition: c, dragSnapToOrigin: d, onDragTransitionEnd: p } = this.getProps(), y = this.constraints || {}, v = en((S) => {
      if (!Hs(S, o, this.currentDirection))
        return;
      let l = y && y[S] || {};
      (d === !0 || d === S) && (l = { min: 0, max: 0 });
      const f = a ? 200 : 1e6, g = a ? 40 : 1e7, x = {
        type: "inertia",
        velocity: i ? n[S] : 0,
        bounceStiffness: f,
        bounceDamping: g,
        timeConstant: 750,
        restDelta: 1,
        restSpeed: 10,
        ...c,
        ...l
      };
      return this.startAxisValueAnimation(S, x);
    });
    return Promise.all(v).then(p);
  }
  startAxisValueAnimation(n, o) {
    const i = this.getAxisMotionValue(n);
    return Cc(this.visualElement, n), i.start(vd(n, i, 0, o, this.visualElement, !1));
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
      if (!Hs(o, i, this.currentDirection))
        return;
      const { projection: a } = this.visualElement, c = this.getAxisMotionValue(o);
      if (a && a.layout) {
        const { min: d, max: p } = a.layout.layoutBox[o], y = c.get() || 0;
        c.set(n[o] - be(d, p, 0.5) + y);
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
    en((d) => {
      const p = this.getAxisMotionValue(d);
      if (p && this.constraints !== !1) {
        const y = p.get();
        a[d] = uA({ min: y, max: y }, this.constraints[d]);
      }
    });
    const { transformTemplate: c } = this.visualElement.getProps();
    this.visualElement.current.style.transform = c ? c({}, "") : "none", i.root && i.root.updateScroll(), i.updateLayout(), this.constraints = !1, this.resolveConstraints(), en((d) => {
      if (!Hs(d, n, null))
        return;
      const p = this.getAxisMotionValue(d), { min: y, max: v } = this.constraints[d];
      p.set(be(y, v, a[d]));
    }), this.visualElement.render();
  }
  addListeners() {
    if (!this.visualElement.current)
      return;
    fA.set(this.visualElement, this);
    const n = this.visualElement.current, o = ui(n, "pointerdown", (v) => {
      const { drag: S, dragListener: l = !0 } = this.getProps(), f = v.target, g = f !== n && G_(f);
      S && l && !g && this.start(v);
    });
    let i;
    const a = () => {
      const { dragConstraints: v } = this.getProps();
      Yr(v) && v.current && (this.constraints = this.resolveRefConstraints(), i || (i = hA(n, v.current, () => this.scalePositionWithinConstraints())));
    }, { projection: c } = this.visualElement, d = c.addEventListener("measure", a);
    c && !c.layout && (c.root && c.root.updateScroll(), c.updateLayout()), Pe.read(a);
    const p = yi(window, "resize", () => this.scalePositionWithinConstraints()), y = c.addEventListener("didUpdate", (({ delta: v, hasLayoutChanged: S }) => {
      this.isDragging && S && (en((l) => {
        const f = this.getAxisMotionValue(l);
        f && (this.originPoint[l] += v[l].translate, f.set(f.get() + v[l].translate));
      }), this.visualElement.render());
    }));
    return () => {
      p(), o(), d(), y && y(), i && i();
    };
  }
  getProps() {
    const n = this.visualElement.getProps(), { drag: o = !1, dragDirectionLock: i = !1, dragPropagation: a = !1, dragConstraints: c = !1, dragElastic: d = Fc, dragMomentum: p = !0 } = n;
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
function wy(e) {
  let n = !0;
  return () => {
    if (n) {
      n = !1;
      return;
    }
    e();
  };
}
function hA(e, n, o) {
  const i = bm(e, wy(o)), a = bm(n, wy(o));
  return () => {
    i(), a();
  };
}
function Hs(e, n, o) {
  return (n === !0 || n === e) && (o === null || o === e);
}
function mA(e, n = 10) {
  let o = null;
  return Math.abs(e.y) > n ? o = "y" : Math.abs(e.x) > n && (o = "x"), o;
}
class yA extends Kn {
  constructor(n) {
    super(n), this.removeGroupControls = Rt, this.removeListeners = Rt, this.controls = new pA(n);
  }
  mount() {
    const { dragControls: n } = this.node.getProps();
    n && (this.removeGroupControls = n.subscribe(this.controls)), this.removeListeners = this.controls.addListeners() || Rt;
  }
  update() {
    const { dragControls: n } = this.node.getProps(), { dragControls: o } = this.node.prevProps || {};
    n !== o && (this.removeGroupControls(), n && (this.removeGroupControls = n.subscribe(this.controls)));
  }
  unmount() {
    this.removeGroupControls(), this.removeListeners(), this.controls.isDragging || this.controls.endPanSession();
  }
}
const Ju = (e) => (n, o) => {
  e && Pe.update(() => e(n, o), !1, !0);
};
class gA extends Kn {
  constructor() {
    super(...arguments), this.removePointerDownListener = Rt;
  }
  onPointerDown(n) {
    this.session = new Lv(n, this.createPanHandlers(), {
      transformPagePoint: this.node.getTransformPagePoint(),
      contextWindow: Ov(this.node)
    });
  }
  createPanHandlers() {
    const { onPanSessionStart: n, onPanStart: o, onPan: i, onPanEnd: a } = this.node.getProps();
    return {
      onSessionStart: Ju(n),
      onStart: Ju(o),
      onMove: Ju(i),
      onEnd: (c, d) => {
        delete this.session, a && Pe.postRender(() => a(c, d));
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
let ec = !1;
class vA extends C.Component {
  /**
   * This only mounts projection nodes for components that
   * need measuring, we might want to do it for all components
   * in order to incorporate transforms
   */
  componentDidMount() {
    const { visualElement: n, layoutGroup: o, switchLayoutGroup: i, layoutId: a } = this.props, { projection: c } = n;
    c && (o.group && o.group.add(c), i && i.register && a && i.register(c), ec && c.root.didUpdate(), c.addEventListener("animationComplete", () => {
      this.safeToRemove();
    }), c.setOptions({
      ...c.options,
      layoutDependency: this.props.layoutDependency,
      onExitComplete: () => this.safeToRemove()
    })), ia.hasEverUpdated = !0;
  }
  getSnapshotBeforeUpdate(n) {
    const { layoutDependency: o, visualElement: i, drag: a, isPresent: c } = this.props, { projection: d } = i;
    return d && (d.isPresent = c, n.layoutDependency !== o && d.setOptions({
      ...d.options,
      layoutDependency: o
    }), ec = !0, a || n.layoutDependency !== o || o === void 0 || n.isPresent !== c ? d.willUpdate() : this.safeToRemove(), n.isPresent !== c && (c ? d.promote() : d.relegate() || Pe.postRender(() => {
      const p = d.getStack();
      (!p || !p.members.length) && this.safeToRemove();
    }))), null;
  }
  componentDidUpdate() {
    const { visualElement: n, layoutAnchor: o } = this.props, { projection: i } = n;
    i && (i.options.layoutAnchor = o, i.root.didUpdate(), _d.postRender(() => {
      !i.currentAnimation && i.isLead() && this.safeToRemove();
    }));
  }
  componentWillUnmount() {
    const { visualElement: n, layoutGroup: o, switchLayoutGroup: i } = this.props, { projection: a } = n;
    ec = !0, a && (a.scheduleCheckAfterUnmount(), o && o.group && o.group.remove(a), i && i.deregister && i.deregister(a));
  }
  safeToRemove() {
    const { safeToRemove: n } = this.props;
    n && n();
  }
  render() {
    return null;
  }
}
function zv(e) {
  const [n, o] = Ev(), i = C.useContext(rd);
  return w.jsx(vA, { ...e, layoutGroup: i, switchLayoutGroup: C.useContext(Iv), isPresent: n, safeToRemove: o });
}
const SA = {
  pan: {
    Feature: gA
  },
  drag: {
    Feature: yA,
    ProjectionNode: bv,
    MeasureLayout: zv
  }
};
function xy(e, n, o) {
  const { props: i } = e;
  e.animationState && i.whileHover && e.animationState.setActive("whileHover", o === "Start");
  const a = "onHover" + o, c = i[a];
  c && Pe.postRender(() => c(n, bi(n)));
}
class wA extends Kn {
  mount() {
    const { current: n } = this.node;
    n && (this.unmount = U_(n, (o, i) => (xy(this.node, i, "Start"), (a) => xy(this.node, a, "End"))));
  }
  unmount() {
  }
}
class xA extends Kn {
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
function _y(e, n, o) {
  const { props: i } = e;
  if (e.current instanceof HTMLButtonElement && e.current.disabled)
    return;
  e.animationState && i.whileTap && e.animationState.setActive("whileTap", o === "Start");
  const a = "onTap" + (o === "End" ? "" : o), c = i[a];
  c && Pe.postRender(() => c(n, bi(n)));
}
class _A extends Kn {
  mount() {
    const { current: n } = this.node;
    if (!n)
      return;
    const { globalTapTarget: o, propagate: i } = this.node.props;
    this.unmount = Y_(n, (a, c) => (_y(this.node, c, "Start"), (d, { success: p }) => _y(this.node, d, p ? "End" : "Cancel")), {
      useGlobalTarget: o,
      stopPropagation: (i == null ? void 0 : i.tap) === !1
    });
  }
  unmount() {
  }
}
const Oc = /* @__PURE__ */ new WeakMap(), tc = /* @__PURE__ */ new WeakMap(), kA = (e) => {
  const n = Oc.get(e.target);
  n && n(e);
}, TA = (e) => {
  e.forEach(kA);
};
function AA({ root: e, ...n }) {
  const o = e || document;
  tc.has(o) || tc.set(o, {});
  const i = tc.get(o), a = JSON.stringify(n);
  return i[a] || (i[a] = new IntersectionObserver(TA, { root: e, ...n })), i[a];
}
function CA(e, n, o) {
  const i = AA(n);
  return Oc.set(e, o), i.observe(e), () => {
    Oc.delete(e), i.unobserve(e);
  };
}
const bA = {
  some: 0,
  all: 1
};
class EA extends Kn {
  constructor() {
    super(...arguments), this.hasEnteredView = !1, this.isInView = !1;
  }
  startObserver() {
    var y;
    (y = this.stopObserver) == null || y.call(this);
    const { viewport: n = {} } = this.node.getProps(), { root: o, margin: i, amount: a = "some", once: c } = n, d = {
      root: o ? o.current : void 0,
      rootMargin: i,
      threshold: typeof a == "number" ? a : bA[a]
    }, p = (v) => {
      const { isIntersecting: S } = v;
      if (this.isInView === S || (this.isInView = S, c && !S && this.hasEnteredView))
        return;
      S && (this.hasEnteredView = !0), this.node.animationState && this.node.animationState.setActive("whileInView", S);
      const { onViewportEnter: l, onViewportLeave: f } = this.node.getProps(), g = S ? l : f;
      g && g(v);
    };
    this.stopObserver = CA(this.node.current, d, p);
  }
  mount() {
    this.startObserver();
  }
  update() {
    if (typeof IntersectionObserver > "u")
      return;
    const { props: n, prevProps: o } = this.node;
    ["amount", "margin", "root"].some(PA(n, o)) && this.startObserver();
  }
  unmount() {
    var n;
    (n = this.stopObserver) == null || n.call(this), this.hasEnteredView = !1, this.isInView = !1;
  }
}
function PA({ viewport: e = {} }, { viewport: n = {} } = {}) {
  return (o) => e[o] !== n[o];
}
const MA = {
  inView: {
    Feature: EA
  },
  tap: {
    Feature: _A
  },
  focus: {
    Feature: xA
  },
  hover: {
    Feature: wA
  }
}, RA = {
  layout: {
    ProjectionNode: bv,
    MeasureLayout: zv
  }
}, NA = {
  ...tA,
  ...MA,
  ...SA,
  ...RA
}, DA = /* @__PURE__ */ XT(NA, ZT), on = DA;
function jA(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function Bv(e) {
  const n = String(e || "").toLowerCase();
  return n === "127.0.0.1" || n === "localhost" || n === "::1" || n === "[::1]";
}
function ky(e) {
  return Bv(e) || jA(e);
}
function IA(e) {
  return !e || Bv(e) ? "127.0.0.1" : e;
}
const FA = (() => {
  var S, l, f, g;
  const e = globalThis.window || globalThis, n = globalThis.document || {}, o = e.location || {}, i = String(e.SYNAPSE_DATA_API_PORT || ((l = (S = n.body) == null ? void 0 : S.dataset) == null ? void 0 : l.dataApiPort) || "3001").trim(), { protocol: a = "file:", hostname: c = "127.0.0.1", port: d = "" } = o, p = `http://${IA(c)}:${i || "3001"}`, y = String(e.SYNAPSE_DATA_API_BASE || ((g = (f = n.body) == null ? void 0 : f.dataset) == null ? void 0 : g.dataApiBase) || "").replace(/\/+$/, ""), v = `${a}//${o.host || (d ? `${c}:${d}` : c)}`.replace(/\/+$/, "");
  return y && !(ky(c) && d !== i && y === v) ? y : a === "file:" || ky(c) && d !== i ? p : `${a}//${o.host || c}`;
})(), OA = new tg(FA), nc = Number((globalThis.window || globalThis).SYNAPSE_DATA_API_TIMEOUT_MS || 6e3), LA = Number.isFinite(nc) && nc > 0 ? nc : 6e3;
function VA(e, n) {
  typeof window > "u" || console.warn(e, n);
}
async function zA(e) {
  var i, a;
  const o = (((a = (i = e.headers) == null ? void 0 : i.get) == null ? void 0 : a.call(i, "content-type")) || "").includes("application/json") ? await e.json() : {};
  if (!e.ok || (o == null ? void 0 : o.ok) === !1)
    throw new Error((o == null ? void 0 : o.error) || `Synapse data API returned HTTP ${e.status}`);
  return o;
}
async function BA(e, n = {}) {
  const o = await OA.fetch(e, {
    timeoutMs: LA,
    ...n
  });
  return zA(o);
}
async function UA(e) {
  try {
    return (await BA("/api/focus-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(e || {})
    })).item || null;
  } catch (n) {
    return VA("Synapse data API focus-session save skipped:", n), null;
  }
}
class $A {
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
const Uv = new $A();
function Nd(e, n) {
  return Uv.readJSON(e, n);
}
function Dd(e, n) {
  return Uv.writeJSON(e, n);
}
const $v = "synapse.focusRoom.sessions.v1", Hv = "synapse.focusRoom.draft.v1", Wv = "synapse.focusRoom.active-session.v1", Lc = 40, Ty = Object.freeze([
  "idle",
  "running",
  "paused",
  "completed",
  "break",
  "restoring"
]), HA = Object.freeze({
  studying: "running",
  running: "running",
  idle: "idle",
  paused: "paused",
  completed: "completed",
  break: "break",
  restoring: "restoring"
});
let Vc = [];
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
function WA(e = "") {
  const n = String(e || "");
  return Jr.find((o) => o.id === n) || Jr[Jr.length - 1];
}
function Gv(e = {}) {
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
], Wn = [
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
], GA = Wn, Kv = [25, 45, 50, 90];
function KA(e = "") {
  const n = String(e || "");
  return gi.find((o) => o.label === n) || gi[0];
}
function YA(e = "") {
  const n = String(e || "");
  return vi.find((o) => o.label === n) || vi[0];
}
function Fa(e = {}) {
  const n = KA(e == null ? void 0 : e.musicType), o = YA(e == null ? void 0 : e.ambientSound);
  return {
    musicTrack: n,
    ambientSound: o,
    ambientLayers: o.layers.map((i) => ({
      ...i,
      volumeBias: zn(i.volumeBias, 1)
    }))
  };
}
function QA(e) {
  return e && typeof e == "object" && !Array.isArray(e) ? e : {};
}
function Yv(e) {
  return String(e || "").trim();
}
function XA({ material: e, goal: n, durationMinutes: o }) {
  var S;
  const i = Math.max(10, Number(o) || 25), a = (S = e == null ? void 0 : e.studyHeadings) != null && S.length ? e.studyHeadings : ["Key ideas", "Examples", "Practice", "Review"], c = String(n || "").trim() || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`, d = Math.max(1, Math.floor(i * 0.2)), p = Math.max(1, Math.floor(i * 0.4)), y = Math.max(1, Math.floor(i * 0.2)), v = Math.max(1, i - d - p - y);
  return [
    { minutes: d, task: `Set the goal: ${c}` },
    { minutes: p, task: `Review ${a[0] || "the core ideas"}` },
    { minutes: y, task: `Practice with ${a[1] || a[0] || "the generated examples"}` },
    { minutes: v, task: "Summarize mistakes and choose the next study step" }
  ];
}
function Qv() {
  return Nd(Hv, null);
}
function ZA(e) {
  return Dd(Hv, e || null);
}
function Xv(e) {
  if (!e || typeof e != "object")
    return { materials: {} };
  const n = QA(e.materials);
  return {
    ...e,
    materials: { ...n }
  };
}
function oo(e, n = "idle") {
  const o = HA[String(e || "").trim().toLowerCase()];
  return o && Ty.includes(o) ? o : Ty.includes(n) ? n : "idle";
}
function jd(e) {
  return oo(e) === "running" ? "studying" : oo(e);
}
function Zv(e = {}, n = {}) {
  const o = e && typeof e == "object" ? e : {}, i = n && typeof n == "object" ? n : {}, a = Object.prototype.hasOwnProperty.call(o, "timerStatus"), c = Object.prototype.hasOwnProperty.call(o, "timerState") || Object.prototype.hasOwnProperty.call(o, "timerPhase"), d = oo(
    c ? o.timerState || o.timerPhase : a ? o.timerStatus : o.status || i.timerState,
    oo(i.timerState || i.timerPhase || i.timerStatus)
  ), p = o.timerMode === "countup" || i.timerMode === "countup" && !Object.prototype.hasOwnProperty.call(o, "timerMode") ? "countup" : "countdown", v = Object.fromEntries(["timerAnchorAtMs", "timerPausedAtMs", "timerUpdatedAtMs", "timerRestoredAtMs"].map((l) => {
    const f = Object.prototype.hasOwnProperty.call(o, l) ? o[l] : i[l], g = Number(f);
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
    timerStatus: jd(d),
    timerMode: p,
    elapsedSeconds: S,
    ...v
  };
}
function qv() {
  return Xv(Nd(Wv, null));
}
function qA(e) {
  return Dd(Wv, Xv(e));
}
function JA(e) {
  const n = Yv(e);
  if (!n) return null;
  const i = qv().materials[n];
  return i && typeof i == "object" ? Zv(i) : null;
}
function Id(e, n) {
  const o = Yv(e);
  if (!o) return !1;
  const i = qv();
  return n && typeof n == "object" ? i.materials[o] = {
    ...Zv(n, i.materials[o]),
    materialId: o,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  } : delete i.materials[o], qA(i);
}
function Jv(e) {
  return Id(e, null);
}
function zc() {
  const e = Nd($v, []), n = Array.isArray(e) ? e : [], o = /* @__PURE__ */ new Set();
  return [...Vc, ...n].filter((i) => {
    const a = String((i == null ? void 0 : i.sessionId) || "");
    return !a || o.has(a) ? !1 : (o.add(a), !0);
  }).slice(0, Lc);
}
function zn(e, n) {
  const o = Number(e);
  return Number.isFinite(o) ? o : n;
}
function eC(e = {}) {
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
  }, persisted: !0 }, a = zc().filter((y) => y.sessionId !== i.sessionId), c = [i, ...a.map((y) => ({ ...y, persisted: !0 }))].slice(0, Lc), d = Dd($v, c), p = { ...i, persisted: d };
  return UA(p).catch((y) => {
    console.warn("Synapse data API focus-session background save failed:", y);
  }), d ? Vc = [] : Vc = [p, ...a].slice(0, Lc), p;
}
function Fd(e) {
  const n = Math.max(0, zn(e || 0, 0)), o = Math.floor(n / 3600), i = Math.floor(n % 3600 / 60);
  return o ? `${o}h ${i}m` : `${i}m`;
}
const Ce = (e, n, o, i) => Object.freeze({ kind: e, duration: n, intensity: o, density: i }), Ay = Object.freeze({
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
function tC(e = "") {
  return Ay[String(e || "")] || Ay["morning-window"];
}
var qy;
const Bc = ((qy = Wn[0]) == null ? void 0 : qy.id) || "morning-window", qr = Kv[0] || 25, e0 = 10, _a = 180, nC = 0, rC = 100, oC = ["materials", "notes", "sources", "chat", "quiz", "flashcards", "mindmap", "plan", "workspace", "history"], Uc = new Set(oC), sa = {
  type: "spring",
  stiffness: 120,
  damping: 18,
  mass: 0.8
};
function iC(e, n, o, i) {
  const a = Number(e);
  return Number.isFinite(a) ? Math.min(i, Math.max(o, a)) : n;
}
function eo(e, n, o, i) {
  return Math.round(iC(e, n, o, i));
}
function yr(e, n = 50) {
  return eo(e, n, nC, rC);
}
function Si(e, n = qr) {
  return eo(e, n, e0, _a);
}
function Od(e) {
  return Wn.find((n) => n.id === e) || null;
}
function Gn(e = Bc) {
  return Od(e) || Wn[0] || {
    id: Bc,
    name: "Focus Room",
    kicker: "Focus",
    description: "A quiet study space.",
    image: "",
    ambientSound: "Nature",
    musicType: "Deep Focus"
  };
}
function t0(e) {
  return Array.isArray(e) ? e.map((n) => ({
    minutes: eo(n == null ? void 0 : n.minutes, 5, 1, _a),
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
function n0(e) {
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
function $c(e, n, o) {
  return e ? XA({
    material: e,
    goal: n,
    durationMinutes: o
  }) : [];
}
function Jt(e) {
  const n = Si(e);
  return n > 0 ? n * 60 : 0;
}
function ci(e) {
  const n = Math.max(0, Math.floor(Number(e) || 0)), o = Math.floor(n / 3600), i = Math.floor(n % 3600 / 60), a = n % 60, c = (d) => String(d).padStart(2, "0");
  return o ? `${o}:${c(i)}:${c(a)}` : `${c(i)}:${c(a)}`;
}
function Cy(e) {
  const n = (e == null ? void 0 : e.flashcards) || [];
  return Array.isArray(n) ? n.slice(0, 24) : [];
}
function sC(e, n) {
  return String((e == null ? void 0 : e.id) || (e == null ? void 0 : e.front) || (e == null ? void 0 : e.term) || n);
}
function aC(e) {
  var n;
  return Array.isArray(e == null ? void 0 : e.questions) ? e.questions : Array.isArray((n = e == null ? void 0 : e.quiz) == null ? void 0 : n.questions) ? e.quiz.questions : [];
}
function Hc(e) {
  return (Array.isArray(e == null ? void 0 : e.quizzes) ? e.quizzes : []).flatMap((o) => aC(o).map((i) => {
    var a;
    return {
      ...i,
      quizTitle: (o == null ? void 0 : o.title) || ((a = o == null ? void 0 : o.quiz) == null ? void 0 : a.title) || "Saved quiz"
    };
  })).slice(0, 12);
}
function lC(e, n) {
  return (e == null ? void 0 : e.question) || (e == null ? void 0 : e.prompt) || (e == null ? void 0 : e.stem) || `Question ${n + 1}`;
}
function Ld(e) {
  return String((e == null ? void 0 : e.type) || "").toLowerCase();
}
function uC(e) {
  return String((e == null ? void 0 : e.label) || (e == null ? void 0 : e.text) || e).trim();
}
function ka(e) {
  const n = (e == null ? void 0 : e.choices) || (e == null ? void 0 : e.options) || (e == null ? void 0 : e.answers);
  return Array.isArray(n) && n.length ? n.map(uC).filter(Boolean) : Ld(e) === "true_false" ? ["True", "False"] : [];
}
function Wc(e) {
  const n = (e == null ? void 0 : e.correctOptionIndexes) || (e == null ? void 0 : e.correct_option_indexes) || (e == null ? void 0 : e.correctIndexes);
  return Array.isArray(n) ? n.map((o) => Number(o)).filter(Number.isInteger) : [];
}
function cC(e, n) {
  const o = Array.isArray(e) ? [...e].map(Number).filter(Number.isInteger).sort((a, c) => a - c) : [], i = Array.isArray(n) ? [...n].map(Number).filter(Number.isInteger).sort((a, c) => a - c) : [];
  return o.length === i.length && o.every((a, c) => a === i[c]);
}
function gr(e) {
  return String(e || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function Ta(e, n) {
  if (Number.isInteger(n)) return n;
  const o = Number(n);
  if (typeof n != "string" && Number.isInteger(o)) return o;
  const i = ka(e), a = gr(n);
  return i.findIndex((c) => gr(c) === a);
}
function r0(e, n) {
  if (typeof n == "boolean") return n;
  if (n === 0) return !0;
  if (n === 1) return !1;
  const o = ka(e), i = gr(n);
  return i === "true" ? !0 : i === "false" ? !1 : gr(o[0]) === i ? !0 : gr(o[1]) === i ? !1 : null;
}
function dC(e, n, o) {
  const i = Ld(e);
  if (i === "multiple_choice") {
    const a = Ta(e, n);
    if (!Number.isInteger(a) || a < 0) return [];
    const c = Array.isArray(o) ? [...o] : [];
    return c.includes(a) ? c.filter((d) => d !== a) : [...c, a].sort((d, p) => d - p);
  }
  if (i === "single_choice") {
    const a = Ta(e, n);
    return Number.isInteger(a) && a >= 0 ? a : "";
  }
  if (i === "true_false") {
    const a = r0(e, n);
    return a === null ? "" : a;
  }
  return String(n || "");
}
function o0(e) {
  const n = (e == null ? void 0 : e.correctAnswer) ?? (e == null ? void 0 : e.correct_answer) ?? (e == null ? void 0 : e.answer) ?? (e == null ? void 0 : e.correct), o = Wc(e);
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
function fC(e, n) {
  const o = Ld(e);
  if (o === "single_choice") {
    const a = Wc(e)[0], c = Ta(e, n);
    return Number.isInteger(a) ? c === a : null;
  }
  if (o === "multiple_choice") {
    const a = Wc(e), c = Array.isArray(n) ? n : [Ta(e, n)].filter(Number.isInteger);
    return a.length ? cC(c, a) : null;
  }
  if (o === "true_false") {
    const a = typeof (e == null ? void 0 : e.correctBoolean) == "boolean" ? e.correctBoolean : e == null ? void 0 : e.correct_boolean, c = r0(e, n);
    return typeof a == "boolean" && c !== null ? c === a : null;
  }
  const i = o0(e);
  return i ? gr(n) === gr(i) : null;
}
function i0(e, n, o) {
  var p;
  const i = String(e || "").trim(), a = String((n == null ? void 0 : n.summaryText) || (n == null ? void 0 : n.aiSummary) || "").slice(0, 420), c = ((p = n == null ? void 0 : n.studyHeadings) == null ? void 0 : p[0]) || (n == null ? void 0 : n.materialTitle) || "this material", d = o || `Study ${(n == null ? void 0 : n.materialTitle) || "this material"}`;
  return i ? [
    `For ${c}: ${a || "use the selected material as your main source."}`,
    `Your current goal is: ${d}.`,
    "Try explaining the idea in one sentence, then test yourself with one example before moving on."
  ].join(" ") : "";
}
function pC() {
  return /* @__PURE__ */ w.jsx("svg", { className: "liquid-glass-filter-defs", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ w.jsx("defs", { children: /* @__PURE__ */ w.jsxs("filter", { id: "liquid-glass-displacement", x: "-12%", y: "-12%", width: "124%", height: "124%", colorInterpolationFilters: "sRGB", children: [
    /* @__PURE__ */ w.jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.012 0.024", numOctaves: "2", seed: "17", result: "liquid-noise" }),
    /* @__PURE__ */ w.jsx("feDisplacementMap", { in: "SourceGraphic", in2: "liquid-noise", scale: "7", xChannelSelector: "R", yChannelSelector: "B", result: "refracted-surface" }),
    /* @__PURE__ */ w.jsx("feColorMatrix", { in: "refracted-surface", type: "matrix", values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.04 0", result: "edge-alpha" }),
    /* @__PURE__ */ w.jsx("feGaussianBlur", { in: "edge-alpha", stdDeviation: "0.25", result: "soft-edge" }),
    /* @__PURE__ */ w.jsx("feBlend", { in: "soft-edge", in2: "refracted-surface", mode: "screen" })
  ] }) }) });
}
function hC({ profile: e, paused: n = !1, reducedMotion: o = !1 }) {
  var a;
  if (o || !((a = e == null ? void 0 : e.layers) != null && a.length)) return null;
  const i = e.layers.filter((c) => c.kind !== "camera");
  return /* @__PURE__ */ w.jsx("div", { className: `scene-motion-layer ${n ? "is-paused" : ""}`.trim(), "aria-hidden": "true", children: i.map((c, d) => /* @__PURE__ */ w.jsx(
    "span",
    {
      className: `scene-motion scene-motion-${c.kind}`,
      style: {
        "--motion-duration": `${c.duration}s`,
        "--motion-intensity": c.intensity,
        "--motion-density": c.density,
        "--motion-delay": `${-d * 3.7}s`
      }
    },
    `${e.id}-${c.kind}-${d}`
  )) });
}
function mC({ scene: e }) {
  const [n, o] = C.useState(e), [i, a] = C.useState(!1), [c, d] = C.useState(!1), [p, y] = C.useState(() => {
    var g;
    return ((g = globalThis.document) == null ? void 0 : g.visibilityState) === "hidden";
  }), [v, S] = C.useState(() => {
    var g, x;
    return ((x = (g = globalThis.matchMedia) == null ? void 0 : g.call(globalThis, "(prefers-reduced-motion: reduce)")) == null ? void 0 : x.matches) || !1;
  });
  C.useEffect(() => {
    a(!1), d(!1);
  }, [n == null ? void 0 : n.id]), C.useEffect(() => {
    if (!(e != null && e.id) || e.id === (n == null ? void 0 : n.id)) return;
    let g = !1;
    const x = new Image();
    return x.onload = () => {
      g || o(e);
    }, x.onerror = () => {
      g || d(!0);
    }, x.src = e.image, () => {
      g = !0, x.onload = null, x.onerror = null;
    };
  }, [n == null ? void 0 : n.id, e]), C.useEffect(() => {
    var x, T;
    const g = () => {
      var _;
      return y(((_ = globalThis.document) == null ? void 0 : _.visibilityState) === "hidden");
    };
    return (T = (x = globalThis.document) == null ? void 0 : x.addEventListener) == null || T.call(x, "visibilitychange", g), () => {
      var _, A;
      return (A = (_ = globalThis.document) == null ? void 0 : _.removeEventListener) == null ? void 0 : A.call(_, "visibilitychange", g);
    };
  }, []), C.useEffect(() => {
    var T, _;
    const g = (T = globalThis.matchMedia) == null ? void 0 : T.call(globalThis, "(prefers-reduced-motion: reduce)");
    if (!g) return;
    const x = (A) => S(!!A.matches);
    return S(!!g.matches), (_ = g.addEventListener) == null || _.call(g, "change", x), () => {
      var A;
      return (A = g.removeEventListener) == null ? void 0 : A.call(g, "change", x);
    };
  }, []);
  const l = tC((n == null ? void 0 : n.motionProfile) || (n == null ? void 0 : n.id)), f = l.layers.find((g) => g.kind === "camera");
  return /* @__PURE__ */ w.jsxs("div", { className: "focus-background-wrap", "aria-hidden": "true", children: [
    /* @__PURE__ */ w.jsx(pC, {}),
    /* @__PURE__ */ w.jsx(ja, { mode: "sync", children: /* @__PURE__ */ w.jsxs(
      on.div,
      {
        className: `focus-background ${i && !v ? "has-scene-motion" : ""} ${p ? "is-motion-paused" : ""}`.trim(),
        style: { backgroundImage: c ? "none" : void 0 },
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
              style: { "--scene-camera-duration": `${(f == null ? void 0 : f.duration) || 36}s`, "--scene-camera-intensity": (f == null ? void 0 : f.intensity) || 0.2 },
              onLoad: () => a(!0),
              onError: () => d(!0)
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
              onError: () => d(!0)
            }
          ) : null,
          /* @__PURE__ */ w.jsx(hC, { profile: l, paused: p, reducedMotion: v })
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
const yC = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), gC = (e) => e.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (n, o, i) => i ? i.toUpperCase() : o.toLowerCase()
), by = (e) => {
  const n = gC(e);
  return n.charAt(0).toUpperCase() + n.slice(1);
}, s0 = (...e) => e.filter((n, o, i) => !!n && n.trim() !== "" && i.indexOf(n) === o).join(" ").trim(), vC = (e) => {
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
var SC = {
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
const wC = C.forwardRef(
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
      ...SC,
      width: n,
      height: n,
      stroke: e,
      strokeWidth: i ? Number(o) * 24 / Number(n) : o,
      className: s0("lucide", a),
      ...!c && !vC(p) && { "aria-hidden": "true" },
      ...p
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
const Te = (e, n) => {
  const o = C.forwardRef(
    ({ className: i, ...a }, c) => C.createElement(wC, {
      ref: c,
      iconNode: n,
      className: s0(
        `lucide-${yC(by(e))}`,
        `lucide-${e}`,
        i
      ),
      ...a
    })
  );
  return o.displayName = by(e), o;
};
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const xC = [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
], _C = Te("arrow-left", xC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const kC = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
], Gc = Te("arrow-right", kC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const TC = [
  ["path", { d: "M12 7v14", key: "1akyts" }],
  [
    "path",
    {
      d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",
      key: "ruj8y"
    }
  ]
], AC = Te("book-open", TC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const CC = [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]], bC = Te("check", CC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const EC = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", key: "1u773s" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }]
], PC = Te("circle-help", EC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const MC = [
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
], RC = Te("coffee", MC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const NC = [
  ["rect", { width: "12", height: "12", x: "2", y: "10", rx: "2", ry: "2", key: "6agr2n" }],
  [
    "path",
    { d: "m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6", key: "1o487t" }
  ],
  ["path", { d: "M6 18h.01", key: "uhywen" }],
  ["path", { d: "M10 14h.01", key: "ssrbsk" }],
  ["path", { d: "M15 6h.01", key: "cblpky" }],
  ["path", { d: "M18 9h.01", key: "2061c0" }]
], DC = Te("dices", NC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const jC = [
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
], IC = Te("door-open", jC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const FC = [
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
], Aa = Te("footprints", FC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const OC = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }],
  ["path", { d: "M12 7v5l4 2", key: "1fdv2h" }]
], Kc = Te("history", OC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const LC = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2", key: "1m3agn" }],
  ["circle", { cx: "9", cy: "9", r: "2", key: "af1f0g" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "1xmnt7" }]
], VC = Te("image", LC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const zC = [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 9.9-1", key: "1mm8w8" }]
], BC = Te("lock-open", zC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const UC = [
  ["rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2", key: "1w4ew1" }],
  ["path", { d: "M7 11V7a5 5 0 0 1 10 0v4", key: "fwvmzm" }]
], $C = Te("lock", UC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const HC = [
  ["path", { d: "m14 10 7-7", key: "oa77jy" }],
  ["path", { d: "M20 10h-6V4", key: "mjg0md" }],
  ["path", { d: "m3 21 7-7", key: "tjx5ai" }],
  ["path", { d: "M4 14h6v6", key: "rmj7iw" }]
], a0 = Te("minimize-2", HC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const WC = [
  ["circle", { cx: "8", cy: "18", r: "4", key: "1fc0mg" }],
  ["path", { d: "M12 18V2l7 4", key: "g04rme" }]
], l0 = Te("music-2", WC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const GC = [
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
], KC = Te("notebook-pen", GC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const YC = [
  ["rect", { x: "14", y: "4", width: "4", height: "16", rx: "1", key: "zuxfzm" }],
  ["rect", { x: "6", y: "4", width: "4", height: "16", rx: "1", key: "1okwgv" }]
], Ca = Te("pause", YC);
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
      d: "M18.5 8c-1.4 0-2.6-.8-3.2-2A6.87 6.87 0 0 0 2 9v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.5C22 9.6 20.4 8 18.5 8",
      key: "lag0yf"
    }
  ],
  ["path", { d: "M2 14h20", key: "myj16y" }],
  ["path", { d: "M6 14v4", key: "9ng0ue" }],
  ["path", { d: "M10 14v4", key: "1v8uk5" }],
  ["path", { d: "M14 14v4", key: "1tqops" }],
  ["path", { d: "M18 14v4", key: "18uqwm" }]
], XC = Te("piano", QC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ZC = [["polygon", { points: "6 3 20 12 6 21 6 3", key: "1oa8hb" }]], Vd = Te("play", ZC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const qC = [
  ["path", { d: "M4.9 19.1C1 15.2 1 8.8 4.9 4.9", key: "1vaf9d" }],
  ["path", { d: "M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5", key: "u1ii0m" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }],
  ["path", { d: "M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5", key: "1j5fej" }],
  ["path", { d: "M19.1 4.9C23 8.8 23 15.1 19.1 19", key: "10b0cb" }]
], u0 = Te("radio", qC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const JC = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
], c0 = Te("rotate-ccw", JC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const eb = [
  [
    "path",
    {
      d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
      key: "1c8476"
    }
  ],
  ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7", key: "1ydtos" }],
  ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7", key: "t51u73" }]
], tb = Te("save", eb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const nb = [
  ["path", { d: "M14 17H5", key: "gfn3mx" }],
  ["path", { d: "M19 7h-9", key: "6i9tg" }],
  ["circle", { cx: "17", cy: "17", r: "3", key: "18b49y" }],
  ["circle", { cx: "7", cy: "7", r: "3", key: "dfmy0x" }]
], wi = Te("settings-2", nb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const rb = [
  ["polygon", { points: "5 4 15 12 5 20 5 4", key: "16p6eg" }],
  ["line", { x1: "19", x2: "19", y1: "5", y2: "19", key: "futhcm" }]
], zd = Te("skip-forward", rb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ob = [
  ["line", { x1: "21", x2: "14", y1: "4", y2: "4", key: "obuewd" }],
  ["line", { x1: "10", x2: "3", y1: "4", y2: "4", key: "1q6298" }],
  ["line", { x1: "21", x2: "12", y1: "12", y2: "12", key: "1iu8h1" }],
  ["line", { x1: "8", x2: "3", y1: "12", y2: "12", key: "ntss68" }],
  ["line", { x1: "21", x2: "16", y1: "20", y2: "20", key: "14d8ph" }],
  ["line", { x1: "12", x2: "3", y1: "20", y2: "20", key: "m0wm8r" }],
  ["line", { x1: "14", x2: "14", y1: "2", y2: "6", key: "14e1ph" }],
  ["line", { x1: "8", x2: "8", y1: "10", y2: "14", key: "1i6ji0" }],
  ["line", { x1: "16", x2: "16", y1: "18", y2: "22", key: "1lctlv" }]
], ib = Te("sliders-horizontal", ob);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const sb = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
], ab = Te("square-check", sb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const lb = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["circle", { cx: "12", cy: "12", r: "6", key: "1vlfrh" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }]
], ub = Te("target", lb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const cb = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744", key: "16gr8j" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }]
], ba = Te("users", cb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const db = [
  [
    "path",
    {
      d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
      key: "uqj9uw"
    }
  ],
  ["path", { d: "M16 9a5 5 0 0 1 0 6", key: "1q6k2b" }],
  ["path", { d: "M19.364 18.364a9 9 0 0 0 0-12.728", key: "ijwkga" }]
], Oa = Te("volume-2", db);
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
      d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
      key: "uqj9uw"
    }
  ],
  ["line", { x1: "22", x2: "16", y1: "9", y2: "15", key: "1ewh16" }],
  ["line", { x1: "16", x2: "22", y1: "9", y2: "15", key: "5ykzw1" }]
], pb = Te("volume-x", fb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const hb = [
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
], d0 = Te("waves", hb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const mb = [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
], f0 = Te("x", mb);
function yb({ onStart: e, onWorkspace: n, onHistory: o }) {
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
        /* @__PURE__ */ w.jsx("button", { type: "button", className: "focus-landing-icon", onClick: o, "aria-label": "Open Focus Trail", title: "Open Focus Trail", children: /* @__PURE__ */ w.jsx(Kc, { size: 16, "aria-hidden": "true" }) }),
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
        /* @__PURE__ */ w.jsx(Gc, { size: 17, "aria-hidden": "true" })
      ] }),
      /* @__PURE__ */ w.jsxs("div", { className: "focus-landing-secondary", "aria-label": "Synapse Focus Room shortcuts", children: [
        /* @__PURE__ */ w.jsxs("span", { children: [
          /* @__PURE__ */ w.jsx(AC, { size: 13, "aria-hidden": "true" }),
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
          /* @__PURE__ */ w.jsx("button", { type: "button", className: "focus-landing-icon", onClick: o, "aria-label": "Open Focus Trail", title: "Open Focus Trail", children: /* @__PURE__ */ w.jsx(Kc, { size: 17, "aria-hidden": "true" }) }),
          /* @__PURE__ */ w.jsx("button", { type: "button", className: "focus-landing-icon", onClick: n, "aria-label": "Open Synapse workspace", title: "Open Synapse workspace", children: /* @__PURE__ */ w.jsx(wi, { size: 17, "aria-hidden": "true" }) }),
          /* @__PURE__ */ w.jsx("button", { type: "button", className: "focus-landing-icon", onClick: e, "aria-label": "Start studying", title: "Start studying", children: /* @__PURE__ */ w.jsx(Gc, { size: 17, "aria-hidden": "true" }) })
        ] })
      ] }),
      /* @__PURE__ */ w.jsx("div", { className: "focus-landing-footer-meta", children: "Synapse Focus Room · Your materials, your pace, your space" })
    ] })
  ] });
}
const Ey = (e) => {
  let n;
  const o = /* @__PURE__ */ new Set(), i = (v, S) => {
    const l = typeof v == "function" ? v(n) : v;
    if (!Object.is(l, n)) {
      const f = n;
      n = S ?? (typeof l != "object" || l === null) ? l : Object.assign({}, n, l), o.forEach((g) => g(n, f));
    }
  }, a = () => n, p = { setState: i, getState: a, getInitialState: () => y, subscribe: (v) => (o.add(v), () => o.delete(v)) }, y = n = e(i, a, p);
  return p;
}, gb = ((e) => e ? Ey(e) : Ey), vb = (e) => e;
function Sb(e, n = vb) {
  const o = gn.useSyncExternalStore(
    e.subscribe,
    gn.useCallback(() => n(e.getState()), [e, n]),
    gn.useCallback(() => n(e.getInitialState()), [e, n])
  );
  return gn.useDebugValue(o), o;
}
const Py = (e) => {
  const n = gb(e), o = (i) => Sb(n, i);
  return Object.assign(o, n), o;
}, wb = ((e) => e ? Py(e) : Py), Bd = Object.freeze({
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
function xb() {
  return Wn[0] || Gn(Bc);
}
function _b(e) {
  const n = String(e || "");
  if (!n) return null;
  const i = n0(Qv()).materials[n];
  return i && typeof i == "object" ? i : null;
}
function Xt(e) {
  var i;
  const n = String(e.selectedMaterialId || ((i = e.selectedMaterial) == null ? void 0 : i.materialId) || "");
  if (!n) return;
  const o = n0(Qv());
  o.materials[n] = {
    materialId: n,
    selectedScene: e.selectedScene,
    musicType: e.musicType,
    ambientSound: e.ambientSound,
    musicVolume: yr(e.musicVolume),
    ambientVolume: yr(e.ambientVolume),
    audioChannels: { ...Bd, ...e.audioChannels || {} },
    durationMinutes: Si(e.pomodoroDuration),
    studyGoal: e.studyGoal,
    studyPlan: t0(e.studyPlan),
    completedTasks: Array.isArray(e.completedTasks) ? e.completedTasks.filter(Boolean) : [],
    workspaceNotes: String(e.workspaceNotes || ""),
    workspaceUpdatedAt: e.workspaceUpdatedAt || "",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }, ZA(o);
}
function kb(e) {
  return Array.isArray(e == null ? void 0 : e.completedTasks) ? e.completedTasks.map((n) => String(n || "").trim()).filter(Boolean) : [];
}
function Yc(e = {}) {
  return {
    sectionTitle: String(e.sectionTitle || "").trim(),
    excerpt: String(e.excerpt || "").trim().slice(0, 1800)
  };
}
function p0(e = null) {
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
function mt() {
  const e = Date.now();
  return Number.isFinite(e) ? e : 0;
}
function Ut(e = {}) {
  return oo(e.timerState || e.timerPhase || e.status || e.timerStatus);
}
function Bn(e = {}) {
  if (e.timerMode === "countup") return 0;
  const n = Number(e.timerDurationSeconds);
  return Number.isFinite(n) && n > 0 ? n : Jt(e.pomodoroDuration);
}
function di(e = {}, n = mt()) {
  const o = Math.max(0, Number(e.elapsedSeconds) || 0);
  if (Ut(e) !== "running") return o;
  const i = Number(e.timerAnchorAtMs);
  return !Number.isFinite(i) || i <= 0 ? o : Math.max(o, Math.floor(Math.max(0, n - i) / 1e3));
}
function Bt(e, n = mt()) {
  const o = oo(e);
  return {
    timerState: o,
    timerPhase: o,
    status: o,
    timerStatus: jd(o),
    timerUpdatedAtMs: n
  };
}
function Tb(e = {}) {
  const n = Ut(e);
  return {
    timerState: n,
    timerPhase: n,
    status: n,
    timerStatus: jd(n),
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
function mn(e) {
  var o;
  const n = String(e.selectedMaterialId || ((o = e.selectedMaterial) == null ? void 0 : o.materialId) || "");
  return !n || e.view !== "session" ? !1 : Id(n, Tb(e));
}
function My(e, n = mt()) {
  const o = di(e, n), i = Bn(e), a = e.timerMode !== "countup" && i > 0 && o >= i, c = a ? "completed" : Ut(e);
  return {
    ...Bt(c, n),
    elapsedSeconds: a ? i : o,
    timerAnchorAtMs: c === "running" ? e.timerAnchorAtMs : null,
    timerPausedAtMs: c === "running" ? null : e.timerPausedAtMs || n,
    audioPlaying: c === "running" ? e.audioPlaying : !1
  };
}
function Ab(e, n = {}) {
  const o = Gn(n.selectedScene), i = _b(e == null ? void 0 : e.materialId), a = Od(i == null ? void 0 : i.selectedScene) ? i.selectedScene : o.id, c = Gn(a), d = String((i == null ? void 0 : i.musicType) || c.musicType || "Deep Focus"), p = String((i == null ? void 0 : i.ambientSound) || c.ambientSound || "Nature"), y = yr(i == null ? void 0 : i.musicVolume, n.musicVolume ?? 60), v = yr(i == null ? void 0 : i.ambientVolume, n.ambientVolume ?? 50), S = Si(i == null ? void 0 : i.durationMinutes, n.pomodoroDuration ?? qr), l = String((i == null ? void 0 : i.studyGoal) || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`), f = t0(i == null ? void 0 : i.studyPlan), g = f.length ? f : $c(e, l, S), x = kb(i), T = String((i == null ? void 0 : i.workspaceNotes) || ""), _ = (i == null ? void 0 : i.workspaceUpdatedAt) || (i == null ? void 0 : i.updatedAt) || "";
  return {
    selectedScene: a,
    musicType: d,
    ambientSound: p,
    musicVolume: y,
    ambientVolume: v,
    audioChannels: { ...Bd, ...(i == null ? void 0 : i.audioChannels) || n.audioChannels || {} },
    pomodoroDuration: S,
    studyGoal: l,
    studyPlan: g,
    completedTasks: x,
    workspaceNotes: T,
    workspaceUpdatedAt: _
  };
}
function Cb(e) {
  const n = JA(e);
  if (!n || typeof n != "object") return null;
  const o = Ut(n), i = mt(), a = Number(n.timerAnchorAtMs), c = Date.parse(n.startedAt || ""), d = Number.isFinite(c) ? c : NaN, p = o === "running" ? di({
    ...n,
    timerState: "running",
    timerAnchorAtMs: Number.isFinite(a) && a > 0 ? a : d
  }, i) : Math.max(0, Number(n.elapsedSeconds) || 0), y = Bn(n), v = o === "running" ? y > 0 && p >= y ? "completed" : "paused" : o, S = o === "running";
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
    panelTab: Uc.has(n.panelTab) ? n.panelTab : "materials",
    workspaceNotes: String(n.workspaceNotes || ""),
    workspaceUpdatedAt: n.workspaceUpdatedAt || n.updatedAt || "",
    activeNoteSection: String(n.activeNoteSection || ""),
    activeSourceHighlight: p0(n.activeSourceHighlight),
    assistantContext: Yc(n.assistantContext),
    audioPlaying: !1
  };
}
function Ws() {
  return {
    completedTasks: [],
    flashcardIndex: 0,
    flashcardSide: "front",
    flashcardProgress: {},
    quizAnswers: {},
    quizChecked: {}
  };
}
function bb(e) {
  return Object.values(e.flashcardProgress || {}).filter((n) => n && n.difficulty).length;
}
function Eb(e) {
  const n = Object.values(e.quizChecked || {}).filter((i) => i && i.hasKnownAnswer);
  if (!n.length) return null;
  const o = n.filter((i) => i.correct).length;
  return Math.round(o / n.length * 100);
}
function Pb(e) {
  const n = Hc(e.selectedMaterial);
  return Object.entries(e.quizChecked || {}).filter(([, o]) => o && o.hasKnownAnswer && !o.correct).map(([o]) => lC(n[Number(o)], Number(o))).filter(Boolean);
}
async function Mb(e, n, o, i = {}) {
  var d, p;
  if (!globalThis.apiClient || typeof globalThis.apiClient.fetch != "function")
    return {
      answer: i0(e, o, $.getState().studyGoal),
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
const $ = wb((e, n) => {
  const o = xb();
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
    audioChannels: { ...Bd },
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
    timerDurationSeconds: Jt(qr),
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
      const a = Gn(i.selectedScene);
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
      const v = d.selectedMaterialId === y, S = v && c ? null : Cb(y), l = v && c ? {} : Ab(a, d), f = v && c ? {} : {
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
        timerDurationSeconds: Jt(l.pomodoroDuration || qr),
        elapsedSeconds: 0,
        startedAt: null,
        currentSession: null,
        ...Ws(),
        chatMessages: [],
        chatPending: !1,
        chatError: "",
        activeNoteSection: "",
        activeSourceHighlight: null,
        assistantContext: { sectionTitle: "", excerpt: "" }
      }, g = v && c ? d.view === "session" ? "session" : "setup" : (S == null ? void 0 : S.view) === "session" ? "session" : "setup";
      if (e({
        ...l,
        ...f,
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
          const T = n();
          if (T.selectedMaterialId !== y || T.timerState !== "restoring") return;
          const _ = mt(), A = Bn(T), R = A > 0 ? Math.min(A, Math.max(0, Number(T.elapsedSeconds) || 0)) : Math.max(0, Number(T.elapsedSeconds) || 0), P = {
            ...Bt(x, _),
            timerRestoreTarget: null,
            timerAnchorAtMs: null,
            timerPausedAtMs: x === "paused" ? _ : null,
            timerRestoredAtMs: _,
            elapsedSeconds: R,
            audioPlaying: !1
          };
          e(P), mn({ ...T, ...P });
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
        sessionHistory: zc()
      });
    },
    selectScene(i) {
      const a = Od(i);
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
        const c = Si(i, a.pomodoroDuration), d = a.selectedMaterial ? $c(a.selectedMaterial, a.studyGoal, c) : [], p = {
          pomodoroDuration: c,
          studyPlan: d,
          timerDurationSeconds: a.timerMode === "countup" ? 0 : Jt(c)
        };
        return Xt({ ...a, ...p }), p;
      });
    },
    setSessionDuration(i, a = 0) {
      e((c) => {
        const d = Math.max(0, Number.parseInt(i, 10) || 0), p = Math.min(59, Math.max(0, Number.parseInt(a, 10) || 0)), y = d * 60 + p, v = Jt(e0), S = Jt(_a), l = c.timerMode === "countup" ? 0 : Math.min(S, Math.max(v, y || Jt(c.pomodoroDuration))), f = c.timerMode === "countup" ? Si(i, c.pomodoroDuration) : Math.floor(l / 60), g = mt(), x = Ut(c), T = di(c, g), _ = c.timerMode === "countup" ? T : Math.min(T, l), A = x === "completed" ? "paused" : x, R = {
          pomodoroDuration: f,
          timerDurationSeconds: l,
          elapsedSeconds: _,
          ...Bt(A, g),
          timerAnchorAtMs: A === "running" ? g - _ * 1e3 : null,
          timerPausedAtMs: A === "paused" ? g : null
        };
        return Xt({ ...c, ...R }), mn({ ...c, ...R }), R;
      });
    },
    setStudyGoal(i) {
      e((a) => {
        const c = String(i ?? ""), d = a.selectedMaterial ? $c(a.selectedMaterial, c, a.pomodoroDuration) : [], p = { studyGoal: c, studyPlan: d };
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
        const c = WA(i), d = {
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
      const a = Uc.has(String(i || "")) ? String(i) : "materials";
      e({
        panelTab: a,
        aiPanelOpen: !0,
        activeDrawer: ""
      });
    },
    selectSourceHighlight(i = null, { openPanel: a = !0 } = {}) {
      const c = p0(i);
      e({
        activeSourceHighlight: c,
        activeNoteSection: (c == null ? void 0 : c.sectionTitle) || n().activeNoteSection || "",
        assistantContext: c ? Yc({
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
        panelTab: Uc.has(a) ? a : "materials",
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
        timerUpdatedAtMs: mt(),
        timerRestoredAtMs: null,
        timerDurationSeconds: Jt(i.pomodoroDuration),
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
        ...Ws(),
        chatMessages: [],
        chatPending: !1,
        chatError: ""
      });
    },
    startTimer() {
      const i = n(), a = mt(), c = Ut(i);
      if (c === "running") {
        n().tickTimer();
        return;
      }
      const d = Bn(i), p = c === "completed" || c === "break" || d > 0 && i.elapsedSeconds >= d, y = p ? 0 : Math.max(0, Number(i.elapsedSeconds) || 0), v = {
        view: "session",
        route: "session",
        ...Bt("running", a),
        audioPlaying: i.audioPlaying,
        summaryRecord: null,
        elapsedSeconds: y,
        startedAt: !i.startedAt || p ? new Date(a).toISOString() : i.startedAt,
        timerAnchorAtMs: a - y * 1e3,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        timerDurationSeconds: d,
        ...p ? Ws() : {}
      };
      e(v), mn({ ...i, ...v });
    },
    pauseTimer({ pauseAudio: i = !0 } = {}) {
      const a = n(), c = mt();
      if (Ut(a) !== "running") {
        i && a.audioPlaying && e({ audioPlaying: !1 });
        return;
      }
      const d = My(a, c), p = {
        ...d,
        ...Bt(d.timerState === "completed" ? "completed" : "paused", c),
        timerAnchorAtMs: null,
        timerPausedAtMs: c,
        audioPlaying: i ? !1 : a.audioPlaying
      };
      e(p), mn({ ...a, ...p });
    },
    resetTimer() {
      const i = mt(), a = {
        ...Bt("idle", i),
        timerRestoreTarget: null,
        timerMode: "countdown",
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerDurationSeconds: Jt(n().pomodoroDuration),
        audioPlaying: !1,
        startedAt: null,
        elapsedSeconds: 0,
        summaryRecord: null,
        ...Ws()
      };
      e(a), mn({ ...n(), ...a });
    },
    skipTimer() {
      const i = n(), a = mt(), c = Bn(i), d = {
        ...Bt("completed", a),
        elapsedSeconds: c || Math.max(0, Number(i.elapsedSeconds) || 0),
        audioPlaying: !1,
        startedAt: i.startedAt || new Date(a).toISOString(),
        timerAnchorAtMs: null,
        timerPausedAtMs: a,
        timerDurationSeconds: c
      };
      e(d), mn({ ...i, ...d });
    },
    tickTimer() {
      const i = n();
      if (i.view !== "session" || Ut(i) !== "running") return;
      const a = mt(), c = Bn(i), d = c ? Math.min(c, di(i, a)) : di(i, a), p = c > 0 && d >= c ? "completed" : "running", y = {
        ...Bt(p, a),
        elapsedSeconds: d,
        timerAnchorAtMs: p === "running" ? i.timerAnchorAtMs : null,
        timerPausedAtMs: p === "running" ? null : a,
        timerDurationSeconds: c,
        audioPlaying: p === "running" ? i.audioPlaying : !1
      };
      d === i.elapsedSeconds && p === Ut(i) || (e(y), mn({ ...i, ...y }));
    },
    setTimerMode(i = "countdown") {
      const a = i === "countup" ? "countup" : "countdown", c = {
        timerMode: a,
        timerDurationSeconds: a === "countup" ? 0 : Jt(n().pomodoroDuration)
      };
      e(c), mn({ ...n(), ...c });
    },
    startBreak() {
      const i = mt(), a = {
        ...Bt("break", i),
        timerRestoreTarget: null,
        timerAnchorAtMs: null,
        timerPausedAtMs: i,
        timerDurationSeconds: 0,
        audioPlaying: !1
      };
      e(a), mn({ ...n(), ...a });
    },
    getTimerState() {
      return Ut(n());
    },
    endSession() {
      var S;
      const i = n(), a = mt(), c = new Date(a).toISOString(), d = Ut(i) === "running" ? My(i, a) : i, p = Bn(d), y = p ? Math.min(p, d.elapsedSeconds) : d.elapsedSeconds, v = eC({
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
      Jv("focus-room"), e({
        summaryRecord: v,
        sessionHistory: zc(),
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
      e({ assistantContext: Yc(i) });
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
        const v = String(y.task || ""), S = c == null ? v : String(c || "").trim(), l = a == null ? y.minutes : eo(a, y.minutes, 1, _a), f = d.studyPlan.map((T, _) => _ === p ? { minutes: l, task: S || v } : T);
        let g = d.completedTasks;
        v && v !== f[p].task && g.includes(v) && (g = g.filter((T) => T !== v).concat(f[p].task));
        const x = { studyPlan: f, completedTasks: g };
        return Xt({ ...d, ...x }), x;
      });
    },
    setFlashcardIndex(i) {
      const a = Cy(n().selectedMaterial);
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
      const a = n(), c = Cy(a.selectedMaterial);
      if (!c.length) return;
      const d = eo(a.flashcardIndex, 0, 0, c.length - 1), p = c[d], y = ["easy", "medium", "hard"].includes(String(i)) ? String(i) : "medium";
      e({
        flashcardProgress: {
          ...a.flashcardProgress,
          [sC(p, d)]: {
            difficulty: y,
            reviewedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        },
        flashcardSide: "front",
        flashcardIndex: d < c.length - 1 ? d + 1 : d
      });
    },
    answerQuizQuestion(i, a) {
      const c = Number(i), d = Hc(n().selectedMaterial)[c];
      if (!d) return;
      const p = String(c);
      e((y) => ({
        quizAnswers: {
          ...y.quizAnswers,
          [p]: dC(d, a, y.quizAnswers[p])
        }
      }));
    },
    checkQuizQuestion(i) {
      const a = Hc(n().selectedMaterial), c = Number(i), d = a[c];
      if (!d) return;
      const p = String(c), y = n(), v = Object.prototype.hasOwnProperty.call(y.quizAnswers, p) ? y.quizAnswers[p] : "", S = fC(d, v), l = o0(d);
      e({
        quizChecked: {
          ...y.quizChecked,
          [p]: {
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
        const y = await Mb(a, p, d, c.assistantContext);
        e((v) => ({
          chatMessages: ii([
            ...v.chatMessages,
            { role: "assistant", text: y.answer, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: y.offline ? "Using a local Focus Room reply because the AI tutor service is not connected." : ""
        }));
      } catch (y) {
        e((v) => ({
          chatMessages: ii([
            ...v.chatMessages,
            { role: "assistant", text: i0(a, d, n().studyGoal), createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: `AI tutor unavailable: ${y.message || "request failed"}`
        }));
      } finally {
        e({ chatPending: !1 });
      }
    },
    focusFlashcardsCompletedCount() {
      return bb(n());
    },
    focusQuizScore() {
      return Eb(n());
    },
    focusQuizMistakes() {
      return Pb(n());
    },
    formatFocusedTime() {
      return Fd(n().elapsedSeconds);
    }
  };
});
function Rb({ scene: e, active: n, onSelect: o, variant: i = "default" }) {
  return i === "gallery" ? /* @__PURE__ */ w.jsxs(
    on.button,
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
    on.button,
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
function Ud({ variant: e = "default" }) {
  const n = $((a) => a.selectedScene), o = $((a) => a.selectScene), i = e === "gallery" ? GA : Wn.filter((a) => !a.galleryOnly);
  return /* @__PURE__ */ w.jsx("div", { className: `scene-selector scene-selector-${e}`.trim(), "aria-label": "Study scenes", children: i.map((a) => /* @__PURE__ */ w.jsx(Rb, { scene: a, active: a.id === n, onSelect: o, variant: e }, a.id)) });
}
const Nb = {
  "soft-piano": XC,
  "lofi-cafe": l0,
  "nature-flow": d0,
  "warm-ambience": RC,
  "deep-focus": u0
};
function Db() {
  const e = $((_) => _.pomodoroDuration), n = $((_) => _.timerMode), o = $((_) => _.studyGoal), i = $((_) => _.musicType), a = $((_) => _.ambientSound), c = $((_) => _.setPomodoroDuration), d = $((_) => _.setTimerMode), p = $((_) => _.setStudyGoal), y = $((_) => _.applyAudioPreset), v = $((_) => _.openLanding), S = $((_) => _.startSession), [l, f] = C.useState(!1), g = Gv({ musicType: i, ambientSound: a }), x = (_) => {
    y(_.id);
  }, T = (_) => {
    d("countdown"), c(_);
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
        /* @__PURE__ */ w.jsx("button", { type: "button", className: "innook-header-action", "aria-label": "Focus Room history", title: "Focus Room history", children: /* @__PURE__ */ w.jsx(Kc, { size: 18, "aria-hidden": "true" }) }),
        /* @__PURE__ */ w.jsx("button", { type: "button", className: "innook-header-action", onClick: v, "aria-label": "Back to Focus Room welcome", title: "Back to Focus Room welcome", children: /* @__PURE__ */ w.jsx(_C, { size: 20, "aria-hidden": "true" }) })
      ] })
    ] }),
    /* @__PURE__ */ w.jsxs("div", { className: "innook-setup-layout", children: [
      /* @__PURE__ */ w.jsxs("section", { className: "innook-scene-panel", "aria-labelledby": "innook-scene-title", children: [
        /* @__PURE__ */ w.jsxs("div", { className: "innook-panel-heading", children: [
          /* @__PURE__ */ w.jsx("span", { children: "Step 01" }),
          /* @__PURE__ */ w.jsx("h1", { id: "innook-scene-title", children: "选择学习场景" })
        ] }),
        /* @__PURE__ */ w.jsx(Ud, { variant: "gallery" })
      ] }),
      /* @__PURE__ */ w.jsxs("aside", { className: "innook-control-rail", "aria-label": "Study settings", children: [
        /* @__PURE__ */ w.jsxs("div", { className: "innook-rail-group", "aria-label": "Music atmosphere", children: [
          Jr.map((_) => {
            const A = Nb[_.id] || u0, R = (g == null ? void 0 : g.id) === _.id;
            return /* @__PURE__ */ w.jsx("button", { type: "button", className: `innook-rail-icon innook-audio-preset ${R ? "is-active" : ""}`.trim(), onClick: () => x(_), "aria-label": `Use ${_.label}: ${_.description}`, "aria-pressed": R, title: `${_.label} — ${_.description}`, children: /* @__PURE__ */ w.jsx(A, { size: 16, "aria-hidden": "true" }) }, _.id);
          }),
          /* @__PURE__ */ w.jsx("span", { className: "innook-audio-preset-status", "aria-live": "polite", children: (g == null ? void 0 : g.label) || "Custom mix" })
        ] }),
        /* @__PURE__ */ w.jsx("div", { className: "innook-rail-divider" }),
        /* @__PURE__ */ w.jsxs("div", { className: "innook-duration-list", "aria-label": "Focus duration", children: [
          Kv.map((_) => /* @__PURE__ */ w.jsx("button", { type: "button", className: `innook-duration ${n !== "countup" && _ === e ? "is-active" : ""}`.trim(), onClick: () => T(_), "aria-pressed": n !== "countup" && _ === e, children: _ }, _)),
          /* @__PURE__ */ w.jsx("button", { type: "button", className: `innook-duration innook-duration-infinity ${n === "countup" ? "is-active" : ""}`.trim(), onClick: () => d("countup"), "aria-label": "Count up timer", "aria-pressed": n === "countup", children: "∞" })
        ] }),
        /* @__PURE__ */ w.jsx("div", { className: "innook-rail-divider" }),
        /* @__PURE__ */ w.jsx("button", { type: "button", className: `innook-rail-icon ${l ? "is-active" : ""}`.trim(), onClick: () => f((_) => !_), "aria-label": "Edit focus intention", title: "Edit focus intention", children: /* @__PURE__ */ w.jsx(ub, { size: 16, "aria-hidden": "true" }) }),
        /* @__PURE__ */ w.jsx("button", { type: "button", className: "innook-enter-button", onClick: S, "aria-label": "Enter Focus Room", title: "Enter Focus Room", children: /* @__PURE__ */ w.jsx(Gc, { size: 22, "aria-hidden": "true" }) }),
        l ? /* @__PURE__ */ w.jsxs("label", { className: "innook-goal-popover", children: [
          "今日目标",
          /* @__PURE__ */ w.jsx("textarea", { value: o, onChange: (_) => p(_.target.value), autoFocus: !0 })
        ] }) : null
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
  const { onPointerMove: c, onPointerLeave: d, ...p } = a;
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
      ...p,
      children: e
    }
  );
}
function jb(e) {
  return e === "paused" ? "Resume" : e === "completed" ? "Restart" : "Start";
}
function Ib() {
  const e = $((D) => D.elapsedSeconds), n = $((D) => D.pomodoroDuration), o = $((D) => D.timerDurationSeconds), i = $((D) => D.timerStatus), a = $((D) => D.isIdle), c = $((D) => D.studyGoal), d = $((D) => D.selectedScene), p = $((D) => D.musicType), y = $((D) => D.ambientSound), v = $((D) => D.startTimer), S = $((D) => D.pauseTimer), l = $((D) => D.resetTimer), f = $((D) => D.skipTimer), g = i === "studying", x = Number(o) || n * 60, T = Math.max(0, x - e), _ = x ? Math.min(100, Math.max(0, e / x * 100)) : 0, A = a ? 0.96 : 1, R = i === "studying" ? { scale: [A, A + 0.012, A] } : { scale: A }, P = Gn(d);
  return /* @__PURE__ */ w.jsxs(
    on.article,
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
            /* @__PURE__ */ w.jsx("strong", { children: Fd(e) })
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
        /* @__PURE__ */ w.jsx("div", { className: "focus-progress-track", "aria-label": "Focus progress", children: /* @__PURE__ */ w.jsx("div", { className: "focus-progress-fill", style: { width: `${_.toFixed(1)}%` } }) }),
        /* @__PURE__ */ w.jsxs("div", { className: "timer-actions", children: [
          /* @__PURE__ */ w.jsxs(Ee, { variant: i === "studying" ? "primary" : "ghost", onClick: v, children: [
            /* @__PURE__ */ w.jsx(Vd, { size: 16, "aria-hidden": "true" }),
            " ",
            jb(i)
          ] }),
          /* @__PURE__ */ w.jsxs(Ee, { onClick: () => S(), disabled: !g, "aria-label": g ? "Pause timer" : "Pause timer unavailable", children: [
            /* @__PURE__ */ w.jsx(Ca, { size: 16, "aria-hidden": "true" }),
            " Pause"
          ] }),
          /* @__PURE__ */ w.jsxs(Ee, { onClick: l, children: [
            /* @__PURE__ */ w.jsx(c0, { size: 16, "aria-hidden": "true" }),
            " Reset"
          ] }),
          /* @__PURE__ */ w.jsxs(Ee, { onClick: f, children: [
            /* @__PURE__ */ w.jsx(zd, { size: 16, "aria-hidden": "true" }),
            " Skip"
          ] })
        ] })
      ]
    }
  );
}
function Fb() {
  return /* @__PURE__ */ w.jsx(Ib, {});
}
function Ob({ onWorkspace: e, onOpenTrail: n, onOpenCompanion: o, onOpenSettings: i, onExit: a }) {
  const c = $((p) => p.selectedScene), d = Gn(c);
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
      /* @__PURE__ */ w.jsxs(Ee, { className: "header-icon-button", onClick: n, title: "Open Focus Trail", "aria-label": "Open Focus Trail", children: [
        /* @__PURE__ */ w.jsx(Aa, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Focus Trail" })
      ] }),
      /* @__PURE__ */ w.jsxs(Ee, { className: "header-icon-button", onClick: o, title: "Open Companion Room", "aria-label": "Open Companion Room", children: [
        /* @__PURE__ */ w.jsx(ba, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Companion" })
      ] }),
      /* @__PURE__ */ w.jsxs(Ee, { className: "header-icon-button", onClick: i, title: "Open room settings", "aria-label": "Open room settings", children: [
        /* @__PURE__ */ w.jsx(wi, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Settings" })
      ] }),
      /* @__PURE__ */ w.jsxs(Ee, { className: "header-icon-button header-exit-button", onClick: a, title: "Exit Focus Room", "aria-label": "Exit Focus Room", children: [
        /* @__PURE__ */ w.jsx(IC, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Exit" })
      ] })
    ] })
  ] });
}
function Lb({ onFocusMode: e, audioState: n }) {
  const o = $((b) => b.timerStatus), i = $((b) => b.elapsedSeconds), a = $((b) => b.pomodoroDuration), c = $((b) => b.timerDurationSeconds), d = $((b) => b.timerMode), p = $((b) => b.studyGoal), y = $((b) => b.currentSession), v = $((b) => b.startTimer), S = $((b) => b.pauseTimer), l = $((b) => b.resetTimer), f = $((b) => b.skipTimer), g = $((b) => b.setSessionDuration), x = $((b) => b.toggleAudio), T = $((b) => b.audioPlaying), _ = $((b) => b.setStudyGoal), [A, R] = C.useState(!1), [P, D] = C.useState("25:00"), [L, X] = C.useState(!1), [Z, U] = C.useState(""), G = d === "countup" ? 0 : Number(c) || (Number(a) || 0) * 60, Q = d === "countup" ? i : Math.max(0, G - i), J = o === "paused", de = o === "studying", ye = o === "completed", he = ye && d !== "countup" ? "00:00" : ci(Q), Se = J ? "Paused" : ye ? "Complete" : "In focus", ue = J ? "Resume timer" : de ? "Pause timer" : "Start timer", ge = () => {
    D(he), R(!0);
  }, V = () => {
    const [b = "", O = "0"] = String(P).split(":");
    g(b, O), R(!1);
  }, q = () => {
    U(p || ""), X(!0);
  }, K = () => {
    const b = Z.trim();
    b && _(b), X(!1);
  };
  return /* @__PURE__ */ w.jsxs("div", { className: "focus-session-dock liquid-glass", "aria-label": "Focus session controls", children: [
    /* @__PURE__ */ w.jsxs("div", { className: "dock-timer-block", children: [
      /* @__PURE__ */ w.jsxs("div", { className: "dock-eyebrow", children: [
        "POMODORO #",
        (y == null ? void 0 : y.pomodoroNumber) || 1
      ] }),
      /* @__PURE__ */ w.jsxs("div", { className: "dock-status", children: [
        /* @__PURE__ */ w.jsx("span", { className: `dock-status-dot ${J ? "is-paused" : ""}` }),
        Se
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
      /* @__PURE__ */ w.jsxs(Ee, { className: "dock-action-button", onClick: x, "aria-label": T ? "Pause room audio" : "Play room audio", children: [
        T ? /* @__PURE__ */ w.jsx(Ca, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(Oa, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: n != null && n.playing ? "Pause audio" : "Audio" })
      ] }),
      /* @__PURE__ */ w.jsxs(Ee, { className: "dock-action-button", onClick: () => de ? S() : v(), variant: "primary", "aria-label": ue, children: [
        de ? /* @__PURE__ */ w.jsx(Ca, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(Vd, { size: 15, fill: "currentColor", "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: J ? "Resume" : de ? "Pause" : "Start" })
      ] }),
      /* @__PURE__ */ w.jsxs(Ee, { className: "dock-action-button", onClick: f, "aria-label": "Skip timer", children: [
        /* @__PURE__ */ w.jsx(zd, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Skip" })
      ] }),
      /* @__PURE__ */ w.jsxs(Ee, { className: "dock-action-button", onClick: l, "aria-label": "Reset timer", children: [
        /* @__PURE__ */ w.jsx(c0, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Reset" })
      ] }),
      /* @__PURE__ */ w.jsxs(Ee, { className: "dock-focus-mode", onClick: e, "aria-label": "Enter distraction-free Focus Mode", children: [
        /* @__PURE__ */ w.jsx(ib, { size: 15, "aria-hidden": "true" }),
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
function Ry(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function Vb(...e) {
  return (n) => {
    let o = !1;
    const i = e.map((a) => {
      const c = Ry(a, n);
      return !o && typeof c == "function" && (o = !0), c;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const c = i[a];
          typeof c == "function" ? c() : Ry(e[a], null);
        }
      };
  };
}
function lt(...e) {
  return C.useCallback(Vb(...e), e);
}
function $d(e, n = []) {
  let o = [];
  function i(c, d) {
    const p = C.createContext(d);
    p.displayName = c + "Context";
    const y = o.length;
    o = [...o, d];
    const v = (l) => {
      var A;
      const { scope: f, children: g, ...x } = l, T = ((A = f == null ? void 0 : f[e]) == null ? void 0 : A[y]) || p, _ = C.useMemo(() => x, Object.values(x));
      return /* @__PURE__ */ w.jsx(T.Provider, { value: _, children: g });
    };
    v.displayName = c + "Provider";
    function S(l, f, g = {}) {
      var A;
      const { optional: x = !1 } = g, T = ((A = f == null ? void 0 : f[e]) == null ? void 0 : A[y]) || p, _ = C.useContext(T);
      if (_) return _;
      if (d !== void 0) return d;
      if (!x)
        throw new Error(`\`${l}\` must be used within \`${c}\``);
    }
    return [v, S];
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
  return a.scopeName = e, [i, zb(a, ...n)];
}
function zb(...e) {
  const n = e[0];
  if (e.length === 1) return n;
  const o = () => {
    const i = e.map((a) => ({
      useScope: a(),
      scopeName: a.scopeName
    }));
    return function(c) {
      const d = i.reduce((p, { useScope: y, scopeName: v }) => {
        const l = y(c)[`__scope${v}`];
        return { ...p, ...l };
      }, {});
      return C.useMemo(() => ({ [`__scope${n.scopeName}`]: d }), [d]);
    };
  };
  return o.scopeName = n.scopeName, o;
}
var io = globalThis != null && globalThis.document ? C.useLayoutEffect : () => {
}, Bb = nd[" useId ".trim().toString()] || (() => {
}), Ub = 0;
function rc(e) {
  const [n, o] = C.useState(Bb());
  return io(() => {
    o((i) => i ?? String(Ub++));
  }, [e]), e || (n ? `radix-${n}` : "");
}
var $b = nd[" useInsertionEffect ".trim().toString()] || io;
function h0({
  prop: e,
  defaultProp: n,
  onChange: o = () => {
  },
  caller: i
}) {
  const [a, c, d] = Hb({
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
  const v = C.useCallback(
    (S) => {
      var l;
      if (p) {
        const f = Wb(S) ? S(e) : S;
        f !== e && ((l = d.current) == null || l.call(d, f));
      } else
        c(S);
    },
    [p, e, c, d]
  );
  return [y, v];
}
function Hb({
  defaultProp: e,
  onChange: n
}) {
  const [o, i] = C.useState(e), a = C.useRef(o), c = C.useRef(n);
  return $b(() => {
    c.current = n;
  }, [n]), C.useEffect(() => {
    var d;
    a.current !== o && ((d = c.current) == null || d.call(c, o), a.current = o);
  }, [o, a]), [o, i, c];
}
function Wb(e) {
  return typeof e == "function";
}
var m0 = rg();
// @__NO_SIDE_EFFECTS__
function Ea(e) {
  const n = C.forwardRef((o, i) => {
    let { children: a, ...c } = o, d = null, p = !1;
    const y = [];
    Ny(a) && typeof Gs == "function" && (a = Gs(a._payload)), C.Children.forEach(a, (f) => {
      var g;
      if (Xb(f)) {
        p = !0;
        const x = f;
        let T = "child" in x.props ? x.props.child : x.props.children;
        Ny(T) && typeof Gs == "function" && (T = Gs(T._payload)), d = Kb(x, T), y.push((g = d == null ? void 0 : d.props) == null ? void 0 : g.children);
      } else
        y.push(f);
    }), d ? d = C.cloneElement(d, void 0, y) : (
      // A `Slottable` was found but it didn't resolve to a single element (e.g.
      // it wrapped multiple elements, text, or a render-prop `child` that
      // wasn't an element). Don't fall back to treating the `Slottable` wrapper
      // itself as the slot target — throw a descriptive error below instead.
      !p && C.Children.count(a) === 1 && C.isValidElement(a) && (d = a)
    );
    const v = d ? Qb(d) : void 0, S = lt(i, v);
    if (!d) {
      if (a || a === 0)
        throw new Error(
          p ? eE(e) : Jb(e)
        );
      return a;
    }
    const l = Yb(c, d.props ?? {});
    return d.type !== C.Fragment && (l.ref = i ? S : v), C.cloneElement(d, l);
  });
  return n.displayName = `${e}.Slot`, n;
}
var Gb = Symbol.for("radix.slottable"), Kb = (e, n) => {
  if ("child" in e.props) {
    const o = e.props.child;
    return C.isValidElement(o) ? C.cloneElement(o, void 0, e.props.children(o.props.children)) : null;
  }
  return C.isValidElement(n) ? n : null;
};
function Yb(e, n) {
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
function Qb(e) {
  var i, a;
  let n = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = n && "isReactWarning" in n && n.isReactWarning;
  return o ? e.ref : (n = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = n && "isReactWarning" in n && n.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
function Xb(e) {
  return C.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === Gb;
}
var Zb = Symbol.for("react.lazy");
function Ny(e) {
  return e != null && typeof e == "object" && "$$typeof" in e && e.$$typeof === Zb && "_payload" in e && qb(e._payload);
}
function qb(e) {
  return typeof e == "object" && e !== null && "then" in e;
}
var Jb = (e) => `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`, eE = (e) => `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`, Gs = nd[" use ".trim().toString()], tE = [
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
], vt = tE.reduce((e, n) => {
  const o = /* @__PURE__ */ Ea(`Primitive.${n}`), i = C.forwardRef((a, c) => {
    const { asChild: d, ...p } = a, y = d ? o : n;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ w.jsx(y, { ...p, ref: c });
  });
  return i.displayName = `Primitive.${n}`, { ...e, [n]: i };
}, {});
function nE(e, n) {
  e && m0.flushSync(() => e.dispatchEvent(n));
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
var rE = "DismissableLayer", Qc = "dismissableLayer.update", oE = "dismissableLayer.pointerDownOutside", iE = "dismissableLayer.focusOutside", Dy, Hd = C.createContext({
  layers: /* @__PURE__ */ new Set(),
  layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
  branches: /* @__PURE__ */ new Set(),
  // Outside elements that belong to a layer's own dismiss affordance (eg, a
  // dialog overlay). Pressing them should dismiss the layer regardless of
  // whether or not they stop propagation.
  //
  // See https://github.com/radix-ui/primitives/issues/3346
  dismissableSurfaces: /* @__PURE__ */ new Set()
}), y0 = C.forwardRef(
  (e, n) => {
    const {
      disableOutsidePointerEvents: o = !1,
      deferPointerDownOutside: i = !1,
      onEscapeKeyDown: a,
      onPointerDownOutside: c,
      onFocusOutside: d,
      onInteractOutside: p,
      onDismiss: y,
      ...v
    } = e, S = C.useContext(Hd), [l, f] = C.useState(null), g = (l == null ? void 0 : l.ownerDocument) ?? (globalThis == null ? void 0 : globalThis.document), [, x] = C.useState({}), T = lt(n, f), _ = Array.from(S.layers), [A] = [
      ...S.layersWithOutsidePointerEventsDisabled
    ].slice(-1), R = A ? _.indexOf(A) : -1, P = l ? _.indexOf(l) : -1, D = S.layersWithOutsidePointerEventsDisabled.size > 0, L = P >= R, X = C.useRef(!1), Z = cE(
      (J) => {
        c == null || c(J), p == null || p(J), J.defaultPrevented || y == null || y();
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
            const de = [...S.branches].some(
              (ye) => ye.contains(J)
            );
            return L && !de;
          },
          [S.branches, L]
        )
      }
    ), U = dE((J) => {
      if (i && X.current)
        return;
      const de = J.target;
      [...S.branches].some((he) => he.contains(de)) || (d == null || d(J), p == null || p(J), J.defaultPrevented || y == null || y());
    }, g), G = l ? P === _.length - 1 : !1, Q = xi((J) => {
      J.key === "Escape" && (a == null || a(J), !J.defaultPrevented && y && (J.preventDefault(), y()));
    });
    return C.useEffect(() => {
      if (G)
        return g.addEventListener("keydown", Q, { capture: !0 }), () => g.removeEventListener("keydown", Q, { capture: !0 });
    }, [g, G, Q]), C.useEffect(() => {
      if (l)
        return o && (S.layersWithOutsidePointerEventsDisabled.size === 0 && (Dy = g.body.style.pointerEvents, g.body.style.pointerEvents = "none"), S.layersWithOutsidePointerEventsDisabled.add(l)), S.layers.add(l), jy(), () => {
          o && (S.layersWithOutsidePointerEventsDisabled.delete(l), S.layersWithOutsidePointerEventsDisabled.size === 0 && (g.body.style.pointerEvents = Dy));
        };
    }, [l, g, o, S]), C.useEffect(() => () => {
      l && (S.layers.delete(l), S.layersWithOutsidePointerEventsDisabled.delete(l), jy());
    }, [l, S]), C.useEffect(() => {
      const J = () => x({});
      return document.addEventListener(Qc, J), () => document.removeEventListener(Qc, J);
    }, []), /* @__PURE__ */ w.jsx(
      vt.div,
      {
        ...v,
        ref: T,
        style: {
          pointerEvents: D ? L ? "auto" : "none" : void 0,
          ...e.style
        },
        onFocusCapture: yt(e.onFocusCapture, U.onFocusCapture),
        onBlurCapture: yt(e.onBlurCapture, U.onBlurCapture),
        onPointerDownCapture: yt(
          e.onPointerDownCapture,
          Z.onPointerDownCapture
        )
      }
    );
  }
);
y0.displayName = rE;
var sE = "DismissableLayerBranch", aE = C.forwardRef((e, n) => {
  const o = C.useContext(Hd), i = C.useRef(null), a = lt(n, i);
  return C.useEffect(() => {
    const c = i.current;
    if (c)
      return o.branches.add(c), () => {
        o.branches.delete(c);
      };
  }, [o.branches]), /* @__PURE__ */ w.jsx(vt.div, { ...e, ref: a });
});
aE.displayName = sE;
function lE() {
  const e = C.useContext(Hd), [n, o] = C.useState(null);
  return C.useEffect(() => {
    if (n)
      return e.dismissableSurfaces.add(n), () => {
        e.dismissableSurfaces.delete(n);
      };
  }, [n, e.dismissableSurfaces]), o;
}
var uE = () => !0;
function cE(e, n) {
  const {
    ownerDocument: o = globalThis == null ? void 0 : globalThis.document,
    deferPointerDownOutside: i = !1,
    isDeferredPointerDownOutsideRef: a,
    dismissableSurfaces: c,
    shouldHandlePointerDownOutside: d = uE
  } = n, p = xi(e), y = C.useRef(!1), v = C.useRef(!1), S = C.useRef(/* @__PURE__ */ new Map()), l = C.useRef(() => {
  });
  return C.useEffect(() => {
    function f() {
      v.current = !1, a.current = !1, S.current.clear();
    }
    function g() {
      return Array.from(S.current.values()).some(Boolean);
    }
    function x(P) {
      if (!v.current)
        return;
      const D = P.target;
      D instanceof Node && [...c].some((X) => X.contains(D)) || S.current.set(P.type, !0), P.type === "click" && window.setTimeout(() => {
        v.current && l.current();
      }, 0);
    }
    function T(P) {
      v.current && S.current.set(P.type, !1);
    }
    const _ = (P) => {
      if (P.target && !y.current) {
        let D = function() {
          o.removeEventListener("click", l.current);
          const X = g();
          f(), X || g0(
            oE,
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
        v.current = !0, a.current = i && P.button === 0, S.current.clear(), !i || P.button !== 0 ? D() : (o.removeEventListener("click", l.current), l.current = D, o.addEventListener("click", l.current, { once: !0 }));
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
      o.addEventListener("pointerdown", _);
    }, 0);
    return () => {
      window.clearTimeout(R), o.removeEventListener("pointerdown", _), o.removeEventListener("click", l.current);
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
function dE(e, n = globalThis == null ? void 0 : globalThis.document) {
  const o = xi(e), i = C.useRef(!1);
  return C.useEffect(() => {
    const a = (c) => {
      c.target && !i.current && g0(iE, o, { originalEvent: c }, {
        discrete: !1
      });
    };
    return n.addEventListener("focusin", a), () => n.removeEventListener("focusin", a);
  }, [n, o]), {
    onFocusCapture: () => i.current = !0,
    onBlurCapture: () => i.current = !1
  };
}
function jy() {
  const e = new CustomEvent(Qc);
  document.dispatchEvent(e);
}
function g0(e, n, o, { discrete: i }) {
  const a = o.originalEvent.target, c = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: o });
  n && a.addEventListener(e, n, { once: !0 }), i ? nE(a, c) : a.dispatchEvent(c);
}
var oc = "focusScope.autoFocusOnMount", ic = "focusScope.autoFocusOnUnmount", Iy = { bubbles: !1, cancelable: !0 }, fE = "FocusScope", v0 = C.forwardRef((e, n) => {
  const {
    loop: o = !1,
    trapped: i = !1,
    onMountAutoFocus: a,
    onUnmountAutoFocus: c,
    ...d
  } = e, [p, y] = C.useState(null), v = xi(a), S = xi(c), l = C.useRef(null), f = lt(n, y), g = C.useRef({
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
        if (g.paused || !p) return;
        const D = P.target;
        p.contains(D) ? l.current = D : Ln(l.current, { select: !0 });
      }, _ = function(P) {
        if (g.paused || !p) return;
        const D = P.relatedTarget;
        D !== null && (p.contains(D) || Ln(l.current, { select: !0 }));
      }, A = function(P) {
        if (document.activeElement === document.body)
          for (const L of P)
            L.removedNodes.length > 0 && Ln(p);
      };
      document.addEventListener("focusin", T), document.addEventListener("focusout", _);
      const R = new MutationObserver(A);
      return p && R.observe(p, { childList: !0, subtree: !0 }), () => {
        document.removeEventListener("focusin", T), document.removeEventListener("focusout", _), R.disconnect();
      };
    }
  }, [i, p, g.paused]), C.useEffect(() => {
    if (p) {
      Oy.add(g);
      const T = document.activeElement;
      if (!p.contains(T)) {
        const A = new CustomEvent(oc, Iy);
        p.addEventListener(oc, v), p.dispatchEvent(A), A.defaultPrevented || (pE(vE(S0(p)), { select: !0 }), document.activeElement === T && Ln(p));
      }
      return () => {
        p.removeEventListener(oc, v), setTimeout(() => {
          const A = new CustomEvent(ic, Iy);
          p.addEventListener(ic, S), p.dispatchEvent(A), A.defaultPrevented || Ln(T ?? document.body, { select: !0 }), p.removeEventListener(ic, S), Oy.remove(g);
        }, 0);
      };
    }
  }, [p, v, S, g]);
  const x = C.useCallback(
    (T) => {
      if (!o && !i || g.paused) return;
      const _ = T.key === "Tab" && !T.altKey && !T.ctrlKey && !T.metaKey, A = document.activeElement;
      if (_ && A) {
        const R = T.currentTarget, [P, D] = hE(R);
        P && D ? !T.shiftKey && A === D ? (T.preventDefault(), o && Ln(P, { select: !0 })) : T.shiftKey && A === P && (T.preventDefault(), o && Ln(D, { select: !0 })) : A === R && T.preventDefault();
      }
    },
    [o, i, g.paused]
  );
  return /* @__PURE__ */ w.jsx(vt.div, { tabIndex: -1, ...d, ref: f, onKeyDown: x });
});
v0.displayName = fE;
function pE(e, { select: n = !1 } = {}) {
  const o = document.activeElement;
  for (const i of e)
    if (Ln(i, { select: n }), document.activeElement !== o) return;
}
function hE(e) {
  const n = S0(e), o = Fy(n, e), i = Fy(n.reverse(), e);
  return [o, i];
}
function S0(e) {
  const n = [], o = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (i) => {
      const a = i.tagName === "INPUT" && i.type === "hidden";
      return i.disabled || i.hidden || a ? NodeFilter.FILTER_SKIP : i.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  for (; o.nextNode(); ) n.push(o.currentNode);
  return n;
}
function Fy(e, n) {
  const o = typeof n.checkVisibility == "function" && n.checkVisibility({ checkVisibilityCSS: !0 });
  for (const i of e)
    if (!(o ? !i.checkVisibility({ checkVisibilityCSS: !0 }) : mE(i, { upTo: n })))
      return i;
}
function mE(e, { upTo: n }) {
  if (getComputedStyle(e).visibility === "hidden") return !0;
  for (; e; ) {
    if (n !== void 0 && e === n) return !1;
    if (getComputedStyle(e).display === "none") return !0;
    e = e.parentElement;
  }
  return !1;
}
function yE(e) {
  return e instanceof HTMLInputElement && "select" in e;
}
function Ln(e, { select: n = !1 } = {}) {
  if (e && e.focus) {
    const o = document.activeElement;
    e.focus({ preventScroll: !0 }), e !== o && yE(e) && n && e.select();
  }
}
var Oy = gE();
function gE() {
  let e = [];
  return {
    add(n) {
      const o = e[0];
      n !== o && (o == null || o.pause()), e = Ly(e, n), e.unshift(n);
    },
    remove(n) {
      var o;
      e = Ly(e, n), (o = e[0]) == null || o.resume();
    }
  };
}
function Ly(e, n) {
  const o = [...e], i = o.indexOf(n);
  return i !== -1 && o.splice(i, 1), o;
}
function vE(e) {
  return e.filter((n) => n.tagName !== "A");
}
var SE = "Portal", w0 = C.forwardRef((e, n) => {
  var p;
  const { container: o, ...i } = e, [a, c] = C.useState(!1);
  io(() => c(!0), []);
  const d = o || a && ((p = globalThis == null ? void 0 : globalThis.document) == null ? void 0 : p.body);
  return d ? m0.createPortal(/* @__PURE__ */ w.jsx(vt.div, { ...i, ref: n }), d) : null;
});
w0.displayName = SE;
function wE(e, n) {
  return C.useReducer((o, i) => n[o][i] ?? o, e);
}
var La = (e) => {
  const { present: n, children: o } = e, i = xE(n), a = typeof o == "function" ? o({ present: i.isPresent }) : C.Children.only(o), c = _E(i.ref, kE(a));
  return typeof o == "function" || i.isPresent ? C.cloneElement(a, { ref: c }) : null;
};
La.displayName = "Presence";
function xE(e) {
  const [n, o] = C.useState(), i = C.useRef(null), a = C.useRef(e), c = C.useRef("none"), d = C.useRef(void 0), p = e ? "mounted" : "unmounted", [y, v] = wE(p, {
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
      const g = c.current, x = ti(S);
      e ? (d.current = x, v("MOUNT")) : x === "none" || (S == null ? void 0 : S.display) === "none" ? v("UNMOUNT") : v(l && g !== x ? "ANIMATION_OUT" : "UNMOUNT"), a.current = e;
    }
  }, [e, v]), io(() => {
    if (n) {
      let S;
      const l = n.ownerDocument.defaultView ?? window, f = (x) => {
        const _ = ti(i.current).includes(CSS.escape(x.animationName));
        if (x.target === n && _ && (v("ANIMATION_END"), !a.current)) {
          const A = n.style.animationFillMode;
          n.style.animationFillMode = "forwards", S = l.setTimeout(() => {
            n.style.animationFillMode === "forwards" && (n.style.animationFillMode = A);
          });
        }
      }, g = (x) => {
        x.target === n && (c.current = ti(i.current));
      };
      return n.addEventListener("animationstart", g), n.addEventListener("animationcancel", f), n.addEventListener("animationend", f), () => {
        l.clearTimeout(S), n.removeEventListener("animationstart", g), n.removeEventListener("animationcancel", f), n.removeEventListener("animationend", f);
      };
    } else
      v("ANIMATION_END");
  }, [n, v]), {
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
function Vy(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function _E(...e) {
  const n = C.useRef(e);
  return n.current = e, C.useCallback((o) => {
    const i = n.current;
    let a = !1;
    const c = i.map((d) => {
      const p = Vy(d, o);
      return !a && typeof p == "function" && (a = !0), p;
    });
    if (a)
      return () => {
        for (let d = 0; d < c.length; d++) {
          const p = c[d];
          typeof p == "function" ? p() : Vy(i[d], null);
        }
      };
  }, []);
}
function ti(e) {
  return (e == null ? void 0 : e.animationName) || "none";
}
function kE(e) {
  var i, a;
  let n = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = n && "isReactWarning" in n && n.isReactWarning;
  return o ? e.ref : (n = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = n && "isReactWarning" in n && n.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
var Ks = 0, Zt = null;
function TE() {
  C.useEffect(() => {
    Zt || (Zt = { start: zy(), end: zy() });
    const { start: e, end: n } = Zt;
    return document.body.firstElementChild !== e && document.body.insertAdjacentElement("afterbegin", e), document.body.lastElementChild !== n && document.body.insertAdjacentElement("beforeend", n), Ks++, () => {
      Ks === 1 && (Zt == null || Zt.start.remove(), Zt == null || Zt.end.remove(), Zt = null), Ks = Math.max(0, Ks - 1);
    };
  }, []);
}
function zy() {
  const e = document.createElement("span");
  return e.setAttribute("data-radix-focus-guard", ""), e.tabIndex = 0, e.style.outline = "none", e.style.opacity = "0", e.style.position = "fixed", e.style.pointerEvents = "none", e;
}
var nn = function() {
  return nn = Object.assign || function(n) {
    for (var o, i = 1, a = arguments.length; i < a; i++) {
      o = arguments[i];
      for (var c in o) Object.prototype.hasOwnProperty.call(o, c) && (n[c] = o[c]);
    }
    return n;
  }, nn.apply(this, arguments);
};
function x0(e, n) {
  var o = {};
  for (var i in e) Object.prototype.hasOwnProperty.call(e, i) && n.indexOf(i) < 0 && (o[i] = e[i]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var a = 0, i = Object.getOwnPropertySymbols(e); a < i.length; a++)
      n.indexOf(i[a]) < 0 && Object.prototype.propertyIsEnumerable.call(e, i[a]) && (o[i[a]] = e[i[a]]);
  return o;
}
function AE(e, n, o) {
  if (o || arguments.length === 2) for (var i = 0, a = n.length, c; i < a; i++)
    (c || !(i in n)) && (c || (c = Array.prototype.slice.call(n, 0, i)), c[i] = n[i]);
  return e.concat(c || Array.prototype.slice.call(n));
}
var aa = "right-scroll-bar-position", la = "width-before-scroll-bar", CE = "with-scroll-bars-hidden", bE = "--removed-body-scroll-bar-size";
function sc(e, n) {
  return typeof e == "function" ? e(n) : e && (e.current = n), e;
}
function EE(e, n) {
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
var PE = typeof window < "u" ? C.useLayoutEffect : C.useEffect, By = /* @__PURE__ */ new WeakMap();
function ME(e, n) {
  var o = EE(null, function(i) {
    return e.forEach(function(a) {
      return sc(a, i);
    });
  });
  return PE(function() {
    var i = By.get(o);
    if (i) {
      var a = new Set(i), c = new Set(e), d = o.current;
      a.forEach(function(p) {
        c.has(p) || sc(p, null);
      }), c.forEach(function(p) {
        a.has(p) || sc(p, d);
      });
    }
    By.set(o, e);
  }, [e]), o;
}
function RE(e) {
  return e;
}
function NE(e, n) {
  n === void 0 && (n = RE);
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
function DE(e) {
  e === void 0 && (e = {});
  var n = NE(null);
  return n.options = nn({ async: !0, ssr: !1 }, e), n;
}
var _0 = function(e) {
  var n = e.sideCar, o = x0(e, ["sideCar"]);
  if (!n)
    throw new Error("Sidecar: please provide `sideCar` property to import the right car");
  var i = n.read();
  if (!i)
    throw new Error("Sidecar medium not found");
  return C.createElement(i, nn({}, o));
};
_0.isSideCarExport = !0;
function jE(e, n) {
  return e.useMedium(n), _0;
}
var k0 = DE(), ac = function() {
}, Va = C.forwardRef(function(e, n) {
  var o = C.useRef(null), i = C.useState({
    onScrollCapture: ac,
    onWheelCapture: ac,
    onTouchMoveCapture: ac
  }), a = i[0], c = i[1], d = e.forwardProps, p = e.children, y = e.className, v = e.removeScrollBar, S = e.enabled, l = e.shards, f = e.sideCar, g = e.noRelative, x = e.noIsolation, T = e.inert, _ = e.allowPinchZoom, A = e.as, R = A === void 0 ? "div" : A, P = e.gapMode, D = x0(e, ["forwardProps", "children", "className", "removeScrollBar", "enabled", "shards", "sideCar", "noRelative", "noIsolation", "inert", "allowPinchZoom", "as", "gapMode"]), L = f, X = ME([o, n]), Z = nn(nn({}, D), a);
  return C.createElement(
    C.Fragment,
    null,
    S && C.createElement(L, { sideCar: k0, removeScrollBar: v, shards: l, noRelative: g, noIsolation: x, inert: T, setCallbacks: c, allowPinchZoom: !!_, lockRef: o, gapMode: P }),
    d ? C.cloneElement(C.Children.only(p), nn(nn({}, Z), { ref: X })) : C.createElement(R, nn({}, Z, { className: y, ref: X }), p)
  );
});
Va.defaultProps = {
  enabled: !0,
  removeScrollBar: !0,
  inert: !1
};
Va.classNames = {
  fullWidth: la,
  zeroRight: aa
};
var IE = function() {
  if (typeof __webpack_nonce__ < "u")
    return __webpack_nonce__;
};
function FE() {
  if (!document)
    return null;
  var e = document.createElement("style");
  e.type = "text/css";
  var n = IE();
  return n && e.setAttribute("nonce", n), e;
}
function OE(e, n) {
  e.styleSheet ? e.styleSheet.cssText = n : e.appendChild(document.createTextNode(n));
}
function LE(e) {
  var n = document.head || document.getElementsByTagName("head")[0];
  n.appendChild(e);
}
var VE = function() {
  var e = 0, n = null;
  return {
    add: function(o) {
      e == 0 && (n = FE()) && (OE(n, o), LE(n)), e++;
    },
    remove: function() {
      e--, !e && n && (n.parentNode && n.parentNode.removeChild(n), n = null);
    }
  };
}, zE = function() {
  var e = VE();
  return function(n, o) {
    C.useEffect(function() {
      return e.add(n), function() {
        e.remove();
      };
    }, [n && o]);
  };
}, T0 = function() {
  var e = zE(), n = function(o) {
    var i = o.styles, a = o.dynamic;
    return e(i, a), null;
  };
  return n;
}, BE = {
  left: 0,
  top: 0,
  right: 0,
  gap: 0
}, lc = function(e) {
  return parseInt(e || "", 10) || 0;
}, UE = function(e) {
  var n = window.getComputedStyle(document.body), o = n[e === "padding" ? "paddingLeft" : "marginLeft"], i = n[e === "padding" ? "paddingTop" : "marginTop"], a = n[e === "padding" ? "paddingRight" : "marginRight"];
  return [lc(o), lc(i), lc(a)];
}, $E = function(e) {
  if (e === void 0 && (e = "margin"), typeof window > "u")
    return BE;
  var n = UE(e), o = document.documentElement.clientWidth, i = window.innerWidth;
  return {
    left: n[0],
    top: n[1],
    right: n[2],
    gap: Math.max(0, i - o + n[2] - n[0])
  };
}, HE = T0(), to = "data-scroll-locked", WE = function(e, n, o, i) {
  var a = e.left, c = e.top, d = e.right, p = e.gap;
  return o === void 0 && (o = "margin"), `
  .`.concat(CE, ` {
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
  
  body[`).concat(to, `] {
    `).concat(bE, ": ").concat(p, `px;
  }
`);
}, Uy = function() {
  var e = parseInt(document.body.getAttribute(to) || "0", 10);
  return isFinite(e) ? e : 0;
}, GE = function() {
  C.useEffect(function() {
    return document.body.setAttribute(to, (Uy() + 1).toString()), function() {
      var e = Uy() - 1;
      e <= 0 ? document.body.removeAttribute(to) : document.body.setAttribute(to, e.toString());
    };
  }, []);
}, KE = function(e) {
  var n = e.noRelative, o = e.noImportant, i = e.gapMode, a = i === void 0 ? "margin" : i;
  GE();
  var c = C.useMemo(function() {
    return $E(a);
  }, [a]);
  return C.createElement(HE, { styles: WE(c, !n, a, o ? "" : "!important") });
}, Xc = !1;
if (typeof window < "u")
  try {
    var Ys = Object.defineProperty({}, "passive", {
      get: function() {
        return Xc = !0, !0;
      }
    });
    window.addEventListener("test", Ys, Ys), window.removeEventListener("test", Ys, Ys);
  } catch {
    Xc = !1;
  }
var Wr = Xc ? { passive: !1 } : !1, YE = function(e) {
  return e.tagName === "TEXTAREA";
}, A0 = function(e, n) {
  if (!(e instanceof Element))
    return !1;
  var o = window.getComputedStyle(e);
  return (
    // not-not-scrollable
    o[n] !== "hidden" && // contains scroll inside self
    !(o.overflowY === o.overflowX && !YE(e) && o[n] === "visible")
  );
}, QE = function(e) {
  return A0(e, "overflowY");
}, XE = function(e) {
  return A0(e, "overflowX");
}, $y = function(e, n) {
  var o = n.ownerDocument, i = n;
  do {
    typeof ShadowRoot < "u" && i instanceof ShadowRoot && (i = i.host);
    var a = C0(e, i);
    if (a) {
      var c = b0(e, i), d = c[1], p = c[2];
      if (d > p)
        return !0;
    }
    i = i.parentNode;
  } while (i && i !== o.body);
  return !1;
}, ZE = function(e) {
  var n = e.scrollTop, o = e.scrollHeight, i = e.clientHeight;
  return [
    n,
    o,
    i
  ];
}, qE = function(e) {
  var n = e.scrollLeft, o = e.scrollWidth, i = e.clientWidth;
  return [
    n,
    o,
    i
  ];
}, C0 = function(e, n) {
  return e === "v" ? QE(n) : XE(n);
}, b0 = function(e, n) {
  return e === "v" ? ZE(n) : qE(n);
}, JE = function(e, n) {
  return e === "h" && n === "rtl" ? -1 : 1;
}, eP = function(e, n, o, i, a) {
  var c = JE(e, window.getComputedStyle(n).direction), d = c * i, p = o.target, y = n.contains(p), v = !1, S = d > 0, l = 0, f = 0;
  do {
    if (!p)
      break;
    var g = b0(e, p), x = g[0], T = g[1], _ = g[2], A = T - _ - c * x;
    (x || A) && C0(e, p) && (l += A, f += x);
    var R = p.parentNode;
    p = R && R.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? R.host : R;
  } while (
    // portaled content
    !y && p !== document.body || // self content
    y && (n.contains(p) || n === p)
  );
  return (S && Math.abs(l) < 1 || !S && Math.abs(f) < 1) && (v = !0), v;
}, Qs = function(e) {
  return "changedTouches" in e ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY] : [0, 0];
}, Hy = function(e) {
  return [e.deltaX, e.deltaY];
}, Wy = function(e) {
  return e && "current" in e ? e.current : e;
}, tP = function(e, n) {
  return e[0] === n[0] && e[1] === n[1];
}, nP = function(e) {
  return `
  .block-interactivity-`.concat(e, ` {pointer-events: none;}
  .allow-interactivity-`).concat(e, ` {pointer-events: all;}
`);
}, rP = 0, Gr = [];
function oP(e) {
  var n = C.useRef([]), o = C.useRef([0, 0]), i = C.useRef(), a = C.useState(rP++)[0], c = C.useState(T0)[0], d = C.useRef(e);
  C.useEffect(function() {
    d.current = e;
  }, [e]), C.useEffect(function() {
    if (e.inert) {
      document.body.classList.add("block-interactivity-".concat(a));
      var T = AE([e.lockRef.current], (e.shards || []).map(Wy), !0).filter(Boolean);
      return T.forEach(function(_) {
        return _.classList.add("allow-interactivity-".concat(a));
      }), function() {
        document.body.classList.remove("block-interactivity-".concat(a)), T.forEach(function(_) {
          return _.classList.remove("allow-interactivity-".concat(a));
        });
      };
    }
  }, [e.inert, e.lockRef.current, e.shards]);
  var p = C.useCallback(function(T, _) {
    if ("touches" in T && T.touches.length === 2 || T.type === "wheel" && T.ctrlKey)
      return !d.current.allowPinchZoom;
    var A = Qs(T), R = o.current, P = "deltaX" in T ? T.deltaX : R[0] - A[0], D = "deltaY" in T ? T.deltaY : R[1] - A[1], L, X = T.target, Z = Math.abs(P) > Math.abs(D) ? "h" : "v";
    if ("touches" in T && Z === "h" && X.type === "range")
      return !1;
    var U = window.getSelection(), G = U && U.anchorNode, Q = G ? G === X || G.contains(X) : !1;
    if (Q)
      return !1;
    var J = $y(Z, X);
    if (!J)
      return !0;
    if (J ? L = Z : (L = Z === "v" ? "h" : "v", J = $y(Z, X)), !J)
      return !1;
    if (!i.current && "changedTouches" in T && (P || D) && (i.current = L), !L)
      return !0;
    var de = i.current || L;
    return eP(de, _, T, de === "h" ? P : D);
  }, []), y = C.useCallback(function(T) {
    var _ = T;
    if (!(!Gr.length || Gr[Gr.length - 1] !== c)) {
      var A = "deltaY" in _ ? Hy(_) : Qs(_), R = n.current.filter(function(L) {
        return L.name === _.type && (L.target === _.target || _.target === L.shadowParent) && tP(L.delta, A);
      })[0];
      if (R && R.should) {
        _.cancelable && _.preventDefault();
        return;
      }
      if (!R) {
        var P = (d.current.shards || []).map(Wy).filter(Boolean).filter(function(L) {
          return L.contains(_.target);
        }), D = P.length > 0 ? p(_, P[0]) : !d.current.noIsolation;
        D && _.cancelable && _.preventDefault();
      }
    }
  }, []), v = C.useCallback(function(T, _, A, R) {
    var P = { name: T, delta: _, target: A, should: R, shadowParent: iP(A) };
    n.current.push(P), setTimeout(function() {
      n.current = n.current.filter(function(D) {
        return D !== P;
      });
    }, 1);
  }, []), S = C.useCallback(function(T) {
    o.current = Qs(T), i.current = void 0;
  }, []), l = C.useCallback(function(T) {
    v(T.type, Hy(T), T.target, p(T, e.lockRef.current));
  }, []), f = C.useCallback(function(T) {
    v(T.type, Qs(T), T.target, p(T, e.lockRef.current));
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
  var g = e.removeScrollBar, x = e.inert;
  return C.createElement(
    C.Fragment,
    null,
    x ? C.createElement(c, { styles: nP(a) }) : null,
    g ? C.createElement(KE, { noRelative: e.noRelative, gapMode: e.gapMode }) : null
  );
}
function iP(e) {
  for (var n = null; e !== null; )
    e instanceof ShadowRoot && (n = e.host, e = e.host), e = e.parentNode;
  return n;
}
const sP = jE(k0, oP);
var E0 = C.forwardRef(function(e, n) {
  return C.createElement(Va, nn({}, e, { ref: n, sideCar: sP }));
});
E0.classNames = Va.classNames;
var aP = function(e) {
  if (typeof document > "u")
    return null;
  var n = Array.isArray(e) ? e[0] : e;
  return n.ownerDocument.body;
}, Kr = /* @__PURE__ */ new WeakMap(), Xs = /* @__PURE__ */ new WeakMap(), Zs = {}, uc = 0, P0 = function(e) {
  return e && (e.host || P0(e.parentNode));
}, lP = function(e, n) {
  return n.map(function(o) {
    if (e.contains(o))
      return o;
    var i = P0(o);
    return i && e.contains(i) ? i : (console.error("aria-hidden", o, "in not contained inside", e, ". Doing nothing"), null);
  }).filter(function(o) {
    return !!o;
  });
}, uP = function(e, n, o, i) {
  var a = lP(n, Array.isArray(e) ? e : [e]);
  Zs[o] || (Zs[o] = /* @__PURE__ */ new WeakMap());
  var c = Zs[o], d = [], p = /* @__PURE__ */ new Set(), y = new Set(a), v = function(l) {
    !l || p.has(l) || (p.add(l), v(l.parentNode));
  };
  a.forEach(v);
  var S = function(l) {
    !l || y.has(l) || Array.prototype.forEach.call(l.children, function(f) {
      if (p.has(f))
        S(f);
      else
        try {
          var g = f.getAttribute(i), x = g !== null && g !== "false", T = (Kr.get(f) || 0) + 1, _ = (c.get(f) || 0) + 1;
          Kr.set(f, T), c.set(f, _), d.push(f), T === 1 && x && Xs.set(f, !0), _ === 1 && f.setAttribute(o, "true"), x || f.setAttribute(i, "true");
        } catch (A) {
          console.error("aria-hidden: cannot operate on ", f, A);
        }
    });
  };
  return S(n), p.clear(), uc++, function() {
    d.forEach(function(l) {
      var f = Kr.get(l) - 1, g = c.get(l) - 1;
      Kr.set(l, f), c.set(l, g), f || (Xs.has(l) || l.removeAttribute(i), Xs.delete(l)), g || l.removeAttribute(o);
    }), uc--, uc || (Kr = /* @__PURE__ */ new WeakMap(), Kr = /* @__PURE__ */ new WeakMap(), Xs = /* @__PURE__ */ new WeakMap(), Zs = {});
  };
}, cP = function(e, n, o) {
  o === void 0 && (o = "data-aria-hidden");
  var i = Array.from(Array.isArray(e) ? e : [e]), a = aP(e);
  return a ? (i.push.apply(i, Array.from(a.querySelectorAll("[aria-live], script"))), uP(i, a, o, "aria-hidden")) : function() {
    return null;
  };
}, za = "Dialog", [M0] = $d(za), [dP, Ht] = M0(za), R0 = (e) => {
  const {
    __scopeDialog: n,
    children: o,
    open: i,
    defaultOpen: a,
    onOpenChange: c,
    modal: d = !0
  } = e, p = C.useRef(null), y = C.useRef(null), [v, S] = h0({
    prop: i,
    defaultProp: a ?? !1,
    onChange: c,
    caller: za
  });
  return /* @__PURE__ */ w.jsx(
    dP,
    {
      scope: n,
      triggerRef: p,
      contentRef: y,
      contentId: rc(),
      titleId: rc(),
      descriptionId: rc(),
      open: v,
      onOpenChange: S,
      onOpenToggle: C.useCallback(() => S((l) => !l), [S]),
      modal: d,
      children: o
    }
  );
};
R0.displayName = za;
var N0 = "DialogTrigger", fP = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Ht(N0, o), c = lt(n, a.triggerRef);
    return /* @__PURE__ */ w.jsx(
      vt.button,
      {
        type: "button",
        "aria-haspopup": "dialog",
        "aria-expanded": a.open,
        "aria-controls": a.open ? a.contentId : void 0,
        "data-state": Gd(a.open),
        ...i,
        ref: c,
        onClick: yt(e.onClick, a.onOpenToggle)
      }
    );
  }
);
fP.displayName = N0;
var Wd = "DialogPortal", [pP, D0] = M0(Wd, {
  forceMount: void 0
}), j0 = (e) => {
  const { __scopeDialog: n, forceMount: o, children: i, container: a } = e, c = Ht(Wd, n);
  return /* @__PURE__ */ w.jsx(pP, { scope: n, forceMount: o, children: C.Children.map(i, (d) => /* @__PURE__ */ w.jsx(La, { present: o || c.open, children: /* @__PURE__ */ w.jsx(w0, { asChild: !0, container: a, children: d }) })) });
};
j0.displayName = Wd;
var Pa = "DialogOverlay", I0 = C.forwardRef(
  (e, n) => {
    const o = D0(Pa, e.__scopeDialog), { forceMount: i = o.forceMount, ...a } = e, c = Ht(Pa, e.__scopeDialog);
    return c.modal ? /* @__PURE__ */ w.jsx(La, { present: i || c.open, children: /* @__PURE__ */ w.jsx(mP, { ...a, ref: n }) }) : null;
  }
);
I0.displayName = Pa;
var hP = /* @__PURE__ */ Ea("DialogOverlay.RemoveScroll"), mP = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Ht(Pa, o), c = lE(), d = lt(n, c);
    return (
      // Make sure `Content` is scrollable even when it doesn't live inside `RemoveScroll`
      // ie. when `Overlay` and `Content` are siblings
      /* @__PURE__ */ w.jsx(E0, { as: hP, allowPinchZoom: !0, shards: [a.contentRef], children: /* @__PURE__ */ w.jsx(
        vt.div,
        {
          "data-state": Gd(a.open),
          ...i,
          ref: d,
          style: { pointerEvents: "auto", ...i.style }
        }
      ) })
    );
  }
), so = "DialogContent", F0 = C.forwardRef(
  (e, n) => {
    const o = D0(so, e.__scopeDialog), { forceMount: i = o.forceMount, ...a } = e, c = Ht(so, e.__scopeDialog);
    return /* @__PURE__ */ w.jsx(La, { present: i || c.open, children: c.modal ? /* @__PURE__ */ w.jsx(yP, { ...a, ref: n }) : /* @__PURE__ */ w.jsx(gP, { ...a, ref: n }) });
  }
);
F0.displayName = so;
var yP = C.forwardRef(
  (e, n) => {
    const o = Ht(so, e.__scopeDialog), i = C.useRef(null), a = lt(n, o.contentRef, i);
    return C.useEffect(() => {
      const c = i.current;
      if (c) return cP(c);
    }, []), /* @__PURE__ */ w.jsx(
      O0,
      {
        ...e,
        ref: a,
        trapFocus: o.open,
        disableOutsidePointerEvents: o.open,
        onCloseAutoFocus: yt(e.onCloseAutoFocus, (c) => {
          var d;
          c.preventDefault(), (d = o.triggerRef.current) == null || d.focus();
        }),
        onPointerDownOutside: yt(e.onPointerDownOutside, (c) => {
          const d = c.detail.originalEvent, p = d.button === 0 && d.ctrlKey === !0;
          (d.button === 2 || p) && c.preventDefault();
        }),
        onFocusOutside: yt(
          e.onFocusOutside,
          (c) => c.preventDefault()
        )
      }
    );
  }
), gP = C.forwardRef(
  (e, n) => {
    const o = Ht(so, e.__scopeDialog), i = C.useRef(!1), a = C.useRef(!1);
    return /* @__PURE__ */ w.jsx(
      O0,
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
          var y, v;
          (y = e.onInteractOutside) == null || y.call(e, c), c.defaultPrevented || (i.current = !0, c.detail.originalEvent.type === "pointerdown" && (a.current = !0));
          const d = c.target;
          ((v = o.triggerRef.current) == null ? void 0 : v.contains(d)) && c.preventDefault(), c.detail.originalEvent.type === "focusin" && a.current && c.preventDefault();
        }
      }
    );
  }
), O0 = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, trapFocus: i, onOpenAutoFocus: a, onCloseAutoFocus: c, ...d } = e, p = Ht(so, o);
    return TE(), /* @__PURE__ */ w.jsx(w.Fragment, { children: /* @__PURE__ */ w.jsx(
      v0,
      {
        asChild: !0,
        loop: !0,
        trapped: i,
        onMountAutoFocus: a,
        onUnmountAutoFocus: c,
        children: /* @__PURE__ */ w.jsx(
          y0,
          {
            role: "dialog",
            id: p.contentId,
            "aria-describedby": p.descriptionId,
            "aria-labelledby": p.titleId,
            "data-state": Gd(p.open),
            ...d,
            ref: n,
            deferPointerDownOutside: !0,
            onDismiss: () => p.onOpenChange(!1)
          }
        )
      }
    ) });
  }
), L0 = "DialogTitle", V0 = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Ht(L0, o);
    return /* @__PURE__ */ w.jsx(vt.h2, { id: a.titleId, ...i, ref: n });
  }
);
V0.displayName = L0;
var z0 = "DialogDescription", B0 = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Ht(z0, o);
    return /* @__PURE__ */ w.jsx(vt.p, { id: a.descriptionId, ...i, ref: n });
  }
);
B0.displayName = z0;
var U0 = "DialogClose", vP = C.forwardRef(
  (e, n) => {
    const { __scopeDialog: o, ...i } = e, a = Ht(U0, o);
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
vP.displayName = U0;
function Gd(e) {
  return e ? "open" : "closed";
}
function SP() {
  const e = $((a) => a.summaryRecord), n = $((a) => a.closeSummary), o = $((a) => a.startTimer), i = Gn(e == null ? void 0 : e.selectedScene);
  return /* @__PURE__ */ w.jsx(R0, { open: !!e, onOpenChange: (a) => !a && n(), children: /* @__PURE__ */ w.jsx(ja, { children: e ? /* @__PURE__ */ w.jsxs(j0, { forceMount: !0, children: [
    /* @__PURE__ */ w.jsx(I0, { asChild: !0, children: /* @__PURE__ */ w.jsx(
      on.div,
      {
        className: "summary-overlay",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
      }
    ) }),
    /* @__PURE__ */ w.jsx(F0, { asChild: !0, children: /* @__PURE__ */ w.jsxs(
      on.article,
      {
        className: "summary-card liquid-glass",
        initial: { opacity: 0, y: 18, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 18, scale: 0.98 },
        children: [
          /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Session complete" }),
          /* @__PURE__ */ w.jsx(V0, { children: "Focus block complete" }),
          /* @__PURE__ */ w.jsx(B0, { className: "sr-only", children: "Summary of the completed focus block." }),
          /* @__PURE__ */ w.jsx("p", { children: "You protected a focused block in your quiet study room." }),
          /* @__PURE__ */ w.jsxs("div", { className: "summary-grid", children: [
            /* @__PURE__ */ w.jsxs("div", { className: "summary-stat liquid-glass-lite", children: [
              /* @__PURE__ */ w.jsx("span", { children: "Focus time" }),
              /* @__PURE__ */ w.jsx("strong", { children: Fd(e.totalFocusTime) })
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
function $0(e, [n, o]) {
  return Math.min(o, Math.max(n, e));
}
var wP = C.createContext(void 0);
function xP(e) {
  const n = C.useContext(wP);
  return e || n || "ltr";
}
function _P(e) {
  const n = C.useRef({ value: e, previous: e });
  return C.useMemo(() => (n.current.value !== e && (n.current.previous = n.current.value, n.current.value = e), n.current.previous), [e]);
}
function kP(e) {
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
          const y = c.borderBoxSize, v = Array.isArray(y) ? y[0] : y;
          d = v.inlineSize, p = v.blockSize;
        } else
          d = e.offsetWidth, p = e.offsetHeight;
        o({ width: d, height: p });
      });
      return i.observe(e, { box: "border-box" }), () => i.unobserve(e);
    } else
      o(void 0);
  }, [e]), n;
}
function TP(e) {
  const n = e + "CollectionProvider", [o, i] = $d(n), [a, c] = o(
    n,
    { collectionRef: { current: null }, itemMap: /* @__PURE__ */ new Map() }
  ), d = (T) => {
    const { scope: _, children: A } = T, R = C.useRef(null), P = C.useRef(/* @__PURE__ */ new Map()).current;
    return /* @__PURE__ */ w.jsx(a, { scope: _, itemMap: P, collectionRef: R, children: A });
  };
  d.displayName = n;
  const p = e + "CollectionSlot", y = /* @__PURE__ */ Ea(p), v = C.forwardRef(
    (T, _) => {
      const { scope: A, children: R } = T, P = c(p, A), D = lt(_, P.collectionRef);
      return /* @__PURE__ */ w.jsx(y, { ref: D, children: R });
    }
  );
  v.displayName = p;
  const S = e + "CollectionItemSlot", l = "data-radix-collection-item", f = /* @__PURE__ */ Ea(S), g = C.forwardRef(
    (T, _) => {
      const { scope: A, children: R, ...P } = T, D = C.useRef(null), L = lt(_, D), X = c(S, A);
      return C.useEffect(() => (X.itemMap.set(D, { ref: D, ...P }), () => void X.itemMap.delete(D))), /* @__PURE__ */ w.jsx(f, { [l]: "", ref: L, children: R });
    }
  );
  g.displayName = S;
  function x(T) {
    const _ = c(e + "CollectionConsumer", T);
    return C.useCallback(() => {
      const R = _.collectionRef.current;
      if (!R) return [];
      const P = Array.from(R.querySelectorAll(`[${l}]`));
      return Array.from(_.itemMap.values()).sort(
        (X, Z) => P.indexOf(X.ref.current) - P.indexOf(Z.ref.current)
      );
    }, [_.collectionRef, _.itemMap]);
  }
  return [
    { Provider: d, Slot: v, ItemSlot: g },
    x,
    i
  ];
}
var H0 = ["PageUp", "PageDown"], W0 = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"], G0 = {
  "from-left": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-right": ["Home", "PageDown", "ArrowDown", "ArrowRight"],
  "from-bottom": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-top": ["Home", "PageDown", "ArrowUp", "ArrowLeft"]
}, co = "Slider", [Zc, AP, CP] = TP(co), [Kd] = $d(co, [
  CP
]), [bP, Ei] = Kd(co), K0 = C.forwardRef(
  (e, n) => {
    const {
      name: o,
      min: i = 0,
      max: a = 100,
      step: c = 1,
      orientation: d = "horizontal",
      disabled: p = !1,
      minStepsBetweenThumbs: y = 0,
      defaultValue: v = [i],
      value: S,
      onValueChange: l = () => {
      },
      onValueCommit: f = () => {
      },
      inverted: g = !1,
      form: x,
      ...T
    } = e, _ = C.useRef(/* @__PURE__ */ new Set()), A = C.useRef(0), R = C.useRef(!1), D = d === "horizontal" ? EP : PP, [L, X] = C.useState(null), Z = lt(n, X), [U = [], G] = h0({
      prop: S,
      defaultProp: v,
      onChange: (ue) => {
        var V;
        (V = [..._.current][A.current]) == null || V.focus({
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
    function de(ue) {
      const ge = DP(U, ue);
      Se(ue, ge);
    }
    function ye(ue) {
      Se(ue, A.current);
    }
    function he() {
      const ue = Q.current[A.current];
      U[A.current] !== ue && f(U);
    }
    function Se(ue, ge, { commit: V } = { commit: !1 }) {
      const q = uS(c), K = ca(Math.round((ue - i) / c) * c + i, q), b = $0(K, [i, a]);
      G((O = []) => {
        const le = RP(O, b, ge);
        if (FP(le, y * c)) {
          A.current = le.indexOf(b);
          const ce = String(le) !== String(O);
          return ce && V && f(le), ce ? le : O;
        } else
          return O;
      });
    }
    return /* @__PURE__ */ w.jsx(
      bP,
      {
        scope: e.__scopeSlider,
        name: o,
        disabled: p,
        min: i,
        max: a,
        valueIndexToChangeRef: A,
        thumbs: _.current,
        values: U,
        orientation: d,
        form: x,
        children: /* @__PURE__ */ w.jsx(Zc.Provider, { scope: e.__scopeSlider, children: /* @__PURE__ */ w.jsx(Zc.Slot, { scope: e.__scopeSlider, children: /* @__PURE__ */ w.jsx(
          D,
          {
            "aria-disabled": p,
            "data-disabled": p ? "" : void 0,
            ...T,
            ref: Z,
            onPointerDown: yt(T.onPointerDown, () => {
              p || (Q.current = U, R.current = !1);
            }),
            min: i,
            max: a,
            inverted: g,
            onSlideStart: p ? void 0 : de,
            onSlideMove: p ? void 0 : ye,
            onSlideEnd: p ? void 0 : he,
            onHomeKeyDown: () => {
              p || (R.current = !0, Se(i, 0, { commit: !0 }));
            },
            onEndKeyDown: () => {
              p || (R.current = !0, Se(a, U.length - 1, { commit: !0 }));
            },
            onStepKeyDown: ({ event: ue, direction: ge }) => {
              if (!p) {
                R.current = !0;
                const K = H0.includes(ue.key) || ue.shiftKey && W0.includes(ue.key) ? 10 : 1, b = A.current, O = U[b], le = OP(O, {
                  min: i,
                  step: c,
                  direction: ge,
                  multiplier: K
                });
                Se(le, b, { commit: !0 });
              }
            }
          }
        ) }) })
      }
    );
  }
);
K0.displayName = co;
var [Y0, Q0] = Kd(co, {
  startEdge: "left",
  endEdge: "right",
  size: "width",
  direction: 1
}), EP = C.forwardRef(
  (e, n) => {
    const {
      min: o,
      max: i,
      dir: a,
      inverted: c,
      onSlideStart: d,
      onSlideMove: p,
      onSlideEnd: y,
      onStepKeyDown: v,
      ...S
    } = e, [l, f] = C.useState(null), g = lt(n, f), x = C.useRef(void 0), T = xP(a), _ = T === "ltr", A = _ && !c || !_ && c;
    function R(P) {
      const D = x.current || l.getBoundingClientRect(), L = [0, D.width], Z = Yd(L, A ? [o, i] : [i, o]);
      return x.current = D, Z(P - D.left);
    }
    return /* @__PURE__ */ w.jsx(
      Y0,
      {
        scope: e.__scopeSlider,
        startEdge: A ? "left" : "right",
        endEdge: A ? "right" : "left",
        direction: A ? 1 : -1,
        size: "width",
        children: /* @__PURE__ */ w.jsx(
          X0,
          {
            dir: T,
            "data-orientation": "horizontal",
            ...S,
            ref: g,
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
              const L = G0[A ? "from-left" : "from-right"].includes(P.key);
              v == null || v({ event: P, direction: L ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), PP = C.forwardRef(
  (e, n) => {
    const {
      min: o,
      max: i,
      inverted: a,
      onSlideStart: c,
      onSlideMove: d,
      onSlideEnd: p,
      onStepKeyDown: y,
      ...v
    } = e, S = C.useRef(null), l = lt(n, S), f = C.useRef(void 0), g = !a;
    function x(T) {
      const _ = f.current || S.current.getBoundingClientRect(), A = [0, _.height], P = Yd(A, g ? [i, o] : [o, i]);
      return f.current = _, P(T - _.top);
    }
    return /* @__PURE__ */ w.jsx(
      Y0,
      {
        scope: e.__scopeSlider,
        startEdge: g ? "bottom" : "top",
        endEdge: g ? "top" : "bottom",
        size: "height",
        direction: g ? 1 : -1,
        children: /* @__PURE__ */ w.jsx(
          X0,
          {
            "data-orientation": "vertical",
            ...v,
            ref: l,
            style: {
              ...v.style,
              "--radix-slider-thumb-transform": "translateY(50%)"
            },
            onSlideStart: (T) => {
              const _ = x(T.clientY);
              c == null || c(_);
            },
            onSlideMove: (T) => {
              const _ = x(T.clientY);
              d == null || d(_);
            },
            onSlideEnd: () => {
              f.current = void 0, p == null || p();
            },
            onStepKeyDown: (T) => {
              const A = G0[g ? "from-bottom" : "from-top"].includes(T.key);
              y == null || y({ event: T, direction: A ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), X0 = C.forwardRef(
  (e, n) => {
    const {
      __scopeSlider: o,
      onSlideStart: i,
      onSlideMove: a,
      onSlideEnd: c,
      onHomeKeyDown: d,
      onEndKeyDown: p,
      onStepKeyDown: y,
      ...v
    } = e, S = Ei(co, o);
    return /* @__PURE__ */ w.jsx(
      vt.span,
      {
        ...v,
        ref: n,
        onKeyDown: yt(e.onKeyDown, (l) => {
          l.key === "Home" ? (d(l), l.preventDefault()) : l.key === "End" ? (p(l), l.preventDefault()) : H0.concat(W0).includes(l.key) && (y(l), l.preventDefault());
        }),
        onPointerDown: yt(e.onPointerDown, (l) => {
          const f = l.target;
          f.setPointerCapture(l.pointerId), l.preventDefault(), S.thumbs.has(f) ? f.focus({ preventScroll: !0, focusVisible: !1 }) : i(l);
        }),
        onPointerMove: yt(e.onPointerMove, (l) => {
          l.target.hasPointerCapture(l.pointerId) && a(l);
        }),
        onPointerUp: yt(e.onPointerUp, (l) => {
          const f = l.target;
          f.hasPointerCapture(l.pointerId) && (f.releasePointerCapture(l.pointerId), c(l));
        })
      }
    );
  }
), Z0 = "SliderTrack", q0 = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Ei(Z0, o);
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
q0.displayName = Z0;
var qc = "SliderRange", J0 = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Ei(qc, o), c = Q0(qc, o), d = C.useRef(null), p = lt(n, d), y = a.values.length, v = a.values.map(
      (f) => lS(f, a.min, a.max)
    ), S = y > 1 ? Math.min(...v) : 0, l = 100 - Math.max(...v);
    return /* @__PURE__ */ w.jsx(
      vt.span,
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
J0.displayName = qc;
var eS = "SliderThumb", [MP, tS] = Kd(eS), nS = "SliderThumbProvider";
function rS(e) {
  const {
    __scopeSlider: n,
    name: o,
    children: i,
    // @ts-expect-error internal render prop
    internal_do_not_use_render: a
  } = e, c = Ei(nS, n), d = AP(n), [p, y] = C.useState(null), v = C.useMemo(
    () => p ? d().findIndex((_) => _.ref.current === p) : -1,
    [d, p]
  ), S = kP(p), l = p ? !!c.form || !!p.closest("form") : !0, f = c.values[v], g = o ?? (c.name ? c.name + (c.values.length > 1 ? "[]" : "") : void 0), x = f === void 0 ? 0 : lS(f, c.min, c.max);
  C.useEffect(() => {
    if (p)
      return c.thumbs.add(p), () => {
        c.thumbs.delete(p);
      };
  }, [p, c.thumbs]);
  const T = {
    value: f,
    name: g,
    form: c.form,
    isFormControl: l,
    index: v,
    thumb: p,
    onThumbChange: y,
    percent: x,
    size: S
  };
  return /* @__PURE__ */ w.jsx(MP, { scope: n, ...T, children: LP(a) ? a(T) : i });
}
rS.displayName = nS;
var ua = "SliderThumbTrigger", oS = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Ei(ua, o), c = Q0(ua, o), { index: d, value: p, percent: y, size: v, onThumbChange: S } = tS(
      ua,
      o
    ), l = lt(n, S), f = NP(d, a.values.length), g = v == null ? void 0 : v[c.size], x = g ? jP(g, y, c.direction) : 0;
    return /* @__PURE__ */ w.jsx(
      "span",
      {
        style: {
          transform: "var(--radix-slider-thumb-transform)",
          position: "absolute",
          [c.startEdge]: `calc(${y}% + ${x}px)`
        },
        children: /* @__PURE__ */ w.jsx(Zc.ItemSlot, { scope: o, children: /* @__PURE__ */ w.jsx(
          vt.span,
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
            onFocus: yt(e.onFocus, () => {
              a.valueIndexToChangeRef.current = d;
            })
          }
        ) })
      }
    );
  }
);
oS.displayName = ua;
var iS = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, name: i, ...a } = e;
    return /* @__PURE__ */ w.jsx(
      rS,
      {
        __scopeSlider: o,
        name: i,
        internal_do_not_use_render: ({ index: c, isFormControl: d }) => /* @__PURE__ */ w.jsxs(w.Fragment, { children: [
          /* @__PURE__ */ w.jsx(
            oS,
            {
              ...a,
              ref: n,
              __scopeSlider: o
            }
          ),
          d ? /* @__PURE__ */ w.jsx(
            aS,
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
iS.displayName = eS;
var sS = "SliderBubbleInput", aS = C.forwardRef(
  ({ __scopeSlider: e, ...n }, o) => {
    const { value: i, name: a, form: c } = tS(sS, e), d = C.useRef(null), p = lt(d, o), y = _P(i);
    return C.useEffect(() => {
      const v = d.current;
      if (!v) return;
      const S = window.HTMLInputElement.prototype, f = Object.getOwnPropertyDescriptor(S, "value").set;
      if (y !== i && f) {
        const g = new Event("input", { bubbles: !0 });
        f.call(v, i), v.dispatchEvent(g);
      }
    }, [y, i]), /* @__PURE__ */ w.jsx(
      vt.input,
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
aS.displayName = sS;
function RP(e = [], n, o) {
  const i = [...e];
  return i[o] = n, i.sort((a, c) => a - c);
}
function lS(e, n, o) {
  const c = 100 / (o - n) * (e - n);
  return $0(c, [0, 100]);
}
function NP(e, n) {
  return n > 2 ? `Value ${e + 1} of ${n}` : n === 2 ? ["Minimum", "Maximum"][e] : void 0;
}
function DP(e, n) {
  if (e.length === 1) return 0;
  const o = e.map((a) => Math.abs(a - n)), i = Math.min(...o);
  return o.indexOf(i);
}
function jP(e, n, o) {
  const i = e / 2, c = Yd([0, 50], [0, i]);
  return (i - c(n) * o) * o;
}
function IP(e) {
  return e.slice(0, -1).map((n, o) => e[o + 1] - n);
}
function FP(e, n) {
  if (n > 0) {
    const o = IP(e);
    return Math.min(...o) >= n;
  }
  return !0;
}
function Yd(e, n) {
  return (o) => {
    if (e[0] === e[1] || n[0] === n[1]) return n[0];
    const i = (n[1] - n[0]) / (e[1] - e[0]);
    return n[0] + i * (o - e[0]);
  };
}
function uS(e) {
  if (!Number.isFinite(e)) return 0;
  const n = e.toString();
  if (n.includes("e")) {
    const [i, a] = n.split("e"), c = i.split(".")[1] || "", d = Number(a);
    return Math.max(0, c.length - d);
  }
  const o = n.split(".")[1];
  return o ? o.length : 0;
}
function ca(e, n) {
  const o = Math.pow(10, n);
  return Math.round(e * o) / o;
}
function OP(e, {
  min: n,
  step: o,
  direction: i,
  multiplier: a
}) {
  const c = uS(o), d = (e - n) / o, p = Math.round(d), y = ca(p * o + n, c) === ca(e, c);
  let v;
  return y ? v = p + a * i : i > 0 ? v = Math.ceil(d) : v = Math.floor(d), ca(v * o + n, c);
}
function LP(e) {
  return typeof e == "function";
}
function Gy({ label: e, icon: n, value: o, onChange: i }) {
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
      K0,
      {
        className: "radix-slider-root",
        value: [o],
        min: 0,
        max: 100,
        step: 1,
        onValueChange: (a) => i(a[0]),
        children: [
          /* @__PURE__ */ w.jsx(q0, { className: "radix-slider-track", children: /* @__PURE__ */ w.jsx(J0, { className: "radix-slider-range" }) }),
          /* @__PURE__ */ w.jsx(iS, { className: "radix-slider-thumb", "aria-label": e })
        ]
      }
    )
  ] });
}
function cS({ audioState: e }) {
  const n = $((f) => f.musicType), o = $((f) => f.ambientSound), i = $((f) => f.musicVolume), a = $((f) => f.ambientVolume), c = $((f) => f.audioPlaying), d = $((f) => f.setSound), p = $((f) => f.applyAudioPreset), y = $((f) => f.toggleAudio), v = Fa({ musicType: n, ambientSound: o }), S = Gv({ musicType: n, ambientSound: o }), l = v.ambientLayers.map((f) => f.title).filter(Boolean).join(" + ");
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
      Gy,
      {
        label: "Music volume",
        icon: /* @__PURE__ */ w.jsx(Oa, { size: 16, "aria-hidden": "true" }),
        value: i,
        onChange: (f) => d("musicVolume", f)
      }
    ),
    /* @__PURE__ */ w.jsxs("label", { className: "focus-field", children: [
      "Ambient sound selector",
      /* @__PURE__ */ w.jsx("select", { value: o, onChange: (f) => d("ambientSound", f.target.value), children: vi.map((f) => /* @__PURE__ */ w.jsx("option", { value: f.label, children: f.label }, f.label)) })
    ] }),
    /* @__PURE__ */ w.jsx(
      Gy,
      {
        label: "Ambient volume",
        icon: /* @__PURE__ */ w.jsx(d0, { size: 16, "aria-hidden": "true" }),
        value: a,
        onChange: (f) => d("ambientVolume", f)
      }
    ),
    /* @__PURE__ */ w.jsxs("div", { className: "audio-preview liquid-glass-lite", children: [
      /* @__PURE__ */ w.jsxs("div", { children: [
        /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Theme audio preview" }),
        /* @__PURE__ */ w.jsx("strong", { children: v.musicTrack.title }),
        /* @__PURE__ */ w.jsx("p", { children: l }),
        e != null && e.error ? /* @__PURE__ */ w.jsx("p", { className: "audio-error", children: e.error }) : null
      ] }),
      /* @__PURE__ */ w.jsx(Ee, { variant: c ? "primary" : "ghost", onClick: y, children: c ? "Pause audio" : "Play audio" })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "audio-links", children: [v.musicTrack, ...v.ambientLayers].filter((f) => f == null ? void 0 : f.pageUrl).map((f) => /* @__PURE__ */ w.jsx("a", { href: f.pageUrl, target: "_blank", rel: "noreferrer", children: f.title || f.label || "Audio source" }, f.pageUrl)) })
  ] });
}
const VP = [
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
  return /* @__PURE__ */ w.jsxs(on.aside, { className: `focus-utility-panel liquid-glass ${c}`.trim(), initial: { opacity: 0, y: 12, x: 18 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: 10, x: 18 }, transition: sa, role: "dialog", "aria-label": e, children: [
    /* @__PURE__ */ w.jsxs("div", { className: "drawer-head", children: [
      /* @__PURE__ */ w.jsxs("div", { className: "utility-title", children: [
        /* @__PURE__ */ w.jsx("span", { className: "utility-title-icon", children: o }),
        /* @__PURE__ */ w.jsxs("div", { children: [
          /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: n }),
          /* @__PURE__ */ w.jsx("h2", { children: e })
        ] })
      ] }),
      /* @__PURE__ */ w.jsx(Ee, { "aria-label": `Close ${e}`, onClick: a, children: /* @__PURE__ */ w.jsx(f0, { size: 16, "aria-hidden": "true" }) })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "utility-panel-body", children: i })
  ] });
}
function Ky({ audioState: e, scene: n }) {
  const o = $((v) => v.audioChannels), i = $((v) => v.setSound), [a, c] = C.useState(!1), d = (v, S) => {
    c(!1), i(`audioChannel:${v}`, S);
  }, p = () => {
    const v = gi[Math.floor(Math.random() * gi.length)], S = vi[Math.floor(Math.random() * vi.length)];
    i("musicType", v.label), i("ambientSound", S.label), c(!0);
  }, y = () => {
    i("musicType", (n == null ? void 0 : n.musicType) || "Deep Focus"), i("ambientSound", (n == null ? void 0 : n.ambientSound) || "Nature"), c(!0);
  };
  return /* @__PURE__ */ w.jsxs("div", { className: "sound-mixer", children: [
    /* @__PURE__ */ w.jsxs("div", { className: "mixer-featured-row", children: [
      /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Music library" }),
      /* @__PURE__ */ w.jsxs(Ee, { onClick: p, children: [
        /* @__PURE__ */ w.jsx(DC, { size: 14, "aria-hidden": "true" }),
        " Random track"
      ] })
    ] }),
    /* @__PURE__ */ w.jsx(cS, { audioState: e, compact: !0 }),
    /* @__PURE__ */ w.jsxs("div", { className: "mixer-preset-row", children: [
      /* @__PURE__ */ w.jsxs("button", { type: "button", className: "mixer-preset-button", onClick: y, children: [
        "Apply scene mix ",
        /* @__PURE__ */ w.jsx("span", { children: "↗" })
      ] }),
      /* @__PURE__ */ w.jsxs(Ee, { onClick: () => c(!0), children: [
        a ? /* @__PURE__ */ w.jsx(bC, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(tb, { size: 14, "aria-hidden": "true" }),
        " ",
        a ? "Saved" : "Save current mix"
      ] })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "mixer-channel-grid", children: VP.map(([v, S]) => /* @__PURE__ */ w.jsxs("label", { className: "mixer-channel", children: [
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
function zP() {
  const e = () => {
    var i, a, c;
    return ((c = (a = (i = globalThis.window) == null ? void 0 : i.SynapseAuth) == null ? void 0 : a.getStoredSession) == null ? void 0 : c.call(a)) || null;
  }, [n, o] = C.useState(e);
  return C.useEffect(() => {
    var d, p, y, v;
    let i = !0;
    const a = (S) => {
      var l;
      i && o(((l = S == null ? void 0 : S.detail) == null ? void 0 : l.session) || e());
    };
    (d = globalThis.window) == null || d.addEventListener("synapse-auth-changed", a);
    const c = (v = (y = (p = globalThis.window) == null ? void 0 : p.SynapseAuth) == null ? void 0 : y.syncSessionFromProvider) == null ? void 0 : v.call(y);
    return Promise.resolve(c).finally(() => a()), () => {
      var S;
      i = !1, (S = globalThis.window) == null || S.removeEventListener("synapse-auth-changed", a);
    };
  }, []), n;
}
function BP({ onWorkspace: e, session: n }) {
  return !!n ? /* @__PURE__ */ w.jsxs("div", { className: "utility-empty-state", children: [
    /* @__PURE__ */ w.jsx(Aa, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Your Focus Trail" }),
    /* @__PURE__ */ w.jsx("p", { children: "Recent sessions and progress remain available through Synapse history." }),
    /* @__PURE__ */ w.jsx(Ee, { variant: "primary", onClick: () => e == null ? void 0 : e("", "history"), children: "Open session history" })
  ] }) : /* @__PURE__ */ w.jsxs("div", { className: "utility-login-state", children: [
    /* @__PURE__ */ w.jsx(Aa, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Your rhythm, remembered" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Sign in to view your Focus Trail" }),
    /* @__PURE__ */ w.jsx("p", { children: "Track deep-work time, completed goals, and your study streak across devices." }),
    /* @__PURE__ */ w.jsx(Ee, { variant: "primary", onClick: () => e == null ? void 0 : e(), children: "Sign in with Synapse" }),
    /* @__PURE__ */ w.jsx("small", { children: "Your current session continues without an account." })
  ] });
}
function UP({ onWorkspace: e, session: n }) {
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
function $P({ audioState: e, utilityPanel: n, onClose: o, onWorkspace: i }) {
  const a = $((S) => S.activeDrawer), c = $((S) => S.closeDrawer), d = $((S) => S.selectedScene), p = $((S) => S.openDrawer), y = zP(), v = C.useMemo(() => Wn.find((S) => S.id === d) || Wn[0], [d]);
  return /* @__PURE__ */ w.jsxs(ja, { children: [
    n === "trail" ? /* @__PURE__ */ w.jsx(ni, { title: "Focus Trail", kicker: "Your progress", icon: /* @__PURE__ */ w.jsx(Aa, { size: 16 }), onClose: o, children: /* @__PURE__ */ w.jsx(BP, { onWorkspace: i, session: y }) }) : null,
    n === "companion" ? /* @__PURE__ */ w.jsx(ni, { title: "Companion Room", kicker: "Shared focus", icon: /* @__PURE__ */ w.jsx(ba, { size: 16 }), onClose: o, children: /* @__PURE__ */ w.jsx(UP, { onWorkspace: i, session: y }) }) : null,
    n === "settings" ? /* @__PURE__ */ w.jsxs(ni, { title: "Room settings", kicker: "Customize your atmosphere", icon: /* @__PURE__ */ w.jsx(wi, { size: 16 }), onClose: o, className: "room-settings-utility", children: [
      /* @__PURE__ */ w.jsxs("div", { className: "settings-scene-summary", children: [
        /* @__PURE__ */ w.jsx("span", { className: "settings-scene-image", style: { backgroundImage: `url(${(v == null ? void 0 : v.image) || ""})` } }),
        /* @__PURE__ */ w.jsxs("div", { children: [
          /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Current scene" }),
          /* @__PURE__ */ w.jsx("strong", { children: v == null ? void 0 : v.name }),
          /* @__PURE__ */ w.jsx("small", { children: v == null ? void 0 : v.description })
        ] })
      ] }),
      /* @__PURE__ */ w.jsx(Ee, { onClick: () => {
        o == null || o(), p("scene");
      }, children: "Change scene" }),
      /* @__PURE__ */ w.jsx("h3", { className: "utility-section-title", children: "Sound mixer" }),
      /* @__PURE__ */ w.jsx(Ky, { audioState: e, scene: v })
    ] }) : null,
    !n && a === "scene" ? /* @__PURE__ */ w.jsx(ni, { title: "Choose scene", kicker: "Scene", icon: /* @__PURE__ */ w.jsx(wi, { size: 16 }), onClose: c, children: /* @__PURE__ */ w.jsx(Ud, {}) }) : null,
    !n && a === "music" ? /* @__PURE__ */ w.jsx(ni, { title: "Sound atmosphere", kicker: "Room audio", icon: /* @__PURE__ */ w.jsx(Oa, { size: 16 }), onClose: c, children: /* @__PURE__ */ w.jsx(Ky, { audioState: e, scene: v }) }) : null
  ] });
}
const HP = 2800;
function WP(e) {
  const n = String((e == null ? void 0 : e.tagName) || "").toLowerCase();
  return !!(e != null && e.isContentEditable || ["input", "textarea", "select"].includes(n));
}
function GP(e = {}) {
  if (WP(e.target)) return "";
  const n = String(e.key || "").toLowerCase();
  return n === " " || n === "spacebar" ? "toggle-timer" : n === "m" ? "toggle-audio" : n === "n" ? "note" : n === "t" ? "tasks" : n === "s" ? "scene" : n === "?" ? "shortcuts" : n === "escape" ? "escape" : "";
}
function KP(e) {
  return String((e == null ? void 0 : e.materialTitle) || "").trim() || "Focus Room";
}
function YP({ pinned: e = !1, popoverOpen: n = !1, focusWithin: o = !1 } = {}) {
  return !e && !n && !o;
}
function QP(e, n) {
  const o = Array.isArray(e) ? e : [], i = new Set(Array.isArray(n) ? n : []);
  return {
    completed: o.filter((a) => i.has(String((a == null ? void 0 : a.task) || ""))).length,
    total: o.length
  };
}
function qt({ label: e, onClick: n, children: o, pressed: i, disabled: a = !1, primary: c = !1 }) {
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
function XP({
  audioPlaying: e,
  isRunning: n,
  pinned: o,
  onExit: i,
  onOpen: a,
  onSkip: c,
  onToggleAudio: d,
  onTogglePinned: p,
  onToggleTimer: y
}) {
  return /* @__PURE__ */ w.jsxs("div", { className: "focus-mode-controls", "aria-label": "Focus Mode controls", children: [
    /* @__PURE__ */ w.jsx(qt, { label: n ? "Pause timer" : "Start timer", onClick: y, primary: !0, children: n ? /* @__PURE__ */ w.jsx(Ca, { size: 17, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(Vd, { size: 17, fill: "currentColor", "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(qt, { label: "Skip to next phase", onClick: c, children: /* @__PURE__ */ w.jsx(zd, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(qt, { label: e ? "Mute room audio" : "Resume room audio", onClick: d, pressed: e, children: e ? /* @__PURE__ */ w.jsx(Oa, { size: 17, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(pb, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(qt, { label: "Quick Note", onClick: () => a("note"), children: /* @__PURE__ */ w.jsx(KC, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(qt, { label: "Session tasks", onClick: () => a("tasks"), children: /* @__PURE__ */ w.jsx(ab, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(qt, { label: "Change scene", onClick: () => a("scene"), children: /* @__PURE__ */ w.jsx(VC, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(qt, { label: "Sound settings", onClick: () => a("audio"), children: /* @__PURE__ */ w.jsx(l0, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(qt, { label: "Keyboard shortcuts", onClick: () => a("shortcuts"), children: /* @__PURE__ */ w.jsx(PC, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(qt, { label: o ? "Unpin controls" : "Pin controls", onClick: p, pressed: o, children: o ? /* @__PURE__ */ w.jsx($C, { size: 17, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(BC, { size: 17, "aria-hidden": "true" }) }),
    /* @__PURE__ */ w.jsx(qt, { label: "Exit Focus Mode", onClick: i, children: /* @__PURE__ */ w.jsx(a0, { size: 17, "aria-hidden": "true" }) })
  ] });
}
function ri({ id: e, title: n, onClose: o, children: i }) {
  const a = `focus-mode-${e}-title`;
  return /* @__PURE__ */ w.jsxs("section", { className: "focus-mode-popover", role: "dialog", "aria-modal": "false", "aria-labelledby": a, children: [
    /* @__PURE__ */ w.jsxs("header", { className: "focus-mode-popover-head", children: [
      /* @__PURE__ */ w.jsx("h2", { id: a, children: n }),
      /* @__PURE__ */ w.jsx("button", { type: "button", onClick: o, "aria-label": `Close ${n}`, children: /* @__PURE__ */ w.jsx(f0, { size: 16, "aria-hidden": "true" }) })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "focus-mode-popover-body", children: i })
  ] });
}
const ZP = [
  ["Space", "Start or pause timer"],
  ["M", "Mute or resume audio"],
  ["N", "Quick Note"],
  ["T", "Session tasks"],
  ["S", "Change scene"],
  ["?", "Keyboard shortcuts"],
  ["Esc", "Close panel or exit Focus Mode"]
];
function qP({ audioState: e, onExit: n }) {
  const o = $((H) => H.selectedMaterial), i = $((H) => H.studyGoal), a = $((H) => H.studyPlan), c = $((H) => H.completedTasks), d = $((H) => H.workspaceNotes), p = $((H) => H.workspaceUpdatedAt), y = $((H) => H.elapsedSeconds), v = $((H) => H.pomodoroDuration), S = $((H) => H.timerDurationSeconds), l = $((H) => H.timerMode), f = $((H) => H.timerState), g = $((H) => H.timerStatus), x = $((H) => H.currentSession), T = $((H) => H.audioPlaying), _ = $((H) => H.startTimer), A = $((H) => H.pauseTimer), R = $((H) => H.skipTimer), P = $((H) => H.toggleAudio), D = $((H) => H.setWorkspaceNotes), L = $((H) => H.toggleTask), [X, Z] = C.useState(!1), [U, G] = C.useState(!1), [Q, J] = C.useState(""), de = C.useRef(null), ye = C.useRef(null), he = f === "running", Se = l === "countup" ? 0 : Number(S) || (Number(v) || 0) * 60, ue = l === "countup" ? y : Math.max(0, Se - y), ge = Se ? Math.min(100, Math.max(0, y / Se * 100)) : 0, V = C.useMemo(
    () => QP(a, c),
    [c, a]
  ), q = C.useCallback(() => {
    ye.current && (globalThis.clearTimeout(ye.current), ye.current = null);
  }, []), K = C.useCallback(() => {
    q(), ye.current = globalThis.setTimeout(() => {
      var me, pe;
      const H = !!((pe = de.current) != null && pe.contains((me = globalThis.document) == null ? void 0 : me.activeElement));
      YP({ pinned: U, popoverOpen: !!Q, focusWithin: H }) && Z(!1);
    }, HP);
  }, [Q, q, U]), b = C.useCallback(() => {
    Z(!0), K();
  }, [K]), O = C.useCallback(() => {
    he ? A() : _();
  }, [he, A, _]), le = C.useCallback((H) => {
    J(H), Z(!0), q();
  }, [q]), ce = C.useCallback(() => {
    J(""), K();
  }, [K]);
  C.useEffect(() => {
    var me, pe, xe;
    const H = () => b();
    return (me = globalThis.addEventListener) == null || me.call(globalThis, "pointermove", H, { passive: !0 }), (pe = globalThis.addEventListener) == null || pe.call(globalThis, "pointerdown", H, { passive: !0 }), (xe = globalThis.addEventListener) == null || xe.call(globalThis, "focusin", H), K(), () => {
      var Je, Yn, fo;
      q(), (Je = globalThis.removeEventListener) == null || Je.call(globalThis, "pointermove", H), (Yn = globalThis.removeEventListener) == null || Yn.call(globalThis, "pointerdown", H), (fo = globalThis.removeEventListener) == null || fo.call(globalThis, "focusin", H);
    };
  }, [q, b, K]), C.useEffect(() => {
    var me;
    const H = (pe) => {
      const xe = GP(pe);
      xe && (pe.preventDefault(), b(), xe === "toggle-timer" && O(), xe === "toggle-audio" && P(), ["note", "tasks", "scene", "shortcuts"].includes(xe) && le(xe), xe === "escape" && (Q ? ce() : n == null || n()));
    };
    return (me = globalThis.addEventListener) == null || me.call(globalThis, "keydown", H), () => {
      var pe;
      return (pe = globalThis.removeEventListener) == null ? void 0 : pe.call(globalThis, "keydown", H);
    };
  }, [Q, ce, n, le, b, P, O]), C.useEffect(() => {
    U || Q ? (q(), Z(!0)) : K();
  }, [Q, q, U, K]);
  const we = Q === "note" ? /* @__PURE__ */ w.jsxs(ri, { id: "note", title: "Quick Note", onClose: ce, children: [
    /* @__PURE__ */ w.jsx(
      "textarea",
      {
        className: "focus-mode-note",
        value: d,
        onChange: (H) => D(H.target.value),
        placeholder: "Capture a question, connection, or next step…",
        autoFocus: !0
      }
    ),
    /* @__PURE__ */ w.jsx("small", { children: p ? "Autosaved just now" : "Autosave on" })
  ] }) : Q === "tasks" ? /* @__PURE__ */ w.jsx(ri, { id: "tasks", title: "Session tasks", onClose: ce, children: a.length ? /* @__PURE__ */ w.jsx("div", { className: "focus-mode-task-list", children: a.map((H, me) => {
    const pe = c.includes(H.task);
    return /* @__PURE__ */ w.jsxs("label", { children: [
      /* @__PURE__ */ w.jsx("input", { type: "checkbox", checked: pe, onChange: () => L(me) }),
      /* @__PURE__ */ w.jsxs("span", { children: [
        /* @__PURE__ */ w.jsx("strong", { children: H.task }),
        /* @__PURE__ */ w.jsxs("small", { children: [
          H.minutes,
          " min"
        ] })
      ] })
    ] }, `${H.task}-${me}`);
  }) }) : /* @__PURE__ */ w.jsx("p", { className: "focus-mode-empty", children: "Add a study topic from the workspace to receive a session task plan." }) }) : Q === "scene" ? /* @__PURE__ */ w.jsx(ri, { id: "scene", title: "Change scene", onClose: ce, children: /* @__PURE__ */ w.jsx(Ud, {}) }) : Q === "audio" ? /* @__PURE__ */ w.jsx(ri, { id: "audio", title: "Sound settings", onClose: ce, children: /* @__PURE__ */ w.jsx(cS, { audioState: e }) }) : Q === "shortcuts" ? /* @__PURE__ */ w.jsx(ri, { id: "shortcuts", title: "Keyboard shortcuts", onClose: ce, children: /* @__PURE__ */ w.jsx("dl", { className: "focus-mode-shortcuts", children: ZP.map(([H, me]) => /* @__PURE__ */ w.jsxs("div", { children: [
    /* @__PURE__ */ w.jsx("dt", { children: /* @__PURE__ */ w.jsx("kbd", { children: H }) }),
    /* @__PURE__ */ w.jsx("dd", { children: me })
  ] }, H)) }) }) : null;
  return /* @__PURE__ */ w.jsxs(
    "aside",
    {
      ref: de,
      className: `compact-focus-mode-card enhanced-focus-mode-card ${X ? "has-controls" : "is-quiet"} ${U ? "is-pinned" : ""}`.trim(),
      "aria-label": "Distraction-free focus timer",
      onPointerEnter: b,
      onFocusCapture: b,
      children: [
        /* @__PURE__ */ w.jsxs("div", { className: "compact-focus-card-top", children: [
          /* @__PURE__ */ w.jsxs("span", { children: [
            "POMODORO #",
            (x == null ? void 0 : x.pomodoroNumber) || 1
          ] }),
          /* @__PURE__ */ w.jsx(Ee, { className: "compact-exit-button", onClick: n, "aria-label": "Exit Focus Mode", children: /* @__PURE__ */ w.jsx(a0, { size: 14, "aria-hidden": "true" }) })
        ] }),
        /* @__PURE__ */ w.jsxs("span", { className: "compact-focus-status", children: [
          /* @__PURE__ */ w.jsx("i", {}),
          g === "paused" ? "Paused" : "In focus"
        ] }),
        /* @__PURE__ */ w.jsx("strong", { children: ci(ue) }),
        /* @__PURE__ */ w.jsx("div", { className: "compact-focus-progress", "aria-label": `${Math.round(ge)}% complete`, children: /* @__PURE__ */ w.jsx("span", { style: { width: `${ge}%` } }) }),
        /* @__PURE__ */ w.jsxs("small", { children: [
          v,
          " min session"
        ] }),
        /* @__PURE__ */ w.jsxs("div", { className: "focus-mode-reveal", "aria-hidden": !X, children: [
          /* @__PURE__ */ w.jsxs("div", { className: "focus-mode-enhancement-context", children: [
            /* @__PURE__ */ w.jsx("strong", { children: KP(o) }),
            /* @__PURE__ */ w.jsx("span", { children: i || "A quiet block for meaningful progress" }),
            V.total ? /* @__PURE__ */ w.jsxs("small", { children: [
              V.completed,
              "/",
              V.total,
              " tasks"
            ] }) : null
          ] }),
          /* @__PURE__ */ w.jsx(
            XP,
            {
              audioPlaying: T,
              isRunning: he,
              pinned: U,
              onExit: n,
              onOpen: le,
              onSkip: R,
              onToggleAudio: P,
              onTogglePinned: () => G((H) => !H),
              onToggleTimer: O
            }
          )
        ] }),
        we,
        /* @__PURE__ */ w.jsx("span", { className: "sr-only", children: "Move the pointer, tap, or press a shortcut to reveal controls." })
      ]
    }
  );
}
var cc = {};
/*!
 *  howler.js v2.2.4
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */
var Yy;
function JP() {
  return Yy || (Yy = 1, (function(e) {
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
            for (var g = 0; g < f._howls.length; g++)
              if (!f._howls[g]._webAudio)
                for (var x = f._howls[g]._getSoundIds(), T = 0; T < x.length; T++) {
                  var _ = f._howls[g]._soundById(x[T]);
                  _ && _._node && (_._node.volume = _._volume * l);
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
          for (var g = 0; g < f._howls.length; g++)
            if (!f._howls[g]._webAudio)
              for (var x = f._howls[g]._getSoundIds(), T = 0; T < x.length; T++) {
                var _ = f._howls[g]._soundById(x[T]);
                _ && _._node && (_._node.muted = l ? !0 : _._muted);
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
          var g = f.canPlayType("audio/mpeg;").replace(/^no$/, ""), x = l._navigator ? l._navigator.userAgent : "", T = x.match(/OPR\/(\d+)/g), _ = T && parseInt(T[0].split("/")[1], 10) < 33, A = x.indexOf("Safari") !== -1 && x.indexOf("Chrome") === -1, R = x.match(/Version\/(.*?) /), P = A && R && parseInt(R[1], 10) < 15;
          return l._codecs = {
            mp3: !!(!_ && (g || f.canPlayType("audio/mp3;").replace(/^no$/, ""))),
            mpeg: !!g,
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
            var f = function(g) {
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
                  for (var _ = l._howls[T]._getSoundIds(), A = 0; A < _.length; A++) {
                    var R = l._howls[T]._soundById(_[A]);
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
                for (var g = 0; g < l._howls[f]._sounds.length; g++)
                  if (!l._howls[f]._sounds[g]._paused)
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
          for (var g = 0; g < l._src.length; g++) {
            var x, T;
            if (l._format && l._format[g])
              x = l._format[g];
            else {
              if (T = l._src[g], typeof T != "string") {
                l._emit("loaderror", null, "Non-string found in selected audio sources - ignoring.");
                continue;
              }
              x = /^data:audio\/([^;,]+);/i.exec(T), x || (x = /\.([^.]+)$/.exec(T.split("?", 1)[0])), x && (x = x[1].toLowerCase());
            }
            if (x || console.warn('No file extension was found. Consider using the "format" property or specify an extension.'), x && o.codecs(x)) {
              f = l._src[g];
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
          var g = this, x = null;
          if (typeof l == "number")
            x = l, l = null;
          else {
            if (typeof l == "string" && g._state === "loaded" && !g._sprite[l])
              return null;
            if (typeof l > "u" && (l = "__default", !g._playLock)) {
              for (var T = 0, _ = 0; _ < g._sounds.length; _++)
                g._sounds[_]._paused && !g._sounds[_]._ended && (T++, x = g._sounds[_]._id);
              T === 1 ? l = null : x = null;
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
            return f || g._loadQueue("play"), A._id;
          g._webAudio && o._autoResume();
          var P = Math.max(0, A._seek > 0 ? A._seek : g._sprite[l][0] / 1e3), D = Math.max(0, (g._sprite[l][0] + g._sprite[l][1]) / 1e3 - P), L = D * 1e3 / Math.abs(A._rate), X = g._sprite[l][0] / 1e3, Z = (g._sprite[l][0] + g._sprite[l][1]) / 1e3;
          A._sprite = l, A._ended = !1;
          var U = function() {
            A._paused = !1, A._seek = P, A._start = X, A._stop = Z, A._loop = !!(A._loop || g._sprite[l][2]);
          };
          if (P >= Z) {
            g._ended(A);
            return;
          }
          var G = A._node;
          if (g._webAudio) {
            var Q = function() {
              g._playLock = !1, U(), g._refreshBuffer(A);
              var he = A._muted || g._muted ? 0 : A._volume;
              G.gain.setValueAtTime(he, o.ctx.currentTime), A._playStart = o.ctx.currentTime, typeof G.bufferSource.start > "u" ? A._loop ? G.bufferSource.noteGrainOn(0, P, 86400) : G.bufferSource.noteGrainOn(0, P, D) : A._loop ? G.bufferSource.start(0, P, 86400) : G.bufferSource.start(0, P, D), L !== 1 / 0 && (g._endTimers[A._id] = setTimeout(g._ended.bind(g, A), L)), f || setTimeout(function() {
                g._emit("play", A._id), g._loadQueue();
              }, 0);
            };
            o.state === "running" && o.ctx.state !== "interrupted" ? Q() : (g._playLock = !0, g.once("resume", Q), g._clearTimer(A._id));
          } else {
            var J = function() {
              G.currentTime = P, G.muted = A._muted || g._muted || o._muted || G.muted, G.volume = A._volume * o.volume(), G.playbackRate = A._rate;
              try {
                var he = G.play();
                if (he && typeof Promise < "u" && (he instanceof Promise || typeof he.then == "function") ? (g._playLock = !0, U(), he.then(function() {
                  g._playLock = !1, G._unlocked = !0, f ? g._loadQueue() : g._emit("play", A._id);
                }).catch(function() {
                  g._playLock = !1, g._emit("playerror", A._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction."), A._ended = !0, A._paused = !0;
                })) : f || (g._playLock = !1, U(), g._emit("play", A._id)), G.playbackRate = A._rate, G.paused) {
                  g._emit("playerror", A._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.");
                  return;
                }
                l !== "__default" || A._loop ? g._endTimers[A._id] = setTimeout(g._ended.bind(g, A), L) : (g._endTimers[A._id] = function() {
                  g._ended(A), G.removeEventListener("ended", g._endTimers[A._id], !1);
                }, G.addEventListener("ended", g._endTimers[A._id], !1));
              } catch (Se) {
                g._emit("playerror", A._id, Se);
              }
            };
            G.src === "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA" && (G.src = g._src, G.load());
            var de = window && window.ejecta || !G.readyState && o._navigator.isCocoonJS;
            if (G.readyState >= 3 || de)
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
          var f = this;
          if (f._state !== "loaded" || f._playLock)
            return f._queue.push({
              event: "pause",
              action: function() {
                f.pause(l);
              }
            }), f;
          for (var g = f._getSoundIds(l), x = 0; x < g.length; x++) {
            f._clearTimer(g[x]);
            var T = f._soundById(g[x]);
            if (T && !T._paused && (T._seek = f.seek(g[x]), T._rateSeek = 0, T._paused = !0, f._stopFade(g[x]), T._node))
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
          var g = this;
          if (g._state !== "loaded" || g._playLock)
            return g._queue.push({
              event: "stop",
              action: function() {
                g.stop(l);
              }
            }), g;
          for (var x = g._getSoundIds(l), T = 0; T < x.length; T++) {
            g._clearTimer(x[T]);
            var _ = g._soundById(x[T]);
            _ && (_._seek = _._start || 0, _._rateSeek = 0, _._paused = !0, _._ended = !0, g._stopFade(x[T]), _._node && (g._webAudio ? _._node.bufferSource && (typeof _._node.bufferSource.stop > "u" ? _._node.bufferSource.noteOff(0) : _._node.bufferSource.stop(0), g._cleanBuffer(_._node)) : (!isNaN(_._node.duration) || _._node.duration === 1 / 0) && (_._node.currentTime = _._start || 0, _._node.pause(), _._node.duration === 1 / 0 && g._clearSound(_._node))), f || g._emit("stop", _._id));
          }
          return g;
        },
        /**
         * Mute/unmute a single sound or all sounds in this Howl group.
         * @param  {Boolean} muted Set to true to mute and false to unmute.
         * @param  {Number} id    The sound ID to update (omit to mute/unmute all).
         * @return {Howl}
         */
        mute: function(l, f) {
          var g = this;
          if (g._state !== "loaded" || g._playLock)
            return g._queue.push({
              event: "mute",
              action: function() {
                g.mute(l, f);
              }
            }), g;
          if (typeof f > "u")
            if (typeof l == "boolean")
              g._muted = l;
            else
              return g._muted;
          for (var x = g._getSoundIds(f), T = 0; T < x.length; T++) {
            var _ = g._soundById(x[T]);
            _ && (_._muted = l, _._interval && g._stopFade(_._id), g._webAudio && _._node ? _._node.gain.setValueAtTime(l ? 0 : _._volume, o.ctx.currentTime) : _._node && (_._node.muted = o._muted ? !0 : l), g._emit("mute", _._id));
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
          var l = this, f = arguments, g, x;
          if (f.length === 0)
            return l._volume;
          if (f.length === 1 || f.length === 2 && typeof f[1] > "u") {
            var T = l._getSoundIds(), _ = T.indexOf(f[0]);
            _ >= 0 ? x = parseInt(f[0], 10) : g = parseFloat(f[0]);
          } else f.length >= 2 && (g = parseFloat(f[0]), x = parseInt(f[1], 10));
          var A;
          if (typeof g < "u" && g >= 0 && g <= 1) {
            if (l._state !== "loaded" || l._playLock)
              return l._queue.push({
                event: "volume",
                action: function() {
                  l.volume.apply(l, f);
                }
              }), l;
            typeof x > "u" && (l._volume = g), x = l._getSoundIds(x);
            for (var R = 0; R < x.length; R++)
              A = l._soundById(x[R]), A && (A._volume = g, f[2] || l._stopFade(x[R]), l._webAudio && A._node && !A._muted ? A._node.gain.setValueAtTime(g, o.ctx.currentTime) : A._node && !A._muted && (A._node.volume = g * o.volume()), l._emit("volume", A._id));
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
        fade: function(l, f, g, x) {
          var T = this;
          if (T._state !== "loaded" || T._playLock)
            return T._queue.push({
              event: "fade",
              action: function() {
                T.fade(l, f, g, x);
              }
            }), T;
          l = Math.min(Math.max(0, parseFloat(l)), 1), f = Math.min(Math.max(0, parseFloat(f)), 1), g = parseFloat(g), T.volume(l, x);
          for (var _ = T._getSoundIds(x), A = 0; A < _.length; A++) {
            var R = T._soundById(_[A]);
            if (R) {
              if (x || T._stopFade(_[A]), T._webAudio && !R._muted) {
                var P = o.ctx.currentTime, D = P + g / 1e3;
                R._volume = l, R._node.gain.setValueAtTime(l, P), R._node.gain.linearRampToValueAtTime(f, D);
              }
              T._startFadeInterval(R, l, f, g, _[A], typeof x > "u");
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
        _startFadeInterval: function(l, f, g, x, T, _) {
          var A = this, R = f, P = g - f, D = Math.abs(P / 0.01), L = Math.max(4, D > 0 ? x / D : x), X = Date.now();
          l._fadeTo = g, l._interval = setInterval(function() {
            var Z = (Date.now() - X) / x;
            X = Date.now(), R += P * Z, R = Math.round(R * 100) / 100, P < 0 ? R = Math.max(g, R) : R = Math.min(g, R), A._webAudio ? l._volume = R : A.volume(R, l._id, !0), _ && (A._volume = R), (g < f && R <= g || g > f && R >= g) && (clearInterval(l._interval), l._interval = null, l._fadeTo = null, A.volume(g, l._id), A._emit("fade", l._id));
          }, L);
        },
        /**
         * Internal method that stops the currently playing fade when
         * a new fade starts, volume is changed or the sound is stopped.
         * @param  {Number} id The sound id.
         * @return {Howl}
         */
        _stopFade: function(l) {
          var f = this, g = f._soundById(l);
          return g && g._interval && (f._webAudio && g._node.gain.cancelScheduledValues(o.ctx.currentTime), clearInterval(g._interval), g._interval = null, f.volume(g._fadeTo, l), g._fadeTo = null, f._emit("fade", l)), f;
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
          var l = this, f = arguments, g, x, T;
          if (f.length === 0)
            return l._loop;
          if (f.length === 1)
            if (typeof f[0] == "boolean")
              g = f[0], l._loop = g;
            else
              return T = l._soundById(parseInt(f[0], 10)), T ? T._loop : !1;
          else f.length === 2 && (g = f[0], x = parseInt(f[1], 10));
          for (var _ = l._getSoundIds(x), A = 0; A < _.length; A++)
            T = l._soundById(_[A]), T && (T._loop = g, l._webAudio && T._node && T._node.bufferSource && (T._node.bufferSource.loop = g, g && (T._node.bufferSource.loopStart = T._start || 0, T._node.bufferSource.loopEnd = T._stop, l.playing(_[A]) && (l.pause(_[A], !0), l.play(_[A], !0)))));
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
          var l = this, f = arguments, g, x;
          if (f.length === 0)
            x = l._sounds[0]._id;
          else if (f.length === 1) {
            var T = l._getSoundIds(), _ = T.indexOf(f[0]);
            _ >= 0 ? x = parseInt(f[0], 10) : g = parseFloat(f[0]);
          } else f.length === 2 && (g = parseFloat(f[0]), x = parseInt(f[1], 10));
          var A;
          if (typeof g == "number") {
            if (l._state !== "loaded" || l._playLock)
              return l._queue.push({
                event: "rate",
                action: function() {
                  l.rate.apply(l, f);
                }
              }), l;
            typeof x > "u" && (l._rate = g), x = l._getSoundIds(x);
            for (var R = 0; R < x.length; R++)
              if (A = l._soundById(x[R]), A) {
                l.playing(x[R]) && (A._rateSeek = l.seek(x[R]), A._playStart = l._webAudio ? o.ctx.currentTime : A._playStart), A._rate = g, l._webAudio && A._node && A._node.bufferSource ? A._node.bufferSource.playbackRate.setValueAtTime(g, o.ctx.currentTime) : A._node && (A._node.playbackRate = g);
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
          var l = this, f = arguments, g, x;
          if (f.length === 0)
            l._sounds.length && (x = l._sounds[0]._id);
          else if (f.length === 1) {
            var T = l._getSoundIds(), _ = T.indexOf(f[0]);
            _ >= 0 ? x = parseInt(f[0], 10) : l._sounds.length && (x = l._sounds[0]._id, g = parseFloat(f[0]));
          } else f.length === 2 && (g = parseFloat(f[0]), x = parseInt(f[1], 10));
          if (typeof x > "u")
            return 0;
          if (typeof g == "number" && (l._state !== "loaded" || l._playLock))
            return l._queue.push({
              event: "seek",
              action: function() {
                l.seek.apply(l, f);
              }
            }), l;
          var A = l._soundById(x);
          if (A)
            if (typeof g == "number" && g >= 0) {
              var R = l.playing(x);
              R && l.pause(x, !0), A._seek = g, A._ended = !1, l._clearTimer(x), !l._webAudio && A._node && !isNaN(A._node.duration) && (A._node.currentTime = g);
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
            var g = f._soundById(l);
            return g ? !g._paused : !1;
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
          var f = this, g = f._duration, x = f._soundById(l);
          return x && (g = f._sprite[x._sprite][1] / 1e3), g;
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
          for (var l = this, f = l._sounds, g = 0; g < f.length; g++)
            f[g]._paused || l.stop(f[g]._id), l._webAudio || (l._clearSound(f[g]._node), f[g]._node.removeEventListener("error", f[g]._errorFn, !1), f[g]._node.removeEventListener(o._canPlayEvent, f[g]._loadFn, !1), f[g]._node.removeEventListener("ended", f[g]._endFn, !1), o._releaseHtml5Audio(f[g]._node)), delete f[g]._node, l._clearTimer(f[g]._id);
          var x = o._howls.indexOf(l);
          x >= 0 && o._howls.splice(x, 1);
          var T = !0;
          for (g = 0; g < o._howls.length; g++)
            if (o._howls[g]._src === l._src || l._src.indexOf(o._howls[g]._src) >= 0) {
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
        on: function(l, f, g, x) {
          var T = this, _ = T["_on" + l];
          return typeof f == "function" && _.push(x ? { id: g, fn: f, once: x } : { id: g, fn: f }), T;
        },
        /**
         * Remove a custom event. Call without parameters to remove all events.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to remove. Leave empty to remove all.
         * @param  {Number}   id    (optional) Only remove events for this sound.
         * @return {Howl}
         */
        off: function(l, f, g) {
          var x = this, T = x["_on" + l], _ = 0;
          if (typeof f == "number" && (g = f, f = null), f || g)
            for (_ = 0; _ < T.length; _++) {
              var A = g === T[_].id;
              if (f === T[_].fn && A || !f && A) {
                T.splice(_, 1);
                break;
              }
            }
          else if (l)
            x["_on" + l] = [];
          else {
            var R = Object.keys(x);
            for (_ = 0; _ < R.length; _++)
              R[_].indexOf("_on") === 0 && Array.isArray(x[R[_]]) && (x[R[_]] = []);
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
        once: function(l, f, g) {
          var x = this;
          return x.on(l, f, g, 1), x;
        },
        /**
         * Emit all events of a specific type and pass the sound id.
         * @param  {String} event Event name.
         * @param  {Number} id    Sound ID.
         * @param  {Number} msg   Message to go with event.
         * @return {Howl}
         */
        _emit: function(l, f, g) {
          for (var x = this, T = x["_on" + l], _ = T.length - 1; _ >= 0; _--)
            (!T[_].id || T[_].id === f || l === "load") && (setTimeout((function(A) {
              A.call(this, f, g);
            }).bind(x, T[_].fn), 0), T[_].once && x.off(l, T[_].fn, T[_].id));
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
            var g = f._queue[0];
            g.event === l && (f._queue.shift(), f._loadQueue()), l || g.action();
          }
          return f;
        },
        /**
         * Fired when playback ends at the end of the duration.
         * @param  {Sound} sound The sound object to work with.
         * @return {Howl}
         */
        _ended: function(l) {
          var f = this, g = l._sprite;
          if (!f._webAudio && l._node && !l._node.paused && !l._node.ended && l._node.currentTime < l._stop)
            return setTimeout(f._ended.bind(f, l), 100), f;
          var x = !!(l._loop || f._sprite[g][2]);
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
              var g = f._soundById(l);
              g && g._node && g._node.removeEventListener("ended", f._endTimers[l], !1);
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
          for (var f = this, g = 0; g < f._sounds.length; g++)
            if (l === f._sounds[g]._id)
              return f._sounds[g];
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
          var l = this, f = l._pool, g = 0, x = 0;
          if (!(l._sounds.length < f)) {
            for (x = 0; x < l._sounds.length; x++)
              l._sounds[x]._ended && g++;
            for (x = l._sounds.length - 1; x >= 0; x--) {
              if (g <= f)
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
          var f = this;
          if (typeof l > "u") {
            for (var g = [], x = 0; x < f._sounds.length; x++)
              g.push(f._sounds[x]._id);
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
          var f = this;
          return l._node.bufferSource = o.ctx.createBufferSource(), l._node.bufferSource.buffer = c[f._src], l._panner ? l._node.bufferSource.connect(l._panner) : l._node.bufferSource.connect(l._node), l._node.bufferSource.loop = l._loop, l._loop && (l._node.bufferSource.loopStart = l._start || 0, l._node.bufferSource.loopEnd = l._stop || 0), l._node.bufferSource.playbackRate.setValueAtTime(l._rate, o.ctx.currentTime), f;
        },
        /**
         * Prevent memory leaks by cleaning up the buffer source after playback.
         * @param  {Object} node Sound's audio node containing the buffer source.
         * @return {Howl}
         */
        _cleanBuffer: function(l) {
          var f = this, g = o._navigator && o._navigator.vendor.indexOf("Apple") >= 0;
          if (!l.bufferSource)
            return f;
          if (o._scratchBuffer && l.bufferSource && (l.bufferSource.onended = null, l.bufferSource.disconnect(0), g))
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
          var l = this, f = l._parent, g = o._muted || l._muted || l._parent._muted ? 0 : l._volume;
          return f._webAudio ? (l._node = typeof o.ctx.createGain > "u" ? o.ctx.createGainNode() : o.ctx.createGain(), l._node.gain.setValueAtTime(g, o.ctx.currentTime), l._node.paused = !0, l._node.connect(o.masterGain)) : o.noAudio || (l._node = o._obtainHtml5Audio(), l._errorFn = l._errorListener.bind(l), l._node.addEventListener("error", l._errorFn, !1), l._loadFn = l._loadListener.bind(l), l._node.addEventListener(o._canPlayEvent, l._loadFn, !1), l._endFn = l._endListener.bind(l), l._node.addEventListener("ended", l._endFn, !1), l._node.src = f._src, l._node.preload = f._preload === !0 ? "auto" : f._preload, l._node.volume = g * o.volume(), l._node.load()), l;
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
          l._duration = c[f].duration, v(l);
          return;
        }
        if (/^data:[^;]+;base64,/.test(f)) {
          for (var g = atob(f.split(",")[1]), x = new Uint8Array(g.length), T = 0; T < g.length; ++T)
            x[T] = g.charCodeAt(T);
          y(x.buffer, l);
        } else {
          var _ = new XMLHttpRequest();
          _.open(l._xhr.method, f, !0), _.withCredentials = l._xhr.withCredentials, _.responseType = "arraybuffer", l._xhr.headers && Object.keys(l._xhr.headers).forEach(function(A) {
            _.setRequestHeader(A, l._xhr.headers[A]);
          }), _.onload = function() {
            var A = (_.status + "")[0];
            if (A !== "0" && A !== "2" && A !== "3") {
              l._emit("loaderror", null, "Failed loading audio file with status: " + _.status + ".");
              return;
            }
            y(_.response, l);
          }, _.onerror = function() {
            l._webAudio && (l._html5 = !0, l._webAudio = !1, l._sounds = [], delete c[f], l.load());
          }, p(_);
        }
      }, p = function(l) {
        try {
          l.send();
        } catch {
          l.onerror();
        }
      }, y = function(l, f) {
        var g = function() {
          f._emit("loaderror", null, "Decoding audio data failed.");
        }, x = function(T) {
          T && f._sounds.length > 0 ? (c[f._src] = T, v(f, T)) : g();
        };
        typeof Promise < "u" && o.ctx.decodeAudioData.length === 1 ? o.ctx.decodeAudioData(l).then(x).catch(g) : o.ctx.decodeAudioData(l, x, g);
      }, v = function(l, f) {
        f && !l._duration && (l._duration = f.duration), Object.keys(l._sprite).length === 0 && (l._sprite = { __default: [0, l._duration * 1e3] }), l._state !== "loaded" && (l._state = "loaded", l._emit("load"), l._loadQueue());
      }, S = function() {
        if (o.usingWebAudio) {
          try {
            typeof AudioContext < "u" ? o.ctx = new AudioContext() : typeof webkitAudioContext < "u" ? o.ctx = new webkitAudioContext() : o.usingWebAudio = !1;
          } catch {
            o.usingWebAudio = !1;
          }
          o.ctx || (o.usingWebAudio = !1);
          var l = /iP(hone|od|ad)/.test(o._navigator && o._navigator.platform), f = o._navigator && o._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/), g = f ? parseInt(f[1], 10) : null;
          if (l && g && g < 9) {
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
        var v = y._orientation;
        if (i = typeof i != "number" ? v[1] : i, a = typeof a != "number" ? v[2] : a, c = typeof c != "number" ? v[3] : c, d = typeof d != "number" ? v[4] : d, p = typeof p != "number" ? v[5] : p, typeof o == "number")
          y._orientation = [o, i, a, c, d, p], typeof y.ctx.listener.forwardX < "u" ? (y.ctx.listener.forwardX.setTargetAtTime(o, Howler.ctx.currentTime, 0.1), y.ctx.listener.forwardY.setTargetAtTime(i, Howler.ctx.currentTime, 0.1), y.ctx.listener.forwardZ.setTargetAtTime(a, Howler.ctx.currentTime, 0.1), y.ctx.listener.upX.setTargetAtTime(c, Howler.ctx.currentTime, 0.1), y.ctx.listener.upY.setTargetAtTime(d, Howler.ctx.currentTime, 0.1), y.ctx.listener.upZ.setTargetAtTime(p, Howler.ctx.currentTime, 0.1)) : y.ctx.listener.setOrientation(o, i, a, c, d, p);
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
          var v = d._soundById(p[y]);
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
        for (var p = d._getSoundIds(c), y = 0; y < p.length; y++) {
          var v = d._soundById(p[y]);
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
        for (var p = o._getSoundIds(c), y = 0; y < p.length; y++)
          if (d = o._soundById(p[y]), d) {
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
  })(cc)), cc;
}
var eM = JP();
const tM = /* @__PURE__ */ ng(eM), { Howl: dS } = tM, Jc = 500, Pt = {
  music: null,
  ambient: /* @__PURE__ */ new Map()
};
let dr = {}, fi = !1, ed = "";
function _i() {
  return typeof dS == "function";
}
function dc(e, n = 50) {
  const o = Number(e), i = Number.isFinite(o) ? o : n;
  return Math.min(1, Math.max(0, i / 100));
}
function fS(e) {
  return new dS({
    src: [e],
    loop: !0,
    html5: !0,
    preload: !0,
    volume: 0
  });
}
function pS(e, n, o = Jc) {
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
function Ba(e, { unload: n = !1 } = {}) {
  var o;
  e && (pS(e, 0, Math.min(Jc, 300)), (o = globalThis.setTimeout) == null || o.call(globalThis, () => {
    try {
      e.pause(), n && e.unload();
    } catch {
    }
  }, Math.min(Jc, 320)));
}
function nM(e) {
  return !(e != null && e.streamUrl) || !_i() ? null : ((!Pt.music || Pt.music.__synapseSrc !== e.streamUrl) && (Ba(Pt.music, { unload: !0 }), Pt.music = fS(e.streamUrl), Pt.music.__synapseSrc = e.streamUrl), Pt.music);
}
function rM(e) {
  if (!(e != null && e.streamUrl) || !_i()) return null;
  const n = e.id || e.streamUrl, o = Pt.ambient.get(n);
  if (o && o.__synapseSrc === e.streamUrl) return o;
  Ba(o, { unload: !0 });
  const i = fS(e.streamUrl);
  return i.__synapseSrc = e.streamUrl, Pt.ambient.set(n, i), i;
}
function oM() {
  return [
    Pt.music,
    ...Pt.ambient.values()
  ].filter(Boolean);
}
function hS() {
  oM().forEach((e) => Ba(e));
}
function iM(e) {
  for (const [n, o] of Pt.ambient.entries())
    e.has(n) || (Ba(o, { unload: !0 }), Pt.ambient.delete(n));
}
function Qy(e, n) {
  if (e)
    try {
      e.playing() || e.play(), pS(e, n), ed = "";
    } catch (o) {
      ed = (o == null ? void 0 : o.message) || "Audio playback is blocked until the browser receives a user action.";
    }
}
async function sM(e = {}) {
  dr = { ...dr, ...e };
  const n = Fa(dr);
  if (!_i()) return da(n);
  if (!fi)
    return hS(), da(n);
  const o = nM(n.musicTrack), i = dc(dr.musicVolume, 60), a = dc(dr.ambientVolume, 50), c = /* @__PURE__ */ new Set(), d = [];
  return n.ambientLayers.forEach((p) => {
    var f;
    const y = p.id || p.streamUrl;
    c.add(y);
    const v = rM(p), S = Number((f = dr.audioChannels) == null ? void 0 : f[p.id]), l = Number.isFinite(S) ? dc(S, 0) : Math.min(1, Math.max(0, a * (p.volumeBias ?? 1)));
    d.push([v, l]);
  }), iM(c), Qy(o, i), d.forEach(([p, y]) => Qy(p, y)), da(n);
}
function aM(e) {
  return fi = !!e, fi || hS(), fi;
}
function da(e = Fa(dr)) {
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
    error: ed
  };
}
const lM = "synapse.focusRoom.audioPrefs.v1";
function uM(e) {
  var n;
  try {
    (n = globalThis.localStorage) == null || n.setItem(lM, JSON.stringify({
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
function cM() {
  const e = $((y) => y.musicType), n = $((y) => y.ambientSound), o = $((y) => y.musicVolume), i = $((y) => y.ambientVolume), a = $((y) => y.audioChannels), c = $((y) => y.audioPlaying), [d, p] = C.useState(() => da(Fa({
    musicType: e,
    ambientSound: n
  })));
  return C.useEffect(() => {
    const y = { musicType: e, ambientSound: n, musicVolume: o, ambientVolume: i, audioChannels: a };
    let v = !1;
    return aM(c), uM(y), sM(y).then((S) => {
      v || p(S);
    }), () => {
      v = !0;
    };
  }, [n, i, a, c, e, o]), d;
}
function dM() {
  const e = $(), n = C.useCallback(async (i = "", a = "", c = {}) => {
    var S;
    e.pauseTimer({ pauseAudio: !0 }), e.closeSummary();
    const d = typeof i == "string" || typeof i == "number" ? i : "", p = typeof a == "string" ? a : "", y = fM(p, c), v = String(d || e.selectedMaterialId || ((S = e.selectedMaterial) == null ? void 0 : S.materialId) || "");
    if (typeof globalThis.returnFromFocusRoomToWorkspace == "function")
      try {
        const l = globalThis.returnFromFocusRoomToWorkspace(v, y);
        l && typeof l.then == "function" && await l, Xy(y.action || p, y);
        return;
      } catch (l) {
        console.error("Could not return from Focus Room:", l);
      }
    globalThis.location.hash = "", Xy(y.action || p, y);
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
function mS(e) {
  const n = String(e || "").trim().toLowerCase();
  return ["flashcards", "quiz", "assistant", "mindmap", "timeline", "source", "notes"].includes(n) ? n : "";
}
function fM(e, n = {}) {
  const o = n && typeof n == "object" && !Array.isArray(n) ? n : {}, i = mS(e || o.action);
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
function Xy(e, n = {}) {
  const o = mS(e);
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
function pM(e = 3e3) {
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
function hM() {
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
function mM() {
  const e = $((n) => n.selectedScene);
  return Gn(e);
}
function yM(e) {
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
function gM() {
  const [e, n] = C.useState(""), [o, i] = C.useState(!1), [a, c] = C.useState(!1), d = $((P) => P.view), p = pM(3e3), y = mM(), v = cM(), S = dM();
  hM();
  const l = $(Ix(yM)), f = $((P) => P.summaryRecord), g = $((P) => P.endSession), x = $((P) => P.initializeFocusRoom), T = $((P) => P.openSetup), _ = $((P) => P.showStudyHistory);
  C.useEffect(() => {
    x();
  }, [x]), C.useEffect(() => {
    l != null && l.materialId && Id(l.materialId, l);
  }, [l]), C.useEffect(() => {
    d === "session" || !f || Jv("focus-room");
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
    c(!1), i(!1), n(""), g(), await A();
  };
  return /* @__PURE__ */ w.jsxs(
    "main",
    {
      id: "focusRoomSurface",
      className: `focus-room-surface react-focus-room ${p ? "is-idle" : ""} ${d === "setup" ? "is-innook-setup" : ""}`.trim(),
      "aria-live": "polite",
      children: [
        /* @__PURE__ */ w.jsx(mC, { scene: y }),
        /* @__PURE__ */ w.jsx(ja, { mode: "wait", children: d === "landing" ? /* @__PURE__ */ w.jsx(
          on.div,
          {
            className: "focus-room-view focus-landing-view",
            initial: { opacity: 0, y: 14 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -8 },
            transition: sa,
            children: /* @__PURE__ */ w.jsx(yb, { onStart: T, onWorkspace: A, onHistory: _ })
          },
          "landing"
        ) : d === "setup" ? /* @__PURE__ */ w.jsx(
          on.div,
          {
            className: "focus-room-view focus-setup-view",
            initial: { opacity: 0, y: 14 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -8 },
            transition: sa,
            children: /* @__PURE__ */ w.jsx(Db, {})
          },
          "setup"
        ) : /* @__PURE__ */ w.jsxs(
          on.div,
          {
            className: "focus-room-view focus-session-view",
            initial: { opacity: 0, y: 14 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -8 },
            transition: sa,
            children: [
              o ? /* @__PURE__ */ w.jsx("button", { type: "button", className: "focus-mode-exit-hit-area", onClick: () => i(!1), children: "Exit Focus Mode" }) : /* @__PURE__ */ w.jsx(Ob, { onWorkspace: A, onOpenTrail: () => n("trail"), onOpenCompanion: () => n("companion"), onOpenSettings: () => n("settings"), onExit: () => c(!0) }),
              /* @__PURE__ */ w.jsx("section", { className: `focus-session-stage ${o ? "is-focus-mode" : ""}`.trim(), children: /* @__PURE__ */ w.jsx("div", { className: "focus-session-grid", children: /* @__PURE__ */ w.jsx(Fb, {}) }) }),
              o ? /* @__PURE__ */ w.jsx(qP, { audioState: v, onExit: () => i(!1) }) : /* @__PURE__ */ w.jsx(Lb, { audioState: v, onFocusMode: () => i(!0) }),
              o ? null : /* @__PURE__ */ w.jsx($P, { audioState: v, utilityPanel: e, onClose: () => n(""), onWorkspace: A }),
              /* @__PURE__ */ w.jsx(SP, {}),
              /* @__PURE__ */ w.jsx(vM, { open: a, onClose: () => c(!1), onConfirm: R })
            ]
          },
          "session"
        ) })
      ]
    }
  );
}
function vM({ open: e, onClose: n, onConfirm: o }) {
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
let fc = null;
function SM(e, n) {
  const o = globalThis.__synapseFocusRoomApi || {};
  if (typeof o[e] != "function") {
    console.warn(`Synapse Focus Room action "${e}" is not available yet.`);
    return;
  }
  return o[e](...n);
}
function wM() {
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
    globalThis[n] = (...i) => SM(o, i);
  });
}
function xM(e = {}) {
  wM();
  const n = e.root || document.getElementById("focusRoomRoot");
  if (!n)
    throw new Error("Focus Room root element was not found.");
  fc || (fc = Mx.createRoot(n), fc.render(
    gn.createElement(
      gn.StrictMode,
      null,
      gn.createElement(gM)
    )
  ));
}
const _M = "synapse.generated.history.v6", yS = "synapse.active.generated.v6", kM = "synapse.flashcards.deck.v1", TM = "synapse.quiz.history.v1", AM = "synapse.focusRoom.return-target.v1";
function Qd(e, n) {
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
function CM(e, n) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, n), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function bM(e, n) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, JSON.stringify(n)), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function gS() {
  const e = Qd(_M, []);
  return Array.isArray(e) ? e : [];
}
function EM(e) {
  const n = String((e == null ? void 0 : e.title) || "").trim();
  return n || String((e == null ? void 0 : e.summary) || "").split(/\n+/).map((i) => i.replace(/^#+\s*/, "").trim()).find((i) => i.length > 4) || "Generated Study Notes";
}
function vS(e = {}) {
  return [
    e.id ? `history:${e.id}` : "",
    e.sourceFingerprint ? `fingerprint:${e.sourceFingerprint}` : "",
    e.clientFingerprint ? `fingerprint:${e.clientFingerprint}` : ""
  ].filter(Boolean);
}
function PM(e = {}) {
  const n = Qd(kM, {}), i = vS(e).map((a) => n == null ? void 0 : n[a]).find((a) => a && Array.isArray(a.cards) && a.cards.length);
  return (i == null ? void 0 : i.cards) || [];
}
function MM(e = {}) {
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
function RM(e = []) {
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
function NM(e = {}) {
  const n = Qd(TM, {}), i = vS(e).flatMap((c) => Array.isArray(n == null ? void 0 : n[c]) ? n[c] : []), a = /* @__PURE__ */ new Set();
  return RM(i).filter((c) => {
    const d = MM(c);
    return !d || a.has(d) ? !1 : (a.add(d), !0);
  }).sort((c, d) => new Date(d.createdAt || 0) - new Date(c.createdAt || 0));
}
function DM(e = {}) {
  return {
    materialId: String(e.id || e.sourceFingerprint || e.clientFingerprint || "current-material"),
    materialTitle: EM(e),
    materialType: "Generated notes",
    uploadedContent: "",
    aiSummary: e.summary || "",
    sections: e.sections || {},
    flashcards: PM(e),
    quizzes: NM(e),
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
function SS() {
  return gS().filter((e) => e && (e.id || e.summary)).map(DM);
}
function wS(e = "") {
  const n = String(e || "");
  return n && SS().find(
    (o) => o.materialId === n || o.sourceFingerprint === n || o.clientFingerprint === n
  ) || null;
}
function xS() {
  var n;
  const e = ((n = globalThis.localStorage) == null ? void 0 : n.getItem(yS)) || "";
  return wS(e);
}
function jM(e = "") {
  var i;
  const n = e || ((i = xS()) == null ? void 0 : i.materialId) || "", o = n ? `/${encodeURIComponent(n)}` : "";
  globalThis.location.hash = `#/focus-room${o}`;
}
function IM(e = "", n = {}) {
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
async function FM(e = "", n = {}) {
  const o = String(e || ""), i = gS().find(
    (d) => String((d == null ? void 0 : d.id) || "") === o || String((d == null ? void 0 : d.sourceFingerprint) || (d == null ? void 0 : d.source_fingerprint) || "") === o || String((d == null ? void 0 : d.clientFingerprint) || (d == null ? void 0 : d.client_fingerprint) || "") === o
  ) || null, a = String((i == null ? void 0 : i.id) || "");
  a && CM(yS, a);
  const c = IM(a, n);
  c.action && bM(AM, c), globalThis.location.href = a ? `index.html?focusReturn=${encodeURIComponent(a)}` : "index.html";
}
function OM() {
  Object.assign(globalThis, {
    getSynapseFocusRoomCurrentMaterial: xS,
    getSynapseFocusRoomMaterial: wS,
    getSynapseFocusRoomMaterials: SS,
    openSynapseFocusRoom: jM,
    returnFromFocusRoomToWorkspace: FM
  });
}
const _S = document.getElementById("focusRoomRoot");
if (!_S)
  throw new Error("Focus Room root element was not found.");
var Jy;
(Jy = document.getElementById("focusRoomFallbackTitle")) == null || Jy.remove();
globalThis.apiClient = new tg(_x);
OM();
(!globalThis.location.hash || globalThis.location.hash === "#") && (globalThis.location.hash = "#/focus-room");
xM({ root: _S });
