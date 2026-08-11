function A1(e, t) {
  for (var o = 0; o < t.length; o++) {
    const i = t[o];
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
function b1(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function Ug(e) {
  const t = String(e || "").toLowerCase();
  return t === "127.0.0.1" || t === "localhost" || t === "::1" || t === "[::1]";
}
function Ph(e) {
  return Ug(e) || b1(e);
}
function C1(e) {
  return !e || Ug(e) ? "127.0.0.1" : e;
}
const P1 = (() => {
  var p, m, y, S;
  const { protocol: e, hostname: t, port: o } = window.location, i = String(window.SYNAPSE_BACKEND_PORT || ((m = (p = document.body) == null ? void 0 : p.dataset) == null ? void 0 : m.apiPort) || "8001").trim(), a = `http://${C1(t)}:${i || "8001"}`, f = String(window.SYNAPSE_API_BASE || ((S = (y = document.body) == null ? void 0 : y.dataset) == null ? void 0 : S.apiBase) || "").replace(/\/+$/, ""), d = `${e}//${window.location.host}`.replace(/\/+$/, "");
  return f && !(Ph(t) && o !== i && f === d) ? f : e === "file:" || Ph(t) && o !== i ? a : `${e}//${window.location.host}`;
})();
class ro extends Error {
  constructor(t, { cause: o, code: i } = {}) {
    super(t), this.name = "ApiConnectionError", this.cause = o, this.code = i || "connection_error";
  }
}
const Eh = "synapse.client.id.v1";
function Hn() {
  return globalThis.window || globalThis;
}
function oo(e, t = 220) {
  return String(e || "").replace(/[\r\n]+/g, " ").trim().slice(0, t);
}
function Mh() {
  const e = globalThis.crypto || Hn().crypto;
  return e != null && e.randomUUID ? e.randomUUID() : `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
function E1() {
  var t, o;
  const e = Hn();
  try {
    const i = (t = e.localStorage) == null ? void 0 : t.getItem(Eh);
    if (i) return i;
    const a = Mh();
    return (o = e.localStorage) == null || o.setItem(Eh, a), a;
  } catch {
    return Mh();
  }
}
function M1(e = {}) {
  if (typeof Headers < "u" && e instanceof Headers) {
    const t = {};
    return e.forEach((o, i) => {
      t[i] = o;
    }), t;
  }
  return Array.isArray(e) ? Object.fromEntries(e) : { ...e || {} };
}
class Hg {
  constructor(t, { fetchImpl: o } = {}) {
    var a, f;
    const i = Hn();
    this.baseUrl = String(t || "").replace(/\/+$/, ""), this.fetchImpl = o || ((a = i.fetch) == null ? void 0 : a.bind(i)) || ((f = globalThis.fetch) == null ? void 0 : f.bind(globalThis));
  }
  endpoint(t) {
    const o = String(t || "").replace(/^\/+/, "");
    return `${this.baseUrl}/${o}`;
  }
  timeoutMessage(t) {
    return `Synapse backend did not respond within ${Math.max(1, Math.round(Number(t || 0) / 1e3))} seconds. Try a smaller source set or increase window.SYNAPSE_ANALYSIS_TIMEOUT_MS.`;
  }
  isLocalBackend() {
    try {
      const t = new URL(this.baseUrl).hostname.toLowerCase();
      return t === "localhost" || t === "127.0.0.1" || t === "0.0.0.0";
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
  async requestHeaders(t = {}) {
    var f, d, p;
    const o = Hn(), i = M1(t);
    i["X-Synapse-Client-Id"] = oo(E1(), 160);
    const a = (d = (f = o.SynapseAuth) == null ? void 0 : f.getStoredSession) == null ? void 0 : d.call(f);
    if (a && typeof a == "object" && (a.accountId && (i["X-Synapse-User-Id"] = oo(a.accountId, 160)), a.email && (i["X-Synapse-User-Email"] = oo(a.email, 220)), a.displayName && (i["X-Synapse-User-Name"] = oo(a.displayName, 180)), a.authMode && (i["X-Synapse-Auth-Mode"] = oo(a.authMode, 60)), a.role && (i["X-Synapse-User-Role"] = oo(a.role, 80))), (p = o.SynapseAuth) != null && p.authHeaders && !i.Authorization && !i.authorization)
      try {
        const m = await o.SynapseAuth.authHeaders({});
        m != null && m.Authorization && (i.Authorization = m.Authorization), m != null && m.authorization && (i.authorization = m.authorization);
      } catch (m) {
        console.warn("Synapse auth headers were not attached:", m);
      }
    return i;
  }
  async fetch(t, o = {}) {
    var l;
    const i = this.endpoint(t), { timeoutMs: a, ...f } = o || {};
    f.headers = await this.requestHeaders(f.headers || {});
    const d = Number(a || 0);
    let p = null, m = null, y = null;
    const S = f.signal;
    d > 0 && typeof AbortController < "u" && (p = new AbortController(), y = () => p.abort(), S && (S.aborted ? p.abort() : S.addEventListener("abort", y, { once: !0 })), m = Hn().setTimeout(() => p.abort(), d), f.signal = p.signal);
    try {
      return await this.fetchImpl(i, f);
    } catch (c) {
      throw (l = p == null ? void 0 : p.signal) != null && l.aborted && !(S != null && S.aborted) ? new ro(this.timeoutMessage(d), {
        cause: c,
        code: "timeout"
      }) : S != null && S.aborted ? new ro("Analysis was cancelled.", {
        cause: c,
        code: "cancelled"
      }) : new ro(this.connectionMessage(), {
        cause: c,
        code: "unreachable"
      });
    } finally {
      m && Hn().clearTimeout(m), S && y && S.removeEventListener("abort", y);
    }
  }
  async warmup({ attempts: t = 2, retryDelayMs: o = 1500, timeoutMs: i = 6e4, maxWaitMs: a = 0, signal: f } = {}) {
    const d = Math.max(1, Math.floor(Number(t) || 1)), p = Math.max(0, Number(a) || 0), m = Date.now();
    let y = null;
    for (let S = 0; S < d; S += 1) {
      const l = Date.now() - m, c = p > 0 ? p - l : 0;
      if (p > 0 && c <= 0) break;
      try {
        const g = await this.fetch("/healthz", {
          method: "GET",
          signal: f,
          timeoutMs: p > 0 ? Math.min(i, c) : i
        });
        if (g != null && g.ok) return g;
        y = new ro(
          `Synapse hosted service returned ${(g == null ? void 0 : g.status) || "an unexpected status"} while preparing your analysis.`,
          { code: "warmup_status" }
        );
      } catch (g) {
        y = g;
      }
      if (S < d - 1 && o > 0) {
        const g = p > 0 ? p - (Date.now() - m) : o;
        if (p > 0 && g <= 0) break;
        await new Promise((w) => Hn().setTimeout(w, Math.min(o, g)));
      }
    }
    throw y || new ro(this.connectionMessage(), { code: "warmup_failed" });
  }
  isRetryableResponse(t) {
    return [502, 503, 504].includes(Number(t == null ? void 0 : t.status));
  }
  isRetryableConnectionError(t) {
    return !(!(t instanceof ro) || t.code === "cancelled" || t.code === "timeout");
  }
  async fetchWithRetry(t, o = {}, {
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
        if (m = await this.fetch(t, l), !this.isRetryableResponse(m) || S === p - 1) return m;
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
      a > 0 && await new Promise((l) => Hn().setTimeout(l, a));
    }
    if (y) throw y;
    return m;
  }
}
var fi = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Wg(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var ec = { exports: {} }, fe = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Rh;
function R1() {
  if (Rh) return fe;
  Rh = 1;
  var e = Symbol.for("react.element"), t = Symbol.for("react.portal"), o = Symbol.for("react.fragment"), i = Symbol.for("react.strict_mode"), a = Symbol.for("react.profiler"), f = Symbol.for("react.provider"), d = Symbol.for("react.context"), p = Symbol.for("react.forward_ref"), m = Symbol.for("react.suspense"), y = Symbol.for("react.memo"), S = Symbol.for("react.lazy"), l = Symbol.iterator;
  function c(D) {
    return D === null || typeof D != "object" ? null : (D = l && D[l] || D["@@iterator"], typeof D == "function" ? D : null);
  }
  var g = { isMounted: function() {
    return !1;
  }, enqueueForceUpdate: function() {
  }, enqueueReplaceState: function() {
  }, enqueueSetState: function() {
  } }, w = Object.assign, T = {};
  function A(D, z, de) {
    this.props = D, this.context = z, this.refs = T, this.updater = de || g;
  }
  A.prototype.isReactComponent = {}, A.prototype.setState = function(D, z) {
    if (typeof D != "object" && typeof D != "function" && D != null) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
    this.updater.enqueueSetState(this, D, z, "setState");
  }, A.prototype.forceUpdate = function(D) {
    this.updater.enqueueForceUpdate(this, D, "forceUpdate");
  };
  function _() {
  }
  _.prototype = A.prototype;
  function C(D, z, de) {
    this.props = D, this.context = z, this.refs = T, this.updater = de || g;
  }
  var E = C.prototype = new _();
  E.constructor = C, w(E, A.prototype), E.isPureReactComponent = !0;
  var N = Array.isArray, L = Object.prototype.hasOwnProperty, W = { current: null }, H = { key: !0, ref: !0, __self: !0, __source: !0 };
  function Y(D, z, de) {
    var pe, ge = {}, ve = null, Pe = null;
    if (z != null) for (pe in z.ref !== void 0 && (Pe = z.ref), z.key !== void 0 && (ve = "" + z.key), z) L.call(z, pe) && !H.hasOwnProperty(pe) && (ge[pe] = z[pe]);
    var xe = arguments.length - 2;
    if (xe === 1) ge.children = de;
    else if (1 < xe) {
      for (var De = Array(xe), vt = 0; vt < xe; vt++) De[vt] = arguments[vt + 2];
      ge.children = De;
    }
    if (D && D.defaultProps) for (pe in xe = D.defaultProps, xe) ge[pe] === void 0 && (ge[pe] = xe[pe]);
    return { $$typeof: e, type: D, key: ve, ref: Pe, props: ge, _owner: W.current };
  }
  function V(D, z) {
    return { $$typeof: e, type: D.type, key: z, ref: D.ref, props: D.props, _owner: D._owner };
  }
  function Q(D) {
    return typeof D == "object" && D !== null && D.$$typeof === e;
  }
  function ie(D) {
    var z = { "=": "=0", ":": "=2" };
    return "$" + D.replace(/[=:]/g, function(de) {
      return z[de];
    });
  }
  var J = /\/+/g;
  function ce(D, z) {
    return typeof D == "object" && D !== null && D.key != null ? ie("" + D.key) : z.toString(36);
  }
  function ue(D, z, de, pe, ge) {
    var ve = typeof D;
    (ve === "undefined" || ve === "boolean") && (D = null);
    var Pe = !1;
    if (D === null) Pe = !0;
    else switch (ve) {
      case "string":
      case "number":
        Pe = !0;
        break;
      case "object":
        switch (D.$$typeof) {
          case e:
          case t:
            Pe = !0;
        }
    }
    if (Pe) return Pe = D, ge = ge(Pe), D = pe === "" ? "." + ce(Pe, 0) : pe, N(ge) ? (de = "", D != null && (de = D.replace(J, "$&/") + "/"), ue(ge, z, de, "", function(vt) {
      return vt;
    })) : ge != null && (Q(ge) && (ge = V(ge, de + (!ge.key || Pe && Pe.key === ge.key ? "" : ("" + ge.key).replace(J, "$&/") + "/") + D)), z.push(ge)), 1;
    if (Pe = 0, pe = pe === "" ? "." : pe + ":", N(D)) for (var xe = 0; xe < D.length; xe++) {
      ve = D[xe];
      var De = pe + ce(ve, xe);
      Pe += ue(ve, z, de, De, ge);
    }
    else if (De = c(D), typeof De == "function") for (D = De.call(D), xe = 0; !(ve = D.next()).done; ) ve = ve.value, De = pe + ce(ve, xe++), Pe += ue(ve, z, de, De, ge);
    else if (ve === "object") throw z = String(D), Error("Objects are not valid as a React child (found: " + (z === "[object Object]" ? "object with keys {" + Object.keys(D).join(", ") + "}" : z) + "). If you meant to render a collection of children, use an array instead.");
    return Pe;
  }
  function ye(D, z, de) {
    if (D == null) return D;
    var pe = [], ge = 0;
    return ue(D, pe, "", "", function(ve) {
      return z.call(de, ve, ge++);
    }), pe;
  }
  function me(D) {
    if (D._status === -1) {
      var z = D._result;
      z = z(), z.then(function(de) {
        (D._status === 0 || D._status === -1) && (D._status = 1, D._result = de);
      }, function(de) {
        (D._status === 0 || D._status === -1) && (D._status = 2, D._result = de);
      }), D._status === -1 && (D._status = 0, D._result = z);
    }
    if (D._status === 1) return D._result.default;
    throw D._result;
  }
  var we = { current: null }, O = { transition: null }, Z = { ReactCurrentDispatcher: we, ReactCurrentBatchConfig: O, ReactCurrentOwner: W };
  function X() {
    throw Error("act(...) is not supported in production builds of React.");
  }
  return fe.Children = { map: ye, forEach: function(D, z, de) {
    ye(D, function() {
      z.apply(this, arguments);
    }, de);
  }, count: function(D) {
    var z = 0;
    return ye(D, function() {
      z++;
    }), z;
  }, toArray: function(D) {
    return ye(D, function(z) {
      return z;
    }) || [];
  }, only: function(D) {
    if (!Q(D)) throw Error("React.Children.only expected to receive a single React element child.");
    return D;
  } }, fe.Component = A, fe.Fragment = o, fe.Profiler = a, fe.PureComponent = C, fe.StrictMode = i, fe.Suspense = m, fe.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Z, fe.act = X, fe.cloneElement = function(D, z, de) {
    if (D == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + D + ".");
    var pe = w({}, D.props), ge = D.key, ve = D.ref, Pe = D._owner;
    if (z != null) {
      if (z.ref !== void 0 && (ve = z.ref, Pe = W.current), z.key !== void 0 && (ge = "" + z.key), D.type && D.type.defaultProps) var xe = D.type.defaultProps;
      for (De in z) L.call(z, De) && !H.hasOwnProperty(De) && (pe[De] = z[De] === void 0 && xe !== void 0 ? xe[De] : z[De]);
    }
    var De = arguments.length - 2;
    if (De === 1) pe.children = de;
    else if (1 < De) {
      xe = Array(De);
      for (var vt = 0; vt < De; vt++) xe[vt] = arguments[vt + 2];
      pe.children = xe;
    }
    return { $$typeof: e, type: D.type, key: ge, ref: ve, props: pe, _owner: Pe };
  }, fe.createContext = function(D) {
    return D = { $$typeof: d, _currentValue: D, _currentValue2: D, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, D.Provider = { $$typeof: f, _context: D }, D.Consumer = D;
  }, fe.createElement = Y, fe.createFactory = function(D) {
    var z = Y.bind(null, D);
    return z.type = D, z;
  }, fe.createRef = function() {
    return { current: null };
  }, fe.forwardRef = function(D) {
    return { $$typeof: p, render: D };
  }, fe.isValidElement = Q, fe.lazy = function(D) {
    return { $$typeof: S, _payload: { _status: -1, _result: D }, _init: me };
  }, fe.memo = function(D, z) {
    return { $$typeof: y, type: D, compare: z === void 0 ? null : z };
  }, fe.startTransition = function(D) {
    var z = O.transition;
    O.transition = {};
    try {
      D();
    } finally {
      O.transition = z;
    }
  }, fe.unstable_act = X, fe.useCallback = function(D, z) {
    return we.current.useCallback(D, z);
  }, fe.useContext = function(D) {
    return we.current.useContext(D);
  }, fe.useDebugValue = function() {
  }, fe.useDeferredValue = function(D) {
    return we.current.useDeferredValue(D);
  }, fe.useEffect = function(D, z) {
    return we.current.useEffect(D, z);
  }, fe.useId = function() {
    return we.current.useId();
  }, fe.useImperativeHandle = function(D, z, de) {
    return we.current.useImperativeHandle(D, z, de);
  }, fe.useInsertionEffect = function(D, z) {
    return we.current.useInsertionEffect(D, z);
  }, fe.useLayoutEffect = function(D, z) {
    return we.current.useLayoutEffect(D, z);
  }, fe.useMemo = function(D, z) {
    return we.current.useMemo(D, z);
  }, fe.useReducer = function(D, z, de) {
    return we.current.useReducer(D, z, de);
  }, fe.useRef = function(D) {
    return we.current.useRef(D);
  }, fe.useState = function(D) {
    return we.current.useState(D);
  }, fe.useSyncExternalStore = function(D, z, de) {
    return we.current.useSyncExternalStore(D, z, de);
  }, fe.useTransition = function() {
    return we.current.useTransition();
  }, fe.version = "18.3.1", fe;
}
var Dh;
function Dd() {
  return Dh || (Dh = 1, ec.exports = R1()), ec.exports;
}
var b = Dd();
const gn = /* @__PURE__ */ Wg(b), Rr = /* @__PURE__ */ A1({
  __proto__: null,
  default: gn
}, [b]);
var Js = {}, tc = { exports: {} }, yt = {}, nc = { exports: {} }, rc = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Nh;
function D1() {
  return Nh || (Nh = 1, (function(e) {
    function t(O, Z) {
      var X = O.length;
      O.push(Z);
      e: for (; 0 < X; ) {
        var D = X - 1 >>> 1, z = O[D];
        if (0 < a(z, Z)) O[D] = Z, O[X] = z, X = D;
        else break e;
      }
    }
    function o(O) {
      return O.length === 0 ? null : O[0];
    }
    function i(O) {
      if (O.length === 0) return null;
      var Z = O[0], X = O.pop();
      if (X !== Z) {
        O[0] = X;
        e: for (var D = 0, z = O.length, de = z >>> 1; D < de; ) {
          var pe = 2 * (D + 1) - 1, ge = O[pe], ve = pe + 1, Pe = O[ve];
          if (0 > a(ge, X)) ve < z && 0 > a(Pe, ge) ? (O[D] = Pe, O[ve] = X, D = ve) : (O[D] = ge, O[pe] = X, D = pe);
          else if (ve < z && 0 > a(Pe, X)) O[D] = Pe, O[ve] = X, D = ve;
          else break e;
        }
      }
      return Z;
    }
    function a(O, Z) {
      var X = O.sortIndex - Z.sortIndex;
      return X !== 0 ? X : O.id - Z.id;
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
    var m = [], y = [], S = 1, l = null, c = 3, g = !1, w = !1, T = !1, A = typeof setTimeout == "function" ? setTimeout : null, _ = typeof clearTimeout == "function" ? clearTimeout : null, C = typeof setImmediate < "u" ? setImmediate : null;
    typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
    function E(O) {
      for (var Z = o(y); Z !== null; ) {
        if (Z.callback === null) i(y);
        else if (Z.startTime <= O) i(y), Z.sortIndex = Z.expirationTime, t(m, Z);
        else break;
        Z = o(y);
      }
    }
    function N(O) {
      if (T = !1, E(O), !w) if (o(m) !== null) w = !0, me(L);
      else {
        var Z = o(y);
        Z !== null && we(N, Z.startTime - O);
      }
    }
    function L(O, Z) {
      w = !1, T && (T = !1, _(Y), Y = -1), g = !0;
      var X = c;
      try {
        for (E(Z), l = o(m); l !== null && (!(l.expirationTime > Z) || O && !ie()); ) {
          var D = l.callback;
          if (typeof D == "function") {
            l.callback = null, c = l.priorityLevel;
            var z = D(l.expirationTime <= Z);
            Z = e.unstable_now(), typeof z == "function" ? l.callback = z : l === o(m) && i(m), E(Z);
          } else i(m);
          l = o(m);
        }
        if (l !== null) var de = !0;
        else {
          var pe = o(y);
          pe !== null && we(N, pe.startTime - Z), de = !1;
        }
        return de;
      } finally {
        l = null, c = X, g = !1;
      }
    }
    var W = !1, H = null, Y = -1, V = 5, Q = -1;
    function ie() {
      return !(e.unstable_now() - Q < V);
    }
    function J() {
      if (H !== null) {
        var O = e.unstable_now();
        Q = O;
        var Z = !0;
        try {
          Z = H(!0, O);
        } finally {
          Z ? ce() : (W = !1, H = null);
        }
      } else W = !1;
    }
    var ce;
    if (typeof C == "function") ce = function() {
      C(J);
    };
    else if (typeof MessageChannel < "u") {
      var ue = new MessageChannel(), ye = ue.port2;
      ue.port1.onmessage = J, ce = function() {
        ye.postMessage(null);
      };
    } else ce = function() {
      A(J, 0);
    };
    function me(O) {
      H = O, W || (W = !0, ce());
    }
    function we(O, Z) {
      Y = A(function() {
        O(e.unstable_now());
      }, Z);
    }
    e.unstable_IdlePriority = 5, e.unstable_ImmediatePriority = 1, e.unstable_LowPriority = 4, e.unstable_NormalPriority = 3, e.unstable_Profiling = null, e.unstable_UserBlockingPriority = 2, e.unstable_cancelCallback = function(O) {
      O.callback = null;
    }, e.unstable_continueExecution = function() {
      w || g || (w = !0, me(L));
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
      var X = c;
      c = Z;
      try {
        return O();
      } finally {
        c = X;
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
      var X = c;
      c = O;
      try {
        return Z();
      } finally {
        c = X;
      }
    }, e.unstable_scheduleCallback = function(O, Z, X) {
      var D = e.unstable_now();
      switch (typeof X == "object" && X !== null ? (X = X.delay, X = typeof X == "number" && 0 < X ? D + X : D) : X = D, O) {
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
      return z = X + z, O = { id: S++, callback: Z, priorityLevel: O, startTime: X, expirationTime: z, sortIndex: -1 }, X > D ? (O.sortIndex = X, t(y, O), o(m) === null && O === o(y) && (T ? (_(Y), Y = -1) : T = !0, we(N, X - D))) : (O.sortIndex = z, t(m, O), w || g || (w = !0, me(L))), O;
    }, e.unstable_shouldYield = ie, e.unstable_wrapCallback = function(O) {
      var Z = c;
      return function() {
        var X = c;
        c = Z;
        try {
          return O.apply(this, arguments);
        } finally {
          c = X;
        }
      };
    };
  })(rc)), rc;
}
var jh;
function N1() {
  return jh || (jh = 1, nc.exports = D1()), nc.exports;
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
var Ih;
function j1() {
  if (Ih) return yt;
  Ih = 1;
  var e = Dd(), t = N1();
  function o(n) {
    for (var r = "https://reactjs.org/docs/error-decoder.html?invariant=" + n, s = 1; s < arguments.length; s++) r += "&args[]=" + encodeURIComponent(arguments[s]);
    return "Minified React error #" + n + "; visit " + r + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  var i = /* @__PURE__ */ new Set(), a = {};
  function f(n, r) {
    d(n, r), d(n + "Capture", r);
  }
  function d(n, r) {
    for (a[n] = r, n = 0; n < r.length; n++) i.add(r[n]);
  }
  var p = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), m = Object.prototype.hasOwnProperty, y = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, S = {}, l = {};
  function c(n) {
    return m.call(l, n) ? !0 : m.call(S, n) ? !1 : y.test(n) ? l[n] = !0 : (S[n] = !0, !1);
  }
  function g(n, r, s, u) {
    if (s !== null && s.type === 0) return !1;
    switch (typeof r) {
      case "function":
      case "symbol":
        return !0;
      case "boolean":
        return u ? !1 : s !== null ? !s.acceptsBooleans : (n = n.toLowerCase().slice(0, 5), n !== "data-" && n !== "aria-");
      default:
        return !1;
    }
  }
  function w(n, r, s, u) {
    if (r === null || typeof r > "u" || g(n, r, s, u)) return !0;
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
  function T(n, r, s, u, h, v, k) {
    this.acceptsBooleans = r === 2 || r === 3 || r === 4, this.attributeName = u, this.attributeNamespace = h, this.mustUseProperty = s, this.propertyName = n, this.type = r, this.sanitizeURL = v, this.removeEmptyString = k;
  }
  var A = {};
  "children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(n) {
    A[n] = new T(n, 0, !1, n, null, !1, !1);
  }), [["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(n) {
    var r = n[0];
    A[r] = new T(r, 1, !1, n[1], null, !1, !1);
  }), ["contentEditable", "draggable", "spellCheck", "value"].forEach(function(n) {
    A[n] = new T(n, 2, !1, n.toLowerCase(), null, !1, !1);
  }), ["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(n) {
    A[n] = new T(n, 2, !1, n, null, !1, !1);
  }), "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(n) {
    A[n] = new T(n, 3, !1, n.toLowerCase(), null, !1, !1);
  }), ["checked", "multiple", "muted", "selected"].forEach(function(n) {
    A[n] = new T(n, 3, !0, n, null, !1, !1);
  }), ["capture", "download"].forEach(function(n) {
    A[n] = new T(n, 4, !1, n, null, !1, !1);
  }), ["cols", "rows", "size", "span"].forEach(function(n) {
    A[n] = new T(n, 6, !1, n, null, !1, !1);
  }), ["rowSpan", "start"].forEach(function(n) {
    A[n] = new T(n, 5, !1, n.toLowerCase(), null, !1, !1);
  });
  var _ = /[\-:]([a-z])/g;
  function C(n) {
    return n[1].toUpperCase();
  }
  "accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(n) {
    var r = n.replace(
      _,
      C
    );
    A[r] = new T(r, 1, !1, n, null, !1, !1);
  }), "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(n) {
    var r = n.replace(_, C);
    A[r] = new T(r, 1, !1, n, "http://www.w3.org/1999/xlink", !1, !1);
  }), ["xml:base", "xml:lang", "xml:space"].forEach(function(n) {
    var r = n.replace(_, C);
    A[r] = new T(r, 1, !1, n, "http://www.w3.org/XML/1998/namespace", !1, !1);
  }), ["tabIndex", "crossOrigin"].forEach(function(n) {
    A[n] = new T(n, 1, !1, n.toLowerCase(), null, !1, !1);
  }), A.xlinkHref = new T("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1), ["src", "href", "action", "formAction"].forEach(function(n) {
    A[n] = new T(n, 1, !1, n.toLowerCase(), null, !0, !0);
  });
  function E(n, r, s, u) {
    var h = A.hasOwnProperty(r) ? A[r] : null;
    (h !== null ? h.type !== 0 : u || !(2 < r.length) || r[0] !== "o" && r[0] !== "O" || r[1] !== "n" && r[1] !== "N") && (w(r, s, h, u) && (s = null), u || h === null ? c(r) && (s === null ? n.removeAttribute(r) : n.setAttribute(r, "" + s)) : h.mustUseProperty ? n[h.propertyName] = s === null ? h.type === 3 ? !1 : "" : s : (r = h.attributeName, u = h.attributeNamespace, s === null ? n.removeAttribute(r) : (h = h.type, s = h === 3 || h === 4 && s === !0 ? "" : "" + s, u ? n.setAttributeNS(u, r, s) : n.setAttribute(r, s))));
  }
  var N = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, L = Symbol.for("react.element"), W = Symbol.for("react.portal"), H = Symbol.for("react.fragment"), Y = Symbol.for("react.strict_mode"), V = Symbol.for("react.profiler"), Q = Symbol.for("react.provider"), ie = Symbol.for("react.context"), J = Symbol.for("react.forward_ref"), ce = Symbol.for("react.suspense"), ue = Symbol.for("react.suspense_list"), ye = Symbol.for("react.memo"), me = Symbol.for("react.lazy"), we = Symbol.for("react.offscreen"), O = Symbol.iterator;
  function Z(n) {
    return n === null || typeof n != "object" ? null : (n = O && n[O] || n["@@iterator"], typeof n == "function" ? n : null);
  }
  var X = Object.assign, D;
  function z(n) {
    if (D === void 0) try {
      throw Error();
    } catch (s) {
      var r = s.stack.trim().match(/\n( *(at )?)/);
      D = r && r[1] || "";
    }
    return `
` + D + n;
  }
  var de = !1;
  function pe(n, r) {
    if (!n || de) return "";
    de = !0;
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
        Reflect.construct(n, [], r);
      } else {
        try {
          r.call();
        } catch (F) {
          u = F;
        }
        n.call(r.prototype);
      }
      else {
        try {
          throw Error();
        } catch (F) {
          u = F;
        }
        n();
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
                return n.displayName && M.includes("<anonymous>") && (M = M.replace("<anonymous>", n.displayName)), M;
              }
            while (1 <= k && 0 <= P);
          break;
        }
      }
    } finally {
      de = !1, Error.prepareStackTrace = s;
    }
    return (n = n ? n.displayName || n.name : "") ? z(n) : "";
  }
  function ge(n) {
    switch (n.tag) {
      case 5:
        return z(n.type);
      case 16:
        return z("Lazy");
      case 13:
        return z("Suspense");
      case 19:
        return z("SuspenseList");
      case 0:
      case 2:
      case 15:
        return n = pe(n.type, !1), n;
      case 11:
        return n = pe(n.type.render, !1), n;
      case 1:
        return n = pe(n.type, !0), n;
      default:
        return "";
    }
  }
  function ve(n) {
    if (n == null) return null;
    if (typeof n == "function") return n.displayName || n.name || null;
    if (typeof n == "string") return n;
    switch (n) {
      case H:
        return "Fragment";
      case W:
        return "Portal";
      case V:
        return "Profiler";
      case Y:
        return "StrictMode";
      case ce:
        return "Suspense";
      case ue:
        return "SuspenseList";
    }
    if (typeof n == "object") switch (n.$$typeof) {
      case ie:
        return (n.displayName || "Context") + ".Consumer";
      case Q:
        return (n._context.displayName || "Context") + ".Provider";
      case J:
        var r = n.render;
        return n = n.displayName, n || (n = r.displayName || r.name || "", n = n !== "" ? "ForwardRef(" + n + ")" : "ForwardRef"), n;
      case ye:
        return r = n.displayName || null, r !== null ? r : ve(n.type) || "Memo";
      case me:
        r = n._payload, n = n._init;
        try {
          return ve(n(r));
        } catch {
        }
    }
    return null;
  }
  function Pe(n) {
    var r = n.type;
    switch (n.tag) {
      case 24:
        return "Cache";
      case 9:
        return (r.displayName || "Context") + ".Consumer";
      case 10:
        return (r._context.displayName || "Context") + ".Provider";
      case 18:
        return "DehydratedFragment";
      case 11:
        return n = r.render, n = n.displayName || n.name || "", r.displayName || (n !== "" ? "ForwardRef(" + n + ")" : "ForwardRef");
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
  function xe(n) {
    switch (typeof n) {
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return n;
      case "object":
        return n;
      default:
        return "";
    }
  }
  function De(n) {
    var r = n.type;
    return (n = n.nodeName) && n.toLowerCase() === "input" && (r === "checkbox" || r === "radio");
  }
  function vt(n) {
    var r = De(n) ? "checked" : "value", s = Object.getOwnPropertyDescriptor(n.constructor.prototype, r), u = "" + n[r];
    if (!n.hasOwnProperty(r) && typeof s < "u" && typeof s.get == "function" && typeof s.set == "function") {
      var h = s.get, v = s.set;
      return Object.defineProperty(n, r, { configurable: !0, get: function() {
        return h.call(this);
      }, set: function(k) {
        u = "" + k, v.call(this, k);
      } }), Object.defineProperty(n, r, { enumerable: s.enumerable }), { getValue: function() {
        return u;
      }, setValue: function(k) {
        u = "" + k;
      }, stopTracking: function() {
        n._valueTracker = null, delete n[r];
      } };
    }
  }
  function $i(n) {
    n._valueTracker || (n._valueTracker = vt(n));
  }
  function jf(n) {
    if (!n) return !1;
    var r = n._valueTracker;
    if (!r) return !0;
    var s = r.getValue(), u = "";
    return n && (u = De(n) ? n.checked ? "true" : "false" : n.value), n = u, n !== s ? (r.setValue(n), !0) : !1;
  }
  function Ui(n) {
    if (n = n || (typeof document < "u" ? document : void 0), typeof n > "u") return null;
    try {
      return n.activeElement || n.body;
    } catch {
      return n.body;
    }
  }
  function al(n, r) {
    var s = r.checked;
    return X({}, r, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: s ?? n._wrapperState.initialChecked });
  }
  function If(n, r) {
    var s = r.defaultValue == null ? "" : r.defaultValue, u = r.checked != null ? r.checked : r.defaultChecked;
    s = xe(r.value != null ? r.value : s), n._wrapperState = { initialChecked: u, initialValue: s, controlled: r.type === "checkbox" || r.type === "radio" ? r.checked != null : r.value != null };
  }
  function Ff(n, r) {
    r = r.checked, r != null && E(n, "checked", r, !1);
  }
  function ll(n, r) {
    Ff(n, r);
    var s = xe(r.value), u = r.type;
    if (s != null) u === "number" ? (s === 0 && n.value === "" || n.value != s) && (n.value = "" + s) : n.value !== "" + s && (n.value = "" + s);
    else if (u === "submit" || u === "reset") {
      n.removeAttribute("value");
      return;
    }
    r.hasOwnProperty("value") ? ul(n, r.type, s) : r.hasOwnProperty("defaultValue") && ul(n, r.type, xe(r.defaultValue)), r.checked == null && r.defaultChecked != null && (n.defaultChecked = !!r.defaultChecked);
  }
  function Of(n, r, s) {
    if (r.hasOwnProperty("value") || r.hasOwnProperty("defaultValue")) {
      var u = r.type;
      if (!(u !== "submit" && u !== "reset" || r.value !== void 0 && r.value !== null)) return;
      r = "" + n._wrapperState.initialValue, s || r === n.value || (n.value = r), n.defaultValue = r;
    }
    s = n.name, s !== "" && (n.name = ""), n.defaultChecked = !!n._wrapperState.initialChecked, s !== "" && (n.name = s);
  }
  function ul(n, r, s) {
    (r !== "number" || Ui(n.ownerDocument) !== n) && (s == null ? n.defaultValue = "" + n._wrapperState.initialValue : n.defaultValue !== "" + s && (n.defaultValue = "" + s));
  }
  var Co = Array.isArray;
  function Dr(n, r, s, u) {
    if (n = n.options, r) {
      r = {};
      for (var h = 0; h < s.length; h++) r["$" + s[h]] = !0;
      for (s = 0; s < n.length; s++) h = r.hasOwnProperty("$" + n[s].value), n[s].selected !== h && (n[s].selected = h), h && u && (n[s].defaultSelected = !0);
    } else {
      for (s = "" + xe(s), r = null, h = 0; h < n.length; h++) {
        if (n[h].value === s) {
          n[h].selected = !0, u && (n[h].defaultSelected = !0);
          return;
        }
        r !== null || n[h].disabled || (r = n[h]);
      }
      r !== null && (r.selected = !0);
    }
  }
  function cl(n, r) {
    if (r.dangerouslySetInnerHTML != null) throw Error(o(91));
    return X({}, r, { value: void 0, defaultValue: void 0, children: "" + n._wrapperState.initialValue });
  }
  function Lf(n, r) {
    var s = r.value;
    if (s == null) {
      if (s = r.children, r = r.defaultValue, s != null) {
        if (r != null) throw Error(o(92));
        if (Co(s)) {
          if (1 < s.length) throw Error(o(93));
          s = s[0];
        }
        r = s;
      }
      r == null && (r = ""), s = r;
    }
    n._wrapperState = { initialValue: xe(s) };
  }
  function Vf(n, r) {
    var s = xe(r.value), u = xe(r.defaultValue);
    s != null && (s = "" + s, s !== n.value && (n.value = s), r.defaultValue == null && n.defaultValue !== s && (n.defaultValue = s)), u != null && (n.defaultValue = "" + u);
  }
  function zf(n) {
    var r = n.textContent;
    r === n._wrapperState.initialValue && r !== "" && r !== null && (n.value = r);
  }
  function Bf(n) {
    switch (n) {
      case "svg":
        return "http://www.w3.org/2000/svg";
      case "math":
        return "http://www.w3.org/1998/Math/MathML";
      default:
        return "http://www.w3.org/1999/xhtml";
    }
  }
  function dl(n, r) {
    return n == null || n === "http://www.w3.org/1999/xhtml" ? Bf(r) : n === "http://www.w3.org/2000/svg" && r === "foreignObject" ? "http://www.w3.org/1999/xhtml" : n;
  }
  var Hi, $f = (function(n) {
    return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(r, s, u, h) {
      MSApp.execUnsafeLocalFunction(function() {
        return n(r, s, u, h);
      });
    } : n;
  })(function(n, r) {
    if (n.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in n) n.innerHTML = r;
    else {
      for (Hi = Hi || document.createElement("div"), Hi.innerHTML = "<svg>" + r.valueOf().toString() + "</svg>", r = Hi.firstChild; n.firstChild; ) n.removeChild(n.firstChild);
      for (; r.firstChild; ) n.appendChild(r.firstChild);
    }
  });
  function Po(n, r) {
    if (r) {
      var s = n.firstChild;
      if (s && s === n.lastChild && s.nodeType === 3) {
        s.nodeValue = r;
        return;
      }
    }
    n.textContent = r;
  }
  var Eo = {
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
  }, Ew = ["Webkit", "ms", "Moz", "O"];
  Object.keys(Eo).forEach(function(n) {
    Ew.forEach(function(r) {
      r = r + n.charAt(0).toUpperCase() + n.substring(1), Eo[r] = Eo[n];
    });
  });
  function Uf(n, r, s) {
    return r == null || typeof r == "boolean" || r === "" ? "" : s || typeof r != "number" || r === 0 || Eo.hasOwnProperty(n) && Eo[n] ? ("" + r).trim() : r + "px";
  }
  function Hf(n, r) {
    n = n.style;
    for (var s in r) if (r.hasOwnProperty(s)) {
      var u = s.indexOf("--") === 0, h = Uf(s, r[s], u);
      s === "float" && (s = "cssFloat"), u ? n.setProperty(s, h) : n[s] = h;
    }
  }
  var Mw = X({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
  function fl(n, r) {
    if (r) {
      if (Mw[n] && (r.children != null || r.dangerouslySetInnerHTML != null)) throw Error(o(137, n));
      if (r.dangerouslySetInnerHTML != null) {
        if (r.children != null) throw Error(o(60));
        if (typeof r.dangerouslySetInnerHTML != "object" || !("__html" in r.dangerouslySetInnerHTML)) throw Error(o(61));
      }
      if (r.style != null && typeof r.style != "object") throw Error(o(62));
    }
  }
  function pl(n, r) {
    if (n.indexOf("-") === -1) return typeof r.is == "string";
    switch (n) {
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
  var ml = null;
  function hl(n) {
    return n = n.target || n.srcElement || window, n.correspondingUseElement && (n = n.correspondingUseElement), n.nodeType === 3 ? n.parentNode : n;
  }
  var yl = null, Nr = null, jr = null;
  function Wf(n) {
    if (n = Zo(n)) {
      if (typeof yl != "function") throw Error(o(280));
      var r = n.stateNode;
      r && (r = ps(r), yl(n.stateNode, n.type, r));
    }
  }
  function Gf(n) {
    Nr ? jr ? jr.push(n) : jr = [n] : Nr = n;
  }
  function Kf() {
    if (Nr) {
      var n = Nr, r = jr;
      if (jr = Nr = null, Wf(n), r) for (n = 0; n < r.length; n++) Wf(r[n]);
    }
  }
  function Yf(n, r) {
    return n(r);
  }
  function Xf() {
  }
  var gl = !1;
  function Qf(n, r, s) {
    if (gl) return n(r, s);
    gl = !0;
    try {
      return Yf(n, r, s);
    } finally {
      gl = !1, (Nr !== null || jr !== null) && (Xf(), Kf());
    }
  }
  function Mo(n, r) {
    var s = n.stateNode;
    if (s === null) return null;
    var u = ps(s);
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
        (u = !u.disabled) || (n = n.type, u = !(n === "button" || n === "input" || n === "select" || n === "textarea")), n = !u;
        break e;
      default:
        n = !1;
    }
    if (n) return null;
    if (s && typeof s != "function") throw Error(o(231, r, typeof s));
    return s;
  }
  var vl = !1;
  if (p) try {
    var Ro = {};
    Object.defineProperty(Ro, "passive", { get: function() {
      vl = !0;
    } }), window.addEventListener("test", Ro, Ro), window.removeEventListener("test", Ro, Ro);
  } catch {
    vl = !1;
  }
  function Rw(n, r, s, u, h, v, k, P, M) {
    var F = Array.prototype.slice.call(arguments, 3);
    try {
      r.apply(s, F);
    } catch ($) {
      this.onError($);
    }
  }
  var Do = !1, Wi = null, Gi = !1, Sl = null, Dw = { onError: function(n) {
    Do = !0, Wi = n;
  } };
  function Nw(n, r, s, u, h, v, k, P, M) {
    Do = !1, Wi = null, Rw.apply(Dw, arguments);
  }
  function jw(n, r, s, u, h, v, k, P, M) {
    if (Nw.apply(this, arguments), Do) {
      if (Do) {
        var F = Wi;
        Do = !1, Wi = null;
      } else throw Error(o(198));
      Gi || (Gi = !0, Sl = F);
    }
  }
  function tr(n) {
    var r = n, s = n;
    if (n.alternate) for (; r.return; ) r = r.return;
    else {
      n = r;
      do
        r = n, (r.flags & 4098) !== 0 && (s = r.return), n = r.return;
      while (n);
    }
    return r.tag === 3 ? s : null;
  }
  function Zf(n) {
    if (n.tag === 13) {
      var r = n.memoizedState;
      if (r === null && (n = n.alternate, n !== null && (r = n.memoizedState)), r !== null) return r.dehydrated;
    }
    return null;
  }
  function Jf(n) {
    if (tr(n) !== n) throw Error(o(188));
  }
  function Iw(n) {
    var r = n.alternate;
    if (!r) {
      if (r = tr(n), r === null) throw Error(o(188));
      return r !== n ? null : n;
    }
    for (var s = n, u = r; ; ) {
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
          if (v === s) return Jf(h), n;
          if (v === u) return Jf(h), r;
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
    return s.stateNode.current === s ? n : r;
  }
  function qf(n) {
    return n = Iw(n), n !== null ? ep(n) : null;
  }
  function ep(n) {
    if (n.tag === 5 || n.tag === 6) return n;
    for (n = n.child; n !== null; ) {
      var r = ep(n);
      if (r !== null) return r;
      n = n.sibling;
    }
    return null;
  }
  var tp = t.unstable_scheduleCallback, np = t.unstable_cancelCallback, Fw = t.unstable_shouldYield, Ow = t.unstable_requestPaint, Le = t.unstable_now, Lw = t.unstable_getCurrentPriorityLevel, wl = t.unstable_ImmediatePriority, rp = t.unstable_UserBlockingPriority, Ki = t.unstable_NormalPriority, Vw = t.unstable_LowPriority, op = t.unstable_IdlePriority, Yi = null, Yt = null;
  function zw(n) {
    if (Yt && typeof Yt.onCommitFiberRoot == "function") try {
      Yt.onCommitFiberRoot(Yi, n, void 0, (n.current.flags & 128) === 128);
    } catch {
    }
  }
  var It = Math.clz32 ? Math.clz32 : Uw, Bw = Math.log, $w = Math.LN2;
  function Uw(n) {
    return n >>>= 0, n === 0 ? 32 : 31 - (Bw(n) / $w | 0) | 0;
  }
  var Xi = 64, Qi = 4194304;
  function No(n) {
    switch (n & -n) {
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
        return n & 4194240;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
      case 67108864:
        return n & 130023424;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 1073741824;
      default:
        return n;
    }
  }
  function Zi(n, r) {
    var s = n.pendingLanes;
    if (s === 0) return 0;
    var u = 0, h = n.suspendedLanes, v = n.pingedLanes, k = s & 268435455;
    if (k !== 0) {
      var P = k & ~h;
      P !== 0 ? u = No(P) : (v &= k, v !== 0 && (u = No(v)));
    } else k = s & ~h, k !== 0 ? u = No(k) : v !== 0 && (u = No(v));
    if (u === 0) return 0;
    if (r !== 0 && r !== u && (r & h) === 0 && (h = u & -u, v = r & -r, h >= v || h === 16 && (v & 4194240) !== 0)) return r;
    if ((u & 4) !== 0 && (u |= s & 16), r = n.entangledLanes, r !== 0) for (n = n.entanglements, r &= u; 0 < r; ) s = 31 - It(r), h = 1 << s, u |= n[s], r &= ~h;
    return u;
  }
  function Hw(n, r) {
    switch (n) {
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
  function Ww(n, r) {
    for (var s = n.suspendedLanes, u = n.pingedLanes, h = n.expirationTimes, v = n.pendingLanes; 0 < v; ) {
      var k = 31 - It(v), P = 1 << k, M = h[k];
      M === -1 ? ((P & s) === 0 || (P & u) !== 0) && (h[k] = Hw(P, r)) : M <= r && (n.expiredLanes |= P), v &= ~P;
    }
  }
  function xl(n) {
    return n = n.pendingLanes & -1073741825, n !== 0 ? n : n & 1073741824 ? 1073741824 : 0;
  }
  function ip() {
    var n = Xi;
    return Xi <<= 1, (Xi & 4194240) === 0 && (Xi = 64), n;
  }
  function _l(n) {
    for (var r = [], s = 0; 31 > s; s++) r.push(n);
    return r;
  }
  function jo(n, r, s) {
    n.pendingLanes |= r, r !== 536870912 && (n.suspendedLanes = 0, n.pingedLanes = 0), n = n.eventTimes, r = 31 - It(r), n[r] = s;
  }
  function Gw(n, r) {
    var s = n.pendingLanes & ~r;
    n.pendingLanes = r, n.suspendedLanes = 0, n.pingedLanes = 0, n.expiredLanes &= r, n.mutableReadLanes &= r, n.entangledLanes &= r, r = n.entanglements;
    var u = n.eventTimes;
    for (n = n.expirationTimes; 0 < s; ) {
      var h = 31 - It(s), v = 1 << h;
      r[h] = 0, u[h] = -1, n[h] = -1, s &= ~v;
    }
  }
  function Tl(n, r) {
    var s = n.entangledLanes |= r;
    for (n = n.entanglements; s; ) {
      var u = 31 - It(s), h = 1 << u;
      h & r | n[u] & r && (n[u] |= r), s &= ~h;
    }
  }
  var _e = 0;
  function sp(n) {
    return n &= -n, 1 < n ? 4 < n ? (n & 268435455) !== 0 ? 16 : 536870912 : 4 : 1;
  }
  var ap, kl, lp, up, cp, Al = !1, Ji = [], Tn = null, kn = null, An = null, Io = /* @__PURE__ */ new Map(), Fo = /* @__PURE__ */ new Map(), bn = [], Kw = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
  function dp(n, r) {
    switch (n) {
      case "focusin":
      case "focusout":
        Tn = null;
        break;
      case "dragenter":
      case "dragleave":
        kn = null;
        break;
      case "mouseover":
      case "mouseout":
        An = null;
        break;
      case "pointerover":
      case "pointerout":
        Io.delete(r.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        Fo.delete(r.pointerId);
    }
  }
  function Oo(n, r, s, u, h, v) {
    return n === null || n.nativeEvent !== v ? (n = { blockedOn: r, domEventName: s, eventSystemFlags: u, nativeEvent: v, targetContainers: [h] }, r !== null && (r = Zo(r), r !== null && kl(r)), n) : (n.eventSystemFlags |= u, r = n.targetContainers, h !== null && r.indexOf(h) === -1 && r.push(h), n);
  }
  function Yw(n, r, s, u, h) {
    switch (r) {
      case "focusin":
        return Tn = Oo(Tn, n, r, s, u, h), !0;
      case "dragenter":
        return kn = Oo(kn, n, r, s, u, h), !0;
      case "mouseover":
        return An = Oo(An, n, r, s, u, h), !0;
      case "pointerover":
        var v = h.pointerId;
        return Io.set(v, Oo(Io.get(v) || null, n, r, s, u, h)), !0;
      case "gotpointercapture":
        return v = h.pointerId, Fo.set(v, Oo(Fo.get(v) || null, n, r, s, u, h)), !0;
    }
    return !1;
  }
  function fp(n) {
    var r = nr(n.target);
    if (r !== null) {
      var s = tr(r);
      if (s !== null) {
        if (r = s.tag, r === 13) {
          if (r = Zf(s), r !== null) {
            n.blockedOn = r, cp(n.priority, function() {
              lp(s);
            });
            return;
          }
        } else if (r === 3 && s.stateNode.current.memoizedState.isDehydrated) {
          n.blockedOn = s.tag === 3 ? s.stateNode.containerInfo : null;
          return;
        }
      }
    }
    n.blockedOn = null;
  }
  function qi(n) {
    if (n.blockedOn !== null) return !1;
    for (var r = n.targetContainers; 0 < r.length; ) {
      var s = Cl(n.domEventName, n.eventSystemFlags, r[0], n.nativeEvent);
      if (s === null) {
        s = n.nativeEvent;
        var u = new s.constructor(s.type, s);
        ml = u, s.target.dispatchEvent(u), ml = null;
      } else return r = Zo(s), r !== null && kl(r), n.blockedOn = s, !1;
      r.shift();
    }
    return !0;
  }
  function pp(n, r, s) {
    qi(n) && s.delete(r);
  }
  function Xw() {
    Al = !1, Tn !== null && qi(Tn) && (Tn = null), kn !== null && qi(kn) && (kn = null), An !== null && qi(An) && (An = null), Io.forEach(pp), Fo.forEach(pp);
  }
  function Lo(n, r) {
    n.blockedOn === r && (n.blockedOn = null, Al || (Al = !0, t.unstable_scheduleCallback(t.unstable_NormalPriority, Xw)));
  }
  function Vo(n) {
    function r(h) {
      return Lo(h, n);
    }
    if (0 < Ji.length) {
      Lo(Ji[0], n);
      for (var s = 1; s < Ji.length; s++) {
        var u = Ji[s];
        u.blockedOn === n && (u.blockedOn = null);
      }
    }
    for (Tn !== null && Lo(Tn, n), kn !== null && Lo(kn, n), An !== null && Lo(An, n), Io.forEach(r), Fo.forEach(r), s = 0; s < bn.length; s++) u = bn[s], u.blockedOn === n && (u.blockedOn = null);
    for (; 0 < bn.length && (s = bn[0], s.blockedOn === null); ) fp(s), s.blockedOn === null && bn.shift();
  }
  var Ir = N.ReactCurrentBatchConfig, es = !0;
  function Qw(n, r, s, u) {
    var h = _e, v = Ir.transition;
    Ir.transition = null;
    try {
      _e = 1, bl(n, r, s, u);
    } finally {
      _e = h, Ir.transition = v;
    }
  }
  function Zw(n, r, s, u) {
    var h = _e, v = Ir.transition;
    Ir.transition = null;
    try {
      _e = 4, bl(n, r, s, u);
    } finally {
      _e = h, Ir.transition = v;
    }
  }
  function bl(n, r, s, u) {
    if (es) {
      var h = Cl(n, r, s, u);
      if (h === null) Hl(n, r, u, ts, s), dp(n, u);
      else if (Yw(h, n, r, s, u)) u.stopPropagation();
      else if (dp(n, u), r & 4 && -1 < Kw.indexOf(n)) {
        for (; h !== null; ) {
          var v = Zo(h);
          if (v !== null && ap(v), v = Cl(n, r, s, u), v === null && Hl(n, r, u, ts, s), v === h) break;
          h = v;
        }
        h !== null && u.stopPropagation();
      } else Hl(n, r, u, null, s);
    }
  }
  var ts = null;
  function Cl(n, r, s, u) {
    if (ts = null, n = hl(u), n = nr(n), n !== null) if (r = tr(n), r === null) n = null;
    else if (s = r.tag, s === 13) {
      if (n = Zf(r), n !== null) return n;
      n = null;
    } else if (s === 3) {
      if (r.stateNode.current.memoizedState.isDehydrated) return r.tag === 3 ? r.stateNode.containerInfo : null;
      n = null;
    } else r !== n && (n = null);
    return ts = n, null;
  }
  function mp(n) {
    switch (n) {
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
        switch (Lw()) {
          case wl:
            return 1;
          case rp:
            return 4;
          case Ki:
          case Vw:
            return 16;
          case op:
            return 536870912;
          default:
            return 16;
        }
      default:
        return 16;
    }
  }
  var Cn = null, Pl = null, ns = null;
  function hp() {
    if (ns) return ns;
    var n, r = Pl, s = r.length, u, h = "value" in Cn ? Cn.value : Cn.textContent, v = h.length;
    for (n = 0; n < s && r[n] === h[n]; n++) ;
    var k = s - n;
    for (u = 1; u <= k && r[s - u] === h[v - u]; u++) ;
    return ns = h.slice(n, 1 < u ? 1 - u : void 0);
  }
  function rs(n) {
    var r = n.keyCode;
    return "charCode" in n ? (n = n.charCode, n === 0 && r === 13 && (n = 13)) : n = r, n === 10 && (n = 13), 32 <= n || n === 13 ? n : 0;
  }
  function os() {
    return !0;
  }
  function yp() {
    return !1;
  }
  function St(n) {
    function r(s, u, h, v, k) {
      this._reactName = s, this._targetInst = h, this.type = u, this.nativeEvent = v, this.target = k, this.currentTarget = null;
      for (var P in n) n.hasOwnProperty(P) && (s = n[P], this[P] = s ? s(v) : v[P]);
      return this.isDefaultPrevented = (v.defaultPrevented != null ? v.defaultPrevented : v.returnValue === !1) ? os : yp, this.isPropagationStopped = yp, this;
    }
    return X(r.prototype, { preventDefault: function() {
      this.defaultPrevented = !0;
      var s = this.nativeEvent;
      s && (s.preventDefault ? s.preventDefault() : typeof s.returnValue != "unknown" && (s.returnValue = !1), this.isDefaultPrevented = os);
    }, stopPropagation: function() {
      var s = this.nativeEvent;
      s && (s.stopPropagation ? s.stopPropagation() : typeof s.cancelBubble != "unknown" && (s.cancelBubble = !0), this.isPropagationStopped = os);
    }, persist: function() {
    }, isPersistent: os }), r;
  }
  var Fr = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(n) {
    return n.timeStamp || Date.now();
  }, defaultPrevented: 0, isTrusted: 0 }, El = St(Fr), zo = X({}, Fr, { view: 0, detail: 0 }), Jw = St(zo), Ml, Rl, Bo, is = X({}, zo, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: Nl, button: 0, buttons: 0, relatedTarget: function(n) {
    return n.relatedTarget === void 0 ? n.fromElement === n.srcElement ? n.toElement : n.fromElement : n.relatedTarget;
  }, movementX: function(n) {
    return "movementX" in n ? n.movementX : (n !== Bo && (Bo && n.type === "mousemove" ? (Ml = n.screenX - Bo.screenX, Rl = n.screenY - Bo.screenY) : Rl = Ml = 0, Bo = n), Ml);
  }, movementY: function(n) {
    return "movementY" in n ? n.movementY : Rl;
  } }), gp = St(is), qw = X({}, is, { dataTransfer: 0 }), ex = St(qw), tx = X({}, zo, { relatedTarget: 0 }), Dl = St(tx), nx = X({}, Fr, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), rx = St(nx), ox = X({}, Fr, { clipboardData: function(n) {
    return "clipboardData" in n ? n.clipboardData : window.clipboardData;
  } }), ix = St(ox), sx = X({}, Fr, { data: 0 }), vp = St(sx), ax = {
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
  }, lx = {
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
  }, ux = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
  function cx(n) {
    var r = this.nativeEvent;
    return r.getModifierState ? r.getModifierState(n) : (n = ux[n]) ? !!r[n] : !1;
  }
  function Nl() {
    return cx;
  }
  var dx = X({}, zo, { key: function(n) {
    if (n.key) {
      var r = ax[n.key] || n.key;
      if (r !== "Unidentified") return r;
    }
    return n.type === "keypress" ? (n = rs(n), n === 13 ? "Enter" : String.fromCharCode(n)) : n.type === "keydown" || n.type === "keyup" ? lx[n.keyCode] || "Unidentified" : "";
  }, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: Nl, charCode: function(n) {
    return n.type === "keypress" ? rs(n) : 0;
  }, keyCode: function(n) {
    return n.type === "keydown" || n.type === "keyup" ? n.keyCode : 0;
  }, which: function(n) {
    return n.type === "keypress" ? rs(n) : n.type === "keydown" || n.type === "keyup" ? n.keyCode : 0;
  } }), fx = St(dx), px = X({}, is, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), Sp = St(px), mx = X({}, zo, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: Nl }), hx = St(mx), yx = X({}, Fr, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), gx = St(yx), vx = X({}, is, {
    deltaX: function(n) {
      return "deltaX" in n ? n.deltaX : "wheelDeltaX" in n ? -n.wheelDeltaX : 0;
    },
    deltaY: function(n) {
      return "deltaY" in n ? n.deltaY : "wheelDeltaY" in n ? -n.wheelDeltaY : "wheelDelta" in n ? -n.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), Sx = St(vx), wx = [9, 13, 27, 32], jl = p && "CompositionEvent" in window, $o = null;
  p && "documentMode" in document && ($o = document.documentMode);
  var xx = p && "TextEvent" in window && !$o, wp = p && (!jl || $o && 8 < $o && 11 >= $o), xp = " ", _p = !1;
  function Tp(n, r) {
    switch (n) {
      case "keyup":
        return wx.indexOf(r.keyCode) !== -1;
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
  function kp(n) {
    return n = n.detail, typeof n == "object" && "data" in n ? n.data : null;
  }
  var Or = !1;
  function _x(n, r) {
    switch (n) {
      case "compositionend":
        return kp(r);
      case "keypress":
        return r.which !== 32 ? null : (_p = !0, xp);
      case "textInput":
        return n = r.data, n === xp && _p ? null : n;
      default:
        return null;
    }
  }
  function Tx(n, r) {
    if (Or) return n === "compositionend" || !jl && Tp(n, r) ? (n = hp(), ns = Pl = Cn = null, Or = !1, n) : null;
    switch (n) {
      case "paste":
        return null;
      case "keypress":
        if (!(r.ctrlKey || r.altKey || r.metaKey) || r.ctrlKey && r.altKey) {
          if (r.char && 1 < r.char.length) return r.char;
          if (r.which) return String.fromCharCode(r.which);
        }
        return null;
      case "compositionend":
        return wp && r.locale !== "ko" ? null : r.data;
      default:
        return null;
    }
  }
  var kx = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
  function Ap(n) {
    var r = n && n.nodeName && n.nodeName.toLowerCase();
    return r === "input" ? !!kx[n.type] : r === "textarea";
  }
  function bp(n, r, s, u) {
    Gf(u), r = cs(r, "onChange"), 0 < r.length && (s = new El("onChange", "change", null, s, u), n.push({ event: s, listeners: r }));
  }
  var Uo = null, Ho = null;
  function Ax(n) {
    Hp(n, 0);
  }
  function ss(n) {
    var r = $r(n);
    if (jf(r)) return n;
  }
  function bx(n, r) {
    if (n === "change") return r;
  }
  var Cp = !1;
  if (p) {
    var Il;
    if (p) {
      var Fl = "oninput" in document;
      if (!Fl) {
        var Pp = document.createElement("div");
        Pp.setAttribute("oninput", "return;"), Fl = typeof Pp.oninput == "function";
      }
      Il = Fl;
    } else Il = !1;
    Cp = Il && (!document.documentMode || 9 < document.documentMode);
  }
  function Ep() {
    Uo && (Uo.detachEvent("onpropertychange", Mp), Ho = Uo = null);
  }
  function Mp(n) {
    if (n.propertyName === "value" && ss(Ho)) {
      var r = [];
      bp(r, Ho, n, hl(n)), Qf(Ax, r);
    }
  }
  function Cx(n, r, s) {
    n === "focusin" ? (Ep(), Uo = r, Ho = s, Uo.attachEvent("onpropertychange", Mp)) : n === "focusout" && Ep();
  }
  function Px(n) {
    if (n === "selectionchange" || n === "keyup" || n === "keydown") return ss(Ho);
  }
  function Ex(n, r) {
    if (n === "click") return ss(r);
  }
  function Mx(n, r) {
    if (n === "input" || n === "change") return ss(r);
  }
  function Rx(n, r) {
    return n === r && (n !== 0 || 1 / n === 1 / r) || n !== n && r !== r;
  }
  var Ft = typeof Object.is == "function" ? Object.is : Rx;
  function Wo(n, r) {
    if (Ft(n, r)) return !0;
    if (typeof n != "object" || n === null || typeof r != "object" || r === null) return !1;
    var s = Object.keys(n), u = Object.keys(r);
    if (s.length !== u.length) return !1;
    for (u = 0; u < s.length; u++) {
      var h = s[u];
      if (!m.call(r, h) || !Ft(n[h], r[h])) return !1;
    }
    return !0;
  }
  function Rp(n) {
    for (; n && n.firstChild; ) n = n.firstChild;
    return n;
  }
  function Dp(n, r) {
    var s = Rp(n);
    n = 0;
    for (var u; s; ) {
      if (s.nodeType === 3) {
        if (u = n + s.textContent.length, n <= r && u >= r) return { node: s, offset: r - n };
        n = u;
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
      s = Rp(s);
    }
  }
  function Np(n, r) {
    return n && r ? n === r ? !0 : n && n.nodeType === 3 ? !1 : r && r.nodeType === 3 ? Np(n, r.parentNode) : "contains" in n ? n.contains(r) : n.compareDocumentPosition ? !!(n.compareDocumentPosition(r) & 16) : !1 : !1;
  }
  function jp() {
    for (var n = window, r = Ui(); r instanceof n.HTMLIFrameElement; ) {
      try {
        var s = typeof r.contentWindow.location.href == "string";
      } catch {
        s = !1;
      }
      if (s) n = r.contentWindow;
      else break;
      r = Ui(n.document);
    }
    return r;
  }
  function Ol(n) {
    var r = n && n.nodeName && n.nodeName.toLowerCase();
    return r && (r === "input" && (n.type === "text" || n.type === "search" || n.type === "tel" || n.type === "url" || n.type === "password") || r === "textarea" || n.contentEditable === "true");
  }
  function Dx(n) {
    var r = jp(), s = n.focusedElem, u = n.selectionRange;
    if (r !== s && s && s.ownerDocument && Np(s.ownerDocument.documentElement, s)) {
      if (u !== null && Ol(s)) {
        if (r = u.start, n = u.end, n === void 0 && (n = r), "selectionStart" in s) s.selectionStart = r, s.selectionEnd = Math.min(n, s.value.length);
        else if (n = (r = s.ownerDocument || document) && r.defaultView || window, n.getSelection) {
          n = n.getSelection();
          var h = s.textContent.length, v = Math.min(u.start, h);
          u = u.end === void 0 ? v : Math.min(u.end, h), !n.extend && v > u && (h = u, u = v, v = h), h = Dp(s, v);
          var k = Dp(
            s,
            u
          );
          h && k && (n.rangeCount !== 1 || n.anchorNode !== h.node || n.anchorOffset !== h.offset || n.focusNode !== k.node || n.focusOffset !== k.offset) && (r = r.createRange(), r.setStart(h.node, h.offset), n.removeAllRanges(), v > u ? (n.addRange(r), n.extend(k.node, k.offset)) : (r.setEnd(k.node, k.offset), n.addRange(r)));
        }
      }
      for (r = [], n = s; n = n.parentNode; ) n.nodeType === 1 && r.push({ element: n, left: n.scrollLeft, top: n.scrollTop });
      for (typeof s.focus == "function" && s.focus(), s = 0; s < r.length; s++) n = r[s], n.element.scrollLeft = n.left, n.element.scrollTop = n.top;
    }
  }
  var Nx = p && "documentMode" in document && 11 >= document.documentMode, Lr = null, Ll = null, Go = null, Vl = !1;
  function Ip(n, r, s) {
    var u = s.window === s ? s.document : s.nodeType === 9 ? s : s.ownerDocument;
    Vl || Lr == null || Lr !== Ui(u) || (u = Lr, "selectionStart" in u && Ol(u) ? u = { start: u.selectionStart, end: u.selectionEnd } : (u = (u.ownerDocument && u.ownerDocument.defaultView || window).getSelection(), u = { anchorNode: u.anchorNode, anchorOffset: u.anchorOffset, focusNode: u.focusNode, focusOffset: u.focusOffset }), Go && Wo(Go, u) || (Go = u, u = cs(Ll, "onSelect"), 0 < u.length && (r = new El("onSelect", "select", null, r, s), n.push({ event: r, listeners: u }), r.target = Lr)));
  }
  function as(n, r) {
    var s = {};
    return s[n.toLowerCase()] = r.toLowerCase(), s["Webkit" + n] = "webkit" + r, s["Moz" + n] = "moz" + r, s;
  }
  var Vr = { animationend: as("Animation", "AnimationEnd"), animationiteration: as("Animation", "AnimationIteration"), animationstart: as("Animation", "AnimationStart"), transitionend: as("Transition", "TransitionEnd") }, zl = {}, Fp = {};
  p && (Fp = document.createElement("div").style, "AnimationEvent" in window || (delete Vr.animationend.animation, delete Vr.animationiteration.animation, delete Vr.animationstart.animation), "TransitionEvent" in window || delete Vr.transitionend.transition);
  function ls(n) {
    if (zl[n]) return zl[n];
    if (!Vr[n]) return n;
    var r = Vr[n], s;
    for (s in r) if (r.hasOwnProperty(s) && s in Fp) return zl[n] = r[s];
    return n;
  }
  var Op = ls("animationend"), Lp = ls("animationiteration"), Vp = ls("animationstart"), zp = ls("transitionend"), Bp = /* @__PURE__ */ new Map(), $p = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
  function Pn(n, r) {
    Bp.set(n, r), f(r, [n]);
  }
  for (var Bl = 0; Bl < $p.length; Bl++) {
    var $l = $p[Bl], jx = $l.toLowerCase(), Ix = $l[0].toUpperCase() + $l.slice(1);
    Pn(jx, "on" + Ix);
  }
  Pn(Op, "onAnimationEnd"), Pn(Lp, "onAnimationIteration"), Pn(Vp, "onAnimationStart"), Pn("dblclick", "onDoubleClick"), Pn("focusin", "onFocus"), Pn("focusout", "onBlur"), Pn(zp, "onTransitionEnd"), d("onMouseEnter", ["mouseout", "mouseover"]), d("onMouseLeave", ["mouseout", "mouseover"]), d("onPointerEnter", ["pointerout", "pointerover"]), d("onPointerLeave", ["pointerout", "pointerover"]), f("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), f("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), f("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]), f("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), f("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), f("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
  var Ko = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), Fx = new Set("cancel close invalid load scroll toggle".split(" ").concat(Ko));
  function Up(n, r, s) {
    var u = n.type || "unknown-event";
    n.currentTarget = s, jw(u, r, void 0, n), n.currentTarget = null;
  }
  function Hp(n, r) {
    r = (r & 4) !== 0;
    for (var s = 0; s < n.length; s++) {
      var u = n[s], h = u.event;
      u = u.listeners;
      e: {
        var v = void 0;
        if (r) for (var k = u.length - 1; 0 <= k; k--) {
          var P = u[k], M = P.instance, F = P.currentTarget;
          if (P = P.listener, M !== v && h.isPropagationStopped()) break e;
          Up(h, P, F), v = M;
        }
        else for (k = 0; k < u.length; k++) {
          if (P = u[k], M = P.instance, F = P.currentTarget, P = P.listener, M !== v && h.isPropagationStopped()) break e;
          Up(h, P, F), v = M;
        }
      }
    }
    if (Gi) throw n = Sl, Gi = !1, Sl = null, n;
  }
  function Me(n, r) {
    var s = r[Ql];
    s === void 0 && (s = r[Ql] = /* @__PURE__ */ new Set());
    var u = n + "__bubble";
    s.has(u) || (Wp(r, n, 2, !1), s.add(u));
  }
  function Ul(n, r, s) {
    var u = 0;
    r && (u |= 4), Wp(s, n, u, r);
  }
  var us = "_reactListening" + Math.random().toString(36).slice(2);
  function Yo(n) {
    if (!n[us]) {
      n[us] = !0, i.forEach(function(s) {
        s !== "selectionchange" && (Fx.has(s) || Ul(s, !1, n), Ul(s, !0, n));
      });
      var r = n.nodeType === 9 ? n : n.ownerDocument;
      r === null || r[us] || (r[us] = !0, Ul("selectionchange", !1, r));
    }
  }
  function Wp(n, r, s, u) {
    switch (mp(r)) {
      case 1:
        var h = Qw;
        break;
      case 4:
        h = Zw;
        break;
      default:
        h = bl;
    }
    s = h.bind(null, r, s, n), h = void 0, !vl || r !== "touchstart" && r !== "touchmove" && r !== "wheel" || (h = !0), u ? h !== void 0 ? n.addEventListener(r, s, { capture: !0, passive: h }) : n.addEventListener(r, s, !0) : h !== void 0 ? n.addEventListener(r, s, { passive: h }) : n.addEventListener(r, s, !1);
  }
  function Hl(n, r, s, u, h) {
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
          if (k = nr(P), k === null) return;
          if (M = k.tag, M === 5 || M === 6) {
            u = v = k;
            continue e;
          }
          P = P.parentNode;
        }
      }
      u = u.return;
    }
    Qf(function() {
      var F = v, $ = hl(s), U = [];
      e: {
        var B = Bp.get(n);
        if (B !== void 0) {
          var q = El, te = n;
          switch (n) {
            case "keypress":
              if (rs(s) === 0) break e;
            case "keydown":
            case "keyup":
              q = fx;
              break;
            case "focusin":
              te = "focus", q = Dl;
              break;
            case "focusout":
              te = "blur", q = Dl;
              break;
            case "beforeblur":
            case "afterblur":
              q = Dl;
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
              q = gp;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              q = ex;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              q = hx;
              break;
            case Op:
            case Lp:
            case Vp:
              q = rx;
              break;
            case zp:
              q = gx;
              break;
            case "scroll":
              q = Jw;
              break;
            case "wheel":
              q = Sx;
              break;
            case "copy":
            case "cut":
            case "paste":
              q = ix;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              q = Sp;
          }
          var re = (r & 4) !== 0, Ve = !re && n === "scroll", j = re ? B !== null ? B + "Capture" : null : B;
          re = [];
          for (var R = F, I; R !== null; ) {
            I = R;
            var G = I.stateNode;
            if (I.tag === 5 && G !== null && (I = G, j !== null && (G = Mo(R, j), G != null && re.push(Xo(R, G, I)))), Ve) break;
            R = R.return;
          }
          0 < re.length && (B = new q(B, te, null, s, $), U.push({ event: B, listeners: re }));
        }
      }
      if ((r & 7) === 0) {
        e: {
          if (B = n === "mouseover" || n === "pointerover", q = n === "mouseout" || n === "pointerout", B && s !== ml && (te = s.relatedTarget || s.fromElement) && (nr(te) || te[an])) break e;
          if ((q || B) && (B = $.window === $ ? $ : (B = $.ownerDocument) ? B.defaultView || B.parentWindow : window, q ? (te = s.relatedTarget || s.toElement, q = F, te = te ? nr(te) : null, te !== null && (Ve = tr(te), te !== Ve || te.tag !== 5 && te.tag !== 6) && (te = null)) : (q = null, te = F), q !== te)) {
            if (re = gp, G = "onMouseLeave", j = "onMouseEnter", R = "mouse", (n === "pointerout" || n === "pointerover") && (re = Sp, G = "onPointerLeave", j = "onPointerEnter", R = "pointer"), Ve = q == null ? B : $r(q), I = te == null ? B : $r(te), B = new re(G, R + "leave", q, s, $), B.target = Ve, B.relatedTarget = I, G = null, nr($) === F && (re = new re(j, R + "enter", te, s, $), re.target = I, re.relatedTarget = Ve, G = re), Ve = G, q && te) t: {
              for (re = q, j = te, R = 0, I = re; I; I = zr(I)) R++;
              for (I = 0, G = j; G; G = zr(G)) I++;
              for (; 0 < R - I; ) re = zr(re), R--;
              for (; 0 < I - R; ) j = zr(j), I--;
              for (; R--; ) {
                if (re === j || j !== null && re === j.alternate) break t;
                re = zr(re), j = zr(j);
              }
              re = null;
            }
            else re = null;
            q !== null && Gp(U, B, q, re, !1), te !== null && Ve !== null && Gp(U, Ve, te, re, !0);
          }
        }
        e: {
          if (B = F ? $r(F) : window, q = B.nodeName && B.nodeName.toLowerCase(), q === "select" || q === "input" && B.type === "file") var oe = bx;
          else if (Ap(B)) if (Cp) oe = Mx;
          else {
            oe = Px;
            var se = Cx;
          }
          else (q = B.nodeName) && q.toLowerCase() === "input" && (B.type === "checkbox" || B.type === "radio") && (oe = Ex);
          if (oe && (oe = oe(n, F))) {
            bp(U, oe, s, $);
            break e;
          }
          se && se(n, B, F), n === "focusout" && (se = B._wrapperState) && se.controlled && B.type === "number" && ul(B, "number", B.value);
        }
        switch (se = F ? $r(F) : window, n) {
          case "focusin":
            (Ap(se) || se.contentEditable === "true") && (Lr = se, Ll = F, Go = null);
            break;
          case "focusout":
            Go = Ll = Lr = null;
            break;
          case "mousedown":
            Vl = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            Vl = !1, Ip(U, s, $);
            break;
          case "selectionchange":
            if (Nx) break;
          case "keydown":
          case "keyup":
            Ip(U, s, $);
        }
        var ae;
        if (jl) e: {
          switch (n) {
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
        else Or ? Tp(n, s) && (le = "onCompositionEnd") : n === "keydown" && s.keyCode === 229 && (le = "onCompositionStart");
        le && (wp && s.locale !== "ko" && (Or || le !== "onCompositionStart" ? le === "onCompositionEnd" && Or && (ae = hp()) : (Cn = $, Pl = "value" in Cn ? Cn.value : Cn.textContent, Or = !0)), se = cs(F, le), 0 < se.length && (le = new vp(le, n, null, s, $), U.push({ event: le, listeners: se }), ae ? le.data = ae : (ae = kp(s), ae !== null && (le.data = ae)))), (ae = xx ? _x(n, s) : Tx(n, s)) && (F = cs(F, "onBeforeInput"), 0 < F.length && ($ = new vp("onBeforeInput", "beforeinput", null, s, $), U.push({ event: $, listeners: F }), $.data = ae));
      }
      Hp(U, r);
    });
  }
  function Xo(n, r, s) {
    return { instance: n, listener: r, currentTarget: s };
  }
  function cs(n, r) {
    for (var s = r + "Capture", u = []; n !== null; ) {
      var h = n, v = h.stateNode;
      h.tag === 5 && v !== null && (h = v, v = Mo(n, s), v != null && u.unshift(Xo(n, v, h)), v = Mo(n, r), v != null && u.push(Xo(n, v, h))), n = n.return;
    }
    return u;
  }
  function zr(n) {
    if (n === null) return null;
    do
      n = n.return;
    while (n && n.tag !== 5);
    return n || null;
  }
  function Gp(n, r, s, u, h) {
    for (var v = r._reactName, k = []; s !== null && s !== u; ) {
      var P = s, M = P.alternate, F = P.stateNode;
      if (M !== null && M === u) break;
      P.tag === 5 && F !== null && (P = F, h ? (M = Mo(s, v), M != null && k.unshift(Xo(s, M, P))) : h || (M = Mo(s, v), M != null && k.push(Xo(s, M, P)))), s = s.return;
    }
    k.length !== 0 && n.push({ event: r, listeners: k });
  }
  var Ox = /\r\n?/g, Lx = /\u0000|\uFFFD/g;
  function Kp(n) {
    return (typeof n == "string" ? n : "" + n).replace(Ox, `
`).replace(Lx, "");
  }
  function ds(n, r, s) {
    if (r = Kp(r), Kp(n) !== r && s) throw Error(o(425));
  }
  function fs() {
  }
  var Wl = null, Gl = null;
  function Kl(n, r) {
    return n === "textarea" || n === "noscript" || typeof r.children == "string" || typeof r.children == "number" || typeof r.dangerouslySetInnerHTML == "object" && r.dangerouslySetInnerHTML !== null && r.dangerouslySetInnerHTML.__html != null;
  }
  var Yl = typeof setTimeout == "function" ? setTimeout : void 0, Vx = typeof clearTimeout == "function" ? clearTimeout : void 0, Yp = typeof Promise == "function" ? Promise : void 0, zx = typeof queueMicrotask == "function" ? queueMicrotask : typeof Yp < "u" ? function(n) {
    return Yp.resolve(null).then(n).catch(Bx);
  } : Yl;
  function Bx(n) {
    setTimeout(function() {
      throw n;
    });
  }
  function Xl(n, r) {
    var s = r, u = 0;
    do {
      var h = s.nextSibling;
      if (n.removeChild(s), h && h.nodeType === 8) if (s = h.data, s === "/$") {
        if (u === 0) {
          n.removeChild(h), Vo(r);
          return;
        }
        u--;
      } else s !== "$" && s !== "$?" && s !== "$!" || u++;
      s = h;
    } while (s);
    Vo(r);
  }
  function En(n) {
    for (; n != null; n = n.nextSibling) {
      var r = n.nodeType;
      if (r === 1 || r === 3) break;
      if (r === 8) {
        if (r = n.data, r === "$" || r === "$!" || r === "$?") break;
        if (r === "/$") return null;
      }
    }
    return n;
  }
  function Xp(n) {
    n = n.previousSibling;
    for (var r = 0; n; ) {
      if (n.nodeType === 8) {
        var s = n.data;
        if (s === "$" || s === "$!" || s === "$?") {
          if (r === 0) return n;
          r--;
        } else s === "/$" && r++;
      }
      n = n.previousSibling;
    }
    return null;
  }
  var Br = Math.random().toString(36).slice(2), Xt = "__reactFiber$" + Br, Qo = "__reactProps$" + Br, an = "__reactContainer$" + Br, Ql = "__reactEvents$" + Br, $x = "__reactListeners$" + Br, Ux = "__reactHandles$" + Br;
  function nr(n) {
    var r = n[Xt];
    if (r) return r;
    for (var s = n.parentNode; s; ) {
      if (r = s[an] || s[Xt]) {
        if (s = r.alternate, r.child !== null || s !== null && s.child !== null) for (n = Xp(n); n !== null; ) {
          if (s = n[Xt]) return s;
          n = Xp(n);
        }
        return r;
      }
      n = s, s = n.parentNode;
    }
    return null;
  }
  function Zo(n) {
    return n = n[Xt] || n[an], !n || n.tag !== 5 && n.tag !== 6 && n.tag !== 13 && n.tag !== 3 ? null : n;
  }
  function $r(n) {
    if (n.tag === 5 || n.tag === 6) return n.stateNode;
    throw Error(o(33));
  }
  function ps(n) {
    return n[Qo] || null;
  }
  var Zl = [], Ur = -1;
  function Mn(n) {
    return { current: n };
  }
  function Re(n) {
    0 > Ur || (n.current = Zl[Ur], Zl[Ur] = null, Ur--);
  }
  function Ee(n, r) {
    Ur++, Zl[Ur] = n.current, n.current = r;
  }
  var Rn = {}, et = Mn(Rn), dt = Mn(!1), rr = Rn;
  function Hr(n, r) {
    var s = n.type.contextTypes;
    if (!s) return Rn;
    var u = n.stateNode;
    if (u && u.__reactInternalMemoizedUnmaskedChildContext === r) return u.__reactInternalMemoizedMaskedChildContext;
    var h = {}, v;
    for (v in s) h[v] = r[v];
    return u && (n = n.stateNode, n.__reactInternalMemoizedUnmaskedChildContext = r, n.__reactInternalMemoizedMaskedChildContext = h), h;
  }
  function ft(n) {
    return n = n.childContextTypes, n != null;
  }
  function ms() {
    Re(dt), Re(et);
  }
  function Qp(n, r, s) {
    if (et.current !== Rn) throw Error(o(168));
    Ee(et, r), Ee(dt, s);
  }
  function Zp(n, r, s) {
    var u = n.stateNode;
    if (r = r.childContextTypes, typeof u.getChildContext != "function") return s;
    u = u.getChildContext();
    for (var h in u) if (!(h in r)) throw Error(o(108, Pe(n) || "Unknown", h));
    return X({}, s, u);
  }
  function hs(n) {
    return n = (n = n.stateNode) && n.__reactInternalMemoizedMergedChildContext || Rn, rr = et.current, Ee(et, n), Ee(dt, dt.current), !0;
  }
  function Jp(n, r, s) {
    var u = n.stateNode;
    if (!u) throw Error(o(169));
    s ? (n = Zp(n, r, rr), u.__reactInternalMemoizedMergedChildContext = n, Re(dt), Re(et), Ee(et, n)) : Re(dt), Ee(dt, s);
  }
  var ln = null, ys = !1, Jl = !1;
  function qp(n) {
    ln === null ? ln = [n] : ln.push(n);
  }
  function Hx(n) {
    ys = !0, qp(n);
  }
  function Dn() {
    if (!Jl && ln !== null) {
      Jl = !0;
      var n = 0, r = _e;
      try {
        var s = ln;
        for (_e = 1; n < s.length; n++) {
          var u = s[n];
          do
            u = u(!0);
          while (u !== null);
        }
        ln = null, ys = !1;
      } catch (h) {
        throw ln !== null && (ln = ln.slice(n + 1)), tp(wl, Dn), h;
      } finally {
        _e = r, Jl = !1;
      }
    }
    return null;
  }
  var Wr = [], Gr = 0, gs = null, vs = 0, kt = [], At = 0, or = null, un = 1, cn = "";
  function ir(n, r) {
    Wr[Gr++] = vs, Wr[Gr++] = gs, gs = n, vs = r;
  }
  function em(n, r, s) {
    kt[At++] = un, kt[At++] = cn, kt[At++] = or, or = n;
    var u = un;
    n = cn;
    var h = 32 - It(u) - 1;
    u &= ~(1 << h), s += 1;
    var v = 32 - It(r) + h;
    if (30 < v) {
      var k = h - h % 5;
      v = (u & (1 << k) - 1).toString(32), u >>= k, h -= k, un = 1 << 32 - It(r) + h | s << h | u, cn = v + n;
    } else un = 1 << v | s << h | u, cn = n;
  }
  function ql(n) {
    n.return !== null && (ir(n, 1), em(n, 1, 0));
  }
  function eu(n) {
    for (; n === gs; ) gs = Wr[--Gr], Wr[Gr] = null, vs = Wr[--Gr], Wr[Gr] = null;
    for (; n === or; ) or = kt[--At], kt[At] = null, cn = kt[--At], kt[At] = null, un = kt[--At], kt[At] = null;
  }
  var wt = null, xt = null, Ne = !1, Ot = null;
  function tm(n, r) {
    var s = Et(5, null, null, 0);
    s.elementType = "DELETED", s.stateNode = r, s.return = n, r = n.deletions, r === null ? (n.deletions = [s], n.flags |= 16) : r.push(s);
  }
  function nm(n, r) {
    switch (n.tag) {
      case 5:
        var s = n.type;
        return r = r.nodeType !== 1 || s.toLowerCase() !== r.nodeName.toLowerCase() ? null : r, r !== null ? (n.stateNode = r, wt = n, xt = En(r.firstChild), !0) : !1;
      case 6:
        return r = n.pendingProps === "" || r.nodeType !== 3 ? null : r, r !== null ? (n.stateNode = r, wt = n, xt = null, !0) : !1;
      case 13:
        return r = r.nodeType !== 8 ? null : r, r !== null ? (s = or !== null ? { id: un, overflow: cn } : null, n.memoizedState = { dehydrated: r, treeContext: s, retryLane: 1073741824 }, s = Et(18, null, null, 0), s.stateNode = r, s.return = n, n.child = s, wt = n, xt = null, !0) : !1;
      default:
        return !1;
    }
  }
  function tu(n) {
    return (n.mode & 1) !== 0 && (n.flags & 128) === 0;
  }
  function nu(n) {
    if (Ne) {
      var r = xt;
      if (r) {
        var s = r;
        if (!nm(n, r)) {
          if (tu(n)) throw Error(o(418));
          r = En(s.nextSibling);
          var u = wt;
          r && nm(n, r) ? tm(u, s) : (n.flags = n.flags & -4097 | 2, Ne = !1, wt = n);
        }
      } else {
        if (tu(n)) throw Error(o(418));
        n.flags = n.flags & -4097 | 2, Ne = !1, wt = n;
      }
    }
  }
  function rm(n) {
    for (n = n.return; n !== null && n.tag !== 5 && n.tag !== 3 && n.tag !== 13; ) n = n.return;
    wt = n;
  }
  function Ss(n) {
    if (n !== wt) return !1;
    if (!Ne) return rm(n), Ne = !0, !1;
    var r;
    if ((r = n.tag !== 3) && !(r = n.tag !== 5) && (r = n.type, r = r !== "head" && r !== "body" && !Kl(n.type, n.memoizedProps)), r && (r = xt)) {
      if (tu(n)) throw om(), Error(o(418));
      for (; r; ) tm(n, r), r = En(r.nextSibling);
    }
    if (rm(n), n.tag === 13) {
      if (n = n.memoizedState, n = n !== null ? n.dehydrated : null, !n) throw Error(o(317));
      e: {
        for (n = n.nextSibling, r = 0; n; ) {
          if (n.nodeType === 8) {
            var s = n.data;
            if (s === "/$") {
              if (r === 0) {
                xt = En(n.nextSibling);
                break e;
              }
              r--;
            } else s !== "$" && s !== "$!" && s !== "$?" || r++;
          }
          n = n.nextSibling;
        }
        xt = null;
      }
    } else xt = wt ? En(n.stateNode.nextSibling) : null;
    return !0;
  }
  function om() {
    for (var n = xt; n; ) n = En(n.nextSibling);
  }
  function Kr() {
    xt = wt = null, Ne = !1;
  }
  function ru(n) {
    Ot === null ? Ot = [n] : Ot.push(n);
  }
  var Wx = N.ReactCurrentBatchConfig;
  function Jo(n, r, s) {
    if (n = s.ref, n !== null && typeof n != "function" && typeof n != "object") {
      if (s._owner) {
        if (s = s._owner, s) {
          if (s.tag !== 1) throw Error(o(309));
          var u = s.stateNode;
        }
        if (!u) throw Error(o(147, n));
        var h = u, v = "" + n;
        return r !== null && r.ref !== null && typeof r.ref == "function" && r.ref._stringRef === v ? r.ref : (r = function(k) {
          var P = h.refs;
          k === null ? delete P[v] : P[v] = k;
        }, r._stringRef = v, r);
      }
      if (typeof n != "string") throw Error(o(284));
      if (!s._owner) throw Error(o(290, n));
    }
    return n;
  }
  function ws(n, r) {
    throw n = Object.prototype.toString.call(r), Error(o(31, n === "[object Object]" ? "object with keys {" + Object.keys(r).join(", ") + "}" : n));
  }
  function im(n) {
    var r = n._init;
    return r(n._payload);
  }
  function sm(n) {
    function r(j, R) {
      if (n) {
        var I = j.deletions;
        I === null ? (j.deletions = [R], j.flags |= 16) : I.push(R);
      }
    }
    function s(j, R) {
      if (!n) return null;
      for (; R !== null; ) r(j, R), R = R.sibling;
      return null;
    }
    function u(j, R) {
      for (j = /* @__PURE__ */ new Map(); R !== null; ) R.key !== null ? j.set(R.key, R) : j.set(R.index, R), R = R.sibling;
      return j;
    }
    function h(j, R) {
      return j = zn(j, R), j.index = 0, j.sibling = null, j;
    }
    function v(j, R, I) {
      return j.index = I, n ? (I = j.alternate, I !== null ? (I = I.index, I < R ? (j.flags |= 2, R) : I) : (j.flags |= 2, R)) : (j.flags |= 1048576, R);
    }
    function k(j) {
      return n && j.alternate === null && (j.flags |= 2), j;
    }
    function P(j, R, I, G) {
      return R === null || R.tag !== 6 ? (R = Yu(I, j.mode, G), R.return = j, R) : (R = h(R, I), R.return = j, R);
    }
    function M(j, R, I, G) {
      var oe = I.type;
      return oe === H ? $(j, R, I.props.children, G, I.key) : R !== null && (R.elementType === oe || typeof oe == "object" && oe !== null && oe.$$typeof === me && im(oe) === R.type) ? (G = h(R, I.props), G.ref = Jo(j, R, I), G.return = j, G) : (G = Hs(I.type, I.key, I.props, null, j.mode, G), G.ref = Jo(j, R, I), G.return = j, G);
    }
    function F(j, R, I, G) {
      return R === null || R.tag !== 4 || R.stateNode.containerInfo !== I.containerInfo || R.stateNode.implementation !== I.implementation ? (R = Xu(I, j.mode, G), R.return = j, R) : (R = h(R, I.children || []), R.return = j, R);
    }
    function $(j, R, I, G, oe) {
      return R === null || R.tag !== 7 ? (R = pr(I, j.mode, G, oe), R.return = j, R) : (R = h(R, I), R.return = j, R);
    }
    function U(j, R, I) {
      if (typeof R == "string" && R !== "" || typeof R == "number") return R = Yu("" + R, j.mode, I), R.return = j, R;
      if (typeof R == "object" && R !== null) {
        switch (R.$$typeof) {
          case L:
            return I = Hs(R.type, R.key, R.props, null, j.mode, I), I.ref = Jo(j, null, R), I.return = j, I;
          case W:
            return R = Xu(R, j.mode, I), R.return = j, R;
          case me:
            var G = R._init;
            return U(j, G(R._payload), I);
        }
        if (Co(R) || Z(R)) return R = pr(R, j.mode, I, null), R.return = j, R;
        ws(j, R);
      }
      return null;
    }
    function B(j, R, I, G) {
      var oe = R !== null ? R.key : null;
      if (typeof I == "string" && I !== "" || typeof I == "number") return oe !== null ? null : P(j, R, "" + I, G);
      if (typeof I == "object" && I !== null) {
        switch (I.$$typeof) {
          case L:
            return I.key === oe ? M(j, R, I, G) : null;
          case W:
            return I.key === oe ? F(j, R, I, G) : null;
          case me:
            return oe = I._init, B(
              j,
              R,
              oe(I._payload),
              G
            );
        }
        if (Co(I) || Z(I)) return oe !== null ? null : $(j, R, I, G, null);
        ws(j, I);
      }
      return null;
    }
    function q(j, R, I, G, oe) {
      if (typeof G == "string" && G !== "" || typeof G == "number") return j = j.get(I) || null, P(R, j, "" + G, oe);
      if (typeof G == "object" && G !== null) {
        switch (G.$$typeof) {
          case L:
            return j = j.get(G.key === null ? I : G.key) || null, M(R, j, G, oe);
          case W:
            return j = j.get(G.key === null ? I : G.key) || null, F(R, j, G, oe);
          case me:
            var se = G._init;
            return q(j, R, I, se(G._payload), oe);
        }
        if (Co(G) || Z(G)) return j = j.get(I) || null, $(R, j, G, oe, null);
        ws(R, G);
      }
      return null;
    }
    function te(j, R, I, G) {
      for (var oe = null, se = null, ae = R, le = R = 0, Ye = null; ae !== null && le < I.length; le++) {
        ae.index > le ? (Ye = ae, ae = null) : Ye = ae.sibling;
        var Se = B(j, ae, I[le], G);
        if (Se === null) {
          ae === null && (ae = Ye);
          break;
        }
        n && ae && Se.alternate === null && r(j, ae), R = v(Se, R, le), se === null ? oe = Se : se.sibling = Se, se = Se, ae = Ye;
      }
      if (le === I.length) return s(j, ae), Ne && ir(j, le), oe;
      if (ae === null) {
        for (; le < I.length; le++) ae = U(j, I[le], G), ae !== null && (R = v(ae, R, le), se === null ? oe = ae : se.sibling = ae, se = ae);
        return Ne && ir(j, le), oe;
      }
      for (ae = u(j, ae); le < I.length; le++) Ye = q(ae, j, le, I[le], G), Ye !== null && (n && Ye.alternate !== null && ae.delete(Ye.key === null ? le : Ye.key), R = v(Ye, R, le), se === null ? oe = Ye : se.sibling = Ye, se = Ye);
      return n && ae.forEach(function(Bn) {
        return r(j, Bn);
      }), Ne && ir(j, le), oe;
    }
    function re(j, R, I, G) {
      var oe = Z(I);
      if (typeof oe != "function") throw Error(o(150));
      if (I = oe.call(I), I == null) throw Error(o(151));
      for (var se = oe = null, ae = R, le = R = 0, Ye = null, Se = I.next(); ae !== null && !Se.done; le++, Se = I.next()) {
        ae.index > le ? (Ye = ae, ae = null) : Ye = ae.sibling;
        var Bn = B(j, ae, Se.value, G);
        if (Bn === null) {
          ae === null && (ae = Ye);
          break;
        }
        n && ae && Bn.alternate === null && r(j, ae), R = v(Bn, R, le), se === null ? oe = Bn : se.sibling = Bn, se = Bn, ae = Ye;
      }
      if (Se.done) return s(
        j,
        ae
      ), Ne && ir(j, le), oe;
      if (ae === null) {
        for (; !Se.done; le++, Se = I.next()) Se = U(j, Se.value, G), Se !== null && (R = v(Se, R, le), se === null ? oe = Se : se.sibling = Se, se = Se);
        return Ne && ir(j, le), oe;
      }
      for (ae = u(j, ae); !Se.done; le++, Se = I.next()) Se = q(ae, j, le, Se.value, G), Se !== null && (n && Se.alternate !== null && ae.delete(Se.key === null ? le : Se.key), R = v(Se, R, le), se === null ? oe = Se : se.sibling = Se, se = Se);
      return n && ae.forEach(function(k1) {
        return r(j, k1);
      }), Ne && ir(j, le), oe;
    }
    function Ve(j, R, I, G) {
      if (typeof I == "object" && I !== null && I.type === H && I.key === null && (I = I.props.children), typeof I == "object" && I !== null) {
        switch (I.$$typeof) {
          case L:
            e: {
              for (var oe = I.key, se = R; se !== null; ) {
                if (se.key === oe) {
                  if (oe = I.type, oe === H) {
                    if (se.tag === 7) {
                      s(j, se.sibling), R = h(se, I.props.children), R.return = j, j = R;
                      break e;
                    }
                  } else if (se.elementType === oe || typeof oe == "object" && oe !== null && oe.$$typeof === me && im(oe) === se.type) {
                    s(j, se.sibling), R = h(se, I.props), R.ref = Jo(j, se, I), R.return = j, j = R;
                    break e;
                  }
                  s(j, se);
                  break;
                } else r(j, se);
                se = se.sibling;
              }
              I.type === H ? (R = pr(I.props.children, j.mode, G, I.key), R.return = j, j = R) : (G = Hs(I.type, I.key, I.props, null, j.mode, G), G.ref = Jo(j, R, I), G.return = j, j = G);
            }
            return k(j);
          case W:
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
              R = Xu(I, j.mode, G), R.return = j, j = R;
            }
            return k(j);
          case me:
            return se = I._init, Ve(j, R, se(I._payload), G);
        }
        if (Co(I)) return te(j, R, I, G);
        if (Z(I)) return re(j, R, I, G);
        ws(j, I);
      }
      return typeof I == "string" && I !== "" || typeof I == "number" ? (I = "" + I, R !== null && R.tag === 6 ? (s(j, R.sibling), R = h(R, I), R.return = j, j = R) : (s(j, R), R = Yu(I, j.mode, G), R.return = j, j = R), k(j)) : s(j, R);
    }
    return Ve;
  }
  var Yr = sm(!0), am = sm(!1), xs = Mn(null), _s = null, Xr = null, ou = null;
  function iu() {
    ou = Xr = _s = null;
  }
  function su(n) {
    var r = xs.current;
    Re(xs), n._currentValue = r;
  }
  function au(n, r, s) {
    for (; n !== null; ) {
      var u = n.alternate;
      if ((n.childLanes & r) !== r ? (n.childLanes |= r, u !== null && (u.childLanes |= r)) : u !== null && (u.childLanes & r) !== r && (u.childLanes |= r), n === s) break;
      n = n.return;
    }
  }
  function Qr(n, r) {
    _s = n, ou = Xr = null, n = n.dependencies, n !== null && n.firstContext !== null && ((n.lanes & r) !== 0 && (pt = !0), n.firstContext = null);
  }
  function bt(n) {
    var r = n._currentValue;
    if (ou !== n) if (n = { context: n, memoizedValue: r, next: null }, Xr === null) {
      if (_s === null) throw Error(o(308));
      Xr = n, _s.dependencies = { lanes: 0, firstContext: n };
    } else Xr = Xr.next = n;
    return r;
  }
  var sr = null;
  function lu(n) {
    sr === null ? sr = [n] : sr.push(n);
  }
  function lm(n, r, s, u) {
    var h = r.interleaved;
    return h === null ? (s.next = s, lu(r)) : (s.next = h.next, h.next = s), r.interleaved = s, dn(n, u);
  }
  function dn(n, r) {
    n.lanes |= r;
    var s = n.alternate;
    for (s !== null && (s.lanes |= r), s = n, n = n.return; n !== null; ) n.childLanes |= r, s = n.alternate, s !== null && (s.childLanes |= r), s = n, n = n.return;
    return s.tag === 3 ? s.stateNode : null;
  }
  var Nn = !1;
  function uu(n) {
    n.updateQueue = { baseState: n.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
  }
  function um(n, r) {
    n = n.updateQueue, r.updateQueue === n && (r.updateQueue = { baseState: n.baseState, firstBaseUpdate: n.firstBaseUpdate, lastBaseUpdate: n.lastBaseUpdate, shared: n.shared, effects: n.effects });
  }
  function fn(n, r) {
    return { eventTime: n, lane: r, tag: 0, payload: null, callback: null, next: null };
  }
  function jn(n, r, s) {
    var u = n.updateQueue;
    if (u === null) return null;
    if (u = u.shared, (he & 2) !== 0) {
      var h = u.pending;
      return h === null ? r.next = r : (r.next = h.next, h.next = r), u.pending = r, dn(n, s);
    }
    return h = u.interleaved, h === null ? (r.next = r, lu(u)) : (r.next = h.next, h.next = r), u.interleaved = r, dn(n, s);
  }
  function Ts(n, r, s) {
    if (r = r.updateQueue, r !== null && (r = r.shared, (s & 4194240) !== 0)) {
      var u = r.lanes;
      u &= n.pendingLanes, s |= u, r.lanes = s, Tl(n, s);
    }
  }
  function cm(n, r) {
    var s = n.updateQueue, u = n.alternate;
    if (u !== null && (u = u.updateQueue, s === u)) {
      var h = null, v = null;
      if (s = s.firstBaseUpdate, s !== null) {
        do {
          var k = { eventTime: s.eventTime, lane: s.lane, tag: s.tag, payload: s.payload, callback: s.callback, next: null };
          v === null ? h = v = k : v = v.next = k, s = s.next;
        } while (s !== null);
        v === null ? h = v = r : v = v.next = r;
      } else h = v = r;
      s = { baseState: u.baseState, firstBaseUpdate: h, lastBaseUpdate: v, shared: u.shared, effects: u.effects }, n.updateQueue = s;
      return;
    }
    n = s.lastBaseUpdate, n === null ? s.firstBaseUpdate = r : n.next = r, s.lastBaseUpdate = r;
  }
  function ks(n, r, s, u) {
    var h = n.updateQueue;
    Nn = !1;
    var v = h.firstBaseUpdate, k = h.lastBaseUpdate, P = h.shared.pending;
    if (P !== null) {
      h.shared.pending = null;
      var M = P, F = M.next;
      M.next = null, k === null ? v = F : k.next = F, k = M;
      var $ = n.alternate;
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
            var te = n, re = P;
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
                U = X({}, U, B);
                break e;
              case 2:
                Nn = !0;
            }
          }
          P.callback !== null && P.lane !== 0 && (n.flags |= 64, B = h.effects, B === null ? h.effects = [P] : B.push(P));
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
      ur |= k, n.lanes = k, n.memoizedState = U;
    }
  }
  function dm(n, r, s) {
    if (n = r.effects, r.effects = null, n !== null) for (r = 0; r < n.length; r++) {
      var u = n[r], h = u.callback;
      if (h !== null) {
        if (u.callback = null, u = s, typeof h != "function") throw Error(o(191, h));
        h.call(u);
      }
    }
  }
  var qo = {}, Qt = Mn(qo), ei = Mn(qo), ti = Mn(qo);
  function ar(n) {
    if (n === qo) throw Error(o(174));
    return n;
  }
  function cu(n, r) {
    switch (Ee(ti, r), Ee(ei, n), Ee(Qt, qo), n = r.nodeType, n) {
      case 9:
      case 11:
        r = (r = r.documentElement) ? r.namespaceURI : dl(null, "");
        break;
      default:
        n = n === 8 ? r.parentNode : r, r = n.namespaceURI || null, n = n.tagName, r = dl(r, n);
    }
    Re(Qt), Ee(Qt, r);
  }
  function Zr() {
    Re(Qt), Re(ei), Re(ti);
  }
  function fm(n) {
    ar(ti.current);
    var r = ar(Qt.current), s = dl(r, n.type);
    r !== s && (Ee(ei, n), Ee(Qt, s));
  }
  function du(n) {
    ei.current === n && (Re(Qt), Re(ei));
  }
  var je = Mn(0);
  function As(n) {
    for (var r = n; r !== null; ) {
      if (r.tag === 13) {
        var s = r.memoizedState;
        if (s !== null && (s = s.dehydrated, s === null || s.data === "$?" || s.data === "$!")) return r;
      } else if (r.tag === 19 && r.memoizedProps.revealOrder !== void 0) {
        if ((r.flags & 128) !== 0) return r;
      } else if (r.child !== null) {
        r.child.return = r, r = r.child;
        continue;
      }
      if (r === n) break;
      for (; r.sibling === null; ) {
        if (r.return === null || r.return === n) return null;
        r = r.return;
      }
      r.sibling.return = r.return, r = r.sibling;
    }
    return null;
  }
  var fu = [];
  function pu() {
    for (var n = 0; n < fu.length; n++) fu[n]._workInProgressVersionPrimary = null;
    fu.length = 0;
  }
  var bs = N.ReactCurrentDispatcher, mu = N.ReactCurrentBatchConfig, lr = 0, Ie = null, $e = null, Ge = null, Cs = !1, ni = !1, ri = 0, Gx = 0;
  function tt() {
    throw Error(o(321));
  }
  function hu(n, r) {
    if (r === null) return !1;
    for (var s = 0; s < r.length && s < n.length; s++) if (!Ft(n[s], r[s])) return !1;
    return !0;
  }
  function yu(n, r, s, u, h, v) {
    if (lr = v, Ie = r, r.memoizedState = null, r.updateQueue = null, r.lanes = 0, bs.current = n === null || n.memoizedState === null ? Qx : Zx, n = s(u, h), ni) {
      v = 0;
      do {
        if (ni = !1, ri = 0, 25 <= v) throw Error(o(301));
        v += 1, Ge = $e = null, r.updateQueue = null, bs.current = Jx, n = s(u, h);
      } while (ni);
    }
    if (bs.current = Ms, r = $e !== null && $e.next !== null, lr = 0, Ge = $e = Ie = null, Cs = !1, r) throw Error(o(300));
    return n;
  }
  function gu() {
    var n = ri !== 0;
    return ri = 0, n;
  }
  function Zt() {
    var n = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
    return Ge === null ? Ie.memoizedState = Ge = n : Ge = Ge.next = n, Ge;
  }
  function Ct() {
    if ($e === null) {
      var n = Ie.alternate;
      n = n !== null ? n.memoizedState : null;
    } else n = $e.next;
    var r = Ge === null ? Ie.memoizedState : Ge.next;
    if (r !== null) Ge = r, $e = n;
    else {
      if (n === null) throw Error(o(310));
      $e = n, n = { memoizedState: $e.memoizedState, baseState: $e.baseState, baseQueue: $e.baseQueue, queue: $e.queue, next: null }, Ge === null ? Ie.memoizedState = Ge = n : Ge = Ge.next = n;
    }
    return Ge;
  }
  function oi(n, r) {
    return typeof r == "function" ? r(n) : r;
  }
  function vu(n) {
    var r = Ct(), s = r.queue;
    if (s === null) throw Error(o(311));
    s.lastRenderedReducer = n;
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
        if ((lr & $) === $) M !== null && (M = M.next = { lane: 0, action: F.action, hasEagerState: F.hasEagerState, eagerState: F.eagerState, next: null }), u = F.hasEagerState ? F.eagerState : n(u, F.action);
        else {
          var U = {
            lane: $,
            action: F.action,
            hasEagerState: F.hasEagerState,
            eagerState: F.eagerState,
            next: null
          };
          M === null ? (P = M = U, k = u) : M = M.next = U, Ie.lanes |= $, ur |= $;
        }
        F = F.next;
      } while (F !== null && F !== v);
      M === null ? k = u : M.next = P, Ft(u, r.memoizedState) || (pt = !0), r.memoizedState = u, r.baseState = k, r.baseQueue = M, s.lastRenderedState = u;
    }
    if (n = s.interleaved, n !== null) {
      h = n;
      do
        v = h.lane, Ie.lanes |= v, ur |= v, h = h.next;
      while (h !== n);
    } else h === null && (s.lanes = 0);
    return [r.memoizedState, s.dispatch];
  }
  function Su(n) {
    var r = Ct(), s = r.queue;
    if (s === null) throw Error(o(311));
    s.lastRenderedReducer = n;
    var u = s.dispatch, h = s.pending, v = r.memoizedState;
    if (h !== null) {
      s.pending = null;
      var k = h = h.next;
      do
        v = n(v, k.action), k = k.next;
      while (k !== h);
      Ft(v, r.memoizedState) || (pt = !0), r.memoizedState = v, r.baseQueue === null && (r.baseState = v), s.lastRenderedState = v;
    }
    return [v, u];
  }
  function pm() {
  }
  function mm(n, r) {
    var s = Ie, u = Ct(), h = r(), v = !Ft(u.memoizedState, h);
    if (v && (u.memoizedState = h, pt = !0), u = u.queue, wu(gm.bind(null, s, u, n), [n]), u.getSnapshot !== r || v || Ge !== null && Ge.memoizedState.tag & 1) {
      if (s.flags |= 2048, ii(9, ym.bind(null, s, u, h, r), void 0, null), Ke === null) throw Error(o(349));
      (lr & 30) !== 0 || hm(s, r, h);
    }
    return h;
  }
  function hm(n, r, s) {
    n.flags |= 16384, n = { getSnapshot: r, value: s }, r = Ie.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, Ie.updateQueue = r, r.stores = [n]) : (s = r.stores, s === null ? r.stores = [n] : s.push(n));
  }
  function ym(n, r, s, u) {
    r.value = s, r.getSnapshot = u, vm(r) && Sm(n);
  }
  function gm(n, r, s) {
    return s(function() {
      vm(r) && Sm(n);
    });
  }
  function vm(n) {
    var r = n.getSnapshot;
    n = n.value;
    try {
      var s = r();
      return !Ft(n, s);
    } catch {
      return !0;
    }
  }
  function Sm(n) {
    var r = dn(n, 1);
    r !== null && Bt(r, n, 1, -1);
  }
  function wm(n) {
    var r = Zt();
    return typeof n == "function" && (n = n()), r.memoizedState = r.baseState = n, n = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: oi, lastRenderedState: n }, r.queue = n, n = n.dispatch = Xx.bind(null, Ie, n), [r.memoizedState, n];
  }
  function ii(n, r, s, u) {
    return n = { tag: n, create: r, destroy: s, deps: u, next: null }, r = Ie.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, Ie.updateQueue = r, r.lastEffect = n.next = n) : (s = r.lastEffect, s === null ? r.lastEffect = n.next = n : (u = s.next, s.next = n, n.next = u, r.lastEffect = n)), n;
  }
  function xm() {
    return Ct().memoizedState;
  }
  function Ps(n, r, s, u) {
    var h = Zt();
    Ie.flags |= n, h.memoizedState = ii(1 | r, s, void 0, u === void 0 ? null : u);
  }
  function Es(n, r, s, u) {
    var h = Ct();
    u = u === void 0 ? null : u;
    var v = void 0;
    if ($e !== null) {
      var k = $e.memoizedState;
      if (v = k.destroy, u !== null && hu(u, k.deps)) {
        h.memoizedState = ii(r, s, v, u);
        return;
      }
    }
    Ie.flags |= n, h.memoizedState = ii(1 | r, s, v, u);
  }
  function _m(n, r) {
    return Ps(8390656, 8, n, r);
  }
  function wu(n, r) {
    return Es(2048, 8, n, r);
  }
  function Tm(n, r) {
    return Es(4, 2, n, r);
  }
  function km(n, r) {
    return Es(4, 4, n, r);
  }
  function Am(n, r) {
    if (typeof r == "function") return n = n(), r(n), function() {
      r(null);
    };
    if (r != null) return n = n(), r.current = n, function() {
      r.current = null;
    };
  }
  function bm(n, r, s) {
    return s = s != null ? s.concat([n]) : null, Es(4, 4, Am.bind(null, r, n), s);
  }
  function xu() {
  }
  function Cm(n, r) {
    var s = Ct();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && hu(r, u[1]) ? u[0] : (s.memoizedState = [n, r], n);
  }
  function Pm(n, r) {
    var s = Ct();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && hu(r, u[1]) ? u[0] : (n = n(), s.memoizedState = [n, r], n);
  }
  function Em(n, r, s) {
    return (lr & 21) === 0 ? (n.baseState && (n.baseState = !1, pt = !0), n.memoizedState = s) : (Ft(s, r) || (s = ip(), Ie.lanes |= s, ur |= s, n.baseState = !0), r);
  }
  function Kx(n, r) {
    var s = _e;
    _e = s !== 0 && 4 > s ? s : 4, n(!0);
    var u = mu.transition;
    mu.transition = {};
    try {
      n(!1), r();
    } finally {
      _e = s, mu.transition = u;
    }
  }
  function Mm() {
    return Ct().memoizedState;
  }
  function Yx(n, r, s) {
    var u = Ln(n);
    if (s = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null }, Rm(n)) Dm(r, s);
    else if (s = lm(n, r, s, u), s !== null) {
      var h = st();
      Bt(s, n, u, h), Nm(s, r, u);
    }
  }
  function Xx(n, r, s) {
    var u = Ln(n), h = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null };
    if (Rm(n)) Dm(r, h);
    else {
      var v = n.alternate;
      if (n.lanes === 0 && (v === null || v.lanes === 0) && (v = r.lastRenderedReducer, v !== null)) try {
        var k = r.lastRenderedState, P = v(k, s);
        if (h.hasEagerState = !0, h.eagerState = P, Ft(P, k)) {
          var M = r.interleaved;
          M === null ? (h.next = h, lu(r)) : (h.next = M.next, M.next = h), r.interleaved = h;
          return;
        }
      } catch {
      } finally {
      }
      s = lm(n, r, h, u), s !== null && (h = st(), Bt(s, n, u, h), Nm(s, r, u));
    }
  }
  function Rm(n) {
    var r = n.alternate;
    return n === Ie || r !== null && r === Ie;
  }
  function Dm(n, r) {
    ni = Cs = !0;
    var s = n.pending;
    s === null ? r.next = r : (r.next = s.next, s.next = r), n.pending = r;
  }
  function Nm(n, r, s) {
    if ((s & 4194240) !== 0) {
      var u = r.lanes;
      u &= n.pendingLanes, s |= u, r.lanes = s, Tl(n, s);
    }
  }
  var Ms = { readContext: bt, useCallback: tt, useContext: tt, useEffect: tt, useImperativeHandle: tt, useInsertionEffect: tt, useLayoutEffect: tt, useMemo: tt, useReducer: tt, useRef: tt, useState: tt, useDebugValue: tt, useDeferredValue: tt, useTransition: tt, useMutableSource: tt, useSyncExternalStore: tt, useId: tt, unstable_isNewReconciler: !1 }, Qx = { readContext: bt, useCallback: function(n, r) {
    return Zt().memoizedState = [n, r === void 0 ? null : r], n;
  }, useContext: bt, useEffect: _m, useImperativeHandle: function(n, r, s) {
    return s = s != null ? s.concat([n]) : null, Ps(
      4194308,
      4,
      Am.bind(null, r, n),
      s
    );
  }, useLayoutEffect: function(n, r) {
    return Ps(4194308, 4, n, r);
  }, useInsertionEffect: function(n, r) {
    return Ps(4, 2, n, r);
  }, useMemo: function(n, r) {
    var s = Zt();
    return r = r === void 0 ? null : r, n = n(), s.memoizedState = [n, r], n;
  }, useReducer: function(n, r, s) {
    var u = Zt();
    return r = s !== void 0 ? s(r) : r, u.memoizedState = u.baseState = r, n = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: n, lastRenderedState: r }, u.queue = n, n = n.dispatch = Yx.bind(null, Ie, n), [u.memoizedState, n];
  }, useRef: function(n) {
    var r = Zt();
    return n = { current: n }, r.memoizedState = n;
  }, useState: wm, useDebugValue: xu, useDeferredValue: function(n) {
    return Zt().memoizedState = n;
  }, useTransition: function() {
    var n = wm(!1), r = n[0];
    return n = Kx.bind(null, n[1]), Zt().memoizedState = n, [r, n];
  }, useMutableSource: function() {
  }, useSyncExternalStore: function(n, r, s) {
    var u = Ie, h = Zt();
    if (Ne) {
      if (s === void 0) throw Error(o(407));
      s = s();
    } else {
      if (s = r(), Ke === null) throw Error(o(349));
      (lr & 30) !== 0 || hm(u, r, s);
    }
    h.memoizedState = s;
    var v = { value: s, getSnapshot: r };
    return h.queue = v, _m(gm.bind(
      null,
      u,
      v,
      n
    ), [n]), u.flags |= 2048, ii(9, ym.bind(null, u, v, s, r), void 0, null), s;
  }, useId: function() {
    var n = Zt(), r = Ke.identifierPrefix;
    if (Ne) {
      var s = cn, u = un;
      s = (u & ~(1 << 32 - It(u) - 1)).toString(32) + s, r = ":" + r + "R" + s, s = ri++, 0 < s && (r += "H" + s.toString(32)), r += ":";
    } else s = Gx++, r = ":" + r + "r" + s.toString(32) + ":";
    return n.memoizedState = r;
  }, unstable_isNewReconciler: !1 }, Zx = {
    readContext: bt,
    useCallback: Cm,
    useContext: bt,
    useEffect: wu,
    useImperativeHandle: bm,
    useInsertionEffect: Tm,
    useLayoutEffect: km,
    useMemo: Pm,
    useReducer: vu,
    useRef: xm,
    useState: function() {
      return vu(oi);
    },
    useDebugValue: xu,
    useDeferredValue: function(n) {
      var r = Ct();
      return Em(r, $e.memoizedState, n);
    },
    useTransition: function() {
      var n = vu(oi)[0], r = Ct().memoizedState;
      return [n, r];
    },
    useMutableSource: pm,
    useSyncExternalStore: mm,
    useId: Mm,
    unstable_isNewReconciler: !1
  }, Jx = { readContext: bt, useCallback: Cm, useContext: bt, useEffect: wu, useImperativeHandle: bm, useInsertionEffect: Tm, useLayoutEffect: km, useMemo: Pm, useReducer: Su, useRef: xm, useState: function() {
    return Su(oi);
  }, useDebugValue: xu, useDeferredValue: function(n) {
    var r = Ct();
    return $e === null ? r.memoizedState = n : Em(r, $e.memoizedState, n);
  }, useTransition: function() {
    var n = Su(oi)[0], r = Ct().memoizedState;
    return [n, r];
  }, useMutableSource: pm, useSyncExternalStore: mm, useId: Mm, unstable_isNewReconciler: !1 };
  function Lt(n, r) {
    if (n && n.defaultProps) {
      r = X({}, r), n = n.defaultProps;
      for (var s in n) r[s] === void 0 && (r[s] = n[s]);
      return r;
    }
    return r;
  }
  function _u(n, r, s, u) {
    r = n.memoizedState, s = s(u, r), s = s == null ? r : X({}, r, s), n.memoizedState = s, n.lanes === 0 && (n.updateQueue.baseState = s);
  }
  var Rs = { isMounted: function(n) {
    return (n = n._reactInternals) ? tr(n) === n : !1;
  }, enqueueSetState: function(n, r, s) {
    n = n._reactInternals;
    var u = st(), h = Ln(n), v = fn(u, h);
    v.payload = r, s != null && (v.callback = s), r = jn(n, v, h), r !== null && (Bt(r, n, h, u), Ts(r, n, h));
  }, enqueueReplaceState: function(n, r, s) {
    n = n._reactInternals;
    var u = st(), h = Ln(n), v = fn(u, h);
    v.tag = 1, v.payload = r, s != null && (v.callback = s), r = jn(n, v, h), r !== null && (Bt(r, n, h, u), Ts(r, n, h));
  }, enqueueForceUpdate: function(n, r) {
    n = n._reactInternals;
    var s = st(), u = Ln(n), h = fn(s, u);
    h.tag = 2, r != null && (h.callback = r), r = jn(n, h, u), r !== null && (Bt(r, n, u, s), Ts(r, n, u));
  } };
  function jm(n, r, s, u, h, v, k) {
    return n = n.stateNode, typeof n.shouldComponentUpdate == "function" ? n.shouldComponentUpdate(u, v, k) : r.prototype && r.prototype.isPureReactComponent ? !Wo(s, u) || !Wo(h, v) : !0;
  }
  function Im(n, r, s) {
    var u = !1, h = Rn, v = r.contextType;
    return typeof v == "object" && v !== null ? v = bt(v) : (h = ft(r) ? rr : et.current, u = r.contextTypes, v = (u = u != null) ? Hr(n, h) : Rn), r = new r(s, v), n.memoizedState = r.state !== null && r.state !== void 0 ? r.state : null, r.updater = Rs, n.stateNode = r, r._reactInternals = n, u && (n = n.stateNode, n.__reactInternalMemoizedUnmaskedChildContext = h, n.__reactInternalMemoizedMaskedChildContext = v), r;
  }
  function Fm(n, r, s, u) {
    n = r.state, typeof r.componentWillReceiveProps == "function" && r.componentWillReceiveProps(s, u), typeof r.UNSAFE_componentWillReceiveProps == "function" && r.UNSAFE_componentWillReceiveProps(s, u), r.state !== n && Rs.enqueueReplaceState(r, r.state, null);
  }
  function Tu(n, r, s, u) {
    var h = n.stateNode;
    h.props = s, h.state = n.memoizedState, h.refs = {}, uu(n);
    var v = r.contextType;
    typeof v == "object" && v !== null ? h.context = bt(v) : (v = ft(r) ? rr : et.current, h.context = Hr(n, v)), h.state = n.memoizedState, v = r.getDerivedStateFromProps, typeof v == "function" && (_u(n, r, v, s), h.state = n.memoizedState), typeof r.getDerivedStateFromProps == "function" || typeof h.getSnapshotBeforeUpdate == "function" || typeof h.UNSAFE_componentWillMount != "function" && typeof h.componentWillMount != "function" || (r = h.state, typeof h.componentWillMount == "function" && h.componentWillMount(), typeof h.UNSAFE_componentWillMount == "function" && h.UNSAFE_componentWillMount(), r !== h.state && Rs.enqueueReplaceState(h, h.state, null), ks(n, s, h, u), h.state = n.memoizedState), typeof h.componentDidMount == "function" && (n.flags |= 4194308);
  }
  function Jr(n, r) {
    try {
      var s = "", u = r;
      do
        s += ge(u), u = u.return;
      while (u);
      var h = s;
    } catch (v) {
      h = `
Error generating stack: ` + v.message + `
` + v.stack;
    }
    return { value: n, source: r, stack: h, digest: null };
  }
  function ku(n, r, s) {
    return { value: n, source: null, stack: s ?? null, digest: r ?? null };
  }
  function Au(n, r) {
    try {
      console.error(r.value);
    } catch (s) {
      setTimeout(function() {
        throw s;
      });
    }
  }
  var qx = typeof WeakMap == "function" ? WeakMap : Map;
  function Om(n, r, s) {
    s = fn(-1, s), s.tag = 3, s.payload = { element: null };
    var u = r.value;
    return s.callback = function() {
      Ls || (Ls = !0, zu = u), Au(n, r);
    }, s;
  }
  function Lm(n, r, s) {
    s = fn(-1, s), s.tag = 3;
    var u = n.type.getDerivedStateFromError;
    if (typeof u == "function") {
      var h = r.value;
      s.payload = function() {
        return u(h);
      }, s.callback = function() {
        Au(n, r);
      };
    }
    var v = n.stateNode;
    return v !== null && typeof v.componentDidCatch == "function" && (s.callback = function() {
      Au(n, r), typeof u != "function" && (Fn === null ? Fn = /* @__PURE__ */ new Set([this]) : Fn.add(this));
      var k = r.stack;
      this.componentDidCatch(r.value, { componentStack: k !== null ? k : "" });
    }), s;
  }
  function Vm(n, r, s) {
    var u = n.pingCache;
    if (u === null) {
      u = n.pingCache = new qx();
      var h = /* @__PURE__ */ new Set();
      u.set(r, h);
    } else h = u.get(r), h === void 0 && (h = /* @__PURE__ */ new Set(), u.set(r, h));
    h.has(s) || (h.add(s), n = p1.bind(null, n, r, s), r.then(n, n));
  }
  function zm(n) {
    do {
      var r;
      if ((r = n.tag === 13) && (r = n.memoizedState, r = r !== null ? r.dehydrated !== null : !0), r) return n;
      n = n.return;
    } while (n !== null);
    return null;
  }
  function Bm(n, r, s, u, h) {
    return (n.mode & 1) === 0 ? (n === r ? n.flags |= 65536 : (n.flags |= 128, s.flags |= 131072, s.flags &= -52805, s.tag === 1 && (s.alternate === null ? s.tag = 17 : (r = fn(-1, 1), r.tag = 2, jn(s, r, 1))), s.lanes |= 1), n) : (n.flags |= 65536, n.lanes = h, n);
  }
  var e1 = N.ReactCurrentOwner, pt = !1;
  function it(n, r, s, u) {
    r.child = n === null ? am(r, null, s, u) : Yr(r, n.child, s, u);
  }
  function $m(n, r, s, u, h) {
    s = s.render;
    var v = r.ref;
    return Qr(r, h), u = yu(n, r, s, u, v, h), s = gu(), n !== null && !pt ? (r.updateQueue = n.updateQueue, r.flags &= -2053, n.lanes &= ~h, pn(n, r, h)) : (Ne && s && ql(r), r.flags |= 1, it(n, r, u, h), r.child);
  }
  function Um(n, r, s, u, h) {
    if (n === null) {
      var v = s.type;
      return typeof v == "function" && !Ku(v) && v.defaultProps === void 0 && s.compare === null && s.defaultProps === void 0 ? (r.tag = 15, r.type = v, Hm(n, r, v, u, h)) : (n = Hs(s.type, null, u, r, r.mode, h), n.ref = r.ref, n.return = r, r.child = n);
    }
    if (v = n.child, (n.lanes & h) === 0) {
      var k = v.memoizedProps;
      if (s = s.compare, s = s !== null ? s : Wo, s(k, u) && n.ref === r.ref) return pn(n, r, h);
    }
    return r.flags |= 1, n = zn(v, u), n.ref = r.ref, n.return = r, r.child = n;
  }
  function Hm(n, r, s, u, h) {
    if (n !== null) {
      var v = n.memoizedProps;
      if (Wo(v, u) && n.ref === r.ref) if (pt = !1, r.pendingProps = u = v, (n.lanes & h) !== 0) (n.flags & 131072) !== 0 && (pt = !0);
      else return r.lanes = n.lanes, pn(n, r, h);
    }
    return bu(n, r, s, u, h);
  }
  function Wm(n, r, s) {
    var u = r.pendingProps, h = u.children, v = n !== null ? n.memoizedState : null;
    if (u.mode === "hidden") if ((r.mode & 1) === 0) r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, Ee(eo, _t), _t |= s;
    else {
      if ((s & 1073741824) === 0) return n = v !== null ? v.baseLanes | s : s, r.lanes = r.childLanes = 1073741824, r.memoizedState = { baseLanes: n, cachePool: null, transitions: null }, r.updateQueue = null, Ee(eo, _t), _t |= n, null;
      r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, u = v !== null ? v.baseLanes : s, Ee(eo, _t), _t |= u;
    }
    else v !== null ? (u = v.baseLanes | s, r.memoizedState = null) : u = s, Ee(eo, _t), _t |= u;
    return it(n, r, h, s), r.child;
  }
  function Gm(n, r) {
    var s = r.ref;
    (n === null && s !== null || n !== null && n.ref !== s) && (r.flags |= 512, r.flags |= 2097152);
  }
  function bu(n, r, s, u, h) {
    var v = ft(s) ? rr : et.current;
    return v = Hr(r, v), Qr(r, h), s = yu(n, r, s, u, v, h), u = gu(), n !== null && !pt ? (r.updateQueue = n.updateQueue, r.flags &= -2053, n.lanes &= ~h, pn(n, r, h)) : (Ne && u && ql(r), r.flags |= 1, it(n, r, s, h), r.child);
  }
  function Km(n, r, s, u, h) {
    if (ft(s)) {
      var v = !0;
      hs(r);
    } else v = !1;
    if (Qr(r, h), r.stateNode === null) Ns(n, r), Im(r, s, u), Tu(r, s, u, h), u = !0;
    else if (n === null) {
      var k = r.stateNode, P = r.memoizedProps;
      k.props = P;
      var M = k.context, F = s.contextType;
      typeof F == "object" && F !== null ? F = bt(F) : (F = ft(s) ? rr : et.current, F = Hr(r, F));
      var $ = s.getDerivedStateFromProps, U = typeof $ == "function" || typeof k.getSnapshotBeforeUpdate == "function";
      U || typeof k.UNSAFE_componentWillReceiveProps != "function" && typeof k.componentWillReceiveProps != "function" || (P !== u || M !== F) && Fm(r, k, u, F), Nn = !1;
      var B = r.memoizedState;
      k.state = B, ks(r, u, k, h), M = r.memoizedState, P !== u || B !== M || dt.current || Nn ? (typeof $ == "function" && (_u(r, s, $, u), M = r.memoizedState), (P = Nn || jm(r, s, P, u, B, M, F)) ? (U || typeof k.UNSAFE_componentWillMount != "function" && typeof k.componentWillMount != "function" || (typeof k.componentWillMount == "function" && k.componentWillMount(), typeof k.UNSAFE_componentWillMount == "function" && k.UNSAFE_componentWillMount()), typeof k.componentDidMount == "function" && (r.flags |= 4194308)) : (typeof k.componentDidMount == "function" && (r.flags |= 4194308), r.memoizedProps = u, r.memoizedState = M), k.props = u, k.state = M, k.context = F, u = P) : (typeof k.componentDidMount == "function" && (r.flags |= 4194308), u = !1);
    } else {
      k = r.stateNode, um(n, r), P = r.memoizedProps, F = r.type === r.elementType ? P : Lt(r.type, P), k.props = F, U = r.pendingProps, B = k.context, M = s.contextType, typeof M == "object" && M !== null ? M = bt(M) : (M = ft(s) ? rr : et.current, M = Hr(r, M));
      var q = s.getDerivedStateFromProps;
      ($ = typeof q == "function" || typeof k.getSnapshotBeforeUpdate == "function") || typeof k.UNSAFE_componentWillReceiveProps != "function" && typeof k.componentWillReceiveProps != "function" || (P !== U || B !== M) && Fm(r, k, u, M), Nn = !1, B = r.memoizedState, k.state = B, ks(r, u, k, h);
      var te = r.memoizedState;
      P !== U || B !== te || dt.current || Nn ? (typeof q == "function" && (_u(r, s, q, u), te = r.memoizedState), (F = Nn || jm(r, s, F, u, B, te, M) || !1) ? ($ || typeof k.UNSAFE_componentWillUpdate != "function" && typeof k.componentWillUpdate != "function" || (typeof k.componentWillUpdate == "function" && k.componentWillUpdate(u, te, M), typeof k.UNSAFE_componentWillUpdate == "function" && k.UNSAFE_componentWillUpdate(u, te, M)), typeof k.componentDidUpdate == "function" && (r.flags |= 4), typeof k.getSnapshotBeforeUpdate == "function" && (r.flags |= 1024)) : (typeof k.componentDidUpdate != "function" || P === n.memoizedProps && B === n.memoizedState || (r.flags |= 4), typeof k.getSnapshotBeforeUpdate != "function" || P === n.memoizedProps && B === n.memoizedState || (r.flags |= 1024), r.memoizedProps = u, r.memoizedState = te), k.props = u, k.state = te, k.context = M, u = F) : (typeof k.componentDidUpdate != "function" || P === n.memoizedProps && B === n.memoizedState || (r.flags |= 4), typeof k.getSnapshotBeforeUpdate != "function" || P === n.memoizedProps && B === n.memoizedState || (r.flags |= 1024), u = !1);
    }
    return Cu(n, r, s, u, v, h);
  }
  function Cu(n, r, s, u, h, v) {
    Gm(n, r);
    var k = (r.flags & 128) !== 0;
    if (!u && !k) return h && Jp(r, s, !1), pn(n, r, v);
    u = r.stateNode, e1.current = r;
    var P = k && typeof s.getDerivedStateFromError != "function" ? null : u.render();
    return r.flags |= 1, n !== null && k ? (r.child = Yr(r, n.child, null, v), r.child = Yr(r, null, P, v)) : it(n, r, P, v), r.memoizedState = u.state, h && Jp(r, s, !0), r.child;
  }
  function Ym(n) {
    var r = n.stateNode;
    r.pendingContext ? Qp(n, r.pendingContext, r.pendingContext !== r.context) : r.context && Qp(n, r.context, !1), cu(n, r.containerInfo);
  }
  function Xm(n, r, s, u, h) {
    return Kr(), ru(h), r.flags |= 256, it(n, r, s, u), r.child;
  }
  var Pu = { dehydrated: null, treeContext: null, retryLane: 0 };
  function Eu(n) {
    return { baseLanes: n, cachePool: null, transitions: null };
  }
  function Qm(n, r, s) {
    var u = r.pendingProps, h = je.current, v = !1, k = (r.flags & 128) !== 0, P;
    if ((P = k) || (P = n !== null && n.memoizedState === null ? !1 : (h & 2) !== 0), P ? (v = !0, r.flags &= -129) : (n === null || n.memoizedState !== null) && (h |= 1), Ee(je, h & 1), n === null)
      return nu(r), n = r.memoizedState, n !== null && (n = n.dehydrated, n !== null) ? ((r.mode & 1) === 0 ? r.lanes = 1 : n.data === "$!" ? r.lanes = 8 : r.lanes = 1073741824, null) : (k = u.children, n = u.fallback, v ? (u = r.mode, v = r.child, k = { mode: "hidden", children: k }, (u & 1) === 0 && v !== null ? (v.childLanes = 0, v.pendingProps = k) : v = Ws(k, u, 0, null), n = pr(n, u, s, null), v.return = r, n.return = r, v.sibling = n, r.child = v, r.child.memoizedState = Eu(s), r.memoizedState = Pu, n) : Mu(r, k));
    if (h = n.memoizedState, h !== null && (P = h.dehydrated, P !== null)) return t1(n, r, k, u, P, h, s);
    if (v) {
      v = u.fallback, k = r.mode, h = n.child, P = h.sibling;
      var M = { mode: "hidden", children: u.children };
      return (k & 1) === 0 && r.child !== h ? (u = r.child, u.childLanes = 0, u.pendingProps = M, r.deletions = null) : (u = zn(h, M), u.subtreeFlags = h.subtreeFlags & 14680064), P !== null ? v = zn(P, v) : (v = pr(v, k, s, null), v.flags |= 2), v.return = r, u.return = r, u.sibling = v, r.child = u, u = v, v = r.child, k = n.child.memoizedState, k = k === null ? Eu(s) : { baseLanes: k.baseLanes | s, cachePool: null, transitions: k.transitions }, v.memoizedState = k, v.childLanes = n.childLanes & ~s, r.memoizedState = Pu, u;
    }
    return v = n.child, n = v.sibling, u = zn(v, { mode: "visible", children: u.children }), (r.mode & 1) === 0 && (u.lanes = s), u.return = r, u.sibling = null, n !== null && (s = r.deletions, s === null ? (r.deletions = [n], r.flags |= 16) : s.push(n)), r.child = u, r.memoizedState = null, u;
  }
  function Mu(n, r) {
    return r = Ws({ mode: "visible", children: r }, n.mode, 0, null), r.return = n, n.child = r;
  }
  function Ds(n, r, s, u) {
    return u !== null && ru(u), Yr(r, n.child, null, s), n = Mu(r, r.pendingProps.children), n.flags |= 2, r.memoizedState = null, n;
  }
  function t1(n, r, s, u, h, v, k) {
    if (s)
      return r.flags & 256 ? (r.flags &= -257, u = ku(Error(o(422))), Ds(n, r, k, u)) : r.memoizedState !== null ? (r.child = n.child, r.flags |= 128, null) : (v = u.fallback, h = r.mode, u = Ws({ mode: "visible", children: u.children }, h, 0, null), v = pr(v, h, k, null), v.flags |= 2, u.return = r, v.return = r, u.sibling = v, r.child = u, (r.mode & 1) !== 0 && Yr(r, n.child, null, k), r.child.memoizedState = Eu(k), r.memoizedState = Pu, v);
    if ((r.mode & 1) === 0) return Ds(n, r, k, null);
    if (h.data === "$!") {
      if (u = h.nextSibling && h.nextSibling.dataset, u) var P = u.dgst;
      return u = P, v = Error(o(419)), u = ku(v, u, void 0), Ds(n, r, k, u);
    }
    if (P = (k & n.childLanes) !== 0, pt || P) {
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
        h = (h & (u.suspendedLanes | k)) !== 0 ? 0 : h, h !== 0 && h !== v.retryLane && (v.retryLane = h, dn(n, h), Bt(u, n, h, -1));
      }
      return Gu(), u = ku(Error(o(421))), Ds(n, r, k, u);
    }
    return h.data === "$?" ? (r.flags |= 128, r.child = n.child, r = m1.bind(null, n), h._reactRetry = r, null) : (n = v.treeContext, xt = En(h.nextSibling), wt = r, Ne = !0, Ot = null, n !== null && (kt[At++] = un, kt[At++] = cn, kt[At++] = or, un = n.id, cn = n.overflow, or = r), r = Mu(r, u.children), r.flags |= 4096, r);
  }
  function Zm(n, r, s) {
    n.lanes |= r;
    var u = n.alternate;
    u !== null && (u.lanes |= r), au(n.return, r, s);
  }
  function Ru(n, r, s, u, h) {
    var v = n.memoizedState;
    v === null ? n.memoizedState = { isBackwards: r, rendering: null, renderingStartTime: 0, last: u, tail: s, tailMode: h } : (v.isBackwards = r, v.rendering = null, v.renderingStartTime = 0, v.last = u, v.tail = s, v.tailMode = h);
  }
  function Jm(n, r, s) {
    var u = r.pendingProps, h = u.revealOrder, v = u.tail;
    if (it(n, r, u.children, s), u = je.current, (u & 2) !== 0) u = u & 1 | 2, r.flags |= 128;
    else {
      if (n !== null && (n.flags & 128) !== 0) e: for (n = r.child; n !== null; ) {
        if (n.tag === 13) n.memoizedState !== null && Zm(n, s, r);
        else if (n.tag === 19) Zm(n, s, r);
        else if (n.child !== null) {
          n.child.return = n, n = n.child;
          continue;
        }
        if (n === r) break e;
        for (; n.sibling === null; ) {
          if (n.return === null || n.return === r) break e;
          n = n.return;
        }
        n.sibling.return = n.return, n = n.sibling;
      }
      u &= 1;
    }
    if (Ee(je, u), (r.mode & 1) === 0) r.memoizedState = null;
    else switch (h) {
      case "forwards":
        for (s = r.child, h = null; s !== null; ) n = s.alternate, n !== null && As(n) === null && (h = s), s = s.sibling;
        s = h, s === null ? (h = r.child, r.child = null) : (h = s.sibling, s.sibling = null), Ru(r, !1, h, s, v);
        break;
      case "backwards":
        for (s = null, h = r.child, r.child = null; h !== null; ) {
          if (n = h.alternate, n !== null && As(n) === null) {
            r.child = h;
            break;
          }
          n = h.sibling, h.sibling = s, s = h, h = n;
        }
        Ru(r, !0, s, null, v);
        break;
      case "together":
        Ru(r, !1, null, null, void 0);
        break;
      default:
        r.memoizedState = null;
    }
    return r.child;
  }
  function Ns(n, r) {
    (r.mode & 1) === 0 && n !== null && (n.alternate = null, r.alternate = null, r.flags |= 2);
  }
  function pn(n, r, s) {
    if (n !== null && (r.dependencies = n.dependencies), ur |= r.lanes, (s & r.childLanes) === 0) return null;
    if (n !== null && r.child !== n.child) throw Error(o(153));
    if (r.child !== null) {
      for (n = r.child, s = zn(n, n.pendingProps), r.child = s, s.return = r; n.sibling !== null; ) n = n.sibling, s = s.sibling = zn(n, n.pendingProps), s.return = r;
      s.sibling = null;
    }
    return r.child;
  }
  function n1(n, r, s) {
    switch (r.tag) {
      case 3:
        Ym(r), Kr();
        break;
      case 5:
        fm(r);
        break;
      case 1:
        ft(r.type) && hs(r);
        break;
      case 4:
        cu(r, r.stateNode.containerInfo);
        break;
      case 10:
        var u = r.type._context, h = r.memoizedProps.value;
        Ee(xs, u._currentValue), u._currentValue = h;
        break;
      case 13:
        if (u = r.memoizedState, u !== null)
          return u.dehydrated !== null ? (Ee(je, je.current & 1), r.flags |= 128, null) : (s & r.child.childLanes) !== 0 ? Qm(n, r, s) : (Ee(je, je.current & 1), n = pn(n, r, s), n !== null ? n.sibling : null);
        Ee(je, je.current & 1);
        break;
      case 19:
        if (u = (s & r.childLanes) !== 0, (n.flags & 128) !== 0) {
          if (u) return Jm(n, r, s);
          r.flags |= 128;
        }
        if (h = r.memoizedState, h !== null && (h.rendering = null, h.tail = null, h.lastEffect = null), Ee(je, je.current), u) break;
        return null;
      case 22:
      case 23:
        return r.lanes = 0, Wm(n, r, s);
    }
    return pn(n, r, s);
  }
  var qm, Du, eh, th;
  qm = function(n, r) {
    for (var s = r.child; s !== null; ) {
      if (s.tag === 5 || s.tag === 6) n.appendChild(s.stateNode);
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
  }, Du = function() {
  }, eh = function(n, r, s, u) {
    var h = n.memoizedProps;
    if (h !== u) {
      n = r.stateNode, ar(Qt.current);
      var v = null;
      switch (s) {
        case "input":
          h = al(n, h), u = al(n, u), v = [];
          break;
        case "select":
          h = X({}, h, { value: void 0 }), u = X({}, u, { value: void 0 }), v = [];
          break;
        case "textarea":
          h = cl(n, h), u = cl(n, u), v = [];
          break;
        default:
          typeof h.onClick != "function" && typeof u.onClick == "function" && (n.onclick = fs);
      }
      fl(s, u);
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
        else F === "dangerouslySetInnerHTML" ? (M = M ? M.__html : void 0, P = P ? P.__html : void 0, M != null && P !== M && (v = v || []).push(F, M)) : F === "children" ? typeof M != "string" && typeof M != "number" || (v = v || []).push(F, "" + M) : F !== "suppressContentEditableWarning" && F !== "suppressHydrationWarning" && (a.hasOwnProperty(F) ? (M != null && F === "onScroll" && Me("scroll", n), v || P === M || (v = [])) : (v = v || []).push(F, M));
      }
      s && (v = v || []).push("style", s);
      var F = v;
      (r.updateQueue = F) && (r.flags |= 4);
    }
  }, th = function(n, r, s, u) {
    s !== u && (r.flags |= 4);
  };
  function si(n, r) {
    if (!Ne) switch (n.tailMode) {
      case "hidden":
        r = n.tail;
        for (var s = null; r !== null; ) r.alternate !== null && (s = r), r = r.sibling;
        s === null ? n.tail = null : s.sibling = null;
        break;
      case "collapsed":
        s = n.tail;
        for (var u = null; s !== null; ) s.alternate !== null && (u = s), s = s.sibling;
        u === null ? r || n.tail === null ? n.tail = null : n.tail.sibling = null : u.sibling = null;
    }
  }
  function nt(n) {
    var r = n.alternate !== null && n.alternate.child === n.child, s = 0, u = 0;
    if (r) for (var h = n.child; h !== null; ) s |= h.lanes | h.childLanes, u |= h.subtreeFlags & 14680064, u |= h.flags & 14680064, h.return = n, h = h.sibling;
    else for (h = n.child; h !== null; ) s |= h.lanes | h.childLanes, u |= h.subtreeFlags, u |= h.flags, h.return = n, h = h.sibling;
    return n.subtreeFlags |= u, n.childLanes = s, r;
  }
  function r1(n, r, s) {
    var u = r.pendingProps;
    switch (eu(r), r.tag) {
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
        return ft(r.type) && ms(), nt(r), null;
      case 3:
        return u = r.stateNode, Zr(), Re(dt), Re(et), pu(), u.pendingContext && (u.context = u.pendingContext, u.pendingContext = null), (n === null || n.child === null) && (Ss(r) ? r.flags |= 4 : n === null || n.memoizedState.isDehydrated && (r.flags & 256) === 0 || (r.flags |= 1024, Ot !== null && (Uu(Ot), Ot = null))), Du(n, r), nt(r), null;
      case 5:
        du(r);
        var h = ar(ti.current);
        if (s = r.type, n !== null && r.stateNode != null) eh(n, r, s, u, h), n.ref !== r.ref && (r.flags |= 512, r.flags |= 2097152);
        else {
          if (!u) {
            if (r.stateNode === null) throw Error(o(166));
            return nt(r), null;
          }
          if (n = ar(Qt.current), Ss(r)) {
            u = r.stateNode, s = r.type;
            var v = r.memoizedProps;
            switch (u[Xt] = r, u[Qo] = v, n = (r.mode & 1) !== 0, s) {
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
                for (h = 0; h < Ko.length; h++) Me(Ko[h], u);
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
                If(u, v), Me("invalid", u);
                break;
              case "select":
                u._wrapperState = { wasMultiple: !!v.multiple }, Me("invalid", u);
                break;
              case "textarea":
                Lf(u, v), Me("invalid", u);
            }
            fl(s, v), h = null;
            for (var k in v) if (v.hasOwnProperty(k)) {
              var P = v[k];
              k === "children" ? typeof P == "string" ? u.textContent !== P && (v.suppressHydrationWarning !== !0 && ds(u.textContent, P, n), h = ["children", P]) : typeof P == "number" && u.textContent !== "" + P && (v.suppressHydrationWarning !== !0 && ds(
                u.textContent,
                P,
                n
              ), h = ["children", "" + P]) : a.hasOwnProperty(k) && P != null && k === "onScroll" && Me("scroll", u);
            }
            switch (s) {
              case "input":
                $i(u), Of(u, v, !0);
                break;
              case "textarea":
                $i(u), zf(u);
                break;
              case "select":
              case "option":
                break;
              default:
                typeof v.onClick == "function" && (u.onclick = fs);
            }
            u = h, r.updateQueue = u, u !== null && (r.flags |= 4);
          } else {
            k = h.nodeType === 9 ? h : h.ownerDocument, n === "http://www.w3.org/1999/xhtml" && (n = Bf(s)), n === "http://www.w3.org/1999/xhtml" ? s === "script" ? (n = k.createElement("div"), n.innerHTML = "<script><\/script>", n = n.removeChild(n.firstChild)) : typeof u.is == "string" ? n = k.createElement(s, { is: u.is }) : (n = k.createElement(s), s === "select" && (k = n, u.multiple ? k.multiple = !0 : u.size && (k.size = u.size))) : n = k.createElementNS(n, s), n[Xt] = r, n[Qo] = u, qm(n, r, !1, !1), r.stateNode = n;
            e: {
              switch (k = pl(s, u), s) {
                case "dialog":
                  Me("cancel", n), Me("close", n), h = u;
                  break;
                case "iframe":
                case "object":
                case "embed":
                  Me("load", n), h = u;
                  break;
                case "video":
                case "audio":
                  for (h = 0; h < Ko.length; h++) Me(Ko[h], n);
                  h = u;
                  break;
                case "source":
                  Me("error", n), h = u;
                  break;
                case "img":
                case "image":
                case "link":
                  Me(
                    "error",
                    n
                  ), Me("load", n), h = u;
                  break;
                case "details":
                  Me("toggle", n), h = u;
                  break;
                case "input":
                  If(n, u), h = al(n, u), Me("invalid", n);
                  break;
                case "option":
                  h = u;
                  break;
                case "select":
                  n._wrapperState = { wasMultiple: !!u.multiple }, h = X({}, u, { value: void 0 }), Me("invalid", n);
                  break;
                case "textarea":
                  Lf(n, u), h = cl(n, u), Me("invalid", n);
                  break;
                default:
                  h = u;
              }
              fl(s, h), P = h;
              for (v in P) if (P.hasOwnProperty(v)) {
                var M = P[v];
                v === "style" ? Hf(n, M) : v === "dangerouslySetInnerHTML" ? (M = M ? M.__html : void 0, M != null && $f(n, M)) : v === "children" ? typeof M == "string" ? (s !== "textarea" || M !== "") && Po(n, M) : typeof M == "number" && Po(n, "" + M) : v !== "suppressContentEditableWarning" && v !== "suppressHydrationWarning" && v !== "autoFocus" && (a.hasOwnProperty(v) ? M != null && v === "onScroll" && Me("scroll", n) : M != null && E(n, v, M, k));
              }
              switch (s) {
                case "input":
                  $i(n), Of(n, u, !1);
                  break;
                case "textarea":
                  $i(n), zf(n);
                  break;
                case "option":
                  u.value != null && n.setAttribute("value", "" + xe(u.value));
                  break;
                case "select":
                  n.multiple = !!u.multiple, v = u.value, v != null ? Dr(n, !!u.multiple, v, !1) : u.defaultValue != null && Dr(
                    n,
                    !!u.multiple,
                    u.defaultValue,
                    !0
                  );
                  break;
                default:
                  typeof h.onClick == "function" && (n.onclick = fs);
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
        if (n && r.stateNode != null) th(n, r, n.memoizedProps, u);
        else {
          if (typeof u != "string" && r.stateNode === null) throw Error(o(166));
          if (s = ar(ti.current), ar(Qt.current), Ss(r)) {
            if (u = r.stateNode, s = r.memoizedProps, u[Xt] = r, (v = u.nodeValue !== s) && (n = wt, n !== null)) switch (n.tag) {
              case 3:
                ds(u.nodeValue, s, (n.mode & 1) !== 0);
                break;
              case 5:
                n.memoizedProps.suppressHydrationWarning !== !0 && ds(u.nodeValue, s, (n.mode & 1) !== 0);
            }
            v && (r.flags |= 4);
          } else u = (s.nodeType === 9 ? s : s.ownerDocument).createTextNode(u), u[Xt] = r, r.stateNode = u;
        }
        return nt(r), null;
      case 13:
        if (Re(je), u = r.memoizedState, n === null || n.memoizedState !== null && n.memoizedState.dehydrated !== null) {
          if (Ne && xt !== null && (r.mode & 1) !== 0 && (r.flags & 128) === 0) om(), Kr(), r.flags |= 98560, v = !1;
          else if (v = Ss(r), u !== null && u.dehydrated !== null) {
            if (n === null) {
              if (!v) throw Error(o(318));
              if (v = r.memoizedState, v = v !== null ? v.dehydrated : null, !v) throw Error(o(317));
              v[Xt] = r;
            } else Kr(), (r.flags & 128) === 0 && (r.memoizedState = null), r.flags |= 4;
            nt(r), v = !1;
          } else Ot !== null && (Uu(Ot), Ot = null), v = !0;
          if (!v) return r.flags & 65536 ? r : null;
        }
        return (r.flags & 128) !== 0 ? (r.lanes = s, r) : (u = u !== null, u !== (n !== null && n.memoizedState !== null) && u && (r.child.flags |= 8192, (r.mode & 1) !== 0 && (n === null || (je.current & 1) !== 0 ? Ue === 0 && (Ue = 3) : Gu())), r.updateQueue !== null && (r.flags |= 4), nt(r), null);
      case 4:
        return Zr(), Du(n, r), n === null && Yo(r.stateNode.containerInfo), nt(r), null;
      case 10:
        return su(r.type._context), nt(r), null;
      case 17:
        return ft(r.type) && ms(), nt(r), null;
      case 19:
        if (Re(je), v = r.memoizedState, v === null) return nt(r), null;
        if (u = (r.flags & 128) !== 0, k = v.rendering, k === null) if (u) si(v, !1);
        else {
          if (Ue !== 0 || n !== null && (n.flags & 128) !== 0) for (n = r.child; n !== null; ) {
            if (k = As(n), k !== null) {
              for (r.flags |= 128, si(v, !1), u = k.updateQueue, u !== null && (r.updateQueue = u, r.flags |= 4), r.subtreeFlags = 0, u = s, s = r.child; s !== null; ) v = s, n = u, v.flags &= 14680066, k = v.alternate, k === null ? (v.childLanes = 0, v.lanes = n, v.child = null, v.subtreeFlags = 0, v.memoizedProps = null, v.memoizedState = null, v.updateQueue = null, v.dependencies = null, v.stateNode = null) : (v.childLanes = k.childLanes, v.lanes = k.lanes, v.child = k.child, v.subtreeFlags = 0, v.deletions = null, v.memoizedProps = k.memoizedProps, v.memoizedState = k.memoizedState, v.updateQueue = k.updateQueue, v.type = k.type, n = k.dependencies, v.dependencies = n === null ? null : { lanes: n.lanes, firstContext: n.firstContext }), s = s.sibling;
              return Ee(je, je.current & 1 | 2), r.child;
            }
            n = n.sibling;
          }
          v.tail !== null && Le() > to && (r.flags |= 128, u = !0, si(v, !1), r.lanes = 4194304);
        }
        else {
          if (!u) if (n = As(k), n !== null) {
            if (r.flags |= 128, u = !0, s = n.updateQueue, s !== null && (r.updateQueue = s, r.flags |= 4), si(v, !0), v.tail === null && v.tailMode === "hidden" && !k.alternate && !Ne) return nt(r), null;
          } else 2 * Le() - v.renderingStartTime > to && s !== 1073741824 && (r.flags |= 128, u = !0, si(v, !1), r.lanes = 4194304);
          v.isBackwards ? (k.sibling = r.child, r.child = k) : (s = v.last, s !== null ? s.sibling = k : r.child = k, v.last = k);
        }
        return v.tail !== null ? (r = v.tail, v.rendering = r, v.tail = r.sibling, v.renderingStartTime = Le(), r.sibling = null, s = je.current, Ee(je, u ? s & 1 | 2 : s & 1), r) : (nt(r), null);
      case 22:
      case 23:
        return Wu(), u = r.memoizedState !== null, n !== null && n.memoizedState !== null !== u && (r.flags |= 8192), u && (r.mode & 1) !== 0 ? (_t & 1073741824) !== 0 && (nt(r), r.subtreeFlags & 6 && (r.flags |= 8192)) : nt(r), null;
      case 24:
        return null;
      case 25:
        return null;
    }
    throw Error(o(156, r.tag));
  }
  function o1(n, r) {
    switch (eu(r), r.tag) {
      case 1:
        return ft(r.type) && ms(), n = r.flags, n & 65536 ? (r.flags = n & -65537 | 128, r) : null;
      case 3:
        return Zr(), Re(dt), Re(et), pu(), n = r.flags, (n & 65536) !== 0 && (n & 128) === 0 ? (r.flags = n & -65537 | 128, r) : null;
      case 5:
        return du(r), null;
      case 13:
        if (Re(je), n = r.memoizedState, n !== null && n.dehydrated !== null) {
          if (r.alternate === null) throw Error(o(340));
          Kr();
        }
        return n = r.flags, n & 65536 ? (r.flags = n & -65537 | 128, r) : null;
      case 19:
        return Re(je), null;
      case 4:
        return Zr(), null;
      case 10:
        return su(r.type._context), null;
      case 22:
      case 23:
        return Wu(), null;
      case 24:
        return null;
      default:
        return null;
    }
  }
  var js = !1, rt = !1, i1 = typeof WeakSet == "function" ? WeakSet : Set, ee = null;
  function qr(n, r) {
    var s = n.ref;
    if (s !== null) if (typeof s == "function") try {
      s(null);
    } catch (u) {
      Oe(n, r, u);
    }
    else s.current = null;
  }
  function Nu(n, r, s) {
    try {
      s();
    } catch (u) {
      Oe(n, r, u);
    }
  }
  var nh = !1;
  function s1(n, r) {
    if (Wl = es, n = jp(), Ol(n)) {
      if ("selectionStart" in n) var s = { start: n.selectionStart, end: n.selectionEnd };
      else e: {
        s = (s = n.ownerDocument) && s.defaultView || window;
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
          var k = 0, P = -1, M = -1, F = 0, $ = 0, U = n, B = null;
          t: for (; ; ) {
            for (var q; U !== s || h !== 0 && U.nodeType !== 3 || (P = k + h), U !== v || u !== 0 && U.nodeType !== 3 || (M = k + u), U.nodeType === 3 && (k += U.nodeValue.length), (q = U.firstChild) !== null; )
              B = U, U = q;
            for (; ; ) {
              if (U === n) break t;
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
    for (Gl = { focusedElem: n, selectionRange: s }, es = !1, ee = r; ee !== null; ) if (r = ee, n = r.child, (r.subtreeFlags & 1028) !== 0 && n !== null) n.return = r, ee = n;
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
      } catch (G) {
        Oe(r, r.return, G);
      }
      if (n = r.sibling, n !== null) {
        n.return = r.return, ee = n;
        break;
      }
      ee = r.return;
    }
    return te = nh, nh = !1, te;
  }
  function ai(n, r, s) {
    var u = r.updateQueue;
    if (u = u !== null ? u.lastEffect : null, u !== null) {
      var h = u = u.next;
      do {
        if ((h.tag & n) === n) {
          var v = h.destroy;
          h.destroy = void 0, v !== void 0 && Nu(r, s, v);
        }
        h = h.next;
      } while (h !== u);
    }
  }
  function Is(n, r) {
    if (r = r.updateQueue, r = r !== null ? r.lastEffect : null, r !== null) {
      var s = r = r.next;
      do {
        if ((s.tag & n) === n) {
          var u = s.create;
          s.destroy = u();
        }
        s = s.next;
      } while (s !== r);
    }
  }
  function ju(n) {
    var r = n.ref;
    if (r !== null) {
      var s = n.stateNode;
      switch (n.tag) {
        case 5:
          n = s;
          break;
        default:
          n = s;
      }
      typeof r == "function" ? r(n) : r.current = n;
    }
  }
  function rh(n) {
    var r = n.alternate;
    r !== null && (n.alternate = null, rh(r)), n.child = null, n.deletions = null, n.sibling = null, n.tag === 5 && (r = n.stateNode, r !== null && (delete r[Xt], delete r[Qo], delete r[Ql], delete r[$x], delete r[Ux])), n.stateNode = null, n.return = null, n.dependencies = null, n.memoizedProps = null, n.memoizedState = null, n.pendingProps = null, n.stateNode = null, n.updateQueue = null;
  }
  function oh(n) {
    return n.tag === 5 || n.tag === 3 || n.tag === 4;
  }
  function ih(n) {
    e: for (; ; ) {
      for (; n.sibling === null; ) {
        if (n.return === null || oh(n.return)) return null;
        n = n.return;
      }
      for (n.sibling.return = n.return, n = n.sibling; n.tag !== 5 && n.tag !== 6 && n.tag !== 18; ) {
        if (n.flags & 2 || n.child === null || n.tag === 4) continue e;
        n.child.return = n, n = n.child;
      }
      if (!(n.flags & 2)) return n.stateNode;
    }
  }
  function Iu(n, r, s) {
    var u = n.tag;
    if (u === 5 || u === 6) n = n.stateNode, r ? s.nodeType === 8 ? s.parentNode.insertBefore(n, r) : s.insertBefore(n, r) : (s.nodeType === 8 ? (r = s.parentNode, r.insertBefore(n, s)) : (r = s, r.appendChild(n)), s = s._reactRootContainer, s != null || r.onclick !== null || (r.onclick = fs));
    else if (u !== 4 && (n = n.child, n !== null)) for (Iu(n, r, s), n = n.sibling; n !== null; ) Iu(n, r, s), n = n.sibling;
  }
  function Fu(n, r, s) {
    var u = n.tag;
    if (u === 5 || u === 6) n = n.stateNode, r ? s.insertBefore(n, r) : s.appendChild(n);
    else if (u !== 4 && (n = n.child, n !== null)) for (Fu(n, r, s), n = n.sibling; n !== null; ) Fu(n, r, s), n = n.sibling;
  }
  var Ze = null, Vt = !1;
  function In(n, r, s) {
    for (s = s.child; s !== null; ) sh(n, r, s), s = s.sibling;
  }
  function sh(n, r, s) {
    if (Yt && typeof Yt.onCommitFiberUnmount == "function") try {
      Yt.onCommitFiberUnmount(Yi, s);
    } catch {
    }
    switch (s.tag) {
      case 5:
        rt || qr(s, r);
      case 6:
        var u = Ze, h = Vt;
        Ze = null, In(n, r, s), Ze = u, Vt = h, Ze !== null && (Vt ? (n = Ze, s = s.stateNode, n.nodeType === 8 ? n.parentNode.removeChild(s) : n.removeChild(s)) : Ze.removeChild(s.stateNode));
        break;
      case 18:
        Ze !== null && (Vt ? (n = Ze, s = s.stateNode, n.nodeType === 8 ? Xl(n.parentNode, s) : n.nodeType === 1 && Xl(n, s), Vo(n)) : Xl(Ze, s.stateNode));
        break;
      case 4:
        u = Ze, h = Vt, Ze = s.stateNode.containerInfo, Vt = !0, In(n, r, s), Ze = u, Vt = h;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        if (!rt && (u = s.updateQueue, u !== null && (u = u.lastEffect, u !== null))) {
          h = u = u.next;
          do {
            var v = h, k = v.destroy;
            v = v.tag, k !== void 0 && ((v & 2) !== 0 || (v & 4) !== 0) && Nu(s, r, k), h = h.next;
          } while (h !== u);
        }
        In(n, r, s);
        break;
      case 1:
        if (!rt && (qr(s, r), u = s.stateNode, typeof u.componentWillUnmount == "function")) try {
          u.props = s.memoizedProps, u.state = s.memoizedState, u.componentWillUnmount();
        } catch (P) {
          Oe(s, r, P);
        }
        In(n, r, s);
        break;
      case 21:
        In(n, r, s);
        break;
      case 22:
        s.mode & 1 ? (rt = (u = rt) || s.memoizedState !== null, In(n, r, s), rt = u) : In(n, r, s);
        break;
      default:
        In(n, r, s);
    }
  }
  function ah(n) {
    var r = n.updateQueue;
    if (r !== null) {
      n.updateQueue = null;
      var s = n.stateNode;
      s === null && (s = n.stateNode = new i1()), r.forEach(function(u) {
        var h = h1.bind(null, n, u);
        s.has(u) || (s.add(u), u.then(h, h));
      });
    }
  }
  function zt(n, r) {
    var s = r.deletions;
    if (s !== null) for (var u = 0; u < s.length; u++) {
      var h = s[u];
      try {
        var v = n, k = r, P = k;
        e: for (; P !== null; ) {
          switch (P.tag) {
            case 5:
              Ze = P.stateNode, Vt = !1;
              break e;
            case 3:
              Ze = P.stateNode.containerInfo, Vt = !0;
              break e;
            case 4:
              Ze = P.stateNode.containerInfo, Vt = !0;
              break e;
          }
          P = P.return;
        }
        if (Ze === null) throw Error(o(160));
        sh(v, k, h), Ze = null, Vt = !1;
        var M = h.alternate;
        M !== null && (M.return = null), h.return = null;
      } catch (F) {
        Oe(h, r, F);
      }
    }
    if (r.subtreeFlags & 12854) for (r = r.child; r !== null; ) lh(r, n), r = r.sibling;
  }
  function lh(n, r) {
    var s = n.alternate, u = n.flags;
    switch (n.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (zt(r, n), Jt(n), u & 4) {
          try {
            ai(3, n, n.return), Is(3, n);
          } catch (re) {
            Oe(n, n.return, re);
          }
          try {
            ai(5, n, n.return);
          } catch (re) {
            Oe(n, n.return, re);
          }
        }
        break;
      case 1:
        zt(r, n), Jt(n), u & 512 && s !== null && qr(s, s.return);
        break;
      case 5:
        if (zt(r, n), Jt(n), u & 512 && s !== null && qr(s, s.return), n.flags & 32) {
          var h = n.stateNode;
          try {
            Po(h, "");
          } catch (re) {
            Oe(n, n.return, re);
          }
        }
        if (u & 4 && (h = n.stateNode, h != null)) {
          var v = n.memoizedProps, k = s !== null ? s.memoizedProps : v, P = n.type, M = n.updateQueue;
          if (n.updateQueue = null, M !== null) try {
            P === "input" && v.type === "radio" && v.name != null && Ff(h, v), pl(P, k);
            var F = pl(P, v);
            for (k = 0; k < M.length; k += 2) {
              var $ = M[k], U = M[k + 1];
              $ === "style" ? Hf(h, U) : $ === "dangerouslySetInnerHTML" ? $f(h, U) : $ === "children" ? Po(h, U) : E(h, $, U, F);
            }
            switch (P) {
              case "input":
                ll(h, v);
                break;
              case "textarea":
                Vf(h, v);
                break;
              case "select":
                var B = h._wrapperState.wasMultiple;
                h._wrapperState.wasMultiple = !!v.multiple;
                var q = v.value;
                q != null ? Dr(h, !!v.multiple, q, !1) : B !== !!v.multiple && (v.defaultValue != null ? Dr(
                  h,
                  !!v.multiple,
                  v.defaultValue,
                  !0
                ) : Dr(h, !!v.multiple, v.multiple ? [] : "", !1));
            }
            h[Qo] = v;
          } catch (re) {
            Oe(n, n.return, re);
          }
        }
        break;
      case 6:
        if (zt(r, n), Jt(n), u & 4) {
          if (n.stateNode === null) throw Error(o(162));
          h = n.stateNode, v = n.memoizedProps;
          try {
            h.nodeValue = v;
          } catch (re) {
            Oe(n, n.return, re);
          }
        }
        break;
      case 3:
        if (zt(r, n), Jt(n), u & 4 && s !== null && s.memoizedState.isDehydrated) try {
          Vo(r.containerInfo);
        } catch (re) {
          Oe(n, n.return, re);
        }
        break;
      case 4:
        zt(r, n), Jt(n);
        break;
      case 13:
        zt(r, n), Jt(n), h = n.child, h.flags & 8192 && (v = h.memoizedState !== null, h.stateNode.isHidden = v, !v || h.alternate !== null && h.alternate.memoizedState !== null || (Vu = Le())), u & 4 && ah(n);
        break;
      case 22:
        if ($ = s !== null && s.memoizedState !== null, n.mode & 1 ? (rt = (F = rt) || $, zt(r, n), rt = F) : zt(r, n), Jt(n), u & 8192) {
          if (F = n.memoizedState !== null, (n.stateNode.isHidden = F) && !$ && (n.mode & 1) !== 0) for (ee = n, $ = n.child; $ !== null; ) {
            for (U = ee = $; ee !== null; ) {
              switch (B = ee, q = B.child, B.tag) {
                case 0:
                case 11:
                case 14:
                case 15:
                  ai(4, B, B.return);
                  break;
                case 1:
                  qr(B, B.return);
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
                  qr(B, B.return);
                  break;
                case 22:
                  if (B.memoizedState !== null) {
                    dh(U);
                    continue;
                  }
              }
              q !== null ? (q.return = B, ee = q) : dh(U);
            }
            $ = $.sibling;
          }
          e: for ($ = null, U = n; ; ) {
            if (U.tag === 5) {
              if ($ === null) {
                $ = U;
                try {
                  h = U.stateNode, F ? (v = h.style, typeof v.setProperty == "function" ? v.setProperty("display", "none", "important") : v.display = "none") : (P = U.stateNode, M = U.memoizedProps.style, k = M != null && M.hasOwnProperty("display") ? M.display : null, P.style.display = Uf("display", k));
                } catch (re) {
                  Oe(n, n.return, re);
                }
              }
            } else if (U.tag === 6) {
              if ($ === null) try {
                U.stateNode.nodeValue = F ? "" : U.memoizedProps;
              } catch (re) {
                Oe(n, n.return, re);
              }
            } else if ((U.tag !== 22 && U.tag !== 23 || U.memoizedState === null || U === n) && U.child !== null) {
              U.child.return = U, U = U.child;
              continue;
            }
            if (U === n) break e;
            for (; U.sibling === null; ) {
              if (U.return === null || U.return === n) break e;
              $ === U && ($ = null), U = U.return;
            }
            $ === U && ($ = null), U.sibling.return = U.return, U = U.sibling;
          }
        }
        break;
      case 19:
        zt(r, n), Jt(n), u & 4 && ah(n);
        break;
      case 21:
        break;
      default:
        zt(
          r,
          n
        ), Jt(n);
    }
  }
  function Jt(n) {
    var r = n.flags;
    if (r & 2) {
      try {
        e: {
          for (var s = n.return; s !== null; ) {
            if (oh(s)) {
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
            u.flags & 32 && (Po(h, ""), u.flags &= -33);
            var v = ih(n);
            Fu(n, v, h);
            break;
          case 3:
          case 4:
            var k = u.stateNode.containerInfo, P = ih(n);
            Iu(n, P, k);
            break;
          default:
            throw Error(o(161));
        }
      } catch (M) {
        Oe(n, n.return, M);
      }
      n.flags &= -3;
    }
    r & 4096 && (n.flags &= -4097);
  }
  function a1(n, r, s) {
    ee = n, uh(n);
  }
  function uh(n, r, s) {
    for (var u = (n.mode & 1) !== 0; ee !== null; ) {
      var h = ee, v = h.child;
      if (h.tag === 22 && u) {
        var k = h.memoizedState !== null || js;
        if (!k) {
          var P = h.alternate, M = P !== null && P.memoizedState !== null || rt;
          P = js;
          var F = rt;
          if (js = k, (rt = M) && !F) for (ee = h; ee !== null; ) k = ee, M = k.child, k.tag === 22 && k.memoizedState !== null ? fh(h) : M !== null ? (M.return = k, ee = M) : fh(h);
          for (; v !== null; ) ee = v, uh(v), v = v.sibling;
          ee = h, js = P, rt = F;
        }
        ch(n);
      } else (h.subtreeFlags & 8772) !== 0 && v !== null ? (v.return = h, ee = v) : ch(n);
    }
  }
  function ch(n) {
    for (; ee !== null; ) {
      var r = ee;
      if ((r.flags & 8772) !== 0) {
        var s = r.alternate;
        try {
          if ((r.flags & 8772) !== 0) switch (r.tag) {
            case 0:
            case 11:
            case 15:
              rt || Is(5, r);
              break;
            case 1:
              var u = r.stateNode;
              if (r.flags & 4 && !rt) if (s === null) u.componentDidMount();
              else {
                var h = r.elementType === r.type ? s.memoizedProps : Lt(r.type, s.memoizedProps);
                u.componentDidUpdate(h, s.memoizedState, u.__reactInternalSnapshotBeforeUpdate);
              }
              var v = r.updateQueue;
              v !== null && dm(r, v, u);
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
                dm(r, k, s);
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
                    U !== null && Vo(U);
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
          rt || r.flags & 512 && ju(r);
        } catch (B) {
          Oe(r, r.return, B);
        }
      }
      if (r === n) {
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
  function dh(n) {
    for (; ee !== null; ) {
      var r = ee;
      if (r === n) {
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
  function fh(n) {
    for (; ee !== null; ) {
      var r = ee;
      try {
        switch (r.tag) {
          case 0:
          case 11:
          case 15:
            var s = r.return;
            try {
              Is(4, r);
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
              ju(r);
            } catch (M) {
              Oe(r, v, M);
            }
            break;
          case 5:
            var k = r.return;
            try {
              ju(r);
            } catch (M) {
              Oe(r, k, M);
            }
        }
      } catch (M) {
        Oe(r, r.return, M);
      }
      if (r === n) {
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
  var l1 = Math.ceil, Fs = N.ReactCurrentDispatcher, Ou = N.ReactCurrentOwner, Pt = N.ReactCurrentBatchConfig, he = 0, Ke = null, ze = null, Je = 0, _t = 0, eo = Mn(0), Ue = 0, li = null, ur = 0, Os = 0, Lu = 0, ui = null, mt = null, Vu = 0, to = 1 / 0, mn = null, Ls = !1, zu = null, Fn = null, Vs = !1, On = null, zs = 0, ci = 0, Bu = null, Bs = -1, $s = 0;
  function st() {
    return (he & 6) !== 0 ? Le() : Bs !== -1 ? Bs : Bs = Le();
  }
  function Ln(n) {
    return (n.mode & 1) === 0 ? 1 : (he & 2) !== 0 && Je !== 0 ? Je & -Je : Wx.transition !== null ? ($s === 0 && ($s = ip()), $s) : (n = _e, n !== 0 || (n = window.event, n = n === void 0 ? 16 : mp(n.type)), n);
  }
  function Bt(n, r, s, u) {
    if (50 < ci) throw ci = 0, Bu = null, Error(o(185));
    jo(n, s, u), ((he & 2) === 0 || n !== Ke) && (n === Ke && ((he & 2) === 0 && (Os |= s), Ue === 4 && Vn(n, Je)), ht(n, u), s === 1 && he === 0 && (r.mode & 1) === 0 && (to = Le() + 500, ys && Dn()));
  }
  function ht(n, r) {
    var s = n.callbackNode;
    Ww(n, r);
    var u = Zi(n, n === Ke ? Je : 0);
    if (u === 0) s !== null && np(s), n.callbackNode = null, n.callbackPriority = 0;
    else if (r = u & -u, n.callbackPriority !== r) {
      if (s != null && np(s), r === 1) n.tag === 0 ? Hx(mh.bind(null, n)) : qp(mh.bind(null, n)), zx(function() {
        (he & 6) === 0 && Dn();
      }), s = null;
      else {
        switch (sp(u)) {
          case 1:
            s = wl;
            break;
          case 4:
            s = rp;
            break;
          case 16:
            s = Ki;
            break;
          case 536870912:
            s = op;
            break;
          default:
            s = Ki;
        }
        s = _h(s, ph.bind(null, n));
      }
      n.callbackPriority = r, n.callbackNode = s;
    }
  }
  function ph(n, r) {
    if (Bs = -1, $s = 0, (he & 6) !== 0) throw Error(o(327));
    var s = n.callbackNode;
    if (no() && n.callbackNode !== s) return null;
    var u = Zi(n, n === Ke ? Je : 0);
    if (u === 0) return null;
    if ((u & 30) !== 0 || (u & n.expiredLanes) !== 0 || r) r = Us(n, u);
    else {
      r = u;
      var h = he;
      he |= 2;
      var v = yh();
      (Ke !== n || Je !== r) && (mn = null, to = Le() + 500, dr(n, r));
      do
        try {
          d1();
          break;
        } catch (P) {
          hh(n, P);
        }
      while (!0);
      iu(), Fs.current = v, he = h, ze !== null ? r = 0 : (Ke = null, Je = 0, r = Ue);
    }
    if (r !== 0) {
      if (r === 2 && (h = xl(n), h !== 0 && (u = h, r = $u(n, h))), r === 1) throw s = li, dr(n, 0), Vn(n, u), ht(n, Le()), s;
      if (r === 6) Vn(n, u);
      else {
        if (h = n.current.alternate, (u & 30) === 0 && !u1(h) && (r = Us(n, u), r === 2 && (v = xl(n), v !== 0 && (u = v, r = $u(n, v))), r === 1)) throw s = li, dr(n, 0), Vn(n, u), ht(n, Le()), s;
        switch (n.finishedWork = h, n.finishedLanes = u, r) {
          case 0:
          case 1:
            throw Error(o(345));
          case 2:
            fr(n, mt, mn);
            break;
          case 3:
            if (Vn(n, u), (u & 130023424) === u && (r = Vu + 500 - Le(), 10 < r)) {
              if (Zi(n, 0) !== 0) break;
              if (h = n.suspendedLanes, (h & u) !== u) {
                st(), n.pingedLanes |= n.suspendedLanes & h;
                break;
              }
              n.timeoutHandle = Yl(fr.bind(null, n, mt, mn), r);
              break;
            }
            fr(n, mt, mn);
            break;
          case 4:
            if (Vn(n, u), (u & 4194240) === u) break;
            for (r = n.eventTimes, h = -1; 0 < u; ) {
              var k = 31 - It(u);
              v = 1 << k, k = r[k], k > h && (h = k), u &= ~v;
            }
            if (u = h, u = Le() - u, u = (120 > u ? 120 : 480 > u ? 480 : 1080 > u ? 1080 : 1920 > u ? 1920 : 3e3 > u ? 3e3 : 4320 > u ? 4320 : 1960 * l1(u / 1960)) - u, 10 < u) {
              n.timeoutHandle = Yl(fr.bind(null, n, mt, mn), u);
              break;
            }
            fr(n, mt, mn);
            break;
          case 5:
            fr(n, mt, mn);
            break;
          default:
            throw Error(o(329));
        }
      }
    }
    return ht(n, Le()), n.callbackNode === s ? ph.bind(null, n) : null;
  }
  function $u(n, r) {
    var s = ui;
    return n.current.memoizedState.isDehydrated && (dr(n, r).flags |= 256), n = Us(n, r), n !== 2 && (r = mt, mt = s, r !== null && Uu(r)), n;
  }
  function Uu(n) {
    mt === null ? mt = n : mt.push.apply(mt, n);
  }
  function u1(n) {
    for (var r = n; ; ) {
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
        if (r === n) break;
        for (; r.sibling === null; ) {
          if (r.return === null || r.return === n) return !0;
          r = r.return;
        }
        r.sibling.return = r.return, r = r.sibling;
      }
    }
    return !0;
  }
  function Vn(n, r) {
    for (r &= ~Lu, r &= ~Os, n.suspendedLanes |= r, n.pingedLanes &= ~r, n = n.expirationTimes; 0 < r; ) {
      var s = 31 - It(r), u = 1 << s;
      n[s] = -1, r &= ~u;
    }
  }
  function mh(n) {
    if ((he & 6) !== 0) throw Error(o(327));
    no();
    var r = Zi(n, 0);
    if ((r & 1) === 0) return ht(n, Le()), null;
    var s = Us(n, r);
    if (n.tag !== 0 && s === 2) {
      var u = xl(n);
      u !== 0 && (r = u, s = $u(n, u));
    }
    if (s === 1) throw s = li, dr(n, 0), Vn(n, r), ht(n, Le()), s;
    if (s === 6) throw Error(o(345));
    return n.finishedWork = n.current.alternate, n.finishedLanes = r, fr(n, mt, mn), ht(n, Le()), null;
  }
  function Hu(n, r) {
    var s = he;
    he |= 1;
    try {
      return n(r);
    } finally {
      he = s, he === 0 && (to = Le() + 500, ys && Dn());
    }
  }
  function cr(n) {
    On !== null && On.tag === 0 && (he & 6) === 0 && no();
    var r = he;
    he |= 1;
    var s = Pt.transition, u = _e;
    try {
      if (Pt.transition = null, _e = 1, n) return n();
    } finally {
      _e = u, Pt.transition = s, he = r, (he & 6) === 0 && Dn();
    }
  }
  function Wu() {
    _t = eo.current, Re(eo);
  }
  function dr(n, r) {
    n.finishedWork = null, n.finishedLanes = 0;
    var s = n.timeoutHandle;
    if (s !== -1 && (n.timeoutHandle = -1, Vx(s)), ze !== null) for (s = ze.return; s !== null; ) {
      var u = s;
      switch (eu(u), u.tag) {
        case 1:
          u = u.type.childContextTypes, u != null && ms();
          break;
        case 3:
          Zr(), Re(dt), Re(et), pu();
          break;
        case 5:
          du(u);
          break;
        case 4:
          Zr();
          break;
        case 13:
          Re(je);
          break;
        case 19:
          Re(je);
          break;
        case 10:
          su(u.type._context);
          break;
        case 22:
        case 23:
          Wu();
      }
      s = s.return;
    }
    if (Ke = n, ze = n = zn(n.current, null), Je = _t = r, Ue = 0, li = null, Lu = Os = ur = 0, mt = ui = null, sr !== null) {
      for (r = 0; r < sr.length; r++) if (s = sr[r], u = s.interleaved, u !== null) {
        s.interleaved = null;
        var h = u.next, v = s.pending;
        if (v !== null) {
          var k = v.next;
          v.next = h, u.next = k;
        }
        s.pending = u;
      }
      sr = null;
    }
    return n;
  }
  function hh(n, r) {
    do {
      var s = ze;
      try {
        if (iu(), bs.current = Ms, Cs) {
          for (var u = Ie.memoizedState; u !== null; ) {
            var h = u.queue;
            h !== null && (h.pending = null), u = u.next;
          }
          Cs = !1;
        }
        if (lr = 0, Ge = $e = Ie = null, ni = !1, ri = 0, Ou.current = null, s === null || s.return === null) {
          Ue = 1, li = r, ze = null;
          break;
        }
        e: {
          var v = n, k = s.return, P = s, M = r;
          if (r = Je, P.flags |= 32768, M !== null && typeof M == "object" && typeof M.then == "function") {
            var F = M, $ = P, U = $.tag;
            if (($.mode & 1) === 0 && (U === 0 || U === 11 || U === 15)) {
              var B = $.alternate;
              B ? ($.updateQueue = B.updateQueue, $.memoizedState = B.memoizedState, $.lanes = B.lanes) : ($.updateQueue = null, $.memoizedState = null);
            }
            var q = zm(k);
            if (q !== null) {
              q.flags &= -257, Bm(q, k, P, v, r), q.mode & 1 && Vm(v, F, r), r = q, M = F;
              var te = r.updateQueue;
              if (te === null) {
                var re = /* @__PURE__ */ new Set();
                re.add(M), r.updateQueue = re;
              } else te.add(M);
              break e;
            } else {
              if ((r & 1) === 0) {
                Vm(v, F, r), Gu();
                break e;
              }
              M = Error(o(426));
            }
          } else if (Ne && P.mode & 1) {
            var Ve = zm(k);
            if (Ve !== null) {
              (Ve.flags & 65536) === 0 && (Ve.flags |= 256), Bm(Ve, k, P, v, r), ru(Jr(M, P));
              break e;
            }
          }
          v = M = Jr(M, P), Ue !== 4 && (Ue = 2), ui === null ? ui = [v] : ui.push(v), v = k;
          do {
            switch (v.tag) {
              case 3:
                v.flags |= 65536, r &= -r, v.lanes |= r;
                var j = Om(v, M, r);
                cm(v, j);
                break e;
              case 1:
                P = M;
                var R = v.type, I = v.stateNode;
                if ((v.flags & 128) === 0 && (typeof R.getDerivedStateFromError == "function" || I !== null && typeof I.componentDidCatch == "function" && (Fn === null || !Fn.has(I)))) {
                  v.flags |= 65536, r &= -r, v.lanes |= r;
                  var G = Lm(v, P, r);
                  cm(v, G);
                  break e;
                }
            }
            v = v.return;
          } while (v !== null);
        }
        vh(s);
      } catch (oe) {
        r = oe, ze === s && s !== null && (ze = s = s.return);
        continue;
      }
      break;
    } while (!0);
  }
  function yh() {
    var n = Fs.current;
    return Fs.current = Ms, n === null ? Ms : n;
  }
  function Gu() {
    (Ue === 0 || Ue === 3 || Ue === 2) && (Ue = 4), Ke === null || (ur & 268435455) === 0 && (Os & 268435455) === 0 || Vn(Ke, Je);
  }
  function Us(n, r) {
    var s = he;
    he |= 2;
    var u = yh();
    (Ke !== n || Je !== r) && (mn = null, dr(n, r));
    do
      try {
        c1();
        break;
      } catch (h) {
        hh(n, h);
      }
    while (!0);
    if (iu(), he = s, Fs.current = u, ze !== null) throw Error(o(261));
    return Ke = null, Je = 0, Ue;
  }
  function c1() {
    for (; ze !== null; ) gh(ze);
  }
  function d1() {
    for (; ze !== null && !Fw(); ) gh(ze);
  }
  function gh(n) {
    var r = xh(n.alternate, n, _t);
    n.memoizedProps = n.pendingProps, r === null ? vh(n) : ze = r, Ou.current = null;
  }
  function vh(n) {
    var r = n;
    do {
      var s = r.alternate;
      if (n = r.return, (r.flags & 32768) === 0) {
        if (s = r1(s, r, _t), s !== null) {
          ze = s;
          return;
        }
      } else {
        if (s = o1(s, r), s !== null) {
          s.flags &= 32767, ze = s;
          return;
        }
        if (n !== null) n.flags |= 32768, n.subtreeFlags = 0, n.deletions = null;
        else {
          Ue = 6, ze = null;
          return;
        }
      }
      if (r = r.sibling, r !== null) {
        ze = r;
        return;
      }
      ze = r = n;
    } while (r !== null);
    Ue === 0 && (Ue = 5);
  }
  function fr(n, r, s) {
    var u = _e, h = Pt.transition;
    try {
      Pt.transition = null, _e = 1, f1(n, r, s, u);
    } finally {
      Pt.transition = h, _e = u;
    }
    return null;
  }
  function f1(n, r, s, u) {
    do
      no();
    while (On !== null);
    if ((he & 6) !== 0) throw Error(o(327));
    s = n.finishedWork;
    var h = n.finishedLanes;
    if (s === null) return null;
    if (n.finishedWork = null, n.finishedLanes = 0, s === n.current) throw Error(o(177));
    n.callbackNode = null, n.callbackPriority = 0;
    var v = s.lanes | s.childLanes;
    if (Gw(n, v), n === Ke && (ze = Ke = null, Je = 0), (s.subtreeFlags & 2064) === 0 && (s.flags & 2064) === 0 || Vs || (Vs = !0, _h(Ki, function() {
      return no(), null;
    })), v = (s.flags & 15990) !== 0, (s.subtreeFlags & 15990) !== 0 || v) {
      v = Pt.transition, Pt.transition = null;
      var k = _e;
      _e = 1;
      var P = he;
      he |= 4, Ou.current = null, s1(n, s), lh(s, n), Dx(Gl), es = !!Wl, Gl = Wl = null, n.current = s, a1(s), Ow(), he = P, _e = k, Pt.transition = v;
    } else n.current = s;
    if (Vs && (Vs = !1, On = n, zs = h), v = n.pendingLanes, v === 0 && (Fn = null), zw(s.stateNode), ht(n, Le()), r !== null) for (u = n.onRecoverableError, s = 0; s < r.length; s++) h = r[s], u(h.value, { componentStack: h.stack, digest: h.digest });
    if (Ls) throw Ls = !1, n = zu, zu = null, n;
    return (zs & 1) !== 0 && n.tag !== 0 && no(), v = n.pendingLanes, (v & 1) !== 0 ? n === Bu ? ci++ : (ci = 0, Bu = n) : ci = 0, Dn(), null;
  }
  function no() {
    if (On !== null) {
      var n = sp(zs), r = Pt.transition, s = _e;
      try {
        if (Pt.transition = null, _e = 16 > n ? 16 : n, On === null) var u = !1;
        else {
          if (n = On, On = null, zs = 0, (he & 6) !== 0) throw Error(o(331));
          var h = he;
          for (he |= 4, ee = n.current; ee !== null; ) {
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
                        ai(8, $, v);
                    }
                    var U = $.child;
                    if (U !== null) U.return = $, ee = U;
                    else for (; ee !== null; ) {
                      $ = ee;
                      var B = $.sibling, q = $.return;
                      if (rh($), $ === F) {
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
                  ai(9, v, v.return);
              }
              var j = v.sibling;
              if (j !== null) {
                j.return = v.return, ee = j;
                break e;
              }
              ee = v.return;
            }
          }
          var R = n.current;
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
                    Is(9, P);
                }
              } catch (oe) {
                Oe(P, P.return, oe);
              }
              if (P === k) {
                ee = null;
                break e;
              }
              var G = P.sibling;
              if (G !== null) {
                G.return = P.return, ee = G;
                break e;
              }
              ee = P.return;
            }
          }
          if (he = h, Dn(), Yt && typeof Yt.onPostCommitFiberRoot == "function") try {
            Yt.onPostCommitFiberRoot(Yi, n);
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
  function Sh(n, r, s) {
    r = Jr(s, r), r = Om(n, r, 1), n = jn(n, r, 1), r = st(), n !== null && (jo(n, 1, r), ht(n, r));
  }
  function Oe(n, r, s) {
    if (n.tag === 3) Sh(n, n, s);
    else for (; r !== null; ) {
      if (r.tag === 3) {
        Sh(r, n, s);
        break;
      } else if (r.tag === 1) {
        var u = r.stateNode;
        if (typeof r.type.getDerivedStateFromError == "function" || typeof u.componentDidCatch == "function" && (Fn === null || !Fn.has(u))) {
          n = Jr(s, n), n = Lm(r, n, 1), r = jn(r, n, 1), n = st(), r !== null && (jo(r, 1, n), ht(r, n));
          break;
        }
      }
      r = r.return;
    }
  }
  function p1(n, r, s) {
    var u = n.pingCache;
    u !== null && u.delete(r), r = st(), n.pingedLanes |= n.suspendedLanes & s, Ke === n && (Je & s) === s && (Ue === 4 || Ue === 3 && (Je & 130023424) === Je && 500 > Le() - Vu ? dr(n, 0) : Lu |= s), ht(n, r);
  }
  function wh(n, r) {
    r === 0 && ((n.mode & 1) === 0 ? r = 1 : (r = Qi, Qi <<= 1, (Qi & 130023424) === 0 && (Qi = 4194304)));
    var s = st();
    n = dn(n, r), n !== null && (jo(n, r, s), ht(n, s));
  }
  function m1(n) {
    var r = n.memoizedState, s = 0;
    r !== null && (s = r.retryLane), wh(n, s);
  }
  function h1(n, r) {
    var s = 0;
    switch (n.tag) {
      case 13:
        var u = n.stateNode, h = n.memoizedState;
        h !== null && (s = h.retryLane);
        break;
      case 19:
        u = n.stateNode;
        break;
      default:
        throw Error(o(314));
    }
    u !== null && u.delete(r), wh(n, s);
  }
  var xh;
  xh = function(n, r, s) {
    if (n !== null) if (n.memoizedProps !== r.pendingProps || dt.current) pt = !0;
    else {
      if ((n.lanes & s) === 0 && (r.flags & 128) === 0) return pt = !1, n1(n, r, s);
      pt = (n.flags & 131072) !== 0;
    }
    else pt = !1, Ne && (r.flags & 1048576) !== 0 && em(r, vs, r.index);
    switch (r.lanes = 0, r.tag) {
      case 2:
        var u = r.type;
        Ns(n, r), n = r.pendingProps;
        var h = Hr(r, et.current);
        Qr(r, s), h = yu(null, r, u, n, h, s);
        var v = gu();
        return r.flags |= 1, typeof h == "object" && h !== null && typeof h.render == "function" && h.$$typeof === void 0 ? (r.tag = 1, r.memoizedState = null, r.updateQueue = null, ft(u) ? (v = !0, hs(r)) : v = !1, r.memoizedState = h.state !== null && h.state !== void 0 ? h.state : null, uu(r), h.updater = Rs, r.stateNode = h, h._reactInternals = r, Tu(r, u, n, s), r = Cu(null, r, u, !0, v, s)) : (r.tag = 0, Ne && v && ql(r), it(null, r, h, s), r = r.child), r;
      case 16:
        u = r.elementType;
        e: {
          switch (Ns(n, r), n = r.pendingProps, h = u._init, u = h(u._payload), r.type = u, h = r.tag = g1(u), n = Lt(u, n), h) {
            case 0:
              r = bu(null, r, u, n, s);
              break e;
            case 1:
              r = Km(null, r, u, n, s);
              break e;
            case 11:
              r = $m(null, r, u, n, s);
              break e;
            case 14:
              r = Um(null, r, u, Lt(u.type, n), s);
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
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Lt(u, h), bu(n, r, u, h, s);
      case 1:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Lt(u, h), Km(n, r, u, h, s);
      case 3:
        e: {
          if (Ym(r), n === null) throw Error(o(387));
          u = r.pendingProps, v = r.memoizedState, h = v.element, um(n, r), ks(r, u, null, s);
          var k = r.memoizedState;
          if (u = k.element, v.isDehydrated) if (v = { element: u, isDehydrated: !1, cache: k.cache, pendingSuspenseBoundaries: k.pendingSuspenseBoundaries, transitions: k.transitions }, r.updateQueue.baseState = v, r.memoizedState = v, r.flags & 256) {
            h = Jr(Error(o(423)), r), r = Xm(n, r, u, s, h);
            break e;
          } else if (u !== h) {
            h = Jr(Error(o(424)), r), r = Xm(n, r, u, s, h);
            break e;
          } else for (xt = En(r.stateNode.containerInfo.firstChild), wt = r, Ne = !0, Ot = null, s = am(r, null, u, s), r.child = s; s; ) s.flags = s.flags & -3 | 4096, s = s.sibling;
          else {
            if (Kr(), u === h) {
              r = pn(n, r, s);
              break e;
            }
            it(n, r, u, s);
          }
          r = r.child;
        }
        return r;
      case 5:
        return fm(r), n === null && nu(r), u = r.type, h = r.pendingProps, v = n !== null ? n.memoizedProps : null, k = h.children, Kl(u, h) ? k = null : v !== null && Kl(u, v) && (r.flags |= 32), Gm(n, r), it(n, r, k, s), r.child;
      case 6:
        return n === null && nu(r), null;
      case 13:
        return Qm(n, r, s);
      case 4:
        return cu(r, r.stateNode.containerInfo), u = r.pendingProps, n === null ? r.child = Yr(r, null, u, s) : it(n, r, u, s), r.child;
      case 11:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Lt(u, h), $m(n, r, u, h, s);
      case 7:
        return it(n, r, r.pendingProps, s), r.child;
      case 8:
        return it(n, r, r.pendingProps.children, s), r.child;
      case 12:
        return it(n, r, r.pendingProps.children, s), r.child;
      case 10:
        e: {
          if (u = r.type._context, h = r.pendingProps, v = r.memoizedProps, k = h.value, Ee(xs, u._currentValue), u._currentValue = k, v !== null) if (Ft(v.value, k)) {
            if (v.children === h.children && !dt.current) {
              r = pn(n, r, s);
              break e;
            }
          } else for (v = r.child, v !== null && (v.return = r); v !== null; ) {
            var P = v.dependencies;
            if (P !== null) {
              k = v.child;
              for (var M = P.firstContext; M !== null; ) {
                if (M.context === u) {
                  if (v.tag === 1) {
                    M = fn(-1, s & -s), M.tag = 2;
                    var F = v.updateQueue;
                    if (F !== null) {
                      F = F.shared;
                      var $ = F.pending;
                      $ === null ? M.next = M : (M.next = $.next, $.next = M), F.pending = M;
                    }
                  }
                  v.lanes |= s, M = v.alternate, M !== null && (M.lanes |= s), au(
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
              k.lanes |= s, P = k.alternate, P !== null && (P.lanes |= s), au(k, s, r), k = v.sibling;
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
          it(n, r, h.children, s), r = r.child;
        }
        return r;
      case 9:
        return h = r.type, u = r.pendingProps.children, Qr(r, s), h = bt(h), u = u(h), r.flags |= 1, it(n, r, u, s), r.child;
      case 14:
        return u = r.type, h = Lt(u, r.pendingProps), h = Lt(u.type, h), Um(n, r, u, h, s);
      case 15:
        return Hm(n, r, r.type, r.pendingProps, s);
      case 17:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Lt(u, h), Ns(n, r), r.tag = 1, ft(u) ? (n = !0, hs(r)) : n = !1, Qr(r, s), Im(r, u, h), Tu(r, u, h, s), Cu(null, r, u, !0, n, s);
      case 19:
        return Jm(n, r, s);
      case 22:
        return Wm(n, r, s);
    }
    throw Error(o(156, r.tag));
  };
  function _h(n, r) {
    return tp(n, r);
  }
  function y1(n, r, s, u) {
    this.tag = n, this.key = s, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = r, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = u, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function Et(n, r, s, u) {
    return new y1(n, r, s, u);
  }
  function Ku(n) {
    return n = n.prototype, !(!n || !n.isReactComponent);
  }
  function g1(n) {
    if (typeof n == "function") return Ku(n) ? 1 : 0;
    if (n != null) {
      if (n = n.$$typeof, n === J) return 11;
      if (n === ye) return 14;
    }
    return 2;
  }
  function zn(n, r) {
    var s = n.alternate;
    return s === null ? (s = Et(n.tag, r, n.key, n.mode), s.elementType = n.elementType, s.type = n.type, s.stateNode = n.stateNode, s.alternate = n, n.alternate = s) : (s.pendingProps = r, s.type = n.type, s.flags = 0, s.subtreeFlags = 0, s.deletions = null), s.flags = n.flags & 14680064, s.childLanes = n.childLanes, s.lanes = n.lanes, s.child = n.child, s.memoizedProps = n.memoizedProps, s.memoizedState = n.memoizedState, s.updateQueue = n.updateQueue, r = n.dependencies, s.dependencies = r === null ? null : { lanes: r.lanes, firstContext: r.firstContext }, s.sibling = n.sibling, s.index = n.index, s.ref = n.ref, s;
  }
  function Hs(n, r, s, u, h, v) {
    var k = 2;
    if (u = n, typeof n == "function") Ku(n) && (k = 1);
    else if (typeof n == "string") k = 5;
    else e: switch (n) {
      case H:
        return pr(s.children, h, v, r);
      case Y:
        k = 8, h |= 8;
        break;
      case V:
        return n = Et(12, s, r, h | 2), n.elementType = V, n.lanes = v, n;
      case ce:
        return n = Et(13, s, r, h), n.elementType = ce, n.lanes = v, n;
      case ue:
        return n = Et(19, s, r, h), n.elementType = ue, n.lanes = v, n;
      case we:
        return Ws(s, h, v, r);
      default:
        if (typeof n == "object" && n !== null) switch (n.$$typeof) {
          case Q:
            k = 10;
            break e;
          case ie:
            k = 9;
            break e;
          case J:
            k = 11;
            break e;
          case ye:
            k = 14;
            break e;
          case me:
            k = 16, u = null;
            break e;
        }
        throw Error(o(130, n == null ? n : typeof n, ""));
    }
    return r = Et(k, s, r, h), r.elementType = n, r.type = u, r.lanes = v, r;
  }
  function pr(n, r, s, u) {
    return n = Et(7, n, u, r), n.lanes = s, n;
  }
  function Ws(n, r, s, u) {
    return n = Et(22, n, u, r), n.elementType = we, n.lanes = s, n.stateNode = { isHidden: !1 }, n;
  }
  function Yu(n, r, s) {
    return n = Et(6, n, null, r), n.lanes = s, n;
  }
  function Xu(n, r, s) {
    return r = Et(4, n.children !== null ? n.children : [], n.key, r), r.lanes = s, r.stateNode = { containerInfo: n.containerInfo, pendingChildren: null, implementation: n.implementation }, r;
  }
  function v1(n, r, s, u, h) {
    this.tag = r, this.containerInfo = n, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = _l(0), this.expirationTimes = _l(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = _l(0), this.identifierPrefix = u, this.onRecoverableError = h, this.mutableSourceEagerHydrationData = null;
  }
  function Qu(n, r, s, u, h, v, k, P, M) {
    return n = new v1(n, r, s, P, M), r === 1 ? (r = 1, v === !0 && (r |= 8)) : r = 0, v = Et(3, null, null, r), n.current = v, v.stateNode = n, v.memoizedState = { element: u, isDehydrated: s, cache: null, transitions: null, pendingSuspenseBoundaries: null }, uu(v), n;
  }
  function S1(n, r, s) {
    var u = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return { $$typeof: W, key: u == null ? null : "" + u, children: n, containerInfo: r, implementation: s };
  }
  function Th(n) {
    if (!n) return Rn;
    n = n._reactInternals;
    e: {
      if (tr(n) !== n || n.tag !== 1) throw Error(o(170));
      var r = n;
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
    if (n.tag === 1) {
      var s = n.type;
      if (ft(s)) return Zp(n, s, r);
    }
    return r;
  }
  function kh(n, r, s, u, h, v, k, P, M) {
    return n = Qu(s, u, !0, n, h, v, k, P, M), n.context = Th(null), s = n.current, u = st(), h = Ln(s), v = fn(u, h), v.callback = r ?? null, jn(s, v, h), n.current.lanes = h, jo(n, h, u), ht(n, u), n;
  }
  function Gs(n, r, s, u) {
    var h = r.current, v = st(), k = Ln(h);
    return s = Th(s), r.context === null ? r.context = s : r.pendingContext = s, r = fn(v, k), r.payload = { element: n }, u = u === void 0 ? null : u, u !== null && (r.callback = u), n = jn(h, r, k), n !== null && (Bt(n, h, k, v), Ts(n, h, k)), k;
  }
  function Ks(n) {
    if (n = n.current, !n.child) return null;
    switch (n.child.tag) {
      case 5:
        return n.child.stateNode;
      default:
        return n.child.stateNode;
    }
  }
  function Ah(n, r) {
    if (n = n.memoizedState, n !== null && n.dehydrated !== null) {
      var s = n.retryLane;
      n.retryLane = s !== 0 && s < r ? s : r;
    }
  }
  function Zu(n, r) {
    Ah(n, r), (n = n.alternate) && Ah(n, r);
  }
  function w1() {
    return null;
  }
  var bh = typeof reportError == "function" ? reportError : function(n) {
    console.error(n);
  };
  function Ju(n) {
    this._internalRoot = n;
  }
  Ys.prototype.render = Ju.prototype.render = function(n) {
    var r = this._internalRoot;
    if (r === null) throw Error(o(409));
    Gs(n, r, null, null);
  }, Ys.prototype.unmount = Ju.prototype.unmount = function() {
    var n = this._internalRoot;
    if (n !== null) {
      this._internalRoot = null;
      var r = n.containerInfo;
      cr(function() {
        Gs(null, n, null, null);
      }), r[an] = null;
    }
  };
  function Ys(n) {
    this._internalRoot = n;
  }
  Ys.prototype.unstable_scheduleHydration = function(n) {
    if (n) {
      var r = up();
      n = { blockedOn: null, target: n, priority: r };
      for (var s = 0; s < bn.length && r !== 0 && r < bn[s].priority; s++) ;
      bn.splice(s, 0, n), s === 0 && fp(n);
    }
  };
  function qu(n) {
    return !(!n || n.nodeType !== 1 && n.nodeType !== 9 && n.nodeType !== 11);
  }
  function Xs(n) {
    return !(!n || n.nodeType !== 1 && n.nodeType !== 9 && n.nodeType !== 11 && (n.nodeType !== 8 || n.nodeValue !== " react-mount-point-unstable "));
  }
  function Ch() {
  }
  function x1(n, r, s, u, h) {
    if (h) {
      if (typeof u == "function") {
        var v = u;
        u = function() {
          var F = Ks(k);
          v.call(F);
        };
      }
      var k = kh(r, u, n, 0, null, !1, !1, "", Ch);
      return n._reactRootContainer = k, n[an] = k.current, Yo(n.nodeType === 8 ? n.parentNode : n), cr(), k;
    }
    for (; h = n.lastChild; ) n.removeChild(h);
    if (typeof u == "function") {
      var P = u;
      u = function() {
        var F = Ks(M);
        P.call(F);
      };
    }
    var M = Qu(n, 0, !1, null, null, !1, !1, "", Ch);
    return n._reactRootContainer = M, n[an] = M.current, Yo(n.nodeType === 8 ? n.parentNode : n), cr(function() {
      Gs(r, M, s, u);
    }), M;
  }
  function Qs(n, r, s, u, h) {
    var v = s._reactRootContainer;
    if (v) {
      var k = v;
      if (typeof h == "function") {
        var P = h;
        h = function() {
          var M = Ks(k);
          P.call(M);
        };
      }
      Gs(r, k, n, h);
    } else k = x1(s, r, n, h, u);
    return Ks(k);
  }
  ap = function(n) {
    switch (n.tag) {
      case 3:
        var r = n.stateNode;
        if (r.current.memoizedState.isDehydrated) {
          var s = No(r.pendingLanes);
          s !== 0 && (Tl(r, s | 1), ht(r, Le()), (he & 6) === 0 && (to = Le() + 500, Dn()));
        }
        break;
      case 13:
        cr(function() {
          var u = dn(n, 1);
          if (u !== null) {
            var h = st();
            Bt(u, n, 1, h);
          }
        }), Zu(n, 1);
    }
  }, kl = function(n) {
    if (n.tag === 13) {
      var r = dn(n, 134217728);
      if (r !== null) {
        var s = st();
        Bt(r, n, 134217728, s);
      }
      Zu(n, 134217728);
    }
  }, lp = function(n) {
    if (n.tag === 13) {
      var r = Ln(n), s = dn(n, r);
      if (s !== null) {
        var u = st();
        Bt(s, n, r, u);
      }
      Zu(n, r);
    }
  }, up = function() {
    return _e;
  }, cp = function(n, r) {
    var s = _e;
    try {
      return _e = n, r();
    } finally {
      _e = s;
    }
  }, yl = function(n, r, s) {
    switch (r) {
      case "input":
        if (ll(n, s), r = s.name, s.type === "radio" && r != null) {
          for (s = n; s.parentNode; ) s = s.parentNode;
          for (s = s.querySelectorAll("input[name=" + JSON.stringify("" + r) + '][type="radio"]'), r = 0; r < s.length; r++) {
            var u = s[r];
            if (u !== n && u.form === n.form) {
              var h = ps(u);
              if (!h) throw Error(o(90));
              jf(u), ll(u, h);
            }
          }
        }
        break;
      case "textarea":
        Vf(n, s);
        break;
      case "select":
        r = s.value, r != null && Dr(n, !!s.multiple, r, !1);
    }
  }, Yf = Hu, Xf = cr;
  var _1 = { usingClientEntryPoint: !1, Events: [Zo, $r, ps, Gf, Kf, Hu] }, di = { findFiberByHostInstance: nr, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, T1 = { bundleType: di.bundleType, version: di.version, rendererPackageName: di.rendererPackageName, rendererConfig: di.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: N.ReactCurrentDispatcher, findHostInstanceByFiber: function(n) {
    return n = qf(n), n === null ? null : n.stateNode;
  }, findFiberByHostInstance: di.findFiberByHostInstance || w1, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Zs = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Zs.isDisabled && Zs.supportsFiber) try {
      Yi = Zs.inject(T1), Yt = Zs;
    } catch {
    }
  }
  return yt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = _1, yt.createPortal = function(n, r) {
    var s = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!qu(r)) throw Error(o(200));
    return S1(n, r, null, s);
  }, yt.createRoot = function(n, r) {
    if (!qu(n)) throw Error(o(299));
    var s = !1, u = "", h = bh;
    return r != null && (r.unstable_strictMode === !0 && (s = !0), r.identifierPrefix !== void 0 && (u = r.identifierPrefix), r.onRecoverableError !== void 0 && (h = r.onRecoverableError)), r = Qu(n, 1, !1, null, null, s, !1, u, h), n[an] = r.current, Yo(n.nodeType === 8 ? n.parentNode : n), new Ju(r);
  }, yt.findDOMNode = function(n) {
    if (n == null) return null;
    if (n.nodeType === 1) return n;
    var r = n._reactInternals;
    if (r === void 0)
      throw typeof n.render == "function" ? Error(o(188)) : (n = Object.keys(n).join(","), Error(o(268, n)));
    return n = qf(r), n = n === null ? null : n.stateNode, n;
  }, yt.flushSync = function(n) {
    return cr(n);
  }, yt.hydrate = function(n, r, s) {
    if (!Xs(r)) throw Error(o(200));
    return Qs(null, n, r, !0, s);
  }, yt.hydrateRoot = function(n, r, s) {
    if (!qu(n)) throw Error(o(405));
    var u = s != null && s.hydratedSources || null, h = !1, v = "", k = bh;
    if (s != null && (s.unstable_strictMode === !0 && (h = !0), s.identifierPrefix !== void 0 && (v = s.identifierPrefix), s.onRecoverableError !== void 0 && (k = s.onRecoverableError)), r = kh(r, null, n, 1, s ?? null, h, !1, v, k), n[an] = r.current, Yo(n), u) for (n = 0; n < u.length; n++) s = u[n], h = s._getVersion, h = h(s._source), r.mutableSourceEagerHydrationData == null ? r.mutableSourceEagerHydrationData = [s, h] : r.mutableSourceEagerHydrationData.push(
      s,
      h
    );
    return new Ys(r);
  }, yt.render = function(n, r, s) {
    if (!Xs(r)) throw Error(o(200));
    return Qs(null, n, r, !1, s);
  }, yt.unmountComponentAtNode = function(n) {
    if (!Xs(n)) throw Error(o(40));
    return n._reactRootContainer ? (cr(function() {
      Qs(null, null, n, !1, function() {
        n._reactRootContainer = null, n[an] = null;
      });
    }), !0) : !1;
  }, yt.unstable_batchedUpdates = Hu, yt.unstable_renderSubtreeIntoContainer = function(n, r, s, u) {
    if (!Xs(s)) throw Error(o(200));
    if (n == null || n._reactInternals === void 0) throw Error(o(38));
    return Qs(n, r, s, !1, u);
  }, yt.version = "18.3.1-next-f1338f8080-20240426", yt;
}
var Fh;
function Gg() {
  if (Fh) return tc.exports;
  Fh = 1;
  function e() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(e);
      } catch (t) {
        console.error(t);
      }
  }
  return e(), tc.exports = j1(), tc.exports;
}
var Oh;
function I1() {
  if (Oh) return Js;
  Oh = 1;
  var e = Gg();
  return Js.createRoot = e.createRoot, Js.hydrateRoot = e.hydrateRoot, Js;
}
var F1 = I1(), oc = { exports: {} }, pi = {};
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Lh;
function O1() {
  if (Lh) return pi;
  Lh = 1;
  var e = Dd(), t = Symbol.for("react.element"), o = Symbol.for("react.fragment"), i = Object.prototype.hasOwnProperty, a = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, f = { key: !0, ref: !0, __self: !0, __source: !0 };
  function d(p, m, y) {
    var S, l = {}, c = null, g = null;
    y !== void 0 && (c = "" + y), m.key !== void 0 && (c = "" + m.key), m.ref !== void 0 && (g = m.ref);
    for (S in m) i.call(m, S) && !f.hasOwnProperty(S) && (l[S] = m[S]);
    if (p && p.defaultProps) for (S in m = p.defaultProps, m) l[S] === void 0 && (l[S] = m[S]);
    return { $$typeof: t, type: p, key: c, ref: g, props: l, _owner: a.current };
  }
  return pi.Fragment = o, pi.jsx = d, pi.jsxs = d, pi;
}
var Vh;
function L1() {
  return Vh || (Vh = 1, oc.exports = O1()), oc.exports;
}
var x = L1();
const zh = (e) => Symbol.iterator in e, Bh = (e) => (
  // HACK: avoid checking entries type
  "entries" in e
), $h = (e, t) => {
  const o = e instanceof Map ? e : new Map(e.entries()), i = t instanceof Map ? t : new Map(t.entries());
  if (o.size !== i.size)
    return !1;
  for (const [a, f] of o)
    if (!i.has(a) || !Object.is(f, i.get(a)))
      return !1;
  return !0;
}, V1 = (e, t) => {
  const o = e[Symbol.iterator](), i = t[Symbol.iterator]();
  let a = o.next(), f = i.next();
  for (; !a.done && !f.done; ) {
    if (!Object.is(a.value, f.value))
      return !1;
    a = o.next(), f = i.next();
  }
  return !!a.done && !!f.done;
};
function z1(e, t) {
  return Object.is(e, t) ? !0 : typeof e != "object" || e === null || typeof t != "object" || t === null || Object.getPrototypeOf(e) !== Object.getPrototypeOf(t) ? !1 : zh(e) && zh(t) ? Bh(e) && Bh(t) ? $h(e, t) : V1(e, t) : $h(
    { entries: () => Object.entries(e) },
    { entries: () => Object.entries(t) }
  );
}
function B1(e) {
  const t = gn.useRef(void 0);
  return (o) => {
    const i = e(o);
    return z1(t.current, i) ? t.current : t.current = i;
  };
}
const Nd = b.createContext({});
function Pr(e) {
  const t = b.useRef(null);
  return t.current === null && (t.current = e()), t.current;
}
const $1 = typeof window < "u", jd = $1 ? b.useLayoutEffect : b.useEffect, Xa = /* @__PURE__ */ b.createContext(null);
function Id(e, t) {
  e.indexOf(t) === -1 && e.push(t);
}
function Ea(e, t) {
  const o = e.indexOf(t);
  o > -1 && e.splice(o, 1);
}
const sn = (e, t, o) => o > t ? t : o < e ? e : o;
function Uh(e, t) {
  return t ? `${e}. For more information and steps for solving, visit https://motion.dev/troubleshooting/${t}` : e;
}
let Ni = () => {
}, Er = () => {
};
var zg;
typeof process < "u" && ((zg = process.env) == null ? void 0 : zg.NODE_ENV) !== "production" && (Ni = (e, t, o) => {
  !e && typeof console < "u" && console.warn(Uh(t, o));
}, Er = (e, t, o) => {
  if (!e)
    throw new Error(Uh(t, o));
});
const Qn = {}, Kg = (e) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(e), Yg = (e) => typeof e == "object" && e !== null, Xg = (e) => /^0[^.\s]+$/u.test(e);
// @__NO_SIDE_EFFECTS__
function Qg(e) {
  let t;
  return () => (t === void 0 && (t = e()), t);
}
const jt = /* @__NO_SIDE_EFFECTS__ */ (e) => e, ji = (...e) => e.reduce((t, o) => (i) => o(t(i))), Ai = /* @__NO_SIDE_EFFECTS__ */ (e, t, o) => {
  const i = t - e;
  return i ? (o - e) / i : 1;
};
class Fd {
  constructor() {
    this.subscriptions = [];
  }
  add(t) {
    return Id(this.subscriptions, t), () => Ea(this.subscriptions, t);
  }
  notify(t, o, i) {
    const a = this.subscriptions.length;
    if (a)
      if (a === 1)
        this.subscriptions[0](t, o, i);
      else
        for (let f = 0; f < a; f++) {
          const d = this.subscriptions[f];
          d && d(t, o, i);
        }
  }
  getSize() {
    return this.subscriptions.length;
  }
  clear() {
    this.subscriptions.length = 0;
  }
}
const gt = /* @__NO_SIDE_EFFECTS__ */ (e) => e * 1e3, Nt = /* @__NO_SIDE_EFFECTS__ */ (e) => e / 1e3, Zg = /* @__NO_SIDE_EFFECTS__ */ (e, t) => t ? e * (1e3 / t) : 0, Jg = (e, t, o) => (((1 - 3 * o + 3 * t) * e + (3 * o - 6 * t)) * e + 3 * t) * e, U1 = 1e-7, H1 = 12;
function W1(e, t, o, i, a) {
  let f, d, p = 0;
  do
    d = t + (o - t) / 2, f = Jg(d, i, a) - e, f > 0 ? o = d : t = d;
  while (Math.abs(f) > U1 && ++p < H1);
  return d;
}
// @__NO_SIDE_EFFECTS__
function Ii(e, t, o, i) {
  if (e === t && o === i)
    return jt;
  const a = (f) => W1(f, 0, 1, e, o);
  return (f) => f === 0 || f === 1 ? f : Jg(a(f), t, i);
}
const qg = /* @__NO_SIDE_EFFECTS__ */ (e) => (t) => t <= 0.5 ? e(2 * t) / 2 : (2 - e(2 * (1 - t))) / 2, ev = /* @__NO_SIDE_EFFECTS__ */ (e) => (t) => 1 - e(1 - t), tv = /* @__PURE__ */ Ii(0.33, 1.53, 0.69, 0.99), Od = /* @__PURE__ */ ev(tv), nv = /* @__PURE__ */ qg(Od), rv = (e) => e >= 1 ? 1 : (e *= 2) < 1 ? 0.5 * Od(e) : 0.5 * (2 - Math.pow(2, -10 * (e - 1))), Ld = (e) => 1 - Math.sin(Math.acos(e)), ov = /* @__PURE__ */ ev(Ld), iv = /* @__PURE__ */ qg(Ld), G1 = /* @__PURE__ */ Ii(0.42, 0, 1, 1), K1 = /* @__PURE__ */ Ii(0, 0, 0.58, 1), sv = /* @__PURE__ */ Ii(0.42, 0, 0.58, 1), Y1 = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] != "number", av = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] == "number", Hh = {
  linear: jt,
  easeIn: G1,
  easeInOut: sv,
  easeOut: K1,
  circIn: Ld,
  circInOut: iv,
  circOut: ov,
  backIn: Od,
  backInOut: nv,
  backOut: tv,
  anticipate: rv
}, X1 = (e) => typeof e == "string", Wh = (e) => {
  if (/* @__PURE__ */ av(e)) {
    Er(e.length === 4, "Cubic bezier arrays must contain four numerical values.", "cubic-bezier-length");
    const [t, o, i, a] = e;
    return /* @__PURE__ */ Ii(t, o, i, a);
  } else if (X1(e))
    return Er(Hh[e] !== void 0, `Invalid easing type '${e}'`, "invalid-easing-type"), Hh[e];
  return e;
}, qs = [
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
function Q1(e, t) {
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
const Z1 = 40;
function lv(e, t) {
  let o = !1, i = !0;
  const a = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  }, f = () => o = !0, d = qs.reduce((E, N) => (E[N] = Q1(f), E), {}), { setup: p, read: m, resolveKeyframes: y, preUpdate: S, update: l, preRender: c, render: g, postRender: w } = d, T = () => {
    const E = Qn.useManualTiming, N = E ? a.timestamp : performance.now();
    o = !1, E || (a.delta = i ? 1e3 / 60 : Math.max(Math.min(N - a.timestamp, Z1), 1)), a.timestamp = N, a.isProcessing = !0, p.process(a), m.process(a), y.process(a), S.process(a), l.process(a), c.process(a), g.process(a), w.process(a), a.isProcessing = !1, o && t && (i = !1, e(T));
  }, A = () => {
    o = !0, i = !0, a.isProcessing || e(T);
  };
  return { schedule: qs.reduce((E, N) => {
    const L = d[N];
    return E[N] = (W, H = !1, Y = !1) => (o || A(), L.schedule(W, H, Y)), E;
  }, {}), cancel: (E) => {
    for (let N = 0; N < qs.length; N++)
      d[qs[N]].cancel(E);
  }, state: a, steps: d };
}
const { schedule: ke, cancel: Sn, state: qe, steps: ic } = /* @__PURE__ */ lv(typeof requestAnimationFrame < "u" ? requestAnimationFrame : jt, !0);
let ha;
function J1() {
  ha = void 0;
}
const lt = {
  now: () => (ha === void 0 && lt.set(qe.isProcessing || Qn.useManualTiming ? qe.timestamp : performance.now()), ha),
  set: (e) => {
    ha = e, queueMicrotask(J1);
  }
}, uv = (e) => (t) => typeof t == "string" && t.startsWith(e), cv = /* @__PURE__ */ uv("--"), q1 = /* @__PURE__ */ uv("var(--"), Vd = (e) => q1(e) ? e_.test(e.split("/*")[0].trim()) : !1, e_ = /var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;
function Gh(e) {
  return typeof e != "string" ? !1 : e.split("/*")[0].includes("var(--");
}
const wo = {
  test: (e) => typeof e == "number",
  parse: parseFloat,
  transform: (e) => e
}, bi = {
  ...wo,
  transform: (e) => sn(0, 1, e)
}, ea = {
  ...wo,
  default: 1
}, gi = (e) => Math.round(e * 1e5) / 1e5, zd = /-?(?:\d+(?:\.\d+)?|\.\d+)/gu;
function t_(e) {
  return e == null;
}
const n_ = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu, Bd = (e, t) => (o) => !!(typeof o == "string" && n_.test(o) && o.startsWith(e) || t && !t_(o) && Object.prototype.hasOwnProperty.call(o, t)), dv = (e, t, o) => (i) => {
  if (typeof i != "string")
    return i;
  const [a, f, d, p] = i.match(zd);
  return {
    [e]: parseFloat(a),
    [t]: parseFloat(f),
    [o]: parseFloat(d),
    alpha: p !== void 0 ? parseFloat(p) : 1
  };
}, r_ = (e) => sn(0, 255, e), sc = {
  ...wo,
  transform: (e) => Math.round(r_(e))
}, wr = {
  test: /* @__PURE__ */ Bd("rgb", "red"),
  parse: /* @__PURE__ */ dv("red", "green", "blue"),
  transform: ({ red: e, green: t, blue: o, alpha: i = 1 }) => "rgba(" + sc.transform(e) + ", " + sc.transform(t) + ", " + sc.transform(o) + ", " + gi(bi.transform(i)) + ")"
};
function o_(e) {
  let t = "", o = "", i = "", a = "";
  return e.length > 5 ? (t = e.substring(1, 3), o = e.substring(3, 5), i = e.substring(5, 7), a = e.substring(7, 9)) : (t = e.substring(1, 2), o = e.substring(2, 3), i = e.substring(3, 4), a = e.substring(4, 5), t += t, o += o, i += i, a += a), {
    red: parseInt(t, 16),
    green: parseInt(o, 16),
    blue: parseInt(i, 16),
    alpha: a ? parseInt(a, 16) / 255 : 1
  };
}
const Nc = {
  test: /* @__PURE__ */ Bd("#"),
  parse: o_,
  transform: wr.transform
}, Fi = /* @__NO_SIDE_EFFECTS__ */ (e) => ({
  test: (t) => typeof t == "string" && t.endsWith(e) && t.split(" ").length === 1,
  parse: parseFloat,
  transform: (t) => `${t}${e}`
}), hn = /* @__PURE__ */ Fi("deg"), on = /* @__PURE__ */ Fi("%"), ne = /* @__PURE__ */ Fi("px"), i_ = /* @__PURE__ */ Fi("vh"), s_ = /* @__PURE__ */ Fi("vw"), Kh = {
  ...on,
  parse: (e) => on.parse(e) / 100,
  transform: (e) => on.transform(e * 100)
}, co = {
  test: /* @__PURE__ */ Bd("hsl", "hue"),
  parse: /* @__PURE__ */ dv("hue", "saturation", "lightness"),
  transform: ({ hue: e, saturation: t, lightness: o, alpha: i = 1 }) => "hsla(" + Math.round(e) + ", " + on.transform(gi(t)) + ", " + on.transform(gi(o)) + ", " + gi(bi.transform(i)) + ")"
}, Be = {
  test: (e) => wr.test(e) || Nc.test(e) || co.test(e),
  parse: (e) => wr.test(e) ? wr.parse(e) : co.test(e) ? co.parse(e) : Nc.parse(e),
  transform: (e) => typeof e == "string" ? e : e.hasOwnProperty("red") ? wr.transform(e) : co.transform(e),
  getAnimatableNone: (e) => {
    const t = Be.parse(e);
    return t.alpha = 0, Be.transform(t);
  }
}, a_ = /(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;
function l_(e) {
  var t, o;
  return isNaN(e) && typeof e == "string" && (((t = e.match(zd)) == null ? void 0 : t.length) || 0) + (((o = e.match(a_)) == null ? void 0 : o.length) || 0) > 0;
}
const fv = "number", pv = "color", u_ = "var", c_ = "var(", Yh = "${}", d_ = /var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;
function go(e) {
  const t = e.toString(), o = [], i = {
    color: [],
    number: [],
    var: []
  }, a = [];
  let f = 0;
  const p = t.replace(d_, (m) => (Be.test(m) ? (i.color.push(f), a.push(pv), o.push(Be.parse(m))) : m.startsWith(c_) ? (i.var.push(f), a.push(u_), o.push(m)) : (i.number.push(f), a.push(fv), o.push(parseFloat(m))), ++f, Yh)).split(Yh);
  return { values: o, split: p, indexes: i, types: a };
}
function f_(e) {
  return go(e).values;
}
function mv({ split: e, types: t }) {
  const o = e.length;
  return (i) => {
    let a = "";
    for (let f = 0; f < o; f++)
      if (a += e[f], i[f] !== void 0) {
        const d = t[f];
        d === fv ? a += gi(i[f]) : d === pv ? a += Be.transform(i[f]) : a += i[f];
      }
    return a;
  };
}
function p_(e) {
  return mv(go(e));
}
const m_ = (e) => typeof e == "number" ? 0 : Be.test(e) ? Be.getAnimatableNone(e) : e, h_ = (e, t) => typeof e == "number" ? t != null && t.trim().endsWith("/") ? e : 0 : m_(e);
function y_(e) {
  const t = go(e);
  return mv(t)(t.values.map((i, a) => h_(i, t.split[a])));
}
const Wt = {
  test: l_,
  parse: f_,
  createTransformer: p_,
  getAnimatableNone: y_
};
function ac(e, t, o) {
  return o < 0 && (o += 1), o > 1 && (o -= 1), o < 1 / 6 ? e + (t - e) * 6 * o : o < 1 / 2 ? t : o < 2 / 3 ? e + (t - e) * (2 / 3 - o) * 6 : e;
}
function g_({ hue: e, saturation: t, lightness: o, alpha: i }) {
  e /= 360, t /= 100, o /= 100;
  let a = 0, f = 0, d = 0;
  if (!t)
    a = f = d = o;
  else {
    const p = o < 0.5 ? o * (1 + t) : o + t - o * t, m = 2 * o - p;
    a = ac(m, p, e + 1 / 3), f = ac(m, p, e), d = ac(m, p, e - 1 / 3);
  }
  return {
    red: Math.round(a * 255),
    green: Math.round(f * 255),
    blue: Math.round(d * 255),
    alpha: i
  };
}
function Ma(e, t) {
  return (o) => o > 0 ? t : e;
}
const Ce = (e, t, o) => e + (t - e) * o, lc = (e, t, o) => {
  const i = e * e, a = o * (t * t - i) + i;
  return a < 0 ? 0 : Math.sqrt(a);
}, v_ = [Nc, wr, co], S_ = (e) => v_.find((t) => t.test(e));
function Xh(e) {
  const t = S_(e);
  if (Ni(!!t, `'${e}' is not an animatable color. Use the equivalent color code instead.`, "color-not-animatable"), !t)
    return !1;
  let o = t.parse(e);
  return t === co && (o = g_(o)), o;
}
const Qh = (e, t) => {
  const o = Xh(e), i = Xh(t);
  if (!o || !i)
    return Ma(e, t);
  const a = { ...o };
  return (f) => (a.red = lc(o.red, i.red, f), a.green = lc(o.green, i.green, f), a.blue = lc(o.blue, i.blue, f), a.alpha = Ce(o.alpha, i.alpha, f), wr.transform(a));
}, jc = /* @__PURE__ */ new Set(["none", "hidden"]);
function w_(e, t) {
  return jc.has(e) ? (o) => o <= 0 ? e : t : (o) => o >= 1 ? t : e;
}
function x_(e, t) {
  return (o) => Ce(e, t, o);
}
function $d(e) {
  return typeof e == "number" ? x_ : typeof e == "string" ? Vd(e) ? Ma : Be.test(e) ? Qh : k_ : Array.isArray(e) ? hv : typeof e == "object" ? Be.test(e) ? Qh : __ : Ma;
}
function hv(e, t) {
  const o = [...e], i = o.length, a = e.map((f, d) => $d(f)(f, t[d]));
  return (f) => {
    for (let d = 0; d < i; d++)
      o[d] = a[d](f);
    return o;
  };
}
function __(e, t) {
  const o = { ...e, ...t }, i = {};
  for (const a in o)
    e[a] !== void 0 && t[a] !== void 0 && (i[a] = $d(e[a])(e[a], t[a]));
  return (a) => {
    for (const f in i)
      o[f] = i[f](a);
    return o;
  };
}
function T_(e, t) {
  const o = [], i = { color: 0, var: 0, number: 0 };
  for (let a = 0; a < t.values.length; a++) {
    const f = t.types[a], d = e.indexes[f][i[f]], p = e.values[d] ?? 0;
    o[a] = p, i[f]++;
  }
  return o;
}
const k_ = (e, t) => {
  const o = Wt.createTransformer(t), i = go(e), a = go(t);
  return i.indexes.var.length === a.indexes.var.length && i.indexes.color.length === a.indexes.color.length && i.indexes.number.length >= a.indexes.number.length ? jc.has(e) && !a.values.length || jc.has(t) && !i.values.length ? w_(e, t) : ji(hv(T_(i, a), a.values), o) : (Ni(!0, `Complex values '${e}' and '${t}' too different to mix. Ensure all colors are of the same type, and that each contains the same quantity of number and color values. Falling back to instant transition.`, "complex-values-different"), Ma(e, t));
};
function yv(e, t, o) {
  return typeof e == "number" && typeof t == "number" && typeof o == "number" ? Ce(e, t, o) : $d(e)(e, t);
}
const A_ = (e) => {
  const t = ({ timestamp: o }) => e(o);
  return {
    start: (o = !0) => ke.update(t, o),
    stop: () => Sn(t),
    /**
     * If we're processing this frame we can use the
     * framelocked timestamp to keep things in sync.
     */
    now: () => qe.isProcessing ? qe.timestamp : lt.now()
  };
}, gv = (e, t, o = 10) => {
  let i = "";
  const a = Math.max(Math.round(t / o), 2);
  for (let f = 0; f < a; f++)
    i += Math.round(e(f / (a - 1)) * 1e4) / 1e4 + ", ";
  return `linear(${i.substring(0, i.length - 2)})`;
}, Ra = 2e4;
function Ud(e) {
  let t = 0;
  const o = 50;
  let i = e.next(t);
  for (; !i.done && t < Ra; )
    t += o, i = e.next(t);
  return t >= Ra ? 1 / 0 : t;
}
function b_(e, t = 100, o) {
  const i = o({ ...e, keyframes: [0, t] }), a = Math.min(Ud(i), Ra);
  return {
    type: "keyframes",
    ease: (f) => i.next(a * f).value / t,
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
function Ic(e, t) {
  return e * Math.sqrt(1 - t * t);
}
const C_ = 12;
function P_(e, t, o) {
  let i = o;
  for (let a = 1; a < C_; a++)
    i = i - e(i) / t(i);
  return i;
}
const uc = 1e-3;
function E_({ duration: e = Fe.duration, bounce: t = Fe.bounce, velocity: o = Fe.velocity, mass: i = Fe.mass }) {
  let a, f;
  Ni(e <= /* @__PURE__ */ gt(Fe.maxDuration), "Spring duration must be 10 seconds or less", "spring-duration-limit");
  let d = 1 - t;
  d = sn(Fe.minDamping, Fe.maxDamping, d), e = sn(Fe.minDuration, Fe.maxDuration, /* @__PURE__ */ Nt(e)), d < 1 ? (a = (y) => {
    const S = y * d, l = S * e, c = S - o, g = Ic(y, d), w = Math.exp(-l);
    return uc - c / g * w;
  }, f = (y) => {
    const l = y * d * e, c = l * o + o, g = Math.pow(d, 2) * Math.pow(y, 2) * e, w = Math.exp(-l), T = Ic(Math.pow(y, 2), d);
    return (-a(y) + uc > 0 ? -1 : 1) * ((c - g) * w) / T;
  }) : (a = (y) => {
    const S = Math.exp(-y * e), l = (y - o) * e + 1;
    return -uc + S * l;
  }, f = (y) => {
    const S = Math.exp(-y * e), l = (o - y) * (e * e);
    return S * l;
  });
  const p = 5 / e, m = P_(a, f, p);
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
const M_ = ["duration", "bounce"], R_ = ["stiffness", "damping", "mass"];
function Zh(e, t) {
  return t.some((o) => e[o] !== void 0);
}
function D_(e) {
  let t = {
    velocity: Fe.velocity,
    stiffness: Fe.stiffness,
    damping: Fe.damping,
    mass: Fe.mass,
    isResolvedFromDuration: !1,
    ...e
  };
  if (!Zh(e, R_) && Zh(e, M_))
    if (t.velocity = 0, e.visualDuration) {
      const o = e.visualDuration, i = 2 * Math.PI / (o * 1.2), a = i * i, f = 2 * sn(0.05, 1, 1 - (e.bounce || 0)) * Math.sqrt(a);
      t = {
        ...t,
        mass: Fe.mass,
        stiffness: a,
        damping: f
      };
    } else {
      const o = E_({ ...e, velocity: 0 });
      t = {
        ...t,
        ...o,
        mass: Fe.mass
      }, t.isResolvedFromDuration = !0;
    }
  return t;
}
function Da(e = Fe.visualDuration, t = Fe.bounce) {
  const o = typeof e != "object" ? {
    visualDuration: e,
    keyframes: [0, 1],
    bounce: t
  } : e;
  let { restSpeed: i, restDelta: a } = o;
  const f = o.keyframes[0], d = o.keyframes[o.keyframes.length - 1], p = { done: !1, value: f }, { stiffness: m, damping: y, mass: S, duration: l, velocity: c, isResolvedFromDuration: g } = D_({
    ...o,
    velocity: -/* @__PURE__ */ Nt(o.velocity || 0)
  }), w = c || 0, T = y / (2 * Math.sqrt(m * S)), A = d - f, _ = /* @__PURE__ */ Nt(Math.sqrt(m / S)), C = Math.abs(A) < 5;
  i || (i = C ? Fe.restSpeed.granular : Fe.restSpeed.default), a || (a = C ? Fe.restDelta.granular : Fe.restDelta.default);
  let E, N, L, W, H, Y;
  if (T < 1)
    L = Ic(_, T), W = (w + T * _ * A) / L, E = (Q) => {
      const ie = Math.exp(-T * _ * Q);
      return d - ie * (W * Math.sin(L * Q) + A * Math.cos(L * Q));
    }, H = T * _ * W + A * L, Y = T * _ * A - W * L, N = (Q) => Math.exp(-T * _ * Q) * (H * Math.sin(L * Q) + Y * Math.cos(L * Q));
  else if (T === 1) {
    E = (ie) => d - Math.exp(-_ * ie) * (A + (w + _ * A) * ie);
    const Q = w + _ * A;
    N = (ie) => Math.exp(-_ * ie) * (_ * Q * ie - w);
  } else {
    const Q = _ * Math.sqrt(T * T - 1);
    E = (ue) => {
      const ye = Math.exp(-T * _ * ue), me = Math.min(Q * ue, 300);
      return d - ye * ((w + T * _ * A) * Math.sinh(me) + Q * A * Math.cosh(me)) / Q;
    };
    const ie = (w + T * _ * A) / Q, J = T * _ * ie - A * Q, ce = T * _ * A - ie * Q;
    N = (ue) => {
      const ye = Math.exp(-T * _ * ue), me = Math.min(Q * ue, 300);
      return ye * (J * Math.sinh(me) + ce * Math.cosh(me));
    };
  }
  const V = {
    calculatedDuration: g && l || null,
    velocity: (Q) => /* @__PURE__ */ gt(N(Q)),
    next: (Q) => {
      if (!g && T < 1) {
        const J = Math.exp(-T * _ * Q), ce = Math.sin(L * Q), ue = Math.cos(L * Q), ye = d - J * (W * ce + A * ue), me = /* @__PURE__ */ gt(J * (H * ce + Y * ue));
        return p.done = Math.abs(me) <= i && Math.abs(d - ye) <= a, p.value = p.done ? d : ye, p;
      }
      const ie = E(Q);
      if (g)
        p.done = Q >= l;
      else {
        const J = /* @__PURE__ */ gt(N(Q));
        p.done = Math.abs(J) <= i && Math.abs(d - ie) <= a;
      }
      return p.value = p.done ? d : ie, p;
    },
    toString: () => {
      const Q = Math.min(Ud(V), Ra), ie = gv((J) => V.next(Q * J).value, Q, 30);
      return Q + "ms " + ie;
    },
    toTransition: () => {
    }
  };
  return V;
}
Da.applyToOptions = (e) => {
  const t = b_(e, 100, Da);
  return e.ease = t.ease, e.duration = /* @__PURE__ */ gt(t.duration), e.type = "keyframes", e;
};
const N_ = 5;
function vv(e, t, o) {
  const i = Math.max(t - N_, 0);
  return /* @__PURE__ */ Zg(o - e(i), t - i);
}
function Fc({ keyframes: e, velocity: t = 0, power: o = 0.8, timeConstant: i = 325, bounceDamping: a = 10, bounceStiffness: f = 500, modifyTarget: d, min: p, max: m, restDelta: y = 0.5, restSpeed: S }) {
  const l = e[0], c = {
    done: !1,
    value: l
  }, g = (Y) => p !== void 0 && Y < p || m !== void 0 && Y > m, w = (Y) => p === void 0 ? m : m === void 0 || Math.abs(p - Y) < Math.abs(m - Y) ? p : m;
  let T = o * t;
  const A = l + T, _ = d === void 0 ? A : d(A);
  _ !== A && (T = _ - l);
  const C = (Y) => -T * Math.exp(-Y / i), E = (Y) => _ + C(Y), N = (Y) => {
    const V = C(Y), Q = E(Y);
    c.done = Math.abs(V) <= y, c.value = c.done ? _ : Q;
  };
  let L, W;
  const H = (Y) => {
    g(c.value) && (L = Y, W = Da({
      keyframes: [c.value, w(c.value)],
      velocity: vv(E, Y, c.value),
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
      let V = !1;
      return !W && L === void 0 && (V = !0, N(Y), H(Y)), L !== void 0 && Y >= L ? W.next(Y - L) : (!V && N(Y), c);
    }
  };
}
function j_(e, t, o) {
  const i = [], a = o || Qn.mix || yv, f = e.length - 1;
  for (let d = 0; d < f; d++) {
    let p = a(e[d], e[d + 1]);
    if (t) {
      const m = Array.isArray(t) ? t[d] || jt : t;
      p = ji(m, p);
    }
    i.push(p);
  }
  return i;
}
function Sv(e, t, { clamp: o = !0, ease: i, mixer: a } = {}) {
  const f = e.length;
  if (Er(f === t.length, "Both input and output ranges must be the same length", "range-length"), f === 1)
    return () => t[0];
  if (f === 2 && t[0] === t[1])
    return () => t[1];
  const d = e[0] === e[1];
  e[0] > e[f - 1] && (e = [...e].reverse(), t = [...t].reverse());
  const p = j_(t, i, a), m = p.length, y = (S) => {
    if (d && S < e[0])
      return t[0];
    let l = 0;
    if (m > 1)
      for (; l < e.length - 2 && !(S < e[l + 1]); l++)
        ;
    const c = /* @__PURE__ */ Ai(e[l], e[l + 1], S);
    return p[l](c);
  };
  return o ? (S) => y(sn(e[0], e[f - 1], S)) : y;
}
function I_(e, t) {
  const o = e[e.length - 1];
  for (let i = 1; i <= t; i++) {
    const a = /* @__PURE__ */ Ai(0, t, i);
    e.push(Ce(o, 1, a));
  }
}
function F_(e) {
  const t = [0];
  return I_(t, e.length - 1), t;
}
function O_(e, t) {
  return e.map((o) => o * t);
}
function L_(e, t) {
  return e.map(() => t || sv).splice(0, e.length - 1);
}
function vi({ duration: e = 300, keyframes: t, times: o, ease: i = "easeInOut" }) {
  const a = /* @__PURE__ */ Y1(i) ? i.map(Wh) : Wh(i), f = {
    done: !1,
    value: t[0]
  }, d = O_(
    // Only use the provided offsets if they're the correct length
    // TODO Maybe we should warn here if there's a length mismatch
    o && o.length === t.length ? o : F_(t),
    e
  ), p = Sv(d, t, {
    ease: Array.isArray(a) ? a : L_(t, a)
  });
  return {
    calculatedDuration: e,
    next: (m) => (f.value = p(m), f.done = m >= e, f)
  };
}
const V_ = (e) => e !== null;
function Qa(e, { repeat: t, repeatType: o = "loop" }, i, a = 1) {
  const f = e.filter(V_), p = a < 0 || t && o !== "loop" && t % 2 === 1 ? 0 : f.length - 1;
  return !p || i === void 0 ? f[p] : i;
}
const z_ = {
  decay: Fc,
  inertia: Fc,
  tween: vi,
  keyframes: vi,
  spring: Da
};
function wv(e) {
  typeof e.type == "string" && (e.type = z_[e.type]);
}
class Hd {
  constructor() {
    this.updateFinished();
  }
  get finished() {
    return this._finished;
  }
  updateFinished() {
    this._finished = new Promise((t) => {
      this.resolve = t;
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
  then(t, o) {
    return this.finished.then(t, o);
  }
}
const B_ = (e) => e / 100;
class Ci extends Hd {
  constructor(t) {
    super(), this.state = "idle", this.startTime = null, this.isStopped = !1, this.currentTime = 0, this.holdTime = null, this.playbackSpeed = 1, this.delayState = {
      done: !1,
      value: void 0
    }, this.stop = () => {
      var i, a;
      const { motionValue: o } = this.options;
      o && o.updatedAt !== lt.now() && this.tick(lt.now()), this.isStopped = !0, this.state !== "idle" && (this.teardown(), (a = (i = this.options).onStop) == null || a.call(i));
    }, this.options = t, this.initAnimation(), this.play(), t.autoplay === !1 && this.pause();
  }
  initAnimation() {
    const { options: t } = this;
    wv(t);
    const { type: o = vi, repeat: i = 0, repeatDelay: a = 0, repeatType: f, velocity: d = 0 } = t;
    let { keyframes: p } = t;
    const m = o || vi;
    m !== vi && typeof p[0] != "number" && (this.mixKeyframes = ji(B_, yv(p[0], p[1])), p = [0, 100]);
    const y = m({ ...t, keyframes: p });
    f === "mirror" && (this.mirroredGenerator = m({
      ...t,
      keyframes: [...p].reverse(),
      velocity: -d
    })), y.calculatedDuration === null && (y.calculatedDuration = Ud(y));
    const { calculatedDuration: S } = y;
    this.calculatedDuration = S, this.resolvedDuration = S + a, this.totalDuration = this.resolvedDuration * (i + 1) - a, this.generator = y;
  }
  updateTime(t) {
    const o = Math.round(t - this.startTime) * this.playbackSpeed;
    this.holdTime !== null ? this.currentTime = this.holdTime : this.currentTime = o;
  }
  tick(t, o = !1) {
    const { generator: i, totalDuration: a, mixKeyframes: f, mirroredGenerator: d, resolvedDuration: p, calculatedDuration: m } = this;
    if (this.startTime === null)
      return i.next(0);
    const { delay: y = 0, keyframes: S, repeat: l, repeatType: c, repeatDelay: g, type: w, onUpdate: T, finalKeyframe: A } = this.options;
    this.speed > 0 ? this.startTime = Math.min(this.startTime, t) : this.speed < 0 && (this.startTime = Math.min(t - a / this.speed, this.startTime)), o ? this.currentTime = t : this.updateTime(t);
    const _ = this.currentTime - y * (this.playbackSpeed >= 0 ? 1 : -1), C = this.playbackSpeed >= 0 ? _ < 0 : _ > a;
    this.currentTime = Math.max(_, 0), this.state === "finished" && this.holdTime === null && (this.currentTime = a);
    let E = this.currentTime, N = i;
    if (l) {
      const Y = Math.min(this.currentTime, a) / p;
      let V = Math.floor(Y), Q = Y % 1;
      !Q && Y >= 1 && (Q = 1), Q === 1 && V--, V = Math.min(V, l + 1), !!(V % 2) && (c === "reverse" ? (Q = 1 - Q, g && (Q -= g / p)) : c === "mirror" && (N = d)), E = sn(0, 1, Q) * p;
    }
    let L;
    C ? (this.delayState.value = S[0], L = this.delayState) : L = N.next(E), f && !C && (L.value = f(L.value));
    let { done: W } = L;
    !C && m !== null && (W = this.playbackSpeed >= 0 ? this.currentTime >= a : this.currentTime <= 0);
    const H = this.holdTime === null && (this.state === "finished" || this.state === "running" && W);
    return H && w !== Fc && (L.value = Qa(S, this.options, A, this.speed)), T && T(L.value), H && this.finish(), L;
  }
  /**
   * Allows the returned animation to be awaited or promise-chained. Currently
   * resolves when the animation finishes at all but in a future update could/should
   * reject if its cancels.
   */
  then(t, o) {
    return this.finished.then(t, o);
  }
  get duration() {
    return /* @__PURE__ */ Nt(this.calculatedDuration);
  }
  get iterationDuration() {
    const { delay: t = 0 } = this.options || {};
    return this.duration + /* @__PURE__ */ Nt(t);
  }
  get time() {
    return /* @__PURE__ */ Nt(this.currentTime);
  }
  set time(t) {
    t = /* @__PURE__ */ gt(t), this.currentTime = t, this.startTime === null || this.holdTime !== null || this.playbackSpeed === 0 ? this.holdTime = t : this.driver && (this.startTime = this.driver.now() - t / this.playbackSpeed), this.driver ? this.driver.start(!1) : (this.startTime = 0, this.state = "paused", this.holdTime = t, this.tick(t));
  }
  /**
   * Returns the generator's velocity at the current time in units/second.
   * Uses the analytical derivative when available (springs), avoiding
   * the MotionValue's frame-dependent velocity estimation.
   */
  getGeneratorVelocity() {
    const t = this.currentTime;
    if (t <= 0)
      return this.options.velocity || 0;
    if (this.generator.velocity)
      return this.generator.velocity(t);
    const o = this.generator.next(t).value;
    return vv((i) => this.generator.next(i).value, t, o);
  }
  get speed() {
    return this.playbackSpeed;
  }
  set speed(t) {
    const o = this.playbackSpeed !== t;
    o && this.driver && this.updateTime(lt.now()), this.playbackSpeed = t, o && this.driver && (this.time = /* @__PURE__ */ Nt(this.currentTime));
  }
  play() {
    var a, f;
    if (this.isStopped)
      return;
    const { driver: t = A_, startTime: o } = this.options;
    this.driver || (this.driver = t((d) => this.tick(d))), (f = (a = this.options).onPlay) == null || f.call(a);
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
    var t, o;
    this.notifyFinished(), this.teardown(), this.state = "finished", (o = (t = this.options).onComplete) == null || o.call(t);
  }
  cancel() {
    var t, o;
    this.holdTime = null, this.startTime = 0, this.tick(0), this.teardown(), (o = (t = this.options).onCancel) == null || o.call(t);
  }
  teardown() {
    this.state = "idle", this.stopDriver(), this.startTime = this.holdTime = null;
  }
  stopDriver() {
    this.driver && (this.driver.stop(), this.driver = void 0);
  }
  sample(t) {
    return this.startTime = 0, this.tick(t, !0);
  }
  attachTimeline(t) {
    var o;
    return this.options.allowFlatten && (this.options.type = "keyframes", this.options.ease = "linear", this.initAnimation()), (o = this.driver) == null || o.stop(), t.observe(this);
  }
}
function $_(e) {
  for (let t = 1; t < e.length; t++)
    e[t] ?? (e[t] = e[t - 1]);
}
const xr = (e) => e * 180 / Math.PI, Oc = (e) => {
  const t = xr(Math.atan2(e[1], e[0]));
  return Lc(t);
}, U_ = {
  x: 4,
  y: 5,
  translateX: 4,
  translateY: 5,
  scaleX: 0,
  scaleY: 3,
  scale: (e) => (Math.abs(e[0]) + Math.abs(e[3])) / 2,
  rotate: Oc,
  rotateZ: Oc,
  skewX: (e) => xr(Math.atan(e[1])),
  skewY: (e) => xr(Math.atan(e[2])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[2])) / 2
}, Lc = (e) => (e = e % 360, e < 0 && (e += 360), e), Jh = Oc, qh = (e) => Math.sqrt(e[0] * e[0] + e[1] * e[1]), ey = (e) => Math.sqrt(e[4] * e[4] + e[5] * e[5]), H_ = {
  x: 12,
  y: 13,
  z: 14,
  translateX: 12,
  translateY: 13,
  translateZ: 14,
  scaleX: qh,
  scaleY: ey,
  scale: (e) => (qh(e) + ey(e)) / 2,
  rotateX: (e) => Lc(xr(Math.atan2(e[6], e[5]))),
  rotateY: (e) => Lc(xr(Math.atan2(-e[2], e[0]))),
  rotateZ: Jh,
  rotate: Jh,
  skewX: (e) => xr(Math.atan(e[4])),
  skewY: (e) => xr(Math.atan(e[1])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[4])) / 2
};
function Vc(e) {
  return e.includes("scale") ? 1 : 0;
}
function zc(e, t) {
  if (!e || e === "none")
    return Vc(t);
  const o = e.match(/^matrix3d\(([-\d.e\s,]+)\)$/u);
  let i, a;
  if (o)
    i = H_, a = o;
  else {
    const p = e.match(/^matrix\(([-\d.e\s,]+)\)$/u);
    i = U_, a = p;
  }
  if (!a)
    return Vc(t);
  const f = i[t], d = a[1].split(",").map(G_);
  return typeof f == "function" ? f(d) : d[f];
}
const W_ = (e, t) => {
  const { transform: o = "none" } = getComputedStyle(e);
  return zc(o, t);
};
function G_(e) {
  return parseFloat(e.trim());
}
const xo = [
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
], _o = /* @__PURE__ */ new Set([...xo, "pathRotation"]), ty = (e) => e === wo || e === ne, K_ = /* @__PURE__ */ new Set(["x", "y", "z"]), Y_ = xo.filter((e) => !K_.has(e));
function X_(e) {
  const t = [];
  return Y_.forEach((o) => {
    const i = e.getValue(o);
    i !== void 0 && (t.push([o, i.get()]), i.set(o.startsWith("scale") ? 1 : 0));
  }), t;
}
const Kn = {
  // Dimensions
  width: ({ x: e }, { paddingLeft: t = "0", paddingRight: o = "0", boxSizing: i }) => {
    const a = e.max - e.min;
    return i === "border-box" ? a : a - parseFloat(t) - parseFloat(o);
  },
  height: ({ y: e }, { paddingTop: t = "0", paddingBottom: o = "0", boxSizing: i }) => {
    const a = e.max - e.min;
    return i === "border-box" ? a : a - parseFloat(t) - parseFloat(o);
  },
  top: (e, { top: t }) => parseFloat(t),
  left: (e, { left: t }) => parseFloat(t),
  bottom: ({ y: e }, { top: t }) => parseFloat(t) + (e.max - e.min),
  right: ({ x: e }, { left: t }) => parseFloat(t) + (e.max - e.min),
  // Transform
  x: (e, { transform: t }) => zc(t, "x"),
  y: (e, { transform: t }) => zc(t, "y")
};
Kn.translateX = Kn.x;
Kn.translateY = Kn.y;
const Tr = /* @__PURE__ */ new Set();
let Bc = !1, $c = !1, Uc = !1;
function xv() {
  if ($c) {
    const e = Array.from(Tr).filter((i) => i.needsMeasurement), t = new Set(e.map((i) => i.element)), o = /* @__PURE__ */ new Map();
    t.forEach((i) => {
      const a = X_(i);
      a.length && (o.set(i, a), i.render());
    }), e.forEach((i) => i.measureInitialState()), t.forEach((i) => {
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
  $c = !1, Bc = !1, Tr.forEach((e) => e.complete(Uc)), Tr.clear();
}
function _v() {
  Tr.forEach((e) => {
    e.readKeyframes(), e.needsMeasurement && ($c = !0);
  });
}
function Q_() {
  Uc = !0, _v(), xv(), Uc = !1;
}
class Wd {
  constructor(t, o, i, a, f, d = !1) {
    this.state = "pending", this.isAsync = !1, this.needsMeasurement = !1, this.unresolvedKeyframes = [...t], this.onComplete = o, this.name = i, this.motionValue = a, this.element = f, this.isAsync = d;
  }
  scheduleResolve() {
    this.state = "scheduled", this.isAsync ? (Tr.add(this), Bc || (Bc = !0, ke.read(_v), ke.resolveKeyframes(xv))) : (this.readKeyframes(), this.complete());
  }
  readKeyframes() {
    const { unresolvedKeyframes: t, name: o, element: i, motionValue: a } = this;
    if (t[0] === null) {
      const f = a == null ? void 0 : a.get(), d = t[t.length - 1];
      if (f !== void 0)
        t[0] = f;
      else if (i && o) {
        const p = i.readValue(o, d);
        p != null && (t[0] = p);
      }
      t[0] === void 0 && (t[0] = d), a && f === void 0 && a.set(t[0]);
    }
    $_(t);
  }
  setFinalKeyframe() {
  }
  measureInitialState() {
  }
  renderEndStyles() {
  }
  measureEndState() {
  }
  complete(t = !1) {
    this.state = "complete", this.onComplete(this.unresolvedKeyframes, this.finalKeyframe, t), Tr.delete(this);
  }
  cancel() {
    this.state === "scheduled" && (Tr.delete(this), this.state = "pending");
  }
  resume() {
    this.state === "pending" && this.scheduleResolve();
  }
}
const Z_ = (e) => e.startsWith("--");
function Tv(e, t, o) {
  Z_(t) ? e.style.setProperty(t, o) : e.style[t] = o;
}
const J_ = {};
function kv(e, t) {
  const o = /* @__PURE__ */ Qg(e);
  return () => J_[t] ?? o();
}
const q_ = /* @__PURE__ */ kv(() => window.ScrollTimeline !== void 0, "scrollTimeline"), Av = /* @__PURE__ */ kv(() => {
  try {
    document.createElement("div").animate({ opacity: 0 }, { easing: "linear(0, 1)" });
  } catch {
    return !1;
  }
  return !0;
}, "linearEasing"), hi = ([e, t, o, i]) => `cubic-bezier(${e}, ${t}, ${o}, ${i})`, ny = {
  linear: "linear",
  ease: "ease",
  easeIn: "ease-in",
  easeOut: "ease-out",
  easeInOut: "ease-in-out",
  circIn: /* @__PURE__ */ hi([0, 0.65, 0.55, 1]),
  circOut: /* @__PURE__ */ hi([0.55, 0, 1, 0.45]),
  backIn: /* @__PURE__ */ hi([0.31, 0.01, 0.66, -0.59]),
  backOut: /* @__PURE__ */ hi([0.33, 1.53, 0.69, 0.99])
};
function bv(e, t) {
  if (e)
    return typeof e == "function" ? Av() ? gv(e, t) : "ease-out" : /* @__PURE__ */ av(e) ? hi(e) : Array.isArray(e) ? e.map((o) => bv(o, t) || ny.easeOut) : ny[e];
}
function eT(e, t, o, { delay: i = 0, duration: a = 300, repeat: f = 0, repeatType: d = "loop", ease: p = "easeOut", times: m } = {}, y = void 0) {
  const S = {
    [t]: o
  };
  m && (S.offset = m);
  const l = bv(p, a);
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
function Cv(e) {
  return typeof e == "function" && "applyToOptions" in e;
}
function tT({ type: e, ...t }) {
  return Cv(e) && Av() ? e.applyToOptions(t) : (t.duration ?? (t.duration = 300), t.ease ?? (t.ease = "easeOut"), t);
}
class Pv extends Hd {
  constructor(t) {
    if (super(), this.finishedTime = null, this.isStopped = !1, this.manualStartTime = null, !t)
      return;
    const { element: o, name: i, keyframes: a, pseudoElement: f, allowFlatten: d = !1, finalKeyframe: p, onComplete: m } = t;
    this.isPseudoElement = !!f, this.allowFlatten = d, this.options = t, Er(typeof t.type != "string", `Mini animate() doesn't support "type" as a string.`, "mini-spring");
    const y = tT(t);
    this.animation = eT(o, i, a, y, f), y.autoplay === !1 && this.animation.pause(), this.animation.onfinish = () => {
      if (this.finishedTime = this.time, !f) {
        const S = Qa(a, this.options, p, this.speed);
        this.updateMotionValue && this.updateMotionValue(S), Tv(o, i, S), this.animation.cancel();
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
    var t, o;
    (o = (t = this.animation).finish) == null || o.call(t);
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
    const { state: t } = this;
    t === "idle" || t === "finished" || (this.updateMotionValue ? this.updateMotionValue() : this.commitStyles(), this.isPseudoElement || this.cancel());
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
    const t = (o = this.options) == null ? void 0 : o.element;
    !this.isPseudoElement && (t != null && t.isConnected) && ((a = (i = this.animation).commitStyles) == null || a.call(i));
  }
  get duration() {
    var o, i;
    const t = ((i = (o = this.animation.effect) == null ? void 0 : o.getComputedTiming) == null ? void 0 : i.call(o).duration) || 0;
    return /* @__PURE__ */ Nt(Number(t));
  }
  get iterationDuration() {
    const { delay: t = 0 } = this.options || {};
    return this.duration + /* @__PURE__ */ Nt(t);
  }
  get time() {
    return /* @__PURE__ */ Nt(Number(this.animation.currentTime) || 0);
  }
  set time(t) {
    const o = this.finishedTime !== null;
    this.manualStartTime = null, this.finishedTime = null, this.animation.currentTime = /* @__PURE__ */ gt(t), o && this.animation.pause();
  }
  /**
   * The playback speed of the animation.
   * 1 = normal speed, 2 = double speed, 0.5 = half speed.
   */
  get speed() {
    return this.animation.playbackRate;
  }
  set speed(t) {
    t < 0 && (this.finishedTime = null), this.animation.playbackRate = t;
  }
  get state() {
    return this.finishedTime !== null ? "finished" : this.animation.playState;
  }
  get startTime() {
    return this.manualStartTime ?? Number(this.animation.startTime);
  }
  set startTime(t) {
    this.manualStartTime = this.animation.startTime = t;
  }
  /**
   * Attaches a timeline to the animation, for instance the `ScrollTimeline`.
   */
  attachTimeline({ timeline: t, rangeStart: o, rangeEnd: i, observe: a }) {
    var f;
    return this.allowFlatten && ((f = this.animation.effect) == null || f.updateTiming({ easing: "linear" })), this.animation.onfinish = null, t && q_() ? (this.animation.timeline = t, o && (this.animation.rangeStart = o), i && (this.animation.rangeEnd = i), jt) : a(this);
  }
}
const Ev = {
  anticipate: rv,
  backInOut: nv,
  circInOut: iv
};
function nT(e) {
  return e in Ev;
}
function rT(e) {
  typeof e.ease == "string" && nT(e.ease) && (e.ease = Ev[e.ease]);
}
const cc = 10;
class oT extends Pv {
  constructor(t) {
    rT(t), wv(t), super(t), t.startTime !== void 0 && t.autoplay !== !1 && (this.startTime = t.startTime), this.options = t;
  }
  /**
   * WAAPI doesn't natively have any interruption capabilities.
   *
   * Rather than read committed styles back out of the DOM, we can
   * create a renderless JS animation and sample it twice to calculate
   * its current value, "previous" value, and therefore allow
   * Motion to calculate velocity for any subsequent animation.
   */
  updateMotionValue(t) {
    const { motionValue: o, onUpdate: i, onComplete: a, element: f, ...d } = this.options;
    if (!o)
      return;
    if (t !== void 0) {
      o.set(t);
      return;
    }
    const p = new Ci({
      ...d,
      autoplay: !1
    }), m = Math.max(cc, lt.now() - this.startTime), y = sn(0, cc, m - cc), S = p.sample(m).value, { name: l } = this.options;
    f && l && Tv(f, l, S), o.setWithVelocity(p.sample(Math.max(0, m - y)).value, S, y), p.stop();
  }
}
const ry = (e, t) => t === "zIndex" ? !1 : !!(typeof e == "number" || Array.isArray(e) || typeof e == "string" && // It's animatable if we have a string
(Wt.test(e) || e === "0") && // And it contains numbers and/or colors
!e.startsWith("url("));
function iT(e) {
  const t = e[0];
  if (e.length === 1)
    return !0;
  for (let o = 0; o < e.length; o++)
    if (e[o] !== t)
      return !0;
}
function sT(e, t, o, i) {
  const a = e[0];
  if (a === null)
    return !1;
  if (t === "display" || t === "visibility")
    return !0;
  const f = e[e.length - 1], d = ry(a, t), p = ry(f, t);
  return Ni(d === p, `You are trying to animate ${t} from "${a}" to "${f}". "${d ? f : a}" is not an animatable value.`, "value-not-animatable"), !d || !p ? !1 : iT(e) || (o === "spring" || Cv(o)) && i;
}
function Hc(e) {
  e.duration = 0, e.type = "keyframes";
}
const Mv = /* @__PURE__ */ new Set([
  "opacity",
  "clipPath",
  "filter",
  "transform"
  // TODO: Can be accelerated but currently disabled until https://issues.chromium.org/issues/41491098 is resolved
  // or until we implement support for linear() easing.
  // "background-color"
]), aT = /^(?:oklch|oklab|lab|lch|color|color-mix|light-dark)\(/;
function lT(e) {
  for (let t = 0; t < e.length; t++)
    if (typeof e[t] == "string" && aT.test(e[t]))
      return !0;
  return !1;
}
const uT = /* @__PURE__ */ new Set([
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
]), cT = /* @__PURE__ */ Qg(() => Object.hasOwnProperty.call(Element.prototype, "animate"));
function dT(e) {
  var l;
  const { motionValue: t, name: o, repeatDelay: i, repeatType: a, damping: f, type: d, keyframes: p } = e;
  if (!(((l = t == null ? void 0 : t.owner) == null ? void 0 : l.current) instanceof HTMLElement))
    return !1;
  const { onUpdate: y, transformTemplate: S } = t.owner.getProps();
  return cT() && o && /**
   * Force WAAPI for color properties with browser-only color formats
   * (oklch, oklab, lab, lch, etc.) that the JS animation path can't parse.
   */
  (Mv.has(o) || uT.has(o) && lT(p)) && (o !== "transform" || !S) && /**
   * If we're outputting values to onUpdate then we can't use WAAPI as there's
   * no way to read the value from WAAPI every frame.
   */
  !y && !i && a !== "mirror" && f !== 0 && d !== "inertia";
}
const fT = 40;
class pT extends Hd {
  constructor({ autoplay: t = !0, delay: o = 0, type: i = "keyframes", repeat: a = 0, repeatDelay: f = 0, repeatType: d = "loop", keyframes: p, name: m, motionValue: y, element: S, ...l }) {
    var w;
    super(), this.stop = () => {
      var T, A;
      this._animation && (this._animation.stop(), (T = this.stopTimeline) == null || T.call(this)), (A = this.keyframeResolver) == null || A.cancel();
    }, this.createdAt = lt.now();
    const c = {
      autoplay: t,
      delay: o,
      type: i,
      repeat: a,
      repeatDelay: f,
      repeatType: d,
      name: m,
      motionValue: y,
      element: S,
      ...l
    }, g = (S == null ? void 0 : S.KeyframeResolver) || Wd;
    this.keyframeResolver = new g(p, (T, A, _) => this.onKeyframesResolved(T, A, c, !_), m, y, S), (w = this.keyframeResolver) == null || w.scheduleResolve();
  }
  onKeyframesResolved(t, o, i, a) {
    var _, C;
    this.keyframeResolver = void 0;
    const { name: f, type: d, velocity: p, delay: m, isHandoff: y, onUpdate: S } = i;
    this.resolvedAt = lt.now();
    let l = !0;
    sT(t, f, d, p) || (l = !1, (Qn.instantAnimations || !m) && (S == null || S(Qa(t, i, o))), t[0] = t[t.length - 1], Hc(i), i.repeat = 0);
    const g = {
      startTime: a ? this.resolvedAt ? this.resolvedAt - this.createdAt > fT ? this.resolvedAt : this.createdAt : this.createdAt : void 0,
      finalKeyframe: o,
      ...i,
      keyframes: t
    }, w = l && !y && dT(g), T = (C = (_ = g.motionValue) == null ? void 0 : _.owner) == null ? void 0 : C.current;
    let A;
    if (w)
      try {
        A = new oT({
          ...g,
          element: T
        });
      } catch {
        A = new Ci(g);
      }
    else
      A = new Ci(g);
    A.finished.then(() => {
      this.notifyFinished();
    }).catch(jt), this.pendingTimeline && (this.stopTimeline = A.attachTimeline(this.pendingTimeline), this.pendingTimeline = void 0), this._animation = A;
  }
  get finished() {
    return this._animation ? this.animation.finished : this._finished;
  }
  then(t, o) {
    return this.finished.finally(t).then(() => {
    });
  }
  get animation() {
    var t;
    return this._animation || ((t = this.keyframeResolver) == null || t.resume(), Q_()), this._animation;
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
  set time(t) {
    this.animation.time = t;
  }
  get speed() {
    return this.animation.speed;
  }
  get state() {
    return this.animation.state;
  }
  set speed(t) {
    this.animation.speed = t;
  }
  get startTime() {
    return this.animation.startTime;
  }
  attachTimeline(t) {
    return this._animation ? this.stopTimeline = this.animation.attachTimeline(t) : this.pendingTimeline = t, () => this.stop();
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
    var t;
    this._animation && this.animation.cancel(), (t = this.keyframeResolver) == null || t.cancel();
  }
}
function Rv(e, t, o, i = 0, a = 1) {
  const f = Array.from(e).sort((y, S) => y.sortNodePosition(S)).indexOf(t), d = e.size, p = (d - 1) * i;
  return typeof o == "function" ? o(f, d) : a === 1 ? f * i : p - f * i;
}
const oy = 30, mT = (e) => !isNaN(parseFloat(e)), Si = {
  current: void 0
};
class hT {
  /**
   * @param init - The initiating value
   * @param config - Optional configuration options
   *
   * -  `transformer`: A function to transform incoming values with.
   */
  constructor(t, o = {}) {
    this.canTrackVelocity = null, this.events = {}, this.updateAndNotify = (i) => {
      var f;
      const a = lt.now();
      if (this.updatedAt !== a && this.setPrevFrameValue(), this.prev = this.current, this.setCurrent(i), this.current !== this.prev && ((f = this.events.change) == null || f.notify(this.current), this.dependents))
        for (const d of this.dependents)
          d.dirty();
    }, this.hasAnimated = !1, this.setCurrent(t), this.owner = o.owner;
  }
  setCurrent(t) {
    this.current = t, this.updatedAt = lt.now(), this.canTrackVelocity === null && t !== void 0 && (this.canTrackVelocity = mT(this.current));
  }
  setPrevFrameValue(t = this.current) {
    this.prevFrameValue = t, this.prevUpdatedAt = this.updatedAt;
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
  onChange(t) {
    return this.on("change", t);
  }
  on(t, o) {
    this.events[t] || (this.events[t] = new Fd());
    const i = this.events[t].add(o);
    return t === "change" ? () => {
      i(), ke.read(() => {
        this.events.change.getSize() || this.stop();
      });
    } : i;
  }
  clearListeners() {
    for (const t in this.events)
      this.events[t].clear();
  }
  /**
   * Attaches a passive effect to the `MotionValue`.
   */
  attach(t, o) {
    this.passiveEffect = t, this.stopPassiveEffect = o;
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
  set(t) {
    this.passiveEffect ? this.passiveEffect(t, this.updateAndNotify) : this.updateAndNotify(t);
  }
  setWithVelocity(t, o, i) {
    this.set(o), this.prev = void 0, this.prevFrameValue = t, this.prevUpdatedAt = this.updatedAt - i;
  }
  /**
   * Set the state of the `MotionValue`, stopping any active animations,
   * effects, and resets velocity to `0`.
   */
  jump(t, o = !0) {
    this.updateAndNotify(t), this.prev = t, this.prevUpdatedAt = this.prevFrameValue = void 0, o && this.stop(), this.stopPassiveEffect && this.stopPassiveEffect();
  }
  dirty() {
    var t;
    (t = this.events.change) == null || t.notify(this.current);
  }
  addDependent(t) {
    this.dependents || (this.dependents = /* @__PURE__ */ new Set()), this.dependents.add(t);
  }
  removeDependent(t) {
    this.dependents && this.dependents.delete(t);
  }
  /**
   * Returns the latest state of `MotionValue`
   *
   * @returns - The latest state of `MotionValue`
   *
   * @public
   */
  get() {
    return Si.current && Si.current.push(this), this.current;
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
    const t = lt.now();
    if (!this.canTrackVelocity || this.prevFrameValue === void 0 || t - this.updatedAt > oy)
      return 0;
    const o = Math.min(this.updatedAt - this.prevUpdatedAt, oy);
    return /* @__PURE__ */ Zg(parseFloat(this.current) - parseFloat(this.prevFrameValue), o);
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
  start(t) {
    return this.stop(), new Promise((o) => {
      this.hasAnimated = !0, this.animation = t(o), this.events.animationStart && this.events.animationStart.notify();
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
    var t, o;
    (t = this.dependents) == null || t.clear(), (o = this.events.destroy) == null || o.notify(), this.clearListeners(), this.stop(), this.stopPassiveEffect && this.stopPassiveEffect();
  }
}
function Mr(e, t) {
  return new hT(e, t);
}
function Dv(e, t) {
  if (e != null && e.inherit && t) {
    const { inherit: o, ...i } = e;
    return { ...t, ...i };
  }
  return e;
}
function Gd(e, t) {
  const o = (e == null ? void 0 : e[t]) ?? (e == null ? void 0 : e.default) ?? e;
  return o !== e ? Dv(o, e) : o;
}
const yT = {
  type: "spring",
  stiffness: 500,
  damping: 25,
  restSpeed: 10
}, gT = (e) => ({
  type: "spring",
  stiffness: 550,
  damping: e === 0 ? 2 * Math.sqrt(550) : 30,
  restSpeed: 10
}), vT = {
  type: "keyframes",
  duration: 0.8
}, ST = {
  type: "keyframes",
  ease: [0.25, 0.1, 0.35, 1],
  duration: 0.3
}, wT = (e, { keyframes: t }) => t.length > 2 ? vT : _o.has(e) ? e.startsWith("scale") ? gT(t[1]) : yT : ST, xT = /* @__PURE__ */ new Set([
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
function _T(e) {
  for (const t in e)
    if (!xT.has(t))
      return !0;
  return !1;
}
const Kd = (e, t, o, i = {}, a, f) => (d) => {
  const p = Gd(i, e) || {}, m = p.delay || i.delay || 0;
  let { elapsed: y = 0 } = i;
  y = y - /* @__PURE__ */ gt(m);
  const S = {
    keyframes: Array.isArray(o) ? o : [null, o],
    ease: "easeOut",
    velocity: t.getVelocity(),
    ...p,
    delay: -y,
    onUpdate: (c) => {
      t.set(c), p.onUpdate && p.onUpdate(c);
    },
    onComplete: () => {
      d(), p.onComplete && p.onComplete();
    },
    name: e,
    motionValue: t,
    element: f ? void 0 : a
  };
  _T(p) || Object.assign(S, wT(e, S)), S.duration && (S.duration = /* @__PURE__ */ gt(S.duration)), S.repeatDelay && (S.repeatDelay = /* @__PURE__ */ gt(S.repeatDelay)), S.from !== void 0 && (S.keyframes[0] = S.from);
  let l = !1;
  if ((S.type === !1 || S.duration === 0 && !S.repeatDelay) && (Hc(S), S.delay === 0 && (l = !0)), (Qn.instantAnimations || Qn.skipAnimations || a != null && a.shouldSkipAnimations || p.skipAnimations) && (l = !0, Hc(S), S.delay = 0), S.allowFlatten = !p.type && !p.ease, l && !f && t.get() !== void 0) {
    const c = Qa(S.keyframes, p);
    if (c !== void 0) {
      ke.update(() => {
        S.onUpdate(c), S.onComplete();
      });
      return;
    }
  }
  return p.isSync ? new Ci(S) : new pT(S);
}, TT = (
  // eslint-disable-next-line redos-detector/no-unsafe-regex -- false positive, as it can match a lot of words
  /^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u
);
function kT(e) {
  const t = TT.exec(e);
  if (!t)
    return [,];
  const [, o, i, a] = t;
  return [`--${o ?? i}`, a];
}
const AT = 4;
function Nv(e, t, o = 1) {
  Er(o <= AT, `Max CSS variable fallback depth detected in property "${e}". This may indicate a circular fallback dependency.`, "max-css-var-depth");
  const [i, a] = kT(e);
  if (!i)
    return;
  const f = window.getComputedStyle(t).getPropertyValue(i);
  if (f) {
    const d = f.trim();
    return Kg(d) ? parseFloat(d) : d;
  }
  return Vd(a) ? Nv(a, t, o + 1) : a;
}
function iy(e) {
  const t = [{}, {}];
  return e == null || e.values.forEach((o, i) => {
    t[0][i] = o.get(), t[1][i] = o.getVelocity();
  }), t;
}
function Yd(e, t, o, i) {
  if (typeof t == "function") {
    const [a, f] = iy(i);
    t = t(o !== void 0 ? o : e.custom, a, f);
  }
  if (typeof t == "string" && (t = e.variants && e.variants[t]), typeof t == "function") {
    const [a, f] = iy(i);
    t = t(o !== void 0 ? o : e.custom, a, f);
  }
  return t;
}
function kr(e, t, o) {
  const i = e.getProps();
  return Yd(i, t, o !== void 0 ? o : i.custom, e);
}
const jv = /* @__PURE__ */ new Set([
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
  ...xo
]), Wc = (e) => Array.isArray(e);
function bT(e, t, o) {
  e.hasValue(t) ? e.getValue(t).set(o) : e.addValue(t, Mr(o));
}
function CT(e) {
  return Wc(e) ? e[e.length - 1] || 0 : e;
}
function PT(e, t) {
  const o = kr(e, t);
  let { transitionEnd: i = {}, transition: a = {}, ...f } = o || {};
  f = { ...f, ...i };
  for (const d in f) {
    const p = CT(f[d]);
    bT(e, d, p);
  }
}
const We = (e) => !!(e && e.getVelocity);
function ET(e) {
  return !!(We(e) && e.add);
}
function Gc(e, t) {
  const o = e.getValue("willChange");
  if (ET(o))
    return o.add(t);
  if (!o && Qn.WillChange) {
    const i = new Qn.WillChange("auto");
    e.addValue("willChange", i), i.add(t);
  }
}
function Xd(e) {
  return e.replace(/([A-Z])/g, (t) => `-${t.toLowerCase()}`);
}
const MT = "framerAppearId", Iv = "data-" + Xd(MT);
function Fv(e) {
  return e.props[Iv];
}
function RT({ protectedKeys: e, needsAnimating: t }, o) {
  const i = e.hasOwnProperty(o) && t[o] !== !0;
  return t[o] = !1, i;
}
function Ov(e, t, { delay: o = 0, transitionOverride: i, type: a } = {}) {
  let { transition: f, transitionEnd: d, ...p } = t;
  const m = e.getDefaultTransition();
  f = f ? Dv(f, m) : m;
  const y = f == null ? void 0 : f.reduceMotion, S = f == null ? void 0 : f.skipAnimations;
  i && (f = i);
  const l = [], c = a && e.animationState && e.animationState.getState()[a], g = f == null ? void 0 : f.path;
  g && g.animateVisualElement(e, p, f, o, l);
  for (const w in p) {
    const T = e.getValue(w, e.latestValues[w] ?? null), A = p[w];
    if (A === void 0 || c && RT(c, w))
      continue;
    const _ = {
      delay: o,
      ...Gd(f || {}, w)
    };
    S && (_.skipAnimations = !0);
    const C = T.get();
    if (C !== void 0 && !T.isAnimating() && !Array.isArray(A) && A === C && !_.velocity) {
      ke.update(() => T.set(A));
      continue;
    }
    let E = !1;
    if (window.MotionHandoffAnimation) {
      const W = Fv(e);
      if (W) {
        const H = window.MotionHandoffAnimation(W, w, ke);
        H !== null && (_.startTime = H, E = !0);
      }
    }
    Gc(e, w);
    const N = y ?? e.shouldReduceMotion;
    T.start(Kd(w, T, A, N && jv.has(w) ? { type: !1 } : _, e, E));
    const L = T.animation;
    L && l.push(L);
  }
  if (d) {
    const w = () => ke.update(() => {
      d && PT(e, d);
    });
    l.length ? Promise.all(l).then(w) : w();
  }
  return l;
}
function Kc(e, t, o = {}) {
  var m;
  const i = kr(e, t, o.type === "exit" ? (m = e.presenceContext) == null ? void 0 : m.custom : void 0);
  let { transition: a = e.getDefaultTransition() || {} } = i || {};
  o.transitionOverride && (a = o.transitionOverride);
  const f = i ? () => Promise.all(Ov(e, i, o)) : () => Promise.resolve(), d = e.variantChildren && e.variantChildren.size ? (y = 0) => {
    const { delayChildren: S = 0, staggerChildren: l, staggerDirection: c } = a;
    return DT(e, t, y, S, l, c, o);
  } : () => Promise.resolve(), { when: p } = a;
  if (p) {
    const [y, S] = p === "beforeChildren" ? [f, d] : [d, f];
    return y().then(() => S());
  } else
    return Promise.all([f(), d(o.delay)]);
}
function DT(e, t, o = 0, i = 0, a = 0, f = 1, d) {
  const p = [];
  for (const m of e.variantChildren)
    m.notify("AnimationStart", t), p.push(Kc(m, t, {
      ...d,
      delay: o + (typeof i == "function" ? 0 : i) + Rv(e.variantChildren, m, i, a, f)
    }).then(() => m.notify("AnimationComplete", t)));
  return Promise.all(p);
}
function NT(e, t, o = {}) {
  e.notify("AnimationStart", t);
  let i;
  if (Array.isArray(t)) {
    const a = t.map((f) => Kc(e, f, o));
    i = Promise.all(a);
  } else if (typeof t == "string")
    i = Kc(e, t, o);
  else {
    const a = typeof t == "function" ? kr(e, t, o.custom) : t;
    i = Promise.all(Ov(e, a, o));
  }
  return i.then(() => {
    e.notify("AnimationComplete", t);
  });
}
const jT = {
  test: (e) => e === "auto",
  parse: (e) => e
}, Lv = (e) => (t) => t.test(e), Vv = [wo, ne, on, hn, s_, i_, jT], sy = (e) => Vv.find(Lv(e));
function IT(e) {
  return typeof e == "number" ? e === 0 : e !== null ? e === "none" || e === "0" || Xg(e) : !0;
}
const FT = /* @__PURE__ */ new Set(["brightness", "contrast", "saturate", "opacity"]);
function OT(e) {
  const [t, o] = e.slice(0, -1).split("(");
  if (t === "drop-shadow")
    return e;
  const [i] = o.match(zd) || [];
  if (!i)
    return e;
  const a = o.replace(i, "");
  let f = FT.has(t) ? 1 : 0;
  return i !== o && (f *= 100), t + "(" + f + a + ")";
}
const LT = /\b([a-z-]*)\(.*?\)/gu, Yc = {
  ...Wt,
  getAnimatableNone: (e) => {
    const t = e.match(LT);
    return t ? t.map(OT).join(" ") : e;
  }
}, Xc = {
  ...Wt,
  getAnimatableNone: (e) => {
    const t = Wt.parse(e);
    return Wt.createTransformer(e)(t.map((i) => typeof i == "number" ? 0 : typeof i == "object" ? { ...i, alpha: 1 } : i));
  }
}, ay = {
  ...wo,
  transform: Math.round
}, VT = {
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
  scale: ea,
  scaleX: ea,
  scaleY: ea,
  scaleZ: ea,
  skew: hn,
  skewX: hn,
  skewY: hn,
  distance: ne,
  translateX: ne,
  translateY: ne,
  translateZ: ne,
  x: ne,
  y: ne,
  z: ne,
  perspective: ne,
  transformPerspective: ne,
  opacity: bi,
  originX: Kh,
  originY: Kh,
  originZ: ne
}, Na = {
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
  ...VT,
  zIndex: ay,
  // SVG
  fillOpacity: bi,
  strokeOpacity: bi,
  numOctaves: ay
}, zT = {
  ...Na,
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
  filter: Yc,
  WebkitFilter: Yc,
  mask: Xc,
  WebkitMask: Xc
}, zv = (e) => zT[e], BT = /* @__PURE__ */ new Set([Yc, Xc]);
function Bv(e, t) {
  let o = zv(e);
  return BT.has(o) || (o = Wt), o.getAnimatableNone ? o.getAnimatableNone(t) : void 0;
}
const $T = /* @__PURE__ */ new Set(["auto", "none", "0"]);
function UT(e, t, o) {
  let i = 0, a;
  for (; i < e.length && !a; ) {
    const f = e[i];
    typeof f == "string" && !$T.has(f) && go(f).values.length && (a = e[i]), i++;
  }
  if (a && o)
    for (const f of t)
      e[f] = Bv(o, a);
}
class HT extends Wd {
  constructor(t, o, i, a, f) {
    super(t, o, i, a, f, !0);
  }
  readKeyframes() {
    const { unresolvedKeyframes: t, element: o, name: i } = this;
    if (!o || !o.current)
      return;
    super.readKeyframes();
    for (let S = 0; S < t.length; S++) {
      let l = t[S];
      if (typeof l == "string" && (l = l.trim(), Vd(l))) {
        const c = Nv(l, o.current);
        c !== void 0 && (t[S] = c), S === t.length - 1 && (this.finalKeyframe = l);
      }
    }
    if (this.resolveNoneKeyframes(), !jv.has(i) || t.length !== 2)
      return;
    const [a, f] = t, d = sy(a), p = sy(f), m = Gh(a), y = Gh(f);
    if (m !== y && Kn[i]) {
      this.needsMeasurement = !0;
      return;
    }
    if (d !== p)
      if (ty(d) && ty(p))
        for (let S = 0; S < t.length; S++) {
          const l = t[S];
          typeof l == "string" && (t[S] = parseFloat(l));
        }
      else Kn[i] && (this.needsMeasurement = !0);
  }
  resolveNoneKeyframes() {
    const { unresolvedKeyframes: t, name: o } = this, i = [];
    for (let a = 0; a < t.length; a++)
      (t[a] === null || IT(t[a])) && i.push(a);
    i.length && UT(t, i, o);
  }
  measureInitialState() {
    const { element: t, unresolvedKeyframes: o, name: i } = this;
    if (!t || !t.current)
      return;
    i === "height" && (this.suspendedScrollY = window.pageYOffset), this.measuredOrigin = Kn[i](t.measureViewportBox(), window.getComputedStyle(t.current)), o[0] = this.measuredOrigin;
    const a = o[o.length - 1];
    a !== void 0 && t.getValue(i, a).jump(a, !1);
  }
  measureEndState() {
    var p;
    const { element: t, name: o, unresolvedKeyframes: i } = this;
    if (!t || !t.current)
      return;
    const a = t.getValue(o);
    a && a.jump(this.measuredOrigin, !1);
    const f = i.length - 1, d = i[f];
    i[f] = Kn[o](t.measureViewportBox(), window.getComputedStyle(t.current)), d !== null && this.finalKeyframe === void 0 && (this.finalKeyframe = d), (p = this.removedTransforms) != null && p.length && this.removedTransforms.forEach(([m, y]) => {
      t.getValue(m).set(y);
    }), this.resolveNoneKeyframes();
  }
}
function $v(e, t, o) {
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
const Qc = (e, t) => t && typeof e == "number" ? t.transform(e) : e;
function ya(e) {
  return Yg(e) && "offsetHeight" in e && !("ownerSVGElement" in e);
}
const { schedule: Qd } = /* @__PURE__ */ lv(queueMicrotask, !1), Ut = {
  x: !1,
  y: !1
};
function Uv() {
  return Ut.x || Ut.y;
}
function WT(e) {
  return e === "x" || e === "y" ? Ut[e] ? null : (Ut[e] = !0, () => {
    Ut[e] = !1;
  }) : Ut.x || Ut.y ? null : (Ut.x = Ut.y = !0, () => {
    Ut.x = Ut.y = !1;
  });
}
function Hv(e, t) {
  const o = $v(e), i = new AbortController(), a = {
    passive: !0,
    ...t,
    signal: i.signal
  };
  return [o, a, () => i.abort()];
}
function GT(e) {
  return !(e.pointerType === "touch" || Uv());
}
function KT(e, t, o = {}) {
  const [i, a, f] = Hv(e, o);
  return i.forEach((d) => {
    let p = !1, m = !1, y;
    const S = () => {
      d.removeEventListener("pointerleave", w);
    }, l = (A) => {
      y && (y(A), y = void 0), S();
    }, c = (A) => {
      p = !1, window.removeEventListener("pointerup", c), window.removeEventListener("pointercancel", c), m && (m = !1, l(A));
    }, g = () => {
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
      if (!GT(A))
        return;
      m = !1;
      const _ = t(d, A);
      typeof _ == "function" && (y = _, d.addEventListener("pointerleave", w, a));
    };
    d.addEventListener("pointerenter", T, a), d.addEventListener("pointerdown", g, a);
  }), f;
}
const Wv = (e, t) => t ? e === t ? !0 : Wv(e, t.parentElement) : !1, Zd = (e) => e.pointerType === "mouse" ? typeof e.button != "number" || e.button <= 0 : e.isPrimary !== !1, YT = /* @__PURE__ */ new Set([
  "BUTTON",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "A"
]);
function XT(e) {
  return YT.has(e.tagName) || e.isContentEditable === !0;
}
const QT = /* @__PURE__ */ new Set(["INPUT", "SELECT", "TEXTAREA"]);
function ZT(e) {
  return QT.has(e.tagName) || e.isContentEditable === !0;
}
const ga = /* @__PURE__ */ new WeakSet();
function ly(e) {
  return (t) => {
    t.key === "Enter" && e(t);
  };
}
function dc(e, t) {
  e.dispatchEvent(new PointerEvent("pointer" + t, { isPrimary: !0, bubbles: !0 }));
}
const JT = (e, t) => {
  const o = e.currentTarget;
  if (!o)
    return;
  const i = ly(() => {
    if (ga.has(o))
      return;
    dc(o, "down");
    const a = ly(() => {
      dc(o, "up");
    }), f = () => dc(o, "cancel");
    o.addEventListener("keyup", a, t), o.addEventListener("blur", f, t);
  });
  o.addEventListener("keydown", i, t), o.addEventListener("blur", () => o.removeEventListener("keydown", i), t);
};
function uy(e) {
  return Zd(e) && !Uv();
}
const cy = /* @__PURE__ */ new WeakSet();
function qT(e, t, o = {}) {
  const [i, a, f] = Hv(e, o), d = (p) => {
    const m = p.currentTarget;
    if (!uy(p) || cy.has(p))
      return;
    ga.add(m), o.stopPropagation && cy.add(p);
    const y = t(m, p), S = (g, w) => {
      window.removeEventListener("pointerup", l), window.removeEventListener("pointercancel", c), ga.has(m) && ga.delete(m), uy(g) && typeof y == "function" && y(g, { success: w });
    }, l = (g) => {
      S(g, m === window || m === document || o.useGlobalTarget || Wv(m, g.target));
    }, c = (g) => {
      S(g, !1);
    };
    window.addEventListener("pointerup", l, a), window.addEventListener("pointercancel", c, a);
  };
  return i.forEach((p) => {
    (o.useGlobalTarget ? window : p).addEventListener("pointerdown", d, a), ya(p) && (p.addEventListener("focus", (y) => JT(y, a)), !XT(p) && !p.hasAttribute("tabindex") && (p.tabIndex = 0));
  }), f;
}
function Jd(e) {
  return Yg(e) && "ownerSVGElement" in e;
}
const va = /* @__PURE__ */ new WeakMap();
let Un;
const Gv = (e, t, o) => (i, a) => a && a[0] ? a[0][e + "Size"] : Jd(i) && "getBBox" in i ? i.getBBox()[t] : i[o], ek = /* @__PURE__ */ Gv("inline", "width", "offsetWidth"), tk = /* @__PURE__ */ Gv("block", "height", "offsetHeight");
function nk({ target: e, borderBoxSize: t }) {
  var o;
  (o = va.get(e)) == null || o.forEach((i) => {
    i(e, {
      get width() {
        return ek(e, t);
      },
      get height() {
        return tk(e, t);
      }
    });
  });
}
function rk(e) {
  e.forEach(nk);
}
function ok() {
  typeof ResizeObserver > "u" || (Un = new ResizeObserver(rk));
}
function ik(e, t) {
  Un || ok();
  const o = $v(e);
  return o.forEach((i) => {
    let a = va.get(i);
    a || (a = /* @__PURE__ */ new Set(), va.set(i, a)), a.add(t), Un == null || Un.observe(i);
  }), () => {
    o.forEach((i) => {
      const a = va.get(i);
      a == null || a.delete(t), a != null && a.size || Un == null || Un.unobserve(i);
    });
  };
}
const Sa = /* @__PURE__ */ new Set();
let fo;
function sk() {
  fo = () => {
    const e = {
      get width() {
        return window.innerWidth;
      },
      get height() {
        return window.innerHeight;
      }
    };
    Sa.forEach((t) => t(e));
  }, window.addEventListener("resize", fo);
}
function ak(e) {
  return Sa.add(e), fo || sk(), () => {
    Sa.delete(e), !Sa.size && typeof fo == "function" && (window.removeEventListener("resize", fo), fo = void 0);
  };
}
function dy(e, t) {
  return typeof e == "function" ? ak(e) : ik(e, t);
}
function lk(e) {
  return Jd(e) && e.tagName === "svg";
}
function uk(...e) {
  const t = !Array.isArray(e[0]), o = t ? 0 : -1, i = e[0 + o], a = e[1 + o], f = e[2 + o], d = e[3 + o], p = Sv(a, f, d);
  return t ? p(i) : p;
}
function ck(e, t, o = {}) {
  const i = e.get();
  let a = null, f = i, d;
  const p = typeof i == "string" ? i.replace(/[\d.-]/g, "") : void 0, m = () => {
    a && (a.stop(), a = null), e.animation = void 0;
  }, y = () => {
    const l = fy(e.get()), c = fy(f);
    if (l === c) {
      m();
      return;
    }
    const g = a ? a.getGeneratorVelocity() : e.getVelocity();
    m(), a = new Ci({
      keyframes: [l, c],
      velocity: g,
      // Default to spring if no type specified (matches useSpring behavior)
      type: "spring",
      restDelta: 1e-3,
      restSpeed: 0.01,
      ...o,
      onUpdate: d
    });
  }, S = () => {
    var l;
    y(), e.animation = a ?? void 0, (l = e.events.animationStart) == null || l.notify(), a == null || a.then(() => {
      var c;
      e.animation = void 0, (c = e.events.animationComplete) == null || c.notify();
    });
  };
  if (e.attach((l, c) => {
    f = l, d = (g) => c(fc(g, p)), ke.postRender(S);
  }, m), We(t)) {
    let l = o.skipInitialAnimation === !0;
    const c = t.on("change", (w) => {
      l ? (l = !1, e.jump(fc(w, p), !1)) : e.set(fc(w, p));
    }), g = e.on("destroy", c);
    return () => {
      c(), g();
    };
  }
  return m;
}
function fc(e, t) {
  return t ? e + t : e;
}
function fy(e) {
  return typeof e == "number" ? e : parseFloat(e);
}
const dk = [...Vv, Be, Wt], fk = (e) => dk.find(Lv(e)), py = () => ({
  translate: 0,
  scale: 1,
  origin: 0,
  originPoint: 0
}), po = () => ({
  x: py(),
  y: py()
}), my = () => ({ min: 0, max: 0 }), He = () => ({
  x: my(),
  y: my()
}), pk = /* @__PURE__ */ new WeakMap();
function Za(e) {
  return e !== null && typeof e == "object" && typeof e.start == "function";
}
function Pi(e) {
  return typeof e == "string" || Array.isArray(e);
}
const qd = [
  "animate",
  "whileInView",
  "whileFocus",
  "whileHover",
  "whileTap",
  "whileDrag",
  "exit"
], ef = ["initial", ...qd];
function Ja(e) {
  return Za(e.animate) || ef.some((t) => Pi(e[t]));
}
function Kv(e) {
  return !!(Ja(e) || e.variants);
}
function mk(e, t, o) {
  for (const i in t) {
    const a = t[i], f = o[i];
    if (We(a))
      e.addValue(i, a);
    else if (We(f))
      e.addValue(i, Mr(a, { owner: e }));
    else if (f !== a)
      if (e.hasValue(i)) {
        const d = e.getValue(i);
        d.liveStyle === !0 ? d.jump(a) : d.hasAnimated || d.set(a);
      } else {
        const d = e.getStaticValue(i);
        e.addValue(i, Mr(d !== void 0 ? d : a, { owner: e }));
      }
  }
  for (const i in o)
    t[i] === void 0 && e.removeValue(i);
  return t;
}
const ja = { current: null }, tf = { current: !1 }, hk = typeof window < "u";
function Yv() {
  if (tf.current = !0, !!hk)
    if (window.matchMedia) {
      const e = window.matchMedia("(prefers-reduced-motion)"), t = () => ja.current = e.matches;
      e.addEventListener("change", t), t();
    } else
      ja.current = !1;
}
const hy = [
  "AnimationStart",
  "AnimationComplete",
  "Update",
  "BeforeLayoutMeasure",
  "LayoutMeasure",
  "LayoutAnimationStart",
  "LayoutAnimationComplete"
];
let Ia = {};
function Xv(e) {
  Ia = e;
}
function yk() {
  return Ia;
}
class gk {
  /**
   * This method takes React props and returns found MotionValues. For example, HTML
   * MotionValues will be found within the style prop, whereas for Three.js within attribute arrays.
   *
   * This isn't an abstract method as it needs calling in the constructor, but it is
   * intended to be one.
   */
  scrapeMotionValuesFromProps(t, o, i) {
    return {};
  }
  constructor({ parent: t, props: o, presenceContext: i, reducedMotionConfig: a, skipAnimations: f, blockInitialAnimation: d, visualState: p }, m = {}) {
    this.current = null, this.children = /* @__PURE__ */ new Set(), this.isVariantNode = !1, this.isControllingVariants = !1, this.shouldReduceMotion = null, this.shouldSkipAnimations = !1, this.values = /* @__PURE__ */ new Map(), this.KeyframeResolver = Wd, this.features = {}, this.valueSubscriptions = /* @__PURE__ */ new Map(), this.prevMotionValues = {}, this.hasBeenMounted = !1, this.events = {}, this.propEventSubscriptions = {}, this.notifyUpdate = () => this.notify("Update", this.latestValues), this.render = () => {
      this.current && (this.triggerBuild(), this.renderInstance(this.current, this.renderState, this.props.style, this.projection));
    }, this.renderScheduledAt = 0, this.scheduleRender = () => {
      const g = lt.now();
      this.renderScheduledAt < g && (this.renderScheduledAt = g, ke.render(this.render, !1, !0));
    };
    const { latestValues: y, renderState: S } = p;
    this.latestValues = y, this.baseTarget = { ...y }, this.initialValues = o.initial ? { ...y } : {}, this.renderState = S, this.parent = t, this.props = o, this.presenceContext = i, this.depth = t ? t.depth + 1 : 0, this.reducedMotionConfig = a, this.skipAnimationsConfig = f, this.options = m, this.blockInitialAnimation = !!d, this.isControllingVariants = Ja(o), this.isVariantNode = Kv(o), this.isVariantNode && (this.variantChildren = /* @__PURE__ */ new Set()), this.manuallyAnimateOnMount = !!(t && t.current);
    const { willChange: l, ...c } = this.scrapeMotionValuesFromProps(o, {}, this);
    for (const g in c) {
      const w = c[g];
      y[g] !== void 0 && We(w) && w.set(y[g]);
    }
  }
  mount(t) {
    var o, i;
    if (this.hasBeenMounted)
      for (const a in this.initialValues)
        (o = this.values.get(a)) == null || o.jump(this.initialValues[a]), this.latestValues[a] = this.initialValues[a];
    this.current = t, pk.set(t, this), this.projection && !this.projection.instance && this.projection.mount(t), this.parent && this.isVariantNode && !this.isControllingVariants && (this.removeFromVariantTree = this.parent.addVariantChild(this)), this.values.forEach((a, f) => this.bindToMotionValue(f, a)), this.reducedMotionConfig === "never" ? this.shouldReduceMotion = !1 : this.reducedMotionConfig === "always" ? this.shouldReduceMotion = !0 : (tf.current || Yv(), this.shouldReduceMotion = ja.current), this.shouldSkipAnimations = this.skipAnimationsConfig ?? !1, (i = this.parent) == null || i.addChild(this), this.update(this.props, this.presenceContext), this.hasBeenMounted = !0;
  }
  unmount() {
    var t;
    this.projection && this.projection.unmount(), Sn(this.notifyUpdate), Sn(this.render), this.valueSubscriptions.forEach((o) => o()), this.valueSubscriptions.clear(), this.removeFromVariantTree && this.removeFromVariantTree(), (t = this.parent) == null || t.removeChild(this);
    for (const o in this.events)
      this.events[o].clear();
    for (const o in this.features) {
      const i = this.features[o];
      i && (i.unmount(), i.isMounted = !1);
    }
    this.current = null;
  }
  addChild(t) {
    this.children.add(t), this.enteringChildren ?? (this.enteringChildren = /* @__PURE__ */ new Set()), this.enteringChildren.add(t);
  }
  removeChild(t) {
    this.children.delete(t), this.enteringChildren && this.enteringChildren.delete(t);
  }
  bindToMotionValue(t, o) {
    if (this.valueSubscriptions.has(t) && this.valueSubscriptions.get(t)(), o.accelerate && Mv.has(t) && this.current instanceof HTMLElement) {
      const { factory: d, keyframes: p, times: m, ease: y, duration: S } = o.accelerate, l = new Pv({
        element: this.current,
        name: t,
        keyframes: p,
        times: m,
        ease: y,
        duration: /* @__PURE__ */ gt(S)
      }), c = d(l);
      this.valueSubscriptions.set(t, () => {
        c(), l.cancel();
      });
      return;
    }
    const i = _o.has(t);
    i && this.onBindTransform && this.onBindTransform();
    const a = o.on("change", (d) => {
      this.latestValues[t] = d, this.props.onUpdate && ke.preRender(this.notifyUpdate), i && this.projection && (this.projection.isTransformDirty = !0), this.scheduleRender();
    });
    let f;
    typeof window < "u" && window.MotionCheckAppearSync && (f = window.MotionCheckAppearSync(this, t, o)), this.valueSubscriptions.set(t, () => {
      a(), f && f();
    });
  }
  sortNodePosition(t) {
    return !this.current || !this.sortInstanceNodePosition || this.type !== t.type ? 0 : this.sortInstanceNodePosition(this.current, t.current);
  }
  updateFeatures() {
    let t = "animation";
    for (t in Ia) {
      const o = Ia[t];
      if (!o)
        continue;
      const { isEnabled: i, Feature: a } = o;
      if (!this.features[t] && a && i(this.props) && (this.features[t] = new a(this)), this.features[t]) {
        const f = this.features[t];
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
  getStaticValue(t) {
    return this.latestValues[t];
  }
  setStaticValue(t, o) {
    this.latestValues[t] = o;
  }
  /**
   * Update the provided props. Ensure any newly-added motion values are
   * added to our map, old ones removed, and listeners updated.
   */
  update(t, o) {
    (t.transformTemplate || this.props.transformTemplate) && this.scheduleRender(), this.prevProps = this.props, this.props = t, this.prevPresenceContext = this.presenceContext, this.presenceContext = o;
    for (let i = 0; i < hy.length; i++) {
      const a = hy[i];
      this.propEventSubscriptions[a] && (this.propEventSubscriptions[a](), delete this.propEventSubscriptions[a]);
      const f = "on" + a, d = t[f];
      d && (this.propEventSubscriptions[a] = this.on(a, d));
    }
    this.prevMotionValues = mk(this, this.scrapeMotionValuesFromProps(t, this.prevProps || {}, this), this.prevMotionValues), this.handleChildMotionValue && this.handleChildMotionValue();
  }
  getProps() {
    return this.props;
  }
  /**
   * Returns the variant definition with a given name.
   */
  getVariant(t) {
    return this.props.variants ? this.props.variants[t] : void 0;
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
  addVariantChild(t) {
    const o = this.getClosestVariantNode();
    if (o)
      return o.variantChildren && o.variantChildren.add(t), () => o.variantChildren.delete(t);
  }
  /**
   * Add a motion value and bind it to this visual element.
   */
  addValue(t, o) {
    const i = this.values.get(t);
    o !== i && (i && this.removeValue(t), this.bindToMotionValue(t, o), this.values.set(t, o), this.latestValues[t] = o.get());
  }
  /**
   * Remove a motion value and unbind any active subscriptions.
   */
  removeValue(t) {
    this.values.delete(t);
    const o = this.valueSubscriptions.get(t);
    o && (o(), this.valueSubscriptions.delete(t)), delete this.latestValues[t], this.removeValueFromRenderState(t, this.renderState);
  }
  /**
   * Check whether we have a motion value for this key
   */
  hasValue(t) {
    return this.values.has(t);
  }
  getValue(t, o) {
    if (this.props.values && this.props.values[t])
      return this.props.values[t];
    let i = this.values.get(t);
    return i === void 0 && o !== void 0 && (i = Mr(o === null ? void 0 : o, { owner: this }), this.addValue(t, i)), i;
  }
  /**
   * If we're trying to animate to a previously unencountered value,
   * we need to check for it in our state and as a last resort read it
   * directly from the instance (which might have performance implications).
   */
  readValue(t, o) {
    let i = this.latestValues[t] !== void 0 || !this.current ? this.latestValues[t] : this.getBaseTargetFromProps(this.props, t) ?? this.readValueFromInstance(this.current, t, this.options);
    return i != null && (typeof i == "string" && (Kg(i) || Xg(i)) ? i = parseFloat(i) : !fk(i) && Wt.test(o) && (i = Bv(t, o)), this.setBaseTarget(t, We(i) ? i.get() : i)), We(i) ? i.get() : i;
  }
  /**
   * Set the base target to later animate back to. This is currently
   * only hydrated on creation and when we first read a value.
   */
  setBaseTarget(t, o) {
    this.baseTarget[t] = o;
  }
  /**
   * Find the base target for a value thats been removed from all animation
   * props.
   */
  getBaseTarget(t) {
    var f;
    const { initial: o } = this.props;
    let i;
    if (typeof o == "string" || typeof o == "object") {
      const d = Yd(this.props, o, (f = this.presenceContext) == null ? void 0 : f.custom);
      d && (i = d[t]);
    }
    if (o && i !== void 0)
      return i;
    const a = this.getBaseTargetFromProps(this.props, t);
    return a !== void 0 && !We(a) ? a : this.initialValues[t] !== void 0 && i === void 0 ? void 0 : this.baseTarget[t];
  }
  on(t, o) {
    return this.events[t] || (this.events[t] = new Fd()), this.events[t].add(o);
  }
  notify(t, ...o) {
    this.events[t] && this.events[t].notify(...o);
  }
  scheduleRenderMicrotask() {
    Qd.render(this.render);
  }
}
class Qv extends gk {
  constructor() {
    super(...arguments), this.KeyframeResolver = HT;
  }
  sortInstanceNodePosition(t, o) {
    return t.compareDocumentPosition(o) & 2 ? 1 : -1;
  }
  getBaseTargetFromProps(t, o) {
    const i = t.style;
    return i ? i[o] : void 0;
  }
  removeValueFromRenderState(t, { vars: o, style: i }) {
    delete o[t], delete i[t];
  }
  handleChildMotionValue() {
    this.childSubscription && (this.childSubscription(), delete this.childSubscription);
    const { children: t } = this.props;
    We(t) && (this.childSubscription = t.on("change", (o) => {
      this.current && (this.current.textContent = `${o}`);
    }));
  }
}
class er {
  constructor(t) {
    this.isMounted = !1, this.node = t;
  }
  update() {
  }
}
function Zv({ top: e, left: t, right: o, bottom: i }) {
  return {
    x: { min: t, max: o },
    y: { min: e, max: i }
  };
}
function vk({ x: e, y: t }) {
  return { top: t.min, right: e.max, bottom: t.max, left: e.min };
}
function Sk(e, t) {
  if (!t)
    return e;
  const o = t({ x: e.left, y: e.top }), i = t({ x: e.right, y: e.bottom });
  return {
    top: o.y,
    left: o.x,
    bottom: i.y,
    right: i.x
  };
}
function pc(e) {
  return e === void 0 || e === 1;
}
function Zc({ scale: e, scaleX: t, scaleY: o }) {
  return !pc(e) || !pc(t) || !pc(o);
}
function hr(e) {
  return Zc(e) || Jv(e) || e.z || e.rotate || e.rotateX || e.rotateY || e.skewX || e.skewY;
}
function Jv(e) {
  return yy(e.x) || yy(e.y);
}
function yy(e) {
  return e && e !== "0%";
}
function Fa(e, t, o) {
  const i = e - o, a = t * i;
  return o + a;
}
function gy(e, t, o, i, a) {
  return a !== void 0 && (e = Fa(e, a, i)), Fa(e, o, i) + t;
}
function Jc(e, t = 0, o = 1, i, a) {
  e.min = gy(e.min, t, o, i, a), e.max = gy(e.max, t, o, i, a);
}
function qv(e, { x: t, y: o }) {
  Jc(e.x, t.translate, t.scale, t.originPoint), Jc(e.y, o.translate, o.scale, o.originPoint);
}
const vy = 0.999999999999, Sy = 1.0000000000001;
function wk(e, t, o, i = !1) {
  var p;
  const a = o.length;
  if (!a)
    return;
  t.x = t.y = 1;
  let f, d;
  for (let m = 0; m < a; m++) {
    f = o[m], d = f.projectionDelta;
    const { visualElement: y } = f.options;
    y && y.props.style && y.props.style.display === "contents" || (i && f.options.layoutScroll && f.scroll && f !== f.root && (tn(e.x, -f.scroll.offset.x), tn(e.y, -f.scroll.offset.y)), d && (t.x *= d.x.scale, t.y *= d.y.scale, qv(e, d)), i && hr(f.latestValues) && wa(e, f.latestValues, (p = f.layout) == null ? void 0 : p.layoutBox));
  }
  t.x < Sy && t.x > vy && (t.x = 1), t.y < Sy && t.y > vy && (t.y = 1);
}
function tn(e, t) {
  e.min += t, e.max += t;
}
function wy(e, t, o, i, a = 0.5) {
  const f = Ce(e.min, e.max, a);
  Jc(e, t, o, f, i);
}
function xy(e, t) {
  return typeof e == "string" ? parseFloat(e) / 100 * (t.max - t.min) : e;
}
function wa(e, t, o) {
  const i = o ?? e;
  wy(e.x, xy(t.x, i.x), t.scaleX, t.scale, t.originX), wy(e.y, xy(t.y, i.y), t.scaleY, t.scale, t.originY);
}
function e0(e, t) {
  return Zv(Sk(e.getBoundingClientRect(), t));
}
function xk(e, t, o) {
  const i = e0(e, o), { scroll: a } = t;
  return a && (tn(i.x, a.offset.x), tn(i.y, a.offset.y)), i;
}
const _k = {
  x: "translateX",
  y: "translateY",
  z: "translateZ",
  transformPerspective: "perspective"
}, Tk = xo.length;
function kk(e, t, o) {
  let i = "", a = !0;
  for (let d = 0; d < Tk; d++) {
    const p = xo[d], m = e[p];
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
      const S = Qc(m, Na[p]);
      if (!y) {
        a = !1;
        const l = _k[p] || p;
        i += `${l}(${S}) `;
      }
      o && (t[p] = S);
    }
  }
  const f = e.pathRotation;
  return f && (a = !1, i += `rotate(${Qc(f, Na.pathRotation)}) `), i = i.trim(), o ? i = o(t, a ? "" : i) : a && (i = "none"), i;
}
function nf(e, t, o) {
  const { style: i, vars: a, transformOrigin: f } = e;
  let d = !1, p = !1;
  for (const m in t) {
    const y = t[m];
    if (_o.has(m)) {
      d = !0;
      continue;
    } else if (cv(m)) {
      a[m] = y;
      continue;
    } else {
      const S = Qc(y, Na[m]);
      m.startsWith("origin") ? (p = !0, f[m] = S) : i[m] = S;
    }
  }
  if (t.transform || (d || o ? i.transform = kk(t, e.transform, o) : i.transform && (i.transform = "none")), p) {
    const { originX: m = "50%", originY: y = "50%", originZ: S = 0 } = f;
    i.transformOrigin = `${m} ${y} ${S}`;
  }
}
function t0(e, { style: t, vars: o }, i, a) {
  const f = e.style;
  let d;
  for (d in t)
    f[d] = t[d];
  a == null || a.applyProjectionStyles(f, i);
  for (d in o)
    f.setProperty(d, o[d]);
}
function _y(e, t) {
  return t.max === t.min ? 0 : e / (t.max - t.min) * 100;
}
const mi = {
  correct: (e, t) => {
    if (!t.target)
      return e;
    if (typeof e == "string")
      if (ne.test(e))
        e = parseFloat(e);
      else
        return e;
    const o = _y(e, t.target.x), i = _y(e, t.target.y);
    return `${o}% ${i}%`;
  }
}, Ak = {
  correct: (e, { treeScale: t, projectionDelta: o }) => {
    const i = e, a = Wt.parse(e);
    if (a.length > 5)
      return i;
    const f = Wt.createTransformer(e), d = typeof a[0] != "number" ? 1 : 0, p = o.x.scale * t.x, m = o.y.scale * t.y;
    a[0 + d] /= p, a[1 + d] /= m;
    const y = Ce(p, m, 0.5);
    return typeof a[2 + d] == "number" && (a[2 + d] /= y), typeof a[3 + d] == "number" && (a[3 + d] /= y), f(a);
  }
}, qc = {
  borderRadius: {
    ...mi,
    applyTo: [
      "borderTopLeftRadius",
      "borderTopRightRadius",
      "borderBottomLeftRadius",
      "borderBottomRightRadius"
    ]
  },
  borderTopLeftRadius: mi,
  borderTopRightRadius: mi,
  borderBottomLeftRadius: mi,
  borderBottomRightRadius: mi,
  boxShadow: Ak
};
function n0(e, { layout: t, layoutId: o }) {
  return _o.has(e) || e.startsWith("origin") || (t || o !== void 0) && (!!qc[e] || e === "opacity");
}
function rf(e, t, o) {
  var d;
  const i = e.style, a = t == null ? void 0 : t.style, f = {};
  if (!i)
    return f;
  for (const p in i)
    (We(i[p]) || a && We(a[p]) || n0(p, e) || ((d = o == null ? void 0 : o.getValue(p)) == null ? void 0 : d.liveStyle) !== void 0) && (f[p] = i[p]);
  return f;
}
function bk(e) {
  return window.getComputedStyle(e);
}
class Ck extends Qv {
  constructor() {
    super(...arguments), this.type = "html", this.renderInstance = t0;
  }
  readValueFromInstance(t, o) {
    var i;
    if (_o.has(o))
      return (i = this.projection) != null && i.isProjecting ? Vc(o) : W_(t, o);
    {
      const a = bk(t), f = (cv(o) ? a.getPropertyValue(o) : a[o]) || 0;
      return typeof f == "string" ? f.trim() : f;
    }
  }
  measureInstanceViewportBox(t, { transformPagePoint: o }) {
    return e0(t, o);
  }
  build(t, o, i) {
    nf(t, o, i.transformTemplate);
  }
  scrapeMotionValuesFromProps(t, o, i) {
    return rf(t, o, i);
  }
}
const Pk = {
  offset: "stroke-dashoffset",
  array: "stroke-dasharray"
}, Ek = {
  offset: "strokeDashoffset",
  array: "strokeDasharray"
};
function Mk(e, t, o = 1, i = 0, a = !0) {
  e.pathLength = 1;
  const f = a ? Pk : Ek;
  e[f.offset] = `${-i}`, e[f.array] = `${t} ${o}`;
}
const Rk = [
  "offsetDistance",
  "offsetPath",
  "offsetRotate",
  "offsetAnchor"
];
function r0(e, {
  attrX: t,
  attrY: o,
  attrScale: i,
  pathLength: a,
  pathSpacing: f = 1,
  pathOffset: d = 0,
  // This is object creation, which we try to avoid per-frame.
  ...p
}, m, y, S) {
  if (nf(e, p, y), m) {
    e.style.viewBox && (e.attrs.viewBox = e.style.viewBox);
    return;
  }
  e.attrs = e.style, e.style = {};
  const { attrs: l, style: c } = e;
  l.transform && (c.transform = l.transform, delete l.transform), (c.transform || l.transformOrigin) && (c.transformOrigin = l.transformOrigin ?? "50% 50%", delete l.transformOrigin), c.transform && (c.transformBox = (S == null ? void 0 : S.transformBox) ?? "fill-box", delete l.transformBox);
  for (const g of Rk)
    l[g] !== void 0 && (c[g] = l[g], delete l[g]);
  t !== void 0 && (l.x = t), o !== void 0 && (l.y = o), i !== void 0 && (l.scale = i), a !== void 0 && Mk(l, a, f, d, !1);
}
const o0 = /* @__PURE__ */ new Set([
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
]), i0 = (e) => typeof e == "string" && e.toLowerCase() === "svg";
function Dk(e, t, o, i) {
  t0(e, t, void 0, i);
  for (const a in t.attrs)
    e.setAttribute(o0.has(a) ? a : Xd(a), t.attrs[a]);
}
function s0(e, t, o) {
  const i = rf(e, t, o);
  for (const a in e)
    if (We(e[a]) || We(t[a])) {
      const f = xo.indexOf(a) !== -1 ? "attr" + a.charAt(0).toUpperCase() + a.substring(1) : a;
      i[f] = e[a];
    }
  return i;
}
class Nk extends Qv {
  constructor() {
    super(...arguments), this.type = "svg", this.isSVGTag = !1, this.measureInstanceViewportBox = He;
  }
  getBaseTargetFromProps(t, o) {
    return t[o];
  }
  readValueFromInstance(t, o) {
    if (_o.has(o)) {
      const i = zv(o);
      return i && i.default || 0;
    }
    return o = o0.has(o) ? o : Xd(o), t.getAttribute(o);
  }
  scrapeMotionValuesFromProps(t, o, i) {
    return s0(t, o, i);
  }
  build(t, o, i) {
    r0(t, o, this.isSVGTag, i.transformTemplate, i.style);
  }
  renderInstance(t, o, i, a) {
    Dk(t, o, i, a);
  }
  mount(t) {
    this.isSVGTag = i0(t.tagName), super.mount(t);
  }
}
const jk = ef.length;
function a0(e) {
  if (!e)
    return;
  if (!e.isControllingVariants) {
    const o = e.parent ? a0(e.parent) || {} : {};
    return e.props.initial !== void 0 && (o.initial = e.props.initial), o;
  }
  const t = {};
  for (let o = 0; o < jk; o++) {
    const i = ef[o], a = e.props[i];
    (Pi(a) || a === !1) && (t[i] = a);
  }
  return t;
}
function l0(e, t) {
  if (!Array.isArray(t))
    return !1;
  const o = t.length;
  if (o !== e.length)
    return !1;
  for (let i = 0; i < o; i++)
    if (t[i] !== e[i])
      return !1;
  return !0;
}
const Ik = [...qd].reverse(), Fk = qd.length;
function Ok(e) {
  return (t) => Promise.all(t.map(({ animation: o, options: i }) => NT(e, o, i)));
}
function Lk(e) {
  let t = Ok(e), o = Ty(), i = !0, a = !1;
  const f = (y) => (S, l) => {
    var g;
    const c = kr(e, l, y === "exit" ? (g = e.presenceContext) == null ? void 0 : g.custom : void 0);
    if (c) {
      const { transition: w, transitionEnd: T, ...A } = c;
      S = { ...S, ...A, ...T };
    }
    return S;
  };
  function d(y) {
    t = y(e);
  }
  function p(y) {
    const { props: S } = e, l = a0(e.parent) || {}, c = [], g = /* @__PURE__ */ new Set();
    let w = {}, T = 1 / 0;
    for (let _ = 0; _ < Fk; _++) {
      const C = Ik[_], E = o[C], N = S[C] !== void 0 ? S[C] : l[C], L = Pi(N), W = C === y ? E.isActive : null;
      W === !1 && (T = _);
      let H = N === l[C] && N !== S[C] && L;
      if (H && (i || a) && e.manuallyAnimateOnMount && (H = !1), E.protectedKeys = { ...w }, // If it isn't active and hasn't *just* been set as inactive
      !E.isActive && W === null || // If we didn't and don't have any defined prop for this animation type
      !N && !E.prevProp || // Or if the prop doesn't define an animation
      Za(N) || typeof N == "boolean")
        continue;
      if (C === "exit" && E.isActive && W !== !0) {
        E.prevResolvedValues && (w = {
          ...w,
          ...E.prevResolvedValues
        });
        continue;
      }
      const Y = Vk(E.prevProp, N);
      let V = Y || // If we're making this variant active, we want to always make it active
      C === y && E.isActive && !H && L || // If we removed a higher-priority variant (i is in reverse order)
      _ > T && L, Q = !1;
      const ie = Array.isArray(N) ? N : [N];
      let J = ie.reduce(f(C), {});
      W === !1 && (J = {});
      const { prevResolvedValues: ce = {} } = E, ue = {
        ...ce,
        ...J
      }, ye = (O) => {
        V = !0, g.has(O) && (Q = !0, g.delete(O)), E.needsAnimating[O] = !0;
        const Z = e.getValue(O);
        Z && (Z.liveStyle = !1);
      };
      for (const O in ue) {
        const Z = J[O], X = ce[O];
        if (w.hasOwnProperty(O))
          continue;
        let D = !1;
        Wc(Z) && Wc(X) ? D = !l0(Z, X) || Y : D = Z !== X, D ? Z != null ? ye(O) : g.add(O) : Z !== void 0 && g.has(O) ? ye(O) : E.protectedKeys[O] = !0;
      }
      E.prevProp = N, E.prevResolvedValues = J, E.isActive && (w = { ...w, ...J }), (i || a) && e.blockInitialAnimation && (V = !1);
      const me = H && Y;
      V && (!me || Q) && c.push(...ie.map((O) => {
        const Z = { type: C };
        if (typeof O == "string" && (i || a) && !me && e.manuallyAnimateOnMount && e.parent) {
          const { parent: X } = e, D = kr(X, O);
          if (X.enteringChildren && D) {
            const { delayChildren: z } = D.transition || {};
            Z.delay = Rv(X.enteringChildren, e, z);
          }
        }
        return {
          animation: O,
          options: Z
        };
      }));
    }
    if (g.size) {
      const _ = {};
      if (typeof S.initial != "boolean") {
        const C = kr(e, Array.isArray(S.initial) ? S.initial[0] : S.initial);
        C && C.transition && (_.transition = C.transition);
      }
      g.forEach((C) => {
        const E = e.getBaseTarget(C), N = e.getValue(C);
        N && (N.liveStyle = !0), _[C] = E ?? null;
      }), c.push({ animation: _ });
    }
    let A = !!c.length;
    return i && (S.initial === !1 || S.initial === S.animate) && !e.manuallyAnimateOnMount && (A = !1), i = !1, a = !1, A ? t(c) : Promise.resolve();
  }
  function m(y, S) {
    var c;
    if (o[y].isActive === S)
      return Promise.resolve();
    (c = e.variantChildren) == null || c.forEach((g) => {
      var w;
      return (w = g.animationState) == null ? void 0 : w.setActive(y, S);
    }), o[y].isActive = S;
    const l = p(y);
    for (const g in o)
      o[g].protectedKeys = {};
    return l;
  }
  return {
    animateChanges: p,
    setActive: m,
    setAnimateFunction: d,
    getState: () => o,
    reset: () => {
      o = Ty(), a = !0;
    }
  };
}
function Vk(e, t) {
  return typeof t == "string" ? t !== e : Array.isArray(t) ? !l0(t, e) : !1;
}
function mr(e = !1) {
  return {
    isActive: e,
    protectedKeys: {},
    needsAnimating: {},
    prevResolvedValues: {}
  };
}
function Ty() {
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
function ed(e, t) {
  e.min = t.min, e.max = t.max;
}
function $t(e, t) {
  ed(e.x, t.x), ed(e.y, t.y);
}
function ky(e, t) {
  e.translate = t.translate, e.scale = t.scale, e.originPoint = t.originPoint, e.origin = t.origin;
}
const u0 = 1e-4, zk = 1 - u0, Bk = 1 + u0, c0 = 0.01, $k = 0 - c0, Uk = 0 + c0;
function ut(e) {
  return e.max - e.min;
}
function Hk(e, t, o) {
  return Math.abs(e - t) <= o;
}
function Ay(e, t, o, i = 0.5) {
  e.origin = i, e.originPoint = Ce(t.min, t.max, e.origin), e.scale = ut(o) / ut(t), e.translate = Ce(o.min, o.max, e.origin) - e.originPoint, (e.scale >= zk && e.scale <= Bk || isNaN(e.scale)) && (e.scale = 1), (e.translate >= $k && e.translate <= Uk || isNaN(e.translate)) && (e.translate = 0);
}
function wi(e, t, o, i) {
  Ay(e.x, t.x, o.x, i ? i.originX : void 0), Ay(e.y, t.y, o.y, i ? i.originY : void 0);
}
function by(e, t, o, i = 0) {
  const a = i ? Ce(o.min, o.max, i) : o.min;
  e.min = a + t.min, e.max = e.min + ut(t);
}
function Wk(e, t, o, i) {
  by(e.x, t.x, o.x, i == null ? void 0 : i.x), by(e.y, t.y, o.y, i == null ? void 0 : i.y);
}
function Cy(e, t, o, i = 0) {
  const a = i ? Ce(o.min, o.max, i) : o.min;
  e.min = t.min - a, e.max = e.min + ut(t);
}
function Oa(e, t, o, i) {
  Cy(e.x, t.x, o.x, i == null ? void 0 : i.x), Cy(e.y, t.y, o.y, i == null ? void 0 : i.y);
}
function Py(e, t, o, i, a) {
  return e -= t, e = Fa(e, 1 / o, i), a !== void 0 && (e = Fa(e, 1 / a, i)), e;
}
function Gk(e, t = 0, o = 1, i = 0.5, a, f = e, d = e) {
  if (on.test(t) && (t = parseFloat(t), t = Ce(d.min, d.max, t / 100) - d.min), typeof t != "number")
    return;
  let p = Ce(f.min, f.max, i);
  e === f && (p -= t), e.min = Py(e.min, t, o, p, a), e.max = Py(e.max, t, o, p, a);
}
function Ey(e, t, [o, i, a], f, d) {
  Gk(e, t[o], t[i], t[a], t.scale, f, d);
}
const Kk = ["x", "scaleX", "originX"], Yk = ["y", "scaleY", "originY"];
function My(e, t, o, i) {
  Ey(e.x, t, Kk, o ? o.x : void 0, i ? i.x : void 0), Ey(e.y, t, Yk, o ? o.y : void 0, i ? i.y : void 0);
}
function Ry(e) {
  return e.translate === 0 && e.scale === 1;
}
function d0(e) {
  return Ry(e.x) && Ry(e.y);
}
function Dy(e, t) {
  return e.min === t.min && e.max === t.max;
}
function Xk(e, t) {
  return Dy(e.x, t.x) && Dy(e.y, t.y);
}
function Ny(e, t) {
  return Math.round(e.min) === Math.round(t.min) && Math.round(e.max) === Math.round(t.max);
}
function f0(e, t) {
  return Ny(e.x, t.x) && Ny(e.y, t.y);
}
function jy(e) {
  return ut(e.x) / ut(e.y);
}
function Iy(e, t) {
  return e.translate === t.translate && e.scale === t.scale && e.originPoint === t.originPoint;
}
function en(e) {
  return [e("x"), e("y")];
}
function Qk(e, t, o) {
  let i = "";
  const a = e.x.translate / t.x, f = e.y.translate / t.y, d = (o == null ? void 0 : o.z) || 0;
  if ((a || f || d) && (i = `translate3d(${a}px, ${f}px, ${d}px) `), (t.x !== 1 || t.y !== 1) && (i += `scale(${1 / t.x}, ${1 / t.y}) `), o) {
    const { transformPerspective: y, rotate: S, pathRotation: l, rotateX: c, rotateY: g, skewX: w, skewY: T } = o;
    y && (i = `perspective(${y}px) ${i}`), S && (i += `rotate(${S}deg) `), l && (i += `rotate(${l}deg) `), c && (i += `rotateX(${c}deg) `), g && (i += `rotateY(${g}deg) `), w && (i += `skewX(${w}deg) `), T && (i += `skewY(${T}deg) `);
  }
  const p = e.x.scale * t.x, m = e.y.scale * t.y;
  return (p !== 1 || m !== 1) && (i += `scale(${p}, ${m})`), i || "none";
}
const p0 = [
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius"
], Zk = p0.length, Fy = (e) => typeof e == "string" ? parseFloat(e) : e, Oy = (e) => typeof e == "number" || ne.test(e);
function Jk(e, t, o, i, a, f) {
  a ? (e.opacity = Ce(0, o.opacity ?? 1, qk(i)), e.opacityExit = Ce(t.opacity ?? 1, 0, eA(i))) : f && (e.opacity = Ce(t.opacity ?? 1, o.opacity ?? 1, i));
  for (let d = 0; d < Zk; d++) {
    const p = p0[d];
    let m = Ly(t, p), y = Ly(o, p);
    if (m === void 0 && y === void 0)
      continue;
    m || (m = 0), y || (y = 0), m === 0 || y === 0 || Oy(m) === Oy(y) ? (e[p] = Math.max(Ce(Fy(m), Fy(y), i), 0), (on.test(y) || on.test(m)) && (e[p] += "%")) : e[p] = y;
  }
  (t.rotate || o.rotate) && (e.rotate = Ce(t.rotate || 0, o.rotate || 0, i));
}
function Ly(e, t) {
  return e[t] !== void 0 ? e[t] : e.borderRadius;
}
const qk = /* @__PURE__ */ m0(0, 0.5, ov), eA = /* @__PURE__ */ m0(0.5, 0.95, jt);
function m0(e, t, o) {
  return (i) => i < e ? 0 : i > t ? 1 : o(/* @__PURE__ */ Ai(e, t, i));
}
function tA(e, t, o) {
  const i = We(e) ? e : Mr(e);
  return i.start(Kd("", i, t, o)), i.animation;
}
function Ei(e, t, o, i = { passive: !0 }) {
  return e.addEventListener(t, o, i), () => e.removeEventListener(t, o);
}
const nA = (e, t) => e.depth - t.depth;
class rA {
  constructor() {
    this.children = [], this.isDirty = !1;
  }
  add(t) {
    Id(this.children, t), this.isDirty = !0;
  }
  remove(t) {
    Ea(this.children, t), this.isDirty = !0;
  }
  forEach(t) {
    this.isDirty && this.children.sort(nA), this.isDirty = !1, this.children.forEach(t);
  }
}
function oA(e, t) {
  const o = lt.now(), i = ({ timestamp: a }) => {
    const f = a - o;
    f >= t && (Sn(i), e(f - t));
  };
  return ke.setup(i, !0), () => Sn(i);
}
function xa(e) {
  return We(e) ? e.get() : e;
}
class iA {
  constructor() {
    this.members = [];
  }
  add(t) {
    Id(this.members, t);
    for (let o = this.members.length - 1; o >= 0; o--) {
      const i = this.members[o];
      if (i === t || i === this.lead || i === this.prevLead)
        continue;
      const a = i.instance;
      (!a || a.isConnected === !1) && !i.snapshot && (Ea(this.members, i), i.unmount());
    }
    t.scheduleRender();
  }
  remove(t) {
    if (Ea(this.members, t), t === this.prevLead && (this.prevLead = void 0), t === this.lead) {
      const o = this.members[this.members.length - 1];
      o && this.promote(o);
    }
  }
  relegate(t) {
    var o;
    for (let i = this.members.indexOf(t) - 1; i >= 0; i--) {
      const a = this.members[i];
      if (a.isPresent !== !1 && ((o = a.instance) == null ? void 0 : o.isConnected) !== !1)
        return this.promote(a), !0;
    }
    return !1;
  }
  promote(t, o) {
    var a;
    const i = this.lead;
    if (t !== i && (this.prevLead = i, this.lead = t, t.show(), i)) {
      i.updateSnapshot(), t.scheduleRender();
      const { layoutDependency: f } = i.options, { layoutDependency: d } = t.options;
      (f === void 0 || f !== d) && (t.resumeFrom = i, o && (i.preserveOpacity = !0), i.snapshot && (t.snapshot = i.snapshot, t.snapshot.latestValues = i.animationValues || i.latestValues), (a = t.root) != null && a.isUpdating && (t.isLayoutDirty = !0)), t.options.crossfade === !1 && i.hide();
    }
  }
  exitAnimationComplete() {
    this.members.forEach((t) => {
      var o, i, a, f, d;
      (i = (o = t.options).onExitComplete) == null || i.call(o), (d = (a = t.resumingFrom) == null ? void 0 : (f = a.options).onExitComplete) == null || d.call(f);
    });
  }
  scheduleRender() {
    this.members.forEach((t) => t.instance && t.scheduleRender(!1));
  }
  removeLeadSnapshot() {
    var t;
    (t = this.lead) != null && t.snapshot && (this.lead.snapshot = void 0);
  }
}
const _a = {
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
}, mc = ["", "X", "Y", "Z"], sA = 1e3;
let aA = 0;
function hc(e, t, o, i) {
  const { latestValues: a } = t;
  a[e] && (o[e] = a[e], t.setStaticValue(e, 0), i && (i[e] = 0));
}
function h0(e) {
  if (e.hasCheckedOptimisedAppear = !0, e.root === e)
    return;
  const { visualElement: t } = e.options;
  if (!t)
    return;
  const o = Fv(t);
  if (window.MotionHasOptimisedAnimation(o, "transform")) {
    const { layout: a, layoutId: f } = e.options;
    window.MotionCancelOptimisedAnimation(o, "transform", ke, !(a || f));
  }
  const { parent: i } = e;
  i && !i.hasCheckedOptimisedAppear && h0(i);
}
function y0({ attachResizeListener: e, defaultParent: t, measureScroll: o, checkIsScrollRoot: i, resetTransform: a }) {
  return class {
    constructor(d = {}, p = t == null ? void 0 : t()) {
      this.id = aA++, this.animationId = 0, this.animationCommitId = 0, this.children = /* @__PURE__ */ new Set(), this.options = {}, this.isTreeAnimating = !1, this.isAnimationBlocked = !1, this.isLayoutDirty = !1, this.isProjectionDirty = !1, this.isSharedProjectionDirty = !1, this.isTransformDirty = !1, this.updateManuallyBlocked = !1, this.updateBlockedByResize = !1, this.isUpdating = !1, this.isSVG = !1, this.needsReset = !1, this.shouldResetTransform = !1, this.hasCheckedOptimisedAppear = !1, this.treeScale = { x: 1, y: 1 }, this.eventHandlers = /* @__PURE__ */ new Map(), this.hasTreeAnimated = !1, this.layoutVersion = 0, this.updateScheduled = !1, this.scheduleUpdate = () => this.update(), this.projectionUpdateScheduled = !1, this.checkUpdateFailed = () => {
        this.isUpdating && (this.isUpdating = !1, this.clearAllSnapshots());
      }, this.updateProjection = () => {
        this.projectionUpdateScheduled = !1, this.nodes.forEach(cA), this.nodes.forEach(yA), this.nodes.forEach(gA), this.nodes.forEach(dA);
      }, this.resolvedRelativeTargetAt = 0, this.linkedParentVersion = 0, this.hasProjected = !1, this.isVisible = !0, this.animationProgress = 0, this.sharedNodes = /* @__PURE__ */ new Map(), this.latestValues = d, this.root = p ? p.root || p : this, this.path = p ? [...p.path, p] : [], this.parent = p, this.depth = p ? p.depth + 1 : 0;
      for (let m = 0; m < this.path.length; m++)
        this.path[m].shouldResetTransform = !0;
      this.root === this && (this.nodes = new rA());
    }
    addEventListener(d, p) {
      return this.eventHandlers.has(d) || this.eventHandlers.set(d, new Fd()), this.eventHandlers.get(d).add(p);
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
      this.isSVG = Jd(d) && !lk(d), this.instance = d;
      const { layoutId: p, layout: m, visualElement: y } = this.options;
      if (y && !y.current && y.mount(d), this.root.nodes.add(this), this.parent && this.parent.children.add(this), this.root.hasTreeAnimated && (m || p) && (this.isLayoutDirty = !0), e) {
        let S, l = 0;
        const c = () => this.root.updateBlockedByResize = !1;
        ke.read(() => {
          l = window.innerWidth;
        }), e(d, () => {
          const g = window.innerWidth;
          g !== l && (l = g, this.root.updateBlockedByResize = !0, S && S(), S = oA(c, 250), _a.hasAnimatedSinceResize && (_a.hasAnimatedSinceResize = !1, this.nodes.forEach(By)));
        });
      }
      p && this.root.registerSharedNode(p, this), this.options.animate !== !1 && y && (p || m) && this.addEventListener("didUpdate", ({ delta: S, hasLayoutChanged: l, hasRelativeLayoutChanged: c, layout: g }) => {
        if (this.isTreeAnimationBlocked()) {
          this.target = void 0, this.relativeTarget = void 0;
          return;
        }
        const w = this.options.transition || y.getDefaultTransition() || _A, { onLayoutAnimationStart: T, onLayoutAnimationComplete: A } = y.getProps(), _ = !this.targetLayout || !f0(this.targetLayout, g), C = !l && c;
        if (this.options.layoutRoot || this.resumeFrom || C || l && (_ || !this.currentAnimation)) {
          this.resumeFrom && (this.resumingFrom = this.resumeFrom, this.resumingFrom.resumingFrom = void 0);
          const E = {
            ...Gd(w, "layout"),
            onPlay: T,
            onComplete: A
          };
          (y.shouldReduceMotion || this.options.layoutRoot) && (E.delay = 0, E.type = !1), this.startAnimation(E), this.setAnimationOrigin(S, C, E.path);
        } else
          l || By(this), this.isLead() && this.options.onExitComplete && this.options.onExitComplete();
        this.targetLayout = g;
      });
    }
    unmount() {
      this.options.layoutId && this.willUpdate(), this.root.nodes.remove(this);
      const d = this.getStack();
      d && d.remove(this), this.parent && this.parent.children.delete(this), this.instance = void 0, this.eventHandlers.clear(), Sn(this.updateProjection);
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
      this.isUpdateBlocked() || (this.isUpdating = !0, this.nodes && this.nodes.forEach(vA), this.animationId++);
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
      if (window.MotionCancelOptimisedAnimation && !this.hasCheckedOptimisedAppear && h0(this), !this.root.isUpdating && this.root.startUpdate(), this.isLayoutDirty)
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
        this.unblockUpdate(), this.updateBlockedByResize = !1, this.clearAllSnapshots(), m && this.nodes.forEach(pA), this.nodes.forEach(Vy);
        return;
      }
      if (this.animationId <= this.animationCommitId) {
        this.nodes.forEach(zy);
        return;
      }
      this.animationCommitId = this.animationId, this.isUpdating ? (this.isUpdating = !1, this.nodes.forEach(mA), this.nodes.forEach(hA), this.nodes.forEach(lA), this.nodes.forEach(uA)) : this.nodes.forEach(zy), this.clearAllSnapshots();
      const p = lt.now();
      qe.delta = sn(0, 1e3 / 60, p - qe.timestamp), qe.timestamp = p, qe.isProcessing = !0, ic.update.process(qe), ic.preRender.process(qe), ic.render.process(qe), qe.isProcessing = !1;
    }
    didUpdate() {
      this.updateScheduled || (this.updateScheduled = !0, Qd.read(this.scheduleUpdate));
    }
    clearAllSnapshots() {
      this.nodes.forEach(fA), this.sharedNodes.forEach(SA);
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
      const d = this.isLayoutDirty || this.shouldResetTransform || this.options.alwaysMeasureLayout, p = this.projectionDelta && !d0(this.projectionDelta), m = this.getTransformTemplate(), y = m ? m(this.latestValues, "") : void 0, S = y !== this.prevTransformTemplateValue;
      d && this.instance && (p || hr(this.latestValues) || S) && (a(this.instance, y), this.shouldResetTransform = !1, this.scheduleRender());
    }
    measure(d = !0) {
      const p = this.measurePageBox();
      let m = this.removeElementScroll(p);
      return d && (m = this.removeTransform(m)), TA(m), {
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
      if (!(((y = this.scroll) == null ? void 0 : y.wasRoot) || this.path.some(kA))) {
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
        const g = this.path[c];
        !p && g.options.layoutScroll && g.scroll && g !== g.root && (tn(y.x, -g.scroll.offset.x), tn(y.y, -g.scroll.offset.y)), hr(g.latestValues) && wa(y, g.latestValues, (S = g.layout) == null ? void 0 : S.layoutBox);
      }
      return hr(this.latestValues) && wa(y, this.latestValues, (l = this.layout) == null ? void 0 : l.layoutBox), y;
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
        S.instance && (Zc(S.latestValues) && S.updateSnapshot(), l = He(), $t(l, S.measurePageBox())), My(p, S.latestValues, (m = S.snapshot) == null ? void 0 : m.layoutBox, l);
      }
      return hr(this.latestValues) && My(p, this.latestValues), p;
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
      this.relativeParent && this.relativeParent.resolvedRelativeTargetAt !== qe.timestamp && this.relativeParent.resolveTargetDelta(!0);
    }
    resolveTargetDelta(d = !1) {
      var g;
      const p = this.getLead();
      this.isProjectionDirty || (this.isProjectionDirty = p.isProjectionDirty), this.isTransformDirty || (this.isTransformDirty = p.isTransformDirty), this.isSharedProjectionDirty || (this.isSharedProjectionDirty = p.isSharedProjectionDirty);
      const m = !!this.resumingFrom || this !== p;
      if (!(d || m && this.isSharedProjectionDirty || this.isProjectionDirty || (g = this.parent) != null && g.isProjectionDirty || this.attemptToResolveRelativeTarget || this.root.updateBlockedByResize))
        return;
      const { layout: S, layoutId: l } = this.options;
      if (!this.layout || !(S || l))
        return;
      this.resolvedRelativeTargetAt = qe.timestamp;
      const c = this.getClosestProjectingParent();
      c && this.linkedParentVersion !== c.layoutVersion && !c.options.layoutRoot && this.removeRelativeTarget(), !this.targetDelta && !this.relativeTarget && (this.options.layoutAnchor !== !1 && c && c.layout ? this.createRelativeTarget(c, this.layout.layoutBox, c.layout.layoutBox) : this.removeRelativeTarget()), !(!this.relativeTarget && !this.targetDelta) && (this.target || (this.target = He(), this.targetWithTransforms = He()), this.relativeTarget && this.relativeTargetOrigin && this.relativeParent && this.relativeParent.target ? (this.forceRelativeParentToResolveTarget(), Wk(this.target, this.relativeTarget, this.relativeParent.target, this.options.layoutAnchor || void 0)) : this.targetDelta ? (this.resumingFrom ? this.applyTransform(this.layout.layoutBox, !1, this.target) : $t(this.target, this.layout.layoutBox), qv(this.target, this.targetDelta)) : $t(this.target, this.layout.layoutBox), this.attemptToResolveRelativeTarget && (this.attemptToResolveRelativeTarget = !1, this.options.layoutAnchor !== !1 && c && !!c.resumingFrom == !!this.resumingFrom && !c.options.layoutScroll && c.target && this.animationProgress !== 1 ? this.createRelativeTarget(c, this.target, c.target) : this.relativeParent = this.relativeTarget = void 0));
    }
    getClosestProjectingParent() {
      if (!(!this.parent || Zc(this.parent.latestValues) || Jv(this.parent.latestValues)))
        return this.parent.isProjecting() ? this.parent : this.parent.getClosestProjectingParent();
    }
    isProjecting() {
      return !!((this.relativeTarget || this.targetDelta || this.options.layoutRoot) && this.layout);
    }
    createRelativeTarget(d, p, m) {
      this.relativeParent = d, this.linkedParentVersion = d.layoutVersion, this.forceRelativeParentToResolveTarget(), this.relativeTarget = He(), this.relativeTargetOrigin = He(), Oa(this.relativeTargetOrigin, p, m, this.options.layoutAnchor || void 0), $t(this.relativeTarget, this.relativeTargetOrigin);
    }
    removeRelativeTarget() {
      this.relativeParent = this.relativeTarget = void 0;
    }
    calcProjection() {
      var w;
      const d = this.getLead(), p = !!this.resumingFrom || this !== d;
      let m = !0;
      if ((this.isProjectionDirty || (w = this.parent) != null && w.isProjectionDirty) && (m = !1), p && (this.isSharedProjectionDirty || this.isTransformDirty) && (m = !1), this.resolvedRelativeTargetAt === qe.timestamp && (m = !1), m)
        return;
      const { layout: y, layoutId: S } = this.options;
      if (this.isTreeAnimating = !!(this.parent && this.parent.isTreeAnimating || this.currentAnimation || this.pendingAnimation), this.isTreeAnimating || (this.targetDelta = this.relativeTarget = void 0), !this.layout || !(y || S))
        return;
      $t(this.layoutCorrected, this.layout.layoutBox);
      const l = this.treeScale.x, c = this.treeScale.y;
      wk(this.layoutCorrected, this.treeScale, this.path, p), d.layout && !d.target && (this.treeScale.x !== 1 || this.treeScale.y !== 1) && (d.target = d.layout.layoutBox, d.targetWithTransforms = He());
      const { target: g } = d;
      if (!g) {
        this.prevProjectionDelta && (this.createProjectionDeltas(), this.scheduleRender());
        return;
      }
      !this.projectionDelta || !this.prevProjectionDelta ? this.createProjectionDeltas() : (ky(this.prevProjectionDelta.x, this.projectionDelta.x), ky(this.prevProjectionDelta.y, this.projectionDelta.y)), wi(this.projectionDelta, this.layoutCorrected, g, this.latestValues), (this.treeScale.x !== l || this.treeScale.y !== c || !Iy(this.projectionDelta.x, this.prevProjectionDelta.x) || !Iy(this.projectionDelta.y, this.prevProjectionDelta.y)) && (this.hasProjected = !0, this.scheduleRender(), this.notifyListeners("projectionUpdate", g));
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
      this.prevProjectionDelta = po(), this.projectionDelta = po(), this.projectionDeltaWithTransform = po();
    }
    setAnimationOrigin(d, p = !1, m) {
      const y = this.snapshot, S = y ? y.latestValues : {}, l = { ...this.latestValues }, c = po();
      (!this.relativeParent || !this.relativeParent.options.layoutRoot) && (this.relativeTarget = this.relativeTargetOrigin = void 0), this.attemptToResolveRelativeTarget = !p;
      const g = He(), w = y ? y.source : void 0, T = this.layout ? this.layout.source : void 0, A = w !== T, _ = this.getStack(), C = !_ || _.members.length <= 1, E = !!(A && !C && this.options.crossfade === !0 && !this.path.some(xA));
      this.animationProgress = 0;
      let N;
      const L = m == null ? void 0 : m.interpolateProjection(d);
      this.mixTargetDelta = (W) => {
        const H = W / 1e3, Y = L == null ? void 0 : L(H);
        Y ? (c.x.translate = Y.x, c.x.scale = Ce(d.x.scale, 1, H), c.x.origin = d.x.origin, c.x.originPoint = d.x.originPoint, c.y.translate = Y.y, c.y.scale = Ce(d.y.scale, 1, H), c.y.origin = d.y.origin, c.y.originPoint = d.y.originPoint) : ($y(c.x, d.x, H), $y(c.y, d.y, H)), this.setTargetDelta(c), this.relativeTarget && this.relativeTargetOrigin && this.layout && this.relativeParent && this.relativeParent.layout && (Oa(g, this.layout.layoutBox, this.relativeParent.layout.layoutBox, this.options.layoutAnchor || void 0), wA(this.relativeTarget, this.relativeTargetOrigin, g, H), N && Xk(this.relativeTarget, N) && (this.isProjectionDirty = !1), N || (N = He()), $t(N, this.relativeTarget)), A && (this.animationValues = l, Jk(l, S, this.latestValues, H, E, C)), Y && Y.rotate !== void 0 && (this.animationValues || (this.animationValues = l), this.animationValues.pathRotation = Y.rotate), this.root.scheduleUpdateProjection(), this.scheduleRender(), this.animationProgress = H;
      }, this.mixTargetDelta(this.options.layoutRoot ? 1e3 : 0);
    }
    startAnimation(d) {
      var p, m, y;
      this.notifyListeners("animationStart"), (p = this.currentAnimation) == null || p.stop(), (y = (m = this.resumingFrom) == null ? void 0 : m.currentAnimation) == null || y.stop(), this.pendingAnimation && (Sn(this.pendingAnimation), this.pendingAnimation = void 0), this.pendingAnimation = ke.update(() => {
        _a.hasAnimatedSinceResize = !0, this.motionValue || (this.motionValue = Mr(0)), this.motionValue.jump(0, !1), this.currentAnimation = tA(this.motionValue, [0, 1e3], {
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
      this.currentAnimation && (this.mixTargetDelta && this.mixTargetDelta(sA), this.currentAnimation.stop()), this.completeAnimation();
    }
    applyTransformsToTarget() {
      const d = this.getLead();
      let { targetWithTransforms: p, target: m, layout: y, latestValues: S } = d;
      if (!(!p || !m || !y)) {
        if (this !== d && this.layout && y && g0(this.options.animationType, this.layout.layoutBox, y.layoutBox)) {
          m = this.target || He();
          const l = ut(this.layout.layoutBox.x);
          m.x.min = d.target.x.min, m.x.max = m.x.min + l;
          const c = ut(this.layout.layoutBox.y);
          m.y.min = d.target.y.min, m.y.max = m.y.min + c;
        }
        $t(p, m), wa(p, S), wi(this.projectionDeltaWithTransform, this.layoutCorrected, p, S);
      }
    }
    registerSharedNode(d, p) {
      this.sharedNodes.has(d) || this.sharedNodes.set(d, new iA()), this.sharedNodes.get(d).add(p);
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
      m.z && hc("z", d, y, this.animationValues);
      for (let S = 0; S < mc.length; S++)
        hc(`rotate${mc[S]}`, d, y, this.animationValues), hc(`skew${mc[S]}`, d, y, this.animationValues);
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
        this.needsReset = !1, d.visibility = "", d.opacity = "", d.pointerEvents = xa(p == null ? void 0 : p.pointerEvents) || "", d.transform = m ? m(this.latestValues, "") : "none";
        return;
      }
      const y = this.getLead();
      if (!this.projectionDelta || !this.layout || !y.target) {
        this.options.layoutId && (d.opacity = this.latestValues.opacity !== void 0 ? this.latestValues.opacity : 1, d.pointerEvents = xa(p == null ? void 0 : p.pointerEvents) || ""), this.hasProjected && !hr(this.latestValues) && (d.transform = m ? m({}, "") : "none", this.hasProjected = !1);
        return;
      }
      d.visibility = "";
      const S = y.animationValues || y.latestValues;
      this.applyTransformsToTarget();
      let l = Qk(this.projectionDeltaWithTransform, this.treeScale, S);
      m && (l = m(S, l)), d.transform = l;
      const { x: c, y: g } = this.projectionDelta;
      d.transformOrigin = `${c.origin * 100}% ${g.origin * 100}% 0`, y.animationValues ? d.opacity = y === this ? S.opacity ?? this.latestValues.opacity ?? 1 : this.preserveOpacity ? this.latestValues.opacity : S.opacityExit : d.opacity = y === this ? S.opacity !== void 0 ? S.opacity : "" : S.opacityExit !== void 0 ? S.opacityExit : 0;
      for (const w in qc) {
        if (S[w] === void 0)
          continue;
        const { correct: T, applyTo: A, isCSSVariable: _ } = qc[w], C = l === "none" ? S[w] : T(S[w], y);
        if (A) {
          const E = A.length;
          for (let N = 0; N < E; N++)
            d[A[N]] = C;
        } else
          _ ? this.options.visualElement.renderState.vars[w] = C : d[w] = C;
      }
      this.options.layoutId && (d.pointerEvents = y === this ? xa(p == null ? void 0 : p.pointerEvents) || "" : "none");
    }
    clearSnapshot() {
      this.resumeFrom = this.snapshot = void 0;
    }
    // Only run on root
    resetTree() {
      this.root.nodes.forEach((d) => {
        var p;
        return (p = d.currentAnimation) == null ? void 0 : p.stop();
      }), this.root.nodes.forEach(Vy), this.root.sharedNodes.clear();
    }
  };
}
function lA(e) {
  e.updateLayout();
}
function uA(e) {
  var o;
  const t = ((o = e.resumeFrom) == null ? void 0 : o.snapshot) || e.snapshot;
  if (e.isLead() && e.layout && t && e.hasListeners("didUpdate")) {
    const { layoutBox: i, measuredBox: a } = e.layout, { animationType: f } = e.options, d = t.source !== e.layout.source;
    if (f === "size")
      en((l) => {
        const c = d ? t.measuredBox[l] : t.layoutBox[l], g = ut(c);
        c.min = i[l].min, c.max = c.min + g;
      });
    else if (f === "x" || f === "y") {
      const l = f === "x" ? "y" : "x";
      ed(d ? t.measuredBox[l] : t.layoutBox[l], i[l]);
    } else g0(f, t.layoutBox, i) && en((l) => {
      const c = d ? t.measuredBox[l] : t.layoutBox[l], g = ut(i[l]);
      c.max = c.min + g, e.relativeTarget && !e.currentAnimation && (e.isProjectionDirty = !0, e.relativeTarget[l].max = e.relativeTarget[l].min + g);
    });
    const p = po();
    wi(p, i, t.layoutBox);
    const m = po();
    d ? wi(m, e.applyTransform(a, !0), t.measuredBox) : wi(m, i, t.layoutBox);
    const y = !d0(p);
    let S = !1;
    if (!e.resumeFrom) {
      const l = e.getClosestProjectingParent();
      if (l && !l.resumeFrom) {
        const { snapshot: c, layout: g } = l;
        if (c && g) {
          const w = e.options.layoutAnchor || void 0, T = He();
          Oa(T, t.layoutBox, c.layoutBox, w);
          const A = He();
          Oa(A, i, g.layoutBox, w), f0(T, A) || (S = !0), l.options.layoutRoot && (e.relativeTarget = A, e.relativeTargetOrigin = T, e.relativeParent = l);
        }
      }
    }
    e.notifyListeners("didUpdate", {
      layout: i,
      snapshot: t,
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
function cA(e) {
  e.parent && (e.isProjecting() || (e.isProjectionDirty = e.parent.isProjectionDirty), e.isSharedProjectionDirty || (e.isSharedProjectionDirty = !!(e.isProjectionDirty || e.parent.isProjectionDirty || e.parent.isSharedProjectionDirty)), e.isTransformDirty || (e.isTransformDirty = e.parent.isTransformDirty));
}
function dA(e) {
  e.isProjectionDirty = e.isSharedProjectionDirty = e.isTransformDirty = !1;
}
function fA(e) {
  e.clearSnapshot();
}
function Vy(e) {
  e.clearMeasurements();
}
function pA(e) {
  e.isLayoutDirty = !0, e.updateLayout();
}
function zy(e) {
  e.isLayoutDirty = !1;
}
function mA(e) {
  e.isAnimationBlocked && e.layout && !e.isLayoutDirty && (e.snapshot = e.layout, e.isLayoutDirty = !0);
}
function hA(e) {
  const { visualElement: t } = e.options;
  t && t.getProps().onBeforeLayoutMeasure && t.notify("BeforeLayoutMeasure"), e.resetTransform();
}
function By(e) {
  e.finishAnimation(), e.targetDelta = e.relativeTarget = e.target = void 0, e.isProjectionDirty = !0;
}
function yA(e) {
  e.resolveTargetDelta();
}
function gA(e) {
  e.calcProjection();
}
function vA(e) {
  e.resetSkewAndRotation();
}
function SA(e) {
  e.removeLeadSnapshot();
}
function $y(e, t, o) {
  e.translate = Ce(t.translate, 0, o), e.scale = Ce(t.scale, 1, o), e.origin = t.origin, e.originPoint = t.originPoint;
}
function Uy(e, t, o, i) {
  e.min = Ce(t.min, o.min, i), e.max = Ce(t.max, o.max, i);
}
function wA(e, t, o, i) {
  Uy(e.x, t.x, o.x, i), Uy(e.y, t.y, o.y, i);
}
function xA(e) {
  return e.animationValues && e.animationValues.opacityExit !== void 0;
}
const _A = {
  duration: 0.45,
  ease: [0.4, 0, 0.1, 1]
}, Hy = (e) => typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().includes(e), Wy = Hy("applewebkit/") && !Hy("chrome/") ? Math.round : jt;
function Gy(e) {
  e.min = Wy(e.min), e.max = Wy(e.max);
}
function TA(e) {
  Gy(e.x), Gy(e.y);
}
function g0(e, t, o) {
  return e === "position" || e === "preserve-aspect" && !Hk(jy(t), jy(o), 0.2);
}
function kA(e) {
  var t;
  return e !== e.root && ((t = e.scroll) == null ? void 0 : t.wasRoot);
}
const AA = y0({
  attachResizeListener: (e, t) => Ei(e, "resize", t),
  measureScroll: () => {
    var e, t;
    return {
      x: document.documentElement.scrollLeft || ((e = document.body) == null ? void 0 : e.scrollLeft) || 0,
      y: document.documentElement.scrollTop || ((t = document.body) == null ? void 0 : t.scrollTop) || 0
    };
  },
  checkIsScrollRoot: () => !0
}), yc = {
  current: void 0
}, v0 = y0({
  measureScroll: (e) => ({
    x: e.scrollLeft,
    y: e.scrollTop
  }),
  defaultParent: () => {
    if (!yc.current) {
      const e = new AA({});
      e.mount(window), e.setOptions({ layoutScroll: !0 }), yc.current = e;
    }
    return yc.current;
  },
  resetTransform: (e, t) => {
    e.style.transform = t !== void 0 ? t : "none";
  },
  checkIsScrollRoot: (e) => window.getComputedStyle(e).position === "fixed"
}), Oi = b.createContext({
  transformPagePoint: (e) => e,
  isStatic: !1,
  reducedMotion: "never"
});
function Ky(e, t) {
  if (typeof e == "function")
    return e(t);
  e != null && (e.current = t);
}
function bA(...e) {
  return (t) => {
    let o = !1;
    const i = e.map((a) => {
      const f = Ky(a, t);
      return !o && typeof f == "function" && (o = !0), f;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const f = i[a];
          typeof f == "function" ? f() : Ky(e[a], null);
        }
      };
  };
}
function CA(...e) {
  return b.useCallback(bA(...e), e);
}
class PA extends b.Component {
  getSnapshotBeforeUpdate(t) {
    const o = this.props.childRef.current;
    if (ya(o) && t.isPresent && !this.props.isPresent && this.props.pop !== !1) {
      const i = o.offsetParent, a = ya(i) && i.offsetWidth || 0, f = ya(i) && i.offsetHeight || 0, d = getComputedStyle(o), p = this.props.sizeRef.current;
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
function EA({ children: e, isPresent: t, anchorX: o, anchorY: i, root: a, pop: f }) {
  var c;
  const d = b.useId(), p = b.useRef(null), m = b.useRef({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    direction: "ltr"
  }), { nonce: y } = b.useContext(Oi), S = ((c = e.props) == null ? void 0 : c.ref) ?? (e == null ? void 0 : e.ref), l = CA(p, S);
  return b.useInsertionEffect(() => {
    const { width: g, height: w, top: T, left: A, right: _, bottom: C, direction: E } = m.current;
    if (t || f === !1 || !p.current || !g || !w)
      return;
    const N = E === "rtl", L = o === "left" ? N ? `right: ${_}` : `left: ${A}` : N ? `left: ${A}` : `right: ${_}`, W = i === "bottom" ? `bottom: ${C}` : `top: ${T}`;
    p.current.dataset.motionPopId = d;
    const H = document.createElement("style");
    y && (H.nonce = y);
    const Y = a ?? document.head;
    return Y.appendChild(H), H.sheet && H.sheet.insertRule(`
          [data-motion-pop-id="${d}"] {
            position: absolute !important;
            width: ${g}px !important;
            height: ${w}px !important;
            ${L}px !important;
            ${W}px !important;
          }
        `), () => {
      var V;
      (V = p.current) == null || V.removeAttribute("data-motion-pop-id"), Y.contains(H) && Y.removeChild(H);
    };
  }, [t]), x.jsx(PA, { isPresent: t, childRef: p, sizeRef: m, pop: f, children: f === !1 ? e : b.cloneElement(e, { ref: l }) });
}
const MA = ({ children: e, initial: t, isPresent: o, onExitComplete: i, custom: a, presenceAffectsLayout: f, mode: d, anchorX: p, anchorY: m, root: y }) => {
  const S = Pr(RA), l = b.useId();
  let c = !0, g = b.useMemo(() => (c = !1, {
    id: l,
    initial: t,
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
  return f && c && (g = { ...g }), b.useMemo(() => {
    S.forEach((w, T) => S.set(T, !1));
  }, [o]), b.useEffect(() => {
    !o && !S.size && i && i();
  }, [o]), e = x.jsx(EA, { pop: d === "popLayout", isPresent: o, anchorX: p, anchorY: m, root: y, children: e }), x.jsx(Xa.Provider, { value: g, children: e });
};
function RA() {
  return /* @__PURE__ */ new Map();
}
function S0(e = !0) {
  const t = b.useContext(Xa);
  if (t === null)
    return [!0, null];
  const { isPresent: o, onExitComplete: i, register: a } = t, f = b.useId();
  b.useEffect(() => {
    if (e)
      return a(f);
  }, [e]);
  const d = b.useCallback(() => e && i && i(f), [f, i, e]);
  return !o && i ? [!1, d] : [!0];
}
const ta = (e) => e.key || "";
function Yy(e) {
  const t = [];
  return b.Children.forEach(e, (o) => {
    b.isValidElement(o) && t.push(o);
  }), t;
}
const qa = ({ children: e, custom: t, initial: o = !0, onExitComplete: i, presenceAffectsLayout: a = !0, mode: f = "sync", propagate: d = !1, anchorX: p = "left", anchorY: m = "top", root: y }) => {
  const [S, l] = S0(d), c = b.useMemo(() => Yy(e), [e]), g = d && !S ? [] : c.map(ta), w = b.useRef(!0), T = b.useRef(c), A = Pr(() => /* @__PURE__ */ new Map()), _ = b.useRef(/* @__PURE__ */ new Set()), [C, E] = b.useState(c), [N, L] = b.useState(c);
  jd(() => {
    w.current = !1, T.current = c;
    for (let Y = 0; Y < N.length; Y++) {
      const V = ta(N[Y]);
      g.includes(V) ? (A.delete(V), _.current.delete(V)) : A.get(V) !== !0 && A.set(V, !1);
    }
  }, [N, g.length, g.join("-")]);
  const W = [];
  if (c !== C) {
    let Y = [...c];
    for (let V = 0; V < N.length; V++) {
      const Q = N[V], ie = ta(Q);
      g.includes(ie) || (Y.splice(V, 0, Q), W.push(Q));
    }
    return f === "wait" && W.length && (Y = W), L(Yy(Y)), E(c), null;
  }
  const { forceRender: H } = b.useContext(Nd);
  return x.jsx(x.Fragment, { children: N.map((Y) => {
    const V = ta(Y), Q = d && !S ? !1 : c === N || g.includes(V), ie = () => {
      if (_.current.has(V))
        return;
      if (A.has(V))
        _.current.add(V), A.set(V, !0);
      else
        return;
      let J = !0;
      A.forEach((ce) => {
        ce || (J = !1);
      }), J && (H == null || H(), L(T.current), d && (l == null || l()), i && i());
    };
    return x.jsx(MA, { isPresent: Q, initial: !w.current || o ? void 0 : !1, custom: t, presenceAffectsLayout: a, mode: f, root: y, onExitComplete: Q ? void 0 : ie, anchorX: p, anchorY: m, children: Y }, V);
  }) });
}, w0 = b.createContext({ strict: !1 }), Xy = {
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
let Qy = !1;
function DA() {
  if (Qy)
    return;
  const e = {};
  for (const t in Xy)
    e[t] = {
      isEnabled: (o) => Xy[t].some((i) => !!o[i])
    };
  Xv(e), Qy = !0;
}
function x0() {
  return DA(), yk();
}
function NA(e) {
  const t = x0();
  for (const o in e)
    t[o] = {
      ...t[o],
      ...e[o]
    };
  Xv(t);
}
const jA = /* @__PURE__ */ new Set([
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
function La(e) {
  return e.startsWith("while") || e.startsWith("drag") && e !== "draggable" || e.startsWith("layout") || e.startsWith("onTap") || e.startsWith("onPan") || e.startsWith("onLayout") || jA.has(e);
}
let _0 = (e) => !La(e);
function IA(e) {
  typeof e == "function" && (_0 = (t) => t.startsWith("on") ? !La(t) : e(t));
}
try {
  IA(require("@emotion/is-prop-valid").default);
} catch {
}
function FA(e, t, o) {
  const i = {};
  for (const a in e)
    a === "values" && typeof e.values == "object" || We(e[a]) || (_0(a) || o === !0 && La(a) || !t && !La(a) || // If trying to use native HTML drag events, forward drag listeners
    e.draggable && a.startsWith("onDrag")) && (i[a] = e[a]);
  return i;
}
const el = /* @__PURE__ */ b.createContext({});
function OA(e, t) {
  if (Ja(e)) {
    const { initial: o, animate: i } = e;
    return {
      initial: o === !1 || Pi(o) ? o : void 0,
      animate: Pi(i) ? i : void 0
    };
  }
  return e.inherit !== !1 ? t : {};
}
function LA(e) {
  const { initial: t, animate: o } = OA(e, b.useContext(el));
  return b.useMemo(() => ({ initial: t, animate: o }), [Zy(t), Zy(o)]);
}
function Zy(e) {
  return Array.isArray(e) ? e.join(" ") : e;
}
const of = () => ({
  style: {},
  transform: {},
  transformOrigin: {},
  vars: {}
});
function T0(e, t, o) {
  for (const i in t)
    !We(t[i]) && !n0(i, o) && (e[i] = t[i]);
}
function VA({ transformTemplate: e }, t) {
  return b.useMemo(() => {
    const o = of();
    return nf(o, t, e), Object.assign({}, o.vars, o.style);
  }, [t]);
}
function zA(e, t) {
  const o = e.style || {}, i = {};
  return T0(i, o, e), Object.assign(i, VA(e, t)), i;
}
function BA(e, t) {
  const o = {}, i = zA(e, t);
  return e.drag && e.dragListener !== !1 && (o.draggable = !1, i.userSelect = i.WebkitUserSelect = i.WebkitTouchCallout = "none", i.touchAction = e.drag === !0 ? "none" : `pan-${e.drag === "x" ? "y" : "x"}`), e.tabIndex === void 0 && (e.onTap || e.onTapStart || e.whileTap) && (o.tabIndex = 0), o.style = i, o;
}
const k0 = () => ({
  ...of(),
  attrs: {}
});
function $A(e, t, o, i) {
  const a = b.useMemo(() => {
    const f = k0();
    return r0(f, t, i0(i), e.transformTemplate, e.style), {
      ...f.attrs,
      style: { ...f.style }
    };
  }, [t]);
  if (e.style) {
    const f = {};
    T0(f, e.style, e), a.style = { ...f, ...a.style };
  }
  return a;
}
const UA = [
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
function sf(e) {
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
      !!(UA.indexOf(e) > -1 || /**
       * If it contains a capital letter, it's an SVG component
       */
      /[A-Z]/u.test(e))
    )
  );
}
function HA(e, t, o, { latestValues: i }, a, f = !1, d) {
  const m = (d ?? sf(e) ? $A : BA)(t, i, a, e), y = FA(t, typeof e == "string", f), S = e !== b.Fragment ? { ...y, ...m, ref: o } : {}, { children: l } = t, c = b.useMemo(() => We(l) ? l.get() : l, [l]);
  return b.createElement(e, {
    ...S,
    children: c
  });
}
function WA({ scrapeMotionValuesFromProps: e, createRenderState: t }, o, i, a) {
  return {
    latestValues: GA(o, i, a, e),
    renderState: t()
  };
}
function GA(e, t, o, i) {
  const a = {}, f = i(e, {});
  for (const c in f)
    a[c] = xa(f[c]);
  let { initial: d, animate: p } = e;
  const m = Ja(e), y = Kv(e);
  t && y && !m && e.inherit !== !1 && (d === void 0 && (d = t.initial), p === void 0 && (p = t.animate));
  let S = o ? o.initial === !1 : !1;
  S = S || d === !1;
  const l = S ? p : d;
  if (l && typeof l != "boolean" && !Za(l)) {
    const c = Array.isArray(l) ? l : [l];
    for (let g = 0; g < c.length; g++) {
      const w = Yd(e, c[g]);
      if (w) {
        const { transitionEnd: T, transition: A, ..._ } = w;
        for (const C in _) {
          let E = _[C];
          if (Array.isArray(E)) {
            const N = S ? E.length - 1 : 0;
            E = E[N];
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
const A0 = (e) => (t, o) => {
  const i = b.useContext(el), a = b.useContext(Xa), f = () => WA(e, t, i, a);
  return o ? f() : Pr(f);
}, KA = /* @__PURE__ */ A0({
  scrapeMotionValuesFromProps: rf,
  createRenderState: of
}), YA = /* @__PURE__ */ A0({
  scrapeMotionValuesFromProps: s0,
  createRenderState: k0
}), XA = Symbol.for("motionComponentSymbol");
function QA(e, t, o) {
  const i = b.useRef(o);
  b.useInsertionEffect(() => {
    i.current = o;
  });
  const a = b.useRef(null);
  return b.useCallback((f) => {
    var p;
    f && ((p = e.onMount) == null || p.call(e, f)), t && (f ? t.mount(f) : t.unmount());
    const d = i.current;
    if (typeof d == "function")
      if (f) {
        const m = d(f);
        typeof m == "function" && (a.current = m);
      } else a.current ? (a.current(), a.current = null) : d(f);
    else d && (d.current = f);
  }, [t]);
}
const b0 = b.createContext({});
function lo(e) {
  return e && typeof e == "object" && Object.prototype.hasOwnProperty.call(e, "current");
}
function ZA(e, t, o, i, a, f) {
  var E, N;
  const { visualElement: d } = b.useContext(el), p = b.useContext(w0), m = b.useContext(Xa), y = b.useContext(Oi), S = y.reducedMotion, l = y.skipAnimations, c = b.useRef(null), g = b.useRef(!1);
  i = i || p.renderer, !c.current && i && (c.current = i(e, {
    visualState: t,
    parent: d,
    props: o,
    presenceContext: m,
    blockInitialAnimation: m ? m.initial === !1 : !1,
    reducedMotionConfig: S,
    skipAnimations: l,
    isSVG: f
  }), g.current && c.current && (c.current.manuallyAnimateOnMount = !0));
  const w = c.current, T = b.useContext(b0);
  w && !w.projection && a && (w.type === "html" || w.type === "svg") && JA(c.current, o, a, T);
  const A = b.useRef(!1);
  b.useInsertionEffect(() => {
    w && A.current && w.update(o, m);
  });
  const _ = o[Iv], C = b.useRef(!!_ && typeof window < "u" && !((E = window.MotionHandoffIsComplete) != null && E.call(window, _)) && ((N = window.MotionHasOptimisedAnimation) == null ? void 0 : N.call(window, _)));
  return jd(() => {
    g.current = !0, w && (A.current = !0, window.MotionIsMounted = !0, w.updateFeatures(), w.scheduleRenderMicrotask(), C.current && w.animationState && w.animationState.animateChanges());
  }), b.useEffect(() => {
    w && (!C.current && w.animationState && w.animationState.animateChanges(), C.current && (queueMicrotask(() => {
      var L;
      (L = window.MotionHandoffMarkAsComplete) == null || L.call(window, _);
    }), C.current = !1), w.enteringChildren = void 0);
  }), w;
}
function JA(e, t, o, i) {
  const { layoutId: a, layout: f, drag: d, dragConstraints: p, layoutScroll: m, layoutRoot: y, layoutAnchor: S, layoutCrossfade: l } = t;
  e.projection = new o(e.latestValues, t["data-framer-portal-id"] ? void 0 : C0(e.parent)), e.projection.setOptions({
    layoutId: a,
    layout: f,
    alwaysMeasureLayout: !!d || p && lo(p),
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
function C0(e) {
  if (e)
    return e.options.allowProjection !== !1 ? e.projection : C0(e.parent);
}
function gc(e, { forwardMotionProps: t = !1, type: o } = {}, i, a) {
  i && NA(i);
  const f = o ? o === "svg" : sf(e), d = f ? YA : KA;
  function p(y, S) {
    let l;
    const c = {
      ...b.useContext(Oi),
      ...y,
      layoutId: qA(y)
    }, { isStatic: g } = c, w = LA(y), T = d(y, g);
    if (!g && typeof window < "u") {
      eb();
      const A = tb(c);
      l = A.MeasureLayout, w.visualElement = ZA(e, T, c, a, A.ProjectionNode, f);
    }
    return x.jsxs(el.Provider, { value: w, children: [l && w.visualElement ? x.jsx(l, { visualElement: w.visualElement, ...c }) : null, HA(e, y, QA(T, w.visualElement, S), T, g, t, f)] });
  }
  p.displayName = `motion.${typeof e == "string" ? e : `create(${e.displayName ?? e.name ?? ""})`}`;
  const m = b.forwardRef(p);
  return m[XA] = e, m;
}
function qA({ layoutId: e }) {
  const t = b.useContext(Nd).id;
  return t && e !== void 0 ? t + "-" + e : e;
}
function eb(e, t) {
  b.useContext(w0).strict;
}
function tb(e) {
  const t = x0(), { drag: o, layout: i } = t;
  if (!o && !i)
    return {};
  const a = { ...o, ...i };
  return {
    MeasureLayout: o != null && o.isEnabled(e) || i != null && i.isEnabled(e) ? a.MeasureLayout : void 0,
    ProjectionNode: a.ProjectionNode
  };
}
function nb(e, t) {
  if (typeof Proxy > "u")
    return gc;
  const o = /* @__PURE__ */ new Map(), i = (f, d) => gc(f, d, e, t), a = (f, d) => i(f, d);
  return new Proxy(a, {
    /**
     * Called when `motion` is referenced with a prop: `motion.div`, `motion.input` etc.
     * The prop name is passed through as `key` and we can use that to generate a `motion`
     * DOM component with that name.
     */
    get: (f, d) => d === "create" ? i : (o.has(d) || o.set(d, gc(d, void 0, e, t)), o.get(d))
  });
}
const rb = (e, t) => t.isSVG ?? sf(e) ? new Nk(t) : new Ck(t, {
  allowProjection: e !== b.Fragment
});
class ob extends er {
  /**
   * We dynamically generate the AnimationState manager as it contains a reference
   * to the underlying animation library. We only want to load that if we load this,
   * so people can optionally code split it out using the `m` component.
   */
  constructor(t) {
    super(t), t.animationState || (t.animationState = Lk(t));
  }
  updateAnimationControlsSubscription() {
    const { animate: t } = this.node.getProps();
    Za(t) && (this.unmountControls = t.subscribe(this.node));
  }
  /**
   * Subscribe any provided AnimationControls to the component's VisualElement
   */
  mount() {
    this.updateAnimationControlsSubscription();
  }
  update() {
    const { animate: t } = this.node.getProps(), { animate: o } = this.node.prevProps || {};
    t !== o && this.updateAnimationControlsSubscription();
  }
  unmount() {
    var t;
    this.node.animationState.reset(), (t = this.unmountControls) == null || t.call(this);
  }
}
let ib = 0;
class sb extends er {
  constructor() {
    super(...arguments), this.id = ib++, this.isExitComplete = !1;
  }
  update() {
    var f;
    if (!this.node.presenceContext)
      return;
    const { isPresent: t, onExitComplete: o } = this.node.presenceContext, { isPresent: i } = this.node.prevPresenceContext || {};
    if (!this.node.animationState || t === i)
      return;
    if (t && i === !1) {
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
    const a = this.node.animationState.setActive("exit", !t);
    o && !t && a.then(() => {
      this.isExitComplete = !0, o(this.id);
    });
  }
  mount() {
    const { register: t, onExitComplete: o } = this.node.presenceContext || {};
    o && o(this.id), t && (this.unmount = t(this.id));
  }
  unmount() {
  }
}
const ab = {
  animation: {
    Feature: ob
  },
  exit: {
    Feature: sb
  }
};
function Li(e) {
  return {
    point: {
      x: e.pageX,
      y: e.pageY
    }
  };
}
const lb = (e) => (t) => Zd(t) && e(t, Li(t));
function xi(e, t, o, i) {
  return Ei(e, t, lb(o), i);
}
const P0 = ({ current: e }) => e ? e.ownerDocument.defaultView : null, Jy = (e, t) => Math.abs(e - t);
function ub(e, t) {
  const o = Jy(e.x, t.x), i = Jy(e.y, t.y);
  return Math.sqrt(o ** 2 + i ** 2);
}
const qy = /* @__PURE__ */ new Set(["auto", "scroll"]);
class E0 {
  constructor(t, o, { transformPagePoint: i, contextWindow: a = window, dragSnapToOrigin: f = !1, distanceThreshold: d = 3, element: p } = {}) {
    if (this.startEvent = null, this.lastMoveEvent = null, this.lastMoveEventInfo = null, this.lastRawMoveEventInfo = null, this.handlers = {}, this.contextWindow = window, this.scrollPositions = /* @__PURE__ */ new Map(), this.removeScrollListeners = null, this.onElementScroll = (g) => {
      this.handleScroll(g.target);
    }, this.onWindowScroll = () => {
      this.handleScroll(window);
    }, this.updatePoint = () => {
      if (!(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      this.lastRawMoveEventInfo && (this.lastMoveEventInfo = na(this.lastRawMoveEventInfo, this.transformPagePoint));
      const g = vc(this.lastMoveEventInfo, this.history), w = this.startEvent !== null, T = ub(g.offset, { x: 0, y: 0 }) >= this.distanceThreshold;
      if (!w && !T)
        return;
      const { point: A } = g, { timestamp: _ } = qe;
      this.history.push({ ...A, timestamp: _ });
      const { onStart: C, onMove: E } = this.handlers;
      w || (C && C(this.lastMoveEvent, g), this.startEvent = this.lastMoveEvent), E && E(this.lastMoveEvent, g);
    }, this.handlePointerMove = (g, w) => {
      this.lastMoveEvent = g, this.lastRawMoveEventInfo = w, this.lastMoveEventInfo = na(w, this.transformPagePoint), ke.update(this.updatePoint, !0);
    }, this.handlePointerUp = (g, w) => {
      this.end();
      const { onEnd: T, onSessionEnd: A, resumeAnimation: _ } = this.handlers;
      if ((this.dragSnapToOrigin || !this.startEvent) && _ && _(), !(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      const C = vc(g.type === "pointercancel" ? this.lastMoveEventInfo : na(w, this.transformPagePoint), this.history);
      this.startEvent && T && T(g, C), A && A(g, C);
    }, !Zd(t))
      return;
    this.dragSnapToOrigin = f, this.handlers = o, this.transformPagePoint = i, this.distanceThreshold = d, this.contextWindow = a || window;
    const m = Li(t), y = na(m, this.transformPagePoint), { point: S } = y, { timestamp: l } = qe;
    this.history = [{ ...S, timestamp: l }];
    const { onSessionStart: c } = o;
    c && c(t, vc(y, this.history)), this.removeListeners = ji(xi(this.contextWindow, "pointermove", this.handlePointerMove), xi(this.contextWindow, "pointerup", this.handlePointerUp), xi(this.contextWindow, "pointercancel", this.handlePointerUp)), p && this.startScrollTracking(p);
  }
  /**
   * Start tracking scroll on ancestors and window.
   */
  startScrollTracking(t) {
    let o = t.parentElement;
    for (; o; ) {
      const i = getComputedStyle(o);
      (qy.has(i.overflowX) || qy.has(i.overflowY)) && this.scrollPositions.set(o, {
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
  handleScroll(t) {
    const o = this.scrollPositions.get(t);
    if (!o)
      return;
    const i = t === window, a = i ? { x: window.scrollX, y: window.scrollY } : {
      x: t.scrollLeft,
      y: t.scrollTop
    }, f = { x: a.x - o.x, y: a.y - o.y };
    f.x === 0 && f.y === 0 || (i ? this.lastMoveEventInfo && (this.lastMoveEventInfo.point.x += f.x, this.lastMoveEventInfo.point.y += f.y) : this.history.length > 0 && (this.history[0].x -= f.x, this.history[0].y -= f.y), this.scrollPositions.set(t, a), ke.update(this.updatePoint, !0));
  }
  updateHandlers(t) {
    this.handlers = t;
  }
  end() {
    this.removeListeners && this.removeListeners(), this.removeScrollListeners && this.removeScrollListeners(), this.scrollPositions.clear(), Sn(this.updatePoint);
  }
}
function na(e, t) {
  return t ? { point: t(e.point) } : e;
}
function eg(e, t) {
  return { x: e.x - t.x, y: e.y - t.y };
}
function vc({ point: e }, t) {
  return {
    point: e,
    delta: eg(e, M0(t)),
    offset: eg(e, cb(t)),
    velocity: db(t, 0.1)
  };
}
function cb(e) {
  return e[0];
}
function M0(e) {
  return e[e.length - 1];
}
function db(e, t) {
  if (e.length < 2)
    return { x: 0, y: 0 };
  let o = e.length - 1, i = null;
  const a = M0(e);
  for (; o >= 0 && (i = e[o], !(a.timestamp - i.timestamp > /* @__PURE__ */ gt(t))); )
    o--;
  if (!i)
    return { x: 0, y: 0 };
  i === e[0] && e.length > 2 && a.timestamp - i.timestamp > /* @__PURE__ */ gt(t) * 2 && (i = e[1]);
  const f = /* @__PURE__ */ Nt(a.timestamp - i.timestamp);
  if (f === 0)
    return { x: 0, y: 0 };
  const d = {
    x: (a.x - i.x) / f,
    y: (a.y - i.y) / f
  };
  return d.x === 1 / 0 && (d.x = 0), d.y === 1 / 0 && (d.y = 0), d;
}
function fb(e, { min: t, max: o }, i) {
  return t !== void 0 && e < t ? e = i ? Ce(t, e, i.min) : Math.max(e, t) : o !== void 0 && e > o && (e = i ? Ce(o, e, i.max) : Math.min(e, o)), e;
}
function tg(e, t, o) {
  return {
    min: t !== void 0 ? e.min + t : void 0,
    max: o !== void 0 ? e.max + o - (e.max - e.min) : void 0
  };
}
function pb(e, { top: t, left: o, bottom: i, right: a }) {
  return {
    x: tg(e.x, o, a),
    y: tg(e.y, t, i)
  };
}
function ng(e, t) {
  let o = t.min - e.min, i = t.max - e.max;
  return t.max - t.min < e.max - e.min && ([o, i] = [i, o]), { min: o, max: i };
}
function mb(e, t) {
  return {
    x: ng(e.x, t.x),
    y: ng(e.y, t.y)
  };
}
function hb(e, t) {
  let o = 0.5;
  const i = ut(e), a = ut(t);
  return a > i ? o = /* @__PURE__ */ Ai(t.min, t.max - i, e.min) : i > a && (o = /* @__PURE__ */ Ai(e.min, e.max - a, t.min)), sn(0, 1, o);
}
function yb(e, t) {
  const o = {};
  return t.min !== void 0 && (o.min = t.min - e.min), t.max !== void 0 && (o.max = t.max - e.min), o;
}
const td = 0.35;
function gb(e = td) {
  return e === !1 ? e = 0 : e === !0 && (e = td), {
    x: rg(e, "left", "right"),
    y: rg(e, "top", "bottom")
  };
}
function rg(e, t, o) {
  return {
    min: og(e, t),
    max: og(e, o)
  };
}
function og(e, t) {
  return typeof e == "number" ? e : e[t] || 0;
}
const vb = /* @__PURE__ */ new WeakMap();
class Sb {
  constructor(t) {
    this.openDragLock = null, this.isDragging = !1, this.currentDirection = null, this.originPoint = { x: 0, y: 0 }, this.constraints = !1, this.hasMutatedConstraints = !1, this.elastic = He(), this.latestPointerEvent = null, this.latestPanInfo = null, this.visualElement = t;
  }
  start(t, { snapToCursor: o = !1, distanceThreshold: i } = {}) {
    const { presenceContext: a } = this.visualElement;
    if (a && a.isPresent === !1)
      return;
    const f = (l) => {
      o && this.snapToCursor(Li(l).point), this.stopAnimation();
    }, d = (l, c) => {
      const { drag: g, dragPropagation: w, onDragStart: T } = this.getProps();
      if (g && !w && (this.openDragLock && this.openDragLock(), this.openDragLock = WT(g), !this.openDragLock))
        return;
      this.latestPointerEvent = l, this.latestPanInfo = c, this.isDragging = !0, this.currentDirection = null, this.resolveConstraints(), this.visualElement.projection && (this.visualElement.projection.isAnimationBlocked = !0, this.visualElement.projection.target = void 0), en((_) => {
        let C = this.getAxisMotionValue(_).get() || 0;
        if (on.test(C)) {
          const { projection: E } = this.visualElement;
          if (E && E.layout) {
            const N = E.layout.layoutBox[_];
            N && (C = ut(N) * (parseFloat(C) / 100));
          }
        }
        this.originPoint[_] = C;
      }), T && ke.update(() => T(l, c), !1, !0), Gc(this.visualElement, "transform");
      const { animationState: A } = this.visualElement;
      A && A.setActive("whileDrag", !0);
    }, p = (l, c) => {
      this.latestPointerEvent = l, this.latestPanInfo = c;
      const { dragPropagation: g, dragDirectionLock: w, onDirectionLock: T, onDrag: A } = this.getProps();
      if (!g && !this.openDragLock)
        return;
      const { offset: _ } = c;
      if (w && this.currentDirection === null) {
        this.currentDirection = xb(_), this.currentDirection !== null && T && T(this.currentDirection);
        return;
      }
      this.updateAxis("x", c.point, _), this.updateAxis("y", c.point, _), this.visualElement.render(), A && ke.update(() => A(l, c), !1, !0);
    }, m = (l, c) => {
      this.latestPointerEvent = l, this.latestPanInfo = c, this.stop(l, c), this.latestPointerEvent = null, this.latestPanInfo = null;
    }, y = () => {
      const { dragSnapToOrigin: l } = this.getProps();
      (l || this.constraints) && this.startAnimation({ x: 0, y: 0 });
    }, { dragSnapToOrigin: S } = this.getProps();
    this.panSession = new E0(t, {
      onSessionStart: f,
      onStart: d,
      onMove: p,
      onSessionEnd: m,
      resumeAnimation: y
    }, {
      transformPagePoint: this.visualElement.getTransformPagePoint(),
      dragSnapToOrigin: S,
      distanceThreshold: i,
      contextWindow: P0(this.visualElement),
      element: this.visualElement.current
    });
  }
  /**
   * @internal
   */
  stop(t, o) {
    const i = t || this.latestPointerEvent, a = o || this.latestPanInfo, f = this.isDragging;
    if (this.cancel(), !f || !a || !i)
      return;
    const { velocity: d } = a;
    this.startAnimation(d);
    const { onDragEnd: p } = this.getProps();
    p && ke.postRender(() => p(i, a));
  }
  /**
   * @internal
   */
  cancel() {
    this.isDragging = !1;
    const { projection: t, animationState: o } = this.visualElement;
    t && (t.isAnimationBlocked = !1), this.endPanSession();
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
  updateAxis(t, o, i) {
    const { drag: a } = this.getProps();
    if (!i || !ra(t, a, this.currentDirection))
      return;
    const f = this.getAxisMotionValue(t);
    let d = this.originPoint[t] + i[t];
    this.constraints && this.constraints[t] && (d = fb(d, this.constraints[t], this.elastic[t])), f.set(d);
  }
  resolveConstraints() {
    var f;
    const { dragConstraints: t, dragElastic: o } = this.getProps(), i = this.visualElement.projection && !this.visualElement.projection.layout ? this.visualElement.projection.measure(!1) : (f = this.visualElement.projection) == null ? void 0 : f.layout, a = this.constraints;
    t && lo(t) ? this.constraints || (this.constraints = this.resolveRefConstraints()) : t && i ? this.constraints = pb(i.layoutBox, t) : this.constraints = !1, this.elastic = gb(o), a !== this.constraints && !lo(t) && i && this.constraints && !this.hasMutatedConstraints && en((d) => {
      this.constraints !== !1 && this.getAxisMotionValue(d) && (this.constraints[d] = yb(i.layoutBox[d], this.constraints[d]));
    });
  }
  resolveRefConstraints() {
    const { dragConstraints: t, onMeasureDragConstraints: o } = this.getProps();
    if (!t || !lo(t))
      return !1;
    const i = t.current;
    Er(i !== null, "If `dragConstraints` is set as a React ref, that ref must be passed to another component's `ref` prop.", "drag-constraints-ref");
    const { projection: a } = this.visualElement;
    if (!a || !a.layout)
      return !1;
    a.root && (a.root.scroll = void 0, a.root.updateScroll());
    const f = xk(i, a.root, this.visualElement.getTransformPagePoint());
    let d = mb(a.layout.layoutBox, f);
    if (o) {
      const p = o(vk(d));
      this.hasMutatedConstraints = !!p, p && (d = Zv(p));
    }
    return d;
  }
  startAnimation(t) {
    const { drag: o, dragMomentum: i, dragElastic: a, dragTransition: f, dragSnapToOrigin: d, onDragTransitionEnd: p } = this.getProps(), m = this.constraints || {}, y = en((S) => {
      if (!ra(S, o, this.currentDirection))
        return;
      let l = m && m[S] || {};
      (d === !0 || d === S) && (l = { min: 0, max: 0 });
      const c = a ? 200 : 1e6, g = a ? 40 : 1e7, w = {
        type: "inertia",
        velocity: i ? t[S] : 0,
        bounceStiffness: c,
        bounceDamping: g,
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
  startAxisValueAnimation(t, o) {
    const i = this.getAxisMotionValue(t);
    return Gc(this.visualElement, t), i.start(Kd(t, i, 0, o, this.visualElement, !1));
  }
  stopAnimation() {
    en((t) => this.getAxisMotionValue(t).stop());
  }
  /**
   * Drag works differently depending on which props are provided.
   *
   * - If _dragX and _dragY are provided, we output the gesture delta directly to those motion values.
   * - Otherwise, we apply the delta to the x/y motion values.
   */
  getAxisMotionValue(t) {
    const o = `_drag${t.toUpperCase()}`, a = this.visualElement.getProps()[o];
    return a || this.visualElement.getValue(t, this.visualElement.latestValues[t] ?? 0);
  }
  snapToCursor(t) {
    en((o) => {
      const { drag: i } = this.getProps();
      if (!ra(o, i, this.currentDirection))
        return;
      const { projection: a } = this.visualElement, f = this.getAxisMotionValue(o);
      if (a && a.layout) {
        const { min: d, max: p } = a.layout.layoutBox[o], m = f.get() || 0;
        f.set(t[o] - Ce(d, p, 0.5) + m);
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
    const { drag: t, dragConstraints: o } = this.getProps(), { projection: i } = this.visualElement;
    if (!lo(o) || !i || !this.constraints)
      return;
    this.stopAnimation();
    const a = { x: 0, y: 0 };
    en((d) => {
      const p = this.getAxisMotionValue(d);
      if (p && this.constraints !== !1) {
        const m = p.get();
        a[d] = hb({ min: m, max: m }, this.constraints[d]);
      }
    });
    const { transformTemplate: f } = this.visualElement.getProps();
    this.visualElement.current.style.transform = f ? f({}, "") : "none", i.root && i.root.updateScroll(), i.updateLayout(), this.constraints = !1, this.resolveConstraints(), en((d) => {
      if (!ra(d, t, null))
        return;
      const p = this.getAxisMotionValue(d), { min: m, max: y } = this.constraints[d];
      p.set(Ce(m, y, a[d]));
    }), this.visualElement.render();
  }
  addListeners() {
    if (!this.visualElement.current)
      return;
    vb.set(this.visualElement, this);
    const t = this.visualElement.current, o = xi(t, "pointerdown", (y) => {
      const { drag: S, dragListener: l = !0 } = this.getProps(), c = y.target, g = c !== t && ZT(c);
      S && l && !g && this.start(y);
    });
    let i;
    const a = () => {
      const { dragConstraints: y } = this.getProps();
      lo(y) && y.current && (this.constraints = this.resolveRefConstraints(), i || (i = wb(t, y.current, () => this.scalePositionWithinConstraints())));
    }, { projection: f } = this.visualElement, d = f.addEventListener("measure", a);
    f && !f.layout && (f.root && f.root.updateScroll(), f.updateLayout()), ke.read(a);
    const p = Ei(window, "resize", () => this.scalePositionWithinConstraints()), m = f.addEventListener("didUpdate", (({ delta: y, hasLayoutChanged: S }) => {
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
    const t = this.visualElement.getProps(), { drag: o = !1, dragDirectionLock: i = !1, dragPropagation: a = !1, dragConstraints: f = !1, dragElastic: d = td, dragMomentum: p = !0 } = t;
    return {
      ...t,
      drag: o,
      dragDirectionLock: i,
      dragPropagation: a,
      dragConstraints: f,
      dragElastic: d,
      dragMomentum: p
    };
  }
}
function ig(e) {
  let t = !0;
  return () => {
    if (t) {
      t = !1;
      return;
    }
    e();
  };
}
function wb(e, t, o) {
  const i = dy(e, ig(o)), a = dy(t, ig(o));
  return () => {
    i(), a();
  };
}
function ra(e, t, o) {
  return (t === !0 || t === e) && (o === null || o === e);
}
function xb(e, t = 10) {
  let o = null;
  return Math.abs(e.y) > t ? o = "y" : Math.abs(e.x) > t && (o = "x"), o;
}
class _b extends er {
  constructor(t) {
    super(t), this.removeGroupControls = jt, this.removeListeners = jt, this.controls = new Sb(t);
  }
  mount() {
    const { dragControls: t } = this.node.getProps();
    t && (this.removeGroupControls = t.subscribe(this.controls)), this.removeListeners = this.controls.addListeners() || jt;
  }
  update() {
    const { dragControls: t } = this.node.getProps(), { dragControls: o } = this.node.prevProps || {};
    t !== o && (this.removeGroupControls(), t && (this.removeGroupControls = t.subscribe(this.controls)));
  }
  unmount() {
    this.removeGroupControls(), this.removeListeners(), this.controls.isDragging || this.controls.endPanSession();
  }
}
const Sc = (e) => (t, o) => {
  e && ke.update(() => e(t, o), !1, !0);
};
class Tb extends er {
  constructor() {
    super(...arguments), this.removePointerDownListener = jt;
  }
  onPointerDown(t) {
    this.session = new E0(t, this.createPanHandlers(), {
      transformPagePoint: this.node.getTransformPagePoint(),
      contextWindow: P0(this.node)
    });
  }
  createPanHandlers() {
    const { onPanSessionStart: t, onPanStart: o, onPan: i, onPanEnd: a } = this.node.getProps();
    return {
      onSessionStart: Sc(t),
      onStart: Sc(o),
      onMove: Sc(i),
      onEnd: (f, d) => {
        delete this.session, a && ke.postRender(() => a(f, d));
      }
    };
  }
  mount() {
    this.removePointerDownListener = xi(this.node.current, "pointerdown", (t) => this.onPointerDown(t));
  }
  update() {
    this.session && this.session.updateHandlers(this.createPanHandlers());
  }
  unmount() {
    this.removePointerDownListener(), this.session && this.session.end();
  }
}
let wc = !1;
class kb extends b.Component {
  /**
   * This only mounts projection nodes for components that
   * need measuring, we might want to do it for all components
   * in order to incorporate transforms
   */
  componentDidMount() {
    const { visualElement: t, layoutGroup: o, switchLayoutGroup: i, layoutId: a } = this.props, { projection: f } = t;
    f && (o.group && o.group.add(f), i && i.register && a && i.register(f), wc && f.root.didUpdate(), f.addEventListener("animationComplete", () => {
      this.safeToRemove();
    }), f.setOptions({
      ...f.options,
      layoutDependency: this.props.layoutDependency,
      onExitComplete: () => this.safeToRemove()
    })), _a.hasEverUpdated = !0;
  }
  getSnapshotBeforeUpdate(t) {
    const { layoutDependency: o, visualElement: i, drag: a, isPresent: f } = this.props, { projection: d } = i;
    return d && (d.isPresent = f, t.layoutDependency !== o && d.setOptions({
      ...d.options,
      layoutDependency: o
    }), wc = !0, a || t.layoutDependency !== o || o === void 0 || t.isPresent !== f ? d.willUpdate() : this.safeToRemove(), t.isPresent !== f && (f ? d.promote() : d.relegate() || ke.postRender(() => {
      const p = d.getStack();
      (!p || !p.members.length) && this.safeToRemove();
    }))), null;
  }
  componentDidUpdate() {
    const { visualElement: t, layoutAnchor: o } = this.props, { projection: i } = t;
    i && (i.options.layoutAnchor = o, i.root.didUpdate(), Qd.postRender(() => {
      !i.currentAnimation && i.isLead() && this.safeToRemove();
    }));
  }
  componentWillUnmount() {
    const { visualElement: t, layoutGroup: o, switchLayoutGroup: i } = this.props, { projection: a } = t;
    wc = !0, a && (a.scheduleCheckAfterUnmount(), o && o.group && o.group.remove(a), i && i.deregister && i.deregister(a));
  }
  safeToRemove() {
    const { safeToRemove: t } = this.props;
    t && t();
  }
  render() {
    return null;
  }
}
function R0(e) {
  const [t, o] = S0(), i = b.useContext(Nd);
  return x.jsx(kb, { ...e, layoutGroup: i, switchLayoutGroup: b.useContext(b0), isPresent: t, safeToRemove: o });
}
const Ab = {
  pan: {
    Feature: Tb
  },
  drag: {
    Feature: _b,
    ProjectionNode: v0,
    MeasureLayout: R0
  }
};
function sg(e, t, o) {
  const { props: i } = e;
  e.animationState && i.whileHover && e.animationState.setActive("whileHover", o === "Start");
  const a = "onHover" + o, f = i[a];
  f && ke.postRender(() => f(t, Li(t)));
}
class bb extends er {
  mount() {
    const { current: t } = this.node;
    t && (this.unmount = KT(t, (o, i) => (sg(this.node, i, "Start"), (a) => sg(this.node, a, "End"))));
  }
  unmount() {
  }
}
class Cb extends er {
  constructor() {
    super(...arguments), this.isActive = !1;
  }
  onFocus() {
    let t = !1;
    try {
      t = this.node.current.matches(":focus-visible");
    } catch {
      t = !0;
    }
    !t || !this.node.animationState || (this.node.animationState.setActive("whileFocus", !0), this.isActive = !0);
  }
  onBlur() {
    !this.isActive || !this.node.animationState || (this.node.animationState.setActive("whileFocus", !1), this.isActive = !1);
  }
  mount() {
    this.unmount = ji(Ei(this.node.current, "focus", () => this.onFocus()), Ei(this.node.current, "blur", () => this.onBlur()));
  }
  unmount() {
  }
}
function ag(e, t, o) {
  const { props: i } = e;
  if (e.current instanceof HTMLButtonElement && e.current.disabled)
    return;
  e.animationState && i.whileTap && e.animationState.setActive("whileTap", o === "Start");
  const a = "onTap" + (o === "End" ? "" : o), f = i[a];
  f && ke.postRender(() => f(t, Li(t)));
}
class Pb extends er {
  mount() {
    const { current: t } = this.node;
    if (!t)
      return;
    const { globalTapTarget: o, propagate: i } = this.node.props;
    this.unmount = qT(t, (a, f) => (ag(this.node, f, "Start"), (d, { success: p }) => ag(this.node, d, p ? "End" : "Cancel")), {
      useGlobalTarget: o,
      stopPropagation: (i == null ? void 0 : i.tap) === !1
    });
  }
  unmount() {
  }
}
const nd = /* @__PURE__ */ new WeakMap(), xc = /* @__PURE__ */ new WeakMap(), Eb = (e) => {
  const t = nd.get(e.target);
  t && t(e);
}, Mb = (e) => {
  e.forEach(Eb);
};
function Rb({ root: e, ...t }) {
  const o = e || document;
  xc.has(o) || xc.set(o, {});
  const i = xc.get(o), a = JSON.stringify(t);
  return i[a] || (i[a] = new IntersectionObserver(Mb, { root: e, ...t })), i[a];
}
function Db(e, t, o) {
  const i = Rb(t);
  return nd.set(e, o), i.observe(e), () => {
    nd.delete(e), i.unobserve(e);
  };
}
const Nb = {
  some: 0,
  all: 1
};
class jb extends er {
  constructor() {
    super(...arguments), this.hasEnteredView = !1, this.isInView = !1;
  }
  startObserver() {
    var m;
    (m = this.stopObserver) == null || m.call(this);
    const { viewport: t = {} } = this.node.getProps(), { root: o, margin: i, amount: a = "some", once: f } = t, d = {
      root: o ? o.current : void 0,
      rootMargin: i,
      threshold: typeof a == "number" ? a : Nb[a]
    }, p = (y) => {
      const { isIntersecting: S } = y;
      if (this.isInView === S || (this.isInView = S, f && !S && this.hasEnteredView))
        return;
      S && (this.hasEnteredView = !0), this.node.animationState && this.node.animationState.setActive("whileInView", S);
      const { onViewportEnter: l, onViewportLeave: c } = this.node.getProps(), g = S ? l : c;
      g && g(y);
    };
    this.stopObserver = Db(this.node.current, d, p);
  }
  mount() {
    this.startObserver();
  }
  update() {
    if (typeof IntersectionObserver > "u")
      return;
    const { props: t, prevProps: o } = this.node;
    ["amount", "margin", "root"].some(Ib(t, o)) && this.startObserver();
  }
  unmount() {
    var t;
    (t = this.stopObserver) == null || t.call(this), this.hasEnteredView = !1, this.isInView = !1;
  }
}
function Ib({ viewport: e = {} }, { viewport: t = {} } = {}) {
  return (o) => e[o] !== t[o];
}
const Fb = {
  inView: {
    Feature: jb
  },
  tap: {
    Feature: Pb
  },
  focus: {
    Feature: Cb
  },
  hover: {
    Feature: bb
  }
}, Ob = {
  layout: {
    ProjectionNode: v0,
    MeasureLayout: R0
  }
}, Lb = {
  ...ab,
  ...Fb,
  ...Ab,
  ...Ob
}, wn = /* @__PURE__ */ nb(Lb, rb);
function Va(e) {
  const t = Pr(() => Mr(e)), { isStatic: o } = b.useContext(Oi);
  if (o) {
    const [, i] = b.useState(e);
    b.useEffect(() => t.on("change", i), []);
  }
  return t;
}
function D0(e, t) {
  const o = Va(t()), i = () => o.set(t());
  return i(), jd(() => {
    const a = () => ke.preRender(i, !1, !0), f = e.map((d) => d.on("change", a));
    return () => {
      f.forEach((d) => d()), Sn(i);
    };
  }), o;
}
function Vb(e) {
  Si.current = [], e();
  const t = D0(Si.current, e);
  return Si.current = void 0, t;
}
function za(e, t, o, i) {
  if (typeof e == "function")
    return Vb(e);
  if (o !== void 0 && !Array.isArray(o) && typeof t != "function")
    return zb(e, t, o, i);
  const d = typeof t == "function" ? t : uk(t, o, i), p = Array.isArray(e) ? lg(e, d) : lg([e], ([y]) => d(y)), m = Array.isArray(e) ? void 0 : e.accelerate;
  return m && !m.isTransformed && typeof t != "function" && Array.isArray(o) && (i == null ? void 0 : i.clamp) !== !1 && (p.accelerate = {
    ...m,
    times: t,
    keyframes: o,
    isTransformed: !0
  }), p;
}
function lg(e, t) {
  const o = Pr(() => []);
  return D0(e, () => {
    o.length = 0;
    const i = e.length;
    for (let a = 0; a < i; a++)
      o[a] = e[a].get();
    return t(o);
  });
}
function zb(e, t, o, i) {
  const a = Pr(() => Object.keys(o)), f = Pr(() => ({}));
  for (const d of a)
    f[d] = za(e, t, o[d], i);
  return f;
}
function Bb(e, t = {}) {
  const { isStatic: o } = b.useContext(Oi), i = () => We(e) ? e.get() : e;
  if (o)
    return za(i);
  const a = Va(i());
  return b.useInsertionEffect(() => ck(a, e, t), [a, JSON.stringify(t)]), a;
}
function ug(e, t = {}) {
  return Bb(e, { type: "spring", ...t });
}
function $b() {
  !tf.current && Yv();
  const [e] = b.useState(ja.current);
  return e;
}
function Ub(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function N0(e) {
  const t = String(e || "").toLowerCase();
  return t === "127.0.0.1" || t === "localhost" || t === "::1" || t === "[::1]";
}
function cg(e) {
  return N0(e) || Ub(e);
}
function Hb(e) {
  return !e || N0(e) ? "127.0.0.1" : e;
}
const Wb = (() => {
  var S, l, c, g;
  const e = globalThis.window || globalThis, t = globalThis.document || {}, o = e.location || {}, i = String(e.SYNAPSE_DATA_API_PORT || ((l = (S = t.body) == null ? void 0 : S.dataset) == null ? void 0 : l.dataApiPort) || "3001").trim(), { protocol: a = "file:", hostname: f = "127.0.0.1", port: d = "" } = o, p = `http://${Hb(f)}:${i || "3001"}`, m = String(e.SYNAPSE_DATA_API_BASE || ((g = (c = t.body) == null ? void 0 : c.dataset) == null ? void 0 : g.dataApiBase) || "").replace(/\/+$/, ""), y = `${a}//${o.host || (d ? `${f}:${d}` : f)}`.replace(/\/+$/, "");
  return m && !(cg(f) && d !== i && m === y) ? m : a === "file:" || cg(f) && d !== i ? p : `${a}//${o.host || f}`;
})(), Gb = new Hg(Wb), _c = Number((globalThis.window || globalThis).SYNAPSE_DATA_API_TIMEOUT_MS || 6e3), Kb = Number.isFinite(_c) && _c > 0 ? _c : 6e3;
function Yb(e, t) {
  typeof window > "u" || console.warn(e, t);
}
async function Xb(e) {
  var i, a;
  const o = (((a = (i = e.headers) == null ? void 0 : i.get) == null ? void 0 : a.call(i, "content-type")) || "").includes("application/json") ? await e.json() : {};
  if (!e.ok || (o == null ? void 0 : o.ok) === !1)
    throw new Error((o == null ? void 0 : o.error) || `Synapse data API returned HTTP ${e.status}`);
  return o;
}
async function Qb(e, t = {}) {
  const o = await Gb.fetch(e, {
    timeoutMs: Kb,
    ...t
  });
  return Xb(o);
}
async function Zb(e) {
  try {
    return (await Qb("/api/focus-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(e || {})
    })).item || null;
  } catch (t) {
    return Yb("Synapse data API focus-session save skipped:", t), null;
  }
}
class Jb {
  constructor(t = () => globalThis.localStorage) {
    this.storageProvider = t;
  }
  get storage() {
    return this.storageProvider();
  }
  set(t, o) {
    try {
      return this.storage.setItem(t, o), !0;
    } catch (i) {
      return console.warn(`Could not save ${t} to localStorage:`, i), !1;
    }
  }
  get(t, o = "") {
    try {
      const i = this.storage.getItem(t);
      return i === null ? o : i;
    } catch (i) {
      return console.warn(`Could not read ${t} from localStorage:`, i), o;
    }
  }
  remove(t) {
    try {
      return this.storage.removeItem(t), !0;
    } catch (o) {
      return console.warn(`Could not remove ${t} from localStorage:`, o), !1;
    }
  }
  readJSON(t, o) {
    const i = this.get(t, "");
    if (!i) return o;
    try {
      const a = JSON.parse(i);
      return a ?? o;
    } catch (a) {
      return console.warn(`Could not parse ${t} from localStorage:`, a), o;
    }
  }
  writeJSON(t, o) {
    try {
      return this.set(t, JSON.stringify(o));
    } catch (i) {
      return console.warn(`Could not serialize ${t} for localStorage:`, i), !1;
    }
  }
}
const j0 = new Jb();
function af(e, t) {
  return j0.readJSON(e, t);
}
function lf(e, t) {
  return j0.writeJSON(e, t);
}
const I0 = "synapse.focusRoom.sessions.v1", F0 = "synapse.focusRoom.draft.v1", O0 = "synapse.focusRoom.active-session.v1", rd = 40, dg = Object.freeze([
  "idle",
  "running",
  "paused",
  "completed",
  "break",
  "restoring"
]), qb = Object.freeze({
  studying: "running",
  running: "running",
  idle: "idle",
  paused: "paused",
  completed: "completed",
  break: "break",
  restoring: "restoring"
});
let od = [];
const yr = (e) => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURI(e)}`, Yn = [
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
], _i = Object.freeze([
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
function eC(e = "") {
  const t = String(e || "");
  return _i.find((o) => o.id === t) || _i[_i.length - 1];
}
function tC(e = {}) {
  return _i.find((t) => t.musicType === String((e == null ? void 0 : e.musicType) || "") && t.ambientSound === String((e == null ? void 0 : e.ambientSound) || "")) || null;
}
const Xe = {
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
}, Xn = [
  {
    label: "Nature",
    layers: [Xe.nature],
    pageUrl: Xe.nature.pageUrl,
    license: Xe.nature.license
  },
  {
    label: "Cafe Rain",
    layers: [Xe.cafe, Xe.rain],
    pageUrl: Xe.cafe.pageUrl,
    license: "CC0 / Public domain"
  },
  {
    label: "Rain",
    layers: [Xe.rain],
    pageUrl: Xe.rain.pageUrl,
    license: Xe.rain.license
  },
  {
    label: "White Noise",
    layers: [Xe.whiteNoise],
    pageUrl: Xe.whiteNoise.pageUrl,
    license: Xe.whiteNoise.license
  },
  {
    label: "Ocean",
    layers: [Xe.ocean],
    pageUrl: Xe.ocean.pageUrl,
    license: Xe.ocean.license
  },
  {
    label: "Wind",
    layers: [Xe.wind],
    pageUrl: Xe.wind.pageUrl,
    license: Xe.wind.license
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
], nC = Zn, L0 = [25, 45, 50, 90];
function rC(e = "") {
  const t = String(e || "");
  return Yn.find((o) => o.label === t) || Yn[0];
}
function oC(e = "") {
  const t = String(e || "");
  return Xn.find((o) => o.label === t) || Xn[0];
}
function tl(e = {}) {
  const t = rC(e == null ? void 0 : e.musicType), o = oC(e == null ? void 0 : e.ambientSound);
  return {
    musicTrack: t,
    ambientSound: o,
    ambientLayers: o.layers.map((i) => ({
      ...i,
      volumeBias: Wn(i.volumeBias, 1)
    }))
  };
}
function iC(e) {
  return e && typeof e == "object" && !Array.isArray(e) ? e : {};
}
function V0(e) {
  return String(e || "").trim();
}
function sC({ material: e, goal: t, durationMinutes: o }) {
  var S;
  const i = Math.max(10, Number(o) || 25), a = (S = e == null ? void 0 : e.studyHeadings) != null && S.length ? e.studyHeadings : ["Key ideas", "Examples", "Practice", "Review"], f = String(t || "").trim() || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`, d = Math.max(1, Math.floor(i * 0.2)), p = Math.max(1, Math.floor(i * 0.4)), m = Math.max(1, Math.floor(i * 0.2)), y = Math.max(1, i - d - p - m);
  return [
    { minutes: d, task: `Set the goal: ${f}` },
    { minutes: p, task: `Review ${a[0] || "the core ideas"}` },
    { minutes: m, task: `Practice with ${a[1] || a[0] || "the generated examples"}` },
    { minutes: y, task: "Summarize mistakes and choose the next study step" }
  ];
}
function z0() {
  return af(F0, null);
}
function aC(e) {
  return lf(F0, e || null);
}
function B0(e) {
  if (!e || typeof e != "object")
    return { materials: {} };
  const t = iC(e.materials);
  return {
    ...e,
    materials: { ...t }
  };
}
function vo(e, t = "idle") {
  const o = qb[String(e || "").trim().toLowerCase()];
  return o && dg.includes(o) ? o : dg.includes(t) ? t : "idle";
}
function uf(e) {
  return vo(e) === "running" ? "studying" : vo(e);
}
function $0(e = {}, t = {}) {
  const o = e && typeof e == "object" ? e : {}, i = t && typeof t == "object" ? t : {}, a = Object.prototype.hasOwnProperty.call(o, "timerStatus"), f = Object.prototype.hasOwnProperty.call(o, "timerState") || Object.prototype.hasOwnProperty.call(o, "timerPhase"), d = vo(
    f ? o.timerState || o.timerPhase : a ? o.timerStatus : o.status || i.timerState,
    vo(i.timerState || i.timerPhase || i.timerStatus)
  ), p = o.timerMode === "countup" || i.timerMode === "countup" && !Object.prototype.hasOwnProperty.call(o, "timerMode") ? "countup" : "countdown", y = Object.fromEntries(["timerAnchorAtMs", "timerPausedAtMs", "timerUpdatedAtMs", "timerRestoredAtMs"].map((l) => {
    const c = Object.prototype.hasOwnProperty.call(o, l) ? o[l] : i[l], g = Number(c);
    return [l, Number.isFinite(g) && g > 0 ? g : null];
  })), S = Math.max(0, Wn(
    Object.prototype.hasOwnProperty.call(o, "elapsedSeconds") ? o.elapsedSeconds : i.elapsedSeconds,
    0
  ));
  return {
    ...i,
    ...o,
    timerState: d,
    timerPhase: d,
    status: d,
    timerStatus: uf(d),
    timerMode: p,
    elapsedSeconds: S,
    ...y
  };
}
function U0() {
  return B0(af(O0, null));
}
function lC(e) {
  return lf(O0, B0(e));
}
function H0(e) {
  const t = V0(e);
  if (!t) return null;
  const i = U0().materials[t];
  return i && typeof i == "object" ? $0(i) : null;
}
function cf(e, t) {
  const o = V0(e);
  if (!o) return !1;
  const i = U0();
  return t && typeof t == "object" ? i.materials[o] = {
    ...$0(t, i.materials[o]),
    materialId: o,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  } : delete i.materials[o], lC(i);
}
function Ta(e) {
  return cf(e, null);
}
function id() {
  const e = af(I0, []), t = Array.isArray(e) ? e : [], o = /* @__PURE__ */ new Set();
  return [...od, ...t].filter((i) => {
    const a = String((i == null ? void 0 : i.sessionId) || "");
    return !a || o.has(a) ? !1 : (o.add(a), !0);
  }).slice(0, rd);
}
function Wn(e, t) {
  const o = Number(e);
  return Number.isFinite(o) ? o : t;
}
function uC(e = {}) {
  const t = (/* @__PURE__ */ new Date()).toISOString(), i = { ...{
    sessionId: e.sessionId || `focus-${Date.now()}`,
    materialId: String(e.materialId || ""),
    materialTitle: e.materialTitle || "Study material",
    studyGoal: e.studyGoal || "",
    selectedScene: e.selectedScene || "morning-window",
    musicType: e.musicType || "Deep Focus",
    ambientSound: e.ambientSound || "Nature",
    musicVolume: Wn(e.musicVolume ?? 60, 60),
    ambientVolume: Wn(e.ambientVolume ?? 50, 50),
    pomodoroDuration: Wn(e.pomodoroDuration || 25, 25),
    startedAt: e.startedAt || t,
    endedAt: e.endedAt || t,
    totalFocusTime: Math.max(0, Wn(e.totalFocusTime || 0, 0)),
    flashcardsCompleted: Math.max(0, Wn(e.flashcardsCompleted || 0, 0)),
    quizScore: e.quizScore === null || e.quizScore === void 0 || e.quizScore === "" ? null : Number.isFinite(Number(e.quizScore)) ? Number(e.quizScore) : null,
    mistakesMade: Array.isArray(e.mistakesMade) ? e.mistakesMade : [],
    completedTasks: Array.isArray(e.completedTasks) ? e.completedTasks : [],
    aiReflection: e.aiReflection || "You protected a focused study block and created momentum for the next session.",
    recommendedNextStep: e.recommendedNextStep || "Review the hardest item, then start another short focus block.",
    sessionDate: e.sessionDate || t
  }, persisted: !0 }, a = id().filter((m) => m.sessionId !== i.sessionId), f = [i, ...a.map((m) => ({ ...m, persisted: !0 }))].slice(0, rd), d = lf(I0, f), p = { ...i, persisted: d };
  return Zb(p).catch((m) => {
    console.warn("Synapse data API focus-session background save failed:", m);
  }), d ? od = [] : od = [p, ...a].slice(0, rd), p;
}
function W0(e) {
  const t = Math.max(0, Wn(e || 0, 0)), o = Math.floor(t / 3600), i = Math.floor(t % 3600 / 60);
  return o ? `${o}h ${i}m` : `${i}m`;
}
const be = (e, t, o, i) => Object.freeze({ kind: e, duration: t, intensity: o, density: i }), fg = Object.freeze({
  "morning-window": Object.freeze({
    id: "morning-window",
    layers: Object.freeze([be("camera", 32, 0.34, 0.42), be("foliage", 18, 0.24, 0.38), be("light", 26, 0.2, 0.3)])
  }),
  "cabin-twilight": Object.freeze({
    id: "cabin-twilight",
    layers: Object.freeze([be("camera", 38, 0.28, 0.32), be("mist", 34, 0.2, 0.35), be("light", 22, 0.2, 0.28)])
  }),
  "last-light-lounge": Object.freeze({
    id: "last-light-lounge",
    layers: Object.freeze([be("camera", 36, 0.24, 0.3), be("rain", 16, 0.28, 0.42), be("mist", 32, 0.18, 0.28), be("light", 24, 0.18, 0.24)])
  }),
  "garden-cafe": Object.freeze({
    id: "garden-cafe",
    layers: Object.freeze([be("camera", 34, 0.26, 0.32), be("rain", 14, 0.34, 0.52), be("foliage", 20, 0.2, 0.38), be("light", 28, 0.18, 0.26)])
  }),
  "sunset-classroom": Object.freeze({
    id: "sunset-classroom",
    layers: Object.freeze([be("camera", 40, 0.2, 0.25), be("light", 20, 0.3, 0.36), be("foliage", 28, 0.14, 0.22)])
  }),
  "tokyo-night": Object.freeze({
    id: "tokyo-night",
    layers: Object.freeze([be("camera", 42, 0.2, 0.26), be("mist", 36, 0.16, 0.24), be("light", 18, 0.24, 0.44)])
  }),
  "snow-window-cabin": Object.freeze({
    id: "snow-window-cabin",
    layers: Object.freeze([be("camera", 38, 0.24, 0.28), be("snow", 18, 0.34, 0.48), be("light", 26, 0.2, 0.28)])
  }),
  "bamboo-cabin": Object.freeze({
    id: "bamboo-cabin",
    layers: Object.freeze([be("camera", 36, 0.24, 0.3), be("foliage", 16, 0.24, 0.46), be("water", 24, 0.2, 0.36), be("mist", 32, 0.16, 0.26)])
  })
});
function cC(e = "") {
  return fg[String(e || "")] || fg["morning-window"];
}
var Bg;
const sd = ((Bg = Zn[0]) == null ? void 0 : Bg.id) || "morning-window", ho = L0[0] || 25, dC = 10, nl = 180, df = 60, G0 = nl * 60, fC = 0, pC = 100, mC = ["materials", "notes", "sources", "chat", "quiz", "flashcards", "mindmap", "plan", "workspace", "history"], ad = new Set(mC), Ba = {
  type: "spring",
  stiffness: 120,
  damping: 18,
  mass: 0.8
};
function hC(e, t, o, i) {
  const a = Number(e);
  return Number.isFinite(a) ? Math.min(i, Math.max(o, a)) : t;
}
function Ar(e, t, o, i) {
  return Math.round(hC(e, t, o, i));
}
function Tt(e, t = 50) {
  return Ar(e, t, fC, pC);
}
function _r(e, t = ho) {
  return Ar(e, t, dC, nl);
}
function rn(e, t = ho * 60) {
  return Ar(e, t, df, G0);
}
function $a(e) {
  return Zn.find((t) => t.id === e) || null;
}
function vn(e = sd) {
  return $a(e) || Zn[0] || {
    id: sd,
    name: "Focus Room",
    kicker: "Focus",
    description: "A quiet study space.",
    image: "",
    ambientSound: "Nature",
    musicType: "Deep Focus"
  };
}
function K0(e) {
  return Array.isArray(e) ? e.map((t) => ({
    minutes: Ar(t == null ? void 0 : t.minutes, 5, 1, nl),
    task: String((t == null ? void 0 : t.task) || "").trim()
  })).filter((t) => t.task) : [];
}
function yi(e) {
  return Array.isArray(e) ? e.map((t) => ({
    role: String((t == null ? void 0 : t.role) || "assistant") === "user" ? "user" : "assistant",
    text: String((t == null ? void 0 : t.text) || "").trim(),
    createdAt: (t == null ? void 0 : t.createdAt) || (/* @__PURE__ */ new Date()).toISOString()
  })).filter((t) => t.text).slice(-24) : [];
}
function Y0(e) {
  if (!e || typeof e != "object")
    return { materials: {} };
  if (e.materials && typeof e.materials == "object")
    return {
      ...e,
      materials: { ...e.materials }
    };
  const t = String(e.materialId || "");
  return t ? {
    materials: {
      [t]: e
    }
  } : { materials: {} };
}
function ld(e, t, o) {
  return e ? sC({
    material: e,
    goal: t,
    durationMinutes: o
  }) : [];
}
function Mi(e) {
  const t = _r(e);
  return t > 0 ? t * 60 : 0;
}
function ud(e) {
  const t = Math.max(0, Math.floor(Number(e) || 0)), o = Math.floor(t / 3600), i = Math.floor(t % 3600 / 60), a = t % 60, f = (d) => String(d).padStart(2, "0");
  return o ? `${o}:${f(i)}:${f(a)}` : `${f(i)}:${f(a)}`;
}
function pg(e) {
  const t = (e == null ? void 0 : e.flashcards) || [];
  return Array.isArray(t) ? t.slice(0, 24) : [];
}
function yC(e, t) {
  return String((e == null ? void 0 : e.id) || (e == null ? void 0 : e.front) || (e == null ? void 0 : e.term) || t);
}
function gC(e) {
  var t;
  return Array.isArray(e == null ? void 0 : e.questions) ? e.questions : Array.isArray((t = e == null ? void 0 : e.quiz) == null ? void 0 : t.questions) ? e.quiz.questions : [];
}
function cd(e) {
  return (Array.isArray(e == null ? void 0 : e.quizzes) ? e.quizzes : []).flatMap((o) => gC(o).map((i) => {
    var a;
    return {
      ...i,
      quizTitle: (o == null ? void 0 : o.title) || ((a = o == null ? void 0 : o.quiz) == null ? void 0 : a.title) || "Saved quiz"
    };
  })).slice(0, 12);
}
function vC(e, t) {
  return (e == null ? void 0 : e.question) || (e == null ? void 0 : e.prompt) || (e == null ? void 0 : e.stem) || `Question ${t + 1}`;
}
function ff(e) {
  return String((e == null ? void 0 : e.type) || "").toLowerCase();
}
function SC(e) {
  return String((e == null ? void 0 : e.label) || (e == null ? void 0 : e.text) || e).trim();
}
function Ua(e) {
  const t = (e == null ? void 0 : e.choices) || (e == null ? void 0 : e.options) || (e == null ? void 0 : e.answers);
  return Array.isArray(t) && t.length ? t.map(SC).filter(Boolean) : ff(e) === "true_false" ? ["True", "False"] : [];
}
function dd(e) {
  const t = (e == null ? void 0 : e.correctOptionIndexes) || (e == null ? void 0 : e.correct_option_indexes) || (e == null ? void 0 : e.correctIndexes);
  return Array.isArray(t) ? t.map((o) => Number(o)).filter(Number.isInteger) : [];
}
function wC(e, t) {
  const o = Array.isArray(e) ? [...e].map(Number).filter(Number.isInteger).sort((a, f) => a - f) : [], i = Array.isArray(t) ? [...t].map(Number).filter(Number.isInteger).sort((a, f) => a - f) : [];
  return o.length === i.length && o.every((a, f) => a === i[f]);
}
function br(e) {
  return String(e || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function Ha(e, t) {
  if (Number.isInteger(t)) return t;
  const o = Number(t);
  if (typeof t != "string" && Number.isInteger(o)) return o;
  const i = Ua(e), a = br(t);
  return i.findIndex((f) => br(f) === a);
}
function X0(e, t) {
  if (typeof t == "boolean") return t;
  if (t === 0) return !0;
  if (t === 1) return !1;
  const o = Ua(e), i = br(t);
  return i === "true" ? !0 : i === "false" ? !1 : br(o[0]) === i ? !0 : br(o[1]) === i ? !1 : null;
}
function xC(e, t, o) {
  const i = ff(e);
  if (i === "multiple_choice") {
    const a = Ha(e, t);
    if (!Number.isInteger(a) || a < 0) return [];
    const f = Array.isArray(o) ? [...o] : [];
    return f.includes(a) ? f.filter((d) => d !== a) : [...f, a].sort((d, p) => d - p);
  }
  if (i === "single_choice") {
    const a = Ha(e, t);
    return Number.isInteger(a) && a >= 0 ? a : "";
  }
  if (i === "true_false") {
    const a = X0(e, t);
    return a === null ? "" : a;
  }
  return String(t || "");
}
function Q0(e) {
  const t = (e == null ? void 0 : e.correctAnswer) ?? (e == null ? void 0 : e.correct_answer) ?? (e == null ? void 0 : e.answer) ?? (e == null ? void 0 : e.correct), o = dd(e);
  if (o.length) {
    const i = Ua(e);
    return o.map((a) => i[a] || "").filter(Boolean).join(", ");
  }
  if (typeof (e == null ? void 0 : e.correctBoolean) == "boolean" || typeof (e == null ? void 0 : e.correct_boolean) == "boolean") {
    const i = Ua(e);
    return (typeof e.correctBoolean == "boolean" ? e.correctBoolean : e.correct_boolean) ? i[0] || "True" : i[1] || "False";
  }
  return e != null && e.expectedAnswer || e != null && e.expected_answer ? String(e.expectedAnswer || e.expected_answer || "").trim() : Array.isArray(t) ? t.map((i) => String(i)).join(", ") : String(t || "").trim();
}
function _C(e, t) {
  const o = ff(e);
  if (o === "single_choice") {
    const a = dd(e)[0], f = Ha(e, t);
    return Number.isInteger(a) ? f === a : null;
  }
  if (o === "multiple_choice") {
    const a = dd(e), f = Array.isArray(t) ? t : [Ha(e, t)].filter(Number.isInteger);
    return a.length ? wC(f, a) : null;
  }
  if (o === "true_false") {
    const a = typeof (e == null ? void 0 : e.correctBoolean) == "boolean" ? e.correctBoolean : e == null ? void 0 : e.correct_boolean, f = X0(e, t);
    return typeof a == "boolean" && f !== null ? f === a : null;
  }
  const i = Q0(e);
  return i ? br(t) === br(i) : null;
}
function Z0(e, t, o) {
  var p;
  const i = String(e || "").trim(), a = String((t == null ? void 0 : t.summaryText) || (t == null ? void 0 : t.aiSummary) || "").slice(0, 420), f = ((p = t == null ? void 0 : t.studyHeadings) == null ? void 0 : p[0]) || (t == null ? void 0 : t.materialTitle) || "this material", d = o || `Study ${(t == null ? void 0 : t.materialTitle) || "this material"}`;
  return i ? [
    `For ${f}: ${a || "use the selected material as your main source."}`,
    `Your current goal is: ${d}.`,
    "Try explaining the idea in one sentence, then test yourself with one example before moving on."
  ].join(" ") : "";
}
function TC() {
  return /* @__PURE__ */ x.jsx("svg", { className: "liquid-glass-filter-defs", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ x.jsx("defs", { children: /* @__PURE__ */ x.jsxs("filter", { id: "liquid-glass-displacement", x: "-12%", y: "-12%", width: "124%", height: "124%", colorInterpolationFilters: "sRGB", children: [
    /* @__PURE__ */ x.jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.012 0.024", numOctaves: "2", seed: "17", result: "liquid-noise" }),
    /* @__PURE__ */ x.jsx("feDisplacementMap", { in: "SourceGraphic", in2: "liquid-noise", scale: "7", xChannelSelector: "R", yChannelSelector: "B", result: "refracted-surface" }),
    /* @__PURE__ */ x.jsx("feColorMatrix", { in: "refracted-surface", type: "matrix", values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.04 0", result: "edge-alpha" }),
    /* @__PURE__ */ x.jsx("feGaussianBlur", { in: "edge-alpha", stdDeviation: "0.25", result: "soft-edge" }),
    /* @__PURE__ */ x.jsx("feBlend", { in: "soft-edge", in2: "refracted-surface", mode: "screen" })
  ] }) }) });
}
function kC({ profile: e, paused: t = !1, reducedMotion: o = !1 }) {
  var a;
  if (o || !((a = e == null ? void 0 : e.layers) != null && a.length)) return null;
  const i = e.layers.filter((f) => f.kind !== "camera");
  return /* @__PURE__ */ x.jsx("div", { className: `scene-motion-layer ${t ? "is-paused" : ""}`.trim(), "aria-hidden": "true", children: i.map((f, d) => /* @__PURE__ */ x.jsx(
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
function AC({ scene: e }) {
  const [t, o] = b.useState(e), [i, a] = b.useState(!1), [f, d] = b.useState(!1), [p, m] = b.useState(() => {
    var g;
    return ((g = globalThis.document) == null ? void 0 : g.visibilityState) === "hidden";
  }), [y, S] = b.useState(() => {
    var g, w;
    return ((w = (g = globalThis.matchMedia) == null ? void 0 : g.call(globalThis, "(prefers-reduced-motion: reduce)")) == null ? void 0 : w.matches) || !1;
  });
  b.useEffect(() => {
    a(!1), d(!1);
  }, [t == null ? void 0 : t.id]), b.useEffect(() => {
    if (!(e != null && e.id) || e.id === (t == null ? void 0 : t.id)) return;
    let g = !1;
    const w = new Image();
    return w.onload = () => {
      g || o(e);
    }, w.onerror = () => {
      g || d(!0);
    }, w.src = e.image, () => {
      g = !0, w.onload = null, w.onerror = null;
    };
  }, [t == null ? void 0 : t.id, e]), b.useEffect(() => {
    var w, T;
    const g = () => {
      var A;
      return m(((A = globalThis.document) == null ? void 0 : A.visibilityState) === "hidden");
    };
    return (T = (w = globalThis.document) == null ? void 0 : w.addEventListener) == null || T.call(w, "visibilitychange", g), () => {
      var A, _;
      return (_ = (A = globalThis.document) == null ? void 0 : A.removeEventListener) == null ? void 0 : _.call(A, "visibilitychange", g);
    };
  }, []), b.useEffect(() => {
    var T, A;
    const g = (T = globalThis.matchMedia) == null ? void 0 : T.call(globalThis, "(prefers-reduced-motion: reduce)");
    if (!g) return;
    const w = (_) => S(!!_.matches);
    return S(!!g.matches), (A = g.addEventListener) == null || A.call(g, "change", w), () => {
      var _;
      return (_ = g.removeEventListener) == null ? void 0 : _.call(g, "change", w);
    };
  }, []);
  const l = cC((t == null ? void 0 : t.motionProfile) || (t == null ? void 0 : t.id)), c = l.layers.find((g) => g.kind === "camera");
  return /* @__PURE__ */ x.jsxs("div", { className: "focus-background-wrap", "aria-hidden": "true", children: [
    /* @__PURE__ */ x.jsx(TC, {}),
    /* @__PURE__ */ x.jsx(qa, { mode: "sync", children: /* @__PURE__ */ x.jsxs(
      wn.div,
      {
        className: `focus-background ${i && !y ? "has-scene-motion" : ""} ${p ? "is-motion-paused" : ""}`.trim(),
        style: { backgroundImage: f ? "none" : void 0 },
        initial: { opacity: 0, scale: 1.035 },
        animate: { opacity: 1, scale: 1.02 },
        exit: { opacity: 0, scale: 1.015 },
        transition: { duration: 0.8, ease: "easeOut" },
        children: [
          t != null && t.image ? /* @__PURE__ */ x.jsx(
            "img",
            {
              className: `focus-background-media focus-background-poster ${i ? "is-ready" : ""}`.trim(),
              src: t.image,
              alt: "",
              style: { "--scene-camera-duration": `${(c == null ? void 0 : c.duration) || 36}s`, "--scene-camera-intensity": (c == null ? void 0 : c.intensity) || 0.2 },
              onLoad: () => a(!0),
              onError: () => d(!0)
            }
          ) : null,
          t != null && t.video ? /* @__PURE__ */ x.jsx(
            "video",
            {
              className: `focus-background-media focus-background-video ${i ? "is-ready" : ""}`.trim(),
              src: t.video,
              poster: t.image,
              autoPlay: !0,
              muted: !0,
              loop: !0,
              playsInline: !0,
              preload: "metadata",
              onLoadedData: () => a(!0),
              onError: () => d(!0)
            }
          ) : null,
          /* @__PURE__ */ x.jsx(kC, { profile: l, paused: p, reducedMotion: y })
        ]
      },
      (t == null ? void 0 : t.id) || "focus-background"
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
const bC = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), CC = (e) => e.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (t, o, i) => i ? i.toUpperCase() : o.toLowerCase()
), mg = (e) => {
  const t = CC(e);
  return t.charAt(0).toUpperCase() + t.slice(1);
}, J0 = (...e) => e.filter((t, o, i) => !!t && t.trim() !== "" && i.indexOf(t) === o).join(" ").trim(), PC = (e) => {
  for (const t in e)
    if (t.startsWith("aria-") || t === "role" || t === "title")
      return !0;
};
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var EC = {
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
const MC = b.forwardRef(
  ({
    color: e = "currentColor",
    size: t = 24,
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
      ...EC,
      width: t,
      height: t,
      stroke: e,
      strokeWidth: i ? Number(o) * 24 / Number(t) : o,
      className: J0("lucide", a),
      ...!f && !PC(p) && { "aria-hidden": "true" },
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
const Ae = (e, t) => {
  const o = b.forwardRef(
    ({ className: i, ...a }, f) => b.createElement(MC, {
      ref: f,
      iconNode: t,
      className: J0(
        `lucide-${bC(mg(e))}`,
        `lucide-${e}`,
        i
      ),
      ...a
    })
  );
  return o.displayName = mg(e), o;
};
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const RC = [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
], DC = Ae("arrow-left", RC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const NC = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
], jC = Ae("arrow-right", NC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const IC = [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]], rl = Ae("check", IC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const FC = [["path", { d: "m15 18-6-6 6-6", key: "1wnfg3" }]], OC = Ae("chevron-left", FC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const LC = [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]], VC = Ae("chevron-right", LC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const zC = [
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
], BC = Ae("coffee", zC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const $C = [
  ["rect", { width: "12", height: "12", x: "2", y: "10", rx: "2", ry: "2", key: "6agr2n" }],
  [
    "path",
    { d: "m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6", key: "1o487t" }
  ],
  ["path", { d: "M6 18h.01", key: "uhywen" }],
  ["path", { d: "M10 14h.01", key: "ssrbsk" }],
  ["path", { d: "M15 6h.01", key: "cblpky" }],
  ["path", { d: "M18 9h.01", key: "2061c0" }]
], UC = Ae("dices", $C);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const HC = [
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
], WC = Ae("door-open", HC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const GC = [
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
], Wa = Ae("footprints", GC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const KC = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }],
  ["path", { d: "M12 7v5l4 2", key: "1fdv2h" }]
], YC = Ae("history", KC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const XC = [
  ["path", { d: "m14 10 7-7", key: "oa77jy" }],
  ["path", { d: "M20 10h-6V4", key: "mjg0md" }],
  ["path", { d: "m3 21 7-7", key: "tjx5ai" }],
  ["path", { d: "M4 14h6v6", key: "rmj7iw" }]
], QC = Ae("minimize-2", XC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ZC = [
  ["circle", { cx: "8", cy: "18", r: "4", key: "1fc0mg" }],
  ["path", { d: "M12 18V2l7 4", key: "g04rme" }]
], JC = Ae("music-2", ZC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const qC = [
  ["rect", { x: "14", y: "4", width: "4", height: "16", rx: "1", key: "zuxfzm" }],
  ["rect", { x: "6", y: "4", width: "4", height: "16", rx: "1", key: "1okwgv" }]
], fd = Ae("pause", qC);
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
      d: "M18.5 8c-1.4 0-2.6-.8-3.2-2A6.87 6.87 0 0 0 2 9v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.5C22 9.6 20.4 8 18.5 8",
      key: "lag0yf"
    }
  ],
  ["path", { d: "M2 14h20", key: "myj16y" }],
  ["path", { d: "M6 14v4", key: "9ng0ue" }],
  ["path", { d: "M10 14v4", key: "1v8uk5" }],
  ["path", { d: "M14 14v4", key: "1tqops" }],
  ["path", { d: "M18 14v4", key: "18uqwm" }]
], tP = Ae("piano", eP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const nP = [["polygon", { points: "6 3 20 12 6 21 6 3", key: "1oa8hb" }]], q0 = Ae("play", nP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const rP = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
], oP = Ae("plus", rP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const iP = [
  ["path", { d: "M4.9 19.1C1 15.2 1 8.8 4.9 4.9", key: "1vaf9d" }],
  ["path", { d: "M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5", key: "u1ii0m" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }],
  ["path", { d: "M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5", key: "1j5fej" }],
  ["path", { d: "M19.1 4.9C23 8.8 23 15.1 19.1 19", key: "10b0cb" }]
], sP = Ae("radio", iP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const aP = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
], eS = Ae("rotate-ccw", aP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const lP = [
  [
    "path",
    {
      d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
      key: "1c8476"
    }
  ],
  ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7", key: "1ydtos" }],
  ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7", key: "t51u73" }]
], tS = Ae("save", lP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const uP = [
  ["path", { d: "M14 17H5", key: "gfn3mx" }],
  ["path", { d: "M19 7h-9", key: "6i9tg" }],
  ["circle", { cx: "17", cy: "17", r: "3", key: "18b49y" }],
  ["circle", { cx: "7", cy: "7", r: "3", key: "dfmy0x" }]
], nS = Ae("settings-2", uP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const cP = [
  ["path", { d: "m18 14 4 4-4 4", key: "10pe0f" }],
  ["path", { d: "m18 2 4 4-4 4", key: "pucp1d" }],
  ["path", { d: "M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22", key: "1ailkh" }],
  ["path", { d: "M2 6h1.972a4 4 0 0 1 3.6 2.2", key: "km57vx" }],
  ["path", { d: "M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45", key: "os18l9" }]
], dP = Ae("shuffle", cP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const fP = [
  ["polygon", { points: "5 4 15 12 5 20 5 4", key: "16p6eg" }],
  ["line", { x1: "19", x2: "19", y1: "5", y2: "19", key: "futhcm" }]
], rS = Ae("skip-forward", fP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const pP = [
  ["line", { x1: "21", x2: "14", y1: "4", y2: "4", key: "obuewd" }],
  ["line", { x1: "10", x2: "3", y1: "4", y2: "4", key: "1q6298" }],
  ["line", { x1: "21", x2: "12", y1: "12", y2: "12", key: "1iu8h1" }],
  ["line", { x1: "8", x2: "3", y1: "12", y2: "12", key: "ntss68" }],
  ["line", { x1: "21", x2: "16", y1: "20", y2: "20", key: "14d8ph" }],
  ["line", { x1: "12", x2: "3", y1: "20", y2: "20", key: "m0wm8r" }],
  ["line", { x1: "14", x2: "14", y1: "2", y2: "6", key: "14e1ph" }],
  ["line", { x1: "8", x2: "8", y1: "10", y2: "14", key: "1i6ji0" }],
  ["line", { x1: "16", x2: "16", y1: "18", y2: "22", key: "1lctlv" }]
], mP = Ae("sliders-horizontal", pP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const hP = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["circle", { cx: "12", cy: "12", r: "6", key: "1vlfrh" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }]
], yP = Ae("target", hP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const gP = [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
], vP = Ae("trash-2", gP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const SP = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744", key: "16gr8j" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }]
], Ga = Ae("users", SP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const wP = [
  [
    "path",
    {
      d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
      key: "uqj9uw"
    }
  ],
  ["path", { d: "M16 9a5 5 0 0 1 0 6", key: "1q6k2b" }],
  ["path", { d: "M19.364 18.364a9 9 0 0 0 0-12.728", key: "ijwkga" }]
], ol = Ae("volume-2", wP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const xP = [
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
], pf = Ae("waves", xP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const _P = [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
], oS = Ae("x", _P), hg = (e) => {
  let t;
  const o = /* @__PURE__ */ new Set(), i = (y, S) => {
    const l = typeof y == "function" ? y(t) : y;
    if (!Object.is(l, t)) {
      const c = t;
      t = S ?? (typeof l != "object" || l === null) ? l : Object.assign({}, t, l), o.forEach((g) => g(t, c));
    }
  }, a = () => t, p = { setState: i, getState: a, getInitialState: () => m, subscribe: (y) => (o.add(y), () => o.delete(y)) }, m = t = e(i, a, p);
  return p;
}, TP = ((e) => e ? hg(e) : hg), kP = (e) => e;
function AP(e, t = kP) {
  const o = gn.useSyncExternalStore(
    e.subscribe,
    gn.useCallback(() => t(e.getState()), [e, t]),
    gn.useCallback(() => t(e.getInitialState()), [e, t])
  );
  return gn.useDebugValue(o), o;
}
const yg = (e) => {
  const t = TP(e), o = (i) => AP(t, i);
  return Object.assign(o, t), o;
}, bP = ((e) => e ? yg(e) : yg), CP = /* @__PURE__ */ new Set(["pending", "active", "done"]);
function iS() {
  return `topic-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function Ka(e = {}, t = "pending") {
  const o = String(e.title || e.name || "").trim(), i = String(e.description || e.detail || e.notes || "").trim(), a = CP.has(e.status) ? e.status : t;
  return {
    id: String(e.id || "").trim() || iS(),
    title: o || "Untitled topic",
    description: i,
    status: a
  };
}
function gr(e, t = "Deep work block") {
  const o = Array.isArray(e) ? e.map((d) => Ka(d)).filter(Boolean) : [];
  if (!o.length) {
    const d = Ka({
      title: String(t || "Deep work block").trim() || "Deep work block",
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
    studyGoal: (f == null ? void 0 : f.title) || String(t || "Deep work block")
  };
}
function mf(e = [], t = "") {
  const o = Array.isArray(e) ? e : [];
  return o.find((i) => i.id === t) || o.find((i) => i.status === "active") || o.find((i) => i.status !== "done") || o[0] || null;
}
function Tc(e = [], t = "") {
  var f;
  const o = Array.isArray(e) ? e.map((d) => ({ ...d })) : [];
  if (!o.length)
    return gr([], "Deep work block");
  const i = t ? o.find((d) => d.id === t && d.status !== "done") : o.find((d) => d.status === "pending") || o.find((d) => d.status !== "done");
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
function PP(e, t, o) {
  return Z0(e, t, o);
}
async function EP({
  question: e,
  chatHistory: t = [],
  material: o = null,
  assistantContext: i = {},
  studyGoal: a = "",
  apiClient: f = globalThis.apiClient,
  preferredLanguage: d = ((p) => (p = globalThis.preferredLanguage) == null ? void 0 : p.value)() || "auto"
} = {}) {
  var S;
  if (!f || typeof f.fetch != "function")
    return {
      answer: PP(e, o, a),
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
      chat_history: t
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
const Ti = Object.freeze({
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
function MP() {
  return Zn[0] || vn(sd);
}
function pd(e) {
  const t = String(e || "");
  if (!t) return null;
  const i = Y0(z0()).materials[t];
  return i && typeof i == "object" ? i : null;
}
function ot(e) {
  var i;
  const t = String(e.selectedMaterialId || ((i = e.selectedMaterial) == null ? void 0 : i.materialId) || "");
  if (!t) return;
  const o = Y0(z0());
  o.materials[t] = {
    materialId: t,
    selectedScene: e.selectedScene,
    musicType: e.musicType,
    ambientSound: e.ambientSound,
    musicVolume: Tt(e.musicVolume),
    ambientVolume: Tt(e.ambientVolume),
    audioChannels: { ...Ti, ...e.audioChannels || {} },
    durationMinutes: _r(e.pomodoroDuration),
    durationSeconds: rn(e.pomodoroDurationSeconds, Mi(e.pomodoroDuration)),
    studyGoal: e.studyGoal,
    focusTopics: Array.isArray(e.focusTopics) ? e.focusTopics : [],
    activeTopicId: String(e.activeTopicId || ""),
    studyPlan: K0(e.studyPlan),
    completedTasks: Array.isArray(e.completedTasks) ? e.completedTasks.filter(Boolean) : [],
    workspaceNotes: String(e.workspaceNotes || ""),
    workspaceUpdatedAt: e.workspaceUpdatedAt || "",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }, aC(o);
}
function RP(e) {
  return Array.isArray(e == null ? void 0 : e.completedTasks) ? e.completedTasks.map((t) => String(t || "").trim()).filter(Boolean) : [];
}
function md(e = {}) {
  return {
    sectionTitle: String(e.sectionTitle || "").trim(),
    excerpt: String(e.excerpt || "").trim().slice(0, 1800)
  };
}
function sS(e = null) {
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
  return vo(e.timerState || e.timerPhase || e.status || e.timerStatus);
}
function Sr(e = {}) {
  const t = Number(e.pomodoroDurationSeconds);
  return Number.isFinite(t) && t > 0 ? rn(t, Mi(e.pomodoroDuration)) : Mi(e.pomodoroDuration);
}
function Gn(e = {}) {
  if (e.timerMode === "countup") return 0;
  const t = Number(e.timerDurationSeconds);
  return Number.isFinite(t) && t > 0 ? t : Sr(e);
}
function Ya(e = {}, t = at()) {
  const o = Math.max(0, Number(e.elapsedSeconds) || 0);
  if (Ht(e) !== "running") return o;
  const i = Number(e.timerAnchorAtMs);
  return !Number.isFinite(i) || i <= 0 ? o : Math.max(o, Math.floor(Math.max(0, t - i) / 1e3));
}
function Mt(e, t = at()) {
  const o = vo(e);
  return {
    timerState: o,
    timerPhase: o,
    status: o,
    timerStatus: uf(o),
    timerUpdatedAtMs: t
  };
}
function DP(e = {}) {
  const t = Ht(e);
  return {
    timerState: t,
    timerPhase: t,
    status: t,
    timerStatus: uf(t),
    timerMode: e.timerMode === "countup" ? "countup" : "countdown",
    timerAnchorAtMs: Number.isFinite(Number(e.timerAnchorAtMs)) ? Number(e.timerAnchorAtMs) : null,
    timerPausedAtMs: Number.isFinite(Number(e.timerPausedAtMs)) ? Number(e.timerPausedAtMs) : null,
    timerUpdatedAtMs: Number.isFinite(Number(e.timerUpdatedAtMs)) ? Number(e.timerUpdatedAtMs) : null,
    timerRestoredAtMs: Number.isFinite(Number(e.timerRestoredAtMs)) ? Number(e.timerRestoredAtMs) : null,
    timerDurationSeconds: Gn(e),
    pomodoroDuration: e.pomodoroDuration,
    pomodoroDurationSeconds: Sr(e),
    elapsedSeconds: Math.max(0, Number(e.elapsedSeconds) || 0),
    startedAt: e.startedAt || null,
    currentSession: e.currentSession || null,
    view: e.view
  };
}
function $n(e) {
  var o;
  const t = String(e.selectedMaterialId || ((o = e.selectedMaterial) == null ? void 0 : o.materialId) || "");
  return !t || e.view !== "session" ? !1 : cf(t, DP(e));
}
function gg(e, t = at()) {
  const o = Ya(e, t), i = Gn(e), a = e.timerMode !== "countup" && i > 0 && o >= i, f = a ? "completed" : Ht(e);
  return {
    ...Mt(f, t),
    elapsedSeconds: a ? i : o,
    timerAnchorAtMs: f === "running" ? e.timerAnchorAtMs : null,
    timerPausedAtMs: f === "running" ? null : e.timerPausedAtMs || t,
    audioPlaying: f === "running" ? e.audioPlaying : !1
  };
}
function NP(e, t = {}) {
  const o = vn(t.selectedScene), i = pd(e == null ? void 0 : e.materialId), a = $a(i == null ? void 0 : i.selectedScene) ? i.selectedScene : o.id, f = vn(a), d = String((i == null ? void 0 : i.musicType) || f.musicType || "Deep Focus"), p = String((i == null ? void 0 : i.ambientSound) || f.ambientSound || "Nature"), m = Tt(i == null ? void 0 : i.musicVolume, t.musicVolume ?? 60), y = Tt(i == null ? void 0 : i.ambientVolume, t.ambientVolume ?? 50), S = _r(i == null ? void 0 : i.durationMinutes, t.pomodoroDuration ?? ho), l = rn(
    i == null ? void 0 : i.durationSeconds,
    t.pomodoroDurationSeconds ?? S * 60
  ), c = String((i == null ? void 0 : i.studyGoal) || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`), g = K0(i == null ? void 0 : i.studyPlan), w = g.length ? g : ld(e, c, S), T = RP(i), A = String((i == null ? void 0 : i.workspaceNotes) || ""), _ = (i == null ? void 0 : i.workspaceUpdatedAt) || (i == null ? void 0 : i.updatedAt) || "";
  return {
    selectedScene: a,
    musicType: d,
    ambientSound: p,
    musicVolume: m,
    ambientVolume: y,
    audioChannels: { ...Ti, ...(i == null ? void 0 : i.audioChannels) || t.audioChannels || {} },
    pomodoroDuration: S,
    pomodoroDurationSeconds: l,
    studyGoal: c,
    studyPlan: w,
    completedTasks: T,
    workspaceNotes: A,
    workspaceUpdatedAt: _
  };
}
function vg(e) {
  const t = H0(e);
  if (!t || typeof t != "object") return null;
  const o = Ht(t), i = at(), a = Number(t.timerAnchorAtMs), f = Date.parse(t.startedAt || ""), d = Number.isFinite(f) ? f : NaN, p = o === "running" ? Ya({
    ...t,
    timerState: "running",
    timerAnchorAtMs: Number.isFinite(a) && a > 0 ? a : d
  }, i) : Math.max(0, Number(t.elapsedSeconds) || 0), m = Gn(t), y = o === "running" ? m > 0 && p >= m ? "completed" : "paused" : o, S = o === "running";
  return {
    route: t.view === "session" ? "session" : "setup",
    view: t.view === "session" ? "session" : "setup",
    ...Mt(S ? "restoring" : y, i),
    timerRestoreTarget: S ? y : null,
    timerMode: t.timerMode === "countup" ? "countup" : "countdown",
    timerAnchorAtMs: null,
    timerPausedAtMs: S ? null : Number(t.timerPausedAtMs) || null,
    timerRestoredAtMs: S ? null : i,
    timerDurationSeconds: m,
    ...Number(t.pomodoroDurationSeconds) > 0 ? { pomodoroDurationSeconds: rn(t.pomodoroDurationSeconds) } : {},
    elapsedSeconds: m > 0 ? Math.min(m, p) : p,
    startedAt: t.startedAt || null,
    currentSession: t.currentSession || null,
    completedTasks: Array.isArray(t.completedTasks) ? t.completedTasks.filter(Boolean) : [],
    flashcardIndex: Math.max(0, Number(t.flashcardIndex) || 0),
    flashcardSide: t.flashcardSide === "back" ? "back" : "front",
    flashcardProgress: t.flashcardProgress && typeof t.flashcardProgress == "object" && !Array.isArray(t.flashcardProgress) ? t.flashcardProgress : {},
    quizAnswers: t.quizAnswers && typeof t.quizAnswers == "object" && !Array.isArray(t.quizAnswers) ? t.quizAnswers : {},
    quizChecked: t.quizChecked && typeof t.quizChecked == "object" && !Array.isArray(t.quizChecked) ? t.quizChecked : {},
    chatMessages: yi(t.chatMessages),
    chatPending: !1,
    chatError: "",
    panelTab: ad.has(t.panelTab) ? t.panelTab : "materials",
    workspaceNotes: String(t.workspaceNotes || ""),
    workspaceUpdatedAt: t.workspaceUpdatedAt || t.updatedAt || "",
    activeNoteSection: String(t.activeNoteSection || ""),
    activeSourceHighlight: sS(t.activeSourceHighlight),
    assistantContext: md(t.assistantContext),
    audioPlaying: !1
  };
}
function oa() {
  return {
    completedTasks: [],
    flashcardIndex: 0,
    flashcardSide: "front",
    flashcardProgress: {},
    quizAnswers: {},
    quizChecked: {}
  };
}
function jP(e) {
  return Object.values(e.flashcardProgress || {}).filter((t) => t && t.difficulty).length;
}
function IP(e) {
  const t = Object.values(e.quizChecked || {}).filter((i) => i && i.hasKnownAnswer);
  if (!t.length) return null;
  const o = t.filter((i) => i.correct).length;
  return Math.round(o / t.length * 100);
}
function FP(e) {
  const t = cd(e.selectedMaterial);
  return Object.entries(e.quizChecked || {}).filter(([, o]) => o && o.hasKnownAnswer && !o.correct).map(([o]) => vC(t[Number(o)], Number(o))).filter(Boolean);
}
const K = bP((e, t) => {
  const o = MP(), i = pd("focus-room"), a = $a(i == null ? void 0 : i.selectedScene) ? vn(i.selectedScene) : o, f = _r(i == null ? void 0 : i.durationMinutes, ho), d = rn(
    i == null ? void 0 : i.durationSeconds,
    Mi(f)
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
    audioChannels: { ...Ti, ...(i == null ? void 0 : i.audioChannels) || {} },
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
      const p = t(), m = H0("focus-room"), y = vg("focus-room"), S = Ht(m || {});
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
          audioChannels: { ...Ti, ...(m == null ? void 0 : m.audioChannels) || p.audioChannels || {} },
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
      Ta("focus-room");
      const c = pd("focus-room"), g = vn((c == null ? void 0 : c.selectedScene) || p.selectedScene), w = _r(c == null ? void 0 : c.durationMinutes, p.pomodoroDuration || ho), T = rn(
        c == null ? void 0 : c.durationSeconds,
        p.pomodoroDurationSeconds || Mi(w)
      );
      e({
        route: "setup",
        view: "setup",
        selectedMaterialId: "focus-room",
        selectedMaterial: null,
        selectedScene: g.id,
        musicType: String((c == null ? void 0 : c.musicType) || g.musicType || p.musicType || "Deep Focus"),
        ambientSound: String((c == null ? void 0 : c.ambientSound) || g.ambientSound || p.ambientSound || "Nature"),
        musicVolume: Tt(c == null ? void 0 : c.musicVolume, p.musicVolume ?? 60),
        ambientVolume: Tt(c == null ? void 0 : c.ambientVolume, p.ambientVolume ?? 50),
        audioChannels: { ...Ti, ...(c == null ? void 0 : c.audioChannels) || p.audioChannels || {} },
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
      const p = t();
      ot(p), Ta("focus-room"), e({
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
      const S = t(), l = !!m, c = l ? m.materialId : String(p.materialId || "");
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
      const g = S.selectedMaterialId === c, w = g && y ? null : vg(c), T = g && y ? {} : NP(m, S), A = g && y ? {} : {
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
          pomodoroDuration: T.pomodoroDuration || ho,
          pomodoroDurationSeconds: T.pomodoroDurationSeconds
        }),
        elapsedSeconds: 0,
        startedAt: null,
        currentSession: null,
        ...oa(),
        chatMessages: [],
        chatPending: !1,
        chatError: "",
        activeNoteSection: "",
        activeSourceHighlight: null,
        assistantContext: { sectionTitle: "", excerpt: "" }
      }, _ = g && y ? S.view === "session" ? "session" : "setup" : (w == null ? void 0 : w.view) === "session" ? "session" : "setup";
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
          const E = t();
          if (E.selectedMaterialId !== c || E.timerState !== "restoring") return;
          const N = at(), L = Gn(E), W = L > 0 ? Math.min(L, Math.max(0, Number(E.elapsedSeconds) || 0)) : Math.max(0, Number(E.elapsedSeconds) || 0), H = {
            ...Mt(C, N),
            timerRestoreTarget: null,
            timerAnchorAtMs: null,
            timerPausedAtMs: C === "paused" ? N : null,
            timerRestoredAtMs: N,
            elapsedSeconds: W,
            audioPlaying: !1
          };
          e(H), $n({ ...E, ...H });
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
        sessionHistory: id()
      });
    },
    selectScene(p) {
      const m = $a(p);
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
        const y = rn(p, m.pomodoroDurationSeconds), S = Math.max(1, Math.round(y / 60)), l = m.selectedMaterial ? ld(m.selectedMaterial, m.studyGoal, S) : [], c = {
          pomodoroDuration: S,
          pomodoroDurationSeconds: y,
          studyPlan: l,
          timerDurationSeconds: m.timerMode === "countup" ? 0 : y
        };
        return ot({ ...m, ...c }), c;
      });
    },
    setPomodoroDuration(p) {
      const m = _r(p, t().pomodoroDuration);
      t().setPomodoroDurationSeconds(m * 60);
    },
    setStudyGoal(p) {
      e((m) => {
        var g;
        const y = String(p ?? ""), S = m.selectedMaterial ? ld(m.selectedMaterial, y, m.pomodoroDuration) : [], l = Array.isArray(m.focusTopics) ? m.focusTopics.map((w) => w.id === m.activeTopicId || w.status === "active" ? { ...w, title: y || w.title, status: "active" } : w) : gr([], y).focusTopics, c = {
          studyGoal: y,
          studyPlan: S,
          focusTopics: l,
          activeTopicId: m.activeTopicId || ((g = l.find((w) => w.status === "active")) == null ? void 0 : g.id) || ""
        };
        return ot({ ...m, ...c }), c;
      });
    },
    addFocusTopic(p = {}) {
      e((m) => {
        const y = (m.focusTopics || []).some((g) => g.status === "active"), S = Ka({
          id: iS(),
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
        const S = (y.focusTopics || []).map((g) => g.id !== p ? g : Ka({
          ...g,
          ...m,
          id: g.id,
          status: g.status
        }, g.status)), l = mf(S, y.activeTopicId), c = {
          focusTopics: S,
          activeTopicId: (l == null ? void 0 : l.id) || y.activeTopicId || "",
          studyGoal: (l == null ? void 0 : l.title) || y.studyGoal
        };
        return ot({ ...y, ...c }), c;
      });
    },
    activateFocusTopic(p) {
      e((m) => {
        const y = Tc(m.focusTopics, p);
        return ot({ ...m, ...y }), y;
      });
    },
    finishFocusTopic(p = "") {
      e((m) => {
        const y = String(p || m.activeTopicId || ""), S = (m.focusTopics || []).map((c) => c.id === y ? { ...c, status: "done" } : c), l = Tc(S);
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
        const l = m.activeTopicId === p || (m.focusTopics || []).some((c) => c.id === p && c.status === "active") ? Tc(y) : gr(y, m.studyGoal);
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
        const y = eC(p), S = {
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
      const m = ad.has(String(p || "")) ? String(p) : "materials";
      e({
        panelTab: m,
        aiPanelOpen: !0,
        activeDrawer: ""
      });
    },
    selectSourceHighlight(p = null, { openPanel: m = !0 } = {}) {
      const y = sS(p);
      e({
        activeSourceHighlight: y,
        activeNoteSection: (y == null ? void 0 : y.sectionTitle) || t().activeNoteSection || "",
        assistantContext: y ? md({
          sectionTitle: y.sectionTitle,
          excerpt: y.excerpt
        }) : t().assistantContext,
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
        panelTab: ad.has(m) ? m : "materials",
        aiPanelOpen: !0,
        activeDrawer: ""
      });
    },
    startSession() {
      const p = t(), m = p.timerMode === "countup" ? "countup" : "countdown";
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
        ...oa(),
        chatMessages: [],
        chatPending: !1,
        chatError: ""
      });
    },
    startTimer() {
      const p = t();
      (!p.currentSession || p.view !== "session") && t().startSession();
      const m = t(), y = at(), S = Ht(m);
      if (S === "running") {
        t().tickTimer();
        return;
      }
      const l = Gn(m), c = S === "completed" || S === "break" || l > 0 && m.elapsedSeconds >= l, g = c ? 0 : Math.max(0, Number(m.elapsedSeconds) || 0), w = {
        view: "session",
        route: "session",
        ...Mt("running", y),
        audioPlaying: p.audioPlaying,
        summaryRecord: null,
        elapsedSeconds: g,
        startedAt: !m.startedAt || c ? new Date(y).toISOString() : m.startedAt,
        timerAnchorAtMs: y - g * 1e3,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        timerDurationSeconds: l,
        ...c ? oa() : {}
      };
      e(w), $n({ ...m, ...w });
    },
    pauseTimer({ pauseAudio: p = !0 } = {}) {
      const m = t(), y = at();
      if (Ht(m) !== "running") {
        p && m.audioPlaying && e({ audioPlaying: !1 });
        return;
      }
      const S = gg(m, y), l = {
        ...S,
        ...Mt(S.timerState === "completed" ? "completed" : "paused", y),
        timerAnchorAtMs: null,
        timerPausedAtMs: y,
        audioPlaying: p ? !1 : m.audioPlaying
      };
      e(l), $n({ ...m, ...l });
    },
    resetTimer() {
      const p = at(), m = {
        ...Mt("idle", p),
        timerRestoreTarget: null,
        timerMode: "countdown",
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerDurationSeconds: Sr(t()),
        audioPlaying: !1,
        startedAt: null,
        elapsedSeconds: 0,
        summaryRecord: null,
        ...oa()
      };
      e(m), $n({ ...t(), ...m });
    },
    skipTimer() {
      const p = t(), m = at(), y = Gn(p), S = {
        ...Mt("completed", m),
        elapsedSeconds: y || Math.max(0, Number(p.elapsedSeconds) || 0),
        audioPlaying: !1,
        startedAt: p.startedAt || new Date(m).toISOString(),
        timerAnchorAtMs: null,
        timerPausedAtMs: m,
        timerDurationSeconds: y
      };
      e(S), $n({ ...p, ...S });
    },
    tickTimer() {
      const p = t();
      if (p.view !== "session" || Ht(p) !== "running") return;
      const m = at(), y = Gn(p), S = y ? Math.min(y, Ya(p, m)) : Ya(p, m), l = y > 0 && S >= y ? "completed" : "running", c = {
        ...Mt(l, m),
        elapsedSeconds: S,
        timerAnchorAtMs: l === "running" ? p.timerAnchorAtMs : null,
        timerPausedAtMs: l === "running" ? null : m,
        timerDurationSeconds: y,
        audioPlaying: l === "running" ? p.audioPlaying : !1
      };
      S === p.elapsedSeconds && l === Ht(p) || (e(c), $n({ ...p, ...c }));
    },
    setTimerMode(p = "countdown") {
      const m = p === "countup" ? "countup" : "countdown", y = {
        timerMode: m,
        timerDurationSeconds: m === "countup" ? 0 : Sr(t())
      };
      e(y), $n({ ...t(), ...y });
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
      e(m), $n({ ...t(), ...m });
    },
    getTimerState() {
      return Ht(t());
    },
    endSession() {
      var w;
      const p = t(), m = at(), y = new Date(m).toISOString(), S = Ht(p) === "running" ? gg(p, m) : p, l = Gn(S), c = l ? Math.min(l, S.elapsedSeconds) : S.elapsedSeconds, g = uC({
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
      Ta("focus-room"), e({
        summaryRecord: g,
        sessionHistory: id(),
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
      e({ assistantContext: md(p) });
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
        const g = String(c.task || ""), w = y == null ? g : String(y || "").trim(), T = m == null ? c.minutes : Ar(m, c.minutes, 1, nl), A = S.studyPlan.map((E, N) => N === l ? { minutes: T, task: w || g } : E);
        let _ = S.completedTasks;
        g && g !== A[l].task && _.includes(g) && (_ = _.filter((E) => E !== g).concat(A[l].task));
        const C = { studyPlan: A, completedTasks: _ };
        return ot({ ...S, ...C }), C;
      });
    },
    setFlashcardIndex(p) {
      const m = pg(t().selectedMaterial);
      e({
        flashcardIndex: Ar(p, t().flashcardIndex, 0, Math.max(0, m.length - 1)),
        flashcardSide: "front"
      });
    },
    flipFlashcard() {
      e((p) => ({
        flashcardSide: p.flashcardSide === "back" ? "front" : "back"
      }));
    },
    rateFlashcard(p) {
      const m = t(), y = pg(m.selectedMaterial);
      if (!y.length) return;
      const S = Ar(m.flashcardIndex, 0, 0, y.length - 1), l = y[S], c = ["easy", "medium", "hard"].includes(String(p)) ? String(p) : "medium";
      e({
        flashcardProgress: {
          ...m.flashcardProgress,
          [yC(l, S)]: {
            difficulty: c,
            reviewedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        },
        flashcardSide: "front",
        flashcardIndex: S < y.length - 1 ? S + 1 : S
      });
    },
    answerQuizQuestion(p, m) {
      const y = Number(p), S = cd(t().selectedMaterial)[y];
      if (!S) return;
      const l = String(y);
      e((c) => {
        const g = c.quizAnswers[l], w = xC(S, m, g);
        if (Array.isArray(g) && Array.isArray(w) ? g.length === w.length && g.every((_, C) => Object.is(_, w[C])) : Object.is(g, w)) return c;
        const A = { ...c.quizChecked };
        return delete A[l], {
          quizAnswers: {
            ...c.quizAnswers,
            [l]: w
          },
          quizChecked: A
        };
      });
    },
    checkQuizQuestion(p) {
      const m = cd(t().selectedMaterial), y = Number(p), S = m[y];
      if (!S) return;
      const l = String(y), c = t(), g = Object.prototype.hasOwnProperty.call(c.quizAnswers, l) ? c.quizAnswers[l] : "", w = _C(S, g), T = Q0(S);
      e({
        quizChecked: {
          ...c.quizChecked,
          [l]: {
            answer: g,
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
      const y = t(), S = y.selectedMaterial, l = yi(y.chatMessages).slice(-10).map((c) => ({
        role: c.role === "user" ? "user" : "assistant",
        content: c.text
      }));
      e({
        chatMessages: yi([
          ...y.chatMessages,
          { role: "user", text: m, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
        ]),
        chatPending: !0,
        chatError: ""
      });
      try {
        const c = await EP({
          question: m,
          chatHistory: l,
          material: S,
          assistantContext: y.assistantContext,
          studyGoal: y.studyGoal
        });
        e((g) => ({
          chatMessages: yi([
            ...g.chatMessages,
            { role: "assistant", text: c.answer, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: c.offline ? "Using a local Focus Room reply because the AI tutor service is not connected." : ""
        }));
      } catch (c) {
        e((g) => ({
          chatMessages: yi([
            ...g.chatMessages,
            { role: "assistant", text: Z0(m, S, t().studyGoal), createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: `AI tutor unavailable: ${c.message || "request failed"}`
        }));
      } finally {
        e({ chatPending: !1 });
      }
    },
    focusFlashcardsCompletedCount() {
      return jP(t());
    },
    focusQuizScore() {
      return IP(t());
    },
    focusQuizMistakes() {
      return FP(t());
    },
    formatFocusedTime() {
      return W0(t().elapsedSeconds);
    }
  };
});
function aS({ compact: e = !1, className: t = "" }) {
  const o = K((c) => c.focusTopics), i = K((c) => c.activeTopicId), a = K((c) => c.addFocusTopic), f = K((c) => c.updateFocusTopic), d = K((c) => c.finishFocusTopic), p = K((c) => c.removeFocusTopic), m = K((c) => c.activateFocusTopic), y = mf(o, i), S = (o || []).filter((c) => c.status !== "done").length, l = (o || []).filter((c) => c.status === "done").length;
  return /* @__PURE__ */ x.jsxs(
    "section",
    {
      className: `focus-topics-panel ${e ? "is-compact" : ""} ${t}`.trim(),
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
                /* @__PURE__ */ x.jsx(oP, { size: 14, "aria-hidden": "true" }),
                "Add"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ x.jsxs("p", { className: "focus-topics-hint", children: [
          "Finish or remove the active topic to switch into the next one automatically.",
          l ? ` ${l} done · ${S} open.` : null
        ] }),
        /* @__PURE__ */ x.jsx("div", { className: "focus-topics-list", children: (o || []).map((c, g) => {
          const w = c.id === (y == null ? void 0 : y.id), T = c.status === "done";
          return /* @__PURE__ */ x.jsxs(
            "article",
            {
              className: `focus-topic-card ${w ? "is-active" : ""} ${T ? "is-done" : ""}`.trim(),
              "data-focus-topic-id": c.id,
              "data-focus-topic-status": c.status,
              children: [
                /* @__PURE__ */ x.jsxs("div", { className: "focus-topic-card-top", children: [
                  /* @__PURE__ */ x.jsx("span", { className: "focus-topic-index", children: String(g + 1).padStart(2, "0") }),
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
                          /* @__PURE__ */ x.jsx(rl, { size: 13, "aria-hidden": "true" }),
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
                        children: /* @__PURE__ */ x.jsx(vP, { size: 13, "aria-hidden": "true" })
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
function Sg({ scene: e, active: t, onSelect: o, variant: i = "default" }) {
  const a = $b(), f = Va(0.5), d = Va(0.5), p = ug(f, { stiffness: 180, damping: 24, mass: 0.5 }), m = ug(d, { stiffness: 180, damping: 24, mass: 0.5 }), y = za(m, [0, 1], [2.2, -2.2]), S = za(p, [0, 1], [-2.2, 2.2]), l = a ? {} : { rotateX: y, rotateY: S, transformPerspective: 820 };
  function c(w) {
    const T = w.currentTarget.getBoundingClientRect(), A = Math.max(0, Math.min(1, (w.clientX - T.left) / T.width)), _ = Math.max(0, Math.min(1, (w.clientY - T.top) / T.height));
    f.set(A), d.set(_), w.currentTarget.style.setProperty("--scene-glare-x", `${A * 100}%`), w.currentTarget.style.setProperty("--scene-glare-y", `${_ * 100}%`);
  }
  function g(w) {
    f.set(0.5), d.set(0.5), w.currentTarget.style.setProperty("--scene-glare-x", "50%"), w.currentTarget.style.setProperty("--scene-glare-y", "15%");
  }
  return i === "gallery" ? /* @__PURE__ */ x.jsxs(
    wn.button,
    {
      className: `scene-card scene-card-gallery ${t ? "active" : ""}`.trim(),
      type: "button",
      "aria-pressed": t,
      "aria-label": `${e.name}: ${e.description}`,
      onClick: () => o(e.id),
      onPointerMove: c,
      onPointerLeave: g,
      style: l,
      whileHover: a ? void 0 : { y: -2 },
      whileTap: a ? void 0 : { scale: 0.985 },
      children: [
        /* @__PURE__ */ x.jsx(
          "span",
          {
            className: "scene-card-gallery-media",
            style: { backgroundImage: `url("${e.image}")` },
            children: t ? /* @__PURE__ */ x.jsx("span", { className: "scene-card-check", "aria-hidden": "true", children: "✓" }) : null
          }
        ),
        /* @__PURE__ */ x.jsxs("span", { className: "scene-card-gallery-copy", children: [
          /* @__PURE__ */ x.jsx("strong", { children: e.name }),
          /* @__PURE__ */ x.jsx("small", { children: e.kicker })
        ] })
      ]
    }
  ) : /* @__PURE__ */ x.jsxs(
    wn.button,
    {
      className: `scene-card ${t ? "active" : ""}`.trim(),
      type: "button",
      "aria-pressed": t,
      "aria-label": `${e.name}: ${e.description}`,
      onClick: () => o(e.id),
      onPointerMove: c,
      onPointerLeave: g,
      style: { backgroundImage: `url("${e.image}")`, ...l },
      whileHover: a ? void 0 : { scale: 1.025, y: -2 },
      whileTap: a ? void 0 : { scale: 0.98 },
      children: [
        /* @__PURE__ */ x.jsx("span", { className: "focus-pill", children: e.kicker }),
        /* @__PURE__ */ x.jsx("strong", { children: e.name }),
        /* @__PURE__ */ x.jsx("span", { children: e.description })
      ]
    }
  );
}
const ia = 8;
function hf({ variant: e = "default" }) {
  const t = K((y) => y.selectedScene), o = K((y) => y.selectScene), [i, a] = b.useState(0), f = b.useMemo(() => e === "gallery" ? nC : Zn.filter((y) => !y.galleryOnly || y.id === t), [t, e]), d = Math.max(1, Math.ceil(f.length / ia)), p = Math.min(i, d - 1), m = e === "gallery" ? f.slice(p * ia, p * ia + ia) : f;
  return e !== "gallery" ? /* @__PURE__ */ x.jsx("div", { className: "scene-selector", "aria-label": "Study scenes", children: m.map((y) => /* @__PURE__ */ x.jsx(
    Sg,
    {
      scene: y,
      active: y.id === t,
      onSelect: o
    },
    y.id
  )) }) : /* @__PURE__ */ x.jsxs("div", { className: "scene-selector-wrap", "aria-label": "Study scenes", children: [
    /* @__PURE__ */ x.jsx("div", { className: "scene-selector scene-selector-gallery", children: m.map((y) => /* @__PURE__ */ x.jsx(
      Sg,
      {
        scene: y,
        active: y.id === t,
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
          children: /* @__PURE__ */ x.jsx(OC, { size: 18, "aria-hidden": "true" })
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
          children: /* @__PURE__ */ x.jsx(VC, { size: 18, "aria-hidden": "true" })
        }
      )
    ] }) : null
  ] });
}
const wg = [
  { label: "Lo-fi Chill", icon: JC, musicType: "Lo-fi", ambientSound: "Cafe Rain" },
  { label: "Ambient Piano", icon: tP, musicType: "Piano", ambientSound: "Nature" },
  { label: "Nature Ambient", icon: pf, musicType: "Deep Focus", ambientSound: "Nature" },
  { label: "Acoustic Warm", icon: BC, musicType: "Minimal", ambientSound: "White Noise" },
  { label: "Deep Focus", icon: sP, musicType: "Deep Focus", ambientSound: "White Noise" }
];
function OP({ onWorkspace: e }) {
  const t = K((C) => C.selectedScene), o = K((C) => C.pomodoroDuration), i = K((C) => C.timerMode), a = K((C) => C.musicType), f = K((C) => C.focusTopics), d = K((C) => C.setPomodoroDuration), p = K((C) => C.setTimerMode), m = K((C) => C.setSound), y = K((C) => C.startSession), [S, l] = b.useState(!1), c = b.useMemo(
    () => {
      var C;
      return ((C = wg.find((E) => E.musicType === a)) == null ? void 0 : C.label) || "";
    },
    [a]
  ), g = (f || []).filter((C) => C.status !== "done").length, w = (C) => {
    m("musicType", C.musicType), m("ambientSound", C.ambientSound);
  }, T = (C) => {
    p("countdown"), d(C);
  }, A = () => {
    t && y();
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
            children: /* @__PURE__ */ x.jsx(YC, { size: 18, "aria-hidden": "true" })
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
            children: /* @__PURE__ */ x.jsx(DC, { size: 20, "aria-hidden": "true" })
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
        /* @__PURE__ */ x.jsx(hf, { variant: "gallery" })
      ] }),
      /* @__PURE__ */ x.jsxs("aside", { className: "innook-control-rail", "aria-label": "Study settings", children: [
        /* @__PURE__ */ x.jsx("div", { className: "innook-rail-group", "aria-label": "Music atmosphere", children: wg.map((C) => {
          const E = C.icon, N = c === C.label;
          return /* @__PURE__ */ x.jsx(
            "button",
            {
              type: "button",
              className: `innook-rail-icon ${N ? "is-active" : ""}`.trim(),
              onClick: () => w(C),
              "aria-label": `Music style: ${C.label}`,
              "aria-pressed": N,
              title: C.label,
              children: /* @__PURE__ */ x.jsx(E, { size: 16, "aria-hidden": "true" })
            },
            C.label
          );
        }) }),
        /* @__PURE__ */ x.jsx("div", { className: "innook-rail-divider" }),
        /* @__PURE__ */ x.jsxs("div", { className: "innook-duration-list", "aria-label": "Focus duration", children: [
          L0.map((C) => {
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
              /* @__PURE__ */ x.jsx(yP, { size: 16, "aria-hidden": "true" }),
              g > 1 ? /* @__PURE__ */ x.jsx("span", { className: "innook-rail-badge", children: g }) : null
            ]
          }
        ),
        /* @__PURE__ */ x.jsx(
          "button",
          {
            type: "button",
            className: "innook-enter-button",
            onClick: A,
            disabled: !t,
            "data-focus-enter": "true",
            "aria-label": "Enter Focus Room",
            title: "Enter Focus Room",
            children: /* @__PURE__ */ x.jsx(jC, { size: 22, "aria-hidden": "true" })
          }
        ),
        S ? /* @__PURE__ */ x.jsx("div", { className: "innook-goal-popover innook-topics-popover", "data-focus-topics-popover": "true", children: /* @__PURE__ */ x.jsx(aS, { compact: !0 }) }) : null
      ] })
    ] })
  ] });
}
function Te({
  children: e,
  className: t = "",
  variant: o = "ghost",
  type: i = "button",
  ...a
}) {
  const { onPointerMove: f, onPointerLeave: d, ...p } = a;
  return /* @__PURE__ */ x.jsx(
    "button",
    {
      className: `glass-button glass-button-${o} ${t}`.trim(),
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
function LP({ onWorkspace: e, onOpenTrail: t, onOpenCompanion: o, onOpenSettings: i, onExit: a }) {
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
      /* @__PURE__ */ x.jsxs(Te, { className: "header-icon-button", onClick: t, title: "Open Focus Trail", "aria-label": "Open Focus Trail", children: [
        /* @__PURE__ */ x.jsx(Wa, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: "Focus Trail" })
      ] }),
      /* @__PURE__ */ x.jsxs(Te, { className: "header-icon-button", onClick: o, title: "Open Companion Room", "aria-label": "Open Companion Room", children: [
        /* @__PURE__ */ x.jsx(Ga, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: "Companion" })
      ] }),
      /* @__PURE__ */ x.jsxs(Te, { className: "header-icon-button", onClick: i, title: "Open room settings", "aria-label": "Open room settings", children: [
        /* @__PURE__ */ x.jsx(nS, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: "Settings" })
      ] }),
      /* @__PURE__ */ x.jsxs(Te, { className: "header-icon-button header-exit-button", onClick: a, title: "Exit Focus Room", "aria-label": "Exit Focus Room", children: [
        /* @__PURE__ */ x.jsx(WC, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ x.jsx("span", { children: "Exit" })
      ] })
    ] })
  ] });
}
const lS = {
  minutes: Math.floor(G0 / 60),
  seconds: 59
}, VP = {
  minutes: 3,
  seconds: 2
};
function yf(e) {
  const t = rn(e, df);
  return {
    minutes: Math.floor(t / 60),
    seconds: t % 60
  };
}
function xg(e, t) {
  const o = Math.max(0, Math.floor(Number(e) || 0)), i = Math.max(0, Math.floor(Number(t) || 0));
  return rn(o * 60 + i, df);
}
function hd(e, t) {
  return String(Math.max(0, Math.floor(Number(e) || 0))).padStart(2, "0");
}
function gf(e) {
  const { minutes: t, seconds: o } = yf(e);
  return `${hd(t, "minutes")}:${hd(o, "seconds")}`;
}
function zP(e, t, o) {
  const i = VP[o] || 2;
  return `${String(e || "").replace(/\D/g, "")}${String(t).replace(/\D/g, "")}`.slice(-i) || "";
}
function BP(e, t) {
  const o = Number(String(e || "").replace(/\D/g, "")) || 0;
  return Math.min(lS[t], o);
}
function $P(e, t, o) {
  const i = yf(e), a = BP(o, t);
  return t === "seconds" ? xg(i.minutes, a) : xg(a, i.seconds);
}
const UP = { minutes: "Minutes", seconds: "Seconds" };
function _g({
  segment: e,
  value: t,
  disabled: o,
  active: i,
  onFocusSegment: a,
  onType: f,
  onCommit: d,
  onMove: p,
  segmentRef: m
}) {
  const y = UP[e], S = (l) => {
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
      "aria-valuemax": lS[e],
      "aria-valuenow": t,
      "aria-valuetext": `${t} ${y.toLowerCase()}`,
      "aria-disabled": o || void 0,
      onFocus: () => a(e),
      onKeyDown: S,
      children: hd(t, e)
    }
  ) });
}
function HP({
  valueSeconds: e,
  onChange: t,
  disabled: o = !1,
  size: i = "hero",
  ariaLabel: a = "Set focus block length",
  className: f = ""
}) {
  const { minutes: d, seconds: p } = yf(e), [m, y] = b.useState(null), S = b.useRef(""), l = b.useRef(null), c = b.useRef(null), g = b.useRef(null), w = b.useCallback(() => {
    S.current = "";
  }, []), T = b.useCallback((E) => {
    S.current = "", y(E);
  }, []), A = b.useCallback(
    (E, N) => {
      if (o) return;
      const L = zP(S.current, N, E);
      S.current = L, y(E), t == null || t($P(e, E, L));
    },
    [o, t, e]
  ), _ = b.useCallback((E) => {
    var L;
    const N = E < 0 ? "minutes" : "seconds";
    S.current = "", y(N), (L = (E < 0 ? l : c).current) == null || L.focus();
  }, []), C = (E) => {
    var N;
    (N = g.current) != null && N.contains(E.relatedTarget) || (w(), y(null));
  };
  return /* @__PURE__ */ x.jsxs(
    "div",
    {
      ref: g,
      className: `timer-editor timer-editor-${i}${o ? " is-readonly" : ""} ${f}`.trim(),
      role: "group",
      "aria-label": a,
      onBlur: C,
      children: [
        o ? /* @__PURE__ */ x.jsx("span", { className: "timer-editor-static", "aria-hidden": "true", children: gf(e) }) : /* @__PURE__ */ x.jsxs(x.Fragment, { children: [
          /* @__PURE__ */ x.jsx(
            _g,
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
            _g,
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
function WP(e, t) {
  return t ? Math.min(100, Math.max(0, e / t * 100)) : 0;
}
function GP({ onFocusMode: e, audioState: t }) {
  const o = K((O) => O.timerStatus), i = K((O) => O.elapsedSeconds), a = K((O) => O.pomodoroDuration), f = K((O) => O.pomodoroDurationSeconds), d = K((O) => O.timerMode), p = K((O) => O.studyGoal), m = K((O) => O.focusTopics), y = K((O) => O.activeTopicId), S = K((O) => O.currentSession), l = K((O) => O.startTimer), c = K((O) => O.pauseTimer), g = K((O) => O.resetTimer), w = K((O) => O.skipTimer), T = K((O) => O.toggleAudio), A = K((O) => O.audioPlaying), _ = K((O) => O.setPomodoroDurationSeconds), C = K((O) => O.finishFocusTopic), E = mf(m, y), N = Number(f) || (Number(a) || 0) * 60, L = d === "countup" ? i : Math.max(0, N - i), W = o === "paused", H = o === "studying", Y = o === "completed", V = o === "idle" && d !== "countup", Q = Y && d !== "countup" ? "00:00" : ud(L), ie = W ? "Paused" : Y ? "Complete" : H ? "In focus" : "Ready", J = W ? "Resume timer" : H ? "Pause timer" : "Start timer", ce = (E == null ? void 0 : E.title) || p || "A quiet block for meaningful progress", ue = (E == null ? void 0 : E.description) || "", ye = !!(E && E.status !== "done");
  function me(O) {
    const Z = O.currentTarget.getBoundingClientRect(), X = Math.max(0, Math.min(100, (O.clientX - Z.left) / Z.width * 100)), D = Math.max(0, Math.min(100, (O.clientY - Z.top) / Z.height * 100));
    O.currentTarget.style.setProperty("--dock-light-x", `${X}%`), O.currentTarget.style.setProperty("--dock-light-y", `${D}%`), O.currentTarget.style.setProperty("--glass-x", `${X}%`), O.currentTarget.style.setProperty("--glass-y", `${D}%`);
  }
  function we(O) {
    O.currentTarget.style.setProperty("--dock-light-x", "50%"), O.currentTarget.style.setProperty("--dock-light-y", "0%"), O.currentTarget.style.setProperty("--glass-x", "50%"), O.currentTarget.style.setProperty("--glass-y", "0%");
  }
  return /* @__PURE__ */ x.jsxs(
    "div",
    {
      className: "focus-session-dock liquid-glass",
      "aria-label": "Focus session controls",
      onPointerMove: me,
      onPointerLeave: we,
      children: [
        /* @__PURE__ */ x.jsxs("div", { className: "dock-timer-block", children: [
          /* @__PURE__ */ x.jsxs("div", { className: "dock-eyebrow", children: [
            "POMODORO #",
            (S == null ? void 0 : S.pomodoroNumber) || 1
          ] }),
          /* @__PURE__ */ x.jsxs("div", { className: "dock-status", children: [
            /* @__PURE__ */ x.jsx("span", { className: `dock-status-dot ${W || !H ? "is-paused" : ""}` }),
            ie
          ] }),
          V ? /* @__PURE__ */ x.jsx(
            HP,
            {
              className: "dock-time-editor",
              valueSeconds: N,
              onChange: _,
              size: "dock",
              ariaLabel: "Set focus block length"
            }
          ) : /* @__PURE__ */ x.jsx("strong", { className: "dock-time", "aria-live": "off", children: Q }),
          /* @__PURE__ */ x.jsx("div", { className: "dock-progress", "aria-hidden": "true", children: /* @__PURE__ */ x.jsx("span", { style: { width: `${WP(i, N)}%` } }) })
        ] }),
        /* @__PURE__ */ x.jsxs("div", { className: "dock-goal-block", "data-focus-active-topic": "true", children: [
          /* @__PURE__ */ x.jsx("span", { className: "dock-eyebrow", children: "ACTIVE TOPIC" }),
          /* @__PURE__ */ x.jsx("strong", { children: ce }),
          ue ? /* @__PURE__ */ x.jsx("span", { className: "dock-goal-description", children: ue }) : null,
          /* @__PURE__ */ x.jsxs("span", { className: "dock-goal-meta", children: [
            d === "countup" ? "Count-up" : `${gf(N)} block`,
            " · ",
            ud(i),
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
                /* @__PURE__ */ x.jsx(rl, { size: 13, "aria-hidden": "true" }),
                "Done · next topic"
              ]
            }
          ) : null
        ] }),
        /* @__PURE__ */ x.jsxs("div", { className: "dock-action-block", children: [
          /* @__PURE__ */ x.jsxs(Te, { className: "dock-action-button", onClick: T, "aria-label": A ? "Pause room audio" : "Play room audio", children: [
            A ? /* @__PURE__ */ x.jsx(fd, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ x.jsx(ol, { size: 15, "aria-hidden": "true" }),
            /* @__PURE__ */ x.jsx("span", { children: t != null && t.playing ? "Pause audio" : "Audio" })
          ] }),
          /* @__PURE__ */ x.jsxs(Te, { className: "dock-action-button", onClick: () => H ? c() : l(), variant: "primary", "aria-label": J, children: [
            H ? /* @__PURE__ */ x.jsx(fd, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ x.jsx(q0, { size: 15, fill: "currentColor", "aria-hidden": "true" }),
            /* @__PURE__ */ x.jsx("span", { children: W ? "Resume" : H ? "Pause" : "Start" })
          ] }),
          /* @__PURE__ */ x.jsxs(Te, { className: "dock-action-button", onClick: w, "aria-label": "Skip timer", children: [
            /* @__PURE__ */ x.jsx(rS, { size: 15, "aria-hidden": "true" }),
            /* @__PURE__ */ x.jsx("span", { children: "Skip" })
          ] }),
          /* @__PURE__ */ x.jsxs(Te, { className: "dock-action-button", onClick: g, "aria-label": "Reset timer", children: [
            /* @__PURE__ */ x.jsx(eS, { size: 15, "aria-hidden": "true" }),
            /* @__PURE__ */ x.jsx("span", { children: "Reset" })
          ] }),
          /* @__PURE__ */ x.jsxs(Te, { className: "dock-focus-mode", onClick: e, "aria-label": "Enter distraction-free Focus Mode", children: [
            /* @__PURE__ */ x.jsx(mP, { size: 15, "aria-hidden": "true" }),
            /* @__PURE__ */ x.jsx("span", { children: "Focus Mode" })
          ] })
        ] })
      ]
    }
  );
}
var KP = Object.defineProperty, To = (e, t) => KP(e, "name", { value: t, configurable: !0 }), uS = !!(typeof window < "u" && window.document && window.document.createElement);
function Cr(e, t, { checkForDefaultPrevented: o = !0 } = {}) {
  return /* @__PURE__ */ To(function(a) {
    if (e == null || e(a), o === !1 || !a || !a.defaultPrevented)
      return t == null ? void 0 : t(a);
  }, "handleEvent");
}
To(Cr, "composeEventHandlers");
function YP(e) {
  var t;
  if (!uS)
    throw new Error("Cannot access window outside of the DOM");
  return ((t = e == null ? void 0 : e.ownerDocument) == null ? void 0 : t.defaultView) ?? window;
}
To(YP, "getOwnerWindow");
function yd(e) {
  if (!uS)
    throw new Error("Cannot access document outside of the DOM");
  return (e == null ? void 0 : e.ownerDocument) ?? document;
}
To(yd, "getOwnerDocument");
function cS(e, t = !1) {
  const { activeElement: o } = yd(e);
  if (!(o != null && o.nodeName))
    return null;
  if (dS(o) && o.contentDocument)
    return cS(o.contentDocument.body, t);
  if (t) {
    const i = o.getAttribute("aria-activedescendant");
    if (i) {
      const a = yd(o).getElementById(i);
      if (a)
        return a;
    }
  }
  return o;
}
To(cS, "getActiveElement");
function dS(e) {
  return e.tagName === "IFRAME";
}
To(dS, "isFrame");
var XP = Object.defineProperty, vf = (e, t) => XP(e, "name", { value: t, configurable: !0 });
function gd(e, t) {
  if (typeof e == "function")
    return e(t);
  e != null && (e.current = t);
}
vf(gd, "setRef");
function fS(...e) {
  return (t) => {
    let o = !1;
    const i = e.map((a) => {
      const f = gd(a, t);
      return !o && typeof f == "function" && (o = !0), f;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const f = i[a];
          typeof f == "function" ? f() : gd(e[a], null);
        }
      };
  };
}
vf(fS, "composeRefs");
function ko(...e) {
  return b.useCallback(fS(...e), e);
}
vf(ko, "useComposedRefs");
var QP = Object.defineProperty, Dt = (e, t) => QP(e, "name", { value: t, configurable: !0 });
// @__NO_SIDE_EFFECTS__
function ZP(e, t) {
  const o = b.createContext(t);
  o.displayName = e + "Context";
  const i = /* @__PURE__ */ Dt((f) => {
    const { children: d, ...p } = f, m = b.useMemo(() => p, Object.values(p));
    return /* @__PURE__ */ x.jsx(o.Provider, { value: m, children: d });
  }, "Provider");
  i.displayName = e + "Provider";
  function a(f, d = {}) {
    const { optional: p = !1 } = d, m = b.useContext(o);
    if (m) return m;
    if (t !== void 0) return t;
    if (!p)
      throw new Error(`\`${f}\` must be used within \`${e}\``);
  }
  return Dt(a, "useContext"), [i, a];
}
Dt(ZP, "createContext");
// @__NO_SIDE_EFFECTS__
function pS(e, t = []) {
  let o = [];
  function i(f, d) {
    const p = b.createContext(d);
    p.displayName = f + "Context";
    const m = o.length;
    o = [...o, d];
    const y = /* @__PURE__ */ Dt((l) => {
      var _;
      const { scope: c, children: g, ...w } = l, T = ((_ = c == null ? void 0 : c[e]) == null ? void 0 : _[m]) || p, A = b.useMemo(() => w, Object.values(w));
      return /* @__PURE__ */ x.jsx(T.Provider, { value: A, children: g });
    }, "Provider");
    y.displayName = f + "Provider";
    function S(l, c, g = {}) {
      var _;
      const { optional: w = !1 } = g, T = ((_ = c == null ? void 0 : c[e]) == null ? void 0 : _[m]) || p, A = b.useContext(T);
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
  return a.scopeName = e, [i, mS(a, ...t)];
}
Dt(pS, "createContextScope");
function mS(...e) {
  const t = e[0];
  if (e.length === 1) return t;
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
      return b.useMemo(() => ({ [`__scope${t.scopeName}`]: d }), [d]);
    }, "useComposedScopes");
  }, "createScope");
  return o.scopeName = t.scopeName, o;
}
Dt(mS, "composeContextScopes");
var Jn = globalThis != null && globalThis.document ? b.useLayoutEffect : () => {
}, JP = Object.defineProperty, qP = (e, t) => JP(e, "name", { value: t, configurable: !0 }), eE = Rr[" useId ".trim().toString()] || (() => {
}), tE = 0;
function ka(e) {
  const [t, o] = b.useState(eE());
  return Jn(() => {
    e || o((i) => i ?? String(tE++));
  }, [e]), e || (t ? `radix-${t}` : "");
}
qP(ka, "useId");
var nE = Object.defineProperty, rE = (e, t) => nE(e, "name", { value: t, configurable: !0 }), Tg = Rr[" useEffectEvent ".trim().toString()], kg = Rr[" useInsertionEffect ".trim().toString()];
function hS(e) {
  if (typeof Tg == "function")
    return Tg(e);
  const t = b.useRef(() => {
    throw new Error("Cannot call an event handler while rendering.");
  });
  return typeof kg == "function" ? kg(() => {
    t.current = e;
  }) : Jn(() => {
    t.current = e;
  }), b.useMemo(() => ((...o) => {
    var i;
    return (i = t.current) == null ? void 0 : i.call(t, ...o);
  }), []);
}
rE(hS, "useEffectEvent");
var oE = Object.defineProperty, Vi = (e, t) => oE(e, "name", { value: t, configurable: !0 }), iE = Rr[" useInsertionEffect ".trim().toString()] || Jn;
function yS({
  prop: e,
  defaultProp: t,
  onChange: o = /* @__PURE__ */ Vi(() => {
  }, "onChange"),
  caller: i
}) {
  const [a, f, d] = gS({
    defaultProp: t,
    onChange: o
  }), p = e !== void 0, m = p ? e : a, y = b.useCallback(
    (S) => {
      var l;
      if (p) {
        const c = vS(S) ? S(e) : S;
        c !== e && ((l = d.current) == null || l.call(d, c));
      } else
        f(S);
    },
    [p, e, f, d]
  );
  return [m, y];
}
Vi(yS, "useControllableState");
function gS({
  defaultProp: e,
  onChange: t
}) {
  const [o, i] = b.useState(e), a = b.useRef(o), f = b.useRef(t);
  return iE(() => {
    f.current = t;
  }, [t]), b.useEffect(() => {
    var d;
    a.current !== o && ((d = f.current) == null || d.call(f, o), a.current = o);
  }, [o, a]), [o, i, f];
}
Vi(gS, "useUncontrolledState");
function vS(e) {
  return typeof e == "function";
}
Vi(vS, "isFunction");
var Ag = Symbol("RADIX:SYNC_STATE");
function sE(e, t, o, i) {
  const { prop: a, defaultProp: f, onChange: d, caller: p } = t, m = a !== void 0, y = hS(d), S = [{ ...o, state: f }];
  i && S.push(i);
  const [l, c] = b.useReducer(
    (A, _) => {
      if (_.type === Ag)
        return { ...A, state: _.state };
      const C = e(A, _);
      return m && !Object.is(C.state, A.state) && y(C.state), C;
    },
    ...S
  ), g = l.state, w = b.useRef(g);
  b.useEffect(() => {
    w.current !== g && (w.current = g, m || y(g));
  }, [g, w, m]);
  const T = b.useMemo(() => a !== void 0 ? { ...l, state: a } : l, [l, a]);
  return b.useEffect(() => {
    m && !Object.is(a, l.state) && c({ type: Ag, state: a });
  }, [a, l.state, m]), [T, c];
}
Vi(sE, "useControllableStateReducer");
var SS = Gg(), aE = Object.defineProperty, Gt = (e, t) => aE(e, "name", { value: t, configurable: !0 });
// @__NO_SIDE_EFFECTS__
function Sf(e) {
  const t = b.forwardRef((o, i) => {
    let { children: a, ...f } = o, d = null, p = !1;
    const m = [];
    vd(a) && typeof sa == "function" && (a = sa(a._payload)), b.Children.forEach(a, (c) => {
      var g;
      if (TS(c)) {
        p = !0;
        const w = c;
        let T = "child" in w.props ? w.props.child : w.props.children;
        vd(T) && typeof sa == "function" && (T = sa(T._payload)), d = uE(w, T), m.push((g = d == null ? void 0 : d.props) == null ? void 0 : g.children);
      } else
        m.push(c);
    }), d ? d = b.cloneElement(d, void 0, m) : (
      // A `Slottable` was found but it didn't resolve to a single element (e.g.
      // it wrapped multiple elements, text, or a render-prop `child` that
      // wasn't an element). Don't fall back to treating the `Slottable` wrapper
      // itself as the slot target — throw a descriptive error below instead.
      !p && b.Children.count(a) === 1 && b.isValidElement(a) && (d = a)
    );
    const y = d ? _S(d) : void 0, S = ko(i, y);
    if (!d) {
      if (a || a === 0)
        throw new Error(
          p ? fE(e) : dE(e)
        );
      return a;
    }
    const l = xS(f, d.props ?? {});
    return d.type !== b.Fragment && (l.ref = i ? S : y), b.cloneElement(d, l);
  });
  return t.displayName = `${e}.Slot`, t;
}
Gt(Sf, "createSlot");
var wS = Symbol.for("radix.slottable");
// @__NO_SIDE_EFFECTS__
function lE(e) {
  const t = /* @__PURE__ */ Gt((o) => "child" in o ? o.children(o.child) : o.children, "Slottable");
  return t.displayName = `${e}.Slottable`, t.__radixId = wS, t;
}
Gt(lE, "createSlottable");
var uE = /* @__PURE__ */ Gt((e, t) => {
  if ("child" in e.props) {
    const o = e.props.child;
    return b.isValidElement(o) ? b.cloneElement(o, void 0, e.props.children(o.props.children)) : null;
  }
  return b.isValidElement(t) ? t : null;
}, "getSlottableElementFromSlottable");
function xS(e, t) {
  const o = { ...t };
  for (const i in t) {
    const a = e[i], f = t[i];
    /^on[A-Z]/.test(i) ? a && f ? o[i] = (...p) => {
      const m = f(...p);
      return a(...p), m;
    } : a && (o[i] = a) : i === "style" ? o[i] = { ...a, ...f } : i === "className" && (o[i] = [a, f].filter(Boolean).join(" "));
  }
  return { ...e, ...o };
}
Gt(xS, "mergeProps");
function _S(e) {
  var i, a;
  let t = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = t && "isReactWarning" in t && t.isReactWarning;
  return o ? e.ref : (t = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = t && "isReactWarning" in t && t.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
Gt(_S, "getElementRef");
function TS(e) {
  return b.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === wS;
}
Gt(TS, "isSlottable");
var cE = Symbol.for("react.lazy");
function vd(e) {
  return e != null && typeof e == "object" && "$$typeof" in e && e.$$typeof === cE && "_payload" in e && kS(e._payload);
}
Gt(vd, "isLazyComponent");
function kS(e) {
  return typeof e == "object" && e !== null && "then" in e;
}
Gt(kS, "isPromiseLike");
var dE = /* @__PURE__ */ Gt((e) => `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`, "createSlotError"), fE = /* @__PURE__ */ Gt((e) => `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`, "createSlottableError"), sa = Rr[" use ".trim().toString()], pE = Object.defineProperty, mE = (e, t) => pE(e, "name", { value: t, configurable: !0 }), hE = [
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
], Ao = hE.reduce((e, t) => {
  const o = /* @__PURE__ */ Sf(`Primitive.${t}`), i = b.forwardRef((a, f) => {
    const { asChild: d, ...p } = a, m = d ? o : t;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ x.jsx(m, { ...p, ref: f });
  });
  return i.displayName = `Primitive.${t}`, { ...e, [t]: i };
}, {});
function AS(e, t) {
  e && SS.flushSync(() => e.dispatchEvent(t));
}
mE(AS, "dispatchDiscreteCustomEvent");
var yE = Object.defineProperty, gE = (e, t) => yE(e, "name", { value: t, configurable: !0 });
function So(e) {
  const t = b.useRef(e);
  return b.useEffect(() => {
    t.current = e;
  }), b.useMemo(() => ((...o) => {
    var i;
    return (i = t.current) == null ? void 0 : i.call(t, ...o);
  }), []);
}
gE(So, "useCallbackRef");
var vE = Object.defineProperty, Qe = (e, t) => vE(e, "name", { value: t, configurable: !0 }), Sd = "dismissableLayer.update", SE = "dismissableLayer.pointerDownOutside", wE = "dismissableLayer.focusOutside", bg, bS = b.createContext({
  layers: /* @__PURE__ */ new Set(),
  layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
  branches: /* @__PURE__ */ new Set(),
  // Outside elements that belong to a layer's own dismiss affordance (eg, a
  // dialog overlay). Pressing them should dismiss the layer regardless of
  // whether or not they stop propagation.
  //
  // See https://github.com/radix-ui/primitives/issues/3346
  dismissableSurfaces: /* @__PURE__ */ new Set()
}), xE = /* @__PURE__ */ b.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Qe(function(t, o) {
    const {
      disableOutsidePointerEvents: i = !1,
      deferPointerDownOutside: a = !1,
      onEscapeKeyDown: f,
      onPointerDownOutside: d,
      onFocusOutside: p,
      onInteractOutside: m,
      onDismiss: y,
      ...S
    } = t, l = b.useContext(bS), [c, g] = b.useState(null), w = (c == null ? void 0 : c.ownerDocument) ?? (globalThis == null ? void 0 : globalThis.document), [, T] = b.useState({}), A = ko(o, g), _ = Array.from(l.layers), [C] = [
      ...l.layersWithOutsidePointerEventsDisabled
    ].slice(-1), E = C ? _.indexOf(C) : -1, N = c ? _.indexOf(c) : -1, L = l.layersWithOutsidePointerEventsDisabled.size > 0, W = N >= E, H = b.useRef(!1), Y = PS(
      (J) => {
        d == null || d(J), m == null || m(J), J.defaultPrevented || y == null || y();
      },
      {
        ownerDocument: w,
        deferPointerDownOutside: a,
        isDeferredPointerDownOutsideRef: H,
        dismissableSurfaces: l.dismissableSurfaces,
        shouldHandlePointerDownOutside: b.useCallback(
          (J) => {
            if (!(J instanceof Node))
              return !1;
            const ce = [...l.branches].some(
              (ue) => ue.contains(J)
            );
            return W && !ce;
          },
          [l.branches, W]
        )
      }
    ), V = ES((J) => {
      if (a && H.current)
        return;
      const ce = J.target;
      [...l.branches].some((ye) => ye.contains(ce)) || (p == null || p(J), m == null || m(J), J.defaultPrevented || y == null || y());
    }, w), Q = c ? N === _.length - 1 : !1, ie = So((J) => {
      J.key === "Escape" && (f == null || f(J), !J.defaultPrevented && y && (J.preventDefault(), y()));
    });
    return b.useEffect(() => {
      if (Q)
        return w.addEventListener("keydown", ie, { capture: !0 }), () => w.removeEventListener("keydown", ie, { capture: !0 });
    }, [w, Q, ie]), b.useEffect(() => {
      if (c)
        return i && (l.layersWithOutsidePointerEventsDisabled.size === 0 && (bg = w.body.style.pointerEvents, w.body.style.pointerEvents = "none"), l.layersWithOutsidePointerEventsDisabled.add(c)), l.layers.add(c), wd(), () => {
          i && (l.layersWithOutsidePointerEventsDisabled.delete(c), l.layersWithOutsidePointerEventsDisabled.size === 0 && (w.body.style.pointerEvents = bg));
        };
    }, [c, w, i, l]), b.useEffect(() => () => {
      c && (l.layers.delete(c), l.layersWithOutsidePointerEventsDisabled.delete(c), wd());
    }, [c, l]), b.useEffect(() => {
      const J = /* @__PURE__ */ Qe(() => T({}), "handleUpdate");
      return document.addEventListener(Sd, J), () => document.removeEventListener(Sd, J);
    }, []), /* @__PURE__ */ x.jsx(
      Ao.div,
      {
        ...S,
        ref: A,
        style: {
          pointerEvents: L ? W ? "auto" : "none" : void 0,
          ...t.style
        },
        onFocusCapture: Cr(t.onFocusCapture, V.onFocusCapture),
        onBlurCapture: Cr(t.onBlurCapture, V.onBlurCapture),
        onPointerDownCapture: Cr(
          t.onPointerDownCapture,
          Y.onPointerDownCapture
        )
      }
    );
  }, "DismissableLayer")
);
function CS() {
  const e = b.useContext(bS), [t, o] = b.useState(null);
  return b.useEffect(() => {
    if (t)
      return e.dismissableSurfaces.add(t), () => {
        e.dismissableSurfaces.delete(t);
      };
  }, [t, e.dismissableSurfaces]), o;
}
Qe(CS, "useDismissableLayerSurface");
var _E = /* @__PURE__ */ Qe(() => !0, "IS_TRUE");
function PS(e, t) {
  const {
    ownerDocument: o = globalThis == null ? void 0 : globalThis.document,
    deferPointerDownOutside: i = !1,
    isDeferredPointerDownOutsideRef: a,
    dismissableSurfaces: f,
    shouldHandlePointerDownOutside: d = _E
  } = t, p = So(e), m = b.useRef(!1), y = b.useRef(!1), S = b.useRef(/* @__PURE__ */ new Map()), l = b.useRef(() => {
  });
  return b.useEffect(() => {
    function c() {
      y.current = !1, a.current = !1, S.current.clear();
    }
    Qe(c, "resetOutsideInteraction");
    function g() {
      return Array.from(S.current.values()).some(Boolean);
    }
    Qe(g, "isOutsideInteractionIntercepted");
    function w(E) {
      if (!y.current)
        return;
      const N = E.target;
      N instanceof Node && [...f].some((W) => W.contains(N)) || S.current.set(E.type, !0), E.type === "click" && window.setTimeout(() => {
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
        let N = function() {
          o.removeEventListener("click", l.current);
          const W = g();
          c(), W || wf(
            SE,
            p,
            L,
            { discrete: !0 }
          );
        };
        if (Qe(N, "handleAndDispatchPointerDownOutsideEvent"), !d(E.target)) {
          o.removeEventListener("click", l.current), c(), m.current = !1;
          return;
        }
        const L = { originalEvent: E };
        y.current = !0, a.current = i && E.button === 0, S.current.clear(), !i || E.button !== 0 ? N() : (o.removeEventListener("click", l.current), l.current = N, o.addEventListener("click", l.current, { once: !0 }));
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
Qe(PS, "usePointerDownOutside");
function ES(e, t = globalThis == null ? void 0 : globalThis.document) {
  const o = So(e), i = b.useRef(!1);
  return b.useEffect(() => {
    const a = /* @__PURE__ */ Qe((f) => {
      f.target && !i.current && wf(wE, o, { originalEvent: f }, {
        discrete: !1
      });
    }, "handleFocus");
    return t.addEventListener("focusin", a), () => t.removeEventListener("focusin", a);
  }, [t, o]), {
    onFocusCapture: /* @__PURE__ */ Qe(() => i.current = !0, "onFocusCapture"),
    onBlurCapture: /* @__PURE__ */ Qe(() => i.current = !1, "onBlurCapture")
  };
}
Qe(ES, "useFocusOutside");
function wd() {
  const e = new CustomEvent(Sd);
  document.dispatchEvent(e);
}
Qe(wd, "dispatchUpdate");
function wf(e, t, o, { discrete: i }) {
  const a = o.originalEvent.target, f = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: o });
  t && a.addEventListener(e, t, { once: !0 }), i ? AS(a, f) : a.dispatchEvent(f);
}
Qe(wf, "handleAndDispatchCustomEvent");
var TE = Object.defineProperty, ct = (e, t) => TE(e, "name", { value: t, configurable: !0 }), kc = "focusScope.autoFocusOnMount", Ac = "focusScope.autoFocusOnUnmount", Cg = { bubbles: !1, cancelable: !0 }, kE = /* @__PURE__ */ b.forwardRef(
  /* @__PURE__ */ ct(function(t, o) {
    const {
      loop: i = !1,
      trapped: a = !1,
      onMountAutoFocus: f,
      onUnmountAutoFocus: d,
      ...p
    } = t, [m, y] = b.useState(null), S = So(f), l = So(d), c = b.useRef(null), g = ko(o, y), w = b.useRef({
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
        let A = function(N) {
          if (w.paused || !m) return;
          const L = N.target;
          m.contains(L) ? c.current = L : yn(c.current, { select: !0 });
        }, _ = function(N) {
          if (w.paused || !m) return;
          const L = N.relatedTarget;
          L !== null && (m.contains(L) || yn(c.current, { select: !0 }));
        }, C = function(N) {
          if (document.activeElement === document.body)
            for (const W of N)
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
        Pg.add(w);
        const A = document.activeElement;
        if (!m.contains(A)) {
          const C = new CustomEvent(kc, Cg);
          m.addEventListener(kc, S), m.dispatchEvent(C), C.defaultPrevented || (MS(IS(xf(m)), { select: !0 }), document.activeElement === A && yn(m));
        }
        return () => {
          m.removeEventListener(kc, S), setTimeout(() => {
            const C = new CustomEvent(Ac, Cg);
            m.addEventListener(Ac, l), m.dispatchEvent(C), C.defaultPrevented || yn(A ?? document.body, { select: !0 }), m.removeEventListener(Ac, l), Pg.remove(w);
          }, 0);
        };
      }
    }, [m, S, l, w]);
    const T = b.useCallback(
      (A) => {
        if (!i && !a || w.paused) return;
        const _ = A.key === "Tab" && !A.altKey && !A.ctrlKey && !A.metaKey, C = document.activeElement;
        if (_ && C) {
          const E = A.currentTarget, [N, L] = RS(E);
          N && L ? !A.shiftKey && C === L ? (A.preventDefault(), i && yn(N, { select: !0 })) : A.shiftKey && C === N && (A.preventDefault(), i && yn(L, { select: !0 })) : C === E && A.preventDefault();
        }
      },
      [i, a, w.paused]
    );
    return /* @__PURE__ */ x.jsx(Ao.div, { tabIndex: -1, ...p, ref: g, onKeyDown: T });
  }, "FocusScope")
);
function MS(e, { select: t = !1 } = {}) {
  const o = document.activeElement;
  for (const i of e)
    if (yn(i, { select: t }), document.activeElement !== o) return;
}
ct(MS, "focusFirst");
function RS(e) {
  const t = xf(e), o = xd(t, e), i = xd(t.reverse(), e);
  return [o, i];
}
ct(RS, "getTabbableEdges");
function xf(e) {
  const t = [], o = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
    acceptNode: /* @__PURE__ */ ct((i) => {
      const a = i.tagName === "INPUT" && i.type === "hidden";
      return i.disabled || i.hidden || a ? NodeFilter.FILTER_SKIP : i.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }, "acceptNode")
  });
  for (; o.nextNode(); ) t.push(o.currentNode);
  return t;
}
ct(xf, "getTabbableCandidates");
function xd(e, t) {
  const o = typeof t.checkVisibility == "function" && t.checkVisibility({ checkVisibilityCSS: !0 });
  for (const i of e)
    if (!(o ? !i.checkVisibility({ checkVisibilityCSS: !0 }) : DS(i, { upTo: t })))
      return i;
}
ct(xd, "findVisible");
function DS(e, { upTo: t }) {
  if (getComputedStyle(e).visibility === "hidden") return !0;
  for (; e; ) {
    if (t !== void 0 && e === t) return !1;
    if (getComputedStyle(e).display === "none") return !0;
    e = e.parentElement;
  }
  return !1;
}
ct(DS, "isHidden");
function NS(e) {
  return e instanceof HTMLInputElement && "select" in e;
}
ct(NS, "isSelectableInput");
function yn(e, { select: t = !1 } = {}) {
  if (e && e.focus) {
    const o = document.activeElement;
    e.focus({ preventScroll: !0 }), e !== o && NS(e) && t && e.select();
  }
}
ct(yn, "focus");
var Pg = jS();
function jS() {
  let e = [];
  return {
    add(t) {
      const o = e[0];
      t !== o && (o == null || o.pause()), e = _d(e, t), e.unshift(t);
    },
    remove(t) {
      var o;
      e = _d(e, t), (o = e[0]) == null || o.resume();
    }
  };
}
ct(jS, "createFocusScopesStack");
function _d(e, t) {
  const o = [...e], i = o.indexOf(t);
  return i !== -1 && o.splice(i, 1), o;
}
ct(_d, "arrayRemove");
function IS(e) {
  return e.filter((t) => t.tagName !== "A");
}
ct(IS, "removeLinks");
var AE = Object.defineProperty, bE = (e, t) => AE(e, "name", { value: t, configurable: !0 }), CE = /* @__PURE__ */ b.forwardRef(
  /* @__PURE__ */ bE(function(t, o) {
    var m;
    const { container: i, ...a } = t, [f, d] = b.useState(!1);
    Jn(() => d(!0), []);
    const p = i || f && ((m = globalThis == null ? void 0 : globalThis.document) == null ? void 0 : m.body);
    return p ? SS.createPortal(/* @__PURE__ */ x.jsx(Ao.div, { ...a, ref: o }), p) : null;
  }, "Portal")
), PE = Object.defineProperty, xn = (e, t) => PE(e, "name", { value: t, configurable: !0 });
function FS(e, t) {
  return b.useReducer((o, i) => t[o][i] ?? o, e);
}
xn(FS, "useStateMachine");
var _f = /* @__PURE__ */ xn((e) => {
  const { present: t, children: o } = e, i = OS(t), a = typeof o == "function" ? o({ present: i.isPresent }) : b.Children.only(o), f = LS(i.ref, VS(a));
  return typeof o == "function" || i.isPresent ? b.cloneElement(a, { ref: f }) : null;
}, "Presence");
function OS(e) {
  const [t, o] = b.useState(), i = b.useRef(null), a = b.useRef(e), f = b.useRef("none"), d = b.useRef(void 0), p = e ? "mounted" : "unmounted", [m, y] = FS(p, {
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
    m === "mounted" ? (f.current = d.current ?? uo(i.current), d.current = void 0) : f.current = "none";
  }, [m]), Jn(() => {
    const S = i.current, l = a.current;
    if (l !== e) {
      const g = f.current, w = uo(S);
      e ? (d.current = w, y("MOUNT")) : w === "none" || (S == null ? void 0 : S.display) === "none" ? y("UNMOUNT") : y(l && g !== w ? "ANIMATION_OUT" : "UNMOUNT"), a.current = e;
    }
  }, [e, y]), Jn(() => {
    if (t) {
      let S;
      const l = t.ownerDocument.defaultView ?? window, c = /* @__PURE__ */ xn((w) => {
        const A = uo(i.current).includes(CSS.escape(w.animationName));
        if (w.target === t && A && (y("ANIMATION_END"), !a.current)) {
          const _ = t.style.animationFillMode;
          t.style.animationFillMode = "forwards", S = l.setTimeout(() => {
            t.style.animationFillMode === "forwards" && (t.style.animationFillMode = _);
          });
        }
      }, "handleAnimationEnd"), g = /* @__PURE__ */ xn((w) => {
        w.target === t && (f.current = uo(i.current));
      }, "handleAnimationStart");
      return t.addEventListener("animationstart", g), t.addEventListener("animationcancel", c), t.addEventListener("animationend", c), () => {
        l.clearTimeout(S), t.removeEventListener("animationstart", g), t.removeEventListener("animationcancel", c), t.removeEventListener("animationend", c);
      };
    } else
      y("ANIMATION_END");
  }, [t, y]), {
    isPresent: ["mounted", "unmountSuspended"].includes(m),
    ref: b.useCallback((S) => {
      if (S) {
        const l = getComputedStyle(S);
        i.current = l, d.current = uo(l);
      } else
        i.current = null;
      o(S);
    }, [])
  };
}
xn(OS, "usePresence");
function Td(e, t) {
  if (typeof e == "function")
    return e(t);
  e != null && (e.current = t);
}
xn(Td, "setRef");
function LS(...e) {
  const t = b.useRef(e);
  return t.current = e, b.useCallback((o) => {
    const i = t.current;
    let a = !1;
    const f = i.map((d) => {
      const p = Td(d, o);
      return !a && typeof p == "function" && (a = !0), p;
    });
    if (a)
      return () => {
        for (let d = 0; d < f.length; d++) {
          const p = f[d];
          typeof p == "function" ? p() : Td(i[d], null);
        }
      };
  }, []);
}
xn(LS, "useStableComposedRefs");
function uo(e) {
  return (e == null ? void 0 : e.animationName) || "none";
}
xn(uo, "getAnimationName");
function VS(e) {
  var i, a;
  let t = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = t && "isReactWarning" in t && t.isReactWarning;
  return o ? e.ref : (t = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = t && "isReactWarning" in t && t.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
xn(VS, "getElementRef");
var EE = Object.defineProperty, Tf = (e, t) => EE(e, "name", { value: t, configurable: !0 }), aa = 0, qt = null;
function ME(e) {
  return kf(), e.children;
}
Tf(ME, "FocusGuards");
function kf() {
  b.useEffect(() => {
    qt || (qt = { start: kd(), end: kd() });
    const { start: e, end: t } = qt;
    return document.body.firstElementChild !== e && document.body.insertAdjacentElement("afterbegin", e), document.body.lastElementChild !== t && document.body.insertAdjacentElement("beforeend", t), aa++, () => {
      aa === 1 && (qt == null || qt.start.remove(), qt == null || qt.end.remove(), qt = null), aa = Math.max(0, aa - 1);
    };
  }, []);
}
Tf(kf, "useFocusGuards");
function kd() {
  const e = document.createElement("span");
  return e.setAttribute("data-radix-focus-guard", ""), e.tabIndex = 0, e.style.outline = "none", e.style.opacity = "0", e.style.position = "fixed", e.style.pointerEvents = "none", e;
}
Tf(kd, "createFocusGuard");
var nn = function() {
  return nn = Object.assign || function(t) {
    for (var o, i = 1, a = arguments.length; i < a; i++) {
      o = arguments[i];
      for (var f in o) Object.prototype.hasOwnProperty.call(o, f) && (t[f] = o[f]);
    }
    return t;
  }, nn.apply(this, arguments);
};
function zS(e, t) {
  var o = {};
  for (var i in e) Object.prototype.hasOwnProperty.call(e, i) && t.indexOf(i) < 0 && (o[i] = e[i]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var a = 0, i = Object.getOwnPropertySymbols(e); a < i.length; a++)
      t.indexOf(i[a]) < 0 && Object.prototype.propertyIsEnumerable.call(e, i[a]) && (o[i[a]] = e[i[a]]);
  return o;
}
function RE(e, t, o) {
  if (o || arguments.length === 2) for (var i = 0, a = t.length, f; i < a; i++)
    (f || !(i in t)) && (f || (f = Array.prototype.slice.call(t, 0, i)), f[i] = t[i]);
  return e.concat(f || Array.prototype.slice.call(t));
}
var Aa = "right-scroll-bar-position", ba = "width-before-scroll-bar", DE = "with-scroll-bars-hidden", NE = "--removed-body-scroll-bar-size";
function bc(e, t) {
  return typeof e == "function" ? e(t) : e && (e.current = t), e;
}
function jE(e, t) {
  var o = b.useState(function() {
    return {
      // value
      value: e,
      // last callback
      callback: t,
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
  return o.callback = t, o.facade;
}
var IE = typeof window < "u" ? b.useLayoutEffect : b.useEffect, Eg = /* @__PURE__ */ new WeakMap();
function FE(e, t) {
  var o = jE(null, function(i) {
    return e.forEach(function(a) {
      return bc(a, i);
    });
  });
  return IE(function() {
    var i = Eg.get(o);
    if (i) {
      var a = new Set(i), f = new Set(e), d = o.current;
      a.forEach(function(p) {
        f.has(p) || bc(p, null);
      }), f.forEach(function(p) {
        a.has(p) || bc(p, d);
      });
    }
    Eg.set(o, e);
  }, [e]), o;
}
function OE(e) {
  return e;
}
function LE(e, t) {
  t === void 0 && (t = OE);
  var o = [], i = !1, a = {
    read: function() {
      if (i)
        throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");
      return o.length ? o[o.length - 1] : e;
    },
    useMedium: function(f) {
      var d = t(f, i);
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
function VE(e) {
  e === void 0 && (e = {});
  var t = LE(null);
  return t.options = nn({ async: !0, ssr: !1 }, e), t;
}
var BS = function(e) {
  var t = e.sideCar, o = zS(e, ["sideCar"]);
  if (!t)
    throw new Error("Sidecar: please provide `sideCar` property to import the right car");
  var i = t.read();
  if (!i)
    throw new Error("Sidecar medium not found");
  return b.createElement(i, nn({}, o));
};
BS.isSideCarExport = !0;
function zE(e, t) {
  return e.useMedium(t), BS;
}
var $S = VE(), Cc = function() {
}, il = b.forwardRef(function(e, t) {
  var o = b.useRef(null), i = b.useState({
    onScrollCapture: Cc,
    onWheelCapture: Cc,
    onTouchMoveCapture: Cc
  }), a = i[0], f = i[1], d = e.forwardProps, p = e.children, m = e.className, y = e.removeScrollBar, S = e.enabled, l = e.shards, c = e.sideCar, g = e.noRelative, w = e.noIsolation, T = e.inert, A = e.allowPinchZoom, _ = e.as, C = _ === void 0 ? "div" : _, E = e.gapMode, N = zS(e, ["forwardProps", "children", "className", "removeScrollBar", "enabled", "shards", "sideCar", "noRelative", "noIsolation", "inert", "allowPinchZoom", "as", "gapMode"]), L = c, W = FE([o, t]), H = nn(nn({}, N), a);
  return b.createElement(
    b.Fragment,
    null,
    S && b.createElement(L, { sideCar: $S, removeScrollBar: y, shards: l, noRelative: g, noIsolation: w, inert: T, setCallbacks: f, allowPinchZoom: !!A, lockRef: o, gapMode: E }),
    d ? b.cloneElement(b.Children.only(p), nn(nn({}, H), { ref: W })) : b.createElement(C, nn({}, H, { className: m, ref: W }), p)
  );
});
il.defaultProps = {
  enabled: !0,
  removeScrollBar: !0,
  inert: !1
};
il.classNames = {
  fullWidth: ba,
  zeroRight: Aa
};
var BE = function() {
  if (typeof __webpack_nonce__ < "u")
    return __webpack_nonce__;
};
function $E() {
  if (!document)
    return null;
  var e = document.createElement("style");
  e.type = "text/css";
  var t = BE();
  return t && e.setAttribute("nonce", t), e;
}
function UE(e, t) {
  e.styleSheet ? e.styleSheet.cssText = t : e.appendChild(document.createTextNode(t));
}
function HE(e) {
  var t = document.head || document.getElementsByTagName("head")[0];
  t.appendChild(e);
}
var WE = function() {
  var e = 0, t = null;
  return {
    add: function(o) {
      e == 0 && (t = $E()) && (UE(t, o), HE(t)), e++;
    },
    remove: function() {
      e--, !e && t && (t.parentNode && t.parentNode.removeChild(t), t = null);
    }
  };
}, GE = function() {
  var e = WE();
  return function(t, o) {
    b.useEffect(function() {
      return e.add(t), function() {
        e.remove();
      };
    }, [t && o]);
  };
}, US = function() {
  var e = GE(), t = function(o) {
    var i = o.styles, a = o.dynamic;
    return e(i, a), null;
  };
  return t;
}, KE = {
  left: 0,
  top: 0,
  right: 0,
  gap: 0
}, Pc = function(e) {
  return parseInt(e || "", 10) || 0;
}, YE = function(e) {
  var t = window.getComputedStyle(document.body), o = t[e === "padding" ? "paddingLeft" : "marginLeft"], i = t[e === "padding" ? "paddingTop" : "marginTop"], a = t[e === "padding" ? "paddingRight" : "marginRight"];
  return [Pc(o), Pc(i), Pc(a)];
}, XE = function(e) {
  if (e === void 0 && (e = "margin"), typeof window > "u")
    return KE;
  var t = YE(e), o = document.documentElement.clientWidth, i = window.innerWidth;
  return {
    left: t[0],
    top: t[1],
    right: t[2],
    gap: Math.max(0, i - o + t[2] - t[0])
  };
}, QE = US(), yo = "data-scroll-locked", ZE = function(e, t, o, i) {
  var a = e.left, f = e.top, d = e.right, p = e.gap;
  return o === void 0 && (o = "margin"), `
  .`.concat(DE, ` {
   overflow: hidden `).concat(i, `;
   padding-right: `).concat(p, "px ").concat(i, `;
  }
  body[`).concat(yo, `] {
    overflow: hidden `).concat(i, `;
    overscroll-behavior: contain;
    `).concat([
    t && "position: relative ".concat(i, ";"),
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
  
  .`).concat(Aa, ` {
    right: `).concat(p, "px ").concat(i, `;
  }
  
  .`).concat(ba, ` {
    margin-right: `).concat(p, "px ").concat(i, `;
  }
  
  .`).concat(Aa, " .").concat(Aa, ` {
    right: 0 `).concat(i, `;
  }
  
  .`).concat(ba, " .").concat(ba, ` {
    margin-right: 0 `).concat(i, `;
  }
  
  body[`).concat(yo, `] {
    `).concat(NE, ": ").concat(p, `px;
  }
`);
}, Mg = function() {
  var e = parseInt(document.body.getAttribute(yo) || "0", 10);
  return isFinite(e) ? e : 0;
}, JE = function() {
  b.useEffect(function() {
    return document.body.setAttribute(yo, (Mg() + 1).toString()), function() {
      var e = Mg() - 1;
      e <= 0 ? document.body.removeAttribute(yo) : document.body.setAttribute(yo, e.toString());
    };
  }, []);
}, qE = function(e) {
  var t = e.noRelative, o = e.noImportant, i = e.gapMode, a = i === void 0 ? "margin" : i;
  JE();
  var f = b.useMemo(function() {
    return XE(a);
  }, [a]);
  return b.createElement(QE, { styles: ZE(f, !t, a, o ? "" : "!important") });
}, Ad = !1;
if (typeof window < "u")
  try {
    var la = Object.defineProperty({}, "passive", {
      get: function() {
        return Ad = !0, !0;
      }
    });
    window.addEventListener("test", la, la), window.removeEventListener("test", la, la);
  } catch {
    Ad = !1;
  }
var io = Ad ? { passive: !1 } : !1, eM = function(e) {
  return e.tagName === "TEXTAREA";
}, HS = function(e, t) {
  if (!(e instanceof Element))
    return !1;
  var o = window.getComputedStyle(e);
  return (
    // not-not-scrollable
    o[t] !== "hidden" && // contains scroll inside self
    !(o.overflowY === o.overflowX && !eM(e) && o[t] === "visible")
  );
}, tM = function(e) {
  return HS(e, "overflowY");
}, nM = function(e) {
  return HS(e, "overflowX");
}, Rg = function(e, t) {
  var o = t.ownerDocument, i = t;
  do {
    typeof ShadowRoot < "u" && i instanceof ShadowRoot && (i = i.host);
    var a = WS(e, i);
    if (a) {
      var f = GS(e, i), d = f[1], p = f[2];
      if (d > p)
        return !0;
    }
    i = i.parentNode;
  } while (i && i !== o.body);
  return !1;
}, rM = function(e) {
  var t = e.scrollTop, o = e.scrollHeight, i = e.clientHeight;
  return [
    t,
    o,
    i
  ];
}, oM = function(e) {
  var t = e.scrollLeft, o = e.scrollWidth, i = e.clientWidth;
  return [
    t,
    o,
    i
  ];
}, WS = function(e, t) {
  return e === "v" ? tM(t) : nM(t);
}, GS = function(e, t) {
  return e === "v" ? rM(t) : oM(t);
}, iM = function(e, t) {
  return e === "h" && t === "rtl" ? -1 : 1;
}, sM = function(e, t, o, i, a) {
  var f = iM(e, window.getComputedStyle(t).direction), d = f * i, p = o.target, m = t.contains(p), y = !1, S = d > 0, l = 0, c = 0;
  do {
    if (!p)
      break;
    var g = GS(e, p), w = g[0], T = g[1], A = g[2], _ = T - A - f * w;
    (w || _) && WS(e, p) && (l += _, c += w);
    var C = p.parentNode;
    p = C && C.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? C.host : C;
  } while (
    // portaled content
    !m && p !== document.body || // self content
    m && (t.contains(p) || t === p)
  );
  return (S && Math.abs(l) < 1 || !S && Math.abs(c) < 1) && (y = !0), y;
}, ua = function(e) {
  return "changedTouches" in e ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY] : [0, 0];
}, Dg = function(e) {
  return [e.deltaX, e.deltaY];
}, Ng = function(e) {
  return e && "current" in e ? e.current : e;
}, aM = function(e, t) {
  return e[0] === t[0] && e[1] === t[1];
}, lM = function(e) {
  return `
  .block-interactivity-`.concat(e, ` {pointer-events: none;}
  .allow-interactivity-`).concat(e, ` {pointer-events: all;}
`);
}, uM = 0, so = [];
function cM(e) {
  var t = b.useRef([]), o = b.useRef([0, 0]), i = b.useRef(), a = b.useState(uM++)[0], f = b.useState(US)[0], d = b.useRef(e);
  b.useEffect(function() {
    d.current = e;
  }, [e]), b.useEffect(function() {
    if (e.inert) {
      document.body.classList.add("block-interactivity-".concat(a));
      var T = RE([e.lockRef.current], (e.shards || []).map(Ng), !0).filter(Boolean);
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
    var _ = ua(T), C = o.current, E = "deltaX" in T ? T.deltaX : C[0] - _[0], N = "deltaY" in T ? T.deltaY : C[1] - _[1], L, W = T.target, H = Math.abs(E) > Math.abs(N) ? "h" : "v";
    if ("touches" in T && H === "h" && W.type === "range")
      return !1;
    var Y = window.getSelection(), V = Y && Y.anchorNode, Q = V ? V === W || V.contains(W) : !1;
    if (Q)
      return !1;
    var ie = Rg(H, W);
    if (!ie)
      return !0;
    if (ie ? L = H : (L = H === "v" ? "h" : "v", ie = Rg(H, W)), !ie)
      return !1;
    if (!i.current && "changedTouches" in T && (E || N) && (i.current = L), !L)
      return !0;
    var J = i.current || L;
    return sM(J, A, T, J === "h" ? E : N);
  }, []), m = b.useCallback(function(T) {
    var A = T;
    if (!(!so.length || so[so.length - 1] !== f)) {
      var _ = "deltaY" in A ? Dg(A) : ua(A), C = t.current.filter(function(L) {
        return L.name === A.type && (L.target === A.target || A.target === L.shadowParent) && aM(L.delta, _);
      })[0];
      if (C && C.should) {
        A.cancelable && A.preventDefault();
        return;
      }
      if (!C) {
        var E = (d.current.shards || []).map(Ng).filter(Boolean).filter(function(L) {
          return L.contains(A.target);
        }), N = E.length > 0 ? p(A, E[0]) : !d.current.noIsolation;
        N && A.cancelable && A.preventDefault();
      }
    }
  }, []), y = b.useCallback(function(T, A, _, C) {
    var E = { name: T, delta: A, target: _, should: C, shadowParent: dM(_) };
    t.current.push(E), setTimeout(function() {
      t.current = t.current.filter(function(N) {
        return N !== E;
      });
    }, 1);
  }, []), S = b.useCallback(function(T) {
    o.current = ua(T), i.current = void 0;
  }, []), l = b.useCallback(function(T) {
    y(T.type, Dg(T), T.target, p(T, e.lockRef.current));
  }, []), c = b.useCallback(function(T) {
    y(T.type, ua(T), T.target, p(T, e.lockRef.current));
  }, []);
  b.useEffect(function() {
    return so.push(f), e.setCallbacks({
      onScrollCapture: l,
      onWheelCapture: l,
      onTouchMoveCapture: c
    }), document.addEventListener("wheel", m, io), document.addEventListener("touchmove", m, io), document.addEventListener("touchstart", S, io), function() {
      so = so.filter(function(T) {
        return T !== f;
      }), document.removeEventListener("wheel", m, io), document.removeEventListener("touchmove", m, io), document.removeEventListener("touchstart", S, io);
    };
  }, []);
  var g = e.removeScrollBar, w = e.inert;
  return b.createElement(
    b.Fragment,
    null,
    w ? b.createElement(f, { styles: lM(a) }) : null,
    g ? b.createElement(qE, { noRelative: e.noRelative, gapMode: e.gapMode }) : null
  );
}
function dM(e) {
  for (var t = null; e !== null; )
    e instanceof ShadowRoot && (t = e.host, e = e.host), e = e.parentNode;
  return t;
}
const fM = zE($S, cM);
var KS = b.forwardRef(function(e, t) {
  return b.createElement(il, nn({}, e, { ref: t, sideCar: fM }));
});
KS.classNames = il.classNames;
var pM = function(e) {
  if (typeof document > "u")
    return null;
  var t = Array.isArray(e) ? e[0] : e;
  return t.ownerDocument.body;
}, ao = /* @__PURE__ */ new WeakMap(), ca = /* @__PURE__ */ new WeakMap(), da = {}, Ec = 0, YS = function(e) {
  return e && (e.host || YS(e.parentNode));
}, mM = function(e, t) {
  return t.map(function(o) {
    if (e.contains(o))
      return o;
    var i = YS(o);
    return i && e.contains(i) ? i : (console.error("aria-hidden", o, "in not contained inside", e, ". Doing nothing"), null);
  }).filter(function(o) {
    return !!o;
  });
}, hM = function(e, t, o, i) {
  var a = mM(t, Array.isArray(e) ? e : [e]);
  da[o] || (da[o] = /* @__PURE__ */ new WeakMap());
  var f = da[o], d = [], p = /* @__PURE__ */ new Set(), m = new Set(a), y = function(l) {
    !l || p.has(l) || (p.add(l), y(l.parentNode));
  };
  a.forEach(y);
  var S = function(l) {
    !l || m.has(l) || Array.prototype.forEach.call(l.children, function(c) {
      if (p.has(c))
        S(c);
      else
        try {
          var g = c.getAttribute(i), w = g !== null && g !== "false", T = (ao.get(c) || 0) + 1, A = (f.get(c) || 0) + 1;
          ao.set(c, T), f.set(c, A), d.push(c), T === 1 && w && ca.set(c, !0), A === 1 && c.setAttribute(o, "true"), w || c.setAttribute(i, "true");
        } catch (_) {
          console.error("aria-hidden: cannot operate on ", c, _);
        }
    });
  };
  return S(t), p.clear(), Ec++, function() {
    d.forEach(function(l) {
      var c = ao.get(l) - 1, g = f.get(l) - 1;
      ao.set(l, c), f.set(l, g), c || (ca.has(l) || l.removeAttribute(i), ca.delete(l)), g || l.removeAttribute(o);
    }), Ec--, Ec || (ao = /* @__PURE__ */ new WeakMap(), ao = /* @__PURE__ */ new WeakMap(), ca = /* @__PURE__ */ new WeakMap(), da = {});
  };
}, yM = function(e, t, o) {
  o === void 0 && (o = "data-aria-hidden");
  var i = Array.from(Array.isArray(e) ? e : [e]), a = pM(e);
  return a ? (i.push.apply(i, Array.from(a.querySelectorAll("[aria-live], script"))), hM(i, a, o, "aria-hidden")) : function() {
    return null;
  };
}, gM = Object.defineProperty, Kt = (e, t) => gM(e, "name", { value: t, configurable: !0 }), Af = "Dialog", [XS, y2] = /* @__PURE__ */ pS(Af), [vM, _n] = XS(Af), SM = /* @__PURE__ */ Kt((e) => {
  const {
    __scopeDialog: t,
    children: o,
    open: i,
    defaultOpen: a,
    onOpenChange: f,
    modal: d = !0
  } = e, p = b.useRef(null), m = b.useRef(null), [y, S] = yS({
    prop: i,
    defaultProp: a ?? !1,
    onChange: f,
    caller: Af
  }), [l, c] = b.useState(0), [g, w] = b.useState(0);
  return /* @__PURE__ */ x.jsx(
    vM,
    {
      scope: t,
      triggerRef: p,
      contentRef: m,
      contentId: ka(),
      titleId: ka(),
      descriptionId: ka(),
      titlePresent: l > 0,
      descriptionPresent: g > 0,
      setTitleCount: c,
      setDescriptionCount: w,
      open: y,
      onOpenChange: S,
      onOpenToggle: b.useCallback(() => S((T) => !T), [S]),
      modal: d,
      children: o
    }
  );
}, "Dialog"), QS = "DialogPortal", [wM, ZS] = XS(QS, {
  forceMount: void 0
}), xM = /* @__PURE__ */ Kt((e) => {
  const { __scopeDialog: t, forceMount: o, children: i, container: a } = e, f = _n(QS, t);
  return /* @__PURE__ */ x.jsx(wM, { scope: t, forceMount: o, children: b.Children.map(i, (d) => /* @__PURE__ */ x.jsx(_f, { present: o || f.open, children: /* @__PURE__ */ x.jsx(CE, { asChild: !0, container: a, children: d }) })) });
}, "DialogPortal"), bd = "DialogOverlay", _M = /* @__PURE__ */ b.forwardRef(
  /* @__PURE__ */ Kt(function(t, o) {
    const i = ZS(bd, t.__scopeDialog), { forceMount: a = i.forceMount, ...f } = t, d = _n(bd, t.__scopeDialog);
    return d.modal ? /* @__PURE__ */ x.jsx(_f, { present: a || d.open, children: /* @__PURE__ */ x.jsx(kM, { ...f, ref: o }) }) : null;
  }, "DialogOverlay")
), TM = /* @__PURE__ */ Sf("DialogOverlay.RemoveScroll"), kM = /* @__PURE__ */ b.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Kt(function(t, o) {
    const { __scopeDialog: i, ...a } = t, f = _n(bd, i), d = CS(), p = ko(o, d);
    return (
      // Make sure `Content` is scrollable even when it doesn't live inside `RemoveScroll`
      // ie. when `Overlay` and `Content` are siblings
      /* @__PURE__ */ x.jsx(KS, { as: TM, allowPinchZoom: !0, shards: [f.contentRef], children: /* @__PURE__ */ x.jsx(
        Ao.div,
        {
          "data-state": bf(f.open),
          ...a,
          ref: p,
          style: { pointerEvents: "auto", ...a.style }
        }
      ) })
    );
  }, "DialogOverlayImpl")
), Ri = "DialogContent", AM = /* @__PURE__ */ b.forwardRef(
  /* @__PURE__ */ Kt(function(t, o) {
    const i = ZS(Ri, t.__scopeDialog), { forceMount: a = i.forceMount, ...f } = t, d = _n(Ri, t.__scopeDialog);
    return /* @__PURE__ */ x.jsx(_f, { present: a || d.open, children: d.modal ? /* @__PURE__ */ x.jsx(bM, { ...f, ref: o }) : /* @__PURE__ */ x.jsx(CM, { ...f, ref: o }) });
  }, "DialogContent")
), bM = /* @__PURE__ */ b.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Kt(function(t, o) {
    const i = _n(Ri, t.__scopeDialog), a = b.useRef(null), f = ko(o, i.contentRef, a);
    return b.useEffect(() => {
      const d = a.current;
      if (d) return yM(d);
    }, []), /* @__PURE__ */ x.jsx(
      JS,
      {
        ...t,
        ref: f,
        trapFocus: i.open,
        disableOutsidePointerEvents: i.open,
        onCloseAutoFocus: Cr(t.onCloseAutoFocus, (d) => {
          var p;
          d.preventDefault(), (p = i.triggerRef.current) == null || p.focus();
        }),
        onPointerDownOutside: Cr(t.onPointerDownOutside, (d) => {
          const p = d.detail.originalEvent, m = p.button === 0 && p.ctrlKey === !0;
          (p.button === 2 || m) && d.preventDefault();
        }),
        onFocusOutside: Cr(
          t.onFocusOutside,
          (d) => d.preventDefault()
        )
      }
    );
  }, "DialogContentModal")
), CM = /* @__PURE__ */ b.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Kt(function(t, o) {
    const i = _n(Ri, t.__scopeDialog), a = b.useRef(!1), f = b.useRef(!1);
    return /* @__PURE__ */ x.jsx(
      JS,
      {
        ...t,
        ref: o,
        trapFocus: !1,
        disableOutsidePointerEvents: !1,
        onCloseAutoFocus: (d) => {
          var p, m;
          (p = t.onCloseAutoFocus) == null || p.call(t, d), d.defaultPrevented || (a.current || (m = i.triggerRef.current) == null || m.focus(), d.preventDefault()), a.current = !1, f.current = !1;
        },
        onInteractOutside: (d) => {
          var y, S;
          (y = t.onInteractOutside) == null || y.call(t, d), d.defaultPrevented || (a.current = !0, d.detail.originalEvent.type === "pointerdown" && (f.current = !0));
          const p = d.target;
          ((S = i.triggerRef.current) == null ? void 0 : S.contains(p)) && d.preventDefault(), d.detail.originalEvent.type === "focusin" && f.current && d.preventDefault();
        }
      }
    );
  }, "DialogContentNonModal")
), JS = /* @__PURE__ */ b.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Kt(function(t, o) {
    const { __scopeDialog: i, trapFocus: a, onOpenAutoFocus: f, onCloseAutoFocus: d, ...p } = t, m = _n(Ri, i);
    return kf(), /* @__PURE__ */ x.jsx(x.Fragment, { children: /* @__PURE__ */ x.jsx(
      kE,
      {
        asChild: !0,
        loop: !0,
        trapped: a,
        onMountAutoFocus: f,
        onUnmountAutoFocus: d,
        children: /* @__PURE__ */ x.jsx(
          xE,
          {
            role: "dialog",
            id: m.contentId,
            "aria-describedby": m.descriptionPresent ? m.descriptionId : void 0,
            "aria-labelledby": m.titlePresent ? m.titleId : void 0,
            "data-state": bf(m.open),
            ...p,
            ref: o,
            deferPointerDownOutside: !0,
            onDismiss: () => m.onOpenChange(!1)
          }
        )
      }
    ) });
  }, "DialogContentImpl")
), PM = "DialogTitle", EM = /* @__PURE__ */ b.forwardRef(
  /* @__PURE__ */ Kt(function(t, o) {
    const { __scopeDialog: i, ...a } = t, f = _n(PM, i), { setTitleCount: d } = f;
    return Jn(() => (d((p) => p + 1), () => d((p) => p - 1)), [d]), /* @__PURE__ */ x.jsx(Ao.h2, { id: f.titleId, ...a, ref: o });
  }, "DialogTitle")
), MM = "DialogDescription", RM = /* @__PURE__ */ b.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Kt(function(t, o) {
    const { __scopeDialog: i, ...a } = t, f = _n(MM, i), { setDescriptionCount: d } = f;
    return Jn(() => (d((p) => p + 1), () => d((p) => p - 1)), [d]), /* @__PURE__ */ x.jsx(Ao.p, { id: f.descriptionId, ...a, ref: o });
  }, "DialogDescription")
);
function bf(e) {
  return e ? "open" : "closed";
}
Kt(bf, "getState");
function DM() {
  const e = K((a) => a.summaryRecord), t = K((a) => a.closeSummary), o = K((a) => a.startTimer), i = vn(e == null ? void 0 : e.selectedScene);
  return /* @__PURE__ */ x.jsx(SM, { open: !!e, onOpenChange: (a) => !a && t(), children: /* @__PURE__ */ x.jsx(qa, { children: e ? /* @__PURE__ */ x.jsxs(xM, { forceMount: !0, children: [
    /* @__PURE__ */ x.jsx(_M, { asChild: !0, children: /* @__PURE__ */ x.jsx(
      wn.div,
      {
        className: "summary-overlay",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
      }
    ) }),
    /* @__PURE__ */ x.jsx(AM, { asChild: !0, children: /* @__PURE__ */ x.jsxs(
      wn.article,
      {
        className: "summary-card liquid-glass",
        initial: { opacity: 0, y: 18, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 18, scale: 0.98 },
        children: [
          /* @__PURE__ */ x.jsx("span", { className: "focus-kicker", children: "Session complete" }),
          /* @__PURE__ */ x.jsx(EM, { children: "Focus block complete" }),
          /* @__PURE__ */ x.jsx(RM, { className: "sr-only", children: "Summary of the completed focus block." }),
          /* @__PURE__ */ x.jsx("p", { children: "You protected a focused block in your quiet study room." }),
          /* @__PURE__ */ x.jsxs("div", { className: "summary-grid", children: [
            /* @__PURE__ */ x.jsxs("div", { className: "summary-stat liquid-glass-lite", children: [
              /* @__PURE__ */ x.jsx("span", { children: "Focus time" }),
              /* @__PURE__ */ x.jsx("strong", { children: W0(e.totalFocusTime) })
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
              t(), o();
            }, children: "Continue studying" }),
            /* @__PURE__ */ x.jsx(Te, { onClick: t, children: "Done" })
          ] })
        ]
      }
    ) })
  ] }) : null }) });
}
function qS(e, [t, o]) {
  return Math.min(o, Math.max(t, e));
}
function mo(e, t, { checkForDefaultPrevented: o = !0 } = {}) {
  return function(a) {
    if (e == null || e(a), o === !1 || !a.defaultPrevented)
      return t == null ? void 0 : t(a);
  };
}
function jg(e, t) {
  if (typeof e == "function")
    return e(t);
  e != null && (e.current = t);
}
function NM(...e) {
  return (t) => {
    let o = !1;
    const i = e.map((a) => {
      const f = jg(a, t);
      return !o && typeof f == "function" && (o = !0), f;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const f = i[a];
          typeof f == "function" ? f() : jg(e[a], null);
        }
      };
  };
}
function qn(...e) {
  return b.useCallback(NM(...e), e);
}
function ew(e, t = []) {
  let o = [];
  function i(f, d) {
    const p = b.createContext(d);
    p.displayName = f + "Context";
    const m = o.length;
    o = [...o, d];
    const y = (l) => {
      var _;
      const { scope: c, children: g, ...w } = l, T = ((_ = c == null ? void 0 : c[e]) == null ? void 0 : _[m]) || p, A = b.useMemo(() => w, Object.values(w));
      return /* @__PURE__ */ x.jsx(T.Provider, { value: A, children: g });
    };
    y.displayName = f + "Provider";
    function S(l, c) {
      var T;
      const g = ((T = c == null ? void 0 : c[e]) == null ? void 0 : T[m]) || p, w = b.useContext(g);
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
  return a.scopeName = e, [i, jM(a, ...t)];
}
function jM(...e) {
  const t = e[0];
  if (e.length === 1) return t;
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
      return b.useMemo(() => ({ [`__scope${t.scopeName}`]: d }), [d]);
    };
  };
  return o.scopeName = t.scopeName, o;
}
var tw = globalThis != null && globalThis.document ? b.useLayoutEffect : () => {
}, IM = Rr[" useInsertionEffect ".trim().toString()] || tw;
function FM({
  prop: e,
  defaultProp: t,
  onChange: o = () => {
  },
  caller: i
}) {
  const [a, f, d] = OM({
    defaultProp: t,
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
        const c = LM(S) ? S(e) : S;
        c !== e && ((l = d.current) == null || l.call(d, c));
      } else
        f(S);
    },
    [p, e, f, d]
  );
  return [m, y];
}
function OM({
  defaultProp: e,
  onChange: t
}) {
  const [o, i] = b.useState(e), a = b.useRef(o), f = b.useRef(t);
  return IM(() => {
    f.current = t;
  }, [t]), b.useEffect(() => {
    var d;
    a.current !== o && ((d = f.current) == null || d.call(f, o), a.current = o);
  }, [o, a]), [o, i, f];
}
function LM(e) {
  return typeof e == "function";
}
var VM = b.createContext(void 0);
function zM(e) {
  const t = b.useContext(VM);
  return e || t || "ltr";
}
function BM(e) {
  const t = b.useRef({ value: e, previous: e });
  return b.useMemo(() => (t.current.value !== e && (t.current.previous = t.current.value, t.current.value = e), t.current.previous), [e]);
}
function $M(e) {
  const [t, o] = b.useState(void 0);
  return tw(() => {
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
  }, [e]), t;
}
// @__NO_SIDE_EFFECTS__
function Cd(e) {
  const t = b.forwardRef((o, i) => {
    let { children: a, ...f } = o, d = null, p = !1;
    const m = [];
    Ig(a) && typeof fa == "function" && (a = fa(a._payload)), b.Children.forEach(a, (c) => {
      var g;
      if (KM(c)) {
        p = !0;
        const w = c;
        let T = "child" in w.props ? w.props.child : w.props.children;
        Ig(T) && typeof fa == "function" && (T = fa(T._payload)), d = HM(w, T), m.push((g = d == null ? void 0 : d.props) == null ? void 0 : g.children);
      } else
        m.push(c);
    }), d ? d = b.cloneElement(d, void 0, m) : (
      // A `Slottable` was found but it didn't resolve to a single element (e.g.
      // it wrapped multiple elements, text, or a render-prop `child` that
      // wasn't an element). Don't fall back to treating the `Slottable` wrapper
      // itself as the slot target — throw a descriptive error below instead.
      !p && b.Children.count(a) === 1 && b.isValidElement(a) && (d = a)
    );
    const y = d ? GM(d) : void 0, S = qn(i, y);
    if (!d) {
      if (a || a === 0)
        throw new Error(
          p ? ZM(e) : QM(e)
        );
      return a;
    }
    const l = WM(f, d.props ?? {});
    return d.type !== b.Fragment && (l.ref = i ? S : y), b.cloneElement(d, l);
  });
  return t.displayName = `${e}.Slot`, t;
}
var UM = Symbol.for("radix.slottable"), HM = (e, t) => {
  if ("child" in e.props) {
    const o = e.props.child;
    return b.isValidElement(o) ? b.cloneElement(o, void 0, e.props.children(o.props.children)) : null;
  }
  return b.isValidElement(t) ? t : null;
};
function WM(e, t) {
  const o = { ...t };
  for (const i in t) {
    const a = e[i], f = t[i];
    /^on[A-Z]/.test(i) ? a && f ? o[i] = (...p) => {
      const m = f(...p);
      return a(...p), m;
    } : a && (o[i] = a) : i === "style" ? o[i] = { ...a, ...f } : i === "className" && (o[i] = [a, f].filter(Boolean).join(" "));
  }
  return { ...e, ...o };
}
function GM(e) {
  var i, a;
  let t = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = t && "isReactWarning" in t && t.isReactWarning;
  return o ? e.ref : (t = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = t && "isReactWarning" in t && t.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
function KM(e) {
  return b.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === UM;
}
var YM = Symbol.for("react.lazy");
function Ig(e) {
  return e != null && typeof e == "object" && "$$typeof" in e && e.$$typeof === YM && "_payload" in e && XM(e._payload);
}
function XM(e) {
  return typeof e == "object" && e !== null && "then" in e;
}
var QM = (e) => `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`, ZM = (e) => `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`, fa = Rr[" use ".trim().toString()], JM = [
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
], zi = JM.reduce((e, t) => {
  const o = /* @__PURE__ */ Cd(`Primitive.${t}`), i = b.forwardRef((a, f) => {
    const { asChild: d, ...p } = a, m = d ? o : t;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ x.jsx(m, { ...p, ref: f });
  });
  return i.displayName = `Primitive.${t}`, { ...e, [t]: i };
}, {});
function qM(e) {
  const t = e + "CollectionProvider", [o, i] = ew(t), [a, f] = o(
    t,
    { collectionRef: { current: null }, itemMap: /* @__PURE__ */ new Map() }
  ), d = (T) => {
    const { scope: A, children: _ } = T, C = b.useRef(null), E = b.useRef(/* @__PURE__ */ new Map()).current;
    return /* @__PURE__ */ x.jsx(a, { scope: A, itemMap: E, collectionRef: C, children: _ });
  };
  d.displayName = t;
  const p = e + "CollectionSlot", m = /* @__PURE__ */ Cd(p), y = b.forwardRef(
    (T, A) => {
      const { scope: _, children: C } = T, E = f(p, _), N = qn(A, E.collectionRef);
      return /* @__PURE__ */ x.jsx(m, { ref: N, children: C });
    }
  );
  y.displayName = p;
  const S = e + "CollectionItemSlot", l = "data-radix-collection-item", c = /* @__PURE__ */ Cd(S), g = b.forwardRef(
    (T, A) => {
      const { scope: _, children: C, ...E } = T, N = b.useRef(null), L = qn(A, N), W = f(S, _);
      return b.useEffect(() => (W.itemMap.set(N, { ref: N, ...E }), () => void W.itemMap.delete(N))), /* @__PURE__ */ x.jsx(c, { [l]: "", ref: L, children: C });
    }
  );
  g.displayName = S;
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
    { Provider: d, Slot: y, ItemSlot: g },
    w,
    i
  ];
}
var nw = ["PageUp", "PageDown"], rw = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"], ow = {
  "from-left": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-right": ["Home", "PageDown", "ArrowDown", "ArrowRight"],
  "from-bottom": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-top": ["Home", "PageDown", "ArrowUp", "ArrowLeft"]
}, bo = "Slider", [Pd, eR, tR] = qM(bo), [Cf] = ew(bo, [
  tR
]), [nR, Bi] = Cf(bo), Pf = b.forwardRef(
  (e, t) => {
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
      inverted: g = !1,
      form: w,
      ...T
    } = e, A = b.useRef(/* @__PURE__ */ new Set()), _ = b.useRef(0), C = b.useRef(!1), N = d === "horizontal" ? rR : oR, [L = [], W] = FM({
      prop: S,
      defaultProp: y,
      onChange: (J) => {
        var ue;
        (ue = [...A.current][_.current]) == null || ue.focus({
          preventScroll: !0,
          focusVisible: C.current
        }), C.current = !1, l(J);
      }
    }), H = b.useRef(L);
    function Y(J) {
      const ce = lR(L, J);
      ie(J, ce);
    }
    function V(J) {
      ie(J, _.current);
    }
    function Q() {
      const J = H.current[_.current];
      L[_.current] !== J && c(L);
    }
    function ie(J, ce, { commit: ue } = { commit: !1 }) {
      const ye = fR(f), me = pR(Math.round((J - i) / f) * f + i, ye), we = qS(me, [i, a]);
      W((O = []) => {
        const Z = sR(O, we, ce);
        if (dR(Z, m * f)) {
          _.current = Z.indexOf(we);
          const X = String(Z) !== String(O);
          return X && ue && c(Z), X ? Z : O;
        } else
          return O;
      });
    }
    return /* @__PURE__ */ x.jsx(
      nR,
      {
        scope: e.__scopeSlider,
        name: o,
        disabled: p,
        min: i,
        max: a,
        valueIndexToChangeRef: _,
        thumbs: A.current,
        values: L,
        orientation: d,
        form: w,
        children: /* @__PURE__ */ x.jsx(Pd.Provider, { scope: e.__scopeSlider, children: /* @__PURE__ */ x.jsx(Pd.Slot, { scope: e.__scopeSlider, children: /* @__PURE__ */ x.jsx(
          N,
          {
            "aria-disabled": p,
            "data-disabled": p ? "" : void 0,
            ...T,
            ref: t,
            onPointerDown: mo(T.onPointerDown, () => {
              p || (H.current = L, C.current = !1);
            }),
            min: i,
            max: a,
            inverted: g,
            onSlideStart: p ? void 0 : Y,
            onSlideMove: p ? void 0 : V,
            onSlideEnd: p ? void 0 : Q,
            onHomeKeyDown: () => {
              p || (C.current = !0, ie(i, 0, { commit: !0 }));
            },
            onEndKeyDown: () => {
              p || (C.current = !0, ie(a, L.length - 1, { commit: !0 }));
            },
            onStepKeyDown: ({ event: J, direction: ce }) => {
              if (!p) {
                C.current = !0;
                const me = nw.includes(J.key) || J.shiftKey && rw.includes(J.key) ? 10 : 1, we = _.current, O = L[we], Z = f * me * ce;
                ie(O + Z, we, { commit: !0 });
              }
            }
          }
        ) }) })
      }
    );
  }
);
Pf.displayName = bo;
var [iw, sw] = Cf(bo, {
  startEdge: "left",
  endEdge: "right",
  size: "width",
  direction: 1
}), rR = b.forwardRef(
  (e, t) => {
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
    } = e, [l, c] = b.useState(null), g = qn(t, (E) => c(E)), w = b.useRef(void 0), T = zM(a), A = T === "ltr", _ = A && !f || !A && f;
    function C(E) {
      const N = w.current || l.getBoundingClientRect(), L = [0, N.width], H = Df(L, _ ? [o, i] : [i, o]);
      return w.current = N, H(E - N.left);
    }
    return /* @__PURE__ */ x.jsx(
      iw,
      {
        scope: e.__scopeSlider,
        startEdge: _ ? "left" : "right",
        endEdge: _ ? "right" : "left",
        direction: _ ? 1 : -1,
        size: "width",
        children: /* @__PURE__ */ x.jsx(
          aw,
          {
            dir: T,
            "data-orientation": "horizontal",
            ...S,
            ref: g,
            style: {
              ...S.style,
              "--radix-slider-thumb-transform": "translateX(-50%)"
            },
            onSlideStart: (E) => {
              const N = C(E.clientX);
              d == null || d(N);
            },
            onSlideMove: (E) => {
              const N = C(E.clientX);
              p == null || p(N);
            },
            onSlideEnd: () => {
              w.current = void 0, m == null || m();
            },
            onStepKeyDown: (E) => {
              const L = ow[_ ? "from-left" : "from-right"].includes(E.key);
              y == null || y({ event: E, direction: L ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), oR = b.forwardRef(
  (e, t) => {
    const {
      min: o,
      max: i,
      inverted: a,
      onSlideStart: f,
      onSlideMove: d,
      onSlideEnd: p,
      onStepKeyDown: m,
      ...y
    } = e, S = b.useRef(null), l = qn(t, S), c = b.useRef(void 0), g = !a;
    function w(T) {
      const A = c.current || S.current.getBoundingClientRect(), _ = [0, A.height], E = Df(_, g ? [i, o] : [o, i]);
      return c.current = A, E(T - A.top);
    }
    return /* @__PURE__ */ x.jsx(
      iw,
      {
        scope: e.__scopeSlider,
        startEdge: g ? "bottom" : "top",
        endEdge: g ? "top" : "bottom",
        size: "height",
        direction: g ? 1 : -1,
        children: /* @__PURE__ */ x.jsx(
          aw,
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
              const _ = ow[g ? "from-bottom" : "from-top"].includes(T.key);
              m == null || m({ event: T, direction: _ ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), aw = b.forwardRef(
  (e, t) => {
    const {
      __scopeSlider: o,
      onSlideStart: i,
      onSlideMove: a,
      onSlideEnd: f,
      onHomeKeyDown: d,
      onEndKeyDown: p,
      onStepKeyDown: m,
      ...y
    } = e, S = Bi(bo, o);
    return /* @__PURE__ */ x.jsx(
      zi.span,
      {
        ...y,
        ref: t,
        onKeyDown: mo(e.onKeyDown, (l) => {
          l.key === "Home" ? (d(l), l.preventDefault()) : l.key === "End" ? (p(l), l.preventDefault()) : nw.concat(rw).includes(l.key) && (m(l), l.preventDefault());
        }),
        onPointerDown: mo(e.onPointerDown, (l) => {
          const c = l.target;
          c.setPointerCapture(l.pointerId), l.preventDefault(), S.thumbs.has(c) ? c.focus({ preventScroll: !0, focusVisible: !1 }) : i(l);
        }),
        onPointerMove: mo(e.onPointerMove, (l) => {
          l.target.hasPointerCapture(l.pointerId) && a(l);
        }),
        onPointerUp: mo(e.onPointerUp, (l) => {
          const c = l.target;
          c.hasPointerCapture(l.pointerId) && (c.releasePointerCapture(l.pointerId), f(l));
        })
      }
    );
  }
), lw = "SliderTrack", Ef = b.forwardRef(
  (e, t) => {
    const { __scopeSlider: o, ...i } = e, a = Bi(lw, o);
    return /* @__PURE__ */ x.jsx(
      zi.span,
      {
        "data-disabled": a.disabled ? "" : void 0,
        "data-orientation": a.orientation,
        ...i,
        ref: t
      }
    );
  }
);
Ef.displayName = lw;
var Ed = "SliderRange", Mf = b.forwardRef(
  (e, t) => {
    const { __scopeSlider: o, ...i } = e, a = Bi(Ed, o), f = sw(Ed, o), d = b.useRef(null), p = qn(t, d), m = a.values.length, y = a.values.map(
      (c) => yw(c, a.min, a.max)
    ), S = m > 1 ? Math.min(...y) : 0, l = 100 - Math.max(...y);
    return /* @__PURE__ */ x.jsx(
      zi.span,
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
Mf.displayName = Ed;
var uw = "SliderThumb", [iR, cw] = Cf(uw), dw = "SliderThumbProvider";
function fw(e) {
  const {
    __scopeSlider: t,
    name: o,
    children: i,
    // @ts-expect-error internal render prop
    internal_do_not_use_render: a
  } = e, f = Bi(dw, t), d = eR(t), [p, m] = b.useState(null), y = b.useMemo(
    () => p ? d().findIndex((A) => A.ref.current === p) : -1,
    [d, p]
  ), S = $M(p), l = p ? !!f.form || !!p.closest("form") : !0, c = f.values[y], g = o ?? (f.name ? f.name + (f.values.length > 1 ? "[]" : "") : void 0), w = c === void 0 ? 0 : yw(c, f.min, f.max);
  b.useEffect(() => {
    if (p)
      return f.thumbs.add(p), () => {
        f.thumbs.delete(p);
      };
  }, [p, f.thumbs]);
  const T = {
    value: c,
    name: g,
    form: f.form,
    isFormControl: l,
    index: y,
    thumb: p,
    onThumbChange: m,
    percent: w,
    size: S
  };
  return /* @__PURE__ */ x.jsx(iR, { scope: t, ...T, children: mR(a) ? a(T) : i });
}
fw.displayName = dw;
var Ca = "SliderThumbTrigger", pw = b.forwardRef(
  (e, t) => {
    const { __scopeSlider: o, ...i } = e, a = Bi(Ca, o), f = sw(Ca, o), { index: d, value: p, percent: m, size: y, onThumbChange: S } = cw(
      Ca,
      o
    ), l = qn(t, (T) => S(T)), c = aR(d, a.values.length), g = y == null ? void 0 : y[f.size], w = g ? uR(g, m, f.direction) : 0;
    return /* @__PURE__ */ x.jsx(
      "span",
      {
        style: {
          transform: "var(--radix-slider-thumb-transform)",
          position: "absolute",
          [f.startEdge]: `calc(${m}% + ${w}px)`
        },
        children: /* @__PURE__ */ x.jsx(Pd.ItemSlot, { scope: o, children: /* @__PURE__ */ x.jsx(
          zi.span,
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
            onFocus: mo(e.onFocus, () => {
              a.valueIndexToChangeRef.current = d;
            })
          }
        ) })
      }
    );
  }
);
pw.displayName = Ca;
var Rf = b.forwardRef(
  (e, t) => {
    const { __scopeSlider: o, name: i, ...a } = e;
    return /* @__PURE__ */ x.jsx(
      fw,
      {
        __scopeSlider: o,
        name: i,
        internal_do_not_use_render: ({ index: f, isFormControl: d }) => /* @__PURE__ */ x.jsxs(x.Fragment, { children: [
          /* @__PURE__ */ x.jsx(
            pw,
            {
              ...a,
              ref: t,
              __scopeSlider: o
            }
          ),
          d ? /* @__PURE__ */ x.jsx(
            hw,
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
Rf.displayName = uw;
var mw = "SliderBubbleInput", hw = b.forwardRef(
  ({ __scopeSlider: e, ...t }, o) => {
    const { value: i, name: a, form: f } = cw(mw, e), d = b.useRef(null), p = qn(d, o), m = BM(i);
    return b.useEffect(() => {
      const y = d.current;
      if (!y) return;
      const S = window.HTMLInputElement.prototype, c = Object.getOwnPropertyDescriptor(S, "value").set;
      if (m !== i && c) {
        const g = new Event("input", { bubbles: !0 });
        c.call(y, i), y.dispatchEvent(g);
      }
    }, [m, i]), /* @__PURE__ */ x.jsx(
      zi.input,
      {
        style: { display: "none" },
        name: a,
        form: f,
        ...t,
        ref: p,
        defaultValue: i
      }
    );
  }
);
hw.displayName = mw;
function sR(e = [], t, o) {
  const i = [...e];
  return i[o] = t, i.sort((a, f) => a - f);
}
function yw(e, t, o) {
  const f = 100 / (o - t) * (e - t);
  return qS(f, [0, 100]);
}
function aR(e, t) {
  return t > 2 ? `Value ${e + 1} of ${t}` : t === 2 ? ["Minimum", "Maximum"][e] : void 0;
}
function lR(e, t) {
  if (e.length === 1) return 0;
  const o = e.map((a) => Math.abs(a - t)), i = Math.min(...o);
  return o.indexOf(i);
}
function uR(e, t, o) {
  const i = e / 2, f = Df([0, 50], [0, i]);
  return (i - f(t) * o) * o;
}
function cR(e) {
  return e.slice(0, -1).map((t, o) => e[o + 1] - t);
}
function dR(e, t) {
  if (t > 0) {
    const o = cR(e);
    return Math.min(...o) >= t;
  }
  return !0;
}
function Df(e, t) {
  return (o) => {
    if (e[0] === e[1] || t[0] === t[1]) return t[0];
    const i = (t[1] - t[0]) / (e[1] - e[0]);
    return t[0] + i * (o - e[0]);
  };
}
function fR(e) {
  if (!Number.isFinite(e)) return 0;
  const t = e.toString();
  if (t.includes("e")) {
    const [i, a] = t.split("e"), f = i.split(".")[1] || "", d = Number(a);
    return Math.max(0, f.length - d);
  }
  const o = t.split(".")[1];
  return o ? o.length : 0;
}
function pR(e, t) {
  const o = Math.pow(10, t);
  return Math.round(e * o) / o;
}
function mR(e) {
  return typeof e == "function";
}
function Fg({ label: e, icon: t, value: o, onChange: i }) {
  return /* @__PURE__ */ x.jsxs("label", { className: "sound-slider", children: [
    /* @__PURE__ */ x.jsxs("span", { className: "sound-slider-head", children: [
      /* @__PURE__ */ x.jsxs("span", { className: "sound-slider-label", children: [
        t,
        /* @__PURE__ */ x.jsx("span", { children: e })
      ] }),
      /* @__PURE__ */ x.jsxs("strong", { children: [
        o,
        "%"
      ] })
    ] }),
    /* @__PURE__ */ x.jsxs(
      Pf,
      {
        className: "radix-slider-root",
        style: { "--slider-progress": `${o}%` },
        value: [o],
        min: 0,
        max: 100,
        step: 1,
        onValueChange: (a) => i(a[0]),
        children: [
          /* @__PURE__ */ x.jsx(Ef, { className: "radix-slider-track", children: /* @__PURE__ */ x.jsx(Mf, { className: "radix-slider-range" }) }),
          /* @__PURE__ */ x.jsx(Rf, { className: "radix-slider-thumb", "aria-label": e })
        ]
      }
    )
  ] });
}
function hR({ audioState: e }) {
  const t = K((c) => c.musicType), o = K((c) => c.ambientSound), i = K((c) => c.musicVolume), a = K((c) => c.ambientVolume), f = K((c) => c.audioPlaying), d = K((c) => c.setSound), p = K((c) => c.applyAudioPreset), m = K((c) => c.toggleAudio), y = tl({ musicType: t, ambientSound: o }), S = tC({ musicType: t, ambientSound: o }), l = y.ambientLayers.map((c) => c.title).filter(Boolean).join(" + ");
  return /* @__PURE__ */ x.jsxs("div", { className: "sound-panel", children: [
    /* @__PURE__ */ x.jsx("div", { className: "sound-preset-list", "aria-label": "Focus audio presets", children: _i.map((c) => /* @__PURE__ */ x.jsxs(
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
      /* @__PURE__ */ x.jsx("select", { value: t, onChange: (c) => d("musicType", c.target.value), children: Yn.map((c) => /* @__PURE__ */ x.jsx("option", { value: c.label, children: c.label }, c.label)) })
    ] }),
    /* @__PURE__ */ x.jsx(
      Fg,
      {
        label: "Music volume",
        icon: /* @__PURE__ */ x.jsx(ol, { size: 16, "aria-hidden": "true" }),
        value: i,
        onChange: (c) => d("musicVolume", c)
      }
    ),
    /* @__PURE__ */ x.jsxs("label", { className: "focus-field", children: [
      "Ambient sound selector",
      /* @__PURE__ */ x.jsx("select", { value: o, onChange: (c) => d("ambientSound", c.target.value), children: Xn.map((c) => /* @__PURE__ */ x.jsx("option", { value: c.label, children: c.label }, c.label)) })
    ] }),
    /* @__PURE__ */ x.jsx(
      Fg,
      {
        label: "Ambient volume",
        icon: /* @__PURE__ */ x.jsx(pf, { size: 16, "aria-hidden": "true" }),
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
const yR = [
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
], gR = [
  ["white-noise", "White noise"],
  ["pink-noise", "Pink noise"],
  ["brown-noise", "Brown noise"]
], vR = [
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
function pa({ id: e, label: t, value: o, icon: i = null, onChange: a, card: f = !1 }) {
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
        /* @__PURE__ */ x.jsx("span", { children: t })
      ] }),
      /* @__PURE__ */ x.jsxs("strong", { children: [
        d,
        "%"
      ] })
    ] }),
    /* @__PURE__ */ x.jsxs(
      Pf,
      {
        className: "radix-slider-root",
        value: [d],
        min: 0,
        max: 100,
        step: 1,
        onValueChange: (m) => a(e, m[0]),
        children: [
          /* @__PURE__ */ x.jsx(Ef, { className: "radix-slider-track", children: /* @__PURE__ */ x.jsx(Mf, { className: "radix-slider-range" }) }),
          /* @__PURE__ */ x.jsx(Rf, { className: "radix-slider-thumb", "aria-label": `${t} volume` })
        ]
      }
    )
  ] });
}
function SR({ audioState: e, scene: t, onClose: o }) {
  const i = K((_) => _.audioChannels), a = K((_) => _.setSound), f = K((_) => _.returnToSetup), d = K((_) => _.musicType), p = K((_) => _.ambientSound), m = K((_) => _.musicVolume), y = K((_) => _.ambientVolume), [S, l] = b.useState(!1), c = (_, C) => {
    l(!1), a(`audioChannel:${_}`, C);
  }, g = (_, C) => a("musicVolume", C), w = (_, C) => a("ambientVolume", C), T = () => {
    const _ = Yn[Math.floor(Math.random() * Yn.length)], C = Xn[Math.floor(Math.random() * Xn.length)];
    a("musicType", _.label), a("ambientSound", C.label), l(!1);
  }, A = () => {
    a("musicType", (t == null ? void 0 : t.musicType) || "Deep Focus"), a("ambientSound", (t == null ? void 0 : t.ambientSound) || "Nature"), l(!0);
  };
  return /* @__PURE__ */ x.jsxs(
    wn.aside,
    {
      className: "focus-utility-panel room-control-panel liquid-glass",
      initial: { opacity: 0, y: 18 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 14 },
      transition: Ba,
      role: "dialog",
      "aria-label": "Room settings",
      children: [
        /* @__PURE__ */ x.jsxs("header", { className: "room-control-head", children: [
          /* @__PURE__ */ x.jsxs("div", { children: [
            /* @__PURE__ */ x.jsx("span", { className: "control-eyebrow", children: "Control" }),
            /* @__PURE__ */ x.jsx("h2", { children: "Room settings" })
          ] }),
          /* @__PURE__ */ x.jsx(Te, { className: "room-control-close", "aria-label": "Close room settings", onClick: o, children: /* @__PURE__ */ x.jsx(oS, { size: 16, "aria-hidden": "true" }) })
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
        /* @__PURE__ */ x.jsx("section", { className: "room-control-topics", "aria-label": "Focus topics", children: /* @__PURE__ */ x.jsx(aS, {}) }),
        /* @__PURE__ */ x.jsxs("div", { className: "room-control-grid", children: [
          /* @__PURE__ */ x.jsxs("section", { className: "room-control-col room-control-scenes", "aria-label": "Scenes", children: [
            /* @__PURE__ */ x.jsx("h3", { className: "room-control-section-title", children: "Scenes" }),
            /* @__PURE__ */ x.jsx(hf, {})
          ] }),
          /* @__PURE__ */ x.jsxs("section", { className: "room-control-col room-control-audio", children: [
            /* @__PURE__ */ x.jsxs("div", { className: "room-control-masters", children: [
              /* @__PURE__ */ x.jsxs("div", { className: "room-control-block", children: [
                /* @__PURE__ */ x.jsxs("div", { className: "room-control-block-head", children: [
                  /* @__PURE__ */ x.jsx("h3", { className: "room-control-section-title", children: "Music" }),
                  /* @__PURE__ */ x.jsx(Te, { className: "room-control-icon-btn", "aria-label": "Shuffle to a random track", onClick: T, children: /* @__PURE__ */ x.jsx(dP, { size: 15, "aria-hidden": "true" }) })
                ] }),
                /* @__PURE__ */ x.jsxs("label", { className: "room-select-field", children: [
                  /* @__PURE__ */ x.jsx("span", { className: "sr-only", children: "Music track" }),
                  /* @__PURE__ */ x.jsx("select", { value: d, onChange: (_) => {
                    l(!1), a("musicType", _.target.value);
                  }, children: Yn.map((_) => /* @__PURE__ */ x.jsx("option", { value: _.label, children: _.label }, _.label)) })
                ] }),
                /* @__PURE__ */ x.jsx(pa, { id: "music-volume", label: "Music volume", icon: /* @__PURE__ */ x.jsx(ol, { size: 15, "aria-hidden": "true" }), value: m, onChange: g })
              ] }),
              /* @__PURE__ */ x.jsxs("div", { className: "room-control-block", children: [
                /* @__PURE__ */ x.jsxs("div", { className: "room-control-block-head", children: [
                  /* @__PURE__ */ x.jsx("h3", { className: "room-control-section-title", children: "Scene sound" }),
                  /* @__PURE__ */ x.jsx(Te, { className: "room-control-icon-btn", "aria-label": S ? "Mix saved" : "Save current mix", onClick: () => l(!0), children: S ? /* @__PURE__ */ x.jsx(rl, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ x.jsx(tS, { size: 15, "aria-hidden": "true" }) })
                ] }),
                /* @__PURE__ */ x.jsxs("p", { className: "room-scene-recommend", children: [
                  "Recommended for ",
                  /* @__PURE__ */ x.jsx("strong", { children: t == null ? void 0 : t.name }),
                  /* @__PURE__ */ x.jsxs("span", { children: [
                    t == null ? void 0 : t.musicType,
                    " · ",
                    t == null ? void 0 : t.ambientSound
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
                  }, children: Xn.map((_) => /* @__PURE__ */ x.jsx("option", { value: _.label, children: _.label }, _.label)) })
                ] }),
                /* @__PURE__ */ x.jsx(pa, { id: "ambient-volume", label: "Ambient volume", icon: /* @__PURE__ */ x.jsx(pf, { size: 15, "aria-hidden": "true" }), value: y, onChange: w })
              ] })
            ] }),
            /* @__PURE__ */ x.jsxs("div", { className: "room-control-block", children: [
              /* @__PURE__ */ x.jsx("h3", { className: "room-control-section-title", children: "Focus noise" }),
              /* @__PURE__ */ x.jsx("div", { className: "room-noise-row", children: gR.map(([_, C]) => /* @__PURE__ */ x.jsx(pa, { id: _, label: C, value: i == null ? void 0 : i[_], onChange: c, card: !0 }, _)) })
            ] }),
            /* @__PURE__ */ x.jsxs("div", { className: "room-control-block", children: [
              /* @__PURE__ */ x.jsx("h3", { className: "room-control-section-title", children: "Ambient atmosphere" }),
              /* @__PURE__ */ x.jsx("div", { className: "room-ambient-grid", children: vR.map(([_, C]) => /* @__PURE__ */ x.jsx(pa, { id: _, label: C, value: i == null ? void 0 : i[_], onChange: c, card: !0 }, _)) })
            ] }),
            e != null && e.error ? /* @__PURE__ */ x.jsx("p", { className: "audio-error", children: e.error }) : null
          ] })
        ] })
      ]
    }
  );
}
function ma({ title: e, kicker: t, icon: o, children: i, onClose: a, className: f = "" }) {
  return /* @__PURE__ */ x.jsxs(wn.aside, { className: `focus-utility-panel liquid-glass ${f}`.trim(), initial: { opacity: 0, y: 12, x: -18 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: 10, x: -18 }, transition: Ba, role: "dialog", "aria-label": e, children: [
    /* @__PURE__ */ x.jsxs("div", { className: "drawer-head", children: [
      /* @__PURE__ */ x.jsxs("div", { className: "utility-title", children: [
        /* @__PURE__ */ x.jsx("span", { className: "utility-title-icon", children: o }),
        /* @__PURE__ */ x.jsxs("div", { children: [
          /* @__PURE__ */ x.jsx("span", { className: "focus-kicker", children: t }),
          /* @__PURE__ */ x.jsx("h2", { children: e })
        ] })
      ] }),
      /* @__PURE__ */ x.jsx(Te, { "aria-label": `Close ${e}`, onClick: a, children: /* @__PURE__ */ x.jsx(oS, { size: 16, "aria-hidden": "true" }) })
    ] }),
    /* @__PURE__ */ x.jsx("div", { className: "utility-panel-body", children: i })
  ] });
}
function wR({ audioState: e, scene: t }) {
  const o = K((y) => y.audioChannels), i = K((y) => y.setSound), [a, f] = b.useState(!1), d = (y, S) => {
    f(!1), i(`audioChannel:${y}`, S);
  }, p = () => {
    const y = Yn[Math.floor(Math.random() * Yn.length)], S = Xn[Math.floor(Math.random() * Xn.length)];
    i("musicType", y.label), i("ambientSound", S.label), f(!0);
  }, m = () => {
    i("musicType", (t == null ? void 0 : t.musicType) || "Deep Focus"), i("ambientSound", (t == null ? void 0 : t.ambientSound) || "Nature"), f(!0);
  };
  return /* @__PURE__ */ x.jsxs("div", { className: "sound-mixer", children: [
    /* @__PURE__ */ x.jsxs("div", { className: "mixer-featured-row", children: [
      /* @__PURE__ */ x.jsx("span", { className: "focus-kicker", children: "Music library" }),
      /* @__PURE__ */ x.jsxs(Te, { onClick: p, children: [
        /* @__PURE__ */ x.jsx(UC, { size: 14, "aria-hidden": "true" }),
        " Random track"
      ] })
    ] }),
    /* @__PURE__ */ x.jsx(hR, { audioState: e, compact: !0 }),
    /* @__PURE__ */ x.jsxs("div", { className: "mixer-preset-row", children: [
      /* @__PURE__ */ x.jsxs("button", { type: "button", className: "mixer-preset-button", onClick: m, children: [
        "Apply scene mix ",
        /* @__PURE__ */ x.jsx("span", { children: "↗" })
      ] }),
      /* @__PURE__ */ x.jsxs(Te, { onClick: () => f(!0), children: [
        a ? /* @__PURE__ */ x.jsx(rl, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ x.jsx(tS, { size: 14, "aria-hidden": "true" }),
        " ",
        a ? "Saved" : "Save current mix"
      ] })
    ] }),
    /* @__PURE__ */ x.jsx("div", { className: "mixer-channel-grid", children: yR.map(([y, S]) => /* @__PURE__ */ x.jsxs("label", { className: "mixer-channel", children: [
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
function xR() {
  const e = () => {
    var i, a, f;
    return ((f = (a = (i = globalThis.window) == null ? void 0 : i.SynapseAuth) == null ? void 0 : a.getStoredSession) == null ? void 0 : f.call(a)) || null;
  }, [t, o] = b.useState(e);
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
  }, []), t;
}
function _R({ onWorkspace: e, session: t }) {
  return !!t ? /* @__PURE__ */ x.jsxs("div", { className: "utility-empty-state", children: [
    /* @__PURE__ */ x.jsx(Wa, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ x.jsx("h3", { children: "Your Focus Trail" }),
    /* @__PURE__ */ x.jsx("p", { children: "Recent sessions and progress remain available through Synapse history." }),
    /* @__PURE__ */ x.jsx(Te, { variant: "primary", onClick: () => e == null ? void 0 : e("", "history"), children: "Open session history" })
  ] }) : /* @__PURE__ */ x.jsxs("div", { className: "utility-login-state", children: [
    /* @__PURE__ */ x.jsx(Wa, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ x.jsx("span", { className: "focus-kicker", children: "Your rhythm, remembered" }),
    /* @__PURE__ */ x.jsx("h3", { children: "Sign in to view your Focus Trail" }),
    /* @__PURE__ */ x.jsx("p", { children: "Track deep-work time, completed goals, and your study streak across devices." }),
    /* @__PURE__ */ x.jsx(Te, { variant: "primary", onClick: () => e == null ? void 0 : e(), children: "Sign in with Synapse" }),
    /* @__PURE__ */ x.jsx("small", { children: "Your current session continues without an account." })
  ] });
}
function TR({ onWorkspace: e, session: t }) {
  return !!t ? /* @__PURE__ */ x.jsxs("div", { className: "utility-empty-state", children: [
    /* @__PURE__ */ x.jsx(Ga, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ x.jsx("h3", { children: "Companion Room" }),
    /* @__PURE__ */ x.jsx("p", { children: "Invite a study partner from your Synapse workspace to share this quiet room." }),
    /* @__PURE__ */ x.jsx(Te, { variant: "primary", onClick: () => e == null ? void 0 : e("", "companion"), children: "Open Companion Room" })
  ] }) : /* @__PURE__ */ x.jsxs("div", { className: "utility-login-state", children: [
    /* @__PURE__ */ x.jsx(Ga, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ x.jsx("span", { className: "focus-kicker", children: "Study alongside someone" }),
    /* @__PURE__ */ x.jsx("h3", { children: "Sign in to use Companion Room" }),
    /* @__PURE__ */ x.jsx("p", { children: "Keep your own goal private while sharing the feeling of showing up together." }),
    /* @__PURE__ */ x.jsx(Te, { variant: "primary", onClick: () => e == null ? void 0 : e(), children: "Go to sign in" }),
    /* @__PURE__ */ x.jsx("small", { children: "No companion data is created in Focus Room." })
  ] });
}
function kR({ audioState: e, utilityPanel: t, onClose: o, onWorkspace: i }) {
  const a = K((y) => y.activeDrawer), f = K((y) => y.closeDrawer), d = K((y) => y.selectedScene), p = xR(), m = b.useMemo(() => Zn.find((y) => y.id === d) || Zn[0], [d]);
  return /* @__PURE__ */ x.jsxs(qa, { children: [
    t === "trail" ? /* @__PURE__ */ x.jsx(ma, { title: "Focus Trail", kicker: "Your progress", icon: /* @__PURE__ */ x.jsx(Wa, { size: 16 }), onClose: o, children: /* @__PURE__ */ x.jsx(_R, { onWorkspace: i, session: p }) }) : null,
    t === "companion" ? /* @__PURE__ */ x.jsx(ma, { title: "Companion Room", kicker: "Shared focus", icon: /* @__PURE__ */ x.jsx(Ga, { size: 16 }), onClose: o, children: /* @__PURE__ */ x.jsx(TR, { onWorkspace: i, session: p }) }) : null,
    t === "settings" ? /* @__PURE__ */ x.jsx(SR, { audioState: e, scene: m, onClose: o }) : null,
    !t && a === "scene" ? /* @__PURE__ */ x.jsx(ma, { title: "Choose scene", kicker: "Scene", icon: /* @__PURE__ */ x.jsx(nS, { size: 16 }), onClose: f, children: /* @__PURE__ */ x.jsx(hf, {}) }) : null,
    !t && a === "music" ? /* @__PURE__ */ x.jsx(ma, { title: "Sound atmosphere", kicker: "Room audio", icon: /* @__PURE__ */ x.jsx(ol, { size: 16 }), onClose: f, children: /* @__PURE__ */ x.jsx(wR, { audioState: e, scene: m }) }) : null
  ] });
}
const AR = 2800;
function bR(e = "idle") {
  return e === "studying" ? { action: "pause", label: "Pause timer" } : e === "paused" ? { action: "start", label: "Resume timer" } : { action: "start", label: "Start timer" };
}
function CR({ pointerWithin: e = !1, focusWithin: t = !1 } = {}) {
  return !e && !t;
}
function PR(e, t) {
  return t ? Math.min(100, Math.max(0, e / t * 100)) : 0;
}
function ER({ onExit: e }) {
  const t = K((V) => V.elapsedSeconds), o = K((V) => V.pomodoroDuration), i = K((V) => V.pomodoroDurationSeconds), a = K((V) => V.timerMode), f = K((V) => V.timerStatus), d = K((V) => V.currentSession), p = K((V) => V.startTimer), m = K((V) => V.pauseTimer), y = K((V) => V.resetTimer), S = K((V) => V.skipTimer), [l, c] = b.useState(!1), g = b.useRef(null), w = b.useRef(!1), T = b.useRef(!1), A = b.useRef("pointer"), _ = Number(i) || (Number(o) || 0) * 60, C = a === "countup" ? t : Math.max(0, _ - t), E = bR(f), N = f === "paused" ? "Paused" : f === "completed" ? "Complete" : f === "studying" ? "In focus" : "Ready", L = b.useCallback(() => {
    g.current && (globalThis.clearTimeout(g.current), g.current = null);
  }, []), W = b.useCallback(() => {
    L(), g.current = globalThis.setTimeout(() => {
      CR({
        pointerWithin: w.current,
        focusWithin: T.current
      }) && c(!1);
    }, AR);
  }, [L]), H = b.useCallback(() => {
    c(!0), W();
  }, [W]);
  b.useEffect(() => {
    var ie, J, ce;
    const V = () => {
      A.current = "pointer", T.current = !1, H();
    }, Q = () => {
      A.current = "keyboard", H();
    };
    return (ie = globalThis.addEventListener) == null || ie.call(globalThis, "pointermove", V, { passive: !0 }), (J = globalThis.addEventListener) == null || J.call(globalThis, "pointerdown", V, { passive: !0 }), (ce = globalThis.addEventListener) == null || ce.call(globalThis, "keydown", Q), () => {
      var ue, ye, me;
      L(), (ue = globalThis.removeEventListener) == null || ue.call(globalThis, "pointermove", V), (ye = globalThis.removeEventListener) == null || ye.call(globalThis, "pointerdown", V), (me = globalThis.removeEventListener) == null || me.call(globalThis, "keydown", Q);
    };
  }, [L, H]);
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
      onBlurCapture: (V) => {
        T.current = !!V.currentTarget.contains(V.relatedTarget), W();
      },
      children: [
        /* @__PURE__ */ x.jsxs("div", { className: "compact-focus-card-top", children: [
          /* @__PURE__ */ x.jsxs("span", { children: [
            "POMODORO #",
            (d == null ? void 0 : d.pomodoroNumber) || 1
          ] }),
          /* @__PURE__ */ x.jsx(Te, { className: "compact-exit-button", onClick: e, "aria-label": "Exit Focus Mode", children: /* @__PURE__ */ x.jsx(QC, { size: 14, "aria-hidden": "true" }) })
        ] }),
        /* @__PURE__ */ x.jsxs("span", { className: "compact-focus-status", children: [
          /* @__PURE__ */ x.jsx("i", {}),
          N
        ] }),
        /* @__PURE__ */ x.jsx("strong", { "aria-live": "off", children: ud(C) }),
        /* @__PURE__ */ x.jsx("div", { className: "compact-focus-progress", "aria-hidden": "true", children: /* @__PURE__ */ x.jsx("span", { style: { width: `${PR(t, _)}%` } }) }),
        /* @__PURE__ */ x.jsxs("small", { children: [
          gf(_),
          " session"
        ] }),
        /* @__PURE__ */ x.jsxs("div", { className: "compact-timer-controls", "aria-hidden": !l, inert: l ? void 0 : "", children: [
          /* @__PURE__ */ x.jsx(Te, { className: "compact-timer-control compact-timer-control-primary", variant: "primary", onClick: Y, "aria-label": E.label, title: E.label, children: E.action === "pause" ? /* @__PURE__ */ x.jsx(fd, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ x.jsx(q0, { size: 15, fill: "currentColor", "aria-hidden": "true" }) }),
          /* @__PURE__ */ x.jsx(Te, { className: "compact-timer-control", onClick: y, "aria-label": "Reset timer", title: "Reset timer", children: /* @__PURE__ */ x.jsx(eS, { size: 15, "aria-hidden": "true" }) }),
          /* @__PURE__ */ x.jsx(Te, { className: "compact-timer-control", onClick: S, "aria-label": "Skip timer", title: "Skip timer", children: /* @__PURE__ */ x.jsx(rS, { size: 15, "aria-hidden": "true" }) })
        ] }),
        /* @__PURE__ */ x.jsx("span", { className: "sr-only", children: "Move the pointer, tap, or use the keyboard to reveal timer controls. Press Escape to exit Focus Mode." })
      ]
    }
  );
}
var Mc = {};
/*!
 *  howler.js v2.2.4
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */
var Og;
function MR() {
  return Og || (Og = 1, (function(e) {
    (function() {
      var t = function() {
        this.init();
      };
      t.prototype = {
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
                for (var w = c._howls[g]._getSoundIds(), T = 0; T < w.length; T++) {
                  var A = c._howls[g]._soundById(w[T]);
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
              for (var w = c._howls[g]._getSoundIds(), T = 0; T < w.length; T++) {
                var A = c._howls[g]._soundById(w[T]);
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
          var g = c.canPlayType("audio/mpeg;").replace(/^no$/, ""), w = l._navigator ? l._navigator.userAgent : "", T = w.match(/OPR\/(\d+)/g), A = T && parseInt(T[0].split("/")[1], 10) < 33, _ = w.indexOf("Safari") !== -1 && w.indexOf("Chrome") === -1, C = w.match(/Version\/(.*?) /), E = _ && C && parseInt(C[1], 10) < 15;
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
                for (var N = 0; N < l._howls.length; N++)
                  l._howls[N]._emit("unlock");
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
      var o = new t(), i = function(l) {
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
            var w, T;
            if (l._format && l._format[g])
              w = l._format[g];
            else {
              if (T = l._src[g], typeof T != "string") {
                l._emit("loaderror", null, "Non-string found in selected audio sources - ignoring.");
                continue;
              }
              w = /^data:audio\/([^;,]+);/i.exec(T), w || (w = /\.([^.]+)$/.exec(T.split("?", 1)[0])), w && (w = w[1].toLowerCase());
            }
            if (w || console.warn('No file extension was found. Consider using the "format" property or specify an extension.'), w && o.codecs(w)) {
              c = l._src[g];
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
          var g = this, w = null;
          if (typeof l == "number")
            w = l, l = null;
          else {
            if (typeof l == "string" && g._state === "loaded" && !g._sprite[l])
              return null;
            if (typeof l > "u" && (l = "__default", !g._playLock)) {
              for (var T = 0, A = 0; A < g._sounds.length; A++)
                g._sounds[A]._paused && !g._sounds[A]._ended && (T++, w = g._sounds[A]._id);
              T === 1 ? l = null : w = null;
            }
          }
          var _ = w ? g._soundById(w) : g._inactiveSound();
          if (!_)
            return null;
          if (w && !l && (l = _._sprite || "__default"), g._state !== "loaded") {
            _._sprite = l, _._ended = !1;
            var C = _._id;
            return g._queue.push({
              event: "play",
              action: function() {
                g.play(C);
              }
            }), C;
          }
          if (w && !_._paused)
            return c || g._loadQueue("play"), _._id;
          g._webAudio && o._autoResume();
          var E = Math.max(0, _._seek > 0 ? _._seek : g._sprite[l][0] / 1e3), N = Math.max(0, (g._sprite[l][0] + g._sprite[l][1]) / 1e3 - E), L = N * 1e3 / Math.abs(_._rate), W = g._sprite[l][0] / 1e3, H = (g._sprite[l][0] + g._sprite[l][1]) / 1e3;
          _._sprite = l, _._ended = !1;
          var Y = function() {
            _._paused = !1, _._seek = E, _._start = W, _._stop = H, _._loop = !!(_._loop || g._sprite[l][2]);
          };
          if (E >= H) {
            g._ended(_);
            return;
          }
          var V = _._node;
          if (g._webAudio) {
            var Q = function() {
              g._playLock = !1, Y(), g._refreshBuffer(_);
              var ue = _._muted || g._muted ? 0 : _._volume;
              V.gain.setValueAtTime(ue, o.ctx.currentTime), _._playStart = o.ctx.currentTime, typeof V.bufferSource.start > "u" ? _._loop ? V.bufferSource.noteGrainOn(0, E, 86400) : V.bufferSource.noteGrainOn(0, E, N) : _._loop ? V.bufferSource.start(0, E, 86400) : V.bufferSource.start(0, E, N), L !== 1 / 0 && (g._endTimers[_._id] = setTimeout(g._ended.bind(g, _), L)), c || setTimeout(function() {
                g._emit("play", _._id), g._loadQueue();
              }, 0);
            };
            o.state === "running" && o.ctx.state !== "interrupted" ? Q() : (g._playLock = !0, g.once("resume", Q), g._clearTimer(_._id));
          } else {
            var ie = function() {
              V.currentTime = E, V.muted = _._muted || g._muted || o._muted || V.muted, V.volume = _._volume * o.volume(), V.playbackRate = _._rate;
              try {
                var ue = V.play();
                if (ue && typeof Promise < "u" && (ue instanceof Promise || typeof ue.then == "function") ? (g._playLock = !0, Y(), ue.then(function() {
                  g._playLock = !1, V._unlocked = !0, c ? g._loadQueue() : g._emit("play", _._id);
                }).catch(function() {
                  g._playLock = !1, g._emit("playerror", _._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction."), _._ended = !0, _._paused = !0;
                })) : c || (g._playLock = !1, Y(), g._emit("play", _._id)), V.playbackRate = _._rate, V.paused) {
                  g._emit("playerror", _._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.");
                  return;
                }
                l !== "__default" || _._loop ? g._endTimers[_._id] = setTimeout(g._ended.bind(g, _), L) : (g._endTimers[_._id] = function() {
                  g._ended(_), V.removeEventListener("ended", g._endTimers[_._id], !1);
                }, V.addEventListener("ended", g._endTimers[_._id], !1));
              } catch (ye) {
                g._emit("playerror", _._id, ye);
              }
            };
            V.src === "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA" && (V.src = g._src, V.load());
            var J = window && window.ejecta || !V.readyState && o._navigator.isCocoonJS;
            if (V.readyState >= 3 || J)
              ie();
            else {
              g._playLock = !0, g._state = "loading";
              var ce = function() {
                g._state = "loaded", ie(), V.removeEventListener(o._canPlayEvent, ce, !1);
              };
              V.addEventListener(o._canPlayEvent, ce, !1), g._clearTimer(_._id);
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
          for (var g = c._getSoundIds(l), w = 0; w < g.length; w++) {
            c._clearTimer(g[w]);
            var T = c._soundById(g[w]);
            if (T && !T._paused && (T._seek = c.seek(g[w]), T._rateSeek = 0, T._paused = !0, c._stopFade(g[w]), T._node))
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
          var g = this;
          if (g._state !== "loaded" || g._playLock)
            return g._queue.push({
              event: "stop",
              action: function() {
                g.stop(l);
              }
            }), g;
          for (var w = g._getSoundIds(l), T = 0; T < w.length; T++) {
            g._clearTimer(w[T]);
            var A = g._soundById(w[T]);
            A && (A._seek = A._start || 0, A._rateSeek = 0, A._paused = !0, A._ended = !0, g._stopFade(w[T]), A._node && (g._webAudio ? A._node.bufferSource && (typeof A._node.bufferSource.stop > "u" ? A._node.bufferSource.noteOff(0) : A._node.bufferSource.stop(0), g._cleanBuffer(A._node)) : (!isNaN(A._node.duration) || A._node.duration === 1 / 0) && (A._node.currentTime = A._start || 0, A._node.pause(), A._node.duration === 1 / 0 && g._clearSound(A._node))), c || g._emit("stop", A._id));
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
          for (var w = g._getSoundIds(c), T = 0; T < w.length; T++) {
            var A = g._soundById(w[T]);
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
          var l = this, c = arguments, g, w;
          if (c.length === 0)
            return l._volume;
          if (c.length === 1 || c.length === 2 && typeof c[1] > "u") {
            var T = l._getSoundIds(), A = T.indexOf(c[0]);
            A >= 0 ? w = parseInt(c[0], 10) : g = parseFloat(c[0]);
          } else c.length >= 2 && (g = parseFloat(c[0]), w = parseInt(c[1], 10));
          var _;
          if (typeof g < "u" && g >= 0 && g <= 1) {
            if (l._state !== "loaded" || l._playLock)
              return l._queue.push({
                event: "volume",
                action: function() {
                  l.volume.apply(l, c);
                }
              }), l;
            typeof w > "u" && (l._volume = g), w = l._getSoundIds(w);
            for (var C = 0; C < w.length; C++)
              _ = l._soundById(w[C]), _ && (_._volume = g, c[2] || l._stopFade(w[C]), l._webAudio && _._node && !_._muted ? _._node.gain.setValueAtTime(g, o.ctx.currentTime) : _._node && !_._muted && (_._node.volume = g * o.volume()), l._emit("volume", _._id));
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
        fade: function(l, c, g, w) {
          var T = this;
          if (T._state !== "loaded" || T._playLock)
            return T._queue.push({
              event: "fade",
              action: function() {
                T.fade(l, c, g, w);
              }
            }), T;
          l = Math.min(Math.max(0, parseFloat(l)), 1), c = Math.min(Math.max(0, parseFloat(c)), 1), g = parseFloat(g), T.volume(l, w);
          for (var A = T._getSoundIds(w), _ = 0; _ < A.length; _++) {
            var C = T._soundById(A[_]);
            if (C) {
              if (w || T._stopFade(A[_]), T._webAudio && !C._muted) {
                var E = o.ctx.currentTime, N = E + g / 1e3;
                C._volume = l, C._node.gain.setValueAtTime(l, E), C._node.gain.linearRampToValueAtTime(c, N);
              }
              T._startFadeInterval(C, l, c, g, A[_], typeof w > "u");
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
        _startFadeInterval: function(l, c, g, w, T, A) {
          var _ = this, C = c, E = g - c, N = Math.abs(E / 0.01), L = Math.max(4, N > 0 ? w / N : w), W = Date.now();
          l._fadeTo = g, l._interval = setInterval(function() {
            var H = (Date.now() - W) / w;
            W = Date.now(), C += E * H, C = Math.round(C * 100) / 100, E < 0 ? C = Math.max(g, C) : C = Math.min(g, C), _._webAudio ? l._volume = C : _.volume(C, l._id, !0), A && (_._volume = C), (g < c && C <= g || g > c && C >= g) && (clearInterval(l._interval), l._interval = null, l._fadeTo = null, _.volume(g, l._id), _._emit("fade", l._id));
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
          var l = this, c = arguments, g, w, T;
          if (c.length === 0)
            return l._loop;
          if (c.length === 1)
            if (typeof c[0] == "boolean")
              g = c[0], l._loop = g;
            else
              return T = l._soundById(parseInt(c[0], 10)), T ? T._loop : !1;
          else c.length === 2 && (g = c[0], w = parseInt(c[1], 10));
          for (var A = l._getSoundIds(w), _ = 0; _ < A.length; _++)
            T = l._soundById(A[_]), T && (T._loop = g, l._webAudio && T._node && T._node.bufferSource && (T._node.bufferSource.loop = g, g && (T._node.bufferSource.loopStart = T._start || 0, T._node.bufferSource.loopEnd = T._stop, l.playing(A[_]) && (l.pause(A[_], !0), l.play(A[_], !0)))));
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
          var l = this, c = arguments, g, w;
          if (c.length === 0)
            w = l._sounds[0]._id;
          else if (c.length === 1) {
            var T = l._getSoundIds(), A = T.indexOf(c[0]);
            A >= 0 ? w = parseInt(c[0], 10) : g = parseFloat(c[0]);
          } else c.length === 2 && (g = parseFloat(c[0]), w = parseInt(c[1], 10));
          var _;
          if (typeof g == "number") {
            if (l._state !== "loaded" || l._playLock)
              return l._queue.push({
                event: "rate",
                action: function() {
                  l.rate.apply(l, c);
                }
              }), l;
            typeof w > "u" && (l._rate = g), w = l._getSoundIds(w);
            for (var C = 0; C < w.length; C++)
              if (_ = l._soundById(w[C]), _) {
                l.playing(w[C]) && (_._rateSeek = l.seek(w[C]), _._playStart = l._webAudio ? o.ctx.currentTime : _._playStart), _._rate = g, l._webAudio && _._node && _._node.bufferSource ? _._node.bufferSource.playbackRate.setValueAtTime(g, o.ctx.currentTime) : _._node && (_._node.playbackRate = g);
                var E = l.seek(w[C]), N = (l._sprite[_._sprite][0] + l._sprite[_._sprite][1]) / 1e3 - E, L = N * 1e3 / Math.abs(_._rate);
                (l._endTimers[w[C]] || !_._paused) && (l._clearTimer(w[C]), l._endTimers[w[C]] = setTimeout(l._ended.bind(l, _), L)), l._emit("rate", _._id);
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
          var l = this, c = arguments, g, w;
          if (c.length === 0)
            l._sounds.length && (w = l._sounds[0]._id);
          else if (c.length === 1) {
            var T = l._getSoundIds(), A = T.indexOf(c[0]);
            A >= 0 ? w = parseInt(c[0], 10) : l._sounds.length && (w = l._sounds[0]._id, g = parseFloat(c[0]));
          } else c.length === 2 && (g = parseFloat(c[0]), w = parseInt(c[1], 10));
          if (typeof w > "u")
            return 0;
          if (typeof g == "number" && (l._state !== "loaded" || l._playLock))
            return l._queue.push({
              event: "seek",
              action: function() {
                l.seek.apply(l, c);
              }
            }), l;
          var _ = l._soundById(w);
          if (_)
            if (typeof g == "number" && g >= 0) {
              var C = l.playing(w);
              C && l.pause(w, !0), _._seek = g, _._ended = !1, l._clearTimer(w), !l._webAudio && _._node && !isNaN(_._node.duration) && (_._node.currentTime = g);
              var E = function() {
                C && l.play(w, !0), l._emit("seek", w);
              };
              if (C && !l._webAudio) {
                var N = function() {
                  l._playLock ? setTimeout(N, 0) : E();
                };
                setTimeout(N, 0);
              } else
                E();
            } else if (l._webAudio) {
              var L = l.playing(w) ? o.ctx.currentTime - _._playStart : 0, W = _._rateSeek ? _._rateSeek - _._seek : 0;
              return _._seek + (W + L * Math.abs(_._rate));
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
            var g = c._soundById(l);
            return g ? !g._paused : !1;
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
          var c = this, g = c._duration, w = c._soundById(l);
          return w && (g = c._sprite[w._sprite][1] / 1e3), g;
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
          var w = o._howls.indexOf(l);
          w >= 0 && o._howls.splice(w, 1);
          var T = !0;
          for (g = 0; g < o._howls.length; g++)
            if (o._howls[g]._src === l._src || l._src.indexOf(o._howls[g]._src) >= 0) {
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
        on: function(l, c, g, w) {
          var T = this, A = T["_on" + l];
          return typeof c == "function" && A.push(w ? { id: g, fn: c, once: w } : { id: g, fn: c }), T;
        },
        /**
         * Remove a custom event. Call without parameters to remove all events.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to remove. Leave empty to remove all.
         * @param  {Number}   id    (optional) Only remove events for this sound.
         * @return {Howl}
         */
        off: function(l, c, g) {
          var w = this, T = w["_on" + l], A = 0;
          if (typeof c == "number" && (g = c, c = null), c || g)
            for (A = 0; A < T.length; A++) {
              var _ = g === T[A].id;
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
        once: function(l, c, g) {
          var w = this;
          return w.on(l, c, g, 1), w;
        },
        /**
         * Emit all events of a specific type and pass the sound id.
         * @param  {String} event Event name.
         * @param  {Number} id    Sound ID.
         * @param  {Number} msg   Message to go with event.
         * @return {Howl}
         */
        _emit: function(l, c, g) {
          for (var w = this, T = w["_on" + l], A = T.length - 1; A >= 0; A--)
            (!T[A].id || T[A].id === c || l === "load") && (setTimeout((function(_) {
              _.call(this, c, g);
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
          var w = !!(l._loop || c._sprite[g][2]);
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
          var l = this, c = l._pool, g = 0, w = 0;
          if (!(l._sounds.length < c)) {
            for (w = 0; w < l._sounds.length; w++)
              l._sounds[w]._ended && g++;
            for (w = l._sounds.length - 1; w >= 0; w--) {
              if (g <= c)
                return;
              l._sounds[w]._ended && (l._webAudio && l._sounds[w]._node && l._sounds[w]._node.disconnect(0), l._sounds.splice(w, 1), g--);
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
            for (var g = [], w = 0; w < c._sounds.length; w++)
              g.push(c._sounds[w]._id);
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
          return l._node.bufferSource = o.ctx.createBufferSource(), l._node.bufferSource.buffer = f[c._src], l._panner ? l._node.bufferSource.connect(l._panner) : l._node.bufferSource.connect(l._node), l._node.bufferSource.loop = l._loop, l._loop && (l._node.bufferSource.loopStart = l._start || 0, l._node.bufferSource.loopEnd = l._stop || 0), l._node.bufferSource.playbackRate.setValueAtTime(l._rate, o.ctx.currentTime), c;
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
      var f = {}, d = function(l) {
        var c = l._src;
        if (f[c]) {
          l._duration = f[c].duration, y(l);
          return;
        }
        if (/^data:[^;]+;base64,/.test(c)) {
          for (var g = atob(c.split(",")[1]), w = new Uint8Array(g.length), T = 0; T < g.length; ++T)
            w[T] = g.charCodeAt(T);
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
        var g = function() {
          c._emit("loaderror", null, "Decoding audio data failed.");
        }, w = function(T) {
          T && c._sounds.length > 0 ? (f[c._src] = T, y(c, T)) : g();
        };
        typeof Promise < "u" && o.ctx.decodeAudioData.length === 1 ? o.ctx.decodeAudioData(l).then(w).catch(g) : o.ctx.decodeAudioData(l, w, g);
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
            var w = /safari/.test(o._navigator && o._navigator.userAgent.toLowerCase());
            o._navigator && !w && (o.usingWebAudio = !1);
          }
          o.usingWebAudio && (o.masterGain = typeof o.ctx.createGain > "u" ? o.ctx.createGainNode() : o.ctx.createGain(), o.masterGain.gain.setValueAtTime(o._muted ? 0 : o._volume, o.ctx.currentTime), o.masterGain.connect(o.ctx.destination)), o._setup();
        }
      };
      e.Howler = o, e.Howl = i, typeof fi < "u" ? (fi.HowlerGlobal = t, fi.Howler = o, fi.Howl = i, fi.Sound = a) : typeof window < "u" && (window.HowlerGlobal = t, window.Howler = o, window.Howl = i, window.Sound = a);
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
              m._stereo = o, m._pos = [o, 0, 0], m._node && (m._pannerAttr.panningModel = "equalpower", (!m._panner || !m._panner.pan) && t(m, f), f === "spatial" ? typeof m._panner.positionX < "u" ? (m._panner.positionX.setValueAtTime(o, Howler.ctx.currentTime), m._panner.positionY.setValueAtTime(0, Howler.ctx.currentTime), m._panner.positionZ.setValueAtTime(0, Howler.ctx.currentTime)) : m._panner.setPosition(o, 0, 0) : m._panner.pan.setValueAtTime(o, Howler.ctx.currentTime)), a._emit("stereo", m._id);
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
              y._pos = [o, i, a], y._node && ((!y._panner || y._panner.pan) && t(y, "spatial"), typeof y._panner.positionX < "u" ? (y._panner.positionX.setValueAtTime(o, Howler.ctx.currentTime), y._panner.positionY.setValueAtTime(i, Howler.ctx.currentTime), y._panner.positionZ.setValueAtTime(a, Howler.ctx.currentTime)) : y._panner.setPosition(o, i, a)), d._emit("pos", y._id);
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
              y._orientation = [o, i, a], y._node && (y._panner || (y._pos || (y._pos = d._pos || [0, 0, -0.5]), t(y, "spatial")), typeof y._panner.orientationX < "u" ? (y._panner.orientationX.setValueAtTime(o, Howler.ctx.currentTime), y._panner.orientationY.setValueAtTime(i, Howler.ctx.currentTime), y._panner.orientationZ.setValueAtTime(a, Howler.ctx.currentTime)) : y._panner.setOrientation(o, i, a)), d._emit("orientation", y._id);
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
            S || (d._pos || (d._pos = o._pos || [0, 0, -0.5]), t(d, "spatial"), S = d._panner), S.coneInnerAngle = y.coneInnerAngle, S.coneOuterAngle = y.coneOuterAngle, S.coneOuterGain = y.coneOuterGain, S.distanceModel = y.distanceModel, S.maxDistance = y.maxDistance, S.refDistance = y.refDistance, S.rolloffFactor = y.rolloffFactor, S.panningModel = y.panningModel;
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
      var t = function(o, i) {
        i = i || "spatial", i === "spatial" ? (o._panner = Howler.ctx.createPanner(), o._panner.coneInnerAngle = o._pannerAttr.coneInnerAngle, o._panner.coneOuterAngle = o._pannerAttr.coneOuterAngle, o._panner.coneOuterGain = o._pannerAttr.coneOuterGain, o._panner.distanceModel = o._pannerAttr.distanceModel, o._panner.maxDistance = o._pannerAttr.maxDistance, o._panner.refDistance = o._pannerAttr.refDistance, o._panner.rolloffFactor = o._pannerAttr.rolloffFactor, o._panner.panningModel = o._pannerAttr.panningModel, typeof o._panner.positionX < "u" ? (o._panner.positionX.setValueAtTime(o._pos[0], Howler.ctx.currentTime), o._panner.positionY.setValueAtTime(o._pos[1], Howler.ctx.currentTime), o._panner.positionZ.setValueAtTime(o._pos[2], Howler.ctx.currentTime)) : o._panner.setPosition(o._pos[0], o._pos[1], o._pos[2]), typeof o._panner.orientationX < "u" ? (o._panner.orientationX.setValueAtTime(o._orientation[0], Howler.ctx.currentTime), o._panner.orientationY.setValueAtTime(o._orientation[1], Howler.ctx.currentTime), o._panner.orientationZ.setValueAtTime(o._orientation[2], Howler.ctx.currentTime)) : o._panner.setOrientation(o._orientation[0], o._orientation[1], o._orientation[2])) : (o._panner = Howler.ctx.createStereoPanner(), o._panner.pan.setValueAtTime(o._stereo, Howler.ctx.currentTime)), o._panner.connect(o._node), o._paused || o._parent.pause(o._id, !0).play(o._id, !0);
      };
    })();
  })(Mc)), Mc;
}
var RR = MR();
const DR = /* @__PURE__ */ Wg(RR), { Howl: gw } = DR, Md = 500, Rt = {
  music: null,
  ambient: /* @__PURE__ */ new Map()
};
let vr = {}, ki = !1, Rd = "";
function Di() {
  return typeof gw == "function";
}
function Rc(e, t = 50) {
  const o = Number(e), i = Number.isFinite(o) ? o : t;
  return Math.min(1, Math.max(0, i / 100));
}
function vw(e) {
  return new gw({
    src: [e],
    loop: !0,
    html5: !0,
    preload: !0,
    volume: 0
  });
}
function Sw(e, t, o = Md) {
  if (e)
    try {
      const i = typeof e.volume == "function" ? e.volume() : 0;
      e.fade(i, t, o);
    } catch {
      try {
        e.volume(t);
      } catch {
      }
    }
}
function sl(e, { unload: t = !1 } = {}) {
  var o;
  e && (Sw(e, 0, Math.min(Md, 300)), (o = globalThis.setTimeout) == null || o.call(globalThis, () => {
    try {
      e.pause(), t && e.unload();
    } catch {
    }
  }, Math.min(Md, 320)));
}
function NR(e) {
  return !(e != null && e.streamUrl) || !Di() ? null : ((!Rt.music || Rt.music.__synapseSrc !== e.streamUrl) && (sl(Rt.music, { unload: !0 }), Rt.music = vw(e.streamUrl), Rt.music.__synapseSrc = e.streamUrl), Rt.music);
}
function jR(e) {
  if (!(e != null && e.streamUrl) || !Di()) return null;
  const t = e.id || e.streamUrl, o = Rt.ambient.get(t);
  if (o && o.__synapseSrc === e.streamUrl) return o;
  sl(o, { unload: !0 });
  const i = vw(e.streamUrl);
  return i.__synapseSrc = e.streamUrl, Rt.ambient.set(t, i), i;
}
function IR() {
  return [
    Rt.music,
    ...Rt.ambient.values()
  ].filter(Boolean);
}
function ww() {
  IR().forEach((e) => sl(e));
}
function FR(e) {
  for (const [t, o] of Rt.ambient.entries())
    e.has(t) || (sl(o, { unload: !0 }), Rt.ambient.delete(t));
}
function Lg(e, t) {
  if (e)
    try {
      e.playing() || e.play(), Sw(e, t), Rd = "";
    } catch (o) {
      Rd = (o == null ? void 0 : o.message) || "Audio playback is blocked until the browser receives a user action.";
    }
}
async function OR(e = {}) {
  vr = { ...vr, ...e };
  const t = tl(vr);
  if (!Di()) return Pa(t);
  if (!ki)
    return ww(), Pa(t);
  const o = NR(t.musicTrack), i = Rc(vr.musicVolume, 60), a = Rc(vr.ambientVolume, 50), f = /* @__PURE__ */ new Set(), d = [];
  return t.ambientLayers.forEach((p) => {
    var c;
    const m = p.id || p.streamUrl;
    f.add(m);
    const y = jR(p), S = Number((c = vr.audioChannels) == null ? void 0 : c[p.id]), l = Number.isFinite(S) ? Rc(S, 0) : Math.min(1, Math.max(0, a * (p.volumeBias ?? 1)));
    d.push([y, l]);
  }), FR(f), Lg(o, i), d.forEach(([p, m]) => Lg(p, m)), Pa(t);
}
function LR(e) {
  return ki = !!e, ki || ww(), ki;
}
function Pa(e = tl(vr)) {
  var t, o, i, a;
  return {
    available: Di(),
    playing: ki && Di(),
    musicTitle: ((t = e.musicTrack) == null ? void 0 : t.title) || "",
    musicArtist: ((o = e.musicTrack) == null ? void 0 : o.artist) || "",
    musicPageUrl: ((i = e.musicTrack) == null ? void 0 : i.pageUrl) || "",
    musicAttribution: ((a = e.musicTrack) == null ? void 0 : a.attribution) || "",
    ambientTitles: e.ambientLayers.map((f) => f.title).filter(Boolean),
    ambientPageUrls: e.ambientLayers.map((f) => f.pageUrl).filter(Boolean),
    ambientAttributions: e.ambientLayers.map((f) => f.attribution).filter(Boolean),
    error: Rd
  };
}
const VR = "synapse.focusRoom.audioPrefs.v1";
function zR(e) {
  var t;
  try {
    (t = globalThis.localStorage) == null || t.setItem(VR, JSON.stringify({
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
function BR() {
  const e = K((m) => m.musicType), t = K((m) => m.ambientSound), o = K((m) => m.musicVolume), i = K((m) => m.ambientVolume), a = K((m) => m.audioChannels), f = K((m) => m.audioPlaying), [d, p] = b.useState(() => Pa(tl({
    musicType: e,
    ambientSound: t
  })));
  return b.useEffect(() => {
    const m = { musicType: e, ambientSound: t, musicVolume: o, ambientVolume: i, audioChannels: a };
    let y = !1;
    return LR(f), zR(m), OR(m).then((S) => {
      y || p(S);
    }), () => {
      y = !0;
    };
  }, [t, i, a, f, e, o]), d;
}
function $R() {
  const e = K(), t = b.useCallback(async (i = "", a = "", f = {}) => {
    var S;
    e.pauseTimer({ pauseAudio: !0 }), e.closeSummary();
    const d = typeof i == "string" || typeof i == "number" ? i : "", p = typeof a == "string" ? a : "", m = UR(p, f), y = String(d || e.selectedMaterialId || ((S = e.selectedMaterial) == null ? void 0 : S.materialId) || "");
    if (typeof globalThis.returnFromFocusRoomToWorkspace == "function")
      try {
        const l = globalThis.returnFromFocusRoomToWorkspace(y, m);
        l && typeof l.then == "function" && await l, Vg(m.action || p, m);
        return;
      } catch (l) {
        console.error("Could not return from Focus Room:", l);
      }
    globalThis.location.hash = "", Vg(m.action || p, m);
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
    returnFromFocusRoom: t,
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
  }), [t, e]);
  return globalThis.__synapseFocusRoomApi = o, b.useEffect(() => {
    globalThis.__synapseFocusRoomApi = o;
  }, [o]), {
    ...e,
    returnToWorkspace: t
  };
}
function xw(e) {
  const t = String(e || "").trim().toLowerCase();
  return ["flashcards", "quiz", "assistant", "mindmap", "timeline", "source", "notes"].includes(t) ? t : "";
}
function UR(e, t = {}) {
  const o = t && typeof t == "object" && !Array.isArray(t) ? t : {}, i = xw(e || o.action);
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
function Vg(e, t = {}) {
  const o = xw(e);
  if (!o) return;
  const i = () => {
    if (o === "source") {
      typeof globalThis.toggleSourceViewer == "function" && globalThis.toggleSourceViewer(!0), t.sourceId && typeof globalThis.selectSourceItem == "function" && globalThis.selectSourceItem(t.sourceId);
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
function HR(e = 3e3) {
  const t = K((i) => i.setIdle), o = K((i) => i.isIdle);
  return b.useEffect(() => {
    let i;
    const a = () => {
      t(!1), clearTimeout(i), i = setTimeout(() => t(!0), e);
    };
    return window.addEventListener("mousemove", a), window.addEventListener("keydown", a), window.addEventListener("click", a), a(), () => {
      clearTimeout(i), window.removeEventListener("mousemove", a), window.removeEventListener("keydown", a), window.removeEventListener("click", a);
    };
  }, [e, t]), o;
}
function WR() {
  const e = K((i) => i.timerState || (i.timerStatus === "studying" ? "running" : i.timerStatus)), t = K((i) => i.view), o = K((i) => i.tickTimer);
  b.useEffect(() => {
    if (t !== "session" || e !== "running" || typeof window > "u") return;
    let i = !0;
    const a = () => {
      i && o();
    }, f = window.setInterval(a, 1e3), d = () => {
      document.visibilityState === "visible" && a();
    };
    return document.addEventListener("visibilitychange", d), a(), () => {
      i = !1, window.clearInterval(f), document.removeEventListener("visibilitychange", d);
    };
  }, [o, e, t]);
}
function GR() {
  const e = K((t) => t.selectedScene);
  return vn(e);
}
function KR(e) {
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
function YR() {
  const [e, t] = b.useState(""), [o, i] = b.useState(!1), [a, f] = b.useState(!1), d = K((_) => _.view), p = HR(3e3), m = GR(), y = BR(), S = $R();
  WR();
  const l = K(B1(KR)), c = K((_) => _.summaryRecord), g = K((_) => _.endSession), w = K((_) => _.initializeFocusRoom);
  b.useEffect(() => {
    w();
  }, [w]), b.useEffect(() => {
    l != null && l.materialId && cf(l.materialId, l);
  }, [l]), b.useEffect(() => {
    d === "session" || !c || Ta("focus-room");
  }, [c, d]), b.useEffect(() => {
    d !== "session" && (i(!1), t(""), f(!1));
  }, [d]), b.useEffect(() => {
    const _ = (C) => {
      C.key === "Escape" && (o ? (C.preventDefault(), i(!1)) : e ? t("") : a && f(!1));
    };
    return window.addEventListener("keydown", _), () => window.removeEventListener("keydown", _);
  }, [a, o, e]);
  const T = (..._) => {
    S.returnToWorkspace(..._);
  }, A = async () => {
    f(!1), i(!1), t(""), g(), await T();
  };
  return /* @__PURE__ */ x.jsxs(
    "main",
    {
      id: "focusRoomSurface",
      className: `focus-room-surface react-focus-room ${p ? "is-idle" : ""} ${d === "setup" ? "is-setup is-innook-setup" : "is-session"}`.trim(),
      "aria-live": "polite",
      "data-focus-room-view": d,
      children: [
        /* @__PURE__ */ x.jsx(AC, { scene: m }),
        /* @__PURE__ */ x.jsxs(qa, { mode: "wait", children: [
          d === "setup" ? /* @__PURE__ */ x.jsx(
            wn.div,
            {
              className: "focus-room-view focus-setup-view",
              initial: { opacity: 0, y: 16 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -10 },
              transition: Ba,
              children: /* @__PURE__ */ x.jsx(OP, { audioState: y, onWorkspace: T })
            },
            "setup"
          ) : null,
          d === "session" ? /* @__PURE__ */ x.jsxs(
            wn.div,
            {
              className: "focus-room-view focus-session-view",
              initial: { opacity: 0, y: 14 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -8 },
              transition: Ba,
              children: [
                o ? /* @__PURE__ */ x.jsx("button", { type: "button", className: "focus-mode-exit-hit-area", onClick: () => i(!1), children: "Exit Focus Mode" }) : /* @__PURE__ */ x.jsx(LP, { onWorkspace: T, onOpenTrail: () => t("trail"), onOpenCompanion: () => t("companion"), onOpenSettings: () => t("settings"), onExit: () => f(!0) }),
                /* @__PURE__ */ x.jsx("section", { className: `focus-session-stage ${o ? "is-focus-mode" : ""}`.trim(), "aria-hidden": "true" }),
                o ? /* @__PURE__ */ x.jsx(ER, { onExit: () => i(!1) }) : /* @__PURE__ */ x.jsx(GP, { audioState: y, onFocusMode: () => i(!0) }),
                o ? null : /* @__PURE__ */ x.jsx(kR, { audioState: y, utilityPanel: e, onClose: () => t(""), onWorkspace: T }),
                /* @__PURE__ */ x.jsx(DM, {}),
                /* @__PURE__ */ x.jsx(XR, { open: a, onClose: () => f(!1), onConfirm: A })
              ]
            },
            "session"
          ) : null
        ] })
      ]
    }
  );
}
function XR({ open: e, onClose: t, onConfirm: o }) {
  return e ? /* @__PURE__ */ x.jsx("div", { className: "focus-exit-overlay", role: "presentation", children: /* @__PURE__ */ x.jsxs("div", { className: "focus-exit-dialog liquid-glass", role: "dialog", "aria-modal": "true", "aria-labelledby": "focus-exit-title", children: [
    /* @__PURE__ */ x.jsx("span", { className: "focus-kicker", children: "Leave this room?" }),
    /* @__PURE__ */ x.jsx("h2", { id: "focus-exit-title", children: "End focus session" }),
    /* @__PURE__ */ x.jsx("p", { children: "Your focused time will be saved to your Focus Trail." }),
    /* @__PURE__ */ x.jsxs("div", { className: "focus-button-row", children: [
      /* @__PURE__ */ x.jsx(Te, { onClick: t, children: "Continue focusing" }),
      /* @__PURE__ */ x.jsx(Te, { variant: "primary", onClick: o, children: "End and exit" })
    ] })
  ] }) }) : null;
}
let Dc = null;
function QR(e, t) {
  const o = globalThis.__synapseFocusRoomApi || {};
  if (typeof o[e] != "function") {
    console.warn(`Synapse Focus Room action "${e}" is not available yet.`);
    return;
  }
  return o[e](...t);
}
function ZR() {
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
  }).forEach(([t, o]) => {
    globalThis[t] = (...i) => QR(o, i);
  });
}
function JR(e = {}) {
  ZR();
  const t = e.root || document.getElementById("focusRoomRoot");
  if (!t)
    throw new Error("Focus Room root element was not found.");
  Dc || (Dc = F1.createRoot(t), Dc.render(
    gn.createElement(
      gn.StrictMode,
      null,
      gn.createElement(YR)
    )
  ));
}
const qR = "synapse.generated.history.v6", _w = "synapse.active.generated.v6", e2 = "synapse.flashcards.deck.v1", t2 = "synapse.quiz.history.v1", n2 = "synapse.focusRoom.return-target.v1";
function Nf(e, t) {
  var o;
  try {
    const i = (o = globalThis.localStorage) == null ? void 0 : o.getItem(e);
    if (!i) return t;
    const a = JSON.parse(i);
    return a ?? t;
  } catch (i) {
    return console.warn(`Could not read ${e}:`, i), t;
  }
}
function r2(e, t) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, t), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function o2(e, t) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, JSON.stringify(t)), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function Tw() {
  const e = Nf(qR, []);
  return Array.isArray(e) ? e : [];
}
function i2(e) {
  const t = String((e == null ? void 0 : e.title) || "").trim();
  return t || String((e == null ? void 0 : e.summary) || "").split(/\n+/).map((i) => i.replace(/^#+\s*/, "").trim()).find((i) => i.length > 4) || "Generated Study Notes";
}
function kw(e = {}) {
  return [
    e.id ? `history:${e.id}` : "",
    e.sourceFingerprint ? `fingerprint:${e.sourceFingerprint}` : "",
    e.clientFingerprint ? `fingerprint:${e.clientFingerprint}` : ""
  ].filter(Boolean);
}
function s2(e = {}) {
  const t = Nf(e2, {}), i = kw(e).map((a) => t == null ? void 0 : t[a]).find((a) => a && Array.isArray(a.cards) && a.cards.length);
  return (i == null ? void 0 : i.cards) || [];
}
function a2(e = {}) {
  var o;
  const t = String(e.id || "").trim();
  if (t) return `id:${t}`;
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
function l2(e = []) {
  return (Array.isArray(e) ? e : []).map((t) => {
    var o;
    return {
      id: t.id,
      title: t.title,
      createdAt: t.createdAt || t.created_at || "",
      updatedAt: t.updatedAt || t.updated_at || "",
      questions: ((o = t.quiz) == null ? void 0 : o.questions) || t.questions || [],
      report: t.report || null
    };
  });
}
function u2(e = {}) {
  const t = Nf(t2, {}), i = kw(e).flatMap((f) => Array.isArray(t == null ? void 0 : t[f]) ? t[f] : []), a = /* @__PURE__ */ new Set();
  return l2(i).filter((f) => {
    const d = a2(f);
    return !d || a.has(d) ? !1 : (a.add(d), !0);
  }).sort((f, d) => new Date(d.createdAt || 0) - new Date(f.createdAt || 0));
}
function c2(e = {}) {
  return {
    materialId: String(e.id || e.sourceFingerprint || e.clientFingerprint || "current-material"),
    materialTitle: i2(e),
    materialType: "Generated notes",
    uploadedContent: "",
    aiSummary: e.summary || "",
    sections: e.sections || {},
    flashcards: s2(e),
    quizzes: u2(e),
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
function Aw() {
  return Tw().filter((e) => e && (e.id || e.summary) && e.kind !== "companion" && !String(e.id || "").startsWith("companion:")).map(c2);
}
function bw(e = "") {
  const t = String(e || "");
  return t && Aw().find(
    (o) => o.materialId === t || o.sourceFingerprint === t || o.clientFingerprint === t
  ) || null;
}
function Cw() {
  var t;
  const e = ((t = globalThis.localStorage) == null ? void 0 : t.getItem(_w)) || "";
  return bw(e);
}
function d2(e = "") {
  var i;
  const t = e || ((i = Cw()) == null ? void 0 : i.materialId) || "", o = t ? `/${encodeURIComponent(t)}` : "";
  globalThis.location.hash = `#/focus-room${o}`;
}
function f2(e = "", t = {}) {
  const o = t && typeof t == "object" && !Array.isArray(t) ? t : {};
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
async function p2(e = "", t = {}) {
  const o = String(e || ""), i = Tw().find(
    (d) => String((d == null ? void 0 : d.id) || "") === o || String((d == null ? void 0 : d.sourceFingerprint) || (d == null ? void 0 : d.source_fingerprint) || "") === o || String((d == null ? void 0 : d.clientFingerprint) || (d == null ? void 0 : d.client_fingerprint) || "") === o
  ) || null, a = String((i == null ? void 0 : i.id) || "");
  a && r2(_w, a);
  const f = f2(a, t);
  f.action && o2(n2, f), globalThis.location.href = a ? `index.html?focusReturn=${encodeURIComponent(a)}` : "index.html";
}
function m2() {
  Object.assign(globalThis, {
    getSynapseFocusRoomCurrentMaterial: Cw,
    getSynapseFocusRoomMaterial: bw,
    getSynapseFocusRoomMaterials: Aw,
    openSynapseFocusRoom: d2,
    returnFromFocusRoomToWorkspace: p2
  });
}
const Pw = document.getElementById("focusRoomRoot");
if (!Pw)
  throw new Error("Focus Room root element was not found.");
var $g;
($g = document.getElementById("focusRoomFallbackTitle")) == null || $g.remove();
globalThis.apiClient = new Hg(P1);
m2();
(!globalThis.location.hash || globalThis.location.hash === "#") && (globalThis.location.hash = "#/focus-room");
JR({ root: Pw });
