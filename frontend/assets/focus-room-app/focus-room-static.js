function Wx(e, n) {
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
function Gx(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function Tg(e) {
  const n = String(e || "").toLowerCase();
  return n === "127.0.0.1" || n === "localhost" || n === "::1" || n === "[::1]";
}
function uh(e) {
  return Tg(e) || Gx(e);
}
function Kx(e) {
  return !e || Tg(e) ? "127.0.0.1" : e;
}
const Yx = (() => {
  var p, m, y, g;
  const { protocol: e, hostname: n, port: o } = window.location, i = String(window.SYNAPSE_BACKEND_PORT || ((m = (p = document.body) == null ? void 0 : p.dataset) == null ? void 0 : m.apiPort) || "8001").trim(), a = `http://${Kx(n)}:${i || "8001"}`, d = String(window.SYNAPSE_API_BASE || ((g = (y = document.body) == null ? void 0 : y.dataset) == null ? void 0 : g.apiBase) || "").replace(/\/+$/, ""), c = `${e}//${window.location.host}`.replace(/\/+$/, "");
  return d && !(uh(n) && o !== i && d === c) ? d : e === "file:" || uh(n) && o !== i ? a : `${e}//${window.location.host}`;
})();
class $s extends Error {
  constructor(n, { cause: o } = {}) {
    super(n), this.name = "ApiConnectionError", this.cause = o;
  }
}
const ch = "synapse.client.id.v1";
function Un() {
  return globalThis.window || globalThis;
}
function Jr(e, n = 220) {
  return String(e || "").replace(/[\r\n]+/g, " ").trim().slice(0, n);
}
function dh() {
  const e = globalThis.crypto || Un().crypto;
  return e != null && e.randomUUID ? e.randomUUID() : `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
function Qx() {
  var n, o;
  const e = Un();
  try {
    const i = (n = e.localStorage) == null ? void 0 : n.getItem(ch);
    if (i) return i;
    const a = dh();
    return (o = e.localStorage) == null || o.setItem(ch, a), a;
  } catch {
    return dh();
  }
}
function Xx(e = {}) {
  if (typeof Headers < "u" && e instanceof Headers) {
    const n = {};
    return e.forEach((o, i) => {
      n[i] = o;
    }), n;
  }
  return Array.isArray(e) ? Object.fromEntries(e) : { ...e || {} };
}
class kg {
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
  async requestHeaders(n = {}) {
    var d, c, p;
    const o = Un(), i = Xx(n);
    i["X-Synapse-Client-Id"] = Jr(Qx(), 160);
    const a = (c = (d = o.SynapseAuth) == null ? void 0 : d.getStoredSession) == null ? void 0 : c.call(d);
    if (a && typeof a == "object" && (a.accountId && (i["X-Synapse-User-Id"] = Jr(a.accountId, 160)), a.email && (i["X-Synapse-User-Email"] = Jr(a.email, 220)), a.displayName && (i["X-Synapse-User-Name"] = Jr(a.displayName, 180)), a.authMode && (i["X-Synapse-Auth-Mode"] = Jr(a.authMode, 60)), a.role && (i["X-Synapse-User-Role"] = Jr(a.role, 80))), (p = o.SynapseAuth) != null && p.authHeaders && !i.Authorization && !i.authorization)
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
      throw (l = p == null ? void 0 : p.signal) != null && l.aborted ? new $s(this.timeoutMessage(c), { cause: f }) : new $s(this.connectionMessage(), { cause: f });
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
        y = new $s(
          `Synapse hosted service returned ${(S == null ? void 0 : S.status) || "an unexpected status"} while preparing your analysis.`
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
    throw y || new $s(this.connectionMessage());
  }
  isRetryableResponse(n) {
    return [502, 503, 504].includes(Number(n == null ? void 0 : n.status));
  }
  async fetchWithRetry(n, o = {}, { attempts: i = 3, retryDelayMs: a = 3e3 } = {}) {
    const d = Math.max(1, Math.floor(Number(i) || 1));
    let c = null;
    for (let p = 0; p < d; p += 1) {
      if (c = await this.fetch(n, o), !this.isRetryableResponse(c) || p === d - 1) return c;
      a > 0 && await new Promise((m) => Un().setTimeout(m, a));
    }
    return c;
  }
}
var ii = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function Ag(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var $u = { exports: {} }, pe = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var fh;
function Zx() {
  if (fh) return pe;
  fh = 1;
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
var ph;
function gd() {
  return ph || (ph = 1, $u.exports = Zx()), $u.exports;
}
var C = gd();
const yn = /* @__PURE__ */ Ag(C), Cr = /* @__PURE__ */ Wx({
  __proto__: null,
  default: yn
}, [C]);
var Us = {}, Uu = { exports: {} }, ht = {}, Hu = { exports: {} }, Wu = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var mh;
function Jx() {
  return mh || (mh = 1, (function(e) {
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
  })(Wu)), Wu;
}
var hh;
function qx() {
  return hh || (hh = 1, Hu.exports = Jx()), Hu.exports;
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
var yh;
function e1() {
  if (yh) return ht;
  yh = 1;
  var e = gd(), n = qx();
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
  function Di(t) {
    t._valueTracker || (t._valueTracker = gt(t));
  }
  function hf(t) {
    if (!t) return !1;
    var r = t._valueTracker;
    if (!r) return !0;
    var s = r.getValue(), u = "";
    return t && (u = Re(t) ? t.checked ? "true" : "false" : t.value), t = u, t !== s ? (r.setValue(t), !0) : !1;
  }
  function Ni(t) {
    if (t = t || (typeof document < "u" ? document : void 0), typeof t > "u") return null;
    try {
      return t.activeElement || t.body;
    } catch {
      return t.body;
    }
  }
  function Qa(t, r) {
    var s = r.checked;
    return Q({}, r, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: s ?? t._wrapperState.initialChecked });
  }
  function yf(t, r) {
    var s = r.defaultValue == null ? "" : r.defaultValue, u = r.checked != null ? r.checked : r.defaultChecked;
    s = xe(r.value != null ? r.value : s), t._wrapperState = { initialChecked: u, initialValue: s, controlled: r.type === "checkbox" || r.type === "radio" ? r.checked != null : r.value != null };
  }
  function gf(t, r) {
    r = r.checked, r != null && E(t, "checked", r, !1);
  }
  function Xa(t, r) {
    gf(t, r);
    var s = xe(r.value), u = r.type;
    if (s != null) u === "number" ? (s === 0 && t.value === "" || t.value != s) && (t.value = "" + s) : t.value !== "" + s && (t.value = "" + s);
    else if (u === "submit" || u === "reset") {
      t.removeAttribute("value");
      return;
    }
    r.hasOwnProperty("value") ? Za(t, r.type, s) : r.hasOwnProperty("defaultValue") && Za(t, r.type, xe(r.defaultValue)), r.checked == null && r.defaultChecked != null && (t.defaultChecked = !!r.defaultChecked);
  }
  function vf(t, r, s) {
    if (r.hasOwnProperty("value") || r.hasOwnProperty("defaultValue")) {
      var u = r.type;
      if (!(u !== "submit" && u !== "reset" || r.value !== void 0 && r.value !== null)) return;
      r = "" + t._wrapperState.initialValue, s || r === t.value || (t.value = r), t.defaultValue = r;
    }
    s = t.name, s !== "" && (t.name = ""), t.defaultChecked = !!t._wrapperState.initialChecked, s !== "" && (t.name = s);
  }
  function Za(t, r, s) {
    (r !== "number" || Ni(t.ownerDocument) !== t) && (s == null ? t.defaultValue = "" + t._wrapperState.initialValue : t.defaultValue !== "" + s && (t.defaultValue = "" + s));
  }
  var wo = Array.isArray;
  function br(t, r, s, u) {
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
  function Ja(t, r) {
    if (r.dangerouslySetInnerHTML != null) throw Error(o(91));
    return Q({}, r, { value: void 0, defaultValue: void 0, children: "" + t._wrapperState.initialValue });
  }
  function Sf(t, r) {
    var s = r.value;
    if (s == null) {
      if (s = r.children, r = r.defaultValue, s != null) {
        if (r != null) throw Error(o(92));
        if (wo(s)) {
          if (1 < s.length) throw Error(o(93));
          s = s[0];
        }
        r = s;
      }
      r == null && (r = ""), s = r;
    }
    t._wrapperState = { initialValue: xe(s) };
  }
  function wf(t, r) {
    var s = xe(r.value), u = xe(r.defaultValue);
    s != null && (s = "" + s, s !== t.value && (t.value = s), r.defaultValue == null && t.defaultValue !== s && (t.defaultValue = s)), u != null && (t.defaultValue = "" + u);
  }
  function xf(t) {
    var r = t.textContent;
    r === t._wrapperState.initialValue && r !== "" && r !== null && (t.value = r);
  }
  function _f(t) {
    switch (t) {
      case "svg":
        return "http://www.w3.org/2000/svg";
      case "math":
        return "http://www.w3.org/1998/Math/MathML";
      default:
        return "http://www.w3.org/1999/xhtml";
    }
  }
  function qa(t, r) {
    return t == null || t === "http://www.w3.org/1999/xhtml" ? _f(r) : t === "http://www.w3.org/2000/svg" && r === "foreignObject" ? "http://www.w3.org/1999/xhtml" : t;
  }
  var ji, Tf = (function(t) {
    return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction ? function(r, s, u, h) {
      MSApp.execUnsafeLocalFunction(function() {
        return t(r, s, u, h);
      });
    } : t;
  })(function(t, r) {
    if (t.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in t) t.innerHTML = r;
    else {
      for (ji = ji || document.createElement("div"), ji.innerHTML = "<svg>" + r.valueOf().toString() + "</svg>", r = ji.firstChild; t.firstChild; ) t.removeChild(t.firstChild);
      for (; r.firstChild; ) t.appendChild(r.firstChild);
    }
  });
  function xo(t, r) {
    if (r) {
      var s = t.firstChild;
      if (s && s === t.lastChild && s.nodeType === 3) {
        s.nodeValue = r;
        return;
      }
    }
    t.textContent = r;
  }
  var _o = {
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
  }, QS = ["Webkit", "ms", "Moz", "O"];
  Object.keys(_o).forEach(function(t) {
    QS.forEach(function(r) {
      r = r + t.charAt(0).toUpperCase() + t.substring(1), _o[r] = _o[t];
    });
  });
  function kf(t, r, s) {
    return r == null || typeof r == "boolean" || r === "" ? "" : s || typeof r != "number" || r === 0 || _o.hasOwnProperty(t) && _o[t] ? ("" + r).trim() : r + "px";
  }
  function Af(t, r) {
    t = t.style;
    for (var s in r) if (r.hasOwnProperty(s)) {
      var u = s.indexOf("--") === 0, h = kf(s, r[s], u);
      s === "float" && (s = "cssFloat"), u ? t.setProperty(s, h) : t[s] = h;
    }
  }
  var XS = Q({ menuitem: !0 }, { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 });
  function el(t, r) {
    if (r) {
      if (XS[t] && (r.children != null || r.dangerouslySetInnerHTML != null)) throw Error(o(137, t));
      if (r.dangerouslySetInnerHTML != null) {
        if (r.children != null) throw Error(o(60));
        if (typeof r.dangerouslySetInnerHTML != "object" || !("__html" in r.dangerouslySetInnerHTML)) throw Error(o(61));
      }
      if (r.style != null && typeof r.style != "object") throw Error(o(62));
    }
  }
  function tl(t, r) {
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
  var nl = null;
  function rl(t) {
    return t = t.target || t.srcElement || window, t.correspondingUseElement && (t = t.correspondingUseElement), t.nodeType === 3 ? t.parentNode : t;
  }
  var ol = null, Pr = null, Er = null;
  function Cf(t) {
    if (t = Ho(t)) {
      if (typeof ol != "function") throw Error(o(280));
      var r = t.stateNode;
      r && (r = rs(r), ol(t.stateNode, t.type, r));
    }
  }
  function bf(t) {
    Pr ? Er ? Er.push(t) : Er = [t] : Pr = t;
  }
  function Pf() {
    if (Pr) {
      var t = Pr, r = Er;
      if (Er = Pr = null, Cf(t), r) for (t = 0; t < r.length; t++) Cf(r[t]);
    }
  }
  function Ef(t, r) {
    return t(r);
  }
  function Mf() {
  }
  var il = !1;
  function Rf(t, r, s) {
    if (il) return t(r, s);
    il = !0;
    try {
      return Ef(t, r, s);
    } finally {
      il = !1, (Pr !== null || Er !== null) && (Mf(), Pf());
    }
  }
  function To(t, r) {
    var s = t.stateNode;
    if (s === null) return null;
    var u = rs(s);
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
  var sl = !1;
  if (p) try {
    var ko = {};
    Object.defineProperty(ko, "passive", { get: function() {
      sl = !0;
    } }), window.addEventListener("test", ko, ko), window.removeEventListener("test", ko, ko);
  } catch {
    sl = !1;
  }
  function ZS(t, r, s, u, h, v, _, P, M) {
    var F = Array.prototype.slice.call(arguments, 3);
    try {
      r.apply(s, F);
    } catch (B) {
      this.onError(B);
    }
  }
  var Ao = !1, Ii = null, Fi = !1, al = null, JS = { onError: function(t) {
    Ao = !0, Ii = t;
  } };
  function qS(t, r, s, u, h, v, _, P, M) {
    Ao = !1, Ii = null, ZS.apply(JS, arguments);
  }
  function ew(t, r, s, u, h, v, _, P, M) {
    if (qS.apply(this, arguments), Ao) {
      if (Ao) {
        var F = Ii;
        Ao = !1, Ii = null;
      } else throw Error(o(198));
      Fi || (Fi = !0, al = F);
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
  function Df(t) {
    if (t.tag === 13) {
      var r = t.memoizedState;
      if (r === null && (t = t.alternate, t !== null && (r = t.memoizedState)), r !== null) return r.dehydrated;
    }
    return null;
  }
  function Nf(t) {
    if (Jn(t) !== t) throw Error(o(188));
  }
  function tw(t) {
    var r = t.alternate;
    if (!r) {
      if (r = Jn(t), r === null) throw Error(o(188));
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
          if (v === s) return Nf(h), t;
          if (v === u) return Nf(h), r;
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
  function jf(t) {
    return t = tw(t), t !== null ? If(t) : null;
  }
  function If(t) {
    if (t.tag === 5 || t.tag === 6) return t;
    for (t = t.child; t !== null; ) {
      var r = If(t);
      if (r !== null) return r;
      t = t.sibling;
    }
    return null;
  }
  var Ff = n.unstable_scheduleCallback, Of = n.unstable_cancelCallback, nw = n.unstable_shouldYield, rw = n.unstable_requestPaint, Oe = n.unstable_now, ow = n.unstable_getCurrentPriorityLevel, ll = n.unstable_ImmediatePriority, Lf = n.unstable_UserBlockingPriority, Oi = n.unstable_NormalPriority, iw = n.unstable_LowPriority, Vf = n.unstable_IdlePriority, Li = null, Gt = null;
  function sw(t) {
    if (Gt && typeof Gt.onCommitFiberRoot == "function") try {
      Gt.onCommitFiberRoot(Li, t, void 0, (t.current.flags & 128) === 128);
    } catch {
    }
  }
  var jt = Math.clz32 ? Math.clz32 : uw, aw = Math.log, lw = Math.LN2;
  function uw(t) {
    return t >>>= 0, t === 0 ? 32 : 31 - (aw(t) / lw | 0) | 0;
  }
  var Vi = 64, Bi = 4194304;
  function Co(t) {
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
  function zi(t, r) {
    var s = t.pendingLanes;
    if (s === 0) return 0;
    var u = 0, h = t.suspendedLanes, v = t.pingedLanes, _ = s & 268435455;
    if (_ !== 0) {
      var P = _ & ~h;
      P !== 0 ? u = Co(P) : (v &= _, v !== 0 && (u = Co(v)));
    } else _ = s & ~h, _ !== 0 ? u = Co(_) : v !== 0 && (u = Co(v));
    if (u === 0) return 0;
    if (r !== 0 && r !== u && (r & h) === 0 && (h = u & -u, v = r & -r, h >= v || h === 16 && (v & 4194240) !== 0)) return r;
    if ((u & 4) !== 0 && (u |= s & 16), r = t.entangledLanes, r !== 0) for (t = t.entanglements, r &= u; 0 < r; ) s = 31 - jt(r), h = 1 << s, u |= t[s], r &= ~h;
    return u;
  }
  function cw(t, r) {
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
  function dw(t, r) {
    for (var s = t.suspendedLanes, u = t.pingedLanes, h = t.expirationTimes, v = t.pendingLanes; 0 < v; ) {
      var _ = 31 - jt(v), P = 1 << _, M = h[_];
      M === -1 ? ((P & s) === 0 || (P & u) !== 0) && (h[_] = cw(P, r)) : M <= r && (t.expiredLanes |= P), v &= ~P;
    }
  }
  function ul(t) {
    return t = t.pendingLanes & -1073741825, t !== 0 ? t : t & 1073741824 ? 1073741824 : 0;
  }
  function Bf() {
    var t = Vi;
    return Vi <<= 1, (Vi & 4194240) === 0 && (Vi = 64), t;
  }
  function cl(t) {
    for (var r = [], s = 0; 31 > s; s++) r.push(t);
    return r;
  }
  function bo(t, r, s) {
    t.pendingLanes |= r, r !== 536870912 && (t.suspendedLanes = 0, t.pingedLanes = 0), t = t.eventTimes, r = 31 - jt(r), t[r] = s;
  }
  function fw(t, r) {
    var s = t.pendingLanes & ~r;
    t.pendingLanes = r, t.suspendedLanes = 0, t.pingedLanes = 0, t.expiredLanes &= r, t.mutableReadLanes &= r, t.entangledLanes &= r, r = t.entanglements;
    var u = t.eventTimes;
    for (t = t.expirationTimes; 0 < s; ) {
      var h = 31 - jt(s), v = 1 << h;
      r[h] = 0, u[h] = -1, t[h] = -1, s &= ~v;
    }
  }
  function dl(t, r) {
    var s = t.entangledLanes |= r;
    for (t = t.entanglements; s; ) {
      var u = 31 - jt(s), h = 1 << u;
      h & r | t[u] & r && (t[u] |= r), s &= ~h;
    }
  }
  var _e = 0;
  function zf(t) {
    return t &= -t, 1 < t ? 4 < t ? (t & 268435455) !== 0 ? 16 : 536870912 : 4 : 1;
  }
  var $f, fl, Uf, Hf, Wf, pl = !1, $i = [], _n = null, Tn = null, kn = null, Po = /* @__PURE__ */ new Map(), Eo = /* @__PURE__ */ new Map(), An = [], pw = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
  function Gf(t, r) {
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
        Eo.delete(r.pointerId);
    }
  }
  function Mo(t, r, s, u, h, v) {
    return t === null || t.nativeEvent !== v ? (t = { blockedOn: r, domEventName: s, eventSystemFlags: u, nativeEvent: v, targetContainers: [h] }, r !== null && (r = Ho(r), r !== null && fl(r)), t) : (t.eventSystemFlags |= u, r = t.targetContainers, h !== null && r.indexOf(h) === -1 && r.push(h), t);
  }
  function mw(t, r, s, u, h) {
    switch (r) {
      case "focusin":
        return _n = Mo(_n, t, r, s, u, h), !0;
      case "dragenter":
        return Tn = Mo(Tn, t, r, s, u, h), !0;
      case "mouseover":
        return kn = Mo(kn, t, r, s, u, h), !0;
      case "pointerover":
        var v = h.pointerId;
        return Po.set(v, Mo(Po.get(v) || null, t, r, s, u, h)), !0;
      case "gotpointercapture":
        return v = h.pointerId, Eo.set(v, Mo(Eo.get(v) || null, t, r, s, u, h)), !0;
    }
    return !1;
  }
  function Kf(t) {
    var r = qn(t.target);
    if (r !== null) {
      var s = Jn(r);
      if (s !== null) {
        if (r = s.tag, r === 13) {
          if (r = Df(s), r !== null) {
            t.blockedOn = r, Wf(t.priority, function() {
              Uf(s);
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
  function Ui(t) {
    if (t.blockedOn !== null) return !1;
    for (var r = t.targetContainers; 0 < r.length; ) {
      var s = hl(t.domEventName, t.eventSystemFlags, r[0], t.nativeEvent);
      if (s === null) {
        s = t.nativeEvent;
        var u = new s.constructor(s.type, s);
        nl = u, s.target.dispatchEvent(u), nl = null;
      } else return r = Ho(s), r !== null && fl(r), t.blockedOn = s, !1;
      r.shift();
    }
    return !0;
  }
  function Yf(t, r, s) {
    Ui(t) && s.delete(r);
  }
  function hw() {
    pl = !1, _n !== null && Ui(_n) && (_n = null), Tn !== null && Ui(Tn) && (Tn = null), kn !== null && Ui(kn) && (kn = null), Po.forEach(Yf), Eo.forEach(Yf);
  }
  function Ro(t, r) {
    t.blockedOn === r && (t.blockedOn = null, pl || (pl = !0, n.unstable_scheduleCallback(n.unstable_NormalPriority, hw)));
  }
  function Do(t) {
    function r(h) {
      return Ro(h, t);
    }
    if (0 < $i.length) {
      Ro($i[0], t);
      for (var s = 1; s < $i.length; s++) {
        var u = $i[s];
        u.blockedOn === t && (u.blockedOn = null);
      }
    }
    for (_n !== null && Ro(_n, t), Tn !== null && Ro(Tn, t), kn !== null && Ro(kn, t), Po.forEach(r), Eo.forEach(r), s = 0; s < An.length; s++) u = An[s], u.blockedOn === t && (u.blockedOn = null);
    for (; 0 < An.length && (s = An[0], s.blockedOn === null); ) Kf(s), s.blockedOn === null && An.shift();
  }
  var Mr = D.ReactCurrentBatchConfig, Hi = !0;
  function yw(t, r, s, u) {
    var h = _e, v = Mr.transition;
    Mr.transition = null;
    try {
      _e = 1, ml(t, r, s, u);
    } finally {
      _e = h, Mr.transition = v;
    }
  }
  function gw(t, r, s, u) {
    var h = _e, v = Mr.transition;
    Mr.transition = null;
    try {
      _e = 4, ml(t, r, s, u);
    } finally {
      _e = h, Mr.transition = v;
    }
  }
  function ml(t, r, s, u) {
    if (Hi) {
      var h = hl(t, r, s, u);
      if (h === null) Dl(t, r, u, Wi, s), Gf(t, u);
      else if (mw(h, t, r, s, u)) u.stopPropagation();
      else if (Gf(t, u), r & 4 && -1 < pw.indexOf(t)) {
        for (; h !== null; ) {
          var v = Ho(h);
          if (v !== null && $f(v), v = hl(t, r, s, u), v === null && Dl(t, r, u, Wi, s), v === h) break;
          h = v;
        }
        h !== null && u.stopPropagation();
      } else Dl(t, r, u, null, s);
    }
  }
  var Wi = null;
  function hl(t, r, s, u) {
    if (Wi = null, t = rl(u), t = qn(t), t !== null) if (r = Jn(t), r === null) t = null;
    else if (s = r.tag, s === 13) {
      if (t = Df(r), t !== null) return t;
      t = null;
    } else if (s === 3) {
      if (r.stateNode.current.memoizedState.isDehydrated) return r.tag === 3 ? r.stateNode.containerInfo : null;
      t = null;
    } else r !== t && (t = null);
    return Wi = t, null;
  }
  function Qf(t) {
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
        switch (ow()) {
          case ll:
            return 1;
          case Lf:
            return 4;
          case Oi:
          case iw:
            return 16;
          case Vf:
            return 536870912;
          default:
            return 16;
        }
      default:
        return 16;
    }
  }
  var Cn = null, yl = null, Gi = null;
  function Xf() {
    if (Gi) return Gi;
    var t, r = yl, s = r.length, u, h = "value" in Cn ? Cn.value : Cn.textContent, v = h.length;
    for (t = 0; t < s && r[t] === h[t]; t++) ;
    var _ = s - t;
    for (u = 1; u <= _ && r[s - u] === h[v - u]; u++) ;
    return Gi = h.slice(t, 1 < u ? 1 - u : void 0);
  }
  function Ki(t) {
    var r = t.keyCode;
    return "charCode" in t ? (t = t.charCode, t === 0 && r === 13 && (t = 13)) : t = r, t === 10 && (t = 13), 32 <= t || t === 13 ? t : 0;
  }
  function Yi() {
    return !0;
  }
  function Zf() {
    return !1;
  }
  function vt(t) {
    function r(s, u, h, v, _) {
      this._reactName = s, this._targetInst = h, this.type = u, this.nativeEvent = v, this.target = _, this.currentTarget = null;
      for (var P in t) t.hasOwnProperty(P) && (s = t[P], this[P] = s ? s(v) : v[P]);
      return this.isDefaultPrevented = (v.defaultPrevented != null ? v.defaultPrevented : v.returnValue === !1) ? Yi : Zf, this.isPropagationStopped = Zf, this;
    }
    return Q(r.prototype, { preventDefault: function() {
      this.defaultPrevented = !0;
      var s = this.nativeEvent;
      s && (s.preventDefault ? s.preventDefault() : typeof s.returnValue != "unknown" && (s.returnValue = !1), this.isDefaultPrevented = Yi);
    }, stopPropagation: function() {
      var s = this.nativeEvent;
      s && (s.stopPropagation ? s.stopPropagation() : typeof s.cancelBubble != "unknown" && (s.cancelBubble = !0), this.isPropagationStopped = Yi);
    }, persist: function() {
    }, isPersistent: Yi }), r;
  }
  var Rr = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(t) {
    return t.timeStamp || Date.now();
  }, defaultPrevented: 0, isTrusted: 0 }, gl = vt(Rr), No = Q({}, Rr, { view: 0, detail: 0 }), vw = vt(No), vl, Sl, jo, Qi = Q({}, No, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: xl, button: 0, buttons: 0, relatedTarget: function(t) {
    return t.relatedTarget === void 0 ? t.fromElement === t.srcElement ? t.toElement : t.fromElement : t.relatedTarget;
  }, movementX: function(t) {
    return "movementX" in t ? t.movementX : (t !== jo && (jo && t.type === "mousemove" ? (vl = t.screenX - jo.screenX, Sl = t.screenY - jo.screenY) : Sl = vl = 0, jo = t), vl);
  }, movementY: function(t) {
    return "movementY" in t ? t.movementY : Sl;
  } }), Jf = vt(Qi), Sw = Q({}, Qi, { dataTransfer: 0 }), ww = vt(Sw), xw = Q({}, No, { relatedTarget: 0 }), wl = vt(xw), _w = Q({}, Rr, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), Tw = vt(_w), kw = Q({}, Rr, { clipboardData: function(t) {
    return "clipboardData" in t ? t.clipboardData : window.clipboardData;
  } }), Aw = vt(kw), Cw = Q({}, Rr, { data: 0 }), qf = vt(Cw), bw = {
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
  }, Pw = {
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
  }, Ew = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
  function Mw(t) {
    var r = this.nativeEvent;
    return r.getModifierState ? r.getModifierState(t) : (t = Ew[t]) ? !!r[t] : !1;
  }
  function xl() {
    return Mw;
  }
  var Rw = Q({}, No, { key: function(t) {
    if (t.key) {
      var r = bw[t.key] || t.key;
      if (r !== "Unidentified") return r;
    }
    return t.type === "keypress" ? (t = Ki(t), t === 13 ? "Enter" : String.fromCharCode(t)) : t.type === "keydown" || t.type === "keyup" ? Pw[t.keyCode] || "Unidentified" : "";
  }, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: xl, charCode: function(t) {
    return t.type === "keypress" ? Ki(t) : 0;
  }, keyCode: function(t) {
    return t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
  }, which: function(t) {
    return t.type === "keypress" ? Ki(t) : t.type === "keydown" || t.type === "keyup" ? t.keyCode : 0;
  } }), Dw = vt(Rw), Nw = Q({}, Qi, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), ep = vt(Nw), jw = Q({}, No, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: xl }), Iw = vt(jw), Fw = Q({}, Rr, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), Ow = vt(Fw), Lw = Q({}, Qi, {
    deltaX: function(t) {
      return "deltaX" in t ? t.deltaX : "wheelDeltaX" in t ? -t.wheelDeltaX : 0;
    },
    deltaY: function(t) {
      return "deltaY" in t ? t.deltaY : "wheelDeltaY" in t ? -t.wheelDeltaY : "wheelDelta" in t ? -t.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), Vw = vt(Lw), Bw = [9, 13, 27, 32], _l = p && "CompositionEvent" in window, Io = null;
  p && "documentMode" in document && (Io = document.documentMode);
  var zw = p && "TextEvent" in window && !Io, tp = p && (!_l || Io && 8 < Io && 11 >= Io), np = " ", rp = !1;
  function op(t, r) {
    switch (t) {
      case "keyup":
        return Bw.indexOf(r.keyCode) !== -1;
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
  function ip(t) {
    return t = t.detail, typeof t == "object" && "data" in t ? t.data : null;
  }
  var Dr = !1;
  function $w(t, r) {
    switch (t) {
      case "compositionend":
        return ip(r);
      case "keypress":
        return r.which !== 32 ? null : (rp = !0, np);
      case "textInput":
        return t = r.data, t === np && rp ? null : t;
      default:
        return null;
    }
  }
  function Uw(t, r) {
    if (Dr) return t === "compositionend" || !_l && op(t, r) ? (t = Xf(), Gi = yl = Cn = null, Dr = !1, t) : null;
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
        return tp && r.locale !== "ko" ? null : r.data;
      default:
        return null;
    }
  }
  var Hw = { color: !0, date: !0, datetime: !0, "datetime-local": !0, email: !0, month: !0, number: !0, password: !0, range: !0, search: !0, tel: !0, text: !0, time: !0, url: !0, week: !0 };
  function sp(t) {
    var r = t && t.nodeName && t.nodeName.toLowerCase();
    return r === "input" ? !!Hw[t.type] : r === "textarea";
  }
  function ap(t, r, s, u) {
    bf(u), r = es(r, "onChange"), 0 < r.length && (s = new gl("onChange", "change", null, s, u), t.push({ event: s, listeners: r }));
  }
  var Fo = null, Oo = null;
  function Ww(t) {
    Ap(t, 0);
  }
  function Xi(t) {
    var r = Or(t);
    if (hf(r)) return t;
  }
  function Gw(t, r) {
    if (t === "change") return r;
  }
  var lp = !1;
  if (p) {
    var Tl;
    if (p) {
      var kl = "oninput" in document;
      if (!kl) {
        var up = document.createElement("div");
        up.setAttribute("oninput", "return;"), kl = typeof up.oninput == "function";
      }
      Tl = kl;
    } else Tl = !1;
    lp = Tl && (!document.documentMode || 9 < document.documentMode);
  }
  function cp() {
    Fo && (Fo.detachEvent("onpropertychange", dp), Oo = Fo = null);
  }
  function dp(t) {
    if (t.propertyName === "value" && Xi(Oo)) {
      var r = [];
      ap(r, Oo, t, rl(t)), Rf(Ww, r);
    }
  }
  function Kw(t, r, s) {
    t === "focusin" ? (cp(), Fo = r, Oo = s, Fo.attachEvent("onpropertychange", dp)) : t === "focusout" && cp();
  }
  function Yw(t) {
    if (t === "selectionchange" || t === "keyup" || t === "keydown") return Xi(Oo);
  }
  function Qw(t, r) {
    if (t === "click") return Xi(r);
  }
  function Xw(t, r) {
    if (t === "input" || t === "change") return Xi(r);
  }
  function Zw(t, r) {
    return t === r && (t !== 0 || 1 / t === 1 / r) || t !== t && r !== r;
  }
  var It = typeof Object.is == "function" ? Object.is : Zw;
  function Lo(t, r) {
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
  function fp(t) {
    for (; t && t.firstChild; ) t = t.firstChild;
    return t;
  }
  function pp(t, r) {
    var s = fp(t);
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
      s = fp(s);
    }
  }
  function mp(t, r) {
    return t && r ? t === r ? !0 : t && t.nodeType === 3 ? !1 : r && r.nodeType === 3 ? mp(t, r.parentNode) : "contains" in t ? t.contains(r) : t.compareDocumentPosition ? !!(t.compareDocumentPosition(r) & 16) : !1 : !1;
  }
  function hp() {
    for (var t = window, r = Ni(); r instanceof t.HTMLIFrameElement; ) {
      try {
        var s = typeof r.contentWindow.location.href == "string";
      } catch {
        s = !1;
      }
      if (s) t = r.contentWindow;
      else break;
      r = Ni(t.document);
    }
    return r;
  }
  function Al(t) {
    var r = t && t.nodeName && t.nodeName.toLowerCase();
    return r && (r === "input" && (t.type === "text" || t.type === "search" || t.type === "tel" || t.type === "url" || t.type === "password") || r === "textarea" || t.contentEditable === "true");
  }
  function Jw(t) {
    var r = hp(), s = t.focusedElem, u = t.selectionRange;
    if (r !== s && s && s.ownerDocument && mp(s.ownerDocument.documentElement, s)) {
      if (u !== null && Al(s)) {
        if (r = u.start, t = u.end, t === void 0 && (t = r), "selectionStart" in s) s.selectionStart = r, s.selectionEnd = Math.min(t, s.value.length);
        else if (t = (r = s.ownerDocument || document) && r.defaultView || window, t.getSelection) {
          t = t.getSelection();
          var h = s.textContent.length, v = Math.min(u.start, h);
          u = u.end === void 0 ? v : Math.min(u.end, h), !t.extend && v > u && (h = u, u = v, v = h), h = pp(s, v);
          var _ = pp(
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
  var qw = p && "documentMode" in document && 11 >= document.documentMode, Nr = null, Cl = null, Vo = null, bl = !1;
  function yp(t, r, s) {
    var u = s.window === s ? s.document : s.nodeType === 9 ? s : s.ownerDocument;
    bl || Nr == null || Nr !== Ni(u) || (u = Nr, "selectionStart" in u && Al(u) ? u = { start: u.selectionStart, end: u.selectionEnd } : (u = (u.ownerDocument && u.ownerDocument.defaultView || window).getSelection(), u = { anchorNode: u.anchorNode, anchorOffset: u.anchorOffset, focusNode: u.focusNode, focusOffset: u.focusOffset }), Vo && Lo(Vo, u) || (Vo = u, u = es(Cl, "onSelect"), 0 < u.length && (r = new gl("onSelect", "select", null, r, s), t.push({ event: r, listeners: u }), r.target = Nr)));
  }
  function Zi(t, r) {
    var s = {};
    return s[t.toLowerCase()] = r.toLowerCase(), s["Webkit" + t] = "webkit" + r, s["Moz" + t] = "moz" + r, s;
  }
  var jr = { animationend: Zi("Animation", "AnimationEnd"), animationiteration: Zi("Animation", "AnimationIteration"), animationstart: Zi("Animation", "AnimationStart"), transitionend: Zi("Transition", "TransitionEnd") }, Pl = {}, gp = {};
  p && (gp = document.createElement("div").style, "AnimationEvent" in window || (delete jr.animationend.animation, delete jr.animationiteration.animation, delete jr.animationstart.animation), "TransitionEvent" in window || delete jr.transitionend.transition);
  function Ji(t) {
    if (Pl[t]) return Pl[t];
    if (!jr[t]) return t;
    var r = jr[t], s;
    for (s in r) if (r.hasOwnProperty(s) && s in gp) return Pl[t] = r[s];
    return t;
  }
  var vp = Ji("animationend"), Sp = Ji("animationiteration"), wp = Ji("animationstart"), xp = Ji("transitionend"), _p = /* @__PURE__ */ new Map(), Tp = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
  function bn(t, r) {
    _p.set(t, r), d(r, [t]);
  }
  for (var El = 0; El < Tp.length; El++) {
    var Ml = Tp[El], ex = Ml.toLowerCase(), tx = Ml[0].toUpperCase() + Ml.slice(1);
    bn(ex, "on" + tx);
  }
  bn(vp, "onAnimationEnd"), bn(Sp, "onAnimationIteration"), bn(wp, "onAnimationStart"), bn("dblclick", "onDoubleClick"), bn("focusin", "onFocus"), bn("focusout", "onBlur"), bn(xp, "onTransitionEnd"), c("onMouseEnter", ["mouseout", "mouseover"]), c("onMouseLeave", ["mouseout", "mouseover"]), c("onPointerEnter", ["pointerout", "pointerover"]), c("onPointerLeave", ["pointerout", "pointerover"]), d("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" ")), d("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")), d("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]), d("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" ")), d("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" ")), d("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
  var Bo = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), nx = new Set("cancel close invalid load scroll toggle".split(" ").concat(Bo));
  function kp(t, r, s) {
    var u = t.type || "unknown-event";
    t.currentTarget = s, ew(u, r, void 0, t), t.currentTarget = null;
  }
  function Ap(t, r) {
    r = (r & 4) !== 0;
    for (var s = 0; s < t.length; s++) {
      var u = t[s], h = u.event;
      u = u.listeners;
      e: {
        var v = void 0;
        if (r) for (var _ = u.length - 1; 0 <= _; _--) {
          var P = u[_], M = P.instance, F = P.currentTarget;
          if (P = P.listener, M !== v && h.isPropagationStopped()) break e;
          kp(h, P, F), v = M;
        }
        else for (_ = 0; _ < u.length; _++) {
          if (P = u[_], M = P.instance, F = P.currentTarget, P = P.listener, M !== v && h.isPropagationStopped()) break e;
          kp(h, P, F), v = M;
        }
      }
    }
    if (Fi) throw t = al, Fi = !1, al = null, t;
  }
  function Ee(t, r) {
    var s = r[Ll];
    s === void 0 && (s = r[Ll] = /* @__PURE__ */ new Set());
    var u = t + "__bubble";
    s.has(u) || (Cp(r, t, 2, !1), s.add(u));
  }
  function Rl(t, r, s) {
    var u = 0;
    r && (u |= 4), Cp(s, t, u, r);
  }
  var qi = "_reactListening" + Math.random().toString(36).slice(2);
  function zo(t) {
    if (!t[qi]) {
      t[qi] = !0, i.forEach(function(s) {
        s !== "selectionchange" && (nx.has(s) || Rl(s, !1, t), Rl(s, !0, t));
      });
      var r = t.nodeType === 9 ? t : t.ownerDocument;
      r === null || r[qi] || (r[qi] = !0, Rl("selectionchange", !1, r));
    }
  }
  function Cp(t, r, s, u) {
    switch (Qf(r)) {
      case 1:
        var h = yw;
        break;
      case 4:
        h = gw;
        break;
      default:
        h = ml;
    }
    s = h.bind(null, r, s, t), h = void 0, !sl || r !== "touchstart" && r !== "touchmove" && r !== "wheel" || (h = !0), u ? h !== void 0 ? t.addEventListener(r, s, { capture: !0, passive: h }) : t.addEventListener(r, s, !0) : h !== void 0 ? t.addEventListener(r, s, { passive: h }) : t.addEventListener(r, s, !1);
  }
  function Dl(t, r, s, u, h) {
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
          if (_ = qn(P), _ === null) return;
          if (M = _.tag, M === 5 || M === 6) {
            u = v = _;
            continue e;
          }
          P = P.parentNode;
        }
      }
      u = u.return;
    }
    Rf(function() {
      var F = v, B = rl(s), $ = [];
      e: {
        var V = _p.get(t);
        if (V !== void 0) {
          var q = gl, te = t;
          switch (t) {
            case "keypress":
              if (Ki(s) === 0) break e;
            case "keydown":
            case "keyup":
              q = Dw;
              break;
            case "focusin":
              te = "focus", q = wl;
              break;
            case "focusout":
              te = "blur", q = wl;
              break;
            case "beforeblur":
            case "afterblur":
              q = wl;
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
              q = Jf;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              q = ww;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              q = Iw;
              break;
            case vp:
            case Sp:
            case wp:
              q = Tw;
              break;
            case xp:
              q = Ow;
              break;
            case "scroll":
              q = vw;
              break;
            case "wheel":
              q = Vw;
              break;
            case "copy":
            case "cut":
            case "paste":
              q = Aw;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              q = ep;
          }
          var oe = (r & 4) !== 0, Le = !oe && t === "scroll", j = oe ? V !== null ? V + "Capture" : null : V;
          oe = [];
          for (var R = F, I; R !== null; ) {
            I = R;
            var U = I.stateNode;
            if (I.tag === 5 && U !== null && (I = U, j !== null && (U = To(R, j), U != null && oe.push($o(R, U, I)))), Le) break;
            R = R.return;
          }
          0 < oe.length && (V = new q(V, te, null, s, B), $.push({ event: V, listeners: oe }));
        }
      }
      if ((r & 7) === 0) {
        e: {
          if (V = t === "mouseover" || t === "pointerover", q = t === "mouseout" || t === "pointerout", V && s !== nl && (te = s.relatedTarget || s.fromElement) && (qn(te) || te[sn])) break e;
          if ((q || V) && (V = B.window === B ? B : (V = B.ownerDocument) ? V.defaultView || V.parentWindow : window, q ? (te = s.relatedTarget || s.toElement, q = F, te = te ? qn(te) : null, te !== null && (Le = Jn(te), te !== Le || te.tag !== 5 && te.tag !== 6) && (te = null)) : (q = null, te = F), q !== te)) {
            if (oe = Jf, U = "onMouseLeave", j = "onMouseEnter", R = "mouse", (t === "pointerout" || t === "pointerover") && (oe = ep, U = "onPointerLeave", j = "onPointerEnter", R = "pointer"), Le = q == null ? V : Or(q), I = te == null ? V : Or(te), V = new oe(U, R + "leave", q, s, B), V.target = Le, V.relatedTarget = I, U = null, qn(B) === F && (oe = new oe(j, R + "enter", te, s, B), oe.target = I, oe.relatedTarget = Le, U = oe), Le = U, q && te) t: {
              for (oe = q, j = te, R = 0, I = oe; I; I = Ir(I)) R++;
              for (I = 0, U = j; U; U = Ir(U)) I++;
              for (; 0 < R - I; ) oe = Ir(oe), R--;
              for (; 0 < I - R; ) j = Ir(j), I--;
              for (; R--; ) {
                if (oe === j || j !== null && oe === j.alternate) break t;
                oe = Ir(oe), j = Ir(j);
              }
              oe = null;
            }
            else oe = null;
            q !== null && bp($, V, q, oe, !1), te !== null && Le !== null && bp($, Le, te, oe, !0);
          }
        }
        e: {
          if (V = F ? Or(F) : window, q = V.nodeName && V.nodeName.toLowerCase(), q === "select" || q === "input" && V.type === "file") var ie = Gw;
          else if (sp(V)) if (lp) ie = Xw;
          else {
            ie = Yw;
            var ae = Kw;
          }
          else (q = V.nodeName) && q.toLowerCase() === "input" && (V.type === "checkbox" || V.type === "radio") && (ie = Qw);
          if (ie && (ie = ie(t, F))) {
            ap($, ie, s, B);
            break e;
          }
          ae && ae(t, V, F), t === "focusout" && (ae = V._wrapperState) && ae.controlled && V.type === "number" && Za(V, "number", V.value);
        }
        switch (ae = F ? Or(F) : window, t) {
          case "focusin":
            (sp(ae) || ae.contentEditable === "true") && (Nr = ae, Cl = F, Vo = null);
            break;
          case "focusout":
            Vo = Cl = Nr = null;
            break;
          case "mousedown":
            bl = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            bl = !1, yp($, s, B);
            break;
          case "selectionchange":
            if (qw) break;
          case "keydown":
          case "keyup":
            yp($, s, B);
        }
        var le;
        if (_l) e: {
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
        else Dr ? op(t, s) && (ue = "onCompositionEnd") : t === "keydown" && s.keyCode === 229 && (ue = "onCompositionStart");
        ue && (tp && s.locale !== "ko" && (Dr || ue !== "onCompositionStart" ? ue === "onCompositionEnd" && Dr && (le = Xf()) : (Cn = B, yl = "value" in Cn ? Cn.value : Cn.textContent, Dr = !0)), ae = es(F, ue), 0 < ae.length && (ue = new qf(ue, t, null, s, B), $.push({ event: ue, listeners: ae }), le ? ue.data = le : (le = ip(s), le !== null && (ue.data = le)))), (le = zw ? $w(t, s) : Uw(t, s)) && (F = es(F, "onBeforeInput"), 0 < F.length && (B = new qf("onBeforeInput", "beforeinput", null, s, B), $.push({ event: B, listeners: F }), B.data = le));
      }
      Ap($, r);
    });
  }
  function $o(t, r, s) {
    return { instance: t, listener: r, currentTarget: s };
  }
  function es(t, r) {
    for (var s = r + "Capture", u = []; t !== null; ) {
      var h = t, v = h.stateNode;
      h.tag === 5 && v !== null && (h = v, v = To(t, s), v != null && u.unshift($o(t, v, h)), v = To(t, r), v != null && u.push($o(t, v, h))), t = t.return;
    }
    return u;
  }
  function Ir(t) {
    if (t === null) return null;
    do
      t = t.return;
    while (t && t.tag !== 5);
    return t || null;
  }
  function bp(t, r, s, u, h) {
    for (var v = r._reactName, _ = []; s !== null && s !== u; ) {
      var P = s, M = P.alternate, F = P.stateNode;
      if (M !== null && M === u) break;
      P.tag === 5 && F !== null && (P = F, h ? (M = To(s, v), M != null && _.unshift($o(s, M, P))) : h || (M = To(s, v), M != null && _.push($o(s, M, P)))), s = s.return;
    }
    _.length !== 0 && t.push({ event: r, listeners: _ });
  }
  var rx = /\r\n?/g, ox = /\u0000|\uFFFD/g;
  function Pp(t) {
    return (typeof t == "string" ? t : "" + t).replace(rx, `
`).replace(ox, "");
  }
  function ts(t, r, s) {
    if (r = Pp(r), Pp(t) !== r && s) throw Error(o(425));
  }
  function ns() {
  }
  var Nl = null, jl = null;
  function Il(t, r) {
    return t === "textarea" || t === "noscript" || typeof r.children == "string" || typeof r.children == "number" || typeof r.dangerouslySetInnerHTML == "object" && r.dangerouslySetInnerHTML !== null && r.dangerouslySetInnerHTML.__html != null;
  }
  var Fl = typeof setTimeout == "function" ? setTimeout : void 0, ix = typeof clearTimeout == "function" ? clearTimeout : void 0, Ep = typeof Promise == "function" ? Promise : void 0, sx = typeof queueMicrotask == "function" ? queueMicrotask : typeof Ep < "u" ? function(t) {
    return Ep.resolve(null).then(t).catch(ax);
  } : Fl;
  function ax(t) {
    setTimeout(function() {
      throw t;
    });
  }
  function Ol(t, r) {
    var s = r, u = 0;
    do {
      var h = s.nextSibling;
      if (t.removeChild(s), h && h.nodeType === 8) if (s = h.data, s === "/$") {
        if (u === 0) {
          t.removeChild(h), Do(r);
          return;
        }
        u--;
      } else s !== "$" && s !== "$?" && s !== "$!" || u++;
      s = h;
    } while (s);
    Do(r);
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
  function Mp(t) {
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
  var Fr = Math.random().toString(36).slice(2), Kt = "__reactFiber$" + Fr, Uo = "__reactProps$" + Fr, sn = "__reactContainer$" + Fr, Ll = "__reactEvents$" + Fr, lx = "__reactListeners$" + Fr, ux = "__reactHandles$" + Fr;
  function qn(t) {
    var r = t[Kt];
    if (r) return r;
    for (var s = t.parentNode; s; ) {
      if (r = s[sn] || s[Kt]) {
        if (s = r.alternate, r.child !== null || s !== null && s.child !== null) for (t = Mp(t); t !== null; ) {
          if (s = t[Kt]) return s;
          t = Mp(t);
        }
        return r;
      }
      t = s, s = t.parentNode;
    }
    return null;
  }
  function Ho(t) {
    return t = t[Kt] || t[sn], !t || t.tag !== 5 && t.tag !== 6 && t.tag !== 13 && t.tag !== 3 ? null : t;
  }
  function Or(t) {
    if (t.tag === 5 || t.tag === 6) return t.stateNode;
    throw Error(o(33));
  }
  function rs(t) {
    return t[Uo] || null;
  }
  var Vl = [], Lr = -1;
  function En(t) {
    return { current: t };
  }
  function Me(t) {
    0 > Lr || (t.current = Vl[Lr], Vl[Lr] = null, Lr--);
  }
  function be(t, r) {
    Lr++, Vl[Lr] = t.current, t.current = r;
  }
  var Mn = {}, qe = En(Mn), ct = En(!1), er = Mn;
  function Vr(t, r) {
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
  function os() {
    Me(ct), Me(qe);
  }
  function Rp(t, r, s) {
    if (qe.current !== Mn) throw Error(o(168));
    be(qe, r), be(ct, s);
  }
  function Dp(t, r, s) {
    var u = t.stateNode;
    if (r = r.childContextTypes, typeof u.getChildContext != "function") return s;
    u = u.getChildContext();
    for (var h in u) if (!(h in r)) throw Error(o(108, Ce(t) || "Unknown", h));
    return Q({}, s, u);
  }
  function is(t) {
    return t = (t = t.stateNode) && t.__reactInternalMemoizedMergedChildContext || Mn, er = qe.current, be(qe, t), be(ct, ct.current), !0;
  }
  function Np(t, r, s) {
    var u = t.stateNode;
    if (!u) throw Error(o(169));
    s ? (t = Dp(t, r, er), u.__reactInternalMemoizedMergedChildContext = t, Me(ct), Me(qe), be(qe, t)) : Me(ct), be(ct, s);
  }
  var an = null, ss = !1, Bl = !1;
  function jp(t) {
    an === null ? an = [t] : an.push(t);
  }
  function cx(t) {
    ss = !0, jp(t);
  }
  function Rn() {
    if (!Bl && an !== null) {
      Bl = !0;
      var t = 0, r = _e;
      try {
        var s = an;
        for (_e = 1; t < s.length; t++) {
          var u = s[t];
          do
            u = u(!0);
          while (u !== null);
        }
        an = null, ss = !1;
      } catch (h) {
        throw an !== null && (an = an.slice(t + 1)), Ff(ll, Rn), h;
      } finally {
        _e = r, Bl = !1;
      }
    }
    return null;
  }
  var Br = [], zr = 0, as = null, ls = 0, kt = [], At = 0, tr = null, ln = 1, un = "";
  function nr(t, r) {
    Br[zr++] = ls, Br[zr++] = as, as = t, ls = r;
  }
  function Ip(t, r, s) {
    kt[At++] = ln, kt[At++] = un, kt[At++] = tr, tr = t;
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
  function zl(t) {
    t.return !== null && (nr(t, 1), Ip(t, 1, 0));
  }
  function $l(t) {
    for (; t === as; ) as = Br[--zr], Br[zr] = null, ls = Br[--zr], Br[zr] = null;
    for (; t === tr; ) tr = kt[--At], kt[At] = null, un = kt[--At], kt[At] = null, ln = kt[--At], kt[At] = null;
  }
  var St = null, wt = null, De = !1, Ft = null;
  function Fp(t, r) {
    var s = Et(5, null, null, 0);
    s.elementType = "DELETED", s.stateNode = r, s.return = t, r = t.deletions, r === null ? (t.deletions = [s], t.flags |= 16) : r.push(s);
  }
  function Op(t, r) {
    switch (t.tag) {
      case 5:
        var s = t.type;
        return r = r.nodeType !== 1 || s.toLowerCase() !== r.nodeName.toLowerCase() ? null : r, r !== null ? (t.stateNode = r, St = t, wt = Pn(r.firstChild), !0) : !1;
      case 6:
        return r = t.pendingProps === "" || r.nodeType !== 3 ? null : r, r !== null ? (t.stateNode = r, St = t, wt = null, !0) : !1;
      case 13:
        return r = r.nodeType !== 8 ? null : r, r !== null ? (s = tr !== null ? { id: ln, overflow: un } : null, t.memoizedState = { dehydrated: r, treeContext: s, retryLane: 1073741824 }, s = Et(18, null, null, 0), s.stateNode = r, s.return = t, t.child = s, St = t, wt = null, !0) : !1;
      default:
        return !1;
    }
  }
  function Ul(t) {
    return (t.mode & 1) !== 0 && (t.flags & 128) === 0;
  }
  function Hl(t) {
    if (De) {
      var r = wt;
      if (r) {
        var s = r;
        if (!Op(t, r)) {
          if (Ul(t)) throw Error(o(418));
          r = Pn(s.nextSibling);
          var u = St;
          r && Op(t, r) ? Fp(u, s) : (t.flags = t.flags & -4097 | 2, De = !1, St = t);
        }
      } else {
        if (Ul(t)) throw Error(o(418));
        t.flags = t.flags & -4097 | 2, De = !1, St = t;
      }
    }
  }
  function Lp(t) {
    for (t = t.return; t !== null && t.tag !== 5 && t.tag !== 3 && t.tag !== 13; ) t = t.return;
    St = t;
  }
  function us(t) {
    if (t !== St) return !1;
    if (!De) return Lp(t), De = !0, !1;
    var r;
    if ((r = t.tag !== 3) && !(r = t.tag !== 5) && (r = t.type, r = r !== "head" && r !== "body" && !Il(t.type, t.memoizedProps)), r && (r = wt)) {
      if (Ul(t)) throw Vp(), Error(o(418));
      for (; r; ) Fp(t, r), r = Pn(r.nextSibling);
    }
    if (Lp(t), t.tag === 13) {
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
  function Vp() {
    for (var t = wt; t; ) t = Pn(t.nextSibling);
  }
  function $r() {
    wt = St = null, De = !1;
  }
  function Wl(t) {
    Ft === null ? Ft = [t] : Ft.push(t);
  }
  var dx = D.ReactCurrentBatchConfig;
  function Wo(t, r, s) {
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
  function cs(t, r) {
    throw t = Object.prototype.toString.call(r), Error(o(31, t === "[object Object]" ? "object with keys {" + Object.keys(r).join(", ") + "}" : t));
  }
  function Bp(t) {
    var r = t._init;
    return r(t._payload);
  }
  function zp(t) {
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
      return R === null || R.tag !== 6 ? (R = Fu(I, j.mode, U), R.return = j, R) : (R = h(R, I), R.return = j, R);
    }
    function M(j, R, I, U) {
      var ie = I.type;
      return ie === W ? B(j, R, I.props.children, U, I.key) : R !== null && (R.elementType === ie || typeof ie == "object" && ie !== null && ie.$$typeof === re && Bp(ie) === R.type) ? (U = h(R, I.props), U.ref = Wo(j, R, I), U.return = j, U) : (U = js(I.type, I.key, I.props, null, j.mode, U), U.ref = Wo(j, R, I), U.return = j, U);
    }
    function F(j, R, I, U) {
      return R === null || R.tag !== 4 || R.stateNode.containerInfo !== I.containerInfo || R.stateNode.implementation !== I.implementation ? (R = Ou(I, j.mode, U), R.return = j, R) : (R = h(R, I.children || []), R.return = j, R);
    }
    function B(j, R, I, U, ie) {
      return R === null || R.tag !== 7 ? (R = cr(I, j.mode, U, ie), R.return = j, R) : (R = h(R, I), R.return = j, R);
    }
    function $(j, R, I) {
      if (typeof R == "string" && R !== "" || typeof R == "number") return R = Fu("" + R, j.mode, I), R.return = j, R;
      if (typeof R == "object" && R !== null) {
        switch (R.$$typeof) {
          case O:
            return I = js(R.type, R.key, R.props, null, j.mode, I), I.ref = Wo(j, null, R), I.return = j, I;
          case H:
            return R = Ou(R, j.mode, I), R.return = j, R;
          case re:
            var U = R._init;
            return $(j, U(R._payload), I);
        }
        if (wo(R) || J(R)) return R = cr(R, j.mode, I, null), R.return = j, R;
        cs(j, R);
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
        if (wo(I) || J(I)) return ie !== null ? null : B(j, R, I, U, null);
        cs(j, I);
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
        if (wo(U) || J(U)) return j = j.get(I) || null, B(R, j, U, ie, null);
        cs(R, U);
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
      if (ue === I.length) return s(j, le), De && nr(j, ue), ie;
      if (le === null) {
        for (; ue < I.length; ue++) le = $(j, I[ue], U), le !== null && (R = v(le, R, ue), ae === null ? ie = le : ae.sibling = le, ae = le);
        return De && nr(j, ue), ie;
      }
      for (le = u(j, le); ue < I.length; ue++) Ge = q(le, j, ue, I[ue], U), Ge !== null && (t && Ge.alternate !== null && le.delete(Ge.key === null ? ue : Ge.key), R = v(Ge, R, ue), ae === null ? ie = Ge : ae.sibling = Ge, ae = Ge);
      return t && le.forEach(function(Bn) {
        return r(j, Bn);
      }), De && nr(j, ue), ie;
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
      ), De && nr(j, ue), ie;
      if (le === null) {
        for (; !ve.done; ue++, ve = I.next()) ve = $(j, ve.value, U), ve !== null && (R = v(ve, R, ue), ae === null ? ie = ve : ae.sibling = ve, ae = ve);
        return De && nr(j, ue), ie;
      }
      for (le = u(j, le); !ve.done; ue++, ve = I.next()) ve = q(le, j, ue, ve.value, U), ve !== null && (t && ve.alternate !== null && le.delete(ve.key === null ? ue : ve.key), R = v(ve, R, ue), ae === null ? ie = ve : ae.sibling = ve, ae = ve);
      return t && le.forEach(function(Hx) {
        return r(j, Hx);
      }), De && nr(j, ue), ie;
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
                  } else if (ae.elementType === ie || typeof ie == "object" && ie !== null && ie.$$typeof === re && Bp(ie) === ae.type) {
                    s(j, ae.sibling), R = h(ae, I.props), R.ref = Wo(j, ae, I), R.return = j, j = R;
                    break e;
                  }
                  s(j, ae);
                  break;
                } else r(j, ae);
                ae = ae.sibling;
              }
              I.type === W ? (R = cr(I.props.children, j.mode, U, I.key), R.return = j, j = R) : (U = js(I.type, I.key, I.props, null, j.mode, U), U.ref = Wo(j, R, I), U.return = j, j = U);
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
              R = Ou(I, j.mode, U), R.return = j, j = R;
            }
            return _(j);
          case re:
            return ae = I._init, Le(j, R, ae(I._payload), U);
        }
        if (wo(I)) return te(j, R, I, U);
        if (J(I)) return oe(j, R, I, U);
        cs(j, I);
      }
      return typeof I == "string" && I !== "" || typeof I == "number" ? (I = "" + I, R !== null && R.tag === 6 ? (s(j, R.sibling), R = h(R, I), R.return = j, j = R) : (s(j, R), R = Fu(I, j.mode, U), R.return = j, j = R), _(j)) : s(j, R);
    }
    return Le;
  }
  var Ur = zp(!0), $p = zp(!1), ds = En(null), fs = null, Hr = null, Gl = null;
  function Kl() {
    Gl = Hr = fs = null;
  }
  function Yl(t) {
    var r = ds.current;
    Me(ds), t._currentValue = r;
  }
  function Ql(t, r, s) {
    for (; t !== null; ) {
      var u = t.alternate;
      if ((t.childLanes & r) !== r ? (t.childLanes |= r, u !== null && (u.childLanes |= r)) : u !== null && (u.childLanes & r) !== r && (u.childLanes |= r), t === s) break;
      t = t.return;
    }
  }
  function Wr(t, r) {
    fs = t, Gl = Hr = null, t = t.dependencies, t !== null && t.firstContext !== null && ((t.lanes & r) !== 0 && (ft = !0), t.firstContext = null);
  }
  function Ct(t) {
    var r = t._currentValue;
    if (Gl !== t) if (t = { context: t, memoizedValue: r, next: null }, Hr === null) {
      if (fs === null) throw Error(o(308));
      Hr = t, fs.dependencies = { lanes: 0, firstContext: t };
    } else Hr = Hr.next = t;
    return r;
  }
  var rr = null;
  function Xl(t) {
    rr === null ? rr = [t] : rr.push(t);
  }
  function Up(t, r, s, u) {
    var h = r.interleaved;
    return h === null ? (s.next = s, Xl(r)) : (s.next = h.next, h.next = s), r.interleaved = s, cn(t, u);
  }
  function cn(t, r) {
    t.lanes |= r;
    var s = t.alternate;
    for (s !== null && (s.lanes |= r), s = t, t = t.return; t !== null; ) t.childLanes |= r, s = t.alternate, s !== null && (s.childLanes |= r), s = t, t = t.return;
    return s.tag === 3 ? s.stateNode : null;
  }
  var Dn = !1;
  function Zl(t) {
    t.updateQueue = { baseState: t.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
  }
  function Hp(t, r) {
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
    return h = u.interleaved, h === null ? (r.next = r, Xl(u)) : (r.next = h.next, h.next = r), u.interleaved = r, cn(t, s);
  }
  function ps(t, r, s) {
    if (r = r.updateQueue, r !== null && (r = r.shared, (s & 4194240) !== 0)) {
      var u = r.lanes;
      u &= t.pendingLanes, s |= u, r.lanes = s, dl(t, s);
    }
  }
  function Wp(t, r) {
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
  function ms(t, r, s, u) {
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
      sr |= _, t.lanes = _, t.memoizedState = $;
    }
  }
  function Gp(t, r, s) {
    if (t = r.effects, r.effects = null, t !== null) for (r = 0; r < t.length; r++) {
      var u = t[r], h = u.callback;
      if (h !== null) {
        if (u.callback = null, u = s, typeof h != "function") throw Error(o(191, h));
        h.call(u);
      }
    }
  }
  var Go = {}, Yt = En(Go), Ko = En(Go), Yo = En(Go);
  function or(t) {
    if (t === Go) throw Error(o(174));
    return t;
  }
  function Jl(t, r) {
    switch (be(Yo, r), be(Ko, t), be(Yt, Go), t = r.nodeType, t) {
      case 9:
      case 11:
        r = (r = r.documentElement) ? r.namespaceURI : qa(null, "");
        break;
      default:
        t = t === 8 ? r.parentNode : r, r = t.namespaceURI || null, t = t.tagName, r = qa(r, t);
    }
    Me(Yt), be(Yt, r);
  }
  function Gr() {
    Me(Yt), Me(Ko), Me(Yo);
  }
  function Kp(t) {
    or(Yo.current);
    var r = or(Yt.current), s = qa(r, t.type);
    r !== s && (be(Ko, t), be(Yt, s));
  }
  function ql(t) {
    Ko.current === t && (Me(Yt), Me(Ko));
  }
  var Ne = En(0);
  function hs(t) {
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
  var eu = [];
  function tu() {
    for (var t = 0; t < eu.length; t++) eu[t]._workInProgressVersionPrimary = null;
    eu.length = 0;
  }
  var ys = D.ReactCurrentDispatcher, nu = D.ReactCurrentBatchConfig, ir = 0, je = null, ze = null, He = null, gs = !1, Qo = !1, Xo = 0, fx = 0;
  function et() {
    throw Error(o(321));
  }
  function ru(t, r) {
    if (r === null) return !1;
    for (var s = 0; s < r.length && s < t.length; s++) if (!It(t[s], r[s])) return !1;
    return !0;
  }
  function ou(t, r, s, u, h, v) {
    if (ir = v, je = r, r.memoizedState = null, r.updateQueue = null, r.lanes = 0, ys.current = t === null || t.memoizedState === null ? yx : gx, t = s(u, h), Qo) {
      v = 0;
      do {
        if (Qo = !1, Xo = 0, 25 <= v) throw Error(o(301));
        v += 1, He = ze = null, r.updateQueue = null, ys.current = vx, t = s(u, h);
      } while (Qo);
    }
    if (ys.current = ws, r = ze !== null && ze.next !== null, ir = 0, He = ze = je = null, gs = !1, r) throw Error(o(300));
    return t;
  }
  function iu() {
    var t = Xo !== 0;
    return Xo = 0, t;
  }
  function Qt() {
    var t = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
    return He === null ? je.memoizedState = He = t : He = He.next = t, He;
  }
  function bt() {
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
  function Zo(t, r) {
    return typeof r == "function" ? r(t) : r;
  }
  function su(t) {
    var r = bt(), s = r.queue;
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
        if ((ir & B) === B) M !== null && (M = M.next = { lane: 0, action: F.action, hasEagerState: F.hasEagerState, eagerState: F.eagerState, next: null }), u = F.hasEagerState ? F.eagerState : t(u, F.action);
        else {
          var $ = {
            lane: B,
            action: F.action,
            hasEagerState: F.hasEagerState,
            eagerState: F.eagerState,
            next: null
          };
          M === null ? (P = M = $, _ = u) : M = M.next = $, je.lanes |= B, sr |= B;
        }
        F = F.next;
      } while (F !== null && F !== v);
      M === null ? _ = u : M.next = P, It(u, r.memoizedState) || (ft = !0), r.memoizedState = u, r.baseState = _, r.baseQueue = M, s.lastRenderedState = u;
    }
    if (t = s.interleaved, t !== null) {
      h = t;
      do
        v = h.lane, je.lanes |= v, sr |= v, h = h.next;
      while (h !== t);
    } else h === null && (s.lanes = 0);
    return [r.memoizedState, s.dispatch];
  }
  function au(t) {
    var r = bt(), s = r.queue;
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
  function Yp() {
  }
  function Qp(t, r) {
    var s = je, u = bt(), h = r(), v = !It(u.memoizedState, h);
    if (v && (u.memoizedState = h, ft = !0), u = u.queue, lu(Jp.bind(null, s, u, t), [t]), u.getSnapshot !== r || v || He !== null && He.memoizedState.tag & 1) {
      if (s.flags |= 2048, Jo(9, Zp.bind(null, s, u, h, r), void 0, null), We === null) throw Error(o(349));
      (ir & 30) !== 0 || Xp(s, r, h);
    }
    return h;
  }
  function Xp(t, r, s) {
    t.flags |= 16384, t = { getSnapshot: r, value: s }, r = je.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, je.updateQueue = r, r.stores = [t]) : (s = r.stores, s === null ? r.stores = [t] : s.push(t));
  }
  function Zp(t, r, s, u) {
    r.value = s, r.getSnapshot = u, qp(r) && em(t);
  }
  function Jp(t, r, s) {
    return s(function() {
      qp(r) && em(t);
    });
  }
  function qp(t) {
    var r = t.getSnapshot;
    t = t.value;
    try {
      var s = r();
      return !It(t, s);
    } catch {
      return !0;
    }
  }
  function em(t) {
    var r = cn(t, 1);
    r !== null && Bt(r, t, 1, -1);
  }
  function tm(t) {
    var r = Qt();
    return typeof t == "function" && (t = t()), r.memoizedState = r.baseState = t, t = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: Zo, lastRenderedState: t }, r.queue = t, t = t.dispatch = hx.bind(null, je, t), [r.memoizedState, t];
  }
  function Jo(t, r, s, u) {
    return t = { tag: t, create: r, destroy: s, deps: u, next: null }, r = je.updateQueue, r === null ? (r = { lastEffect: null, stores: null }, je.updateQueue = r, r.lastEffect = t.next = t) : (s = r.lastEffect, s === null ? r.lastEffect = t.next = t : (u = s.next, s.next = t, t.next = u, r.lastEffect = t)), t;
  }
  function nm() {
    return bt().memoizedState;
  }
  function vs(t, r, s, u) {
    var h = Qt();
    je.flags |= t, h.memoizedState = Jo(1 | r, s, void 0, u === void 0 ? null : u);
  }
  function Ss(t, r, s, u) {
    var h = bt();
    u = u === void 0 ? null : u;
    var v = void 0;
    if (ze !== null) {
      var _ = ze.memoizedState;
      if (v = _.destroy, u !== null && ru(u, _.deps)) {
        h.memoizedState = Jo(r, s, v, u);
        return;
      }
    }
    je.flags |= t, h.memoizedState = Jo(1 | r, s, v, u);
  }
  function rm(t, r) {
    return vs(8390656, 8, t, r);
  }
  function lu(t, r) {
    return Ss(2048, 8, t, r);
  }
  function om(t, r) {
    return Ss(4, 2, t, r);
  }
  function im(t, r) {
    return Ss(4, 4, t, r);
  }
  function sm(t, r) {
    if (typeof r == "function") return t = t(), r(t), function() {
      r(null);
    };
    if (r != null) return t = t(), r.current = t, function() {
      r.current = null;
    };
  }
  function am(t, r, s) {
    return s = s != null ? s.concat([t]) : null, Ss(4, 4, sm.bind(null, r, t), s);
  }
  function uu() {
  }
  function lm(t, r) {
    var s = bt();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && ru(r, u[1]) ? u[0] : (s.memoizedState = [t, r], t);
  }
  function um(t, r) {
    var s = bt();
    r = r === void 0 ? null : r;
    var u = s.memoizedState;
    return u !== null && r !== null && ru(r, u[1]) ? u[0] : (t = t(), s.memoizedState = [t, r], t);
  }
  function cm(t, r, s) {
    return (ir & 21) === 0 ? (t.baseState && (t.baseState = !1, ft = !0), t.memoizedState = s) : (It(s, r) || (s = Bf(), je.lanes |= s, sr |= s, t.baseState = !0), r);
  }
  function px(t, r) {
    var s = _e;
    _e = s !== 0 && 4 > s ? s : 4, t(!0);
    var u = nu.transition;
    nu.transition = {};
    try {
      t(!1), r();
    } finally {
      _e = s, nu.transition = u;
    }
  }
  function dm() {
    return bt().memoizedState;
  }
  function mx(t, r, s) {
    var u = On(t);
    if (s = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null }, fm(t)) pm(r, s);
    else if (s = Up(t, r, s, u), s !== null) {
      var h = ot();
      Bt(s, t, u, h), mm(s, r, u);
    }
  }
  function hx(t, r, s) {
    var u = On(t), h = { lane: u, action: s, hasEagerState: !1, eagerState: null, next: null };
    if (fm(t)) pm(r, h);
    else {
      var v = t.alternate;
      if (t.lanes === 0 && (v === null || v.lanes === 0) && (v = r.lastRenderedReducer, v !== null)) try {
        var _ = r.lastRenderedState, P = v(_, s);
        if (h.hasEagerState = !0, h.eagerState = P, It(P, _)) {
          var M = r.interleaved;
          M === null ? (h.next = h, Xl(r)) : (h.next = M.next, M.next = h), r.interleaved = h;
          return;
        }
      } catch {
      } finally {
      }
      s = Up(t, r, h, u), s !== null && (h = ot(), Bt(s, t, u, h), mm(s, r, u));
    }
  }
  function fm(t) {
    var r = t.alternate;
    return t === je || r !== null && r === je;
  }
  function pm(t, r) {
    Qo = gs = !0;
    var s = t.pending;
    s === null ? r.next = r : (r.next = s.next, s.next = r), t.pending = r;
  }
  function mm(t, r, s) {
    if ((s & 4194240) !== 0) {
      var u = r.lanes;
      u &= t.pendingLanes, s |= u, r.lanes = s, dl(t, s);
    }
  }
  var ws = { readContext: Ct, useCallback: et, useContext: et, useEffect: et, useImperativeHandle: et, useInsertionEffect: et, useLayoutEffect: et, useMemo: et, useReducer: et, useRef: et, useState: et, useDebugValue: et, useDeferredValue: et, useTransition: et, useMutableSource: et, useSyncExternalStore: et, useId: et, unstable_isNewReconciler: !1 }, yx = { readContext: Ct, useCallback: function(t, r) {
    return Qt().memoizedState = [t, r === void 0 ? null : r], t;
  }, useContext: Ct, useEffect: rm, useImperativeHandle: function(t, r, s) {
    return s = s != null ? s.concat([t]) : null, vs(
      4194308,
      4,
      sm.bind(null, r, t),
      s
    );
  }, useLayoutEffect: function(t, r) {
    return vs(4194308, 4, t, r);
  }, useInsertionEffect: function(t, r) {
    return vs(4, 2, t, r);
  }, useMemo: function(t, r) {
    var s = Qt();
    return r = r === void 0 ? null : r, t = t(), s.memoizedState = [t, r], t;
  }, useReducer: function(t, r, s) {
    var u = Qt();
    return r = s !== void 0 ? s(r) : r, u.memoizedState = u.baseState = r, t = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: t, lastRenderedState: r }, u.queue = t, t = t.dispatch = mx.bind(null, je, t), [u.memoizedState, t];
  }, useRef: function(t) {
    var r = Qt();
    return t = { current: t }, r.memoizedState = t;
  }, useState: tm, useDebugValue: uu, useDeferredValue: function(t) {
    return Qt().memoizedState = t;
  }, useTransition: function() {
    var t = tm(!1), r = t[0];
    return t = px.bind(null, t[1]), Qt().memoizedState = t, [r, t];
  }, useMutableSource: function() {
  }, useSyncExternalStore: function(t, r, s) {
    var u = je, h = Qt();
    if (De) {
      if (s === void 0) throw Error(o(407));
      s = s();
    } else {
      if (s = r(), We === null) throw Error(o(349));
      (ir & 30) !== 0 || Xp(u, r, s);
    }
    h.memoizedState = s;
    var v = { value: s, getSnapshot: r };
    return h.queue = v, rm(Jp.bind(
      null,
      u,
      v,
      t
    ), [t]), u.flags |= 2048, Jo(9, Zp.bind(null, u, v, s, r), void 0, null), s;
  }, useId: function() {
    var t = Qt(), r = We.identifierPrefix;
    if (De) {
      var s = un, u = ln;
      s = (u & ~(1 << 32 - jt(u) - 1)).toString(32) + s, r = ":" + r + "R" + s, s = Xo++, 0 < s && (r += "H" + s.toString(32)), r += ":";
    } else s = fx++, r = ":" + r + "r" + s.toString(32) + ":";
    return t.memoizedState = r;
  }, unstable_isNewReconciler: !1 }, gx = {
    readContext: Ct,
    useCallback: lm,
    useContext: Ct,
    useEffect: lu,
    useImperativeHandle: am,
    useInsertionEffect: om,
    useLayoutEffect: im,
    useMemo: um,
    useReducer: su,
    useRef: nm,
    useState: function() {
      return su(Zo);
    },
    useDebugValue: uu,
    useDeferredValue: function(t) {
      var r = bt();
      return cm(r, ze.memoizedState, t);
    },
    useTransition: function() {
      var t = su(Zo)[0], r = bt().memoizedState;
      return [t, r];
    },
    useMutableSource: Yp,
    useSyncExternalStore: Qp,
    useId: dm,
    unstable_isNewReconciler: !1
  }, vx = { readContext: Ct, useCallback: lm, useContext: Ct, useEffect: lu, useImperativeHandle: am, useInsertionEffect: om, useLayoutEffect: im, useMemo: um, useReducer: au, useRef: nm, useState: function() {
    return au(Zo);
  }, useDebugValue: uu, useDeferredValue: function(t) {
    var r = bt();
    return ze === null ? r.memoizedState = t : cm(r, ze.memoizedState, t);
  }, useTransition: function() {
    var t = au(Zo)[0], r = bt().memoizedState;
    return [t, r];
  }, useMutableSource: Yp, useSyncExternalStore: Qp, useId: dm, unstable_isNewReconciler: !1 };
  function Ot(t, r) {
    if (t && t.defaultProps) {
      r = Q({}, r), t = t.defaultProps;
      for (var s in t) r[s] === void 0 && (r[s] = t[s]);
      return r;
    }
    return r;
  }
  function cu(t, r, s, u) {
    r = t.memoizedState, s = s(u, r), s = s == null ? r : Q({}, r, s), t.memoizedState = s, t.lanes === 0 && (t.updateQueue.baseState = s);
  }
  var xs = { isMounted: function(t) {
    return (t = t._reactInternals) ? Jn(t) === t : !1;
  }, enqueueSetState: function(t, r, s) {
    t = t._reactInternals;
    var u = ot(), h = On(t), v = dn(u, h);
    v.payload = r, s != null && (v.callback = s), r = Nn(t, v, h), r !== null && (Bt(r, t, h, u), ps(r, t, h));
  }, enqueueReplaceState: function(t, r, s) {
    t = t._reactInternals;
    var u = ot(), h = On(t), v = dn(u, h);
    v.tag = 1, v.payload = r, s != null && (v.callback = s), r = Nn(t, v, h), r !== null && (Bt(r, t, h, u), ps(r, t, h));
  }, enqueueForceUpdate: function(t, r) {
    t = t._reactInternals;
    var s = ot(), u = On(t), h = dn(s, u);
    h.tag = 2, r != null && (h.callback = r), r = Nn(t, h, u), r !== null && (Bt(r, t, u, s), ps(r, t, u));
  } };
  function hm(t, r, s, u, h, v, _) {
    return t = t.stateNode, typeof t.shouldComponentUpdate == "function" ? t.shouldComponentUpdate(u, v, _) : r.prototype && r.prototype.isPureReactComponent ? !Lo(s, u) || !Lo(h, v) : !0;
  }
  function ym(t, r, s) {
    var u = !1, h = Mn, v = r.contextType;
    return typeof v == "object" && v !== null ? v = Ct(v) : (h = dt(r) ? er : qe.current, u = r.contextTypes, v = (u = u != null) ? Vr(t, h) : Mn), r = new r(s, v), t.memoizedState = r.state !== null && r.state !== void 0 ? r.state : null, r.updater = xs, t.stateNode = r, r._reactInternals = t, u && (t = t.stateNode, t.__reactInternalMemoizedUnmaskedChildContext = h, t.__reactInternalMemoizedMaskedChildContext = v), r;
  }
  function gm(t, r, s, u) {
    t = r.state, typeof r.componentWillReceiveProps == "function" && r.componentWillReceiveProps(s, u), typeof r.UNSAFE_componentWillReceiveProps == "function" && r.UNSAFE_componentWillReceiveProps(s, u), r.state !== t && xs.enqueueReplaceState(r, r.state, null);
  }
  function du(t, r, s, u) {
    var h = t.stateNode;
    h.props = s, h.state = t.memoizedState, h.refs = {}, Zl(t);
    var v = r.contextType;
    typeof v == "object" && v !== null ? h.context = Ct(v) : (v = dt(r) ? er : qe.current, h.context = Vr(t, v)), h.state = t.memoizedState, v = r.getDerivedStateFromProps, typeof v == "function" && (cu(t, r, v, s), h.state = t.memoizedState), typeof r.getDerivedStateFromProps == "function" || typeof h.getSnapshotBeforeUpdate == "function" || typeof h.UNSAFE_componentWillMount != "function" && typeof h.componentWillMount != "function" || (r = h.state, typeof h.componentWillMount == "function" && h.componentWillMount(), typeof h.UNSAFE_componentWillMount == "function" && h.UNSAFE_componentWillMount(), r !== h.state && xs.enqueueReplaceState(h, h.state, null), ms(t, s, h, u), h.state = t.memoizedState), typeof h.componentDidMount == "function" && (t.flags |= 4194308);
  }
  function Kr(t, r) {
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
  function fu(t, r, s) {
    return { value: t, source: null, stack: s ?? null, digest: r ?? null };
  }
  function pu(t, r) {
    try {
      console.error(r.value);
    } catch (s) {
      setTimeout(function() {
        throw s;
      });
    }
  }
  var Sx = typeof WeakMap == "function" ? WeakMap : Map;
  function vm(t, r, s) {
    s = dn(-1, s), s.tag = 3, s.payload = { element: null };
    var u = r.value;
    return s.callback = function() {
      Ps || (Ps = !0, Pu = u), pu(t, r);
    }, s;
  }
  function Sm(t, r, s) {
    s = dn(-1, s), s.tag = 3;
    var u = t.type.getDerivedStateFromError;
    if (typeof u == "function") {
      var h = r.value;
      s.payload = function() {
        return u(h);
      }, s.callback = function() {
        pu(t, r);
      };
    }
    var v = t.stateNode;
    return v !== null && typeof v.componentDidCatch == "function" && (s.callback = function() {
      pu(t, r), typeof u != "function" && (In === null ? In = /* @__PURE__ */ new Set([this]) : In.add(this));
      var _ = r.stack;
      this.componentDidCatch(r.value, { componentStack: _ !== null ? _ : "" });
    }), s;
  }
  function wm(t, r, s) {
    var u = t.pingCache;
    if (u === null) {
      u = t.pingCache = new Sx();
      var h = /* @__PURE__ */ new Set();
      u.set(r, h);
    } else h = u.get(r), h === void 0 && (h = /* @__PURE__ */ new Set(), u.set(r, h));
    h.has(s) || (h.add(s), t = Nx.bind(null, t, r, s), r.then(t, t));
  }
  function xm(t) {
    do {
      var r;
      if ((r = t.tag === 13) && (r = t.memoizedState, r = r !== null ? r.dehydrated !== null : !0), r) return t;
      t = t.return;
    } while (t !== null);
    return null;
  }
  function _m(t, r, s, u, h) {
    return (t.mode & 1) === 0 ? (t === r ? t.flags |= 65536 : (t.flags |= 128, s.flags |= 131072, s.flags &= -52805, s.tag === 1 && (s.alternate === null ? s.tag = 17 : (r = dn(-1, 1), r.tag = 2, Nn(s, r, 1))), s.lanes |= 1), t) : (t.flags |= 65536, t.lanes = h, t);
  }
  var wx = D.ReactCurrentOwner, ft = !1;
  function rt(t, r, s, u) {
    r.child = t === null ? $p(r, null, s, u) : Ur(r, t.child, s, u);
  }
  function Tm(t, r, s, u, h) {
    s = s.render;
    var v = r.ref;
    return Wr(r, h), u = ou(t, r, s, u, v, h), s = iu(), t !== null && !ft ? (r.updateQueue = t.updateQueue, r.flags &= -2053, t.lanes &= ~h, fn(t, r, h)) : (De && s && zl(r), r.flags |= 1, rt(t, r, u, h), r.child);
  }
  function km(t, r, s, u, h) {
    if (t === null) {
      var v = s.type;
      return typeof v == "function" && !Iu(v) && v.defaultProps === void 0 && s.compare === null && s.defaultProps === void 0 ? (r.tag = 15, r.type = v, Am(t, r, v, u, h)) : (t = js(s.type, null, u, r, r.mode, h), t.ref = r.ref, t.return = r, r.child = t);
    }
    if (v = t.child, (t.lanes & h) === 0) {
      var _ = v.memoizedProps;
      if (s = s.compare, s = s !== null ? s : Lo, s(_, u) && t.ref === r.ref) return fn(t, r, h);
    }
    return r.flags |= 1, t = Vn(v, u), t.ref = r.ref, t.return = r, r.child = t;
  }
  function Am(t, r, s, u, h) {
    if (t !== null) {
      var v = t.memoizedProps;
      if (Lo(v, u) && t.ref === r.ref) if (ft = !1, r.pendingProps = u = v, (t.lanes & h) !== 0) (t.flags & 131072) !== 0 && (ft = !0);
      else return r.lanes = t.lanes, fn(t, r, h);
    }
    return mu(t, r, s, u, h);
  }
  function Cm(t, r, s) {
    var u = r.pendingProps, h = u.children, v = t !== null ? t.memoizedState : null;
    if (u.mode === "hidden") if ((r.mode & 1) === 0) r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, be(Qr, xt), xt |= s;
    else {
      if ((s & 1073741824) === 0) return t = v !== null ? v.baseLanes | s : s, r.lanes = r.childLanes = 1073741824, r.memoizedState = { baseLanes: t, cachePool: null, transitions: null }, r.updateQueue = null, be(Qr, xt), xt |= t, null;
      r.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, u = v !== null ? v.baseLanes : s, be(Qr, xt), xt |= u;
    }
    else v !== null ? (u = v.baseLanes | s, r.memoizedState = null) : u = s, be(Qr, xt), xt |= u;
    return rt(t, r, h, s), r.child;
  }
  function bm(t, r) {
    var s = r.ref;
    (t === null && s !== null || t !== null && t.ref !== s) && (r.flags |= 512, r.flags |= 2097152);
  }
  function mu(t, r, s, u, h) {
    var v = dt(s) ? er : qe.current;
    return v = Vr(r, v), Wr(r, h), s = ou(t, r, s, u, v, h), u = iu(), t !== null && !ft ? (r.updateQueue = t.updateQueue, r.flags &= -2053, t.lanes &= ~h, fn(t, r, h)) : (De && u && zl(r), r.flags |= 1, rt(t, r, s, h), r.child);
  }
  function Pm(t, r, s, u, h) {
    if (dt(s)) {
      var v = !0;
      is(r);
    } else v = !1;
    if (Wr(r, h), r.stateNode === null) Ts(t, r), ym(r, s, u), du(r, s, u, h), u = !0;
    else if (t === null) {
      var _ = r.stateNode, P = r.memoizedProps;
      _.props = P;
      var M = _.context, F = s.contextType;
      typeof F == "object" && F !== null ? F = Ct(F) : (F = dt(s) ? er : qe.current, F = Vr(r, F));
      var B = s.getDerivedStateFromProps, $ = typeof B == "function" || typeof _.getSnapshotBeforeUpdate == "function";
      $ || typeof _.UNSAFE_componentWillReceiveProps != "function" && typeof _.componentWillReceiveProps != "function" || (P !== u || M !== F) && gm(r, _, u, F), Dn = !1;
      var V = r.memoizedState;
      _.state = V, ms(r, u, _, h), M = r.memoizedState, P !== u || V !== M || ct.current || Dn ? (typeof B == "function" && (cu(r, s, B, u), M = r.memoizedState), (P = Dn || hm(r, s, P, u, V, M, F)) ? ($ || typeof _.UNSAFE_componentWillMount != "function" && typeof _.componentWillMount != "function" || (typeof _.componentWillMount == "function" && _.componentWillMount(), typeof _.UNSAFE_componentWillMount == "function" && _.UNSAFE_componentWillMount()), typeof _.componentDidMount == "function" && (r.flags |= 4194308)) : (typeof _.componentDidMount == "function" && (r.flags |= 4194308), r.memoizedProps = u, r.memoizedState = M), _.props = u, _.state = M, _.context = F, u = P) : (typeof _.componentDidMount == "function" && (r.flags |= 4194308), u = !1);
    } else {
      _ = r.stateNode, Hp(t, r), P = r.memoizedProps, F = r.type === r.elementType ? P : Ot(r.type, P), _.props = F, $ = r.pendingProps, V = _.context, M = s.contextType, typeof M == "object" && M !== null ? M = Ct(M) : (M = dt(s) ? er : qe.current, M = Vr(r, M));
      var q = s.getDerivedStateFromProps;
      (B = typeof q == "function" || typeof _.getSnapshotBeforeUpdate == "function") || typeof _.UNSAFE_componentWillReceiveProps != "function" && typeof _.componentWillReceiveProps != "function" || (P !== $ || V !== M) && gm(r, _, u, M), Dn = !1, V = r.memoizedState, _.state = V, ms(r, u, _, h);
      var te = r.memoizedState;
      P !== $ || V !== te || ct.current || Dn ? (typeof q == "function" && (cu(r, s, q, u), te = r.memoizedState), (F = Dn || hm(r, s, F, u, V, te, M) || !1) ? (B || typeof _.UNSAFE_componentWillUpdate != "function" && typeof _.componentWillUpdate != "function" || (typeof _.componentWillUpdate == "function" && _.componentWillUpdate(u, te, M), typeof _.UNSAFE_componentWillUpdate == "function" && _.UNSAFE_componentWillUpdate(u, te, M)), typeof _.componentDidUpdate == "function" && (r.flags |= 4), typeof _.getSnapshotBeforeUpdate == "function" && (r.flags |= 1024)) : (typeof _.componentDidUpdate != "function" || P === t.memoizedProps && V === t.memoizedState || (r.flags |= 4), typeof _.getSnapshotBeforeUpdate != "function" || P === t.memoizedProps && V === t.memoizedState || (r.flags |= 1024), r.memoizedProps = u, r.memoizedState = te), _.props = u, _.state = te, _.context = M, u = F) : (typeof _.componentDidUpdate != "function" || P === t.memoizedProps && V === t.memoizedState || (r.flags |= 4), typeof _.getSnapshotBeforeUpdate != "function" || P === t.memoizedProps && V === t.memoizedState || (r.flags |= 1024), u = !1);
    }
    return hu(t, r, s, u, v, h);
  }
  function hu(t, r, s, u, h, v) {
    bm(t, r);
    var _ = (r.flags & 128) !== 0;
    if (!u && !_) return h && Np(r, s, !1), fn(t, r, v);
    u = r.stateNode, wx.current = r;
    var P = _ && typeof s.getDerivedStateFromError != "function" ? null : u.render();
    return r.flags |= 1, t !== null && _ ? (r.child = Ur(r, t.child, null, v), r.child = Ur(r, null, P, v)) : rt(t, r, P, v), r.memoizedState = u.state, h && Np(r, s, !0), r.child;
  }
  function Em(t) {
    var r = t.stateNode;
    r.pendingContext ? Rp(t, r.pendingContext, r.pendingContext !== r.context) : r.context && Rp(t, r.context, !1), Jl(t, r.containerInfo);
  }
  function Mm(t, r, s, u, h) {
    return $r(), Wl(h), r.flags |= 256, rt(t, r, s, u), r.child;
  }
  var yu = { dehydrated: null, treeContext: null, retryLane: 0 };
  function gu(t) {
    return { baseLanes: t, cachePool: null, transitions: null };
  }
  function Rm(t, r, s) {
    var u = r.pendingProps, h = Ne.current, v = !1, _ = (r.flags & 128) !== 0, P;
    if ((P = _) || (P = t !== null && t.memoizedState === null ? !1 : (h & 2) !== 0), P ? (v = !0, r.flags &= -129) : (t === null || t.memoizedState !== null) && (h |= 1), be(Ne, h & 1), t === null)
      return Hl(r), t = r.memoizedState, t !== null && (t = t.dehydrated, t !== null) ? ((r.mode & 1) === 0 ? r.lanes = 1 : t.data === "$!" ? r.lanes = 8 : r.lanes = 1073741824, null) : (_ = u.children, t = u.fallback, v ? (u = r.mode, v = r.child, _ = { mode: "hidden", children: _ }, (u & 1) === 0 && v !== null ? (v.childLanes = 0, v.pendingProps = _) : v = Is(_, u, 0, null), t = cr(t, u, s, null), v.return = r, t.return = r, v.sibling = t, r.child = v, r.child.memoizedState = gu(s), r.memoizedState = yu, t) : vu(r, _));
    if (h = t.memoizedState, h !== null && (P = h.dehydrated, P !== null)) return xx(t, r, _, u, P, h, s);
    if (v) {
      v = u.fallback, _ = r.mode, h = t.child, P = h.sibling;
      var M = { mode: "hidden", children: u.children };
      return (_ & 1) === 0 && r.child !== h ? (u = r.child, u.childLanes = 0, u.pendingProps = M, r.deletions = null) : (u = Vn(h, M), u.subtreeFlags = h.subtreeFlags & 14680064), P !== null ? v = Vn(P, v) : (v = cr(v, _, s, null), v.flags |= 2), v.return = r, u.return = r, u.sibling = v, r.child = u, u = v, v = r.child, _ = t.child.memoizedState, _ = _ === null ? gu(s) : { baseLanes: _.baseLanes | s, cachePool: null, transitions: _.transitions }, v.memoizedState = _, v.childLanes = t.childLanes & ~s, r.memoizedState = yu, u;
    }
    return v = t.child, t = v.sibling, u = Vn(v, { mode: "visible", children: u.children }), (r.mode & 1) === 0 && (u.lanes = s), u.return = r, u.sibling = null, t !== null && (s = r.deletions, s === null ? (r.deletions = [t], r.flags |= 16) : s.push(t)), r.child = u, r.memoizedState = null, u;
  }
  function vu(t, r) {
    return r = Is({ mode: "visible", children: r }, t.mode, 0, null), r.return = t, t.child = r;
  }
  function _s(t, r, s, u) {
    return u !== null && Wl(u), Ur(r, t.child, null, s), t = vu(r, r.pendingProps.children), t.flags |= 2, r.memoizedState = null, t;
  }
  function xx(t, r, s, u, h, v, _) {
    if (s)
      return r.flags & 256 ? (r.flags &= -257, u = fu(Error(o(422))), _s(t, r, _, u)) : r.memoizedState !== null ? (r.child = t.child, r.flags |= 128, null) : (v = u.fallback, h = r.mode, u = Is({ mode: "visible", children: u.children }, h, 0, null), v = cr(v, h, _, null), v.flags |= 2, u.return = r, v.return = r, u.sibling = v, r.child = u, (r.mode & 1) !== 0 && Ur(r, t.child, null, _), r.child.memoizedState = gu(_), r.memoizedState = yu, v);
    if ((r.mode & 1) === 0) return _s(t, r, _, null);
    if (h.data === "$!") {
      if (u = h.nextSibling && h.nextSibling.dataset, u) var P = u.dgst;
      return u = P, v = Error(o(419)), u = fu(v, u, void 0), _s(t, r, _, u);
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
      return ju(), u = fu(Error(o(421))), _s(t, r, _, u);
    }
    return h.data === "$?" ? (r.flags |= 128, r.child = t.child, r = jx.bind(null, t), h._reactRetry = r, null) : (t = v.treeContext, wt = Pn(h.nextSibling), St = r, De = !0, Ft = null, t !== null && (kt[At++] = ln, kt[At++] = un, kt[At++] = tr, ln = t.id, un = t.overflow, tr = r), r = vu(r, u.children), r.flags |= 4096, r);
  }
  function Dm(t, r, s) {
    t.lanes |= r;
    var u = t.alternate;
    u !== null && (u.lanes |= r), Ql(t.return, r, s);
  }
  function Su(t, r, s, u, h) {
    var v = t.memoizedState;
    v === null ? t.memoizedState = { isBackwards: r, rendering: null, renderingStartTime: 0, last: u, tail: s, tailMode: h } : (v.isBackwards = r, v.rendering = null, v.renderingStartTime = 0, v.last = u, v.tail = s, v.tailMode = h);
  }
  function Nm(t, r, s) {
    var u = r.pendingProps, h = u.revealOrder, v = u.tail;
    if (rt(t, r, u.children, s), u = Ne.current, (u & 2) !== 0) u = u & 1 | 2, r.flags |= 128;
    else {
      if (t !== null && (t.flags & 128) !== 0) e: for (t = r.child; t !== null; ) {
        if (t.tag === 13) t.memoizedState !== null && Dm(t, s, r);
        else if (t.tag === 19) Dm(t, s, r);
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
        for (s = r.child, h = null; s !== null; ) t = s.alternate, t !== null && hs(t) === null && (h = s), s = s.sibling;
        s = h, s === null ? (h = r.child, r.child = null) : (h = s.sibling, s.sibling = null), Su(r, !1, h, s, v);
        break;
      case "backwards":
        for (s = null, h = r.child, r.child = null; h !== null; ) {
          if (t = h.alternate, t !== null && hs(t) === null) {
            r.child = h;
            break;
          }
          t = h.sibling, h.sibling = s, s = h, h = t;
        }
        Su(r, !0, s, null, v);
        break;
      case "together":
        Su(r, !1, null, null, void 0);
        break;
      default:
        r.memoizedState = null;
    }
    return r.child;
  }
  function Ts(t, r) {
    (r.mode & 1) === 0 && t !== null && (t.alternate = null, r.alternate = null, r.flags |= 2);
  }
  function fn(t, r, s) {
    if (t !== null && (r.dependencies = t.dependencies), sr |= r.lanes, (s & r.childLanes) === 0) return null;
    if (t !== null && r.child !== t.child) throw Error(o(153));
    if (r.child !== null) {
      for (t = r.child, s = Vn(t, t.pendingProps), r.child = s, s.return = r; t.sibling !== null; ) t = t.sibling, s = s.sibling = Vn(t, t.pendingProps), s.return = r;
      s.sibling = null;
    }
    return r.child;
  }
  function _x(t, r, s) {
    switch (r.tag) {
      case 3:
        Em(r), $r();
        break;
      case 5:
        Kp(r);
        break;
      case 1:
        dt(r.type) && is(r);
        break;
      case 4:
        Jl(r, r.stateNode.containerInfo);
        break;
      case 10:
        var u = r.type._context, h = r.memoizedProps.value;
        be(ds, u._currentValue), u._currentValue = h;
        break;
      case 13:
        if (u = r.memoizedState, u !== null)
          return u.dehydrated !== null ? (be(Ne, Ne.current & 1), r.flags |= 128, null) : (s & r.child.childLanes) !== 0 ? Rm(t, r, s) : (be(Ne, Ne.current & 1), t = fn(t, r, s), t !== null ? t.sibling : null);
        be(Ne, Ne.current & 1);
        break;
      case 19:
        if (u = (s & r.childLanes) !== 0, (t.flags & 128) !== 0) {
          if (u) return Nm(t, r, s);
          r.flags |= 128;
        }
        if (h = r.memoizedState, h !== null && (h.rendering = null, h.tail = null, h.lastEffect = null), be(Ne, Ne.current), u) break;
        return null;
      case 22:
      case 23:
        return r.lanes = 0, Cm(t, r, s);
    }
    return fn(t, r, s);
  }
  var jm, wu, Im, Fm;
  jm = function(t, r) {
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
  }, wu = function() {
  }, Im = function(t, r, s, u) {
    var h = t.memoizedProps;
    if (h !== u) {
      t = r.stateNode, or(Yt.current);
      var v = null;
      switch (s) {
        case "input":
          h = Qa(t, h), u = Qa(t, u), v = [];
          break;
        case "select":
          h = Q({}, h, { value: void 0 }), u = Q({}, u, { value: void 0 }), v = [];
          break;
        case "textarea":
          h = Ja(t, h), u = Ja(t, u), v = [];
          break;
        default:
          typeof h.onClick != "function" && typeof u.onClick == "function" && (t.onclick = ns);
      }
      el(s, u);
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
  }, Fm = function(t, r, s, u) {
    s !== u && (r.flags |= 4);
  };
  function qo(t, r) {
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
  function Tx(t, r, s) {
    var u = r.pendingProps;
    switch ($l(r), r.tag) {
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
        return dt(r.type) && os(), tt(r), null;
      case 3:
        return u = r.stateNode, Gr(), Me(ct), Me(qe), tu(), u.pendingContext && (u.context = u.pendingContext, u.pendingContext = null), (t === null || t.child === null) && (us(r) ? r.flags |= 4 : t === null || t.memoizedState.isDehydrated && (r.flags & 256) === 0 || (r.flags |= 1024, Ft !== null && (Ru(Ft), Ft = null))), wu(t, r), tt(r), null;
      case 5:
        ql(r);
        var h = or(Yo.current);
        if (s = r.type, t !== null && r.stateNode != null) Im(t, r, s, u, h), t.ref !== r.ref && (r.flags |= 512, r.flags |= 2097152);
        else {
          if (!u) {
            if (r.stateNode === null) throw Error(o(166));
            return tt(r), null;
          }
          if (t = or(Yt.current), us(r)) {
            u = r.stateNode, s = r.type;
            var v = r.memoizedProps;
            switch (u[Kt] = r, u[Uo] = v, t = (r.mode & 1) !== 0, s) {
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
                for (h = 0; h < Bo.length; h++) Ee(Bo[h], u);
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
                yf(u, v), Ee("invalid", u);
                break;
              case "select":
                u._wrapperState = { wasMultiple: !!v.multiple }, Ee("invalid", u);
                break;
              case "textarea":
                Sf(u, v), Ee("invalid", u);
            }
            el(s, v), h = null;
            for (var _ in v) if (v.hasOwnProperty(_)) {
              var P = v[_];
              _ === "children" ? typeof P == "string" ? u.textContent !== P && (v.suppressHydrationWarning !== !0 && ts(u.textContent, P, t), h = ["children", P]) : typeof P == "number" && u.textContent !== "" + P && (v.suppressHydrationWarning !== !0 && ts(
                u.textContent,
                P,
                t
              ), h = ["children", "" + P]) : a.hasOwnProperty(_) && P != null && _ === "onScroll" && Ee("scroll", u);
            }
            switch (s) {
              case "input":
                Di(u), vf(u, v, !0);
                break;
              case "textarea":
                Di(u), xf(u);
                break;
              case "select":
              case "option":
                break;
              default:
                typeof v.onClick == "function" && (u.onclick = ns);
            }
            u = h, r.updateQueue = u, u !== null && (r.flags |= 4);
          } else {
            _ = h.nodeType === 9 ? h : h.ownerDocument, t === "http://www.w3.org/1999/xhtml" && (t = _f(s)), t === "http://www.w3.org/1999/xhtml" ? s === "script" ? (t = _.createElement("div"), t.innerHTML = "<script><\/script>", t = t.removeChild(t.firstChild)) : typeof u.is == "string" ? t = _.createElement(s, { is: u.is }) : (t = _.createElement(s), s === "select" && (_ = t, u.multiple ? _.multiple = !0 : u.size && (_.size = u.size))) : t = _.createElementNS(t, s), t[Kt] = r, t[Uo] = u, jm(t, r, !1, !1), r.stateNode = t;
            e: {
              switch (_ = tl(s, u), s) {
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
                  for (h = 0; h < Bo.length; h++) Ee(Bo[h], t);
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
                  yf(t, u), h = Qa(t, u), Ee("invalid", t);
                  break;
                case "option":
                  h = u;
                  break;
                case "select":
                  t._wrapperState = { wasMultiple: !!u.multiple }, h = Q({}, u, { value: void 0 }), Ee("invalid", t);
                  break;
                case "textarea":
                  Sf(t, u), h = Ja(t, u), Ee("invalid", t);
                  break;
                default:
                  h = u;
              }
              el(s, h), P = h;
              for (v in P) if (P.hasOwnProperty(v)) {
                var M = P[v];
                v === "style" ? Af(t, M) : v === "dangerouslySetInnerHTML" ? (M = M ? M.__html : void 0, M != null && Tf(t, M)) : v === "children" ? typeof M == "string" ? (s !== "textarea" || M !== "") && xo(t, M) : typeof M == "number" && xo(t, "" + M) : v !== "suppressContentEditableWarning" && v !== "suppressHydrationWarning" && v !== "autoFocus" && (a.hasOwnProperty(v) ? M != null && v === "onScroll" && Ee("scroll", t) : M != null && E(t, v, M, _));
              }
              switch (s) {
                case "input":
                  Di(t), vf(t, u, !1);
                  break;
                case "textarea":
                  Di(t), xf(t);
                  break;
                case "option":
                  u.value != null && t.setAttribute("value", "" + xe(u.value));
                  break;
                case "select":
                  t.multiple = !!u.multiple, v = u.value, v != null ? br(t, !!u.multiple, v, !1) : u.defaultValue != null && br(
                    t,
                    !!u.multiple,
                    u.defaultValue,
                    !0
                  );
                  break;
                default:
                  typeof h.onClick == "function" && (t.onclick = ns);
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
        if (t && r.stateNode != null) Fm(t, r, t.memoizedProps, u);
        else {
          if (typeof u != "string" && r.stateNode === null) throw Error(o(166));
          if (s = or(Yo.current), or(Yt.current), us(r)) {
            if (u = r.stateNode, s = r.memoizedProps, u[Kt] = r, (v = u.nodeValue !== s) && (t = St, t !== null)) switch (t.tag) {
              case 3:
                ts(u.nodeValue, s, (t.mode & 1) !== 0);
                break;
              case 5:
                t.memoizedProps.suppressHydrationWarning !== !0 && ts(u.nodeValue, s, (t.mode & 1) !== 0);
            }
            v && (r.flags |= 4);
          } else u = (s.nodeType === 9 ? s : s.ownerDocument).createTextNode(u), u[Kt] = r, r.stateNode = u;
        }
        return tt(r), null;
      case 13:
        if (Me(Ne), u = r.memoizedState, t === null || t.memoizedState !== null && t.memoizedState.dehydrated !== null) {
          if (De && wt !== null && (r.mode & 1) !== 0 && (r.flags & 128) === 0) Vp(), $r(), r.flags |= 98560, v = !1;
          else if (v = us(r), u !== null && u.dehydrated !== null) {
            if (t === null) {
              if (!v) throw Error(o(318));
              if (v = r.memoizedState, v = v !== null ? v.dehydrated : null, !v) throw Error(o(317));
              v[Kt] = r;
            } else $r(), (r.flags & 128) === 0 && (r.memoizedState = null), r.flags |= 4;
            tt(r), v = !1;
          } else Ft !== null && (Ru(Ft), Ft = null), v = !0;
          if (!v) return r.flags & 65536 ? r : null;
        }
        return (r.flags & 128) !== 0 ? (r.lanes = s, r) : (u = u !== null, u !== (t !== null && t.memoizedState !== null) && u && (r.child.flags |= 8192, (r.mode & 1) !== 0 && (t === null || (Ne.current & 1) !== 0 ? $e === 0 && ($e = 3) : ju())), r.updateQueue !== null && (r.flags |= 4), tt(r), null);
      case 4:
        return Gr(), wu(t, r), t === null && zo(r.stateNode.containerInfo), tt(r), null;
      case 10:
        return Yl(r.type._context), tt(r), null;
      case 17:
        return dt(r.type) && os(), tt(r), null;
      case 19:
        if (Me(Ne), v = r.memoizedState, v === null) return tt(r), null;
        if (u = (r.flags & 128) !== 0, _ = v.rendering, _ === null) if (u) qo(v, !1);
        else {
          if ($e !== 0 || t !== null && (t.flags & 128) !== 0) for (t = r.child; t !== null; ) {
            if (_ = hs(t), _ !== null) {
              for (r.flags |= 128, qo(v, !1), u = _.updateQueue, u !== null && (r.updateQueue = u, r.flags |= 4), r.subtreeFlags = 0, u = s, s = r.child; s !== null; ) v = s, t = u, v.flags &= 14680066, _ = v.alternate, _ === null ? (v.childLanes = 0, v.lanes = t, v.child = null, v.subtreeFlags = 0, v.memoizedProps = null, v.memoizedState = null, v.updateQueue = null, v.dependencies = null, v.stateNode = null) : (v.childLanes = _.childLanes, v.lanes = _.lanes, v.child = _.child, v.subtreeFlags = 0, v.deletions = null, v.memoizedProps = _.memoizedProps, v.memoizedState = _.memoizedState, v.updateQueue = _.updateQueue, v.type = _.type, t = _.dependencies, v.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }), s = s.sibling;
              return be(Ne, Ne.current & 1 | 2), r.child;
            }
            t = t.sibling;
          }
          v.tail !== null && Oe() > Xr && (r.flags |= 128, u = !0, qo(v, !1), r.lanes = 4194304);
        }
        else {
          if (!u) if (t = hs(_), t !== null) {
            if (r.flags |= 128, u = !0, s = t.updateQueue, s !== null && (r.updateQueue = s, r.flags |= 4), qo(v, !0), v.tail === null && v.tailMode === "hidden" && !_.alternate && !De) return tt(r), null;
          } else 2 * Oe() - v.renderingStartTime > Xr && s !== 1073741824 && (r.flags |= 128, u = !0, qo(v, !1), r.lanes = 4194304);
          v.isBackwards ? (_.sibling = r.child, r.child = _) : (s = v.last, s !== null ? s.sibling = _ : r.child = _, v.last = _);
        }
        return v.tail !== null ? (r = v.tail, v.rendering = r, v.tail = r.sibling, v.renderingStartTime = Oe(), r.sibling = null, s = Ne.current, be(Ne, u ? s & 1 | 2 : s & 1), r) : (tt(r), null);
      case 22:
      case 23:
        return Nu(), u = r.memoizedState !== null, t !== null && t.memoizedState !== null !== u && (r.flags |= 8192), u && (r.mode & 1) !== 0 ? (xt & 1073741824) !== 0 && (tt(r), r.subtreeFlags & 6 && (r.flags |= 8192)) : tt(r), null;
      case 24:
        return null;
      case 25:
        return null;
    }
    throw Error(o(156, r.tag));
  }
  function kx(t, r) {
    switch ($l(r), r.tag) {
      case 1:
        return dt(r.type) && os(), t = r.flags, t & 65536 ? (r.flags = t & -65537 | 128, r) : null;
      case 3:
        return Gr(), Me(ct), Me(qe), tu(), t = r.flags, (t & 65536) !== 0 && (t & 128) === 0 ? (r.flags = t & -65537 | 128, r) : null;
      case 5:
        return ql(r), null;
      case 13:
        if (Me(Ne), t = r.memoizedState, t !== null && t.dehydrated !== null) {
          if (r.alternate === null) throw Error(o(340));
          $r();
        }
        return t = r.flags, t & 65536 ? (r.flags = t & -65537 | 128, r) : null;
      case 19:
        return Me(Ne), null;
      case 4:
        return Gr(), null;
      case 10:
        return Yl(r.type._context), null;
      case 22:
      case 23:
        return Nu(), null;
      case 24:
        return null;
      default:
        return null;
    }
  }
  var ks = !1, nt = !1, Ax = typeof WeakSet == "function" ? WeakSet : Set, ee = null;
  function Yr(t, r) {
    var s = t.ref;
    if (s !== null) if (typeof s == "function") try {
      s(null);
    } catch (u) {
      Fe(t, r, u);
    }
    else s.current = null;
  }
  function xu(t, r, s) {
    try {
      s();
    } catch (u) {
      Fe(t, r, u);
    }
  }
  var Om = !1;
  function Cx(t, r) {
    if (Nl = Hi, t = hp(), Al(t)) {
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
    for (jl = { focusedElem: t, selectionRange: s }, Hi = !1, ee = r; ee !== null; ) if (r = ee, t = r.child, (r.subtreeFlags & 1028) !== 0 && t !== null) t.return = r, ee = t;
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
    return te = Om, Om = !1, te;
  }
  function ei(t, r, s) {
    var u = r.updateQueue;
    if (u = u !== null ? u.lastEffect : null, u !== null) {
      var h = u = u.next;
      do {
        if ((h.tag & t) === t) {
          var v = h.destroy;
          h.destroy = void 0, v !== void 0 && xu(r, s, v);
        }
        h = h.next;
      } while (h !== u);
    }
  }
  function As(t, r) {
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
  function _u(t) {
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
  function Lm(t) {
    var r = t.alternate;
    r !== null && (t.alternate = null, Lm(r)), t.child = null, t.deletions = null, t.sibling = null, t.tag === 5 && (r = t.stateNode, r !== null && (delete r[Kt], delete r[Uo], delete r[Ll], delete r[lx], delete r[ux])), t.stateNode = null, t.return = null, t.dependencies = null, t.memoizedProps = null, t.memoizedState = null, t.pendingProps = null, t.stateNode = null, t.updateQueue = null;
  }
  function Vm(t) {
    return t.tag === 5 || t.tag === 3 || t.tag === 4;
  }
  function Bm(t) {
    e: for (; ; ) {
      for (; t.sibling === null; ) {
        if (t.return === null || Vm(t.return)) return null;
        t = t.return;
      }
      for (t.sibling.return = t.return, t = t.sibling; t.tag !== 5 && t.tag !== 6 && t.tag !== 18; ) {
        if (t.flags & 2 || t.child === null || t.tag === 4) continue e;
        t.child.return = t, t = t.child;
      }
      if (!(t.flags & 2)) return t.stateNode;
    }
  }
  function Tu(t, r, s) {
    var u = t.tag;
    if (u === 5 || u === 6) t = t.stateNode, r ? s.nodeType === 8 ? s.parentNode.insertBefore(t, r) : s.insertBefore(t, r) : (s.nodeType === 8 ? (r = s.parentNode, r.insertBefore(t, s)) : (r = s, r.appendChild(t)), s = s._reactRootContainer, s != null || r.onclick !== null || (r.onclick = ns));
    else if (u !== 4 && (t = t.child, t !== null)) for (Tu(t, r, s), t = t.sibling; t !== null; ) Tu(t, r, s), t = t.sibling;
  }
  function ku(t, r, s) {
    var u = t.tag;
    if (u === 5 || u === 6) t = t.stateNode, r ? s.insertBefore(t, r) : s.appendChild(t);
    else if (u !== 4 && (t = t.child, t !== null)) for (ku(t, r, s), t = t.sibling; t !== null; ) ku(t, r, s), t = t.sibling;
  }
  var Qe = null, Lt = !1;
  function jn(t, r, s) {
    for (s = s.child; s !== null; ) zm(t, r, s), s = s.sibling;
  }
  function zm(t, r, s) {
    if (Gt && typeof Gt.onCommitFiberUnmount == "function") try {
      Gt.onCommitFiberUnmount(Li, s);
    } catch {
    }
    switch (s.tag) {
      case 5:
        nt || Yr(s, r);
      case 6:
        var u = Qe, h = Lt;
        Qe = null, jn(t, r, s), Qe = u, Lt = h, Qe !== null && (Lt ? (t = Qe, s = s.stateNode, t.nodeType === 8 ? t.parentNode.removeChild(s) : t.removeChild(s)) : Qe.removeChild(s.stateNode));
        break;
      case 18:
        Qe !== null && (Lt ? (t = Qe, s = s.stateNode, t.nodeType === 8 ? Ol(t.parentNode, s) : t.nodeType === 1 && Ol(t, s), Do(t)) : Ol(Qe, s.stateNode));
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
            v = v.tag, _ !== void 0 && ((v & 2) !== 0 || (v & 4) !== 0) && xu(s, r, _), h = h.next;
          } while (h !== u);
        }
        jn(t, r, s);
        break;
      case 1:
        if (!nt && (Yr(s, r), u = s.stateNode, typeof u.componentWillUnmount == "function")) try {
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
  function $m(t) {
    var r = t.updateQueue;
    if (r !== null) {
      t.updateQueue = null;
      var s = t.stateNode;
      s === null && (s = t.stateNode = new Ax()), r.forEach(function(u) {
        var h = Ix.bind(null, t, u);
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
        zm(v, _, h), Qe = null, Lt = !1;
        var M = h.alternate;
        M !== null && (M.return = null), h.return = null;
      } catch (F) {
        Fe(h, r, F);
      }
    }
    if (r.subtreeFlags & 12854) for (r = r.child; r !== null; ) Um(r, t), r = r.sibling;
  }
  function Um(t, r) {
    var s = t.alternate, u = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        if (Vt(r, t), Xt(t), u & 4) {
          try {
            ei(3, t, t.return), As(3, t);
          } catch (oe) {
            Fe(t, t.return, oe);
          }
          try {
            ei(5, t, t.return);
          } catch (oe) {
            Fe(t, t.return, oe);
          }
        }
        break;
      case 1:
        Vt(r, t), Xt(t), u & 512 && s !== null && Yr(s, s.return);
        break;
      case 5:
        if (Vt(r, t), Xt(t), u & 512 && s !== null && Yr(s, s.return), t.flags & 32) {
          var h = t.stateNode;
          try {
            xo(h, "");
          } catch (oe) {
            Fe(t, t.return, oe);
          }
        }
        if (u & 4 && (h = t.stateNode, h != null)) {
          var v = t.memoizedProps, _ = s !== null ? s.memoizedProps : v, P = t.type, M = t.updateQueue;
          if (t.updateQueue = null, M !== null) try {
            P === "input" && v.type === "radio" && v.name != null && gf(h, v), tl(P, _);
            var F = tl(P, v);
            for (_ = 0; _ < M.length; _ += 2) {
              var B = M[_], $ = M[_ + 1];
              B === "style" ? Af(h, $) : B === "dangerouslySetInnerHTML" ? Tf(h, $) : B === "children" ? xo(h, $) : E(h, B, $, F);
            }
            switch (P) {
              case "input":
                Xa(h, v);
                break;
              case "textarea":
                wf(h, v);
                break;
              case "select":
                var V = h._wrapperState.wasMultiple;
                h._wrapperState.wasMultiple = !!v.multiple;
                var q = v.value;
                q != null ? br(h, !!v.multiple, q, !1) : V !== !!v.multiple && (v.defaultValue != null ? br(
                  h,
                  !!v.multiple,
                  v.defaultValue,
                  !0
                ) : br(h, !!v.multiple, v.multiple ? [] : "", !1));
            }
            h[Uo] = v;
          } catch (oe) {
            Fe(t, t.return, oe);
          }
        }
        break;
      case 6:
        if (Vt(r, t), Xt(t), u & 4) {
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
        if (Vt(r, t), Xt(t), u & 4 && s !== null && s.memoizedState.isDehydrated) try {
          Do(r.containerInfo);
        } catch (oe) {
          Fe(t, t.return, oe);
        }
        break;
      case 4:
        Vt(r, t), Xt(t);
        break;
      case 13:
        Vt(r, t), Xt(t), h = t.child, h.flags & 8192 && (v = h.memoizedState !== null, h.stateNode.isHidden = v, !v || h.alternate !== null && h.alternate.memoizedState !== null || (bu = Oe())), u & 4 && $m(t);
        break;
      case 22:
        if (B = s !== null && s.memoizedState !== null, t.mode & 1 ? (nt = (F = nt) || B, Vt(r, t), nt = F) : Vt(r, t), Xt(t), u & 8192) {
          if (F = t.memoizedState !== null, (t.stateNode.isHidden = F) && !B && (t.mode & 1) !== 0) for (ee = t, B = t.child; B !== null; ) {
            for ($ = ee = B; ee !== null; ) {
              switch (V = ee, q = V.child, V.tag) {
                case 0:
                case 11:
                case 14:
                case 15:
                  ei(4, V, V.return);
                  break;
                case 1:
                  Yr(V, V.return);
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
                  Yr(V, V.return);
                  break;
                case 22:
                  if (V.memoizedState !== null) {
                    Gm($);
                    continue;
                  }
              }
              q !== null ? (q.return = V, ee = q) : Gm($);
            }
            B = B.sibling;
          }
          e: for (B = null, $ = t; ; ) {
            if ($.tag === 5) {
              if (B === null) {
                B = $;
                try {
                  h = $.stateNode, F ? (v = h.style, typeof v.setProperty == "function" ? v.setProperty("display", "none", "important") : v.display = "none") : (P = $.stateNode, M = $.memoizedProps.style, _ = M != null && M.hasOwnProperty("display") ? M.display : null, P.style.display = kf("display", _));
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
        Vt(r, t), Xt(t), u & 4 && $m(t);
        break;
      case 21:
        break;
      default:
        Vt(
          r,
          t
        ), Xt(t);
    }
  }
  function Xt(t) {
    var r = t.flags;
    if (r & 2) {
      try {
        e: {
          for (var s = t.return; s !== null; ) {
            if (Vm(s)) {
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
            u.flags & 32 && (xo(h, ""), u.flags &= -33);
            var v = Bm(t);
            ku(t, v, h);
            break;
          case 3:
          case 4:
            var _ = u.stateNode.containerInfo, P = Bm(t);
            Tu(t, P, _);
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
  function bx(t, r, s) {
    ee = t, Hm(t);
  }
  function Hm(t, r, s) {
    for (var u = (t.mode & 1) !== 0; ee !== null; ) {
      var h = ee, v = h.child;
      if (h.tag === 22 && u) {
        var _ = h.memoizedState !== null || ks;
        if (!_) {
          var P = h.alternate, M = P !== null && P.memoizedState !== null || nt;
          P = ks;
          var F = nt;
          if (ks = _, (nt = M) && !F) for (ee = h; ee !== null; ) _ = ee, M = _.child, _.tag === 22 && _.memoizedState !== null ? Km(h) : M !== null ? (M.return = _, ee = M) : Km(h);
          for (; v !== null; ) ee = v, Hm(v), v = v.sibling;
          ee = h, ks = P, nt = F;
        }
        Wm(t);
      } else (h.subtreeFlags & 8772) !== 0 && v !== null ? (v.return = h, ee = v) : Wm(t);
    }
  }
  function Wm(t) {
    for (; ee !== null; ) {
      var r = ee;
      if ((r.flags & 8772) !== 0) {
        var s = r.alternate;
        try {
          if ((r.flags & 8772) !== 0) switch (r.tag) {
            case 0:
            case 11:
            case 15:
              nt || As(5, r);
              break;
            case 1:
              var u = r.stateNode;
              if (r.flags & 4 && !nt) if (s === null) u.componentDidMount();
              else {
                var h = r.elementType === r.type ? s.memoizedProps : Ot(r.type, s.memoizedProps);
                u.componentDidUpdate(h, s.memoizedState, u.__reactInternalSnapshotBeforeUpdate);
              }
              var v = r.updateQueue;
              v !== null && Gp(r, v, u);
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
                Gp(r, _, s);
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
                    $ !== null && Do($);
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
          nt || r.flags & 512 && _u(r);
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
  function Gm(t) {
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
  function Km(t) {
    for (; ee !== null; ) {
      var r = ee;
      try {
        switch (r.tag) {
          case 0:
          case 11:
          case 15:
            var s = r.return;
            try {
              As(4, r);
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
              _u(r);
            } catch (M) {
              Fe(r, v, M);
            }
            break;
          case 5:
            var _ = r.return;
            try {
              _u(r);
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
  var Px = Math.ceil, Cs = D.ReactCurrentDispatcher, Au = D.ReactCurrentOwner, Pt = D.ReactCurrentBatchConfig, he = 0, We = null, Ve = null, Xe = 0, xt = 0, Qr = En(0), $e = 0, ti = null, sr = 0, bs = 0, Cu = 0, ni = null, pt = null, bu = 0, Xr = 1 / 0, pn = null, Ps = !1, Pu = null, In = null, Es = !1, Fn = null, Ms = 0, ri = 0, Eu = null, Rs = -1, Ds = 0;
  function ot() {
    return (he & 6) !== 0 ? Oe() : Rs !== -1 ? Rs : Rs = Oe();
  }
  function On(t) {
    return (t.mode & 1) === 0 ? 1 : (he & 2) !== 0 && Xe !== 0 ? Xe & -Xe : dx.transition !== null ? (Ds === 0 && (Ds = Bf()), Ds) : (t = _e, t !== 0 || (t = window.event, t = t === void 0 ? 16 : Qf(t.type)), t);
  }
  function Bt(t, r, s, u) {
    if (50 < ri) throw ri = 0, Eu = null, Error(o(185));
    bo(t, s, u), ((he & 2) === 0 || t !== We) && (t === We && ((he & 2) === 0 && (bs |= s), $e === 4 && Ln(t, Xe)), mt(t, u), s === 1 && he === 0 && (r.mode & 1) === 0 && (Xr = Oe() + 500, ss && Rn()));
  }
  function mt(t, r) {
    var s = t.callbackNode;
    dw(t, r);
    var u = zi(t, t === We ? Xe : 0);
    if (u === 0) s !== null && Of(s), t.callbackNode = null, t.callbackPriority = 0;
    else if (r = u & -u, t.callbackPriority !== r) {
      if (s != null && Of(s), r === 1) t.tag === 0 ? cx(Qm.bind(null, t)) : jp(Qm.bind(null, t)), sx(function() {
        (he & 6) === 0 && Rn();
      }), s = null;
      else {
        switch (zf(u)) {
          case 1:
            s = ll;
            break;
          case 4:
            s = Lf;
            break;
          case 16:
            s = Oi;
            break;
          case 536870912:
            s = Vf;
            break;
          default:
            s = Oi;
        }
        s = rh(s, Ym.bind(null, t));
      }
      t.callbackPriority = r, t.callbackNode = s;
    }
  }
  function Ym(t, r) {
    if (Rs = -1, Ds = 0, (he & 6) !== 0) throw Error(o(327));
    var s = t.callbackNode;
    if (Zr() && t.callbackNode !== s) return null;
    var u = zi(t, t === We ? Xe : 0);
    if (u === 0) return null;
    if ((u & 30) !== 0 || (u & t.expiredLanes) !== 0 || r) r = Ns(t, u);
    else {
      r = u;
      var h = he;
      he |= 2;
      var v = Zm();
      (We !== t || Xe !== r) && (pn = null, Xr = Oe() + 500, lr(t, r));
      do
        try {
          Rx();
          break;
        } catch (P) {
          Xm(t, P);
        }
      while (!0);
      Kl(), Cs.current = v, he = h, Ve !== null ? r = 0 : (We = null, Xe = 0, r = $e);
    }
    if (r !== 0) {
      if (r === 2 && (h = ul(t), h !== 0 && (u = h, r = Mu(t, h))), r === 1) throw s = ti, lr(t, 0), Ln(t, u), mt(t, Oe()), s;
      if (r === 6) Ln(t, u);
      else {
        if (h = t.current.alternate, (u & 30) === 0 && !Ex(h) && (r = Ns(t, u), r === 2 && (v = ul(t), v !== 0 && (u = v, r = Mu(t, v))), r === 1)) throw s = ti, lr(t, 0), Ln(t, u), mt(t, Oe()), s;
        switch (t.finishedWork = h, t.finishedLanes = u, r) {
          case 0:
          case 1:
            throw Error(o(345));
          case 2:
            ur(t, pt, pn);
            break;
          case 3:
            if (Ln(t, u), (u & 130023424) === u && (r = bu + 500 - Oe(), 10 < r)) {
              if (zi(t, 0) !== 0) break;
              if (h = t.suspendedLanes, (h & u) !== u) {
                ot(), t.pingedLanes |= t.suspendedLanes & h;
                break;
              }
              t.timeoutHandle = Fl(ur.bind(null, t, pt, pn), r);
              break;
            }
            ur(t, pt, pn);
            break;
          case 4:
            if (Ln(t, u), (u & 4194240) === u) break;
            for (r = t.eventTimes, h = -1; 0 < u; ) {
              var _ = 31 - jt(u);
              v = 1 << _, _ = r[_], _ > h && (h = _), u &= ~v;
            }
            if (u = h, u = Oe() - u, u = (120 > u ? 120 : 480 > u ? 480 : 1080 > u ? 1080 : 1920 > u ? 1920 : 3e3 > u ? 3e3 : 4320 > u ? 4320 : 1960 * Px(u / 1960)) - u, 10 < u) {
              t.timeoutHandle = Fl(ur.bind(null, t, pt, pn), u);
              break;
            }
            ur(t, pt, pn);
            break;
          case 5:
            ur(t, pt, pn);
            break;
          default:
            throw Error(o(329));
        }
      }
    }
    return mt(t, Oe()), t.callbackNode === s ? Ym.bind(null, t) : null;
  }
  function Mu(t, r) {
    var s = ni;
    return t.current.memoizedState.isDehydrated && (lr(t, r).flags |= 256), t = Ns(t, r), t !== 2 && (r = pt, pt = s, r !== null && Ru(r)), t;
  }
  function Ru(t) {
    pt === null ? pt = t : pt.push.apply(pt, t);
  }
  function Ex(t) {
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
    for (r &= ~Cu, r &= ~bs, t.suspendedLanes |= r, t.pingedLanes &= ~r, t = t.expirationTimes; 0 < r; ) {
      var s = 31 - jt(r), u = 1 << s;
      t[s] = -1, r &= ~u;
    }
  }
  function Qm(t) {
    if ((he & 6) !== 0) throw Error(o(327));
    Zr();
    var r = zi(t, 0);
    if ((r & 1) === 0) return mt(t, Oe()), null;
    var s = Ns(t, r);
    if (t.tag !== 0 && s === 2) {
      var u = ul(t);
      u !== 0 && (r = u, s = Mu(t, u));
    }
    if (s === 1) throw s = ti, lr(t, 0), Ln(t, r), mt(t, Oe()), s;
    if (s === 6) throw Error(o(345));
    return t.finishedWork = t.current.alternate, t.finishedLanes = r, ur(t, pt, pn), mt(t, Oe()), null;
  }
  function Du(t, r) {
    var s = he;
    he |= 1;
    try {
      return t(r);
    } finally {
      he = s, he === 0 && (Xr = Oe() + 500, ss && Rn());
    }
  }
  function ar(t) {
    Fn !== null && Fn.tag === 0 && (he & 6) === 0 && Zr();
    var r = he;
    he |= 1;
    var s = Pt.transition, u = _e;
    try {
      if (Pt.transition = null, _e = 1, t) return t();
    } finally {
      _e = u, Pt.transition = s, he = r, (he & 6) === 0 && Rn();
    }
  }
  function Nu() {
    xt = Qr.current, Me(Qr);
  }
  function lr(t, r) {
    t.finishedWork = null, t.finishedLanes = 0;
    var s = t.timeoutHandle;
    if (s !== -1 && (t.timeoutHandle = -1, ix(s)), Ve !== null) for (s = Ve.return; s !== null; ) {
      var u = s;
      switch ($l(u), u.tag) {
        case 1:
          u = u.type.childContextTypes, u != null && os();
          break;
        case 3:
          Gr(), Me(ct), Me(qe), tu();
          break;
        case 5:
          ql(u);
          break;
        case 4:
          Gr();
          break;
        case 13:
          Me(Ne);
          break;
        case 19:
          Me(Ne);
          break;
        case 10:
          Yl(u.type._context);
          break;
        case 22:
        case 23:
          Nu();
      }
      s = s.return;
    }
    if (We = t, Ve = t = Vn(t.current, null), Xe = xt = r, $e = 0, ti = null, Cu = bs = sr = 0, pt = ni = null, rr !== null) {
      for (r = 0; r < rr.length; r++) if (s = rr[r], u = s.interleaved, u !== null) {
        s.interleaved = null;
        var h = u.next, v = s.pending;
        if (v !== null) {
          var _ = v.next;
          v.next = h, u.next = _;
        }
        s.pending = u;
      }
      rr = null;
    }
    return t;
  }
  function Xm(t, r) {
    do {
      var s = Ve;
      try {
        if (Kl(), ys.current = ws, gs) {
          for (var u = je.memoizedState; u !== null; ) {
            var h = u.queue;
            h !== null && (h.pending = null), u = u.next;
          }
          gs = !1;
        }
        if (ir = 0, He = ze = je = null, Qo = !1, Xo = 0, Au.current = null, s === null || s.return === null) {
          $e = 1, ti = r, Ve = null;
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
            var q = xm(_);
            if (q !== null) {
              q.flags &= -257, _m(q, _, P, v, r), q.mode & 1 && wm(v, F, r), r = q, M = F;
              var te = r.updateQueue;
              if (te === null) {
                var oe = /* @__PURE__ */ new Set();
                oe.add(M), r.updateQueue = oe;
              } else te.add(M);
              break e;
            } else {
              if ((r & 1) === 0) {
                wm(v, F, r), ju();
                break e;
              }
              M = Error(o(426));
            }
          } else if (De && P.mode & 1) {
            var Le = xm(_);
            if (Le !== null) {
              (Le.flags & 65536) === 0 && (Le.flags |= 256), _m(Le, _, P, v, r), Wl(Kr(M, P));
              break e;
            }
          }
          v = M = Kr(M, P), $e !== 4 && ($e = 2), ni === null ? ni = [v] : ni.push(v), v = _;
          do {
            switch (v.tag) {
              case 3:
                v.flags |= 65536, r &= -r, v.lanes |= r;
                var j = vm(v, M, r);
                Wp(v, j);
                break e;
              case 1:
                P = M;
                var R = v.type, I = v.stateNode;
                if ((v.flags & 128) === 0 && (typeof R.getDerivedStateFromError == "function" || I !== null && typeof I.componentDidCatch == "function" && (In === null || !In.has(I)))) {
                  v.flags |= 65536, r &= -r, v.lanes |= r;
                  var U = Sm(v, P, r);
                  Wp(v, U);
                  break e;
                }
            }
            v = v.return;
          } while (v !== null);
        }
        qm(s);
      } catch (ie) {
        r = ie, Ve === s && s !== null && (Ve = s = s.return);
        continue;
      }
      break;
    } while (!0);
  }
  function Zm() {
    var t = Cs.current;
    return Cs.current = ws, t === null ? ws : t;
  }
  function ju() {
    ($e === 0 || $e === 3 || $e === 2) && ($e = 4), We === null || (sr & 268435455) === 0 && (bs & 268435455) === 0 || Ln(We, Xe);
  }
  function Ns(t, r) {
    var s = he;
    he |= 2;
    var u = Zm();
    (We !== t || Xe !== r) && (pn = null, lr(t, r));
    do
      try {
        Mx();
        break;
      } catch (h) {
        Xm(t, h);
      }
    while (!0);
    if (Kl(), he = s, Cs.current = u, Ve !== null) throw Error(o(261));
    return We = null, Xe = 0, $e;
  }
  function Mx() {
    for (; Ve !== null; ) Jm(Ve);
  }
  function Rx() {
    for (; Ve !== null && !nw(); ) Jm(Ve);
  }
  function Jm(t) {
    var r = nh(t.alternate, t, xt);
    t.memoizedProps = t.pendingProps, r === null ? qm(t) : Ve = r, Au.current = null;
  }
  function qm(t) {
    var r = t;
    do {
      var s = r.alternate;
      if (t = r.return, (r.flags & 32768) === 0) {
        if (s = Tx(s, r, xt), s !== null) {
          Ve = s;
          return;
        }
      } else {
        if (s = kx(s, r), s !== null) {
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
    var u = _e, h = Pt.transition;
    try {
      Pt.transition = null, _e = 1, Dx(t, r, s, u);
    } finally {
      Pt.transition = h, _e = u;
    }
    return null;
  }
  function Dx(t, r, s, u) {
    do
      Zr();
    while (Fn !== null);
    if ((he & 6) !== 0) throw Error(o(327));
    s = t.finishedWork;
    var h = t.finishedLanes;
    if (s === null) return null;
    if (t.finishedWork = null, t.finishedLanes = 0, s === t.current) throw Error(o(177));
    t.callbackNode = null, t.callbackPriority = 0;
    var v = s.lanes | s.childLanes;
    if (fw(t, v), t === We && (Ve = We = null, Xe = 0), (s.subtreeFlags & 2064) === 0 && (s.flags & 2064) === 0 || Es || (Es = !0, rh(Oi, function() {
      return Zr(), null;
    })), v = (s.flags & 15990) !== 0, (s.subtreeFlags & 15990) !== 0 || v) {
      v = Pt.transition, Pt.transition = null;
      var _ = _e;
      _e = 1;
      var P = he;
      he |= 4, Au.current = null, Cx(t, s), Um(s, t), Jw(jl), Hi = !!Nl, jl = Nl = null, t.current = s, bx(s), rw(), he = P, _e = _, Pt.transition = v;
    } else t.current = s;
    if (Es && (Es = !1, Fn = t, Ms = h), v = t.pendingLanes, v === 0 && (In = null), sw(s.stateNode), mt(t, Oe()), r !== null) for (u = t.onRecoverableError, s = 0; s < r.length; s++) h = r[s], u(h.value, { componentStack: h.stack, digest: h.digest });
    if (Ps) throw Ps = !1, t = Pu, Pu = null, t;
    return (Ms & 1) !== 0 && t.tag !== 0 && Zr(), v = t.pendingLanes, (v & 1) !== 0 ? t === Eu ? ri++ : (ri = 0, Eu = t) : ri = 0, Rn(), null;
  }
  function Zr() {
    if (Fn !== null) {
      var t = zf(Ms), r = Pt.transition, s = _e;
      try {
        if (Pt.transition = null, _e = 16 > t ? 16 : t, Fn === null) var u = !1;
        else {
          if (t = Fn, Fn = null, Ms = 0, (he & 6) !== 0) throw Error(o(331));
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
                        ei(8, B, v);
                    }
                    var $ = B.child;
                    if ($ !== null) $.return = B, ee = $;
                    else for (; ee !== null; ) {
                      B = ee;
                      var V = B.sibling, q = B.return;
                      if (Lm(B), B === F) {
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
                  ei(9, v, v.return);
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
                    As(9, P);
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
          if (he = h, Rn(), Gt && typeof Gt.onPostCommitFiberRoot == "function") try {
            Gt.onPostCommitFiberRoot(Li, t);
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
  function eh(t, r, s) {
    r = Kr(s, r), r = vm(t, r, 1), t = Nn(t, r, 1), r = ot(), t !== null && (bo(t, 1, r), mt(t, r));
  }
  function Fe(t, r, s) {
    if (t.tag === 3) eh(t, t, s);
    else for (; r !== null; ) {
      if (r.tag === 3) {
        eh(r, t, s);
        break;
      } else if (r.tag === 1) {
        var u = r.stateNode;
        if (typeof r.type.getDerivedStateFromError == "function" || typeof u.componentDidCatch == "function" && (In === null || !In.has(u))) {
          t = Kr(s, t), t = Sm(r, t, 1), r = Nn(r, t, 1), t = ot(), r !== null && (bo(r, 1, t), mt(r, t));
          break;
        }
      }
      r = r.return;
    }
  }
  function Nx(t, r, s) {
    var u = t.pingCache;
    u !== null && u.delete(r), r = ot(), t.pingedLanes |= t.suspendedLanes & s, We === t && (Xe & s) === s && ($e === 4 || $e === 3 && (Xe & 130023424) === Xe && 500 > Oe() - bu ? lr(t, 0) : Cu |= s), mt(t, r);
  }
  function th(t, r) {
    r === 0 && ((t.mode & 1) === 0 ? r = 1 : (r = Bi, Bi <<= 1, (Bi & 130023424) === 0 && (Bi = 4194304)));
    var s = ot();
    t = cn(t, r), t !== null && (bo(t, r, s), mt(t, s));
  }
  function jx(t) {
    var r = t.memoizedState, s = 0;
    r !== null && (s = r.retryLane), th(t, s);
  }
  function Ix(t, r) {
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
    u !== null && u.delete(r), th(t, s);
  }
  var nh;
  nh = function(t, r, s) {
    if (t !== null) if (t.memoizedProps !== r.pendingProps || ct.current) ft = !0;
    else {
      if ((t.lanes & s) === 0 && (r.flags & 128) === 0) return ft = !1, _x(t, r, s);
      ft = (t.flags & 131072) !== 0;
    }
    else ft = !1, De && (r.flags & 1048576) !== 0 && Ip(r, ls, r.index);
    switch (r.lanes = 0, r.tag) {
      case 2:
        var u = r.type;
        Ts(t, r), t = r.pendingProps;
        var h = Vr(r, qe.current);
        Wr(r, s), h = ou(null, r, u, t, h, s);
        var v = iu();
        return r.flags |= 1, typeof h == "object" && h !== null && typeof h.render == "function" && h.$$typeof === void 0 ? (r.tag = 1, r.memoizedState = null, r.updateQueue = null, dt(u) ? (v = !0, is(r)) : v = !1, r.memoizedState = h.state !== null && h.state !== void 0 ? h.state : null, Zl(r), h.updater = xs, r.stateNode = h, h._reactInternals = r, du(r, u, t, s), r = hu(null, r, u, !0, v, s)) : (r.tag = 0, De && v && zl(r), rt(null, r, h, s), r = r.child), r;
      case 16:
        u = r.elementType;
        e: {
          switch (Ts(t, r), t = r.pendingProps, h = u._init, u = h(u._payload), r.type = u, h = r.tag = Ox(u), t = Ot(u, t), h) {
            case 0:
              r = mu(null, r, u, t, s);
              break e;
            case 1:
              r = Pm(null, r, u, t, s);
              break e;
            case 11:
              r = Tm(null, r, u, t, s);
              break e;
            case 14:
              r = km(null, r, u, Ot(u.type, t), s);
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
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Ot(u, h), mu(t, r, u, h, s);
      case 1:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Ot(u, h), Pm(t, r, u, h, s);
      case 3:
        e: {
          if (Em(r), t === null) throw Error(o(387));
          u = r.pendingProps, v = r.memoizedState, h = v.element, Hp(t, r), ms(r, u, null, s);
          var _ = r.memoizedState;
          if (u = _.element, v.isDehydrated) if (v = { element: u, isDehydrated: !1, cache: _.cache, pendingSuspenseBoundaries: _.pendingSuspenseBoundaries, transitions: _.transitions }, r.updateQueue.baseState = v, r.memoizedState = v, r.flags & 256) {
            h = Kr(Error(o(423)), r), r = Mm(t, r, u, s, h);
            break e;
          } else if (u !== h) {
            h = Kr(Error(o(424)), r), r = Mm(t, r, u, s, h);
            break e;
          } else for (wt = Pn(r.stateNode.containerInfo.firstChild), St = r, De = !0, Ft = null, s = $p(r, null, u, s), r.child = s; s; ) s.flags = s.flags & -3 | 4096, s = s.sibling;
          else {
            if ($r(), u === h) {
              r = fn(t, r, s);
              break e;
            }
            rt(t, r, u, s);
          }
          r = r.child;
        }
        return r;
      case 5:
        return Kp(r), t === null && Hl(r), u = r.type, h = r.pendingProps, v = t !== null ? t.memoizedProps : null, _ = h.children, Il(u, h) ? _ = null : v !== null && Il(u, v) && (r.flags |= 32), bm(t, r), rt(t, r, _, s), r.child;
      case 6:
        return t === null && Hl(r), null;
      case 13:
        return Rm(t, r, s);
      case 4:
        return Jl(r, r.stateNode.containerInfo), u = r.pendingProps, t === null ? r.child = Ur(r, null, u, s) : rt(t, r, u, s), r.child;
      case 11:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Ot(u, h), Tm(t, r, u, h, s);
      case 7:
        return rt(t, r, r.pendingProps, s), r.child;
      case 8:
        return rt(t, r, r.pendingProps.children, s), r.child;
      case 12:
        return rt(t, r, r.pendingProps.children, s), r.child;
      case 10:
        e: {
          if (u = r.type._context, h = r.pendingProps, v = r.memoizedProps, _ = h.value, be(ds, u._currentValue), u._currentValue = _, v !== null) if (It(v.value, _)) {
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
                  v.lanes |= s, M = v.alternate, M !== null && (M.lanes |= s), Ql(
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
              _.lanes |= s, P = _.alternate, P !== null && (P.lanes |= s), Ql(_, s, r), _ = v.sibling;
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
        return h = r.type, u = r.pendingProps.children, Wr(r, s), h = Ct(h), u = u(h), r.flags |= 1, rt(t, r, u, s), r.child;
      case 14:
        return u = r.type, h = Ot(u, r.pendingProps), h = Ot(u.type, h), km(t, r, u, h, s);
      case 15:
        return Am(t, r, r.type, r.pendingProps, s);
      case 17:
        return u = r.type, h = r.pendingProps, h = r.elementType === u ? h : Ot(u, h), Ts(t, r), r.tag = 1, dt(u) ? (t = !0, is(r)) : t = !1, Wr(r, s), ym(r, u, h), du(r, u, h, s), hu(null, r, u, !0, t, s);
      case 19:
        return Nm(t, r, s);
      case 22:
        return Cm(t, r, s);
    }
    throw Error(o(156, r.tag));
  };
  function rh(t, r) {
    return Ff(t, r);
  }
  function Fx(t, r, s, u) {
    this.tag = t, this.key = s, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.ref = null, this.pendingProps = r, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = u, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function Et(t, r, s, u) {
    return new Fx(t, r, s, u);
  }
  function Iu(t) {
    return t = t.prototype, !(!t || !t.isReactComponent);
  }
  function Ox(t) {
    if (typeof t == "function") return Iu(t) ? 1 : 0;
    if (t != null) {
      if (t = t.$$typeof, t === Z) return 11;
      if (t === Se) return 14;
    }
    return 2;
  }
  function Vn(t, r) {
    var s = t.alternate;
    return s === null ? (s = Et(t.tag, r, t.key, t.mode), s.elementType = t.elementType, s.type = t.type, s.stateNode = t.stateNode, s.alternate = t, t.alternate = s) : (s.pendingProps = r, s.type = t.type, s.flags = 0, s.subtreeFlags = 0, s.deletions = null), s.flags = t.flags & 14680064, s.childLanes = t.childLanes, s.lanes = t.lanes, s.child = t.child, s.memoizedProps = t.memoizedProps, s.memoizedState = t.memoizedState, s.updateQueue = t.updateQueue, r = t.dependencies, s.dependencies = r === null ? null : { lanes: r.lanes, firstContext: r.firstContext }, s.sibling = t.sibling, s.index = t.index, s.ref = t.ref, s;
  }
  function js(t, r, s, u, h, v) {
    var _ = 2;
    if (u = t, typeof t == "function") Iu(t) && (_ = 1);
    else if (typeof t == "string") _ = 5;
    else e: switch (t) {
      case W:
        return cr(s.children, h, v, r);
      case G:
        _ = 8, h |= 8;
        break;
      case K:
        return t = Et(12, s, r, h | 2), t.elementType = K, t.lanes = v, t;
      case de:
        return t = Et(13, s, r, h), t.elementType = de, t.lanes = v, t;
      case ce:
        return t = Et(19, s, r, h), t.elementType = ce, t.lanes = v, t;
      case we:
        return Is(s, h, v, r);
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
    return r = Et(_, s, r, h), r.elementType = t, r.type = u, r.lanes = v, r;
  }
  function cr(t, r, s, u) {
    return t = Et(7, t, u, r), t.lanes = s, t;
  }
  function Is(t, r, s, u) {
    return t = Et(22, t, u, r), t.elementType = we, t.lanes = s, t.stateNode = { isHidden: !1 }, t;
  }
  function Fu(t, r, s) {
    return t = Et(6, t, null, r), t.lanes = s, t;
  }
  function Ou(t, r, s) {
    return r = Et(4, t.children !== null ? t.children : [], t.key, r), r.lanes = s, r.stateNode = { containerInfo: t.containerInfo, pendingChildren: null, implementation: t.implementation }, r;
  }
  function Lx(t, r, s, u, h) {
    this.tag = r, this.containerInfo = t, this.finishedWork = this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.pendingContext = this.context = null, this.callbackPriority = 0, this.eventTimes = cl(0), this.expirationTimes = cl(-1), this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = cl(0), this.identifierPrefix = u, this.onRecoverableError = h, this.mutableSourceEagerHydrationData = null;
  }
  function Lu(t, r, s, u, h, v, _, P, M) {
    return t = new Lx(t, r, s, P, M), r === 1 ? (r = 1, v === !0 && (r |= 8)) : r = 0, v = Et(3, null, null, r), t.current = v, v.stateNode = t, v.memoizedState = { element: u, isDehydrated: s, cache: null, transitions: null, pendingSuspenseBoundaries: null }, Zl(v), t;
  }
  function Vx(t, r, s) {
    var u = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return { $$typeof: H, key: u == null ? null : "" + u, children: t, containerInfo: r, implementation: s };
  }
  function oh(t) {
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
      if (dt(s)) return Dp(t, s, r);
    }
    return r;
  }
  function ih(t, r, s, u, h, v, _, P, M) {
    return t = Lu(s, u, !0, t, h, v, _, P, M), t.context = oh(null), s = t.current, u = ot(), h = On(s), v = dn(u, h), v.callback = r ?? null, Nn(s, v, h), t.current.lanes = h, bo(t, h, u), mt(t, u), t;
  }
  function Fs(t, r, s, u) {
    var h = r.current, v = ot(), _ = On(h);
    return s = oh(s), r.context === null ? r.context = s : r.pendingContext = s, r = dn(v, _), r.payload = { element: t }, u = u === void 0 ? null : u, u !== null && (r.callback = u), t = Nn(h, r, _), t !== null && (Bt(t, h, _, v), ps(t, h, _)), _;
  }
  function Os(t) {
    if (t = t.current, !t.child) return null;
    switch (t.child.tag) {
      case 5:
        return t.child.stateNode;
      default:
        return t.child.stateNode;
    }
  }
  function sh(t, r) {
    if (t = t.memoizedState, t !== null && t.dehydrated !== null) {
      var s = t.retryLane;
      t.retryLane = s !== 0 && s < r ? s : r;
    }
  }
  function Vu(t, r) {
    sh(t, r), (t = t.alternate) && sh(t, r);
  }
  function Bx() {
    return null;
  }
  var ah = typeof reportError == "function" ? reportError : function(t) {
    console.error(t);
  };
  function Bu(t) {
    this._internalRoot = t;
  }
  Ls.prototype.render = Bu.prototype.render = function(t) {
    var r = this._internalRoot;
    if (r === null) throw Error(o(409));
    Fs(t, r, null, null);
  }, Ls.prototype.unmount = Bu.prototype.unmount = function() {
    var t = this._internalRoot;
    if (t !== null) {
      this._internalRoot = null;
      var r = t.containerInfo;
      ar(function() {
        Fs(null, t, null, null);
      }), r[sn] = null;
    }
  };
  function Ls(t) {
    this._internalRoot = t;
  }
  Ls.prototype.unstable_scheduleHydration = function(t) {
    if (t) {
      var r = Hf();
      t = { blockedOn: null, target: t, priority: r };
      for (var s = 0; s < An.length && r !== 0 && r < An[s].priority; s++) ;
      An.splice(s, 0, t), s === 0 && Kf(t);
    }
  };
  function zu(t) {
    return !(!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11);
  }
  function Vs(t) {
    return !(!t || t.nodeType !== 1 && t.nodeType !== 9 && t.nodeType !== 11 && (t.nodeType !== 8 || t.nodeValue !== " react-mount-point-unstable "));
  }
  function lh() {
  }
  function zx(t, r, s, u, h) {
    if (h) {
      if (typeof u == "function") {
        var v = u;
        u = function() {
          var F = Os(_);
          v.call(F);
        };
      }
      var _ = ih(r, u, t, 0, null, !1, !1, "", lh);
      return t._reactRootContainer = _, t[sn] = _.current, zo(t.nodeType === 8 ? t.parentNode : t), ar(), _;
    }
    for (; h = t.lastChild; ) t.removeChild(h);
    if (typeof u == "function") {
      var P = u;
      u = function() {
        var F = Os(M);
        P.call(F);
      };
    }
    var M = Lu(t, 0, !1, null, null, !1, !1, "", lh);
    return t._reactRootContainer = M, t[sn] = M.current, zo(t.nodeType === 8 ? t.parentNode : t), ar(function() {
      Fs(r, M, s, u);
    }), M;
  }
  function Bs(t, r, s, u, h) {
    var v = s._reactRootContainer;
    if (v) {
      var _ = v;
      if (typeof h == "function") {
        var P = h;
        h = function() {
          var M = Os(_);
          P.call(M);
        };
      }
      Fs(r, _, t, h);
    } else _ = zx(s, r, t, h, u);
    return Os(_);
  }
  $f = function(t) {
    switch (t.tag) {
      case 3:
        var r = t.stateNode;
        if (r.current.memoizedState.isDehydrated) {
          var s = Co(r.pendingLanes);
          s !== 0 && (dl(r, s | 1), mt(r, Oe()), (he & 6) === 0 && (Xr = Oe() + 500, Rn()));
        }
        break;
      case 13:
        ar(function() {
          var u = cn(t, 1);
          if (u !== null) {
            var h = ot();
            Bt(u, t, 1, h);
          }
        }), Vu(t, 1);
    }
  }, fl = function(t) {
    if (t.tag === 13) {
      var r = cn(t, 134217728);
      if (r !== null) {
        var s = ot();
        Bt(r, t, 134217728, s);
      }
      Vu(t, 134217728);
    }
  }, Uf = function(t) {
    if (t.tag === 13) {
      var r = On(t), s = cn(t, r);
      if (s !== null) {
        var u = ot();
        Bt(s, t, r, u);
      }
      Vu(t, r);
    }
  }, Hf = function() {
    return _e;
  }, Wf = function(t, r) {
    var s = _e;
    try {
      return _e = t, r();
    } finally {
      _e = s;
    }
  }, ol = function(t, r, s) {
    switch (r) {
      case "input":
        if (Xa(t, s), r = s.name, s.type === "radio" && r != null) {
          for (s = t; s.parentNode; ) s = s.parentNode;
          for (s = s.querySelectorAll("input[name=" + JSON.stringify("" + r) + '][type="radio"]'), r = 0; r < s.length; r++) {
            var u = s[r];
            if (u !== t && u.form === t.form) {
              var h = rs(u);
              if (!h) throw Error(o(90));
              hf(u), Xa(u, h);
            }
          }
        }
        break;
      case "textarea":
        wf(t, s);
        break;
      case "select":
        r = s.value, r != null && br(t, !!s.multiple, r, !1);
    }
  }, Ef = Du, Mf = ar;
  var $x = { usingClientEntryPoint: !1, Events: [Ho, Or, rs, bf, Pf, Du] }, oi = { findFiberByHostInstance: qn, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" }, Ux = { bundleType: oi.bundleType, version: oi.version, rendererPackageName: oi.rendererPackageName, rendererConfig: oi.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: D.ReactCurrentDispatcher, findHostInstanceByFiber: function(t) {
    return t = jf(t), t === null ? null : t.stateNode;
  }, findFiberByHostInstance: oi.findFiberByHostInstance || Bx, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var zs = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!zs.isDisabled && zs.supportsFiber) try {
      Li = zs.inject(Ux), Gt = zs;
    } catch {
    }
  }
  return ht.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = $x, ht.createPortal = function(t, r) {
    var s = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!zu(r)) throw Error(o(200));
    return Vx(t, r, null, s);
  }, ht.createRoot = function(t, r) {
    if (!zu(t)) throw Error(o(299));
    var s = !1, u = "", h = ah;
    return r != null && (r.unstable_strictMode === !0 && (s = !0), r.identifierPrefix !== void 0 && (u = r.identifierPrefix), r.onRecoverableError !== void 0 && (h = r.onRecoverableError)), r = Lu(t, 1, !1, null, null, s, !1, u, h), t[sn] = r.current, zo(t.nodeType === 8 ? t.parentNode : t), new Bu(r);
  }, ht.findDOMNode = function(t) {
    if (t == null) return null;
    if (t.nodeType === 1) return t;
    var r = t._reactInternals;
    if (r === void 0)
      throw typeof t.render == "function" ? Error(o(188)) : (t = Object.keys(t).join(","), Error(o(268, t)));
    return t = jf(r), t = t === null ? null : t.stateNode, t;
  }, ht.flushSync = function(t) {
    return ar(t);
  }, ht.hydrate = function(t, r, s) {
    if (!Vs(r)) throw Error(o(200));
    return Bs(null, t, r, !0, s);
  }, ht.hydrateRoot = function(t, r, s) {
    if (!zu(t)) throw Error(o(405));
    var u = s != null && s.hydratedSources || null, h = !1, v = "", _ = ah;
    if (s != null && (s.unstable_strictMode === !0 && (h = !0), s.identifierPrefix !== void 0 && (v = s.identifierPrefix), s.onRecoverableError !== void 0 && (_ = s.onRecoverableError)), r = ih(r, null, t, 1, s ?? null, h, !1, v, _), t[sn] = r.current, zo(t), u) for (t = 0; t < u.length; t++) s = u[t], h = s._getVersion, h = h(s._source), r.mutableSourceEagerHydrationData == null ? r.mutableSourceEagerHydrationData = [s, h] : r.mutableSourceEagerHydrationData.push(
      s,
      h
    );
    return new Ls(r);
  }, ht.render = function(t, r, s) {
    if (!Vs(r)) throw Error(o(200));
    return Bs(null, t, r, !1, s);
  }, ht.unmountComponentAtNode = function(t) {
    if (!Vs(t)) throw Error(o(40));
    return t._reactRootContainer ? (ar(function() {
      Bs(null, null, t, !1, function() {
        t._reactRootContainer = null, t[sn] = null;
      });
    }), !0) : !1;
  }, ht.unstable_batchedUpdates = Du, ht.unstable_renderSubtreeIntoContainer = function(t, r, s, u) {
    if (!Vs(s)) throw Error(o(200));
    if (t == null || t._reactInternals === void 0) throw Error(o(38));
    return Bs(t, r, s, !1, u);
  }, ht.version = "18.3.1-next-f1338f8080-20240426", ht;
}
var gh;
function Cg() {
  if (gh) return Uu.exports;
  gh = 1;
  function e() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(e);
      } catch (n) {
        console.error(n);
      }
  }
  return e(), Uu.exports = e1(), Uu.exports;
}
var vh;
function t1() {
  if (vh) return Us;
  vh = 1;
  var e = Cg();
  return Us.createRoot = e.createRoot, Us.hydrateRoot = e.hydrateRoot, Us;
}
var n1 = t1(), Gu = { exports: {} }, si = {};
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Sh;
function r1() {
  if (Sh) return si;
  Sh = 1;
  var e = gd(), n = Symbol.for("react.element"), o = Symbol.for("react.fragment"), i = Object.prototype.hasOwnProperty, a = e.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, d = { key: !0, ref: !0, __self: !0, __source: !0 };
  function c(p, m, y) {
    var g, l = {}, f = null, S = null;
    y !== void 0 && (f = "" + y), m.key !== void 0 && (f = "" + m.key), m.ref !== void 0 && (S = m.ref);
    for (g in m) i.call(m, g) && !d.hasOwnProperty(g) && (l[g] = m[g]);
    if (p && p.defaultProps) for (g in m = p.defaultProps, m) l[g] === void 0 && (l[g] = m[g]);
    return { $$typeof: n, type: p, key: f, ref: S, props: l, _owner: a.current };
  }
  return si.Fragment = o, si.jsx = c, si.jsxs = c, si;
}
var wh;
function o1() {
  return wh || (wh = 1, Gu.exports = r1()), Gu.exports;
}
var w = o1();
const xh = (e) => Symbol.iterator in e, _h = (e) => (
  // HACK: avoid checking entries type
  "entries" in e
), Th = (e, n) => {
  const o = e instanceof Map ? e : new Map(e.entries()), i = n instanceof Map ? n : new Map(n.entries());
  if (o.size !== i.size)
    return !1;
  for (const [a, d] of o)
    if (!i.has(a) || !Object.is(d, i.get(a)))
      return !1;
  return !0;
}, i1 = (e, n) => {
  const o = e[Symbol.iterator](), i = n[Symbol.iterator]();
  let a = o.next(), d = i.next();
  for (; !a.done && !d.done; ) {
    if (!Object.is(a.value, d.value))
      return !1;
    a = o.next(), d = i.next();
  }
  return !!a.done && !!d.done;
};
function s1(e, n) {
  return Object.is(e, n) ? !0 : typeof e != "object" || e === null || typeof n != "object" || n === null || Object.getPrototypeOf(e) !== Object.getPrototypeOf(n) ? !1 : xh(e) && xh(n) ? _h(e) && _h(n) ? Th(e, n) : i1(e, n) : Th(
    { entries: () => Object.entries(e) },
    { entries: () => Object.entries(n) }
  );
}
function a1(e) {
  const n = yn.useRef(void 0);
  return (o) => {
    const i = e(o);
    return s1(n.current, i) ? n.current : n.current = i;
  };
}
const vd = C.createContext({});
function Sd(e) {
  const n = C.useRef(null);
  return n.current === null && (n.current = e()), n.current;
}
const l1 = typeof window < "u", bg = l1 ? C.useLayoutEffect : C.useEffect, Oa = /* @__PURE__ */ C.createContext(null);
function wd(e, n) {
  e.indexOf(n) === -1 && e.push(n);
}
function Sa(e, n) {
  const o = e.indexOf(n);
  o > -1 && e.splice(o, 1);
}
const rn = (e, n, o) => o > n ? n : o < e ? e : o;
function kh(e, n) {
  return n ? `${e}. For more information and steps for solving, visit https://motion.dev/troubleshooting/${n}` : e;
}
let ki = () => {
}, Ar = () => {
};
var wg;
typeof process < "u" && ((wg = process.env) == null ? void 0 : wg.NODE_ENV) !== "production" && (ki = (e, n, o) => {
  !e && typeof console < "u" && console.warn(kh(n, o));
}, Ar = (e, n, o) => {
  if (!e)
    throw new Error(kh(n, o));
});
const Qn = {}, Pg = (e) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(e), Eg = (e) => typeof e == "object" && e !== null, Mg = (e) => /^0[^.\s]+$/u.test(e);
// @__NO_SIDE_EFFECTS__
function Rg(e) {
  let n;
  return () => (n === void 0 && (n = e()), n);
}
const Nt = /* @__NO_SIDE_EFFECTS__ */ (e) => e, Ai = (...e) => e.reduce((n, o) => (i) => o(n(i))), yi = /* @__NO_SIDE_EFFECTS__ */ (e, n, o) => {
  const i = n - e;
  return i ? (o - e) / i : 1;
};
class xd {
  constructor() {
    this.subscriptions = [];
  }
  add(n) {
    return wd(this.subscriptions, n), () => Sa(this.subscriptions, n);
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
const yt = /* @__NO_SIDE_EFFECTS__ */ (e) => e * 1e3, Dt = /* @__NO_SIDE_EFFECTS__ */ (e) => e / 1e3, Dg = /* @__NO_SIDE_EFFECTS__ */ (e, n) => n ? e * (1e3 / n) : 0, Ng = (e, n, o) => (((1 - 3 * o + 3 * n) * e + (3 * o - 6 * n)) * e + 3 * n) * e, u1 = 1e-7, c1 = 12;
function d1(e, n, o, i, a) {
  let d, c, p = 0;
  do
    c = n + (o - n) / 2, d = Ng(c, i, a) - e, d > 0 ? o = c : n = c;
  while (Math.abs(d) > u1 && ++p < c1);
  return c;
}
// @__NO_SIDE_EFFECTS__
function Ci(e, n, o, i) {
  if (e === n && o === i)
    return Nt;
  const a = (d) => d1(d, 0, 1, e, o);
  return (d) => d === 0 || d === 1 ? d : Ng(a(d), n, i);
}
const jg = /* @__NO_SIDE_EFFECTS__ */ (e) => (n) => n <= 0.5 ? e(2 * n) / 2 : (2 - e(2 * (1 - n))) / 2, Ig = /* @__NO_SIDE_EFFECTS__ */ (e) => (n) => 1 - e(1 - n), Fg = /* @__PURE__ */ Ci(0.33, 1.53, 0.69, 0.99), _d = /* @__PURE__ */ Ig(Fg), Og = /* @__PURE__ */ jg(_d), Lg = (e) => e >= 1 ? 1 : (e *= 2) < 1 ? 0.5 * _d(e) : 0.5 * (2 - Math.pow(2, -10 * (e - 1))), Td = (e) => 1 - Math.sin(Math.acos(e)), Vg = /* @__PURE__ */ Ig(Td), Bg = /* @__PURE__ */ jg(Td), f1 = /* @__PURE__ */ Ci(0.42, 0, 1, 1), p1 = /* @__PURE__ */ Ci(0, 0, 0.58, 1), zg = /* @__PURE__ */ Ci(0.42, 0, 0.58, 1), m1 = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] != "number", $g = /* @__NO_SIDE_EFFECTS__ */ (e) => Array.isArray(e) && typeof e[0] == "number", Ah = {
  linear: Nt,
  easeIn: f1,
  easeInOut: zg,
  easeOut: p1,
  circIn: Td,
  circInOut: Bg,
  circOut: Vg,
  backIn: _d,
  backInOut: Og,
  backOut: Fg,
  anticipate: Lg
}, h1 = (e) => typeof e == "string", Ch = (e) => {
  if (/* @__PURE__ */ $g(e)) {
    Ar(e.length === 4, "Cubic bezier arrays must contain four numerical values.", "cubic-bezier-length");
    const [n, o, i, a] = e;
    return /* @__PURE__ */ Ci(n, o, i, a);
  } else if (h1(e))
    return Ar(Ah[e] !== void 0, `Invalid easing type '${e}'`, "invalid-easing-type"), Ah[e];
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
function y1(e, n) {
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
const g1 = 40;
function Ug(e, n) {
  let o = !1, i = !0;
  const a = {
    delta: 0,
    timestamp: 0,
    isProcessing: !1
  }, d = () => o = !0, c = Hs.reduce((E, D) => (E[D] = y1(d), E), {}), { setup: p, read: m, resolveKeyframes: y, preUpdate: g, update: l, preRender: f, render: S, postRender: x } = c, k = () => {
    const E = Qn.useManualTiming, D = E ? a.timestamp : performance.now();
    o = !1, E || (a.delta = i ? 1e3 / 60 : Math.max(Math.min(D - a.timestamp, g1), 1)), a.timestamp = D, a.isProcessing = !0, p.process(a), m.process(a), y.process(a), g.process(a), l.process(a), f.process(a), S.process(a), x.process(a), a.isProcessing = !1, o && n && (i = !1, e(k));
  }, A = () => {
    o = !0, i = !0, a.isProcessing || e(k);
  };
  return { schedule: Hs.reduce((E, D) => {
    const O = c[D];
    return E[D] = (H, W = !1, G = !1) => (o || A(), O.schedule(H, W, G)), E;
  }, {}), cancel: (E) => {
    for (let D = 0; D < Hs.length; D++)
      c[Hs[D]].cancel(E);
  }, state: a, steps: c };
}
const { schedule: Ae, cancel: Xn, state: Ze, steps: Ku } = /* @__PURE__ */ Ug(typeof requestAnimationFrame < "u" ? requestAnimationFrame : Nt, !0);
let sa;
function v1() {
  sa = void 0;
}
const at = {
  now: () => (sa === void 0 && at.set(Ze.isProcessing || Qn.useManualTiming ? Ze.timestamp : performance.now()), sa),
  set: (e) => {
    sa = e, queueMicrotask(v1);
  }
}, Hg = (e) => (n) => typeof n == "string" && n.startsWith(e), Wg = /* @__PURE__ */ Hg("--"), S1 = /* @__PURE__ */ Hg("var(--"), kd = (e) => S1(e) ? w1.test(e.split("/*")[0].trim()) : !1, w1 = /var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;
function bh(e) {
  return typeof e != "string" ? !1 : e.split("/*")[0].includes("var(--");
}
const mo = {
  test: (e) => typeof e == "number",
  parse: parseFloat,
  transform: (e) => e
}, gi = {
  ...mo,
  transform: (e) => rn(0, 1, e)
}, Ws = {
  ...mo,
  default: 1
}, ci = (e) => Math.round(e * 1e5) / 1e5, Ad = /-?(?:\d+(?:\.\d+)?|\.\d+)/gu;
function x1(e) {
  return e == null;
}
const _1 = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu, Cd = (e, n) => (o) => !!(typeof o == "string" && _1.test(o) && o.startsWith(e) || n && !x1(o) && Object.prototype.hasOwnProperty.call(o, n)), Gg = (e, n, o) => (i) => {
  if (typeof i != "string")
    return i;
  const [a, d, c, p] = i.match(Ad);
  return {
    [e]: parseFloat(a),
    [n]: parseFloat(d),
    [o]: parseFloat(c),
    alpha: p !== void 0 ? parseFloat(p) : 1
  };
}, T1 = (e) => rn(0, 255, e), Yu = {
  ...mo,
  transform: (e) => Math.round(T1(e))
}, gr = {
  test: /* @__PURE__ */ Cd("rgb", "red"),
  parse: /* @__PURE__ */ Gg("red", "green", "blue"),
  transform: ({ red: e, green: n, blue: o, alpha: i = 1 }) => "rgba(" + Yu.transform(e) + ", " + Yu.transform(n) + ", " + Yu.transform(o) + ", " + ci(gi.transform(i)) + ")"
};
function k1(e) {
  let n = "", o = "", i = "", a = "";
  return e.length > 5 ? (n = e.substring(1, 3), o = e.substring(3, 5), i = e.substring(5, 7), a = e.substring(7, 9)) : (n = e.substring(1, 2), o = e.substring(2, 3), i = e.substring(3, 4), a = e.substring(4, 5), n += n, o += o, i += i, a += a), {
    red: parseInt(n, 16),
    green: parseInt(o, 16),
    blue: parseInt(i, 16),
    alpha: a ? parseInt(a, 16) / 255 : 1
  };
}
const xc = {
  test: /* @__PURE__ */ Cd("#"),
  parse: k1,
  transform: gr.transform
}, bi = /* @__NO_SIDE_EFFECTS__ */ (e) => ({
  test: (n) => typeof n == "string" && n.endsWith(e) && n.split(" ").length === 1,
  parse: parseFloat,
  transform: (n) => `${n}${e}`
}), mn = /* @__PURE__ */ bi("deg"), nn = /* @__PURE__ */ bi("%"), ne = /* @__PURE__ */ bi("px"), A1 = /* @__PURE__ */ bi("vh"), C1 = /* @__PURE__ */ bi("vw"), Ph = {
  ...nn,
  parse: (e) => nn.parse(e) / 100,
  transform: (e) => nn.transform(e * 100)
}, oo = {
  test: /* @__PURE__ */ Cd("hsl", "hue"),
  parse: /* @__PURE__ */ Gg("hue", "saturation", "lightness"),
  transform: ({ hue: e, saturation: n, lightness: o, alpha: i = 1 }) => "hsla(" + Math.round(e) + ", " + nn.transform(ci(n)) + ", " + nn.transform(ci(o)) + ", " + ci(gi.transform(i)) + ")"
}, Be = {
  test: (e) => gr.test(e) || xc.test(e) || oo.test(e),
  parse: (e) => gr.test(e) ? gr.parse(e) : oo.test(e) ? oo.parse(e) : xc.parse(e),
  transform: (e) => typeof e == "string" ? e : e.hasOwnProperty("red") ? gr.transform(e) : oo.transform(e),
  getAnimatableNone: (e) => {
    const n = Be.parse(e);
    return n.alpha = 0, Be.transform(n);
  }
}, b1 = /(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;
function P1(e) {
  var n, o;
  return isNaN(e) && typeof e == "string" && (((n = e.match(Ad)) == null ? void 0 : n.length) || 0) + (((o = e.match(b1)) == null ? void 0 : o.length) || 0) > 0;
}
const Kg = "number", Yg = "color", E1 = "var", M1 = "var(", Eh = "${}", R1 = /var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;
function co(e) {
  const n = e.toString(), o = [], i = {
    color: [],
    number: [],
    var: []
  }, a = [];
  let d = 0;
  const p = n.replace(R1, (m) => (Be.test(m) ? (i.color.push(d), a.push(Yg), o.push(Be.parse(m))) : m.startsWith(M1) ? (i.var.push(d), a.push(E1), o.push(m)) : (i.number.push(d), a.push(Kg), o.push(parseFloat(m))), ++d, Eh)).split(Eh);
  return { values: o, split: p, indexes: i, types: a };
}
function D1(e) {
  return co(e).values;
}
function Qg({ split: e, types: n }) {
  const o = e.length;
  return (i) => {
    let a = "";
    for (let d = 0; d < o; d++)
      if (a += e[d], i[d] !== void 0) {
        const c = n[d];
        c === Kg ? a += ci(i[d]) : c === Yg ? a += Be.transform(i[d]) : a += i[d];
      }
    return a;
  };
}
function N1(e) {
  return Qg(co(e));
}
const j1 = (e) => typeof e == "number" ? 0 : Be.test(e) ? Be.getAnimatableNone(e) : e, I1 = (e, n) => typeof e == "number" ? n != null && n.trim().endsWith("/") ? e : 0 : j1(e);
function F1(e) {
  const n = co(e);
  return Qg(n)(n.values.map((i, a) => I1(i, n.split[a])));
}
const Ht = {
  test: P1,
  parse: D1,
  createTransformer: N1,
  getAnimatableNone: F1
};
function Qu(e, n, o) {
  return o < 0 && (o += 1), o > 1 && (o -= 1), o < 1 / 6 ? e + (n - e) * 6 * o : o < 1 / 2 ? n : o < 2 / 3 ? e + (n - e) * (2 / 3 - o) * 6 : e;
}
function O1({ hue: e, saturation: n, lightness: o, alpha: i }) {
  e /= 360, n /= 100, o /= 100;
  let a = 0, d = 0, c = 0;
  if (!n)
    a = d = c = o;
  else {
    const p = o < 0.5 ? o * (1 + n) : o + n - o * n, m = 2 * o - p;
    a = Qu(m, p, e + 1 / 3), d = Qu(m, p, e), c = Qu(m, p, e - 1 / 3);
  }
  return {
    red: Math.round(a * 255),
    green: Math.round(d * 255),
    blue: Math.round(c * 255),
    alpha: i
  };
}
function wa(e, n) {
  return (o) => o > 0 ? n : e;
}
const ke = (e, n, o) => e + (n - e) * o, Xu = (e, n, o) => {
  const i = e * e, a = o * (n * n - i) + i;
  return a < 0 ? 0 : Math.sqrt(a);
}, L1 = [xc, gr, oo], V1 = (e) => L1.find((n) => n.test(e));
function Mh(e) {
  const n = V1(e);
  if (ki(!!n, `'${e}' is not an animatable color. Use the equivalent color code instead.`, "color-not-animatable"), !n)
    return !1;
  let o = n.parse(e);
  return n === oo && (o = O1(o)), o;
}
const Rh = (e, n) => {
  const o = Mh(e), i = Mh(n);
  if (!o || !i)
    return wa(e, n);
  const a = { ...o };
  return (d) => (a.red = Xu(o.red, i.red, d), a.green = Xu(o.green, i.green, d), a.blue = Xu(o.blue, i.blue, d), a.alpha = ke(o.alpha, i.alpha, d), gr.transform(a));
}, _c = /* @__PURE__ */ new Set(["none", "hidden"]);
function B1(e, n) {
  return _c.has(e) ? (o) => o <= 0 ? e : n : (o) => o >= 1 ? n : e;
}
function z1(e, n) {
  return (o) => ke(e, n, o);
}
function bd(e) {
  return typeof e == "number" ? z1 : typeof e == "string" ? kd(e) ? wa : Be.test(e) ? Rh : H1 : Array.isArray(e) ? Xg : typeof e == "object" ? Be.test(e) ? Rh : $1 : wa;
}
function Xg(e, n) {
  const o = [...e], i = o.length, a = e.map((d, c) => bd(d)(d, n[c]));
  return (d) => {
    for (let c = 0; c < i; c++)
      o[c] = a[c](d);
    return o;
  };
}
function $1(e, n) {
  const o = { ...e, ...n }, i = {};
  for (const a in o)
    e[a] !== void 0 && n[a] !== void 0 && (i[a] = bd(e[a])(e[a], n[a]));
  return (a) => {
    for (const d in i)
      o[d] = i[d](a);
    return o;
  };
}
function U1(e, n) {
  const o = [], i = { color: 0, var: 0, number: 0 };
  for (let a = 0; a < n.values.length; a++) {
    const d = n.types[a], c = e.indexes[d][i[d]], p = e.values[c] ?? 0;
    o[a] = p, i[d]++;
  }
  return o;
}
const H1 = (e, n) => {
  const o = Ht.createTransformer(n), i = co(e), a = co(n);
  return i.indexes.var.length === a.indexes.var.length && i.indexes.color.length === a.indexes.color.length && i.indexes.number.length >= a.indexes.number.length ? _c.has(e) && !a.values.length || _c.has(n) && !i.values.length ? B1(e, n) : Ai(Xg(U1(i, a), a.values), o) : (ki(!0, `Complex values '${e}' and '${n}' too different to mix. Ensure all colors are of the same type, and that each contains the same quantity of number and color values. Falling back to instant transition.`, "complex-values-different"), wa(e, n));
};
function Zg(e, n, o) {
  return typeof e == "number" && typeof n == "number" && typeof o == "number" ? ke(e, n, o) : bd(e)(e, n);
}
const W1 = (e) => {
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
}, Jg = (e, n, o = 10) => {
  let i = "";
  const a = Math.max(Math.round(n / o), 2);
  for (let d = 0; d < a; d++)
    i += Math.round(e(d / (a - 1)) * 1e4) / 1e4 + ", ";
  return `linear(${i.substring(0, i.length - 2)})`;
}, xa = 2e4;
function Pd(e) {
  let n = 0;
  const o = 50;
  let i = e.next(n);
  for (; !i.done && n < xa; )
    n += o, i = e.next(n);
  return n >= xa ? 1 / 0 : n;
}
function G1(e, n = 100, o) {
  const i = o({ ...e, keyframes: [0, n] }), a = Math.min(Pd(i), xa);
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
function Tc(e, n) {
  return e * Math.sqrt(1 - n * n);
}
const K1 = 12;
function Y1(e, n, o) {
  let i = o;
  for (let a = 1; a < K1; a++)
    i = i - e(i) / n(i);
  return i;
}
const Zu = 1e-3;
function Q1({ duration: e = Ie.duration, bounce: n = Ie.bounce, velocity: o = Ie.velocity, mass: i = Ie.mass }) {
  let a, d;
  ki(e <= /* @__PURE__ */ yt(Ie.maxDuration), "Spring duration must be 10 seconds or less", "spring-duration-limit");
  let c = 1 - n;
  c = rn(Ie.minDamping, Ie.maxDamping, c), e = rn(Ie.minDuration, Ie.maxDuration, /* @__PURE__ */ Dt(e)), c < 1 ? (a = (y) => {
    const g = y * c, l = g * e, f = g - o, S = Tc(y, c), x = Math.exp(-l);
    return Zu - f / S * x;
  }, d = (y) => {
    const l = y * c * e, f = l * o + o, S = Math.pow(c, 2) * Math.pow(y, 2) * e, x = Math.exp(-l), k = Tc(Math.pow(y, 2), c);
    return (-a(y) + Zu > 0 ? -1 : 1) * ((f - S) * x) / k;
  }) : (a = (y) => {
    const g = Math.exp(-y * e), l = (y - o) * e + 1;
    return -Zu + g * l;
  }, d = (y) => {
    const g = Math.exp(-y * e), l = (o - y) * (e * e);
    return g * l;
  });
  const p = 5 / e, m = Y1(a, d, p);
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
const X1 = ["duration", "bounce"], Z1 = ["stiffness", "damping", "mass"];
function Dh(e, n) {
  return n.some((o) => e[o] !== void 0);
}
function J1(e) {
  let n = {
    velocity: Ie.velocity,
    stiffness: Ie.stiffness,
    damping: Ie.damping,
    mass: Ie.mass,
    isResolvedFromDuration: !1,
    ...e
  };
  if (!Dh(e, Z1) && Dh(e, X1))
    if (n.velocity = 0, e.visualDuration) {
      const o = e.visualDuration, i = 2 * Math.PI / (o * 1.2), a = i * i, d = 2 * rn(0.05, 1, 1 - (e.bounce || 0)) * Math.sqrt(a);
      n = {
        ...n,
        mass: Ie.mass,
        stiffness: a,
        damping: d
      };
    } else {
      const o = Q1({ ...e, velocity: 0 });
      n = {
        ...n,
        ...o,
        mass: Ie.mass
      }, n.isResolvedFromDuration = !0;
    }
  return n;
}
function _a(e = Ie.visualDuration, n = Ie.bounce) {
  const o = typeof e != "object" ? {
    visualDuration: e,
    keyframes: [0, 1],
    bounce: n
  } : e;
  let { restSpeed: i, restDelta: a } = o;
  const d = o.keyframes[0], c = o.keyframes[o.keyframes.length - 1], p = { done: !1, value: d }, { stiffness: m, damping: y, mass: g, duration: l, velocity: f, isResolvedFromDuration: S } = J1({
    ...o,
    velocity: -/* @__PURE__ */ Dt(o.velocity || 0)
  }), x = f || 0, k = y / (2 * Math.sqrt(m * g)), A = c - d, T = /* @__PURE__ */ Dt(Math.sqrt(m / g)), b = Math.abs(A) < 5;
  i || (i = b ? Ie.restSpeed.granular : Ie.restSpeed.default), a || (a = b ? Ie.restDelta.granular : Ie.restDelta.default);
  let E, D, O, H, W, G;
  if (k < 1)
    O = Tc(T, k), H = (x + k * T * A) / O, E = (X) => {
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
      const X = Math.min(Pd(K), xa), se = Jg((Z) => K.next(X * Z).value, X, 30);
      return X + "ms " + se;
    },
    toTransition: () => {
    }
  };
  return K;
}
_a.applyToOptions = (e) => {
  const n = G1(e, 100, _a);
  return e.ease = n.ease, e.duration = /* @__PURE__ */ yt(n.duration), e.type = "keyframes", e;
};
const q1 = 5;
function qg(e, n, o) {
  const i = Math.max(n - q1, 0);
  return /* @__PURE__ */ Dg(o - e(i), n - i);
}
function kc({ keyframes: e, velocity: n = 0, power: o = 0.8, timeConstant: i = 325, bounceDamping: a = 10, bounceStiffness: d = 500, modifyTarget: c, min: p, max: m, restDelta: y = 0.5, restSpeed: g }) {
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
    S(f.value) && (O = G, H = _a({
      keyframes: [f.value, x(f.value)],
      velocity: qg(E, G, f.value),
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
function e_(e, n, o) {
  const i = [], a = o || Qn.mix || Zg, d = e.length - 1;
  for (let c = 0; c < d; c++) {
    let p = a(e[c], e[c + 1]);
    if (n) {
      const m = Array.isArray(n) ? n[c] || Nt : n;
      p = Ai(m, p);
    }
    i.push(p);
  }
  return i;
}
function t_(e, n, { clamp: o = !0, ease: i, mixer: a } = {}) {
  const d = e.length;
  if (Ar(d === n.length, "Both input and output ranges must be the same length", "range-length"), d === 1)
    return () => n[0];
  if (d === 2 && n[0] === n[1])
    return () => n[1];
  const c = e[0] === e[1];
  e[0] > e[d - 1] && (e = [...e].reverse(), n = [...n].reverse());
  const p = e_(n, i, a), m = p.length, y = (g) => {
    if (c && g < e[0])
      return n[0];
    let l = 0;
    if (m > 1)
      for (; l < e.length - 2 && !(g < e[l + 1]); l++)
        ;
    const f = /* @__PURE__ */ yi(e[l], e[l + 1], g);
    return p[l](f);
  };
  return o ? (g) => y(rn(e[0], e[d - 1], g)) : y;
}
function n_(e, n) {
  const o = e[e.length - 1];
  for (let i = 1; i <= n; i++) {
    const a = /* @__PURE__ */ yi(0, n, i);
    e.push(ke(o, 1, a));
  }
}
function r_(e) {
  const n = [0];
  return n_(n, e.length - 1), n;
}
function o_(e, n) {
  return e.map((o) => o * n);
}
function i_(e, n) {
  return e.map(() => n || zg).splice(0, e.length - 1);
}
function di({ duration: e = 300, keyframes: n, times: o, ease: i = "easeInOut" }) {
  const a = /* @__PURE__ */ m1(i) ? i.map(Ch) : Ch(i), d = {
    done: !1,
    value: n[0]
  }, c = o_(
    // Only use the provided offsets if they're the correct length
    // TODO Maybe we should warn here if there's a length mismatch
    o && o.length === n.length ? o : r_(n),
    e
  ), p = t_(c, n, {
    ease: Array.isArray(a) ? a : i_(n, a)
  });
  return {
    calculatedDuration: e,
    next: (m) => (d.value = p(m), d.done = m >= e, d)
  };
}
const s_ = (e) => e !== null;
function La(e, { repeat: n, repeatType: o = "loop" }, i, a = 1) {
  const d = e.filter(s_), p = a < 0 || n && o !== "loop" && n % 2 === 1 ? 0 : d.length - 1;
  return !p || i === void 0 ? d[p] : i;
}
const a_ = {
  decay: kc,
  inertia: kc,
  tween: di,
  keyframes: di,
  spring: _a
};
function ev(e) {
  typeof e.type == "string" && (e.type = a_[e.type]);
}
class Ed {
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
const l_ = (e) => e / 100;
class Ta extends Ed {
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
    ev(n);
    const { type: o = di, repeat: i = 0, repeatDelay: a = 0, repeatType: d, velocity: c = 0 } = n;
    let { keyframes: p } = n;
    const m = o || di;
    m !== di && typeof p[0] != "number" && (this.mixKeyframes = Ai(l_, Zg(p[0], p[1])), p = [0, 100]);
    const y = m({ ...n, keyframes: p });
    d === "mirror" && (this.mirroredGenerator = m({
      ...n,
      keyframes: [...p].reverse(),
      velocity: -c
    })), y.calculatedDuration === null && (y.calculatedDuration = Pd(y));
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
      !X && G >= 1 && (X = 1), X === 1 && K--, K = Math.min(K, l + 1), !!(K % 2) && (f === "reverse" ? (X = 1 - X, S && (X -= S / p)) : f === "mirror" && (D = c)), E = rn(0, 1, X) * p;
    }
    let O;
    b ? (this.delayState.value = g[0], O = this.delayState) : O = D.next(E), d && !b && (O.value = d(O.value));
    let { done: H } = O;
    !b && m !== null && (H = this.playbackSpeed >= 0 ? this.currentTime >= a : this.currentTime <= 0);
    const W = this.holdTime === null && (this.state === "finished" || this.state === "running" && H);
    return W && x !== kc && (O.value = La(g, this.options, A, this.speed)), k && k(O.value), W && this.finish(), O;
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
    return qg((i) => this.generator.next(i).value, n, o);
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
    const { driver: n = W1, startTime: o } = this.options;
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
function u_(e) {
  for (let n = 1; n < e.length; n++)
    e[n] ?? (e[n] = e[n - 1]);
}
const vr = (e) => e * 180 / Math.PI, Ac = (e) => {
  const n = vr(Math.atan2(e[1], e[0]));
  return Cc(n);
}, c_ = {
  x: 4,
  y: 5,
  translateX: 4,
  translateY: 5,
  scaleX: 0,
  scaleY: 3,
  scale: (e) => (Math.abs(e[0]) + Math.abs(e[3])) / 2,
  rotate: Ac,
  rotateZ: Ac,
  skewX: (e) => vr(Math.atan(e[1])),
  skewY: (e) => vr(Math.atan(e[2])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[2])) / 2
}, Cc = (e) => (e = e % 360, e < 0 && (e += 360), e), Nh = Ac, jh = (e) => Math.sqrt(e[0] * e[0] + e[1] * e[1]), Ih = (e) => Math.sqrt(e[4] * e[4] + e[5] * e[5]), d_ = {
  x: 12,
  y: 13,
  z: 14,
  translateX: 12,
  translateY: 13,
  translateZ: 14,
  scaleX: jh,
  scaleY: Ih,
  scale: (e) => (jh(e) + Ih(e)) / 2,
  rotateX: (e) => Cc(vr(Math.atan2(e[6], e[5]))),
  rotateY: (e) => Cc(vr(Math.atan2(-e[2], e[0]))),
  rotateZ: Nh,
  rotate: Nh,
  skewX: (e) => vr(Math.atan(e[4])),
  skewY: (e) => vr(Math.atan(e[1])),
  skew: (e) => (Math.abs(e[1]) + Math.abs(e[4])) / 2
};
function bc(e) {
  return e.includes("scale") ? 1 : 0;
}
function Pc(e, n) {
  if (!e || e === "none")
    return bc(n);
  const o = e.match(/^matrix3d\(([-\d.e\s,]+)\)$/u);
  let i, a;
  if (o)
    i = d_, a = o;
  else {
    const p = e.match(/^matrix\(([-\d.e\s,]+)\)$/u);
    i = c_, a = p;
  }
  if (!a)
    return bc(n);
  const d = i[n], c = a[1].split(",").map(p_);
  return typeof d == "function" ? d(c) : c[d];
}
const f_ = (e, n) => {
  const { transform: o = "none" } = getComputedStyle(e);
  return Pc(o, n);
};
function p_(e) {
  return parseFloat(e.trim());
}
const ho = [
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
], yo = /* @__PURE__ */ new Set([...ho, "pathRotation"]), Fh = (e) => e === mo || e === ne, m_ = /* @__PURE__ */ new Set(["x", "y", "z"]), h_ = ho.filter((e) => !m_.has(e));
function y_(e) {
  const n = [];
  return h_.forEach((o) => {
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
  x: (e, { transform: n }) => Pc(n, "x"),
  y: (e, { transform: n }) => Pc(n, "y")
};
Gn.translateX = Gn.x;
Gn.translateY = Gn.y;
const wr = /* @__PURE__ */ new Set();
let Ec = !1, Mc = !1, Rc = !1;
function tv() {
  if (Mc) {
    const e = Array.from(wr).filter((i) => i.needsMeasurement), n = new Set(e.map((i) => i.element)), o = /* @__PURE__ */ new Map();
    n.forEach((i) => {
      const a = y_(i);
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
  Mc = !1, Ec = !1, wr.forEach((e) => e.complete(Rc)), wr.clear();
}
function nv() {
  wr.forEach((e) => {
    e.readKeyframes(), e.needsMeasurement && (Mc = !0);
  });
}
function g_() {
  Rc = !0, nv(), tv(), Rc = !1;
}
class Md {
  constructor(n, o, i, a, d, c = !1) {
    this.state = "pending", this.isAsync = !1, this.needsMeasurement = !1, this.unresolvedKeyframes = [...n], this.onComplete = o, this.name = i, this.motionValue = a, this.element = d, this.isAsync = c;
  }
  scheduleResolve() {
    this.state = "scheduled", this.isAsync ? (wr.add(this), Ec || (Ec = !0, Ae.read(nv), Ae.resolveKeyframes(tv))) : (this.readKeyframes(), this.complete());
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
    u_(n);
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
    this.state = "complete", this.onComplete(this.unresolvedKeyframes, this.finalKeyframe, n), wr.delete(this);
  }
  cancel() {
    this.state === "scheduled" && (wr.delete(this), this.state = "pending");
  }
  resume() {
    this.state === "pending" && this.scheduleResolve();
  }
}
const v_ = (e) => e.startsWith("--");
function rv(e, n, o) {
  v_(n) ? e.style.setProperty(n, o) : e.style[n] = o;
}
const S_ = {};
function ov(e, n) {
  const o = /* @__PURE__ */ Rg(e);
  return () => S_[n] ?? o();
}
const w_ = /* @__PURE__ */ ov(() => window.ScrollTimeline !== void 0, "scrollTimeline"), iv = /* @__PURE__ */ ov(() => {
  try {
    document.createElement("div").animate({ opacity: 0 }, { easing: "linear(0, 1)" });
  } catch {
    return !1;
  }
  return !0;
}, "linearEasing"), li = ([e, n, o, i]) => `cubic-bezier(${e}, ${n}, ${o}, ${i})`, Oh = {
  linear: "linear",
  ease: "ease",
  easeIn: "ease-in",
  easeOut: "ease-out",
  easeInOut: "ease-in-out",
  circIn: /* @__PURE__ */ li([0, 0.65, 0.55, 1]),
  circOut: /* @__PURE__ */ li([0.55, 0, 1, 0.45]),
  backIn: /* @__PURE__ */ li([0.31, 0.01, 0.66, -0.59]),
  backOut: /* @__PURE__ */ li([0.33, 1.53, 0.69, 0.99])
};
function sv(e, n) {
  if (e)
    return typeof e == "function" ? iv() ? Jg(e, n) : "ease-out" : /* @__PURE__ */ $g(e) ? li(e) : Array.isArray(e) ? e.map((o) => sv(o, n) || Oh.easeOut) : Oh[e];
}
function x_(e, n, o, { delay: i = 0, duration: a = 300, repeat: d = 0, repeatType: c = "loop", ease: p = "easeOut", times: m } = {}, y = void 0) {
  const g = {
    [n]: o
  };
  m && (g.offset = m);
  const l = sv(p, a);
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
function av(e) {
  return typeof e == "function" && "applyToOptions" in e;
}
function __({ type: e, ...n }) {
  return av(e) && iv() ? e.applyToOptions(n) : (n.duration ?? (n.duration = 300), n.ease ?? (n.ease = "easeOut"), n);
}
class lv extends Ed {
  constructor(n) {
    if (super(), this.finishedTime = null, this.isStopped = !1, this.manualStartTime = null, !n)
      return;
    const { element: o, name: i, keyframes: a, pseudoElement: d, allowFlatten: c = !1, finalKeyframe: p, onComplete: m } = n;
    this.isPseudoElement = !!d, this.allowFlatten = c, this.options = n, Ar(typeof n.type != "string", `Mini animate() doesn't support "type" as a string.`, "mini-spring");
    const y = __(n);
    this.animation = x_(o, i, a, y, d), y.autoplay === !1 && this.animation.pause(), this.animation.onfinish = () => {
      if (this.finishedTime = this.time, !d) {
        const g = La(a, this.options, p, this.speed);
        this.updateMotionValue && this.updateMotionValue(g), rv(o, i, g), this.animation.cancel();
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
    return this.allowFlatten && ((d = this.animation.effect) == null || d.updateTiming({ easing: "linear" })), this.animation.onfinish = null, n && w_() ? (this.animation.timeline = n, o && (this.animation.rangeStart = o), i && (this.animation.rangeEnd = i), Nt) : a(this);
  }
}
const uv = {
  anticipate: Lg,
  backInOut: Og,
  circInOut: Bg
};
function T_(e) {
  return e in uv;
}
function k_(e) {
  typeof e.ease == "string" && T_(e.ease) && (e.ease = uv[e.ease]);
}
const Ju = 10;
class A_ extends lv {
  constructor(n) {
    k_(n), ev(n), super(n), n.startTime !== void 0 && n.autoplay !== !1 && (this.startTime = n.startTime), this.options = n;
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
    const p = new Ta({
      ...c,
      autoplay: !1
    }), m = Math.max(Ju, at.now() - this.startTime), y = rn(0, Ju, m - Ju), g = p.sample(m).value, { name: l } = this.options;
    d && l && rv(d, l, g), o.setWithVelocity(p.sample(Math.max(0, m - y)).value, g, y), p.stop();
  }
}
const Lh = (e, n) => n === "zIndex" ? !1 : !!(typeof e == "number" || Array.isArray(e) || typeof e == "string" && // It's animatable if we have a string
(Ht.test(e) || e === "0") && // And it contains numbers and/or colors
!e.startsWith("url("));
function C_(e) {
  const n = e[0];
  if (e.length === 1)
    return !0;
  for (let o = 0; o < e.length; o++)
    if (e[o] !== n)
      return !0;
}
function b_(e, n, o, i) {
  const a = e[0];
  if (a === null)
    return !1;
  if (n === "display" || n === "visibility")
    return !0;
  const d = e[e.length - 1], c = Lh(a, n), p = Lh(d, n);
  return ki(c === p, `You are trying to animate ${n} from "${a}" to "${d}". "${c ? d : a}" is not an animatable value.`, "value-not-animatable"), !c || !p ? !1 : C_(e) || (o === "spring" || av(o)) && i;
}
function Dc(e) {
  e.duration = 0, e.type = "keyframes";
}
const cv = /* @__PURE__ */ new Set([
  "opacity",
  "clipPath",
  "filter",
  "transform"
  // TODO: Can be accelerated but currently disabled until https://issues.chromium.org/issues/41491098 is resolved
  // or until we implement support for linear() easing.
  // "background-color"
]), P_ = /^(?:oklch|oklab|lab|lch|color|color-mix|light-dark)\(/;
function E_(e) {
  for (let n = 0; n < e.length; n++)
    if (typeof e[n] == "string" && P_.test(e[n]))
      return !0;
  return !1;
}
const M_ = /* @__PURE__ */ new Set([
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
]), R_ = /* @__PURE__ */ Rg(() => Object.hasOwnProperty.call(Element.prototype, "animate"));
function D_(e) {
  var l;
  const { motionValue: n, name: o, repeatDelay: i, repeatType: a, damping: d, type: c, keyframes: p } = e;
  if (!(((l = n == null ? void 0 : n.owner) == null ? void 0 : l.current) instanceof HTMLElement))
    return !1;
  const { onUpdate: y, transformTemplate: g } = n.owner.getProps();
  return R_() && o && /**
   * Force WAAPI for color properties with browser-only color formats
   * (oklch, oklab, lab, lch, etc.) that the JS animation path can't parse.
   */
  (cv.has(o) || M_.has(o) && E_(p)) && (o !== "transform" || !g) && /**
   * If we're outputting values to onUpdate then we can't use WAAPI as there's
   * no way to read the value from WAAPI every frame.
   */
  !y && !i && a !== "mirror" && d !== 0 && c !== "inertia";
}
const N_ = 40;
class j_ extends Ed {
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
    }, S = (g == null ? void 0 : g.KeyframeResolver) || Md;
    this.keyframeResolver = new S(p, (k, A, T) => this.onKeyframesResolved(k, A, f, !T), m, y, g), (x = this.keyframeResolver) == null || x.scheduleResolve();
  }
  onKeyframesResolved(n, o, i, a) {
    var T, b;
    this.keyframeResolver = void 0;
    const { name: d, type: c, velocity: p, delay: m, isHandoff: y, onUpdate: g } = i;
    this.resolvedAt = at.now();
    let l = !0;
    b_(n, d, c, p) || (l = !1, (Qn.instantAnimations || !m) && (g == null || g(La(n, i, o))), n[0] = n[n.length - 1], Dc(i), i.repeat = 0);
    const S = {
      startTime: a ? this.resolvedAt ? this.resolvedAt - this.createdAt > N_ ? this.resolvedAt : this.createdAt : this.createdAt : void 0,
      finalKeyframe: o,
      ...i,
      keyframes: n
    }, x = l && !y && D_(S), k = (b = (T = S.motionValue) == null ? void 0 : T.owner) == null ? void 0 : b.current;
    let A;
    if (x)
      try {
        A = new A_({
          ...S,
          element: k
        });
      } catch {
        A = new Ta(S);
      }
    else
      A = new Ta(S);
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
    return this._animation || ((n = this.keyframeResolver) == null || n.resume(), g_()), this._animation;
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
function dv(e, n, o, i = 0, a = 1) {
  const d = Array.from(e).sort((y, g) => y.sortNodePosition(g)).indexOf(n), c = e.size, p = (c - 1) * i;
  return typeof o == "function" ? o(d, c) : a === 1 ? d * i : p - d * i;
}
const Vh = 30, I_ = (e) => !isNaN(parseFloat(e));
class F_ {
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
    this.current = n, this.updatedAt = at.now(), this.canTrackVelocity === null && n !== void 0 && (this.canTrackVelocity = I_(this.current));
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
    this.events[n] || (this.events[n] = new xd());
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
    if (!this.canTrackVelocity || this.prevFrameValue === void 0 || n - this.updatedAt > Vh)
      return 0;
    const o = Math.min(this.updatedAt - this.prevUpdatedAt, Vh);
    return /* @__PURE__ */ Dg(parseFloat(this.current) - parseFloat(this.prevFrameValue), o);
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
function fo(e, n) {
  return new F_(e, n);
}
function fv(e, n) {
  if (e != null && e.inherit && n) {
    const { inherit: o, ...i } = e;
    return { ...n, ...i };
  }
  return e;
}
function Rd(e, n) {
  const o = (e == null ? void 0 : e[n]) ?? (e == null ? void 0 : e.default) ?? e;
  return o !== e ? fv(o, e) : o;
}
const O_ = {
  type: "spring",
  stiffness: 500,
  damping: 25,
  restSpeed: 10
}, L_ = (e) => ({
  type: "spring",
  stiffness: 550,
  damping: e === 0 ? 2 * Math.sqrt(550) : 30,
  restSpeed: 10
}), V_ = {
  type: "keyframes",
  duration: 0.8
}, B_ = {
  type: "keyframes",
  ease: [0.25, 0.1, 0.35, 1],
  duration: 0.3
}, z_ = (e, { keyframes: n }) => n.length > 2 ? V_ : yo.has(e) ? e.startsWith("scale") ? L_(n[1]) : O_ : B_, $_ = /* @__PURE__ */ new Set([
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
function U_(e) {
  for (const n in e)
    if (!$_.has(n))
      return !0;
  return !1;
}
const Dd = (e, n, o, i = {}, a, d) => (c) => {
  const p = Rd(i, e) || {}, m = p.delay || i.delay || 0;
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
  U_(p) || Object.assign(g, z_(e, g)), g.duration && (g.duration = /* @__PURE__ */ yt(g.duration)), g.repeatDelay && (g.repeatDelay = /* @__PURE__ */ yt(g.repeatDelay)), g.from !== void 0 && (g.keyframes[0] = g.from);
  let l = !1;
  if ((g.type === !1 || g.duration === 0 && !g.repeatDelay) && (Dc(g), g.delay === 0 && (l = !0)), (Qn.instantAnimations || Qn.skipAnimations || a != null && a.shouldSkipAnimations || p.skipAnimations) && (l = !0, Dc(g), g.delay = 0), g.allowFlatten = !p.type && !p.ease, l && !d && n.get() !== void 0) {
    const f = La(g.keyframes, p);
    if (f !== void 0) {
      Ae.update(() => {
        g.onUpdate(f), g.onComplete();
      });
      return;
    }
  }
  return p.isSync ? new Ta(g) : new j_(g);
}, H_ = (
  // eslint-disable-next-line redos-detector/no-unsafe-regex -- false positive, as it can match a lot of words
  /^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u
);
function W_(e) {
  const n = H_.exec(e);
  if (!n)
    return [,];
  const [, o, i, a] = n;
  return [`--${o ?? i}`, a];
}
const G_ = 4;
function pv(e, n, o = 1) {
  Ar(o <= G_, `Max CSS variable fallback depth detected in property "${e}". This may indicate a circular fallback dependency.`, "max-css-var-depth");
  const [i, a] = W_(e);
  if (!i)
    return;
  const d = window.getComputedStyle(n).getPropertyValue(i);
  if (d) {
    const c = d.trim();
    return Pg(c) ? parseFloat(c) : c;
  }
  return kd(a) ? pv(a, n, o + 1) : a;
}
function Bh(e) {
  const n = [{}, {}];
  return e == null || e.values.forEach((o, i) => {
    n[0][i] = o.get(), n[1][i] = o.getVelocity();
  }), n;
}
function Nd(e, n, o, i) {
  if (typeof n == "function") {
    const [a, d] = Bh(i);
    n = n(o !== void 0 ? o : e.custom, a, d);
  }
  if (typeof n == "string" && (n = e.variants && e.variants[n]), typeof n == "function") {
    const [a, d] = Bh(i);
    n = n(o !== void 0 ? o : e.custom, a, d);
  }
  return n;
}
function xr(e, n, o) {
  const i = e.getProps();
  return Nd(i, n, o !== void 0 ? o : i.custom, e);
}
const mv = /* @__PURE__ */ new Set([
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
  ...ho
]), Nc = (e) => Array.isArray(e);
function K_(e, n, o) {
  e.hasValue(n) ? e.getValue(n).set(o) : e.addValue(n, fo(o));
}
function Y_(e) {
  return Nc(e) ? e[e.length - 1] || 0 : e;
}
function Q_(e, n) {
  const o = xr(e, n);
  let { transitionEnd: i = {}, transition: a = {}, ...d } = o || {};
  d = { ...d, ...i };
  for (const c in d) {
    const p = Y_(d[c]);
    K_(e, c, p);
  }
}
const Je = (e) => !!(e && e.getVelocity);
function X_(e) {
  return !!(Je(e) && e.add);
}
function jc(e, n) {
  const o = e.getValue("willChange");
  if (X_(o))
    return o.add(n);
  if (!o && Qn.WillChange) {
    const i = new Qn.WillChange("auto");
    e.addValue("willChange", i), i.add(n);
  }
}
function jd(e) {
  return e.replace(/([A-Z])/g, (n) => `-${n.toLowerCase()}`);
}
const Z_ = "framerAppearId", hv = "data-" + jd(Z_);
function yv(e) {
  return e.props[hv];
}
function J_({ protectedKeys: e, needsAnimating: n }, o) {
  const i = e.hasOwnProperty(o) && n[o] !== !0;
  return n[o] = !1, i;
}
function gv(e, n, { delay: o = 0, transitionOverride: i, type: a } = {}) {
  let { transition: d, transitionEnd: c, ...p } = n;
  const m = e.getDefaultTransition();
  d = d ? fv(d, m) : m;
  const y = d == null ? void 0 : d.reduceMotion, g = d == null ? void 0 : d.skipAnimations;
  i && (d = i);
  const l = [], f = a && e.animationState && e.animationState.getState()[a], S = d == null ? void 0 : d.path;
  S && S.animateVisualElement(e, p, d, o, l);
  for (const x in p) {
    const k = e.getValue(x, e.latestValues[x] ?? null), A = p[x];
    if (A === void 0 || f && J_(f, x))
      continue;
    const T = {
      delay: o,
      ...Rd(d || {}, x)
    };
    g && (T.skipAnimations = !0);
    const b = k.get();
    if (b !== void 0 && !k.isAnimating() && !Array.isArray(A) && A === b && !T.velocity) {
      Ae.update(() => k.set(A));
      continue;
    }
    let E = !1;
    if (window.MotionHandoffAnimation) {
      const H = yv(e);
      if (H) {
        const W = window.MotionHandoffAnimation(H, x, Ae);
        W !== null && (T.startTime = W, E = !0);
      }
    }
    jc(e, x);
    const D = y ?? e.shouldReduceMotion;
    k.start(Dd(x, k, A, D && mv.has(x) ? { type: !1 } : T, e, E));
    const O = k.animation;
    O && l.push(O);
  }
  if (c) {
    const x = () => Ae.update(() => {
      c && Q_(e, c);
    });
    l.length ? Promise.all(l).then(x) : x();
  }
  return l;
}
function Ic(e, n, o = {}) {
  var m;
  const i = xr(e, n, o.type === "exit" ? (m = e.presenceContext) == null ? void 0 : m.custom : void 0);
  let { transition: a = e.getDefaultTransition() || {} } = i || {};
  o.transitionOverride && (a = o.transitionOverride);
  const d = i ? () => Promise.all(gv(e, i, o)) : () => Promise.resolve(), c = e.variantChildren && e.variantChildren.size ? (y = 0) => {
    const { delayChildren: g = 0, staggerChildren: l, staggerDirection: f } = a;
    return q_(e, n, y, g, l, f, o);
  } : () => Promise.resolve(), { when: p } = a;
  if (p) {
    const [y, g] = p === "beforeChildren" ? [d, c] : [c, d];
    return y().then(() => g());
  } else
    return Promise.all([d(), c(o.delay)]);
}
function q_(e, n, o = 0, i = 0, a = 0, d = 1, c) {
  const p = [];
  for (const m of e.variantChildren)
    m.notify("AnimationStart", n), p.push(Ic(m, n, {
      ...c,
      delay: o + (typeof i == "function" ? 0 : i) + dv(e.variantChildren, m, i, a, d)
    }).then(() => m.notify("AnimationComplete", n)));
  return Promise.all(p);
}
function eT(e, n, o = {}) {
  e.notify("AnimationStart", n);
  let i;
  if (Array.isArray(n)) {
    const a = n.map((d) => Ic(e, d, o));
    i = Promise.all(a);
  } else if (typeof n == "string")
    i = Ic(e, n, o);
  else {
    const a = typeof n == "function" ? xr(e, n, o.custom) : n;
    i = Promise.all(gv(e, a, o));
  }
  return i.then(() => {
    e.notify("AnimationComplete", n);
  });
}
const tT = {
  test: (e) => e === "auto",
  parse: (e) => e
}, vv = (e) => (n) => n.test(e), Sv = [mo, ne, nn, mn, C1, A1, tT], zh = (e) => Sv.find(vv(e));
function nT(e) {
  return typeof e == "number" ? e === 0 : e !== null ? e === "none" || e === "0" || Mg(e) : !0;
}
const rT = /* @__PURE__ */ new Set(["brightness", "contrast", "saturate", "opacity"]);
function oT(e) {
  const [n, o] = e.slice(0, -1).split("(");
  if (n === "drop-shadow")
    return e;
  const [i] = o.match(Ad) || [];
  if (!i)
    return e;
  const a = o.replace(i, "");
  let d = rT.has(n) ? 1 : 0;
  return i !== o && (d *= 100), n + "(" + d + a + ")";
}
const iT = /\b([a-z-]*)\(.*?\)/gu, Fc = {
  ...Ht,
  getAnimatableNone: (e) => {
    const n = e.match(iT);
    return n ? n.map(oT).join(" ") : e;
  }
}, Oc = {
  ...Ht,
  getAnimatableNone: (e) => {
    const n = Ht.parse(e);
    return Ht.createTransformer(e)(n.map((i) => typeof i == "number" ? 0 : typeof i == "object" ? { ...i, alpha: 1 } : i));
  }
}, $h = {
  ...mo,
  transform: Math.round
}, sT = {
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
  opacity: gi,
  originX: Ph,
  originY: Ph,
  originZ: ne
}, ka = {
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
  ...sT,
  zIndex: $h,
  // SVG
  fillOpacity: gi,
  strokeOpacity: gi,
  numOctaves: $h
}, aT = {
  ...ka,
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
  filter: Fc,
  WebkitFilter: Fc,
  mask: Oc,
  WebkitMask: Oc
}, wv = (e) => aT[e], lT = /* @__PURE__ */ new Set([Fc, Oc]);
function xv(e, n) {
  let o = wv(e);
  return lT.has(o) || (o = Ht), o.getAnimatableNone ? o.getAnimatableNone(n) : void 0;
}
const uT = /* @__PURE__ */ new Set(["auto", "none", "0"]);
function cT(e, n, o) {
  let i = 0, a;
  for (; i < e.length && !a; ) {
    const d = e[i];
    typeof d == "string" && !uT.has(d) && co(d).values.length && (a = e[i]), i++;
  }
  if (a && o)
    for (const d of n)
      e[d] = xv(o, a);
}
class dT extends Md {
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
      if (typeof l == "string" && (l = l.trim(), kd(l))) {
        const f = pv(l, o.current);
        f !== void 0 && (n[g] = f), g === n.length - 1 && (this.finalKeyframe = l);
      }
    }
    if (this.resolveNoneKeyframes(), !mv.has(i) || n.length !== 2)
      return;
    const [a, d] = n, c = zh(a), p = zh(d), m = bh(a), y = bh(d);
    if (m !== y && Gn[i]) {
      this.needsMeasurement = !0;
      return;
    }
    if (c !== p)
      if (Fh(c) && Fh(p))
        for (let g = 0; g < n.length; g++) {
          const l = n[g];
          typeof l == "string" && (n[g] = parseFloat(l));
        }
      else Gn[i] && (this.needsMeasurement = !0);
  }
  resolveNoneKeyframes() {
    const { unresolvedKeyframes: n, name: o } = this, i = [];
    for (let a = 0; a < n.length; a++)
      (n[a] === null || nT(n[a])) && i.push(a);
    i.length && cT(n, i, o);
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
function _v(e, n, o) {
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
const Lc = (e, n) => n && typeof e == "number" ? n.transform(e) : e;
function aa(e) {
  return Eg(e) && "offsetHeight" in e && !("ownerSVGElement" in e);
}
const { schedule: Id } = /* @__PURE__ */ Ug(queueMicrotask, !1), $t = {
  x: !1,
  y: !1
};
function Tv() {
  return $t.x || $t.y;
}
function fT(e) {
  return e === "x" || e === "y" ? $t[e] ? null : ($t[e] = !0, () => {
    $t[e] = !1;
  }) : $t.x || $t.y ? null : ($t.x = $t.y = !0, () => {
    $t.x = $t.y = !1;
  });
}
function kv(e, n) {
  const o = _v(e), i = new AbortController(), a = {
    passive: !0,
    ...n,
    signal: i.signal
  };
  return [o, a, () => i.abort()];
}
function pT(e) {
  return !(e.pointerType === "touch" || Tv());
}
function mT(e, n, o = {}) {
  const [i, a, d] = kv(e, o);
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
      if (!pT(A))
        return;
      m = !1;
      const T = n(c, A);
      typeof T == "function" && (y = T, c.addEventListener("pointerleave", x, a));
    };
    c.addEventListener("pointerenter", k, a), c.addEventListener("pointerdown", S, a);
  }), d;
}
const Av = (e, n) => n ? e === n ? !0 : Av(e, n.parentElement) : !1, Fd = (e) => e.pointerType === "mouse" ? typeof e.button != "number" || e.button <= 0 : e.isPrimary !== !1, hT = /* @__PURE__ */ new Set([
  "BUTTON",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "A"
]);
function yT(e) {
  return hT.has(e.tagName) || e.isContentEditable === !0;
}
const gT = /* @__PURE__ */ new Set(["INPUT", "SELECT", "TEXTAREA"]);
function vT(e) {
  return gT.has(e.tagName) || e.isContentEditable === !0;
}
const la = /* @__PURE__ */ new WeakSet();
function Uh(e) {
  return (n) => {
    n.key === "Enter" && e(n);
  };
}
function qu(e, n) {
  e.dispatchEvent(new PointerEvent("pointer" + n, { isPrimary: !0, bubbles: !0 }));
}
const ST = (e, n) => {
  const o = e.currentTarget;
  if (!o)
    return;
  const i = Uh(() => {
    if (la.has(o))
      return;
    qu(o, "down");
    const a = Uh(() => {
      qu(o, "up");
    }), d = () => qu(o, "cancel");
    o.addEventListener("keyup", a, n), o.addEventListener("blur", d, n);
  });
  o.addEventListener("keydown", i, n), o.addEventListener("blur", () => o.removeEventListener("keydown", i), n);
};
function Hh(e) {
  return Fd(e) && !Tv();
}
const Wh = /* @__PURE__ */ new WeakSet();
function wT(e, n, o = {}) {
  const [i, a, d] = kv(e, o), c = (p) => {
    const m = p.currentTarget;
    if (!Hh(p) || Wh.has(p))
      return;
    la.add(m), o.stopPropagation && Wh.add(p);
    const y = n(m, p), g = (S, x) => {
      window.removeEventListener("pointerup", l), window.removeEventListener("pointercancel", f), la.has(m) && la.delete(m), Hh(S) && typeof y == "function" && y(S, { success: x });
    }, l = (S) => {
      g(S, m === window || m === document || o.useGlobalTarget || Av(m, S.target));
    }, f = (S) => {
      g(S, !1);
    };
    window.addEventListener("pointerup", l, a), window.addEventListener("pointercancel", f, a);
  };
  return i.forEach((p) => {
    (o.useGlobalTarget ? window : p).addEventListener("pointerdown", c, a), aa(p) && (p.addEventListener("focus", (y) => ST(y, a)), !yT(p) && !p.hasAttribute("tabindex") && (p.tabIndex = 0));
  }), d;
}
function Od(e) {
  return Eg(e) && "ownerSVGElement" in e;
}
const ua = /* @__PURE__ */ new WeakMap();
let $n;
const Cv = (e, n, o) => (i, a) => a && a[0] ? a[0][e + "Size"] : Od(i) && "getBBox" in i ? i.getBBox()[n] : i[o], xT = /* @__PURE__ */ Cv("inline", "width", "offsetWidth"), _T = /* @__PURE__ */ Cv("block", "height", "offsetHeight");
function TT({ target: e, borderBoxSize: n }) {
  var o;
  (o = ua.get(e)) == null || o.forEach((i) => {
    i(e, {
      get width() {
        return xT(e, n);
      },
      get height() {
        return _T(e, n);
      }
    });
  });
}
function kT(e) {
  e.forEach(TT);
}
function AT() {
  typeof ResizeObserver > "u" || ($n = new ResizeObserver(kT));
}
function CT(e, n) {
  $n || AT();
  const o = _v(e);
  return o.forEach((i) => {
    let a = ua.get(i);
    a || (a = /* @__PURE__ */ new Set(), ua.set(i, a)), a.add(n), $n == null || $n.observe(i);
  }), () => {
    o.forEach((i) => {
      const a = ua.get(i);
      a == null || a.delete(n), a != null && a.size || $n == null || $n.unobserve(i);
    });
  };
}
const ca = /* @__PURE__ */ new Set();
let io;
function bT() {
  io = () => {
    const e = {
      get width() {
        return window.innerWidth;
      },
      get height() {
        return window.innerHeight;
      }
    };
    ca.forEach((n) => n(e));
  }, window.addEventListener("resize", io);
}
function PT(e) {
  return ca.add(e), io || bT(), () => {
    ca.delete(e), !ca.size && typeof io == "function" && (window.removeEventListener("resize", io), io = void 0);
  };
}
function Gh(e, n) {
  return typeof e == "function" ? PT(e) : CT(e, n);
}
function ET(e) {
  return Od(e) && e.tagName === "svg";
}
const MT = [...Sv, Be, Ht], RT = (e) => MT.find(vv(e)), Kh = () => ({
  translate: 0,
  scale: 1,
  origin: 0,
  originPoint: 0
}), so = () => ({
  x: Kh(),
  y: Kh()
}), Yh = () => ({ min: 0, max: 0 }), Ue = () => ({
  x: Yh(),
  y: Yh()
}), DT = /* @__PURE__ */ new WeakMap();
function Va(e) {
  return e !== null && typeof e == "object" && typeof e.start == "function";
}
function vi(e) {
  return typeof e == "string" || Array.isArray(e);
}
const Ld = [
  "animate",
  "whileInView",
  "whileFocus",
  "whileHover",
  "whileTap",
  "whileDrag",
  "exit"
], Vd = ["initial", ...Ld];
function Ba(e) {
  return Va(e.animate) || Vd.some((n) => vi(e[n]));
}
function bv(e) {
  return !!(Ba(e) || e.variants);
}
function NT(e, n, o) {
  for (const i in n) {
    const a = n[i], d = o[i];
    if (Je(a))
      e.addValue(i, a);
    else if (Je(d))
      e.addValue(i, fo(a, { owner: e }));
    else if (d !== a)
      if (e.hasValue(i)) {
        const c = e.getValue(i);
        c.liveStyle === !0 ? c.jump(a) : c.hasAnimated || c.set(a);
      } else {
        const c = e.getStaticValue(i);
        e.addValue(i, fo(c !== void 0 ? c : a, { owner: e }));
      }
  }
  for (const i in o)
    n[i] === void 0 && e.removeValue(i);
  return n;
}
const Vc = { current: null }, Pv = { current: !1 }, jT = typeof window < "u";
function IT() {
  if (Pv.current = !0, !!jT)
    if (window.matchMedia) {
      const e = window.matchMedia("(prefers-reduced-motion)"), n = () => Vc.current = e.matches;
      e.addEventListener("change", n), n();
    } else
      Vc.current = !1;
}
const Qh = [
  "AnimationStart",
  "AnimationComplete",
  "Update",
  "BeforeLayoutMeasure",
  "LayoutMeasure",
  "LayoutAnimationStart",
  "LayoutAnimationComplete"
];
let Aa = {};
function Ev(e) {
  Aa = e;
}
function FT() {
  return Aa;
}
class OT {
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
    this.current = null, this.children = /* @__PURE__ */ new Set(), this.isVariantNode = !1, this.isControllingVariants = !1, this.shouldReduceMotion = null, this.shouldSkipAnimations = !1, this.values = /* @__PURE__ */ new Map(), this.KeyframeResolver = Md, this.features = {}, this.valueSubscriptions = /* @__PURE__ */ new Map(), this.prevMotionValues = {}, this.hasBeenMounted = !1, this.events = {}, this.propEventSubscriptions = {}, this.notifyUpdate = () => this.notify("Update", this.latestValues), this.render = () => {
      this.current && (this.triggerBuild(), this.renderInstance(this.current, this.renderState, this.props.style, this.projection));
    }, this.renderScheduledAt = 0, this.scheduleRender = () => {
      const S = at.now();
      this.renderScheduledAt < S && (this.renderScheduledAt = S, Ae.render(this.render, !1, !0));
    };
    const { latestValues: y, renderState: g } = p;
    this.latestValues = y, this.baseTarget = { ...y }, this.initialValues = o.initial ? { ...y } : {}, this.renderState = g, this.parent = n, this.props = o, this.presenceContext = i, this.depth = n ? n.depth + 1 : 0, this.reducedMotionConfig = a, this.skipAnimationsConfig = d, this.options = m, this.blockInitialAnimation = !!c, this.isControllingVariants = Ba(o), this.isVariantNode = bv(o), this.isVariantNode && (this.variantChildren = /* @__PURE__ */ new Set()), this.manuallyAnimateOnMount = !!(n && n.current);
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
    this.current = n, DT.set(n, this), this.projection && !this.projection.instance && this.projection.mount(n), this.parent && this.isVariantNode && !this.isControllingVariants && (this.removeFromVariantTree = this.parent.addVariantChild(this)), this.values.forEach((a, d) => this.bindToMotionValue(d, a)), this.reducedMotionConfig === "never" ? this.shouldReduceMotion = !1 : this.reducedMotionConfig === "always" ? this.shouldReduceMotion = !0 : (Pv.current || IT(), this.shouldReduceMotion = Vc.current), this.shouldSkipAnimations = this.skipAnimationsConfig ?? !1, (i = this.parent) == null || i.addChild(this), this.update(this.props, this.presenceContext), this.hasBeenMounted = !0;
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
    if (this.valueSubscriptions.has(n) && this.valueSubscriptions.get(n)(), o.accelerate && cv.has(n) && this.current instanceof HTMLElement) {
      const { factory: c, keyframes: p, times: m, ease: y, duration: g } = o.accelerate, l = new lv({
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
    const i = yo.has(n);
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
    for (n in Aa) {
      const o = Aa[n];
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
    for (let i = 0; i < Qh.length; i++) {
      const a = Qh[i];
      this.propEventSubscriptions[a] && (this.propEventSubscriptions[a](), delete this.propEventSubscriptions[a]);
      const d = "on" + a, c = n[d];
      c && (this.propEventSubscriptions[a] = this.on(a, c));
    }
    this.prevMotionValues = NT(this, this.scrapeMotionValuesFromProps(n, this.prevProps || {}, this), this.prevMotionValues), this.handleChildMotionValue && this.handleChildMotionValue();
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
    return i === void 0 && o !== void 0 && (i = fo(o === null ? void 0 : o, { owner: this }), this.addValue(n, i)), i;
  }
  /**
   * If we're trying to animate to a previously unencountered value,
   * we need to check for it in our state and as a last resort read it
   * directly from the instance (which might have performance implications).
   */
  readValue(n, o) {
    let i = this.latestValues[n] !== void 0 || !this.current ? this.latestValues[n] : this.getBaseTargetFromProps(this.props, n) ?? this.readValueFromInstance(this.current, n, this.options);
    return i != null && (typeof i == "string" && (Pg(i) || Mg(i)) ? i = parseFloat(i) : !RT(i) && Ht.test(o) && (i = xv(n, o)), this.setBaseTarget(n, Je(i) ? i.get() : i)), Je(i) ? i.get() : i;
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
      const c = Nd(this.props, o, (d = this.presenceContext) == null ? void 0 : d.custom);
      c && (i = c[n]);
    }
    if (o && i !== void 0)
      return i;
    const a = this.getBaseTargetFromProps(this.props, n);
    return a !== void 0 && !Je(a) ? a : this.initialValues[n] !== void 0 && i === void 0 ? void 0 : this.baseTarget[n];
  }
  on(n, o) {
    return this.events[n] || (this.events[n] = new xd()), this.events[n].add(o);
  }
  notify(n, ...o) {
    this.events[n] && this.events[n].notify(...o);
  }
  scheduleRenderMicrotask() {
    Id.render(this.render);
  }
}
class Mv extends OT {
  constructor() {
    super(...arguments), this.KeyframeResolver = dT;
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
function Rv({ top: e, left: n, right: o, bottom: i }) {
  return {
    x: { min: n, max: o },
    y: { min: e, max: i }
  };
}
function LT({ x: e, y: n }) {
  return { top: n.min, right: e.max, bottom: n.max, left: e.min };
}
function VT(e, n) {
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
function ec(e) {
  return e === void 0 || e === 1;
}
function Bc({ scale: e, scaleX: n, scaleY: o }) {
  return !ec(e) || !ec(n) || !ec(o);
}
function fr(e) {
  return Bc(e) || Dv(e) || e.z || e.rotate || e.rotateX || e.rotateY || e.skewX || e.skewY;
}
function Dv(e) {
  return Xh(e.x) || Xh(e.y);
}
function Xh(e) {
  return e && e !== "0%";
}
function Ca(e, n, o) {
  const i = e - o, a = n * i;
  return o + a;
}
function Zh(e, n, o, i, a) {
  return a !== void 0 && (e = Ca(e, a, i)), Ca(e, o, i) + n;
}
function zc(e, n = 0, o = 1, i, a) {
  e.min = Zh(e.min, n, o, i, a), e.max = Zh(e.max, n, o, i, a);
}
function Nv(e, { x: n, y: o }) {
  zc(e.x, n.translate, n.scale, n.originPoint), zc(e.y, o.translate, o.scale, o.originPoint);
}
const Jh = 0.999999999999, qh = 1.0000000000001;
function BT(e, n, o, i = !1) {
  var p;
  const a = o.length;
  if (!a)
    return;
  n.x = n.y = 1;
  let d, c;
  for (let m = 0; m < a; m++) {
    d = o[m], c = d.projectionDelta;
    const { visualElement: y } = d.options;
    y && y.props.style && y.props.style.display === "contents" || (i && d.options.layoutScroll && d.scroll && d !== d.root && (qt(e.x, -d.scroll.offset.x), qt(e.y, -d.scroll.offset.y)), c && (n.x *= c.x.scale, n.y *= c.y.scale, Nv(e, c)), i && fr(d.latestValues) && da(e, d.latestValues, (p = d.layout) == null ? void 0 : p.layoutBox));
  }
  n.x < qh && n.x > Jh && (n.x = 1), n.y < qh && n.y > Jh && (n.y = 1);
}
function qt(e, n) {
  e.min += n, e.max += n;
}
function ey(e, n, o, i, a = 0.5) {
  const d = ke(e.min, e.max, a);
  zc(e, n, o, d, i);
}
function ty(e, n) {
  return typeof e == "string" ? parseFloat(e) / 100 * (n.max - n.min) : e;
}
function da(e, n, o) {
  const i = o ?? e;
  ey(e.x, ty(n.x, i.x), n.scaleX, n.scale, n.originX), ey(e.y, ty(n.y, i.y), n.scaleY, n.scale, n.originY);
}
function jv(e, n) {
  return Rv(VT(e.getBoundingClientRect(), n));
}
function zT(e, n, o) {
  const i = jv(e, o), { scroll: a } = n;
  return a && (qt(i.x, a.offset.x), qt(i.y, a.offset.y)), i;
}
const $T = {
  x: "translateX",
  y: "translateY",
  z: "translateZ",
  transformPerspective: "perspective"
}, UT = ho.length;
function HT(e, n, o) {
  let i = "", a = !0;
  for (let c = 0; c < UT; c++) {
    const p = ho[c], m = e[p];
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
      const g = Lc(m, ka[p]);
      if (!y) {
        a = !1;
        const l = $T[p] || p;
        i += `${l}(${g}) `;
      }
      o && (n[p] = g);
    }
  }
  const d = e.pathRotation;
  return d && (a = !1, i += `rotate(${Lc(d, ka.pathRotation)}) `), i = i.trim(), o ? i = o(n, a ? "" : i) : a && (i = "none"), i;
}
function Bd(e, n, o) {
  const { style: i, vars: a, transformOrigin: d } = e;
  let c = !1, p = !1;
  for (const m in n) {
    const y = n[m];
    if (yo.has(m)) {
      c = !0;
      continue;
    } else if (Wg(m)) {
      a[m] = y;
      continue;
    } else {
      const g = Lc(y, ka[m]);
      m.startsWith("origin") ? (p = !0, d[m] = g) : i[m] = g;
    }
  }
  if (n.transform || (c || o ? i.transform = HT(n, e.transform, o) : i.transform && (i.transform = "none")), p) {
    const { originX: m = "50%", originY: y = "50%", originZ: g = 0 } = d;
    i.transformOrigin = `${m} ${y} ${g}`;
  }
}
function Iv(e, { style: n, vars: o }, i, a) {
  const d = e.style;
  let c;
  for (c in n)
    d[c] = n[c];
  a == null || a.applyProjectionStyles(d, i);
  for (c in o)
    d.setProperty(c, o[c]);
}
function ny(e, n) {
  return n.max === n.min ? 0 : e / (n.max - n.min) * 100;
}
const ai = {
  correct: (e, n) => {
    if (!n.target)
      return e;
    if (typeof e == "string")
      if (ne.test(e))
        e = parseFloat(e);
      else
        return e;
    const o = ny(e, n.target.x), i = ny(e, n.target.y);
    return `${o}% ${i}%`;
  }
}, WT = {
  correct: (e, { treeScale: n, projectionDelta: o }) => {
    const i = e, a = Ht.parse(e);
    if (a.length > 5)
      return i;
    const d = Ht.createTransformer(e), c = typeof a[0] != "number" ? 1 : 0, p = o.x.scale * n.x, m = o.y.scale * n.y;
    a[0 + c] /= p, a[1 + c] /= m;
    const y = ke(p, m, 0.5);
    return typeof a[2 + c] == "number" && (a[2 + c] /= y), typeof a[3 + c] == "number" && (a[3 + c] /= y), d(a);
  }
}, $c = {
  borderRadius: {
    ...ai,
    applyTo: [
      "borderTopLeftRadius",
      "borderTopRightRadius",
      "borderBottomLeftRadius",
      "borderBottomRightRadius"
    ]
  },
  borderTopLeftRadius: ai,
  borderTopRightRadius: ai,
  borderBottomLeftRadius: ai,
  borderBottomRightRadius: ai,
  boxShadow: WT
};
function Fv(e, { layout: n, layoutId: o }) {
  return yo.has(e) || e.startsWith("origin") || (n || o !== void 0) && (!!$c[e] || e === "opacity");
}
function zd(e, n, o) {
  var c;
  const i = e.style, a = n == null ? void 0 : n.style, d = {};
  if (!i)
    return d;
  for (const p in i)
    (Je(i[p]) || a && Je(a[p]) || Fv(p, e) || ((c = o == null ? void 0 : o.getValue(p)) == null ? void 0 : c.liveStyle) !== void 0) && (d[p] = i[p]);
  return d;
}
function GT(e) {
  return window.getComputedStyle(e);
}
class KT extends Mv {
  constructor() {
    super(...arguments), this.type = "html", this.renderInstance = Iv;
  }
  readValueFromInstance(n, o) {
    var i;
    if (yo.has(o))
      return (i = this.projection) != null && i.isProjecting ? bc(o) : f_(n, o);
    {
      const a = GT(n), d = (Wg(o) ? a.getPropertyValue(o) : a[o]) || 0;
      return typeof d == "string" ? d.trim() : d;
    }
  }
  measureInstanceViewportBox(n, { transformPagePoint: o }) {
    return jv(n, o);
  }
  build(n, o, i) {
    Bd(n, o, i.transformTemplate);
  }
  scrapeMotionValuesFromProps(n, o, i) {
    return zd(n, o, i);
  }
}
const YT = {
  offset: "stroke-dashoffset",
  array: "stroke-dasharray"
}, QT = {
  offset: "strokeDashoffset",
  array: "strokeDasharray"
};
function XT(e, n, o = 1, i = 0, a = !0) {
  e.pathLength = 1;
  const d = a ? YT : QT;
  e[d.offset] = `${-i}`, e[d.array] = `${n} ${o}`;
}
const ZT = [
  "offsetDistance",
  "offsetPath",
  "offsetRotate",
  "offsetAnchor"
];
function Ov(e, {
  attrX: n,
  attrY: o,
  attrScale: i,
  pathLength: a,
  pathSpacing: d = 1,
  pathOffset: c = 0,
  // This is object creation, which we try to avoid per-frame.
  ...p
}, m, y, g) {
  if (Bd(e, p, y), m) {
    e.style.viewBox && (e.attrs.viewBox = e.style.viewBox);
    return;
  }
  e.attrs = e.style, e.style = {};
  const { attrs: l, style: f } = e;
  l.transform && (f.transform = l.transform, delete l.transform), (f.transform || l.transformOrigin) && (f.transformOrigin = l.transformOrigin ?? "50% 50%", delete l.transformOrigin), f.transform && (f.transformBox = (g == null ? void 0 : g.transformBox) ?? "fill-box", delete l.transformBox);
  for (const S of ZT)
    l[S] !== void 0 && (f[S] = l[S], delete l[S]);
  n !== void 0 && (l.x = n), o !== void 0 && (l.y = o), i !== void 0 && (l.scale = i), a !== void 0 && XT(l, a, d, c, !1);
}
const Lv = /* @__PURE__ */ new Set([
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
]), Vv = (e) => typeof e == "string" && e.toLowerCase() === "svg";
function JT(e, n, o, i) {
  Iv(e, n, void 0, i);
  for (const a in n.attrs)
    e.setAttribute(Lv.has(a) ? a : jd(a), n.attrs[a]);
}
function Bv(e, n, o) {
  const i = zd(e, n, o);
  for (const a in e)
    if (Je(e[a]) || Je(n[a])) {
      const d = ho.indexOf(a) !== -1 ? "attr" + a.charAt(0).toUpperCase() + a.substring(1) : a;
      i[d] = e[a];
    }
  return i;
}
class qT extends Mv {
  constructor() {
    super(...arguments), this.type = "svg", this.isSVGTag = !1, this.measureInstanceViewportBox = Ue;
  }
  getBaseTargetFromProps(n, o) {
    return n[o];
  }
  readValueFromInstance(n, o) {
    if (yo.has(o)) {
      const i = wv(o);
      return i && i.default || 0;
    }
    return o = Lv.has(o) ? o : jd(o), n.getAttribute(o);
  }
  scrapeMotionValuesFromProps(n, o, i) {
    return Bv(n, o, i);
  }
  build(n, o, i) {
    Ov(n, o, this.isSVGTag, i.transformTemplate, i.style);
  }
  renderInstance(n, o, i, a) {
    JT(n, o, i, a);
  }
  mount(n) {
    this.isSVGTag = Vv(n.tagName), super.mount(n);
  }
}
const ek = Vd.length;
function zv(e) {
  if (!e)
    return;
  if (!e.isControllingVariants) {
    const o = e.parent ? zv(e.parent) || {} : {};
    return e.props.initial !== void 0 && (o.initial = e.props.initial), o;
  }
  const n = {};
  for (let o = 0; o < ek; o++) {
    const i = Vd[o], a = e.props[i];
    (vi(a) || a === !1) && (n[i] = a);
  }
  return n;
}
function $v(e, n) {
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
const tk = [...Ld].reverse(), nk = Ld.length;
function rk(e) {
  return (n) => Promise.all(n.map(({ animation: o, options: i }) => eT(e, o, i)));
}
function ok(e) {
  let n = rk(e), o = ry(), i = !0, a = !1;
  const d = (y) => (g, l) => {
    var S;
    const f = xr(e, l, y === "exit" ? (S = e.presenceContext) == null ? void 0 : S.custom : void 0);
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
    const { props: g } = e, l = zv(e.parent) || {}, f = [], S = /* @__PURE__ */ new Set();
    let x = {}, k = 1 / 0;
    for (let T = 0; T < nk; T++) {
      const b = tk[T], E = o[b], D = g[b] !== void 0 ? g[b] : l[b], O = vi(D), H = b === y ? E.isActive : null;
      H === !1 && (k = T);
      let W = D === l[b] && D !== g[b] && O;
      if (W && (i || a) && e.manuallyAnimateOnMount && (W = !1), E.protectedKeys = { ...x }, // If it isn't active and hasn't *just* been set as inactive
      !E.isActive && H === null || // If we didn't and don't have any defined prop for this animation type
      !D && !E.prevProp || // Or if the prop doesn't define an animation
      Va(D) || typeof D == "boolean")
        continue;
      if (b === "exit" && E.isActive && H !== !0) {
        E.prevResolvedValues && (x = {
          ...x,
          ...E.prevResolvedValues
        });
        continue;
      }
      const G = ik(E.prevProp, D);
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
        Nc(J) && Nc(Q) ? N = !$v(J, Q) || G : N = J !== Q, N ? J != null ? Se(z) : S.add(z) : J !== void 0 && S.has(z) ? Se(z) : E.protectedKeys[z] = !0;
      }
      E.prevProp = D, E.prevResolvedValues = Z, E.isActive && (x = { ...x, ...Z }), (i || a) && e.blockInitialAnimation && (K = !1);
      const re = W && G;
      K && (!re || X) && f.push(...se.map((z) => {
        const J = { type: b };
        if (typeof z == "string" && (i || a) && !re && e.manuallyAnimateOnMount && e.parent) {
          const { parent: Q } = e, N = xr(Q, z);
          if (Q.enteringChildren && N) {
            const { delayChildren: L } = N.transition || {};
            J.delay = dv(Q.enteringChildren, e, L);
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
        const b = xr(e, Array.isArray(g.initial) ? g.initial[0] : g.initial);
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
      o = ry(), a = !0;
    }
  };
}
function ik(e, n) {
  return typeof n == "string" ? n !== e : Array.isArray(n) ? !$v(n, e) : !1;
}
function dr(e = !1) {
  return {
    isActive: e,
    protectedKeys: {},
    needsAnimating: {},
    prevResolvedValues: {}
  };
}
function ry() {
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
function Uc(e, n) {
  e.min = n.min, e.max = n.max;
}
function zt(e, n) {
  Uc(e.x, n.x), Uc(e.y, n.y);
}
function oy(e, n) {
  e.translate = n.translate, e.scale = n.scale, e.originPoint = n.originPoint, e.origin = n.origin;
}
const Uv = 1e-4, sk = 1 - Uv, ak = 1 + Uv, Hv = 0.01, lk = 0 - Hv, uk = 0 + Hv;
function lt(e) {
  return e.max - e.min;
}
function ck(e, n, o) {
  return Math.abs(e - n) <= o;
}
function iy(e, n, o, i = 0.5) {
  e.origin = i, e.originPoint = ke(n.min, n.max, e.origin), e.scale = lt(o) / lt(n), e.translate = ke(o.min, o.max, e.origin) - e.originPoint, (e.scale >= sk && e.scale <= ak || isNaN(e.scale)) && (e.scale = 1), (e.translate >= lk && e.translate <= uk || isNaN(e.translate)) && (e.translate = 0);
}
function fi(e, n, o, i) {
  iy(e.x, n.x, o.x, i ? i.originX : void 0), iy(e.y, n.y, o.y, i ? i.originY : void 0);
}
function sy(e, n, o, i = 0) {
  const a = i ? ke(o.min, o.max, i) : o.min;
  e.min = a + n.min, e.max = e.min + lt(n);
}
function dk(e, n, o, i) {
  sy(e.x, n.x, o.x, i == null ? void 0 : i.x), sy(e.y, n.y, o.y, i == null ? void 0 : i.y);
}
function ay(e, n, o, i = 0) {
  const a = i ? ke(o.min, o.max, i) : o.min;
  e.min = n.min - a, e.max = e.min + lt(n);
}
function ba(e, n, o, i) {
  ay(e.x, n.x, o.x, i == null ? void 0 : i.x), ay(e.y, n.y, o.y, i == null ? void 0 : i.y);
}
function ly(e, n, o, i, a) {
  return e -= n, e = Ca(e, 1 / o, i), a !== void 0 && (e = Ca(e, 1 / a, i)), e;
}
function fk(e, n = 0, o = 1, i = 0.5, a, d = e, c = e) {
  if (nn.test(n) && (n = parseFloat(n), n = ke(c.min, c.max, n / 100) - c.min), typeof n != "number")
    return;
  let p = ke(d.min, d.max, i);
  e === d && (p -= n), e.min = ly(e.min, n, o, p, a), e.max = ly(e.max, n, o, p, a);
}
function uy(e, n, [o, i, a], d, c) {
  fk(e, n[o], n[i], n[a], n.scale, d, c);
}
const pk = ["x", "scaleX", "originX"], mk = ["y", "scaleY", "originY"];
function cy(e, n, o, i) {
  uy(e.x, n, pk, o ? o.x : void 0, i ? i.x : void 0), uy(e.y, n, mk, o ? o.y : void 0, i ? i.y : void 0);
}
function dy(e) {
  return e.translate === 0 && e.scale === 1;
}
function Wv(e) {
  return dy(e.x) && dy(e.y);
}
function fy(e, n) {
  return e.min === n.min && e.max === n.max;
}
function hk(e, n) {
  return fy(e.x, n.x) && fy(e.y, n.y);
}
function py(e, n) {
  return Math.round(e.min) === Math.round(n.min) && Math.round(e.max) === Math.round(n.max);
}
function Gv(e, n) {
  return py(e.x, n.x) && py(e.y, n.y);
}
function my(e) {
  return lt(e.x) / lt(e.y);
}
function hy(e, n) {
  return e.translate === n.translate && e.scale === n.scale && e.originPoint === n.originPoint;
}
function Jt(e) {
  return [e("x"), e("y")];
}
function yk(e, n, o) {
  let i = "";
  const a = e.x.translate / n.x, d = e.y.translate / n.y, c = (o == null ? void 0 : o.z) || 0;
  if ((a || d || c) && (i = `translate3d(${a}px, ${d}px, ${c}px) `), (n.x !== 1 || n.y !== 1) && (i += `scale(${1 / n.x}, ${1 / n.y}) `), o) {
    const { transformPerspective: y, rotate: g, pathRotation: l, rotateX: f, rotateY: S, skewX: x, skewY: k } = o;
    y && (i = `perspective(${y}px) ${i}`), g && (i += `rotate(${g}deg) `), l && (i += `rotate(${l}deg) `), f && (i += `rotateX(${f}deg) `), S && (i += `rotateY(${S}deg) `), x && (i += `skewX(${x}deg) `), k && (i += `skewY(${k}deg) `);
  }
  const p = e.x.scale * n.x, m = e.y.scale * n.y;
  return (p !== 1 || m !== 1) && (i += `scale(${p}, ${m})`), i || "none";
}
const Kv = [
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius"
], gk = Kv.length, yy = (e) => typeof e == "string" ? parseFloat(e) : e, gy = (e) => typeof e == "number" || ne.test(e);
function vk(e, n, o, i, a, d) {
  a ? (e.opacity = ke(0, o.opacity ?? 1, Sk(i)), e.opacityExit = ke(n.opacity ?? 1, 0, wk(i))) : d && (e.opacity = ke(n.opacity ?? 1, o.opacity ?? 1, i));
  for (let c = 0; c < gk; c++) {
    const p = Kv[c];
    let m = vy(n, p), y = vy(o, p);
    if (m === void 0 && y === void 0)
      continue;
    m || (m = 0), y || (y = 0), m === 0 || y === 0 || gy(m) === gy(y) ? (e[p] = Math.max(ke(yy(m), yy(y), i), 0), (nn.test(y) || nn.test(m)) && (e[p] += "%")) : e[p] = y;
  }
  (n.rotate || o.rotate) && (e.rotate = ke(n.rotate || 0, o.rotate || 0, i));
}
function vy(e, n) {
  return e[n] !== void 0 ? e[n] : e.borderRadius;
}
const Sk = /* @__PURE__ */ Yv(0, 0.5, Vg), wk = /* @__PURE__ */ Yv(0.5, 0.95, Nt);
function Yv(e, n, o) {
  return (i) => i < e ? 0 : i > n ? 1 : o(/* @__PURE__ */ yi(e, n, i));
}
function xk(e, n, o) {
  const i = Je(e) ? e : fo(e);
  return i.start(Dd("", i, n, o)), i.animation;
}
function Si(e, n, o, i = { passive: !0 }) {
  return e.addEventListener(n, o, i), () => e.removeEventListener(n, o);
}
const _k = (e, n) => e.depth - n.depth;
class Tk {
  constructor() {
    this.children = [], this.isDirty = !1;
  }
  add(n) {
    wd(this.children, n), this.isDirty = !0;
  }
  remove(n) {
    Sa(this.children, n), this.isDirty = !0;
  }
  forEach(n) {
    this.isDirty && this.children.sort(_k), this.isDirty = !1, this.children.forEach(n);
  }
}
function kk(e, n) {
  const o = at.now(), i = ({ timestamp: a }) => {
    const d = a - o;
    d >= n && (Xn(i), e(d - n));
  };
  return Ae.setup(i, !0), () => Xn(i);
}
function fa(e) {
  return Je(e) ? e.get() : e;
}
class Ak {
  constructor() {
    this.members = [];
  }
  add(n) {
    wd(this.members, n);
    for (let o = this.members.length - 1; o >= 0; o--) {
      const i = this.members[o];
      if (i === n || i === this.lead || i === this.prevLead)
        continue;
      const a = i.instance;
      (!a || a.isConnected === !1) && !i.snapshot && (Sa(this.members, i), i.unmount());
    }
    n.scheduleRender();
  }
  remove(n) {
    if (Sa(this.members, n), n === this.prevLead && (this.prevLead = void 0), n === this.lead) {
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
}, tc = ["", "X", "Y", "Z"], Ck = 1e3;
let bk = 0;
function nc(e, n, o, i) {
  const { latestValues: a } = n;
  a[e] && (o[e] = a[e], n.setStaticValue(e, 0), i && (i[e] = 0));
}
function Qv(e) {
  if (e.hasCheckedOptimisedAppear = !0, e.root === e)
    return;
  const { visualElement: n } = e.options;
  if (!n)
    return;
  const o = yv(n);
  if (window.MotionHasOptimisedAnimation(o, "transform")) {
    const { layout: a, layoutId: d } = e.options;
    window.MotionCancelOptimisedAnimation(o, "transform", Ae, !(a || d));
  }
  const { parent: i } = e;
  i && !i.hasCheckedOptimisedAppear && Qv(i);
}
function Xv({ attachResizeListener: e, defaultParent: n, measureScroll: o, checkIsScrollRoot: i, resetTransform: a }) {
  return class {
    constructor(c = {}, p = n == null ? void 0 : n()) {
      this.id = bk++, this.animationId = 0, this.animationCommitId = 0, this.children = /* @__PURE__ */ new Set(), this.options = {}, this.isTreeAnimating = !1, this.isAnimationBlocked = !1, this.isLayoutDirty = !1, this.isProjectionDirty = !1, this.isSharedProjectionDirty = !1, this.isTransformDirty = !1, this.updateManuallyBlocked = !1, this.updateBlockedByResize = !1, this.isUpdating = !1, this.isSVG = !1, this.needsReset = !1, this.shouldResetTransform = !1, this.hasCheckedOptimisedAppear = !1, this.treeScale = { x: 1, y: 1 }, this.eventHandlers = /* @__PURE__ */ new Map(), this.hasTreeAnimated = !1, this.layoutVersion = 0, this.updateScheduled = !1, this.scheduleUpdate = () => this.update(), this.projectionUpdateScheduled = !1, this.checkUpdateFailed = () => {
        this.isUpdating && (this.isUpdating = !1, this.clearAllSnapshots());
      }, this.updateProjection = () => {
        this.projectionUpdateScheduled = !1, this.nodes.forEach(Mk), this.nodes.forEach(Fk), this.nodes.forEach(Ok), this.nodes.forEach(Rk);
      }, this.resolvedRelativeTargetAt = 0, this.linkedParentVersion = 0, this.hasProjected = !1, this.isVisible = !0, this.animationProgress = 0, this.sharedNodes = /* @__PURE__ */ new Map(), this.latestValues = c, this.root = p ? p.root || p : this, this.path = p ? [...p.path, p] : [], this.parent = p, this.depth = p ? p.depth + 1 : 0;
      for (let m = 0; m < this.path.length; m++)
        this.path[m].shouldResetTransform = !0;
      this.root === this && (this.nodes = new Tk());
    }
    addEventListener(c, p) {
      return this.eventHandlers.has(c) || this.eventHandlers.set(c, new xd()), this.eventHandlers.get(c).add(p);
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
      this.isSVG = Od(c) && !ET(c), this.instance = c;
      const { layoutId: p, layout: m, visualElement: y } = this.options;
      if (y && !y.current && y.mount(c), this.root.nodes.add(this), this.parent && this.parent.children.add(this), this.root.hasTreeAnimated && (m || p) && (this.isLayoutDirty = !0), e) {
        let g, l = 0;
        const f = () => this.root.updateBlockedByResize = !1;
        Ae.read(() => {
          l = window.innerWidth;
        }), e(c, () => {
          const S = window.innerWidth;
          S !== l && (l = S, this.root.updateBlockedByResize = !0, g && g(), g = kk(f, 250), pa.hasAnimatedSinceResize && (pa.hasAnimatedSinceResize = !1, this.nodes.forEach(xy)));
        });
      }
      p && this.root.registerSharedNode(p, this), this.options.animate !== !1 && y && (p || m) && this.addEventListener("didUpdate", ({ delta: g, hasLayoutChanged: l, hasRelativeLayoutChanged: f, layout: S }) => {
        if (this.isTreeAnimationBlocked()) {
          this.target = void 0, this.relativeTarget = void 0;
          return;
        }
        const x = this.options.transition || y.getDefaultTransition() || $k, { onLayoutAnimationStart: k, onLayoutAnimationComplete: A } = y.getProps(), T = !this.targetLayout || !Gv(this.targetLayout, S), b = !l && f;
        if (this.options.layoutRoot || this.resumeFrom || b || l && (T || !this.currentAnimation)) {
          this.resumeFrom && (this.resumingFrom = this.resumeFrom, this.resumingFrom.resumingFrom = void 0);
          const E = {
            ...Rd(x, "layout"),
            onPlay: k,
            onComplete: A
          };
          (y.shouldReduceMotion || this.options.layoutRoot) && (E.delay = 0, E.type = !1), this.startAnimation(E), this.setAnimationOrigin(g, b, E.path);
        } else
          l || xy(this), this.isLead() && this.options.onExitComplete && this.options.onExitComplete();
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
      this.isUpdateBlocked() || (this.isUpdating = !0, this.nodes && this.nodes.forEach(Lk), this.animationId++);
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
      if (window.MotionCancelOptimisedAnimation && !this.hasCheckedOptimisedAppear && Qv(this), !this.root.isUpdating && this.root.startUpdate(), this.isLayoutDirty)
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
        this.unblockUpdate(), this.updateBlockedByResize = !1, this.clearAllSnapshots(), m && this.nodes.forEach(Nk), this.nodes.forEach(Sy);
        return;
      }
      if (this.animationId <= this.animationCommitId) {
        this.nodes.forEach(wy);
        return;
      }
      this.animationCommitId = this.animationId, this.isUpdating ? (this.isUpdating = !1, this.nodes.forEach(jk), this.nodes.forEach(Ik), this.nodes.forEach(Pk), this.nodes.forEach(Ek)) : this.nodes.forEach(wy), this.clearAllSnapshots();
      const p = at.now();
      Ze.delta = rn(0, 1e3 / 60, p - Ze.timestamp), Ze.timestamp = p, Ze.isProcessing = !0, Ku.update.process(Ze), Ku.preRender.process(Ze), Ku.render.process(Ze), Ze.isProcessing = !1;
    }
    didUpdate() {
      this.updateScheduled || (this.updateScheduled = !0, Id.read(this.scheduleUpdate));
    }
    clearAllSnapshots() {
      this.nodes.forEach(Dk), this.sharedNodes.forEach(Vk);
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
      const c = this.isLayoutDirty || this.shouldResetTransform || this.options.alwaysMeasureLayout, p = this.projectionDelta && !Wv(this.projectionDelta), m = this.getTransformTemplate(), y = m ? m(this.latestValues, "") : void 0, g = y !== this.prevTransformTemplateValue;
      c && this.instance && (p || fr(this.latestValues) || g) && (a(this.instance, y), this.shouldResetTransform = !1, this.scheduleRender());
    }
    measure(c = !0) {
      const p = this.measurePageBox();
      let m = this.removeElementScroll(p);
      return c && (m = this.removeTransform(m)), Uk(m), {
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
      if (!(((y = this.scroll) == null ? void 0 : y.wasRoot) || this.path.some(Hk))) {
        const { scroll: g } = this.root;
        g && (qt(p.x, g.offset.x), qt(p.y, g.offset.y));
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
        g !== this.root && l && f.layoutScroll && (l.wasRoot && zt(p, c), qt(p.x, l.offset.x), qt(p.y, l.offset.y));
      }
      return p;
    }
    applyTransform(c, p = !1, m) {
      var g, l;
      const y = m || Ue();
      zt(y, c);
      for (let f = 0; f < this.path.length; f++) {
        const S = this.path[f];
        !p && S.options.layoutScroll && S.scroll && S !== S.root && (qt(y.x, -S.scroll.offset.x), qt(y.y, -S.scroll.offset.y)), fr(S.latestValues) && da(y, S.latestValues, (g = S.layout) == null ? void 0 : g.layoutBox);
      }
      return fr(this.latestValues) && da(y, this.latestValues, (l = this.layout) == null ? void 0 : l.layoutBox), y;
    }
    removeTransform(c) {
      var m;
      const p = Ue();
      zt(p, c);
      for (let y = 0; y < this.path.length; y++) {
        const g = this.path[y];
        if (!fr(g.latestValues))
          continue;
        let l;
        g.instance && (Bc(g.latestValues) && g.updateSnapshot(), l = Ue(), zt(l, g.measurePageBox())), cy(p, g.latestValues, (m = g.snapshot) == null ? void 0 : m.layoutBox, l);
      }
      return fr(this.latestValues) && cy(p, this.latestValues), p;
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
      f && this.linkedParentVersion !== f.layoutVersion && !f.options.layoutRoot && this.removeRelativeTarget(), !this.targetDelta && !this.relativeTarget && (this.options.layoutAnchor !== !1 && f && f.layout ? this.createRelativeTarget(f, this.layout.layoutBox, f.layout.layoutBox) : this.removeRelativeTarget()), !(!this.relativeTarget && !this.targetDelta) && (this.target || (this.target = Ue(), this.targetWithTransforms = Ue()), this.relativeTarget && this.relativeTargetOrigin && this.relativeParent && this.relativeParent.target ? (this.forceRelativeParentToResolveTarget(), dk(this.target, this.relativeTarget, this.relativeParent.target, this.options.layoutAnchor || void 0)) : this.targetDelta ? (this.resumingFrom ? this.applyTransform(this.layout.layoutBox, !1, this.target) : zt(this.target, this.layout.layoutBox), Nv(this.target, this.targetDelta)) : zt(this.target, this.layout.layoutBox), this.attemptToResolveRelativeTarget && (this.attemptToResolveRelativeTarget = !1, this.options.layoutAnchor !== !1 && f && !!f.resumingFrom == !!this.resumingFrom && !f.options.layoutScroll && f.target && this.animationProgress !== 1 ? this.createRelativeTarget(f, this.target, f.target) : this.relativeParent = this.relativeTarget = void 0));
    }
    getClosestProjectingParent() {
      if (!(!this.parent || Bc(this.parent.latestValues) || Dv(this.parent.latestValues)))
        return this.parent.isProjecting() ? this.parent : this.parent.getClosestProjectingParent();
    }
    isProjecting() {
      return !!((this.relativeTarget || this.targetDelta || this.options.layoutRoot) && this.layout);
    }
    createRelativeTarget(c, p, m) {
      this.relativeParent = c, this.linkedParentVersion = c.layoutVersion, this.forceRelativeParentToResolveTarget(), this.relativeTarget = Ue(), this.relativeTargetOrigin = Ue(), ba(this.relativeTargetOrigin, p, m, this.options.layoutAnchor || void 0), zt(this.relativeTarget, this.relativeTargetOrigin);
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
      BT(this.layoutCorrected, this.treeScale, this.path, p), c.layout && !c.target && (this.treeScale.x !== 1 || this.treeScale.y !== 1) && (c.target = c.layout.layoutBox, c.targetWithTransforms = Ue());
      const { target: S } = c;
      if (!S) {
        this.prevProjectionDelta && (this.createProjectionDeltas(), this.scheduleRender());
        return;
      }
      !this.projectionDelta || !this.prevProjectionDelta ? this.createProjectionDeltas() : (oy(this.prevProjectionDelta.x, this.projectionDelta.x), oy(this.prevProjectionDelta.y, this.projectionDelta.y)), fi(this.projectionDelta, this.layoutCorrected, S, this.latestValues), (this.treeScale.x !== l || this.treeScale.y !== f || !hy(this.projectionDelta.x, this.prevProjectionDelta.x) || !hy(this.projectionDelta.y, this.prevProjectionDelta.y)) && (this.hasProjected = !0, this.scheduleRender(), this.notifyListeners("projectionUpdate", S));
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
      this.prevProjectionDelta = so(), this.projectionDelta = so(), this.projectionDeltaWithTransform = so();
    }
    setAnimationOrigin(c, p = !1, m) {
      const y = this.snapshot, g = y ? y.latestValues : {}, l = { ...this.latestValues }, f = so();
      (!this.relativeParent || !this.relativeParent.options.layoutRoot) && (this.relativeTarget = this.relativeTargetOrigin = void 0), this.attemptToResolveRelativeTarget = !p;
      const S = Ue(), x = y ? y.source : void 0, k = this.layout ? this.layout.source : void 0, A = x !== k, T = this.getStack(), b = !T || T.members.length <= 1, E = !!(A && !b && this.options.crossfade === !0 && !this.path.some(zk));
      this.animationProgress = 0;
      let D;
      const O = m == null ? void 0 : m.interpolateProjection(c);
      this.mixTargetDelta = (H) => {
        const W = H / 1e3, G = O == null ? void 0 : O(W);
        G ? (f.x.translate = G.x, f.x.scale = ke(c.x.scale, 1, W), f.x.origin = c.x.origin, f.x.originPoint = c.x.originPoint, f.y.translate = G.y, f.y.scale = ke(c.y.scale, 1, W), f.y.origin = c.y.origin, f.y.originPoint = c.y.originPoint) : (_y(f.x, c.x, W), _y(f.y, c.y, W)), this.setTargetDelta(f), this.relativeTarget && this.relativeTargetOrigin && this.layout && this.relativeParent && this.relativeParent.layout && (ba(S, this.layout.layoutBox, this.relativeParent.layout.layoutBox, this.options.layoutAnchor || void 0), Bk(this.relativeTarget, this.relativeTargetOrigin, S, W), D && hk(this.relativeTarget, D) && (this.isProjectionDirty = !1), D || (D = Ue()), zt(D, this.relativeTarget)), A && (this.animationValues = l, vk(l, g, this.latestValues, W, E, b)), G && G.rotate !== void 0 && (this.animationValues || (this.animationValues = l), this.animationValues.pathRotation = G.rotate), this.root.scheduleUpdateProjection(), this.scheduleRender(), this.animationProgress = W;
      }, this.mixTargetDelta(this.options.layoutRoot ? 1e3 : 0);
    }
    startAnimation(c) {
      var p, m, y;
      this.notifyListeners("animationStart"), (p = this.currentAnimation) == null || p.stop(), (y = (m = this.resumingFrom) == null ? void 0 : m.currentAnimation) == null || y.stop(), this.pendingAnimation && (Xn(this.pendingAnimation), this.pendingAnimation = void 0), this.pendingAnimation = Ae.update(() => {
        pa.hasAnimatedSinceResize = !0, this.motionValue || (this.motionValue = fo(0)), this.motionValue.jump(0, !1), this.currentAnimation = xk(this.motionValue, [0, 1e3], {
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
      this.currentAnimation && (this.mixTargetDelta && this.mixTargetDelta(Ck), this.currentAnimation.stop()), this.completeAnimation();
    }
    applyTransformsToTarget() {
      const c = this.getLead();
      let { targetWithTransforms: p, target: m, layout: y, latestValues: g } = c;
      if (!(!p || !m || !y)) {
        if (this !== c && this.layout && y && Zv(this.options.animationType, this.layout.layoutBox, y.layoutBox)) {
          m = this.target || Ue();
          const l = lt(this.layout.layoutBox.x);
          m.x.min = c.target.x.min, m.x.max = m.x.min + l;
          const f = lt(this.layout.layoutBox.y);
          m.y.min = c.target.y.min, m.y.max = m.y.min + f;
        }
        zt(p, m), da(p, g), fi(this.projectionDeltaWithTransform, this.layoutCorrected, p, g);
      }
    }
    registerSharedNode(c, p) {
      this.sharedNodes.has(c) || this.sharedNodes.set(c, new Ak()), this.sharedNodes.get(c).add(p);
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
      m.z && nc("z", c, y, this.animationValues);
      for (let g = 0; g < tc.length; g++)
        nc(`rotate${tc[g]}`, c, y, this.animationValues), nc(`skew${tc[g]}`, c, y, this.animationValues);
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
        this.needsReset = !1, c.visibility = "", c.opacity = "", c.pointerEvents = fa(p == null ? void 0 : p.pointerEvents) || "", c.transform = m ? m(this.latestValues, "") : "none";
        return;
      }
      const y = this.getLead();
      if (!this.projectionDelta || !this.layout || !y.target) {
        this.options.layoutId && (c.opacity = this.latestValues.opacity !== void 0 ? this.latestValues.opacity : 1, c.pointerEvents = fa(p == null ? void 0 : p.pointerEvents) || ""), this.hasProjected && !fr(this.latestValues) && (c.transform = m ? m({}, "") : "none", this.hasProjected = !1);
        return;
      }
      c.visibility = "";
      const g = y.animationValues || y.latestValues;
      this.applyTransformsToTarget();
      let l = yk(this.projectionDeltaWithTransform, this.treeScale, g);
      m && (l = m(g, l)), c.transform = l;
      const { x: f, y: S } = this.projectionDelta;
      c.transformOrigin = `${f.origin * 100}% ${S.origin * 100}% 0`, y.animationValues ? c.opacity = y === this ? g.opacity ?? this.latestValues.opacity ?? 1 : this.preserveOpacity ? this.latestValues.opacity : g.opacityExit : c.opacity = y === this ? g.opacity !== void 0 ? g.opacity : "" : g.opacityExit !== void 0 ? g.opacityExit : 0;
      for (const x in $c) {
        if (g[x] === void 0)
          continue;
        const { correct: k, applyTo: A, isCSSVariable: T } = $c[x], b = l === "none" ? g[x] : k(g[x], y);
        if (A) {
          const E = A.length;
          for (let D = 0; D < E; D++)
            c[A[D]] = b;
        } else
          T ? this.options.visualElement.renderState.vars[x] = b : c[x] = b;
      }
      this.options.layoutId && (c.pointerEvents = y === this ? fa(p == null ? void 0 : p.pointerEvents) || "" : "none");
    }
    clearSnapshot() {
      this.resumeFrom = this.snapshot = void 0;
    }
    // Only run on root
    resetTree() {
      this.root.nodes.forEach((c) => {
        var p;
        return (p = c.currentAnimation) == null ? void 0 : p.stop();
      }), this.root.nodes.forEach(Sy), this.root.sharedNodes.clear();
    }
  };
}
function Pk(e) {
  e.updateLayout();
}
function Ek(e) {
  var o;
  const n = ((o = e.resumeFrom) == null ? void 0 : o.snapshot) || e.snapshot;
  if (e.isLead() && e.layout && n && e.hasListeners("didUpdate")) {
    const { layoutBox: i, measuredBox: a } = e.layout, { animationType: d } = e.options, c = n.source !== e.layout.source;
    if (d === "size")
      Jt((l) => {
        const f = c ? n.measuredBox[l] : n.layoutBox[l], S = lt(f);
        f.min = i[l].min, f.max = f.min + S;
      });
    else if (d === "x" || d === "y") {
      const l = d === "x" ? "y" : "x";
      Uc(c ? n.measuredBox[l] : n.layoutBox[l], i[l]);
    } else Zv(d, n.layoutBox, i) && Jt((l) => {
      const f = c ? n.measuredBox[l] : n.layoutBox[l], S = lt(i[l]);
      f.max = f.min + S, e.relativeTarget && !e.currentAnimation && (e.isProjectionDirty = !0, e.relativeTarget[l].max = e.relativeTarget[l].min + S);
    });
    const p = so();
    fi(p, i, n.layoutBox);
    const m = so();
    c ? fi(m, e.applyTransform(a, !0), n.measuredBox) : fi(m, i, n.layoutBox);
    const y = !Wv(p);
    let g = !1;
    if (!e.resumeFrom) {
      const l = e.getClosestProjectingParent();
      if (l && !l.resumeFrom) {
        const { snapshot: f, layout: S } = l;
        if (f && S) {
          const x = e.options.layoutAnchor || void 0, k = Ue();
          ba(k, n.layoutBox, f.layoutBox, x);
          const A = Ue();
          ba(A, i, S.layoutBox, x), Gv(k, A) || (g = !0), l.options.layoutRoot && (e.relativeTarget = A, e.relativeTargetOrigin = k, e.relativeParent = l);
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
function Mk(e) {
  e.parent && (e.isProjecting() || (e.isProjectionDirty = e.parent.isProjectionDirty), e.isSharedProjectionDirty || (e.isSharedProjectionDirty = !!(e.isProjectionDirty || e.parent.isProjectionDirty || e.parent.isSharedProjectionDirty)), e.isTransformDirty || (e.isTransformDirty = e.parent.isTransformDirty));
}
function Rk(e) {
  e.isProjectionDirty = e.isSharedProjectionDirty = e.isTransformDirty = !1;
}
function Dk(e) {
  e.clearSnapshot();
}
function Sy(e) {
  e.clearMeasurements();
}
function Nk(e) {
  e.isLayoutDirty = !0, e.updateLayout();
}
function wy(e) {
  e.isLayoutDirty = !1;
}
function jk(e) {
  e.isAnimationBlocked && e.layout && !e.isLayoutDirty && (e.snapshot = e.layout, e.isLayoutDirty = !0);
}
function Ik(e) {
  const { visualElement: n } = e.options;
  n && n.getProps().onBeforeLayoutMeasure && n.notify("BeforeLayoutMeasure"), e.resetTransform();
}
function xy(e) {
  e.finishAnimation(), e.targetDelta = e.relativeTarget = e.target = void 0, e.isProjectionDirty = !0;
}
function Fk(e) {
  e.resolveTargetDelta();
}
function Ok(e) {
  e.calcProjection();
}
function Lk(e) {
  e.resetSkewAndRotation();
}
function Vk(e) {
  e.removeLeadSnapshot();
}
function _y(e, n, o) {
  e.translate = ke(n.translate, 0, o), e.scale = ke(n.scale, 1, o), e.origin = n.origin, e.originPoint = n.originPoint;
}
function Ty(e, n, o, i) {
  e.min = ke(n.min, o.min, i), e.max = ke(n.max, o.max, i);
}
function Bk(e, n, o, i) {
  Ty(e.x, n.x, o.x, i), Ty(e.y, n.y, o.y, i);
}
function zk(e) {
  return e.animationValues && e.animationValues.opacityExit !== void 0;
}
const $k = {
  duration: 0.45,
  ease: [0.4, 0, 0.1, 1]
}, ky = (e) => typeof navigator < "u" && navigator.userAgent && navigator.userAgent.toLowerCase().includes(e), Ay = ky("applewebkit/") && !ky("chrome/") ? Math.round : Nt;
function Cy(e) {
  e.min = Ay(e.min), e.max = Ay(e.max);
}
function Uk(e) {
  Cy(e.x), Cy(e.y);
}
function Zv(e, n, o) {
  return e === "position" || e === "preserve-aspect" && !ck(my(n), my(o), 0.2);
}
function Hk(e) {
  var n;
  return e !== e.root && ((n = e.scroll) == null ? void 0 : n.wasRoot);
}
const Wk = Xv({
  attachResizeListener: (e, n) => Si(e, "resize", n),
  measureScroll: () => {
    var e, n;
    return {
      x: document.documentElement.scrollLeft || ((e = document.body) == null ? void 0 : e.scrollLeft) || 0,
      y: document.documentElement.scrollTop || ((n = document.body) == null ? void 0 : n.scrollTop) || 0
    };
  },
  checkIsScrollRoot: () => !0
}), rc = {
  current: void 0
}, Jv = Xv({
  measureScroll: (e) => ({
    x: e.scrollLeft,
    y: e.scrollTop
  }),
  defaultParent: () => {
    if (!rc.current) {
      const e = new Wk({});
      e.mount(window), e.setOptions({ layoutScroll: !0 }), rc.current = e;
    }
    return rc.current;
  },
  resetTransform: (e, n) => {
    e.style.transform = n !== void 0 ? n : "none";
  },
  checkIsScrollRoot: (e) => window.getComputedStyle(e).position === "fixed"
}), $d = C.createContext({
  transformPagePoint: (e) => e,
  isStatic: !1,
  reducedMotion: "never"
});
function by(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function Gk(...e) {
  return (n) => {
    let o = !1;
    const i = e.map((a) => {
      const d = by(a, n);
      return !o && typeof d == "function" && (o = !0), d;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const d = i[a];
          typeof d == "function" ? d() : by(e[a], null);
        }
      };
  };
}
function Kk(...e) {
  return C.useCallback(Gk(...e), e);
}
class Yk extends C.Component {
  getSnapshotBeforeUpdate(n) {
    const o = this.props.childRef.current;
    if (aa(o) && n.isPresent && !this.props.isPresent && this.props.pop !== !1) {
      const i = o.offsetParent, a = aa(i) && i.offsetWidth || 0, d = aa(i) && i.offsetHeight || 0, c = getComputedStyle(o), p = this.props.sizeRef.current;
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
function Qk({ children: e, isPresent: n, anchorX: o, anchorY: i, root: a, pop: d }) {
  var f;
  const c = C.useId(), p = C.useRef(null), m = C.useRef({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    direction: "ltr"
  }), { nonce: y } = C.useContext($d), g = ((f = e.props) == null ? void 0 : f.ref) ?? (e == null ? void 0 : e.ref), l = Kk(p, g);
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
  }, [n]), w.jsx(Yk, { isPresent: n, childRef: p, sizeRef: m, pop: d, children: d === !1 ? e : C.cloneElement(e, { ref: l }) });
}
const Xk = ({ children: e, initial: n, isPresent: o, onExitComplete: i, custom: a, presenceAffectsLayout: d, mode: c, anchorX: p, anchorY: m, root: y }) => {
  const g = Sd(Zk), l = C.useId();
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
  }, [o]), e = w.jsx(Qk, { pop: c === "popLayout", isPresent: o, anchorX: p, anchorY: m, root: y, children: e }), w.jsx(Oa.Provider, { value: S, children: e });
};
function Zk() {
  return /* @__PURE__ */ new Map();
}
function qv(e = !0) {
  const n = C.useContext(Oa);
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
const Gs = (e) => e.key || "";
function Py(e) {
  const n = [];
  return C.Children.forEach(e, (o) => {
    C.isValidElement(o) && n.push(o);
  }), n;
}
const za = ({ children: e, custom: n, initial: o = !0, onExitComplete: i, presenceAffectsLayout: a = !0, mode: d = "sync", propagate: c = !1, anchorX: p = "left", anchorY: m = "top", root: y }) => {
  const [g, l] = qv(c), f = C.useMemo(() => Py(e), [e]), S = c && !g ? [] : f.map(Gs), x = C.useRef(!0), k = C.useRef(f), A = Sd(() => /* @__PURE__ */ new Map()), T = C.useRef(/* @__PURE__ */ new Set()), [b, E] = C.useState(f), [D, O] = C.useState(f);
  bg(() => {
    x.current = !1, k.current = f;
    for (let G = 0; G < D.length; G++) {
      const K = Gs(D[G]);
      S.includes(K) ? (A.delete(K), T.current.delete(K)) : A.get(K) !== !0 && A.set(K, !1);
    }
  }, [D, S.length, S.join("-")]);
  const H = [];
  if (f !== b) {
    let G = [...f];
    for (let K = 0; K < D.length; K++) {
      const X = D[K], se = Gs(X);
      S.includes(se) || (G.splice(K, 0, X), H.push(X));
    }
    return d === "wait" && H.length && (G = H), O(Py(G)), E(f), null;
  }
  const { forceRender: W } = C.useContext(vd);
  return w.jsx(w.Fragment, { children: D.map((G) => {
    const K = Gs(G), X = c && !g ? !1 : f === D || S.includes(K), se = () => {
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
    return w.jsx(Xk, { isPresent: X, initial: !x.current || o ? void 0 : !1, custom: n, presenceAffectsLayout: a, mode: d, root: y, onExitComplete: X ? void 0 : se, anchorX: p, anchorY: m, children: G }, K);
  }) });
}, e0 = C.createContext({ strict: !1 }), Ey = {
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
let My = !1;
function Jk() {
  if (My)
    return;
  const e = {};
  for (const n in Ey)
    e[n] = {
      isEnabled: (o) => Ey[n].some((i) => !!o[i])
    };
  Ev(e), My = !0;
}
function t0() {
  return Jk(), FT();
}
function qk(e) {
  const n = t0();
  for (const o in e)
    n[o] = {
      ...n[o],
      ...e[o]
    };
  Ev(n);
}
const eA = /* @__PURE__ */ new Set([
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
  return e.startsWith("while") || e.startsWith("drag") && e !== "draggable" || e.startsWith("layout") || e.startsWith("onTap") || e.startsWith("onPan") || e.startsWith("onLayout") || eA.has(e);
}
let n0 = (e) => !Pa(e);
function tA(e) {
  typeof e == "function" && (n0 = (n) => n.startsWith("on") ? !Pa(n) : e(n));
}
try {
  tA(require("@emotion/is-prop-valid").default);
} catch {
}
function nA(e, n, o) {
  const i = {};
  for (const a in e)
    a === "values" && typeof e.values == "object" || Je(e[a]) || (n0(a) || o === !0 && Pa(a) || !n && !Pa(a) || // If trying to use native HTML drag events, forward drag listeners
    e.draggable && a.startsWith("onDrag")) && (i[a] = e[a]);
  return i;
}
const $a = /* @__PURE__ */ C.createContext({});
function rA(e, n) {
  if (Ba(e)) {
    const { initial: o, animate: i } = e;
    return {
      initial: o === !1 || vi(o) ? o : void 0,
      animate: vi(i) ? i : void 0
    };
  }
  return e.inherit !== !1 ? n : {};
}
function oA(e) {
  const { initial: n, animate: o } = rA(e, C.useContext($a));
  return C.useMemo(() => ({ initial: n, animate: o }), [Ry(n), Ry(o)]);
}
function Ry(e) {
  return Array.isArray(e) ? e.join(" ") : e;
}
const Ud = () => ({
  style: {},
  transform: {},
  transformOrigin: {},
  vars: {}
});
function r0(e, n, o) {
  for (const i in n)
    !Je(n[i]) && !Fv(i, o) && (e[i] = n[i]);
}
function iA({ transformTemplate: e }, n) {
  return C.useMemo(() => {
    const o = Ud();
    return Bd(o, n, e), Object.assign({}, o.vars, o.style);
  }, [n]);
}
function sA(e, n) {
  const o = e.style || {}, i = {};
  return r0(i, o, e), Object.assign(i, iA(e, n)), i;
}
function aA(e, n) {
  const o = {}, i = sA(e, n);
  return e.drag && e.dragListener !== !1 && (o.draggable = !1, i.userSelect = i.WebkitUserSelect = i.WebkitTouchCallout = "none", i.touchAction = e.drag === !0 ? "none" : `pan-${e.drag === "x" ? "y" : "x"}`), e.tabIndex === void 0 && (e.onTap || e.onTapStart || e.whileTap) && (o.tabIndex = 0), o.style = i, o;
}
const o0 = () => ({
  ...Ud(),
  attrs: {}
});
function lA(e, n, o, i) {
  const a = C.useMemo(() => {
    const d = o0();
    return Ov(d, n, Vv(i), e.transformTemplate, e.style), {
      ...d.attrs,
      style: { ...d.style }
    };
  }, [n]);
  if (e.style) {
    const d = {};
    r0(d, e.style, e), a.style = { ...d, ...a.style };
  }
  return a;
}
const uA = [
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
function Hd(e) {
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
      !!(uA.indexOf(e) > -1 || /**
       * If it contains a capital letter, it's an SVG component
       */
      /[A-Z]/u.test(e))
    )
  );
}
function cA(e, n, o, { latestValues: i }, a, d = !1, c) {
  const m = (c ?? Hd(e) ? lA : aA)(n, i, a, e), y = nA(n, typeof e == "string", d), g = e !== C.Fragment ? { ...y, ...m, ref: o } : {}, { children: l } = n, f = C.useMemo(() => Je(l) ? l.get() : l, [l]);
  return C.createElement(e, {
    ...g,
    children: f
  });
}
function dA({ scrapeMotionValuesFromProps: e, createRenderState: n }, o, i, a) {
  return {
    latestValues: fA(o, i, a, e),
    renderState: n()
  };
}
function fA(e, n, o, i) {
  const a = {}, d = i(e, {});
  for (const f in d)
    a[f] = fa(d[f]);
  let { initial: c, animate: p } = e;
  const m = Ba(e), y = bv(e);
  n && y && !m && e.inherit !== !1 && (c === void 0 && (c = n.initial), p === void 0 && (p = n.animate));
  let g = o ? o.initial === !1 : !1;
  g = g || c === !1;
  const l = g ? p : c;
  if (l && typeof l != "boolean" && !Va(l)) {
    const f = Array.isArray(l) ? l : [l];
    for (let S = 0; S < f.length; S++) {
      const x = Nd(e, f[S]);
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
const i0 = (e) => (n, o) => {
  const i = C.useContext($a), a = C.useContext(Oa), d = () => dA(e, n, i, a);
  return o ? d() : Sd(d);
}, pA = /* @__PURE__ */ i0({
  scrapeMotionValuesFromProps: zd,
  createRenderState: Ud
}), mA = /* @__PURE__ */ i0({
  scrapeMotionValuesFromProps: Bv,
  createRenderState: o0
}), hA = Symbol.for("motionComponentSymbol");
function yA(e, n, o) {
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
const s0 = C.createContext({});
function no(e) {
  return e && typeof e == "object" && Object.prototype.hasOwnProperty.call(e, "current");
}
function gA(e, n, o, i, a, d) {
  var E, D;
  const { visualElement: c } = C.useContext($a), p = C.useContext(e0), m = C.useContext(Oa), y = C.useContext($d), g = y.reducedMotion, l = y.skipAnimations, f = C.useRef(null), S = C.useRef(!1);
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
  const x = f.current, k = C.useContext(s0);
  x && !x.projection && a && (x.type === "html" || x.type === "svg") && vA(f.current, o, a, k);
  const A = C.useRef(!1);
  C.useInsertionEffect(() => {
    x && A.current && x.update(o, m);
  });
  const T = o[hv], b = C.useRef(!!T && typeof window < "u" && !((E = window.MotionHandoffIsComplete) != null && E.call(window, T)) && ((D = window.MotionHasOptimisedAnimation) == null ? void 0 : D.call(window, T)));
  return bg(() => {
    S.current = !0, x && (A.current = !0, window.MotionIsMounted = !0, x.updateFeatures(), x.scheduleRenderMicrotask(), b.current && x.animationState && x.animationState.animateChanges());
  }), C.useEffect(() => {
    x && (!b.current && x.animationState && x.animationState.animateChanges(), b.current && (queueMicrotask(() => {
      var O;
      (O = window.MotionHandoffMarkAsComplete) == null || O.call(window, T);
    }), b.current = !1), x.enteringChildren = void 0);
  }), x;
}
function vA(e, n, o, i) {
  const { layoutId: a, layout: d, drag: c, dragConstraints: p, layoutScroll: m, layoutRoot: y, layoutAnchor: g, layoutCrossfade: l } = n;
  e.projection = new o(e.latestValues, n["data-framer-portal-id"] ? void 0 : a0(e.parent)), e.projection.setOptions({
    layoutId: a,
    layout: d,
    alwaysMeasureLayout: !!c || p && no(p),
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
function a0(e) {
  if (e)
    return e.options.allowProjection !== !1 ? e.projection : a0(e.parent);
}
function oc(e, { forwardMotionProps: n = !1, type: o } = {}, i, a) {
  i && qk(i);
  const d = o ? o === "svg" : Hd(e), c = d ? mA : pA;
  function p(y, g) {
    let l;
    const f = {
      ...C.useContext($d),
      ...y,
      layoutId: SA(y)
    }, { isStatic: S } = f, x = oA(y), k = c(y, S);
    if (!S && typeof window < "u") {
      wA();
      const A = xA(f);
      l = A.MeasureLayout, x.visualElement = gA(e, k, f, a, A.ProjectionNode, d);
    }
    return w.jsxs($a.Provider, { value: x, children: [l && x.visualElement ? w.jsx(l, { visualElement: x.visualElement, ...f }) : null, cA(e, y, yA(k, x.visualElement, g), k, S, n, d)] });
  }
  p.displayName = `motion.${typeof e == "string" ? e : `create(${e.displayName ?? e.name ?? ""})`}`;
  const m = C.forwardRef(p);
  return m[hA] = e, m;
}
function SA({ layoutId: e }) {
  const n = C.useContext(vd).id;
  return n && e !== void 0 ? n + "-" + e : e;
}
function wA(e, n) {
  C.useContext(e0).strict;
}
function xA(e) {
  const n = t0(), { drag: o, layout: i } = n;
  if (!o && !i)
    return {};
  const a = { ...o, ...i };
  return {
    MeasureLayout: o != null && o.isEnabled(e) || i != null && i.isEnabled(e) ? a.MeasureLayout : void 0,
    ProjectionNode: a.ProjectionNode
  };
}
function _A(e, n) {
  if (typeof Proxy > "u")
    return oc;
  const o = /* @__PURE__ */ new Map(), i = (d, c) => oc(d, c, e, n), a = (d, c) => i(d, c);
  return new Proxy(a, {
    /**
     * Called when `motion` is referenced with a prop: `motion.div`, `motion.input` etc.
     * The prop name is passed through as `key` and we can use that to generate a `motion`
     * DOM component with that name.
     */
    get: (d, c) => c === "create" ? i : (o.has(c) || o.set(c, oc(c, void 0, e, n)), o.get(c))
  });
}
const TA = (e, n) => n.isSVG ?? Hd(e) ? new qT(n) : new KT(n, {
  allowProjection: e !== C.Fragment
});
class kA extends Zn {
  /**
   * We dynamically generate the AnimationState manager as it contains a reference
   * to the underlying animation library. We only want to load that if we load this,
   * so people can optionally code split it out using the `m` component.
   */
  constructor(n) {
    super(n), n.animationState || (n.animationState = ok(n));
  }
  updateAnimationControlsSubscription() {
    const { animate: n } = this.node.getProps();
    Va(n) && (this.unmountControls = n.subscribe(this.node));
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
let AA = 0;
class CA extends Zn {
  constructor() {
    super(...arguments), this.id = AA++, this.isExitComplete = !1;
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
          const m = xr(this.node, c, p);
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
const bA = {
  animation: {
    Feature: kA
  },
  exit: {
    Feature: CA
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
const PA = (e) => (n) => Fd(n) && e(n, Pi(n));
function pi(e, n, o, i) {
  return Si(e, n, PA(o), i);
}
const l0 = ({ current: e }) => e ? e.ownerDocument.defaultView : null, Dy = (e, n) => Math.abs(e - n);
function EA(e, n) {
  const o = Dy(e.x, n.x), i = Dy(e.y, n.y);
  return Math.sqrt(o ** 2 + i ** 2);
}
const Ny = /* @__PURE__ */ new Set(["auto", "scroll"]);
class u0 {
  constructor(n, o, { transformPagePoint: i, contextWindow: a = window, dragSnapToOrigin: d = !1, distanceThreshold: c = 3, element: p } = {}) {
    if (this.startEvent = null, this.lastMoveEvent = null, this.lastMoveEventInfo = null, this.lastRawMoveEventInfo = null, this.handlers = {}, this.contextWindow = window, this.scrollPositions = /* @__PURE__ */ new Map(), this.removeScrollListeners = null, this.onElementScroll = (S) => {
      this.handleScroll(S.target);
    }, this.onWindowScroll = () => {
      this.handleScroll(window);
    }, this.updatePoint = () => {
      if (!(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      this.lastRawMoveEventInfo && (this.lastMoveEventInfo = Ks(this.lastRawMoveEventInfo, this.transformPagePoint));
      const S = ic(this.lastMoveEventInfo, this.history), x = this.startEvent !== null, k = EA(S.offset, { x: 0, y: 0 }) >= this.distanceThreshold;
      if (!x && !k)
        return;
      const { point: A } = S, { timestamp: T } = Ze;
      this.history.push({ ...A, timestamp: T });
      const { onStart: b, onMove: E } = this.handlers;
      x || (b && b(this.lastMoveEvent, S), this.startEvent = this.lastMoveEvent), E && E(this.lastMoveEvent, S);
    }, this.handlePointerMove = (S, x) => {
      this.lastMoveEvent = S, this.lastRawMoveEventInfo = x, this.lastMoveEventInfo = Ks(x, this.transformPagePoint), Ae.update(this.updatePoint, !0);
    }, this.handlePointerUp = (S, x) => {
      this.end();
      const { onEnd: k, onSessionEnd: A, resumeAnimation: T } = this.handlers;
      if ((this.dragSnapToOrigin || !this.startEvent) && T && T(), !(this.lastMoveEvent && this.lastMoveEventInfo))
        return;
      const b = ic(S.type === "pointercancel" ? this.lastMoveEventInfo : Ks(x, this.transformPagePoint), this.history);
      this.startEvent && k && k(S, b), A && A(S, b);
    }, !Fd(n))
      return;
    this.dragSnapToOrigin = d, this.handlers = o, this.transformPagePoint = i, this.distanceThreshold = c, this.contextWindow = a || window;
    const m = Pi(n), y = Ks(m, this.transformPagePoint), { point: g } = y, { timestamp: l } = Ze;
    this.history = [{ ...g, timestamp: l }];
    const { onSessionStart: f } = o;
    f && f(n, ic(y, this.history)), this.removeListeners = Ai(pi(this.contextWindow, "pointermove", this.handlePointerMove), pi(this.contextWindow, "pointerup", this.handlePointerUp), pi(this.contextWindow, "pointercancel", this.handlePointerUp)), p && this.startScrollTracking(p);
  }
  /**
   * Start tracking scroll on ancestors and window.
   */
  startScrollTracking(n) {
    let o = n.parentElement;
    for (; o; ) {
      const i = getComputedStyle(o);
      (Ny.has(i.overflowX) || Ny.has(i.overflowY)) && this.scrollPositions.set(o, {
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
function Ks(e, n) {
  return n ? { point: n(e.point) } : e;
}
function jy(e, n) {
  return { x: e.x - n.x, y: e.y - n.y };
}
function ic({ point: e }, n) {
  return {
    point: e,
    delta: jy(e, c0(n)),
    offset: jy(e, MA(n)),
    velocity: RA(n, 0.1)
  };
}
function MA(e) {
  return e[0];
}
function c0(e) {
  return e[e.length - 1];
}
function RA(e, n) {
  if (e.length < 2)
    return { x: 0, y: 0 };
  let o = e.length - 1, i = null;
  const a = c0(e);
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
function DA(e, { min: n, max: o }, i) {
  return n !== void 0 && e < n ? e = i ? ke(n, e, i.min) : Math.max(e, n) : o !== void 0 && e > o && (e = i ? ke(o, e, i.max) : Math.min(e, o)), e;
}
function Iy(e, n, o) {
  return {
    min: n !== void 0 ? e.min + n : void 0,
    max: o !== void 0 ? e.max + o - (e.max - e.min) : void 0
  };
}
function NA(e, { top: n, left: o, bottom: i, right: a }) {
  return {
    x: Iy(e.x, o, a),
    y: Iy(e.y, n, i)
  };
}
function Fy(e, n) {
  let o = n.min - e.min, i = n.max - e.max;
  return n.max - n.min < e.max - e.min && ([o, i] = [i, o]), { min: o, max: i };
}
function jA(e, n) {
  return {
    x: Fy(e.x, n.x),
    y: Fy(e.y, n.y)
  };
}
function IA(e, n) {
  let o = 0.5;
  const i = lt(e), a = lt(n);
  return a > i ? o = /* @__PURE__ */ yi(n.min, n.max - i, e.min) : i > a && (o = /* @__PURE__ */ yi(e.min, e.max - a, n.min)), rn(0, 1, o);
}
function FA(e, n) {
  const o = {};
  return n.min !== void 0 && (o.min = n.min - e.min), n.max !== void 0 && (o.max = n.max - e.min), o;
}
const Hc = 0.35;
function OA(e = Hc) {
  return e === !1 ? e = 0 : e === !0 && (e = Hc), {
    x: Oy(e, "left", "right"),
    y: Oy(e, "top", "bottom")
  };
}
function Oy(e, n, o) {
  return {
    min: Ly(e, n),
    max: Ly(e, o)
  };
}
function Ly(e, n) {
  return typeof e == "number" ? e : e[n] || 0;
}
const LA = /* @__PURE__ */ new WeakMap();
class VA {
  constructor(n) {
    this.openDragLock = null, this.isDragging = !1, this.currentDirection = null, this.originPoint = { x: 0, y: 0 }, this.constraints = !1, this.hasMutatedConstraints = !1, this.elastic = Ue(), this.latestPointerEvent = null, this.latestPanInfo = null, this.visualElement = n;
  }
  start(n, { snapToCursor: o = !1, distanceThreshold: i } = {}) {
    const { presenceContext: a } = this.visualElement;
    if (a && a.isPresent === !1)
      return;
    const d = (l) => {
      o && this.snapToCursor(Pi(l).point), this.stopAnimation();
    }, c = (l, f) => {
      const { drag: S, dragPropagation: x, onDragStart: k } = this.getProps();
      if (S && !x && (this.openDragLock && this.openDragLock(), this.openDragLock = fT(S), !this.openDragLock))
        return;
      this.latestPointerEvent = l, this.latestPanInfo = f, this.isDragging = !0, this.currentDirection = null, this.resolveConstraints(), this.visualElement.projection && (this.visualElement.projection.isAnimationBlocked = !0, this.visualElement.projection.target = void 0), Jt((T) => {
        let b = this.getAxisMotionValue(T).get() || 0;
        if (nn.test(b)) {
          const { projection: E } = this.visualElement;
          if (E && E.layout) {
            const D = E.layout.layoutBox[T];
            D && (b = lt(D) * (parseFloat(b) / 100));
          }
        }
        this.originPoint[T] = b;
      }), k && Ae.update(() => k(l, f), !1, !0), jc(this.visualElement, "transform");
      const { animationState: A } = this.visualElement;
      A && A.setActive("whileDrag", !0);
    }, p = (l, f) => {
      this.latestPointerEvent = l, this.latestPanInfo = f;
      const { dragPropagation: S, dragDirectionLock: x, onDirectionLock: k, onDrag: A } = this.getProps();
      if (!S && !this.openDragLock)
        return;
      const { offset: T } = f;
      if (x && this.currentDirection === null) {
        this.currentDirection = zA(T), this.currentDirection !== null && k && k(this.currentDirection);
        return;
      }
      this.updateAxis("x", f.point, T), this.updateAxis("y", f.point, T), this.visualElement.render(), A && Ae.update(() => A(l, f), !1, !0);
    }, m = (l, f) => {
      this.latestPointerEvent = l, this.latestPanInfo = f, this.stop(l, f), this.latestPointerEvent = null, this.latestPanInfo = null;
    }, y = () => {
      const { dragSnapToOrigin: l } = this.getProps();
      (l || this.constraints) && this.startAnimation({ x: 0, y: 0 });
    }, { dragSnapToOrigin: g } = this.getProps();
    this.panSession = new u0(n, {
      onSessionStart: d,
      onStart: c,
      onMove: p,
      onSessionEnd: m,
      resumeAnimation: y
    }, {
      transformPagePoint: this.visualElement.getTransformPagePoint(),
      dragSnapToOrigin: g,
      distanceThreshold: i,
      contextWindow: l0(this.visualElement),
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
    if (!i || !Ys(n, a, this.currentDirection))
      return;
    const d = this.getAxisMotionValue(n);
    let c = this.originPoint[n] + i[n];
    this.constraints && this.constraints[n] && (c = DA(c, this.constraints[n], this.elastic[n])), d.set(c);
  }
  resolveConstraints() {
    var d;
    const { dragConstraints: n, dragElastic: o } = this.getProps(), i = this.visualElement.projection && !this.visualElement.projection.layout ? this.visualElement.projection.measure(!1) : (d = this.visualElement.projection) == null ? void 0 : d.layout, a = this.constraints;
    n && no(n) ? this.constraints || (this.constraints = this.resolveRefConstraints()) : n && i ? this.constraints = NA(i.layoutBox, n) : this.constraints = !1, this.elastic = OA(o), a !== this.constraints && !no(n) && i && this.constraints && !this.hasMutatedConstraints && Jt((c) => {
      this.constraints !== !1 && this.getAxisMotionValue(c) && (this.constraints[c] = FA(i.layoutBox[c], this.constraints[c]));
    });
  }
  resolveRefConstraints() {
    const { dragConstraints: n, onMeasureDragConstraints: o } = this.getProps();
    if (!n || !no(n))
      return !1;
    const i = n.current;
    Ar(i !== null, "If `dragConstraints` is set as a React ref, that ref must be passed to another component's `ref` prop.", "drag-constraints-ref");
    const { projection: a } = this.visualElement;
    if (!a || !a.layout)
      return !1;
    a.root && (a.root.scroll = void 0, a.root.updateScroll());
    const d = zT(i, a.root, this.visualElement.getTransformPagePoint());
    let c = jA(a.layout.layoutBox, d);
    if (o) {
      const p = o(LT(c));
      this.hasMutatedConstraints = !!p, p && (c = Rv(p));
    }
    return c;
  }
  startAnimation(n) {
    const { drag: o, dragMomentum: i, dragElastic: a, dragTransition: d, dragSnapToOrigin: c, onDragTransitionEnd: p } = this.getProps(), m = this.constraints || {}, y = Jt((g) => {
      if (!Ys(g, o, this.currentDirection))
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
    return jc(this.visualElement, n), i.start(Dd(n, i, 0, o, this.visualElement, !1));
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
    if (!no(o) || !i || !this.constraints)
      return;
    this.stopAnimation();
    const a = { x: 0, y: 0 };
    Jt((c) => {
      const p = this.getAxisMotionValue(c);
      if (p && this.constraints !== !1) {
        const m = p.get();
        a[c] = IA({ min: m, max: m }, this.constraints[c]);
      }
    });
    const { transformTemplate: d } = this.visualElement.getProps();
    this.visualElement.current.style.transform = d ? d({}, "") : "none", i.root && i.root.updateScroll(), i.updateLayout(), this.constraints = !1, this.resolveConstraints(), Jt((c) => {
      if (!Ys(c, n, null))
        return;
      const p = this.getAxisMotionValue(c), { min: m, max: y } = this.constraints[c];
      p.set(ke(m, y, a[c]));
    }), this.visualElement.render();
  }
  addListeners() {
    if (!this.visualElement.current)
      return;
    LA.set(this.visualElement, this);
    const n = this.visualElement.current, o = pi(n, "pointerdown", (y) => {
      const { drag: g, dragListener: l = !0 } = this.getProps(), f = y.target, S = f !== n && vT(f);
      g && l && !S && this.start(y);
    });
    let i;
    const a = () => {
      const { dragConstraints: y } = this.getProps();
      no(y) && y.current && (this.constraints = this.resolveRefConstraints(), i || (i = BA(n, y.current, () => this.scalePositionWithinConstraints())));
    }, { projection: d } = this.visualElement, c = d.addEventListener("measure", a);
    d && !d.layout && (d.root && d.root.updateScroll(), d.updateLayout()), Ae.read(a);
    const p = Si(window, "resize", () => this.scalePositionWithinConstraints()), m = d.addEventListener("didUpdate", (({ delta: y, hasLayoutChanged: g }) => {
      this.isDragging && g && (Jt((l) => {
        const f = this.getAxisMotionValue(l);
        f && (this.originPoint[l] += y[l].translate, f.set(f.get() + y[l].translate));
      }), this.visualElement.render());
    }));
    return () => {
      p(), o(), c(), m && m(), i && i();
    };
  }
  getProps() {
    const n = this.visualElement.getProps(), { drag: o = !1, dragDirectionLock: i = !1, dragPropagation: a = !1, dragConstraints: d = !1, dragElastic: c = Hc, dragMomentum: p = !0 } = n;
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
function Vy(e) {
  let n = !0;
  return () => {
    if (n) {
      n = !1;
      return;
    }
    e();
  };
}
function BA(e, n, o) {
  const i = Gh(e, Vy(o)), a = Gh(n, Vy(o));
  return () => {
    i(), a();
  };
}
function Ys(e, n, o) {
  return (n === !0 || n === e) && (o === null || o === e);
}
function zA(e, n = 10) {
  let o = null;
  return Math.abs(e.y) > n ? o = "y" : Math.abs(e.x) > n && (o = "x"), o;
}
class $A extends Zn {
  constructor(n) {
    super(n), this.removeGroupControls = Nt, this.removeListeners = Nt, this.controls = new VA(n);
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
const sc = (e) => (n, o) => {
  e && Ae.update(() => e(n, o), !1, !0);
};
class UA extends Zn {
  constructor() {
    super(...arguments), this.removePointerDownListener = Nt;
  }
  onPointerDown(n) {
    this.session = new u0(n, this.createPanHandlers(), {
      transformPagePoint: this.node.getTransformPagePoint(),
      contextWindow: l0(this.node)
    });
  }
  createPanHandlers() {
    const { onPanSessionStart: n, onPanStart: o, onPan: i, onPanEnd: a } = this.node.getProps();
    return {
      onSessionStart: sc(n),
      onStart: sc(o),
      onMove: sc(i),
      onEnd: (d, c) => {
        delete this.session, a && Ae.postRender(() => a(d, c));
      }
    };
  }
  mount() {
    this.removePointerDownListener = pi(this.node.current, "pointerdown", (n) => this.onPointerDown(n));
  }
  update() {
    this.session && this.session.updateHandlers(this.createPanHandlers());
  }
  unmount() {
    this.removePointerDownListener(), this.session && this.session.end();
  }
}
let ac = !1;
class HA extends C.Component {
  /**
   * This only mounts projection nodes for components that
   * need measuring, we might want to do it for all components
   * in order to incorporate transforms
   */
  componentDidMount() {
    const { visualElement: n, layoutGroup: o, switchLayoutGroup: i, layoutId: a } = this.props, { projection: d } = n;
    d && (o.group && o.group.add(d), i && i.register && a && i.register(d), ac && d.root.didUpdate(), d.addEventListener("animationComplete", () => {
      this.safeToRemove();
    }), d.setOptions({
      ...d.options,
      layoutDependency: this.props.layoutDependency,
      onExitComplete: () => this.safeToRemove()
    })), pa.hasEverUpdated = !0;
  }
  getSnapshotBeforeUpdate(n) {
    const { layoutDependency: o, visualElement: i, drag: a, isPresent: d } = this.props, { projection: c } = i;
    return c && (c.isPresent = d, n.layoutDependency !== o && c.setOptions({
      ...c.options,
      layoutDependency: o
    }), ac = !0, a || n.layoutDependency !== o || o === void 0 || n.isPresent !== d ? c.willUpdate() : this.safeToRemove(), n.isPresent !== d && (d ? c.promote() : c.relegate() || Ae.postRender(() => {
      const p = c.getStack();
      (!p || !p.members.length) && this.safeToRemove();
    }))), null;
  }
  componentDidUpdate() {
    const { visualElement: n, layoutAnchor: o } = this.props, { projection: i } = n;
    i && (i.options.layoutAnchor = o, i.root.didUpdate(), Id.postRender(() => {
      !i.currentAnimation && i.isLead() && this.safeToRemove();
    }));
  }
  componentWillUnmount() {
    const { visualElement: n, layoutGroup: o, switchLayoutGroup: i } = this.props, { projection: a } = n;
    ac = !0, a && (a.scheduleCheckAfterUnmount(), o && o.group && o.group.remove(a), i && i.deregister && i.deregister(a));
  }
  safeToRemove() {
    const { safeToRemove: n } = this.props;
    n && n();
  }
  render() {
    return null;
  }
}
function d0(e) {
  const [n, o] = qv(), i = C.useContext(vd);
  return w.jsx(HA, { ...e, layoutGroup: i, switchLayoutGroup: C.useContext(s0), isPresent: n, safeToRemove: o });
}
const WA = {
  pan: {
    Feature: UA
  },
  drag: {
    Feature: $A,
    ProjectionNode: Jv,
    MeasureLayout: d0
  }
};
function By(e, n, o) {
  const { props: i } = e;
  e.animationState && i.whileHover && e.animationState.setActive("whileHover", o === "Start");
  const a = "onHover" + o, d = i[a];
  d && Ae.postRender(() => d(n, Pi(n)));
}
class GA extends Zn {
  mount() {
    const { current: n } = this.node;
    n && (this.unmount = mT(n, (o, i) => (By(this.node, i, "Start"), (a) => By(this.node, a, "End"))));
  }
  unmount() {
  }
}
class KA extends Zn {
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
    this.unmount = Ai(Si(this.node.current, "focus", () => this.onFocus()), Si(this.node.current, "blur", () => this.onBlur()));
  }
  unmount() {
  }
}
function zy(e, n, o) {
  const { props: i } = e;
  if (e.current instanceof HTMLButtonElement && e.current.disabled)
    return;
  e.animationState && i.whileTap && e.animationState.setActive("whileTap", o === "Start");
  const a = "onTap" + (o === "End" ? "" : o), d = i[a];
  d && Ae.postRender(() => d(n, Pi(n)));
}
class YA extends Zn {
  mount() {
    const { current: n } = this.node;
    if (!n)
      return;
    const { globalTapTarget: o, propagate: i } = this.node.props;
    this.unmount = wT(n, (a, d) => (zy(this.node, d, "Start"), (c, { success: p }) => zy(this.node, c, p ? "End" : "Cancel")), {
      useGlobalTarget: o,
      stopPropagation: (i == null ? void 0 : i.tap) === !1
    });
  }
  unmount() {
  }
}
const Wc = /* @__PURE__ */ new WeakMap(), lc = /* @__PURE__ */ new WeakMap(), QA = (e) => {
  const n = Wc.get(e.target);
  n && n(e);
}, XA = (e) => {
  e.forEach(QA);
};
function ZA({ root: e, ...n }) {
  const o = e || document;
  lc.has(o) || lc.set(o, {});
  const i = lc.get(o), a = JSON.stringify(n);
  return i[a] || (i[a] = new IntersectionObserver(XA, { root: e, ...n })), i[a];
}
function JA(e, n, o) {
  const i = ZA(n);
  return Wc.set(e, o), i.observe(e), () => {
    Wc.delete(e), i.unobserve(e);
  };
}
const qA = {
  some: 0,
  all: 1
};
class eC extends Zn {
  constructor() {
    super(...arguments), this.hasEnteredView = !1, this.isInView = !1;
  }
  startObserver() {
    var m;
    (m = this.stopObserver) == null || m.call(this);
    const { viewport: n = {} } = this.node.getProps(), { root: o, margin: i, amount: a = "some", once: d } = n, c = {
      root: o ? o.current : void 0,
      rootMargin: i,
      threshold: typeof a == "number" ? a : qA[a]
    }, p = (y) => {
      const { isIntersecting: g } = y;
      if (this.isInView === g || (this.isInView = g, d && !g && this.hasEnteredView))
        return;
      g && (this.hasEnteredView = !0), this.node.animationState && this.node.animationState.setActive("whileInView", g);
      const { onViewportEnter: l, onViewportLeave: f } = this.node.getProps(), S = g ? l : f;
      S && S(y);
    };
    this.stopObserver = JA(this.node.current, c, p);
  }
  mount() {
    this.startObserver();
  }
  update() {
    if (typeof IntersectionObserver > "u")
      return;
    const { props: n, prevProps: o } = this.node;
    ["amount", "margin", "root"].some(tC(n, o)) && this.startObserver();
  }
  unmount() {
    var n;
    (n = this.stopObserver) == null || n.call(this), this.hasEnteredView = !1, this.isInView = !1;
  }
}
function tC({ viewport: e = {} }, { viewport: n = {} } = {}) {
  return (o) => e[o] !== n[o];
}
const nC = {
  inView: {
    Feature: eC
  },
  tap: {
    Feature: YA
  },
  focus: {
    Feature: KA
  },
  hover: {
    Feature: GA
  }
}, rC = {
  layout: {
    ProjectionNode: Jv,
    MeasureLayout: d0
  }
}, oC = {
  ...bA,
  ...nC,
  ...WA,
  ...rC
}, vn = /* @__PURE__ */ _A(oC, TA);
function iC(e) {
  const o = String(e || "").toLowerCase().split(".");
  if (o.length !== 4 || o.some((a) => !/^\d+$/.test(a))) return !1;
  const i = o.map(Number);
  return i.some((a) => a < 0 || a > 255) ? !1 : i[0] === 10 || i[0] === 172 && i[1] >= 16 && i[1] <= 31 || i[0] === 192 && i[1] === 168;
}
function f0(e) {
  const n = String(e || "").toLowerCase();
  return n === "127.0.0.1" || n === "localhost" || n === "::1" || n === "[::1]";
}
function $y(e) {
  return f0(e) || iC(e);
}
function sC(e) {
  return !e || f0(e) ? "127.0.0.1" : e;
}
const aC = (() => {
  var g, l, f, S;
  const e = globalThis.window || globalThis, n = globalThis.document || {}, o = e.location || {}, i = String(e.SYNAPSE_DATA_API_PORT || ((l = (g = n.body) == null ? void 0 : g.dataset) == null ? void 0 : l.dataApiPort) || "3001").trim(), { protocol: a = "file:", hostname: d = "127.0.0.1", port: c = "" } = o, p = `http://${sC(d)}:${i || "3001"}`, m = String(e.SYNAPSE_DATA_API_BASE || ((S = (f = n.body) == null ? void 0 : f.dataset) == null ? void 0 : S.dataApiBase) || "").replace(/\/+$/, ""), y = `${a}//${o.host || (c ? `${d}:${c}` : d)}`.replace(/\/+$/, "");
  return m && !($y(d) && c !== i && m === y) ? m : a === "file:" || $y(d) && c !== i ? p : `${a}//${o.host || d}`;
})(), lC = new kg(aC), uc = Number((globalThis.window || globalThis).SYNAPSE_DATA_API_TIMEOUT_MS || 6e3), uC = Number.isFinite(uc) && uc > 0 ? uc : 6e3;
function cC(e, n) {
  typeof window > "u" || console.warn(e, n);
}
async function dC(e) {
  var i, a;
  const o = (((a = (i = e.headers) == null ? void 0 : i.get) == null ? void 0 : a.call(i, "content-type")) || "").includes("application/json") ? await e.json() : {};
  if (!e.ok || (o == null ? void 0 : o.ok) === !1)
    throw new Error((o == null ? void 0 : o.error) || `Synapse data API returned HTTP ${e.status}`);
  return o;
}
async function fC(e, n = {}) {
  const o = await lC.fetch(e, {
    timeoutMs: uC,
    ...n
  });
  return dC(o);
}
async function pC(e) {
  try {
    return (await fC("/api/focus-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(e || {})
    })).item || null;
  } catch (n) {
    return cC("Synapse data API focus-session save skipped:", n), null;
  }
}
class mC {
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
const p0 = new mC();
function Wd(e, n) {
  return p0.readJSON(e, n);
}
function Gd(e, n) {
  return p0.writeJSON(e, n);
}
const m0 = "synapse.focusRoom.sessions.v1", h0 = "synapse.focusRoom.draft.v1", y0 = "synapse.focusRoom.active-session.v1", Gc = 40, Uy = Object.freeze([
  "idle",
  "running",
  "paused",
  "completed",
  "break",
  "restoring"
]), hC = Object.freeze({
  studying: "running",
  running: "running",
  idle: "idle",
  paused: "paused",
  completed: "completed",
  break: "break",
  restoring: "restoring"
});
let Kc = [];
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
], yC = [
  {
    ...Sn[0],
    name: "清晨窗边",
    kicker: "晨光 · 植物",
    description: "A bright morning desk beside a leafy window."
  },
  ...Sn.filter((e) => e.galleryOnly)
], g0 = [25, 45, 50, 90];
function gC(e = "") {
  const n = String(e || "");
  return Kn.find((o) => o.label === n) || Kn[0];
}
function vC(e = "") {
  const n = String(e || "");
  return Yn.find((o) => o.label === n) || Yn[0];
}
function Ua(e = {}) {
  const n = gC(e == null ? void 0 : e.musicType), o = vC(e == null ? void 0 : e.ambientSound);
  return {
    musicTrack: n,
    ambientSound: o,
    ambientLayers: o.layers.map((i) => ({
      ...i,
      volumeBias: Hn(i.volumeBias, 1)
    }))
  };
}
function SC(e) {
  return e && typeof e == "object" && !Array.isArray(e) ? e : {};
}
function v0(e) {
  return String(e || "").trim();
}
function wC({ material: e, goal: n, durationMinutes: o }) {
  var g;
  const i = Math.max(10, Number(o) || 25), a = (g = e == null ? void 0 : e.studyHeadings) != null && g.length ? e.studyHeadings : ["Key ideas", "Examples", "Practice", "Review"], d = String(n || "").trim() || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`, c = Math.max(1, Math.floor(i * 0.2)), p = Math.max(1, Math.floor(i * 0.4)), m = Math.max(1, Math.floor(i * 0.2)), y = Math.max(1, i - c - p - m);
  return [
    { minutes: c, task: `Set the goal: ${d}` },
    { minutes: p, task: `Review ${a[0] || "the core ideas"}` },
    { minutes: m, task: `Practice with ${a[1] || a[0] || "the generated examples"}` },
    { minutes: y, task: "Summarize mistakes and choose the next study step" }
  ];
}
function S0() {
  return Wd(h0, null);
}
function xC(e) {
  return Gd(h0, e || null);
}
function w0(e) {
  if (!e || typeof e != "object")
    return { materials: {} };
  const n = SC(e.materials);
  return {
    ...e,
    materials: { ...n }
  };
}
function po(e, n = "idle") {
  const o = hC[String(e || "").trim().toLowerCase()];
  return o && Uy.includes(o) ? o : Uy.includes(n) ? n : "idle";
}
function Kd(e) {
  return po(e) === "running" ? "studying" : po(e);
}
function x0(e = {}, n = {}) {
  const o = e && typeof e == "object" ? e : {}, i = n && typeof n == "object" ? n : {}, a = Object.prototype.hasOwnProperty.call(o, "timerStatus"), d = Object.prototype.hasOwnProperty.call(o, "timerState") || Object.prototype.hasOwnProperty.call(o, "timerPhase"), c = po(
    d ? o.timerState || o.timerPhase : a ? o.timerStatus : o.status || i.timerState,
    po(i.timerState || i.timerPhase || i.timerStatus)
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
    timerStatus: Kd(c),
    timerMode: p,
    elapsedSeconds: g,
    ...y
  };
}
function _0() {
  return w0(Wd(y0, null));
}
function _C(e) {
  return Gd(y0, w0(e));
}
function T0(e) {
  const n = v0(e);
  if (!n) return null;
  const i = _0().materials[n];
  return i && typeof i == "object" ? x0(i) : null;
}
function Yd(e, n) {
  const o = v0(e);
  if (!o) return !1;
  const i = _0();
  return n && typeof n == "object" ? i.materials[o] = {
    ...x0(n, i.materials[o]),
    materialId: o,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  } : delete i.materials[o], _C(i);
}
function ma(e) {
  return Yd(e, null);
}
function Yc() {
  const e = Wd(m0, []), n = Array.isArray(e) ? e : [], o = /* @__PURE__ */ new Set();
  return [...Kc, ...n].filter((i) => {
    const a = String((i == null ? void 0 : i.sessionId) || "");
    return !a || o.has(a) ? !1 : (o.add(a), !0);
  }).slice(0, Gc);
}
function Hn(e, n) {
  const o = Number(e);
  return Number.isFinite(o) ? o : n;
}
function TC(e = {}) {
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
  }, persisted: !0 }, a = Yc().filter((m) => m.sessionId !== i.sessionId), d = [i, ...a.map((m) => ({ ...m, persisted: !0 }))].slice(0, Gc), c = Gd(m0, d), p = { ...i, persisted: c };
  return pC(p).catch((m) => {
    console.warn("Synapse data API focus-session background save failed:", m);
  }), c ? Kc = [] : Kc = [p, ...a].slice(0, Gc), p;
}
function k0(e) {
  const n = Math.max(0, Hn(e || 0, 0)), o = Math.floor(n / 3600), i = Math.floor(n % 3600 / 60);
  return o ? `${o}h ${i}m` : `${i}m`;
}
var xg;
const Qc = ((xg = Sn[0]) == null ? void 0 : xg.id) || "morning-window", lo = g0[0] || 25, kC = 10, Ha = 180, Qd = 60, A0 = Ha * 60, AC = 0, CC = 100, bC = ["materials", "notes", "sources", "chat", "quiz", "flashcards", "mindmap", "plan", "workspace", "history"], Xc = new Set(bC), Ea = {
  type: "spring",
  stiffness: 120,
  damping: 18,
  mass: 0.8
};
function PC(e, n, o, i) {
  const a = Number(e);
  return Number.isFinite(a) ? Math.min(i, Math.max(o, a)) : n;
}
function _r(e, n, o, i) {
  return Math.round(PC(e, n, o, i));
}
function _t(e, n = 50) {
  return _r(e, n, AC, CC);
}
function Sr(e, n = lo) {
  return _r(e, n, kC, Ha);
}
function tn(e, n = lo * 60) {
  return _r(e, n, Qd, A0);
}
function Ma(e) {
  return Sn.find((n) => n.id === e) || null;
}
function gn(e = Qc) {
  return Ma(e) || Sn[0] || {
    id: Qc,
    name: "Focus Room",
    kicker: "Focus",
    description: "A quiet study space.",
    image: "",
    ambientSound: "Nature",
    musicType: "Deep Focus"
  };
}
function C0(e) {
  return Array.isArray(e) ? e.map((n) => ({
    minutes: _r(n == null ? void 0 : n.minutes, 5, 1, Ha),
    task: String((n == null ? void 0 : n.task) || "").trim()
  })).filter((n) => n.task) : [];
}
function ui(e) {
  return Array.isArray(e) ? e.map((n) => ({
    role: String((n == null ? void 0 : n.role) || "assistant") === "user" ? "user" : "assistant",
    text: String((n == null ? void 0 : n.text) || "").trim(),
    createdAt: (n == null ? void 0 : n.createdAt) || (/* @__PURE__ */ new Date()).toISOString()
  })).filter((n) => n.text).slice(-24) : [];
}
function b0(e) {
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
function Zc(e, n, o) {
  return e ? wC({
    material: e,
    goal: n,
    durationMinutes: o
  }) : [];
}
function wi(e) {
  const n = Sr(e);
  return n > 0 ? n * 60 : 0;
}
function Jc(e) {
  const n = Math.max(0, Math.floor(Number(e) || 0)), o = Math.floor(n / 3600), i = Math.floor(n % 3600 / 60), a = n % 60, d = (c) => String(c).padStart(2, "0");
  return o ? `${o}:${d(i)}:${d(a)}` : `${d(i)}:${d(a)}`;
}
function Hy(e) {
  const n = (e == null ? void 0 : e.flashcards) || [];
  return Array.isArray(n) ? n.slice(0, 24) : [];
}
function EC(e, n) {
  return String((e == null ? void 0 : e.id) || (e == null ? void 0 : e.front) || (e == null ? void 0 : e.term) || n);
}
function MC(e) {
  var n;
  return Array.isArray(e == null ? void 0 : e.questions) ? e.questions : Array.isArray((n = e == null ? void 0 : e.quiz) == null ? void 0 : n.questions) ? e.quiz.questions : [];
}
function qc(e) {
  return (Array.isArray(e == null ? void 0 : e.quizzes) ? e.quizzes : []).flatMap((o) => MC(o).map((i) => {
    var a;
    return {
      ...i,
      quizTitle: (o == null ? void 0 : o.title) || ((a = o == null ? void 0 : o.quiz) == null ? void 0 : a.title) || "Saved quiz"
    };
  })).slice(0, 12);
}
function RC(e, n) {
  return (e == null ? void 0 : e.question) || (e == null ? void 0 : e.prompt) || (e == null ? void 0 : e.stem) || `Question ${n + 1}`;
}
function Xd(e) {
  return String((e == null ? void 0 : e.type) || "").toLowerCase();
}
function DC(e) {
  return String((e == null ? void 0 : e.label) || (e == null ? void 0 : e.text) || e).trim();
}
function Ra(e) {
  const n = (e == null ? void 0 : e.choices) || (e == null ? void 0 : e.options) || (e == null ? void 0 : e.answers);
  return Array.isArray(n) && n.length ? n.map(DC).filter(Boolean) : Xd(e) === "true_false" ? ["True", "False"] : [];
}
function ed(e) {
  const n = (e == null ? void 0 : e.correctOptionIndexes) || (e == null ? void 0 : e.correct_option_indexes) || (e == null ? void 0 : e.correctIndexes);
  return Array.isArray(n) ? n.map((o) => Number(o)).filter(Number.isInteger) : [];
}
function NC(e, n) {
  const o = Array.isArray(e) ? [...e].map(Number).filter(Number.isInteger).sort((a, d) => a - d) : [], i = Array.isArray(n) ? [...n].map(Number).filter(Number.isInteger).sort((a, d) => a - d) : [];
  return o.length === i.length && o.every((a, d) => a === i[d]);
}
function Tr(e) {
  return String(e || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function Da(e, n) {
  if (Number.isInteger(n)) return n;
  const o = Number(n);
  if (typeof n != "string" && Number.isInteger(o)) return o;
  const i = Ra(e), a = Tr(n);
  return i.findIndex((d) => Tr(d) === a);
}
function P0(e, n) {
  if (typeof n == "boolean") return n;
  if (n === 0) return !0;
  if (n === 1) return !1;
  const o = Ra(e), i = Tr(n);
  return i === "true" ? !0 : i === "false" ? !1 : Tr(o[0]) === i ? !0 : Tr(o[1]) === i ? !1 : null;
}
function jC(e, n, o) {
  const i = Xd(e);
  if (i === "multiple_choice") {
    const a = Da(e, n);
    if (!Number.isInteger(a) || a < 0) return [];
    const d = Array.isArray(o) ? [...o] : [];
    return d.includes(a) ? d.filter((c) => c !== a) : [...d, a].sort((c, p) => c - p);
  }
  if (i === "single_choice") {
    const a = Da(e, n);
    return Number.isInteger(a) && a >= 0 ? a : "";
  }
  if (i === "true_false") {
    const a = P0(e, n);
    return a === null ? "" : a;
  }
  return String(n || "");
}
function E0(e) {
  const n = (e == null ? void 0 : e.correctAnswer) ?? (e == null ? void 0 : e.correct_answer) ?? (e == null ? void 0 : e.answer) ?? (e == null ? void 0 : e.correct), o = ed(e);
  if (o.length) {
    const i = Ra(e);
    return o.map((a) => i[a] || "").filter(Boolean).join(", ");
  }
  if (typeof (e == null ? void 0 : e.correctBoolean) == "boolean" || typeof (e == null ? void 0 : e.correct_boolean) == "boolean") {
    const i = Ra(e);
    return (typeof e.correctBoolean == "boolean" ? e.correctBoolean : e.correct_boolean) ? i[0] || "True" : i[1] || "False";
  }
  return e != null && e.expectedAnswer || e != null && e.expected_answer ? String(e.expectedAnswer || e.expected_answer || "").trim() : Array.isArray(n) ? n.map((i) => String(i)).join(", ") : String(n || "").trim();
}
function IC(e, n) {
  const o = Xd(e);
  if (o === "single_choice") {
    const a = ed(e)[0], d = Da(e, n);
    return Number.isInteger(a) ? d === a : null;
  }
  if (o === "multiple_choice") {
    const a = ed(e), d = Array.isArray(n) ? n : [Da(e, n)].filter(Number.isInteger);
    return a.length ? NC(d, a) : null;
  }
  if (o === "true_false") {
    const a = typeof (e == null ? void 0 : e.correctBoolean) == "boolean" ? e.correctBoolean : e == null ? void 0 : e.correct_boolean, d = P0(e, n);
    return typeof a == "boolean" && d !== null ? d === a : null;
  }
  const i = E0(e);
  return i ? Tr(n) === Tr(i) : null;
}
function M0(e, n, o) {
  var p;
  const i = String(e || "").trim(), a = String((n == null ? void 0 : n.summaryText) || (n == null ? void 0 : n.aiSummary) || "").slice(0, 420), d = ((p = n == null ? void 0 : n.studyHeadings) == null ? void 0 : p[0]) || (n == null ? void 0 : n.materialTitle) || "this material", c = o || `Study ${(n == null ? void 0 : n.materialTitle) || "this material"}`;
  return i ? [
    `For ${d}: ${a || "use the selected material as your main source."}`,
    `Your current goal is: ${c}.`,
    "Try explaining the idea in one sentence, then test yourself with one example before moving on."
  ].join(" ") : "";
}
function FC() {
  return /* @__PURE__ */ w.jsx("svg", { className: "liquid-glass-filter-defs", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ w.jsx("defs", { children: /* @__PURE__ */ w.jsxs("filter", { id: "liquid-glass-displacement", x: "-12%", y: "-12%", width: "124%", height: "124%", colorInterpolationFilters: "sRGB", children: [
    /* @__PURE__ */ w.jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.012 0.024", numOctaves: "2", seed: "17", result: "liquid-noise" }),
    /* @__PURE__ */ w.jsx("feDisplacementMap", { in: "SourceGraphic", in2: "liquid-noise", scale: "7", xChannelSelector: "R", yChannelSelector: "B", result: "refracted-surface" }),
    /* @__PURE__ */ w.jsx("feColorMatrix", { in: "refracted-surface", type: "matrix", values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.04 0", result: "edge-alpha" }),
    /* @__PURE__ */ w.jsx("feGaussianBlur", { in: "edge-alpha", stdDeviation: "0.25", result: "soft-edge" }),
    /* @__PURE__ */ w.jsx("feBlend", { in: "soft-edge", in2: "refracted-surface", mode: "screen" })
  ] }) }) });
}
function OC({ scene: e }) {
  const [n, o] = C.useState(!1), [i, a] = C.useState(!1);
  return C.useEffect(() => {
    o(!1), a(!1);
  }, [e == null ? void 0 : e.id]), /* @__PURE__ */ w.jsxs("div", { className: "focus-background-wrap", "aria-hidden": "true", children: [
    /* @__PURE__ */ w.jsx(FC, {}),
    /* @__PURE__ */ w.jsx(za, { mode: "wait", children: /* @__PURE__ */ w.jsxs(
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
const LC = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), VC = (e) => e.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (n, o, i) => i ? i.toUpperCase() : o.toLowerCase()
), Wy = (e) => {
  const n = VC(e);
  return n.charAt(0).toUpperCase() + n.slice(1);
}, R0 = (...e) => e.filter((n, o, i) => !!n && n.trim() !== "" && i.indexOf(n) === o).join(" ").trim(), BC = (e) => {
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
var zC = {
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
const $C = C.forwardRef(
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
      ...zC,
      width: n,
      height: n,
      stroke: e,
      strokeWidth: i ? Number(o) * 24 / Number(n) : o,
      className: R0("lucide", a),
      ...!d && !BC(p) && { "aria-hidden": "true" },
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
    ({ className: i, ...a }, d) => C.createElement($C, {
      ref: d,
      iconNode: n,
      className: R0(
        `lucide-${LC(Wy(e))}`,
        `lucide-${e}`,
        i
      ),
      ...a
    })
  );
  return o.displayName = Wy(e), o;
};
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const UC = [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
], HC = Te("arrow-left", UC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const WC = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
], GC = Te("arrow-right", WC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const KC = [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]], Wa = Te("check", KC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const YC = [["path", { d: "m15 18-6-6 6-6", key: "1wnfg3" }]], QC = Te("chevron-left", YC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const XC = [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]], ZC = Te("chevron-right", XC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const JC = [
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
], qC = Te("coffee", JC);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const eb = [
  ["rect", { width: "12", height: "12", x: "2", y: "10", rx: "2", ry: "2", key: "6agr2n" }],
  [
    "path",
    { d: "m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6", key: "1o487t" }
  ],
  ["path", { d: "M6 18h.01", key: "uhywen" }],
  ["path", { d: "M10 14h.01", key: "ssrbsk" }],
  ["path", { d: "M15 6h.01", key: "cblpky" }],
  ["path", { d: "M18 9h.01", key: "2061c0" }]
], tb = Te("dices", eb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const nb = [
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
], rb = Te("door-open", nb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ob = [
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
], Na = Te("footprints", ob);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ib = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }],
  ["path", { d: "M12 7v5l4 2", key: "1fdv2h" }]
], sb = Te("history", ib);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ab = [
  ["path", { d: "m14 10 7-7", key: "oa77jy" }],
  ["path", { d: "M20 10h-6V4", key: "mjg0md" }],
  ["path", { d: "m3 21 7-7", key: "tjx5ai" }],
  ["path", { d: "M4 14h6v6", key: "rmj7iw" }]
], lb = Te("minimize-2", ab);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ub = [
  ["circle", { cx: "8", cy: "18", r: "4", key: "1fc0mg" }],
  ["path", { d: "M12 18V2l7 4", key: "g04rme" }]
], cb = Te("music-2", ub);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const db = [
  ["rect", { x: "14", y: "4", width: "4", height: "16", rx: "1", key: "zuxfzm" }],
  ["rect", { x: "6", y: "4", width: "4", height: "16", rx: "1", key: "1okwgv" }]
], Gy = Te("pause", db);
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
      d: "M18.5 8c-1.4 0-2.6-.8-3.2-2A6.87 6.87 0 0 0 2 9v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.5C22 9.6 20.4 8 18.5 8",
      key: "lag0yf"
    }
  ],
  ["path", { d: "M2 14h20", key: "myj16y" }],
  ["path", { d: "M6 14v4", key: "9ng0ue" }],
  ["path", { d: "M10 14v4", key: "1v8uk5" }],
  ["path", { d: "M14 14v4", key: "1tqops" }],
  ["path", { d: "M18 14v4", key: "18uqwm" }]
], pb = Te("piano", fb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const mb = [["polygon", { points: "6 3 20 12 6 21 6 3", key: "1oa8hb" }]], hb = Te("play", mb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const yb = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
], gb = Te("plus", yb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const vb = [
  ["path", { d: "M4.9 19.1C1 15.2 1 8.8 4.9 4.9", key: "1vaf9d" }],
  ["path", { d: "M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5", key: "u1ii0m" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }],
  ["path", { d: "M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5", key: "1j5fej" }],
  ["path", { d: "M19.1 4.9C23 8.8 23 15.1 19.1 19", key: "10b0cb" }]
], Sb = Te("radio", vb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const wb = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
], xb = Te("rotate-ccw", wb);
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
      d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
      key: "1c8476"
    }
  ],
  ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7", key: "1ydtos" }],
  ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7", key: "t51u73" }]
], D0 = Te("save", _b);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Tb = [
  ["path", { d: "M14 17H5", key: "gfn3mx" }],
  ["path", { d: "M19 7h-9", key: "6i9tg" }],
  ["circle", { cx: "17", cy: "17", r: "3", key: "18b49y" }],
  ["circle", { cx: "7", cy: "7", r: "3", key: "dfmy0x" }]
], N0 = Te("settings-2", Tb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const kb = [
  ["path", { d: "m18 14 4 4-4 4", key: "10pe0f" }],
  ["path", { d: "m18 2 4 4-4 4", key: "pucp1d" }],
  ["path", { d: "M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22", key: "1ailkh" }],
  ["path", { d: "M2 6h1.972a4 4 0 0 1 3.6 2.2", key: "km57vx" }],
  ["path", { d: "M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45", key: "os18l9" }]
], Ab = Te("shuffle", kb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Cb = [
  ["polygon", { points: "5 4 15 12 5 20 5 4", key: "16p6eg" }],
  ["line", { x1: "19", x2: "19", y1: "5", y2: "19", key: "futhcm" }]
], bb = Te("skip-forward", Cb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Pb = [
  ["line", { x1: "21", x2: "14", y1: "4", y2: "4", key: "obuewd" }],
  ["line", { x1: "10", x2: "3", y1: "4", y2: "4", key: "1q6298" }],
  ["line", { x1: "21", x2: "12", y1: "12", y2: "12", key: "1iu8h1" }],
  ["line", { x1: "8", x2: "3", y1: "12", y2: "12", key: "ntss68" }],
  ["line", { x1: "21", x2: "16", y1: "20", y2: "20", key: "14d8ph" }],
  ["line", { x1: "12", x2: "3", y1: "20", y2: "20", key: "m0wm8r" }],
  ["line", { x1: "14", x2: "14", y1: "2", y2: "6", key: "14e1ph" }],
  ["line", { x1: "8", x2: "8", y1: "10", y2: "14", key: "1i6ji0" }],
  ["line", { x1: "16", x2: "16", y1: "18", y2: "22", key: "1lctlv" }]
], Eb = Te("sliders-horizontal", Pb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Mb = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["circle", { cx: "12", cy: "12", r: "6", key: "1vlfrh" }],
  ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }]
], Rb = Te("target", Mb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Db = [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
], Nb = Te("trash-2", Db);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const jb = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744", key: "16gr8j" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }]
], ja = Te("users", jb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Ib = [
  [
    "path",
    {
      d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
      key: "uqj9uw"
    }
  ],
  ["path", { d: "M16 9a5 5 0 0 1 0 6", key: "1q6k2b" }],
  ["path", { d: "M19.364 18.364a9 9 0 0 0 0-12.728", key: "ijwkga" }]
], Ga = Te("volume-2", Ib);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Fb = [
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
], Zd = Te("waves", Fb);
/**
 * @license lucide-react v0.515.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Ob = [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
], j0 = Te("x", Ob), Ky = (e) => {
  let n;
  const o = /* @__PURE__ */ new Set(), i = (y, g) => {
    const l = typeof y == "function" ? y(n) : y;
    if (!Object.is(l, n)) {
      const f = n;
      n = g ?? (typeof l != "object" || l === null) ? l : Object.assign({}, n, l), o.forEach((S) => S(n, f));
    }
  }, a = () => n, p = { setState: i, getState: a, getInitialState: () => m, subscribe: (y) => (o.add(y), () => o.delete(y)) }, m = n = e(i, a, p);
  return p;
}, Lb = ((e) => e ? Ky(e) : Ky), Vb = (e) => e;
function Bb(e, n = Vb) {
  const o = yn.useSyncExternalStore(
    e.subscribe,
    yn.useCallback(() => n(e.getState()), [e, n]),
    yn.useCallback(() => n(e.getInitialState()), [e, n])
  );
  return yn.useDebugValue(o), o;
}
const Yy = (e) => {
  const n = Lb(e), o = (i) => Bb(n, i);
  return Object.assign(o, n), o;
}, zb = ((e) => e ? Yy(e) : Yy), $b = /* @__PURE__ */ new Set(["pending", "active", "done"]);
function I0() {
  return `topic-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function Ia(e = {}, n = "pending") {
  const o = String(e.title || e.name || "").trim(), i = String(e.description || e.detail || e.notes || "").trim(), a = $b.has(e.status) ? e.status : n;
  return {
    id: String(e.id || "").trim() || I0(),
    title: o || "Untitled topic",
    description: i,
    status: a
  };
}
function mr(e, n = "Deep work block") {
  const o = Array.isArray(e) ? e.map((c) => Ia(c)).filter(Boolean) : [];
  if (!o.length) {
    const c = Ia({
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
function Jd(e = [], n = "") {
  const o = Array.isArray(e) ? e : [];
  return o.find((i) => i.id === n) || o.find((i) => i.status === "active") || o.find((i) => i.status !== "done") || o[0] || null;
}
function cc(e = [], n = "") {
  var d;
  const o = Array.isArray(e) ? e.map((c) => ({ ...c })) : [];
  if (!o.length)
    return mr([], "Deep work block");
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
function Ub() {
  return Sn[0] || gn(Qc);
}
function td(e) {
  const n = String(e || "");
  if (!n) return null;
  const i = b0(S0()).materials[n];
  return i && typeof i == "object" ? i : null;
}
function it(e) {
  var i;
  const n = String(e.selectedMaterialId || ((i = e.selectedMaterial) == null ? void 0 : i.materialId) || "");
  if (!n) return;
  const o = b0(S0());
  o.materials[n] = {
    materialId: n,
    selectedScene: e.selectedScene,
    musicType: e.musicType,
    ambientSound: e.ambientSound,
    musicVolume: _t(e.musicVolume),
    ambientVolume: _t(e.ambientVolume),
    audioChannels: { ...mi, ...e.audioChannels || {} },
    durationMinutes: Sr(e.pomodoroDuration),
    durationSeconds: tn(e.pomodoroDurationSeconds, wi(e.pomodoroDuration)),
    studyGoal: e.studyGoal,
    focusTopics: Array.isArray(e.focusTopics) ? e.focusTopics : [],
    activeTopicId: String(e.activeTopicId || ""),
    studyPlan: C0(e.studyPlan),
    completedTasks: Array.isArray(e.completedTasks) ? e.completedTasks.filter(Boolean) : [],
    workspaceNotes: String(e.workspaceNotes || ""),
    workspaceUpdatedAt: e.workspaceUpdatedAt || "",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }, xC(o);
}
function Hb(e) {
  return Array.isArray(e == null ? void 0 : e.completedTasks) ? e.completedTasks.map((n) => String(n || "").trim()).filter(Boolean) : [];
}
function nd(e = {}) {
  return {
    sectionTitle: String(e.sectionTitle || "").trim(),
    excerpt: String(e.excerpt || "").trim().slice(0, 1800)
  };
}
function F0(e = null) {
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
  return po(e.timerState || e.timerPhase || e.status || e.timerStatus);
}
function yr(e = {}) {
  const n = Number(e.pomodoroDurationSeconds);
  return Number.isFinite(n) && n > 0 ? tn(n, wi(e.pomodoroDuration)) : wi(e.pomodoroDuration);
}
function Wn(e = {}) {
  if (e.timerMode === "countup") return 0;
  const n = Number(e.timerDurationSeconds);
  return Number.isFinite(n) && n > 0 ? n : yr(e);
}
function Fa(e = {}, n = st()) {
  const o = Math.max(0, Number(e.elapsedSeconds) || 0);
  if (Ut(e) !== "running") return o;
  const i = Number(e.timerAnchorAtMs);
  return !Number.isFinite(i) || i <= 0 ? o : Math.max(o, Math.floor(Math.max(0, n - i) / 1e3));
}
function Mt(e, n = st()) {
  const o = po(e);
  return {
    timerState: o,
    timerPhase: o,
    status: o,
    timerStatus: Kd(o),
    timerUpdatedAtMs: n
  };
}
function Wb(e = {}) {
  const n = Ut(e);
  return {
    timerState: n,
    timerPhase: n,
    status: n,
    timerStatus: Kd(n),
    timerMode: e.timerMode === "countup" ? "countup" : "countdown",
    timerAnchorAtMs: Number.isFinite(Number(e.timerAnchorAtMs)) ? Number(e.timerAnchorAtMs) : null,
    timerPausedAtMs: Number.isFinite(Number(e.timerPausedAtMs)) ? Number(e.timerPausedAtMs) : null,
    timerUpdatedAtMs: Number.isFinite(Number(e.timerUpdatedAtMs)) ? Number(e.timerUpdatedAtMs) : null,
    timerRestoredAtMs: Number.isFinite(Number(e.timerRestoredAtMs)) ? Number(e.timerRestoredAtMs) : null,
    timerDurationSeconds: Wn(e),
    pomodoroDuration: e.pomodoroDuration,
    pomodoroDurationSeconds: yr(e),
    elapsedSeconds: Math.max(0, Number(e.elapsedSeconds) || 0),
    startedAt: e.startedAt || null,
    currentSession: e.currentSession || null,
    view: e.view
  };
}
function zn(e) {
  var o;
  const n = String(e.selectedMaterialId || ((o = e.selectedMaterial) == null ? void 0 : o.materialId) || "");
  return !n || e.view !== "session" ? !1 : Yd(n, Wb(e));
}
function Qy(e, n = st()) {
  const o = Fa(e, n), i = Wn(e), a = e.timerMode !== "countup" && i > 0 && o >= i, d = a ? "completed" : Ut(e);
  return {
    ...Mt(d, n),
    elapsedSeconds: a ? i : o,
    timerAnchorAtMs: d === "running" ? e.timerAnchorAtMs : null,
    timerPausedAtMs: d === "running" ? null : e.timerPausedAtMs || n,
    audioPlaying: d === "running" ? e.audioPlaying : !1
  };
}
function Gb(e, n = {}) {
  const o = gn(n.selectedScene), i = td(e == null ? void 0 : e.materialId), a = Ma(i == null ? void 0 : i.selectedScene) ? i.selectedScene : o.id, d = gn(a), c = String((i == null ? void 0 : i.musicType) || d.musicType || "Deep Focus"), p = String((i == null ? void 0 : i.ambientSound) || d.ambientSound || "Nature"), m = _t(i == null ? void 0 : i.musicVolume, n.musicVolume ?? 60), y = _t(i == null ? void 0 : i.ambientVolume, n.ambientVolume ?? 50), g = Sr(i == null ? void 0 : i.durationMinutes, n.pomodoroDuration ?? lo), l = tn(
    i == null ? void 0 : i.durationSeconds,
    n.pomodoroDurationSeconds ?? g * 60
  ), f = String((i == null ? void 0 : i.studyGoal) || `Study ${(e == null ? void 0 : e.materialTitle) || "this material"}`), S = C0(i == null ? void 0 : i.studyPlan), x = S.length ? S : Zc(e, f, g), k = Hb(i), A = String((i == null ? void 0 : i.workspaceNotes) || ""), T = (i == null ? void 0 : i.workspaceUpdatedAt) || (i == null ? void 0 : i.updatedAt) || "";
  return {
    selectedScene: a,
    musicType: c,
    ambientSound: p,
    musicVolume: m,
    ambientVolume: y,
    audioChannels: { ...mi, ...(i == null ? void 0 : i.audioChannels) || n.audioChannels || {} },
    pomodoroDuration: g,
    pomodoroDurationSeconds: l,
    studyGoal: f,
    studyPlan: x,
    completedTasks: k,
    workspaceNotes: A,
    workspaceUpdatedAt: T
  };
}
function Xy(e) {
  const n = T0(e);
  if (!n || typeof n != "object") return null;
  const o = Ut(n), i = st(), a = Number(n.timerAnchorAtMs), d = Date.parse(n.startedAt || ""), c = Number.isFinite(d) ? d : NaN, p = o === "running" ? Fa({
    ...n,
    timerState: "running",
    timerAnchorAtMs: Number.isFinite(a) && a > 0 ? a : c
  }, i) : Math.max(0, Number(n.elapsedSeconds) || 0), m = Wn(n), y = o === "running" ? m > 0 && p >= m ? "completed" : "paused" : o, g = o === "running";
  return {
    route: n.view === "session" ? "session" : "setup",
    view: n.view === "session" ? "session" : "setup",
    ...Mt(g ? "restoring" : y, i),
    timerRestoreTarget: g ? y : null,
    timerMode: n.timerMode === "countup" ? "countup" : "countdown",
    timerAnchorAtMs: null,
    timerPausedAtMs: g ? null : Number(n.timerPausedAtMs) || null,
    timerRestoredAtMs: g ? null : i,
    timerDurationSeconds: m,
    ...Number(n.pomodoroDurationSeconds) > 0 ? { pomodoroDurationSeconds: tn(n.pomodoroDurationSeconds) } : {},
    elapsedSeconds: m > 0 ? Math.min(m, p) : p,
    startedAt: n.startedAt || null,
    currentSession: n.currentSession || null,
    completedTasks: Array.isArray(n.completedTasks) ? n.completedTasks.filter(Boolean) : [],
    flashcardIndex: Math.max(0, Number(n.flashcardIndex) || 0),
    flashcardSide: n.flashcardSide === "back" ? "back" : "front",
    flashcardProgress: n.flashcardProgress && typeof n.flashcardProgress == "object" && !Array.isArray(n.flashcardProgress) ? n.flashcardProgress : {},
    quizAnswers: n.quizAnswers && typeof n.quizAnswers == "object" && !Array.isArray(n.quizAnswers) ? n.quizAnswers : {},
    quizChecked: n.quizChecked && typeof n.quizChecked == "object" && !Array.isArray(n.quizChecked) ? n.quizChecked : {},
    chatMessages: ui(n.chatMessages),
    chatPending: !1,
    chatError: "",
    panelTab: Xc.has(n.panelTab) ? n.panelTab : "materials",
    workspaceNotes: String(n.workspaceNotes || ""),
    workspaceUpdatedAt: n.workspaceUpdatedAt || n.updatedAt || "",
    activeNoteSection: String(n.activeNoteSection || ""),
    activeSourceHighlight: F0(n.activeSourceHighlight),
    assistantContext: nd(n.assistantContext),
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
function Kb(e) {
  return Object.values(e.flashcardProgress || {}).filter((n) => n && n.difficulty).length;
}
function Yb(e) {
  const n = Object.values(e.quizChecked || {}).filter((i) => i && i.hasKnownAnswer);
  if (!n.length) return null;
  const o = n.filter((i) => i.correct).length;
  return Math.round(o / n.length * 100);
}
function Qb(e) {
  const n = qc(e.selectedMaterial);
  return Object.entries(e.quizChecked || {}).filter(([, o]) => o && o.hasKnownAnswer && !o.correct).map(([o]) => RC(n[Number(o)], Number(o))).filter(Boolean);
}
async function Xb(e, n, o, i = {}) {
  var c, p;
  if (!globalThis.apiClient || typeof globalThis.apiClient.fetch != "function")
    return {
      answer: M0(e, o, Y.getState().studyGoal),
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
const Y = zb((e, n) => {
  const o = Ub(), i = td("focus-room"), a = Ma(i == null ? void 0 : i.selectedScene) ? gn(i.selectedScene) : o, d = Sr(i == null ? void 0 : i.durationMinutes, lo), c = tn(
    i == null ? void 0 : i.durationSeconds,
    wi(d)
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
    audioChannels: { ...mi, ...(i == null ? void 0 : i.audioChannels) || {} },
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
    ...mr(i == null ? void 0 : i.focusTopics, (i == null ? void 0 : i.studyGoal) || "Deep work block"),
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
      const p = n(), m = T0("focus-room"), y = Xy("focus-room"), g = Ut(m || {});
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
          audioChannels: { ...mi, ...(m == null ? void 0 : m.audioChannels) || p.audioChannels || {} },
          pomodoroDuration: Sr(m == null ? void 0 : m.pomodoroDuration, p.pomodoroDuration),
          pomodoroDurationSeconds: tn(
            m == null ? void 0 : m.pomodoroDurationSeconds,
            p.pomodoroDurationSeconds
          ),
          ...mr(
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
      const f = td("focus-room"), S = gn((f == null ? void 0 : f.selectedScene) || p.selectedScene), x = Sr(f == null ? void 0 : f.durationMinutes, p.pomodoroDuration || lo), k = tn(
        f == null ? void 0 : f.durationSeconds,
        p.pomodoroDurationSeconds || wi(x)
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
        audioChannels: { ...mi, ...(f == null ? void 0 : f.audioChannels) || p.audioChannels || {} },
        pomodoroDuration: x,
        pomodoroDurationSeconds: k,
        timerDurationSeconds: k,
        ...mr(
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
        ...Mt("idle", st()),
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
      it(p), ma("focus-room"), e({
        route: "setup",
        view: "setup",
        currentSession: null,
        summaryRecord: null,
        audioPlaying: !1,
        aiPanelOpen: !1,
        activeDrawer: "",
        elapsedSeconds: 0,
        startedAt: null,
        ...Mt("idle", st()),
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        timerDurationSeconds: yr(p)
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
      const S = g.selectedMaterialId === f, x = S && y ? null : Xy(f), k = S && y ? {} : Gb(m, g), A = S && y ? {} : {
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
        timerDurationSeconds: yr({
          pomodoroDuration: k.pomodoroDuration || lo,
          pomodoroDurationSeconds: k.pomodoroDurationSeconds
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
            ...Mt(b, D),
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
        sessionHistory: Yc()
      });
    },
    selectScene(p) {
      const m = Ma(p);
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
        const y = tn(p, m.pomodoroDurationSeconds), g = Math.max(1, Math.round(y / 60)), l = m.selectedMaterial ? Zc(m.selectedMaterial, m.studyGoal, g) : [], f = {
          pomodoroDuration: g,
          pomodoroDurationSeconds: y,
          studyPlan: l,
          timerDurationSeconds: m.timerMode === "countup" ? 0 : y
        };
        return it({ ...m, ...f }), f;
      });
    },
    setPomodoroDuration(p) {
      const m = Sr(p, n().pomodoroDuration);
      n().setPomodoroDurationSeconds(m * 60);
    },
    setStudyGoal(p) {
      e((m) => {
        var S;
        const y = String(p ?? ""), g = m.selectedMaterial ? Zc(m.selectedMaterial, y, m.pomodoroDuration) : [], l = Array.isArray(m.focusTopics) ? m.focusTopics.map((x) => x.id === m.activeTopicId || x.status === "active" ? { ...x, title: y || x.title, status: "active" } : x) : mr([], y).focusTopics, f = {
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
        const y = (m.focusTopics || []).some((S) => S.status === "active"), g = Ia({
          id: I0(),
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
        const g = (y.focusTopics || []).map((S) => S.id !== p ? S : Ia({
          ...S,
          ...m,
          id: S.id,
          status: S.status
        }, S.status)), l = Jd(g, y.activeTopicId), f = {
          focusTopics: g,
          activeTopicId: (l == null ? void 0 : l.id) || y.activeTopicId || "",
          studyGoal: (l == null ? void 0 : l.title) || y.studyGoal
        };
        return it({ ...y, ...f }), f;
      });
    },
    activateFocusTopic(p) {
      e((m) => {
        const y = cc(m.focusTopics, p);
        return it({ ...m, ...y }), y;
      });
    },
    finishFocusTopic(p = "") {
      e((m) => {
        const y = String(p || m.activeTopicId || ""), g = (m.focusTopics || []).map((f) => f.id === y ? { ...f, status: "done" } : f), l = cc(g);
        return it({ ...m, ...l }), l;
      });
    },
    removeFocusTopic(p) {
      e((m) => {
        const y = (m.focusTopics || []).filter((f) => f.id !== p);
        if (!y.length) {
          const f = mr([], m.studyGoal || "Deep work block");
          return it({ ...m, ...f }), f;
        }
        const l = m.activeTopicId === p || (m.focusTopics || []).some((f) => f.id === p && f.status === "active") ? cc(y) : mr(y, m.studyGoal);
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
      const m = Xc.has(String(p || "")) ? String(p) : "materials";
      e({
        panelTab: m,
        aiPanelOpen: !0,
        activeDrawer: ""
      });
    },
    selectSourceHighlight(p = null, { openPanel: m = !0 } = {}) {
      const y = F0(p);
      e({
        activeSourceHighlight: y,
        activeNoteSection: (y == null ? void 0 : y.sectionTitle) || n().activeNoteSection || "",
        assistantContext: y ? nd({
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
        panelTab: Xc.has(m) ? m : "materials",
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
        timerDurationSeconds: m === "countup" ? 0 : yr(p),
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
        ...Qs(),
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
        ...Mt("running", y),
        audioPlaying: !0,
        summaryRecord: null,
        elapsedSeconds: S,
        startedAt: !m.startedAt || f ? new Date(y).toISOString() : m.startedAt,
        timerAnchorAtMs: y - S * 1e3,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerRestoreTarget: null,
        timerDurationSeconds: l,
        ...f ? Qs() : {}
      };
      e(x), zn({ ...m, ...x });
    },
    pauseTimer({ pauseAudio: p = !0 } = {}) {
      const m = n(), y = st();
      if (Ut(m) !== "running") {
        p && m.audioPlaying && e({ audioPlaying: !1 });
        return;
      }
      const g = Qy(m, y), l = {
        ...g,
        ...Mt(g.timerState === "completed" ? "completed" : "paused", y),
        timerAnchorAtMs: null,
        timerPausedAtMs: y,
        audioPlaying: p ? !1 : m.audioPlaying
      };
      e(l), zn({ ...m, ...l });
    },
    resetTimer() {
      const p = st(), m = {
        ...Mt("idle", p),
        timerRestoreTarget: null,
        timerMode: "countdown",
        timerAnchorAtMs: null,
        timerPausedAtMs: null,
        timerRestoredAtMs: null,
        timerDurationSeconds: yr(n()),
        audioPlaying: !1,
        startedAt: null,
        elapsedSeconds: 0,
        summaryRecord: null,
        ...Qs()
      };
      e(m), zn({ ...n(), ...m });
    },
    skipTimer() {
      const p = n(), m = st(), y = Wn(p), g = {
        ...Mt("completed", m),
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
      const m = st(), y = Wn(p), g = y ? Math.min(y, Fa(p, m)) : Fa(p, m), l = y > 0 && g >= y ? "completed" : "running", f = {
        ...Mt(l, m),
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
        timerDurationSeconds: m === "countup" ? 0 : yr(n())
      };
      e(y), zn({ ...n(), ...y });
    },
    startBreak() {
      const p = st(), m = {
        ...Mt("break", p),
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
      const p = n(), m = st(), y = new Date(m).toISOString(), g = Ut(p) === "running" ? Qy(p, m) : p, l = Wn(g), f = l ? Math.min(l, g.elapsedSeconds) : g.elapsedSeconds, S = TC({
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
      ma("focus-room"), e({
        summaryRecord: S,
        sessionHistory: Yc(),
        ...Mt("completed", m),
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
      e({ assistantContext: nd(p) });
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
        const S = String(f.task || ""), x = y == null ? S : String(y || "").trim(), k = m == null ? f.minutes : _r(m, f.minutes, 1, Ha), A = g.studyPlan.map((E, D) => D === l ? { minutes: k, task: x || S } : E);
        let T = g.completedTasks;
        S && S !== A[l].task && T.includes(S) && (T = T.filter((E) => E !== S).concat(A[l].task));
        const b = { studyPlan: A, completedTasks: T };
        return it({ ...g, ...b }), b;
      });
    },
    setFlashcardIndex(p) {
      const m = Hy(n().selectedMaterial);
      e({
        flashcardIndex: _r(p, n().flashcardIndex, 0, Math.max(0, m.length - 1)),
        flashcardSide: "front"
      });
    },
    flipFlashcard() {
      e((p) => ({
        flashcardSide: p.flashcardSide === "back" ? "front" : "back"
      }));
    },
    rateFlashcard(p) {
      const m = n(), y = Hy(m.selectedMaterial);
      if (!y.length) return;
      const g = _r(m.flashcardIndex, 0, 0, y.length - 1), l = y[g], f = ["easy", "medium", "hard"].includes(String(p)) ? String(p) : "medium";
      e({
        flashcardProgress: {
          ...m.flashcardProgress,
          [EC(l, g)]: {
            difficulty: f,
            reviewedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        },
        flashcardSide: "front",
        flashcardIndex: g < y.length - 1 ? g + 1 : g
      });
    },
    answerQuizQuestion(p, m) {
      const y = Number(p), g = qc(n().selectedMaterial)[y];
      if (!g) return;
      const l = String(y);
      e((f) => ({
        quizAnswers: {
          ...f.quizAnswers,
          [l]: jC(g, m, f.quizAnswers[l])
        }
      }));
    },
    checkQuizQuestion(p) {
      const m = qc(n().selectedMaterial), y = Number(p), g = m[y];
      if (!g) return;
      const l = String(y), f = n(), S = Object.prototype.hasOwnProperty.call(f.quizAnswers, l) ? f.quizAnswers[l] : "", x = IC(g, S), k = E0(g);
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
      const y = n(), g = y.selectedMaterial, l = ui(y.chatMessages).slice(-10).map((f) => ({
        role: f.role === "user" ? "user" : "assistant",
        content: f.text
      }));
      e({
        chatMessages: ui([
          ...y.chatMessages,
          { role: "user", text: m, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
        ]),
        chatPending: !0,
        chatError: ""
      });
      try {
        const f = await Xb(m, l, g, y.assistantContext);
        e((S) => ({
          chatMessages: ui([
            ...S.chatMessages,
            { role: "assistant", text: f.answer, createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: f.offline ? "Using a local Focus Room reply because the AI tutor service is not connected." : ""
        }));
      } catch (f) {
        e((S) => ({
          chatMessages: ui([
            ...S.chatMessages,
            { role: "assistant", text: M0(m, g, n().studyGoal), createdAt: (/* @__PURE__ */ new Date()).toISOString() }
          ]),
          chatError: `AI tutor unavailable: ${f.message || "request failed"}`
        }));
      } finally {
        e({ chatPending: !1 });
      }
    },
    focusFlashcardsCompletedCount() {
      return Kb(n());
    },
    focusQuizScore() {
      return Yb(n());
    },
    focusQuizMistakes() {
      return Qb(n());
    },
    formatFocusedTime() {
      return k0(n().elapsedSeconds);
    }
  };
});
function O0({ compact: e = !1, className: n = "" }) {
  const o = Y((f) => f.focusTopics), i = Y((f) => f.activeTopicId), a = Y((f) => f.addFocusTopic), d = Y((f) => f.updateFocusTopic), c = Y((f) => f.finishFocusTopic), p = Y((f) => f.removeFocusTopic), m = Y((f) => f.activateFocusTopic), y = Jd(o, i), g = (o || []).filter((f) => f.status !== "done").length, l = (o || []).filter((f) => f.status === "done").length;
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
                /* @__PURE__ */ w.jsx(gb, { size: 14, "aria-hidden": "true" }),
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
                          /* @__PURE__ */ w.jsx(Wa, { size: 13, "aria-hidden": "true" }),
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
                        children: /* @__PURE__ */ w.jsx(Nb, { size: 13, "aria-hidden": "true" })
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
function Zy({ scene: e, active: n, onSelect: o, variant: i = "default" }) {
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
const Xs = 8;
function qd({ variant: e = "default" }) {
  const n = Y((y) => y.selectedScene), o = Y((y) => y.selectScene), [i, a] = C.useState(0), d = C.useMemo(() => e === "gallery" ? yC : Sn.filter((y) => !y.galleryOnly || y.id === n), [n, e]), c = Math.max(1, Math.ceil(d.length / Xs)), p = Math.min(i, c - 1), m = e === "gallery" ? d.slice(p * Xs, p * Xs + Xs) : d;
  return e !== "gallery" ? /* @__PURE__ */ w.jsx("div", { className: "scene-selector", "aria-label": "Study scenes", children: m.map((y) => /* @__PURE__ */ w.jsx(
    Zy,
    {
      scene: y,
      active: y.id === n,
      onSelect: o
    },
    y.id
  )) }) : /* @__PURE__ */ w.jsxs("div", { className: "scene-selector-wrap", "aria-label": "Study scenes", children: [
    /* @__PURE__ */ w.jsx("div", { className: "scene-selector scene-selector-gallery", children: m.map((y) => /* @__PURE__ */ w.jsx(
      Zy,
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
          children: /* @__PURE__ */ w.jsx(QC, { size: 18, "aria-hidden": "true" })
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
          children: /* @__PURE__ */ w.jsx(ZC, { size: 18, "aria-hidden": "true" })
        }
      )
    ] }) : null
  ] });
}
const Jy = [
  { label: "Lo-fi Chill", icon: cb, musicType: "Lo-fi", ambientSound: "Cafe Rain" },
  { label: "Ambient Piano", icon: pb, musicType: "Piano", ambientSound: "Nature" },
  { label: "Nature Ambient", icon: Zd, musicType: "Deep Focus", ambientSound: "Nature" },
  { label: "Acoustic Warm", icon: qC, musicType: "Minimal", ambientSound: "White Noise" },
  { label: "Deep Focus", icon: Sb, musicType: "Deep Focus", ambientSound: "White Noise" }
];
function Zb({ onWorkspace: e }) {
  const n = Y((b) => b.selectedScene), o = Y((b) => b.pomodoroDuration), i = Y((b) => b.timerMode), a = Y((b) => b.musicType), d = Y((b) => b.focusTopics), c = Y((b) => b.setPomodoroDuration), p = Y((b) => b.setTimerMode), m = Y((b) => b.setSound), y = Y((b) => b.startSession), [g, l] = C.useState(!1), f = C.useMemo(
    () => {
      var b;
      return ((b = Jy.find((E) => E.musicType === a)) == null ? void 0 : b.label) || "";
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
            children: /* @__PURE__ */ w.jsx(sb, { size: 18, "aria-hidden": "true" })
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
            children: /* @__PURE__ */ w.jsx(HC, { size: 20, "aria-hidden": "true" })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ w.jsxs("div", { className: "innook-setup-layout", children: [
      /* @__PURE__ */ w.jsxs("section", { className: "innook-scene-panel", "aria-labelledby": "innook-scene-title", children: [
        /* @__PURE__ */ w.jsxs("div", { className: "innook-panel-heading", children: [
          /* @__PURE__ */ w.jsx("span", { children: "STEP 01" }),
          /* @__PURE__ */ w.jsx("h1", { id: "innook-scene-title", children: "选择学习场景" })
        ] }),
        /* @__PURE__ */ w.jsx(qd, { variant: "gallery" })
      ] }),
      /* @__PURE__ */ w.jsxs("aside", { className: "innook-control-rail", "aria-label": "Study settings", children: [
        /* @__PURE__ */ w.jsx("div", { className: "innook-rail-group", "aria-label": "Music atmosphere", children: Jy.map((b) => {
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
          g0.map((b) => {
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
              /* @__PURE__ */ w.jsx(Rb, { size: 16, "aria-hidden": "true" }),
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
            children: /* @__PURE__ */ w.jsx(GC, { size: 22, "aria-hidden": "true" })
          }
        ),
        g ? /* @__PURE__ */ w.jsx("div", { className: "innook-goal-popover innook-topics-popover", "data-focus-topics-popover": "true", children: /* @__PURE__ */ w.jsx(O0, { compact: !0 }) }) : null
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
function Jb({ onWorkspace: e, onOpenTrail: n, onOpenCompanion: o, onOpenSettings: i, onExit: a }) {
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
        /* @__PURE__ */ w.jsx(Na, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Focus Trail" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { className: "header-icon-button", onClick: o, title: "Open Companion Room", "aria-label": "Open Companion Room", children: [
        /* @__PURE__ */ w.jsx(ja, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Companion" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { className: "header-icon-button", onClick: i, title: "Open room settings", "aria-label": "Open room settings", children: [
        /* @__PURE__ */ w.jsx(N0, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Settings" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { className: "header-icon-button header-exit-button", onClick: a, title: "Exit Focus Room", "aria-label": "Exit Focus Room", children: [
        /* @__PURE__ */ w.jsx(rb, { size: 16, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Exit" })
      ] })
    ] })
  ] });
}
const L0 = {
  minutes: Math.floor(A0 / 60),
  seconds: 59
}, qb = {
  minutes: 3,
  seconds: 2
};
function ef(e) {
  const n = tn(e, Qd);
  return {
    minutes: Math.floor(n / 60),
    seconds: n % 60
  };
}
function qy(e, n) {
  const o = Math.max(0, Math.floor(Number(e) || 0)), i = Math.max(0, Math.floor(Number(n) || 0));
  return tn(o * 60 + i, Qd);
}
function rd(e, n) {
  return String(Math.max(0, Math.floor(Number(e) || 0))).padStart(2, "0");
}
function tf(e) {
  const { minutes: n, seconds: o } = ef(e);
  return `${rd(n, "minutes")}:${rd(o, "seconds")}`;
}
function eP(e, n, o) {
  const i = qb[o] || 2;
  return `${String(e || "").replace(/\D/g, "")}${String(n).replace(/\D/g, "")}`.slice(-i) || "";
}
function tP(e, n) {
  const o = Number(String(e || "").replace(/\D/g, "")) || 0;
  return Math.min(L0[n], o);
}
function nP(e, n, o) {
  const i = ef(e), a = tP(o, n);
  return n === "seconds" ? qy(i.minutes, a) : qy(a, i.seconds);
}
const rP = { minutes: "Minutes", seconds: "Seconds" };
function eg({
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
  const y = rP[e], g = (l) => {
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
      "aria-valuemax": L0[e],
      "aria-valuenow": n,
      "aria-valuetext": `${n} ${y.toLowerCase()}`,
      "aria-disabled": o || void 0,
      onFocus: () => a(e),
      onKeyDown: g,
      children: rd(n, e)
    }
  ) });
}
function oP({
  valueSeconds: e,
  onChange: n,
  disabled: o = !1,
  size: i = "hero",
  ariaLabel: a = "Set focus block length",
  className: d = ""
}) {
  const { minutes: c, seconds: p } = ef(e), [m, y] = C.useState(null), g = C.useRef(""), l = C.useRef(null), f = C.useRef(null), S = C.useRef(null), x = C.useCallback(() => {
    g.current = "";
  }, []), k = C.useCallback((E) => {
    g.current = "", y(E);
  }, []), A = C.useCallback(
    (E, D) => {
      if (o) return;
      const O = eP(g.current, D, E);
      g.current = O, y(E), n == null || n(nP(e, E, O));
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
        o ? /* @__PURE__ */ w.jsx("span", { className: "timer-editor-static", "aria-hidden": "true", children: tf(e) }) : /* @__PURE__ */ w.jsxs(w.Fragment, { children: [
          /* @__PURE__ */ w.jsx(
            eg,
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
            eg,
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
function iP(e, n) {
  return n ? Math.min(100, Math.max(0, e / n * 100)) : 0;
}
function sP({ onFocusMode: e, audioState: n }) {
  const o = Y((re) => re.timerStatus), i = Y((re) => re.elapsedSeconds), a = Y((re) => re.pomodoroDuration), d = Y((re) => re.pomodoroDurationSeconds), c = Y((re) => re.timerMode), p = Y((re) => re.studyGoal), m = Y((re) => re.focusTopics), y = Y((re) => re.activeTopicId), g = Y((re) => re.currentSession), l = Y((re) => re.startTimer), f = Y((re) => re.pauseTimer), S = Y((re) => re.resetTimer), x = Y((re) => re.skipTimer), k = Y((re) => re.toggleAudio), A = Y((re) => re.audioPlaying), T = Y((re) => re.setPomodoroDurationSeconds), b = Y((re) => re.finishFocusTopic), E = Jd(m, y), D = Number(d) || (Number(a) || 0) * 60, O = c === "countup" ? i : Math.max(0, D - i), H = o === "paused", W = o === "studying", G = o === "completed", K = o === "idle" && c !== "countup", X = G && c !== "countup" ? "00:00" : Jc(O), se = H ? "Paused" : G ? "Complete" : W ? "In focus" : "Ready", Z = H ? "Resume timer" : W ? "Pause timer" : "Start timer", de = (E == null ? void 0 : E.title) || p || "A quiet block for meaningful progress", ce = (E == null ? void 0 : E.description) || "", Se = !!(E && E.status !== "done");
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
        oP,
        {
          className: "dock-time-editor",
          valueSeconds: D,
          onChange: T,
          size: "dock",
          ariaLabel: "Set focus block length"
        }
      ) : /* @__PURE__ */ w.jsx("strong", { className: "dock-time", "aria-live": "off", children: X }),
      /* @__PURE__ */ w.jsx("div", { className: "dock-progress", "aria-hidden": "true", children: /* @__PURE__ */ w.jsx("span", { style: { width: `${iP(i, D)}%` } }) })
    ] }),
    /* @__PURE__ */ w.jsxs("div", { className: "dock-goal-block", "data-focus-active-topic": "true", children: [
      /* @__PURE__ */ w.jsx("span", { className: "dock-eyebrow", children: "ACTIVE TOPIC" }),
      /* @__PURE__ */ w.jsx("strong", { children: de }),
      ce ? /* @__PURE__ */ w.jsx("span", { className: "dock-goal-description", children: ce }) : null,
      /* @__PURE__ */ w.jsxs("span", { className: "dock-goal-meta", children: [
        c === "countup" ? "Count-up" : `${tf(D)} block`,
        " · ",
        Jc(i),
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
            /* @__PURE__ */ w.jsx(Wa, { size: 13, "aria-hidden": "true" }),
            "Done · next topic"
          ]
        }
      ) : null
    ] }),
    /* @__PURE__ */ w.jsxs("div", { className: "dock-action-block", children: [
      /* @__PURE__ */ w.jsxs(Pe, { className: "dock-action-button", onClick: k, "aria-label": A ? "Pause room audio" : "Play room audio", children: [
        A ? /* @__PURE__ */ w.jsx(Gy, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(Ga, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: n != null && n.playing ? "Pause audio" : "Audio" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { className: "dock-action-button", onClick: () => W ? f() : l(), variant: "primary", "aria-label": Z, children: [
        W ? /* @__PURE__ */ w.jsx(Gy, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(hb, { size: 15, fill: "currentColor", "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: H ? "Resume" : W ? "Pause" : "Start" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { className: "dock-action-button", onClick: x, "aria-label": "Skip timer", children: [
        /* @__PURE__ */ w.jsx(bb, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Skip" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { className: "dock-action-button", onClick: S, "aria-label": "Reset timer", children: [
        /* @__PURE__ */ w.jsx(xb, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Reset" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { className: "dock-focus-mode", onClick: e, "aria-label": "Enter distraction-free Focus Mode", children: [
        /* @__PURE__ */ w.jsx(Eb, { size: 15, "aria-hidden": "true" }),
        /* @__PURE__ */ w.jsx("span", { children: "Focus Mode" })
      ] })
    ] })
  ] });
}
var aP = Object.defineProperty, go = (e, n) => aP(e, "name", { value: n, configurable: !0 }), V0 = !!(typeof window < "u" && window.document && window.document.createElement);
function kr(e, n, { checkForDefaultPrevented: o = !0 } = {}) {
  return /* @__PURE__ */ go(function(a) {
    if (e == null || e(a), o === !1 || !a || !a.defaultPrevented)
      return n == null ? void 0 : n(a);
  }, "handleEvent");
}
go(kr, "composeEventHandlers");
function lP(e) {
  var n;
  if (!V0)
    throw new Error("Cannot access window outside of the DOM");
  return ((n = e == null ? void 0 : e.ownerDocument) == null ? void 0 : n.defaultView) ?? window;
}
go(lP, "getOwnerWindow");
function od(e) {
  if (!V0)
    throw new Error("Cannot access document outside of the DOM");
  return (e == null ? void 0 : e.ownerDocument) ?? document;
}
go(od, "getOwnerDocument");
function B0(e, n = !1) {
  const { activeElement: o } = od(e);
  if (!(o != null && o.nodeName))
    return null;
  if (z0(o) && o.contentDocument)
    return B0(o.contentDocument.body, n);
  if (n) {
    const i = o.getAttribute("aria-activedescendant");
    if (i) {
      const a = od(o).getElementById(i);
      if (a)
        return a;
    }
  }
  return o;
}
go(B0, "getActiveElement");
function z0(e) {
  return e.tagName === "IFRAME";
}
go(z0, "isFrame");
function tg(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
function uP(...e) {
  return (n) => {
    let o = !1;
    const i = e.map((a) => {
      const d = tg(a, n);
      return !o && typeof d == "function" && (o = !0), d;
    });
    if (o)
      return () => {
        for (let a = 0; a < i.length; a++) {
          const d = i[a];
          typeof d == "function" ? d() : tg(e[a], null);
        }
      };
  };
}
function Tt(...e) {
  return C.useCallback(uP(...e), e);
}
function cP(e, n = []) {
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
    function g(l, f, S = {}) {
      var T;
      const { optional: x = !1 } = S, k = ((T = f == null ? void 0 : f[e]) == null ? void 0 : T[m]) || p, A = C.useContext(k);
      if (A) return A;
      if (c !== void 0) return c;
      if (!x)
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
  return a.scopeName = e, [i, dP(a, ...n)];
}
function dP(...e) {
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
var on = globalThis != null && globalThis.document ? C.useLayoutEffect : () => {
}, fP = Cr[" useId ".trim().toString()] || (() => {
}), pP = 0;
function dc(e) {
  const [n, o] = C.useState(fP());
  return on(() => {
    o((i) => i ?? String(pP++));
  }, [e]), e || (n ? `radix-${n}` : "");
}
var ng = Cr[" useEffectEvent ".trim().toString()], rg = Cr[" useInsertionEffect ".trim().toString()];
function mP(e) {
  if (typeof ng == "function")
    return ng(e);
  const n = C.useRef(() => {
    throw new Error("Cannot call an event handler while rendering.");
  });
  return typeof rg == "function" ? rg(() => {
    n.current = e;
  }) : on(() => {
    n.current = e;
  }), C.useMemo(() => ((...o) => {
    var i;
    return (i = n.current) == null ? void 0 : i.call(n, ...o);
  }), []);
}
var hP = Object.defineProperty, Ei = (e, n) => hP(e, "name", { value: n, configurable: !0 }), yP = Cr[" useInsertionEffect ".trim().toString()] || on;
function $0({
  prop: e,
  defaultProp: n,
  onChange: o = /* @__PURE__ */ Ei(() => {
  }, "onChange"),
  caller: i
}) {
  const [a, d, c] = U0({
    defaultProp: n,
    onChange: o
  }), p = e !== void 0, m = p ? e : a, y = C.useCallback(
    (g) => {
      var l;
      if (p) {
        const f = H0(g) ? g(e) : g;
        f !== e && ((l = c.current) == null || l.call(c, f));
      } else
        d(g);
    },
    [p, e, d, c]
  );
  return [m, y];
}
Ei($0, "useControllableState");
function U0({
  defaultProp: e,
  onChange: n
}) {
  const [o, i] = C.useState(e), a = C.useRef(o), d = C.useRef(n);
  return yP(() => {
    d.current = n;
  }, [n]), C.useEffect(() => {
    var c;
    a.current !== o && ((c = d.current) == null || c.call(d, o), a.current = o);
  }, [o, a]), [o, i, d];
}
Ei(U0, "useUncontrolledState");
function H0(e) {
  return typeof e == "function";
}
Ei(H0, "isFunction");
var og = Symbol("RADIX:SYNC_STATE");
function gP(e, n, o, i) {
  const { prop: a, defaultProp: d, onChange: c, caller: p } = n, m = a !== void 0, y = mP(c), g = [{ ...o, state: d }];
  i && g.push(i);
  const [l, f] = C.useReducer(
    (A, T) => {
      if (T.type === og)
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
    m && !Object.is(a, l.state) && f({ type: og, state: a });
  }, [a, l.state, m]), [k, f];
}
Ei(gP, "useControllableStateReducer");
var W0 = Cg();
// @__NO_SIDE_EFFECTS__
function G0(e) {
  const n = C.forwardRef((o, i) => {
    let { children: a, ...d } = o, c = null, p = !1;
    const m = [];
    ig(a) && typeof Zs == "function" && (a = Zs(a._payload)), C.Children.forEach(a, (f) => {
      var S;
      if (_P(f)) {
        p = !0;
        const x = f;
        let k = "child" in x.props ? x.props.child : x.props.children;
        ig(k) && typeof Zs == "function" && (k = Zs(k._payload)), c = SP(x, k), m.push((S = c == null ? void 0 : c.props) == null ? void 0 : S.children);
      } else
        m.push(f);
    }), c ? c = C.cloneElement(c, void 0, m) : (
      // A `Slottable` was found but it didn't resolve to a single element (e.g.
      // it wrapped multiple elements, text, or a render-prop `child` that
      // wasn't an element). Don't fall back to treating the `Slottable` wrapper
      // itself as the slot target — throw a descriptive error below instead.
      !p && C.Children.count(a) === 1 && C.isValidElement(a) && (c = a)
    );
    const y = c ? xP(c) : void 0, g = Tt(i, y);
    if (!c) {
      if (a || a === 0)
        throw new Error(
          p ? CP(e) : AP(e)
        );
      return a;
    }
    const l = wP(d, c.props ?? {});
    return c.type !== C.Fragment && (l.ref = i ? g : y), C.cloneElement(c, l);
  });
  return n.displayName = `${e}.Slot`, n;
}
var vP = Symbol.for("radix.slottable"), SP = (e, n) => {
  if ("child" in e.props) {
    const o = e.props.child;
    return C.isValidElement(o) ? C.cloneElement(o, void 0, e.props.children(o.props.children)) : null;
  }
  return C.isValidElement(n) ? n : null;
};
function wP(e, n) {
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
function xP(e) {
  var i, a;
  let n = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = n && "isReactWarning" in n && n.isReactWarning;
  return o ? e.ref : (n = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = n && "isReactWarning" in n && n.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
function _P(e) {
  return C.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === vP;
}
var TP = Symbol.for("react.lazy");
function ig(e) {
  return e != null && typeof e == "object" && "$$typeof" in e && e.$$typeof === TP && "_payload" in e && kP(e._payload);
}
function kP(e) {
  return typeof e == "object" && e !== null && "then" in e;
}
var AP = (e) => `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`, CP = (e) => `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`, Zs = Cr[" use ".trim().toString()], bP = [
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
], vo = bP.reduce((e, n) => {
  const o = /* @__PURE__ */ G0(`Primitive.${n}`), i = C.forwardRef((a, d) => {
    const { asChild: c, ...p } = a, m = c ? o : n;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ w.jsx(m, { ...p, ref: d });
  });
  return i.displayName = `Primitive.${n}`, { ...e, [n]: i };
}, {});
function PP(e, n) {
  e && W0.flushSync(() => e.dispatchEvent(n));
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
var EP = Object.defineProperty, Ye = (e, n) => EP(e, "name", { value: n, configurable: !0 }), id = "dismissableLayer.update", MP = "dismissableLayer.pointerDownOutside", RP = "dismissableLayer.focusOutside", sg, K0 = C.createContext({
  layers: /* @__PURE__ */ new Set(),
  layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
  branches: /* @__PURE__ */ new Set(),
  // Outside elements that belong to a layer's own dismiss affordance (eg, a
  // dialog overlay). Pressing them should dismiss the layer regardless of
  // whether or not they stop propagation.
  //
  // See https://github.com/radix-ui/primitives/issues/3346
  dismissableSurfaces: /* @__PURE__ */ new Set()
}), DP = /* @__PURE__ */ C.forwardRef(
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
    } = n, l = C.useContext(K0), [f, S] = C.useState(null), x = (f == null ? void 0 : f.ownerDocument) ?? (globalThis == null ? void 0 : globalThis.document), [, k] = C.useState({}), A = Tt(o, S), T = Array.from(l.layers), [b] = [
      ...l.layersWithOutsidePointerEventsDisabled
    ].slice(-1), E = b ? T.indexOf(b) : -1, D = f ? T.indexOf(f) : -1, O = l.layersWithOutsidePointerEventsDisabled.size > 0, H = D >= E, W = C.useRef(!1), G = Q0(
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
    ), K = X0((Z) => {
      if (a && W.current)
        return;
      const de = Z.target;
      [...l.branches].some((Se) => Se.contains(de)) || (p == null || p(Z), m == null || m(Z), Z.defaultPrevented || y == null || y());
    }, x), X = f ? D === T.length - 1 : !1, se = xi((Z) => {
      Z.key === "Escape" && (d == null || d(Z), !Z.defaultPrevented && y && (Z.preventDefault(), y()));
    });
    return C.useEffect(() => {
      if (X)
        return x.addEventListener("keydown", se, { capture: !0 }), () => x.removeEventListener("keydown", se, { capture: !0 });
    }, [x, X, se]), C.useEffect(() => {
      if (f)
        return i && (l.layersWithOutsidePointerEventsDisabled.size === 0 && (sg = x.body.style.pointerEvents, x.body.style.pointerEvents = "none"), l.layersWithOutsidePointerEventsDisabled.add(f)), l.layers.add(f), sd(), () => {
          i && (l.layersWithOutsidePointerEventsDisabled.delete(f), l.layersWithOutsidePointerEventsDisabled.size === 0 && (x.body.style.pointerEvents = sg));
        };
    }, [f, x, i, l]), C.useEffect(() => () => {
      f && (l.layers.delete(f), l.layersWithOutsidePointerEventsDisabled.delete(f), sd());
    }, [f, l]), C.useEffect(() => {
      const Z = /* @__PURE__ */ Ye(() => k({}), "handleUpdate");
      return document.addEventListener(id, Z), () => document.removeEventListener(id, Z);
    }, []), /* @__PURE__ */ w.jsx(
      vo.div,
      {
        ...g,
        ref: A,
        style: {
          pointerEvents: O ? H ? "auto" : "none" : void 0,
          ...n.style
        },
        onFocusCapture: kr(n.onFocusCapture, K.onFocusCapture),
        onBlurCapture: kr(n.onBlurCapture, K.onBlurCapture),
        onPointerDownCapture: kr(
          n.onPointerDownCapture,
          G.onPointerDownCapture
        )
      }
    );
  }, "DismissableLayer")
);
function Y0() {
  const e = C.useContext(K0), [n, o] = C.useState(null);
  return C.useEffect(() => {
    if (n)
      return e.dismissableSurfaces.add(n), () => {
        e.dismissableSurfaces.delete(n);
      };
  }, [n, e.dismissableSurfaces]), o;
}
Ye(Y0, "useDismissableLayerSurface");
var NP = /* @__PURE__ */ Ye(() => !0, "IS_TRUE");
function Q0(e, n) {
  const {
    ownerDocument: o = globalThis == null ? void 0 : globalThis.document,
    deferPointerDownOutside: i = !1,
    isDeferredPointerDownOutsideRef: a,
    dismissableSurfaces: d,
    shouldHandlePointerDownOutside: c = NP
  } = n, p = xi(e), m = C.useRef(!1), y = C.useRef(!1), g = C.useRef(/* @__PURE__ */ new Map()), l = C.useRef(() => {
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
          f(), H || nf(
            MP,
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
Ye(Q0, "usePointerDownOutside");
function X0(e, n = globalThis == null ? void 0 : globalThis.document) {
  const o = xi(e), i = C.useRef(!1);
  return C.useEffect(() => {
    const a = /* @__PURE__ */ Ye((d) => {
      d.target && !i.current && nf(RP, o, { originalEvent: d }, {
        discrete: !1
      });
    }, "handleFocus");
    return n.addEventListener("focusin", a), () => n.removeEventListener("focusin", a);
  }, [n, o]), {
    onFocusCapture: /* @__PURE__ */ Ye(() => i.current = !0, "onFocusCapture"),
    onBlurCapture: /* @__PURE__ */ Ye(() => i.current = !1, "onBlurCapture")
  };
}
Ye(X0, "useFocusOutside");
function sd() {
  const e = new CustomEvent(id);
  document.dispatchEvent(e);
}
Ye(sd, "dispatchUpdate");
function nf(e, n, o, { discrete: i }) {
  const a = o.originalEvent.target, d = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: o });
  n && a.addEventListener(e, n, { once: !0 }), i ? PP(a, d) : a.dispatchEvent(d);
}
Ye(nf, "handleAndDispatchCustomEvent");
var jP = Object.defineProperty, ut = (e, n) => jP(e, "name", { value: n, configurable: !0 }), fc = "focusScope.autoFocusOnMount", pc = "focusScope.autoFocusOnUnmount", ag = { bubbles: !1, cancelable: !0 }, IP = /* @__PURE__ */ C.forwardRef(
  /* @__PURE__ */ ut(function(n, o) {
    const {
      loop: i = !1,
      trapped: a = !1,
      onMountAutoFocus: d,
      onUnmountAutoFocus: c,
      ...p
    } = n, [m, y] = C.useState(null), g = xi(d), l = xi(c), f = C.useRef(null), S = Tt(o, y), x = C.useRef({
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
        lg.add(x);
        const A = document.activeElement;
        if (!m.contains(A)) {
          const b = new CustomEvent(fc, ag);
          m.addEventListener(fc, g), m.dispatchEvent(b), b.defaultPrevented || (Z0(nS(rf(m)), { select: !0 }), document.activeElement === A && hn(m));
        }
        return () => {
          m.removeEventListener(fc, g), setTimeout(() => {
            const b = new CustomEvent(pc, ag);
            m.addEventListener(pc, l), m.dispatchEvent(b), b.defaultPrevented || hn(A ?? document.body, { select: !0 }), m.removeEventListener(pc, l), lg.remove(x);
          }, 0);
        };
      }
    }, [m, g, l, x]);
    const k = C.useCallback(
      (A) => {
        if (!i && !a || x.paused) return;
        const T = A.key === "Tab" && !A.altKey && !A.ctrlKey && !A.metaKey, b = document.activeElement;
        if (T && b) {
          const E = A.currentTarget, [D, O] = J0(E);
          D && O ? !A.shiftKey && b === O ? (A.preventDefault(), i && hn(D, { select: !0 })) : A.shiftKey && b === D && (A.preventDefault(), i && hn(O, { select: !0 })) : b === E && A.preventDefault();
        }
      },
      [i, a, x.paused]
    );
    return /* @__PURE__ */ w.jsx(vo.div, { tabIndex: -1, ...p, ref: S, onKeyDown: k });
  }, "FocusScope")
);
function Z0(e, { select: n = !1 } = {}) {
  const o = document.activeElement;
  for (const i of e)
    if (hn(i, { select: n }), document.activeElement !== o) return;
}
ut(Z0, "focusFirst");
function J0(e) {
  const n = rf(e), o = ad(n, e), i = ad(n.reverse(), e);
  return [o, i];
}
ut(J0, "getTabbableEdges");
function rf(e) {
  const n = [], o = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
    acceptNode: /* @__PURE__ */ ut((i) => {
      const a = i.tagName === "INPUT" && i.type === "hidden";
      return i.disabled || i.hidden || a ? NodeFilter.FILTER_SKIP : i.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }, "acceptNode")
  });
  for (; o.nextNode(); ) n.push(o.currentNode);
  return n;
}
ut(rf, "getTabbableCandidates");
function ad(e, n) {
  const o = typeof n.checkVisibility == "function" && n.checkVisibility({ checkVisibilityCSS: !0 });
  for (const i of e)
    if (!(o ? !i.checkVisibility({ checkVisibilityCSS: !0 }) : q0(i, { upTo: n })))
      return i;
}
ut(ad, "findVisible");
function q0(e, { upTo: n }) {
  if (getComputedStyle(e).visibility === "hidden") return !0;
  for (; e; ) {
    if (n !== void 0 && e === n) return !1;
    if (getComputedStyle(e).display === "none") return !0;
    e = e.parentElement;
  }
  return !1;
}
ut(q0, "isHidden");
function eS(e) {
  return e instanceof HTMLInputElement && "select" in e;
}
ut(eS, "isSelectableInput");
function hn(e, { select: n = !1 } = {}) {
  if (e && e.focus) {
    const o = document.activeElement;
    e.focus({ preventScroll: !0 }), e !== o && eS(e) && n && e.select();
  }
}
ut(hn, "focus");
var lg = tS();
function tS() {
  let e = [];
  return {
    add(n) {
      const o = e[0];
      n !== o && (o == null || o.pause()), e = ld(e, n), e.unshift(n);
    },
    remove(n) {
      var o;
      e = ld(e, n), (o = e[0]) == null || o.resume();
    }
  };
}
ut(tS, "createFocusScopesStack");
function ld(e, n) {
  const o = [...e], i = o.indexOf(n);
  return i !== -1 && o.splice(i, 1), o;
}
ut(ld, "arrayRemove");
function nS(e) {
  return e.filter((n) => n.tagName !== "A");
}
ut(nS, "removeLinks");
var FP = Object.defineProperty, OP = (e, n) => FP(e, "name", { value: n, configurable: !0 }), LP = /* @__PURE__ */ C.forwardRef(
  /* @__PURE__ */ OP(function(n, o) {
    var m;
    const { container: i, ...a } = n, [d, c] = C.useState(!1);
    on(() => c(!0), []);
    const p = i || d && ((m = globalThis == null ? void 0 : globalThis.document) == null ? void 0 : m.body);
    return p ? W0.createPortal(/* @__PURE__ */ w.jsx(vo.div, { ...a, ref: o }), p) : null;
  }, "Portal")
), VP = Object.defineProperty, wn = (e, n) => VP(e, "name", { value: n, configurable: !0 });
function rS(e, n) {
  return C.useReducer((o, i) => n[o][i] ?? o, e);
}
wn(rS, "useStateMachine");
var of = /* @__PURE__ */ wn((e) => {
  const { present: n, children: o } = e, i = oS(n), a = typeof o == "function" ? o({ present: i.isPresent }) : C.Children.only(o), d = iS(i.ref, sS(a));
  return typeof o == "function" || i.isPresent ? C.cloneElement(a, { ref: d }) : null;
}, "Presence");
function oS(e) {
  const [n, o] = C.useState(), i = C.useRef(null), a = C.useRef(e), d = C.useRef("none"), c = C.useRef(void 0), p = e ? "mounted" : "unmounted", [m, y] = rS(p, {
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
    m === "mounted" ? (d.current = c.current ?? ro(i.current), c.current = void 0) : d.current = "none";
  }, [m]), on(() => {
    const g = i.current, l = a.current;
    if (l !== e) {
      const S = d.current, x = ro(g);
      e ? (c.current = x, y("MOUNT")) : x === "none" || (g == null ? void 0 : g.display) === "none" ? y("UNMOUNT") : y(l && S !== x ? "ANIMATION_OUT" : "UNMOUNT"), a.current = e;
    }
  }, [e, y]), on(() => {
    if (n) {
      let g;
      const l = n.ownerDocument.defaultView ?? window, f = /* @__PURE__ */ wn((x) => {
        const A = ro(i.current).includes(CSS.escape(x.animationName));
        if (x.target === n && A && (y("ANIMATION_END"), !a.current)) {
          const T = n.style.animationFillMode;
          n.style.animationFillMode = "forwards", g = l.setTimeout(() => {
            n.style.animationFillMode === "forwards" && (n.style.animationFillMode = T);
          });
        }
      }, "handleAnimationEnd"), S = /* @__PURE__ */ wn((x) => {
        x.target === n && (d.current = ro(i.current));
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
        i.current = l, c.current = ro(l);
      } else
        i.current = null;
      o(g);
    }, [])
  };
}
wn(oS, "usePresence");
function ud(e, n) {
  if (typeof e == "function")
    return e(n);
  e != null && (e.current = n);
}
wn(ud, "setRef");
function iS(...e) {
  const n = C.useRef(e);
  return n.current = e, C.useCallback((o) => {
    const i = n.current;
    let a = !1;
    const d = i.map((c) => {
      const p = ud(c, o);
      return !a && typeof p == "function" && (a = !0), p;
    });
    if (a)
      return () => {
        for (let c = 0; c < d.length; c++) {
          const p = d[c];
          typeof p == "function" ? p() : ud(i[c], null);
        }
      };
  }, []);
}
wn(iS, "useStableComposedRefs");
function ro(e) {
  return (e == null ? void 0 : e.animationName) || "none";
}
wn(ro, "getAnimationName");
function sS(e) {
  var i, a;
  let n = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = n && "isReactWarning" in n && n.isReactWarning;
  return o ? e.ref : (n = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = n && "isReactWarning" in n && n.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
wn(sS, "getElementRef");
var Js = 0, Zt = null;
function BP() {
  C.useEffect(() => {
    Zt || (Zt = { start: ug(), end: ug() });
    const { start: e, end: n } = Zt;
    return document.body.firstElementChild !== e && document.body.insertAdjacentElement("afterbegin", e), document.body.lastElementChild !== n && document.body.insertAdjacentElement("beforeend", n), Js++, () => {
      Js === 1 && (Zt == null || Zt.start.remove(), Zt == null || Zt.end.remove(), Zt = null), Js = Math.max(0, Js - 1);
    };
  }, []);
}
function ug() {
  const e = document.createElement("span");
  return e.setAttribute("data-radix-focus-guard", ""), e.tabIndex = 0, e.style.outline = "none", e.style.opacity = "0", e.style.position = "fixed", e.style.pointerEvents = "none", e;
}
var en = function() {
  return en = Object.assign || function(n) {
    for (var o, i = 1, a = arguments.length; i < a; i++) {
      o = arguments[i];
      for (var d in o) Object.prototype.hasOwnProperty.call(o, d) && (n[d] = o[d]);
    }
    return n;
  }, en.apply(this, arguments);
};
function aS(e, n) {
  var o = {};
  for (var i in e) Object.prototype.hasOwnProperty.call(e, i) && n.indexOf(i) < 0 && (o[i] = e[i]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var a = 0, i = Object.getOwnPropertySymbols(e); a < i.length; a++)
      n.indexOf(i[a]) < 0 && Object.prototype.propertyIsEnumerable.call(e, i[a]) && (o[i[a]] = e[i[a]]);
  return o;
}
function zP(e, n, o) {
  if (o || arguments.length === 2) for (var i = 0, a = n.length, d; i < a; i++)
    (d || !(i in n)) && (d || (d = Array.prototype.slice.call(n, 0, i)), d[i] = n[i]);
  return e.concat(d || Array.prototype.slice.call(n));
}
var ha = "right-scroll-bar-position", ya = "width-before-scroll-bar", $P = "with-scroll-bars-hidden", UP = "--removed-body-scroll-bar-size";
function mc(e, n) {
  return typeof e == "function" ? e(n) : e && (e.current = n), e;
}
function HP(e, n) {
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
var WP = typeof window < "u" ? C.useLayoutEffect : C.useEffect, cg = /* @__PURE__ */ new WeakMap();
function GP(e, n) {
  var o = HP(null, function(i) {
    return e.forEach(function(a) {
      return mc(a, i);
    });
  });
  return WP(function() {
    var i = cg.get(o);
    if (i) {
      var a = new Set(i), d = new Set(e), c = o.current;
      a.forEach(function(p) {
        d.has(p) || mc(p, null);
      }), d.forEach(function(p) {
        a.has(p) || mc(p, c);
      });
    }
    cg.set(o, e);
  }, [e]), o;
}
function KP(e) {
  return e;
}
function YP(e, n) {
  n === void 0 && (n = KP);
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
function QP(e) {
  e === void 0 && (e = {});
  var n = YP(null);
  return n.options = en({ async: !0, ssr: !1 }, e), n;
}
var lS = function(e) {
  var n = e.sideCar, o = aS(e, ["sideCar"]);
  if (!n)
    throw new Error("Sidecar: please provide `sideCar` property to import the right car");
  var i = n.read();
  if (!i)
    throw new Error("Sidecar medium not found");
  return C.createElement(i, en({}, o));
};
lS.isSideCarExport = !0;
function XP(e, n) {
  return e.useMedium(n), lS;
}
var uS = QP(), hc = function() {
}, Ka = C.forwardRef(function(e, n) {
  var o = C.useRef(null), i = C.useState({
    onScrollCapture: hc,
    onWheelCapture: hc,
    onTouchMoveCapture: hc
  }), a = i[0], d = i[1], c = e.forwardProps, p = e.children, m = e.className, y = e.removeScrollBar, g = e.enabled, l = e.shards, f = e.sideCar, S = e.noRelative, x = e.noIsolation, k = e.inert, A = e.allowPinchZoom, T = e.as, b = T === void 0 ? "div" : T, E = e.gapMode, D = aS(e, ["forwardProps", "children", "className", "removeScrollBar", "enabled", "shards", "sideCar", "noRelative", "noIsolation", "inert", "allowPinchZoom", "as", "gapMode"]), O = f, H = GP([o, n]), W = en(en({}, D), a);
  return C.createElement(
    C.Fragment,
    null,
    g && C.createElement(O, { sideCar: uS, removeScrollBar: y, shards: l, noRelative: S, noIsolation: x, inert: k, setCallbacks: d, allowPinchZoom: !!A, lockRef: o, gapMode: E }),
    c ? C.cloneElement(C.Children.only(p), en(en({}, W), { ref: H })) : C.createElement(b, en({}, W, { className: m, ref: H }), p)
  );
});
Ka.defaultProps = {
  enabled: !0,
  removeScrollBar: !0,
  inert: !1
};
Ka.classNames = {
  fullWidth: ya,
  zeroRight: ha
};
var ZP = function() {
  if (typeof __webpack_nonce__ < "u")
    return __webpack_nonce__;
};
function JP() {
  if (!document)
    return null;
  var e = document.createElement("style");
  e.type = "text/css";
  var n = ZP();
  return n && e.setAttribute("nonce", n), e;
}
function qP(e, n) {
  e.styleSheet ? e.styleSheet.cssText = n : e.appendChild(document.createTextNode(n));
}
function eE(e) {
  var n = document.head || document.getElementsByTagName("head")[0];
  n.appendChild(e);
}
var tE = function() {
  var e = 0, n = null;
  return {
    add: function(o) {
      e == 0 && (n = JP()) && (qP(n, o), eE(n)), e++;
    },
    remove: function() {
      e--, !e && n && (n.parentNode && n.parentNode.removeChild(n), n = null);
    }
  };
}, nE = function() {
  var e = tE();
  return function(n, o) {
    C.useEffect(function() {
      return e.add(n), function() {
        e.remove();
      };
    }, [n && o]);
  };
}, cS = function() {
  var e = nE(), n = function(o) {
    var i = o.styles, a = o.dynamic;
    return e(i, a), null;
  };
  return n;
}, rE = {
  left: 0,
  top: 0,
  right: 0,
  gap: 0
}, yc = function(e) {
  return parseInt(e || "", 10) || 0;
}, oE = function(e) {
  var n = window.getComputedStyle(document.body), o = n[e === "padding" ? "paddingLeft" : "marginLeft"], i = n[e === "padding" ? "paddingTop" : "marginTop"], a = n[e === "padding" ? "paddingRight" : "marginRight"];
  return [yc(o), yc(i), yc(a)];
}, iE = function(e) {
  if (e === void 0 && (e = "margin"), typeof window > "u")
    return rE;
  var n = oE(e), o = document.documentElement.clientWidth, i = window.innerWidth;
  return {
    left: n[0],
    top: n[1],
    right: n[2],
    gap: Math.max(0, i - o + n[2] - n[0])
  };
}, sE = cS(), uo = "data-scroll-locked", aE = function(e, n, o, i) {
  var a = e.left, d = e.top, c = e.right, p = e.gap;
  return o === void 0 && (o = "margin"), `
  .`.concat($P, ` {
   overflow: hidden `).concat(i, `;
   padding-right: `).concat(p, "px ").concat(i, `;
  }
  body[`).concat(uo, `] {
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
  
  body[`).concat(uo, `] {
    `).concat(UP, ": ").concat(p, `px;
  }
`);
}, dg = function() {
  var e = parseInt(document.body.getAttribute(uo) || "0", 10);
  return isFinite(e) ? e : 0;
}, lE = function() {
  C.useEffect(function() {
    return document.body.setAttribute(uo, (dg() + 1).toString()), function() {
      var e = dg() - 1;
      e <= 0 ? document.body.removeAttribute(uo) : document.body.setAttribute(uo, e.toString());
    };
  }, []);
}, uE = function(e) {
  var n = e.noRelative, o = e.noImportant, i = e.gapMode, a = i === void 0 ? "margin" : i;
  lE();
  var d = C.useMemo(function() {
    return iE(a);
  }, [a]);
  return C.createElement(sE, { styles: aE(d, !n, a, o ? "" : "!important") });
}, cd = !1;
if (typeof window < "u")
  try {
    var qs = Object.defineProperty({}, "passive", {
      get: function() {
        return cd = !0, !0;
      }
    });
    window.addEventListener("test", qs, qs), window.removeEventListener("test", qs, qs);
  } catch {
    cd = !1;
  }
var qr = cd ? { passive: !1 } : !1, cE = function(e) {
  return e.tagName === "TEXTAREA";
}, dS = function(e, n) {
  if (!(e instanceof Element))
    return !1;
  var o = window.getComputedStyle(e);
  return (
    // not-not-scrollable
    o[n] !== "hidden" && // contains scroll inside self
    !(o.overflowY === o.overflowX && !cE(e) && o[n] === "visible")
  );
}, dE = function(e) {
  return dS(e, "overflowY");
}, fE = function(e) {
  return dS(e, "overflowX");
}, fg = function(e, n) {
  var o = n.ownerDocument, i = n;
  do {
    typeof ShadowRoot < "u" && i instanceof ShadowRoot && (i = i.host);
    var a = fS(e, i);
    if (a) {
      var d = pS(e, i), c = d[1], p = d[2];
      if (c > p)
        return !0;
    }
    i = i.parentNode;
  } while (i && i !== o.body);
  return !1;
}, pE = function(e) {
  var n = e.scrollTop, o = e.scrollHeight, i = e.clientHeight;
  return [
    n,
    o,
    i
  ];
}, mE = function(e) {
  var n = e.scrollLeft, o = e.scrollWidth, i = e.clientWidth;
  return [
    n,
    o,
    i
  ];
}, fS = function(e, n) {
  return e === "v" ? dE(n) : fE(n);
}, pS = function(e, n) {
  return e === "v" ? pE(n) : mE(n);
}, hE = function(e, n) {
  return e === "h" && n === "rtl" ? -1 : 1;
}, yE = function(e, n, o, i, a) {
  var d = hE(e, window.getComputedStyle(n).direction), c = d * i, p = o.target, m = n.contains(p), y = !1, g = c > 0, l = 0, f = 0;
  do {
    if (!p)
      break;
    var S = pS(e, p), x = S[0], k = S[1], A = S[2], T = k - A - d * x;
    (x || T) && fS(e, p) && (l += T, f += x);
    var b = p.parentNode;
    p = b && b.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? b.host : b;
  } while (
    // portaled content
    !m && p !== document.body || // self content
    m && (n.contains(p) || n === p)
  );
  return (g && Math.abs(l) < 1 || !g && Math.abs(f) < 1) && (y = !0), y;
}, ea = function(e) {
  return "changedTouches" in e ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY] : [0, 0];
}, pg = function(e) {
  return [e.deltaX, e.deltaY];
}, mg = function(e) {
  return e && "current" in e ? e.current : e;
}, gE = function(e, n) {
  return e[0] === n[0] && e[1] === n[1];
}, vE = function(e) {
  return `
  .block-interactivity-`.concat(e, ` {pointer-events: none;}
  .allow-interactivity-`).concat(e, ` {pointer-events: all;}
`);
}, SE = 0, eo = [];
function wE(e) {
  var n = C.useRef([]), o = C.useRef([0, 0]), i = C.useRef(), a = C.useState(SE++)[0], d = C.useState(cS)[0], c = C.useRef(e);
  C.useEffect(function() {
    c.current = e;
  }, [e]), C.useEffect(function() {
    if (e.inert) {
      document.body.classList.add("block-interactivity-".concat(a));
      var k = zP([e.lockRef.current], (e.shards || []).map(mg), !0).filter(Boolean);
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
    var T = ea(k), b = o.current, E = "deltaX" in k ? k.deltaX : b[0] - T[0], D = "deltaY" in k ? k.deltaY : b[1] - T[1], O, H = k.target, W = Math.abs(E) > Math.abs(D) ? "h" : "v";
    if ("touches" in k && W === "h" && H.type === "range")
      return !1;
    var G = window.getSelection(), K = G && G.anchorNode, X = K ? K === H || K.contains(H) : !1;
    if (X)
      return !1;
    var se = fg(W, H);
    if (!se)
      return !0;
    if (se ? O = W : (O = W === "v" ? "h" : "v", se = fg(W, H)), !se)
      return !1;
    if (!i.current && "changedTouches" in k && (E || D) && (i.current = O), !O)
      return !0;
    var Z = i.current || O;
    return yE(Z, A, k, Z === "h" ? E : D);
  }, []), m = C.useCallback(function(k) {
    var A = k;
    if (!(!eo.length || eo[eo.length - 1] !== d)) {
      var T = "deltaY" in A ? pg(A) : ea(A), b = n.current.filter(function(O) {
        return O.name === A.type && (O.target === A.target || A.target === O.shadowParent) && gE(O.delta, T);
      })[0];
      if (b && b.should) {
        A.cancelable && A.preventDefault();
        return;
      }
      if (!b) {
        var E = (c.current.shards || []).map(mg).filter(Boolean).filter(function(O) {
          return O.contains(A.target);
        }), D = E.length > 0 ? p(A, E[0]) : !c.current.noIsolation;
        D && A.cancelable && A.preventDefault();
      }
    }
  }, []), y = C.useCallback(function(k, A, T, b) {
    var E = { name: k, delta: A, target: T, should: b, shadowParent: xE(T) };
    n.current.push(E), setTimeout(function() {
      n.current = n.current.filter(function(D) {
        return D !== E;
      });
    }, 1);
  }, []), g = C.useCallback(function(k) {
    o.current = ea(k), i.current = void 0;
  }, []), l = C.useCallback(function(k) {
    y(k.type, pg(k), k.target, p(k, e.lockRef.current));
  }, []), f = C.useCallback(function(k) {
    y(k.type, ea(k), k.target, p(k, e.lockRef.current));
  }, []);
  C.useEffect(function() {
    return eo.push(d), e.setCallbacks({
      onScrollCapture: l,
      onWheelCapture: l,
      onTouchMoveCapture: f
    }), document.addEventListener("wheel", m, qr), document.addEventListener("touchmove", m, qr), document.addEventListener("touchstart", g, qr), function() {
      eo = eo.filter(function(k) {
        return k !== d;
      }), document.removeEventListener("wheel", m, qr), document.removeEventListener("touchmove", m, qr), document.removeEventListener("touchstart", g, qr);
    };
  }, []);
  var S = e.removeScrollBar, x = e.inert;
  return C.createElement(
    C.Fragment,
    null,
    x ? C.createElement(d, { styles: vE(a) }) : null,
    S ? C.createElement(uE, { noRelative: e.noRelative, gapMode: e.gapMode }) : null
  );
}
function xE(e) {
  for (var n = null; e !== null; )
    e instanceof ShadowRoot && (n = e.host, e = e.host), e = e.parentNode;
  return n;
}
const _E = XP(uS, wE);
var mS = C.forwardRef(function(e, n) {
  return C.createElement(Ka, en({}, e, { ref: n, sideCar: _E }));
});
mS.classNames = Ka.classNames;
var TE = function(e) {
  if (typeof document > "u")
    return null;
  var n = Array.isArray(e) ? e[0] : e;
  return n.ownerDocument.body;
}, to = /* @__PURE__ */ new WeakMap(), ta = /* @__PURE__ */ new WeakMap(), na = {}, gc = 0, hS = function(e) {
  return e && (e.host || hS(e.parentNode));
}, kE = function(e, n) {
  return n.map(function(o) {
    if (e.contains(o))
      return o;
    var i = hS(o);
    return i && e.contains(i) ? i : (console.error("aria-hidden", o, "in not contained inside", e, ". Doing nothing"), null);
  }).filter(function(o) {
    return !!o;
  });
}, AE = function(e, n, o, i) {
  var a = kE(n, Array.isArray(e) ? e : [e]);
  na[o] || (na[o] = /* @__PURE__ */ new WeakMap());
  var d = na[o], c = [], p = /* @__PURE__ */ new Set(), m = new Set(a), y = function(l) {
    !l || p.has(l) || (p.add(l), y(l.parentNode));
  };
  a.forEach(y);
  var g = function(l) {
    !l || m.has(l) || Array.prototype.forEach.call(l.children, function(f) {
      if (p.has(f))
        g(f);
      else
        try {
          var S = f.getAttribute(i), x = S !== null && S !== "false", k = (to.get(f) || 0) + 1, A = (d.get(f) || 0) + 1;
          to.set(f, k), d.set(f, A), c.push(f), k === 1 && x && ta.set(f, !0), A === 1 && f.setAttribute(o, "true"), x || f.setAttribute(i, "true");
        } catch (T) {
          console.error("aria-hidden: cannot operate on ", f, T);
        }
    });
  };
  return g(n), p.clear(), gc++, function() {
    c.forEach(function(l) {
      var f = to.get(l) - 1, S = d.get(l) - 1;
      to.set(l, f), d.set(l, S), f || (ta.has(l) || l.removeAttribute(i), ta.delete(l)), S || l.removeAttribute(o);
    }), gc--, gc || (to = /* @__PURE__ */ new WeakMap(), to = /* @__PURE__ */ new WeakMap(), ta = /* @__PURE__ */ new WeakMap(), na = {});
  };
}, CE = function(e, n, o) {
  o === void 0 && (o = "data-aria-hidden");
  var i = Array.from(Array.isArray(e) ? e : [e]), a = TE(e);
  return a ? (i.push.apply(i, Array.from(a.querySelectorAll("[aria-live], script"))), AE(i, a, o, "aria-hidden")) : function() {
    return null;
  };
}, bE = Object.defineProperty, Wt = (e, n) => bE(e, "name", { value: n, configurable: !0 }), sf = "Dialog", [yS] = cP(sf), [PE, xn] = yS(sf), EE = /* @__PURE__ */ Wt((e) => {
  const {
    __scopeDialog: n,
    children: o,
    open: i,
    defaultOpen: a,
    onOpenChange: d,
    modal: c = !0
  } = e, p = C.useRef(null), m = C.useRef(null), [y, g] = $0({
    prop: i,
    defaultProp: a ?? !1,
    onChange: d,
    caller: sf
  }), [l, f] = C.useState(0), [S, x] = C.useState(0);
  return /* @__PURE__ */ w.jsx(
    PE,
    {
      scope: n,
      triggerRef: p,
      contentRef: m,
      contentId: dc(),
      titleId: dc(),
      descriptionId: dc(),
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
}, "Dialog"), gS = "DialogPortal", [ME, vS] = yS(gS, {
  forceMount: void 0
}), RE = /* @__PURE__ */ Wt((e) => {
  const { __scopeDialog: n, forceMount: o, children: i, container: a } = e, d = xn(gS, n);
  return /* @__PURE__ */ w.jsx(ME, { scope: n, forceMount: o, children: C.Children.map(i, (c) => /* @__PURE__ */ w.jsx(of, { present: o || d.open, children: /* @__PURE__ */ w.jsx(LP, { asChild: !0, container: a, children: c }) })) });
}, "DialogPortal"), dd = "DialogOverlay", DE = /* @__PURE__ */ C.forwardRef(
  /* @__PURE__ */ Wt(function(n, o) {
    const i = vS(dd, n.__scopeDialog), { forceMount: a = i.forceMount, ...d } = n, c = xn(dd, n.__scopeDialog);
    return c.modal ? /* @__PURE__ */ w.jsx(of, { present: a || c.open, children: /* @__PURE__ */ w.jsx(jE, { ...d, ref: o }) }) : null;
  }, "DialogOverlay")
), NE = /* @__PURE__ */ G0("DialogOverlay.RemoveScroll"), jE = /* @__PURE__ */ C.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Wt(function(n, o) {
    const { __scopeDialog: i, ...a } = n, d = xn(dd, i), c = Y0(), p = Tt(o, c);
    return (
      // Make sure `Content` is scrollable even when it doesn't live inside `RemoveScroll`
      // ie. when `Overlay` and `Content` are siblings
      /* @__PURE__ */ w.jsx(mS, { as: NE, allowPinchZoom: !0, shards: [d.contentRef], children: /* @__PURE__ */ w.jsx(
        vo.div,
        {
          "data-state": af(d.open),
          ...a,
          ref: p,
          style: { pointerEvents: "auto", ...a.style }
        }
      ) })
    );
  }, "DialogOverlayImpl")
), _i = "DialogContent", IE = /* @__PURE__ */ C.forwardRef(
  /* @__PURE__ */ Wt(function(n, o) {
    const i = vS(_i, n.__scopeDialog), { forceMount: a = i.forceMount, ...d } = n, c = xn(_i, n.__scopeDialog);
    return /* @__PURE__ */ w.jsx(of, { present: a || c.open, children: c.modal ? /* @__PURE__ */ w.jsx(FE, { ...d, ref: o }) : /* @__PURE__ */ w.jsx(OE, { ...d, ref: o }) });
  }, "DialogContent")
), FE = /* @__PURE__ */ C.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Wt(function(n, o) {
    const i = xn(_i, n.__scopeDialog), a = C.useRef(null), d = Tt(o, i.contentRef, a);
    return C.useEffect(() => {
      const c = a.current;
      if (c) return CE(c);
    }, []), /* @__PURE__ */ w.jsx(
      SS,
      {
        ...n,
        ref: d,
        trapFocus: i.open,
        disableOutsidePointerEvents: i.open,
        onCloseAutoFocus: kr(n.onCloseAutoFocus, (c) => {
          var p;
          c.preventDefault(), (p = i.triggerRef.current) == null || p.focus();
        }),
        onPointerDownOutside: kr(n.onPointerDownOutside, (c) => {
          const p = c.detail.originalEvent, m = p.button === 0 && p.ctrlKey === !0;
          (p.button === 2 || m) && c.preventDefault();
        }),
        onFocusOutside: kr(
          n.onFocusOutside,
          (c) => c.preventDefault()
        )
      }
    );
  }, "DialogContentModal")
), OE = /* @__PURE__ */ C.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Wt(function(n, o) {
    const i = xn(_i, n.__scopeDialog), a = C.useRef(!1), d = C.useRef(!1);
    return /* @__PURE__ */ w.jsx(
      SS,
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
), SS = /* @__PURE__ */ C.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Wt(function(n, o) {
    const { __scopeDialog: i, trapFocus: a, onOpenAutoFocus: d, onCloseAutoFocus: c, ...p } = n, m = xn(_i, i);
    return BP(), /* @__PURE__ */ w.jsx(w.Fragment, { children: /* @__PURE__ */ w.jsx(
      IP,
      {
        asChild: !0,
        loop: !0,
        trapped: a,
        onMountAutoFocus: d,
        onUnmountAutoFocus: c,
        children: /* @__PURE__ */ w.jsx(
          DP,
          {
            role: "dialog",
            id: m.contentId,
            "aria-describedby": m.descriptionPresent ? m.descriptionId : void 0,
            "aria-labelledby": m.titlePresent ? m.titleId : void 0,
            "data-state": af(m.open),
            ...p,
            ref: o,
            deferPointerDownOutside: !0,
            onDismiss: () => m.onOpenChange(!1)
          }
        )
      }
    ) });
  }, "DialogContentImpl")
), LE = "DialogTitle", VE = /* @__PURE__ */ C.forwardRef(
  /* @__PURE__ */ Wt(function(n, o) {
    const { __scopeDialog: i, ...a } = n, d = xn(LE, i), { setTitleCount: c } = d;
    return on(() => (c((p) => p + 1), () => c((p) => p - 1)), [c]), /* @__PURE__ */ w.jsx(vo.h2, { id: d.titleId, ...a, ref: o });
  }, "DialogTitle")
), BE = "DialogDescription", zE = /* @__PURE__ */ C.forwardRef(
  // blank line to reduce diff noise
  /* @__PURE__ */ Wt(function(n, o) {
    const { __scopeDialog: i, ...a } = n, d = xn(BE, i), { setDescriptionCount: c } = d;
    return on(() => (c((p) => p + 1), () => c((p) => p - 1)), [c]), /* @__PURE__ */ w.jsx(vo.p, { id: d.descriptionId, ...a, ref: o });
  }, "DialogDescription")
);
function af(e) {
  return e ? "open" : "closed";
}
Wt(af, "getState");
function $E() {
  const e = Y((a) => a.summaryRecord), n = Y((a) => a.closeSummary), o = Y((a) => a.startTimer), i = gn(e == null ? void 0 : e.selectedScene);
  return /* @__PURE__ */ w.jsx(EE, { open: !!e, onOpenChange: (a) => !a && n(), children: /* @__PURE__ */ w.jsx(za, { children: e ? /* @__PURE__ */ w.jsxs(RE, { forceMount: !0, children: [
    /* @__PURE__ */ w.jsx(DE, { asChild: !0, children: /* @__PURE__ */ w.jsx(
      vn.div,
      {
        className: "summary-overlay",
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
      }
    ) }),
    /* @__PURE__ */ w.jsx(IE, { asChild: !0, children: /* @__PURE__ */ w.jsxs(
      vn.article,
      {
        className: "summary-card liquid-glass",
        initial: { opacity: 0, y: 18, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 18, scale: 0.98 },
        children: [
          /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Session complete" }),
          /* @__PURE__ */ w.jsx(VE, { children: "Focus block complete" }),
          /* @__PURE__ */ w.jsx(zE, { className: "sr-only", children: "Summary of the completed focus block." }),
          /* @__PURE__ */ w.jsx("p", { children: "You protected a focused block in your quiet study room." }),
          /* @__PURE__ */ w.jsxs("div", { className: "summary-grid", children: [
            /* @__PURE__ */ w.jsxs("div", { className: "summary-stat liquid-glass-lite", children: [
              /* @__PURE__ */ w.jsx("span", { children: "Focus time" }),
              /* @__PURE__ */ w.jsx("strong", { children: k0(e.totalFocusTime) })
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
function wS(e, [n, o]) {
  return Math.min(o, Math.max(n, e));
}
function ao(e, n, { checkForDefaultPrevented: o = !0 } = {}) {
  return function(a) {
    if (e == null || e(a), o === !1 || !a.defaultPrevented)
      return n == null ? void 0 : n(a);
  };
}
function xS(e, n = []) {
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
  return a.scopeName = e, [i, UE(a, ...n)];
}
function UE(...e) {
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
var HE = Cr[" useInsertionEffect ".trim().toString()] || on;
function WE({
  prop: e,
  defaultProp: n,
  onChange: o = () => {
  },
  caller: i
}) {
  const [a, d, c] = GE({
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
        const f = KE(g) ? g(e) : g;
        f !== e && ((l = c.current) == null || l.call(c, f));
      } else
        d(g);
    },
    [p, e, d, c]
  );
  return [m, y];
}
function GE({
  defaultProp: e,
  onChange: n
}) {
  const [o, i] = C.useState(e), a = C.useRef(o), d = C.useRef(n);
  return HE(() => {
    d.current = n;
  }, [n]), C.useEffect(() => {
    var c;
    a.current !== o && ((c = d.current) == null || c.call(d, o), a.current = o);
  }, [o, a]), [o, i, d];
}
function KE(e) {
  return typeof e == "function";
}
var YE = C.createContext(void 0);
function QE(e) {
  const n = C.useContext(YE);
  return e || n || "ltr";
}
function XE(e) {
  const n = C.useRef({ value: e, previous: e });
  return C.useMemo(() => (n.current.value !== e && (n.current.previous = n.current.value, n.current.value = e), n.current.previous), [e]);
}
function ZE(e) {
  const [n, o] = C.useState(void 0);
  return on(() => {
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
function fd(e) {
  const n = C.forwardRef((o, i) => {
    let { children: a, ...d } = o, c = null, p = !1;
    const m = [];
    hg(a) && typeof ra == "function" && (a = ra(a._payload)), C.Children.forEach(a, (f) => {
      var S;
      if (nM(f)) {
        p = !0;
        const x = f;
        let k = "child" in x.props ? x.props.child : x.props.children;
        hg(k) && typeof ra == "function" && (k = ra(k._payload)), c = qE(x, k), m.push((S = c == null ? void 0 : c.props) == null ? void 0 : S.children);
      } else
        m.push(f);
    }), c ? c = C.cloneElement(c, void 0, m) : (
      // A `Slottable` was found but it didn't resolve to a single element (e.g.
      // it wrapped multiple elements, text, or a render-prop `child` that
      // wasn't an element). Don't fall back to treating the `Slottable` wrapper
      // itself as the slot target — throw a descriptive error below instead.
      !p && C.Children.count(a) === 1 && C.isValidElement(a) && (c = a)
    );
    const y = c ? tM(c) : void 0, g = Tt(i, y);
    if (!c) {
      if (a || a === 0)
        throw new Error(
          p ? sM(e) : iM(e)
        );
      return a;
    }
    const l = eM(d, c.props ?? {});
    return c.type !== C.Fragment && (l.ref = i ? g : y), C.cloneElement(c, l);
  });
  return n.displayName = `${e}.Slot`, n;
}
var JE = Symbol.for("radix.slottable"), qE = (e, n) => {
  if ("child" in e.props) {
    const o = e.props.child;
    return C.isValidElement(o) ? C.cloneElement(o, void 0, e.props.children(o.props.children)) : null;
  }
  return C.isValidElement(n) ? n : null;
};
function eM(e, n) {
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
function tM(e) {
  var i, a;
  let n = (i = Object.getOwnPropertyDescriptor(e.props, "ref")) == null ? void 0 : i.get, o = n && "isReactWarning" in n && n.isReactWarning;
  return o ? e.ref : (n = (a = Object.getOwnPropertyDescriptor(e, "ref")) == null ? void 0 : a.get, o = n && "isReactWarning" in n && n.isReactWarning, o ? e.props.ref : e.props.ref || e.ref);
}
function nM(e) {
  return C.isValidElement(e) && typeof e.type == "function" && "__radixId" in e.type && e.type.__radixId === JE;
}
var rM = Symbol.for("react.lazy");
function hg(e) {
  return e != null && typeof e == "object" && "$$typeof" in e && e.$$typeof === rM && "_payload" in e && oM(e._payload);
}
function oM(e) {
  return typeof e == "object" && e !== null && "then" in e;
}
var iM = (e) => `${e} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`, sM = (e) => `${e} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`, ra = Cr[" use ".trim().toString()], aM = [
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
], Mi = aM.reduce((e, n) => {
  const o = /* @__PURE__ */ fd(`Primitive.${n}`), i = C.forwardRef((a, d) => {
    const { asChild: c, ...p } = a, m = c ? o : n;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ w.jsx(m, { ...p, ref: d });
  });
  return i.displayName = `Primitive.${n}`, { ...e, [n]: i };
}, {});
function lM(e) {
  const n = e + "CollectionProvider", [o, i] = xS(n), [a, d] = o(
    n,
    { collectionRef: { current: null }, itemMap: /* @__PURE__ */ new Map() }
  ), c = (k) => {
    const { scope: A, children: T } = k, b = C.useRef(null), E = C.useRef(/* @__PURE__ */ new Map()).current;
    return /* @__PURE__ */ w.jsx(a, { scope: A, itemMap: E, collectionRef: b, children: T });
  };
  c.displayName = n;
  const p = e + "CollectionSlot", m = /* @__PURE__ */ fd(p), y = C.forwardRef(
    (k, A) => {
      const { scope: T, children: b } = k, E = d(p, T), D = Tt(A, E.collectionRef);
      return /* @__PURE__ */ w.jsx(m, { ref: D, children: b });
    }
  );
  y.displayName = p;
  const g = e + "CollectionItemSlot", l = "data-radix-collection-item", f = /* @__PURE__ */ fd(g), S = C.forwardRef(
    (k, A) => {
      const { scope: T, children: b, ...E } = k, D = C.useRef(null), O = Tt(A, D), H = d(g, T);
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
var _S = ["PageUp", "PageDown"], TS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"], kS = {
  "from-left": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-right": ["Home", "PageDown", "ArrowDown", "ArrowRight"],
  "from-bottom": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-top": ["Home", "PageDown", "ArrowUp", "ArrowLeft"]
}, So = "Slider", [pd, uM, cM] = lM(So), [lf] = xS(So, [
  cM
]), [dM, Ri] = lf(So), uf = C.forwardRef(
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
    } = e, A = C.useRef(/* @__PURE__ */ new Set()), T = C.useRef(0), b = C.useRef(!1), D = c === "horizontal" ? fM : pM, [O = [], H] = WE({
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
      const de = gM(O, Z);
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
      const Se = xM(d), re = _M(Math.round((Z - i) / d) * d + i, Se), we = wS(re, [i, a]);
      H((z = []) => {
        const J = hM(z, we, de);
        if (wM(J, m * d)) {
          T.current = J.indexOf(we);
          const Q = String(J) !== String(z);
          return Q && ce && f(J), Q ? J : z;
        } else
          return z;
      });
    }
    return /* @__PURE__ */ w.jsx(
      dM,
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
        children: /* @__PURE__ */ w.jsx(pd.Provider, { scope: e.__scopeSlider, children: /* @__PURE__ */ w.jsx(pd.Slot, { scope: e.__scopeSlider, children: /* @__PURE__ */ w.jsx(
          D,
          {
            "aria-disabled": p,
            "data-disabled": p ? "" : void 0,
            ...k,
            ref: n,
            onPointerDown: ao(k.onPointerDown, () => {
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
                const re = _S.includes(Z.key) || Z.shiftKey && TS.includes(Z.key) ? 10 : 1, we = T.current, z = O[we], J = d * re * de;
                se(z + J, we, { commit: !0 });
              }
            }
          }
        ) }) })
      }
    );
  }
);
uf.displayName = So;
var [AS, CS] = lf(So, {
  startEdge: "left",
  endEdge: "right",
  size: "width",
  direction: 1
}), fM = C.forwardRef(
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
    } = e, [l, f] = C.useState(null), S = Tt(n, (E) => f(E)), x = C.useRef(void 0), k = QE(a), A = k === "ltr", T = A && !d || !A && d;
    function b(E) {
      const D = x.current || l.getBoundingClientRect(), O = [0, D.width], W = pf(O, T ? [o, i] : [i, o]);
      return x.current = D, W(E - D.left);
    }
    return /* @__PURE__ */ w.jsx(
      AS,
      {
        scope: e.__scopeSlider,
        startEdge: T ? "left" : "right",
        endEdge: T ? "right" : "left",
        direction: T ? 1 : -1,
        size: "width",
        children: /* @__PURE__ */ w.jsx(
          bS,
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
              const O = kS[T ? "from-left" : "from-right"].includes(E.key);
              y == null || y({ event: E, direction: O ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), pM = C.forwardRef(
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
    } = e, g = C.useRef(null), l = Tt(n, g), f = C.useRef(void 0), S = !a;
    function x(k) {
      const A = f.current || g.current.getBoundingClientRect(), T = [0, A.height], E = pf(T, S ? [i, o] : [o, i]);
      return f.current = A, E(k - A.top);
    }
    return /* @__PURE__ */ w.jsx(
      AS,
      {
        scope: e.__scopeSlider,
        startEdge: S ? "bottom" : "top",
        endEdge: S ? "top" : "bottom",
        size: "height",
        direction: S ? 1 : -1,
        children: /* @__PURE__ */ w.jsx(
          bS,
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
              const T = kS[S ? "from-bottom" : "from-top"].includes(k.key);
              m == null || m({ event: k, direction: T ? -1 : 1 });
            }
          }
        )
      }
    );
  }
), bS = C.forwardRef(
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
    } = e, g = Ri(So, o);
    return /* @__PURE__ */ w.jsx(
      Mi.span,
      {
        ...y,
        ref: n,
        onKeyDown: ao(e.onKeyDown, (l) => {
          l.key === "Home" ? (c(l), l.preventDefault()) : l.key === "End" ? (p(l), l.preventDefault()) : _S.concat(TS).includes(l.key) && (m(l), l.preventDefault());
        }),
        onPointerDown: ao(e.onPointerDown, (l) => {
          const f = l.target;
          f.setPointerCapture(l.pointerId), l.preventDefault(), g.thumbs.has(f) ? f.focus({ preventScroll: !0, focusVisible: !1 }) : i(l);
        }),
        onPointerMove: ao(e.onPointerMove, (l) => {
          l.target.hasPointerCapture(l.pointerId) && a(l);
        }),
        onPointerUp: ao(e.onPointerUp, (l) => {
          const f = l.target;
          f.hasPointerCapture(l.pointerId) && (f.releasePointerCapture(l.pointerId), d(l));
        })
      }
    );
  }
), PS = "SliderTrack", cf = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Ri(PS, o);
    return /* @__PURE__ */ w.jsx(
      Mi.span,
      {
        "data-disabled": a.disabled ? "" : void 0,
        "data-orientation": a.orientation,
        ...i,
        ref: n
      }
    );
  }
);
cf.displayName = PS;
var md = "SliderRange", df = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Ri(md, o), d = CS(md, o), c = C.useRef(null), p = Tt(n, c), m = a.values.length, y = a.values.map(
      (f) => FS(f, a.min, a.max)
    ), g = m > 1 ? Math.min(...y) : 0, l = 100 - Math.max(...y);
    return /* @__PURE__ */ w.jsx(
      Mi.span,
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
df.displayName = md;
var ES = "SliderThumb", [mM, MS] = lf(ES), RS = "SliderThumbProvider";
function DS(e) {
  const {
    __scopeSlider: n,
    name: o,
    children: i,
    // @ts-expect-error internal render prop
    internal_do_not_use_render: a
  } = e, d = Ri(RS, n), c = uM(n), [p, m] = C.useState(null), y = C.useMemo(
    () => p ? c().findIndex((A) => A.ref.current === p) : -1,
    [c, p]
  ), g = ZE(p), l = p ? !!d.form || !!p.closest("form") : !0, f = d.values[y], S = o ?? (d.name ? d.name + (d.values.length > 1 ? "[]" : "") : void 0), x = f === void 0 ? 0 : FS(f, d.min, d.max);
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
  return /* @__PURE__ */ w.jsx(mM, { scope: n, ...k, children: TM(a) ? a(k) : i });
}
DS.displayName = RS;
var ga = "SliderThumbTrigger", NS = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, ...i } = e, a = Ri(ga, o), d = CS(ga, o), { index: c, value: p, percent: m, size: y, onThumbChange: g } = MS(
      ga,
      o
    ), l = Tt(n, (k) => g(k)), f = yM(c, a.values.length), S = y == null ? void 0 : y[d.size], x = S ? vM(S, m, d.direction) : 0;
    return /* @__PURE__ */ w.jsx(
      "span",
      {
        style: {
          transform: "var(--radix-slider-thumb-transform)",
          position: "absolute",
          [d.startEdge]: `calc(${m}% + ${x}px)`
        },
        children: /* @__PURE__ */ w.jsx(pd.ItemSlot, { scope: o, children: /* @__PURE__ */ w.jsx(
          Mi.span,
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
            onFocus: ao(e.onFocus, () => {
              a.valueIndexToChangeRef.current = c;
            })
          }
        ) })
      }
    );
  }
);
NS.displayName = ga;
var ff = C.forwardRef(
  (e, n) => {
    const { __scopeSlider: o, name: i, ...a } = e;
    return /* @__PURE__ */ w.jsx(
      DS,
      {
        __scopeSlider: o,
        name: i,
        internal_do_not_use_render: ({ index: d, isFormControl: c }) => /* @__PURE__ */ w.jsxs(w.Fragment, { children: [
          /* @__PURE__ */ w.jsx(
            NS,
            {
              ...a,
              ref: n,
              __scopeSlider: o
            }
          ),
          c ? /* @__PURE__ */ w.jsx(
            IS,
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
ff.displayName = ES;
var jS = "SliderBubbleInput", IS = C.forwardRef(
  ({ __scopeSlider: e, ...n }, o) => {
    const { value: i, name: a, form: d } = MS(jS, e), c = C.useRef(null), p = Tt(c, o), m = XE(i);
    return C.useEffect(() => {
      const y = c.current;
      if (!y) return;
      const g = window.HTMLInputElement.prototype, f = Object.getOwnPropertyDescriptor(g, "value").set;
      if (m !== i && f) {
        const S = new Event("input", { bubbles: !0 });
        f.call(y, i), y.dispatchEvent(S);
      }
    }, [m, i]), /* @__PURE__ */ w.jsx(
      Mi.input,
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
IS.displayName = jS;
function hM(e = [], n, o) {
  const i = [...e];
  return i[o] = n, i.sort((a, d) => a - d);
}
function FS(e, n, o) {
  const d = 100 / (o - n) * (e - n);
  return wS(d, [0, 100]);
}
function yM(e, n) {
  return n > 2 ? `Value ${e + 1} of ${n}` : n === 2 ? ["Minimum", "Maximum"][e] : void 0;
}
function gM(e, n) {
  if (e.length === 1) return 0;
  const o = e.map((a) => Math.abs(a - n)), i = Math.min(...o);
  return o.indexOf(i);
}
function vM(e, n, o) {
  const i = e / 2, d = pf([0, 50], [0, i]);
  return (i - d(n) * o) * o;
}
function SM(e) {
  return e.slice(0, -1).map((n, o) => e[o + 1] - n);
}
function wM(e, n) {
  if (n > 0) {
    const o = SM(e);
    return Math.min(...o) >= n;
  }
  return !0;
}
function pf(e, n) {
  return (o) => {
    if (e[0] === e[1] || n[0] === n[1]) return n[0];
    const i = (n[1] - n[0]) / (e[1] - e[0]);
    return n[0] + i * (o - e[0]);
  };
}
function xM(e) {
  if (!Number.isFinite(e)) return 0;
  const n = e.toString();
  if (n.includes("e")) {
    const [i, a] = n.split("e"), d = i.split(".")[1] || "", c = Number(a);
    return Math.max(0, d.length - c);
  }
  const o = n.split(".")[1];
  return o ? o.length : 0;
}
function _M(e, n) {
  const o = Math.pow(10, n);
  return Math.round(e * o) / o;
}
function TM(e) {
  return typeof e == "function";
}
function yg({ label: e, icon: n, value: o, onChange: i }) {
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
      uf,
      {
        className: "radix-slider-root",
        value: [o],
        min: 0,
        max: 100,
        step: 1,
        onValueChange: (a) => i(a[0]),
        children: [
          /* @__PURE__ */ w.jsx(cf, { className: "radix-slider-track", children: /* @__PURE__ */ w.jsx(df, { className: "radix-slider-range" }) }),
          /* @__PURE__ */ w.jsx(ff, { className: "radix-slider-thumb", "aria-label": e })
        ]
      }
    )
  ] });
}
function kM({ audioState: e }) {
  const n = Y((g) => g.musicType), o = Y((g) => g.ambientSound), i = Y((g) => g.musicVolume), a = Y((g) => g.ambientVolume), d = Y((g) => g.audioPlaying), c = Y((g) => g.setSound), p = Y((g) => g.toggleAudio), m = Ua({ musicType: n, ambientSound: o }), y = m.ambientLayers.map((g) => g.title).filter(Boolean).join(" + ");
  return /* @__PURE__ */ w.jsxs("div", { className: "sound-panel", children: [
    /* @__PURE__ */ w.jsxs("label", { className: "focus-field", children: [
      "Music selector",
      /* @__PURE__ */ w.jsx("select", { value: n, onChange: (g) => c("musicType", g.target.value), children: Kn.map((g) => /* @__PURE__ */ w.jsx("option", { value: g.label, children: g.label }, g.label)) })
    ] }),
    /* @__PURE__ */ w.jsx(
      yg,
      {
        label: "Music volume",
        icon: /* @__PURE__ */ w.jsx(Ga, { size: 16, "aria-hidden": "true" }),
        value: i,
        onChange: (g) => c("musicVolume", g)
      }
    ),
    /* @__PURE__ */ w.jsxs("label", { className: "focus-field", children: [
      "Ambient sound selector",
      /* @__PURE__ */ w.jsx("select", { value: o, onChange: (g) => c("ambientSound", g.target.value), children: Yn.map((g) => /* @__PURE__ */ w.jsx("option", { value: g.label, children: g.label }, g.label)) })
    ] }),
    /* @__PURE__ */ w.jsx(
      yg,
      {
        label: "Ambient volume",
        icon: /* @__PURE__ */ w.jsx(Zd, { size: 16, "aria-hidden": "true" }),
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
const AM = [
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
], CM = [
  ["white-noise", "White noise"],
  ["pink-noise", "Pink noise"],
  ["brown-noise", "Brown noise"]
], bM = [
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
      uf,
      {
        className: "radix-slider-root",
        value: [c],
        min: 0,
        max: 100,
        step: 1,
        onValueChange: (m) => a(e, m[0]),
        children: [
          /* @__PURE__ */ w.jsx(cf, { className: "radix-slider-track", children: /* @__PURE__ */ w.jsx(df, { className: "radix-slider-range" }) }),
          /* @__PURE__ */ w.jsx(ff, { className: "radix-slider-thumb", "aria-label": `${n} volume` })
        ]
      }
    )
  ] });
}
function PM({ audioState: e, scene: n, onClose: o }) {
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
      transition: Ea,
      role: "dialog",
      "aria-label": "Room settings",
      children: [
        /* @__PURE__ */ w.jsxs("header", { className: "room-control-head", children: [
          /* @__PURE__ */ w.jsxs("div", { children: [
            /* @__PURE__ */ w.jsx("span", { className: "control-eyebrow", children: "Control" }),
            /* @__PURE__ */ w.jsx("h2", { children: "Room settings" })
          ] }),
          /* @__PURE__ */ w.jsx(Pe, { className: "room-control-close", "aria-label": "Close room settings", onClick: o, children: /* @__PURE__ */ w.jsx(j0, { size: 16, "aria-hidden": "true" }) })
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
        /* @__PURE__ */ w.jsx("section", { className: "room-control-topics", "aria-label": "Focus topics", children: /* @__PURE__ */ w.jsx(O0, {}) }),
        /* @__PURE__ */ w.jsxs("div", { className: "room-control-grid", children: [
          /* @__PURE__ */ w.jsxs("section", { className: "room-control-col room-control-scenes", "aria-label": "Scenes", children: [
            /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Scenes" }),
            /* @__PURE__ */ w.jsx(qd, {})
          ] }),
          /* @__PURE__ */ w.jsxs("section", { className: "room-control-col room-control-audio", children: [
            /* @__PURE__ */ w.jsxs("div", { className: "room-control-masters", children: [
              /* @__PURE__ */ w.jsxs("div", { className: "room-control-block", children: [
                /* @__PURE__ */ w.jsxs("div", { className: "room-control-block-head", children: [
                  /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Music" }),
                  /* @__PURE__ */ w.jsx(Pe, { className: "room-control-icon-btn", "aria-label": "Shuffle to a random track", onClick: k, children: /* @__PURE__ */ w.jsx(Ab, { size: 15, "aria-hidden": "true" }) })
                ] }),
                /* @__PURE__ */ w.jsxs("label", { className: "room-select-field", children: [
                  /* @__PURE__ */ w.jsx("span", { className: "sr-only", children: "Music track" }),
                  /* @__PURE__ */ w.jsx("select", { value: c, onChange: (T) => {
                    l(!1), a("musicType", T.target.value);
                  }, children: Kn.map((T) => /* @__PURE__ */ w.jsx("option", { value: T.label, children: T.label }, T.label)) })
                ] }),
                /* @__PURE__ */ w.jsx(oa, { id: "music-volume", label: "Music volume", icon: /* @__PURE__ */ w.jsx(Ga, { size: 15, "aria-hidden": "true" }), value: m, onChange: S })
              ] }),
              /* @__PURE__ */ w.jsxs("div", { className: "room-control-block", children: [
                /* @__PURE__ */ w.jsxs("div", { className: "room-control-block-head", children: [
                  /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Scene sound" }),
                  /* @__PURE__ */ w.jsx(Pe, { className: "room-control-icon-btn", "aria-label": g ? "Mix saved" : "Save current mix", onClick: () => l(!0), children: g ? /* @__PURE__ */ w.jsx(Wa, { size: 15, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(D0, { size: 15, "aria-hidden": "true" }) })
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
                /* @__PURE__ */ w.jsx(oa, { id: "ambient-volume", label: "Ambient volume", icon: /* @__PURE__ */ w.jsx(Zd, { size: 15, "aria-hidden": "true" }), value: y, onChange: x })
              ] })
            ] }),
            /* @__PURE__ */ w.jsxs("div", { className: "room-control-block", children: [
              /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Focus noise" }),
              /* @__PURE__ */ w.jsx("div", { className: "room-noise-row", children: CM.map(([T, b]) => /* @__PURE__ */ w.jsx(oa, { id: T, label: b, value: i == null ? void 0 : i[T], onChange: f, card: !0 }, T)) })
            ] }),
            /* @__PURE__ */ w.jsxs("div", { className: "room-control-block", children: [
              /* @__PURE__ */ w.jsx("h3", { className: "room-control-section-title", children: "Ambient atmosphere" }),
              /* @__PURE__ */ w.jsx("div", { className: "room-ambient-grid", children: bM.map(([T, b]) => /* @__PURE__ */ w.jsx(oa, { id: T, label: b, value: i == null ? void 0 : i[T], onChange: f, card: !0 }, T)) })
            ] }),
            e != null && e.error ? /* @__PURE__ */ w.jsx("p", { className: "audio-error", children: e.error }) : null
          ] })
        ] })
      ]
    }
  );
}
function ia({ title: e, kicker: n, icon: o, children: i, onClose: a, className: d = "" }) {
  return /* @__PURE__ */ w.jsxs(vn.aside, { className: `focus-utility-panel liquid-glass ${d}`.trim(), initial: { opacity: 0, y: 12, x: -18 }, animate: { opacity: 1, y: 0, x: 0 }, exit: { opacity: 0, y: 10, x: -18 }, transition: Ea, role: "dialog", "aria-label": e, children: [
    /* @__PURE__ */ w.jsxs("div", { className: "drawer-head", children: [
      /* @__PURE__ */ w.jsxs("div", { className: "utility-title", children: [
        /* @__PURE__ */ w.jsx("span", { className: "utility-title-icon", children: o }),
        /* @__PURE__ */ w.jsxs("div", { children: [
          /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: n }),
          /* @__PURE__ */ w.jsx("h2", { children: e })
        ] })
      ] }),
      /* @__PURE__ */ w.jsx(Pe, { "aria-label": `Close ${e}`, onClick: a, children: /* @__PURE__ */ w.jsx(j0, { size: 16, "aria-hidden": "true" }) })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "utility-panel-body", children: i })
  ] });
}
function EM({ audioState: e, scene: n }) {
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
        /* @__PURE__ */ w.jsx(tb, { size: 14, "aria-hidden": "true" }),
        " Random track"
      ] })
    ] }),
    /* @__PURE__ */ w.jsx(kM, { audioState: e, compact: !0 }),
    /* @__PURE__ */ w.jsxs("div", { className: "mixer-preset-row", children: [
      /* @__PURE__ */ w.jsxs("button", { type: "button", className: "mixer-preset-button", onClick: m, children: [
        "Apply scene mix ",
        /* @__PURE__ */ w.jsx("span", { children: "↗" })
      ] }),
      /* @__PURE__ */ w.jsxs(Pe, { onClick: () => d(!0), children: [
        a ? /* @__PURE__ */ w.jsx(Wa, { size: 14, "aria-hidden": "true" }) : /* @__PURE__ */ w.jsx(D0, { size: 14, "aria-hidden": "true" }),
        " ",
        a ? "Saved" : "Save current mix"
      ] })
    ] }),
    /* @__PURE__ */ w.jsx("div", { className: "mixer-channel-grid", children: AM.map(([y, g]) => /* @__PURE__ */ w.jsxs("label", { className: "mixer-channel", children: [
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
function MM() {
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
function RM({ onWorkspace: e, session: n }) {
  return !!n ? /* @__PURE__ */ w.jsxs("div", { className: "utility-empty-state", children: [
    /* @__PURE__ */ w.jsx(Na, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Your Focus Trail" }),
    /* @__PURE__ */ w.jsx("p", { children: "Recent sessions and progress remain available through Synapse history." }),
    /* @__PURE__ */ w.jsx(Pe, { variant: "primary", onClick: () => e == null ? void 0 : e("", "history"), children: "Open session history" })
  ] }) : /* @__PURE__ */ w.jsxs("div", { className: "utility-login-state", children: [
    /* @__PURE__ */ w.jsx(Na, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Your rhythm, remembered" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Sign in to view your Focus Trail" }),
    /* @__PURE__ */ w.jsx("p", { children: "Track deep-work time, completed goals, and your study streak across devices." }),
    /* @__PURE__ */ w.jsx(Pe, { variant: "primary", onClick: () => e == null ? void 0 : e(), children: "Sign in with Synapse" }),
    /* @__PURE__ */ w.jsx("small", { children: "Your current session continues without an account." })
  ] });
}
function DM({ onWorkspace: e, session: n }) {
  return !!n ? /* @__PURE__ */ w.jsxs("div", { className: "utility-empty-state", children: [
    /* @__PURE__ */ w.jsx(ja, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Companion Room" }),
    /* @__PURE__ */ w.jsx("p", { children: "Invite a study partner from your Synapse workspace to share this quiet room." }),
    /* @__PURE__ */ w.jsx(Pe, { variant: "primary", onClick: () => e == null ? void 0 : e("", "companion"), children: "Open Companion Room" })
  ] }) : /* @__PURE__ */ w.jsxs("div", { className: "utility-login-state", children: [
    /* @__PURE__ */ w.jsx(ja, { size: 28, "aria-hidden": "true" }),
    /* @__PURE__ */ w.jsx("span", { className: "focus-kicker", children: "Study alongside someone" }),
    /* @__PURE__ */ w.jsx("h3", { children: "Sign in to use Companion Room" }),
    /* @__PURE__ */ w.jsx("p", { children: "Keep your own goal private while sharing the feeling of showing up together." }),
    /* @__PURE__ */ w.jsx(Pe, { variant: "primary", onClick: () => e == null ? void 0 : e(), children: "Go to sign in" }),
    /* @__PURE__ */ w.jsx("small", { children: "No companion data is created in Focus Room." })
  ] });
}
function NM({ audioState: e, utilityPanel: n, onClose: o, onWorkspace: i }) {
  const a = Y((y) => y.activeDrawer), d = Y((y) => y.closeDrawer), c = Y((y) => y.selectedScene), p = MM(), m = C.useMemo(() => Sn.find((y) => y.id === c) || Sn[0], [c]);
  return /* @__PURE__ */ w.jsxs(za, { children: [
    n === "trail" ? /* @__PURE__ */ w.jsx(ia, { title: "Focus Trail", kicker: "Your progress", icon: /* @__PURE__ */ w.jsx(Na, { size: 16 }), onClose: o, children: /* @__PURE__ */ w.jsx(RM, { onWorkspace: i, session: p }) }) : null,
    n === "companion" ? /* @__PURE__ */ w.jsx(ia, { title: "Companion Room", kicker: "Shared focus", icon: /* @__PURE__ */ w.jsx(ja, { size: 16 }), onClose: o, children: /* @__PURE__ */ w.jsx(DM, { onWorkspace: i, session: p }) }) : null,
    n === "settings" ? /* @__PURE__ */ w.jsx(PM, { audioState: e, scene: m, onClose: o }) : null,
    !n && a === "scene" ? /* @__PURE__ */ w.jsx(ia, { title: "Choose scene", kicker: "Scene", icon: /* @__PURE__ */ w.jsx(N0, { size: 16 }), onClose: d, children: /* @__PURE__ */ w.jsx(qd, {}) }) : null,
    !n && a === "music" ? /* @__PURE__ */ w.jsx(ia, { title: "Sound atmosphere", kicker: "Room audio", icon: /* @__PURE__ */ w.jsx(Ga, { size: 16 }), onClose: d, children: /* @__PURE__ */ w.jsx(EM, { audioState: e, scene: m }) }) : null
  ] });
}
function jM(e, n) {
  return n ? Math.min(100, Math.max(0, e / n * 100)) : 0;
}
function IM({ onExit: e }) {
  const n = Y((y) => y.elapsedSeconds), o = Y((y) => y.pomodoroDuration), i = Y((y) => y.pomodoroDurationSeconds), a = Y((y) => y.timerMode), d = Y((y) => y.timerStatus), c = Y((y) => y.currentSession), p = Number(i) || (Number(o) || 0) * 60, m = a === "countup" ? n : Math.max(0, p - n);
  return /* @__PURE__ */ w.jsxs("div", { className: "compact-focus-mode-card", "aria-label": "Distraction-free focus timer", children: [
    /* @__PURE__ */ w.jsxs("div", { className: "compact-focus-card-top", children: [
      /* @__PURE__ */ w.jsxs("span", { children: [
        "POMODORO #",
        (c == null ? void 0 : c.pomodoroNumber) || 1
      ] }),
      /* @__PURE__ */ w.jsx(Pe, { className: "compact-exit-button", onClick: e, "aria-label": "Exit Focus Mode", children: /* @__PURE__ */ w.jsx(lb, { size: 14, "aria-hidden": "true" }) })
    ] }),
    /* @__PURE__ */ w.jsxs("span", { className: "compact-focus-status", children: [
      /* @__PURE__ */ w.jsx("i", {}),
      d === "paused" ? "Paused" : "In focus"
    ] }),
    /* @__PURE__ */ w.jsx("strong", { children: Jc(m) }),
    /* @__PURE__ */ w.jsx("div", { className: "compact-focus-progress", children: /* @__PURE__ */ w.jsx("span", { style: { width: `${jM(n, p)}%` } }) }),
    /* @__PURE__ */ w.jsxs("small", { children: [
      tf(p),
      " session"
    ] }),
    /* @__PURE__ */ w.jsx("span", { className: "sr-only", children: "Press Escape to exit Focus Mode." })
  ] });
}
var vc = {};
/*!
 *  howler.js v2.2.4
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */
var gg;
function FM() {
  return gg || (gg = 1, (function(e) {
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
      e.Howler = o, e.Howl = i, typeof ii < "u" ? (ii.HowlerGlobal = n, ii.Howler = o, ii.Howl = i, ii.Sound = a) : typeof window < "u" && (window.HowlerGlobal = n, window.Howler = o, window.Howl = i, window.Sound = a);
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
  })(vc)), vc;
}
var OM = FM();
const LM = /* @__PURE__ */ Ag(OM), { Howl: OS } = LM, hd = 500, Rt = {
  music: null,
  ambient: /* @__PURE__ */ new Map()
};
let hr = {}, hi = !1, yd = "";
function Ti() {
  return typeof OS == "function";
}
function Sc(e, n = 50) {
  const o = Number(e), i = Number.isFinite(o) ? o : n;
  return Math.min(1, Math.max(0, i / 100));
}
function LS(e) {
  return new OS({
    src: [e],
    loop: !0,
    html5: !0,
    preload: !0,
    volume: 0
  });
}
function VS(e, n, o = hd) {
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
function Ya(e, { unload: n = !1 } = {}) {
  var o;
  e && (VS(e, 0, Math.min(hd, 300)), (o = globalThis.setTimeout) == null || o.call(globalThis, () => {
    try {
      e.pause(), n && e.unload();
    } catch {
    }
  }, Math.min(hd, 320)));
}
function VM(e) {
  return !(e != null && e.streamUrl) || !Ti() ? null : ((!Rt.music || Rt.music.__synapseSrc !== e.streamUrl) && (Ya(Rt.music, { unload: !0 }), Rt.music = LS(e.streamUrl), Rt.music.__synapseSrc = e.streamUrl), Rt.music);
}
function BM(e) {
  if (!(e != null && e.streamUrl) || !Ti()) return null;
  const n = e.id || e.streamUrl, o = Rt.ambient.get(n);
  if (o && o.__synapseSrc === e.streamUrl) return o;
  Ya(o, { unload: !0 });
  const i = LS(e.streamUrl);
  return i.__synapseSrc = e.streamUrl, Rt.ambient.set(n, i), i;
}
function zM() {
  return [
    Rt.music,
    ...Rt.ambient.values()
  ].filter(Boolean);
}
function BS() {
  zM().forEach((e) => Ya(e));
}
function $M(e) {
  for (const [n, o] of Rt.ambient.entries())
    e.has(n) || (Ya(o, { unload: !0 }), Rt.ambient.delete(n));
}
function vg(e, n) {
  if (e)
    try {
      e.playing() || e.play(), VS(e, n), yd = "";
    } catch (o) {
      yd = (o == null ? void 0 : o.message) || "Audio playback is blocked until the browser receives a user action.";
    }
}
async function UM(e = {}) {
  hr = { ...hr, ...e };
  const n = Ua(hr);
  if (!Ti()) return va(n);
  if (!hi)
    return BS(), va(n);
  const o = VM(n.musicTrack), i = Sc(hr.musicVolume, 60), a = Sc(hr.ambientVolume, 50), d = /* @__PURE__ */ new Set(), c = [];
  return n.ambientLayers.forEach((p) => {
    var f;
    const m = p.id || p.streamUrl;
    d.add(m);
    const y = BM(p), g = Number((f = hr.audioChannels) == null ? void 0 : f[p.id]), l = Number.isFinite(g) ? Sc(g, 0) : Math.min(1, Math.max(0, a * (p.volumeBias ?? 1)));
    c.push([y, l]);
  }), $M(d), vg(o, i), c.forEach(([p, m]) => vg(p, m)), va(n);
}
function HM(e) {
  return hi = !!e, hi || BS(), hi;
}
function va(e = Ua(hr)) {
  var n, o, i, a;
  return {
    available: Ti(),
    playing: hi && Ti(),
    musicTitle: ((n = e.musicTrack) == null ? void 0 : n.title) || "",
    musicArtist: ((o = e.musicTrack) == null ? void 0 : o.artist) || "",
    musicPageUrl: ((i = e.musicTrack) == null ? void 0 : i.pageUrl) || "",
    musicAttribution: ((a = e.musicTrack) == null ? void 0 : a.attribution) || "",
    ambientTitles: e.ambientLayers.map((d) => d.title).filter(Boolean),
    ambientPageUrls: e.ambientLayers.map((d) => d.pageUrl).filter(Boolean),
    ambientAttributions: e.ambientLayers.map((d) => d.attribution).filter(Boolean),
    error: yd
  };
}
const WM = "synapse.focusRoom.audioPrefs.v1";
function GM(e) {
  var n;
  try {
    (n = globalThis.localStorage) == null || n.setItem(WM, JSON.stringify({
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
function KM() {
  const e = Y((m) => m.musicType), n = Y((m) => m.ambientSound), o = Y((m) => m.musicVolume), i = Y((m) => m.ambientVolume), a = Y((m) => m.audioChannels), d = Y((m) => m.audioPlaying), [c, p] = C.useState(() => va(Ua({
    musicType: e,
    ambientSound: n
  })));
  return C.useEffect(() => {
    const m = { musicType: e, ambientSound: n, musicVolume: o, ambientVolume: i, audioChannels: a };
    let y = !1;
    return HM(d), GM(m), UM(m).then((g) => {
      y || p(g);
    }), () => {
      y = !0;
    };
  }, [n, i, a, d, e, o]), c;
}
function YM() {
  const e = Y(), n = C.useCallback(async (i = "", a = "", d = {}) => {
    var g;
    e.pauseTimer({ pauseAudio: !0 }), e.closeSummary();
    const c = typeof i == "string" || typeof i == "number" ? i : "", p = typeof a == "string" ? a : "", m = QM(p, d), y = String(c || e.selectedMaterialId || ((g = e.selectedMaterial) == null ? void 0 : g.materialId) || "");
    if (typeof globalThis.returnFromFocusRoomToWorkspace == "function")
      try {
        const l = globalThis.returnFromFocusRoomToWorkspace(y, m);
        l && typeof l.then == "function" && await l, Sg(m.action || p, m);
        return;
      } catch (l) {
        console.error("Could not return from Focus Room:", l);
      }
    globalThis.location.hash = "", Sg(m.action || p, m);
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
function zS(e) {
  const n = String(e || "").trim().toLowerCase();
  return ["flashcards", "quiz", "assistant", "mindmap", "timeline", "source", "notes"].includes(n) ? n : "";
}
function QM(e, n = {}) {
  const o = n && typeof n == "object" && !Array.isArray(n) ? n : {}, i = zS(e || o.action);
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
function Sg(e, n = {}) {
  const o = zS(e);
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
function XM(e = 3e3) {
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
function ZM() {
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
function JM() {
  const e = Y((n) => n.selectedScene);
  return gn(e);
}
function qM(e) {
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
function eR() {
  const [e, n] = C.useState(""), [o, i] = C.useState(!1), [a, d] = C.useState(!1), c = Y((T) => T.view), p = XM(3e3), m = JM(), y = KM(), g = YM();
  ZM();
  const l = Y(a1(qM)), f = Y((T) => T.summaryRecord), S = Y((T) => T.endSession), x = Y((T) => T.initializeFocusRoom);
  C.useEffect(() => {
    x();
  }, [x]), C.useEffect(() => {
    l != null && l.materialId && Yd(l.materialId, l);
  }, [l]), C.useEffect(() => {
    c === "session" || !f || ma("focus-room");
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
        /* @__PURE__ */ w.jsx(OC, { scene: m }),
        /* @__PURE__ */ w.jsxs(za, { mode: "wait", children: [
          c === "setup" ? /* @__PURE__ */ w.jsx(
            vn.div,
            {
              className: "focus-room-view focus-setup-view",
              initial: { opacity: 0, y: 16 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -10 },
              transition: Ea,
              children: /* @__PURE__ */ w.jsx(Zb, { audioState: y, onWorkspace: k })
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
              transition: Ea,
              children: [
                o ? /* @__PURE__ */ w.jsx("button", { type: "button", className: "focus-mode-exit-hit-area", onClick: () => i(!1), children: "Exit Focus Mode" }) : /* @__PURE__ */ w.jsx(Jb, { onWorkspace: k, onOpenTrail: () => n("trail"), onOpenCompanion: () => n("companion"), onOpenSettings: () => n("settings"), onExit: () => d(!0) }),
                /* @__PURE__ */ w.jsx("section", { className: `focus-session-stage ${o ? "is-focus-mode" : ""}`.trim(), "aria-hidden": "true" }),
                o ? /* @__PURE__ */ w.jsx(IM, { onExit: () => i(!1) }) : /* @__PURE__ */ w.jsx(sP, { audioState: y, onFocusMode: () => i(!0) }),
                o ? null : /* @__PURE__ */ w.jsx(NM, { audioState: y, utilityPanel: e, onClose: () => n(""), onWorkspace: k }),
                /* @__PURE__ */ w.jsx($E, {}),
                /* @__PURE__ */ w.jsx(tR, { open: a, onClose: () => d(!1), onConfirm: A })
              ]
            },
            "session"
          ) : null
        ] })
      ]
    }
  );
}
function tR({ open: e, onClose: n, onConfirm: o }) {
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
let wc = null;
function nR(e, n) {
  const o = globalThis.__synapseFocusRoomApi || {};
  if (typeof o[e] != "function") {
    console.warn(`Synapse Focus Room action "${e}" is not available yet.`);
    return;
  }
  return o[e](...n);
}
function rR() {
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
    globalThis[n] = (...i) => nR(o, i);
  });
}
function oR(e = {}) {
  rR();
  const n = e.root || document.getElementById("focusRoomRoot");
  if (!n)
    throw new Error("Focus Room root element was not found.");
  wc || (wc = n1.createRoot(n), wc.render(
    yn.createElement(
      yn.StrictMode,
      null,
      yn.createElement(eR)
    )
  ));
}
const iR = "synapse.generated.history.v6", $S = "synapse.active.generated.v6", sR = "synapse.flashcards.deck.v1", aR = "synapse.quiz.history.v1", lR = "synapse.focusRoom.return-target.v1";
function mf(e, n) {
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
function uR(e, n) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, n), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function cR(e, n) {
  var o;
  try {
    return (o = globalThis.localStorage) == null || o.setItem(e, JSON.stringify(n)), !0;
  } catch (i) {
    return console.warn(`Could not write ${e}:`, i), !1;
  }
}
function US() {
  const e = mf(iR, []);
  return Array.isArray(e) ? e : [];
}
function dR(e) {
  const n = String((e == null ? void 0 : e.title) || "").trim();
  return n || String((e == null ? void 0 : e.summary) || "").split(/\n+/).map((i) => i.replace(/^#+\s*/, "").trim()).find((i) => i.length > 4) || "Generated Study Notes";
}
function HS(e = {}) {
  return [
    e.id ? `history:${e.id}` : "",
    e.sourceFingerprint ? `fingerprint:${e.sourceFingerprint}` : "",
    e.clientFingerprint ? `fingerprint:${e.clientFingerprint}` : ""
  ].filter(Boolean);
}
function fR(e = {}) {
  const n = mf(sR, {}), i = HS(e).map((a) => n == null ? void 0 : n[a]).find((a) => a && Array.isArray(a.cards) && a.cards.length);
  return (i == null ? void 0 : i.cards) || [];
}
function pR(e = {}) {
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
function mR(e = []) {
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
function hR(e = {}) {
  const n = mf(aR, {}), i = HS(e).flatMap((d) => Array.isArray(n == null ? void 0 : n[d]) ? n[d] : []), a = /* @__PURE__ */ new Set();
  return mR(i).filter((d) => {
    const c = pR(d);
    return !c || a.has(c) ? !1 : (a.add(c), !0);
  }).sort((d, c) => new Date(c.createdAt || 0) - new Date(d.createdAt || 0));
}
function yR(e = {}) {
  return {
    materialId: String(e.id || e.sourceFingerprint || e.clientFingerprint || "current-material"),
    materialTitle: dR(e),
    materialType: "Generated notes",
    uploadedContent: "",
    aiSummary: e.summary || "",
    sections: e.sections || {},
    flashcards: fR(e),
    quizzes: hR(e),
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
function WS() {
  return US().filter((e) => e && (e.id || e.summary) && e.kind !== "companion" && !String(e.id || "").startsWith("companion:")).map(yR);
}
function GS(e = "") {
  const n = String(e || "");
  return n && WS().find(
    (o) => o.materialId === n || o.sourceFingerprint === n || o.clientFingerprint === n
  ) || null;
}
function KS() {
  var n;
  const e = ((n = globalThis.localStorage) == null ? void 0 : n.getItem($S)) || "";
  return GS(e);
}
function gR(e = "") {
  var i;
  const n = e || ((i = KS()) == null ? void 0 : i.materialId) || "", o = n ? `/${encodeURIComponent(n)}` : "";
  globalThis.location.hash = `#/focus-room${o}`;
}
function vR(e = "", n = {}) {
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
async function SR(e = "", n = {}) {
  const o = String(e || ""), i = US().find(
    (c) => String((c == null ? void 0 : c.id) || "") === o || String((c == null ? void 0 : c.sourceFingerprint) || (c == null ? void 0 : c.source_fingerprint) || "") === o || String((c == null ? void 0 : c.clientFingerprint) || (c == null ? void 0 : c.client_fingerprint) || "") === o
  ) || null, a = String((i == null ? void 0 : i.id) || "");
  a && uR($S, a);
  const d = vR(a, n);
  d.action && cR(lR, d), globalThis.location.href = a ? `index.html?focusReturn=${encodeURIComponent(a)}` : "index.html";
}
function wR() {
  Object.assign(globalThis, {
    getSynapseFocusRoomCurrentMaterial: KS,
    getSynapseFocusRoomMaterial: GS,
    getSynapseFocusRoomMaterials: WS,
    openSynapseFocusRoom: gR,
    returnFromFocusRoomToWorkspace: SR
  });
}
const YS = document.getElementById("focusRoomRoot");
if (!YS)
  throw new Error("Focus Room root element was not found.");
var _g;
(_g = document.getElementById("focusRoomFallbackTitle")) == null || _g.remove();
globalThis.apiClient = new kg(Yx);
wR();
(!globalThis.location.hash || globalThis.location.hash === "#") && (globalThis.location.hash = "#/focus-room");
oR({ root: YS });
