function g1(e, t) {
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
function v1(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function Ig(e) {
  const t = String(e || "").toLowerCase();
  return t === "127.0.0.1" || t === "localhost" || t === "::1" || t === "[::1]";
}
function Th(e) {
  return Ig(e) || v1(e);
}
function S1(e) {
  return !e || Ig(e) ? "127.0.0.1" : e;
}
const w1 = (() => {
  var p, m, y, v;
  const { protocol: e, hostname: t, port: o } = window.location, i = String(window.SYNAPSE_BACKEND_PORT || ((m = (p = document.body) == null ? void 0 : p.dataset) == null ? void 0 : m.apiPort) || "8001").trim(), a = `http://${S1(t)}:${i || "8001"}`, f = String(window.SYNAPSE_API_BASE || ((v = (y = document.body) == null ? void 0 : y.dataset) == null ? void 0 : v.apiBase) || "").replace(/\/+$/, ""), d = `${e}//${window.location.host}`.replace(/\/+$/, "");
  return f && !(Th(t) && o !== i && f === d) ? f : e === "file:" || Th(t) && o !== i ? a : `${e}//${window.location.host}`;
})();
class to extends Error {
  constructor(t, { cause: o, code: i } = {}) {
    super(t), this.name = "ApiConnectionError", this.cause = o, this.code = i || "connection_error";
  }
}
const kh = "synapse.client.id.v1";
function $n() {
  return globalThis.window || globalThis;
}
function no(e, t = 220) {
  return String(e || "").replace(/[\r\n]+/g, " ").trim().slice(0, t);
}
function Ah() {
  const e = globalThis.crypto || $n().crypto;
  return e != null && e.randomUUID ? e.randomUUID() : `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
function x1() {
  var t, o;
  const e = $n();
  try {
    const i = (t = e.localStorage) == null ? void 0 : t.getItem(kh);
    if (i) return i;
    const a = Ah();
    return (o = e.localStorage) == null || o.setItem(kh, a), a;
  } catch {
    return Ah();
  }
}
function _1(e = {}) {
  if (typeof Headers < "u" && e instanceof Headers) {
    const t = {};
    return e.forEach((o, i) => {
      t[i] = o;
    }), t;
  }
  return Array.isArray(e) ? Object.fromEntries(e) : { ...e || {} };
}
class Fg {
  constructor(t, { fetchImpl: o } = {}) {
    var a, f;
    const i = $n();
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
    const o = $n(), i = _1(t);
    i["X-Synapse-Client-Id"] = no(x1(), 160);
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
  async fetch(t, o = {}) {
    var l;
    const i = this.endpoint(t), { timeoutMs: a, ...f } = o || {};
    f.headers = await this.requestHeaders(f.headers || {});
    const d = Number(a || 0);
    let p = null, m = null, y = null;
    const v = f.signal;
    d > 0 && typeof AbortController < "u" && (p = new AbortController(), y = () => p.abort(), v && (v.aborted ? p.abort() : v.addEventListener("abort", y, { once: !0 })), m = $n().setTimeout(() => p.abort(), d), f.signal = p.signal);
    try {
      return await this.fetchImpl(i, f);
    } catch (c) {
      throw (l = p == null ? void 0 : p.signal) != null && l.aborted && !(v != null && v.aborted) ? new to(this.timeoutMessage(d), {
        cause: c,
        code: "timeout"
      }) : v != null && v.aborted ? new to("Analysis was cancelled.", {
        cause: c,
        code: "cancelled"
      }) : new to(this.connectionMessage(), {
        cause: c,
        code: "unreachable"
      });
    } finally {
      m && $n().clearTimeout(m), v && y && v.removeEventListener("abort", y);
    }
  }
  async warmup({ attempts: t = 2, retryDelayMs: o = 1500, timeoutMs: i = 6e4, maxWaitMs: a = 0, signal: f } = {}) {
    const d = Math.max(1, Math.floor(Number(t) || 1)), p = Math.max(0, Number(a) || 0), m = Date.now();
    let y = null;
    for (let v = 0; v < d; v += 1) {
      const l = Date.now() - m, c = p > 0 ? p - l : 0;
      if (p > 0 && c <= 0) break;
      try {
        const S = await this.fetch("/healthz", {
          method: "GET",
          signal: f,
          timeoutMs: p > 0 ? Math.min(i, c) : i
        });
        if (S != null && S.ok) return S;
        y = new to(
          `Synapse hosted service returned ${(S == null ? void 0 : S.status) || "an unexpected status"} while preparing your analysis.`,
          { code: "warmup_status" }
        );
      } catch (S) {
        y = S;
      }
      if (v < d - 1 && o > 0) {
        const S = p > 0 ? p - (Date.now() - m) : o;
        if (p > 0 && S <= 0) break;
        await new Promise((x) => $n().setTimeout(x, Math.min(o, S)));
      }
    }
    throw y || new to(this.connectionMessage(), { code: "warmup_failed" });
  }
  isRetryableResponse(t) {
    return [502, 503, 504].includes(Number(t == null ? void 0 : t.status));
  }
  isRetryableConnectionError(t) {
    return !(!(t instanceof to) || t.code === "cancelled" || t.code === "timeout");
  }
  async fetchWithRetry(t, o = {}, {
    attempts: i = 3,
    retryDelayMs: a = 3e3,
    retryOnConnectionError: f = !0,
    onRetry: d
  } = {}) {
    const p = Math.max(1, Math.floor(Number(i) || 1));
    let m = null, y = null;
    for (let v = 0; v < p; v += 1) {
      try {
        const l = typeof o == "function" ? o(v) : o;
        if (m = await this.fetch(t, l), !this.isRetryableResponse(m) || v === p - 1) return m;
        d == null || d({
          attempt: v + 1,
          totalAttempts: p,
          reason: `HTTP ${m.status}`
        });
      } catch (l) {
        if (y = l, !(f && this.isRetryableConnectionError(l) && v < p - 1)) throw l;
        d == null || d({
          attempt: v + 1,
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
var di = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Og(e) {
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
var bh;
function T1() {
  if (bh) return pe;
  bh = 1;
  var e = Symbol.for("react.element"), t = Symbol.for("react.portal"), o = Symbol.for("react.fragment"), i = Symbol.for("react.strict_mode"), a = Symbol.for("react.profiler"), f = Symbol.for("react.provider"), d = Symbol.for("react.context"), p = Symbol.for("react.forward_ref"), m = Symbol.for("react.suspense"), y = Symbol.for("react.memo"), v = Symbol.for("react.lazy"), l = Symbol.iterator;
  function c(D) {
    return D === null || typeof D != "object" ? null : (D = l && D[l] || D["@@iterator"], typeof D == "function" ? D : null);
  }
  var S = { isMounted: function() {
    return !1;
  }, enqueueForceUpdate: function() {
  }, enqueueReplaceState: function() {
  }, enqueueSetState: function() {
  } }, x = Object.assign, _ = {};
  function A(D, V, fe) {
    this.props = D, this.context = V, this.refs = _, this.updater = fe || S;
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
  function C(D, V, fe) {
    this.props = D, this.context = V, this.refs = _, this.updater = fe || S;
  }
  var E = C.prototype = new T();
  E.constructor = C, x(E, A.prototype), E.isPureReactComponent = !0;
  var N = Array.isArray, O = Object.prototype.hasOwnProperty, W = { current: null }, H = { key: !0, ref: !0, __self: !0, __source: !0 };
  function Y(D, V, fe) {
    var me, ge = {}, ve = null, Pe = null;
    if (V != null) for (me in V.ref !== void 0 && (Pe = V.ref), V.key !== void 0 && (ve = "" + V.key), V) O.call(V, me) && !H.hasOwnProperty(me) && (ge[me] = V[me]);
    var xe = arguments.length - 2;
    if (xe === 1) ge.children = fe;
    else if (1 < xe) {
      for (var Ne = Array(xe), vt = 0; vt < xe; vt++) Ne[vt] = arguments[vt + 2];
      ge.children = Ne;
    }
    if (D && D.defaultProps) for (me in xe = D.defaultProps, xe) ge[me] === void 0 && (ge[me] = xe[me]);
    return { $$typeof: e, type: D, key: ve, ref: Pe, props: ge, _owner: W.current };
  }
  function L(D, V) {
    return { $$typeof: e, type: D.type, key: V, ref: D.ref, props: D.props, _owner: D._owner };
  }
  function X(D) {
    return typeof D == "object" && D !== null && D.$$typeof === e;
  }
  function se(D) {
    var V = { "=": "=0", ":": "=2" };
    return "$" + D.replace(/[=:]/g, function(fe) {
      return V[fe];
    });
  }
  var Z = /\/+/g;
  function de(D, V) {
    return typeof D == "object" && D !== null && D.key != null ? se("" + D.key) : V.toString(36);
  }
  function ce(D, V, fe, me, ge) {
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
    if (Pe) return Pe = D, ge = ge(Pe), D = me === "" ? "." + de(Pe, 0) : me, N(ge) ? (fe = "", D != null && (fe = D.replace(Z, "$&/") + "/"), ce(ge, V, fe, "", function(vt) {
      return vt;
    })) : ge != null && (X(ge) && (ge = L(ge, fe + (!ge.key || Pe && Pe.key === ge.key ? "" : ("" + ge.key).replace(Z, "$&/") + "/") + D)), V.push(ge)), 1;
    if (Pe = 0, me = me === "" ? "." : me + ":", N(D)) for (var xe = 0; xe < D.length; xe++) {
      ve = D[xe];
      var Ne = me + de(ve, xe);
      Pe += ce(ve, V, fe, Ne, ge);
    }
    else if (Ne = c(D), typeof Ne == "function") for (D = Ne.call(D), xe = 0; !(ve = D.next()).done; ) ve = ve.value, Ne = me + de(ve, xe++), Pe += ce(ve, V, fe, Ne, ge);
    else if (ve === "object") throw V = String(D), Error("Objects are not valid as a React child (found: " + (V === "[object Object]" ? "object with keys {" + Object.keys(D).join(", ") + "}" : V) + "). If you meant to render a collection of children, use an array instead.");
    return Pe;
  }
  function ye(D, V, fe) {
    if (D == null) return D;
    var me = [], ge = 0;
    return ce(D, me, "", "", function(ve) {
      return V.call(fe, ve, ge++);
    }), me;
  }
  function ee(D) {
    if (D._status === -1) {
      var V = D._result;
      V = V(), V.then(function(fe) {
        (D._status === 0 || D._status === -1) && (D._status = 1, D._result = fe);
      }, function(fe) {
        (D._status === 0 || D._status === -1) && (D._status = 2, D._result = fe);
      }), D._status === -1 && (D._status = 0, D._result = V);
    }
    if (D._status === 1) return D._result.default;
    throw D._result;
  }
  var we = { current: null }, $ = { transition: null }, J = { ReactCurrentDispatcher: we, ReactCurrentBatchConfig: $, ReactCurrentOwner: W };
  function Q() {
    throw Error("act(...) is not supported in production builds of React.");
  }
  return pe.Children = { map: ye, forEach: function(D, V, fe) {
    ye(D, function() {
      V.apply(this, arguments);
    }, fe);
  }, count: function(D) {
    var V = 0;
    return ye(D, function() {
      V++;
    }), V;
  }, toArray: function(D) {
    return ye(D, function(V) {
      return V;
    }) || [];
  }, only: function(D) {
    if (!X(D)) throw Error("React.Children.only expected to receive a single React element child.");
    return D;
  } }, pe.Component = A, pe.Fragment = o, pe.Profiler = a, pe.PureComponent = C, pe.StrictMode = i, pe.Suspense = m, pe.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = J, pe.act = Q, pe.cloneElement = function(D, V, fe) {
    if (D == null) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + D + ".");
    var me = x({}, D.props), ge = D.key, ve = D.ref, Pe = D._owner;
    if (V != null) {
      if (V.ref !== void 0 && (ve = V.ref, Pe = W.current), V.key !== void 0 && (ge = "" + V.key), D.type && D.type.defaultProps) var xe = D.type.defaultProps;
      for (Ne in V) O.call(V, Ne) && !H.hasOwnProperty(Ne) && (me[Ne] = V[Ne] === void 0 && xe !== void 0 ? xe[Ne] : V[Ne]);
    }
    var Ne = arguments.length - 2;
    if (Ne === 1) me.children = fe;
    else if (1 < Ne) {
      xe = Array(Ne);
      for (var vt = 0; vt < Ne; vt++) xe[vt] = arguments[vt + 2];
      me.children = xe;
    }
    return { $$typeof: e, type: D.type, key: ge, ref: ve, props: me, _owner: Pe };
  }, pe.createContext = function(D) {
    return D = { $$typeof: d, _currentValue: D, _currentValue2: D, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null }, D.Provider = { $$typeof: f, _context: D }, D.Consumer = D;
  }, pe.createElement = Y, pe.createFactory = function(D) {
    var V = Y.bind(null, D);
    return V.type = D, V;
  }, pe.createRef = function() {
    return { current: null };
  }, pe.forwardRef = function(D) {
    return { $$typeof: p, render: D };
  }, pe.isValidElement = X, pe.lazy = function(D) {
    return { $$typeof: v, _payload: { _status: -1, _result: D }, _init: ee };
  }, pe.memo = function(D, V) {
    return { $$typeof: y, type: D, compare: V === void 0 ? null : V };
  }, pe.startTransition = function(D) {
    var V = $.transition;
    $.transition = {};
    try {
      D();
    } finally {
      $.transition = V;
    }
  }, pe.unstable_act = Q, pe.useCallback = function(D, V) {
    return we.current.useCallback(D, V);
  }, pe.useContext = function(D) {
    return we.current.useContext(D);
  }, pe.useDebugValue = function() {
  }, pe.useDeferredValue = function(D) {
    return we.current.useDeferredValue(D);
  }, pe.useEffect = function(D, V) {
    return we.current.useEffect(D, V);
  }, pe.useId = function() {
    return we.current.useId();
  }, pe.useImperativeHandle = function(D, V, fe) {
    return we.current.useImperativeHandle(D, V, fe);
  }, pe.useInsertionEffect = function(D, V) {
    return we.current.useInsertionEffect(D, V);
  }, pe.useLayoutEffect = function(D, V) {
    return we.current.useLayoutEffect(D, V);
  }, pe.useMemo = function(D, V) {
    return we.current.useMemo(D, V);
  }, pe.useReducer = function(D, V, fe) {
    return we.current.useReducer(D, V, fe);
  }, pe.useRef = function(D) {
    return we.current.useRef(D);
  }, pe.useState = function(D) {
    return we.current.useState(D);
  }, pe.useSyncExternalStore = function(D, V, fe) {
    return we.current.useSyncExternalStore(D, V, fe);
  }, pe.useTransition = function() {
    return we.current.useTransition();
  }, pe.version = "18.3.1", pe;
}
var Ch;
function bd() {
  return Ch || (Ch = 1, Yu.exports = T1()), Yu.exports;
}
var b = bd();
const gn = /* @__PURE__ */ Og(b), Er = /* @__PURE__ */ g1({
  __proto__: null,
  default: gn
}, [b]);
var Xs = {}, Qu = { exports: {} }, yt = {}, Xu = { exports: {} }, Zu = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Ph;
function k1() {
  return Ph || (Ph = 1, (function(e) {
    function t($, J) {
      var Q = $.length;
      $.push(J);
      e: for (; 0 < Q; ) {
        var D = Q - 1 >>> 1, V = $[D];
        if (0 < a(V, J)) $[D] = J, $[Q] = V, Q = D;
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
        e: for (var D = 0, V = $.length, fe = V >>> 1; D < fe; ) {
          var me = 2 * (D + 1) - 1, ge = $[me], ve = me + 1, Pe = $[ve];
          if (0 > a(ge, Q)) ve < V && 0 > a(Pe, ge) ? ($[D] = Pe, $[ve] = Q, D = ve) : ($[D] = ge, $[me] = Q, D = me);
          else if (ve < V && 0 > a(Pe, Q)) $[D] = Pe, $[ve] = Q, D = ve;
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
    var m = [], y = [], v = 1, l = null, c = 3, S = !1, x = !1, _ = !1, A = typeof setTimeout == "function" ? setTimeout : null, T = typeof clearTimeout == "function" ? clearTimeout : null, C = typeof setImmediate < "u" ? setImmediate : null;
    typeof navigator < "u" && navigator.scheduling !== void 0 && navigator.scheduling.isInputPending !== void 0 && navigator.scheduling.isInputPending.bind(navigator.scheduling);
    function E($) {
      for (var J = o(y); J !== null; ) {
        if (J.callback === null) i(y);
        else if (J.startTime <= $) i(y), J.sortIndex = J.expirationTime, t(m, J);
        else break;
        J = o(y);
      }
    }
    function N($) {
      if (_ = !1, E($), !x) if (o(m) !== null) x = !0, ee(O);
      else {
        var J = o(y);
        J !== null && we(N, J.startTime - $);
      }
    }
    function O($, J) {
      x = !1, _ && (_ = !1, T(Y), Y = -1), S = !0;
      var Q = c;
      try {
        for (E(J), l = o(m); l !== null && (!(l.expirationTime > J) || $ && !se()); ) {
          var D = l.callback;
          if (typeof D == "function") {
            l.callback = null, c = l.priorityLevel;
            var V = D(l.expirationTime <= J);
            J = e.unstable_now(), typeof V == "function" ? l.callback = V : l === o(m) && i(m), E(J);
          } else i(m);
          l = o(m);
        }
        if (l !== null) var fe = !0;
        else {
          var me = o(y);
          me !== null && we(N, me.startTime - J), fe = !1;
        }
        return fe;
      } finally {
        l = null, c = Q, S = !1;
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
      x || S || (x = !0, ee(O));
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
      var D = e.unstable_now();
      switch (typeof Q == "object" && Q !== null ? (Q = Q.delay, Q = typeof Q == "number" && 0 < Q ? D + Q : D) : Q = D, $) {
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
      return V = Q + V, $ = { id: v++, callback: J, priorityLevel: $, startTime: Q, expirationTime: V, sortIndex: -1 }, Q > D ? ($.sortIndex = Q, t(y, $), o(m) === null && $ === o(y) && (_ ? (T(Y), Y = -1) : _ = !0, we(N, Q - D))) : ($.sortIndex = V, t(m, $), x || S || (x = !0, ee(O))), $;
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
var Eh;
function A1() {
  return Eh || (Eh = 1, Xu.exports = k1()), Xu.exports;
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
var Mh;
function b1() {
  if (Mh) return yt;
  Mh = 1;
  var e = bd(), t = A1();
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
  var p = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), m = Object.prototype.hasOwnProperty, y = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, v = {}, l = {};
  function c(n) {
    return m.call(l, n) ? !0 : m.call(v, n) ? !1 : y.test(n) ? l[n] = !0 : (v[n] = !0, !1);
  }
  function S(n, r, s, u) {
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
  function x(n, r, s, u) {
    if (r === null || typeof r > "u" || S(n, r, s, u)) return !0;
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
  function _(n, r, s, u, h, g, k) {
    this.acceptsBooleans = r === 2 || r === 3 || r === 4, this.attributeName = u, this.attributeNamespace = h, this.mustUseProperty = s, this.propertyName = n, this.type = r, this.sanitizeURL = g, this.removeEmptyString = k;
  }
  var A = {};
  "children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(n) {
    A[n] = new _(n, 0, !1, n, null, !1, !1);
  }), [["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(n) {
    var r = n[0];
    A[r] = new _(r, 1, !1, n[1], null, !1, !1);
  }), ["contentEditable", "draggable", "spellCheck", "value"].forEach(function(n) {
    A[n] = new _(n, 2, !1, n.toLowerCase(), null, !1, !1);
  }), ["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(n) {
    A[n] = new _(n, 2, !1, n, null, !1, !1);
  }), "allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(n) {
    A[n] = new _(n, 3, !1, n.toLowerCase(), null, !1, !1);
  }), ["checked", "multiple", "muted", "selected"].forEach(function(n) {
    A[n] = new _(n, 3, !0, n, null, !1, !1);
  }), ["capture", "download"].forEach(function(n) {
    A[n] = new _(n, 4, !1, n, null, !1, !1);
  }), ["cols", "rows", "size", "span"].forEach(function(n) {
    A[n] = new _(n, 6, !1, n, null, !1, !1);
  }), ["rowSpan", "start"].forEach(function(n) {
    A[n] = new _(n, 5, !1, n.toLowerCase(), null, !1, !1);
  });
  var T = /[\-:]([a-z])/g;
  function C(n) {
    return n[1].toUpperCase();
  }
  "accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(n) {
    var r = n.replace(
      T,
      C
    );
    A[r] = new _(r, 1, !1, n, null, !1, !1);
  }), "xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(n) {
    var r = n.replace(T, C);
    A[r] = new _(r, 1, !1, n, "http://www.w3.org/1999/xlink", !1, !1);
  }), ["xml:base", "xml:lang", "xml:space"].forEach(function(n) {
    var r = n.replace(T, C);
    A[r] = new _(r, 1, !1, n, "http://www.w3.org/XML/1998/namespace", !1, !1);
  }), ["tabIndex", "crossOrigin"].forEach(function(n) {
    A[n] = new _(n, 1, !1, n.toLowerCase(), null, !1, !1);
  }), A.xlinkHref = new _("xlinkHref", 1, !1, "xlink:href", "http://www.w3.org/1999/xlink", !0, !1), ["src", "href", "action", "formAction"].forEach(function(n) {
    A[n] = new _(n, 1, !1, n.toLowerCase(), null, !0, !0);
  });
  function E(n, r, s, u) {
    var h = A.hasOwnProperty(r) ? A[r] : null;
    (h !== null ? h.type !== 0 : u || !(2 < r.length) || r[0] !== "o" && r[0] !== "O" || r[1] !== "n" && r[1] !== "N") && (x(r, s, h, u) && (s = null), u || h === null ? c(r) && (s === null ? n.removeAttribute(r) : n.setAttribute(r, "" + s)) : h.mustUseProperty ? n[h.propertyName] = s === null ? h.type === 3 ? !1 : "" : s : (r = h.attributeName, u = h.attributeNamespace, s === null ? n.removeAttribute(r) : (h = h.type, s = h === 3 || h === 4 && s === !0 ? "" : "" + s, u ? n.setAttributeNS(u, r, s) : n.setAttribute(r, s))));
  }
  var N = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, O = Symbol.for("react.element"), W = Symbol.for("react.portal"), H = Symbol.for("react.fragment"), Y = Symbol.for("react.strict_mode"), L = Symbol.for("react.profiler"), X = Symbol.for("react.provider"), se = Symbol.for("react.context"), Z = Symbol.for("react.forward_ref"), de = Symbol.for("react.suspense"), ce = Symbol.for("react.suspense_list"), ye = Symbol.for("react.memo"), ee = Symbol.for("react.lazy"), we = Symbol.for("react.offscreen"), $ = Symbol.iterator;
  function J(n) {
    return n === null || typeof n != "object" ? null : (n = $ && n[$] || n["@@iterator"], typeof n == "function" ? n : null);
  }
  var Q = Object.assign, D;
  function V(n) {
    if (D === void 0) try {
      throw Error();
    } catch (s) {
      var r = s.stack.trim().match(/\n( *(at )?)/);
      D = r && r[1] || "";
    }
    return `
` + D + n;
  }
  var fe = !1;
  function me(n, r) {
    if (!n || fe) return "";
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
`), g = u.stack.split(`
`), k = h.length - 1, P = g.length - 1; 1 <= k && 0 <= P && h[k] !== g[P]; ) P--;
        for (; 1 <= k && 0 <= P; k--, P--) if (h[k] !== g[P]) {
          if (k !== 1 || P !== 1)
            do
              if (k--, P--, 0 > P || h[k] !== g[P]) {
                var M = `
` + h[k].replace(" at new ", " at ");
                return n.displayName && M.includes("<anonymous>") && (M = M.replace("<anonymous>", n.displayName)), M;
              }
            while (1 <= k && 0 <= P);
          break;
        }
      }
    } finally {
      fe = !1, Error.prepareStackTrace = s;
    }
    return (n = n ? n.displayName || n.name : "") ? V(n) : "";
  }
  function ge(n) {
    switch (n.tag) {
      case 5:
        return V(n.type);
      case 16:
        return V("Lazy");
      case 13:
        return V("Suspense");
      case 19:
        return V("SuspenseList");
      case 0:
      case 2:
      case 15:
        return n = me(n.type, !1), n;
      case 11:
        return n = me(n.type.render, !1), n;
      case 1:
        return n = me(n.type, !0), n;
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
      case L:
        return "Profiler";
      case Y:
        return "StrictMode";
      case de:
        return "Suspense";
      case ce:
        return "SuspenseList";
    }
    if (typeof n == "object") switch (n.$$typeof) {
      case se:
        return (n.displayName || "Context") + ".Consumer";
      case X:
        return (n._context.displayName || "Context") + ".Provider";
      case Z:
        var r = n.render;
        return n = n.displayName, n || (n = r.displayName || r.name || "", n = n !== "" ? "ForwardRef(" + n + ")" : "ForwardRef"), n;
      case ye:
        return r = n.displayName || null, r !== null ? r : ve(n.type) || "Memo";
      case ee:
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
  function Ne(n) {
    var r = n.type;
    return (n = n.nodeName) && n.toLowerCase() === "input" && (r === "checkbox" || r === "radio");
  }
  function vt(n) {
    var r = Ne(n) ? "checked" : "value", s = Object.getOwnPropertyDescriptor(n.constructor.prototype, r), u = "" + n[r];
    if (!n.hasOwnProperty(r) && typeof s < "u" && typeof s.get == "function" && typeof s.set == "function") {
      var h = s.get, g = s.set;
      return Object.defineProperty(n, r, { configurable: !0, get: function() {
        return h.call(this);
      }, set: function(k) {
        u = "" + k, g.call(this, k);
      } }), Object.defineProperty(n, r, { enumerable: s.enumerable }), { getValue: function() {
        return u;
      }, setValue: function(k) {
        u = "" + k;
      }, stopTracking: function() {
        n._valueTracker = null, delete n[r];
      } };
    }
  }
  function zi(n) {
    n._valueTracker || (n._valueTracker = vt(n));
  }
  function Ef(n) {
    if (!n) return !1;
    var r = n._valueTracker;
    if (!r) return !0;
    var s = r.getValue(), u = "";
    return n && (u = Ne(n) ? n.checked ? "true" : "false" : n.value), n = u, n !== s ? (r.setValue(n), !0) : !1;
  }
  function Bi(n) {
    if (n = n || (typeof document < "u" ? document : void 0), typeof n > "u") return null;
    try {
      return n.activeElement || n.body;
    } catch {
      return n.body;
    }
  }
  function tl(n, r) {
    var s = r.checked;
    return Q({}, r, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: s ?? n._wrapperState.initialChecked });
  }
  function Mf(n, r) {
    var s = r.defaultValue == null ? "" : r.defaultValue, u = r.checked != null ? r.checked : r.defaultChecked;
    s = xe(r.value != null ? r.value : s), n._wrapperState = { initialChecked: u, initialValue: s, controlled: r.type === "checkbox" || r.type === "radio" ? r.checked != null : r.value != null };
  }
  function Rf(n, r) {
    r = r.checked, r != null && E(n, "checked", r, !1);
  }
  function nl(n, r) {
    Rf(n, r);
    var s = xe(r.value), u = r.type;
    if (s != null) u === "number" ? (s === 0 && n.value === "" || n.value != s) && (n.value = "" + s) : n.value !== "" + s && (n.value = "" + s);
    else if (u === "submit" || u === "reset") {
      n.removeAttribute("value");
      return;
    }
    r.hasOwnProperty("value") ? rl(n, r.type, s) : r.hasOwnProperty("defaultValue") && rl(n, r.type, xe(r.defaultValue)), r.checked == null && r.defaultChecked != null && (n.defaultChecked = !!r.defaultChecked);
  }
  function Nf(n, r, s) {
    if (r.hasOwnProperty("value") || r.hasOwnProperty("defaultValue")) {
      var u = r.type;
      if (!(u !== "submit" && u !== "reset" || r.value !== void 0 && r.value !== null)) return;
      r = "" + n._wrapperState.initialValue, s || r === n.value || (n.value = r), n.defaultValue = r;
    }
    s = n.name, s !== "" && (n.name = ""), n.defaultChecked = !!n._wrapperState.initialChecked, s !== "" && (n.name = s);
  }
  function rl(n, r, s) {
    (r !== "number" || Bi(n.ownerDocument) !== n) && (s == null ? n.defaultValue = "" + n._wrapperState.initialValue : n.defaultValue !== "" + s && (n.defaultValue = "" + s));
  }
  var bo = Array.isArray;
  function Mr(n, r, s, u) {
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
  function ol(n, r) {
    if (r.dangerouslySetInnerHTML != null) throw Error(o(91));
    return Q({}, r, { value: void 0, defaultValue: void 0, children: "" + n._wrapperState.initialValue });
  }
  function Df(n, r) {
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
    n._wrapperState = { initialValue: xe(s) };
  }
  function jf(n, r) {
    var s = xe(r.value), u = xe(r.defaultValue);
    s != null && (s = "" + s, s !== n.value && (n.value = s), r.defaultValue == null && n.defaultValue !== s && (n.defaultValue = s)), u != null && (n.defaultValue = "" + u);
  }
  function If(n) {
    var r = n.textContent;
    r === n._wrapperState.initialValue && r !== "" && r !== null && (n.value = r);
  }
  function Ff(n) {
    switch (n) {
      case "svg":
        return "http://www.w3.org/2000/svg";
      case "math":
        return "http://www.w3.org/1998/Math/MathML";
      default:
        return "http://www.w3.org/1999/xhtml";
    }
  }
  function il(n, r) {
    return n == null || n === "http://www.w3.org/1999/xhtml" ? Ff(r) : n === "http://www.w3.org/2000/svg" && r === "foreignObject" ? "http://www.w3.org/1999/xhtml" : n;
  }
  var $i, Of = (function(n) {
    return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(r, s, u, h) {
      MSApp.execUnsafeLocalFunction(function() {
        return n(r, s, u, h);
      });
    } : n;
  })(function(n, r) {
    if (n.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in n) n.innerHTML = r;
    else {
      for ($i = $i || document.createElement("div"), $i.innerHTML = "<svg>" + r.valueOf().toString() + "</svg>", r = $i.firstChild; n.firstChild; ) n.removeChild(n.firstChild);
      for (; r.firstChild; ) n.appendChild(r.firstChild);
    }
  });
  function Co(n, r) {
    if (r) {
      var s = n.firstChild;
      if (s && s === n.lastChild && s.nodeType === 3) {
        s.nodeValue = r;
        return;
      }
    }
    n.textContent = r;
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
  }, xw = ["Webkit", "ms", "Moz", "O"];
  Object.keys(Po).forEach(function(n) {
    xw.forEach(function(r) {
      r = r + n.charAt(0).toUpperCase() + n.substring(1), Po[r] = Po[n];
    });
  });
  function Lf(n, r, s) {
    return r == null || typeof r == "boolean" || r === "" ? "" : s || typeof r != "number" || r === 0 || Po.hasOwnProperty(n) && Po[n] ? ("" + r).trim() : r + "px";
  }
  function Vf(n, r) {
    n = n.style;
    for (var s in r) if (r.hasOwnProperty(s)) {
      var u = s.indexOf("--") === 0, h = Lf(s, r[s], u);
      s === "float" && (s = "cssFloat"), u ? n.setProperty(s, h) : n[s] = h;
    }
  }
  var _w = Q({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
  function sl(n, r) {
    if (r) {
      if (_w[n] && (r.children != null || r.dangerouslySetInnerHTML != null)) throw Error(o(137, n));
      if (r.dangerouslySetInnerHTML != null) {
        if (r.children != null) throw Error(o(60));
        if (typeof r.dangerouslySetInnerHTML != "object" || !("__html" in r.dangerouslySetInnerHTML)) throw Error(o(61));
      }
      if (r.style != null && typeof r.style != "object") throw Error(o(62));
    }
  }
  function al(n, r) {
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
  var ll = null;
  function ul(n) {
    return n = n.target || n.srcElement || window, n.correspondingUseElement && (n = n.correspondingUseElement), n.nodeType === 3 ? n.parentNode : n;
  }
  var cl = null, Rr = null, Nr = null;
  function zf(n) {
    if (n = Xo(n)) {
      if (typeof cl != "function") throw Error(o(280));
      var r = n.stateNode;
      r && (r = ds(r), cl(n.stateNode, n.type, r));
    }
  }
  function Bf(n) {
    Rr ? Nr ? Nr.push(n) : Nr = [n] : Rr = n;
  }
  function $f() {
    if (Rr) {
      var n = Rr, r = Nr;
      if (Nr = Rr = null, zf(n), r) for (n = 0; n < r.length; n++) zf(r[n]);
    }
  }
  function Uf(n, r) {
    return n(r);
  }
  function Hf() {
  }
  var dl = !1;
  function Wf(n, r, s) {
    if (dl) return n(r, s);
    dl = !0;
    try {
      return Uf(n, r, s);
    } finally {
      dl = !1, (Rr !== null || Nr !== null) && (Hf(), $f());
    }
  }
  function Eo(n, r) {
    var s = n.stateNode;
    if (s === null) return null;
    var u = ds(s);
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
  var fl = !1;
  if (p) try {
    var Mo = {};
    Object.defineProperty(Mo, "passive", { get: function() {
      fl = !0;
    } }), window.addEventListener("test", Mo, Mo), window.removeEventListener("test", Mo, Mo);
  } catch {
    fl = !1;
  }
  function Tw(n, r, s, u, h, g, k, P, M) {
    var F = Array.prototype.slice.call(arguments, 3);
    try {
      r.apply(s, F);
    } catch (B) {
      this.onError(B);
    }
  }
  var Ro = !1, Ui = null, Hi = !1, pl = null, kw = { onError: function(n) {
    Ro = !0, Ui = n;
  } };
  function Aw(n, r, s, u, h, g, k, P, M) {
    Ro = !1, Ui = null, Tw.apply(kw, arguments);
  }
  function bw(n, r, s, u, h, g, k, P, M) {
    if (Aw.apply(this, arguments), Ro) {
      if (Ro) {
        var F = Ui;
        Ro = !1, Ui = null;
      } else throw Error(o(198));
      Hi || (Hi = !0, pl = F);
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
  function Gf(n) {
    if (n.tag === 13) {
      var r = n.memoizedState;
      if (r === null && (n = n.alternate, n !== null && (r = n.memoizedState)), r !== null) return r.dehydrated;
    }
    return null;
  }
  function Kf(n) {
    if (tr(n) !== n) throw Error(o(188));
  }
  function Cw(n) {
    var r = n.alternate;
    if (!r) {
      if (r = tr(n), r === null) throw Error(o(188));
      return r !== n ? null : n;
    }
    for (var s = n, u = r; ; ) {
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
          if (g === s) return Kf(h), n;
          if (g === u) return Kf(h), r;
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
    return s.stateNode.current === s ? n : r;
  }
  function Yf(n) {
    return n = Cw(n), n !== null ? Qf(n) : null;
  }
  function Qf(n) {
    if (n.tag === 5 || n.tag === 6) return n;
    for (n = n.child; n !== null; ) {
      var r = Qf(n);
      if (r !== null) return r;
      n = n.sibling;
    }
    return null;
  }
  var Xf = t.unstable_scheduleCallback, Zf = t.unstable_cancelCallback, Pw = t.unstable_shouldYield, Ew = t.unstable_requestPaint, Le = t.unstable_now, Mw = t.unstable_getCurrentPriorityLevel, ml = t.unstable_ImmediatePriority, Jf = t.unstable_UserBlockingPriority, Wi = t.unstable_NormalPriority, Rw = t.unstable_LowPriority, qf = t.unstable_IdlePriority, Gi = null, Yt = null;
  function Nw(n) {
    if (Yt && typeof Yt.onCommitFiberRoot == "function") try {
      Yt.onCommitFiberRoot(Gi, n, void 0, (n.current.flags & 128) === 128);
    } catch {
    }
  }
  var It = Math.clz32 ? Math.clz32 : Iw, Dw = Math.log, jw = Math.LN2;
  function Iw(n) {
    return n >>>= 0, n === 0 ? 32 : 31 - (Dw(n) / jw | 0) | 0;
  }
  var Ki = 64, Yi = 4194304;
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
  function Qi(n, r) {
    var s = n.pendingLanes;
    if (s === 0) return 0;
    var u = 0, h = n.suspendedLanes, g = n.pingedLanes, k = s & 268435455;
    if (k !== 0) {
      var P = k & ~h;
      P !== 0 ? u = No(P) : (g &= k, g !== 0 && (u = No(g)));
    } else k = s & ~h, k !== 0 ? u = No(k) : g !== 0 && (u = No(g));
    if (u === 0) return 0;
    if (r !== 0 && r !== u && (r & h) === 0 && (h = u & -u, g = r & -r, h >= g || h === 16 && (g & 4194240) !== 0)) return r;
    if ((u & 4) !== 0 && (u |= s & 16), r = n.entangledLanes, r !== 0) for (n = n.entanglements, r &= u; 0 < r; ) s = 31 - It(r), h = 1 << s, u |= n[s], r &= ~h;
    return u;
  }
  function Fw(n, r) {
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
  function Ow(n, r) {
    for (var s = n.suspendedLanes, u = n.pingedLanes, h = n.expirationTimes, g = n.pendingLanes; 0 < g; ) {
      var k = 31 - It(g), P = 1 << k, M = h[k];
      M === -1 ? ((P & s) === 0 || (P & u) !== 0) && (h[k] = Fw(P, r)) : M <= r && (n.expiredLanes |= P), g &= ~P;
    }
  }
  function hl(n) {
    return n = n.pendingLanes & -1073741825, n !== 0 ? n : n & 1073741824 ? 1073741824 : 0;
  }
  function ep() {
    var n = Ki;
    return Ki <<= 1, (Ki & 4194240) === 0 && (Ki = 64), n;
  }
  function yl(n) {
    for (var r = [], s = 0; 31 > s; s++) r.push(n);
    return r;
  }
  function Do(n, r, s) {
    n.pendingLanes |= r, r !== 536870912 && (n.suspendedLanes = 0, n.pingedLanes = 0), n = n.eventTimes, r = 31 - It(r), n[r] = s;
  }
  function Lw(n, r) {
    var s = n.pendingLanes & ~r;
    n.pendingLanes = r, n.suspendedLanes = 0, n.pingedLanes = 0, n.expiredLanes &= r, n.mutableReadLanes &= r, n.entangledLanes &= r, r = n.entanglements;
    var u = n.eventTimes;
    for (n = n.expirationTimes; 0 < s; ) {
      var h = 31 - It(s), g = 1 << h;
      r[h] = 0, u[h] = -1, n[h] = -1, s &= ~g;
    }
  }
  function gl(n, r) {
    var s = n.entangledLanes |= r;
    for (n = n.entanglements; s; ) {
      var u = 31 - It(s), h = 1 << u;
      h & r | n[u] & r && (n[u] |= r), s &= ~h;
    }
  }
  var _e = 0;
  function tp(n) {
    return n &= -n, 1 < n ? 4 < n ? (n & 268435455) !== 0 ? 16 : 536870912 : 4 : 1;
  }
  var np, vl, rp, op, ip, Sl = !1, Xi = [], xn = null, _n = null, Tn = null, jo = /* @__PURE__ */ new Map(), Io = /* @__PURE__ */ new Map(), kn = [], Vw = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
  function sp(n, r) {
    switch (n) {
      case "focusin":
      case "focusout":
        xn = null;
        break;
      case "dragenter":
      case "dragleave":
        _n = null;
        break;
      case "mouseover":
      case "mouseout":
        Tn = null;
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
  function Fo(n, r, s, u, h, g) {
    return n === null || n.nativeEvent !== g ? (n = { blockedOn: r, domEventName: s, eventSystemFlags: u, nativeEvent: g, targetContainers: [h] }, r !== null && (r = Xo(r), r !== null && vl(r)), n) : (n.eventSystemFlags |= u, r = n.targetContainers, h !== null && r.indexOf(h) === -1 && r.push(h), n);
  }
  function zw(n, r, s, u, h) {
    switch (r) {
      case "focusin":
        return xn = Fo(xn, n, r, s, u, h), !0;
      case "dragenter":
        return _n = Fo(_n, n, r, s, u, h), !0;
      case "mouseover":
        return Tn = Fo(Tn, n, r, s, u, h), !0;
      case "pointerover":
        var g = h.pointerId;
        return jo.set(g, Fo(jo.get(g) || null, n, r, s, u, h)), !0;
      case "gotpointercapture":
        return g = h.pointerId, Io.set(g, Fo(Io.get(g) || null, n, r, s, u, h)), !0;
    }
    return !1;
  }
  function ap(n) {
    var r = nr(n.target);
    if (r !== null) {
      var s = tr(r);
      if (s !== null) {
        if (r = s.tag, r === 13) {
          if (r = Gf(s), r !== null) {
            n.blockedOn = r, ip(n.priority, function() {
              rp(s);
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
  function Zi(n) {
    if (n.blockedOn !== null) return !1;
    for (var r = n.targetContainers; 0 < r.length; ) {
      var s = xl(n.domEventName, n.eventSystemFlags, r[0], n.nativeEvent);
      if (s === null) {
        s = n.nativeEvent;
        var u = new s.constructor(s.type, s);
        ll = u, s.target.dispatchEvent(u), ll = null;
      } else return r = Xo(s), r !== null && vl(r), n.blockedOn = s, !1;
      r.shift();
    }
    return !0;
  }
  function lp(n, r, s) {
    Zi(n) && s.delete(r);
  }
  function Bw() {
    Sl = !1, xn !== null && Zi(xn) && (xn = null), _n !== null && Zi(_n) && (_n = null), Tn !== null && Zi(Tn) && (Tn = null), jo.forEach(lp), Io.forEach(lp);
  }
  function Oo(n, r) {
    n.blockedOn === r && (n.blockedOn = null, Sl || (Sl = !0, t.unstable_scheduleCallback(t.unstable_NormalPriority, Bw)));
  }
  function Lo(n) {
    function r(h) {
      return Oo(h, n);
    }
    if (0 < Xi.length) {
      Oo(Xi[0], n);
      for (var s = 1; s < Xi.length; s++) {
        var u = Xi[s];
        u.blockedOn === n && (u.blockedOn = null);
      }
    }
    for (xn !== null && Oo(xn, n), _n !== null && Oo(_n, n), Tn !== null && Oo(Tn, n), jo.forEach(r), Io.forEach(r), s = 0; s < kn.length; s++) u = kn[s], u.blockedOn === n && (u.blockedOn = null);
    for (; 0 < kn.length && (s = kn[0], s.blockedOn === null); ) ap(s), s.blockedOn === null && kn.shift();
  }
  var Dr = N.ReactCurrentBatchConfig, Ji = !0;
  function $w(n, r, s, u) {
    var h = _e, g = Dr.transition;
    Dr.transition = null;
    try {
      _e = 1, wl(n, r, s, u);
    } finally {
      _e = h, Dr.transition = g;
    }
  }
  function Uw(n, r, s, u) {
    var h = _e, g = Dr.transition;
    Dr.transition = null;
    try {
      _e = 4, wl(n, r, s, u);
    } finally {
      _e = h, Dr.transition = g;
    }
  }
  function wl(n, r, s, u) {
    if (Ji) {
      var h = xl(n, r, s, u);
      if (h === null) Ll(n, r, u, qi, s), sp(n, u);
      else if (zw(h, n, r, s, u)) u.stopPropagation();
      else if (sp(n, u), r & 4 && -1 < Vw.indexOf(n)) {
        for (; h !== null; ) {
          var g = Xo(h);
          if (g !== null && np(g), g = xl(n, r, s, u), g === null && Ll(n, r, u, qi, s), g === h) break;
          h = g;
        }
        h !== null && u.stopPropagation();
      } else Ll(n, r, u, null, s);
    }
  }
  var qi = null;
  function xl(n, r, s, u) {
    if (qi = null, n = ul(u), n = nr(n), n !== null) if (r = tr(n), r === null) n = null;
    else if (s = r.tag, s === 13) {
      if (n = Gf(r), n !== null) return n;
      n = null;
    } else if (s === 3) {
      if (r.stateNode.current.memoizedState.isDehydrated) return r.tag === 3 ? r.stateNode.containerInfo : null;
      n = null;
    } else r !== n && (n = null);
    return qi = n, null;
  }
  function up(n) {
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
        switch (Mw()) {
          case ml:
            return 1;
          case Jf:
            return 4;
          case Wi:
          case Rw:
            return 16;
          case qf:
            return 536870912;
          default:
            return 16;
        }
      default:
        return 16;
    }
  }
  var An = null, _l = null, es = null;
  function cp() {
    if (es) return es;
    var n, r = _l, s = r.length, u, h = "value" in An ? An.value : An.textContent, g = h.length;
    for (n = 0; n < s && r[n] === h[n]; n++) ;
    var k = s - n;
    for (u = 1; u <= k && r[s - u] === h[g - u]; u++) ;
    return es = h.slice(n, 1 < u ? 1 - u : void 0);
  }
  function ts(n) {
    var r = n.keyCode;
    return "charCode" in n ? (n = n.charCode, n === 0 && r === 13 && (n = 13)) : n = r, n === 10 && (n = 13), 32 <= n || n === 13 ? n : 0;
  }
  function ns() {
    return !0;
  }
  function dp() {
    return !1;
  }
  function St(n) {
    function r(s, u, h, g, k) {
      this._reactName = s, this._targetInst = h, this.type = u, this.nativeEvent = g, this.target = k, this.currentTarget = null;
      for (var P in n) n.hasOwnProperty(P) && (s = n[P], this[P] = s ? s(g) : g[P]);
      return this.isDefaultPrevented = (g.defaultPrevented != null ? g.defaultPrevented : g.returnValue === !1) ? ns : dp, this.isPropagationStopped = dp, this;
    }
    return Q(r.prototype, { preventDefault: function() {
      this.defaultPrevented = !0;
      var s = this.nativeEvent;
      s && (s.preventDefault ? s.preventDefault() : typeof s.returnValue != "unknown" && (s.returnValue = !1), this.isDefaultPrevented = ns);
    }, stopPropagation: function() {
      var s = this.nativeEvent;
      s && (s.stopPropagation ? s.stopPropagation() : typeof s.cancelBubble != "unknown" && (s.cancelBubble = !0), this.isPropagationStopped = ns);
    }, persist: function() {
    }, isPersistent: ns }), r;
  }
  var jr = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(n) {
    return n.timeStamp || Date.now();
  }, defaultPrevented: 0, isTrusted: 0 }, Tl = St(jr), Vo = Q({}, jr, { view: 0, detail: 0 }), Hw = St(Vo), kl, Al, zo, rs = Q({}, Vo, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: Cl, button: 0, buttons: 0, relatedTarget: function(n) {
    return n.relatedTarget === void 0 ? n.fromElement === n.srcElement ? n.toElement : n.fromElement : n.relatedTarget;
  }, movementX: function(n) {
    return "movementX" in n ? n.movementX : (n !== zo && (zo && n.type === "mousemove" ? (kl = n.screenX - zo.screenX, Al = n.screenY - zo.screenY) : Al = kl = 0, zo = n), kl);
  }, movementY: function(n) {
    return "movementY" in n ? n.movementY : Al;
  } }), fp = St(rs), Ww = Q({}, rs, { dataTransfer: 0 }), Gw = St(Ww), Kw = Q({}, Vo, { relatedTarget: 0 }), bl = St(Kw), Yw = Q({}, jr, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), Qw = St(Yw), Xw = Q({}, jr, { clipboardData: function(n) {
    return "clipboardData" in n ? n.clipboardData : window.clipboardData;
  } }), Zw = St(Xw), Jw = Q({}, jr, { data: 0 }), pp = St(Jw), qw = {
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
  }, ex = {
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
  }, tx = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
  function nx(n) {
    var r = this.nativeEvent;
    return r.getModifierState ? r.getModifierState(n) : (n = tx[n]) ? !!r[n] : !1;
  }
  function Cl() {
    return nx;
  }
  var rx = Q({}, Vo, { key: function(n) {
    if (n.key) {
      var r = qw[n.key] || n.key;
      if (r !== "Unidentified") return r;
    }
    return n.type === "keypress" ? (n = ts(n), n === 13 ? "Enter" : String.fromCharCode(n)) : n.type === "keydown" || n.type === "keyup" ? ex[n.keyCode] || "Unidentified" : "";
  }, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: Cl, charCode: function(n) {
    return n.type === "keypress" ? ts(n) : 0;
  }, keyCode: function(n) {
    return n.type === "keydown" || n.type === "keyup" ? n.keyCode : 0;
  }, which: function(n) {
    return n.type === "keypress" ? ts(n) : n.type === "keydown" || n.type === "keyup" ? n.keyCode : 0;
  } }), ox = St(rx), ix = Q({}, rs, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), mp = St(ix), sx = Q({}, Vo, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: Cl }), ax = St(sx), lx = Q({}, jr, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), ux = St(lx), cx = Q({}, rs, {
    deltaX: function(n) {
      return "deltaX" in n ? n.deltaX : "wheelDeltaX" in n ? -n.wheelDeltaX : 0;
    },
    deltaY: function(n) {
      return "deltaY" in n ? n.deltaY : "wheelDeltaY" in n ? -n.wheelDeltaY : "wheelDelta" in n ? -n.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), dx = St(cx), fx = [9, 13, 27, 32], Pl = p && "CompositionEvent" in window, Bo = null;
  p && "documentMode" in document && (Bo = document.documentMode);
  var px = p && "TextEvent" in window && !Bo, hp = p && (!Pl || Bo && 8 < Bo && 11 >= Bo), yp = " ", gp = !1;
  function vp(n, r) {
    switch (n) {
      case "keyup":
        return fx.indexOf(r.keyCode) !== -1;
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
  function Sp(n) {
    return n = n.detail, typeof n == "object" && "data" in n ? n.data : null;
  }
  var Ir = !1;
  function mx(n, r) {
    switch (n) {
      case "compositionend":
        return Sp(r);
      case "keypress":
        return r.which !== 32 ? null : (gp = !0, yp);
      case "textInput":
        return n = r.data, n === yp && gp ? null : n;
      default:
        return null;
    }
  }
  function hx(n, r) {
    if (Ir) return n === "compositionend" || !Pl && vp(n, r) ? (n = cp(), es = _l = An = null, Ir = !1, n) : null;
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
        return hp && r.locale !== "ko" ? null : r.data;
      default:
        return null;
    }
  }
  var yx = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
  function wp(n) {
    var r = n && n.nodeName && n.nodeName.toLowerCase();
    return r === "input" ? !!yx[n.type] : r === "textarea";
  }
  function xp(n, r, s, u) {
    Bf(u), r = ls(r, "onChange"), 0 < r.length && (s = new Tl("onChange", "change", null, s, u), n.push({ event: s, listeners: r }));
  }
  var $o = null, Uo = null;
  function gx(n) {
    Vp(n, 0);
  }
  function os(n) {
    var r = zr(n);
    if (Ef(r)) return n;
  }
  function vx(n, r) {
    if (n === "change") return r;
  }
  var _p = !1;
  if (p) {
    var El;
    if (p) {
      var Ml = "oninput" in document;
      if (!Ml) {
        var Tp = document.createElement("div");
        Tp.setAttribute("oninput", "return;"), Ml = typeof Tp.oninput == "function";
      }
      El = Ml;
    } else El = !1;
    _p = El && (!document.documentMode || 9 < document.documentMode);
  }
  function kp() {
    $o && ($o.detachEvent("onpropertychange", Ap), Uo = $o = null);
  }
  function Ap(n) {
    if (n.propertyName === "value" && os(Uo)) {
      var r = [];
      xp(r, Uo, n, ul(n)), Wf(gx, r);
    }
  }
  function Sx(n, r, s) {
    n === "focusin" ? (kp(), $o = r, Uo = s, $o.attachEvent("onpropertychange", Ap)) : n === "focusout" && kp();
  }
  function wx(n) {
    if (n === "selectionchange" || n === "keyup" || n === "keydown") return os(Uo);
  }
  function xx(n, r) {
    if (n === "click") return os(r);
  }
  function _x(n, r) {
    if (n === "input" || n === "change") return os(r);
  }
  function Tx(n, r) {
    return n === r && (n !== 0 || 1 / n === 1 / r) || n !== n && r !== r;
  }
  var Ft = typeof Object.is == "function" ? Object.is : Tx;
  function Ho(n, r) {
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
  function bp(n) {
    for (; n && n.firstChild; ) n = n.firstChild;
    return n;
  }
  function Cp(n, r) {
    var s = bp(n);
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
      s = bp(s);
    }
  }
  function Pp(n, r) {
    return n && r ? n === r ? !0 : n && n.nodeType === 3 ? !1 : r && r.nodeType === 3 ? Pp(n, r.parentNode) : "contains" in n ? n.contains(r) : n.compareDocumentPosition ? !!(n.compareDocumentPosition(r) & 16) : !1 : !1;
  }
  function Ep() {
    for (var n = window, r = Bi(); r instanceof n.HTMLIFrameElement; ) {
      try {
        var s = typeof r.contentWindow.location.href == "string";
      } catch {
        s = !1;
      }
      if (s) n = r.contentWindow;
      else break;
      r = Bi(n.document);
    }
    return r;
  }
  function Rl(n) {
    var r = n && n.nodeName && n.nodeName.toLowerCase();
    return r && (r === "input" && (n.type === "text" || n.type === "search" || n.type === "tel" || n.type === "url" || n.type === "password") || r === "textarea" || n.contentEditable === "true");
  }
  function kx(n) {
    var r = Ep(), s = n.focusedElem, u = n.selectionRange;
    if (r !== s && s && s.ownerDocument && Pp(s.ownerDocument.documentElement, s)) {
      if (u !== null && Rl(s)) {
        if (r = u.start, n = u.end, n === void 0 && (n = r), "selectionStart" in s) s.selectionStart = r, s.selectionEnd = Math.min(n, s.value.length);
        else if (n = (r = s.ownerDocument || document) && r.defaultView || window, n.getSelection) {
          n = n.getSelection();
          var h = s.textContent.length, g = Math.min(u.start, h);
          u = u.end === void 0 ? g : Math.min(u.end, h), !n.extend && g > u && (h = u, u = g, g = h), h = Cp(s, g);
          var k = Cp(
            s,
            u
          );
          h && k && (n.rangeCount !== 1 || n.anchorNode !== h.node || n.anchorOffset !== h.offset || n.focusNode !== k.node || n.focusOffset !== k.offset) && (r = r.createRange(), r.setStart(h.node, h.offset), n.removeAllRanges(), g > u ? (n.addRange(r), n.extend(k.node, k.offset)) : (r.setEnd(k.node, k.offset), n.addRange(r)));
        }
      }
      for (r = [], n = s; n = n.parentNode; ) n.nodeType === 1 && r.push({ element: n, left: n.scrollLeft, top: n.scrollTop });
      for (typeof s.focus == "function" && s.focus(), s = 0; s < r.length; s++) n = r[s], n.element.scrollLeft = n.left, n.element.scrollTop = n.top;
    }
  }
  var Ax = p && "documentMode" in document && 11 >= document.documentMode, Fr = null, Nl = null, Wo = null, Dl = !1;
  function Mp(n, r, s) {
    var u = s.window === s ? s.document : s.nodeType === 9 ? s : s.ownerDocument;
    Dl || Fr == null || Fr !== Bi(u) || (u = Fr, "selectionStart" in u && Rl(u) ? u = { start: u.selectionStart, end: u.selectionEnd } : (u = (u.ownerDocument && u.ownerDocument.defaultView || window).getSelection(), u = { anchorNode: u.anchorNode, anchorOffset: u.anchorOffset, focusNode: u.focusNode, focusOffset: u.focusOffset }), Wo && Ho(Wo, u) || (Wo = u, u = ls(Nl, "onSelect"), 0 < u.length && (r = new Tl("onSelect", "select", null, r, s), n.push({ event: r, listeners: u }), r.target = Fr)));
  }
  function is(n, r) {
    var s = {};
    return s[n.toLowerCase()] = r.toLowerCase(), s["Webkit" + n] = "webkit" + r, s["Moz" + n] = "moz" + r, s;
  }
  var Or = { animationend: is("Animation", "AnimationEnd"), animationiteration: is("Animation", "AnimationIteration"), animationstart: is("Animation", "AnimationStart"), transitionend: is("Transition", "TransitionEnd") }, jl = {}, Rp = {};
  p && (Rp = document.createElement("div").style, "AnimationEvent" in window || (delete Or.animationend.animation, delete Or.animationiteration.animation, delete Or.animationstart.animation), "TransitionEvent" in window || delete Or.transitionend.transition);
  function ss(n) {
    if (jl[n]) return jl[n];
    if (!Or[n]) return n;
    var r = Or[n], s;
    for (s in r) if (r.hasOwnProperty(s) && s in Rp) return jl[n] = r[s];
    return n;
  }
  var Np = ss("animationend"), Dp = ss("animationiteration"), jp = ss("animationstart"), Ip = ss("transitionend"), Fp = /* @__PURE__ */ new Map(), Op = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
  function bn(n, r) {
    Fp.set(n, r), f(r, [n]);
  }
  for (var Il = 0; Il < Op.length; Il++) {
    var Fl = Op[Il], bx = Fl.toLowerCase(), Cx = Fl[0].toUpperCase() + Fl.slice(1);
    bn(bx, "on" + Cx);
  }
  bn(Np, "onAnimationEnd"), bn(Dp, "onAnimationIteration"), bn(jp, "onAnimationStart"), bn("dblclick", "onDoubleClick"), bn("focusin", "onFocus"), bn("focusout", "onBlur"), bn(Ip, "onTransitionEnd"), d("onMouseEnter", ["mouseout", "mouseover"]), d("onMouseLeave", ["mouseout", "mouseover"]), d("onPointerEnter", ["pointerout", "pointerover"]), d("onPointerLeave", ["pointerout", "pointerover"]), f("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), f("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), f("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]), f("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), f("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), f("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
  var Go = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), Px = new Set("cancel close invalid load scroll toggle".split(" ").concat(Go));
  function Lp(n, r, s) {
    var u = n.type || "unknown-event";
    n.currentTarget = s, bw(u, r, void 0, n), n.currentTarget = null;
  }
  function Vp(n, r) {
    r = (r & 4) !== 0;
    for (var s = 0; s < n.length; s++) {
      var u = n[s], h = u.event;
      u = u.listeners;
      e: {
        var g = void 0;
        if (r) for (var k = u.length - 1; 0 <= k; k--) {
          var P = u[k], M = P.instance, F = P.currentTarget;
          if (P = P.listener, M !== g && h.isPropagationStopped()) break e;
          Lp(h, P, F), g = M;
        }
        else for (k = 0; k < u.length; k++) {
          if (P = u[k], M = P.instance, F = P.currentTarget, P = P.listener, M !== g && h.isPropagationStopped()) break e;
          Lp(h, P, F), g = M;
        }
      }
    }
    if (Hi) throw n = pl, Hi = !1, pl = null, n;
  }
  function Me(n, r) {
    var s = r[Hl];
    s === void 0 && (s = r[Hl] = /* @__PURE__ */ new Set());
    var u = n + "__bubble";
    s.has(u) || (zp(r, n, 2, !1), s.add(u));
  }
  function Ol(n, r, s) {
    var u = 0;
    r && (u |= 4), zp(s, n, u, r);
  }
  var as = "_reactListening" + Math.random().toString(36).slice(2);
  function Ko(n) {
    if (!n[as]) {
      n[as] = !0, i.forEach(function(s) {
        s !== "selectionchange" && (Px.has(s) || Ol(s, !1, n), Ol(s, !0, n));
      });
      var r = n.nodeType === 9 ? n : n.ownerDocument;
      r === null || r[as] || (r[as] = !0, Ol("selectionchange", !1, r));
    }
  }
  function zp(n, r, s, u) {
    switch (up(r)) {
      case 1:
        var h = $w;
        break;
      case 4:
        h = Uw;
        break;
      default:
        h = wl;
    }
    s = h.bind(null, r, s, n), h = void 0, !fl || r !== "touchstart" && r !== "touchmove" && r !== "wheel" || (h = !0), u ? h !== void 0 ? n.addEventListener(r, s, { capture: !0, passive: h }) : n.addEventListener(r, s, !0) : h !== void 0 ? n.addEventListener(r, s, { passive: h }) : n.addEventListener(r, s, !1);
  }
  function Ll(n, r, s, u, h) {
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
    Wf(function() {
      var F = g, B = ul(s), U = [];
      e: {
        var z = Fp.get(n);
        if (z !== void 0) {
          var q = Tl, ne = n;
          switch (n) {
            case "keypress":
              if (ts(s) === 0) break e;
            case "keydown":
            case "keyup":
              q = ox;
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
              q = fp;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              q = Gw;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              q = ax;
              break;
            case Np:
            case Dp:
            case jp:
              q = Qw;
              break;
            case Ip:
              q = ux;
              break;
            case "scroll":
              q = Hw;
              break;
            case "wheel":
              q = dx;
              break;
            case "copy":
            case "cut":
            case "paste":
              q = Zw;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              q = mp;
          }
          var oe = (r & 4) !== 0, Ve = !oe && n === "scroll", j = oe ? z !== null ? z + "Capture" : null : z;
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
          if (z = n === "mouseover" || n === "pointerover", q = n === "mouseout" || n === "pointerout", z && s !== ll && (ne = s.relatedTarget || s.fromElement) && (nr(ne) || ne[an])) break e;
          if ((q || z) && (z = B.window === B ? B : (z = B.ownerDocument) ? z.defaultView || z.parentWindow : window, q ? (ne = s.relatedTarget || s.toElement, q = F, ne = ne ? nr(ne) : null, ne !== null && (Ve = tr(ne), ne !== Ve || ne.tag !== 5 && ne.tag !== 6) && (ne = null)) : (q = null, ne = F), q !== ne)) {
            if (oe = fp, G = "onMouseLeave", j = "onMouseEnter", R = "mouse", (n === "pointerout" || n === "pointerover") && (oe = mp, G = "onPointerLeave", j = "onPointerEnter", R = "pointer"), Ve = q == null ? z : zr(q), I = ne == null ? z : zr(ne), z = new oe(G, R + "leave", q, s, B), z.target = Ve, z.relatedTarget = I, G = null, nr(B) === F && (oe = new oe(j, R + "enter", ne, s, B), oe.target = I, oe.relatedTarget = Ve, G = oe), Ve = G, q && ne) t: {
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
            q !== null && Bp(U, z, q, oe, !1), ne !== null && Ve !== null && Bp(U, Ve, ne, oe, !0);
          }
        }
        e: {
          if (z = F ? zr(F) : window, q = z.nodeName && z.nodeName.toLowerCase(), q === "select" || q === "input" && z.type === "file") var ie = vx;
          else if (wp(z)) if (_p) ie = _x;
          else {
            ie = wx;
            var ae = Sx;
          }
          else (q = z.nodeName) && q.toLowerCase() === "input" && (z.type === "checkbox" || z.type === "radio") && (ie = xx);
          if (ie && (ie = ie(n, F))) {
            xp(U, ie, s, B);
            break e;
          }
          ae && ae(n, z, F), n === "focusout" && (ae = z._wrapperState) && ae.controlled && z.type === "number" && rl(z, "number", z.value);
        }
        switch (ae = F ? zr(F) : window, n) {
          case "focusin":
            (wp(ae) || ae.contentEditable === "true") && (Fr = ae, Nl = F, Wo = null);
            break;
          case "focusout":
            Wo = Nl = Fr = null;
            break;
          case "mousedown":
            Dl = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            Dl = !1, Mp(U, s, B);
            break;
          case "selectionchange":
            if (Ax) break;
          case "keydown":
          case "keyup":
            Mp(U, s, B);
        }
        var le;
        if (Pl) e: {
          switch (n) {
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
        else Ir ? vp(n, s) && (ue = "onCompositionEnd") : n === "keydown" && s.keyCode === 229 && (ue = "onCompositionStart");
        ue && (hp && s.locale !== "ko" && (Ir || ue !== "onCompositionStart" ? ue === "onCompositionEnd" && Ir && (le = cp()) : (An = B, _l = "value" in An ? An.value : An.textContent, Ir = !0)), ae = ls(F, ue), 0 < ae.length && (ue = new pp(ue, n, null, s, B), U.push({ event: ue, listeners: ae }), le ? ue.data = le : (le = Sp(s), le !== null && (ue.data = le)))), (le = px ? mx(n, s) : hx(n, s)) && (F = ls(F, "onBeforeInput"), 0 < F.length && (B = new pp("onBeforeInput", "beforeinput", null, s, B), U.push({ event: B, listeners: F }), B.data = le));
      }
      Vp(U, r);
    });
  }
  function Yo(n, r, s) {
    return { instance: n, listener: r, currentTarget: s };
  }
  function ls(n, r) {
    for (var s = r + "Capture", u = []; n !== null; ) {
      var h = n, g = h.stateNode;
      h.tag === 5 && g !== null && (h = g, g = Eo(n, s), g != null && u.unshift(Yo(n, g, h)), g = Eo(n, r), g != null && u.push(Yo(n, g, h))), n = n.return;
    }
    return u;
  }
  function Lr(n) {
    if (n === null) return null;
    do
      n = n.return;
    while (n && n.tag !== 5);
    return n || null;
  }
  function Bp(n, r, s, u, h) {
    for (var g = r._reactName, k = []; s !== null && s !== u; ) {
      var P = s, M = P.alternate, F = P.stateNode;
      if (M !== null && M === u) break;
      P.tag === 5 && F !== null && (P = F, h ? (M = Eo(s, g), M != null && k.unshift(Yo(s, M, P))) : h || (M = Eo(s, g), M != null && k.push(Yo(s, M, P)))), s = s.return;
    }
    k.length !== 0 && n.push({ event: r, listeners: k });
  }
  var Ex = /\r\n?/g, Mx = /\u0000|\uFFFD/g;
  function $p(n) {
    return (typeof n == "string" ? n : "" + n).replace(Ex, `
`).replace(Mx, "");
  }
  function us(n, r, s) {
    if (r = $p(r), $p(n) !== r && s) throw Error(o(425));
  }
  function cs() {
  }
  var Vl = null, zl = null;
  function Bl(n, r) {
    return n === "textarea" || n === "noscript" || typeof r.children == "string" || typeof r.children == "number" || typeof r.dangerouslySetInnerHTML == "object" && r.dangerouslySetInnerHTML !== null && r.dangerouslySetInnerHTML.__html != null;
  }
  var $l = typeof setTimeout == "function" ? setTimeout : void 0, Rx = typeof clearTimeout == "function" ? clearTimeout : void 0, Up = typeof Promise == "function" ? Promise : void 0, Nx = typeof queueMicrotask == "function" ? queueMicrotask : typeof Up < "u" ? function(n) {
    return Up.resolve(null).then(n).catch(Dx);
  } : $l;
  function Dx(n) {
    setTimeout(function() {
      throw n;
    });
  }
  function Ul(n, r) {
    var s = r, u = 0;
    do {
      var h = s.nextSibling;
      if (n.removeChild(s), h && h.nodeType === 8) if (s = h.data, s === "/$") {
        if (u === 0) {
          n.removeChild(h), Lo(r);
          return;
        }
        u--;
      } else s !== "$" && s !== "$?" && s !== "$!" || u++;
      s = h;
    } while (s);
    Lo(r);
  }
  function Cn(n) {
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
  function Hp(n) {
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
  var Vr = Math.random().toString(36).slice(2), Qt = "__reactFiber$" + Vr, Qo = "__reactProps$" + Vr, an = "__reactContainer$" + Vr, Hl = "__reactEvents$" + Vr, jx = "__reactListeners$" + Vr, Ix = "__reactHandles$" + Vr;
  function nr(n) {
    var r = n[Qt];
    if (r) return r;
    for (var s = n.parentNode; s; ) {
      if (r = s[an] || s[Qt]) {
        if (s = r.alternate, r.child !== null || s !== null && s.child !== null) for (n = Hp(n); n !== null; ) {
          if (s = n[Qt]) return s;
          n = Hp(n);
        }
        return r;
      }
      n = s, s = n.parentNode;
    }
    return null;
  }
  function Xo(n) {
    return n = n[Qt] || n[an], !n || n.tag !== 5 && n.tag !== 6 && n.tag !== 13 && n.tag !== 3 ? null : n;
  }
  function zr(n) {
    if (n.tag === 5 || n.tag === 6) return n.stateNode;
    throw Error(o(33));
  }
  function ds(n) {
    return n[Qo] || null;
  }
  var Wl = [], Br = -1;
  function Pn(n) {
    return { current: n };
  }
  function Re(n) {
    0 > Br || (n.current = Wl[Br], Wl[Br] = null, Br--);
  }
  function Ee(n, r) {
    Br++, Wl[Br] = n.current, n.current = r;
  }
  var En = {}, et = Pn(En), dt = Pn(!1), rr = En;
  function $r(n, r) {
    var s = n.type.contextTypes;
    if (!s) return En;
    var u = n.stateNode;
    if (u && u.__reactInternalMemoizedUnmaskedChildContext === r) return u.__reactInternalMemoizedMaskedChildContext;
    var h = {}, g;
    for (g in s) h[g] = r[g];
    return u && (n = n.stateNode, n.__reactInternalMemoizedUnmaskedChildContext = r, n.__reactInternalMemoizedMaskedChildContext = h), h;
  }
  function ft(n) {
    return n = n.childContextTypes, n != null;
  }
  function fs() {
    Re(dt), Re(et);
  }
  function Wp(n, r, s) {
    if (et.current !== En) throw Error(o(168));
    Ee(et, r), Ee(dt, s);
  }
  function Gp(n, r, s) {
    var u = n.stateNode;
    if (r = r.childContextTypes, typeof u.getChildContext != "function") return s;
    u = u.getChildContext();
    for (var h in u) if (!(h in r)) throw Error(o(108, Pe(n) || "Unknown", h));
    return Q({}, s, u);
  }
  function ps(n) {
    return n = (n = n.stateNode) && n.__reactInternalMemoizedMergedChildContext || En, rr = et.current, Ee(et, n), Ee(dt, dt.current), !0;
  }
  function Kp(n, r, s) {
    var u = n.stateNode;
    if (!u) throw Error(o(169));
    s ? (n = Gp(n, r, rr), u.__reactInternalMemoizedMergedChildContext = n, Re(dt), Re(et), Ee(et, n)) : Re(dt), Ee(dt, s);
  }
  var ln = null, ms = !1, Gl = !1;
  function Yp(n) {
    ln === null ? ln = [n] : ln.push(n);
  }
  function Fx(n) {
    ms = !0, Yp(n);
  }
  function Mn() {
    if (!Gl && ln !== null) {
      Gl = !0;
      var n = 0, r = _e;
      try {
        var s = ln;
        for (_e = 1; n < s.length; n++) {
          var u = s[n];
          do
            u = u(!0);
          while (u !== null);
        }
        ln = null, ms = !1;
      } catch (h) {
        throw ln !== null && (ln = ln.slice(n + 1)), Xf(ml, Mn), h;
      } finally {
        _e = r, Gl = !1;
      }
    }
    return null;
  }
  var Ur = [], Hr = 0, hs = null, ys = 0, kt = [], At = 0, or = null, un = 1, cn = "";
  function ir(n, r) {
    Ur[Hr++] = ys, Ur[Hr++] = hs, hs = n, ys = r;
  }
  function Qp(n, r, s) {
    kt[At++] = un, kt[At++] = cn, kt[At++] = or, or = n;
    var u = un;
    n = cn;
    var h = 32 - It(u) - 1;
    u &= ~(1 << h), s += 1;
    var g = 32 - It(r) + h;
    if (30 < g) {
      var k = h - h % 5;
      g = (u & (1 << k) - 1).toString(32), u >>= k, h -= k, un = 1 << 32 - It(r) + h | s << h | u, cn = g + n;
    } else un = 1 << g | s << h | u, cn = n;
  }
  function Kl(n) {
    n.return !== null && (ir(n, 1), Qp(n, 1, 0));
  }
  function Yl(n) {
    for (; n === hs; ) hs = Ur[--Hr], Ur[Hr] = null, ys = Ur[--Hr], Ur[Hr] = null;
    for (; n === or; ) or = kt[--At], kt[At] = null, cn = kt[--At], kt[At] = null, un = kt[--At], kt[At] = null;
  }
  var wt = null, xt = null, De = !1, Ot = null;
  function Xp(n, r) {
    var s = Et(5, null, null, 0);
    s.elementType = "DELETED", s.stateNode = r, s.return = n, r = n.deletions, r === null ? (n.deletions = [s], n.flags |= 16) : r.push(s);
  }
  function Zp(n, r) {
    switch (n.tag) {
      case 5:
        var s = n.type;
        return r = r.nodeType !== 1 || s.toLowerCase() !== r.nodeName.toLowerCase() ? null : r, r !== null ? (n.stateNode = r, wt = n, xt = Cn(r.firstChild), !0) : !1;
      case 6:
        return r = n.pendingProps === "" || r.nodeType !== 3 ? null : r, r !== null ? (n.stateNode = r, wt = n, xt = null, !0) : !1;
      case 13:
        return r = r.nodeType !== 8 ? null : r, r !== null ? (s = or !== null ? { id: un, overflow: cn } : null, n.memoizedState = { dehydrated: r, treeContext: s, retryLane: 1073741824 }, s = Et(18, null, null, 0), s.stateNode = r, s.return = n, n.child = s, wt = n, xt = null, !0) : !1;
      default:
        return !1;
    }
  }
  function Ql(n) {
    return (n.mode & 1) !== 0 && (n.flags & 128) === 0;
  }
  function Xl(n) {
    if (De) {
      var r = xt;
      if (r) {
        var s = r;
        if (!Zp(n, r)) {
          if (Ql(n)) throw Error(o(418));
          r = Cn(s.nextSibling);
          var u = wt;
          r && Zp(n, r) ? Xp(u, s) : (n.flags = n.flags & -4097 | 2, De = !1, wt = n);
        }
      } else {
        if (Ql(n)) throw Error(o(418));
        n.flags = n.flags & -4097 | 2, De = !1, wt = n;
      }
    }
  }
  function Jp(n) {
    for (n = n.return; n !== null && n.tag !== 5 && n.tag !== 3 && n.tag !== 13; ) n = n.return;
    wt = n;
  }
  function gs(n) {
    if (n !== wt) return !1;
    if (!De) return Jp(n), De = !0, !1;
    var r;
    if ((r = n.tag !== 3) && !(r = n.tag !== 5) && (r = n.type, r = r !== "head" && r !== "body" && !Bl(n.type, n.memoizedProps)), r && (r = xt)) {
      if (Ql(n)) throw qp(), Error(o(418));
      for (; r; ) Xp(n, r), r = Cn(r.nextSibling);
    }
    if (Jp(n), n.tag === 13) {
      if (n = n.memoizedState, n = n !== null ? n.dehydrated : null, !n) throw Error(o(317));
      e: {
        for (n = n.nextSibling, r = 0; n; ) {
          if (n.nodeType === 8) {
            var s = n.data;
            if (s === "/$") {
              if (r === 0) {
                xt = Cn(n.nextSibling);
                break e;
              }
              r--;
            } else s !== "$" && s !== "$!" && s !== "$?" || r++;
          }
          n = n.nextSibling;
        }
        xt = null;
      }
    } else xt = wt ? Cn(n.stateNode.nextSibling) : null;
    return !0;
  }
  function qp() {
    for (var n = xt; n; ) n = Cn(n.nextSibling);
  }
  function Wr() {
    xt = wt = null, De = !1;
  }
  function Zl(n) {
    Ot === null ? Ot = [n] : Ot.push(n);
  }
  var Ox = N.ReactCurrentBatchConfig;
  function Zo(n, r, s) {
    if (n = s.ref, n !== null && typeof n != "function" && typeof n != "object") {
      if (s._owner) {
        if (s = s._owner, s) {
          if (s.tag !== 1) throw Error(o(309));
          var u = s.stateNode;
        }
        if (!u) throw Error(o(147, n));
        var h = u, g = "" + n;
        return r !== null && r.ref !== null && typeof r.ref == "function" && r.ref._stringRef === g ? r.ref : (r = function(k) {
          var P = h.refs;
          k === null ? delete P[g] : P[g] = k;
        }, r._stringRef = g, r);
      }
      if (typeof n != "string") throw Error(o(284));
      if (!s._owner) throw Error(o(290, n));
    }
    return n;
  }
  function vs(n, r) {
    throw n = Object.prototype.toString.call(r), Error(o(31, n === "[object Object]" ? "object with keys {" + Object.keys(r).join(", ") + "}" : n));
  }
  function em(n) {
    var r = n._init;
    return r(n._payload);
  }
  function tm(n) {
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
      return j = Ln(j, R), j.index = 0, j.sibling = null, j;
    }
    function g(j, R, I) {
      return j.index = I, n ? (I = j.alternate, I !== null ? (I = I.index, I < R ? (j.flags |= 2, R) : I) : (j.flags |= 2, R)) : (j.flags |= 1048576, R);
    }
    function k(j) {
      return n && j.alternate === null && (j.flags |= 2), j;
    }
    function P(j, R, I, G) {
      return R === null || R.tag !== 6 ? (R = $u(I, j.mode, G), R.return = j, R) : (R = h(R, I), R.return = j, R);
    }
    function M(j, R, I, G) {
      var ie = I.type;
      return ie === H ? B(j, R, I.props.children, G, I.key) : R !== null && (R.elementType === ie || typeof ie == "object" && ie !== null && ie.$$typeof === ee && em(ie) === R.type) ? (G = h(R, I.props), G.ref = Zo(j, R, I), G.return = j, G) : (G = $s(I.type, I.key, I.props, null, j.mode, G), G.ref = Zo(j, R, I), G.return = j, G);
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
            return I = $s(R.type, R.key, R.props, null, j.mode, I), I.ref = Zo(j, null, R), I.return = j, I;
          case W:
            return R = Uu(R, j.mode, I), R.return = j, R;
          case ee:
            var G = R._init;
            return U(j, G(R._payload), I);
        }
        if (bo(R) || J(R)) return R = pr(R, j.mode, I, null), R.return = j, R;
        vs(j, R);
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
        vs(j, I);
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
        vs(R, G);
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
        n && le && Se.alternate === null && r(j, le), R = g(Se, R, ue), ae === null ? ie = Se : ae.sibling = Se, ae = Se, le = Ke;
      }
      if (ue === I.length) return s(j, le), De && ir(j, ue), ie;
      if (le === null) {
        for (; ue < I.length; ue++) le = U(j, I[ue], G), le !== null && (R = g(le, R, ue), ae === null ? ie = le : ae.sibling = le, ae = le);
        return De && ir(j, ue), ie;
      }
      for (le = u(j, le); ue < I.length; ue++) Ke = q(le, j, ue, I[ue], G), Ke !== null && (n && Ke.alternate !== null && le.delete(Ke.key === null ? ue : Ke.key), R = g(Ke, R, ue), ae === null ? ie = Ke : ae.sibling = Ke, ae = Ke);
      return n && le.forEach(function(Vn) {
        return r(j, Vn);
      }), De && ir(j, ue), ie;
    }
    function oe(j, R, I, G) {
      var ie = J(I);
      if (typeof ie != "function") throw Error(o(150));
      if (I = ie.call(I), I == null) throw Error(o(151));
      for (var ae = ie = null, le = R, ue = R = 0, Ke = null, Se = I.next(); le !== null && !Se.done; ue++, Se = I.next()) {
        le.index > ue ? (Ke = le, le = null) : Ke = le.sibling;
        var Vn = z(j, le, Se.value, G);
        if (Vn === null) {
          le === null && (le = Ke);
          break;
        }
        n && le && Vn.alternate === null && r(j, le), R = g(Vn, R, ue), ae === null ? ie = Vn : ae.sibling = Vn, ae = Vn, le = Ke;
      }
      if (Se.done) return s(
        j,
        le
      ), De && ir(j, ue), ie;
      if (le === null) {
        for (; !Se.done; ue++, Se = I.next()) Se = U(j, Se.value, G), Se !== null && (R = g(Se, R, ue), ae === null ? ie = Se : ae.sibling = Se, ae = Se);
        return De && ir(j, ue), ie;
      }
      for (le = u(j, le); !Se.done; ue++, Se = I.next()) Se = q(le, j, ue, Se.value, G), Se !== null && (n && Se.alternate !== null && le.delete(Se.key === null ? ue : Se.key), R = g(Se, R, ue), ae === null ? ie = Se : ae.sibling = Se, ae = Se);
      return n && le.forEach(function(y1) {
        return r(j, y1);
      }), De && ir(j, ue), ie;
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
                  } else if (ae.elementType === ie || typeof ie == "object" && ie !== null && ie.$$typeof === ee && em(ie) === ae.type) {
                    s(j, ae.sibling), R = h(ae, I.props), R.ref = Zo(j, ae, I), R.return = j, j = R;
                    break e;
                  }
                  s(j, ae);
                  break;
                } else r(j, ae);
                ae = ae.sibling;
              }
              I.type === H ? (R = pr(I.props.children, j.mode, G, I.key), R.return = j, j = R) : (G = $s(I.type, I.key, I.props, null, j.mode, G), G.ref = Zo(j, R, I), G.return = j, j = G);
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
        vs(j, I);
      }
      return typeof I == "string" && I !== "" || typeof I == "number" ? (I = "" + I, R !== null && R.tag === 6 ? (s(j, R.sibling), R = h(R, I), R.return = j, j = R) : (s(j, R), R = $u(I, j.mode, G), R.return = j, j = R), k(j)) : s(j, R);
    }
    return Ve;
  }
  var Gr = tm(!0), nm = tm(!1), Ss = Pn(null), ws = null, Kr = null, Jl = null;
  function ql() {
    Jl = Kr = ws = null;
  }
  function eu(n) {
    var r = Ss.current;
    Re(Ss), n._currentValue = r;
  }
  function tu(n, r, s) {
    for (; n !== null; ) {
      var u = n.alternate;
      if ((n.childLanes & r) !== r ? (n.childLanes |= r, u !== null && (u.childLanes |= r)) : u !== null && (u.childLanes & r) !== r && (u.childLanes |= r), n === s) break;
      n = n.return;
    }
  }
  function Yr(n, r) {
    ws = n, Jl = Kr = null, n = n.dependencies, n !== null && n.firstContext !== null && ((n.lanes & r) !== 0 && (pt = !0), n.firstContext = null);
  }
  function bt(n) {
    var r = n._currentValue;
    if (Jl !== n) if (n = { context: n, memoizedValue: r, next: null }, Kr === null) {
      if (ws === null) throw Error(o(308));
      Kr = n, ws.dependencies = { lanes: 0, firstContext: n };
    } else Kr = Kr.next = n;
    return r;
  }
  var sr = null;
  function nu(n) {
    sr === null ? sr = [n] : sr.push(n);
  }
  function rm(n, r, s, u) {
    var h = r.interleaved;
    return h === null ? (s.next = s, nu(r)) : (s.next = h.next, h.next = s), r.interleaved = s, dn(n, u);
  }
  function dn(n, r) {
    n.lanes |= r;
    var s = n.alternate;
    for (s !== null && (s.lanes |= r), s = n, n = n.return; n !== null; ) n.childLanes |= r, s = n.alternate, s !== null && (s.childLanes |= r), s = n, n = n.return;
    return s.tag === 3 ? s.stateNode : null;
  }
  var Rn = !1;
  function ru(n) {
    n.updateQueue = { baseState: n.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
  }
  function om(n, r) {
    n = n.updateQueue, r.updateQueue === n && (r.updateQueue = { baseState: n.baseState, firstBaseUpdate: n.firstBaseUpdate, lastBaseUpdate: n.lastBaseUpdate, shared: n.shared, effects: n.effects });
  }
  function fn(n, r) {
    return { eventTime: n, lane: r, tag: 0, payload: null, callback: null, next: null };
  }
  function Nn(n, r, s) {
    var u = n.updateQueue;
    if (u === null) return null;
    if (u = u.shared, (he & 2) !== 0) {
      var h = u.pending;
      return h === null ? r.next = r : (r.next = h.next, h.next = r), u.pending = r, dn(n, s);
    }
    return h = u.interleaved, h === null ? (r.next = r, nu(u)) : (r.next = h.next, h.next = r), u.interleaved = r, dn(n, s);
  }
  function xs(n, r, s) {
    if (r = r.updateQueue, r !== null && (r = r.shared, (s & 4194240) !== 0)) {
      var u = r.lanes;
      u &= n.pendingLanes, s |= u, r.lanes = s, gl(n, s);
    }
  }
  function im(n, r) {
    var s = n.updateQueue, u = n.alternate;
    if (u !== null && (u = u.updateQueue, s === u)) {
      var h = null, g = null;
      if (s = s.firstBaseUpdate, s !== null) {
        do {
          var k = { eventTime: s.eventTime, lane: s.lane, tag: s.tag, payload: s.payload, callback: s.callback, next: null };
          g === null ? h = g = k : g = g.next = k, s = s.next;
        } while (s !== null);
        g === null ? h = g = r : g = g.next = r;
      } else h = g = r;
      s = { baseState: u.baseState, firstBaseUpdate: h, lastBaseUpdate: g, shared: u.shared, effects: u.effects }, n.updateQueue = s;
      return;
    }
    n = s.lastBaseUpdate, n === null ? s.firstBaseUpdate = r : n.next = r, s.lastBaseUpdate = r;
  }
  function _s(n, r, s, u) {
    var h = n.updateQueue;
    Rn = !1;
    var g = h.firstBaseUpdate, k = h.lastBaseUpdate, P = h.shared.pending;
    if (P !== null) {
      h.shared.pending = null;
      var M = P, F = M.next;
      M.next = null, k === null ? g = F : k.next = F, k = M;
      var B = n.alternate;
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
            var ne = n, oe = P;
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
                Rn = !0;
            }
          }
          P.callback !== null && P.lane !== 0 && (n.flags |= 64, z = h.effects, z === null ? h.effects = [P] : z.push(P));
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
      ur |= k, n.lanes = k, n.memoizedState = U;
    }
  }
  function sm(n, r, s) {
    if (n = r.effects, r.effects = null, n !== null) for (r = 0; r < n.length; r++) {
      var u = n[r], h = u.callback;
      if (h !== null) {
        if (u.callback = null, u = s, typeof h != "function") throw Error(o(191, h));
        h.call(u);
      }
    }
  }
  var Jo = {}, Xt = Pn(Jo), qo = Pn(Jo), ei = Pn(Jo);
  function ar(n) {
    if (n === Jo) throw Error(o(174));
    return n;
  }
  function ou(n, r) {
    switch (Ee(ei, r), Ee(qo, n), Ee(Xt, Jo), n = r.nodeType, n) {
      case 9:
      case 11:
        r = (r = r.documentElement) ? r.namespaceURI : il(null, "");
        break;
      default:
        n = n === 8 ? r.parentNode : r, r = n.namespaceURI || null, n = n.tagName, r = il(r, n);
    }
    Re(Xt), Ee(Xt, r);
  }
  function Qr() {
    Re(Xt), Re(qo), Re(ei);
  }
  function am(n) {
    ar(ei.current);
    var r = ar(Xt.current), s = il(r, n.type);
    r !== s && (Ee(qo, n), Ee(Xt, s));
  }
  function iu(n) {
    qo.current === n && (Re(Xt), Re(qo));
  }
  var je = Pn(0);
  function Ts(n) {
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
  var su = [];
  function au() {
    for (var n = 0; n < su.length; n++) su[n]._workInProgressVersionPrimary = null;
    su.length = 0;
  }
  var ks = N.ReactCurrentDispatcher, lu = N.ReactCurrentBatchConfig, lr = 0, Ie = null, $e = null, We = null, As = !1, ti = !1, ni = 0, Lx = 0;
  function tt() {
    throw Error(o(321));
  }
  function uu(n, r) {
    if (r === null) return !1;
    for (var s = 0; s < r.length && s < n.length; s++) if (!Ft(n[s], r[s])) return !1;
    return !0;
  }
  function cu(n, r, s, u, h, g) {
    if (lr = g, Ie = r, r.memoizedState = null, r.updateQueue = null, r.lanes = 0, ks.current = n === null || n.memoizedState === null ? $x : Ux, n = s(u, h), ti) {
      g = 0;
      do {
        if (ti = !1, ni = 0, 25 <= g) throw Error(o(301));
        g += 1, We = $e = null, r.updateQueue = null, ks.current = Hx, n = s(u, h);
      } while (ti);
    }
    if (ks.current = Ps, r = $e !== null && $e.next !== null, lr = 0, We = $e = Ie = null, As = !1, r) throw Error(o(300));
    return n;
  }
  function du() {
    var n = ni !== 0;
    return ni = 0, n;
  }
  function Zt() {
    var n = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
    return We === null ? Ie.memoizedState = We = n : We = We.next = n, We;
  }
  function Ct() {
    if ($e === null) {
      var n = Ie.alternate;
      n = n !== null ? n.memoizedState : null;
    } else n = $e.next;
    var r = We === null ? Ie.memoizedState : We.next;
    if (r !== null) We = r, $e = n;
    else {
      if (n === null) throw Error(o(310));
      $e = n, n = { memoizedState: $e.memoizedState, baseState: $e.baseState, baseQueue: $e.baseQueue, queue: $e.queue, next: null }, We === null ? Ie.memoizedState = We = n : We = We.next = n;
    }
    return We;
  }
  function ri(n, r) {
    return typeof r == "function" ? r(n) : r;
  }
  function fu(n) {
    var r = Ct(), s = r.queue;
    if (s === null) throw Error(o(311));
    s.lastRenderedReducer = n;
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
        if ((lr & B) === B) M !== null && (M = M.next = { lane: 0, action: F.action, hasEagerState: F.hasEagerState, eagerState: F.eagerState, next: null }), u = F.hasEagerState ? F.eagerState : n(u, F.action);
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
    if (n = s.interleaved, n !== null) {
      h = n;
      do
        g = h.lane, Ie.lanes |= g, ur |= g, h = h.next;
      while (h !== n);
    } else h === null && (s.lanes = 0);
    return [r.memoizedState, s.dispatch];
  }
  function pu(n) {
    var r = Ct(), s = r.queue;
    if (s === null) throw Error(o(311));
    s.lastRenderedReducer = n;
    var u = s.dispatch, h = s.pending, g = r.memoizedState;
    if (h !== null) {
      s.pending = null;
      var k = h = h.next;
      do
        g = n(g, k.action), k = k.next;
      while (k !== h);
      Ft(g, r.memoizedState) || (pt = !0), r.memoizedState = g, r.baseQueue === null && (r.baseState = g), s.lastRenderedState = g;
    }
    return [g, u];
  }
  function lm() {
  }
  function um(n, r) {
    var s = Ie, u = Ct(), h = r(), g = !Ft(u.memoizedState, h);
    if (g && (u.memoizedState = h, pt = !0), u = u.queue, mu(fm.bind(null, s, u, n), [n]), u.getSnapshot !== r || g || We !== null && We.memoizedState.tag & 1) {
      if (s.flags |= 2048, oi(9, dm.bind(null, s, u, h, r), void 0, null), Ge === null) throw Error(o(349));
      (lr & 30) !== 0 || cm(s, r, h);
    }
    return h;
  }
  function cm(n, r, s) {
    n.flags |= 16384, n = { getSnapshot: r, value: s }, r = Ie.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, Ie.updateQueue = r, r.stores = [n]) : (s = r.stores, s === null ? r.stores = [n] : s.push(n));
  }
  function dm(n, r, s, u) {
    r.value = s, r.getSnapshot = u, pm(r) && mm(n);
  }
  function fm(n, r, s) {
    return s(function() {
      pm(r) && mm(n);
    });
  }
  function pm(n) {
    var r = n.getSnapshot;
    n = n.value;
    try {
      var s = r();
      return !Ft(n, s);
    } catch {
      return !0;
    }
  }
  function mm(n) {
    var r = dn(n, 1);
    r !== null && Bt(r, n, 1, -1);
  }
  function hm(n) {
    var r = Zt();
    return typeof n == "function" && (n = n()), r.memoizedState = r.baseState = n, n = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: ri, lastRenderedState: n }, r.queue = n, n = n.dispatch = Bx.bind(null, Ie, n), [r.memoizedState, n];
  }
  function oi(n, r, s, u) {
    return n = { tag: n, create: r, destroy: s, deps: u, next: null }, r = Ie.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, Ie.updateQueue = r, r.lastEffect = n.next = n) : (s = r.lastEffect, s === null ? r.lastEffect = n.next = n : (u = s.next, s.next = n, n.next = u, r.lastEffect = n)), n;
  }
  function ym() {
    return Ct().memoizedState;
  }
  function bs(n, r, s, u) {
    var h = Zt();
    Ie.flags |= n, h.memoizedState = oi(1 | r, s, void 0, u === void 0 ? null : u);
  }
  function Cs(n, r, s, u) {
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
    Ie.flags |= n, h.memoizedState = oi(1 | r, s, g, u);
  }
  function gm(n, r) {
    return bs(8390656, 8, n, r);
  }
  function mu(n, r) {
    return Cs(2048, 8, n, r);
  }
  function vm(n, r) {
    return Cs(4, 2, n, r);
  }
  function Sm(n, r) {
    return Cs(4, 4, n, r);
  }
  function wm(n, r) {
    if (typeof r == "function") return n = n(), r(n), function() {
      r(null);
    };
    if (r != null) return n = n(), r.current = n, function() {
      r.current = null;
    };
  }
  function xm(n, r, s) {
    return s = s != null ? s.concat([n]) : null, Cs(4, 4, wm.bind(null, r, n), s);
  }
  function hu() {
  }
  function _m(n, r) {
    var s = Ct();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && uu(r, u[1]) ? u[0] : (s.memoizedState = [n, r], n);
  }
  function Tm(n, r) {
    var s = Ct();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && uu(r, u[1]) ? u[0] : (n = n(), s.memoizedState = [n, r], n);
  }
  function km(n, r, s) {
    return (lr & 21) === 0 ? (n.baseState && (n.baseState = !1, pt = !0), n.memoizedState = s) : (Ft(s, r) || (s = ep(), Ie.lanes |= s, ur |= s, n.baseState = !0), r);
  }
  function Vx(n, r) {
    var s = _e;
    _e = s !== 0 && 4 > s ? s : 4, n(!0);
    var u = lu.transition;
    lu.transition = {};
    try {
      n(!1), r();
    } finally {
      _e = s, lu.transition = u;
    }
  }
  function Am() {
    return Ct().memoizedState;
  }
  function zx(n, r, s) {
    var u = Fn(n);
    if (s = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null }, bm(n)) Cm(r, s);
    else if (s = rm(n, r, s, u), s !== null) {
      var h = st();
      Bt(s, n, u, h), Pm(s, r, u);
    }
  }
  function Bx(n, r, s) {
    var u = Fn(n), h = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null };
    if (bm(n)) Cm(r, h);
    else {
      var g = n.alternate;
      if (n.lanes === 0 && (g === null || g.lanes === 0) && (g = r.lastRenderedReducer, g !== null)) try {
        var k = r.lastRenderedState, P = g(k, s);
        if (h.hasEagerState = !0, h.eagerState = P, Ft(P, k)) {
          var M = r.interleaved;
          M === null ? (h.next = h, nu(r)) : (h.next = M.next, M.next = h), r.interleaved = h;
          return;
        }
      } catch {
      } finally {
      }
      s = rm(n, r, h, u), s !== null && (h = st(), Bt(s, n, u, h), Pm(s, r, u));
    }
  }
  function bm(n) {
    var r = n.alternate;
    return n === Ie || r !== null && r === Ie;
  }
  function Cm(n, r) {
    ti = As = !0;
    var s = n.pending;
    s === null ? r.next = r : (r.next = s.next, s.next = r), n.pending = r;
  }
  function Pm(n, r, s) {
    if ((s & 4194240) !== 0) {
      var u = r.lanes;
      u &= n.pendingLanes, s |= u, r.lanes = s, gl(n, s);
    }
  }
  var Ps = { readContext: bt, useCallback: tt, useContext: tt, useEffect: tt, useImperativeHandle: tt, useInsertionEffect: tt, useLayoutEffect: tt, useMemo: tt, useReducer: tt, useRef: tt, useState: tt, useDebugValue: tt, useDeferredValue: tt, useTransition: tt, useMutableSource: tt, useSyncExternalStore: tt, useId: tt, unstable_isNewReconciler: !1 }, $x = { readContext: bt, useCallback: function(n, r) {
    return Zt().memoizedState = [n, r === void 0 ? null : r], n;
  }, useContext: bt, useEffect: gm, useImperativeHandle: function(n, r, s) {
    return s = s != null ? s.concat([n]) : null, bs(
      4194308,
      4,
      wm.bind(null, r, n),
      s
    );
  }, useLayoutEffect: function(n, r) {
    return bs(4194308, 4, n, r);
  }, useInsertionEffect: function(n, r) {
    return bs(4, 2, n, r);
  }, useMemo: function(n, r) {
    var s = Zt();
    return r = r === void 0 ? null : r, n = n(), s.memoizedState = [n, r], n;
  }, useReducer: function(n, r, s) {
    var u = Zt();
    return r = s !== void 0 ? s(r) : r, u.memoizedState = u.baseState = r, n = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: n, lastRenderedState: r }, u.queue = n, n = n.dispatch = zx.bind(null, Ie, n), [u.memoizedState, n];
  }, useRef: function(n) {
    var r = Zt();
    return n = { current: n }, r.memoizedState = n;
  }, useState: hm, useDebugValue: hu, useDeferredValue: function(n) {
    return Zt().memoizedState = n;
  }, useTransition: function() {
    var n = hm(!1), r = n[0];
    return n = Vx.bind(null, n[1]), Zt().memoizedState = n, [r, n];
  }, useMutableSource: function() {
  }, useSyncExternalStore: function(n, r, s) {
    var u = Ie, h = Zt();
    if (De) {
      if (s === void 0) throw Error(o(407));
      s = s();
    } else {
      if (s = r(), Ge === null) throw Error(o(349));
      (lr & 30) !== 0 || cm(u, r, s);
    }
    h.memoizedState = s;
    var g = { value: s, getSnapshot: r };
    return h.queue = g, gm(fm.bind(
      null,
      u,
      g,
      n
    ), [n]), u.flags |= 2048, oi(9, dm.bind(null, u, g, s, r), void 0, null), s;
  }, useId: function() {
    var n = Zt(), r = Ge.identifierPrefix;
    if (De) {
      var s = cn, u = un;
      s = (u & ~(1 << 32 - It(u) - 1)).toString(32) + s, r = ":" + r + "R" + s, s = ni++, 0 < s && (r += "H" + s.toString(32)), r += ":";
    } else s = Lx++, r = ":" + r + "r" + s.toString(32) + ":";
    return n.memoizedState = r;
  }, unstable_isNewReconciler: !1 }, Ux = {
    readContext: bt,
    useCallback: _m,
    useContext: bt,
    useEffect: mu,
    useImperativeHandle: xm,
    useInsertionEffect: vm,
    useLayoutEffect: Sm,
    useMemo: Tm,
    useReducer: fu,
    useRef: ym,
    useState: function() {
      return fu(ri);
    },
    useDebugValue: hu,
    useDeferredValue: function(n) {
      var r = Ct();
      return km(r, $e.memoizedState, n);
    },
    useTransition: function() {
      var n = fu(ri)[0], r = Ct().memoizedState;
      return [n, r];
    },
    useMutableSource: lm,
    useSyncExternalStore: um,
    useId: Am,
    unstable_isNewReconciler: !1
  }, Hx = { readContext: bt, useCallback: _m, useContext: bt, useEffect: mu, useImperativeHandle: xm, useInsertionEffect: vm, useLayoutEffect: Sm, useMemo: Tm, useReducer: pu, useRef: ym, useState: function() {
    return pu(ri);
  }, useDebugValue: hu, useDeferredValue: function(n) {
    var r = Ct();
    return $e === null ? r.memoizedState = n : km(r, $e.memoizedState, n);
  }, useTransition: function() {
    var n = pu(ri)[0], r = Ct().memoizedState;
    return [n, r];
  }, useMutableSource: lm, useSyncExternalStore: um, useId: Am, unstable_isNewReconciler: !1 };
  function Lt(n, r) {
    if (n && n.defaultProps) {
      r = Q({}, r), n = n.defaultProps;
      for (var s in n) r[s] === void 0 && (r[s] = n[s]);
      return r;
    }
    return r;
  }
  function yu(n, r, s, u) {
    r = n.memoizedState, s = s(u, r), s = s == null ? r : Q({}, r, s), n.memoizedState = s, n.lanes === 0 && (n.updateQueue.baseState = s);
  }
  var Es = { isMounted: function(n) {
    return (n = n._reactInternals) ? tr(n) === n : !1;
  }, enqueueSetState: function(n, r, s) {
    n = n._reactInternals;
    var u = st(), h = Fn(n), g = fn(u, h);
    g.payload = r, s != null && (g.callback = s), r = Nn(n, g, h), r !== null && (Bt(r, n, h, u), xs(r, n, h));
  }, enqueueReplaceState: function(n, r, s) {
    n = n._reactInternals;
    var u = st(), h = Fn(n), g = fn(u, h);
    g.tag = 1, g.payload = r, s != null && (g.callback = s), r = Nn(n, g, h), r !== null && (Bt(r, n, h, u), xs(r, n, h));
  }, enqueueForceUpdate: function(n, r) {
    n = n._reactInternals;
    var s = st(), u = Fn(n), h = fn(s, u);
    h.tag = 2, r != null && (h.callback = r), r = Nn(n, h, u), r !== null && (Bt(r, n, u, s), xs(r, n, u));
  } };
  function Em(n, r, s, u, h, g, k) {
    return n = n.stateNode, typeof n.shouldComponentUpdate == "function" ? n.shouldComponentUpdate(u, g, k) : r.prototype && r.prototype.isPureReactComponent ? !Ho(s, u) || !Ho(h, g) : !0;
  }
  function Mm(n, r, s) {
    var u = !1, h = En, g = r.contextType;
    return typeof g == "object" && g !== null ? g = bt(g) : (h = ft(r) ? rr : et.current, u = r.contextTypes, g = (u = u != null) ? $r(n, h) : En), r = new r(s, g), n.memoizedState = r.state !== null && r.state !== void 0 ? r.state : null, r.updater = Es, n.stateNode = r, r._reactInternals = n, u && (n = n.stateNode, n.__reactInternalMemoizedUnmaskedChildContext = h, n.__reactInternalMemoizedMaskedChildContext = g), r;
  }
  function Rm(n, r, s, u) {
    n = r.state, typeof r.componentWillReceiveProps == "function" && r.componentWillReceiveProps(s, u), typeof r.UNSAFE_componentWillReceiveProps == "function" && r.UNSAFE_componentWillReceiveProps(s, u), r.state !== n && Es.enqueueReplaceState(r, r.state, null);
  }
  function gu(n, r, s, u) {
    var h = n.stateNode;
    h.props = s, h.state = n.memoizedState, h.refs = {}, ru(n);
    var g = r.contextType;
    typeof g == "object" && g !== null ? h.context = bt(g) : (g = ft(r) ? rr : et.current, h.context = $r(n, g)), h.state = n.memoizedState, g = r.getDerivedStateFromProps, typeof g == "function" && (yu(n, r, g, s), h.state = n.memoizedState), typeof r.getDerivedStateFromProps == "function" || typeof h.getSnapshotBeforeUpdate == "function" || typeof h.UNSAFE_componentWillMount != "function" && typeof h.componentWillMount != "function" || (r = h.state, typeof h.componentWillMount == "function" && h.componentWillMount(), typeof h.UNSAFE_componentWillMount == "function" && h.UNSAFE_componentWillMount(), r !== h.state && Es.enqueueReplaceState(h, h.state, null), _s(n, s, h, u), h.state = n.memoizedState), typeof h.componentDidMount == "function" && (n.flags |= 4194308);
  }
  function Xr(n, r) {
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
    return { value: n, source: r, stack: h, digest: null };
  }
  function vu(n, r, s) {
    return { value: n, source: null, stack: s ?? null, digest: r ?? null };
  }
  function Su(n, r) {
    try {
      console.error(r.value);
    } catch (s) {
      setTimeout(function() {
        throw s;
      });
    }
  }
  var Wx = typeof WeakMap == "function" ? WeakMap : Map;
  function Nm(n, r, s) {
    s = fn(-1, s), s.tag = 3, s.payload = { element: null };
    var u = r.value;
    return s.callback = function() {
      Fs || (Fs = !0, ju = u), Su(n, r);
    }, s;
  }
  function Dm(n, r, s) {
    s = fn(-1, s), s.tag = 3;
    var u = n.type.getDerivedStateFromError;
    if (typeof u == "function") {
      var h = r.value;
      s.payload = function() {
        return u(h);
      }, s.callback = function() {
        Su(n, r);
      };
    }
    var g = n.stateNode;
    return g !== null && typeof g.componentDidCatch == "function" && (s.callback = function() {
      Su(n, r), typeof u != "function" && (jn === null ? jn = /* @__PURE__ */ new Set([this]) : jn.add(this));
      var k = r.stack;
      this.componentDidCatch(r.value, { componentStack: k !== null ? k : "" });
    }), s;
  }
  function jm(n, r, s) {
    var u = n.pingCache;
    if (u === null) {
      u = n.pingCache = new Wx();
      var h = /* @__PURE__ */ new Set();
      u.set(r, h);
    } else h = u.get(r), h === void 0 && (h = /* @__PURE__ */ new Set(), u.set(r, h));
    h.has(s) || (h.add(s), n = i1.bind(null, n, r, s), r.then(n, n));
  }
  function Im(n) {
    do {
      var r;
      if ((r = n.tag === 13) && (r = n.memoizedState, r = r !== null ? r.dehydrated !== null : !0), r) return n;
      n = n.return;
    } while (n !== null);
    return null;
  }
  function Fm(n, r, s, u, h) {
    return (n.mode & 1) === 0 ? (n === r ? n.flags |= 65536 : (n.flags |= 128, s.flags |= 131072, s.flags &= -52805, s.tag === 1 && (s.alternate === null ? s.tag = 17 : (r = fn(-1, 1), r.tag = 2, Nn(s, r, 1))), s.lanes |= 1), n) : (n.flags |= 65536, n.lanes = h, n);
  }
  var Gx = N.ReactCurrentOwner, pt = !1;
  function it(n, r, s, u) {
    r.child = n === null ? nm(r, null, s, u) : Gr(r, n.child, s, u);
  }
  function Om(n, r, s, u, h) {
    s = s.render;
    var g = r.ref;
    return Yr(r, h), u = cu(n, r, s, u, g, h), s = du(), n !== null && !pt ? (r.updateQueue = n.updateQueue, r.flags &= -2053, n.lanes &= ~h, pn(n, r, h)) : (De && s && Kl(r), r.flags |= 1, it(n, r, u, h), r.child);
  }
  function Lm(n, r, s, u, h) {
    if (n === null) {
      var g = s.type;
      return typeof g == "function" && !Bu(g) && g.defaultProps === void 0 && s.compare === null && s.defaultProps === void 0 ? (r.tag = 15, r.type = g, Vm(n, r, g, u, h)) : (n = $s(s.type, null, u, r, r.mode, h), n.ref = r.ref, n.return = r, r.child = n);
    }
    if (g = n.child, (n.lanes & h) === 0) {
      var k = g.memoizedProps;
      if (s = s.compare, s = s !== null ? s : Ho, s(k, u) && n.ref === r.ref) return pn(n, r, h);
    }
    return r.flags |= 1, n = Ln(g, u), n.ref = r.ref, n.return = r, r.child = n;
  }
  function Vm(n, r, s, u, h) {
    if (n !== null) {
      var g = n.memoizedProps;
      if (Ho(g, u) && n.ref === r.ref) if (pt = !1, r.pendingProps = u = g, (n.lanes & h) !== 0) (n.flags & 131072) !== 0 && (pt = !0);
      else return r.lanes = n.lanes, pn(n, r, h);
    }
    return wu(n, r, s, u, h);
  }
  function zm(n, r, s) {
    var u = r.pendingProps, h = u.children, g = n !== null ? n.memoizedState : null;
    if (u.mode === "hidden") if ((r.mode & 1) === 0) r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, Ee(Jr, _t), _t |= s;
    else {
      if ((s & 1073741824) === 0) return n = g !== null ? g.baseLanes | s : s, r.lanes = r.childLanes = 1073741824, r.memoizedState = { baseLanes: n, cachePool: null, transitions: null }, r.updateQueue = null, Ee(Jr, _t), _t |= n, null;
      r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, u = g !== null ? g.baseLanes : s, Ee(Jr, _t), _t |= u;
    }
    else g !== null ? (u = g.baseLanes | s, r.memoizedState = null) : u = s, Ee(Jr, _t), _t |= u;
    return it(n, r, h, s), r.child;
  }
  function Bm(n, r) {
    var s = r.ref;
    (n === null && s !== null || n !== null && n.ref !== s) && (r.flags |= 512, r.flags |= 2097152);
  }
  function wu(n, r, s, u, h) {
    var g = ft(s) ? rr : et.current;
    return g = $r(r, g), Yr(r, h), s = cu(n, r, s, u, g, h), u = du(), n !== null && !pt ? (r.updateQueue = n.updateQueue, r.flags &= -2053, n.lanes &= ~h, pn(n, r, h)) : (De && u && Kl(r), r.flags |= 1, it(n, r, s, h), r.child);
  }
  function $m(n, r, s, u, h) {
    if (ft(s)) {
      var g = !0;
      ps(r);
    } else g = !1;
    if (Yr(r, h), r.stateNode === null) Rs(n, r), Mm(r, s, u), gu(r, s, u, h), u = !0;
    else if (n === null) {
      var k = r.stateNode, P = r.memoizedProps;
      k.props = P;
      var M = k.context, F = s.contextType;
      typeof F == "object" && F !== null ? F = bt(F) : (F = ft(s) ? rr : et.current, F = $r(r, F));
      var B = s.getDerivedStateFromProps, U = typeof B == "function" || typeof k.getSnapshotBeforeUpdate == "function";
      U || typeof k.UNSAFE_componentWillReceiveProps != "function" && typeof k.componentWillReceiveProps != "function" || (P !== u || M !== F) && Rm(r, k, u, F), Rn = !1;
      var z = r.memoizedState;
      k.state = z, _s(r, u, k, h), M = r.memoizedState, P !== u || z !== M || dt.current || Rn ? (typeof B == "function" && (yu(r, s, B, u), M = r.memoizedState), (P = Rn || Em(r, s, P, u, z, M, F)) ? (U || typeof k.UNSAFE_componentWillMount != "function" && typeof k.componentWillMount != "function" || (typeof k.componentWillMount == "function" && k.componentWillMount(), typeof k.UNSAFE_componentWillMount == "function" && k.UNSAFE_componentWillMount()), typeof k.componentDidMount == "function" && (r.flags |= 4194308)) : (typeof k.componentDidMount == "function" && (r.flags |= 4194308), r.memoizedProps = u, r.memoizedState = M), k.props = u, k.state = M, k.context = F, u = P) : (typeof k.componentDidMount == "function" && (r.flags |= 4194308), u = !1);
    } else {
      k = r.stateNode, om(n, r), P = r.memoizedProps, F = r.type === r.elementType ? P : Lt(r.type, P), k.props = F, U = r.pendingProps, z = k.context, M = s.contextType, typeof M == "object" && M !== null ? M = bt(M) : (M = ft(s) ? rr : et.current, M = $r(r, M));
      var q = s.getDerivedStateFromProps;
      (B = typeof q == "function" || typeof k.getSnapshotBeforeUpdate == "function") || typeof k.UNSAFE_componentWillReceiveProps != "function" && typeof k.componentWillReceiveProps != "function" || (P !== U || z !== M) && Rm(r, k, u, M), Rn = !1, z = r.memoizedState, k.state = z, _s(r, u, k, h);
      var ne = r.memoizedState;
      P !== U || z !== ne || dt.current || Rn ? (typeof q == "function" && (yu(r, s, q, u), ne = r.memoizedState), (F = Rn || Em(r, s, F, u, z, ne, M) || !1) ? (B || typeof k.UNSAFE_componentWillUpdate != "function" && typeof k.componentWillUpdate != "function" || (typeof k.componentWillUpdate == "function" && k.componentWillUpdate(u, ne, M), typeof k.UNSAFE_componentWillUpdate == "function" && k.UNSAFE_componentWillUpdate(u, ne, M)), typeof k.componentDidUpdate == "function" && (r.flags |= 4), typeof k.getSnapshotBeforeUpdate == "function" && (r.flags |= 1024)) : (typeof k.componentDidUpdate != "function" || P === n.memoizedProps && z === n.memoizedState || (r.flags |= 4), typeof k.getSnapshotBeforeUpdate != "function" || P === n.memoizedProps && z === n.memoizedState || (r.flags |= 1024), r.memoizedProps = u, r.memoizedState = ne), k.props = u, k.state = ne, k.context = M, u = F) : (typeof k.componentDidUpdate != "function" || P === n.memoizedProps && z === n.memoizedState || (r.flags |= 4), typeof k.getSnapshotBeforeUpdate != "function" || P === n.memoizedProps && z === n.memoizedState || (r.flags |= 1024), u = !1);
    }
    return xu(n, r, s, u, g, h);
  }
  function xu(n, r, s, u, h, g) {
    Bm(n, r);
    var k = (r.flags & 128) !== 0;
    if (!u && !k) return h && Kp(r, s, !1), pn(n, r, g);
    u = r.stateNode, Gx.current = r;
    var P = k && typeof s.getDerivedStateFromError != "function" ? null : u.render();
    return r.flags |= 1, n !== null && k ? (r.child = Gr(r, n.child, null, g), r.child = Gr(r, null, P, g)) : it(n, r, P, g), r.memoizedState = u.state, h && Kp(r, s, !0), r.child;
  }
  function Um(n) {
    var r = n.stateNode;
    r.pendingContext ? Wp(n, r.pendingContext, r.pendingContext !== r.context) : r.context && Wp(n, r.context, !1), ou(n, r.containerInfo);
  }
  function Hm(n, r, s, u, h) {
    return Wr(), Zl(h), r.flags |= 256, it(n, r, s, u), r.child;
  }
  var _u = { dehydrated: null, treeContext: null, retryLane: 0 };
  function Tu(n) {
    return { baseLanes: n, cachePool: null, transitions: null };
  }
  function Wm(n, r, s) {
    var u = r.pendingProps, h = je.current, g = !1, k = (r.flags & 128) !== 0, P;
    if ((P = k) || (P = n !== null && n.memoizedState === null ? !1 : (h & 2) !== 0), P ? (g = !0, r.flags &= -129) : (n === null || n.memoizedState !== null) && (h |= 1), Ee(je, h & 1), n === null)
      return Xl(r), n = r.memoizedState, n !== null && (n = n.dehydrated, n !== null) ? ((r.mode & 1) === 0 ? r.lanes = 1 : n.data === "$!" ? r.lanes = 8 : r.lanes = 1073741824, null) : (k = u.children, n = u.fallback, g ? (u = r.mode, g = r.child, k = { mode: "hidden", children: k }, (u & 1) === 0 && g !== null ? (g.childLanes = 0, g.pendingProps = k) : g = Us(k, u, 0, null), n = pr(n, u, s, null), g.return = r, n.return = r, g.sibling = n, r.child = g, r.child.memoizedState = Tu(s), r.memoizedState = _u, n) : ku(r, k));
    if (h = n.memoizedState, h !== null && (P = h.dehydrated, P !== null)) return Kx(n, r, k, u, P, h, s);
    if (g) {
      g = u.fallback, k = r.mode, h = n.child, P = h.sibling;
      var M = { mode: "hidden", children: u.children };
      return (k & 1) === 0 && r.child !== h ? (u = r.child, u.childLanes = 0, u.pendingProps = M, r.deletions = null) : (u = Ln(h, M), u.subtreeFlags = h.subtreeFlags & 14680064), P !== null ? g = Ln(P, g) : (g = pr(g, k, s, null), g.flags |= 2), g.return = r, u.return = r, u.sibling = g, r.child = u, u = g, g = r.child, k = n.child.memoizedState, k = k === null ? Tu(s) : { baseLanes: k.baseLanes | s, cachePool: null, transitions: k.transitions }, g.memoizedState = k, g.childLanes = n.childLanes & ~s, r.memoizedState = _u, u;
    }
    return g = n.child, n = g.sibling, u = Ln(g, { mode: "visible", children: u.children }), (r.mode & 1) === 0 && (u.lanes = s), u.return = r, u.sibling = null, n !== null && (s = r.deletions, s === null ? (r.deletions = [n], r.flags |= 16) : s.push(n)), r.child = u, r.memoizedState = null, u;
  }
  function ku(n, r) {
    return r = Us({ mode: "visible", children: r }, n.mode, 0, null), r.return = n, n.child = r;
  }
  function Ms(n, r, s, u) {
    return u !== null && Zl(u), Gr(r, n.child, null, s), n = ku(r, r.pendingProps.children), n.flags |= 2, r.memoizedState = null, n;
  }
  function Kx(n, r, s, u, h, g, k) {
    if (s)
      return r.flags & 256 ? (r.flags &= -257, u = vu(Error(o(422))), Ms(n, r, k, u)) : r.memoizedState !== null ? (r.child = n.child, r.flags |= 128, null) : (g = u.fallback, h = r.mode, u = Us({ mode: "visible", children: u.children }, h, 0, null), g = pr(g, h, k, null), g.flags |= 2, u.return = r, g.return = r, u.sibling = g, r.child = u, (r.mode & 1) !== 0 && Gr(r, n.child, null, k), r.child.memoizedState = Tu(k), r.memoizedState = _u, g);
    if ((r.mode & 1) === 0) return Ms(n, r, k, null);
    if (h.data === "$!") {
      if (u = h.nextSibling && h.nextSibling.dataset, u) var P = u.dgst;
      return u = P, g = Error(o(419)), u = vu(g, u, void 0), Ms(n, r, k, u);
    }
    if (P = (k & n.childLanes) !== 0, pt || P) {
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
        h = (h & (u.suspendedLanes | k)) !== 0 ? 0 : h, h !== 0 && h !== g.retryLane && (g.retryLane = h, dn(n, h), Bt(u, n, h, -1));
      }
      return zu(), u = vu(Error(o(421))), Ms(n, r, k, u);
    }
    return h.data === "$?" ? (r.flags |= 128, r.child = n.child, r = s1.bind(null, n), h._reactRetry = r, null) : (n = g.treeContext, xt = Cn(h.nextSibling), wt = r, De = !0, Ot = null, n !== null && (kt[At++] = un, kt[At++] = cn, kt[At++] = or, un = n.id, cn = n.overflow, or = r), r = ku(r, u.children), r.flags |= 4096, r);
  }
  function Gm(n, r, s) {
    n.lanes |= r;
    var u = n.alternate;
    u !== null && (u.lanes |= r), tu(n.return, r, s);
  }
  function Au(n, r, s, u, h) {
    var g = n.memoizedState;
    g === null ? n.memoizedState = { isBackwards: r, rendering: null, renderingStartTime: 0, last: u, tail: s, tailMode: h } : (g.isBackwards = r, g.rendering = null, g.renderingStartTime = 0, g.last = u, g.tail = s, g.tailMode = h);
  }
  function Km(n, r, s) {
    var u = r.pendingProps, h = u.revealOrder, g = u.tail;
    if (it(n, r, u.children, s), u = je.current, (u & 2) !== 0) u = u & 1 | 2, r.flags |= 128;
    else {
      if (n !== null && (n.flags & 128) !== 0) e: for (n = r.child; n !== null; ) {
        if (n.tag === 13) n.memoizedState !== null && Gm(n, s, r);
        else if (n.tag === 19) Gm(n, s, r);
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
        for (s = r.child, h = null; s !== null; ) n = s.alternate, n !== null && Ts(n) === null && (h = s), s = s.sibling;
        s = h, s === null ? (h = r.child, r.child = null) : (h = s.sibling, s.sibling = null), Au(r, !1, h, s, g);
        break;
      case "backwards":
        for (s = null, h = r.child, r.child = null; h !== null; ) {
          if (n = h.alternate, n !== null && Ts(n) === null) {
            r.child = h;
            break;
          }
          n = h.sibling, h.sibling = s, s = h, h = n;
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
  function Rs(n, r) {
    (r.mode & 1) === 0 && n !== null && (n.alternate = null, r.alternate = null, r.flags |= 2);
  }
  function pn(n, r, s) {
    if (n !== null && (r.dependencies = n.dependencies), ur |= r.lanes, (s & r.childLanes) === 0) return null;
    if (n !== null && r.child !== n.child) throw Error(o(153));
    if (r.child !== null) {
      for (n = r.child, s = Ln(n, n.pendingProps), r.child = s, s.return = r; n.sibling !== null; ) n = n.sibling, s = s.sibling = Ln(n, n.pendingProps), s.return = r;
      s.sibling = null;
    }
    return r.child;
  }
  function Yx(n, r, s) {
    switch (r.tag) {
      case 3:
        Um(r), Wr();
        break;
      case 5:
        am(r);
        break;
      case 1:
        ft(r.type) && ps(r);
        break;
      case 4:
        ou(r, r.stateNode.containerInfo);
        break;
      case 10:
        var u = r.type._context, h = r.memoizedProps.value;
        Ee(Ss, u._currentValue), u._currentValue = h;
        break;
      case 13:
        if (u = r.memoizedState, u !== null)
          return u.dehydrated !== null ? (Ee(je, je.current & 1), r.flags |= 128, null) : (s & r.child.childLanes) !== 0 ? Wm(n, r, s) : (Ee(je, je.current & 1), n = pn(n, r, s), n !== null ? n.sibling : null);
        Ee(je, je.current & 1);
        break;
      case 19:
        if (u = (s & r.childLanes) !== 0, (n.flags & 128) !== 0) {
          if (u) return Km(n, r, s);
          r.flags |= 128;
        }
        if (h = r.memoizedState, h !== null && (h.rendering = null, h.tail = null, h.lastEffect = null), Ee(je, je.current), u) break;
        return null;
      case 22:
      case 23:
        return r.lanes = 0, zm(n, r, s);
    }
    return pn(n, r, s);
  }
  var Ym, bu, Qm, Xm;
  Ym = function(n, r) {
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
  }, bu = function() {
  }, Qm = function(n, r, s, u) {
    var h = n.memoizedProps;
    if (h !== u) {
      n = r.stateNode, ar(Xt.current);
      var g = null;
      switch (s) {
        case "input":
          h = tl(n, h), u = tl(n, u), g = [];
          break;
        case "select":
          h = Q({}, h, { value: void 0 }), u = Q({}, u, { value: void 0 }), g = [];
          break;
        case "textarea":
          h = ol(n, h), u = ol(n, u), g = [];
          break;
        default:
          typeof h.onClick != "function" && typeof u.onClick == "function" && (n.onclick = cs);
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
        else F === "dangerouslySetInnerHTML" ? (M = M ? M.__html : void 0, P = P ? P.__html : void 0, M != null && P !== M && (g = g || []).push(F, M)) : F === "children" ? typeof M != "string" && typeof M != "number" || (g = g || []).push(F, "" + M) : F !== "suppressContentEditableWarning" && F !== "suppressHydrationWarning" && (a.hasOwnProperty(F) ? (M != null && F === "onScroll" && Me("scroll", n), g || P === M || (g = [])) : (g = g || []).push(F, M));
      }
      s && (g = g || []).push("style", s);
      var F = g;
      (r.updateQueue = F) && (r.flags |= 4);
    }
  }, Xm = function(n, r, s, u) {
    s !== u && (r.flags |= 4);
  };
  function ii(n, r) {
    if (!De) switch (n.tailMode) {
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
  function Qx(n, r, s) {
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
        return ft(r.type) && fs(), nt(r), null;
      case 3:
        return u = r.stateNode, Qr(), Re(dt), Re(et), au(), u.pendingContext && (u.context = u.pendingContext, u.pendingContext = null), (n === null || n.child === null) && (gs(r) ? r.flags |= 4 : n === null || n.memoizedState.isDehydrated && (r.flags & 256) === 0 || (r.flags |= 1024, Ot !== null && (Ou(Ot), Ot = null))), bu(n, r), nt(r), null;
      case 5:
        iu(r);
        var h = ar(ei.current);
        if (s = r.type, n !== null && r.stateNode != null) Qm(n, r, s, u, h), n.ref !== r.ref && (r.flags |= 512, r.flags |= 2097152);
        else {
          if (!u) {
            if (r.stateNode === null) throw Error(o(166));
            return nt(r), null;
          }
          if (n = ar(Xt.current), gs(r)) {
            u = r.stateNode, s = r.type;
            var g = r.memoizedProps;
            switch (u[Qt] = r, u[Qo] = g, n = (r.mode & 1) !== 0, s) {
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
                Mf(u, g), Me("invalid", u);
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
              k === "children" ? typeof P == "string" ? u.textContent !== P && (g.suppressHydrationWarning !== !0 && us(u.textContent, P, n), h = ["children", P]) : typeof P == "number" && u.textContent !== "" + P && (g.suppressHydrationWarning !== !0 && us(
                u.textContent,
                P,
                n
              ), h = ["children", "" + P]) : a.hasOwnProperty(k) && P != null && k === "onScroll" && Me("scroll", u);
            }
            switch (s) {
              case "input":
                zi(u), Nf(u, g, !0);
                break;
              case "textarea":
                zi(u), If(u);
                break;
              case "select":
              case "option":
                break;
              default:
                typeof g.onClick == "function" && (u.onclick = cs);
            }
            u = h, r.updateQueue = u, u !== null && (r.flags |= 4);
          } else {
            k = h.nodeType === 9 ? h : h.ownerDocument, n === "http://www.w3.org/1999/xhtml" && (n = Ff(s)), n === "http://www.w3.org/1999/xhtml" ? s === "script" ? (n = k.createElement("div"), n.innerHTML = "<script><\/script>", n = n.removeChild(n.firstChild)) : typeof u.is == "string" ? n = k.createElement(s, { is: u.is }) : (n = k.createElement(s), s === "select" && (k = n, u.multiple ? k.multiple = !0 : u.size && (k.size = u.size))) : n = k.createElementNS(n, s), n[Qt] = r, n[Qo] = u, Ym(n, r, !1, !1), r.stateNode = n;
            e: {
              switch (k = al(s, u), s) {
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
                  for (h = 0; h < Go.length; h++) Me(Go[h], n);
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
                  Mf(n, u), h = tl(n, u), Me("invalid", n);
                  break;
                case "option":
                  h = u;
                  break;
                case "select":
                  n._wrapperState = { wasMultiple: !!u.multiple }, h = Q({}, u, { value: void 0 }), Me("invalid", n);
                  break;
                case "textarea":
                  Df(n, u), h = ol(n, u), Me("invalid", n);
                  break;
                default:
                  h = u;
              }
              sl(s, h), P = h;
              for (g in P) if (P.hasOwnProperty(g)) {
                var M = P[g];
                g === "style" ? Vf(n, M) : g === "dangerouslySetInnerHTML" ? (M = M ? M.__html : void 0, M != null && Of(n, M)) : g === "children" ? typeof M == "string" ? (s !== "textarea" || M !== "") && Co(n, M) : typeof M == "number" && Co(n, "" + M) : g !== "suppressContentEditableWarning" && g !== "suppressHydrationWarning" && g !== "autoFocus" && (a.hasOwnProperty(g) ? M != null && g === "onScroll" && Me("scroll", n) : M != null && E(n, g, M, k));
              }
              switch (s) {
                case "input":
                  zi(n), Nf(n, u, !1);
                  break;
                case "textarea":
                  zi(n), If(n);
                  break;
                case "option":
                  u.value != null && n.setAttribute("value", "" + xe(u.value));
                  break;
                case "select":
                  n.multiple = !!u.multiple, g = u.value, g != null ? Mr(n, !!u.multiple, g, !1) : u.defaultValue != null && Mr(
                    n,
                    !!u.multiple,
                    u.defaultValue,
                    !0
                  );
                  break;
                default:
                  typeof h.onClick == "function" && (n.onclick = cs);
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
        if (n && r.stateNode != null) Xm(n, r, n.memoizedProps, u);
        else {
          if (typeof u != "string" && r.stateNode === null) throw Error(o(166));
          if (s = ar(ei.current), ar(Xt.current), gs(r)) {
            if (u = r.stateNode, s = r.memoizedProps, u[Qt] = r, (g = u.nodeValue !== s) && (n = wt, n !== null)) switch (n.tag) {
              case 3:
                us(u.nodeValue, s, (n.mode & 1) !== 0);
                break;
              case 5:
                n.memoizedProps.suppressHydrationWarning !== !0 && us(u.nodeValue, s, (n.mode & 1) !== 0);
            }
            g && (r.flags |= 4);
          } else u = (s.nodeType === 9 ? s : s.ownerDocument).createTextNode(u), u[Qt] = r, r.stateNode = u;
        }
        return nt(r), null;
      case 13:
        if (Re(je), u = r.memoizedState, n === null || n.memoizedState !== null && n.memoizedState.dehydrated !== null) {
          if (De && xt !== null && (r.mode & 1) !== 0 && (r.flags & 128) === 0) qp(), Wr(), r.flags |= 98560, g = !1;
          else if (g = gs(r), u !== null && u.dehydrated !== null) {
            if (n === null) {
              if (!g) throw Error(o(318));
              if (g = r.memoizedState, g = g !== null ? g.dehydrated : null, !g) throw Error(o(317));
              g[Qt] = r;
            } else Wr(), (r.flags & 128) === 0 && (r.memoizedState = null), r.flags |= 4;
            nt(r), g = !1;
          } else Ot !== null && (Ou(Ot), Ot = null), g = !0;
          if (!g) return r.flags & 65536 ? r : null;
        }
        return (r.flags & 128) !== 0 ? (r.lanes = s, r) : (u = u !== null, u !== (n !== null && n.memoizedState !== null) && u && (r.child.flags |= 8192, (r.mode & 1) !== 0 && (n === null || (je.current & 1) !== 0 ? Ue === 0 && (Ue = 3) : zu())), r.updateQueue !== null && (r.flags |= 4), nt(r), null);
      case 4:
        return Qr(), bu(n, r), n === null && Ko(r.stateNode.containerInfo), nt(r), null;
      case 10:
        return eu(r.type._context), nt(r), null;
      case 17:
        return ft(r.type) && fs(), nt(r), null;
      case 19:
        if (Re(je), g = r.memoizedState, g === null) return nt(r), null;
        if (u = (r.flags & 128) !== 0, k = g.rendering, k === null) if (u) ii(g, !1);
        else {
          if (Ue !== 0 || n !== null && (n.flags & 128) !== 0) for (n = r.child; n !== null; ) {
            if (k = Ts(n), k !== null) {
              for (r.flags |= 128, ii(g, !1), u = k.updateQueue, u !== null && (r.updateQueue = u, r.flags |= 4), r.subtreeFlags = 0, u = s, s = r.child; s !== null; ) g = s, n = u, g.flags &= 14680066, k = g.alternate, k === null ? (g.childLanes = 0, g.lanes = n, g.child = null, g.subtreeFlags = 0, g.memoizedProps = null, g.memoizedState = null, g.updateQueue = null, g.dependencies = null, g.stateNode = null) : (g.childLanes = k.childLanes, g.lanes = k.lanes, g.child = k.child, g.subtreeFlags = 0, g.deletions = null, g.memoizedProps = k.memoizedProps, g.memoizedState = k.memoizedState, g.updateQueue = k.updateQueue, g.type = k.type, n = k.dependencies, g.dependencies = n === null ? null : { lanes: n.lanes, firstContext: n.firstContext }), s = s.sibling;
              return Ee(je, je.current & 1 | 2), r.child;
            }
            n = n.sibling;
          }
          g.tail !== null && Le() > qr && (r.flags |= 128, u = !0, ii(g, !1), r.lanes = 4194304);
        }
        else {
          if (!u) if (n = Ts(k), n !== null) {
            if (r.flags |= 128, u = !0, s = n.updateQueue, s !== null && (r.updateQueue = s, r.flags |= 4), ii(g, !0), g.tail === null && g.tailMode === "hidden" && !k.alternate && !De) return nt(r), null;
          } else 2 * Le() - g.renderingStartTime > qr && s !== 1073741824 && (r.flags |= 128, u = !0, ii(g, !1), r.lanes = 4194304);
          g.isBackwards ? (k.sibling = r.child, r.child = k) : (s = g.last, s !== null ? s.sibling = k : r.child = k, g.last = k);
        }
        return g.tail !== null ? (r = g.tail, g.rendering = r, g.tail = r.sibling, g.renderingStartTime = Le(), r.sibling = null, s = je.current, Ee(je, u ? s & 1 | 2 : s & 1), r) : (nt(r), null);
      case 22:
      case 23:
        return Vu(), u = r.memoizedState !== null, n !== null && n.memoizedState !== null !== u && (r.flags |= 8192), u && (r.mode & 1) !== 0 ? (_t & 1073741824) !== 0 && (nt(r), r.subtreeFlags & 6 && (r.flags |= 8192)) : nt(r), null;
      case 24:
        return null;
      case 25:
        return null;
    }
    throw Error(o(156, r.tag));
  }
  function Xx(n, r) {
    switch (Yl(r), r.tag) {
      case 1:
        return ft(r.type) && fs(), n = r.flags, n & 65536 ? (r.flags = n & -65537 | 128, r) : null;
      case 3:
        return Qr(), Re(dt), Re(et), au(), n = r.flags, (n & 65536) !== 0 && (n & 128) === 0 ? (r.flags = n & -65537 | 128, r) : null;
      case 5:
        return iu(r), null;
      case 13:
        if (Re(je), n = r.memoizedState, n !== null && n.dehydrated !== null) {
          if (r.alternate === null) throw Error(o(340));
          Wr();
        }
        return n = r.flags, n & 65536 ? (r.flags = n & -65537 | 128, r) : null;
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
  var Ns = !1, rt = !1, Zx = typeof WeakSet == "function" ? WeakSet : Set, te = null;
  function Zr(n, r) {
    var s = n.ref;
    if (s !== null) if (typeof s == "function") try {
      s(null);
    } catch (u) {
      Oe(n, r, u);
    }
    else s.current = null;
  }
  function Cu(n, r, s) {
    try {
      s();
    } catch (u) {
      Oe(n, r, u);
    }
  }
  var Zm = !1;
  function Jx(n, r) {
    if (Vl = Ji, n = Ep(), Rl(n)) {
      if ("selectionStart" in n) var s = { start: n.selectionStart, end: n.selectionEnd };
      else e: {
        s = (s = n.ownerDocument) && s.defaultView || window;
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
          var k = 0, P = -1, M = -1, F = 0, B = 0, U = n, z = null;
          t: for (; ; ) {
            for (var q; U !== s || h !== 0 && U.nodeType !== 3 || (P = k + h), U !== g || u !== 0 && U.nodeType !== 3 || (M = k + u), U.nodeType === 3 && (k += U.nodeValue.length), (q = U.firstChild) !== null; )
              z = U, U = q;
            for (; ; ) {
              if (U === n) break t;
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
    for (zl = { focusedElem: n, selectionRange: s }, Ji = !1, te = r; te !== null; ) if (r = te, n = r.child, (r.subtreeFlags & 1028) !== 0 && n !== null) n.return = r, te = n;
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
      if (n = r.sibling, n !== null) {
        n.return = r.return, te = n;
        break;
      }
      te = r.return;
    }
    return ne = Zm, Zm = !1, ne;
  }
  function si(n, r, s) {
    var u = r.updateQueue;
    if (u = u !== null ? u.lastEffect : null, u !== null) {
      var h = u = u.next;
      do {
        if ((h.tag & n) === n) {
          var g = h.destroy;
          h.destroy = void 0, g !== void 0 && Cu(r, s, g);
        }
        h = h.next;
      } while (h !== u);
    }
  }
  function Ds(n, r) {
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
  function Pu(n) {
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
  function Jm(n) {
    var r = n.alternate;
    r !== null && (n.alternate = null, Jm(r)), n.child = null, n.deletions = null, n.sibling = null, n.tag === 5 && (r = n.stateNode, r !== null && (delete r[Qt], delete r[Qo], delete r[Hl], delete r[jx], delete r[Ix])), n.stateNode = null, n.return = null, n.dependencies = null, n.memoizedProps = null, n.memoizedState = null, n.pendingProps = null, n.stateNode = null, n.updateQueue = null;
  }
  function qm(n) {
    return n.tag === 5 || n.tag === 3 || n.tag === 4;
  }
  function eh(n) {
    e: for (; ; ) {
      for (; n.sibling === null; ) {
        if (n.return === null || qm(n.return)) return null;
        n = n.return;
      }
      for (n.sibling.return = n.return, n = n.sibling; n.tag !== 5 && n.tag !== 6 && n.tag !== 18; ) {
        if (n.flags & 2 || n.child === null || n.tag === 4) continue e;
        n.child.return = n, n = n.child;
      }
      if (!(n.flags & 2)) return n.stateNode;
    }
  }
  function Eu(n, r, s) {
    var u = n.tag;
    if (u === 5 || u === 6) n = n.stateNode, r ? s.nodeType === 8 ? s.parentNode.insertBefore(n, r) : s.insertBefore(n, r) : (s.nodeType === 8 ? (r = s.parentNode, r.insertBefore(n, s)) : (r = s, r.appendChild(n)), s = s._reactRootContainer, s != null || r.onclick !== null || (r.onclick = cs));
    else if (u !== 4 && (n = n.child, n !== null)) for (Eu(n, r, s), n = n.sibling; n !== null; ) Eu(n, r, s), n = n.sibling;
  }
  function Mu(n, r, s) {
    var u = n.tag;
    if (u === 5 || u === 6) n = n.stateNode, r ? s.insertBefore(n, r) : s.appendChild(n);
    else if (u !== 4 && (n = n.child, n !== null)) for (Mu(n, r, s), n = n.sibling; n !== null; ) Mu(n, r, s), n = n.sibling;
  }
  var Xe = null, Vt = !1;
  function Dn(n, r, s) {
    for (s = s.child; s !== null; ) th(n, r, s), s = s.sibling;
  }
  function th(n, r, s) {
    if (Yt && typeof Yt.onCommitFiberUnmount == "function") try {
      Yt.onCommitFiberUnmount(Gi, s);
    } catch {
    }
    switch (s.tag) {
      case 5:
        rt || Zr(s, r);
      case 6:
        var u = Xe, h = Vt;
        Xe = null, Dn(n, r, s), Xe = u, Vt = h, Xe !== null && (Vt ? (n = Xe, s = s.stateNode, n.nodeType === 8 ? n.parentNode.removeChild(s) : n.removeChild(s)) : Xe.removeChild(s.stateNode));
        break;
      case 18:
        Xe !== null && (Vt ? (n = Xe, s = s.stateNode, n.nodeType === 8 ? Ul(n.parentNode, s) : n.nodeType === 1 && Ul(n, s), Lo(n)) : Ul(Xe, s.stateNode));
        break;
      case 4:
        u = Xe, h = Vt, Xe = s.stateNode.containerInfo, Vt = !0, Dn(n, r, s), Xe = u, Vt = h;
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
        Dn(n, r, s);
        break;
      case 1:
        if (!rt && (Zr(s, r), u = s.stateNode, typeof u.componentWillUnmount == "function")) try {
          u.props = s.memoizedProps, u.state = s.memoizedState, u.componentWillUnmount();
        } catch (P) {
          Oe(s, r, P);
        }
        Dn(n, r, s);
        break;
      case 21:
        Dn(n, r, s);
        break;
      case 22:
        s.mode & 1 ? (rt = (u = rt) || s.memoizedState !== null, Dn(n, r, s), rt = u) : Dn(n, r, s);
        break;
      default:
        Dn(n, r, s);
    }
  }
  function nh(n) {
    var r = n.updateQueue;
    if (r !== null) {
      n.updateQueue = null;
      var s = n.stateNode;
      s === null && (s = n.stateNode = new Zx()), r.forEach(function(u) {
        var h = a1.bind(null, n, u);
        s.has(u) || (s.add(u), u.then(h, h));
      });
    }
  }
  function zt(n, r) {
    var s = r.deletions;
    if (s !== null) for (var u = 0; u < s.length; u++) {
      var h = s[u];
      try {
        var g = n, k = r, P = k;
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
        th(g, k, h), Xe = null, Vt = !1;
        var M = h.alternate;
        M !== null && (M.return = null), h.return = null;
      } catch (F) {
        Oe(h, r, F);
      }
    }
    if (r.subtreeFlags & 12854) for (r = r.child; r !== null; ) rh(r, n), r = r.sibling;
  }
  function rh(n, r) {
    var s = n.alternate, u = n.flags;
    switch (n.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (zt(r, n), Jt(n), u & 4) {
          try {
            si(3, n, n.return), Ds(3, n);
          } catch (oe) {
            Oe(n, n.return, oe);
          }
          try {
            si(5, n, n.return);
          } catch (oe) {
            Oe(n, n.return, oe);
          }
        }
        break;
      case 1:
        zt(r, n), Jt(n), u & 512 && s !== null && Zr(s, s.return);
        break;
      case 5:
        if (zt(r, n), Jt(n), u & 512 && s !== null && Zr(s, s.return), n.flags & 32) {
          var h = n.stateNode;
          try {
            Co(h, "");
          } catch (oe) {
            Oe(n, n.return, oe);
          }
        }
        if (u & 4 && (h = n.stateNode, h != null)) {
          var g = n.memoizedProps, k = s !== null ? s.memoizedProps : g, P = n.type, M = n.updateQueue;
          if (n.updateQueue = null, M !== null) try {
            P === "input" && g.type === "radio" && g.name != null && Rf(h, g), al(P, k);
            var F = al(P, g);
            for (k = 0; k < M.length; k += 2) {
              var B = M[k], U = M[k + 1];
              B === "style" ? Vf(h, U) : B === "dangerouslySetInnerHTML" ? Of(h, U) : B === "children" ? Co(h, U) : E(h, B, U, F);
            }
            switch (P) {
              case "input":
                nl(h, g);
                break;
              case "textarea":
                jf(h, g);
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
            Oe(n, n.return, oe);
          }
        }
        break;
      case 6:
        if (zt(r, n), Jt(n), u & 4) {
          if (n.stateNode === null) throw Error(o(162));
          h = n.stateNode, g = n.memoizedProps;
          try {
            h.nodeValue = g;
          } catch (oe) {
            Oe(n, n.return, oe);
          }
        }
        break;
      case 3:
        if (zt(r, n), Jt(n), u & 4 && s !== null && s.memoizedState.isDehydrated) try {
          Lo(r.containerInfo);
        } catch (oe) {
          Oe(n, n.return, oe);
        }
        break;
      case 4:
        zt(r, n), Jt(n);
        break;
      case 13:
        zt(r, n), Jt(n), h = n.child, h.flags & 8192 && (g = h.memoizedState !== null, h.stateNode.isHidden = g, !g || h.alternate !== null && h.alternate.memoizedState !== null || (Du = Le())), u & 4 && nh(n);
        break;
      case 22:
        if (B = s !== null && s.memoizedState !== null, n.mode & 1 ? (rt = (F = rt) || B, zt(r, n), rt = F) : zt(r, n), Jt(n), u & 8192) {
          if (F = n.memoizedState !== null, (n.stateNode.isHidden = F) && !B && (n.mode & 1) !== 0) for (te = n, B = n.child; B !== null; ) {
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
                    sh(U);
                    continue;
                  }
              }
              q !== null ? (q.return = z, te = q) : sh(U);
            }
            B = B.sibling;
          }
          e: for (B = null, U = n; ; ) {
            if (U.tag === 5) {
              if (B === null) {
                B = U;
                try {
                  h = U.stateNode, F ? (g = h.style, typeof g.setProperty == "function" ? g.setProperty("display", "none", "important") : g.display = "none") : (P = U.stateNode, M = U.memoizedProps.style, k = M != null && M.hasOwnProperty("display") ? M.display : null, P.style.display = Lf("display", k));
                } catch (oe) {
                  Oe(n, n.return, oe);
                }
              }
            } else if (U.tag === 6) {
              if (B === null) try {
                U.stateNode.nodeValue = F ? "" : U.memoizedProps;
              } catch (oe) {
                Oe(n, n.return, oe);
              }
            } else if ((U.tag !== 22 && U.tag !== 23 || U.memoizedState === null || U === n) && U.child !== null) {
              U.child.return = U, U = U.child;
              continue;
            }
            if (U === n) break e;
            for (; U.sibling === null; ) {
              if (U.return === null || U.return === n) break e;
              B === U && (B = null), U = U.return;
            }
            B === U && (B = null), U.sibling.return = U.return, U = U.sibling;
          }
        }
        break;
      case 19:
        zt(r, n), Jt(n), u & 4 && nh(n);
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
            if (qm(s)) {
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
            var g = eh(n);
            Mu(n, g, h);
            break;
          case 3:
          case 4:
            var k = u.stateNode.containerInfo, P = eh(n);
            Eu(n, P, k);
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
  function qx(n, r, s) {
    te = n, oh(n);
  }
  function oh(n, r, s) {
    for (var u = (n.mode & 1) !== 0; te !== null; ) {
      var h = te, g = h.child;
      if (h.tag === 22 && u) {
        var k = h.memoizedState !== null || Ns;
        if (!k) {
          var P = h.alternate, M = P !== null && P.memoizedState !== null || rt;
          P = Ns;
          var F = rt;
          if (Ns = k, (rt = M) && !F) for (te = h; te !== null; ) k = te, M = k.child, k.tag === 22 && k.memoizedState !== null ? ah(h) : M !== null ? (M.return = k, te = M) : ah(h);
          for (; g !== null; ) te = g, oh(g), g = g.sibling;
          te = h, Ns = P, rt = F;
        }
        ih(n);
      } else (h.subtreeFlags & 8772) !== 0 && g !== null ? (g.return = h, te = g) : ih(n);
    }
  }
  function ih(n) {
    for (; te !== null; ) {
      var r = te;
      if ((r.flags & 8772) !== 0) {
        var s = r.alternate;
        try {
          if ((r.flags & 8772) !== 0) switch (r.tag) {
            case 0:
            case 11:
            case 15:
              rt || Ds(5, r);
              break;
            case 1:
              var u = r.stateNode;
              if (r.flags & 4 && !rt) if (s === null) u.componentDidMount();
              else {
                var h = r.elementType === r.type ? s.memoizedProps : Lt(r.type, s.memoizedProps);
                u.componentDidUpdate(h, s.memoizedState, u.__reactInternalSnapshotBeforeUpdate);
              }
              var g = r.updateQueue;
              g !== null && sm(r, g, u);
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
                sm(r, k, s);
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
      if (r === n) {
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
  function sh(n) {
    for (; te !== null; ) {
      var r = te;
      if (r === n) {
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
  function ah(n) {
    for (; te !== null; ) {
      var r = te;
      try {
        switch (r.tag) {
          case 0:
          case 11:
          case 15:
            var s = r.return;
            try {
              Ds(4, r);
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
      if (r === n) {
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
  var e1 = Math.ceil, js = N.ReactCurrentDispatcher, Ru = N.ReactCurrentOwner, Pt = N.ReactCurrentBatchConfig, he = 0, Ge = null, ze = null, Ze = 0, _t = 0, Jr = Pn(0), Ue = 0, ai = null, ur = 0, Is = 0, Nu = 0, li = null, mt = null, Du = 0, qr = 1 / 0, mn = null, Fs = !1, ju = null, jn = null, Os = !1, In = null, Ls = 0, ui = 0, Iu = null, Vs = -1, zs = 0;
  function st() {
    return (he & 6) !== 0 ? Le() : Vs !== -1 ? Vs : Vs = Le();
  }
  function Fn(n) {
    return (n.mode & 1) === 0 ? 1 : (he & 2) !== 0 && Ze !== 0 ? Ze & -Ze : Ox.transition !== null ? (zs === 0 && (zs = ep()), zs) : (n = _e, n !== 0 || (n = window.event, n = n === void 0 ? 16 : up(n.type)), n);
  }
  function Bt(n, r, s, u) {
    if (50 < ui) throw ui = 0, Iu = null, Error(o(185));
    Do(n, s, u), ((he & 2) === 0 || n !== Ge) && (n === Ge && ((he & 2) === 0 && (Is |= s), Ue === 4 && On(n, Ze)), ht(n, u), s === 1 && he === 0 && (r.mode & 1) === 0 && (qr = Le() + 500, ms && Mn()));
  }
  function ht(n, r) {
    var s = n.callbackNode;
    Ow(n, r);
    var u = Qi(n, n === Ge ? Ze : 0);
    if (u === 0) s !== null && Zf(s), n.callbackNode = null, n.callbackPriority = 0;
    else if (r = u & -u, n.callbackPriority !== r) {
      if (s != null && Zf(s), r === 1) n.tag === 0 ? Fx(uh.bind(null, n)) : Yp(uh.bind(null, n)), Nx(function() {
        (he & 6) === 0 && Mn();
      }), s = null;
      else {
        switch (tp(u)) {
          case 1:
            s = ml;
            break;
          case 4:
            s = Jf;
            break;
          case 16:
            s = Wi;
            break;
          case 536870912:
            s = qf;
            break;
          default:
            s = Wi;
        }
        s = gh(s, lh.bind(null, n));
      }
      n.callbackPriority = r, n.callbackNode = s;
    }
  }
  function lh(n, r) {
    if (Vs = -1, zs = 0, (he & 6) !== 0) throw Error(o(327));
    var s = n.callbackNode;
    if (eo() && n.callbackNode !== s) return null;
    var u = Qi(n, n === Ge ? Ze : 0);
    if (u === 0) return null;
    if ((u & 30) !== 0 || (u & n.expiredLanes) !== 0 || r) r = Bs(n, u);
    else {
      r = u;
      var h = he;
      he |= 2;
      var g = dh();
      (Ge !== n || Ze !== r) && (mn = null, qr = Le() + 500, dr(n, r));
      do
        try {
          r1();
          break;
        } catch (P) {
          ch(n, P);
        }
      while (!0);
      ql(), js.current = g, he = h, ze !== null ? r = 0 : (Ge = null, Ze = 0, r = Ue);
    }
    if (r !== 0) {
      if (r === 2 && (h = hl(n), h !== 0 && (u = h, r = Fu(n, h))), r === 1) throw s = ai, dr(n, 0), On(n, u), ht(n, Le()), s;
      if (r === 6) On(n, u);
      else {
        if (h = n.current.alternate, (u & 30) === 0 && !t1(h) && (r = Bs(n, u), r === 2 && (g = hl(n), g !== 0 && (u = g, r = Fu(n, g))), r === 1)) throw s = ai, dr(n, 0), On(n, u), ht(n, Le()), s;
        switch (n.finishedWork = h, n.finishedLanes = u, r) {
          case 0:
          case 1:
            throw Error(o(345));
          case 2:
            fr(n, mt, mn);
            break;
          case 3:
            if (On(n, u), (u & 130023424) === u && (r = Du + 500 - Le(), 10 < r)) {
              if (Qi(n, 0) !== 0) break;
              if (h = n.suspendedLanes, (h & u) !== u) {
                st(), n.pingedLanes |= n.suspendedLanes & h;
                break;
              }
              n.timeoutHandle = $l(fr.bind(null, n, mt, mn), r);
              break;
            }
            fr(n, mt, mn);
            break;
          case 4:
            if (On(n, u), (u & 4194240) === u) break;
            for (r = n.eventTimes, h = -1; 0 < u; ) {
              var k = 31 - It(u);
              g = 1 << k, k = r[k], k > h && (h = k), u &= ~g;
            }
            if (u = h, u = Le() - u, u = (120 > u ? 120 : 480 > u ? 480 : 1080 > u ? 1080 : 1920 > u ? 1920 : 3e3 > u ? 3e3 : 4320 > u ? 4320 : 1960 * e1(u / 1960)) - u, 10 < u) {
              n.timeoutHandle = $l(fr.bind(null, n, mt, mn), u);
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
    return ht(n, Le()), n.callbackNode === s ? lh.bind(null, n) : null;
  }
  function Fu(n, r) {
    var s = li;
    return n.current.memoizedState.isDehydrated && (dr(n, r).flags |= 256), n = Bs(n, r), n !== 2 && (r = mt, mt = s, r !== null && Ou(r)), n;
  }
  function Ou(n) {
    mt === null ? mt = n : mt.push.apply(mt, n);
  }
  function t1(n) {
    for (var r = n; ; ) {
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
  function On(n, r) {
    for (r &= ~Nu, r &= ~Is, n.suspendedLanes |= r, n.pingedLanes &= ~r, n = n.expirationTimes; 0 < r; ) {
      var s = 31 - It(r), u = 1 << s;
      n[s] = -1, r &= ~u;
    }
  }
  function uh(n) {
    if ((he & 6) !== 0) throw Error(o(327));
    eo();
    var r = Qi(n, 0);
    if ((r & 1) === 0) return ht(n, Le()), null;
    var s = Bs(n, r);
    if (n.tag !== 0 && s === 2) {
      var u = hl(n);
      u !== 0 && (r = u, s = Fu(n, u));
    }
    if (s === 1) throw s = ai, dr(n, 0), On(n, r), ht(n, Le()), s;
    if (s === 6) throw Error(o(345));
    return n.finishedWork = n.current.alternate, n.finishedLanes = r, fr(n, mt, mn), ht(n, Le()), null;
  }
  function Lu(n, r) {
    var s = he;
    he |= 1;
    try {
      return n(r);
    } finally {
      he = s, he === 0 && (qr = Le() + 500, ms && Mn());
    }
  }
  function cr(n) {
    In !== null && In.tag === 0 && (he & 6) === 0 && eo();
    var r = he;
    he |= 1;
    var s = Pt.transition, u = _e;
    try {
      if (Pt.transition = null, _e = 1, n) return n();
    } finally {
      _e = u, Pt.transition = s, he = r, (he & 6) === 0 && Mn();
    }
  }
  function Vu() {
    _t = Jr.current, Re(Jr);
  }
  function dr(n, r) {
    n.finishedWork = null, n.finishedLanes = 0;
    var s = n.timeoutHandle;
    if (s !== -1 && (n.timeoutHandle = -1, Rx(s)), ze !== null) for (s = ze.return; s !== null; ) {
      var u = s;
      switch (Yl(u), u.tag) {
        case 1:
          u = u.type.childContextTypes, u != null && fs();
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
    if (Ge = n, ze = n = Ln(n.current, null), Ze = _t = r, Ue = 0, ai = null, Nu = Is = ur = 0, mt = li = null, sr !== null) {
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
    return n;
  }
  function ch(n, r) {
    do {
      var s = ze;
      try {
        if (ql(), ks.current = Ps, As) {
          for (var u = Ie.memoizedState; u !== null; ) {
            var h = u.queue;
            h !== null && (h.pending = null), u = u.next;
          }
          As = !1;
        }
        if (lr = 0, We = $e = Ie = null, ti = !1, ni = 0, Ru.current = null, s === null || s.return === null) {
          Ue = 1, ai = r, ze = null;
          break;
        }
        e: {
          var g = n, k = s.return, P = s, M = r;
          if (r = Ze, P.flags |= 32768, M !== null && typeof M == "object" && typeof M.then == "function") {
            var F = M, B = P, U = B.tag;
            if ((B.mode & 1) === 0 && (U === 0 || U === 11 || U === 15)) {
              var z = B.alternate;
              z ? (B.updateQueue = z.updateQueue, B.memoizedState = z.memoizedState, B.lanes = z.lanes) : (B.updateQueue = null, B.memoizedState = null);
            }
            var q = Im(k);
            if (q !== null) {
              q.flags &= -257, Fm(q, k, P, g, r), q.mode & 1 && jm(g, F, r), r = q, M = F;
              var ne = r.updateQueue;
              if (ne === null) {
                var oe = /* @__PURE__ */ new Set();
                oe.add(M), r.updateQueue = oe;
              } else ne.add(M);
              break e;
            } else {
              if ((r & 1) === 0) {
                jm(g, F, r), zu();
                break e;
              }
              M = Error(o(426));
            }
          } else if (De && P.mode & 1) {
            var Ve = Im(k);
            if (Ve !== null) {
              (Ve.flags & 65536) === 0 && (Ve.flags |= 256), Fm(Ve, k, P, g, r), Zl(Xr(M, P));
              break e;
            }
          }
          g = M = Xr(M, P), Ue !== 4 && (Ue = 2), li === null ? li = [g] : li.push(g), g = k;
          do {
            switch (g.tag) {
              case 3:
                g.flags |= 65536, r &= -r, g.lanes |= r;
                var j = Nm(g, M, r);
                im(g, j);
                break e;
              case 1:
                P = M;
                var R = g.type, I = g.stateNode;
                if ((g.flags & 128) === 0 && (typeof R.getDerivedStateFromError == "function" || I !== null && typeof I.componentDidCatch == "function" && (jn === null || !jn.has(I)))) {
                  g.flags |= 65536, r &= -r, g.lanes |= r;
                  var G = Dm(g, P, r);
                  im(g, G);
                  break e;
                }
            }
            g = g.return;
          } while (g !== null);
        }
        ph(s);
      } catch (ie) {
        r = ie, ze === s && s !== null && (ze = s = s.return);
        continue;
      }
      break;
    } while (!0);
  }
  function dh() {
    var n = js.current;
    return js.current = Ps, n === null ? Ps : n;
  }
  function zu() {
    (Ue === 0 || Ue === 3 || Ue === 2) && (Ue = 4), Ge === null || (ur & 268435455) === 0 && (Is & 268435455) === 0 || On(Ge, Ze);
  }
  function Bs(n, r) {
    var s = he;
    he |= 2;
    var u = dh();
    (Ge !== n || Ze !== r) && (mn = null, dr(n, r));
    do
      try {
        n1();
        break;
      } catch (h) {
        ch(n, h);
      }
    while (!0);
    if (ql(), he = s, js.current = u, ze !== null) throw Error(o(261));
    return Ge = null, Ze = 0, Ue;
  }
  function n1() {
    for (; ze !== null; ) fh(ze);
  }
  function r1() {
    for (; ze !== null && !Pw(); ) fh(ze);
  }
  function fh(n) {
    var r = yh(n.alternate, n, _t);
    n.memoizedProps = n.pendingProps, r === null ? ph(n) : ze = r, Ru.current = null;
  }
  function ph(n) {
    var r = n;
    do {
      var s = r.alternate;
      if (n = r.return, (r.flags & 32768) === 0) {
        if (s = Qx(s, r, _t), s !== null) {
          ze = s;
          return;
        }
      } else {
        if (s = Xx(s, r), s !== null) {
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
      Pt.transition = null, _e = 1, o1(n, r, s, u);
    } finally {
      Pt.transition = h, _e = u;
    }
    return null;
  }
  function o1(n, r, s, u) {
    do
      eo();
    while (In !== null);
    if ((he & 6) !== 0) throw Error(o(327));
    s = n.finishedWork;
    var h = n.finishedLanes;
    if (s === null) return null;
    if (n.finishedWork = null, n.finishedLanes = 0, s === n.current) throw Error(o(177));
    n.callbackNode = null, n.callbackPriority = 0;
    var g = s.lanes | s.childLanes;
    if (Lw(n, g), n === Ge && (ze = Ge = null, Ze = 0), (s.subtreeFlags & 2064) === 0 && (s.flags & 2064) === 0 || Os || (Os = !0, gh(Wi, function() {
      return eo(), null;
    })), g = (s.flags & 15990) !== 0, (s.subtreeFlags & 15990) !== 0 || g) {
      g = Pt.transition, Pt.transition = null;
      var k = _e;
      _e = 1;
      var P = he;
      he |= 4, Ru.current = null, Jx(n, s), rh(s, n), kx(zl), Ji = !!Vl, zl = Vl = null, n.current = s, qx(s), Ew(), he = P, _e = k, Pt.transition = g;
    } else n.current = s;
    if (Os && (Os = !1, In = n, Ls = h), g = n.pendingLanes, g === 0 && (jn = null), Nw(s.stateNode), ht(n, Le()), r !== null) for (u = n.onRecoverableError, s = 0; s < r.length; s++) h = r[s], u(h.value, { componentStack: h.stack, digest: h.digest });
    if (Fs) throw Fs = !1, n = ju, ju = null, n;
    return (Ls & 1) !== 0 && n.tag !== 0 && eo(), g = n.pendingLanes, (g & 1) !== 0 ? n === Iu ? ui++ : (ui = 0, Iu = n) : ui = 0, Mn(), null;
  }
  function eo() {
    if (In !== null) {
      var n = tp(Ls), r = Pt.transition, s = _e;
      try {
        if (Pt.transition = null, _e = 16 > n ? 16 : n, In === null) var u = !1;
        else {
          if (n = In, In = null, Ls = 0, (he & 6) !== 0) throw Error(o(331));
          var h = he;
          for (he |= 4, te = n.current; te !== null; ) {
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
                      if (Jm(B), B === F) {
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
          var R = n.current;
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
                    Ds(9, P);
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
          if (he = h, Mn(), Yt && typeof Yt.onPostCommitFiberRoot == "function") try {
            Yt.onPostCommitFiberRoot(Gi, n);
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
  function mh(n, r, s) {
    r = Xr(s, r), r = Nm(n, r, 1), n = Nn(n, r, 1), r = st(), n !== null && (Do(n, 1, r), ht(n, r));
  }
  function Oe(n, r, s) {
    if (n.tag === 3) mh(n, n, s);
    else for (; r !== null; ) {
      if (r.tag === 3) {
        mh(r, n, s);
        break;
      } else if (r.tag === 1) {
        var u = r.stateNode;
        if (typeof r.type.getDerivedStateFromError == "function" || typeof u.componentDidCatch == "function" && (jn === null || !jn.has(u))) {
          n = Xr(s, n), n = Dm(r, n, 1), r = Nn(r, n, 1), n = st(), r !== null && (Do(r, 1, n), ht(r, n));
          break;
        }
      }
      r = r.return;
    }
  }
  function i1(n, r, s) {
    var u = n.pingCache;
    u !== null && u.delete(r), r = st(), n.pingedLanes |= n.suspendedLanes & s, Ge === n && (Ze & s) === s && (Ue === 4 || Ue === 3 && (Ze & 130023424) === Ze && 500 > Le() - Du ? dr(n, 0) : Nu |= s), ht(n, r);
  }
  function hh(n, r) {
    r === 0 && ((n.mode & 1) === 0 ? r = 1 : (r = Yi, Yi <<= 1, (Yi & 130023424) === 0 && (Yi = 4194304)));
    var s = st();
    n = dn(n, r), n !== null && (Do(n, r, s), ht(n, s));
  }
  function s1(n) {
    var r = n.memoizedState, s = 0;
    r !== null && (s = r.retryLane), hh(n, s);
  }
  function a1(n, r) {
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
    u !== null && u.delete(r), hh(n, s);
  }
  var yh;
  yh = function(n, r, s) {
    if (n !== null) if (n.memoizedProps !== r.pendingProps || dt.current) pt = !0;
    else {
      if ((n.lanes & s) === 0 && (r.flags & 128) === 0) return pt = !1, Yx(n, r, s);
      pt = (n.flags & 131072) !== 0;
    }
    else pt = !1, De && (r.flags & 1048576) !== 0 && Qp(r, ys, r.index);
    switch (r.lanes = 0, r.tag) {
      case 2:
        var u = r.type;
        Rs(n, r), n = r.pendingProps;
        var h = $r(r, et.current);
        Yr(r, s), h = cu(null, r, u, n, h, s);
        var g = du();
        return r.flags |= 1, typeof h == "object" && h !== null && typeof h.render == "function" && h.$$typeof === void 0 ? (r.tag = 1, r.memoizedState = null, r.updateQueue = null, ft(u) ? (g = !0, ps(r)) : g = !1, r.memoizedState = h.state !== null && h.state !== void 0 ? h.state : null, ru(r), h.updater = Es, r.stateNode = h, h._reactInternals = r, gu(r, u, n, s), r = xu(null, r, u, !0, g, s)) : (r.tag = 0, De && g && Kl(r), it(null, r, h, s), r = r.child), r;
      case 16:
        u = r.elementType;
        e: {
          switch (Rs(n, r), n = r.pendingProps, h = u._init, u = h(u._payload), r.type = u, h = r.tag = u1(u), n = Lt(u, n), h) {
            case 0:
              r = wu(null, r, u, n, s);
              break e;
            case 1:
              r = $m(null, r, u, n, s);
              break e;
            case 11:
              r = Om(null, r, u, n, s);
              break e;
            case 14:
              r = Lm(null, r, u, Lt(u.type, n), s);
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
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Lt(u, h), wu(n, r, u, h, s);
      case 1:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Lt(u, h), $m(n, r, u, h, s);
      case 3:
        e: {
          if (Um(r), n === null) throw Error(o(387));
          u = r.pendingProps, g = r.memoizedState, h = g.element, om(n, r), _s(r, u, null, s);
          var k = r.memoizedState;
          if (u = k.element, g.isDehydrated) if (g = { element: u, isDehydrated: !1, cache: k.cache, pendingSuspenseBoundaries: k.pendingSuspenseBoundaries, transitions: k.transitions }, r.updateQueue.baseState = g, r.memoizedState = g, r.flags & 256) {
            h = Xr(Error(o(423)), r), r = Hm(n, r, u, s, h);
            break e;
          } else if (u !== h) {
            h = Xr(Error(o(424)), r), r = Hm(n, r, u, s, h);
            break e;
          } else for (xt = Cn(r.stateNode.containerInfo.firstChild), wt = r, De = !0, Ot = null, s = nm(r, null, u, s), r.child = s; s; ) s.flags = s.flags & -3 | 4096, s = s.sibling;
          else {
            if (Wr(), u === h) {
              r = pn(n, r, s);
              break e;
            }
            it(n, r, u, s);
          }
          r = r.child;
        }
        return r;
      case 5:
        return am(r), n === null && Xl(r), u = r.type, h = r.pendingProps, g = n !== null ? n.memoizedProps : null, k = h.children, Bl(u, h) ? k = null : g !== null && Bl(u, g) && (r.flags |= 32), Bm(n, r), it(n, r, k, s), r.child;
      case 6:
        return n === null && Xl(r), null;
      case 13:
        return Wm(n, r, s);
      case 4:
        return ou(r, r.stateNode.containerInfo), u = r.pendingProps, n === null ? r.child = Gr(r, null, u, s) : it(n, r, u, s), r.child;
      case 11:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Lt(u, h), Om(n, r, u, h, s);
      case 7:
        return it(n, r, r.pendingProps, s), r.child;
      case 8:
        return it(n, r, r.pendingProps.children, s), r.child;
      case 12:
        return it(n, r, r.pendingProps.children, s), r.child;
      case 10:
        e: {
          if (u = r.type._context, h = r.pendingProps, g = r.memoizedProps, k = h.value, Ee(Ss, u._currentValue), u._currentValue = k, g !== null) if (Ft(g.value, k)) {
            if (g.children === h.children && !dt.current) {
              r = pn(n, r, s);
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
          it(n, r, h.children, s), r = r.child;
        }
        return r;
      case 9:
        return h = r.type, u = r.pendingProps.children, Yr(r, s), h = bt(h), u = u(h), r.flags |= 1, it(n, r, u, s), r.child;
      case 14:
        return u = r.type, h = Lt(u, r.pendingProps), h = Lt(u.type, h), Lm(n, r, u, h, s);
      case 15:
        return Vm(n, r, r.type, r.pendingProps, s);
      case 17:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Lt(u, h), Rs(n, r), r.tag = 1, ft(u) ? (n = !0, ps(r)) : n = !1, Yr(r, s), Mm(r, u, h), gu(r, u, h, s), xu(null, r, u, !0, n, s);
      case 19:
        return Km(n, r, s);
      case 22:
        return zm(n, r, s);
    }
    throw Error(o(156, r.tag));
  };
  function gh(n, r) {
    return Xf(n, r);
  }
  function l1(n, r, s, u) {
    this.tag = n, this.key = s, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = r, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = u, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function Et(n, r, s, u) {
    return new l1(n, r, s, u);
  }
  function Bu(n) {
    return n = n.prototype, !(!n || !n.isReactComponent);
  }
  function u1(n) {
    if (typeof n == "function") return Bu(n) ? 1 : 0;
    if (n != null) {
      if (n = n.$$typeof, n === Z) return 11;
      if (n === ye) return 14;
    }
    return 2;
  }
  function Ln(n, r) {
    var s = n.alternate;
    return s === null ? (s = Et(n.tag, r, n.key, n.mode), s.elementType = n.elementType, s.type = n.type, s.stateNode = n.stateNode, s.alternate = n, n.alternate = s) : (s.pendingProps = r, s.type = n.type, s.flags = 0, s.subtreeFlags = 0, s.deletions = null), s.flags = n.flags & 14680064, s.childLanes = n.childLanes, s.lanes = n.lanes, s.child = n.child, s.memoizedProps = n.memoizedProps, s.memoizedState = n.memoizedState, s.updateQueue = n.updateQueue, r = n.dependencies, s.dependencies = r === null ? null : { lanes: r.lanes, firstContext: r.firstContext }, s.sibling = n.sibling, s.index = n.index, s.ref = n.ref, s;
  }
  function $s(n, r, s, u, h, g) {
    var k = 2;
    if (u = n, typeof n == "function") Bu(n) && (k = 1);
    else if (typeof n == "string") k = 5;
    else e: switch (n) {
      case H:
        return pr(s.children, h, g, r);
      case Y:
        k = 8, h |= 8;
        break;
      case L:
        return n = Et(12, s, r, h | 2), n.elementType = L, n.lanes = g, n;
      case de:
        return n = Et(13, s, r, h), n.elementType = de, n.lanes = g, n;
      case ce:
        return n = Et(19, s, r, h), n.elementType = ce, n.lanes = g, n;
      case we:
        return Us(s, h, g, r);
      default:
        if (typeof n == "object" && n !== null) switch (n.$$typeof) {
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
        throw Error(o(130, n == null ? n : typeof n, ""));
    }
    return r = Et(k, s, r, h), r.elementType = n, r.type = u, r.lanes = g, r;
  }
  function pr(n, r, s, u) {
    return n = Et(7, n, u, r), n.lanes = s, n;
  }
  function Us(n, r, s, u) {
    return n = Et(22, n, u, r), n.elementType = we, n.lanes = s, n.stateNode = { isHidden: !1 }, n;
  }
  function $u(n, r, s) {
    return n = Et(6, n, null, r), n.lanes = s, n;
  }
  function Uu(n, r, s) {
    return r = Et(4, n.children !== null ? n.children : [], n.key, r), r.lanes = s, r.stateNode = { containerInfo: n.containerInfo, pendingChildren: null, implementation: n.implementation }, r;
  }
  function c1(n, r, s, u, h) {
    this.tag = r, this.containerInfo = n, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = yl(0), this.expirationTimes = yl(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = yl(0), this.identifierPrefix = u, this.onRecoverableError = h, this.mutableSourceEagerHydrationData = null;
  }
  function Hu(n, r, s, u, h, g, k, P, M) {
    return n = new c1(n, r, s, P, M), r === 1 ? (r = 1, g === !0 && (r |= 8)) : r = 0, g = Et(3, null, null, r), n.current = g, g.stateNode = n, g.memoizedState = { element: u, isDehydrated: s, cache: null, transitions: null, pendingSuspenseBoundaries: null }, ru(g), n;
  }
  function d1(n, r, s) {
    var u = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return { $$typeof: W, key: u == null ? null : "" + u, children: n, containerInfo: r, implementation: s };
  }
  function vh(n) {
    if (!n) return En;
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
      if (ft(s)) return Gp(n, s, r);
    }
    return r;
  }
  function Sh(n, r, s, u, h, g, k, P, M) {
    return n = Hu(s, u, !0, n, h, g, k, P, M), n.context = vh(null), s = n.current, u = st(), h = Fn(s), g = fn(u, h), g.callback = r ?? null, Nn(s, g, h), n.current.lanes = h, Do(n, h, u), ht(n, u), n;
  }
  function Hs(n, r, s, u) {
    var h = r.current, g = st(), k = Fn(h);
    return s = vh(s), r.context === null ? r.context = s : r.pendingContext = s, r = fn(g, k), r.payload = { element: n }, u = u === void 0 ? null : u, u !== null && (r.callback = u), n = Nn(h, r, k), n !== null && (Bt(n, h, k, g), xs(n, h, k)), k;
  }
  function Ws(n) {
    if (n = n.current, !n.child) return null;
    switch (n.child.tag) {
      case 5:
        return n.child.stateNode;
      default:
        return n.child.stateNode;
    }
  }
  function wh(n, r) {
    if (n = n.memoizedState, n !== null && n.dehydrated !== null) {
      var s = n.retryLane;
      n.retryLane = s !== 0 && s < r ? s : r;
    }
  }
  function Wu(n, r) {
    wh(n, r), (n = n.alternate) && wh(n, r);
  }
  function f1() {
    return null;
  }
  var xh = typeof reportError == "function" ? reportError : function(n) {
    console.error(n);
  };
  function Gu(n) {
    this._internalRoot = n;
  }
  Gs.prototype.render = Gu.prototype.render = function(n) {
    var r = this._internalRoot;
    if (r === null) throw Error(o(409));
    Hs(n, r, null, null);
  }, Gs.prototype.unmount = Gu.prototype.unmount = function() {
    var n = this._internalRoot;
    if (n !== null) {
      this._internalRoot = null;
      var r = n.containerInfo;
      cr(function() {
        Hs(null, n, null, null);
      }), r[an] = null;
    }
  };
  function Gs(n) {
    this._internalRoot = n;
  }
  Gs.prototype.unstable_scheduleHydration = function(n) {
    if (n) {
      var r = op();
      n = { blockedOn: null, target: n, priority: r };
      for (var s = 0; s < kn.length && r !== 0 && r < kn[s].priority; s++) ;
      kn.splice(s, 0, n), s === 0 && ap(n);
    }
  };
  function Ku(n) {
    return !(!n || n.nodeType !== 1 && n.nodeType !== 9 && n.nodeType !== 11);
  }
  function Ks(n) {
    return !(!n || n.nodeType !== 1 && n.nodeType !== 9 && n.nodeType !== 11 && (n.nodeType !== 8 || n.nodeValue !== " react-mount-point-unstable "));
  }
  function _h() {
  }
  function p1(n, r, s, u, h) {
    if (h) {
      if (typeof u == "function") {
        var g = u;
        u = function() {
          var F = Ws(k);
          g.call(F);
        };
      }
      var k = Sh(r, u, n, 0, null, !1, !1, "", _h);
      return n._reactRootContainer = k, n[an] = k.current, Ko(n.nodeType === 8 ? n.parentNode : n), cr(), k;
    }
    for (; h = n.lastChild; ) n.removeChild(h);
    if (typeof u == "function") {
      var P = u;
      u = function() {
        var F = Ws(M);
        P.call(F);
      };
    }
    var M = Hu(n, 0, !1, null, null, !1, !1, "", _h);
    return n._reactRootContainer = M, n[an] = M.current, Ko(n.nodeType === 8 ? n.parentNode : n), cr(function() {
      Hs(r, M, s, u);
    }), M;
  }
  function Ys(n, r, s, u, h) {
    var g = s._reactRootContainer;
    if (g) {
      var k = g;
      if (typeof h == "function") {
        var P = h;
        h = function() {
          var M = Ws(k);
          P.call(M);
        };
      }
      Hs(r, k, n, h);
    } else k = p1(s, r, n, h, u);
    return Ws(k);
  }
  np = function(n) {
    switch (n.tag) {
      case 3:
        var r = n.stateNode;
        if (r.current.memoizedState.isDehydrated) {
          var s = No(r.pendingLanes);
          s !== 0 && (gl(r, s | 1), ht(r, Le()), (he & 6) === 0 && (qr = Le() + 500, Mn()));
        }
        break;
      case 13:
        cr(function() {
          var u = dn(n, 1);
          if (u !== null) {
            var h = st();
            Bt(u, n, 1, h);
          }
        }), Wu(n, 1);
    }
  }, vl = function(n) {
    if (n.tag === 13) {
      var r = dn(n, 134217728);
      if (r !== null) {
        var s = st();
        Bt(r, n, 134217728, s);
      }
      Wu(n, 134217728);
    }
  }, rp = function(n) {
    if (n.tag === 13) {
      var r = Fn(n), s = dn(n, r);
      if (s !== null) {
        var u = st();
        Bt(s, n, r, u);
      }
      Wu(n, r);
    }
  }, op = function() {
    return _e;
  }, ip = function(n, r) {
    var s = _e;
    try {
      return _e = n, r();
    } finally {
      _e = s;
    }
  }, cl = function(n, r, s) {
    switch (r) {
      case "input":
        if (nl(n, s), r = s.name, s.type === "radio" && r != null) {
          for (s = n; s.parentNode; ) s = s.parentNode;
          for (s = s.querySelectorAll("input[name=" + JSON.stringify("" + r) + '][type="radio"]'), r = 0; r < s.length; r++) {
            var u = s[r];
            if (u !== n && u.form === n.form) {
              var h = ds(u);
              if (!h) throw Error(o(90));
              Ef(u), nl(u, h);
            }
          }
        }
        break;
      case "textarea":
        jf(n, s);
        break;
      case "select":
        r = s.value, r != null && Mr(n, !!s.multiple, r, !1);
    }
  }, Uf = Lu, Hf = cr;
  var m1 = { usingClientEntryPoint: !1, Events: [Xo, zr, ds, Bf, $f, Lu] }, ci = { findFiberByHostInstance: nr, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, h1 = { bundleType: ci.bundleType, version: ci.version, rendererPackageName: ci.rendererPackageName, rendererConfig: ci.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: N.ReactCurrentDispatcher, findHostInstanceByFiber: function(n) {
    return n = Yf(n), n === null ? null : n.stateNode;
  }, findFiberByHostInstance: ci.findFiberByHostInstance || f1, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Qs = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Qs.isDisabled && Qs.supportsFiber) try {
      Gi = Qs.inject(h1), Yt = Qs;
    } catch {
    }
  }
  return yt.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = m1, yt.createPortal = function(n, r) {
    var s = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!Ku(r)) throw Error(o(200));
    return d1(n, r, null, s);
  }, yt.createRoot = function(n, r) {
    if (!Ku(n)) throw Error(o(299));
    var s = !1, u = "", h = xh;
    return r != null && (r.unstable_strictMode === !0 && (s = !0), r.identifierPrefix !== void 0 && (u = r.identifierPrefix), r.onRecoverableError !== void 0 && (h = r.onRecoverableError)), r = Hu(n, 1, !1, null, null, s, !1, u, h), n[an] = r.current, Ko(n.nodeType === 8 ? n.parentNode : n), new Gu(r);
  }, yt.findDOMNode = function(n) {
    if (n == null) return null;
    if (n.nodeType === 1) return n;
    var r = n._reactInternals;
    if (r === void 0)
      throw typeof n.render == "function" ? Error(o(188)) : (n = Object.keys(n).join(","), Error(o(268, n)));
    return n = Yf(r), n = n === null ? null : n.stateNode, n;
  }, yt.flushSync = function(n) {
    return cr(n);
  }, yt.hydrate = function(n, r, s) {
    if (!Ks(r)) throw Error(o(200));
    return Ys(null, n, r, !0, s);
  }, yt.hydrateRoot = function(n, r, s) {
    if (!Ku(n)) throw Error(o(405));
    var u = s != null && s.hydratedSources || null, h = !1, g = "", k = xh;
    if (s != null && (s.unstable_strictMode === !0 && (h = !0), s.identifierPrefix !== void 0 && (g = s.identifierPrefix), s.onRecoverableError !== void 0 && (k = s.onRecoverableError)), r = Sh(r, null, n, 1, s ?? null, h, !1, g, k), n[an] = r.current, Ko(n), u) for (n = 0; n < u.length; n++) s = u[n], h = s._getVersion, h = h(s._source), r.mutableSourceEagerHydrationData == null ? r.mutableSourceEagerHydrationData = [s, h] : r.mutableSourceEagerHydrationData.push(
      s,
      h
    );
    return new Gs(r);
  }, yt.render = function(n, r, s) {
    if (!Ks(r)) throw Error(o(200));
    return Ys(null, n, r, !1, s);
  }, yt.unmountComponentAtNode = function(n) {
    if (!Ks(n)) throw Error(o(40));
    return n._reactRootContainer ? (cr(function() {
      Ys(null, null, n, !1, function() {
        n._reactRootContainer = null, n[an] = null;
      });
    }), !0) : !1;
  }, yt.unstable_batchedUpdates = Lu, yt.unstable_renderSubtreeIntoContainer = function(n, r, s, u) {
    if (!Ks(s)) throw Error(o(200));
    if (n == null || n._reactInternals === void 0) throw Error(o(38));
    return Ys(n, r, s, !1, u);
  }, yt.version = "18.3.1-next-f1338f8080-20240426", yt;
}
var Rh;
function Lg() {
  if (Rh) return Qu.exports;
  Rh = 1;
  function e() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(e);
      } catch (t) {
        console.error(t);
      }
  }
  return e(), Qu.exports = b1(), Qu.exports;
}
var Nh;
function C1() {
  if (Nh) return Xs;
  Nh = 1;
  var e = Lg();
  return Xs.createRoot = e.createRoot, Xs.hydrateRoot = e.hydrateRoot, Xs;
}
var P1 = C1(), Ju = { exports: {} }, fi = {};
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
function E1() {
  if (Dh) return fi;
  Dh = 1;
  var e = bd(), t = Symbol.for("react.element"), o = Symbol.for("react.fragment"), i = Object.prototype.hasOwnProperty, a = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, f = { key: !0, ref: !0, __self: !0, __source: !0 };
  function d(p, m, y) {
    var v, l = {}, c = null, S = null;
    y !== void 0 && (c = "" + y), m.key !== void 0 && (c = "" + m.key), m.ref !== void 0 && (S = m.ref);
    for (v in m) i.call(m, v) && !f.hasOwnProperty(v) && (l[v] = m[v]);
    if (p && p.defaultProps) for (v in m = p.defaultProps, m) l[v] === void 0 && (l[v] = m[v]);
    return { $$typeof: t, type: p, key: c, ref: S, props: l, _owner: a.current };
  }
  return fi.Fragment = o, fi.jsx = d, fi.jsxs = d, fi;
}
var jh;
function M1() {
  return jh || (jh = 1, Ju.exports = E1()), Ju.exports;
}
var w = M1();
const Ih = (e) => Symbol.iterator in e, Fh = (e) => (
  // HACK: avoid checking entries type
  "entries" in e
), Oh = (e, t) => {
  const o = e instanceof Map ? e : new Map(e.entries()), i = t instanceof Map ? t : new Map(t.entries());
  if (o.size !== i.size)
    return !1;
  for (const [a, f] of o)
    if (!i.has(a) || !Object.is(f, i.get(a)))
      return !1;
  return !0;
}, R1 = (e, t) => {
  const o = e[Symbol.iterator](), i = t[Symbol.iterator]();
  let a = o.next(), f = i.next();
  for (; !a.done && !f.done; ) {
    if (!Object.is(a.value, f.value))
      return !1;
    a = o.next(), f = i.next();
  }
  return !!a.done && !!f.done;
};
function N1(e, t) {
  return Object.is(e, t) ? !0 : typeof e != "object" || e === null || typeof t != "object" || t === null || Object.getPrototypeOf(e) !== Object.getPrototypeOf(t) ? !1 : Ih(e) && Ih(t) ? Fh(e) && Fh(t) ? Oh(e, t) : R1(e, t) : Oh(
    { entries: () => Object.entries(e) },
    { entries: () => Object.entries(t) }
  );
}
function D1(e) {
  const t = gn.useRef(void 0);
  return (o) => {
    const i = e(o);
    return N1(t.current, i) ? t.current : t.current = i;
  };
}
const Cd = b.createContext({});
function Pd(e) {
  const t = b.useRef(null);
  return t.current === null && (t.current = e()), t.current;
}
const j1 = typeof window < "u", Vg = j1 ? b.useLayoutEffect : b.useEffect, Ha = /* @__PURE__ */ b.createContext(null);
function Ed(e, t) {
  e.indexOf(t) === -1 && e.push(t);
}
function Ca(e, t) {
  const o = e.indexOf(t);
  o > -1 && e.splice(o, 1);
}
const sn = (e, t, o) => o > t ? t : o < e ? e : o;
function Lh(e, t) {
  return t ? `${e}. For more information and steps for solving, visit https://motion.dev/troubleshooting/${t}` : e;
}
let Mi = () => {
}, Pr = () => {
};
var Ng;
typeof process < "u" && ((Ng = process.env) == null ? void 0 : Ng.NODE_ENV) !== "production" && (Mi = (e, t, o) => {
  !e && typeof console < "u" && console.warn(Lh(t, o));
}, Pr = (e, t, o) => {
  if (!e)
    throw new Error(Lh(t, o));
});
const Qn = {}, zg = (e) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(e), Bg = (e) => typeof e == "object" && e !== null, $g = (e) => /^0[^.\s]+$/u.test(e);
// @__NO_SIDE_EFFECTS__
function Ug(e) {
  let t;
  return () => (t === void 0 && (t = e()), t);
}
const jt = /* @__NO_SIDE_EFFECTS__ */ (e) => e, Ri = (...e) => e.reduce((t, o) => (i) => o(t(i))), Ti = /* @__NO_SIDE_EFFECTS__ */ (e, t, o) => {
  const i = t - e;
  return i ? (o - e) / i : 1;
};
class Md {
  constructor() {
    this.subscriptions = [];
  }
  add(t) {
    return Ed(this.subscriptions, t), () => Ca(this.subscriptions, t);
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
const gt = /* @__NO_SIDE_EFFECTS__ */ (e) => e * 1e3, Dt = /* @__NO_SIDE_EFFECTS__ */ (e) => e / 1e3, Hg = /* @__NO_SIDE_EFFECTS__ */ (e, t) => t ? e * (1e3 / t) : 0, Wg = (e, t, o) => (((1 - 3 * o + 3 * t) * e + (3 * o - 6 * t)) * e + 3 * t) * e, I1 = 1e-7, F1 = 12;
function O1(e, t, o, i, a) {
  let f, d, p = 0;
  do
    d = t + (o - t) / 2, f = Wg(d, i, a) - e, f > 0 ? o = d : t = d;
  while (Math.abs(f) > I1 && ++p < F1);
  return d;
}
// @__NO_SIDE_EFFECTS__
function Ni(e, t, o, i) {
  if (e === t && o === i)
    return jt;
  const a = (f) => O1(f, 0, 1, e, o);
  return (f) => f === 0 || f === 1 ? f : Wg(a(f), t, i);
}
const Gg = /* @__NO_SIDE_EFFECTS__ */ (e) => (t) => t <= 0.5 ? e(2 * t) / 2 : (2 - e(2 * (1 - t))) / 2, Kg = /* @__NO_SIDE_EFFECTS__ */ (e) => (t) => 1 - e(1 - t), Yg = /* @__PURE__ */ Ni(0.33, 1.53, 0.69, 0.99), Rd = /* @__PURE__ */ Kg(Yg), Qg = /* @__PURE__ */ Gg(Rd), Xg = (e) => e >= 1 ? 1 : (e *= 2) < 1 ? 0.5 * Rd(e) : 0.5 * (2 - Math.pow(2, -10 * (e - 1))), Nd = (e) => 1 - Math.sin(Math.acos(e)), Zg = /* @__PURE__ */ Kg(Nd), Jg = /* @__PURE__ */ Gg(Nd), L1 = /* @__PURE__ */ Ni(0.42, 0, 1, 1), V1 = /* @__PURE__ */ Ni(0, 0, 0.58, 1), qg = /* @__PURE__ */ Ni(0.42, 0, 0.58, 1), z1 = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] != "number", ev = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] == "number", Vh = {
  linear: jt,
  easeIn: L1,
  easeInOut: qg,
  easeOut: V1,
  circIn: Nd,
  circInOut: Jg,
  circOut: Zg,
  backIn: Rd,
  backInOut: Qg,
  backOut: Yg,
  anticipate: Xg
}, B1 = (e) => typeof e == "string", zh = (e) => {
  if (/* @__PURE__ */ ev(e)) {
    Pr(e.length === 4, "Cubic bezier arrays must contain four numerical values.", "cubic-bezier-length");
    const [t, o, i, a] = e;
    return /* @__PURE__ */ Ni(t, o, i, a);
  } else if (B1(e))
    return Pr(Vh[e] !== void 0, `Invalid easing type '${e}'`, "invalid-easing-type"), Vh[e];
  return e;
}, Zs = [
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
function $1(e, t) {
  let o = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Set(), a = !1, f = !1;
  const d = /* @__PURE__ */ new WeakSet();
  let p = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  };
  function m(v) {
    d.has(v) && (y.schedule(v), e()), v(p);
  }
  const y = {
    /**
     * Schedule a process to run on the next frame.
     */
    schedule: (v, l = !1, c = !1) => {
      const x = c && a ? o : i;
      return l && d.add(v), x.add(v), v;
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
      if (p = v, a) {
        f = !0;
        return;
      }
      a = !0;
      const l = o;
      o = i, i = l, o.forEach(m), o.clear(), a = !1, f && (f = !1, y.process(v));
    }
  };
  return y;
}
const U1 = 40;
function tv(e, t) {
  let o = !1, i = !0;
  const a = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  }, f = () => o = !0, d = Zs.reduce((E, N) => (E[N] = $1(f), E), {}), { setup: p, read: m, resolveKeyframes: y, preUpdate: v, update: l, preRender: c, render: S, postRender: x } = d, _ = () => {
    const E = Qn.useManualTiming, N = E ? a.timestamp : performance.now();
    o = !1, E || (a.delta = i ? 1e3 / 60 : Math.max(Math.min(N - a.timestamp, U1), 1)), a.timestamp = N, a.isProcessing = !0, p.process(a), m.process(a), y.process(a), v.process(a), l.process(a), c.process(a), S.process(a), x.process(a), a.isProcessing = !1, o && t && (i = !1, e(_));
  }, A = () => {
    o = !0, i = !0, a.isProcessing || e(_);
  };
  return { schedule: Zs.reduce((E, N) => {
    const O = d[N];
    return E[N] = (W, H = !1, Y = !1) => (o || A(), O.schedule(W, H, Y)), E;
  }, {}), cancel: (E) => {
    for (let N = 0; N < Zs.length; N++)
      d[Zs[N]].cancel(E);
  }, state: a, steps: d };
}
const { schedule: Ce, cancel: Xn, state: Je, steps: qu } = /* @__PURE__ */ tv(typeof requestAnimationFrame < "u" ? requestAnimationFrame : jt, !0);
let pa;
function H1() {
  pa = void 0;
}
const lt = {
  now: () => (pa === void 0 && lt.set(Je.isProcessing || Qn.useManualTiming ? Je.timestamp : performance.now()), pa),
  set: (e) => {
    pa = e, queueMicrotask(H1);
  }
}, nv = (e) => (t) => typeof t == "string" && t.startsWith(e), rv = /* @__PURE__ */ nv("--"), W1 = /* @__PURE__ */ nv("var(--"), Dd = (e) => W1(e) ? G1.test(e.split("/*")[0].trim()) : !1, G1 = /var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;
function Bh(e) {
  return typeof e != "string" ? !1 : e.split("/*")[0].includes("var(--");
}
const So = {
  test: (e) => typeof e == "number",
  parse: parseFloat,
  transform: (e) => e
}, ki = {
  ...So,
  transform: (e) => sn(0, 1, e)
}, Js = {
  ...So,
  default: 1
}, yi = (e) => Math.round(e * 1e5) / 1e5, jd = /-?(?:\d+(?:\.\d+)?|\.\d+)/gu;
function K1(e) {
  return e == null;
}
const Y1 = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu, Id = (e, t) => (o) => !!(typeof o == "string" && Y1.test(o) && o.startsWith(e) || t && !K1(o) && Object.prototype.hasOwnProperty.call(o, t)), ov = (e, t, o) => (i) => {
  if (typeof i != "string")
    return i;
  const [a, f, d, p] = i.match(jd);
  return {
    [e]: parseFloat(a),
    [t]: parseFloat(f),
    [o]: parseFloat(d),
    alpha: p !== void 0 ? parseFloat(p) : 1
  };
}, Q1 = (e) => sn(0, 255, e), ec = {
  ...So,
  transform: (e) => Math.round(Q1(e))
}, wr = {
  test: /* @__PURE__ */ Id("rgb", "red"),
  parse: /* @__PURE__ */ ov("red", "green", "blue"),
  transform: ({ red: e, green: t, blue: o, alpha: i = 1 }) => "rgba(" + ec.transform(e) + ", " + ec.transform(t) + ", " + ec.transform(o) + ", " + yi(ki.transform(i)) + ")"
};
function X1(e) {
  let t = "", o = "", i = "", a = "";
  return e.length > 5 ? (t = e.substring(1, 3), o = e.substring(3, 5), i = e.substring(5, 7), a = e.substring(7, 9)) : (t = e.substring(1, 2), o = e.substring(2, 3), i = e.substring(3, 4), a = e.substring(4, 5), t += t, o += o, i += i, a += a), {
    red: parseInt(t, 16),
    green: parseInt(o, 16),
    blue: parseInt(i, 16),
    alpha: a ? parseInt(a, 16) / 255 : 1
  };
}
const bc = {
  test: /* @__PURE__ */ Id("#"),
  parse: X1,
  transform: wr.transform
}, Di = /* @__NO_SIDE_EFFECTS__ */ (e) => ({
  test: (t) => typeof t == "string" && t.endsWith(e) && t.split(" ").length === 1,
  parse: parseFloat,
  transform: (t) => `${t}${e}`
}), hn = /* @__PURE__ */ Di("deg"), on = /* @__PURE__ */ Di("%"), re = /* @__PURE__ */ Di("px"), Z1 = /* @__PURE__ */ Di("vh"), J1 = /* @__PURE__ */ Di("vw"), $h = {
  ...on,
  parse: (e) => on.parse(e) / 100,
  transform: (e) => on.transform(e * 100)
}, lo = {
  test: /* @__PURE__ */ Id("hsl", "hue"),
  parse: /* @__PURE__ */ ov("hue", "saturation", "lightness"),
  transform: ({ hue: e, saturation: t, lightness: o, alpha: i = 1 }) => "hsla(" + Math.round(e) + ", " + on.transform(yi(t)) + ", " + on.transform(yi(o)) + ", " + yi(ki.transform(i)) + ")"
}, Be = {
  test: (e) => wr.test(e) || bc.test(e) || lo.test(e),
  parse: (e) => wr.test(e) ? wr.parse(e) : lo.test(e) ? lo.parse(e) : bc.parse(e),
  transform: (e) => typeof e == "string" ? e : e.hasOwnProperty("red") ? wr.transform(e) : lo.transform(e),
  getAnimatableNone: (e) => {
    const t = Be.parse(e);
    return t.alpha = 0, Be.transform(t);
  }
}, q1 = /(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;
function e_(e) {
  var t, o;
  return isNaN(e) && typeof e == "string" && (((t = e.match(jd)) == null ? void 0 : t.length) || 0) + (((o = e.match(q1)) == null ? void 0 : o.length) || 0) > 0;
}
const iv = "number", sv = "color", t_ = "var", n_ = "var(", Uh = "${}", r_ = /var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;
function ho(e) {
  const t = e.toString(), o = [], i = {
    color: [],
    number: [],
    var: []
  }, a = [];
  let f = 0;
  const p = t.replace(r_, (m) => (Be.test(m) ? (i.color.push(f), a.push(sv), o.push(Be.parse(m))) : m.startsWith(n_) ? (i.var.push(f), a.push(t_), o.push(m)) : (i.number.push(f), a.push(iv), o.push(parseFloat(m))), ++f, Uh)).split(Uh);
  return { values: o, split: p, indexes: i, types: a };
}
function o_(e) {
  return ho(e).values;
}
function av({ split: e, types: t }) {
  const o = e.length;
  return (i) => {
    let a = "";
    for (let f = 0; f < o; f++)
      if (a += e[f], i[f] !== void 0) {
        const d = t[f];
        d === iv ? a += yi(i[f]) : d === sv ? a += Be.transform(i[f]) : a += i[f];
      }
    return a;
  };
}
function i_(e) {
  return av(ho(e));
}
const s_ = (e) => typeof e == "number" ? 0 : Be.test(e) ? Be.getAnimatableNone(e) : e, a_ = (e, t) => typeof e == "number" ? t != null && t.trim().endsWith("/") ? e : 0 : s_(e);
function l_(e) {
  const t = ho(e);
  return av(t)(t.values.map((i, a) => a_(i, t.split[a])));
}
const Wt = {
  test: e_,
  parse: o_,
  createTransformer: i_,
  getAnimatableNone: l_
};
function tc(e, t, o) {
  return o < 0 && (o += 1), o > 1 && (o -= 1), o < 1 / 6 ? e + (t - e) * 6 * o : o < 1 / 2 ? t : o < 2 / 3 ? e + (t - e) * (2 / 3 - o) * 6 : e;
}
function u_({ hue: e, saturation: t, lightness: o, alpha: i }) {
  e /= 360, t /= 100, o /= 100;
  let a = 0, f = 0, d = 0;
  if (!t)
    a = f = d = o;
  else {
    const p = o < 0.5 ? o * (1 + t) : o + t - o * t, m = 2 * o - p;
    a = tc(m, p, e + 1 / 3), f = tc(m, p, e), d = tc(m, p, e - 1 / 3);
  }
  return {
    red: Math.round(a * 255),
    green: Math.round(f * 255),
    blue: Math.round(d * 255),
    alpha: i
  };
}
function Pa(e, t) {
  return (o) => o > 0 ? t : e;
}
const be = (e, t, o) => e + (t - e) * o, nc = (e, t, o) => {
  const i = e * e, a = o * (t * t - i) + i;
  return a < 0 ? 0 : Math.sqrt(a);
}, c_ = [bc, wr, lo], d_ = (e) => c_.find((t) => t.test(e));
function Hh(e) {
  const t = d_(e);
  if (Mi(!!t, `'${e}' is not an animatable color. Use the equivalent color code instead.`, "color-not-animatable"), !t)
    return !1;
  let o = t.parse(e);
  return t === lo && (o = u_(o)), o;
}
const Wh = (e, t) => {
  const o = Hh(e), i = Hh(t);
  if (!o || !i)
    return Pa(e, t);
  const a = { ...o };
  return (f) => (a.red = nc(o.red, i.red, f), a.green = nc(o.green, i.green, f), a.blue = nc(o.blue, i.blue, f), a.alpha = be(o.alpha, i.alpha, f), wr.transform(a));
}, Cc = /* @__PURE__ */ new Set(["none", "hidden"]);
function f_(e, t) {
  return Cc.has(e) ? (o) => o <= 0 ? e : t : (o) => o >= 1 ? t : e;
}
function p_(e, t) {
  return (o) => be(e, t, o);
}
function Fd(e) {
  return typeof e == "number" ? p_ : typeof e == "string" ? Dd(e) ? Pa : Be.test(e) ? Wh : y_ : Array.isArray(e) ? lv : typeof e == "object" ? Be.test(e) ? Wh : m_ : Pa;
}
function lv(e, t) {
  const o = [...e], i = o.length, a = e.map((f, d) => Fd(f)(f, t[d]));
  return (f) => {
    for (let d = 0; d < i; d++)
      o[d] = a[d](f);
    return o;
  };
}
function m_(e, t) {
  const o = { ...e, ...t }, i = {};
  for (const a in o)
    e[a] !== void 0 && t[a] !== void 0 && (i[a] = Fd(e[a])(e[a], t[a]));
  return (a) => {
    for (const f in i)
      o[f] = i[f](a);
    return o;
  };
}
function h_(e, t) {
  const o = [], i = { color: 0, var: 0, number: 0 };
  for (let a = 0; a < t.values.length; a++) {
    const f = t.types[a], d = e.indexes[f][i[f]], p = e.values[d] ?? 0;
    o[a] = p, i[f]++;
  }
  return o;
}
const y_ = (e, t) => {
  const o = Wt.createTransformer(t), i = ho(e), a = ho(t);
  return i.indexes.var.length === a.indexes.var.length && i.indexes.color.length === a.indexes.color.length && i.indexes.number.length >= a.indexes.number.length ? Cc.has(e) && !a.values.length || Cc.has(t) && !i.values.length ? f_(e, t) : Ri(lv(h_(i, a), a.values), o) : (Mi(!0, `Complex values '${e}' and '${t}' too different to mix. Ensure all colors are of the same type, and that each contains the same quantity of number and color values. Falling back to instant transition.`, "complex-values-different"), Pa(e, t));
};
function uv(e, t, o) {
  return typeof e == "number" && typeof t == "number" && typeof o == "number" ? be(e, t, o) : Fd(e)(e, t);
}
const g_ = (e) => {
  const t = ({ timestamp: o }) => e(o);
  return {
    start: (o = !0) => Ce.update(t, o),
    stop: () => Xn(t),
    /**
     * If we're processing this frame we can use the
     * framelocked timestamp to keep things in sync.
     */
    now: () => Je.isProcessing ? Je.timestamp : lt.now()
  };
}, cv = (e, t, o = 10) => {
  let i = "";
  const a = Math.max(Math.round(t / o), 2);
  for (let f = 0; f < a; f++)
    i += Math.round(e(f / (a - 1)) * 1e4) / 1e4 + ", ";
  return `linear(${i.substring(0, i.length - 2)})`;
}, Ea = 2e4;
function Od(e) {
  let t = 0;
  const o = 50;
  let i = e.next(t);
  for (; !i.done && t < Ea; )
    t += o, i = e.next(t);
  return t >= Ea ? 1 / 0 : t;
}
function v_(e, t = 100, o) {
  const i = o({ ...e, keyframes: [0, t] }), a = Math.min(Od(i), Ea);
  return {
    type: "keyframes",
    ease: (f) => i.next(a * f).value / t,
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
function Pc(e, t) {
  return e * Math.sqrt(1 - t * t);
}
const S_ = 12;
function w_(e, t, o) {
  let i = o;
  for (let a = 1; a < S_; a++)
    i = i - e(i) / t(i);
  return i;
}
const rc = 1e-3;
function x_({ duration: e = Fe.duration, bounce: t = Fe.bounce, velocity: o = Fe.velocity, mass: i = Fe.mass }) {
  let a, f;
  Mi(e <= /* @__PURE__ */ gt(Fe.maxDuration), "Spring duration must be 10 seconds or less", "spring-duration-limit");
  let d = 1 - t;
  d = sn(Fe.minDamping, Fe.maxDamping, d), e = sn(Fe.minDuration, Fe.maxDuration, /* @__PURE__ */ Dt(e)), d < 1 ? (a = (y) => {
    const v = y * d, l = v * e, c = v - o, S = Pc(y, d), x = Math.exp(-l);
    return rc - c / S * x;
  }, f = (y) => {
    const l = y * d * e, c = l * o + o, S = Math.pow(d, 2) * Math.pow(y, 2) * e, x = Math.exp(-l), _ = Pc(Math.pow(y, 2), d);
    return (-a(y) + rc > 0 ? -1 : 1) * ((c - S) * x) / _;
  }) : (a = (y) => {
    const v = Math.exp(-y * e), l = (y - o) * e + 1;
    return -rc + v * l;
  }, f = (y) => {
    const v = Math.exp(-y * e), l = (o - y) * (e * e);
    return v * l;
  });
  const p = 5 / e, m = w_(a, f, p);
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
const __ = ["duration", "bounce"], T_ = ["stiffness", "damping", "mass"];
function Gh(e, t) {
  return t.some((o) => e[o] !== void 0);
}
function k_(e) {
  let t = {
    velocity: Fe.velocity,
    stiffness: Fe.stiffness,
    damping: Fe.damping,
    mass: Fe.mass,
    isResolvedFromDuration: !1,
    ...e
  };
  if (!Gh(e, T_) && Gh(e, __))
    if (t.velocity = 0, e.visualDuration) {
      const o = e.visualDuration, i = 2 * Math.PI / (o * 1.2), a = i * i, f = 2 * sn(0.05, 1, 1 - (e.bounce || 0)) * Math.sqrt(a);
      t = {
        ...t,
        mass: Fe.mass,
        stiffness: a,
        damping: f
      };
    } else {
      const o = x_({ ...e, velocity: 0 });
      t = {
        ...t,
        ...o,
        mass: Fe.mass
      }, t.isResolvedFromDuration = !0;
    }
  return t;
}
function Ma(e = Fe.visualDuration, t = Fe.bounce) {
  const o = typeof e != "object" ? {
    visualDuration: e,
    keyframes: [0, 1],
    bounce: t
  } : e;
  let { restSpeed: i, restDelta: a } = o;
  const f = o.keyframes[0], d = o.keyframes[o.keyframes.length - 1], p = { done: !1, value: f }, { stiffness: m, damping: y, mass: v, duration: l, velocity: c, isResolvedFromDuration: S } = k_({
    ...o,
    velocity: -/* @__PURE__ */ Dt(o.velocity || 0)
  }), x = c || 0, _ = y / (2 * Math.sqrt(m * v)), A = d - f, T = /* @__PURE__ */ Dt(Math.sqrt(m / v)), C = Math.abs(A) < 5;
  i || (i = C ? Fe.restSpeed.granular : Fe.restSpeed.default), a || (a = C ? Fe.restDelta.granular : Fe.restDelta.default);
  let E, N, O, W, H, Y;
  if (_ < 1)
    O = Pc(T, _), W = (x + _ * T * A) / O, E = (X) => {
      const se = Math.exp(-_ * T * X);
      return d - se * (W * Math.sin(O * X) + A * Math.cos(O * X));
    }, H = _ * T * W + A * O, Y = _ * T * A - W * O, N = (X) => Math.exp(-_ * T * X) * (H * Math.sin(O * X) + Y * Math.cos(O * X));
  else if (_ === 1) {
    E = (se) => d - Math.exp(-T * se) * (A + (x + T * A) * se);
    const X = x + T * A;
    N = (se) => Math.exp(-T * se) * (T * X * se - x);
  } else {
    const X = T * Math.sqrt(_ * _ - 1);
    E = (ce) => {
      const ye = Math.exp(-_ * T * ce), ee = Math.min(X * ce, 300);
      return d - ye * ((x + _ * T * A) * Math.sinh(ee) + X * A * Math.cosh(ee)) / X;
    };
    const se = (x + _ * T * A) / X, Z = _ * T * se - A * X, de = _ * T * A - se * X;
    N = (ce) => {
      const ye = Math.exp(-_ * T * ce), ee = Math.min(X * ce, 300);
      return ye * (Z * Math.sinh(ee) + de * Math.cosh(ee));
    };
  }
  const L = {
    calculatedDuration: S && l || null,
    velocity: (X) => /* @__PURE__ */ gt(N(X)),
    next: (X) => {
      if (!S && _ < 1) {
        const Z = Math.exp(-_ * T * X), de = Math.sin(O * X), ce = Math.cos(O * X), ye = d - Z * (W * de + A * ce), ee = /* @__PURE__ */ gt(Z * (H * de + Y * ce));
        return p.done = Math.abs(ee) <= i && Math.abs(d - ye) <= a, p.value = p.done ? d : ye, p;
      }
      const se = E(X);
      if (S)
        p.done = X >= l;
      else {
        const Z = /* @__PURE__ */ gt(N(X));
        p.done = Math.abs(Z) <= i && Math.abs(d - se) <= a;
      }
      return p.value = p.done ? d : se, p;
    },
    toString: () => {
      const X = Math.min(Od(L), Ea), se = cv((Z) => L.next(X * Z).value, X, 30);
      return X + "ms " + se;
    },
    toTransition: () => {
    }
  };
  return L;
}
Ma.applyToOptions = (e) => {
  const t = v_(e, 100, Ma);
  return e.ease = t.ease, e.duration = /* @__PURE__ */ gt(t.duration), e.type = "keyframes", e;
};
const A_ = 5;
function dv(e, t, o) {
  const i = Math.max(t - A_, 0);
  return /* @__PURE__ */ Hg(o - e(i), t - i);
}
function Ec({ keyframes: e, velocity: t = 0, power: o = 0.8, timeConstant: i = 325, bounceDamping: a = 10, bounceStiffness: f = 500, modifyTarget: d, min: p, max: m, restDelta: y = 0.5, restSpeed: v }) {
  const l = e[0], c = {
    done: !1,
    value: l
  }, S = (Y) => p !== void 0 && Y < p || m !== void 0 && Y > m, x = (Y) => p === void 0 ? m : m === void 0 || Math.abs(p - Y) < Math.abs(m - Y) ? p : m;
  let _ = o * t;
  const A = l + _, T = d === void 0 ? A : d(A);
  T !== A && (_ = T - l);
  const C = (Y) => -_ * Math.exp(-Y / i), E = (Y) => T + C(Y), N = (Y) => {
    const L = C(Y), X = E(Y);
    c.done = Math.abs(L) <= y, c.value = c.done ? T : X;
  };
  let O, W;
  const H = (Y) => {
    S(c.value) && (O = Y, W = Ma({
      keyframes: [c.value, x(c.value)],
      velocity: dv(E, Y, c.value),
      // TODO: This should be passing * 1000
      damping: a,
      stiffness: f,
      restDelta: y,
      restSpeed: v
    }));
  };
  return H(0), {
    calculatedDuration: null,
    next: (Y) => {
      let L = !1;
      return !W && O === void 0 && (L = !0, N(Y), H(Y)), O !== void 0 && Y >= O ? W.next(Y - O) : (!L && N(Y), c);
    }
  };
}
function b_(e, t, o) {
  const i = [], a = o || Qn.mix || uv, f = e.length - 1;
  for (let d = 0; d < f; d++) {
    let p = a(e[d], e[d + 1]);
    if (t) {
      const m = Array.isArray(t) ? t[d] || jt : t;
      p = Ri(m, p);
    }
    i.push(p);
  }
  return i;
}
function C_(e, t, { clamp: o = !0, ease: i, mixer: a } = {}) {
  const f = e.length;
  if (Pr(f === t.length, "Both input and output ranges must be the same length", "range-length"), f === 1)
    return () => t[0];
  if (f === 2 && t[0] === t[1])
    return () => t[1];
  const d = e[0] === e[1];
  e[0] > e[f - 1] && (e = [...e].reverse(), t = [...t].reverse());
  const p = b_(t, i, a), m = p.length, y = (v) => {
    if (d && v < e[0])
      return t[0];
    let l = 0;
    if (m > 1)
      for (; l < e.length - 2 && !(v < e[l + 1]); l++)
        ;
    const c = /* @__PURE__ */ Ti(e[l], e[l + 1], v);
    return p[l](c);
  };
  return o ? (v) => y(sn(e[0], e[f - 1], v)) : y;
}
function P_(e, t) {
  const o = e[e.length - 1];
  for (let i = 1; i <= t; i++) {
    const a = /* @__PURE__ */ Ti(0, t, i);
    e.push(be(o, 1, a));
  }
}
function E_(e) {
  const t = [0];
  return P_(t, e.length - 1), t;
}
function M_(e, t) {
  return e.map((o) => o * t);
}
function R_(e, t) {
  return e.map(() => t || qg).splice(0, e.length - 1);
}
function gi({ duration: e = 300, keyframes: t, times: o, ease: i = "easeInOut" }) {
  const a = /* @__PURE__ */ z1(i) ? i.map(zh) : zh(i), f = {
    done: !1,
    value: t[0]
  }, d = M_(
    // Only use the provided offsets if they're the correct length
    // TODO Maybe we should warn here if there's a length mismatch
    o && o.length === t.length ? o : E_(t),
    e
  ), p = C_(d, t, {
    ease: Array.isArray(a) ? a : R_(t, a)
  });
  return {
    calculatedDuration: e,
    next: (m) => (f.value = p(m), f.done = m >= e, f)
  };
}
const N_ = (e) => e !== null;
function Wa(e, { repeat: t, repeatType: o = "loop" }, i, a = 1) {
  const f = e.filter(N_), p = a < 0 || t && o !== "loop" && t % 2 === 1 ? 0 : f.length - 1;
  return !p || i === void 0 ? f[p] : i;
}
const D_ = {
  decay: Ec,
  inertia: Ec,
  tween: gi,
  keyframes: gi,
  spring: Ma
};
function fv(e) {
  typeof e.type == "string" && (e.type = D_[e.type]);
}
class Ld {
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
const j_ = (e) => e / 100;
class Ra extends Ld {
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
    fv(t);
    const { type: o = gi, repeat: i = 0, repeatDelay: a = 0, repeatType: f, velocity: d = 0 } = t;
    let { keyframes: p } = t;
    const m = o || gi;
    m !== gi && typeof p[0] != "number" && (this.mixKeyframes = Ri(j_, uv(p[0], p[1])), p = [0, 100]);
    const y = m({ ...t, keyframes: p });
    f === "mirror" && (this.mirroredGenerator = m({
      ...t,
      keyframes: [...p].reverse(),
      velocity: -d
    })), y.calculatedDuration === null && (y.calculatedDuration = Od(y));
    const { calculatedDuration: v } = y;
    this.calculatedDuration = v, this.resolvedDuration = v + a, this.totalDuration = this.resolvedDuration * (i + 1) - a, this.generator = y;
  }
  updateTime(t) {
    const o = Math.round(t - this.startTime) * this.playbackSpeed;
    this.holdTime !== null ? this.currentTime = this.holdTime : this.currentTime = o;
  }
  tick(t, o = !1) {
    const { generator: i, totalDuration: a, mixKeyframes: f, mirroredGenerator: d, resolvedDuration: p, calculatedDuration: m } = this;
    if (this.startTime === null)
      return i.next(0);
    const { delay: y = 0, keyframes: v, repeat: l, repeatType: c, repeatDelay: S, type: x, onUpdate: _, finalKeyframe: A } = this.options;
    this.speed > 0 ? this.startTime = Math.min(this.startTime, t) : this.speed < 0 && (this.startTime = Math.min(t - a / this.speed, this.startTime)), o ? this.currentTime = t : this.updateTime(t);
    const T = this.currentTime - y * (this.playbackSpeed >= 0 ? 1 : -1), C = this.playbackSpeed >= 0 ? T < 0 : T > a;
    this.currentTime = Math.max(T, 0), this.state === "finished" && this.holdTime === null && (this.currentTime = a);
    let E = this.currentTime, N = i;
    if (l) {
      const Y = Math.min(this.currentTime, a) / p;
      let L = Math.floor(Y), X = Y % 1;
      !X && Y >= 1 && (X = 1), X === 1 && L--, L = Math.min(L, l + 1), !!(L % 2) && (c === "reverse" ? (X = 1 - X, S && (X -= S / p)) : c === "mirror" && (N = d)), E = sn(0, 1, X) * p;
    }
    let O;
    C ? (this.delayState.value = v[0], O = this.delayState) : O = N.next(E), f && !C && (O.value = f(O.value));
    let { done: W } = O;
    !C && m !== null && (W = this.playbackSpeed >= 0 ? this.currentTime >= a : this.currentTime <= 0);
    const H = this.holdTime === null && (this.state === "finished" || this.state === "running" && W);
    return H && x !== Ec && (O.value = Wa(v, this.options, A, this.speed)), _ && _(O.value), H && this.finish(), O;
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
    return /* @__PURE__ */ Dt(this.calculatedDuration);
  }
  get iterationDuration() {
    const { delay: t = 0 } = this.options || {};
    return this.duration + /* @__PURE__ */ Dt(t);
  }
  get time() {
    return /* @__PURE__ */ Dt(this.currentTime);
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
    return dv((i) => this.generator.next(i).value, t, o);
  }
  get speed() {
    return this.playbackSpeed;
  }
  set speed(t) {
    const o = this.playbackSpeed !== t;
    o && this.driver && this.updateTime(lt.now()), this.playbackSpeed = t, o && this.driver && (this.time = /* @__PURE__ */ Dt(this.currentTime));
  }
  play() {
    var a, f;
    if (this.isStopped)
      return;
    const { driver: t = g_, startTime: o } = this.options;
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
function I_(e) {
  for (let t = 1; t < e.length; t++)
    e[t] ?? (e[t] = e[t - 1]);
}
const xr = (e) => e * 180 / Math.PI, Mc = (e) => {
  const t = xr(Math.atan2(e[1], e[0]));
  return Rc(t);
}, F_ = {
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
}, Rc = (e) => (e = e % 360, e < 0 && (e += 360), e), Kh = Mc, Yh = (e) => Math.sqrt(e[0] * e[0] + e[1] * e[1]), Qh = (e) => Math.sqrt(e[4] * e[4] + e[5] * e[5]), O_ = {
  x: 12,
  y: 13,
  z: 14,
  translateX: 12,
  translateY: 13,
  translateZ: 14,
  scaleX: Yh,
  scaleY: Qh,
  scale: (e) => (Yh(e) + Qh(e)) / 2,
  rotateX: (e) => Rc(xr(Math.atan2(e[6], e[5]))),
  rotateY: (e) => Rc(xr(Math.atan2(-e[2], e[0]))),
  rotateZ: Kh,
  rotate: Kh,
  skewX: (e) => xr(Math.atan(e[4])),
  skewY: (e) => xr(Math.atan(e[1])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[4])) / 2
};
function Nc(e) {
  return e.includes("scale") ? 1 : 0;
}
function Dc(e, t) {
  if (!e || e === "none")
    return Nc(t);
  const o = e.match(/^matrix3d\(([-\d.e\s,]+)\)$/u);
  let i, a;
  if (o)
    i = O_, a = o;
  else {
    const p = e.match(/^matrix\(([-\d.e\s,]+)\)$/u);
    i = F_, a = p;
  }
  if (!a)
    return Nc(t);
  const f = i[t], d = a[1].split(",").map(V_);
  return typeof f == "function" ? f(d) : d[f];
}
const L_ = (e, t) => {
  const { transform: o = "none" } = getComputedStyle(e);
  return Dc(o, t);
};
function V_(e) {
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
], xo = /* @__PURE__ */ new Set([...wo, "pathRotation"]), Xh = (e) => e === So || e === re, z_ = /* @__PURE__ */ new Set(["x", "y", "z"]), B_ = wo.filter((e) => !z_.has(e));
function $_(e) {
  const t = [];
  return B_.forEach((o) => {
    const i = e.getValue(o);
    i !== void 0 && (t.push([o, i.get()]), i.set(o.startsWith("scale") ? 1 : 0));
  }), t;
}
const Wn = {
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
  x: (e, { transform: t }) => Dc(t, "x"),
  y: (e, { transform: t }) => Dc(t, "y")
};
Wn.translateX = Wn.x;
Wn.translateY = Wn.y;
const Tr = /* @__PURE__ */ new Set();
let jc = !1, Ic = !1, Fc = !1;
function pv() {
  if (Ic) {
    const e = Array.from(Tr).filter((i) => i.needsMeasurement), t = new Set(e.map((i) => i.element)), o = /* @__PURE__ */ new Map();
    t.forEach((i) => {
      const a = $_(i);
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
  Ic = !1, jc = !1, Tr.forEach((e) => e.complete(Fc)), Tr.clear();
}
function mv() {
  Tr.forEach((e) => {
    e.readKeyframes(), e.needsMeasurement && (Ic = !0);
  });
}
function U_() {
  Fc = !0, mv(), pv(), Fc = !1;
}
class Vd {
  constructor(t, o, i, a, f, d = !1) {
    this.state = "pending", this.isAsync = !1, this.needsMeasurement = !1, this.unresolvedKeyframes = [...t], this.onComplete = o, this.name = i, this.motionValue = a, this.element = f, this.isAsync = d;
  }
  scheduleResolve() {
    this.state = "scheduled", this.isAsync ? (Tr.add(this), jc || (jc = !0, Ce.read(mv), Ce.resolveKeyframes(pv))) : (this.readKeyframes(), this.complete());
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
    I_(t);
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
const H_ = (e) => e.startsWith("--");
function hv(e, t, o) {
  H_(t) ? e.style.setProperty(t, o) : e.style[t] = o;
}
const W_ = {};
function yv(e, t) {
  const o = /* @__PURE__ */ Ug(e);
  return () => W_[t] ?? o();
}
const G_ = /* @__PURE__ */ yv(() => window.ScrollTimeline !== void 0, "scrollTimeline"), gv = /* @__PURE__ */ yv(() => {
  try {
    document.createElement("div").animate({ opacity: 0 }, { easing: "linear(0, 1)" });
  } catch {
    return !1;
  }
  return !0;
}, "linearEasing"), mi = ([e, t, o, i]) => `cubic-bezier(${e}, ${t}, ${o}, ${i})`, Zh = {
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
function vv(e, t) {
  if (e)
    return typeof e == "function" ? gv() ? cv(e, t) : "ease-out" : /* @__PURE__ */ ev(e) ? mi(e) : Array.isArray(e) ? e.map((o) => vv(o, t) || Zh.easeOut) : Zh[e];
}
function K_(e, t, o, { delay: i = 0, duration: a = 300, repeat: f = 0, repeatType: d = "loop", ease: p = "easeOut", times: m } = {}, y = void 0) {
  const v = {
    [t]: o
  };
  m && (v.offset = m);
  const l = vv(p, a);
  Array.isArray(l) && (v.easing = l);
  const c = {
    delay: i,
    duration: a,
    easing: Array.isArray(l) ? "linear" : l,
    fill: "both",
    iterations: f + 1,
    direction: d === "reverse" ? "alternate" : "normal"
  };
  return y && (c.pseudoElement = y), e.animate(v, c);
}
function Sv(e) {
  return typeof e == "function" && "applyToOptions" in e;
}
function Y_({ type: e, ...t }) {
  return Sv(e) && gv() ? e.applyToOptions(t) : (t.duration ?? (t.duration = 300), t.ease ?? (t.ease = "easeOut"), t);
}
class wv extends Ld {
  constructor(t) {
    if (super(), this.finishedTime = null, this.isStopped = !1, this.manualStartTime = null, !t)
      return;
    const { element: o, name: i, keyframes: a, pseudoElement: f, allowFlatten: d = !1, finalKeyframe: p, onComplete: m } = t;
    this.isPseudoElement = !!f, this.allowFlatten = d, this.options = t, Pr(typeof t.type != "string", `Mini animate() doesn't support "type" as a string.`, "mini-spring");
    const y = Y_(t);
    this.animation = K_(o, i, a, y, f), y.autoplay === !1 && this.animation.pause(), this.animation.onfinish = () => {
      if (this.finishedTime = this.time, !f) {
        const v = Wa(a, this.options, p, this.speed);
        this.updateMotionValue && this.updateMotionValue(v), hv(o, i, v), this.animation.cancel();
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
    return /* @__PURE__ */ Dt(Number(t));
  }
  get iterationDuration() {
    const { delay: t = 0 } = this.options || {};
    return this.duration + /* @__PURE__ */ Dt(t);
  }
  get time() {
    return /* @__PURE__ */ Dt(Number(this.animation.currentTime) || 0);
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
    return this.allowFlatten && ((f = this.animation.effect) == null || f.updateTiming({ easing: "linear" })), this.animation.onfinish = null, t && G_() ? (this.animation.timeline = t, o && (this.animation.rangeStart = o), i && (this.animation.rangeEnd = i), jt) : a(this);
  }
}
const xv = {
  anticipate: Xg,
  backInOut: Qg,
  circInOut: Jg
};
function Q_(e) {
  return e in xv;
}
function X_(e) {
  typeof e.ease == "string" && Q_(e.ease) && (e.ease = xv[e.ease]);
}
const oc = 10;
class Z_ extends wv {
  constructor(t) {
    X_(t), fv(t), super(t), t.startTime !== void 0 && t.autoplay !== !1 && (this.startTime = t.startTime), this.options = t;
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
    const p = new Ra({
      ...d,
      autoplay: !1
    }), m = Math.max(oc, lt.now() - this.startTime), y = sn(0, oc, m - oc), v = p.sample(m).value, { name: l } = this.options;
    f && l && hv(f, l, v), o.setWithVelocity(p.sample(Math.max(0, m - y)).value, v, y), p.stop();
  }
}
const Jh = (e, t) => t === "zIndex" ? !1 : !!(typeof e == "number" || Array.isArray(e) || typeof e == "string" && // It's animatable if we have a string
(Wt.test(e) || e === "0") && // And it contains numbers and/or colors
!e.startsWith("url("));
function J_(e) {
  const t = e[0];
  if (e.length === 1)
    return !0;
  for (let o = 0; o < e.length; o++)
    if (e[o] !== t)
      return !0;
}
function q_(e, t, o, i) {
  const a = e[0];
  if (a === null)
    return !1;
  if (t === "display" || t === "visibility")
    return !0;
  const f = e[e.length - 1], d = Jh(a, t), p = Jh(f, t);
  return Mi(d === p, `You are trying to animate ${t} from "${a}" to "${f}". "${d ? f : a}" is not an animatable value.`, "value-not-animatable"), !d || !p ? !1 : J_(e) || (o === "spring" || Sv(o)) && i;
}
function Oc(e) {
  e.duration = 0, e.type = "keyframes";
}
const _v = /* @__PURE__ */ new Set([
  "opacity",
  "clipPath",
  "filter",
  "transform"
  // TODO: Can be accelerated but currently disabled until https://issues.chromium.org/issues/41491098 is resolved
  // or until we implement support for linear() easing.
  // "background-color"
]), eT = /^(?:oklch|oklab|lab|lch|color|color-mix|light-dark)\(/;
function tT(e) {
  for (let t = 0; t < e.length; t++)
    if (typeof e[t] == "string" && eT.test(e[t]))
      return !0;
  return !1;
}
const nT = /* @__PURE__ */ new Set([
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
]), rT = /* @__PURE__ */ Ug(() => Object.hasOwnProperty.call(Element.prototype, "animate"));
function oT(e) {
  var l;
  const { motionValue: t, name: o, repeatDelay: i, repeatType: a, damping: f, type: d, keyframes: p } = e;
  if (!(((l = t == null ? void 0 : t.owner) == null ? void 0 : l.current) instanceof HTMLElement))
    return !1;
  const { onUpdate: y, transformTemplate: v } = t.owner.getProps();
  return rT() && o && /**
   * Force WAAPI for color properties with browser-only color formats
   * (oklch, oklab, lab, lch, etc.) that the JS animation path can't parse.
   */
  (_v.has(o) || nT.has(o) && tT(p)) && (o !== "transform" || !v) && /**
   * If we're outputting values to onUpdate then we can't use WAAPI as there's
   * no way to read the value from WAAPI every frame.
   */
  !y && !i && a !== "mirror" && f !== 0 && d !== "inertia";
}
const iT = 40;
class sT extends Ld {
  constructor({ autoplay: t = !0, delay: o = 0, type: i = "keyframes", repeat: a = 0, repeatDelay: f = 0, repeatType: d = "loop", keyframes: p, name: m, motionValue: y, element: v, ...l }) {
    var x;
    super(), this.stop = () => {
      var _, A;
      this._animation && (this._animation.stop(), (_ = this.stopTimeline) == null || _.call(this)), (A = this.keyframeResolver) == null || A.cancel();
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
      element: v,
      ...l
    }, S = (v == null ? void 0 : v.KeyframeResolver) || Vd;
    this.keyframeResolver = new S(p, (_, A, T) => this.onKeyframesResolved(_, A, c, !T), m, y, v), (x = this.keyframeResolver) == null || x.scheduleResolve();
  }
  onKeyframesResolved(t, o, i, a) {
    var T, C;
    this.keyframeResolver = void 0;
    const { name: f, type: d, velocity: p, delay: m, isHandoff: y, onUpdate: v } = i;
    this.resolvedAt = lt.now();
    let l = !0;
    q_(t, f, d, p) || (l = !1, (Qn.instantAnimations || !m) && (v == null || v(Wa(t, i, o))), t[0] = t[t.length - 1], Oc(i), i.repeat = 0);
    const S = {
      startTime: a ? this.resolvedAt ? this.resolvedAt - this.createdAt > iT ? this.resolvedAt : this.createdAt : this.createdAt : void 0,
      finalKeyframe: o,
      ...i,
      keyframes: t
    }, x = l && !y && oT(S), _ = (C = (T = S.motionValue) == null ? void 0 : T.owner) == null ? void 0 : C.current;
    let A;
    if (x)
      try {
        A = new Z_({
          ...S,
          element: _
        });
      } catch {
        A = new Ra(S);
      }
    else
      A = new Ra(S);
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
    return this._animation || ((t = this.keyframeResolver) == null || t.resume(), U_()), this._animation;
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
function Tv(e, t, o, i = 0, a = 1) {
  const f = Array.from(e).sort((y, v) => y.sortNodePosition(v)).indexOf(t), d = e.size, p = (d - 1) * i;
  return typeof o == "function" ? o(f, d) : a === 1 ? f * i : p - f * i;
}
const qh = 30, aT = (e) => !isNaN(parseFloat(e));
class lT {
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
    this.current = t, this.updatedAt = lt.now(), this.canTrackVelocity === null && t !== void 0 && (this.canTrackVelocity = aT(this.current));
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
    this.events[t] || (this.events[t] = new Md());
    const i = this.events[t].add(o);
    return t === "change" ? () => {
      i(), Ce.read(() => {
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
    const t = lt.now();
    if (!this.canTrackVelocity || this.prevFrameValue === void 0 || t - this.updatedAt > qh)
      return 0;
    const o = Math.min(this.updatedAt - this.prevUpdatedAt, qh);
    return /* @__PURE__ */ Hg(parseFloat(this.current) - parseFloat(this.prevFrameValue), o);
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
function yo(e, t) {
  return new lT(e, t);
}
function kv(e, t) {
  if (e != null && e.inherit && t) {
    const { inherit: o, ...i } = e;
    return { ...t, ...i };
  }
  return e;
}
function zd(e, t) {
  const o = (e == null ? void 0 : e[t]) ?? (e == null ? void 0 : e.default) ?? e;
  return o !== e ? kv(o, e) : o;
}
const uT = {
  type: "spring",
  stiffness: 500,
  damping: 25,
  restSpeed: 10
}, cT = (e) => ({
  type: "spring",
  stiffness: 550,
  damping: e === 0 ? 2 * Math.sqrt(550) : 30,
  restSpeed: 10
}), dT = {
  type: "keyframes",
  duration: 0.8
}, fT = {
  type: "keyframes",
  ease: [0.25, 0.1, 0.35, 1],
  duration: 0.3
}, pT = (e, { keyframes: t }) => t.length > 2 ? dT : xo.has(e) ? e.startsWith("scale") ? cT(t[1]) : uT : fT, mT = /* @__PURE__ */ new Set([
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
function hT(e) {
  for (const t in e)
    if (!mT.has(t))
      return !0;
  return !1;
}
const Bd = (e, t, o, i = {}, a, f) => (d) => {
  const p = zd(i, e) || {}, m = p.delay || i.delay || 0;
  let { elapsed: y = 0 } = i;
  y = y - /* @__PURE__ */ gt(m);
  const v = {
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
  hT(p) || Object.assign(v, pT(e, v)), v.duration && (v.duration = /* @__PURE__ */ gt(v.duration)), v.repeatDelay && (v.repeatDelay = /* @__PURE__ */ gt(v.repeatDelay)), v.from !== void 0 && (v.keyframes[0] = v.from);
  let l = !1;
  if ((v.type === !1 || v.duration === 0 && !v.repeatDelay) && (Oc(v), v.delay === 0 && (l = !0)), (Qn.instantAnimations || Qn.skipAnimations || a != null && a.shouldSkipAnimations || p.skipAnimations) && (l = !0, Oc(v), v.delay = 0), v.allowFlatten = !p.type && !p.ease, l && !f && t.get() !== void 0) {
    const c = Wa(v.keyframes, p);
    if (c !== void 0) {
      Ce.update(() => {
        v.onUpdate(c), v.onComplete();
      });
      return;
    }
  }
  return p.isSync ? new Ra(v) : new sT(v);
}, yT = (
  // eslint-disable-next-line redos-detector/no-unsafe-regex -- false positive, as it can match a lot of words
  /^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u
);
function gT(e) {
  const t = yT.exec(e);
  if (!t)
    return [,];
  const [, o, i, a] = t;
  return [`--${o ?? i}`, a];
}
const vT = 4;
function Av(e, t, o = 1) {
  Pr(o <= vT, `Max CSS variable fallback depth detected in property "${e}". This may indicate a circular fallback dependency.`, "max-css-var-depth");
  const [i, a] = gT(e);
  if (!i)
    return;
  const f = window.getComputedStyle(t).getPropertyValue(i);
  if (f) {
    const d = f.trim();
    return zg(d) ? parseFloat(d) : d;
  }
  return Dd(a) ? Av(a, t, o + 1) : a;
}
function ey(e) {
  const t = [{}, {}];
  return e == null || e.values.forEach((o, i) => {
    t[0][i] = o.get(), t[1][i] = o.getVelocity();
  }), t;
}
function $d(e, t, o, i) {
  if (typeof t == "function") {
    const [a, f] = ey(i);
    t = t(o !== void 0 ? o : e.custom, a, f);
  }
  if (typeof t == "string" && (t = e.variants && e.variants[t]), typeof t == "function") {
    const [a, f] = ey(i);
    t = t(o !== void 0 ? o : e.custom, a, f);
  }
  return t;
}
function kr(e, t, o) {
  const i = e.getProps();
  return $d(i, t, o !== void 0 ? o : i.custom, e);
}
const bv = /* @__PURE__ */ new Set([
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
  ...wo
]), Lc = (e) => Array.isArray(e);
function ST(e, t, o) {
  e.hasValue(t) ? e.getValue(t).set(o) : e.addValue(t, yo(o));
}
function wT(e) {
  return Lc(e) ? e[e.length - 1] || 0 : e;
}
function xT(e, t) {
  const o = kr(e, t);
  let { transitionEnd: i = {}, transition: a = {}, ...f } = o || {};
  f = { ...f, ...i };
  for (const d in f) {
    const p = wT(f[d]);
    ST(e, d, p);
  }
}
const qe = (e) => !!(e && e.getVelocity);
function _T(e) {
  return !!(qe(e) && e.add);
}
function Vc(e, t) {
  const o = e.getValue("willChange");
  if (_T(o))
    return o.add(t);
  if (!o && Qn.WillChange) {
    const i = new Qn.WillChange("auto");
    e.addValue("willChange", i), i.add(t);
  }
}
function Ud(e) {
  return e.replace(/([A-Z])/g, (t) => `-${t.toLowerCase()}`);
}
const TT = "framerAppearId", Cv = "data-" + Ud(TT);
function Pv(e) {
  return e.props[Cv];
}
function kT({ protectedKeys: e, needsAnimating: t }, o) {
  const i = e.hasOwnProperty(o) && t[o] !== !0;
  return t[o] = !1, i;
}
function Ev(e, t, { delay: o = 0, transitionOverride: i, type: a } = {}) {
  let { transition: f, transitionEnd: d, ...p } = t;
  const m = e.getDefaultTransition();
  f = f ? kv(f, m) : m;
  const y = f == null ? void 0 : f.reduceMotion, v = f == null ? void 0 : f.skipAnimations;
  i && (f = i);
  const l = [], c = a && e.animationState && e.animationState.getState()[a], S = f == null ? void 0 : f.path;
  S && S.animateVisualElement(e, p, f, o, l);
  for (const x in p) {
    const _ = e.getValue(x, e.latestValues[x] ?? null), A = p[x];
    if (A === void 0 || c && kT(c, x))
      continue;
    const T = {
      delay: o,
      ...zd(f || {}, x)
    };
    v && (T.skipAnimations = !0);
    const C = _.get();
    if (C !== void 0 && !_.isAnimating() && !Array.isArray(A) && A === C && !T.velocity) {
      Ce.update(() => _.set(A));
      continue;
    }
    let E = !1;
    if (window.MotionHandoffAnimation) {
      const W = Pv(e);
      if (W) {
        const H = window.MotionHandoffAnimation(W, x, Ce);
        H !== null && (T.startTime = H, E = !0);
      }
    }
    Vc(e, x);
    const N = y ?? e.shouldReduceMotion;
    _.start(Bd(x, _, A, N && bv.has(x) ? { type: !1 } : T, e, E));
    const O = _.animation;
    O && l.push(O);
  }
  if (d) {
    const x = () => Ce.update(() => {
      d && xT(e, d);
    });
    l.length ? Promise.all(l).then(x) : x();
  }
  return l;
}
function zc(e, t, o = {}) {
  var m;
  const i = kr(e, t, o.type === "exit" ? (m = e.presenceContext) == null ? void 0 : m.custom : void 0);
  let { transition: a = e.getDefaultTransition() || {} } = i || {};
  o.transitionOverride && (a = o.transitionOverride);
  const f = i ? () => Promise.all(Ev(e, i, o)) : () => Promise.resolve(), d = e.variantChildren && e.variantChildren.size ? (y = 0) => {
    const { delayChildren: v = 0, staggerChildren: l, staggerDirection: c } = a;
    return AT(e, t, y, v, l, c, o);
  } : () => Promise.resolve(), { when: p } = a;
  if (p) {
    const [y, v] = p === "beforeChildren" ? [f, d] : [d, f];
    return y().then(() => v());
  } else
    return Promise.all([f(), d(o.delay)]);
}
function AT(e, t, o = 0, i = 0, a = 0, f = 1, d) {
  const p = [];
  for (const m of e.variantChildren)
    m.notify("AnimationStart", t), p.push(zc(m, t, {
      ...d,
      delay: o + (typeof i == "function" ? 0 : i) + Tv(e.variantChildren, m, i, a, f)
    }).then(() => m.notify("AnimationComplete", t)));
  return Promise.all(p);
}
function bT(e, t, o = {}) {
  e.notify("AnimationStart", t);
  let i;
  if (Array.isArray(t)) {
    const a = t.map((f) => zc(e, f, o));
    i = Promise.all(a);
  } else if (typeof t == "string")
    i = zc(e, t, o);
  else {
    const a = typeof t == "function" ? kr(e, t, o.custom) : t;
    i = Promise.all(Ev(e, a, o));
  }
  return i.then(() => {
    e.notify("AnimationComplete", t);
  });
}
const CT = {
  test: (e) => e === "auto",
  parse: (e) => e
}, Mv = (e) => (t) => t.test(e), Rv = [So, re, on, hn, J1, Z1, CT], ty = (e) => Rv.find(Mv(e));
function PT(e) {
  return typeof e == "number" ? e === 0 : e !== null ? e === "none" || e === "0" || $g(e) : !0;
}
const ET = /* @__PURE__ */ new Set(["brightness", "contrast", "saturate", "opacity"]);
function MT(e) {
  const [t, o] = e.slice(0, -1).split("(");
  if (t === "drop-shadow")
    return e;
  const [i] = o.match(jd) || [];
  if (!i)
    return e;
  const a = o.replace(i, "");
  let f = ET.has(t) ? 1 : 0;
  return i !== o && (f *= 100), t + "(" + f + a + ")";
}
const RT = /\b([a-z-]*)\(.*?\)/gu, Bc = {
  ...Wt,
  getAnimatableNone: (e) => {
    const t = e.match(RT);
    return t ? t.map(MT).join(" ") : e;
  }
}, $c = {
  ...Wt,
  getAnimatableNone: (e) => {
    const t = Wt.parse(e);
    return Wt.createTransformer(e)(t.map((i) => typeof i == "number" ? 0 : typeof i == "object" ? { ...i, alpha: 1 } : i));
  }
}, ny = {
  ...So,
  transform: Math.round
}, NT = {
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
  scale: Js,
  scaleX: Js,
  scaleY: Js,
  scaleZ: Js,
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
  originX: $h,
  originY: $h,
  originZ: re
}, Na = {
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
  ...NT,
  zIndex: ny,
  // SVG
  fillOpacity: ki,
  strokeOpacity: ki,
  numOctaves: ny
}, DT = {
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
  filter: Bc,
  WebkitFilter: Bc,
  mask: $c,
  WebkitMask: $c
}, Nv = (e) => DT[e], jT = /* @__PURE__ */ new Set([Bc, $c]);
function Dv(e, t) {
  let o = Nv(e);
  return jT.has(o) || (o = Wt), o.getAnimatableNone ? o.getAnimatableNone(t) : void 0;
}
const IT = /* @__PURE__ */ new Set(["auto", "none", "0"]);
function FT(e, t, o) {
  let i = 0, a;
  for (; i < e.length && !a; ) {
    const f = e[i];
    typeof f == "string" && !IT.has(f) && ho(f).values.length && (a = e[i]), i++;
  }
  if (a && o)
    for (const f of t)
      e[f] = Dv(o, a);
}
class OT extends Vd {
  constructor(t, o, i, a, f) {
    super(t, o, i, a, f, !0);
  }
  readKeyframes() {
    const { unresolvedKeyframes: t, element: o, name: i } = this;
    if (!o || !o.current)
      return;
    super.readKeyframes();
    for (let v = 0; v < t.length; v++) {
      let l = t[v];
      if (typeof l == "string" && (l = l.trim(), Dd(l))) {
        const c = Av(l, o.current);
        c !== void 0 && (t[v] = c), v === t.length - 1 && (this.finalKeyframe = l);
      }
    }
    if (this.resolveNoneKeyframes(), !bv.has(i) || t.length !== 2)
      return;
    const [a, f] = t, d = ty(a), p = ty(f), m = Bh(a), y = Bh(f);
    if (m !== y && Wn[i]) {
      this.needsMeasurement = !0;
      return;
    }
    if (d !== p)
      if (Xh(d) && Xh(p))
        for (let v = 0; v < t.length; v++) {
          const l = t[v];
          typeof l == "string" && (t[v] = parseFloat(l));
        }
      else Wn[i] && (this.needsMeasurement = !0);
  }
  resolveNoneKeyframes() {
    const { unresolvedKeyframes: t, name: o } = this, i = [];
    for (let a = 0; a < t.length; a++)
      (t[a] === null || PT(t[a])) && i.push(a);
    i.length && FT(t, i, o);
  }
  measureInitialState() {
    const { element: t, unresolvedKeyframes: o, name: i } = this;
    if (!t || !t.current)
      return;
    i === "height" && (this.suspendedScrollY = window.pageYOffset), this.measuredOrigin = Wn[i](t.measureViewportBox(), window.getComputedStyle(t.current)), o[0] = this.measuredOrigin;
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
    i[f] = Wn[o](t.measureViewportBox(), window.getComputedStyle(t.current)), d !== null && this.finalKeyframe === void 0 && (this.finalKeyframe = d), (p = this.removedTransforms) != null && p.length && this.removedTransforms.forEach(([m, y]) => {
      t.getValue(m).set(y);
    }), this.resolveNoneKeyframes();
  }
}
function jv(e, t, o) {
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
const Uc = (e, t) => t && typeof e == "number" ? t.transform(e) : e;
function ma(e) {
  return Bg(e) && "offsetHeight" in e && !("ownerSVGElement" in e);
}
const { schedule: Hd } = /* @__PURE__ */ tv(queueMicrotask, !1), Ut = {
  x: !1,
  y: !1
};
function Iv() {
  return Ut.x || Ut.y;
}
function LT(e) {
  return e === "x" || e === "y" ? Ut[e] ? null : (Ut[e] = !0, () => {
    Ut[e] = !1;
  }) : Ut.x || Ut.y ? null : (Ut.x = Ut.y = !0, () => {
    Ut.x = Ut.y = !1;
  });
}
function Fv(e, t) {
  const o = jv(e), i = new AbortController(), a = {
    passive: !0,
    ...t,
    signal: i.signal
  };
  return [o, a, () => i.abort()];
}
function VT(e) {
  return !(e.pointerType === "touch" || Iv());
}
function zT(e, t, o = {}) {
  const [i, a, f] = Fv(e, o);
  return i.forEach((d) => {
    let p = !1, m = !1, y;
    const v = () => {
      d.removeEventListener("pointerleave", x);
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
    }, _ = (A) => {
      if (!VT(A))
        return;
      m = !1;
      const T = t(d, A);
      typeof T == "function" && (y = T, d.addEventListener("pointerleave", x, a));
    };
    d.addEventListener("pointerenter", _, a), d.addEventListener("pointerdown", S, a);
  }), f;
}
const Ov = (e, t) => t ? e === t ? !0 : Ov(e, t.parentElement) : !1, Wd = (e) => e.pointerType === "mouse" ? typeof e.button != "number" || e.button <= 0 : e.isPrimary !== !1, BT = /* @__PURE__ */ new Set([
  "BUTTON",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "A"
]);
function $T(e) {
  return BT.has(e.tagName) || e.isContentEditable === !0;
}
const UT = /* @__PURE__ */ new Set(["INPUT", "SELECT", "TEXTAREA"]);
function HT(e) {
  return UT.has(e.tagName) || e.isContentEditable === !0;
}
const ha = /* @__PURE__ */ new WeakSet();
function ry(e) {
  return (t) => {
    t.key === "Enter" && e(t);
  };
}
function ic(e, t) {
  e.dispatchEvent(new PointerEvent("pointer" + t, { isPrimary: !0, bubbles: !0 }));
}
const WT = (e, t) => {
  const o = e.currentTarget;
  if (!o)
    return;
  const i = ry(() => {
    if (ha.has(o))
      return;
    ic(o, "down");
    const a = ry(() => {
      ic(o, "up");
    }), f = () => ic(o, "cancel");
    o.addEventListener("keyup", a, t), o.addEventListener("blur", f, t);
  });
  o.addEventListener("keydown", i, t), o.addEventListener("blur", () => o.removeEventListener("keydown", i), t);
};
function oy(e) {
  return Wd(e) && !Iv();
}
const iy = /* @__PURE__ */ new WeakSet();
function GT(e, t, o = {}) {
  const [i, a, f] = Fv(e, o), d = (p) => {
    const m = p.currentTarget;
    if (!oy(p) || iy.has(p))
      return;
    ha.add(m), o.stopPropagation && iy.add(p);
    const y = t(m, p), v = (S, x) => {
      window.removeEventListener("pointerup", l), window.removeEventListener("pointercancel", c), ha.has(m) && ha.delete(m), oy(S) && typeof y == "function" && y(S, { success: x });
    }, l = (S) => {
      v(S, m === window || m === document || o.useGlobalTarget || Ov(m, S.target));
    }, c = (S) => {
      v(S, !1);
    };
    window.addEventListener("pointerup", l, a), window.addEventListener("pointercancel", c, a);
  };
  return i.forEach((p) => {
    (o.useGlobalTarget ? window : p).addEventListener("pointerdown", d, a), ma(p) && (p.addEventListener("focus", (y) => WT(y, a)), !$T(p) && !p.hasAttribute("tabindex") && (p.tabIndex = 0));
  }), f;
}
function Gd(e) {
  return Bg(e) && "ownerSVGElement" in e;
}
const ya = /* @__PURE__ */ new WeakMap();
let Bn;
const Lv = (e, t, o) => (i, a) => a && a[0] ? a[0][e + "Size"] : Gd(i) && "getBBox" in i ? i.getBBox()[t] : i[o], KT = /* @__PURE__ */ Lv("inline", "width", "offsetWidth"), YT = /* @__PURE__ */ Lv("block", "height", "offsetHeight");
function QT({ target: e, borderBoxSize: t }) {
  var o;
  (o = ya.get(e)) == null || o.forEach((i) => {
    i(e, {
      get width() {
        return KT(e, t);
      },
      get height() {
        return YT(e, t);
      }
    });
  });
}
function XT(e) {
  e.forEach(QT);
}
function ZT() {
  typeof ResizeObserver > "u" || (Bn = new ResizeObserver(XT));
}
function JT(e, t) {
  Bn || ZT();
  const o = jv(e);
  return o.forEach((i) => {
    let a = ya.get(i);
    a || (a = /* @__PURE__ */ new Set(), ya.set(i, a)), a.add(t), Bn == null || Bn.observe(i);
  }), () => {
    o.forEach((i) => {
      const a = ya.get(i);
      a == null || a.delete(t), a != null && a.size || Bn == null || Bn.unobserve(i);
    });
  };
}
const ga = /* @__PURE__ */ new Set();
let uo;
function qT() {
  uo = () => {
    const e = {
      get width() {
        return window.innerWidth;
      },
      get height() {
        return window.innerHeight;
      }
    };
    ga.forEach((t) => t(e));
  }, window.addEventListener("resize", uo);
}
function ek(e) {
  return ga.add(e), uo || qT(), () => {
    ga.delete(e), !ga.size && typeof uo == "function" && (window.removeEventListener("resize", uo), uo = void 0);
  };
}
function sy(e, t) {
  return typeof e == "function" ? ek(e) : JT(e, t);
}
function tk(e) {
  return Gd(e) && e.tagName === "svg";
}
const nk = [...Rv, Be, Wt], rk = (e) => nk.find(Mv(e)), ay = () => ({
  translate: 0,
  scale: 1,
  origin: 0,
  originPoint: 0
}), co = () => ({
  x: ay(),
  y: ay()
}), ly = () => ({ min: 0, max: 0 }), He = () => ({
  x: ly(),
  y: ly()
}), ok = /* @__PURE__ */ new WeakMap();
function Ga(e) {
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
function Ka(e) {
  return Ga(e.animate) || Yd.some((t) => Ai(e[t]));
}
function Vv(e) {
  return !!(Ka(e) || e.variants);
}
function ik(e, t, o) {
  for (const i in t) {
    const a = t[i], f = o[i];
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
    t[i] === void 0 && e.removeValue(i);
  return t;
}
const Hc = { current: null }, zv = { current: !1 }, sk = typeof window < "u";
function ak() {
  if (zv.current = !0, !!sk)
    if (window.matchMedia) {
      const e = window.matchMedia("(prefers-reduced-motion)"), t = () => Hc.current = e.matches;
      e.addEventListener("change", t), t();
    } else
      Hc.current = !1;
}
const uy = [
  "AnimationStart",
  "AnimationComplete",
  "Update",
  "BeforeLayoutMeasure",
  "LayoutMeasure",
  "LayoutAnimationStart",
  "LayoutAnimationComplete"
];
let Da = {};
function Bv(e) {
  Da = e;
}
function lk() {
  return Da;
}
class uk {
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
    this.current = null, this.children = /* @__PURE__ */ new Set(), this.isVariantNode = !1, this.isControllingVariants = !1, this.shouldReduceMotion = null, this.shouldSkipAnimations = !1, this.values = /* @__PURE__ */ new Map(), this.KeyframeResolver = Vd, this.features = {}, this.valueSubscriptions = /* @__PURE__ */ new Map(), this.prevMotionValues = {}, this.hasBeenMounted = !1, this.events = {}, this.propEventSubscriptions = {}, this.notifyUpdate = () => this.notify("Update", this.latestValues), this.render = () => {
      this.current && (this.triggerBuild(), this.renderInstance(this.current, this.renderState, this.props.style, this.projection));
    }, this.renderScheduledAt = 0, this.scheduleRender = () => {
      const S = lt.now();
      this.renderScheduledAt < S && (this.renderScheduledAt = S, Ce.render(this.render, !1, !0));
    };
    const { latestValues: y, renderState: v } = p;
    this.latestValues = y, this.baseTarget = { ...y }, this.initialValues = o.initial ? { ...y } : {}, this.renderState = v, this.parent = t, this.props = o, this.presenceContext = i, this.depth = t ? t.depth + 1 : 0, this.reducedMotionConfig = a, this.skipAnimationsConfig = f, this.options = m, this.blockInitialAnimation = !!d, this.isControllingVariants = Ka(o), this.isVariantNode = Vv(o), this.isVariantNode && (this.variantChildren = /* @__PURE__ */ new Set()), this.manuallyAnimateOnMount = !!(t && t.current);
    const { willChange: l, ...c } = this.scrapeMotionValuesFromProps(o, {}, this);
    for (const S in c) {
      const x = c[S];
      y[S] !== void 0 && qe(x) && x.set(y[S]);
    }
  }
  mount(t) {
    var o, i;
    if (this.hasBeenMounted)
      for (const a in this.initialValues)
        (o = this.values.get(a)) == null || o.jump(this.initialValues[a]), this.latestValues[a] = this.initialValues[a];
    this.current = t, ok.set(t, this), this.projection && !this.projection.instance && this.projection.mount(t), this.parent && this.isVariantNode && !this.isControllingVariants && (this.removeFromVariantTree = this.parent.addVariantChild(this)), this.values.forEach((a, f) => this.bindToMotionValue(f, a)), this.reducedMotionConfig === "never" ? this.shouldReduceMotion = !1 : this.reducedMotionConfig === "always" ? this.shouldReduceMotion = !0 : (zv.current || ak(), this.shouldReduceMotion = Hc.current), this.shouldSkipAnimations = this.skipAnimationsConfig ?? !1, (i = this.parent) == null || i.addChild(this), this.update(this.props, this.presenceContext), this.hasBeenMounted = !0;
  }
  unmount() {
    var t;
    this.projection && this.projection.unmount(), Xn(this.notifyUpdate), Xn(this.render), this.valueSubscriptions.forEach((o) => o()), this.valueSubscriptions.clear(), this.removeFromVariantTree && this.removeFromVariantTree(), (t = this.parent) == null || t.removeChild(this);
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
    if (this.valueSubscriptions.has(t) && this.valueSubscriptions.get(t)(), o.accelerate && _v.has(t) && this.current instanceof HTMLElement) {
      const { factory: d, keyframes: p, times: m, ease: y, duration: v } = o.accelerate, l = new wv({
        element: this.current,
        name: t,
        keyframes: p,
        times: m,
        ease: y,
        duration: /* @__PURE__ */ gt(v)
      }), c = d(l);
      this.valueSubscriptions.set(t, () => {
        c(), l.cancel();
      });
      return;
    }
    const i = xo.has(t);
    i && this.onBindTransform && this.onBindTransform();
    const a = o.on("change", (d) => {
      this.latestValues[t] = d, this.props.onUpdate && Ce.preRender(this.notifyUpdate), i && this.projection && (this.projection.isTransformDirty = !0), this.scheduleRender();
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
    for (t in Da) {
      const o = Da[t];
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
    for (let i = 0; i < uy.length; i++) {
      const a = uy[i];
      this.propEventSubscriptions[a] && (this.propEventSubscriptions[a](), delete this.propEventSubscriptions[a]);
      const f = "on" + a, d = t[f];
      d && (this.propEventSubscriptions[a] = this.on(a, d));
    }
    this.prevMotionValues = ik(this, this.scrapeMotionValuesFromProps(t, this.prevProps || {}, this), this.prevMotionValues), this.handleChildMotionValue && this.handleChildMotionValue();
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
    return i === void 0 && o !== void 0 && (i = yo(o === null ? void 0 : o, { owner: this }), this.addValue(t, i)), i;
  }
  /**
   * If we're trying to animate to a previously unencountered value,
   * we need to check for it in our state and as a last resort read it
   * directly from the instance (which might have performance implications).
   */
  readValue(t, o) {
    let i = this.latestValues[t] !== void 0 || !this.current ? this.latestValues[t] : this.getBaseTargetFromProps(this.props, t) ?? this.readValueFromInstance(this.current, t, this.options);
    return i != null && (typeof i == "string" && (zg(i) || $g(i)) ? i = parseFloat(i) : !rk(i) && Wt.test(o) && (i = Dv(t, o)), this.setBaseTarget(t, qe(i) ? i.get() : i)), qe(i) ? i.get() : i;
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
      const d = $d(this.props, o, (f = this.presenceContext) == null ? void 0 : f.custom);
      d && (i = d[t]);
    }
    if (o && i !== void 0)
      return i;
    const a = this.getBaseTargetFromProps(this.props, t);
    return a !== void 0 && !qe(a) ? a : this.initialValues[t] !== void 0 && i === void 0 ? void 0 : this.baseTarget[t];
  }
  on(t, o) {
    return this.events[t] || (this.events[t] = new Md()), this.events[t].add(o);
  }
  notify(t, ...o) {
    this.events[t] && this.events[t].notify(...o);
  }
  scheduleRenderMicrotask() {
    Hd.render(this.render);
  }
}
class $v extends uk {
  constructor() {
    super(...arguments), this.KeyframeResolver = OT;
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
    qe(t) && (this.childSubscription = t.on("change", (o) => {
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
function Uv({ top: e, left: t, right: o, bottom: i }) {
  return {
    x: { min: t, max: o },
    y: { min: e, max: i }
  };
}
function ck({ x: e, y: t }) {
  return { top: t.min, right: e.max, bottom: t.max, left: e.min };
}
function dk(e, t) {
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
function sc(e) {
  return e === void 0 || e === 1;
}
function Wc({ scale: e, scaleX: t, scaleY: o }) {
  return !sc(e) || !sc(t) || !sc(o);
}
function hr(e) {
  return Wc(e) || Hv(e) || e.z || e.rotate || e.rotateX || e.rotateY || e.skewX || e.skewY;
}
function Hv(e) {
  return cy(e.x) || cy(e.y);
}
function cy(e) {
  return e && e !== "0%";
}
function ja(e, t, o) {
  const i = e - o, a = t * i;
  return o + a;
}
function dy(e, t, o, i, a) {
  return a !== void 0 && (e = ja(e, a, i)), ja(e, o, i) + t;
}
function Gc(e, t = 0, o = 1, i, a) {
  e.min = dy(e.min, t, o, i, a), e.max = dy(e.max, t, o, i, a);
}
function Wv(e, { x: t, y: o }) {
  Gc(e.x, t.translate, t.scale, t.originPoint), Gc(e.y, o.translate, o.scale, o.originPoint);
}
const fy = 0.999999999999, py = 1.0000000000001;
function fk(e, t, o, i = !1) {
  var p;
  const a = o.length;
  if (!a)
    return;
  t.x = t.y = 1;
  let f, d;
  for (let m = 0; m < a; m++) {
    f = o[m], d = f.projectionDelta;
    const { visualElement: y } = f.options;
    y && y.props.style && y.props.style.display === "contents" || (i && f.options.layoutScroll && f.scroll && f !== f.root && (tn(e.x, -f.scroll.offset.x), tn(e.y, -f.scroll.offset.y)), d && (t.x *= d.x.scale, t.y *= d.y.scale, Wv(e, d)), i && hr(f.latestValues) && va(e, f.latestValues, (p = f.layout) == null ? void 0 : p.layoutBox));
  }
  t.x < py && t.x > fy && (t.x = 1), t.y < py && t.y > fy && (t.y = 1);
}
function tn(e, t) {
  e.min += t, e.max += t;
}
function my(e, t, o, i, a = 0.5) {
  const f = be(e.min, e.max, a);
  Gc(e, t, o, f, i);
}
function hy(e, t) {
  return typeof e == "string" ? parseFloat(e) / 100 * (t.max - t.min) : e;
}
function va(e, t, o) {
  const i = o ?? e;
  my(e.x, hy(t.x, i.x), t.scaleX, t.scale, t.originX), my(e.y, hy(t.y, i.y), t.scaleY, t.scale, t.originY);
}
function Gv(e, t) {
  return Uv(dk(e.getBoundingClientRect(), t));
}
function pk(e, t, o) {
  const i = Gv(e, o), { scroll: a } = t;
  return a && (tn(i.x, a.offset.x), tn(i.y, a.offset.y)), i;
}
const mk = {
  x: "translateX",
  y: "translateY",
  z: "translateZ",
  transformPerspective: "perspective"
}, hk = wo.length;
function yk(e, t, o) {
  let i = "", a = !0;
  for (let d = 0; d < hk; d++) {
    const p = wo[d], m = e[p];
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
      const v = Uc(m, Na[p]);
      if (!y) {
        a = !1;
        const l = mk[p] || p;
        i += `${l}(${v}) `;
      }
      o && (t[p] = v);
    }
  }
  const f = e.pathRotation;
  return f && (a = !1, i += `rotate(${Uc(f, Na.pathRotation)}) `), i = i.trim(), o ? i = o(t, a ? "" : i) : a && (i = "none"), i;
}
function Qd(e, t, o) {
  const { style: i, vars: a, transformOrigin: f } = e;
  let d = !1, p = !1;
  for (const m in t) {
    const y = t[m];
    if (xo.has(m)) {
      d = !0;
      continue;
    } else if (rv(m)) {
      a[m] = y;
      continue;
    } else {
      const v = Uc(y, Na[m]);
      m.startsWith("origin") ? (p = !0, f[m] = v) : i[m] = v;
    }
  }
  if (t.transform || (d || o ? i.transform = yk(t, e.transform, o) : i.transform && (i.transform = "none")), p) {
    const { originX: m = "50%", originY: y = "50%", originZ: v = 0 } = f;
    i.transformOrigin = `${m} ${y} ${v}`;
  }
}
function Kv(e, { style: t, vars: o }, i, a) {
  const f = e.style;
  let d;
  for (d in t)
    f[d] = t[d];
  a == null || a.applyProjectionStyles(f, i);
  for (d in o)
    f.setProperty(d, o[d]);
}
function yy(e, t) {
  return t.max === t.min ? 0 : e / (t.max - t.min) * 100;
}
const pi = {
  correct: (e, t) => {
    if (!t.target)
      return e;
    if (typeof e == "string")
      if (re.test(e))
        e = parseFloat(e);
      else
        return e;
    const o = yy(e, t.target.x), i = yy(e, t.target.y);
    return `${o}% ${i}%`;
  }
}, gk = {
  correct: (e, { treeScale: t, projectionDelta: o }) => {
    const i = e, a = Wt.parse(e);
    if (a.length > 5)
      return i;
    const f = Wt.createTransformer(e), d = typeof a[0] != "number" ? 1 : 0, p = o.x.scale * t.x, m = o.y.scale * t.y;
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
  boxShadow: gk
};
function Yv(e, { layout: t, layoutId: o }) {
  return xo.has(e) || e.startsWith("origin") || (t || o !== void 0) && (!!Kc[e] || e === "opacity");
}
function Xd(e, t, o) {
  var d;
  const i = e.style, a = t == null ? void 0 : t.style, f = {};
  if (!i)
    return f;
  for (const p in i)
    (qe(i[p]) || a && qe(a[p]) || Yv(p, e) || ((d = o == null ? void 0 : o.getValue(p)) == null ? void 0 : d.liveStyle) !== void 0) && (f[p] = i[p]);
  return f;
}
function vk(e) {
  return window.getComputedStyle(e);
}
class Sk extends $v {
  constructor() {
    super(...arguments), this.type = "html", this.renderInstance = Kv;
  }
  readValueFromInstance(t, o) {
    var i;
    if (xo.has(o))
      return (i = this.projection) != null && i.isProjecting ? Nc(o) : L_(t, o);
    {
      const a = vk(t), f = (rv(o) ? a.getPropertyValue(o) : a[o]) || 0;
      return typeof f == "string" ? f.trim() : f;
    }
  }
  measureInstanceViewportBox(t, { transformPagePoint: o }) {
    return Gv(t, o);
  }
  build(t, o, i) {
    Qd(t, o, i.transformTemplate);
  }
  scrapeMotionValuesFromProps(t, o, i) {
    return Xd(t, o, i);
  }
}
const wk = {
  offset: "stroke-dashoffset",
  array: "stroke-dasharray"
}, xk = {
  offset: "strokeDashoffset",
  array: "strokeDasharray"
};
function _k(e, t, o = 1, i = 0, a = !0) {
  e.pathLength = 1;
  const f = a ? wk : xk;
  e[f.offset] = `${-i}`, e[f.array] = `${t} ${o}`;
}
const Tk = [
  "offsetDistance",
  "offsetPath",
  "offsetRotate",
  "offsetAnchor"
];
function Qv(e, {
  attrX: t,
  attrY: o,
  attrScale: i,
  pathLength: a,
  pathSpacing: f = 1,
  pathOffset: d = 0,
  // This is object creation, which we try to avoid per-frame.
  ...p
}, m, y, v) {
  if (Qd(e, p, y), m) {
    e.style.viewBox && (e.attrs.viewBox = e.style.viewBox);
    return;
  }
  e.attrs = e.style, e.style = {};
  const { attrs: l, style: c } = e;
  l.transform && (c.transform = l.transform, delete l.transform), (c.transform || l.transformOrigin) && (c.transformOrigin = l.transformOrigin ?? "50% 50%", delete l.transformOrigin), c.transform && (c.transformBox = (v == null ? void 0 : v.transformBox) ?? "fill-box", delete l.transformBox);
  for (const S of Tk)
    l[S] !== void 0 && (c[S] = l[S], delete l[S]);
  t !== void 0 && (l.x = t), o !== void 0 && (l.y = o), i !== void 0 && (l.scale = i), a !== void 0 && _k(l, a, f, d, !1);
}
const Xv = /* @__PURE__ */ new Set([
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
]), Zv = (e) => typeof e == "string" && e.toLowerCase() === "svg";
function kk(e, t, o, i) {
  Kv(e, t, void 0, i);
  for (const a in t.attrs)
    e.setAttribute(Xv.has(a) ? a : Ud(a), t.attrs[a]);
}
function Jv(e, t, o) {
  const i = Xd(e, t, o);
  for (const a in e)
    if (qe(e[a]) || qe(t[a])) {
      const f = wo.indexOf(a) !== -1 ? "attr" + a.charAt(0).toUpperCase() + a.substring(1) : a;
      i[f] = e[a];
    }
  return i;
}
class Ak extends $v {
  constructor() {
    super(...arguments), this.type = "svg", this.isSVGTag = !1, this.measureInstanceViewportBox = He;
  }
  getBaseTargetFromProps(t, o) {
    return t[o];
  }
  readValueFromInstance(t, o) {
    if (xo.has(o)) {
      const i = Nv(o);
      return i && i.default || 0;
    }
    return o = Xv.has(o) ? o : Ud(o), t.getAttribute(o);
  }
  scrapeMotionValuesFromProps(t, o, i) {
    return Jv(t, o, i);
  }
  build(t, o, i) {
    Qv(t, o, this.isSVGTag, i.transformTemplate, i.style);
  }
  renderInstance(t, o, i, a) {
    kk(t, o, i, a);
  }
  mount(t) {
    this.isSVGTag = Zv(t.tagName), super.mount(t);
  }
}
const bk = Yd.length;
function qv(e) {
  if (!e)
    return;
  if (!e.isControllingVariants) {
    const o = e.parent ? qv(e.parent) || {} : {};
    return e.props.initial !== void 0 && (o.initial = e.props.initial), o;
  }
  const t = {};
  for (let o = 0; o < bk; o++) {
    const i = Yd[o], a = e.props[i];
    (Ai(a) || a === !1) && (t[i] = a);
  }
  return t;
}
function e0(e, t) {
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
const Ck = [...Kd].reverse(), Pk = Kd.length;
function Ek(e) {
  return (t) => Promise.all(t.map(({ animation: o, options: i }) => bT(e, o, i)));
}
function Mk(e) {
  let t = Ek(e), o = gy(), i = !0, a = !1;
  const f = (y) => (v, l) => {
    var S;
    const c = kr(e, l, y === "exit" ? (S = e.presenceContext) == null ? void 0 : S.custom : void 0);
    if (c) {
      const { transition: x, transitionEnd: _, ...A } = c;
      v = { ...v, ...A, ..._ };
    }
    return v;
  };
  function d(y) {
    t = y(e);
  }
  function p(y) {
    const { props: v } = e, l = qv(e.parent) || {}, c = [], S = /* @__PURE__ */ new Set();
    let x = {}, _ = 1 / 0;
    for (let T = 0; T < Pk; T++) {
      const C = Ck[T], E = o[C], N = v[C] !== void 0 ? v[C] : l[C], O = Ai(N), W = C === y ? E.isActive : null;
      W === !1 && (_ = T);
      let H = N === l[C] && N !== v[C] && O;
      if (H && (i || a) && e.manuallyAnimateOnMount && (H = !1), E.protectedKeys = { ...x }, // If it isn't active and hasn't *just* been set as inactive
      !E.isActive && W === null || // If we didn't and don't have any defined prop for this animation type
      !N && !E.prevProp || // Or if the prop doesn't define an animation
      Ga(N) || typeof N == "boolean")
        continue;
      if (C === "exit" && E.isActive && W !== !0) {
        E.prevResolvedValues && (x = {
          ...x,
          ...E.prevResolvedValues
        });
        continue;
      }
      const Y = Rk(E.prevProp, N);
      let L = Y || // If we're making this variant active, we want to always make it active
      C === y && E.isActive && !H && O || // If we removed a higher-priority variant (i is in reverse order)
      T > _ && O, X = !1;
      const se = Array.isArray(N) ? N : [N];
      let Z = se.reduce(f(C), {});
      W === !1 && (Z = {});
      const { prevResolvedValues: de = {} } = E, ce = {
        ...de,
        ...Z
      }, ye = ($) => {
        L = !0, S.has($) && (X = !0, S.delete($)), E.needsAnimating[$] = !0;
        const J = e.getValue($);
        J && (J.liveStyle = !1);
      };
      for (const $ in ce) {
        const J = Z[$], Q = de[$];
        if (x.hasOwnProperty($))
          continue;
        let D = !1;
        Lc(J) && Lc(Q) ? D = !e0(J, Q) || Y : D = J !== Q, D ? J != null ? ye($) : S.add($) : J !== void 0 && S.has($) ? ye($) : E.protectedKeys[$] = !0;
      }
      E.prevProp = N, E.prevResolvedValues = Z, E.isActive && (x = { ...x, ...Z }), (i || a) && e.blockInitialAnimation && (L = !1);
      const ee = H && Y;
      L && (!ee || X) && c.push(...se.map(($) => {
        const J = { type: C };
        if (typeof $ == "string" && (i || a) && !ee && e.manuallyAnimateOnMount && e.parent) {
          const { parent: Q } = e, D = kr(Q, $);
          if (Q.enteringChildren && D) {
            const { delayChildren: V } = D.transition || {};
            J.delay = Tv(Q.enteringChildren, e, V);
          }
        }
        return {
          animation: $,
          options: J
        };
      }));
    }
    if (S.size) {
      const T = {};
      if (typeof v.initial != "boolean") {
        const C = kr(e, Array.isArray(v.initial) ? v.initial[0] : v.initial);
        C && C.transition && (T.transition = C.transition);
      }
      S.forEach((C) => {
        const E = e.getBaseTarget(C), N = e.getValue(C);
        N && (N.liveStyle = !0), T[C] = E ?? null;
      }), c.push({ animation: T });
    }
    let A = !!c.length;
    return i && (v.initial === !1 || v.initial === v.animate) && !e.manuallyAnimateOnMount && (A = !1), i = !1, a = !1, A ? t(c) : Promise.resolve();
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
    setAnimateFunction: d,
    getState: () => o,
    reset: () => {
      o = gy(), a = !0;
    }
  };
}
function Rk(e, t) {
  return typeof t == "string" ? t !== e : Array.isArray(t) ? !e0(t, e) : !1;
}
function mr(e = !1) {
  return {
    isActive: e,
    protectedKeys: {},
    needsAnimating: {},
    prevResolvedValues: {}
  };
}
function gy() {
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
function Yc(e, t) {
  e.min = t.min, e.max = t.max;
}
function $t(e, t) {
  Yc(e.x, t.x), Yc(e.y, t.y);
}
function vy(e, t) {
  e.translate = t.translate, e.scale = t.scale, e.originPoint = t.originPoint, e.origin = t.origin;
}
const t0 = 1e-4, Nk = 1 - t0, Dk = 1 + t0, n0 = 0.01, jk = 0 - n0, Ik = 0 + n0;
function ut(e) {
  return e.max - e.min;
}
function Fk(e, t, o) {
  return Math.abs(e - t) <= o;
}
function Sy(e, t, o, i = 0.5) {
  e.origin = i, e.originPoint = be(t.min, t.max, e.origin), e.scale = ut(o) / ut(t), e.translate = be(o.min, o.max, e.origin) - e.originPoint, (e.scale >= Nk && e.scale <= Dk || isNaN(e.scale)) && (e.scale = 1), (e.translate >= jk && e.translate <= Ik || isNaN(e.translate)) && (e.translate = 0);
}
function vi(e, t, o, i) {
  Sy(e.x, t.x, o.x, i ? i.originX : void 0), Sy(e.y, t.y, o.y, i ? i.originY : void 0);
}
function wy(e, t, o, i = 0) {
  const a = i ? be(o.min, o.max, i) : o.min;
  e.min = a + t.min, e.max = e.min + ut(t);
}
function Ok(e, t, o, i) {
  wy(e.x, t.x, o.x, i == null ? void 0 : i.x), wy(e.y, t.y, o.y, i == null ? void 0 : i.y);
}
function xy(e, t, o, i = 0) {
  const a = i ? be(o.min, o.max, i) : o.min;
  e.min = t.min - a, e.max = e.min + ut(t);
}
function Ia(e, t, o, i) {
  xy(e.x, t.x, o.x, i == null ? void 0 : i.x), xy(e.y, t.y, o.y, i == null ? void 0 : i.y);
}
function _y(e, t, o, i, a) {
  return e -= t, e = ja(e, 1 / o, i), a !== void 0 && (e = ja(e, 1 / a, i)), e;
}
function Lk(e, t = 0, o = 1, i = 0.5, a, f = e, d = e) {
  if (on.test(t) && (t = parseFloat(t), t = be(d.min, d.max, t / 100) - d.min), typeof t != "number")
    return;
  let p = be(f.min, f.max, i);
  e === f && (p -= t), e.min = _y(e.min, t, o, p, a), e.max = _y(e.max, t, o, p, a);
}
function Ty(e, t, [o, i, a], f, d) {
  Lk(e, t[o], t[i], t[a], t.scale, f, d);
}
const Vk = ["x", "scaleX", "originX"], zk = ["y", "scaleY", "originY"];
function ky(e, t, o, i) {
  Ty(e.x, t, Vk, o ? o.x : void 0, i ? i.x : void 0), Ty(e.y, t, zk, o ? o.y : void 0, i ? i.y : void 0);
}
function Ay(e) {
  return e.translate === 0 && e.scale === 1;
}
function r0(e) {
  return Ay(e.x) && Ay(e.y);
}
function by(e, t) {
  return e.min === t.min && e.max === t.max;
}
function Bk(e, t) {
  return by(e.x, t.x) && by(e.y, t.y);
}
function Cy(e, t) {
  return Math.round(e.min) === Math.round(t.min) && Math.round(e.max) === Math.round(t.max);
}
function o0(e, t) {
  return Cy(e.x, t.x) && Cy(e.y, t.y);
}
function Py(e) {
  return ut(e.x) / ut(e.y);
}
function Ey(e, t) {
  return e.translate === t.translate && e.scale === t.scale && e.originPoint === t.originPoint;
}
function en(e) {
  return [e("x"), e("y")];
}
function $k(e, t, o) {
  let i = "";
  const a = e.x.translate / t.x, f = e.y.translate / t.y, d = (o == null ? void 0 : o.z) || 0;
  if ((a || f || d) && (i = `translate3d(${a}px, ${f}px, ${d}px) `), (t.x !== 1 || t.y !== 1) && (i += `scale(${1 / t.x}, ${1 / t.y}) `), o) {
    const { transformPerspective: y, rotate: v, pathRotation: l, rotateX: c, rotateY: S, skewX: x, skewY: _ } = o;
    y && (i = `perspective(${y}px) ${i}`), v && (i += `rotate(${v}deg) `), l && (i += `rotate(${l}deg) `), c && (i += `rotateX(${c}deg) `), S && (i += `rotateY(${S}deg) `), x && (i += `skewX(${x}deg) `), _ && (i += `skewY(${_}deg) `);
  }
  const p = e.x.scale * t.x, m = e.y.scale * t.y;
  return (p !== 1 || m !== 1) && (i += `scale(${p}, ${m})`), i || "none";
}
const i0 = [
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius"
], Uk = i0.length, My = (e) => typeof e == "string" ? parseFloat(e) : e, Ry = (e) => typeof e == "number" || re.test(e);
function Hk(e, t, o, i, a, f) {
  a ? (e.opacity = be(0, o.opacity ?? 1, Wk(i)), e.opacityExit = be(t.opacity ?? 1, 0, Gk(i))) : f && (e.opacity = be(t.opacity ?? 1, o.opacity ?? 1, i));
  for (let d = 0; d < Uk; d++) {
    const p = i0[d];
    let m = Ny(t, p), y = Ny(o, p);
    if (m === void 0 && y === void 0)
      continue;
    m || (m = 0), y || (y = 0), m === 0 || y === 0 || Ry(m) === Ry(y) ? (e[p] = Math.max(be(My(m), My(y), i), 0), (on.test(y) || on.test(m)) && (e[p] += "%")) : e[p] = y;
  }
  (t.rotate || o.rotate) && (e.rotate = be(t.rotate || 0, o.rotate || 0, i));
}
function Ny(e, t) {
  return e[t] !== void 0 ? e[t] : e.borderRadius;
}
const Wk = /* @__PURE__ */ s0(0, 0.5, Zg), Gk = /* @__PURE__ */ s0(0.5, 0.95, jt);
function s0(e, t, o) {
  return (i) => i < e ? 0 : i > t ? 1 : o(/* @__PURE__ */ Ti(e, t, i));
}
function Kk(e, t, o) {
  const i = qe(e) ? e : yo(e);
  return i.start(Bd("", i, t, o)), i.animation;
}
function bi(e, t, o, i = { passive: !0 }) {
  return e.addEventListener(t, o, i), () => e.removeEventListener(t, o);
}
const Yk = (e, t) => e.depth - t.depth;
class Qk {
  constructor() {
    this.children = [], this.isDirty = !1;
  }
  add(t) {
    Ed(this.children, t), this.isDirty = !0;
  }
  remove(t) {
    Ca(this.children, t), this.isDirty = !0;
  }
  forEach(t) {
    this.isDirty && this.children.sort(Yk), this.isDirty = !1, this.children.forEach(t);
  }
}
function Xk(e, t) {
  const o = lt.now(), i = ({ timestamp: a }) => {
    const f = a - o;
    f >= t && (Xn(i), e(f - t));
  };
  return Ce.setup(i, !0), () => Xn(i);
}
function Sa(e) {
  return qe(e) ? e.get() : e;
}
class Zk {
  constructor() {
    this.members = [];
  }
  add(t) {
    Ed(this.members, t);
    for (let o = this.members.length - 1; o >= 0; o--) {
      const i = this.members[o];
      if (i === t || i === this.lead || i === this.prevLead)
        continue;
      const a = i.instance;
      (!a || a.isConnected === !1) && !i.snapshot && (Ca(this.members, i), i.unmount());
    }
    t.scheduleRender();
  }
  remove(t) {
    if (Ca(this.members, t), t === this.prevLead && (this.prevLead = void 0), t === this.lead) {
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
const wa = {
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
}, ac = ["", "X", "Y", "Z"], Jk = 1e3;
let qk = 0;
function lc(e, t, o, i) {
  const { latestValues: a } = t;
  a[e] && (o[e] = a[e], t.setStaticValue(e, 0), i && (i[e] = 0));
}
function a0(e) {
  if (e.hasCheckedOptimisedAppear = !0, e.root === e)
    return;
  const { visualElement: t } = e.options;
  if (!t)
    return;
  const o = Pv(t);
  if (window.MotionHasOptimisedAnimation(o, "transform")) {
    const { layout: a, layoutId: f } = e.options;
    window.MotionCancelOptimisedAnimation(o, "transform", Ce, !(a || f));
  }
  const { parent: i } = e;
  i && !i.hasCheckedOptimisedAppear && a0(i);
}
function l0({ attachResizeListener: e, defaultParent: t, measureScroll: o, checkIsScrollRoot: i, resetTransform: a }) {
  return class {
    constructor(d = {}, p = t == null ? void 0 : t()) {
      this.id = qk++, this.animationId = 0, this.animationCommitId = 0, this.children = /* @__PURE__ */ new Set(), this.options = {}, this.isTreeAnimating = !1, this.isAnimationBlocked = !1, this.isLayoutDirty = !1, this.isProjectionDirty = !1, this.isSharedProjectionDirty = !1, this.isTransformDirty = !1, this.updateManuallyBlocked = !1, this.updateBlockedByResize = !1, this.isUpdating = !1, this.isSVG = !1, this.needsReset = !1, this.shouldResetTransform = !1, this.hasCheckedOptimisedAppear = !1, this.treeScale = { x: 1, y: 1 }, this.eventHandlers = /* @__PURE__ */ new Map(), this.hasTreeAnimated = !1, this.layoutVersion = 0, this.updateScheduled = !1, this.scheduleUpdate = () => this.update(), this.projectionUpdateScheduled = !1, this.checkUpdateFailed = () => {
        this.isUpdating && (this.isUpdating = !1, this.clearAllSnapshots());
      }, this.updateProjection = () => {
        this.projectionUpdateScheduled = !1, this.nodes.forEach(nA), this.nodes.forEach(lA), this.nodes.forEach(uA), this.nodes.forEach(rA);
      }, this.resolvedRelativeTargetAt = 0, this.linkedParentVersion = 0, this.hasProjected = !1, this.isVisible = !0, this.animationProgress = 0, this.sharedNodes = /* @__PURE__ */ new Map(), this.latestValues = d, this.root = p ? p.root || p : this, this.path = p ? [...p.path, p] : [], this.parent = p, this.depth = p ? p.depth + 1 : 0;
      for (let m = 0; m < this.path.length; m++)
        this.path[m].shouldResetTransform = !0;
      this.root === this && (this.nodes = new Qk());
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
      this.isSVG = Gd(d) && !tk(d), this.instance = d;
      const { layoutId: p, layout: m, visualElement: y } = this.options;
      if (y && !y.current && y.mount(d), this.root.nodes.add(this), this.parent && this.parent.children.add(this), this.root.hasTreeAnimated && (m || p) && (this.isLayoutDirty = !0), e) {
        let v, l = 0;
        const c = () => this.root.updateBlockedByResize = !1;
        Ce.read(() => {
          l = window.innerWidth;
        }), e(d, () => {
          const S = window.innerWidth;
          S !== l && (l = S, this.root.updateBlockedByResize = !0, v && v(), v = Xk(c, 250), wa.hasAnimatedSinceResize && (wa.hasAnimatedSinceResize = !1, this.nodes.forEach(Iy)));
        });
      }
      p && this.root.registerSharedNode(p, this), this.options.animate !== !1 && y && (p || m) && this.addEventListener("didUpdate", ({ delta: v, hasLayoutChanged: l, hasRelativeLayoutChanged: c, layout: S }) => {
        if (this.isTreeAnimationBlocked()) {
          this.target = void 0, this.relativeTarget = void 0;
          return;
        }
        const x = this.options.transition || y.getDefaultTransition() || mA, { onLayoutAnimationStart: _, onLayoutAnimationComplete: A } = y.getProps(), T = !this.targetLayout || !o0(this.targetLayout, S), C = !l && c;
        if (this.options.layoutRoot || this.resumeFrom || C || l && (T || !this.currentAnimation)) {
          this.resumeFrom && (this.resumingFrom = this.resumeFrom, this.resumingFrom.resumingFrom = void 0);
          const E = {
            ...zd(x, "layout"),
            onPlay: _,
            onComplete: A
          };
          (y.shouldReduceMotion || this.options.layoutRoot) && (E.delay = 0, E.type = !1), this.startAnimation(E), this.setAnimationOrigin(v, C, E.path);
        } else
          l || Iy(this), this.isLead() && this.options.onExitComplete && this.options.onExitComplete();
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
      this.isUpdateBlocked() || (this.isUpdating = !0, this.nodes && this.nodes.forEach(cA), this.animationId++);
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
      if (window.MotionCancelOptimisedAnimation && !this.hasCheckedOptimisedAppear && a0(this), !this.root.isUpdating && this.root.startUpdate(), this.isLayoutDirty)
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
      this.prevTransformTemplateValue = y ? y(this.latestValues, "") : void 0, this.updateSnapshot(), d && this.notifyListeners("willUpdate");
    }
    update() {
      if (this.updateScheduled = !1, this.isUpdateBlocked()) {
        const m = this.updateBlockedByResize;
        this.unblockUpdate(), this.updateBlockedByResize = !1, this.clearAllSnapshots(), m && this.nodes.forEach(iA), this.nodes.forEach(Dy);
        return;
      }
      if (this.animationId <= this.animationCommitId) {
        this.nodes.forEach(jy);
        return;
      }
      this.animationCommitId = this.animationId, this.isUpdating ? (this.isUpdating = !1, this.nodes.forEach(sA), this.nodes.forEach(aA), this.nodes.forEach(eA), this.nodes.forEach(tA)) : this.nodes.forEach(jy), this.clearAllSnapshots();
      const p = lt.now();
      Je.delta = sn(0, 1e3 / 60, p - Je.timestamp), Je.timestamp = p, Je.isProcessing = !0, qu.update.process(Je), qu.preRender.process(Je), qu.render.process(Je), Je.isProcessing = !1;
    }
    didUpdate() {
      this.updateScheduled || (this.updateScheduled = !0, Hd.read(this.scheduleUpdate));
    }
    clearAllSnapshots() {
      this.nodes.forEach(oA), this.sharedNodes.forEach(dA);
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
      const d = this.isLayoutDirty || this.shouldResetTransform || this.options.alwaysMeasureLayout, p = this.projectionDelta && !r0(this.projectionDelta), m = this.getTransformTemplate(), y = m ? m(this.latestValues, "") : void 0, v = y !== this.prevTransformTemplateValue;
      d && this.instance && (p || hr(this.latestValues) || v) && (a(this.instance, y), this.shouldResetTransform = !1, this.scheduleRender());
    }
    measure(d = !0) {
      const p = this.measurePageBox();
      let m = this.removeElementScroll(p);
      return d && (m = this.removeTransform(m)), hA(m), {
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
      if (!(((y = this.scroll) == null ? void 0 : y.wasRoot) || this.path.some(yA))) {
        const { scroll: v } = this.root;
        v && (tn(p.x, v.offset.x), tn(p.y, v.offset.y));
      }
      return p;
    }
    removeElementScroll(d) {
      var m;
      const p = He();
      if ($t(p, d), (m = this.scroll) != null && m.wasRoot)
        return p;
      for (let y = 0; y < this.path.length; y++) {
        const v = this.path[y], { scroll: l, options: c } = v;
        v !== this.root && l && c.layoutScroll && (l.wasRoot && $t(p, d), tn(p.x, l.offset.x), tn(p.y, l.offset.y));
      }
      return p;
    }
    applyTransform(d, p = !1, m) {
      var v, l;
      const y = m || He();
      $t(y, d);
      for (let c = 0; c < this.path.length; c++) {
        const S = this.path[c];
        !p && S.options.layoutScroll && S.scroll && S !== S.root && (tn(y.x, -S.scroll.offset.x), tn(y.y, -S.scroll.offset.y)), hr(S.latestValues) && va(y, S.latestValues, (v = S.layout) == null ? void 0 : v.layoutBox);
      }
      return hr(this.latestValues) && va(y, this.latestValues, (l = this.layout) == null ? void 0 : l.layoutBox), y;
    }
    removeTransform(d) {
      var m;
      const p = He();
      $t(p, d);
      for (let y = 0; y < this.path.length; y++) {
        const v = this.path[y];
        if (!hr(v.latestValues))
          continue;
        let l;
        v.instance && (Wc(v.latestValues) && v.updateSnapshot(), l = He(), $t(l, v.measurePageBox())), ky(p, v.latestValues, (m = v.snapshot) == null ? void 0 : m.layoutBox, l);
      }
      return hr(this.latestValues) && ky(p, this.latestValues), p;
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
      var S;
      const p = this.getLead();
      this.isProjectionDirty || (this.isProjectionDirty = p.isProjectionDirty), this.isTransformDirty || (this.isTransformDirty = p.isTransformDirty), this.isSharedProjectionDirty || (this.isSharedProjectionDirty = p.isSharedProjectionDirty);
      const m = !!this.resumingFrom || this !== p;
      if (!(d || m && this.isSharedProjectionDirty || this.isProjectionDirty || (S = this.parent) != null && S.isProjectionDirty || this.attemptToResolveRelativeTarget || this.root.updateBlockedByResize))
        return;
      const { layout: v, layoutId: l } = this.options;
      if (!this.layout || !(v || l))
        return;
      this.resolvedRelativeTargetAt = Je.timestamp;
      const c = this.getClosestProjectingParent();
      c && this.linkedParentVersion !== c.layoutVersion && !c.options.layoutRoot && this.removeRelativeTarget(), !this.targetDelta && !this.relativeTarget && (this.options.layoutAnchor !== !1 && c && c.layout ? this.createRelativeTarget(c, this.layout.layoutBox, c.layout.layoutBox) : this.removeRelativeTarget()), !(!this.relativeTarget && !this.targetDelta) && (this.target || (this.target = He(), this.targetWithTransforms = He()), this.relativeTarget && this.relativeTargetOrigin && this.relativeParent && this.relativeParent.target ? (this.forceRelativeParentToResolveTarget(), Ok(this.target, this.relativeTarget, this.relativeParent.target, this.options.layoutAnchor || void 0)) : this.targetDelta ? (this.resumingFrom ? this.applyTransform(this.layout.layoutBox, !1, this.target) : $t(this.target, this.layout.layoutBox), Wv(this.target, this.targetDelta)) : $t(this.target, this.layout.layoutBox), this.attemptToResolveRelativeTarget && (this.attemptToResolveRelativeTarget = !1, this.options.layoutAnchor !== !1 && c && !!c.resumingFrom == !!this.resumingFrom && !c.options.layoutScroll && c.target && this.animationProgress !== 1 ? this.createRelativeTarget(c, this.target, c.target) : this.relativeParent = this.relativeTarget = void 0));
    }
    getClosestProjectingParent() {
      if (!(!this.parent || Wc(this.parent.latestValues) || Hv(this.parent.latestValues)))
        return this.parent.isProjecting() ? this.parent : this.parent.getClosestProjectingParent();
    }
    isProjecting() {
      return !!((this.relativeTarget || this.targetDelta || this.options.layoutRoot) && this.layout);
    }
    createRelativeTarget(d, p, m) {
      this.relativeParent = d, this.linkedParentVersion = d.layoutVersion, this.forceRelativeParentToResolveTarget(), this.relativeTarget = He(), this.relativeTargetOrigin = He(), Ia(this.relativeTargetOrigin, p, m, this.options.layoutAnchor || void 0), $t(this.relativeTarget, this.relativeTargetOrigin);
    }
    removeRelativeTarget() {
      this.relativeParent = this.relativeTarget = void 0;
    }
    calcProjection() {
      var x;
      const d = this.getLead(), p = !!this.resumingFrom || this !== d;
      let m = !0;
      if ((this.isProjectionDirty || (x = this.parent) != null && x.isProjectionDirty) && (m = !1), p && (this.isSharedProjectionDirty || this.isTransformDirty) && (m = !1), this.resolvedRelativeTargetAt === Je.timestamp && (m = !1), m)
        return;
      const { layout: y, layoutId: v } = this.options;
      if (this.isTreeAnimating = !!(this.parent && this.parent.isTreeAnimating || this.currentAnimation || this.pendingAnimation), this.isTreeAnimating || (this.targetDelta = this.relativeTarget = void 0), !this.layout || !(y || v))
        return;
      $t(this.layoutCorrected, this.layout.layoutBox);
      const l = this.treeScale.x, c = this.treeScale.y;
      fk(this.layoutCorrected, this.treeScale, this.path, p), d.layout && !d.target && (this.treeScale.x !== 1 || this.treeScale.y !== 1) && (d.target = d.layout.layoutBox, d.targetWithTransforms = He());
      const { target: S } = d;
      if (!S) {
        this.prevProjectionDelta && (this.createProjectionDeltas(), this.scheduleRender());
        return;
      }
      !this.projectionDelta || !this.prevProjectionDelta ? this.createProjectionDeltas() : (vy(this.prevProjectionDelta.x, this.projectionDelta.x), vy(this.prevProjectionDelta.y, this.projectionDelta.y)), vi(this.projectionDelta, this.layoutCorrected, S, this.latestValues), (this.treeScale.x !== l || this.treeScale.y !== c || !Ey(this.projectionDelta.x, this.prevProjectionDelta.x) || !Ey(this.projectionDelta.y, this.prevProjectionDelta.y)) && (this.hasProjected = !0, this.scheduleRender(), this.notifyListeners("projectionUpdate", S));
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
      const y = this.snapshot, v = y ? y.latestValues : {}, l = { ...this.latestValues }, c = co();
      (!this.relativeParent || !this.relativeParent.options.layoutRoot) && (this.relativeTarget = this.relativeTargetOrigin = void 0), this.attemptToResolveRelativeTarget = !p;
      const S = He(), x = y ? y.source : void 0, _ = this.layout ? this.layout.source : void 0, A = x !== _, T = this.getStack(), C = !T || T.members.length <= 1, E = !!(A && !C && this.options.crossfade === !0 && !this.path.some(pA));
      this.animationProgress = 0;
      let N;
      const O = m == null ? void 0 : m.interpolateProjection(d);
      this.mixTargetDelta = (W) => {
        const H = W / 1e3, Y = O == null ? void 0 : O(H);
        Y ? (c.x.translate = Y.x, c.x.scale = be(d.x.scale, 1, H), c.x.origin = d.x.origin, c.x.originPoint = d.x.originPoint, c.y.translate = Y.y, c.y.scale = be(d.y.scale, 1, H), c.y.origin = d.y.origin, c.y.originPoint = d.y.originPoint) : (Fy(c.x, d.x, H), Fy(c.y, d.y, H)), this.setTargetDelta(c), this.relativeTarget && this.relativeTargetOrigin && this.layout && this.relativeParent && this.relativeParent.layout && (Ia(S, this.layout.layoutBox, this.relativeParent.layout.layoutBox, this.options.layoutAnchor || void 0), fA(this.relativeTarget, this.relativeTargetOrigin, S, H), N && Bk(this.relativeTarget, N) && (this.isProjectionDirty = !1), N || (N = He()), $t(N, this.relativeTarget)), A && (this.animationValues = l, Hk(l, v, this.latestValues, H, E, C)), Y && Y.rotate !== void 0 && (this.animationValues || (this.animationValues = l), this.animationValues.pathRotation = Y.rotate), this.root.scheduleUpdateProjection(), this.scheduleRender(), this.animationProgress = H;
      }, this.mixTargetDelta(this.options.layoutRoot ? 1e3 : 0);
    }
    startAnimation(d) {
      var p, m, y;
      this.notifyListeners("animationStart"), (p = this.currentAnimation) == null || p.stop(), (y = (m = this.resumingFrom) == null ? void 0 : m.currentAnimation) == null || y.stop(), this.pendingAnimation && (Xn(this.pendingAnimation), this.pendingAnimation = void 0), this.pendingAnimation = Ce.update(() => {
        wa.hasAnimatedSinceResize = !0, this.motionValue || (this.motionValue = yo(0)), this.motionValue.jump(0, !1), this.currentAnimation = Kk(this.motionValue, [0, 1e3], {
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
      this.currentAnimation && (this.mixTargetDelta && this.mixTargetDelta(Jk), this.currentAnimation.stop()), this.completeAnimation();
    }
    applyTransformsToTarget() {
      const d = this.getLead();
      let { targetWithTransforms: p, target: m, layout: y, latestValues: v } = d;
      if (!(!p || !m || !y)) {
        if (this !== d && this.layout && y && u0(this.options.animationType, this.layout.layoutBox, y.layoutBox)) {
          m = this.target || He();
          const l = ut(this.layout.layoutBox.x);
          m.x.min = d.target.x.min, m.x.max = m.x.min + l;
          const c = ut(this.layout.layoutBox.y);
          m.y.min = d.target.y.min, m.y.max = m.y.min + c;
        }
        $t(p, m), va(p, v), vi(this.projectionDeltaWithTransform, this.layoutCorrected, p, v);
      }
    }
    registerSharedNode(d, p) {
      this.sharedNodes.has(d) || this.sharedNodes.set(d, new Zk()), this.sharedNodes.get(d).add(p);
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
      for (let v = 0; v < ac.length; v++)
        lc(`rotate${ac[v]}`, d, y, this.animationValues), lc(`skew${ac[v]}`, d, y, this.animationValues);
      d.render();
      for (const v in y)
        d.setStaticValue(v, y[v]), this.animationValues && (this.animationValues[v] = y[v]);
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
        this.needsReset = !1, d.visibility = "", d.opacity = "", d.pointerEvents = Sa(p == null ? void 0 : p.pointerEvents) || "", d.transform = m ? m(this.latestValues, "") : "none";
        return;
      }
      const y = this.getLead();
      if (!this.projectionDelta || !this.layout || !y.target) {
        this.options.layoutId && (d.opacity = this.latestValues.opacity !== void 0 ? this.latestValues.opacity : 1, d.pointerEvents = Sa(p == null ? void 0 : p.pointerEvents) || ""), this.hasProjected && !hr(this.latestValues) && (d.transform = m ? m({}, "") : "none", this.hasProjected = !1);
        return;
      }
      d.visibility = "";
      const v = y.animationValues || y.latestValues;
      this.applyTransformsToTarget();
      let l = $k(this.projectionDeltaWithTransform, this.treeScale, v);
      m && (l = m(v, l)), d.transform = l;
      const { x: c, y: S } = this.projectionDelta;
      d.transformOrigin = `${c.origin * 100}% ${S.origin * 100}% 0`, y.animationValues ? d.opacity = y === this ? v.opacity ?? this.latestValues.opacity ?? 1 : this.preserveOpacity ? this.latestValues.opacity : v.opacityExit : d.opacity = y === this ? v.opacity !== void 0 ? v.opacity : "" : v.opacityExit !== void 0 ? v.opacityExit : 0;
      for (const x in Kc) {
        if (v[x] === void 0)
          continue;
        const { correct: _, applyTo: A, isCSSVariable: T } = Kc[x], C = l === "none" ? v[x] : _(v[x], y);
        if (A) {
          const E = A.length;
          for (let N = 0; N < E; N++)
            d[A[N]] = C;
        } else
          T ? this.options.visualElement.renderState.vars[x] = C : d[x] = C;
      }
      this.options.layoutId && (d.pointerEvents = y === this ? Sa(p == null ? void 0 : p.pointerEvents) || "" : "none");
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
function eA(e) {
  e.updateLayout();
}
function tA(e) {
  var o;
  const t = ((o = e.resumeFrom) == null ? void 0 : o.snapshot) || e.snapshot;
  if (e.isLead() && e.layout && t && e.hasListeners("didUpdate")) {
    const { layoutBox: i, measuredBox: a } = e.layout, { animationType: f } = e.options, d = t.source !== e.layout.source;
    if (f === "size")
      en((l) => {
        const c = d ? t.measuredBox[l] : t.layoutBox[l], S = ut(c);
        c.min = i[l].min, c.max = c.min + S;
      });
    else if (f === "x" || f === "y") {
      const l = f === "x" ? "y" : "x";
      Yc(d ? t.measuredBox[l] : t.layoutBox[l], i[l]);
    } else u0(f, t.layoutBox, i) && en((l) => {
      const c = d ? t.measuredBox[l] : t.layoutBox[l], S = ut(i[l]);
      c.max = c.min + S, e.relativeTarget && !e.currentAnimation && (e.isProjectionDirty = !0, e.relativeTarget[l].max = e.relativeTarget[l].min + S);
    });
    const p = co();
    vi(p, i, t.layoutBox);
    const m = co();
    d ? vi(m, e.applyTransform(a, !0), t.measuredBox) : vi(m, i, t.layoutBox);
    const y = !r0(p);
    let v = !1;
    if (!e.resumeFrom) {
      const l = e.getClosestProjectingParent();
      if (l && !l.resumeFrom) {
        const { snapshot: c, layout: S } = l;
        if (c && S) {
          const x = e.options.layoutAnchor || void 0, _ = He();
          Ia(_, t.layoutBox, c.layoutBox, x);
          const A = He();
          Ia(A, i, S.layoutBox, x), o0(_, A) || (v = !0), l.options.layoutRoot && (e.relativeTarget = A, e.relativeTargetOrigin = _, e.relativeParent = l);
        }
      }
    }
    e.notifyListeners("didUpdate", {
      layout: i,
      snapshot: t,
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
function nA(e) {
  e.parent && (e.isProjecting() || (e.isProjectionDirty = e.parent.isProjectionDirty), e.isSharedProjectionDirty || (e.isSharedProjectionDirty = !!(e.isProjectionDirty || e.parent.isProjectionDirty || e.parent.isSharedProjectionDirty)), e.isTransformDirty || (e.isTransformDirty = e.parent.isTransformDirty));
}
function rA(e) {
  e.isProjectionDirty = e.isSharedProjectionDirty = e.isTransformDirty = !1;
}
function oA(e) {
  e.clearSnapshot();
}
function Dy(e) {
  e.clearMeasurements();
}
function iA(e) {
  e.isLayoutDirty = !0, e.updateLayout();
}
function jy(e) {
  e.isLayoutDirty = !1;
}
function sA(e) {
  e.isAnimationBlocked && e.layout && !e.isLayoutDirty && (e.snapshot = e.layout, e.isLayoutDirty = !0);
}
function aA(e) {
  const { visualElement: t } = e.options;
  t && t.getProps().onBeforeLayoutMeasure && t.notify("BeforeLayoutMeasure"), e.resetTransform();
}
function Iy(e) {
  e.finishAnimation(), e.targetDelta = e.relativeTarget = e.target = void 0, e.isProjectionDirty = !0;
}
function lA(e) {
  e.resolveTargetDelta();
}
function uA(e) {
  e.calcProjection();
}
function cA(e) {
  e.resetSkewAndRotation();
}
function dA(e) {
  e.removeLeadSnapshot();
}
function Fy(e, t, o) {
  e.translate = be(t.translate, 0, o), e.scale = be(t.scale, 1, o), e.origin = t.origin, e.originPoint = t.originPoint;
}
function Oy(e, t, o, i) {
  e.min = be(t.min, o.min, i), e.max = be(t.max, o.max, i);
}
function fA(e, t, o, i) {
  Oy(e.x, t.x, o.x, i), Oy(e.y, t.y, o.y, i);
}
function pA(e) {
  return e.animationValues && e.animationValues.opacityExit !== void 0;
}
const mA = {
  duration: 0.45,
  ease: [0.4, 0, 0.1, 1]
}, Ly = (e) => typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().includes(e), Vy = Ly("applewebkit/") && !Ly("chrome/") ? Math.round : jt;
function zy(e) {
  e.min = Vy(e.min), e.max = Vy(e.max);
}
function hA(e) {
  zy(e.x), zy(e.y);
}
function u0(e, t, o) {
  return e === "position" || e === "preserve-aspect" && !Fk(Py(t), Py(o), 0.2);
}
function yA(e) {
  var t;
  return e !== e.root && ((t = e.scroll) == null ? void 0 : t.wasRoot);
}
const gA = l0({
  attachResizeListener: (e, t) => bi(e, "resize", t),
  measureScroll: () => {
    var e, t;
    return {
      x: document.documentElement.scrollLeft || ((e = document.body) == null ? void 0 : e.scrollLeft) || 0,
      y: document.documentElement.scrollTop || ((t = document.body) == null ? void 0 : t.scrollTop) || 0
    };
  },
  checkIsScrollRoot: () => !0
}), uc = {
  current: void 0
}, c0 = l0({
  measureScroll: (e) => ({
    x: e.scrollLeft,
    y: e.scrollTop
  }),
  defaultParent: () => {
    if (!uc.current) {
      const e = new gA({});
      e.mount(window), e.setOptions({ layoutScroll: !0 }), uc.current = e;
    }
    return uc.current;
  },
  resetTransform: (e, t) => {
    e.style.transform = t !== void 0 ? t : "none";
  },
  checkIsScrollRoot: (e) => window.getComputedStyle(e).position === "fixed"
}), Zd = b.createContext({
  transformPagePoint: (e) => e,
  isStatic: !1,
  reducedMotion: "never"
});
function By(e, t) {
  if (typeof e == "function")
    return e(t);
  e != null && (e.current = t);
}
function vA(...e) {
  return (t) => {
    let o = !1;
    const i = e.map((a) => {
      const f = By(a, t);
      return !o && typeof f == "function" && (o = !0), f;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const f = i[a];
          typeof f == "function" ? f() : By(e[a], null);
        }
      };
  };
}
function SA(...e) {
  return b.useCallback(vA(...e), e);
}
class wA extends b.Component {
  getSnapshotBeforeUpdate(t) {
    const o = this.props.childRef.current;
    if (ma(o) && t.isPresent && !this.props.isPresent && this.props.pop !== !1) {
      const i = o.offsetParent, a = ma(i) && i.offsetWidth || 0, f = ma(i) && i.offsetHeight || 0, d = getComputedStyle(o), p = this.props.sizeRef.current;
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
function xA({ children: e, isPresent: t, anchorX: o, anchorY: i, root: a, pop: f }) {
  var c;
  const d = b.useId(), p = b.useRef(null), m = b.useRef({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    direction: "ltr"
  }), { nonce: y } = b.useContext(Zd), v = ((c = e.props) == null ? void 0 : c.ref) ?? (e == null ? void 0 : e.ref), l = SA(p, v);
  return b.useInsertionEffect(() => {
    const { width: S, height: x, top: _, left: A, right: T, bottom: C, direction: E } = m.current;
    if (t || f === !1 || !p.current || !S || !x)
      return;
    const N = E === "rtl", O = o === "left" ? N ? `right: ${T}` : `left: ${A}` : N ? `left: ${A}` : `right: ${T}`, W = i === "bottom" ? `bottom: ${C}` : `top: ${_}`;
    p.current.dataset.motionPopId = d;
    const H = document.createElement("style");
    y && (H.nonce = y);
    const Y = a ?? document.head;
    return Y.appendChild(H), H.sheet && H.sheet.insertRule(`
          [data-motion-pop-id="${d}"] {
            position: absolute !important;
            width: ${S}px !important;
            height: ${x}px !important;
            ${O}px !important;
            ${W}px !important;
          }
        `), () => {
      var L;
      (L = p.current) == null || L.removeAttribute("data-motion-pop-id"), Y.contains(H) && Y.removeChild(H);
    };
  }, [t]), w.jsx(wA, { isPresent: t, childRef: p, sizeRef: m, pop: f, children: f === !1 ? e : b.cloneElement(e, { ref: l }) });
}
const _A = ({ children: e, initial: t, isPresent: o, onExitComplete: i, custom: a, presenceAffectsLayout: f, mode: d, anchorX: p, anchorY: m, root: y }) => {
  const v = Pd(TA), l = b.useId();
  let c = !0, S = b.useMemo(() => (c = !1, {
    id: l,
    initial: t,
    isPresent: o,
    custom: a,
    onExitComplete: (x) => {
      v.set(x, !0);
      for (const _ of v.values())
        if (!_)
          return;
      i && i();
    },
    register: (x) => (v.set(x, !1), () => v.delete(x))
  }), [o, v, i]);
  return f && c && (S = { ...S }), b.useMemo(() => {
    v.forEach((x, _) => v.set(_, !1));
  }, [o]), b.useEffect(() => {
    !o && !v.size && i && i();
  }, [o]), e = w.jsx(xA, { pop: d === "popLayout", isPresent: o, anchorX: p, anchorY: m, root: y, children: e }), w.jsx(Ha.Provider, { value: S, children: e });
};
function TA() {
  return /* @__PURE__ */ new Map();
}
function d0(e = !0) {
  const t = b.useContext(Ha);
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
const qs = (e) => e.key || "";
function $y(e) {
  const t = [];
  return b.Children.forEach(e, (o) => {
    b.isValidElement(o) && t.push(o);
  }), t;
}
const Ya = ({ children: e, custom: t, initial: o = !0, onExitComplete: i, presenceAffectsLayout: a = !0, mode: f = "sync", propagate: d = !1, anchorX: p = "left", anchorY: m = "top", root: y }) => {
  const [v, l] = d0(d), c = b.useMemo(() => $y(e), [e]), S = d && !v ? [] : c.map(qs), x = b.useRef(!0), _ = b.useRef(c), A = Pd(() => /* @__PURE__ */ new Map()), T = b.useRef(/* @__PURE__ */ new Set()), [C, E] = b.useState(c), [N, O] = b.useState(c);
  Vg(() => {
    x.current = !1, _.current = c;
    for (let Y = 0; Y < N.length; Y++) {
      const L = qs(N[Y]);
      S.includes(L) ? (A.delete(L), T.current.delete(L)) : A.get(L) !== !0 && A.set(L, !1);
    }
  }, [N, S.length, S.join("-")]);
  const W = [];
  if (c !== C) {
    let Y = [...c];
    for (let L = 0; L < N.length; L++) {
      const X = N[L], se = qs(X);
      S.includes(se) || (Y.splice(L, 0, X), W.push(X));
    }
    return f === "wait" && W.length && (Y = W), O($y(Y)), E(c), null;
  }
  const { forceRender: H } = b.useContext(Cd);
  return w.jsx(w.Fragment, { children: N.map((Y) => {
    const L = qs(Y), X = d && !v ? !1 : c === N || S.includes(L), se = () => {
      if (T.current.has(L))
        return;
      if (A.has(L))
        T.current.add(L), A.set(L, !0);
      else
        return;
      let Z = !0;
      A.forEach((de) => {
        de || (Z = !1);
      }), Z && (H == null || H(), O(_.current), d && (l == null || l()), i && i());
    };
    return w.jsx(_A, { isPresent: X, initial: !x.current || o ? void 0 : !1, custom: t, presenceAffectsLayout: a, mode: f, root: y, onExitComplete: X ? void 0 : se, anchorX: p, anchorY: m, children: Y }, L);
  }) });
}, f0 = b.createContext({ strict: !1 }), Uy = {
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
let Hy = !1;
function kA() {
  if (Hy)
    return;
  const e = {};
  for (const t in Uy)
    e[t] = {
      isEnabled: (o) => Uy[t].some((i) => !!o[i])
    };
  Bv(e), Hy = !0;
}
function p0() {
  return kA(), lk();
}
function AA(e) {
  const t = p0();
  for (const o in e)
    t[o] = {
      ...t[o],
      ...e[o]
    };
  Bv(t);
}
const bA = /* @__PURE__ */ new Set([
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
function Fa(e) {
  return e.startsWith("while") || e.startsWith("drag") && e !== "draggable" || e.startsWith("layout") || e.startsWith("onTap") || e.startsWith("onPan") || e.startsWith("onLayout") || bA.has(e);
}
let m0 = (e) => !Fa(e);
function CA(e) {
  typeof e == "function" && (m0 = (t) => t.startsWith("on") ? !Fa(t) : e(t));
}
try {
  CA(require("@emotion/is-prop-valid").default);
} catch {
}
function PA(e, t, o) {
  const i = {};
  for (const a in e)
    a === "values" && typeof e.values == "object" || qe(e[a]) || (m0(a) || o === !0 && Fa(a) || !t && !Fa(a) || // If trying to use native HTML drag events, forward drag listeners
    e.draggable && a.startsWith("onDrag")) && (i[a] = e[a]);
  return i;
}
const Qa = /* @__PURE__ */ b.createContext({});
function EA(e, t) {
  if (Ka(e)) {
    const { initial: o, animate: i } = e;
    return {
      initial: o === !1 || Ai(o) ? o : void 0,
      animate: Ai(i) ? i : void 0
    };
  }
  return e.inherit !== !1 ? t : {};
}
function MA(e) {
  const { initial: t, animate: o } = EA(e, b.useContext(Qa));
  return b.useMemo(() => ({ initial: t, animate: o }), [Wy(t), Wy(o)]);
}
function Wy(e) {
  return Array.isArray(e) ? e.join(" ") : e;
}
const Jd = () => ({
  style: {},
  transform: {},
  transformOrigin: {},
  vars: {}
});
function h0(e, t, o) {
  for (const i in t)
    !qe(t[i]) && !Yv(i, o) && (e[i] = t[i]);
}
function RA({ transformTemplate: e }, t) {
  return b.useMemo(() => {
    const o = Jd();
    return Qd(o, t, e), Object.assign({}, o.vars, o.style);
  }, [t]);
}
function NA(e, t) {
  const o = e.style || {}, i = {};
  return h0(i, o, e), Object.assign(i, RA(e, t)), i;
}
function DA(e, t) {
  const o = {}, i = NA(e, t);
  return e.drag && e.dragListener !== !1 && (o.draggable = !1, i.userSelect = i.WebkitUserSelect = i.WebkitTouchCallout = "none", i.touchAction = e.drag === !0 ? "none" : `pan-${e.drag === "x" ? "y" : "x"}`), e.tabIndex === void 0 && (e.onTap || e.onTapStart || e.whileTap) && (o.tabIndex = 0), o.style = i, o;
}
const y0 = () => ({
  ...Jd(),
  attrs: {}
});
function jA(e, t, o, i) {
  const a = b.useMemo(() => {
    const f = y0();
    return Qv(f, t, Zv(i), e.transformTemplate, e.style), {
      ...f.attrs,
      style: { ...f.style }
    };
  }, [t]);
  if (e.style) {
    const f = {};
    h0(f, e.style, e), a.style = { ...f, ...a.style };
  }
  return a;
}
const IA = [
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
      !!(IA.indexOf(e) > -1 || /**
       * If it contains a capital letter, it's an SVG component
       */
      /[A-Z]/u.test(e))
    )
  );
}
function FA(e, t, o, { latestValues: i }, a, f = !1, d) {
  const m = (d ?? qd(e) ? jA : DA)(t, i, a, e), y = PA(t, typeof e == "string", f), v = e !== b.Fragment ? { ...y, ...m, ref: o } : {}, { children: l } = t, c = b.useMemo(() => qe(l) ? l.get() : l, [l]);
  return b.createElement(e, {
    ...v,
    children: c
  });
}
function OA({ scrapeMotionValuesFromProps: e, createRenderState: t }, o, i, a) {
  return {
    latestValues: LA(o, i, a, e),
    renderState: t()
  };
}
function LA(e, t, o, i) {
  const a = {}, f = i(e, {});
  for (const c in f)
    a[c] = Sa(f[c]);
  let { initial: d, animate: p } = e;
  const m = Ka(e), y = Vv(e);
  t && y && !m && e.inherit !== !1 && (d === void 0 && (d = t.initial), p === void 0 && (p = t.animate));
  let v = o ? o.initial === !1 : !1;
  v = v || d === !1;
  const l = v ? p : d;
  if (l && typeof l != "boolean" && !Ga(l)) {
    const c = Array.isArray(l) ? l : [l];
    for (let S = 0; S < c.length; S++) {
      const x = $d(e, c[S]);
      if (x) {
        const { transitionEnd: _, transition: A, ...T } = x;
        for (const C in T) {
          let E = T[C];
          if (Array.isArray(E)) {
            const N = v ? E.length - 1 : 0;
            E = E[N];
          }
          E !== null && (a[C] = E);
        }
        for (const C in _)
          a[C] = _[C];
      }
    }
  }
  return a;
}
const g0 = (e) => (t, o) => {
  const i = b.useContext(Qa), a = b.useContext(Ha), f = () => OA(e, t, i, a);
  return o ? f() : Pd(f);
}, VA = /* @__PURE__ */ g0({
  scrapeMotionValuesFromProps: Xd,
  createRenderState: Jd
}), zA = /* @__PURE__ */ g0({
  scrapeMotionValuesFromProps: Jv,
  createRenderState: y0
}), BA = Symbol.for("motionComponentSymbol");
function $A(e, t, o) {
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
const v0 = b.createContext({});
function so(e) {
  return e && typeof e == "object" && Object.prototype.hasOwnProperty.call(e, "current");
}
function UA(e, t, o, i, a, f) {
  var E, N;
  const { visualElement: d } = b.useContext(Qa), p = b.useContext(f0), m = b.useContext(Ha), y = b.useContext(Zd), v = y.reducedMotion, l = y.skipAnimations, c = b.useRef(null), S = b.useRef(!1);
  i = i || p.renderer, !c.current && i && (c.current = i(e, {
    visualState: t,
    parent: d,
    props: o,
    presenceContext: m,
    blockInitialAnimation: m ? m.initial === !1 : !1,
    reducedMotionConfig: v,
    skipAnimations: l,
    isSVG: f
  }), S.current && c.current && (c.current.manuallyAnimateOnMount = !0));
  const x = c.current, _ = b.useContext(v0);
  x && !x.projection && a && (x.type === "html" || x.type === "svg") && HA(c.current, o, a, _);
  const A = b.useRef(!1);
  b.useInsertionEffect(() => {
    x && A.current && x.update(o, m);
  });
  const T = o[Cv], C = b.useRef(!!T && typeof window < "u" && !((E = window.MotionHandoffIsComplete) != null && E.call(window, T)) && ((N = window.MotionHasOptimisedAnimation) == null ? void 0 : N.call(window, T)));
  return Vg(() => {
    S.current = !0, x && (A.current = !0, window.MotionIsMounted = !0, x.updateFeatures(), x.scheduleRenderMicrotask(), C.current && x.animationState && x.animationState.animateChanges());
  }), b.useEffect(() => {
    x && (!C.current && x.animationState && x.animationState.animateChanges(), C.current && (queueMicrotask(() => {
      var O;
      (O = window.MotionHandoffMarkAsComplete) == null || O.call(window, T);
    }), C.current = !1), x.enteringChildren = void 0);
  }), x;
}
function HA(e, t, o, i) {
  const { layoutId: a, layout: f, drag: d, dragConstraints: p, layoutScroll: m, layoutRoot: y, layoutAnchor: v, layoutCrossfade: l } = t;
  e.projection = new o(e.latestValues, t["data-framer-portal-id"] ? void 0 : S0(e.parent)), e.projection.setOptions({
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
    layoutAnchor: v
  });
}
function S0(e) {
  if (e)
    return e.options.allowProjection !== !1 ? e.projection : S0(e.parent);
}
function cc(e, { forwardMotionProps: t = !1, type: o } = {}, i, a) {
  i && AA(i);
  const f = o ? o === "svg" : qd(e), d = f ? zA : VA;
  function p(y, v) {
    let l;
    const c = {
      ...b.useContext(Zd),
      ...y,
      layoutId: WA(y)
    }, { isStatic: S } = c, x = MA(y), _ = d(y, S);
    if (!S && typeof window < "u") {
      GA();
      const A = KA(c);
      l = A.MeasureLayout, x.visualElement = UA(e, _, c, a, A.ProjectionNode, f);
    }
    return w.jsxs(Qa.Provider, { value: x, children: [l && x.visualElement ? w.jsx(l, { visualElement: x.visualElement, ...c }) : null, FA(e, y, $A(_, x.visualElement, v), _, S, t, f)] });
  }
  p.displayName = `motion.${typeof e == "string" ? e : `create(${e.displayName ?? e.name ?? ""})`}`;
  const m = b.forwardRef(p);
  return m[BA] = e, m;
}
function WA({ layoutId: e }) {
  const t = b.useContext(Cd).id;
  return t && e !== void 0 ? t + "-" + e : e;
}
function GA(e, t) {
  b.useContext(f0).strict;
}
function KA(e) {
  const t = p0(), { drag: o, layout: i } = t;
  if (!o && !i)
    return {};
  const a = { ...o, ...i };
  return {
    MeasureLayout: o != null && o.isEnabled(e) || i != null && i.isEnabled(e) ? a.MeasureLayout : void 0,
    ProjectionNode: a.ProjectionNode
  };
}
function YA(e, t) {
  if (typeof Proxy > "u")
    return cc;
  const o = /* @__PURE__ */ new Map(), i = (f, d) => cc(f, d, e, t), a = (f, d) => i(f, d);
  return new Proxy(a, {
    /**
     * Called when `motion` is referenced with a prop: `motion.div`, `motion.input` etc.
     * The prop name is passed through as `key` and we can use that to generate a `motion`
     * DOM component with that name.
     */
    get: (f, d) => d === "create" ? i : (o.has(d) || o.set(d, cc(d, void 0, e, t)), o.get(d))
  });
}
const QA = (e, t) => t.isSVG ?? qd(e) ? new Ak(t) : new Sk(t, {
  allowProjection: e !== b.Fragment
});
class XA extends er {
  /**
   * We dynamically generate the AnimationState manager as it contains a reference
   * to the underlying animation library. We only want to load that if we load this,
   * so people can optionally code split it out using the `m` component.
   */
  constructor(t) {
    super(t), t.animationState || (t.animationState = Mk(t));
  }
  updateAnimationControlsSubscription() {
    const { animate: t } = this.node.getProps();
    Ga(t) && (this.unmountControls = t.subscribe(this.node));
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
let ZA = 0;
class JA extends er {
  constructor() {
    super(...arguments), this.id = ZA++, this.isExitComplete = !1;
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
            const { transition: y, transitionEnd: v, ...l } = m;
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
const qA = {
  animation: {
    Feature: XA
  },
  exit: {
    Feature: JA
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
const eb = (e) => (t) => Wd(t) && e(t, ji(t));
function Si(e, t, o, i) {
  return bi(e, t, eb(o), i);
}
const w0 = ({ current: e }) => e ? e.ownerDocument.defaultView : null, Gy = (e, t) => Math.abs(e - t);
function tb(e, t) {
  const o = Gy(e.x, t.x), i = Gy(e.y, t.y);
  return Math.sqrt(o ** 2 + i ** 2);
}
const Ky = /* @__PURE__ */ new Set(["auto", "scroll"]);
class x0 {
  constructor(t, o, { transformPagePoint: i, contextWindow: a = window, dragSnapToOrigin: f = !1, distanceThreshold: d = 3, element: p } = {}) {
    if (this.startEvent = null, this.lastMoveEvent = null, this.lastMoveEventInfo = null, this.lastRawMoveEventInfo = null, this.handlers = {}, this.contextWindow = window, this.scrollPositions = /* @__PURE__ */ new Map(), this.removeScrollListeners = null, this.onElementScroll = (S) => {
      this.handleScroll(S.target);
    }, this.onWindowScroll = () => {
      this.handleScroll(window);
    }, this.updatePoint = () => {
      if (!(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      this.lastRawMoveEventInfo && (this.lastMoveEventInfo = ea(this.lastRawMoveEventInfo, this.transformPagePoint));
      const S = dc(this.lastMoveEventInfo, this.history), x = this.startEvent !== null, _ = tb(S.offset, { x: 0, y: 0 }) >= this.distanceThreshold;
      if (!x && !_)
        return;
      const { point: A } = S, { timestamp: T } = Je;
      this.history.push({ ...A, timestamp: T });
      const { onStart: C, onMove: E } = this.handlers;
      x || (C && C(this.lastMoveEvent, S), this.startEvent = this.lastMoveEvent), E && E(this.lastMoveEvent, S);
    }, this.handlePointerMove = (S, x) => {
      this.lastMoveEvent = S, this.lastRawMoveEventInfo = x, this.lastMoveEventInfo = ea(x, this.transformPagePoint), Ce.update(this.updatePoint, !0);
    }, this.handlePointerUp = (S, x) => {
      this.end();
      const { onEnd: _, onSessionEnd: A, resumeAnimation: T } = this.handlers;
      if ((this.dragSnapToOrigin || !this.startEvent) && T && T(), !(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      const C = dc(S.type === "pointercancel" ? this.lastMoveEventInfo : ea(x, this.transformPagePoint), this.history);
      this.startEvent && _ && _(S, C), A && A(S, C);
    }, !Wd(t))
      return;
    this.dragSnapToOrigin = f, this.handlers = o, this.transformPagePoint = i, this.distanceThreshold = d, this.contextWindow = a || window;
    const m = ji(t), y = ea(m, this.transformPagePoint), { point: v } = y, { timestamp: l } = Je;
    this.history = [{ ...v, timestamp: l }];
    const { onSessionStart: c } = o;
    c && c(t, dc(y, this.history)), this.removeListeners = Ri(Si(this.contextWindow, "pointermove", this.handlePointerMove), Si(this.contextWindow, "pointerup", this.handlePointerUp), Si(this.contextWindow, "pointercancel", this.handlePointerUp)), p && this.startScrollTracking(p);
  }
  /**
   * Start tracking scroll on ancestors and window.
   */
  startScrollTracking(t) {
    let o = t.parentElement;
    for (; o; ) {
      const i = getComputedStyle(o);
      (Ky.has(i.overflowX) || Ky.has(i.overflowY)) && this.scrollPositions.set(o, {
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
    f.x === 0 && f.y === 0 || (i ? this.lastMoveEventInfo && (this.lastMoveEventInfo.point.x += f.x, this.lastMoveEventInfo.point.y += f.y) : this.history.length > 0 && (this.history[0].x -= f.x, this.history[0].y -= f.y), this.scrollPositions.set(t, a), Ce.update(this.updatePoint, !0));
  }
  updateHandlers(t) {
    this.handlers = t;
  }
  end() {
    this.removeListeners && this.removeListeners(), this.removeScrollListeners && this.removeScrollListeners(), this.scrollPositions.clear(), Xn(this.updatePoint);
  }
}
function ea(e, t) {
  return t ? { point: t(e.point) } : e;
}
function Yy(e, t) {
  return { x: e.x - t.x, y: e.y - t.y };
}
function dc({ point: e }, t) {
  return {
    point: e,
    delta: Yy(e, _0(t)),
    offset: Yy(e, nb(t)),
    velocity: rb(t, 0.1)
  };
}
function nb(e) {
  return e[0];
}
function _0(e) {
  return e[e.length - 1];
}
function rb(e, t) {
  if (e.length < 2)
    return { x: 0, y: 0 };
  let o = e.length - 1, i = null;
  const a = _0(e);
  for (; o >= 0 && (i = e[o], !(a.timestamp - i.timestamp > /* @__PURE__ */ gt(t))); )
    o--;
  if (!i)
    return { x: 0, y: 0 };
  i === e[0] && e.length > 2 && a.timestamp - i.timestamp > /* @__PURE__ */ gt(t) * 2 && (i = e[1]);
  const f = /* @__PURE__ */ Dt(a.timestamp - i.timestamp);
  if (f === 0)
    return { x: 0, y: 0 };
  const d = {
    x: (a.x - i.x) / f,
    y: (a.y - i.y) / f
  };
  return d.x === 1 / 0 && (d.x = 0), d.y === 1 / 0 && (d.y = 0), d;
}
function ob(e, { min: t, max: o }, i) {
  return t !== void 0 && e < t ? e = i ? be(t, e, i.min) : Math.max(e, t) : o !== void 0 && e > o && (e = i ? be(o, e, i.max) : Math.min(e, o)), e;
}
function Qy(e, t, o) {
  return {
    min: t !== void 0 ? e.min + t : void 0,
    max: o !== void 0 ? e.max + o - (e.max - e.min) : void 0
  };
}
function ib(e, { top: t, left: o, bottom: i, right: a }) {
  return {
    x: Qy(e.x, o, a),
    y: Qy(e.y, t, i)
  };
}
function Xy(e, t) {
  let o = t.min - e.min, i = t.max - e.max;
  return t.max - t.min < e.max - e.min && ([o, i] = [i, o]), { min: o, max: i };
}
function sb(e, t) {
  return {
    x: Xy(e.x, t.x),
    y: Xy(e.y, t.y)
  };
}
function ab(e, t) {
  let o = 0.5;
  const i = ut(e), a = ut(t);
  return a > i ? o = /* @__PURE__ */ Ti(t.min, t.max - i, e.min) : i > a && (o = /* @__PURE__ */ Ti(e.min, e.max - a, t.min)), sn(0, 1, o);
}
function lb(e, t) {
  const o = {};
  return t.min !== void 0 && (o.min = t.min - e.min), t.max !== void 0 && (o.max = t.max - e.min), o;
}
const Qc = 0.35;
function ub(e = Qc) {
  return e === !1 ? e = 0 : e === !0 && (e = Qc), {
    x: Zy(e, "left", "right"),
    y: Zy(e, "top", "bottom")
  };
}
function Zy(e, t, o) {
  return {
    min: Jy(e, t),
    max: Jy(e, o)
  };
}
function Jy(e, t) {
  return typeof e == "number" ? e : e[t] || 0;
}
const cb = /* @__PURE__ */ new WeakMap();
class db {
  constructor(t) {
    this.openDragLock = null, this.isDragging = !1, this.currentDirection = null, this.originPoint = { x: 0, y: 0 }, this.constraints = !1, this.hasMutatedConstraints = !1, this.elastic = He(), this.latestPointerEvent = null, this.latestPanInfo = null, this.visualElement = t;
  }
  start(t, { snapToCursor: o = !1, distanceThreshold: i } = {}) {
    const { presenceContext: a } = this.visualElement;
    if (a && a.isPresent === !1)
      return;
    const f = (l) => {
      o && this.snapToCursor(ji(l).point), this.stopAnimation();
    }, d = (l, c) => {
      const { drag: S, dragPropagation: x, onDragStart: _ } = this.getProps();
      if (S && !x && (this.openDragLock && this.openDragLock(), this.openDragLock = LT(S), !this.openDragLock))
        return;
      this.latestPointerEvent = l, this.latestPanInfo = c, this.isDragging = !0, this.currentDirection = null, this.resolveConstraints(), this.visualElement.projection && (this.visualElement.projection.isAnimationBlocked = !0, this.visualElement.projection.target = void 0), en((T) => {
        let C = this.getAxisMotionValue(T).get() || 0;
        if (on.test(C)) {
          const { projection: E } = this.visualElement;
          if (E && E.layout) {
            const N = E.layout.layoutBox[T];
            N && (C = ut(N) * (parseFloat(C) / 100));
          }
        }
        this.originPoint[T] = C;
      }), _ && Ce.update(() => _(l, c), !1, !0), Vc(this.visualElement, "transform");
      const { animationState: A } = this.visualElement;
      A && A.setActive("whileDrag", !0);
    }, p = (l, c) => {
      this.latestPointerEvent = l, this.latestPanInfo = c;
      const { dragPropagation: S, dragDirectionLock: x, onDirectionLock: _, onDrag: A } = this.getProps();
      if (!S && !this.openDragLock)
        return;
      const { offset: T } = c;
      if (x && this.currentDirection === null) {
        this.currentDirection = pb(T), this.currentDirection !== null && _ && _(this.currentDirection);
        return;
      }
      this.updateAxis("x", c.point, T), this.updateAxis("y", c.point, T), this.visualElement.render(), A && Ce.update(() => A(l, c), !1, !0);
    }, m = (l, c) => {
      this.latestPointerEvent = l, this.latestPanInfo = c, this.stop(l, c), this.latestPointerEvent = null, this.latestPanInfo = null;
    }, y = () => {
      const { dragSnapToOrigin: l } = this.getProps();
      (l || this.constraints) && this.startAnimation({ x: 0, y: 0 });
    }, { dragSnapToOrigin: v } = this.getProps();
    this.panSession = new x0(t, {
      onSessionStart: f,
      onStart: d,
      onMove: p,
      onSessionEnd: m,
      resumeAnimation: y
    }, {
      transformPagePoint: this.visualElement.getTransformPagePoint(),
      dragSnapToOrigin: v,
      distanceThreshold: i,
      contextWindow: w0(this.visualElement),
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
    p && Ce.postRender(() => p(i, a));
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
    if (!i || !ta(t, a, this.currentDirection))
      return;
    const f = this.getAxisMotionValue(t);
    let d = this.originPoint[t] + i[t];
    this.constraints && this.constraints[t] && (d = ob(d, this.constraints[t], this.elastic[t])), f.set(d);
  }
  resolveConstraints() {
    var f;
    const { dragConstraints: t, dragElastic: o } = this.getProps(), i = this.visualElement.projection && !this.visualElement.projection.layout ? this.visualElement.projection.measure(!1) : (f = this.visualElement.projection) == null ? void 0 : f.layout, a = this.constraints;
    t && so(t) ? this.constraints || (this.constraints = this.resolveRefConstraints()) : t && i ? this.constraints = ib(i.layoutBox, t) : this.constraints = !1, this.elastic = ub(o), a !== this.constraints && !so(t) && i && this.constraints && !this.hasMutatedConstraints && en((d) => {
      this.constraints !== !1 && this.getAxisMotionValue(d) && (this.constraints[d] = lb(i.layoutBox[d], this.constraints[d]));
    });
  }
  resolveRefConstraints() {
    const { dragConstraints: t, onMeasureDragConstraints: o } = this.getProps();
    if (!t || !so(t))
      return !1;
    const i = t.current;
    Pr(i !== null, "If `dragConstraints` is set as a React ref, that ref must be passed to another component's `ref` prop.", "drag-constraints-ref");
    const { projection: a } = this.visualElement;
    if (!a || !a.layout)
      return !1;
    a.root && (a.root.scroll = void 0, a.root.updateScroll());
    const f = pk(i, a.root, this.visualElement.getTransformPagePoint());
    let d = sb(a.layout.layoutBox, f);
    if (o) {
      const p = o(ck(d));
      this.hasMutatedConstraints = !!p, p && (d = Uv(p));
    }
    return d;
  }
  startAnimation(t) {
    const { drag: o, dragMomentum: i, dragElastic: a, dragTransition: f, dragSnapToOrigin: d, onDragTransitionEnd: p } = this.getProps(), m = this.constraints || {}, y = en((v) => {
      if (!ta(v, o, this.currentDirection))
        return;
      let l = m && m[v] || {};
      (d === !0 || d === v) && (l = { min: 0, max: 0 });
      const c = a ? 200 : 1e6, S = a ? 40 : 1e7, x = {
        type: "inertia",
        velocity: i ? t[v] : 0,
        bounceStiffness: c,
        bounceDamping: S,
        timeConstant: 750,
        restDelta: 1,
        restSpeed: 10,
        ...f,
        ...l
      };
      return this.startAxisValueAnimation(v, x);
    });
    return Promise.all(y).then(p);
  }
  startAxisValueAnimation(t, o) {
    const i = this.getAxisMotionValue(t);
    return Vc(this.visualElement, t), i.start(Bd(t, i, 0, o, this.visualElement, !1));
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
      if (!ta(o, i, this.currentDirection))
        return;
      const { projection: a } = this.visualElement, f = this.getAxisMotionValue(o);
      if (a && a.layout) {
        const { min: d, max: p } = a.layout.layoutBox[o], m = f.get() || 0;
        f.set(t[o] - be(d, p, 0.5) + m);
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
    if (!so(o) || !i || !this.constraints)
      return;
    this.stopAnimation();
    const a = { x: 0, y: 0 };
    en((d) => {
      const p = this.getAxisMotionValue(d);
      if (p && this.constraints !== !1) {
        const m = p.get();
        a[d] = ab({ min: m, max: m }, this.constraints[d]);
      }
    });
    const { transformTemplate: f } = this.visualElement.getProps();
    this.visualElement.current.style.transform = f ? f({}, "") : "none", i.root && i.root.updateScroll(), i.updateLayout(), this.constraints = !1, this.resolveConstraints(), en((d) => {
      if (!ta(d, t, null))
        return;
      const p = this.getAxisMotionValue(d), { min: m, max: y } = this.constraints[d];
      p.set(be(m, y, a[d]));
    }), this.visualElement.render();
  }
  addListeners() {
    if (!this.visualElement.current)
      return;
    cb.set(this.visualElement, this);
    const t = this.visualElement.current, o = Si(t, "pointerdown", (y) => {
      const { drag: v, dragListener: l = !0 } = this.getProps(), c = y.target, S = c !== t && HT(c);
      v && l && !S && this.start(y);
    });
    let i;
    const a = () => {
      const { dragConstraints: y } = this.getProps();
      so(y) && y.current && (this.constraints = this.resolveRefConstraints(), i || (i = fb(t, y.current, () => this.scalePositionWithinConstraints())));
    }, { projection: f } = this.visualElement, d = f.addEventListener("measure", a);
    f && !f.layout && (f.root && f.root.updateScroll(), f.updateLayout()), Ce.read(a);
    const p = bi(window, "resize", () => this.scalePositionWithinConstraints()), m = f.addEventListener("didUpdate", (({ delta: y, hasLayoutChanged: v }) => {
      this.isDragging && v && (en((l) => {
        const c = this.getAxisMotionValue(l);
        c && (this.originPoint[l] += y[l].translate, c.set(c.get() + y[l].translate));
      }), this.visualElement.render());
    }));
    return () => {
      p(), o(), d(), m && m(), i && i();
    };
  }
  getProps() {
    const t = this.visualElement.getProps(), { drag: o = !1, dragDirectionLock: i = !1, dragPropagation: a = !1, dragConstraints: f = !1, dragElastic: d = Qc, dragMomentum: p = !0 } = t;
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
function qy(e) {
  let t = !0;
  return () => {
    if (t) {
      t = !1;
      return;
    }
    e();
  };
}
function fb(e, t, o) {
  const i = sy(e, qy(o)), a = sy(t, qy(o));
  return () => {
    i(), a();
  };
}
function ta(e, t, o) {
  return (t === !0 || t === e) && (o === null || o === e);
}
function pb(e, t = 10) {
  let o = null;
  return Math.abs(e.y) > t ? o = "y" : Math.abs(e.x) > t && (o = "x"), o;
}
class mb extends er {
  constructor(t) {
    super(t), this.removeGroupControls = jt, this.removeListeners = jt, this.controls = new db(t);
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
const fc = (e) => (t, o) => {
  e && Ce.update(() => e(t, o), !1, !0);
};
class hb extends er {
  constructor() {
    super(...arguments), this.removePointerDownListener = jt;
  }
  onPointerDown(t) {
    this.session = new x0(t, this.createPanHandlers(), {
      transformPagePoint: this.node.getTransformPagePoint(),
      contextWindow: w0(this.node)
    });
  }
  createPanHandlers() {
    const { onPanSessionStart: t, onPanStart: o, onPan: i, onPanEnd: a } = this.node.getProps();
    return {
      onSessionStart: fc(t),
      onStart: fc(o),
      onMove: fc(i),
      onEnd: (f, d) => {
        delete this.session, a && Ce.postRender(() => a(f, d));
      }
    };
  }
  mount() {
    this.removePointerDownListener = Si(this.node.current, "pointerdown", (t) => this.onPointerDown(t));
  }
  update() {
    this.session && this.session.updateHandlers(this.createPanHandlers());
  }
  unmount() {
    this.removePointerDownListener(), this.session && this.session.end();
  }
}
let pc = !1;
class yb extends b.Component {
  /**
   * This only mounts projection nodes for components that
   * need measuring, we might want to do it for all components
   * in order to incorporate transforms
   */
  componentDidMount() {
    const { visualElement: t, layoutGroup: o, switchLayoutGroup: i, layoutId: a } = this.props, { projection: f } = t;
    f && (o.group && o.group.add(f), i && i.register && a && i.register(f), pc && f.root.didUpdate(), f.addEventListener("animationComplete", () => {
      this.safeToRemove();
    }), f.setOptions({
      ...f.options,
      layoutDependency: this.props.layoutDependency,
      onExitComplete: () => this.safeToRemove()
    })), wa.hasEverUpdated = !0;
  }
  getSnapshotBeforeUpdate(t) {
    const { layoutDependency: o, visualElement: i, drag: a, isPresent: f } = this.props, { projection: d } = i;
    return d && (d.isPresent = f, t.layoutDependency !== o && d.setOptions({
      ...d.options,
      layoutDependency: o
    }), pc = !0, a || t.layoutDependency !== o || o === void 0 || t.isPresent !== f ? d.willUpdate() : this.safeToRemove(), t.isPresent !== f && (f ? d.promote() : d.relegate() || Ce.postRender(() => {
      const p = d.getStack();
      (!p || !p.members.length) && this.safeToRemove();
    }))), null;
  }
  componentDidUpdate() {
    const { visualElement: t, layoutAnchor: o } = this.props, { projection: i } = t;
    i && (i.options.layoutAnchor = o, i.root.didUpdate(), Hd.postRender(() => {
      !i.currentAnimation && i.isLead() && this.safeToRemove();
    }));
  }
  componentWillUnmount() {
    const { visualElement: t, layoutGroup: o, switchLayoutGroup: i } = this.props, { projection: a } = t;
    pc = !0, a && (a.scheduleCheckAfterUnmount(), o && o.group && o.group.remove(a), i && i.deregister && i.deregister(a));
  }
  safeToRemove() {
    const { safeToRemove: t } = this.props;
    t && t();
  }
  render() {
    return null;
  }
}
function T0(e) {
  const [t, o] = d0(), i = b.useContext(Cd);
  return w.jsx(yb, { ...e, layoutGroup: i, switchLayoutGroup: b.useContext(v0), isPresent: t, safeToRemove: o });
}
const gb = {
  pan: {
    Feature: hb
  },
  drag: {
    Feature: mb,
    ProjectionNode: c0,
    MeasureLayout: T0
  }
};
function eg(e, t, o) {
  const { props: i } = e;
  e.animationState && i.whileHover && e.animationState.setActive("whileHover", o === "Start");
  const a = "onHover" + o, f = i[a];
  f && Ce.postRender(() => f(t, ji(t)));
}
class vb extends er {
  mount() {
    const { current: t } = this.node;
    t && (this.unmount = zT(t, (o, i) => (eg(this.node, i, "Start"), (a) => eg(this.node, a, "End"))));
  }
  unmount() {
  }
}
class Sb extends er {
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
    this.unmount = Ri(bi(this.node.current, "focus", () => this.onFocus()), bi(this.node.current, "blur", () => this.onBlur()));
  }
  unmount() {
  }
}
function tg(e, t, o) {
  const { props: i } = e;
  if (e.current instanceof HTMLButtonElement && e.current.disabled)
    return;
  e.animationState && i.whileTap && e.animationState.setActive("whileTap", o === "Start");
  const a = "onTap" + (o === "End" ? "" : o), f = i[a];
  f && Ce.postRender(() => f(t, ji(t)));
}
class wb extends er {
  mount() {
    const { current: t } = this.node;
    if (!t)
      return;
    const { globalTapTarget: o, propagate: i } = this.node.props;
    this.unmount = GT(t, (a, f) => (tg(this.node, f, "Start"), (d, { success: p }) => tg(this.node, d, p ? "End" : "Cancel")), {
      useGlobalTarget: o,
      stopPropagation: (i == null ? void 0 : i.tap) === !1
    });
  }
  unmount() {
  }
}
const Xc = /* @__PURE__ */ new WeakMap(), mc = /* @__PURE__ */ new WeakMap(), xb = (e) => {
  const t = Xc.get(e.target);
  t && t(e);
}, _b = (e) => {
  e.forEach(xb);
};
function Tb({ root: e, ...t }) {
  const o = e || document;
  mc.has(o) || mc.set(o, {});
  const i = mc.get(o), a = JSON.stringify(t);
  return i[a] || (i[a] = new IntersectionObserver(_b, { root: e, ...t })), i[a];
}
function kb(e, t, o) {
  const i = Tb(t);
  return Xc.set(e, o), i.observe(e), () => {
    Xc.delete(e), i.unobserve(e);
  };
}
const Ab = {
  some: 0,
  all: 1
};
class bb extends er {
  constructor() {
    super(...arguments), this.hasEnteredView = !1, this.isInView = !1;
  }
  startObserver() {
    var m;
    (m = this.stopObserver) == null || m.call(this);
    const { viewport: t = {} } = this.node.getProps(), { root: o, margin: i, amount: a = "some", once: f } = t, d = {
      root: o ? o.current : void 0,
      rootMargin: i,
      threshold: typeof a == "number" ? a : Ab[a]
    }, p = (y) => {
      const { isIntersecting: v } = y;
      if (this.isInView === v || (this.isInView = v, f && !v && this.hasEnteredView))
        return;
      v && (this.hasEnteredView = !0), this.node.animationState && this.node.animationState.setActive("whileInView", v);
      const { onViewportEnter: l, onViewportLeave: c } = this.node.getProps(), S = v ? l : c;
      S && S(y);
    };
    this.stopObserver = kb(this.node.current, d, p);
  }
  mount() {
    this.startObserver();
  }
  update() {
    if (typeof IntersectionObserver > "u")
      return;
    const { props: t, prevProps: o } = this.node;
    ["amount", "margin", "root"].some(Cb(t, o)) && this.startObserver();
  }
  unmount() {
    var t;
    (t = this.stopObserver) == null || t.call(this), this.hasEnteredView = !1, this.isInView = !1;
  }
}
function Cb({ viewport: e = {} }, { viewport: t = {} } = {}) {
  return (o) => e[o] !== t[o];
}
const Pb = {
  inView: {
    Feature: bb
  },
  tap: {
    Feature: wb
  },
  focus: {
    Feature: Sb
  },
  hover: {
    Feature: vb
  }
}, Eb = {
  layout: {
    ProjectionNode: c0,
    MeasureLayout: T0
  }
}, Mb = {
  ...qA,
  ...Pb,
  ...gb,
  ...Eb
}, vn = /* @__PURE__ */ YA(Mb, QA);
function Rb(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function k0(e) {
  const t = String(e || "").toLowerCase();
  return t === "127.0.0.1" || t === "localhost" || t === "::1" || t === "[::1]";
}
function ng(e) {
  return k0(e) || Rb(e);
}
function Nb(e) {
  return !e || k0(e) ? "127.0.0.1" : e;
}
const Db = (() => {
  var v, l, c, S;
  const e = globalThis.window || globalThis, t = globalThis.document || {}, o = e.location || {}, i = String(e.SYNAPSE_DATA_API_PORT || ((l = (v = t.body) == null ? void 0 : v.dataset) == null ? void 0 : l.dataApiPort) || "3001").trim(), { protocol: a = "file:", hostname: f = "127.0.0.1", port: d = "" } = o, p = `http://${Nb(f)}:${i || "3001"}`, m = String(e.SYNAPSE_DATA_API_BASE || ((S = (c = t.body) == null ? void 0 : c.dataset) == null ? void 0 : S.dataApiBase) || "").replace(/\/+$/, ""), y = `${a}//${o.host || (d ? `${f}:${d}` : f)}`.replace(/\/+$/, "");
  return m && !(ng(f) && d !== i && m === y) ? m : a === "file:" || ng(f) && d !== i ? p : `${a}//${o.host || f}`;
})(), jb = new Fg(Db), hc = Number((globalThis.window || globalThis).SYNAPSE_DATA_API_TIMEOUT_MS || 6e3), Ib = Number.isFinite(hc) && hc > 0 ? hc : 6e3;
function Fb(e, t) {
  typeof window > "u" || console.warn(e, t);
}
async function Ob(e) {
  var i, a;
  const o = (((a = (i = e.headers) == null ? void 0 : i.get) == null ? void 0 : a.call(i, "content-type")) || "").includes("application/json") ? await e.json() : {};
  if (!e.ok || (o == null ? void 0 : o.ok) === !1)
    throw new Error((o == null ? void 0 : o.error) || `Synapse data API returned HTTP ${e.status}`);
  return o;
}
async function Lb(e, t = {}) {
  const o = await jb.fetch(e, {
    timeoutMs: Ib,
    ...t
  });
  return Ob(o);
}
async function Vb(e) {
  try {
    return (await Lb("/api/focus-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(e || {})
    })).item || null;
  } catch (t) {
    return Fb("Synapse data API focus-session save skipped:", t), null;
  }
}
class zb {
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
const A0 = new zb();
function ef(e, t) {
  return A0.readJSON(e, t);
}
function tf(e, t) {
  return A0.writeJSON(e, t);
}
const b0 = "synapse.focusRoom.sessions.v1", C0 = "synapse.focusRoom.draft.v1", P0 = "synapse.focusRoom.active-session.v1", Zc = 40, rg = Object.freeze([
  "idle",
  "running",
  "paused",
  "completed",
  "break",
  "restoring"
]), Bb = Object.freeze({
  studying: "running",
  running: "running",
  idle: "idle",
  paused: "paused",
  completed: "completed",
  break: "break",
  restoring: "restoring"
});
let Jc = [];
const yr = (e) => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURI(e)}`, Gn = [
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
function $b(e = "") {
  const t = String(e || "");
  return wi.find((o) => o.id === t) || wi[wi.length - 1];
}
function Ub(e = {}) {
  return wi.find((t) => t.musicType === String((e == null ? void 0 : e.musicType) || "") && t.ambientSound === String((e == null ? void 0 : e.ambientSound) || "")) || null;
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
}, Kn = [
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
], Hb = Zn, E0 = [25, 45, 50, 90];
function Wb(e = "") {
  const t = String(e || "");
  return Gn.find((o) => o.label === t) || Gn[0];
}
function Gb(e = "") {
  const t = String(e || "");
  return Kn.find((o) => o.label === t) || Kn[0];
}
function Ii(e = {}) {
  const t = Wb(e == null ? void 0 : e.musicType), o = Gb(e == null ? void 0 : e.ambientSound);
  return {
    musicTrack: t,
    ambientSound: o,
    ambientLayers: o.layers.map((i) => ({
      ...i,
      volumeBias: Un(i.volumeBias, 1)
    }))
  };
}
function Kb(e) {
  return e && typeof e == "object" && !Array.isArray(e) ? e : {};
}
function M0(e) {
  return String(e || "").trim();
}
function Yb({ material: e, goal: t, durationMinutes: o }) {
  var v;
  const i = Math.max(10, Number(o) || 25), a = (v = e == null ? void 0 : e.studyHeadings) != null && v.length ? e.studyHeadings : ["Key ideas", "Examples", "Practice", "Review"], f = String(t || "").trim() || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`, d = Math.max(1, Math.floor(i * 0.2)), p = Math.max(1, Math.floor(i * 0.4)), m = Math.max(1, Math.floor(i * 0.2)), y = Math.max(1, i - d - p - m);
  return [
    { minutes: d, task: `Set the goal: ${f}` },
    { minutes: p, task: `Review ${a[0] || "the core ideas"}` },
    { minutes: m, task: `Practice with ${a[1] || a[0] || "the generated examples"}` },
    { minutes: y, task: "Summarize mistakes and choose the next study step" }
  ];
}
function R0() {
  return ef(C0, null);
}
function Qb(e) {
  return tf(C0, e || null);
}
function N0(e) {
  if (!e || typeof e != "object")
    return { materials: {} };
  const t = Kb(e.materials);
  return {
    ...e,
    materials: { ...t }
  };
}
function go(e, t = "idle") {
  const o = Bb[String(e || "").trim().toLowerCase()];
  return o && rg.includes(o) ? o : rg.includes(t) ? t : "idle";
}
function nf(e) {
  return go(e) === "running" ? "studying" : go(e);
}
function D0(e = {}, t = {}) {
  const o = e && typeof e == "object" ? e : {}, i = t && typeof t == "object" ? t : {}, a = Object.prototype.hasOwnProperty.call(o, "timerStatus"), f = Object.prototype.hasOwnProperty.call(o, "timerState") || Object.prototype.hasOwnProperty.call(o, "timerPhase"), d = go(
    f ? o.timerState || o.timerPhase : a ? o.timerStatus : o.status || i.timerState,
    go(i.timerState || i.timerPhase || i.timerStatus)
  ), p = o.timerMode === "countup" || i.timerMode === "countup" && !Object.prototype.hasOwnProperty.call(o, "timerMode") ? "countup" : "countdown", y = Object.fromEntries(["timerAnchorAtMs", "timerPausedAtMs", "timerUpdatedAtMs", "timerRestoredAtMs"].map((l) => {
    const c = Object.prototype.hasOwnProperty.call(o, l) ? o[l] : i[l], S = Number(c);
    return [l, Number.isFinite(S) && S > 0 ? S : null];
  })), v = Math.max(0, Un(
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
    elapsedSeconds: v,
    ...y
  };
}
function j0() {
  return N0(ef(P0, null));
}
function Xb(e) {
  return tf(P0, N0(e));
}
function I0(e) {
  const t = M0(e);
  if (!t) return null;
  const i = j0().materials[t];
  return i && typeof i == "object" ? D0(i) : null;
}
function rf(e, t) {
  const o = M0(e);
  if (!o) return !1;
  const i = j0();
  return t && typeof t == "object" ? i.materials[o] = {
    ...D0(t, i.materials[o]),
    materialId: o,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  } : delete i.materials[o], Xb(i);
}
function xa(e) {
  return rf(e, null);
}
function qc() {
  const e = ef(b0, []), t = Array.isArray(e) ? e : [], o = /* @__PURE__ */ new Set();
  return [...Jc, ...t].filter((i) => {
    const a = String((i == null ? void 0 : i.sessionId) || "");
    return !a || o.has(a) ? !1 : (o.add(a), !0);
  }).slice(0, Zc);
}
function Un(e, t) {
  const o = Number(e);
  return Number.isFinite(o) ? o : t;
}
function Zb(e = {}) {
  const t = (/* @__PURE__ */ new Date()).toISOString(), i = { ...{
    sessionId: e.sessionId || `focus-${Date.now()}`,
    materialId: String(e.materialId || ""),
    materialTitle: e.materialTitle || "Study material",
    studyGoal: e.studyGoal || "",
    selectedScene: e.selectedScene || "morning-window",
    musicType: e.musicType || "Deep Focus",
    ambientSound: e.ambientSound || "Nature",
    musicVolume: Un(e.musicVolume ?? 60, 60),
    ambientVolume: Un(e.ambientVolume ?? 50, 50),
    pomodoroDuration: Un(e.pomodoroDuration || 25, 25),
    startedAt: e.startedAt || t,
    endedAt: e.endedAt || t,
    totalFocusTime: Math.max(0, Un(e.totalFocusTime || 0, 0)),
    flashcardsCompleted: Math.max(0, Un(e.flashcardsCompleted || 0, 0)),
    quizScore: e.quizScore === null || e.quizScore === void 0 || e.quizScore === "" ? null : Number.isFinite(Number(e.quizScore)) ? Number(e.quizScore) : null,
    mistakesMade: Array.isArray(e.mistakesMade) ? e.mistakesMade : [],
    completedTasks: Array.isArray(e.completedTasks) ? e.completedTasks : [],
    aiReflection: e.aiReflection || "You protected a focused study block and created momentum for the next session.",
    recommendedNextStep: e.recommendedNextStep || "Review the hardest item, then start another short focus block.",
    sessionDate: e.sessionDate || t
  }, persisted: !0 }, a = qc().filter((m) => m.sessionId !== i.sessionId), f = [i, ...a.map((m) => ({ ...m, persisted: !0 }))].slice(0, Zc), d = tf(b0, f), p = { ...i, persisted: d };
  return Vb(p).catch((m) => {
    console.warn("Synapse data API focus-session background save failed:", m);
  }), d ? Jc = [] : Jc = [p, ...a].slice(0, Zc), p;
}
function F0(e) {
  const t = Math.max(0, Un(e || 0, 0)), o = Math.floor(t / 3600), i = Math.floor(t % 3600 / 60);
  return o ? `${o}h ${i}m` : `${i}m`;
}
const Ae = (e, t, o, i) => Object.freeze({ kind: e, duration: t, intensity: o, density: i }), og = Object.freeze({
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
function Jb(e = "") {
  return og[String(e || "")] || og["morning-window"];
}
var Dg;
const ed = ((Dg = Zn[0]) == null ? void 0 : Dg.id) || "morning-window", po = E0[0] || 25, qb = 10, Xa = 180, of = 60, O0 = Xa * 60, eC = 0, tC = 100, nC = ["materials", "notes", "sources", "chat", "quiz", "flashcards", "mindmap", "plan", "workspace", "history"], td = new Set(nC), Oa = {
  type: "spring",
  stiffness: 120,
  damping: 18,
  mass: 0.8
};
function rC(e, t, o, i) {
  const a = Number(e);
  return Number.isFinite(a) ? Math.min(i, Math.max(o, a)) : t;
}
function Ar(e, t, o, i) {
  return Math.round(rC(e, t, o, i));
}
function Tt(e, t = 50) {
  return Ar(e, t, eC, tC);
}
function _r(e, t = po) {
  return Ar(e, t, qb, Xa);
}
function rn(e, t = po * 60) {
  return Ar(e, t, of, O0);
}
function Fi(e) {
  return Zn.find((t) => t.id === e) || null;
}
function Yn(e = ed) {
  return Fi(e) || Zn[0] || {
    id: ed,
    name: "Focus Room",
    kicker: "Focus",
    description: "A quiet study space.",
    image: "",
    ambientSound: "Nature",
    musicType: "Deep Focus"
  };
}
function L0(e) {
  return Array.isArray(e) ? e.map((t) => ({
    minutes: Ar(t == null ? void 0 : t.minutes, 5, 1, Xa),
    task: String((t == null ? void 0 : t.task) || "").trim()
  })).filter((t) => t.task) : [];
}
function hi(e) {
  return Array.isArray(e) ? e.map((t) => ({
    role: String((t == null ? void 0 : t.role) || "assistant") === "user" ? "user" : "assistant",
    text: String((t == null ? void 0 : t.text) || "").trim(),
    createdAt: (t == null ? void 0 : t.createdAt) || (/* @__PURE__ */ new Date()).toISOString()
  })).filter((t) => t.text).slice(-24) : [];
}
function V0(e) {
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
function nd(e, t, o) {
  return e ? Yb({
    material: e,
    goal: t,
    durationMinutes: o
  }) : [];
}
function Ci(e) {
  const t = _r(e);
  return t > 0 ? t * 60 : 0;
}
function rd(e) {
  const t = Math.max(0, Math.floor(Number(e) || 0)), o = Math.floor(t / 3600), i = Math.floor(t % 3600 / 60), a = t % 60, f = (d) => String(d).padStart(2, "0");
  return o ? `${o}:${f(i)}:${f(a)}` : `${f(i)}:${f(a)}`;
}
function ig(e) {
  const t = (e == null ? void 0 : e.flashcards) || [];
  return Array.isArray(t) ? t.slice(0, 24) : [];
}
function oC(e, t) {
  return String((e == null ? void 0 : e.id) || (e == null ? void 0 : e.front) || (e == null ? void 0 : e.term) || t);
}
function iC(e) {
  var t;
  return Array.isArray(e == null ? void 0 : e.questions) ? e.questions : Array.isArray((t = e == null ? void 0 : e.quiz) == null ? void 0 : t.questions) ? e.quiz.questions : [];
}
function od(e) {
  return (Array.isArray(e == null ? void 0 : e.quizzes) ? e.quizzes : []).flatMap((o) => iC(o).map((i) => {
    var a;
    return {
      ...i,
      quizTitle: (o == null ? void 0 : o.title) || ((a = o == null ? void 0 : o.quiz) == null ? void 0 : a.title) || "Saved quiz"
    };
  })).slice(0, 12);
}
function sC(e, t) {
  return (e == null ? void 0 : e.question) || (e == null ? void 0 : e.prompt) || (e == null ? void 0 : e.stem) || `Question ${t + 1}`;
}
function sf(e) {
  return String((e == null ? void 0 : e.type) || "").toLowerCase();
}
function aC(e) {
  return String((e == null ? void 0 : e.label) || (e == null ? void 0 : e.text) || e).trim();
}
function La(e) {
  const t = (e == null ? void 0 : e.choices) || (e == null ? void 0 : e.options) || (e == null ? void 0 : e.answers);
  return Array.isArray(t) && t.length ? t.map(aC).filter(Boolean) : sf(e) === "true_false" ? ["True", "False"] : [];
}
function id(e) {
  const t = (e == null ? void 0 : e.correctOptionIndexes) || (e == null ? void 0 : e.correct_option_indexes) || (e == null ? void 0 : e.correctIndexes);
  return Array.isArray(t) ? t.map((o) => Number(o)).filter(Number.isInteger) : [];
}
function lC(e, t) {
  const o = Array.isArray(e) ? [...e].map(Number).filter(Number.isInteger).sort((a, f) => a - f) : [], i = Array.isArray(t) ? [...t].map(Number).filter(Number.isInteger).sort((a, f) => a - f) : [];
  return o.length === i.length && o.every((a, f) => a === i[f]);
}
function br(e) {
  return String(e || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function Va(e, t) {
  if (Number.isInteger(t)) return t;
  const o = Number(t);
  if (typeof t != "string" && Number.isInteger(o)) return o;
  const i = La(e), a = br(t);
  return i.findIndex((f) => br(f) === a);
}
function z0(e, t) {
  if (typeof t == "boolean") return t;
  if (t === 0) return !0;
  if (t === 1) return !1;
  const o = La(e), i = br(t);
  return i === "true" ? !0 : i === "false" ? !1 : br(o[0]) === i ? !0 : br(o[1]) === i ? !1 : null;
}
function uC(e, t, o) {
  const i = sf(e);
  if (i === "multiple_choice") {
    const a = Va(e, t);
    if (!Number.isInteger(a) || a < 0) return [];
    const f = Array.isArray(o) ? [...o] : [];
    return f.includes(a) ? f.filter((d) => d !== a) : [...f, a].sort((d, p) => d - p);
  }
  if (i === "single_choice") {
    const a = Va(e, t);
    return Number.isInteger(a) && a >= 0 ? a : "";
  }
  if (i === "true_false") {
    const a = z0(e, t);
    return a === null ? "" : a;
  }
  return String(t || "");
}
function B0(e) {
  const t = (e == null ? void 0 : e.correctAnswer) ?? (e == null ? void 0 : e.correct_answer) ?? (e == null ? void 0 : e.answer) ?? (e == null ? void 0 : e.correct), o = id(e);
  if (o.length) {
    const i = La(e);
    return o.map((a) => i[a] || "").filter(Boolean).join(", ");
  }
  if (typeof (e == null ? void 0 : e.correctBoolean) == "boolean" || typeof (e == null ? void 0 : e.correct_boolean) == "boolean") {
    const i = La(e);
    return (typeof e.correctBoolean == "boolean" ? e.correctBoolean : e.correct_boolean) ? i[0] || "True" : i[1] || "False";
  }
  return e != null && e.expectedAnswer || e != null && e.expected_answer ? String(e.expectedAnswer || e.expected_answer || "").trim() : Array.isArray(t) ? t.map((i) => String(i)).join(", ") : String(t || "").trim();
}
function cC(e, t) {
  const o = sf(e);
  if (o === "single_choice") {
    const a = id(e)[0], f = Va(e, t);
    return Number.isInteger(a) ? f === a : null;
  }
  if (o === "multiple_choice") {
    const a = id(e), f = Array.isArray(t) ? t : [Va(e, t)].filter(Number.isInteger);
    return a.length ? lC(f, a) : null;
  }
  if (o === "true_false") {
    const a = typeof (e == null ? void 0 : e.correctBoolean) == "boolean" ? e.correctBoolean : e == null ? void 0 : e.correct_boolean, f = z0(e, t);
    return typeof a == "boolean" && f !== null ? f === a : null;
  }
  const i = B0(e);
  return i ? br(t) === br(i) : null;
}
function $0(e, t, o) {
  var p;
  const i = String(e || "").trim(), a = String((t == null ? void 0 : t.summaryText) || (t == null ? void 0 : t.aiSummary) || "").slice(0, 420), f = ((p = t == null ? void 0 : t.studyHeadings) == null ? void 0 : p[0]) || (t == null ? void 0 : t.materialTitle) || "this material", d = o || `Study ${(t == null ? void 0 : t.materialTitle) || "this material"}`;
  return i ? [
    `For ${f}: ${a || "use the selected material as your main source."}`,
    `Your current goal is: ${d}.`,
    "Try explaining the idea in one sentence, then test yourself with one example before moving on."
  ].join(" ") : "";
}
function dC(e = "") {
  const t = String(e || "");
  return Zn.filter((o) => !o.galleryOnly || o.id === t);
}
function af(e) {
  const o = Fi(e) || Yn(e);
  if (!(o != null && o.id)) return null;
  const i = Jb(o.motionProfile || o.id), a = String(o.musicType || "Deep Focus"), f = String(o.ambientSound || "Nature"), d = Ii({ musicType: a, ambientSound: f });
  return {
    scene: o,
    motion: i,
    audio: d,
    musicType: a,
    ambientSound: f
  };
}
function fC(e, t = {}) {
  const o = Fi(e);
  if (!o) return null;
  const i = af(o.id);
  return i ? {
    selectedScene: i.scene.id,
    musicType: i.musicType || t.musicType,
    ambientSound: i.ambientSound || t.ambientSound
  } : null;
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
function mC({ profile: e, paused: t = !1, reducedMotion: o = !1 }) {
  var a;
  if (o || !((a = e == null ? void 0 : e.layers) != null && a.length)) return null;
  const i = e.layers.filter((f) => f.kind !== "camera");
  return /* @__PURE__ */ w.jsx("div", { className: `scene-motion-layer ${t ? "is-paused" : ""}`.trim(), "aria-hidden": "true", children: i.map((f, d) => /* @__PURE__ */ w.jsx(
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
function hC({ scene: e }) {
  var x;
  const [t, o] = b.useState(e), [i, a] = b.useState(!1), [f, d] = b.useState(!1), [p, m] = b.useState(() => {
    var _;
    return ((_ = globalThis.document) == null ? void 0 : _.visibilityState) === "hidden";
  }), [y, v] = b.useState(() => {
    var _, A;
    return ((A = (_ = globalThis.matchMedia) == null ? void 0 : _.call(globalThis, "(prefers-reduced-motion: reduce)")) == null ? void 0 : A.matches) || !1;
  });
  b.useEffect(() => {
    a(!1), d(!1);
  }, [t == null ? void 0 : t.id]), b.useEffect(() => {
    if (!(e != null && e.id) || e.id === (t == null ? void 0 : t.id)) return;
    let _ = !1;
    const A = new Image();
    return A.onload = () => {
      _ || o(e);
    }, A.onerror = () => {
      _ || d(!0);
    }, A.src = e.image, () => {
      _ = !0, A.onload = null, A.onerror = null;
    };
  }, [t == null ? void 0 : t.id, e]), b.useEffect(() => {
    var A, T;
    const _ = () => {
      var C;
      return m(((C = globalThis.document) == null ? void 0 : C.visibilityState) === "hidden");
    };
    return (T = (A = globalThis.document) == null ? void 0 : A.addEventListener) == null || T.call(A, "visibilitychange", _), () => {
      var C, E;
      return (E = (C = globalThis.document) == null ? void 0 : C.removeEventListener) == null ? void 0 : E.call(C, "visibilitychange", _);
    };
  }, []), b.useEffect(() => {
    var T, C;
    const _ = (T = globalThis.matchMedia) == null ? void 0 : T.call(globalThis, "(prefers-reduced-motion: reduce)");
    if (!_) return;
    const A = (E) => v(!!E.matches);
    return v(!!_.matches), (C = _.addEventListener) == null || C.call(_, "change", A), () => {
      var E;
      return (E = _.removeEventListener) == null ? void 0 : E.call(_, "change", A);
    };
  }, []);
  const l = af(t == null ? void 0 : t.id), c = l == null ? void 0 : l.motion, S = (x = c == null ? void 0 : c.layers) == null ? void 0 : x.find((_) => _.kind === "camera");
  return /* @__PURE__ */ w.jsxs("div", { className: "focus-background-wrap", "aria-hidden": "true", children: [
    /* @__PURE__ */ w.jsx(pC, {}),
    /* @__PURE__ */ w.jsx(Ya, { mode: "sync", children: /* @__PURE__ */ w.jsxs(
      vn.div,
      {
        className: `focus-background ${i && !y ? "has-scene-motion" : ""} ${p ? "is-motion-paused" : ""}`.trim(),
        style: { backgroundImage: f ? "none" : void 0 },
        initial: { opacity: 0, scale: 1.035 },
        animate: { opacity: 1, scale: 1.02 },
        exit: { opacity: 0, scale: 1.015 },
        transition: { duration: 0.8, ease: "easeOut" },
        children: [
          t != null && t.image ? /* @__PURE__ */ w.jsx(
            "img",
            {
              className: `focus-background-media focus-background-poster ${i ? "is-ready" : ""}`.trim(),
              src: t.image,
              alt: "",
              style: { "--scene-camera-duration": `${(S == null ? void 0 : S.duration) || 36}s`, "--scene-camera-intensity": (S == null ? void 0 : S.intensity) || 0.2 },
              onLoad: () => a(!0),
              onError: () => d(!0)
            }
          ) : null,
          t != null && t.video ? /* @__PURE__ */ w.jsx(
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
          /* @__PURE__ */ w.jsx(mC, { profile: c, paused: p, reducedMotion: y })
        ]
      },
      (t == null ? void 0 : t.id) || "focus-background"
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
  (t, o, i) => i ? i.toUpperCase() : o.toLowerCase()
), sg = (e) => {
  const t = gC(e);
  return t.charAt(0).toUpperCase() + t.slice(1);
}, U0 = (...e) => e.filter((t, o, i) => !!t && t.trim() !== "" && i.indexOf(t) === o).join(" ").trim(), vC = (e) => {
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
const wC = b.forwardRef(
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
      ...SC,
      width: t,
      height: t,
      stroke: e,
      strokeWidth: i ? Number(o) * 24 / Number(t) : o,
      className: U0("lucide", a),
      ...!f && !vC(p) && { "aria-hidden": "true" },
      ...p
    },
    [
      ...d.map(([y, v]) => b.createElement(y, v)),
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
const ke = (e, t) => {
  const o = b.forwardRef(
    ({ className: i, ...a }, f) => b.createElement(wC, {
      ref: f,
      iconNode: t,
      className: U0(
        `lucide-${yC(sg(e))}`,
        `lucide-${e}`,
        i
      ),
      ...a
    })
  );
  return o.displayName = sg(e), o;
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
], _C = ke("arrow-left", xC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const TC = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
], kC = ke("arrow-right", TC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const AC = [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]], Za = ke("check", AC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const bC = [["path", { d: "m15 18-6-6 6-6", key: "1wnfg3" }]], CC = ke("chevron-left", bC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const PC = [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]], EC = ke("chevron-right", PC);
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
], RC = ke("coffee", MC);
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
], DC = ke("dices", NC);
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
], IC = ke("door-open", jC);
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
], za = ke("footprints", FC);
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
], LC = ke("history", OC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const VC = [
  ["path", { d: "m14 10 7-7", key: "oa77jy" }],
  ["path", { d: "M20 10h-6V4", key: "mjg0md" }],
  ["path", { d: "m3 21 7-7", key: "tjx5ai" }],
  ["path", { d: "M4 14h6v6", key: "rmj7iw" }]
], zC = ke("minimize-2", VC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const BC = [
  ["circle", { cx: "8", cy: "18", r: "4", key: "1fc0mg" }],
  ["path", { d: "M12 18V2l7 4", key: "g04rme" }]
], $C = ke("music-2", BC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const UC = [
  ["rect", { x: "14", y: "4", width: "4", height: "16", rx: "1", key: "zuxfzm" }],
  ["rect", { x: "6", y: "4", width: "4", height: "16", rx: "1", key: "1okwgv" }]
], sd = ke("pause", UC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const HC = [
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
], WC = ke("piano", HC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const GC = [["polygon", { points: "6 3 20 12 6 21 6 3", key: "1oa8hb" }]], H0 = ke("play", GC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const KC = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
], YC = ke("plus", KC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const QC = [
  ["path", { d: "M4.9 19.1C1 15.2 1 8.8 4.9 4.9", key: "1vaf9d" }],
  ["path", { d: "M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5", key: "u1ii0m" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }],
  ["path", { d: "M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5", key: "1j5fej" }],
  ["path", { d: "M19.1 4.9C23 8.8 23 15.1 19.1 19", key: "10b0cb" }]
], XC = ke("radio", QC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ZC = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
], W0 = ke("rotate-ccw", ZC);
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
      d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
      key: "1c8476"
    }
  ],
  ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7", key: "1ydtos" }],
  ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7", key: "t51u73" }]
], G0 = ke("save", JC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const qC = [
  ["path", { d: "M14 17H5", key: "gfn3mx" }],
  ["path", { d: "M19 7h-9", key: "6i9tg" }],
  ["circle", { cx: "17", cy: "17", r: "3", key: "18b49y" }],
  ["circle", { cx: "7", cy: "7", r: "3", key: "dfmy0x" }]
], K0 = ke("settings-2", qC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const eP = [
  ["path", { d: "m18 14 4 4-4 4", key: "10pe0f" }],
  ["path", { d: "m18 2 4 4-4 4", key: "pucp1d" }],
  ["path", { d: "M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22", key: "1ailkh" }],
  ["path", { d: "M2 6h1.972a4 4 0 0 1 3.6 2.2", key: "km57vx" }],
  ["path", { d: "M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45", key: "os18l9" }]
], tP = ke("shuffle", eP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const nP = [
  ["polygon", { points: "5 4 15 12 5 20 5 4", key: "16p6eg" }],
  ["line", { x1: "19", x2: "19", y1: "5", y2: "19", key: "futhcm" }]
], Y0 = ke("skip-forward", nP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const rP = [
  ["line", { x1: "21", x2: "14", y1: "4", y2: "4", key: "obuewd" }],
  ["line", { x1: "10", x2: "3", y1: "4", y2: "4", key: "1q6298" }],
  ["line", { x1: "21", x2: "12", y1: "12", y2: "12", key: "1iu8h1" }],
  ["line", { x1: "8", x2: "3", y1: "12", y2: "12", key: "ntss68" }],
  ["line", { x1: "21", x2: "16", y1: "20", y2: "20", key: "14d8ph" }],
  ["line", { x1: "12", x2: "3", y1: "20", y2: "20", key: "m0wm8r" }],
  ["line", { x1: "14", x2: "14", y1: "2", y2: "6", key: "14e1ph" }],
  ["line", { x1: "8", x2: "8", y1: "10", y2: "14", key: "1i6ji0" }],
  ["line", { x1: "16", x2: "16", y1: "18", y2: "22", key: "1lctlv" }]
], oP = ke("sliders-horizontal", rP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const iP = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["circle", { cx: "12", cy: "12", r: "6", key: "1vlfrh" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }]
], sP = ke("target", iP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const aP = [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
], lP = ke("trash-2", aP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const uP = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744", key: "16gr8j" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }]
], Ba = ke("users", uP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const cP = [
  [
    "path",
    {
      d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
      key: "uqj9uw"
    }
  ],
  ["path", { d: "M16 9a5 5 0 0 1 0 6", key: "1q6k2b" }],
  ["path", { d: "M19.364 18.364a9 9 0 0 0 0-12.728", key: "ijwkga" }]
], Ja = ke("volume-2", cP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const dP = [
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
], lf = ke("waves", dP);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const fP = [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
], Q0 = ke("x", fP), ag = (e) => {
  let t;
  const o = /* @__PURE__ */ new Set(), i = (y, v) => {
    const l = typeof y == "function" ? y(t) : y;
    if (!Object.is(l, t)) {
      const c = t;
      t = v ?? (typeof l != "object" || l === null) ? l : Object.assign({}, t, l), o.forEach((S) => S(t, c));
    }
  }, a = () => t, p = { setState: i, getState: a, getInitialState: () => m, subscribe: (y) => (o.add(y), () => o.delete(y)) }, m = t = e(i, a, p);
  return p;
}, pP = ((e) => e ? ag(e) : ag), mP = (e) => e;
function hP(e, t = mP) {
  const o = gn.useSyncExternalStore(
    e.subscribe,
    gn.useCallback(() => t(e.getState()), [e, t]),
    gn.useCallback(() => t(e.getInitialState()), [e, t])
  );
  return gn.useDebugValue(o), o;
}
const lg = (e) => {
  const t = pP(e), o = (i) => hP(t, i);
  return Object.assign(o, t), o;
}, yP = ((e) => e ? lg(e) : lg), gP = /* @__PURE__ */ new Set(["pending", "active", "done"]);
function X0() {
  return `topic-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function $a(e = {}, t = "pending") {
  const o = String(e.title || e.name || "").trim(), i = String(e.description || e.detail || e.notes || "").trim(), a = gP.has(e.status) ? e.status : t;
  return {
    id: String(e.id || "").trim() || X0(),
    title: o || "Untitled topic",
    description: i,
    status: a
  };
}
function gr(e, t = "Deep work block") {
  const o = Array.isArray(e) ? e.map((d) => $a(d)).filter(Boolean) : [];
  if (!o.length) {
    const d = $a({
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
function uf(e = [], t = "") {
  const o = Array.isArray(e) ? e : [];
  return o.find((i) => i.id === t) || o.find((i) => i.status === "active") || o.find((i) => i.status !== "done") || o[0] || null;
}
function yc(e = [], t = "") {
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
function Z0(e) {
  const t = af(e);
  return t ? {
    scene: t.scene,
    motion: t.motion,
    title: t.scene.name,
    kicker: t.scene.kicker || "",
    description: t.scene.description || "",
    image: t.scene.image || "",
    musicType: t.musicType,
    ambientSound: t.ambientSound,
    audio: t.audio
  } : {
    scene: null,
    motion: null,
    title: "Focus Room",
    kicker: "",
    description: "",
    image: "",
    musicType: "Deep Focus",
    ambientSound: "Nature"
  };
}
function vP(e, t = {}) {
  return fC(e, t);
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
function SP() {
  return Zn[0] || Yn(ed);
}
function ad(e) {
  const t = String(e || "");
  if (!t) return null;
  const i = V0(R0()).materials[t];
  return i && typeof i == "object" ? i : null;
}
function ot(e) {
  var i;
  const t = String(e.selectedMaterialId || ((i = e.selectedMaterial) == null ? void 0 : i.materialId) || "");
  if (!t) return;
  const o = V0(R0());
  o.materials[t] = {
    materialId: t,
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
    studyPlan: L0(e.studyPlan),
    completedTasks: Array.isArray(e.completedTasks) ? e.completedTasks.filter(Boolean) : [],
    workspaceNotes: String(e.workspaceNotes || ""),
    workspaceUpdatedAt: e.workspaceUpdatedAt || "",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }, Qb(o);
}
function wP(e) {
  return Array.isArray(e == null ? void 0 : e.completedTasks) ? e.completedTasks.map((t) => String(t || "").trim()).filter(Boolean) : [];
}
function ld(e = {}) {
  return {
    sectionTitle: String(e.sectionTitle || "").trim(),
    excerpt: String(e.excerpt || "").trim().slice(0, 1800)
  };
}
function J0(e = null) {
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
  const t = Number(e.pomodoroDurationSeconds);
  return Number.isFinite(t) && t > 0 ? rn(t, Ci(e.pomodoroDuration)) : Ci(e.pomodoroDuration);
}
function Hn(e = {}) {
  if (e.timerMode === "countup") return 0;
  const t = Number(e.timerDurationSeconds);
  return Number.isFinite(t) && t > 0 ? t : Sr(e);
}
function Ua(e = {}, t = at()) {
  const o = Math.max(0, Number(e.elapsedSeconds) || 0);
  if (Ht(e) !== "running") return o;
  const i = Number(e.timerAnchorAtMs);
  return !Number.isFinite(i) || i <= 0 ? o : Math.max(o, Math.floor(Math.max(0, t - i) / 1e3));
}
function Mt(e, t = at()) {
  const o = go(e);
  return {
    timerState: o,
    timerPhase: o,
    status: o,
    timerStatus: nf(o),
    timerUpdatedAtMs: t
  };
}
function xP(e = {}) {
  const t = Ht(e);
  return {
    timerState: t,
    timerPhase: t,
    status: t,
    timerStatus: nf(t),
    timerMode: e.timerMode === "countup" ? "countup" : "countdown",
    timerAnchorAtMs: Number.isFinite(Number(e.timerAnchorAtMs)) ? Number(e.timerAnchorAtMs) : null,
    timerPausedAtMs: Number.isFinite(Number(e.timerPausedAtMs)) ? Number(e.timerPausedAtMs) : null,
    timerUpdatedAtMs: Number.isFinite(Number(e.timerUpdatedAtMs)) ? Number(e.timerUpdatedAtMs) : null,
    timerRestoredAtMs: Number.isFinite(Number(e.timerRestoredAtMs)) ? Number(e.timerRestoredAtMs) : null,
    timerDurationSeconds: Hn(e),
    pomodoroDuration: e.pomodoroDuration,
    pomodoroDurationSeconds: Sr(e),
    elapsedSeconds: Math.max(0, Number(e.elapsedSeconds) || 0),
    startedAt: e.startedAt || null,
    currentSession: e.currentSession || null,
    view: e.view
  };
}
function zn(e) {
  var o;
  const t = String(e.selectedMaterialId || ((o = e.selectedMaterial) == null ? void 0 : o.materialId) || "");
  return !t || e.view !== "session" ? !1 : rf(t, xP(e));
}
function ug(e, t = at()) {
  const o = Ua(e, t), i = Hn(e), a = e.timerMode !== "countup" && i > 0 && o >= i, f = a ? "completed" : Ht(e);
  return {
    ...Mt(f, t),
    elapsedSeconds: a ? i : o,
    timerAnchorAtMs: f === "running" ? e.timerAnchorAtMs : null,
    timerPausedAtMs: f === "running" ? null : e.timerPausedAtMs || t,
    audioPlaying: f === "running" ? e.audioPlaying : !1
  };
}
function _P(e, t = {}) {
  const o = Yn(t.selectedScene), i = ad(e == null ? void 0 : e.materialId), a = Fi(i == null ? void 0 : i.selectedScene) ? i.selectedScene : o.id, f = Yn(a), d = String((i == null ? void 0 : i.musicType) || f.musicType || "Deep Focus"), p = String((i == null ? void 0 : i.ambientSound) || f.ambientSound || "Nature"), m = Tt(i == null ? void 0 : i.musicVolume, t.musicVolume ?? 60), y = Tt(i == null ? void 0 : i.ambientVolume, t.ambientVolume ?? 50), v = _r(i == null ? void 0 : i.durationMinutes, t.pomodoroDuration ?? po), l = rn(
    i == null ? void 0 : i.durationSeconds,
    t.pomodoroDurationSeconds ?? v * 60
  ), c = String((i == null ? void 0 : i.studyGoal) || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`), S = L0(i == null ? void 0 : i.studyPlan), x = S.length ? S : nd(e, c, v), _ = wP(i), A = String((i == null ? void 0 : i.workspaceNotes) || ""), T = (i == null ? void 0 : i.workspaceUpdatedAt) || (i == null ? void 0 : i.updatedAt) || "";
  return {
    selectedScene: a,
    musicType: d,
    ambientSound: p,
    musicVolume: m,
    ambientVolume: y,
    audioChannels: { ...xi, ...(i == null ? void 0 : i.audioChannels) || t.audioChannels || {} },
    pomodoroDuration: v,
    pomodoroDurationSeconds: l,
    studyGoal: c,
    studyPlan: x,
    completedTasks: _,
    workspaceNotes: A,
    workspaceUpdatedAt: T
  };
}
function cg(e) {
  const t = I0(e);
  if (!t || typeof t != "object") return null;
  const o = Ht(t), i = at(), a = Number(t.timerAnchorAtMs), f = Date.parse(t.startedAt || ""), d = Number.isFinite(f) ? f : NaN, p = o === "running" ? Ua({
    ...t,
    timerState: "running",
    timerAnchorAtMs: Number.isFinite(a) && a > 0 ? a : d
  }, i) : Math.max(0, Number(t.elapsedSeconds) || 0), m = Hn(t), y = o === "running" ? m > 0 && p >= m ? "completed" : "paused" : o, v = o === "running";
  return {
    route: t.view === "session" ? "session" : "setup",
    view: t.view === "session" ? "session" : "setup",
    ...Mt(v ? "restoring" : y, i),
    timerRestoreTarget: v ? y : null,
    timerMode: t.timerMode === "countup" ? "countup" : "countdown",
    timerAnchorAtMs: null,
    timerPausedAtMs: v ? null : Number(t.timerPausedAtMs) || null,
    timerRestoredAtMs: v ? null : i,
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
    chatMessages: hi(t.chatMessages),
    chatPending: !1,
    chatError: "",
    panelTab: td.has(t.panelTab) ? t.panelTab : "materials",
    workspaceNotes: String(t.workspaceNotes || ""),
    workspaceUpdatedAt: t.workspaceUpdatedAt || t.updatedAt || "",
    activeNoteSection: String(t.activeNoteSection || ""),
    activeSourceHighlight: J0(t.activeSourceHighlight),
    assistantContext: ld(t.assistantContext),
    audioPlaying: !1
  };
}
function na() {
  return {
    completedTasks: [],
    flashcardIndex: 0,
    flashcardSide: "front",
    flashcardProgress: {},
    quizAnswers: {},
    quizChecked: {}
  };
}
function TP(e) {
  return Object.values(e.flashcardProgress || {}).filter((t) => t && t.difficulty).length;
}
function kP(e) {
  const t = Object.values(e.quizChecked || {}).filter((i) => i && i.hasKnownAnswer);
  if (!t.length) return null;
  const o = t.filter((i) => i.correct).length;
  return Math.round(o / t.length * 100);
}
function AP(e) {
  const t = od(e.selectedMaterial);
  return Object.entries(e.quizChecked || {}).filter(([, o]) => o && o.hasKnownAnswer && !o.correct).map(([o]) => sC(t[Number(o)], Number(o))).filter(Boolean);
}
async function bP(e, t, o, i = {}) {
  var d, p;
  if (!globalThis.apiClient || typeof globalThis.apiClient.fetch != "function")
    return {
      answer: $0(e, o, K.getState().studyGoal),
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
      chat_history: t
    })
  });
  let f = null;
  try {
    f = await a.json();
  } catch {
    throw new Error("Backend returned non-JSON response.");
  }
  if (!a.ok || f != null && f.error)
    throw new Error((f == null ? void 0 : f.error) || "AI request failed.");
  return {
    answer: (f == null ? void 0 : f.answer) || "No answer returned.",
    usedExternalResearch: !!(f != null && f.used_external_research),
    researchSources: Array.isArray(f == null ? void 0 : f.research_sources) ? f.research_sources : []
  };
}
const K = yP((e, t) => {
  const o = SP(), i = ad("focus-room"), a = Fi(i == null ? void 0 : i.selectedScene) ? Yn(i.selectedScene) : o, f = _r(i == null ? void 0 : i.durationMinutes, po), d = rn(
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
      const p = t(), m = I0("focus-room"), y = cg("focus-room"), v = Ht(m || {});
      if (!!((y == null ? void 0 : y.view) === "session" && y.currentSession && v === "running")) {
        const A = Yn((m == null ? void 0 : m.selectedScene) || p.selectedScene);
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
      xa("focus-room");
      const c = ad("focus-room"), S = Yn((c == null ? void 0 : c.selectedScene) || p.selectedScene), x = _r(c == null ? void 0 : c.durationMinutes, p.pomodoroDuration || po), _ = rn(
        c == null ? void 0 : c.durationSeconds,
        p.pomodoroDurationSeconds || Ci(x)
      );
      e({
        route: "setup",
        view: "setup",
        selectedMaterialId: "focus-room",
        selectedMaterial: null,
        selectedScene: S.id,
        musicType: String((c == null ? void 0 : c.musicType) || S.musicType || p.musicType || "Deep Focus"),
        ambientSound: String((c == null ? void 0 : c.ambientSound) || S.ambientSound || p.ambientSound || "Nature"),
        musicVolume: Tt(c == null ? void 0 : c.musicVolume, p.musicVolume ?? 60),
        ambientVolume: Tt(c == null ? void 0 : c.ambientVolume, p.ambientVolume ?? 50),
        audioChannels: { ...xi, ...(c == null ? void 0 : c.audioChannels) || p.audioChannels || {} },
        pomodoroDuration: x,
        pomodoroDurationSeconds: _,
        timerDurationSeconds: _,
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
      ot(p), xa("focus-room"), e({
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
      const v = t(), l = !!m, c = l ? m.materialId : String(p.materialId || "");
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
      const S = v.selectedMaterialId === c, x = S && y ? null : cg(c), _ = S && y ? {} : _P(m, v), A = S && y ? {} : {
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
          pomodoroDuration: _.pomodoroDuration || po,
          pomodoroDurationSeconds: _.pomodoroDurationSeconds
        }),
        elapsedSeconds: 0,
        startedAt: null,
        currentSession: null,
        ...na(),
        chatMessages: [],
        chatPending: !1,
        chatError: "",
        activeNoteSection: "",
        activeSourceHighlight: null,
        assistantContext: { sectionTitle: "", excerpt: "" }
      }, T = S && y ? v.view === "session" ? "session" : "setup" : (x == null ? void 0 : x.view) === "session" ? "session" : "setup";
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
        const C = x.timerRestoreTarget || "paused";
        Promise.resolve().then(() => {
          const E = t();
          if (E.selectedMaterialId !== c || E.timerState !== "restoring") return;
          const N = at(), O = Hn(E), W = O > 0 ? Math.min(O, Math.max(0, Number(E.elapsedSeconds) || 0)) : Math.max(0, Number(E.elapsedSeconds) || 0), H = {
            ...Mt(C, N),
            timerRestoreTarget: null,
            timerAnchorAtMs: null,
            timerPausedAtMs: C === "paused" ? N : null,
            timerRestoredAtMs: N,
            elapsedSeconds: W,
            audioPlaying: !1
          };
          e(H), zn({ ...E, ...H });
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
      e((m) => {
        const y = vP(p, m);
        if (!y) return {};
        const v = { ...m, ...y };
        return ot(v), y;
      });
    },
    setPomodoroDurationSeconds(p) {
      e((m) => {
        const y = rn(p, m.pomodoroDurationSeconds), v = Math.max(1, Math.round(y / 60)), l = m.selectedMaterial ? nd(m.selectedMaterial, m.studyGoal, v) : [], c = {
          pomodoroDuration: v,
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
        var S;
        const y = String(p ?? ""), v = m.selectedMaterial ? nd(m.selectedMaterial, y, m.pomodoroDuration) : [], l = Array.isArray(m.focusTopics) ? m.focusTopics.map((x) => x.id === m.activeTopicId || x.status === "active" ? { ...x, title: y || x.title, status: "active" } : x) : gr([], y).focusTopics, c = {
          studyGoal: y,
          studyPlan: v,
          focusTopics: l,
          activeTopicId: m.activeTopicId || ((S = l.find((x) => x.status === "active")) == null ? void 0 : S.id) || ""
        };
        return ot({ ...m, ...c }), c;
      });
    },
    addFocusTopic(p = {}) {
      e((m) => {
        const y = (m.focusTopics || []).some((S) => S.status === "active"), v = $a({
          id: X0(),
          title: p.title || `Topic ${(m.focusTopics || []).length + 1}`,
          description: p.description || "",
          status: y ? "pending" : "active"
        }, y ? "pending" : "active"), c = {
          focusTopics: [...m.focusTopics || [], v],
          activeTopicId: y ? m.activeTopicId : v.id,
          studyGoal: y ? m.studyGoal : v.title
        };
        return ot({ ...m, ...c }), c;
      });
    },
    updateFocusTopic(p, m = {}) {
      e((y) => {
        const v = (y.focusTopics || []).map((S) => S.id !== p ? S : $a({
          ...S,
          ...m,
          id: S.id,
          status: S.status
        }, S.status)), l = uf(v, y.activeTopicId), c = {
          focusTopics: v,
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
        const y = String(p || m.activeTopicId || ""), v = (m.focusTopics || []).map((c) => c.id === y ? { ...c, status: "done" } : c), l = yc(v);
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
        let v = {};
        if (p === "musicVolume" && (v = { musicVolume: Tt(m, y.musicVolume) }), p === "ambientVolume" && (v = { ambientVolume: Tt(m, y.ambientVolume) }), p === "musicType" && (v = { musicType: String(m || y.musicType) }), p === "ambientSound" && (v = { ambientSound: String(m || y.ambientSound) }), String(p).startsWith("audioChannel:")) {
          const c = String(p).slice(13);
          v = { audioChannels: { ...y.audioChannels, [c]: Tt(m, ((l = y.audioChannels) == null ? void 0 : l[c]) ?? 0) } };
        }
        return ot({ ...y, ...v }), v;
      });
    },
    applyAudioPreset(p) {
      e((m) => {
        const y = $b(p), v = {
          musicType: y.musicType,
          ambientSound: y.ambientSound
        };
        return ot({ ...m, ...v }), v;
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
      const y = J0(p);
      e({
        activeSourceHighlight: y,
        activeNoteSection: (y == null ? void 0 : y.sectionTitle) || t().activeNoteSection || "",
        assistantContext: y ? ld({
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
        panelTab: td.has(m) ? m : "materials",
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
        ...na(),
        chatMessages: [],
        chatPending: !1,
        chatError: ""
      });
    },
    startTimer() {
      const p = t();
      (!p.currentSession || p.view !== "session") && t().startSession();
      const m = t(), y = at(), v = Ht(m);
      if (v === "running") {
        t().tickTimer();
        return;
      }
      const l = Hn(m), c = v === "completed" || v === "break" || l > 0 && m.elapsedSeconds >= l, S = c ? 0 : Math.max(0, Number(m.elapsedSeconds) || 0), x = {
        view: "session",
        route: "session",
        ...Mt("running", y),
        audioPlaying: p.audioPlaying,
        summaryRecord: null,
        elapsedSeconds: S,
        startedAt: !m.startedAt || c ? new Date(y).toISOString() : m.startedAt,
        timerAnchorAtMs: y - S * 1e3,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        timerDurationSeconds: l,
        ...c ? na() : {}
      };
      e(x), zn({ ...m, ...x });
    },
    pauseTimer({ pauseAudio: p = !0 } = {}) {
      const m = t(), y = at();
      if (Ht(m) !== "running") {
        p && m.audioPlaying && e({ audioPlaying: !1 });
        return;
      }
      const v = ug(m, y), l = {
        ...v,
        ...Mt(v.timerState === "completed" ? "completed" : "paused", y),
        timerAnchorAtMs: null,
        timerPausedAtMs: y,
        audioPlaying: p ? !1 : m.audioPlaying
      };
      e(l), zn({ ...m, ...l });
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
        ...na()
      };
      e(m), zn({ ...t(), ...m });
    },
    skipTimer() {
      const p = t(), m = at(), y = Hn(p), v = {
        ...Mt("completed", m),
        elapsedSeconds: y || Math.max(0, Number(p.elapsedSeconds) || 0),
        audioPlaying: !1,
        startedAt: p.startedAt || new Date(m).toISOString(),
        timerAnchorAtMs: null,
        timerPausedAtMs: m,
        timerDurationSeconds: y
      };
      e(v), zn({ ...p, ...v });
    },
    tickTimer() {
      const p = t();
      if (p.view !== "session" || Ht(p) !== "running") return;
      const m = at(), y = Hn(p), v = y ? Math.min(y, Ua(p, m)) : Ua(p, m), l = y > 0 && v >= y ? "completed" : "running", c = {
        ...Mt(l, m),
        elapsedSeconds: v,
        timerAnchorAtMs: l === "running" ? p.timerAnchorAtMs : null,
        timerPausedAtMs: l === "running" ? null : m,
        timerDurationSeconds: y,
        audioPlaying: l === "running" ? p.audioPlaying : !1
      };
      v === p.elapsedSeconds && l === Ht(p) || (e(c), zn({ ...p, ...c }));
    },
    setTimerMode(p = "countdown") {
      const m = p === "countup" ? "countup" : "countdown", y = {
        timerMode: m,
        timerDurationSeconds: m === "countup" ? 0 : Sr(t())
      };
      e(y), zn({ ...t(), ...y });
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
      e(m), zn({ ...t(), ...m });
    },
    getTimerState() {
      return Ht(t());
    },
    endSession() {
      var x;
      const p = t(), m = at(), y = new Date(m).toISOString(), v = Ht(p) === "running" ? ug(p, m) : p, l = Hn(v), c = l ? Math.min(l, v.elapsedSeconds) : v.elapsedSeconds, S = Zb({
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
      xa("focus-room"), e({
        summaryRecord: S,
        sessionHistory: qc(),
        ...Mt("completed", m),
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
        const v = String(y.task || ""), l = m.completedTasks.includes(v) ? m.completedTasks.filter((c) => c !== v) : [...m.completedTasks, v];
        return ot({ ...m, completedTasks: l }), { completedTasks: l };
      });
    },
    updatePlanTask(p, m = null, y = null) {
      e((v) => {
        const l = Number(p), c = v.studyPlan[l];
        if (!c) return {};
        const S = String(c.task || ""), x = y == null ? S : String(y || "").trim(), _ = m == null ? c.minutes : Ar(m, c.minutes, 1, Xa), A = v.studyPlan.map((E, N) => N === l ? { minutes: _, task: x || S } : E);
        let T = v.completedTasks;
        S && S !== A[l].task && T.includes(S) && (T = T.filter((E) => E !== S).concat(A[l].task));
        const C = { studyPlan: A, completedTasks: T };
        return ot({ ...v, ...C }), C;
      });
    },
    setFlashcardIndex(p) {
      const m = ig(t().selectedMaterial);
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
      const m = t(), y = ig(m.selectedMaterial);
      if (!y.length) return;
      const v = Ar(m.flashcardIndex, 0, 0, y.length - 1), l = y[v], c = ["easy", "medium", "hard"].includes(String(p)) ? String(p) : "medium";
      e({
        flashcardProgress: {
          ...m.flashcardProgress,
          [oC(l, v)]: {
            difficulty: c,
            reviewedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        },
        flashcardSide: "front",
        flashcardIndex: v < y.length - 1 ? v + 1 : v
      });
    },
    answerQuizQuestion(p, m) {
      const y = Number(p), v = od(t().selectedMaterial)[y];
      if (!v) return;
      const l = String(y);
      e((c) => ({
        quizAnswers: {
          ...c.quizAnswers,
          [l]: uC(v, m, c.quizAnswers[l])
        }
      }));
    },
    checkQuizQuestion(p) {
      const m = od(t().selectedMaterial), y = Number(p), v = m[y];
      if (!v) return;
      const l = String(y), c = t(), S = Object.prototype.hasOwnProperty.call(c.quizAnswers, l) ? c.quizAnswers[l] : "", x = cC(v, S), _ = B0(v);
      e({
        quizChecked: {
          ...c.quizChecked,
          [l]: {
            answer: S,
            correct: x === null ? !1 : x,
            hasKnownAnswer: x !== null,
            explanation: v.explanation || v.rationale || (_ ? `Correct answer: ${_}` : ""),
            checkedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        }
      });
    },
    async askAssistant(p) {
      const m = String(p || "").trim();
      if (!m) return;
      const y = t(), v = y.selectedMaterial, l = hi(y.chatMessages).slice(-10).map((c) => ({
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
        const c = await bP(m, l, v, y.assistantContext);
        e((S) => ({
          chatMessages: hi([
            ...S.chatMessages,
            { role: "assistant", text: c.answer, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: c.offline ? "Using a local Focus Room reply because the AI tutor service is not connected." : ""
        }));
      } catch (c) {
        e((S) => ({
          chatMessages: hi([
            ...S.chatMessages,
            { role: "assistant", text: $0(m, v, t().studyGoal), createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: `AI tutor unavailable: ${c.message || "request failed"}`
        }));
      } finally {
        e({ chatPending: !1 });
      }
    },
    focusFlashcardsCompletedCount() {
      return TP(t());
    },
    focusQuizScore() {
      return kP(t());
    },
    focusQuizMistakes() {
      return AP(t());
    },
    formatFocusedTime() {
      return F0(t().elapsedSeconds);
    }
  };
});
function q0({ compact: e = !1, className: t = "" }) {
  const o = K((c) => c.focusTopics), i = K((c) => c.activeTopicId), a = K((c) => c.addFocusTopic), f = K((c) => c.updateFocusTopic), d = K((c) => c.finishFocusTopic), p = K((c) => c.removeFocusTopic), m = K((c) => c.activateFocusTopic), y = uf(o, i), v = (o || []).filter((c) => c.status !== "done").length, l = (o || []).filter((c) => c.status === "done").length;
  return /* @__PURE__ */ w.jsxs(
    "section",
    {
      className: `focus-topics-panel ${e ? "is-compact" : ""} ${t}`.trim(),
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
                /* @__PURE__ */ w.jsx(YC, { size: 14, "aria-hidden": "true" }),
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
          const x = c.id === (y == null ? void 0 : y.id), _ = c.status === "done";
          return /* @__PURE__ */ w.jsxs(
            "article",
            {
              className: `focus-topic-card ${x ? "is-active" : ""} ${_ ? "is-done" : ""}`.trim(),
              "data-focus-topic-id": c.id,
              "data-focus-topic-status": c.status,
              children: [
                /* @__PURE__ */ w.jsxs("div", { className: "focus-topic-card-top", children: [
                  /* @__PURE__ */ w.jsx("span", { className: "focus-topic-index", children: String(S + 1).padStart(2, "0") }),
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
                        onClick: () => d(c.id),
                        "aria-label": `Mark topic ${c.title} as done`,
                        "data-focus-topic-finish": c.id,
                        children: [
                          /* @__PURE__ */ w.jsx(Za, { size: 13, "aria-hidden": "true" }),
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
                        children: /* @__PURE__ */ w.jsx(lP, { size: 13, "aria-hidden": "true" })
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
                      onChange: (A) => f(c.id, { title: A.target.value }),
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
                      onChange: (A) => f(c.id, { description: A.target.value }),
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
function dg({ scene: e, active: t, onSelect: o, variant: i = "default" }) {
  return i === "gallery" ? /* @__PURE__ */ w.jsxs(
    vn.button,
    {
      className: `scene-card scene-card-gallery ${t ? "active" : ""}`.trim(),
      type: "button",
      "aria-pressed": t,
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
            children: t ? /* @__PURE__ */ w.jsx("span", { className: "scene-card-check", "aria-hidden": "true", children: "✓" }) : null
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
      className: `scene-card ${t ? "active" : ""}`.trim(),
      type: "button",
      "aria-pressed": t,
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
const ra = 8;
function cf({ variant: e = "default" }) {
  const t = K((y) => y.selectedScene), o = K((y) => y.selectScene), [i, a] = b.useState(0), f = b.useMemo(() => e === "gallery" ? Hb : dC(t), [t, e]), d = Math.max(1, Math.ceil(f.length / ra)), p = Math.min(i, d - 1), m = e === "gallery" ? f.slice(p * ra, p * ra + ra) : f;
  return e !== "gallery" ? /* @__PURE__ */ w.jsx("div", { className: "scene-selector", "aria-label": "Study scenes", children: m.map((y) => /* @__PURE__ */ w.jsx(
    dg,
    {
      scene: y,
      active: y.id === t,
      onSelect: o
    },
    y.id
  )) }) : /* @__PURE__ */ w.jsxs("div", { className: "scene-selector-wrap", "aria-label": "Study scenes", children: [
    /* @__PURE__ */ w.jsx("div", { className: "scene-selector scene-selector-gallery", children: m.map((y) => /* @__PURE__ */ w.jsx(
      dg,
      {
        scene: y,
        active: y.id === t,
        onSelect: o,
        variant: "gallery"
      },
      y.id
    )) }),
    d > 1 ? /* @__PURE__ */ w.jsxs("div", { className: "scene-pagination", "aria-label": "Scene pages", children: [
      /* @__PURE__ */ w.jsx(
        "button",
        {
          type: "button",
          className: "scene-page-arrow scene-page-button-left",
          onClick: () => a((y) => Math.max(0, y - 1)),
          disabled: p <= 0,
          "aria-label": "Previous scenes",
          children: /* @__PURE__ */ w.jsx(CC, { size: 18, "aria-hidden": "true" })
        }
      ),
      /* @__PURE__ */ w.jsx(
        "button",
        {
          type: "button",
          className: "scene-page-arrow scene-page-button-right",
          onClick: () => a((y) => Math.min(d - 1, y + 1)),
          disabled: p >= d - 1,
          "aria-label": "Next scenes",
          children: /* @__PURE__ */ w.jsx(EC, { size: 18, "aria-hidden": "true" })
        }
      )
    ] }) : null
  ] });
}
const fg = [
  { label: "Lo-fi Chill", icon: $C, musicType: "Lo-fi", ambientSound: "Cafe Rain" },
  { label: "Ambient Piano", icon: WC, musicType: "Piano", ambientSound: "Nature" },
  { label: "Nature Ambient", icon: lf, musicType: "Deep Focus", ambientSound: "Nature" },
  { label: "Acoustic Warm", icon: RC, musicType: "Minimal", ambientSound: "White Noise" },
  { label: "Deep Focus", icon: XC, musicType: "Deep Focus", ambientSound: "White Noise" }
];
function CP({ onWorkspace: e }) {
  const t = K((C) => C.selectedScene), o = K((C) => C.pomodoroDuration), i = K((C) => C.timerMode), a = K((C) => C.musicType), f = K((C) => C.focusTopics), d = K((C) => C.setPomodoroDuration), p = K((C) => C.setTimerMode), m = K((C) => C.setSound), y = K((C) => C.startSession), [v, l] = b.useState(!1), c = b.useMemo(
    () => {
      var C;
      return ((C = fg.find((E) => E.musicType === a)) == null ? void 0 : C.label) || "";
    },
    [a]
  ), S = (f || []).filter((C) => C.status !== "done").length, x = (C) => {
    m("musicType", C.musicType), m("ambientSound", C.ambientSound);
  }, _ = (C) => {
    p("countdown"), d(C);
  }, A = () => {
    t && y();
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
            children: /* @__PURE__ */ w.jsx(LC, { size: 18, "aria-hidden": "true" })
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
            children: /* @__PURE__ */ w.jsx(_C, { size: 20, "aria-hidden": "true" })
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
        /* @__PURE__ */ w.jsx(cf, { variant: "gallery" })
      ] }),
      /* @__PURE__ */ w.jsxs("aside", { className: "innook-control-rail", "aria-label": "Study settings", children: [
        /* @__PURE__ */ w.jsx("div", { className: "innook-rail-group", "aria-label": "Music atmosphere", children: fg.map((C) => {
          const E = C.icon, N = c === C.label;
          return /* @__PURE__ */ w.jsx(
            "button",
            {
              type: "button",
              className: `innook-rail-icon ${N ? "is-active" : ""}`.trim(),
              onClick: () => x(C),
              "aria-label": `Music style: ${C.label}`,
              "aria-pressed": N,
              title: C.label,
              children: /* @__PURE__ */ w.jsx(E, { size: 16, "aria-hidden": "true" })
            },
            C.label
          );
        }) }),
        /* @__PURE__ */ w.jsx("div", { className: "innook-rail-divider" }),
        /* @__PURE__ */ w.jsxs("div", { className: "innook-duration-list", "aria-label": "Focus duration", children: [
          E0.map((C) => {
            const E = i !== "countup" && C === o;
            return /* @__PURE__ */ w.jsx(
              "button",
              {
                type: "button",
                className: `innook-duration ${E ? "is-active" : ""}`.trim(),
                onClick: () => _(C),
                "aria-pressed": E,
                children: C
              },
              C
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
            onClick: () => l((C) => !C),
            "aria-label": "Edit focus topics",
            "aria-expanded": v,
            title: "Edit focus topics",
            "data-focus-topics-toggle": "true",
            children: [
              /* @__PURE__ */ w.jsx(sP, { size: 16, "aria-hidden": "true" }),
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
            disabled: !t,
            "data-focus-enter": "true",
            "aria-label": "Enter Focus Room",
            title: "Enter Focus Room",
            children: /* @__PURE__ */ w.jsx(kC, { size: 22, "aria-hidden": "true" })
          }
        ),
        v ? /* @__PURE__ */ w.jsx("div", { className: "innook-goal-popover innook-topics-popover", "data-focus-topics-popover": "true", children: /* @__PURE__ */ w.jsx(q0, { compact: !0 }) }) : null
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
  return /* @__PURE__ */ w.jsx(
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
function PP({ onWorkspace: e, onOpenTrail: t, onOpenCompanion: o, onOpenSettings: i, onExit: a }) {
  const f = K((p) => p.selectedScene), d = Z0(f);
  return /* @__PURE__ */ w.jsxs("header", { className: "focus-room-header", children: [
    /* @__PURE__ */ w.jsxs("button", { type: "button", className: "focus-wordmark", onClick: e, "aria-label": "Return to Synapse workspace", children: [
      /* @__PURE__ */ w.jsx("span", { className: "focus-wordmark-mark", children: "S" }),
      /* @__PURE__ */ w.jsx("span", { children: "synapse" })
    ] }),
    /* @__PURE__ */ w.jsxs("div", { className: "focus-room-context", "aria-label": "Current focus context", children: [
      /* @__PURE__ */ w.jsx("span", { children: d.title }),
      /* @__PURE__ */ w.jsx("small", { children: "Quiet study room" })
    ] }),
    /* @__PURE__ */ w.jsxs("nav", { className: "focus-room-header-actions", "aria-label": "Focus Room controls", children: [
      /* @__PURE__ */ w.jsxs(Te, { className: "header-icon-button", onClick: t, title: "Open Focus Trail", "aria-label": "Open Focus Trail", children: [
        /* @__PURE__ */ w.jsx(za, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Focus Trail" })
      ] }),
      /* @__PURE__ */ w.jsxs(Te, { className: "header-icon-button", onClick: o, title: "Open Companion Room", "aria-label": "Open Companion Room", children: [
        /* @__PURE__ */ w.jsx(Ba, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Companion" })
      ] }),
      /* @__PURE__ */ w.jsxs(Te, { className: "header-icon-button", onClick: i, title: "Open room settings", "aria-label": "Open room settings", children: [
        /* @__PURE__ */ w.jsx(K0, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Settings" })
      ] }),
      /* @__PURE__ */ w.jsxs(Te, { className: "header-icon-button header-exit-button", onClick: a, title: "Exit Focus Room", "aria-label": "Exit Focus Room", children: [
        /* @__PURE__ */ w.jsx(IC, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Exit" })
      ] })
    ] })
  ] });
}
const eS = {
  minutes: Math.floor(O0 / 60),
  seconds: 59
}, EP = {
  minutes: 3,
  seconds: 2
};
function df(e) {
  const t = rn(e, of);
  return {
    minutes: Math.floor(t / 60),
    seconds: t % 60
  };
}
function pg(e, t) {
  const o = Math.max(0, Math.floor(Number(e) || 0)), i = Math.max(0, Math.floor(Number(t) || 0));
  return rn(o * 60 + i, of);
}
function ud(e, t) {
  return String(Math.max(0, Math.floor(Number(e) || 0))).padStart(2, "0");
}
function ff(e) {
  const { minutes: t, seconds: o } = df(e);
  return `${ud(t, "minutes")}:${ud(o, "seconds")}`;
}
function MP(e, t, o) {
  const i = EP[o] || 2;
  return `${String(e || "").replace(/\D/g, "")}${String(t).replace(/\D/g, "")}`.slice(-i) || "";
}
function RP(e, t) {
  const o = Number(String(e || "").replace(/\D/g, "")) || 0;
  return Math.min(eS[t], o);
}
function NP(e, t, o) {
  const i = df(e), a = RP(o, t);
  return t === "seconds" ? pg(i.minutes, a) : pg(a, i.seconds);
}
const DP = { minutes: "Minutes", seconds: "Seconds" };
function mg({
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
  const y = DP[e], v = (l) => {
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
  return /* @__PURE__ */ w.jsx("span", { className: `timer-editor-segment${i ? " is-active" : ""}`, children: /* @__PURE__ */ w.jsx(
    "span",
    {
      ref: m,
      className: "timer-editor-digits",
      role: "spinbutton",
      tabIndex: o ? -1 : 0,
      "aria-label": y,
      "aria-valuemin": 0,
      "aria-valuemax": eS[e],
      "aria-valuenow": t,
      "aria-valuetext": `${t} ${y.toLowerCase()}`,
      "aria-disabled": o || void 0,
      onFocus: () => a(e),
      onKeyDown: v,
      children: ud(t, e)
    }
  ) });
}
function jP({
  valueSeconds: e,
  onChange: t,
  disabled: o = !1,
  size: i = "hero",
  ariaLabel: a = "Set focus block length",
  className: f = ""
}) {
  const { minutes: d, seconds: p } = df(e), [m, y] = b.useState(null), v = b.useRef(""), l = b.useRef(null), c = b.useRef(null), S = b.useRef(null), x = b.useCallback(() => {
    v.current = "";
  }, []), _ = b.useCallback((E) => {
    v.current = "", y(E);
  }, []), A = b.useCallback(
    (E, N) => {
      if (o) return;
      const O = MP(v.current, N, E);
      v.current = O, y(E), t == null || t(NP(e, E, O));
    },
    [o, t, e]
  ), T = b.useCallback((E) => {
    var O;
    const N = E < 0 ? "minutes" : "seconds";
    v.current = "", y(N), (O = (E < 0 ? l : c).current) == null || O.focus();
  }, []), C = (E) => {
    var N;
    (N = S.current) != null && N.contains(E.relatedTarget) || (x(), y(null));
  };
  return /* @__PURE__ */ w.jsxs(
    "div",
    {
      ref: S,
      className: `timer-editor timer-editor-${i}${o ? " is-readonly" : ""} ${f}`.trim(),
      role: "group",
      "aria-label": a,
      onBlur: C,
      children: [
        o ? /* @__PURE__ */ w.jsx("span", { className: "timer-editor-static", "aria-hidden": "true", children: ff(e) }) : /* @__PURE__ */ w.jsxs(w.Fragment, { children: [
          /* @__PURE__ */ w.jsx(
            mg,
            {
              segment: "minutes",
              value: d,
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
            mg,
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
function IP(e, t) {
  return t ? Math.min(100, Math.max(0, e / t * 100)) : 0;
}
function FP({ onFocusMode: e, audioState: t }) {
  const o = K((ee) => ee.timerStatus), i = K((ee) => ee.elapsedSeconds), a = K((ee) => ee.pomodoroDuration), f = K((ee) => ee.pomodoroDurationSeconds), d = K((ee) => ee.timerMode), p = K((ee) => ee.studyGoal), m = K((ee) => ee.focusTopics), y = K((ee) => ee.activeTopicId), v = K((ee) => ee.currentSession), l = K((ee) => ee.startTimer), c = K((ee) => ee.pauseTimer), S = K((ee) => ee.resetTimer), x = K((ee) => ee.skipTimer), _ = K((ee) => ee.toggleAudio), A = K((ee) => ee.audioPlaying), T = K((ee) => ee.setPomodoroDurationSeconds), C = K((ee) => ee.finishFocusTopic), E = uf(m, y), N = Number(f) || (Number(a) || 0) * 60, O = d === "countup" ? i : Math.max(0, N - i), W = o === "paused", H = o === "studying", Y = o === "completed", L = o === "idle" && d !== "countup", X = Y && d !== "countup" ? "00:00" : rd(O), se = W ? "Paused" : Y ? "Complete" : H ? "In focus" : "Ready", Z = W ? "Resume timer" : H ? "Pause timer" : "Start timer", de = (E == null ? void 0 : E.title) || p || "A quiet block for meaningful progress", ce = (E == null ? void 0 : E.description) || "", ye = !!(E && E.status !== "done");
  return /* @__PURE__ */ w.jsxs("div", { className: "focus-session-dock liquid-glass", "aria-label": "Focus session controls", children: [
    /* @__PURE__ */ w.jsxs("div", { className: "dock-timer-block", children: [
      /* @__PURE__ */ w.jsxs("div", { className: "dock-eyebrow", children: [
        "POMODORO #",
        (v == null ? void 0 : v.pomodoroNumber) || 1
      ] }),
      /* @__PURE__ */ w.jsxs("div", { className: "dock-status", children: [
        /* @__PURE__ */ w.jsx("span", { className: `dock-status-dot ${W || !H ? "is-paused" : ""}` }),
        se
      ] }),
      L ? /* @__PURE__ */ w.jsx(
        jP,
        {
          className: "dock-time-editor",
          valueSeconds: N,
          onChange: T,
          size: "dock",
          ariaLabel: "Set focus block length"
        }
      ) : /* @__PURE__ */ w.jsx("strong", { className: "dock-time", "aria-live": "off", children: X }),
      /* @__PURE__ */ w.jsx("div", { className: "dock-progress", "aria-hidden": "true", children: /* @__PURE__ */ w.jsx("span", { style: { width: `${IP(i, N)}%` } }) })
    ] }),
    /* @__PURE__ */ w.jsxs("div", { className: "dock-goal-block", "data-focus-active-topic": "true", children: [
      /* @__PURE__ */ w.jsx("span", { className: "dock-eyebrow", children: "ACTIVE TOPIC" }),
      /* @__PURE__ */ w.jsx("strong", { children: de }),
      ce ? /* @__PURE__ */ w.jsx("span", { className: "dock-goal-description", children: ce }) : null,
      /* @__PURE__ */ w.jsxs("span", { className: "dock-goal-meta", children: [
        d === "countup" ? "Count-up" : `${ff(N)} block`,
        " · ",
        rd(i),
        " focused"
      ] }),
      ye ? /* @__PURE__ */ w.jsxs(
        "button",
        {
          type: "button",
          className: "dock-topic-finish",
          onClick: () => C(E.id),
          "data-focus-topic-finish-dock": "true",
          "aria-label": "Mark active topic done and switch to the next",
          children: [
            /* @__PURE__ */ w.jsx(Za, { size: 13, "aria-hidden": "true" }),
            "Done · next topic"
          ]
        }
      ) : null
    ] }),
    /* @__PURE__ */ w.jsxs("div", { className: "dock-action-block", children: [
      /* @__PURE__ */ w.jsxs(Te, { className: "dock-action-button", onClick: _, "aria-label": A ? "Pause room audio" : "Play room audio", children: [
        A ? /* @__PURE__ */ w.jsx(sd, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(Ja, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: t != null && t.playing ? "Pause audio" : "Audio" })
      ] }),
      /* @__PURE__ */ w.jsxs(Te, { className: "dock-action-button", onClick: () => H ? c() : l(), variant: "primary", "aria-label": Z, children: [
        H ? /* @__PURE__ */ w.jsx(sd, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(H0, { size: 15, fill: "currentColor", "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: W ? "Resume" : H ? "Pause" : "Start" })
      ] }),
      /* @__PURE__ */ w.jsxs(Te, { className: "dock-action-button", onClick: x, "aria-label": "Skip timer", children: [
        /* @__PURE__ */ w.jsx(Y0, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Skip" })
      ] }),
      /* @__PURE__ */ w.jsxs(Te, { className: "dock-action-button", onClick: S, "aria-label": "Reset timer", children: [
        /* @__PURE__ */ w.jsx(W0, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Reset" })
      ] }),
      /* @__PURE__ */ w.jsxs(Te, { className: "dock-focus-mode", onClick: e, "aria-label": "Enter distraction-free Focus Mode", children: [
        /* @__PURE__ */ w.jsx(oP, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Focus Mode" })
      ] })
    ] })
  ] });
}
var OP = Object.defineProperty, _o = (e, t) => OP(e, "name", { value: t, configurable: !0 }), tS = !!(typeof window < "u" && window.document && window.document.createElement);
function Cr(e, t, { checkForDefaultPrevented: o = !0 } = {}) {
  return /* @__PURE__ */ _o(function(a) {
    if (e == null || e(a), o === !1 || !a || !a.defaultPrevented)
      return t == null ? void 0 : t(a);
  }, "handleEvent");
}
_o(Cr, "composeEventHandlers");
function LP(e) {
  var t;
  if (!tS)
    throw new Error("Cannot access window outside of the DOM");
  return ((t = e == null ? void 0 : e.ownerDocument) == null ? void 0 : t.defaultView) ?? window;
}
_o(LP, "getOwnerWindow");
function cd(e) {
  if (!tS)
    throw new Error("Cannot access document outside of the DOM");
  return (e == null ? void 0 : e.ownerDocument) ?? document;
}
_o(cd, "getOwnerDocument");
function nS(e, t = !1) {
  const { activeElement: o } = cd(e);
  if (!(o != null && o.nodeName))
    return null;
  if (rS(o) && o.contentDocument)
    return nS(o.contentDocument.body, t);
  if (t) {
    const i = o.getAttribute("aria-activedescendant");
    if (i) {
      const a = cd(o).getElementById(i);
      if (a)
        return a;
    }
  }
  return o;
}
_o(nS, "getActiveElement");
function rS(e) {
  return e.tagName === "IFRAME";
}
_o(rS, "isFrame");
var VP = Object.defineProperty, pf = (e, t) => VP(e, "name", { value: t, configurable: !0 });
function dd(e, t) {
  if (typeof e == "function")
    return e(t);
  e != null && (e.current = t);
}
pf(dd, "setRef");
function oS(...e) {
  return (t) => {
    let o = !1;
    const i = e.map((a) => {
      const f = dd(a, t);
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
pf(oS, "composeRefs");
function To(...e) {
  return b.useCallback(oS(...e), e);
}
pf(To, "useComposedRefs");
var zP = Object.defineProperty, Nt = (e, t) => zP(e, "name", { value: t, configurable: !0 });
// @__NO_SIDE_EFFECTS__
function BP(e, t) {
  const o = b.createContext(t);
  o.displayName = e + "Context";
  const i = /* @__PURE__ */ Nt((f) => {
    const { children: d, ...p } = f, m = b.useMemo(() => p, Object.values(p));
    return /* @__PURE__ */ w.jsx(o.Provider, { value: m, children: d });
  }, "Provider");
  i.displayName = e + "Provider";
  function a(f, d = {}) {
    const { optional: p = !1 } = d, m = b.useContext(o);
    if (m) return m;
    if (t !== void 0) return t;
    if (!p)
      throw new Error(`\`${f}\` must be used within \`${e}\``);
  }
  return Nt(a, "useContext"), [i, a];
}
Nt(BP, "createContext");
// @__NO_SIDE_EFFECTS__
function iS(e, t = []) {
  let o = [];
  function i(f, d) {
    const p = b.createContext(d);
    p.displayName = f + "Context";
    const m = o.length;
    o = [...o, d];
    const y = /* @__PURE__ */ Nt((l) => {
      var T;
      const { scope: c, children: S, ...x } = l, _ = ((T = c == null ? void 0 : c[e]) == null ? void 0 : T[m]) || p, A = b.useMemo(() => x, Object.values(x));
      return /* @__PURE__ */ w.jsx(_.Provider, { value: A, children: S });
    }, "Provider");
    y.displayName = f + "Provider";
    function v(l, c, S = {}) {
      var T;
      const { optional: x = !1 } = S, _ = ((T = c == null ? void 0 : c[e]) == null ? void 0 : T[m]) || p, A = b.useContext(_);
      if (A) return A;
      if (d !== void 0) return d;
      if (!x)
        throw new Error(`\`${l}\` must be used within \`${f}\``);
    }
    return Nt(v, "useContext"), [y, v];
  }
  Nt(i, "createContext");
  const a = /* @__PURE__ */ Nt(() => {
    const f = o.map((d) => b.createContext(d));
    return /* @__PURE__ */ Nt(function(p) {
      const m = (p == null ? void 0 : p[e]) || f;
      return b.useMemo(
        () => ({ [`__scope${e}`]: { ...p, [e]: m } }),
        [p, m]
      );
    }, "useScope");
  }, "createScope");
  return a.scopeName = e, [i, sS(a, ...t)];
}
Nt(iS, "createContextScope");
function sS(...e) {
  const t = e[0];
  if (e.length === 1) return t;
  const o = /* @__PURE__ */ Nt(() => {
    const i = e.map((a) => ({
      useScope: a(),
      scopeName: a.scopeName
    }));
    return /* @__PURE__ */ Nt(function(f) {
      const d = i.reduce((p, { useScope: m, scopeName: y }) => {
        const l = m(f)[`__scope${y}`];
        return { ...p, ...l };
      }, {});
      return b.useMemo(() => ({ [`__scope${t.scopeName}`]: d }), [d]);
    }, "useComposedScopes");
  }, "createScope");
  return o.scopeName = t.scopeName, o;
}
Nt(sS, "composeContextScopes");
var Jn = globalThis != null && globalThis.document ? b.useLayoutEffect : () => {
}, $P = Object.defineProperty, UP = (e, t) => $P(e, "name", { value: t, configurable: !0 }), HP = Er[" useId ".trim().toString()] || (() => {
}), WP = 0;
function _a(e) {
  const [t, o] = b.useState(HP());
  return Jn(() => {
    e || o((i) => i ?? String(WP++));
  }, [e]), e || (t ? `radix-${t}` : "");
}
UP(_a, "useId");
var GP = Object.defineProperty, KP = (e, t) => GP(e, "name", { value: t, configurable: !0 }), hg = Er[" useEffectEvent ".trim().toString()], yg = Er[" useInsertionEffect ".trim().toString()];
function aS(e) {
  if (typeof hg == "function")
    return hg(e);
  const t = b.useRef(() => {
    throw new Error("Cannot call an event handler while rendering.");
  });
  return typeof yg == "function" ? yg(() => {
    t.current = e;
  }) : Jn(() => {
    t.current = e;
  }), b.useMemo(() => ((...o) => {
    var i;
    return (i = t.current) == null ? void 0 : i.call(t, ...o);
  }), []);
}
KP(aS, "useEffectEvent");
var YP = Object.defineProperty, Oi = (e, t) => YP(e, "name", { value: t, configurable: !0 }), QP = Er[" useInsertionEffect ".trim().toString()] || Jn;
function lS({
  prop: e,
  defaultProp: t,
  onChange: o = /* @__PURE__ */ Oi(() => {
  }, "onChange"),
  caller: i
}) {
  const [a, f, d] = uS({
    defaultProp: t,
    onChange: o
  }), p = e !== void 0, m = p ? e : a, y = b.useCallback(
    (v) => {
      var l;
      if (p) {
        const c = cS(v) ? v(e) : v;
        c !== e && ((l = d.current) == null || l.call(d, c));
      } else
        f(v);
    },
    [p, e, f, d]
  );
  return [m, y];
}
Oi(lS, "useControllableState");
function uS({
  defaultProp: e,
  onChange: t
}) {
  const [o, i] = b.useState(e), a = b.useRef(o), f = b.useRef(t);
  return QP(() => {
    f.current = t;
  }, [t]), b.useEffect(() => {
    var d;
    a.current !== o && ((d = f.current) == null || d.call(f, o), a.current = o);
  }, [o, a]), [o, i, f];
}
Oi(uS, "useUncontrolledState");
function cS(e) {
  return typeof e == "function";
}
Oi(cS, "isFunction");
var gg = Symbol("RADIX:SYNC_STATE");
function XP(e, t, o, i) {
  const { prop: a, defaultProp: f, onChange: d, caller: p } = t, m = a !== void 0, y = aS(d), v = [{ ...o, state: f }];
  i && v.push(i);
  const [l, c] = b.useReducer(
    (A, T) => {
      if (T.type === gg)
        return { ...A, state: T.state };
      const C = e(A, T);
      return m && !Object.is(C.state, A.state) && y(C.state), C;
    },
    ...v
  ), S = l.state, x = b.useRef(S);
  b.useEffect(() => {
    x.current !== S && (x.current = S, m || y(S));
  }, [S, x, m]);
  const _ = b.useMemo(() => a !== void 0 ? { ...l, state: a } : l, [l, a]);
  return b.useEffect(() => {
    m && !Object.is(a, l.state) && c({ type: gg, state: a });
  }, [a, l.state, m]), [_, c];
}
Oi(XP, "useControllableStateReducer");
var dS = Lg(), ZP = Object.defineProperty, Gt = (e, t) => ZP(e, "name", { value: t, configurable: !0 });
// @__NO_SIDE_EFFECTS__
function mf(e) {
  const t = b.forwardRef((o, i) => {
    let { children: a, ...f } = o, d = null, p = !1;
    const m = [];
    fd(a) && typeof oa == "function" && (a = oa(a._payload)), b.Children.forEach(a, (c) => {
      var S;
      if (hS(c)) {
        p = !0;
        const x = c;
        let _ = "child" in x.props ? x.props.child : x.props.children;
        fd(_) && typeof oa == "function" && (_ = oa(_._payload)), d = qP(x, _), m.push((S = d == null ? void 0 : d.props) == null ? void 0 : S.children);
      } else
        m.push(c);
    }), d ? d = b.cloneElement(d, void 0, m) : (
      // A `Slottable` was found but it didn't resolve to a single element (e.g.
      // it wrapped multiple elements, text, or a render-prop `child` that
      // wasn't an element). Don't fall back to treating the `Slottable` wrapper
      // itself as the slot target — throw a descriptive error below instead.
      !p && b.Children.count(a) === 1 && b.isValidElement(a) && (d = a)
    );
    const y = d ? mS(d) : void 0, v = To(i, y);
    if (!d) {
      if (a || a === 0)
        throw new Error(
          p ? nE(e) : tE(e)
        );
      return a;
    }
    const l = pS(f, d.props ?? {});
    return d.type !== b.Fragment && (l.ref = i ? v : y), b.cloneElement(d, l);
  });
  return t.displayName = `${e}.Slot`, t;
}
Gt(mf, "createSlot");
var fS = Symbol.for("radix.slottable");
// @__NO_SIDE_EFFECTS__
function JP(e) {
  const t = /* @__PURE__ */ Gt((o) => "child" in o ? o.children(o.child) : o.children, "Slottable");
  return t.displayName = `${e}.Slottable`, t.__radixId = fS, t;
}
Gt(JP, "createSlottable");
var qP = /* @__PURE__ */ Gt((e, t) => {
  if ("child" in e.props) {
    const o = e.props.child;
    return b.isValidElement(o) ? b.cloneElement(o, void 0, e.props.children(o.props.children)) : null;
  }
  return b.isValidElement(t) ? t : null;
}, "getSlottableElementFromSlottable");
function pS(e, t) {
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
Gt(pS, "mergeProps");
function mS(e) {
  var i, a;
  let t = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = t && "isReactWarning" in t && t.isReactWarning;
  return o ? e.ref : (t = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = t && "isReactWarning" in t && t.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
Gt(mS, "getElementRef");
function hS(e) {
  return b.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === fS;
}
Gt(hS, "isSlottable");
var eE = Symbol.for("react.lazy");
function fd(e) {
  return e != null && typeof e == "object" && "$$typeof" in e && e.$$typeof === eE && "_payload" in e && yS(e._payload);
}
Gt(fd, "isLazyComponent");
function yS(e) {
  return typeof e == "object" && e !== null && "then" in e;
}
Gt(yS, "isPromiseLike");
var tE = /* @__PURE__ */ Gt((e) => `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`, "createSlotError"), nE = /* @__PURE__ */ Gt((e) => `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`, "createSlottableError"), oa = Er[" use ".trim().toString()], rE = Object.defineProperty, oE = (e, t) => rE(e, "name", { value: t, configurable: !0 }), iE = [
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
], ko = iE.reduce((e, t) => {
  const o = /* @__PURE__ */ mf(`Primitive.${t}`), i = b.forwardRef((a, f) => {
    const { asChild: d, ...p } = a, m = d ? o : t;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ w.jsx(m, { ...p, ref: f });
  });
  return i.displayName = `Primitive.${t}`, { ...e, [t]: i };
}, {});
function gS(e, t) {
  e && dS.flushSync(() => e.dispatchEvent(t));
}
oE(gS, "dispatchDiscreteCustomEvent");
var sE = Object.defineProperty, aE = (e, t) => sE(e, "name", { value: t, configurable: !0 });
function vo(e) {
  const t = b.useRef(e);
  return b.useEffect(() => {
    t.current = e;
  }), b.useMemo(() => ((...o) => {
    var i;
    return (i = t.current) == null ? void 0 : i.call(t, ...o);
  }), []);
}
aE(vo, "useCallbackRef");
var lE = Object.defineProperty, Qe = (e, t) => lE(e, "name", { value: t, configurable: !0 }), pd = "dismissableLayer.update", uE = "dismissableLayer.pointerDownOutside", cE = "dismissableLayer.focusOutside", vg, vS = b.createContext({
  layers: /* @__PURE__ */ new Set(),
  layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
  branches: /* @__PURE__ */ new Set(),
  // Outside elements that belong to a layer's own dismiss affordance (eg, a
  // dialog overlay). Pressing them should dismiss the layer regardless of
  // whether or not they stop propagation.
  //
  // See https://github.com/radix-ui/primitives/issues/3346
  dismissableSurfaces: /* @__PURE__ */ new Set()
}), dE = /* @__PURE__ */ b.forwardRef(
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
      ...v
    } = t, l = b.useContext(vS), [c, S] = b.useState(null), x = (c == null ? void 0 : c.ownerDocument) ?? (globalThis == null ? void 0 : globalThis.document), [, _] = b.useState({}), A = To(o, S), T = Array.from(l.layers), [C] = [
      ...l.layersWithOutsidePointerEventsDisabled
    ].slice(-1), E = C ? T.indexOf(C) : -1, N = c ? T.indexOf(c) : -1, O = l.layersWithOutsidePointerEventsDisabled.size > 0, W = N >= E, H = b.useRef(!1), Y = wS(
      (Z) => {
        d == null || d(Z), m == null || m(Z), Z.defaultPrevented || y == null || y();
      },
      {
        ownerDocument: x,
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
    ), L = xS((Z) => {
      if (a && H.current)
        return;
      const de = Z.target;
      [...l.branches].some((ye) => ye.contains(de)) || (p == null || p(Z), m == null || m(Z), Z.defaultPrevented || y == null || y());
    }, x), X = c ? N === T.length - 1 : !1, se = vo((Z) => {
      Z.key === "Escape" && (f == null || f(Z), !Z.defaultPrevented && y && (Z.preventDefault(), y()));
    });
    return b.useEffect(() => {
      if (X)
        return x.addEventListener("keydown", se, { capture: !0 }), () => x.removeEventListener("keydown", se, { capture: !0 });
    }, [x, X, se]), b.useEffect(() => {
      if (c)
        return i && (l.layersWithOutsidePointerEventsDisabled.size === 0 && (vg = x.body.style.pointerEvents, x.body.style.pointerEvents = "none"), l.layersWithOutsidePointerEventsDisabled.add(c)), l.layers.add(c), md(), () => {
          i && (l.layersWithOutsidePointerEventsDisabled.delete(c), l.layersWithOutsidePointerEventsDisabled.size === 0 && (x.body.style.pointerEvents = vg));
        };
    }, [c, x, i, l]), b.useEffect(() => () => {
      c && (l.layers.delete(c), l.layersWithOutsidePointerEventsDisabled.delete(c), md());
    }, [c, l]), b.useEffect(() => {
      const Z = /* @__PURE__ */ Qe(() => _({}), "handleUpdate");
      return document.addEventListener(pd, Z), () => document.removeEventListener(pd, Z);
    }, []), /* @__PURE__ */ w.jsx(
      ko.div,
      {
        ...v,
        ref: A,
        style: {
          pointerEvents: O ? W ? "auto" : "none" : void 0,
          ...t.style
        },
        onFocusCapture: Cr(t.onFocusCapture, L.onFocusCapture),
        onBlurCapture: Cr(t.onBlurCapture, L.onBlurCapture),
        onPointerDownCapture: Cr(
          t.onPointerDownCapture,
          Y.onPointerDownCapture
        )
      }
    );
  }, "DismissableLayer")
);
function SS() {
  const e = b.useContext(vS), [t, o] = b.useState(null);
  return b.useEffect(() => {
    if (t)
      return e.dismissableSurfaces.add(t), () => {
        e.dismissableSurfaces.delete(t);
      };
  }, [t, e.dismissableSurfaces]), o;
}
Qe(SS, "useDismissableLayerSurface");
var fE = /* @__PURE__ */ Qe(() => !0, "IS_TRUE");
function wS(e, t) {
  const {
    ownerDocument: o = globalThis == null ? void 0 : globalThis.document,
    deferPointerDownOutside: i = !1,
    isDeferredPointerDownOutsideRef: a,
    dismissableSurfaces: f,
    shouldHandlePointerDownOutside: d = fE
  } = t, p = vo(e), m = b.useRef(!1), y = b.useRef(!1), v = b.useRef(/* @__PURE__ */ new Map()), l = b.useRef(() => {
  });
  return b.useEffect(() => {
    function c() {
      y.current = !1, a.current = !1, v.current.clear();
    }
    Qe(c, "resetOutsideInteraction");
    function S() {
      return Array.from(v.current.values()).some(Boolean);
    }
    Qe(S, "isOutsideInteractionIntercepted");
    function x(E) {
      if (!y.current)
        return;
      const N = E.target;
      N instanceof Node && [...f].some((W) => W.contains(N)) || v.current.set(E.type, !0), E.type === "click" && window.setTimeout(() => {
        y.current && l.current();
      }, 0);
    }
    Qe(x, "handleInteractionCapture");
    function _(E) {
      y.current && v.current.set(E.type, !1);
    }
    Qe(_, "handleInteractionBubble");
    const A = /* @__PURE__ */ Qe((E) => {
      if (E.target && !m.current) {
        let N = function() {
          o.removeEventListener("click", l.current);
          const W = S();
          c(), W || hf(
            uE,
            p,
            O,
            { discrete: !0 }
          );
        };
        if (Qe(N, "handleAndDispatchPointerDownOutsideEvent"), !d(E.target)) {
          o.removeEventListener("click", l.current), c(), m.current = !1;
          return;
        }
        const O = { originalEvent: E };
        y.current = !0, a.current = i && E.button === 0, v.current.clear(), !i || E.button !== 0 ? N() : (o.removeEventListener("click", l.current), l.current = N, o.addEventListener("click", l.current, { once: !0 }));
      } else
        o.removeEventListener("click", l.current), c();
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
      o.addEventListener(E, x, !0), o.addEventListener(E, _);
    const C = window.setTimeout(() => {
      o.addEventListener("pointerdown", A);
    }, 0);
    return () => {
      window.clearTimeout(C), o.removeEventListener("pointerdown", A), o.removeEventListener("click", l.current);
      for (const E of T)
        o.removeEventListener(E, x, !0), o.removeEventListener(E, _);
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
Qe(wS, "usePointerDownOutside");
function xS(e, t = globalThis == null ? void 0 : globalThis.document) {
  const o = vo(e), i = b.useRef(!1);
  return b.useEffect(() => {
    const a = /* @__PURE__ */ Qe((f) => {
      f.target && !i.current && hf(cE, o, { originalEvent: f }, {
        discrete: !1
      });
    }, "handleFocus");
    return t.addEventListener("focusin", a), () => t.removeEventListener("focusin", a);
  }, [t, o]), {
    onFocusCapture: /* @__PURE__ */ Qe(() => i.current = !0, "onFocusCapture"),
    onBlurCapture: /* @__PURE__ */ Qe(() => i.current = !1, "onBlurCapture")
  };
}
Qe(xS, "useFocusOutside");
function md() {
  const e = new CustomEvent(pd);
  document.dispatchEvent(e);
}
Qe(md, "dispatchUpdate");
function hf(e, t, o, { discrete: i }) {
  const a = o.originalEvent.target, f = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: o });
  t && a.addEventListener(e, t, { once: !0 }), i ? gS(a, f) : a.dispatchEvent(f);
}
Qe(hf, "handleAndDispatchCustomEvent");
var pE = Object.defineProperty, ct = (e, t) => pE(e, "name", { value: t, configurable: !0 }), gc = "focusScope.autoFocusOnMount", vc = "focusScope.autoFocusOnUnmount", Sg = { bubbles: !1, cancelable: !0 }, mE = /* @__PURE__ */ b.forwardRef(
  /* @__PURE__ */ ct(function(t, o) {
    const {
      loop: i = !1,
      trapped: a = !1,
      onMountAutoFocus: f,
      onUnmountAutoFocus: d,
      ...p
    } = t, [m, y] = b.useState(null), v = vo(f), l = vo(d), c = b.useRef(null), S = To(o, y), x = b.useRef({
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
          if (x.paused || !m) return;
          const O = N.target;
          m.contains(O) ? c.current = O : yn(c.current, { select: !0 });
        }, T = function(N) {
          if (x.paused || !m) return;
          const O = N.relatedTarget;
          O !== null && (m.contains(O) || yn(c.current, { select: !0 }));
        }, C = function(N) {
          if (document.activeElement === document.body)
            for (const W of N)
              W.removedNodes.length > 0 && yn(m);
        };
        ct(A, "handleFocusIn"), ct(T, "handleFocusOut"), ct(C, "handleMutations"), document.addEventListener("focusin", A), document.addEventListener("focusout", T);
        const E = new MutationObserver(C);
        return m && E.observe(m, { childList: !0, subtree: !0 }), () => {
          document.removeEventListener("focusin", A), document.removeEventListener("focusout", T), E.disconnect();
        };
      }
    }, [a, m, x.paused]), b.useEffect(() => {
      if (m) {
        wg.add(x);
        const A = document.activeElement;
        if (!m.contains(A)) {
          const C = new CustomEvent(gc, Sg);
          m.addEventListener(gc, v), m.dispatchEvent(C), C.defaultPrevented || (_S(CS(yf(m)), { select: !0 }), document.activeElement === A && yn(m));
        }
        return () => {
          m.removeEventListener(gc, v), setTimeout(() => {
            const C = new CustomEvent(vc, Sg);
            m.addEventListener(vc, l), m.dispatchEvent(C), C.defaultPrevented || yn(A ?? document.body, { select: !0 }), m.removeEventListener(vc, l), wg.remove(x);
          }, 0);
        };
      }
    }, [m, v, l, x]);
    const _ = b.useCallback(
      (A) => {
        if (!i && !a || x.paused) return;
        const T = A.key === "Tab" && !A.altKey && !A.ctrlKey && !A.metaKey, C = document.activeElement;
        if (T && C) {
          const E = A.currentTarget, [N, O] = TS(E);
          N && O ? !A.shiftKey && C === O ? (A.preventDefault(), i && yn(N, { select: !0 })) : A.shiftKey && C === N && (A.preventDefault(), i && yn(O, { select: !0 })) : C === E && A.preventDefault();
        }
      },
      [i, a, x.paused]
    );
    return /* @__PURE__ */ w.jsx(ko.div, { tabIndex: -1, ...p, ref: S, onKeyDown: _ });
  }, "FocusScope")
);
function _S(e, { select: t = !1 } = {}) {
  const o = document.activeElement;
  for (const i of e)
    if (yn(i, { select: t }), document.activeElement !== o) return;
}
ct(_S, "focusFirst");
function TS(e) {
  const t = yf(e), o = hd(t, e), i = hd(t.reverse(), e);
  return [o, i];
}
ct(TS, "getTabbableEdges");
function yf(e) {
  const t = [], o = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
    acceptNode: /* @__PURE__ */ ct((i) => {
      const a = i.tagName === "INPUT" && i.type === "hidden";
      return i.disabled || i.hidden || a ? NodeFilter.FILTER_SKIP : i.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }, "acceptNode")
  });
  for (; o.nextNode(); ) t.push(o.currentNode);
  return t;
}
ct(yf, "getTabbableCandidates");
function hd(e, t) {
  const o = typeof t.checkVisibility == "function" && t.checkVisibility({ checkVisibilityCSS: !0 });
  for (const i of e)
    if (!(o ? !i.checkVisibility({ checkVisibilityCSS: !0 }) : kS(i, { upTo: t })))
      return i;
}
ct(hd, "findVisible");
function kS(e, { upTo: t }) {
  if (getComputedStyle(e).visibility === "hidden") return !0;
  for (; e; ) {
    if (t !== void 0 && e === t) return !1;
    if (getComputedStyle(e).display === "none") return !0;
    e = e.parentElement;
  }
  return !1;
}
ct(kS, "isHidden");
function AS(e) {
  return e instanceof HTMLInputElement && "select" in e;
}
ct(AS, "isSelectableInput");
function yn(e, { select: t = !1 } = {}) {
  if (e && e.focus) {
    const o = document.activeElement;
    e.focus({ preventScroll: !0 }), e !== o && AS(e) && t && e.select();
  }
}
ct(yn, "focus");
var wg = bS();
function bS() {
  let e = [];
  return {
    add(t) {
      const o = e[0];
      t !== o && (o == null || o.pause()), e = yd(e, t), e.unshift(t);
    },
    remove(t) {
      var o;
      e = yd(e, t), (o = e[0]) == null || o.resume();
    }
  };
}
ct(bS, "createFocusScopesStack");
function yd(e, t) {
  const o = [...e], i = o.indexOf(t);
  return i !== -1 && o.splice(i, 1), o;
}
ct(yd, "arrayRemove");
function CS(e) {
  return e.filter((t) => t.tagName !== "A");
}
ct(CS, "removeLinks");
var hE = Object.defineProperty, yE = (e, t) => hE(e, "name", { value: t, configurable: !0 }), gE = /* @__PURE__ */ b.forwardRef(
  /* @__PURE__ */ yE(function(t, o) {
    var m;
    const { container: i, ...a } = t, [f, d] = b.useState(!1);
    Jn(() => d(!0), []);
    const p = i || f && ((m = globalThis == null ? void 0 : globalThis.document) == null ? void 0 : m.body);
    return p ? dS.createPortal(/* @__PURE__ */ w.jsx(ko.div, { ...a, ref: o }), p) : null;
  }, "Portal")
), vE = Object.defineProperty, Sn = (e, t) => vE(e, "name", { value: t, configurable: !0 });
function PS(e, t) {
  return b.useReducer((o, i) => t[o][i] ?? o, e);
}
Sn(PS, "useStateMachine");
var gf = /* @__PURE__ */ Sn((e) => {
  const { present: t, children: o } = e, i = ES(t), a = typeof o == "function" ? o({ present: i.isPresent }) : b.Children.only(o), f = MS(i.ref, RS(a));
  return typeof o == "function" || i.isPresent ? b.cloneElement(a, { ref: f }) : null;
}, "Presence");
function ES(e) {
  const [t, o] = b.useState(), i = b.useRef(null), a = b.useRef(e), f = b.useRef("none"), d = b.useRef(void 0), p = e ? "mounted" : "unmounted", [m, y] = PS(p, {
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
    const v = i.current, l = a.current;
    if (l !== e) {
      const S = f.current, x = ao(v);
      e ? (d.current = x, y("MOUNT")) : x === "none" || (v == null ? void 0 : v.display) === "none" ? y("UNMOUNT") : y(l && S !== x ? "ANIMATION_OUT" : "UNMOUNT"), a.current = e;
    }
  }, [e, y]), Jn(() => {
    if (t) {
      let v;
      const l = t.ownerDocument.defaultView ?? window, c = /* @__PURE__ */ Sn((x) => {
        const A = ao(i.current).includes(CSS.escape(x.animationName));
        if (x.target === t && A && (y("ANIMATION_END"), !a.current)) {
          const T = t.style.animationFillMode;
          t.style.animationFillMode = "forwards", v = l.setTimeout(() => {
            t.style.animationFillMode === "forwards" && (t.style.animationFillMode = T);
          });
        }
      }, "handleAnimationEnd"), S = /* @__PURE__ */ Sn((x) => {
        x.target === t && (f.current = ao(i.current));
      }, "handleAnimationStart");
      return t.addEventListener("animationstart", S), t.addEventListener("animationcancel", c), t.addEventListener("animationend", c), () => {
        l.clearTimeout(v), t.removeEventListener("animationstart", S), t.removeEventListener("animationcancel", c), t.removeEventListener("animationend", c);
      };
    } else
      y("ANIMATION_END");
  }, [t, y]), {
    isPresent: ["mounted", "unmountSuspended"].includes(m),
    ref: b.useCallback((v) => {
      if (v) {
        const l = getComputedStyle(v);
        i.current = l, d.current = ao(l);
      } else
        i.current = null;
      o(v);
    }, [])
  };
}
Sn(ES, "usePresence");
function gd(e, t) {
  if (typeof e == "function")
    return e(t);
  e != null && (e.current = t);
}
Sn(gd, "setRef");
function MS(...e) {
  const t = b.useRef(e);
  return t.current = e, b.useCallback((o) => {
    const i = t.current;
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
Sn(MS, "useStableComposedRefs");
function ao(e) {
  return (e == null ? void 0 : e.animationName) || "none";
}
Sn(ao, "getAnimationName");
function RS(e) {
  var i, a;
  let t = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = t && "isReactWarning" in t && t.isReactWarning;
  return o ? e.ref : (t = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = t && "isReactWarning" in t && t.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
Sn(RS, "getElementRef");
var SE = Object.defineProperty, vf = (e, t) => SE(e, "name", { value: t, configurable: !0 }), ia = 0, qt = null;
function wE(e) {
  return Sf(), e.children;
}
vf(wE, "FocusGuards");
function Sf() {
  b.useEffect(() => {
    qt || (qt = { start: vd(), end: vd() });
    const { start: e, end: t } = qt;
    return document.body.firstElementChild !== e && document.body.insertAdjacentElement("afterbegin", e), document.body.lastElementChild !== t && document.body.insertAdjacentElement("beforeend", t), ia++, () => {
      ia === 1 && (qt == null || qt.start.remove(), qt == null || qt.end.remove(), qt = null), ia = Math.max(0, ia - 1);
    };
  }, []);
}
vf(Sf, "useFocusGuards");
function vd() {
  const e = document.createElement("span");
  return e.setAttribute("data-radix-focus-guard", ""), e.tabIndex = 0, e.style.outline = "none", e.style.opacity = "0", e.style.position = "fixed", e.style.pointerEvents = "none", e;
}
vf(vd, "createFocusGuard");
var nn = function() {
  return nn = Object.assign || function(t) {
    for (var o, i = 1, a = arguments.length; i < a; i++) {
      o = arguments[i];
      for (var f in o) Object.prototype.hasOwnProperty.call(o, f) && (t[f] = o[f]);
    }
    return t;
  }, nn.apply(this, arguments);
};
function NS(e, t) {
  var o = {};
  for (var i in e) Object.prototype.hasOwnProperty.call(e, i) && t.indexOf(i) < 0 && (o[i] = e[i]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var a = 0, i = Object.getOwnPropertySymbols(e); a < i.length; a++)
      t.indexOf(i[a]) < 0 && Object.prototype.propertyIsEnumerable.call(e, i[a]) && (o[i[a]] = e[i[a]]);
  return o;
}
function xE(e, t, o) {
  if (o || arguments.length === 2) for (var i = 0, a = t.length, f; i < a; i++)
    (f || !(i in t)) && (f || (f = Array.prototype.slice.call(t, 0, i)), f[i] = t[i]);
  return e.concat(f || Array.prototype.slice.call(t));
}
var Ta = "right-scroll-bar-position", ka = "width-before-scroll-bar", _E = "with-scroll-bars-hidden", TE = "--removed-body-scroll-bar-size";
function Sc(e, t) {
  return typeof e == "function" ? e(t) : e && (e.current = t), e;
}
function kE(e, t) {
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
var AE = typeof window < "u" ? b.useLayoutEffect : b.useEffect, xg = /* @__PURE__ */ new WeakMap();
function bE(e, t) {
  var o = kE(null, function(i) {
    return e.forEach(function(a) {
      return Sc(a, i);
    });
  });
  return AE(function() {
    var i = xg.get(o);
    if (i) {
      var a = new Set(i), f = new Set(e), d = o.current;
      a.forEach(function(p) {
        f.has(p) || Sc(p, null);
      }), f.forEach(function(p) {
        a.has(p) || Sc(p, d);
      });
    }
    xg.set(o, e);
  }, [e]), o;
}
function CE(e) {
  return e;
}
function PE(e, t) {
  t === void 0 && (t = CE);
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
        var v = d;
        d = [], v.forEach(f);
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
function EE(e) {
  e === void 0 && (e = {});
  var t = PE(null);
  return t.options = nn({ async: !0, ssr: !1 }, e), t;
}
var DS = function(e) {
  var t = e.sideCar, o = NS(e, ["sideCar"]);
  if (!t)
    throw new Error("Sidecar: please provide `sideCar` property to import the right car");
  var i = t.read();
  if (!i)
    throw new Error("Sidecar medium not found");
  return b.createElement(i, nn({}, o));
};
DS.isSideCarExport = !0;
function ME(e, t) {
  return e.useMedium(t), DS;
}
var jS = EE(), wc = function() {
}, qa = b.forwardRef(function(e, t) {
  var o = b.useRef(null), i = b.useState({
    onScrollCapture: wc,
    onWheelCapture: wc,
    onTouchMoveCapture: wc
  }), a = i[0], f = i[1], d = e.forwardProps, p = e.children, m = e.className, y = e.removeScrollBar, v = e.enabled, l = e.shards, c = e.sideCar, S = e.noRelative, x = e.noIsolation, _ = e.inert, A = e.allowPinchZoom, T = e.as, C = T === void 0 ? "div" : T, E = e.gapMode, N = NS(e, ["forwardProps", "children", "className", "removeScrollBar", "enabled", "shards", "sideCar", "noRelative", "noIsolation", "inert", "allowPinchZoom", "as", "gapMode"]), O = c, W = bE([o, t]), H = nn(nn({}, N), a);
  return b.createElement(
    b.Fragment,
    null,
    v && b.createElement(O, { sideCar: jS, removeScrollBar: y, shards: l, noRelative: S, noIsolation: x, inert: _, setCallbacks: f, allowPinchZoom: !!A, lockRef: o, gapMode: E }),
    d ? b.cloneElement(b.Children.only(p), nn(nn({}, H), { ref: W })) : b.createElement(C, nn({}, H, { className: m, ref: W }), p)
  );
});
qa.defaultProps = {
  enabled: !0,
  removeScrollBar: !0,
  inert: !1
};
qa.classNames = {
  fullWidth: ka,
  zeroRight: Ta
};
var RE = function() {
  if (typeof __webpack_nonce__ < "u")
    return __webpack_nonce__;
};
function NE() {
  if (!document)
    return null;
  var e = document.createElement("style");
  e.type = "text/css";
  var t = RE();
  return t && e.setAttribute("nonce", t), e;
}
function DE(e, t) {
  e.styleSheet ? e.styleSheet.cssText = t : e.appendChild(document.createTextNode(t));
}
function jE(e) {
  var t = document.head || document.getElementsByTagName("head")[0];
  t.appendChild(e);
}
var IE = function() {
  var e = 0, t = null;
  return {
    add: function(o) {
      e == 0 && (t = NE()) && (DE(t, o), jE(t)), e++;
    },
    remove: function() {
      e--, !e && t && (t.parentNode && t.parentNode.removeChild(t), t = null);
    }
  };
}, FE = function() {
  var e = IE();
  return function(t, o) {
    b.useEffect(function() {
      return e.add(t), function() {
        e.remove();
      };
    }, [t && o]);
  };
}, IS = function() {
  var e = FE(), t = function(o) {
    var i = o.styles, a = o.dynamic;
    return e(i, a), null;
  };
  return t;
}, OE = {
  left: 0,
  top: 0,
  right: 0,
  gap: 0
}, xc = function(e) {
  return parseInt(e || "", 10) || 0;
}, LE = function(e) {
  var t = window.getComputedStyle(document.body), o = t[e === "padding" ? "paddingLeft" : "marginLeft"], i = t[e === "padding" ? "paddingTop" : "marginTop"], a = t[e === "padding" ? "paddingRight" : "marginRight"];
  return [xc(o), xc(i), xc(a)];
}, VE = function(e) {
  if (e === void 0 && (e = "margin"), typeof window > "u")
    return OE;
  var t = LE(e), o = document.documentElement.clientWidth, i = window.innerWidth;
  return {
    left: t[0],
    top: t[1],
    right: t[2],
    gap: Math.max(0, i - o + t[2] - t[0])
  };
}, zE = IS(), mo = "data-scroll-locked", BE = function(e, t, o, i) {
  var a = e.left, f = e.top, d = e.right, p = e.gap;
  return o === void 0 && (o = "margin"), `
  .`.concat(_E, ` {
   overflow: hidden `).concat(i, `;
   padding-right: `).concat(p, "px ").concat(i, `;
  }
  body[`).concat(mo, `] {
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
  
  .`).concat(Ta, ` {
    right: `).concat(p, "px ").concat(i, `;
  }
  
  .`).concat(ka, ` {
    margin-right: `).concat(p, "px ").concat(i, `;
  }
  
  .`).concat(Ta, " .").concat(Ta, ` {
    right: 0 `).concat(i, `;
  }
  
  .`).concat(ka, " .").concat(ka, ` {
    margin-right: 0 `).concat(i, `;
  }
  
  body[`).concat(mo, `] {
    `).concat(TE, ": ").concat(p, `px;
  }
`);
}, _g = function() {
  var e = parseInt(document.body.getAttribute(mo) || "0", 10);
  return isFinite(e) ? e : 0;
}, $E = function() {
  b.useEffect(function() {
    return document.body.setAttribute(mo, (_g() + 1).toString()), function() {
      var e = _g() - 1;
      e <= 0 ? document.body.removeAttribute(mo) : document.body.setAttribute(mo, e.toString());
    };
  }, []);
}, UE = function(e) {
  var t = e.noRelative, o = e.noImportant, i = e.gapMode, a = i === void 0 ? "margin" : i;
  $E();
  var f = b.useMemo(function() {
    return VE(a);
  }, [a]);
  return b.createElement(zE, { styles: BE(f, !t, a, o ? "" : "!important") });
}, Sd = !1;
if (typeof window < "u")
  try {
    var sa = Object.defineProperty({}, "passive", {
      get: function() {
        return Sd = !0, !0;
      }
    });
    window.addEventListener("test", sa, sa), window.removeEventListener("test", sa, sa);
  } catch {
    Sd = !1;
  }
var ro = Sd ? { passive: !1 } : !1, HE = function(e) {
  return e.tagName === "TEXTAREA";
}, FS = function(e, t) {
  if (!(e instanceof Element))
    return !1;
  var o = window.getComputedStyle(e);
  return (
    // not-not-scrollable
    o[t] !== "hidden" && // contains scroll inside self
    !(o.overflowY === o.overflowX && !HE(e) && o[t] === "visible")
  );
}, WE = function(e) {
  return FS(e, "overflowY");
}, GE = function(e) {
  return FS(e, "overflowX");
}, Tg = function(e, t) {
  var o = t.ownerDocument, i = t;
  do {
    typeof ShadowRoot < "u" && i instanceof ShadowRoot && (i = i.host);
    var a = OS(e, i);
    if (a) {
      var f = LS(e, i), d = f[1], p = f[2];
      if (d > p)
        return !0;
    }
    i = i.parentNode;
  } while (i && i !== o.body);
  return !1;
}, KE = function(e) {
  var t = e.scrollTop, o = e.scrollHeight, i = e.clientHeight;
  return [
    t,
    o,
    i
  ];
}, YE = function(e) {
  var t = e.scrollLeft, o = e.scrollWidth, i = e.clientWidth;
  return [
    t,
    o,
    i
  ];
}, OS = function(e, t) {
  return e === "v" ? WE(t) : GE(t);
}, LS = function(e, t) {
  return e === "v" ? KE(t) : YE(t);
}, QE = function(e, t) {
  return e === "h" && t === "rtl" ? -1 : 1;
}, XE = function(e, t, o, i, a) {
  var f = QE(e, window.getComputedStyle(t).direction), d = f * i, p = o.target, m = t.contains(p), y = !1, v = d > 0, l = 0, c = 0;
  do {
    if (!p)
      break;
    var S = LS(e, p), x = S[0], _ = S[1], A = S[2], T = _ - A - f * x;
    (x || T) && OS(e, p) && (l += T, c += x);
    var C = p.parentNode;
    p = C && C.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? C.host : C;
  } while (
    // portaled content
    !m && p !== document.body || // self content
    m && (t.contains(p) || t === p)
  );
  return (v && Math.abs(l) < 1 || !v && Math.abs(c) < 1) && (y = !0), y;
}, aa = function(e) {
  return "changedTouches" in e ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY] : [0, 0];
}, kg = function(e) {
  return [e.deltaX, e.deltaY];
}, Ag = function(e) {
  return e && "current" in e ? e.current : e;
}, ZE = function(e, t) {
  return e[0] === t[0] && e[1] === t[1];
}, JE = function(e) {
  return `
  .block-interactivity-`.concat(e, ` {pointer-events: none;}
  .allow-interactivity-`).concat(e, ` {pointer-events: all;}
`);
}, qE = 0, oo = [];
function eM(e) {
  var t = b.useRef([]), o = b.useRef([0, 0]), i = b.useRef(), a = b.useState(qE++)[0], f = b.useState(IS)[0], d = b.useRef(e);
  b.useEffect(function() {
    d.current = e;
  }, [e]), b.useEffect(function() {
    if (e.inert) {
      document.body.classList.add("block-interactivity-".concat(a));
      var _ = xE([e.lockRef.current], (e.shards || []).map(Ag), !0).filter(Boolean);
      return _.forEach(function(A) {
        return A.classList.add("allow-interactivity-".concat(a));
      }), function() {
        document.body.classList.remove("block-interactivity-".concat(a)), _.forEach(function(A) {
          return A.classList.remove("allow-interactivity-".concat(a));
        });
      };
    }
  }, [e.inert, e.lockRef.current, e.shards]);
  var p = b.useCallback(function(_, A) {
    if ("touches" in _ && _.touches.length === 2 || _.type === "wheel" && _.ctrlKey)
      return !d.current.allowPinchZoom;
    var T = aa(_), C = o.current, E = "deltaX" in _ ? _.deltaX : C[0] - T[0], N = "deltaY" in _ ? _.deltaY : C[1] - T[1], O, W = _.target, H = Math.abs(E) > Math.abs(N) ? "h" : "v";
    if ("touches" in _ && H === "h" && W.type === "range")
      return !1;
    var Y = window.getSelection(), L = Y && Y.anchorNode, X = L ? L === W || L.contains(W) : !1;
    if (X)
      return !1;
    var se = Tg(H, W);
    if (!se)
      return !0;
    if (se ? O = H : (O = H === "v" ? "h" : "v", se = Tg(H, W)), !se)
      return !1;
    if (!i.current && "changedTouches" in _ && (E || N) && (i.current = O), !O)
      return !0;
    var Z = i.current || O;
    return XE(Z, A, _, Z === "h" ? E : N);
  }, []), m = b.useCallback(function(_) {
    var A = _;
    if (!(!oo.length || oo[oo.length - 1] !== f)) {
      var T = "deltaY" in A ? kg(A) : aa(A), C = t.current.filter(function(O) {
        return O.name === A.type && (O.target === A.target || A.target === O.shadowParent) && ZE(O.delta, T);
      })[0];
      if (C && C.should) {
        A.cancelable && A.preventDefault();
        return;
      }
      if (!C) {
        var E = (d.current.shards || []).map(Ag).filter(Boolean).filter(function(O) {
          return O.contains(A.target);
        }), N = E.length > 0 ? p(A, E[0]) : !d.current.noIsolation;
        N && A.cancelable && A.preventDefault();
      }
    }
  }, []), y = b.useCallback(function(_, A, T, C) {
    var E = { name: _, delta: A, target: T, should: C, shadowParent: tM(T) };
    t.current.push(E), setTimeout(function() {
      t.current = t.current.filter(function(N) {
        return N !== E;
      });
    }, 1);
  }, []), v = b.useCallback(function(_) {
    o.current = aa(_), i.current = void 0;
  }, []), l = b.useCallback(function(_) {
    y(_.type, kg(_), _.target, p(_, e.lockRef.current));
  }, []), c = b.useCallback(function(_) {
    y(_.type, aa(_), _.target, p(_, e.lockRef.current));
  }, []);
  b.useEffect(function() {
    return oo.push(f), e.setCallbacks({
      onScrollCapture: l,
      onWheelCapture: l,
      onTouchMoveCapture: c
    }), document.addEventListener("wheel", m, ro), document.addEventListener("touchmove", m, ro), document.addEventListener("touchstart", v, ro), function() {
      oo = oo.filter(function(_) {
        return _ !== f;
      }), document.removeEventListener("wheel", m, ro), document.removeEventListener("touchmove", m, ro), document.removeEventListener("touchstart", v, ro);
    };
  }, []);
  var S = e.removeScrollBar, x = e.inert;
  return b.createElement(
    b.Fragment,
    null,
    x ? b.createElement(f, { styles: JE(a) }) : null,
    S ? b.createElement(UE, { noRelative: e.noRelative, gapMode: e.gapMode }) : null
  );
}
function tM(e) {
  for (var t = null; e !== null; )
    e instanceof ShadowRoot && (t = e.host, e = e.host), e = e.parentNode;
  return t;
}
const nM = ME(jS, eM);
var VS = b.forwardRef(function(e, t) {
  return b.createElement(qa, nn({}, e, { ref: t, sideCar: nM }));
});
VS.classNames = qa.classNames;
var rM = function(e) {
  if (typeof document > "u")
    return null;
  var t = Array.isArray(e) ? e[0] : e;
  return t.ownerDocument.body;
}, io = /* @__PURE__ */ new WeakMap(), la = /* @__PURE__ */ new WeakMap(), ua = {}, _c = 0, zS = function(e) {
  return e && (e.host || zS(e.parentNode));
}, oM = function(e, t) {
  return t.map(function(o) {
    if (e.contains(o))
      return o;
    var i = zS(o);
    return i && e.contains(i) ? i : (console.error("aria-hidden", o, "in not contained inside", e, ". Doing nothing"), null);
  }).filter(function(o) {
    return !!o;
  });
}, iM = function(e, t, o, i) {
  var a = oM(t, Array.isArray(e) ? e : [e]);
  ua[o] || (ua[o] = /* @__PURE__ */ new WeakMap());
  var f = ua[o], d = [], p = /* @__PURE__ */ new Set(), m = new Set(a), y = function(l) {
    !l || p.has(l) || (p.add(l), y(l.parentNode));
  };
  a.forEach(y);
  var v = function(l) {
    !l || m.has(l) || Array.prototype.forEach.call(l.children, function(c) {
      if (p.has(c))
        v(c);
      else
        try {
          var S = c.getAttribute(i), x = S !== null && S !== "false", _ = (io.get(c) || 0) + 1, A = (f.get(c) || 0) + 1;
          io.set(c, _), f.set(c, A), d.push(c), _ === 1 && x && la.set(c, !0), A === 1 && c.setAttribute(o, "true"), x || c.setAttribute(i, "true");
        } catch (T) {
          console.error("aria-hidden: cannot operate on ", c, T);
        }
    });
  };
  return v(t), p.clear(), _c++, function() {
    d.forEach(function(l) {
      var c = io.get(l) - 1, S = f.get(l) - 1;
      io.set(l, c), f.set(l, S), c || (la.has(l) || l.removeAttribute(i), la.delete(l)), S || l.removeAttribute(o);
    }), _c--, _c || (io = /* @__PURE__ */ new WeakMap(), io = /* @__PURE__ */ new WeakMap(), la = /* @__PURE__ */ new WeakMap(), ua = {});
  };
}, sM = function(e, t, o) {
  o === void 0 && (o = "data-aria-hidden");
  var i = Array.from(Array.isArray(e) ? e : [e]), a = rM(e);
  return a ? (i.push.apply(i, Array.from(a.querySelectorAll("[aria-live], script"))), iM(i, a, o, "aria-hidden")) : function() {
    return null;
  };
}, aM = Object.defineProperty, Kt = (e, t) => aM(e, "name", { value: t, configurable: !0 }), wf = "Dialog", [BS, aN] = /* @__PURE__ */ iS(wf), [lM, wn] = BS(wf), uM = /* @__PURE__ */ Kt((e) => {
  const {
    __scopeDialog: t,
    children: o,
    open: i,
    defaultOpen: a,
    onOpenChange: f,
    modal: d = !0
  } = e, p = b.useRef(null), m = b.useRef(null), [y, v] = lS({
    prop: i,
    defaultProp: a ?? !1,
    onChange: f,
    caller: wf
  }), [l, c] = b.useState(0), [S, x] = b.useState(0);
  return /* @__PURE__ */ w.jsx(
    lM,
    {
      scope: t,
      triggerRef: p,
      contentRef: m,
      contentId: _a(),
      titleId: _a(),
      descriptionId: _a(),
      titlePresent: l > 0,
      descriptionPresent: S > 0,
      setTitleCount: c,
      setDescriptionCount: x,
      open: y,
      onOpenChange: v,
      onOpenToggle: b.useCallback(() => v((_) => !_), [v]),
      modal: d,
      children: o
    }
  );
}, "Dialog"), $S = "DialogPortal", [cM, US] = BS($S, {
  forceMount: void 0
}), dM = /* @__PURE__ */ Kt((e) => {
  const { __scopeDialog: t, forceMount: o, children: i, container: a } = e, f = wn($S, t);
  return /* @__PURE__ */ w.jsx(cM, { scope: t, forceMount: o, children: b.Children.map(i, (d) => /* @__PURE__ */ w.jsx(gf, { present: o || f.open, children: /* @__PURE__ */ w.jsx(gE, { asChild: !0, container: a, children: d }) })) });
}, "DialogPortal"), wd = "DialogOverlay", fM = /* @__PURE__ */ b.forwardRef(
  /* @__PURE__ */ Kt(function(t, o) {
    const i = US(wd, t.__scopeDialog), { forceMount: a = i.forceMount, ...f } = t, d = wn(wd, t.__scopeDialog);
    return d.modal ? /* @__PURE__ */ w.jsx(gf, { present: a || d.open, children: /* @__PURE__ */ w.jsx(mM, { ...f, ref: o }) }) : null;
  }, "DialogOverlay")
), pM = /* @__PURE__ */ mf("DialogOverlay.RemoveScroll"), mM = /* @__PURE__ */ b.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Kt(function(t, o) {
    const { __scopeDialog: i, ...a } = t, f = wn(wd, i), d = SS(), p = To(o, d);
    return (
      // Make sure `Content` is scrollable even when it doesn't live inside `RemoveScroll`
      // ie. when `Overlay` and `Content` are siblings
      /* @__PURE__ */ w.jsx(VS, { as: pM, allowPinchZoom: !0, shards: [f.contentRef], children: /* @__PURE__ */ w.jsx(
        ko.div,
        {
          "data-state": xf(f.open),
          ...a,
          ref: p,
          style: { pointerEvents: "auto", ...a.style }
        }
      ) })
    );
  }, "DialogOverlayImpl")
), Pi = "DialogContent", hM = /* @__PURE__ */ b.forwardRef(
  /* @__PURE__ */ Kt(function(t, o) {
    const i = US(Pi, t.__scopeDialog), { forceMount: a = i.forceMount, ...f } = t, d = wn(Pi, t.__scopeDialog);
    return /* @__PURE__ */ w.jsx(gf, { present: a || d.open, children: d.modal ? /* @__PURE__ */ w.jsx(yM, { ...f, ref: o }) : /* @__PURE__ */ w.jsx(gM, { ...f, ref: o }) });
  }, "DialogContent")
), yM = /* @__PURE__ */ b.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Kt(function(t, o) {
    const i = wn(Pi, t.__scopeDialog), a = b.useRef(null), f = To(o, i.contentRef, a);
    return b.useEffect(() => {
      const d = a.current;
      if (d) return sM(d);
    }, []), /* @__PURE__ */ w.jsx(
      HS,
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
), gM = /* @__PURE__ */ b.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Kt(function(t, o) {
    const i = wn(Pi, t.__scopeDialog), a = b.useRef(!1), f = b.useRef(!1);
    return /* @__PURE__ */ w.jsx(
      HS,
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
          var y, v;
          (y = t.onInteractOutside) == null || y.call(t, d), d.defaultPrevented || (a.current = !0, d.detail.originalEvent.type === "pointerdown" && (f.current = !0));
          const p = d.target;
          ((v = i.triggerRef.current) == null ? void 0 : v.contains(p)) && d.preventDefault(), d.detail.originalEvent.type === "focusin" && f.current && d.preventDefault();
        }
      }
    );
  }, "DialogContentNonModal")
), HS = /* @__PURE__ */ b.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Kt(function(t, o) {
    const { __scopeDialog: i, trapFocus: a, onOpenAutoFocus: f, onCloseAutoFocus: d, ...p } = t, m = wn(Pi, i);
    return Sf(), /* @__PURE__ */ w.jsx(w.Fragment, { children: /* @__PURE__ */ w.jsx(
      mE,
      {
        asChild: !0,
        loop: !0,
        trapped: a,
        onMountAutoFocus: f,
        onUnmountAutoFocus: d,
        children: /* @__PURE__ */ w.jsx(
          dE,
          {
            role: "dialog",
            id: m.contentId,
            "aria-describedby": m.descriptionPresent ? m.descriptionId : void 0,
            "aria-labelledby": m.titlePresent ? m.titleId : void 0,
            "data-state": xf(m.open),
            ...p,
            ref: o,
            deferPointerDownOutside: !0,
            onDismiss: () => m.onOpenChange(!1)
          }
        )
      }
    ) });
  }, "DialogContentImpl")
), vM = "DialogTitle", SM = /* @__PURE__ */ b.forwardRef(
  /* @__PURE__ */ Kt(function(t, o) {
    const { __scopeDialog: i, ...a } = t, f = wn(vM, i), { setTitleCount: d } = f;
    return Jn(() => (d((p) => p + 1), () => d((p) => p - 1)), [d]), /* @__PURE__ */ w.jsx(ko.h2, { id: f.titleId, ...a, ref: o });
  }, "DialogTitle")
), wM = "DialogDescription", xM = /* @__PURE__ */ b.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Kt(function(t, o) {
    const { __scopeDialog: i, ...a } = t, f = wn(wM, i), { setDescriptionCount: d } = f;
    return Jn(() => (d((p) => p + 1), () => d((p) => p - 1)), [d]), /* @__PURE__ */ w.jsx(ko.p, { id: f.descriptionId, ...a, ref: o });
  }, "DialogDescription")
);
function xf(e) {
  return e ? "open" : "closed";
}
Kt(xf, "getState");
function _M() {
  const e = K((a) => a.summaryRecord), t = K((a) => a.closeSummary), o = K((a) => a.startTimer), i = Z0(e == null ? void 0 : e.selectedScene);
  return /* @__PURE__ */ w.jsx(uM, { open: !!e, onOpenChange: (a) => !a && t(), children: /* @__PURE__ */ w.jsx(Ya, { children: e ? /* @__PURE__ */ w.jsxs(dM, { forceMount: !0, children: [
    /* @__PURE__ */ w.jsx(fM, { asChild: !0, children: /* @__PURE__ */ w.jsx(
      vn.div,
      {
        className: "summary-overlay",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
      }
    ) }),
    /* @__PURE__ */ w.jsx(hM, { asChild: !0, children: /* @__PURE__ */ w.jsxs(
      vn.article,
      {
        className: "summary-card liquid-glass",
        initial: { opacity: 0, y: 18, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 18, scale: 0.98 },
        children: [
          /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Session complete" }),
          /* @__PURE__ */ w.jsx(SM, { children: "Focus block complete" }),
          /* @__PURE__ */ w.jsx(xM, { className: "sr-only", children: "Summary of the completed focus block." }),
          /* @__PURE__ */ w.jsx("p", { children: "You protected a focused block in your quiet study room." }),
          /* @__PURE__ */ w.jsxs("div", { className: "summary-grid", children: [
            /* @__PURE__ */ w.jsxs("div", { className: "summary-stat liquid-glass-lite", children: [
              /* @__PURE__ */ w.jsx("span", { children: "Focus time" }),
              /* @__PURE__ */ w.jsx("strong", { children: F0(e.totalFocusTime) })
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
              /* @__PURE__ */ w.jsx("strong", { children: i.title })
            ] }),
            /* @__PURE__ */ w.jsxs("div", { className: "summary-stat liquid-glass-lite", children: [
              /* @__PURE__ */ w.jsx("span", { children: "Room state" }),
              /* @__PURE__ */ w.jsx("strong", { children: "Saved" })
            ] })
          ] }),
          e.persisted === !1 ? /* @__PURE__ */ w.jsx("p", { children: "This session is visible for now, but could not be saved to this device history." }) : null,
          /* @__PURE__ */ w.jsxs("div", { className: "focus-button-row", children: [
            /* @__PURE__ */ w.jsx(Te, { variant: "primary", onClick: () => {
              t(), o();
            }, children: "Continue studying" }),
            /* @__PURE__ */ w.jsx(Te, { onClick: t, children: "Done" })
          ] })
        ]
      }
    ) })
  ] }) : null }) });
}
function WS(e, [t, o]) {
  return Math.min(o, Math.max(t, e));
}
function fo(e, t, { checkForDefaultPrevented: o = !0 } = {}) {
  return function(a) {
    if (e == null || e(a), o === !1 || !a.defaultPrevented)
      return t == null ? void 0 : t(a);
  };
}
function bg(e, t) {
  if (typeof e == "function")
    return e(t);
  e != null && (e.current = t);
}
function TM(...e) {
  return (t) => {
    let o = !1;
    const i = e.map((a) => {
      const f = bg(a, t);
      return !o && typeof f == "function" && (o = !0), f;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const f = i[a];
          typeof f == "function" ? f() : bg(e[a], null);
        }
      };
  };
}
function qn(...e) {
  return b.useCallback(TM(...e), e);
}
function GS(e, t = []) {
  let o = [];
  function i(f, d) {
    const p = b.createContext(d);
    p.displayName = f + "Context";
    const m = o.length;
    o = [...o, d];
    const y = (l) => {
      var T;
      const { scope: c, children: S, ...x } = l, _ = ((T = c == null ? void 0 : c[e]) == null ? void 0 : T[m]) || p, A = b.useMemo(() => x, Object.values(x));
      return /* @__PURE__ */ w.jsx(_.Provider, { value: A, children: S });
    };
    y.displayName = f + "Provider";
    function v(l, c) {
      var _;
      const S = ((_ = c == null ? void 0 : c[e]) == null ? void 0 : _[m]) || p, x = b.useContext(S);
      if (x) return x;
      if (d !== void 0) return d;
      throw new Error(`\`${l}\` must be used within \`${f}\``);
    }
    return [y, v];
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
  return a.scopeName = e, [i, kM(a, ...t)];
}
function kM(...e) {
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
var KS = globalThis != null && globalThis.document ? b.useLayoutEffect : () => {
}, AM = Er[" useInsertionEffect ".trim().toString()] || KS;
function bM({
  prop: e,
  defaultProp: t,
  onChange: o = () => {
  },
  caller: i
}) {
  const [a, f, d] = CM({
    defaultProp: t,
    onChange: o
  }), p = e !== void 0, m = p ? e : a;
  {
    const v = b.useRef(e !== void 0);
    b.useEffect(() => {
      const l = v.current;
      l !== p && console.warn(
        `${i} is changing from ${l ? "controlled" : "uncontrolled"} to ${p ? "controlled" : "uncontrolled"}. Components should not switch from controlled to uncontrolled (or vice versa). Decide between using a controlled or uncontrolled value for the lifetime of the component.`
      ), v.current = p;
    }, [p, i]);
  }
  const y = b.useCallback(
    (v) => {
      var l;
      if (p) {
        const c = PM(v) ? v(e) : v;
        c !== e && ((l = d.current) == null || l.call(d, c));
      } else
        f(v);
    },
    [p, e, f, d]
  );
  return [m, y];
}
function CM({
  defaultProp: e,
  onChange: t
}) {
  const [o, i] = b.useState(e), a = b.useRef(o), f = b.useRef(t);
  return AM(() => {
    f.current = t;
  }, [t]), b.useEffect(() => {
    var d;
    a.current !== o && ((d = f.current) == null || d.call(f, o), a.current = o);
  }, [o, a]), [o, i, f];
}
function PM(e) {
  return typeof e == "function";
}
var EM = b.createContext(void 0);
function MM(e) {
  const t = b.useContext(EM);
  return e || t || "ltr";
}
function RM(e) {
  const t = b.useRef({ value: e, previous: e });
  return b.useMemo(() => (t.current.value !== e && (t.current.previous = t.current.value, t.current.value = e), t.current.previous), [e]);
}
function NM(e) {
  const [t, o] = b.useState(void 0);
  return KS(() => {
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
function xd(e) {
  const t = b.forwardRef((o, i) => {
    let { children: a, ...f } = o, d = null, p = !1;
    const m = [];
    Cg(a) && typeof ca == "function" && (a = ca(a._payload)), b.Children.forEach(a, (c) => {
      var S;
      if (OM(c)) {
        p = !0;
        const x = c;
        let _ = "child" in x.props ? x.props.child : x.props.children;
        Cg(_) && typeof ca == "function" && (_ = ca(_._payload)), d = jM(x, _), m.push((S = d == null ? void 0 : d.props) == null ? void 0 : S.children);
      } else
        m.push(c);
    }), d ? d = b.cloneElement(d, void 0, m) : (
      // A `Slottable` was found but it didn't resolve to a single element (e.g.
      // it wrapped multiple elements, text, or a render-prop `child` that
      // wasn't an element). Don't fall back to treating the `Slottable` wrapper
      // itself as the slot target — throw a descriptive error below instead.
      !p && b.Children.count(a) === 1 && b.isValidElement(a) && (d = a)
    );
    const y = d ? FM(d) : void 0, v = qn(i, y);
    if (!d) {
      if (a || a === 0)
        throw new Error(
          p ? BM(e) : zM(e)
        );
      return a;
    }
    const l = IM(f, d.props ?? {});
    return d.type !== b.Fragment && (l.ref = i ? v : y), b.cloneElement(d, l);
  });
  return t.displayName = `${e}.Slot`, t;
}
var DM = Symbol.for("radix.slottable"), jM = (e, t) => {
  if ("child" in e.props) {
    const o = e.props.child;
    return b.isValidElement(o) ? b.cloneElement(o, void 0, e.props.children(o.props.children)) : null;
  }
  return b.isValidElement(t) ? t : null;
};
function IM(e, t) {
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
function FM(e) {
  var i, a;
  let t = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = t && "isReactWarning" in t && t.isReactWarning;
  return o ? e.ref : (t = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = t && "isReactWarning" in t && t.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
function OM(e) {
  return b.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === DM;
}
var LM = Symbol.for("react.lazy");
function Cg(e) {
  return e != null && typeof e == "object" && "$$typeof" in e && e.$$typeof === LM && "_payload" in e && VM(e._payload);
}
function VM(e) {
  return typeof e == "object" && e !== null && "then" in e;
}
var zM = (e) => `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`, BM = (e) => `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`, ca = Er[" use ".trim().toString()], $M = [
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
], Li = $M.reduce((e, t) => {
  const o = /* @__PURE__ */ xd(`Primitive.${t}`), i = b.forwardRef((a, f) => {
    const { asChild: d, ...p } = a, m = d ? o : t;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ w.jsx(m, { ...p, ref: f });
  });
  return i.displayName = `Primitive.${t}`, { ...e, [t]: i };
}, {});
function UM(e) {
  const t = e + "CollectionProvider", [o, i] = GS(t), [a, f] = o(
    t,
    { collectionRef: { current: null }, itemMap: /* @__PURE__ */ new Map() }
  ), d = (_) => {
    const { scope: A, children: T } = _, C = b.useRef(null), E = b.useRef(/* @__PURE__ */ new Map()).current;
    return /* @__PURE__ */ w.jsx(a, { scope: A, itemMap: E, collectionRef: C, children: T });
  };
  d.displayName = t;
  const p = e + "CollectionSlot", m = /* @__PURE__ */ xd(p), y = b.forwardRef(
    (_, A) => {
      const { scope: T, children: C } = _, E = f(p, T), N = qn(A, E.collectionRef);
      return /* @__PURE__ */ w.jsx(m, { ref: N, children: C });
    }
  );
  y.displayName = p;
  const v = e + "CollectionItemSlot", l = "data-radix-collection-item", c = /* @__PURE__ */ xd(v), S = b.forwardRef(
    (_, A) => {
      const { scope: T, children: C, ...E } = _, N = b.useRef(null), O = qn(A, N), W = f(v, T);
      return b.useEffect(() => (W.itemMap.set(N, { ref: N, ...E }), () => void W.itemMap.delete(N))), /* @__PURE__ */ w.jsx(c, { [l]: "", ref: O, children: C });
    }
  );
  S.displayName = v;
  function x(_) {
    const A = f(e + "CollectionConsumer", _);
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
    { Provider: d, Slot: y, ItemSlot: S },
    x,
    i
  ];
}
var YS = ["PageUp", "PageDown"], QS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"], XS = {
  "from-left": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-right": ["Home", "PageDown", "ArrowDown", "ArrowRight"],
  "from-bottom": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-top": ["Home", "PageDown", "ArrowUp", "ArrowLeft"]
}, Ao = "Slider", [_d, HM, WM] = UM(Ao), [_f] = GS(Ao, [
  WM
]), [GM, Vi] = _f(Ao), Tf = b.forwardRef(
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
      value: v,
      onValueChange: l = () => {
      },
      onValueCommit: c = () => {
      },
      inverted: S = !1,
      form: x,
      ..._
    } = e, A = b.useRef(/* @__PURE__ */ new Set()), T = b.useRef(0), C = b.useRef(!1), N = d === "horizontal" ? KM : YM, [O = [], W] = bM({
      prop: v,
      defaultProp: y,
      onChange: (Z) => {
        var ce;
        (ce = [...A.current][T.current]) == null || ce.focus({
          preventScroll: !0,
          focusVisible: C.current
        }), C.current = !1, l(Z);
      }
    }), H = b.useRef(O);
    function Y(Z) {
      const de = JM(O, Z);
      se(Z, de);
    }
    function L(Z) {
      se(Z, T.current);
    }
    function X() {
      const Z = H.current[T.current];
      O[T.current] !== Z && c(O);
    }
    function se(Z, de, { commit: ce } = { commit: !1 }) {
      const ye = nR(f), ee = rR(Math.round((Z - i) / f) * f + i, ye), we = WS(ee, [i, a]);
      W(($ = []) => {
        const J = XM($, we, de);
        if (tR(J, m * f)) {
          T.current = J.indexOf(we);
          const Q = String(J) !== String($);
          return Q && ce && c(J), Q ? J : $;
        } else
          return $;
      });
    }
    return /* @__PURE__ */ w.jsx(
      GM,
      {
        scope: e.__scopeSlider,
        name: o,
        disabled: p,
        min: i,
        max: a,
        valueIndexToChangeRef: T,
        thumbs: A.current,
        values: O,
        orientation: d,
        form: x,
        children: /* @__PURE__ */ w.jsx(_d.Provider, { scope: e.__scopeSlider, children: /* @__PURE__ */ w.jsx(_d.Slot, { scope: e.__scopeSlider, children: /* @__PURE__ */ w.jsx(
          N,
          {
            "aria-disabled": p,
            "data-disabled": p ? "" : void 0,
            ..._,
            ref: t,
            onPointerDown: fo(_.onPointerDown, () => {
              p || (H.current = O, C.current = !1);
            }),
            min: i,
            max: a,
            inverted: S,
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
                const ee = YS.includes(Z.key) || Z.shiftKey && QS.includes(Z.key) ? 10 : 1, we = T.current, $ = O[we], J = f * ee * de;
                se($ + J, we, { commit: !0 });
              }
            }
          }
        ) }) })
      }
    );
  }
);
Tf.displayName = Ao;
var [ZS, JS] = _f(Ao, {
  startEdge: "left",
  endEdge: "right",
  size: "width",
  direction: 1
}), KM = b.forwardRef(
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
      ...v
    } = e, [l, c] = b.useState(null), S = qn(t, (E) => c(E)), x = b.useRef(void 0), _ = MM(a), A = _ === "ltr", T = A && !f || !A && f;
    function C(E) {
      const N = x.current || l.getBoundingClientRect(), O = [0, N.width], H = Cf(O, T ? [o, i] : [i, o]);
      return x.current = N, H(E - N.left);
    }
    return /* @__PURE__ */ w.jsx(
      ZS,
      {
        scope: e.__scopeSlider,
        startEdge: T ? "left" : "right",
        endEdge: T ? "right" : "left",
        direction: T ? 1 : -1,
        size: "width",
        children: /* @__PURE__ */ w.jsx(
          qS,
          {
            dir: _,
            "data-orientation": "horizontal",
            ...v,
            ref: S,
            style: {
              ...v.style,
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
              x.current = void 0, m == null || m();
            },
            onStepKeyDown: (E) => {
              const O = XS[T ? "from-left" : "from-right"].includes(E.key);
              y == null || y({ event: E, direction: O ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), YM = b.forwardRef(
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
    } = e, v = b.useRef(null), l = qn(t, v), c = b.useRef(void 0), S = !a;
    function x(_) {
      const A = c.current || v.current.getBoundingClientRect(), T = [0, A.height], E = Cf(T, S ? [i, o] : [o, i]);
      return c.current = A, E(_ - A.top);
    }
    return /* @__PURE__ */ w.jsx(
      ZS,
      {
        scope: e.__scopeSlider,
        startEdge: S ? "bottom" : "top",
        endEdge: S ? "top" : "bottom",
        size: "height",
        direction: S ? 1 : -1,
        children: /* @__PURE__ */ w.jsx(
          qS,
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
              f == null || f(A);
            },
            onSlideMove: (_) => {
              const A = x(_.clientY);
              d == null || d(A);
            },
            onSlideEnd: () => {
              c.current = void 0, p == null || p();
            },
            onStepKeyDown: (_) => {
              const T = XS[S ? "from-bottom" : "from-top"].includes(_.key);
              m == null || m({ event: _, direction: T ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), qS = b.forwardRef(
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
    } = e, v = Vi(Ao, o);
    return /* @__PURE__ */ w.jsx(
      Li.span,
      {
        ...y,
        ref: t,
        onKeyDown: fo(e.onKeyDown, (l) => {
          l.key === "Home" ? (d(l), l.preventDefault()) : l.key === "End" ? (p(l), l.preventDefault()) : YS.concat(QS).includes(l.key) && (m(l), l.preventDefault());
        }),
        onPointerDown: fo(e.onPointerDown, (l) => {
          const c = l.target;
          c.setPointerCapture(l.pointerId), l.preventDefault(), v.thumbs.has(c) ? c.focus({ preventScroll: !0, focusVisible: !1 }) : i(l);
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
), ew = "SliderTrack", kf = b.forwardRef(
  (e, t) => {
    const { __scopeSlider: o, ...i } = e, a = Vi(ew, o);
    return /* @__PURE__ */ w.jsx(
      Li.span,
      {
        "data-disabled": a.disabled ? "" : void 0,
        "data-orientation": a.orientation,
        ...i,
        ref: t
      }
    );
  }
);
kf.displayName = ew;
var Td = "SliderRange", Af = b.forwardRef(
  (e, t) => {
    const { __scopeSlider: o, ...i } = e, a = Vi(Td, o), f = JS(Td, o), d = b.useRef(null), p = qn(t, d), m = a.values.length, y = a.values.map(
      (c) => lw(c, a.min, a.max)
    ), v = m > 1 ? Math.min(...y) : 0, l = 100 - Math.max(...y);
    return /* @__PURE__ */ w.jsx(
      Li.span,
      {
        "data-orientation": a.orientation,
        "data-disabled": a.disabled ? "" : void 0,
        ...i,
        ref: p,
        style: {
          ...e.style,
          [f.startEdge]: v + "%",
          [f.endEdge]: l + "%"
        }
      }
    );
  }
);
Af.displayName = Td;
var tw = "SliderThumb", [QM, nw] = _f(tw), rw = "SliderThumbProvider";
function ow(e) {
  const {
    __scopeSlider: t,
    name: o,
    children: i,
    // @ts-expect-error internal render prop
    internal_do_not_use_render: a
  } = e, f = Vi(rw, t), d = HM(t), [p, m] = b.useState(null), y = b.useMemo(
    () => p ? d().findIndex((A) => A.ref.current === p) : -1,
    [d, p]
  ), v = NM(p), l = p ? !!f.form || !!p.closest("form") : !0, c = f.values[y], S = o ?? (f.name ? f.name + (f.values.length > 1 ? "[]" : "") : void 0), x = c === void 0 ? 0 : lw(c, f.min, f.max);
  b.useEffect(() => {
    if (p)
      return f.thumbs.add(p), () => {
        f.thumbs.delete(p);
      };
  }, [p, f.thumbs]);
  const _ = {
    value: c,
    name: S,
    form: f.form,
    isFormControl: l,
    index: y,
    thumb: p,
    onThumbChange: m,
    percent: x,
    size: v
  };
  return /* @__PURE__ */ w.jsx(QM, { scope: t, ..._, children: oR(a) ? a(_) : i });
}
ow.displayName = rw;
var Aa = "SliderThumbTrigger", iw = b.forwardRef(
  (e, t) => {
    const { __scopeSlider: o, ...i } = e, a = Vi(Aa, o), f = JS(Aa, o), { index: d, value: p, percent: m, size: y, onThumbChange: v } = nw(
      Aa,
      o
    ), l = qn(t, (_) => v(_)), c = ZM(d, a.values.length), S = y == null ? void 0 : y[f.size], x = S ? qM(S, m, f.direction) : 0;
    return /* @__PURE__ */ w.jsx(
      "span",
      {
        style: {
          transform: "var(--radix-slider-thumb-transform)",
          position: "absolute",
          [f.startEdge]: `calc(${m}% + ${x}px)`
        },
        children: /* @__PURE__ */ w.jsx(_d.ItemSlot, { scope: o, children: /* @__PURE__ */ w.jsx(
          Li.span,
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
iw.displayName = Aa;
var bf = b.forwardRef(
  (e, t) => {
    const { __scopeSlider: o, name: i, ...a } = e;
    return /* @__PURE__ */ w.jsx(
      ow,
      {
        __scopeSlider: o,
        name: i,
        internal_do_not_use_render: ({ index: f, isFormControl: d }) => /* @__PURE__ */ w.jsxs(w.Fragment, { children: [
          /* @__PURE__ */ w.jsx(
            iw,
            {
              ...a,
              ref: t,
              __scopeSlider: o
            }
          ),
          d ? /* @__PURE__ */ w.jsx(
            aw,
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
bf.displayName = tw;
var sw = "SliderBubbleInput", aw = b.forwardRef(
  ({ __scopeSlider: e, ...t }, o) => {
    const { value: i, name: a, form: f } = nw(sw, e), d = b.useRef(null), p = qn(d, o), m = RM(i);
    return b.useEffect(() => {
      const y = d.current;
      if (!y) return;
      const v = window.HTMLInputElement.prototype, c = Object.getOwnPropertyDescriptor(v, "value").set;
      if (m !== i && c) {
        const S = new Event("input", { bubbles: !0 });
        c.call(y, i), y.dispatchEvent(S);
      }
    }, [m, i]), /* @__PURE__ */ w.jsx(
      Li.input,
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
aw.displayName = sw;
function XM(e = [], t, o) {
  const i = [...e];
  return i[o] = t, i.sort((a, f) => a - f);
}
function lw(e, t, o) {
  const f = 100 / (o - t) * (e - t);
  return WS(f, [0, 100]);
}
function ZM(e, t) {
  return t > 2 ? `Value ${e + 1} of ${t}` : t === 2 ? ["Minimum", "Maximum"][e] : void 0;
}
function JM(e, t) {
  if (e.length === 1) return 0;
  const o = e.map((a) => Math.abs(a - t)), i = Math.min(...o);
  return o.indexOf(i);
}
function qM(e, t, o) {
  const i = e / 2, f = Cf([0, 50], [0, i]);
  return (i - f(t) * o) * o;
}
function eR(e) {
  return e.slice(0, -1).map((t, o) => e[o + 1] - t);
}
function tR(e, t) {
  if (t > 0) {
    const o = eR(e);
    return Math.min(...o) >= t;
  }
  return !0;
}
function Cf(e, t) {
  return (o) => {
    if (e[0] === e[1] || t[0] === t[1]) return t[0];
    const i = (t[1] - t[0]) / (e[1] - e[0]);
    return t[0] + i * (o - e[0]);
  };
}
function nR(e) {
  if (!Number.isFinite(e)) return 0;
  const t = e.toString();
  if (t.includes("e")) {
    const [i, a] = t.split("e"), f = i.split(".")[1] || "", d = Number(a);
    return Math.max(0, f.length - d);
  }
  const o = t.split(".")[1];
  return o ? o.length : 0;
}
function rR(e, t) {
  const o = Math.pow(10, t);
  return Math.round(e * o) / o;
}
function oR(e) {
  return typeof e == "function";
}
function Pg({ label: e, icon: t, value: o, onChange: i }) {
  return /* @__PURE__ */ w.jsxs("label", { className: "sound-slider", children: [
    /* @__PURE__ */ w.jsxs("span", { className: "sound-slider-head", children: [
      /* @__PURE__ */ w.jsxs("span", { className: "sound-slider-label", children: [
        t,
        /* @__PURE__ */ w.jsx("span", { children: e })
      ] }),
      /* @__PURE__ */ w.jsxs("strong", { children: [
        o,
        "%"
      ] })
    ] }),
    /* @__PURE__ */ w.jsxs(
      Tf,
      {
        className: "radix-slider-root",
        value: [o],
        min: 0,
        max: 100,
        step: 1,
        onValueChange: (a) => i(a[0]),
        children: [
          /* @__PURE__ */ w.jsx(kf, { className: "radix-slider-track", children: /* @__PURE__ */ w.jsx(Af, { className: "radix-slider-range" }) }),
          /* @__PURE__ */ w.jsx(bf, { className: "radix-slider-thumb", "aria-label": e })
        ]
      }
    )
  ] });
}
function iR({ audioState: e }) {
  const t = K((c) => c.musicType), o = K((c) => c.ambientSound), i = K((c) => c.musicVolume), a = K((c) => c.ambientVolume), f = K((c) => c.audioPlaying), d = K((c) => c.setSound), p = K((c) => c.applyAudioPreset), m = K((c) => c.toggleAudio), y = Ii({ musicType: t, ambientSound: o }), v = Ub({ musicType: t, ambientSound: o }), l = y.ambientLayers.map((c) => c.title).filter(Boolean).join(" + ");
  return /* @__PURE__ */ w.jsxs("div", { className: "sound-panel", children: [
    /* @__PURE__ */ w.jsx("div", { className: "sound-preset-list", "aria-label": "Focus audio presets", children: wi.map((c) => /* @__PURE__ */ w.jsxs(
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
      /* @__PURE__ */ w.jsx("select", { value: t, onChange: (c) => d("musicType", c.target.value), children: Gn.map((c) => /* @__PURE__ */ w.jsx("option", { value: c.label, children: c.label }, c.label)) })
    ] }),
    /* @__PURE__ */ w.jsx(
      Pg,
      {
        label: "Music volume",
        icon: /* @__PURE__ */ w.jsx(Ja, { size: 16, "aria-hidden": "true" }),
        value: i,
        onChange: (c) => d("musicVolume", c)
      }
    ),
    /* @__PURE__ */ w.jsxs("label", { className: "focus-field", children: [
      "Ambient sound selector",
      /* @__PURE__ */ w.jsx("select", { value: o, onChange: (c) => d("ambientSound", c.target.value), children: Kn.map((c) => /* @__PURE__ */ w.jsx("option", { value: c.label, children: c.label }, c.label)) })
    ] }),
    /* @__PURE__ */ w.jsx(
      Pg,
      {
        label: "Ambient volume",
        icon: /* @__PURE__ */ w.jsx(lf, { size: 16, "aria-hidden": "true" }),
        value: a,
        onChange: (c) => d("ambientVolume", c)
      }
    ),
    /* @__PURE__ */ w.jsxs("div", { className: "audio-preview liquid-glass-lite", children: [
      /* @__PURE__ */ w.jsxs("div", { children: [
        /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Theme audio preview" }),
        /* @__PURE__ */ w.jsx("strong", { children: y.musicTrack.title }),
        /* @__PURE__ */ w.jsx("p", { children: l }),
        e != null && e.error ? /* @__PURE__ */ w.jsx("p", { className: "audio-error", children: e.error }) : null
      ] }),
      /* @__PURE__ */ w.jsx(Te, { variant: f ? "primary" : "ghost", onClick: m, children: f ? "Pause audio" : "Play audio" })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "audio-links", children: [y.musicTrack, ...y.ambientLayers].filter((c) => c == null ? void 0 : c.pageUrl).map((c) => /* @__PURE__ */ w.jsx("a", { href: c.pageUrl, target: "_blank", rel: "noreferrer", children: c.title || c.label || "Audio source" }, c.pageUrl)) })
  ] });
}
const sR = [
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
], aR = [
  ["white-noise", "White noise"],
  ["pink-noise", "Pink noise"],
  ["brown-noise", "Brown noise"]
], lR = [
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
function da({ id: e, label: t, value: o, icon: i = null, onChange: a, card: f = !1 }) {
  const d = Number.isFinite(Number(o)) ? Number(o) : 0, p = d > 0;
  return /* @__PURE__ */ w.jsxs("label", { className: [
    "room-channel",
    i ? "room-channel-master" : "",
    f ? "room-channel-card" : "",
    p ? "is-active" : ""
  ].filter(Boolean).join(" "), children: [
    /* @__PURE__ */ w.jsxs("span", { className: "room-channel-head", children: [
      /* @__PURE__ */ w.jsxs("span", { className: "room-channel-label", children: [
        i || /* @__PURE__ */ w.jsx("i", { className: `mixer-channel-dot mixer-${e}`, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: t })
      ] }),
      /* @__PURE__ */ w.jsxs("strong", { children: [
        d,
        "%"
      ] })
    ] }),
    /* @__PURE__ */ w.jsxs(
      Tf,
      {
        className: "radix-slider-root",
        value: [d],
        min: 0,
        max: 100,
        step: 1,
        onValueChange: (m) => a(e, m[0]),
        children: [
          /* @__PURE__ */ w.jsx(kf, { className: "radix-slider-track", children: /* @__PURE__ */ w.jsx(Af, { className: "radix-slider-range" }) }),
          /* @__PURE__ */ w.jsx(bf, { className: "radix-slider-thumb", "aria-label": `${t} volume` })
        ]
      }
    )
  ] });
}
function uR({ audioState: e, scene: t, onClose: o }) {
  const i = K((T) => T.audioChannels), a = K((T) => T.setSound), f = K((T) => T.returnToSetup), d = K((T) => T.musicType), p = K((T) => T.ambientSound), m = K((T) => T.musicVolume), y = K((T) => T.ambientVolume), [v, l] = b.useState(!1), c = (T, C) => {
    l(!1), a(`audioChannel:${T}`, C);
  }, S = (T, C) => a("musicVolume", C), x = (T, C) => a("ambientVolume", C), _ = () => {
    const T = Gn[Math.floor(Math.random() * Gn.length)], C = Kn[Math.floor(Math.random() * Kn.length)];
    a("musicType", T.label), a("ambientSound", C.label), l(!1);
  }, A = () => {
    a("musicType", (t == null ? void 0 : t.musicType) || "Deep Focus"), a("ambientSound", (t == null ? void 0 : t.ambientSound) || "Nature"), l(!0);
  };
  return /* @__PURE__ */ w.jsxs(
    vn.aside,
    {
      className: "focus-utility-panel room-control-panel liquid-glass",
      initial: { opacity: 0, y: 18 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 14 },
      transition: Oa,
      role: "dialog",
      "aria-label": "Room settings",
      children: [
        /* @__PURE__ */ w.jsxs("header", { className: "room-control-head", children: [
          /* @__PURE__ */ w.jsxs("div", { children: [
            /* @__PURE__ */ w.jsx("span", { className: "control-eyebrow", children: "Control" }),
            /* @__PURE__ */ w.jsx("h2", { children: "Room settings" })
          ] }),
          /* @__PURE__ */ w.jsx(Te, { className: "room-control-close", "aria-label": "Close room settings", onClick: o, children: /* @__PURE__ */ w.jsx(Q0, { size: 16, "aria-hidden": "true" }) })
        ] }),
        /* @__PURE__ */ w.jsx("div", { className: "room-control-divider", "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("div", { className: "room-control-setup-actions", children: /* @__PURE__ */ w.jsx(
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
        /* @__PURE__ */ w.jsx("section", { className: "room-control-topics", "aria-label": "Focus topics", children: /* @__PURE__ */ w.jsx(q0, {}) }),
        /* @__PURE__ */ w.jsxs("div", { className: "room-control-grid", children: [
          /* @__PURE__ */ w.jsxs("section", { className: "room-control-col room-control-scenes", "aria-label": "Scenes", children: [
            /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Scenes" }),
            /* @__PURE__ */ w.jsx(cf, {})
          ] }),
          /* @__PURE__ */ w.jsxs("section", { className: "room-control-col room-control-audio", children: [
            /* @__PURE__ */ w.jsxs("div", { className: "room-control-masters", children: [
              /* @__PURE__ */ w.jsxs("div", { className: "room-control-block", children: [
                /* @__PURE__ */ w.jsxs("div", { className: "room-control-block-head", children: [
                  /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Music" }),
                  /* @__PURE__ */ w.jsx(Te, { className: "room-control-icon-btn", "aria-label": "Shuffle to a random track", onClick: _, children: /* @__PURE__ */ w.jsx(tP, { size: 15, "aria-hidden": "true" }) })
                ] }),
                /* @__PURE__ */ w.jsxs("label", { className: "room-select-field", children: [
                  /* @__PURE__ */ w.jsx("span", { className: "sr-only", children: "Music track" }),
                  /* @__PURE__ */ w.jsx("select", { value: d, onChange: (T) => {
                    l(!1), a("musicType", T.target.value);
                  }, children: Gn.map((T) => /* @__PURE__ */ w.jsx("option", { value: T.label, children: T.label }, T.label)) })
                ] }),
                /* @__PURE__ */ w.jsx(da, { id: "music-volume", label: "Music volume", icon: /* @__PURE__ */ w.jsx(Ja, { size: 15, "aria-hidden": "true" }), value: m, onChange: S })
              ] }),
              /* @__PURE__ */ w.jsxs("div", { className: "room-control-block", children: [
                /* @__PURE__ */ w.jsxs("div", { className: "room-control-block-head", children: [
                  /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Scene sound" }),
                  /* @__PURE__ */ w.jsx(Te, { className: "room-control-icon-btn", "aria-label": v ? "Mix saved" : "Save current mix", onClick: () => l(!0), children: v ? /* @__PURE__ */ w.jsx(Za, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(G0, { size: 15, "aria-hidden": "true" }) })
                ] }),
                /* @__PURE__ */ w.jsxs("p", { className: "room-scene-recommend", children: [
                  "Recommended for ",
                  /* @__PURE__ */ w.jsx("strong", { children: t == null ? void 0 : t.name }),
                  /* @__PURE__ */ w.jsxs("span", { children: [
                    t == null ? void 0 : t.musicType,
                    " · ",
                    t == null ? void 0 : t.ambientSound
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
                  }, children: Kn.map((T) => /* @__PURE__ */ w.jsx("option", { value: T.label, children: T.label }, T.label)) })
                ] }),
                /* @__PURE__ */ w.jsx(da, { id: "ambient-volume", label: "Ambient volume", icon: /* @__PURE__ */ w.jsx(lf, { size: 15, "aria-hidden": "true" }), value: y, onChange: x })
              ] })
            ] }),
            /* @__PURE__ */ w.jsxs("div", { className: "room-control-block", children: [
              /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Focus noise" }),
              /* @__PURE__ */ w.jsx("div", { className: "room-noise-row", children: aR.map(([T, C]) => /* @__PURE__ */ w.jsx(da, { id: T, label: C, value: i == null ? void 0 : i[T], onChange: c, card: !0 }, T)) })
            ] }),
            /* @__PURE__ */ w.jsxs("div", { className: "room-control-block", children: [
              /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Ambient atmosphere" }),
              /* @__PURE__ */ w.jsx("div", { className: "room-ambient-grid", children: lR.map(([T, C]) => /* @__PURE__ */ w.jsx(da, { id: T, label: C, value: i == null ? void 0 : i[T], onChange: c, card: !0 }, T)) })
            ] }),
            e != null && e.error ? /* @__PURE__ */ w.jsx("p", { className: "audio-error", children: e.error }) : null
          ] })
        ] })
      ]
    }
  );
}
function fa({ title: e, kicker: t, icon: o, children: i, onClose: a, className: f = "" }) {
  return /* @__PURE__ */ w.jsxs(vn.aside, { className: `focus-utility-panel liquid-glass ${f}`.trim(), initial: { opacity: 0, y: 12, x: -18 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: 10, x: -18 }, transition: Oa, role: "dialog", "aria-label": e, children: [
    /* @__PURE__ */ w.jsxs("div", { className: "drawer-head", children: [
      /* @__PURE__ */ w.jsxs("div", { className: "utility-title", children: [
        /* @__PURE__ */ w.jsx("span", { className: "utility-title-icon", children: o }),
        /* @__PURE__ */ w.jsxs("div", { children: [
          /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: t }),
          /* @__PURE__ */ w.jsx("h2", { children: e })
        ] })
      ] }),
      /* @__PURE__ */ w.jsx(Te, { "aria-label": `Close ${e}`, onClick: a, children: /* @__PURE__ */ w.jsx(Q0, { size: 16, "aria-hidden": "true" }) })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "utility-panel-body", children: i })
  ] });
}
function cR({ audioState: e, scene: t }) {
  const o = K((y) => y.audioChannels), i = K((y) => y.setSound), [a, f] = b.useState(!1), d = (y, v) => {
    f(!1), i(`audioChannel:${y}`, v);
  }, p = () => {
    const y = Gn[Math.floor(Math.random() * Gn.length)], v = Kn[Math.floor(Math.random() * Kn.length)];
    i("musicType", y.label), i("ambientSound", v.label), f(!0);
  }, m = () => {
    i("musicType", (t == null ? void 0 : t.musicType) || "Deep Focus"), i("ambientSound", (t == null ? void 0 : t.ambientSound) || "Nature"), f(!0);
  };
  return /* @__PURE__ */ w.jsxs("div", { className: "sound-mixer", children: [
    /* @__PURE__ */ w.jsxs("div", { className: "mixer-featured-row", children: [
      /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Music library" }),
      /* @__PURE__ */ w.jsxs(Te, { onClick: p, children: [
        /* @__PURE__ */ w.jsx(DC, { size: 14, "aria-hidden": "true" }),
        " Random track"
      ] })
    ] }),
    /* @__PURE__ */ w.jsx(iR, { audioState: e, compact: !0 }),
    /* @__PURE__ */ w.jsxs("div", { className: "mixer-preset-row", children: [
      /* @__PURE__ */ w.jsxs("button", { type: "button", className: "mixer-preset-button", onClick: m, children: [
        "Apply scene mix ",
        /* @__PURE__ */ w.jsx("span", { children: "↗" })
      ] }),
      /* @__PURE__ */ w.jsxs(Te, { onClick: () => f(!0), children: [
        a ? /* @__PURE__ */ w.jsx(Za, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(G0, { size: 14, "aria-hidden": "true" }),
        " ",
        a ? "Saved" : "Save current mix"
      ] })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "mixer-channel-grid", children: sR.map(([y, v]) => /* @__PURE__ */ w.jsxs("label", { className: "mixer-channel", children: [
      /* @__PURE__ */ w.jsxs("span", { children: [
        /* @__PURE__ */ w.jsx("i", { className: `mixer-channel-dot mixer-${y}` }),
        v
      ] }),
      /* @__PURE__ */ w.jsxs("strong", { children: [
        o[y],
        "%"
      ] }),
      /* @__PURE__ */ w.jsx("input", { type: "range", min: "0", max: "100", value: o[y], "aria-label": `${v} volume`, onChange: (l) => d(y, l.target.value) })
    ] }, y)) }),
    e != null && e.error ? /* @__PURE__ */ w.jsx("p", { className: "audio-error", children: e.error }) : null
  ] });
}
function dR() {
  const e = () => {
    var i, a, f;
    return ((f = (a = (i = globalThis.window) == null ? void 0 : i.SynapseAuth) == null ? void 0 : a.getStoredSession) == null ? void 0 : f.call(a)) || null;
  }, [t, o] = b.useState(e);
  return b.useEffect(() => {
    var d, p, m, y;
    let i = !0;
    const a = (v) => {
      var l;
      i && o(((l = v == null ? void 0 : v.detail) == null ? void 0 : l.session) || e());
    };
    (d = globalThis.window) == null || d.addEventListener("synapse-auth-changed", a);
    const f = (y = (m = (p = globalThis.window) == null ? void 0 : p.SynapseAuth) == null ? void 0 : m.syncSessionFromProvider) == null ? void 0 : y.call(m);
    return Promise.resolve(f).finally(() => a()), () => {
      var v;
      i = !1, (v = globalThis.window) == null || v.removeEventListener("synapse-auth-changed", a);
    };
  }, []), t;
}
function fR({ onWorkspace: e, session: t }) {
  return !!t ? /* @__PURE__ */ w.jsxs("div", { className: "utility-empty-state", children: [
    /* @__PURE__ */ w.jsx(za, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Your Focus Trail" }),
    /* @__PURE__ */ w.jsx("p", { children: "Recent sessions and progress remain available through Synapse history." }),
    /* @__PURE__ */ w.jsx(Te, { variant: "primary", onClick: () => e == null ? void 0 : e("", "history"), children: "Open session history" })
  ] }) : /* @__PURE__ */ w.jsxs("div", { className: "utility-login-state", children: [
    /* @__PURE__ */ w.jsx(za, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Your rhythm, remembered" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Sign in to view your Focus Trail" }),
    /* @__PURE__ */ w.jsx("p", { children: "Track deep-work time, completed goals, and your study streak across devices." }),
    /* @__PURE__ */ w.jsx(Te, { variant: "primary", onClick: () => e == null ? void 0 : e(), children: "Sign in with Synapse" }),
    /* @__PURE__ */ w.jsx("small", { children: "Your current session continues without an account." })
  ] });
}
function pR({ onWorkspace: e, session: t }) {
  return !!t ? /* @__PURE__ */ w.jsxs("div", { className: "utility-empty-state", children: [
    /* @__PURE__ */ w.jsx(Ba, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Companion Room" }),
    /* @__PURE__ */ w.jsx("p", { children: "Invite a study partner from your Synapse workspace to share this quiet room." }),
    /* @__PURE__ */ w.jsx(Te, { variant: "primary", onClick: () => e == null ? void 0 : e("", "companion"), children: "Open Companion Room" })
  ] }) : /* @__PURE__ */ w.jsxs("div", { className: "utility-login-state", children: [
    /* @__PURE__ */ w.jsx(Ba, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Study alongside someone" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Sign in to use Companion Room" }),
    /* @__PURE__ */ w.jsx("p", { children: "Keep your own goal private while sharing the feeling of showing up together." }),
    /* @__PURE__ */ w.jsx(Te, { variant: "primary", onClick: () => e == null ? void 0 : e(), children: "Go to sign in" }),
    /* @__PURE__ */ w.jsx("small", { children: "No companion data is created in Focus Room." })
  ] });
}
function mR({ audioState: e, utilityPanel: t, onClose: o, onWorkspace: i }) {
  const a = K((y) => y.activeDrawer), f = K((y) => y.closeDrawer), d = K((y) => y.selectedScene), p = dR(), m = b.useMemo(() => Zn.find((y) => y.id === d) || Zn[0], [d]);
  return /* @__PURE__ */ w.jsxs(Ya, { children: [
    t === "trail" ? /* @__PURE__ */ w.jsx(fa, { title: "Focus Trail", kicker: "Your progress", icon: /* @__PURE__ */ w.jsx(za, { size: 16 }), onClose: o, children: /* @__PURE__ */ w.jsx(fR, { onWorkspace: i, session: p }) }) : null,
    t === "companion" ? /* @__PURE__ */ w.jsx(fa, { title: "Companion Room", kicker: "Shared focus", icon: /* @__PURE__ */ w.jsx(Ba, { size: 16 }), onClose: o, children: /* @__PURE__ */ w.jsx(pR, { onWorkspace: i, session: p }) }) : null,
    t === "settings" ? /* @__PURE__ */ w.jsx(uR, { audioState: e, scene: m, onClose: o }) : null,
    !t && a === "scene" ? /* @__PURE__ */ w.jsx(fa, { title: "Choose scene", kicker: "Scene", icon: /* @__PURE__ */ w.jsx(K0, { size: 16 }), onClose: f, children: /* @__PURE__ */ w.jsx(cf, {}) }) : null,
    !t && a === "music" ? /* @__PURE__ */ w.jsx(fa, { title: "Sound atmosphere", kicker: "Room audio", icon: /* @__PURE__ */ w.jsx(Ja, { size: 16 }), onClose: f, children: /* @__PURE__ */ w.jsx(cR, { audioState: e, scene: m }) }) : null
  ] });
}
const hR = 2800;
function yR(e = "idle") {
  return e === "studying" ? { action: "pause", label: "Pause timer" } : e === "paused" ? { action: "start", label: "Resume timer" } : { action: "start", label: "Start timer" };
}
function gR({ pointerWithin: e = !1, focusWithin: t = !1 } = {}) {
  return !e && !t;
}
function vR(e, t) {
  return t ? Math.min(100, Math.max(0, e / t * 100)) : 0;
}
function SR({ onExit: e }) {
  const t = K((L) => L.elapsedSeconds), o = K((L) => L.pomodoroDuration), i = K((L) => L.pomodoroDurationSeconds), a = K((L) => L.timerMode), f = K((L) => L.timerStatus), d = K((L) => L.currentSession), p = K((L) => L.startTimer), m = K((L) => L.pauseTimer), y = K((L) => L.resetTimer), v = K((L) => L.skipTimer), [l, c] = b.useState(!1), S = b.useRef(null), x = b.useRef(!1), _ = b.useRef(!1), A = b.useRef("pointer"), T = Number(i) || (Number(o) || 0) * 60, C = a === "countup" ? t : Math.max(0, T - t), E = yR(f), N = f === "paused" ? "Paused" : f === "completed" ? "Complete" : f === "studying" ? "In focus" : "Ready", O = b.useCallback(() => {
    S.current && (globalThis.clearTimeout(S.current), S.current = null);
  }, []), W = b.useCallback(() => {
    O(), S.current = globalThis.setTimeout(() => {
      gR({
        pointerWithin: x.current,
        focusWithin: _.current
      }) && c(!1);
    }, hR);
  }, [O]), H = b.useCallback(() => {
    c(!0), W();
  }, [W]);
  b.useEffect(() => {
    var se, Z, de;
    const L = () => {
      A.current = "pointer", _.current = !1, H();
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
  return /* @__PURE__ */ w.jsxs(
    "div",
    {
      className: `compact-focus-mode-card ${l ? "has-timer-controls" : ""}`.trim(),
      "aria-label": "Distraction-free focus timer",
      "data-timer-controls-visible": l ? "true" : "false",
      onPointerEnter: () => {
        x.current = !0, H();
      },
      onPointerLeave: () => {
        x.current = !1, W();
      },
      onFocusCapture: () => {
        _.current = A.current === "keyboard", H();
      },
      onBlurCapture: (L) => {
        _.current = !!L.currentTarget.contains(L.relatedTarget), W();
      },
      children: [
        /* @__PURE__ */ w.jsxs("div", { className: "compact-focus-card-top", children: [
          /* @__PURE__ */ w.jsxs("span", { children: [
            "POMODORO #",
            (d == null ? void 0 : d.pomodoroNumber) || 1
          ] }),
          /* @__PURE__ */ w.jsx(Te, { className: "compact-exit-button", onClick: e, "aria-label": "Exit Focus Mode", children: /* @__PURE__ */ w.jsx(zC, { size: 14, "aria-hidden": "true" }) })
        ] }),
        /* @__PURE__ */ w.jsxs("span", { className: "compact-focus-status", children: [
          /* @__PURE__ */ w.jsx("i", {}),
          N
        ] }),
        /* @__PURE__ */ w.jsx("strong", { "aria-live": "off", children: rd(C) }),
        /* @__PURE__ */ w.jsx("div", { className: "compact-focus-progress", "aria-hidden": "true", children: /* @__PURE__ */ w.jsx("span", { style: { width: `${vR(t, T)}%` } }) }),
        /* @__PURE__ */ w.jsxs("small", { children: [
          ff(T),
          " session"
        ] }),
        /* @__PURE__ */ w.jsxs("div", { className: "compact-timer-controls", "aria-hidden": !l, inert: l ? void 0 : "", children: [
          /* @__PURE__ */ w.jsx(Te, { className: "compact-timer-control compact-timer-control-primary", variant: "primary", onClick: Y, "aria-label": E.label, title: E.label, children: E.action === "pause" ? /* @__PURE__ */ w.jsx(sd, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(H0, { size: 15, fill: "currentColor", "aria-hidden": "true" }) }),
          /* @__PURE__ */ w.jsx(Te, { className: "compact-timer-control", onClick: y, "aria-label": "Reset timer", title: "Reset timer", children: /* @__PURE__ */ w.jsx(W0, { size: 15, "aria-hidden": "true" }) }),
          /* @__PURE__ */ w.jsx(Te, { className: "compact-timer-control", onClick: v, "aria-label": "Skip timer", title: "Skip timer", children: /* @__PURE__ */ w.jsx(Y0, { size: 15, "aria-hidden": "true" }) })
        ] }),
        /* @__PURE__ */ w.jsx("span", { className: "sr-only", children: "Move the pointer, tap, or use the keyboard to reveal timer controls. Press Escape to exit Focus Mode." })
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
var Eg;
function wR() {
  return Eg || (Eg = 1, (function(e) {
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
          if (l = parseFloat(l), c.ctx || v(), typeof l < "u" && l >= 0 && l <= 1) {
            if (c._volume = l, c._muted)
              return c;
            c.usingWebAudio && c.masterGain.gain.setValueAtTime(l, o.ctx.currentTime);
            for (var S = 0; S < c._howls.length; S++)
              if (!c._howls[S]._webAudio)
                for (var x = c._howls[S]._getSoundIds(), _ = 0; _ < x.length; _++) {
                  var A = c._howls[S]._soundById(x[_]);
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
              for (var x = c._howls[S]._getSoundIds(), _ = 0; _ < x.length; _++) {
                var A = c._howls[S]._soundById(x[_]);
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
          var S = c.canPlayType("audio/mpeg;").replace(/^no$/, ""), x = l._navigator ? l._navigator.userAgent : "", _ = x.match(/OPR\/(\d+)/g), A = _ && parseInt(_[0].split("/")[1], 10) < 33, T = x.indexOf("Safari") !== -1 && x.indexOf("Chrome") === -1, C = x.match(/Version\/(.*?) /), E = T && C && parseInt(C[1], 10) < 15;
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
              for (var _ = 0; _ < l._howls.length; _++)
                if (!l._howls[_]._webAudio)
                  for (var A = l._howls[_]._getSoundIds(), T = 0; T < A.length; T++) {
                    var C = l._howls[_]._soundById(A[T]);
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
            var x, _;
            if (l._format && l._format[S])
              x = l._format[S];
            else {
              if (_ = l._src[S], typeof _ != "string") {
                l._emit("loaderror", null, "Non-string found in selected audio sources - ignoring.");
                continue;
              }
              x = /^data:audio\/([^;,]+);/i.exec(_), x || (x = /\.([^.]+)$/.exec(_.split("?", 1)[0])), x && (x = x[1].toLowerCase());
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
          return l._src = c, l._state = "loading", window.location.protocol === "https:" && c.slice(0, 5) === "http:" && (l._html5 = !0, l._webAudio = !1), new a(l), l._webAudio && d(l), l;
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
              for (var _ = 0, A = 0; A < S._sounds.length; A++)
                S._sounds[A]._paused && !S._sounds[A]._ended && (_++, x = S._sounds[A]._id);
              _ === 1 ? l = null : x = null;
            }
          }
          var T = x ? S._soundById(x) : S._inactiveSound();
          if (!T)
            return null;
          if (x && !l && (l = T._sprite || "__default"), S._state !== "loaded") {
            T._sprite = l, T._ended = !1;
            var C = T._id;
            return S._queue.push({
              event: "play",
              action: function() {
                S.play(C);
              }
            }), C;
          }
          if (x && !T._paused)
            return c || S._loadQueue("play"), T._id;
          S._webAudio && o._autoResume();
          var E = Math.max(0, T._seek > 0 ? T._seek : S._sprite[l][0] / 1e3), N = Math.max(0, (S._sprite[l][0] + S._sprite[l][1]) / 1e3 - E), O = N * 1e3 / Math.abs(T._rate), W = S._sprite[l][0] / 1e3, H = (S._sprite[l][0] + S._sprite[l][1]) / 1e3;
          T._sprite = l, T._ended = !1;
          var Y = function() {
            T._paused = !1, T._seek = E, T._start = W, T._stop = H, T._loop = !!(T._loop || S._sprite[l][2]);
          };
          if (E >= H) {
            S._ended(T);
            return;
          }
          var L = T._node;
          if (S._webAudio) {
            var X = function() {
              S._playLock = !1, Y(), S._refreshBuffer(T);
              var ce = T._muted || S._muted ? 0 : T._volume;
              L.gain.setValueAtTime(ce, o.ctx.currentTime), T._playStart = o.ctx.currentTime, typeof L.bufferSource.start > "u" ? T._loop ? L.bufferSource.noteGrainOn(0, E, 86400) : L.bufferSource.noteGrainOn(0, E, N) : T._loop ? L.bufferSource.start(0, E, 86400) : L.bufferSource.start(0, E, N), O !== 1 / 0 && (S._endTimers[T._id] = setTimeout(S._ended.bind(S, T), O)), c || setTimeout(function() {
                S._emit("play", T._id), S._loadQueue();
              }, 0);
            };
            o.state === "running" && o.ctx.state !== "interrupted" ? X() : (S._playLock = !0, S.once("resume", X), S._clearTimer(T._id));
          } else {
            var se = function() {
              L.currentTime = E, L.muted = T._muted || S._muted || o._muted || L.muted, L.volume = T._volume * o.volume(), L.playbackRate = T._rate;
              try {
                var ce = L.play();
                if (ce && typeof Promise < "u" && (ce instanceof Promise || typeof ce.then == "function") ? (S._playLock = !0, Y(), ce.then(function() {
                  S._playLock = !1, L._unlocked = !0, c ? S._loadQueue() : S._emit("play", T._id);
                }).catch(function() {
                  S._playLock = !1, S._emit("playerror", T._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction."), T._ended = !0, T._paused = !0;
                })) : c || (S._playLock = !1, Y(), S._emit("play", T._id)), L.playbackRate = T._rate, L.paused) {
                  S._emit("playerror", T._id, "Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.");
                  return;
                }
                l !== "__default" || T._loop ? S._endTimers[T._id] = setTimeout(S._ended.bind(S, T), O) : (S._endTimers[T._id] = function() {
                  S._ended(T), L.removeEventListener("ended", S._endTimers[T._id], !1);
                }, L.addEventListener("ended", S._endTimers[T._id], !1));
              } catch (ye) {
                S._emit("playerror", T._id, ye);
              }
            };
            L.src === "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA" && (L.src = S._src, L.load());
            var Z = window && window.ejecta || !L.readyState && o._navigator.isCocoonJS;
            if (L.readyState >= 3 || Z)
              se();
            else {
              S._playLock = !0, S._state = "loading";
              var de = function() {
                S._state = "loaded", se(), L.removeEventListener(o._canPlayEvent, de, !1);
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
            var _ = c._soundById(S[x]);
            if (_ && !_._paused && (_._seek = c.seek(S[x]), _._rateSeek = 0, _._paused = !0, c._stopFade(S[x]), _._node))
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
          var S = this;
          if (S._state !== "loaded" || S._playLock)
            return S._queue.push({
              event: "stop",
              action: function() {
                S.stop(l);
              }
            }), S;
          for (var x = S._getSoundIds(l), _ = 0; _ < x.length; _++) {
            S._clearTimer(x[_]);
            var A = S._soundById(x[_]);
            A && (A._seek = A._start || 0, A._rateSeek = 0, A._paused = !0, A._ended = !0, S._stopFade(x[_]), A._node && (S._webAudio ? A._node.bufferSource && (typeof A._node.bufferSource.stop > "u" ? A._node.bufferSource.noteOff(0) : A._node.bufferSource.stop(0), S._cleanBuffer(A._node)) : (!isNaN(A._node.duration) || A._node.duration === 1 / 0) && (A._node.currentTime = A._start || 0, A._node.pause(), A._node.duration === 1 / 0 && S._clearSound(A._node))), c || S._emit("stop", A._id));
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
          for (var x = S._getSoundIds(c), _ = 0; _ < x.length; _++) {
            var A = S._soundById(x[_]);
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
            var _ = l._getSoundIds(), A = _.indexOf(c[0]);
            A >= 0 ? x = parseInt(c[0], 10) : S = parseFloat(c[0]);
          } else c.length >= 2 && (S = parseFloat(c[0]), x = parseInt(c[1], 10));
          var T;
          if (typeof S < "u" && S >= 0 && S <= 1) {
            if (l._state !== "loaded" || l._playLock)
              return l._queue.push({
                event: "volume",
                action: function() {
                  l.volume.apply(l, c);
                }
              }), l;
            typeof x > "u" && (l._volume = S), x = l._getSoundIds(x);
            for (var C = 0; C < x.length; C++)
              T = l._soundById(x[C]), T && (T._volume = S, c[2] || l._stopFade(x[C]), l._webAudio && T._node && !T._muted ? T._node.gain.setValueAtTime(S, o.ctx.currentTime) : T._node && !T._muted && (T._node.volume = S * o.volume()), l._emit("volume", T._id));
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
        fade: function(l, c, S, x) {
          var _ = this;
          if (_._state !== "loaded" || _._playLock)
            return _._queue.push({
              event: "fade",
              action: function() {
                _.fade(l, c, S, x);
              }
            }), _;
          l = Math.min(Math.max(0, parseFloat(l)), 1), c = Math.min(Math.max(0, parseFloat(c)), 1), S = parseFloat(S), _.volume(l, x);
          for (var A = _._getSoundIds(x), T = 0; T < A.length; T++) {
            var C = _._soundById(A[T]);
            if (C) {
              if (x || _._stopFade(A[T]), _._webAudio && !C._muted) {
                var E = o.ctx.currentTime, N = E + S / 1e3;
                C._volume = l, C._node.gain.setValueAtTime(l, E), C._node.gain.linearRampToValueAtTime(c, N);
              }
              _._startFadeInterval(C, l, c, S, A[T], typeof x > "u");
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
        _startFadeInterval: function(l, c, S, x, _, A) {
          var T = this, C = c, E = S - c, N = Math.abs(E / 0.01), O = Math.max(4, N > 0 ? x / N : x), W = Date.now();
          l._fadeTo = S, l._interval = setInterval(function() {
            var H = (Date.now() - W) / x;
            W = Date.now(), C += E * H, C = Math.round(C * 100) / 100, E < 0 ? C = Math.max(S, C) : C = Math.min(S, C), T._webAudio ? l._volume = C : T.volume(C, l._id, !0), A && (T._volume = C), (S < c && C <= S || S > c && C >= S) && (clearInterval(l._interval), l._interval = null, l._fadeTo = null, T.volume(S, l._id), T._emit("fade", l._id));
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
          var l = this, c = arguments, S, x, _;
          if (c.length === 0)
            return l._loop;
          if (c.length === 1)
            if (typeof c[0] == "boolean")
              S = c[0], l._loop = S;
            else
              return _ = l._soundById(parseInt(c[0], 10)), _ ? _._loop : !1;
          else c.length === 2 && (S = c[0], x = parseInt(c[1], 10));
          for (var A = l._getSoundIds(x), T = 0; T < A.length; T++)
            _ = l._soundById(A[T]), _ && (_._loop = S, l._webAudio && _._node && _._node.bufferSource && (_._node.bufferSource.loop = S, S && (_._node.bufferSource.loopStart = _._start || 0, _._node.bufferSource.loopEnd = _._stop, l.playing(A[T]) && (l.pause(A[T], !0), l.play(A[T], !0)))));
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
            var _ = l._getSoundIds(), A = _.indexOf(c[0]);
            A >= 0 ? x = parseInt(c[0], 10) : S = parseFloat(c[0]);
          } else c.length === 2 && (S = parseFloat(c[0]), x = parseInt(c[1], 10));
          var T;
          if (typeof S == "number") {
            if (l._state !== "loaded" || l._playLock)
              return l._queue.push({
                event: "rate",
                action: function() {
                  l.rate.apply(l, c);
                }
              }), l;
            typeof x > "u" && (l._rate = S), x = l._getSoundIds(x);
            for (var C = 0; C < x.length; C++)
              if (T = l._soundById(x[C]), T) {
                l.playing(x[C]) && (T._rateSeek = l.seek(x[C]), T._playStart = l._webAudio ? o.ctx.currentTime : T._playStart), T._rate = S, l._webAudio && T._node && T._node.bufferSource ? T._node.bufferSource.playbackRate.setValueAtTime(S, o.ctx.currentTime) : T._node && (T._node.playbackRate = S);
                var E = l.seek(x[C]), N = (l._sprite[T._sprite][0] + l._sprite[T._sprite][1]) / 1e3 - E, O = N * 1e3 / Math.abs(T._rate);
                (l._endTimers[x[C]] || !T._paused) && (l._clearTimer(x[C]), l._endTimers[x[C]] = setTimeout(l._ended.bind(l, T), O)), l._emit("rate", T._id);
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
          var l = this, c = arguments, S, x;
          if (c.length === 0)
            l._sounds.length && (x = l._sounds[0]._id);
          else if (c.length === 1) {
            var _ = l._getSoundIds(), A = _.indexOf(c[0]);
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
          var T = l._soundById(x);
          if (T)
            if (typeof S == "number" && S >= 0) {
              var C = l.playing(x);
              C && l.pause(x, !0), T._seek = S, T._ended = !1, l._clearTimer(x), !l._webAudio && T._node && !isNaN(T._node.duration) && (T._node.currentTime = S);
              var E = function() {
                C && l.play(x, !0), l._emit("seek", x);
              };
              if (C && !l._webAudio) {
                var N = function() {
                  l._playLock ? setTimeout(N, 0) : E();
                };
                setTimeout(N, 0);
              } else
                E();
            } else if (l._webAudio) {
              var O = l.playing(x) ? o.ctx.currentTime - T._playStart : 0, W = T._rateSeek ? T._rateSeek - T._seek : 0;
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
          var _ = !0;
          for (S = 0; S < o._howls.length; S++)
            if (o._howls[S]._src === l._src || l._src.indexOf(o._howls[S]._src) >= 0) {
              _ = !1;
              break;
            }
          return f && _ && delete f[l._src], o.noAudio = !1, l._state = "unloaded", l._sounds = [], l = null, null;
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
          var _ = this, A = _["_on" + l];
          return typeof c == "function" && A.push(x ? { id: S, fn: c, once: x } : { id: S, fn: c }), _;
        },
        /**
         * Remove a custom event. Call without parameters to remove all events.
         * @param  {String}   event Event name.
         * @param  {Function} fn    Listener to remove. Leave empty to remove all.
         * @param  {Number}   id    (optional) Only remove events for this sound.
         * @return {Howl}
         */
        off: function(l, c, S) {
          var x = this, _ = x["_on" + l], A = 0;
          if (typeof c == "number" && (S = c, c = null), c || S)
            for (A = 0; A < _.length; A++) {
              var T = S === _[A].id;
              if (c === _[A].fn && T || !c && T) {
                _.splice(A, 1);
                break;
              }
            }
          else if (l)
            x["_on" + l] = [];
          else {
            var C = Object.keys(x);
            for (A = 0; A < C.length; A++)
              C[A].indexOf("_on") === 0 && Array.isArray(x[C[A]]) && (x[C[A]] = []);
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
          for (var x = this, _ = x["_on" + l], A = _.length - 1; A >= 0; A--)
            (!_[A].id || _[A].id === c || l === "load") && (setTimeout((function(T) {
              T.call(this, c, S);
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
          return l._node.bufferSource = o.ctx.createBufferSource(), l._node.bufferSource.buffer = f[c._src], l._panner ? l._node.bufferSource.connect(l._panner) : l._node.bufferSource.connect(l._node), l._node.bufferSource.loop = l._loop, l._loop && (l._node.bufferSource.loopStart = l._start || 0, l._node.bufferSource.loopEnd = l._stop || 0), l._node.bufferSource.playbackRate.setValueAtTime(l._rate, o.ctx.currentTime), c;
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
      var f = {}, d = function(l) {
        var c = l._src;
        if (f[c]) {
          l._duration = f[c].duration, y(l);
          return;
        }
        if (/^data:[^;]+;base64,/.test(c)) {
          for (var S = atob(c.split(",")[1]), x = new Uint8Array(S.length), _ = 0; _ < S.length; ++_)
            x[_] = S.charCodeAt(_);
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
        var S = function() {
          c._emit("loaderror", null, "Decoding audio data failed.");
        }, x = function(_) {
          _ && c._sounds.length > 0 ? (f[c._src] = _, y(c, _)) : S();
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
      e.Howler = o, e.Howl = i, typeof di < "u" ? (di.HowlerGlobal = t, di.Howler = o, di.Howl = i, di.Sound = a) : typeof window < "u" && (window.HowlerGlobal = t, window.Howler = o, window.Howl = i, window.Sound = a);
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
            var v = d._panner;
            v || (d._pos || (d._pos = o._pos || [0, 0, -0.5]), t(d, "spatial"), v = d._panner), v.coneInnerAngle = y.coneInnerAngle, v.coneOuterAngle = y.coneOuterAngle, v.coneOuterGain = y.coneOuterGain, v.distanceModel = y.distanceModel, v.maxDistance = y.maxDistance, v.refDistance = y.refDistance, v.rolloffFactor = y.rolloffFactor, v.panningModel = y.panningModel;
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
  })(Tc)), Tc;
}
var xR = wR();
const _R = /* @__PURE__ */ Og(xR), { Howl: uw } = _R, kd = 500, Rt = {
  music: null,
  ambient: /* @__PURE__ */ new Map()
};
let vr = {}, _i = !1, Ad = "";
function Ei() {
  return typeof uw == "function";
}
function kc(e, t = 50) {
  const o = Number(e), i = Number.isFinite(o) ? o : t;
  return Math.min(1, Math.max(0, i / 100));
}
function cw(e) {
  return new uw({
    src: [e],
    loop: !0,
    html5: !0,
    preload: !0,
    volume: 0
  });
}
function dw(e, t, o = kd) {
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
function el(e, { unload: t = !1 } = {}) {
  var o;
  e && (dw(e, 0, Math.min(kd, 300)), (o = globalThis.setTimeout) == null || o.call(globalThis, () => {
    try {
      e.pause(), t && e.unload();
    } catch {
    }
  }, Math.min(kd, 320)));
}
function TR(e) {
  return !(e != null && e.streamUrl) || !Ei() ? null : ((!Rt.music || Rt.music.__synapseSrc !== e.streamUrl) && (el(Rt.music, { unload: !0 }), Rt.music = cw(e.streamUrl), Rt.music.__synapseSrc = e.streamUrl), Rt.music);
}
function kR(e) {
  if (!(e != null && e.streamUrl) || !Ei()) return null;
  const t = e.id || e.streamUrl, o = Rt.ambient.get(t);
  if (o && o.__synapseSrc === e.streamUrl) return o;
  el(o, { unload: !0 });
  const i = cw(e.streamUrl);
  return i.__synapseSrc = e.streamUrl, Rt.ambient.set(t, i), i;
}
function AR() {
  return [
    Rt.music,
    ...Rt.ambient.values()
  ].filter(Boolean);
}
function fw() {
  AR().forEach((e) => el(e));
}
function bR(e) {
  for (const [t, o] of Rt.ambient.entries())
    e.has(t) || (el(o, { unload: !0 }), Rt.ambient.delete(t));
}
function Mg(e, t) {
  if (e)
    try {
      e.playing() || e.play(), dw(e, t), Ad = "";
    } catch (o) {
      Ad = (o == null ? void 0 : o.message) || "Audio playback is blocked until the browser receives a user action.";
    }
}
async function CR(e = {}) {
  vr = { ...vr, ...e };
  const t = Ii(vr);
  if (!Ei()) return ba(t);
  if (!_i)
    return fw(), ba(t);
  const o = TR(t.musicTrack), i = kc(vr.musicVolume, 60), a = kc(vr.ambientVolume, 50), f = /* @__PURE__ */ new Set(), d = [];
  return t.ambientLayers.forEach((p) => {
    var c;
    const m = p.id || p.streamUrl;
    f.add(m);
    const y = kR(p), v = Number((c = vr.audioChannels) == null ? void 0 : c[p.id]), l = Number.isFinite(v) ? kc(v, 0) : Math.min(1, Math.max(0, a * (p.volumeBias ?? 1)));
    d.push([y, l]);
  }), bR(f), Mg(o, i), d.forEach(([p, m]) => Mg(p, m)), ba(t);
}
function PR(e) {
  return _i = !!e, _i || fw(), _i;
}
function ba(e = Ii(vr)) {
  var t, o, i, a;
  return {
    available: Ei(),
    playing: _i && Ei(),
    musicTitle: ((t = e.musicTrack) == null ? void 0 : t.title) || "",
    musicArtist: ((o = e.musicTrack) == null ? void 0 : o.artist) || "",
    musicPageUrl: ((i = e.musicTrack) == null ? void 0 : i.pageUrl) || "",
    musicAttribution: ((a = e.musicTrack) == null ? void 0 : a.attribution) || "",
    ambientTitles: e.ambientLayers.map((f) => f.title).filter(Boolean),
    ambientPageUrls: e.ambientLayers.map((f) => f.pageUrl).filter(Boolean),
    ambientAttributions: e.ambientLayers.map((f) => f.attribution).filter(Boolean),
    error: Ad
  };
}
const ER = "synapse.focusRoom.audioPrefs.v1";
function MR(e) {
  var t;
  try {
    (t = globalThis.localStorage) == null || t.setItem(ER, JSON.stringify({
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
function RR() {
  const e = K((m) => m.musicType), t = K((m) => m.ambientSound), o = K((m) => m.musicVolume), i = K((m) => m.ambientVolume), a = K((m) => m.audioChannels), f = K((m) => m.audioPlaying), [d, p] = b.useState(() => ba(Ii({
    musicType: e,
    ambientSound: t
  })));
  return b.useEffect(() => {
    const m = { musicType: e, ambientSound: t, musicVolume: o, ambientVolume: i, audioChannels: a };
    let y = !1;
    return PR(f), MR(m), CR(m).then((v) => {
      y || p(v);
    }), () => {
      y = !0;
    };
  }, [t, i, a, f, e, o]), d;
}
function NR() {
  const e = K(), t = b.useCallback(async (i = "", a = "", f = {}) => {
    var v;
    e.pauseTimer({ pauseAudio: !0 }), e.closeSummary();
    const d = typeof i == "string" || typeof i == "number" ? i : "", p = typeof a == "string" ? a : "", m = DR(p, f), y = String(d || e.selectedMaterialId || ((v = e.selectedMaterial) == null ? void 0 : v.materialId) || "");
    if (typeof globalThis.returnFromFocusRoomToWorkspace == "function")
      try {
        const l = globalThis.returnFromFocusRoomToWorkspace(y, m);
        l && typeof l.then == "function" && await l, Rg(m.action || p, m);
        return;
      } catch (l) {
        console.error("Could not return from Focus Room:", l);
      }
    globalThis.location.hash = "", Rg(m.action || p, m);
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
function pw(e) {
  const t = String(e || "").trim().toLowerCase();
  return ["flashcards", "quiz", "assistant", "mindmap", "timeline", "source", "notes"].includes(t) ? t : "";
}
function DR(e, t = {}) {
  const o = t && typeof t == "object" && !Array.isArray(t) ? t : {}, i = pw(e || o.action);
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
function Rg(e, t = {}) {
  const o = pw(e);
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
function jR(e = 3e3) {
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
function IR() {
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
function FR() {
  const e = K((t) => t.selectedScene);
  return Yn(e);
}
function OR(e) {
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
function LR() {
  const [e, t] = b.useState(""), [o, i] = b.useState(!1), [a, f] = b.useState(!1), d = K((T) => T.view), p = jR(3e3), m = FR(), y = RR(), v = NR();
  IR();
  const l = K(D1(OR)), c = K((T) => T.summaryRecord), S = K((T) => T.endSession), x = K((T) => T.initializeFocusRoom);
  b.useEffect(() => {
    x();
  }, [x]), b.useEffect(() => {
    var N;
    const T = document.documentElement, C = T.dataset.theme, E = T.style.colorScheme;
    return T.dataset.theme = "dark", T.style.colorScheme = "dark", (N = document.body) == null || N.classList.add("synapse-theme-dark"), () => {
      var O;
      (O = document.body) != null && O.classList.contains("focus-room-standalone") || (C && (T.dataset.theme = C), T.style.colorScheme = E);
    };
  }, []), b.useEffect(() => {
    l != null && l.materialId && rf(l.materialId, l);
  }, [l]), b.useEffect(() => {
    d === "session" || !c || xa("focus-room");
  }, [c, d]), b.useEffect(() => {
    d !== "session" && (i(!1), t(""), f(!1));
  }, [d]), b.useEffect(() => {
    const T = (C) => {
      C.key === "Escape" && (o ? (C.preventDefault(), i(!1)) : e ? t("") : a && f(!1));
    };
    return window.addEventListener("keydown", T), () => window.removeEventListener("keydown", T);
  }, [a, o, e]);
  const _ = (...T) => {
    v.returnToWorkspace(...T);
  }, A = async () => {
    f(!1), i(!1), t(""), S(), await _();
  };
  return /* @__PURE__ */ w.jsxs(
    "main",
    {
      id: "focusRoomSurface",
      className: `focus-room-surface react-focus-room ${p ? "is-idle" : ""} ${d === "setup" ? "is-setup is-innook-setup" : "is-session"}`.trim(),
      "aria-live": "polite",
      "data-focus-room-view": d,
      children: [
        /* @__PURE__ */ w.jsx(hC, { scene: m }),
        /* @__PURE__ */ w.jsxs(Ya, { mode: "wait", children: [
          d === "setup" ? /* @__PURE__ */ w.jsx(
            vn.div,
            {
              className: "focus-room-view focus-setup-view",
              initial: { opacity: 0, y: 16 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -10 },
              transition: Oa,
              children: /* @__PURE__ */ w.jsx(CP, { audioState: y, onWorkspace: _ })
            },
            "setup"
          ) : null,
          d === "session" ? /* @__PURE__ */ w.jsxs(
            vn.div,
            {
              className: "focus-room-view focus-session-view",
              initial: { opacity: 0, y: 14 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -8 },
              transition: Oa,
              children: [
                o ? /* @__PURE__ */ w.jsx("button", { type: "button", className: "focus-mode-exit-hit-area", onClick: () => i(!1), children: "Exit Focus Mode" }) : /* @__PURE__ */ w.jsx(PP, { onWorkspace: _, onOpenTrail: () => t("trail"), onOpenCompanion: () => t("companion"), onOpenSettings: () => t("settings"), onExit: () => f(!0) }),
                /* @__PURE__ */ w.jsx("section", { className: `focus-session-stage ${o ? "is-focus-mode" : ""}`.trim(), "aria-hidden": "true" }),
                o ? /* @__PURE__ */ w.jsx(SR, { onExit: () => i(!1) }) : /* @__PURE__ */ w.jsx(FP, { audioState: y, onFocusMode: () => i(!0) }),
                o ? null : /* @__PURE__ */ w.jsx(mR, { audioState: y, utilityPanel: e, onClose: () => t(""), onWorkspace: _ }),
                /* @__PURE__ */ w.jsx(_M, {}),
                /* @__PURE__ */ w.jsx(VR, { open: a, onClose: () => f(!1), onConfirm: A })
              ]
            },
            "session"
          ) : null
        ] })
      ]
    }
  );
}
function VR({ open: e, onClose: t, onConfirm: o }) {
  return e ? /* @__PURE__ */ w.jsx("div", { className: "focus-exit-overlay", role: "presentation", children: /* @__PURE__ */ w.jsxs("div", { className: "focus-exit-dialog liquid-glass", role: "dialog", "aria-modal": "true", "aria-labelledby": "focus-exit-title", children: [
    /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Leave this room?" }),
    /* @__PURE__ */ w.jsx("h2", { id: "focus-exit-title", children: "End focus session" }),
    /* @__PURE__ */ w.jsx("p", { children: "Your focused time will be saved to your Focus Trail." }),
    /* @__PURE__ */ w.jsxs("div", { className: "focus-button-row", children: [
      /* @__PURE__ */ w.jsx(Te, { onClick: t, children: "Continue focusing" }),
      /* @__PURE__ */ w.jsx(Te, { variant: "primary", onClick: o, children: "End and exit" })
    ] })
  ] }) }) : null;
}
let Ac = null;
function zR(e, t) {
  const o = globalThis.__synapseFocusRoomApi || {};
  if (typeof o[e] != "function") {
    console.warn(`Synapse Focus Room action "${e}" is not available yet.`);
    return;
  }
  return o[e](...t);
}
function BR() {
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
    globalThis[t] = (...i) => zR(o, i);
  });
}
function $R(e = {}) {
  BR();
  const t = e.root || document.getElementById("focusRoomRoot");
  if (!t)
    throw new Error("Focus Room root element was not found.");
  Ac || (Ac = P1.createRoot(t), Ac.render(
    gn.createElement(
      gn.StrictMode,
      null,
      gn.createElement(LR)
    )
  ));
}
const UR = "synapse.generated.history.v6", mw = "synapse.active.generated.v6", HR = "synapse.flashcards.deck.v1", WR = "synapse.quiz.history.v1", GR = "synapse.focusRoom.return-target.v1";
function Pf(e, t) {
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
function KR(e, t) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, t), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function YR(e, t) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, JSON.stringify(t)), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function hw() {
  const e = Pf(UR, []);
  return Array.isArray(e) ? e : [];
}
function QR(e) {
  const t = String((e == null ? void 0 : e.title) || "").trim();
  return t || String((e == null ? void 0 : e.summary) || "").split(/\n+/).map((i) => i.replace(/^#+\s*/, "").trim()).find((i) => i.length > 4) || "Generated Study Notes";
}
function yw(e = {}) {
  return [
    e.id ? `history:${e.id}` : "",
    e.sourceFingerprint ? `fingerprint:${e.sourceFingerprint}` : "",
    e.clientFingerprint ? `fingerprint:${e.clientFingerprint}` : ""
  ].filter(Boolean);
}
function XR(e = {}) {
  const t = Pf(HR, {}), i = yw(e).map((a) => t == null ? void 0 : t[a]).find((a) => a && Array.isArray(a.cards) && a.cards.length);
  return (i == null ? void 0 : i.cards) || [];
}
function ZR(e = {}) {
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
function JR(e = []) {
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
function qR(e = {}) {
  const t = Pf(WR, {}), i = yw(e).flatMap((f) => Array.isArray(t == null ? void 0 : t[f]) ? t[f] : []), a = /* @__PURE__ */ new Set();
  return JR(i).filter((f) => {
    const d = ZR(f);
    return !d || a.has(d) ? !1 : (a.add(d), !0);
  }).sort((f, d) => new Date(d.createdAt || 0) - new Date(f.createdAt || 0));
}
function eN(e = {}) {
  return {
    materialId: String(e.id || e.sourceFingerprint || e.clientFingerprint || "current-material"),
    materialTitle: QR(e),
    materialType: "Generated notes",
    uploadedContent: "",
    aiSummary: e.summary || "",
    sections: e.sections || {},
    flashcards: XR(e),
    quizzes: qR(e),
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
function gw() {
  return hw().filter((e) => e && (e.id || e.summary) && e.kind !== "companion" && !String(e.id || "").startsWith("companion:")).map(eN);
}
function vw(e = "") {
  const t = String(e || "");
  return t && gw().find(
    (o) => o.materialId === t || o.sourceFingerprint === t || o.clientFingerprint === t
  ) || null;
}
function Sw() {
  var t;
  const e = ((t = globalThis.localStorage) == null ? void 0 : t.getItem(mw)) || "";
  return vw(e);
}
function tN(e = "") {
  var i;
  const t = e || ((i = Sw()) == null ? void 0 : i.materialId) || "", o = t ? `/${encodeURIComponent(t)}` : "";
  globalThis.location.hash = `#/focus-room${o}`;
}
function nN(e = "", t = {}) {
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
async function rN(e = "", t = {}) {
  const o = String(e || ""), i = hw().find(
    (d) => String((d == null ? void 0 : d.id) || "") === o || String((d == null ? void 0 : d.sourceFingerprint) || (d == null ? void 0 : d.source_fingerprint) || "") === o || String((d == null ? void 0 : d.clientFingerprint) || (d == null ? void 0 : d.client_fingerprint) || "") === o
  ) || null, a = String((i == null ? void 0 : i.id) || "");
  a && KR(mw, a);
  const f = nN(a, t);
  f.action && YR(GR, f), globalThis.location.href = a ? `index.html?focusReturn=${encodeURIComponent(a)}` : "index.html";
}
function oN() {
  Object.assign(globalThis, {
    getSynapseFocusRoomCurrentMaterial: Sw,
    getSynapseFocusRoomMaterial: vw,
    getSynapseFocusRoomMaterials: gw,
    openSynapseFocusRoom: tN,
    returnFromFocusRoomToWorkspace: rN
  });
}
function iN(e = {}) {
  const t = e && typeof e == "object" && !Array.isArray(e) ? e : {};
  return {
    materialId: String(t.materialId || "").trim(),
    action: String(t.action || "").trim().toLowerCase(),
    sourceId: String(t.sourceId || t.source_id || "").trim(),
    sourceIndex: Number(t.sourceIndex || t.source_index || 0) || 0,
    sourceLabel: String(t.sourceLabel || t.source_label || "").trim(),
    sectionTitle: String(t.sectionTitle || t.section_title || "").trim(),
    highlightId: String(t.highlightId || t.highlight_id || "").trim(),
    excerpt: String(t.excerpt || "").trim()
  };
}
const ww = document.getElementById("focusRoomRoot");
if (!ww)
  throw new Error("Focus Room root element was not found.");
var jg;
(jg = document.getElementById("focusRoomFallbackTitle")) == null || jg.remove();
globalThis.apiClient = new Fg(w1);
globalThis.__synapseNormalizeFocusRoomWorkspaceTarget = iN;
oN();
(!globalThis.location.hash || globalThis.location.hash === "#") && (globalThis.location.hash = "#/focus-room");
$R({ root: ww });
